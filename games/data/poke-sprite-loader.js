/**
 * Shared sprite cascade loader. Replaces ad-hoc onerror chains in game.js,
 * g13c-pixi.html, g20-pixi.html, etc. that previously could re-set img.src to
 * the same failing URL → wasted retries / suspected freeze in mobile Chrome.
 *
 * Contract:
 *  - attachSpriteCascade(imgEl, sources[, fallbackEmoji])
 *    - sources: array of URL strings; nulls/falsies are dropped; duplicates are
 *      deduped. Each URL is attempted at most once. After all fail, imgEl.src
 *      is set to a data-URL emoji and onerror is cleared. No further retries.
 *  - buildPokeSources(slug, pokeId, { basePath }):
 *    - basePath defaults to 'assets/Pokemon' (root-relative). Standalone pages
 *      in /games/ should pass basePath: '../assets/Pokemon'.
 *
 * Why a class? Function only — keeps drop-in usage and zero-build deploy.
 *
 * Created 2026-04-28 to fix freeze bug in g10/g13b/g13c per plan
 * /home/baguspermana7/.claude/plans/purring-brewing-flurry.md.
 */
(function(){
  'use strict';

  const _IS_DEV = typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname === '');

  function _emojiDataURL(emoji) {
    const e = String(emoji || '👾');
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${e}</text></svg>`;
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  function _slugToAlt2File(slug) {
    if (slug === 'nidoran-f') return 'nidoranf';
    if (slug === 'nidoran-m') return 'nidoranm';
    return String(slug).replace(/-/g, '_');
  }

  function buildPokeSources(slug, pokeId, opts) {
    const basePath = (opts && opts.basePath) || 'assets/Pokemon';
    const POKE_IDS = (typeof window !== 'undefined' && window.POKE_IDS) || {};
    const id = pokeId || POKE_IDS[slug];
    const urls = [];
    if (id) {
      urls.push(`${basePath}/pokemondb_hd_alt2/${String(id).padStart(4,'0')}_${_slugToAlt2File(slug)}.webp`);
      urls.push(`${basePath}/svg/${id}.svg`);
    }
    urls.push(`https://img.pokemondb.net/sprites/home/normal/${slug}.png`);
    // v56.0 B-289 — Showdown fallback BY NAME (separators stripped), not PokeAPI BY ID:
    // the app's internal Gen-9 ids diverge from the National Dex, so an id-keyed PokeAPI
    // URL fetched the WRONG SPECIES for every Gen-9 Pokemon. Name-keyed never mismatches.
    urls.push(`https://play.pokemonshowdown.com/sprites/gen5/${String(slug).replace(/-/g, '')}.png`);
    return urls;
  }

  // Hotfix #104 (2026-04-28): bounded concurrency queue. Picker grid spawns
  // 30+ images at once; without a cap, browser connection pool saturates and
  // onerror chains pile up on the main thread (suspected freeze cause).
  // Hotfix #110 (2026-04-29): bumped 4→8 to reduce queue-saturation risk at
  // re-entry; combined with flushSpriteQueue() for explicit reset.
  const MAX_CONCURRENT = 8;
  let _inFlight = 0;
  const _waitQueue = [];
  function _drain() {
    while (_inFlight < MAX_CONCURRENT && _waitQueue.length) {
      const fn = _waitQueue.shift();
      try { fn(); } catch (_) { _inFlight = Math.max(0, _inFlight - 1); _drain(); }
    }
  }
  function _slot(fn) {
    if (_inFlight < MAX_CONCURRENT) { _inFlight++; fn(); }
    else _waitQueue.push(() => { _inFlight++; fn(); });
  }
  function _release() {
    _inFlight = Math.max(0, _inFlight - 1);
    _drain();
  }

  // Hotfix #110 (2026-04-29): clear ALL stale state on a sprite element
  // before starting a fresh cascade. Idempotent. Caller can also call
  // standalone before re-entering a game scene to defeat stale-onerror
  // race conditions that survived previous cascades.
  function resetSpriteEl(imgEl) {
    if (!imgEl) return;
    imgEl.onerror = null;
    imgEl.onload = null;
    if (imgEl.dataset) {
      delete imgEl.dataset.fallback;
      delete imgEl.dataset.evolveFallback;
      delete imgEl.dataset.tried;
      delete imgEl.dataset.triedRemote;
    }
    // removeAttribute('src') forces the browser to drop the previous image
    // (including data-URL emoji fallbacks). Setting src='' alone leaves the
    // old image visible until a new src loads.
    try { imgEl.removeAttribute('src'); } catch (_) {}
    // Force layout recalc so the empty state is committed before next load.
    void imgEl.offsetWidth;
  }

  // Reset module-level concurrency state. Caller (game init) should invoke
  // this BEFORE starting a new scene so pending closures from a previous
  // scene are abandoned and don't fire after the new scene loads.
  function flushSpriteQueue() {
    _inFlight = 0;
    _waitQueue.length = 0;
  }

  // Hotfix #120-Z (2026-05-02): PARALLEL probe cascade.
  // Was sequential (try URL 1, on fail try URL 2, ...) — could take 16s+ on slow
  // mobile networks where each URL hits 4s watchdog. Now: launch all probes in
  // parallel via new Image(), first onload wins. Saves 4-12 seconds typically.
  const TOTAL_TIMEOUT_MS = 8000;
  const PRIMARY_TIMEOUT_MS = 3000;   // the HD candidate's head start (see the PRIORITY CASCADE note in start())

  // 2026-10-17 (owner's caching video: "cache miss falls through to the database, a hit never touches it"):
  // remember which URL of a cascade actually loaded. A HIT tries that one URL straight away -- no 404 probes on the
  // local HD/SVG candidates every battle; a MISS (first time, or the remembered URL stopped working) runs the full
  // cascade and stores the winner. L1 = memory, L2 = localStorage, so the next visit is a hit too. The emoji
  // fallback is never cached (a network blip must not pin a Pokemon to an emoji).
  const CACHE_KEY = 'poke_sprite_winner_v1';
  const CACHE_MAX = 600;
  const _mem = new Map();
  const _stats = { hit: 0, miss: 0, stale: 0 };
  (function _loadL2() {
    try {
      const o = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      Object.keys(o).forEach(k => _mem.set(k, o[k]));
    } catch (_) {}
  })();
  let _saveT = null;
  function _saveL2() {
    if (_saveT) return;
    _saveT = setTimeout(() => {
      _saveT = null;
      try {
        while (_mem.size > CACHE_MAX) _mem.delete(_mem.keys().next().value);
        const o = {}; _mem.forEach((v, k) => { o[k] = v; });
        localStorage.setItem(CACHE_KEY, JSON.stringify(o));
      } catch (_) {}
    }, 400);
  }
  function _cacheKey(queue) { return queue.join('|'); }

  function attachSpriteCascade(imgEl, sources, fallbackEmoji, onLoadCb) {
    if (!imgEl) return;
    resetSpriteEl(imgEl);
    const tried = new Set();
    const queue = (sources || []).filter(u => {
      if (!u || typeof u !== 'string') return false;
      if (tried.has(u)) return false;
      tried.add(u);
      return true;
    });
    const ckey = _cacheKey(queue);
    let primaryHardFail = false;
    let resolved = false;
    let released = false;
    let timeoutId = null;
    const probes = [];
    function release() {
      if (released) return;
      released = true;
      _release();
    }
    function cleanup() {
      // Abort in-flight requests (set src='' cancels pending load in modern browsers)
      probes.forEach(p => {
        p.onload = null;
        p.onerror = null;
        try { p.src = ''; } catch (_) {}
      });
      probes.length = 0;
      if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
    }
    function finish(winningUrl) {
      if (resolved) return;
      resolved = true;
      // a lower-quality winner is remembered only when the HD candidate really failed (404), never when it was
      // merely slow: otherwise one slow load would pin a Pokemon to its small sprite for good
      if (winningUrl && (winningUrl === queue[0] || primaryHardFail) && _mem.get(ckey) !== winningUrl) { _mem.delete(ckey); _mem.set(ckey, winningUrl); _saveL2(); }
      cleanup();
      imgEl.src = winningUrl || _emojiDataURL(fallbackEmoji);
      release();
      if (typeof onLoadCb === 'function') {
        try { onLoadCb(imgEl); } catch (_) {}
      }
    }
    function start() {
      if (!queue.length) { finish(null); return; }
      // PRIORITY CASCADE (2026-05-04 fix): the parallel race was letting
      // smaller fallbacks (10KB SVG, 50KB CDN PNG) beat the 500KB HD WebP,
      // so users saw non-HD sprites despite HD being available. User
      // reported Weedle (id 13) as "patah-patah" — that's the bug.
      // New behavior: try the FIRST url (highest quality) alone, give it
      // PRIMARY_TIMEOUT_MS to win, fall back to parallel race of remainder
      // only if it errors or times out. Browser fires onerror on 404
      // immediately, so missing-HD Pokemon (e.g. Gen 9) don't waste the
      // full timeout — they fall straight through to the SVG/CDN race.
      timeoutId = setTimeout(() => {
        if (_IS_DEV) console.warn('[sprite] total timeout, fallback emoji');
        finish(null);
      }, TOTAL_TIMEOUT_MS);

      const cached = _mem.get(ckey);
      if (cached && queue.indexOf(cached) >= 0) {
        // cache HIT: one request, to the URL that worked last time
        _stats.hit++;
        const hitProbe = new Image();
        hitProbe.onload = () => finish(cached);
        hitProbe.onerror = () => {
          // stale entry: forget it and fall through to the full cascade (a miss)
          _stats.stale++;
          _mem.delete(ckey); _saveL2();
          if (!resolved) runCascade();
        };
        probes.push(hitProbe);
        hitProbe.src = cached;
        return;
      }
      runCascade();
    }
    function runCascade() {
      _stats.miss++;
      const primaryUrl = queue[0];
      const fallbacks = queue.slice(1);

      function raceFallbacks() {
        if (resolved) return;
        if (!fallbacks.length) { finish(null); return; }
        let pending = fallbacks.length;
        fallbacks.forEach(url => {
          const probe = new Image();
          probe.onload = () => { finish(url); };
          probe.onerror = () => {
            pending--;
            if (_IS_DEV) console.warn('[sprite] failed:', url);
            if (pending === 0) finish(null);
          };
          probes.push(probe);
          probe.src = url;
        });
      }

      const primary = new Image();
      const primaryTimeoutId = setTimeout(() => {
        if (resolved) return;
        primary.onload = null;
        primary.onerror = null;
        if (_IS_DEV) console.warn('[sprite] primary slow, racing fallbacks:', primaryUrl);
        raceFallbacks();
      }, PRIMARY_TIMEOUT_MS);
      primary.onload = () => {
        clearTimeout(primaryTimeoutId);
        finish(primaryUrl);
      };
      primary.onerror = () => {
        clearTimeout(primaryTimeoutId);
        primaryHardFail = true;
        if (_IS_DEV) console.warn('[sprite] primary failed, racing fallbacks:', primaryUrl);
        raceFallbacks();
      };
      probes.push(primary);
      primary.src = primaryUrl;
    }
    _slot(start);
  }

  if (typeof window !== 'undefined') {
    window.attachSpriteCascade = attachSpriteCascade;
    window.buildPokeSources = buildPokeSources;
    window.resetSpriteEl = resetSpriteEl;
    window.flushSpriteQueue = flushSpriteQueue;
    window.spriteCacheStats = () => Object.assign({ size: _mem.size }, _stats);
  }
})();
