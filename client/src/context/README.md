# context/

React context providers for state that many unrelated parts of the tree
need at once and that isn't naturally "server state" — the authenticated
user session (and, from Phase 3, the light/dark theme).

Split across three files on purpose:
- `auth-context.ts` — the raw `createContext` call, its value type, and
  the `authMeQueryKey` TanStack Query key. No component, no hook.
- `AuthContext.tsx` — the `AuthProvider` component, and ONLY that.
- `useAuth.ts` — the `useAuth()` hook.

This split exists because of a real, non-cosmetic constraint: React Fast
Refresh can only preserve component state across a hot-reload for a
module whose exports are entirely components — mixing a component with a
hook or a constant in one file (which is what this looked like before the
split) silently breaks that, and ESLint's `react-refresh/only-export-
components` rule flags it. `auth-context.ts`'s name intentionally doesn't
match the `X-context.ts` / `useX.ts` / `XProvider.tsx` pattern other
providers introduced later should reuse.

Most state should NOT end up here. Prefer TanStack Query for anything
that comes from the API (which is exactly what `AuthProvider` does
internally — it's a thin wrapper around one query), and local component
state for anything only one subtree cares about.
