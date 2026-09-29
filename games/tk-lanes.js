/* ============================================================================
 * tk-lanes.js — window.TKLanes. Timmy & Kapal Legendaris: three-lane top-view navigation
 * (PRD v2 §13 gap matrix "Three-lane top-view navigation" + "Collision → Knowledge Challenge →
 * Recover" + "Titanic final unavoidable collision"; owner mockup ui-12 panels "Chapter 4: Navigation
 * Challenge", "Chapter 5: Ice Warnings", "Chapter 6: The Collision").
 *
 *   var h = TKLanes.mount(host, level, opts)   // -> { destroy, pause, resume, state, setMuted }
 *
 * level { seed, difficulty 1..3, final (Titanic: no safe corridor at the end), title, goal,
 *         sections: ['open','sparse','more','narrow','dense'] (default; final: ['sparse','dense','extreme','corridor'])
 *                   or [{kind, length, title, sub}], lengthScale (x all section lengths),
 *         objects: [{type:'berg'|'floe'|'big'|'debris'|'star'|'token', lane 0..2, z}] (authored, added),
 *         checkpoints (default true: buoy gate at each section start), night }
 * opts  { onDone({stars, time, avoided, iceTotal, collisions, correct, tries, tokens, starsCollected,
 *                 starsTotal, score, final, difficulty}),
 *         onChallenge({reason:'collision', collisions, world, grade}) -> Promise<{correct, tries, hints}>
 *           (default: TKQuiz.challenge(root, {domain:'campur', world, grade, mastery, islam, lib, sfx}))
 *         difficulty 1..3 (overrides level), world, grade, mastery, islam, lib(key)->url,
 *         art: { ship: url } (top-down, bow UP; default = a drawn liner, black hull, 4 funnels),
 *         sfx: { muted } (read live), reducedMotion, pauseOverlay (default true), lever (speed lever,
 *         default: only where there is room) }
 *
 * Child safety (PRD §0): nothing ever ends the run. A collision pauses the ship and asks one question;
 * any answer (with hints) lets the ship sail on. The final Titanic run ends in a calm, scripted
 * impact handed to the host's cinematic (onDone final:true, stars:3). No failure words anywhere.
 * Vanilla ES5, no build, one rAF loop that stops when hidden / paused / waiting for an answer.
 * ==========================================================================*/
