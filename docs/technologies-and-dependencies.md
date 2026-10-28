# Technologies and Dependencies

Each library, framework, or external service used by the project, with:
what it provides, why the project needs it, what we would build without
it, what alternatives exist, and the trade-offs or limitations it
introduces.

> **Principle:** a technology is here because it pays for itself. We do
> not recommend replacing one merely because an alternative exists —
> only when the alternative would actually improve the project.

The dependency lists are in `server/package.json` and
`client/package.json`.

---

## Backend dependencies (`server/package.json`)

### `express` ^5.1.0

**What it provides.** The HTTP framework: routing, middleware
composition, request/response objects.

**Why the project needs it.** Building an HTTP API on raw Node
(`http.createServer`) means reimplementing routing, body parsing,
header setting, error forwarding. Express does these in ~10 lines per
concern.

**What we would build without it.** A hand-rolled router that
matches method+path to handlers, parses JSON bodies, normalizes
`req`/`res` shapes. Doable, but uninteresting and bug-prone.

**Alternatives.**

- **Fastify.** Faster, schema-based validation built in. The
  ecosystem is smaller; we'd lose Express middleware compatibility
  (e.g., `cors`, `express.json`). For a personal app, Express 5's
  async error forwarding is enough.
- **Koa.** Cleaner async model, smaller core, no built-in router.
  You assemble the pieces you want. Closer to Express; switching
  would not materially improve the project.
- **Hono.** Web-standard, fast, edge-friendly. Good fit if you want
  to deploy to a workers-style runtime. We deploy on Node, so the
  benefit doesn't apply.
- **Raw `http`.** Maximum control, minimum dependencies. The cost
  is rebuilding routing and middleware composition.

**Trade-offs / limitations.** Express 5 is newer than 4 and some
third-party middleware hasn't caught up — we use only built-in
patterns plus our own middleware, so this hasn't been an issue. The
async error forwarding (`throw httpError(...)` from `async` handlers)
is the main reason we picked v5 over v4.

### `mongoose` ^8.16.0

**What it provides.** An ODM (Object Document Mapper) for MongoDB:
schemas, validation, casting, virtuals, query builders, middleware
hooks (pre/post save), population.

**Why the project needs it.** Schemas declare what fields exist, their
types, defaults, validators. Without that, every route would have to
manually validate and cast every field — the `LibraryItem` save would
be 50 lines of `if (typeof videoId !== 'string') ...` instead of
`{ type: String, required: true }`.

**What we would build without it.** Hand-rolled validation per route,
plus raw `mongodb` driver calls. Possible, but the code would be
3× longer and easier to break.

**Alternatives.**

- **Raw `mongodb` driver.** Maximum speed, no schema abstraction.
  Loses validation, casting, virtuals, population. You would
  reimplement them poorly. Worth it only for ultra-high-throughput
  scenarios.
- **Prisma.** Strong TS types, real migrations, supports MongoDB. The
  schema file + generated client adds a build step. The win is type
  safety; we're using JS so the typing benefit is partial. Prisma
  also defaults to a relational mindset that fits PostgreSQL better.
- **TypeORM / MikroORM.** Similar trade-offs to Prisma; TS-first.

**Trade-offs / limitations.** Mongoose adds a runtime layer over the
raw driver — some queries are slower than raw. Population (joining
refs) costs extra queries. The schema-vs-document impedance can be
surprising (e.g., `find()` returns Mongoose documents, not plain
objects — you need `.lean()` if you want raw). For this app, the
abstraction pays for itself.

### `bcryptjs` ^3.0.2

**What it provides.** Password hashing and comparison, pure
JavaScript implementation of bcrypt.

**Why the project needs it.** Storing passwords in plaintext is the
single worst security mistake an app can make. Hashing with a slow
key-derivation function (bcrypt, scrypt, argon2) means a leaked
hash is computationally expensive to crack.

**What we would build without it.** Using Node's `crypto.scrypt` is a
reasonable alternative (built-in, no dependency). `bcryptjs` is
chosen for cross-platform portability (pure JS, no native compile).

