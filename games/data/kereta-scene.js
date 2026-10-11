/* =============================================================================
 * kereta-scene.js — SOUND and EFFECTS for every story beat of Lokomotif Pemberani (owner 2026-10-12: "SFX dan VFX harus banyak dan proper biar seru").
 * Two layers, both data:
 *   1 REACTIONS (all levels, no authoring): every action the child makes has a sound and a small effect: pick (pop + sparkle), deliver (thump or horn + stars),
 *     couple (clank + dust), wait (tick), a move into wheat (rustle), into a pond (splash + bubbles), an unlock (door), a visited mark (bell).
 *   2 PLAN (per level / beat): PLAN[levelId] = [beat0, beat1, ...] (or one object for every beat); a beat = { start, end, move } where start / end =
 *     { sfx: ['horn', ...], fx: [{ id, at: 'hero' | 'goal' | <object id>, size, delay, n, spread, lift, filter }] }, move = a cue name played every move.
 *     `start` plays when the intro card is closed, `end` when the beat's objectives are all met.
 * Sounds are synthesised here (WebAudio: oscillators + filtered noise) and honour the page's sound switch (snd.on). Effects go through def.fx.play (the shared
 * VFX bank). No file is loaded, nothing is heavy; under prefers-reduced-motion the effects are skipped and the sounds stay.
 * ==========================================================================*/
