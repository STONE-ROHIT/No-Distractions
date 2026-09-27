# config/

Startup-time configuration: environment variable loading/validation
(`env.ts`) and the MongoDB connection (`db.ts`). Code here runs once, when
the process starts, not per-request.

Anything that reads `process.env` directly belongs here and nowhere else —
every other module imports the validated `env` object from `env.ts`.
