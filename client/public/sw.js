/*
 * No Distractions — service worker.
 *
 * Scope, deliberately narrow (full design in docs/offline-support.md):
 *
 *  - Hashed build assets (/assets/…): cache-first. They are immutable,
 *    so repeat visits load instantly and work offline.
 *  - App pages (SPA navigations): network-first with a cached
 *    index.html fallback — you get fresh deploys when online, the shell
 *    when offline.
 *  - YouTube thumbnails (i.ytimg.com): cache-first, trimmed to a cap so
 *    the storage cannot grow without bound.
 *  - /api requests: NEVER intercepted — data freshness matters more than
 *    offline availability, and the app layer (IndexedDB) handles offline
 *    reads and the progress queue itself.
 *
 * The player and everything on youtube.com belong to YouTube; media
 * playback is not and cannot be cached.
 */

const VERSION = 'nd-v1'
const ASSET_CACHE = `${VERSION}-assets`
const PAGE_CACHE = `${VERSION}-pages`
const THUMB_CACHE = `${VERSION}-thumbs`
const THUMB_CACHE_MAX = 300

self.addEventListener('install', () => {
  // No precache: assets are picked up on first use. Activate immediately.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Remove caches from previous versions.
      const keys = await caches.keys()
      await Promise.all(
        keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Never touch the API — see header comment.
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) return

  // Hashed build assets: cache-first.
  if (url.origin === self.location.origin && url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request, ASSET_CACHE))
    return
  }

  // Thumbnails from YouTube's CDN: cache-first with a size cap.
  if (url.hostname === 'i.ytimg.com') {
    event.respondWith(
      cacheFirst(request, THUMB_CACHE).then((response) => {
        // Trim opportunistically after serving.
        trimCache(THUMB_CACHE, THUMB_CACHE_MAX)
        return response
      }),
    )
    return
  }

  // SPA navigations on this origin: network-first, cached shell fallback.
  if (request.mode === 'navigate' && url.origin === self.location.origin) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match('/index.html'))
            .then(
              (cached) =>
                cached ||
                new Response('You are offline and this page has not been cached yet.', {
                  status: 503,
                  headers: { 'Content-Type': 'text/plain' },
                }),
            ),
        ),
    )
  }
  // Everything else (YouTube player, oEmbed, fonts…): straight to network.
})

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request, { cacheName })
  if (cached) return cached

  const response = await fetch(request)
  // Only cache successful basic responses (not opaque errors).
  if (response.ok || response.type === 'basic') {
    const copy = response.clone()
    const cache = await caches.open(cacheName)
    cache.put(request, copy)
  }
  return response
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  if (keys.length <= maxEntries) return
  // Oldest first (insertion order); delete the excess.
  for (const key of keys.slice(0, keys.length - maxEntries)) {
    await cache.delete(key)
  }
}
