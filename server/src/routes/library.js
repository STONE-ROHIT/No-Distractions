import { Router } from 'express'
import LibraryItem from '../models/LibraryItem.js'
import Playlist from '../models/Playlist.js'
import { requireAuth } from '../middleware/auth.js'
import { httpError } from '../utils/errors.js'
import { extractVideoId, fetchVideoMetadata, thumbnailFor } from '../utils/youtube.js'

const router = Router()

// Everything under /api/library is private.
router.use(requireAuth)

/** Escape user input before building a RegExp for text search. */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const STATUS_FILTERS = new Set(['in-progress', 'completed', 'unwatched'])
const SORTS = new Set(['recently-watched', 'recently-added', 'title'])

/**
 * GET /api/library
 *
 * Query params (all optional):
 *  - videoId: return just this user's item for that video -> { item }
 *    (single lookup for the watch page; item is null when not saved)
 *  - q:       case-insensitive search in title + channel name
 *  - status:  "in-progress" | "completed" | "unwatched"
 *  - sort:    "recently-watched" (default) | "recently-added" | "title"
 *  - page/limit: paginate when `limit` is given (1-based page, limit <= 100).
 *    Without `limit`, every matching item is returned (dashboard-sized sets).
 */
router.get('/', async (req, res) => {
  const { videoId, q, status, sort, page, limit } = req.query

  // Single-video lookup used by the watch page.
  if (videoId) {
    if (!/^[A-Za-z0-9_-]{11}$/.test(String(videoId))) {
      throw httpError(400, 'Invalid video id.')
    }
    const item = await LibraryItem.findOne({ user: req.user._id, videoId: String(videoId) })
    return res.json({ item: item || null })
  }

  const filter = { user: req.user._id }

  if (typeof q === 'string' && q.trim()) {
    const rx = new RegExp(escapeRegex(q.trim()), 'i')
    filter.$or = [{ title: rx }, { channelName: rx }]
  }

  if (status === 'in-progress') {
    filter.completed = false
    filter.lastPositionSec = { $gt: 0 }
  } else if (status === 'completed') {
    filter.completed = true
  } else if (status === 'unwatched') {
    filter.completed = false
    filter.lastPositionSec = { $lte: 0 }
  } else if (status && !STATUS_FILTERS.has(status)) {
    throw httpError(400, 'Unknown status filter.')
  }

  const sortKey = SORTS.has(sort) ? sort : 'recently-watched'
  const sortSpec =
    sortKey === 'recently-added'
      ? { createdAt: -1 }
      : sortKey === 'title'
        ? { title: 1 }
        : { lastWatchedAt: -1, createdAt: -1 }

  // Paginated mode (used by the library page once it grows).
  if (limit != null) {
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 100)
    const pageNo = Math.max(parseInt(page, 10) || 1, 1)
    const [items, total] = await Promise.all([
      LibraryItem.find(filter)
        .sort(sortSpec)
        .skip((pageNo - 1) * pageSize)
        .limit(pageSize),
      LibraryItem.countDocuments(filter),
    ])
    return res.json({
      items,
      total,
      page: pageNo,
      hasMore: pageNo * pageSize < total,
    })
  }

  const items = await LibraryItem.find(filter).sort(sortSpec)
  res.json({ items })
})

/**
 * POST /api/library  { videoId, durationSec? }  (a full YouTube URL also works)
 * Saves a video. The server re-validates the id and fetches the video's
 * metadata from YouTube's oEmbed endpoint, so the client cannot inject
 * arbitrary titles. `durationSec` may be supplied when it is already known
 * (e.g. from a Data API search result) — oEmbed never provides durations,
 * and the player learns them later otherwise. It is clamped to sane bounds.
 */
