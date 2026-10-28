# Decisions, Trade-offs, and Improvements

The most important architectural decisions in the project, with the
reasoning behind each, the trade-offs accepted, the alternatives
considered, and an honest assessment of whether changing it would
actually improve the project.

This is the document to read before an interview.

Each decision is labeled:

- **Intentional design decision** — a choice that's right for this
  app, even if it wouldn't be right at 10× the scale.
- **Existing limitation** — something the code doesn't do, with the
  reason.
- **Possible future improvement** — something a contributor could
  change to make the project better, with the cost.

---

## Decision 1 — One document per "user × video" relationship (the `LibraryItem` model)

### Current approach

`LibraryItem` is one user's relationship with one YouTube video. It
stores *both* the saved video's metadata (title, channel, thumbnail)
*and* the watch progress (lastPositionSec, durationSec, completed,
lastWatchedAt, progressSavedAt) — in one document.

### Why this approach

- Every page that lists saved videos wants both metadata and
  progress. Splitting them into two collections (`videos` + `progress`)
  would require a join (or two queries) on every list page.
- The natural key is `(user, videoId)` — there is exactly one
  document per (user, video) pair, with a compound unique index.
- "Saved videos" and "progress" have the same lifecycle here: a
  video is in the library *because* the user is watching it.

### Trade-offs (accepted)

- **Metadata is duplicated across users.** If 100 users save the
  same video, the title/channel/thumbnail are stored 100 times. For
  a personal app this is irrelevant; for a multi-tenant app with
  shared video metadata, you would extract a `Video` collection and
  reference it.
- **No "global" video lookup.** "Which users have saved this video?"
  requires scanning `LibraryItem` documents. Indexed by `(user, videoId)`,
  not `(videoId)`, so this would be slow. We never need this query.

### Alternatives

- **Separate `videos` and `progress` collections.** Better if video
  metadata were shared (one title for all users) — but the metadata
  here is fetched once per save and rarely changes. The duplication
  is acceptable.
- **`videos` collection + `progress` keyed by (user, video).** What
  you'd build if you added social features ("popular videos this
  week"). Out of scope.

### Would changing it improve the project? No.

The current shape fits the use case. The cost of metadata
duplication (a few KB per save) is negligible. The benefit of a
single document per page list (one query, one populate, one virtual
for `progressPercent`) is real.

---

## Decision 2 — Notes and bookmarks keyed by `(user, videoId)`, not `LibraryItem`

### Current approach

```js
const noteSchema = new mongoose.Schema({
  user: { /* … */ },
  videoId: { type: String, required: true, index: true },
  // …
})
```

Notes are *not* tied to a `LibraryItem`. They're tied to the user +
the video.

### Why this approach

- You can take notes on a video before saving it.
- Notes survive removing the video from your library — they
  reappear if you re-save.
- Looking up notes for a video is a single index hit on
  `{ user, videoId }`.

### Trade-offs (accepted)

- Notes can be created for any 11-char video id, even one that
  doesn't exist on YouTube. Harmless — the notes are yours and
  tied to an id; the UI only loads notes for the currently-watched
  video, which has been validated by the metadata route.
- The `videoId` is stored as a string, not as an ObjectId reference.
  This is correct — `videoId` isn't a foreign key, it's an external
  identifier from YouTube.

### Alternatives

- **`LibraryItem` reference.** Notes would die when the video is
  removed from the library. The whole "notebook that outlives the
  shelf" metaphor would be lost.
- **`Video` collection reference.** Would require a `Video` model
  that's distinct from `LibraryItem` — see Decision 1 for why we
  don't have one.

### Would changing it improve the project? No.

This is one of the project's nicer design touches. Keep it.

---

## Decision 3 — JWT in `localStorage`, not httpOnly cookie

### Current approach

The token is stored in `localStorage['nd_token']`. The `api()` wrapper
attaches it as `Authorization: Bearer <token>` on every request.

### Why this approach

- The API is a pure JSON API consumed by an SPA. There are no
  server-rendered pages that would benefit from cookie sessions.
- A bearer token works identically through the Vite dev proxy and in
  a future deployed setup (same origin or CORS).
