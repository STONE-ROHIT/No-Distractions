/**
 * Client-side YouTube URL parsing.
 *
 * This mirrors the server's validation (server/src/utils/youtube.js) so the
 * UI can give instant feedback. The server always re-validates — the client
 * check is only for convenience, never for security.
 */

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
])

/** Returns the 11-character video id, or null for unsupported input. */
export function extractVideoId(input) {
  if (typeof input !== 'string') return null
  const raw = input.trim()
  if (!raw) return null

  if (VIDEO_ID_RE.test(raw)) return raw

  const urlStr = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  let url
  try {
    url = new URL(urlStr)
  } catch {
    return null
  }

  if (!YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return null

  if (url.hostname.toLowerCase() === 'youtu.be') {
    const id = url.pathname.split('/')[1] || ''
    return VIDEO_ID_RE.test(id) ? id : null
  }

  const pathMatch = url.pathname.match(/^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})/)
  if (pathMatch) return pathMatch[1]

  const v = url.searchParams.get('v')
  if (v && VIDEO_ID_RE.test(v)) return v

  return null
}

/** Extract a playlist id from a YouTube playlist URL (or bare id). */
export function extractPlaylistId(input) {
  if (typeof input !== 'string') return null
  const raw = input.trim()
  if (!raw) return null

  if (/^[A-Za-z0-9_-]{12,}$/.test(raw)) return raw

  const urlStr = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  let url
  try {
    url = new URL(urlStr)
  } catch {
    return null
  }
  if (!YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return null

  const list = url.searchParams.get('list')
  if (list && /^[A-Za-z0-9_-]{12,}$/.test(list)) return list
  return null
}

/** Thumbnail URL for a video id (documented, stable YouTube pattern). */
export function thumbnailFor(videoId) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}
