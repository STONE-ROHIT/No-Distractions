import type { Response } from 'express';
import { env } from '../config/env.js';
import { ACCESS_TOKEN_TTL_MS, REFRESH_TOKEN_TTL_MS } from './tokens.js';

export const ACCESS_TOKEN_COOKIE = 'accessToken';
export const REFRESH_TOKEN_COOKIE = 'refreshToken';

const baseCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
};

/**
 * The refresh cookie is scoped to `/api/auth` — the browser only attaches
 * it to auth endpoints (refresh, logout), never to every other request —
 * which keeps a token capable of minting new sessions off the wire for
 * the vast majority of requests it has no reason to be part of.
 */
export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
) {
  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...baseCookieOptions,
    path: '/',
    maxAge: ACCESS_TOKEN_TTL_MS,
  });
  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...baseCookieOptions,
    path: '/api/auth',
    maxAge: REFRESH_TOKEN_TTL_MS,
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_TOKEN_COOKIE, { ...baseCookieOptions, path: '/' });
  res.clearCookie(REFRESH_TOKEN_COOKIE, { ...baseCookieOptions, path: '/api/auth' });
}
