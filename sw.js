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

const CACHE_VERSION = 'v59.49-20260719e'
const HTML_CACHE = `dunia-html-${CACHE_VERSION}`
const ASSET_CACHE = `dunia-assets-${CACHE_VERSION}`

// v55.0 STOP-THE-BLEED — slim SHELL precache (was ~5MB, now ~800KB).
//
// Removed from SHELL (now lazy-loaded via cache-first fetch handler):
//   - SFX manifests (~950KB × 2 = 1.9MB)
//   - 30 Pokemon WebP sprites (~80-150KB × 30 = ~2.5MB)
//
// The fetch handler already caches these on first request (stale-while-
// revalidate at line 141+), so subsequent visits are still instant. The
// slim SHELL means SW install no longer blocks 4MB of downloads — fixes the
// "Memuat Pokedex…" eternal-spinner regression owner reported across 12
// cache-version bumps in this session (closes B-209, B-210, B-211).
//
// To restore aggressive pre-caching later: revert this hunk + bump CACHE.
// v55.18 — paths are RELATIVE so they resolve against the SW's scope.
// Works on every host shape:
//   - Vercel / local dev:   SW at /sw.js          → ./index.html → /index.html
//   - GitHub Pages subdir:  SW at /Dunia-Emosi/sw.js → ./index.html → /Dunia-Emosi/index.html
// Previously hardcoded /Dunia-Emosi/ prefix → 404'd on Vercel + local (closes B-214).
const SHELL = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/g23-icon.png',
  './games/lib/pixi.min.js?v=8',
  './games/balapan-kereta-side.html',
  './games/museum-kereta.html',
  './games/indo-scene.js?v=2.1.1',
  './games/train-journey.js?v=55.80-20260628a',
  './games/data/train-wheel-anchors.js?v=55.84-20260628a',
  './games/train-backdrop.js?v=58.4-20260705o',
  './games/train-picker.js?v=58.6-20260705q',
  './games/train-speedfx.js?v=55.77-20260628a',
  './games/quiz-engine.js?v=55.97-20260630a',
  './games/motion.js?v=56.6-20260703a',
  './games/scenery-engine.js?v=55.99-20260630a',
  './games/sw-reload.js?v=55.69-20260628a',
  './games/g14-hud.css?v=55.77-20260628a',
  './games/du-hud.css?v=55.81-20260628a',
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
  // Drop old caches from previous SW versions, claim clients,
  // then broadcast a reload signal so any open tab still running
  // the OLD page bytes refreshes itself with fresh content.
  e.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(
      keys
        .filter((k) => k !== HTML_CACHE && k !== ASSET_CACHE)
        .map((k) => caches.delete(k))
    )
    await self.clients.claim()
    const clients = await self.clients.matchAll({ type: 'window' })
    clients.forEach((c) => c.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION }))
  })())
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
        .catch(() => caches.match(req).then((m) => m || caches.match('./')))
    )
    return
  }

  // Web App Manifest: NETWORK-FIRST so Chrome's WebAPK update check always sees
  // the live orientation/display (a stale-cached manifest kept the installed PWA
  // portrait-locked even after manifest.orientation was set to "any" — P9).
  if (req.destination === 'manifest' || url.pathname.endsWith('manifest.json')) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const clone = res.clone()
            caches.open(ASSET_CACHE).then((c) => c.put(req, clone))
          }
          return res
        })
        .catch(() => caches.match(req))
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
