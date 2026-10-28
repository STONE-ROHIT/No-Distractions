import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BookOpen, Bookmark, Search as SearchIcon } from 'lucide-react'
import { api } from '../lib/api.js'
import VideoCard from '../components/VideoCard.jsx'
import AddToPlaylistModal from '../components/AddToPlaylistModal.jsx'
import UrlInputForm from '../components/UrlInputForm.jsx'
import { EmptyState, ErrorState, SkeletonCard } from '../components/common.jsx'

// Filters supported by the status tabs. `bookmarked` joins against the
// user's bookmarks (fetched once, same request budget as before: 2 calls).
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'progress', label: 'In progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'unwatched', label: 'Not started' },
  { key: 'bookmarked', label: 'Bookmarked' },
]

const SORTS = [
  { key: 'recently-watched', label: 'Recently watched' },
  { key: 'recently-added', label: 'Recently added' },
  { key: 'title', label: 'Title A–Z' },
]

const PAGE_SIZE = 12

/**
 * The user's saved videos: filter tabs, text search, sorting, and a
 * progressive "show more". All client-side — a personal library is small
 * enough that one fetch beats a request per filter change, and the tabs
 * can always show live counts. (The server offers the same parameters on
 * GET /api/library for API consumers.)
 */
export default function Library() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState(null)
  const [bookmarkedIds, setBookmarkedIds] = useState(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [playlistTarget, setPlaylistTarget] = useState(null)

  // Filter/sort state is mirrored into the URL (?status=&sort=) so the
  // dashboard's "View all" links land on the right view.
  const filter = searchParams.get('status') || 'all'
  const sort = searchParams.get('sort') || 'recently-watched'

  function setParam(key, value) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (!value || value === 'all' || (key === 'sort' && value === 'recently-watched')) {
          next.delete(key)
        } else {
          next.set(key, value)
        }
        return next
      },
      { replace: true },
    )
  }

  function load() {
    setError('')
    Promise.all([api('/library'), api('/bookmarks')])
      .then(([libraryData, bookmarkData]) => {
        setItems(libraryData.items)
        setBookmarkedIds(new Set(bookmarkData.bookmarks.map((b) => b.videoId)))
      })
      .catch((err) => setError(err.message))
  }

  useEffect(load, [])

  async function handleRemove(item) {
    // Optimistic remove; reload to correct if the server disagrees.
    setItems((current) => (current || []).filter((i) => i.id !== item.id))
    try {
      await api(`/library/${item.id}`, { method: 'DELETE' })
    } catch {
      load()
    }
  }

  const counts = useMemo(() => {
    if (!items || !bookmarkedIds) return null
    return {
      all: items.length,
      progress: items.filter((i) => !i.completed && i.lastPositionSec > 0).length,
      completed: items.filter((i) => i.completed).length,
      unwatched: items.filter((i) => !i.completed && !i.lastPositionSec).length,
      bookmarked: items.filter((i) => bookmarkedIds.has(i.videoId)).length,
    }
  }, [items, bookmarkedIds])

  const filtered = useMemo(() => {
    if (!items) return []
    let list = items.filter((item) => {
      if (filter === 'progress') return !item.completed && item.lastPositionSec > 0
      if (filter === 'completed') return item.completed
      if (filter === 'unwatched') return !item.completed && !item.lastPositionSec
      if (filter === 'bookmarked') return bookmarkedIds?.has(item.videoId)
      return true
    })

    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (item) =>
          item.title?.toLowerCase().includes(q) ||
          item.channelName?.toLowerCase().includes(q),
      )
    }

    if (sort === 'recently-added') {
      list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    } else if (sort === 'title') {
      list = [...list].sort((a, b) =>
        (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' }),
      )
    }
    // Default: items already arrive sorted by "recently watched".
    return list
  }, [items, bookmarkedIds, filter, sort, query])

  // Reset pagination whenever the view changes.
  useEffect(() => {
    setVisible(PAGE_SIZE)
  }, [filter, sort, query])

  if (error) {
    return <ErrorState message={error} onRetry={load} />
  }

  if (!items || !bookmarkedIds) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  const shown = filtered.slice(0, visible)

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-stone-900">Your library</h1>
          <p className="mt-1 text-sm text-stone-500">
            {items.length === 0
              ? 'Saved videos live here.'
              : `${items.length} saved ${items.length === 1 ? 'video' : 'videos'}${
                  counts.completed > 0 ? ` · ${counts.completed} completed` : ''
                }`}
          </p>
        </div>

        {items.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <label htmlFor="library-search" className="sr-only">
                Search your library
              </label>
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
              <input
                id="library-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title or channel…"
                className="w-44 rounded-lg border border-stone-300 bg-white py-2 pl-8.5 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none sm:w-56"
              />
            </div>
            {/* Sort */}
            <label htmlFor="library-sort" className="sr-only">
              Sort videos
            </label>
            <select
              id="library-sort"
              value={sort}
              onChange={(e) => setParam('sort', e.target.value)}
              className="rounded-lg border border-stone-300 bg-white py-2 pl-3 pr-8 text-sm text-stone-700 focus:border-emerald-500 focus:outline-none"
            >
              {SORTS.map(({ key, label }) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="space-y-6">
          <EmptyState
            icon={BookOpen}
            title="Your library is empty"
            hint="Paste a YouTube link to start watching. Saving a video keeps it here — with your progress and notes."
          />
          <div className="mx-auto max-w-xl">
            <UrlInputForm />
          </div>
        </div>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter videos">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setParam('status', key)}
                aria-pressed={filter === key}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  filter === key
                    ? 'bg-stone-900 text-white'
                    : 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                }`}
              >
                {key === 'bookmarked' && <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />}
                {label}
                <span className={`text-xs ${filter === key ? 'text-stone-400' : 'text-stone-400'}`}>
                  {counts[key]}
                </span>
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={query.trim() ? SearchIcon : BookOpen}
              title={query.trim() ? 'No matches' : 'Nothing here yet'}
              hint={
                query.trim()
                  ? `Nothing matches “${query.trim()}”. Try different words, or clear the search.`
                  : filter === 'progress'
                    ? 'Videos you start watching will appear here.'
                    : filter === 'completed'
                      ? 'Finish a video and it will show up here.'
                      : filter === 'bookmarked'
                        ? 'Mark a moment while watching and the video will appear here.'
                        : 'Saved but unwatched videos will appear here.'
              }
            />
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {shown.map((item) => (
                  <VideoCard
                    key={item.id}
                    item={item}
                    onRemove={handleRemove}
                    onAddToPlaylist={setPlaylistTarget}
                  />
                ))}
              </div>
              {visible < filtered.length && (
                <div className="mt-8 text-center">
                  <button
                    onClick={() => setVisible((v) => v + PAGE_SIZE)}
                    className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
                  >
                    Show {Math.min(PAGE_SIZE, filtered.length - visible)} more
                    <span className="text-stone-400">
                      ({visible}/{filtered.length})
                    </span>
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {playlistTarget && (
        <AddToPlaylistModal item={playlistTarget} onClose={() => setPlaylistTarget(null)} />
      )}
    </div>
  )
}
