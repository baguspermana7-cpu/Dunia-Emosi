/* ============================================================================
 * tk-steer.js — window.TKSteer. Timmy & Kapal Legendaris: top-down ship steering
 * (PRD v2 §3 `steer`, §6 motion/sound, §7 contract; owner mockup "7. Top-Down Ship Control").
 *
 *   var h = TKSteer.mount(host, level, opts)   // -> { destroy, pause, resume, state, setMuted }
 *
 * level  { mode:'gates'|'ice'|'scripted'|'sail'|'current',
 *          vessel:'boat'|'liner'|'clipper'|'explorer'|'raft'|'sub'   (default by mode),
 *          seed, length (world units, ~1 unit = 1 m), width (corridor),
 *          gates:[{x, y, w}] (y = distance AHEAD of the start, x = lateral, 0 = centre) or
 *          gateCount (generated), iceDensity 0..1, iceFields, timeLimit (s, optional),
 *          wind:{dir (radians, direction the wind blows TOWARD, 0 = up/north), strength 0..1}
 *          (or dirDeg), currents:[{x, y, w, h, dir, strength (units/s)}] (y ahead, like gates),
 *          ice:[{x, y, r}] (authored obstacles, y ahead like gates; replaces the sparse generated
 *          ones in gates/sail/current unless iceDensity is also given),
 *          goal | goalText (first objective chip), goalKind:'gates'|'zone', night (bool),
 *          obstacle:'ice'|'rock',
 *          assist (default TRUE — kids: gentle auto-straighten toward the course when no input, gates x1.5
 *            wider, ~half the icebergs with wider gaps, big guide arrow, forgiving stars),
 *          first (the first steer level of a world: slower ship), countdown (default true: 3 s "Siap… Mulai!"
 *            with a demo of which button turns which way) }
 *         When assist/first are not given and window.TKWorlds is loaded, the level is looked up by its
 *         goal text (TKWorlds.findSteer) so the host can keep passing { mode, vessel, goal, seed }.
 *         Only mode (+ vessel) is required; everything else has a sensible default.
 * opts   { onDone({stars, time, hits, nearMiss, missed, mode, scripted?}),
 *          sfx: { muted } (read live — flip it any time), lib(key) -> url,
 *          art: { liner: url, … } (top-down sprite, bow UP, replaces the drawing),
 *          reducedMotion, pauseOverlay (default true), assist / countdown (override the level) }
 *
 * Child safety (PRD §0): no failure state exists. Bumps slow the ship (soft rumble, restrained
 * camera impulse); the level always completes. 'scripted' = the Titanic collision: assisted
 * steering, the last field has no corridor, impact is calm and ends with stars:3, scripted:true.
 * Vanilla ES5, no build, one rAF loop that stops when hidden / paused / destroyed.
 * ==========================================================================*/
