import { httpError } from '../utils/errors.js'

/**
 * Minimal fixed-window, in-memory rate limiter.
 *
 * Deliberately simple: a Map of "ip -> hits in the current window".
 * Good enough for a single-process deployment (this app); a multi-instance
 * deployment would need a shared store such as Redis — documented in
 * docs/security.md.
 *
 * Usage: router.post('/login', rateLimit({ max: 10, windowMs: 60_000 }), handler)
 */
export function rateLimit({ windowMs = 60_000, max = 30, message = 'Too many requests. Please slow down.' } = {}) {
  // key -> { count, resetAt }
  const hits = new Map()

  // Occasional sweep so the map does not grow forever with one-off IPs.
  const sweep = () => {
    const now = Date.now()
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key)
    }
  }

  return function rateLimiter(req, res, next) {
    const now = Date.now()
    const key = req.ip || 'unknown'

    let entry = hits.get(key)
    if (!entry || entry.resetAt <= now) {
      // Lazy sweep on new windows only (cheap, bounded work).
      if (hits.size > 1000) sweep()
      entry = { count: 0, resetAt: now + windowMs }
      hits.set(key, entry)
    }

    entry.count += 1
    if (entry.count > max) {
      res.set('Retry-After', Math.max(1, Math.ceil((entry.resetAt - now) / 1000)))
      return next(httpError(429, message))
    }

    next()
  }
}
