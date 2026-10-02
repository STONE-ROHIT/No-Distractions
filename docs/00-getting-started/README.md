# 00 · Getting Started

This walks through running No Distractions locally, as of the end of
Phase 2. You can register an account, log in, land on a protected (still
placeholder) dashboard, reload the page and stay logged in, and log out —
there's no learning feature to click through yet, but the entire
authentication loop works end to end.

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

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Open `server/.env` and set two things:

```bash
# Local mongod
MONGODB_URI=mongodb://localhost:27017/no-distractions

# Or an Atlas connection string
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/no-distractions

# Generate a real one — this signs your access tokens, so it needs to
# actually be secret and at least 32 characters:
JWT_ACCESS_SECRET=<output of `openssl rand -hex 32`>

# Free from https://console.cloud.google.com/apis/credentials after
# enabling "YouTube Data API v3" — see docs/11-youtube-integration for
# the full walkthrough.
YOUTUBE_API_KEY=<your key>
```

`JWT_ACCESS_SECRET` and `YOUTUBE_API_KEY` both ship **empty** in the
example on purpose: the server validates its environment at startup and
refuses to boot until you've set real values, printing exactly what's
missing, e.g. `JWT_ACCESS_SECRET must be at least 32 characters —
generate one with openssl rand -hex 32`. That fail-fast behavior is
deliberate — see `server/src/config/env.ts`.

Leave `PORT`, `NODE_ENV`, `CLIENT_URL`, and `client/.env`'s `VITE_API_URL`
at their example defaults unless you have a reason to change them. See
`server/.env.example` / `client/.env.example` for what each variable
does, and
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

Open `http://localhost:5173` — you'll see the Phase 1/2 placeholder
homepage (the real landing page is built in Phase 3) with **Log in** /
**Sign up** links.

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

## 4. Try the auth flow

Click **Sign up**, create an account, and you should land on the
(placeholder) dashboard. Reload the page — you should stay logged in;
that's the access/refresh cookie pair at work, explained in
[`10-authentication`](../10-authentication/). Or exercise it directly:

```bash
curl -i -c cookies.txt -X POST http://localhost:5000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ada","email":"ada@example.com","password":"correct-horse-battery"}'
# 201, and cookies.txt now has accessToken + refreshToken

curl -i -b cookies.txt http://localhost:5000/api/users/me
# 200 {"user": {...}}
```

## 5. Try importing a video

From the dashboard (after logging in), paste a YouTube video or playlist
URL — e.g. `https://www.youtube.com/watch?v=dQw4w9WgXcQ` — into the
import field at the top. A single video takes you straight to its watch
page; a playlist takes you to your library, now showing every video in
it. Both require a real `YOUTUBE_API_KEY` (step 2) — without one, the
server refuses to start at all, so you'll know immediately rather than
getting a confusing failure on import.

## 6. Verify the toolchain

```bash
npm run lint    # ESLint across both packages
npm run build   # type-checks + builds both packages for production
npm test        # Vitest across both packages
```

All three should pass cleanly on a fresh clone.

## Next

- [`01-project-overview`](../01-project-overview/) — what this product is
  and why, plus the high-level architecture.
- [`10-authentication`](../10-authentication/) — how the auth flow above
  actually works, from password hashing to refresh-token rotation.
- The root `README.md` — full roadmap, available scripts, and current
  status.
