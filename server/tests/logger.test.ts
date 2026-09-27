import { Writable } from 'node:stream';
import express from 'express';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { loggerOptions } from '../src/utils/logger.js';

describe('request logging', () => {
  it('never writes auth cookie values to the log output', async () => {
    const lines: string[] = [];
    const sink = new Writable({
      write(chunk, _encoding, callback) {
        lines.push(chunk.toString());
        callback();
      },
    });

    // The production logger options, except forced to `info` and an
    // in-memory sink (the real logger is silent under NODE_ENV=test).
    const testLogger = pino({ ...loggerOptions, level: 'info', transport: undefined }, sink);

    const app = express();
    app.use(pinoHttp({ logger: testLogger }));
    app.get('/', (_req, res) => {
      res.cookie('refreshToken', 'secret-refresh-value');
      res.send('ok');
    });

    await request(app).get('/').set('Cookie', ['accessToken=secret-access-value']);

    // pino-http logs when the response finishes, which can land just after
    // the client sees it.
    await vi.waitFor(() => expect(lines.length).toBeGreaterThan(0));

    const output = lines.join('');
    expect(output).not.toContain('secret-access-value');
    expect(output).not.toContain('secret-refresh-value');
    expect(output).toContain('[redacted]');
  });
});