router.post('/', async (req, res) => {
  const input = req.body ? req.body.videoId : null
  const videoId = extractVideoId(input)
  const rawDuration = req.body ? req.body.durationSec : null

  if (!videoId) {
    throw httpError(400, 'A valid YouTube video link is required.')
  }
  if (
    rawDuration != null &&
    (typeof rawDuration !== 'number' || rawDuration < 0 || rawDuration > 48 * 3600)
  ) {
    throw httpError(400, 'durationSec must be seconds between 0 and 48 hours.')
  }

  // Saving the same video twice just returns the existing entry.
  const existing = await LibraryItem.findOne({ user: req.user._id, videoId })
  if (existing) {
    // Backfill a known duration onto an item that never learned one.
    if (typeof rawDuration === 'number' && rawDuration > 0 && existing.durationSec === 0) {
      existing.durationSec = Math.round(rawDuration)
      await existing.save()
    }
    return res.json({ item: existing, alreadySaved: true })
  }

  let metadata
  let fetchFailed = false
  try {
    metadata = await fetchVideoMetadata(videoId)
  } catch (err) {
    // Network problem: still allow saving, with fallback metadata.
    console.error('[library] Metadata fetch failed:', err.message)
    fetchFailed = true
  }

  // oEmbed told us the video does not exist / cannot be watched.
  if (!metadata && !fetchFailed) {
    throw httpError(404, 'This video is unavailable, private, or does not exist.')
  }

  const item = await LibraryItem.create({
    user: req.user._id,
    videoId,
    title: metadata?.title || '',
    channelName: metadata?.channelName || '',
    thumbnailUrl: metadata?.thumbnailUrl || thumbnailFor(videoId),
    // Durations are unknown to oEmbed; use a Data API value if provided.
    durationSec:
      typeof rawDuration === 'number' && rawDuration > 0 ? Math.round(rawDuration) : 0,
  })

  res.status(201).json({ item, alreadySaved: false })
})

/**
 * PATCH /api/library/:itemId/progress  { positionSec, durationSec, completed?, savedAt? }
 * Called by the player while watching. Also auto-marks videos as completed
 * when the position reaches ~95% of the duration.
 *
 * Conflict policy (documented in docs/progress-sync.md): every write may
 * carry `savedAt` (client clock, ms). A write that is NOT newer than the
 * stored `progressSavedAt` is treated as a duplicate/stale replay and is
 * ignored — which makes retries and offline queue replays idempotent.
 * Requests without `savedAt` always apply (legacy/live path).
 */
router.patch('/:itemId/progress', async (req, res) => {
  const { positionSec, durationSec, completed, savedAt } = req.body || {}

  const fields = {}
  if (positionSec != null && (typeof positionSec !== 'number' || positionSec < 0)) {
    fields.positionSec = 'positionSec must be a non-negative number.'
  }
  if (durationSec != null && (typeof durationSec !== 'number' || durationSec < 0)) {
    fields.durationSec = 'durationSec must be a non-negative number.'
  }
  if (completed != null && typeof completed !== 'boolean') {
    fields.completed = 'completed must be true or false.'
  }
  if (savedAt != null && (typeof savedAt !== 'number' || !Number.isFinite(savedAt) || savedAt <= 0)) {
    fields.savedAt = 'savedAt must be a positive millisecond timestamp.'
  }
  if (positionSec == null && durationSec == null && completed == null) {
    fields.positionSec = 'Nothing to update.'
  }
  if (Object.keys(fields).length > 0) {
    throw httpError(400, 'Please check the progress payload.', fields)
  }

  const item = await LibraryItem.findOne({
    _id: req.params.itemId,
    user: req.user._id,
  })
  if (!item) {
    throw httpError(404, 'Video not found in your library.')
  }

  // Duplicate/stale replay: keep the stored state, tell the caller.
  if (typeof savedAt === 'number' && savedAt <= (item.progressSavedAt || 0)) {
    return res.json({ item, stale: true })
  }

  if (typeof positionSec === 'number') {
    item.lastPositionSec = Math.round(positionSec)
  }
  if (typeof durationSec === 'number' && durationSec > 0) {
    item.durationSec = Math.round(durationSec)
  }

  if (typeof completed === 'boolean') {
    item.completed = completed
  } else if (!item.completed && item.durationSec > 0 && item.lastPositionSec > 0) {
    // Mark finished when the user has watched ~95% of the video.
    item.completed = item.lastPositionSec >= item.durationSec * 0.95
  }

  item.lastWatchedAt = new Date()
  if (typeof savedAt === 'number') {
    item.progressSavedAt = savedAt
  }
  await item.save()

  res.json({ item })
})

/**
 * DELETE /api/library/:itemId
 * Removes the video from the library, and pulls it out of any playlists
 * that reference it (otherwise those references would dangle).
 * Notes are intentionally kept: they are tied to the video itself and
 * will reappear if the user saves the video again.
 */
router.delete('/:itemId', async (req, res) => {
  const item = await LibraryItem.findOne({
    _id: req.params.itemId,
    user: req.user._id,
  })
  if (!item) {
    throw httpError(404, 'Video not found in your library.')
  }

  await Playlist.updateMany(
    { user: req.user._id },
    { $pull: { items: { libraryItem: item._id } } },
  )

  await item.deleteOne()

  res.json({ message: 'Removed from your library.' })
})

export default router
