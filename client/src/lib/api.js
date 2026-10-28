/**
 * Small fetch wrapper for the backend API.
 *
 * - Adds the Authorization header from localStorage.
 * - Parses JSON bodies and turns API errors into ApiError instances
 *   (with per-field messages when the server provides them).
 * - Emits a global "nd:unauthorized" event when a stored token stops
 *   working, so the AuthContext can log the user out.
 * - Offline behavior (see lib/offline.js and docs/offline-support.md):
 *   readable endpoints fall back to an IndexedDB copy of their last
 *   response, and failed progress writes are queued for replay when the
 *   connection returns. A "nd:offline-data" event tells the UI it is
 *   showing saved data.
 */

import {
  cacheGet,
  cacheKeyForPath,
  cachePut,
  queueProgress,
} from './offline.js'

const TOKEN_KEY = 'nd_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
    this.offline = status === 0
  }
}

/** Replay queued progress writes (called on reconnect / periodically). */
let flushing = false
export async function flushProgressQueue() {
  if (flushing) return
  flushing = true
  try {
    const { getQueuedProgress, removeQueued } = await import('./offline.js')
    const queued = await getQueuedProgress()
    for (const entry of queued) {
      try {
        // Real request (not via api()): replay one by one, keep failures
        // queued for the next attempt. The server's savedAt rule makes
        // double-replays harmless.
        const res = await fetch(`/api/library/${entry.itemId}/progress`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
          },
          body: JSON.stringify(entry.body),
        })
        if (res.ok) {
          await removeQueued(entry.id)
        }
        // 4xx (400/404): the video was removed or the payload rejected —
        // retrying will not help, drop it so the queue cannot clog.
        else if (res.status >= 400 && res.status < 500) {
          await removeQueued(entry.id)
        }
      } catch {
        // Still offline: stop here, keep the rest for the next attempt.
        break
      }
    }
  } finally {
    flushing = false
    window.dispatchEvent(new CustomEvent('nd:queue-changed'))
  }
}

let flushTimer = null
function scheduleQueueFlush() {
  if (flushTimer) return
  flushTimer = setInterval(() => {
    flushProgressQueue()
  }, 30_000)
}

window.addEventListener('online', () => {
  flushProgressQueue()
})
scheduleQueueFlush()

export async function api(path, { method = 'GET', body } = {}) {
  const headers = {}
  const token = getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  let res
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    // Network failure (offline / server unreachable).
    return handleNetworkFailure(path, { method, body })
  }

  let data = null
  try {
    data = await res.json()
  } catch {
    // Empty or non-JSON body: fall through, handled by status below.
  }

  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) {
      // Stored token is invalid/expired: let the app log out.
      window.dispatchEvent(new CustomEvent('nd:unauthorized'))
    }
    throw new ApiError(
      (data && data.message) || `Request failed (${res.status}).`,
      res.status,
      data && data.fields,
    )
  }

  // Read-through cache for the endpoints the screens need offline.
  const cacheKey = method === 'GET' ? cacheKeyForPath(path) : null
  if (cacheKey) cachePut(cacheKey, data)

  return data
}

/** Offline fallbacks: cached reads for GETs, progress queue for writes. */
async function handleNetworkFailure(path, { method, body }) {
  if (method === 'GET') {
    const cacheKey = cacheKeyForPath(path)
    if (cacheKey) {
      const cached = await cacheGet(cacheKey)
      if (cached != null) {
        window.dispatchEvent(new CustomEvent('nd:offline-data'))
        return cached
      }
    }
    throw new ApiError('You appear to be offline, and no saved copy of this data exists yet.', 0)
  }

  // Only progress writes are queued — notes and other edits stay honest:
  // they fail visibly instead of silently deferring.
  const progressMatch = path.match(/^\/library\/([^/]+)\/progress$/)
  if (progressMatch && body && typeof body === 'object') {
    await queueProgress(progressMatch[1], body)
    throw new ApiError('You are offline — this progress update is saved locally and will sync automatically.', 0)
  }

  throw new ApiError('Could not reach the server. Please try again.', 0)
}
