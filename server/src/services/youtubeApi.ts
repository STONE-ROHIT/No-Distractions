import { env } from '../config/env.js';

const BASE_URL = 'https://www.googleapis.com/youtube/v3';
const MAX_PLAYLIST_PAGES = 4; // caps a single import at 4 * 50 = 200 videos

/**
 * Thrown for every non-2xx or malformed response from the YouTube Data
 * API. `reason` is deliberately a small closed set — enough for the
 * caller (video.service.ts) to pick the right HTTP status and message,
 * not a passthrough of Google's own error shape.
 */
export class YoutubeApiError extends Error {
  readonly reason: 'quotaExceeded' | 'network' | 'unknown';
  constructor(reason: YoutubeApiError['reason'], message: string) {
    super(message);
    this.reason = reason;
  }
}

export interface YoutubeApiVideo {
  id: string;
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    channelId: string;
    publishedAt: string;
    thumbnails: { high?: { url: string }; medium?: { url: string }; default?: { url: string } };
  };
  contentDetails: { duration: string };
  status: { embeddable: boolean };
}

export interface YoutubeApiPlaylist {
  id: string;
  snippet: { title: string; channelTitle: string };
}

async function callApi<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE_URL}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set('key', env.YOUTUBE_API_KEY);

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new YoutubeApiError('network', 'Could not reach YouTube.');
  }

  if (response.status === 403) {
    // Google returns 403 for both "quota exceeded" and "key not allowed
    // for this API" — both look identical from here, and both mean
    // imports are down until someone fixes the project's API key/quota.
    throw new YoutubeApiError('quotaExceeded', 'YouTube import is temporarily unavailable.');
  }
  if (!response.ok) {
    throw new YoutubeApiError('unknown', `YouTube API returned ${response.status}.`);
  }

  return (await response.json()) as T;
}

/**
 * Batches into groups of 50 IDs per call — the API's own per-call limit —
 * and concatenates the results, so a 200-video playlist import fetches
 * all of them (4 calls) rather than silently returning metadata for only
 * the first 50. Each call still costs just 1 quota unit regardless of
 * how many IDs it carries.
 */
export async function fetchVideosByIds(videoIds: string[]): Promise<YoutubeApiVideo[]> {
  const results: YoutubeApiVideo[] = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const data = await callApi<{ items: YoutubeApiVideo[] }>('videos', {
      part: 'snippet,contentDetails,status',
      id: batch.join(','),
    });
    results.push(...data.items);
  }
  return results;
}

/** Returns null (not a throw) when the playlist doesn't exist or is private — the API's own signal for that is simply an empty list. */
export async function fetchPlaylistById(playlistId: string): Promise<YoutubeApiPlaylist | null> {
  const data = await callApi<{ items: YoutubeApiPlaylist[] }>('playlists', {
    part: 'snippet',
    id: playlistId,
  });
  return data.items[0] ?? null;
}

/**
 * Paginates playlistItems.list until either the playlist ends or
 * MAX_PLAYLIST_PAGES is hit (200 videos) — an explicit, documented cap
 * rather than unbounded work (and unbounded quota spend) on a huge
 * playlist. See docs/11-youtube-integration's limitations section.
 */
export async function fetchPlaylistVideoIds(playlistId: string): Promise<string[]> {
  const videoIds: string[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < MAX_PLAYLIST_PAGES; page++) {
    const data = await callApi<{
      items: { contentDetails: { videoId: string } }[];
      nextPageToken?: string;
    }>('playlistItems', {
      part: 'contentDetails',
      playlistId,
      maxResults: '50',
      ...(pageToken ? { pageToken } : {}),
    });

    videoIds.push(...data.items.map((item) => item.contentDetails.videoId));
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }

  return videoIds;
}
