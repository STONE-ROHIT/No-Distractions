import bcrypt from 'bcryptjs';

// bcryptjs (pure JS, no native compilation step) over the native `bcrypt`
// package — same algorithm and battle-tested security properties, but one
// less thing that can fail to install/build across different deployment
// environments. The hashing cost is negligible at auth-endpoint request
// volumes even without native speed.
const SALT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// A precomputed hash of a value nobody will ever type, used purely so
// "user not found" and "wrong password" take the same amount of time —
// see auth.service.ts's login(). Without this, skipping bcrypt entirely
// when the email doesn't exist makes the response measurably faster,
// which leaks whether an email is registered.
export const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', SALT_ROUNDS);
