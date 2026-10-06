# 09 · MongoDB

## Why MongoDB for this project

MongoDB stores **documents** (JSON-like objects) in **collections**,
rather than rows in fixed-schema tables the way a SQL database does. Two
things about this project's data made that a good fit ([ADR-003](../22-architecture/decisions/ADR-003-database-schema-design.md)
has the full reasoning): most of this app's data is naturally
document-shaped (a `Playlist` really is "a title plus an ordered list of
videos" — no join needed to read it back), and the schema has room to grow
(new fields on `User.preferences`, for instance) without a migration.

**Document** — one JSON-like record, e.g. one user. **Collection** — a
named group of documents, e.g. all users. **`_id` / `ObjectId`** — every
document's unique identifier, auto-generated unless you provide one; it
embeds a creation timestamp, which is occasionally useful on its own.

## Mongoose

MongoDB's own driver is schema-less by design — you can `insert` any
shape of document into any collection. **Mongoose** sits on top of it as
an ODM (Object Data Modeling library): you define a `Schema` describing
the shape you *expect*, and Mongoose validates against it, gives you a
query API, and lets TypeScript infer types from it. Every model in this
project (`server/src/models/`) is a Mongoose schema, queried only through
the matching file in `server/src/repositories/` — see
[08-backend-architecture](../08-backend-architecture/).

## Collections implemented so far

### User

```ts
{
  name: string,
  email: string,        // unique, lowercase, indexed
  passwordHash: string, // select: false — never returned unless explicitly requested
  avatar?: string,
  preferences: {
    theme: 'light' | 'dark' | 'system',
    autoplayNext: boolean,
    defaultPlaybackRate: number,
  },
  createdAt: Date,
  updatedAt: Date,
}
```

`passwordHash`'s `select: false` is doing real work: a plain
`User.findOne({ email })` — the call every route except login makes —
simply does not receive the hash at all, at the database level. Only
`findUserByEmailWithPassword` (used exclusively by login) opts back in
with `.select('+passwordHash')`. See `server/src/models/User.ts`.

### RefreshToken

```ts
{
  user: ObjectId,       // ref: 'User', indexed
  tokenHash: string,    // SHA-256 of the raw token; unique
  createdAt: Date,
  expiresAt: Date,      // TTL index — MongoDB deletes the document once this passes
  revokedAt: Date | null,
}
```

The `expiresAt` field has a **TTL (time-to-live) index**
(`index: { expires: 0 }`) — a background process MongoDB runs itself,
deleting documents whose `expiresAt` is in the past. No cron job, no
manual cleanup query; expired sessions disappear on their own. See
`server/src/models/RefreshToken.ts` and
[10-authentication](../10-authentication/) for how rotation and reuse
detection use this collection.

## Common query patterns introduced this phase

```ts
// Opting into a select:false field only where it's genuinely needed:
User.findOne({ email }).select('+passwordHash');

// A TTL index needs no query of its own — it's enforced by MongoDB itself:
new Schema({ expiresAt: { type: Date, index: { expires: 0 } } });
```

### Video

```ts
{
  youtubeVideoId: string, // unique, indexed — the global cache key
  title: string,
  description: string,
  thumbnailUrl: string,
  channelTitle: string,
  channelId: string,
  durationSeconds: number,  // parsed from the API's ISO 8601 duration
  embeddable: boolean,      // from the API's status.embeddable
  publishedAt: Date,
  lastMetadataRefresh: Date,
  createdAt: Date,          // standard Mongoose timestamp — see the note below
}
```

One global document per YouTube video, however many users import it —
fetched from the YouTube Data API once and reused. See
`server/src/repositories/video.repository.ts`'s `upsertVideoFromApi`,
which also *refreshes* the stored metadata if the video is imported
again (a title or thumbnail can change after the fact).

A worked example of a real Mongoose gotcha: `Video` originally used a
custom-named timestamp field (`{ timestamps: { createdAt: 'importedAt' }
}`) for a more descriptive name. That broke Mongoose's generated
TypeScript document type for the *entire* schema — not just that one
field, but every field, even `_id`, started type-checking as `unknown` at
every call site. Switched to plain `{ timestamps: true }` (so the field
is `createdAt`, not `importedAt`) rather than fight the type system for a
field-name preference — see `models/Video.ts`'s comment and
[ADR-005](../22-architecture/decisions/ADR-005-youtube-embedding.md).

### LibraryItem

```ts
{
  user: ObjectId,   // ref: 'User', indexed
  video: ObjectId,  // ref: 'Video'
  savedAt: Date,
}
```

Unique on `(user, video)`. "This video is in this user's library" —
created automatically when a video is imported (see
`docs/11-youtube-integration`'s import flow and
[ADR-005](../22-architecture/decisions/ADR-005-youtube-embedding.md) for
why saving isn't a separate action from importing, for now). Populated
via Mongoose's `.populate('video')` in
`repositories/libraryItem.repository.ts`'s `findLibraryByUser` — a
worked example of populate in this codebase, including the TypeScript
wrinkle it introduces (a populated field's static type doesn't
automatically change from `ObjectId` to the full document; see that
file's repository and `services/library.service.ts`'s cast).

### WatchProgress

```ts
{
  user: ObjectId,          // ref: 'User', indexed
  video: ObjectId,         // ref: 'Video'
  positionSeconds: number,
  durationSeconds: number, // the PLAYER's reported duration at save time, not Video.durationSeconds
  percentage: number,      // 0–100, computed server-side
  completed: boolean,      // auto (>=90%) unless explicitly overridden
  lastWatchedAt: Date,
}
```

Unique on `(user, video)` — "save progress" is always an upsert. See
[13-learning-features/progress-tracking](../13-learning-features/progress-tracking.md)
for the full save/resume flow and exactly how `percentage` and
`completed` get computed.

Query pattern worth knowing: `findInProgressForUser` (the entire
"Continue Learning" feature) is `{ completed: false, percentage: { $gt: 0
} }`, sorted by `lastWatchedAt` descending — no separate aggregation or
denormalized counter needed.

## Still to come

Field-level schemas for `Playlist`, `Note`, and `Bookmark` are documented
here once their phase implements them (7, 6, 6 respectively) — the full
target shape for all eight collections is already in
[ADR-003](../22-architecture/decisions/ADR-003-database-schema-design.md),
but this page only documents models that actually exist in the code right
now.
