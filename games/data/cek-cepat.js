/* CekCepat — PRD-53 island "Pulau Cepat" (processing speed, Gs). "Sama atau beda?" (NIH Toolbox Pattern Comparison
 * format): two pictures side by side, as many as possible in 85 s (CekCore.SPEED_MS). Pictures are CekPola cells; a
 * "beda" pair differs in EXACTLY ONE thing (shape, colour, count, or size), so the task is seeing, not reasoning.
 * Score = right answers per minute; more than 20 % wrong flags the result (CekProfile.flags).
 *   pair(i, seed) -> { a, b, same }
 */
;(function (W) {
  'use strict'
  var C = W.CekCore
  var SHAPES = ['circle', 'square', 'triangle', 'star', 'diamond'], COLORS = ['merah', 'biru', 'kuning', 'hijau']
  // PRD-56 audit: sizes 2 and 3 drew at 82 % and 100 %; three stars at 82 % next to three at 100 % read as "sama" to an
  // adult on a phone. A size difference is now small (62 %) against big (100 %), plain to see in a speed task.
  var SIZES = [1, 3]
  function pair (i, seed) {
    var r = C.rng(seed * 5059 + i * 3)
    var a = { shape: C.pick(r, SHAPES), color: C.pick(r, COLORS), size: C.pick(r, SIZES), count: 1 + Math.floor(r() * 3), rot: 0 }
    var same = r() < 0.5, b = Object.assign({}, a)
    if (!same) {
      var what = C.pick(r, ['shape', 'color', 'count', 'size'])
      var alt = what === 'shape' ? SHAPES : what === 'color' ? COLORS : what === 'count' ? [1, 2, 3] : SIZES
      var opts = alt.filter(function (v) { return v !== a[what] }); b[what] = C.pick(r, opts)
    }
    return { a: a, b: b, same: same }
  }
  W.CekCepat = { pair: pair }
})(typeof window !== 'undefined' ? window : globalThis)