**Alternatives.**

- **`bcrypt` (native).** Faster than `bcryptjs` (uses C bindings) but
  requires a native build step that breaks on some setups. `bcryptjs`
  is slower but portable — for a personal app the cost (about 100ms
  per hash) is acceptable.
- **`argon2`.** Modern, recommended for new projects. Stronger than
  bcrypt against GPU attacks. The `argon2` npm package requires
  native bindings. Trade-off: better security, more setup pain.
- **`crypto.scrypt` (built-in).** Strong, no dependency. Slightly
  more verbose API.

**Trade-offs / limitations.** 10 rounds (the default) is on the low
end by modern standards; 12 is recommended for production. The
rate limiter (20/min on `/auth/*`) blunts brute force. Documented
as a future hardening step in `security.md`.

### `jsonwebtoken` ^9.0.2

**What it provides.** Sign and verify JWTs.

**Why the project needs it.** Stateless auth: the token carries the
user id; the signature proves authenticity. Without it, we'd
implement HMAC signing manually (which is what JWT does internally
for HS256 — but the library handles encoding, expiry, claim
validation).

**What we would build without it.** Manual HMAC-SHA256 signing of a
base64-encoded `{ sub, exp }` payload. Doable; not interesting.

**Alternatives.**

- **`jose`.** Modern, supports JWE (encrypted tokens), JWK, etc.
  More features than we need; `jsonwebtoken` is simpler.
- **Session cookies + a session store.** Different paradigm. See
  [`concepts-and-foundations.md`](concepts-and-foundations.md#7-jwt-authentication).

**Trade-offs / limitations.** JWTs cannot be revoked before expiry
without a blocklist. We work around by re-fetching the user on every
request (a deleted account stops working immediately). The 7-day
expiry is a UX-vs-security trade-off — shorter is safer but more
annoying.

### `cors` ^2.8.5

**What it provides.** Configurable Cross-Origin Resource Sharing
middleware.

**Why the project needs it.** The API runs on port 4000, the client
on 3000. In dev, the Vite proxy sidesteps CORS by making the
browser think it's same-origin. In production (if you deployed the
API separately), CORS would allow the client's origin.

**What we would build without it.** Setting `Access-Control-Allow-Origin`
headers manually, including handling preflight `OPTIONS` requests.
CORS is fiddly enough that a tiny library is worth it.

**Alternatives.**

- **Manual headers.** ~5 lines if you understand CORS. The library
  handles preflight and edge cases.

**Trade-offs.** Minimal. CORS is configured to one origin
(`CLIENT_ORIGIN`); it's not `*`. If you needed multiple origins you'd
write a function instead of a string.

### `dotenv` ^17.2.0

**What it provides.** Loads `.env` file variables into `process.env`.

**Why the project needs it.** Secrets (JWT_SECRET, YOUTUBE_API_KEY)
and per-environment config (MONGO_URI, CLIENT_ORIGIN, PORT) should
not be hardcoded. `.env` is gitignored; `.env.example` is committed
to document the shape.

**What we would build without it.** Setting real environment
variables in the shell or in a process manager. Doable, less
convenient.

**Alternatives.**

- **Node 20.6+'s built-in `--env-file`.** No dependency. We could
  switch; the benefit is one less dependency, the cost is no
  variable expansion or other dotenv features we don't use.

**Trade-offs.** Minimal. The pattern is standard.

---

## Backend dev dependencies

### `node:test` (built-in)

**What it provides.** Node's built-in test runner (`node --test`).
Test functions, assertions, before/after hooks, subtests, TAP output.

**Why the project needs it.** Zero install, runs with the Node we
already have. The test files in `server/tests/` use it directly
(`import test from 'node:test'`).

**Alternatives.**

- **Jest.** The most popular test framework. Adds `babel-jest` for
  ESM (or stays on CommonJS), adds significant install size, slower
  startup. For an integration suite of 30 tests, the built-in runner
  is faster and simpler.
