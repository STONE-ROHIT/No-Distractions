export type ParsedYoutubeUrl =
  | { type: 'video'; videoId: string }
  | { type: 'playlist'; playlistId: string }
  | { type: 'shorts' };

const VIDEO_ID_PATTERN = /^[\w-]{11}$/;

/**
 * Recognizes the handful of URL shapes YouTube actually issues. Returns
 * `null` for anything else (including a syntactically valid URL to some
 * other site) — the caller turns that into a 400.
 *
 * `v=` takes priority over a `list=` on the same URL (e.g. a link to one
 * video that happens to sit inside a playlist): that's a link to a single
 * video, not an invitation to import the whole playlist around it.
 */
export function parseYoutubeUrl(rawUrl: string): ParsedYoutubeUrl | null {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '');
  if (host !== 'youtube.com' && host !== 'youtu.be') {
    return null;
  }

  if (host === 'youtu.be') {
    const videoId = url.pathname.slice(1);
    return VIDEO_ID_PATTERN.test(videoId) ? { type: 'video', videoId } : null;
  }

  if (url.pathname.startsWith('/shorts/')) {
    return { type: 'shorts' };
  }

  const videoId = url.searchParams.get('v');
  if (videoId) {
    return VIDEO_ID_PATTERN.test(videoId) ? { type: 'video', videoId } : null;
  }

  const playlistId = url.searchParams.get('list');
  if (playlistId && (url.pathname === '/playlist' || url.pathname === '/watch')) {
    return { type: 'playlist', playlistId };
  }

  return null;
}