(function (W) {
  'use strict'
  var P = W.MojoPack, def = P && P.def
  if (!def || def.id !== 'kereta') return
  var D = W.document, PG = W.ProgGrid
  var RM = false; try { RM = W.matchMedia('(prefers-reduced-motion: reduce)').matches } catch (e) {}
  var CUR = null, SND = null

  /* ── the synth ─────────────────────────────────────────────────────────── */
  var AC = null
  function ac () {
    if (!SND || !SND.on || !SND.on()) return null
    try { if (!AC) AC = new (W.AudioContext || W.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume() } catch (e) { AC = null }
    return AC
  }
  function T (f0, f1, d, v, type, at, vib) {
    var c = ac(); if (!c) return
    try {
      var t = c.currentTime + (at || 0), g = c.createGain(), o = c.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d)
      if (vib) { var l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 6; lg.gain.value = f0 * 0.015; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + d + 0.05) }
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v || 0.1, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d)
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + 0.05)
    } catch (e) {}
  }
  function N (d, v, lp, at, hp) {
    var c = ac(); if (!c) return
    try {
      var n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), ch = b.getChannelData(0), i
      for (i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / n)
      var s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter(); f.type = hp ? 'highpass' : 'lowpass'; f.frequency.value = hp || lp || 900; g.gain.value = v || 0.12
      s.buffer = b; s.connect(f); f.connect(g); g.connect(c.destination); s.start(c.currentTime + (at || 0))
    } catch (e) {}
  }
  var NOTE = { C4: 262, D4: 294, E4: 330, F4: 349, G4: 392, A4: 440, B4: 494, C5: 523, D5: 587, E5: 659, G5: 784, A5: 880, C6: 1047 }
  function seq (notes, step, type, v, dur) { notes.forEach(function (n, i) { if (n) T(NOTE[n] || n, NOTE[n] || n, dur || step * 0.9, v || 0.07, type || 'square', i * step) }) }
  var CUES = {
    horn: function () { T(392, 392, 0.55, 0.1, 'sawtooth', 0, 1); T(494, 494, 0.55, 0.08, 'sawtooth', 0, 1); T(392, 392, 0.4, 0.1, 'sawtooth', 0.7, 1); T(494, 494, 0.4, 0.08, 'sawtooth', 0.7, 1) },
    whistle: function () { T(2300, 2700, 0.18, 0.06, 'sine'); T(2700, 2300, 0.18, 0.06, 'sine', 0.2); T(2400, 2800, 0.3, 0.06, 'sine', 0.42) },
    steam: function () { N(0.9, 0.16, 0, 0, 2600) }, chuff: function () { N(0.12, 0.2, 700); N(0.12, 0.16, 700, 0.17) },
    splash: function () { N(0.55, 0.2, 0, 0, 1400); T(700, 180, 0.4, 0.09, 'sine'); N(0.3, 0.12, 0, 0.18, 2200) },
    bubble: function () { [0, 0.12, 0.26].forEach(function (t, i) { T(320 + i * 160, 700 + i * 200, 0.09, 0.06, 'sine', t) }) },
    thump: function () { T(130, 55, 0.16, 0.2, 'triangle'); N(0.1, 0.12, 320) }, door: function () { T(160, 70, 0.14, 0.18, 'triangle'); T(1100, 800, 0.05, 0.08, 'square', 0.1) },
    pop: function () { T(900, 280, 0.07, 0.12, 'sine') }, tick: function () { T(1900, 1800, 0.03, 0.06, 'square') }, bell: function () { T(880, 880, 0.7, 0.08, 'sine'); T(1320, 1320, 0.5, 0.05, 'sine', 0.01) },
    rustle: function () { N(0.45, 0.08, 0, 0, 3200) }, wind: function () { N(1.4, 0.07, 0, 0, 900) },
    growl: function () { T(95, 70, 0.8, 0.14, 'sawtooth', 0, 1); T(120, 80, 0.7, 0.08, 'square') }, echo: function () { [0, 0.28, 0.56, 0.84].forEach(function (t, i) { T(420, 300, 0.22, 0.09 / (i + 1), 'triangle', t) }) },
    fanfare: function () { seq(['C5', 'E5', 'G5', 'C6'], 0.14, 'sawtooth', 0.08); T(1047, 1047, 0.6, 0.08, 'sawtooth', 0.56) },
    tada: function () { seq(['G4', 'C5', 'E5', 'G5'], 0.1, 'triangle', 0.1); T(1047, 1047, 0.7, 0.1, 'triangle', 0.4); T(784, 784, 0.7, 0.07, 'triangle', 0.4) },
    drum: function () { T(150, 55, 0.14, 0.22, 'triangle'); N(0.08, 0.12, 900) },
    march: function () { var i; for (i = 0; i < 8; i++) { T(i % 2 ? 196 : 98, i % 2 ? 196 : 98, 0.16, 0.1, 'square', i * 0.3); if (i % 2 === 0) T(150, 55, 0.12, 0.18, 'triangle', i * 0.3); else N(0.06, 0.08, 1800, i * 0.3 + 0.01) }; seq([0, 'E5', 0, 'G5', 0, 'E5', 0, 'C5', 0, 'D5', 0, 'G5', 'E5', 'D5', 'C5'], 0.16, 'sawtooth', 0.05) },
    applause: function () { var i; for (i = 0; i < 22; i++) N(0.07, 0.05 + Math.random() * 0.05, 0, i * 0.07 + Math.random() * 0.05, 2200) },
    crash: function () { N(0.7, 0.2, 1600); T(120, 50, 0.3, 0.2, 'triangle') }, thunder: function () { N(1.4, 0.3, 220); T(60, 40, 1, 0.16, 'sine') },
    sizzle: function () { N(1, 0.07, 0, 0, 4200) }, clack: function () { T(1300, 900, 0.04, 0.1, 'square'); T(900, 700, 0.05, 0.08, 'square', 0.07) },
    flap: function () { [0, 0.09, 0.18, 0.27].forEach(function (t) { N(0.06, 0.1, 0, t, 1500) }) }, tweet: function () { if (SND && SND.tweet) SND.tweet() },
    whoosh: function () { N(0.6, 0.14, 0, 0, 800); T(300, 900, 0.5, 0.04, 'sine') }, saw: function () { T(180, 190, 0.5, 0.05, 'sawtooth', 0, 1); N(0.5, 0.06, 0, 0, 2800) },
    owl: function () { T(380, 340, 0.3, 0.06, 'sine'); T(380, 330, 0.4, 0.06, 'sine', 0.45) }, cheer: function () { CUES.applause(); seq(['E5', 'G5', 'C6'], 0.12, 'triangle', 0.07) },
    brake: function () { N(0.9, 0.14, 0, 0, 3000); T(1400, 500, 0.8, 0.04, 'sawtooth') }, rain: function () { N(1.6, 0.05, 0, 0, 3600) }
  }
  function play (n, at) { (Array.isArray(n) ? n : [n]).forEach(function (k, i) { var f = CUES[k]; if (f) setTimeout(function () { try { f() } catch (e) {} }, (at || 0) + i * 260) }) }
  def.scene = def.scene   // (the scene hook itself is untouched)
  def.sfxPlay = play

  /* ── board geometry ─────────────────────────────────────────────────────── */
  function px (rc) { var b = D.getElementById('board'); if (!b || !CUR) return null; var r = b.getBoundingClientRect(), s = r.width / CUR.lv.grid.cols; return [r.left + (rc[1] + 0.5) * s, r.top + (rc[0] + 0.5) * s, s] }
  function where (at, c) {
    if (at === 'hero' || !at) { var m = D.getElementById('mojo'); if (!m) return null; var r = m.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height * 0.55, r.width] }
    if (at === 'goal') { var o = ((c.beat && c.beat.objectives) || [])[0]; if (!o) return where('hero', c); if (o.at) return px(o.at); var f = o.id && PG.find(c.w, o.id); return f ? px([f.r, f.c]) : where('hero', c) }
    if (typeof at === 'string') { var q = PG.find(c.w, at); return q ? px([q.r, q.c]) : null }
    return px(at)
  }
  function burst (list, c) {
    if (RM || !def.fx) return
    ;(list || []).forEach(function (f) {
      setTimeout(function () {
        var p = where(f.at, c || CUR); if (!p) return
        for (var i = 0; i < (f.n || 1); i++) (function (i) { setTimeout(function () { def.fx.play(f.id, p[0] + (i % 2 ? 1 : -1) * (f.spread || 0) * i, p[1] - (f.lift || 0), f.size || 120, { duration: f.ms || 1000, filter: f.filter || undefined }) }, i * 120) })(i)
      }, f.delay || 0)
    })
  }
  function stars (p, size) { if (RM || !p || !def.fx) return; def.fx.play('bk-star-04', p[0], p[1] - 10, size || 90, { duration: 700 }); def.fx.play('bk-star-02', p[0] + 14, p[1] - 22, (size || 90) * 0.7, { duration: 700, delay: 120 }) }
  function poof (p, size) { if (RM || !p || !def.fx) return; def.fx.dust(p[0], p[1] + 8, size || 90) }

  /* ── the plan: every Malivlak beat (film moment) ──────────────────────── */
  var SMOKE = { id: 'bk-smoke-07', at: 'hero', size: 150, lift: 40 }, STAR = { id: 'bk-star-04', at: 'goal', size: 110 }, FLARE = { id: 'bk-flare-01', at: 'goal', size: 120 }
  var PLAN = {
    mv01: { start: { sfx: ['horn', 'steam'], fx: [SMOKE, { id: 'bk-smoke-01', at: 'hero', size: 120, delay: 250, lift: 20 }] }, move: 'chuff', end: { sfx: ['brake', 'bell'], fx: [STAR, { id: 'bk-smoke-05', at: 'hero', size: 130 }] } },
    mv02: { start: { sfx: ['bell'] }, move: 'thump', end: { sfx: ['door', 'horn'], fx: [{ id: 'bk-star-02', at: 'pintu', size: 120, n: 2, spread: 24 }, { id: 'bk-smoke-07', at: 'pintu', size: 150, delay: 200 }] } },
    mv03: { start: { sfx: ['bell'] }, end: { sfx: ['whistle', 'horn', 'chuff'], fx: [SMOKE, FLARE] } },
    mv04: { start: { sfx: ['chuff', 'tweet'] }, move: 'chuff', end: { sfx: ['clack', 'fanfare'], fx: [STAR, { id: 'bk-smoke-05', at: 'hero', size: 120 }] } },
    mv05: { start: { sfx: ['chuff'] }, end: { sfx: ['horn', 'whoosh'], fx: [{ id: 'bk-smoke-07', at: 'goal', size: 200 }, STAR] } },
    mv06: [{ start: { sfx: ['wind', 'chuff'], fx: [{ id: 'bk-dirt-02', at: 'hero', size: 110 }] }, move: 'chuff', end: { sfx: ['rustle', 'pop'], fx: [{ id: 'bk-smoke-07', at: 'goal', size: 140 }, STAR] } },
      { start: { sfx: ['pop', 'tweet'] }, end: { sfx: ['clack', 'bell'], fx: [STAR, { id: 'bk-smoke-05', at: 'goal', size: 150 }] } }],
    mv07: [{ start: { sfx: ['chuff'], fx: [] }, end: { sfx: ['splash', 'bubble', 'pop'], fx: [{ id: 'px-bubbles', at: 'goal', size: 170 }, { id: 'bk-circle-01', at: 'goal', size: 200, delay: 200 }, STAR] } },
      { start: { sfx: ['splash', 'whoosh'], fx: [{ id: 'px-bubbles', at: 'hero', size: 150 }, { id: 'bk-smoke-01', at: 'hero', size: 160, delay: 200 }] }, end: { sfx: ['pop', 'cheer'], fx: [STAR, { id: 'bk-star-02', at: 'goal', size: 120, n: 3, spread: 28 }] } }],
    mv08: [{ start: { sfx: ['tweet', 'chuff'] }, move: 'chuff', end: { sfx: ['clack', 'bell'], fx: [STAR] } }, { start: { sfx: ['whoosh'] }, end: { sfx: ['horn'], fx: [SMOKE, STAR] } }],
    mv09: [{ start: { sfx: ['tweet', 'chuff', 'steam'], fx: [{ id: 'bk-smoke-07', at: 'hero', size: 160, lift: 70 }] }, move: 'chuff', end: { sfx: ['flap', 'pop', 'steam'], fx: [{ id: 'bk-smoke-07', at: 'hero', size: 200, lift: 90 }, { id: 'bk-dirt-02', at: 'hero', size: 110, lift: 90, delay: 150 }] } },
      { start: { sfx: ['sizzle'] }, end: { sfx: ['sizzle', 'pop', 'cheer'], fx: [STAR, { id: 'bk-smoke-05', at: 'masinis', size: 120 }] } }],
    mv10: [{ start: { sfx: ['horn', 'chuff'] }, move: 'chuff', end: { sfx: ['bell', 'clack'], fx: [FLARE] } }, { start: { sfx: ['bell'] }, end: { sfx: ['horn', 'whoosh'], fx: [SMOKE, STAR] } }, { start: { sfx: ['wind'] }, move: 'chuff', end: { sfx: ['tada'], fx: [STAR, { id: 'bk-star-02', at: 'goal', size: 140, n: 3, spread: 30 }] } }],
    mv11: [{ start: { sfx: ['wind', 'echo'], fx: [{ id: 'bk-smoke-01', at: 'goal', size: 160 }] }, move: 'chuff', end: { sfx: ['echo', 'owl'], fx: [{ id: 'bk-smoke-05', at: 'goal', size: 180 }] } },
      { start: { sfx: ['whoosh', 'growl'], fx: [{ id: 'bk-smoke-01', at: 'hero', size: 160 }] }, move: 'chuff', end: { sfx: ['growl', 'pop'], fx: [{ id: 'bk-smoke-05', at: 'goal', size: 140 }] } }],
    mv12: [{ start: { sfx: ['growl', 'tweet'] }, end: { sfx: ['thump', 'pop'], fx: [{ id: 'bk-star-04', at: 'tengah', size: 120 }] } }, { start: { sfx: ['chuff', 'echo'] }, end: { sfx: ['door', 'clack'], fx: [{ id: 'bk-star-04', at: 'belakang', size: 120 }] } }, { start: { sfx: ['echo'] }, end: { sfx: ['whoosh', 'fanfare'], fx: [STAR, SMOKE] } }],
    mv13: { start: { sfx: ['whoosh', 'wind'] }, move: 'chuff', end: { sfx: ['brake', 'steam'], fx: [{ id: 'bk-smoke-07', at: 'hero', size: 200 }, STAR] } },
    mv14: [{ start: { sfx: ['chuff'] }, end: { sfx: ['clack', 'bell'], fx: [{ id: 'bk-star-04', at: 'goal', size: 100 }] } }, { start: { sfx: ['whoosh'] }, end: { sfx: ['hammer', 'pop'], fx: [{ id: 'bk-star-02', at: 'goal', size: 130, n: 2, spread: 26 }] } }, { start: { sfx: ['chuff'] }, end: { sfx: ['horn', 'fanfare'], fx: [STAR, SMOKE] } }],
    mv15: [{ start: { sfx: ['bell', 'drum'] }, end: { sfx: ['clack', 'whistle'], fx: [FLARE] } }, { start: { sfx: ['tuba'] }, end: { sfx: ['clack', 'bell'], fx: [FLARE] } }, { start: { sfx: ['march'] }, end: { sfx: ['tada', 'horn'], fx: [STAR, { id: 'bk-star-02', at: 'goal', size: 130, n: 3, spread: 28 }] } }],
    mv16: { start: { sfx: ['march', 'horn'] }, move: 'chuff', end: { sfx: ['brake', 'steam', 'cheer'], fx: [{ id: 'bk-smoke-07', at: 'hero', size: 200 }, STAR] } },
    mv17: [{ start: { sfx: ['bell'] }, end: { sfx: ['clack', 'bell', 'whistle'], fx: [FLARE, { id: 'bk-star-05', at: 'goal', size: 110, delay: 200 }] } }, { start: { sfx: ['chuff'] }, move: 'chuff', end: { sfx: ['brake', 'cheer'], fx: [STAR, SMOKE] } }],
    mv18: [{ start: { sfx: ['tick', 'drum'] }, move: 'chuff', end: { sfx: ['whoosh', 'bell'], fx: [STAR] } }, { start: { sfx: ['steam'] }, end: { sfx: ['steam', 'whistle', 'cheer'], fx: [{ id: 'bk-smoke-07', at: 'goal', size: 240 }, { id: 'bk-smoke-01', at: 'goal', size: 190, delay: 220 }] } }],
    mv19: [{ start: { sfx: ['drum', 'tuba'] }, end: { sfx: ['pop', 'fanfare'], fx: [{ id: 'bk-star-02', at: 'goal', size: 130, n: 3, spread: 26 }] } }, { start: { sfx: ['tuba'] }, end: { sfx: ['applause', 'tada'], fx: [FLARE, STAR] } }, { start: { sfx: ['march'] }, move: 'chuff', end: { sfx: ['horn', 'cheer'], fx: [SMOKE, STAR] } }],
    mv20: [{ start: { sfx: ['march', 'chuff'] }, move: 'chuff', end: { sfx: ['bell', 'echo'], fx: [STAR] } }, { start: { sfx: ['echo'] }, move: 'chuff', end: { sfx: ['horn', 'echo'], fx: [FLARE] } }, { start: { sfx: ['echo'] }, end: { sfx: ['tada', 'applause'], fx: [STAR, { id: 'bk-star-02', at: 'goal', size: 150, n: 4, spread: 30 }, { id: 'bk-light-02', at: 'goal', size: 280, delay: 250 }] } }]
  }
  CUES.tuba = function () { var i; for (i = 0; i < 6; i++) { T(i % 2 ? 130 : 98, i % 2 ? 130 : 98, 0.2, 0.1, 'sawtooth', i * 0.28); if (i % 2) T(196, 196, 0.1, 0.05, 'square', i * 0.28) } }
  CUES.hammer = function () { if (SND && SND.hammer) SND.hammer() }
  W.KeretaScenePlan = PLAN   // other storylines add their own (Brave, Lomba ke Kota)

  function beatPlan (lv, bi) { var p = PLAN[lv.id]; return Array.isArray(p) ? p[bi] || p[p.length - 1] : p }
  var DEF_START = { storm: ['thunder', 'rain'], rain: ['rain', 'wind'], night: ['owl', 'wind'], dream: ['bell'] }
  var DEF_TERRAIN = { meadow: ['tweet'], mountain: ['wind'], gorge: ['echo', 'wind'], logging: ['saw'], depot: ['bell'], town: ['bell'], forest: ['tweet', 'owl'] }
  function defaultStart (lv, bi) { var b = lv.beats[bi] || {}, md = b.mood || lv.mood, tr = b.terrain || lv.terrain; return DEF_START[md] || DEF_TERRAIN[tr] || ['chuff'] }

  /* ── 1 reactions ───────────────────────────────────────────────────────── */
  var prevOn = def.onPlay, inPond = false
  def.onPlay = function (c) {
    CUR = c; SND = c.snd
    var extra = prevOn ? prevOn.apply(this, arguments) : 0
    try {
      var bp = beatPlan(c.lv, c.bi), b = (c.lv.beats && c.lv.beats[c.bi]) || {}, pond = (b.pond || c.lv.pond || []), wheat = (b.wheat || c.lv.wheat || [])
      var has = function (arr, rc) { return arr.some(function (p) { return p[0] === rc[0] && p[1] === rc[1] }) }
      c.ev.forEach(function (e) {
        if (e.e === 'move') {
          if (has(pond, e.to) && !has(pond, e.from)) { play(['splash', 'bubble']); var q = px(e.to); if (q && !RM) { def.fx.play('bk-circle-01', q[0], q[1], 170, { duration: 900 }); def.fx.play('px-bubbles', q[0], q[1], 140, { duration: 900 }) } }
          else if (has(wheat, e.to)) { play('rustle'); var w2 = px(e.to); if (w2 && !RM) def.fx.dust(w2[0], w2[1], 80) }
          else if (bp && bp.move) play(bp.move)
          else play('chuff')
        } else if (e.e === 'pick') { play('pop'); stars(where(e.id, c), 70) }
        else if (e.e === 'deliver') { var p2 = where(e.id, c); play(e.pay === 'horn' ? ['thump', 'horn'] : ['thump', 'bell']); stars(p2, 100); poof(p2, 80) }
        else if (e.e === 'couple' || e.e === 'train') { play(['clack', 'chuff']); poof(where(e.id, c), 90) }
        else if (e.e === 'wait') play('tick')
        else if (e.e === 'unlock') play(['door', 'clack'])
        else if (e.e === 'mark') { play('bell'); stars(where(e.id, c), 80) }
        else if (e.e === 'star') play('bell')
      })
    } catch (err) { if (W.console) console.warn('[kereta-scene]', err) }
    return extra
  }

  /* ── 2 the plan at beat start and end ──────────────────────────────────── */
  var lastKey = '', endDone = {}
  var hud0 = def.onHud
  def.onHud = function (c) {
    if (hud0) hud0(c)
    CUR = c; SND = c.snd
    var key = c.lv.id + '/' + c.bi
    if (key !== lastKey) { lastKey = key }
    try {
      var bp = beatPlan(c.lv, c.bi), obs = (c.beat && c.beat.objectives) || [], done = obs.length && obs.every(function (o) { return PG.met(c.w, o) })
      if (done && bp && bp.end && !endDone[key]) { endDone[key] = 1; play(bp.end.sfx); burst(bp.end.fx, c) }
    } catch (err) { if (W.console) console.warn('[kereta-scene]', err) }
  }
  D.addEventListener('click', function (e) {
    var t = e.target && e.target.closest && e.target.closest('#in-go'); if (!t) return
    setTimeout(function () {
      if (!CUR) return
      var key = CUR.lv.id + '/' + CUR.bi, bp = beatPlan(CUR.lv, CUR.bi); delete endDone[key]
      var st = bp && bp.start
      play(st ? st.sfx : defaultStart(CUR.lv, CUR.bi)); if (st) burst(st.fx, CUR)
    }, 520)
  }, true)
})(typeof window !== 'undefined' ? window : globalThis)
