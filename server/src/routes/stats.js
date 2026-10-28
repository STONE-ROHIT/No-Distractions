import { Router } from 'express'
import LibraryItem from '../models/LibraryItem.js'
import Playlist from '../models/Playlist.js'
import Note from '../models/Note.js'
import Bookmark from '../models/Bookmark.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

/**
 * GET /api/stats
 *
 * Learning statistics computed from existing documents — no separate
 * "stats" collection, so the numbers can never drift from the source
 * data. A user's library/playlists are small, so we fetch and fold them
 * in plain JavaScript instead of an aggregation pipeline.
 *
 * Honesty rules (mirrored in the UI):
 *  - "Estimated learning time" is POSITION-BASED: for completed videos we
 *    count the full duration, otherwise the last position. It is an
 *    approximation of how much of the content you have been through, not
 *    measured watch time.
 *  - Daily activity counts videos whose LAST watch fell on that day, so a
 *    video watched across several days counts once, on the latest day.
 */
router.get('/', requireAuth, async (req, res) => {
  const [items, playlists, noteCount, bookmarkCount] = await Promise.all([
    LibraryItem.find({ user: req.user._id }),
    Playlist.find({ user: req.user._id }).populate('items.libraryItem'),
    Note.countDocuments({ user: req.user._id }),
    Bookmark.countDocuments({ user: req.user._id }),
  ])

  // ---- videos ------------------------------------------------------------
  let completed = 0
  let inProgress = 0
  let watchedSec = 0 // position-based estimate (see header comment)
  let remainingSec = 0

  for (const item of items) {
    if (item.completed) {
      completed += 1
      // Prefer the learned duration; fall back to the last position.
      watchedSec += item.durationSec || item.lastPositionSec || 0
    } else if (item.lastPositionSec > 0) {
      inProgress += 1
      watchedSec += item.lastPositionSec
      if (item.durationSec > 0) {
        remainingSec += Math.max(item.durationSec - item.lastPositionSec, 0)
      }
    }
  }

  // ---- playlists ---------------------------------------------------------
  let playlistsCompleted = 0
  const unfinishedPlaylists = []

  for (const playlist of playlists) {
    const entries = playlist.items.filter((i) => i.libraryItem)
    if (entries.length === 0) continue
    const done = entries.filter((i) => i.libraryItem.completed).length
    if (done === entries.length) {
      playlistsCompleted += 1
    } else {
      const next = entries.find((i) => !i.libraryItem.completed).libraryItem
      unfinishedPlaylists.push({
        id: playlist._id.toString(),
        title: playlist.title,
        completedCount: done,
        itemCount: entries.length,
        percent: Math.round((done / entries.length) * 100),
        next: {
          videoId: next.videoId,
          title: next.title,
          thumbnailUrl: next.thumbnailUrl,
        },
      })
    }
  }
  // Most-finished first — the ones closest to completion invite finishing.
  unfinishedPlaylists.sort((a, b) => b.percent - a.percent)

  // ---- daily activity (last 7 days, local to the server's clock) ---------
  const days = []
  for (let offset = 6; offset >= 0; offset -= 1) {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - offset)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    const count = items.filter(
      (item) => item.lastWatchedAt && item.lastWatchedAt >= start && item.lastWatchedAt < end,
    ).length
    days.push({
      date: start.toISOString().slice(0, 10),
      count,
    })
  }

  // ---- streak (consecutive days with activity, ending today or yesterday) -
  let streakDays = 0
  const hasActivity = (offset) => days[days.length - 1 - offset]?.count > 0
  if (hasActivity(0) || hasActivity(1)) {
    let offset = hasActivity(0) ? 0 : 1
    while (offset < days.length && hasActivity(offset)) {
      streakDays += 1
      offset += 1
    }
  }

  res.json({
    videos: {
      saved: items.length,
      completed,
      inProgress,
    },
    playlists: {
      total: playlists.length,
      completed: playlistsCompleted,
    },
    notes: noteCount,
    bookmarks: bookmarkCount,
    estimatedMinutes: Math.round(watchedSec / 60),
    remainingMinutes: Math.round(remainingSec / 60),
    activity: days,
    streakDays,
    unfinishedPlaylists: unfinishedPlaylists.slice(0, 4),
  })
})

export default router
