import { RefreshToken } from '../models/RefreshToken.js';
import type { Types } from 'mongoose';

export interface CreateRefreshTokenInput {
  user: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
}

export function createRefreshToken(input: CreateRefreshTokenInput) {
  return RefreshToken.create(input);
}

export function findRefreshTokenByHash(tokenHash: string) {
  return RefreshToken.findOne({ tokenHash });
}

export function revokeRefreshToken(id: Types.ObjectId) {
  return RefreshToken.findByIdAndUpdate(id, { revokedAt: new Date() });
}

// Used on reuse-detection (a rotated-out token was presented again) and on
// "log out everywhere" — invalidates every session for this user at once.
export function revokeAllRefreshTokensForUser(userId: Types.ObjectId) {
  return RefreshToken.updateMany({ user: userId, revokedAt: null }, { revokedAt: new Date() });
}
