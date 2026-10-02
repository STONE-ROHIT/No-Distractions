import { Types } from 'mongoose';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Everything that would touch the network or a real database is mocked —
// the repository layer (same pattern as auth.test.ts) AND
// services/youtubeApi.ts, the one file that calls fetch(). No test here
// makes a real request to YouTube.
vi.mock('../src/repositories/video.repository.js');
vi.mock('../src/repositories/libraryItem.repository.js');
vi.mock('../src/services/youtubeApi.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/services/youtubeApi.js')>();
  return {
    ...actual, // keep the real YoutubeApiError class — instanceof checks in video.service.ts need it
    fetchVideosByIds: vi.fn(),
    fetchPlaylistById: vi.fn(),
    fetchPlaylistVideoIds: vi.fn(),
  };
});

const { createApp } = await import('../src/app.js');
const videoRepository = await import('../src/repositories/video.repository.js');
const libraryItemRepository = await import('../src/repositories/libraryItem.repository.js');
const youtubeApi = await import('../src/services/youtubeApi.js');
const { signAccessToken } = await import('../src/utils/tokens.js');

const app = createApp();
const userId = new Types.ObjectId();
const authCookie = `accessToken=${signAccessToken(userId.toString())}`;

function fakeApiVideo(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'dQw4w9WgXcQ',
    snippet: {
      title: 'Sampling Theorem Explained',
      description: 'A lecture on the Nyquist-Shannon sampling theorem.',
      channelTitle: 'Signals Channel',
      channelId: 'UCabc123',
      publishedAt: '2024-01-01T00:00:00Z',
      thumbnails: { high: { url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg' } },
    },
    contentDetails: { duration: 'PT15M33S' },
    status: { embeddable: true },
    ...overrides,
  };
}

function fakeVideoDoc(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    _id: new Types.ObjectId(),
    youtubeVideoId: 'dQw4w9WgXcQ',
    title: 'Sampling Theorem Explained',
    description: 'A lecture on the Nyquist-Shannon sampling theorem.',
    thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    channelTitle: 'Signals Channel',
    durationSeconds: 933,
    embeddable: true,
    publishedAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/videos/import', () => {
  it('requires authentication', async () => {
    const res = await request(app)
      .post('/api/videos/import')
      .send({ url: 'https://youtu.be/dQw4w9WgXcQ' });
    expect(res.status).toBe(401);
  });

  it('rejects a non-YouTube URL with 400 before calling the YouTube API', async () => {
    const res = await request(app)
      .post('/api/videos/import')
      .set('Cookie', [authCookie])
      .send({ url: 'https://vimeo.com/12345' });

    expect(res.status).toBe(400);
    expect(youtubeApi.fetchVideosByIds).not.toHaveBeenCalled();
  });

  it('rejects a Shorts URL with a specific, on-brand message', async () => {
    const res = await request(app)
      .post('/api/videos/import')
      .set('Cookie', [authCookie])
      .send({ url: 'https://www.youtube.com/shorts/dQw4w9WgXcQ' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/shorts/i);
  });

  it('imports a single video and adds it to the library', async () => {
    vi.mocked(youtubeApi.fetchVideosByIds).mockResolvedValue([fakeApiVideo()]);
    const videoDoc = fakeVideoDoc();
    vi.mocked(videoRepository.upsertVideoFromApi).mockResolvedValue(videoDoc as never);

    const res = await request(app)
      .post('/api/videos/import')
      .set('Cookie', [authCookie])
      .send({ url: 'https://youtu.be/dQw4w9WgXcQ' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      type: 'video',
      video: { title: 'Sampling Theorem Explained' },
    });
    expect(libraryItemRepository.addToLibrary).toHaveBeenCalledWith(userId, videoDoc._id);
  });

  it('returns 404 for a video that is unavailable or private (an empty result, not an error, from the API)', async () => {
    vi.mocked(youtubeApi.fetchVideosByIds).mockResolvedValue([]);

    const res = await request(app)
      .post('/api/videos/import')
      .set('Cookie', [authCookie])
      .send({ url: 'https://youtu.be/dQw4w9WgXcQ' });

    expect(res.status).toBe(404);
  });

  it('imports every video in a playlist', async () => {
    vi.mocked(youtubeApi.fetchPlaylistById).mockResolvedValue({
      id: 'PLxyz',
      snippet: { title: 'Digital Communications', channelTitle: 'Signals Channel' },
    });
    vi.mocked(youtubeApi.fetchPlaylistVideoIds).mockResolvedValue(['vid1', 'vid2']);
    vi.mocked(youtubeApi.fetchVideosByIds).mockResolvedValue([
      fakeApiVideo({ id: 'vid1' }),
      fakeApiVideo({ id: 'vid2' }),
    ]);
    vi.mocked(videoRepository.upsertVideoFromApi).mockImplementation(
      (v) => Promise.resolve(fakeVideoDoc({ youtubeVideoId: v.id })) as never,
    );

    const res = await request(app)
      .post('/api/videos/import')
      .set('Cookie', [authCookie])
      .send({ url: 'https://www.youtube.com/playlist?list=PLxyz' });

    expect(res.status).toBe(201);
    expect(res.body.type).toBe('playlist');
    expect(res.body.playlistTitle).toBe('Digital Communications');
    expect(res.body.videos).toHaveLength(2);
    expect(libraryItemRepository.addToLibrary).toHaveBeenCalledTimes(2);
  });

  it('returns 404 for a playlist that is unavailable or private', async () => {
    vi.mocked(youtubeApi.fetchPlaylistById).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/videos/import')
      .set('Cookie', [authCookie])
      .send({ url: 'https://www.youtube.com/playlist?list=PLxyz' });

    expect(res.status).toBe(404);
  });

  it('maps a quota-exceeded response from YouTube to a 503, not a raw 500', async () => {
    vi.mocked(youtubeApi.fetchVideosByIds).mockRejectedValue(
      new youtubeApi.YoutubeApiError('quotaExceeded', 'YouTube import is temporarily unavailable.'),
    );

    const res = await request(app)
      .post('/api/videos/import')
      .set('Cookie', [authCookie])
      .send({ url: 'https://youtu.be/dQw4w9WgXcQ' });

    expect(res.status).toBe(503);
  });
});

describe('GET /api/videos/:id', () => {
  it('requires authentication', async () => {
    const res = await request(app).get(`/api/videos/${new Types.ObjectId().toString()}`);
    expect(res.status).toBe(401);
  });

  it('returns a previously imported video', async () => {
    const videoDoc = fakeVideoDoc();
    vi.mocked(videoRepository.findVideoById).mockResolvedValue(videoDoc as never);

    const res = await request(app)
      .get(`/api/videos/${videoDoc._id.toString()}`)
      .set('Cookie', [authCookie]);

    expect(res.status).toBe(200);
    expect(res.body.video.title).toBe('Sampling Theorem Explained');
  });

  it('returns 404 for an id that does not exist', async () => {
    vi.mocked(videoRepository.findVideoById).mockResolvedValue(null);
    const res = await request(app)
      .get(`/api/videos/${new Types.ObjectId().toString()}`)
      .set('Cookie', [authCookie]);
    expect(res.status).toBe(404);
  });
});

describe('GET /api/library', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/library');
    expect(res.status).toBe(401);
  });

  it("returns the user's saved videos, newest first", async () => {
    const videoDoc = fakeVideoDoc();
    vi.mocked(libraryItemRepository.findLibraryByUser).mockResolvedValue([
      { savedAt: new Date('2024-02-01'), video: videoDoc },
    ] as never);

    const res = await request(app).get('/api/library').set('Cookie', [authCookie]);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].video.title).toBe('Sampling Theorem Explained');
  });
});