- No CSRF protection needed (the API is Bearer-token authenticated,
  cookies aren't auto-sent by other origins).

### Trade-offs (accepted, knowingly)

- **XSS-readable.** A successful XSS attack could read the token.
  Mitigations: React escapes all rendered output, no
  `dangerouslySetInnerHTML` exists in the codebase, no third-party
  scripts are loaded.
- **No automatic revocation.** A token is valid until it expires
  (7 days) or until the user document is deleted (the `requireAuth`
  middleware re-fetches the user on every request). No server-side
  blocklist.

### Alternatives

- **httpOnly cookie + CSRF token.** XSS-resistant, but adds CSRF
  complexity (the cookie is auto-sent) and complicates the SPA +
  separate-API deployment. Documented as a future hardening step
  in `security.md`.
- **OAuth tokens.** Same storage trade-offs.
- **In-memory only (no localStorage).** Forces re-login on every
  refresh — bad UX. Combined with a refresh token in an httpOnly
  cookie, this is the modern best practice; not implemented here.

### Would changing it improve the project? Yes, if security becomes a priority.

For a learning project with no third-party scripts and no sensitive
data beyond video history, the current choice is fine. For a
production deployment with user-generated content (notes shared
publicly, etc.), switching to httpOnly cookies + refresh tokens
would be the right move.

---

## Decision 4 — User re-fetched on every authenticated request

### Current approach

```js
// server/src/middleware/auth.js
const user = await User.findById(payload.sub)
if (!user) throw httpError(401, 'This account no longer exists.')
req.user = user
```

### Why this approach

- Deleting an account invalidates its tokens immediately. No
  blocklist, no revocation endpoint.
- Always-fresh user data — name, email, etc. are guaranteed correct.
- One extra `findById` per authenticated request. For a personal app
  (dozens of requests per minute, max), the cost is negligible.

### Trade-offs (accepted)

- One DB query per request. At scale (thousands of requests per
  second) this would be expensive. The fix would be a short-lived
  in-memory cache (e.g., 5 seconds) — but the complexity isn't worth
  it now.

### Alternatives

- **Trust the token's claims.** Skip the DB lookup. Faster, but a
  deleted account's tokens keep working until expiry.
- **Cache the user in Redis for N seconds.** Right move at scale.

### Would changing it improve the project? No, not at this scale.

The simplicity (one line of code) outweighs the perf cost. The day
the app grows, add a 5-second cache.

---

## Decision 5 — `savedAt` conflict rule (client clock, not server timestamp)

### Current approach

Every progress PATCH may carry `savedAt` — a millisecond timestamp
from the **client's clock**. The server stores `progressSavedAt` on
the `LibraryItem`. If the request's `savedAt` is not newer than the
stored value, the write is ignored (`{ item, stale: true }`).

### Why this approach

A replayed offline write must look *old*. If the server stamped
writes on receipt, a queued write replayed hours later would arrive
"now", appear newest, and clobber progress the user made online in
between. With client timestamps, the replay carries the original
moment and the server ignores it.

### Trade-offs (accepted)

- **Clock skew.** Two devices with skewed clocks can misorder
  writes. Rare, harmless for a personal app.
- **Per-second conflict resolution absent.** Simultaneous playback
  on two devices is last-writer-wins among newer writes; the UI
  doesn't merge per-second positions.
- **Trust in the client clock.** A malicious client could set
  `savedAt` to a future timestamp and "win" against legitimate
  writes. For a single-user app, this is harmless — the user is
  attacking themselves.

### Alternatives

- **Server timestamps.** Rejected for the reason above.
- **Vector clocks / CRDT.** Real conflict resolution. Massive
  complexity. Wrong tool for a personal app.
- **Last-write-wins on server receipt time.** What you'd build if
  you didn't think about offline. Breaks offline replay.

### Would changing it improve the project? No.

The rule is small, correct for the offline-queue use case, and
documented in `progress-sync.md`. The trade-offs are accepted.

---

## Decision 6 — Only progress writes are queued offline; notes/bookmarks fail loudly

### Current approach

`api()` queues failed `PATCH /library/:id/progress` calls in
IndexedDB for replay. Notes and bookmarks fail immediately with an
error message.

### Why this approach

- A progress write is idempotent thanks to the `savedAt` rule.
  Replaying it is safe.
- A note creation is *not* idempotent. Queuing it would require
  client-generated IDs and merge logic (what if the user creates
  the same note twice offline?). We didn't build that, so we fail
  loudly instead.

### Trade-offs (accepted)

- **Offline note editing is impossible.** This is an honest
  limitation, documented in the README and `offline-support.md`.
- **Offline bookmarks are impossible.** Same.

### Alternatives

- **Client-generated IDs + last-write-wins merge.** Doable but adds
  UUID generation, conflict resolution, and merge UI. Wrong
  complexity for the current scope.
- **Background Sync API.** Browser API for deferring requests until
  connectivity returns. Not universally supported; we use an
  interval + `online` event instead.

### Would changing it improve the project? Maybe, if offline is a priority.

If you wanted offline note-taking, you'd add a `clientNoteId` field
(UUID), queue POST/PATCH/DELETE operations in IndexedDB, and replay
them. The merge would be last-write-wins per note. The cost is real
— ~200 lines of code, plus conflict UI.

---

## Decision 7 — Hand-rolled rate limiter, in-memory

### Current approach

```js
// server/src/middleware/rateLimit.js
export function rateLimit({ windowMs = 60_000, max = 30, message = '...' } = {}) {
  const hits = new Map()
  // …
}
```

A `Map` of IP → count, with a sweep when the map grows past 1000
entries.

### Why this approach

- The policy is simple. 45 lines vs. adding a dependency
  (`express-rate-limit`).
- We control the sweep behavior, the response shape, and the
  `Retry-After` header.
- For a single-process deployment, in-memory is correct.

### Trade-offs (accepted)

- **In-memory counter.** Multiple API instances behind a load
  balancer would each have their own counter — a user could exceed
  the limit by hitting different instances. Documented in
  `security.md`.
- **No persistence.** A restart resets all counters. Acceptable for
  rate limiting (the window is 60 seconds).

### Alternatives

- **`express-rate-limit`.** Same idea, more options. Adds a
  dependency for ~45 lines we'd otherwise write. The library's
  `express-slow-down` companion (gradual response delay) is nice
  but we don't need it.
- **Redis-backed limiter.** Right move at scale. Adds a Redis
  dependency and a network round-trip per check.

### Would changing it improve the project? No, not at this scale.

If the app deployed multiple API instances, switch to a Redis-backed
limiter. The interface wouldn't change — the rateLimit factory
would internally query Redis instead of a local Map.

---

## Decision 8 — Hand-rolled service worker, no Workbox

### Current approach

`client/public/sw.js` is 120 lines of vanilla service worker code.
Three caching strategies: cache-first for hashed assets, network-first
for SPA navigations, cache-first (capped) for thumbnails. `/api` is
never intercepted.

### Why this approach

- The policy is small enough to read end-to-end. Anyone reviewing
  the project can audit it.
- Workbox would generate the SW from a config file — useful for
  complex policies, overkill for ours.
- We want to *understand* what's cached and why; Workbox hides that.

### Trade-offs (accepted)

- **No Background Sync API.** We use an interval + `online` event
  for replay instead. Works everywhere; not as instant as the
  native API.
- **No precaching.** Assets are picked up on first use. Repeat
  visits are still fast (cache-first); the first visit is normal
  speed.

### Alternatives

- **Workbox.** Generated SW, precaching, runtime caching strategies,
  Background Sync plugin. Saves code, hides details. Right choice
  for a large app with many routes; overkill here.

### Would changing it improve the project? No.

The hand-rolled SW is correct and small. Switching to Workbox would
add a build step and a config file without solving a real problem.

---

## Decision 9 — Hand-rolled IndexedDB layer, no `idb` or `dexie`

### Current approach

`client/src/lib/offline.js` is ~150 lines wrapping the raw
IndexedDB API in a Promise-based `tx()` helper. Two stores (`kv`
for cache, `progressQueue` for the queue), simple get/put.

### Why this approach

- The API surface is small. Two stores, simple operations.
- Raw IndexedDB is verbose but not complex — ~50 lines of helper
  is enough.
- A library would add a dependency and a learning curve without
  materially reducing the code.

### Trade-offs (accepted)

- IndexedDB's API has quirks (transaction auto-close, version
  upgrades). The helper handles them, but if you stepped outside
  the helper you'd hit them.
