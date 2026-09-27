# repositories/

Empty in Phase 1 — no models/business logic exist yet. The only layer allowed to run Mongoose queries. Each repository wraps one model with plain, well-named functions (e.g. `findByUserAndVideo`), so a controller/service never needs to know Mongoose's query API directly and swapping the persistence layer later would only touch this folder.
