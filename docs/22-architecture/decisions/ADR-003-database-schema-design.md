# ADR-003: Database schema design

## Context

The brief proposes six collections: `User`, `Video`, `Playlist`,
`WatchProgress`, `Note`, `Bookmark` — and explicitly invites a better
normalized design if one exists ("You may modify this schema if a better
normalized/design approach is appropriate").

## Decision

Keep all six, and add two:

- **`LibraryItem`** (`user`, `video`, `savedAt`) — represents "this video
  is explicitly saved to my library", independent of both watch progress
  and playlist membership. Without it, "Save" (mentioned throughout the
  brief as its own button, separate from "Mark Complete") would have no
  home: it can't reuse `WatchProgress`, because saving a video you haven't
  watched yet shouldn't require a fabricated progress record, and it
  can't reuse `Playlist`, because a saved video isn't necessarily in any
  playlist. A unique compound index on `(user, video)` makes "is this
  saved?" and "add to library" both single, unambiguous operations.
- **`RefreshToken`** (`user`, `tokenHash`, `expiresAt`, `revokedAt`) —
  required by the authentication strategy in
  [ADR-002](./ADR-002-authentication-strategy.md): storing a hash per
  session (rather than a single counter on `User`) is what makes
  per-device logout and refresh-token rotation possible.

Every user-owned collection (`LibraryItem`, `Playlist`, `WatchProgress`,
`Note`, `Bookmark`, `RefreshToken`) indexes `user` (and, where relevant,
the compound `(user, video)`), since literally every query in this app is
scoped to "the current authenticated user's data" — see
`docs/21-security` (Phase 13) on why the user ID always comes from the
verified token, never from the request body.

`Video` stays a single global collection keyed by `youtubeVideoId`
(unique), not duplicated per user — many users can import the same
YouTube video, and its metadata (title, thumbnail, duration) is the same
for everyone, so it's fetched from the YouTube Data API and cached once.

## Alternatives considered

- **Embed `LibraryItem`-equivalent data as a flag on `WatchProgress`**
  (e.g. `WatchProgress.saved: boolean`) — rejected because it would force
  creating a `WatchProgress` document (with a meaningless `0%` position)
  just to save a video, conflating "I want to learn this later" with "I
  have started learning this".
- **Embed playlist videos as full `Video` sub-documents** inside
  `Playlist` instead of an array of `{ video: ObjectId, order, addedAt }`
  references — rejected because the same video is frequently in more than
  one playlist and in the library independently; embedding would
  duplicate and desynchronize metadata (e.g. a refreshed title) across
  every playlist containing that video.

## Trade-offs

Two extra collections mean two extra indexes to maintain, and a couple of
extra queries in places (e.g. rendering a video page now needs `Video` +
`WatchProgress` + `LibraryItem`-membership + this user's `Note`s +
`Bookmark`s — five reads instead of the brief's original three). All five
are indexed single-document or small-range lookups, not collection scans,
so this is a reasonable cost for the clearer semantics.

## Consequences

Collections: `User`, `RefreshToken`, `Video`, `LibraryItem`, `Playlist`,
`WatchProgress`, `Note`, `Bookmark`. Full field-level schemas live in
`docs/09-mongodb/` once Phase 2 introduces the first Mongoose models
(`User`, `RefreshToken`) — this ADR is the reasoning, not the field
reference, so it won't go stale as fields evolve.
