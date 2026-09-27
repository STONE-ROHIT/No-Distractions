# types/

Shared TypeScript types used across layers (e.g. an Express `Request`
augmentation once auth middleware attaches `req.user` in Phase 2). A type
used by only one file lives next to that file instead.
