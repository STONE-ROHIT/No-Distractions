# No Distractions — Worklog

---
Task ID: 1
Agent: main-agent
Task: Stage 1 — Restructure sandbox repo to MERN project (No Distractions)

Work Log:
- Verified environment: Node 24, Bun 1.3, Git, AVX CPU, npm registry + YouTube oEmbed reachable.
- Downloaded MongoDB 8.0.4 (ubuntu2204 build, runs fine on Debian 13) to /home/z/my-project/.mongodb/, started mongod on 127.0.0.1:27017 with dbpath .mongodb/data.
- Removed the sandbox Next.js template (src/, prisma/, next.config.ts, etc.).
- Created root package.json: `dev` -> scripts/dev.sh orchestrator (installs deps, starts local mongod if present, runs API+client via concurrently). Kept a no-op `db:push` script because the sandbox dev runner calls it.
- Created server/ scaffold: Express 5 (ESM), dotenv, cors, /api/health, mongoose connect. server/.env with random JWT secret (not committed); .env.example committed.
- Created client/ scaffold: Vite 7 + React 19 + Tailwind CSS 4 (via @tailwindcss/vite), port 3000 strict, /api proxy -> localhost:4000, allowedHosts true (sandbox gateway), favicon, minimal App.
- Untracked .env (git rm --cached), rewrote .gitignore for MERN + sandbox infra dirs.
- Killed old Next.js dev process, restarted .zscripts/dev.sh; verified: Vite serves :3000, Express on :4000, /api proxy works, MongoDB connected.
- Commits: `chore: initialize MERN project structure` + cleanup commit for leftover .next cache.

Stage Summary:
- Repo is now a clean MERN skeleton: client/ (Vite) + server/ (Express) + scripts/ + docs/.
- Runtime verified: client :3000 (public), API :4000 (proxied), MongoDB :27017 (local binary in .mongodb/, gitignored).
- Next: Stage 2 — Mongoose models (User, LibraryItem, Playlist, Note) + Express foundation (error handling, routing modules).

---
Task ID: 2
Agent: main-agent
Task: Stages 2-7 — Backend (models, auth, YouTube, library, playlists, notes)

Work Log:
- Mongoose models: User (toJSON strips passwordHash), LibraryItem (video metadata + progress in one doc, unique {user,videoId}, progressPercent virtual), Playlist (embedded item refs), Note (keyed user+videoId, survives library removal).
- Auth: JWT 7d + bcryptjs; requireAuth middleware; signup/login/me; per-field validation messages; no account enumeration.
- YouTube utils: extractVideoId (watch/youtu.be/shorts/embed/live/bare id, 11-char [A-Za-z0-9_-]); oEmbed metadata with 10s timeout; 400/401/403/404 -> unavailable.
- Routes: /api/videos/metadata, /api/library (save/list/remove/progress PATCH with 95% auto-complete), /api/playlists (CRUD + items + summary/detail shapers), /api/notes (CRUD).
- Library delete pulls playlist references ($pull), keeps notes by design.
- scripts/api-test.sh: 45 tests, all passing (idempotent via random email suffix; verified ownership isolation between two users).

Stage Summary:
- Full REST API working and tested. API shape documented in route files.
- Commits: feat(server) models, feat(auth), feat(videos), feat(library)+feat(playlists)+feat(notes).
- Next: frontend (stages 8-9) — Vite React app, AuthContext, watch page with IFrame Player API.

---
Task ID: 3
Agent: main-agent
Task: Stages 8-12 — Frontend, E2E verification, documentation

