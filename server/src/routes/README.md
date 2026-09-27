# routes/

Express `Router` instances — one file per resource (`health.routes.ts` now;
`auth.routes.ts`, `videos.routes.ts`, etc. from Phase 2 onward). A route
file wires an HTTP method + path to a controller function (and any
route-level middleware like `requireAuth` or a validator); it contains no
business logic itself.
