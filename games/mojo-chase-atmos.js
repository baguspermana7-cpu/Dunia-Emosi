/* =============================================================================
 * mojo-chase-atmos.js — window.MojoChaseAtmos: the ATMOSPHERE layer of the G31 "3-Lane Rescue Chase".
 * Time of day on a continuous axis (pagi .. siang .. sore .. senja .. malam), weather with intensity and fades
 * (cerah, berawan, gerimis/hujan, salju, angin sepoi, kabut), seeded per-biome pools, mid-race transitions
 * (sore->malam, cerah->hujan, hujan->pelangi, salju makin tebal) and calm sky life (stars, shooting stars, bird
 * flocks, balloons, dolphins, a train, fireworks...). Tables: games/data/mojo-chase-atmos-data.js.
 *
 * Hook contract (MojoChase.hooks.atmos; every member is optional for the core, all are cheap no-ops when idle):
 *   init(ctx, stage, rng) -> { owns:{sky,stars,sun,clouds,weather}, night0, timeLabel, weatherLabel, chip }
 *   update(dt, state)     state = { t, speed, prog, state, tunnel 0..1, quality 0..2, paused, mojoX?, mojoY? }
 *   drawSky(ctx, view)    after the core sky blit, before FAR: full sky band 0..view.hy + sky life
 *   drawOverlay(ctx, view) after FX, before HUD/post: fog veil, rain, splashes, snow, breeze motes, flash
 *   roadSeg(ctx, s, k, view)  renderRoad overlayFn: queues the wet-road sheen per segment (k < 70); roadSeg(ctx, null, -1) after the road flush paints it
 *   lightsOn() -> 0..1    headlights / tail lights / lamps / windows fade (1 at senja and later)
 *   tint() -> {c, a}|null ambient tint for FAR/MID/props;  telegraph() 0..1;  sway() 0..1;  calm() bool
 *   say                   set by the core: function (text, ms) — Bo callouts
 * Performance: everything pooled (typed arrays, fixed slot objects), no per-frame allocation, rain = one batched
 * path per depth bucket, gradients/sprites baked once, strings rebuilt only when the time/weather bucket changes,
 * no shadowBlur, no filters in the loop. Reduced motion: half the particles, slower, no lightning.
 * ==========================================================================*/
