import { Router } from 'express'
import Playlist from '../models/Playlist.js'
import LibraryItem from '../models/LibraryItem.js'
import { requireAuth } from '../middleware/auth.js'
import { rateLimit } from '../middleware/rateLimit.js'
import { httpError } from '../utils/errors.js'
import { extractPlaylistId, fetchYouTubePlaylist, isYouTubeApiConfigured, thumbnailFor } from '../utils/youtube.js'

const router = Router()

// Everything under /api/playlists is private.
router.use(requireAuth)

/** Shape used by the playlist list view (no heavy item data). */
function toPlaylistSummary(playlist) {
  const firstItem = playlist.items[0]?.libraryItem
  return {
    id: playlist._id.toString(),
    title: playlist.title,
    description: playlist.description,
    itemCount: playlist.items.length,
    completedCount: playlist.items.filter((i) => i.libraryItem?.completed).length,
    // First not-yet-completed video — powers "Continue playlist".
    next: nextVideoOf(playlist),
    cover: firstItem
      ? {
          videoId: firstItem.videoId,
          title: firstItem.title,
          thumbnailUrl: firstItem.thumbnailUrl,
        }
      : null,
    createdAt: playlist.createdAt,
    updatedAt: playlist.updatedAt,
  }
}

/** The first unwatched video of a (populated) playlist, or null. */
function nextVideoOf(playlist) {
  const entry = playlist.items.find((i) => i.libraryItem && !i.libraryItem.completed)
  return entry
    ? {
        videoId: entry.libraryItem.videoId,
        title: entry.libraryItem.title,
        thumbnailUrl: entry.libraryItem.thumbnailUrl,
      }
    : null
}

/** Shape used by the playlist detail view / watch-page sidebar. */
function toPlaylistDetail(playlist) {
  return {
    ...toPlaylistSummary(playlist),
    items: playlist.items
      .filter((i) => i.libraryItem) // skip any stale references
      .map((item) => ({
        id: item._id.toString(), // used to remove/reorder this entry
        addedAt: item.addedAt,
        video: {
          id: item.libraryItem._id.toString(), // library item id (for progress calls)
          videoId: item.libraryItem.videoId,
          title: item.libraryItem.title,
          channelName: item.libraryItem.channelName,
          thumbnailUrl: item.libraryItem.thumbnailUrl,
          completed: item.libraryItem.completed,
          lastPositionSec: item.libraryItem.lastPositionSec,
          durationSec: item.libraryItem.durationSec,
          progressPercent: item.libraryItem.progressPercent,
        },
      })),
  }
}

async function findOwnedPlaylist(id, userId) {
  const playlist = await Playlist.findOne({ _id: id, user: userId }).populate(
    'items.libraryItem',
  )
  if (!playlist) {
    throw httpError(404, 'Playlist not found.')
  }
  return playlist
}

/**
 * GET /api/playlists
 * The user's playlists with item counts and completion counts.
 */
router.get('/', async (req, res) => {
  const playlists = await Playlist.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate('items.libraryItem')

  res.json({ playlists: playlists.map(toPlaylistSummary) })
})

/**
 * POST /api/playlists  { title, description? }
 */
router.post('/', async (req, res) => {
  const { title, description } = req.body || {}

  const fields = {}
  if (!title || !title.trim()) {
    fields.title = 'Give your playlist a title.'
  } else if (title.trim().length > 100) {
    fields.title = 'Titles are limited to 100 characters.'
  }
  if (description && description.length > 300) {
    fields.description = 'Descriptions are limited to 300 characters.'
  }
  if (Object.keys(fields).length > 0) {
    throw httpError(400, 'Please check the highlighted fields.', fields)
  }

  const playlist = await Playlist.create({
    user: req.user._id,
    title: title.trim(),
    description: (description || '').trim(),
  })

  res.status(201).json({ playlist: toPlaylistSummary(playlist) })
})

/**
 * GET /api/playlists/:id
 * One playlist with its videos, for the detail page and the
 * watch-page sidebar.
 */
router.get('/:id', async (req, res) => {
  const playlist = await findOwnedPlaylist(req.params.id, req.user._id)
  res.json({ playlist: toPlaylistDetail(playlist) })
})

/**
 * PATCH /api/playlists/:id  { title, description? }
 */
router.patch('/:id', async (req, res) => {
  const playlist = await findOwnedPlaylist(req.params.id, req.user._id)

  const { title, description } = req.body || {}
  if (title != null) {
    if (!title.trim()) {
      throw httpError(400, 'Give your playlist a title.', { title: 'A title is required.' })
    }
    if (title.trim().length > 100) {
      throw httpError(400, 'Titles are limited to 100 characters.', {
        title: 'Max 100 characters.',
      })
    }
    playlist.title = title.trim()
  }
  if (description != null) {
    if (description.length > 300) {
      throw httpError(400, 'Descriptions are limited to 300 characters.', {
        description: 'Max 300 characters.',
      })
    }
    playlist.description = description.trim()
  }

  await playlist.save()
  await playlist.populate('items.libraryItem')

  res.json({ playlist: toPlaylistDetail(playlist) })
})

/**
 * DELETE /api/playlists/:id
 * Deleting a playlist never touches the library items themselves.
 */
router.delete('/:id', async (req, res) => {
  const playlist = await Playlist.findOne({
    _id: req.params.id,
    user: req.user._id,
  })
  if (!playlist) {
    throw httpError(404, 'Playlist not found.')
  }

  await playlist.deleteOne()
  res.json({ message: 'Playlist deleted.' })
})

/**
 * POST /api/playlists/:id/items  { libraryItemId }
 * Adds a saved video to the playlist. Videos must be in the library
 * first, because playlists reference library items.
 */
