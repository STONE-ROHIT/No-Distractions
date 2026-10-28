import { Link } from 'react-router-dom'
import { CheckCircle2, PlayCircle } from 'lucide-react'
import { formatDuration } from '../lib/format.js'

/**
 * Sidebar listing the videos of the playlist currently being watched.
 * The active video is highlighted; clicking another one navigates to it
 * while keeping the playlist context. The footer links to the next
 * unwatched video so finishing a course is one click away.
 */
export default function PlaylistPanel({ playlist, currentVideoId }) {
  if (!playlist) return null

  const total = playlist.itemCount
  const done = playlist.completedCount
  const percent = total > 0 ? Math.round((done / total) * 100) : 0

  // Next unwatched video after the current position in the list.
  const currentIndex = playlist.items.findIndex(
    ({ video }) => video.videoId === currentVideoId,
  )
  const nextEntry = playlist.items.find(
    ({ video }, index) => index > currentIndex && !video.completed,
  )

  return (
    <aside className="rounded-xl border border-stone-200 bg-white" aria-label="Playlist">
      <div className="border-b border-stone-100 px-4 py-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400">
          Learning playlist
        </p>
        <h2 className="mt-0.5 text-base font-semibold text-stone-900">{playlist.title}</h2>
        {playlist.description && (
          <p className="mt-1 line-clamp-2 text-xs text-stone-500">{playlist.description}</p>
        )}
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
          </div>
          <span className="text-xs font-medium text-stone-500">
            {done}/{total} done
          </span>
        </div>
      </div>

      <ul className="scrollable max-h-[32rem] divide-y divide-stone-100 overflow-y-auto">
        {playlist.items.map(({ id, video }) => (
          <li key={id}>
            <Link
              to={`/app/watch/${video.videoId}?list=${playlist.id}`}
              className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                video.videoId === currentVideoId
                  ? 'bg-emerald-50/70'
                  : 'hover:bg-stone-50'
              }`}
              aria-current={video.videoId === currentVideoId ? 'true' : undefined}
            >
              <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-md bg-stone-200">
                <img src={video.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`line-clamp-2 text-xs font-medium leading-4 ${
                    video.videoId === currentVideoId ? 'text-emerald-900' : 'text-stone-800'
                  }`}
                >
                  {video.title || 'Untitled video'}
                </p>
                <p className="mt-0.5 text-[11px] text-stone-400">
                  {video.durationSec > 0 ? formatDuration(video.durationSec) : '—'}
                </p>
              </div>
              {video.videoId === currentVideoId ? (
                <PlayCircle className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Now watching" />
              ) : video.completed ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-label="Completed" />
              ) : (
                <PlayCircle className="h-4 w-4 shrink-0 text-stone-300" aria-hidden="true" />
              )}
            </Link>
          </li>
        ))}
      </ul>

      {/* Up next */}
      {nextEntry && (
        <div className="border-t border-stone-100 px-4 py-3">
          <Link
            to={`/app/watch/${nextEntry.video.videoId}?list=${playlist.id}`}
            className="flex items-center gap-3 rounded-lg bg-emerald-50 px-3 py-2.5 transition-colors hover:bg-emerald-100"
          >
            <div className="h-10 w-16 shrink-0 overflow-hidden rounded-md bg-stone-200">
              <img
                src={nextEntry.video.thumbnailUrl}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                Up next
              </p>
              <p className="line-clamp-1 text-xs font-medium text-stone-800">
                {nextEntry.video.title || 'Untitled video'}
              </p>
            </div>
            <PlayCircle className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
          </Link>
        </div>
      )}
    </aside>
  )
}
