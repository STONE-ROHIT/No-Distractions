# 08 · Backend Architecture

## Node.js and Express, briefly

**Node.js** runs JavaScript outside a browser — what makes that useful
for a server is its I/O model: instead of dedicating one thread to each
open connection (and blocking it while waiting on, say, a database
query), Node runs everything on one thread and uses an **event loop** to
juggle many in-flight operations, resuming each callback (or, in this
codebase, resolving each `await`) when its I/O actually finishes. This is
why virtually everything in `server/src` is `async`/`await`: a `find()`
call doesn't block the process while MongoDB works, it yields the thread
back to handle other requests in the meantime.

**Express** is a minimal web framework on top of that: it turns an
incoming HTTP request into a call to your code. A **middleware** is a
function of `(req, res, next)` that runs somewhere in that pipeline —
`helmet()` adds security headers, `cors()` decides which origins may call
the API, `requireAuth` rejects unauthenticated requests — each either
calls `next()` to pass control along, or ends the response itself.

## The layered architecture, and why five layers

```text
Route  →  Controller  →  Service  →  Repository  →  Model (Mongoose)
```

Each layer has exactly one job, and — this is the part that actually pays
off, not just organizational tidiness — each layer only knows about the
one directly below it:

- **Route** (`routes/`) — maps an HTTP verb + path to a controller
  function, plus any route-level middleware (`requireAuth`, `validate`,
  rate limiting). No logic.
- **Controller** (`controllers/`) — reads the request, calls a service,
  shapes the HTTP response (status code, JSON body, cookies). No business
  rules, no Mongoose.
- **Service** (`services/`) — the actual business logic: "is this email
  already registered", "rotate this refresh token", "is this the right
  password". Calls repositories; never imports a Mongoose model directly.
- **Repository** (`repositories/`) — the *only* layer that runs Mongoose
  queries. Wraps each one in a plain, well-named function
  (`findUserByEmail`, not `User.findOne({...})` scattered everywhere).
- **Model** (`models/`) — the Mongoose schema itself: shape, validation,
  indexes.

## Why bother — the concrete payoff, not just the theory

Two real examples from the code that exists right now:

1. **Testability without a database.** `server/tests/auth.test.ts` mocks
   *only* the repository layer (`vi.mock('../src/repositories/...')`) and
   then drives real HTTP requests through the real routes, controllers,
   and services with Supertest. Because controllers and services never
   import Mongoose directly, mocking two small repository files is enough
   to test the entire request lifecycle — routing, rate limiting,
   validation, password hashing, token issuance, error handling — with no
   real MongoDB connection anywhere in the test run. If controllers called
   `User.findOne(...)` directly, this wouldn't be possible without either
   a real database or much deeper mocking.

2. **`passwordHash` genuinely can't leak by accident.** The `User` model
   marks it `select: false`; only `repositories/user.repository.ts`'s
   `findUserByEmailWithPassword` opts back in, and only
   `services/auth.service.ts`'s `login()` calls that specific function.
   Every other path through the codebase — including a future
   `GET /api/users/:id` some other developer adds later — gets a `User`
   document that structurally does not contain the hash, without that
   developer needing to remember to strip it themselves.

## Walking one request through all five layers

`GET /api/users/me`, from `routes/users.routes.ts` down:

```ts
// routes/users.routes.ts
usersRouter.get('/me', requireAuth, userController.getMe);
```

`requireAuth` (`middleware/requireAuth.ts`) runs first: verifies the
access-token cookie, attaches `req.userId`, or short-circuits with a 401
before the controller ever runs.

```ts
// controllers/user.controller.ts
export async function getMe(req: Request, res: Response) {
  if (!req.userId) throw new AppError(401, 'Not authenticated');
  const user = await userService.getCurrentUser(req.userId);
  res.status(200).json({ user });
}
```

The controller does nothing but call the service and shape the response —
no `User.findById` here.

```ts
// services/user.service.ts
export async function getCurrentUser(userId: string) {
  const user = await userRepository.findUserById(userId);
  if (!user) throw new AppError(404, 'User not found');
  return toPublicUser(user);
}
```

The service owns the one business rule involved ("404 if the user is
somehow gone") and the shaping into the public response shape.

```ts
// repositories/user.repository.ts
export function findUserById(id: string | Types.ObjectId) {
  return User.findById(id);
}
```

Only here does Mongoose's actual query API appear.

## Error handling ties it together

Every controller in this codebase is `async` with **no try/catch**.
Express 5 (this project's version) forwards a rejected promise from an
async route handler to the centralized error handler automatically — so
a service throwing `new AppError(409, 'already exists')` turns into the
right HTTP response with zero boilerplate at the call site. See
`middleware/errorHandler.ts`; this is a change from Express 4, where a
thrown error inside an async handler had to be caught and passed to
`next(err)` manually or it would crash the process unhandled.

## Try it yourself

Pick any other route (`POST /api/auth/register` is a good one — it
touches all five layers plus a rate limiter and a validator) and write
out its full layer-by-layer trace the way this page did for `GET
/api/users/me`, without looking at
[10-authentication](../10-authentication/)'s sequence diagram first.
