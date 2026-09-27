import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Token issuance and verification. Two different designs for two
 * different jobs — see docs/10-authentication for the full reasoning:
 *
 * - Access token: a JWT. Self-verifying (checked on every protected
 *   request via its signature alone, no database hit), short-lived, never
 *   persisted server-side.
 * - Refresh token: an opaque random string, NOT a JWT. It only needs to
 *   be checked rarely (on refresh), so the statelessness a JWT buys you
 *   isn't useful here — what refresh tokens actually need is server-side
 *   revocability, which requires a database record either way. We store a
 *   SHA-256 hash of it (see repositories/refreshToken.repository.ts),
 *   never the raw value.
 */

export const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface AccessTokenPayload {
  sub: string;
}

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId } satisfies AccessTokenPayload, env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL_MS / 1000,
  });
}

/** Throws if the token is missing, malformed, expired, or signed with a different secret. */
export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/** Returns both the raw token (goes in the cookie) and its hash (goes in the database). */
export function generateRefreshToken(): { raw: string; hash: string; expiresAt: Date } {
  const raw = randomBytes(40).toString('hex');
  return {
    raw,
    hash: hashToken(raw),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  };
}
