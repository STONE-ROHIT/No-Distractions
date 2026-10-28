import { useState } from 'react'
import { Bookmark, ListVideo, NotebookPen } from 'lucide-react'
import NotesSection from './NotesSection.jsx'
import BookmarksSection from './BookmarksSection.jsx'
import PlaylistPanel from './PlaylistPanel.jsx'

/**
 * Tabbed side panel next to the video: Notes, Bookmarks, and — when
 * watching inside a playlist — the playlist itself.
 *
 * Desktop: right-hand column. Mobile: renders below the video; the video
 * stays prominent and everything stays one tap away without horizontal
 * scrolling.
 */
export default function WatchSidebar({
  // Which tab is selected first ("playlist" when the URL carries ?list=…).
  defaultTab = 'notes',
  // Playlist context (null when watching standalone).
  playlist,
  currentVideoId,
  // Notes.
  notes,
  setNotes,
  // Bookmarks.
  bookmarks,
  onAddBookmark,
  onUpdateBookmark,
  onDeleteBookmark,
  bookmarkBusy,
  // Player bridge (timestamps + seeking).
  getPlayerTime,
  onSeekTo,
}) {
  const [tab, setTab] = useState(defaultTab)

  const tabs = [
    {
      key: 'notes',
      label: 'Notes',
      icon: NotebookPen,
      count: notes.length,
    },
    {
      key: 'bookmarks',
      label: 'Bookmarks',
      icon: Bookmark,
      count: bookmarks.length,
    },
    ...(playlist
      ? [
          {
            key: 'playlist',
            label: 'Playlist',
            icon: ListVideo,
            count: playlist.itemCount,
          },
        ]
      : []),
  ]

  return (
    <div className="flex h-full min-w-0 flex-col gap-3">
      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Video tools"
        className="flex gap-1 rounded-xl border border-stone-200 bg-white p-1"
      >
        {tabs.map(({ key, label, icon: Icon, count }) => {
          const active = tab === key
          return (
            <button
              key={key}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(key)}
              className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-500 hover:bg-stone-100 hover:text-stone-700'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{label}</span>
              {count > 0 && (
                <span
                  className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    active ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Active tab content */}
      <div className="min-h-0">
        {tab === 'notes' ? (
          <NotesSection
            videoId={currentVideoId}
            notes={notes}
            setNotes={setNotes}
            getPlayerTime={getPlayerTime}
            onSeekTo={onSeekTo}
          />
        ) : tab === 'bookmarks' ? (
          <BookmarksSection
            bookmarks={bookmarks}
            onAdd={onAddBookmark}
            onUpdate={onUpdateBookmark}
            onDelete={onDeleteBookmark}
            onSeekTo={onSeekTo}
            getPlayerTime={getPlayerTime}
            busy={bookmarkBusy}
          />
        ) : (
          <PlaylistPanel playlist={playlist} currentVideoId={currentVideoId} />
        )}
      </div>
    </div>
  )
}
