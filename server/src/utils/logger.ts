import pino from 'pino';
import { env } from '../config/env.js';

/**
 * Structured JSON logger (production-friendly, machine-parseable) that
 * prints human-readable colored output in development via pino-pretty.
 * Use this instead of `console.log` anywhere in the server.
 */
export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport:
    env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
      : undefined,
});
