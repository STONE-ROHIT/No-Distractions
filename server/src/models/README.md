# models/

Mongoose schemas and models — one file per collection. Defines shape,
validation, and indexes; queried only through the matching repository in
`repositories/`, never directly from a controller or service.

- `User.ts` — `passwordHash` is `select: false` by default (must opt in
  with `.select('+passwordHash')`) so it can't accidentally leak into a
  response.
- `RefreshToken.ts` — one document per active session, hashed at rest,
  with a TTL index that auto-deletes expired sessions. See
  [ADR-002](../../../docs/22-architecture/decisions/ADR-002-authentication-strategy.md).
