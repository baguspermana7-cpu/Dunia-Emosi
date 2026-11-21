/* CekIngat — PRD-53 island "Pulau Ingat" (working memory, Gwm). Three spans, each run by CekCore.span (start 2,
 * two tries per length, stop after two wrong at one length):
 *   maju    pictures shown one by one (1 s each), then tapped in the same order          (forward span)
 *   mundur  the same, tapped from the last back to the first                             (backward span)
 *   corsi   tiles on a board light up one by one, then tapped in the same order          (visuo-spatial span,
 *           Corsi block-tapping; board positions are this file's own, irregular like the original)
 * Sequences never repeat an item, so a length never exceeds the pool (9).
 *   sequence(len, seed, pool) -> [index...]   corsi(len, seed) -> [tile index...]   TILES [[x%, y%]...]
 */
;(function (W) {
  'use strict'
  var C = W.CekCore, POOL = 9
  var TILES = [[14, 14], [44, 18], [78, 12], [24, 46], [56, 42], [86, 48], [14, 84], [42, 76], [72, 86]]   // any two tiles >= 24 % apart on one axis: no overlap down to a 250 px board with 56 px tiles
  function draw (len, seed, n) { var r = C.rng(seed * 6151 + len); return C.shuffle(r, Array.from({ length: n }, function (_, i) { return i })).slice(0, Math.min(len, n)) }
  function sequence (len, seed, pool) { return draw(len, seed, pool || POOL) }
  function corsi (len, seed) { return draw(len, seed + 977, TILES.length) }
  W.CekIngat = { sequence: sequence, corsi: corsi, TILES: TILES, POOL: POOL, SHOW_MS: 1000, GAP_MS: 250 }
})(typeof window !== 'undefined' ? window : globalThis)
