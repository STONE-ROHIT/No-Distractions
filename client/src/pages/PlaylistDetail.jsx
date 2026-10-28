import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowDown, ArrowUp, ListVideo, PlayCircle, Pencil, Trash2, X } from 'lucide-react'
import { api } from '../lib/api.js'
import { useToast } from '../context/ToastContext.jsx'
import { EmptyState, ErrorState, Modal, SkeletonCard, Spinner, StatusBadge } from '../components/common.jsx'
import { formatDuration } from '../lib/format.js'

/** One playlist: its videos, progress, rename and delete. */
export default function PlaylistDetail() {
  const { playlistId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [playlist, setPlaylist] = useState(null)
  const [error, setError] = useState('')
  const [showRename, setShowRename] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [removingEntryId, setRemovingEntryId] = useState(null)

  function load() {
    setError('')
    api(`/playlists/${playlistId}`)
      .then((data) => setPlaylist(data.playlist))
      .catch((err) => setError(err.message))
  }

  useEffect(load, [playlistId])

  async function removeEntry(entry) {
    setRemovingEntryId(entry.id)
    try {
      const data = await api(`/playlists/${playlistId}/items/${entry.id}`, {
        method: 'DELETE',
      })
      setPlaylist(data.playlist)
      toast.success('Removed from playlist.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setRemovingEntryId(null)
    }
  }

  /** Move an entry up/down by swapping it with its neighbour. */
  async function moveEntry(entry, direction) {
    const ids = playlist.items.map((i) => i.id)
    const from = ids.indexOf(entry.id)
    const to = from + direction
    if (to < 0 || to >= ids.length) return
    ;[ids[from], ids[to]] = [ids[to], ids[from]]
    try {
      const data = await api(`/playlists/${playlistId}/items/order`, {
        method: 'PATCH',
        body: { order: ids },
      })
      setPlaylist(data.playlist)
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function deletePlaylist() {
    try {
      await api(`/playlists/${playlistId}`, { method: 'DELETE' })
      toast.success('Playlist deleted.')
      navigate('/app/playlists')
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (error) {
    return (
      <div>
        <BackLink />
        <ErrorState message={error} onRetry={load} />
      </div>
    )
  }

  if (!playlist) {
    return (
      <div>
        <BackLink />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    )
  }

  const percent =
    playlist.itemCount > 0
      ? Math.round((playlist.completedCount / playlist.itemCount) * 100)
      : 0

  return (
    <div>
      <BackLink />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-stone-900">
            {playlist.title}
          </h1>
          {playlist.description && (
            <p className="mt-1 max-w-xl text-sm text-stone-500">{playlist.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-stone-200">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
            </div>
            <span className="text-xs font-medium text-stone-500">
              {playlist.completedCount}/{playlist.itemCount} completed
            </span>
            {playlist.next && (
              <Link
                to={`/app/watch/${playlist.next.videoId}?list=${playlist.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-emerald-700"
              >
                <PlayCircle className="h-3.5 w-3.5" />
                {playlist.completedCount > 0 ? 'Continue' : 'Start'} ·{" "}
                <span className="max-w-[14rem] truncate font-normal">
                  {playlist.next.title || 'Untitled video'}
                </span>
              </Link>
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => setShowRename(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            <Pencil className="h-4 w-4" />
            Rename
          </button>
          {confirmDelete ? (
            <button
              onClick={deletePlaylist}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4" />
              Delete for good?
            </button>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
        </div>
      </div>

      {playlist.items.length === 0 ? (
        <EmptyState
          icon={ListVideo}
          title="This playlist is empty"
          hint="Add saved videos from your library — open a video and use “Add to playlist”, or the add button on any library card."
          action={
            <Link
              to="/app/library"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Browse your library
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
          {playlist.items.map((entry, index) => (
            <li key={entry.id} className="group flex items-center gap-2 p-4 sm:gap-4">
              {/* Reorder controls (hidden on the smallest screens) */}
              <div className="hidden shrink-0 flex-col gap-0.5 sm:flex">
                <button
                  onClick={() => moveEntry(entry, -1)}
                  disabled={index === 0}
                  aria-label="Move up"
                  title="Move up"
                  className="rounded-md p-1 text-stone-300 hover:bg-stone-100 hover:text-stone-600 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => moveEntry(entry, 1)}
                  disabled={index === playlist.items.length - 1}
                  aria-label="Move down"
                  title="Move down"
                  className="rounded-md p-1 text-stone-300 hover:bg-stone-100 hover:text-stone-600 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <span className="hidden w-5 shrink-0 text-center text-xs font-medium text-stone-300 sm:block">
                {index + 1}
              </span>

              <Link
                to={`/app/watch/${entry.video.videoId}?list=${playlist.id}`}
                className="flex min-w-0 flex-1 items-center gap-4"
              >
                <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-stone-200">
                  <img
                    src={entry.video.thumbnailUrl}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  {entry.video.completed && (
                    <span className="absolute bottom-0 left-0 right-0 bg-emerald-600/90 py-0.5 text-center text-[10px] font-medium text-white">
                      Completed
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium leading-5 text-stone-900 group-hover:text-emerald-800">
                    {entry.video.title || 'Untitled video'}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-stone-500">
                    {entry.video.channelName || 'Unknown channel'}
                    {entry.video.durationSec > 0 && ` · ${formatDuration(entry.video.durationSec)}`}
                  </p>
                  <div className="mt-1.5">
                    <StatusBadge item={entry.video} />
                  </div>
                </div>
              </Link>

              <button
                onClick={() => removeEntry(entry)}
                disabled={removingEntryId === entry.id}
                aria-label="Remove from playlist"
                title="Remove from playlist"
                className="shrink-0 rounded-lg p-2 text-stone-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100 disabled:opacity-50"
              >
                {removingEntryId === entry.id ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {showRename && (
        <RenamePlaylistModal
          playlist={playlist}
          onClose={() => setShowRename(false)}
          onRenamed={(updated) => {
            setPlaylist((current) => ({ ...current, ...updated }))
            toast.success('Playlist updated.')
          }}
        />
      )}
    </div>
  )
}

function BackLink() {
  return (
    <Link
      to="/app/playlists"
      className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-stone-400 hover:text-stone-600"
    >
      <ArrowLeft className="h-4 w-4" />
      All playlists
    </Link>
  )
}

function RenamePlaylistModal({ playlist, onClose, onRenamed }) {
  const toast = useToast()
  const [title, setTitle] = useState(playlist.title)
  const [description, setDescription] = useState(playlist.description || '')
  const [fieldErrors, setFieldErrors] = useState({})
  const [pending, setPending] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setFieldErrors({})
    setPending(true)
    try {
      const data = await api(`/playlists/${playlist.id}`, {
        method: 'PATCH',
        body: { title, description },
      })
      onRenamed({ title: data.playlist.title, description: data.playlist.description })
      onClose()
    } catch (err) {
      setFieldErrors(err.fields || {})
      if (!err.fields) toast.error(err.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal title="Rename playlist" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="rename-title" className="mb-1.5 block text-sm font-medium text-stone-700">
            Title
          </label>
          <input
            id="rename-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            autoFocus
            className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm focus:outline-none ${
              fieldErrors.title ? 'border-red-300' : 'border-stone-300 focus:border-emerald-500'
            }`}
          />
          {fieldErrors.title && (
            <p role="alert" className="mt-1.5 text-xs text-red-600">
              {fieldErrors.title}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="rename-description" className="mb-1.5 block text-sm font-medium text-stone-700">
            Description <span className="font-normal text-stone-400">(optional)</span>
          </label>
          <textarea
            id="rename-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={300}
            className="w-full resize-y rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending || !title.trim()}
            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            Save changes
          </button>
        </div>
      </form>
    </Modal>
  )
}
