# Concepts and Foundations

This document introduces the prerequisite concepts behind No
Distractions — but only through the project itself. Each concept is
explained briefly and then anchored to real code so the explanation is
useful rather than generic.

Read this if you are unfamiliar with any of: HTTP requests, REST,
Express middleware, Mongoose schemas, React state and hooks,
asynchronous JavaScript, or JWT authentication.

---

## 1. HTTP Requests and Responses

### The concept

An **HTTP request** is a text message from a client (the browser) to a
server. It has:

- a **method** (GET, POST, PATCH, DELETE, …),
- a **path** (e.g. `/api/library`),
- **headers** (key/value metadata, including `Authorization`), and
- an optional **body** (for POST/PATCH/PUT).

The server replies with an **HTTP response**: a **status code**
(200/201/400/401/404/500/…), headers, and usually a body. REST APIs
conventionally use JSON for the body and use the status code as the
machine-readable outcome.

### In this project

Open `server/src/app.js`. Express is the framework that turns raw HTTP
requests into JavaScript function calls. Each `app.use(...)` registers
a middleware that runs for every request that matches its path. Each
`router.get('/path', handler)` registers a route handler for a specific
method+path combination.

When the browser sends `POST /api/library` with a JSON body,
Express:

1. parses the body via `app.use(express.json())` → `req.body` is now a
   JavaScript object;
2. matches the request to a router mounted at `/api/library`;
3. runs the router's middleware chain — `requireAuth` first, then the
   route handler;
4. lets the handler either `res.json(...)` (success) or `throw`
   (error → central error handler).

A 201 response means "created"; 400 means "you sent bad input"; 401
means "you are not authenticated"; 404 means "I cannot find that"; 500
means "I broke". The central error handler in
`server/src/middleware/errorHandler.js` is where every thrown error is
mapped to one of these.

### Alternatives and trade-offs

- **GraphQL** instead of REST: one endpoint, client picks fields. Pays
  off when clients have wildly different data needs; for a small app
  with a handful of screens it adds a query layer without saving
  network round-trips. We do not use it.
- **WebSockets / SSE** for real-time: not needed; the data here is
  per-user, write-on-event. A progress PATCH every 10 seconds is well
  within HTTP's comfort zone.

### How to extend

