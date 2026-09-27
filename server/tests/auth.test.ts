import { Types } from 'mongoose';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Repositories are mocked (no real MongoDB is available to this test
// run — see docs/10-authentication's "Testing" section for why, and for
// how to additionally run these against a real database locally). Every
// other layer — validators, controllers, services, token signing,
// password hashing, cookie handling — is the real code, exercised through
// real HTTP requests via Supertest. This tests the full request lifecycle
// with only the database swapped out, not isolated units.
vi.mock('../src/repositories/user.repository.js');
vi.mock('../src/repositories/refreshToken.repository.js');

const { createApp } = await import('../src/app.js');
const userRepository = await import('../src/repositories/user.repository.js');
const refreshTokenRepository = await import('../src/repositories/refreshToken.repository.js');
const { hashPassword } = await import('../src/utils/password.js');
const { signAccessToken } = await import('../src/utils/tokens.js');

const app = createApp();

function fakeUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    _id: new Types.ObjectId(),
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    passwordHash: '',
    avatar: undefined,
    preferences: { theme: 'system', autoplayNext: false, defaultPlaybackRate: 1 },
    createdAt: new Date(),
    ...overrides,
  };
}

/** Extracts one cookie's value out of a Supertest response's Set-Cookie header. */
function getCookieValue(res: request.Response, name: string): string | undefined {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
  const line = raw?.find((c) => c.startsWith(`${name}=`));
  return line?.split(';')[0]?.split('=')[1];
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/auth/register', () => {
  it('creates a user, sets auth cookies, and never returns the password hash', async () => {
    vi.mocked(userRepository.findUserByEmail).mockResolvedValue(null);
    const created = fakeUser({ passwordHash: await hashPassword('correct-horse-battery') });
    vi.mocked(userRepository.createUser).mockResolvedValue(created as never);
    vi.mocked(refreshTokenRepository.createRefreshToken).mockResolvedValue({} as never);

    const res = await request(app).post('/api/auth/register').send({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'correct-horse-battery',
    });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: 'Ada Lovelace', email: 'ada@example.com' });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(getCookieValue(res, 'accessToken')).toBeTruthy();
    expect(getCookieValue(res, 'refreshToken')).toBeTruthy();
  });

  it('rejects a duplicate email with 409', async () => {
    vi.mocked(userRepository.findUserByEmail).mockResolvedValue(fakeUser() as never);

    const res = await request(app).post('/api/auth/register').send({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'correct-horse-battery',
    });

    expect(res.status).toBe(409);
    expect(userRepository.createUser).not.toHaveBeenCalled();
  });

  it('rejects a short password with 400 before it ever reaches the service', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ada Lovelace', email: 'ada@example.com', password: 'short' });

    expect(res.status).toBe(400);
    expect(userRepository.findUserByEmail).not.toHaveBeenCalled();
  });

  it('maps a duplicate-key error from a racing signup to the same 409', async () => {
    // Both concurrent requests passed the up-front check; the unique index
    // rejected the second insert. MongoDB reports that as code 11000.
    vi.mocked(userRepository.findUserByEmail).mockResolvedValue(null);
    vi.mocked(userRepository.createUser).mockRejectedValue(
      Object.assign(new Error('E11000 duplicate key error'), { code: 11000 }),
    );

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ada Lovelace', email: 'ada@example.com', password: 'correct-horse-battery' });

    expect(res.status).toBe(409);
    expect(refreshTokenRepository.createRefreshToken).not.toHaveBeenCalled();
  });

  it('masks an unexpected database error instead of leaking its message', async () => {
    vi.mocked(userRepository.findUserByEmail).mockResolvedValue(null);
    vi.mocked(userRepository.createUser).mockRejectedValue(
      new Error('connection to db-internal-host:27017 reset'),
    );

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ada Lovelace', email: 'ada@example.com', password: 'correct-horse-battery' });

    expect(res.status).toBe(500);
    expect(res.body.error.message).toBe('Something went wrong. Please try again.');
    expect(JSON.stringify(res.body)).not.toContain('db-internal-host');
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials', async () => {
    const passwordHash = await hashPassword('correct-horse-battery');
    vi.mocked(userRepository.findUserByEmailWithPassword).mockResolvedValue(
      fakeUser({ passwordHash }) as never,
    );
    vi.mocked(refreshTokenRepository.createRefreshToken).mockResolvedValue({} as never);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ada@example.com', password: 'correct-horse-battery' });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('ada@example.com');
    expect(getCookieValue(res, 'accessToken')).toBeTruthy();
  });

  it('returns the same 401 for a wrong password as for an unknown email', async () => {
    const passwordHash = await hashPassword('correct-horse-battery');
    vi.mocked(userRepository.findUserByEmailWithPassword).mockResolvedValue(
      fakeUser({ passwordHash }) as never,
    );

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ada@example.com', password: 'not-the-password' });

    vi.mocked(userRepository.findUserByEmailWithPassword).mockResolvedValue(null);
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever123' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
  });
});

describe('GET /api/users/me', () => {
  it('rejects a request with no access-token cookie', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });

  it('returns the current user for a valid access-token cookie', async () => {
    const user = fakeUser();
    vi.mocked(userRepository.findUserById).mockResolvedValue(user as never);
    const accessToken = signAccessToken(user._id.toString());

    const res = await request(app)
      .get('/api/users/me')
      .set('Cookie', [`accessToken=${accessToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(user.email);
  });

  it('rejects a malformed access-token cookie', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Cookie', ['accessToken=not-a-real-jwt']);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/refresh', () => {
  it('rotates a valid refresh token and issues a new pair', async () => {
    const user = fakeUser();
    vi.mocked(refreshTokenRepository.findRefreshTokenByHash).mockResolvedValue({
      _id: new Types.ObjectId(),
      user: user._id,
      tokenHash: 'irrelevant-in-this-mock',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      revokedAt: null,
    } as never);
    vi.mocked(userRepository.findUserById).mockResolvedValue(user as never);
    vi.mocked(refreshTokenRepository.createRefreshToken).mockResolvedValue({} as never);

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', ['refreshToken=some-raw-token']);

    expect(res.status).toBe(200);
    expect(refreshTokenRepository.revokeRefreshToken).toHaveBeenCalledOnce();
    expect(getCookieValue(res, 'accessToken')).toBeTruthy();
  });

  it('treats a reused (already-revoked) refresh token as theft and revokes every session', async () => {
    const user = fakeUser();
    vi.mocked(refreshTokenRepository.findRefreshTokenByHash).mockResolvedValue({
      _id: new Types.ObjectId(),
      user: user._id,
      tokenHash: 'irrelevant-in-this-mock',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      revokedAt: new Date(), // already used once
    } as never);

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', ['refreshToken=stolen-token']);

    expect(res.status).toBe(401);
    expect(refreshTokenRepository.revokeAllRefreshTokensForUser).toHaveBeenCalledWith(user._id);
  });

  it('rejects a request with no refresh-token cookie at all', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('clears both auth cookies', async () => {
    vi.mocked(refreshTokenRepository.findRefreshTokenByHash).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', ['refreshToken=whatever']);

    expect(res.status).toBe(204);
    const setCookie = res.headers['set-cookie'] as unknown as string[];
    expect(setCookie.some((c) => c.startsWith('accessToken=;'))).toBe(true);
    expect(setCookie.some((c) => c.startsWith('refreshToken=;'))).toBe(true);
  });
});
