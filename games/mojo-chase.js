/* =============================================================================
 * mojo-chase.js — window.MojoChase: the G31 "3-Lane Rescue Chase" runtime (PRD MOJO_CHASE_PRD.md).
 *
 *   MojoChase.mount(host, cfg) -> Promise<result>   parent contract PRD §20 (cfg = MojoChases.config(...))
 *     result = { completed, stars_collected, collisions, gadget_used, education_result, optional_objectives,
 *                reward_result: {stars 1..3, bolts}, exited, elapsed }
 *
 * State machine (PRD §19): LOAD -> INTRO -> SWOP -> TUTORIAL -> ACTIVE (collision recovery, pickup, boost,
 * education event) -> LOCK (capture range + gadget ready) -> CAPTURE -> RESOLVE (police arrive) -> RESULT.
 * There is no game over: HIT -> SLOW -> RECOVER (1.4 s) -> CONTINUE, and the rubber band (mojo-chase-rules.js)
 * always brings the robber back into capture range.
 * World: mojo-chase-track.js (segment ring) + mojo-chase-scene.js (parallax/weather/light) + mojo-chase-fx.js
 * (pooled particles). Owner rules: no emoji, no weapons (a capture rocket with a safety net), no failure words,
 * Indonesian text, targets >= 56 px, global mute respected, prefers-reduced-motion = no shake/flash, fewer particles.
 *
 * HOOK CONTRACT (window.MojoChase.hooks; every hook is optional, the defaults below keep the chase working alone).
 * Modules plug in by assigning functions BEFORE a chase mounts. `api` is the session API passed to each hook:
 *   api.pause(reason)  FULL pause: simulation, timers, rubber band, particles freeze, engine audio ducked; the last
 *                      frame stays on screen. api.resume() restarts with a fresh clock (no dt accumulation).
 *   api.state()        { state, speed, prog, elapsed, lane, z, stage, form, timeOfDay, paused, pauseReason }
 *   api.view()         { w, h, hy, css, port, u }  canvas px (multiply by css for CSS px)
 *   api.robber()       { x, y, w } robber screen position in canvas px (null before it was drawn)
 *   api.host, api.stage, api.rng() (seeded), api.reward({stars, boost, rocket}), api.call(text, ms), api.clearAhead(sec)
 *   beforeStart(cfg, api) -> Promise<cfg>   after art is loaded, before the intro (picker: resolve with mojo_form)
 *   onPickup(type, info, api) -> true if handled ('quiz' box: open the question card; info = {sx, sy})
 *   spawnFilter(type, info) -> type | 'none'   info = {seg, lane, elapsed, prog, state}; may swap a pickup for 'quiz'
 *   atmos (hooks v2; every member optional, all no-ops when absent):
 *     init(ctx, stage, rng, api) -> {owns:{sky, weather, stars, sun, clouds}, night0}|undefined   rng = MojoChaseRules.rng(seed + 11);
 *          owned parts are skipped by the core (the scene/track are built from a stage copy: weather 'none', night = night0).
 *          URL ?seed=N seeds the chase; ?atmos=time,weather[,trans] is passed to MojoChaseAtmos.force() before init.
 *     update(dt, api.state())
 *     drawSky(ctx, view, 'pre') right after the sky gradient blit, before FAR (MojoChase.atmosPre = true);
 *          (no 'late' call: the sky is drawn once); view = {w, h, hy, css, port, u, pr, cx, playerY, curveOff, quality, skyPre}
 *     drawOverlay(ctx, view)  after the particles, before post
 *     roadSeg(ctx, seg, k, view)  renderRoad's per-segment overlay
 *     tint() -> {c, a}|null  one fill over the FAR/MID band before ROADSIDE
 *     lightsOn() -> 0..1  headlights, tail lights, lamps (and the biome grade fades by 0.8 x lights)
 *     telegraph() 0..1 hazard-glow contrast boost;  sway() 0..1 roadside tree sway;  calm() true = no new hazard rows
 *     say  set by the core to api.call(text, ms) (Bo callouts);  timeOfDay() -> label for api.state()
 * ==========================================================================*/
