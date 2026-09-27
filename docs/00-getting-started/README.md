# 00 · Getting Started

This walks through running No Distractions locally, as of the end of
Phase 1. There's no login yet and no real feature to click through — this
is "prove the three pieces (client, server, database) boot and talk to
each other," which is exactly what Phase 1 is for.

## Prerequisites

- **Node.js 22 LTS or newer** (24 LTS "Krypton" recommended — Node 22
  "Jod" also works and is what this project was built and tested against).
  Check with `node -v`.
- **npm 10+** (ships with Node). Check with `npm -v`.
- **MongoDB**, one of:
  - a local `mongod` (install via your OS package manager, or
    [MongoDB Community Server](https://www.mongodb.com/try/download/community)), or
  - a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster — either
    works, you just need a connection string.
- **Git**.

## 1. Clone and install

```bash
git clone <your-fork-or-repo-url> no-distractions
cd no-distractions
npm install
```

This one `npm install` at the repo root installs dependencies for **both**
`client/` and `server/` — they're npm workspaces, not two separate
projects to set up.

## 2. Configure environment variables

Only the server needs any configuration right now (the client introduces
its first environment variable in a later phase, when it starts calling
the API).

```bash
cp server/.env.example server/.env
```

Then open `server/.env` and point `MONGODB_URI` at your database:

```bash
# Local mongod
MONGODB_URI=mongodb://localhost:27017/no-distractions

# Or an Atlas connection string
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/no-distractions
```

Leave `PORT`, `NODE_ENV`, and `CLIENT_URL` at their example defaults
unless you have a reason to change them. See
`server/.env.example` for what each variable does, and
[ADR-001](../22-architecture/decisions/ADR-001-tech-stack-and-typescript.md)
for why `config/env.ts` validates these eagerly on startup instead of
letting a missing variable fail silently later.

## 3. Run it

From the repo root:

```bash
npm run dev
```

This runs the client (Vite dev server) and server (Express, via `tsx
watch`) concurrently, each in its own labeled, colored log stream. You
should see:

- `CLIENT` — Vite serving at `http://localhost:5173`
- `SERVER` — `No Distractions API listening on port 5000 [development]`,
  after it logs a successful MongoDB connection

Open `http://localhost:5173` — you'll see the Phase 1 placeholder page
(the real landing page is built in a later phase).

Verify the API is actually up by hitting the health check directly:

```bash
curl http://localhost:5000/api/health
# {"status":"ok","uptimeSeconds":12,"timestamp":"2026-..."}
```

If this fails with a connection error, check the `SERVER` log — it's
almost always `MONGODB_URI` (see
`docs/23-troubleshooting` once that phase is written, and in the meantime
the "MongoDB connection failed" pattern is: wrong URI, `mongod` not
running, or an Atlas IP allowlist that doesn't include your current IP).

## 4. Verify the toolchain

```bash
npm run lint    # ESLint across both packages
npm run build   # type-checks + builds both packages for production
npm test        # Vitest across both packages
```

All three should pass cleanly on a fresh clone — that's the actual
definition of "Phase 1 works."

## Next

- [`01-project-overview`](../01-project-overview/) — what this product is
  and why, plus the high-level architecture.
- The root `README.md` — full roadmap, available scripts, and current
  status.
