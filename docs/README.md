# No Distractions — Documentation

This documentation is meant to be read, not just referenced: the goal is
that someone who knows some programming but none of this project's stack
can clone the repo and learn how the whole thing works — frontend to
database — from these docs alone, and eventually extend it without
needing anything explained line-by-line.

It grows alongside the code, one phase at a time (see the root
`README.md` for the roadmap). A section below is either written for real,
against code that exists, or marked **planned** — nothing here describes
a feature before it's built.

## Pick a starting point

**If you know almost nothing about web development yet:**
[`00-getting-started`](./00-getting-started/) →
[`01-project-overview`](./01-project-overview/) → then the fundamentals
sections in order (`02` through `10`) as they're written, each teaching a
concept from first principles and then showing exactly where this project
uses it.

**If you already know the MERN stack:**
[`01-project-overview`](./01-project-overview/) →
[`22-architecture`](./22-architecture/) (start with the ADRs) →
[`09-mongodb`](./09-mongodb/) → [`14-api`](./14-api/) →
[`10-authentication`](./10-authentication/) → whichever feature section
you're touching.

**If you want to contribute / extend the project:**
[`22-architecture`](./22-architecture/) →
[`00-getting-started`](./00-getting-started/) →
[`21-git-and-development-workflow`](./21-git-and-development-workflow/) →
[`24-advanced/codebase-challenges`](./24-advanced/) once written.

## Table of contents

| # | Section | Status |
|---|---|---|
| 00 | [Getting Started](./00-getting-started/) | ✅ written |
| 01 | [Project Overview](./01-project-overview/) | ✅ written |
| 02 | Web Fundamentals | planned — opportunistically |
| 03 | JavaScript | planned — opportunistically |
| 04 | TypeScript | planned — opportunistically |
| 05 | React | planned — Phase 3 |
| 06 | Frontend Architecture | planned — Phase 3 |
| 07 | Node & Express | 🟡 covered inline in `08` for now |
| 08 | [Backend Architecture](./08-backend-architecture/) | ✅ written |
| 09 | [MongoDB](./09-mongodb/) | 🟡 started — `User`, `RefreshToken` done, 6 collections to go |
| 10 | [Authentication](./10-authentication/) | ✅ written |
| 11 | YouTube Integration | planned — Phase 4 |
| 12 | Video Player | planned — Phase 5 |
| 13 | Learning Features (progress, notes, bookmarks, playlists, focus mode) | planned — Phases 5–10 |
| 14 | [API Reference](./14-api/) | 🟡 started — auth + users done, 8 resources to go |
| 15 | State Management | planned — Phase 3 |
| 16 | Caching & Offline | planned — Phase 11 |
| 17 | Security | planned — grows every phase; finalized Phase 13 |
| 18 | Testing | planned — grows every phase; finalized Phase 12 |
| 19 | Performance | planned — Phase 13 |
| 20 | Deployment | planned — Phase 13/14 |
| 21 | Git & Development Workflow | planned — Phase 2 |
| 22 | [Architecture](./22-architecture/) (incl. [ADRs](./22-architecture/decisions/)) | 🟡 started |
| 23 | Troubleshooting | planned — grows as real issues come up |
| 24 | Advanced / Codebase Challenges | planned — Phase 14 |
| — | [Glossary](./glossary.md) | 🟡 started |

## Why so much of this is still "planned"

This is intentional, not a shortcut: `docs/05-react`, for example, would
have nothing real to point to yet, since no feature-level React code
exists before Phase 3 — writing it now would mean either generic React
tutorial content disconnected from this codebase, or documenting code
that doesn't exist yet, both explicitly against this project's own
documentation rules (see `docs/22-architecture`). Each section is written
in the same phase that introduces the code it explains, per the
"Documentation-First Development" flow: design → document the
architecture → implement → test → update the docs → commit. A phase's
commit includes its documentation, not a separate catch-up commit at the
end.

One adjustment made in Phase 2: `02` (Web Fundamentals), `03`
(JavaScript), and `04` (TypeScript) turned out not to map cleanly to any
single phase — nearly every phase touches JavaScript/TypeScript, so
"finish them in Phase 2" was an arbitrary line, not a real one. They're
written opportunistically instead, whenever a phase introduces a concept
genuinely worth a dedicated page (Phase 2 introduced Zod's schema→type
inference and an Express `Request` type augmentation, for instance — both
called out inline in `08-backend-architecture` and `10-authentication`
rather than spun out into `04` prematurely). `07` (Node & Express) is
folded into `08` for the same reason: a standalone "what is Express"
chapter had nothing to teach that `08`'s worked example doesn't already
cover better, in context.
