import { AppError } from '../middleware/errorHandler.js';
import * as refreshTokenRepository from '../repositories/refreshToken.repository.js';
import * as userRepository from '../repositories/user.repository.js';
import { DUMMY_HASH, hashPassword, verifyPassword } from '../utils/password.js';
import { generateRefreshToken, hashToken, signAccessToken } from '../utils/tokens.js';
import { toPublicUser } from './user.service.js';
import type { Types } from 'mongoose';

interface AuthResult {
  user: ReturnType<typeof toPublicUser>;
  accessToken: string;
  refreshToken: string;
}

// MongoDB reports a violated unique index as error code 11000.
function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

// The findUserByEmail check in register() and this insert aren't atomic: two
// simultaneous signups for one email can both pass the check. The unique
// index on User.email guarantees exactly one insert wins — this maps the
// loser to the same 409 the up-front check gives, instead of a generic 500.
async function createUserOrConflict(input: userRepository.CreateUserInput) {
  try {
    return await userRepository.createUser(input);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(409, 'An account with this email already exists');
    }
    throw error;
  }
}

async function issueSession(userId: Types.ObjectId): Promise<Omit<AuthResult, 'user'>> {
  const accessToken = signAccessToken(userId.toString());
  const refreshToken = generateRefreshToken();
  await refreshTokenRepository.createRefreshToken({
    user: userId,
    tokenHash: refreshToken.hash,
    expiresAt: refreshToken.expiresAt,
  });
  return { accessToken, refreshToken: refreshToken.raw };
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResult> {
  const existing = await userRepository.findUserByEmail(input.email);
  if (existing) {
    throw new AppError(409, 'An account with this email already exists');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await createUserOrConflict({
    name: input.name,
    email: input.email,
    passwordHash,
  });

  const session = await issueSession(user._id);
  return { user: toPublicUser(user), ...session };
}

export async function login(input: { email: string; password: string }): Promise<AuthResult> {
  const user = await userRepository.findUserByEmailWithPassword(input.email);

  // Compare against a real hash either way, so a non-existent email and a
  // wrong password take (approximately) the same amount of time — see
  // utils/password.ts's DUMMY_HASH.
  const isValid = await verifyPassword(input.password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !isValid) {
    throw new AppError(401, 'Invalid email or password');
  }

  const session = await issueSession(user._id);
  return { user: toPublicUser(user), ...session };
}

export async function refresh(rawRefreshToken: string): Promise<AuthResult> {
  const tokenHash = hashToken(rawRefreshToken);
  const existing = await refreshTokenRepository.findRefreshTokenByHash(tokenHash);

  if (!existing) {
    throw new AppError(401, 'Session expired — please log in again');
  }

  if (existing.revokedAt) {
    // This exact refresh token was already rotated out once before, and
    // is being presented again — either a client retried a stale token,
    // or someone else has a copy of it. Treat it as theft: revoke every
    // active session for this user, forcing a fresh login everywhere.
    await refreshTokenRepository.revokeAllRefreshTokensForUser(existing.user);
    throw new AppError(401, 'Session invalidated — please log in again');
  }

  if (existing.expiresAt < new Date()) {
    throw new AppError(401, 'Session expired — please log in again');
  }

  await refreshTokenRepository.revokeRefreshToken(existing._id);

  const user = await userRepository.findUserById(existing.user);
  if (!user) {
    throw new AppError(401, 'Session expired — please log in again');
  }

  const session = await issueSession(user._id);
  return { user: toPublicUser(user), ...session };
}

export async function logout(rawRefreshToken: string | undefined): Promise<void> {
  if (!rawRefreshToken) return;

  const existing = await refreshTokenRepository.findRefreshTokenByHash(hashToken(rawRefreshToken));
  // Logging out with an already-invalid token still "succeeds" from the
  // client's point of view — there's nothing meaningful left to revoke,
  // and the client's cookies get cleared by the controller regardless.
  if (existing && !existing.revokedAt) {
    await refreshTokenRepository.revokeRefreshToken(existing._id);
  }
}
