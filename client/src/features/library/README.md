# features/library/

`hooks/useLibrary.ts` — the current user's saved videos. Consumed by both
`pages/dashboard/MyLibrarySection.tsx` / `RecentlyAddedSection.tsx` and
`pages/LibraryPage.tsx`; all three read the same query rather than
fetching independently, so TanStack Query's cache means only one network
request backs all three most of the time.

This is intentionally thin for now — no filters, no search, no saved-
playlists distinction. Phase 8 builds the real library page (filtering,
sorting, search) on top of this same query; it doesn't change where the
data comes from.
