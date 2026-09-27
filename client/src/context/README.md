# context/

React context providers for state that many unrelated parts of the tree
need at once and that isn't naturally "server state" — the authenticated
user session and the light/dark theme, for example.

Most state should NOT end up here. Prefer TanStack Query for anything that
comes from the API, and local component state for anything only one
subtree cares about. See `docs/17-state-management/` once written for the
full reasoning.
