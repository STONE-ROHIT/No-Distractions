import { Router } from 'express';

export const healthRouter = Router();

/**
 * Liveness/readiness check. Deliberately does not touch the database —
 * it answers "is the HTTP server up", not "is Mongo reachable" — so it
 * stays meaningful (and testable without a DB) even if the database is
 * temporarily down.
 */
healthRouter.get('/', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});
