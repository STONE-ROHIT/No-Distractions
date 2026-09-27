import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

// Exercises the app directly (no listening port, no MongoDB) — see
// app.ts's comment on why createApp() and server.ts are kept separate.
const app = createApp();

describe('GET /api/health', () => {
  it('returns 200 with an ok status payload', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok' });
    expect(typeof response.body.uptimeSeconds).toBe('number');
    expect(typeof response.body.timestamp).toBe('string');
  });
});

describe('an unknown route', () => {
  it('returns a 404 with a JSON error body', async () => {
    const response = await request(app).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body.error.message).toContain('/api/does-not-exist');
  });
});
