# ADR-002: Authentication strategy

*(Decision recorded now, during Phase 1 architecture planning;
implemented in Phase 2. See `docs/10-authentication/` for the full
beginner-to-advanced guide once that phase lands.)*

## Context

The brief asks for either a "JWT access/refresh-token architecture" or
"secure HTTP-only cookie based authentication", and explicitly rules out
storing sensitive tokens in `localStorage` if avoidable.

Those two options aren't actually mutually exclusive — JWTs are a *token
format*, cookies are a *transport*. The interesting design question is how
they combine, and how a refresh token can be revoked (e.g. on logout, or
if stolen) rather than remaining valid until it expires.

## Decision

Use JWTs as the token format, delivered exclusively via `httpOnly`,
`Secure`, `SameSite=Lax` cookies — never `localStorage` or a JS-readable
cookie.

- **Access token**: short-lived (~15 min), verified by an Express
  middleware on protected routes, never persisted server-side.
- **Refresh token**: longer-lived (~30 days), *and* recorded server-side
  in a dedicated `RefreshToken` collection as a hash (never the raw
  token) with an expiry and a revoked flag.
- **Rotation**: every call to `POST /api/auth/refresh` verifies the
  incoming refresh cookie against its stored hash, issues a brand-new
  access+refresh pair, and marks the old `RefreshToken` record revoked.
  A reused (already-rotated) refresh token is a signal of theft and
  revokes the whole session.
- **Logout** deletes that session's `RefreshToken` record and clears both
  cookies — immediate revocation, not just "let it expire".
- CORS is locked to `CLIENT_URL` with `credentials: true`, so only the
  known frontend origin can send/receive these cookies at all.

## Alternatives considered

- **JWT in `localStorage`** — explicitly disallowed by the brief, and for
  good reason: any successful XSS on the page can read `localStorage` and
  exfiltrate the token. `httpOnly` cookies are invisible to JavaScript
  entirely.
- **Server-side sessions** (`express-session` + a Mongo session store) —
  a simpler mental model (one opaque session ID, all state server-side),
  and would satisfy "secure cookie based authentication" on its own.
  Rejected in favor of JWT + cookie because the brief's own phrasing
  ("JWT ... OR ... cookie based") signals a preference for JWT semantics
  (stateless access-token verification, no DB read on every request), and
  because Rohit's existing [[creator-dashboard]]-style projects already
  use JWT — this keeps the pattern consistent rather than introducing a
  second, unrelated auth model to learn.
- **A single `tokenVersion` counter on `User`** (increment to invalidate
  all refresh tokens at once) instead of a `RefreshToken` collection —
  simpler, but only supports "log out everywhere", not "log out this one
  device" or "show the user their active sessions", both reasonable
  features for a learning app used on a laptop and a phone. The extra
  collection is one more index to maintain in exchange for that
  flexibility.

## Trade-offs

- A `RefreshToken` collection is one more thing to query and clean up
  (expired/revoked rows) — mitigated with a MongoDB TTL index on
  `expiresAt` so Mongo removes them automatically.
- `SameSite=Lax` cookies mitigate most CSRF risk for this app's request
  patterns, but a defense-in-depth measure (a custom-header check, or a
  double-submit CSRF token) is still worth adding for state-changing
  routes — tracked for Phase 21 (Security), not done in Phase 1/2.

## Consequences

`User` does not need a `passwordResetToken`-style field for sessions;
that responsibility lives entirely in `RefreshToken`. The frontend's
Axios instance (`client/src/api/`) will need a response interceptor that,
on a 401, calls `/api/auth/refresh` once and retries the original
request — documented when Phase 2 implements it.
