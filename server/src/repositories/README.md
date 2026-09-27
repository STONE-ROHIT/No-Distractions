# repositories/

The only layer allowed to run Mongoose queries. Each file wraps one model
with plain, well-named functions (`findUserByEmail`, not
`User.findOne({...})` scattered across the codebase) — a controller or
service never needs to know Mongoose's query API, and swapping the
persistence layer later would only touch this folder.

`user.repository.ts` and `refreshToken.repository.ts` are the first two —
notice `findUserByEmailWithPassword` vs `findUserByEmail`: the model's
`passwordHash` is `select: false`, so only the function that genuinely
needs it (login) opts back in.
