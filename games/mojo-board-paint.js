/* Mojo board ground detail (owner 2026-10-04, "immersive diorama"): a second canvas over the game's ground
 * canvas, painted once per layout (no per-frame cost). Grass gets a seeded scatter of tufts, flowers and pebbles;
 * the road gets soft wear marks. Seeded per cell, so a cell looks the same on every layout. ES5. */
(function (W) {
  'use strict'
  function rng (seed) { var s = seed >>> 0 || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }
  var TUFT = { town: '#5E9E3A', park: '#559A36', hill: '#5F8F3A' }
  var PETALS = ['#FFFFFF', '#FFD54F', '#F48FB1', '#CE93D8']

  function tuft (x, X, Y, s, col) {
    x.strokeStyle = col; x.lineWidth = Math.max(1, s * 0.022); x.lineCap = 'round'; x.beginPath()
    ;[-1, 0, 1].forEach(function (k) { x.moveTo(X + k * s * 0.025, Y); x.quadraticCurveTo(X + k * s * 0.04, Y - s * 0.05, X + k * s * 0.06, Y - s * 0.075 - (k ? 0 : s * 0.02)) })
    x.stroke()
  }
  function flower (x, X, Y, s, col) {
    var r = s * 0.024; x.fillStyle = col
    for (var i = 0; i < 5; i++) { var a = i * 1.2566; x.beginPath(); x.arc(X + Math.cos(a) * r, Y + Math.sin(a) * r, r * 0.8, 0, 7); x.fill() }
    x.fillStyle = '#F9A825'; x.beginPath(); x.arc(X, Y, r * 0.65, 0, 7); x.fill()
  }
  function pebble (x, X, Y, s) {
    x.fillStyle = 'rgba(120,110,95,.55)'; x.beginPath(); x.ellipse(X, Y, s * 0.028, s * 0.018, 0, 0, 7); x.fill()
    x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(X - s * 0.008, Y - s * 0.006, s * 0.01, s * 0.006, 0, 0, 7); x.fill()
  }
  function paint (cv, lv, s) {
    if (!cv || !lv || !s) return
    var R = lv.grid.rows, C = lv.grid.cols, dpr = Math.min(2, W.devicePixelRatio || 1), theme = lv.grid.theme || 'town'
    cv.width = Math.round(C * s * dpr); cv.height = Math.round(R * s * dpr)
    var x = cv.getContext('2d'); if (!x) return
    x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, C * s, R * s)
    if (theme === 'school') return   // indoor floor: nothing grows
    var occupied = {}; (lv.objects || []).forEach(function (o) { occupied[o.at[0] + ',' + o.at[1]] = 1 })
    for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) {
      var k = lv.grid.map[r].charAt(c), rand = rng((r + 1) * 7919 + (c + 1) * 104729 + R * 31), X = c * s, Y = r * s
      if (k === ',' || k === 'T') {
        var n = occupied[r + ',' + c] ? 2 : 4 + Math.floor(rand() * 3)
        for (var i = 0; i < n; i++) {
          var px = X + s * (0.12 + rand() * 0.76), py = Y + s * (0.14 + rand() * 0.76), t = rand()
          if (k === 'T' && Math.abs(px - X - s / 2) < s * 0.25 && py > Y + s * 0.45) continue   // keep the trunk's foot clean
          if (t < 0.5) tuft(x, px, py, s, TUFT[theme] || TUFT.town)
          else if (t < 0.8) flower(x, px, py, s, PETALS[Math.floor(rand() * PETALS.length)])
          else pebble(x, px, py, s)
        }
      } else if (k === '.' || k === '=') {
        x.fillStyle = 'rgba(90,70,40,.07)'
        for (var j = 0; j < 3; j++) { x.beginPath(); x.ellipse(X + s * (0.2 + rand() * 0.6), Y + s * (0.2 + rand() * 0.6), s * (0.06 + rand() * 0.08), s * (0.03 + rand() * 0.03), rand() * 3, 0, 7); x.fill() }
        x.fillStyle = 'rgba(90,70,40,.12)'
        for (var q = 0; q < 5; q++) { x.beginPath(); x.arc(X + s * (0.1 + rand() * 0.8), Y + s * (0.1 + rand() * 0.8), s * 0.008, 0, 7); x.fill() }
      }
    }
  }
  W.MojoBoardPaint = { paint: paint }
})(window)
