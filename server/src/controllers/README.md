# controllers/

Request handlers: parse/validate the request (validation itself already
happened in `middleware/validate.ts` by the time a controller runs — a
controller can trust `req.body`'s shape), call a service, shape the HTTP
response. No direct Mongoose queries here — that goes through
`repositories/` via `services/` — and no business rules (password
comparison, token rotation) here either, just orchestration.

Every handler is `async` with no try/catch — Express 5 forwards a thrown
error or rejected promise straight to `middleware/errorHandler.ts`.
