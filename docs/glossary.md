# Glossary

Beginner-friendly definitions for terms used throughout this codebase and
its documentation. Grows with each phase — this is the Phase 1 starting
set.

**API (Application Programming Interface)** — the contract a program
exposes so other programs can talk to it. Here, the REST API Express
exposes at `/api/*` for the React client to call.

**Backend** — the server-side part of the application (this repo's
`server/`): receives requests, talks to the database, returns responses.
The user never talks to it directly, only through the frontend or API.

**Environment variable** — a named value configured outside the code
(`MONGODB_URI`, `PORT`, ...) so secrets and per-environment settings (dev
vs. production) never get hardcoded or committed to Git. See
`server/.env.example` and `config/env.ts`.

**ESLint** — a static analysis tool that flags problematic or inconsistent
JavaScript/TypeScript patterns before they become bugs. Different from
Prettier, which only reformats code style.

**Express** — the Node.js web framework this project's backend is built
on: it turns incoming HTTP requests into calls to your route handlers.

**Frontend** — the part of the application that runs in the user's
browser (this repo's `client/`): renders the UI, and calls the backend's
API for data.

**Middleware (Express)** — a function that runs in the middle of the
request/response cycle, before the final route handler — e.g. logging the
request, attaching security headers, or (from Phase 2) checking that the
user is authenticated.

**Monorepo** — one Git repository containing more than one independently
runnable package (here, `client` and `server`), instead of two separate
repositories. Shares tooling and makes cross-cutting changes easier to
review together.

**Mongoose** — an Object Data Modeling (ODM) library for MongoDB: lets you
define a schema in JavaScript/TypeScript and get validation, and a
query API, instead of writing raw MongoDB driver calls.

**MongoDB** — a document-oriented (NoSQL) database: stores data as
JSON-like documents grouped into collections, rather than rows in
fixed-schema tables like a SQL database.

**npm workspaces** — npm's built-in monorepo support: lets `client` and
`server` be installed and scripted together from one root `package.json`
while remaining independent packages.

**REST (Representational State Transfer)** — an API design style built on
HTTP methods (GET, POST, PATCH, DELETE) and URLs that name *resources*
(`/api/videos/:id`) rather than actions. This project's API follows it.

**Vite** — the frontend build tool/dev server this project uses: bundles
the React app for production and serves it with near-instant hot reload
during development.

**Vitest** — the test runner used by both `client` and `server` in this
project. Chosen over Jest so both packages share one test toolchain — see
[ADR-001](./22-architecture/decisions/ADR-001-tech-stack-and-typescript.md).

**Zod** — a TypeScript-first schema validation library. This project uses
it both to validate environment variables at startup (`config/env.ts`) and
— from Phase 2 onward — to validate incoming request bodies.
