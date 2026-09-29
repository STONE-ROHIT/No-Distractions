# hooks/

Reusable React hooks that are not specific to a single feature.

- `useMediaQuery.ts` — live `matchMedia` result via `useSyncExternalStore`
  (used by the theme provider for `prefers-color-scheme`, and by the app
  layout to close the mobile drawer when the viewport grows past it).
- `useDocumentTitle.ts` — sets the tab/history/screen-reader page title
  per route.

A hook specific to one feature (e.g. `useVideoProgress`) lives inside that
feature's own folder under `features/`, not here.