router.post('/:id/items', async (req, res) => {
  const playlist = await findOwnedPlaylist(req.params.id, req.user._id)

  const libraryItemId = req.body ? req.body.libraryItemId : null
  if (!libraryItemId) {
    throw httpError(400, 'Which video do you want to add?')
  }

  const libraryItem = await LibraryItem.findOne({
    _id: libraryItemId,
    user: req.user._id,
  })
  if (!libraryItem) {
    throw httpError(404, 'That video is not in your library.')
  }

  const alreadyInPlaylist = playlist.items.some(
    (item) => item.libraryItem._id.toString() === libraryItem._id.toString(),
  )
  if (alreadyInPlaylist) {
    return res.json({ playlist: toPlaylistDetail(playlist), alreadyInPlaylist: true })
  }

  playlist.items.push({ libraryItem: libraryItem._id })
  await playlist.save()
  await playlist.populate('items.libraryItem')

  res.status(201).json({ playlist: toPlaylistDetail(playlist), alreadyInPlaylist: false })
})

/**
 * PATCH /api/playlists/:id/items/order  { order: [entryId, …] }
 * Reorders the playlist. `order` must contain every current entry exactly
 * once (a permutation), which keeps the write atomic and unambiguous.
 */
router.patch('/:id/items/order', async (req, res) => {
  const playlist = await findOwnedPlaylist(req.params.id, req.user._id)

  const order = req.body ? req.body.order : null
  const currentIds = playlist.items.map((i) => i._id.toString())

  if (
    !Array.isArray(order) ||
    order.length !== currentIds.length ||
    new Set(order.map(String)).size !== order.length ||
    !order.every((id) => currentIds.includes(String(id)))
  ) {
    throw httpError(400, 'Order must list every video in the playlist exactly once.')
  }

  // Rebuild the entries in the new order, preserving each entry's own data.
  playlist.items = order.map((id) => {
    const entry = playlist.items.find((i) => i._id.toString() === String(id))
    return { libraryItem: entry.libraryItem._id ?? entry.libraryItem, addedAt: entry.addedAt }
  })

  await playlist.save()
  await playlist.populate('items.libraryItem')

  res.json({ playlist: toPlaylistDetail(playlist) })
})

/**
 * POST /api/playlists/import  { url, title? }
 * Imports a public YouTube playlist: every video is saved to the user's
 * library (dedup — already-saved videos are reused, not duplicated) and
 * collected into a new local playlist. Requires the YouTube Data API key.
 */
router.post('/import', requireAuth, rateLimit({ max: 5, windowMs: 60_000, message: 'Too many imports. Please wait a moment.' }), async (req, res) => {
  if (!isYouTubeApiConfigured()) {
    throw httpError(501, 'Playlist import is not configured on this server. Add YOUTUBE_API_KEY to server/.env (see docs/youtube-integration.md).')
  }

  const input = req.body ? req.body.url : null
  const playlistId = extractPlaylistId(typeof input === 'string' ? input : '')
  if (!playlistId) {
    throw httpError(400, 'That does not look like a YouTube playlist link (it needs a ?list=… part).')
  }

  const customTitle = req.body.title
  if (customTitle != null && (typeof customTitle !== 'string' || customTitle.trim().length > 100)) {
    throw httpError(400, 'Titles are limited to 100 characters.', {
      title: 'Max 100 characters.',
    })
  }

  const remote = await fetchYouTubePlaylist(playlistId)
  if (remote.videos.length === 0) {
    throw httpError(400, 'That playlist has no importable videos.')
  }

  // Save each video to the library (or reuse the existing entry).
  const libraryItems = []
  let alreadySaved = 0
  for (const video of remote.videos) {
    const existing = await LibraryItem.findOne({ user: req.user._id, videoId: video.videoId })
    if (existing) {
      // Keep metadata fresh from the Data API (e.g. a renamed title);
      // never touch the user's progress fields.
      if (video.title && video.title !== existing.title) existing.title = video.title
      if (video.channelName && video.channelName !== existing.channelName) existing.channelName = video.channelName
      if (video.durationSec > 0 && existing.durationSec === 0) existing.durationSec = video.durationSec
      if (existing.isModified()) await existing.save()
      libraryItems.push(existing)
      alreadySaved += 1
    } else {
      libraryItems.push(
        await LibraryItem.create({
          user: req.user._id,
          videoId: video.videoId,
          title: video.title,
          channelName: video.channelName,
          thumbnailUrl: video.thumbnailUrl || thumbnailFor(video.videoId),
          durationSec: video.durationSec || 0,
        }),
      )
    }
  }

  const playlist = await Playlist.create({
    user: req.user._id,
    title: (customTitle && customTitle.trim()) || remote.title,
    description: remote.channelName
      ? `Imported from ${remote.channelName}'s YouTube playlist.`
      : 'Imported from a YouTube playlist.',
    items: libraryItems.map((item) => ({ libraryItem: item._id })),
  })
  await playlist.populate('items.libraryItem')

  res.status(201).json({
    playlist: toPlaylistDetail(playlist),
    imported: libraryItems.length - alreadySaved,
    alreadySaved,
    truncated: remote.truncated,
  })
})

/**
 * DELETE /api/playlists/:id/items/:itemId
 * Removes one video from the playlist (:itemId is the entry id from
 * the playlist detail response).
 */
router.delete('/:id/items/:itemId', async (req, res) => {
  const playlist = await findOwnedPlaylist(req.params.id, req.user._id)

  const entry = playlist.items.id(req.params.itemId)
  if (!entry) {
    throw httpError(404, 'That video is not in this playlist.')
  }

  playlist.items.pull(req.params.itemId)
  await playlist.save()
  await playlist.populate('items.libraryItem')

  res.json({ playlist: toPlaylistDetail(playlist) })
})

export default router
