/* =============================================================================
 * mojo-pack.js — the PACK switch for the Mojo engine (owner decision 2026-10-10, docs/KERETA-ON-MOJO-BRIEF.md).
 * `mojo-swoptops.html?pack=kereta` is the SAME game (same screens, board, hint ladder, Tunjukkan Caranya, effects);
 * a pack only swaps content and skin: levels + regions, the hero vehicle, the narrator, backgrounds, words.
 * Loaded twice on purpose, as a classic blocking script, so no module system is needed:
 *   phase 1 (in <head>)             reads ?pack=, marks <html data-pack>, writes the skin stylesheet
 *   phase 2 (after mojo-levels.js)  writes data/<id>-pack.js, which edits MojoLevels / MojoArt in place before any
 *                                   other module reads them, then sets window.MojoPack.def
 * With no ?pack= (or an unknown one) both phases do nothing and Mojo Swoptops is untouched.
 * ==========================================================================*/
(function (W, D) {
  'use strict'
  var PACKS = { kereta: { css: 'kereta-pack.css', data: ['data/kereta-pack-levels.js', 'data/kereta-pack.js'] } }
  var me = D.currentScript && D.currentScript.src, V = me && me.indexOf('?') > 0 ? me.slice(me.indexOf('?')) : ''   // the page's own cache token
  var id = (/[?&]pack=([a-z0-9-]+)/.exec(W.location.search) || [])[1]
  if (!id || !PACKS[id]) return
  if (!W.MojoPack) {
    W.MojoPack = { id: id, def: null }
    D.documentElement.setAttribute('data-pack', id)
    D.write('<link rel="stylesheet" href="' + PACKS[id].css + V + '">')
  } else if (!W.MojoPack.loaded) {
    W.MojoPack.loaded = true
    PACKS[id].data.forEach(function (f) { D.write('<script src="' + f + V + '"><\/script>') })
  }
})(window, document)
