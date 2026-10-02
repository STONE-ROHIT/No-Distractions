# features/videos/

Importing a YouTube URL and watching an imported video.

- `hooks/useImportVideo.ts` — the import mutation; invalidates the
  library query on success rather than hand-updating its cache, since a
  playlist import can add many videos at once.
- `hooks/useVideo.ts` — fetches a single video by id (used by
  `pages/VideoPage.tsx`). `enabled: Boolean(videoId)` matters here: the
  route param is technically `string | undefined` to TypeScript even
  though the route can't actually match without it.
- `components/ImportVideoForm.tsx` — the URL input; routes a single-video
  result to that video's page, a playlist result to the library (there's
  no single page to land on for a batch import).
- `components/VideoPlayer.tsx` — wraps the YouTube embed. Deliberately
  minimal for now (a plain iframe, no programmatic control) — Phase 5
  swaps this for the full IFrame Player JS API once progress tracking and
  keyboard shortcuts need to call methods on it.
