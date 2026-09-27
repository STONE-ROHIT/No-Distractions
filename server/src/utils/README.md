# utils/

Small, pure, side-effect-free helpers with no knowledge of Express or
Mongoose:

- `logger.ts` — the shared Pino instance.
- `password.ts` — bcryptjs hashing, plus a timing-attack mitigation for
  login (see its comment).
- `tokens.ts` — access-token (JWT) signing/verification and refresh-token
  (opaque, hashed) generation.
- `cookies.ts` — sets/clears both auth cookies with consistent options in
  one place, so their `httpOnly`/`secure`/`sameSite`/`path`/`maxAge`
  settings can't drift out of sync between the login, register, and
  refresh handlers.
