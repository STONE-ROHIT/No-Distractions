import { useState } from 'react'
import { Check, Clock, NotebookPen, Pencil, Trash2, X } from 'lucide-react'
import { api } from '../lib/api.js'
import { useToast } from '../context/ToastContext.jsx'
import { Spinner } from './common.jsx'
import { formatDuration, formatRelativeTime } from '../lib/format.js'

/**
 * Notes for one video: add, edit, delete, optional timestamps.
 *
 * `getPlayerTime` returns the player's current time (used to attach a
 * timestamp to a new note); `onSeekTo` jumps the player to a note's
 * timestamp. Both are optional — notes work without a live player.
 */
export default function NotesSection({ videoId, notes, setNotes, getPlayerTime, onSeekTo }) {
  const toast = useToast()
  const [text, setText] = useState('')
  const [attachTimestamp, setAttachTimestamp] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [confirmingId, setConfirmingId] = useState(null)
  const [busyId, setBusyId] = useState(null)

  async function addNote(event) {
    event.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return

    setSaving(true)
    try {
      const timestamp =
        attachTimestamp && typeof getPlayerTime === 'function' ? getPlayerTime() : null
      const data = await api('/notes', {
        method: 'POST',
        body: {
          videoId,
          text: trimmed,
          ...(timestamp != null && timestamp > 1 ? { timestampSec: Math.round(timestamp) } : {}),
        },
      })
      setNotes((current) => [...current, data.note])
      setText('')
      toast.success('Note added.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function saveEdit(note) {
    const trimmed = editText.trim()
    if (!trimmed) return

    setBusyId(note.id)
    try {
      const data = await api(`/notes/${note.id}`, {
        method: 'PATCH',
        body: { text: trimmed },
      })
      setNotes((current) => current.map((n) => (n.id === note.id ? data.note : n)))
      setEditingId(null)
      toast.success('Note updated.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function deleteNote(note) {
    setBusyId(note.id)
    try {
      await api(`/notes/${note.id}`, { method: 'DELETE' })
      setNotes((current) => current.filter((n) => n.id !== note.id))
      toast.success('Note deleted.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyId(null)
      setConfirmingId(null)
    }
  }

  return (
    <section aria-label="Notes" className="rounded-xl border border-stone-200 bg-white">
      <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-4">
        <NotebookPen className="h-4 w-4 text-stone-400" />
        <h2 className="text-sm font-semibold text-stone-900">Your notes</h2>
        <span className="ml-auto text-xs text-stone-400">
          {notes.length === 0 ? '' : `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`}
        </span>
      </div>

      <form onSubmit={addNote} className="border-b border-stone-100 px-5 py-4">
        <label htmlFor="new-note" className="sr-only">
          New note
        </label>
        <textarea
          id="new-note"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          placeholder="Write down an idea, a timestamp to revisit, a formula…"
          className="w-full resize-y rounded-lg border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-500 focus:bg-white focus:outline-none"
        />
        <div className="mt-2.5 flex items-center justify-between gap-3">
          {typeof getPlayerTime === 'function' ? (
            <label className="flex cursor-pointer items-center gap-2 text-xs text-stone-500">
              <input
                type="checkbox"
                checked={attachTimestamp}
                onChange={(e) => setAttachTimestamp(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-stone-300 accent-emerald-600"
              />
              Attach current time
            </label>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={saving || !text.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            Add note
          </button>
        </div>
      </form>

      {notes.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-stone-500">
          No notes yet. Anything worth remembering while you watch? Write it here —
          notes with a timestamp jump back to that moment.
        </p>
      ) : (
        <ul className="divide-y divide-stone-100 scrollable max-h-[28rem] overflow-y-auto">
          {notes.map((note) => (
            <li key={note.id} className="group px-5 py-3.5">
              {editingId === note.id ? (
                <div>
                  <textarea
                    rows={3}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    maxLength={2000}
                    className="w-full resize-y rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => saveEdit(note)}
                      disabled={busyId === note.id}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {busyId === note.id ? <Spinner className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {note.timestampSec != null && (
                      <button
                        onClick={() => onSeekTo?.(note.timestampSec)}
                        className="mb-1 inline-flex items-center gap-1 rounded-md bg-stone-100 px-1.5 py-0.5 font-mono text-[11px] text-stone-600 hover:bg-emerald-50 hover:text-emerald-700"
                        title="Jump to this moment"
                      >
                        <Clock className="h-3 w-3" />
                        {formatDuration(note.timestampSec)}
                      </button>
                    )}
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-700">
                      {note.text}
                    </p>
                    <p className="mt-1 text-[11px] text-stone-400">
                      {formatRelativeTime(note.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100">
                    <button
                      onClick={() => {
                        setEditingId(note.id)
                        setEditText(note.text)
                      }}
                      aria-label="Edit note"
                      className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {confirmingId === note.id ? (
                      <button
                        onClick={() => deleteNote(note)}
                        disabled={busyId === note.id}
                        className="rounded-lg bg-red-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-red-700"
                      >
                        {busyId === note.id ? 'Deleting…' : 'Delete?'}
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmingId(note.id)}
                        aria-label="Delete note"
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
