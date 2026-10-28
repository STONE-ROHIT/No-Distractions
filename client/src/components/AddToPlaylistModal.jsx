import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ListPlus, Plus } from 'lucide-react'
import { api } from '../lib/api.js'
import { Modal, Spinner } from './common.jsx'
import { useToast } from '../context/ToastContext.jsx'

/**
 * Dialog that adds a library video to one of the user's playlists.
 * Shows existing playlists; adding is instant. Creating a new playlist
 * happens on the Playlists page (kept simple by design).
 */
export default function AddToPlaylistModal({ item, onClose, onAdded }) {
  const toast = useToast()
  const [playlists, setPlaylists] = useState(null)
  const [addingId, setAddingId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    api('/playlists')
      .then((data) => {
        if (!cancelled) setPlaylists(data.playlists)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function addTo(playlist) {
    setAddingId(playlist.id)
    try {
      const data = await api(`/playlists/${playlist.id}/items`, {
        method: 'POST',
        body: { libraryItemId: item.id },
      })
      if (data.alreadyInPlaylist) {
        toast.success(`Already in “${playlist.title}”.`)
      } else {
        toast.success(`Added to “${playlist.title}”.`)
        onAdded?.(data.playlist)
      }
      onClose()
    } catch (err) {
      toast.error(err.message)
      setAddingId(null)
    }
  }

  return (
    <Modal title="Add to playlist" onClose={onClose}>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!playlists && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}
      {playlists && playlists.length === 0 && (
        <div className="py-4 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-stone-100">
            <ListPlus className="h-6 w-6 text-stone-400" />
          </div>
          <p className="text-sm text-stone-600">You do not have any playlists yet.</p>
          <Link
            to="/app/playlists"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Create your first playlist
          </Link>
        </div>
      )}
      {playlists && playlists.length > 0 && (
        <ul className="space-y-1.5">
          {playlists.map((playlist) => (
            <li key={playlist.id}>
              <button
                onClick={() => addTo(playlist)}
                disabled={addingId !== null}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-stone-200 px-4 py-3 text-left hover:border-emerald-300 hover:bg-emerald-50/50 disabled:opacity-60"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-stone-800">
                    {playlist.title}
                  </span>
                  <span className="text-xs text-stone-500">
                    {playlist.itemCount} {playlist.itemCount === 1 ? 'video' : 'videos'}
                  </span>
                </span>
                {addingId === playlist.id ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4 shrink-0 text-stone-400" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {playlists && playlists.length > 0 && (
        <p className="mt-4 text-center text-xs text-stone-400">
          Need a new playlist?{' '}
          <Link to="/app/playlists" className="font-medium text-emerald-700 hover:underline">
            Create one on the Playlists page
          </Link>
        </p>
      )}
    </Modal>
  )
}
