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

## Still to come

Field-level schemas for `Video`, `LibraryItem`, `Playlist`,
`WatchProgress`, `Note`, and `Bookmark` are documented here once their
phase implements them (4, 4/8, 7, 5, 6, 6 respectively) — the full target
shape for all eight is already in
[ADR-003](../22-architecture/decisions/ADR-003-database-schema-design.md),
but this page only documents models that actually exist in the code right
now.
