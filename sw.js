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

const CACHE_VERSION = 'v59.93-20260808b'
const HTML_CACHE = `dunia-html-${CACHE_VERSION}`
const ASSET_CACHE = `dunia-assets-${CACHE_VERSION}`

// ── v59.89 FILM ANAK OFFLINE ────────────────────────────────────────────────
// Film games the child explicitly installed via "Siapkan Offline" live in their
// OWN cache buckets, named by slug and NOT by CACHE_VERSION:
//     dunia-film-<slug>   every file of that game (see games/film-offline.js)
//     dunia-film-shell    the wrapper pages needed to reach a game offline
// Because the name has no version in it, an app deploy cannot invalidate them —
// and activate() below explicitly refuses to delete anything with this prefix.
// Before this, every version bump wiped ~200MB the child had downloaded.
const FILM_PREFIX = 'dunia-film-'
const FILM_SHELL_CACHE = `${FILM_PREFIX}shell`

// Which film bucket (if any) owns this path? null = not a film request.
function filmCacheFor(pathname) {
  // A game's own files: /games/film/<slug>/…
  let m = pathname.match(/\/games\/film\/([A-Za-z0-9._-]+)\//)
  if (m) return FILM_PREFIX + m[1]
  // That game's hub thumbnail — installed and freed together with the game.
  m = pathname.match(/\/assets\/film-thumbs\/([A-Za-z0-9._-]+)\.(?:webp|png|jpg)$/)
  if (m) return FILM_PREFIX + m[1]
  // Wrapper shell (film-anak.html / film-play.html / film-offline.js /
  // sw-reload.js) — shared by every installed game.
  if (/\/games\/(?:film-(?:anak|play|offline)\.[a-z]+|sw-reload\.js)$/.test(pathname)) {
    return FILM_SHELL_CACHE
  }
  return null
}

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
        // v59.89 — NEVER delete a `dunia-film-*` bucket. Those hold games the
        // child deliberately downloaded for offline use; they are invalidated
        // by their own content hash (offline-manifest.json), never by a
        // CACHE_VERSION bump. Stale dunia-html-*/dunia-assets-* still go.
        .filter((k) => k !== HTML_CACHE && k !== ASSET_CACHE && !k.startsWith(FILM_PREFIX))
        .map((k) => caches.delete(k))
    )
    await self.clients.claim()
    const clients = await self.clients.matchAll({ type: 'window' })
    clients.forEach((c) => c.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION }))
  })())
})

// The two existing strategies, lifted verbatim into named helpers (v59.89) so
// the film branch below can fall through to EXACTLY the current behaviour on a
// cache miss. No logic changed — only moved.
function htmlNetworkFirst(req, offlineFallback) {
  return fetch(req)
    .then((res) => {
      // Update cache in background
      const clone = res.clone()
      caches.open(HTML_CACHE).then((c) => c.put(req, clone))
      return res
    })
    .catch(() =>
      caches.match(req)
        .then((m) => m || (offlineFallback ? offlineFallback() : null))
        .then((m) => m || caches.match('./'))
    )
}

function assetCacheFirst(req) {
  // Static assets: CACHE-FIRST with stale-while-revalidate
  return caches.match(req).then((cached) => {
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
}

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

  // ── v59.89 FILM ANAK OFFLINE ─────────────────────────────────────────────
  // (a) The manifests are the STALENESS ORACLE. Checked FIRST and independently
  //     of filmCacheFor(): the combined index lives at /games/film/offline-index
  //     .json — no slug directory — so it does not belong to any film bucket and
  //     would otherwise fall through to the generic CACHE-FIRST asset strategy.
  //     A cached-forever index means a changed game is never detected as stale
  //     and the child keeps playing an outdated copy. Network-first, with the
  //     cache only as an offline fallback.
  if (/\/offline-(?:manifest|index)\.json$/.test(url.pathname)) {
    if (req.headers.get('X-Dunia-Offline')) return
    e.respondWith(fetch(req).catch(() => caches.match(req)))
    return
  }

  const filmCache = filmCacheFor(url.pathname)
  if (filmCache) {
    // (b) The installer's own downloads carry this header. Step aside entirely:
    //     without this the SW would ALSO copy every downloaded byte into
    //     dunia-assets-*, silently doubling the ~200MB the child just paid for.
    if (req.headers.get('X-Dunia-Offline')) return

    // (c) The wrapper shell (film-anak/film-play/film-offline/sw-reload) stays
    //     NETWORK-FIRST so a deploy still lands, but falls back to the film
    //     shell bucket — which survives version bumps — when there is no net.
    if (filmCache === FILM_SHELL_CACHE) {
      // NOTE: caches.match({cacheName}) — NOT caches.open(). open() would
      // CREATE the bucket, and an empty `dunia-film-*` bucket reads as an
      // installed game in the hub.
      const shellFallback = () =>
        caches.match(req, { cacheName: FILM_SHELL_CACHE, ignoreSearch: true }).catch(() => null)
      //     sw-reload.js is shared with the OTHER standalone game pages, so its
      //     non-HTML path keeps the unchanged cache-first strategy and only
      //     adds the film shell as a LAST-resort fallback — otherwise those
      //     pages would lose their offline copy of it.
      e.respondWith(
        isHTML
          ? htmlNetworkFirst(req, shellFallback)
          : assetCacheFirst(req).then((res) => res || shellFallback()).catch(() => shellFallback())
      )
      return
    }

    // (d) An INSTALLED game's own files: TRUE CACHE-FIRST out of its dedicated
    //     bucket, returned directly with zero network. ignoreSearch so a
    //     ?v=/?cachebust the game appends still hits the file we stored.
    //     A miss (game not installed / file not in the manifest) falls through
    //     to the unchanged behaviour above, so nothing regresses for the 16
    //     games the child did not install.
    e.respondWith(
      caches.match(req, { cacheName: filmCache, ignoreSearch: true })
        .catch(() => null)   // bucket does not exist = game not installed
        .then((hit) => hit || (isHTML ? htmlNetworkFirst(req) : assetCacheFirst(req)))
    )
    return
  }

  if (isHTML) {
    e.respondWith(htmlNetworkFirst(req))
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
  e.respondWith(assetCacheFirst(req))
})
