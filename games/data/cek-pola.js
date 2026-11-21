/* CekPola — PRD-53 island "Pulau Pola" (fluid reasoning, Gf). Original pattern-completion items in the format of
 * Coloured Progressive Matrices (a grid with the last cell missing; pick it from 4-6 choices). Generated, never
 * copied. Six levels, four items each (24):
 *   1  2x2, one attribute changes by column            4 choices
 *   2  2x2, one attribute changes by row               4 choices
 *   3  2x2, shape by column AND colour by row          6 choices
 *   4  3x3, count grows along the row, shape by row    6 choices
 *   5  3x3, shape by column, colour by row, size grows 6 choices
 *   6  3x3, a turn grows along the row (each row starts further turned), colour by column, shape by row
 * A cell is { shape, color, size 1-3, count 1-3, rot }. Only shapes that look different when turned ever carry a
 * turn, so no two choices can look the same (tools/test-cek-items.mjs L1 solves every item independently).
 *   make(level, seed) -> { level, rows, cols, grid:[cell...] (last = the gap), choices:[cell...], answer }
 *   svg(cell, px)     -> an inline SVG string (no emoji, no images)
 */
;(function (W) {
  'use strict'
  var C = W.CekCore
  var SYM = ['circle', 'square', 'triangle', 'star', 'diamond'], ASYM = ['arrow', 'flag', 'moon']
  var COLORS = ['merah', 'biru', 'kuning', 'hijau'], HEX = { merah: '#dc2626', biru: '#2563eb', kuning: '#eab308', hijau: '#16a34a' }
  var LEVELS = 6, PER_LEVEL = 4
  function cell (shape, color, size, count, rot) { return { shape: shape, color: color, size: size, count: count, rot: rot } }
  function two (r, arr) { var a = C.shuffle(r, arr); return [a[0], a[1], a[2]] }
  function grid (level, r) {
    var g = [], rows, cols, sh = two(r, SYM), co = two(r, COLORS), base = C.pick(r, SYM), col0 = C.pick(r, COLORS)
    if (level === 1) { rows = 2; cols = 2; for (var i = 0; i < 4; i++) g.push(cell(sh[i % 2], col0, 2, 1, 0)) }
    else if (level === 2) { rows = 2; cols = 2; for (i = 0; i < 4; i++) g.push(cell(base, co[i >> 1], 2, 1, 0)) }
    else if (level === 3) { rows = 2; cols = 2; for (i = 0; i < 4; i++) g.push(cell(sh[i % 2], co[i >> 1], 2, 1, 0)) }
    else {
      rows = 3; cols = 3
      var as = C.shuffle(r, ASYM), turn0 = C.pick(r, [0, 45])   // max 45 + 90 + 180 = 315: the turn never wraps past 360
      for (var y = 0; y < 3; y++) for (var x = 0; x < 3; x++) {
        if (level === 4) g.push(cell(sh[y], col0, 2, x + 1, 0))
        else if (level === 5) g.push(cell(sh[x], co[y], x + 1, 1, 0))
        else g.push(cell(as[y], co[x], 2, 1, (turn0 + y * 45 + x * 90) % 360))
      }
    }
    return { rows: rows, cols: cols, grid: g }
  }
  function key (c) { return [c.shape, c.color, c.size, c.count, c.rot].join('|') }
  function make (level, seed) {
    var r = C.rng(seed * 7919 + level), it = grid(level, r), ans = it.grid[it.grid.length - 1]
    var n = level <= 2 ? 4 : 6, seen = {}, out = [ans]; seen[key(ans)] = 1
    var asym = ASYM.indexOf(ans.shape) >= 0
    for (var guard = 0; out.length < n && guard < 400; guard++) {
      var d = Object.assign({}, ans), what = C.pick(r, asym ? ['shape', 'color', 'rot', 'rot', 'size'] : ['shape', 'color', 'size', 'count'])
      if (what === 'shape') d.shape = C.pick(r, asym ? ASYM : SYM)
      else if (what === 'color') d.color = C.pick(r, COLORS)
      else if (what === 'size') d.size = 1 + Math.floor(r() * 3)
      else if (what === 'count') d.count = 1 + Math.floor(r() * 3)
      else d.rot = C.pick(r, [0, 45, 90, 135, 180, 225, 270, 315])
      if (ASYM.indexOf(d.shape) < 0) d.rot = 0
      if (!seen[key(d)]) { seen[key(d)] = 1; out.push(d) }
    }
    var order = C.shuffle(r, out.map(function (_, i) { return i }))
    return { level: level, rows: it.rows, cols: it.cols, grid: it.grid, choices: order.map(function (i) { return out[i] }), answer: order.indexOf(0) }
  }
  var PATH = {
    circle: '<circle cx="0" cy="0" r="10"/>', square: '<rect x="-9" y="-9" width="18" height="18" rx="2"/>',
    triangle: '<path d="M0-11L10 8H-10Z"/>', diamond: '<path d="M0-11L9 0L0 11L-9 0Z"/>',
    star: '<path d="M0-11L3-3L11-3L4.5 2L7 10L0 5L-7 10L-4.5 2L-11-3L-3-3Z"/>',
    arrow: '<path d="M-10-4H3V-10L11 0L3 10V4H-10Z"/>', flag: '<path d="M-8-11V11H-4V1L9-5L-4-11Z"/>',
    moon: '<path d="M4-10A11 11 0 1 0 4 10A8 8 0 1 1 4-10Z"/>'
  }
  function svg (c, px) {
    var s = [0, 0.62, 0.82, 1][c.size] || 0.82, n = c.count, pos = n === 1 ? [[50, 50]] : n === 2 ? [[30, 50], [70, 50]] : [[50, 26], [28, 70], [72, 70]]
    var k = n === 1 ? s * 3 : s * 1.75
    var body = pos.map(function (p) { return '<g transform="translate(' + p[0] + ' ' + p[1] + ') rotate(' + c.rot + ') scale(' + k.toFixed(2) + ')">' + PATH[c.shape] + '</g>' }).join('')
    return '<svg viewBox="0 0 100 100" width="' + px + '" height="' + px + '" aria-hidden="true"><g fill="' + HEX[c.color] + '" stroke="#0f172a" stroke-width="0.8">' + body + '</g></svg>'
  }
  W.CekPola = { make: make, svg: svg, LEVELS: LEVELS, PER_LEVEL: PER_LEVEL, MAX: LEVELS * PER_LEVEL }
})(typeof window !== 'undefined' ? window : globalThis)
