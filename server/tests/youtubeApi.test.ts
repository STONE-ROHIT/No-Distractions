import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchPlaylistById,
  fetchPlaylistVideoIds,
  fetchVideosByIds,
} from '../src/services/youtubeApi.js';

// The one file in this suite that actually exercises youtubeApi.ts's own
// logic (batching, pagination, error mapping) — videos.test.ts mocks this
// whole module, so none of that would otherwise run in any test.
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

beforeEach(() => {
  fetchMock.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.stubGlobal('fetch', fetchMock);
});

describe('fetchVideosByIds', () => {
  it('makes one call for 50 or fewer ids', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { items: [{ id: 'a' }] }));
    const ids = Array.from({ length: 50 }, (_, i) => `id${i}`);

    const result = await fetchVideosByIds(ids);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result).toEqual([{ id: 'a' }]);
  });

  it('batches into multiple calls of at most 50 ids, and concatenates every result', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { items: [{ id: 'batch1' }] }))
      .mockResolvedValueOnce(jsonResponse(200, { items: [{ id: 'batch2' }] }));
    const ids = Array.from({ length: 75 }, (_, i) => `id${i}`);

    const result = await fetchVideosByIds(ids);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstCallUrl = fetchMock.mock.calls[0]![0] as URL;
    expect(firstCallUrl.searchParams.get('id')!.split(',')).toHaveLength(50);
    const secondCallUrl = fetchMock.mock.calls[1]![0] as URL;
    expect(secondCallUrl.searchParams.get('id')!.split(',')).toHaveLength(25);
    expect(result).toEqual([{ id: 'batch1' }, { id: 'batch2' }]);
  });

  it('returns an empty array for an empty input without calling fetch', async () => {
    const result = await fetchVideosByIds([]);
    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps a 403 to a quotaExceeded YoutubeApiError', async () => {
    fetchMock.mockResolvedValue(jsonResponse(403, {}));
    await expect(fetchVideosByIds(['a'])).rejects.toMatchObject({ reason: 'quotaExceeded' });
  });

  it('maps a network failure (fetch itself rejecting) to a network YoutubeApiError', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    await expect(fetchVideosByIds(['a'])).rejects.toMatchObject({ reason: 'network' });
  });
});

describe('fetchPlaylistById', () => {
  it('returns null (not a throw) when the playlist is not found', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { items: [] }));
    expect(await fetchPlaylistById('doesnotexist')).toBeNull();
  });
});

describe('fetchPlaylistVideoIds', () => {
  it('follows nextPageToken until the playlist ends', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(200, {
          items: [{ contentDetails: { videoId: 'v1' } }],
          nextPageToken: 'page2',
        }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { items: [{ contentDetails: { videoId: 'v2' } }] }));

    const ids = await fetchPlaylistVideoIds('PLxyz');

    expect(ids).toEqual(['v1', 'v2']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('stops at 4 pages (200 videos) even if the playlist has more', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        items: [{ contentDetails: { videoId: 'v' } }],
        nextPageToken: 'always-another-page',
      }),
    );

    await fetchPlaylistVideoIds('PLhuge');

    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
