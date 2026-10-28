import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ListVideo, Trash2 } from 'lucide-react'
import { api } from '../lib/api.js'
import { useToast } from '../context/ToastContext.jsx'
import { EmptyState, ErrorState, Modal, SkeletonCard } from '../components/common.jsx'

/** All playlists, with creation via a small dialog. */
export default function Playlists() {
  const toast = useToast()
  const [playlists, setPlaylists] = useState(null)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [confirmingId, setConfirmingId] = useState(null)

  function load() {
    setError('')
    api('/playlists')
      .then((data) => setPlaylists(data.playlists))
      .catch((err) => setError(err.message))
  }

  useEffect(load, [])

  async function handleDelete(playlist) {
    setConfirmingId(null)
    setPlaylists((current) => (current || []).filter((p) => p.id !== playlist.id))
    try {
      await api(`/playlists/${playlist.id}`, { method: 'DELETE' })
      toast.success(`Deleted “${playlist.title}”.`)
    } catch (err) {
      toast.error(err.message)
      load()
    }
  }

  if (error) {
    return <ErrorState message={error} onRetry={load} />
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-stone-900">
            Learning playlists
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Group saved videos into a course of your own making.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <ListVideo className="h-4 w-4" />
          New playlist
        </button>
      </div>

      {!playlists && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {playlists && playlists.length === 0 && (
        <EmptyState
          icon={ListVideo}
          title="No playlists yet"
          hint="Create your first playlist — for a course, a topic, or a week of study — then add saved videos to it."
          action={
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Create a playlist
            </button>
          }
        />
      )}

      {playlists && playlists.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {playlists.map((playlist) => {
            const percent =
              playlist.itemCount > 0
                ? Math.round((playlist.completedCount / playlist.itemCount) * 100)
                : 0
            return (
              <div key={playlist.id} className="group relative">
                <Link
                  to={`/app/playlists/${playlist.id}`}
                  className="block rounded-xl border border-stone-200 bg-white transition-colors hover:border-emerald-300"
                >
                  <div className="relative aspect-video overflow-hidden rounded-t-xl bg-stone-200">
                    {playlist.cover ? (
                      <img
                        src={playlist.cover.thumbnailUrl}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ListVideo className="h-8 w-8 text-stone-300" />
                      </div>
                    )}
                    {playlist.itemCount > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/40">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h2 className="truncate text-sm font-semibold text-stone-900">
                      {playlist.title}
                    </h2>
                    {playlist.description && (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-stone-500">
                        {playlist.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-stone-400">
                      {playlist.itemCount} {playlist.itemCount === 1 ? 'video' : 'videos'} ·{' '}
                      {playlist.completedCount} completed
                    </p>
                  </div>
                </Link>

                <div className="absolute right-2 top-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100">
                  {confirmingId === playlist.id ? (
                    <button
                      onClick={() => handleDelete(playlist)}
                      className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-red-700"
                    >
                      Delete?
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmingId(playlist.id)}
                      aria-label={`Delete playlist ${playlist.title}`}
                      className="rounded-lg bg-white/95 p-1.5 text-stone-600 shadow-sm hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCreate && (
        <CreatePlaylistModal
          onClose={() => setShowCreate(false)}
          onCreated={(playlist) => {
            setPlaylists((current) => [playlist, ...(current || [])])
            toast.success(`Playlist “${playlist.title}” created.`)
          }}
        />
      )}
    </div>
  )
}

function CreatePlaylistModal({ onClose, onCreated }) {
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [pending, setPending] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setFieldErrors({})
    setPending(true)
    try {
      const data = await api('/playlists', {
        method: 'POST',
        body: { title, description: description || undefined },
      })
      onCreated(data.playlist)
      onClose()
    } catch (err) {
      setFieldErrors(err.fields || {})
      if (!err.fields) toast.error(err.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal title="New playlist" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="playlist-title" className="mb-1.5 block text-sm font-medium text-stone-700">
            Title
          </label>
          <input
            id="playlist-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            autoFocus
            placeholder="e.g. Linear algebra fundamentals"
            className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm placeholder:text-stone-400 focus:outline-none ${
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
          <label htmlFor="playlist-description" className="mb-1.5 block text-sm font-medium text-stone-700">
            Description <span className="font-normal text-stone-400">(optional)</span>
          </label>
          <textarea
            id="playlist-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={300}
            placeholder="What is this playlist for?"
            className="w-full resize-y rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none"
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
            Create playlist
          </button>
        </div>
      </form>
    </Modal>
  )
}