- No TypeScript types for the stores.

### Alternatives

- **`idb`.** Promise-based wrapper. Saves ~30 lines.
- **`dexie`.** Higher-level, with a query API and reactive
  subscriptions. Adds ~10KB.

### Would changing it improve the project? Marginally.

Switching to `idb` would save a few lines but adds a dependency.
Not worth it for the current scope. If the offline layer grew
(per-store indexes, complex queries), `dexie` would be worth it.

---

## Decision 10 — Stats computed on read, no `Stat` collection

### Current approach

`GET /api/stats` fetches all of the user's `LibraryItem`s,
`Playlist`s (populated), counts of `Note`s and `Bookmark`s, and
folds them in plain JavaScript. Returns a JSON response.

### Why this approach

- Numbers cannot drift from source data.
- A personal library is dozens of documents, not millions. The fold
  is sub-millisecond.
- Every progress update changes the stats; recomputing on read
  always shows fresh data.

### Trade-offs (accepted)

- **O(n) per stats request.** For n in the dozens, fine. For n in
  the thousands, an aggregation pipeline would be faster.
- **One heavier request.** `Promise.all` parallelizes the four
  queries, but it's still four round-trips per stats fetch.

### Alternatives

- **Aggregation pipeline.** `$group`, `$match`, etc. running on
  MongoDB. Faster at scale; harder to read.
