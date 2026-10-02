# ADR-005: YouTube integration approach

## Context

The brief is explicit and non-negotiable: no scraping, no stream
extraction, no ad/DRM bypass, no unofficial download mechanisms. Within
that constraint, the product still needs video metadata (to show a
library, titles, thumbnails, durations) and actual playback.

## Decision

Two separate, officially-supported integrations, each doing one job:

- **Metadata** — the YouTube Data API v3, called server-side with an API
  key, for `videos.list`, `playlists.list`, and `playlistItems.list`
  only. Never used to fetch or proxy a video stream — only the fields
  listed in `docs/09-mongodb`'s `Video` schema.
- **Playback** — YouTube's own embedded player, loaded directly in the
  visitor's browser via an `<iframe>` pointed at
  `youtube-nocookie.com/embed/{id}` (not `youtube.com/embed/{id}`). This
  is YouTube's own privacy-enhanced embed domain: it doesn't set YouTube's
  tracking cookie until the visitor actually presses play, which fits a
  product built around removing exactly this kind of ambient tracking.
  `rel=0` is also set — see "Known limitations" below for exactly what it
  does and doesn't do.
- **No `googleapis` SDK** — the official Node client library for Google
  APIs is a single package covering every Google API Google ships, which
  is a lot of dependency weight for three REST calls with simple query
  parameters. `server/src/services/youtubeApi.ts` calls them directly
  with native `fetch` (stable in Node 18+, well within this project's
  Node 22 baseline) instead.

## Alternatives considered

- **The full IFrame Player JS API from Phase 4** (loading YouTube's
  `iframe_api` script and creating a `YT.Player` instance for
  programmatic control) — not yet: Phase 4 only needs a video to display
  and play, which a plain iframe does. The JS API is real additional
  complexity (script loading, a global callback, an event-driven
  lifecycle) that's only worth it once something needs to call methods on
  the player — which is exactly Phase 5 (progress tracking needs
  `getCurrentTime`; keyboard shortcuts need `seekTo`/`playVideo`). Adding
  it now would mean carrying that complexity through a phase that has no
  use for it yet.
- **Importing a playlist URL creates a `Playlist` record** — the brief
  lists "playlist metadata" under this phase, but the user-facing
  `Playlist` (learning playlist) model and its CRUD don't exist until
  Phase 7. Resolved by having a playlist import fetch and store every
  video in it (each as an ordinary `Video`, added to the importing user's
  library) without yet grouping them into a persisted `Playlist` — Phase
  7 adds that grouping on top of videos that already exist. The
  alternative (blocking playlist import until Phase 7) would mean the
  brief's own Phase 4 deliverable, "playlist metadata," has literally
  nothing built against it for three more phases.
- **"Save" as a separate action from "import"** — the original schema
  design ([ADR-003](./ADR-003-database-schema-design.md)) treats
  `LibraryItem` as Phase 8's responsibility. Revised here: there's no
  "browse without saving" yet (no public search, no recommendations by
  design) — importing a video *is* the only way to encounter one right
  now, so treating import as implicitly saving it is what makes an
  imported video findable again at all, rather than requiring Phase 8 to
  exist before an imported video can be found twice. Phase 8 still has
  real work left (filters, sorting, search, saved *playlists*) on top of
  this.

## Known limitations

- **`rel=0` does not fully disable related-video suggestions.** Since a
  September 2018 YouTube policy change, it only restricts them to videos
  from the *same channel* rather than suppressing them outright. There is
  no parameter that fully disables this; a channel with other public
  videos will still show some as suggestions at the end, regardless.
- **`modestbranding` is deliberately not set** — it's been deprecated and
  has no effect since the same 2018 change, so setting it would be dead
  configuration.
- **The YouTube logo in the player controls cannot be removed** — this is
  a YouTube Terms of Service requirement, not a technical limitation to
  work around.
- **Some videos can't be embedded at all** — a creator can disable
  embedding; the Data API's `status.embeddable` field is checked and
  stored at import time specifically so the video page can show a
  "watch on YouTube" fallback instead of a broken, blank player (see
  `features/videos/components/VideoPlayer.tsx`).
- **Daily quota**: the YouTube Data API's default free quota is 10,000
  units/day. `videos.list` and `playlistItems.list` cost 1 unit per call
  regardless of how many IDs/items are requested (this project batches up
  to 50 per call), so importing even a 200-video playlist costs roughly 5
  units. The quota risk is `search.list` (100 units/call) — not used
  anywhere in this codebase; Phase 14 (Search) will need to budget for it
  specifically when it's built.
- **Playlist imports cap at 200 videos** (4 pages of 50) — an explicit,
  documented limit (`MAX_PLAYLIST_PAGES` in `youtubeApi.ts`) rather than
  unbounded pagination against an arbitrarily large playlist.

## Consequences

`server/src/services/youtubeApi.ts` is the only file in the codebase that
calls `fetch` against `googleapis.com`, and the only one every automated
test mocks instead of hitting (there is no YouTube connectivity in this
project's CI/build environment, so this boundary is also what makes the
import flow testable at all — see `docs/11-youtube-integration`'s testing
section).
