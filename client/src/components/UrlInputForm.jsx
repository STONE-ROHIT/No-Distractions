import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link2, PlayCircle } from 'lucide-react'
import { extractVideoId, extractPlaylistId } from '../lib/youtube.js'

/**
 * "Paste a YouTube link" input used on the dashboard and the watch
 * page. Validates client-side for instant feedback, then navigates to
 * the watch page (the server re-validates and fetches metadata).
 * Playlist links jump to the Discover page's import flow instead.
 */
export default function UrlInputForm({ autoFocus = false }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  function handleSubmit(event) {
    event.preventDefault()
    const videoId = extractVideoId(value)
    if (videoId) {
      setError('')
      navigate(`/app/watch/${videoId}`)
      return
    }

    const playlistId = extractPlaylistId(value)
    if (playlistId) {
      setError('')
      navigate(`/app/search?import=${encodeURIComponent(value.trim())}`)
      return
    }

    setError(
      'That does not look like a YouTube video or playlist link. Try something like https://www.youtube.com/watch?v=…',
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <label htmlFor="video-url" className="sr-only">
        YouTube video link
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            id="video-url"
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            autoFocus={autoFocus}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setError('')
            }}
            placeholder="Paste a YouTube video or playlist link…"
            className="w-full rounded-xl border border-stone-300 bg-white py-3 pl-10 pr-4 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <PlayCircle className="hidden h-4 w-4 sm:block" />
          Start learning
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </form>
  )
}