- **Stored stats with write-ahead updates.** Snapshot on every
  write. Two sources of truth that can drift; a write-ahead log
  to maintain.

### Would changing it improve the project? No, not at this scale.

The day a user has thousands of saved videos, switch to an
aggregation pipeline. The route's signature wouldn't change —
only the implementation.

---

## Decision 11 — Hand-set security headers, no `helmet`

### Current approach

```js
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff')
  res.set('Referrer-Policy', 'no-referrer')
  next()
})
```

### Why this approach

- The server only serves JSON. Most of `helmet`'s headers (CSP,
  HSTS, X-Frame-Options, etc.) protect against threats that don't
  apply to a JSON API.
- The two headers we set are the ones that matter: `nosniff`
  (prevents MIME-sniffing) and `no-referrer` (don't leak URLs in
  referrer headers).

### Trade-offs (accepted)

- If the server ever serves HTML (e.g., a static landing page), we'd
  need more headers. Currently it doesn't.

### Alternatives

- **`helmet`.** Sets 11+ headers. For a JSON API, most are
  irrelevant. We'd be paying a dependency for no benefit.
- **CSP.** Critical if we served HTML and loaded third-party
  scripts. Not applicable.

### Would changing it improve the project? No.

The hand-set headers are the right ones. Adding `helmet` would be
cargo-cult security.

---

## Decision 12 — Per-page `useEffect + useState`, no React Query

### Current approach

Each page fetches what it needs in a `useEffect` and holds it in
`useState`. Loading and error states are local.

### Why this approach

- The app is small. A few pages, each fetching once on mount, is
  easier to read than React Query's boilerplate.
- Server state is per-page. The library page doesn't need to know
  that the watch page saved a video; it re-fetches when it mounts.

### Trade-offs (accepted)

- **No automatic refetch on focus.** If a user has the library open
  in two tabs and saves a video in one, the other doesn't update.
