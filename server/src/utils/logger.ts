import pino, { type LoggerOptions } from 'pino';
import { env } from '../config/env.js';

/**
 * Header values that must never reach log output. pino-http's default
 * serializers log every request and response header, which includes the
 * `Cookie` header (carrying both auth tokens) and the `Set-Cookie`
 * response header (carrying freshly issued ones) — so without this, a log
 * aggregator ends up holding live session credentials in plaintext.
 */
export const REDACTED_LOG_PATHS = [
  'req.headers.cookie',
  'req.headers.authorization',
  'res.headers["set-cookie"]',
];

/** Exported (not just the instance) so tests can build a logger with the exact production options. */
export const loggerOptions: LoggerOptions = {
  level: env.NODE_ENV === 'test' ? 'silent' : env.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: { paths: REDACTED_LOG_PATHS, censor: '[redacted]' },
  transport:
    env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
      : undefined,
};

/**
 * Structured JSON logger (production-friendly, machine-parseable) that
 * prints human-readable colored output in development via pino-pretty.
 * Use this instead of `console.log` anywhere in the server.
 */
export const logger = pino(loggerOptions);
