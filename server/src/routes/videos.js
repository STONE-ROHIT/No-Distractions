import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { rateLimit } from '../middleware/rateLimit.js'
import { httpError } from '../utils/errors.js'
import {
  extractVideoId,
  extractPlaylistId,
  fetchVideoMetadata,
  fetchYouTubePlaylist,
  searchYouTubeVideos,
  isYouTubeApiConfigured,
  thumbnailFor,
} from '../utils/youtube.js'

const router = Router()

// Data API calls consume a shared daily quota and are rate-limited to keep
// a runaway client from burning through it (see docs/youtube-integration.md).
const dataApiRateLimit = rateLimit({
  max: 10,
  windowMs: 60_000,
  message: 'Too many YouTube requests. Please wait a moment.',
})

/**
 * GET /api/videos/metadata?url=<youtube url or video id>
 *
 * Validates the input, then asks YouTube's public oEmbed endpoint for the
 * video's title, channel, and thumbnail. Used by the watch page before a
 * video is saved to the library.
 */
router.get('/metadata', requireAuth, async (req, res) => {
  const input = req.query.url
  const videoId = extractVideoId(typeof input === 'string' ? input : '')

  if (!videoId) {
    throw httpError(400, 'That does not look like a YouTube video link.')
  }

  let metadata
  try {
    metadata = await fetchVideoMetadata(videoId)
  } catch (err) {
    // YouTube (or the network) unreachable: return minimal data so the
    // page still works, but flag it so the UI can explain.
    console.error('[videos] oEmbed fetch failed:', err.message)
    metadata = {
      videoId,
      title: '',
      channelName: '',
      thumbnailUrl: thumbnailFor(videoId),
      metadataUnavailable: true,
    }
  }

  if (!metadata) {
    throw httpError(404, 'This video is unavailable, private, or does not exist.')
  }

  res.json(metadata)
})

/**
 * GET /api/videos/search?q=<query>
 *
 * YouTube Data API v3 search (needs YOUTUBE_API_KEY). Without a key it
 * responds 501 with `configured: false` so the UI can explain instead of
 * showing a generic failure — the keyless link-pasting flow is unaffected.
 */
router.get('/search', requireAuth, dataApiRateLimit, async (req, res) => {
  if (!isYouTubeApiConfigured()) {
    return res.status(501).json({
      configured: false,
      message:
        'Search is not configured on this server. Add YOUTUBE_API_KEY to server/.env (see docs/youtube-integration.md). Pasting links still works.',
    })
  }

  const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  if (q.length < 2 || q.length > 100) {
    throw httpError(400, 'Enter a search term (2-100 characters).')
  }

  const results = await searchYouTubeVideos(q)
  res.json({ results, configured: true })
})

/**
 * GET /api/videos/playlist?url=<playlist url or id>
 *
 * Preview of a public YouTube playlist (title + up to 50 videos with
 * durations) before the user commits to importing it. Also needs the
 * Data API key.
 */
router.get('/playlist', requireAuth, dataApiRateLimit, async (req, res) => {
  if (!isYouTubeApiConfigured()) {
    return res.status(501).json({
      configured: false,
      message:
        'Playlist import is not configured on this server. Add YOUTUBE_API_KEY to server/.env (see docs/youtube-integration.md).',
    })
  }

  const input = req.query.url
  const playlistId = extractPlaylistId(typeof input === 'string' ? input : '')
  if (!playlistId) {
    throw httpError(400, 'That does not look like a YouTube playlist link (it needs a ?list=… part).')
  }

  const playlist = await fetchYouTubePlaylist(playlistId)
  res.json({ playlist, configured: true })
})

export default router
