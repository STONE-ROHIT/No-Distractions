import { Schema, model, Types } from 'mongoose';

const refreshTokenSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  // SHA-256 hash of the opaque refresh token — the raw token is never
  // stored (same principle as passwordHash: a DB leak alone shouldn't be
  // enough to impersonate a session). See docs/10-authentication.
  tokenHash: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  // TTL index: MongoDB automatically deletes the document once expiresAt
  // is in the past, so expired sessions clean themselves up with no cron
  // job needed.
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  revokedAt: { type: Date, default: null },
});

export interface RefreshTokenDocument {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
}

export const RefreshToken = model<RefreshTokenDocument>('RefreshToken', refreshTokenSchema);
