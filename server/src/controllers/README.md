# controllers/

Request handlers: parse/validate the request (validation itself already
happened in `middleware/validate.ts` by the time a controller runs), call
a service, shape the HTTP response. No direct Mongoose queries and no
business rules here — just orchestration.

Every handler is `async` with no try/catch — Express 5 forwards a thrown
error or rejected promise straight to `middleware/errorHandler.ts`.
