import { z } from 'zod';

/**
 * All environment variables the server actually reads, validated eagerly
 * at startup. This is deliberately the ONLY place in the codebase that
 * touches `process.env` directly — everywhere else imports `env` from
 * here, so a typo in a variable name is a type error, not a silent
 * `undefined` discovered at 2am in production.
 *
 * Fails fast: if a required variable is missing or malformed, the process
 * throws immediately on import instead of starting in a half-working
 * state.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  CLIENT_URL: z.string().url('CLIENT_URL must be a valid URL, e.g. http://localhost:5173'),
  // Signs/verifies access tokens only. Refresh tokens are opaque random
  // strings (hashed at rest in the RefreshToken collection), not JWTs, so
  // they need no secret of their own — see docs/10-authentication.
  JWT_ACCESS_SECRET: z
    .string()
    .min(
      32,
      'JWT_ACCESS_SECRET must be at least 32 characters — generate one with `openssl rand -hex 32`',
    ),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Invalid environment configuration. Check your .env against .env.example:\n${issues}`,
    );
  }

  return parsed.data;
}

export const env = loadEnv();
export type Env = typeof env;
