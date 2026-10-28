/**
 * Offline storage for No Distractions — a thin IndexedDB layer.
 *
 * Two jobs, kept deliberately small:
 *
 *  1. A read-through cache for the API responses the main screens need
 *     (library, playlists, notes, bookmarks, stats). When the network is
 *     unreachable the app can still show the last known data.
 *
 *  2. A queue of progress writes that failed because of the network.
 *     Each queued write keeps its original `savedAt` timestamp, and the
 *     server ignores writes that are not newer than what it has — so
 *     replaying the queue is idempotent and can never clobber newer
 *     progress (conflict policy in docs/offline-support.md).
 *
 * No framework, no sync engine: on reconnect we replay the queue in
 * order and drop whatever the server already has.
 */

const DB_NAME = 'no-distractions-offline'
const DB_VERSION = 1
const CACHE_STORE = 'kv'
const QUEUE_STORE = 'progressQueue'

let dbPromise = null

function openDb() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE) // key = cache key
      }
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return dbPromise
}

function tx(store, mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(store, mode)
        const objectStore = transaction.objectStore(store)
        const request = fn(objectStore)
        transaction.oncomplete = () => resolve(request?.result)
        transaction.onerror = () => reject(transaction.error)
      }),
  )
}

// ---------------------------------------------------------------- read cache --

/** Cacheable GET endpoints -> cache keys (query strings included). */
export function cacheKeyForPath(path) {
  // Full-list endpoints and per-video lookups. Anything else returns null
  // (not cached) — auth responses must never be cached, for example.
  if (path === '/library') return 'library'
  if (path === '/playlists') return 'playlists'
  if (path === '/stats') return 'stats'
  if (path === '/bookmarks') return 'bookmarks'
  if (path.startsWith('/bookmarks?videoId=')) return path
  if (path.startsWith('/notes?videoId=')) return path
  if (path.startsWith('/library?videoId=')) return path
  return null
}

export async function cachePut(key, data) {
  try {
    await tx(CACHE_STORE, 'readwrite', (store) => store.put({ data, savedAt: Date.now() }, key))
  } catch {
    // Private browsing / disabled storage: offline cache is best-effort.
  }
}

export async function cacheGet(key) {
  try {
    const entry = await tx(CACHE_STORE, 'readonly', (store) => store.get(key))
    return entry ? entry.data : null
  } catch {
    return null
  }
}

// ------------------------------------------------------------ progress queue --

/** Queue a failed progress write, keeping its original body intact. */
export async function queueProgress(itemId, body) {
  try {
    await tx(QUEUE_STORE, 'readwrite', (store) => store.add({ itemId, body, queuedAt: Date.now() }))
    window.dispatchEvent(new CustomEvent('nd:queue-changed'))
  } catch {
    // Storage unavailable: nothing more we can do offline.
  }
}

/** All queued writes, oldest first. */
export async function getQueuedProgress() {
  try {
    const all = await tx(QUEUE_STORE, 'readonly', (store) => store.getAll())
    return (all || []).sort((a, b) => a.id - b.id)
  } catch {
    return []
  }
}

export async function countQueuedProgress() {
  try {
    return (await tx(QUEUE_STORE, 'readonly', (store) => store.count())) || 0
  } catch {
    return 0
  }
}

/** Remove a specific queued write after a successful replay. */
export async function removeQueued(id) {
  try {
    await tx(QUEUE_STORE, 'readwrite', (store) => store.delete(id))
    window.dispatchEvent(new CustomEvent('nd:queue-changed'))
  } catch {
    // Ignore.
  }
}

/** Wipe the queue (e.g. on logout — the next user must not replay it). */
export async function clearQueue() {
  try {
    await tx(QUEUE_STORE, 'readwrite', (store) => store.clear())
    window.dispatchEvent(new CustomEvent('nd:queue-changed'))
  } catch {
    // Ignore.
  }
}

/** Drop cached reads (also on logout). */
export async function clearCache() {
  try {
    await tx(CACHE_STORE, 'readwrite', (store) => store.clear())
  } catch {
    // Ignore.
  }
}
