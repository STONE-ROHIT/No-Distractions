# services/

Business logic that doesn't belong to HTTP (`controllers/`) or to the
database specifically (`repositories/`). Called by controllers, calls
repositories — never a Mongoose model directly.

- `user.service.ts` — public-shape mapping, `getCurrentUser`.
- `auth.service.ts` — registration, login, refresh rotation, logout.
- `youtubeApi.ts` — the ONLY file that calls the YouTube Data API
  (`fetch`, not the heavy `googleapis` SDK — see
  [ADR-005](../../../docs/22-architecture/decisions/ADR-005-youtube-embedding.md)).
  Every automated test mocks this exact file — no test in this repo makes
  a real network call to YouTube.
- `video.service.ts` — parses a URL, calls `youtubeApi.ts`, upserts via
  `repositories/video.repository.ts`, and (currently) adds each imported
  video to the importing user's library — see `models/LibraryItem.ts`'s
  comment for why that's a Phase 4 decision, not a Phase 8 one.
- `library.service.ts` — thin: fetches a user's `LibraryItem`s and maps
  them to the public response shape.
- `progress.service.ts` — saves playback position, computes percentage
  and auto-completion (90% threshold, `COMPLETION_THRESHOLD_PERCENT` in
  `models/WatchProgress.ts`) unless the caller explicitly overrides
  `completed` (the "Mark complete" button); also serves the
  Continue-Learning list.
