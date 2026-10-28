#!/bin/bash
# Dev orchestrator for No Distractions.
#
# Starts everything needed for local development:
#   1. MongoDB  - only when a project-local binary exists (.mongodb/bin/mongod).
#                 On a normal developer machine you start MongoDB yourself
#                 (see README "Configure MongoDB").
#   2. API      - Express server on http://localhost:4000   (server/)
#   3. Client   - Vite dev server on http://localhost:3000 (client/),
#                 which proxies /api requests to the API server.
#
# Usage: npm run dev   (from the repository root)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Install dependencies when they are missing.
pkg_install() {
  if command -v bun >/dev/null 2>&1; then
    bun install
  else
    npm install
  fi
}

if [ ! -x node_modules/.bin/concurrently ]; then
  echo "[setup] Installing root dependencies..."
  pkg_install
fi
if [ ! -d server/node_modules ]; then
  echo "[setup] Installing server dependencies..."
  (cd server && pkg_install)
fi
if [ ! -d client/node_modules ]; then
  echo "[setup] Installing client dependencies..."
  (cd client && pkg_install)
fi

# Start the project-local MongoDB binary when present and not already running.
# (Developer machines: MongoDB is expected to already be running.)
if [ -x "$ROOT/.mongodb/bin/mongod" ]; then
  if (exec 3<>"/dev/tcp/127.0.0.1/27017") 2>/dev/null; then
    echo "[mongo] Already running on port 27017"
  else
    echo "[mongo] Starting MongoDB on port 27017..."
    "$ROOT/.mongodb/bin/mongod" \
      --dbpath "$ROOT/.mongodb/data" \
      --port 27017 \
      --bind_ip 127.0.0.1 \
      --fork \
      --logpath "$ROOT/.mongodb/data/mongod.log" \
      --pidfilepath "$ROOT/.mongodb/data/mongod.pid"
  fi
fi

echo "[dev] Starting API (4000) and client (3000)..."
./node_modules/.bin/concurrently \
  --kill-others \
  --names api,web \
  --prefix-colors green,yellow \
  "npm --prefix server run dev" \
  "npm --prefix client run dev" \
  2>&1 | tee -a "$ROOT/dev.log"
