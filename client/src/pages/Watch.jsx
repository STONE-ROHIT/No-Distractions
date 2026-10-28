import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, BookmarkCheck, BookmarkPlus, Check, ListPlus, Maximize2, Minimize, RotateCcw, Trash2 } from 'lucide-react'
import { api } from '../lib/api.js'
import { useToast } from '../context/ToastContext.jsx'
import YouTubePlayer from '../components/YouTubePlayer.jsx'
import WatchSidebar from '../components/WatchSidebar.jsx'
import UrlInputForm from '../components/UrlInputForm.jsx'
import AddToPlaylistModal from '../components/AddToPlaylistModal.jsx'
import { ErrorState, Spinner } from '../components/common.jsx'
import { formatDuration } from '../lib/format.js'

/**
 * The video learning page: official YouTube player, metadata, save/remove,
 * progress + resume, notes, and the current playlist in a sidebar.
 */
export default function Watch() {
  const { videoId } = useParams()
  const [searchParams] = useSearchParams()
  const playlistId = searchParams.get('list')
  const toast = useToast()

  // Video metadata from the server (oEmbed).
  const [metadata, setMetadata] = useState(null)
  const [metaError, setMetaError] = useState('')
  const [metaLoading, setMetaLoading] = useState(true)

  // The user's library entry for this video (null = not saved).
  const [libraryItem, setLibraryItem] = useState(null)
  const libraryItemRef = useRef(null)
  useEffect(() => {
    libraryItemRef.current = libraryItem
  }, [libraryItem])

  // Playlist context.
  const [playlist, setPlaylist] = useState(null)

  // Notes.
  const [notes, setNotes] = useState([])

  // Bookmarks.
  const [bookmarks, setBookmarks] = useState([])
  const [bookmarkBusy, setBookmarkBusy] = useState(false)

  // Player-related state.
  const playerRef = useRef(null)
  const playerWrapRef = useRef(null)
  const lastSavedPosition = useRef(0)
  const [resumedAt, setResumedAt] = useState(null)
  const [playerError, setPlayerError] = useState('')
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)
  const [savePending, setSavePending] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  // Focus mode: hides the app chrome and the side panel, gives the video
  // the whole width, and enables keyboard shortcuts.
  const [focusMode, setFocusMode] = useState(false)

  // ---------------------------------------------------------------- data ----

  useEffect(() => {
    if (!videoId) return undefined
    let cancelled = false
    setMetaLoading(true)
    setMetaError('')
    setMetadata(null)
    setResumedAt(null)
    setPlayerError('')

    api(`/videos/metadata?url=${encodeURIComponent(videoId)}`)
      .then((data) => {
        if (!cancelled) setMetadata(data)
      })
      .catch((err) => {
        if (!cancelled) setMetaError(err.message)
      })
      .finally(() => {
        if (!cancelled) setMetaLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [videoId])

  // Fetch just this video's library entry (also tells us whether we can
  // resume) instead of downloading the whole library.
  useEffect(() => {
    if (!videoId) {
      setLibraryItem(null)
      return undefined
    }
    let cancelled = false
    api(`/library?videoId=${encodeURIComponent(videoId)}`)
      .then((data) => {
        if (cancelled) return
        setLibraryItem(data.item)
        lastSavedPosition.current = data.item ? data.item.lastPositionSec : 0
      })
      .catch(() => {
        // Library lookup failing is not fatal for watching.
      })
    return () => {
      cancelled = true
    }
  }, [videoId])

  useEffect(() => {
    if (!videoId) {
      setNotes([])
      return undefined
    }
    let cancelled = false
    setNotes([])
    api(`/notes?videoId=${encodeURIComponent(videoId)}`)
      .then((data) => {
        if (!cancelled) setNotes(data.notes)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [videoId])

  useEffect(() => {
    if (!playlistId) {
      setPlaylist(null)
      return undefined
    }
    let cancelled = false
    api(`/playlists/${playlistId}`)
      .then((data) => {
        if (!cancelled) setPlaylist(data.playlist)
      })
      .catch(() => {
        if (!cancelled) setPlaylist(null)
      })
    return () => {
      cancelled = true
    }
  }, [playlistId])

  useEffect(() => {
    if (!videoId) {
      setBookmarks([])
      return undefined
    }
    let cancelled = false
    setBookmarks([])
    api(`/bookmarks?videoId=${encodeURIComponent(videoId)}`)
      .then((data) => {
        if (!cancelled) setBookmarks(data.bookmarks)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [videoId])

  // ------------------------------------------------------------ bookmarks --

  /** Shared by the bookmarks tab and (later) the focus-mode shortcut. */
  async function addBookmark(positionSec, label = '') {
    setBookmarkBusy(true)
    try {
      const data = await api('/bookmarks', {
        method: 'POST',
        body: { videoId, positionSec, ...(label ? { label } : {}) },
      })
      if (!data.alreadySaved) {
        setBookmarks((current) =>
          [...current, data.bookmark].sort((a, b) => a.positionSec - b.positionSec),
        )
        toast.success('Bookmark added.')
      } else {
        toast.success('You already have a bookmark at that moment.')
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBookmarkBusy(false)
    }
  }

  async function updateBookmarkLabel(bookmark, label) {
    try {
      const data = await api(`/bookmarks/${bookmark.id}`, {
        method: 'PATCH',
        body: { label },
      })
      setBookmarks((current) => current.map((b) => (b.id === bookmark.id ? data.bookmark : b)))
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function deleteBookmark(bookmark) {
    try {
      await api(`/bookmarks/${bookmark.id}`, { method: 'DELETE' })
      setBookmarks((current) => current.filter((b) => b.id !== bookmark.id))
    } catch (err) {
      toast.error(err.message)
    }
  }

  // ------------------------------------------------------------ progress ----

  /**
   * Persist playback progress. Called by the player roughly every 10
   * seconds while playing, and on pause/end/interrupt/unmount. Best-effort:
   * a failed call is retried by the next tick.
   *
   * Every write carries `savedAt` (this device's clock). The server ignores
   * writes that are not newer than the last accepted one, which makes
   * retries and offline replays safe — see docs/progress-sync.md.
   */
  const handleProgress = useCallback((positionSec, durationSec, info = {}) => {
    const item = libraryItemRef.current
    if (!item) return

    if (info.resumed) {
      setResumedAt(positionSec)
      return
    }

    const force = Boolean(info.ended || info.paused || info.unmount || info.interrupted)
    if (!force && positionSec - lastSavedPosition.current < 5) return

    lastSavedPosition.current = positionSec
    api(`/library/${item.id}/progress`, {
      method: 'PATCH',
      body: {
        positionSec,
        ...(durationSec > 0 ? { durationSec } : {}),
        ...(info.ended ? { completed: true } : {}),
        savedAt: Date.now(),
      },
    })
      .then((data) => setLibraryItem(data.item))
      .catch(() => {})
  }, [])

  const handleEnded = useCallback(() => {
    const item = libraryItemRef.current
    if (!item) return
    api(`/library/${item.id}/progress`, {
      method: 'PATCH',
      body: { completed: true, savedAt: Date.now() },
    })
      .then((data) => setLibraryItem(data.item))
      .catch(() => {})
  }, [])

  function startOver() {
    try {
      playerRef.current?.seekTo(0, true)
      setResumedAt(null)
      const item = libraryItemRef.current
      if (item) {
        api(`/library/${item.id}/progress`, {
          method: 'PATCH',
          body: { positionSec: 0, completed: false, savedAt: Date.now() },
        })
          .then((data) => setLibraryItem(data.item))
          .catch(() => {})
      }
    } catch {
      // Player not ready yet.
    }
  }

  // ------------------------------------------------------------ save/remove --

  async function saveToLibrary() {
    setSavePending(true)
    try {
      const data = await api('/library', {
        method: 'POST',
        body: { videoId },
      })
      setLibraryItem(data.item)
      lastSavedPosition.current = 0
      toast.success(
        data.alreadySaved ? 'Already in your library.' : 'Saved to your library.',
      )
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavePending(false)
    }
  }

  async function removeFromLibrary() {
    if (!libraryItem) return
    setConfirmRemove(false)
    try {
      await api(`/library/${libraryItem.id}`, { method: 'DELETE' })
      setLibraryItem(null)
      setResumedAt(null)
      lastSavedPosition.current = 0
      toast.success('Removed from your library.')
      // The server also pulled it out of playlists; refresh if needed.
      if (playlistId) {
        const data = await api(`/playlists/${playlistId}`)
        setPlaylist(data.playlist)
      }
    } catch (err) {
      toast.error(err.message)
    }
  }

  // -------------------------------------------------- player helpers ---

  const getPlayerTime = () => {
    try {
      return playerRef.current?.getCurrentTime?.() ?? null
    } catch {
      return null
    }
  }

  const seekTo = (sec) => {
    try {
      playerRef.current?.seekTo?.(sec, true)
    } catch {
      // Player not ready.
    }
  }

  const seekBy = (delta) => {
    const current = getPlayerTime()
    if (current == null) return
    seekTo(Math.max(0, current + delta))
  }

  const togglePlay = () => {
    try {
      const player = playerRef.current
      if (!player) return
      if (player.getPlayerState() === 1) player.pauseVideo()
      else player.playVideo()
    } catch {
      // Player not ready.
    }
  }

  const toggleFullscreen = () => {
    const el = playerWrapRef.current
    if (!el) return
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    } else {
      el.requestFullscreen?.().catch(() => {})
    }
  }

  // ---------------------------------------------------------------- focus ---

  // Hide the navbar / mobile tab bar while focus mode is on (plain CSS —
  // see index.css). Always cleaned up on unmount.
  useEffect(() => {
    document.body.classList.toggle('nd-focus', focusMode)
    return () => document.body.classList.remove('nd-focus')
  }, [focusMode])

  /**
   * Keyboard shortcuts, active while a video is open:
   *   Space / K  play or pause        ← / →  seek 5 s
   *   B          bookmark this moment F      fullscreen
   *   Esc        leave focus mode
   * They never fire while typing in a field (inputs, textareas, selects,
   * contenteditable) so notes stay editable.
   */
  useEffect(() => {
    if (!videoId) return undefined

    function onKeyDown(event) {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target
      if (
        target instanceof HTMLElement &&
        target.closest('input, textarea, select, [contenteditable="true"]')
      ) {
        return
      }

      switch (event.key) {
        case ' ':
        case 'k':
        case 'K':
          event.preventDefault()
          togglePlay()
          break
        case 'ArrowLeft':
          event.preventDefault()
          seekBy(-5)
          break
        case 'ArrowRight':
          event.preventDefault()
          seekBy(5)
          break
        case 'b':
        case 'B': {
          const t = getPlayerTime()
          if (t != null && t > 0) addBookmark(Math.round(t))
          break
        }
        case 'f':
        case 'F':
          event.preventDefault()
          toggleFullscreen()
          break
        case 'Escape':
          setFocusMode(false)
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId])

  // ------------------------------------------------------------ rendering ---

  // No video yet: the URL entry state.
  if (!videoId) {
    return (
      <div className="mx-auto max-w-2xl py-12 sm:py-20">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
            What are you learning today?
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            Paste a YouTube link and watch it here — just the video, your notes,
            and your progress.
          </p>
        </div>
        <div className="mt-8">
          <UrlInputForm autoFocus />
        </div>
        {playlist && (
          <div className="mt-10 text-center">
            <p className="text-sm text-stone-500">
              Or continue with your playlist <strong>{playlist.title}</strong>:
            </p>
          </div>
        )}
      </div>
    )
  }

  // Metadata loading.
  if (metaLoading) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="aspect-video w-full animate-pulse rounded-xl bg-stone-200" />
        <div className="mt-4 flex justify-center">
          <Spinner />
        </div>
      </div>
    )
  }

  // Unknown/unavailable video.
  if (metaError) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <ErrorState message={metaError} />
        <div className="mt-6 text-center">
          <Link
            to="/app/watch"
            className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Try another link
          </Link>
        </div>
      </div>
    )
  }

  const title = metadata?.title || libraryItem?.title || 'Loading…'
  const channel = metadata?.channelName || libraryItem?.channelName || ''
  const startAt = libraryItem && !libraryItem.completed ? libraryItem.lastPositionSec : 0

  return (
    <div className={focusMode ? '' : 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]'}>
      {/* Video column */}
      <div className="min-w-0">
        <div ref={playerWrapRef} className="relative">
          <YouTubePlayer
            videoId={videoId}
            startAt={startAt}
            resume
            playerRef={playerRef}
            onProgress={handleProgress}
            onEnded={handleEnded}
            onError={setPlayerError}
          />
          {focusMode && (
            <button
              onClick={() => setFocusMode(false)}
              className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-stone-900/70 px-3 py-2 text-xs font-medium text-white backdrop-blur transition-colors hover:bg-stone-900/90"
            >
              <Minimize className="h-3.5 w-3.5" />
              Exit focus
              <kbd className="ml-1 rounded bg-white/20 px-1 py-0.5 text-[10px]">Esc</kbd>
            </button>
          )}
        </div>

        {focusMode && (
          <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-400" aria-hidden="true">
            <ShortcutHint keys="Space">play / pause</ShortcutHint>
            <ShortcutHint keys="← →">seek 5 s</ShortcutHint>
            <ShortcutHint keys="B">bookmark</ShortcutHint>
            <ShortcutHint keys="F">fullscreen</ShortcutHint>
          </p>
        )}

        {playerError && (
          <div
            role="alert"
            className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          >
            {playerError}
          </div>
        )}

        {resumedAt != null && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
            <span>
              Resumed from <strong>{formatDuration(resumedAt)}</strong>
              {libraryItem?.durationSec > 0 && ` of ${formatDuration(libraryItem.durationSec)}`}
            </span>
            <button
              onClick={startOver}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Start over
            </button>
          </div>
        )}

        {/* Title + metadata + actions */}
        <div className="mt-4">
          <h1 className="text-lg font-semibold leading-snug tracking-tight text-stone-900 sm:text-xl">
            {title}
          </h1>
          {channel && <p className="mt-1 text-sm text-stone-500">{channel}</p>}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFocusMode((on) => !on)}
              aria-pressed={focusMode}
              title="Focus mode: hides navigation and side panels (Esc to leave)"
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                focusMode
                  ? 'border-stone-900 bg-stone-900 text-white hover:bg-stone-700'
                  : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
              }`}
            >
              <Maximize2 className="h-4 w-4" />
              <span className="hidden sm:inline">Focus mode</span>
            </button>
            {libraryItem ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                  <Check className="h-4 w-4" />
                  In your library
                </span>
                <button
                  onClick={() => setShowPlaylistModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                >
                  <ListPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add to playlist</span>
                </button>
                {confirmRemove ? (
                  <button
                    onClick={removeFromLibrary}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    Confirm remove
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmRemove(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Remove</span>
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={saveToLibrary}
                disabled={savePending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {savePending ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <BookmarkPlus className="h-4 w-4" />
                )}
                Save to library
              </button>
            )}
          </div>

          {!libraryItem && (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-stone-100 px-4 py-3 text-xs leading-relaxed text-stone-500">
              <BookmarkCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Save this video to track your progress and keep it in your library.
              You can still take notes and bookmarks either way.
            </p>
          )}
        </div>
      </div>

      {/* Notes / bookmarks / playlist side panel (hidden in focus mode) */}
      {!focusMode && (
        <aside className="min-w-0" aria-label="Learning tools">
          <WatchSidebar
            defaultTab={playlistId ? 'playlist' : 'notes'}
            playlist={playlist}
            currentVideoId={videoId}
            notes={notes}
            setNotes={setNotes}
            bookmarks={bookmarks}
            onAddBookmark={addBookmark}
            onUpdateBookmark={updateBookmarkLabel}
            onDeleteBookmark={deleteBookmark}
            bookmarkBusy={bookmarkBusy}
            getPlayerTime={getPlayerTime}
            onSeekTo={seekTo}
          />
        </aside>
      )}

      {showPlaylistModal && libraryItem && (
        <AddToPlaylistModal
          item={libraryItem}
          onClose={() => setShowPlaylistModal(false)}
          onAdded={(updated) => setPlaylist(updated)}
        />
      )}
    </div>
  )
}

function ShortcutHint({ keys, children }) {
  return (
    <span className="inline-flex items-center gap-1">
      <kbd className="rounded border border-stone-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-stone-500">
        {keys}
      </kbd>
      {children}
    </span>
  )
}