Adding a new endpoint = adding a route handler. See
[`practical-guides.md`](practical-guides.md#adding-an-api-endpoint).

---

## 2. REST Conventions

### The concept

REST ("Representational State Transfer") is a style where URLs identify
resources (`/api/library/123`), HTTP methods express intent
(`GET` read, `POST` create, `PATCH` update, `DELETE` remove), and
state is conveyed in the body.

### In this project

The endpoint inventory lives in [`api-and-data-design.md`](api-and-data-design.md).
A few patterns are worth noting:

- **Resource collections vs single items.** `/api/library` returns the
  list; `/api/library/:itemId` addresses one item. `/api/notes` lists;
  `/api/notes/:id` edits one.
- **Nested sub-resources.** `/api/playlists/:id/items` adds a video to
  a playlist — the URL itself expresses the relationship.
- **Actions that aren't CRUD.** `PATCH /api/library/:id/progress` is
  not a generic update of the library item; it is a domain action
  ("record progress"). Naming it `/progress` rather than folding it
  into the generic `PATCH /api/library/:id` keeps the validation, the
  conflict rule, and the auto-completion logic in one place.

### Trade-offs

- Some teams prefer RPC-style endpoints (`POST /api/record-progress`).
  REST fits because most operations here *are* CRUD on a resource.
- Putting the action in the URL (`/progress`) instead of in a query
  string makes the route table read like an API description.

---

## 3. Express and Middleware

### The concept

**Middleware** is a function that takes `(req, res, next)` and runs
before (or after) the route handler. Express composes them into a
chain: each middleware can do work and call `next()` to pass control
forward, or end the response itself.

### In this project

`server/src/app.js` mounts four app-level middlewares:

```js
app.set('trust proxy', 1)               // Caddy/gateway sits in front
app.use(cors({ origin: CLIENT_ORIGIN })) // restrict cross-origin callers
app.use(express.json())                 // parse JSON bodies into req.body
app.use((req, res, next) => {           // hand-set security headers
  res.set('X-Content-Type-Options', 'nosniff')
  res.set('Referrer-Policy', 'no-referrer')
  next()
})
```

Then routers are mounted:

```js
app.use('/api/auth', rateLimit({ max: 20, windowMs: 60_000 }), authRoutes)
app.use('/api/videos', videosRoutes)
// …
app.use(notFoundHandler)                // 404 for unmatched routes
app.use(errorHandler)                   // central error handler
```

Per-router middleware does the heavier lifting. In
`server/src/routes/library.js`:

```js
router.use(requireAuth)                 // every route below requires a JWT
```

That single line protects every handler in the file. The handler
itself doesn't repeat the auth check; it can assume `req.user` is set.

### Why middleware (and not just inline checks)

- **Separation of concerns.** Auth, validation, rate-limiting, logging,
  and error handling are cross-cutting. Putting them in middleware
  keeps route handlers focused on the business rule.
- **Composability.** The same `requireAuth` is reused on every
  protected router. The same `rateLimit` factory protects `/auth`
  (20/min) and the YouTube Data API routes (10/min, 5/min) with
  different limits.
- **Order matters.** `requireAuth` runs before the handler so a 401
  short-circuits before any DB work. The central `errorHandler` is
  registered *last* so any thrown error (including ones from async
  handlers — Express 5 forwards them automatically) ends up there.

### Alternatives

- **Per-handler auth checks.** Possible, but you would repeat
  `if (!req.user) return res.status(401)...` in every handler.
- **A separate "controller" layer.** Larger apps sometimes split
  routes → controllers → services. This project keeps one route file
  per resource (the route file *is* the controller); see
  [`decisions-tradeoffs-improvements.md`](decisions-tradeoffs-improvements.md)
  for the trade-offs.

### Common mistakes

- Forgetting `next()` — the request hangs.
- Registering `errorHandler` *before* routes — it never runs.
- Putting `express.json()` *after* a route that needs the body —
  `req.body` is `undefined`.

---

## 4. Mongoose and MongoDB

### The concept

**MongoDB** is a document database: it stores JSON-like objects
("documents") grouped into **collections**. **Mongoose** is an ODM
(Object Document Mapper) for Node.js that adds schemas, validation,
and convenient query builders on top of the raw driver.

A document in MongoDB looks like:

```json
{
  "_id": ObjectId("..."),
  "user": ObjectId("..."),
  "videoId": "dQw4w9WgXcQ",
  "title": "Never Gonna Give You Up",
  "durationSec": 213,
  "lastPositionSec": 95,
  "completed": false
}
```

A Mongoose **schema** declares the shape; a **model** is the
constructor for documents of that shape.

### In this project

Five models live in `server/src/models/`:

- `User.js` — accounts (name, email, passwordHash)
- `LibraryItem.js` — one user's relationship with one video (metadata + progress)
- `Playlist.js` — playlist with embedded items
- `Note.js` — keyed by (user, videoId), survives library removal
- `Bookmark.js` — position marker with optional label

Example (`server/src/models/LibraryItem.js`):

```js
const libraryItemSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  videoId: { type: String, required: true },
  title: { type: String, default: '' },
  durationSec: { type: Number, default: 0, min: 0 },
  lastPositionSec: { type: Number, default: 0, min: 0 },
  completed: { type: Boolean, default: false },
  // …
})

libraryItemSchema.index({ user: 1, videoId: 1 }, { unique: true })

libraryItemSchema.virtual('progressPercent').get(function () {
  if (this.completed) return 100
  if (!this.durationSec || !this.lastPositionSec) return 0
  return Math.min(100, Math.round((this.lastPositionSec / this.durationSec) * 100))
})
```

Three things worth understanding:

- **Indexes.** `{ user, videoId }` unique means a user can save a
  given video at most once, and the lookup
  `LibraryItem.findOne({ user, videoId })` is O(log n).
- **Virtuals.** `progressPercent` is *derived*, not stored. Storing it
  would create a third field that has to stay in sync with
  `lastPositionSec` and `durationSec`. Computing it on read keeps the
  data consistent by construction.
- **toJSON transform.** Every model strips `_id` to a string `id` and
  drops `__v` so the JSON the API returns has a clean shape.

### Why MongoDB (and not PostgreSQL)

The data here is small, hierarchical, and per-user:

- A playlist *embeds* its items. In SQL you would model this as
  `playlists` + `playlist_items` tables and join them on every read.
  Here it's one document, one query.
- A `LibraryItem` is one user's relationship with one video — it's both
  metadata and progress. In SQL you might split `videos` and
  `progress` and join them. Here they are one document.
- There are no cross-user relations. No "shared playlist" feature. No
  multi-tenant analytics. The thing SQL is best at — relational
  integrity across many entities — is not what this app does.

PostgreSQL would be a perfectly reasonable choice too, especially if
the app grew to need transactional consistency across multiple
collections (e.g. "delete user → cascade-delete all their data"
atomically). MongoDB lacks multi-document transactions by default;
we work around that by deleting in the right order (see
`server/src/routes/library.js` `DELETE /:itemId`).

### Alternatives

- **Raw MongoDB driver** — loses schema validation, virtuals, casting.
  Useful if you need maximum speed or want to avoid Mongoose's
  abstractions; not a fit here.
- **PostgreSQL + Prisma** — strong typing, real joins, migrations.
  Better when the schema is relational; here the schema is
  hierarchical and per-user.

### Common mistakes

- Forgetting `mongoose.set('strictQuery', true)` (in
  `server/src/config/db.js`) — silently allows queries on fields that
  don't exist, hiding typos.
- Storing derived values (like `progressPercent`) — they drift.
- Not indexing the fields you query by — slow queries as data grows.

---

## 5. Asynchronous JavaScript (Promises and async/await)

### The concept

JavaScript is single-threaded. Long-running operations (network,
files, timers) would block the whole program if they were
synchronous. **Asynchronous** code returns immediately and runs a
callback (or resolves a Promise) when the work is done.

- A **Promise** is a value-or-failure that will be available later.
- `async/await` is syntax sugar: `await` pauses the function until the
  Promise resolves, `try/catch` catches rejections.

### In this project

Almost every route handler is `async`:

```js
router.post('/', async (req, res) => {
  const existing = await LibraryItem.findOne({ user: req.user._id, videoId })
  if (existing) return res.json({ item: existing, alreadySaved: true })
  const metadata = await fetchVideoMetadata(videoId)
  const item = await LibraryItem.create({ /* ... */ })
  res.status(201).json({ item, alreadySaved: false })
})
```

Each `await` is a yield point. While MongoDB is querying, Node can
serve other requests. Express 5 catches rejected promises from `async`
handlers automatically and forwards them to the error middleware —
older Express versions needed `try/catch` wrappers around every
handler.

### Pitfalls visible in this codebase

- **Race conditions in React effects.** When the `Watch` page changes
  `videoId`, the metadata `useEffect` fires and the old request might
  resolve *after* the new one. The pattern in
  `client/src/pages/Watch.jsx` is to use a `cancelled` flag and check
  it before calling `setState`:

  ```js
  let cancelled = false
  api(`/videos/metadata?url=...`).then((data) => {
    if (!cancelled) setMetadata(data)
  })
  return () => { cancelled = true }
  ```

- **Cleanup in the player.** `client/src/components/YouTubePlayer.jsx`
  uses a `cancelled` flag *and* a `cleanup` returned from the effect
  to ensure a final progress save and `player.destroy()` happen even
  if the component unmounts mid-API-call.

### Common mistakes

- Forgetting to `await` — the function returns immediately with an
  unresolved Promise.
- Awaiting inside `.map()` without `Promise.all` — runs serially.
- Not handling rejection — the request hangs from the client's
  perspective.

---

## 6. React: Components, State, Effects, Context

### The concept

A **React component** is a function that returns JSX (HTML-in-JS).
**State** (`useState`) is data that, when changed, tells React to
re-render the component. **Effects** (`useEffect`) run side effects
(fetching, subscribing, mutating the DOM) after render. **Context**
(`createContext` + `useContext`) shares data across many components
without prop-drilling.

### In this project

- **Pages** (`client/src/pages/*.jsx`) are top-level components mounted
  by React Router (see `App.jsx`). Each page owns its server state via
  `useState` and fetches what it needs in `useEffect`.
- **Reusable components** (`client/src/components/*.jsx`) are pure
  functions of props. `VideoCard`, `NotesSection`, `BookmarksSection`,
  `WatchSidebar` — none of them know about the API.
- **Two contexts** (`client/src/context/`):
  - `AuthContext.jsx` holds the logged-in user; `useAuth()` reads it
    anywhere.
  - `ToastContext.jsx` provides `useToast()` for transient
    notifications.

The `YouTubePlayer` is intentionally isolated (see
[`codebase-walkthrough.md`](codebase-walkthrough.md)). The watch page
passes callbacks (`onProgress`, `onEnded`); the player emits events
via those callbacks. The rest of the app never touches the IFrame API.

### Why this approach (and not a global state library)

- The app is small. A few pages, each fetching what they need, is
  easier to read than Redux/Zustand boilerplate.
- Server state is per-page. The library page does not need to know
  that the watch page saved a video; it re-fetches when it mounts.
- The exception — auth — uses Context because the session is truly
  global (every page wants to know who's logged in).

For a larger app, a query cache like React Query or SWR would reduce
the "fetch on mount" pattern's weaknesses (refetch on focus, dedupe
identical requests). It would be the next dependency to add *if* the
app grew; right now `api()` plus a small offline cache is enough.

### Common mistakes

- Calling `setState` directly during render instead of in an effect or
  callback — causes infinite re-render loops.
- Forgetting the dependency array on `useEffect` — runs every render.
- Putting objects in deps — referential inequality causes spurious
  re-runs.

---

## 7. JWT Authentication

### The concept

A **JSON Web Token** is a signed, base64-encoded string that carries
claims (e.g. user id, expiry). The server signs it with a secret; the
client stores it and sends it back on every request. The server
verifies the signature to confirm the token hasn't been tampered with.

Sessions and JWTs are the two main approaches:

- **Server sessions**: server stores session id → user; cookie holds
  the id. Server-side revocation is trivial; cookies work with
  httpOnly for XSS resistance.
- **JWT**: stateless — server stores nothing. Token itself carries
  the user id; the signature proves authenticity. Better for
  distributed backends; harder to revoke before expiry.

### In this project

`server/src/middleware/auth.js` is the entire auth system in 56 lines:

```js
export function signToken(user) {
  return jwt.sign({ sub: user._id.toString() }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })
}

export async function requireAuth(req, res, next) {
  const token = req.get('authorization')?.slice(7)  // strip "Bearer "
  const payload = jwt.verify(token, JWT_SECRET)
  const user = await User.findById(payload.sub)
  if (!user) throw httpError(401, 'This account no longer exists.')
  req.user = user
  next()
}
```

Two important details:

- The token carries **only the user id** (`sub` claim) — no roles, no
  permissions. Authorization is ownership-based: a route checks
  `findOne({ _id: req.params.id, user: req.user._id })`. If the
  document isn't yours, it isn't found → 404.
- The user document is **re-fetched on every authenticated request**.
  This means deleting an account invalidates its tokens immediately
  (no in-memory token blocklist needed). The trade-off is one extra
  DB query per request — fine for a personal app; expensive at scale.

On the client side (`client/src/context/AuthContext.jsx`), the token
lives in `localStorage`. The `api()` wrapper (`client/src/lib/api.js`)
attaches it as `Authorization: Bearer <token>` on every request. A 401
response fires a `nd:unauthorized` event, which the `AuthContext`
listens for and logs the user out.

### Trade-offs

- **localStorage vs. httpOnly cookie**: localStorage is XSS-readable.
  Cookies with httpOnly are not — but they require CSRF protection
  (because the browser auto-sends them) and complicate the SPA +
  separate-API deployment. The choice here is the standard SPA
  trade-off; documented as a future hardening step in `security.md`.
- **Stateless vs. session store**: stateless tokens mean no Redis, no
  session cleanup job, no server-side state. The cost is no easy
  revocation (until expiry) — worked around here by re-fetching the
  user on every request.

### Common mistakes

- Putting sensitive data in the JWT payload — it's signed but readable
  by anyone.
- Not verifying the expiry — `jwt.verify` does it for you, but only
  if you let it throw.
- Trusting `req.body.userId` for identity — never. The user always
  comes from the verified token (`req.user`).

---

## 8. Validation and Error Handling

### The concept

- **Validation** is "is this input acceptable?" (string length, email
  shape, numeric range). Reject early, with a message the user can
  act on.
- **Error handling** is "something went wrong; how do I respond
  safely?" Generic 500 for unexpected errors (with details in logs),
  specific 4xx for known client errors.

### In this project

Validation is per-route. The pattern in `server/src/routes/auth.js`
is representative:

```js
const fields = {}
if (!name || name.trim().length < 2) fields.name = 'Enter your name (at least 2 characters).'
if (!email || !EMAIL_RE.test(email.trim())) fields.email = 'Enter a valid email address.'
if (!password || password.length < MIN_PASSWORD_LENGTH) fields.password = '...'
if (Object.keys(fields).length > 0) {
  throw httpError(400, 'Please check the highlighted fields.', fields)
}
```

The `httpError(status, message, fields)` helper (`server/src/utils/errors.js`)
creates an Error with a `.status` and optional `.fields`. The central
error handler (`server/src/middleware/errorHandler.js`) turns those
into JSON responses:

```json
{ "message": "Please check the highlighted fields.",
  "fields": { "email": "Enter a valid email address." } }
```

The client renders `fields.email` next to the email input — inline
feedback.

For unexpected errors (5xx), the handler logs the details server-side
and returns a generic `"Something went wrong on our side."` to the
client. Implementation details never leak.

Mongoose's own validation errors (`ValidationError`) and CastErrors
(e.g. malformed ObjectId in a URL) are also caught and turned into
clean 400s, so a request like `GET /api/library/not-an-objectid`
returns `{ "message": "Invalid id in request." }` instead of crashing.

### Why this approach

- **One error shape.** Every error response has `message` and optional
  `fields`. The client's `ApiError` (in `client/src/lib/api.js`) just
  reads those.
- **Per-field messages.** Forms can render the message next to the
  offending input — much better UX than a toast.
- **No leakage.** Stack traces and DB internals stay server-side.

### Common mistakes

- Returning different shapes for different errors — clients have to
  special-case every endpoint.
- Catching errors and returning success — hides bugs.
- Logging errors on the client — they may contain sensitive data and
  they pollute logs.

---

## 9. Caching Strategies

### The concept

A cache stores recent results so subsequent requests are faster or
work offline. The web has several cache layers:

- **HTTP cache** (browser, CDN): keyed by URL, controlled by headers.
- **Service worker cache**: programmatic; can serve offline.
- **IndexedDB**: structured storage in the browser.
- **In-memory cache** (server): per-process Map.

### In this project

Three caching layers, each with a narrow job:

1. **Service worker** (`client/public/sw.js`) — caches the app shell
   and hashed assets. Cache-first for `/assets/*` (immutable),
   network-first for SPA navigations, capped cache-first for
   `i.ytimg.com` thumbnails. **Never intercepts `/api`** — API data
   freshness matters more than offline availability, and the IndexedDB
   layer handles offline reads explicitly.

2. **IndexedDB read-through** (`client/src/lib/offline.js`) — caches
   successful GET responses for `/library`, `/playlists`, `/stats`,
   `/notes?videoId=`, `/bookmarks?videoId=`, etc. When `fetch` fails
   (network error), the `api()` wrapper serves the cached copy and
   fires an `nd:offline-data` event so the UI can warn the user.

3. **Server-side: none.** Every request queries MongoDB. Stats
   recompute from documents on every read. This is fine for a
   personal app (dozens of documents). At scale you would add an
   in-memory cache or a stats snapshot.

### Why this layering

- Each layer solves one problem; combining them in one component
  would create a tangle.
- The service worker and IndexedDB are deliberately separate: a
  static shell can be cached at the HTTP layer (service worker), but
  user data must be cached with explicit "this is stale" signaling
  (IndexedDB + UI banner).

### Alternatives

- **Workbox** (Google's SW library) — would generate the SW for us.
  Saves ~100 lines but adds a dependency; we kept the SW hand-rolled
  because the policy is small and we want to understand it.
- **React Query / SWR** — would replace the per-page `useEffect +
  useState` pattern with a query cache. Worth it at scale; not needed
  for the current size.

---

## 10. Cross-cutting Concepts Cheat Sheet

| Concept | Where it appears | What it gives us |
| --- | --- | --- |
| Async/await | Every `async` route handler | Non-blocking I/O |
| Middleware | `server/src/middleware/*.js` | Composable cross-cutting concerns |
| JSON Web Token | `server/src/middleware/auth.js` | Stateless auth |
| Mongoose virtuals | `LibraryItem.progressPercent` | Derived fields stay consistent |
| Compound unique index | `LibraryItem { user, videoId }` | Per-user dedup + fast lookup |
| Ownership filter | Every `findOne({ _id, user })` | Authorization without roles |
| Conflict rule | `savedAt` in `progressSavedAt` | Idempotent retries + offline replay |
| Central error handler | `errorHandler.js` | Uniform error shape, no leakage |
| Read-through cache | `client/src/lib/offline.js` | Graceful offline reads |
| Service worker | `client/public/sw.js` | Offline app shell + assets |
| React Context | `AuthContext`, `ToastContext` | Global session + notifications |
| StrictMode + cleanup | Every `useEffect` returning a fn | Cancels stale requests, frees resources |
| Per-field error responses | `httpError(400, msg, fields)` | Inline form feedback |

---

Next: [`codebase-walkthrough.md`](codebase-walkthrough.md) takes you
folder-by-folder through the actual repository.
