import { Router } from 'express'
import Note from '../models/Note.js'
import { requireAuth } from '../middleware/auth.js'
import { httpError } from '../utils/errors.js'
import { extractVideoId } from '../utils/youtube.js'

const router = Router()

// Everything under /api/notes is private.
router.use(requireAuth)

/**
 * GET /api/notes?videoId=<id>
 * All of the user's notes for one video, oldest first (like a notebook).
 */
router.get('/', async (req, res) => {
  const videoId = extractVideoId(req.query.videoId)
  if (!videoId) {
    throw httpError(400, 'A video id is required.')
  }

  const notes = await Note.find({ user: req.user._id, videoId }).sort({
    createdAt: 1,
  })
  res.json({ notes })
})

/**
 * POST /api/notes  { videoId, text, timestampSec? }
 */
router.post('/', async (req, res) => {
  const { videoId, text, timestampSec } = req.body || {}

  const fields = {}
  const parsedVideoId = extractVideoId(videoId)
  if (!parsedVideoId) {
    fields.videoId = 'A valid video id is required.'
  }
  if (!text || !text.trim()) {
    fields.text = 'Write something first.'
  } else if (text.trim().length > 2000) {
    fields.text = 'Notes are limited to 2000 characters.'
  }
  if (timestampSec != null && (typeof timestampSec !== 'number' || timestampSec < 0)) {
    fields.timestampSec = 'timestampSec must be a non-negative number.'
  }
  if (Object.keys(fields).length > 0) {
    throw httpError(400, 'Please check the highlighted fields.', fields)
  }

  const note = await Note.create({
    user: req.user._id,
    videoId: parsedVideoId,
    text: text.trim(),
    timestampSec: typeof timestampSec === 'number' ? Math.round(timestampSec) : null,
  })

  res.status(201).json({ note })
})

/**
 * PATCH /api/notes/:id  { text, timestampSec? }
 */
router.patch('/:id', async (req, res) => {
  const note = await Note.findOne({ _id: req.params.id, user: req.user._id })
  if (!note) {
    throw httpError(404, 'Note not found.')
  }

  const { text, timestampSec } = req.body || {}

  if (text != null) {
    if (!text.trim()) {
      throw httpError(400, 'Write something first.', { text: 'A note cannot be empty.' })
    }
    if (text.trim().length > 2000) {
      throw httpError(400, 'Notes are limited to 2000 characters.', {
        text: 'Max 2000 characters.',
      })
    }
    note.text = text.trim()
  }

  if (timestampSec != null) {
    if (typeof timestampSec !== 'number' || timestampSec < 0) {
      throw httpError(400, 'timestampSec must be a non-negative number.', {
        timestampSec: 'Must be a non-negative number.',
      })
    }
    note.timestampSec = Math.round(timestampSec)
  }

  await note.save()
  res.json({ note })
})

/**
 * DELETE /api/notes/:id
 */
router.delete('/:id', async (req, res) => {
  const note = await Note.findOne({ _id: req.params.id, user: req.user._id })
  if (!note) {
    throw httpError(404, 'Note not found.')
  }

  await note.deleteOne()
  res.json({ message: 'Note deleted.' })
})

export default router