(function (W) {
  'use strict'
  var D = W.document
  var TAU = Math.PI * 2
  var WHEEL_DEG = 150            // wheel rotation at full lock
  var NEAR = 26                  // near-miss margin (units from the ice edge)

  function clamp (v, a, b) { return v < a ? a : v > b ? b : v }
  function num (v, d) { return typeof v === 'number' && isFinite(v) ? v : d }
  function angNorm (a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a }
  function damp (k, dt) { return 1 - Math.exp(-k * dt) }
  function approach (v, t, s) { return v < t ? Math.min(t, v + s) : Math.max(t, v - s) }
  function rng (seed) {
    var s = (Math.floor(seed) >>> 0) || 1
    return function () {
      s = (s + 0x6D2B79F5) >>> 0
      var t = s
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  /* ── vessels: size (units), top speed, turn authority, inertia ─────────── */
  var VESSELS = {
    boat:     { L: 56,  B: 20, vmax: 95,  turn: 1.25, rud: 5.0, yaw: 3.6, acc: 1.1,  keep: 0.45 },
    liner:    { L: 132, B: 22, vmax: 86,  turn: 0.34, rud: 1.4, yaw: 0.85, acc: 0.32, keep: 0.4 },
    clipper:  { L: 96,  B: 19, vmax: 104, turn: 0.62, rud: 2.4, yaw: 1.6, acc: 0.55, keep: 0.45 },
    explorer: { L: 80,  B: 22, vmax: 72,  turn: 0.66, rud: 2.4, yaw: 1.5, acc: 0.55, keep: 0.62 },
    raft:     { L: 58,  B: 42, vmax: 50,  turn: 0.85, rud: 2.6, yaw: 1.6, acc: 0.5,  keep: 0.5 },
    sub:      { L: 74,  B: 17, vmax: 82,  turn: 0.92, rud: 3.0, yaw: 2.2, acc: 0.7,  keep: 0.45 }
  }
  var MODE_VESSEL = { gates: 'liner', ice: 'liner', scripted: 'liner', sail: 'clipper', current: 'raft' }
  var DEFAULTS = {
    gates:    { length: 2600, width: 1000, gates: 5, ice: 0.18 },
    ice:      { length: 3200, width: 1040, gates: 0, ice: 0.6 },
    scripted: { length: 2300, width: 1000, gates: 0, ice: 0.3 },
    sail:     { length: 2800, width: 1100, gates: 4, ice: 0 },
    current:  { length: 2500, width: 1000, gates: 0, ice: 0 }
  }
  var PALETTE = {
    day:   { top: '#1f86b6', bot: '#135f8c', wave: 'rgba(255,255,255,0.13)', edge: '#ffd166' },
    night: { top: '#0c2c4c', bot: '#0b4466', wave: 'rgba(170,220,255,0.10)', edge: '#ffcf5a' },
    deep:  { top: '#041a2e', bot: '#0a2f4a', wave: 'rgba(120,200,255,0.07)', edge: '#7fe0ff' }
  }

  /* ── world builder (pure, seeded — same level + seed = same sea) ───────── */
  function build (level) {
    var L = level || {}
    var mode = DEFAULTS[L.mode] ? L.mode : 'gates'
    var vessel = VESSELS[L.vessel] ? L.vessel : MODE_VESSEL[mode]
    var V = VESSELS[vessel]
    // a TKFleet ship (level.hull from TKFleet.handling): its own length/beam, and handling that is ALWAYS
    // easy — at least a nimble boat's rudder/yaw response, turn and speed nudged by its stats (±10% / ±6%)
    if (L.hull && L.hull.len) {
      var H = L.hull
      V = { L: H.len, B: H.beam, vmax: V.vmax * num(H.speedK, 1), turn: Math.max(V.turn, 0.8) * num(H.turnK, 1),
        rud: Math.max(V.rud, 3.2), yaw: Math.max(V.yaw, 2.2), acc: Math.max(V.acc, 0.7), keep: V.keep }
    }
    var d = DEFAULTS[mode]
    var R = rng(num(L.seed, 20260928))
    var assist = L.assist !== false
    var first = !!L.first
    var gateK = assist ? 1.5 : 1
    var length = Math.max(900, num(L.length, d.length))
    var half = Math.max(360, num(L.width, d.width)) / 2
    var rTurn = V.vmax / V.turn
    function maxDx (seg) { return clamp(seg * seg / (4 * rTurn) * 0.8, 50, half * 0.6) }
    var goal = mode === 'scripted' ? 'impact'
      : (L.goalKind === 'zone' || L.goalKind === 'gates') ? L.goalKind
      : (mode === 'gates' || mode === 'sail') ? 'gates' : 'zone'
    var w = { mode: mode, vessel: vessel, V: V, length: length, half: half, goal: goal,
      zoneY: -length, gates: [], ice: [], fields: [], currents: [], cps: [], wind: null,
      assist: assist, first: first, speedK: first ? 0.7 : assist ? 0.9 : 1,
      timeLimit: num(L.timeLimit, 0), obstacle: L.obstacle || (vessel === 'sub' ? 'rock' : 'ice'),
      palette: vessel === 'sub' ? 'deep' : (L.night != null ? (L.night ? 'night' : 'day') : (mode === 'ice' || mode === 'scripted' ? 'night' : 'day')) }

    // gates: authored or generated along a turn-feasible line
    if (goal === 'gates') {
      if (L.gates && L.gates.length) {
        for (var i = 0; i < L.gates.length; i++) {
          var g = L.gates[i]
          w.gates.push({ x: num(g.x, 0), y: -Math.abs(num(g.y, 400 * (i + 1))), w: num(g.w, Math.max(V.B * 7, 200)), passed: false, missed: false })
        }
        w.gates.sort(function (a, b) { return b.y - a.y })
      } else {
        // at least 300 units between generated gates, so every gate is reachable from the last one
        var n = clamp(Math.round(num(L.gateCount, d.gates || 4)), 1, Math.max(1, Math.floor((length - 420) / 300)))
        var sp = (length - 420) / n
        var gx = 0
        for (var k = 0; k < n; k++) {
          var m = maxDx(sp)
          gx = clamp(gx + (R() * 2 - 1) * m, -half * 0.55, half * 0.55)
          if (k === 0) gx = clamp(gx, -m * 0.6, m * 0.6)
          w.gates.push({ x: Math.round(gx), y: -Math.round(420 + sp * (k + 1)), w: Math.round(Math.max(V.B * 7, vessel === 'liner' ? 250 : 200) * gateK), passed: false, missed: false })
        }
      }
      w.zoneY = w.gates[w.gates.length - 1].y - 200
    }

    // safe path control points (gate centres, or a gentle meander)
    w.cps.push({ y: 300, x: 0 }, { y: 0, x: 0 })
    if (w.gates.length) {
      for (var gi = 0; gi < w.gates.length; gi++) w.cps.push({ y: w.gates[gi].y, x: w.gates[gi].x })
    } else {
      var seg = 460, px = 0
      for (var yy = -seg; yy > -length - seg; yy -= seg) {
        px = clamp(px + (R() * 2 - 1) * maxDx(seg), -half * 0.5, half * 0.5)
        w.cps.push({ y: yy, x: Math.round(px) })
      }
    }
    var lastCp = w.cps[w.cps.length - 1]
    w.cps.push({ y: lastCp.y - 2000, x: lastCp.x })

    // obstacles
    var dens = clamp(num(L.iceDensity, d.ice), 0, 1.5) * (assist ? 0.55 : 1)
    var baseSafe = (V.B / 2 + 70 + V.L * 0.25) * (assist ? 1.35 : 1)
    var rowGap = assist ? 150 : 105
    function place (x, y, r, extra) {
      for (var q = w.ice.length - 1; q >= 0 && q >= w.ice.length - 30; q--) {
        var o = w.ice[q]
        if (Math.abs(o.y - y) < o.r + r + 14 && Math.hypot(o.x - x, o.y - y) < o.r + r + 14) return null
      }
      for (var gq = 0; gq < w.gates.length; gq++) {
        var G = w.gates[gq]
        if (Math.abs(G.y - y) < r + 60 && (Math.abs(G.x - G.w / 2 - x) < r + 60 || Math.abs(G.x + G.w / 2 - x) < r + 60)) return null
      }
      var b = berg(R, x, y, r)
      if (extra) for (var ek in extra) b[ek] = extra[ek]
      w.ice.push(b)
      return b
    }
    function row (y, count, safe, rMin, rMax, field) {
      var tries = count * 4
      for (var t = 0; t < tries && count > 0; t++) {
        var r = rMin + R() * (rMax - rMin)
        var x = -half - 40 + R() * (2 * half + 80)
        var yj = y + (R() - 0.5) * 60
        if (Math.abs(x - pathX(w, yj)) < safe + r) continue
        if (place(x, yj, r, { field: field })) count--
      }
    }
    if (mode === 'ice' || mode === 'scripted') {
      var nF = Math.max(2, Math.round(num(L.iceFields, mode === 'scripted' ? 2 : Math.round(length / 620))))
      var startY = -420, endY = -length + (mode === 'scripted' ? 520 : 360)
      var span = (startY - endY) / nF
      for (var f = 0; f < nF; f++) {
        var tf = nF > 1 ? f / (nF - 1) : 1
        if (mode === 'scripted') tf *= 0.4
        var fy0 = startY - span * f, fy1 = fy0 - span * 0.62
        w.fields.push({ y0: fy0, y1: fy1 })
        for (var ry = fy0 - 40; ry > fy1; ry -= rowGap) {
          var cnt = dens > 0 ? Math.max(1, Math.round(dens * (0.7 + 1.5 * tf) * (2 * half) / 300 + R() * 1.2)) : 0
          if (cnt) row(ry, cnt, baseSafe * (1.25 - 0.35 * tf), 22 + 8 * tf, 44 + 22 * tf, f)
        }
      }
      if (mode === 'scripted') {
        // the final authored field: a continuous wall across the whole corridor — no corridor
        var wy = -length
        var fx = pathX(w, wy)
        w.ice.push(berg(R, fx, wy - 30, 92, { wall: true, fated: true }))
        for (var wx = -half - 140; wx <= half + 140; wx += 70) {
          if (Math.abs(wx - fx) < 120) continue
          w.ice.push(berg(R, wx, wy + (R() - 0.5) * 40, 40 + R() * 12, { wall: true }))
        }
        for (var wx2 = -half - 100; wx2 <= half + 100; wx2 += 90) w.ice.push(berg(R, wx2, wy - 120 - R() * 40, 44 + R() * 16, { wall: true }))
        w.fields.push({ y0: wy + 60, y1: wy - 160, wall: true })
        w.zoneY = wy
      }
    } else if (dens > 0 && !(L.ice && L.ice.length && L.iceDensity == null)) {
      for (var sy = -440; sy > w.zoneY + 260; sy -= (assist ? 240 : 170)) row(sy, Math.round(dens * (2 * half) / 300 + R()), baseSafe * 1.2, 20, 40, -1)
    }

    // authored obstacles: [{x, y (distance ahead), r}]
    if (L.ice && L.ice.length) {
      for (var ai = 0; ai < L.ice.length; ai++) {
        var A = L.ice[ai]
        w.ice.push(berg(R, num(A.x, 0), -Math.abs(num(A.y, 500)), clamp(num(A.r, 36), 12, 140)))
      }
    }

    // wind (sail): blows across the course so a reach is fast and a beat is slow
    if (mode === 'sail' || L.wind) {
      var wd = L.wind && (L.wind.dirDeg != null ? L.wind.dirDeg * Math.PI / 180 : L.wind.dir)
      w.wind = { dir: angNorm(num(wd, (R() < 0.5 ? 1 : -1) * (Math.PI / 2 + (R() - 0.5) * 0.5))), strength: clamp(num(L.wind && L.wind.strength, 0.85), 0.2, 1) }
    }

    // currents: authored rectangles or generated east/west bands
    if (L.currents && L.currents.length) {
      for (var ci = 0; ci < L.currents.length; ci++) {
        var c = L.currents[ci]
        w.currents.push({ x: num(c.x, 0), y: -Math.abs(num(c.y, 500)), w: num(c.w, 2 * half + 200), h: num(c.h, 220), dir: num(c.dir, Math.PI / 2), s: num(c.strength, 30) })
      }
    } else if (mode === 'current') {
      var nb = Math.max(2, Math.round(length / 560))
      var bsp = (length - 700) / nb
      for (var bi = 0; bi < nb; bi++) {
        var dirSign = bi % 2 === 0 ? 1 : -1
        if (R() < 0.3) dirSign = -dirSign
        w.currents.push({ x: 0, y: -Math.round(480 + bsp * bi + bsp * 0.4), w: 2 * half + 200, h: 200 + Math.round(R() * 60), dir: dirSign * Math.PI / 2 + (R() - 0.5) * 0.4, s: Math.round(V.vmax * (0.42 + R() * 0.14)) })
      }
    }
    return w
  }

  /* ── embedded questions (owner 2026-09-29: action first, a question only on certain moments) ──
     level.questions { on: 'collide'|'buoy'|'gate' or an array, topic (TKQuiz domain override), count (max
     collision questions), buoys (Soal buoys / treasure chests on the course), gates (lighthouse chain gates) }.
     Absent: collide + 2 buoys (every action level carries questions); questions:false = none. Active only when
     the host gives opts.onQuestion; the Titanic 'scripted' run never asks. */
  var Q_DEF = { on: ['collide', 'buoy'], count: 3, buoys: 2 }
  var Q_COOL = 8                     // at most one collision question per 8 s of sailing
  var Q_WRONG = 'Tidak apa-apa, coba lagi nanti!'
  function qconf (level) {
    level = level || {}
    var q = level.questions
    if (q === false) return { on: {}, topic: null, count: 0, buoys: 0, gates: 0 }
    if (typeof q === 'string' || Array.isArray(q)) q = { on: q }
    q = q && typeof q === 'object' ? q : {}
    var list = q.on == null ? Q_DEF.on : [].concat(q.on), on = {}
    for (var i = 0; i < list.length; i++) if (list[i] === 'collide' || list[i] === 'buoy' || list[i] === 'gate') on[list[i]] = true
    return { on: on, topic: q.topic || null, count: clamp(Math.round(num(q.count, Q_DEF.count)), 0, 20),
      buoys: on.buoy ? clamp(Math.round(num(q.buoys, Q_DEF.buoys)), 0, 6) : 0, gates: on.gate ? clamp(Math.round(num(q.gates, 1)), 0, 4) : 0 }
  }
  // buoys on the safe course line, gates across the corridor; the water around each is cleared of ice
  function placeQ (w, QC) {
    var qb = [], lg = [], y0 = -520, y1 = w.zoneY + 380
    if (y1 > y0 - 200) return { buoys: qb, gates: lg }
    function clearAt (y, x, ry, rx) {
      for (var i = w.ice.length - 1; i >= 0; i--) {
        var b = w.ice[i]
        if (b.wall) continue
        if (Math.abs(b.y - y) < ry + b.r && (rx == null || Math.abs(b.x - x) < rx + b.r)) w.ice.splice(i, 1)
      }
    }
    function busy (y, list, gap) { for (var i = 0; i < list.length; i++) if (Math.abs(list[i].y - y) < gap) return true; return false }
    function nudge (y, avoid) {
      for (var d = 0; d < 800; d += 40) {
        var c = [y - d, y + d]
        for (var k = 0; k < 2; k++) if (c[k] <= y0 && c[k] >= y1 && !avoid(c[k])) return c[k]
      }
      return null
    }
    var arches = w.gates
    for (var g = 0; g < QC.gates; g++) {
      var gy = nudge(y0 + (y1 - y0) * (g + 1) / (QC.gates + 1), function (y) { return busy(y, arches, 180) || busy(y, lg, 400) })
      if (gy == null) continue
      clearAt(gy, 0, 230, null)
      lg.push({ y: gy, x: pathX(w, gy), drop: 0, asked: false, open: false, dropping: false })
    }
    for (var b = 0; b < QC.buoys; b++) {
      var by = nudge(y0 + (y1 - y0) * (b + 0.6) / (QC.buoys + 0.2), function (y) { return busy(y, arches, 150) || busy(y, lg, 240) || busy(y, qb, 300) })
      if (by == null) continue
      var bx = pathX(w, by)
      clearAt(by, bx, 120, 140)
      qb.push({ x: bx, y: by, x0: bx, kind: b % 2 ? 'chest' : 'buoy', taken: false, ph: b * 1.7 })
    }
    return { buoys: qb, gates: lg }
  }

  function berg (R, x, y, r, extra) {
    var n = 7 + Math.floor(R() * 4), pts = []
    for (var i = 0; i < n; i++) {
      var a = i / n * TAU + (R() - 0.5) * 0.5
      var rr = r * (0.78 + R() * 0.32)
      pts.push(Math.cos(a) * rr, Math.sin(a) * rr)
    }
    var bits = []
    for (var j = 0; j < 2 + Math.floor(R() * 2); j++) bits.push({ a: R() * TAU, d: r * (1.25 + R() * 0.5), s: 4 + R() * 5, w: (R() - 0.5) * 0.25 })
    var b = { x: x, y: y, r: r, pts: pts, rot: R() * TAU, spin: (R() - 0.5) * 0.03, bits: bits, bumped: false, nearArm: false, nearDone: false }
    if (extra) for (var k in extra) b[k] = extra[k]
    return b
  }

  function pathX (w, y) {
    var c = w.cps
    for (var i = 0; i < c.length - 1; i++) {
      var a = c[i], b = c[i + 1]
      if (y <= a.y && y >= b.y) {
        var t = (a.y - y) / (a.y - b.y)
        t = (1 - Math.cos(t * Math.PI)) / 2
        return a.x + (b.x - a.x) * t
      }
    }
    return y > c[0].y ? c[0].x : c[c.length - 1].x
  }

  /* ── CSS (injected once, scoped to .tks-root) ─────────────────────────── */
  var CSS = [
    '.tks-root{position:absolute;inset:0;overflow:hidden;background:#0c3656;color:#fff;font-family:var(--font,"Nunito",system-ui,sans-serif);user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;touch-action:none}',
    '.tks-cv{position:absolute;inset:0;width:100%;height:100%;display:block}',
    '.tks-top{position:absolute;left:0;right:0;top:0;display:flex;justify-content:space-between;align-items:flex-start;gap:8px;padding:calc(10px + var(--tks-inset,0px) + env(safe-area-inset-top,0px)) 12px 0;pointer-events:none}',
    '.tks-panel{background:rgba(6,26,46,.74);border:1.5px solid rgba(150,215,255,.32);border-radius:14px;box-shadow:0 4px 14px rgba(0,0,0,.25)}',
    /* polish (owner 2026-09-28): wood & brass nautical HUD when tk-sea.js is loaded (.tks-sea) */
    '.tks-sea .tks-panel{background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(0,0,0,.12)),repeating-linear-gradient(92deg,#7a4a24 0 7px,#6d4120 7px 9px,#835029 9px 17px,#70431f 17px 20px);border:3px solid #d9a441;border-radius:16px;box-shadow:inset 0 0 0 2px #7a5314,0 4px 0 #4a2c10,0 8px 16px rgba(0,0,0,.3);color:#fff4d6;text-shadow:0 1px 0 rgba(40,20,0,.8)}',
    '.tks-sea .tks-goal{font-family:"Fredoka One","Fredoka",var(--font-display,"Nunito"),system-ui,sans-serif;font-weight:400;font-size:19px}',
    '.tks-sea .tks-ic{width:26px;height:26px}.tks-sea .tks-ic svg,.tks-sea .tks-ic img{width:18px;height:18px}',
    '.tks-sea .tks-goals{padding:10px 16px 10px 12px;gap:8px}',
    '.tks-sea.tks-portrait .tks-goal{font-size:18px}',
    '.tks-sea.tkx-compact .tks-goal{font-size:15px}.tks-sea.tkx-compact .tks-goals{padding:7px 12px 7px 9px;gap:5px}.tks-sea.tkx-compact .tks-ic{width:22px;height:22px}',
    '.tks-sea.tkx-compact .tks-route{min-width:min(46vw,210px)}',
    '.tks-sea.tks-short .tks-spd{height:48px;min-width:64px;font-size:15px}',
    '.tks-sea .tks-ic{background:#2f8fd0;box-shadow:0 0 0 2px #d9a441}',
    '.tks-sea .tks-hold{background:radial-gradient(circle at 35% 28%,#fff4c4 0,#f2c65e 30%,#cf9433 64%,#8d5b18 100%);border:4px solid #6b4412;box-shadow:inset 0 -6px 0 rgba(90,55,10,.45),inset 0 4px 0 rgba(255,250,220,.6),0 7px 0 #4f310b,0 12px 18px rgba(0,0,0,.32)}',
    '.tks-sea .tks-hold .tks-arw{background:linear-gradient(#24507a,#0f2c4a);filter:drop-shadow(0 2px 0 rgba(255,245,210,.7))}',
    '.tks-sea .tks-hold.is-on{transform:scale(.95) translateY(4px);box-shadow:inset 0 -3px 0 rgba(90,55,10,.45),inset 0 3px 0 rgba(255,250,220,.5),0 3px 0 #4f310b}',
    '.tks-sea .tks-wheel{background:radial-gradient(circle,rgba(255,226,140,.35) 0,rgba(255,226,140,0) 62%);filter:drop-shadow(0 8px 10px rgba(0,0,0,.4))}',
    '.tks-sea .tks-pausebtn,.tks-sea .tks-shipbtn{background:radial-gradient(circle at 35% 28%,#fff4c4 0,#f2c65e 30%,#cf9433 64%,#8d5b18 100%);border:3px solid #6b4412;box-shadow:0 4px 0 #4f310b}',
    '.tks-sea .tks-pz{border-color:#3b2400}',
    '.tks-sea .tks-radar{box-shadow:0 0 0 4px #d9a441,0 0 0 6px #6b4412,0 6px 18px rgba(0,0,0,.35)}',
    '.tks-sea .tks-stats{gap:8px}',
    '.tks-sea .tks-spd{background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(0,0,0,.12)),repeating-linear-gradient(92deg,#7a4a24 0 7px,#6d4120 7px 9px,#835029 9px 17px);border:3px solid #d9a441;color:#fff4d6;font-family:"Fredoka One","Fredoka",var(--font-display,"Nunito"),system-ui,sans-serif;font-weight:400;font-size:17px;box-shadow:0 4px 0 #4a2c10}',
    '.tks-sea .tks-spd.is-on{background:radial-gradient(circle at 35% 28%,#fff4c4 0,#f2c65e 35%,#cf9433 75%);color:#3b2400;text-shadow:none}',
    '.tks-sea .tks-wind,.tks-sea .tks-sail{font-family:"Fredoka One","Fredoka",var(--font-display,"Nunito"),system-ui,sans-serif;font-weight:400}',
    '.tks-sea .tks-route{min-width:min(38vw,260px)}',
    '.tks-sea .tks-pause-card h3{font-family:"Fredoka One","Fredoka",var(--font-display,"Nunito"),system-ui,sans-serif}',
    '.tks-goals{display:flex;flex-direction:column;gap:6px;padding:8px 12px 8px 9px;max-width:58%}',
    '.tks-goal{display:flex;align-items:center;gap:8px;font-weight:800;font-size:14px;line-height:1.2;transition:opacity .3s}',
    '.tks-ic{width:20px;height:20px;border-radius:50%;flex:none;display:grid;place-items:center;background:#2aa7d6;box-shadow:inset 0 -2px 0 rgba(0,0,0,.2)}',
    '.tks-ic svg,.tks-ic img{width:14px;height:14px;object-fit:contain}',
    '.tks-goal.is-done .tks-ic{background:#35c46a}',
    '.tks-assist{display:inline-flex;align-items:center;gap:6px;margin-top:2px;padding:4px 10px 4px 6px;border-radius:999px;background:#ffc83d;color:#3b2800;font-weight:900;font-size:13px;align-self:flex-start}',
    '.tks-assist svg,.tks-assist img{width:20px;height:20px;object-fit:contain}',
    '.tks-stats{display:flex;flex-direction:column;align-items:flex-end;gap:6px}',
    '.tks-pausebtn{pointer-events:auto;width:56px;height:56px;border-radius:16px;border:1.5px solid rgba(150,215,255,.4);background:rgba(6,26,46,.8);display:grid;place-items:center;cursor:pointer;transition:transform .16s cubic-bezier(.3,1.5,.5,1)}',
    '.tks-pausebtn:active{transform:scale(.94)}',
    '.tks-pausebtn svg,.tks-pausebtn img{width:26px;height:26px;object-fit:contain}',
    '.tks-stat{padding:5px 12px;text-align:center;min-width:92px;font-weight:800;font-size:13px;line-height:1.15}',
    '.tks-stat b{display:block;font-family:var(--font-display,"Fredoka One","Nunito",sans-serif);font-size:21px;font-weight:400;letter-spacing:.5px}',
    '.tks-stat.is-one{font-size:15px;padding:8px 12px}',
    '.tks-wind{display:flex;align-items:center;gap:8px;padding:6px 12px;font-weight:900;font-size:14px;pointer-events:none}',
    '.tks-arw{display:block;width:26px;height:28px;background:linear-gradient(#fff,#d8ecff);clip-path:polygon(50% 0,100% 48%,68% 48%,68% 100%,32% 100%,32% 48%,0 48%);filter:drop-shadow(0 1px 0 rgba(0,0,0,.35))}.tks-arw-l{transform:rotate(-90deg)}.tks-arw-r{transform:rotate(90deg)}',
    '.tks-wind .tks-windarw{width:26px;height:30px;transition:transform .4s}',
    '.tks-left,.tks-right{position:absolute;bottom:calc(12px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:10px}',
    '.tks-left{left:12px;align-items:flex-start}',
    '.tks-right{right:12px;align-items:center}',
    '.tks-radar{width:108px;height:108px;border-radius:50%;box-shadow:0 0 0 2px rgba(150,215,255,.35),0 6px 18px rgba(0,0,0,.35);display:block}',
    '.tks-lr{display:flex;gap:10px}',
    '.tks-btn{pointer-events:auto;border:0;cursor:pointer;touch-action:none;font:inherit;color:#fff;transition:transform .16s cubic-bezier(.23,1,.32,1),box-shadow .16s cubic-bezier(.23,1,.32,1),background .2s}',
    /* big round turn buttons (>= 80 px) for small hands */
    '.tks-hold{position:relative;width:var(--tks-hold,84px);height:var(--tks-hold,84px);border-radius:50%;background:linear-gradient(#35a0e0,#1b6aa3);border:3px solid rgba(255,255,255,.55);box-shadow:0 6px 0 #0f4a74,0 10px 16px rgba(0,0,0,.3);display:grid;place-items:center}',
    '.tks-hold .tks-arw{width:calc(var(--tks-hold,84px) * .48);height:calc(var(--tks-hold,84px) * .52)}',
    '.tks-hold.is-on,.tks-spd:active{transform:scale(.96) translateY(3px);box-shadow:0 3px 0 #0f4a74}',
    '.tks-hold.is-demo{box-shadow:0 6px 0 #0f4a74,0 0 0 5px #ffd166,0 0 26px rgba(255,209,102,.85)}',
    '.tks-demo{position:absolute;top:50%;display:flex;align-items:center;gap:6px;padding:7px 12px 7px 9px;border-radius:14px;background:#fff;color:#12314f;font-weight:900;font-size:17px;line-height:1;white-space:nowrap;opacity:0;transform:translateY(-50%) scale(.9);transition:opacity .2s linear,transform .3s cubic-bezier(.23,1,.32,1);pointer-events:none;box-shadow:0 6px 14px rgba(0,0,0,.3)}',
    '.tks-demo .tks-arw{width:22px;height:24px;background:linear-gradient(#ffd166,#f39c12);filter:none}',
    '.tks-demo-l{left:calc(100% + 14px)}.tks-demo-r{right:calc(100% + 14px)}',
    '.tks-demo-l:before,.tks-demo-r:before{content:"";position:absolute;top:50%;margin-top:-8px;border:8px solid transparent}',
    '.tks-demo-l:before{right:100%;border-right-color:#fff}.tks-demo-r:before{left:100%;border-left-color:#fff}',
    '.tks-root:not(.tks-kid) .tks-demo{top:auto;bottom:calc(100% + 12px);left:50%;right:auto;transform:translateX(-50%)}.tks-root:not(.tks-kid) .tks-demo:before{display:none}',
    '.tks-cdon .is-demo .tks-demo{opacity:1;transform:translateY(-50%) scale(1)}',
    '.tks-root:not(.tks-kid).tks-cdon .is-demo .tks-demo{transform:translateX(-50%) scale(1)}',
    '.tks-cd{position:absolute;left:50%;top:36%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;opacity:0;transition:opacity .25s linear}',
    '.tks-cd.is-on{opacity:1}',
    '.tks-cd b{display:grid;place-items:center;min-width:116px;height:116px;padding:0 22px;border-radius:58px;background:rgba(6,26,46,.8);border:4px solid #ffd166;font-family:var(--font-display,"Fredoka One","Nunito",sans-serif);font-weight:400;font-size:66px;line-height:1;color:#fff;text-shadow:0 3px 0 #0b3a5c;box-shadow:0 8px 20px rgba(0,0,0,.35)}',
    '.tks-cd b.is-pop{animation:tks-cdpop .45s cubic-bezier(.23,1,.32,1)}',
    '.tks-cd.is-go b{background:#2fb866;border-color:#e6fff0;font-size:50px}',
    '.tks-cd span{font-weight:900;font-size:22px;padding:5px 16px;border-radius:12px;background:rgba(6,26,46,.72);white-space:nowrap}',
    '@keyframes tks-cdpop{0%{transform:scale(.72);opacity:.2}100%{transform:scale(1);opacity:1}}',
    '.tks-wheel{width:var(--tks-wheel,136px);height:var(--tks-wheel,136px);touch-action:none;cursor:grab;border-radius:50%;filter:drop-shadow(0 6px 10px rgba(0,0,0,.35))}',
    '.tks-wheel.is-drag{cursor:grabbing}',
    '.tks-wheel svg,.tks-wheel img{width:100%;height:100%;display:block;object-fit:contain;will-change:transform;pointer-events:none}',
    '.tks-speed{display:flex;gap:8px}',
    '.tks-spd{min-width:74px;height:56px;padding:0 12px;border-radius:16px;background:rgba(6,26,46,.8);border:1.5px solid rgba(150,215,255,.4);font-weight:900;font-size:15px;letter-spacing:.5px}',
    '.tks-spd.is-on{background:#ffc83d;color:#3b2800;border-color:#ffe39a}',
    '.tks-sail{pointer-events:auto;padding:8px 12px;display:flex;flex-direction:column;gap:4px;width:min(46vw,230px);font-weight:900;font-size:13px}',
    '.tks-sail-row{display:flex;justify-content:space-between;align-items:center;gap:8px}',
    '.tks-sail-hint{font-size:13px;color:#ffe08a}',
    '.tks-sail-hint.is-ok{color:#7cf0a4}',
    '.tks-range{-webkit-appearance:none;appearance:none;width:100%;height:36px;background:transparent;touch-action:none;margin:0}',
    '.tks-range::-webkit-slider-runnable-track{height:10px;border-radius:6px;background:linear-gradient(90deg,#1b6aa3,#8fd6ff)}',
    '.tks-range::-webkit-slider-thumb{-webkit-appearance:none;width:32px;height:32px;margin-top:-11px;border-radius:50%;background:#fff5d6;border:3px solid #ffc83d;box-shadow:0 3px 6px rgba(0,0,0,.3)}',
    '.tks-range::-moz-range-track{height:10px;border-radius:6px;background:linear-gradient(90deg,#1b6aa3,#8fd6ff)}',
    '.tks-range::-moz-range-thumb{width:28px;height:28px;border-radius:50%;background:#fff5d6;border:3px solid #ffc83d}',
    '.tks-pops{position:absolute;inset:0;pointer-events:none;overflow:hidden}',
    '.tks-pop{position:absolute;transform:translate(-50%,-50%);font-family:var(--font-display,"Fredoka One","Nunito",sans-serif);font-size:24px;color:#fff;white-space:nowrap;text-shadow:0 2px 0 #0b3a5c,0 0 10px rgba(80,200,255,.8);animation:tks-pop .95s ease-out forwards}',
    '.tks-pop.is-good{color:#fff2a8}',
    '@keyframes tks-pop{0%{opacity:0;transform:translate(-50%,-30%) scale(.7)}22%{opacity:1;transform:translate(-50%,-70%) scale(1.08)}100%{opacity:0;transform:translate(-50%,-170%) scale(1)}}',
    '@keyframes tks-fade{0%{opacity:0}20%{opacity:1}100%{opacity:0}}',
    '.tks-rm .tks-pop{animation:tks-fade 1.1s linear forwards}',
    '.tks-caption{position:absolute;left:50%;bottom:calc(var(--tks-ctrlh,250px) + env(safe-area-inset-bottom,0px));transform:translateX(-50%);width:max-content;max-width:min(86%,520px);padding:16px 22px;font-size:19px;font-weight:800;line-height:1.4;text-align:center;opacity:0;transition:opacity 1.4s ease;pointer-events:none}',
    '.tks-caption.is-on{opacity:1}',
    '.tks-pause{position:absolute;inset:0;background:rgba(4,18,32,.55);display:none;place-items:center}',
    '.tks-pause.is-on{display:grid}',
    '.tks-pause-card{padding:22px 28px;text-align:center;display:flex;flex-direction:column;gap:14px;align-items:center}',
    '.tks-pause-card h3{margin:0;font-family:var(--font-display,"Fredoka One","Nunito",sans-serif);font-weight:400;font-size:28px}',
    '.tks-resume{min-width:160px;height:60px;border-radius:18px;background:#ffc83d;color:#3b2800;font-weight:900;font-size:20px;box-shadow:0 5px 0 #c98f00}',
    '.tks-resume:active{transform:scale(.96) translateY(3px);box-shadow:0 2px 0 #c98f00}',
    '.tks-portrait .tks-goal{font-size:13px}',
    '.tks-big .tks-radar{width:124px;height:124px}',
    '.tks-short .tks-radar{width:92px;height:92px}',
    '.tks-kid .tks-right{align-items:flex-end}',
    '.tks-pz{display:block;width:20px;height:22px;border-left:7px solid #fff;border-right:7px solid #fff;box-sizing:border-box}',
    '.tks-kid.tks-short .tks-left{flex-direction:row;align-items:flex-end}',
    '.tks-narrow .tks-radar{display:none}',
    '.tks-shipbtn{pointer-events:auto;width:56px;height:56px;padding:3px;border-radius:16px;border:1.5px solid rgba(150,215,255,.4);background:rgba(6,26,46,.8);display:grid;place-items:center;cursor:pointer}',
    '.tks-shipbtn img{width:100%;height:100%;object-fit:contain;pointer-events:none}',
    '.tks-toprow{display:flex;gap:8px}',
    '.tks-topnote{max-width:260px;margin:0;font-size:14px;line-height:1.3;color:#fff0bd}',
    '.tks-swap{min-width:160px;height:56px;border-radius:18px;background:#2f8fd0;color:#fff;font-weight:900;font-size:18px;box-shadow:0 5px 0 #1b5f8f;display:flex;align-items:center;gap:8px;padding:0 16px 0 8px}',
    '.tks-swap img{width:52px;height:40px;object-fit:contain}',
    '.tks-kid.tks-short .tks-radar{display:none}',
    '.tks-kid .tks-left{align-items:flex-start}',
    '.tks-rm .tks-cd b{animation:none}.tks-rm .tks-demo{transition:opacity .2s linear}',
    '.tks-root:not(.tks-portrait) .tks-caption{bottom:calc(18px + env(safe-area-inset-bottom,0px));max-width:min(54%,520px)}',
    '.tks-short .tks-caption{font-size:16px;padding:12px 16px}',
    '.tks-rm .tks-btn,.tks-rm .tks-caption,.tks-rm .tks-wind .tks-windarw{transition:none}',
    /* embedded questions: the old captain's bubble (a wrong answer is always "Tidak apa-apa") */
    '.tks-cap{position:absolute;left:50%;top:calc(30% + env(safe-area-inset-top,0px));display:flex;align-items:flex-end;gap:8px;max-width:min(92%,460px);opacity:0;transform:translate(-50%,10px);transition:opacity .3s ease-out,transform .4s cubic-bezier(.23,1,.32,1);pointer-events:none;z-index:5}',
    '.tks-cap.is-on{opacity:1;transform:translate(-50%,0)}',
    '.tks-cap img{width:78px;height:78px;flex:none;border-radius:50%;object-fit:cover;object-position:50% 10%;background:#dbe9f7;border:3px solid #ffd166;box-shadow:0 4px 12px rgba(0,0,0,.35)}',
    '.tks-bub{background:#fff;color:#12314f;border-radius:16px;padding:8px 14px 10px;box-shadow:0 6px 14px rgba(0,0,0,.3);margin-bottom:8px}',
    '.tks-bub b{display:inline-block;margin:-20px 0 4px;padding:2px 10px;border-radius:10px;background:#1F4FA0;color:#fff;font-weight:400;font-size:14px;font-family:var(--font-display,"Fredoka One","Nunito",sans-serif)}',
    '.tks-bub span{display:block;font-weight:800;font-size:17px;line-height:1.3}',
    '.tks-rm .tks-cap,.tks-rm .tks-cap.is-on{transform:translate(-50%,0);transition:opacity .3s linear}',
    '.tks-mid{position:absolute;left:50%;bottom:calc(10px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);display:flex}',
    /* an open question holds the game: its pause / ship buttons would do nothing, so they step aside */
    '.tks-asking .tks-pausebtn,.tks-asking .tks-shipbtn{visibility:hidden}'
  ].join('\n')

  function injectCss () {
    if (D.getElementById('tks-style')) return
    var s = D.createElement('style')
    s.id = 'tks-style'
    s.textContent = CSS
    D.head.appendChild(s)
  }

  // Icons: owner sprites via window.TKIcon (ICONS table in timmy-kapal.js); turn / wind arrows are a
  // pure-CSS arrow (.tks-arw). No glyphs, no drawn pictograms. wheelSvg() stays ONLY as the fallback
  // for the stand-alone QA harness, which loads this file without the game (no TKIcon there).
  function ic (n) { return W.TKIcon ? W.TKIcon(n) : '' }
  // resolved per mount: TKIcon is defined by timmy-kapal.js, which loads after this file
  var SVG_SHARD = '', SVG_FLAG = '', SVG_WAVE = '', SVG_PAUSE = '', SVG_ASSIST = ''
  function icons () { SVG_SHARD = ic('ice'); SVG_FLAG = ic('ok'); SVG_WAVE = ic('wheel'); SVG_PAUSE = ic('pause') || '<i class="tks-pz"></i>'; SVG_ASSIST = ic('wheel') }
  var SVG_LEFT = '<i class="tks-arw tks-arw-l"></i>', SVG_RIGHT = '<i class="tks-arw tks-arw-r"></i>'
  var SVG_WIND = '<i class="tks-arw tks-windarw"></i>'
  function wheelSvg (small) {
    var s = '<svg viewBox="-70 -70 140 140" aria-hidden="true">'
    for (var i = 0; i < 8; i++) {
      var a = i * 45
      s += '<g transform="rotate(' + a + ')"><rect x="-3.2" y="-66" width="6.4" height="30" rx="3" fill="#c98a4b" stroke="#6e431d" stroke-width="1.6"/><circle cx="0" cy="-64" r="6" fill="#dca466" stroke="#6e431d" stroke-width="1.6"/><rect x="-2.6" y="-40" width="5.2" height="30" fill="#a8743f"/></g>'
    }
    s += '<circle r="40" fill="none" stroke="#6e431d" stroke-width="13"/><circle r="40" fill="none" stroke="#b07a42" stroke-width="9"/>'
    s += '<circle r="40" fill="none" stroke="#d9a36a" stroke-width="2.4" stroke-dasharray="7 9"/>'
    s += '<circle r="14" fill="#e3b24c" stroke="#7a5418" stroke-width="3"/><circle r="5" fill="#fff3c4"/>'
    s += '<path d="M-3 -58 L0 -66 L3 -58z" fill="#fff3c4"/>'
    return s + '</svg>'
  }

  function el (tag, cls, html) {
    var e = D.createElement(tag)
    if (cls) e.className = cls
    if (html != null) e.innerHTML = html
    return e
  }

  /* ── audio: SFXEngine cues when present + original WebAudio synth ─────── */
  function makeAudio (opts) {
    var A = { ctx: null, master: null, bed: null, hornDone: false, lastMuted: null }
    var sfxE = W.SFXEngine
    A.muted = function () {
      try {
        if (opts.sfx && opts.sfx.muted) return true
        if (sfxE && typeof sfxE.getMute === 'function' && sfxE.getMute()) return true
      } catch (e) {}
      return false
    }
    A.ensure = function () {
      try {
        if (!A.ctx) {
          var AC = W.AudioContext || W.webkitAudioContext
          if (!AC) return null
          A.ctx = new AC()
          A.master = A.ctx.createGain()
          A.master.gain.value = A.muted() ? 0 : 0.9
          A.master.connect(A.ctx.destination)
        }
        if (A.ctx.state === 'suspended' && !D.hidden) A.ctx.resume().catch(function () {})
        return A.ctx
      } catch (e) { return null }
    }
    A.live = function () { return !!(A.ctx && A.ctx.state === 'running' && !A.muted()) }
    A.noise = function (sec) {
      var c = A.ctx, n = Math.floor(c.sampleRate * sec), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0)
      for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
      return buf
    }
    A.startBed = function () {
      try {
        if (!A.ctx || A.bed) return
        var c = A.ctx, src = c.createBufferSource(), lp = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain()
        src.buffer = A.noise(2.5); src.loop = true
        lp.type = 'lowpass'; lp.frequency.value = 420
        g.gain.value = 0.045
        lfo.frequency.value = 0.13; lg.gain.value = 0.022
        lfo.connect(lg); lg.connect(g.gain)
        src.connect(lp); lp.connect(g); g.connect(A.master)
        src.start(); lfo.start()
        A.bed = { src: src, lfo: lfo }
      } catch (e) {}
    }
    A.env = function (node, t0, a, peak, hold, rel) {
      var gg = node.gain
      gg.setValueAtTime(0.0001, t0)
      gg.exponentialRampToValueAtTime(peak, t0 + a)
      gg.setValueAtTime(peak, t0 + a + hold)
      gg.exponentialRampToValueAtTime(0.0001, t0 + a + hold + rel)
    }
    A.horn = function () {
      if (!A.live()) return
      try {
        var c = A.ctx, t = c.currentTime, lp = c.createBiquadFilter(), g = c.createGain()
        lp.type = 'lowpass'; lp.frequency.value = 650
        lp.connect(g); g.connect(A.master)
        A.env(g, t, 0.12, 0.13, 1.0, 0.5)
        var fr = [98, 147]
        for (var i = 0; i < fr.length; i++) { var o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr[i]; o.connect(lp); o.start(t); o.stop(t + 1.8) }
        A.hornDone = true
      } catch (e) {}
    }
    A.splash = function (vol) {
      if (!A.live()) return
      try {
        var c = A.ctx, t = c.currentTime, s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain()
        s.buffer = A.noise(0.5); bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 0.7
        s.connect(bp); bp.connect(g); g.connect(A.master)
        A.env(g, t, 0.02, 0.16 * (vol || 1), 0.05, 0.35)
        s.start(t); s.stop(t + 0.5)
      } catch (e) {}
    }
    A.rumble = function (dur, vol) {
      if (!A.live()) return
      try {
        var c = A.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain(), s = c.createBufferSource(), lp = c.createBiquadFilter(), g2 = c.createGain()
        o.type = 'sine'; o.frequency.setValueAtTime(52, t); o.frequency.exponentialRampToValueAtTime(34, t + dur)
        o.connect(g); g.connect(A.master)
        A.env(g, t, 0.08, 0.3 * (vol || 1), dur * 0.4, dur * 0.6)
        s.buffer = A.noise(dur + 0.2); lp.type = 'lowpass'; lp.frequency.value = 140
        s.connect(lp); lp.connect(g2); g2.connect(A.master)
        A.env(g2, t, 0.06, 0.22 * (vol || 1), dur * 0.3, dur * 0.7)
        o.start(t); o.stop(t + dur + 0.1); s.start(t); s.stop(t + dur + 0.1)
      } catch (e) {}
    }
    A.tick = function () {
      if (!A.live()) return
      try {
        var c = A.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain()
        o.type = 'triangle'; o.frequency.value = 1900
        o.connect(g); g.connect(A.master)
        A.env(g, t, 0.004, 0.035, 0.005, 0.03)
        o.start(t); o.stop(t + 0.06)
      } catch (e) {}
    }
    A.chime = function (big) {
      if (A.muted()) return
      try {
        if (sfxE && typeof (big ? sfxE.levelup : sfxE.star) === 'function') { (big ? sfxE.levelup : sfxE.star)(); return }
      } catch (e) {}
      if (!A.live()) return
      try {
        var c = A.ctx, t = c.currentTime, notes = big ? [784, 988, 1175, 1568] : [880, 1318]
        for (var i = 0; i < notes.length; i++) {
          var o = c.createOscillator(), g = c.createGain()
          o.type = 'sine'; o.frequency.value = notes[i]
          o.connect(g); g.connect(A.master)
          A.env(g, t + i * 0.09, 0.01, 0.09, 0.04, 0.45)
          o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.6)
        }
      } catch (e) {}
    }
    A.sync = function () {
      if (!A.ctx || !A.master) return
      var m = A.muted()
      if (m !== A.lastMuted) {
        A.lastMuted = m
        try { A.master.gain.setTargetAtTime(m ? 0 : 0.9, A.ctx.currentTime, 0.05) } catch (e) {}
      }
    }
    A.suspend = function () { try { if (A.ctx && A.ctx.state === 'running') A.ctx.suspend() } catch (e) {} }
    A.close = function () {
      try { if (A.bed) { A.bed.src.stop(); A.bed.lfo.stop() } } catch (e) {}
      try { if (A.ctx) A.ctx.close() } catch (e) {}
      A.ctx = null; A.bed = null
    }
    return A
  }

  /* ── vessel drawings (local coords: bow toward -y, length L, beam B) ──── */
  function hull (c, h, b) {
    c.beginPath()
    c.moveTo(0, -h)
    c.quadraticCurveTo(b * 1.05, -h * 0.55, b, -h * 0.18)
    c.lineTo(b, h * 0.78)
    c.quadraticCurveTo(b, h, 0, h)
    c.quadraticCurveTo(-b, h, -b, h * 0.78)
    c.lineTo(-b, -h * 0.18)
    c.quadraticCurveTo(-b * 1.05, -h * 0.55, 0, -h)
    c.closePath()
  }
  function rrect (c, x, y, w, h, r) {
    c.beginPath()
    c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r)
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r)
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y)
    c.closePath()
  }
  function ell (c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU) }
  function sailShape (c, span, belly, depth) {
    c.beginPath()
    c.moveTo(-span, 0)
    c.quadraticCurveTo(0, -belly, span, 0)
    c.lineTo(span * 0.9, depth)
    c.quadraticCurveTo(0, depth - belly * 0.7, -span * 0.9, depth)
    c.closePath()
  }
  var DRAW = {
    liner: function (c, L, B) {
      var h = L / 2, b = B / 2
      c.fillStyle = '#1b2430'; hull(c, h, b); c.fill()
      c.fillStyle = '#d9bb8c'; hull(c, h * 0.93, b * 0.78); c.fill()
      c.fillStyle = '#f3f1ea'; rrect(c, -b * 0.7, -h * 0.56, b * 1.4, h * 1.08, b * 0.3); c.fill()
      c.fillStyle = '#ffffff'
      for (var i = 0; i < 6; i++) { c.fillRect(-b * 0.97, -h * 0.46 + i * h * 0.155, b * 0.2, h * 0.09); c.fillRect(b * 0.77, -h * 0.46 + i * h * 0.155, b * 0.2, h * 0.09) }
      for (var f = 0; f < 4; f++) {
        var y = -h * 0.37 + f * h * 0.235
        c.fillStyle = '#e7a23a'; ell(c, 0, y, b * 0.38, b * 0.46); c.fill()
        c.fillStyle = '#1d1d1d'; ell(c, 0, y - b * 0.05, b * 0.24, b * 0.3); c.fill()
      }
      c.fillStyle = '#7a5530'; ell(c, 0, -h * 0.74, b * 0.12, b * 0.12); c.fill(); ell(c, 0, h * 0.72, b * 0.12, b * 0.12); c.fill()
    },
    boat: function (c, L, B) {
      var h = L / 2, b = B / 2
      c.fillStyle = '#c8452f'; hull(c, h, b); c.fill()
      c.fillStyle = '#f7f5ee'; hull(c, h * 0.9, b * 0.8); c.fill()
      c.fillStyle = '#2f7fc1'; rrect(c, -b * 0.55, -h * 0.15, b * 1.1, h * 0.7, b * 0.25); c.fill()
      c.fillStyle = '#bfe6ff'; c.fillRect(-b * 0.4, -h * 0.1, b * 0.8, h * 0.16)
      c.fillStyle = '#ffd166'; ell(c, 0, -h * 0.55, b * 0.18, b * 0.18); c.fill()
    },
    clipper: function (c, L, B, st) {
      var h = L / 2, b = B / 2
      c.fillStyle = '#5b3119'; hull(c, h, b); c.fill()
      c.fillStyle = '#c89a5e'; hull(c, h * 0.92, b * 0.76); c.fill()
      c.strokeStyle = '#6b4424'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(0, -h * 1.25); c.lineTo(0, -h * 0.8); c.stroke()
      var trim = (st && st.sailDeg != null ? st.sailDeg : 45) * Math.PI / 180 * (st && st.sailSide ? st.sailSide : 1)
      var ys = [-h * 0.42, -h * 0.02, h * 0.38]
      for (var i = 0; i < 3; i++) {
        c.save(); c.translate(0, ys[i]); c.rotate(trim * 0.9)
        c.fillStyle = 'rgba(0,0,0,.18)'; sailShape(c, B * 1.15, B * 0.55, B * 0.5); c.fill()
        c.fillStyle = '#f5ecd2'; sailShape(c, B * 1.1, B * 0.62, B * 0.38); c.fill()
        c.strokeStyle = '#6b4424'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-B * 1.15, 0); c.lineTo(B * 1.15, 0); c.stroke()
        c.restore()
        c.fillStyle = '#6b4424'; ell(c, 0, ys[i], 2.2, 2.2); c.fill()
      }
    },
    explorer: function (c, L, B) {
      var h = L / 2, b = B / 2
      c.fillStyle = '#23272c'; hull(c, h, b); c.fill()
      c.fillStyle = '#b89468'; hull(c, h * 0.9, b * 0.76); c.fill()
      c.fillStyle = '#8d99a3'; c.beginPath(); c.moveTo(0, -h); c.quadraticCurveTo(b, -h * 0.6, b * 0.9, -h * 0.45); c.lineTo(-b * 0.9, -h * 0.45); c.quadraticCurveTo(-b, -h * 0.6, 0, -h); c.fill()
      c.fillStyle = '#f0ead8'; rrect(c, -b * 0.5, h * 0.05, b, h * 0.4, 3); c.fill()
      c.fillStyle = '#e0b35a'; ell(c, 0, h * 0.02, b * 0.34, b * 0.4); c.fill()
      c.fillStyle = '#1d1d1d'; ell(c, 0, h * 0.0, b * 0.2, b * 0.24); c.fill()
      c.strokeStyle = '#efe6d0'; c.lineWidth = 3
      var ys = [-h * 0.35, -h * 0.1, h * 0.55]
      for (var i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-B * 0.8, ys[i]); c.lineTo(B * 0.8, ys[i]); c.stroke() }
    },
    raft: function (c, L, B) {
      var h = L / 2, b = B / 2, n = 7, lw = B / n
      for (var i = 0; i < n; i++) {
        var len = h * (i === 3 ? 1 : i === 2 || i === 4 ? 0.94 : 0.86)
        c.fillStyle = i % 2 ? '#a8753f' : '#c08a4e'; rrect(c, -b + i * lw + 0.4, -len, lw - 0.8, len * 2, lw / 2); c.fill()
      }
      c.strokeStyle = '#6e4a22'; c.lineWidth = 2
      c.beginPath(); c.moveTo(-b, -h * 0.5); c.lineTo(b, -h * 0.5); c.moveTo(-b, h * 0.55); c.lineTo(b, h * 0.55); c.stroke()
      c.fillStyle = '#d8b25a'; rrect(c, -b * 0.45, h * 0.05, b * 0.9, h * 0.5, 3); c.fill()
      c.strokeStyle = '#9a7a2e'; c.lineWidth = 1; c.strokeRect(-b * 0.45, h * 0.05, b * 0.9, h * 0.5)
      c.fillStyle = '#efe0bc'; c.fillRect(-B * 0.62, -h * 0.28, B * 1.24, 5)
      c.fillStyle = '#c0392b'; ell(c, 0, -h * 0.28 + 2.5, 4, 4); c.fill()
    },
    sub: function (c, L, B) {
      var h = L / 2, b = B / 2
      var gr = c.createLinearGradient(0, -h, 0, -h - 130)
      gr.addColorStop(0, 'rgba(255,246,190,.35)'); gr.addColorStop(1, 'rgba(255,246,190,0)')
      c.fillStyle = gr; c.beginPath(); c.moveTo(-b * 0.4, -h); c.lineTo(-48, -h - 130); c.lineTo(48, -h - 130); c.lineTo(b * 0.4, -h); c.closePath(); c.fill()
      c.fillStyle = '#35444f'; c.beginPath(); c.moveTo(-b * 1.9, h * 0.95); c.lineTo(0, h * 0.7); c.lineTo(b * 1.9, h * 0.95); c.lineTo(0, h * 0.82); c.closePath(); c.fill()
      c.fillStyle = '#5d6f7d'; ell(c, 0, 0, b, h); c.fill()
      c.fillStyle = '#7d909e'; ell(c, 0, -h * 0.05, b * 0.45, h * 0.8); c.fill()
      c.fillStyle = '#44535e'; rrect(c, -b * 0.55, -h * 0.35, b * 1.1, h * 0.42, b * 0.5); c.fill()
      c.fillStyle = '#fff3b0'; ell(c, 0, -h * 0.93, b * 0.28, b * 0.28); c.fill()
    }
  }

  /* ── mount ─────────────────────────────────────────────────────────────── */
  // Character Selection (owner 2026-09-28): with window.TKFleet loaded, the child sails the ship they picked.
  // opts.ship given -> that ship; a pick saved for this avatar -> that one; otherwise the TKFleet picker opens
  // first. opts.ship === false (or no TKFleet) = the drawn hull of level.vessel, as before. The returned handle
  // proxies the running game, so "Ganti Kapal" (HUD / pause) can re-open the picker and restart with the new ship.
  function mount (host, level, opts) {
    if (!host) throw new Error('TKSteer.mount: host element required')
    opts = opts || {}
    if (!W.TKFleet || opts.ship === false) return mountCore(host, level, opts, null, null)
    var P = { inner: null, picker: null, dead: false, ship: null }
    function start (id) {
      P.picker = null
      if (P.dead) return
      P.ship = id
      P.inner = mountCore(host, level, opts, id, swap)
    }
    function swap () {
      if (P.dead || P.picker || !P.inner) return
      P.inner.pause(true)
      var av = W.TKFleet.avatar(opts)
      P.picker = W.TKFleet.open(host, { lib: opts.lib, reducedMotion: opts.reducedMotion, sfx: opts.sfx, current: P.ship, title: 'Ganti Kapal', worldShip: opts.world, topInset: opts.topInset,
        onClose: function () { P.picker = null; if (P.inner) P.inner.resume() },
        onPick: function (id) {
          P.picker = null
          W.TKFleet.save(av, id)
          if (id === P.ship) { if (P.inner) P.inner.resume(); return }
          if (P.inner) P.inner.destroy()
          start(id)
        } })
    }
    P.picker = W.TKFleet.resolve(host, opts, start)
    return {
      pause: function () { if (P.inner) P.inner.pause() },
      resume: function () { if (P.inner && !P.picker) P.inner.resume() },
      destroy: function () { P.dead = true; if (P.picker) { P.picker.destroy(); P.picker = null } if (P.inner) P.inner.destroy() },
      setMuted: function (m) { if (!opts.sfx) opts.sfx = {}; opts.sfx.muted = !!m; if (P.inner) P.inner.setMuted(m) },
      changeShip: swap,
      picker: function () { return P.picker },
      state: function () {
        var st = P.inner ? P.inner.state() : { running: false, frames: 0, sent: false }
        st.selecting = !!P.picker; st.ship = P.ship
        return st
      }
    }
  }

  function mountCore (host, level, opts, shipId, onSwap) {
    icons()
    injectCss()
    // resolve the kid assist: level > TKWorlds lookup by goal text > default on
    var lvl = {}
    for (var lk in (level || {})) lvl[lk] = level[lk]
    if ((lvl.assist == null || lvl.first == null) && lvl.goal && W.TKWorlds && typeof W.TKWorlds.findSteer === 'function') {
      try { var fs = W.TKWorlds.findSteer(lvl.goal, lvl.mode); if (fs) { if (lvl.assist == null) lvl.assist = fs.assist; if (lvl.first == null) lvl.first = fs.first } } catch (e) {}
    }
    if (opts.assist != null) lvl.assist = !!opts.assist
    var fleet = shipId && W.TKFleet ? W.TKFleet.get(shipId) : null
    if (fleet) lvl.hull = W.TKFleet.handling(shipId)
    var w = build(lvl)
    var V = w.V
    // embedded questions: only with a host question handler, never on the scripted Titanic run
    var QC = qconf(typeof opts.onQuestion === 'function' && w.mode !== 'scripted' ? lvl : { questions: false })
    var QP = placeQ(w, QC), qBuoys = QP.buoys, qGates = QP.gates
    var SEA = W.TKSea || null
    // sea theme: opts > level > derived (deep sea, night Titanic, polar ice, day harbour)
    function libUrl (k) {
      try { if (typeof opts.lib === 'function') { var u = opts.lib(k); if (u) return u } } catch (e) {}
      return (W.AssetIndex && W.AssetIndex.path(k)) || null
    }
    var themeName = opts.theme || lvl.theme || (w.palette === 'deep' ? 'deep' : w.palette === 'night' ? 'night' : w.mode === 'ice' ? 'polar' : 'day')
    var reduced = !!opts.reducedMotion
    if (opts.reducedMotion == null) { try { reduced = !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches) } catch (e) {} }
    var useCd = opts.countdown != null ? opts.countdown !== false : lvl.countdown !== false
    var goalText = lvl.goalText || lvl.goal

    if (getComputedStyle(host).position === 'static') host.style.position = 'relative'
    var root = el('div', 'tks-root' + (reduced ? ' tks-rm' : '') + (w.assist ? ' tks-kid' : '') + (SEA ? ' tks-sea' : ''))
    root.setAttribute('data-mode', w.mode)
    // the host's top bar stays visible over a steer step: the HUD starts below it (opts.topInset px, default 0)
    root.style.setProperty('--tks-inset', Math.max(0, Math.round(num(opts.topInset, 0))) + 'px')
    var cv = el('canvas', 'tks-cv')
    var ctx = cv.getContext('2d')
    root.appendChild(cv)

    // HUD
    var top = el('div', 'tks-top')
    var goals = el('div', 'tks-goals tks-panel')
    var obsWord = w.obstacle === 'rock' ? 'batu karang' : 'gunung es'
    var chips = []
    function addGoal (key, text, icon) {
      var g = el('div', 'tks-goal', '<span class="tks-ic">' + icon + '</span><span class="tks-gt"></span>')
      g.querySelector('.tks-gt').textContent = text
      g.setAttribute('data-k', key)
      goals.appendChild(g); chips.push(g)
      return g
    }
    var goalChip
    if (w.mode === 'scripted') {
      goalChip = addGoal('calm', goalText || 'Tetap tenang di kemudi', SVG_WAVE)
      addGoal('ice', 'Hindari ' + obsWord, SVG_SHARD)
    } else if (w.goal === 'gates') {
      goalChip = addGoal('gates', goalText || (w.mode === 'sail' ? 'Lewati gerbang dengan angin' : 'Lewati semua gerbang'), SVG_FLAG)
      if (w.mode === 'sail') addGoal('sail', 'Atur layar sampai pas', SVG_WAVE)
      else if (w.ice.length) addGoal('ice', 'Hindari ' + obsWord, SVG_SHARD)
    } else {
      goalChip = addGoal('zone', goalText || (w.mode === 'current' ? 'Capai pulau' : 'Capai zona aman'), SVG_FLAG)
      if (w.mode === 'current') addGoal('cur', 'Lawan arus dengan kemudi', SVG_WAVE)
      else if (w.ice.length) addGoal('ice', 'Hindari ' + obsWord, SVG_SHARD)
    }
    if (w.mode === 'scripted') goals.appendChild(el('div', 'tks-assist', SVG_ASSIST + '<span>Kemudi Dibantu</span>'))
    var stats = el('div', 'tks-stats')
    var pauseBtn = el('button', 'tks-pausebtn tks-btn', SVG_PAUSE)
    pauseBtn.type = 'button'; pauseBtn.setAttribute('aria-label', 'Jeda')
    var timeChip, timeB, countChip, route = null
    if (SEA) {
      timeChip = SEA.chip(libUrl('tk-key/compass'), 'Waktu', 'tks-stat tks-panel')
      timeB = timeChip.querySelector('b'); timeB.textContent = '00:00'
      route = SEA.routeBar({ ship: fleet ? W.TKFleet.sideSrc(shipId, opts) : null, text: '', label: 'Perjalanan ke tujuan', cls: 'tks-route tks-panel' })
      countChip = route.el.querySelector('.tkx-rlabel'); countChip.classList.add('tks-count')
    } else {
      timeChip = el('div', 'tks-stat tks-panel', 'Waktu<b>00:00</b>')
      timeB = timeChip.querySelector('b')
      countChip = el('div', 'tks-stat tks-panel is-one tks-count', '')
    }
    var shipBtn = null, toprow = el('div', 'tks-toprow')
    if (fleet && onSwap) {
      shipBtn = el('button', 'tks-shipbtn tks-btn', '<img alt="" draggable="false">')
      shipBtn.type = 'button'; shipBtn.setAttribute('aria-label', 'Ganti Kapal')
      shipBtn.querySelector('img').src = W.TKFleet.sideSrc(shipId, opts)
      toprow.appendChild(shipBtn)
    }
    toprow.appendChild(pauseBtn)
    stats.appendChild(toprow); stats.appendChild(timeChip); stats.appendChild(route ? route.el : countChip)
    top.appendChild(goals); top.appendChild(stats)
    root.appendChild(top)

    // controls
    var left = el('div', 'tks-left')
    var windEl = null
    if (w.wind) {
      windEl = el('div', 'tks-wind tks-panel', SVG_WIND + '<span>Angin</span>')
      windEl.querySelector('.tks-windarw').style.transform = 'rotate(' + (w.wind.dir * 180 / Math.PI).toFixed(1) + 'deg)'
      left.appendChild(windEl)
    }
    var spdSlow = null, spdFwd = null, sailRange = null, sailHint = null, sailVal = null
    if (w.mode === 'ice') {
      var sp = el('div', 'tks-speed')
      spdSlow = el('button', 'tks-btn tks-spd', 'PELAN'); spdSlow.type = 'button'
      spdFwd = el('button', 'tks-btn tks-spd is-on', 'MAJU'); spdFwd.type = 'button'
      sp.appendChild(spdSlow); sp.appendChild(spdFwd); left.appendChild(sp)
    }
    if (w.mode === 'sail') {
      var sb = el('div', 'tks-sail tks-panel', '<div class="tks-sail-row"><span>Layar</span><span class="tks-sail-hint"></span></div><input class="tks-range" type="range" min="0" max="90" step="1" value="45" aria-label="Sudut layar">')
      sailRange = sb.querySelector('input'); sailHint = sb.querySelector('.tks-sail-hint')
      left.appendChild(sb)
    }
    var radar = el('canvas', 'tks-radar')
    var rctx = radar.getContext('2d')
    left.appendChild(radar)
    var right = el('div', 'tks-right')
    var lr = el('div', 'tks-lr')
    var btnL = el('button', 'tks-btn tks-hold tks-left-btn', SVG_LEFT); btnL.type = 'button'; btnL.setAttribute('aria-label', 'Belok kiri')
    var btnR = el('button', 'tks-btn tks-hold tks-right-btn', SVG_RIGHT); btnR.type = 'button'; btnR.setAttribute('aria-label', 'Belok kanan')
    var demoL = el('span', 'tks-demo tks-demo-l', SVG_LEFT + '<span>Kiri</span>'), demoR = el('span', 'tks-demo tks-demo-r', '<span>Kanan</span>' + SVG_RIGHT)
    btnL.appendChild(demoL); btnR.appendChild(demoR)
    lr.appendChild(btnL); lr.appendChild(btnR)
    var wheelEl = el('div', 'tks-wheel', W.TKIcon ? W.TKIcon('wheel') : wheelSvg())
    wheelEl.setAttribute('role', 'slider'); wheelEl.setAttribute('aria-label', 'Kemudi kapal')
    wheelEl.setAttribute('aria-valuemin', '-100'); wheelEl.setAttribute('aria-valuemax', '100'); wheelEl.setAttribute('aria-valuenow', '0')
    var wheelSvgEl = wheelEl.querySelector('svg,img')
    if (w.assist) {
      // kids: the LEFT button bottom-left, the RIGHT button bottom-right — the side it turns to
      left.appendChild(btnL); right.appendChild(wheelEl); right.appendChild(btnR)
    } else { right.appendChild(lr); right.appendChild(wheelEl) }
    root.appendChild(left); root.appendChild(right)
    var mid = el('div', 'tks-mid')
    root.appendChild(mid)
    var pops = el('div', 'tks-pops')
    root.appendChild(pops)
    var caption = el('div', 'tks-caption tks-panel')
    caption.setAttribute('role', 'status')
    root.appendChild(caption)
    var capEl = el('div', 'tks-cap', '<img alt="Kapten" draggable="false"><div class="tks-bub"><b>Kapten</b><span></span></div>')
    // owner rule: the captain is the old human captain (the penguin is only his assistant)
    capEl.querySelector('img').src = libUrl('tk-char/captain-old') || ''
    capEl.setAttribute('role', 'status')
    root.appendChild(capEl)
    var cdEl = el('div', 'tks-cd', '<b></b><span>Siap…</span>'), cdNum = cdEl.querySelector('b'), cdTxt = cdEl.querySelector('span')
    root.appendChild(cdEl)
    var pauseOv = el('div', 'tks-pause', '<div class="tks-pause-card tks-panel"><h3>Jeda</h3><button class="tks-btn tks-resume" type="button">Lanjut</button></div>')
    root.appendChild(pauseOv)
    if (fleet && fleet.topNote) {
      var topNote = el('p', 'tks-topnote'); topNote.textContent = fleet.topNote
      pauseOv.querySelector('.tks-pause-card').appendChild(topNote)
    }
    if (fleet && onSwap) {
      var swapBtn = el('button', 'tks-btn tks-swap', '<img alt="" draggable="false"><span>Ganti Kapal</span>')
      swapBtn.type = 'button'; swapBtn.querySelector('img').src = W.TKFleet.sideSrc(shipId, opts)
      pauseOv.querySelector('.tks-pause-card').appendChild(swapBtn)
      swapBtn.addEventListener('click', function () { onSwap() })
    }
    host.appendChild(root)

    // sprites (optional)
    var buoyImg = null
    function loadImg (url) {
      if (!url) return null
      var im = new Image()
      im.decoding = 'async'
      im.onerror = function () { im._bad = true }
      im.src = url
      return im
    }
    try { if (typeof opts.lib === 'function') buoyImg = loadImg(opts.lib('game/lifebuoy')) } catch (e) {}
    var artImg = null
    try {
      if (fleet) artImg = loadImg(W.TKFleet.topSrc(shipId, opts))
      else if (opts.art && opts.art[w.vessel]) artImg = loadImg(opts.art[w.vessel])
    } catch (e) {}
    function ready (im) { return im && !im._bad && im.complete && im.naturalWidth > 0 }

    // state
    var S = {
      x: 0, y: 0, a: 0, v: V.vmax * 0.45, yaw: 0, rud: 0, wheel: 0, throttle: 1, sailDeg: 45, sailSide: 1, sailEff: 1,
      t: 0, hits: 0, near: 0, missed: 0, gateIdx: 0, done: false, finishing: 0, impact: null, bumpCd: 0,
      camX: 0, camY: -60, zoom: 1, shake: 0, shakeT: 0, frames: 0, lastTickStep: 0, prevY: 0, over: false,
      cd: useCd ? 3 : 0, cdShown: -1, idleT: 0, sailTouchT: 0, guide: null, touched: false, playerWork: 0, assistWork: 0, unsteered: 0,
      // embedded questions: which one is open, how many of each, cooldown, rewards (shield, boost, bonus stars)
      waiting: false, qOpen: null, qObj: null, qPend: null, qn: { collide: 0, buoy: 0, gate: 0 }, qAsked: 0, qRight: 0, qLog: [], lastColQ: -99,
      shield: false, boostT: 0, easeT: 1, qCombo: 0, bonus: 0
    }
    var input = { hold: 0, btnL: false, btnR: false, keyL: false, keyR: false, drag: false, dragVal: 0 }
    var trail = []
    var parts = []
    var vw = 0, vh = 0, dpr = 1, pr = 1, rq = 1, scale = 1, bgGrad = null, ema = 1 / 60, slowT = 0
    var raf = 0, last = 0, paused = false, dead = false, doneSent = false
    var hudT = 0, radarT = 0, lastHud = {}
    var audio = makeAudio(opts)

    /* sizing */
    function resize () {
      if (dead) return
      var r = host.getBoundingClientRect()
      vw = Math.max(1, Math.round(r.width)); vh = Math.max(1, Math.round(r.height))
      dpr = Math.min(W.devicePixelRatio || 1, 2)
      backing()
      scale = Math.min(vw, vh * 0.78) / 480
      scale = clamp(scale, 0.55, 1.6)
      var pal = PALETTE[w.palette]
      bgGrad = ctx.createLinearGradient(0, 0, 0, vh)
      if (SEA) { var th = SEA.theme(themeName); bgGrad.addColorStop(0, th.top); bgGrad.addColorStop(0.55, th.mid); bgGrad.addColorStop(1, th.bot); vigGrad = SEA.vignette(ctx, vw, vh, themeName) } else { bgGrad.addColorStop(0, pal.top); bgGrad.addColorStop(1, pal.bot) }
      root.classList.toggle('tks-portrait', vh > vw)
      root.classList.toggle('tks-big', Math.min(vw, vh) >= 640)
      root.classList.toggle('tks-short', vh < 480)
      root.classList.toggle('tkx-compact', vh < 480 || vw < 600)
      layoutControls()
      if (route) route.size()
      if (seaP) { var kk = scale * dpr; seaP.prewarm(ctx, [kk, kk * 0.8, kk * 0.6, kk * 0.4, kk * 0.8 * 0.4, kk * 0.8 * 0.6]) }   // the quality steps 1 / 0.8 / 0.6 / 0.4
      var rs = radar.getBoundingClientRect().width || 108
      radar.width = Math.round(rs * dpr); radar.height = Math.round(rs * dpr)
      radarT = 0
      if (!raf) render()
    }
    /* controls: owner 2026-09-28 "kemudi terlalu kecil" -> the wheel and the LEFT / RIGHT buttons are 2x their
       old size (old: wheel 136 px, 156 on a big screen, 124 on a short one; buttons 84 px, 80 on a short
       screen), in the two bottom corners where the thumbs of a two-handed tablet grip rest. Where 2x cannot
       fit beside the ship (a phone on its side) the wheel shrinks just enough — never below 1.3x — and the
       buttons stay 2x. Then the ship is anchored ABOVE any control that shares its lane on screen. */
    var OLD = null, ctrl = { wheel: 0, hold: 0, k: 2 }, midY = 0
    function layoutControls () {
      var big = Math.min(vw, vh) >= 640, short = vh < 480
      OLD = { wheel: big ? 156 : short ? 124 : 136, hold: short ? 80 : 84 }
      var hold = OLD.hold * 2, wheel = OLD.wheel * 2
      var port = vh > vw, narrow = w.assist && port && vw < 600
      root.classList.toggle('tks-narrow', narrow)
      if (narrow) {
        // phone upright (playtest 2026-09-30: the 2x wheel filled the sea ahead): ONE bottom row
        // [LEFT][wheel][RIGHT] at the bottom edge, the wheel <= 30% of the height, the ship always above it
        if (wheelEl.parentNode !== mid) mid.appendChild(wheelEl)
        wheel = Math.min(Math.round(vh * 0.3), 200)
        hold = Math.floor((vw - 40 - wheel) / 2)
        if (hold < 88) { hold = 88; wheel = vw - 40 - 2 * hold }
        hold = Math.min(hold, 150)
      } else if (w.assist && short && !port) {
        // phone on its side: [LEFT][wheel] ... [RIGHT], the wheel must end before the ship's lane
        if (wheelEl.parentNode !== left) left.appendChild(wheelEl)
        var clear = V.L * 1.08 * scale * 0.55 + vh * 0.06 + 16      // = the ship band used for the anchor below
        wheel = Math.min(wheel, vw / 2 - clear - 12 - hold - 10, vh - 24 - 64)
      } else if (w.assist) {
        if (wheelEl.parentNode !== right || wheelEl.nextSibling !== btnR) right.insertBefore(wheelEl, btnR)
        wheel = Math.min(wheel, vw - 24, vh - 24 - hold - 10 - 150)
      } else {
        wheel = Math.min(wheel, vh - 24 - hold - 10 - 150)
      }
      if (!narrow) wheel = Math.max(Math.round(wheel), Math.round(OLD.wheel * 1.3))
      if (port && !narrow) {
        // a small phone upright (360x640): the column (wheel above RIGHT) must still leave room under the HUD
        // for the ship, so both shrink together — buttons never below 96 px, the wheel never below 140
        var rr0 = root.getBoundingClientRect(), statsB = stats.getBoundingClientRect().bottom - rr0.top
        var avail = vh - statsB - (V.L * 1.08 * scale + 70) - 12
        if (wheel + 10 + hold > avail) {
          var f0 = Math.max(0.3, avail / (wheel + 10 + hold))
          hold = Math.max(96, Math.round(hold * f0)); wheel = Math.max(140, Math.round(avail - 10 - hold))
        }
      }
      ctrl = { wheel: wheel, hold: hold, k: Math.min(wheel / OLD.wheel, hold / OLD.hold) }
      root.style.setProperty('--tks-wheel', wheel + 'px')
      root.style.setProperty('--tks-hold', hold + 'px')
      // anchor: the ship (plus its look-ahead swing) must clear every control whose x-range it shares
      var rr = root.getBoundingClientRect()
      var shipPx = V.L * 1.08 * scale, look = vh * 0.1
      var band = shipPx * 0.55 + look * 0.6 + 14, x0 = vw / 2 - band, x1 = vw / 2 + band
      var lim = vh, top = 0
      ;[btnL, btnR, wheelEl, radar, left.querySelector('.tks-sail'), left.querySelector('.tks-speed'), windEl].forEach(function (e) {
        if (!e || !e.offsetWidth) return
        var b = e.getBoundingClientRect(), l = b.left - rr.left, r = b.right - rr.left
        if (r > x0 && l < x1) lim = Math.min(lim, b.top - rr.top)
      })
      top = (goals.getBoundingClientRect().bottom - rr.top) || 0
      var shipY = Math.min(vh / 2 + look, lim - shipPx * 0.5 - 18)
      midY = Math.max(top + shipPx * 0.5 + 12 - look * 0.5, shipY - look)
      midY = Math.min(midY, vh / 2)
      var ch = 0
      ;[right, left].forEach(function (e) { var b = e.getBoundingClientRect(); if (b.height) ch = Math.max(ch, rr.bottom - b.top) })
      root.style.setProperty('--tks-ctrlh', Math.round(ch + 14) + 'px')
    }
    // adaptive render resolution: a slow device keeps its frame rate by drawing fewer pixels
    function backing () {
      pr = dpr * rq
      cv.width = Math.max(1, Math.round(vw * pr)); cv.height = Math.max(1, Math.round(vh * pr))
    }
    function adapt (dt) {
      ema += (dt - ema) * 0.1
      slowT = clamp(slowT + (ema > 1 / 38 ? dt : -dt * 0.5), 0, 3)   // < ~38 fps average = slow (a 30 fps device steps down)
      // a slow device settles within ~2 s (each step re-allocates the canvas once); a device still slower than
      // ~38 fps at 0.6 goes to 0.4: at 4x CPU the canvas flush (ProduceCanvasResource in the commit)
      // was ~20-33 ms per frame and its spikes crossed the 50 ms long-task line (perf gate, 2026-09-30)
      if (slowT > 0.6 && rq > 0.41) { rq = Math.max(0.4, rq - 0.2); slowT = 0; backing() }
    }
    var ro = null
    if (W.ResizeObserver) { ro = new ResizeObserver(resize); ro.observe(host) } else W.addEventListener('resize', resize)

    /* input: hold buttons */
    // hold buttons track EVERY pointer by id: a second finger lifting elsewhere (or on the other button)
    // never releases this one, and this one stays down until ITS last pointer is up / cancelled
    var holds = { btnL: {}, btnR: {} }
    function holdCount (key) { var n = 0; for (var k in holds[key]) n++; return n }
    function bindHold (btn, key) {
      function sync () { input[key] = holdCount(key) > 0; btn.classList.toggle('is-on', input[key]) }
      function on (e) {
        if (e && e.cancelable) e.preventDefault()
        var id = e && e.pointerId != null ? e.pointerId : 'x'
        holds[key][id] = true; sync(); unlock()
        if (!S.touched) S.touched = true
        try { if (e && e.pointerId != null && btn.setPointerCapture) btn.setPointerCapture(e.pointerId) } catch (x) {}
      }
      function off (e) {
        var id = e && e.pointerId != null ? e.pointerId : 'x'
        if (holds[key][id]) { delete holds[key][id]; sync() }
      }
      btn.addEventListener('pointerdown', on)
      btn.addEventListener('pointerup', off)
      btn.addEventListener('pointercancel', off)
      btn.addEventListener('lostpointercapture', off)
      btn.addEventListener('contextmenu', function (e) { e.preventDefault() })
      // keyboard focus on the button itself: Space/Enter hold it like a key
      btn.addEventListener('keydown', function (e) { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); holds[key].kb = true; sync(); S.touched = true } })
      btn.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'Enter') { delete holds[key].kb; sync() } })
    }
    function releaseHolds () { holds.btnL = {}; holds.btnR = {}; input.btnL = input.btnR = false; btnL.classList.remove('is-on'); btnR.classList.remove('is-on') }
    bindHold(btnL, 'btnL'); bindHold(btnR, 'btnR')

    /* input: the wheel (rotate by dragging around its centre) */
    var drag = null
    function wheelAng (e) {
      var r = wheelEl.getBoundingClientRect()
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2
      return { a: Math.atan2(e.clientY - cy, e.clientX - cx), d: Math.hypot(e.clientX - cx, e.clientY - cy), x: e.clientX }
    }
    wheelEl.addEventListener('pointerdown', function (e) {
      if (e.cancelable) e.preventDefault()
      unlock()
      var p = wheelAng(e)
      drag = { id: e.pointerId, last: p.a, lastX: p.x, acc: S.wheel * WHEEL_DEG * Math.PI / 180 }
      S.touched = true
      input.drag = true; input.dragVal = S.wheel
      wheelEl.classList.add('is-drag')
      try { wheelEl.setPointerCapture(e.pointerId) } catch (x) {}
    })
    wheelEl.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return
      var p = wheelAng(e)
      if (p.d > 12) drag.acc += angNorm(p.a - drag.last)
      else drag.acc += (p.x - drag.lastX) / 60
      drag.last = p.a; drag.lastX = p.x
      var lim = WHEEL_DEG * Math.PI / 180
      drag.acc = clamp(drag.acc, -lim, lim)
      input.dragVal = drag.acc / lim
    })
    function endDrag (e) {
      if (!drag || (e && e.pointerId !== drag.id)) return
      drag = null; input.drag = false
      wheelEl.classList.remove('is-drag')
    }
    wheelEl.addEventListener('pointerup', endDrag)
    wheelEl.addEventListener('pointercancel', endDrag)
    wheelEl.addEventListener('lostpointercapture', endDrag)

    /* input: keyboard */
    function onKey (e) {
      if (dead) return
      var down = e.type === 'keydown'
      var k = e.key
      var tgt = e.target
      if (tgt && tgt.tagName === 'INPUT' && tgt.type === 'range') return
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') { input.keyL = down; if (down) S.touched = true; e.preventDefault() }
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') { input.keyR = down; if (down) S.touched = true; e.preventDefault() }
      else if (down && (k === 'ArrowUp' || k === 'w' || k === 'W') && spdFwd) { setThrottle(1); e.preventDefault() }
      else if (down && (k === 'ArrowDown' || k === 's' || k === 'S') && spdSlow) { setThrottle(0.45); e.preventDefault() }
      if (down) unlock()
    }
    W.addEventListener('keydown', onKey)
    W.addEventListener('keyup', onKey)
    function onBlur () { input.keyL = input.keyR = false }
    W.addEventListener('blur', onBlur)

    function setThrottle (v) {
      S.throttle = v
      if (spdSlow) { spdSlow.classList.toggle('is-on', v < 1); spdFwd.classList.toggle('is-on', v >= 1) }
      audio.tick()
    }
    if (spdSlow) {
      spdSlow.addEventListener('click', function () { setThrottle(0.45) })
      spdFwd.addEventListener('click', function () { setThrottle(1) })
    }
    if (sailRange) sailRange.addEventListener('input', function () { S.sailDeg = +sailRange.value || 0; S.sailTouchT = 0; unlock() })

    pauseBtn.addEventListener('click', function () { handle.pause() })
    if (shipBtn) shipBtn.addEventListener('click', function () { onSwap() })
    pauseOv.querySelector('.tks-resume').addEventListener('click', function () { handle.resume() })

    function unlock () {
      var c = audio.ensure()
      if (!c) return
      audio.startBed()
      if (!audio.hornDone && S.t < 6) setTimeout(function () { if (!dead) audio.horn() }, 60)
    }
    root.addEventListener('pointerdown', unlock)

    /* visibility */
    function onVis () {
      if (D.hidden) { stop(); audio.suspend() } else if (!paused && !S.waiting) { audio.ensure(); start() }
    }
    D.addEventListener('visibilitychange', onVis)

    // the ship's screen box (axis-aligned around the rotated hull) — for the QA no-overlap check
    function shipRect () {
      var p = worldToScreen(S.x, S.y), z = scale * S.zoom
      var hl = V.L * 0.54 * z, hb = (artImg && ready(artImg) ? V.L * 0.54 * artImg.naturalWidth / artImg.naturalHeight : V.B * 0.5) * z
      var c = Math.abs(Math.cos(S.a)), sn = Math.abs(Math.sin(S.a))
      var ex = hb * c + hl * sn, ey = hl * c + hb * sn
      return { left: p.x - ex, top: p.y - ey, right: p.x + ex, bottom: p.y + ey }
    }
    /* helpers */
    function fwd () { return { x: Math.sin(S.a), y: -Math.cos(S.a) } }
    function worldToScreen (x, y) {
      var z = scale * S.zoom
      return { x: vw / 2 + (x - S.camX) * z, y: midY + (y - S.camY) * z }
    }
    // shared VFX library moment (games/vfx-moments.js) at a world position; size follows the vessel's on-screen length
    function moment (kind, x, y, mult) {
      try {
        var M = window.VFX && VFX.Moment; if (!M || !M.ready()) return
        var p = worldToScreen(x, y), r = pops.getBoundingClientRect()
        M[kind]({ x: r.left + p.x, y: r.top + p.y }, { size: Math.max(110, V.L * scale * S.zoom * 1.7 * (mult || 1)) })
      } catch (e) {}
    }
    function pop (text, x, y, good) {
      var p = worldToScreen(x, y)
      var e = el('div', 'tks-pop' + (good ? ' is-good' : '') + (SEA ? ' tkx-pop' : ''))
      e.textContent = text
      e.style.left = clamp(p.x, 60, vw - 60) + 'px'
      e.style.top = clamp(p.y, 90, vh - 160) + 'px'
      pops.appendChild(e)
      setTimeout(function () { if (e.parentNode) e.parentNode.removeChild(e) }, 1200)
    }
    // gold sparkles (gate shimmer, combo)
    function sparkle (x, y, n) {
      if (reduced) return
      for (var i = 0; i < n && parts.length < 160; i++) {
        var a = Math.random() * TAU, s2 = 40 + Math.random() * 90
        parts.push({ x: x, y: y, vx: Math.cos(a) * s2, vy: Math.sin(a) * s2, life: 0, max: 0.6 + Math.random() * 0.5, r: 2 + Math.random() * 2.5, c: Math.random() < 0.5 ? '#ffe066' : '#fff6c8' })
      }
    }
    function spray (x, y, n, spd, nx, ny) {
      if (reduced) return
      for (var i = 0; i < n && parts.length < 140; i++) {
        var a = Math.random() * TAU
        var s = spd * (0.4 + Math.random() * 0.8)
        parts.push({ x: x, y: y, vx: Math.cos(a) * s + (nx || 0) * spd * 0.8, vy: Math.sin(a) * s + (ny || 0) * spd * 0.8, life: 0, max: 0.5 + Math.random() * 0.5, r: 2 + Math.random() * 3.5 })
      }
    }
    function circles () {
      var f = fwd(), out = [], r = V.B * 0.6
      var offs = V.L > 60 ? [0.33, 0, -0.33] : [0.22, -0.22]
      for (var i = 0; i < offs.length; i++) out.push({ x: S.x + f.x * V.L * offs[i], y: S.y + f.y * V.L * offs[i], r: r })
      return out
    }
    function currentAt (x, y) {
      var cx = 0, cy = 0
      for (var i = 0; i < w.currents.length; i++) {
        var c = w.currents[i]
        if (Math.abs(x - c.x) < c.w / 2 && Math.abs(y - c.y) < c.h / 2) {
          var edge = clamp((c.h / 2 - Math.abs(y - c.y)) / 60, 0, 1)
          cx += Math.sin(c.dir) * c.s * edge; cy += -Math.cos(c.dir) * c.s * edge
        }
      }
      return { x: cx, y: cy }
    }
    function sailModel () {
      var rel = Math.abs(angNorm(S.a - w.wind.dir))          // 0 = wind behind, PI = straight into it
      var deg = rel * 180 / Math.PI
      var polar = deg > 150 ? 0.12 : deg <= 90 ? 0.55 + 0.45 * Math.sin(rel) : 1 - (deg - 90) / 60 * 0.6
      var opt = clamp(90 - deg * 0.55, 10, 90)
      var eff = clamp(1 - Math.abs(S.sailDeg - opt) / 60, 0.3, 1)
      S.sailSide = angNorm(w.wind.dir - S.a) > 0 ? 1 : -1
      return { polar: polar, opt: opt, eff: eff }
    }
    function aimPoint () {
      // pure pursuit along the safe path (it runs through every gate centre)
      var ay = Math.max(S.y - Math.max(300, V.L * 2.4), w.zoneY - 200)
      return { x: pathX(w, ay), y: ay }
    }

    /* simulation */
    // "Siap… Mulai!": 3 s, the ship shows LEFT (button 1 glows, bow swings left) then RIGHT, then 1
    function countdown (dt) {
      S.cd = Math.max(0, S.cd - dt)
      var ph = 3 - S.cd, n = Math.ceil(S.cd)
      if (n !== S.cdShown) {
        S.cdShown = n
        cdEl.classList.add('is-on'); root.classList.toggle('tks-cdon', n > 0)
        cdEl.classList.toggle('is-go', n === 0)
        cdNum.textContent = n > 0 ? String(n) : 'Mulai!'
        cdTxt.textContent = n === 3 ? 'Siap… belok kiri' : n === 2 ? 'Siap… belok kanan' : n === 1 ? 'Siap…' : 'Ayo berlayar!'
        cdTxt.style.visibility = n === 0 ? 'hidden' : ''
        if (!reduced) { cdNum.classList.remove('is-pop'); void cdNum.offsetWidth; cdNum.classList.add('is-pop') }
        btnL.classList.toggle('is-demo', n === 3); btnR.classList.toggle('is-demo', n === 2)
        if (n === 0) { audio.chime(false); setTimeout(function () { if (!dead) cdEl.classList.remove('is-on') }, 700) } else audio.tick()
      }
      // demo: the bow swings the way the glowing button turns
      var demoA = reduced ? 0 : 0.32
      S.a = ph < 1 ? -demoA * Math.sin(Math.PI * ph) : ph < 2 ? demoA * Math.sin(Math.PI * (ph - 1)) : 0
      S.wheel = ph < 1 ? -Math.sin(Math.PI * ph) * 0.8 : ph < 2 ? Math.sin(Math.PI * (ph - 1)) * 0.8 : 0
      if (S.cd <= 0) { S.a = 0; S.yaw = 0; S.wheel = 0; S.rud = 0; btnL.classList.remove('is-demo'); btnR.classList.remove('is-demo') }
      audio.sync()
    }
    function step (dt) {
      if (S.cd > 0) { countdown(dt); return }
      if (!S.done) S.t += dt
      S.prevY = S.y
      // wheel: drag = direct, buttons/keys = ramp, released = snap back to centre
      var hold = (input.btnR || input.keyR ? 1 : 0) - (input.btnL || input.keyL ? 1 : 0)
      var before = S.wheel
      // eased wheel: a drag follows the finger with a light low-pass (no jitter); a held button eases in
      // (ease-out, ~90% in 0.5 s) and the released wheel eases back to centre — never a jump
      if (input.drag) S.wheel += (input.dragVal - S.wheel) * damp(18, dt)
      else S.wheel += (hold - S.wheel) * damp(hold !== 0 ? 4.6 : 6, dt)
      if (Math.abs(S.wheel) < 0.002 && hold === 0 && !input.drag) S.wheel = 0
      if (Math.floor(before * 5) !== Math.floor(S.wheel * 5) && Math.abs(S.wheel - before) < 0.5) audio.tick()
      // who steered since the last gate: the child's own wheel vs the assist (a gate needs the child's input)
      if (hold !== 0 || input.drag) S.playerWork += Math.abs(S.wheel) * dt
      // kid assist: with no input the bow gently straightens onto the course (never fights the child)
      var assistRud = 0
      if (hold === 0 && !input.drag) S.idleT += dt; else S.idleT = 0
      if (w.assist && w.mode !== 'scripted' && !S.done && S.idleT > 0.35) {
        // straighten the BOW onto the course DIRECTION only (the path's heading here), never pull the ship
        // sideways onto the gate line: lining up with a gate is the child's job (owner 2026-09-28: the assist
        // used to steer through the gates with zero input)
        var cy0 = S.y - 60, cy1 = S.y - 260, want = Math.atan2(pathX(w, cy1) - pathX(w, cy0), 200)
        var err = angNorm(want - S.a - S.yaw * 0.6)
        assistRud = clamp(err * 1.8, -0.55, 0.55) * clamp((S.idleT - 0.35) / 0.8, 0, 1)
        S.assistWork += Math.abs(assistRud) * dt
      }
      if (S.net && w.mode !== 'scripted' && !S.done) {
        // safety net: a gentle current eases the bow toward the course heading, even under input (weak)
        var ny0 = S.y - 60, ny1 = S.y - 260, cw = Math.atan2(pathX(w, ny1) - pathX(w, ny0), 200)
        var cerr = angNorm(cw - S.a - S.yaw * 0.6)
        assistRud += clamp(cerr * 0.9, -0.3, 0.3)
      }
      if (w.assist && w.mode === 'sail' && S.sailOpt != null && !S.done) {
        S.sailTouchT += dt
        if (S.sailTouchT > 3) { S.sailDeg = approach(S.sailDeg, S.sailOpt, 12 * dt); if (sailRange) sailRange.value = String(Math.round(S.sailDeg)) }
      }
      // rudder follows the wheel; the ship's yaw follows the rudder (inertia)
      S.rud += (clamp(S.wheel + assistRud, -1, 1) - S.rud) * damp(V.rud, dt)
      var eff = S.rud
      var wallDist = w.mode === 'scripted' ? S.y - w.zoneY : 1e9
      if (w.mode === 'scripted') eff *= wallDist < 700 ? 0.45 : 0.7
      var spd = S.v / V.vmax
      var yawT = eff * V.turn * (0.35 + 0.65 * clamp(spd / 0.5, 0, 1))
      if (S.impact) yawT = -0.05
      S.yaw += (yawT - S.yaw) * damp(V.yaw, dt)
      S.a = angNorm(S.a + S.yaw * dt)
      if (w.mode === 'scripted') {
        // assisted steering: the bow always stays within a gentle arc of the course
        var lim = 0.42
        if (S.a > lim) { S.a = lim; if (S.yaw > 0) S.yaw *= 0.4 } else if (S.a < -lim) { S.a = -lim; if (S.yaw < 0) S.yaw *= 0.4 }
      }
      // speed
      var vmax = V.vmax * w.speedK
      var vt = vmax * S.throttle
      if (w.mode === 'sail' && w.wind) {
        var sm = sailModel()
        S.sailEff = sm.eff; S.sailOpt = sm.opt; S.sailPolar = sm.polar
        vt = Math.max(vmax * 0.18, vmax * w.wind.strength * sm.polar * sm.eff)
      }
      if (w.mode === 'scripted') vt = vmax * 0.85
      if (S.impact || S.finishing) vt = 0
      // rewards + resume: a 3 s speed boost after a right answer; after any question the ship eases back up
      if (S.boostT > 0) { S.boostT = Math.max(0, S.boostT - dt); if (!S.impact && !S.finishing) vt *= 1.35 }
      if (S.easeT < 1) { S.easeT = Math.min(1, S.easeT + dt / 1.2); var ez = S.easeT; vt *= 0.2 + 0.8 * ez * ez * (3 - 2 * ez) }
      var acc = S.impact ? 1.4 : S.finishing ? 0.9 : S.boostT > 0 ? Math.max(V.acc, 1.2) : V.acc
      S.v += (vt - S.v) * damp(acc, dt)
      var f = fwd()
      var vx = f.x * S.v, vy = f.y * S.v
      if (w.currents.length) {
        var cu = currentAt(S.x, S.y), k = w.vessel === 'raft' ? 1 : 0.6
        vx += cu.x * k; vy += cu.y * k
      }
      S.x += vx * dt; S.y += vy * dt
      // corridor: soft push back near the rope line, hard edge a little beyond
      var edge = w.half - 30
      if (Math.abs(S.x) > edge) {
        var over = Math.abs(S.x) - edge, sgn = S.x > 0 ? 1 : -1
        S.x -= sgn * Math.min(over, 60 * dt + over * 2 * dt)
        S.x = clamp(S.x, -w.half - 20, w.half + 20)
      }
      if (S.y > 320) S.y = 320
      if (S.bumpCd > 0) S.bumpCd -= dt
      collide(dt)
      if (qTick(dt)) return
      progress()
      // wake trail (stern), foam, particles
      var sx = S.x - f.x * V.L * 0.5, sy = S.y - f.y * V.L * 0.5
      var lt = trail[0]
      if (!lt || Math.hypot(lt.x - sx, lt.y - sy) > 7) trail.unshift({ x: sx, y: sy, a: S.a, age: 0 })
      for (var i = trail.length - 1; i >= 0; i--) { trail[i].age += dt; if (trail[i].age > 3.6 || i > 80) trail.splice(i, 1) }
      for (var j = parts.length - 1; j >= 0; j--) {
        var p = parts[j]
        p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96
        if (p.life > p.max) parts.splice(j, 1)
      }
      for (var bi = 0; bi < w.ice.length; bi++) w.ice[bi].rot += w.ice[bi].spin * dt
      // camera: look-ahead + damping (reduced motion: fixed offset, no shake, no push)
      var viewH = vh / (scale * S.zoom)
      if (reduced) {
        S.camX = S.x; S.camY = S.y - viewH * 0.08
      } else {
        var look = viewH * 0.1 * (0.5 + 0.5 * clamp(S.v / V.vmax, 0, 1))
        var tx = S.x + f.x * look, ty = S.y + f.y * look
        var kc = damp(2.4, dt)
        S.camX += (tx - S.camX) * kc; S.camY += (ty - S.camY) * kc
        S.shake *= Math.exp(-dt * 7); S.shakeT += dt
        if (S.impact) S.zoom = 1 + 0.2 * clamp(S.impact.t / 3.2, 0, 1) * (2 - clamp(S.impact.t / 3.2, 0, 1))
      }
      if (S.impact) impactTick(dt)
      if (S.finishing) {
        S.finishing += dt
        // a gentle camera zoom-out as the ship arrives
        if (!reduced && !S.impact) { var fz = clamp(S.finishing / 1.4, 0, 1); S.zoom = 1 - 0.2 * fz * fz * (3 - 2 * fz) }
        if (S.finishing > 1.6) finish()
      }
      // bow spray at speed
      if (!reduced && !S.done && S.v > V.vmax * w.speedK * 0.75 && parts.length < 120 && Math.random() < 0.35) {
        var bf = fwd(), side = Math.random() < 0.5 ? -1 : 1, bxs = S.x + bf.x * V.L * 0.45, bys = S.y + bf.y * V.L * 0.45
        parts.push({ x: bxs + bf.y * V.B * 0.3 * side, y: bys - bf.x * V.B * 0.3 * side, vx: -bf.y * 45 * side + bf.x * 20, vy: bf.x * 45 * side + bf.y * 20, life: 0, max: 0.4 + Math.random() * 0.3, r: 1.5 + Math.random() * 2 })
      }
      if (w.mode === 'scripted' && !S.impact && S.t > 150) startImpact(S.x, S.y - V.L / 2)
      safetyNet()
      audio.sync()
    }

    function collide (dt) {
      if (!w.ice.length) return
      var cs = circles()
      for (var i = 0; i < w.ice.length; i++) {
        var b = w.ice[i]
        if (Math.abs(b.y - S.y) > b.r + V.L) { if (b.nearArm) awardNear(b); continue }
        var best = 1e9, bc = null
        for (var j = 0; j < cs.length; j++) {
          var c = cs[j]
          var dd = Math.hypot(c.x - b.x, c.y - b.y) - (b.r * 0.9 + c.r)
          if (dd < best) { best = dd; bc = c }
        }
        if (best < 0) {
          var dx = bc.x - b.x, dy = bc.y - b.y, dl = Math.hypot(dx, dy) || 1
          var nx = dx / dl, ny = dy / dl
          S.x += nx * -best; S.y += ny * -best
          if (b.wall && w.mode === 'scripted') { if (!S.impact) startImpact(b.x + nx * b.r, b.y + ny * b.r); continue }
          b.nearArm = false
          if (S.bumpCd <= 0) bump(b, nx, ny)
        } else if (best < NEAR && !b.bumped && !b.nearDone && !b.wall) {
          b.nearArm = true
        } else if (b.nearArm && best > NEAR * 1.9) {
          awardNear(b)
        }
      }
    }
    /* safety net (playtest 2026-09-29: a wobbling kid circled for 208 s): after 90 s of sailing the level quietly
       shortens (only the next gate is left, or the harbour comes closer) and the sea's current eases the bow
       toward the course HEADING (never toward a gate's position: the route is not revealed); at 150 s the ship
       arrives, calm, like any finish. Question time does not count (S.t only runs while sailing). */
    var NET_T = num(opts.netAfter, 90), CAP_T = num(opts.capAfter, 150)   // QA seam: opts.netAfter / capAfter (s)
    function safetyNet () {
      if (S.done || w.mode === 'scripted') return
      if (!S.net && S.t > NET_T) {
        S.net = true
        if (w.goal === 'gates' && w.gates.length > S.gateIdx + 1) { w.gates.length = S.gateIdx + 1; w.zoneY = w.gates[S.gateIdx].y - 200; hudT = 0 }
        else if (w.goal === 'zone') { w.zoneY = Math.max(w.zoneY, S.y - 900) }
        for (var i = qGates.length - 1; i >= 0; i--) if (!qGates[i].asked && qGates[i].y < w.zoneY + 100) qGates.splice(i, 1)
        for (var j = qBuoys.length - 1; j >= 0; j--) if (!qBuoys[j].taken && qBuoys[j].y < w.zoneY + 100) qBuoys.splice(j, 1)
        pop('Hampir sampai!', S.x, S.y - V.L * 0.8, true)
      }
      if (S.t > CAP_T && !S.finishing) beginFinish()
    }
    function awardNear (b) {
      b.nearArm = false
      if (b.bumped || b.nearDone || S.done) return
      b.nearDone = true
      S.near++
      var f = fwd()
      spray(S.x + f.x * V.L * 0.3, S.y + f.y * V.L * 0.3, 14, 70, 0, 0)
      pop('Nyaris!', S.x, S.y - V.L * 0.7, false)
      audio.splash(0.6)
    }
    function bump (b, nx, ny) {
      if (S.shield) {
        // the shield bubble takes this bump: no slow-down, no question
        S.shield = false; b.bumped = true; S.bumpCd = 1.3
        spray(b.x + nx * b.r, b.y + ny * b.r, 16, 80, nx, ny); sparkle(S.x, S.y, 18); moment('reward', S.x, S.y, 1)
        pop('Perisai melindungi!', S.x, S.y - V.L * 0.7, true); audio.chime(false)
        return
      }
      if (canAskCollide()) { S.qn.collide++; S.lastColQ = S.t; S.qPend = { obj: b, t: reduced ? 0.35 : 0.6 } }
      b.bumped = true
      S.bumpCd = 1.3
      if (!S.done) S.hits++
      S.combo = 0
      S.v *= V.keep
      // bow turns gently away from the ice so the ship slides off instead of sticking
      var f = fwd()
      var side = f.x * ny - f.y * nx
      S.yaw += (side > 0 ? 1 : -1) * 0.18 + (Math.abs(side) < 0.2 ? (S.x < pathX(w, S.y) ? 0.15 : -0.15) : 0)
      if (!reduced) { S.shake = 5; S.shakeT = 0 }
      spray(b.x + nx * b.r, b.y + ny * b.r, 18, 90, nx, ny)
      audio.rumble(0.7, 0.7)
      audio.splash(0.8)
      try { if (navigator.vibrate && !audio.muted()) navigator.vibrate(40) } catch (e) {}
      pop('Pelan-pelan', S.x, S.y - V.L * 0.7, false)
      hudT = 0
    }
    /* ── embedded questions: ONE contract for collide / buoy / gate ──
       the simulation freezes (rAF stopped, ship exactly where it is), opts.onQuestion({reason, topic, …}) ->
       Promise<{correct}>, then answered() resumes with a gentle ease-in. Nothing is ever lost: a wrong answer
       only misses the bonus, and a gate's chain always drops. */
    function canAskCollide () { return !!QC.on.collide && S.qn.collide < QC.count && S.t - S.lastColQ >= Q_COOL }
    function bowY () { return S.y + fwd().y * V.L / 2 }
    function qTick (dt) {
      if (S.waiting || S.done || S.cd > 0) return false
      if (S.qPend) { S.qPend.t -= dt; if (S.qPend.t <= 0) { var qp = S.qPend; S.qPend = null; ask('collide', qp.obj); return true } }
      var by = bowY(), cs = null
      for (var g = 0; g < qGates.length; g++) {
        var G = qGates[g]
        if (G.dropping && G.drop < 1) { G.drop = Math.min(1, G.drop + dt / (reduced ? 0.25 : 0.75)); if (G.drop >= 1) G.open = true }
        if (G.open) continue
        if (!G.asked && by <= G.y + 70) { G.asked = true; S.y += G.y + 70 - by; S.v = 0; ask('gate', G); return true }
        // the chain is still up: the ship waits in front of it
        if (G.asked && G.drop < 0.55 && by < G.y + 60) { S.y += G.y + 60 - by; S.v = Math.min(S.v, 4) }
      }
      for (var i = 0; i < qBuoys.length; i++) {
        var B = qBuoys[i]
        if (B.taken) continue
        var ahead = S.y - B.y
        if (ahead > -20 && ahead < 300 && Math.abs(B.x - S.x) < 180) B.x += (S.x - B.x) * Math.min(1, dt * (ahead < 150 ? 3.5 : 1.6))
        if (ahead < -V.L) { B.taken = true; continue }
        cs = cs || circles()
        for (var j = 0; j < cs.length; j++) if (Math.hypot(cs[j].x - B.x, cs[j].y - B.y) < cs[j].r + 36) { B.taken = true; ask('buoy', B); return true }
      }
      return false
    }
    function introFor (reason, obj) {
      if (reason === 'collide') return w.obstacle === 'rock' ? 'Kapal menyentuh karang! Jawab soal ini, lalu kapal berlayar lagi.' : 'Kapal membentur es! Jawab soal ini, lalu kapal berlayar lagi.'
      if (reason === 'buoy') return obj && obj.kind === 'chest' ? 'Peti Harta! Jawab dengan benar untuk harta bonus.' : 'Pelampung Soal! Jawab dengan benar untuk bintang bonus.'
      return 'Gerbang Mercusuar! Jawab soalnya, lalu rantai diturunkan.'
    }
    function ask (reason, obj) {
      S.waiting = true; S.qOpen = reason; S.qObj = obj || null
      root.classList.add('tks-asking')
      if (reason !== 'collide') S.qn[reason]++
      S.qAsked++
      releaseHolds(); input.keyL = input.keyR = false; input.drag = false; drag = null
      render(); stop()
      var info = { reason: reason, topic: QC.topic, index: S.qAsked, hits: S.hits, mode: w.mode, obstacle: w.obstacle, kind: obj && obj.kind, intro: introFor(reason, obj) }
      var pr0
      try { pr0 = opts.onQuestion(info) } catch (e) { pr0 = null; if (W.console) console.error(e) }
      pending = pr0
      var fin0 = function (res) { if (pending !== pr0) return; pending = null; answered(reason, obj, res || { correct: true, tries: 1, hints: 0 }) }
      if (pr0 && typeof pr0.then === 'function') pr0.then(fin0, function () { fin0(null) })
      else fin0(pr0)
    }
    var capTok = 0
    function sayBrief (text) {
      capEl.querySelector('span').textContent = text; capEl.classList.add('is-on')
      var tok = ++capTok
      setTimeout(function () { if (!dead && tok === capTok) capEl.classList.remove('is-on') }, 2600)
    }
    function answered (reason, obj, res) {
      if (dead) return
      var ok = !!res.correct
      S.qOpen = null; S.qObj = null; S.waiting = false
      root.classList.remove('tks-asking')
      S.qLog.push({ reason: reason, correct: ok, t: Math.round(S.t * 10) / 10 })
      if (ok) S.qRight++
      S.qCombo = ok ? S.qCombo + 1 : 0
      S.easeT = 0
      if (!ok) sayBrief(Q_WRONG)
      if (reason === 'collide') {
        if (ok) { S.shield = true; sparkle(S.x, S.y, 22); moment('reward', S.x, S.y, 1); pop('Perisai aktif!', S.x, S.y - V.L * 0.7, true) } else pop('Tetap semangat!', S.x, S.y - V.L * 0.7, true)
      } else if (reason === 'buoy') {
        if (ok) {
          S.bonus++; S.boostT = 3
          sparkle(obj.x, obj.y, 30); moment('reward', obj.x, obj.y, 1.2); if (confetti && !reduced) confetti.burst(vw / 2, vh * 0.45, 40)
          pop(obj.kind === 'chest' ? 'Harta bonus! Melaju cepat!' : 'Bintang bonus! Melaju cepat!', S.x, S.y - V.L * 0.8, true)
        } else pop('Tetap semangat!', S.x, S.y - V.L * 0.7, true)
      } else if (reason === 'gate') {
        var drop = function () { if (!dead) { obj.dropping = true; audio.splash(1) } }
        if (ok) { drop(); S.boostT = 2; sparkle(obj.x, obj.y, 26); moment('splash', obj.x, obj.y, 1.1); pop('Gerbang terbuka!', S.x, S.y - V.L * 0.8, true) } else { pop('Gerbang tetap dibuka!', S.x, S.y - V.L * 0.7, true); setTimeout(drop, 900) }
      }
      if (ok && S.qCombo >= 2) setTimeout(function () { if (!dead) pop('Kombo Pintar x' + S.qCombo + '!', S.x, S.y - V.L, true) }, 500)
      audio.chime(ok)
      hudT = 0
      if (!paused && !D.hidden) start()
    }
    var pending = null
    function startImpact (x, y) {
      S.impact = { t: 0, x: x, y: y, cap: false }
      S.done = true
      input.drag = false
      if (!reduced) { S.shake = 3; S.shakeT = 0 }
      spray(x, y, 16, 50, 0, 0)
      audio.rumble(2.6, 1)
      hudT = 0
    }
    function impactTick (dt) {
      S.impact.t += dt
      if (!S.impact.cap && S.impact.t > 1.3) {
        S.impact.cap = true
        caption.textContent = 'Meski semua sudah berusaha, kapal menabrak gunung es.'
        caption.classList.add('is-on')
      }
      if (S.impact.t > 5.2 && !doneSent) {
        send({ stars: 3, scripted: true })
      }
    }
    function progress () {
      if (S.done || S.finishing) return
      if (w.goal === 'impact') {
        // scripted: never the zone finish; reaching the wall line IS the (calm) impact
        if (S.y <= w.zoneY + 40) startImpact(S.x, S.y - V.L / 2)
        return
      }
      if (w.goal === 'gates') {
        var g = w.gates[S.gateIdx]
        if (g && S.prevY > g.y && S.y <= g.y) {
          // a gate counts only with the child's OWN steering: the assist alone (hands off) never earns it.
          // The assist only straightens the bow (it never moves the ship across to a gate), so being inside a
          // gate is the child's doing once they have steered at all in this run.
          var own = S.touched
          var inside = Math.abs(S.x - g.x) <= g.w / 2
          S.playerWork = 0; S.assistWork = 0
          if (inside && !own) {
            g.missed = true; S.missed++; S.unsteered++
            pop('Putar kemudinya, ya!', S.x, S.y - V.L * 0.7, false)
          } else if (inside) {
            g.passed = true; g.glow = 1
            spray(g.x - g.w / 2, g.y, 10, 60, 0, 0); spray(g.x + g.w / 2, g.y, 10, 60, 0, 0)
            S.combo = (S.combo || 0) + 1
            sparkle(g.x, g.y, 18 + S.combo * 4); moment('reward', g.x, g.y, 0.9)
            pop(S.combo >= 2 ? 'Hebat! Kombo x' + S.combo : 'Hebat!', g.x, g.y, true)
            audio.chime(false)
          } else {
            g.missed = true; S.missed++; S.combo = 0
            pop('Terlewat, lanjut!', S.x, S.y - V.L * 0.7, false)
          }
          S.gateIdx++
          hudT = 0
          if (S.gateIdx >= w.gates.length) beginFinish()
        }
      } else if (S.y <= w.zoneY) {
        beginFinish()
      }
    }
    function beginFinish () {
      S.finishing = 0.0001
      moment('celebrate', S.x, S.y, 1.1)
      if (confetti && !reduced) { confetti.burst(vw * 0.3, vh * 0.55, 60); confetti.burst(vw * 0.7, vh * 0.55, 60) }
      S.done = true
      goalChip.classList.add('is-done')
      pop(w.mode === 'current' ? 'Sampai di pulau!' : w.goal === 'gates' ? 'Semua gerbang!' : 'Sampai di zona aman!', S.x, S.y - V.L, true)
      audio.chime(true)
      setTimeout(function () { if (!dead) audio.horn() }, 500)
      hudT = 0
    }
    function stars () {
      // a right bonus question (buoy / chest) makes up for one bump or missed gate
      var faults = Math.max(0, S.hits + S.missed - S.bonus)
      var inTime = !w.timeLimit || S.t <= w.timeLimit
      if (!S.touched) return 1          // hands off the whole way: the assist sailed it, the child earns 1 star
      // kids (assist): a couple of bumps still earn 3 stars
      if (w.assist) return faults <= 2 && inTime ? 3 : faults <= 5 ? 2 : 1
      return faults === 0 && inTime ? 3 : faults <= 2 ? 2 : 1
    }
    function finish () { if (!doneSent) send({ stars: stars() }) }
    function send (extra) {
      doneSent = true
      // missed includes `unsteered`: gates the ship sailed through before the child had steered at all
      var out = { stars: extra.stars, time: Math.round(S.t * 10) / 10, hits: S.hits, nearMiss: S.near, missed: S.missed, unsteered: S.unsteered, mode: w.mode,
        qAsked: S.qAsked, qRight: S.qRight, bonus: S.bonus }
      if (extra.scripted) out.scripted = true
      try { if (typeof opts.onDone === 'function') opts.onDone(out) } catch (e) { if (W.console) console.error('TKSteer onDone', e) }
    }

    /* HUD (DOM writes only when text changes) */
    function setText (key, node, text) { if (lastHud[key] !== text) { lastHud[key] = text; node.textContent = text } }
    function fmt (s) { s = Math.max(0, Math.floor(s)); var m = Math.floor(s / 60), r = s % 60; return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r }
    function hud () {
      var shown = w.timeLimit ? Math.max(0, w.timeLimit - S.t) : S.t
      setText('time', timeB, fmt(shown))
      var txt
      if (w.goal === 'gates') txt = 'Gerbang ' + Math.min(S.gateIdx, w.gates.length) + '/' + w.gates.length
      else if (w.fields.length) {
        var left = 0
        for (var i = 0; i < w.fields.length; i++) if (w.fields[i].y1 < S.y - 10) left++
        txt = left ? (w.obstacle === 'rock' ? 'Karang: ' : 'Es: ') + left + ' lagi' : 'Es: aman'
      } else {
        txt = 'Jarak ' + Math.max(0, Math.round(S.y - w.zoneY)) + ' m'
      }
      setText('count', countChip, txt)
      if (route) route.set(w.goal === 'impact' ? clamp(-S.y / -w.zoneY, 0, 1) : clamp(-S.y / Math.max(1, -w.zoneY), 0, 1))
      var pct = Math.round(S.wheel * 100)
      if (lastHud.wv !== pct) { lastHud.wv = pct; wheelEl.setAttribute('aria-valuenow', String(pct)) }
      if (sailHint && S.sailOpt != null) {
        var ok = S.sailEff > 0.85
        setText('sail', sailHint, ok ? 'Pas!' : S.sailDeg < S.sailOpt ? 'Ulur layar' : 'Tarik layar')
        if (lastHud.sok !== ok) { lastHud.sok = ok; sailHint.classList.toggle('is-ok', ok); chips.forEach(function (c) { if (c.getAttribute('data-k') === 'sail') c.classList.toggle('is-done', ok) }) }
      }
      if (w.mode === 'scripted' && S.impact) chips[1].style.opacity = '0.55'
    }

    /* rendering */
    function render () {
      if (!vw) return
      var pal = PALETTE[w.palette]
      var z = scale * S.zoom
      var shx = 0, shy = 0
      if (S.shake > 0.05) { shx = Math.sin(S.shakeT * 43) * S.shake; shy = Math.cos(S.shakeT * 37) * S.shake * 0.7 }
      var ox = vw / 2 - S.camX * z + shx, oy = midY - S.camY * z + shy
      if (SEA) {
        // the whole sea in ONE unscaled pattern fill (device pixels), drifting slowly with the swell
        var drift = reduced ? 0 : S.t * 6
        seaP.draw(ctx, z * pr, pr * (ox + drift * z), pr * (oy + drift * 0.4 * z), cv.width, cv.height)
      } else {
        ctx.setTransform(pr, 0, 0, pr, 0, 0)
        ctx.fillStyle = bgGrad || pal.bot
        ctx.fillRect(0, 0, vw, vh)
      }
      ctx.setTransform(pr * z, 0, 0, pr * z, pr * ox, pr * oy)
      var hw = vw / z / 2 + 60
      var vx0 = S.camX - hw, vx1 = S.camX + hw, vy0 = S.camY - midY / z - 60, vy1 = S.camY + (vh - midY) / z + 60
      if (SEA) { drawSea(vx0, vx1, vy0, vy1); drawDressing(vx0, vx1, vy0, vy1) } else drawWaves(pal, vx0, vx1, vy0, vy1)
      drawCurrents(vy0, vy1)
      drawWindStreaks(vx0, vx1, vy0, vy1)
      drawEdges(pal, vy0, vy1)
      if (SEA) drawHarbour(vx0, vx1, vy0, vy1); else drawGoal(vx0, vx1, vy0, vy1)
      if (SEA) drawTrailLine()
      if (SEA) drawWake2(); else drawWake()
      if (SEA) drawArches(vy0, vy1); else drawGates(vy0, vy1)
      if (SEA) drawBergs(vx0, vx1, vy0, vy1); else drawIce(vx0, vx1, vy0, vy1)
      drawQ(vy0, vy1)
      drawShip()
      drawGuide()
      drawParts()
      ctx.setTransform(pr, 0, 0, pr, 0, 0)
      if (SEA) {
        if (themeName === 'deep') SEA.rays(ctx, vw, vh, S.t, reduced)
        if (vigGrad) vigGrad.draw(ctx, vw, vh)
      }
      if (S.boostT > 0 && !reduced) drawSpeedLines()
      if (confetti && confetti.n) confetti.draw(ctx)
      drawPointer()
    }
    /* ── polish (tk-sea.js): layered ocean, dressing, bergs, arches, harbour, wake, trail line ── */
    var SPR2 = SEA ? SEA.sprites(themeName) : null
    var DIMG = SEA ? { barrel: loadImg(libUrl('tk-prop/barrel')), light: loadImg(libUrl('tk-world/lighthouse-island')), dock: loadImg(libUrl('tk-key/dock')) } : null
    var confetti = SEA ? SEA.Confetti() : null, vigGrad = null
    var seaP = SEA ? SEA.Sea(themeName) : null
    function drawSea (x0, x1, y0, y1) {
      if (rq > 0.41) SEA.sparkles(ctx, themeName, x0, y0, x1, y1, S.t, reduced, { x: S.camX, y: S.camY })
    }
    function drawDressing (x0, x1, y0, y1) {
      var C = 420, k = 1
      for (var cy = Math.floor(y0 / C); cy <= Math.ceil(y1 / C); cy++) {
        for (var cx = Math.floor(x0 / C); cx <= Math.ceil(x1 / C); cx++) {
          var it = SEA.dressAt(cx, cy, themeName)
          if (!it) continue
          SEA.drawDress(ctx, SPR2, it, cx * C + it.fx * C, cy * C + it.fy * C, k, S.t, reduced, DIMG)
        }
      }
    }
    function bergSprite (b) {
      if (!b.spr) {
        var hsh = SEA.hash(Math.round(b.x), Math.round(b.y))
        b.spr = b.wall && b.r > 80 ? SPR2.fated : b.r > 70 ? SPR2.big[Math.floor(hsh * 3) % 3] : SPR2.berg[Math.floor(hsh * 6) % 6]
      }
      return b.spr
    }
    function drawBergs (x0, x1, y0, y1) {
      if (!w.ice.length) return
      for (var i = 0; i < w.ice.length; i++) {
        var b = w.ice[i]
        if (b.y + b.r * 2 < y0 || b.y - b.r * 2 > y1 || b.x + b.r * 2 < x0 || b.x - b.r * 2 > x1) continue
        var sp = bergSprite(b), k = b.r / sp.R, bob = reduced ? 0 : Math.sin(S.t * 1.4 + b.rot * 3) * 1.5
        // wave ring breaking around the base
        var ring = reduced ? 0.5 : (S.t * 0.6 + b.rot) % 1
        ctx.strokeStyle = 'rgba(235,250,255,' + (0.45 * (1 - ring)).toFixed(3) + ')'; ctx.lineWidth = 2.2
        ell(ctx, b.x, b.y + b.r * 0.12, b.r * (1.05 + ring * 0.35), b.r * (0.9 + ring * 0.3)); ctx.stroke()
        ctx.drawImage(sp.c, b.x - sp.cx * k, b.y - sp.cy * k + bob, sp.c.width * k, sp.c.height * k)
      }
    }
    function drawArches (y0, y1) {
      for (var i = 0; i < w.gates.length; i++) {
        var g = w.gates[i]
        if (g.y < y0 - 120 || g.y > y1 + 60) continue
        var st = g.passed ? 'passed' : i === S.gateIdx ? 'active' : g.missed ? 'missed' : 'next'
        ctx.globalAlpha = st === 'missed' ? 0.45 : st === 'next' ? 0.8 : 1
        if (st === 'active') {
          // the opening glows so the child sees where to aim
          var gl = ctx.createLinearGradient(0, g.y - 50, 0, g.y + 50)
          gl.addColorStop(0, 'rgba(255,230,120,0)'); gl.addColorStop(0.5, 'rgba(255,230,120,' + (reduced ? 0.22 : 0.16 + 0.1 * Math.sin(S.t * 4)).toFixed(3) + ')'); gl.addColorStop(1, 'rgba(255,230,120,0)')
          ctx.fillStyle = gl; ctx.fillRect(g.x - g.w / 2, g.y - 50, g.w, 100)
        }
        if (g.glow > 0) g.glow = Math.max(0, g.glow - 0.012)
        SEA.arch(ctx, SPR2, g.x - g.w / 2, g.y, g.x + g.w / 2, g.y, 1, S.t, { reduced: reduced, passed: g.passed, glow: g.glow || 0, size: 1.15 })
        ctx.fillStyle = '#fff4d6'; ctx.strokeStyle = '#5a3200'; ctx.lineWidth = 4
        ctx.font = '30px "Fredoka One", Nunito, sans-serif'; ctx.textAlign = 'center'
        ctx.strokeText(String(i + 1), g.x, g.y - 44); ctx.fillText(String(i + 1), g.x, g.y - 44)
        ctx.globalAlpha = 1
      }
    }
    function drawHarbour (x0, x1, y0, y1) {
      if (w.goal === 'impact') return
      var zy = w.zoneY
      if (zy < y0 - 900 || zy > y1 + 80) return
      var cx = pathX(w, zy)
      // calm harbour water past the line + a finish rope of buoys
      var hg = ctx.createLinearGradient(0, zy, 0, zy - 700)
      hg.addColorStop(0, 'rgba(120,235,200,.22)'); hg.addColorStop(1, 'rgba(120,235,200,0)')
      ctx.fillStyle = hg; ctx.fillRect(-w.half, zy - 700, w.half * 2, 700)
      if (w.mode === 'current') {
        var ix = pathX(w, zy - 320), iy = zy - 320
        ctx.fillStyle = 'rgba(160,235,240,0.55)'; ell(ctx, ix, iy, 250, 200); ctx.fill()
        ctx.fillStyle = '#f0d58e'; ell(ctx, ix, iy, 205, 160); ctx.fill()
        ctx.fillStyle = '#5bb04a'; ell(ctx, ix - 30, iy - 10, 120, 90); ctx.fill()
        ctx.fillStyle = '#3f8e36'
        for (var p = 0; p < 5; p++) { ell(ctx, ix - 90 + p * 45, iy - 30 + (p % 2) * 40, 26, 26); ctx.fill() }
      } else {
        // pier with planks, and the owner's lighthouse island beside it
        var px = cx - 90, py = zy - 330
        ctx.fillStyle = 'rgba(0,20,40,.25)'; ctx.fillRect(px + 8, py + 10, 180, 240)
        ctx.fillStyle = '#8a5a2c'; ctx.fillRect(px, py, 180, 240)
        ctx.strokeStyle = '#6b4420'; ctx.lineWidth = 2
        for (var pl = 0; pl < 240; pl += 20) { ctx.beginPath(); ctx.moveTo(px, py + pl); ctx.lineTo(px + 180, py + pl); ctx.stroke() }
        ctx.fillStyle = '#5a3a1a'
        for (var pp = 0; pp < 4; pp++) { ell(ctx, px + (pp % 2 ? 178 : 2), py + 20 + Math.floor(pp / 2) * 200, 8, 8); ctx.fill() }
        var L2 = DIMG.light
        if (ready(L2)) { var lw = 260, lh = lw * L2.naturalHeight / L2.naturalWidth; ctx.drawImage(L2, cx + 150, zy - 260 - lh / 2, lw, lh) }
        ctx.fillStyle = '#fff4d6'; ctx.strokeStyle = '#5a3200'; ctx.lineWidth = 6
        ctx.font = '38px "Fredoka One", Nunito, sans-serif'; ctx.textAlign = 'center'
        ctx.strokeText('PELABUHAN', cx, zy - 360); ctx.fillText('PELABUHAN', cx, zy - 360)
      }
      // finish rope: buoys + checkered line
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 4
      ctx.setLineDash([18, 18]); ctx.lineDashOffset = reduced ? 0 : -S.t * 20
      ctx.beginPath(); ctx.moveTo(-w.half, zy); ctx.lineTo(w.half, zy); ctx.stroke(); ctx.setLineDash([])
      var B = SPR2.buoy, bk = 1.1
      for (var bx = -w.half; bx <= w.half; bx += 140) ctx.drawImage(B.c, bx - B.cx * bk, zy - B.cy * bk, B.c.width * bk, B.c.height * bk)
    }
    function drawWake2 () {
      var n = trail.length
      if (n < 3) return
      var pts = []
      for (var i = 0; i < n; i++) { var p = trail[i]; pts.push({ x: p.x, y: p.y, nx: Math.cos(p.a), ny: Math.sin(p.a), age: p.age }) }
      SEA.wake(ctx, pts, { w0: V.B * 0.42, spread: V.B * 0.75 + 10, fade: 2.6, scale: 1, boost: S.boostT > 0 ? 1 : 0 })
    }
    // youngest kids (assist): a glowing dashed course from the bow to the next gate
    function drawTrailLine () {
      if (!w.assist || w.goal !== 'gates' || S.done || S.cd > 0) return
      var g = w.gates[S.gateIdx]
      if (!g) return
      var f = fwd(), bx = S.x + f.x * V.L * 0.6, by = S.y + f.y * V.L * 0.6
      var d = Math.hypot(g.x - bx, g.y - by)
      if (d < 60) return
      var cx = bx + f.x * d * 0.45, cy = by + f.y * d * 0.45
      ctx.lineCap = 'round'
      ctx.strokeStyle = 'rgba(255,230,120,.22)'; ctx.lineWidth = 16
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(cx, cy, g.x, g.y); ctx.stroke()
      ctx.strokeStyle = 'rgba(255,244,190,.85)'; ctx.lineWidth = 5
      ctx.setLineDash([4, 20]); ctx.lineDashOffset = reduced ? 0 : -S.t * 60
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(cx, cy, g.x, g.y); ctx.stroke(); ctx.setLineDash([])
    }
    function drawWaves (pal, x0, x1, y0, y1) {
      var cell = 95, drift = reduced ? 0 : S.t * 9
      ctx.strokeStyle = pal.wave; ctx.lineWidth = 2.2; ctx.lineCap = 'round'
      ctx.beginPath()
      var gx0 = Math.floor((x0 - drift) / cell), gx1 = Math.ceil((x1 - drift) / cell)
      var gy0 = Math.floor(y0 / cell), gy1 = Math.ceil(y1 / cell)
      for (var gy = gy0; gy <= gy1; gy++) {
        for (var gx = gx0; gx <= gx1; gx++) {
          var hsh = Math.abs((gx * 73856093) ^ (gy * 19349663)) % 1000 / 1000
          var x = gx * cell + drift + hsh * 50, y = gy * cell + ((hsh * 7) % 1) * 60
          var s = 10 + hsh * 12
          var ph = reduced ? 0 : Math.sin(S.t * 1.3 + hsh * 6) * 2
          ctx.moveTo(x - s, y + ph); ctx.quadraticCurveTo(x - s / 2, y - 5 + ph, x, y + ph); ctx.quadraticCurveTo(x + s / 2, y + 5 + ph, x + s, y + ph)
        }
      }
      ctx.stroke()
    }
    function drawCurrents (y0, y1) {
      if (!w.currents.length) return
      for (var i = 0; i < w.currents.length; i++) {
        var c = w.currents[i]
        if (c.y + c.h / 2 < y0 || c.y - c.h / 2 > y1) continue
        ctx.fillStyle = 'rgba(90,215,240,0.13)'
        ctx.fillRect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h)
        ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.dir)
        var phase = reduced ? 0 : (S.t * c.s * 0.8) % 110
        ctx.strokeStyle = 'rgba(200,245,255,0.55)'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
        ctx.beginPath()
        var span = c.w
        for (var a = -span / 2; a < span / 2; a += 110) {
          for (var l = -1; l <= 1; l++) {
            var yy = -(a + phase), xx = l * c.h * 0.3 + ((a / 110) % 2 ? 20 : -20)
            ctx.moveTo(xx - 14, yy + 12); ctx.lineTo(xx, yy); ctx.lineTo(xx + 14, yy + 12)
          }
        }
        ctx.stroke(); ctx.restore()
      }
    }
    function drawWindStreaks (x0, x1, y0, y1) {
      if (!w.wind) return
      var dx = Math.sin(w.wind.dir), dy = -Math.cos(w.wind.dir)
      var off = reduced ? 0 : S.t * 120 * w.wind.strength
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 2
      ctx.beginPath()
      for (var i = 0; i < 18; i++) {
        var h1 = (i * 0.6180339) % 1, h2 = (i * 0.4142135) % 1
        var px = x0 + ((h1 * (x1 - x0) + dx * off) % (x1 - x0) + (x1 - x0)) % (x1 - x0)
        var py = y0 + ((h2 * (y1 - y0) + dy * off) % (y1 - y0) + (y1 - y0)) % (y1 - y0)
        ctx.moveTo(px, py); ctx.lineTo(px - dx * 46, py - dy * 46)
      }
      ctx.stroke()
    }
    function drawEdges (pal, y0, y1) {
      ctx.fillStyle = pal.edge
      var s0 = Math.floor(y0 / 120) * 120
      var vx0 = S.camX - vw / (scale * S.zoom) / 2 - 20, vx1 = S.camX + vw / (scale * S.zoom) / 2 + 20
      for (var s = -1; s <= 1; s += 2) {
        var x = s * (w.half + 10)
        if (x < vx0 - 10 || x > vx1 + 10) continue
        ctx.fillStyle = 'rgba(0,20,40,0.22)'
        if (s > 0) ctx.fillRect(x, y0, Math.max(0, vx1 - x), y1 - y0); else ctx.fillRect(vx0, y0, Math.max(0, x - vx0), y1 - y0)
        ctx.fillStyle = pal.edge
        for (var y = s0; y < y1; y += 120) { ell(ctx, x, y, 7, 7); ctx.fill() }
      }
    }
    function drawGoal (x0, x1, y0, y1) {
      if (w.goal === 'impact') return
      var zy = w.zoneY
      if (zy < y0 - 700 || zy > y1 + 50) return
      ctx.fillStyle = 'rgba(80,235,160,0.16)'
      ctx.fillRect(-w.half, zy - 700, w.half * 2, 700)
      ctx.strokeStyle = 'rgba(140,255,190,0.85)'; ctx.lineWidth = 5
      ctx.setLineDash([22, 16]); ctx.lineDashOffset = reduced ? 0 : -S.t * 20
      ctx.beginPath(); ctx.moveTo(-w.half, zy); ctx.lineTo(w.half, zy); ctx.stroke(); ctx.setLineDash([])
      if (w.mode === 'current') {
        var ix = pathX(w, zy - 320), iy = zy - 320
        ctx.fillStyle = 'rgba(120,220,230,0.5)'; ell(ctx, ix, iy, 240, 190); ctx.fill()
        ctx.fillStyle = '#f0d58e'; ell(ctx, ix, iy, 205, 160); ctx.fill()
        ctx.fillStyle = '#5bb04a'; ell(ctx, ix - 30, iy - 10, 120, 90); ctx.fill()
        ctx.fillStyle = '#3f8e36'
        for (var p = 0; p < 5; p++) { ell(ctx, ix - 90 + p * 45, iy - 30 + (p % 2) * 40, 26, 26); ctx.fill() }
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.font = 'bold 34px "Fredoka One", Nunito, sans-serif'; ctx.textAlign = 'center'
        ctx.fillText('ZONA AMAN', pathX(w, zy), zy - 60)
      }
      for (var s = -1; s <= 1; s += 2) {
        ctx.fillStyle = '#39c46b'; ell(ctx, s * (w.half - 20), zy, 16, 16); ctx.fill()
        ctx.fillStyle = '#e8fff0'; ell(ctx, s * (w.half - 20), zy, 7, 7); ctx.fill()
      }
    }
    function drawWake () {
      var n = trail.length
      if (n < 3) return
      var spread0 = V.B * 0.45
      for (var side = -1; side <= 1; side += 2) {
        for (var chunk = 0; chunk < 4; chunk++) {
          var i0 = Math.floor(n * chunk / 4), i1 = Math.min(n - 1, Math.floor(n * (chunk + 1) / 4) + 1)
          if (i1 - i0 < 1) continue
          ctx.strokeStyle = 'rgba(235,250,255,' + (0.55 - chunk * 0.12) + ')'
          ctx.lineWidth = 3 - chunk * 0.5
          ctx.beginPath()
          for (var i = i0; i <= i1; i++) {
            var p = trail[i], sp = spread0 + p.age * (V.B * 0.9 + 10)
            var px = p.x + Math.cos(p.a) * sp * side, py = p.y + Math.sin(p.a) * sp * side
            if (i === i0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
          }
          ctx.stroke()
        }
      }
      ctx.strokeStyle = 'rgba(220,245,255,0.2)'; ctx.lineWidth = V.B * 0.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      ctx.beginPath()
      var m = Math.min(n, 28)
      for (var j = 0; j < m; j++) { if (j === 0) ctx.moveTo(trail[j].x, trail[j].y); else ctx.lineTo(trail[j].x, trail[j].y) }
      ctx.stroke()
    }
    function drawBuoy (x, y, state) {
      var r = 16
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ell(ctx, x + 3, y + 4, r, r); ctx.fill()
      if (ready(buoyImg)) {
        ctx.drawImage(buoyImg, x - r * 1.15, y - r * 1.15, r * 2.3, r * 2.3)
      } else {
        ctx.fillStyle = '#ffffff'; ell(ctx, x, y, r, r); ctx.fill()
        ctx.strokeStyle = '#e0473a'; ctx.lineWidth = r * 0.55
        ctx.setLineDash([r * 0.7, r * 0.7]); ctx.beginPath(); ctx.arc(x, y, r * 0.72, 0, TAU); ctx.stroke(); ctx.setLineDash([])
        ctx.fillStyle = PALETTE[w.palette].bot; ell(ctx, x, y, r * 0.42, r * 0.42); ctx.fill()
      }
      if (state === 'passed') { ctx.strokeStyle = 'rgba(120,255,170,0.9)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, r + 6, 0, TAU); ctx.stroke() }
      if (state === 'active' && !reduced) {
        var k = (S.t * 0.9) % 1
        ctx.strokeStyle = 'rgba(255,230,120,' + (0.8 * (1 - k)) + ')'; ctx.lineWidth = 3
        ctx.beginPath(); ctx.arc(x, y, r + 6 + k * 22, 0, TAU); ctx.stroke()
      } else if (state === 'active') {
        ctx.strokeStyle = 'rgba(255,230,120,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r + 8, 0, TAU); ctx.stroke()
      }
    }
    function drawGates (y0, y1) {
      for (var i = 0; i < w.gates.length; i++) {
        var g = w.gates[i]
        if (g.y < y0 - 40 || g.y > y1 + 40) continue
        var st = g.passed ? 'passed' : i === S.gateIdx ? 'active' : g.missed ? 'missed' : 'next'
        ctx.globalAlpha = st === 'missed' ? 0.4 : st === 'next' ? 0.7 : 1
        if (st === 'active') {
          ctx.strokeStyle = 'rgba(255,230,120,0.75)'; ctx.lineWidth = 4
          ctx.setLineDash([16, 14]); ctx.lineDashOffset = reduced ? 0 : -S.t * 24
          ctx.beginPath(); ctx.moveTo(g.x - g.w / 2 + 18, g.y); ctx.lineTo(g.x + g.w / 2 - 18, g.y); ctx.stroke(); ctx.setLineDash([])
          ctx.fillStyle = 'rgba(255,230,120,0.1)'; ctx.fillRect(g.x - g.w / 2, g.y - 40, g.w, 80)
        }
        drawBuoy(g.x - g.w / 2, g.y, st); drawBuoy(g.x + g.w / 2, g.y, st)
        ctx.fillStyle = '#fff'; ctx.font = 'bold 26px "Fredoka One", Nunito, sans-serif'; ctx.textAlign = 'center'
        ctx.fillText(String(i + 1), g.x, g.y - 30)
        ctx.globalAlpha = 1
      }
    }
    function iceColours () {
      return w.obstacle === 'rock'
        ? { halo: 'rgba(40,90,110,0.35)', side: '#2d4150', top: '#4f6a78', hi: '#7aa0ad', edge: '#1e2e38' }
        : { halo: 'rgba(120,225,245,0.22)', side: '#7ecfe8', top: '#eef9ff', hi: '#ffffff', edge: '#5aaed0' }
    }
    function drawIce (x0, x1, y0, y1) {
      if (!w.ice.length) return
      var col = iceColours()
      for (var i = 0; i < w.ice.length; i++) {
        var b = w.ice[i]
        if (b.y + b.r * 1.8 < y0 || b.y - b.r * 1.8 > y1 || b.x + b.r * 1.8 < x0 || b.x - b.r * 1.8 > x1) continue
        ctx.save(); ctx.translate(b.x, b.y)
        ctx.fillStyle = col.halo; ell(ctx, 0, 0, b.r * 1.3, b.r * 1.3); ctx.fill()
        // drifting bits
        ctx.fillStyle = col.top
        for (var k = 0; k < b.bits.length; k++) {
          var bt = b.bits[k], ang = bt.a + (reduced ? 0 : S.t * bt.w)
          var bx = Math.cos(ang) * bt.d, by = Math.sin(ang) * bt.d
          ctx.beginPath(); ctx.moveTo(bx, by - bt.s); ctx.lineTo(bx + bt.s, by + bt.s * 0.6); ctx.lineTo(bx - bt.s * 0.8, by + bt.s * 0.7); ctx.closePath(); ctx.fill()
        }
        ctx.rotate(b.rot)
        var p = b.pts
        ctx.fillStyle = col.side
        ctx.beginPath(); ctx.moveTo(p[0] * 1.02 + 3, p[1] * 1.02 + 5)
        for (var j = 2; j < p.length; j += 2) ctx.lineTo(p[j] * 1.02 + 3, p[j + 1] * 1.02 + 5)
        ctx.closePath(); ctx.fill()
        ctx.fillStyle = col.top
        ctx.beginPath(); ctx.moveTo(p[0] * 0.9 - 2, p[1] * 0.9 - 3)
        for (var q = 2; q < p.length; q += 2) ctx.lineTo(p[q] * 0.9 - 2, p[q + 1] * 0.9 - 3)
        ctx.closePath(); ctx.fill()
        ctx.strokeStyle = col.edge; ctx.lineWidth = 1.5; ctx.stroke()
        ctx.fillStyle = col.hi; ctx.globalAlpha = 0.8
        ctx.beginPath(); ctx.moveTo(p[0] * 0.45 - 6, p[1] * 0.45 - 8)
        for (var u = 2; u < p.length; u += 4) ctx.lineTo(p[u] * 0.45 - 6, p[u + 1] * 0.45 - 8)
        ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1
        if (b.fated) {
          ctx.fillStyle = col.side; ctx.globalAlpha = 0.6
          ctx.beginPath(); ctx.moveTo(p[0] * 0.25, p[1] * 0.25)
          for (var z2 = 2; z2 < p.length; z2 += 2) ctx.lineTo(p[z2] * 0.25, p[z2 + 1] * 0.25)
          ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1
        }
        ctx.restore()
      }
    }
    function drawShip () {
      var f = fwd()
      ctx.save(); ctx.translate(S.x, S.y); ctx.rotate(S.a)
      // bank: the hull leans into a turn (squash across the beam + the shadow slides out), eased
      var bankT = reduced ? 0 : clamp(S.yaw / Math.max(0.2, V.turn), -1, 1)
      S.bank = (S.bank || 0) + (bankT - (S.bank || 0)) * 0.12
      var bank = S.bank
      ctx.fillStyle = 'rgba(0,10,25,0.28)'; ell(ctx, 5 + bank * 5, 7, V.B * 0.6, V.L * 0.5); ctx.fill()
      // bow foam
      var sp = clamp(S.v / V.vmax, 0, 1)
      if (sp > 0.05) {
        ctx.strokeStyle = 'rgba(240,252,255,' + (0.35 + sp * 0.5) + ')'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'
        ctx.beginPath()
        var bh = -V.L / 2, spr = V.B * (0.8 + sp)
        ctx.moveTo(-spr, bh + V.L * 0.2); ctx.quadraticCurveTo(-V.B * 0.3, bh + 2, 0, bh - 3)
        ctx.quadraticCurveTo(V.B * 0.3, bh + 2, spr, bh + V.L * 0.2)
        ctx.stroke()
        ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + sp * 0.4) + ')'
        for (var i = 0; i < 5; i++) {
          var j = reduced ? 0.5 : Math.random()
          ell(ctx, (j - 0.5) * V.B * 1.1, bh + 2 + j * 6, 1.8 + sp * 2.2, 1.8 + sp * 2.2); ctx.fill()
        }
      }
      if (sp > 0.05) {
        // stern churn: soft foam where the propellers push the water
        ctx.fillStyle = 'rgba(235,250,255,' + (0.18 + sp * 0.3) + ')'
        ell(ctx, 0, V.L * 0.5 + 4, V.B * (0.35 + sp * 0.2), 5 + sp * 5); ctx.fill()
      }
      if (fleet && w.palette === 'deep') {
        var gr = ctx.createLinearGradient(0, -V.L / 2, 0, -V.L / 2 - 130)
        gr.addColorStop(0, 'rgba(255,246,190,.35)'); gr.addColorStop(1, 'rgba(255,246,190,0)')
        ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(-V.B * 0.2, -V.L / 2); ctx.lineTo(-48, -V.L / 2 - 130); ctx.lineTo(48, -V.L / 2 - 130); ctx.lineTo(V.B * 0.2, -V.L / 2); ctx.closePath(); ctx.fill()
      }
      if (ready(artImg)) {
        var hgt = V.L * 1.08, wid = hgt * artImg.naturalWidth / artImg.naturalHeight
        var bobK = reduced ? 1 : 1 + Math.sin(S.t * 2.1) * 0.012
        ctx.save(); ctx.scale((1 - Math.abs(bank) * 0.1) * bobK, bobK)
        if (!reduced) ctx.rotate(Math.sin(S.t * 1.6) * 0.012)
        ctx.drawImage(artImg, -wid / 2, -hgt / 2, wid, hgt)
        ctx.restore()
      } else {
        (DRAW[w.vessel] || DRAW.liner)(ctx, V.L, V.B, S)
      }
      if (S.shield) drawShield()
      ctx.restore()
      return f
    }
    /* embedded-question props: Soal buoys / treasure chests (pulsing ring + sparkle) and lighthouse chain gates */
    var QIMG = { buoy: loadImg(libUrl('tk-prop/buoy-light')), chest: loadImg(libUrl('game/treasure-chest')), house: loadImg(libUrl('gt-el/lighthouse')) }
    function drawQ (y0, y1) {
      for (var i = 0; i < qBuoys.length; i++) {
        var B = qBuoys[i]
        if ((B.taken && B !== S.qObj) || B.y < y0 - 80 || B.y > y1 + 80) continue
        var s = 70, pulse = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(S.t * 3.2 + B.ph), ring = reduced ? 0.55 : (S.t * 0.8 + B.ph) % 1
        var bob = reduced ? 0 : Math.sin(S.t * 1.8 + B.ph) * 3
        ctx.fillStyle = 'rgba(255,214,90,' + (0.2 + 0.14 * pulse).toFixed(3) + ')'; ell(ctx, B.x, B.y, s * 0.7, s * 0.7); ctx.fill()
        ctx.strokeStyle = 'rgba(255,236,150,' + (0.9 * (1 - ring)).toFixed(3) + ')'; ctx.lineWidth = 4
        ell(ctx, B.x, B.y, s * (0.5 + ring * 0.6), s * (0.5 + ring * 0.6)); ctx.stroke()
        var im = B.kind === 'chest' ? QIMG.chest : QIMG.buoy
        if (ready(im)) { var ih = s * im.naturalHeight / im.naturalWidth; ctx.drawImage(im, B.x - s / 2, B.y - ih * 0.6 + bob, s, ih) }
        var gl = s * (0.2 + pulse * 0.16)
        ctx.save(); ctx.translate(B.x + s * 0.36, B.y - s * 0.5 + bob); ctx.rotate(reduced ? 0 : S.t * 1.5)
        ctx.fillStyle = 'rgba(255,255,235,' + (0.6 + pulse * 0.4).toFixed(3) + ')'
        ctx.beginPath(); ctx.moveTo(0, -gl); ctx.lineTo(gl * 0.2, 0); ctx.lineTo(0, gl); ctx.lineTo(-gl * 0.2, 0); ctx.closePath(); ctx.fill()
        ctx.beginPath(); ctx.moveTo(-gl, 0); ctx.lineTo(0, gl * 0.2); ctx.lineTo(gl, 0); ctx.lineTo(0, -gl * 0.2); ctx.closePath(); ctx.fill()
        ctx.restore()
        ctx.font = '18px "Fredoka One", Fredoka, Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        var tw = ctx.measureText('SOAL').width + 16
        ctx.fillStyle = 'rgba(74,44,16,.92)'; rrect(ctx, B.x - tw / 2, B.y + s * 0.42, tw, 25, 7); ctx.fill()
        ctx.fillStyle = '#ffe066'; ctx.fillText('SOAL', B.x, B.y + s * 0.42 + 13); ctx.textBaseline = 'alphabetic'
      }
      for (var g = 0; g < qGates.length; g++) {
        var G = qGates[g]
        if (G.y < y0 - 200 || G.y > y1 + 120) continue
        var x0 = -w.half - 10, x1 = w.half + 10, hs = 170
        if (G.drop < 1) {
          var fall = G.drop, a = reduced ? 1 - fall : 1 - Math.max(0, fall - 0.5) * 2, sag = 10 + (reduced ? 0 : fall * 30)
          ctx.globalAlpha = Math.max(0, a)
          var n = Math.round((x1 - x0) / 22)
          for (var k = 0; k <= n; k++) {
            var u = k / n, x = x0 + (x1 - x0) * u, y = G.y + Math.sin(u * Math.PI) * sag + (reduced ? 0 : fall * 26)
            ctx.strokeStyle = k % 2 ? '#7d8791' : '#d3dbe2'; ctx.lineWidth = 5
            ell(ctx, x, y, k % 2 ? 5 : 11, k % 2 ? 11 : 6); ctx.stroke()
          }
          if (!G.dropping) {
            var mx = G.x, my = G.y + Math.sin(clamp((mx - x0) / (x1 - x0), 0, 1) * Math.PI) * sag
            ctx.fillStyle = '#d9a441'; ctx.strokeStyle = '#6b4412'; ctx.lineWidth = 4
            ctx.beginPath(); ctx.arc(mx, my, 24, 0, TAU); ctx.fill(); ctx.stroke()
            ctx.fillStyle = '#3b2400'; ctx.font = '32px "Fredoka One", Fredoka, Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
            ctx.fillText('?', mx, my + 1); ctx.textBaseline = 'alphabetic'
          }
          ctx.globalAlpha = 1
        }
        if (!reduced && !G.open) {
          var sw = Math.sin(S.t * 1.4) * 0.5 + 0.5
          ctx.fillStyle = 'rgba(255,240,170,.12)'
          ctx.beginPath(); ctx.moveTo(x0, G.y - hs * 0.75); ctx.lineTo(x0 + (x1 - x0) * (0.3 + sw * 0.5), G.y - 20); ctx.lineTo(x0 + (x1 - x0) * (0.42 + sw * 0.5), G.y + 16); ctx.closePath(); ctx.fill()
        }
        var H = QIMG.house
        if (ready(H)) { var hw2 = hs * H.naturalWidth / H.naturalHeight; ctx.drawImage(H, x0 - hw2 / 2, G.y - hs * 0.85, hw2, hs); ctx.drawImage(H, x1 - hw2 / 2, G.y - hs * 0.85, hw2, hs) }
      }
    }
    // the shield bubble (reward for a right answer after a bump): a soft blue dome with a turning glint
    function drawShield () {
      var rx = Math.max(V.B * 1.5, 34), ry = V.L * 0.66, pl = reduced ? 0 : Math.sin(S.t * 3) * 0.04
      var g = ctx.createRadialGradient(0, 0, ry * 0.3, 0, 0, ry)
      g.addColorStop(0, 'rgba(140,220,255,0)'); g.addColorStop(0.8, 'rgba(140,220,255,.16)'); g.addColorStop(1, 'rgba(190,240,255,.42)')
      ctx.fillStyle = g; ell(ctx, 0, 0, rx * (1 + pl), ry * (1 + pl)); ctx.fill()
      ctx.strokeStyle = 'rgba(210,245,255,.85)'; ctx.lineWidth = 3; ctx.stroke()
      var a0 = reduced ? -2.2 : S.t * 2
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 4
      ctx.beginPath(); ctx.ellipse(0, 0, rx * 0.86, ry * 0.86, 0, a0, a0 + 0.7); ctx.stroke()
    }
    // speed lines for the boost reward (screen space)
    function drawSpeedLines () {
      var cx = vw / 2, cy = midY * 0.6, n = 22, ph = S.t * 3
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.2 * Math.min(1, S.boostT * 2)).toFixed(3) + ')'; ctx.lineWidth = 2; ctx.lineCap = 'round'
      ctx.beginPath()
      for (var i = 0; i < n; i++) {
        var a = i / n * TAU + 0.3, u = (ph + i * 0.37) % 1
        var r0 = Math.max(vw, vh) * (0.25 + u * 0.55), r1 = r0 + 40 + u * 60
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.8); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.8)
      }
      ctx.stroke()
    }
    // big friendly arrow just ahead of the ship, pointing at the next gate (or the course / safe zone)
    function guideTarget () {
      if (S.done || w.goal === 'impact' || !w.assist) return null
      var gg = w.goal === 'gates' ? w.gates[S.gateIdx] : null
      return gg ? { x: gg.x, y: gg.y } : aimPoint()
    }
    function drawGuide () {
      var tg = guideTarget()
      S.guide = null
      if (!tg) return
      var dx = tg.x - S.x, dy = tg.y - S.y, d = Math.hypot(dx, dy)
      if (d < V.L * 0.8) return
      var a = Math.atan2(dx, -dy), ux = dx / d, uy = dy / d
      var bob = reduced ? 0 : Math.sin(S.t * 5) * 6
      var off = V.L * 0.55 + 52 + bob
      var gx = S.x + ux * off, gy = S.y + uy * off
      S.guide = { x: gx, y: gy, a: a, tx: tg.x, ty: tg.y }
      var fade = clamp((d - V.L * 0.8) / 160, 0, 1) * (S.cd > 0 ? 0.5 : 1)
      ctx.save(); ctx.translate(gx, gy); ctx.rotate(a)
      ctx.globalAlpha = fade
      ctx.fillStyle = 'rgba(0,20,40,0.28)'
      ctx.beginPath(); ctx.moveTo(3, -26); ctx.lineTo(29, 4); ctx.lineTo(13, 4); ctx.lineTo(13, 28); ctx.lineTo(-7, 28); ctx.lineTo(-7, 4); ctx.lineTo(-23, 4); ctx.closePath(); ctx.fill()
      ctx.fillStyle = '#ffd84a'; ctx.strokeStyle = '#fff6d0'; ctx.lineWidth = 4; ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(0, -30); ctx.lineTo(26, 0); ctx.lineTo(10, 0); ctx.lineTo(10, 24); ctx.lineTo(-10, 24); ctx.lineTo(-10, 0); ctx.lineTo(-26, 0); ctx.closePath()
      ctx.fill(); ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(14, -5); ctx.lineTo(-14, -5); ctx.closePath(); ctx.fill()
      ctx.restore(); ctx.globalAlpha = 1
    }
    function drawParts () {
      if (!parts.length) return
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i], a = 1 - p.life / p.max
        ctx.globalAlpha = a * 0.9
        ctx.fillStyle = p.c || '#ffffff'
        ell(ctx, p.x, p.y, p.r * (1 + p.life), p.r * (1 + p.life)); ctx.fill()
      }
      ctx.globalAlpha = 1
    }
    function drawPointer () {
      // gentle arrow at the screen edge toward the next gate / zone when it is off-screen
      if (S.done || w.goal === 'impact') return
      var gg = w.gates[S.gateIdx]
      var ap = w.goal === 'gates' ? (gg ? { x: gg.x, y: gg.y } : aimPoint()) : { x: pathX(w, w.zoneY), y: w.zoneY }
      var p = worldToScreen(ap.x, ap.y)
      if (p.x > -10 && p.x < vw + 10 && p.y > -10 && p.y < vh + 10) return
      if (w.goal !== 'gates' && S.y - w.zoneY > 1200) return
      var cx = vw / 2, cy = vh / 2, dx = p.x - cx, dy = p.y - cy
      var k = Math.min((vw / 2 - 44) / Math.abs(dx || 1e-6), (vh / 2 - 150) / Math.abs(dy || 1e-6))
      var ex = cx + dx * k, ey = cy + dy * k, a = Math.atan2(dy, dx)
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(a)
      if (w.assist) ctx.scale(1.7, 1.7)
      ctx.globalAlpha = reduced ? 0.9 : 0.65 + 0.3 * Math.sin(S.t * 4)
      ctx.fillStyle = '#ffd166'; ctx.strokeStyle = '#6a4a00'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, -13); ctx.lineTo(-4, 0); ctx.lineTo(-10, 13); ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.restore(); ctx.globalAlpha = 1
    }
    function drawRadar () {
      var s = radar.width, r = s / 2, R = 1100, c = rctx
      c.setTransform(1, 0, 0, 1, 0, 0)
      c.clearRect(0, 0, s, s)
      c.save(); c.beginPath(); c.arc(r, r, r - 1, 0, TAU); c.clip()
      c.fillStyle = w.palette === 'day' ? 'rgba(8,50,80,0.86)' : 'rgba(4,24,42,0.9)'; c.fillRect(0, 0, s, s)
      c.strokeStyle = 'rgba(120,230,200,0.3)'; c.lineWidth = 1 * dpr
      for (var k = 1; k <= 3; k++) { c.beginPath(); c.arc(r, r, r * k / 3.2, 0, TAU); c.stroke() }
      c.beginPath(); c.moveTo(r, 0); c.lineTo(r, s); c.moveTo(0, r); c.lineTo(s, r); c.stroke()
      if (!reduced) {
        var sa = (S.t * 1.6) % TAU
        c.fillStyle = 'rgba(120,255,200,0.14)'
        c.beginPath(); c.moveTo(r, r); c.arc(r, r, r, sa - 0.6, sa); c.closePath(); c.fill()
      }
      var q = r / R
      c.fillStyle = w.obstacle === 'rock' ? '#9fc0cc' : '#bff3ff'
      for (var i = 0; i < w.ice.length; i++) {
        var b = w.ice[i], dx = b.x - S.x, dy = b.y - S.y
        if (Math.abs(dx) > R || Math.abs(dy) > R) continue
        var rr = Math.max(1.6 * dpr, b.r * q)
        c.beginPath(); c.arc(r + dx * q, r + dy * q, rr, 0, TAU); c.fill()
      }
      if (w.goal === 'gates' && S.gateIdx < w.gates.length) {
        var g = w.gates[S.gateIdx]
        var gx = clamp(r + (g.x - S.x) * q, 4, s - 4), gy = clamp(r + (g.y - S.y) * q, 4, s - 4)
        c.fillStyle = '#ffd166'; c.beginPath(); c.arc(gx, gy, 3.5 * dpr, 0, TAU); c.fill()
      } else if (w.goal !== 'gates') {
        var zy = r + (w.zoneY - S.y) * q
        if (zy > 0) { c.fillStyle = 'rgba(120,255,170,0.35)'; c.fillRect(0, 0, s, Math.min(s, zy)) }
        else { c.fillStyle = 'rgba(120,255,170,0.8)'; c.fillRect(r - 8 * dpr, 2 * dpr, 16 * dpr, 3 * dpr) }
      }
      c.translate(r, r); c.rotate(S.a)
      c.fillStyle = '#ffd166'; c.beginPath(); c.moveTo(0, -7 * dpr); c.lineTo(5 * dpr, 6 * dpr); c.lineTo(-5 * dpr, 6 * dpr); c.closePath(); c.fill()
      c.restore()
    }

    /* loop */
    function frame (now) {
      raf = 0
      if (dead || paused || D.hidden || S.waiting) return
      var dt = last ? (now - last) / 1000 : 1 / 60
      last = now
      dt = clamp(dt, 0, 0.1)
      // fixed-timestep simulation (60 Hz) + interpolated rendering: the same physics on every device,
      // smooth motion whatever the display refresh
      acc += dt
      var n = 0
      while (acc >= STEP && n < 6 && !S.waiting) { prev.x = S.x; prev.y = S.y; prev.a = S.a; prev.cx = S.camX; prev.cy = S.camY; step(STEP); acc -= STEP; n++ }
      if (n === 6 || S.waiting) acc = 0
      // a question just opened: the frame shows the frozen sea and the loop stops until it is answered
      if (S.waiting) { render(); return }
      if (S.frames > 20) adapt(dt)
      var al = acc / STEP, cur = { x: S.x, y: S.y, a: S.a, cx: S.camX, cy: S.camY }
      if (n > 0 && al > 0) {
        S.x = prev.x + (cur.x - prev.x) * al; S.y = prev.y + (cur.y - prev.y) * al; S.a = prev.a + angNorm(cur.a - prev.a) * al
        S.camX = prev.cx + (cur.cx - prev.cx) * al; S.camY = prev.cy + (cur.cy - prev.cy) * al
      }
      render()
      S.x = cur.x; S.y = cur.y; S.a = cur.a; S.camX = cur.cx; S.camY = cur.cy
      if (confetti && confetti.n) confetti.step(dt)
      spinWheel()
      hudT -= dt; radarT -= dt
      // the DOM HUD and the radar canvas never repaint in the same frame: each is a layer repaint + upload in the
      // commit, and at 4x CPU the two together pushed a frame over 50 ms (perf gate, 2026-09-30); a radar due in a
      // HUD frame draws on the next one
      if (hudT <= 0) { hudT = 0.12; hud() } else if (radarT <= 0) { radarT = 0.1; drawRadar() }
      S.frames++
      TKSteer._frames++
      raf = W.requestAnimationFrame(frame)
    }
    // the wheel graphic follows S.wheel EVERY frame (the drag must feel attached to the finger)
    var wheelDeg = null
    function spinWheel () {
      var d = Math.round(S.wheel * WHEEL_DEG * 2) / 2
      if (d !== wheelDeg) { wheelDeg = d; wheelSvgEl.style.transform = 'rotate(' + d + 'deg)' }
    }
    var STEP = 1 / 60, acc = 0, prev = { x: 0, y: 0, a: 0, cx: 0, cy: -60 }
    function start () { if (!raf && !dead && !paused && !D.hidden && !S.waiting) { last = 0; acc = 0; raf = W.requestAnimationFrame(frame) } }
    function stop () { if (raf) W.cancelAnimationFrame(raf); raf = 0 }

    var handle = {
      pause: function (quiet) {
        if (dead || paused || S.waiting) return          // the open question card already holds the game
        paused = true; stop(); audio.suspend()
        releaseHolds(); input.keyL = input.keyR = false; input.drag = false; drag = null
        if (opts.pauseOverlay !== false && !quiet) pauseOv.classList.add('is-on')
      },
      resume: function () {
        if (dead || !paused) return
        paused = false; pauseOv.classList.remove('is-on'); audio.ensure(); start()
      },
      destroy: function () {
        if (dead) return
        dead = true; stop(); audio.close()
        if (pending && typeof pending.close === 'function') { var pd = pending; pending = null; try { pd.close() } catch (e) {} }
        if (ro) ro.disconnect(); else W.removeEventListener('resize', resize)
        W.removeEventListener('keydown', onKey); W.removeEventListener('keyup', onKey); W.removeEventListener('blur', onBlur)
        D.removeEventListener('visibilitychange', onVis)
        if (root.parentNode) root.parentNode.removeChild(root)
      },
      setMuted: function (m) { if (!opts.sfx) opts.sfx = {}; opts.sfx.muted = !!m; audio.sync() },
      state: function () {
        var ap = aimPoint()
        return { mode: w.mode, vessel: w.vessel, x: S.x, y: S.y, heading: S.a, speed: S.v, vmax: V.vmax, yaw: S.yaw, wheel: S.wheel,
          t: S.t, hits: S.hits, nearMiss: S.near, missed: S.missed, gate: S.gateIdx, gates: w.gates.length, zoneY: w.zoneY,
          done: S.done, sent: doneSent, impact: !!S.impact, frames: S.frames, running: !!raf, paused: paused, aimX: ap.x, aimY: ap.y,
          lag: 1 / V.yaw + 1 / V.rud, parts: parts.length, shake: S.shake, zoom: S.zoom, quality: rq,
          sailDeg: S.sailDeg, sailEff: S.sailEff, sailOpt: S.sailOpt, ice: w.ice.length, reduced: reduced,
          assist: w.assist, first: w.first, speedK: w.speedK, countdown: S.cd, guide: S.guide, gateW: w.gates.length ? w.gates[0].w : 0,
          ship: shipId || null, art: artImg ? artImg.src : null, artReady: ready(artImg), touched: S.touched, bank: S.bank || 0,
          ctrl: { wheel: ctrl.wheel, hold: ctrl.hold, k: ctrl.k, old: OLD }, shipRect: shipRect(), midY: midY,
          theme: SEA ? themeName : null, sea: !!SEA, wake: trail.length, route: route ? route.value() : null, combo: S.combo || 0, confetti: confetti ? confetti.n : 0, vw: vw, vh: vh,
          waiting: S.waiting,
          q: { open: S.qOpen, n: { collide: S.qn.collide, buoy: S.qn.buoy, gate: S.qn.gate }, asked: S.qAsked, right: S.qRight, log: S.qLog.slice(), lastCollideT: S.lastColQ,
            net: !!S.net, cool: Q_COOL, count: QC.count, on: Object.keys(QC.on), topic: QC.topic, pend: !!S.qPend, shield: S.shield, boost: S.boostT, bonus: S.bonus, combo: S.qCombo, ease: S.easeT,
            buoys: qBuoys.map(function (b) { return { x: Math.round(b.x), y: Math.round(b.y), kind: b.kind, taken: b.taken } }),
            gates: qGates.map(function (g) { return { x: Math.round(g.x), y: Math.round(g.y), asked: g.asked, drop: g.drop, open: g.open } }) } }
      }
    }

    resize()
    hud()
    try {
      // only open audio now if the page already had a user gesture (the tap that opened the level)
      var ua = navigator.userActivation
      if (!ua || ua.hasBeenActive) { audio.ensure(); if (audio.ctx && audio.ctx.state === 'running') { audio.startBed(); audio.horn() } }
    } catch (e) {}
    start()
    return handle
  }

  W.TKSteer = { mount: mount, build: build, vessels: Object.keys(VESSELS), _frames: 0, version: '1.1.0' }
})(window)
