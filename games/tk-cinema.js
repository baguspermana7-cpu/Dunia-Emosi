/* ============================================================================
 * tk-cinema.js — window.TKCinema. Layered canvas cinematic engine for Timmy & Kapal
 * Legendaris (PRD v2 §13: in-engine, NOT Remotion — offline, interactive, skippable).
 *
 *   var h = TKCinema.play(host, sequence, opts)
 *        -> { destroy, skip(all?), pause, resume, replay, scene(), setMuted(m), el }
 *
 *   sequence  array of scene components (e.g. TKCinema.TITANIC.PART_A). A scene =
 *             { id, dur (s), draw(ctx, t, env), enter?(env), subs:[{t, who, text, d?}],
 *               cues:[{t, a:'scrape'|'creak'|'horn'|'thud'|'bell'|'whoosh'|'splash'} | {t, mix:{}}],
 *               mix:{ocean, engine, pitch, music}, question?:{at, prompt, choices, answer, explain},
 *               fadeIn (s, default .45), major (bool: checkpoint worth saving) }
 *   opts      { onDone(result), onCheckpoint(sceneId, {phase:'start'|'end', index, major}),
 *               onQuestion(q) -> Promise (host asks: e.g. q => TKQuiz.challenge(host, q)); resolve
 *               with anything ({correct, choice} recommended). Without it a built-in friendly chooser
 *               is shown. The scene clock HOLDS while a question is open (ambient motion continues).
 *               startAt: sceneId (resume), say(text, who) narration, muted, reducedMotion,
 *               speed (default 1; QA uses 3), lib(key) -> url (else TKArt.lib, else assets/db/lib),
 *               controls (default true) }
 *   result    { completed, skippedAll, skipped:[ids], answers:{sceneId: resolved value}, reached:[ids] }
 *
 * Rendering: ONE canvas (DPR <= 2, adaptive quality) + a DOM subtitle bar / title card / chips.
 * Exterior shots run a small 3D renderer (orbit + look-at camera, painter-sorted lit faces clipped at
 * the waterline, world-anchored wave glints, moon path, wake ribbons, particles, fog, grading) so the
 * camera moves continuously; interiors are layered 2D stages (backdrop + props + characters).
 * Audio: original WebAudio synthesis only (ocean bed, engine hum, pad, scrape, creak, horn, bells).
 * Child safety (PRD §0): no people on the sinking ship, no falling, no failure words; the collision
 * is scripted; questions can never be failed (the fallback chooser just says "Coba lagi, ya!").
 * Reduced motion: no camera shake / quick cuts (cross-fades instead), fewer particles, same story.
 * Vanilla ES5, no build; the rAF loop stops when paused, hidden or destroyed.
 * ==========================================================================*/
