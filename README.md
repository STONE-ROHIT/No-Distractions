# No Distractions

**Learn from YouTube. Without the distractions.**

A learning-focused player and personal library built around YouTube's
educational content — the video, your notes, your progress, and nothing
else. No recommendations, no Shorts, no comments, no autoplay queue.

> **Status: Phase 1 — Foundation complete.** This is a scaffold, not yet a
> product — see [Roadmap](#roadmap) below.

## What this is

Full write-up: [`docs/01-project-overview`](./docs/01-project-overview/).
Short version: YouTube hosts an enormous amount of genuinely great
educational video, wrapped in a product designed to maximize watch time,
not comprehension. No Distractions keeps YouTube's own official embedded
player (nothing is scraped, downloaded, or re-hosted) and replaces
everything around it with a distraction-free learning environment:
timestamped notes and bookmarks, resumable progress, playlists organized
as courses, and a focus mode.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + TypeScript, Vite, Tailwind CSS, React Router, TanStack Query |
| Backend | Node.js + Express 5 + TypeScript |
| Database | MongoDB + Mongoose |
| Auth | JWT in `httpOnly` cookies, with server-side refresh-token rotation ([ADR-002](./docs/22-architecture/decisions/ADR-002-authentication-strategy.md)) |
| Validation | Zod |
| Logging | Pino (structured JSON; pretty-printed in development) |
| Testing | Vitest (+ Supertest on the backend, React Testing Library on the frontend) |
| Linting/formatting | ESLint (flat config) + Prettier |

Full reasoning for each choice: [`docs/22-architecture/decisions/`](./docs/22-architecture/decisions/).

## Project structure

```text
no-distractions/
├── client/          React + Vite frontend       → client/src/*/README.md explains each folder
├── server/          Express + TypeScript backend → server/src/*/README.md explains each folder
├── docs/            The learning documentation system (see docs/README.md)
└── package.json     Root orchestration (npm workspaces: client, server)
```

Every source folder in `client/src/` and `server/src/` has its own short
`README.md` explaining what belongs there and what doesn't — read one
before adding a file to that folder for the first time.

## Getting started

Full walkthrough with troubleshooting: [`docs/00-getting-started`](./docs/00-getting-started/).

```bash
git clone <your-fork-or-repo-url> no-distractions
cd no-distractions
npm install
cp server/.env.example server/.env   # then set MONGODB_URI
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:5000 (health check at `/api/health`)

**Requires:** Node.js 22 LTS or newer (24 LTS recommended), npm 10+, and
either a local `mongod` or a [MongoDB Atlas](https://www.mongodb.com/atlas)
connection string.

## Available scripts

Run from the repo root; each fans out to both `client` and `server`.

| Command | What it does |
|---|---|
| `npm run dev` | Runs both dev servers concurrently |
| `npm run build` | Type-checks and builds both packages for production |
| `npm run lint` | ESLint across both packages |
| `npm test` | Vitest across both packages |
| `npm run format` | Formats the whole repo with Prettier |
| `npm run format:check` | Checks formatting without writing (used in CI) |

## Environment variables

Only `server/.env` exists so far — see [`server/.env.example`](./server/.env.example).
The client introduces its first environment variable when it starts
calling the API in a later phase. **No real secret is ever committed** —
`.env` is gitignored; `.env.example` documents the shape.

| Variable | Used by | Meaning |
|---|---|---|
| `NODE_ENV` | server | `development` \| `test` \| `production` |
| `PORT` | server | Port Express listens on |
| `MONGODB_URI` | server | MongoDB connection string |
| `CLIENT_URL` | server | Frontend origin, for CORS + cookie settings |

## Testing

`npm test` runs Vitest for both packages. Phase 1 has one meaningful
backend test (`server/tests/health.test.ts`, via Supertest against the
Express app directly — no live database required) and one frontend smoke
test (`client/src/App.test.tsx`). Real feature tests (auth, progress,
playlists, ...) are added in the same phase as the feature itself — see
`docs/18-testing` (written once that phase lands).

## Documentation

This README covers "how do I run it". Everything else — how it works,
why it's built this way, and how to learn each underlying technology
through this actual codebase — lives in [`docs/`](./docs/), starting at
[`docs/README.md`](./docs/README.md).

## YouTube & legal notes

No Distractions only uses officially supported YouTube mechanisms: the
YouTube Data API v3 for metadata, and the YouTube IFrame Player API for
playback. It does not scrape, download, proxy, or re-host video streams,
and does not bypass ads or DRM. Full explanation, including the concrete
technical limitations that follow from playing by these rules, lands in
`docs/11-youtube-integration` (Phase 4).

## Roadmap

- [x] **Phase 1 — Foundation** — monorepo, tooling, Express skeleton, docs system
- [ ] Phase 2 — Authentication
- [ ] Phase 3 — Application Shell
- [ ] Phase 4 — YouTube Integration
- [ ] Phase 5 — Learning Player
- [ ] Phase 6 — Notes & Bookmarks
- [ ] Phase 7 — Playlists
- [ ] Phase 8 — Library
- [ ] Phase 9 — Statistics
- [ ] Phase 10 — Focus Mode
- [ ] Phase 11 — Offline Support
- [ ] Phase 12 — Testing & Hardening
- [ ] Phase 13 — Production Polish
- [ ] Phase 14 — Documentation Finalization

## License

Not yet decided — add one (MIT is the common default for a portfolio
project) before making the repository public.
