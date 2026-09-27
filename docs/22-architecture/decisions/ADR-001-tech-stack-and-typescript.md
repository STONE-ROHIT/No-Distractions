# ADR-001: Tech stack, TypeScript, and monorepo layout

## Context

The project brief specifies the MERN stack (MongoDB, Express, React,
Mongoose... conventionally the "N" is Node) and leaves language choice
open: "JavaScript or TypeScript (prefer TypeScript if there is a strong
reason)". It also asks for a scalable frontend/backend folder structure
and a clean Git history from the very first commit.

## Decision

- **TypeScript** on both `client` and `server`, not JavaScript.
- **A monorepo** with two npm workspaces, `client` and `server`, under one
  root `package.json`, rather than two separate repositories or a single
  undivided codebase.
- **Vite** (not Create React App or a custom Webpack setup) for the
  frontend build tool.
- **Vitest** (not Jest) as the test runner for *both* packages.
- **ESLint (flat config) + Prettier**, with `eslint-config-prettier` so
  the two never fight over formatting.

## Alternatives considered

- **Plain JavaScript** — faster to start typing, but this schema alone
  has eight collections with real relationships between them (see
  [ADR-003](./ADR-003-database-schema-design.md)), and the API surface
  spans a dozen resources. Without types, a typo in a field name
  (`video.channelTitle` vs `video.channelName`) surfaces at runtime, in
  the worst case in production. TypeScript catches it at save time, in
  the editor.
- **Jest** for testing — still the most common choice for a Node/Express
  backend and would have worked fine. Vitest was chosen instead because
  it shares Vite's config and transform pipeline (no separate Babel/ts-jest
  setup to maintain), starts markedly faster, and — most importantly for a
  learning-oriented repo — lets both `client` and `server` teach and use
  the *same* testing API, so a reader who learns Vitest once can read
  either package's tests.
- **Two separate repositories** (`no-distractions-client`,
  `no-distractions-server`) — a defensible choice for a large team where
  the two deploy on completely independent lifecycles. Rejected here
  because this is a single-developer, single-deployable-unit product: a
  monorepo keeps a feature's frontend and backend changes reviewable in
  one commit/PR, which is what the "clean git history" requirement in the
  brief is actually optimizing for.

## Trade-offs

- TypeScript adds a compile step and some upfront ceremony (interfaces,
  generics) that a pure-JS project wouldn't have.
- A monorepo means both packages currently share one `node_modules` at
  the root (via npm workspace hoisting) and one CI pipeline; deploying
  `client` and `server` to different hosts (e.g. a static host + a Node
  host) still works, since each is deployed from its own subdirectory —
  but a change to the root `package.json` or tooling affects both.

## Consequences

Every source file in the repo is `.ts`/`.tsx`. `npm run <script>` from
the root fans out to both workspaces via `-w`. `docs/03-javascript` and
`docs/04-typescript` will be written to reflect this — the TypeScript
document is not optional background reading, it's how the code is
actually written.
