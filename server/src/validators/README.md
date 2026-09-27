# validators/

Empty in Phase 1 — no models/business logic exist yet. Request-shape validation (Zod schemas for request bodies/params/query), separate from business validation. Keeps controllers free of manual `if (!req.body.x)` checks.
