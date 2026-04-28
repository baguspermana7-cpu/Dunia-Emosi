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
    urls.push(`${basePath}/sprites/${slug}.png`);
    urls.push(`https://img.pokemondb.net/sprites/home/normal/${slug}.png`);
    if (id) urls.push(`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`);
    return urls;
  }

  // Hotfix #104 (2026-04-28): bounded concurrency queue. Picker grid spawns
  // 30+ images at once; without a cap, browser connection pool saturates and
  // onerror chains pile up on the main thread (suspected freeze cause).
  const MAX_CONCURRENT = 4;
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

  function attachSpriteCascade(imgEl, sources, fallbackEmoji, onLoadCb) {
    if (!imgEl) return;
    const tried = new Set();
    const queue = (sources || []).filter(u => {
      if (!u || typeof u !== 'string') return false;
      if (tried.has(u)) return false;
      tried.add(u);
      return true;
    });
    let i = 0;
    let released = false;
    function done() {
      if (released) return;
      released = true;
      _release();
      if (typeof onLoadCb === 'function') {
        try { onLoadCb(imgEl); } catch (_) {}
      }
    }
    function attempt() {
      imgEl.onload = null;
      imgEl.onerror = null;
      if (i >= queue.length) {
        imgEl.src = _emojiDataURL(fallbackEmoji);
        done();
        return;
      }
      const url = queue[i++];
      imgEl.onload = function () {
        imgEl.onload = null;
        imgEl.onerror = null;
        done();
      };
      imgEl.onerror = function () {
        imgEl.onerror = null;
        imgEl.onload = null;
        if (_IS_DEV) console.warn('[sprite] failed:', url);
        attempt();
      };
      imgEl.src = url;
    }
    _slot(attempt);
  }

  if (typeof window !== 'undefined') {
    window.attachSpriteCascade = attachSpriteCascade;
    window.buildPokeSources = buildPokeSources;
  }
})();
