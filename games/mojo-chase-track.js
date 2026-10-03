/* =============================================================================
 * mojo-chase-track.js — window.MojoChaseTrack: the pseudo-3D rear-chase WORLD for the G31 chase.
 *
 * Owner architecture (2026-10-03): an ENDLESS MODULAR TRACK. A fixed RING of road segments runs from the camera
 * to the vanishing point; segments that pass behind the camera are recycled to the front and filled by the stage
 * sequencer (data/mojo-chases.js). Lanes, obstacles and pickups bind to a segment index, so they follow curves
 * and hills. Classic segment projection (curves = accumulated dx, hills = segment y, clip by max y), fog to the
 * horizon, 4 parallax layers with explicit forward factors FAR 0.05 / MID 0.20 / ROADSIDE 0.70 / ROAD 1.00
 * (plus a lateral offset with curvature and a vertical offset with hills).
 * No per-frame allocation: colour ramps (fog levels) are built once per stage, projections are written into the
 * segment objects of the ring, strips and silhouettes are pre-rendered canvases.
 * ==========================================================================*/
(function (W) {
  'use strict'
  var SEG = 200, ROADW = 1600, CAM_H = 950, RING = 360, FOG_LEVELS = 24
  var LANES = [-0.62, 0, 0.62]
  var FACTORS = { far: 0.05, mid: 0.20, roadside: 0.70, road: 1.00 }

  /* ── biome looks (reference: owner track sheets S1-S8, V1-V4, roadside props) ─────────────────────── */
  var BIOME = {
    coastal: { grass: ['#6cc24a', '#5cb33c'], shoulder: ['#d9c79a', '#cdb98a'], road: ['#5d6470', '#575e69'], kerb: ['#e53935', '#f5f5f5'], line: '#ffffff', rail: 'metal',
      props: [['palm', 4, 2.0, 1000], ['tree-round', 2, 2.4, 1150], ['bush', 2, 1.7, 600], ['rocks', 1, 2.2, 700], ['lamp', 2, 1.45, 330], ['planter', 1, 1.8, 700]] },
    town: { grass: ['#78c850', '#6abb44'], shoulder: ['#c9c2b8', '#bdb6ac'], road: ['#5a606b', '#545a64'], kerb: ['#e53935', '#f5f5f5'], line: '#ffffff', rail: 'none',
      props: [['lamp', 4, 1.4, 330], ['planter', 2, 1.7, 700], ['hedge', 2, 1.8, 800], ['tree-small', 2, 2.0, 800], ['banner-blue', 1, 1.5, 300], ['banner-red', 1, 1.5, 300], ['stone-wall', 1, 1.9, 600]] },
    forest: { grass: ['#4f9e3a', '#46913a'], shoulder: ['#8a6a44', '#7d603e'], road: ['#5b616a', '#555b64'], kerb: ['#f5f5f5', '#3b3b3b'], line: '#ffffff', rail: 'wood',
      props: [['pine', 6, 2.2, 900], ['tree-round', 2, 2.6, 1150], ['bush', 2, 1.7, 600], ['rocks', 1, 2.0, 700], ['boulders', 1, 2.6, 1000]] },
    desert: { grass: ['#e7b76a', '#dda95e'], shoulder: ['#d89a55', '#cf8f4b'], road: ['#646068', '#5e5a62'], kerb: ['#ffffff', '#c62828'], line: '#ffd23f', rail: 'wood',
      props: [['cactus', 5, 2.0, 600], ['cactus-2', 2, 2.4, 500], ['rock', 2, 2.0, 700], ['boulders', 2, 2.8, 1000], ['sign', 1, 1.6, 700]] },
    snow: { grass: ['#eef6ff', '#e3eefa'], shoulder: ['#f7fbff', '#e9f2fb'], road: ['#5f6774', '#59616d'], kerb: ['#e53935', '#f5f5f5'], line: '#ffffff', rail: 'snowbank',
      props: [['snow-pine', 6, 2.2, 900], ['snow-pine', 2, 3.0, 900], ['rocks', 1, 2.0, 700], ['lamp', 1, 1.45, 330]] },
    construction: { grass: ['#a6b05a', '#98a24f'], shoulder: ['#b7a27c', '#ab9670'], road: ['#5c626c', '#565c66'], kerb: ['#ffc107', '#212121'], line: '#ffffff', rail: 'jersey',
      props: [['jersey', 3, 1.5, 700], ['chevron-board', 2, 1.45, 500], ['cone', 2, 1.4, 300], ['tyres-3', 1, 1.6, 450], ['barrel-oil', 1, 1.6, 300], ['rocks', 1, 2.2, 700]] },
    farm: { grass: ['#8dcb4f', '#7fbd44'], shoulder: ['#c8a46a', '#bd995f'], road: ['#5f656e', '#596068'], kerb: ['#f5f5f5', '#8d6e63'], line: '#ffffff', rail: 'wood',
      props: [['hay', 3, 1.8, 700], ['windmill', 1, 2.8, 1100], ['tree-round', 2, 2.4, 1150], ['bush', 2, 1.7, 600], ['rail-wood', 1, 1.55, 900], ['fence', 1, 1.5, 900]] },
    city: { grass: ['#33405a', '#2d3950'], shoulder: ['#4a5068', '#444a60'], road: ['#2f3442', '#2b303d'], kerb: ['#e53935', '#e8e8f0'], line: '#e8ecff', rail: 'metal',
      props: [['lamp', 5, 1.4, 330], ['planter', 1, 1.7, 700], ['banner-blue', 1, 1.5, 300], ['hedge', 1, 1.8, 800]] }
  }
  // prop key -> asset key (owner art; the larger chase-sheet copy wins duplicates)
  var PROP_KEY = { palm: 'mojo-chase/props/palm', 'tree-round': 'mojo-chase/props/tree-round', bush: 'mojo-chase/props/bush', rocks: 'mojo-chase/props/rocks',
    lamp: 'mojo-chase/props/lamp', planter: 'mojo-chase/props/planter', hedge: 'mojo-chase/props/hedge', 'tree-small': 'mojo-chase/props/tree-small',
    'banner-blue': 'mojo-chase/props/banner-blue', 'banner-red': 'mojo-chase/props/banner-red', 'stone-wall': 'mojo-chase/props/stone-wall',
    pine: 'mojo-chase/props/pine', boulders: 'mojo-chase/props/boulders', cactus: 'mojo-chase/props/cactus', 'cactus-2': 'mojo-chase/props/cactus-2',
    rock: 'mojo-chase/props/rock', sign: 'mojo-chase/props/sign', 'snow-pine': 'mojo-chase/props/snow-pine', jersey: 'mojo-chase/props/jersey',
    'chevron-board': 'mojo-chase/signs/chevron-board', cone: 'mojo-chase/items/cone', 'tyres-3': 'mojo-chase/items/tyres-3', 'barrel-oil': 'mojo-chase/props/barrel-oil',
    hay: 'mojo-chase/props/hay', windmill: 'mojo-chase/props/windmill', 'rail-wood': 'mojo-chase/props/rail-wood', fence: 'mojo-chase/props/fence',
    'chevron-yellow': 'mojo-chase/signs/chevron-yellow', 'chevron-red': 'mojo-chase/signs/chevron-red', swoppiton: 'mojo-chase/signs/swoppiton',
    billboard: 'mojo-chase/signs/billboard', gantry: 'mojo-chase/signs/gantry', finish: 'mojo-chase/signs/finish', 'flag-checker': 'mojo-chase/signs/flag-checker',
    guardrail: 'mojo-chase/props/guardrail' }

  function clamp (v, a, b) { return v < a ? a : v > b ? b : v }
  function easeInOut (a, b, t) { return a + (b - a) * ((-Math.cos(t * Math.PI) / 2) + 0.5) }
  function hex (c) { return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)] }
  function mix (a, b, t) { var x = hex(a), y = hex(b); return 'rgb(' + Math.round(x[0] + (y[0] - x[0]) * t) + ',' + Math.round(x[1] + (y[1] - x[1]) * t) + ',' + Math.round(x[2] + (y[2] - x[2]) * t) + ')' }
  function ramp (c, fog) { var o = []; for (var i = 0; i < FOG_LEVELS; i++) o.push(mix(c, fog, Math.pow(i / (FOG_LEVELS - 1), 1.6) * 0.92)); return o }
  function darken (c, k) { var x = hex(c); return '#' + x.map(function (v) { var s = Math.round(v * k).toString(16); return s.length < 2 ? '0' + s : s }).join('') }

  /* ── the track: a ring of segments fed by the sequencer ─────────────────────────────────────────── */
  function create (stage, seed, opts) {
    opts = opts || {}
    var CH = W.MojoChases, seq = CH.sequencer(stage, seed || 1), r = CH.rng((seed || 1) * 7 + 3)
    var biome = BIOME[stage.biome] || BIOME.coastal, night = !!stage.night
    var ring = new Array(RING), made = 0, queue = [], lastY = 0
    var pieceAt = 0, piece = null, pieceStart = 0, pieceY0 = 0
    for (var k = 0; k < RING; k++) ring[k] = { i: -1, curve: 0, y1: 0, y2: 0, p1: { x: 0, y: 0, w: 0, s: 0 }, p2: { x: 0, y: 0, w: 0, s: 0 }, clip: 0, fog: 0,
      props: [], nProps: 0, objs: [], surface: '', tunnel: false, tunnelEntry: false, tunnelExit: false, bridge: false, tower: false, chev: '', lamp: false, finish: false, kerb: 0, piece: '', gantry: false }
    function nextPiece () {
      while (queue.length < 3) queue.push(seq.next())
      return queue.shift()
    }
    function propSlot (seg, key, side, off, size) {
      if (seg.nProps >= 4) return
      var p = seg.props[seg.nProps] || (seg.props[seg.nProps] = { key: '', side: 0, off: 0, size: 0, flip: false })
      p.key = key; p.side = side; p.off = off; p.size = size; p.flip = side < 0 && /chevron/.test(key) ? false : false
      seg.nProps++
    }
    var pool = biome.props, total = 0
    pool.forEach(function (p) { total += p[1] })
    function pickProp () { var x = r() * total; for (var i = 0; i < pool.length; i++) { x -= pool[i][1]; if (x <= 0) return pool[i] } return pool[0] }
    function build (i) {
      if (!piece || i - pieceStart >= piece.len) {
        pieceY0 = lastY; pieceStart = i
        var id = nextPiece(); piece = CH.PIECES[id]; piece.id = id; pieceAt++
      }
      var seg = ring[i % RING], t = (i - pieceStart) / piece.len, cv = piece.curve
      seg.i = i; seg.nProps = 0; seg.objs.length = 0; seg.piece = piece.id
      // curve eases in over the first 20% and out over the last 20%; an S-curve flips sign halfway
      var e = t < 0.2 ? t / 0.2 : t > 0.8 ? (1 - t) / 0.2 : 1
      if (piece.s) cv = t < 0.5 ? cv : -cv
      seg.curve = cv * clamp(e, 0, 1)
      seg.y1 = lastY
      seg.y2 = pieceY0 + easeInOut(0, piece.hill || 0, (i - pieceStart + 1) / piece.len)
      lastY = seg.y2
      seg.surface = piece.surface || (stage.biome === 'snow' ? 'snow' : '')
      seg.tunnel = piece.surface === 'tunnel'; seg.tunnelEntry = seg.tunnel && i === pieceStart; seg.tunnelExit = seg.tunnel && i === pieceStart + piece.len - 1
      seg.bridge = piece.surface === 'bridge'; seg.tower = seg.bridge && ((i - pieceStart) % 45 === 8)
      seg.finish = false; seg.gantry = false
      seg.kerb = Math.floor(i / 3) % 2
      // chevrons: the last 18 segments BEFORE a curve and its first third, on the OUTSIDE edge, pointing into the bend
      seg.chev = ''
      var nxt = queue[0] && CH.PIECES[queue[0]]
      if (piece.chevron && t < 0.34) seg.chev = piece.chevron
      else if (nxt && nxt.chevron && piece.len - (i - pieceStart) <= 18) seg.chev = nxt.chevron
      // lamps (night stages, lamp pieces, tunnels have their own ceiling lights)
      seg.lamp = !seg.tunnel && (night || piece.deco === 'lamps') && i % 14 === 0
      // roadside props (both sides, sparse, from the biome pool)
      if (!seg.tunnel && !seg.bridge) {
        if (seg.chev && i % 6 === 0) propSlot(seg, opts.chevronKey || 'chevron-yellow', seg.chev === 'left' ? 1 : -1, 1.3, 420)
        if (seg.lamp) { propSlot(seg, 'lamp', -1, 1.4, 330); propSlot(seg, 'lamp', 1, 1.4, 330) }
        if (i % 5 === 0) { var a = pickProp(); propSlot(seg, a[0], r() < 0.5 ? -1 : 1, a[2] + r() * 1.1, a[3] * (0.85 + r() * 0.3)) }
        if (i % 9 === 4) { var b2 = pickProp(); propSlot(seg, b2[0], r() < 0.5 ? -1 : 1, b2[2] + 1.2 + r() * 2.2, b2[3]) }
        if (i % 160 === 70) propSlot(seg, r() < 0.5 ? 'billboard' : 'swoppiton', r() < 0.5 ? -1 : 1, 2.0, 1500)
      }
      made++
      return seg
    }
    var track = {
      stage: stage, biome: biome, night: night, SEG: SEG, ROADW: ROADW, LANES: LANES, RING: RING, FACTORS: FACTORS, PROP_KEY: PROP_KEY,
      base: 0, top: -1, made: function () { return made },
      /** make sure segments [from, from+RING) exist; older ones are recycled (overwritten) — constant memory */
      ensure: function (from) {
        while (track.top < from + RING - 1) { track.top++; build(track.top) }
        track.base = Math.max(0, track.top - RING + 1)
      },
      seg: function (i) { var s = ring[((i % RING) + RING) % RING]; return s.i === i ? s : null },
      ring: ring, pieceCount: function () { return pieceAt },
      yAt: function (z) { var i = Math.floor(z / SEG), s = track.seg(i); if (!s) return 0; var t = (z - i * SEG) / SEG; return s.y1 + (s.y2 - s.y1) * t },
      /** place the FINISH arch (capture point) and a gantry (education lane hint) on a segment */
      mark: function (i, what) { var s = track.seg(i); if (s) s[what] = true },
      // chevron audit for the gate: every chevron precedes (or sits on) a curve of the same direction
      chevronAudit: function () {
        var bad = 0, checked = 0
        for (var i = track.base; i <= track.top - 40; i++) {
          var s = track.seg(i); if (!s || !s.chev) continue
          checked++
          var ok = false
          for (var j = i; j < i + 40; j++) { var q = track.seg(j); if (q && Math.abs(q.curve) > 0.2 && (q.curve < 0) === (s.chev === 'left')) { ok = true; break } }
          if (!ok) bad++
        }
        return { checked: checked, bad: bad }
      }
    }
    // fog ramps (built once)
    var fog = opts.fog || '#cfe6ff'
    track.col = {
      grass: [ramp(biome.grass[0], fog), ramp(biome.grass[1], fog)], shoulder: [ramp(biome.shoulder[0], fog), ramp(biome.shoulder[1], fog)],
      road: [ramp(night ? biome.road[0] : biome.road[0], fog), ramp(biome.road[1], fog)], kerb: [ramp(biome.kerb[0], fog), ramp(biome.kerb[1], fog)],
      line: ramp(biome.line, fog), edge: ramp('#f4f4f4', fog), rail: ramp(biome.rail === 'wood' ? '#8d5a2b' : biome.rail === 'snowbank' ? '#ffffff' : biome.rail === 'jersey' ? '#e0ddd5' : '#b9c4cf', fog),
      railDark: ramp(biome.rail === 'wood' ? '#5d3a1a' : biome.rail === 'snowbank' ? '#cfe0f0' : biome.rail === 'jersey' ? '#d32f2f' : '#6d7a88', fog),
      water: [ramp('#2f8fd8', fog), ramp('#2a84cc', fog)], mud: [ramp('#7a5634', fog), ramp('#6f4d2e', fog)], ice: [ramp('#bfe3f5', fog), ramp('#b2daee', fog)],
      tunnelWall: ramp('#4a4038', '#0c0a08'), tunnelRoad: [ramp('#3b3e45', '#101012'), ramp('#363940', '#101012')]
    }
    track.fogColor = fog
    track.ensure(0)
    return track
  }

  /* ── projection + render ─────────────────────────────────────────────────────────────────────────── */
  function project (p, wx, wy, wz, cam, v) {
    var cz = wz - cam.z
    if (cz < 1) cz = 1
    var s = cam.depth / cz
    p.s = s
    p.x = v.cx + s * (wx - cam.x) * v.hw
    p.y = v.hy + s * (cam.y - wy) * v.vh
    p.w = s * ROADW * v.hw
  }
  // vertices 1,2 = the near edge, 3,4 = the far edge; each edge grows 0.6 px so adjacent segments overlap (no seams)
  function poly (c, x1, y1, x2, y2, x3, y3, x4, y4, col) {
    y1 += 0.6; y2 += 0.6; y3 -= 0.6; y4 -= 0.6
    c.fillStyle = col; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineTo(x3, y3); c.lineTo(x4, y4); c.closePath(); c.fill()
  }

  /* ── batched fills: every road quad is queued into a (layer, colour) bucket and each bucket is filled with ONE
     path per frame (owner perf audit C1: a fill per quad per segment was ~150 ms/s on a software rasteriser).
     Segments never overlap vertically (painter clip by max y), so ordering by layer keeps the picture identical.
     Storage is preallocated and reused: no per-frame allocation. ── */
  var CID = new Map(), CSTR = [], BUCKET = {}, TOUCH = new Int32Array(4096), nTouch = 0, LAYERS = 12, MAXQ = 640
  function bucket (layer, col) {
    var id = CID.get(col)
    if (id === undefined) { id = CSTR.length; CSTR.push(col); CID.set(col, id) }
    var key = id * LAYERS + layer, b = BUCKET[key]
    if (!b) { b = BUCKET[key] = { q: new Float32Array(MAXQ * 8), n: 0, on: false, col: col, layer: layer } }
    if (!b.on) { b.on = true; TOUCH[nTouch++] = layer * 100000 + key }
    return b
  }
  function quad (layer, col, x1, y1, x2, y2, x3, y3, x4, y4) {
    var b = bucket(layer, col); if (b.n >= MAXQ) return
    var o = b.n * 8, q = b.q
    q[o] = x1; q[o + 1] = y1 + 0.6; q[o + 2] = x2; q[o + 3] = y2 + 0.6; q[o + 4] = x3; q[o + 5] = y3 - 0.6; q[o + 6] = x4; q[o + 7] = y4 - 0.6
    b.n++
  }
  function rect (layer, col, x, y, w, h) { quad(layer, col, x, y + h, x + w, y + h, x + w, y, x, y) }
  function flush (c) {
    for (var a = 1; a < nTouch; a++) { var v0 = TOUCH[a], j = a - 1; while (j >= 0 && TOUCH[j] > v0) { TOUCH[j + 1] = TOUCH[j]; j-- } TOUCH[j + 1] = v0 }   // insertion sort, no allocation
    for (var i = 0; i < nTouch; i++) {
      var b = BUCKET[TOUCH[i] % 100000], q = b.q
      c.fillStyle = b.col; c.beginPath()
      for (var k = 0, o = 0; k < b.n; k++, o += 8) { c.moveTo(q[o], q[o + 1]); c.lineTo(q[o + 2], q[o + 3]); c.lineTo(q[o + 4], q[o + 5]); c.lineTo(q[o + 6], q[o + 7]); c.closePath() }
      c.fill(); b.n = 0; b.on = false
    }
    nTouch = 0
  }

  /** project the ring near->far (clip by max y), fill the road in batches, then call spriteFn(seg) far->near. */
  function renderRoad (c, track, cam, v, drawN, spriteFn, overlayFn) {
    var baseI = Math.floor(cam.z / SEG), basePct = (cam.z % SEG) / SEG, base = track.seg(baseI)
    if (!base) return
    var x = 0, dx = -(base.curve * basePct), maxy = v.h, col = track.col, rail = track.biome.rail
    var n = Math.min(drawN, RING - 2)
    for (var k = 0; k < n; k++) {
      var s = track.seg(baseI + k); if (!s) break
      var fl = Math.min(FOG_LEVELS - 1, Math.floor(Math.pow(k / n, 0.9) * FOG_LEVELS))
      s.fog = fl; s.vis = false
      project(s.p1, -x, s.y1, (baseI + k) * SEG, cam, v)
      project(s.p2, -x - dx, s.y2, (baseI + k + 1) * SEG, cam, v)
      s.screenOffset = x
      x += dx; dx += s.curve
      s.clip = maxy
      var p1 = s.p1, p2 = s.p2
      if (p1.s * cam.depth <= 0 || p2.y >= p1.y || p2.y >= maxy) continue
      s.vis = true
      var alt = s.kerb, surf = s.surface, X1 = p1.x, Y1 = p1.y, W1 = p1.w, X2 = p2.x, Y2 = p2.y, W2 = p2.w
      rect(0, s.bridge ? col.water[alt][fl] : s.tunnel ? col.tunnelWall[fl] : col.grass[alt][fl], 0, Y2 - 1, v.w, Y1 - Y2 + 2)
      if (!s.bridge) { var sw1 = W1 * 1.32, sw2 = W2 * 1.32; quad(1, s.tunnel ? col.tunnelWall[fl] : col.shoulder[alt][fl], X1 - sw1, Y1, X1 + sw1, Y1, X2 + sw2, Y2, X2 - sw2, Y2) }
      else { var dk1 = W1 * 1.18, dk2 = W2 * 1.18; quad(1, '#7b8794', X1 - dk1, Y1, X1 + dk1, Y1, X2 + dk2, Y2, X2 - dk2, Y2) }
      var r1 = W1 * 1.10, r2 = W2 * 1.10, kc = col.kerb[alt][fl]
      quad(2, kc, X1 - r1, Y1, X1 - W1, Y1, X2 - W2, Y2, X2 - r2, Y2)
      quad(2, kc, X1 + r1, Y1, X1 + W1, Y1, X2 + W2, Y2, X2 + r2, Y2)
      var rc = s.tunnel ? col.tunnelRoad[alt][fl] : surf === 'mud' ? col.mud[alt][fl] : surf === 'ice' ? col.ice[alt][fl] : col.road[alt][fl]
      quad(3, rc, X1 - W1, Y1, X1 + W1, Y1, X2 + W2, Y2, X2 - W2, Y2)
      var e1 = W1 * 0.035, e2 = W2 * 0.035, ec = col.edge[fl]
      quad(4, ec, X1 - W1 * 0.94, Y1, X1 - W1 * 0.94 + e1, Y1, X2 - W2 * 0.94 + e2, Y2, X2 - W2 * 0.94, Y2)
      quad(4, ec, X1 + W1 * 0.94 - e1, Y1, X1 + W1 * 0.94, Y1, X2 + W2 * 0.94, Y2, X2 + W2 * 0.94 - e2, Y2)
      if (((baseI + k) >> 1) % 2 === 0) {
        var lw1 = W1 * 0.03, lw2 = W2 * 0.03, lc = col.line[fl]
        for (var L = -1; L <= 1; L += 2) { var lx1 = X1 + L * W1 * 0.31, lx2 = X2 + L * W2 * 0.31; quad(5, lc, lx1 - lw1, Y1, lx1 + lw1, Y1, lx2 + lw2, Y2, lx2 - lw2, Y2) }
      }
      if (surf === 'crosswalk' && (baseI + k) % 30 < 4) {
        for (var q2 = -4; q2 <= 4; q2++) { var cx1 = X1 + q2 * W1 * 0.2, cx2 = X2 + q2 * W2 * 0.2; quad(6, ec, cx1 - W1 * 0.06, Y1, cx1 + W1 * 0.06, Y1, cx2 + W2 * 0.06, Y2, cx2 - W2 * 0.06, Y2) }
      }
      if (rail !== 'none' && !s.tunnel) {
        var rh1 = p1.s * 260 * v.vh, rh2 = p2.s * 260 * v.vh, gx1 = W1 * 1.24, gx2 = W2 * 1.24, rcol = col.rail[fl], rdk = col.railDark[fl]
        for (var sd = -1; sd <= 1; sd += 2) {
          var ax = X1 + sd * gx1, bx = X2 + sd * gx2
          if (rail === 'snowbank') { quad(7, rcol, ax, Y1, bx, Y2, bx, Y2 - rh2 * 0.9, ax, Y1 - rh1 * 0.9); continue }
          quad(7, rcol, ax, Y1 - rh1 * 0.55, bx, Y2 - rh2 * 0.55, bx, Y2 - rh2, ax, Y1 - rh1)
          quad(8, rdk, ax, Y1 - rh1 * 0.45, bx, Y2 - rh2 * 0.45, bx, Y2 - rh2 * 0.55, ax, Y1 - rh1 * 0.55)
          if ((baseI + k) % 3 === 0) { var pw = Math.max(1, W1 * 0.025); rect(9, rdk, ax - pw / 2, Y1 - rh1, pw, rh1) }
        }
      }
      if (overlayFn) overlayFn(s, k)
      maxy = Y2
    }
    flush(c)
    // tunnel walls / ceiling / portals and sprites: far -> near (painter)
    for (var j = n - 1; j > 0; j--) {
      var t = track.seg(baseI + j); if (!t || !t.p1) continue
      if (t.tunnel && t.vis) drawTunnel(c, t, v, col, cam)
      spriteFn(t, j)
    }
    return x
  }
  function drawTunnel (c, s, v, col, cam) {
    var p1 = s.p1, p2 = s.p2
    if (p2.y >= p1.y) return
    var th1 = p1.s * 2600 * v.vh, th2 = p2.s * 2600 * v.vh, w1 = p1.w * 1.45, w2 = p2.w * 1.45, fl = s.fog
    var wc = col.tunnelWall[Math.min(FOG_LEVELS - 1, fl + 2)]
    poly(c, p1.x - w1, p1.y, p2.x - w2, p2.y, p2.x - w2, p2.y - th2, p1.x - w1, p1.y - th1, wc)
    poly(c, p1.x + w1, p1.y, p2.x + w2, p2.y, p2.x + w2, p2.y - th2, p1.x + w1, p1.y - th1, wc)
    poly(c, p1.x - w1, p1.y - th1, p2.x - w2, p2.y - th2, p2.x + w2, p2.y - th2, p1.x + w1, p1.y - th1, col.tunnelWall[Math.min(FOG_LEVELS - 1, fl + 5)])
    if (s.tunnelEntry || s.tunnelExit) {
      // the portal face: a stone frame with an arched opening (even-odd fill)
      var X = p1.x, Y = p1.y, ow = w1 * 1.9, oh = th1 * 1.35
      c.fillStyle = s.tunnelEntry ? '#7d6e60' : '#6d5f52'
      c.beginPath(); c.rect(X - ow, Y - oh, ow * 2, oh)
      c.moveTo(X - w1, Y); c.lineTo(X - w1, Y - th1 * 0.62); c.quadraticCurveTo(X - w1, Y - th1, X, Y - th1); c.quadraticCurveTo(X + w1, Y - th1, X + w1, Y - th1 * 0.62); c.lineTo(X + w1, Y); c.closePath()
      c.fill('evenodd')
      c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = Math.max(1, w1 * 0.03); c.stroke()
    }
  }

  W.MojoChaseTrack = { create: create, renderRoad: renderRoad, project: project, SEG: SEG, ROADW: ROADW, CAM_H: CAM_H, RING: RING, LANES: LANES, FACTORS: FACTORS, BIOME: BIOME, PROP_KEY: PROP_KEY, darken: darken, mix: mix }
})(typeof window !== 'undefined' ? window : globalThis)
