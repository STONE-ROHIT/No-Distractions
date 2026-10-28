import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, ListPlus, Trash2 } from 'lucide-react'
import { StatusBadge } from './common.jsx'
import { formatRelativeTime } from '../lib/format.js'

/**
 * A saved video card, used on the dashboard and library pages.
 *
 * `onRemove` and `onAddToPlaylist` are optional; when provided, small
 * action buttons appear on the card.
 */
export default function VideoCard({ item, onRemove, onAddToPlaylist }) {
  const [confirmingRemove, setConfirmingRemove] = useState(false)

  const progressPercent = item.completed
    ? 100
    : item.durationSec > 0 && item.lastPositionSec > 0
      ? Math.min(100, Math.round((item.lastPositionSec / item.durationSec) * 100))
      : 0

  const minutesLeft =
    !item.completed && item.durationSec > 0
      ? Math.max(1, Math.round((item.durationSec - item.lastPositionSec) / 60))
      : null

  return (
    <article className="group relative">
      <Link
        to={`/app/watch/${item.videoId}`}
        className="block focus-visible:outline-offset-4"
        aria-label={`Watch ${item.title || 'video'}`}
      >
        <div className="relative aspect-video overflow-hidden rounded-lg bg-stone-200">
          <img
            src={item.thumbnailUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
          {item.completed && (
            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-stone-900/80 px-2 py-0.5 text-[11px] font-medium text-white">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              Completed
            </span>
          )}
          {progressPercent > 0 && !item.completed && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30">
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${progressPercent}%` }}
                aria-label={`${progressPercent}% watched`}
              />
            </div>
          )}
        </div>

        <div className="mt-2.5">
          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-5 text-stone-900 group-hover:text-emerald-800">
            {item.title || 'Untitled video'}
          </h3>
          <p className="mt-0.5 truncate text-xs text-stone-500">
            {item.channelName || 'Unknown channel'}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-stone-400">
            <StatusBadge item={item} />
            {minutesLeft && <span>~{minutesLeft} min left</span>}
            {item.lastWatchedAt && <span>{formatRelativeTime(item.lastWatchedAt)}</span>}
          </div>
        </div>
      </Link>

      {(onRemove || onAddToPlaylist) && (
        <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100">
          {onAddToPlaylist && (
            <button
              onClick={() => onAddToPlaylist(item)}
              aria-label="Add to playlist"
              title="Add to playlist"
              className="rounded-lg bg-white/95 p-1.5 text-stone-600 shadow-sm hover:text-emerald-700"
            >
              <ListPlus className="h-4 w-4" />
            </button>
          )}
          {onRemove && !confirmingRemove && (
            <button
              onClick={() => setConfirmingRemove(true)}
              aria-label="Remove from library"
              title="Remove from library"
              className="rounded-lg bg-white/95 p-1.5 text-stone-600 shadow-sm hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          {onRemove && confirmingRemove && (
            <button
              onClick={() => {
                setConfirmingRemove(false)
                onRemove(item)
              }}
              className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-red-700"
            >
              Remove?
            </button>
          )}
        </div>
      )}
    </article>
  )
}
