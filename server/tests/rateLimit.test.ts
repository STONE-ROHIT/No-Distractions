import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

// Own file on purpose: Vitest gives each test file a fresh module graph,
// so these limiters start with empty buckets instead of inheriting
// request counts from other suites.
const app = createApp();

async function requestsUntilBlocked(path: string): Promise<number> {
  for (let sent = 1; sent <= 20; sent++) {
    // An empty body fails validation (400) without touching bcrypt or the
    // database, but the limiter runs BEFORE validation, so it still counts.
    const res = await request(app).post(path).send({});
    if (res.status === 429) return sent;
    expect(res.status).toBe(400);
  }
  throw new Error(`${path} was never rate limited`);
}

describe('rate limiting on credential endpoints', () => {
  it('blocks the 11th login attempt with a 429 and the standard error shape', async () => {
    expect(await requestsUntilBlocked('/api/auth/login')).toBe(11);

    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(429);
    expect(res.body.error.message).toMatch(/too many attempts/i);
  });

  it('keeps register and login in separate buckets', async () => {
    // Spend the whole login budget...
    await requestsUntilBlocked('/api/auth/login');
    // ...registration still has its own untouched allowance.
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).toBe(400);
  });
});
