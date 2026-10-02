import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { libraryRouter } from './routes/library.routes.js';
import { usersRouter } from './routes/users.routes.js';
import { videosRouter } from './routes/videos.routes.js';
import { logger } from './utils/logger.js';

/**
 * Builds and configures the Express application, but never starts
 * listening on a port and never connects to the database. Kept separate
 * from server.ts specifically so tests can `import { app }` and drive it
 * with Supertest — no open port, no live MongoDB connection required.
 */
export function createApp(): Express {
  const app = express();

  // Security headers on every response.
  app.use(helmet());

  // Only the configured client origin may make credentialed requests —
  // required so the browser will send/accept the auth cookies introduced
  // in Phase 2.
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));

  app.use(express.json());
  app.use(cookieParser());

  // Structured request logging (method, path, status, duration) for every
  // request; silenced during tests via logger's own NODE_ENV check.
  app.use(pinoHttp({ logger }));

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/videos', videosRouter);
  app.use('/api/library', libraryRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