(function (W) {
  'use strict'
  var D = W.document
  var PI = Math.PI, TAU = PI * 2
  var sin = Math.sin, cos = Math.cos, abs = Math.abs, sqrt = Math.sqrt, max = Math.max, min = Math.min
  var BAD_WORDS = /gagal|kalah|mati|tenggelam|korban/i
  var MEMO = {}   // per page session: the render scale a slow device settled on (next play starts there)

  /* ── small maths ─────────────────────────────────────────────────────── */
  function clamp (v, a, b) { return v < a ? a : v > b ? b : v }
  function lerp (a, b, k) { return a + (b - a) * k }
  function sm (a, b, t) { var k = clamp((t - a) / (b - a), 0, 1); return k * k * (3 - 2 * k) }
  function eio (k) { k = clamp(k, 0, 1); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2 }
  function eback (k) { k = clamp(k, 0, 1); var c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2) }
  function mix3 (a, b, k) { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)] }
  function rgba (c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a == null ? 1 : +a.toFixed(3)) + ')' }
  function hash (n) { var s = sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }
  function rng (seed) {
    var s = seed >>> 0
    return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296 }
  }
  function esc (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) }
  function freeze (c, holder, key) {
    if (W.createImageBitmap) { try { W.createImageBitmap(c).then(function (b) { holder[key] = b }, function () {}) } catch (e) {} }
    return c
  }
  function mkCanvas (w, h) { var c = D.createElement('canvas'); c.width = max(1, w | 0); c.height = max(1, h | 0); return c }

  /* ── art ─────────────────────────────────────────────────────────────── */
  function Art (opts) {
    var cache = {}, derived = {}
    function url (k) {
      if (opts.lib) { try { var u = opts.lib(k); if (u) return u } catch (e) {} }
      if (W.TKArt && W.TKArt.lib) return W.TKArt.lib(k)
      return (opts.base || '') + 'assets/db/lib/' + k + '.webp'
    }
    function get (k) {
      var im = cache[k]
      if (!im) { im = cache[k] = new Image(); im.decoding = 'async'; im.src = url(k) }
      return im.complete && im.naturalWidth ? im : null
    }
    // silhouette / tinted copy (for distant ships at night): cached offscreen canvas
    function tinted (k, col, a) {
      var id = k + '|' + col + '|' + a
      if (derived[id]) return derived[id]
      var im = get(k); if (!im) return null
      var c = mkCanvas(im.naturalWidth, im.naturalHeight), g = c.getContext('2d')
      g.drawImage(im, 0, 0); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = a; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height)
      derived[id] = c; freeze(c, derived, id)
      return c
    }
    // cover-fit backdrop pre-scaled to the viewport (cheap to redraw every frame)
    function cover (k, w, h, over) {
      var id = k + '@' + w + 'x' + h
      if (derived[id]) return derived[id]
      var im = get(k); if (!im) return null
      var tw = w * (over || 1.18), th = h * (over || 1.18)
      var s = max(tw / im.naturalWidth, th / im.naturalHeight)
      var c = mkCanvas(im.naturalWidth * s, im.naturalHeight * s)
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height)
      return (derived[id] = c)
    }
    function load (ks, onP) {
      var n = 0
      return Promise.all(ks.map(function (k) {
        get(k)
        var im = cache[k]
        var p = im.complete && im.naturalWidth ? Promise.resolve() : new Promise(function (res) { im.onload = res; im.onerror = res })
        return p.then(function () { return im.decode ? im.decode().catch(function () {}) : null }).then(function () { n++; if (onP) onP(n / ks.length) })
      }))
    }
    // sprite pre-scaled to an exact pixel height (1:1 blits are the cheap path on software rasterisers)
    var sc = {}, scN = 0
    function scaled (k, h, flip) {
      h = Math.round(h); if (h < 2) return null
      var id = k + '@' + h + (flip ? 'f' : '')
      if (sc[id]) return sc[id]
      var im = get(k); if (!im) return null
      if (scN > 90) { sc = {}; scN = 0 }
      var w = Math.max(1, Math.round(h * im.naturalWidth / im.naturalHeight)), c = mkCanvas(w, h), g = c.getContext('2d')
      g.imageSmoothingQuality = 'high'
      if (flip) { g.translate(w, 0); g.scale(-1, 1) }
      g.drawImage(im, 0, 0, w, h)
      scN++
      sc[id] = c; freeze(c, sc, id)
      return c
    }
    return { url: url, scaled: scaled, get: get, tinted: tinted, cover: cover, load: load, preload: function (ks) { for (var i = 0; i < ks.length; i++) get(ks[i]) } }
  }

  /* ── camera + projection ─────────────────────────────────────────────── */
  function Cam () { return { px: 0, py: 0, pz: 0, yaw: 0, el: 0, roll: 0, f: 600, cx: 0, cy: 0, cyw: 1, syw: 0, ce: 1, se: 0, cr: 1, sr: 0 } }
  function camSet (c, env, px, py, pz, yaw, el, roll, fs, cyf) {
    c.px = px; c.py = py; c.pz = pz; c.yaw = yaw; c.el = el; c.roll = roll || 0
    c.cyw = cos(yaw); c.syw = sin(yaw); c.ce = cos(el); c.se = sin(el)
    var sh = env.shakeV
    c.cr = cos(c.roll + sh[2]); c.sr = sin(c.roll + sh[2])
    c.W = env.w; c.H = env.h; c.f = env.f0 * (fs || 1); c.cx = env.w / 2 + sh[0]; c.cy = env.h * (cyf || 0.5) + sh[1]
    return c
  }
  function lookAt (c, env, P, T, roll, fs, cyf) {
    var dx = T[0] - P[0], dy = T[1] - P[1], dz = T[2] - P[2]
    return camSet(c, env, P[0], P[1], P[2], Math.atan2(dx, dz), Math.atan2(-dy, sqrt(dx * dx + dz * dz)), roll, fs, cyf)
  }
  function orbit (c, env, T, dist, az, el, roll, fs, cyf) {
    var ce = cos(el)
    return camSet(c, env, T[0] + dist * ce * sin(az), T[1] + dist * sin(el), T[2] + dist * ce * cos(az), az + PI, el, roll, fs, cyf)
  }
  // world point -> screen; returns camera depth or -1 (behind)
  function proj (c, x, y, z, out, o) {
    var dx = x - c.px, dy = y - c.py, dz = z - c.pz
    var x1 = dx * c.cyw - dz * c.syw, z1 = dx * c.syw + dz * c.cyw
    var y2 = dy * c.ce + z1 * c.se, z2 = -dy * c.se + z1 * c.ce
    if (z2 < 0.25) return -1
    var sx = c.f * x1 / z2, sy = -c.f * y2 / z2
    out[o] = c.cx + sx * c.cr - sy * c.sr; out[o + 1] = c.cy + sx * c.sr + sy * c.cr
    return z2
  }
  var TMP2 = [0, 0]
  function projDir (c, x, y, z) { // direction at infinity
    var x1 = x * c.cyw - z * c.syw, z1 = x * c.syw + z * c.cyw
    var y2 = y * c.ce + z1 * c.se, z2 = -y * c.se + z1 * c.ce
    if (z2 < 0.05) return null
    var sx = c.f * x1 / z2, sy = -c.f * y2 / z2
    return [c.cx + sx * c.cr - sy * c.sr, c.cy + sx * c.sr + sy * c.cr]
  }
  // screen -> point on the sea plane (y = 0) or null
  function unproj (c, sx, sy) {
    var ox = sx - c.cx, oy = sy - c.cy
    var rx = ox * c.cr + oy * c.sr, ry = -ox * c.sr + oy * c.cr
    var x1 = rx / c.f, y2 = -ry / c.f, z2 = 1
    var dy = y2 * c.ce - z2 * c.se, z1 = y2 * c.se + z2 * c.ce
    if (dy > -1e-4) return null
    var dx = x1 * c.cyw + z1 * c.syw, dz = -x1 * c.syw + z1 * c.cyw
    var k = -c.py / dy
    return [c.px + dx * k, c.pz + dz * k, k]
  }

  /* ── meshes ──────────────────────────────────────────────────────────── */
  function Mesh () { return { v: [], vs: [], f: [] } }
  function addV (m, x, y, z, s) { m.v.push(x, y, z); m.vs.push(s || 0); return m.vs.length - 1 }
  function faceNormal (m, ids) {
    var v = m.v, a = ids[0] * 3, b = ids[1] * 3, c = ids[2] * 3
    var ux = v[b] - v[a], uy = v[b + 1] - v[a + 1], uz = v[b + 2] - v[a + 2]
    var wx = v[c] - v[a], wy = v[c + 1] - v[a + 1], wz = v[c + 2] - v[a + 2]
    return [uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx]
  }
  // add a face, wound so its normal points away from (cx, cy, cz)
  function addF (m, ids, col, sec, ctr, extra) {
    var n = faceNormal(m, ids), v = m.v, gx = 0, gy = 0, gz = 0
    for (var i = 0; i < ids.length; i++) { gx += v[ids[i] * 3]; gy += v[ids[i] * 3 + 1]; gz += v[ids[i] * 3 + 2] }
    gx /= ids.length; gy /= ids.length; gz /= ids.length
    if (n[0] * (gx - ctr[0]) + n[1] * (gy - ctr[1]) + n[2] * (gz - ctr[2]) < 0) ids = ids.slice().reverse()
    var f = { i: ids, c: col, s: sec || 0 }
    if (extra) for (var k in extra) f[k] = extra[k]
    m.f.push(f); return f
  }
  function box (m, x0, x1, y0, y1, z0, z1, col, sec, capZ, colTop) {
    var c = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], p = []
    for (var i = 0; i < 8; i++) p.push(addV(m, i & 1 ? x1 : x0, i & 2 ? y1 : y0, i & 4 ? z1 : z0, sec))
    var F = [[0, 1, 3, 2], [4, 5, 7, 6], [0, 1, 5, 4], [2, 3, 7, 6], [0, 2, 6, 4], [1, 3, 7, 5]]
    var out = []
    for (var k = 0; k < 6; k++) {
      if (k === 2) continue                      // bottom never seen
      var ids = [p[F[k][0]], p[F[k][1]], p[F[k][2]], p[F[k][3]]]
      var isCap = (k === 0 && capZ === z0) || (k === 1 && capZ === z1)
      out.push(addF(m, ids, k === 3 && colTop ? colTop : col, sec, c, isCap ? { cap: 1 } : null))
    }
    return out
  }
  function cylinder (m, cx, cz, r, y0, y1, rake, n, col, sec, topCol) {
    var lo = [], hi = [], ctr = [cx, (y0 + y1) / 2, cz + rake / 2]
    for (var i = 0; i < n; i++) {
      var a = i / n * TAU
      lo.push(addV(m, cx + cos(a) * r, y0, cz + sin(a) * r * 1.15, sec))
      hi.push(addV(m, cx + cos(a) * r, y1, cz + rake + sin(a) * r * 1.15, sec))
    }
    for (var j = 0; j < n; j++) { var k = (j + 1) % n; addF(m, [lo[j], lo[k], hi[k], hi[j]], col, sec, ctr) }
    if (topCol) addF(m, hi.slice(), topCol, sec, ctr)
  }
  function lineF (m, a, b, col, sec, extra) { var f = { i: [addV(m, a[0], a[1], a[2], sec), addV(m, b[0], b[1], b[2], sec)], c: col, s: sec, L2: 1 }; if (extra) for (var k in extra) f[k] = extra[k]; m.f.push(f) }

  /* The ship: RMS Titanic-like liner, bow +z, starboard +x, waterline y = 0. Two sections
     (0 = stern, 1 = bow) split at z = SPLIT so the break sequence can move them apart. */
  var SPLIT = -5.8
  var COL = { red: [150, 42, 34], black: [26, 27, 34], white: [232, 229, 218], deck: [172, 146, 104], buff: [214, 146, 58],
    ftop: [18, 18, 20], cap: [48, 36, 32], mast: [190, 176, 150], boat: [236, 234, 226] }
  function hb (z) {
    if (z > 18) { var k = (z - 18) / 12.5; return 3.5 * max(0, 1 - Math.pow(k, 1.7)) }
    if (z < -26) { var q = (z + 26) / 4.6; return 3.5 * sqrt(max(0, 1 - q * q)) }
    return 3.5
  }
  function sheer (z) { return 5 + 0.75 * (z / 30.5) * (z / 30.5) }
  var SHIP = null
  function buildShip () {
    if (SHIP) return SHIP
    var m = Mesh()
    var ZS = [[-30.5, -30.1, -29.2, -28, -26.5, -24, -18, -12, SPLIT], [SPLIT, 0, 6, 12, 18, 21, 24, 26.5, 28.6, 30.5]]
    for (var s = 0; s < 2; s++) {
      var zs = ZS[s], ctr = [0, 1, (zs[0] + zs[zs.length - 1]) / 2]
      // ring of plan points (starboard fwd, then port back)
      var plan = []
      for (var i = 0; i < zs.length; i++) plan.push([hb(zs[i]), zs[i]])
      for (var j = zs.length - 1; j >= 0; j--) { var w = hb(zs[j]); if (w > 0.01) plan.push([-w, zs[j]]) }
      var n = plan.length, bot = [], wl = [], top = []
      for (var p = 0; p < n; p++) {
        var x = plan[p][0], z = plan[p][1]
        bot.push(addV(m, x * 0.55, -3.2, z * 0.985, s))
        wl.push(addV(m, x * 0.97, 0.45, z, s))
        top.push(addV(m, x, sheer(z), z, s))
      }
      for (var e = 0; e < n; e++) {
        var f2 = (e + 1) % n, cap = plan[e][1] === SPLIT && plan[f2][1] === SPLIT
        var ex = cap ? { cap: 1 } : null
        addF(m, [bot[e], bot[f2], wl[f2], wl[e]], cap ? COL.cap : COL.red, s, ctr, ex)
        var fb = addF(m, [wl[e], wl[f2], top[f2], top[e]], cap ? COL.cap : COL.black, s, ctr, ex)
        if (!cap) { // portholes along the black band
          var ax = plan[e][0], az = plan[e][1], bx = plan[f2][0], bz = plan[f2][1], len = sqrt((bx - ax) * (bx - ax) + (bz - az) * (bz - az))
          var L = []
          for (var d = 0.6; d < len - 0.3; d += 1.25) {
            var k2 = d / len, lx = lerp(ax, bx, k2), lz = lerp(az, bz, k2), o = lx > 0 ? 0.05 : -0.05
            L.push(lx + o, 3.3, lz, lx + o, 2.1, lz)
          }
          if (L.length) fb.L = L
        }
      }
      // deck as strips between stations
      var nz = zs.length
      for (var t2 = 0; t2 < nz - 1; t2++) {
        var za = zs[t2], zb = zs[t2 + 1], wa = hb(za), wb = hb(zb)
        var q1 = addV(m, wa, sheer(za), za, s), q2 = addV(m, wb, sheer(zb), zb, s), q3 = addV(m, -wb, sheer(zb), zb, s), q4 = addV(m, -wa, sheer(za), za, s)
        addF(m, wa > 0.01 ? [q1, q2, q3, q4] : [q1, q2, q3], COL.deck, s, [0, -10, (za + zb) / 2])
      }
    }
    // superstructure, split at SPLIT
    function wins (faces, y0, y1, step) {
      for (var i = 0; i < faces.length; i++) {
        var f = faces[i]; if (f.cap) continue
        var v = m.v, a = f.i[0] * 3, b = f.i[1] * 3, c = f.i[2] * 3
        var xs = [v[a], v[b], v[c]], zz = [v[a + 2], v[b + 2], v[c + 2]]
        var xmin = min.apply(null, xs), xmax = max.apply(null, xs), zmin = min.apply(null, zz), zmax = max.apply(null, zz)
        if (xmax - xmin > 0.1) continue           // long sides only
        var L = []
        for (var z = zmin + 0.5; z < zmax - 0.3; z += step) for (var y = y0; y <= y1 + 0.01; y += 1.05) L.push(xmin + (xmin > 0 ? 0.05 : -0.05), y, z)
        if (L.length) f.L = L
      }
    }
    wins(box(m, -2.9, 2.9, 5.2, 8, -20, SPLIT, COL.white, 0, SPLIT, [205, 196, 170]), 6.1, 7.2, 1.1)
    wins(box(m, -2.9, 2.9, 5.2, 8, SPLIT, 17, COL.white, 1, SPLIT, [205, 196, 170]), 6.1, 7.2, 1.1)
    wins(box(m, -2.3, 2.3, 8, 9.4, -16, SPLIT, COL.white, 0, SPLIT, [196, 186, 160]), 8.7, 8.7, 1.4)
    wins(box(m, -2.3, 2.3, 8, 9.4, SPLIT, 13, COL.white, 1, SPLIT, [196, 186, 160]), 8.7, 8.7, 1.4)
    box(m, -2.7, 2.7, 8, 9.9, 13, 15.6, COL.white, 1, null, [196, 186, 160])
    // lifeboats on the boat deck
    var BZ = [[-15, -12.2, 0], [-10, -7.2, 0], [0, 2.8, 1], [7, 9.8, 1]]
    for (var bI = 0; bI < BZ.length; bI++) for (var sd = -1; sd <= 1; sd += 2) box(m, sd * 2.55 - 0.45, sd * 2.55 + 0.45, 9.4, 10.1, BZ[bI][0], BZ[bI][1], COL.boat, BZ[bI][2])
    // funnels (the 4th sits on the stern section)
    var FZ = [11, 4.5, -2, -9.6]
    for (var fI = 0; fI < 4; fI++) {
      var sec = FZ[fI] < SPLIT ? 0 : 1
      cylinder(m, 0, FZ[fI], 1.05, 9.3, 14.3, -0.75, 8, COL.buff, sec, null)
      cylinder(m, 0, FZ[fI] - 0.75, 1.06, 14.3, 15.5, -0.18, 8, COL.ftop, sec, [10, 10, 12])
    }
    // masts + stays (the long stay hides once the hull parts). Mast tops sit just above the funnel caps (15.5):
    // at the true height (21) the close impact camera framed the scene in a big wire triangle (owner review)
    var MF = 17.8, MA = 17.4
    lineF(m, [0, 5.4, 23.5], [0, MF, 23.1], COL.mast, 1)
    lineF(m, [0, 5.4, -24.5], [0, MA, -24.9], COL.mast, 0)
    lineF(m, [0, MF, 23.1], [0, 5.8, 29.6], COL.mast, 1)
    lineF(m, [0, MA, -24.9], [0, 5.8, -29.6], COL.mast, 0)
    lineF(m, [0, MF, 23.1], [0, MA, -24.9], COL.mast, 1, { wire: 1 })
    SHIP = m
    return m
  }
  var BERGS = {}
  function buildBerg (seed, R, H) {
    var id = seed + ':' + R + ':' + H
    if (BERGS[id]) return BERGS[id]
    var m = Mesh(), r = rng(seed)
    var W3 = [236, 246, 255], LB = [188, 222, 246], BL = [118, 172, 218], DB = [80, 132, 190]
    function cone (ox, oz, R0, H0, N) {
      var rings = [[-3.2, 1.1], [0, 1], [H0 * 0.26, 0.82], [H0 * 0.52, 0.58], [H0 * 0.78, 0.3]], ids = []
      for (var k = 0; k < rings.length; k++) {
        var row = []
        for (var i = 0; i < N; i++) {
          var a = i / N * TAU + (r() - 0.5) * 0.35, rr = R0 * rings[k][1] * (0.78 + r() * 0.42)
          row.push(addV(m, ox + cos(a) * rr, k > 1 ? rings[k][0] + (r() - 0.5) * H0 * 0.1 : rings[k][0], oz + sin(a) * rr, 0))
        }
        ids.push(row)
      }
      var pk = addV(m, ox + (r() - 0.5) * R0 * 0.35, H0, oz + (r() - 0.5) * R0 * 0.35, 0), ctr = [ox, H0 * 0.3, oz]
      for (var k2 = 0; k2 < rings.length - 1; k2++) {
        for (var j = 0; j < N; j++) {
          var jn = (j + 1) % N, hk = k2 / (rings.length - 1)
          var c1 = k2 === 0 ? DB : r() < 0.35 + hk * 0.4 ? W3 : r() < 0.6 ? LB : BL
          var c2 = k2 === 0 ? DB : r() < 0.3 + hk * 0.45 ? W3 : r() < 0.55 ? LB : BL
          addF(m, [ids[k2][j], ids[k2][jn], ids[k2 + 1][jn]], c1, 0, ctr)
          addF(m, [ids[k2][j], ids[k2 + 1][jn], ids[k2 + 1][j]], c2, 0, ctr)
        }
      }
      var last = ids[rings.length - 1]
      for (var q = 0; q < N; q++) addF(m, [last[q], last[(q + 1) % N], pk], r() < 0.7 ? W3 : LB, 0, ctr)
    }
    if (seed < 0) { cone(0, 0, R, H, 6); BERGS[id] = m; return m }
    cone(0, 0, R, H, 10)
    cone(R * 0.42, -R * 0.25, R * 0.55, H * 1.3, 8)
    cone(-R * 0.5, R * 0.2, R * 0.45, H * 0.75, 7)
    BERGS[id] = m
    return m
  }
  var FLOE = null
  function buildFloe () {
    if (FLOE) return FLOE
    var m = Mesh(), r = rng(99), N = 7, lo = [], hi = []
    for (var i = 0; i < N; i++) {
      var a = i / N * TAU + (r() - 0.5) * 0.4, rr = 0.75 + r() * 0.45
      lo.push(addV(m, cos(a) * rr, -0.35, sin(a) * rr, 0)); hi.push(addV(m, cos(a) * rr * 0.9, 0.38 + r() * 0.12, sin(a) * rr * 0.9, 0))
    }
    for (var j = 0; j < N; j++) addF(m, [lo[j], lo[(j + 1) % N], hi[(j + 1) % N], hi[j]], [170, 208, 236], 0, [0, 0, 0])
    addF(m, hi.slice(), [232, 244, 252], 0, [0, -5, 0])
    FLOE = m
    return m
  }

  /* ── transforms ─────────────────────────────────────────────────────── */
  // M = Ry(yaw) * Rx(pitch) * Rz(roll) * scale; world = M*p + t
  function xf (x, y, z, yaw, pitch, roll, s) {
    s = s || 1
    var cy = cos(yaw || 0), sy = sin(yaw || 0), cp = cos(pitch || 0), sp = sin(pitch || 0), cr = cos(roll || 0), sr = sin(roll || 0)
    // Rx*Rz
    var a = [cr, -sr, 0, cp * sr, cp * cr, -sp, sp * sr, sp * cr, cp]
    // Ry * a  (Ry = [cy,0,sy, 0,1,0, -sy,0,cy])
    var m = [cy * a[0] + sy * a[6], cy * a[1] + sy * a[7], cy * a[2] + sy * a[8],
      a[3], a[4], a[5],
      -sy * a[0] + cy * a[6], -sy * a[1] + cy * a[7], -sy * a[2] + cy * a[8]]
    for (var i = 0; i < 9; i++) m[i] *= s
    return { m: m, t: [x, y, z] }
  }
  function xfMul (A, B) { // A∘B
    var a = A.m, b = B.m, m = []
    for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) m[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c]
    var t = B.t
    return { m: m, t: [a[0] * t[0] + a[1] * t[1] + a[2] * t[2] + A.t[0], a[3] * t[0] + a[4] * t[1] + a[5] * t[2] + A.t[1], a[6] * t[0] + a[7] * t[1] + a[8] * t[2] + A.t[2]] }
  }
  function xfPt (X, x, y, z) { var m = X.m; return [m[0] * x + m[1] * y + m[2] * z + X.t[0], m[3] * x + m[4] * y + m[5] * z + X.t[1], m[6] * x + m[7] * y + m[8] * z + X.t[2]] }
  // ship pose -> per-section transforms. pose {x,y,z,yaw,pitch,roll, s0:{pitch,dy,dz}, s1:{...}}
  function shipXfs (pose) {
    var base = xf(pose.x, pose.y || 0, pose.z, pose.yaw, pose.pitch, pose.roll)
    var out = []
    for (var s = 0; s < 2; s++) {
      var sp = s === 0 ? pose.s0 : pose.s1
      if (!sp) { out.push(base); continue }
      // rotate about the break point (0, 0, SPLIT), then offset
      var R = xf(0, 0, 0, 0, sp.pitch || 0, sp.roll || 0)
      var pv = xfPt(R, 0, 0, SPLIT)
      R.t = [0, (sp.dy || 0), SPLIT - pv[2] + (sp.dz || 0)]
      R.t[1] += 0 - pv[1]
      out.push(xfMul(base, R))
    }
    return out
  }

  /* ── renderer (painter-sorted, lit, clipped at the waterline) ─────────── */
  function Renderer () {
    var items = [], used = 0
    var WX = [], WY = [], WZ = [], cx = [], cy2 = [], cz = [], tmp = [0, 0]
    var cam = null, light = null
    function item () { var it = items[used]; if (!it) it = items[used] = { p: [], n: 0, lp: [], ln: 0 }; used++; it.ln = 0; it.line = 0; return it }
    return {
      begin: function (c, l) { cam = c; light = l; used = 0 },
      // o: {clip, lights 0..1, split, flick, alpha}
      mesh: function (m, X, o) {
        o = o || {}
        if (o.r) { var cT = X.length ? X[0] : X, sc0 = [0, 0], dc = proj(cam, cT.t[0], cT.t[1], cT.t[2], sc0, 0), rr = o.r * cam.f / max(dc, 0.3)
          if (dc < 0 && o.r < 20) return
          if (dc > 0 && (sc0[0] < -rr || sc0[0] > cam.W + rr || sc0[1] < -rr || sc0[1] > cam.H + rr)) return }
        var v = m.v, vs = m.vs, nv = vs.length, i
        for (i = 0; i < nv; i++) {
          var T = X.length ? X[vs[i]] : X, M = T.m, x = v[i * 3], y = v[i * 3 + 1], z = v[i * 3 + 2]
          WX[i] = M[0] * x + M[1] * y + M[2] * z + T.t[0]
          WY[i] = M[3] * x + M[4] * y + M[5] * z + T.t[1]
          WZ[i] = M[6] * x + M[7] * y + M[8] * z + T.t[2]
        }
        var L = light.dir, tint = light.tint, fl = m.f, nf = fl.length
        for (var fi = 0; fi < nf; fi++) {
          var f = fl[fi], ids = f.i
          if (f.cap && !o.split) continue
          if (f.wire && o.split) continue
          if (f.L2) { // line
            var a = ids[0], b = ids[1]
            if (o.clip && (WY[a] < 0 || WY[b] < 0)) continue
            var it0 = item(), d1 = proj(cam, WX[a], WY[a], WZ[a], it0.p, 0), d2 = proj(cam, WX[b], WY[b], WZ[b], it0.p, 2)
            if (d1 < 0 || d2 < 0) { used--; continue }
            it0.line = 1; it0.n = 2; it0.d = (d1 + d2) / 2; it0.fill = rgba(mix3(f.c, [0, 0, 0], 0.35 - light.amb * 0.3), 0.8); it0.w = max(0.6, cam.f / it0.d * 0.12)
            continue
          }
          var A = ids[0], B = ids[1], C = ids[2]
          var ux = WX[B] - WX[A], uy = WY[B] - WY[A], uz = WZ[B] - WZ[A], wx = WX[C] - WX[A], wy = WY[C] - WY[A], wz = WZ[C] - WZ[A]
          var nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx
          if (nx * (cam.px - WX[A]) + ny * (cam.py - WY[A]) + nz * (cam.pz - WZ[A]) <= 0) continue
          var k = ids.length, ymin = 1e9, ymax = -1e9
          for (i = 0; i < k; i++) { var yy = WY[ids[i]]; if (yy < ymin) ymin = yy; if (yy > ymax) ymax = yy }
          if (o.clip && ymax <= 0) continue
          var np = 0
          if (o.clip && ymin < 0) { // Sutherland–Hodgman against y >= 0
            for (i = 0; i < k; i++) {
              var p = ids[i], q = ids[(i + 1) % k], pin = WY[p] >= 0, qin = WY[q] >= 0
              if (pin) { cx[np] = WX[p]; cy2[np] = WY[p]; cz[np] = WZ[p]; np++ }
              if (pin !== qin) { var tt = WY[p] / (WY[p] - WY[q]); cx[np] = lerp(WX[p], WX[q], tt); cy2[np] = 0; cz[np] = lerp(WZ[p], WZ[q], tt); np++ }
            }
          } else { for (i = 0; i < k; i++) { cx[i] = WX[ids[i]]; cy2[i] = WY[ids[i]]; cz[i] = WZ[ids[i]] } np = k }
          if (np < 3) continue
          var it = item(), dsum = 0, bad = false
          for (i = 0; i < np; i++) { var dd = proj(cam, cx[i], cy2[i], cz[i], it.p, i * 2); if (dd < 0) { bad = true; break } dsum += dd }
          if (bad) { used--; continue }
          it.n = np; it.d = dsum / np
          var bx0 = it.p[0], bx1 = it.p[0], by0 = it.p[1], by1 = it.p[1]
          for (i = 1; i < np; i++) { var qx = it.p[i * 2], qy = it.p[i * 2 + 1]; if (qx < bx0) bx0 = qx; if (qx > bx1) bx1 = qx; if (qy < by0) by0 = qy; if (qy > by1) by1 = qy }
          if (bx1 < -2 || bx0 > cam.W + 2 || by1 < -2 || by0 > cam.H + 2) { used--; continue }
          it.big = (bx1 - bx0) * (by1 - by0) > 900 ? 1 : 0
          var nl = sqrt(nx * nx + ny * ny + nz * nz) || 1
          var lam = (nx * L[0] + ny * L[1] + nz * L[2]) / nl
          var I = light.amb + light.dif * max(0, lam) + (light.rim || 0) * max(0, -lam) * 0.4
          var col = f.c
          it.fill = 'rgb(' + min(255, col[0] * tint[0] * I) + ',' + min(255, col[1] * tint[1] * I) + ',' + min(255, col[2] * tint[2] * I) + ')'
          it.a = o.alpha == null ? 1 : o.alpha
          // lit windows
          if (f.L && o.lights > 0.02) {
            var Tt = X.length ? X[f.s] : X, Mm = Tt.m, LL = f.L, ln = 0
            for (var li = 0; li < LL.length; li += 3) {
              var lx = LL[li], ly = LL[li + 1], lz = LL[li + 2]
              var gy = Mm[3] * lx + Mm[4] * ly + Mm[5] * lz + Tt.t[1]
              if (gy < 0.08) continue
              var gx = Mm[0] * lx + Mm[1] * ly + Mm[2] * lz + Tt.t[0], gz = Mm[6] * lx + Mm[7] * ly + Mm[8] * lz + Tt.t[2]
              var dl = proj(cam, gx, gy, gz, tmp, 0)
              if (dl < 0) continue
              if (o.flick && o.flick(li + fi * 7) < 0.5) continue
              it.lp[ln] = tmp[0]; it.lp[ln + 1] = tmp[1]; it.lp[ln + 2] = clamp(cam.f / dl * 0.2, 0.9, 4.5); ln += 3
            }
            it.ln = ln; it.la = o.lights
          }
        }
      },
      flush: function (ctx) {
        var list = items.slice(0, used)
        list.sort(function (a, b) { return b.d - a.d })
        ctx.lineJoin = 'round'
        for (var i = 0; i < list.length; i++) {
          var it = list[i], p = it.p
          if (it.line) { ctx.strokeStyle = it.fill; ctx.lineWidth = it.w; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[2], p[3]); ctx.stroke(); continue }
          if (it.a !== 1) ctx.globalAlpha = it.a
          ctx.fillStyle = it.fill
          ctx.beginPath(); ctx.moveTo(p[0], p[1])
          for (var j = 1; j < it.n; j++) ctx.lineTo(p[j * 2], p[j * 2 + 1])
          ctx.closePath(); ctx.fill()
          if (it.big) { ctx.strokeStyle = it.fill; ctx.lineWidth = 0.8; ctx.stroke() }
          if (it.ln) {
            var lp = it.lp, a = it.la
            ctx.globalAlpha = a * 0.2; ctx.fillStyle = '#ffcf6e'; ctx.beginPath()
            for (var q = 0; q < it.ln; q += 3) { var s = lp[q + 2]; ctx.rect(lp[q] - s * 1.3, lp[q + 1] - s * 1.3, s * 2.6, s * 2.6) }
            ctx.fill()
            ctx.globalAlpha = a; ctx.fillStyle = '#ffe7a6'; ctx.beginPath()
            for (var q2 = 0; q2 < it.ln; q2 += 3) { var s2 = lp[q2 + 2]; ctx.rect(lp[q2] - s2 / 2, lp[q2 + 1] - s2 / 2, s2, s2) }
            ctx.fill()
          }
          ctx.globalAlpha = 1
        }
        used = 0
      }
    }
  }

  /* ── sky / sea / glints / fog ────────────────────────────────────────── */
  var NIGHT = { skyTop: [4, 9, 26], skyHor: [34, 56, 100], seaHor: [30, 52, 88], seaNear: [4, 11, 28], glint: [175, 205, 245], stars: 1, moon: 1,
    haze: [58, 82, 126], hazeA: 0.55, light: { dir: [-0.45, 0.62, 0.64], amb: 0.36, dif: 0.8, rim: 0.45, tint: [0.62, 0.74, 1.05] } }
  var DAWN = { k: 1, skyTop: [44, 62, 128], skyHor: [252, 176, 116], seaHor: [176, 128, 128], seaNear: [22, 38, 70], glint: [255, 210, 160], stars: 0, moon: 0.15,
    haze: [246, 180, 146], hazeA: 0.45, light: { dir: [0.7, 0.35, 0.62], amb: 0.46, dif: 0.62, rim: 0.2, tint: [1.02, 0.86, 0.78] } }
  function mixLook (a, b, k) {
    if (k <= 0) return a; if (k >= 1) return b
    return { k: k, skyTop: mix3(a.skyTop, b.skyTop, k), skyHor: mix3(a.skyHor, b.skyHor, k), seaHor: mix3(a.seaHor, b.seaHor, k), seaNear: mix3(a.seaNear, b.seaNear, k),
      glint: mix3(a.glint, b.glint, k), stars: lerp(a.stars, b.stars, k), moon: lerp(a.moon, b.moon, k), haze: mix3(a.haze, b.haze, k), hazeA: lerp(a.hazeA, b.hazeA, k),
      light: { dir: mix3(a.light.dir, b.light.dir, k), amb: lerp(a.light.amb, b.light.amb, k), dif: lerp(a.light.dif, b.light.dif, k), rim: lerp(a.light.rim, b.light.rim, k), tint: mix3(a.light.tint, b.light.tint, k) } }
  }
  var SPR = null
  function sprites () {
    if (SPR) return SPR
    var r = rng(7), st = mkCanvas(1400, 520), g = st.getContext('2d')
    for (var i = 0; i < 420; i++) {
      var x = r() * 1400, y = Math.pow(r(), 1.3) * 520, s = r() < 0.08 ? 1.9 : r() < 0.4 ? 1.2 : 0.8
      g.fillStyle = r() < 0.2 ? 'rgba(190,215,255,' + (0.5 + r() * 0.5) + ')' : 'rgba(255,255,255,' + (0.35 + r() * 0.65) + ')'
      g.beginPath(); g.arc(x, 520 - y, s, 0, TAU); g.fill()
    }
    var glow = mkCanvas(256, 256), gg = glow.getContext('2d'), rg = gg.createRadialGradient(128, 128, 0, 128, 128, 128)
    rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.25, 'rgba(255,255,255,.35)'); rg.addColorStop(1, 'rgba(255,255,255,0)')
    gg.fillStyle = rg; gg.fillRect(0, 0, 256, 256)
    var moon = mkCanvas(128, 128), mg = moon.getContext('2d'), m2 = mg.createRadialGradient(54, 52, 4, 64, 64, 60)
    m2.addColorStop(0, '#fffdf2'); m2.addColorStop(0.8, '#efe9d6'); m2.addColorStop(1, '#d8d2c0')
    mg.fillStyle = m2; mg.beginPath(); mg.arc(64, 64, 60, 0, TAU); mg.fill()
    mg.fillStyle = 'rgba(160,160,150,.28)'
    var cr = [[44, 50, 11], [80, 72, 14], [60, 90, 8], [86, 40, 6], [40, 82, 6]]
    for (var c = 0; c < cr.length; c++) { mg.beginPath(); mg.arc(cr[c][0], cr[c][1], cr[c][2], 0, TAU); mg.fill() }
    SPR = { stars: st, glow: glow, moon: moon }
    freeze(glow, SPR, 'glow'); freeze(moon, SPR, 'moon')
    return SPR
  }
  // world-anchored sparkles on the sea (respawned in screen space, drawn in world space)
  function Glints (n) { var a = []; for (var i = 0; i < n; i++) a.push({ x: 0, z: 0, age: 9, max: 1, len: 1, sw: 0 }); return a }
  function drawSea (ctx, env, cam, look, opt) {
    opt = opt || {}
    var w = env.w, h = env.h, S = sprites()
    var top = cam.el > 1.35
    var hy = -cam.f * Math.tan(cam.el)  // horizon, relative to centre, in the rolled frame
    var rot = cam.roll + env.shakeV[2]
    var md = opt.moonDir || [-0.42, 0.34, 0.84], mp = !top && look.moon > 0.01 ? projDir(cam, md[0], md[1], md[2]) : null
    // sky + sea gradients + stars live in a compositor-only DOM layer (see skyLayer in play())
    env.skyReq = { x: cam.cx, y: cam.cy + hy * cos(rot), rot: rot, k: look.k || 0, stars: look.stars, sx: -cam.yaw * cam.f }
    if (mp) {
      var ms = cam.f * 0.07 * (opt.moonScale || 1)
      ctx.globalAlpha = 0.5 * look.moon; ctx.drawImage(S.glow, mp[0] - ms * 2.4, mp[1] - ms * 2.4, ms * 4.8, ms * 4.8)
      ctx.globalAlpha = look.moon; ctx.drawImage(S.moon, mp[0] - ms / 2, mp[1] - ms / 2, ms, ms)
      ctx.globalAlpha = 1
    }
    ctx.save(); ctx.translate(cam.cx, cam.cy); ctx.rotate(rot)
    if (mp && !top) { // moon path: shimmering dashes under the moon
      var ux = (mp[0] - cam.cx) * cos(-cam.roll) - (mp[1] - cam.cy) * sin(-cam.roll)
      ctx.globalCompositeOperation = 'lighter'
      var rows = Math.round(34 * env.q), tb = Math.floor(env.now * 6)
      for (var j = 0; j < rows; j++) {
        var k = j / rows, yy = hy + 2 + Math.pow(k, 1.7) * h * 0.95, spread = 6 + k * cam.f * 0.16
        var hh = hash(j * 13.7 + tb * 0.31), wv = (0.25 + hh * 0.75) * spread
        ctx.fillStyle = rgba(look.glint, (0.1 + 0.3 * hh) * look.moon * (1 - k * 0.6))
        ctx.fillRect(ux + (hash(j + tb) - 0.5) * spread * 0.9 - wv / 2, yy, wv, 1 + k * 3)
      }
      ctx.globalCompositeOperation = 'source-over'
    }
    ctx.restore()
    // glints
    var G = env.s.glints || (env.s.glints = Glints(Math.round(200 * env.q)))
    var dt = env.rdt, t2 = [0, 0], top0 = top ? 0 : max(0, cam.cy + hy * cam.cr + 3)
    ctx.lineCap = 'butt'
    var paths = [[], [], []]
    for (var i = 0; i < G.length; i++) {
      var gl = G[i]
      gl.age += dt
      if (gl.age > gl.max) {
        var gp = unproj(cam, Math.random() * w, top0 + Math.random() * (h - top0))
        if (!gp || gp[2] > 900) { gl.age = gl.max - 0.1; continue }
        gl.x = gp[0]; gl.z = gp[1]; gl.age = 0; gl.max = 1.2 + Math.random() * 2.2
        gl.sw = Math.random() < 0.22 ? 1 : 0
        gl.len = gl.sw ? 5 + Math.random() * 6 : 0.7 + Math.random() * 1.3
      }
      var a = sin(PI * gl.age / gl.max)
      var da = proj(cam, gl.x - gl.len / 2, 0, gl.z, t2, 0)
      if (da < 0) { gl.age = 99; continue }
      var x1 = t2[0], y1 = t2[1]
      if (proj(cam, gl.x + gl.len / 2, 0, gl.z, t2, 0) < 0) { gl.age = 99; continue }
      if (x1 < -40 || x1 > w + 40 || y1 < -20 || y1 > h + 20) { gl.age = 99; continue }
      paths[gl.sw ? 0 : a > 0.6 ? 2 : 1].push(x1, y1, t2[0], t2[1])
    }
    var alphas = [0.09, 0.2, 0.4], widths = [1.6, 1.1, 1.3]
    for (var b = 0; b < 3; b++) {
      var P = paths[b]; if (!P.length) continue
      ctx.strokeStyle = rgba(look.glint, alphas[b] * (opt.glint || 1)); ctx.lineWidth = widths[b]
      ctx.beginPath()
      for (var q = 0; q < P.length; q += 4) { ctx.moveTo(P[q], P[q + 1]); ctx.lineTo(P[q + 2], P[q + 3]) }
      ctx.stroke()
    }
    return hy
  }
  function drawHaze (ctx, env, cam, look, amt) {
    if (cam.el > 1.35) return
    var hy = cam.cy - cam.f * Math.tan(cam.el), h = env.h, a = look.hazeA * amt
    // stepped haze band (solid fills are cheap on software rasterisers; gradients are not)
    var B = [[-0.1, 0.04, 0.18], [-0.05, 0.05, 0.3], [-0.02, 0.035, 0.42], [0.005, 0.05, 0.3], [0.04, 0.05, 0.15]]
    for (var i = 0; i < B.length; i++) { ctx.fillStyle = rgba(look.haze, a * B[i][2]); ctx.fillRect(0, hy + B[i][0] * h, env.w, B[i][1] * h) }
    // drifting fog banks anchored to the camera heading (parallax)
    var n = Math.round(6 * env.q)
    ctx.fillStyle = rgba(look.haze, 0.07 * amt)
    for (var j = 0; j < n; j++) {
      var bx = ((j * 331 - cam.yaw * cam.f * 0.9 + env.now * (8 + j * 2)) % (env.w * 1.6) + env.w * 1.6) % (env.w * 1.6) - env.w * 0.3
      var bw = env.w * (0.3 + hash(j) * 0.25)
      ctx.beginPath(); ctx.ellipse(bx, hy + hash(j + 3) * 16 - 4, bw / 2, bw * 0.045, 0, 0, TAU); ctx.fill()
    }
  }
  function vignette (ctx, env, amt) { env.vigA = amt == null ? 1 : amt }   // painted by a DOM layer (compositor only)

  /* ── particles (world space) ─────────────────────────────────────────── */
  function Parts () { return [] }
  function emit (P, env, kind, x, y, z, n, spread, vel) {
    n = Math.max(1, Math.round(n * (env.rm ? 0.4 : 1) * env.q))
    for (var i = 0; i < n; i++) {
      var r = Math.random, a = r() * TAU
      P.push({ k: kind, x: x + (r() - 0.5) * spread, y: y + r() * spread * 0.3, z: z + (r() - 0.5) * spread,
        vx: vel[0] + cos(a) * vel[3] * r(), vy: vel[1] + r() * vel[4], vz: vel[2] + sin(a) * vel[3] * r(),
        age: 0, max: kind === 'smoke' ? 2.4 + r() * 1.2 : kind === 'ice' ? 1.6 + r() : kind === 'foam' ? 2.5 + r() * 2 : kind === 'spark' ? 0.35 + r() * 0.3 : 1 + r() * 0.8,
        s: kind === 'ice' ? 0.25 + r() * 0.5 : kind === 'smoke' ? 1.2 + r() : kind === 'foam' ? 0.6 + r() * 1.2 : 0.15 + r() * 0.2, rot: r() * TAU, vr: (r() - 0.5) * 8 })
    }
    if (P.length > 500) P.splice(0, P.length - 500)
  }
  function drawParts (ctx, env, cam, P, look) {
    var dt = env.dt, t2 = [0, 0], j = 0, spray = [], ice = [], rest = []
    for (var i = 0; i < P.length; i++) {
      var p = P[i]
      p.age += dt
      if (p.age > p.max) continue
      if (p.k === 'smoke') { p.vy += 0.3 * dt; p.s += dt * 0.9 } else if (p.k !== 'foam') p.vy -= 9.8 * dt
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rot += p.vr * dt
      if (p.y < 0 && p.k !== 'foam') { if (p.k === 'ice' && p.vy < -2) { p.vy *= -0.2; p.vx *= 0.5; p.vz *= 0.5; p.y = 0.02 } else if (p.k !== 'ice') continue }
      P[j++] = p
      var d = proj(cam, p.x, p.y, p.z, t2, 0)
      if (d < 0 || t2[0] < -20 || t2[0] > env.w + 20 || t2[1] < -20 || t2[1] > env.h + 20) continue
      var s = max(0.7, cam.f * p.s / d)
      if (p.k === 'spray') spray.push(t2[0], t2[1], s)
      else if (p.k === 'ice') ice.push(t2[0], t2[1], s, p.rot)
      else rest.push(p, t2[0], t2[1], s)
    }
    P.length = j
    if (spray.length) { // one path per kind: cheap on software rasterisers
      ctx.fillStyle = 'rgba(225,238,255,.5)'; ctx.beginPath()
      for (var a = 0; a < spray.length; a += 3) ctx.rect(spray[a] - spray[a + 2] / 2, spray[a + 1] - spray[a + 2] / 2, spray[a + 2], spray[a + 2])
      ctx.fill()
    }
    if (ice.length) {
      ctx.fillStyle = 'rgba(220,240,255,.9)'; ctx.beginPath()
      for (var b = 0; b < ice.length; b += 4) {
        var x = ice[b], y = ice[b + 1], z = ice[b + 2], r = ice[b + 3]
        ctx.moveTo(x + cos(r) * z, y + sin(r) * z); ctx.lineTo(x + cos(r + 2.3) * z * 0.8, y + sin(r + 2.3) * z * 0.8); ctx.lineTo(x + cos(r + 4.1) * z * 0.6, y + sin(r + 4.1) * z * 0.6); ctx.closePath()
      }
      ctx.fill()
    }
    for (var c = 0; c < rest.length; c += 4) {
      var q = rest[c], px = rest[c + 1], py = rest[c + 2], sz = rest[c + 3], al = 1 - q.age / q.max
      if (q.k === 'smoke') {
        ctx.globalAlpha = 0.18 * al * (look ? 0.4 + look.light.amb : 1); ctx.drawImage(sprites().glow, px - sz, py - sz, sz * 2, sz * 2); ctx.globalAlpha = 1
      } else if (q.k === 'foam') {
        ctx.strokeStyle = rgba([220, 235, 255], 0.35 * al); ctx.lineWidth = 1
        ctx.beginPath(); ctx.ellipse(px, py, sz * (1 + q.age), sz * 0.25 * (1 + q.age), 0, 0, TAU); ctx.stroke()
      } else if (q.k === 'spark') {
        ctx.strokeStyle = rgba([255, 205, 120], al); ctx.lineWidth = 1.2
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - q.vx * 0.6, py + q.vy * 0.6); ctx.stroke()
      }
    }
  }
  // screen-space drifting snow / ice dust with camera parallax
  function drawDrift (ctx, env, cam, amt) {
    var s = env.s, n = Math.round(46 * env.q * (env.rm ? 0.5 : 1))
    if (!s.drift) { s.drift = []; for (var i = 0; i < n; i++) s.drift.push([Math.random() * env.w, Math.random() * env.h, 0.4 + Math.random() * 1.2]) }
    var dyaw = s.lastYaw == null ? 0 : cam.yaw - s.lastYaw
    if (abs(dyaw) > 0.5) dyaw = 0
    s.lastYaw = cam.yaw
    ctx.fillStyle = 'rgba(230,240,255,' + (0.5 * amt).toFixed(3) + ')'
    for (var j = 0; j < s.drift.length; j++) {
      var d = s.drift[j]
      d[0] += (-dyaw * cam.f * d[2] * 0.6) + sin(env.now * 0.7 + j) * 6 * env.rdt * d[2]
      d[1] += 14 * env.rdt * d[2]
      if (d[1] > env.h) d[1] -= env.h; if (d[0] < 0) d[0] += env.w; if (d[0] > env.w) d[0] -= env.w
      ctx.fillRect(d[0], d[1], d[2] * 1.4, d[2] * 1.4)
    }
  }

  /* ── WebAudio (original synthesis only) ──────────────────────────────── */
  function Audio (muted) {
    var AC = W.AudioContext || W.webkitAudioContext, stub = { mix: function () {}, cue: function () {}, setMuted: function () {}, suspend: function () {}, resume: function () {}, close: function () {} }
    if (!AC) return stub
    var ac
    try { ac = new AC() } catch (e) { return stub }
    var master = ac.createGain(); master.gain.value = muted ? 0 : 0.85; master.connect(ac.destination)
    var nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), nd = nb.getChannelData(0), last = 0
    for (var i = 0; i < nd.length; i++) { var wv = Math.random() * 2 - 1; last = (last + 0.02 * wv) / 1.02; nd[i] = wv * 0.5 + last * 3 }
    function noise () { var s = ac.createBufferSource(); s.buffer = nb; s.loop = true; return s }
    function gain (v, to) { var g = ac.createGain(); g.gain.value = v; if (to) g.connect(to); return g }
    function filt (type, f, q, to) { var b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q) b.Q.value = q; if (to) b.connect(to); return b }
    // ocean bed
    var oceanG = gain(0, master), ol = filt('lowpass', 420, 0.5, oceanG), on = noise(); on.connect(ol); on.start()
    var lfo = ac.createOscillator(), lg = gain(0.18); lfo.frequency.value = 0.11; lfo.connect(lg); lg.connect(oceanG.gain); lfo.start()
    // engine hum
    var engG = gain(0, master), el = filt('lowpass', 150, 1, engG)
    var e1 = ac.createOscillator(), e2 = ac.createOscillator(); e1.type = 'sawtooth'; e2.type = 'sine'; e1.frequency.value = 41; e2.frequency.value = 82
    var e1g = gain(0.5, el), e2g = gain(0.6, el); e1.connect(e1g); e2.connect(e2g); e1.start(); e2.start()
    // soft pad
    var musG = gain(0, master), ml = filt('lowpass', 900, 0.4, musG), pads = []
    var CH = [220, 261.63, 329.63, 392]
    for (var p = 0; p < CH.length; p++) { var o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = CH[p]; o.detune.value = (p - 1.5) * 4; var og = gain(0.05, ml); o.connect(og); o.start(); pads.push(o) }
    var cur = { ocean: 0, engine: 0, music: 0, pitch: 1 }
    function ramp (param, v, tc) { var t = ac.currentTime; param.cancelScheduledValues(t); param.setTargetAtTime(v, t, tc || 0.6) }
    function env (g, a, h, r, peak) { var t = ac.currentTime; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.setValueAtTime(peak, t + a + h); g.gain.exponentialRampToValueAtTime(0.0001, t + a + h + r); return t + a + h + r + 0.1 }
    var CUES = {
      scrape: function () {
        var g = gain(0, master), bp = filt('bandpass', 170, 2.5, g), n = noise(); n.connect(bp); n.start()
        var g2 = gain(0, master), bp2 = filt('bandpass', 950, 9, g2), n2 = noise(); n2.connect(bp2); n2.start()
        var o = ac.createOscillator(); o.frequency.value = 36; var og = gain(0, master); o.connect(og); o.start()
        o.frequency.setTargetAtTime(28, ac.currentTime, 1.2)
        var end = env(g, 0.15, 1.6, 1.4, 0.55); env(g2, 0.2, 1.2, 1.2, 0.05); env(og, 0.1, 1.4, 1.5, 0.35)
        n.stop(end); n2.stop(end); o.stop(end)
      },
      thud: function () { var o = ac.createOscillator(); o.frequency.value = 62; o.frequency.exponentialRampToValueAtTime(28, ac.currentTime + 0.7); var g = gain(0, master); o.connect(g); o.start(); o.stop(env(g, 0.02, 0.1, 0.8, 0.5)) },
      creak: function () {
        var o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 130 + Math.random() * 40
        o.frequency.exponentialRampToValueAtTime(78, ac.currentTime + 1.1)
        var g = gain(0, master), bp = filt('bandpass', 420, 12, g); o.connect(bp); o.start(); o.stop(env(g, 0.15, 0.5, 0.7, 0.16))
      },
      horn: function () {
        var g = gain(0, null), lp = filt('lowpass', 380, 0.7, g), dl = ac.createDelay(); dl.delayTime.value = 0.42
        var fb = gain(0.32); g.connect(master); g.connect(dl); dl.connect(fb); fb.connect(dl); fb.connect(master)
        var a = ac.createOscillator(), b = ac.createOscillator(); a.type = b.type = 'sawtooth'; a.frequency.value = 98; b.frequency.value = 123.5
        a.connect(lp); b.connect(lp); a.start(); b.start()
        var end = env(g, 0.5, 1.9, 1.3, 0.16); a.stop(end); b.stop(end)
      },
      bell: function () {
        var o = ac.createOscillator(), o2 = ac.createOscillator(); o.frequency.value = 1320; o2.frequency.value = 1320 * 2.76
        var g = gain(0, master); o.connect(g); var g2 = gain(0.25, g); o2.connect(g2); o.start(); o2.start(); var end = env(g, 0.005, 0.02, 0.9, 0.12); o.stop(end); o2.stop(end)
      },
      whoosh: function () { var n = noise(), g = gain(0, master), bp = filt('bandpass', 400, 1.2, g); bp.frequency.exponentialRampToValueAtTime(1600, ac.currentTime + 0.8); n.connect(bp); n.start(); n.stop(env(g, 0.3, 0.1, 0.6, 0.12)) },
      splash: function () { var n = noise(), g = gain(0, master), lp = filt('lowpass', 1200, 0.7, g); n.connect(lp); n.start(); n.stop(env(g, 0.03, 0.05, 0.9, 0.2)) },
      pop: function () { var o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = 520; o.frequency.exponentialRampToValueAtTime(880, ac.currentTime + 0.12); var g = gain(0, master); o.connect(g); o.start(); o.stop(env(g, 0.005, 0.03, 0.2, 0.09)) }
    }
    return {
      mix: function (m) {
        if (!m) return
        if (m.ocean != null) { cur.ocean = m.ocean; ramp(oceanG.gain, m.ocean * 0.5, 0.9) }
        if (m.engine != null) { cur.engine = m.engine; ramp(engG.gain, m.engine * 0.32, 0.9) }
        if (m.pitch != null) { ramp(e1.frequency, 41 * m.pitch, 1.2); ramp(e2.frequency, 82 * m.pitch, 1.2) }
        if (m.music != null) { cur.music = m.music; ramp(musG.gain, m.music * 0.55, m.music < cur.music ? 0.5 : 1.4) }
        if (m.chord) for (var i = 0; i < pads.length && i < m.chord.length; i++) ramp(pads[i].frequency, m.chord[i], 1.5)
      },
      cue: function (n) { try { if (CUES[n]) CUES[n]() } catch (e) {} },
      setMuted: function (v) { ramp(master.gain, v ? 0 : 0.85, 0.1) },
      suspend: function () { try { ac.suspend() } catch (e) {} },
      resume: function () { try { ac.resume() } catch (e) {} },
      close: function () { try { ac.close() } catch (e) {} },
      ctx: ac
    }
  }

  // muted players never open an AudioContext; the first unmute creates it
  function LazyAudio (muted) {
    var real = muted ? null : Audio(false), last = {}
    function remember (m) { if (m) for (var k in m) last[k] = m[k] }
    return {
      mix: function (m) { remember(m); if (real) real.mix(m) },
      cue: function (n) { if (real) real.cue(n) },
      setMuted: function (v) { if (!v && !real) { real = Audio(false); real.mix(last) } else if (real) real.setMuted(v) },
      suspend: function () { if (real) real.suspend() },
      resume: function () { if (real) real.resume() },
      close: function () { if (real) real.close(); real = null }
    }
  }

  /* ── DOM ─────────────────────────────────────────────────────────────── */
  var CSS_ID = 'tkc-css'
  function css () {
    if (D.getElementById(CSS_ID)) return
    var s = D.createElement('style'); s.id = CSS_ID
    var base = (W.TKArt && W.TKArt.BASE) || '../'
    s.textContent =
      "@font-face{font-family:'Fredoka One';src:url('" + base + "assets/spelling/fonts/fredoka-one.ttf') format('truetype');font-display:swap}" +
      '.tkc{--rim:rgba(120,190,255,.45);--ease:cubic-bezier(.23,1,.32,1);position:absolute;inset:0;overflow:hidden;background:#02040c;font-family:Nunito,"Segoe UI",system-ui,sans-serif;color:#F4F7FF;-webkit-user-select:none;user-select:none;touch-action:manipulation;z-index:40}' +
      '.tkc canvas{position:absolute;inset:0;width:100%;height:100%;display:block}' +
      '.tkc-sky,.tkc-img{position:absolute;display:none;pointer-events:none;will-change:transform}.tkc-sky>div{position:absolute;left:0;top:0;width:100%;height:100%}.tkc-d{opacity:0}.tkc-st{background-repeat:repeat-x;will-change:transform,opacity}.tkc-img{background:#1a1320 center/cover no-repeat}' +
      '.tkc-vig,.tkc-fade{position:absolute;inset:0;pointer-events:none;will-change:opacity}.tkc-vig{background:radial-gradient(ellipse at center,rgba(0,0,0,0) 46%,rgba(0,0,8,.72) 100%)}.tkc-fade{background:#02040c;opacity:0}' +
      '.tkc .fk,.tkc-card b,.tkc-who,.tkc-chip,.tkc-load b{font-family:"Fredoka One",Nunito,sans-serif;font-weight:400;letter-spacing:.3px}' +
      '.tkc-sub{position:absolute;left:50%;bottom:calc(14px + env(safe-area-inset-bottom));transform:translate(-50%,10px);max-width:min(880px,calc(100% - 24px));width:max-content;box-sizing:border-box;padding:10px 18px 12px;border-radius:16px;background:linear-gradient(180deg,rgba(24,44,96,.9),rgba(11,24,58,.9));border:2px solid var(--rim);box-shadow:0 8px 22px rgba(0,0,0,.4);font-size:clamp(16px,2.3vw,22px);line-height:1.38;font-weight:800;text-align:center;opacity:0;transition:opacity .32s var(--ease),transform .38s var(--ease);pointer-events:none;text-wrap:balance}' +
      '.tkc-sub.on{opacity:1;transform:translate(-50%,0)}' +
      '.tkc-who{display:inline-block;margin:0 8px 0 0;padding:3px 12px 2px;border-radius:10px;font-size:.78em;vertical-align:1px;background:linear-gradient(#FBF0D2,#EAD39C);color:#5a3a12;border:2px solid #B58B45;box-shadow:0 2px 0 rgba(0,0,0,.3)}' +
      '.tkc-ctl{position:absolute;top:calc(10px + env(safe-area-inset-top));right:calc(10px + env(safe-area-inset-right));display:flex;gap:8px;z-index:3}' +
      '.tkc-ctl button{height:52px;min-width:52px;padding:0;border-radius:14px;border:2px solid var(--rim);background:linear-gradient(#1F3A7A,#0F2150);color:#fff;font:900 17px Nunito,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;box-shadow:0 3px 0 rgba(0,0,0,.4);transition:transform .12s var(--ease)}' +
      '.tkc-ctl button:active{transform:scale(.94)}.tkc-ctl button svg{width:22px;height:22px;fill:currentColor}.tkc-ctl button span{display:none}' +
      '.tkc-ctl .tkc-skip{padding:0 18px;border:0;border-radius:16px;background:linear-gradient(#FFE15A,#F2B01E);color:#3a2600;box-shadow:0 4px 0 #A86F0A,0 8px 18px rgba(0,0,0,.35);font-family:"Fredoka One",Nunito,sans-serif;font-weight:400;font-size:19px}' +
      '.tkc-ctl .tkc-skip span{display:inline}' +
      '.tkc-card{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%) scale(.96);text-align:center;opacity:0;transition:opacity .6s ease,transform .8s var(--ease);pointer-events:none;width:min(92%,640px);padding:18px 22px 20px;border-radius:20px;background:linear-gradient(#FBF0D2,#EAD39C);border:3px solid #B58B45;box-shadow:0 10px 30px rgba(0,0,0,.45);box-sizing:border-box}' +
      '.tkc-card.on{opacity:1;transform:translate(-50%,-50%) scale(1)}' +
      '.tkc-card b{display:block;font-size:clamp(28px,5.6vw,52px);color:#5a3a12;text-shadow:0 2px 0 rgba(255,255,255,.6)}' +
      '.tkc-card i{display:block;margin-top:6px;font-style:normal;font-weight:800;font-size:clamp(15px,2.2vw,19px);color:#7a5424}' +
      '.tkc-chip{position:absolute;left:50%;top:22%;transform:translate(-50%,-6px) scale(.9);padding:8px 24px 10px;border-radius:18px;background:linear-gradient(#FFE15A,#F2B01E);color:#3a2600;font-size:clamp(24px,4.2vw,36px);box-shadow:0 5px 0 #A86F0A,0 10px 24px rgba(0,0,0,.35);opacity:0;transition:opacity .3s,transform .45s cubic-bezier(.2,1.4,.4,1);pointer-events:none;white-space:nowrap}' +
      '.tkc-chip.on{opacity:1;transform:translate(-50%,0) scale(1)}' +
      '.tkc-load{position:absolute;inset:0;display:grid;place-items:center;background:#050b1e;z-index:5;transition:opacity .35s ease}.tkc-load.off{opacity:0;pointer-events:none}' +
      '.tkc-load b{font-size:24px;color:#FFE15A}.tkc-load i{display:block;width:180px;height:10px;margin-top:12px;border-radius:6px;background:rgba(255,255,255,.12);border:2px solid var(--rim);overflow:hidden}.tkc-load i::after{content:"";display:block;height:100%;width:var(--p,0%);background:linear-gradient(90deg,#5AA2FF,#FFE15A);transition:width .2s}' +
      '.tkc-q{position:absolute;inset:0;display:grid;place-items:center;background:rgba(5,10,30,.55);z-index:4;animation:tkc-in .3s var(--ease)}' +
      '@keyframes tkc-in{from{opacity:0}to{opacity:1}}' +
      '.tkc-qb{width:min(92%,560px);padding:22px 20px;border-radius:20px;background:linear-gradient(180deg,rgba(24,44,96,.97),rgba(11,24,58,.97));border:2px solid var(--rim);box-shadow:0 12px 40px rgba(0,0,0,.45);text-align:center;box-sizing:border-box;animation:tkc-up .38s var(--ease)}' +
      '@keyframes tkc-up{from{transform:translateY(14px) scale(.97)}to{transform:none}}' +
      '.tkc-qb p{margin:0 0 16px;font-size:clamp(18px,2.6vw,24px);font-weight:800;line-height:1.35}' +
      '.tkc-qb div{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}' +
      '.tkc-qb button{min-width:88px;height:72px;border-radius:18px;border:0;background:linear-gradient(#5AA2FF,#1F63D6);color:#fff;font:400 34px "Fredoka One",Nunito,sans-serif;box-shadow:0 5px 0 #103A88;cursor:pointer;transition:transform .12s var(--ease)}' +
      '.tkc-qb button:active{transform:scale(.96)}.tkc-qb button.no{opacity:.45;animation:tkc-wig .35s}.tkc-qb button.ok{background:linear-gradient(#FFE15A,#F2B01E);color:#3a2600;box-shadow:0 5px 0 #A86F0A}' +
      '.tkc-qb em{display:block;margin-top:12px;font-style:normal;font-weight:800;color:#FFE15A;min-height:1.3em}' +
      '@keyframes tkc-wig{25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}' +
      '@media (max-width:520px){.tkc-sub{bottom:calc(10px + env(safe-area-inset-bottom));padding:9px 14px 10px}.tkc-ctl button{height:48px;min-width:48px}}' +
      '@media (prefers-reduced-motion:reduce){.tkc-sub,.tkc-card,.tkc-chip{transition:opacity .4s ease}.tkc-qb,.tkc-q{animation:none}}'
    D.head.appendChild(s)
  }
  var ICON = {
    pause: '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1.5"/><rect x="14" y="5" width="4" height="14" rx="1.5"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.2-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
    replay: '<svg viewBox="0 0 24 24"><path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/></svg>',
    skip: '<svg viewBox="0 0 24 24"><path d="M5 6.2v11.6a1 1 0 0 0 1.6.8l7.4-5.8a1 1 0 0 0 0-1.6L6.6 5.4A1 1 0 0 0 5 6.2zM16 6h2.5v12H16z"/></svg>'
  }

  /* ── the player ──────────────────────────────────────────────────────── */
  function play (host, seq, opts) {
    opts = opts || {}
    css()
    var root = D.createElement('div'); root.className = 'tkc'
    root.innerHTML = '<div class="tkc-sky"><div class="tkc-n"></div><div class="tkc-d"></div><div class="tkc-st"></div></div><div class="tkc-img"></div><canvas></canvas><div class="tkc-vig"></div><div class="tkc-fade"></div><div class="tkc-card"><b></b><i></i></div><div class="tkc-chip"></div>' +
      '<div class="tkc-sub" aria-live="polite"><span class="tkc-who"></span><span class="tkc-txt"></span></div>' +
      (opts.controls === false ? '' : '<div class="tkc-ctl"><button class="tkc-pause" aria-label="Jeda">' + ICON.pause + '<span>Jeda</span></button>' +
      '<button class="tkc-replay" aria-label="Ulangi adegan">' + ICON.replay + '<span>Ulangi</span></button>' +
      '<button class="tkc-skip" aria-label="Lewati adegan"><span>Lewati</span>' + ICON.skip + '</button></div>') +
      '<div class="tkc-load"><div style="text-align:center"><b>Memuat…</b><i></i></div></div>'
    host.appendChild(root)
    var cv = root.querySelector('canvas'), ctx = cv.getContext('2d')
    var subEl = root.querySelector('.tkc-sub'), whoEl = root.querySelector('.tkc-who'), txtEl = root.querySelector('.tkc-txt')
    var skyEl = root.querySelector('.tkc-sky'), nEl = root.querySelector('.tkc-n'), dEl = root.querySelector('.tkc-d'), stEl = root.querySelector('.tkc-st'), imgEl = root.querySelector('.tkc-img'), skyState = {}, imgState = {}
    var cardEl = root.querySelector('.tkc-card'), chipEl = root.querySelector('.tkc-chip'), vigEl = root.querySelector('.tkc-vig'), fadeEl = root.querySelector('.tkc-fade'), lastVig = -1, lastFade = -1
    var rm = !!opts.reducedMotion || (W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches && opts.reducedMotion !== false)
    var speed = opts.speed || 1
    var art = Art(opts), audio = LazyAudio(!!opts.muted), R = Renderer()
    var env = { w: 0, h: 0, dpr: 1, f0: 600, now: 0, dt: 0, rdt: 0, rm: rm, q: 1, s: {}, art: art, R: R, cam: Cam(), audio: audio,
      dprScale: opts.renderScale || MEMO.scale || 1, shakeV: [0, 0, 0], shakeE: 0, portrait: false, answered: false, answer: null, speed: speed,
      shake: function (v) { if (!rm) env.shakeE = max(env.shakeE, v) },
      card: function (title, sub) { if ((title || null) === env._card) return; env._card = title || null; if (title) { cardEl.querySelector('b').textContent = title; cardEl.querySelector('i').textContent = sub || '' } cardEl.classList.toggle('on', !!title) },
      chip: function (text) { if ((text || null) === env._chip) return; env._chip = text || null; if (text) chipEl.textContent = text; chipEl.classList.toggle('on', !!text) },
      cue: function (n) { audio.cue(n) }, mix: function (m) { audio.mix(m) } }
    var idx = 0, st = 0, prevT = -1, paused = false, waiting = false, dead = false, done = false, raf = 0, last = 0, hidden = false
    var result = { completed: false, skippedAll: false, skipped: [], answers: {}, reached: [] }
    var curSub = null, qEl = null, perf = { ema: 1 / 60, slow: 0, cool: 1 }
    if (opts.startAt) for (var si = 0; si < seq.length; si++) if (seq[si].id === opts.startAt) { idx = si; break }

    function resize () {
      var r = root.getBoundingClientRect(), w = max(1, Math.round(r.width)), h = max(1, Math.round(r.height))
      var dpr = min(2, W.devicePixelRatio || 1) * (env.dprScale || 1)
      if (w === env.w && h === env.h && dpr === env.dpr) return
      env.w = w; env.h = h; env.dpr = dpr; env.portrait = h > w * 1.05
      env.f0 = min(w, h * 1.05) * 1.15
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr)
    }
    function setSub (s) {
      if (s === curSub) return
      curSub = s
      if (!s) { subEl.classList.remove('on'); return }
      whoEl.textContent = s.who || ''; whoEl.setAttribute('data-w', s.who || ''); whoEl.style.display = s.who ? '' : 'none'
      txtEl.textContent = s.text
      subEl.classList.add('on')
      if (opts.say) { try { opts.say(s.text, s.who) } catch (e) {} }
    }
    function checkpoint (phase) {
      var sc = seq[idx]
      if (opts.onCheckpoint) { try { opts.onCheckpoint(sc.id, { phase: phase, index: idx, major: !!sc.major }) } catch (e) {} }
    }
    function enter () {
      var sc = seq[idx]
      st = 0; prevT = -1; waiting = false; env.s = {}; env.answered = false; env.answer = null; env.shakeE = 0
      env.card(null); env.chip(null); setSub(null)
      if (result.reached.indexOf(sc.id) < 0) result.reached.push(sc.id)
      audio.mix(sc.mix)
      if (sc.enter) sc.enter(env)
      checkpoint('start')
    }
    function next (skipped) {
      var sc = seq[idx]
      if (skipped && result.skipped.indexOf(sc.id) < 0) result.skipped.push(sc.id)
      closeQ()
      checkpoint('end')
      idx++
      if (idx >= seq.length) return finish(false)
      enter()
    }
    function finish (all) {
      if (done) return
      done = true; result.completed = !all; result.skippedAll = !!all
      setSub(null); env.card(null); env.chip(null)
      stop()
      if (opts.onDone) { try { opts.onDone(result) } catch (e) { if (W.console) console.error(e) } }
    }
    function closeQ () { if (qEl) { qEl.remove(); qEl = null } waiting = false }
    function ask (sc) {
      var q = sc.question
      waiting = true
      var p
      if (opts.onQuestion) { try { p = opts.onQuestion(q) } catch (e) { p = null } }
      if (!p || !p.then) p = builtinQ(q)
      var myIdx = idx
      p.then(function (r) { if (dead || idx !== myIdx || !waiting) return; result.answers[sc.id] = r == null ? true : r; env.answered = true; env.answer = r; waiting = false; if (q.explain) env.chip(q.explain) },
        function () { if (dead || idx !== myIdx) return; env.answered = true; waiting = false })
    }
    function builtinQ (q) {
      return new Promise(function (res) {
        qEl = D.createElement('div'); qEl.className = 'tkc-q'
        qEl.innerHTML = '<div class="tkc-qb" role="dialog" aria-label="Pertanyaan"><p>' + esc(q.prompt) + '</p><div></div><em></em></div>'
        var row = qEl.querySelector('.tkc-qb div'), em = qEl.querySelector('em'), tries = 0
        q.choices.forEach(function (c) {
          var b = D.createElement('button'); b.textContent = c
          b.onclick = function () {
            if (String(c) === String(q.answer)) { b.className = 'ok'; em.textContent = 'Benar! ' + (q.explain || ''); audio.cue('pop'); setTimeout(function () { closeQ(); waiting = true; res({ correct: true, choice: c, tries: tries + 1 }) }, 900) } else { tries++; b.className = 'no'; b.disabled = true; em.textContent = 'Coba lagi, ya!' }
          }
          row.appendChild(b)
        })
        root.appendChild(qEl)
      })
    }
    function frame (ts) {
      raf = 0
      if (dead || done) return
      var rdt = last ? min(0.1, (ts - last) / 1000) : 0.016
      last = ts
      if (!paused && !hidden) {
        var sc = seq[idx]
        env.rdt = rdt; env.now += rdt
        var dt = waiting ? 0 : rdt * speed
        env.dt = dt
        st += dt
        if (sc.question && !env.answered && !waiting && st >= sc.question.at) { st = sc.question.at; ask(sc) }
        if (waiting && sc.question) st = min(st, sc.question.at)
        // cues
        var cues = sc.cues || []
        for (var i = 0; i < cues.length; i++) { var c = cues[i]; if (c.t > prevT && c.t <= st) { if (c.a) audio.cue(c.a); if (c.mix) audio.mix(c.mix); if (c.fn) c.fn(env) } }
        // subtitles
        var subs = sc.subs || [], cs = null
        for (var j = 0; j < subs.length; j++) { var s = subs[j], nx = subs[j + 1]; var end = s.t + (s.d || (nx ? min(nx.t - s.t, 6) : 5.5)); if (st >= s.t && st < end) cs = s }
        setSub(cs)
        prevT = st
        // shake (restrained impulse, damped)
        env.shakeE *= Math.pow(0.02, rdt)
        var e = env.shakeE
        env.shakeV[0] = e * 7 * sin(env.now * 53); env.shakeV[1] = e * 5 * sin(env.now * 61 + 1); env.shakeV[2] = e * 0.006 * sin(env.now * 37)
        render(sc)
        // adaptive quality (house pattern, as tk-steer): a slow device keeps its frame rate by drawing fewer
        // pixels. Few decisive steps (0.75 -> 0.6 -> 0.5 render scale) with a cool-down after each resize,
        // because a resize itself costs a frame and must not trigger the next step.
        perf.cool -= rdt
        perf.ema += (rdt - perf.ema) * 0.08
        if (opts.adaptive !== false && perf.cool <= 0) {
          perf.slow = clamp(perf.slow + (perf.ema > 1 / 33 ? rdt : -rdt * 0.5), 0, 3)
          if (perf.slow > 0.8) {
            var cur = (env.dprScale || 1) * min(2, W.devicePixelRatio || 1), steps = [0.75, 0.6, 0.5], nx = 0
            for (var si2 = 0; si2 < steps.length; si2++) if (steps[si2] < cur - 0.01) { nx = steps[si2]; break }
            if (nx) { env.dprScale = nx / min(2, W.devicePixelRatio || 1); env.w = 0; MEMO.scale = env.dprScale } else if (env.q > 0.6) { env.q = 0.6; env.s.glints = null }
            perf.slow = 0; perf.cool = 1.2; perf.ema = 1 / 60
          }
        }
        if (!waiting && st >= sc.dur) next(false)
      }
      if (!dead && !done && !paused && !hidden) raf = requestAnimationFrame(frame)
    }
    function render (sc) {
      resize()
      ctx.setTransform(env.dpr, 0, 0, env.dpr, 0, 0)
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'
      env.vigA = 0; env.skyReq = null; env.imgReq = null
      ctx.clearRect(0, 0, env.w, env.h)
      try { sc.draw(ctx, st, env) } catch (e) { if (W.console) console.error(e); throw e }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'
      // scene fades (cut-in scenes can opt out)
      var fi = sc.fadeIn == null ? 0.45 : sc.fadeIn, fo = sc.fadeOut == null ? 0.35 : sc.fadeOut
      if (rm) { fi = max(fi, 0.6); fo = max(fo, 0.5) }
      var a = 0
      if (fi > 0 && st < fi) a = 1 - st / fi
      if (fo > 0 && st > sc.dur - fo) a = max(a, (st - (sc.dur - fo)) / fo)
      a = Math.round(clamp(a, 0, 1) * 100) / 100
      if (a !== lastFade) { lastFade = a; fadeEl.style.opacity = a }
      layers()
      var va = Math.round(env.vigA * 50) / 50
      if (va !== lastVig) { lastVig = va; vigEl.style.opacity = va }
    }
    // compositor-only background layers: the canvas above is transparent
    function skySize () {
      var w = env.w, h = env.h, H = h * 8, hz = h * 3
      skyState.size = w + 'x' + h
      skyEl.style.cssText = 'display:none;left:' + (-w) + 'px;top:0;width:' + (w * 3) + 'px;height:' + H + 'px;transform-origin:' + (w * 1.5) + 'px ' + hz + 'px'
      function grad (L, extra) {
        return (extra || '') + 'linear-gradient(180deg,' + rgba(L.skyTop) + ' 0px,' + rgba(L.skyTop) + ' ' + Math.round(hz - h * 0.9) + 'px,' + rgba(L.skyHor) + ' ' + hz + 'px,' +
          rgba(L.seaHor) + ' ' + hz + 'px,' + rgba(L.seaNear) + ' ' + Math.round(hz + h * 0.85) + 'px,' + rgba(L.seaNear) + ' 100%)'
      }
      nEl.style.background = grad(NIGHT)
      var sunX = Math.round(w * 1.5 + env.f0 * 0.25)
      dEl.style.background = grad(DAWN, 'radial-gradient(' + Math.round(w * 0.9) + 'px ' + Math.round(h * 0.34) + 'px at ' + sunX + 'px ' + hz + 'px,rgba(255,214,150,.75),rgba(255,190,130,.25) 45%,rgba(255,190,130,0) 100%),')
      var S = sprites()
      if (!skyState.starUrl) { try { skyState.starUrl = S.stars.toDataURL('image/png') } catch (e) { skyState.starUrl = '' } }
      stEl.style.cssText = 'top:' + Math.round(hz - S.stars.height - 6) + 'px;height:' + S.stars.height + 'px;width:' + (w * 3 + S.stars.width) + 'px;background-image:url(' + skyState.starUrl + ')'
      skyState.t = skyState.k = skyState.s = skyState.sx = null
    }
    function layers () {
      var q = env.skyReq
      if (q) {
        if (skyState.size !== env.w + 'x' + env.h) skySize()
        if (!skyState.on) { skyEl.style.display = 'block'; skyState.on = 1 }
        var y = clamp(q.y, -env.h * 2.8, env.h * 2.5)
        var t = 'translate(' + Math.round(q.x - env.w * 0.5) + 'px,' + Math.round(y - env.h * 3) + 'px) rotate(' + q.rot.toFixed(4) + 'rad)'
        if (t !== skyState.t) { skyState.t = t; skyEl.style.transform = t }
        var k = Math.round(q.k * 100) / 100
        if (k !== skyState.k) { skyState.k = k; dEl.style.opacity = k }
        var sa = Math.round(q.stars * 100) / 100
        if (sa !== skyState.s) { skyState.s = sa; stEl.style.opacity = sa }
        var tw = sprites().stars.width, sx = Math.round(((q.sx % tw) + tw) % tw - tw)
        if (sx !== skyState.sx) { skyState.sx = sx; stEl.style.transform = 'translateX(' + sx + 'px)' }
      } else if (skyState.on) { skyEl.style.display = 'none'; skyState.on = 0 }
      var r = env.imgReq
      if (r) {
        if (!imgState.on) { imgEl.style.display = 'block'; imgState.on = 1 }
        var sz = env.w + 'x' + env.h
        if (imgState.size !== sz) { imgState.size = sz; imgEl.style.left = Math.round(-env.w * 0.1) + 'px'; imgEl.style.top = Math.round(-env.h * 0.1) + 'px'; imgEl.style.width = Math.round(env.w * 1.2) + 'px'; imgEl.style.height = Math.round(env.h * 1.2) + 'px' }
        if (imgState.key !== r.key) { imgState.key = r.key; imgEl.style.backgroundImage = 'url("' + art.url(r.key) + '")' }
        var it = 'rotate(' + r.tilt.toFixed(4) + 'rad) scale(' + r.zoom.toFixed(4) + ') translate(' + r.px.toFixed(1) + 'px,' + r.py.toFixed(1) + 'px)'
        if (it !== imgState.t) { imgState.t = it; imgEl.style.transform = it }
      } else if (imgState.on) { imgEl.style.display = 'none'; imgState.on = 0 }
    }
    function start () { if (!raf && !dead && !done) { last = 0; raf = requestAnimationFrame(frame) } }
    function stop () { if (raf) cancelAnimationFrame(raf); raf = 0 }
    function onVis () { hidden = D.hidden; if (hidden) { stop(); audio.suspend() } else if (!paused) { audio.resume(); start() } }
    D.addEventListener('visibilitychange', onVis)
    var onResize = function () { env.w = 0 }
    W.addEventListener('resize', onResize)
    // the live container, not the window: a host that resizes the stage (split view, chapter column) re-lays out too
    var cro = null; try { if (W.ResizeObserver) { cro = new W.ResizeObserver(onResize); cro.observe(root) } } catch (e) { cro = null }
    function onKey (e) { if (e.key === ' ') { e.preventDefault(); paused ? api.resume() : api.pause() } else if (e.key === 'ArrowRight') api.skip() }
    D.addEventListener('keydown', onKey)
    var pb = root.querySelector('.tkc-pause'), rb = root.querySelector('.tkc-replay'), kb = root.querySelector('.tkc-skip')
    function syncPause () { if (!pb) return; pb.innerHTML = (paused ? ICON.play + '<span>Lanjut</span>' : ICON.pause + '<span>Jeda</span>'); pb.setAttribute('aria-label', paused ? 'Lanjut' : 'Jeda') }
    var api = {
      el: root,
      pause: function () { if (paused || done) return; paused = true; stop(); audio.suspend(); syncPause() },
      resume: function () { if (!paused || done) return; paused = false; audio.resume(); syncPause(); start() },
      skip: function (all) {
        if (done || dead || !ready) return
        if (all) { var sc = seq[idx]; if (result.skipped.indexOf(sc.id) < 0) result.skipped.push(sc.id); closeQ(); return finish(true) }
        next(true); if (!paused) start()
      },
      replay: function () { if (done || dead || !ready) return; closeQ(); enter(); if (!paused) start() },
      scene: function () { var sc = seq[idx] || {}; return { ready: ready, id: sc.id, index: idx, t: st, dur: sc.dur, waiting: waiting, paused: paused, done: done, q: env.q, dpr: env.dpr } },
      setMuted: function (m) { audio.setMuted(m) },
      destroy: function () {
        if (dead) return
        dead = true; stop(); closeQ(); audio.close()
        D.removeEventListener('visibilitychange', onVis); W.removeEventListener('resize', onResize); D.removeEventListener('keydown', onKey); try { if (cro) cro.disconnect() } catch (e) {}
        root.remove()
      }
    }
    root.addEventListener('pointerdown', function () { if (!paused) audio.resume() })
    if (pb) pb.onclick = function () { paused ? api.resume() : api.pause() }
    if (rb) rb.onclick = function () { api.replay() }
    if (kb) kb.onclick = function () { api.skip() }
    if (!seq.length) { setTimeout(function () { finish(false) }, 0); return api }
    // pre-load + decode every picture of the sequence (and warm meshes / backdrops) before the first
    // frame, so no scene boundary stutters; "Memuat…" shows only if this takes a moment
    var loadEl = root.querySelector('.tkc-load'), keys = []
    for (var pi = 0; pi < seq.length; pi++) (seq[pi].art || []).forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k) })
    loadEl.style.opacity = '0'
    var showT = setTimeout(function () { loadEl.style.opacity = '' }, 180)
    var ready = false
    function go () {
      if (ready || dead) return
      ready = true; clearTimeout(showT)
      resize()
      sprites(); buildShip(); buildBerg(11, ICE_R, ICE_H); buildFloe(); voyage()
      art.preload(['tk-ship3/ss-rotterdam-clean']); art.tinted(ART.rescue, 'rgb(10,14,30)', 0.85)
      loadEl.classList.add('off')
      enter(); start()
    }
    art.load(keys, function (f) { loadEl.querySelector('i').style.setProperty('--p', Math.round(f * 100) + '%') }).then(go, go)
    setTimeout(go, 8000)
    return api
  }

  /* ===================================================================== *
   *  TITANIC — reusable scene components (TitanicFinalSequence)           *
   * ===================================================================== */
  function sub (t, who, text, d) { return { t: t, who: who, text: text, d: d } }
  var ART = {
    timmy: 'tk-key/timmy', captain: 'tk-key/captain-arms', lookout: 'tk-char/officer-boy-binoculars', captainBin: 'tk-char/captain-binoculars',
    girl: 'tk-char/hijab-girl-map', girl2: 'tk-char/hijab-girl-book', girl3: 'tk-char/hijab-girl-camera', girl4: 'tk-char/hijab-girl-blueprint', officerGirl: 'tk-char/hijab-officer-tablet',
    officer: 'tk-char/officer-boy', officer2: 'tk-char/officer-boy-salute', lanternBoy: 'tk-char/lantern-boy', mechanic: 'tk-char/mechanic-boy', mechanic2: 'tk-char/mechanic-boy-wrench',
    explorer: 'tk-char/explorer-kid', chef: 'tk-char/chef',
    lantern: 'tk-prop/lantern-4', teacup: 'tk-prop/teacup', suitcase: 'tk-prop/suitcase-4', suitcase2: 'tk-prop/suitcase-first-class', wheel: 'tk-legend/ship-wheel-3',
    telegraph: 'tk-prop/engine-telegraph-6', lifeboat: 'tk-prop/lifeboat-11', rescue: 'tk-ship3/ss-rotterdam-clean', crate: 'tk-prop/crate-titanic',
    vest: 'tk-prop/life-vest', lifebuoy: 'tk-prop/lifebuoy-5'
  }
  function sceneKey (base, env) { return 'tk-scene/' + base + (env.portrait ? '-port' : '-land') }
  // sticker sprite: anchor bottom-centre, height h px
  function spr (ctx, env, key, x, y, h, o) {
    o = o || {}
    if (!o.rot && o.alpha == null) {
      var c = env.art.scaled(key, h, o.flip); if (!c) return
      var hq = Math.round(h)
      ctx.drawImage(c, Math.round(x - c.width * (o.ax == null ? 0.5 : o.ax)), Math.round(y - hq * (o.ay == null ? 1 : o.ay)))
      return
    }
    var im = env.art.get(key); if (!im) return
    var w = h * im.naturalWidth / im.naturalHeight
    ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); if (o.flip) ctx.scale(-1, 1)
    if (o.alpha != null) ctx.globalAlpha = o.alpha
    ctx.drawImage(im, -w * (o.ax == null ? 0.5 : o.ax), -h * (o.ay == null ? 1 : o.ay), w, h)
    ctx.restore()
  }
  function pop (t, t0, dur) { return t < t0 ? 0 : eback((t - t0) / (dur || 0.5)) }

  /* The voyage: deterministic ship track for scenes 1–4 (T = voyage seconds). */
  var T_HIT = 47, ICE_R = 8.5, ICE_H = 15, VOY = null
  function voyage () {
    if (VOY) return VOY
    var dt = 1 / 30, N = Math.round(64 / dt), h = 0, yr = 0, v = 6, px = 0, pz = 15, tr = []
    for (var i = 0; i <= N; i++) {
      var T = i * dt
      var tgt = T < 30 ? 0 : T < T_HIT ? -0.034 : 0
      yr += (tgt - yr) * dt / (T < T_HIT ? 2.2 : 1.1)
      v = T < 30 ? 6 : T < T_HIT ? lerp(6, 4.4, (T - 30) / (T_HIT - 30)) : max(1.2, 4.4 - (T - T_HIT) * 0.33)
      tr.push([px - sin(h) * 15, pz - cos(h) * 15, h, v, yr])
      h += yr * dt; px += sin(h) * v * dt; pz += cos(h) * v * dt
    }
    function pose (T) {
      var f = clamp(T / dt, 0, N - 1), i0 = Math.floor(f), k = f - i0, a = tr[i0], b = tr[i0 + 1]
      var yawr = lerp(a[4], b[4], k)
      return { x: lerp(a[0], b[0], k), z: lerp(a[1], b[1], k), yaw: lerp(a[2], b[2], k), v: lerp(a[3], b[3], k), yr: yawr,
        roll: yawr * 1.6 + (T > T_HIT ? 0.012 * sm(T_HIT, T_HIT + 6, T) : 0), pitch: T > T_HIT ? 0.008 * sm(T_HIT, T_HIT + 12, T) : 0, y: 0 }
    }
    function toW (p, lx, ly, lz) { var c = cos(p.yaw), s = sin(p.yaw); return [p.x + lx * c + lz * s, ly, p.z - lx * s + lz * c] }
    var ph = pose(T_HIT), ice = toW(ph, 3.5 + ICE_R * 0.93, 0, 17)
    // floes and far bergs, kept off the ship's track
    var r = rng(4242), floes = [], bergs = []
    for (var j = 0; j < 90 && floes.length < 46; j++) {
      var Tz = r() * 60, pp = pose(Tz), side = r() < 0.5 ? -1 : 1, off = side * (9 + r() * 55)
      var q = toW(pp, off, 0, (r() - 0.5) * 20)
      if (abs(q[0] - ice[0]) + abs(q[2] - ice[2]) < 22) continue
      floes.push({ x: q[0], z: q[2], s: 0.7 + r() * 2.2, yaw: r() * TAU })
    }
    for (var b2 = 0; b2 < 6; b2++) { var a0 = r() * TAU, dd = 260 + r() * 260; bergs.push({ x: ice[0] + cos(a0) * dd, z: ice[2] + sin(a0) * dd, s: 0.5 + r() * 0.7, yaw: r() * TAU }) }
    VOY = { pose: pose, toW: toW, ice: ice, floes: floes, bergs: bergs }
    return VOY
  }
  // wake ribbon + bow wave, anchored to discrete voyage stamps (so foam stays put in the world)
  function drawWake (ctx, env, cam, T, look, amt) {
    var V = voyage(), step = 0.3, t0 = Math.floor(T / step) * step, n = 38, A = [0, 0], B = [0, 0], pa = null
    var foam = rgba(mix3(look.glint, [255, 255, 255], 0.5), 1)
    var pts = []
    pts.push([T, 0])
    for (var k = 0; k < n; k++) pts.push([t0 - k * step, 0])
    ctx.fillStyle = foam
    for (var i = 0; i < pts.length; i++) {
      var Ti = pts[i][0]; if (Ti < 0) break
      var p = V.pose(Ti), age = T - Ti, wdt = 2.2 + age * 0.55
      var c = V.toW(p, 0, 0, -29.5), rx = cos(p.yaw), rz = -sin(p.yaw)
      var ok1 = proj(cam, c[0] - rx * wdt, 0, c[2] - rz * wdt, A, 0), ok2 = proj(cam, c[0] + rx * wdt, 0, c[2] + rz * wdt, B, 0)
      if (ok1 < 0 || ok2 < 0) { pa = null; continue }
      if (pa) {
        ctx.globalAlpha = 0.3 * amt * max(0, 1 - age / (n * step)) * (0.5 + p.v / 12)
        ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pa[2], pa[3]); ctx.lineTo(B[0], B[1]); ctx.lineTo(A[0], A[1]); ctx.closePath(); ctx.fill()
        // turbulent core + foam specks
        if (i > 0) {
          var sd = hash(Math.round(Ti / step) * 7.3)
          ctx.globalAlpha = 0.5 * amt * max(0, 1 - age / 8)
          var mx = lerp(A[0], B[0], 0.3 + sd * 0.4), my = lerp(A[1], B[1], 0.3 + sd * 0.4)
          var sz = max(1, abs(B[0] - A[0]) * 0.12)
          ctx.fillRect(mx - sz / 2, my - sz / 4, sz, max(1, sz / 2.5))
        }
      }
      pa = [A[0], A[1], B[0], B[1]]
    }
    ctx.globalAlpha = 1
    // bow wave + hull wash
    var P = V.pose(T), bw = clamp(P.v / 6, 0.2, 1) * amt
    var bow = V.toW(P, 0, 0, 30.4), l1 = V.toW(P, -5.5, 0, 17), r1 = V.toW(P, 5.5, 0, 17), l2 = V.toW(P, -3.6, 0, -24), r2 = V.toW(P, 3.6, 0, -24)
    ctx.strokeStyle = foam; ctx.lineWidth = max(1, cam.f / 400)
    ctx.globalAlpha = 0.55 * bw
    var S0 = [0, 0], S1 = [0, 0], S2 = [0, 0]
    if (proj(cam, bow[0], 0, bow[2], S0, 0) > 0 && proj(cam, l1[0], 0, l1[2], S1, 0) > 0 && proj(cam, r1[0], 0, r1[2], S2, 0) > 0) {
      ctx.beginPath(); ctx.moveTo(S1[0], S1[1]); ctx.lineTo(S0[0], S0[1]); ctx.lineTo(S2[0], S2[1]); ctx.stroke()
      ctx.globalAlpha = 0.3 * bw
      if (proj(cam, l2[0], 0, l2[2], S0, 0) > 0) { ctx.beginPath(); ctx.moveTo(S1[0], S1[1]); ctx.lineTo(S0[0], S0[1]); ctx.stroke() }
      if (proj(cam, r2[0], 0, r2[2], S0, 0) > 0) { ctx.beginPath(); ctx.moveTo(S2[0], S2[1]); ctx.lineTo(S0[0], S0[1]); ctx.stroke() }
    }
    ctx.globalAlpha = 1
  }
  // everything outside for voyage time T (sea, ice, ship, wake, particles, haze)
  function voyageWorld (ctx, env, cam, T, o) {
    o = o || {}
    var V = voyage(), look = NIGHT, P = V.pose(T)
    drawSea(ctx, env, cam, look, { moonDir: [-0.35, 0.3, 0.88] })
    drawWake(ctx, env, cam, T, look, 1)
    env.R.begin(cam, look.light)
    var ship = buildShip(), berg = buildBerg(11, ICE_R, ICE_H), floe = buildFloe()
    var roll = P.roll + (env.rm ? 0 : sin(env.now * 0.6) * 0.006), pitch = P.pitch + (env.rm ? 0 : sin(env.now * 0.45) * 0.004)
    if (o.jolt) roll += o.jolt
    env.R.mesh(ship, shipXfs({ x: P.x, z: P.z, y: 0, yaw: P.yaw, pitch: pitch, roll: roll }), { clip: 1, lights: 1 })
    env.R.mesh(berg, xf(V.ice[0], 0, V.ice[2], 0.4, 0, 0), { clip: 1 })
    var far = buildBerg(-3, ICE_R, ICE_H)
    for (var i = 0; i < V.bergs.length; i++) { var b = V.bergs[i]; env.R.mesh(far, xf(b.x, 0, b.z, b.yaw, 0, 0, b.s), { clip: 1, r: 14 * b.s }) }
    for (var j = 0; j < V.floes.length; j++) { var f = V.floes[j]; var bob = sin(env.now * 0.9 + j) * 0.08; env.R.mesh(floe, xf(f.x, bob, f.z, f.yaw, sin(env.now * 0.7 + j) * 0.04, 0, f.s), { clip: 1, r: 1.3 * f.s }) }
    env.R.flush(ctx)
    // funnel smoke (thin, drifting aft)
    var E = env.s.parts || (env.s.parts = Parts())
    env.s.smokeT = (env.s.smokeT || 0) + env.dt
    if (env.s.smokeT > (env.q < 0.7 ? 0.5 : 0.3) && P.v > 3) {
      env.s.smokeT = 0
      var FZ = [11, 4.5, -2]
      for (var k = 0; k < 3; k++) { var sp = V.toW(P, 0, 15.6, FZ[k] - 0.9); emit(E, env, 'smoke', sp[0], sp[1], sp[2], 1, 0.5, [-sin(P.yaw) * 2, 0.6, -cos(P.yaw) * 2, 0.4, 0.4]) }
    }
    drawParts(ctx, env, cam, E, look)
    drawHaze(ctx, env, cam, look, o.haze == null ? 1 : o.haze)
    return P
  }
  function hudWheel (ctx, env, x, y, r, ang, a) {
    var im = env.art.get(ART.wheel)
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(ang)
    if (im) ctx.drawImage(im, -r, -r, r * 2, r * 2)
    else { ctx.strokeStyle = '#c89b5a'; ctx.lineWidth = r * 0.12; ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, TAU); ctx.stroke() }
    ctx.restore(); ctx.globalAlpha = 1
  }
  // speaker bust sliding up from a lower corner (reaction shot)
  function bust (ctx, env, key, t, t0, t1, side) {
    if (t < t0 || t > t1 + 0.6) return
    var k = min(pop(t, t0, 0.55), 1 - sm(t1, t1 + 0.5, t)), h = min(env.h * 0.36, env.w * 0.42)
    var x = side < 0 ? h * 0.52 + 8 : env.w - h * 0.52 - 8, y = env.h + (1 - k) * h * 0.9 - (env.portrait ? env.h * 0.1 : 0)
    var bob = env.rm ? 0 : sin(env.now * 2.1) * 3
    spr(ctx, env, key, x, y + bob + h * 0.06, h, { rot: side * (1 - k) * 0.2 })
  }

  function IceFieldApproach (o) {
    o = o || {}
    return { id: 'approach', major: true, dur: o.dur || 20, fadeIn: 1.2, fadeOut: 0,
      mix: { ocean: 0.75, engine: 0.55, pitch: 1, music: 0.45, chord: [220, 261.63, 329.63, 392] },
      art: [ART.wheel],
      subs: o.subs || [sub(1.2, 'Narator', '14 April 1912, malam hari. Laut Atlantik Utara tenang dan sangat dingin.'),
        sub(7.5, 'Timmy', 'Lautnya gelap sekali… tapi bulannya terang!'),
        sub(13.5, 'Narator', 'Jauh di depan, ada gunung es yang sangat besar.')],
      draw: function (ctx, t, env) {
        var V = voyage(), T = t, P = V.pose(T), cam = env.cam
        var k = eio(sm(3.5, 17.5, t))
        var tgtTop = V.toW(P, 0, 0, 14), tgtCine = V.toW(P, 0, 5, 44)
        var tgt = [lerp(tgtTop[0], tgtCine[0], k), lerp(0, 5, k), lerp(tgtTop[2], tgtCine[2], k)]
        var el = lerp(1.5, 0.2, k), dist = lerp(env.portrait ? 128 : 112, env.portrait ? 132 : 86, k), az = P.yaw + PI + lerp(0, env.portrait ? 0.3 : 0.62, eio(sm(6, 20, t)))
        orbit(cam, env, tgt, dist, az, el, 0, 1, lerp(0.5, 0.56, k))
        voyageWorld(ctx, env, cam, T, { haze: k })
        drawDrift(ctx, env, cam, 0.5 + 0.5 * k)
        vignette(ctx, env, 0.7 + 0.3 * k)
        // gameplay-view hint fading as the camera lifts off into the cinematic framing
        if (k < 0.6) { var wr = min(env.w, env.h) * 0.075; hudWheel(ctx, env, env.w - wr * 1.4, env.h - wr * (env.portrait ? 3.6 : 2.6), wr, 0, 0.6 * (1 - k / 0.6)) }
      } }
  }
  function LookoutWarning (o) {
    o = o || {}
    return { id: 'lookout', dur: o.dur || 9, fadeIn: 0.15,
      mix: { ocean: 0.7, engine: 0.55, music: 0.3 },
      cues: [{ t: 0.5, a: 'bell' }, { t: 0.95, a: 'bell' }, { t: 1.4, a: 'bell' }],
      art: [ART.lookout, ART.captain],
      subs: o.subs || [sub(1.2, 'Pengintai', 'Gunung es di depan!', 3.2), sub(4.6, 'Kapten', 'Belok ke kiri! Mesin mundur!', 4)],
      draw: function (ctx, t, env) {
        var V = voyage(), T = 20 + t, P = V.pose(T), cam = env.cam
        // crow's nest: telephoto on the iceberg, easing wider
        var eye = V.toW(P, 0.2, 18.5, 22.5), aim = [V.ice[0], 5 + sin(env.now * 0.8) * (env.rm ? 0 : 0.25), V.ice[2]]
        var sway = env.rm ? 0 : sin(env.now * 1.3) * 0.012
        lookAt(cam, env, eye, aim, sway, lerp(2.3, 1.15, eio(sm(0, 6, t))), env.portrait ? 0.46 : 0.5)
        voyageWorld(ctx, env, cam, T)
        drawDrift(ctx, env, cam, 1)
        // binocular mask in the first seconds
        var bm = 1 - sm(2.6, 3.6, t)
        if (bm > 0.01) {
          ctx.save(); ctx.globalAlpha = bm * 0.9; ctx.fillStyle = '#01030a'; ctx.beginPath(); ctx.rect(0, 0, env.w, env.h)
          var rr = min(env.w, env.h) * 0.3
          ctx.arc(env.w / 2 - rr * 0.62, env.h * 0.47, rr, 0, TAU, true); ctx.moveTo(env.w / 2 + rr * 1.62, env.h * 0.47); ctx.arc(env.w / 2 + rr * 0.62, env.h * 0.47, rr, 0, TAU, true)
          ctx.fill('evenodd'); ctx.restore()
        }
        vignette(ctx, env, 1)
        bust(ctx, env, ART.lookout, t, 0.9, 4.3, -1)
        bust(ctx, env, ART.captain, t, 4.4, 8.6, 1)
      } }
  }
  function AssistedSteering (o) {
    o = o || {}
    return { id: 'steering', dur: o.dur || 16, fadeIn: 0.2, fadeOut: 0,
      mix: { ocean: 0.6, engine: 0.9, pitch: 1.35, music: 0.05 },
      art: [ART.wheel],
      subs: o.subs || [sub(0.8, 'Kapten', 'Kemudi ke kiri… kapal sebesar ini berbelok pelan-pelan.'),
        sub(6.5, 'Narator', 'Haluan kapal berbelok lebih dulu. Buritan menyusul belakangan.'),
        sub(11.5, 'Timmy', 'Ayo, belok… belok!')],
      draw: function (ctx, t, env) {
        var V = voyage(), T = 29 + t, P = V.pose(T), cam = env.cam
        var bow = V.toW(P, 0, 4, 20), k = eio(sm(0, 16, t))
        var tgt = [lerp(bow[0], V.ice[0], 0.3 + 0.15 * k), 4, lerp(bow[2], V.ice[2], 0.3 + 0.15 * k)]
        var pf = env.portrait ? 1.45 : 1
        orbit(cam, env, tgt, lerp(118, 84, k) * pf, P.yaw + PI - 0.75 + 0.25 * k + (env.portrait ? 0.3 : 0), lerp(0.62, 0.36, k), 0, 1, 0.52)
        voyageWorld(ctx, env, cam, T)
        drawDrift(ctx, env, cam, 0.8)
        vignette(ctx, env, 1)
        // assisted-steering HUD: the wheel turns left by itself, label says the ship is helped
        var hk = sm(0.2, 1, t) * (1 - sm(13.5, 15, t)), r = min(env.w, env.h) * 0.085
        if (hk > 0.01) {
          hudWheel(ctx, env, env.w - r * 1.5, env.h - r * 1.45 - (env.portrait ? env.h * 0.12 : env.h * 0.1), r, -2.1 * eio(sm(0.5, 3.5, t)), 0.8 * hk)
        }
      } }
  }
  function IcebergImpact (o) {
    o = o || {}
    return { id: 'impact', major: true, dur: o.dur || 10, fadeIn: 0.12,
      mix: { ocean: 0.6, engine: 0.7, pitch: 1.2, music: 0 },
      cues: [{ t: 1.6, a: 'scrape' }, { t: 1.9, a: 'thud' }, { t: 4.5, mix: { engine: 0.12, pitch: 0.7 } }, { t: 5.2, a: 'creak' }],
      subs: o.subs || [sub(2.6, 'Narator', 'Kapal menyerempet gunung es. Terdengar suara gesekan yang panjang.'),
        sub(6.6, 'Kapten', 'Semua tetap tenang. Kita periksa kapalnya.')],
      draw: function (ctx, t, env) {
        var V = voyage(), T = 45 + t, P = V.pose(T), cam = env.cam
        var hitA = sm(1.8, 2.2, t) * (1 - sm(5, 8, t))
        if (t > 1.9 && !env.s.hit) { env.s.hit = 1; env.shake(1) }
        var eye = V.toW(P, -26, 24, 50), aim = V.toW(P, 5, 2, 8)
        var drift = eio(sm(0, 10, t))
        eye[1] += drift * 2
        lookAt(cam, env, eye, aim, 0, env.portrait ? 1.05 : 1.15, 0.52)
        var jolt = env.rm ? 0 : sin(t * 18) * 0.01 * hitA
        voyageWorld(ctx, env, cam, T, { jolt: jolt })
        // scrape FX along the starboard bow where it meets the ice
        var E = env.s.parts
        if (t > 1.8 && t < 6.2 && E) {
          env.s.fx = (env.s.fx || 0) + env.dt
          if (env.s.fx > 0.06) {
            env.s.fx = 0
            var along = 17 - (t - 1.8) * 6.5, c = V.toW(P, 3.7, 0.6, along), iceTop = [lerp(c[0], V.ice[0], 0.35), 4 + Math.random() * 6, lerp(c[2], V.ice[2], 0.35)]
            emit(E, env, 'spray', c[0], 0.4, c[2], 5, 1.5, [cos(P.yaw) * 2, 3.5, -sin(P.yaw) * 2, 2.2, 3])
            emit(E, env, 'ice', iceTop[0], iceTop[1], iceTop[2], 3, 2.5, [-cos(P.yaw) * 1.5, 0.5, 0, 2, 1.5])
            if (Math.random() < 0.4) emit(E, env, 'spark', c[0], 1.2, c[2], 1, 0.4, [0, 2.5, 0, 3, 1])
            emit(E, env, 'foam', c[0] + cos(P.yaw) * 1.5, 0.02, c[2], 1, 1, [0, 0, 0, 0, 0])
          }
        }
        drawDrift(ctx, env, cam, 1)
        vignette(ctx, env, 1)
        if (env.rm && hitA > 0) { ctx.fillStyle = 'rgba(0,0,10,' + (0.25 * hitA).toFixed(3) + ')'; ctx.fillRect(0, 0, env.w, env.h) }
      } }
  }

  /* ── interiors (2D stages) ───────────────────────────────────────────── */
  function stage (ctx, env, zoom, px, py, tilt) {
    env.stageT = [zoom, px, py, tilt]
    ctx.translate(env.w / 2, env.h / 2); ctx.rotate(tilt); ctx.scale(zoom, zoom); ctx.translate(-env.w / 2 + px, -env.h / 2 + py)
  }
  function backdrop (ctx, env, base) {
    // painted by the compositor-only DOM image layer with the same stage transform
    var st = env.stageT || [1, 0, 0, 0]
    env.imgReq = { key: sceneKey(base, env), zoom: st[0], px: st[1], py: st[2], tilt: st[3] }
  }
  function swingLamp (ctx, env, x, y0, len, ang, s) {
    var ex = x + sin(ang) * len, ey = y0 + cos(ang) * len
    ctx.strokeStyle = 'rgba(40,30,20,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(ex, ey); ctx.stroke()
    var S = sprites()
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45; ctx.drawImage(S.glow, ex - s * 1.6, ey - s * 0.6, s * 3.2, s * 3.2); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'
    spr(ctx, env, ART.lantern, ex, ey, s * 1.35, { ay: 0.05, rot: -ang * 0.6 })
  }
  function water (ctx, env, level, t, col) { // rising water at the bottom of a stage
    if (level <= 0) return
    var y = env.h * (1 - level)
    ctx.fillStyle = col || 'rgba(50,130,205,.88)'; ctx.beginPath(); ctx.moveTo(-env.w, env.h * 2)
    for (var x = -env.w * 0.2; x <= env.w * 1.2; x += 16) ctx.lineTo(x, y + sin(x * 0.03 + t * 2.4) * 4 + sin(x * 0.011 - t * 1.3) * 3)
    ctx.lineTo(env.w * 1.3, env.h * 2); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = 'rgba(210,240,255,.6)'; ctx.lineWidth = 2; ctx.beginPath()
    for (var x2 = -env.w * 0.2; x2 <= env.w * 1.2; x2 += 16) { var yy = y + sin(x2 * 0.03 + t * 2.4) * 4 + sin(x2 * 0.011 - t * 1.3) * 3; if (x2 === -env.w * 0.2) ctx.moveTo(x2, yy); else ctx.lineTo(x2, yy) }
    ctx.stroke()
  }
  var CUTS = [
    { name: 'bridge', who: 'Kapten', text: 'Periksa semua ruangan kapal!' },
    { name: 'corridor', who: 'Awak kapal', text: 'Lampu-lampu berayun. Awak kapal bergegas memeriksa.' },
    { name: 'engine', who: 'Mekanik', text: 'Ada air masuk di ruang depan!' },
    { name: 'lounge', who: 'Timmy', text: 'Cangkir dan koper bergeser sendiri… kapalnya miring sedikit.' },
    { name: 'hold', who: 'Narator', text: 'Air laut masuk pelan-pelan ke ruang paling bawah.' }
  ]
  function drawCut (ctx, env, i, t) {
    var w = env.w, h = env.h, u = min(w, h), rm = env.rm
    var jolt = rm ? 0 : 0.03 * Math.exp(-t * 3) * sin(t * 30)
    var list = 0.012 + 0.006 * sin(env.now * 0.8) * (rm ? 0.3 : 1)
    var swing = (rm ? 0.12 : 0.45) * Math.exp(-t * 0.25) * sin(t * 2.6) + list * 3
    ctx.save()
    var name = CUTS[i].name
    if (name === 'bridge') {
      stage(ctx, env, 1.04 + t * 0.012, 0, 0, list + jolt)
      ctx.fillStyle = '#23170e'; ctx.fillRect(-w, -h, w * 3, h * 3)
      // windows onto the night sea, horizon tilting, the iceberg sliding away astern
      var nW = env.portrait ? 2 : 3, ww = w * 0.8 / nW, wy = h * 0.14, wh = h * 0.34
      for (var k = 0; k < nW; k++) {
        var x0 = w * 0.1 + k * ww + 6
        ctx.save(); ctx.beginPath(); ctx.rect(x0, wy, ww - 12, wh); ctx.clip()
        var sg = ctx.createLinearGradient(0, wy, 0, wy + wh); sg.addColorStop(0, '#050b20'); sg.addColorStop(0.55, '#1b2e58'); sg.addColorStop(0.56, '#0e2244'); sg.addColorStop(1, '#030916'); ctx.fillStyle = sg
        ctx.translate(x0 + ww / 2, wy + wh * 0.55); ctx.rotate(-list * 3 - jolt * 2); ctx.fillRect(-ww, -wh, ww * 2, wh * 2)
        ctx.fillStyle = 'rgba(255,255,255,.7)'
        for (var s2 = 0; s2 < 10; s2++) ctx.fillRect((hash(s2 + k * 10) - 0.5) * ww, -wh * 0.5 * hash(s2 * 3 + k), 1.5, 1.5)
        var ix = w * 0.9 - t * w * 0.1 - (x0 + ww / 2)
        ctx.fillStyle = '#cfe6f7'; ctx.beginPath(); ctx.moveTo(ix - 60, 0); ctx.lineTo(ix - 20, -wh * 0.32); ctx.lineTo(ix + 5, -wh * 0.18); ctx.lineTo(ix + 30, -wh * 0.4); ctx.lineTo(ix + 70, 0); ctx.fill()
        ctx.restore()
        ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 8; ctx.strokeRect(x0, wy, ww - 12, wh)
      }
      ctx.fillStyle = '#3b2616'; ctx.fillRect(-w, h * 0.72, w * 3, h)
      ctx.fillStyle = '#5a3a20'; ctx.fillRect(-w, h * 0.7, w * 3, h * 0.03)
      spr(ctx, env, ART.telegraph, w * 0.84, h * 0.86, u * 0.36)
      hudWheel(ctx, env, w * 0.5, h * 0.82, u * 0.2, 0.4 * sin(t * 1.4) * Math.exp(-t * 0.4) - 0.3, 1)
      swingLamp(ctx, env, w * 0.2, -4, h * 0.12, swing, u * 0.08)
      ctx.restore(); ctx.save()
      bust(ctx, env, ART.captainBin, t + 0.2, 0.3, 9, -1)
    } else if (name === 'corridor') {
      stage(ctx, env, 1.02 + t * 0.03, 0, 0, list + jolt)
      var vx = w / 2, vy = h * 0.46
      ctx.fillStyle = '#e8d6b4'; ctx.fillRect(-w, -h, w * 3, h * 3)
      var quad = function (a, b, c, d, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.fill() }
      var fw = w * 0.1, fh = h * 0.09
      quad([-w * 0.2, -h * 0.2], [vx - fw, vy - fh], [vx - fw, vy + fh], [-w * 0.2, h * 1.2], '#c9a878')
      quad([w * 1.2, -h * 0.2], [vx + fw, vy - fh], [vx + fw, vy + fh], [w * 1.2, h * 1.2], '#bf9d6c')
      quad([-w * 0.2, -h * 0.2], [w * 1.2, -h * 0.2], [vx + fw, vy - fh], [vx - fw, vy - fh], '#f2e6cc')
      quad([-w * 0.2, h * 1.2], [w * 1.2, h * 1.2], [vx + fw, vy + fh], [vx - fw, vy + fh], '#7a2430')
      quad([w * 0.3, h * 1.2], [w * 0.7, h * 1.2], [vx + fw * 0.3, vy + fh], [vx - fw * 0.3, vy + fh], '#9b2f3c')
      ctx.fillStyle = '#1b1210'; ctx.fillRect(vx - fw, vy - fh, fw * 2, fh * 2)
      for (var dI = 0; dI < 5; dI++) { // doors + ceiling lamps receding
        var zk = 1 - dI / 5, sx = lerp(vx - fw, -w * 0.2, zk * zk), sx2 = lerp(vx + fw, w * 1.2, zk * zk)
        var ty = lerp(vy - fh, -h * 0.2, zk * zk), by = lerp(vy + fh, h * 1.2, zk * zk)
        ctx.fillStyle = '#6b4526'; ctx.fillRect(sx + (vx - sx) * 0.08, ty + (by - ty) * 0.3, max(3, (vx - sx) * 0.12), (by - ty) * 0.62)
        ctx.fillRect(sx2 - (sx2 - vx) * 0.2, ty + (by - ty) * 0.3, max(3, (sx2 - vx) * 0.12), (by - ty) * 0.62)
        var ls = max(6, (by - ty) * 0.08)
        swingLamp(ctx, env, vx, ty, ls * 2, swing * (0.6 + dI * 0.1), ls)
      }
      ctx.restore(); ctx.save()
      var run = eio(sm(0.3, 3.4, t))
      spr(ctx, env, ART.officer2, lerp(-u * 0.2, w * 0.3, run), h + 4 + (rm ? 0 : abs(sin(t * 9)) * -8), u * 0.46)
      spr(ctx, env, ART.officerGirl, lerp(w + u * 0.2, w * 0.74, eio(sm(0.8, 3.6, t))), h + 4, u * 0.46)
    } else if (name === 'engine') {
      stage(ctx, env, 1.05 + t * 0.02, rm ? 0 : sin(t * 20) * 2 * Math.exp(-t), 0, list + jolt)
      backdrop(ctx, env, 'engine-room')
      var S = sprites()
      ctx.globalAlpha = 0.25
      for (var p = 0; p < 6; p++) { var px = w * (0.15 + p * 0.14), py = h * 0.4 - ((t * 40 + p * 50) % (h * 0.35)); ctx.drawImage(S.glow, px - 60, py - 60, 120, 120) }
      ctx.globalAlpha = 1
      swingLamp(ctx, env, w * 0.3, -4, h * 0.16, swing, u * 0.08)
      swingLamp(ctx, env, w * 0.72, -4, h * 0.13, swing * 0.9, u * 0.07)
      water(ctx, env, 0.05 + 0.05 * sm(0, 4, t), env.now)
      ctx.restore(); ctx.save()
      spr(ctx, env, ART.mechanic, w * 0.26, h + 6 - (1 - pop(t, 0.3)) * -u * 0.5, u * 0.5)
      spr(ctx, env, ART.mechanic2, w * 0.76, h + 6 - (1 - pop(t, 0.9)) * -u * 0.5, u * 0.46, { flip: true })
    } else if (name === 'lounge') {
      stage(ctx, env, 1.03 + t * 0.015, 0, 0, list * 1.5 + jolt)
      backdrop(ctx, env, 'grand-staircase')
      swingLamp(ctx, env, w * 0.5, -4, h * 0.1, swing * 0.7, u * 0.09)
      ctx.restore(); ctx.save()
      // table edge in the foreground; cups + luggage sliding with the list
      var tl = list * 1.5 + jolt
      ctx.translate(w / 2, h / 2); ctx.rotate(tl); ctx.translate(-w / 2, -h / 2)
      var ty2 = h * 0.8
      ctx.fillStyle = '#5b3418'; ctx.fillRect(-w * 0.1, ty2, w * 1.2, h * 0.3)
      ctx.fillStyle = '#7d4a22'; ctx.fillRect(-w * 0.1, ty2 - 8, w * 1.2, 10)
      ctx.fillStyle = '#f4eee2'; ctx.fillRect(-w * 0.1, ty2 - 2, w * 1.2, 4)
      var sl = eio(sm(0.2, 3.6, t))
      spr(ctx, env, ART.teacup, w * 0.3 + sl * u * 0.16, ty2 - 2, u * 0.1, { rot: rm ? 0 : sin(t * 7) * 0.05 * (1 - sl) })
      spr(ctx, env, ART.teacup, w * 0.46 + sl * u * 0.12, ty2 - 2, u * 0.09, { rot: rm ? 0 : sin(t * 6 + 1) * 0.05 * (1 - sl) })
      spr(ctx, env, ART.suitcase2, w * 0.1 + sl * u * 0.14, h * 0.99, u * 0.2)
      ctx.restore(); ctx.save()
      spr(ctx, env, ART.girl2, w * 0.7, h + 6 - (1 - pop(t, 0.5)) * -u * 0.5, u * 0.44)
      spr(ctx, env, ART.timmy, w * 0.88, h + 6 - (1 - pop(t, 0.9)) * -u * 0.5, u * 0.5)
    } else { // hold
      stage(ctx, env, 1.04 + t * 0.02, 0, 0, list * 1.8 + jolt)
      ctx.fillStyle = '#17100a'; ctx.fillRect(-w, -h, w * 3, h * 3)
      ctx.strokeStyle = 'rgba(120,90,60,.5)'; ctx.lineWidth = 6
      for (var rI = 0; rI < 9; rI++) { ctx.beginPath(); ctx.moveTo(w * rI / 8, -h * 0.1); ctx.lineTo(w * rI / 8, h * 1.1); ctx.stroke() }
      ctx.fillStyle = 'rgba(80,60,40,.8)'; ctx.fillRect(-w, h * 0.12, w * 3, 10)
      spr(ctx, env, ART.crate, w * 0.2, h * 0.9, u * 0.3)
      spr(ctx, env, ART.crate, w * 0.36, h * 0.92, u * 0.24)
      spr(ctx, env, ART.crate, w * 0.82, h * 0.9, u * 0.28)
      swingLamp(ctx, env, w * 0.55, h * 0.12, h * 0.14, swing, u * 0.08)
      // a gentle inflow from a seam in the hull plates
      var jx = w * 0.95, jy = h * 0.45
      ctx.strokeStyle = 'rgba(110,190,240,.75)'; ctx.lineWidth = u * 0.025; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(jx, jy)
      ctx.quadraticCurveTo(jx - u * 0.12, jy + u * 0.02, jx - u * 0.16, h * 0.9); ctx.stroke()
      ctx.fillStyle = 'rgba(200,235,255,.8)'
      for (var dp = 0; dp < 10; dp++) { var ph = ((env.now * 1.3 + dp / 10) % 1); ctx.fillRect(jx - u * 0.16 * ph + hash(dp) * 6, jy + (h * 0.45) * ph * ph, 3, 3) }
      water(ctx, env, 0.08 + 0.1 * sm(0, 4, t), env.now)
      ctx.restore(); ctx.save()
      spr(ctx, env, ART.lanternBoy, w * 0.66, h + 6 - (1 - pop(t, 0.6)) * -u * 0.5, u * 0.46)
    }
    ctx.restore()
  }
  function InteriorReaction (o) {
    o = o || {}
    var per = o.per || 4
    var subs = []
    for (var i = 0; i < CUTS.length; i++) subs.push(sub(i * per + 0.35, CUTS[i].who, CUTS[i].text, per - 0.5))
    return { id: 'interior', dur: per * CUTS.length, fadeIn: 0.25,
      mix: { ocean: 0.35, engine: 0.12, pitch: 0.7, music: 0 },
      cues: [{ t: 0.3, a: 'creak' }, { t: per + 0.4, a: 'creak' }, { t: per * 2 + 0.2, a: 'thud' }, { t: per * 3 + 0.5, a: 'creak' }, { t: per * 4 + 0.3, a: 'splash' }],
      art: [ART.captainBin, ART.telegraph, ART.wheel, ART.lantern, ART.officer2, ART.officerGirl, ART.mechanic, ART.mechanic2, ART.teacup, ART.suitcase2, ART.girl2, ART.timmy, ART.crate, ART.lanternBoy,
        'tk-scene/engine-room-land', 'tk-scene/engine-room-port', 'tk-scene/grand-staircase-land', 'tk-scene/grand-staircase-port'],
      subs: subs,
      draw: function (ctx, t, env) {
        var i = min(CUTS.length - 1, Math.floor(t / per)), lt = t - i * per
        drawCut(ctx, env, i, lt)
        // cut transitions: quick dip normally, soft cross-fade with reduced motion
        if (i > 0 && lt < (env.rm ? 0.7 : 0.2)) {
          if (env.rm) { ctx.globalAlpha = 1 - lt / 0.7; drawCut(ctx, env, i - 1, per); ctx.globalAlpha = 1 } else { ctx.fillStyle = 'rgba(0,0,0,' + (1 - lt / 0.2).toFixed(3) + ')'; ctx.fillRect(0, 0, env.w, env.h) }
        }
        vignette(ctx, env, 0.8)
      } }
  }

  /* ── flooding cutaway (educational) ──────────────────────────────────── */
  var Q_FLOOD = { prompt: '3 ruang sudah berisi air. 2 ruang lagi mulai terisi. Berapa ruang yang terkena air?', choices: [4, 5, 6], answer: 5, explain: '3 + 2 = 5' }
  function FloodingCutaway (o) {
    o = o || {}
    var q = o.question || Q_FLOOD
    return { id: 'flooding', major: true, dur: o.dur || 17, fadeIn: 0.5,
      mix: { ocean: 0.4, engine: 0, music: 0.18, chord: [196, 246.94, 293.66, 369.99] },
      question: { at: 7.2, prompt: q.prompt, choices: q.choices, answer: q.answer, explain: q.explain, kind: 'flood' },
      cues: [{ t: 7.6, a: 'pop' }, { t: 8.2, a: 'pop' }, { t: 8.8, a: 'pop' }, { t: 9.4, a: 'pop' }, { t: 10, a: 'pop' }],
      subs: o.subs || [sub(0.6, 'Narator', 'Titanic punya 16 ruang kedap air di bagian bawahnya.'),
        sub(3.6, 'Narator', 'Kalau terlalu banyak ruang terisi air, kapal tidak bisa terus mengapung.'),
        sub(10.8, 'Kapten', 'Semua penumpang harus menuju sekoci. Pakai jaket pelampung!'),
        sub(14.2, 'Timmy', 'Aku ikut! Aku tetap tenang.')],
      draw: function (ctx, t, env) {
        var w = env.w, h = env.h, now = env.now
        ctx.fillStyle = '#06142e'; ctx.fillRect(0, 0, w, h)
        // blueprint grid
        ctx.strokeStyle = 'rgba(120,170,255,.08)'; ctx.lineWidth = 1; ctx.beginPath()
        for (var gx = 0; gx < w; gx += 28) { ctx.moveTo(gx, 0); ctx.lineTo(gx, h) }
        for (var gy = 0; gy < h; gy += 28) { ctx.moveTo(0, gy); ctx.lineTo(w, gy) }
        ctx.stroke()
        // ship profile, 1000 x 260 units; portrait frames the flooded front half
        var fr = env.portrait ? [380, 1000] : [0, 1000], span = fr[1] - fr[0]
        var s = min(w * 0.94 / span, h * 0.5 / 260), push = 1 + 0.05 * eio(sm(0, 17, t))
        var ox = w / 2 - (fr[0] + span / 2) * s * push, oy = h * (env.portrait ? 0.46 : 0.53) - 92 * s * push
        var tilt = 0.02 * sm(0, 17, t) + 0.012
        ctx.save(); ctx.translate(ox, oy); ctx.scale(s * push, s * push)
        ctx.translate(500, 130); ctx.rotate(tilt); ctx.translate(-500, -130)
        var WL = 150
        // sea behind + surface
        ctx.fillStyle = 'rgba(20,70,140,.35)'; ctx.fillRect(-600, WL, 2200, 600)
        // hull
        ctx.beginPath(); ctx.moveTo(20, 60); ctx.lineTo(975, 60); ctx.lineTo(1000, 40); ctx.lineTo(960, 250); ctx.lineTo(90, 250); ctx.quadraticCurveTo(10, 240, 20, 60); ctx.closePath()
        ctx.fillStyle = '#e9e4d4'; ctx.fill()
        ctx.save(); ctx.clip()
        // compartments: 1 = bow (right). 16 in the real ship; the cutaway shows 8 big ones
        var n = 8, x0 = 120, x1 = 960, cw = (x1 - x0) / n, top = 120, bot = 250
        var answered = env.answered, sinceA = answered ? t - 7.2 : -1
        for (var c = 0; c < n; c++) {
          var num = c + 1, cx = x1 - (c + 1) * cw
          var full = num <= 3 ? sm(0.5 + c * 0.6, 3 + c * 0.6, t) * 0.88 : num <= 5 ? (0.08 + 0.32 * sm(4, 16, t)) * sm(3.8 + (c - 3) * 0.4, 5 + (c - 3) * 0.4, t) : 0
          if (full > 0) {
            var wy = bot - (bot - top) * full
            ctx.fillStyle = num <= 3 ? 'rgba(40,140,230,.95)' : 'rgba(90,180,240,.85)'
            ctx.beginPath(); ctx.moveTo(cx, bot)
            for (var xx = 0; xx <= cw; xx += 6) ctx.lineTo(cx + xx, wy + sin(xx * 0.12 + now * 3 + c) * 2.2)
            ctx.lineTo(cx + cw, bot); ctx.closePath(); ctx.fill()
          }
          if (answered && num <= 5 && sinceA > (num - 1) * 0.6) { ctx.strokeStyle = '#FFD166'; ctx.lineWidth = 5; ctx.strokeRect(cx + 4, top + 4, cw - 8, bot - top - 8) }
        }
        ctx.strokeStyle = '#2a3346'; ctx.lineWidth = 4
        for (var b = 0; b <= n; b++) { ctx.beginPath(); ctx.moveTo(x1 - b * cw, top); ctx.lineTo(x1 - b * cw, bot); ctx.stroke() }
        ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(1000, top); ctx.stroke()
        // decks above
        ctx.strokeStyle = 'rgba(60,70,90,.35)'; ctx.lineWidth = 2
        for (var d = 80; d < top; d += 20) { ctx.beginPath(); ctx.moveTo(0, d); ctx.lineTo(1000, d); ctx.stroke() }
        ctx.restore()
        // hull paint + outline
        ctx.fillStyle = '#9b2a22'; ctx.beginPath(); ctx.moveTo(40, WL + 18); ctx.lineTo(985, WL + 18); ctx.lineTo(960, 250); ctx.lineTo(90, 250); ctx.quadraticCurveTo(28, 240, 40, WL + 18); ctx.globalAlpha = 0.25; ctx.fill(); ctx.globalAlpha = 1
        ctx.strokeStyle = '#141820'; ctx.lineWidth = 6
        ctx.beginPath(); ctx.moveTo(20, 60); ctx.lineTo(975, 60); ctx.lineTo(1000, 40); ctx.lineTo(960, 250); ctx.lineTo(90, 250); ctx.quadraticCurveTo(10, 240, 20, 60); ctx.closePath(); ctx.stroke()
        // superstructure + funnels
        ctx.fillStyle = '#f3f0e6'; ctx.fillRect(170, 22, 640, 38); ctx.strokeRect(170, 22, 640, 38)
        for (var f = 0; f < 4; f++) { var fx = 690 - f * 150; ctx.fillStyle = '#d6923a'; ctx.beginPath(); ctx.moveTo(fx, 22); ctx.lineTo(fx - 10, -60); ctx.lineTo(fx + 34, -60); ctx.lineTo(fx + 44, 22); ctx.fill(); ctx.fillStyle = '#16161a'; ctx.fillRect(fx - 11, -66, 46, 16) }
        // numbers
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '900 34px Nunito, system-ui, sans-serif'
        for (var c2 = 0; c2 < n; c2++) {
          var num2 = c2 + 1, ccx = x1 - (c2 + 0.5) * cw, hot = answered && num2 <= 5 && sinceA > (num2 - 1) * 0.6
          var sc = hot ? 1 + 0.25 * (1 - sm((num2 - 1) * 0.6, (num2 - 1) * 0.6 + 0.4, sinceA)) : 1
          ctx.save(); ctx.translate(ccx, 185); ctx.scale(sc, sc)
          ctx.fillStyle = hot ? '#FFD166' : num2 <= 5 ? 'rgba(255,255,255,.95)' : 'rgba(40,50,70,.8)'
          ctx.beginPath(); ctx.arc(0, 0, 24, 0, TAU); ctx.fill()
          ctx.fillStyle = hot ? '#3a2400' : num2 <= 5 ? '#0b2a55' : '#e9e4d4'; ctx.fillText(String(num2), 0, 2)
          ctx.restore()
        }
        // outside water line over the hull
        ctx.strokeStyle = 'rgba(140,200,255,.8)'; ctx.lineWidth = 3; ctx.beginPath()
        for (var sx = -600; sx <= 1600; sx += 10) { var sy = WL + sin(sx * 0.03 + now * 1.8) * 3; if (sx === -600) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy) }
        ctx.stroke()
        // gash marker on the starboard bow
        ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.setLineDash([10, 8]); ctx.lineWidth = 3
        ctx.beginPath(); ctx.moveTo(960, 236); ctx.lineTo(x1 - 4.9 * cw, 242); ctx.stroke(); ctx.setLineDash([])
        ctx.restore()
        // legend
        var lg = sm(1, 2, t)
        if (lg > 0) {
          ctx.globalAlpha = lg; ctx.font = '800 ' + Math.round(clamp(w * 0.022, 13, 18)) + 'px Nunito, system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
          var ly = env.portrait ? h * 0.13 : 34, lx = env.portrait ? 18 : 22
          ctx.fillStyle = 'rgba(40,140,230,1)'; ctx.fillRect(lx, ly - 9, 18, 18); ctx.fillStyle = '#dfe8ff'; ctx.fillText('sudah berisi air', lx + 26, ly)
          ctx.fillStyle = 'rgba(90,180,240,1)'; ctx.fillRect(lx, ly + 20, 18, 18); ctx.fillStyle = '#dfe8ff'; ctx.fillText('mulai terisi', lx + 26, ly + 29)
          ctx.globalAlpha = 1
        }
        if (answered && sinceA > 6) env.chip(null)
        vignette(ctx, env, 0.6)
      } }
  }
  function EvacuationTransition (o) {
    o = o || {}
    return { id: 'evacuation', major: true, dur: o.dur || 6.5, fadeIn: 0.6, fadeOut: 0.6,
      mix: { ocean: 0.55, engine: 0, music: 0.35, chord: [220, 277.18, 329.63, 440] },
      cues: [{ t: 0.4, a: 'whoosh' }],
      art: ['tk-scene/titanic-night-deck-land', 'tk-scene/titanic-night-deck-port', ART.lifebuoy],
      subs: [],
      draw: function (ctx, t, env) {
        ctx.save(); stage(ctx, env, 1.06 + t * 0.02, -t * 4, 0, 0.012)
        backdrop(ctx, env, 'titanic-night-deck')
        ctx.restore()
        ctx.fillStyle = 'rgba(2,6,20,' + (0.35 + 0.2 * sm(0, 1.5, t)).toFixed(3) + ')'; ctx.fillRect(0, 0, env.w, env.h)
        vignette(ctx, env, 1)
        var u = min(env.w, env.h)
        spr(ctx, env, ART.lifebuoy, env.w / 2, env.h * 0.44 - u * 0.2, u * 0.16 * pop(t, 0.3, 0.6), { ay: 1, rot: env.rm ? 0 : sin(env.now) * 0.05 })
        if (t > 0.35 && t < 6) env.card('Menuju Dek Sekoci', 'Bab berikutnya: bantu penumpang ke sekoci')
        else env.card(null)
      } }
  }

  /* ── lifeboat + outside at a safe distance ───────────────────────────── */
  // 2D lifeboat (side view) with busts seated behind the gunwale
  function lifeboat2D (ctx, env, cx, cy, bw, t, people, o) {
    o = o || {}
    var bh = bw * 0.2, rock = env.rm ? 0 : sin(env.now * 1.1) * 0.02, bob = env.rm ? 0 : sin(env.now * 1.4) * bw * 0.006
    // people (drawn first; the hull covers their lower half); they bob with the boat, 1:1 blits
    for (var i = 0; i < people.length; i++) {
      var p = people[i]; if (!p) continue
      var ph = bw * (p.back ? 0.24 : 0.28), px0 = p.x * bw
      spr(ctx, env, p.k, cx + px0, cy + bob + px0 * rock - bh * 0.1 + (p.back ? -bh * 0.35 : 0) + (p.dy || 0), ph, { rot: p.rot || 0, flip: p.flip, alpha: p.a })
    }
    ctx.save(); ctx.translate(cx, cy + bob); ctx.rotate(rock)
    // hull
    ctx.fillStyle = '#ece8dc'
    ctx.beginPath(); ctx.moveTo(-bw / 2, -bh * 0.35); ctx.quadraticCurveTo(0, -bh * 0.12, bw / 2, -bh * 0.35)
    ctx.quadraticCurveTo(bw * 0.44, bh * 0.8, bw * 0.3, bh * 0.85); ctx.lineTo(-bw * 0.3, bh * 0.85); ctx.quadraticCurveTo(-bw * 0.44, bh * 0.8, -bw / 2, -bh * 0.35); ctx.fill()
    ctx.strokeStyle = '#6b4020'; ctx.lineWidth = bh * 0.14
    ctx.beginPath(); ctx.moveTo(-bw / 2, -bh * 0.35); ctx.quadraticCurveTo(0, -bh * 0.12, bw / 2, -bh * 0.35); ctx.stroke()
    ctx.strokeStyle = 'rgba(120,80,40,.6)'; ctx.lineWidth = 2
    for (var r2 = 0; r2 < 7; r2++) { var rx = -bw * 0.38 + r2 * bw * 0.126; ctx.beginPath(); ctx.moveTo(rx, -bh * 0.18); ctx.quadraticCurveTo(rx + bw * 0.063, bh * 0.08, rx + bw * 0.126, -bh * 0.18); ctx.stroke() }
    ctx.fillStyle = '#2c2c34'; ctx.font = '900 ' + Math.round(bh * 0.5) + 'px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(o.num || '11', -bw * 0.3, bh * 0.35)
    // lantern on a short pole at the bow
    var lx = bw * 0.42, ly = -bh * 1.6
    ctx.strokeStyle = '#4a2e18'; ctx.lineWidth = bh * 0.08; ctx.beginPath(); ctx.moveTo(bw * 0.45, -bh * 0.3); ctx.lineTo(lx, ly); ctx.stroke()
    var S = sprites(), fl = 0.85 + 0.15 * sin(env.now * 9) * sin(env.now * 3.1)
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 * fl; ctx.drawImage(S.glow, lx - bh * 2.2, ly - bh * 1.2, bh * 4.4, bh * 4.4); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'
    ctx.restore()
    spr(ctx, env, ART.lantern, cx + lx, cy + bob + ly + lx * rock, bh * 1.1, { ay: 0.1 })
    // reflection + ripples
    ctx.globalAlpha = 0.18; ctx.fillStyle = '#ffd48a'; ctx.fillRect(cx + bw * 0.4 - 3, cy + bh * 0.9, 6, bh * 1.5); ctx.globalAlpha = 1
    ctx.strokeStyle = 'rgba(200,225,255,.25)'; ctx.lineWidth = 1.5
    for (var k = 0; k < 3; k++) { var rr = ((env.now * 0.4 + k / 3) % 1); ctx.globalAlpha = 1 - rr; ctx.beginPath(); ctx.ellipse(cx, cy + bh * 0.85, bw * (0.5 + rr * 0.25), bh * (0.2 + rr * 0.15), 0, 0, TAU); ctx.stroke() }
    ctx.globalAlpha = 1
  }
  // small far lifeboat billboard with a lantern
  function farBoat (ctx, env, cam, x, z, s, i) {
    var p = [0, 0], d = proj(cam, x, 0, z, p, 0); if (d < 0) return
    var bw = cam.f * 4.2 * s / d, bh = bw * 0.22, bob = env.rm ? 0 : sin(env.now * 1.3 + i) * bh * 0.15
    if (bw < 2) return
    ctx.fillStyle = '#d9d6cc'; ctx.beginPath(); ctx.moveTo(p[0] - bw / 2, p[1] - bh * 0.4 + bob); ctx.lineTo(p[0] + bw / 2, p[1] - bh * 0.4 + bob); ctx.lineTo(p[0] + bw * 0.35, p[1] + bh * 0.3 + bob); ctx.lineTo(p[0] - bw * 0.35, p[1] + bh * 0.3 + bob); ctx.fill()
    ctx.fillStyle = '#3a3040'
    for (var k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(p[0] - bw * 0.3 + k * bw * 0.2, p[1] - bh * 0.6 + bob, bh * 0.35, 0, TAU); ctx.fill() }
    var S = sprites(), g = bh * 3
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7; ctx.drawImage(S.glow, p[0] + bw * 0.4 - g / 2, p[1] - bh * 1.4 + bob - g / 2, g, g); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#ffe2a0'; ctx.fillRect(p[0] + bw * 0.4 - 1.5, p[1] - bh * 1.4 + bob - 1.5, 3, 3)
    ctx.globalAlpha = 0.2; ctx.fillStyle = '#ffd48a'; ctx.fillRect(p[0] + bw * 0.4 - 1, p[1] + bh * 0.3 + bob, 2, bh * 2.5); ctx.globalAlpha = 1
  }
  var SEAT_Q = { prompt: 'Sekoci punya 20 kursi. 14 sudah terisi. Berapa kursi yang masih kosong?', choices: [5, 6, 7], answer: 6, explain: '20 − 14 = 6' }
  function seatPanel (ctx, env, filled, lit, t) {
    var u = min(env.w, env.h), r = clamp(u * 0.022, 9, 16), gap = r * 2.6, cols = 10
    var pw = cols * gap + r, x0 = env.w / 2 - pw / 2 + r, y0 = env.portrait ? env.h * 0.13 : env.h * 0.12
    ctx.fillStyle = 'rgba(6,12,30,.6)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x0 - r * 1.8, y0 - r * 2, pw + r * 1.6, gap + r * 4, r * 1.4) : ctx.rect(x0 - r * 1.8, y0 - r * 2, pw + r * 1.6, gap + r * 4); ctx.fill()
    for (var i = 0; i < 20; i++) {
      var cx = x0 + (i % cols) * gap, cy = y0 + Math.floor(i / cols) * gap
      var on = i < filled, li = i >= filled && i < filled + lit.length ? lit[i - filled] : 0
      ctx.beginPath(); ctx.arc(cx, cy, r * (1 + 0.35 * li * (1 - min(1, li))), 0, TAU)
      if (on) { ctx.fillStyle = '#FF9F6B'; ctx.fill() } else if (li > 0) { ctx.fillStyle = 'rgba(255,209,102,' + min(1, li).toFixed(3) + ')'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke() } else { ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2; ctx.stroke() }
    }
  }
  function LifeboatView (o) {
    o = o || {}
    var q = o.question || SEAT_Q, QA = 6.5
    var base = [{ k: ART.officerGirl, x: 0.3, back: 1 }, { k: ART.girl, x: -0.08 }, { k: ART.timmy, x: 0.1 }]
    var boarders = [{ k: ART.officer, x: -0.3, back: 1 }, { k: ART.girl3, x: -0.12, back: 1 }, { k: ART.lanternBoy, x: 0.08, back: 1 }, { k: ART.girl4, x: -0.34 }, { k: ART.explorer, x: 0.28 }, { k: ART.mechanic, x: 0.44, back: 1 }]
    return { id: 'lifeboat', major: true, dur: o.dur || 19, fadeIn: 0.8,
      mix: { ocean: 0.6, engine: 0, music: 0.28, chord: [220, 261.63, 329.63, 392] },
      question: { at: QA, prompt: q.prompt, choices: q.choices, answer: q.answer, explain: q.explain, kind: 'seats' },
      cues: [{ t: QA + 0.9, a: 'pop' }, { t: QA + 1.5, a: 'pop' }, { t: QA + 2.1, a: 'pop' }, { t: QA + 2.7, a: 'pop' }, { t: QA + 3.3, a: 'pop' }, { t: QA + 3.9, a: 'pop' }, { t: 15.4, a: 'splash' }],
      art: [ART.officerGirl, ART.girl, ART.timmy, ART.officer, ART.girl3, ART.lanternBoy, ART.girl4, ART.explorer, ART.mechanic, ART.lantern],
      subs: o.subs || [sub(0.9, 'Awak kapal', 'Anak-anak dan keluarga naik sekoci lebih dulu.'),
        sub(3.4, 'Timmy', 'Aku sudah duduk di sekoci nomor 11 bersama Aisyah!'),
        sub(QA + 5, 'Aisyah', 'Sekarang semua kursi terisi. Kita memakai jaket pelampung.'),
        sub(QA + 9, 'Awak kapal', 'Dayung pelan-pelan, kita menjauh dari kapal besar.')],
      draw: function (ctx, t, env) {
        var cam = env.cam, w = env.w, h = env.h
        lookAt(cam, env, [0, 2.2, -150], [6, 9, 0], 0, env.portrait ? 1.35 : 1.25, env.portrait ? 0.5 : 0.52)
        drawSea(ctx, env, cam, NIGHT, { moonDir: [-0.34, 0.3, 0.9], glint: 1.2 })
        env.R.begin(cam, NIGHT.light)
        env.R.mesh(buildShip(), shipXfs({ x: 8, z: 0, y: -0.6, yaw: PI / 2, pitch: 0.035, roll: -0.01 }), { clip: 1, lights: 1 })
        env.R.flush(ctx)
        drawHaze(ctx, env, cam, NIGHT, 0.7)
        farBoat(ctx, env, cam, -30, -70, 1, 1); farBoat(ctx, env, cam, 40, -55, 1, 2)
        // our boat: rows away at the end
        var away = eio(sm(QA + 8.5, 19, t)), bw = min(w * 0.8, h * 0.78) * (1 - away * 0.25)
        var bx = w * 0.5 - away * w * 0.15, by = h * (env.portrait ? 0.74 : 0.76)
        var people = base.slice(), sinceA = env.answered ? t - QA : -1
        for (var i = 0; i < boarders.length; i++) {
          var tb = 0.9 + i * 0.6
          if (sinceA < tb) continue
          var k = eio(sm(tb, tb + 0.7, sinceA)), b = boarders[i]
          people.push({ k: b.k, x: lerp(0.75, b.x, k), back: b.back, dy: -sin(k * PI) * bw * 0.12 - (1 - k) * bw * 0.05, rot: (1 - k) * -0.3 })
        }
        people.sort(function (a, c) { return (c.back ? 1 : 0) - (a.back ? 1 : 0) })
        // rope ladder from the ship's side (off-frame right) while people board
        var lad = sm(QA - 0.5, QA + 0.5, t) * (1 - sm(QA + 5, QA + 6, t))
        if (lad > 0) {
          ctx.strokeStyle = 'rgba(190,150,100,' + lad.toFixed(3) + ')'; ctx.lineWidth = 3
          var lx = bx + bw * 0.6, ly = by - bw * 0.1
          ctx.beginPath(); ctx.moveTo(lx, -10); ctx.lineTo(lx, ly); ctx.moveTo(lx + 26, -10); ctx.lineTo(lx + 26, ly)
          for (var r2 = 0; r2 < ly; r2 += 26) { ctx.moveTo(lx, r2); ctx.lineTo(lx + 26, r2) }
          ctx.stroke()
        }
        lifeboat2D(ctx, env, bx, by, bw, t, people)
        // oars once full
        var ro = sm(QA + 8.5, QA + 9.5, t)
        if (ro > 0) {
          var oa = env.rm ? 0.1 : sin(env.now * 2) * 0.35
          ctx.strokeStyle = 'rgba(120,80,40,' + ro.toFixed(3) + ')'; ctx.lineWidth = bw * 0.012
          for (var s2 = -1; s2 <= 1; s2 += 2) { ctx.beginPath(); ctx.moveTo(bx + s2 * bw * 0.15, by - bw * 0.04); ctx.lineTo(bx + s2 * bw * 0.15 + cos(oa + 1.2) * bw * 0.22 * s2, by + bw * 0.1 + sin(oa) * bw * 0.03); ctx.stroke() }
        }
        drawDrift(ctx, env, cam, 0.7)
        vignette(ctx, env, 0.9)
        // seat indicator: 14 filled; after the answer six seats light one by one
        var lit = []
        for (var j = 0; j < 6; j++) lit.push(sinceA >= 0 ? sm(0.9 + j * 0.6, 1.3 + j * 0.6, sinceA) * 1.2 : 0)
        var pa = sm(4.8, 5.6, t) * (1 - sm(QA + 7, QA + 8, t))
        if (pa > 0) { ctx.globalAlpha = pa; seatPanel(ctx, env, 14, lit, t); ctx.globalAlpha = 1 }
        if (sinceA > 5.5) env.chip(null)
      } }
  }
  // ship pose over the break (B = 0..26) and descent (B = 26..42)
  function breakPose (B) {
    var bowDown = 0.03 + 0.2 * sm(0, 20, B)
    var dy = -0.8 - 3.6 * sm(0, 22, B)
    var split = sm(17, 19, B)
    var pose = { x: 0, z: 0, y: dy, yaw: PI / 2, pitch: bowDown, roll: -0.02 * sm(4, 16, B) }
    if (split > 0) {
      pose.s1 = { pitch: 0.4 * sm(17, 25, B), dy: -9 * sm(18, 29, B), dz: 1.5 * split }
      var settle = -0.2 * sm(17, 20.5, B), rise = 1.3 * sm(22, 33, B)
      pose.s0 = { pitch: settle + rise, dy: 0.8 * sm(17, 20, B) - 1.5 * sm(22, 30, B) - 34 * sm(33, 41, B), dz: -0.8 * split }
    }
    pose.split = split
    return pose
  }
  function breakLights (B) { return B < 8 ? 1 : B < 13 ? 0.6 : 0 }
  function outsideFromBoat (ctx, env, B, t, o) {
    var cam = env.cam, P = breakPose(B)
    var push = o.push || 0
    lookAt(cam, env, [-4 + push * 4, 2.6, -92 + push * 14], [2, 9 - push * 2, 0], env.rm ? 0 : sin(env.now * 0.7) * 0.01, env.portrait ? 0.95 : 1.1, env.portrait ? 0.44 : 0.5)
    drawSea(ctx, env, cam, NIGHT, { moonDir: [-0.4, 0.26, 0.88], glint: 1.1 })
    env.R.begin(cam, NIGHT.light)
    var jit = !env.rm && B > 13.5 && B < 17.5 ? sin(env.now * 40) * 0.025 : 0
    P.z += jit
    var L = breakLights(B)
    env.R.mesh(buildShip(), shipXfs(P), { clip: 1, split: P.split > 0.001, lights: L,
      flick: B >= 8 && B < 13 ? function (i) { var n = Math.floor(env.now * 12); return hash(i * 3.1 + n) > 0.35 + (B - 8) * 0.1 ? 1 : 0.1 } : null })
    var floe = buildFloe(), FL = o.floes
    for (var i = 0; i < FL.length; i++) { var f = FL[i]; env.R.mesh(floe, xf(f[0], sin(env.now * 0.8 + i) * 0.06, f[1], f[3], sin(env.now * 0.6 + i) * 0.05, 0, f[2]), { clip: 1 }) }
    env.R.flush(ctx)
    // foam where the hull meets the sea; subtle sparks at the break while the lights fail
    var E = env.s.parts || (env.s.parts = Parts())
    env.s.fa = (env.s.fa || 0) + env.dt
    if (env.s.fa > 0.12 && B < 40) {
      env.s.fa = 0
      emit(E, env, 'foam', (Math.random() - 0.5) * 50, 0.02, (Math.random() - 0.5) * 6, 1, 1, [0, 0, 0, 0, 0])
      if (B > 16.5 && B < 21) emit(E, env, 'spray', SPLIT, 1, -2, 4, 3, [0, 3, 0, 2, 2])
      if (B > 9 && B < 17.5 && Math.random() < 0.35) emit(E, env, 'spark', SPLIT + (Math.random() - 0.5) * 3, 6 + Math.random() * 3, -3.6, 1, 0.3, [0, 1.5, 0, 2, 1])
    }
    drawParts(ctx, env, cam, E, NIGHT)
    drawHaze(ctx, env, cam, NIGHT, 0.8)
    for (var b = 0; b < o.boats.length; b++) { var bb = o.boats[b]; farBoat(ctx, env, cam, bb[0], bb[1], bb[2], b) }
    drawDrift(ctx, env, cam, 0.8)
    // foreground: our boat's bow edge with the lantern + Timmy and Aisyah watching
    var w = env.w, h = env.h, u = min(w, h), rock = env.rm ? 0 : sin(env.now * 1.1) * 0.015
    ctx.save(); ctx.translate(w * 0.5, h * 1.02); ctx.rotate(rock)
    ctx.fillStyle = '#e8e3d6'; ctx.beginPath(); ctx.moveTo(-w * 0.7, -h * 0.02); ctx.quadraticCurveTo(0, -h * 0.13, w * 0.7, -h * 0.02); ctx.lineTo(w * 0.7, h * 0.2); ctx.lineTo(-w * 0.7, h * 0.2); ctx.fill()
    ctx.strokeStyle = '#6b4020'; ctx.lineWidth = u * 0.03; ctx.beginPath(); ctx.moveTo(-w * 0.7, -h * 0.02); ctx.quadraticCurveTo(0, -h * 0.13, w * 0.7, -h * 0.02); ctx.stroke()
    ctx.restore()
    var ph = u * (env.portrait ? 0.24 : 0.27)
    var ky = env.portrait ? h * 0.86 : h * 0.96
    spr(ctx, env, ART.girl, w * (env.portrait ? 0.24 : 0.12), ky + rock * 200, ph)
    spr(ctx, env, ART.timmy, w * (env.portrait ? 0.76 : 0.86), ky - rock * 200, ph * 1.08, { flip: true })
    vignette(ctx, env, 1)
    return P
  }
  function breakSet () {
    var r = rng(77), floes = [], boats = []
    for (var i = 0; i < 12; i++) floes.push([(r() - 0.5) * 100, -70 + r() * 50, 0.8 + r() * 1.6, r() * TAU])
    boats.push([-48, -40, 1], [58, -30, 1], [-20, -18, 0.9], [30, -80, 1])
    return { floes: floes, boats: boats }
  }
  var BSET = null
  function ShipBreakSequence (o) {
    o = o || {}
    return { id: 'shipbreak', dur: o.dur || 26, fadeIn: 0.9, fadeOut: 0,
      mix: { ocean: 0.55, engine: 0, music: 0.2, chord: [174.61, 220, 261.63, 329.63] },
      cues: [{ t: 10, a: 'creak' }, { t: 13.5, a: 'creak' }, { t: 16.2, a: 'creak' }, { t: 17.2, a: 'thud' }, { t: 17.4, a: 'splash' }, { t: 13, mix: { music: 0.08 } }],
      art: [ART.girl, ART.timmy, ART.lantern],
      subs: o.subs || [sub(1, 'Timmy', 'Kapalnya masih terang… tapi haluannya makin rendah.'),
        sub(6.5, 'Aisyah', 'Kita aman di sekoci. Pegang tanganku, Timmy.'),
        sub(12.5, 'Narator', 'Lampu-lampu padam. Kapal yang sangat berat itu mulai terbelah menjadi dua.'),
        sub(19.5, 'Narator', 'Bagian depan turun lebih dulu. Bagian belakang kembali datar sebentar.')],
      draw: function (ctx, t, env) {
        BSET = BSET || breakSet()
        outsideFromBoat(ctx, env, t, t, { floes: BSET.floes, boats: BSET.boats, push: eio(sm(0, 26, t)) * 0.5 })
      } }
  }
  function FinalDescent (o) {
    o = o || {}
    return { id: 'descent', major: true, dur: o.dur || 16, fadeIn: 0, fadeOut: 1.4,
      mix: { ocean: 0.45, engine: 0, music: 0.12 },
      cues: [{ t: 2, a: 'creak' }, { t: 8.5, a: 'splash' }, { t: 10, mix: { music: 0, ocean: 0.3 } }],
      art: [ART.girl, ART.timmy],
      subs: o.subs || [sub(0.8, 'Narator', 'Bagian belakang kapal terangkat tinggi, lalu perlahan turun ke dalam laut.'),
        sub(9.2, 'Narator', 'Laut menjadi sunyi. Kita mengenang semua penumpang dan awak Titanic.'),
        sub(13, 'Timmy', 'Aku akan selalu ingat malam ini.')],
      draw: function (ctx, t, env) {
        BSET = BSET || breakSet()
        outsideFromBoat(ctx, env, 26 + t, t, { floes: BSET.floes, boats: BSET.boats, push: 0.5 + 0.2 * eio(sm(0, 16, t)) })
      } }
  }
  function RescueDawn (o) {
    o = o || {}
    return { id: 'rescue', major: true, dur: o.dur || 22, fadeIn: 1.5, fadeOut: 1.2,
      mix: { ocean: 0.3, engine: 0, music: 0 },
      cues: [{ t: 8.6, a: 'horn' }, { t: 14.5, a: 'horn' }, { t: 12, mix: { music: 0.35, chord: [261.63, 329.63, 392, 523.25] } }],
      art: [ART.timmy, ART.girl, ART.rescue, ART.lantern],
      subs: o.subs || [sub(2, 'Narator', 'Semua sunyi. Bintang-bintang bersinar, lentera sekoci menyala.'),
        sub(6, 'Timmy', 'Lihat! Ada lampu di ujung laut!'),
        sub(9.4, 'Timmy', 'Kapal penolong datang!', 3.6),
        sub(13.4, 'Narator', 'Kapal Carpathia datang. Orang-orang di sekoci dibawa naik dengan selamat.'),
        sub(18, 'Narator', 'Pagi pun tiba. Kita selalu mengenang kisah Titanic.')],
      draw: function (ctx, t, env) {
        var cam = env.cam, w = env.w, h = env.h, k = eio(sm(3, 19, t))
        var look = mixLook(NIGHT, DAWN, k)
        lookAt(cam, env, [0, 2.4, -40], [0, 6 - k * 1.5, 200], env.rm ? 0 : sin(env.now * 0.6) * 0.008, env.portrait ? 1.1 : 1, env.portrait ? 0.46 : 0.5)
        drawSea(ctx, env, cam, look, { moonDir: [-0.7, 0.4 - k * 0.3, 0.6], glint: 1 })
        // sunrise glow on the horizon
        var sp = projDir(cam, 0.25, 0.01 + 0.03 * k, 1)
        void sp   // the sunrise glow is part of the dawn sky layer
        // the rescue ship on the horizon: lights first, then a silhouette in the dawn
        var sx = projDir(cam, -0.08, 0.004, 1)
        if (sx) {
          var near = eio(sm(6, 22, t)), sw = w * (0.08 + 0.07 * near) * (env.portrait ? 1.6 : 1)
          var im = env.art.tinted(ART.rescue, 'rgb(10,14,30)', 0.85)
          if (im) { var sh = sw * im.height / im.width; ctx.globalAlpha = sm(4, 9, t); ctx.drawImage(im, sx[0] - sw / 2, sx[1] - sh * 0.92, sw, sh); ctx.globalAlpha = 1 }
          var lf = sm(4.5, 6.5, t) * (1 - 0.6 * k)
          if (lf > 0) {
            ctx.globalCompositeOperation = 'lighter'
            for (var li = 0; li < 7; li++) { var lx = sx[0] - sw * 0.4 + li * sw * 0.13, ly = sx[1] - sw * 0.07 - (li % 3 === 1 ? sw * 0.05 : 0); ctx.globalAlpha = lf * (0.7 + 0.3 * sin(env.now * 3 + li)); ctx.fillStyle = '#ffe1a0'; ctx.fillRect(lx - 1.5, ly - 1.5, 3, 3); ctx.globalAlpha = lf * 0.25; ctx.fillRect(lx - 4, ly - 4, 8, 8) }
            ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'
          }
          // a signal flare arcs up once, softly
          var fk = (t - 7) / 2.5
          if (fk > 0 && fk < 1) { ctx.fillStyle = 'rgba(210,255,220,' + (1 - fk).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(sx[0] + sw * 0.2, sx[1] - sw * 0.1 - fk * h * 0.18, 2.5, 0, TAU); ctx.fill() }
        }
        env.R.begin(cam, look.light)
        var floe = buildFloe(), r = rng(5)
        for (var i = 0; i < 10; i++) { var fx = (r() - 0.5) * 90, fz = 10 + r() * 110; env.R.mesh(floe, xf(fx, sin(env.now * 0.7 + i) * 0.05, fz, r() * TAU, 0, 0, 0.8 + r() * 1.6), { clip: 1 }) }
        env.R.flush(ctx)
        drawHaze(ctx, env, cam, look, 1)
        var boats = [[-26, 40, 1], [22, 60, 1], [-8, 90, 1.1], [34, 26, 0.9]]
        for (var b = 0; b < boats.length; b++) farBoat(ctx, env, cam, boats[b][0], boats[b][1], boats[b][2], b)
        // foreground: our lifeboat, Timmy looking toward the horizon
        var bw = min(w * 0.92, h * 0.9)
        lifeboat2D(ctx, env, w * 0.46, h * (env.portrait ? 0.86 : 0.9), bw, t, [{ k: ART.girl, x: -0.2, back: 1 }, { k: ART.timmy, x: 0.05 }])
        drawDrift(ctx, env, cam, 0.5 * (1 - k))
        vignette(ctx, env, 0.9 - 0.3 * k)
      } }
  }

  function PART_A () { return [IceFieldApproach(), LookoutWarning(), AssistedSteering(), IcebergImpact(), InteriorReaction(), FloodingCutaway(), EvacuationTransition()] }
  function PART_B () { return [LifeboatView(), ShipBreakSequence(), FinalDescent(), RescueDawn()] }
  function TitanicFinalSequence () { return PART_A().concat(PART_B()) }

  W.TKCinema = {
    version: '1.0.0',
    play: play,
    BAD_WORDS: BAD_WORDS,
    TITANIC: {
      IceFieldApproach: IceFieldApproach, LookoutWarning: LookoutWarning, AssistedSteering: AssistedSteering, IcebergImpact: IcebergImpact,
      InteriorReaction: InteriorReaction, FloodingCutaway: FloodingCutaway, EvacuationTransition: EvacuationTransition, LifeboatView: LifeboatView,
      ShipBreakSequence: ShipBreakSequence, FinalDescent: FinalDescent, RescueDawn: RescueDawn,
      TitanicFinalSequence: TitanicFinalSequence, PART_A: PART_A(), PART_B: PART_B(), FULL: TitanicFinalSequence(),
      QUESTIONS: { flood: Q_FLOOD, seats: SEAT_Q }
    },
    // engine pieces for other ships' cinematics
    lib: { voyage: voyage, buildShip: buildShip, buildBerg: buildBerg, drawSea: drawSea, NIGHT: NIGHT, DAWN: DAWN, mixLook: mixLook }
  }
})(window)
