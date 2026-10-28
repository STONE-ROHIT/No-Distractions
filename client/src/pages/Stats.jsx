import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookCheck,
  Bookmark,
  CheckCircle2,
  Flame,
  ListVideo,
  NotebookPen,
  PlayCircle,
} from 'lucide-react'
import { api } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { ErrorState, Spinner } from '../components/common.jsx'

/**
 * Learning statistics — a single quiet page, no charts library.
 *
 * Every number here is computed by GET /api/stats from existing documents,
 * and each card says how it is derived. Times are position-based
 * estimates (last playback position), not measured watch time — the
 * YouTube embedded player does not expose that.
 */
export default function Stats() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/stats')
      .then(setStats)
      .catch((err) => setError(err.message))
  }, [])

  if (error) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />
  }

  if (!stats) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-6 w-6 text-stone-400" />
      </div>
    )
  }

  const maxActivity = Math.max(1, ...stats.activity.map((day) => day.count))
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-xl font-semibold tracking-tight text-stone-900">
        Your learning activity
      </h1>
      <p className="mt-1 text-sm text-stone-500">
        {user ? `${user.name.split(' ')[0]}, here` : 'Here'} is what your library says about
        your studying — honest numbers only.
      </p>

      {/* Headline cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CheckCircle2}
          label="Videos completed"
          value={stats.videos.completed}
          hint={`of ${stats.videos.saved} saved`}
        />
        <StatCard
          icon={PlayCircle}
          label="In progress"
          value={stats.videos.inProgress}
          hint={stats.videos.inProgress > 0 ? `~${stats.remainingMinutes} min remaining` : 'nothing half-watched'}
        />
        <StatCard
          icon={BookCheck}
          label="Estimated learning time"
          value={`${stats.estimatedMinutes}m`}
          hint="based on playback positions"
        />
        <StatCard
          icon={Flame}
          label="Current streak"
          value={stats.streakDays > 0 ? `${stats.streakDays} ${stats.streakDays === 1 ? 'day' : 'days'}` : '—'}
          hint="days with a watch in a row"
        />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Weekly activity */}
        <section aria-labelledby="weekly-activity" className="rounded-xl border border-stone-200 bg-white p-6">
          <h2 id="weekly-activity" className="text-base font-semibold text-stone-900">
            Last 7 days
          </h2>
          <p className="mt-1 text-xs text-stone-400">
            Videos whose most recent watch fell on that day (a video counts once, on its
            latest day).
          </p>

          <div className="mt-6 flex h-36 items-end gap-3" role="img" aria-label="Videos watched per day, last 7 days">
            {stats.activity.map((day) => (
              <div key={day.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <span className="text-[11px] font-medium text-stone-500">
                  {day.count > 0 ? day.count : ''}
                </span>
                <div
                  className={`w-full max-w-10 rounded-md ${
                    day.count > 0 ? 'bg-emerald-500' : 'bg-stone-100'
                  }`}
                  style={{
                    height: `${day.count > 0 ? Math.max(8, (day.count / maxActivity) * 100) : 4}%`,
                  }}
                  title={`${day.date}: ${day.count} ${day.count === 1 ? 'video' : 'videos'}`}
                />
                <span
                  className={`text-[11px] ${
                    day.date === today ? 'font-semibold text-stone-700' : 'text-stone-400'
                  }`}
                >
                  {formatDayLabel(day.date)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Smaller counts + playlists */}
        <div className="space-y-8">
          <section aria-labelledby="library-counts" className="rounded-xl border border-stone-200 bg-white p-6">
            <h2 id="library-counts" className="text-base font-semibold text-stone-900">
              Library & notes
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <CountRow icon={NotebookPen} label="Notes written" value={stats.notes} />
              <CountRow icon={Bookmark} label="Bookmarks placed" value={stats.bookmarks} />
              <CountRow
                icon={ListVideo}
                label="Playlists completed"
                value={`${stats.playlists.completed} of ${stats.playlists.total}`}
              />
            </dl>
          </section>

          {stats.unfinishedPlaylists.length > 0 && (
            <section aria-labelledby="unfinished" className="rounded-xl border border-stone-200 bg-white p-6">
              <h2 id="unfinished" className="text-base font-semibold text-stone-900">
                Closest to finishing
              </h2>
              <ul className="mt-4 space-y-4">
                {stats.unfinishedPlaylists.slice(0, 3).map((playlist) => (
                  <li key={playlist.id}>
                    <Link
                      to={`/app/watch/${playlist.next.videoId}?list=${playlist.id}`}
                      className="group block"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="truncate text-sm font-medium text-stone-800 group-hover:text-emerald-700">
                          {playlist.title}
                        </p>
                        <span className="shrink-0 text-xs text-stone-400">{playlist.percent}%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${playlist.percent}%` }}
                        />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      <p className="mt-8 text-xs leading-relaxed text-stone-400">
        How these are calculated: “estimated learning time” adds up the last playback
        position of unfinished videos and the full duration of completed ones — it
        approximates how much content you have been through, not the minutes you
        actually spent (the embedded player does not report that). Daily activity uses
        each video’s most recent watch time, so a video revisited over several days
        counts on its last day only.
      </p>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <div className="flex items-center gap-2 text-stone-400">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <p className="text-xs font-medium uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-stone-900">{value}</p>
      <p className="mt-1 text-xs text-stone-400">{hint}</p>
    </div>
  )
}

function CountRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-2 text-stone-500">
        <Icon className="h-3.5 w-3.5 text-stone-400" aria-hidden="true" />
        {label}
      </dt>
      <dd className="font-semibold tabular-nums text-stone-800">{value}</dd>
    </div>
  )
}

function formatDayLabel(dateStr) {
  const date = new Date(`${dateStr}T00:00:00`)
  return date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2)
}
