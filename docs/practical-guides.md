# Practical Guides

How-to guides for the most common changes you'll make to this
codebase. Each guide references real file paths and shows the
smallest change that works. After each guide: what to test, what
could go wrong, and where to look for related patterns.

## Contents

1. [Adding a frontend page](#1-adding-a-frontend-page)
2. [Adding an API endpoint](#2-adding-an-api-endpoint)
3. [Updating a database model](#3-updating-a-database-model)
4. [Implementing a feature across frontend and backend](#4-implementing-a-feature-across-frontend-and-backend)
5. [Debugging a failed API request](#5-debugging-a-failed-api-request)
6. [Investigating authentication errors](#6-investigating-authentication-errors)
7. [Investigating database errors](#7-investigating-database-errors)
8. [Writing and running tests](#8-writing-and-running-tests)
9. [Understanding the consequences of changing a component](#9-understanding-the-consequences-of-changing-a-component)
10. [Working offline (testing the service worker)](#10-working-offline-testing-the-service-worker)

---

## 1. Adding a Frontend Page

**Scenario:** add a `/app/settings` page where the user can change
their name.

### Step 1 — Create the page component

`client/src/pages/Settings.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { useToast } from '../context/ToastContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { Spinner } from '../components/common.jsx'

export default function Settings() {
  const { user } = useAuth()
  const toast = useToast()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) setName(user.name)
  }, [user])

  async function onSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api('/auth/me', { method: 'PATCH', body: { name } })
      toast.success('Saved.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!user) return <Spinner />

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <label className="block">
        <span className="text-sm text-stone-600">Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2"
        />
      </label>
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
    </form>
  )
}
```

### Step 2 — Add the route

`client/src/App.jsx`:

```jsx
import Settings from './pages/Settings.jsx'
// …
<Route path="settings" element={<Settings />} />
```

Inside the protected `/app` route block, alongside `library`,
`playlists`, etc.

### Step 3 — Add it to the nav

`client/src/components/AppLayout.jsx`:

```jsx
const tabs = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/library', label: 'Library', icon: BookOpen, end: false },
  { to: '/app/playlists', label: 'Playlists', icon: ListVideo, end: false },
  { to: '/app/search', label: 'Discover', icon: Search, end: false },
  { to: '/app/stats', label: 'Activity', icon: ChartLine, end: false },
  { to: '/app/settings', label: 'Settings', icon: Settings, end: false }, // new
]
```

### What to test

- Visit `/app/settings` while logged in → form renders with the
  current name.
- Visit `/app/settings` while logged out → `RequireAuth` redirects
  to `/login`.
- Submit → success toast appears, name updates in the navbar avatar.
- Submit a server error → error toast appears.
- Refresh the page → name persists.

### What could go wrong

- **Forgot to put the route under the protected block.** It would
  render without auth. Always inside `<Route path="/app" element={<RequireAuth>...}>`.
- **Forgot `import` in `App.jsx`.** Build fails.
- **Called `setState` during render** (instead of in a callback or
  effect) → infinite loop. Use `useEffect` with a dependency.
- **Forgot the `name` prop on the input** → React controlled-component
  warning.

### Related patterns

- `Library.jsx`, `Playlists.jsx`, `Stats.jsx`, `PlaylistDetail.jsx`
  follow the same structure: `useEffect` to fetch, `useState` for
  server data, loading/error states.
- `Login.jsx` and `Signup.jsx` use shared helpers from
  `AuthShared.jsx` for forms with inline field errors.

---

## 2. Adding an API Endpoint

**Scenario:** add `PATCH /api/auth/me` to let the user update their
name (the endpoint called by the page above).

### Step 1 — Add the route handler

`server/src/routes/auth.js`:

```js
router.patch('/me', requireAuth, async (req, res) => {
  const { name } = req.body || {}

  const fields = {}
  if (name != null) {
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
      fields.name = 'Name must be 2–80 characters.'
    }
  }
  if (Object.keys(fields).length > 0) {
    throw httpError(400, 'Please check the highlighted fields.', fields)
  }

  if (name != null) {
    req.user.name = name.trim()
    await req.user.save()
  }

  res.json({ user: req.user })
})
```

### Step 2 — Test it

Add a test to `server/tests/api.test.js`:

```js
test('PATCH /auth/me updates the user name', async () => {
  const client = await registerUser('name@test.dev', 'password123')
  const { status, data } = await client.request('/auth/me', {
    method: 'PATCH',
    body: { name: 'New Name' },
  })
  assert.equal(status, 200)
  assert.equal(data.user.name, 'New Name')
})
```

### Step 3 — Verify the client updates

The `AuthContext` holds `user` in state. After a successful
`PATCH /auth/me`, the client should update the local state:

```js
// in AuthContext.jsx — add an updateName method, or just refresh:
async function refreshUser() {
  const data = await api('/auth/me')
  setUser(data.user)
  setCachedUser(data.user)
}
```

Or update the user object directly from the PATCH response.

### What to test

- Authenticated request → 200, name updates in DB.
- Unauthenticated request → 401.
- Invalid name (1 char, 81 chars, non-string) → 400 with `fields.name`.
- Cross-user: user A's token cannot edit user B (impossible — the
  route uses `req.user` from the token, never trusts body).

### What could go wrong

- **Trusting `req.body.user`.** Never. The user comes from the
  verified token (`req.user`), period.
- **Forgetting the `requireAuth` middleware.** Either mount it on
  the router (`router.use(requireAuth)`) or per-route.
- **Forgetting to call `await user.save()`.** Mongoose doesn't
  auto-save modifications to existing documents.
- **No validation.** Always validate input types and bounds.

### Related patterns

- `routes/library.js` PATCH `/:itemId/progress` is a great
  reference: validation, ownership filter, business rule (savedAt),
  save, response.
- `routes/playlists.js` PATCH `/:id` is another example of partial
  update.

---

## 3. Updating a Database Model

**Scenario:** add a `tags` field to `LibraryItem` (array of
strings) so users can categorize their saved videos.

### Step 1 — Update the schema

`server/src/models/LibraryItem.js`:

```js
const libraryItemSchema = new mongoose.Schema({
  // … existing fields …
  tags: {
    type: [String],
    default: [],
    validate: {
      validator: (arr) => arr.every((s) => typeof s === 'string' && s.length <= 30),
      message: 'Tags must be strings of at most 30 characters.',
    },
  },
  // …
})
```

### Step 2 — Index (optional)

If you'll query by tag, add an index:

```js
libraryItemSchema.index({ user: 1, tags: 1 })
```

### Step 3 — Accept it in the route

`server/src/routes/library.js`:

- POST `/`: accept `tags` in the body, validate.
- PATCH `/library/:itemId`: optionally accept `tags` for update.
- GET `/`: support `?tag=...` filter.

```js
// In POST handler:
const { tags } = req.body || {}
const cleanTags = Array.isArray(tags)
  ? [...new Set(tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 10))]
  : []
// ...
const item = await LibraryItem.create({ /* ... */, tags: cleanTags })

// In GET handler:
if (typeof tag === 'string' && tag.trim()) {
  filter.tags = tag.trim()
}
```

### Step 4 — Migration

Existing documents won't have the `tags` field. Mongoose applies the
`default: []` on read for documents missing the field, so existing
items appear with `tags: []`. No migration script needed for an
additive change with a default.

If you're changing an existing field's type or removing a field,
you'd need a migration script (e.g., a Node script that connects to
the DB and updates documents).

### Step 5 — Test

```js
test('library item can have tags', async () => {
  const client = await registerUser('tags@test.dev', 'password123')
  await client.request('/library', {
    method: 'POST',
    body: { videoId: 'aaaaaaaaaaa', tags: ['math', 'linear algebra'] },
  })
  const { data } = await client.request('/library?q=&tag=math')
  assert.equal(data.items.length, 1)
  assert.ok(data.items[0].tags.includes('math'))
})
```

### What to test

- New saves with tags → tags persist.
- Existing saves (pre-change) → appear with `tags: []`.
- Filter by tag → returns only matching items.
- Cross-user: user A's tags are not visible to user B (the ownership
  filter handles this).

### What could go wrong

- **No validation on array elements.** `tags: [String]` accepts an
  array of strings but doesn't check length or content. Add a
  custom validator.
- **Forgetting to update the route.** Schema changes without route
  changes mean the field is silently ignored.
- **Adding too many indexes.** Each index slows writes. Only index
  fields you actually query by.

### Related patterns

- `Bookmark.positionSec` with `min: 0` validation.
- `Note.text` with `maxlength: 2000` validation.
- `Playlist.items` embedded subdocuments.

---

## 4. Implementing a Feature Across Frontend and Backend

**Scenario:** add a "favorite" toggle on saved videos.

This combines the previous three guides. The full flow:

### Plan

1. **Backend:** add a `favorite` boolean to `LibraryItem`. Add a
   `PATCH /api/library/:id/favorite` endpoint (or fold into the
   existing PATCH). Add a `?favorite=true` filter to GET.
2. **Frontend:** add a star icon button to `VideoCard` and the
   watch page. Add a "Favorites" filter tab to `Library.jsx`.
3. **Tests:** cover the new field and the new filter.
4. **Docs:** update `database-models.md`, `api-and-data-design.md`,
   and the README endpoint table.

### Sequence

```mermaid
sequenceDiagram
    participant U as User
    participant B as Browser
    participant API as api()
    participant E as Express
    participant DB as MongoDB

    U->>B: clicks star on VideoCard
    B->>API: PATCH /api/library/:id/favorite { favorite: true }
    API->>E: Bearer + JSON
    E->>E: requireAuth (loads user)
    E->>E: validate (favorite: boolean)
    E->>DB: findOne({ _id, user }) (404 if not owned)
    E->>DB: item.favorite = true; item.save()
    E-->>API: 200 { item }
    API-->>B: resolves
    B->>B: setItems(current.map(...))
    B-->>U: star fills, toast "Added to favorites"
```

### Pitfalls specific to full-stack features

- **Don't trust the client.** Validate `favorite` is a boolean
  server-side, even though the client only sends true/false.
- **Ownership check.** The PATCH must filter by `{ _id, user }`.
- **UI state vs. server state.** Update local state immediately
  (optimistic) or wait for the response (pessimistic). Optimistic
  feels faster but needs rollback on error.
- **Cache invalidation.** The library page's cached GET response (in
  IndexedDB) is stale until the next fetch. Either update the cache
  on write, or accept that an offline reload shows stale data.
- **Cross-page consistency.** If the user toggles favorite on the
  watch page, the library page should reflect it on next visit. The
  current pattern (re-fetch on mount) handles this.

### What to test

- Backend: auth, validation, ownership, idempotency (toggling twice
  returns to original state).
- Frontend: optimistic update rolls back on error; the star icon
  reflects the new state; reloading the page shows the right state.
- Integration: a video marked favorite on the watch page appears in
  the library's Favorites filter.

### Conventions to follow

- Use the `api()` wrapper, not raw `fetch`.
- Throw `httpError(status, message, fields?)` for errors.
- Add per-field validation messages where applicable.
- Use `useToast()` for feedback.
- Use `Spinner`, `EmptyState`, `ErrorState` from `common.jsx` for
  loading/empty/error states.

---

## 5. Debugging a Failed API Request

### Symptoms

- A button click does nothing.
- A toast says "Request failed (400)" or "(500)" or "(0)".
- The page shows an error state.

### Step 1 — Open DevTools → Network tab

Reload the page or trigger the action. Find the failing request.

### Step 2 — Check the request

- **URL:** is it correct? (`/api/library`, not `/library`).
- **Method:** matches the route? (`POST` for create, `PATCH` for
  update).
- **Headers:** `Authorization: Bearer <token>` present?
  `Content-Type: application/json` if there's a body?
- **Body:** valid JSON? Required fields present?

### Step 3 — Check the response

- **Status code:**
  - 400 → bad input. Look at `fields` in the response body for
    per-field messages.
  - 401 → token missing or invalid. The `AuthContext` should have
    logged out; if not, the token in localStorage may be stale.
  - 403 → CORS. Check `CLIENT_ORIGIN` in `server/.env`.
  - 404 → route not matched, or ownership filter rejected it.
  - 429 → rate limited. Wait or check the `Retry-After` header.
  - 500 → server error. Check the server logs (`dev.log` if you're
    using `npm run dev`).
  - 0 (or no response) → network failure. Check that the dev server
    is running; check `api()`'s offline fallback path.
- **Body:** the `message` is human-readable. The `fields` object (if
  present) has per-field messages.

### Step 4 — Check the server logs

If you ran `npm run dev`, the API's `console.log` and
`console.error` output is prefixed `[api]` and written to `dev.log`.
Look for:

```
[error] POST /api/library/abc/progress Error: ...
```

The central error handler logs unexpected errors with method, URL,
and the error object.

### Step 5 — Reproduce with curl

```bash
TOKEN=...  # paste from localStorage
curl -v -X PATCH http://localhost:4000/api/library/abc/progress \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"positionSec": 100, "savedAt": 1700000000000}'
```

This bypasses the browser and confirms whether the issue is in the
client or the server.

### Step 6 — Add temporary logging

In the route handler:

```js
console.log('[debug] body=', req.body, 'user=', req.user._id)
```

Remove it after fixing the bug.

### Common failures and fixes

| Symptom | Likely cause |
| --- | --- |
| 401 on every request | Token expired; log out and back in. |
| 401 only on one endpoint | Route not under `requireAuth`. |
| 400 "Invalid id" | Malformed ObjectId in URL. |
| 400 "Please check the highlighted fields." | Validation failed; check `fields` in the response. |
| 404 on `/api/library/:id` | Wrong id, or item not owned by this user. |
| 429 on `/api/auth/*` | Rate limited; wait 60s. |
| 500 | Server bug; check logs. |
| Status 0 / "Could not reach the server" | Server down or network offline. |
| CORS error in browser console | `CLIENT_ORIGIN` mismatch. |
| `ECONNREFUSED 127.0.0.1:27017` | MongoDB not running. |

### Related patterns

- `client/src/lib/api.js` for the request wrapper.
- `server/src/middleware/errorHandler.js` for the response shape.

---

## 6. Investigating Authentication Errors

### "Your session is invalid or has expired."

The server's `requireAuth` couldn't verify the JWT. Causes:

1. **Token expired.** Default 7 days. Log out and back in.
2. **JWT_SECRET changed.** If you restarted the server with a new
   secret, all existing tokens are invalid. Log out and back in.
3. **Token malformed.** Manually edited in localStorage. Clear
   `localStorage['nd_token']` and log in.

### "This account no longer exists."

The user document was deleted. Tokens are stateless but the
middleware re-fetches the user, so deletion takes effect immediately.
No fix other than re-registering.

### "Too many attempts."

Rate limit hit on `/api/auth/*`. Wait 60 seconds.

### `err.offline` (status 0) on `/auth/me`

Network failure. The `AuthContext` should fall back to the cached
profile and keep you logged in. If it doesn't, check:

- `client/src/context/AuthContext.jsx` `restoreSession`: does it
  check `err.offline` and call `getCachedUser()`?
- Is `localStorage['nd_user']` populated? (It should be if you've
  logged in before.)

### Stuck on the loading spinner

`RequireAuth` shows a spinner while `ready` is false. If `ready`
never becomes true, the `restoreSession` async call is hanging.
Check the Network tab — is `/api/auth/me` pending? Check the
server is running.

---

## 7. Investigating Database Errors

### "MongoServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017"

MongoDB isn't running. Start it:

```bash
# if you have a project-local mongod:
.home/z/my-project/.mongodb/bin/mongod \
  --dbpath /home/z/my-project/.mongodb/data \
  --port 27017 --bind_ip 127.0.0.1 --fork \
  --logpath /home/z/my-project/.mongodb/data/mongod.log

# or: brew services start mongodb-community (macOS)
# or: sudo systemctl start mongod (Linux)
```

### "ValidationError: ... is required."

Mongoose's schema validation caught a missing required field. The
central error handler turns this into a 400 with `fields`. Check
your route's input — are you sending all required fields?

### "CastError: ... failed to cast value ... at path ..."

Usually a malformed ObjectId in a URL (e.g.,
`/api/library/not-an-id`). The central error handler returns 400
"Invalid id in request."

### "E11000 duplicate key error"

A unique index was violated. Most common: trying to save the same
video twice. The route handler should check for an existing item
first (`LibraryItem.findOne({ user, videoId })`); if it returns,
respond with `alreadySaved: true` instead of trying to create.

### Queries return wrong data

- Check the filter: are you including `user: req.user._id`?
- Check the sort: is it the sort you expect?
- Use `mongoose.set('debug', true)` at the top of `index.js` to log
  every query Mongoose runs.

### Tests fail with "database not connected"

The integration tests boot their own MongoDB connection. If they
fail to connect, check:

- Is MongoDB running on 127.0.0.1:27017?
- The test DB name is `no-distractions-test-<file>`; it's created
  automatically.

---

## 8. Writing and Running Tests

### The two test suites

| Suite | Command | What it covers |
| --- | --- | --- |
| Integration (`node:test`) | `npm test` | API behavior with real Express + MongoDB, YouTube mocked |
| Smoke (bash/curl) | `bash scripts/api-test.sh` | Live HTTP against a running dev stack, real oEmbed |

### Adding an integration test

Edit `server/tests/api.test.js`. Follow the existing pattern:

```js
test('PATCH /library/:id/progress ignores stale writes', async () => {
  const client = await registerUser('stale@test.dev', 'password123')
  const { data: saveData } = await client.request('/library', {
    method: 'POST',
    body: { videoId: 'aaaaaaaaaaa' },
  })
  const itemId = saveData.item.id

  // First write at t=1000
  await client.request(`/library/${itemId}/progress`, {
    method: 'PATCH',
    body: { positionSec: 100, durationSec: 200, savedAt: 1000 },
  })

  // Stale write at t=500 should be ignored
  const { data } = await client.request(`/library/${itemId}/progress`, {
    method: 'PATCH',
    body: { positionSec: 50, durationSec: 200, savedAt: 500 },
  })

  assert.equal(data.stale, true)
  assert.equal(data.item.lastPositionSec, 100)  // not updated
})
```

### Helpers

`server/tests/helpers.js` provides:

- `makeClient()` — a fetch wrapper that tracks cookies (no —
  Bearer tokens) and returns `{ status, data }`.
- `registerUser(email, password)` — signs up and returns an
  authenticated client.
- `stubFetch()` — replaces `globalThis.fetch` with a fake YouTube
  (oEmbed + Data API). Call before tests; restore after.
- `fakeYouTube.oembedResponses.set(videoId, { status, body })` —
  set up canned responses.
- `fakeYouTube.dataApiCalls` — array of recorded Data API calls,
  for asserting quota usage.
- `clearDatabase()` — wipes the test DB between tests.

### Running

```bash
# from the repo root
npm test

# or just the server
npm --prefix server test

# watch mode (re-runs on file change)
cd server && node --watch --test tests/*.test.js
```

### What to test (priority order)

1. **Auth / protected endpoints.** Every authenticated route should
   return 401 without a token.
2. **CRUD operations.** Each resource: create, read, update, delete.
3. **Cross-user access control.** User A's resources are invisible
   to user B (404 or empty list).
4. **Invalid requests.** Missing required fields, malformed ids,
   out-of-range values.
5. **Key frontend interactions.** (Currently manual; Playwright
   would be the next step.)
6. **Offline sync.** (The `savedAt` conflict rule is tested in the
   integration suite.)

### What is *not* tested (honest)

- Browser-side behavior (player wiring, focus mode, offline UI).
- The real YouTube Data API (mocked; full path requires a real key).

---

## 9. Understanding the Consequences of Changing a Component

### `client/src/lib/api.js`

Changing this file affects **every network call in the app**. Be
careful with:

- The error shape (`ApiError` with `message`, `status`, `fields`,
  `offline`).
- The `nd:unauthorized` event (the `AuthContext` listens for it).
- The offline fallback paths (cache for GETs, queue for progress).
- The auth header injection (every authenticated request depends on
  it).

If you add a new cacheable GET path, update `cacheKeyForPath` in
`offline.js`.

### `client/src/components/YouTubePlayer.jsx`

The IFrame API has lifecycle quirks. Be careful with:

- The `cancelled` flag — without it, stale requests can update
  state after unmount.
- The cleanup function — it destroys the player and emits a final
  progress event. Removing it means progress is lost on navigation.
- The `handlers` ref pattern — keeps callbacks fresh without
  recreating the player.

### `server/src/middleware/auth.js`

Changing the JWT shape or secret invalidates all existing tokens.
Coordinate with the client: the `AuthContext` will log users out
on the next 401.

### `server/src/middleware/errorHandler.js`

Changing the error shape breaks the client's `ApiError`. Coordinate.

### Mongoose models

Adding a field is safe (defaults apply). Removing a field or changing
its type may require a migration script.

### `server/src/app.js`

Adding middleware is safe. Reordering middleware can break things
(e.g., putting `errorHandler` before routes means errors are never
caught).

### How to safely make a change

1. **Identify the surface area.** What calls this? What does this
   call?
2. **Write a test first** (if practical). The integration suite
   catches regressions.
3. **Make the smallest change** that works.
4. **Run the tests.** `npm test`.
5. **Run the dev stack** and exercise the affected feature manually.
6. **Update docs** if the change affects the API shape, the data
   model, or a documented decision.

---

## 10. Working Offline (Testing the Service Worker)

The service worker only registers in production builds. To test
offline:

```bash
# Build the client
npm --prefix client run build

# Start the API server
npm run dev:server &

# Start the preview server (serves the built client + proxies /api)
npm --prefix client run preview
```

Open <http://localhost:4173>. Load the app once (logs in, fetches
library). Then:

- **DevTools → Application → Service Workers** — confirm
  registration.
- **DevTools → Network → Offline** — reload. The shell loads from
  cache, the library loads from IndexedDB, the OfflineBanner
  appears.
- **Play a video** (won't work offline — YouTube's player needs
  network). The player shows an error.
- **Take a note** — fails loudly (not queued).
- **Watch progress on a saved video** — wait, you can't watch
  offline. So progress writes don't happen offline normally.
  But you can simulate: open DevTools → Application → IndexedDB →
  `no-distractions-offline` → `progressQueue` → add an entry
  manually. Then go online; the queue should replay.
- **Toggle offline off** — the queue replays via the `online`
  event or the 30-second interval.

### Logout while offline

The cache and queue are wiped (`clearCache()`, `clearQueue()` in
`AuthContext#logout`). Verify with DevTools → Application →
IndexedDB → the stores should be empty.

---

## Quick Reference: Files and Their Responsibilities

| File | Responsibility | Change carefully because… |
| --- | --- | --- |
| `server/src/app.js` | Express wiring | Order of middleware matters |
| `server/src/index.js` | Startup | Side effects (DB, listen) |
| `server/src/middleware/auth.js` | JWT verify + req.user | Affects every protected route |
| `server/src/middleware/errorHandler.js` | Error → JSON | Client depends on the shape |
| `server/src/middleware/rateLimit.js` | IP throttling | In-memory; one-process only |
| `server/src/models/*.js` | Schemas + indexes | Affects every query |
| `server/src/routes/*.js` | HTTP handlers | The API surface |
| `server/src/utils/youtube.js` | YouTube integration | Compliance-sensitive |
| `client/src/main.jsx` | App mount + SW registration | Side effects |
| `client/src/App.jsx` | Route table | The structure of the app |
| `client/src/context/AuthContext.jsx` | Session | Global state |
| `client/src/context/ToastContext.jsx` | Notifications | Global state |
| `client/src/lib/api.js` | Fetch wrapper + offline | Every network call |
| `client/src/lib/offline.js` | IndexedDB layer | Offline behavior |
| `client/src/components/YouTubePlayer.jsx` | IFrame API | Lifecycle quirks |
| `client/public/sw.js` | Service worker | Caching policy |

---

## Where to Look When…

| You want to… | Read… |
| --- | --- |
| Add an API endpoint | `server/src/routes/library.js` (most complete example) |
| Add a frontend page | `client/src/pages/Library.jsx` (filters, search, pagination) |
| Add a Mongoose field | `server/src/models/LibraryItem.js` (virtual, index, validation) |
| Add a keyboard shortcut | `client/src/pages/Watch.jsx#onKeyDown` |
| Add a service worker route | `client/public/sw.js` (three strategies as templates) |
| Add an offline cacheable endpoint | `client/src/lib/offline.js#cacheKeyForPath` |
| Add a rate-limited route | `server/src/app.js` (auth) or `server/src/routes/videos.js` (Data API) |
| Add a test | `server/tests/api.test.js` (integration) or `youtube-utils.test.js` (unit) |
| Add a toast | `client/src/context/ToastContext.jsx` (useToast) |
| Add a modal | `client/src/components/common.jsx` (Modal) |
| Add a navigation tab | `client/src/components/AppLayout.jsx` (tabs array) |

---

This concludes the practical guides. For the architectural reasoning
behind any of these patterns, see
[`decisions-tradeoffs-improvements.md`](decisions-tradeoffs-improvements.md).
For the high-level map, see [`00-overview.md`](00-overview.md).
