# types/

Shared TypeScript types used across layers.

- `express.d.ts` — module augmentation adding `req.userId`, set by
  `middleware/requireAuth.ts`. This is a global ambient declaration (no
  exports), picked up automatically by `tsc` because it's inside `src/`.

A type used by only one file lives next to that file instead of here.
