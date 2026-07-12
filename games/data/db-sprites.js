/* ============================================================================
 * db-sprites.js — shared accessor for the non-Pokémon asset DB (window.DBSprites)
 * ---------------------------------------------------------------------------
 * A-356 built assets/db/<category>/NNN.webp — 6 categories × 100 illustrated,
 * transparent, thin-bordered sprites. These are UNLABELED generic art, so they
 * fit COUNTING / decoration (where identity doesn't matter), not naming quizzes.
 *
 *   DBSprites.path(cat, n)   → 'assets/db/creatures/007.webp' (n 1..100)
 *   DBSprites.pick(cat)      → a random sprite path in that category
 *   DBSprites.pickN(cat, k)  → k distinct random paths
 *   DBSprites.categories()   → ['creatures','faces','objects','science','vehicles','elements']
 *
 * Deployment-root + this-script-relative aware (works from games/ and root).
 * ==========================================================================*/
(function () {
  'use strict'
  var W = (typeof window !== 'undefined' ? window : globalThis)
  if (W.DBSprites) return

  var COUNTS = { creatures: 100, faces: 100, objects: 100, science: 100, vehicles: 100, elements: 100 }

  // Base resolves relative to THIS script (…/games/data/db-sprites.js → …/assets/db/)
  var BASE = (function () {
    try {
      var cs = document.currentScript
      if (cs && cs.src) return cs.src.replace(/[^/]*$/, '') + '../../assets/db/'
    } catch (e) {}
    try {
      var b = (location.pathname.indexOf('/Dunia-Emosi/') === 0) ? '/Dunia-Emosi/' : '/'
      return b + 'assets/db/'
    } catch (e2) { return '/assets/db/' }
  })()

  function pad3 (n) { n = String(n); return n.length >= 3 ? n : ('000' + n).slice(-3) }
  function has (cat) { return COUNTS.hasOwnProperty(cat) }
  function count (cat) { return COUNTS[cat] || 0 }

  function path (cat, n) {
    if (!has(cat)) return ''
    n = Math.max(1, Math.min(count(cat), n | 0 || 1))
    return BASE + cat + '/' + pad3(n) + '.webp'
  }
  function pick (cat) {
    if (!has(cat)) return ''
    return path(cat, 1 + Math.floor(Math.random() * count(cat)))
  }
  function pickN (cat, k) {
    if (!has(cat)) return []
    var ids = [], out = [], i
    for (i = 1; i <= count(cat); i++) ids.push(i)
    for (i = ids.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = ids[i]; ids[i] = ids[j]; ids[j] = t }
    for (i = 0; i < Math.min(k, ids.length); i++) out.push(path(cat, ids[i]))
    return out
  }

  W.DBSprites = {
    path: path, pick: pick, pickN: pickN, count: count,
    categories: function () { var k = []; for (var c in COUNTS) if (COUNTS.hasOwnProperty(c)) k.push(c); return k },
    base: function () { return BASE }
  }
})();
