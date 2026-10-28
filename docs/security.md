# Security & Performance Notes

What is actually protected, how, and where the limits are. Cross-references:
[authentication.md](authentication.md) (auth flow),
[request-lifecycle.md](request-lifecycle.md) (validation path),
[offline-support.md](offline-support.md) (client-side data).

## Authentication & Authorization

- Passwords: bcryptjs with 10 rounds; hashes never appear in any JSON
  response (stripped in the `User` toJSON transform).
- Sessions: JWT (`sub` = user id, 7-day expiry) in the client's
  `localStorage`, sent as `Authorization: Bearer …`. The user document is
  re-loaded from MongoDB on **every** authenticated request — a deleted
  account stops working immediately.
- Authorization is **ownership filtering**, not role checks: every query
  includes `user: req.user._id`, so another user's document simply is not
  found (404). The client never sends its own user id; identity always
  comes from the verified token (`req.user`).
- No account enumeration: login failures return one identical 401.

## Input Validation

Every route validates before touching the database: per-field `400`
responses with messages the forms render inline. Things worth knowing:

- **NoSQL injection**: user input is never interpolated into query
  *objects* as raw objects — values are compared as typed scalars
  (`findOne({ videoId: String(videoId) })`), and Express's `express.json`
  body parser produces plain objects that Mongoose casts against the
  schema. The one place input becomes a `RegExp` (library search) runs
  through `escapeRegex()` first.
- ObjectIds in URLs are validated by Mongoose's cast — malformed ids
  become a clean 400 (`CastError` handler in the central error handler),
  never a query error leak.
- Unknown/oversized values are rejected with explicit bounds (note length
  ≤ 2000, labels ≤ 120, titles ≤ 100, `durationSec` ≤ 48 h, search query
  2–100 chars).

## Rate Limiting

[`server/src/middleware/rateLimit.js`](../server/src/middleware/rateLimit.js)
is a fixed-window, in-memory limiter (a `Map` of ip → count):

| Endpoint group | Limit | Why |
| --- | --- | --- |
| `/api/auth/*` | 20 / minute / IP | bcrypt cost + brute-force target |
| `/api/videos/search`, `/api/videos/playlist` | 10 / minute | each search costs 100 Data API quota units |
| `/api/playlists/import` | 5 / minute | same quota reasoning |

429 responses carry `Retry-After`. **Known limit:** the counter lives in
one process — running multiple API instances behind a load balancer would
need a shared store (Redis). Documented rather than solved; this app runs
one process.

## Headers & CORS

- CORS allows exactly one origin (`CLIENT_ORIGIN`, default
  `http://localhost:3000`) — the browser app.
- `X-Content-Type-Options: nosniff` and `Referrer-Policy: no-referrer`
  are set by a small hand-written middleware. We skipped `helmet`'s
  eleven sub-packages deliberately: this server only ever serves JSON, so
  most of helmet's header sweep protects nothing here. The trade-off is
  spelled out in the middleware comment in `server/src/app.js`.
- Errors never leak internals: unexpected errors log server-side and
  return a generic 500 message; only intentional client-error messages
  are shown to users.

## What Is Knowingly Not Hardened

An honest list beats a false sense of safety:

- No HTTPS termination in this repo (dev setup; production would sit
  behind a reverse proxy).
- Tokens in `localStorage` (not httpOnly cookies) — the standard XSS
  trade-off of this design; React escapes all rendered output and no
  `dangerouslySetInnerHTML` exists in the codebase.
- No CSRF protection: the API is Bearer-token authenticated, so cookies
  are not auto-sent by other origins.
- No email verification, password reset, or account lockout (scope).
- The offline IndexedDB cache is per-browser-profile, unencrypted, and
  cleared on logout — acceptable for learning data, worth revisiting if
  notes ever become sensitive.

## Performance Notes (Small, Deliberate)

- **Indexes where queries actually look**: `{ user, videoId }` unique on
  LibraryItem, `{ user }` on Playlist/Note/Bookmark, `{ user, videoId }`
  on Note/Bookmark for the per-video lookups.
- **One fetch per screen**: the library page fetches the full list once
  and filters client-side (personal libraries are small; this keeps tab
  counts instant and avoids a request per filter click). The server
  offers `?q=&status=&sort=&limit=` for API consumers who need them.
- **Stats fold documents in JS** instead of an aggregation pipeline —
  dozens of documents, not thousands; readability over premature
  optimization.
- **Player → API chatter is bounded**: one progress PATCH per ~10 s of
  playback, plus final saves on pause/end/unmount/tab-hide.
- The service worker's static caching is a performance feature too:
  repeat visits load assets from the disk cache.
