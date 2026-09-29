# components/

Shared, reusable, presentation-focused UI building blocks used across more
than one page or feature.

- `Button.tsx` / `TextField.tsx` — the base form controls (Phase 2),
  restyled onto the Phase 3 design tokens (`bg-canvas`, `text-ink`, ...)
  so they're theme-reactive with no `dark:` variants needed.
- `EmptyState.tsx` — the one "nothing here yet" pattern, reused everywhere
  a list could plausibly be empty.
- `Avatar.tsx` — initials-on-highlighter-yellow; there's no photo upload
  yet.
- `ThemeToggle.tsx` — light/system/dark, ARIA `radiogroup`.
- `ProtectedRoute.tsx` — route guard (uses the auth context, not a
  feature's data, so it lives here rather than under `features/auth/`).

**Belongs here:** components with no knowledge of a specific feature's data
or API calls. **Does not belong here:** anything that fetches data or has
feature-specific business logic — that's `features/*`.
