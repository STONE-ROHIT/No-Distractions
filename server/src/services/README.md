# services/

Business logic that doesn't belong to HTTP (that's `controllers/`) or to
the database specifically (that's `repositories/`). Called by controllers,
calls repositories — never the other way around, and never a Mongoose
model directly.

- `user.service.ts` — shaping a Mongoose `User` document into the public
  response shape (`toPublicUser`, used by every endpoint that returns a
  user), and fetching the current user for `GET /api/users/me`.
- `auth.service.ts` — registration, login, refresh-token rotation, and
  logout. Orchestrates `utils/password.ts`, `utils/tokens.ts`, and the
  `user`/`refreshToken` repositories; owns none of them directly.
