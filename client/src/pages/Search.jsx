import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  BookmarkPlus,
  Check,
  Download,
  Info,
  ListPlus,
  Search as SearchIcon,
} from 'lucide-react'
import { api } from '../lib/api.js'
import { useToast } from '../context/ToastContext.jsx'
import AddToPlaylistModal from '../components/AddToPlaylistModal.jsx'
import { Spinner } from '../components/common.jsx'
import { formatDuration } from '../lib/format.js'
import { extractPlaylistId } from '../lib/youtube.js'

/**
 * Discover: search YouTube for learning material and import playlists,
 * through the official Data API (server-side, behind YOUTUBE_API_KEY).
 *
 * When no API key is configured the page says so plainly and points at
 * the docs — pasting links everywhere else in the app keeps working.
 * Results are deliberately finite: this is a tool for finding something
 * to learn, not a feed to scroll.
 */
export default function Search() {
  const toast = useToast()
  const [searchParams] = useSearchParams()

  // ---- search -------------------------------------------------------------
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const notConfigured = searchError?.configured === false

  // ---- saving results -------------------------------------------------------
  const [savedItems, setSavedItems] = useState({}) // videoId -> library item
  const [savingId, setSavingId] = useState(null)
  const [playlistTarget, setPlaylistTarget] = useState(null)

  // ---- playlist import ------------------------------------------------------
  const [importUrl, setImportUrl] = useState(searchParams.get('import') || '')
  const [preview, setPreview] = useState(null)
  // The URL the current preview was loaded from — importing always uses
  // this, never whatever is currently typed, so the list you saw is the
  // list you get.
  const [previewedUrl, setPreviewedUrl] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [importError, setImportError] = useState('')
  const importNotConfigured = importError?.configured === false
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(null) // { playlist, imported, alreadySaved }

  // Deep link (?import=…) auto-loads the preview.
  useEffect(() => {
    const initial = searchParams.get('import')
    if (initial) {
      loadPreview(initial)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function runSearch(event) {
    event.preventDefault()
    const q = query.trim()
    if (q.length < 2) {
      setSearchError({ message: 'Enter at least two characters.' })
      return
    }
    setSearching(true)
    setSearchError('')
    setResults(null)
    try {
      const data = await api(`/videos/search?q=${encodeURIComponent(q)}`)
      setResults(data.results)
      setSavedItems({})
    } catch (err) {
      setSearchError(err.status === 501 ? { ...err, configured: false } : err)
    } finally {
      setSearching(false)
    }
  }

  async function saveResult(video) {
    setSavingId(video.videoId)
    try {
      const data = await api('/library', {
        method: 'POST',
        body: {
          videoId: video.videoId,
          ...(video.durationSec > 0 ? { durationSec: video.durationSec } : {}),
        },
      })
      setSavedItems((current) => ({ ...current, [video.videoId]: data.item }))
      toast.success(data.alreadySaved ? 'Already in your library.' : 'Saved to your library.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingId(null)
    }
  }

  async function loadPreview(url) {
    const value = (url ?? importUrl).trim()
    if (!extractPlaylistId(value)) {
      setImportError({ message: 'That does not look like a YouTube playlist link (it needs a ?list=… part).' })
      return
    }
    setPreviewLoading(true)
    setImportError('')
    setPreview(null)
    setImported(null)
    try {
      const data = await api(`/videos/playlist?url=${encodeURIComponent(value)}`)
      setPreview(data.playlist)
      setPreviewedUrl(value)
    } catch (err) {
      setImportError(err.status === 501 ? { ...err, configured: false } : err)
    } finally {
      setPreviewLoading(false)
    }
  }

  async function importPlaylist() {
    if (!preview) return
    setImporting(true)
    setImportError('')
    try {
      const data = await api('/playlists/import', {
        method: 'POST',
        body: { url: previewedUrl },
      })
      setImported(data)
      setPreview(null)
      toast.success(
        `Playlist imported — ${data.imported} new ${data.imported === 1 ? 'video' : 'videos'} saved.`,
      )
    } catch (err) {
      setImportError(err)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-xl font-semibold tracking-tight text-stone-900">Discover</h1>
      <p className="mt-1 text-sm text-stone-500">
        Find something to learn on YouTube and bring it straight into your library.
      </p>

      {/* ---- Search ---- */}
      <section aria-labelledby="yt-search" className="mt-6">
        <h2 id="yt-search" className="sr-only">
          Search YouTube
        </h2>
        <form onSubmit={runSearch}>
          <label htmlFor="yt-search-input" className="sr-only">
            Search YouTube
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                id="yt-search-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                maxLength={100}
                autoComplete="off"
                placeholder="Search YouTube — e.g. “linear algebra lecture”"
                className="w-full rounded-xl border border-stone-300 bg-white py-3 pl-10 pr-4 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {searching ? <Spinner className="h-4 w-4" /> : <SearchIcon className="h-4 w-4" />}
              Search
            </button>
          </div>
        </form>

        {notConfigured && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="leading-relaxed">
              Search isn’t configured on this server. Add a <code className="rounded bg-amber-100 px-1">YOUTUBE_API_KEY</code> to{' '}
              <code className="rounded bg-amber-100 px-1">server/.env</code> to enable it — see{' '}
              <a
                href="https://developers.google.com/youtube/v3/getting-started"
                target="_blank"
                rel="noreferrer"
                className="font-medium underline"
              >
                Google’s setup guide
              </a>{' '}
              or <Link to="/app/watch" className="font-medium underline">paste a video link</Link> instead.
            </p>
          </div>
        )}

        {searchError && !notConfigured && searchError.message && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {searchError.message}
          </p>
        )}

        {searching && (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="aspect-video animate-pulse rounded-lg bg-stone-200" />
            <div className="aspect-video animate-pulse rounded-lg bg-stone-200" />
            <div className="aspect-video animate-pulse rounded-lg bg-stone-200" />
          </div>
        )}

        {results && results.length === 0 && !searching && (
          <p className="mt-6 rounded-xl border border-stone-200 bg-white px-4 py-8 text-center text-sm text-stone-500">
            No videos matched that search. Try different words.
          </p>
        )}

        {results && results.length > 0 && (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((video) => (
              <SearchResultCard
                key={video.videoId}
                video={video}
                savedItem={savedItems[video.videoId]}
                saving={savingId === video.videoId}
                onSave={() => saveResult(video)}
                onAddToPlaylist={() => setPlaylistTarget(savedItems[video.videoId])}
              />
            ))}
          </div>
        )}
      </section>

      {/* ---- Playlist import ---- */}
      <section aria-labelledby="yt-import" className="mt-12 border-t border-stone-200 pt-8">
        <h2 id="yt-import" className="text-base font-semibold text-stone-900">
          Import a YouTube playlist
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          Paste a playlist link — every video gets saved to your library and
          grouped into one of your playlists.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            loadPreview()
          }}
          className="mt-4"
        >
          <label htmlFor="yt-import-input" className="sr-only">
            YouTube playlist link
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="yt-import-input"
              type="text"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://www.youtube.com/playlist?list=…"
              className="w-full flex-1 rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={previewLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
            >
              {previewLoading ? <Spinner className="h-4 w-4" /> : <SearchIcon className="h-4 w-4" />}
              Preview
            </button>
          </div>
        </form>

        {importNotConfigured && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="leading-relaxed">
              Playlist import needs the same <code className="rounded bg-amber-100 px-1">YOUTUBE_API_KEY</code>{' '}
              configuration as search.
            </p>
          </div>
        )}

        {importError && !importNotConfigured && importError.message && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {importError.message}
          </p>
        )}

        {preview && (
          <div className="mt-5 rounded-xl border border-stone-200 bg-white">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-100 px-5 py-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-stone-900">{preview.title}</p>
                <p className="mt-0.5 text-xs text-stone-500">
                  {preview.channelName}
                  {preview.channelName && ' · '}
                  {preview.videos.length} {preview.videos.length === 1 ? 'video' : 'videos'}
                  {preview.truncated && ' (first 50)'}
                </p>
              </div>
              <button
                onClick={importPlaylist}
                disabled={importing}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {importing ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                Import playlist
              </button>
            </div>
            <ul className="scrollable max-h-80 divide-y divide-stone-100 overflow-y-auto">
              {preview.videos.map((video) => (
                <li key={video.videoId} className="flex items-center gap-3 px-5 py-2.5">
                  <div className="h-10 w-16 shrink-0 overflow-hidden rounded-md bg-stone-200">
                    <img src={video.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </div>
                  <p className="min-w-0 flex-1 truncate text-sm text-stone-700">
                    {video.title || 'Untitled video'}
                  </p>
                  <span className="shrink-0 text-xs tabular-nums text-stone-400">
                    {video.durationSec > 0 ? formatDuration(video.durationSec) : '—'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {imported && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
            <p className="text-sm text-emerald-800">
              <strong className="font-semibold">{imported.playlist.title}</strong> is ready —{' '}
              {imported.imported} new {imported.imported === 1 ? 'video' : 'videos'}
              {imported.alreadySaved > 0 && `, ${imported.alreadySaved} already in your library`}
              {imported.truncated && ' · only the first 50 videos were imported'}.
            </p>
            <Link
              to={`/app/playlists/${imported.playlist.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Open playlist
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </section>

      {playlistTarget && (
        <AddToPlaylistModal item={playlistTarget} onClose={() => setPlaylistTarget(null)} />
      )}
    </div>
  )
}

function SearchResultCard({ video, savedItem, saving, onSave, onAddToPlaylist }) {
  return (
    <article className="group">
      <Link to={`/app/watch/${video.videoId}`} aria-label={`Watch ${video.title || 'video'}`}>
        <div className="relative aspect-video overflow-hidden rounded-lg bg-stone-200">
          <img
            src={video.thumbnailUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
          {video.durationSec > 0 && (
            <span className="absolute bottom-1.5 right-1.5 rounded bg-stone-900/80 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
              {formatDuration(video.durationSec)}
            </span>
          )}
        </div>
      </Link>
      <div className="mt-2.5">
        <Link to={`/app/watch/${video.videoId}`}>
          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-5 text-stone-900 group-hover:text-emerald-800">
            {video.title || 'Untitled video'}
          </h3>
        </Link>
        <p className="mt-0.5 truncate text-xs text-stone-500">{video.channelName || 'Unknown channel'}</p>
        <div className="mt-2">
          {savedItem ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700">
                <Check className="h-3.5 w-3.5" />
                In your library
              </span>
              <button
                onClick={onAddToPlaylist}
                className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50"
              >
                <ListPlus className="h-3.5 w-3.5" />
                Playlist
              </button>
            </div>
          ) : (
            <button
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
            >
              {saving ? <Spinner className="h-3.5 w-3.5" /> : <BookmarkPlus className="h-3.5 w-3.5" />}
              Save to library
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
