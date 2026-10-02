# repositories/

The only layer allowed to run Mongoose queries. Each file wraps one model
with plain, well-named functions — a controller or service never needs to
know Mongoose's query API, and swapping the persistence layer later would
only touch this folder.

`video.repository.ts`'s `upsertVideoFromApi` is worth reading once: it
takes the YouTube API's own response shape and does the
API-shape-to-schema-shape mapping in one place, so nothing downstream
touches raw YouTube API fields.
