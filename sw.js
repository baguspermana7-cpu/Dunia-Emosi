/* =============================================================================
 * Dunia Emosi — Service Worker
 * =============================================================================
 * Strategy:
 *  - HTML pages: NETWORK-FIRST (always try fresh, fall back to cache offline).
 *    Prevents stale UI after a deploy.
 *  - Static assets (.js / .css / images / audio): CACHE-FIRST with revalidation.
 *    Faster load + offline support; new versions land via cache-bust ?v=...
 *
 * Cache versioning: bump CACHE_VERSION when SW logic changes. Static-asset
 * cache uses URLs that include ?v= query strings, so naturally invalidates.
 *
 * IMPORTANT: NEVER cache opaque cross-origin responses (Pokemon Showdown
 * sprite CDN, pokemondb.net) — those use no-cors and we can't see if they
 * succeeded. Only cache same-origin assets.
 * ========================================================================== */

const CACHE_VERSION = 'v2-20260506'
const HTML_CACHE = `dunia-html-${CACHE_VERSION}`
const ASSET_CACHE = `dunia-assets-${CACHE_VERSION}`

// Pre-cache critical shell on install (offline-first launch)
const SHELL = [
  '/Dunia-Emosi/',
  '/Dunia-Emosi/index.html',
  '/Dunia-Emosi/style.css',
  '/Dunia-Emosi/manifest.json',
  '/Dunia-Emosi/assets/icon-192.png',
  '/Dunia-Emosi/assets/icon-512.png',
]

self.addEventListener('install', (e) => {
  // Pre-cache shell assets so the app launches even on first offline use.
  // skipWaiting() activates new SW immediately on install — no waiting for
  // all tabs to close first. Combined with clients.claim() in activate,
  // SW updates take effect on next page load.
  e.waitUntil(
    caches.open(ASSET_CACHE).then((c) =>
      c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' }))).catch(() => {})
    ).then(() => self.skipWaiting())
  )
})

// Allow client to force SW skipWaiting (e.g., after deploy detection)
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  // Drop old caches from previous SW versions
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== HTML_CACHE && k !== ASSET_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)

  // Skip non-GET / cross-origin requests entirely (let browser handle them).
  // Cross-origin includes Pokemon Showdown sprites — don't cache (opaque).
  if (req.method !== 'GET') return
  if (url.origin !== self.location.origin) return

  // HTML / navigation: NETWORK-FIRST (so fresh deploys land immediately)
  const isHTML = req.mode === 'navigate' ||
                 (req.headers.get('accept') || '').includes('text/html')
  if (isHTML) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          // Update cache in background
          const clone = res.clone()
          caches.open(HTML_CACHE).then((c) => c.put(req, clone))
          return res
        })
        .catch(() => caches.match(req).then((m) => m || caches.match('/Dunia-Emosi/')))
    )
    return
  }

  // Static assets: CACHE-FIRST with stale-while-revalidate
  e.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((res) => {
        // Only cache successful responses
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone()
          caches.open(ASSET_CACHE).then((c) => c.put(req, clone))
        }
        return res
      }).catch(() => cached)
      return cached || fetchPromise
    })
  )
})
