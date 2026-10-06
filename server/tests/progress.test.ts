import { Types } from 'mongoose';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/repositories/watchProgress.repository.js');
vi.mock('../src/repositories/video.repository.js');

const { createApp } = await import('../src/app.js');
const watchProgressRepository = await import('../src/repositories/watchProgress.repository.js');
const videoRepository = await import('../src/repositories/video.repository.js');
const { signAccessToken } = await import('../src/utils/tokens.js');

const app = createApp();
const userId = new Types.ObjectId();
const authCookie = `accessToken=${signAccessToken(userId.toString())}`;
const videoId = new Types.ObjectId().toString();

function fakeProgressDoc(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    positionSeconds: 560,
    durationSeconds: 933,
    percentage: 60,
    completed: false,
    lastWatchedAt: new Date('2026-02-01T00:00:00Z'),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(videoRepository.findVideoById).mockResolvedValue({ _id: videoId } as never);
});

describe('PUT /api/progress/:videoId', () => {
  it('requires authentication', async () => {
    const res = await request(app)
      .put(`/api/progress/${videoId}`)
      .send({ positionSeconds: 10, durationSeconds: 100 });
    expect(res.status).toBe(401);
  });

  it('rejects a malformed video id with 400', async () => {
    const res = await request(app)
      .put('/api/progress/not-a-real-id')
      .set('Cookie', [authCookie])
      .send({ positionSeconds: 10, durationSeconds: 100 });
    expect(res.status).toBe(400);
  });

  it('returns 404 for a video that does not exist', async () => {
    vi.mocked(videoRepository.findVideoById).mockResolvedValue(null);
    const res = await request(app)
      .put(`/api/progress/${videoId}`)
      .set('Cookie', [authCookie])
      .send({ positionSeconds: 10, durationSeconds: 100 });
    expect(res.status).toBe(404);
  });

  it('computes percentage and leaves completed false below the threshold', async () => {
    vi.mocked(watchProgressRepository.upsertProgress).mockImplementation(
      (_u, _v, fields) => Promise.resolve(fakeProgressDoc(fields)) as never,
    );

    const res = await request(app)
      .put(`/api/progress/${videoId}`)
      .set('Cookie', [authCookie])
      .send({ positionSeconds: 500, durationSeconds: 1000 });

    expect(res.status).toBe(200);
    expect(res.body.progress).toMatchObject({ percentage: 50, completed: false });
  });

  it('auto-completes at the 90% threshold without an explicit override', async () => {
    vi.mocked(watchProgressRepository.upsertProgress).mockImplementation(
      (_u, _v, fields) => Promise.resolve(fakeProgressDoc(fields)) as never,
    );

    const res = await request(app)
      .put(`/api/progress/${videoId}`)
      .set('Cookie', [authCookie])
      .send({ positionSeconds: 900, durationSeconds: 1000 });

    expect(res.body.progress).toMatchObject({ percentage: 90, completed: true });
  });

  it('lets an explicit completed:true override mark a video done early (the "Mark complete" button)', async () => {
    vi.mocked(watchProgressRepository.upsertProgress).mockImplementation(
      (_u, _v, fields) => Promise.resolve(fakeProgressDoc(fields)) as never,
    );

    const res = await request(app)
      .put(`/api/progress/${videoId}`)
      .set('Cookie', [authCookie])
      .send({ positionSeconds: 100, durationSeconds: 1000, completed: true });

    expect(res.body.progress).toMatchObject({ percentage: 10, completed: true });
  });

  it('lets an explicit completed:false override un-complete a finished video', async () => {
    vi.mocked(watchProgressRepository.upsertProgress).mockImplementation(
      (_u, _v, fields) => Promise.resolve(fakeProgressDoc(fields)) as never,
    );

    const res = await request(app)
      .put(`/api/progress/${videoId}`)
      .set('Cookie', [authCookie])
      .send({ positionSeconds: 1000, durationSeconds: 1000, completed: false });

    expect(res.body.progress).toMatchObject({ percentage: 100, completed: false });
  });

  it('caps percentage at 100 even if position somehow exceeds duration', async () => {
    vi.mocked(watchProgressRepository.upsertProgress).mockImplementation(
      (_u, _v, fields) => Promise.resolve(fakeProgressDoc(fields)) as never,
    );

    const res = await request(app)
      .put(`/api/progress/${videoId}`)
      .set('Cookie', [authCookie])
      .send({ positionSeconds: 1050, durationSeconds: 1000 });

    expect(res.body.progress.percentage).toBe(100);
  });
});

describe('GET /api/progress/:videoId', () => {
  it('returns null (not a 404) when there is no progress yet', async () => {
    vi.mocked(watchProgressRepository.findProgress).mockResolvedValue(null);
    const res = await request(app).get(`/api/progress/${videoId}`).set('Cookie', [authCookie]);
    expect(res.status).toBe(200);
    expect(res.body.progress).toBeNull();
  });

  it('returns existing progress', async () => {
    vi.mocked(watchProgressRepository.findProgress).mockResolvedValue(fakeProgressDoc() as never);
    const res = await request(app).get(`/api/progress/${videoId}`).set('Cookie', [authCookie]);
    expect(res.body.progress).toMatchObject({ percentage: 60 });
  });
});

describe('GET /api/progress', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/progress');
    expect(res.status).toBe(401);
  });

  it('returns the in-progress list with populated video data', async () => {
    vi.mocked(watchProgressRepository.findInProgressForUser).mockResolvedValue([
      {
        ...fakeProgressDoc(),
        video: {
          _id: videoId,
          youtubeVideoId: 'dQw4w9WgXcQ',
          title: 'Sampling Theorem Explained',
          description: '',
          thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
          channelTitle: 'Signals Channel',
          durationSeconds: 933,
          embeddable: true,
          publishedAt: new Date(),
        },
      },
    ] as never);

    const res = await request(app).get('/api/progress').set('Cookie', [authCookie]);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      percentage: 60,
      video: { title: 'Sampling Theorem Explained' },
    });
  });
});
