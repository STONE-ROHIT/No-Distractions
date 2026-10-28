import { useState } from 'react'
import { Bookmark, BookmarkPlus, Check, Pencil, Trash2, X } from 'lucide-react'
import { formatDuration } from '../lib/format.js'
import { Spinner } from './common.jsx'

/**
 * Bookmarks for one video: quick position markers with an optional label.
 *
 * Data mutations live in the parent (Watch), so both this component and
 * the focus-mode keyboard shortcut can create bookmarks through the same
 * path. `getPlayerTime` returns the player's current position; `onSeekTo`
 * jumps the player to a bookmark.
 */
export default function BookmarksSection({
  bookmarks,
  onAdd,
  onUpdate,
  onDelete,
  onSeekTo,
  getPlayerTime,
  busy,
}) {
  const [label, setLabel] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editLabel, setEditLabel] = useState('')
  const [confirmingId, setConfirmingId] = useState(null)
  const [timePreview, setTimePreview] = useState(null)

  function previewTime() {
    if (typeof getPlayerTime !== 'function') return null
    const t = getPlayerTime()
    return typeof t === 'number' ? t : null
  }

  async function add(event) {
    event.preventDefault()
    const position = previewTime()
    if (position == null) return
    await onAdd(position, label.trim())
    setLabel('')
    setTimePreview(null)
  }

  return (
    <section aria-label="Bookmarks" className="rounded-xl border border-stone-200 bg-white">
      <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-4">
        <Bookmark className="h-4 w-4 text-stone-400" />
        <h2 className="text-sm font-semibold text-stone-900">Bookmarks</h2>
        <span className="ml-auto text-xs text-stone-400">
          {bookmarks.length === 0 ? '' : `${bookmarks.length} ${bookmarks.length === 1 ? 'bookmark' : 'bookmarks'}`}
        </span>
      </div>

      {typeof getPlayerTime === 'function' && (
        <form onSubmit={add} className="border-b border-stone-100 px-5 py-4">
          <div className="flex gap-2">
            <label htmlFor="bookmark-label" className="sr-only">
              Bookmark label
            </label>
            <input
              id="bookmark-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onFocus={() => setTimePreview(previewTime())}
              maxLength={120}
              placeholder="Optional label, e.g. “Key formula”"
              className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-500 focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || timePreview == null}
              title={timePreview == null ? 'Start playing to place a bookmark' : `Bookmark at ${formatDuration(timePreview)}`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <Spinner className="h-4 w-4" /> : <BookmarkPlus className="h-4 w-4" />}
              <span className="hidden sm:inline">Mark</span>
            </button>
          </div>
          <p className="mt-2 text-xs text-stone-400">
            {timePreview != null ? (
              <>
                Will be placed at <span className="font-mono text-stone-600">{formatDuration(timePreview)}</span> — the
                player’s current position.
              </>
            ) : (
              'Start playing, then mark the moments worth revisiting.'
            )}
          </p>
        </form>
      )}

      {bookmarks.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-stone-500">
          No bookmarks yet. Mark a position while watching and jump back to it
          with one click.
        </p>
      ) : (
        <ul className="scrollable max-h-[24rem] divide-y divide-stone-100 overflow-y-auto">
          {bookmarks.map((bookmark) => (
            <li key={bookmark.id} className="group px-5 py-3">
              {editingId === bookmark.id ? (
                <div className="flex gap-2">
                  <label htmlFor={`edit-bookmark-${bookmark.id}`} className="sr-only">
                    Edit bookmark label
                  </label>
                  <input
                    id={`edit-bookmark-${bookmark.id}`}
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    maxLength={120}
                    className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-stone-50 px-3 py-1.5 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      onUpdate(bookmark, editLabel.trim())
                      setEditingId(null)
                    }}
                    aria-label="Save label"
                    className="rounded-lg bg-emerald-600 p-1.5 text-white hover:bg-emerald-700"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    aria-label="Cancel"
                    className="rounded-lg border border-stone-200 p-1.5 text-stone-600 hover:bg-stone-50"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => onSeekTo?.(bookmark.positionSec)}
                      className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-1.5 py-0.5 font-mono text-[11px] text-stone-600 hover:bg-emerald-50 hover:text-emerald-700"
                      title="Jump to this moment"
                    >
                      {formatDuration(bookmark.positionSec)}
                    </button>
                    <p
                      className={`mt-1 truncate text-sm ${
                        bookmark.label ? 'text-stone-700' : 'italic text-stone-400'
                      }`}
                    >
                      {bookmark.label || 'Unlabeled'}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100">
                    <button
                      onClick={() => {
                        setEditingId(bookmark.id)
                        setEditLabel(bookmark.label || '')
                      }}
                      aria-label="Edit bookmark label"
                      className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {confirmingId === bookmark.id ? (
                      <button
                        onClick={() => onDelete(bookmark)}
                        disabled={busy}
                        className="rounded-lg bg-red-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-red-700"
                      >
                        {busy ? 'Deleting…' : 'Delete?'}
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmingId(bookmark.id)}
                        aria-label="Delete bookmark"
                        className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
