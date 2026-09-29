# ADR-007: Frontend state management

## Context

React has no single built-in answer to "where does this piece of state
live" — and unlike the backend (where every request is stateless and the
database is the one source of truth), a frontend genuinely has several
*different kinds* of state that behave differently and don't belong in
the same tool.

## Decision

Four categories, each with one designated tool — see
`docs/15-state-management` for the full guide with this project's real
examples of each:

| Kind | Tool | Example in this codebase |
|---|---|---|
| Server state (data that lives in the database) | TanStack Query | the current user (`AuthContext`'s `useQuery`) |
| Cross-cutting UI state | React Context | auth session, theme preference |
| Persistent, per-device preference | `localStorage`, read into Context on mount | theme preference |
| Local/ephemeral UI state | `useState` in the component that owns it | form field values, the mobile drawer's open/closed flag |

The dividing line that matters most: **Context is for state many
unrelated parts of the tree need to read**, not a general-purpose
alternative to prop-drilling for everything. Every provider in
`context/` is a thin wrapper — `AuthProvider` around one TanStack Query
call, `ThemeProvider` around one `useState` plus a `localStorage` sync —
not a hand-rolled store.

## Alternatives considered

- **Redux / Zustand / Jotai** — a global client-state library. Rejected
  for now: there is no state yet that's both (a) genuinely global and (b)
  not already server state (which Query already owns) or trivially local.
  Introducing one would mean maintaining patterns for state that doesn't
  exist. Revisit if a real cross-cutting *client-only* state need shows up
  (e.g. a multi-step import wizard spanning routes).
- **Fetching in `useEffect` + `useState`** instead of TanStack Query —
  the naive default, and explicitly what Query replaces: it hand-rolls
  loading/error state, has no caching (a re-visited page refetches from
  scratch every time), and no request deduplication (two components
  wanting the same data fire two requests). Query gives all of that for
  the cost of one dependency, already justified in
  [ADR-001](./ADR-001-tech-stack-and-typescript.md).
- **Theme preference in the database** (a field on `User.preferences`,
  which already exists in the schema) instead of `localStorage` —
  rejected for the *default*: a signed-out visitor on the landing page
  can still toggle dark mode, which a database-backed preference
  couldn't support before they have an account. `User.preferences.theme`
  remains reserved in the schema for a possible future "sync my theme
  across devices" setting layered on top, not replacing the
  `localStorage` default.

## Trade-offs

A signed-in user's theme choice is per-browser, not synced across
devices — reasonable for a v1, revisit if it's ever a real complaint.

## Consequences

Any new piece of state should be placed by asking, in order: *Does it
come from the API?* → Query. *Do more than a couple of unrelated
components need to read it?* → Context (new provider, following the
three-file split in `context/README.md`). *Otherwise* → local `useState`
in whichever component owns it.
