/* CekBentuk — PRD-53 island "Pulau Bentuk" (visual-spatial, Gv). Two original item kinds:
 *   rotate  "Mana yang sama, hanya diputar?" a chiral block shape; one choice is the shape turned, every other
 *           choice is its MIRROR turned (the usual error at 5-7 years: Frick, Moehring & Newcombe 2014). Turns climb
 *           0 -> 45 -> 90 -> 135 -> 180 degrees.
 *   tiles   copy a 2x2, then 3x3 pattern of half-coloured tiles by tapping each tile to turn it (block-design idea,
 *           untimed, built from SVG).
 * Five levels, four items each (20):  1 rotate 0/45 (3 choices) · 2 rotate 90 · 3 tiles 2x2 · 4 rotate 135/180 (4) · 5 tiles 3x3
 *   make(level, seed) -> rotate: { kind, cells, choices:[{cells, turn, mirror}], answer }
 *                        tiles:  { kind, n, target:[0-3 ...] }
 *   canon(cells) the shape up to quarter turns; mirror(cells); svgShape(cells, turn, px); svgTile(o, px)
 */
;(function (W) {
  'use strict'
  var C = W.CekCore, LEVELS = 5, PER_LEVEL = 4
  // chiral tetrominoes and pentominoes (L, S, F, N, P, Y): none of them equals its own mirror after any turn
  var SHAPES = [
    [[0, 0], [0, 1], [0, 2], [1, 2]], [[1, 0], [2, 0], [0, 1], [1, 1]], [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]],
    [[0, 0], [0, 1], [1, 1], [1, 2], [1, 3]], [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]], [[1, 0], [0, 1], [1, 1], [1, 2], [1, 3]]
  ]
  function norm (cells) {
    var mx = Math.min.apply(null, cells.map(function (c) { return c[0] })), my = Math.min.apply(null, cells.map(function (c) { return c[1] }))
    return cells.map(function (c) { return [c[0] - mx, c[1] - my] }).sort(function (a, b) { return a[1] - b[1] || a[0] - b[0] })
  }
  function quarter (cells) { return cells.map(function (c) { return [-c[1], c[0]] }) }
  function canon (cells) {
    var best = null, cur = cells
    for (var i = 0; i < 4; i++) { var k = JSON.stringify(norm(cur)); if (best === null || k < best) best = k; cur = quarter(cur) }
    return best
  }
  function mirror (cells) { return norm(cells.map(function (c) { return [-c[0], c[1]] })) }
  function make (level, seed) {
    var r = C.rng(seed * 104729 + level * 31)
    if (level === 3 || level === 5) {
      var n = level === 3 ? 2 : 3, t
      do { t = []; for (var i = 0; i < n * n; i++) t.push(Math.floor(r() * 4)) } while (new Set(t).size < 2)
      return { kind: 'tiles', level: level, n: n, target: t }
    }
    var turns = level === 1 ? [0, 45] : level === 2 ? [90] : [135, 180]
    var turn = C.pick(r, turns), cells = norm(C.pick(r, SHAPES)), m = mirror(cells), nCh = level === 4 ? 4 : 3
    var out = [{ cells: cells, turn: turn, mirror: false }], others = C.shuffle(r, [0, 45, 90, 135, 180, 225, 270, 315])
    for (var j = 0; out.length < nCh; j++) out.push({ cells: m, turn: others[j], mirror: true })
    var order = C.shuffle(r, out.map(function (_, i) { return i }))
    return { kind: 'rotate', level: level, cells: cells, choices: order.map(function (i) { return out[i] }), answer: order.indexOf(0) }
  }
  function svgShape (cells, turn, px, fill) {
    var w = 1 + Math.max.apply(null, cells.map(function (c) { return c[0] })), h = 1 + Math.max.apply(null, cells.map(function (c) { return c[1] }))
    var u = 16, ox = 50 - w * u / 2, oy = 50 - h * u / 2
    var sq = cells.map(function (c) { return '<rect x="' + (ox + c[0] * u) + '" y="' + (oy + c[1] * u) + '" width="' + u + '" height="' + u + '" rx="2"/>' }).join('')
    return '<svg viewBox="0 0 100 100" width="' + px + '" height="' + px + '" aria-hidden="true"><g transform="rotate(' + turn + ' 50 50)" fill="' + (fill || '#2563eb') + '" stroke="#0f172a" stroke-width="1.5">' + sq + '</g></svg>'
  }
  // a tile: the square, with one half (cut along a diagonal) coloured; o = which corner the coloured half sits in
  var HALF = ['M0 0H100L0 100Z', 'M0 0H100V100Z', 'M100 0V100H0Z', 'M0 0L100 100H0Z']
  function svgTile (o, px) {
    return '<svg viewBox="0 0 100 100" width="' + px + '" height="' + px + '" aria-hidden="true"><rect width="100" height="100" fill="#f8fafc"/><path d="' + HALF[o] + '" fill="#dc2626"/><rect width="100" height="100" fill="none" stroke="#0f172a" stroke-width="4"/></svg>'
  }
  W.CekBentuk = { make: make, canon: canon, mirror: mirror, svgShape: svgShape, svgTile: svgTile, SHAPES: SHAPES, LEVELS: LEVELS, PER_LEVEL: PER_LEVEL, MAX: LEVELS * PER_LEVEL }
})(typeof window !== 'undefined' ? window : globalThis)
