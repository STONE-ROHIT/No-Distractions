# validators/

Request-*shape* validation — Zod schemas for request bodies/params/query —
kept separate from business validation (e.g. "is this email already
taken" is a business rule that lives in `services/`, not here). Mounted
via `middleware/validate.ts`, so a controller never has a manual
`if (!req.body.x)` check.

Every schema exports its inferred TypeScript type (`RegisterInput`,
`LoginInput`) so the controller's request type and the runtime validation
can never drift apart — the type IS the schema.