- **Vitest.** Vite-native, fast, good DX. Worth considering if we
  were already running Vite for the server (we aren't).
- **Mocha + Chai.** Older combination. More dependencies, no
  advantage.

**Trade-offs.** `node:test` is newer and has a smaller ecosystem of
matchers than Jest. For the integration tests we write (assert status
codes, response shapes, DB state), the built-in `assert/strict` is
enough.

---

## Frontend dependencies (`client/package.json`)

### `react` ^19.1.0, `react-dom` ^19.1.0

**What they provide.** The React runtime and DOM renderer. v19 adds
the new JSX transform (no `import React` needed), use hook for
resources, etc.

**Why the project needs it.** Component-based UI with one-way data
flow. The whole client is built on React.

**What we would build without it.** Vanilla DOM manipulation, or a
smaller framework like Preact. The cost of vanilla is hand-rolled
diffing, manual event cleanup, etc.

**Alternatives.**

- **Preact.** 3KB, React-compatible API. Good fit if bundle size is
  critical. We'd lose some React 19 features (concurrent rendering).
- **Vue / Svelte / Solid.** Different paradigms. Each is a
  reasonable choice; React's ecosystem size is the deciding factor
  for a reference implementation.
- **HTMX / server-rendered.** Different model entirely. The app
  would be much smaller but lose the SPA UX (instant navigation,
  client-side progress tracking).

**Trade-offs.** React's bundle (~40KB gzipped) is the largest single
dependency on the client. Acceptable for an app of this complexity.

### `react-router-dom` ^7.6.0

**What it provides.** Client-side routing: `<BrowserRouter>`,
`<Routes>`, `<Route>`, `<Link>`, `<NavLink>`, `useParams`,
`useNavigate`, `useSearchParams`.

**Why the project needs it.** SPA navigation without full page
reloads. The route table in `App.jsx` is the structure of the app.

**Alternatives.**

- **TanStack Router.** Type-safe, data-loader integrated. Stronger
  guarantees, more setup. For a JS project the type safety benefit
  is partial.
- **Wouter.** Tiny (~1.5KB), minimal API. Sufficient for small apps.
  Loses nested routes, data APIs.
- **Hand-rolled `history` API.** Possible but uninteresting.

**Trade-offs.** React Router is the most common choice and the
documentation is excellent. v7 changed several APIs from v6 — we use
the new shape (`<Routes>`, `<Route element>`).

### `lucide-react` ^0.525.0

**What it provides.** SVG icon components (e.g., `<BookOpen />`,
`<LogOut />`, `<PlayCircle />`).

**Why the project needs it.** Consistent icon set, tree-shakeable
(only the icons you import are bundled), accessible (aria-hidden
default).

**Alternatives.**

- **Inline SVGs.** Maximum control, no dependency. We'd duplicate
  SVG paths in many components.
- **Heroicons / Feather.** Similar icon libraries. Lucide is a
  Feather fork with more icons and active maintenance.

**Trade-offs.** Small. The library is tree-shakeable so unused icons
don't bloat the bundle.

---

## Frontend dev dependencies

### `vite` ^7.0.0

**What it provides.** Dev server with HMR, ES build, production
build, preview server. Plugin ecosystem.

**Why the project needs it.** Vite gives us instant HMR in dev and a
production build with hashed asset names (which the service worker
caches cache-first). Without it we'd use webpack (slower) or rollup
directly (more setup).

**Alternatives.**

- **Webpack.** The previous standard. Slower dev startup, more
  config. Vite is faster and simpler.
- **esbuild (direct).** Just a bundler. You'd build the dev server
  yourself.
- **Parcel.** Zero-config. Works well until you need to customize;
  then you fight the framework.

**Trade-offs.** Vite's dev server is in-process — for very large
projects it can be a memory hog. For this app it's instant.

### `@vitejs/plugin-react` ^5.0.0

**What it provides.** Vite plugin for React: Fast Refresh, JSX
transform, automatic runtime.

**Why the project needs it.** Fast Refresh keeps component state on
HMR — you don't lose form input when you edit a component.

### `tailwindcss` ^4.1.10, `@tailwindcss/vite` ^4.1.10

**What they provide.** Utility-first CSS framework. The Vite plugin
processes Tailwind classes at build time.

**Why the project needs it.** Styling without writing separate CSS
files per component. The design lives in `client/src/index.css` plus
utility classes in JSX. Faster to write, easier to scan.

**Alternatives.**

- **CSS Modules.** Scoped styles per component. More files, less
  utility reuse. Good for larger teams.
- **Styled-components / Emotion.** CSS-in-JS. Runtime cost (smaller
  with the modern zero-runtime variants). Adds a dependency.
- **Vanilla CSS.** Maximum control, most verbose.

**Trade-offs.** Tailwind's class lists can get long
(`"flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ..."`).
The fix is extracting repeated patterns into components (which is
why `common.jsx` has `StatusBadge`, `EmptyState`, etc.).

---

## External services

### YouTube IFrame Player API

**What it provides.** Embedded video player via `<iframe>`, plus a
JavaScript API for control (`playVideo`, `pauseVideo`, `seekTo`,
`getCurrentTime`, `getDuration`, event handlers).

**Why the project needs it.** It is the only documented, compliant
way to embed YouTube videos in a web app. The whole point of the
project is to keep using YouTube's player while removing the
surrounding noise.

**What we would build without it.** Nothing compliant. Any
alternative (downloading, re-hosting, stream extraction) violates
YouTube's ToS and is off the table.

**Trade-offs / limitations.**

- The player makes its own decisions about ads, captions, and
  availability. We can't change that.
- Embedding is sometimes blocked (error 101/150 — the owner
  disallows embedding). The UI surfaces the error.
- The IFrame API is loaded from `https://www.youtube.com/iframe_api`
  — if YouTube is unreachable, the player can't initialize.
- Datacenter IPs may see a "confirm you're not a bot" screen inside
  the iframe. Documented in `youtube-integration.md` as a YouTube-side
  restriction we can't work around.

### YouTube oEmbed endpoint

**What it provides.** Public, no-key endpoint
(`https://www.youtube.com/oembed?url=...&format=json`) that returns
`{ title, author_name, thumbnail_url }` for a video URL.

**Why the project needs it.** Title and thumbnail for saved videos,
without an API key. oEmbed is a public standard — no quota, no auth.

**Limitations.** No duration, no description, no channel id. That's
why `durationSec` is learned from the player while watching (or
from the Data API on import).

### YouTube Data API v3

**What it provides.** Search (`search.list`), video metadata
(`videos.list`), playlist metadata (`playlists.list`), playlist
contents (`playlistItems.list`).

**Why the project needs it.** Two features — search and playlist
import — need more than oEmbed offers.

**Configuration.** Set `YOUTUBE_API_KEY` in `server/.env`. Without
it, those features return `501 { configured: false }` and the app
works fully via URL-pasting.

**Quota.** 10,000 units/day default. `search.list` costs 100 units
(only ~100 searches/day); `videos.list` and the playlist endpoints
cost 1 unit each. We rate-limit our routes (10/min search, 5/min
import) so a runaway client can't drain the quota.

**Trade-offs / limitations.**

- Quota is shared across all users of this server's API key. A
  multi-tenant deployment would need per-user keys (OAuth).
- 403 from Google is translated to a 429 with a friendly message.
- The Data API cannot return video durations without a follow-up
  `videos.list` call (1 unit) — the `searchYouTubeVideos` function
  does this automatically.

### Service Worker API (browser)

**What it provides.** A script that runs in a separate thread,
intercepts `fetch` events for its scope, can cache responses.

**Why the project needs it.** Offline app shell + asset caching.
Without it, repeat visits re-download every JS chunk.

**Trade-offs.** SW registration only works on HTTPS (or
`localhost`). It conflicts with Vite's dev HMR, so we register it
only in production builds.

### IndexedDB (browser)

**What it provides.** Browser-side structured storage with
transactions, object stores, indexes.

**Why the project needs it.** Two offline jobs that localStorage
can't do: (a) store multiple cached API responses with their own
keys (localStorage is single-key string), (b) queue progress writes
with auto-incrementing ids.

**What we would build without it.** A JSON blob in localStorage,
parsed on every access. Doable for tiny data; painful as it grows.

**Alternatives.**

- **`idb` library.** Wraps IndexedDB's verbose API in Promises.
  Saves ~30 lines. We chose raw IndexedDB because the API surface
  is small and we want to understand it.
- **localforage.** Drops in for localStorage API but uses IndexedDB
  underneath. Hides the structure; we lose the explicit
  cache-store-vs-queue-store separation.

**Trade-offs / limitations.** IndexedDB has quirks (version upgrades,
transaction auto-close on the next microtask after the last
operation). Our `tx()` helper in `offline.js` wraps these so the rest
of the code reads simply.

### Cache Storage API (browser)

**What it provides.** Key-value store for `Request`/`Response`
pairs, used by service workers.

**Why the project needs it.** The SW caches hashed assets and SPA
navigations here.

**Alternatives.** None for SW caching — it's the API.

---

## Tools / orchestrators (root + dev)

### `concurrently` ^9.1.2

**What it provides.** Runs multiple processes in parallel, prefixes
their output, kills all when one dies.

**Why the project needs it.** `npm run dev` starts Express and Vite
in parallel. Without `concurrently`, you'd open two terminals.

**Alternatives.** `npm-run-all`, `pm2`, raw `&` in bash. `concurrently`
is the simplest.

### `bash` (scripts/dev.sh)

**What it provides.** Shell scripting.

**Why the project needs it.** The dev orchestrator needs conditionals
("if mongod is present and not running, start it") and loops. Bash
is the right tool.

**Alternatives.** A Node script (`scripts/dev.js`). The advantage is
cross-platform (Windows without WSL). The disadvantage is more
verbose process management. Bash is fine for the typical dev
environment.

---

## What Is Not Here (and why)

These are deliberately not dependencies. The reasons are worth
stating so future contributors don't add them without cause:

- **`helmet`.** Sets many HTTP security headers. We hand-set the two
  that matter for a JSON API (`X-Content-Type-Options`,
  `Referrer-Policy`) and skip the rest (CSP, HSTS, etc.) — they
  protect against threats that don't apply to a JSON API.
- **`axios`.** The `api()` wrapper does what axios would, in 60 lines
  we control. Adding axios would mean learning its interceptor API
  and accepting its quirks (e.g., 4xx throws by default).
- **`express-rate-limit`.** Hand-rolled `rateLimit.js` is 45 lines
  and we control the sweep policy. The library would add a Redis
  option we don't need.
- **`express-validator` / `zod` / `joi`.** Validation is per-route,
  4–8 lines per field. A schema-validation library would centralize
  it but add a layer of indirection.
- **`passport`.** Multiple strategies (Google, GitHub, etc.) would
  need it. Local email/password is fine with our hand-rolled
  `requireAuth`.
- **Redux / Zustand / Recoil.** Server state is per-page; the only
  truly global state is auth (Context). A state library would add
  boilerplate without solving a real problem.
- **React Query / SWR.** Query caching with focus-refetch. The app
  re-fetches on mount, which is fine for a personal app. At scale
  this would be the first dependency to add.
- **`idb` / `dexie`.** IndexedDB wrappers. Our usage is small enough
  (two stores, simple get/put) that raw IndexedDB is fine.
- **`workbox`.** Google's SW toolkit. Would generate the SW for us;
  we'd lose the ~100 lines of explicit policy that are easy to
  audit.

Each of these is a reasonable choice for a project that needs what
they offer. None of them are needed here, and adding them would
increase install size, build time, and the surface area a
contributor has to learn — without paying for themselves.

---

Next: [`decisions-tradeoffs-improvements.md`](decisions-tradeoffs-improvements.md)
covers the architectural trade-offs honestly.