(function (W, D) {
  'use strict'
  var TAU = Math.PI * 2, CAPS = [0.35, 0.6, 1]
  var RM = false; try { RM = !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches) } catch (e) {}
  var A = W.MojoChaseAtmosData
  function clamp (v, a, b) { return v < a ? a : v > b ? b : v }
  function smooth (x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x) }
  function hex (h) { var n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255] }
  function rgb (c) { return 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')' }
  function rgba (c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a.toFixed(3) + ')' }
  function mix (o, a, b, k) { o[0] = a[0] + (b[0] - a[0]) * k; o[1] = a[1] + (b[1] - a[1]) * k; o[2] = a[2] + (b[2] - a[2]) * k; return o }
  function cv (w, h) { var c = D.createElement('canvas'); c.width = w; c.height = h; return c }
  /** the same LCG as MojoChaseRules.rng, so preview(stage, seed) == the plan the core's rng(seed + 11) makes */
  function lcg (seed) { var s = (seed | 0) || 1; return function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff } }
  function pickW (r, obj) { var tot = 0, k, last = null; for (k in obj) tot += obj[k]; var x = r() * tot; for (k in obj) { last = k; x -= obj[k]; if (x <= 0) return k } return last }
  function OFF () { return W.__mcOff && W.__mcOff.atmos }

  /* ── parsed time keys ─────────────────────────────────────────────────────────────────────────── */
  var PT = A.TIMES.map(function (k) {
    return { sky: k.sky.map(hex), glow: k.glow, disc: hex(k.disc), cloud: k.cloud, fog: hex(k.fog[0]), fogD: k.fog[1], tint: hex(k.tint[0]), tintA: k.tint[1],
      sun: k.sun, moon: k.moon, stars: k.stars }
  })
  var TIDX = {}; A.TIMES.forEach(function (k, i) { TIDX[k.id] = i })
  var WOVER = {}; for (var wk in A.WEATHER) WOVER[wk] = hex(A.WEATHER[wk].over)
  var INK_DAY = hex('#3c4658'), INK_SORE = hex('#3a2434'), INK_NIGHT = hex('#141a34'), TRAIN_DAY = hex('#3a3040')

  /* ── baked sprites (once per page) ────────────────────────────────────────────────────────────── */
  var SP = null
  function glow (col, n) {
    var c = cv(n, n), x = c.getContext('2d'), g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2), h = hex(col)
    g.addColorStop(0, rgba(h, 1)); g.addColorStop(0.18, rgba(h, 0.55)); g.addColorStop(0.5, rgba(h, 0.14)); g.addColorStop(1, rgba(h, 0))
    x.fillStyle = g; x.fillRect(0, 0, n, n); return c
  }
  function cloud (lit, shade, v) {
    var c = cv(256, 112), x = c.getContext('2d'), r = lcg(17 + v * 31), g = x.createLinearGradient(0, 18, 0, 104)
    g.addColorStop(0, lit); g.addColorStop(0.55, lit); g.addColorStop(1, shade)
    try { x.filter = 'blur(1.5px)' } catch (e) {}
    x.fillStyle = g; x.beginPath()
    var n = 5 + v
    for (var i = 0; i < n; i++) { var cx = 40 + (176 * i) / (n - 1), rad = 18 + r() * 22 + (i > 0 && i < n - 1 ? 12 : 0); x.moveTo(cx + rad, 86 - rad * 0.5); x.arc(cx, 86 - rad * 0.5, rad, 0, TAU) }
    x.rect(40, 70, 176, 26); x.fill(); return c
  }
  function bake () {
    if (SP) return SP
    SP = { glow: PT.map(function (p) { return glow(p.glow, 128) }), white: glow('#ffffff', 64), warm: glow('#ffd36b', 32), puff: null, cloud: [], moon: cv(160, 160) }
    A.TIMES.forEach(function (k, i) { SP.cloud[i] = [cloud(k.cloud[0], k.cloud[1], 0), cloud(k.cloud[0], k.cloud[1], 1), cloud(k.cloud[0], k.cloud[1], 2)] })
    // moon with its halo baked in: one draw per frame
    var m = SP.moon.getContext('2d'), mh = m.createRadialGradient(80, 80, 20, 80, 80, 80); mh.addColorStop(0, 'rgba(220,230,255,.5)'); mh.addColorStop(0.45, 'rgba(200,215,255,.16)'); mh.addColorStop(1, 'rgba(200,215,255,0)')
    m.fillStyle = mh; m.fillRect(0, 0, 160, 160); m.fillStyle = '#f6f2df'; m.beginPath(); m.arc(80, 80, 24, 0, TAU); m.fill()
    m.fillStyle = '#e0d9bf'; [[72, 74, 5.5], [88, 86, 4], [82, 66, 3], [72, 92, 3]].forEach(function (q) { m.beginPath(); m.arc(q[0], q[1], q[2], 0, TAU); m.fill() })
    // soft puffs (smoke, mist, breath)
    SP.puff = cv(64, 64); var pc = SP.puff.getContext('2d'), pg = pc.createRadialGradient(32, 32, 0, 32, 32, 32); pg.addColorStop(0, 'rgba(255,255,255,.9)'); pg.addColorStop(1, 'rgba(255,255,255,0)'); pc.fillStyle = pg; pc.fillRect(0, 0, 64, 64)
    SP.smoke = cv(64, 64); var sc = SP.smoke.getContext('2d'), sg = sc.createRadialGradient(32, 32, 0, 32, 32, 32); sg.addColorStop(0, 'rgba(92,84,96,.85)'); sg.addColorStop(1, 'rgba(92,84,96,0)'); sc.fillStyle = sg; sc.fillRect(0, 0, 64, 64)
    // shooting-star streak: bright head on the right
    SP.streak = cv(160, 8); var st = SP.streak.getContext('2d'), stg = st.createLinearGradient(0, 0, 160, 0); stg.addColorStop(0, 'rgba(255,255,255,0)'); stg.addColorStop(0.85, 'rgba(220,235,255,.7)'); stg.addColorStop(1, '#ffffff')
    st.fillStyle = stg; st.beginPath(); st.moveTo(0, 4); st.lineTo(156, 1); st.arc(156, 4, 3, -Math.PI / 2, Math.PI / 2); st.lineTo(0, 4); st.fill()
    // god-ray fan
    SP.rays = cv(256, 256); var ry = SP.rays.getContext('2d'), rg = ry.createRadialGradient(128, 128, 8, 128, 128, 128); rg.addColorStop(0, 'rgba(255,240,200,.55)'); rg.addColorStop(1, 'rgba(255,240,200,0)')
    ry.fillStyle = rg; ry.beginPath(); for (var i = 0; i < 14; i++) { var a0 = i / 14 * TAU, a1 = a0 + 0.11 + (i % 3) * 0.05; ry.moveTo(128, 128); ry.arc(128, 128, 128, a0, a1) } ry.fill()
    // rainbow
    SP.rainbow = cv(512, 256); var rb = SP.rainbow.getContext('2d'), RB = ['#ff5a5a', '#ff9f43', '#ffe066', '#6fdc6f', '#4fb8ff', '#6a6cff', '#b06cff']
    rb.lineWidth = 7; for (var b = 0; b < 7; b++) { rb.strokeStyle = RB[b]; rb.beginPath(); rb.arc(256, 256, 236 - b * 7, Math.PI, TAU); rb.stroke() }
    rb.globalCompositeOperation = 'destination-in'; var rf = rb.createLinearGradient(0, 0, 0, 256); rf.addColorStop(0, 'rgba(0,0,0,1)'); rf.addColorStop(0.55, 'rgba(0,0,0,.8)'); rf.addColorStop(1, 'rgba(0,0,0,0)'); rb.fillStyle = rf; rb.fillRect(0, 0, 512, 256)
    // aurora curtains
    SP.aurora = cv(512, 160); var au = SP.aurora.getContext('2d'), ar = lcg(5)
    try { au.filter = 'blur(3px)' } catch (e) {}
    for (var x = 0; x < 512; x += 3) {
      var top = 30 + Math.sin(x / 60) * 22 + Math.sin(x / 23) * 8, len = 60 + ar() * 50, ag = au.createLinearGradient(0, top, 0, top + len), hue = x < 200 ? '120,255,190' : x < 380 ? '90,230,255' : '190,140,255'
      ag.addColorStop(0, 'rgba(' + hue + ',0)'); ag.addColorStop(0.25, 'rgba(' + hue + ',.55)'); ag.addColorStop(1, 'rgba(' + hue + ',0)'); au.fillStyle = ag; au.fillRect(x, top, 3, len)
    }
    // far vehicles and scenery
    SP.balloon = cv(64, 92); var bl = SP.balloon.getContext('2d'); bl.save(); bl.beginPath(); bl.ellipse(32, 30, 26, 29, 0, 0, TAU); bl.clip()
    ;['#ff6b6b', '#ffd166', '#4ecdc4', '#ff6b6b', '#ffd166', '#4ecdc4'].forEach(function (c2, i2) { bl.fillStyle = c2; bl.fillRect(6 + i2 * 9, 0, 9, 64) }); bl.restore()
    bl.strokeStyle = '#6b4a2b'; bl.lineWidth = 1.5; bl.beginPath(); bl.moveTo(14, 50); bl.lineTo(26, 74); bl.moveTo(50, 50); bl.lineTo(38, 74); bl.stroke(); bl.fillStyle = '#8a5a32'; bl.fillRect(25, 74, 14, 11)
    SP.blimp = cv(150, 56); var bp = SP.blimp.getContext('2d'); bp.fillStyle = '#dfe5ee'; bp.beginPath(); bp.ellipse(70, 26, 62, 20, 0, 0, TAU); bp.fill()
    bp.fillStyle = '#ff7a59'; bp.fillRect(30, 22, 80, 7); bp.beginPath(); bp.moveTo(124, 26); bp.lineTo(146, 8); bp.lineTo(146, 44); bp.fill(); bp.fillStyle = '#5a6272'; bp.fillRect(58, 44, 22, 8)
    SP.sail = cv(64, 64); var sl = SP.sail.getContext('2d'); sl.fillStyle = '#ffffff'; sl.beginPath(); sl.moveTo(32, 4); sl.lineTo(32, 46); sl.lineTo(8, 46); sl.fill()
    sl.fillStyle = '#ffd6a0'; sl.beginPath(); sl.moveTo(35, 10); sl.lineTo(35, 46); sl.lineTo(54, 46); sl.fill(); sl.fillStyle = '#c0573e'; sl.beginPath(); sl.moveTo(4, 49); sl.lineTo(60, 49); sl.lineTo(52, 58); sl.lineTo(12, 58); sl.fill()
    SP.dolphin = cv(80, 40); var dp = SP.dolphin.getContext('2d'); dp.fillStyle = '#5a7fa8'; dp.beginPath(); dp.moveTo(4, 24); dp.quadraticCurveTo(30, 6, 62, 16); dp.lineTo(76, 14); dp.lineTo(66, 22)
    dp.quadraticCurveTo(40, 32, 10, 28); dp.lineTo(2, 34); dp.lineTo(4, 24); dp.moveTo(34, 12); dp.lineTo(42, 2); dp.lineTo(46, 13); dp.fill()
    SP.train = [train(false), train(true)]
    SP.planet = cv(200, 200); var pl = SP.planet.getContext('2d'), plg = pl.createRadialGradient(80, 80, 10, 100, 100, 62); plg.addColorStop(0, '#ffcf8a'); plg.addColorStop(1, '#c4607a')
    pl.strokeStyle = 'rgba(255,220,180,.75)'; pl.lineWidth = 7; pl.beginPath(); pl.ellipse(100, 100, 92, 22, -0.35, Math.PI, TAU); pl.stroke()
    pl.fillStyle = plg; pl.beginPath(); pl.arc(100, 100, 58, 0, TAU); pl.fill(); pl.beginPath(); pl.ellipse(100, 100, 92, 22, -0.35, 0, Math.PI); pl.stroke()
    SP.moonlet = cv(48, 48); var ml = SP.moonlet.getContext('2d'); ml.fillStyle = '#9fd8ff'; ml.beginPath(); ml.arc(24, 24, 20, 0, TAU); ml.fill(); ml.fillStyle = '#7ab8e6'; ml.beginPath(); ml.arc(30, 18, 6, 0, TAU); ml.fill()
    return SP
  }
  function train (night) {
    var c = cv(420, 44), x = c.getContext('2d'); x.fillStyle = rgb(TRAIN_DAY)
    x.beginPath(); x.moveTo(4, 36); x.lineTo(4, 14); x.lineTo(20, 8); x.lineTo(62, 8); x.lineTo(62, 36); x.fill()
    for (var i = 0; i < 5; i++) { x.fillRect(66 + i * 70, 10, 66, 26) }
    x.fillRect(0, 36, 420, 4)
    x.fillStyle = night ? '#ffd86b' : 'rgba(200,220,255,.55)'
    for (var j = 0; j < 5; j++) for (var k = 0; k < 4; k++) x.fillRect(72 + j * 70 + k * 15, 15, 10, 8)
    if (night) { x.fillStyle = '#fff3c0'; x.fillRect(4, 22, 6, 6) }
    return c
  }

  /* ── plan: the run's time + weather + transition, from the seeded rng ───────────────────────────── */
  function kindOf (stage) {
    if (!stage) return 'town'
    return A.KIND[stage.id] || (stage.fx === 'space' ? 'space' : null) || A.BY_BIOME[stage.biome] || 'town'
  }
  function makePlan (stage, r, F) {
    var kind = kindOf(stage), P = A.POOL[kind] || A.POOL.town
    var tk = pickW(r, P.times), wk = pickW(r, P.weather), iR = r(), rollT = r(), rollPick = r(), r1 = r(), r2 = r()
    var t = TIDX[tk], I = wk === 'hujan' ? (iR < 0.5 ? 0.4 : 0.95) : wk === 'salju' ? 0.55 + iR * 0.4 : wk === 'kabut' ? 0.6 + iR * 0.3 : 1
    var p = { kind: kind, weather: wk, t0: t, t1: t, tStart: 0, tDur: 1, w0: I, w1: I, wStart: 0, wDur: 1, trans: null, rainbow: false }
    var tr = null
    if (!P.noTrans && rollT < 0.5) {
      var opts = []
      if (P.times.malam) opts.push('sore-malam'); else if (P.times.sore) opts.push('siang-sore')
      if (P.weather.hujan) opts.push('hujan-datang', 'hujan-reda')
      if (P.weather.salju) opts.push('salju-tebal')
      if (opts.length) tr = opts[Math.floor(rollPick * opts.length) % opts.length]
    }
    if (F) {
      if (F.time != null) p.t0 = p.t1 = typeof F.time === 'number' ? F.time : TIDX[F.time]
      if (F.weather) { p.weather = F.weather; p.w0 = p.w1 = F.intensity != null ? F.intensity : (F.weather === 'hujan' ? 0.95 : F.weather === 'cerah' ? 1 : 0.85) }
      tr = F.trans !== undefined ? F.trans : (F.time != null || F.weather ? null : tr)
    }
    if (tr === 'sore-malam') { p.t0 = Math.min(p.t0, 2); p.t1 = 4; p.tStart = 6 + r1 * 8; p.tDur = 40 + r2 * 20 }
    else if (tr === 'siang-sore') { p.t0 = 1; p.t1 = 2; p.tStart = 6 + r1 * 8; p.tDur = 40 + r2 * 20 }
    else if (tr === 'hujan-datang') { p.weather = 'hujan'; p.w0 = 0; p.w1 = 1; p.wStart = 8 + r1 * 10; p.wDur = 40 + r2 * 15 }
    else if (tr === 'hujan-reda') { p.weather = 'hujan'; p.w0 = 1; p.w1 = 0; p.wStart = 12 + r1 * 10; p.wDur = 22 + r2 * 10; p.rainbow = p.t0 < 2.9; if (p.t0 > 2.6) p.t0 = p.t1 = 1 }
    else if (tr === 'salju-tebal') { p.weather = 'salju'; p.w0 = 0.2; p.w1 = 1; p.wStart = 4 + r1 * 6; p.wDur = 40 + r2 * 15 }
    p.trans = tr || null
    p.baseT = stage && stage.night ? 4 : STAGE_T[stage && stage.sky] != null ? STAGE_T[stage.sky] : 1
    p.baseOver = stage && (stage.sky === 'rain' || stage.weather === 'rain') ? 0.4 : stage && stage.sky === 'cloudy' ? 0.15 : 0
    if (!skyPre() && stage && STAGE_W[stage.weather] && !(F && F.weather)) {   // late-sky core: its own weather keeps running, so the plan matches it
      p.weather = STAGE_W[stage.weather]; p.w0 = p.w1 = 0.9; p.coreW = true; p.rainbow = false
      if (tr && tr !== 'sore-malam' && tr !== 'siang-sore') { tr = null; p.trans = null }
    }
    if (F && F.tStart != null) { p.tStart = F.tStart; p.wStart = F.tStart }
    if (F && F.tDur != null) { p.tDur = F.tDur; p.wDur = F.tDur }
    return p
  }
  // the core's own stage.weather -> our weather key; skyPre() = the core honours owns{} and calls drawSky before FAR
  var STAGE_W = { rain: 'hujan', snow: 'salju', leaves: 'angin', petals: 'angin', dust: 'angin' }
  function skyPre () { return !!(W.MojoChase && W.MojoChase.atmosPre) }
  // the stage's own painted look as a point on our axes (for the late-sky grade: only the difference is painted)
  var STAGE_T = { clear: 1, cloudy: 1, sunset: 2, night: 4, rain: 1, snow: 1 }
  function labels (p) {
    var tl = A.TIMES[Math.round(p.t0)].label + (p.t1 !== p.t0 ? ' ke ' + A.TIMES[Math.round(p.t1)].label : '')
    var WD = A.WEATHER[p.weather], wl = p.trans && A.TRANS[p.trans].needWeather ? A.TRANS[p.trans].label : (p.weather === 'hujan' && p.w0 < 0.55 ? WD.soft : WD.label)
    return { timeLabel: tl, weatherLabel: wl, chip: tl + ' · ' + wl }
  }

  /* ── runtime (one chase at a time) ─────────────────────────────────────────────────────────────── */
  // readability caps (coordinator 2026-10-03): fog veil <= 0.35 and only above hy + 12% h; rain veil <= 0.25;
  // the road wash only darkens and stays <= 0.32; nothing is drawn outside the chase canvas (no DOM)
  var FOG_MAX = 0.35, VEIL_MAX = 0.25, GROUND_MAX = 0.32
  var MAXR = 170, MAXS = 140, MAXM = 28, MAXSP = 20, MAXSM = 8, MAXC = 18
  var RX = new Float32Array(MAXR), RY = new Float32Array(MAXR), RZ = new Float32Array(MAXR)
  var SX = new Float32Array(MAXS), SY = new Float32Array(MAXS), SZ = new Float32Array(MAXS), SPH = new Float32Array(MAXS)
  var MX = new Float32Array(MAXM), MY = new Float32Array(MAXM), MR = new Float32Array(MAXM), MV = new Float32Array(MAXM), MS = new Float32Array(MAXM)
  var PX = new Float32Array(MAXSP), PY = new Float32Array(MAXSP), PA = new Float32Array(MAXSP)
  var KX = new Float32Array(MAXSM), KY = new Float32Array(MAXSM), KA = new Float32Array(MAXSM)
  var CX = new Float32Array(MAXC), CY = new Float32Array(MAXC), CP = new Float32Array(MAXC)
  var NST = 110, STX = new Float32Array(NST), STY = new Float32Array(NST)
  var NCL = 6, CLX = new Float32Array(NCL), CLY = new Float32Array(NCL), CLS = new Float32Array(NCL), CLV = new Float32Array(NCL), CLSP = new Float32Array(NCL)
  var SLOTS = [0, 1, 2].map(function () { return { on: false, type: '', age: 0, life: 1, x: 0, y: 0, dir: 1, n: 0, s: 0, a: new Float32Array(40) } })
  var R = { on: false, plan: null, P: null, clock: 0, t: 1, wI: 0, light: 0, q: 1, qi: 2, tunnel: 0, st: '', prog: 0, wet: 0, lr: Math.random,
    spawnT: 4, shootT: 6, calmT: 0, lastMoment: -99, lastSay: -99, sayQ: null, sayAge: 0, flash: 0, boltT: 15, rbAge: -1, rbDone: false,
    breathT: 0, mojoX: -1, mojoY: -1, curve: 0, hyF: 0.4, motes: null, calls: { init: 0, update: 0, sky: 0, over: 0, road: 0 }, crossed: {}, prof: null }
  var TINT = { c: '#000000', a: 0 }
  var WHITE = [255, 255, 255]
  var DV = { tq: -1, wq: -1, ver: 0, s: ['', '', ''], g: ['', '', '', ''], f: ['', ''], gs: null, gg: null, gf: null, gsK: '', ggK: '', gfK: '', sky: null, sunX: 0, sunY: 0, sunS: 0, sunA: 0, gi: 0, gk: 0, moonX: 0, moonY: 0, moonA: 0, starA: 0,
    disc: '#fff', ink: '#000', inkF: '#000', sheen: '#fff', fog: null, fogStr: '', over: 0, cover: 0, cloudA: 0.9 }
  var T0 = [0, 0, 0], T1 = [0, 0, 0], T2 = [0, 0, 0], T3 = [0, 0, 0]

  function wVis () { var w = R.plan.weather; return w === 'hujan' || w === 'kabut' || w === 'salju' ? R.wI : 1 }
  function derive () {
    var t = R.t, i = Math.min(3, Math.floor(t)), k = t - i, a = PT[i], b = PT[i + 1], WD = A.WEATHER[R.plan.weather], wv = wVis()
    // continuous values (numbers only)
    DV.sunX = a.sun[0] + (b.sun[0] - a.sun[0]) * k; DV.sunY = a.sun[1] + (b.sun[1] - a.sun[1]) * k; DV.sunS = a.sun[2] + (b.sun[2] - a.sun[2]) * k
    DV.sunA = a.sun[3] + (b.sun[3] - a.sun[3]) * k; DV.gi = i; DV.gk = k
    DV.moonX = a.moon[0] + (b.moon[0] - a.moon[0]) * k; DV.moonY = a.moon[1] + (b.moon[1] - a.moon[1]) * k; DV.moonA = a.moon[2] + (b.moon[2] - a.moon[2]) * k
    DV.over = WD.darken * wv; DV.cover = WD.cover * (R.plan.weather === 'hujan' ? 0.4 + 0.6 * wv : 1)
    DV.starA = (a.stars + (b.stars - a.stars) * k) * (1 - DV.cover * 0.85)
    // bucketed strings + the sky strip
    var tq = Math.round(t * 48), wq = Math.round(wv * 24)
    if (tq === DV.tq && wq === DV.wq) return
    DV.tq = tq; DV.wq = wq; DV.ver++
    var ov = WOVER[R.plan.weather], od = DV.over
    // gradient stops only (strings); the CanvasGradient objects are made at draw time when ver or hy changes —
    // a gradient fillRect rasterises ~2x cheaper than stretching a strip canvas over the band
    mix(T3, mix(T0, a.sky[0], b.sky[0], k), ov, od); DV.s[0] = rgb(T3)
    mix(T3, mix(T0, a.sky[1], b.sky[1], k), ov, od); DV.s[1] = rgb(T3)
    mix(T3, mix(T0, a.sky[2], b.sky[2], k), ov, od * 0.8); DV.s[2] = rgb(T3)
    DV.sheen = rgb(mix(T1, T3, WHITE, 0.35))
    DV.disc = rgb(mix(T0, a.disc, b.disc, k))
    // silhouettes: day blue-grey -> sore plum -> night ink
    if (t < 2) mix(T2, INK_DAY, INK_SORE, smooth(t - 1)); else mix(T2, INK_SORE, INK_NIGHT, smooth((t - 2.4) / 1.4)); DV.ink = rgb(T2)
    DV.inkF = rgba(mix(T1, T2, T3, 0.45), 0.85)
    // ambient tint for FAR/MID/props
    mix(T0, a.tint, b.tint, k); var ta = a.tintA + (b.tintA - a.tintA) * k
    mix(T0, T0, ov, clamp(od * 1.4, 0, 1)); TINT.a = clamp(ta + od * 0.35, 0, 0.6); TINT.c = rgb(T0)
    mix(T1, mix(T2, a.fog, b.fog, k), ov, R.plan.weather === 'kabut' ? 0.6 : 0); DV.fogStr = rgb(T1)
    DV.f[0] = rgba(T1, 0); DV.f[1] = rgba(T1, 1)
    DV.cloudA = t > 3 ? 0.9 - (t - 3) * 0.25 : 0.92
    // late-sky grade: our sky over the core's painted sky + FAR/MID, strong only where we differ from the stage look
    var dT = Math.abs(t - R.plan.baseT), dW = Math.max(0, od - R.plan.baseOver), gA = clamp(dT * 0.42 + dW * 1.1, 0, 0.86)
    DV.gradeA = gA
    if (gA > 0.01) {
      mix(T3, mix(T2, a.sky[0], b.sky[0], k), ov, od); DV.g[0] = rgba(T3, gA)
      mix(T3, mix(T2, a.sky[1], b.sky[1], k), ov, od); DV.g[1] = rgba(T3, gA * 0.95)
      mix(T3, mix(T2, a.sky[2], b.sky[2], k), ov, od * 0.8); DV.g[2] = rgba(T3, gA * 0.78)
      DV.g[3] = rgba(T0, Math.max(TINT.a, gA * 0.55))
      // the road wash only ever DARKENS (dusk/night/storm); a light tint (pagi cream, snow white) never washes the road
      var lum = (0.2126 * T0[0] + 0.7152 * T0[1] + 0.0722 * T0[2]) / 255
      DV.groundStr = TINT.c; DV.groundA = lum < 0.42 ? Math.min(GROUND_MAX, TINT.a * 0.85) : 0
    } else DV.groundA = 0
  }

  function say (text, force) {
    if (R.clock - R.lastSay < 4 && !force) { R.sayQ = text; R.sayAge = 0; return }
    var f = HOOK.say, ap = R.api
    if ((typeof f === 'function' || (ap && ap.call)) && R.st === 'active') { try { if (f) f(text, 2400); else ap.call(text, 2400) } catch (e) {} R.lastSay = R.clock; R.sayQ = null; R.stats.said++ ; R.stats.lastSay = text }
    else { R.sayQ = text; R.sayAge = 0 }
  }
  function crossUp (key, v, th) { var was = R.crossed[key]; R.crossed[key] = v >= th; return !was && v >= th && was !== undefined }

  function init (ctx, stage, rng, api) {
    bake()
    R.api = api && typeof api === 'object' ? api : null; R.preSeen = false
    var r = typeof rng === 'function' ? rng : lcg(((stage && stage.seed) || 7) + 11)
    R.plan = makePlan(stage, r, FORCE)
    R.P = A.POOL[R.plan.kind] || A.POOL.town
    R.lr = lcg((r() * 2147483647) | 0)
    R.motes = R.P.motes ? A.MOTES[R.P.motes] : null
    R.on = true; R.clock = 0; R.calmT = 0; R.lastMoment = -99; R.lastSay = -99; R.sayQ = null; R.flash = 0; R.boltT = 10 + R.lr() * 10
    R.rbAge = -1; R.rbDone = false; R.spawnT = 3 + R.lr() * 4; R.shootT = 3 + R.lr() * 5; R.wet = R.plan.weather === 'hujan' ? R.plan.w0 : 0; R.crossed = {}
    R.stats = { said: 0, lastSay: '', moments: 0, spawned: {}, maxAlive: 0, lightning: 0 }
    R.calls.init++
    for (var s = 0; s < 3; s++) SLOTS[s].on = false
    var i
    for (i = 0; i < NST; i++) { STX[i] = R.lr(); STY[i] = Math.pow(R.lr(), 1.3) * 0.78 }
    for (i = 0; i < NCL; i++) { CLX[i] = R.lr(); CLY[i] = 0.06 + R.lr() * 0.42; CLS[i] = 0.22 + R.lr() * 0.2; CLV[i] = i % 3; CLSP[i] = 0.4 + R.lr() * 0.8 }
    for (i = 0; i < MAXR; i++) { RX[i] = Math.random() * 1.2 - 0.1; RY[i] = Math.random() * 1.1 - 0.1; RZ[i] = 0.25 + Math.random() * 0.75 }
    for (i = 0; i < MAXS; i++) { SX[i] = Math.random(); SY[i] = Math.random(); SZ[i] = 0.2 + Math.random() * 0.8; SPH[i] = Math.random() * TAU }
    for (i = 0; i < MAXM; i++) { MX[i] = Math.random(); MY[i] = Math.random(); MR[i] = Math.random() * TAU; MV[i] = (Math.random() - 0.5) * 6; MS[i] = 0.6 + Math.random() * 0.6 }
    for (i = 0; i < MAXSP; i++) PA[i] = 9
    for (i = 0; i < MAXSM; i++) { KA[i] = 9; KX[i] = 0; KY[i] = 0 }
    for (i = 0; i < MAXC; i++) { CX[i] = R.lr(); CY[i] = R.lr(); CP[i] = R.lr() * TAU }
    R.t = R.plan.t0; R.wI = R.plan.w0; DV.tq = -1; derive()
    R.light = lightAt(); R.crossed.light = R.light >= 0.5; R.crossed.rain = R.plan.weather === 'hujan' && R.wI >= 0.15; R.crossed.snow = R.wI >= 0.7
    var L = labels(R.plan); R.chip = L.chip
    return { owns: { sky: true, stars: true, sun: true, clouds: true, weather: true }, night0: R.t >= 3.5, timeLabel: L.timeLabel, weatherLabel: L.weatherLabel, chip: L.chip, plan: R.plan }
  }
  function lightAt () { var l = smooth((R.t - 2.55) / 0.45); if (R.plan.weather === 'hujan') l = Math.max(l, 0.7 * smooth((R.wI - 0.6) / 0.35)); return l }

  /* ── update ──────────────────────────────────────────────────────────────────────────────────── */
  function update (dt, st) {
    if (!R.on || !st || st.paused) return
    var p0 = R.prof ? performance.now() : 0
    R.calls.update++
    dt = dt > 0.1 ? 0.1 : dt < 0 ? 0 : dt
    var qi = st.quality == null ? 2 : st.quality; R.qi = qi; R.q = CAPS[qi] * (RM ? 0.5 : 1)
    R.tunnel = st.tunnel || 0; R.st = st.state || ''; R.prog = st.prog || 0
    if (st.mojoX != null) { R.mojoX = st.mojoX; R.mojoY = st.mojoY }
    R.clock += dt
    var p = R.plan
    R.t = p.t0 + (p.t1 - p.t0) * smooth((R.clock - p.tStart) / p.tDur)
    R.wI = p.w0 + (p.w1 - p.w0) * smooth((R.clock - p.wStart) / p.wDur)
    derive()
    R.light = lightAt()
    // callouts on crossings (never on the opening frame)
    if (crossUp('light', R.light, 0.5)) say(A.SAY.night)
    if (p.weather === 'hujan' && crossUp('rain', R.wI, 0.15)) say(A.SAY.rainStart)
    if (p.trans === 'salju-tebal' && crossUp('snow', R.wI, 0.7)) say(A.SAY.snow)
    if (p.trans === 'sore-malam' && crossUp('sunset', R.clock, p.tStart + 2)) say(A.SAY.sunset)
    if (R.sayQ) { R.sayAge += dt; if (R.sayAge > 10) R.sayQ = null; else if (R.st === 'active' && R.clock - R.lastSay >= 4) say(R.sayQ) }
    // wet road follows the rain (dries slowly)
    var wetT = p.weather === 'hujan' ? smooth(R.wI / 0.6) : 0
    R.wet += (wetT - R.wet) * Math.min(1, dt * (wetT > R.wet ? 0.35 : 0.06))
    stepWeather(dt)
    stepLife(dt)
    if (R.calmT > 0) R.calmT -= dt
    if (R.prof) R.prof.upd = R.prof.upd * 0.95 + (performance.now() - p0) * 0.05
  }

  function moment (text) {
    if (R.clock - R.lastMoment < 30 || R.st !== 'active' || R.prog > 0.85 || R.clock < 6) return
    R.lastMoment = R.clock; R.calmT = 3; R.stats.moments++; say(text, true)
    if (R.api && R.api.clearAhead) try { R.api.clearAhead(3) } catch (e) {}
  }

  function stepWeather (dt) {
    var w = R.plan.weather, i, sp = RM ? 0.6 : 1, vis = 1 - clamp(R.tunnel * 1.4, 0, 1)
    if (w === 'hujan' && R.wI > 0.01) {
      var n = Math.round(MAXR * R.q * R.wI * vis), vy
      for (i = 0; i < n; i++) {
        vy = (1.5 + 1.3 * RZ[i]) * sp; RY[i] += vy * dt; RX[i] -= vy * 0.16 * dt
        if (RY[i] > 1.04) { RY[i] = -0.05 - Math.random() * 0.08; RX[i] = Math.random() * 1.25 - 0.05 }
      }
      R.rainN = n
      if (R.wI > 0.3 && vis > 0.5 && Math.random() < dt * 34 * R.q * R.wI) { for (i = 0; i < MAXSP; i++) if (PA[i] >= 0.4) { var u = Math.pow(Math.random(), 0.7); PY[i] = 0.12 + 0.88 * u; PX[i] = 0.5 + (Math.random() - 0.5) * (0.5 + u * 0.9); PA[i] = 0; break } }
      if (R.wI > 0.75 && !RM && vis > 0.7) { R.boltT -= dt; if (R.boltT <= 0) { R.flash = 0.0001; R.boltT = 14 + R.lr() * 12; R.stats.lightning++ } }
    } else R.rainN = 0
    for (i = 0; i < MAXSP; i++) if (PA[i] < 0.4) PA[i] += dt
    if (R.flash > 0) { R.flash += dt; if (R.flash > 0.45) R.flash = 0 }
    if (w === 'salju') {
      var ns = Math.round(MAXS * R.q * Math.max(0.15, R.wI) * vis)
      for (i = 0; i < ns; i++) {
        SY[i] += (0.05 + 0.11 * SZ[i]) * sp * dt; SX[i] += (Math.sin(R.clock * 0.8 + SPH[i]) * 0.02 * SZ[i] - 0.012) * sp * dt
        if (SY[i] > 1.02) { SY[i] = -0.02; SX[i] = Math.random() * 1.1 }
        if (SX[i] < -0.02) SX[i] += 1.04
      }
      R.snowN = ns
      // breath puffs from Mojo (only when the core reports where Mojo is)
      if (R.mojoX >= 0) { R.breathT -= dt; if (R.breathT <= 0) { R.breathT = 1.3; for (i = 0; i < 4; i++) if (KA[i] >= 1.6) { KX[i] = R.mojoX; KY[i] = R.mojoY; KA[i] = 0; break } } }
    } else R.snowN = 0
    if (w === 'salju') for (i = 0; i < 4; i++) if (KA[i] < 1.6) KA[i] += dt
    if (R.motes && (w === 'angin' || (w === 'cerah' && R.motes.leaf))) {
      var nm = Math.round((w === 'angin' ? MAXM : 8) * R.q * vis)
      for (i = 0; i < nm; i++) {
        MX[i] += (0.09 + 0.05 * MS[i]) * sp * dt; MY[i] += (0.05 + 0.04 * Math.sin(R.clock * 1.3 + i)) * sp * dt; MR[i] += MV[i] * dt * sp
        if (MX[i] > 1.04 || MY[i] > 1.04) { MX[i] = -0.04 + Math.random() * 0.3; MY[i] = Math.random() * 0.6 - 0.1 }
      }
      R.moteN = nm
    } else R.moteN = 0
  }
  function has (amb) { var a = R.P.ambient; return !!a && a.indexOf(amb) >= 0 }

  /* ── sky life ─────────────────────────────────────────────────────────────────────────────────── */
  function lifeOk (type) {
    var L = A.LIFE[type], w = R.plan.weather, wet = w === 'hujan' && R.wI > 0.25, snowy = w === 'salju' && R.wI > 0.5
    if (!L || R.t < L.t[0] || R.t > L.t[1]) return false
    if (type === 'shoot') return DV.starA > 0.45
    if (type === 'fireflies' || type === 'satellite' || type === 'train') return !wet
    if (type === 'fireworks') return !wet && R.t > 2.7
    if (wet || snowy || w === 'kabut') return type === 'plane'
    return true
  }
  function alive (type) { for (var s = 0; s < 3; s++) if (SLOTS[s].on && SLOTS[s].type === type) return true; return false }
  function spawn (type) {
    var S = null, max = R.qi === 0 ? 2 : 3, n = 0
    for (var s = 0; s < 3; s++) { if (SLOTS[s].on) n++; else if (!S && s < max) S = SLOTS[s] }
    if (!S || n >= max) return false
    var r = R.lr, L = A.LIFE[type]
    S.on = true; S.type = type; S.age = 0; S.life = L.life; S.dir = r() < 0.5 ? -1 : 1; S.x = r(); S.y = r(); S.n = 0; S.s = r()
    if (type === 'flock') S.n = 5 + Math.floor(r() * 4)
    else if (type === 'gulls') S.n = 2 + Math.floor(r() * 2)
    else if (type === 'butterfly') S.n = 2
    else if (type === 'fireflies') S.n = R.qi === 0 ? 6 : 10
    else if (type === 'fireworks') S.n = R.qi === 0 ? 12 : 18
    for (var i = 0; i < 40; i++) S.a[i] = r()
    R.stats.spawned[type] = (R.stats.spawned[type] || 0) + 1
    if (L.moment) moment(L.moment)
    return true
  }
  function stepLife (dt) {
    var n = 0, s
    for (s = 0; s < 3; s++) { var S = SLOTS[s]; if (!S.on) continue; S.age += dt; if (S.age >= S.life) S.on = false; else n++ }
    if (n > R.stats.maxAlive) R.stats.maxAlive = n
    R.shootT -= dt; R.spawnT -= dt
    var life = R.P.life
    if (R.shootT <= 0) { R.shootT = 8 + R.lr() * 7; if (life.indexOf('shoot') >= 0 && lifeOk('shoot')) spawn('shoot') }
    if (R.spawnT <= 0) {
      R.spawnT = (RM ? 9 : 5) + R.lr() * 6
      var tot = 0, k, L
      for (k = 0; k < life.length; k++) if (life[k] !== 'shoot' && !alive(life[k]) && lifeOk(life[k])) tot += A.LIFE[life[k]].w
      if (tot > 0) { var x = R.lr() * tot; for (k = 0; k < life.length; k++) { L = life[k]; if (L === 'shoot' || alive(L) || !lifeOk(L)) continue; x -= A.LIFE[L].w; if (x <= 0) { spawn(L); break } } }
    }
    // rainbow once the rain has cleared
    if (R.plan.rainbow && !R.rbDone && R.rbAge < 0 && R.wI < 0.12 && R.clock > R.plan.wStart) { R.rbAge = 0; R.lastMoment = -99; moment(A.SAY.rainStop) }
    if (R.rbAge >= 0) { R.rbAge += dt; if (R.rbAge > 30) { R.rbAge = -1; R.rbDone = true } }
  }

  /* ── draw: sky band ──────────────────────────────────────────────────────────────────────────── */
  function env (age, life, fin, fout) { return Math.min(1, age / fin, (life - age) / fout) }
  function drawSky (c, v, mode) {
    if (!R.on || OFF()) return
    var pre = mode === 'pre' || v.skyPre === true || skyPre(); R.preSeen = pre
    var p0 = R.prof ? performance.now() : 0
    R.calls.sky++
    var w = v.w, hy = v.hy, pr = v.pr || 1, curve = v.curveOff || 0, i, x, y, a, s
    R.hyF = hy / v.h
    var hk = DV.ver * 4096 + Math.round(hy)
    if (pre) {
      if (DV.gsK !== hk) { DV.gsK = hk; DV.gs = c.createLinearGradient(0, 0, 0, hy); DV.gs.addColorStop(0, DV.s[0]); DV.gs.addColorStop(0.58, DV.s[1]); DV.gs.addColorStop(1, DV.s[2]) }
      c.fillStyle = DV.gs; c.fillRect(0, 0, w, hy + 2)
    } else if (DV.gradeA > 0.01) {
      if (DV.ggK !== hk) { DV.ggK = hk; DV.gg = c.createLinearGradient(0, 0, 0, hy); DV.gg.addColorStop(0, DV.g[0]); DV.gg.addColorStop(0.5, DV.g[1]); DV.gg.addColorStop(0.82, DV.g[2]); DV.gg.addColorStop(1, DV.g[3]) }
      c.fillStyle = DV.gg; c.fillRect(0, 0, w, hy + 2)
    }
    var starH = pre ? hy : hy * 0.55
    // stars: three twinkle buckets, one fill each
    if (DV.starA > 0.02) {
      c.fillStyle = '#ffffff'
      for (var b = 0; b < 3; b++) {
        // fillRect per star, not one path of 37 rects: the GPU batches rect draws, while a many-subpath fill goes
        // through the path renderer every frame (measured: the single largest raster cost of night + rain)
        c.globalAlpha = DV.starA * (0.55 + 0.45 * Math.sin(R.clock * (1.3 + b * 0.5) + b * 2.1))
        var sz = pr * (b === 0 ? 2.2 : 1.5)
        for (i = b; i < NST; i += 3) c.fillRect(((STX[i] * w - curve * w * 0.001) % w + w) % w, STY[i] * starH, sz, sz)
      }
      c.globalAlpha = 1
    }
    if (R.P.ambient && DV.starA > 0.25 && R.qi > 0 && has('aurora')) {
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = DV.starA * 0.5 * (0.75 + 0.25 * Math.sin(R.clock * 0.35))
      x = Math.sin(R.clock * 0.05) * w * 0.05; c.drawImage(SP.aurora, x - w * 0.1, 0, w * 1.2, hy * 0.62)
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'
    }
    if (has('planets')) {
      x = ((w * 0.2 - curve * w * 0.004) % (w * 1.4) + w * 1.4) % (w * 1.4) - w * 0.2; s = w * 0.26
      c.drawImage(SP.planet, x - s / 2, hy * 0.28 - s / 2, s, s); c.drawImage(SP.moonlet, x + w * 0.42, hy * 0.12, w * 0.05, w * 0.05)
    }
    // moon + halo
    if (DV.moonA > 0.02) {
      x = DV.moonX * w; y = DV.moonY * hy; a = DV.moonA * (1 - DV.cover * 0.6); s = Math.min(w, hy * 2) * 0.1
      c.globalAlpha = a; c.drawImage(SP.moon, x - s * 1.66, y - s * 1.66, s * 3.33, s * 3.33); c.globalAlpha = 1
    }
    // sun bloom (crossfade of the two key glows) + disc + god rays
    var vis = 1 - DV.over * 0.9
    if (pre && DV.sunA > 0.02 && DV.sunY < 1.15) {
      x = DV.sunX * w - curve * w * 0.002 % w; y = DV.sunY * hy; s = DV.sunS * w
      c.globalCompositeOperation = 'lighter'
      if (R.qi > 1 && !RM) {
        var rw = Math.max(0, 1 - Math.abs(R.t - 2) / 0.9, 1 - R.t / 0.9) * (1 - DV.cover) * 0.22
        if (rw > 0.01) { c.globalAlpha = rw; c.save(); c.translate(x, y); c.rotate(R.clock * 0.025); c.drawImage(SP.rays, -w * 0.4, -w * 0.4, w * 0.8, w * 0.8); c.restore() }
      }
      var g2 = DV.gk > 0.5 ? DV.gi + 1 : DV.gi   // one bloom sprite (fill-rate): the nearer key's colour
      c.globalAlpha = DV.sunA * vis; c.drawImage(SP.glow[g2], x - s / 2, y - s / 2, s, s)
      c.globalCompositeOperation = 'source-over'
      c.globalAlpha = DV.sunA * vis; c.fillStyle = DV.disc; c.beginPath(); c.arc(x, y, s * 0.075, 0, TAU); c.fill(); c.globalAlpha = 1
    }
    // clouds: two baked key sprites crossfaded
    var nc = pre ? Math.min(NCL, Math.round(1.5 + DV.cover * 3) + (R.qi === 0 ? -1 : 0)) : 0, ca = DV.cloudA
    for (i = 0; i < nc; i++) {
      var cw = CLS[i] * w * (1 + DV.cover * 0.5), span = w + cw
      x = ((CLX[i] * span + R.clock * CLSP[i] * w * 0.006 - curve * w * 0.01) % span + span) % span - cw; y = CLY[i] * hy * (1 - DV.cover * 0.35)
      // crossfade the two key sprites only while the time is moving between keys; otherwise one draw
      if (DV.gk < 0.06 || DV.gk > 0.94 || R.plan.t0 === R.plan.t1) { c.globalAlpha = ca; c.drawImage(SP.cloud[DV.gk > 0.5 ? DV.gi + 1 : DV.gi][CLV[i]], x, y, cw, cw * 0.44) }
      else { c.globalAlpha = ca * (1 - DV.gk); c.drawImage(SP.cloud[DV.gi][CLV[i]], x, y, cw, cw * 0.44); c.globalAlpha = ca * DV.gk; c.drawImage(SP.cloud[DV.gi + 1][CLV[i]], x, y, cw, cw * 0.44) }
    }
    c.globalAlpha = 1
    if (R.rbAge >= 0) { c.globalAlpha = 0.5 * env(R.rbAge, 30, 4, 6); c.drawImage(SP.rainbow, w * 0.18, hy * 0.18, w * 0.95, hy * 0.82); c.globalAlpha = 1 }
    drawAmbient(c, w, hy, pr, curve)
    for (var k = 0; k < 3; k++) if (SLOTS[k].on) drawLife(c, SLOTS[k], w, hy, pr)
    if (R.flash > 0 && flashA() > 0.004) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = flashA() * 1.6; c.fillStyle = '#c9d6ff'; c.fillRect(0, 0, w, hy); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over' }
    if (R.prof) R.prof.sky = R.prof.sky * 0.95 + (performance.now() - p0) * 0.05
  }
  function flashA () { var f = R.flash; return f < 0.08 ? 0.12 : f < 0.15 ? 0.03 : f < 0.26 ? 0.09 : Math.max(0, 0.09 * (1 - (f - 0.26) / 0.19)) }

  function drawAmbient (c, w, hy, pr, curve) {
    var i, x, y, s
    if (has('turbines')) {
      c.strokeStyle = DV.inkF; c.lineWidth = Math.max(1, pr * 1.6); c.beginPath()
      for (i = 0; i < 3; i++) {
        x = (((0.12 + i * 0.36) * w - curve * w * 0.006) % (w * 1.08) + w * 1.08) % (w * 1.08) - w * 0.04; y = hy * (0.9 - i * 0.03); s = hy * (0.15 - i * 0.02)
        c.moveTo(x, y); c.lineTo(x, y - s)
        var an = R.clock * (0.9 + 0.8 * (R.plan.weather === 'angin' ? R.wI : 0.3)) * (RM ? 0.5 : 1) + i * 1.7
        for (var b = 0; b < 3; b++) { var a = an + b * TAU / 3; c.moveTo(x, y - s); c.lineTo(x + Math.cos(a) * s * 0.55, y - s + Math.sin(a) * s * 0.55) }
      }
      c.stroke()
    }
    if (has('smoke')) {
      var ex = w * 0.3 - curve * w * 0.003 % w, ey = hy * 0.66, n = R.qi === 0 ? 4 : MAXSM
      for (i = 0; i < n; i++) {
        var ph = ((R.clock * 0.12 + i / n) % 1)
        s = hy * (0.06 + ph * 0.22); c.globalAlpha = 0.42 * Math.sin(ph * Math.PI)
        c.drawImage(SP.smoke, ex + ph * w * 0.08 + Math.sin(i * 2.3) * w * 0.01 - s / 2, ey - ph * hy * 0.5 - s / 2, s, s)
      }
      c.globalCompositeOperation = 'lighter'
      for (i = 0; i < 6; i++) { var e = (R.clock * 0.3 + i / 6) % 1; c.globalAlpha = 0.8 * (1 - e); s = pr * 6; c.drawImage(SP.warm, ex + Math.sin(i * 4.1 + e * 3) * w * 0.03 - s, ey - e * hy * 0.3 - s, s * 2, s * 2) }
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1
    }
    if (has('mist')) {
      c.globalAlpha = 0.22 + 0.06 * Math.sin(R.clock * 0.9); s = hy * 0.28
      x = w * 0.84 - curve * w * 0.004 % w; c.drawImage(SP.puff, x - s / 2, hy * 0.78 - s / 2, s, s); c.drawImage(SP.puff, x - s * 0.3, hy * 0.86 - s * 0.4, s * 0.8, s * 0.8); c.globalAlpha = 1
    }
    if (has('confetti')) {
      var COL = ['#ff7eb6', '#7ee0ff', '#ffe066'], nc = R.qi === 0 ? 9 : MAXC
      for (var k = 0; k < 3; k++) {
        c.fillStyle = COL[k]; c.beginPath()
        for (i = k; i < nc; i += 3) { y = ((CY[i] + R.clock * 0.03 * (RM ? 0.5 : 1)) % 1) * hy * 0.9; x = (CX[i] + Math.sin(R.clock + CP[i]) * 0.01) * w; s = pr * (3 + 2 * Math.abs(Math.sin(R.clock * 2 + CP[i]))); c.rect(x, y, s, pr * 3) }
        c.globalAlpha = 0.75; c.fill()
      }
      c.globalAlpha = 1
    }
  }

  function bird (c, x, y, s, f) { c.moveTo(x - s, y - f * s * 0.55); c.quadraticCurveTo(x - s * 0.45, y - f * s * 0.2, x, y + s * 0.18); c.quadraticCurveTo(x + s * 0.45, y - f * s * 0.2, x + s, y - f * s * 0.55) }
  function drawLife (c, S, w, hy, pr) {
    var u = S.age / S.life, e = env(S.age, S.life, Math.min(1.5, S.life * 0.2), Math.min(2, S.life * 0.25)), x, y, s, i, k
    switch (S.type) {
      case 'shoot': {
        var x0 = (0.15 + S.x * 0.7) * w, y0 = (0.05 + S.y * 0.22) * hy, dx = S.dir * 0.42 * w, dy = 0.24 * hy
        x = x0 + dx * u; y = y0 + dy * u; var ang = Math.atan2(dy, dx), L = w * 0.16
        c.save(); c.translate(x, y); c.rotate(ang); c.globalAlpha = Math.sin(u * Math.PI) * DV.starA; c.drawImage(SP.streak, -L, -pr * 2, L, pr * 4); c.restore(); c.globalAlpha = 1
        break
      }
      case 'flock': case 'gulls': {
        var gull = S.type === 'gulls', sx = S.dir > 0 ? -0.15 : 1.15
        x = (sx + S.dir * u * 1.3) * w; y = (0.18 + S.y * 0.32) * hy + Math.sin(S.age * 0.5) * hy * 0.03; s = w * (gull ? 0.016 : 0.012) * (0.85 + S.s * 0.3)
        c.beginPath()
        for (i = 0; i < S.n; i++) {
          var rank = Math.ceil(i / 2), side = i % 2 ? 1 : -1, bx = x - S.dir * rank * s * 2.2 + (gull ? S.a[i] * s * 6 : 0), by = y + side * rank * s * 1.5 + (gull ? (S.a[i + 10] - 0.5) * s * 8 : 0)
          var f = gull ? 0.45 + 0.25 * Math.sin(S.age * 2 + i) : 0.25 + 0.75 * Math.abs(Math.sin(S.age * (RM ? 4 : 7) + S.a[i] * 6))
          bird(c, bx, by, s, f)
        }
        c.strokeStyle = gull ? '#f3f6fa' : DV.ink; c.lineWidth = Math.max(pr * 1.3, s * 0.2); c.lineCap = 'round'; c.globalAlpha = e * (gull ? 0.95 : 0.8); c.stroke(); c.globalAlpha = 1
        break
      }
      case 'butterfly': {
        var BC = ['#ffb347', '#c38bff']
        for (i = 0; i < 2; i++) {
          var side2 = (S.a[i] < 0.5 ? 0.06 + S.a[i] * 0.4 : 0.72 + (S.a[i] - 0.5) * 0.4)
          x = (side2 + Math.sin(S.age * 0.7 + i * 2) * 0.04) * w; y = (0.7 + 0.2 * S.a[i + 4] + Math.sin(S.age * 1.9 + i) * 0.04) * hy; s = w * 0.011
          var fl = 0.3 + 0.7 * Math.abs(Math.sin(S.age * (RM ? 8 : 15) + i))
          c.fillStyle = BC[i]; c.globalAlpha = e * 0.9; c.beginPath()
          c.moveTo(x, y); c.lineTo(x - s * fl, y - s); c.lineTo(x - s * fl * 0.8, y + s * 0.5); c.closePath(); c.moveTo(x, y); c.lineTo(x + s * fl, y - s); c.lineTo(x + s * fl * 0.8, y + s * 0.5); c.closePath(); c.fill()
        }
        c.globalAlpha = 1; break
      }
      case 'balloon': case 'blimp': {
        var bm = S.type === 'blimp', im = bm ? SP.blimp : SP.balloon, bh = bm ? w * 0.05 : w * 0.06, bw = bh * im.width / im.height
        x = ((S.dir > 0 ? 0.08 : 0.92) + S.dir * u * 0.3) * w; y = (0.32 + S.y * 0.15 - u * 0.08 + Math.sin(S.age * 0.6) * 0.01) * hy
        c.globalAlpha = e * 0.92; if (bm && S.dir < 0) { c.save(); c.translate(x, y); c.scale(-1, 1); c.drawImage(im, -bw / 2, -bh / 2, bw, bh); c.restore() } else c.drawImage(im, x - bw / 2, y - bh / 2, bw, bh); c.globalAlpha = 1
        break
      }
      case 'kite': {
        x = ((S.x < 0.5 ? 0.14 : 0.86) + Math.sin(S.age * 1.2) * 0.012) * w; y = (0.3 + Math.cos(S.age * 1.6) * 0.03) * hy; s = w * 0.026
        c.globalAlpha = e
        c.fillStyle = '#ff5a6e'; c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * 0.7, y); c.lineTo(x, y + s * 1.2); c.closePath(); c.fill()
        c.fillStyle = '#ffd166'; c.beginPath(); c.moveTo(x, y - s); c.lineTo(x - s * 0.7, y); c.lineTo(x, y + s * 1.2); c.closePath(); c.fill()
        c.strokeStyle = '#ffffff'; c.lineWidth = pr * 1.2; c.beginPath(); c.moveTo(x, y + s * 1.2)
        for (k = 1; k <= 4; k++) c.lineTo(x + Math.sin(S.age * 3 + k) * s * 0.4, y + s * 1.2 + k * s * 0.5); c.stroke(); c.globalAlpha = 1
        break
      }
      case 'plane': {
        var px = (S.dir > 0 ? -0.05 + u * 1.1 : 1.05 - u * 1.1) * w, py = (0.1 + S.y * 0.14) * hy, tl = w * 0.28 * Math.min(1, u * 3)
        c.lineCap = 'round'; c.strokeStyle = '#ffffff'; c.lineWidth = pr * 2
        c.globalAlpha = 0.14 * e; c.beginPath(); c.moveTo(px - S.dir * tl, py); c.lineTo(px - S.dir * tl * 0.45, py); c.stroke()
        c.globalAlpha = 0.32 * e; c.beginPath(); c.moveTo(px - S.dir * tl * 0.45, py); c.lineTo(px, py); c.stroke()
        c.globalAlpha = e; c.fillStyle = DV.ink; c.fillRect(px - pr * 4, py - pr, pr * 8, pr * 2); c.fillRect(px - pr, py - pr * 3, pr * 2, pr * 6)
        if (R.t > 3 && Math.sin(S.age * 9) > 0.3) { c.fillStyle = '#ff5a5a'; c.fillRect(px - pr, py - pr, pr * 2, pr * 2) }
        c.globalAlpha = 1; break
      }
      case 'dolphin': {
        var dxs = S.x < 0.5 ? 0.08 + S.x * 0.3 : 0.62 + (S.x - 0.5) * 0.5, jx = (dxs + S.dir * u * 0.08) * w, jy = hy * (0.985 - Math.sin(u * Math.PI) * 0.07), ds = w * 0.05
        c.save(); c.translate(jx, jy); c.rotate(S.dir * (u - 0.5) * 1.6); if (S.dir < 0) c.scale(-1, 1); c.globalAlpha = 0.9; c.drawImage(SP.dolphin, -ds / 2, -ds / 4, ds, ds / 2); c.restore()
        if (u < 0.15 || u > 0.85) { c.globalAlpha = 0.6; c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(jx, hy * 0.99, ds * 0.4, ds * 0.07, 0, 0, TAU); c.fill() }
        c.globalAlpha = 1; break
      }
      case 'sail': {
        s = w * 0.05; x = ((S.x < 0.5 ? 0.06 : 0.7) + S.dir * u * 0.12) * w
        c.globalAlpha = e * 0.85; c.drawImage(SP.sail, x - s / 2, hy * 0.985 - s, s, s); c.globalAlpha = 1; break
      }
      case 'train': {
        var tim = SP.train[R.t > 3 ? 1 : 0], th = w * 0.03, tw = th * tim.width / tim.height
        x = S.dir > 0 ? -tw + u * (w + tw * 1.1) : w - u * (w + tw * 1.1); y = hy * 0.86
        c.globalAlpha = e * 0.92; if (S.dir < 0) { c.save(); c.translate(x + tw, y); c.scale(-1, 1); c.drawImage(tim, 0, -th, tw, th); c.restore() } else c.drawImage(tim, x, y - th, tw, th); c.globalAlpha = 1
        break
      }
      case 'fireworks': {
        var fx = (0.15 + S.x * 0.7) * w, fy = (0.14 + S.y * 0.3) * hy, rad = w * (0.07 + S.s * 0.04) * (1 - Math.pow(1 - Math.min(1, u * 1.6), 3)), drop = u * u * hy * 0.08
        var FC = ['#ffd166', '#ff6b9a', '#7ee0ff', '#9dff8a'], col = Math.floor(S.s * 4)
        c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineWidth = pr * 1.8
        for (k = 0; k < 2; k++) {
          c.strokeStyle = FC[(col + k) % 4]; c.globalAlpha = (1 - u) * 0.9; c.beginPath()
          for (i = k; i < S.n; i += 2) { var an2 = i / S.n * TAU + S.a[0]; c.moveTo(fx + Math.cos(an2) * rad * 0.72, fy + Math.sin(an2) * rad * 0.72 + drop); c.lineTo(fx + Math.cos(an2) * rad, fy + Math.sin(an2) * rad + drop) }
          c.stroke()
        }
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; break
      }
      case 'satellite': {
        x = (S.dir > 0 ? u : 1 - u) * w; y = (0.08 + S.y * 0.2) * hy
        c.globalAlpha = e; c.fillStyle = '#c9d2e0'; c.fillRect(x - pr * 3, y - pr * 2, pr * 6, pr * 4); c.fillStyle = '#4f7fd8'; c.fillRect(x - pr * 11, y - pr * 1.5, pr * 7, pr * 3); c.fillRect(x + pr * 4, y - pr * 1.5, pr * 7, pr * 3)
        if (Math.sin(S.age * 6) > 0.4) { c.fillStyle = '#ff5a5a'; c.fillRect(x - pr, y - pr * 4, pr * 2, pr * 2) }
        c.globalAlpha = 1; break
      }
      case 'fireflies': {
        c.globalCompositeOperation = 'lighter'; s = pr * 7
        for (i = 0; i < S.n; i++) {
          var sx2 = S.a[i] < 0.5 ? S.a[i] * 0.56 : 0.72 + (S.a[i] - 0.5) * 0.56
          x = (sx2 + Math.sin(S.age * 0.6 + i * 1.7) * 0.02) * w; y = (0.74 + S.a[i + 12] * 0.24 + Math.sin(S.age * 0.9 + i) * 0.02) * hy
          c.globalAlpha = e * (0.4 + 0.6 * Math.max(0, Math.sin(S.age * 2.2 + i * 2.4))); c.drawImage(SP.warm, x - s, y - s, s * 2, s * 2)
        }
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; break
      }
    }
  }

  /* ── draw: overlay (weather over the scene, under the HUD) ───────────────────────────────────── */
  function drawOverlay (c, v) {
    if (!R.on || OFF()) return
    var p0 = R.prof ? performance.now() : 0
    R.calls.over++
    var w = v.w, h = v.h, hy = v.hy, pr = v.pr || 1, i, x, y, s, vis = 1 - clamp(R.tunnel * 1.4, 0, 1)
    R.hyF = hy / h
    if (!pre0() && DV.groundA > 0.01) { c.globalAlpha = DV.groundA; c.fillStyle = DV.groundStr; c.fillRect(0, hy, w, h - hy); c.globalAlpha = 1 }
    if (vis <= 0 || R.plan.coreW) { if (R.flash > 0) flashAll(c, w, h); return }
    // fog veil around the horizon (never below hy + 12% of the view)
    if (R.plan.weather === 'kabut') {
      var y0 = hy * 0.58, y1 = hy + h * 0.12, fk = DV.ver * 4096 + Math.round(hy)
      if (DV.gfK !== fk) { DV.gfK = fk; DV.gf = c.createLinearGradient(0, y0, 0, y1); DV.gf.addColorStop(0, DV.f[0]); DV.gf.addColorStop(0.55, DV.f[1]); DV.gf.addColorStop(1, DV.f[0]) }
      c.globalAlpha = FOG_MAX * R.wI * vis; c.fillStyle = DV.gf; c.fillRect(0, y0, w, y1 - y0); c.globalAlpha = 1
    }
    // rain: two depth buckets, one stroke each
    if (R.rainN > 0) {
      var len = h * 0.045, n = R.rainN; c.lineCap = 'butt'
      for (var b = 0; b < 2; b++) {
        c.beginPath()
        for (i = 0; i < n; i++) { var z = RZ[i]; if ((z > 0.62) !== (b === 1)) continue; x = RX[i] * w; y = RY[i] * h; s = len * (0.45 + z); c.moveTo(x, y); c.lineTo(x - s * 0.16, y + s) }
        c.strokeStyle = b ? 'rgba(215,228,248,0.42)' : 'rgba(190,206,232,0.3)'; c.lineWidth = Math.max(1, Math.round(pr * (b ? 1.3 : 0.8)));   // whole-pixel widths: a hairline / plain stroke, never a fractional one
        c.globalAlpha = VEIL_MAX / 0.42 * Math.min(1, 0.3 + R.wI * 0.7) * vis; c.stroke()
      }
      // road splashes: little rings, one stroke
      c.beginPath(); var any = false
      for (i = 0; i < MAXSP; i++) if (PA[i] < 0.4) {
        any = true; var u = PA[i] / 0.4, yy = hy + (h - hy) * PY[i], rr = (h - hy) * 0.03 * (0.3 + PY[i]) * (0.4 + u)
        c.moveTo(PX[i] * w + rr, yy); c.ellipse(PX[i] * w, yy, rr, rr * 0.32, 0, 0, TAU)
      }
      if (any) { c.strokeStyle = 'rgba(225,235,250,0.45)'; c.lineWidth = pr; c.globalAlpha = vis; c.stroke() }
      c.globalAlpha = 1
    }
    // snow: far squares + near discs
    if (R.snowN > 0) {
      c.fillStyle = '#ffffff'; c.globalAlpha = 0.85 * vis; c.beginPath()
      for (i = 0; i < R.snowN; i++) { if (SZ[i] > 0.6) continue; s = pr * (1 + 2 * SZ[i]); c.rect(SX[i] * w, SY[i] * h, s, s) }
      c.fill(); c.beginPath()
      for (i = 0; i < R.snowN; i++) { if (SZ[i] <= 0.6) continue; s = pr * (1 + 2.8 * SZ[i]); x = SX[i] * w; y = SY[i] * h; c.moveTo(x + s, y); c.arc(x, y, s, 0, TAU) }
      c.fill(); c.globalAlpha = 1
      if (R.mojoX >= 0) for (i = 0; i < 4; i++) if (KA[i] < 1.6) { var q = KA[i] / 1.6; s = h * (0.02 + q * 0.06); c.globalAlpha = 0.3 * (1 - q); c.drawImage(SP.puff, KX[i] - s / 2 + q * w * 0.02, KY[i] - s / 2 - q * h * 0.05, s, s) }
      c.globalAlpha = 1
    }
    // breeze motes: leaves/petals as small rotated quads (no transforms), dust as dots; two colour buckets
    if (R.moteN > 0) {
      var M = R.motes
      for (var cb = 0; cb < 2; cb++) {
        c.beginPath()
        for (i = cb; i < R.moteN; i += 2) {
          x = MX[i] * w; y = MY[i] * h; s = h * (M.leaf ? 0.009 : 0.003) * MS[i]
          if (M.leaf) { var co = Math.cos(MR[i]) * s, si = Math.sin(MR[i]) * s; c.moveTo(x + co, y + si); c.lineTo(x - si * 0.45, y + co * 0.45); c.lineTo(x - co, y - si); c.lineTo(x + si * 0.45, y - co * 0.45); c.closePath() }
          else c.rect(x, y, s, s)
        }
        c.fillStyle = M.c[cb]; c.globalAlpha = (M.leaf ? 0.9 : 0.5) * vis; c.fill()
      }
      c.globalAlpha = 1
      if (R.plan.weather === 'angin' && R.qi > 0) {   // a soft whoosh: three thin streaks high on the screen
        c.strokeStyle = '#ffffff'; c.lineWidth = pr * 1.2; c.lineCap = 'round'; c.beginPath()
        for (i = 0; i < 3; i++) { var ph = (R.clock * 0.28 + i / 3) % 1; x = (ph * 1.4 - 0.2) * w; y = hy * (0.35 + i * 0.22); c.moveTo(x, y); c.quadraticCurveTo(x + w * 0.08, y - hy * 0.04, x + w * 0.16, y) }
        c.globalAlpha = 0.16 * R.wI; c.stroke(); c.globalAlpha = 1
      }
    }
    if (R.flash > 0) flashAll(c, w, h)
    if (R.prof) R.prof.over = R.prof.over * 0.95 + (performance.now() - p0) * 0.05
  }

  function flashAll (c, w, h) { if (flashA() <= 0.004) return; c.globalCompositeOperation = 'lighter'; c.globalAlpha = flashA() * 0.5; c.fillStyle = '#c9d6ff'; c.fillRect(0, 0, w, h); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over' }
  function pre0 () { return R.preSeen || skyPre() }

  /* ── road segment pass: wet sheen down the three lanes ─────────────────────────────────────────────
   * renderRoad calls this per segment WHILE it is still queueing its own quads, and paints them in one flush
   * afterwards: a sheen drawn here directly would sit UNDER the road (35 invisible path fills a frame). So the
   * per-segment calls only queue (nearest 70 segments, every other one, max 35), and the call after the road's
   * flush — roadSeg(ctx, null, -1) — paints them as one path per alpha step (RSTEP fills, not 35). */
  var RSTEP = 4, RQ = [], RN = new Int32Array(RSTEP), RQMAX = 12
  for (var rq = 0; rq < RSTEP; rq++) RQ.push(new Float32Array(RQMAX * 3 * 8))
  function roadSeg (c, s, k, v) {
    if (k === 0 || OFF()) for (var z = 0; z < RSTEP; z++) RN[z] = 0   // a new frame: drop anything never flushed
    if (!s) { if (k < 0) roadFlush(c); return }
    if (!R.on || R.wet < 0.08 || k > 70 || (k & 1) || s.tunnel || OFF()) return
    var p1 = s.p1, p2 = s.p2; if (!p1 || !p2 || p2.y >= p1.y) return
    if (0.2 * R.wet * (1 - k / 70) * (1 - R.tunnel) < 0.01) return
    var st = Math.min(RSTEP - 1, (k * RSTEP / 70) | 0), q = RQ[st]; if (RN[st] >= RQMAX) return
    R.calls.road++
    var o = RN[st] * 24
    for (var L = -1; L <= 1; L++) {
      var x1 = p1.x + L * p1.w * 0.66, x2 = p2.x + L * p2.w * 0.66, w1 = p1.w * 0.1, w2 = p2.w * 0.1
      q[o] = x1 - w1; q[o + 1] = x1 + w1; q[o + 2] = p1.y; q[o + 3] = x2 + w2; q[o + 4] = x2 - w2; q[o + 5] = p2.y; o += 8
    }
    RN[st]++
  }
  function roadFlush (c) {
    if (!R.on || R.wet < 0.08) return
    c.fillStyle = DV.sheen
    for (var st = 0; st < RSTEP; st++) {
      var n = RN[st]; if (!n) continue
      RN[st] = 0
      var a = 0.2 * R.wet * (1 - (st + 0.5) / RSTEP) * (1 - R.tunnel); if (a < 0.01) continue
      var q = RQ[st]; c.globalAlpha = a; c.beginPath()
      for (var i = 0, o = 0; i < n * 3; i++, o += 8) { c.moveTo(q[o], q[o + 2]); c.lineTo(q[o + 1], q[o + 2]); c.lineTo(q[o + 3], q[o + 5]); c.lineTo(q[o + 4], q[o + 5]); c.closePath() }
      c.fill()
    }
    c.globalAlpha = 1
  }

  /* ── small read-only state for the core ──────────────────────────────────────────────────────── */
  /** 0 below the switch point (the core reads it as a boolean), else the 0.35..1 fade */
  function lightsOn () { return R.on && R.light >= 0.35 ? R.light : 0 }
  var TOD = { t: 1, key: 'siang', label: 'Siang', weather: 'cerah', weatherLabel: 'Cerah', intensity: 0, light: 0, night: false, chip: '' }
  function timeOfDay () {
    if (!R.on) return null
    var i = Math.round(R.t), WD = A.WEATHER[R.plan.weather]
    TOD.t = R.t; TOD.key = A.TIMES[i].id; TOD.label = A.TIMES[i].label; TOD.weather = R.plan.weather; TOD.intensity = R.wI; TOD.light = R.light; TOD.night = R.t >= 3.5
    TOD.weatherLabel = R.plan.weather === 'hujan' && R.wI < 0.55 ? (R.wI < 0.05 ? 'Cerah' : WD.soft) : WD.label; TOD.chip = R.chip
    return TOD
  }
  function tint () { return R.on && TINT.a > 0.005 ? TINT : null }
  function telegraph () {
    if (!R.on) return 0
    var w = R.plan.weather, v = 0
    if (w === 'kabut') v = 0.9 * R.wI; else if (w === 'hujan') v = 0.5 * clamp((R.wI - 0.4) / 0.6, 0, 1); else if (w === 'salju') v = 0.3 * R.wI
    return Math.max(v, 0.4 * R.light)
  }
  function sway () { if (!R.on) return 0; var w = R.plan.weather; return clamp(0.12 + (w === 'angin' ? 0.85 * R.wI : w === 'hujan' ? 0.35 * R.wI : w === 'salju' ? 0.15 : 0), 0, 1) }
  function calm () { return R.on && R.calmT > 0 }
  function stop () { R.on = false; R.calmT = 0 }

  var FORCE = null
  var HOOK = { init: init, update: update, drawSky: drawSky, drawOverlay: drawOverlay, roadSeg: roadSeg, lightsOn: lightsOn, timeOfDay: timeOfDay, tint: tint, telegraph: telegraph, sway: sway, calm: calm, stop: stop, say: null }
  W.MojoChaseAtmos = {
    hook: HOOK, version: 1, kindOf: kindOf, labels: labels,
    /** the plan + labels for the pre-race chip; equal to init's plan when the core passes MojoChaseRules.rng(seed + 11) */
    preview: function (stage, seed) { var p = makePlan(stage, lcg(((seed | 0) || 7) + 11), FORCE); var L = labels(p); L.plan = p; return L },
    plan: function (stage, seed, force) { return makePlan(stage, lcg(((seed | 0) || 7) + 11), force || null) },
    /** test seam: { time:'malam'|0..4, weather, intensity, trans:'sore-malam'|null, tStart, tDur } or null */
    force: function (o) { FORCE = o || null },
    debug: function () {
      var al = []; for (var s = 0; s < 3; s++) if (SLOTS[s].on) al.push(SLOTS[s].type)
      return { on: R.on, t: R.t, wI: R.wI, weather: R.plan && R.plan.weather, kind: R.plan && R.plan.kind, trans: R.plan && R.plan.trans, light: R.light, wet: R.wet, clock: R.clock,
        alive: al, rain: R.rainN, snow: R.snowN, motes: R.moteN, calm: R.calmT > 0, tint: tint() && { c: TINT.c, a: TINT.a }, telegraph: telegraph(), sway: sway(), stats: R.stats, calls: R.calls, prof: R.prof, rainbow: R.rbAge, q: R.q, grade: { a: DV.gradeA, g: DV.g.slice(), ver: DV.ver, key: DV.ggK }, ground: DV.groundA }
    },
    profile: function (on) { R.prof = on ? { sky: 0, over: 0, upd: 0 } : null },
    /** QA: restart the planned transition `delay` s from now over `dur` s (contact-sheet sequences) */
    retime: function (delay, dur) { if (!R.on) return; var p = R.plan; p.tStart = p.wStart = R.clock + (delay || 0); if (dur) p.tDur = p.wDur = dur; R.rbAge = -1; R.rbDone = false },
    /** QA: spawn a sky-life kind now (ignores the pool, honours the slot cap) */
    spawn: function (type) { return spawn(type) }
  }
  // register: the core keeps an existing hooks object when it loads later, so either script order works
  // copy-on-write: the core may hand out its own defaults object as `hooks`; never mutate it in place
  function register () {
    var M = W.MojoChase, old = (M && M.hooks) || {}, nh = {}
    for (var k in old) nh[k] = old[k]
    nh.atmos = HOOK
    if (M) M.hooks = nh; else W.MojoChase = { hooks: nh }
  }
  W.MojoChaseAtmos.register = register
  register()
})(window, document)
