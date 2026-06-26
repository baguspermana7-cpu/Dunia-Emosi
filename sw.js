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

const CACHE_VERSION = 'v54.59-20260626bl'
const HTML_CACHE = `dunia-html-${CACHE_VERSION}`
const ASSET_CACHE = `dunia-assets-${CACHE_VERSION}`

// Pre-cache critical shell on install (offline-first launch).
// Includes Pixi.js + G23 game files because that's the most-played game and
// users complained about slow first-load. Pixi is now self-hosted (~800KB).
// v54.31: ALSO pre-cache the SFX manifests (~950KB) + the 30 most-likely
// first-paint Pokemon sprites. Owner reported "at least 2 minutes" before
// sound + sprites appeared in PvP. Pre-cached sprites + manifests cut the
// PvP cold-start path from network → cache (instant). Gen 9 (924-1025) is
// NOT pre-cached because the local bundle for those IDs is corrupted and
// they route to the PokemonDB CDN at battle-time (see LOCAL_SPRITE_BLOCKLIST
// in battle-modes.js).
const _PRECACHE_SPRITES = [
  // Kanto starter lines (1-9) — 90% of PvP first picks
  1, 2, 3, 4, 5, 6, 7, 8, 9,
  // Pikachu line (25-26) + Eevee (133)
  25, 26, 133,
  // Johto starter lines (152-160) — Tim Ash Johto + Tim Cyndaquil etc.
  152, 153, 154, 155, 156, 157, 158, 159, 160,
  // Hoenn starter lines (252-260) — the Hoenn Starter pack owner uses
  252, 255, 258,
  // Hoenn pack supporting members (Ralts, Zigzagoon, Poochyena, Torchic, Treecko, Mudkip)
  261, 263, 280,
  // Common companion Pokemon (Kingler, Starmie, Onix, Steelix, Meowth)
  99, 121, 95, 208, 52,
  // Common Ash signatures beyond starters (Snorlax, Lapras, Dragonite)
  143, 131, 149
]
const _PRECACHE_SLUGS = {
  1:'bulbasaur', 2:'ivysaur', 3:'venusaur', 4:'charmander', 5:'charmeleon',
  6:'charizard', 7:'squirtle', 8:'wartortle', 9:'blastoise',
  25:'pikachu', 26:'raichu', 133:'eevee',
  152:'chikorita', 153:'bayleef', 154:'meganium', 155:'cyndaquil',
  156:'quilava', 157:'typhlosion', 158:'totodile', 159:'croconaw', 160:'feraligatr',
  252:'treecko', 255:'torchic', 258:'mudkip',
  261:'poochyena', 263:'zigzagoon', 280:'ralts',
  99:'kingler', 121:'starmie', 95:'onix', 208:'steelix', 52:'meowth',
  143:'snorlax', 131:'lapras', 149:'dragonite'
}
const _spritePath = (id) => '/Dunia-Emosi/assets/Pokemon/pokemondb_hd_alt2/'
  + String(id).padStart(4, '0') + '_' + _PRECACHE_SLUGS[id] + '.webp'
const SHELL = [
  '/Dunia-Emosi/',
  '/Dunia-Emosi/index.html',
  '/Dunia-Emosi/style.css',
  '/Dunia-Emosi/manifest.json',
  '/Dunia-Emosi/assets/icon-192.png',
  '/Dunia-Emosi/assets/icon-512.png',
  '/Dunia-Emosi/assets/g23-icon.png',
  '/Dunia-Emosi/games/lib/pixi.min.js?v=8',
  // SFX manifests (950KB combined) — fetched at PvP first launch in
  // sfx-engine.js:148-149. Pre-cached so the manifests are instant from
  // first PvP battle.
  '/Dunia-Emosi/Sounds/pokemon%20sounds/pokemon_attack_sfx_manifest.json',
  '/Dunia-Emosi/Sounds/pokemon%20sounds/attack_move_sfx_manifest.json',
  // Top-30 starter / popular sprites — ~2.5MB total. Eliminates the "30s
  // sprites loading" gap owner reported.
  ..._PRECACHE_SPRITES.map(_spritePath),
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
