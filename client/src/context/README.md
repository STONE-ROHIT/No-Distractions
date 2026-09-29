# context/

React context providers for state that many unrelated parts of the tree
need at once and that isn't naturally "server state": the authenticated
session and the light/dark theme.

Each provider is split across three files on purpose:

| Concern | Auth | Theme |
|---|---|---|
| Raw context, value type, constants (no component, no hook) | `auth-context.ts` | `theme-context.ts` |
| The provider component — and ONLY that | `AuthContext.tsx` | `ThemeContext.tsx` |
| The consumer hook | `useAuth.ts` | `useTheme.ts` |

This split is a real constraint, not tidiness: React Fast Refresh can only
preserve component state across a hot reload for a module whose exports
are entirely components, so mixing a component with a hook or a constant
in one file silently breaks that, and ESLint's `react-refresh/only-export-
components` rule flags it. New providers should follow the same pattern.

Most state should NOT end up here. Prefer TanStack Query for anything
that comes from the API (which is exactly what `AuthProvider` does
internally — it wraps one query), and local component state for anything
only one subtree cares about. `docs/15-state-management` has the full
decision guide.
