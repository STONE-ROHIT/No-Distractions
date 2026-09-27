# routes/

Express `Router` instances — one file per resource. A route file wires an
HTTP method + path to route-level middleware (`requireAuth`, `validate`,
rate limiting) and a controller function; it contains no logic of its own.

- `health.routes.ts` — liveness check, no auth.
- `auth.routes.ts` — register/login/refresh/logout. Register and login sit
  behind a rate limiter (credential-guessing endpoints); refresh and
  logout don't need `requireAuth` — they authenticate via the refresh
  cookie itself, checked inside the controller/service.
- `users.routes.ts` — `GET /me`, behind `requireAuth`. The template for
  every other protected route from Phase 4 onward.