- **No request deduplication.** Two components mounting at the same
  time and asking for the same data would make two requests. (This
  doesn't happen often because pages mount sequentially.)
- **Cache invalidation is manual.** After a save/delete, the page
  calls `load()` again or updates local state.

### Alternatives

- **React Query (TanStack Query).** The standard for server state in
  React. Caching, dedup, focus refetch, mutations with optimistic
  updates. Worth it at scale.
- **SWR.** Similar, smaller.

### Would changing it improve the project? Maybe, if the app grew.

For a personal app, the current pattern is fine. The day pages
start sharing data or the app needs background refetching, React
Query would be the right move. It would also replace the
hand-rolled IndexedDB read-through cache for the cacheable GET
paths.

---

## Decision 13 — Embed playlist items inside the playlist document

### Current approach

```js
items: [
  {
    libraryItem: { type: ObjectId, ref: 'LibraryItem', required: true },
    addedAt: { type: Date, default: Date.now },
  },
]
```

### Why this approach

- A playlist entry has no life of its own. Just a reference and a
  date.
- The detail view needs the whole list in one query (with
  `populate`).
- Playlist progress is `completedCount / itemCount` — a one-liner
  over the embedded array.

### Trade-offs (accepted)

- **Manual consistency.** When a video is removed from the library,
  playlist references must be `$pull`ed. The library delete route
  does this; if it didn't, the playlist detail view filters stale
  references defensively (`.filter((i) => i.libraryItem)`).
- **Document size grows with the playlist.** MongoDB's 16MB
  document limit caps a playlist at thousands of entries. Not a
  practical concern for learning playlists.

### Alternatives

- **Separate `PlaylistItem` collection.** Right move if playlist
  entries grew their own fields (per-entry notes, custom titles).
  Out of scope.

### Would changing it improve the project? No.

The current shape is correct for the use case.

---

## Decision 14 — Validation per-route, not in Mongoose schema

### Current approach

```js
// server/src/routes/auth.js
const fields = {}
if (!name || name.trim().length < 2) fields.name = 'Enter your name (at least 2 characters).'
if (!email || !EMAIL_RE.test(email.trim())) fields.email = 'Enter a valid email address.'
if (!password || password.length < MIN_PASSWORD_LENGTH) fields.password = '...'
if (Object.keys(fields).length > 0) {
  throw httpError(400, 'Please check the highlighted fields.', fields)
}
```

### Why this approach

- The route is the only place that knows what the *request* shape
  should be. `password ≥ 8 chars` is a request-level concern; the
  schema only needs `passwordHash` (the *stored* shape).
- Per-field error messages are tailored to be human-readable and
  rendered inline by the form.
- Mongoose's schema validation (`required`, `maxlength`, etc.) is a
  backstop — it catches anything that slips past the route-level
  check and produces a `ValidationError` the central handler
  converts to a 400.

### Trade-offs (accepted)

- **Some duplication.** The `Note.text` length limit (2000) is in
  both the schema and the route. If they drift, the route's check
  wins (it runs first), but the schema's check is a backstop.

### Alternatives

- **`express-validator` / `zod` / `joi`.** Schema-based validation
  with auto-generated error messages. Adds a layer of indirection
  and a dependency.
- **Mongoose schema validation only.** Loses per-field custom
  messages.

### Would changing it improve the project? Marginally.

For a project with dozens of endpoints, a validation library would
reduce duplication. For 7 route files, the per-route pattern is
clearer.

---

## Decision 15 — "Fat routes", no separate controller/service layer

### Current approach

`server/src/routes/library.js` is 255 lines. It contains the route
handlers, validation, and the domain logic (the `savedAt` conflict
rule, the auto-complete at 95%, the dedup logic).

### Why this approach

- For the current size, splitting `routes/library.js` into
  `routes/library.js` + `controllers/library.js` +
  `services/library.js` would triple the file count without
  clarifying anything.
- The route handler *is* the controller. Domain rules (savedAt,
  dedup, stats fold) are short enough to live inline.

### Trade-offs (accepted)

- **Routes are harder to unit-test without booting the app.** The
  integration tests boot the real app, which sidesteps this.
- **If routes grew to 1000+ lines, they'd become untestable.** At
  that point extract services.

### Alternatives

- **MVC with separate controllers.** Standard for larger apps.
- **Service layer.** Right move when domain logic gets complex.

### Would changing it improve the project? No, not now.

The day `routes/library.js` exceeds ~500 lines or shares logic with
another route, extract a service. Right now the fat-route pattern
is correct.

---

## Existing Limitations (honest list)

These are things the code does not do. They are documented as
limitations, not as bugs:

- **No HTTPS termination.** The dev setup runs over HTTP. Production
  would sit behind a reverse proxy (Caddy, nginx, Cloudflare).
- **No email verification, password reset, or account lockout.** Out
  of scope.
- **No real WebSocket / SSE.** Progress is PATCHed every 10 seconds.
  Real-time collaboration would need this.
- **No browser-side E2E tests** (Playwright, Cypress). Manual
  verification was used during development. The next step if
  regressions start showing up there.
- **Data API search/import not exercised against the real API.**
  Mocked in tests; no-key path verified E2E; full path requires a
  real key the sandbox doesn't have.
- **No production deployment setup.** This is a local development
  project. A real deployment would need HTTPS, a process manager
  (PM2, systemd), and a managed MongoDB (Atlas) or a self-hosted
  one with backups.
- **No multi-device sync for notes/bookmarks.** They live on the
  server; the offline cache is per-browser-profile.
- **No drag-and-drop playlist reordering.** Arrow buttons work today.
- **No HTTPS-only cookie option for the JWT.** Documented as a
  future hardening step.
- **The rate limiter is in-process.** Multi-instance deployments
  would need Redis.
- **Stats are not paginated.** If a user had thousands of saved
  videos, the stats fold would be slow. Aggregation pipeline would
  be the fix.
- **No CSRF protection.** The API is Bearer-token authenticated, so
  cookies aren't auto-sent. If you switched to cookie auth, you'd
  need CSRF tokens.
- **The offline cache is per-browser-profile, unencrypted.**
  Cleared on logout. Acceptable for learning data; worth revisiting
  if notes ever became sensitive.
- **`react-router-dom` v7 changed several APIs from v6.** The code
  uses the new shape; if you find old tutorials they may be
  misleading.

---

## Possible Future Improvements (worth doing)

These are changes that *would* improve the project, with the cost:

### 1. Add Playwright E2E tests for the player and offline flows

**Why:** the integration tests cover the API; the player wiring,
focus mode, and offline UI are verified manually. Regressions there
are easy to miss.

**Cost:** Playwright adds a ~50MB dev dependency. Tests would run
in a real browser, slower than the integration suite. The benefit
is real coverage of the most fragile parts of the app.

### 2. Switch to httpOnly cookies for the JWT

**Why:** XSS-resistant. The current `localStorage` approach is the
standard SPA trade-off; switching to cookies + refresh tokens is the
modern best practice.

**Cost:** adds CSRF protection (because cookies are auto-sent),
refresh token endpoint, and changes the deployment shape (cookies
need same-site or SameSite=None+Secure).

### 3. Add Redis for the rate limiter (when going multi-instance)

**Why:** in-memory counter only works for one process. Behind a
load balancer, each instance has its own counter.

**Cost:** Redis dependency, a network round-trip per check. The
`rateLimit` factory interface wouldn't change.

### 4. Add React Query for server state (if the app grew)

**Why:** automatic refetch on focus, request dedup, simpler cache
invalidation. The current `useEffect + useState` pattern is fine for
a personal app but doesn't scale.

**Cost:** a dependency, a different mental model. Would replace the
hand-rolled IndexedDB read-through cache for the cacheable GET
paths.

### 5. Add Background Sync API for the progress queue

**Why:** instant replay on reconnect, no 30-second interval.

**Cost:** not universally supported; would need a fallback to the
current interval for unsupported browsers.

### 6. Drag-and-drop playlist reordering

**Why:** nicer UX than arrow buttons.

**Cost:** a DnD library (`@dnd-kit/sortable` is the modern choice)
or hand-rolled HTML5 drag events. ~100 lines.

### 7. Syncing note edits offline (client-generated IDs + LWW merge)

**Why:** lets users take notes offline.

**Cost:** UUID generation, queue for POST/PATCH/DELETE operations,
merge UI for conflicts. ~300 lines.

### 8. Switch to aggregation pipeline for stats (when scale demands)

**Why:** faster for large libraries.

**Cost:** `$group`/`$match` pipeline. The route's signature
wouldn't change.

### 9. Add HTTPS termination (production)

**Why:** required for any real deployment.

**Cost:** a reverse proxy (Caddy is the easiest), TLS certs (Let's
Encrypt).

### 10. Add per-user analytics / quota tracking for the Data API

**Why:** if multiple users share one server's API key, you'd want
per-user quota tracking.

**Cost:** a `QuotaLog` collection, a per-user counter, a UI. Out
of scope for a personal app.

---

## Decision-Making Heuristic

When you face a new architectural decision in this project, ask:

1. **Is the current approach actually causing a problem?** If not,
   don't change it.
2. **Is the new approach simpler or just newer?** Newer is not
   better. Simpler is.
3. **Does the new approach add a dependency?** If yes, what does it
   pay for? Is that worth the install size and learning curve?
4. **Will this approach scale 10× without rearchitecting?** If yes,
   it's the right shape. If not, is the 10× scenario realistic?
5. **Can the change be made incrementally, with tests passing at
   each step?** If yes, do it. If it requires a big-bang rewrite,
   don't.

The project's design choices are deliberate for the current scope.
Changing them without a real reason adds complexity without value.

---

Next: [`practical-guides.md`](practical-guides.md) for how to make
common changes safely.
