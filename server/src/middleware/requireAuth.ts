import type { NextFunction, Request, Response } from 'express';
import { ACCESS_TOKEN_COOKIE } from '../utils/cookies.js';
import { verifyAccessToken } from '../utils/tokens.js';
import { AppError } from './errorHandler.js';

/**
 * Protects a route: requires a valid access-token cookie, and attaches
 * the authenticated user's id to `req.userId` for the controller to use.
 *
 * Deliberately does NOT try to auto-refresh an expired access token here
 * — that would mean silently minting new tokens from inside a random
 * protected route's middleware chain. Refreshing is the client's job (see
 * client/src/api/client.ts's response interceptor): on a 401 here, it
 * calls POST /api/auth/refresh once and retries.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token: unknown = req.cookies[ACCESS_TOKEN_COOKIE];

  if (typeof token !== 'string') {
    next(new AppError(401, 'Not authenticated'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    next();
  } catch {
    next(new AppError(401, 'Not authenticated'));
  }
}
