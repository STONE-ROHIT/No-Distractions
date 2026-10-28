# No Distractions

**Learn from YouTube. Without the distractions.**

A learning-focused web application for watching educational YouTube videos
in a simple, calm interface — without the surrounding noise of the regular
YouTube experience. Save videos to a personal library, organize them into
playlists, track your progress, take timestamped notes, and mark moments
worth revisiting.

This project is also a reference implementation of the **MERN stack**
(MongoDB, Express, React, Node.js) — built to be read, with documentation
that explains how each part works.

## Features

- **Landing page** with a clear pitch and signup/login.
- **Authentication** — signup, login, logout, protected pages, hashed
  passwords.
- **Dashboard** — continue learning, unfinished playlists with "up next",
  recently added/watched videos, and a small honest activity overview.
- **Video learning page** — paste any YouTube link, watch it through the
  official embedded player, save it, take notes, place bookmarks.
- **Personal library** — saved videos with search, status filters
  (in progress / completed / not started / bookmarked), and sorting.
- **Learning playlists** — group saved videos, reorder them, follow
  completion progress, and continue with the next video in one click.
- **Progress tracking** — periodic saves during playback, resume where you
  left off, reliable completion handling, and duplicate-proof writes.
- **Timestamped notes & bookmarks** — write notes with optional
  timestamps, one-click bookmarks with labels; click any timestamp to jump
  back to that moment.
- **Discover** — search YouTube and import playlists (optional, via the
  official Data API; see below).
- **Focus mode** — hides navigation and side panels, gives the video the
  full width, and adds keyboard shortcuts (Space play/pause, ←/→ seek,
  B bookmark, F fullscreen, Esc exit).
- **Statistics** — an honest activity page: completed/in-progress videos,
  position-based time estimates, weekly activity, streak.
- **Offline support** — the app shell and your data stay readable without
  a connection, and progress updates sync when you're back online.

## Tech Stack

| Layer     | Technology                                            |
| --------- | ----------------------------------------------------- |
| Frontend  | React 19, Vite 7, JavaScript, React Router 7, Tailwind CSS 4 |
| Backend   | Node.js, Express 5                                    |
| Database  | MongoDB with Mongoose 8                               |
| Auth      | JWT + bcryptjs                                        |
| YouTube   | Official IFrame Player API + public oEmbed endpoint; optional Data API v3 |
| Offline   | Service worker + IndexedDB (no libraries)             |
| Tests     | Node's built-in `node:test` + a curl smoke script     |

## Project Structure

```
no-distractions/
├── client/                  # React frontend (Vite)
│   ├── public/sw.js         # service worker (production builds)
│   └── src/
│       ├── components/      # Player, watch sidebar, notes, bookmarks…
│       ├── context/         # AuthContext, ToastContext
│       ├── lib/             # api wrapper, offline storage, YouTube parsing
│       └── pages/           # Landing, Auth, Dashboard, Watch, Library,
│                            # Playlists, Discover, Stats, NotFound
├── server/                  # Express API
│   ├── src/
│   │   ├── app.js           # the Express app (imported by tests)
│   │   ├── index.js         # startup: connect DB, listen
│   │   ├── middleware/      # requireAuth, rateLimit, central errors
│   │   ├── models/          # User, LibraryItem, Playlist, Note, Bookmark
│   │   ├── routes/          # auth, videos, library, playlists, notes,
│   │   │                    # bookmarks, stats
│   │   └── utils/           # YouTube helpers, httpError
│   └── tests/               # node:test integration + unit tests
├── scripts/
│   ├── dev.sh               # starts MongoDB + API + client together
│   └── api-test.sh          # live smoke test (45 curl checks)
├── docs/                    # architecture and design notes
└── package.json             # root orchestrator (npm run dev / npm test)
```

## Prerequisites

- **Node.js ≥ 20.19** (the server uses `node --watch`)
- **MongoDB** — either a local install or MongoDB Atlas
- npm (or bun — the dev script works with either)

## Setup

```bash
# 1. Clone and install dependencies
git clone <your-repo-url> no-distractions
cd no-distractions
npm install              # root tooling (concurrently)
npm --prefix server install
npm --prefix client install

# 2. Configure the server environment
cp server/.env.example server/.env
#   then edit server/.env — at minimum set a long random JWT_SECRET

# 3. Make sure MongoDB is running (see below)

# 4. Start everything
npm run dev
```

`npm run dev` runs `scripts/dev.sh`, which starts:

- the Express API on **http://localhost:4000**
- the Vite dev server on **http://localhost:3000**

Open **http://localhost:3000** in your browser. You can also run the two
halves separately (`npm run dev:server` / `npm run dev:client`).

### Configuring MongoDB

