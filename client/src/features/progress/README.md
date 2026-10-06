# features/progress/

Playback progress: saving it (periodically, automatically, from the
player) and reading it back (to resume a video, and to drive the
dashboard's "Continue Learning" section).

- `hooks/useProgress.ts` — one video's saved progress, or `null` if never
  watched (not an error — a brand-new video has no progress yet, and
  that's a normal state, not a failure).
- `hooks/useSaveProgress.ts` — the autosave/mark-complete mutation. On
  success, updates this video's own cached progress AND invalidates the
  Continue Learning list, since what changed could affect both its
  membership and its sort order.
- `hooks/useContinueLearning.ts` — the in-progress list itself.

Note what's deliberately NOT cached-and-reused here:
`pages/VideoPage.tsx` reads `useProgress` exactly once, to compute the
resume position passed into `VideoPlayer`'s `startSeconds` — it does not
re-read this query to update the live on-screen percentage while
watching (that would mean a resumed video's start position silently
drifting as autosaves land). The live display uses local state fed
directly by the player's `onProgress`/`onEnded` callbacks instead; see
`VideoPage.tsx`'s own comment.