(function (W, D) {
  'use strict'
  var TAU = Math.PI * 2, LANE_MS = 300, BASE_SPEED = 4760,   /* owner 2026-10-03 "terlalu cepat": 85% of 5600; row spacing scaled with it (SPACING) so rows arrive at the same rate in time */ SPACING = 0.85, CAR_W = 980, Z_P = 1250
  var CAR_K = 0.85      // owner 2026-10-03: Mojo drawn at 85% of the previous on-screen size; the wheel contact line stays put
  var CD_STEP = 0.8     // the 3-2-1 countdown: seconds per number
  var CUT_KEY = 'dunia-g31-cut-seen'   // stage ids whose intro cutscene was already watched (it plays once per stage)
  // every Swop form the picker can offer: its name for the callouts and the perk it brings when cfg.perk is absent
  // name / perk / rear sprite come from THE form table (MojoChases.FORMS); these literals are only the fallback
  var FORM_NAME = { racer: 'Pembalap', monster: 'Monster', jumper: 'Pelompat', 'snow-plow': 'Bajak Salju', dozer: 'Dozer', rescue: 'Ambulans', chopper: 'Helikopter', jet: 'Jet' }
  var FORM_PERK = { racer: 'boost', jet: 'boost', monster: 'grip', jumper: 'jump', 'snow-plow': 'snow', dozer: 'recover', rescue: 'heal', boat: 'splash', chopper: 'fly' }
  function formRow (id) { try { return (W.MojoChases && W.MojoChases.form && W.MojoChases.form(id)) || null } catch (e) { return null } }
  function formName (id) { var f = formRow(id); return f ? f.name : FORM_NAME[id] }
  function formPerk (id) { var f = formRow(id); return f ? f.perk : FORM_PERK[id] }
  // the in-race rear sprite of a form: the table row first, the generated anchor alias second, plain Mojo last
  function rearOf (id) { var f = formRow(id), RA = W.MojoRearAnchors; return f ? f.rear : (RA && RA.forms[id]) || 'base' }
  function knownForm (id) { var RA = W.MojoRearAnchors; return !!id && (!!formRow(id) || !!(RA && RA.forms[id])) }
  var RM = false; try { RM = W.matchMedia('(prefers-reduced-motion: reduce)').matches } catch (e) {}
  function lib (k) { return (W.AssetIndex && W.AssetIndex.path(k)) || ('../assets/db/lib/' + k + '.webp') }
  function clamp (v, a, b) { return v < a ? a : v > b ? b : v }
  function el (tag, cls, html) { var e = D.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e }

  // lane-object catalogue: art key, world width, kind, float height
  var OBJ = {
    star: { k: 'mojo-chase/items/star', w: 380, kind: 'pick', fy: 380 }, coin: { k: 'mojo-chase/items/coin', w: 380, kind: 'pick', fy: 380 },
    heart: { k: 'mojo-chase/items/heart', w: 380, kind: 'pick', fy: 400 },
    crate: { k: 'mojo-chase/items/crate', w: 650, kind: 'block' }, barrel: { k: 'mojo-chase/items/barrel', w: 450, kind: 'block' },
    barrier: { k: 'mojo-chase/items/barrier', w: 850, kind: 'block' }, cone: { k: 'mojo-chase/items/cone', w: 380, kind: 'block' },
    tyres: { k: 'mojo-chase/items/tyres-3', w: 520, kind: 'block' }, rock: { k: 'mojo-chase/props/rock', w: 750, kind: 'block' },
    hay: { k: 'mojo-chase/props/hay', w: 750, kind: 'block' },
    banana: { k: 'mojo-chase/items/banana', w: 450, kind: 'slip', fx: 'spin' }, oil: { k: 'mojo-chase/items/oil', w: 800, kind: 'slip', fx: 'slide', flat: true },
    pothole: { k: 'mojo-chase/items/pothole', w: 800, kind: 'slip', fx: 'bump', flat: true },
    pad: { k: 'mojo-chase/items/boost-pad', w: 850, kind: 'pad', flat: true },
    rocket: { k: 'mojo-chase/items/rocket', w: 600, kind: 'box', fy: 320 }, mystery: { k: 'mojo-chase/items/mystery', w: 600, kind: 'box', fy: 300 },
    magnet: { k: 'mojo-chase/items/magnet', w: 600, kind: 'box', fy: 320 }, shield: { k: 'mojo-chase/items/shield', w: 600, kind: 'box', fy: 320 },
    stopwatch: { k: 'mojo-chase/items/stopwatch', w: 600, kind: 'box', fy: 320 },
    quiz: { k: 'mojo-chase/items/mystery', w: 640, kind: 'box', fy: 300 }
  }
  var OBS_SET = { coastal: ['crate', 'barrel', 'cone', 'barrier', 'tyres'], town: ['cone', 'barrier', 'crate', 'barrel'], forest: ['rock', 'crate', 'barrel', 'tyres'],
    desert: ['barrel', 'rock', 'crate', 'tyres'], snow: ['rock', 'crate', 'barrel'], construction: ['cone', 'barrier', 'tyres', 'barrel'],
    farm: ['hay', 'crate', 'cone'], city: ['cone', 'barrier', 'barrel', 'crate'] }
  var FX_KEYS = ['explosion', 'dust', 'skid', 'speed-trail', 'sparks', 'confetti', 'fireworks', 'collect', 'boost-flame-sheet13', 'tire-smoke', 'sparkle', 'splash', 'snow-spray']

  /* ── audio: local WebAudio tones + the shared SFXEngine cues; mute = parent's sound() ─────────────── */
  function Audio (on) {
    var ac = null, eng = null, engG = null, engF = null, siren = null
    function ctx () { if (!on()) return null; try { if (!ac) ac = new (W.AudioContext || W.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume() } catch (e) { ac = null } return ac }
    function tone (f0, f1, d, v, type, delay) {
      var c = ctx(); if (!c) return
      try { var t = c.currentTime + (delay || 0), g = c.createGain(), o = c.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d)
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + 0.05) } catch (e) {}
    }
    function noise (d, v, lp, hp, pan) {
      var c = ctx(); if (!c) return
      try { var n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), ch = b.getChannelData(0); for (var i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n)
        var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = b; f.type = hp ? 'highpass' : 'lowpass'; f.frequency.value = lp; g.gain.value = v; s.connect(f); f.connect(g)
        if (pan && c.createStereoPanner) { var sp = c.createStereoPanner(); sp.pan.value = clamp(pan, -1, 1); g.connect(sp); sp.connect(c.destination) } else g.connect(c.destination)
        s.start() } catch (e) {}
    }
    var A = {
      engine: function (speed) {
        var c = ctx()
        if (!c) { if (engG) { try { engG.gain.value = 0 } catch (e) {} } return }
        try {
          if (!eng) { eng = c.createOscillator(); engF = c.createBiquadFilter(); engG = c.createGain(); eng.type = 'sawtooth'; engF.type = 'lowpass'; engF.frequency.value = 420; engG.gain.value = 0.0001; eng.connect(engF); engF.connect(engG); engG.connect(c.destination); eng.start() }
          eng.frequency.setTargetAtTime(62 + speed * 64, c.currentTime, 0.12); engF.frequency.setTargetAtTime(300 + speed * 260, c.currentTime, 0.15); engG.gain.setTargetAtTime(speed > 0 ? 0.035 : 0.0001, c.currentTime, 0.2)   // pitch AND brightness follow the speed
        } catch (e) {}
      },
      whoosh: function (pan) { noise(0.22, 0.12, 1800, true, pan ? pan * 0.7 : 0) },   // lane change: panned to the side Mojo moves to
      heh: function () { tone(520, 380, 0.09, 0.05, 'square'); tone(560, 400, 0.1, 0.05, 'square', 0.17) },   // the robber's "heh-heh"
      squeal: function () { tone(1650, 1380, 0.26, 0.018, 'triangle'); tone(1720, 1440, 0.22, 0.012, 'sine', 0.03) },   // a quiet tyre squeal
      tick: function (n) { tone(n ? 660 : 990, n ? 660 : 990, 0.14, 0.09, 'triangle') },
      chime: function (combo) { var k = Math.pow(1.122, combo || 0); tone(1046 * k, 1568 * k, 0.16, 0.09, 'triangle'); tone(1568 * k, 2093 * k, 0.18, 0.06, 'sine', 0.06) },
      clack: function () { tone(1800, 900, 0.05, 0.12, 'square'); tone(600, 300, 0.08, 0.1, 'triangle', 0.03) },
      brok: function () { tone(140, 60, 0.28, 0.32, 'sine'); noise(0.18, 0.28, 700); tone(420, 300, 0.07, 0.12, 'square', 0.02) },   // a soft clunk, never a buzzer
      box: function () { tone(523, 1046, 0.12, 0.1, 'triangle'); tone(784, 1318, 0.16, 0.08, 'triangle', 0.08); tone(1046, 2093, 0.2, 0.06, 'sine', 0.16) },
      boost: function () { noise(0.5, 0.14, 2400, true); tone(220, 660, 0.45, 0.06, 'sawtooth') },
      launch: function () { noise(0.8, 0.2, 3000, true); tone(300, 1200, 0.7, 0.07, 'sawtooth') },
      net: function () { tone(220, 660, 0.3, 0.14, 'sine'); tone(330, 990, 0.3, 0.08, 'triangle', 0.08) },
      scrape: function () { noise(0.25, 0.12, 4000, true) },
      siren: function (onOff) {
        var c = ctx()
        if (!onOff || !c) { if (siren) { try { siren.o.stop() } catch (e) {} siren = null } return }
        if (siren) return
        try { var o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = 760; lfo.type = 'square'; lfo.frequency.value = 1.6; lg.gain.value = 180; lfo.connect(lg); lg.connect(o.frequency); g.gain.value = 0.05; o.connect(g); g.connect(c.destination); o.start(); lfo.start(); siren = { o: o, l: lfo }
          o.onended = function () { try { lfo.stop() } catch (e) {} } } catch (e) {}
      },
      cue: function (k) { if (!on()) return; try { if (W.SFXEngine && W.SFXEngine.cue) W.SFXEngine.cue(k) } catch (e) {} },
      stop: function () { A.siren(false); try { if (eng) eng.stop() } catch (e) {} eng = null; if (ac) { var o = ac; ac = null; try { o.close() } catch (e) {} } }
    }
    return A
  }

  /* ── one chase session ──────────────────────────────────────────────────────────────────────────── */
  function mount (host, cfg) {
    cfg = cfg || {}
    var CH = W.MojoChases, R = W.MojoChaseRules, TR = W.MojoChaseTrack, FX = W.MojoChaseFX, SCN = W.MojoChaseScene
    var stage = CH.stage(cfg.stage) || CH.STAGES[0], TEX = FX.build()
    var RA = W.MojoRearAnchors, CA = W.MojoChaseAnchors, TA = W.MojoTrackAnchors
    // the Swop forms a child can race with (owner: "pilih karakter"): film art on the card, rear art in the race, one perk each
    // fallback intro chooser (no picker module): the table's starter forms; card art = the table's card key
    var FORMS = ['racer', 'monster', 'snow-plow', 'dozer'].map(function (id) {
      var f = formRow(id) || { name: FORM_NAME[id], card: 'mojo-rear/' + rearOf(id), line: '' }
      return { id: id, name: f.name, art: f.card, perk: String(f.line || '').replace(/!$/, '') }
    })
    var look0 = stage.look || stage.biome
    var recForm = stage.recForm || (look0 === 'snow' ? 'snow-plow' : /forest|farm|jungle|autumn|ruins|windfarm/.test(look0) || stage.weather === 'leaves' ? 'monster' : /construction|harbour/.test(look0) ? 'dozer' : 'racer')
    // cfg.mojo_form is honoured as given ('racer' included); without one: the avatar's last form, else the stage pick
    var formId = knownForm(cfg.mojo_form) ? cfg.mojo_form : (cfg.lastForm && FORMS.some(function (f) { return f.id === cfg.lastForm }) ? cfg.lastForm : recForm)
    var perk = cfg.perk || formPerk(formId) || null
    var rearKey = rearOf(formId), rearA = RA ? RA.sprites[rearKey] : null
    var targetName = cfg.target_type || stage.target, targetA = CA ? CA.families.vehicles.sprites[targetName] : null
    var sound = typeof cfg.sound === 'function' ? cfg.sound : function () { return true }
    var AU = Audio(sound)
    var resolve, done = new Promise(function (res) { resolve = res })

    /* DOM */
    host.innerHTML = ''
    host.classList.add('mc-host')
    var svgf = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="mc-chroma" color-interpolation-filters="sRGB"><feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="r"/><feOffset in="r" dx="7" result="ro"/><feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0" result="gb"/><feOffset in="gb" dx="-7" result="gbo"/><feBlend in="ro" in2="gbo" mode="screen"/></filter></svg>'
    host.insertAdjacentHTML('beforeend', svgf)
    var canvas = el('canvas', 'mc-cv'); host.appendChild(canvas)
    var c = canvas.getContext('2d', { alpha: false, willReadFrequently: /[?&]cpu=1/.test(location.search) })
    var ARROW = '<svg viewBox="0 0 100 100"><path d="M50 10 L88 52 H64 V90 H36 V52 H12 Z" fill="#fff" stroke="#cfe6ff" stroke-width="5" stroke-linejoin="round"/></svg>'
    var hud = el('div', 'mc-hud')
    hud.innerHTML =
      '<div class="mc-tl"><div class="mc-badge"><img alt="Bo" src="' + lib('mojo-char/bo') + '"></div><div class="mc-hearts" aria-label="Semangat"></div></div>' +
      '<div class="mc-sign mc-mission hide"><div class="plank"><b class="ol">MISI</b><span class="ol"></span></div><i class="post"></i></div>' +
      '<div class="mc-top"><div class="mc-prog"><img class="car" alt="" src="' + lib('mojo-rear/' + rearKey) + '"><div class="bar"><i></i></div><img class="flag" alt="" src="' + lib('mojo-chase/signs/flag-checker') + '"></div>' +
      '<div class="mc-title ol">KEJAR PENCURI!</div><div class="mc-loc ol"></div><div class="mc-dist"></div></div>' +
      '<button class="mc-pause" type="button" aria-label="Jeda"></button>' +
      '<div class="mc-counters"><span class="mc-cnt star"><img alt="" src="' + lib('mojo-chase/items/star') + '"><b class="ol">0</b></span><span class="mc-cnt crate"><img alt="" src="' + lib('mojo-chase/items/crate') + '"><b class="ol">0</b></span></div>' +
      '<div class="mc-timer"><i></i><b class="ol">00:00</b></div>' +
      '<div class="mc-sign mc-place hide"><div class="plank"><svg viewBox="0 0 84 40"><path d="M2 38 L26 8 L38 22 L50 4 L82 38 Z" fill="#fff3dc" stroke="#4e2710" stroke-width="3" stroke-linejoin="round"/></svg><span></span><svg viewBox="0 0 84 30"><path d="M8 15 H62 M50 4 L66 15 L50 26" fill="none" stroke="#fff3dc" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg></div><i class="post"></i></div>' +
      '<div class="mc-call"><img alt="" src="' + lib('mojo-char/bo') + '"><span></span></div><div class="mc-edu"></div><div class="mc-reticle" role="button" aria-label="Tembakkan roket jaring"></div>' +
      '<button class="mc-btn l" type="button" aria-label="Pindah ke kiri">' + ARROW.replace('<svg', '<svg style="transform:rotate(-90deg)"') + '</button>' +
      '<button class="mc-btn u" type="button" aria-label="Ngebut"><i class="ring"></i>' + ARROW + '</button>' +
      '<button class="mc-btn r" type="button" aria-label="Pindah ke kanan">' + ARROW.replace('<svg', '<svg style="transform:rotate(90deg)"') + '</button>' +
      '<button class="mc-skip" type="button">Lewati</button><div class="mc-count ol" aria-live="polite"></div>' +
      '<button class="mc-gadget empty" type="button" aria-label="Roket jaring"><img alt="" src="' + lib('mojo-chase/items/rocket') + '"><b class="ol">0</b></button>'
    host.appendChild(hud)
    var card = el('div', 'mc-card'); host.appendChild(card)
    var fade = el('div', 'mc-fade'); host.appendChild(fade)
    var load = el('div', 'mc-load', '<span class="ol">Menyiapkan jalan...</span><i><b></b></i>'); host.appendChild(load)
    function q (s) { return host.querySelector(s) }
    var H = { hearts: q('.mc-hearts'), fill: q('.mc-prog .bar i'), car: q('.mc-prog .car'), dist: q('.mc-dist'), star: q('.mc-cnt.star b'), crate: q('.mc-cnt.crate b'),
      starBox: q('.mc-cnt.star'), crateBox: q('.mc-cnt.crate'), timer: q('.mc-timer b'), call: q('.mc-call'), callT: q('.mc-call span'), edu: q('.mc-edu'), ret: q('.mc-reticle'),
      gad: q('.mc-gadget'), skip: q('.mc-skip'), gadN: q('.mc-gadget b'), up: q('.mc-btn.u'), mission: q('.mc-mission'), place: q('.mc-place'), count: q('.mc-count'), callImg: q('.mc-call img') }
    q('.mc-mission span').textContent = cfg.mission || stage.mission
    q('.mc-place span').textContent = (stage.place || '').toUpperCase(); q('.mc-loc').textContent = stage.place || ''
    for (var hi = 0; hi < 3; hi++) { var hImg = el('img'); hImg.alt = ''; hImg.src = lib('mojo-chase/items/heart'); H.hearts.appendChild(hImg) }

    /* images */
    var img = {}, need = {}, imgP = {}, RIMG = {}, formLoad = null   // RIMG: decoded rear art by rear key (forms not preloaded load on demand)
    function loadOne (key) {
      return new Promise(function (res) {
        var im = new Image(), fin0 = false, fin = function () { if (fin0) return; fin0 = true; res(im.naturalWidth ? im : null) }
        setTimeout(fin, 6000); im.decoding = 'async'; im.src = lib(key)
        if (im.decode) im.decode().then(fin, function () { if (im.complete) fin(); else im.onload = im.onerror = fin }); else im.onload = im.onerror = fin
      })
    }
    function want (name, key) { need[name] = key }
    FORMS.forEach(function (f) { want('rear:' + f.id, 'mojo-rear/' + rearOf(f.id)) })
    want('rear', 'mojo-rear/' + rearKey); want('target', 'mojo-chase/vehicles/' + targetName); want('police', 'mojo-chase/vehicles/police-van')
    want('robber', 'mojo-chase/robbers/robber-beanie'); want('p:bridge-tower', 'mojo-chase/cprops/red-suspension-bridge-tower')
    Object.keys(OBJ).forEach(function (k) { want('o:' + k, OBJ[k].k) })
    // FAR / MID strips: the Codex strip when the stage has one (key-based: a better delivery replaces it by re-ingest)
    want('FAR', stage.cfar ? 'mojo-chase/cfar/' + stage.cfar : 'mojo-chase/far/' + stage.far)
    if (stage.cmid) want('MID', 'mojo-chase/cmid/' + stage.cmid); else if (stage.mid) want('MID', 'mojo-chase/far/' + stage.mid)
    TR.BIOME[stage.look || stage.biome].props.forEach(function (p) { if (TR.PROP_KEY[p[0]].indexOf('proc:') < 0) want('p:' + p[0], TR.PROP_KEY[p[0]]) })
    ;['lamp', 'chevron-yellow', 'chevron-red', 'billboard', 'swoppiton', 'gantry', 'finish', 'flag-checker'].forEach(function (k) { want('p:' + k, TR.PROP_KEY[k]) })
    FX_KEYS.forEach(function (k) { want('fx/' + k, 'mojo-fx/' + k) })
    // Codex 8-pose effect sequences (one canvas per sequence, registered anchor): BROK, safety net, dizzy stars, boost flame, confetti
    var SEQ = { brok: [], net: [], dizzy: [], boost: [], confetti: [] }
    for (var sq in SEQ) for (var fi = 1; fi <= 8; fi++) want('seq:' + sq + '-' + fi, 'mojo-chase/vfx/' + sq + '-' + fi)
    function seqImg (name, f) { var a = SEQ[name]; return a.length ? a[Math.max(0, Math.min(a.length - 1, f | 0))] : null }
    function loadAll () {
      var names = Object.keys(need), left = names.length, bar = load.querySelector('b')
      return new Promise(function (res) {
        var t = setTimeout(res, 9000)
        names.forEach(function (n) {
          var im = new Image(); im.decoding = 'async'
          var fin = function () { if (im.naturalWidth) img[n] = im; left--; bar.style.width = Math.round(100 * (1 - left / names.length)) + '%'; if (!left) { clearTimeout(t); res() } }
          im.src = lib(need[n])
          // a stage never starts until every sprite is DECODED (no first-draw decode hitch mid-chase)
          if (im.decode) im.decode().then(fin, function () { if (im.complete && im.naturalWidth) fin(); else { im.onload = fin; im.onerror = fin } })
          else { im.onload = im.onerror = fin }
        })
      })
    }

    /* view */
    var v = { w: 0, h: 0, pr: 1, u: 1, cx: 0, hy: 0, hw: 0, vh: 0, port: false, playerY: 0 }, base = { hw: 0, vh: 0, hy: 0 }
    var quality = RM ? 1 : 2, drawN = 200
    // effects drop first (draw distance, particle cap, sky effects), resolution last and never below 0.8x DPR-1 (audit C1)
    var QUAL = [{ pr: 0.8, n: 120, cap: 0.35 }, { pr: 0.9, n: 160, cap: 0.6 }, { pr: 1, n: 210, cap: 1 }]
    function resize () {
      var cw = host.clientWidth || W.innerWidth, chh = host.clientHeight || W.innerHeight, Q = QUAL[quality]
      v.port = chh > cw * 1.1
      host.classList.toggle('land', !v.port)
      var u = clamp(Math.min(cw, chh) / 390, 0.92, 1.6); host.style.setProperty('--u', u.toFixed(3))
      host.style.setProperty('--L', clamp(Math.min(chh / 740, cw / 1000), 0.5, 1.4).toFixed(3))   // landscape mockup scale (mockup-landscape.jpg is 940x740)
      v.pr = Math.max(0.8, Math.min(W.devicePixelRatio || 1, 2) * Q.pr)
      canvas.width = Math.round(cw * v.pr); canvas.height = Math.round(chh * v.pr)
      v.w = canvas.width; v.h = canvas.height; v.u = v.pr * u; v.css = cw / canvas.width
      v.cx = v.w / 2
      base.hy = v.h * (v.port ? 0.40 : 0.42)
      v.playerY = v.h * (v.port ? 0.80 : 0.86)
      base.vh = (v.playerY - base.hy) * Z_P / TR.CAM_H
      base.hw = (v.port ? 0.60 : 0.40) * v.w * Z_P / TR.ROADW
      v.hy = base.hy; v.hw = base.hw; v.vh = base.vh
      drawN = Q.n; FX.setCap(Q.cap * (RM ? 0.5 : 1))
      if (scene) scene.resize(v)
      cometTarget = null
    }

    /* world state */
    var urlSeed = +((/[?&]seed=(\d+)/.exec(location.search) || [])[1] || 0)
    var track = null, scene = null, seed = (cfg.seed || urlSeed || (Date.now() & 0xffff)) | 0, rr = R.rng(seed + 5)
    var S = { state: 'load', t: 0, z: 0, speed: 0, lane: 1, lanePos: 1, laneFrom: 1, laneT: 1, laneDur: LANE_MS, laneStart: 0, lastLaneMs: 0,
      boost: 0, boostCharge: 1, recover: 0, hits: 0, hearts: 3, stars: 0, boxes: 0, rocket: 0, prog: 0, best: 0, elapsed: 0, seconds: cfg.seconds || stage.seconds,
      hasRocket: false, rocketBoxAlive: false, shield: 0, magnet: 0, slow: 0, spin: 0, slide: 0, shake: 0, flash: 0, strobe: 0, stop: 1, hitStop: 0, hitScale: 0.22,
      punch: 0, tunnel: 0, eduDone: false, edu: null, eduSeg: -1, eduResult: null, gadgetUsed: false, lockT: 0, cap: null, resolveT: 0,
      targetLane: 1, targetLanePos: 1, targetNext: 3, nextRow: 30, rows: 0, starsSpawned: 0, tutorial: 0, brok: 0, recoveryMs: [], lastHitAt: 0,
      frames: [], tierFrames: { 0: [], 1: [], 2: [] }, auto: null, paused: false, policeZ: 0, finishSeg: -1, heartT: 0, comets: [], rings: [], bursts: [],
      hop: 0, cdT: 0, cdN: 0, smokeAcc: 0, smoke: 0, squealAt: -9, nearAt: -9, near: 0, tauntAt: -9, taunts: 0, robHop: 0, targetSeenT: -9 }
    // the robber's comic balloon ("Kamu jelek!"), the near-miss pop and the tyre skid marks: fixed records, reused
    var TN = { on: false, t: 0, text: '', top: 0, gad: null }, NM = { on: false, t: 0, x: 0, y: 0 }, SK = []
    for (var sk0 = 0; sk0 < 20; sk0++) SK.push({ on: false, x: 0, y: 0, t: 0, w: 0 })
    var rowSt = { tier: cfg.speed_profile || stage.tier, assist: 0, obs: OBS_SET[stage.biome] || OBS_SET.coastal, reach: 7, starLane: 1, row: ['', '', ''] }
    // pooled lane objects
    var POOL = []
    for (var pi = 0; pi < 140; pi++) POOL.push({ on: false, type: '', lane: 0, seg: 0, taken: false, t: 0 })
    function addObj (type, lane, segI) {
      var s = track.seg(segI); if (!s) return null
      for (var i = 0; i < POOL.length; i++) if (!POOL[i].on) { var o = POOL[i]; o.on = true; o.type = type; o.lane = lane; o.seg = segI; o.taken = false; o.t = 0; s.objs.push(o); return o }
      return null   // pool exhausted: the row is simply thinner (PRD §23)
    }
    for (var ci = 0; ci < 12; ci++) { S.comets.push({ on: false, x: 0, y: 0, x0: 0, y0: 0, t: 0 }); S.rings.push({ on: false, x: 0, y: 0, r: 0, t: 0, col: 0 }) }
    for (var bi2 = 0; bi2 < 4; bi2++) S.bursts.push({ on: false, x: 0, y: 0, t: 0 })

    /* callouts */
    var callT = 0, callCool = {}
    function call (text, ms, key, force) {
      key = key || text
      /* `force` is for feedback the PLAYER asked for by tapping. The 4s cooldown is right for
         ambient coaching that would otherwise spam, but throttling the answer to a direct tap is
         indistinguishable from a dead button — which is exactly how it was reported. */
      if (!force && callCool[key] && S.t < callCool[key]) return
      callCool[key] = S.t + 4
      H.callT.textContent = text; H.call.classList.add('on'); callT = (ms || 1300) / 1000
      if (cfg.say) try { cfg.say(text) } catch (e) {}
    }

    /* input */
    function laneTo (d) {
      if (!(S.state === 'active' || S.state === 'tutorial' || S.state === 'lock')) return
      if (S.laneT < 1) { S.qLane = d; return }          // one buffered input during a transition
      var nl = S.lane + d
      if (nl < 0 || nl > 2) { scrape(d); return }
      S.laneFrom = S.lanePos; S.lane = nl; S.laneT = 0; S.laneDur = LANE_MS * Math.max(0.7, Math.abs(nl - S.lanePos)); S.laneStart = performance.now(); S.laneSim = S.simT || 0
      AU.whoosh(d); skid(d); S.laneFx = 0.4; S.laneFxLane = nl
    }
    function boost () {
      if (!(S.state === 'active' || S.state === 'lock')) return
      if (S.boostCharge < 1) { call('Isi tenaga dulu!', 900, 'charge'); return }
      S.boostCharge = 0; S.boost = 1.5; AU.boost()
    }
    function fire () {
      S.fireAt = performance.now()
      if (S.rocket > 0 && S.hasRocket && (S.state === 'active' || S.state === 'tutorial')) { S.state = 'lock'; S.lockT = 0 }   // owner rule: robber visible + rocket = the tap fires
      if (S.state !== 'lock') {
        /* answer every tap: the bubble (forced past the cooldown) AND a nudge on the button itself,
           so the feedback survives even if the bubble is covered or missed */
        if (!S.hasRocket) call('Cari kotak roket!', 1200, 'need', true)
        else call('Dekati pencurinya dulu!', 1200, 'near', true)
        if (H.gad) { H.gad.classList.remove('nope'); void H.gad.offsetWidth; H.gad.classList.add('nope') }
        return
      }
      startCapture()
    }
    function bindBtn (b, fn) {
      b.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); b.classList.add('on'); fn() })
      ;['pointerup', 'pointercancel', 'pointerleave'].forEach(function (n) { b.addEventListener(n, function () { b.classList.remove('on') }) })
    }
    bindBtn(q('.mc-btn.l'), function () { laneTo(-1) }); bindBtn(q('.mc-btn.r'), function () { laneTo(1) }); bindBtn(H.up, boost); bindBtn(H.gad, fire)
    H.ret.addEventListener('pointerdown', function (e) { e.preventDefault(); fire() })
    q('.mc-pause').addEventListener('click', function () { pause(true) })
    H.skip.addEventListener('click', function () { endCut() })
    var sw = null
    canvas.addEventListener('pointerdown', function (e) { sw = { x: e.clientX, y: e.clientY, t: performance.now() } })
    canvas.addEventListener('pointerup', function (e) {
      if (!sw) return
      var dx = e.clientX - sw.x, dy = e.clientY - sw.y, dt = performance.now() - sw.t
      if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy) && dt < 700) laneTo(dx < 0 ? -1 : 1)
      else if (dy < -40 && Math.abs(dy) > Math.abs(dx)) boost()
      else if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && S.state === 'lock') fire()
      sw = null
    })
    function key (e) {
      if (S.state === 'result' || S.paused) return
      if (e.key === 'ArrowLeft') laneTo(-1); else if (e.key === 'ArrowRight') laneTo(1); else if (e.key === 'ArrowUp') boost(); else if (e.key === ' ' || e.key === 'Enter') fire(); else if (e.key === 'Escape') pause(true); else return
      e.preventDefault()
    }
    D.addEventListener('keydown', key)
    function vis () { if (D.hidden && !S.paused && S.state !== 'result' && S.state !== 'load') pause(true) }
    D.addEventListener('visibilitychange', vis)
    W.addEventListener('resize', resize)

    /* cards */
    function showCard (html, buttons) {
      card.innerHTML = '<div class="box">' + html + '<div class="row"></div></div>'
      var row = card.querySelector('.row')
      buttons.forEach(function (b) { var bt = el('button', b.soft ? 'soft' : '', ''); bt.type = 'button'; bt.textContent = b.t; bt.id = b.id || ''; bt.addEventListener('click', function () { AU.cue('click'); b.fn() }); row.appendChild(bt) })
      card.classList.add('on')
    }
    function hideCard () { card.classList.remove('on'); card.innerHTML = '' }
    function pause (on) {
      if (on) {
        if (S.paused || !(S.state === 'cut' || S.state === 'countdown' || S.state === 'swop' || S.state === 'tutorial' || S.state === 'active' || S.state === 'lock' || S.state === 'capture' || S.state === 'resolve')) return
        S.paused = true; S.pauseReason = 'menu'; AU.engine(0); AU.siren(false)
        showCard('<h2 class="fk">Istirahat Sebentar</h2><p>Pencuri ikut berhenti. Siap lanjut?</p>', [
          { t: 'Lanjut', id: 'mc-resume', fn: function () { hideCard(); S.paused = false; S.pauseReason = null; last = performance.now(); acc = 0 } },
          { t: 'Keluar', id: 'mc-exit', soft: true, fn: function () { finish(false, true) } }])
      }
    }

    /* effects helpers */
    // Mojo's on-screen body width: lower ~25-30% of the screen (PRD §4), so the road and the robber ahead stay readable
    function carPx () { return (v.port ? v.w * 0.42 : v.h * 0.29) * CAR_K }
    function mojoXY () { var s = TR.CAM_H / Z_P / TR.CAM_H, wx = TR.LANES[0] * TR.ROADW + (TR.LANES[2] - TR.LANES[0]) * TR.ROADW * S.lanePos / 2; return { x: v.cx + (Z_P > 0 ? (TR.CAM_H / Z_P) : 0) * (wx - camX) * v.hw / TR.CAM_H * TR.CAM_H / TR.CAM_H, y: v.playerY } }
    var camX = 0
    function skid (d) { for (var i = 0; i < (RM ? 1 : 3); i++) tyrePuff(d, 0.8) }   // the first kick of tyre smoke as the lane change starts
    function scrape (d) {
      var m = mojoXY(), cp = carPx(), x = m.x + d * cp * 0.5
      for (var i = 0; i < 16; i++) { var p = FX.spawn(TEX.glowY, x, m.y - cp * 0.25, -d * (80 + Math.random() * 260) * v.u, -(120 + Math.random() * 220) * v.u, 0.5 + Math.random() * 0.3, cp * 0.06, true); if (p) { p.ay = 900 * v.u; p.stretch = 0 } }
      if (img['fx/sparks']) { var s = FX.spawn(img['fx/sparks'], x, m.y - cp * 0.25, 0, 0, 0.35, cp * 0.5, true); if (s) s.grow = cp }
      AU.scrape(); if (!RM) S.shake = Math.max(S.shake, 0.25)
      call(d < 0 ? 'Itu pagar! Ke kanan saja.' : 'Itu pagar! Ke kiri saja.', 1200, 'rail')
    }
    function ring (x, y, col) { for (var i = 0; i < S.rings.length; i++) if (!S.rings[i].on) { var r = S.rings[i]; r.on = true; r.x = x; r.y = y; r.t = 0; r.col = col || 0; return } }
    function comet (x, y) { for (var i = 0; i < S.comets.length; i++) if (!S.comets[i].on) { var k = S.comets[i]; k.on = true; k.x0 = x; k.y0 = y; k.t = 0; return } }
    function hudPoint (elm) { var r = elm.getBoundingClientRect(), hr = host.getBoundingClientRect(); return { x: (r.left - hr.left + r.width * 0.25) / v.css, y: (r.top - hr.top + r.height / 2) / v.css } }
    function burst (x, y, n, tex, spd, life, size, add) {
      for (var i = 0; i < n; i++) { var a = Math.random() * TAU, sp = spd * (0.4 + Math.random() * 0.6); var p = FX.spawn(tex, x, y, Math.cos(a) * sp, Math.sin(a) * sp, life * (0.7 + Math.random() * 0.5), size * (0.6 + Math.random() * 0.6), add); if (p) { p.drag = 2.2; p.rot = Math.random() * 6; p.vr = (Math.random() - 0.5) * 8 } }
    }

    /* pickups / collisions */
    function pick (o, sx, sy) {
      o.taken = true
      var cp = carPx(), t = o.type
      try { if (HK().onPickup(t, { sx: sx, sy: sy }, API)) { ring(sx, sy, 1); burst(sx, sy, 14, TEX.sparkle, 640 * v.u, 0.6, cp * 0.16, true); return } } catch (e) { console.warn('[Mojo chase] onPickup hook', e) }
      if (t === 'quiz') { S.boost = Math.max(S.boost, 1); S.stars += 2; AU.box(); return }   // no quiz module: a plain bonus
      if (t === 'star' || t === 'coin') {
        S.stars += t === 'coin' ? 2 : 1; S.prog += 0.003; S.boostCharge = Math.min(1, S.boostCharge + 0.12)
        S.combo = S.t - (S.lastPick || -9) < 1.2 ? Math.min(6, (S.combo || 0) + 1) : 0; S.lastPick = S.t
        AU.chime(S.combo); ring(sx, sy, S.combo >= 3 ? 1 : 0); comet(sx, sy)
        if (S.combo >= 2 && S.state === 'active') call('Kombo ' + (S.combo + 1) + '!', 700, 'combo')
        burst(sx, sy, 10, TEX.sparkle, 520 * v.u, 0.55, cp * 0.16, true)
        var g = FX.spawn(TEX.glowY, sx, sy, 0, 0, 0.35, cp * 0.9, true); if (g) g.grow = cp * 1.2
        if (img['fx/collect']) { var cpop = FX.spawn(img['fx/collect'], sx, sy, 0, -60 * v.u, 0.45, cp * 0.4, false); if (cpop) cpop.grow = cp * 0.6 }
        return
      }
      if (t === 'heart') { S.hearts = Math.min(3, S.hearts + 1); AU.chime(); ring(sx, sy, 2); burst(sx, sy, 8, TEX.glowR, 380 * v.u, 0.5, cp * 0.12, true); return }
      if (t === 'pad') { S.boost = Math.max(S.boost, 1.3); AU.boost(); call('Ngebut!', 900, 'pad'); return }
      // gadget boxes: burst, icon flies to HUD
      S.boxes++; AU.box(); ring(sx, sy, 1); burst(sx, sy, 16, TEX.sparkle, 640 * v.u, 0.7, cp * 0.18, true)
      if (W.VFX && W.VFX.dom && !RM) { try { var hr = host.getBoundingClientRect(); W.VFX.dom(hr.left + sx * v.css, hr.top + sy * v.css, { fx: 'pop', size: cp * v.css * 1.2 }) } catch (e) {} }
      var g2 = t === 'mystery' ? ['magnet', 'shield', 'stopwatch', 'boost'][Math.floor(rr() * 4)] : t
      if (g2 === 'rocket') { S.rocket++; S.hasRocket = true; S.rocketBoxAlive = false; call('Roket siap! Dekati pencurinya!', 1600, 'rocket') }
      else if (g2 === 'magnet') { S.magnet = 8; call('Magnet bintang!', 1200, 'magnet') }
      else if (g2 === 'shield') { S.shield = 1; call('Perisai aktif!', 1200, 'shield') }
      else if (g2 === 'stopwatch') { S.slow = 5; S.prog = Math.min(S.hasRocket ? 1 : 0.9, S.prog + 0.06); call('Pencurinya melambat!', 1200, 'slow') }
      else { S.boost = 1.5; AU.boost() }
      H.crateBox.classList.remove('bump'); void H.crateBox.offsetWidth; H.crateBox.classList.add('bump')
    }
    function recovered () {   // control fully back: a quick shimmer ring around Mojo
      var m = mojoXY(), cp = carPx(); ring(m.x, m.y - cp * 0.4, 1)
      for (var i = 0; i < 10; i++) { var a = i * TAU / 10, p = FX.spawn(TEX.sparkle, m.x + Math.cos(a) * cp * 0.5, m.y - cp * 0.4 + Math.sin(a) * cp * 0.25, Math.cos(a) * 120 * v.u, Math.sin(a) * 60 * v.u - 40 * v.u, 0.5, cp * 0.12, true); if (p) p.drag = 2 }
    }
    function hit (o, sx, sy) {
      o.taken = true
      var info = OBJ[o.type], cp = carPx()
      if (S.recover > 0) return                                   // repeated hits never stack (PRD §9)
      if (S.shield) { S.shield = 0; ring(sx, sy, 1); burst(sx, sy, 14, TEX.glowC, 600 * v.u, 0.5, cp * 0.14, true); call('Perisai menahan!', 1100, 'shieldhit'); return }
      // perks: a flyer passes over anything slippery, a jumper hops potholes and rocks
      if (perk === 'fly' && info.kind === 'slip') return
      if (perk === 'jump' && (o.type === 'pothole' || o.type === 'rock') && !(S.hop > 0)) { S.hop = 0.5; AU.whoosh(0); call('Hup! Lompat!', 900, 'hop'); return }
      var immune = false
      if (info.kind === 'slip') {
        if (perk === 'grip' || (perk === 'snow' && look0 === 'snow') || (perk === 'splash' && (o.type === 'oil' || stage.wet))) { S.spin = 0; S.slide = 0; immune = true }
        else if (info.fx === 'spin') { S.spin = 0.8; call('Wiii, licin!', 1000, 'spin') }
        else if (info.fx === 'slide') { S.slide = 0.8; call('Hati-hati, licin!', 1000, 'slide') }
        else { if (!RM) S.shake = Math.max(S.shake, 0.3); S.squash = 0.18 }
        S.recover = perk === 'grip' ? 0.35 : 0.7; S.recoverMax = S.recover; S.hard = false; AU.whoosh()
        burst(sx, sy, 8, TEX.puff, 260 * v.u, 0.6, cp * 0.25, false)
        if (!immune) taunt('Kamu jelek!')
        return
      }
      S.hits++; S.brok++; S.hearts = Math.max(0, S.hearts - 1); S.heartT = 0
      taunt('Kamu jelek!')
      S.recover = perk === 'recover' ? 1.05 : 1.4; S.recoverMax = S.recover; S.hard = true; S.lastHitAt = performance.now(); S.lastHitT = S.simT || 0; if (!RM) { S.hitStop = 0.08; S.hitScale = 0.05 } S.punch = RM ? 0 : 0.14; S.flash = RM ? 0 : 0.35
      if (!RM) S.shake = 0.55
      S.squash = 0.2; AU.brok()
      for (var i = 0; i < S.bursts.length; i++) if (!S.bursts[i].on) { var b = S.bursts[i]; b.on = true; b.x = sx; b.y = sy - cp * 0.2; b.t = 0; break }
      for (var k = 0; k < 12; k++) { var p = FX.spawn(TEX.chunk, sx + (Math.random() - 0.5) * cp * 0.3, sy - cp * 0.15, (Math.random() - 0.5) * 700 * v.u, -(250 + Math.random() * 450) * v.u, 0.85, cp * (0.09 + Math.random() * 0.05), false); if (p) { p.ay = 2400 * v.u; p.vr = (Math.random() - 0.5) * 12; p.rot = 1; p.floor = sy + cp * 0.12; p.flow = 0.9 } }   // chunky debris arcs and bounces
      burst(sx, sy, 10, TEX.puff, 400 * v.u, 0.8, cp * 0.4, false)
      if (W.VFX && W.VFX.dom && !RM) { try { var hr = host.getBoundingClientRect(); W.VFX.dom(hr.left + sx * v.css, hr.top + (sy - cp * 0.2) * v.css, { fx: 'boom', size: cp * v.css * 1.1 }) } catch (e2) {} }
      call(S.hits >= 3 ? 'Tidak apa-apa! Pelan-pelan saja.' : 'BROK! Ayo lanjut!', 1300, 'hit' + (S.hits % 2))
      if (S.hits >= 3) { rowSt.assist = Math.min(1, 0.4 + (S.hits - 3) * 0.15) }
    }

    /* the robber taunts (owner: "Kamu jelek!"): a comic balloon over its cabin, a laugh hop, a tail-light blink, heh-heh */
    function taunt (text, force) {
      if (!force && (S.t - S.tauntAt < 6 || !(S.state === 'active' || S.state === 'tutorial' || S.state === 'lock'))) return
      S.tauntAt = S.t; S.taunts++; S.robHop = 0.6; AU.heh()
      TN.on = true; TN.t = 0; TN.text = text
      // measured once per balloon: the balloon stays under the top HUD and Bo's bubble, and off the rocket button
      try {
        var hr = host.getBoundingClientRect(), tb = q('.mc-top').getBoundingClientRect(), cb = H.call.classList.contains('on') ? H.call.getBoundingClientRect() : null, gb = H.gad.getBoundingClientRect()
        TN.top = (Math.max(tb.bottom, cb ? cb.bottom : 0) - hr.top + 6) / v.css
        TN.gad = { l: (gb.left - hr.left - 8) / v.css, t: (gb.top - hr.top - 8) / v.css }
      } catch (e) { TN.top = v.h * 0.12; TN.gad = null }
    }
    /* a near miss: a hazard slid past while Mojo was still changing lane */
    function nearMiss () {
      if (S.t - S.nearAt < 2.5) return
      S.nearAt = S.t; S.near++; S.stars += 1
      var m = mojoXY(), cp = carPx()
      NM.on = true; NM.t = 0; NM.x = m.x; NM.y = m.y - cp * 1.05
      AU.chime(2); comet(m.x, m.y - cp * 0.8); burst(m.x, m.y - cp * 0.9, 8, TEX.sparkle, 420 * v.u, 0.5, cp * 0.12, true)
    }
    /* tyre smoke: from the rear wheels (per-form emitters), mostly the OUTER wheel of the turn. Rain = water spray,
       snow = snow spray, dirt biomes = dust; boats/hovercraft spray water; aerial forms emit nothing. */
    var DIRT = /desert|farm|forest|construction|canyon|jungle|volcano|autumn|windfarm/
    function tyreKind (a, seg) {
      if (a.kind === 'air') return null
      if (a.kind === 'water' || stage.wet || stage.weather === 'rain') return 'water'
      if (look0 === 'snow' || stage.weather === 'snow') return 'snow'
      if (DIRT.test(look0) || (seg && (seg.surface === 'mud' || seg.surface === 'dirt'))) return 'dust'
      return 'smoke'
    }
    function tyrePuff (dir, k) {
      var a = rearA || { cx: 149, base: 247, bw: 179, dust: [], kind: 'ground' }, seg = track && track.seg(Math.floor((S.z + Z_P) / TR.SEG)), kind = tyreKind(a, seg)
      if (!kind || !a.dust || !a.dust.length) return
      var cp = carPx(), m = mojoXY(), sc = cp / a.bw, ox = m.x - a.cx * sc, oy = m.y - a.base * sc + bob() - (S.hop > 0 ? Math.sin((1 - S.hop / 0.5) * Math.PI) * cp * 0.35 : 0)
      // the outer wheel of a right turn is the LEFT one; 72% of the puffs come from it
      var outer = dir > 0 ? 0 : dir < 0 ? a.dust.length - 1 : Math.floor(Math.random() * a.dust.length), wi = Math.random() < 0.72 ? outer : a.dust.length - 1 - outer, w = a.dust[wi]
      var side = w[0] < a.cx ? -1 : 1, x = ox + w[0] * sc + (Math.random() - 0.5) * cp * 0.04, y = oy + w[1] * sc
      var tex = kind === 'water' ? (img['fx/splash'] || TEX.puff) : kind === 'snow' ? (img['fx/snow-spray'] || TEX.puff) : kind === 'dust' ? (img['fx/dust'] || TEX.puff) : TEX.puff
      // expands, rises and drifts back with the road scroll (a fraction of it: the puff hangs in the air), gone in 0.5-0.7 s
      var p = FX.spawn(tex, x, y, side * (40 + Math.random() * 80) * v.u, -(60 + Math.random() * 70) * v.u, 0.5 + Math.random() * 0.2, cp * 0.16, false)
      if (p) { p.grow = cp * (kind === 'smoke' ? 0.6 : 0.45); p.a = (kind === 'smoke' ? 0.55 : 0.62) * Math.min(1, 0.5 + k); p.flow = 0.3; p.drag = 1.4; S.smoke++ }
      // a brief dark skid mark under the outer wheel (ground only), scrolling with the road
      if (wi === outer && k > 0.35 && kind !== 'water' && a.kind !== 'water') {
        for (var i = 0; i < SK.length && i < (quality ? 20 : 8); i++) if (!SK[i].on) { var s = SK[i]; s.on = true; s.t = 0; s.x = x; s.y = y; s.w = cp * 0.07; break }
      }
    }
    function drawSkids () {
      c.fillStyle = 'rgb(28,26,30)'
      for (var i = 0; i < SK.length; i++) { var s = SK[i]; if (!s.on) continue; c.globalAlpha = 0.3 * (1 - s.t / 0.6); c.fillRect(s.x - s.w / 2, s.y - s.w * 0.3, s.w, s.w * 2.2) }
      c.globalAlpha = 1
    }
    /* spawning */
    function spawnRows () {
      var baseI = Math.floor(S.z / TR.SEG)
      var T = R.TIERS[rowSt.tier] || R.TIERS.B
      while (S.nextRow < baseI + 170) {
        var segI = S.nextRow
        if (S.tutorial < 3 && S.state !== 'load') {
          // star trail: Left -> Centre -> Right (PRD §11.3)
          var tl = [0, 1, 2][S.tutorial]; for (var a = 0; a < 3; a++) addObj('star', tl, segI + a * 3)
          S.starsSpawned += 3; S.tutorial++; S.nextRow += Math.round(T.gap * SPACING); continue
        }
        // education gate: no hazards around it
        rowSt.noHazard = S.eduSeg > 0 && Math.abs(segI - S.eduSeg) < T.gap * 2.5
        var row = R.genRow(rr, rowSt)
        if (atmCalm()) for (var ck = 0; ck < 3; ck++) if (OBJ[row[ck]] && (OBJ[row[ck]].kind === 'block' || OBJ[row[ck]].kind === 'slip')) row[ck] = 'none'   // the atmosphere asked for a calm moment
        // gadget boxes: the capture rocket after 55% (centre lane after 3 hits), a mystery box sometimes
        if (!S.hasRocket && !S.rocketBoxAlive && S.prog > 0.7) {
          var lane = S.hits >= 3 ? 1 : row.indexOf('none'); if (lane < 0) lane = 1
          row[lane] = 'rocket'; S.rocketBoxAlive = true; S.rocketSeg = segI
        } else if (rr() < T.box) { var l2 = row.indexOf('none'); if (l2 >= 0) row[l2] = rr() < 0.75 ? 'mystery' : 'heart' }
        else if (rr() < 0.06) { var l3 = row.indexOf('none'); if (l3 >= 0) row[l3] = 'pad' }
        for (var k = 0; k < 3; k++) { var ft = row[k] === 'none' ? 'none' : row[k]; try { ft = HK().spawnFilter(row[k], { seg: segI, lane: k, elapsed: S.elapsed, prog: S.prog, state: S.state, edu: !!(S.edu && !S.eduDone), eduSeg: S.eduSeg, lock: S.state === 'lock' }) || row[k] } catch (e) {} if (!OBJ[ft] && ft !== 'none') ft = row[k]; row[k] = ft } for (var k = 0; k < 3; k++) if (row[k] !== 'none') { addObj(row[k], k, segI); if (row[k] === 'star') S.starsSpawned++; else if (row[k] === 'coin') S.starsSpawned += 2 }
        S.rows++; S.nextRow += Math.round(T.gap * SPACING)
      }
    }
    function startEdu (segAhead) {
      S.edu = CH.question(); S.eduSeg = segAhead
      track.mark(segAhead, 'gantry')
      H.edu.textContent = S.edu.prompt; H.edu.classList.add('on')
      // ONE callout per event (owner 2026-10-04): the yellow lane pill shows the prompt, Bo's bubble steps aside; the voice still reads it
      H.call.classList.remove('on'); callT = 0
      if (cfg.say) try { cfg.say(S.edu.prompt) } catch (e) {}
    }

    /* capture */
    var CAP = { t: 0, x: 0, y: 0, hit: false, netT: 0 }
    function startCapture () {
      if (S.state !== 'lock') return
      S.state = 'capture'; S.captureMs = S.fireAt ? Math.round(performance.now() - S.fireAt) : -1; S.gadgetUsed = true; S.rocket = Math.max(0, S.rocket - 1); CAP.t = 0; CAP.hit = false; CAP.netT = 0
      var m = mojoXY(); CAP.x = m.x; CAP.y = m.y - carPx() * 0.5
      H.ret.classList.remove('on'); AU.launch(); call('Roket jaring, meluncur!', 1300, 'launch')
    }

    /* finish */
    var finished = false
    function finish (completed, exited) {
      if (finished) return
      finished = true; S.state = 'done'
      var starsR = 1 + (S.stars >= starGoal() ? 1 : 0) + (S.hits <= 2 ? 1 : 0)
      var res = { completed: !!completed, exited: !!exited, stars_collected: S.stars, collisions: S.hits, gadget_used: S.gadgetUsed,
        education_result: S.eduResult || { asked: false }, optional_objectives: { low_collisions: S.hits <= 2, star_goal: starsR >= 2 },
        reward_result: { stars: completed ? starsR : 0, bolts: completed ? 2 : 0 }, elapsed: Math.round(S.elapsed * 10) / 10, chase_id: cfg.chase_id || '' }
      teardown()
      resolve(res)
    }
    function result () {
      S.state = 'result'; AU.siren(false); AU.engine(0)
      var starsR = 1 + (S.stars >= starGoal() ? 1 : 0) + (S.hits <= 2 ? 1 : 0), st = ''
      for (var i = 1; i <= 3; i++) st += '<img class="' + (i <= starsR ? '' : 'off') + '" alt="" src="' + lib('mojo-chase/items/star') + '">'
      var e = S.eduResult
      showCard('<h2 class="fk">Pencuri Tertangkap!</h2><div class="stars">' + st + '</div>' +
        '<div class="cast"><img alt="" src="' + lib('mojo-char/bo-celebrate') + '"><img alt="" src="' + lib('mojo-chase/vehicles/police-van') + '"></div>' +
        '<p>' + (cfg.story_outro || stage.outro) + '</p><div class="why"><span>Bintang terkumpul: ' + S.stars + '</span><span>' +
        (S.hits <= 2 ? 'Menyetir dengan rapi!' : 'Tabrakan: ' + S.hits + '. Lain kali lebih rapi, ya!') + '</span>' +
        (e ? '<span>' + (e.correct ? 'Soal jalur: ' + e.prompt.replace(/[!?]$/, '') + '. Kamu memilih jalur ' + e.answer + '. Tepat sekali!' : 'Soal jalur: ' + e.prompt.replace(/[!?]$/, '') + '. Jalur yang benar: ' + e.answer + '. Kamu memilih jalur ' + e.chose + '. Lain kali pasti bisa!') + '</span>' : '') + '</div>',
        [{ t: cfg.again ? 'Main Lagi' : 'Lanjut', id: 'mc-done', fn: function () { finish(true, false) } }].concat(cfg.again ? [{ t: 'Lanjut', id: 'mc-next', soft: true, fn: function () { finish(true, false); res2() } }] : []))
      function res2 () {}
    }

    /* frame */
    var last = 0, raf = 0, ema = 1 / 60, slowT = 0, fastT = 0, lastStep = 0
    function adapt (dt) {
      ema += (dt - ema) * 0.08
      if (ema > 1 / 46) { slowT += dt; fastT = 0 } else if (ema < 1 / 58) { fastT += dt; slowT = 0 } else { slowT = Math.max(0, slowT - dt); fastT = 0 }
      if (slowT > 0.8 && quality > 0) { quality--; slowT = 0; lastStep = S.t; resize() }
      else if (fastT > 6 && quality < 2 && S.t - lastStep > 10 && !RM) { quality++; fastT = 0; lastStep = S.t; resize() }
    }
    function frame (now) {
      raf = W.requestAnimationFrame(frame)
      W.__mcFrames = (W.__mcFrames || 0) + 1
      var dtr = Math.min(0.05, Math.max(0.001, (now - (last || now)) / 1000)); last = now
      if (S.paused || S.state === 'result' || S.state === 'load' || S.state === 'done') return
      var t0 = performance.now()
      if (!S.qLock) adapt(dtr)
      // FIXED-STEP simulation at 120 Hz + interpolated rendering: motion never stutters when frame times vary.
      // Hit-stop / slow-mo scale simulated time; a tab switch is capped (dtr <= 50 ms, at most 8 steps).
      var ts = S.hitStop > 0 ? S.hitScale : 1
      S.hitStop = Math.max(0, S.hitStop - dtr)
      acc += dtr * ts
      var steps = 0
      while (acc >= STEP && steps < 8) { prevZ = S.z; prevLane = S.lanePos; prevCamX = camX; update(STEP, STEP / ts); acc -= STEP; steps++ }
      if (steps >= 8) acc = 0
      var al = acc / STEP, rz = S.z, rl = S.lanePos
      S.z = prevZ + (rz - prevZ) * al; S.lanePos = prevLane + (rl - prevLane) * al
      FDT = dtr
      render(dtr)
      S.z = rz; S.lanePos = rl
      var ft = performance.now() - t0
      FR[frN % FR.length] = dtr * 1000; frN++
      var tr = TF[quality]; tr.a[tr.n % tr.a.length] = ft; tr.n++
    }
    var STEP = 1 / 120, acc = 0, prevZ = 0, prevLane = 1, prevCamX = 0, FDT = 1 / 60
    var FR = new Float32Array(1200), frN = 0, TF = [{ a: new Float32Array(600), n: 0 }, { a: new Float32Array(600), n: 0 }, { a: new Float32Array(600), n: 0 }]
    function ringArr (r, n) { var len = Math.min(n, r.length), o = []; for (var i = 0; i < len; i++) o.push(r[i]); return o }

    function update (dt, dtr) {
      S.t += dtr; S.simT = (S.simT || 0) + dt
      // phases
      if (S.state === 'cut') {
        S.cutT += dtr
        var ct = S.cutT
        S.robLane = ct < 1.7 ? 2.9 - 1.9 * (ct / 1.7) : 1
        if (ct > 2.1) { var e2 = Math.min(1, (ct - 2.1) / 1.3); S.cutGap = 2600 + (gap0() - 2600) * e2 * e2 }
        if (ct > 2.1 && !S.cutCalled) { S.cutCalled = 1; call('Dia kabur! Ayo kejar!', 1400, 'cut2'); AU.whoosh() }
        if (ct > 2.1 && Math.random() < dtr * 30) { var tp0 = laneScreen(1, S.z + Z_P + S.cutGap); var pf = FX.spawn(TEX.puff, tp0.x + (Math.random() - 0.5) * tp0.w * 0.3, tp0.y - tp0.w * 0.05, (Math.random() - 0.5) * 30, -10, 0.6, tp0.w * 0.08, false); if (pf) { pf.grow = tp0.w * 0.12; pf.a = 0.4 } }
        if (ct > 3.5) endCut()
      }
      if (S.state === 'countdown') {
        S.cdT += dtr; S.cutGap += (gap0() - S.cutGap) * Math.min(1, dtr * 2.5)
        var cdn = 3 - Math.floor(S.cdT / CD_STEP)
        if (cdn >= 1 && cdn !== S.cdN) { S.cdN = cdn; H.count.textContent = String(cdn); H.count.classList.remove('pop'); void H.count.offsetWidth; H.count.classList.add('on', 'pop'); AU.tick(cdn) }
        // the countdown never ends on the wrong car: a picker form that was not preloaded finishes decoding first (4 s cap)
        if (S.cdT >= CD_STEP * 3 && (!formLoad || S.cdT > CD_STEP * 3 + 4)) { H.count.classList.remove('on', 'pop'); AU.tick(0); go() }
      }
      if (S.state === 'swop') { S.phaseT += dtr; if (S.phaseT > 1.2) { S.state = 'tutorial'; S.phaseT = 0; call('Ikuti bintang: kiri, tengah, kanan!', 2200, 'tut') } }
      else if (S.state === 'tutorial') { S.phaseT += dtr; if (S.phaseT > 3) { S.state = 'active'; call('Kejar!', 900, 'go') } }
      var playing = S.state === 'active' || S.state === 'lock' || S.state === 'tutorial'
      if (playing) S.elapsed += dt
      // lane interpolation (ease-out), measured for the gate
      if (S.laneT < 1) {
        S.laneT = Math.min(1, S.laneT + dt * 1000 / S.laneDur)
        var e = 1 - Math.pow(1 - S.laneT, 3); S.lanePos = S.laneFrom + (S.lane - S.laneFrom) * e
        if (S.laneT >= 1) { S.lastLaneMs = Math.round(((S.simT || 0) - S.laneSim) * 1000); S.lanePos = S.lane; if (S.qLane) { var qd = S.qLane; S.qLane = 0; laneTo(qd) } }
      }
      if (S.slide > 0) { S.slide -= dt; S.lanePos += Math.sin(S.t * 14) * dt * 0.6 }
      if (S.spin > 0) S.spin -= dt
      if (S.laneFx > 0) S.laneFx -= dt
      if (S.hop > 0) S.hop -= dt
      if (S.robHop > 0) S.robHop -= dtr
      // speed
      var mult = 1
      if (S.recover > 0) { var k = S.recover / (S.recoverMax || 1.4); mult = 1 - 0.32 * k; S.recover -= dt; if (S.recover <= 0 && S.hard) { S.recoveryMs.push(Math.round((S.simT - S.lastHitT + 0.08) * 1000)); /* simulated time + the 80 ms hit-stop: a stalled test machine must not count */ recovered() } }
      if (S.boost > 0) { S.boost -= dt; mult *= perk === 'boost' ? 1.42 : 1.32 }
      var seg = track.seg(Math.floor((S.z + Z_P) / TR.SEG))
      if (seg && seg.surface === 'mud' && perk !== 'grip') mult *= 0.9
      if (perk === 'snow' && look0 === 'snow') mult *= 1.06
      if (perk === 'splash' && (stage.wet || stage.weather === 'rain' || (seg && seg.bridge))) mult *= 1.05
      if (S.state === 'capture' || S.state === 'resolve') mult = S.stop
      if (S.state === 'swop') mult = 0.5 + S.phaseT * 0.4
      if (S.state === 'cut' || S.state === 'countdown') { mult = 0; S.speed = 0 }
      S.speed += (mult - S.speed) * Math.min(1, dt * 4)
      if (!S.boost || S.boost <= 0) S.boostCharge = Math.min(1, S.boostCharge + dt / (perk === 'boost' ? 4 : 5))
      var dz = BASE_SPEED * S.speed * dt, prevPZ = S.z + Z_P
      S.z += dz
      var baseI = Math.floor(S.z / TR.SEG)
      track.ensure(Math.max(0, baseI - 4))
      var bseg = track.seg(baseI)
      scene.advance(dz, bseg ? bseg.curve : 0, dt)
      S.tunnel += ((seg && seg.tunnel ? 1 : 0) - S.tunnel) * Math.min(1, dt * 3)
      // hearts refill after clean driving
      S.heartT += dt; if (S.heartT > (perk === 'heal' ? 5 : 9) && S.hearts < 3) { S.hearts++; S.heartT = 0 }
      // progress + rubber band
      if (S.state === 'active' || S.state === 'lock') {
        var ps = { prog: S.prog, best: S.best, speed: S.speed * (S.slow > 0 ? 1.25 : 1), elapsed: S.elapsed, seconds: S.seconds, hits: S.hits, hasRocket: S.hasRocket }
        R.progress(ps, dt); S.prog = ps.prog; S.best = ps.best
        if (S.slow > 0) S.slow -= dt
        if (S.magnet > 0) S.magnet -= dt
        if (!S.eduDone && S.prog > 0.32 && !S.edu) startEdu(Math.floor((S.z + Z_P) / TR.SEG) + 75)
        if (S.prog >= 0.97 && S.hasRocket && S.state === 'active') { S.state = 'lock'; S.lockT = 0; call('Roket siap! Ketuk roketnya!', 2000, 'lock'); H.ret.classList.add('on'); AU.clack() }
        if (!S.hasRocket && S.prog >= 0.9 && S.rocketBoxAlive && S.rocketSeg < baseI) S.rocketBoxAlive = false   // missed: another comes
        if (S.prog > 0.84 && S.prog < 0.9) call('Hampir sampai!', 1500, 'close')
      }
      if (S.state === 'lock') { S.lockT += dt; if (S.lockT > 7 && S.lockT < 7.2) call('Ketuk tombol roket!', 1600, 'lock2'); if (S.lockT > 12) startCapture() }
      spawnRows()
      // collisions + pickups: objects whose z crosses the player plane this frame
      var pz = S.z + Z_P
      for (var i = 0; i < POOL.length; i++) {
        var o = POOL[i]; if (!o.on) continue
        o.t += dt
        if (o.seg < baseI - 2) { o.on = false; continue }
        if (o.taken) continue
        var oz = o.seg * TR.SEG + TR.SEG / 2
        if (oz > prevPZ && oz <= pz) {
          // hazards collide with the car body (85% size: the box shrank with it); pickups keep their generous reach
          var d = Math.abs(o.lane - S.lanePos), info = OBJ[o.type], haz = info.kind === 'block' || info.kind === 'slip', reach = haz ? 0.55 * CAR_K : info.kind === 'pick' && S.magnet > 0 ? 1.6 : 0.55
          if (d < reach && S.spin <= 0.6) {
            var sp = laneScreen(o.lane, pz)
            if (haz) hit(o, sp.x, sp.y); else pick(o, sp.x, sp.y)
          } else if (info.kind === 'block' && d < 0.95 && S.recover <= 0 && (S.state === 'active' || S.state === 'lock')) nearMiss()
        }
      }
      // the education gate
      if (S.edu && !S.eduDone && S.eduSeg * TR.SEG < pz) {
        S.eduDone = true; H.edu.classList.remove('on')
        var choice = S.edu.choices[Math.round(S.lanePos)], ok = choice === S.edu.answer
        S.eduResult = { asked: true, prompt: S.edu.prompt, answer: S.edu.answer, chose: choice, correct: ok }
        if (ok) { S.stars += 3; S.prog += 0.03; AU.cue('correct'); var m = mojoXY(); burst(m.x, m.y - carPx() * 0.6, 24, TEX.sparkle, 900 * v.u, 0.9, carPx() * 0.2, true); ring(m.x, m.y - carPx() * 0.5, 0); call('Benar! Jalur ' + S.edu.answer + '! Bonus bintang!', 1800, 'eduok') }
        else call('Jalur yang benar ' + S.edu.answer + '. Ayo terus kejar!', 1800, 'eduno')
      }
      // target weaving
      S.targetNext -= dt
      if (S.targetNext <= 0 && (S.state === 'active' || S.state === 'tutorial')) { S.targetLane = Math.floor(rr() * 3); S.targetNext = 2.5 + rr() * 2.5 }
      S.targetLanePos += (S.targetLane - S.targetLanePos) * Math.min(1, dt * 1.6)
      // capture sequence
      if (S.state === 'capture') updateCapture(dt)
      if (S.state === 'resolve') { S.resolveT += dt; S.strobe = Math.min(1, S.strobe + dt * 2); S.policeZ += (pz + gap() + 260 - S.policeZ) * Math.min(1, dt * 1.2); if (S.resolveT > 4.2 && S.state === 'resolve') result() }
      // fx timers
      S.shake = Math.max(0, S.shake - dt * 1.6); S.flash = Math.max(0, S.flash - dt * 2.4); S.squash = Math.max(0, (S.squash || 0) - dt)
      if (S.punch > 0) { S.punch -= dt; canvas.classList.toggle('punch', S.punch > 0) }
      if (callT > 0) { callT -= dtr; if (callT <= 0) H.call.classList.remove('on') }
      // emitters
      emit(dt)
      if (HK().atmos && HK().atmos.update) try { HK().atmos.update(dt, API.state()) } catch (e) {}
      FX.update(dt, (v.h - v.hy) * S.speed * 1.6)
      for (var si = 0; si < SK.length; si++) { var sk = SK[si]; if (!sk.on) continue; sk.t += dt; sk.y += (v.h - v.hy) * S.speed * 1.6 * dt; if (sk.t > 0.6 || sk.y > v.h + sk.w) sk.on = false }   // skid marks scroll with the road
      AU.engine(S.state === 'result' ? 0 : S.speed)
      hudUpdate()
      if (S.auto) autopilot()
    }
    function starGoal () { return Math.max(6, Math.round(S.seconds / 7)) }   // the 'n/10' goal in the HUD = the second result star
    function gap0 () { return 1700 + (1 - Math.min(1, S.prog)) * 3600 }
    function gap () { return S.state === 'cut' || S.state === 'countdown' ? S.cutGap : gap0() }   // the robber stays readable on screen (mockup)
    function laneX (lanePos) { return TR.LANES[0] * TR.ROADW + (TR.LANES[2] - TR.LANES[0]) * TR.ROADW * lanePos / 2 }
    var tmpP = { x: 0, y: 0, w: 0, s: 0 }
    function laneScreen (lane, z) {
      var s = track.seg(Math.floor(z / TR.SEG)), off = s && s.screenOffset != null ? s.screenOffset : 0
      TR.project(tmpP, laneX(lane) - off, track.yAt(z), z, cam, v)
      return tmpP
    }
    function updateCapture (dt) {
      CAP.t += dt
      var tz = S.z + Z_P + gap(), tp = laneScreen(S.targetLanePos, tz), ty = tp.y - tp.s * 600 * v.vh
      if (!CAP.hit) {
        // homing rocket with a decaying spiral, a smoke ribbon and a flame
        var k = Math.min(1, CAP.t / 0.95), sp = (1 - k) * 60 * v.u
        var nx = CAP.x + (tp.x - CAP.x) * Math.min(1, dt * 5.5) + Math.cos(CAP.t * 18) * sp, ny = CAP.y + (ty - CAP.y) * Math.min(1, dt * 5.5) + Math.sin(CAP.t * 18) * sp
        CAP.ang = Math.atan2(ny - CAP.y, nx - CAP.x); CAP.x = nx; CAP.y = ny
        var cp = carPx()
        var s1 = FX.spawn(TEX.puff, CAP.x, CAP.y, (Math.random() - 0.5) * 30, 20, 0.9, cp * 0.14, false); if (s1) { s1.grow = cp * 0.35; s1.a = 0.75 }
        var f1 = FX.spawn(TEX.glowO, CAP.x, CAP.y, 0, 0, 0.18, cp * 0.35, true); if (f1) f1.grow = -cp * 0.6
        if (CAP.t > 0.95 || Math.abs(CAP.x - tp.x) + Math.abs(CAP.y - ty) < 12 * v.u) {
          CAP.hit = true; CAP.netT = 0; S.hitStop = RM ? 0 : 0.6; S.hitScale = 0.3; S.flash = RM ? 0 : 0.6; AU.net()
          burst(tp.x, ty, 40, TEX.sparkle, 1200 * v.u, 1.1, cp * 0.2, true)
          var cols = [TEX.glowY, TEX.glowR, TEX.glowB, TEX.glowC, TEX.glowP]
          for (var i = 0; i < 70; i++) { var p = FX.spawn(img['fx/confetti'] || cols[i % 5], tp.x, ty, (Math.random() - 0.5) * 1400 * v.u, -(400 + Math.random() * 900) * v.u, 2.2, cp * 0.09, false); if (p) { p.ay = 900 * v.u; p.drag = 1.2; p.vr = (Math.random() - 0.5) * 12; p.rot = 1 } }
          for (var fw = 0; fw < 4; fw++) { var fx = v.w * (0.2 + fw * 0.2), fy = v.hy * (0.3 + (fw % 2) * 0.2); burst(fx, fy, 26, cols[fw % 5], 700 * v.u, 1.2, cp * 0.1, true); if (img['fx/fireworks']) { var fwp = FX.spawn(img['fx/fireworks'], fx, fy, 0, 0, 1.1, cp * 0.6, true); if (fwp) fwp.grow = cp * 0.8 } }
          call('Hore! Kena jaring!', 1500, 'netok', true); taunt(rr() < 0.5 ? 'Waduh!' : 'Ampun!', true)
          if (H.callImg) { H.callImg.src = lib('mojo-char/bo-celebrate'); H.call.classList.add('cheer') }   // Bo cheers the capture
        }
      } else {
        CAP.netT += dt
        S.stop = Math.max(0.2, 1 - CAP.netT * 0.7)
        if (CAP.netT > 1.6) { S.state = 'resolve'; S.resolveT = 0; S.policeZ = S.z - 2000; AU.siren(true); track.mark(Math.floor((S.z + Z_P + gap()) / TR.SEG) + 3, 'finish'); call('Polisi datang! Barangnya kembali!', 2400, 'police') }
      }
    }
    function emit (dt) {
      var m = mojoXY(), cp = carPx(), q = QUAL[quality].cap
      var a = rearA || { cx: 149, base: 247, bw: 179, dust: [], exhaust: [], kind: 'ground' }, k = cp / a.bw, ox = m.x - a.cx * k, oy = m.y - a.base * k + bob()
      // exhaust puffs (boost: flame)
      if (Math.random() < dt * 14 * q) for (var i = 0; i < a.exhaust.length; i++) { var ex = a.exhaust[i], p = FX.spawn(TEX.puff, ox + ex[0] * k, oy + ex[1] * k, (Math.random() - 0.5) * 40 * v.u, 30 * v.u, 0.7, cp * 0.1, false); if (p) { p.grow = cp * 0.25; p.a = 0.28; p.flow = 0.9 } }
      // wheel dust / water spray
      if (S.speed > 0.4 && Math.random() < dt * 22 * q) for (var j = 0; j < a.dust.length; j++) {
        var dd = a.dust[j], tex = a.kind === 'water' ? (img['fx/splash'] || TEX.puff) : stage.biome === 'snow' ? (img['fx/snow-spray'] || TEX.puff) : TEX.puff
        var d = FX.spawn(tex, ox + dd[0] * k + (Math.random() - 0.5) * cp * 0.1, oy + dd[1] * k, (dd[0] < a.cx ? -1 : 1) * 60 * v.u, 40 * v.u, 0.6, cp * 0.12, false)
        if (d) { d.grow = cp * 0.3; d.a = stage.biome === 'desert' ? 0.55 : 0.32; d.flow = 0.8 }
      }
      // tyre smoke on lane changes and sharp curves; intensity scales with speed and curve sharpness
      var tseg = track.seg(Math.floor((S.z + Z_P) / TR.SEG)), tc = tseg ? tseg.curve : 0, turn = 0, tdir = 0
      if (S.laneT < 1) { turn = 1 - S.laneT * 0.5; tdir = S.lane > S.laneFrom ? 1 : -1 }
      var ca = Math.abs(tc); if (ca > 1.1) { var ck = Math.min(1, (ca - 1.1) / 1.6); if (ck > turn) { turn = ck; tdir = tc > 0 ? 1 : -1 } }
      var ti = (S.state === 'active' || S.state === 'lock' || S.state === 'tutorial') && S.speed > 0.35 ? turn * Math.min(1.3, S.speed) : 0
      if (ti > 0.05) {
        S.smokeAcc += dt * 60 * ti * q * (RM ? 0.35 : 1)

        for (var tn = 0; S.smokeAcc >= 1 && tn < 3; tn++) { S.smokeAcc -= 1; tyrePuff(tdir, ti) }
        if (S.smokeAcc > 3) S.smokeAcc = 0
        if (!RM && ti > 0.55 && S.t - S.squealAt > 0.9 && tyreKind(a, tseg) === 'smoke') { S.squealAt = S.t; AU.squeal() }
      } else S.smokeAcc = 0
      // speed lines from the vanishing point (boost) + edge motion streaks
      if ((S.boost > 0 || S.speed > 1.08 || S.prog > 0.55) && Math.random() < dt * (S.boost > 0 ? 60 : 30 * Math.max(0, S.prog - 0.5)) * q) {
        var ang = (0.12 + Math.random() * 0.76) * Math.PI, r0 = v.w * 0.16, sx = v.cx + Math.cos(ang) * r0, sy = v.hy + Math.sin(ang) * r0 * 0.6
        var l = FX.spawn(TEX.speed, sx, sy, Math.cos(ang) * v.w * 1.6, Math.sin(ang) * v.w * 1.0, 0.3, v.h * 0.07, true); if (l) { l.stretch = 1; l.a = 0.4 }
      }
      if (S.state === 'active' || S.state === 'lock' || S.state === 'tutorial') { scene.weather(dt, FX, 1, q); scene.biomeFx(dt, FX, q) }
    }
    function bob () { return Math.sin(S.t * 17) * 1.1 * v.u + (S.recover > 0 ? Math.abs(Math.sin(S.t * 9)) * -6 * v.u * (S.recover / 1.4) : 0) }

    /* render */
    function HK () { return W.MojoChase.hooks }
    function AT () { var h = HK(); return (h && h.atmos) || null }
    function atmCalm () { var A = AT(); try { return !!(A && A.calm && A.calm()) } catch (e) { return false } }
    // hooks v2 values read ONCE per rendered frame; AV = the view handed to the atmosphere (one object, refreshed)
    var atm = { L: 0, tint: null, tg: 0, sw: 0 }, AV = { w: 0, h: 0, hy: 0, css: 1, port: false, u: 1, pr: 1, cx: 0, playerY: 0, curveOff: 0, quality: 2, skyPre: true }
    var BK = { pre: null, tint: null }
    function atmFrame () {
      var A = AT(); atm.L = 0; atm.tint = null; atm.tg = 0; atm.sw = 0; BK.pre = null; BK.tint = null
      if (!A) return null
      try {
        atm.L = A.lightsOn ? clamp(+A.lightsOn() || 0, 0, 1) : 0
        var tn = A.tint ? A.tint() : null; atm.tint = tn && tn.a > 0 ? tn : null
        atm.tg = A.telegraph ? clamp(+A.telegraph() || 0, 0, 1) : 0; atm.sw = A.sway ? clamp(+A.sway() || 0, 0, 1) : 0
      } catch (e) {}
      AV.w = v.w; AV.h = v.h; AV.hy = v.hy; AV.css = v.css; AV.port = v.port; AV.u = v.u; AV.pr = v.pr; AV.cx = v.cx; AV.playerY = v.playerY; AV.curveOff = scene.curveOff || 0; AV.quality = quality
      BK.pre = A.drawSky ? skyPre : null; BK.tint = atm.tint
      return A
    }
    function skyPre () { try { AT().drawSky(c, AV, 'pre') } catch (e) {} }
    function roadOv (s, k) { try { AT().roadSeg(c, s, k, AV) } catch (e) {} }
    function laneObjsNear () { var n = 0, s0 = Math.floor((S.z + Z_P) / TR.SEG); for (var i = 0; i < POOL.length; i++) { var o = POOL[i]; if (o.on && !o.taken && o.seg >= s0 && o.seg < s0 + 60) n++ } return n }
    var API = {
      host: host, stage: stage,
      rng: function () { return rr() },
      pause: function (reason) { if (S.paused) return; S.paused = true; S.pauseReason = reason || 'hook'; AU.engine(0); AU.siren(false) },
      resume: function () { if (!S.paused || S.pauseReason === 'menu') return; S.paused = false; S.pauseReason = null; last = performance.now(); acc = 0 },
      state: function () { var tod = null; try { tod = HK().atmos && HK().atmos.timeOfDay ? HK().atmos.timeOfDay() : null } catch (e) {} return { state: S.state, speed: S.speed, prog: S.prog, elapsed: S.elapsed, lane: S.lane, z: S.z, stage: stage.id, form: formId, timeOfDay: tod, paused: S.paused, pauseReason: S.pauseReason, night: !!(scene ? scene.night : stage.night), quality: quality, tunnel: S.tunnel, laneObjsNear: laneObjsNear(), t: S.t } },
      view: function () { return { w: v.w, h: v.h, hy: v.hy, css: v.css, port: v.port, u: v.u } },
      robber: function () { return S.targetScreen || null },
      reward: function (o) { o = o || {}; if (o.stars) S.stars += o.stars; if (o.boost) S.boost = Math.max(S.boost, o.boost); if (o.rocket) { S.rocket += o.rocket; S.hasRocket = true } },
      call: function (t, ms) { call(t, ms || 1400, 'hook' + t, true) },
      clearAhead: function (sec) { var zz = S.z + Z_P + BASE_SPEED * (sec || 1.5); for (var i = 0; i < POOL.length; i++) { var o = POOL[i]; if (o.on && !o.taken && OBJ[o.type].kind !== 'pick' && o.seg * TR.SEG < zz) o.taken = true } }
    }
    function OFFK (k) { return W.__mcOff && W.__mcOff[k] }
    var cam = { x: 0, y: 0, z: 0, depth: 1 }
    function render () {
      var fov = 1 - 0.08 * Math.min(1, Math.max(0, S.boost) / 0.4)
      if (S.state === 'swop') fov = 1 + 0.25 * Math.max(0, 1 - S.phaseT / 1.2)
      v.hw = base.hw * fov; v.vh = base.vh * fov; v.hy = base.hy - (1 - fov) * v.h * 0.04
      var pz = S.z + Z_P
      cam.z = S.z; camX += (laneX(S.lanePos) * 0.55 - camX) * (1 - Math.exp(-FDT * 7)); cam.x = camX
      cam.y = TR.CAM_H + track.yAt(pz) + (S.state === 'swop' ? (1 - S.phaseT / 1.2) * 900 : 0)
      var P = S.prof, pt = P ? performance.now() : 0
      function mark (k) { if (!P) return; if (W.__mcFlush) c.getImageData(0, 0, 1, 1); var n = performance.now(); P[k] = (P[k] || 0) * 0.95 + (n - pt) * 0.05; pt = n }
      c.save()
      if (S.shake > 0 && !RM) c.translate((Math.random() - 0.5) * S.shake * 26 * v.u, (Math.random() - 0.5) * S.shake * 18 * v.u)
      var A5 = atmFrame()
      if (!OFFK('bk')) { scene.drawBack(c, cam.y, quality, BK); scene.biomeLight(c) }   // (the atmosphere's sky is drawn once, at the 'pre' point inside drawBack: a 'late' call would paint over FAR/MID) mark('back')
      var night = scene.night
      if (!OFFK('road')) TR.renderRoad(c, track, cam, v, drawN, segSpr, A5 && A5.roadSeg ? roadOv : null); mark('road')
      if (!(W.__mcOff && W.__mcOff.sh)) scene.shimmer(c, canvas, quality); drawLaneFx(); drawSkids(); if (!(W.__mcOff && W.__mcOff.pl)) drawPlayer(night); mark('player')
      if (!OFFK('fx')) { FX.draw(c, false); FX.draw(c, true) } mark('fx')
      drawOverlays()
      c.restore()
      if (A5 && A5.drawOverlay) try { A5.drawOverlay(c, AV) } catch (e) {}
      PST.quality = quality; PST.boost = Math.min(1, Math.max(0, S.boost)); PST.flash = S.flash; PST.strobe = S.strobe; PST.tunnel = S.tunnel; PST.atmosLight = atm.L
      if (!OFFK('post')) scene.post(c, PST); mark('post')
    }
    var PST = { quality: 2, boost: 0, flash: 0, strobe: 0, tunnel: 0, atmosLight: 0 }
    function segSpr (s, j) { if (!OFFK('sp')) drawSegSprites(s, j, scene.night) }
    // MIP levels: each sprite keeps half/quarter/eighth copies; a far sprite is drawn from the smallest level that is
    // still >= its screen size, so the rasteriser never downsamples a 600 px image to 20 px every frame
    var MIP = new Map()
    function mip (im, dw) {
      var L = MIP.get(im)
      if (!L) {
        L = [im]; var w0 = im.naturalWidth || im.width, h0 = im.naturalHeight || im.height
        for (var k = 2; w0 / k >= 24; k *= 2) { var cc = D.createElement('canvas'); cc.width = Math.round(w0 / k); cc.height = Math.round(h0 / k); cc.getContext('2d').drawImage(L[L.length - 1], 0, 0, cc.width, cc.height); L.push(cc) }
        MIP.set(im, L)
      }
      var best = L[0]
      for (var i = 1; i < L.length; i++) if (L[i].width >= dw) best = L[i]; else break
      return best
    }
    function spr (im, x, y, wpx, anchor, alpha) {
      if (!im) return
      var a = anchor, nw = im.naturalWidth || im.width, nh = im.naturalHeight || im.height, k = wpx / (a ? (a.right != null ? a.right - a.left + 1 : a.bw) : nw), ax = a ? a.cx : nw / 2, ay = a ? a.base : nh
      if (alpha != null) c.globalAlpha = alpha
      var dw = Math.round(nw * k)
      c.drawImage(mip(im, dw), Math.round(x - ax * k), Math.round(y - ay * k), dw, Math.round(nh * k))
      c.globalAlpha = 1
    }
    // candy props drawn once into canvases (no owner sprite exists): a striped lollipop and a sugared gumdrop
    function procProp (kind) {
      var cvs = D.createElement('canvas'), x = cvs.getContext('2d')
      if (kind === 'lollipop') {
        cvs.width = 120; cvs.height = 260
        x.fillStyle = '#f5f5f5'; x.fillRect(56, 100, 8, 156); x.strokeStyle = '#d0d0d0'; x.lineWidth = 2; x.strokeRect(56, 100, 8, 156)
        var cols = ['#ff5cbe', '#ffd54a', '#4ce0ff', '#ffffff']
        for (var r = 56; r > 4; r -= 9) { x.fillStyle = cols[(r / 9 | 0) % 4]; x.beginPath(); x.arc(60, 60, r, 0, TAU); x.fill() }
        x.strokeStyle = 'rgba(120,20,80,.6)'; x.lineWidth = 4; x.beginPath(); x.arc(60, 60, 56, 0, TAU); x.stroke()
        x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.ellipse(40, 38, 14, 8, -0.6, 0, TAU); x.fill()
      } else {
        cvs.width = 140; cvs.height = 120
        var g = x.createLinearGradient(0, 10, 0, 118); g.addColorStop(0, '#7fe7ff'); g.addColorStop(1, '#2a8fd8')
        x.fillStyle = g; x.beginPath(); x.moveTo(10, 116); x.quadraticCurveTo(10, 10, 70, 10); x.quadraticCurveTo(130, 10, 130, 116); x.closePath(); x.fill()
        x.strokeStyle = '#1b5f99'; x.lineWidth = 4; x.stroke()
        x.fillStyle = '#ffffff'; for (var k = 0; k < 26; k++) x.fillRect(22 + (k * 37) % 96, 26 + (k * 53) % 80, 4, 4)
        x.fillStyle = 'rgba(255,255,255,.5)'; x.beginPath(); x.ellipse(48, 38, 16, 9, -0.5, 0, TAU); x.fill()
      }
      cvs.naturalWidth = cvs.width; cvs.naturalHeight = cvs.height
      return cvs
    }
    function famA (fam, name) { var F = fam === 'track' ? TA && TA.families : CA && CA.families; if (!F) return null; for (var f in F) if (F[f].sprites[name]) return F[f].sprites[name]; return null }
    var PROPA = {}
    function propA (key) { var h = PROPA[key]; if (h !== undefined) return h; return (PROPA[key] = propA0(key)) }
    function propA0 (key) { var n = key.split('/').pop(), CX = W.MojoCodexAnchors, cpa = key.indexOf('/cprops/') > 0 && CX && CX.families.cprops[n]; if (cpa) return { cx: cpa.w / 2, base: cpa.h - 4, bw: cpa.w - 8 }; return (CA && CA.families.props.sprites[n]) || (CA && CA.families.items.sprites[n]) || (TA && (TA.families.trackprops.sprites[n] || TA.families.signs.sprites[n])) || null }
    function drawSegSprites (s, j, night) {
      var p1 = s.p1, scale = p1.s, clip = s.clip, fog = s.fog / 24
      if (p1.y <= v.hy - 2 || j < 5) return
      var alpha = fog > 0.6 ? Math.max(0, 1 - (fog - 0.6) * 2.4) : 1
      if (p1.y > clip + 2 || alpha <= 0.02) return   // hidden behind a nearer hill crest, or still inside the fog
      // roadside props
      for (var i = 0; i < s.nProps; i++) {
        var pr = s.props[i], im = imgP[pr.key]; if (!im) continue
        var wx = pr.side * TR.ROADW * pr.off, x = p1.x + scale * wx * v.hw, wpx = scale * pr.size * v.hw
        if (wpx < 2) continue
        var an = propA(TR.PROP_KEY[pr.key])
        if (/chevron/.test(pr.key) && pr.side > 0) { c.save(); c.translate(x, 0); c.scale(-1, 1); spr(im, 0, p1.y, wpx, an, alpha); c.restore() }   // left-curve chevrons point left
        else if (atm.sw > 0.05 && j < 120 && swayOk(pr.key)) {   // wind: trees lean from the base (skew), each with its own phase
          c.save(); c.translate(x, p1.y); c.transform(1, 0, Math.sin(S.t * 1.7 + s.i * 0.7 + i) * 0.07 * atm.sw, 1, 0, 0); spr(im, 0, 0, wpx, an, alpha); c.restore()
        } else spr(im, x, p1.y, wpx, an, alpha)
        if (pr.key === 'lamp' && (night || S.tunnel > 0.3 || atm.L > 0.1)) lampLight(x, p1.y, wpx, an, scale, night || S.tunnel > 0.3 ? 1 : atm.L)
      }
      // bridge towers + cables (procedural, red)
      if (s.tower) {   // the Codex red suspension tower spans the road (a gate the car drives through)
        var tw0 = imgP['bridge-tower']
        if (tw0) spr(tw0, p1.x, p1.y, p1.w * 2.9, propA('mojo-chase/cprops/red-suspension-bridge-tower'), alpha)
      }
      // (bridge cables were drawn per segment as strokes and streaked across the sky: removed, towers carry the look)
      // tunnel ceiling lights (passing light, additive)
      if (s.tunnel && s.i % 4 === 0) { c.globalCompositeOperation = 'lighter'; var lw = p1.w * 0.9; c.globalAlpha = 0.8 * alpha; c.drawImage(TEX.glowY, p1.x - lw / 2, p1.y - scale * 2550 * v.vh - lw * 0.25, lw, lw * 0.5); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over' }
      // gantry (education lane hint) + the number boards
      if (s.gantry && S.edu) {
        var g = img['p:gantry'], gw = p1.w * 2.6
        spr(g, p1.x, p1.y, gw, propA(TR.PROP_KEY.gantry), alpha)
        for (var L = 0; L < 3; L++) {
          var bx = p1.x + scale * laneX(L) * v.hw, by = p1.y - scale * 1900 * v.vh, bw = scale * 620 * v.hw
          c.fillStyle = '#ffd54a'; c.strokeStyle = '#7a4a00'; c.lineWidth = Math.max(1, bw * 0.06)
          roundRect(bx - bw / 2, by - bw * 0.42, bw, bw * 0.84, bw * 0.16); c.fill(); c.stroke()
          c.fillStyle = '#3a2300'; c.font = '900 ' + Math.round(bw * 0.62) + 'px "Fredoka One",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(S.edu.choices[L], bx, by + bw * 0.04)
        }
      }
      // lane objects
      for (var o = 0; o < s.objs.length; o++) drawObj(s.objs[o], s, alpha, j)
      // the robber vehicle and the police van ride on their segment
      var tz = S.z + Z_P + gap(), ti = Math.floor(tz / TR.SEG)
      if (ti === s.i && S.state !== 'load') {
        var rob = S.state === 'cut' && S.cutT < 2.1 && img.robber
        if (rob) {   // the running robber: bobbing stride, then a hop into the car
          var ct2 = S.cutT, rw = p1.s * 560 * v.hw, rx = p1.x + p1.s * laneX(S.robLane) * v.hw, hop = ct2 > 1.7 ? Math.sin((ct2 - 1.7) / 0.4 * Math.PI) * rw * 0.7 : Math.abs(Math.sin(ct2 * 14)) * rw * 0.08
          var sc2 = ct2 > 1.7 ? 1 - (ct2 - 1.7) / 0.4 * 0.5 : 1
          drawTarget(s, tz)
          c.globalAlpha = 0.3; c.fillStyle = '#000'; c.beginPath(); c.ellipse(rx, p1.y, rw * 0.35, rw * 0.07, 0, 0, TAU); c.fill(); c.globalAlpha = 1
          spr(img.robber, rx, p1.y - hop, rw * sc2, CA && CA.families.robbers.sprites['robber-beanie'], 1)
        } else drawTarget(s, tz)
      }
      if (S.state === 'resolve' && Math.floor(S.policeZ / TR.SEG) === s.i) drawPolice(s)
      if (s.finish) spr(img['p:finish'], p1.x, p1.y, p1.w * 2.8, propA(TR.PROP_KEY.finish), alpha)
    }
    function roundRect (x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath() }
    var SWAY = {}
    function swayOk (key) { var h = SWAY[key]; if (h === undefined) h = SWAY[key] = /tree|palm|pine|bush|cactus|bamboo|sakura|cherry|reed|grass|flower|birch|maple|oak|fern/.test(key + ' ' + (TR.PROP_KEY[key] || '')); return h }
    function lampLight (x, y, wpx, an, scale, k) {
      k = k == null ? 1 : k
      c.globalCompositeOperation = 'lighter'
      var hh = an ? (an.base - an.top) * wpx / (an.bw || 1) : wpx * 3
      c.globalAlpha = 0.9 * k; c.drawImage(TEX.glowY, x - wpx * 1.1, y - hh - wpx * 0.9, wpx * 2.2, wpx * 2.2)
      c.globalAlpha = 0.35 * k; c.drawImage(TEX.glowY, x - wpx * 3, y - wpx * 0.5, wpx * 6, wpx * 1.4)               // the light pool on the road
      if (stage.wet) { c.globalAlpha = 0.3 * k; c.drawImage(TEX.glowY, x - wpx * 0.4, y, wpx * 0.8, hh * 0.9) }   // wet reflection streak
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'
    }
    var HUES = null
    function drawObj (o, s, alpha, j) {
      if (!o.on || o.taken) return
      var info = OBJ[o.type], p1 = s.p1, scale = p1.s, x = p1.x + scale * laneX(o.lane) * v.hw, wpx = scale * info.w * v.hw
      if (wpx < 1.5) return
      var im = img['o:' + o.type], an = propA(info.k)
      var y = p1.y - (info.fy ? scale * info.fy * v.vh * (1 + 0.12 * Math.sin(S.t * 4 + o.lane)) : 0)
      if (info.kind === 'pick' || info.kind === 'box') {
        // shadow + glow
        c.globalAlpha = 0.25 * alpha; c.fillStyle = '#000'; c.beginPath(); c.ellipse(x, p1.y, wpx * 0.35, wpx * 0.08, 0, 0, TAU); c.fill(); c.globalAlpha = 1
        c.globalCompositeOperation = 'lighter'
        if (info.kind === 'box') {
          if (!HUES) HUES = [TEX.glowC, TEX.glowP, TEX.glowY, TEX.glowR]
          var hue = HUES[Math.floor(S.t * 4 + o.lane) % 4]
          // a rainbow PILLAR of light, visible from far away so children steer toward the box
          c.globalAlpha = 0.55 * Math.max(alpha, 0.6); c.drawImage(hue, x - wpx * 0.35, y - wpx * 7, wpx * 0.7, wpx * 7.4)
          c.globalAlpha = 0.85 * alpha; c.drawImage(hue, x - wpx * 1.1, y - wpx * 1.6, wpx * 2.2, wpx * 2.2)
          c.save(); c.translate(x, y - wpx * 0.5); c.rotate(S.t * 0.8); c.globalAlpha = 0.45 * alpha; c.drawImage(TEX.rays, -wpx * 1.4, -wpx * 1.4, wpx * 2.8, wpx * 2.8); c.restore()
        } else {
          // gold shimmer: a soft glow that breathes, plus a twinkle that sweeps around the pickup
          c.globalAlpha = (0.45 + 0.2 * Math.sin(S.t * 6 + o.seg)) * alpha; c.drawImage(TEX.glowY, x - wpx * 0.8, y - wpx * 1.3, wpx * 1.6, wpx * 1.6)
          var ta = S.t * 3 + o.seg, tw = wpx * 0.28 * (0.6 + 0.4 * Math.sin(S.t * 9 + o.seg))
          c.globalAlpha = 0.9 * alpha; c.drawImage(TEX.sparkle, x + Math.cos(ta) * wpx * 0.45 - tw / 2, y - wpx * 0.5 + Math.sin(ta) * wpx * 0.35 - tw / 2, tw, tw)
        }
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'
        if (info.kind === 'box') {
          // the glass box (rounded square, rainbow rim, rotating) with the gadget inside
          var bw = wpx * 0.95, by = y - wpx * 0.5, rot = Math.sin(S.t * 2 + o.lane) * 0.18
          c.save(); c.translate(x, by); c.rotate(rot); c.globalAlpha = alpha
          var g = c.createLinearGradient(-bw / 2, -bw / 2, bw / 2, bw / 2); g.addColorStop(0, '#ff5cbe'); g.addColorStop(0.33, '#ffd54a'); g.addColorStop(0.66, '#4ce0ff'); g.addColorStop(1, '#8a5cff')
          c.fillStyle = 'rgba(30,60,120,.55)'; roundRect(-bw / 2, -bw / 2, bw, bw, bw * 0.14); c.fill()
          c.lineWidth = Math.max(1.5, bw * 0.08); c.strokeStyle = g; c.stroke()
          if (im) { var iw = bw * 0.82; c.drawImage(im, -iw / 2, -iw / 2, iw, iw * im.naturalHeight / im.naturalWidth) }
          c.restore(); c.globalAlpha = 1
          return
        }
        spr(im, x, y, wpx, an, alpha)
        return
      }
      if (info.kind === 'pad') { spr(im, x, p1.y + wpx * 0.05, wpx, an, alpha * 0.95); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.4 * alpha; c.drawImage(TEX.glowC, x - wpx * 0.6, p1.y - wpx * 0.5, wpx * 1.2, wpx * 0.7); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; return }
      // HAZARD TELEGRAPH: inside reaction range a soft red ground glow pulses in the hazard's lane
      if (j > 6 && j < 70 && !RM) {
        var pulse = 0.5 + 0.5 * Math.sin(S.t * 9 - j * 0.15), gw = wpx * 2.2 * (1 + 0.3 * atm.tg)   // fog/rain/night: the atmosphere boosts the contrast
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, (0.28 + 0.22 * pulse) * alpha * (1 + 0.9 * atm.tg))
        c.drawImage(TEX.glowR, x - gw / 2, p1.y - gw * 0.22, gw, gw * 0.44)
        c.globalCompositeOperation = 'source-over'
      }
      c.globalAlpha = 0.3 * alpha; c.fillStyle = '#000'; c.beginPath(); c.ellipse(x, p1.y, wpx * 0.5, wpx * 0.09, 0, 0, TAU); c.fill(); c.globalAlpha = 1
      spr(im, x, p1.y, wpx, an, alpha)
    }
    function drawTarget (s, tz) {
      var scale = s.p1.s, x = s.p1.x + scale * laneX(S.targetLanePos) * v.hw, y = s.p1.y, wpx = scale * 1150 * v.hw
      var bounce = Math.abs(Math.sin(S.t * 11)) * wpx * 0.012 + (S.robHop > 0 ? Math.abs(Math.sin((0.6 - S.robHop) / 0.6 * Math.PI * 2)) * wpx * 0.06 : 0)   // + the laugh hop
      c.globalAlpha = 0.35; c.fillStyle = '#000'; c.beginPath(); c.ellipse(x, y, wpx * 0.48, wpx * 0.07, 0, 0, TAU); c.fill(); c.globalAlpha = 1
      spr(img.target, x, y - bounce, wpx, targetA, 1)
      // tail lights + red trail glows (additive)
      var A = targetA, k = A ? wpx / A.bw : 0
      c.globalCompositeOperation = 'lighter'
      var L = A && A.lights.length ? A.lights : null
      for (var i = 0; i < 2; i++) {
        var lx = L ? x + (L[i][0] - A.cx) * k : x + (i ? 1 : -1) * wpx * 0.36, ly = L ? y - bounce + (L[i][1] - A.base) * k : y - wpx * 0.3
        var gs = wpx * (scene.night ? 0.55 : 0.32 + 0.23 * atm.L) * (0.8 + 0.7 * Math.min(1, S.prog)), blink = S.robHop > 0 ? (Math.floor(S.t * 12) % 2 ? 1.35 : 0.3) : 1
        c.globalAlpha = 0.9 * Math.min(1, blink); gs *= Math.max(1, blink); c.drawImage(TEX.glowR, lx - gs / 2, ly - gs / 2, gs, gs)
        if (scene.night || stage.wet || atm.L > 0.5) { c.globalAlpha = 0.35; c.drawImage(TEX.glowR, lx - gs * 0.15, ly, gs * 0.3, gs * 2.2) }
      }
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'
      // the net (capture): expands over the target and stays
      if (S.state === 'capture' && CAP.hit || S.state === 'resolve') {
        var tt = S.state === 'resolve' ? 3 : CAP.netT, ns = wpx * (0.35 + 1.05 * (1 - Math.exp(-tt * 7) * Math.cos(tt * 13)))   // the net unfurls on a spring
        var ni = seqImg('net', tt / 0.7 * 8)
        if (ni) { var nh = ns * ni.naturalHeight / ni.naturalWidth; c.drawImage(ni, x - ns / 2, y - wpx * 0.45 - nh / 2, ns, nh) }
        else { c.save(); c.translate(x, y - wpx * 0.45); c.rotate(S.t * 0.6); c.globalAlpha = 0.95; c.drawImage(TEX.net, -ns / 2, -ns / 2, ns, ns); c.restore(); c.globalAlpha = 1 }
        var ci = S.state === 'capture' && seqImg('confetti', tt / 1.4 * 8)
        if (ci && tt < 1.4) { var cw2 = wpx * 2.4, ch2 = cw2 * ci.naturalHeight / ci.naturalWidth; c.drawImage(ci, x - cw2 / 2, y - wpx * 1.1, cw2, ch2) }
      }
      // lock-on reticle follows the target
      if (S.state === 'lock') { H.ret.style.transform = 'translate(' + (x * v.css) + 'px,' + ((y - wpx * 0.45) * v.css) + 'px)' }
      S.targetScreen = { x: x, y: y, w: wpx }; S.targetSeenT = S.t
      if (targetA && targetA.top != null) S.targetScreen.roof = y - bounce - (targetA.base - targetA.top) * wpx / (targetA.right != null ? targetA.right - targetA.left + 1 : targetA.bw)
    }
    function drawPolice (s) {
      var scale = s.p1.s, wpx = scale * 1150 * v.hw
      for (var i = -1; i <= 1; i += 2) {
        var rl = Math.round(S.targetLanePos), pl = rl === 1 ? 1 + i : rl === 0 ? (i < 0 ? 1 : 2) : (i < 0 ? 0 : 1)   // the two lanes beside the robber
        var x = s.p1.x + scale * laneX(pl) * v.hw, y = s.p1.y
        spr(img.police, x, y, wpx, CA && CA.families.vehicles.sprites['police-van'], 1)
        c.globalCompositeOperation = 'lighter'
        var on = Math.floor(S.t * 8) % 2, gs = wpx * 0.9
        c.globalAlpha = 0.95; c.drawImage(on ? TEX.glowR : TEX.glowB, x + (on ? -1 : 1) * wpx * 0.18 - gs / 2, y - wpx * 0.86 - gs / 2, gs, gs)
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'
      }
    }
    function drawLaneFx () {
      // the lane Mojo is entering lights up with a chevron sweep (instant feedback on every input)
      if (!(S.laneFx > 0)) return
      var a = S.laneFx / 0.4, pz = S.z + Z_P
      c.globalCompositeOperation = 'lighter'; c.fillStyle = '#5fe0ff'
      for (var k = 1; k <= 5; k++) {
        var z = pz + k * 520 + (1 - a) * 900, p = laneScreen(S.laneFxLane, z), w = p.w * 0.16, h = w * 0.55
        if (p.y >= v.h || p.y <= v.hy) continue
        c.globalAlpha = a * (1 - k * 0.15) * 0.8
        c.beginPath(); c.moveTo(p.x - w, p.y + h * 0.5); c.lineTo(p.x, p.y - h * 0.5); c.lineTo(p.x + w, p.y + h * 0.5); c.lineTo(p.x + w * 0.6, p.y + h * 0.5); c.lineTo(p.x, p.y - h * 0.05); c.lineTo(p.x - w * 0.6, p.y + h * 0.5); c.closePath(); c.fill()
      }
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'
    }
    function drawPlayer (night) {
      var m = mojoXY(), cp = carPx(), a = rearA || { cx: 149, base: 247, bw: 179, lights: [], kind: 'ground' }, im = img.rear
      var air = a.kind === 'air', hover = air ? -cp * 0.14 + Math.sin(S.t * 3) * cp * 0.02 : 0
      var lean = (S.lane - S.lanePos) * -0.12 + (S.spin > 0 ? (0.8 - S.spin) / 0.8 * TAU : 0), sq = S.squash > 0 ? 1 - S.squash * 0.4 : 1
      // headlight cone at night / in tunnels
      scene.headlights(c, m.x, m.y - cp * 0.3, cp, night || S.tunnel > 0.4 ? 1 : atm.L)
      // soft contact shadow (aerial forms: offset and smaller)
      c.globalAlpha = air ? 0.22 : 0.42; c.fillStyle = '#000'; c.beginPath(); c.ellipse(m.x + (air ? cp * 0.06 : 0), m.y + (air ? cp * 0.04 : 0), cp * (air ? 0.4 : 0.55), cp * 0.09, 0, 0, TAU); c.fill(); c.globalAlpha = 1
      var k = cp / a.bw
      var hopY = S.hop > 0 ? Math.sin((1 - S.hop / 0.5) * Math.PI) * cp * 0.35 : 0   // the jumper's hop over a pothole or rock
      c.save(); c.translate(m.x, m.y + hover + bob() - hopY); c.rotate(lean); c.scale(1 / Math.sqrt(sq), sq)
      if (im) c.drawImage(im, -a.cx * k, -a.base * k, im.naturalWidth * k, im.naturalHeight * k)
      c.globalAlpha = 1
      // tail lights (additive; brighter while recovering)
      c.globalCompositeOperation = 'lighter'
      var lights = a.lights && a.lights.length ? a.lights : [[a.cx - a.bw * 0.33, a.base - 70], [a.cx + a.bw * 0.33, a.base - 70]]
      var gl = cp * (S.recover > 0 ? 0.42 + 0.12 * Math.sin(S.t * 20) : night ? 0.34 : 0.2 + 0.14 * atm.L)
      for (var i = 0; i < lights.length; i++) { c.globalAlpha = 0.85; c.drawImage(TEX.glowR, (lights[i][0] - a.cx) * k - gl / 2, (lights[i][1] - a.base) * k - gl / 2, gl, gl) }
      // boost flame from the exhaust points
      if (S.boost > 0) {
        var fl = img['fx/boost-flame-sheet13'], bf = seqImg('boost', S.t * 20 % 8)
        for (var e = 0; e < a.exhaust.length; e++) {
          if (bf) {   // Codex flame: points LEFT with the exhaust ring on its right edge -> rotate to point at the camera (down)
            var fx0 = (a.exhaust[e][0] - a.cx) * k, fy0 = (a.exhaust[e][1] - a.base) * k, fw = cp * 0.55, fh = fw * bf.naturalHeight / bf.naturalWidth
            c.globalAlpha = 0.95; c.drawImage(TEX.glowO, fx0 - fw * 0.3, fy0 - fw * 0.1, fw * 0.6, fw * 0.6)
            c.save(); c.translate(fx0, fy0); c.rotate(-Math.PI / 2); c.drawImage(bf, -fw, -fh / 2, fw, fh); c.restore()
            continue
          }
          var ex = (a.exhaust[e][0] - a.cx) * k, ey = (a.exhaust[e][1] - a.base) * k, fs = cp * (0.32 + Math.random() * 0.08)
          c.globalAlpha = 0.95; c.drawImage(TEX.glowO, ex - fs / 2, ey - fs * 0.2, fs, fs)
          if (fl) { c.save(); c.translate(ex, ey); c.rotate(Math.PI / 2); c.drawImage(fl, -fs * 0.1, -fs * 0.3, fs * 1.1, fs * 0.6); c.restore() }
        }
      }
      if (S.shield) { c.globalAlpha = 0.45 + 0.15 * Math.sin(S.t * 6); c.drawImage(TEX.glowC, -cp * 0.9, -cp * 1.3, cp * 1.8, cp * 1.6) }
      if (S.tunnel > 0.3) { c.globalAlpha = 0.25 * (Math.sin(S.z / 160) * 0.5 + 0.5); c.drawImage(TEX.glowY, -cp * 0.6, -cp * 1.1, cp * 1.2, cp * 0.9) }   // passing ceiling-light strobe
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'
      // dizzy stars orbit the cabin
      var di = S.recover > 0 && S.hard && seqImg('dizzy', S.t * 14 % 8)
      if (di) { var dw = cp * 0.95, dh = dw * di.naturalHeight / di.naturalWidth; c.drawImage(di, -dw / 2, -a.base * k * 0.95 - dh / 2, dw, dh) }
      else if (S.recover > 0 && S.hard && img['o:star']) {
        for (var d = 0; d < 3; d++) { var an = S.t * 6 + d * TAU / 3, sx = Math.cos(an) * cp * 0.36, sy = -a.base * k * 0.92 + Math.sin(an) * cp * 0.08, ss = cp * 0.16 * (0.8 + 0.2 * Math.sin(an)); c.drawImage(img['o:star'], sx - ss / 2, sy - ss / 2, ss, ss) }
      }
      c.restore()
    }
    function drawOverlays () {
      var cp = carPx()
      // BROK bursts
      for (var i = 0; i < S.bursts.length; i++) {
        var b = S.bursts[i]; if (!b.on) continue
        b.t += FDT; if (b.t > 0.75) { b.on = false; continue }
        var bi = seqImg('brok', b.t / 0.75 * 8)
        if (bi) { var bw = cp * 2.3, bh = bw * bi.naturalHeight / bi.naturalWidth; c.globalAlpha = b.t > 0.55 ? Math.max(0, 1 - (b.t - 0.55) / 0.2) : 1; c.drawImage(bi, b.x - bw / 2, b.y - cp * 0.35 - bh / 2, bw, bh); c.globalAlpha = 1 }
        else { var k = b.t < 0.12 ? b.t / 0.12 * 1.15 : 1.15 - (b.t - 0.12) * 0.25, sz = cp * 1.25 * k; c.globalAlpha = b.t > 0.5 ? 1 - (b.t - 0.5) / 0.25 : 1; c.drawImage(TEX.brok, b.x - sz / 2, b.y - sz / 2, sz, sz); c.globalAlpha = 1 }
      }
      // ring shockwaves
      for (var r = 0; r < S.rings.length; r++) {
        var g = S.rings[r]; if (!g.on) continue
        g.t += FDT; if (g.t > 0.45) { g.on = false; continue }
        c.strokeStyle = (g.col === 1 ? 'rgba(120,230,255,' : g.col === 2 ? 'rgba(255,90,110,' : 'rgba(255,230,120,') + (1 - g.t / 0.45).toFixed(2) + ')'; c.lineWidth = cp * 0.05 * (1 - g.t / 0.45) + 1
        c.beginPath(); c.arc(g.x, g.y, cp * (0.1 + g.t * 1.6), 0, TAU); c.stroke()
      }
      // comets to the HUD star counter
      var hp = cometTarget || (cometTarget = hudPoint(H.starBox))
      for (var k2 = 0; k2 < S.comets.length; k2++) {
        var cm = S.comets[k2]; if (!cm.on) continue
        cm.t += FDT / 0.55
        var e = cm.t * cm.t * (3 - 2 * cm.t), x = cm.x0 + (hp.x - cm.x0) * e, y = cm.y0 + (hp.y - cm.y0) * e - Math.sin(e * Math.PI) * cp * 0.6
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.9; c.drawImage(TEX.glowY, x - cp * 0.2, y - cp * 0.2, cp * 0.4, cp * 0.4); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'
        var tp = FX.spawn(TEX.sparkle, x, y, 0, 0, 0.3, cp * 0.1, true); if (tp) tp.grow = -cp * 0.2
        if (cm.t >= 1) { cm.on = false; H.starBox.classList.remove('bump'); void H.starBox.offsetWidth; H.starBox.classList.add('bump') }
      }
      // the capture rocket (owner rocket art, with a flame)
      if (S.state === 'capture' && !CAP.hit) {
        var ri = img['o:rocket'], rs = cp * 0.42 * (1 - Math.min(0.6, CAP.t * 0.5))
        c.save(); c.translate(CAP.x, CAP.y); c.rotate(CAP.ang + Math.PI / 4)
        if (ri) c.drawImage(ri, -rs / 2, -rs / 2, rs, rs)
        c.restore()
      }
      drawNear(); drawTaunt()
    }
    var cometTarget = null
    function uiFont (px) { return '900 ' + Math.round(px) + 'px "Fredoka One",sans-serif' }
    function uiPx (css) { return (css + 6 * Math.max(0, v.u / v.pr - 1)) / v.css }   // >= css px on phones, a little larger on tablets
    function drawTaunt () {
      if (!TN.on) return
      TN.t += FDT
      var t = TN.t, IN = 0.22, HOLD = 1.4, OUT = 0.3
      if (t > IN + HOLD + OUT) { TN.on = false; return }
      var sc = RM ? 1 : t < 0.12 ? 1.15 * t / 0.12 : t < IN ? 1.15 - 0.15 * (t - 0.12) / (IN - 0.12) : 1   // pop 0 -> 1.15 -> 1
      var al = t > IN + HOLD ? Math.max(0, 1 - (t - IN - HOLD) / OUT) : RM ? Math.min(1, t / 0.15) : 1
      var rot = RM ? 0 : Math.sin(t * 22) * 0.08 * Math.max(0, 1 - t / 0.9)                                   // the wobble settles
      var fs = Math.round(Math.max(uiPx(10), 12 / v.css)); c.font = uiFont(fs)   // owner 2026-10-04: 50% of the old size, >= 12 css px
      var tw = c.measureText(TN.text).width, bw = tw + fs * 1.3, bh = fs * 1.75, tl = fs * 0.95, pad = 10 * v.u
      var R = S.targetScreen, seen = !!R && S.t - S.targetSeenT < 0.2 && R.x > 0 && R.x < v.w && R.y > 0 && R.y < v.h
      var ax = seen ? R.x : clamp(R ? R.x : v.cx, pad + bw / 2, v.w - pad - bw / 2), ay = seen ? (R.roof != null ? R.roof + R.w * 0.05 : R.y - R.w * 0.42) : 0
      var bx = clamp(ax + bw * 0.18, pad + bw / 2, v.w - pad - bw / 2), by = seen ? ay - tl - bh : TN.top + tl * 0.7
      if (by < TN.top) by = TN.top                                                       // under the top HUD and Bo's bubble
      var lim = v.playerY - carPx() * 1.6; if (by + bh > lim) by = lim - bh                // never over the road near Mojo
      if (TN.gad && bx + bw / 2 > TN.gad.l && by + bh > TN.gad.t) by = TN.gad.t - bh     // never over the rocket button
      // the tail points at the cabin; off screen it becomes an arrow at the top edge pointing at the robber
      var tx = clamp(ax, bx - bw / 2 + fs * 0.7, bx + bw / 2 - fs * 0.6), edge = 0, tipX = ax, tipY = ay, sd = 0
      if (!seen) { edge = by; tipX = tx; tipY = by - tl * 0.7; sd = -1 } else if (ay > by + bh + 2) { edge = by + bh; sd = 1 } else if (ay < by - 2) { edge = by; sd = -1 }
      var px = sd ? tipX : bx, py = sd ? tipY : by + bh / 2, lw = Math.max(2, fs * 0.13), x0 = bx - bw / 2
      c.save(); c.globalAlpha = al; c.translate(px, py); c.rotate(rot); c.scale(sc, sc); c.translate(-px, -py)
      c.lineJoin = 'round'; c.lineWidth = lw; c.strokeStyle = '#2b1a12'
      c.fillStyle = 'rgba(0,0,0,.2)'; roundRect(x0 + lw, by + lw * 1.6, bw, bh, bh * 0.45); c.fill()
      c.fillStyle = '#ffffff'
      if (sd) { c.beginPath(); c.moveTo(tx - fs * 0.42, edge); c.lineTo(tipX, tipY); c.lineTo(tx + fs * 0.28, edge); c.closePath(); c.fill(); c.stroke() }
      roundRect(x0, by, bw, bh, bh * 0.45); c.fill(); c.stroke()
      if (sd) { c.beginPath(); c.moveTo(tx - fs * 0.42 + lw, edge - sd * lw); c.lineTo(tx + fs * 0.28 - lw, edge - sd * lw); c.lineTo(tipX + (tx - tipX) * 0.2, tipY + (edge - tipY) * 0.2); c.closePath(); c.fill() }   // hide the seam
      c.fillStyle = '#8e1b3a'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(TN.text, bx, by + bh * 0.54)
      c.restore()
      var tb2 = TN.box || (TN.box = {}); tb2.x = bx; tb2.y = by; tb2.w = bw; tb2.h = bh; tb2.fs = fs

    }
    function drawNear () {
      if (!NM.on) return
      NM.t += FDT; if (NM.t > 0.9) { NM.on = false; return }
      var t = NM.t, sc = RM ? 1 : t < 0.1 ? t / 0.1 * 1.2 : t < 0.2 ? 1.2 - (t - 0.1) * 2 : 1, fs = Math.round(Math.max(uiPx(11), 12 / v.css))
      c.save(); c.globalAlpha = t > 0.6 ? 1 - (t - 0.6) / 0.3 : 1; c.translate(NM.x, NM.y - t * 50 * v.u); c.scale(sc, sc)
      c.font = uiFont(fs); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = fs * 0.22; c.strokeStyle = '#10264f'
      c.strokeText('Nyaris!', 0, 0); c.fillStyle = '#ffd54a'; c.fillText('Nyaris!', 0, 0); c.restore()
    }

    /* HUD (writes only on change) */
    var last2 = {}
    function setTxt (k, elm, val) { if (last2[k] !== val) { last2[k] = val; elm.textContent = val } }
    function hudUpdate () {
      var p = Math.round(Math.min(1, S.prog) * 1000) / 10
      if (last2.p !== p) { last2.p = p; p = Math.min(100, Math.round(p / 0.97 * 10) / 10); H.fill.style.width = p + '%'; H.car.style.left = 'calc(' + p + '% - ' + (p / 100 * 14) + 'px)'; H.car.parentNode.style.setProperty('--carx', p + '%') }
      setTxt('s', H.star, v.port || S.stars >= starGoal() ? String(S.stars) : S.stars + '/' + starGoal()); setTxt('c', H.crate, String(S.boxes)); setTxt('r', H.gadN, String(S.rocket))
      var sec = Math.floor(S.elapsed), tt = (sec / 60 < 10 ? '0' : '') + Math.floor(sec / 60) + ':' + (sec % 60 < 10 ? '0' : '') + (sec % 60)
      setTxt('t', H.timer, tt)
      if (last2.h !== S.hearts) { last2.h = S.hearts; [].forEach.call(H.hearts.children, function (im, i) { var off = i >= S.hearts; if (im.classList.contains('off') && !off) { im.classList.remove('pop'); void im.offsetWidth; im.classList.add('pop') } im.classList.toggle('off', off) }) }
      var gs = S.rocket > 0 ? (S.state === 'lock' ? 'ready' : 'have') : 'empty'
      if (last2.g !== gs) { last2.g = gs; H.gad.classList.toggle('empty', gs === 'empty'); H.gad.classList.toggle('ready', gs === 'ready'); H.gad.classList.toggle('have', gs !== 'empty') }
      var hot = S.prog > 0.7 && S.state !== 'result'; if (last2.hot !== hot) { last2.hot = hot; H.car.parentNode.classList.toggle('hot', hot) }
      var ch = Math.round(S.boostCharge * 20) * 5
      if (last2.b !== ch) { last2.b = ch; H.up.style.setProperty('--charge', ch + '%') }
    }

    /* autopilot (QA test seam; never used for the child) */
    function autopilot () {
      var A = S.auto, pz = S.z + Z_P, baseI = Math.floor(pz / TR.SEG)
      if (S.state === 'lock' && S.lockT > 0.4) { fire(); return }
      if (S.laneT < 1) return
      // look at the next row ahead (6..30 segments)
      for (var i = 2; i < 30; i++) {
        var s = track.seg(baseI + i); if (!s || !s.objs.length) continue
        var blocked = [false, false, false], good = -1
        for (var k = 0; k < s.objs.length; k++) { var o = s.objs[k]; if (!o.on || o.taken) continue; var kd = OBJ[o.type].kind; if (kd === 'block' || kd === 'slip') blocked[o.lane] = true; else if (good < 0 || o.type === 'rocket') good = o.lane }
        if (S.edu && !S.eduDone && s.gantry) { var want = S.edu.choices.indexOf(S.edu.answer); if (A.mode === 'crash') want = (want + 1) % 3; if (want !== S.lane) laneTo(want > S.lane ? 1 : -1); return }
        if (A.mode === 'crash') {
          var tgt = blocked.indexOf(true)
          if (tgt >= 0 && tgt !== S.lane && i < 14) laneTo(tgt > S.lane ? 1 : -1)
          else if (tgt < 0 && good >= 0 && good !== S.lane) laneTo(good > S.lane ? 1 : -1)
        } else {
          var wantL = S.lane
          if (blocked[S.lane]) { wantL = !blocked[1] ? 1 : !blocked[0] ? 0 : 2 }
          else if (good >= 0 && !blocked[good] && Math.abs(good - S.lane) === 1) wantL = good
          if (wantL !== S.lane) laneTo(wantL > S.lane ? 1 : -1)
          if (A.boost && S.boostCharge >= 1 && !blocked[S.lane]) boost()
        }
        return
      }
    }

    /* teardown */
    function teardown () {
      W.cancelAnimationFrame(raf); AU.stop(); FX.clear()
      D.removeEventListener('keydown', key); D.removeEventListener('visibilitychange', vis); W.removeEventListener('resize', resize)
      if (W.__mojoChase && W.__mojoChase.host === host) W.__mojoChase.active = false
      host.innerHTML = ''; host.classList.remove('mc-host', 'land')
    }

    /* start */
    function setForm (id, pk) {
      formId = id; S.form = id; perk = pk || formPerk(id) || null; rearKey = rearOf(id); rearA = RA ? RA.sprites[rearKey] : null
      var rk = rearKey
      if (RIMG[rk]) { img.rear = RIMG[rk]; formLoad = null }
      else {   // a picker form that was not preloaded (jumper, rescue, boat, chopper, jet...): decode it now; the countdown waits
        var pl = formLoad = loadOne('mojo-rear/' + rk).then(function (im) { if (im) RIMG[rk] = im; if (im && rearKey === rk) img.rear = im; if (formLoad === pl) formLoad = null })
      }
      H.car.src = lib('mojo-rear/' + rearKey)
      if (cfg.onForm) try { cfg.onForm(id) } catch (e) {}
    }
    function startIntro () {
      var p0
      try { p0 = HK().beforeStart(cfg, API) } catch (e) { p0 = null }
      Promise.resolve(p0).then(function (c2) {
        if (finished) return
        var custom = HK().beforeStart !== HOOKS.beforeStart   // a picker module ran: its choice is final (even 'racer')
        c2 = c2 || {}
        var chosen = !!(c2.picked || c2.formChosen)
        if ((custom || chosen) && knownForm(c2.mojo_form)) { setForm(c2.mojo_form, c2.perk || null); cfg.formChosen = true }
        else if (c2.perk) perk = c2.perk
        if (chosen) startRun(); else intro()   // the picker already asked: no intro card, straight to the cutscene / countdown
      }, function () { intro() })
    }
    function intro () {
      S.state = 'intro'
      var cards = FORMS.map(function (f) {
        return '<button type="button" class="mc-form' + (f.id === formId ? ' on' : '') + '" data-form="' + f.id + '"><img alt="" src="' + lib(f.art) + '"><b>' + f.name + '</b><small>' + f.perk + '</small>' +
          (f.id === recForm ? '<em>Paling Tepat</em>' : '') + '</button>'
      }).join('')
      showCard('<h2 class="fk">' + (cfg.title || stage.title) + '</h2><p>' + (cfg.story_intro || stage.intro) + '</p>' +
        (cfg.formChosen ? '' : '<p class="mc-pick-h">Pilih wujud Mojo!</p><div class="mc-forms">' + cards + '</div>') +
        '<p style="font-size:16px;color:#54617a">Geser atau tekan panah untuk pindah jalur. Ambil kotak roket, lalu tangkap pencurinya!</p>',
        [{ t: 'Ayo Kejar!', id: 'mc-go', fn: function () { hideCard(); startRun() } }])
      ;[].forEach.call(card.querySelectorAll('.mc-form'), function (b) {
        b.addEventListener('click', function () { AU.cue('click'); setForm(b.getAttribute('data-form')); [].forEach.call(card.querySelectorAll('.mc-form'), function (x) { x.classList.toggle('on', x === b) }) })
      })
      if (cfg.say) try { cfg.say(cfg.story_intro || stage.intro) } catch (e) {}
    }
    /* intro cutscene (PRD §2, skippable): the robber runs from the pavement to the getaway car, hops in, and it
       speeds off; Mojo waits, then the Swop starts. Everything is drawn in the live scene. */
    function cutSeen () { try { return !!JSON.parse(W.localStorage.getItem(CUT_KEY) || '{}')[stage.id] } catch (e) { return false } }
    function startRun () { if (RM || cutSeen()) countdown(); else cut() }
    function cut () {
      if (RM) { countdown(); return }
      try { var cs = JSON.parse(W.localStorage.getItem(CUT_KEY) || '{}'); cs[stage.id] = 1; W.localStorage.setItem(CUT_KEY, JSON.stringify(cs)) } catch (e) {}
      S.state = 'cut'; S.cutT = 0; S.robLane = 2.9; S.cutGap = 2600; S.targetLanePos = S.targetLane = 1
      H.skip.classList.add('on'); call('Itu pencurinya!', 1400, 'cut1'); H.mission.classList.remove('hide'); H.place.classList.remove('hide')
      last = performance.now()
    }
    function endCut () { if (S.state !== 'cut') return; H.skip.classList.remove('on'); countdown() }
    /* 3-2-1: the robber waits ahead, Mojo idles; the boards of the intro are gone before the race starts */
    function countdown () {
      H.mission.classList.add('hide'); H.place.classList.add('hide'); H.skip.classList.remove('on')
      S.state = 'countdown'; S.cdT = 0; S.cdN = 0; S.speed = 0; S.targetLane = S.targetLanePos = 1
      if (!S.cutGap) S.cutGap = gap0()
      last = performance.now()
    }
    function go () {
      H.mission.classList.add('hide'); H.place.classList.add('hide')   // nothing may cover the road while racing (owner)
      S.state = 'swop'; S.phaseT = 0; S.speed = 0.4; S.flash = RM ? 0 : 0.8
      var m = mojoXY(); burst(m.x, m.y - carPx() * 0.4, 30, TEX.sparkle, 900 * v.u, 0.8, carPx() * 0.2, true)
      AU.cue('swoosh'); call('Swop! Jadi Mojo ' + (formName(formId) || 'Hebat') + '!', 1300, 'swop')
      last = performance.now()
    }
    loadAll().then(function () {
      if (finished) return
      S.form = formId
      for (var nm in img) if (nm.indexOf('p:') === 0) imgP[nm.slice(2)] = img[nm]
      FORMS.forEach(function (f) { var rk0 = rearOf(f.id); if (img['rear:' + f.id]) RIMG[rk0] = img['rear:' + f.id] })
      if (img.rear) RIMG[rearKey] = img.rear
      for (var sq2 in SEQ) for (var fj = 1; fj <= 8; fj++) if (img['seq:' + sq2 + '-' + fj]) SEQ[sq2].push(img['seq:' + sq2 + '-' + fj])
      imgP.lollipop = procProp('lollipop'); imgP.gumdrop = procProp('gumdrop')
      // the ground fades into the MID strip's own bottom colour at the horizon (no hard band)
      var fogC = (TA && TA.sky[stage.sky] || ['', '', '#cfe6ff'])[2]
      try {
        var mi = img.MID || img.FAR
        if (mi) {
          var sc = D.createElement('canvas'); sc.width = 64; sc.height = 8; var sx = sc.getContext('2d')
          sx.drawImage(mi, 0, mi.naturalHeight * (img.MID ? 0.9 : 0.97), mi.naturalWidth, mi.naturalHeight * (img.MID ? 0.1 : 0.03), 0, 0, 64, 8)
          var dd = sx.getImageData(0, 0, 64, 8).data, R0 = 0, G0 = 0, B0 = 0, N0 = 0
          for (var q = 0; q < dd.length; q += 4) if (dd[q + 3] > 200) { R0 += dd[q]; G0 += dd[q + 1]; B0 += dd[q + 2]; N0++ }
          if (N0 > 20) fogC = '#' + [R0, G0, B0].map(function (z) { var h = Math.round(z / N0).toString(16); return h.length < 2 ? '0' + h : h }).join('')
        }
      } catch (e) {}
      // hooks v2: the atmosphere starts first; what it owns (sky parts, weather, the night) the scene and track leave out
      var A0 = AT(), owns = null, night0 = null
      W.MojoChase.atmosPre = !!(A0 && A0.drawSky)   // the atmosphere's sky is drawn at the 'pre' point (before FAR)
      if (A0) {
        try { A0.say = API.call } catch (e) {}
        try {
          var am = /[?&]atmos=([^&]+)/.exec(location.search), MA = W.MojoChaseAtmos
          if (am && MA && MA.force) { var ap = decodeURIComponent(am[1]).split(','); MA.force({ time: isNaN(+ap[0]) ? ap[0] : +ap[0], weather: ap[1] || null, trans: ap[2] || null }) }
        } catch (e) {}
        try { var ir = A0.init ? A0.init(c, stage, R.rng(seed + 11), API) : null; if (ir && typeof ir === 'object') { owns = ir.owns || null; if (ir.night0 != null) night0 = !!ir.night0 } } catch (e) { console.warn('[Mojo chase] atmos.init', e) }
      }
      var st2 = stage
      if (owns && (owns.weather || night0 != null)) { st2 = {}; for (var sk2 in stage) st2[sk2] = stage[sk2]; if (owns.weather) st2.weather = 'none'; if (night0 != null) st2.night = night0 }
      track = TR.create(st2, seed, { fog: fogC })
      scene = SCN.create(st2, img, { owns: owns })

      resize(); load.remove()
      S.state = 'intro0'
      render()
      startIntro()
      raf = W.requestAnimationFrame(frame)
    })

    // test seam (QA only)
    W.__mojoChase = { host: host, active: true, view: API.view, robber: API.robber,   // QA seams (canvas px; multiply by view().css)
      state: function () {
        var med = function (a) { if (!a.length) return 0; var b = a.slice().sort(function (x, y) { return x - y }); return b[Math.floor(b.length / 2)] }
        return { state: S.state, paused: S.paused, prog: S.prog, lane: S.lane, lanePos: S.lanePos, lastLaneMs: S.lastLaneMs, hits: S.hits, brok: S.brok, recover: S.recover,
          recoveryMs: S.recoveryMs.slice(), stars: S.stars, boxes: S.boxes, rocket: S.rocket, hasRocket: S.hasRocket, elapsed: S.elapsed, quality: quality,
          frameMedian: med(ringArr(FR, frN)), frameTimes: ringArr(FR, frN), workMedian: { 0: med(ringArr(TF[0].a, TF[0].n)), 1: med(ringArr(TF[1].a, TF[1].n)), 2: med(ringArr(TF[2].a, TF[2].n)) }, frames: frN,
          par: scene ? { far: scene.par.far, mid: scene.par.mid, roadside: scene.par.roadside, road: scene.par.road } : null,
          ring: track ? track.ring.length : 0, made: track ? track.made() : 0, chevrons: track ? track.chevronAudit() : null,
          edu: S.eduResult, eduPrompt: S.edu ? S.edu.prompt : null, particles: FX.live(), cap: FX.cap(), stage: stage.id, target: targetName, corridor: v.w ? { hy: v.hy * v.css, top: (v.playerY - carPx() * 1.15) * v.css, cx: v.cx * v.css, wTop: v.w * 0.04 * v.css, wBot: TR.ROADW * v.hw / Z_P * 1.1 * v.css } : null, rear: rearKey, form: formId, captureMs: S.captureMs, recForm: recForm,
          perk: perk, taunt: TN.on ? TN.text : null, tauntBox: TN.on && TN.box ? { x: TN.box.x * v.css, y: TN.box.y * v.css, w: TN.box.w * v.css, h: TN.box.h * v.css, fs: TN.box.fs * v.css } : null, taunts: S.taunts, smoke: S.smoke, near: S.near, carCss: carPx() * v.css, playerYCss: v.playerY * v.css, formLoading: !!formLoad, count: S.state === 'countdown' ? S.cdN : 0,
          imgs: Object.keys(img).length, prof: S.prof, missing: Object.keys(need).filter(function (n) { return !img[n] }), boost: S.boost, z: S.z }
      },
      auto: function (o) { S.auto = o || null },
      tap: function (what) { if (what === 'go') { var b = host.querySelector('#mc-go'); if (b) b.click() } },
      force: function (o) { for (var k in o) S[k] = o[k] },
      quality: function (qv, lock) { quality = qv; S.qLock = !!lock; resize() }, profile: function (on) { S.prof = on ? {} : null },
      emitTest: function (kind) { var m = mojoXY(); if (kind === 'brok') { var o = { type: 'crate', taken: false }; S.recover = 0; hit(o, m.x, m.y - carPx() * 0.2) } else if (kind === 'star') pick({ type: 'star' }, m.x, m.y - carPx() * 0.8); else if (kind === 'boost') { S.boostCharge = 1; boost() } else if (kind === 'quiz') pick({ type: 'quiz', taken: false }, m.x, m.y - carPx() * 0.8) }

    }
    return done
  }

  /* ── stand-alone menu helper data: rear key per form (used by the Balapan menu art) ─────────────────── */
  var HOOKS = {
    beforeStart: function (cfg) { return Promise.resolve(cfg) },
    onPickup: function () { return false },
    spawnFilter: function (type) { return type },
    atmos: null
  }
  // export a COPY of the defaults: a module assigning hooks.x must never overwrite HOOKS.x (the core compares against it)
  var live = {}, prior = (W.MojoChase && W.MojoChase.hooks) || {}
  for (var hk in HOOKS) live[hk] = HOOKS[hk]
  for (var pk in prior) if (prior[pk]) live[pk] = prior[pk]
  W.MojoChase = { mount: mount, OBJ: OBJ, version: 2, hooks: live, rearKey: rearOf }
})(window, document)
