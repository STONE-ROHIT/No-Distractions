/**
 * YouTube helpers: URL parsing and metadata via the official oEmbed API.
 *
 * Compliance notes:
 *  - We only use publicly documented interfaces (oEmbed endpoint, standard
 *    thumbnail URLs, the official IFrame Player API).
 *  - We do not scrape private APIs, download videos, or try to modify the
 *    player's behavior beyond documented player parameters.
 */

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
])

/**
 * Extract a YouTube video id from user input.
 * Accepts full URLs (watch, youtu.be, shorts, embed, live) or a bare id.
 * Returns the 11-character id, or null when the input is not supported.
 */
export function extractVideoId(input) {
  if (typeof input !== 'string') return null
  const raw = input.trim()
  if (!raw) return null

  // A bare video id.
  if (VIDEO_ID_RE.test(raw)) return raw

  // Tolerate a missing scheme ("youtu.be/x" without https://).
  const urlStr = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`

  let url
  try {
    url = new URL(urlStr)
  } catch {
    return null
  }

  if (!YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return null

  // Short links: youtu.be/<id>
  if (url.hostname.toLowerCase() === 'youtu.be') {
    const id = url.pathname.split('/')[1] || ''
    return VIDEO_ID_RE.test(id) ? id : null
  }

  // Path-based forms: /shorts/<id>, /embed/<id>, /live/<id>
  const pathMatch = url.pathname.match(/^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})/)
  if (pathMatch) return pathMatch[1]

  // Standard form: /watch?v=<id>
  const v = url.searchParams.get('v')
  if (v && VIDEO_ID_RE.test(v)) return v

  return null
}

/**
 * Fetch video metadata through YouTube's public oEmbed endpoint
 * (no API key required). Returns null when the video does not exist,
 * is private, or is otherwise unavailable.
 */
export async function fetchVideoMetadata(videoId) {
  const oembedUrl =
    'https://www.youtube.com/oembed?format=json&url=' +
    encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try {
    const res = await fetch(oembedUrl, { signal: controller.signal })

    // 400/401/403/404 all mean "we cannot show this video"
    // (nonexistent, private, or embedding disabled).
    if ([400, 401, 403, 404].includes(res.status)) {
      return null
    }
    if (!res.ok) {
      throw new Error(`oEmbed responded with status ${res.status}`)
    }

    const data = await res.json()
    return {
      videoId,
      title: typeof data.title === 'string' ? data.title : '',
      channelName: typeof data.author_name === 'string' ? data.author_name : '',
      thumbnailUrl:
        typeof data.thumbnail_url === 'string' && data.thumbnail_url
          ? data.thumbnail_url
          : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    }
  } finally {
    clearTimeout(timeout)
  }
}

/** Thumbnail URL derived from the video id (documented, stable pattern). */
export function thumbnailFor(videoId) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}

// ---------------------------------------------------------------------------
// YouTube Data API v3 (optional — enabled by setting YOUTUBE_API_KEY).
//
// Used for search and playlist import. The app works fully without it:
// pasting video links uses the keyless oEmbed path above. Quota notes in
// docs/youtube-integration.md: search.list costs 100 units, videos.list /
// playlists.list cost 1 — the default 10,000 units/day allow ~100 searches.
// ---------------------------------------------------------------------------

const DATA_API = 'https://www.googleapis.com/youtube/v3'

/** True when a Data API key is configured. */
export function isYouTubeApiConfigured() {
  return Boolean(process.env.YOUTUBE_API_KEY)
}

/** Error carrying a user-presentable message for Data API failures. */
export class YouTubeApiError extends Error {
  constructor(message, { status = 502 } = {}) {
    super(message)
    this.name = 'YouTubeApiError'
    this.status = status
  }
}

/** Parse ISO-8601 durations like "PT1H2M3S" / "PT4M13S" into seconds. */
export function parseISODuration(iso) {
  if (typeof iso !== 'string' || !iso.startsWith('PT')) return 0
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/)
  if (!match) return 0
  const hours = Number(match[1]) || 0
  const minutes = Number(match[2]) || 0
  const seconds = Number(match[3]) || 0
  return Math.round(hours * 3600 + minutes * 60 + seconds)
}

/** Shared fetch for the Data API with timeout + quota-aware errors. */
async function dataApiFetch(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })

  if (res.status === 403) {
    // Most common cause: daily quota exceeded (project-wide).
    throw new YouTubeApiError(
      'The YouTube API quota for this server is exhausted. Try again tomorrow.',
      { status: 429 },
    )
  }
  if (!res.ok) {
    throw new YouTubeApiError(`The YouTube API responded with status ${res.status}.`)
  }
  return res.json()
}

/** Map a Data API video resource to the app's metadata shape. */
function toVideoMeta(item) {
  return {
    videoId: item.id,
    title: item.snippet?.title || '',
    channelName: item.snippet?.channelTitle || '',
    thumbnailUrl:
      item.snippet?.thumbnails?.medium?.url || thumbnailFor(item.id),
    durationSec: parseISODuration(item.contentDetails?.duration || ''),
  }
}

/** Fetch full metadata (incl. duration) for a set of video ids (1 quota unit). */
async function fetchVideosByIds(ids) {
  if (ids.length === 0) return []
  const url = new URL(`${DATA_API}/videos`)
  url.searchParams.set('part', 'snippet,contentDetails')
  url.searchParams.set('id', ids.join(','))
  url.searchParams.set('key', process.env.YOUTUBE_API_KEY)
  const data = await dataApiFetch(url)
  return data.items?.map(toVideoMeta) || []
}

/**
 * Search YouTube for videos matching a query (100 quota units per call —
 * the route in front of it is rate-limited for exactly that reason).
 */
export async function searchYouTubeVideos(query, { maxResults = 12 } = {}) {
  const url = new URL(`${DATA_API}/search`)
  url.searchParams.set('part', 'snippet')
  url.searchParams.set('q', query)
  url.searchParams.set('type', 'video')
  url.searchParams.set('maxResults', String(maxResults))
  url.searchParams.set('key', process.env.YOUTUBE_API_KEY)

  const data = await dataApiFetch(url)
  const ids = (data.items || []).map((item) => item.id?.videoId).filter(Boolean)

  // search.list has no durations; one cheap videos.list fills them in and
  // also drops any videos that disappeared between the two calls.
  return fetchVideosByIds(ids)
}

/**
 * Extract a playlist id from a URL like
 * https://www.youtube.com/playlist?list=PL… (or a bare id).
 */
export function extractPlaylistId(input) {
  if (typeof input !== 'string') return null
  const raw = input.trim()
  if (!raw) return null

  // Bare playlist id (PL… / OL… / UU… etc.).
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

/**
 * Fetch a public playlist's title and up to 50 of its videos via the
 * Data API (2 quota units + 1 per 50 durations).
 */
export async function fetchYouTubePlaylist(playlistId) {
  const listUrl = new URL(`${DATA_API}/playlists`)
  listUrl.searchParams.set('part', 'snippet')
  listUrl.searchParams.set('id', playlistId)
  listUrl.searchParams.set('key', process.env.YOUTUBE_API_KEY)

  const listData = await dataApiFetch(listUrl)
  const playlistInfo = listData.items?.[0]
  if (!playlistInfo) {
    throw new YouTubeApiError(
      'That playlist does not exist, is private, or was removed.',
      { status: 404 },
    )
  }

  const itemsUrl = new URL(`${DATA_API}/playlistItems`)
  itemsUrl.searchParams.set('part', 'snippet')
  itemsUrl.searchParams.set('playlistId', playlistId)
  itemsUrl.searchParams.set('maxResults', '50')
  itemsUrl.searchParams.set('key', process.env.YOUTUBE_API_KEY)

  const itemsData = await dataApiFetch(itemsUrl)
  const entries = (itemsData.items || [])
    .map((item) => item.snippet?.resourceId?.videoId)
    .filter(Boolean)

  // Playlist items carry no duration — one videos.list call fills in the
  // metadata for all of them at once.
  const videos = await fetchVideosByIds(entries)

  return {
    id: playlistId,
    title: playlistInfo.snippet?.title || 'YouTube playlist',
    channelName: playlistInfo.snippet?.channelTitle || '',
    itemCount: itemsData.pageInfo?.totalResults || videos.length,
    truncated: (itemsData.pageInfo?.totalResults || 0) > 50,
    videos,
  }
}
