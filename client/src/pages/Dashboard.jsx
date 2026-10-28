import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Flame, ListVideo, PlayCircle, Sparkles } from 'lucide-react'
import { api } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import UrlInputForm from '../components/UrlInputForm.jsx'
import VideoCard from '../components/VideoCard.jsx'
import AddToPlaylistModal from '../components/AddToPlaylistModal.jsx'
import { ErrorState, SkeletonCard } from '../components/common.jsx'

/**
 * The user's learning home: start a video, continue where they left off,
 * pick up unfinished playlists, and see recent activity. Deliberately
 * quiet — the numbers that appear here come from /api/stats and are
 * estimates clearly labeled as such (see the stats route).
 */
export default function Dashboard() {
  const { user } = useAuth()
  const [items, setItems] = useState(null)
  const [playlists, setPlaylists] = useState(null)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [playlistTarget, setPlaylistTarget] = useState(null)

  function load() {
    setError('')
    Promise.all([api('/library'), api('/playlists'), api('/stats')])
      .then(([libraryData, playlistData, statsData]) => {
        setItems(libraryData.items)
        setPlaylists(playlistData.playlists)
        setStats(statsData)
      })
      .catch((err) => setError(err.message))
  }

  useEffect(load, [])

  async function handleRemove(item) {
    try {
      await api(`/library/${item.id}`, { method: 'DELETE' })
      setItems((current) => current.filter((i) => i.id !== item.id))
      load()
    } catch {
      load()
    }
  }

  if (error) {
    return <ErrorState message={error} onRetry={load} />
  }

  const loading = !items || !playlists

  // The library comes back sorted by lastWatchedAt (desc).
  const inProgress = items?.filter((i) => !i.completed && i.lastPositionSec > 0) || []
  const inProgressIds = new Set(inProgress.map((i) => i.id))
  const recentlyAdded =
    items?.filter((i) => !inProgressIds.has(i.id)).sort((a, b) => b.createdAt - a.createdAt) || []
  const recentlyWatched = items?.filter((i) => i.lastWatchedAt && i.completed) || []
  const unfinishedPlaylists = stats?.unfinishedPlaylists || []
  const hasAnyActivity = items && items.length > 0
  const firstName = user ? user.name.split(' ')[0] : ''

  return (
    <div className="space-y-10">
      {/* Greeting + start-learning input */}
      <section>
        <h1 className="text-xl font-semibold tracking-tight text-stone-900">
          {items ? `Welcome back${firstName ? `, ${firstName}` : ''}` : 'Welcome'}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Paste a YouTube link to watch it in your focused study space.
        </p>
        <div className="mt-4 max-w-2xl">
          <UrlInputForm />
        </div>
      </section>

      {loading && (
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </section>
      )}

      {!loading && !hasAnyActivity && (
        <section className="rounded-2xl border border-stone-200 bg-white px-6 py-10 sm:px-10">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
              <Sparkles className="h-6 w-6 text-emerald-600" />
            </div>
            <h2 className="text-lg font-semibold text-stone-900">
              Your study space is ready
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">
              Start with a YouTube link above. Save the video, and it will live
              here in your library with your progress, notes, and bookmarks.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
              <Link
                to="/app/library"
                className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-3.5 py-2 font-medium text-stone-600 hover:bg-stone-50"
              >
                <BookOpen className="h-4 w-4" />
                Library
              </Link>
              <Link
                to="/app/playlists"
                className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-3.5 py-2 font-medium text-stone-600 hover:bg-stone-50"
              >
                <ListVideo className="h-4 w-4" />
                Playlists
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Small, honest activity overview (position-based estimates). */}
      {!loading && stats && (stats.videos.completed > 0 || stats.videos.inProgress > 0) && (
        <section
          aria-label="Learning activity"
          className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-stone-200 bg-white px-5 py-3.5 text-sm text-stone-600"
        >
          <span className="font-medium text-stone-800">This week</span>
          <span>
            <strong className="font-semibold text-stone-900">{stats.videos.completed}</strong>{' '}
            {stats.videos.completed === 1 ? 'video' : 'videos'} completed
          </span>
          <span>
            <strong className="font-semibold text-stone-900">
              ~{stats.estimatedMinutes}
            </strong>{' '}
            min of learning<sup className="text-stone-400" title="Position-based estimate, not measured watch time.">*</sup>
          </span>
          {stats.videos.inProgress > 0 && (
            <span>
              <strong className="font-semibold text-stone-900">
                {stats.videos.inProgress}
              </strong>{' '}
              in progress · ~{stats.remainingMinutes} min left
            </span>
          )}
          {stats.streakDays > 1 && (
            <span className="inline-flex items-center gap-1 text-amber-600">
              <Flame className="h-3.5 w-3.5" aria-hidden="true" />
              {stats.streakDays}-day streak
            </span>
          )}
          <Link
            to="/app/stats"
            className="ml-auto text-sm font-medium text-stone-400 hover:text-emerald-700"
          >
            Statistics →
          </Link>
        </section>
      )}

      {/* Continue learning */}
      {!loading && inProgress.length > 0 && (
        <section aria-labelledby="continue-watching">
          <SectionHeader
            id="continue-watching"
            title="Continue learning"
            viewAllLink="/app/library?status=in-progress"
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {inProgress.slice(0, 4).map((item) => (
              <VideoCard
                key={item.id}
                item={item}
                onRemove={handleRemove}
                onAddToPlaylist={setPlaylistTarget}
              />
            ))}
          </div>
        </section>
      )}

      {/* Unfinished playlists */}
      {!loading && unfinishedPlaylists.length > 0 && (
        <section aria-labelledby="unfinished-playlists">
          <SectionHeader
            id="unfinished-playlists"
            title="Unfinished playlists"
            viewAllLink="/app/playlists"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {unfinishedPlaylists.map((playlist) => (
              <Link
                key={playlist.id}
                to={`/app/watch/${playlist.next.videoId}?list=${playlist.id}`}
                className="group flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-4 transition-colors hover:border-emerald-300"
              >
                <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-stone-200">
                  {playlist.next.thumbnailUrl ? (
                    <img
                      src={playlist.next.thumbnailUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ListVideo className="h-5 w-5 text-stone-300" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-stone-900 group-hover:text-emerald-800">
                    {playlist.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-stone-500">
                    Up next: {playlist.next.title || 'Untitled video'}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${playlist.percent}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-[11px] font-medium text-stone-400">
                      {playlist.completedCount}/{playlist.itemCount}
                    </span>
                  </div>
                </div>
                <PlayCircle
                  className="h-5 w-5 shrink-0 text-stone-300 group-hover:text-emerald-600"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recently added (not already shown in Continue learning) */}
      {!loading && recentlyAdded.length > 0 && (
        <section aria-labelledby="recently-added">
          <SectionHeader
            id="recently-added"
            title="Recently added"
            viewAllLink="/app/library?sort=recently-added"
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {recentlyAdded.slice(0, 4).map((item) => (
              <VideoCard
                key={item.id}
                item={item}
                onRemove={handleRemove}
                onAddToPlaylist={setPlaylistTarget}
              />
            ))}
          </div>
        </section>
      )}

      {/* Recently watched (completed) */}
      {!loading && recentlyWatched.length > 0 && (
        <section aria-labelledby="recently-watched">
          <SectionHeader
            id="recently-watched"
            title="Recently watched"
            viewAllLink="/app/library?status=completed"
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {recentlyWatched.slice(0, 4).map((item) => (
              <VideoCard
                key={item.id}
                item={item}
                onRemove={handleRemove}
                onAddToPlaylist={setPlaylistTarget}
              />
            ))}
          </div>
        </section>
      )}

      {playlistTarget && (
        <AddToPlaylistModal
          item={playlistTarget}
          onClose={() => setPlaylistTarget(null)}
        />
      )}
    </div>
  )
}

function SectionHeader({ id, title, viewAllLink }) {
  return (
    <div className="mb-4 flex items-baseline justify-between">
      <h2 id={id} className="text-base font-semibold text-stone-900">
        {title}
      </h2>
      {viewAllLink && (
        <Link
          to={viewAllLink}
          className="text-sm font-medium text-stone-400 hover:text-emerald-700"
        >
          View all →
        </Link>
      )}
    </div>
  )
}