Work Log:
- Built complete React client: AuthContext (token restore + 401 auto-logout), ToastContext, api wrapper with Bearer auth, RequireAuth guard, mobile bottom tab bar + desktop navbar.
- YouTubePlayer.jsx: official IFrame API wrapper — one-time script load, 10s progress interval, pause/end final saves, unmount save, resume seekTo with guard rails, error code mapping, playerRef for note seeking.
- Pages: Landing (hero + features + honest YouTube note), Login/Signup (field errors), Dashboard (continue watching / recent / playlists + URL input), Watch (player, save/remove, resumed badge + start over, notes, playlist sidebar), Library (status filters + empty states), Playlists (create modal + cards), PlaylistDetail (rename/delete/remove entries).
- Fixed during E2E: AddToPlaylistModal import style (default vs named), duplicate aria-label="Main" on both navs, logout race (guard beat navigate — fixed with deferred state clear, lands on /).
- Browser E2E (agent-browser, incl. through Caddy gateway): signup → paste URL → oEmbed metadata → player iframe loads → save → notes CRUD w/ 2:10 timestamp attach → resume badge "Resumed from 2:10 of 19:00" → playlist create/add/sidebar → dashboard sections → logout → login (data persists) → mobile 390px layout + bottom tabs → second session user isolation (empty library/playlists) → full stack kill/restart with MongoDB data intact → vite production build succeeds.
- Environment limitation found: YouTube blocks iframe playback from datacenter IPs ("confirm you're not a bot") — IFrame API bridge itself verified working (seekTo + events + metadata). Documented in docs/youtube-integration.md.
- Docs: README + 5 docs/*.md with 4 Mermaid diagrams, all cross-linked to real source files.
- Final: 45/45 API tests, health OK through gateway, dev.log clean.

Stage Summary:
- MVP complete per Definition of Done: all 10 criteria verified.
- 10 commits total with conventional messages.
- Stack: client :3000 (public via Caddy), API :4000, MongoDB :27017 (local binary, .mongodb/ gitignored).

---
Task ID: 4 (phase 2)
Agent: main-agent
Task: Phase 2 — Stages 1-5 (stabilization, bookmarks, dashboard/stats, discovery, focus mode)

Work Log:
- Stage 1: progress writes carry savedAt; server ignores stale writes (idempotent retries, offline-ready). Player emits final progress on unmount/tab-hide/pagehide. GET /api/library?videoId= single lookup + q/status/sort/limit params. Rate-limited /api/auth (20/min). nosniff+referrer headers, trust proxy 1.
- Stage 2: Bookmark model (user, videoId, positionSec, label) + CRUD routes with duplicate guard. Watch page restructured: tabbed side panel (Notes/Bookmarks/Playlist) via WatchSidebar; bookmark add/edit/delete + seek verified in browser, mobile no-overflow.
- Stage 3: GET /api/stats (position-based estimates, 7-day activity, streak, unfinished playlists w/ next video). Playlist PATCH items/order (permutation-validated) + next in summaries. Dashboard rework (activity strip, continue learning, unfinished playlists, recently added/watched). Stats page + Activity nav tab. Up-next footer in playlist panel.
- Stage 4: YouTube Data API v3 behind YOUTUBE_API_KEY: GET /videos/search, /videos/playlist, POST /playlists/import (dedup, first 50). 501+configured:false without key. Discover page with import preview + deep link ?import=. Library: search/sort/bookmarked filter/show-more, URL-mirrored state. POST /library accepts durationSec. Bookmarks GET without videoId returns all.
- Stage 5: focus mode (body.nd-focus CSS hides chrome; sidebar hidden; full-width video), shortcuts Space/K, arrows, B, F, Esc with input/textarea guard. Fixed a hooks-after-early-return crash found during browser testing.

Stage Summary:
- 5 commits on top of MVP. 45/45 legacy API tests pass throughout; each stage browser-verified.
- Verified in-app: bookmarks CRUD+seek, reorder, up-next, dashboard sections, stats page, library filters/sort/search, discover no-key UX, focus mode + shortcuts incl. typing guard.
- Untested (env limitation): live Data API search/import (no real key in sandbox) — no-key path tested; parser/utils get unit tests in Stage 7.
- Next: Stage 6 offline (SW + IDB), Stage 7 node:test suite + docs.

---
Task ID: 5 (phase 2)
Agent: main-agent
Task: Phase 2 — Stages 6-7 (offline support, test suite, documentation)

Work Log:
- Stage 6: hand-rolled service worker (cache-first hashed assets + capped thumbnails, network-first SPA shell, /api never intercepted; prod-only registration). IndexedDB layer: read-through cache for library/playlists/notes/bookmarks/stats + progress queue. api() falls back to cache on network failure (nd:offline-data event) and queues failed progress PATCHes; replay on online/30s/manual. Fixed offline session drop: auth/me network failure now restores from a localStorage profile mirror instead of logging out. Verified E2E on vite preview: offline reload (SW shell + IDB data + banner), queue replay (server position 0→42 after reconnect), queue cleared. Logout wipes all offline data.
- Stage 7: app.js/index.js split for in-process testing. server/tests with node:test (30 tests): real app on ephemeral port + dedicated test DB; YouTube mocked at the fetch boundary (oEmbed + Data API + 403 quota path); unique spoofed IPs per test client so the auth rate limiter doesn't trip the suite. Covers auth, metadata/search (501 no-key + mocked with-key), savedAt conflict rules, filters/sort/pagination, playlist lifecycle/reorder/import-dedup, notes, bookmarks, cross-user isolation, stats, rate limiting. Plus youtube-utils unit tests (URL/duration parsing). Root npm test wired; bash smoke kept as live companion.
- Docs: new progress-sync.md, offline-support.md, testing.md, security.md; updated architecture, database-models, authentication, youtube-integration (Data API + quota); README fully rewritten (features, endpoints incl. bookmarks/stats/search/import/reorder, YOUTUBE_API_KEY setup, tests, offline instructions, limitations).
- Final regression: 30/30 node tests, 45/45 bash smoke, client build OK, all 6 pages mobile-overflow-clean (390px), E2E pass over dashboard/watch tabs/library bookmarked filter/stats/discover.

Stage Summary:
- Phase 2 complete: 8 commits (stabilization, bookmarks, dashboard/stats, discovery/import, focus mode, offline, tests, docs).
- All MVP features preserved and regression-tested throughout.
- Known env limitation: live Data API search/import not exercisable without a real key — mocked in tests, no-key path E2E-verified, documented.

---
Task ID: 6
Agent: main-agent
Task: Comprehensive project documentation (interview-prep depth)

Work Log:
- Read all 9 existing docs (architecture, database-models, authentication, youtube-integration, progress-sync, offline-support, security, testing, request-lifecycle) plus the README, package.json files, vite.config.js, .env.example.
- Read all server source files (app.js, index.js, middleware/{auth,errorHandler,rateLimit}.js, utils/{errors,youtube}.js, config/db.js, models/*, routes/*) and key client files (main.jsx, App.jsx, context/*, lib/*, components/YouTubePlayer.jsx, components/AppLayout.jsx, components/WatchSidebar.jsx, components/common.jsx, public/sw.js, pages/Watch.jsx, pages/Dashboard.jsx, pages/Library.jsx, pages/Landing.jsx, pages/NotFound.jsx). Verified tests/api.test.js and tests/helpers.js boot the real app in-process against a test DB.
- Designed a documentation set that extends the existing per-feature docs (which describe what/how) with a parallel learning path that explains why/why-this-way/trade-offs/alternatives/limitations/modifications.
- Wrote 8 new docs (5,071 lines total):
  - docs/00-overview.md (187) — single-file map; the "start here" doc
  - docs/concepts-and-foundations.md (633) — HTTP, REST, Express middleware, Mongoose, async JS, React state, JWT, validation, caching — explained through the code
  - docs/codebase-walkthrough.md (703) — folder-by-folder tour with file paths, responsibilities, "what calls what"
  - docs/api-and-data-design.md (647) — schemas, indexes, endpoint contracts, ownership, the savedAt conflict rule
  - docs/feature-walkthroughs.md (697) — 10 end-to-end lifecycles (auth, save, watch+progress, notes, bookmarks, playlists, search/import, focus, offline, stats)
  - docs/technologies-and-dependencies.md (538) — every dependency: what/why/alternatives/trade-offs
  - docs/decisions-tradeoffs-improvements.md (817) — 15 architectural decisions, honest trade-offs, limitations, future improvements; the interview-prep doc
  - docs/practical-guides.md (849) — 10 how-to guides (add page/endpoint/model/feature, debug auth/DB/API, write tests, change safely, test offline)
- Updated README.md to index the new docs as a learning path alongside the existing reference docs.
- Verified all 51 markdown links in the new docs resolve to real files; the 11 "missing" path references flagged by a quick checker were all false positives (glob patterns, in-page anchors, how-to example files).
- Did NOT modify working application code — pure docs work. Where the audit revealed genuine design decisions worth noting (e.g. bcrypt rounds at 10, in-memory rate limiter, localStorage JWT), they are documented as intentional decisions with trade-offs, not as bugs to fix in this pass.

Stage Summary:
- 8 new docs + updated README, all under /home/z/my-project/docs/.
- Existing 9 per-feature docs preserved unchanged.
- 5,071 lines of new documentation covering what/why/how/why-this-way/trade-offs/alternatives/limitations/modifications for every important feature, implementation, technology, and architectural decision.
- All cross-references verified against the actual codebase; no claim of completeness made for features not verified.
- Reader can: explain the entire app, defend decisions in an interview, trace requests across the stack, add features without copying blindly, debug common problems.
