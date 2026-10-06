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
- `Video.ts` — global metadata cache keyed by `youtubeVideoId` (unique),
  fetched from the YouTube Data API once and reused for every user who
  imports the same video. `embeddable` is checked before rendering the
  player, not discovered by a broken embed.
- `LibraryItem.ts` — "this video is in this user's library"; unique on
  `(user, video)`. See [ADR-003](../../../docs/22-architecture/decisions/ADR-003-database-schema-design.md).
- `WatchProgress.ts` — one document per (user, video); `durationSeconds`
  is a snapshot of what the *player* reported at save time, not
  `Video.durationSeconds` — see docs/13-learning-features.
