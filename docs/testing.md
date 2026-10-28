# Testing

Two complementary suites, chosen for what each is good at:

| Suite | Command | What it is |
| --- | --- | --- |
| Integration tests | `npm test` (root) or `npm --prefix server test` | Node's built-in `node:test` runner, the real Express app, real MongoDB, YouTube mocked |
| Live smoke test | `bash scripts/api-test.sh` | bash + curl against a running dev stack, real oEmbed network calls |

## The Integration Suite (`server/tests/`)

`node --test tests/` runs each `*.test.js` file in its own process:

- **`api.test.js`** — boots the actual app from
  [`server/src/app.js`](../server/src/app.js) (the app/startup split in
  `index.js` exists for exactly this) on an **ephemeral port**, against a
  dedicated `no-distractions-test-*` database. Collections are wiped
  between tests.
- **`youtube-utils.test.js`** — pure unit tests for URL parsing and
  ISO-8601 duration parsing; no database, no network.

**Mocking YouTube.** The server calls YouTube through global `fetch`
(oEmbed for metadata, Data API v3 for search/import). The tests replace
`globalThis.fetch` with a URL-dispatching fake
([`tests/helpers.js`](../server/tests/helpers.js)): canned oEmbed
responses (including a 404 "private video"), and canned Data API
responses with real-shaped ISO durations like `PT1H2M3S`. This is why the
suite can test the full search/import path — quota costs, key handling,
and 403-quota-exhausted behavior included — without any API key.

**Rate limiting under test.** The auth limiter counts per IP. Each test
client spoofs a unique `X-Forwarded-For` (the app trusts one proxy hop),
so normal tests never trip the limit — and a dedicated test proves the
limit itself: hammering `/auth/login` from one IP ends in a 429 while a
different IP still logs in fine.

**What is covered** (30 tests): signup/login/token flows and the
no-enumeration rule; metadata validation; keyless-search 501; mocked
search with parsed durations; library save/dedup/single-lookup; the full
`savedAt` conflict rule (stale replays ignored, newer writes win,
auto-complete at 95 %, deliberate rewind); filters/sort/search/pagination;
playlist lifecycle, reorder permutation validation, delete-pulls-items,
import with dedup; notes CRUD; bookmarks CRUD + duplicate guard;
**cross-user isolation**; stats correctness; rate limiting.

Run it (needs a local MongoDB on 27017):

```bash
npm test            # from the repo root
```

## The Live Smoke Test (`scripts/api-test.sh`)

45 curl checks against a *running* stack (`npm run dev`): the same golden
paths plus the things a mock cannot prove — oEmbed actually reachable
from your network, the dev proxy working, real HTTP status codes. It
creates throwaway accounts (`$RANDOM` emails) and cleans up after itself.

Use it when you want to know "does my machine run this app correctly";
use the integration suite to know "does the code behave correctly".

## What Is *Not* Automatically Tested

- Browser-side behavior (player wiring, focus mode, offline UI). These
  were verified manually during development; a Playwright layer would be
  the natural next step if regressions start showing up there.
- The real YouTube Data API — quota costs and response shapes are
  documented in [youtube-integration.md](youtube-integration.md) and
  mocked in tests; only a real key exercised them end to end.
