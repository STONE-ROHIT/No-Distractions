import { Router } from 'express'
import Bookmark from '../models/Bookmark.js'
import { requireAuth } from '../middleware/auth.js'
import { httpError } from '../utils/errors.js'

const router = Router()

// Everything under /api/bookmarks is private.
router.use(requireAuth)

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/

/**
 * GET /api/bookmarks?videoId=…
 * Bookmarks for one video (newest position last — nicer to scan than
 * creation order). Without a videoId, all of the user's bookmarks come
 * back (used by the library's "Bookmarked" filter).
 */
router.get('/', async (req, res) => {
  const videoId = req.query.videoId

  if (videoId != null && !VIDEO_ID_RE.test(String(videoId))) {
    throw httpError(400, 'A valid videoId is required.')
  }

  const filter = { user: req.user._id }
  // One video: chronological through the video. All: most recent first.
  const sort = videoId ? { positionSec: 1, createdAt: 1 } : { createdAt: -1 }
  if (videoId) {
    filter.videoId = String(videoId)
  }

  const bookmarks = await Bookmark.find(filter).sort(sort)
  res.json({ bookmarks })
})

/**
 * POST /api/bookmarks  { videoId, positionSec, label? }
 */
router.post('/', async (req, res) => {
  const { videoId, positionSec, label } = req.body || {}

  const fields = {}
  if (!videoId || !VIDEO_ID_RE.test(String(videoId))) {
    fields.videoId = 'A valid videoId is required.'
  }
  if (typeof positionSec !== 'number' || positionSec < 0) {
    fields.positionSec = 'positionSec must be a non-negative number.'
  }
  if (label != null && String(label).length > 120) {
    fields.label = 'Labels are limited to 120 characters.'
  }
  if (Object.keys(fields).length > 0) {
    throw httpError(400, 'Please check the bookmark payload.', fields)
  }

  // Skip obvious duplicates (same video, same rounded second).
  const rounded = Math.round(positionSec)
  const duplicate = await Bookmark.findOne({
    user: req.user._id,
    videoId: String(videoId),
    positionSec: rounded,
  })
  if (duplicate) {
    return res.status(201).json({ bookmark: duplicate, alreadySaved: true })
  }

  const bookmark = await Bookmark.create({
    user: req.user._id,
    videoId: String(videoId),
    positionSec: rounded,
    label: typeof label === 'string' ? label.trim() : '',
  })

  res.status(201).json({ bookmark, alreadySaved: false })
})

/**
 * PATCH /api/bookmarks/:id  { label?, positionSec? }
 * Editing a bookmark's label (or nudging its position) keeps it the same
 * bookmark — no delete/recreate churn.
 */
router.patch('/:id', async (req, res) => {
  const bookmark = await Bookmark.findOne({ _id: req.params.id, user: req.user._id })
  if (!bookmark) {
    throw httpError(404, 'Bookmark not found.')
  }

  const { label, positionSec } = req.body || {}
  if (label != null) {
    if (typeof label !== 'string' || label.trim().length > 120) {
      throw httpError(400, 'Labels are limited to 120 characters.', {
        label: 'Max 120 characters.',
      })
    }
    bookmark.label = label.trim()
  }
  if (positionSec != null) {
    if (typeof positionSec !== 'number' || positionSec < 0) {
      throw httpError(400, 'positionSec must be a non-negative number.')
    }
    bookmark.positionSec = Math.round(positionSec)
  }

  await bookmark.save()
  res.json({ bookmark })
})

/**
 * DELETE /api/bookmarks/:id
 */
router.delete('/:id', async (req, res) => {
  const result = await Bookmark.deleteOne({ _id: req.params.id, user: req.user._id })
  if (result.deletedCount === 0) {
    throw httpError(404, 'Bookmark not found.')
  }
  res.json({ message: 'Bookmark deleted.' })
})

export default router