(function (W) {
  'use strict'
  var D = W.document
  var TAU = Math.PI * 2
  var LANE = 100                  // lane width (world units); lanes at x = -100, 0, 100
  var SHIP_L = 132, SHIP_B = 28   // hull length / beam (units)
  var SHIP_HW = 13                // collision half-width
  var PK = 1 / 1700               // perspective: depth factor f = 1 / (1 + ahead * PK)
  var LANE_DUR = 0.45             // a lane change completes within this (s)
  var EASE = 'cubic-bezier(.23,1,.32,1)'
  var BASE = (function () { try { return location.pathname.indexOf('/Dunia-Emosi/') === 0 ? '/Dunia-Emosi/' : '/' } catch (e) { return '/' } })()

  function clamp (v, a, b) { return v < a ? a : v > b ? b : v }
  function num (v, d) { return typeof v === 'number' && isFinite(v) ? v : d }
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
  function laneX (l) { return (l - 1) * LANE }
  function easeIO (p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2 }

  /* ── embedded questions (owner 2026-09-29: action first, a question only on certain moments) ──
     level.questions { on: 'collide'|'buoy'|'gate' or an array of them, topic (a TKQuiz domain override),
     count (max collision questions per level), buoys (glowing Soal buoys / treasure chests), gates (lighthouse
     chain gates) }. Absent: lanes = collide only (the old behaviour); questions:false = none at all. */
  var Q_DEF = { on: ['collide'], count: 4 }
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
      buoys: on.buoy ? clamp(Math.round(num(q.buoys, 2)), 0, 6) : 0, gates: on.gate ? clamp(Math.round(num(q.gates, 1)), 0, 4) : 0 }
  }
  // Soal buoys + lighthouse gates are placed in open water: never on ice, a gate, or the finish
  function placeQ (w, QC) {
    function spanOf (o) { return o.type === 'wall' ? [o.z, o.z + o.len] : [o.z - (o.r || 0), o.z + (o.r || 0)] }
    function laneOpen (l, z, margin) {
      var x = laneX(l)
      for (var i = 0; i < w.objs.length; i++) {
        var o = w.objs[i]
        if (o.off) continue
        if (o.type === 'lgate' || o.type === 'qbuoy') { if (Math.abs(o.z - z) < 260) return false; continue }
        if (!o.ice && o.type !== 'debris') continue
        var sp = spanOf(o), hw = o.type === 'wall' ? o.hw : (o.r || 30) * 0.85
        if (sp[1] + margin < z || sp[0] - margin > z) continue
        if (Math.abs(o.x - x) < hw + SHIP_HW + 60 || o.type === 'big') return false
      }
      return true
    }
    // gates: on section starts (the checkpoint arch turns into the lighthouse gate), else evenly spaced
    var cps = w.objs.filter(function (o) { return o.type === 'gate' })
    for (var g = 0; g < QC.gates; g++) {
      var gz
      if (cps.length >= QC.gates) { var cp = cps[Math.floor((g + 0.5) * cps.length / QC.gates)]; cp.off = true; gz = cp.z + 40 }
      else gz = Math.round(w.zEnd * (g + 1) / (QC.gates + 1))
      // clear the water around the chain (ice there would pin the waiting ship)
      for (var i = 0; i < w.objs.length; i++) {
        var o = w.objs[i], sp = spanOf(o)
        if ((o.ice || o.type === 'debris') && !o.off && sp[1] > gz - 320 && sp[0] < gz + 220) { o.off = true; if (o.ice && o.type !== 'floe') w.iceTotal-- }
      }
      w.objs.push({ id: 900 + g, type: 'lgate', x: 0, z: gz, r: 0, drop: 0, asked: false, open: false, hit: false, passed: false, taken: false })
    }
    for (var b = 0; b < QC.buoys; b++) {
      var zt = w.zEnd * (b + 1) / (QC.buoys + 1), best = null
      for (var dz = 0; dz <= 900 && !best; dz += 40) {
        for (var sgn = -1; sgn <= 1 && !best; sgn += 2) {
          var z = zt + sgn * dz
          if (z < 420 || z > w.zEnd - 320) continue
          // the lane the next obstacle row keeps open first (one move for the child), then the others
          var nextL = 1
          for (var ri = 0; ri < w.rows.length; ri++) if (w.rows[ri].z > z) { nextL = w.rows[ri].lane; break }
          var order = [nextL, 1, 0, 2]
          for (var k = 0; k < order.length; k++) if (laneOpen(order[k], z, 170)) { best = { l: order[k], z: z }; break }
        }
      }
      if (!best) continue
      for (var si = 0; si < w.objs.length; si++) { var so = w.objs[si]; if ((so.type === 'star' || so.type === 'token') && !so.off && Math.abs(so.z - best.z) < 110 && Math.abs(so.x - laneX(best.l)) < 60) { so.off = true; if (so.type === 'star') w.starsTotal-- } }
      w.objs.push({ id: 950 + b, type: 'qbuoy', kind: b % 2 ? 'chest' : 'buoy', x: laneX(best.l), z: best.z, r: 30, bob: b * 1.7, hit: false, passed: false, taken: false })
    }
  }

  /* ── sections ─────────────────────────────────────────────────────────── */
  var SEC = {
    open:     { len: 800,  title: 'Laut Terbuka',      sub: 'Kumpulkan bintang di jalurmu!' },
    sparse:   { len: 1300, title: 'Es Mulai Muncul',   sub: 'Pindah jalur untuk menghindar.', gap: [470, 430, 390], two: [0, 0, 0.1] },
    more:     { len: 1400, title: 'Makin Banyak Es',   sub: 'Lihat jauh ke depan, ya!', gap: [410, 370, 340], two: [0.2, 0.3, 0.45], debris: 0.4 },
    narrow:   { len: 1300, title: 'Jalur Sempit',      sub: 'Cari satu jalur yang terbuka.', gap: [440, 400, 370], walls: true },
    dense:    { len: 1500, title: 'Ladang Es',         sub: 'Tetap tenang, pilih jalur aman.', gap: [350, 320, 290], two: [0.6, 0.75, 0.9], big: 0.4, debris: 0.25 },
    extreme:  { len: 1300, title: 'Ladang Es Raksasa', sub: 'Hati-hati, Kapten kecil!', gap: [330, 300, 280], two: [0.85, 0.9, 1], big: 0.55 },
    corridor: { len: 1450, title: 'Es di Segala Arah', sub: 'Kapten membantu mengemudi.' }
  }
  var SPEED = [150, 170, 190]      // cruising speed by difficulty (units/s)
  var ICE = { floe: 30, berg: 42, big: 92, fated: 70 }

  /* ── level builder (pure, seeded: same level + seed + difficulty = same sea) ── */
  function build (level, diff) {
    level = level || {}
    var di = clamp(Math.round(diff), 1, 3) - 1
    var R = rng(num(level.seed, 7) * 7919 + di * 131)
    var fin = !!level.final
    var list = level.sections && level.sections.length ? level.sections : fin ? ['sparse', 'dense', 'extreme', 'corridor'] : ['open', 'sparse', 'more', 'narrow', 'dense']
    var scaleLen = num(level.lengthScale, 1)
    var w = { objs: [], sections: [], iceTotal: 0, starsTotal: 0, final: fin, corridor: null, fated: null, diff: di + 1, rows: [] }
    var z = 0, p = 1, id = 0, lastEnd = -1e9   // lastEnd: where the previous row's ice ends (rows carry over sections)
    function add (o) { o.id = id++; o.hit = false; o.passed = false; o.taken = false; w.objs.push(o); if (o.ice && o.type !== 'floe') w.iceTotal++; if (o.type === 'star') w.starsTotal++; return o }
    function ice (type, x, z0, extra) {
      var r = ICE[type] || 40
      var o = { type: type, ice: true, x: x, z: z0, r: r, shape: Math.floor(R() * 6), rot: R() * TAU, bob: R() * TAU, extra: !!extra }
      return add(o)
    }
    function debris (x, z0, extra) { return add({ type: 'debris', x: x, z: z0, r: 18, key: R() < 0.5 ? 'tk-prop/barrel' : 'tk-prop/crate-titanic', rot: R() * TAU, bob: R() * TAU, extra: !!extra }) }
    function star (lane, z0) { return add({ type: 'star', x: laneX(lane), z: z0, r: 22, bob: R() * TAU }) }
    function token (lane, z0) { return add({ type: 'token', x: laneX(lane), z: z0, r: 24, bob: R() * TAU }) }
    function nextLane (cur, stay) {
      if (R() < stay) return cur
      if (cur === 0) return 1
      if (cur === 2) return 1
      return R() < 0.5 ? 0 : 2
    }
    for (var si = 0; si < list.length; si++) {
      var spec = typeof list[si] === 'string' ? { kind: list[si] } : list[si]
      var kind = SEC[spec.kind] ? spec.kind : 'sparse', def = SEC[kind]
      var len = num(spec.length, def.len) * scaleLen
      var sec = { kind: kind, z0: z, z1: z + len, title: spec.title || def.title, sub: spec.sub != null ? spec.sub : def.sub }
      w.sections.push(sec)
      if (level.checkpoints !== false && si > 0 && kind !== 'corridor') add({ type: 'gate', x: 0, z: z + 40, r: 0 })
      if (kind === 'open') {
        var pat = [1, 1, 0, 0, 1, 2, 2, 1]
        for (var k = 0, zz0 = z + 260; zz0 < sec.z1 - 80; zz0 += 150, k++) star(pat[k % pat.length], zz0)
        p = 1
      } else if (kind === 'corridor') {
        // the Titanic's last minutes: one lane blocked, then two, then every lane (a wall of ice)
        var cz = z
        var a1 = p === 1 ? (R() < 0.5 ? 0 : 2) : p
        ice('berg', laneX(a1), cz + 300)
        w.rows.push({ z: cz + 300, lane: 1, end: cz + 300 }, { z: cz + 640, lane: 1, end: cz + 640 })
        var rb = [0, 2]; for (var q = 0; q < rb.length; q++) ice('berg', laneX(rb[q]) + (R() - 0.5) * 12, cz + 640)
        ice('floe', laneX(0) - 120, cz + 700); ice('floe', laneX(2) + 120, cz + 690)
        var wz = cz + 1000
        var fated = ice('fated', 0, wz)
        fated.fated = true
        ice('big', -135, wz + 30); ice('big', 135, wz + 20)
        ice('berg', -250, wz - 20); ice('berg', 250, wz + 10); ice('berg', -60, wz + 150); ice('berg', 80, wz + 170)
        ice('floe', -30, wz - 150); ice('floe', 160, wz - 120); ice('floe', -190, wz - 110)
        w.corridor = { z0: z, wall: wz }
        w.fated = fated
        p = 1
      } else {
        var gap = def.gap[di], zz = z + Math.max(gap * 0.75, si === 0 ? 620 : 320)   // a calm lead-in before the first ice
        // a long ridge that ends past the section line must still leave a full row gap before the next row:
        // without this the first row after a 'narrow' section came only ~200 units after the ridge (0.09 s of
        // reaction margin at difficulty 3 -> the QA autopilot, and a child, could not reach the open lane)
        zz = Math.max(zz, lastEnd + gap * 0.85)
        var tokenAt = kind !== 'sparse' ? z + len * (0.35 + R() * 0.3) : -1
        var prevZ = z
        while (zz < sec.z1 - 140) {
          var np = nextLane(p, kind === 'sparse' ? 0.35 : 0.3)
          var others = [0, 1, 2].filter(function (l) { return l !== np })
          var span = 0
          if (def.walls && R() < 0.8) {
            // narrow passage: long ridges of ice on the two other lanes, one open lane between them
            span = 180 + R() * 80
            for (var wi = 0; wi < others.length; wi++) add({ type: 'wall', ice: true, x: laneX(others[wi]), z: zz, len: span, hw: 40, shape: Math.floor(R() * 6), bob: R() * TAU })
            star(np, zz + span * 0.5)
          } else {
            var two = R() < (def.two ? def.two[di] : 0)
            var need = np !== p ? p : others[Math.floor(R() * 2)]
            if (two && def.big && np !== 1 && R() < def.big) {
              ice('big', np === 0 ? LANE * 0.5 : -LANE * 0.5, zz + 20)
              span = 110   // a big berg is long: leave room behind it before the next row
            } else {
              ice(R() < 0.3 && kind !== 'dense' ? 'floe' : 'berg', laneX(need) + (R() - 0.5) * 16, zz)
              if (two) {
                var other = others[0] === need ? others[1] : others[0]
                if (def.debris && R() < def.debris * 0.6) debris(laneX(other) + (R() - 0.5) * 20, zz + 10, true)
                else ice(R() < 0.35 ? 'floe' : 'berg', laneX(other) + (R() - 0.5) * 16, zz + (R() - 0.5) * 40, true)
              } else if (def.debris && R() < def.debris) {
                var free = others[0] === need ? others[1] : others[0]
                if (free !== np) debris(laneX(free) + (R() - 0.5) * 20, zz - 60 - R() * 60)
              }
            }
            if (R() < 0.75) star(np, zz - Math.min(gap * 0.45, 200))
          }
          if (tokenAt > 0 && zz > tokenAt) { token(np, zz - Math.min(gap * 0.45, 200) - 40); tokenAt = -1 }
          w.rows.push({ z: zz, lane: np, end: zz + span })
          prevZ = zz + span
          lastEnd = prevZ
          p = np
          zz = prevZ + gap * (0.85 + R() * 0.3)
        }
      }
      z = sec.z1
    }
    // authored objects (tests, special chapters)
    var ob = level.objects || []
    for (var oi = 0; oi < ob.length; oi++) {
      var o = ob[oi], lx = laneX(clamp(num(o.lane, 1), 0, 2))
      if (o.type === 'star') star(clamp(num(o.lane, 1), 0, 2), o.z)
      else if (o.type === 'token') token(clamp(num(o.lane, 1), 0, 2), o.z)
      else if (o.type === 'debris') debris(lx, o.z)
      else ice(ICE[o.type] ? o.type : 'berg', o.type === 'big' ? lx + (o.lane === 2 ? -LANE / 2 : LANE / 2) : lx, o.z)
    }
    w.zEnd = z
    var QC = qconf(level)
    if (!fin && (QC.buoys || QC.gates)) placeQ(w, QC)
    w.objs.sort(function (a, b) { return a.z - b.z })
    return w
  }

  /* ── CSS (injected once, scoped to .tkl-root) ─────────────────────────── */
  var CSS = [
    '.tkl-root{position:absolute;inset:0;overflow:hidden;background:#0b2a4a;color:#fff;font-family:"Fredoka One","Fredoka","Nunito",system-ui,sans-serif;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;touch-action:none}',
    '.tkl-cv{position:absolute;inset:0;width:100%;height:100%;display:block}',
    '.tkl-panel{background:rgba(6,24,48,.78);border:1.5px solid rgba(150,210,255,.34);border-radius:14px;box-shadow:0 4px 14px rgba(0,0,0,.28)}',
    '.tkl-tl{position:absolute;left:10px;top:calc(10px + env(safe-area-inset-top,0px));display:flex;flex-direction:column;gap:6px;max-width:min(46%,340px);pointer-events:none}',
    '.tkl-obj{padding:7px 12px}.tkl-obj b{display:block;font-weight:normal;font-size:17px;line-height:1.15;color:#ffd166}.tkl-obj span{display:block;font-family:system-ui,sans-serif;font-weight:800;font-size:13px;line-height:1.25}',
    '.tkl-stats{display:flex;flex-direction:column;gap:6px;align-items:flex-start}',
    '.tkl-stat{padding:4px 12px 5px;min-width:104px}.tkl-stat small{display:block;font:800 12px/1.2 system-ui,sans-serif;color:#bfe3ff}.tkl-stat b{display:block;font-weight:normal;font-size:21px;line-height:1.1;letter-spacing:.5px}',
    '.tkl-stat.is-warn b{color:#ffb347;font-size:17px}.tkl-stat[hidden]{display:none}',
    '.tkl-tr{position:absolute;right:10px;top:calc(10px + env(safe-area-inset-top,0px));display:flex;flex-direction:column;align-items:flex-end;gap:8px}',
    '.tkl-radar{width:100px;height:100px;border-radius:50%;display:block;box-shadow:0 0 0 2px rgba(150,215,255,.4),0 6px 18px rgba(0,0,0,.35)}',
    '.tkl-btn{pointer-events:auto;border:0;cursor:pointer;touch-action:none;font:inherit;color:#fff;transition:transform .16s ' + EASE + ',box-shadow .16s ' + EASE + ',opacity .3s,filter .3s}',
    '.tkl-pausebtn{width:56px;height:56px;border-radius:16px;border:1.5px solid rgba(150,215,255,.4);background:rgba(6,26,46,.82);display:grid;place-items:center}',
    '.tkl-pausebtn i{display:block;width:20px;height:22px;border-left:7px solid #fff;border-right:7px solid #fff;box-sizing:border-box}',
    '.tkl-ctrl{position:absolute;left:0;right:0;bottom:calc(12px + env(safe-area-inset-bottom,0px));display:flex;justify-content:space-between;align-items:flex-end;padding:0 14px;pointer-events:none}',
    '.tkl-turn,.tkl-boost{position:relative;display:grid;place-items:center;border-radius:50%;border:3px solid rgba(255,255,255,.6)}',
    '.tkl-turn{width:var(--tkl-turn,88px);height:var(--tkl-turn,88px);background:linear-gradient(#37a3e3,#1b6aa3);box-shadow:0 6px 0 #0f4a74,0 10px 16px rgba(0,0,0,.3)}',
    '.tkl-boost{width:var(--tkl-boost,104px);height:var(--tkl-boost,104px);background:radial-gradient(circle at 50% 40%,#ffe39a,#f5b700 60%,#c98f00);box-shadow:0 6px 0 #8d6400,0 10px 16px rgba(0,0,0,.3)}',
    '.tkl-boost img{width:67%;height:67%;object-fit:contain;pointer-events:none;transition:transform .5s ' + EASE + '}',
    '.tkl-boost span{position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);padding:2px 10px;border-radius:10px;background:#3b2800;color:#ffe39a;font-size:14px;white-space:nowrap}',
    '.tkl-boost .tkl-up{position:absolute;top:6px;left:50%;margin-left:-9px;width:18px;height:14px;background:#fff;clip-path:polygon(50% 0,100% 100%,0 100%);opacity:.9}',
    '.tkl-boost.is-on img{transform:rotate(200deg)}.tkl-boost.is-cool{filter:saturate(.45) brightness(.85)}',
    '.tkl-turn.is-on,.tkl-boost.is-on{transform:scale(.95) translateY(3px)}',
    '.tkl-turn.is-demo,.tkl-boost.is-demo{animation:tkl-pulse 1.1s ' + EASE + ' infinite}',
    '.tkl-turn.is-demo{box-shadow:0 6px 0 #0f4a74,0 0 0 5px #ffd166,0 0 26px rgba(255,209,102,.85)}.tkl-boost.is-demo{box-shadow:0 6px 0 #8d6400,0 0 0 5px #fff,0 0 28px rgba(255,240,180,.9)}',
    '@keyframes tkl-pulse{0%,100%{transform:scale(1)}45%{transform:scale(1.09)}}@keyframes tkl-glow{0%,100%{opacity:1}50%{opacity:.6}}',
    '.tkl-rm .tkl-turn.is-demo,.tkl-rm .tkl-boost.is-demo{animation:tkl-glow 1.2s linear infinite}',
    '.tkl-stat b,.tkl-obj b{font-variant-numeric:tabular-nums}',
    '.tkl-arw{display:block;width:calc(var(--tkl-turn,88px) * .48);height:calc(var(--tkl-turn,88px) * .52);background:linear-gradient(#fff,#d8ecff);clip-path:polygon(50% 0,100% 48%,68% 48%,68% 100%,32% 100%,32% 48%,0 48%);filter:drop-shadow(0 1px 0 rgba(0,0,0,.35))}.tkl-arw-l{transform:rotate(-90deg)}.tkl-arw-r{transform:rotate(90deg)}',
    '.tkl-locked .tkl-turn,.tkl-locked .tkl-boost,.tkl-locked .tkl-lever{opacity:.4;filter:saturate(.3)}',
    '.tkl-lever{position:absolute;right:12px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:6px;padding:8px;align-items:stretch}',
    '.tkl-lever small{font:800 12px system-ui,sans-serif;color:#bfe3ff;text-align:center}',
    '.tkl-lv{min-width:96px;height:56px;border-radius:14px;background:rgba(20,50,90,.9);border:1.5px solid rgba(150,215,255,.4);font-size:16px}',
    '.tkl-lv.is-on{background:#ffc83d;color:#3b2800;border-color:#ffe39a}',
    '.tkl-banner{position:absolute;left:50%;top:24%;transform:translate(-50%,-14px);opacity:0;padding:10px 24px 11px;text-align:center;pointer-events:none;transition:opacity .35s ease-out,transform .45s ' + EASE + ';white-space:nowrap}',
    '.tkl-banner b{display:block;font-weight:normal;font-size:28px;color:#fff;text-shadow:0 2px 0 #0b3a5c}.tkl-banner span{display:block;font:800 15px/1.3 system-ui,sans-serif;color:#cfeaff}',
    '.tkl-banner.is-on{opacity:1;transform:translate(-50%,0)}',
    '.tkl-warn{position:absolute;left:50%;top:15%;transform:translate(-50%,-10px);opacity:0;display:flex;align-items:center;gap:10px;padding:9px 18px 9px 12px;border-radius:16px;background:rgba(120,40,20,.9);border:2px solid #ffb347;color:#fff;font-size:20px;white-space:nowrap;pointer-events:none;transition:opacity .4s ease-out,transform .45s ' + EASE + '}',
    '.tkl-warn.is-on{opacity:1;transform:translate(-50%,0)}',
    '.tkl-tri{position:relative;width:30px;height:27px;background:#ffc83d;clip-path:polygon(50% 0,100% 100%,0 100%);flex:none}',
    '.tkl-tri:before{content:"";position:absolute;left:13px;top:8px;width:4px;height:10px;border-radius:2px;background:#5a2a00}.tkl-tri:after{content:"";position:absolute;left:13px;top:20px;width:4px;height:4px;border-radius:2px;background:#5a2a00}',
    '.tkl-cap{position:absolute;left:12px;bottom:calc(var(--tkl-ctrlh,128px) + env(safe-area-inset-bottom,0px));display:flex;align-items:flex-end;gap:8px;max-width:min(94%,470px);opacity:0;transform:translateY(12px);transition:opacity .35s ease-out,transform .45s ' + EASE + ';pointer-events:none}',
    '.tkl-cap.is-on{opacity:1;transform:none}',
    '.tkl-cap img{width:84px;height:84px;flex:none;border-radius:50%;object-fit:cover;object-position:50% 10%;background:#dbe9f7;border:3px solid #ffd166;box-shadow:0 4px 12px rgba(0,0,0,.35)}',
    '.tkl-bub{position:relative;background:#fff;color:#12314f;border-radius:16px;padding:8px 14px 10px;box-shadow:0 6px 14px rgba(0,0,0,.3);margin-bottom:10px}',
    '.tkl-bub b{display:inline-block;margin:-20px 0 4px;padding:2px 10px;border-radius:10px;background:#1F4FA0;color:#fff;font-weight:normal;font-size:14px}',
    '.tkl-bub span{display:block;font:800 17px/1.3 system-ui,sans-serif}',
    '.tkl-hint{position:absolute;left:0;right:0;margin:0 auto;width:max-content;max-width:min(86%,420px);bottom:calc(var(--tkl-ctrlh,116px) + env(safe-area-inset-bottom,0px));transform:translateY(8px);opacity:0;padding:8px 16px;border-radius:14px;background:#fff;color:#12314f;font:900 16px/1.25 system-ui,sans-serif;text-align:center;box-shadow:0 6px 14px rgba(0,0,0,.3);pointer-events:none;transition:opacity .3s ease-out,transform .4s ' + EASE + '}',
    '.tkl-hint.is-on{opacity:1;transform:none}',
    '.tkl-pops{position:absolute;inset:0;pointer-events:none;overflow:hidden}',
    '.tkl-pop{position:absolute;transform:translate(-50%,-50%);font-size:24px;color:#fff2a8;white-space:nowrap;text-shadow:0 2px 0 #0b3a5c,0 0 10px rgba(80,200,255,.8);animation:tkl-pop 1s ease-out forwards}',
    '.tkl-pop.is-big{font-size:26px;color:#fff;background:rgba(20,110,70,.88);padding:6px 16px;border-radius:14px;text-shadow:none;border:2px solid #9ff0c0;animation-duration:1.8s}',
    '@keyframes tkl-pop{0%{opacity:0;transform:translate(-50%,-30%) scale(.7)}20%{opacity:1;transform:translate(-50%,-70%) scale(1.06)}100%{opacity:0;transform:translate(-50%,-160%) scale(1)}}',
    '@keyframes tkl-fade{0%{opacity:0}20%{opacity:1}100%{opacity:0}}',
    '.tkl-pause{position:absolute;inset:0;background:rgba(4,18,32,.55);display:none;place-items:center;z-index:40}.tkl-pause.is-on{display:grid}',
    '.tkl-pause-card{padding:22px 28px;text-align:center;display:flex;flex-direction:column;gap:14px;align-items:center}.tkl-pause-card h3{margin:0;font-weight:normal;font-size:28px}',
    '.tkl-resume{min-width:160px;height:60px;border-radius:18px;background:#ffc83d;color:#3b2800;font-size:20px;box-shadow:0 5px 0 #c98f00}',
    /* polish (owner 2026-09-28): wood & brass HUD + brass controls when tk-sea.js is loaded */
    '.tkl-sea .tkl-panel{background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(0,0,0,.12)),repeating-linear-gradient(92deg,#7a4a24 0 7px,#6d4120 7px 9px,#835029 9px 17px,#70431f 17px 20px);border:3px solid #d9a441;border-radius:16px;box-shadow:inset 0 0 0 2px #7a5314,0 4px 0 #4a2c10,0 8px 16px rgba(0,0,0,.3);color:#fff4d6;text-shadow:0 1px 0 rgba(40,20,0,.8)}',
    '.tkl-sea .tkl-obj b{color:#ffe066;font-size:21px}.tkl-sea .tkl-obj span{color:#fff4d6;font-size:15px}',
    '.tkl-sea.tkl-port .tkl-obj b{font-size:19px}.tkl-sea.tkl-short .tkl-obj b{font-size:18px}',
    '.tkl-sea .tkl-lever small{font-size:14px;color:#ffe3a3}.tkl-sea .tkl-lv{font-size:18px}',
    '.tkl-sea .tkl-stats{flex-direction:row;flex-wrap:wrap}.tkl-sea .tkl-stat{min-width:0;padding:4px 12px 4px 6px}',
    '.tkl-sea .tkl-route{min-width:0;align-self:stretch}',
    '.tkl-sea .tkl-turn{background:radial-gradient(circle at 35% 28%,#fff4c4 0,#f2c65e 30%,#cf9433 64%,#8d5b18 100%);border:4px solid #6b4412;box-shadow:inset 0 -6px 0 rgba(90,55,10,.45),inset 0 4px 0 rgba(255,250,220,.6),0 7px 0 #4f310b,0 12px 18px rgba(0,0,0,.32)}',
    '.tkl-sea .tkl-turn .tkl-arw{background:linear-gradient(#24507a,#0f2c4a);filter:drop-shadow(0 2px 0 rgba(255,245,210,.7))}',
    '.tkl-sea .tkl-turn.is-demo{box-shadow:inset 0 -6px 0 rgba(90,55,10,.45),0 7px 0 #4f310b,0 0 0 6px #fff4c4,0 0 28px rgba(255,220,120,.9)}',
    '.tkl-sea .tkl-boost{background:radial-gradient(circle at 50% 50%,#f7e2b5 0,#e8c07a 42%,#8a5a26 44%,#6d4120 58%,#d9a441 60%,#8d5b18 100%);border:4px solid #4f310b;box-shadow:inset 0 3px 0 rgba(255,250,220,.5),0 7px 0 #4f310b,0 12px 18px rgba(0,0,0,.32)}',
    '.tkl-sea .tkl-boost span{background:#4a2c10;border:2px solid #d9a441;color:#ffe066;font-family:"Fredoka One","Fredoka",system-ui,sans-serif}',
    '.tkl-sea .tkl-boost .tkl-up{background:#ffe066}',
    '.tkl-sea .tkl-pausebtn,.tkl-sea .tkl-shipbtn{background:radial-gradient(circle at 35% 28%,#fff4c4 0,#f2c65e 30%,#cf9433 64%,#8d5b18 100%);border:3px solid #6b4412;box-shadow:0 4px 0 #4f310b}',
    '.tkl-sea .tkl-pausebtn i{border-color:#3b2400}',
    '.tkl-sea .tkl-radar{box-shadow:0 0 0 4px #d9a441,0 0 0 6px #6b4412,0 6px 18px rgba(0,0,0,.35)}',
    '.tkl-sea .tkl-lv{background:#5a3518;border:2px solid #d9a441;color:#fff4d6}.tkl-sea .tkl-lv.is-on{background:radial-gradient(circle at 35% 28%,#fff4c4 0,#f2c65e 35%,#cf9433 75%);color:#3b2400}',
    '.tkl-sea .tkl-banner b{color:#ffe066}',
    // phone on its side: the tutorial hint sits at the TOP (it used to cover the ship over the controls)
    '.tkl-short .tkl-hint{top:calc(10px + env(safe-area-inset-top,0px));bottom:auto!important;left:36%;right:17%;width:auto;max-width:none;font-size:14px}',
    '.tkl-sea.tkl-short .tkl-tl{max-width:34%}.tkl-sea.tkl-short .tkl-stats{display:none}.tkl-sea.tkl-short .tkl-obj b{font-size:16px}',
    '.tkl-sea.tkl-narrow .tkl-stats{flex-wrap:nowrap}.tkl-sea.tkl-narrow .tkl-stat{flex:1 1 auto;padding:3px 6px 3px 4px}.tkl-sea.tkl-narrow .tkl-stat img{width:22px;height:22px}.tkl-sea.tkl-narrow .tkl-stat small{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:62px}.tkl-sea.tkl-narrow .tkl-obj span{font-size:13px}',
    '.tkl-sea.tkl-port:not(.tkl-narrow) .tkl-stat b{font-size:22px}',
    // portrait: stats in one row under the objective, radar smaller
    '.tkl-port .tkl-tl{right:142px;max-width:none}.tkl-port .tkl-stats{flex-direction:row;gap:5px;align-items:stretch}.tkl-port .tkl-stat{min-width:0;flex:1 1 0;padding:4px 7px}.tkl-port .tkl-stat b{font-size:18px}',
    '.tkl-port .tkl-radar{width:92px;height:92px}.tkl-port .tkl-obj b{font-size:15px}',
    // short landscape (phone on its side)
    '.tkl-boost span{font-size:calc(14px + var(--tkl-k,1) * 2px)}',
    '.tkl-short .tkl-boost{margin-left:auto;margin-right:10px}',
    '.tkl-port .tkl-boost.is-up,.tkl-wide .tkl-boost.is-up{position:absolute;right:14px;bottom:calc(var(--tkl-turn,88px) + 10px)}',
    '.tkl-wide .tkl-lever{right:auto;left:12px}',
    /* playtest 2026-09-29, phone upright: the section banner duplicated the route-bar label and sat on the bow
       (hidden there); the hint and the captain move to the free column above LEFT (beside the wheel), never over
       the ship; the chips keep icon, label and value, and the objective keeps its title line (chip labels stay, ellipsised) */
    '.tkl-port .tkl-banner{display:none}',
    '.tkl-upw .tkl-hint{left:12px;right:auto;margin:0;width:auto;max-width:calc(100% - var(--tkl-boost,104px) - 44px);bottom:calc(var(--tkl-turn,88px) + 24px + env(safe-area-inset-bottom,0px))!important;text-align:left;font-size:15px}',
    '.tkl-upw .tkl-cap{left:12px;bottom:calc(var(--tkl-turn,88px) + 24px + env(safe-area-inset-bottom,0px));max-width:calc(100% - var(--tkl-boost,104px) - 40px)}',
    '.tkl-upw .tkl-cap img{width:58px;height:58px}.tkl-upw .tkl-bub span{font-size:15px}',
    '.tkl-sea.tkl-narrow .tkl-obj span{display:none}',
    // wide landscape: the hint sits at the bottom between the thumbs (under the ship), the captain above the wheel
    '.tkl-wide .tkl-hint{bottom:calc(16px + env(safe-area-inset-bottom,0px))!important;max-width:min(52%,560px)}',
    '.tkl-wide .tkl-cap{left:auto;right:14px;bottom:calc(var(--tkl-turn,88px) + var(--tkl-boost,104px) + 30px);max-width:min(40%,470px)}',
    '.tkl-toprow{display:flex;gap:8px}',
    '.tkl-shipbtn{width:56px;height:56px;padding:3px;border-radius:16px;border:1.5px solid rgba(150,215,255,.4);background:rgba(6,26,46,.82);display:grid;place-items:center}',
    '.tkl-shipbtn img{width:100%;height:100%;object-fit:contain;pointer-events:none}',
    '.tkl-swap{min-width:160px;height:56px;border-radius:18px;background:#2f8fd0;color:#fff;font-size:18px;box-shadow:0 5px 0 #1b5f8f;display:flex;align-items:center;gap:8px;padding:0 16px 0 8px}',
    '.tkl-swap img{width:52px;height:40px;object-fit:contain}',
    '.tkl-short .tkl-radar{width:80px;height:80px}.tkl-short .tkl-obj{padding:5px 10px}.tkl-short .tkl-obj span{display:none}.tkl-short .tkl-stat{padding:2px 10px}.tkl-short .tkl-stat b{font-size:17px}',
    '.tkl-short .tkl-cap{bottom:calc(10px + env(safe-area-inset-bottom,0px));left:50%;transform:translate(-50%,12px);max-width:min(52%,440px)}.tkl-short .tkl-cap.is-on{transform:translate(-50%,0)}.tkl-short .tkl-cap img{width:64px;height:64px}.tkl-short .tkl-bub span{font-size:15px}',
    '.tkl-short .tkl-hint{bottom:calc(var(--tkl-ctrlh,16px) + env(safe-area-inset-bottom,0px));max-width:min(56%,420px)}.tkl-short .tkl-banner{top:18%}.tkl-short .tkl-banner b{font-size:24px}',
    '.tkl-rm .tkl-pop{animation:tkl-fade 1.1s linear forwards}.tkl-rm .tkl-banner,.tkl-rm .tkl-warn,.tkl-rm .tkl-cap,.tkl-rm .tkl-hint{transition:opacity .3s linear}',
    '.tkl-rm .tkl-banner,.tkl-rm .tkl-banner.is-on,.tkl-rm .tkl-warn,.tkl-rm .tkl-warn.is-on{transform:translate(-50%,0)}.tkl-rm .tkl-cap,.tkl-rm .tkl-cap.is-on{transform:none}',
    '.tkl-rm .tkl-short .tkl-cap,.tkl-rm.tkl-short .tkl-cap{transform:translate(-50%,0)}.tkl-rm .tkl-hint{transform:none}.tkl-rm .tkl-boost img{transition:none}'
  ].join('\n')
  function injectCss () {
    if (D.getElementById('tkl-style')) return
    var s = D.createElement('style'); s.id = 'tkl-style'; s.textContent = CSS; D.head.appendChild(s)
  }
  function el (tag, cls, html) { var e = D.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e }

  /* ── audio: SFXEngine cues when present + a small WebAudio synth (ideas from tk-steer) ── */
  function makeAudio (opts) {
    var A = { ctx: null, master: null, bed: null, lastMuted: null }
    var sfxE = W.SFXEngine
    A.muted = function () {
      try { if (opts.sfx && opts.sfx.muted) return true; if (sfxE && typeof sfxE.getMute === 'function' && sfxE.getMute()) return true } catch (e) {}
      return false
    }
    A.ensure = function () {
      try {
        if (!A.ctx) {
          var AC = W.AudioContext || W.webkitAudioContext
          if (!AC) return null
          A.ctx = new AC(); A.master = A.ctx.createGain(); A.master.gain.value = A.muted() ? 0 : 0.9; A.master.connect(A.ctx.destination)
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
    A.env = function (node, t0, a, peak, hold, rel) {
      var g = node.gain
      g.setValueAtTime(0.0001, t0); g.exponentialRampToValueAtTime(peak, t0 + a); g.setValueAtTime(peak, t0 + a + hold); g.exponentialRampToValueAtTime(0.0001, t0 + a + hold + rel)
    }
    A.startBed = function () {
      try {
        if (!A.ctx || A.bed) return
        var c = A.ctx, src = c.createBufferSource(), lp = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain()
        src.buffer = A.noise(2.5); src.loop = true; lp.type = 'lowpass'; lp.frequency.value = 420; g.gain.value = 0.045
        lfo.frequency.value = 0.13; lg.gain.value = 0.022; lfo.connect(lg); lg.connect(g.gain)
        src.connect(lp); lp.connect(g); g.connect(A.master); src.start(); lfo.start()
        A.bed = { src: src, lfo: lfo }
      } catch (e) {}
    }
    A.horn = function () {
      if (!A.live()) return
      try {
        var c = A.ctx, t = c.currentTime, lp = c.createBiquadFilter(), g = c.createGain()
        lp.type = 'lowpass'; lp.frequency.value = 650; lp.connect(g); g.connect(A.master); A.env(g, t, 0.12, 0.13, 1.0, 0.5)
        ;[98, 147].forEach(function (f) { var o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); o.start(t); o.stop(t + 1.8) })
      } catch (e) {}
    }
    A.whoosh = function (up) {
      if (!A.live()) return
      try {
        var c = A.ctx, t = c.currentTime, s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain()
        s.buffer = A.noise(0.6); bp.type = 'bandpass'; bp.Q.value = 1.2
        bp.frequency.setValueAtTime(up ? 500 : 900, t); bp.frequency.exponentialRampToValueAtTime(up ? 2200 : 420, t + 0.45)
        s.connect(bp); bp.connect(g); g.connect(A.master); A.env(g, t, 0.05, up ? 0.14 : 0.08, 0.1, 0.35); s.start(t); s.stop(t + 0.6)
      } catch (e) {}
    }
    A.splash = function (vol) {
      if (!A.live()) return
      try {
        var c = A.ctx, t = c.currentTime, s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain()
        s.buffer = A.noise(0.5); bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 0.7
        s.connect(bp); bp.connect(g); g.connect(A.master); A.env(g, t, 0.02, 0.16 * (vol || 1), 0.05, 0.35); s.start(t); s.stop(t + 0.5)
      } catch (e) {}
    }
    A.rumble = function (dur, vol) {
      if (!A.live()) return
      try {
        var c = A.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain(), s = c.createBufferSource(), lp = c.createBiquadFilter(), g2 = c.createGain()
        o.type = 'sine'; o.frequency.setValueAtTime(52, t); o.frequency.exponentialRampToValueAtTime(34, t + dur); o.connect(g); g.connect(A.master)
        A.env(g, t, 0.08, 0.3 * (vol || 1), dur * 0.4, dur * 0.6)
        s.buffer = A.noise(dur + 0.2); lp.type = 'lowpass'; lp.frequency.value = 140; s.connect(lp); lp.connect(g2); g2.connect(A.master)
        A.env(g2, t, 0.06, 0.22 * (vol || 1), dur * 0.3, dur * 0.7)
        o.start(t); o.stop(t + dur + 0.1); s.start(t); s.stop(t + dur + 0.1)
      } catch (e) {}
    }
    A.tick = function () {
      if (!A.live()) return
      try { var c = A.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = 1900; o.connect(g); g.connect(A.master); A.env(g, t, 0.004, 0.035, 0.005, 0.03); o.start(t); o.stop(t + 0.06) } catch (e) {}
    }
    A.chime = function (big) {
      if (A.muted()) return
      try { if (sfxE && typeof (big ? sfxE.levelup : sfxE.star) === 'function') { (big ? sfxE.levelup : sfxE.star)(); return } } catch (e) {}
      if (!A.live()) return
      try {
        var c = A.ctx, t = c.currentTime, notes = big ? [784, 988, 1175, 1568] : [880, 1318]
        for (var i = 0; i < notes.length; i++) {
          var o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = notes[i]; o.connect(g); g.connect(A.master)
          A.env(g, t + i * 0.09, 0.01, 0.09, 0.04, 0.45); o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.6)
        }
      } catch (e) {}
    }
    A.sync = function () {
      if (!A.ctx || !A.master) return
      var m = A.muted()
      if (m !== A.lastMuted) { A.lastMuted = m; try { A.master.gain.setTargetAtTime(m ? 0 : 0.9, A.ctx.currentTime, 0.05) } catch (e) {} }
    }
    A.suspend = function () { try { if (A.ctx && A.ctx.state === 'running') A.ctx.suspend() } catch (e) {} }
    A.close = function () {
      try { if (A.bed) { A.bed.src.stop(); A.bed.lfo.stop() } } catch (e) {}
      try { if (A.ctx) A.ctx.close() } catch (e) {}
      A.ctx = null; A.bed = null
    }
    return A
  }

  /* ── pre-rendered art (offscreen canvases, drawn once per mount) ───────── */
  function canvas (w, h) { var c = D.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c }
  // one top-down iceberg, slightly oblique: a pale halo, the near (south) face in shade, a faceted top
  function iceSprite (seed, R, tall, night) {
    var r = rng(seed), pad = R * 0.45, cw = R * 2 + pad * 2, ch = R * 2 + pad * 2 + tall
    var c = canvas(cw, ch), x = c.getContext('2d'), cx = cw / 2, cy = pad + R
    var n = 9 + Math.floor(r() * 4), pts = []
    for (var i = 0; i < n; i++) { var a = i / n * TAU + (r() - 0.5) * 0.4, d = R * (0.72 + r() * 0.28); pts.push([Math.cos(a) * d, Math.sin(a) * d * 0.86]) }
    function poly (dx, dy, k) { x.beginPath(); for (var j = 0; j < pts.length; j++) { var px = cx + pts[j][0] * k + dx, py = cy + pts[j][1] * k + dy; if (j) x.lineTo(px, py); else x.moveTo(px, py) } x.closePath() }
    var g = x.createRadialGradient(cx, cy + tall * 0.6, R * 0.6, cx, cy + tall * 0.6, R * 1.42)
    g.addColorStop(0, night ? 'rgba(90,200,235,.34)' : 'rgba(150,235,255,.45)'); g.addColorStop(1, 'rgba(90,200,235,0)')
    x.fillStyle = g; x.fillRect(0, 0, cw, ch)
    x.fillStyle = night ? 'rgba(120,210,240,.35)' : 'rgba(170,235,255,.5)'; poly(0, tall + 5, 1.1); x.fill()
    for (var s = tall; s > 0; s -= 3) { x.fillStyle = s === tall ? '#3f8fb8' : '#5aa9cf'; poly(0, s, 1); x.fill() }
    x.fillStyle = '#e9f7ff'; poly(0, 0, 1); x.fill()
    // facets: fan from an off-centre peak, alternating light/shade
    var px0 = cx + (r() - 0.5) * R * 0.4, py0 = cy - R * 0.1
    for (var f = 0; f < pts.length; f++) {
      var p1 = pts[f], p2 = pts[(f + 1) % pts.length], sh = Math.cos(Math.atan2(p1[1] + p2[1], p1[0] + p2[0]) + 2.2)
      x.fillStyle = sh > 0 ? 'rgba(255,255,255,' + (0.25 + sh * 0.5) + ')' : 'rgba(80,160,205,' + (-sh * 0.42) + ')'
      x.beginPath(); x.moveTo(px0, py0); x.lineTo(cx + p1[0], cy + p1[1]); x.lineTo(cx + p2[0], cy + p2[1]); x.closePath(); x.fill()
    }
    x.strokeStyle = '#4c9dc8'; x.lineWidth = Math.max(1.5, R * 0.035); poly(0, 0, 1); x.stroke()
    x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = Math.max(1, R * 0.03); x.beginPath()
    for (var hI = 0; hI < 3; hI++) { var q = pts[(hI * 3 + 1) % pts.length]; x.moveTo(px0, py0); x.lineTo(cx + q[0] * 0.8, cy + q[1] * 0.8) }
    x.stroke()
    return { c: c, cx: cx, cy: cy, R: R }
  }
  // flat ice floe: low slab with cracks
  function floeSprite (seed, R, night) { return iceSprite(seed, R, Math.max(3, R * 0.08), night) }
  // procedural top-down liner (bow up): black hull, teak deck, white houses, 4 buff funnels with black tops
  function shipSprite (L, B, k) {
    var pad = 10, c = canvas((B + pad * 2) * k, (L + pad * 2) * k), x = c.getContext('2d')
    x.scale(k, k); x.translate(B / 2 + pad, L / 2 + pad)
    var h = L / 2, b = B / 2
    function hull (hh, bb) {
      x.beginPath(); x.moveTo(0, -hh); x.quadraticCurveTo(bb * 1.05, -hh * 0.6, bb, -hh * 0.2); x.lineTo(bb, hh * 0.8)
      x.quadraticCurveTo(bb, hh, 0, hh); x.quadraticCurveTo(-bb, hh, -bb, hh * 0.8); x.lineTo(-bb, -hh * 0.2); x.quadraticCurveTo(-bb * 1.05, -hh * 0.6, 0, -hh); x.closePath()
    }
    x.fillStyle = '#15191f'; hull(h, b); x.fill()
    x.fillStyle = '#c99a62'; hull(h * 0.93, b * 0.8); x.fill()
    x.strokeStyle = 'rgba(110,70,30,.45)'; x.lineWidth = 0.5
    for (var pl = -b * 0.6; pl <= b * 0.61; pl += b * 0.3) { x.beginPath(); x.moveTo(pl, -h * 0.8); x.lineTo(pl, h * 0.85); x.stroke() }
    x.fillStyle = '#f4f1e8'; x.beginPath(); x.rect(-b * 0.66, -h * 0.5, b * 1.32, h * 1.12); x.fill()
    x.fillStyle = '#e2ddd0'; x.fillRect(-b * 0.5, -h * 0.46, b, h * 1.04)
    x.fillStyle = '#3a4a66'; for (var wdw = 0; wdw < 9; wdw++) { x.fillRect(-b * 0.62, -h * 0.44 + wdw * h * 0.115, b * 0.1, h * 0.05); x.fillRect(b * 0.52, -h * 0.44 + wdw * h * 0.115, b * 0.1, h * 0.05) }
    x.fillStyle = '#f4f1e8'; x.fillRect(-b * 0.5, -h * 0.62, b, h * 0.14)
    x.fillStyle = '#9fc7e8'; x.fillRect(-b * 0.4, -h * 0.6, b * 0.8, h * 0.035)
    for (var f = 0; f < 4; f++) {
      var y = -h * 0.36 + f * h * 0.235
      x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.ellipse(b * 0.12, y + b * 0.18, b * 0.36, b * 0.44, 0, 0, TAU); x.fill()
      x.fillStyle = '#e0a042'; x.beginPath(); x.ellipse(0, y, b * 0.36, b * 0.44, 0, 0, TAU); x.fill()
      x.fillStyle = '#16161a'; x.beginPath(); x.ellipse(0, y - b * 0.04, b * 0.24, b * 0.3, 0, 0, TAU); x.fill()
    }
    x.strokeStyle = '#5a3d22'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(0, -h * 0.9); x.lineTo(0, -h * 0.66); x.moveTo(0, h * 0.66); x.lineTo(0, h * 0.86); x.stroke()
    x.fillStyle = '#8a2a20'; x.fillRect(-b * 0.25, h * 0.9, b * 0.5, h * 0.04)
    return { c: c, w: B + pad * 2, h: L + pad * 2 }
  }

  /* ── mount ─────────────────────────────────────────────────────────────── */
  // Character Selection (owner 2026-09-28): with window.TKFleet loaded the child sails the ship they picked
  // (opts.ship, else the pick saved for this avatar, else the TKFleet picker opens first). opts.ship === false
  // or no TKFleet = the drawn liner / opts.art.ship, as before. "Ganti Kapal" (HUD / pause) re-opens the
  // picker and restarts the run with the new ship.
  function mount (host, level, opts) {
    if (!host) throw new Error('TKLanes.mount: host element required')
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
      if (P.inner.state().waiting) return            // a question card is open: finish it first
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
    level = level || {}
    injectCss()
    var fleet = shipId && W.TKFleet ? W.TKFleet.get(shipId) : null
    var hand = fleet ? W.TKFleet.handling(shipId) : null
    var diff = clamp(Math.round(num(opts.difficulty, num(level.difficulty, /1/.test(String(opts.grade || '')) ? 1 : 2))), 1, 3)
    var w = build(level, diff)
    var fin = w.final
    var SEA = W.TKSea || null
    var worldId0 = String(opts.world || level.world || 'titanic')
    // sea theme: opts > level > world (Nautilus deep sea, polar explorers) > night Titanic default
    var themeName = opts.theme || level.theme || (/nautilus|deep/.test(worldId0) ? 'deep' : /endurance|antar|polar/.test(worldId0) ? 'polar'
      : (level.night != null ? (level.night ? 'night' : 'day') : 'night'))
    var night = SEA ? (themeName === 'night' || themeName === 'deep') : (level.night != null ? !!level.night : true)
    var reduced = !!opts.reducedMotion
    if (opts.reducedMotion == null) { try { reduced = !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches) } catch (e) {} }
    var world = opts.world || level.world || 'titanic'
    var tutor = opts.tutorial != null ? !!opts.tutorial : level.tutorial !== false
    function lib (k) {
      try { if (typeof opts.lib === 'function') { var u = opts.lib(k); if (u) return u } } catch (e) {}
      if (W.TKArt && W.TKArt.lib) return W.TKArt.lib(k)
      return (W.AssetIndex && W.AssetIndex.path(k)) || (BASE + 'assets/db/lib/' + k + '.webp')
    }

    if (getComputedStyle(host).position === 'static') host.style.position = 'relative'
    var root = el('div', 'tkl-root' + (reduced ? ' tkl-rm' : '') + (fin ? ' tkl-final' : '') + (SEA ? ' tkl-sea' : ''))
    var cv = el('canvas', 'tkl-cv'), ctx = cv.getContext('2d')
    root.appendChild(cv)
    // HUD — mockup "Navigation Challenge": objective, Waktu / Skor / Gunung es dihindari, radar, lever, controls
    var tl = el('div', 'tkl-tl')
    var obj = el('div', 'tkl-obj tkl-panel', '<b></b><span></span>')
    obj.querySelector('b').textContent = level.title || (fin ? 'Malam di Samudra Atlantik' : 'Tantangan Navigasi')
    obj.querySelector('span').textContent = level.goal || 'Kemudikan kapal dan hindari gunung es!'
    tl.appendChild(obj)
    var stats = el('div', 'tkl-stats'), route = null
    var ICONS = { 'Waktu': 'tk-key/compass', 'Skor': 'tk-ui/anchor-coin', 'Gunung es dihindari': 'tk-prop/iceberg-5' }
    function stat (label, cls) {
      var s
      if (SEA && ICONS[label]) s = SEA.chip(lib(ICONS[label]), label, 'tkl-stat tkl-panel' + (cls ? ' ' + cls : ''))
      else { s = el('div', 'tkl-stat tkl-panel' + (cls ? ' ' + cls : ''), '<small></small><b></b>'); s.querySelector('small').textContent = label }
      stats.appendChild(s); return s
    }
    if (SEA) {
      route = SEA.routeBar({ ship: fleet ? W.TKFleet.sideSrc(shipId, opts) : null, text: '', label: 'Perjalanan ke tujuan', cls: 'tkl-route tkl-panel' })
      tl.appendChild(route.el)
    }
    var stTime = stat('Waktu'), stScore = stat('Skor'), stIce = stat('Gunung es dihindari'), stDist = stat('Jarak', 'is-warn')
    stDist.hidden = true
    tl.appendChild(stats)
    root.appendChild(tl)
    var tr = el('div', 'tkl-tr')
    var radar = el('canvas', 'tkl-radar'), rctx = radar.getContext('2d')
    radar.setAttribute('aria-hidden', 'true')
    var pauseBtn = el('button', 'tkl-btn tkl-pausebtn', '<i></i>')
    pauseBtn.type = 'button'; pauseBtn.setAttribute('aria-label', 'Jeda')
    var shipBtn = null, toprow = el('div', 'tkl-toprow')
    if (fleet && onSwap) {
      shipBtn = el('button', 'tkl-btn tkl-shipbtn', '<img alt="" draggable="false">')
      shipBtn.type = 'button'; shipBtn.setAttribute('aria-label', 'Ganti Kapal')
      shipBtn.querySelector('img').src = W.TKFleet.sideSrc(shipId, opts)
      shipBtn.addEventListener('click', function () { onSwap() })
      toprow.appendChild(shipBtn)
    }
    toprow.appendChild(pauseBtn)
    tr.appendChild(radar); tr.appendChild(toprow)
    root.appendChild(tr)
    var ctrl = el('div', 'tkl-ctrl')
    var bL = el('button', 'tkl-btn tkl-turn tkl-left', '<i class="tkl-arw tkl-arw-l"></i>')
    var bB = el('button', 'tkl-btn tkl-boost', '<i class="tkl-up"></i><img alt="" draggable="false"><span>Cepat</span>')
    var bR = el('button', 'tkl-btn tkl-turn tkl-right', '<i class="tkl-arw tkl-arw-r"></i>')
    bL.type = bB.type = bR.type = 'button'
    bL.setAttribute('aria-label', 'Pindah ke kiri'); bR.setAttribute('aria-label', 'Pindah ke kanan'); bB.setAttribute('aria-label', 'Lurus dan cepat')
    bB.querySelector('img').src = lib('tk-key/ship-wheel')
    ctrl.appendChild(bL); ctrl.appendChild(bB); ctrl.appendChild(bR)
    root.appendChild(ctrl)
    var lever = el('div', 'tkl-lever tkl-panel', '<small>Kecepatan</small>')
    // "Normal", not "Penuh": the wheel's "Cepat" boost goes faster than the lever's top speed (playtest 2026-09-29)
    var LV = [['Normal', 1], ['Sedang', 0.78], ['Pelan', 0.6]], lvBtns = []
    LV.forEach(function (d, i) { var b = el('button', 'tkl-btn tkl-lv' + (i === 0 ? ' is-on' : '')); b.type = 'button'; b.textContent = d[0]; lever.appendChild(b); lvBtns.push(b) })
    root.appendChild(lever)
    var banner = el('div', 'tkl-banner tkl-panel', '<b></b><span></span>')
    root.appendChild(banner)
    var warn = el('div', 'tkl-warn', '<i class="tkl-tri"></i><span>Tidak ada jalur aman</span>')
    warn.setAttribute('role', 'status')
    root.appendChild(warn)
    var cap = el('div', 'tkl-cap', '<img alt="Kapten" draggable="false"><div class="tkl-bub"><b>Kapten</b><span></span></div>')
    // owner rule: the captain is the old human captain (the penguin is only his assistant)
    cap.querySelector('img').src = lib('tk-char/captain-old')
    cap.setAttribute('role', 'status')
    root.appendChild(cap)
    var hint = el('div', 'tkl-hint')
    root.appendChild(hint)
    var pops = el('div', 'tkl-pops')
    root.appendChild(pops)
    var pauseOv = el('div', 'tkl-pause', '<div class="tkl-pause-card tkl-panel"><h3>Jeda</h3><button class="tkl-btn tkl-resume" type="button">Lanjut</button></div>')
    root.appendChild(pauseOv)
    if (fleet && onSwap) {
      var swapBtn = el('button', 'tkl-btn tkl-swap', '<img alt="" draggable="false"><span>Ganti Kapal</span>')
      swapBtn.type = 'button'; swapBtn.querySelector('img').src = W.TKFleet.sideSrc(shipId, opts)
      swapBtn.addEventListener('click', function () { onSwap() })
      pauseOv.querySelector('.tkl-pause-card').appendChild(swapBtn)
    }
    host.appendChild(root)

    // sprites
    function loadImg (url) { if (!url) return null; var im = new Image(); im.decoding = 'async'; im.onerror = function () { im._bad = true }; im.src = url; return im }
    function ready (im) { return im && !im._bad && im.complete && im.naturalWidth > 0 }
    var QC = qconf(level)
    var IMG = { star: loadImg(lib('tk-ui/star')), token: loadImg(lib('tk-key/compass')), buoy: loadImg(lib('tk-prop/buoy-light')),
      chest: loadImg(lib('game/treasure-chest')), house: loadImg(lib('gt-el/lighthouse')),
      'tk-prop/barrel': loadImg(lib('tk-prop/barrel')), 'tk-prop/crate-titanic': loadImg(lib('tk-prop/crate-titanic')) }
    var shipImg = null
    try {
      if (fleet) shipImg = loadImg(W.TKFleet.topSrc(shipId, opts))
      else if (opts.art && opts.art.ship) shipImg = loadImg(opts.art.ship)
    } catch (e) {}
    // drawn length of the sprite: a fleet ship keeps its own size class (a tug is small, a liner long)
    var ART_L = hand ? Math.round(clamp(hand.len * 1.3, 104, 140)) : SHIP_L * 1.06
    var HIT_L = hand ? Math.min(SHIP_L, ART_L) : SHIP_L      // a short ship has a short hitbox (forgiving)
    var SPR = { berg: [], floe: [], big: [], fated: null, ship: null }
    for (var si = 0; si < 6; si++) { SPR.berg.push(iceSprite(11 + si * 7, 90, 16, night)); SPR.floe.push(floeSprite(51 + si * 5, 90, night)) }
    for (var sb = 0; sb < 3; sb++) SPR.big.push(iceSprite(97 + sb * 13, 110, 26, night))
    SPR.fated = iceSprite(211, 110, 30, night)
    // polish: layered bergs (shelf, rim) / reef rocks in the deep sea, buoys, lighthouse posts, dressing
    var SS = SEA ? SEA.sprites(themeName) : null
    if (SS) { SPR.berg = SS.berg; SPR.big = SS.big; SPR.fated = SS.fated }
    var DIMG = SEA ? { barrel: IMG['tk-prop/barrel'], light: loadImg(lib('tk-world/lighthouse-island')) } : null
    var confetti = SEA ? SEA.Confetti() : null, vigGrad = null
    SPR.ship = shipSprite(SHIP_L, SHIP_B, 3)

    // state
    var V0 = SPEED[diff - 1] * num(level.speed, 1)
    var S = {
      d: -40, x: 0, lane: 1, lx0: 0, lt: 9, ldur: LANE_DUR, vx: 0, head: 0, v: V0 * 0.7, throttle: 1, boostT: 0, boostCd: 0,
      t: 0, score: 0, avoided: 0, collisions: 0, correct: 0, tries: 0, hints: 0, tokens: 0, stars: 0, pen: 0,
      phase: 'player', impact: null, waiting: false, inv: 0, shake: 0, shakeT: 0, zoom: 1, sec: -1, done: false, finishing: 0,
      firstMove: false, hintT: 0, tut: 0, tutGap: 1.2, boosted: false, ease: 0, nudge: 0, lastIn: 0, frames: 0, warn: false, capT: -1, cine: 0, impactT: 0, bumpT: 0, rollS: 0,
      // embedded questions: which one is open, how many of each were asked, cooldown, rewards
      qOpen: null, qn: { collide: 0, buoy: 0, gate: 0 }, qAsked: 0, qRight: 0, qLog: [], lastColQ: -99, shield: false, easeT: 1, qCombo: 0, bonus: 0, bumps: 0, rewardBoost: 0
    }
    var trail = [], parts = [], pending = null
    var vw = 0, vh = 0, dpr = 1, pr = 1, rq = 1, scale = 1, shipY = 0, camX = 0, bgGrad = null, hazeGrad = null, ema = 1 / 60, slowT = 0
    var raf = 0, last = 0, paused = false, dead = false, doneSent = false, hudT = 0, radarT = 0, lastHud = {}
    var audio = makeAudio(opts)
    var timers = []
    // every pending timeout is tracked for destroy(); a fired one removes itself (the list never grows)
    function later (fn, ms) {
      var t = setTimeout(function () { var i = timers.indexOf(t); if (i >= 0) timers.splice(i, 1); if (!dead) fn() }, ms)
      timers.push(t); return t
    }

    /* sizing */
    function resize () {
      if (dead) return
      var r = host.getBoundingClientRect()
      vw = Math.max(1, Math.round(r.width)); vh = Math.max(1, Math.round(r.height))
      dpr = Math.min(W.devicePixelRatio || 1, 2)
      backing()
      var port = vh > vw, short = !port && vh < 500
      wideMode = !port && !short && vw >= 900
      root.classList.toggle('tkl-port', port)
      root.classList.toggle('tkl-short', short)
      root.classList.toggle('tkl-wide', wideMode)
      root.classList.toggle('tkx-compact', short || vw < 600)
      root.classList.toggle('tkl-narrow', vw < 600)
      shipY = vh * (short ? 0.68 : port ? 0.72 : wideMode ? 0.66 : 0.7)
      scale = computeScale(short)
      layoutControls(port, short)
      if (seaP) { var kk = scale * dpr; seaP.prewarm(ctx, [kk, kk * 0.8, kk * 0.6, kk * 0.4, kk * 0.86 * 0.4, kk * 0.86 * 0.6, kk * 0.86]) }   // the quality steps 1 / 0.8 / 0.6 / 0.4
      if (route) route.size()
      bgGrad = ctx.createLinearGradient(0, 0, 0, vh)
      if (SEA) {
        var th = SEA.theme(themeName)
        bgGrad.addColorStop(0, th.bot); bgGrad.addColorStop(0.5, th.mid); bgGrad.addColorStop(1, th.top)
        hazeGrad = ctx.createLinearGradient(0, 0, 0, vh * 0.32)
        hazeGrad.addColorStop(0, th.haze + '.75)'); hazeGrad.addColorStop(1, th.haze + '0)')
        vigGrad = SEA.vignette(ctx, vw, vh, themeName)
      } else {
        if (night) { bgGrad.addColorStop(0, '#081a36'); bgGrad.addColorStop(0.55, '#0d2f58'); bgGrad.addColorStop(1, '#134a78') } else { bgGrad.addColorStop(0, '#1d6fa3'); bgGrad.addColorStop(1, '#2d93c4') }
        hazeGrad = ctx.createLinearGradient(0, 0, 0, vh * 0.3)
        hazeGrad.addColorStop(0, night ? 'rgba(6,16,36,.6)' : 'rgba(170,220,245,.5)'); hazeGrad.addColorStop(1, 'rgba(6,16,36,0)')
      }
      var showLever = opts.lever != null ? !!opts.lever : (!port && vh >= 560)
      lever.style.display = showLever ? '' : 'none'
      leverOn = showLever
      if (showLever) { placeLever(); later(placeLever, 400); later(placeLever, 1500) }
      var rs = radar.getBoundingClientRect().width || 100
      radar.width = Math.round(rs * dpr); radar.height = Math.round(rs * dpr)
      radarT = 0
      if (!raf) render()
    }
    // the speed lever sits under the HUD column (it covered the "Gunung es dihindari" chip on a tablet, playtest
    // 2026-09-29) and above the LEFT button; where it does not fit between them it stays hidden
    var leverOn = false
    function placeLever () {
      if (dead || !leverOn) return
      lever.style.display = ''
      if (!wideMode) { lever.style.top = ''; lever.style.transform = ''; return }
      var rr = root.getBoundingClientRect(), tb = tl.getBoundingClientRect().bottom - rr.top + 10
      var lb = bL.getBoundingClientRect().top - rr.top - 10, h = lever.offsetHeight
      if (tb + h > lb) { lever.style.display = 'none'; return }
      lever.style.top = Math.round(Math.max(tb, Math.min((vh - h) / 2, lb - h))) + 'px'; lever.style.transform = 'none'
    }
    /* controls: owner 2026-09-28 — the LEFT / RIGHT buttons and the wheel (Cepat) are 2x their old size
       (turn 88 px, 80 on a short screen; wheel 104, 88 short), in the bottom corners for two thumbs. When the
       row does not fit (a phone upright) the wheel rides above the RIGHT button; on a phone on its side it sits
       next to it. Then the ship is lifted above any control sharing its lanes on screen. */
    var OLD = null, ctrlSz = { turn: 0, boost: 0, k: 2 }
    // half-width of the screen strip the ship can use: edge lane (camera follows 45%), half the beam, and the
    // bow swinging out while it turns into a lane change (heading up to ~0.5 rad)
    function shipBand () { return (LANE * 0.55 + ART_L * 0.25 + 14) * scale + 16 }
    function layoutControls (port, short) {
      OLD = { turn: short ? 80 : 88, boost: short ? 88 : 104 }
      var turn = OLD.turn * 2, boost = OLD.boost * 2
      var row = turn * 2 + boost + 28 + 24
      bB.classList.toggle('is-up', (port && row > vw) || wideMode)
      root.classList.toggle('tkl-upw', port && row > vw)
      if (short) {
        // side-on phone: LEFT ... [wheel][RIGHT] — the wheel must end before the ship's lanes
        var band = shipBand()
        boost = Math.min(boost, vw / 2 - band - 14 - turn - 10)
      }
      boost = Math.max(Math.round(boost), Math.round(OLD.boost * 1.5))
      if (!short) {
        // narrow phones (360 wide): two 2x buttons must still fit side by side with a gap
        turn = Math.min(turn, Math.floor((vw - 28 - 10) / 2))
        // short uprights (360x640): the column under the HUD must leave room for the ship — shrink together
        var tlB = tl.getBoundingClientRect().bottom - root.getBoundingClientRect().top
        var need = turn + 10 + (bB.classList.contains('is-up') ? boost : 0), avail = vh - tlB - (ART_L * scale + 50) - 12
        if (port && need > avail && avail > 0) {
          var f0 = Math.max(0.3, avail / need)
          turn = Math.max(96, Math.round(turn * f0)); if (bB.classList.contains('is-up')) boost = Math.max(110, Math.round(avail - 10 - turn))
        }
      }
      ctrlSz = { turn: turn, boost: boost, k: Math.min(turn / OLD.turn, boost / OLD.boost) }
      root.style.setProperty('--tkl-turn', turn + 'px'); root.style.setProperty('--tkl-boost', boost + 'px')
      root.style.setProperty('--tkl-k', String(ctrlSz.k))
      var rr = root.getBoundingClientRect(), halfL = ART_L * 0.5 * scale
      var bw = shipBand(), x0 = vw / 2 - bw, x1 = vw / 2 + bw
      var lim = vh, ctop = vh
      ;[bL, bR, bB].forEach(function (e) {
        var b = e.getBoundingClientRect(); if (!b.width) return
        ctop = Math.min(ctop, b.top - rr.top)
        if (b.right - rr.left > x0 && b.left - rr.left < x1) lim = Math.min(lim, b.top - rr.top)
      })
      var want = lim - halfL - 14
      if (want < shipY) {
        shipY = Math.max(vh * 0.36, want)
        scale = computeScale(short)
        halfL = ART_L * 0.5 * scale
        shipY = Math.max(vh * 0.36, Math.min(shipY, lim - halfL - 14))
      }
      root.style.setProperty('--tkl-ctrlh', Math.round(vh - ctop + 12) + 'px')
    }
    /* round 3 (owner): on a landscape tablet the three lanes used ~30% of the width. There the corridor
       (outer buoy lines) now fills ~57% of the width and everything in it — ship, ice, stars, buoys — scales
       with it (~1.7x). A stronger perspective keeps ~620 units of sea visible ahead (as before) so obstacles still show
       early. Portrait and phones keep the old framing. */
    var PKv = PK, wideMode = false
    function computeScale (short) {
      if (wideMode) {
        var sc = clamp(0.57 * vw / (2 * (LANE * 1.5 + 18)), 0.45, 2.6), u = shipY / sc
        PKv = Math.max(PK, (1 - u / 620) / u)      // ~620 units ahead, as the old framing showed (the final run times its warning on it)
        return sc
      }
      PKv = PK
      return clamp(Math.min(vw / (LANE * 3 + 90), shipY / (short ? 340 : 440)), 0.45, 1.7)
    }
    function backing () { pr = dpr * rq; cv.width = Math.max(1, Math.round(vw * pr)); cv.height = Math.max(1, Math.round(vh * pr)) }
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

    /* projection: world (x lateral, z forward) -> screen; constant-x lines stay straight (true perspective) */
    var PX = 0, PY = 0, PS = 1
    function proj (x, z) {
      var a = Math.max(z - S.d, -600), f = 1 / (1 + a * PKv), s = scale * S.zoom
      PS = s * f; PY = shipY - a * s * f; PX = vw / 2 + (x - camX) * PS
    }
    function aheadMax () { var u = shipY / (scale * S.zoom); return u * PKv < 0.92 ? u / (1 - u * PKv) : 5000 }
    function behindMin () { var m = (vh - shipY) / (scale * S.zoom); return -m / (1 + m * PKv) }

    // the ship's screen box (axis-aligned around the rolled hull) — for the QA no-overlap check
    function shipRect () {
      proj(S.x, S.d)
      var k = PS, hl = ART_L * 0.5 * k, hb = (ready(shipImg) ? ART_L * 0.5 * shipImg.naturalWidth / shipImg.naturalHeight : SHIP_B * 0.6) * k
      var c = Math.abs(Math.cos(S.head)), sn = Math.abs(Math.sin(S.head))
      var ex = hb * c + hl * sn, ey = hl * c + hb * sn
      return { left: PX - ex, top: PY - ey, right: PX + ex, bottom: PY + ey }
    }
    /* input */
    function laneTo (dir, auto) {
      if (S.waiting || S.done) return false
      if (!auto && (S.phase === 'cinematic' || S.phase === 'impact')) return false
      var nl = clamp(S.lane + dir, 0, 2)
      if (nl === S.lane) { S.nudge = dir * 0.25; audio.tick(); return false }
      S.lane = nl; S.lx0 = S.x; S.lt = 0
      S.ldur = S.phase === 'assisted' && !auto ? LANE_DUR * 1.6 : LANE_DUR
      if (!auto) { S.lastIn = S.t; S.firstMove = true; if (S.hintT > 0) S.hintT = Math.min(S.hintT, 0.4) }
      audio.whoosh(false)
      return true
    }
    function boost () {
      if (S.waiting || S.done || S.phase !== 'player') return false
      S.lastIn = S.t
      if (S.boostCd > 0) { audio.tick(); return false }
      S.boostT = 1.5; S.boostCd = 3.2; S.boosted = true
      bB.classList.add('is-on'); audio.whoosh(true)
      return true
    }
    function press (btn, fn) {
      btn.addEventListener('pointerdown', function (e) {
        if (e.cancelable) e.preventDefault()
        unlock(); btn.classList.add('is-on'); fn()
        setTimeout(function () { if (btn !== bB || S.boostT <= 0) btn.classList.remove('is-on') }, 140)
      })
      btn.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); fn() } })
      btn.addEventListener('contextmenu', function (e) { e.preventDefault() })
    }
    press(bL, function () { laneTo(-1) })
    press(bR, function () { laneTo(1) })
    press(bB, boost)
    lvBtns.forEach(function (b, i) {
      b.addEventListener('click', function () { if (S.phase !== 'player') return; S.throttle = LV[i][1]; lvBtns.forEach(function (x, j) { x.classList.toggle('is-on', j === i) }); audio.tick() })
    })
    // swipe (left / right / up) or a tap on the left / right third of the sea
    var sw = null
    cv.addEventListener('pointerdown', function (e) { unlock(); sw = { x: e.clientX, y: e.clientY, t: performance.now(), used: false } })
    cv.addEventListener('pointermove', function (e) {
      if (!sw || sw.used) return
      var dx = e.clientX - sw.x, dy = e.clientY - sw.y
      if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy)) { sw.used = true; laneTo(dx > 0 ? 1 : -1) } else if (dy < -46 && Math.abs(dy) > Math.abs(dx)) { sw.used = true; boost() }
    })
    cv.addEventListener('pointerup', function (e) {
      if (!sw) return
      if (!sw.used && performance.now() - sw.t < 300) {
        var rr = cv.getBoundingClientRect(), fx = (e.clientX - rr.left) / rr.width
        if (fx < 0.33) laneTo(-1); else if (fx > 0.67) laneTo(1)
      }
      sw = null
    })
    function onKey (e) {
      if (e.repeat) return
      var k = e.key
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') { laneTo(-1); e.preventDefault() } else if (k === 'ArrowRight' || k === 'd' || k === 'D') { laneTo(1); e.preventDefault() } else if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === ' ') { boost(); e.preventDefault() }
      unlock()
    }
    W.addEventListener('keydown', onKey)
    pauseBtn.addEventListener('click', function () { handle.pause() })
    pauseOv.querySelector('.tkl-resume').addEventListener('click', function () { handle.resume() })
    var hornDone = false
    function unlock () {
      audio.ensure()
      if (audio.ctx && audio.ctx.state === 'running') { audio.startBed(); if (!hornDone) { hornDone = true; audio.horn() } }
    }
    function onVis () { if (D.hidden) { stop(); audio.suspend() } else if (!paused && !S.waiting) { audio.ensure(); start() } }
    D.addEventListener('visibilitychange', onVis)

    /* feedback */
    function pop (text, x, z, big) {
      var e = el('div', 'tkl-pop' + (big ? ' is-big' : '') + (SEA ? ' tkx-pop' : ''))
      e.textContent = text
      if (big) { e.style.left = '50%'; e.style.top = (vh * 0.42) + 'px' } else { proj(x, z); e.style.left = PX + 'px'; e.style.top = PY + 'px' }
      pops.appendChild(e)
      later(function () { if (e.parentNode) e.parentNode.removeChild(e) }, big ? 1900 : 1100)
    }
    function sparkleAt (x, z, n) {
      if (reduced) return
      for (var i = 0; i < n && parts.length < 140; i++) {
        var a = Math.random() * TAU, s = 40 + Math.random() * 80
        parts.push({ x: x, z: z, vx: Math.cos(a) * s, vz: Math.sin(a) * s, h: 10, vh: 60 + Math.random() * 80, life: 0.5 + Math.random() * 0.5, age: 0, gold: true })
      }
    }
    function spray (x, z, n, spd, kind) {
      if (reduced) return
      for (var i = 0; i < n && parts.length < 120; i++) {
        var a = Math.random() * TAU, s = spd * (0.4 + Math.random() * 0.8)
        parts.push({ x: x, z: z, vx: Math.cos(a) * s, vz: Math.sin(a) * s * 0.7 + 20, h: 0, vh: 40 + Math.random() * 90, life: 0.7 + Math.random() * 0.6, age: 0, ice: kind === 'ice' && Math.random() < 0.45 })
      }
    }
    var bannerT = 0
    function showBanner (title, sub) {
      banner.querySelector('b').textContent = title; banner.querySelector('span').textContent = sub || ''
      banner.classList.add('is-on'); bannerT = 2.4
    }
    function say (text) { cap.querySelector('span').textContent = text; cap.classList.add('is-on') }

    /* ── simulation ── */
    function laneFreeAt (l, z0, z1, also) {
      var x = laneX(l)
      for (var i = 0; i < w.objs.length; i++) {
        var o = w.objs[i]
        if (!o.ice && o.type !== 'debris') continue
        if ((o.hit && o !== also) || (o.extra && o.off)) continue
        var zs = o.type === 'wall' ? o.z : o.z - o.r, ze = o.type === 'wall' ? o.z + o.len : o.z + o.r
        if (ze < z0 || zs > z1) continue
        var hw = o.type === 'wall' ? o.hw : o.r * 0.85
        if (Math.abs(o.x - x) < hw + SHIP_HW + 8) return false
      }
      return true
    }
    // the lane the director keeps open for the next obstacle row (QA autopilot + assisted mode)
    function safeLane () {
      var bow = S.d + SHIP_L / 2
      for (var i = 0; i < w.rows.length; i++) { var r = w.rows[i]; if (r.end + 40 >= bow - SHIP_L) return r.lane }
      return S.lane
    }
    function hitTest (o) {
      var bz0 = S.d - HIT_L / 2 + 6, bz1 = S.d + HIT_L / 2 - 2
      if (o.type === 'wall') return Math.abs(o.x - S.x) < o.hw + SHIP_HW - 4 && bz1 > o.z + 8 && bz0 < o.z + o.len - 8
      var rr = o.r * (o.type === 'debris' ? 0.9 : 0.8)
      var cz = clamp(o.z, bz0, bz1), cx = clamp(o.x, S.x - SHIP_HW, S.x + SHIP_HW)
      var dx = o.x - cx, dz = o.z - cz
      return dx * dx + dz * dz < rr * rr
    }
    function step (dt) {
      S.t += dt
      var sec = currentSection()
      // lateral: a delayed, eased slide (big-ship feel) that always completes within LANE_DUR
      var tx = laneX(S.lane), px = S.x
      S.lt += dt
      var p = clamp((S.lt - 0.05) / Math.max(0.1, S.ldur - 0.05), 0, 1)
      S.x = S.lx0 + (tx - S.lx0) * easeIO(p)
      if (p >= 1) S.x = tx
      S.nudge *= Math.exp(-dt * 7)
      S.vx = dt > 0 ? (S.x - px) / dt : 0
      var want = Math.atan2(S.vx, Math.max(60, S.v)) * 1.35 + S.nudge
      if (S.phase === 'cinematic' || S.phase === 'impact') want = S.cine * -0.2
      S.head += (clamp(want, -0.5, 0.5) - S.head) * (1 - Math.exp(-dt * 10))
      S.rollS += (clamp(S.vx / 260, -1, 1) - S.rollS) * (1 - Math.exp(-dt * 8))
      // speed
      S.boostT = Math.max(0, S.boostT - dt); S.boostCd = Math.max(0, S.boostCd - dt)
      if (S.boostT <= 0) bB.classList.remove('is-on')
      bB.classList.toggle('is-cool', S.boostCd > 0 && S.boostT <= 0)
      var vt = V0 * S.throttle * (S.boostT > 0 ? 1.55 : 1)
      if (S.phase === 'assisted') vt = V0 * 0.8
      if (S.phase === 'cinematic') vt = V0 * 0.62
      // a collision always stops the ship for its question, even during the level-end run-out
      if (S.impact || S.phase === 'impact') vt = 0
      else if (S.finishing) vt = V0 * 0.7
      if (S.bumpT > 0) { S.bumpT -= dt; vt *= 0.55 }
      // after a question the ship eases back up to speed (never a jump)
      if (S.easeT < 1) { S.easeT = Math.min(1, S.easeT + dt / 1.2); vt *= 0.2 + 0.8 * easeIO(S.easeT) }
      if (S.rewardBoost > 0) S.rewardBoost = Math.max(0, S.rewardBoost - dt)
      var acc = S.impact ? 420 : S.boostT > 0 ? 260 : 110
      if (S.phase === 'impact') acc = 190
      S.v += clamp(vt - S.v, -acc * dt, acc * dt)
      S.d += S.v * dt
      S.inv = Math.max(0, S.inv - dt)
      // trail for the curved wake
      if (!trail.length || S.d - trail[0].z > 14) { trail.unshift({ x: S.x, z: S.d - SHIP_L * 0.46, a: S.head, age: 0, b: S.boostT > 0 ? 1 : 0 }); if (trail.length > 46) trail.pop() }
      for (var ti = 0; ti < trail.length; ti++) trail[ti].age += dt
      // particles
      for (var pi = parts.length - 1; pi >= 0; pi--) {
        var q = parts[pi]; q.age += dt
        if (q.age >= q.life) { parts.splice(pi, 1); continue }
        q.x += q.vx * dt; q.z += q.vz * dt; q.vh -= 260 * dt; q.h = Math.max(0, q.h + q.vh * dt)
      }
      if (S.shake > 0) { S.shake = Math.max(0, S.shake - dt * 14); S.shakeT += dt }
      // camera: follow the ship a little; cinematic push toward the bow
      camX += (S.x * 0.45 - camX) * (1 - Math.exp(-dt * 3))
      var zt = (S.phase === 'cinematic' || S.phase === 'impact') && !reduced ? (vh < 500 && vw > vh ? 1.1 : 1.22) : (S.finishing && !reduced ? 0.86 : 1)
      S.zoom += (zt - S.zoom) * (1 - Math.exp(-dt * 0.9))
      // sections
      if (sec !== S.sec) {
        S.sec = sec
        var sc = w.sections[sec]
        if (sc) { (S.seen || (S.seen = [])).push(sc.kind); showBanner(sc.title, sc.sub); if (sc.kind === 'corridor') beginAssist() }
      }
      if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) banner.classList.remove('is-on') }
      tutorTick(dt)
      // adaptive: after two collisions the optional second obstacles of rows not yet in view are removed
      if (S.collisions >= 2 && !S.ease) {
        S.ease = 1
        var far = S.d + aheadMax() + 100
        for (var ei = 0; ei < w.objs.length; ei++) if (w.objs[ei].extra && w.objs[ei].z > far) w.objs[ei].off = true
      }
      if (fin) finalTick(dt)
      if (S.phase === 'impact') { impactTick(dt); return }
      objectsTick(dt)
      if (S.impact) {
        S.impact.t += dt
        if (S.impact.t > (reduced ? 0.5 : 0.85) && !S.waiting) ask('collide', S.impact.obj)
      }
      if (!fin && !S.finishing && S.d >= w.zEnd - 60) beginFinish()
      if (S.finishing && !S.impact && !S.waiting) { S.finishing += dt; if (S.finishing > 1.6) send() }
    }
    // first seconds: LEFT / RIGHT pulse, ghost arrows slide out of the ship, the line is read aloud;
    // after the first lane change the wheel (Cepat) gets the same treatment once. No reading needed.
    function tutorOn (stage, text, btns) {
      S.tut = stage; S.hintT = stage === 1 ? 7 : 4
      hint.textContent = text; hint.classList.add('is-on')
      tutBtns = btns; btns.forEach(function (b) { b.classList.add('is-demo') })
      narrate(text)
    }
    function tutorOff () {
      hint.classList.remove('is-on'); tutBtns.forEach(function (b) { b.classList.remove('is-demo') }); tutBtns = []
      S.tut = S.tut === 1 ? -1 : -2; S.hintT = 0; S.tutGap = 1.2
    }
    var tutBtns = []
    function tutorTick (dt) {
      if (!tutor || S.phase !== 'player' || S.impact) { if (S.tut > 0) tutorOff(); return }
      if (S.tut === 0 && S.t > 0.5) { if (S.firstMove) S.tut = -1; else tutorOn(1, 'Ketuk kiri atau kanan untuk pindah jalur', [bL, bR]) }
      else if (S.tut === 1 && (S.firstMove || (S.hintT -= dt) <= 0)) { tutorOff(); if (!S.firstMove) { S.tut = 0; S.t2 = (S.t2 || 0) + 1; if (S.t2 >= 2) S.tut = -1 } }
      else if (S.tut === -1 && S.firstMove && !S.boosted && (S.tutGap -= dt) <= 0) tutorOn(2, 'Ketuk roda kemudi untuk melaju cepat', [bB])
      else if (S.tut === 2 && (S.boosted || (S.hintT -= dt) <= 0)) tutorOff()
    }
    function narrate (text) { try { if (opts.narrate !== false && W.TKHub && typeof W.TKHub.say === 'function') W.TKHub.say(text) } catch (e) {} }
    function currentSection () {
      for (var i = w.sections.length - 1; i >= 0; i--) if (S.d + 80 >= w.sections[i].z0) return i
      return 0
    }
    function objectsTick (dt) {
      var bowBack = S.d - SHIP_L / 2
      for (var i = 0; i < w.objs.length; i++) {
        var o = w.objs[i]
        if (o.z - 200 > S.d + SHIP_L) break
        if (o.off) continue
        if (o.type === 'qbuoy') { if (qbuoyTick(o, dt)) return; continue }
        if (o.type === 'lgate') { if (lgateTick(o, dt)) return; continue }
        var endZ = o.type === 'wall' ? o.z + o.len : o.z + (o.r || 0)
        if (o.hit) { o.fade = Math.min(1, (o.fade || 0) + dt * 1.2); o.x += (o.x >= 0 ? 1 : -1) * dt * 30; continue }
        if (o.type === 'gate') { if (!o.passed && S.d > o.z) { o.passed = true; S.score += 5; pop('Pos aman +5', 0, o.z + 60) } continue }
        if (o.type === 'star' || o.type === 'token') {
          // magnet: a star close ahead drifts toward the ship (forgiving pickups)
          var ahead = o.z - S.d
          if (!o.taken && SEA && ahead > -20 && ahead < 240 && Math.abs(o.x - S.x) < 150) o.x += (S.x - o.x) * Math.min(1, dt * (ahead < 120 ? 6 : 2.5))
          if (!o.taken && Math.abs(o.x - S.x) < 44 && Math.abs(o.z - S.d - 20) < SHIP_L / 2 + 18) {
            o.taken = true
            S.combo = S.t - (S.lastStarT || -9) < 1.6 ? (S.combo || 1) + 1 : 1
            S.lastStarT = S.t
            if (o.type === 'star') { S.stars++; S.score += 10; pop(S.combo >= 3 ? 'Kombo x' + S.combo + '!' : '+10', o.x, o.z) } else { S.tokens++; S.score += 25; pop('Kompas +25', o.x, o.z) }
            if (SEA) sparkleAt(o.x, o.z, 10 + Math.min(12, S.combo * 3))
            audio.chime(false)
          }
          continue
        }
        if (!o.passed && endZ < bowBack - 4) {
          o.passed = true
          if (o.ice && o.type !== 'floe') {
            S.avoided++; S.score += 5
            // a close shave: "Nyaris!"
            if (SEA && o.type !== 'wall' && Math.abs(o.x - S.x) < (o.r || 40) + 42 && S.t - (S.nyT || -9) > 2.5) { S.nyT = S.t; pop('Nyaris!', o.x, o.z) }
          }
          continue
        }
        if (o.passed || S.impact || S.inv > 0 || S.phase === 'cinematic') continue
        if (o.fated) continue
        if (hitTest(o)) {
          if (o.type === 'debris' || S.phase === 'assisted') { softBump(o); continue }
          collide(o)
        }
      }
    }
    function softBump (o) {
      o.hit = true; o.passed = true
      S.bumpT = 0.6
      spray(o.x, o.z, 10, 70, 'water'); audio.splash(0.8)
      if (!reduced) S.shake = Math.max(S.shake, 2.5)
    }
    // a Soal buoy / treasure chest: drifts toward a ship sailing close by; touching it asks a bonus question
    function qbuoyTick (o, dt) {
      if (o.taken || S.impact || S.phase !== 'player') return false
      var ahead = o.z - S.d
      if (ahead > -20 && ahead < 260 && Math.abs(o.x - S.x) < 150) o.x += (S.x - o.x) * Math.min(1, dt * (ahead < 120 ? 5 : 2))
      if (Math.abs(o.x - S.x) < 50 && Math.abs(ahead) < SHIP_L / 2 + 20) { o.taken = true; ask('buoy', o); return true }
      if (ahead < -SHIP_L) o.taken = o.passed = true
      return false
    }
    // a lighthouse gate: its chain stops the ship; a question drops the chain (a wrong answer drops it too)
    function lgateTick (o, dt) {
      var stopAt = o.z - SHIP_L / 2 - 26   // close: the chain sits right at the bow, clear of the HUD on a phone
      if (o.dropping && o.drop < 1) { o.drop = Math.min(1, o.drop + dt / (reduced ? 0.25 : 0.75)); if (o.drop >= 1) { o.open = true; o.passed = true } }
      if (!o.asked && !S.impact && S.d >= stopAt - 1) {
        o.asked = true; S.d = stopAt; S.v = 0
        ask('gate', o); return true
      }
      if (o.asked && o.drop < 0.55 && S.d > stopAt) { S.d = stopAt; S.v = 0 }
      return false
    }
    function sayBrief (text, ms) {
      say(text)
      var tok = S.capTok = (S.capTok || 0) + 1
      later(function () { if (S.capTok === tok && S.phase !== 'assisted' && S.phase !== 'cinematic') cap.classList.remove('is-on') }, ms || 2600)
    }
    function canAskCollide () { return !!QC.on.collide && S.qn.collide < QC.count && S.t - S.lastColQ >= Q_COOL }
    function collide (o) {
      if (S.shield) {
        // the shield bubble takes this bump: no slow-down, no question
        S.shield = false; o.hit = true; o.passed = true; S.inv = 1.2
        spray(o.x, o.z, 16, 90, 'ice'); sparkleAt(S.x, S.d, 16); audio.chime(false)
        pop('Perisai melindungi!', S.x, S.d + SHIP_L * 0.6)
        return
      }
      if (!canAskCollide()) { S.bumps++; softBump(o); pop('Pelan-pelan', S.x, S.d + SHIP_L * 0.6); return }
      S.qn.collide++; S.lastColQ = S.t
      o.hit = true; o.passed = true
      S.impact = { t: 0, obj: o }
      S.lastHit = o
      S.collisions++
      spray((o.x + S.x) / 2, S.d + SHIP_L / 2 - 6, 26, 110, 'ice')
      audio.rumble(1.0, 0.9); audio.splash(1.2)
      if (!reduced) S.shake = 6
    }
    var INTRO = { collide: 'Kapal membentur es! Jawab soal ini, lalu kapal berlayar lagi.',
      buoy: 'Pelampung Soal! Jawab dengan benar untuk bintang bonus.', chest: 'Peti Harta! Jawab dengan benar untuk harta bonus.',
      gate: 'Gerbang Mercusuar! Jawab soalnya, lalu rantai diturunkan.' }
    // the ONE question contract (collide / buoy / gate): the simulation freezes (rAF stopped, ship where it is),
    // opts.onQuestion({reason, topic, …}) -> Promise<{correct}>, then answered() resumes with an ease-in
    function ask (reason, obj) {
      S.waiting = true; S.qOpen = reason; S.qObj = obj || null
      banner.classList.remove('is-on'); bannerT = 0
      if (reason !== 'collide') S.qn[reason]++
      S.qAsked++
      render(); stop()
      var info = { reason: reason, topic: QC.topic, index: S.qAsked, collisions: S.collisions, world: world, grade: opts.grade, mastery: opts.mastery,
        kind: obj && obj.kind, intro: INTRO[obj && obj.kind === 'chest' ? 'chest' : reason] }
      var pr0
      try {
        if (typeof opts.onQuestion === 'function') pr0 = opts.onQuestion(info)
        else if (typeof opts.onChallenge === 'function') {
          var legacy = {}; for (var k in info) legacy[k] = info[k]
          legacy.reason = reason === 'collide' ? 'collision' : reason
          pr0 = opts.onChallenge(legacy)
        } else pr0 = defaultChallenge(info)
      } catch (e) { pr0 = null; if (W.console) console.error(e) }
      pending = pr0
      var fin0 = function (res) { if (pending !== pr0) return; pending = null; answered(reason, obj, res || { correct: true, tries: 1, hints: 0 }) }
      if (pr0 && typeof pr0.then === 'function') pr0.then(fin0, function () { fin0(null) })
      else fin0(pr0)
    }
    function answered (reason, obj, res) {
      if (dead) return
      var ok = !!res.correct
      S.qOpen = null; S.qObj = null
      S.qLog.push({ reason: reason, correct: ok, t: Math.round(S.t * 10) / 10 })
      if (ok) S.qRight++
      S.qCombo = ok ? S.qCombo + 1 : 0
      if (ok && S.qCombo >= 2) { S.score += 10 * S.qCombo; later(function () { pop('Kombo Pintar x' + S.qCombo + '!', S.x, S.d + SHIP_L) }, 500) }
      if (!ok) sayBrief(Q_WRONG)
      if (reason === 'collide') {
        recover(res)
        // reward: a shield bubble that takes the next bump
        if (ok) { S.shield = true; sparkleAt(S.x, S.d, 22) }
        S.easeT = 0
        return
      }
      S.waiting = false
      S.easeT = 0
      if (reason === 'buoy') {
        if (ok) {
          S.bonus++; S.score += 30
          S.boostT = 3; S.rewardBoost = 3; S.boosted = true
          sparkleAt(obj.x, obj.z, 30); if (confetti && !reduced) confetti.burst(vw / 2, vh * 0.45, 40)
          pop(obj.kind === 'chest' ? 'Harta bonus! Melaju cepat!' : 'Bintang bonus! Melaju cepat!', 0, 0, true)
        } else pop('Tetap semangat!', 0, 0, true)
        audio.chime(ok)
      } else if (reason === 'gate') {
        var drop = function () { obj.dropping = true; audio.splash(1) }
        if (ok) { drop(); S.score += 20; S.boostT = 2; S.rewardBoost = 2; sparkleAt(0, obj.z, 26); pop('Gerbang terbuka!', 0, 0, true) } else { pop('Gerbang tetap dibuka!', 0, 0, true); later(drop, 900) }
        audio.chime(ok)
      }
      if (!paused && !D.hidden) start()
    }
    function defaultChallenge (info) {
      if (!W.TKQuiz || typeof W.TKQuiz.challenge !== 'function') return { correct: true, tries: 1, hints: 0 }
      return W.TKQuiz.challenge(root, {
        domain: info.topic || opts.domain || 'campur', world: world, grade: opts.grade, mastery: opts.mastery, islam: opts.islam, lib: opts.lib,
        sfx: opts.quizSfx, sound: opts.sfx && opts.sfx.muted ? false : undefined, reducedMotion: reduced, seed: num(level.seed, 7) * 97 + info.collisions * 13 + Math.floor(S.t),
        title: 'Tantangan Pengetahuan', intro: info.intro || INTRO.collide, nextLabel: 'Lanjut Berlayar'
      })
    }
    function recover (res) {
      if (dead) return
      var first = !!res.correct
      S.tries += Math.max(1, num(res.tries, 1)); S.hints += num(res.hints, 0)
      if (first) S.correct++
      S.pen += first ? 0.5 : 1
      S.impact = null; S.waiting = false
      S.inv = 2.4
      S.score += first ? 20 : 10
      // steer away from the ice it touched, into the nearest lane that is free just ahead (centre first)
      var hitObj = S.lastHit, near = S.lane === 1 ? [0, 2] : [1], far = S.lane === 1 ? [] : [S.lane === 0 ? 2 : 0]
      var order = near.concat(far, [S.lane])
      var target = S.lane
      for (var i = 0; i < order.length; i++) if (laneFreeAt(order[i], S.d - SHIP_L / 2, S.d + 320, hitObj)) { target = order[i]; break }
      if (target !== S.lane) { S.lane = target; S.lx0 = S.x; S.lt = 0; S.ldur = LANE_DUR * 1.4 }
      pop(first ? 'Hebat! Kapal berlayar lagi!' : 'Bagus, kamu tidak menyerah!', 0, 0, true)
      audio.chime(first)
      if (!paused && !D.hidden) start()
    }
    function beginFinish () {
      S.finishing = 0.001
      if (confetti && !reduced) { confetti.burst(vw * 0.3, vh * 0.5, 60); confetti.burst(vw * 0.7, vh * 0.5, 60) }
      showBanner('Hebat! Ladang es terlewati!', 'Kamu kapten yang hebat.')
      audio.chime(true)
      later(function () { audio.horn() }, 400)
    }
    function stars () {
      if (fin) return 3
      return S.pen <= 1 ? 3 : S.pen <= 2.5 ? 2 : 1
    }
    function result () {
      return { stars: stars(), time: Math.round(S.t * 10) / 10, avoided: S.avoided, iceTotal: w.iceTotal, collisions: S.collisions, correct: S.correct,
        tries: S.tries, hints: S.hints, tokens: S.tokens, starsCollected: S.stars, starsTotal: w.starsTotal, score: S.score, final: fin, difficulty: diff,
        qAsked: S.qAsked, qRight: S.qRight, bonus: S.bonus, bumps: S.bumps }
    }
    function send () {
      if (doneSent) return
      doneSent = true; S.done = true
      var r = result()
      if (typeof opts.onDone === 'function') { try { opts.onDone(r) } catch (e) { if (W.console) console.error(e) } }
    }

    /* ── the Titanic's last minutes: PLAYER -> ASSISTED -> CINEMATIC -> IMPACT ── */
    function beginAssist () {
      if (!fin || S.phase !== 'player') return
      S.phase = 'assisted'
      S.boostT = 0
      stDist.hidden = false; stScore.hidden = true
      say('Gunung es di depan! Pegangan — aku bantu!')
      narrate('Gunung es di depan! Pegangan, aku bantu!')
      audio.horn()
    }
    function showWarn () { if (S.warn) return; S.warn = true; warn.classList.add('is-on'); audio.rumble(0.6, 0.4); later(function () { narrate('Tidak ada jalur aman.') }, 2600) }
    function finalTick (dt) {
      var cor = w.corridor
      if (!cor) return
      var bow = S.d + SHIP_L / 2
      if (S.phase === 'player' && S.d + 80 >= cor.z0) beginAssist()
      if (S.phase === 'assisted') {
        // the captain's hand on the wheel: before each row the ship is eased into its open lane
        var sl = safeLane()
        if (sl !== S.lane && S.t - S.lastIn > 0.7) laneTo(sl > S.lane ? 1 : -1, true)
        var cinAt = Math.min(380, aheadMax() * 0.7) + w.fated.r * 0.8
        if (!S.warn && cor.wall - bow < Math.max(aheadMax() * 0.62, cinAt + 220)) showWarn()
        if (cor.wall - bow < cinAt) {
          showWarn()
          S.phase = 'cinematic'
          root.classList.add('tkl-locked')
          say('Belok! Pegangan yang erat, semuanya!')
          if (S.lane !== 1) { S.lane = 1; S.lx0 = S.x; S.lt = 0; S.ldur = 0.9 }
        }
      }
      if (S.phase === 'cinematic') {
        S.cine = Math.min(1, S.cine + dt * 0.8)
        if (bow >= cor.wall - w.fated.r * 0.92) {
          S.phase = 'impact'; S.impactT = 0
          spray(S.x - 10, bow - 4, 40, 130, 'ice')
          audio.rumble(2.2, 1); audio.splash(1.4)
          if (!reduced) S.shake = 5
        }
      }
      var near = cor.wall - bow
      setText('dist', stDist.querySelector('b'), near < 420 ? 'Terlalu dekat!' : Math.max(0, Math.round(near / 10)) + ' m')
    }
    function impactTick (dt) {
      S.impactT += dt
      // the hull scrapes along the ice and comes to rest; then the host's cinematic takes over
      if (S.impactT < 1.2 && !reduced && Math.random() < 0.5) spray(S.x - 8, S.d + SHIP_L / 2 - 10, 3, 80, 'ice')
      if (S.impactT < 1.4) S.x -= dt * 10
      if (S.impactT > 2.4) send()
    }

    /* ── render ── */
    function render () {
      if (!vw) return
      ctx.setTransform(pr, 0, 0, pr, 0, 0)
      if (!SEA) { ctx.fillStyle = bgGrad || '#0d2f58'; ctx.fillRect(0, 0, vw, vh) }
      var shx = 0, shy = 0
      if (S.shake > 0.05 && !reduced) { shx = Math.sin(S.shakeT * 43) * S.shake; shy = Math.cos(S.shakeT * 37) * S.shake * 0.7 }
      ctx.setTransform(pr, 0, 0, pr, pr * shx, pr * shy)
      var z0 = S.d + behindMin() - 40, z1 = S.d + aheadMax() + 60
      if (SEA) { drawSea(); ctx.setTransform(pr, 0, 0, pr, pr * shx, pr * shy); drawDressing(z0, z1); drawHarbour(z0, z1); drawChains(z0, z1) } else { drawWaves(z0, z1); drawLanes(z0, z1) }
      if (SEA) drawWake2(); else drawWake()
      drawObjects(z0, z1)
      drawShip()
      drawParts()
      if (S.phase === 'cinematic' || S.phase === 'impact') drawDanger()
      if (S.tut === 1 || S.tut === 2) drawTutor()
      // horizon haze: far water fades into the night
      ctx.fillStyle = hazeGrad; ctx.fillRect(-10, -10, vw + 20, vh * 0.32 + 10)
      if (SEA) {
        ctx.setTransform(pr, 0, 0, pr, 0, 0)
        if (themeName === 'deep') SEA.rays(ctx, vw, vh, S.t, reduced)
        if (S.boostT > 0 && !reduced) drawSpeedLines()
        if (vigGrad) vigGrad.draw(ctx, vw, vh)
        if (confetti && confetti.n) confetti.draw(ctx)
      }
    }
    /* ── polish (tk-sea.js) ── */
    // the sea: ONE unscaled pattern fill at the ship's depth scale (a per-strip perspective texture cost
    // ~16 scaled fills per frame); depth is carried by the buoy chains, the objects and the horizon haze
    var seaP = SEA ? SEA.Sea(themeName) : null
    function drawSea () {
      var s0 = scale * S.zoom, drift = reduced ? 0 : S.t * 5
      seaP.draw(ctx, s0 * pr, pr * (vw / 2 - (camX - drift) * s0), pr * (shipY + S.d * s0), cv.width, cv.height)
      // glints + foam flecks, mapped the same (flat) way
      ctx.setTransform(pr * s0, 0, 0, pr * s0, pr * (vw / 2 - camX * s0), pr * (shipY + S.d * s0))
      var x0 = camX - vw / 2 / s0, x1 = camX + vw / 2 / s0, v0 = -S.d - shipY / s0, v1 = -S.d + (vh - shipY) / s0
      if (rq > 0.41) SEA.sparkles(ctx, themeName, x0, v0, x1, v1, S.t, reduced, null)   // lowest quality step: no glints (canvas flush budget)
      ctx.setTransform(pr, 0, 0, pr, 0, 0)
    }
    function drawDressing (z0, z1) {
      var C = 360
      for (var cz = Math.floor(z0 / C); cz <= Math.ceil(z1 / C); cz++) {
        for (var side = -1; side <= 1; side += 2) {
          var it = SEA.dressAt(side * 5, cz, themeName)
          if (!it) continue
          var x = side * (LANE * 1.5 + 90 + it.fx * 160), z = cz * C + it.fy * C
          proj(x, z)
          if (PY < -40 || PY > vh + 40) continue
          SEA.drawDress(ctx, SS, it, PX, PY, PS, S.t, reduced, DIMG)
        }
      }
    }
    // lane dividers + outer edges as buoy chains: red/white buoys bobbing, a light rope sagging between them
    function drawChains (z0, z1) {
      // the ship's lane: a soft gold band
      var lx = laneX(S.lane)
      proj(lx - LANE / 2, S.d - 80); var ax = PX, ay = PY; proj(lx + LANE / 2, S.d - 80); var bx = PX
      proj(lx + LANE / 2, S.d + 900); var cx2 = PX, cy = PY; proj(lx - LANE / 2, S.d + 900); var dx = PX
      var lg = ctx.createLinearGradient(0, cy, 0, ay)
      lg.addColorStop(0, 'rgba(255,225,120,0)'); lg.addColorStop(1, 'rgba(255,225,120,.16)')
      ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, ay); ctx.lineTo(cx2, cy); ctx.lineTo(dx, cy); ctx.closePath(); ctx.fill()
      var GAP = 120, zs = Math.floor(z0 / GAP) * GAP, B = SS.buoy
      var xs = [-LANE * 1.5 - 18, -LANE / 2, LANE / 2, LANE * 1.5 + 18]
      for (var c = 0; c < xs.length; c++) {
        var outer = c === 0 || c === 3, prevX = null, prevY = 0, prevS = 0
        for (var z = z1 - (z1 - zs) % GAP; z >= zs; z -= GAP) {
          var bob = reduced ? 0 : Math.sin(S.t * 2 + z * 0.02 + c) * 1.6
          proj(xs[c], z)
          if (PY < -30) continue
          if (prevX !== null) {
            ctx.strokeStyle = outer ? 'rgba(255,236,190,.55)' : 'rgba(255,250,235,.4)'; ctx.lineWidth = Math.max(0.8, 1.6 * PS)
            ctx.beginPath(); ctx.moveTo(prevX, prevY); ctx.quadraticCurveTo((prevX + PX) / 2, (prevY + PY) / 2 + 5 * PS, PX, PY - bob * PS); ctx.stroke()
          }
          var k = (outer ? 0.9 : 0.62) * PS
          if (PY < vh + 40) ctx.drawImage(B.c, PX - B.cx * k, PY - B.cy * k - bob * PS, B.c.width * k, B.c.height * k)
          prevX = PX; prevY = PY - bob * PS; prevS = k
        }
      }
    }
    function drawWake2 () {
      var n = trail.length
      if (n < 3) return
      var pts = []
      for (var i = 0; i < n; i++) {
        var p = trail[i]
        proj(p.x, p.z)
        pts.push({ x: PX, y: PY, nx: Math.cos(p.a), ny: Math.sin(p.a), age: p.age * 1.4, k: PS })
      }
      var k0 = pts[0].k
      // screen units: scale the spreads by the stern's depth scale
      SEA.wake(ctx, pts, { w0: SHIP_B * 0.42 * k0, spread: (SHIP_B * 0.8 + 16) * k0, fade: 3.2, boost: S.boostT > 0 ? 1 : 0, scale: k0 })
    }
    function drawHarbour (z0, z1) {
      var ze = w.zEnd
      if (fin || ze > z1 + 200 || ze < z0 - 200) return
      // calm harbour water, a finish arch across all lanes, the owner's lighthouse island at the side
      proj(-LANE * 1.5 - 30, ze); var xL = PX, yL = PY, kL = PS; proj(LANE * 1.5 + 30, ze); var xR = PX
      var L2 = DIMG.light
      if (ready(L2)) { proj(LANE * 1.5 + 190, ze + 120); var lw = 300 * PS, lh = lw * L2.naturalHeight / L2.naturalWidth; ctx.drawImage(L2, PX - lw / 2, PY - lh * 0.8, lw, lh) }
      SEA.arch(ctx, SS, xL, yL, xR, yL, kL, S.t, { reduced: reduced, passed: S.finishing > 0, glow: S.finishing > 0 ? 1 : 0, size: 1.5 })
    }
    function drawSpeedLines () {
      var cx = vw / 2, cy = shipY * 0.35, n = 22, ph = S.t * 3
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.18 * Math.min(1, S.boostT * 2)).toFixed(3) + ')'; ctx.lineWidth = 2; ctx.lineCap = 'round'
      ctx.beginPath()
      for (var i = 0; i < n; i++) {
        var a = i / n * TAU + 0.3, u = (ph + i * 0.37) % 1
        var r0 = Math.max(vw, vh) * (0.25 + u * 0.55), r1 = r0 + 40 + u * 60
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.8); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.8)
      }
      ctx.stroke()
    }
    function drawWaves (z0, z1) {
      var cell = 120, drift = reduced ? 0 : S.t * 7
      ctx.strokeStyle = night ? 'rgba(150,200,255,.16)' : 'rgba(255,255,255,.22)'; ctx.lineWidth = 2; ctx.lineCap = 'round'
      ctx.beginPath()
      proj(0, z1); var halfFar = vw / 2 / PS + cell
      var gz0 = Math.floor(z0 / cell), gz1 = Math.ceil(z1 / cell), gx0 = Math.floor((camX - halfFar) / cell), gx1 = Math.ceil((camX + halfFar) / cell)
      for (var gz = gz0; gz <= gz1; gz++) {
        for (var gx = gx0; gx <= gx1; gx++) {
          var hs = Math.abs((gx * 73856093) ^ (gz * 19349663)) % 1000 / 1000
          proj(gx * cell + hs * 70 + drift, gz * cell + ((hs * 7) % 1) * 80)
          if (PY < -10 || PY > vh + 10 || PX < -30 || PX > vw + 30) continue
          var s = (9 + hs * 10) * PS, ph = reduced ? 0 : Math.sin(S.t * 1.3 + hs * 6) * 1.5 * PS
          ctx.moveTo(PX - s, PY + ph); ctx.quadraticCurveTo(PX - s / 2, PY - 4 * PS + ph, PX, PY + ph); ctx.quadraticCurveTo(PX + s / 2, PY + 4 * PS + ph, PX + s, PY + ph)
        }
      }
      ctx.stroke()
    }
    function drawLanes (z0, z1) {
      // current lane: a faint glow band (where the ship is going)
      var lx = laneX(S.lane)
      proj(lx - LANE / 2, z0); var ax = PX, ay = PY; proj(lx + LANE / 2, z0); var bx = PX
      proj(lx + LANE / 2, z1); var cx2 = PX, cy = PY; proj(lx - LANE / 2, z1); var dx = PX
      var lg = ctx.createLinearGradient(0, cy, 0, ay)
      lg.addColorStop(0, 'rgba(120,210,255,0)'); lg.addColorStop(1, 'rgba(120,210,255,.10)')
      ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, ay); ctx.lineTo(cx2, cy); ctx.lineTo(dx, cy); ctx.closePath(); ctx.fill()
      // dividers: dashed foam streaks (wake markers), drifting toward the ship
      ctx.strokeStyle = 'rgba(200,240,255,.30)'; ctx.lineWidth = 3; ctx.lineCap = 'round'
      ctx.beginPath()
      var dash = 70, st0 = Math.floor(z0 / dash) * dash
      for (var side = -1; side <= 1; side += 2) {
        var x = side * LANE / 2
        for (var z = st0; z < z1; z += dash) { proj(x, z); var y0 = PY, x0 = PX; proj(x, z + 30); ctx.moveTo(x0, y0); ctx.lineTo(PX, PY) }
      }
      ctx.stroke()
      // outer buoy lines: a thin rope and a buoy every 240 units
      ctx.strokeStyle = 'rgba(255,220,160,.22)'; ctx.lineWidth = 1.5
      ctx.beginPath()
      for (var s2 = -1; s2 <= 1; s2 += 2) { var ex = s2 * (LANE * 1.5 + 18); proj(ex, z0); ctx.moveTo(PX, PY); proj(ex, z1); ctx.lineTo(PX, PY) }
      ctx.stroke()
      var bz0 = Math.floor(z0 / 240) * 240
      for (var bz = bz0; bz < z1; bz += 240) {
        for (var s3 = -1; s3 <= 1; s3 += 2) {
          proj(s3 * (LANE * 1.5 + 18), bz)
          var r = 6 * PS
          ctx.fillStyle = '#f4f1e8'; ctx.beginPath(); ctx.arc(PX, PY, r, 0, TAU); ctx.fill()
          ctx.fillStyle = '#d8453a'; ctx.beginPath(); ctx.arc(PX, PY, r, -Math.PI / 2, Math.PI / 2); ctx.fill()
        }
      }
    }
    function drawWake () {
      var n = trail.length
      if (n < 3) return
      var head = S.boostT > 0 ? 1 : 0
      for (var side = -1; side <= 1; side += 2) {
        ctx.beginPath()
        for (var i = 0; i < n; i++) {
          var p = trail[i], sp = SHIP_B * 0.45 + p.age * 22
          proj(p.x + Math.cos(p.a) * sp * side, p.z - Math.sin(p.a) * sp * side)
          if (i) ctx.lineTo(PX, PY); else ctx.moveTo(PX, PY)
        }
        ctx.strokeStyle = 'rgba(235,250,255,' + (0.42 + head * 0.25) + ')'; ctx.lineWidth = 2.5 + head * 1.5; ctx.stroke()
      }
      ctx.beginPath()
      var m = Math.min(n, 30)
      for (var j = 0; j < m; j++) { proj(trail[j].x, trail[j].z); if (j) ctx.lineTo(PX, PY); else ctx.moveTo(PX, PY) }
      ctx.strokeStyle = 'rgba(220,245,255,' + (0.16 + head * 0.14) + ')'; ctx.lineWidth = SHIP_B * scale * (0.8 + head * 0.5); ctx.lineJoin = 'round'; ctx.stroke()
    }
    function drawIceSpr (sp, x, z, r, alpha) {
      proj(x, z)
      var k = r / sp.R * PS
      if (PY + sp.c.height * k < 0 || PY - sp.c.height * k > vh) return
      if (SEA) {
        // a wave ring breaking around the base
        var rg = reduced ? 0.5 : (S.t * 0.6 + x * 0.013) % 1
        ctx.strokeStyle = 'rgba(235,250,255,' + (0.5 * (1 - rg) * alpha).toFixed(3) + ')'; ctx.lineWidth = Math.max(1, 2.2 * PS)
        ctx.beginPath(); ctx.ellipse(PX, PY + r * 0.15 * PS, r * PS * (1.05 + rg * 0.3), r * PS * (0.5 + rg * 0.16), 0, 0, TAU); ctx.stroke()
      }
      ctx.globalAlpha = alpha
      ctx.drawImage(sp.c, PX - sp.cx * k, PY - sp.cy * k, sp.c.width * k, sp.c.height * k)
      ctx.globalAlpha = 1
    }
    function drawObjects (z0, z1) {
      // far first so near objects overlap them
      var lo = 0, hi = w.objs.length
      for (var i = hi - 1; i >= lo; i--) {
        var o = w.objs[i]
        if (o.z > z1 + 150) continue
        var endZ = o.type === 'wall' ? o.z + o.len : o.z + (o.r || 0) + 40
        if (endZ < z0) break
        if (o.off) continue
        var al = o.hit ? 1 - (o.fade || 0) * 0.7 : 1
        var bob = reduced ? 0 : Math.sin(S.t * 1.6 + (o.bob || 0))
        if (o.type === 'gate') { drawGate(o); continue }
        if (o.type === 'qbuoy') { if (!o.taken || o === S.qObj) drawQBuoy(o); continue }
        if (o.type === 'lgate') { drawLGate(o); continue }
        if (o.type === 'wall') {
          var n = Math.max(2, Math.round(o.len / 70))
          for (var k = n - 1; k >= 0; k--) drawIceSpr(SPR.berg[(o.shape + k) % 6], o.x + (k % 2 ? 6 : -6), o.z + 20 + k * (o.len - 40) / (n - 1), o.hw * 1.05, al)
          continue
        }
        if (o.type === 'floe') { drawIceSpr(SPR.floe[o.shape % 6], o.x, o.z, o.r, al); continue }
        if (o.type === 'berg') { drawIceSpr(SPR.berg[o.shape % 6], o.x, o.z + bob * 1.2, o.r, al); continue }
        if (o.type === 'big') { drawIceSpr(SPR.big[o.shape % 3], o.x, o.z, o.r, al); continue }
        if (o.type === 'fated') { drawIceSpr(SPR.fated, o.x, o.z, o.r, 1); continue }
        if (o.type === 'debris') {
          var im = IMG[o.key]; proj(o.x, o.z + bob * 2)
          var sz = o.r * 2.3 * PS
          ctx.globalAlpha = al
          ctx.fillStyle = 'rgba(200,240,255,.25)'; ctx.beginPath(); ctx.ellipse(PX, PY + sz * 0.3, sz * 0.62, sz * 0.22, 0, 0, TAU); ctx.fill()
          if (ready(im)) ctx.drawImage(im, PX - sz / 2, PY - sz * 0.6, sz, sz * im.naturalHeight / im.naturalWidth)
          else { ctx.fillStyle = '#8a5a2c'; ctx.fillRect(PX - sz * 0.4, PY - sz * 0.4, sz * 0.8, sz * 0.8) }
          ctx.globalAlpha = 1
          continue
        }
        if ((o.type === 'star' || o.type === 'token') && !o.taken) {
          var img = IMG[o.type]; proj(o.x, o.z)
          var s = (o.type === 'star' ? 42 : 46) * PS, lift = (reduced ? 0 : bob * 4 * PS) + 10 * PS
          ctx.fillStyle = o.type === 'star' ? 'rgba(255,220,90,.28)' : 'rgba(120,255,210,.3)'
          ctx.beginPath(); ctx.arc(PX, PY - lift, s * 0.72, 0, TAU); ctx.fill()
          if (ready(img)) ctx.drawImage(img, PX - s / 2, PY - lift - s / 2, s, s * img.naturalHeight / img.naturalWidth)
          if (SEA) {
            // twinkle: a four-point glint turning on the star
            var tw = reduced ? 0.6 : 0.5 + 0.5 * Math.sin(S.t * 5 + o.bob * 3), gl = s * (0.35 + tw * 0.35)
            ctx.save(); ctx.translate(PX + s * 0.22, PY - lift - s * 0.25); ctx.rotate(reduced ? 0 : S.t * 1.5)
            ctx.fillStyle = 'rgba(255,255,240,' + (0.55 + tw * 0.45).toFixed(3) + ')'
            ctx.beginPath(); ctx.moveTo(0, -gl); ctx.lineTo(gl * 0.18, 0); ctx.lineTo(0, gl); ctx.lineTo(-gl * 0.18, 0); ctx.closePath(); ctx.fill()
            ctx.beginPath(); ctx.moveTo(-gl, 0); ctx.lineTo(0, gl * 0.18); ctx.lineTo(gl, 0); ctx.lineTo(0, -gl * 0.18); ctx.closePath(); ctx.fill()
            ctx.restore()
          }
        }
      }
    }
    // a glowing Soal buoy (or treasure chest): pulsing gold ring, owner sprite, a turning sparkle, "SOAL" tag
    function drawQBuoy (o) {
      proj(o.x, o.z)
      var s = 62 * PS, pulse = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(S.t * 3.2 + o.bob), bob = reduced ? 0 : Math.sin(S.t * 1.8 + o.bob) * 3 * PS
      var ring = reduced ? 0.55 : (S.t * 0.8 + o.bob) % 1
      ctx.fillStyle = 'rgba(255,214,90,' + (0.18 + 0.14 * pulse).toFixed(3) + ')'
      ctx.beginPath(); ctx.ellipse(PX, PY, s * 0.78, s * 0.36, 0, 0, TAU); ctx.fill()
      ctx.strokeStyle = 'rgba(255,236,150,' + (0.9 * (1 - ring)).toFixed(3) + ')'; ctx.lineWidth = Math.max(1.5, 3 * PS)
      ctx.beginPath(); ctx.ellipse(PX, PY, s * (0.55 + ring * 0.6), s * (0.26 + ring * 0.28), 0, 0, TAU); ctx.stroke()
      var im = o.kind === 'chest' ? IMG.chest : IMG.buoy
      if (ready(im)) { var ih = s * im.naturalHeight / im.naturalWidth; ctx.drawImage(im, PX - s / 2, PY - ih * 0.82 + bob, s, ih) }
      var tw = 0.5 + 0.5 * pulse, gl = s * (0.22 + tw * 0.2)
      ctx.save(); ctx.translate(PX + s * 0.34, PY - s * 0.7 + bob); ctx.rotate(reduced ? 0 : S.t * 1.5)
      ctx.fillStyle = 'rgba(255,255,235,' + (0.6 + tw * 0.4).toFixed(3) + ')'
      ctx.beginPath(); ctx.moveTo(0, -gl); ctx.lineTo(gl * 0.2, 0); ctx.lineTo(0, gl); ctx.lineTo(-gl * 0.2, 0); ctx.closePath(); ctx.fill()
      ctx.beginPath(); ctx.moveTo(-gl, 0); ctx.lineTo(0, gl * 0.2); ctx.lineTo(gl, 0); ctx.lineTo(0, -gl * 0.2); ctx.closePath(); ctx.fill()
      ctx.restore()
      var fs = Math.max(10, Math.round(15 * PS))
      ctx.font = fs + 'px "Fredoka One", Fredoka, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      var tw2 = ctx.measureText('SOAL').width + fs
      ctx.fillStyle = 'rgba(74,44,16,.92)'; ctx.fillRect(PX - tw2 / 2, PY + s * 0.2, tw2, fs * 1.4)
      ctx.fillStyle = '#ffe066'; ctx.fillText('SOAL', PX, PY + s * 0.2 + fs * 0.72)
      ctx.textBaseline = 'alphabetic'
    }
    // a lighthouse on each side and a chain across all lanes; the chain drops into the sea when it opens
    function drawLGate (o) {
      var xs = LANE * 1.5 + 60
      proj(-xs, o.z); var ax = PX, ay = PY, k = PS; proj(xs, o.z); var bx = PX
      var im = IMG.house, hs = 118 * k
      if (!reduced && !o.open) {
        // the lamps sweep a soft beam across the chain
        var sw = Math.sin(S.t * 1.6) * 0.5 + 0.5
        ctx.fillStyle = 'rgba(255,240,170,.13)'
        ctx.beginPath(); ctx.moveTo(ax, ay - hs * 0.78); ctx.lineTo(ax + (bx - ax) * (0.3 + sw * 0.5), ay - 26 * k); ctx.lineTo(ax + (bx - ax) * (0.45 + sw * 0.5), ay + 10 * k); ctx.closePath(); ctx.fill()
      }
      if (o.drop < 1) {
        var fall = o.drop, a = reduced ? 1 - fall : 1 - Math.max(0, fall - 0.5) * 2, sag = (12 + (reduced ? 0 : fall * 70)) * k
        ctx.globalAlpha = Math.max(0, a)
        var n = 18, lw = Math.max(2, 5 * k)
        for (var i = 0; i <= n; i++) {
          var u = i / n, x = ax + (bx - ax) * u, y = ay - 30 * k + Math.sin(u * Math.PI) * sag + (reduced ? 0 : fall * 40 * k)
          ctx.strokeStyle = i % 2 ? '#7d8791' : '#c9d2da'; ctx.lineWidth = lw
          ctx.beginPath(); ctx.ellipse(x, y, (i % 2 ? 4 : 9) * k + 1, (i % 2 ? 9 : 5) * k + 1, 0, 0, TAU); ctx.stroke()
        }
        if (!o.asked || !o.dropping) {
          // the brass lock plate in the middle
          var mx = (ax + bx) / 2, my = ay - 30 * k + sag, r = 20 * k + 4
          ctx.fillStyle = '#d9a441'; ctx.strokeStyle = '#6b4412'; ctx.lineWidth = Math.max(2, 3 * k)
          ctx.beginPath(); ctx.arc(mx, my, r, 0, TAU); ctx.fill(); ctx.stroke()
          ctx.fillStyle = '#3b2400'; ctx.font = Math.round(r * 1.3) + 'px "Fredoka One", Fredoka, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          ctx.fillText('?', mx, my + 1); ctx.textBaseline = 'alphabetic'
        }
        ctx.globalAlpha = 1
      } else if (!reduced && (o.ripple = (o.ripple || 0) + 0.02) < 1) {
        ctx.strokeStyle = 'rgba(235,250,255,' + (0.6 * (1 - o.ripple)).toFixed(3) + ')'; ctx.lineWidth = 2
        ctx.beginPath(); ctx.ellipse((ax + bx) / 2, ay, (bx - ax) * (0.3 + o.ripple * 0.3), 14 * k * (1 + o.ripple), 0, 0, TAU); ctx.stroke()
      }
      if (ready(im)) {
        var iw = hs * im.naturalWidth / im.naturalHeight
        ctx.drawImage(im, ax - iw / 2, ay - hs * 0.9, iw, hs); ctx.drawImage(im, bx - iw / 2, ay - hs * 0.9, iw, hs)
      }
    }
    function drawGate (o) {
      if (SEA) {
        proj(-LANE * 1.5 - 30, o.z); var ax0 = PX, ay0 = PY, ak = PS; proj(LANE * 1.5 + 30, o.z)
        if (o.passed && o.glow == null) o.glow = 1
        if (o.glow > 0) o.glow = Math.max(0, o.glow - 0.015)
        SEA.arch(ctx, SS, ax0, ay0, PX, PY, ak, S.t, { reduced: reduced, passed: o.passed, glow: o.glow || 0, size: 1.3 })
        return
      }
      // checkpoint: a line of lit buoys across the lanes
      proj(-LANE * 1.5 - 18, o.z); var x0 = PX, y0 = PY; proj(LANE * 1.5 + 18, o.z)
      ctx.strokeStyle = o.passed ? 'rgba(130,255,180,.45)' : 'rgba(255,220,120,.5)'; ctx.lineWidth = 3
      ctx.setLineDash([10, 10]); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(PX, PY); ctx.stroke(); ctx.setLineDash([])
      var im = IMG.buoy
      for (var s = -1; s <= 1; s += 2) {
        proj(s * (LANE * 1.5 + 30), o.z)
        var sz = 46 * PS
        if (ready(im)) ctx.drawImage(im, PX - sz / 2, PY - sz * 0.9, sz, sz * im.naturalHeight / im.naturalWidth)
      }
    }
    function drawShip () {
      proj(S.x, S.d)
      var k = PS, blink = S.inv > 0 && !reduced ? (Math.sin(S.t * 22) > 0 ? 0.55 : 1) : 1
      ctx.save(); ctx.translate(PX, PY); ctx.rotate(S.head)
      // shadow (shifts with the roll) + bow foam
      ctx.fillStyle = 'rgba(0,8,20,.35)'; ctx.beginPath(); ctx.ellipse(4 * k + S.rollS * 5 * k, 8 * k, SHIP_B * 0.62 * k, SHIP_L * 0.5 * k, 0, 0, TAU); ctx.fill()
      var sp = clamp(S.v / (V0 * 1.55), 0, 1), bh = -SHIP_L / 2 * k
      if (sp > 0.05) {
        ctx.strokeStyle = 'rgba(240,252,255,' + (0.35 + sp * 0.5) + ')'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'
        var spr = SHIP_B * (0.7 + sp * 1.2) * k
        ctx.beginPath(); ctx.moveTo(-spr, bh + SHIP_L * 0.18 * k); ctx.quadraticCurveTo(-SHIP_B * 0.3 * k, bh + 2, 0, bh - 4 * k); ctx.quadraticCurveTo(SHIP_B * 0.3 * k, bh + 2, spr, bh + SHIP_L * 0.18 * k); ctx.stroke()
        if (S.boostT > 0 && !reduced) {
          ctx.fillStyle = 'rgba(255,255,255,.8)'
          for (var i = 0; i < 6; i++) { var j = Math.random(); ctx.beginPath(); ctx.arc((j - 0.5) * SHIP_B * 1.4 * k, bh + j * 10 * k, (1.5 + j * 2.5) * k, 0, TAU); ctx.fill() }
        }
      }
      if (S.inv > 0) { ctx.strokeStyle = 'rgba(255,230,120,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, SHIP_B * 1.3 * k, SHIP_L * 0.62 * k, 0, 0, TAU); ctx.stroke() }
      if (S.shield) drawShield(k)
      ctx.globalAlpha = blink
      // hull roll: a slight squash across the beam toward the turn
      ctx.scale(1 - Math.abs(S.rollS) * 0.14, 1)
      if (ready(shipImg)) {
        var hgt = ART_L * k, wid = hgt * shipImg.naturalWidth / shipImg.naturalHeight
        ctx.drawImage(shipImg, -wid / 2, -hgt / 2, wid, hgt)
      } else {
        var sp2 = SPR.ship
        ctx.drawImage(sp2.c, -sp2.w / 2 * k, -sp2.h / 2 * k, sp2.w * k, sp2.h * k)
      }
      ctx.globalAlpha = 1
      ctx.restore()
    }
    // the shield bubble (reward for a right answer after a bump): a soft blue dome with a turning glint
    function drawShield (k) {
      var rx = Math.max(SHIP_B * 1.9, ART_L * 0.34) * k, ry = ART_L * 0.62 * k, pl = reduced ? 0 : Math.sin(S.t * 3) * 0.04
      var g = ctx.createRadialGradient(0, 0, ry * 0.3, 0, 0, ry)
      g.addColorStop(0, 'rgba(140,220,255,0)'); g.addColorStop(0.8, 'rgba(140,220,255,.16)'); g.addColorStop(1, 'rgba(190,240,255,.42)')
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, rx * (1 + pl), ry * (1 + pl), 0, 0, TAU); ctx.fill()
      ctx.strokeStyle = 'rgba(210,245,255,.85)'; ctx.lineWidth = Math.max(1.5, 3 * k); ctx.stroke()
      var a0 = reduced ? -2.2 : S.t * 2
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = Math.max(2, 4 * k)
      ctx.beginPath(); ctx.ellipse(0, 0, rx * 0.86, ry * 0.86, 0, a0, a0 + 0.7); ctx.stroke()
    }
    function drawParts () {
      if (!parts.length) return
      for (var i = 0; i < parts.length; i++) {
        var q = parts[i], a = 1 - q.age / q.life
        proj(q.x, q.z)
        ctx.fillStyle = q.gold ? 'rgba(255,224,102,' + a + ')' : q.ice ? 'rgba(225,248,255,' + a + ')' : 'rgba(200,235,255,' + (a * 0.85) + ')'
        var r = (q.ice ? 3.2 : 2.4) * PS
        if (q.ice) ctx.fillRect(PX - r, PY - q.h * PS - r, r * 2, r * 2)
        else { ctx.beginPath(); ctx.arc(PX, PY - q.h * PS, r, 0, TAU); ctx.fill() }
      }
    }
    function drawTutor () {
      // ghost chevrons beside the bow sliding toward the lanes (or forward for Cepat)
      proj(S.x, S.d + SHIP_L * 0.3)
      var k = scale * 1.4, ph = reduced ? 0.5 : (S.t * 1.1) % 1, a = reduced ? 0.85 : Math.sin(ph * Math.PI)
      ctx.save(); ctx.fillStyle = 'rgba(255,209,102,' + (0.9 * a) + ')'; ctx.strokeStyle = 'rgba(40,20,0,' + (0.5 * a) + ')'; ctx.lineWidth = 2
      function chev (cx, cy, dir) {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(dir)
        ctx.beginPath(); ctx.moveTo(-12 * k, -14 * k); ctx.lineTo(8 * k, 0); ctx.lineTo(-12 * k, 14 * k); ctx.lineTo(-5 * k, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore()
      }
      if (S.tut === 1) {
        for (var side = -1; side <= 1; side += 2) {
          if ((side < 0 && S.lane === 0) || (side > 0 && S.lane === 2)) continue
          var off = (34 + ph * 46) * k
          chev(PX + side * off, PY, side < 0 ? Math.PI : 0); chev(PX + side * (off + 22 * k), PY, side < 0 ? Math.PI : 0)
        }
      } else {
        var oy = (70 + ph * 50) * k
        chev(PX, PY - SHIP_L * 0.5 * k - oy, -Math.PI / 2); chev(PX, PY - SHIP_L * 0.5 * k - oy - 22 * k, -Math.PI / 2)
      }
      ctx.restore()
    }
    function drawDanger () {
      // every lane ahead is ice: the dashed course runs from the bow into the berg
      var cor = w.corridor
      proj(S.x, S.d + SHIP_L / 2); var sx = PX, sy = PY
      proj(w.fated.x - 20, cor.wall - w.fated.r * 0.7)
      ctx.strokeStyle = 'rgba(255,90,70,.85)'; ctx.lineWidth = 4; ctx.setLineDash([12, 10]); ctx.lineDashOffset = reduced ? 0 : -S.t * 30
      ctx.beginPath(); ctx.moveTo(sx, sy - 6); ctx.quadraticCurveTo(sx - 30, (sy + PY) / 2, PX, PY); ctx.stroke(); ctx.setLineDash([])
    }
    function drawRadar () {
      var s = radar.width, r = s / 2, RR = 900, c = rctx
      if (!s) return
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, s, s)
      c.save(); c.beginPath(); c.arc(r, r, r - 1, 0, TAU); c.clip()
      c.fillStyle = 'rgba(4,24,42,.9)'; c.fillRect(0, 0, s, s)
      c.strokeStyle = 'rgba(120,230,200,.3)'; c.lineWidth = dpr
      for (var k = 1; k <= 3; k++) { c.beginPath(); c.arc(r, r, r * k / 3.2, 0, TAU); c.stroke() }
      c.beginPath(); c.moveTo(r, 0); c.lineTo(r, s); c.moveTo(0, r); c.lineTo(s, r); c.stroke()
      if (!reduced) { var sa = (S.t * 1.6) % TAU; c.fillStyle = 'rgba(120,255,200,.14)'; c.beginPath(); c.moveTo(r, r); c.arc(r, r, r, sa - 0.6, sa); c.closePath(); c.fill() }
      var q = r / RR
      // lanes
      c.strokeStyle = 'rgba(160,220,255,.25)'
      for (var lx = -1.5; lx <= 1.5; lx += 1) { c.beginPath(); c.moveTo(r + (lx * LANE - S.x) * q, 0); c.lineTo(r + (lx * LANE - S.x) * q, s); c.stroke() }
      for (var i = 0; i < w.objs.length; i++) {
        var o = w.objs[i], dz = o.z - S.d
        if (dz > RR) break
        if (dz < -RR || o.off || o.hit || o.taken) continue
        var px = r + (o.x - S.x) * q, py = r - dz * q
        if (o.ice) { c.fillStyle = S.warn ? '#ffc070' : '#bff3ff'; var rr = Math.max(1.6 * dpr, (o.type === 'wall' ? o.hw : o.r) * q * 1.1); c.beginPath(); c.arc(px, o.type === 'wall' ? py - o.len * q / 2 : py, rr, 0, TAU); c.fill() }
        else if (o.type === 'star' || o.type === 'token') { c.fillStyle = '#ffd166'; c.beginPath(); c.arc(px, py, 1.6 * dpr, 0, TAU); c.fill() }
        else if (o.type === 'qbuoy') { c.fillStyle = '#7ff0ff'; c.beginPath(); c.arc(px, py, 3 * dpr, 0, TAU); c.fill() }
        else if (o.type === 'lgate' && !o.open) { c.fillStyle = '#ffb347'; c.fillRect(px - r, py - 1.5 * dpr, 2 * r, 3 * dpr) }
      }
      c.fillStyle = '#fff'; c.font = 'bold ' + Math.round(9 * dpr) + 'px system-ui'; c.textAlign = 'center'; c.fillText('U', r, 11 * dpr)
      c.translate(r, r); c.rotate(S.head)
      c.fillStyle = '#ffd166'; c.beginPath(); c.moveTo(0, -7 * dpr); c.lineTo(5 * dpr, 6 * dpr); c.lineTo(-5 * dpr, 6 * dpr); c.closePath(); c.fill()
      c.restore()
    }
    function setText (key, node, text) { if (lastHud[key] !== text) { lastHud[key] = text; node.textContent = text } }
    function fmt (s) { s = Math.max(0, Math.floor(s)); var m = Math.floor(s / 60), r = s % 60; return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r }
    function hud () {
      setText('time', stTime.querySelector('b'), fmt(S.t))
      setText('score', stScore.querySelector('b'), String(S.score))
      setText('ice', stIce.querySelector('b'), S.avoided + '/' + w.iceTotal)
      if (route) {
        var sc = w.sections[S.sec]
        route.set(S.d / Math.max(1, w.zEnd), sc ? sc.title : '')
      }
    }

    /* loop */
    function frame (now) {
      raf = 0
      if (dead || paused || D.hidden || S.waiting) return
      var dt = last ? (now - last) / 1000 : 1 / 60
      last = now
      dt = clamp(dt, 0, 0.1)
      // fixed-timestep simulation (60 Hz) + interpolated rendering
      acc += dt
      var n = 0
      while (acc >= STEP && n < 6 && !S.done && !S.waiting) { prev.d = S.d; prev.x = S.x; prev.h = S.head; prev.c = camX; step(STEP); acc -= STEP; n++ }
      if (n === 6 || S.waiting) acc = 0
      if (S.waiting) { render(); return }
      if (S.frames > 20) adapt(dt)
      var al = acc / STEP, cur = { d: S.d, x: S.x, h: S.head, c: camX }
      if (n > 0 && al > 0 && !S.done) { S.d = prev.d + (cur.d - prev.d) * al; S.x = prev.x + (cur.x - prev.x) * al; S.head = prev.h + (cur.h - prev.h) * al; camX = prev.c + (cur.c - prev.c) * al }
      render()
      S.d = cur.d; S.x = cur.x; S.head = cur.h; camX = cur.c
      if (confetti && confetti.n) confetti.step(dt)
      hudT -= dt; radarT -= dt
      // the DOM HUD and the radar canvas never repaint in the same frame: each is a layer repaint + upload in the
      // commit, and at 4x CPU the two together pushed a frame over 50 ms (perf gate, 2026-09-30); a radar due in a
      // HUD frame draws on the next one
      if (hudT <= 0) { hudT = 0.12; hud() } else if (radarT <= 0) { radarT = 0.1; drawRadar() }
      S.frames++
      TKLanes._frames++
      if (!S.done) raf = W.requestAnimationFrame(frame)
    }
    var STEP = 1 / 60, acc = 0, prev = { d: 0, x: 0, h: 0, c: 0 }
    function start () { if (!raf && !dead && !paused && !D.hidden && !S.waiting) { last = 0; acc = 0; raf = W.requestAnimationFrame(frame) } }
    function stop () { if (raf) W.cancelAnimationFrame(raf); raf = 0 }

    var handle = {
      pause: function (quiet) {
        if (dead || paused || S.waiting) return          // the open question card already holds the game
        paused = true; stop(); audio.suspend()
        if (opts.pauseOverlay !== false && !S.waiting && !quiet) pauseOv.classList.add('is-on')
      },
      resume: function () {
        if (dead || !paused) return
        paused = false; pauseOv.classList.remove('is-on'); audio.ensure(); start()
      },
      destroy: function () {
        if (dead) return
        dead = true; stop(); audio.close()
        timers.forEach(clearTimeout)
        if (pending && typeof pending.close === 'function') { var pd = pending; pending = null; try { pd.close() } catch (e) {} }
        if (ro) ro.disconnect(); else W.removeEventListener('resize', resize)
        W.removeEventListener('keydown', onKey)
        D.removeEventListener('visibilitychange', onVis)
        if (root.parentNode) root.parentNode.removeChild(root)
      },
      setMuted: function (m) { if (!opts.sfx) opts.sfx = {}; opts.sfx.muted = !!m; audio.sync() },
      state: function () {
        var chal = pending && pending.ctrl && pending.ctrl.state ? pending.ctrl.state() : null
        return { d: S.d, x: S.x, lane: S.lane, safeLane: safeLane(), speed: S.v, vmax: V0, boost: S.boostT, boostCd: S.boostCd, t: S.t, phase: S.phase,
          section: w.sections[S.sec] ? w.sections[S.sec].kind : null, sectionIndex: S.sec, sections: w.sections.length, zEnd: w.zEnd,
          collisions: S.collisions, correct: S.correct, tries: S.tries, avoided: S.avoided, iceTotal: w.iceTotal, stars: S.stars, starsTotal: w.starsTotal,
          tokens: S.tokens, score: S.score, waiting: S.waiting, impact: !!S.impact, inv: S.inv, done: S.done, sent: doneSent, running: !!raf, paused: paused,
          frames: S.frames, parts: parts.length, shake: S.shake, zoom: S.zoom, quality: rq, reduced: reduced, difficulty: diff, final: fin, warn: S.warn,
          ease: S.ease, heading: S.head, tutorial: S.tut, challenge: chal ? { answer: chal.answer, wrong: chal.wrong, answered: chal.answered, rung: chal.rung } : null,
          seen: (S.seen || []).slice(), theme: SEA ? themeName : null, sea: !!SEA, wake: trail.length, route: route ? route.value() : null, combo: S.combo || 0, confetti: confetti ? confetti.n : 0, vw: vw, vh: vh,
          ship: shipId || null, art: shipImg ? shipImg.src : null, artReady: ready(shipImg), shipY: shipY, timers: timers.length,
          ctrl: { turn: ctrlSz.turn, boost: ctrlSz.boost, k: ctrlSz.k, old: OLD }, shipRect: shipRect(),
          q: { open: S.qOpen, n: { collide: S.qn.collide, buoy: S.qn.buoy, gate: S.qn.gate }, asked: S.qAsked, right: S.qRight, log: S.qLog.slice(), lastCollideT: S.lastColQ,
            cool: Q_COOL, count: QC.count, on: Object.keys(QC.on), topic: QC.topic, shield: S.shield, boost: S.rewardBoost, bonus: S.bonus, combo: S.qCombo, ease: S.easeT, bumps: S.bumps,
            buoys: w.objs.filter(function (o) { return o.type === 'qbuoy' }).map(function (o) { return { x: Math.round(o.x), z: Math.round(o.z), kind: o.kind, taken: o.taken } }),
            gates: w.objs.filter(function (o) { return o.type === 'lgate' }).map(function (o) { return { z: Math.round(o.z), asked: o.asked, drop: o.drop, open: o.open } }) },
          wall: w.corridor ? w.corridor.wall : null, lastHit: S.lastHit ? { type: S.lastHit.type, x: Math.round(S.lastHit.x), z: Math.round(S.lastHit.z), extra: !!S.lastHit.extra } : null }
      }
    }

    resize()
    hud()
    try {
      var ua = navigator.userActivation
      if (!ua || ua.hasBeenActive) { audio.ensure(); if (audio.ctx && audio.ctx.state === 'running') { audio.startBed(); hornDone = true; audio.horn() } }
    } catch (e) {}
    start()
    return handle
  }

  var TKLanes = { mount: mount, build: build, SECTIONS: SEC, _frames: 0, version: '1.0.0' }
  W.TKLanes = TKLanes
})(window)