The server reads `MONGO_URI` from `server/.env`.

**Local MongoDB** (typical default): use
`MONGO_URI=mongodb://127.0.0.1:27017/no-distractions`.

**MongoDB Atlas** (no local install): create a free cluster, add a
database user, allow access from your IP, and paste the connection string:

```
MONGO_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/no-distractions
```

### Environment Variables (`server/.env`)

| Variable          | Default                                   | Purpose                          |
| ----------------- | ----------------------------------------- | -------------------------------- |
| `PORT`            | `4000`                                    | API port                         |
| `MONGO_URI`       | `mongodb://127.0.0.1:27017/no-distractions` | MongoDB connection string      |
| `JWT_SECRET`      | — (required)                              | Signing key for auth tokens      |
| `JWT_EXPIRES_IN`  | `7d`                                      | Token lifetime                   |
| `CLIENT_ORIGIN`   | `http://localhost:3000`                   | Allowed CORS origin              |
| `YOUTUBE_API_KEY` | — (optional)                              | Enables search & playlist import |

Never commit `.env` — it is gitignored; commit only `.env.example`.

### Enabling YouTube search & playlist import (optional)

Search and playlist import use the official **YouTube Data API v3**, which
requires a (free) API key:

1. In the [Google Cloud Console](https://console.cloud.google.com/), create
   a project and enable **YouTube Data API v3**.
2. Create an **API key** credential (APIs & Services → Credentials).
3. Put it in `server/.env` as `YOUTUBE_API_KEY=…` and restart the API.

Without a key everything else works — you just paste links instead of
searching. Quota and compliance details:
[`docs/youtube-integration.md`](docs/youtube-integration.md).

## API Endpoints

All endpoints are under `/api`. Endpoints marked 🔒 require
`Authorization: Bearer <token>`.

| Method   | Path                                | Purpose                                    |
| -------- | ----------------------------------- | ------------------------------------------ |
| `POST`   | `/auth/signup`                      | Register `{ name, email, password }`       |
| `POST`   | `/auth/login`                       | Log in, returns `{ token, user }`          |
| `GET`    | `/auth/me` 🔒                        | Current user                               |
| `GET`    | `/videos/metadata?url=…` 🔒          | Validate a link, fetch oEmbed metadata     |
| `GET`    | `/videos/search?q=…` 🔒              | Search YouTube (needs `YOUTUBE_API_KEY`)   |
| `GET`    | `/videos/playlist?url=…` 🔒          | Preview a YouTube playlist (needs key)     |
| `GET`    | `/library` 🔒                        | Saved videos — supports `?videoId=`, `?q=`, `?status=`, `?sort=`, `?page=&limit=` |
| `POST`   | `/library` 🔒                        | Save a video `{ videoId, durationSec? }`   |
| `PATCH`  | `/library/:id/progress` 🔒           | Update `{ positionSec, durationSec, completed?, savedAt? }` |
| `DELETE` | `/library/:id` 🔒                    | Remove from library (also pulls it from playlists) |
| `GET`    | `/playlists` 🔒                      | Playlists with counts + `next` video       |
| `POST`   | `/playlists` 🔒                      | Create `{ title, description? }`           |
| `POST`   | `/playlists/import` 🔒               | Import a YouTube playlist `{ url, title? }` (needs key) |
| `GET`    | `/playlists/:id` 🔒                  | Playlist detail with populated videos      |
| `PATCH`  | `/playlists/:id` 🔒                  | Rename / edit description                  |
| `DELETE` | `/playlists/:id` 🔒                  | Delete playlist (library untouched)        |
| `POST`   | `/playlists/:id/items` 🔒            | Add a library video `{ libraryItemId }`    |
| `PATCH`  | `/playlists/:id/items/order` 🔒      | Reorder `{ order: [entryId, …] }`          |
| `DELETE` | `/playlists/:id/items/:itemId` 🔒    | Remove a video from the playlist           |
| `GET`    | `/notes?videoId=…` 🔒                | Notes for a video (oldest first)           |
| `POST`   | `/notes` 🔒                          | Create `{ videoId, text, timestampSec? }`  |
| `PATCH`  | `/notes/:id` 🔒                      | Edit `{ text, timestampSec? }`             |
| `DELETE` | `/notes/:id` 🔒                      | Delete a note                              |
| `GET`    | `/bookmarks?videoId=…` 🔒            | Bookmarks for a video (or all, without param) |
| `POST`   | `/bookmarks` 🔒                      | Create `{ videoId, positionSec, label? }`  |
| `PATCH`  | `/bookmarks/:id` 🔒                  | Edit `{ label?, positionSec? }`            |
| `DELETE` | `/bookmarks/:id` 🔒                  | Delete a bookmark                          |
| `GET`    | `/stats` 🔒                          | Learning statistics                        |

## Tests

```bash
npm test                # node:test suite: real app, real test DB, mocked YouTube
bash scripts/api-test.sh   # live smoke test against a running dev stack
```

The integration suite covers auth, library and progress sync rules
(including the offline-safe `savedAt` conflict policy), playlists
(reorder/import), notes, bookmarks, cross-user isolation, stats, and rate
limiting. Details: [`docs/testing.md`](docs/testing.md).

## How It Works

Short version: the browser only talks to the **Vite dev server** (port
3000), which proxies `/api/*` to the **Express server** (port 4000).
Express enforces authentication, ownership, and rate limits on every
request and talks to **MongoDB**. Videos play through the official
YouTube embedded player; titles and thumbnails come from YouTube's public
oEmbed endpoint; search and playlist import (optional) go through the
official Data API v3. A service worker (production builds) caches the app
shell, and an IndexedDB layer keeps your data readable offline while
queuing progress writes for automatic sync.

More detail, with diagrams. The docs are organized as a learning path:

**Learning path (read in this order if you're new to the codebase):**

- [`docs/00-overview.md`](docs/00-overview.md) — the map. Problem, features, stack, runtime diagram, links to deeper docs.
- [`docs/concepts-and-foundations.md`](docs/concepts-and-foundations.md) — prerequisite concepts (HTTP, REST, Express middleware, Mongoose, React state, async JS, JWT) explained *through* the code.
- [`docs/codebase-walkthrough.md`](docs/codebase-walkthrough.md) — folder-by-folder tour with real file paths, responsibilities, and "what calls what".
- [`docs/api-and-data-design.md`](docs/api-and-data-design.md) — schemas, indexes, endpoint contracts, ownership, the `savedAt` conflict rule.
- [`docs/feature-walkthroughs.md`](docs/feature-walkthroughs.md) — end-to-end lifecycles for auth, save-video, watch+progress, notes, bookmarks, playlists, search/import, offline, focus, stats.
- [`docs/technologies-and-dependencies.md`](docs/technologies-and-dependencies.md) — every dependency: what it provides, why chosen, alternatives, trade-offs.
- [`docs/decisions-tradeoffs-improvements.md`](docs/decisions-tradeoffs-improvements.md) — architectural decisions, honest trade-offs, what would actually improve the project. **Start here for interview prep.**
- [`docs/practical-guides.md`](docs/practical-guides.md) — how-to: add a page / endpoint / model / feature, debug auth/DB/API, write tests.

**Per-subsystem reference docs:**

- [`docs/architecture.md`](docs/architecture.md) — the big picture
- [`docs/database-models.md`](docs/database-models.md) — schemas and why
- [`docs/authentication.md`](docs/authentication.md) — sessions, guards, ownership
- [`docs/progress-sync.md`](docs/progress-sync.md) — the progress lifecycle & conflict rule
- [`docs/youtube-integration.md`](docs/youtube-integration.md) — player, oEmbed, Data API, quota
- [`docs/offline-support.md`](docs/offline-support.md) — what works offline and how sync works
- [`docs/security.md`](docs/security.md) — protections actually present (and their limits)
- [`docs/testing.md`](docs/testing.md) — the two test suites
- [`docs/request-lifecycle.md`](docs/request-lifecycle.md) — one request, end to end

## Trying Offline Mode

The service worker only registers in production builds (it conflicts with
Vite's dev-server hot reload):

```bash
npm --prefix client run build
npm --prefix client run preview   # http://localhost:4173
```

Load the app once, then switch DevTools to offline (or disconnect):
pages, the library, notes, and bookmarks stay readable; progress updates
queue and sync when you reconnect. Video playback itself always requires
a connection — that is YouTube's, and our, hard boundary.

## Current Limitations

- Videos play through YouTube's official player: ads and any YouTube
  restrictions apply exactly as on youtube.com. This app removes the
  *surrounding* distractions, not the player itself.
- oEmbed metadata has no duration or description; durations are learned
  from the player while watching (or known immediately for Data API
  results and imports).
- Progress tracking works only for **saved** videos. Notes and bookmarks
  work for any video, saved or not.
- Offline note *editing* is not supported — only reading cached data and
  queueing progress writes (see `docs/offline-support.md` for the reasoning).
- Playlist imports take the first 50 videos of a YouTube playlist.
- No HTTPS/production deployment setup — this is a local development
  project.

## Possible Future Improvements

- Browser-side end-to-end tests (Playwright) for player and offline flows.
- Drag-and-drop playlist reordering (arrow buttons work today).
- Syncing note edits offline (needs client-generated IDs and merge rules).
- Background Sync API for the progress queue instead of interval replay.
