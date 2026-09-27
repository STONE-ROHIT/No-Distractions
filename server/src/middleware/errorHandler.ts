import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Thrown deliberately by application code (controllers/services) to signal
 * an expected, user-facing failure — "video not found", "invalid
 * credentials", etc. `isOperational` distinguishes these from genuine bugs:
 * operational errors are safe to show a message for, programmer errors
 * (a thrown TypeError, an unhandled Mongoose cast error, ...) are not.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly isOperational: boolean;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/** Mounted after every route. Anything that reaches here matched no route. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: { message: `Route not found: ${req.method} ${req.originalUrl}` },
  });
}

/**
 * Centralized error handler — the single place that decides what a client
 * ever sees for a failure. Express 5 forwards both synchronous throws and
 * rejected promises from async route handlers here automatically, so
 * controllers/services can just `throw` (or `await` and let it reject)
 * instead of needing a try/catch-and-forward wrapper on every route.
 *
 * Never leaks a stack trace or a raw driver/library error message to the
 * client in production — those go to the logger instead.
 */
// `_next` is required but unused: Express identifies error-handling
// middleware by function arity (exactly 4 params), so it must stay even
// though this handler never calls it. The `_` prefix is the convention
// both TypeScript's noUnusedParameters and the ESLint config recognize.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const message = isAppError ? err.message : 'Something went wrong. Please try again.';

  logger.error({ err, path: req.originalUrl, method: req.method }, 'Request error');

  res.status(statusCode).json({
    error: {
      message,
      ...(env.NODE_ENV === 'development' && !isAppError && err instanceof Error
        ? { stack: err.stack }
        : {}),
    },
  });
}
