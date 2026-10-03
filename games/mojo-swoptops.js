/* =============================================================================
 * mojo-swoptops.js — G31 Mojo Swoptops: Swop, Plan & Rescue (the game shell).
 * OBSERVE → SWOP → PLAN → RUN → DISCOVER → DEBUG/RE-SWOP → RESCUE (PRD §45).
 *
 * The rules live in games/prog-grid.js (headless, shared): this file only draws the world, edits the
 * program, plays each command's result back as animation, runs the microgames and keeps the save.
 * ONE interaction rule (owner 2026-10-03, "LEWATI vs SEBELAH"): small things are taken by driving OVER them
 * (ground ring), blockers are handled from BESIDE them (action badge; Mojo turns to the one target). The
 * Cara Main card teaches it on t1/t3 and reopens from #btn-rule. Every engine reason has its own MSG line.
 * Owner rules: no emoji, no failure words, no route preview before RUN (the only help is the PRD §9.1
 * hint ladder, one rung per tap on Petunjuk; its last rung caps the stars at 2), per-avatar save,
 * global mute ('dunia-emosi-sound' === 'off'), narration opt-in (speechSynthesis id-ID).
 * ==========================================================================*/
(function () {
  'use strict'
  var W = window, D = document
  if (W.lockGameAvatarSession) W.lockGameAvatarSession()
  var PG = W.ProgGrid, ML = W.MojoLevels, MA = W.MojoArt, MS = W.MojoSoal
  var GAME_ID = 'g31', KEY = 'dunia-g31-mojo'
  function $ (id) { return D.getElementById(id) }
  function el (tag, cls, html) { var e = D.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e }
  var RM = false; try { RM = W.matchMedia('(prefers-reduced-motion: reduce)').matches } catch (e) {}

  /* ── save (per avatar) ──────────────────────────────────────────────── */
  var S, saveDirty = false, pendingAwards = []
  function fill (o) {
    return W.MojoSave.clean(o,ML,PG)
  }
  function load () {
    var raw = null
    try { raw = W.avatarScopedGet ? avatarScopedGet(KEY, null) : localStorage.getItem(KEY) } catch (e) {}
    try { S = fill(raw ? JSON.parse(raw) : null) } catch (e) { S = fill(null) }
  }
  function save () {
    saveDirty = true
    try {
      var s = JSON.stringify(S)
      if (W.avatarScopedSet) { if (!avatarScopedSet(KEY,s)) throw new Error('Save storage unavailable') }
      else localStorage.setItem(KEY,s)
      saveDirty = false; return true
    } catch (e) { console.warn('[Mojo] Progress was not saved',e); toast('Kemajuan belum tersimpan. Periksa ruang penyimpanan, lalu coba lagi.'); return false }
  }
  load()

  /* ── sound + voice ──────────────────────────────────────────────────── */
  var GLOBAL_MUTE = false; try { GLOBAL_MUTE = localStorage.getItem('dunia-emosi-sound') === 'off' } catch (e) {}
  function soundOn () { return S.set.sound && !GLOBAL_MUTE }
  function cue (k) {
    if (!soundOn()) return
    try {
      var a = W.SFXEngine && SFXEngine.cue && SFXEngine.cue(k)
      if (a) { a.muted = false; if (cueTracks.indexOf(a) < 0) cueTracks.push(a) }
    } catch (e) {}
  }
  var AC = null, cueTracks = []
  function ac () { if (!soundOn()) return null; try { if (!AC) AC = new (W.AudioContext || W.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume() } catch (e) { AC = null } return AC }
  function tone (f0, f1, d, v, type, delay) {
    var c = ac(); if (!c) return
    try { var t = c.currentTime + (delay || 0), g = c.createGain(), o = c.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d)
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v || 0.12, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + 0.05) } catch (e) {}
  }
  function noise (d, v, lp) {
    var c = ac(); if (!c) return
    try { var n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), ch = b.getChannelData(0)
      for (var i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / n)
      var s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp || 900; g.gain.value = v || 0.15
      s.buffer = b; s.connect(f); f.connect(g); g.connect(c.destination); s.start() } catch (e) {}
  }
  var SND = {
    place: function () { cue('click') }, run: function () { cue('whoosh') }, collect: function () { cue('coin') }, goal: function () { cue('correct') },
    star: function () { cue('star') }, win: function () { cue('levelup') },
    move: function () { tone(140, 170, 0.22, 0.05, 'triangle') }, turn: function () { tone(300, 360, 0.1, 0.04, 'triangle') },
    think: function () { tone(330, 262, 0.28, 0.08, 'sine') },     // a recoverable stop: soft, never a buzzer
    clank: function () { tone(900, 700, 0.06, 0.12, 'square'); tone(1400, 1200, 0.05, 0.08, 'square', 0.07) },
    spray: function () { noise(0.6, 0.18, 2400) }, push: function () { noise(0.35, 0.2, 400) }, boing: function () { tone(220, 660, 0.3, 0.1, 'sine') },
    hammer: function () { tone(1200, 900, 0.05, 0.12, 'square'); tone(1100, 850, 0.05, 0.1, 'square', 0.18) }, swop: function () { cue('swoosh') }
  }
  var VOICE = null
  function pickVoice (lang) {
    try { var vs = W.speechSynthesis.getVoices() || [], re = lang === 'en' ? /^en([-_]|$)/i : /^id([-_]|$)/i; return vs.filter(function (v) { return re.test(v.lang) })[0] || null } catch (e) { return null }
  }
  function say (text, lang, force) {
    if (!text || !soundOn() || (!S.set.narr && !force)) return
    try {
      if (!W.speechSynthesis || !W.SpeechSynthesisUtterance) return
      W.speechSynthesis.cancel()
      var u = new SpeechSynthesisUtterance(String(text).replace(/\s+/g, ' '))
      u.lang = lang === 'en' ? 'en-US' : 'id-ID'; u.rate = 0.95; u.pitch = 1.1
      var v = pickVoice(lang); if (v) u.voice = v
      W.speechSynthesis.speak(u)
    } catch (e) {}
  }
  function hush () { try { W.speechSynthesis && W.speechSynthesis.cancel() } catch (e) {} }
  function syncSound () {
    try { GLOBAL_MUTE = localStorage.getItem('dunia-emosi-sound') === 'off' } catch (e) {}
    var muted = !soundOn()
    if (W.SFXEngine && SFXEngine.setMute) SFXEngine.setMute(muted)
    if (muted) {
      hush(); cueTracks.forEach(function (a) { a.muted = true })
      if (AC) { var old = AC; AC = null; old.close().catch(function (e) { console.warn('[Mojo] Sound context close failed',e) }) }
    }
    soundBtns()
  }
  W.addEventListener('storage',function (e) { if (e.key === 'dunia-emosi-sound' || e.key === null) syncSound() })

  /* ── words ──────────────────────────────────────────────────────────── */
  var LABEL = { up: 'Atas', down: 'Bawah', west: 'Kiri', east: 'Kanan', fwd: 'Maju', left: 'Kiri', right: 'Kanan', push: 'Dorong', spray: 'Semprot', raise: 'Naik', lower: 'Turun', rescue: 'Tolong', pick: 'Ambil', drop: 'Taruh',
    repair: 'Perbaiki', jump: 'Lompat', takeoff: 'Terbang', land: 'Mendarat', hook: 'Kait', release: 'Lepas' }
  var EN = { up: 'Up', down: 'Down', west: 'Left', east: 'Right', fwd: 'Forward', left: 'Left', right: 'Right', push: 'Push', spray: 'Spray', raise: 'Lift', lower: 'Lower', rescue: 'Rescue', pick: 'Pick up', drop: 'Drop', repair: 'Fix', jump: 'Jump', takeoff: 'Take off', land: 'Land' }
  var DOES = { push: 'mendorong batu', spray: 'menyemprot air', raise: 'naik ke atas', lower: 'turun', rescue: 'menolong teman', pick: 'mengambil barang', drop: 'menaruh barang',
    repair: 'memperbaiki', jump: 'melompat', takeoff: 'terbang', land: 'mendarat', hook: 'mengait', release: 'melepas' }
  var SHORT = { normal: 'Mojo', dozer: 'Dozer', fire: 'Pemadam', cherry: 'Keranjang', jumper: 'Lompat', crane: 'Derek', chopper: 'Heli' }
  function formName (f) { return (ML.FORMS[f] && ML.FORMS[f].name) || 'Mojo' }
  function cmdLabel (c) { return c.indexOf('swop:') === 0 ? 'Jadi ' + SHORT[c.slice(5)] : (LABEL[c] || c) }
  function cmdColor (c) { return c.indexOf('swop:') === 0 ? (ML.FORMS[c.slice(5)] || {}).color || '#7B1FA2' : MA.CAT[c] || '#546E7A' }
  function cmdIco (c, cls) { return '<i class="' + (cls || 'ci') + '">' + MA.icon(c) + '</i>' }
  function verbIcoBox (v) { return '<i class="cmdico" style="background:' + cmdColor(v) + '">' + MA.icon(v) + '</i>' }

  /* ── small UI helpers ───────────────────────────────────────────────── */
  function icons (root) { [].forEach.call((root || D).querySelectorAll('[data-ico]'), function (i) { if (!i.firstChild) i.innerHTML = MA.icon(i.getAttribute('data-ico')) }) }
  // Cancel delayed world writes when a run/mission is abandoned.
  var epoch = 0, timers = []
  function later (fn, ms) {
    var owner = epoch, t = W.setTimeout(function () { if (owner === epoch) fn() }, ms)
    timers.push(t); return t
  }
  function cancelPlayback () {
    epoch++; timers.forEach(W.clearTimeout); timers = []
    // only the playback's own (script) animations: the CSS idle loops on the board (fire flicker, pickup bob)
    // and transitions keep running (a cancelled CSS animation stays dead until its style changes)
    if (D.getAnimations) D.getAnimations().forEach(function (a) { if (!(W.CSSAnimation && a instanceof W.CSSAnimation) && !(W.CSSTransition && a instanceof W.CSSTransition)) a.cancel() })
    ;['ov-mg','ov-swop','ov-card'].forEach(closeOv)
    var sw = $('ov-swop'); sw.onclick = null; if (sw.firstChild) { sw.innerHTML = ''; sw.setAttribute('aria-hidden', 'true') }
    MG = null; drag = null
    $('drag-ghost').classList.remove('on')
    ;[].forEach.call(D.querySelectorAll('.fly,.confetti,#fx .spark,#fx .splash,#fx .pop-ico'),function (n) { n.remove() })
    if (W.MojoFX) MojoFX.clear()   // every board effect node and frame timer of the run   // a cancelled particle would sit at the board corner
  }
  var toastT = 0
  function toast (m) { var t = $('toast'); t.textContent = m; t.className = 'toast show'; clearTimeout(toastT); toastT = W.setTimeout(function () { t.className = 'toast' }, 2400) }   // not later(): cancelPlayback must never strand a toast on screen
  function tap (id, fn) { var e = typeof id === 'string' ? $(id) : id; if (e) e.addEventListener('click', function (ev) { fn(ev) }) }
  function storePacing () {
    if (!G) return
    if (G.active && !D.hidden) G.elapsed += Math.max(0,performance.now()-G.tick)
    G.tick = performance.now()
    if (S.cp && S.cp.id === G.lv.id) {
      S.cp = Object.assign({},S.cp,{ elapsed:G.elapsed, events:G.eventGate.state(), bonus:G.bonus }); save()
    }
  }
  function show (id) {
    if (G && D.body.getAttribute('data-scr') === 'scr-play' && id !== 'scr-play') {
      flushAwards()
      storePacing(); G.active = false
      if (G.run) endRunUi()
      cancelPlayback(); hush()
    }
    // a toast belongs to the screen that raised it (a map "segera dibuka" note never shows during play)
    var fromScr = D.body.getAttribute('data-scr')
    if (fromScr !== id) { clearTimeout(toastT); $('toast').className = 'toast' }
    if (fromScr && fromScr !== id && SWOOSH_SCR[id]) cue('swoosh')   // a soft swoosh with the 200 ms screen slide
    ;[].forEach.call(D.querySelectorAll('.scr'), function (s) { s.classList.toggle('active', s.id === id) })
    D.body.setAttribute('data-scr', id)
  }
  var SWOOSH_SCR = { 'scr-home': 1, 'scr-regions': 1, 'scr-map': 1, 'scr-play': 1 }
  function overlay (id, html) { var o = $(id); if (html != null) { o.innerHTML = html; icons(o) } o.classList.add('on'); return o }
  function closeOv (id) { $(id).classList.remove('on') }
  function anim (e, frames, ms, ease, done) {
    if (!e) { if (done) done(); return null }
    var a = null
    try { a = e.animate(frames, { duration: RM ? Math.min(ms, 200) : ms, easing: ease || 'cubic-bezier(.23,1,.32,1)', fill: 'forwards' }) } catch (x) { a = null }
    if (!a) { if (done) later(done, 0); return null }
    var owner = epoch
    a.onfinish = function () { if (owner !== epoch) return; try { if (a.commitStyles) a.commitStyles() } catch (x) {} a.cancel(); if (done) done() }
    return a
  }
  var EIO = 'cubic-bezier(.77,0,.175,1)', EOUT = 'cubic-bezier(.23,1,.32,1)'
  function soundBtns () {
    ['btn-sound', 'btn-sound2'].forEach(function (id) { var b = $(id); if (!b) return; b.innerHTML = '<i class="ico">' + MA.icon(soundOn() ? 'sound' : 'mute') + '</i>'; b.setAttribute('aria-pressed', soundOn() ? 'true' : 'false'); b.setAttribute('aria-label', soundOn() ? 'Suara: nyala' : 'Suara: mati') })
  }
  function toggleSound () {
    if (GLOBAL_MUTE) { toast('Suara dimatikan di Pengaturan Dunia Emosi'); return }
    S.set.sound = !S.set.sound; save(); syncSound()
  }

  /* ── HOME ───────────────────────────────────────────────────────────── */
  function home () {
    if (G && G.run) endRunUi(); cancelPlayback(); hush()
    show('scr-home')
    var sk = $('home-skyline')
    if (!sk.firstChild) {
      var cols = ['#E2574C', '#4C8FD6', '#F2B632', '#6BBF59', '#9C6ADE', '#FF8A5C', '#4DB6AC']
      for (var i = 0; i < 9; i++) { var b = el('i'); b.style.width = (6 + (i * 37 % 5)) + '%'; b.style.height = (38 + (i * 53 % 50)) + '%'; b.style.background = cols[i % cols.length]; sk.appendChild(b) }
    }
    $('home-mojo').innerHTML = MA.mojo('normal', 'side')
    $('home-bo').src = MA.src('char/bo')
    homeCounters()
    var cp = S.cp && ML.byId(S.cp.id)
    $('play-t').textContent = cp ? 'Lanjutkan!' : Object.keys(S.lv).length ? 'Main Lagi!' : 'Ayo Main!'
  }
  function homeCounters () {
    var st = 0; for (var k in S.lv) st += S.lv[k].stars || 0
    var a = $('home-stars'), b = $('home-bolts')
    if (a) a.querySelector('b').textContent = String(st)
    if (b) b.querySelector('b').textContent = String(S.rewardBolts || 0)
  }
  function nextLevelId () {
    if (S.cp && ML.byId(S.cp.id)) return S.cp.id
    for (var i = 0; i < ML.LEVELS.length; i++) if (!S.lv[ML.LEVELS[i].id]) return ML.LEVELS[i].id
    return ML.LEVELS[ML.LEVELS.length - 1].id
  }

  /* ── MISSION MAP ────────────────────────────────────────────────────── */
  var UNLOCK_ALL = /[?&]unlock=1/.test(location.search)
  /* Owner rule 2026-10-03 "let them explore": finishing a level with ANY stars opens the next three, in order and
     across episodes; the first three are open from the start; star totals never gate. Unlocks only grow (an old
     save keeps everything it had and gains the new opens). */
  var OPEN_AHEAD = 3
  function maxDone () { var m = -1; ML.LEVELS.forEach(function (l, i) { if (S.lv[l.id]) m = i }); return m }
  function unlocked (i) {
    if (UNLOCK_ALL || i < OPEN_AHEAD) return true
    var lv = ML.LEVELS[i]
    if (S.lv[lv.id] || i <= maxDone() + OPEN_AHEAD) return true
    return lv.ch === 'misi' && !!S.lv.t7   // the earlier rule's open, kept so no save ever loses a level
  }
  // the exact level whose finish opens level i (1-based, as the tiles are numbered)
  function opener (i) { return i - OPEN_AHEAD + 1 }
  function starImg (on) { return '<i style="background-image:url(' + MA.src('obj/star') + ');' + (on ? '' : 'opacity:.25;filter:grayscale(1)') + '"></i>' }
  function levelPic (lv) {
    var k = lv.icon || 'cmd/east', p = k.split('/')
    if (p[0] === 'form') return MA.module(p[1], 'top').replace('<svg ', '<svg style="width:52px;height:52px" ')
    if (p[0] === 'cmd' || p[0] === 'ui') return '<i class="cmdico" style="background:' + cmdColor(p[1]) + '">' + MA.icon(p[1]) + '</i>'
    return '<img src="' + MA.src(k) + '" alt="">'
  }
  // Level select (owner mockup "Episode Selection"): the region's painted scene, a region banner, and
  // each episode (tutorial, chapter, big mission) as a row of big numbered tiles with three stars.
  function map (regionId) {
    cancelPlayback(); hush()
    regionId = regionId || W.MojoMenu.region()
    var region = ML.REGIONS.filter(function (r) { return r.id === regionId })[0] || ML.REGIONS[0]
    show('scr-map')
    $('scr-map').style.backgroundImage = 'url(' + W.MojoMenu.background(MA.regionScene(region)) + ')'
    var tot = 0, max = 0, box = $('chapters'); box.innerHTML = ''
    region.levels.forEach(function (id) { tot += (S.lv[id] && S.lv[id].stars) || 0; max += 3 })
    $('map-title').textContent = region.title
    $('map-stars').innerHTML = '<i class="ico"><img src="' + MA.src('obj/star') + '" alt="" style="width:100%;height:100%"></i>'
    var total = el('b'); total.textContent = tot + '/' + max; $('map-stars').appendChild(total)
    var nextId = nextLevelId(), ep = 0
    ML.CHAPTERS.forEach(function (ch) {
      var c = el('section', 'chap'), row = el('div', 'lvls')
      ML.LEVELS.forEach(function (lv, i) {
        if (lv.ch !== ch.id || ML.region(lv.id).id !== regionId) return
        var ok = unlocked(i), rec = S.lv[lv.id], isNext = ok && lv.id === nextId && !rec
        var b = el('button', 'lvl' + (rec ? ' done' : '') + (ok ? '' : ' lock') + (isNext ? ' next' : ''))
        b.type = 'button'; b.setAttribute('data-level', lv.id)
        b.setAttribute('aria-label', 'Misi ' + (i + 1) + ': ' + lv.title + (ok ? '' : ' (terkunci: selesaikan level ' + opener(i) + ' dulu)'))
        var st = ''; for (var s = 1; s <= 3; s++) st += starImg(rec && rec.stars >= s)
        b.innerHTML = '<span class="tile"><span class="n fk">' + (i + 1) + '</span>' + (ok ? '' : '<i class="lk">' + MA.icon('lock') + '</i>') + '</span>' +
          '<div class="st">' + st + '</div><b>' + lv.title + '</b>'
        if (ok) tap(b, function () { SND.place(); start(lv.id) })
        else tap(b, function () {
          toast('Selesaikan level ' + opener(i) + ' dulu, ya!')
          anim(b, [{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(0)' }], 360, EIO)
        })
        row.appendChild(b)
      })
      if (!row.children.length) return
      ep++
      c.innerHTML = '<h2 class="fk"><span class="ep">Episode ' + ep + '</span> ' + ch.title + ' <small>' + ch.sub + '</small></h2>'
      c.appendChild(row); box.appendChild(c)
    })
    var nx = box.querySelector('.lvl.next')
    if (nx) later(function () { if (nx.isConnected) nx.scrollIntoView({ block: 'nearest' }) }, 0)
  }

  /* ── PLAY: state ────────────────────────────────────────────────────── */
  var G = null   // the level being played
  function beat () { return G.lv.beats[G.bi] }
  function newWorld (lv, bi, base) {
    var w = base ? PG.startBeat(base, lv, bi) : PG.world(lv)
    return PG.prep(w, lv, bi)
  }
  function packWorld (w) { var o = PG.clone(w); delete o.map; delete o.cap; delete o.forms; return o }
  function unpackWorld (o, lv, bi) { var w = PG.clone(Object.assign({}, o, { map: lv.grid.map, cap: lv.cap || {}, forms: null })); w.map = lv.grid.map; w.cap = lv.cap || {}; return PG.prep(w, lv, bi) }

  function start (id) {
    flushAwards()
    var lv = ML.byId(id); if (!lv) return
    if (G && G.run) endRunUi()
    cancelPlayback(); hush()
    var resume = S.cp && S.cp.id === id && S.cp.beat > 0 && S.cp.beat < lv.beats.length
    G = { lv: lv, idx: ML.index(id), bi: 0, cp: null, w: null, prog: [], hist: [], sel: -1, run: null, used: [], starBeat: {}, ghost: false, shown: false, fails: 0, trans: false, hint: 0, fail: null, dirty: false, ang: 0, gotStars: {} }
    if (resume) {
      try { G.bi = S.cp.beat; G.cp = unpackWorld(S.cp.world, lv, G.bi); G.used = S.cp.used || []; G.ghost = !!S.cp.ghost; G.shown = !!S.cp.shown; G.starBeat = S.cp.starBeat || {}; G.gotStars = S.cp.gotStars || {} } catch (e) { resume = false }
    }
    if (!resume) { G.bi = 0; G.cp = newWorld(lv, 0) }
    G.w = G.cp
    G.runId = 0; G.elapsed = resume ? W.MojoEvents.resumeElapsed(S.cp.events,S.cp.elapsed) : 0; G.tick = performance.now(); G.active = true; G.bonus = resume && S.cp.bonus || 0
    G.eventGate = W.MojoEvents.create(lv.ch === 'belajar' && !S.lv[id], resume && S.cp.events)
    $('scr-play').style.backgroundImage = 'url(' + W.MojoMenu.background(MA.scene(lv, G.bi, ML.region(id))) + ')'
    show('scr-play')
    $('p-title').textContent = lv.title
    $('bo-img').src = MA.src('char/bo')
    setupBoard()
    beginBeat(resume)
  }
  function beginBeat (resumed) {
    var b = beat()
    $('scr-play').style.backgroundImage = 'url(' + W.MojoMenu.background(MA.scene(G.lv, G.bi, ML.region(G.lv.id))) + ')'
    $('btn-run').disabled = false
    G.prog = (b.prefill || []).slice(); G.hist = []; G.sel = -1; G.hint = 0; G.fails = 0; G.fail = null; G.dirty = false; G.w = G.cp; G.trans = false
    clearMarks(); hideGhost(); $('hint-lv').textContent = ''
    renderPalette(); W.requestAnimationFrame(function () { $('palette').scrollTop = 0 }); renderStrip(); renderHud(); renderWorld(G.w, true); beatDots()
    boSay(b.bo, true)   // the beat's own line: it opens with THIS beat's objective (gate: qa-prog-grid L)
    helpUi()
    introCard(resumed)
  }

  /* ── board ──────────────────────────────────────────────────────────── */
  var CELL = 64, ro = null, OBJ = {}
  function setupBoard () {
    var lv = G.lv, board = $('board')
    board.style.setProperty('--cols', lv.grid.cols); board.style.setProperty('--rows', lv.grid.rows)
    $('objs').innerHTML = ''; $('decor').innerHTML = ''; $('fx').innerHTML = ''; OBJ = {}
    var objsF = D.createDocumentFragment(), decorF = D.createDocumentFragment()   // one insert each (M5)
    ;(lv.objects || []).forEach(function (o) {
      var t = PG.TYPES[o.type] || {}
      var d = el('div', 'ob ' + o.type + (TYPE_PICKUP[o.type] ? ' pickup' : '') + (o.elev ? ' elev' : '') + (t.walk && o.type !== 'zone' ? ' walk' : '') + (o.perch ? ' perch-' + o.perch : ''))
      d.innerHTML = (t.walk && o.type !== 'zone' ? '<i class="ring" aria-hidden="true"></i>' : '') + (o.perch === 'tree' ? '<img class="perch" alt="" src="' + MA.src('obj/tree') + '">' : '') + '<img class="main" alt="">' +
        (t.verb ? '<i class="act" aria-hidden="true" style="background:' + cmdColor(t.verb) + '">' + MA.icon(t.verb) + '</i>' : '')
      d.setAttribute('data-id', o.id)
      objsF.appendChild(d); OBJ[o.id] = d
    })
    lv.grid.map.forEach(function (row, r) {
      for (var c = 0; c < row.length; c++) if (row.charAt(c) === 'T') {
        var t = el('div', 'dec'); t.innerHTML = '<img alt="" src="' + MA.src('obj/tree') + '">'; t.setAttribute('data-rc', r + ',' + c); decorF.appendChild(t)
      }
    })
    $('objs').appendChild(objsF); $('decor').appendChild(decorF)
    $('mojo-ch').innerHTML = MA.chassis('top')
    if (ro) ro.disconnect()
    /* No synchronous layout() here (M5: reading the board size forced a full reflow of the fresh screen). The
       observer's first callback runs after the browser's own layout and before the first paint, so the board is
       measured and drawn in the same frame; the palette check waits a frame so it reads a clean layout. */
    if (W.ResizeObserver) { layoutDue = true; ro = new ResizeObserver(function () { layout(); W.requestAnimationFrame(updatePaletteScroll) }); ro.observe($('board-wrap')) } else { W.addEventListener('resize', layout); layout() }
  }
  var layoutDue = false
  var TYPE_PICKUP = { bolt: 1, drop: 1, star: 1 }
  function layout () {
    if (!G) return
    layoutDue = false
    $('scr-play').style.backgroundImage = 'url(' + W.MojoMenu.background(MA.scene(G.lv, G.bi, ML.region(G.lv.id))) + ')'
    var wrap = $('board-wrap'), lv = G.lv, pad = 26
    var w = wrap.clientWidth - pad, h = wrap.clientHeight - pad
    if (w <= 0 || h <= 0) return
    CELL = Math.max(16, Math.floor(Math.min(w / lv.grid.cols, h / lv.grid.rows)))
    $('board').style.setProperty('--cell', CELL + 'px')
    D.documentElement.style.setProperty('--cell', CELL + 'px')
    paint(G.w)
    placeAll(G.w)
  }
  var tileImages = {}, BOARD_BUILDINGS = ['house', 'shop', 'hospital', 'factory', 'garage', 'school']
  ;['road','grass','water','indoor-floor','wall','trap-hole'].concat(BOARD_BUILDINGS.map(function (k) { return 'b:' + k })).forEach(function (key) {
    var im = new Image(); im.onload = function () { if (G) paint(G.w) }
    im.src = key.indexOf('b:') === 0 ? MA.lib('mojo-prop/' + key.slice(2)) : MA.lib('mojo-tile/' + key); tileImages[key] = im
  })
  var THEME = {
    town: { road: '#EADCC2', joint: '#D2BF9E', grass: '#8DCB5F', tuft: '#6DAE44', roofs: ['#E2574C', '#4C8FD6', '#F2B632', '#6BBF59', '#9C6ADE'] },
    park: { road: '#EEDFC4', joint: '#D6C3A2', grass: '#86C95A', tuft: '#62A83E', roofs: ['#E2574C', '#F2B632', '#4C8FD6'] },
    school: { road: '#DCE2EA', joint: '#BAC4D0', grass: '#8DCB5F', tuft: '#6DAE44', roofs: ['#D84A3A', '#D84A3A', '#C9433A'] },
    hill: { road: '#DCC6A0', joint: '#C2A77C', grass: '#8CC063', tuft: '#6B9E44', roofs: ['#A1887F'] }
  }
  function rr (x, c, y, w, h, r) { x.beginPath(); x.moveTo(c + r, y); x.arcTo(c + w, y, c + w, y + h, r); x.arcTo(c + w, y + h, c, y + h, r); x.arcTo(c, y + h, c, y, r); x.arcTo(c, y, c + w, y, r); x.closePath() }
  // Board ground from the owner's Grid Element Library (sheets 02-03): painted tiles, cropped inside
  // their bevel so neighbouring cells of one terrain read as continuous ground. Roads orient from their
  // neighbours: straight (dash) rows turn 90deg, corners / T / crossings use the plain asphalt.
  var BUILDINGS = BOARD_BUILDINGS
  function tileImg (key) { var im = tileImages[key]; return im && im.complete && im.naturalWidth ? im : null }
  function roadShape (ch, r, c) {
    function rd (a, b) { var k = ch(a, b); return k === '.' || k === '=' || k === 'o' }   // a pit is a gap IN the road
    var n = rd(r - 1, c), so = rd(r + 1, c), e = rd(r, c + 1), wv = rd(r, c - 1), v = n || so, h = e || wv
    if (v && !h) return 'v'
    if (h && !v) return 'h'
    return 'plain'
  }
  function drawTile (x, im, X, Y, s, inset) {
    var iw = im.naturalWidth, ih = im.naturalHeight, ix = iw * inset, iy = ih * inset
    x.drawImage(im, ix, iy, iw - 2 * ix, ih - 2 * iy, X, Y, s, s)
  }
  function drawRoad (x, im, X, Y, s, shape) {
    var iw = im.naturalWidth, ih = im.naturalHeight, ix = iw * 0.07, iy = ih * 0.07
    if (shape === 'plain') {
      // the left half of the painted asphalt, mirrored: the same surface without the centre dash
      var half = iw * 0.42 - ix
      x.drawImage(im, ix, iy, half, ih - 2 * iy, X, Y, s / 2 + 1, s)
      x.save(); x.translate(X + s, Y); x.scale(-1, 1); x.drawImage(im, ix, iy, half, ih - 2 * iy, 0, 0, s / 2 + 1, s); x.restore()
      return
    }
    if (shape === 'h') { x.save(); x.translate(X + s / 2, Y + s / 2); x.rotate(Math.PI / 2); x.drawImage(im, ix, iy, iw - 2 * ix, ih - 2 * iy, -s / 2, -s / 2, s, s); x.restore(); return }
    x.drawImage(im, ix, iy, iw - 2 * ix, ih - 2 * iy, X, Y, s, s)
  }
  function paint (w) {
    var cv = $('board-bg'), lv = G.lv, R = lv.grid.rows, Cn = lv.grid.cols, dpr = Math.min(2, W.devicePixelRatio || 1)
    cv.width = Math.round(Cn * CELL * dpr); cv.height = Math.round(R * CELL * dpr)
    var x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.imageSmoothingQuality = 'high'
    var T = THEME[lv.grid.theme] || THEME.town, s = CELL, indoor = lv.grid.theme === 'school'
    function ch (r, c) { if (r < 0 || c < 0 || r >= R || c >= Cn) return null; return w.fill[r + ',' + c] ? '.' : lv.grid.map[r].charAt(c) }
    var onCell = {}; (lv.objects || []).forEach(function (o) { onCell[o.at[0] + ',' + o.at[1]] = 1 })   // a building never hides under an object's own art
    var grass = tileImg('grass'), road = tileImg(indoor ? 'indoor-floor' : 'road'), water = tileImg('water'), wall = tileImg('wall'), hole = tileImg('trap-hole')
    for (var r = 0; r < R; r++) for (var c = 0; c < Cn; c++) {
      var k = ch(r, c), X = c * s, Y = r * s, filled = !!w.fill[r + ',' + c]
      if (k === ',' || k === 'T' || (k === '#' && !indoor)) {
        if (grass) drawTile(x, grass, X, Y, s, 0.07); else { x.fillStyle = T.grass; x.fillRect(X, Y, s, s) }
        if (k === '#' && !onCell[r + ',' + c]) {
          var b = tileImg('b:' + BUILDINGS[(r * 3 + c * 5) % BUILDINGS.length])
          if (b) { var bw = b.naturalWidth, bh = b.naturalHeight, sc = Math.min(s * 0.9 / bw, s * 0.9 / bh); x.drawImage(b, X + (s - bw * sc) / 2, Y + (s - bh * sc) / 2 + s * 0.02, bw * sc, bh * sc) }
          else { x.fillStyle = T.roofs[(r * 3 + c * 5) % T.roofs.length]; x.fillRect(X + 6, Y + 6, s - 12, s - 12) }
        }
      } else if (k === '#') {
        if (wall) drawTile(x, wall, X, Y, s, 0.03); else { x.fillStyle = T.joint; x.fillRect(X, Y, s, s) }
      } else if (k === '~') {
        if (water) drawTile(x, water, X, Y, s, 0.07); else { x.fillStyle = '#4FC3F7'; x.fillRect(X, Y, s, s) }
      } else {
        if (road) { if (indoor) drawTile(x, road, X, Y, s, 0.04); else drawRoad(x, road, X, Y, s, roadShape(ch, r, c)) }
        else { x.fillStyle = T.road; x.fillRect(X, Y, s, s) }
        if (k === 'o') { if (hole) drawTile(x, hole, X + s * 0.06, Y + s * 0.06, s * 0.88, 0.02); else { x.fillStyle = '#3E2723'; x.beginPath(); x.ellipse(X + s / 2, Y + s / 2, s * 0.36, s * 0.3, 0, 0, 7); x.fill() } }
        if (filled) {
          x.fillStyle = '#A1887F'; x.beginPath(); x.ellipse(X + s / 2, Y + s / 2, s * 0.36, s * 0.3, 0, 0, 7); x.fill()
          x.fillStyle = '#8D6E63'; [[0.38, 0.46, 0.08], [0.58, 0.42, 0.1], [0.5, 0.6, 0.07]].forEach(function (p) { x.beginPath(); x.arc(X + s * p[0], Y + s * p[1], s * p[2], 0, 7); x.fill() })
        }
      }
    }
    if (!indoor) kerbs(x, ch, R, Cn, s)
    // cells Mojo must reach are shown by their objects (flag, people), never a path
  }
  // ROAD rule (2026-10-03): a stone kerb wherever road meets grass / trees / buildings, so the drivable road reads
  // as one network and the lawn as scenery. Road cells: '.', '=', a pit inside the road.
  function kerbs (x, ch, R, Cn, s) {
    function isRoad (k) { return k === '.' || k === '=' || k === 'o' }
    var kw = Math.max(2, s * 0.055)
    for (var r = 0; r < R; r++) for (var c = 0; c < Cn; c++) {
      if (!isRoad(ch(r, c))) continue
      var X = c * s, Y = r * s
      ;[[-1, 0], [0, 1], [1, 0], [0, -1]].forEach(function (d, i) {
        var k = ch(r + d[0], c + d[1])
        if (k == null || isRoad(k) || k === '~') return
        var rx = i === 1 ? X + s - kw : X, ry = i === 2 ? Y + s - kw : Y, rw = i % 2 ? kw : s, rh = i % 2 ? s : kw
        x.fillStyle = '#EDE6D3'; x.fillRect(rx, ry, rw, rh)
        x.fillStyle = 'rgba(70,60,40,.28)'
        if (i === 0) x.fillRect(X, Y + kw, s, 1.5); else if (i === 2) x.fillRect(X, Y + s - kw - 1.5, s, 1.5)
        else if (i === 1) x.fillRect(X + s - kw - 1.5, Y, 1.5, s); else x.fillRect(X + kw, Y, 1.5, s)
      })
    }
  }
  function tf (r, c, extra) { return 'translate(' + (c * CELL) + 'px,' + (r * CELL) + 'px)' + (extra || '') }
  function placeAll (w) {
    [].forEach.call($('decor').children, function (d) { var p = d.getAttribute('data-rc').split(','); d.style.transform = tf(+p[0], +p[1]) })
    w.objs.forEach(function (o) { var d = OBJ[o.id]; if (d) d.style.transform = tf(o.r, o.c) })
    placeMojo(w.m, true)
  }
  // The owner's side drawing looks left: mirror it for east, keep the last side for up/down (no rotation)
  var faceEast = false
  function faceMojo (h) {
    if (h === 1) faceEast = true; else if (h === 3) faceEast = false
    $('mojo').setAttribute('data-heading', h)
    $('mojo-mod').style.transform = faceEast ? 'scaleX(-1)' : ''
  }
  function placeMojo (m, snap) {
    var mj = $('mojo')
    mj.style.transform = tf(m.r, m.c)
    if (snap) G.ang = m.h * 90
    $('mojo-rot').style.transform = 'none'
    faceMojo(m.h)
    mj.classList.toggle('lifted', m.lift > 0); mj.classList.toggle('air', !!m.air)
    $('mojo-badge').textContent = m.lift > 0 ? m.lift : ''
  }
  function objImg (o) {
    switch (o.type) {
      case 'rock': return MA.src('obj/rock')
      case 'fire': return o.st === 'out' ? MA.src('obj/ash') : MA.src('obj/fire')
      case 'person': return MA.src('char/' + (o.who || 'kid'))
      case 'toolbox': return MA.src('obj/toolbox')
      case 'repair': return o.what === 'lamp' ? MA.src('obj/lamp') : MA.src('obj/' + (o.what || 'gate') + '-' + (o.st === 'fixed' ? 'fixed' : 'broken'))
      case 'flag': return MA.src('obj/flag')
      case 'crate': return MA.src('obj/crate')
      case 'bolt': return MA.src('obj/bolt')
      case 'drop': return MA.src('obj/drop')
      case 'star': return MA.src('obj/star')
      default: return MA.src('obj/cone')
    }
  }
  function objTag (o, lv0) {
    if (o.type === 'fire' && o.st !== 'out') return '<img src="' + MA.src('obj/drop') + '" alt="">' + o.str   // the water it still needs
    if (o.type === 'person' && o.elev && o.st !== 'rescued') return '<img src="' + MA.src('tool/tangga') + '" alt="">' + o.elev
    if (o.type === 'repair' && o.st !== 'fixed') {
      var n = o.needs || {}, t = ''
      if (n.tool) t += '<img src="' + MA.src('tool/' + n.tool) + '" alt="">'
      if (n.bolts) t += '<img src="' + MA.src('obj/bolt') + '" alt="">' + n.bolts
      if (o.elev) t += '<img src="' + MA.src('tool/tangga') + '" alt="">' + o.elev
      return t
    }
    if (o.type === 'toolbox' && o.st === 'closed') return '<img src="' + MA.src('tool/' + o.tool) + '" alt="">'
    return ''
  }
  function renderObj (o) {
    var d = OBJ[o.id]; if (!d) return
    var img = d.querySelector('img.main'), s = objImg(o)
    if (img.getAttribute('src') !== s) img.src = s
    var gone = o.st === 'got' || o.st === 'rescued' || o.st === 'cleared' || o.st === 'carried'
    d.classList.toggle('gone', gone)
    d.classList.toggle('resolved', !PG.blocks(o))   // a resolved SEBELAH object: its action badge goes away
    d.classList.toggle('done', o.st === 'open' || (o.type === 'fire' && o.st === 'out'))
    var tg = d.querySelector('.tag'), t = objTag(o)
    if (t) { if (!tg) { tg = el('span', 'tag'); d.appendChild(tg) } if (tg.innerHTML !== t) tg.innerHTML = t } else if (tg) tg.remove()
    if (o.type === 'fire') { var f0 = (PG.find(PG.world(G.lv), o.id) || {}).str || 1; img.style.transform = o.st === 'out' ? '' : 'scale(' + (0.62 + 0.38 * o.str / f0) + ')' }
    if (o.type === 'repair' && o.what === 'lamp') img.style.filter = o.st === 'fixed' ? 'drop-shadow(0 0 10px #FFE14D) drop-shadow(0 3px 2px rgba(0,0,0,.25))' : 'grayscale(.8) brightness(.8)'
  }
  function renderWorld (w, snap) {
    $('mojo').style.opacity = ''; $('mojo-mod').style.opacity = ''
    w.objs.forEach(function (o) { if (OBJ[o.id]) OBJ[o.id].style.opacity = ''; renderObj(o) })
    placeAll(w)
    $('mojo-mod').innerHTML = MA.module(w.m.form, 'top')
    if (snap && !layoutDue) paint(w)   // a fresh board is painted once, by its first layout()
    renderHud()
  }

  /* ── HUD (objectives, inventory, beats) ─────────────────────────────── */
  function obInfo (ob) {
    var o = ob.id ? (G.lv.objects || []).filter(function (x) { return x.id === ob.id })[0] : null
    switch (ob['do']) {
      case 'extinguish': return { img: MA.src('obj/fire'), t: 'Padamkan api' }
      case 'rescue': return { img: MA.src('char/' + ((o && o.who) || 'kid')), t: 'Tolong ' + ((o && o.name) || 'teman') }
      case 'repair': return { img: objImg(Object.assign({}, o, { st: 'broken' })), t: 'Perbaiki ' + ({ gate: 'gerbang', swing: 'ayunan', lamp: 'lampu' }[o && o.what] || '') }
      case 'reach': return { img: MA.src('obj/flag'), t: 'Sampai ke bendera' }
      default: return { img: MA.src('obj/star'), t: '' }
    }
  }
  function renderHud () {
    if (!G) return
    var w = G.w, b = beat(), box = $('p-objs'); box.innerHTML = ''
    ;(b.objectives || []).forEach(function (ob) {
      var i = obInfo(ob), c = el('span', 'ob-chip' + (PG.met(w, ob) ? ' ok' : ''), '<img alt="" src="' + i.img + '"><span>' + i.t + '</span><i class="tick">' + MA.icon('check') + '</i>')
      c.setAttribute('aria-label',i.t); box.appendChild(c)
    })
    var pending = (b.objectives || []).filter(function (ob) { return !PG.met(w,ob) })
    $('bo-task').textContent = pending.length ? obInfo(pending[0]).t : 'Tugas selesai!'
    var inv = $('p-inv'), lv = G.lv, h = ''
    function pips (n, cap) { var s = ''; for (var k = 0; k < cap; k++) s += '<i class="' + (k < n ? 'on' : '') + '"></i>'; return '<span class="pips">' + s + '</span>' }
    if (lv.cap && lv.cap.water != null) h += '<span class="gauge water" id="g-water" aria-label="Air ' + (w.res.water || 0) + '"><img alt="" src="' + MA.src('obj/drop') + '">' + pips(w.res.water || 0, lv.cap.water) + '<b class="num">' + (w.res.water || 0) + '</b></span>'
    if (lv.cap && lv.cap.bolts != null) h += '<span class="gauge bolts" id="g-bolts" aria-label="Baut ' + (w.res.bolts || 0) + '"><img alt="" src="' + MA.src('obj/bolt') + '">' + pips(w.res.bolts || 0, lv.cap.bolts) + '<b class="num">' + (w.res.bolts || 0) + '/' + lv.cap.bolts + '</b></span>'
    ;(lv.objects || []).forEach(function (o) { if (o.type === 'toolbox') h += '<span class="gauge tool' + (w.tools[o.tool] ? ' have' : '') + '" id="g-tool"><img alt="' + o.tool + '" src="' + MA.src('tool/' + o.tool) + '"></span>' })
    if ((lv.optional || []).length) { var got = (lv.optional || []).every(function (o) { return w.got[o.id] || G.gotStars[o.id] }); h += '<span class="gauge star' + (got ? ' have' : '') + '" id="g-star"><img alt="bintang" src="' + MA.src('obj/star') + '"></span>' }
    if (inv.innerHTML !== h) inv.innerHTML = h
  }
  function beatDots () {
    var n = G.lv.beats.length, h = ''
    if (n > 1) for (var i = 0; i < n; i++) h += '<i class="' + (i < G.bi ? 'done' : i === G.bi ? 'on' : '') + '"></i>'
    $('p-beats').innerHTML = h
  }

  /* ── Bo ─────────────────────────────────────────────────────────────── */
  var boLine = '', sayFlip = false
  /* full: a hint rung shows its whole text in the bubble (it may grow to a few lines and scroll); the bubble then
     drops its bold task line so the objective is never said twice */
  function boSay (t, quiet, alert, full) {
    boLine = t || ''
    var b = D.querySelector('.bubble'), p = $('bo-text')
    var first = boLine.match(/^.*?[.!?](?:\s|$)/), short = first ? first[0].trim() : boLine
    p.textContent = full ? boLine : short.length <= 64 ? short : 'Lihat pesan Bo untuk penjelasannya.'
    $('bo-details').disabled = !!G.run
    W.requestAnimationFrame(function () { b.scrollTop = 0 })   // a scroll write forces layout: do it with the frame's own
    // restart the line's entrance without a forced layout: two identical keyframes, alternated
    sayFlip = !sayFlip; b.classList.toggle('say', sayFlip); b.classList.toggle('say2', !sayFlip)
    b.classList.toggle('full', !!full)
    b.classList.toggle('alert', !!alert)
    var pose = MA.lib(alert ? 'mojo-char/bo-think' : 'mojo-char/bo'), bi = $('bo-img')
    if (bi && bi.getAttribute('src') !== pose) bi.src = pose
    if (!quiet) say(boLine)
  }

  /* ── palette + program strip ────────────────────────────────────────── */
  function updatePaletteScroll () {
    var p = $('palette'); p.parentNode.classList.toggle('scrollable',p.scrollHeight > p.clientHeight + 4)
  }
  function renderPalette () {
    var p = $('palette'), b = beat(), cmds = b.palette || PG.palette(b), moves = [], verbs = [], swops = []
    var plannedForm = G.cp.m.form
    G.prog.slice(0,G.sel >= 0 ? G.sel : G.prog.length).forEach(function (c) { if (c.indexOf('swop:') === 0) plannedForm = c.slice(5) })
    cmds = cmds.filter(function (c) { return c.indexOf('swop:') === 0 || PG.can(plannedForm,c) || G.prog.indexOf(c) >= 0 })
    cmds.forEach(function (c) { if (c.indexOf('swop:') === 0) swops.push(c); else if (PG.BASE.indexOf(c) >= 0) moves.push(c); else verbs.push(c) })
    p.innerHTML = ''
    function add (c, host) {
      var btn = el('button', 'cmd' + (c.indexOf('swop:') === 0 ? ' swop' : ''))
      btn.type = 'button'; btn.setAttribute('data-cmd', c); btn.setAttribute('aria-label', cmdLabel(c))
      if (c.indexOf('swop:') === 0) btn.style.setProperty('--fc', cmdColor(c)); else btn.style.background = 'linear-gradient(180deg,' + cmdColor(c) + ',' + shade(cmdColor(c)) + ')'
      btn.innerHTML = cmdIco(c) + '<span>' + cmdLabel(c) + '</span>'
      ;(host || p).appendChild(btn)
      bindPaletteBtn(btn, c)
    }
    // board-absolute arrows sit as a d-pad: up on top, left / down / right below (screen directions)
    var abs = moves.filter(function (c) { return PG.ABS.indexOf(c) >= 0 })
    if (abs.length) { var pad = el('div', 'dpad n' + abs.length); p.appendChild(pad); abs.forEach(function (c) { add(c, pad) }) }
    moves.filter(function (c) { return PG.ABS.indexOf(c) < 0 }).forEach(function (c) { add(c) })
    verbs.forEach(function (c) { add(c) })
    if (swops.length) { p.appendChild(el('div', 'pal-h', 'Swop — ganti bagian atas')); swops.forEach(function (c) { add(c) }) }
    W.requestAnimationFrame(updatePaletteScroll)   // read once the frame's own layout is due, never forced mid-task
  }
  function shade (hex) {
    var n = parseInt(hex.slice(1), 16), r = (n >> 16) * 0.72, g = ((n >> 8) & 255) * 0.72, b = (n & 255) * 0.72
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')'
  }
  /* M2: a plan chip shows the whole word. A Swop chip says only the form ("Pemadam"): its form picture and the
     Swop frame already say it is a change of form; the full "Jadi Pemadam" stays in its aria-label. */
  function chipLabel (c) { return c.indexOf('swop:') === 0 ? SHORT[c.slice(5)] || formName(c.slice(5)) : cmdLabel(c) }
  // rough set width of a label in "average letters" (m/w wide, i/l/t/r/j narrow): a wide word gets the compact size
  function labelWidth (t) { var w = 0; for (var k = 0; k < t.length; k++) w += /[mwMW]/.test(t[k]) ? 1.5 : /[iljtrf]/.test(t[k]) ? 0.6 : 1; return w }
  function chipHtml (c) { var t = chipLabel(c); return '<div class="chip' + (c.indexOf('swop:') === 0 ? ' swop' : '') + '" style="background:' + (c.indexOf('swop:') === 0 ? 'linear-gradient(180deg,' + cmdColor(c) + ',' + shade(cmdColor(c)) + ')' : cmdColor(c)) + '">' + cmdIco(c) + '<span' + (labelWidth(t) > 7.2 ? ' class="long"' : '') + '>' + t + '</span></div>' }
  function renderStrip () {
    var oldActions = D.querySelector('.p-strip > .slot-act'); if (oldActions) oldActions.remove()
    var editing = G.sel >= 0 && !!G.prog[G.sel]
    D.querySelector('.p-strip').classList.toggle('editing',editing)
    $('scr-play').classList.toggle('editing',editing)
    var b = beat(), box = $('slots'); box.innerHTML = ''
    for (var i = 0; i < b.slots; i++) {
      var c = G.prog[i], s = el('div', 'slot' + (i === G.prog.length ? ' next' : '') + (i === G.sel ? ' sel' : ''))
      s.setAttribute('data-slot', i)
      s.innerHTML = '<span class="no">' + (i + 1) + '</span>' + (c ? chipHtml(c) : '')
      if (c) s.setAttribute('aria-label', (i + 1) + ': ' + cmdLabel(c))
      box.appendChild(s)
      bindSlot(s, i)
    }
    if (G.sel >= 0 && G.prog[G.sel]) {
      var host = box.children[G.sel], a = el('div', 'slot-act')
      a.innerHTML = '<div class="edit-label"><b id="edit-step">Ubah langkah ' + (G.sel + 1) + ': ' + cmdLabel(G.prog[G.sel]) + '</b><span>Pilih perintah untuk mengganti.</span></div><div class="edit-tools"><button type="button" data-act="l" aria-label="Geser kiri"' + (G.sel === 0 ? ' disabled' : '') + '><i class="ico">' + MA.icon('left2') + '</i><span>Kiri</span></button>' +
        '<button type="button" class="del" data-act="x" aria-label="Hapus perintah"><i class="ico">' + MA.icon('close') + '</i><span>Hapus</span></button>' +
        '<button type="button" data-act="r" aria-label="Geser kanan"' + (G.sel === G.prog.length - 1 ? ' disabled' : '') + '><i class="ico">' + MA.icon('right2') + '</i><span>Kanan</span></button><button type="button" data-act="add" class="edit-add">Tambah langkah</button></div>'
      D.querySelector('.p-strip').appendChild(a)
      ;[].forEach.call(a.querySelectorAll('button'), function (bt) {
        bt.addEventListener('pointerdown', function (e) { e.stopPropagation() })
        bt.addEventListener('click', function (e) {
          e.stopPropagation(); var k = bt.getAttribute('data-act'), i2 = G.sel
          if (k === 'add') { G.sel = -1; renderStrip(); renderPalette(); return }
          if (k === 'x') edit(function (p) { p.splice(i2, 1); return p }, -1)
          if (k === 'l' && i2 > 0) edit(function (p) { var t = p[i2]; p[i2] = p[i2 - 1]; p[i2 - 1] = t; return p }, i2 - 1)
          if (k === 'r' && i2 < G.prog.length - 1) edit(function (p) { var t = p[i2]; p[i2] = p[i2 + 1]; p[i2 + 1] = t; return p }, i2 + 1)
        })
      })
      later(function () { if (host.isConnected) host.scrollIntoView({block:'nearest',inline:'nearest'}) },0)
    }
    $('btn-undo').disabled = !G.hist.length
    $('btn-clear').disabled = !G.prog.length
  }
  // every edit is a new program array (the old one goes to the undo stack)
  function edit (fn, sel) {
    if (G.run) return
    resetView()
    G.hist.push(G.prog.slice()); if (G.hist.length > 40) G.hist.shift()
    G.prog = fn(G.prog.slice()).filter(function (c) { return !!c }).slice(0, beat().slots)
    G.sel = sel == null ? -1 : sel
    clearFail()
    renderPalette(); renderStrip()
  }
  function addCmd (c, at) {
    if (G.run) return
    var b = beat()
    if (G.sel >= 0 && G.prog[G.sel] && at == null) { var i = G.sel; edit(function (p) { p[i] = c; return p }, -1); SND.place(); return }
    if (G.prog.length >= b.slots) { boSay('Kotak rencana sudah penuh. Hapus satu dulu, ya?', false, true); SND.think(); return }
    edit(function (p) { if (at == null || at >= p.length) p.push(c); else p.splice(at, 0, c); return p }, -1)
    SND.place()
    if (S.set.narr) say(cmdLabel(c))
  }
  function clearFail () {
    G.fail = null
    clearMarks()
  }
  function clearMarks () {
    ;[].forEach.call(D.querySelectorAll('.cell-mark'), function (d) { d.remove() })
    ;[].forEach.call(D.querySelectorAll('.ob.focus'), function (d) { d.classList.remove('focus') })
    ;[].forEach.call(D.querySelectorAll('.need'), function (d) { d.remove() })
    ;[].forEach.call(D.querySelectorAll('.cmd.cand'), function (d) { d.classList.remove('cand') })
  }
  // after a stopped run the world stays where it stopped (the child sees why); the first edit resets it
  function resetView () {
    if (!G.dirty) return
    G.dirty = false; G.w = G.cp
    boSay(beat().bo, true)   // the stop is fixed: Bo's line is this beat's objective again, never the stale clue
    var mj = $('mojo')
    anim(mj, [{ opacity: 1 }, { opacity: 0 }], 120, EOUT, function () {
      renderWorld(G.w, true)
      anim(mj, [{ opacity: 0 }, { opacity: 1 }], 180, EOUT, function () { mj.style.opacity = '' })
    })
    ;[].forEach.call(D.querySelectorAll('.slot'), function (s) { s.classList.remove('done', 'active', 'fail') })
  }

  /* Mouse drag starts after 10 px. Touch pans naturally; tap a slot for explicit reorder/delete controls. */
  var drag = null
  /* a ripple from the press point. The palette re-renders on every added command, so the ripple lives in its own
     fixed layer over the button (it outlives the button node) and removes itself */
  function ripple (btn, e) {
    if (RM || !btn.getBoundingClientRect) return
    var r = btn.getBoundingClientRect(), w = el('i', 'cmd-rip'), dot = el('i')
    w.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px'
    var d = Math.max(r.width, r.height) * 2.2, x = (e && e.clientX ? e.clientX - r.left : r.width / 2), y = (e && e.clientY ? e.clientY - r.top : r.height / 2)
    dot.style.cssText = 'left:' + (x - d / 2) + 'px;top:' + (y - d / 2) + 'px;width:' + d + 'px;height:' + d + 'px'
    w.appendChild(dot); D.body.appendChild(w)
    try { dot.animate([{ transform: 'scale(.08)', opacity: 0.85 }, { transform: 'scale(1)', opacity: 0 }], { duration: 420, easing: EOUT, fill: 'forwards' }) } catch (x2) {}
    W.setTimeout(function () { w.remove() }, 460)
  }
  function bindPaletteBtn (btn, c) {
    btn.addEventListener('pointerdown', function (e) { if (!G.run) ripple(btn, e) })
    btn.addEventListener('pointerdown', function (e) { if (G.run || e.pointerType !== 'mouse') return; drag = { cmd: c, from: -1, x: e.clientX, y: e.clientY, on: false, src: btn } })
    btn.addEventListener('click', function () { if (btn.__dragged) { btn.__dragged = false; return } addCmd(c) })
  }
  function bindSlot (s, i) {
    s.addEventListener('pointerdown', function (e) { if (G.run || e.pointerType !== 'mouse' || !G.prog[i]) return; drag = { cmd: G.prog[i], from: i, x: e.clientX, y: e.clientY, on: false, src: s } })
    s.addEventListener('click', function () {
      if (s.__dragged) { s.__dragged = false; return }
      if (G.run) return
      if (s.classList.contains('ghost')) { useGhost(); return }
      if (!G.prog[i]) { G.sel = -1; renderStrip(); renderPalette(); return }
      resetView()
      G.sel = G.sel === i ? -1 : i; renderStrip(); renderPalette(); SND.place()
    })
  }
  function slotAt (x, y) {
    var s = D.elementFromPoint(x, y); while (s && !(s.classList && s.classList.contains('slot'))) s = s.parentNode
    return s ? +s.getAttribute('data-slot') : -1
  }
  D.addEventListener('pointermove', function (e) {
    if (!drag) return
    if (!drag.on && Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 10) {
      drag.on = true; var g = $('drag-ghost'); g.innerHTML = cmdIco(drag.cmd); g.style.background = cmdColor(drag.cmd); g.classList.add('on')
    }
    if (!drag.on) return
    var g2 = $('drag-ghost'); g2.style.transform = 'translate(' + (e.clientX - 35) + 'px,' + (e.clientY - 35) + 'px) scale(1.05)'
    var at = slotAt(e.clientX, e.clientY)
    ;[].forEach.call(D.querySelectorAll('.slot'), function (s) { s.classList.toggle('drop-at', +s.getAttribute('data-slot') === at) })
  })
  function endDrag (e) {
    if (!drag) return
    var d = drag; drag = null
    $('drag-ghost').classList.remove('on')
    ;[].forEach.call(D.querySelectorAll('.slot.drop-at'), function (s) { s.classList.remove('drop-at') })
    if (!d.on) return
    d.src.__dragged = true
    var at = e && e.type !== 'pointercancel' ? slotAt(e.clientX, e.clientY) : -1
    if (at < 0) return
    if (d.from < 0) { addCmd(d.cmd, Math.min(at, G.prog.length)); return }
    if (at === d.from) return
    edit(function (p) { var c = p.splice(d.from, 1)[0]; p.splice(Math.min(at, p.length), 0, c); return p }, -1)
    SND.place()
  }
  D.addEventListener('pointerup', endDrag); D.addEventListener('pointercancel', endDrag)

  /* ── RUN ────────────────────────────────────────────────────────────── */
  var T = { move: 430, turn: 260, act: 560, gap: 170 }
  var STOP_GUARD = 350   // a double tap on JALAN must not start the run and stop it again
  function run (demo) {
    if (G.run) { if (performance.now() - G.run.at < STOP_GUARD) return; stopRun(); return }
    if (G.trans) return
    if (!G.prog.length) { boSay('Isi rencana dulu. Ketuk perintah, lalu tekan JALAN!', false, true); SND.think(); return }
    closeOv('ov-card')
    G.sel = -1; clearFail(); hideGhost()
    G.w = G.cp; renderWorld(G.w, true); G.dirty = true
    renderStrip()
    ;[].forEach.call(D.querySelectorAll('.slot'), function (s) { s.classList.remove('done', 'active', 'fail') })
    G.runId++
    G.run = { cur: PG.cursor(G.prog), t: 0, n: 0, stars: {}, demo: demo === true, at: performance.now() }
    $('run-t').textContent = 'Berhenti'; $('btn-run').classList.add('stop')
    D.querySelector('.p-strip').classList.add('locked')
    $('btn-undo').disabled = true; $('btn-clear').disabled = true; $('btn-hint').disabled = true; helpUi()
    boSay(demo === true ? 'Lihat caranya bersama Bo, langkah demi langkah.' : 'Ayo, Mojo!', true)
    SND.run()
    G.run.t = later(runStep, 280)
  }
  function endRunUi () {
    if (G.run) clearTimeout(G.run.t)
    G.run = null
    $('run-t').textContent = 'Jalan!'; $('btn-run').classList.remove('stop')
    D.querySelector('.p-strip').classList.remove('locked')
    $('btn-hint').disabled = false
    $('bo-details').disabled = false
    renderStripKeep()
    helpUi()
  }
  function renderStripKeep () {
    var marks = [].map.call(D.querySelectorAll('.slot'), function (s) { return s.className })
    renderStrip()
    ;[].forEach.call(D.querySelectorAll('.slot'), function (s, i) { if (/\bdone\b/.test(marks[i] || '')) s.classList.add('done'); if (/\bfail\b/.test(marks[i] || '')) s.classList.add('fail') })
  }
  function stopRun () { var r = G.run; if (!r) return; endRunUi(); cancelPlayback(); G.dirty = false; G.w = G.cp; renderWorld(G.w,true); boSay('Berhenti. Ubah rencananya, lalu jalan lagi!', true) }
  function slotEl (i) { return D.querySelector('.slot[data-slot="' + i + '"]') }
  function runStep () {
    var R = G.run; if (!R) return
    var x = R.cur.next(G.w)
    if (!x) return runEnded()
    var i = x.path[0]
    ;[].forEach.call(D.querySelectorAll('.slot.active'), function (s) { s.classList.remove('active') })
    var se = slotEl(i); if (se) { se.classList.add('active'); if (se.scrollIntoView) se.scrollIntoView({block:'nearest',inline:'center'}) }
    var res = PG.stepBeat(G.w, x.cmd, beat(), R.demo ? { auto: true } : {})   // the demo never asks the child
    if (res.status === 'waiting-for-microgame') {
      var mg = res.info.mg
      if (S.mg[mg.id + ':' + (mg.kind === 'letters' ? S.set.lang : '')]) {
        toast(mg.kind === 'letters' ? 'Palu sudah siap!' : 'Tingginya sudah tahu: ' + mg.target)
        res = PG.stepBeat(G.w, x.cmd, beat(), { auto: true })
      } else {
        return microgame(mg, function (val) {
          if (G.run !== R) return
          S.mg[mg.id + ':' + (mg.kind === 'letters' ? S.set.lang : '')] = 1; save()
          apply(i, x.cmd, PG.stepBeat(G.w, x.cmd, beat(), { mg: val }))
        })
      }
    }
    apply(i, x.cmd, res)
  }
  function apply (i, cmd, res) {
    var R = G.run; if (!R) return
    if (!PG.ok(res.status)) return failAt(i, cmd, res)
    var prev = G.w; G.w = res.world; R.n++
    if (R.demo) boSay('Langkah ' + R.n + ': ' + stepLine(cmd, res, prev), false)
    play(prev, res, cmd, function () {
      if (G.run !== R) return
      if (R.demo) G.shown = true   // L4: the demo caps the mission at one star only once it has shown a whole step
      var se = slotEl(i); if (se) { se.classList.remove('active'); se.classList.add('done') }
      renderHud()
      if (res.completed && res.completed.length) { SND.goal(); burst(G.w.m.r, G.w.m.c, '#7CF0A0'); if (res.completed.some(function (k) { var ob = (beat().objectives || [])[k]; return ob && ob['do'] === 'reach' })) fxCall('goal', G.w.m.r, G.w.m.c) }
      function next () { if (G.run !== R) return; if (res.beatDone) return R.demo ? demoDone() : beatComplete(); R.t = later(runStep, R.demo ? 1100 : T.gap) }
      if (R.demo) return next()
      var trigger = (res.events || []).some(function (e) { return ['collect','star','tool','repair','rescue'].indexOf(e.e) >= 0 })
      if (trigger && eventQuestion(next, res.events)) return
      next()
    })
  }
  function runEnded () {
    endRunUi()
    var b = beat(), miss = (b.objectives || []).filter(function (o) { return !PG.met(G.w, o) })[0]
    var t = miss ? obInfo(miss).t.toLowerCase() : ''
    SND.think()
    boSay('Semua perintah sudah jalan, tapi ' + (t || 'tugasnya') + ' belum selesai. Tambah perintah lagi?', false, true)
    G.fails++; helpUi()
    G.fail = { index: G.prog.length, reason: 'ended', obj: miss && miss.id }; eventQuestion(function () {}, [{ e: 'ended' }])
  }
  /* "Tunjukkan Caranya" (owner 2026-10-03, G31 only): the solver's plan for this beat from where Mojo stands now
     fills the strip and plays with Bo naming every step; then the world resets and the child presses JALAN.
     A mission finished after a demo earns one star (said gently on the result card). */
  function stepLine (cmd, res, prev) {
    var v = PG.verbOf(cmd), id = null
    ;(res.events || []).forEach(function (e) { if (!id && e.id && e.e !== 'turn') id = e.id })
    var o = id ? PG.find(prev, id) : null
    if (v === 'swop') return 'Jadi ' + SHORT[cmd.slice(5)] + '.'
    if (DIRW[cmd]) return 'Jalan ke ' + DIRW[cmd] + '.' + (o ? ' LEWATI ' + low(o) + '.' : '')
    if (v === 'raise') return 'NAIK ke ' + res.world.m.lift + '.'
    return up(v) + (o ? ' ' + low(o) : '') + '.'
  }
  function showMe () {
    if (!G || G.run || G.trans) return
    var sol = PG.solve(G.cp, beat())
    if (!sol) { boSay('Hmm, Bo juga perlu berpikir. Hapus rencananya, lalu coba lagi.', false, true); return }
    closeOv('ov-card'); hideGhost()
    G.hist.push(G.prog.slice()); if (G.hist.length > 40) G.hist.shift()
    G.prog = sol.slice(0, beat().slots); G.sel = -1   // G.shown is set when the demo has played its first step (apply)
    clearFail(); renderPalette(); renderStrip()
    SND.place()
    run(true)
  }
  function demoDone () {
    endRunUi()
    G.demoed = true
    later(function () {
      if (G.run) return
      G.dirty = false; G.w = G.cp; renderWorld(G.w, true); renderHud()
      ;[].forEach.call(D.querySelectorAll('.slot'), function (s) { s.classList.remove('done', 'active', 'fail') })
      boSay('Begitu caranya! Sekarang giliranmu: tekan JALAN!', false)
    }, 900)
  }

  /* ── debug mode (PRD §9): pause, highlight command + object, one Bo clue, sequence intact ── */
  function objAt (r, c, type) { var a = PG.objsAt(G.w, r, c); for (var k = 0; k < a.length; k++) if (!type || a[k].type === type) return a[k]; return null }
  /* ONE message per engine reason (tools/qa-prog-grid.mjs section L proves every ProgGrid.REASONS key is here).
     Every line names the next move or the form that helps; nothing falls back to a generic sentence. */
  var OBJ_VERB = { rock: 'push', log: 'push', fire: 'spray', person: 'rescue', repair: 'repair', crate: 'pick' }
  var WHAT = { gate: 'Gerbang', swing: 'Ayunan', lamp: 'Lampu' }
  var TOOL = { palu: 'palu' }
  function up (v) { return (LABEL[v] || v).toUpperCase() }
  function nameOf (o) {
    if (!o) return 'Itu'
    if (o.type === 'person') return o.name || 'Teman'
    if (o.type === 'repair') return WHAT[o.what] || 'Yang rusak'
    return { fire: 'Api', rock: 'Batu', log: 'Kayu', crate: 'Peti', toolbox: 'Kotak alat', flag: 'Bendera' }[o.type] || 'Itu'
  }
  // "Swop jadi Pemadam, lalu SEMPROT dari sebelahnya." / "Berhenti di sebelahnya, lalu SEMPROT."
  function actLine (verb) {
    if (G && !PG.can(G.w.m.form, verb)) {
      var fs = PG.formsWith(verb, beat().forms)
      if (fs.length) return 'Swop jadi ' + SHORT[fs[0]] + ', lalu ' + up(verb) + ' dari sebelahnya.'
    }
    return 'Berhenti di sebelahnya, lalu ' + up(verb) + '.'
  }
  function findO (id) { return id ? PG.find(G.w, id) : null }
  var MSG = {
    'empty': 'Kotak itu kosong. Pilih perintah dulu, ya.',
    'form': function (inf, v) { var fs = inf.forms || []; return (SHORT[inf.form] || formName(inf.form)) + ' belum bisa ' + (DOES[v] || v) + '. ' + (fs.length ? 'Swop jadi ' + SHORT[fs[0]] + ' dulu.' : 'Pilih wujud yang sesuai.') },
    'unknown-form': 'Wujud itu belum ada. Pilih Swop yang lain, ya.',
    'not-allowed': 'Swop itu belum ada di misi ini. Pilih yang lain, ya.',
    'unknown-verb': 'Perintah itu belum dikenal Mojo. Pilih perintah dari daftar, ya.',
    'edge': 'Ups, itu ujung papan. Coba panah yang lain?',
    'grass': function (inf) { return inf.land ? 'Mojo tidak boleh mendarat di rumput taman. Mojo jalan di jalan raya saja.' : 'Itu rumput taman. Mojo jalan di jalan raya saja.' },
    'terrain': function (inf) { return inf.terrain === 'o' ? 'Ada lubang di sana. Isi dengan batu, atau LOMPAT dari sebelahnya.' : 'Ada ' + (inf.name || 'tembok') + ' di sana. Mojo tidak bisa lewat. Cari jalan lain?' },
    'object': function (inf) {
      var o = findO(inf.id) || { type: inf.type }, v = OBJ_VERB[o.type]
      var head = o.type === 'fire' ? 'Ada api di depan! ' : o.type === 'rock' ? 'Batu besar menghalangi! ' : o.type === 'person' ? nameOf(o) + ' ada di sana. ' : o.type === 'repair' ? nameOf(o) + ' masih rusak. ' : nameOf(o) + ' menghalangi. '
      return head + (v ? actLine(v) : 'Cari jalan lain?')
    },
    'lift-up': 'Keranjang masih di atas. TURUN dulu, baru jalan.',
    'in-air': 'Mojo masih terbang. MENDARAT dulu, baru Swop.',
    'carrying': 'Taruh barangnya dulu, baru Swop.',
    'no-target': function (inf, v) {
      return { spray: 'Tidak ada api di sebelah Mojo. Berhenti di SEBELAH api, lalu SEMPROT.', push: 'Tidak ada batu di sebelah Mojo. Berhenti di SEBELAH batu, lalu DORONG.',
        raise: 'Tidak ada yang tinggi di sebelah Mojo. Berhenti di SEBELAH pohon, balkon atau lampu, lalu NAIK.', rescue: 'Tidak ada teman di sebelah Mojo. Berhenti di SEBELAH temannya, lalu TOLONG.',
        repair: 'Tidak ada yang rusak di sebelah Mojo. Berhenti di SEBELAH yang rusak, lalu PERBAIKI.', pick: 'Tidak ada peti di sebelah Mojo. Berhenti di SEBELAH peti, lalu AMBIL.',
        hook: 'Tidak ada peti di sebelah Mojo. Berhenti di SEBELAH peti, lalu KAIT.', jump: 'Tidak ada batu atau lubang di sebelah Mojo. LOMPAT hanya melewati satu rintangan.' }[v] || 'Di sebelah Mojo belum ada yang bisa dibantu. Jalan dulu ke SEBELAH-nya.'
    },
    'ambiguous': function (inf, v) { return 'Ada dua yang bisa di-' + (LABEL[v] || v).toLowerCase() + ' di sebelah Mojo. Pindah ke tempat yang hanya di sebelah satu, ya.' },
    'push-edge': 'Batunya tidak bisa keluar papan. Dorong dari sisi lain?',
    'push-wall': function (inf) { return inf.terrain === ',' ? 'Batu tidak boleh masuk rumput taman. Dorong dari sisi lain?' : 'Ada tembok di belakang batu. Dorong dari sisi lain?' },
    'push-object': 'Ada benda di belakang batu. Dorong dari sisi lain?',
    'too-tall': 'Itu terlalu tinggi untuk dilompati. Cari jalan lain?',
    'jump-fire': 'Api tidak bisa dilompati. Padamkan dulu: SEMPROT dari sebelahnya!',
    'jump-person': function (inf) { return nameOf(findO(inf.id)) + ' tidak boleh dilompati. TOLONG dari sebelahnya!' },
    'jump-repair': function (inf) { return nameOf(findO(inf.id)) + ' tidak bisa dilompati. PERBAIKI dari sebelahnya!' },
    'land': 'Mojo tidak bisa mendarat di sana. Lompat ke arah lain?',
    'no-water': function (inf) { return 'Tangki air kosong! Api masih perlu ' + (inf.need || 1) + ' air. LEWATI tetes air biru dulu.' },
    'height': function (inf) { return 'Belum pas. Tingginya ' + inf.want + '. Coba lagi!' },
    'not-raised': 'Keranjang sudah di bawah. TURUN dipakai setelah NAIK.',
    'too-high': function (inf, v) {
      var o = findO(inf.id)
      if (inf.fly) return nameOf(o) + ' ada di atas. TERBANG dulu, lalu TOLONG.'
      return nameOf(o) + ' ada di atas, tinggi ' + inf.elev + '. NAIK ke ' + inf.elev + ' dulu, lalu ' + up(v) + '.'
    },
    'need-form': function (inf) { var fs = inf.forms || []; return nameOf(findO(inf.id)) + ' ada di atas, tinggi ' + inf.elev + '. ' + (fs.length ? 'Swop jadi ' + SHORT[fs[0]] + ', lalu NAIK ke ' + inf.elev + '.' : 'Mojo perlu wujud yang bisa naik.') },
    'hands-full': 'Mojo sudah membawa barang. TARUH dulu, ya.',
    'too-heavy': 'Petinya terlalu berat. Swop jadi Derek, lalu KAIT.',
    'microgame': 'Kotak alat belum terbuka. Susun hurufnya untuk mendapat alat!',
    'hands-empty': 'Mojo belum membawa apa-apa. AMBIL peti dulu.',
    'drop-here': 'Tidak bisa menaruh di sana. Cari tempat kosong di depan Mojo.',
    'on-ground': 'Mojo masih di darat. TERBANG dulu, baru MENDARAT.',
    'no-landing': 'Tidak bisa mendarat di sana. Terbang ke jalan dulu.',
    'need-tool': function (inf) { return 'Kita perlu ' + (TOOL[inf.tool] || inf.tool || 'alat') + ' dulu. LEWATI kotak alat untuk mengambilnya!' },
    'need-bolts': function (inf) { return 'Perlu ' + inf.need + ' baut, baru ada ' + inf.have + '. LEWATI baut untuk menambah. Kurang berapa lagi?' },
    'need-water': function (inf) { return 'Perlu ' + inf.need + ' air, baru ada ' + inf.have + '. LEWATI tetes air biru.' },
    'cap-full': function (inf) { return inf.res === 'water' ? 'Tangki air sudah penuh! Tetes airnya tetap di sana.' : 'Kotak baut sudah penuh! Bautnya tetap di sana.' }
  }
  function clue (res, cmd) {
    var m = MSG[res.reason]
    if (m == null) { console.warn('[Mojo] no message for reason', res.reason); return String(res.reason) }
    return typeof m === 'function' ? m(res.info || {}, PG.verbOf(cmd), res) : m
  }
  function failAt (i, cmd, res) {
    endRunUi()
    SND.think()
    var se = slotEl(i); if (se) { se.classList.remove('active'); se.classList.add('fail') }
    var inf = res.info || {}, a = PG.ahead(G.w), target = inf.id ? PG.find(G.w, inf.id) : objAt(a[0], a[1])
    if (inf.turn != null && !target) { var t2 = [G.w.m.r + PG.DIRS[inf.turn][0], G.w.m.c + PG.DIRS[inf.turn][1]]; target = objAt(t2[0], t2[1]) }
    G.fail = { index: i, reason: res.reason, status: res.status, verb: PG.verbOf(cmd), forms: inf.forms || null, obj: target && target.id }
    if (target && OBJ[target.id]) OBJ[target.id].classList.add('focus')
    bump(cmd, res)
    boSay(clue(res, cmd), false, true)
    G.fails++; helpUi()
    eventQuestion(function () {}, [{ e: 'bump', reason: res.reason }])
  }
  function bump (cmd, res) {
    var m = G.w.m, inf = res.info || {}, h = inf.turn != null ? inf.turn : m.h, d = PG.DIRS[h], mj = $('mojo'), base = tf(m.r, m.c)
    if (inf.turn != null) turnAnim(inf.turn)   // Mojo still turns to the one target, then shows why it cannot act
    if (res.status === 'invalid-capability') {
      popIcon(PG.verbOf(cmd) === 'swop' ? 'swop' : PG.verbOf(cmd), m.r, m.c, true)
      return
    }
    anim(mj, [{ transform: base }, { transform: 'translate(' + ((m.c + d[1] * 0.18) * CELL) + 'px,' + ((m.r + d[0] * 0.18) * CELL) + 'px)' }, { transform: base }], 300, EIO, function () { mj.style.transform = base })
    later(function () { fxCall('bump', m.r, m.c, h) }, 140)
  }

  /* ── playback of one command's events ──────────────────────────────── */
  function play (prev, res, cmd, done) {
    var ev = res.events || [], wait = 60, m = G.w.m, swop = null
    if (ev[0] && ev[0].e === 'turn' && ev[0].auto) {
      // SEBELAH: Mojo visibly turns to the one target first (150 ms), then acts
      turnAnim(ev[0].h); SND.turn()
      var rest = Object.assign({}, res, { events: ev.slice(1) })
      later(function () { play(prev, rest, cmd, done) }, 170)
      return
    }
    ev.forEach(function (e) { if (e.e === 'swop') swop = e })
    if (swop) return swopAnim(swop, function () { renderHud(); done() })
    var pushed = ev.some(function (e) { return e.e === 'push' })
    ev.forEach(function (e) {
      switch (e.e) {
        case 'move': moveMojo(e.from, e.to, T.move); SND.move(); wait = Math.max(wait, T.move); if (!pushed) fxCall('move', e.from, e.to); break
        case 'turn': turnMojo(e.h, prev.m.h); SND.turn(); wait = Math.max(wait, T.turn); break
        case 'push': var pf = PG.find(prev, e.id); pushObj(e.id, e.to); SND.push(); wait = Math.max(wait, T.move); if (pf) fxCall('push', [pf.r, pf.c], e.to, T.move); break
        case 'fill': later(function () { paint(G.w); renderObj(PG.find(G.w, e.id)); fxCall('fill', e.at[0], e.at[1]); SND.push() }, T.move); wait = Math.max(wait, T.move + 260); break
        case 'jump': jumpMojo(e.from, e.to); SND.boing(); fxCall('jump', e.from, e.to, 540); wait = Math.max(wait, 620); break
        case 'collect': collect(e, T.move); break
        case 'star': G.run.stars[e.id] = true; later(function () { pickupAt(e.id); flyTo(MA.src('obj/star'), e.id, 'g-star'); SND.star() }, T.move * 0.8); break
        case 'full': later(function () { toast(MSG['cap-full'](e)) }, T.move); break
        case 'spray': spray(e); wait = Math.max(wait, 900); break
        case 'raise': wait = Math.max(wait, raiseAnim(e, prev.m.lift || 0) + 120); break
        case 'lower': wait = Math.max(wait, lowerAnim(prev.m.lift || 0) + 120); break
        case 'rescue': rescueAnim(e); wait = Math.max(wait, 900); break
        case 'tool': toolAnim(e); wait = Math.max(wait, 760); break
        case 'repair': wait = Math.max(wait, repairAnim(e)); break
        case 'pick': case 'drop': renderObj(PG.find(G.w, e.id)); if (e.e === 'drop') OBJ[e.id].style.transform = tf(e.at[0], e.at[1]); wait = Math.max(wait, 300); break
        case 'takeoff': case 'land': placeMojo(m); tone(e.e === 'takeoff' ? 200 : 500, e.e === 'takeoff' ? 500 : 200, 0.4, 0.06); wait = Math.max(wait, 420); break
      }
    })
    later(function () { G.w.objs.forEach(renderObj); done() }, wait + 40)
  }
  function moveMojo (from, to, ms) {
    var mj = $('mojo'), a = tf(from[0], from[1]), b = tf(to[0], to[1])
    anim(mj, [{ transform: a }, { transform: b }], ms, EIO, function () { mj.style.transform = b })
    if (!RM) anim($('mojo-ch'), [{ transform: 'translateY(0)' }, { transform: 'translateY(-3%)', offset: 0.3 }, { transform: 'translateY(0)', offset: 0.6 }, { transform: 'translateY(-2%)', offset: 0.8 }, { transform: 'translateY(0)' }], ms, 'linear', function () { $('mojo-ch').style.transform = '' })   // wheels over the road
    placeMojoFlags()
  }
  /* board VFX (games/mojo-fx.js): every call is optional and never changes the world */
  function fxCall (name) { if (!W.MojoFX || !MojoFX[name]) return 0; try { return MojoFX[name].apply(null, [].slice.call(arguments, 1)) || 0 } catch (x) { console.warn('[Mojo] effect failed', name, x); return 0 } }
  function squash (sx, sy, ms) { var rot = $('mojo-rot'); if (RM) return; anim(rot, [{ transform: 'rotate(' + G.ang + 'deg) scale(1)' }, { transform: 'rotate(' + G.ang + 'deg) scale(' + sx + ',' + sy + ')', offset: 0.4 }, { transform: 'rotate(' + G.ang + 'deg) scale(1)' }], ms || 200, EOUT, function () { rot.style.transform = 'rotate(' + G.ang + 'deg)' }) }
  function pickupAt (id) { var o = PG.find(G.w, id) || PG.find(G.cp, id); if (o) fxCall('pickup', o.r, o.c); squash(1.06, 0.9, 220) }   // Mojo dips, the item pops up
  function placeMojoFlags () { var m = G.w.m, mj = $('mojo'); mj.classList.toggle('lifted', m.lift > 0); mj.classList.toggle('air', !!m.air); $('mojo-badge').textContent = m.lift > 0 ? m.lift : '' }
  function turnMojo (h, h0) {
    G.ang = h * 90
    faceMojo(h)
  }
  function turnAnim (h) {
    faceMojo(h)
    var rot = $('mojo-rot')
    anim(rot, [{ transform: 'scale(1)' }, { transform: 'scale(.84,1.1)', offset: 0.45 }, { transform: 'scale(1)' }], 150, EOUT, function () { rot.style.transform = 'none' })
  }
  function pushObj (id, to) {
    var d = OBJ[id], o = PG.find(G.w, id); if (!d) return
    var from = d.style.transform, b = tf(to[0], to[1])
    anim(d, [{ transform: from }, { transform: b }], T.move, EIO, function () { d.style.transform = b; renderObj(o) })
  }
  function jumpMojo (from, to) {
    var mj = $('mojo'), mr = (from[0] + to[0]) / 2, mc = (from[1] + to[1]) / 2
    anim(mj, [{ transform: tf(from[0], from[1]) }, { transform: tf(mr, mc, ' scale(1.35)') }, { transform: tf(to[0], to[1]) }], 540, EIO, function () { mj.style.transform = tf(to[0], to[1]); squash(1.16, 0.84, 220) })
  }
  function collect (e, delay) {
    var o = PG.find(G.w, e.id)
    later(function () {
      SND.collect(); pickupAt(e.id)
      flyTo(objImg(o), e.id, e.res === 'water' ? 'g-water' : 'g-bolts')
      renderObj(o)
    }, delay * 0.8)
  }
  function center (e) { var b = e.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2] }
  function flyTo (src, fromId, gaugeId) {
    var f = OBJ[fromId], g = $(gaugeId); if (!f) return
    var a = center(f), b = g ? center(g) : [a[0], 20], fl = el('div', 'fly', '<img alt="" src="' + src + '">')
    D.body.appendChild(fl)
    var top = Math.min(a[1], b[1]) - 60   // it rises off the road first, then arcs to its gauge
    anim(fl, [{ transform: 'translate(' + (a[0] - 22) + 'px,' + (a[1] - 22) + 'px) scale(.8)', opacity: 1 }, { transform: 'translate(' + (a[0] - 22 + (b[0] - a[0]) * 0.25) + 'px,' + (top - 22) + 'px) scale(1.25)', opacity: 1, offset: 0.35 },
      { transform: 'translate(' + (b[0] - 22) + 'px,' + (b[1] - 22) + 'px) scale(.7)', opacity: 0.9 }], 640, 'cubic-bezier(.45,0,.55,1)', function () {
      fl.remove(); if (g) { g.classList.remove('bump'); void g.offsetWidth; g.classList.add('bump') }
    })
  }
  /* the event question's bonus: a sparkle pops on the right answer and a bolt badge flies to the line that says so */
  function bonusFly (fromEl, toEl) {
    if (RM || !fromEl || !toEl) return
    var a = center(fromEl), b = center(toEl)
    var pop = el('div', 'fly', '<img alt="" src="' + MA.lib('mojo-fx/collect') + '">'); D.body.appendChild(pop)
    anim(pop, [{ transform: 'translate(' + (a[0] - 22) + 'px,' + (a[1] - 22) + 'px) scale(.4)', opacity: 0 }, { transform: 'translate(' + (a[0] - 22) + 'px,' + (a[1] - 22) + 'px) scale(1.6)', opacity: 1, offset: 0.4 }, { transform: 'translate(' + (a[0] - 22) + 'px,' + (a[1] - 22) + 'px) scale(2)', opacity: 0 }], 520, EOUT, function () { pop.remove() })
    var fl = el('div', 'fly', '<img alt="" src="' + MA.src('obj/bolt') + '">'); D.body.appendChild(fl)
    anim(fl, [{ transform: 'translate(' + (a[0] - 22) + 'px,' + (a[1] - 22) + 'px) scale(.6)', opacity: 0 }, { transform: 'translate(' + (a[0] - 22) + 'px,' + (a[1] - 70) + 'px) scale(1.3)', opacity: 1, offset: 0.35 },
      { transform: 'translate(' + (b[0] - 22) + 'px,' + (b[1] - 22) + 'px) scale(.8)', opacity: 1, offset: 0.9 }, { transform: 'translate(' + (b[0] - 22) + 'px,' + (b[1] - 22) + 'px) scale(.8)', opacity: 0 }], 820, 'cubic-bezier(.45,0,.55,1)', function () { fl.remove() })
  }
  function cellCenter (r, c) { return [(c + 0.5) * CELL, (r + 0.5) * CELL] }
  function spray (e) {
    SND.spray()
    var m = G.w.m, a = PG.ahead(G.w), p0 = cellCenter(m.r, m.c), p1 = cellCenter(a[0], a[1]), fx = $('fx'), fo = PG.find(G.w, e.id)
    if (fo) a = [fo.r, fo.c]
    if (W.MojoFX) { fxCall('spray', [m.r, m.c], a, e.left === 0); later(function () { var d = OBJ[e.id]; if (d && !RM) anim(d.querySelector('img.main'), [{ filter: 'brightness(1)' }, { filter: 'brightness(1.6) saturate(.4)' }, { filter: 'brightness(1)' }], 380, EOUT) }, 360) }
    else for (var k = 0; k < (RM ? 3 : 9); k++) (function (k) {
      var s = el('i', 'splash'); fx.appendChild(s)
      var jx = (k % 3 - 1) * CELL * 0.14, jy = ((k * 7) % 3 - 1) * CELL * 0.14
      anim(s, [{ transform: 'translate(' + p0[0] + 'px,' + p0[1] + 'px) scale(.6)', opacity: 0 }, { transform: 'translate(' + p0[0] + 'px,' + p0[1] + 'px) scale(.8)', opacity: 1, offset: 0.1 },
        { transform: 'translate(' + (p1[0] + jx) + 'px,' + (p1[1] + jy) + 'px) scale(1.2)', opacity: 0 }], 520 + k * 25, EOUT, function () { s.remove() })
    })(k)
    later(function () {
      renderObj(PG.find(G.w, e.id))
      if (e.left === 0) { SND.goal(); if (!W.MojoFX) burst(a[0], a[1], '#B3E5FC') } else toast('Api masih perlu ' + e.left + ' air. LEWATI tetes air biru, lalu SEMPROT lagi.')
    }, 620)
  }
  /* NAIK / TURUN: the ladder extends (or retracts) one step per level, the marker ticks and rattles each step,
     and the top grows a little with every level (it is closer to the camera); the badge number follows the steps */
  var LIFT_STEP = 240
  function liftSteps (from, to) {
    var m = G.w.m, mod = $('mojo-mod'), badge = $('mojo-badge'), n = Math.abs(to - from)
    if (!n) { placeMojoFlags(); return 0 }
    $('mojo').classList.add('lifted')
    var kf = []; for (var k = 0; k <= n; k++) { var v = from + (to > from ? k : -k); kf.push({ transform: 'scale(' + (1 + 0.04 * Math.min(v, 6)) + ')', offset: k / n }) }
    if (!RM) anim(mod, kf, n * LIFT_STEP, 'steps(' + n + ',end)', function () { mod.style.transform = '' })
    var ms = fxCall('lift', m.r, m.c, from, to, LIFT_STEP) || n * LIFT_STEP
    for (var i = 1; i <= n; i++) (function (i) {
      var v = from + (to > from ? i : -i)
      later(function () { badge.textContent = v > 0 ? v : ''; tone(to > from ? 360 + v * 40 : 520 - (from - v) * 40, to > from ? 420 + v * 40 : 460 - (from - v) * 40, 0.09, 0.05, 'square') }, (i - 1) * LIFT_STEP + LIFT_STEP * 0.5)
    })(i)
    later(placeMojoFlags, n * LIFT_STEP + 40)
    return ms
  }
  function raiseAnim (e, from) { return liftSteps(from, e.lift) }
  function lowerAnim (from) { return liftSteps(from, 0) }
  function rescueAnim (e) {
    var d = OBJ[e.id], m = G.w.m; if (!d) return
    var b = tf(m.r, m.c, ' scale(.5)')
    var o0 = PG.find(G.cp, e.id) || PG.find(G.w, e.id)
    if (o0) fxCall('rescue', o0.r, o0.c)
    // the friend hops: up, then into Mojo
    anim(d, [{ transform: d.style.transform, opacity: 1 }, { transform: d.style.transform + ' translateY(-22%) scale(1.08)', opacity: 1, offset: 0.35 }, { transform: b, opacity: 0 }], 760, EIO, function () { renderObj(PG.find(G.w, e.id)) })
    later(function () { burst(m.r, m.c, '#FF8FB1'); SND.goal(); squash(1.08, 0.9, 200) }, 680)
  }
  function toolAnim (e) {
    SND.clank()
    var o = PG.find(G.w, e.id)
    if (o) fxCall('tool', o.r, o.c, MA.src('tool/' + e.tool))   // the lid pops, the tool rises out
    later(function () { flyTo(MA.src('tool/' + e.tool), e.id, 'g-tool'); renderObj(o) }, 520)
  }
  function repairAnim (e) {
    var d = OBJ[e.id], o = PG.find(G.w, e.id); if (!d) return 820
    if (W.MojoFX) {   // three hammer hits with sparks, the object jolts on each, then it shines fixed
      var hitMs = 260, ms = fxCall('repair', o.r, o.c, hitMs, function (k) { SND.hammer(); if (!RM) anim(d, [{ transform: d.style.transform }, { transform: d.style.transform + ' translateY(4%) scale(1.04,.96)' }, { transform: d.style.transform }], 160, EOUT) }, MA.src('tool/palu'))
      later(function () { renderObj(o); burst(o.r, o.c, '#FFE14D') }, 3 * hitMs)
      return ms + 300
    }
    SND.hammer()
    var p = el('div', 'pop-ico', MA.icon('repair')); p.style.background = cmdColor('repair')
    var c = cellCenter(o.r, o.c); p.style.left = (c[0] - 26) + 'px'; p.style.top = (c[1] - CELL * 0.8) + 'px'
    $('fx').appendChild(p)
    anim(p, [{ transform: 'rotate(-30deg)', opacity: 0 }, { transform: 'rotate(20deg)', opacity: 1, offset: 0.3 }, { transform: 'rotate(-20deg)', opacity: 1, offset: 0.6 }, { transform: 'rotate(10deg)', opacity: 0 }], 760, EIO, function () { p.remove() })
    later(function () { renderObj(o); burst(o.r, o.c, '#FFE14D') }, 520)
    return 820
  }
  function popIcon (v, r, c, q) {
    var p = el('div', 'pop-ico', MA.icon(v)), cc = cellCenter(r, c)
    p.style.background = cmdColor(v); p.style.left = (cc[0] - 26) + 'px'; p.style.top = (cc[1] - CELL * 0.95) + 'px'
    $('fx').appendChild(p)
    anim(p, [{ transform: 'translateY(6px) scale(.9)', opacity: 0 }, { transform: 'translateY(0) scale(1)', opacity: 1, offset: 0.25 }, { transform: 'translateY(0) scale(1)', opacity: 1, offset: 0.8 }, { transform: 'translateY(-4px)', opacity: 0 }], q ? 1600 : 1000, EOUT, function () { p.remove() })
  }
  function burst (r, c, color) {
    if (RM) return
    var cc = cellCenter(r, c), fx = $('fx')
    for (var k = 0; k < 10; k++) (function (k) {
      var s = el('i', 'spark'); s.style.background = color; fx.appendChild(s)
      var ang = k / 10 * Math.PI * 2, dx = Math.cos(ang) * CELL * 0.7, dy = Math.sin(ang) * CELL * 0.7
      anim(s, [{ transform: 'translate(' + cc[0] + 'px,' + cc[1] + 'px) scale(1)', opacity: 1 }, { transform: 'translate(' + (cc[0] + dx) + 'px,' + (cc[1] + dy) + 'px) scale(.4)', opacity: 0 }], 520, EOUT, function () { s.remove() })
    })(k)
  }

  /* ── Swop: 0.8–1.5 s on the board; the first time per form a 2–4 s showcase (skippable) ── */
  function swopAnim (e, done) {
    SND.swop()
    if (e.same) { popIcon('swop', G.w.m.r, G.w.m.c); later(done, 500); return }
    if (!S.seen[e.to]) { S.seen[e.to] = 1; save(); return showcase(e, function () { boardSwop(e, done, true) }) }
    boardSwop(e, done)
  }
  function boardSwop (e, done, quick) {
    var mod = $('mojo-mod'), rot = $('mojo-rot'), old = mod.innerHTML
    var ghost = el('div', 'mj-mod'); ghost.innerHTML = old; rot.appendChild(ghost)
    mod.innerHTML = MA.module(e.to, 'top'); mod.style.opacity = '0'
    var t = quick ? 0.5 : 1
    if (RM) {
      anim(ghost, [{ opacity: 1 }, { opacity: 0 }], 200, 'ease', function () { ghost.remove() })
      anim(mod, [{ opacity: 0 }, { opacity: 1 }], 200, 'ease', function () { mod.style.opacity = ''; SND.clank(); later(done, 150) })
      return
    }
    // 1 portal + aura, the old top flies off spinning  2 new module drops in  3 align  4 click-lock (sparks ring,
    // squash, a short hit-stop)  5 ability icon  6 ready
    var m0 = G.w.m
    if (W.MojoFX) { fxCall('swop', m0.r, m0.c); fxCall('topOff', m0.r, m0.c, old); ghost.remove() }
    else anim(ghost, [{ transform: 'translateY(0) scale(1)', opacity: 1 }, { transform: 'translateY(-38%) scale(1.12)', opacity: 0 }], 280 * t, EOUT, function () { ghost.remove() })
    later(function () {
      anim(mod, [{ transform: 'translateY(-46%) scale(1.18)', opacity: 0 }, { transform: 'translateY(4%) scale(1.02)', opacity: 1, offset: 0.75 }, { transform: 'translateY(0) scale(1)', opacity: 1 }], 380 * t, EOUT, function () {
        mod.style.opacity = ''; SND.clank()
        anim(rot, [{ transform: 'rotate(' + G.ang + 'deg) scale(1)' }, { transform: 'rotate(' + G.ang + 'deg) scale(1.1,.92)' }, { transform: 'rotate(' + G.ang + 'deg) scale(1)' }], 150, EOUT, function () { rot.style.transform = 'rotate(' + G.ang + 'deg)' })
        if (W.MojoFX) fxCall('swopLock', G.w.m.r, G.w.m.c, cmdColor('swop:' + e.to)); else burst(G.w.m.r, G.w.m.c, cmdColor('swop:' + e.to))
        var ab = (ML.FORMS[e.to] || {}).ability
        if (ab && !quick) popIcon(ab, G.w.m.r, G.w.m.c)
        later(done, (quick ? 200 : 420) + 80)   // +80: the hit-stop after the click
      })
    }, 200 * t)
  }
  function showcase (e, done) {
    var o = $('ov-swop'), f = ML.FORMS[e.to] || {}, ab = f.ability, fin = false
    o.innerHTML = '<div class="sw-title fk">Swop! ' + formName(e.to) + '</div>' +
      '<div class="sw-stage"><i class="sw-portal" id="sw-portal" style="background-image:url(' + MA.lib('mojo-fx/portal') + ')"></i><div class="layer2" id="sw-ch">' + MA.chassis('side') + '</div><div class="layer2" id="sw-old">' + MA.module(e.from, 'side') + '</div><div class="layer2" id="sw-new" style="opacity:0">' + MA.module(e.to, 'side') + '</div><i class="sw-ring" id="sw-ring"></i></div>' +
      '<div class="sw-ability" id="sw-ab">' + (ab ? verbIcoBox(ab) : '') + '<span>Sekarang bisa: ' + (LABEL[ab] || '') + '!</span></div>' +
      '<button class="btn b-soft sw-skip fk" id="sw-skip" type="button">Lewati</button>'
    o.classList.add('on'); o.setAttribute('aria-hidden', 'false')
    // L3: the showcase opens BELOW the top bar, so Peta / Cara Main / Suara stay tappable; Peta cancels it cleanly
    // (cancelPlayback empties it). A tap anywhere on the showcase skips it.
    var bar = D.querySelector('#scr-play .p-top'), hb = bar ? Math.max(0, Math.round(bar.getBoundingClientRect().bottom)) : 0
    o.style.top = hb + 'px'; o.style.setProperty('--swtop', hb + 'px')
    var tm = []
    function finish () { if (fin) return; fin = true; tm.forEach(clearTimeout); o.classList.remove('on'); o.setAttribute('aria-hidden', 'true'); o.innerHTML = ''; o.onclick = null; done() }
    o.onclick = finish
    say(formName(e.to) + '! Sekarang bisa ' + (LABEL[ab] || '') + '.')
    var oldL = $('sw-old'), newL = $('sw-new'), ch = $('sw-ch'), ring = $('sw-ring'), abEl = $('sw-ab')
    if (RM) {
      anim(oldL, [{ opacity: 1 }, { opacity: 0 }], 300, 'ease'); anim(newL, [{ opacity: 0 }, { opacity: 1 }], 300, 'ease'); anim(abEl, [{ opacity: 0 }, { opacity: 1 }], 300, 'ease')
      tm.push(later(finish, 1800)); return
    }
    anim($('sw-portal'), [{ transform: 'translate(-50%,-50%) rotate(0) scale(.4)', opacity: 0 }, { transform: 'translate(-50%,-50%) rotate(200deg) scale(1)', opacity: 0.95, offset: 0.25 }, { transform: 'translate(-50%,-50%) rotate(620deg) scale(1.05)', opacity: 0.9, offset: 0.8 }, { transform: 'translate(-50%,-50%) rotate(760deg) scale(.7)', opacity: 0 }], 1700, 'linear')   // portal swirl
    if (W.VFX && VFX.domAura) { var aura = VFX.domAura($('sw-ch'), { fx: 'electric-aura', duration: 1300, scale: 0.9, parent: o }); tm.push(later(function () { aura.stop() }, 1400)) }
    anim(oldL, [{ transform: 'translateY(0) rotate(0)', opacity: 1 }, { transform: 'translateY(-30%) rotate(-12deg)', opacity: 1, offset: 0.45 }, { transform: 'translate(30%,-80%) rotate(-70deg) scale(.6)', opacity: 0 }], 620, EOUT)   // 1 release: the old top lifts and spins away
    tm.push(later(function () { anim(newL, [{ transform: 'translateY(-60%) scale(1.08)', opacity: 0 }, { transform: 'translateY(3%) scale(1)', opacity: 1, offset: 0.8 }, { transform: 'translateY(0)', opacity: 1 }], 700, EOUT) }, 450))   // 2 enter + 3 align
    tm.push(later(function () { SND.clank(); anim(ch, [{ transform: 'scale(1)' }, { transform: 'scale(1.04,.95)' }, { transform: 'scale(1)' }], 180, EOUT)             // 4 lock
      anim(ring, [{ transform: 'translate(-50%,-50%) scale(.6)', opacity: 0.9 }, { transform: 'translate(-50%,-50%) scale(1.3)', opacity: 0 }], 600, EOUT) }, 1180))
    tm.push(later(function () { anim(abEl, [{ transform: 'translateY(8px) scale(.96)', opacity: 0 }, { transform: 'translateY(0) scale(1)', opacity: 1 }], 240, EOUT) }, 1450))   // 5 ability
    tm.push(later(function () { anim(o.querySelector('.sw-stage'), [{ transform: 'translateY(0)' }, { transform: 'translateY(-10px)' }, { transform: 'translateY(0)' }], 500, EIO) }, 1800))   // 6 ready pose
    tm.push(later(finish, 2900))
  }

  /* Brief contextual cards: active play only, one per run, two-minute gap, three per mission. */
  /* The things this level really has (owner 2026-10-03: never ask about what is not on the board). Each theme
     is a noun + the owner sprite it is drawn with; the question shows that many sprites, so it is always answerable. */
  var THEME_ART = { bolt: ['baut', 'obj/bolt'], drop: ['tetes air', 'obj/drop'], star: ['bintang', 'obj/star'], fire: ['api', 'obj/fire'],
    tree: ['pohon', 'obj/tree'], flag: ['bendera', 'obj/flag'], rock: ['batu', 'obj/rock'], toolbox: ['kotak alat', 'obj/toolbox'] }
  function levelThemes (lv) {
    var t = {}
    ;(lv.objects || []).forEach(function (o) { if (THEME_ART[o.type]) t[o.type] = 1 })
    if (lv.cap && lv.cap.bolts != null) t.bolt = 1
    if (lv.cap && lv.cap.water != null) t.drop = 1
    if (lv.grid.map.join('').indexOf('T') >= 0) t.tree = 1
    return Object.keys(t)
  }
  // the moment that raised the card, in one line, and the theme it is about (the thing just taken, else the level's)
  function eventMoment (evs) {
    var e = (evs || [])[0] || {}, pick = null, why = 'Mojo istirahat sebentar.'
    ;(evs || []).forEach(function (x) {
      if (x.e === 'collect') { pick = x.res === 'water' ? 'drop' : 'bolt'; why = x.res === 'water' ? 'Mojo dapat tetes air!' : 'Mojo dapat baut!' }
      if (x.e === 'star') { pick = 'star'; why = 'Mojo dapat bintang!' }
      if (x.e === 'tool') { pick = 'toolbox'; why = 'Mojo dapat palu dari kotak alat!' }
      if (x.e === 'repair') why = 'Berhasil diperbaiki!'
      if (x.e === 'rescue') why = 'Temannya selamat!'
    })
    if (e.e === 'bump') why = 'Mojo menabrak!'
    if (e.e === 'ended') why = 'Rencana Mojo sudah habis.'
    return { why: why + ' Jawab dulu untuk bonus lencana baut, atau lanjutkan misi.', pick: pick }
  }
  function countQuestion (lv, evs) {
    var themes = levelThemes(lv), mo = eventMoment(evs)
    if (!themes.length) return null
    var key = mo.pick && themes.indexOf(mo.pick) >= 0 ? mo.pick : themes[Math.floor(Math.random() * themes.length)]
    var n = 2 + Math.floor(Math.random() * 5), art = THEME_ART[key]   // 2..6 things, drawn
    var opts = [n - 1, n, n + 1].sort(function () { return Math.random() - 0.5 })
    return { theme: key, noun: art[0], img: MA.src(art[1]), n: n, answer: String(n), choices: opts.map(String), prompt: 'Ada berapa ' + art[0] + '?', why: mo.why }
  }
  function eventQuestion (done, evs) {
    if (!G || !G.active || D.hidden || MG || $('ov-card').classList.contains('on')) return false
    var now = performance.now()
    G.elapsed += Math.max(0, now - G.tick); G.tick = now
    if (!G.eventGate.ready(G.elapsed,G.runId)) return false
    var q = countQuestion(G.lv, evs); if (!q) return false
    G.eventGate.mark(G.elapsed,G.runId); storePacing()
    MG = { kind:'event', answer:q.answer, theme:q.theme, noun:q.noun, prompt:q.prompt }
    var choices = q.choices.map(function (c,i) { return '<button class="choice" type="button" data-answer="' + i + '">' + c + '</button>' }).join('')
    var scene = ''; for (var k = 0; k < q.n; k++) scene += '<img alt="" src="' + q.img + '">'
    var o = overlay('ov-mg','<div class="mg event-question"><div class="mg-h"><img class="event-bo" src="' + MA.src('char/bo') + '" alt="Bo"><div><h2 class="fk">Ide untuk Mojo</h2><p class="eq-why">' + q.why + '</p><p>' + q.prompt + '</p></div></div><div class="eq-scene" id="eq-scene" role="img" aria-label="' + q.n + ' ' + q.noun + '">' + scene + '</div><div class="event-choices">' + choices + '</div><p id="event-feedback">Hitung gambarnya satu per satu. Tidak perlu terburu-buru.</p><div class="row"><button class="btn b-soft fk" id="event-skip">Lanjutkan Misi</button></div></div>')
    var resolved = false, answered = false
    function finish () { if (resolved) return; resolved = true; MG = null; closeOv('ov-mg'); done() }
    tap('event-skip',finish)
    ;[].forEach.call(o.querySelectorAll('[data-answer]'),function (b) {
      tap(b,function () {
        if (resolved || answered) return
        if (String(q.choices[+b.getAttribute('data-answer')]) === String(q.answer)) {
          answered = true; G.bonus++; S.rewardBolts++; save(); storePacing(); SND.goal(); b.disabled = true
          bonusFly(b, $('event-feedback'))
          $('event-feedback').textContent = 'Hebat! Ada ' + q.n + ' ' + q.noun + '. Satu lencana baut masuk ke Profil.'
          $('event-skip').className = 'btn b-go fk'
          ;[].forEach.call(o.querySelectorAll('[data-answer]'),function (choice) { choice.disabled = true })
        } else { SND.think(); b.disabled = true; $('event-feedback').textContent = 'Coba hitung gambarnya lagi, satu per satu. Kamu boleh lanjutkan misi kapan saja.' }
      })
    })
    return true
  }

  /* ── microgames (the world waits; the child's answer changes the world) ── */
  function microgame (mg, done) {
    if (mg.kind === 'letters') return lettersGame(mg, done)
    if (mg.kind === 'height') return heightGame(mg, done)
    done(true)
  }
  var MG = null
  function lettersGame (mg, done) {
    var q = MS.word(mg.tool || (mg.spec && mg.spec.id) || 'palu', S.set.lang) || MS.word('palu', 'id'), pair = MS.word(q.tool, q.lang === 'en' ? 'id' : 'en')
    var word = q.word, sc = q.scramble.split(''), pos = 0, miss = 0
    MG = { kind: 'letters', answer: word }
    var o = overlay('ov-mg', '<div class="mg" id="mg-letters"><div class="mg-h"><div class="tool"><img alt="" src="' + MA.src(q.pic) + '"></div><div><h2 class="fk">Kotak Alat</h2><p>' + q.prompt + '</p></div>' +
      '<button class="spk" id="mg-say" type="button" aria-label="Dengarkan" style="position:static;transform:none;margin-left:auto;width:56px;height:56px"><i class="ico">' + MA.icon('speak') + '</i></button></div>' +
      '<div class="wslots" id="mg-w">' + word.split('').map(function () { return '<i></i>' }).join('') + '</div>' +
      '<div class="tiles" id="mg-t">' + sc.map(function (ch, k) { return '<button class="tile" type="button" data-l="' + ch + '" data-k="' + k + '">' + ch + '</button>' }).join('') + '</div>' +
      '<div class="pair" id="mg-pair"></div></div>')
    tap('mg-say', function () { say(q.prompt, 'id', true) })
    say(q.prompt)
    ;[].forEach.call(o.querySelectorAll('.tile'), function (b) {
      tap(b, function () {
        if (b.classList.contains('used') || pos >= word.length) return
        if (b.getAttribute('data-l') === word.charAt(pos)) {
          var slot = $('mg-w').children[pos]; slot.textContent = word.charAt(pos); slot.classList.add('fill'); b.classList.add('used'); pos++; SND.place()
          if (pos === word.length) {
            SND.goal()
            $('mg-pair').textContent = word + (pair ? '  =  ' + pair.word : '')
            say(word, q.lang, false)
            later(function () {
              var bt = el('button', 'btn b-go fk', '<i class="ico">' + MA.icon('check') + '</i><span>Pakai ' + word + '!</span>'); bt.type = 'button'; bt.id = 'mg-ok'
              var row = el('div', 'row'); row.appendChild(bt); $('mg-letters').appendChild(row)
              tap(bt, function () { MG = null; closeOv('ov-mg'); done(true) })
            }, 350)
          }
        } else {
          miss++; SND.think(); b.classList.remove('nudge'); void b.offsetWidth; b.classList.add('nudge')
          if (miss >= 2) $('mg-pair').textContent = 'Huruf berikutnya: ' + word.charAt(pos)
        }
      })
    })
  }
  function heightGame (mg, done) {
    var o0 = PG.find(G.w, mg.obj) || {}, step = (mg.spec && mg.spec.step) || 2
    var q = MS.world('height', 'step=' + step + ' target=' + mg.target + ' who=' + (o0.name || 'lampu'))
    var marks = q.marks, top = marks[marks.length - 1], H = 320, base = 36, span = H - base - 34
    function y (v) { return base + (v / top) * span }
    MG = { kind: 'height', answer: q.answer }
    var sc = '<div class="scale" id="mg-scale"><div class="pole"></div><div class="base"></div>' +
      marks.map(function (m) { return '<div class="mark' + (m === mg.target ? ' q' : '') + '" style="bottom:' + y(m) + 'px">' + (m === mg.target ? '?' : m) + '</div>' }).join('') +
      '<div class="bal" style="bottom:' + y(mg.target) + 'px"><img alt="" src="' + objImg(o0) + '"></div><div class="bucket" id="mg-bucket"></div></div>'
    var o = overlay('ov-mg', '<div class="mg"><div class="mg-h"><div class="tool"><img alt="" src="' + objImg(o0) + '"></div><div><h2 class="fk">Naikkan Keranjang</h2><p>' + q.prompt + '</p></div></div>' +
      '<div class="hgt">' + sc + '<div class="choices"><p>Keranjang naik ke tanda berapa?</p>' + q.choices.map(function (c) { return '<button class="choice" type="button" data-v="' + c + '">' + c + '</button>' }).join('') + '<div class="pair" id="mg-pair"></div></div></div></div>')
    say(q.prompt)
    var busy = false
    ;[].forEach.call(o.querySelectorAll('.choice'), function (b) {
      tap(b, function () {
        if (busy) return
        var v = +b.getAttribute('data-v'), bk = $('mg-bucket'); busy = true
        bk.style.transform = 'translateY(' + (-(y(v) - base)) + 'px)'
        tone(300, 300 + v * 60, 0.5, 0.06, 'triangle')
        later(function () {
          if (String(v) === q.answer) {
            b.classList.add('ok'); SND.goal(); $('mg-pair').textContent = 'Pas! Tinggi ' + v + '.'
            MG = null   // answered: nothing is asked during the 0.7 s "Pas!" moment
            later(function () { closeOv('ov-mg'); done(v) }, 700)
          } else {
            b.classList.add('off'); SND.think()
            $('mg-pair').textContent = v > mg.target ? 'Terlalu tinggi. ' + q.hint1 : 'Belum sampai. ' + q.hint1
            later(function () { bk.style.transform = ''; busy = false }, 700)
          }
        }, 560)
      })
    })
  }

  /* ── hint ladder (owner 2026-10-03): four rungs, each a full sentence and more concrete than the last.
     1 the goal and where it is, 2 the forms and actions it needs, 3 the next command (palette + cell),
     4 the next two commands. The counter never runs out: after rung 4 "Tunjukkan Caranya" is offered and
     further taps repeat rung 4 for the plan as it is now. ───────────────────────────────────────── */
  var HINT_MAX = 4, DIRW = { up: 'atas', down: 'bawah', west: 'kiri', east: 'kanan' }
  function focusObj () {
    if (G.fail && G.fail.obj) return G.fail.obj
    var miss = (beat().objectives || []).filter(function (o) { return !PG.met(G.cp, o) })[0]
    if (miss && miss.id) return miss.id
    if (miss && miss.at) { var f = (G.lv.objects || []).filter(function (o) { return o.type === 'flag' && o.at[0] === miss.at[0] && o.at[1] === miss.at[1] })[0]; return f && f.id }
    return null
  }
  function low (o) { var n = nameOf(o); return o && o.type === 'person' ? n : n.toLowerCase() }
  function where (o) {
    var m = G.cp.m, v = o.r < m.r ? 'atas' : o.r > m.r ? 'bawah' : '', h = o.c < m.c ? 'kiri' : o.c > m.c ? 'kanan' : ''
    return h && v ? h + ' ' + v : (h || v || 'dekat')
  }
  // the solver's route for this beat, played headless: the actions in order and what it drives over
  function routeInfo () {
    var b = beat(), w = G.cp, sol = PG.solve(w, b) || [], acts = [], takes = { tool: 0, bolts: 0, water: 0 }
    for (var i = 0; i < sol.length; i++) {
      var c = sol[i], r = PG.stepBeat(w, c, b, { auto: true }), v = PG.verbOf(c)
      if (!PG.ok(r.status)) break
      if (v === 'swop') acts.push({ cmd: c })
      else if (PG.BASE.indexOf(v) < 0) {
        var id = null; (r.events || []).forEach(function (e) { if (!id && e.id && e.e !== 'turn') id = e.id })
        acts.push({ cmd: c, verb: v, id: id })
      }
      ;(r.events || []).forEach(function (e) { if (e.e === 'tool') takes.tool++; if (e.e === 'collect') takes[e.res] = (takes[e.res] || 0) + 1 })
      w = r.world
    }
    return { sol: sol, acts: acts, takes: takes }
  }
  // the next n commands from the plan as it is now (keeps the longest prefix that still works)
  function lookAhead (n) {
    var b = beat(), h = PG.hint(G.cp, b, G.prog, {})
    if (!h || h.done) return h
    var w = G.cp, pre = PG.flat(G.prog).slice(0, h.at), out = []
    for (var i = 0; i < pre.length; i++) w = PG.stepBeat(w, pre[i], b, { auto: true }).world
    for (var k = 0; k < Math.min(n, h.steps.length); k++) {
      var r = PG.stepBeat(w, h.steps[k], b, { auto: true }), cell = [r.world.m.r, r.world.m.c]
      ;(r.events || []).forEach(function (e) { if (e.id && ['spray', 'push', 'raise', 'rescue', 'repair', 'pick'].indexOf(e.e) >= 0) { var o = PG.find(w, e.id); if (o) cell = [o.r, o.c] } })
      out.push({ cmd: h.steps[k], cell: cell }); w = r.world
    }
    return { at: h.at, steps: out, rest: h.steps.length }
  }
  function markCell (r, c, n) {
    var d = el('div', 'cell-mark', n ? '<b>' + n + '</b>' : ''); d.style.left = (c * CELL) + 'px'; d.style.top = (r * CELL) + 'px'; $('fx').appendChild(d)   // left/top: the pulse animates transform
  }
  function candCmd (c) { var b = D.querySelector('.cmd[data-cmd="' + c + '"]'); if (b) b.classList.add('cand') }
  function hintText (rung) {
    var b = beat(), ri = routeInfo(), id = focusObj(), o = id ? PG.find(G.cp, id) : null
    var miss = (b.objectives || []).filter(function (x) { return !PG.met(G.cp, x) })[0] || (b.objectives || [])[0]
    if (rung === 1) {
      var t = (G.fail && G.fail.index < G.prog.length ? 'Rencanamu berhenti di kotak ' + (G.fail.index + 1) + '. ' : '') + 'Tugasnya: ' + obInfo(miss).t.toLowerCase() + '. '
      if (o) {
        if (OBJ[o.id]) OBJ[o.id].classList.add('focus')
        t += nameOf(o) + ' ada di ' + where(o) + ' Mojo. ' + (o.type === 'flag' ? 'Ikuti jalan abu-abu dan LEWATI sampai ke bendera.' : 'Mojo harus berhenti di SEBELAH ' + low(o) + '.')
      }
      var first = ri.acts.filter(function (a) { return a.id && a.id !== id })[0], fo = first && PG.find(G.cp, first.id)
      if (fo && (!o || fo.type !== o.type)) { t += ' Di jalan ada ' + low(fo) + ' di ' + where(fo) + ': berhenti di SEBELAH-nya dulu.'; if (OBJ[fo.id]) OBJ[fo.id].classList.add('focus') }
      else if (fo) t += ' Ada ' + low(fo) + ' lain juga, di ' + where(fo) + '.'
      return t
    }
    if (rung === 2) {
      var take = [], acts = [], pre = ''
      if (ri.takes.tool) take.push('kotak alat')
      if (ri.takes.bolts) take.push(ri.takes.bolts + ' baut')
      if (ri.takes.water) take.push(ri.takes.water + ' tetes air')
      ri.acts.forEach(function (a) {
        if (a.cmd.indexOf('swop:') === 0) { acts.push('jadi ' + SHORT[a.cmd.slice(5)]); candCmd(a.cmd); return }
        var x = a.id ? PG.find(G.cp, a.id) : null
        if (a.verb === 'raise' && x && !pre) pre = nameOf(x) + ' tinggi ' + x.elev + '. '
        acts.push(up(a.verb) + (a.verb === 'raise' && x ? ' ke ' + x.elev : '')); candCmd(a.cmd)
      })
      var s = pre + (take.length ? 'LEWATI dulu ' + take.join(' dan ') + ' di jalan. ' : '')
      if (acts.length) s += (take.length ? 'Lalu' : 'Urutannya') + ': ' + acts.join(', lalu ') + '. Tombolnya bersinar.'
      else s += 'Tidak perlu Swop. Cukup panah: ' + ri.sol.length + ' langkah di jalan abu-abu.'
      return s
    }
    var la = lookAhead(rung === 3 ? 1 : 2)
    if (la && la.done) return 'Rencanamu sudah benar! Tekan JALAN.'
    if (!la || !la.steps.length) return 'Hapus rencananya dulu, lalu tekan TUNJUKKAN CARANYA.'
    G.ghost = true
    showGhost({ at: la.at, cmd: la.steps[0].cmd })
    la.steps.forEach(function (st, k) {
      candCmd(st.cmd)
      var prev = k && la.steps[k - 1].cell, same = prev && prev[0] === st.cell[0] && prev[1] === st.cell[1]
      if (same) { var lb = $('fx').lastChild && $('fx').lastChild.querySelector('b'); if (lb) lb.textContent += ' ' + (k + 1) }   // a Swop stays on the same cell
      else markCell(st.cell[0], st.cell[1], rung === 4 ? k + 1 : 0)
    })
    var fix = la.at < G.prog.length ? 'Kotak ' + (la.at + 1) + ' perlu diganti. ' : ''
    if (rung === 3) return 'Langkah berikutnya, kotak ' + (la.at + 1) + ': ' + cmdLabel(la.steps[0].cmd).toUpperCase() + '. ' + fix + 'Tombolnya bersinar dan tujuannya ditandai di peta. Ketuk kotak yang bersinar untuk memakainya.'
    var two = la.steps.map(function (st, k) { return (k + 1) + ') ' + cmdLabel(st.cmd).toUpperCase() }).join(', ')
    return (la.steps.length > 1 ? 'Dua langkah berikutnya: ' + two + '. ' : 'Tinggal satu langkah: ' + two + '. ') + fix + 'Ketuk kotak yang bersinar untuk memakai yang pertama. Masih bingung? Tekan TUNJUKKAN CARANYA.'
  }
  function hint () {
    if (G.run || G.trans) return
    SND.place()
    clearMarks(); hideGhost()
    G.hint = Math.min(HINT_MAX, G.hint + 1)
    $('hint-lv').textContent = G.hint + '/' + HINT_MAX
    var t = hintText(G.hint)
    G.hintText = t
    boSay(t, false, false, true)
    helpUi()
  }
  // "Tunjukkan Caranya" is offered after two stopped runs or after the last hint rung (always in Pesan Bo)
  function helpUi () { var b = $('btn-show'); if (b && G) b.hidden = !!G.run || G.trans || !(G.fails >= 2 || G.hint >= HINT_MAX) }
  var GH = null
  function showGhost (h) {
    hideGhost()
    GH = h
    var s = slotEl(h.at); if (!s) return
    s.classList.add('ghost')
    var ex = s.querySelector('.chip'); if (ex) ex.remove()
    s.insertAdjacentHTML('beforeend', chipHtml(h.cmd))
    s.setAttribute('data-ghost', h.cmd)
  }
  function hideGhost () { if (!GH) return; GH = null; renderStripKeep() }
  function useGhost () {
    if (!GH) return
    var h = GH; GH = null
    edit(function (p) { return p.slice(0, h.at).concat([h.cmd]) }, -1)
    SND.place()
  }

  /* ── beats, checkpoints, result ─────────────────────────────────────── */
  function beatComplete () {
    var R = G.run
    endRunUi()
    $('btn-run').disabled = true
    var b = beat(), used = R.n
    G.used[G.bi] = used
    for (var k in R.stars) { G.starBeat[G.bi] = true; G.gotStars[k] = true }
    ;[].forEach.call(D.querySelectorAll('.slot'), function (s) { s.classList.remove('active') })
    SND.win()
    fxCall('beat', G.w.m.r, G.w.m.c)
    boSay(G.bi + 1 < G.lv.beats.length ? 'Berhasil! Rencanamu bekerja!' : 'Hore! Misi selesai!', false)
    if (G.bi + 1 < G.lv.beats.length) {
      // the next beat (its objective, Bo's line, its world) only appears AFTER this beat's celebration:
      // G.bi / G.cp switch inside the timer; the checkpoint is saved now (PRD §31)
      var nextBi = G.bi + 1, nextCp = newWorld(G.lv, nextBi, G.w)
      G.trans = true; helpUi()
      S.cp = { id: G.lv.id, rev: G.lv.rev || 1, beat: nextBi, world: packWorld(nextCp), used: G.used, ghost: G.ghost, shown: G.shown, starBeat: G.starBeat, gotStars:G.gotStars, bonus:G.bonus, events:G.eventGate.state(), elapsed:G.elapsed + Math.max(0,performance.now()-G.tick) }; save()
      var chaseBi = G.bi
      later(function () { chaseBeat(chaseBi, function () {
        G.bi = nextBi; G.cp = nextCp
        var st = beat().start
        if (st) {
          var mj = $('mojo')
          anim(mj, [{ opacity: 1 }, { opacity: 0 }], 220, EOUT, function () { beginBeat(false); anim(mj, [{ opacity: 0 }, { opacity: 1 }], 260, EOUT, function () { mj.style.opacity = '' }) })
        } else beginBeat(false)
      }) }, 1300)
      return
    }
    // the stars are saved the moment the mission is done (quit / reload never loses them: qa-mojo-lifecycle); the
    // result card that shows them always follows, after a story chase or after leaving it (C3)
    var earned = awardMission(), lastBi = G.bi
    later(function () { chaseBeat(lastBi, function () { finishLevel(earned) }) }, 1100)
  }
  /* a 'chase' beat (data/mojo-chases.js ADVENTURE) runs after grid beat `bi`, then the level continues. Leaving the
     chase (Jeda → Keluar) is never a lost mission: after the last beat the result card still shows the grid stars;
     mid-mission the next beat opens as it would after the chase (the checkpoint is already saved). */
  function chaseBeat (bi, next) {
    var g = G
    if (!W.MojoChaseMenu || !W.MojoChaseMenu.beat(G.lv.id, bi, function () { if (G !== g) return; next() })) next()
  }
  function awardMission () {
    if (G.award) { flushAwards(); return G.award }
    var lv = G.lv, eff = true
    lv.beats.forEach(function (b, i) { if (!(G.used[i] <= b.budget + (G.starBeat[i] ? (b.starExtra || 0) : 0))) eff = false })
    var gotStar = (lv.optional || []).length ? (lv.optional || []).every(function (o) { return G.gotStars[o.id] }) : true
    var stars = 1 + (gotStar ? 1 : 0) + (eff ? 1 : 0)
    if (G.ghost) stars = Math.min(stars, 2)
    if (G.shown) stars = 1   // finished after "Tunjukkan Caranya": one star, said gently on the card
    var prev = S.lv[lv.id] || {}
    var records = Object.assign({},S.lv); records[lv.id] = { stars: Math.max(prev.stars || 0, stars), t: Date.now() }; S.lv = records
    S.cp = null; saveDirty = true
    pendingAwards.push({level:G.idx + 1,stars:stars})
    G.award = { stars:stars, gotStar:gotStar, eff:eff }; flushAwards(); return G.award
  }
  function flushAwards () {
    if (saveDirty && !save()) return false
    while (pendingAwards.length) {
      var a = pendingAwards[0]
      try {
        if (!W.saveLevelProgress || saveLevelProgress(GAME_ID,a.level,a.stars) === false) throw new Error('Shared progress storage unavailable')
        pendingAwards.shift()
      } catch (e) { console.warn('[Mojo] Shared stars were not saved',e); toast('Bintang belum tersimpan di peta. Periksa ruang penyimpanan, lalu coba lagi.'); return false }
    }
    return true
  }
  function finishLevel (earned) {
    flushAwards()
    $('btn-run').disabled = false
    result(earned.stars, earned.gotStar, earned.eff)
  }
  function result (stars, gotStar, eff) {
    var lv = G.lv, next = ML.LEVELS[G.idx + 1], si = MA.src('obj/star')
    var off = 'opacity:.3;filter:grayscale(1)'
    var why = G.shown
      ? '<span><i style="background-image:url(' + si + ')"></i>Misi selesai bersama Bo</span>' +
        '<span><i style="background-image:url(' + si + ');' + off + '"></i>Sekarang kamu tahu caranya</span>' +
        '<span><i style="background-image:url(' + si + ');' + off + '"></i>Main lagi sendiri untuk 3 bintang</span>'
      : '<span><i style="background-image:url(' + si + ')"></i>Misi selesai</span>' +
      '<span><i style="background-image:url(' + si + ');' + (gotStar ? '' : off) + '"></i>' + ((lv.optional || []).length ? (gotStar ? 'Bintang ditemukan' : 'Ada bintang tersembunyi di peta') : 'Tanpa bintang tersembunyi') + '</span>' +
      '<span><i style="background-image:url(' + si + ');' + (eff && !G.ghost ? '' : off) + '"></i>' + (G.ghost ? 'Coba lagi tanpa petunjuk langkah' : eff ? 'Rencana hemat' : 'Bisa dengan perintah lebih sedikit') + '</span>'
    var s = ''; for (var k = 1; k <= 3; k++) s += '<i class="' + (k <= stars ? 'on' : '') + '" style="background-image:url(' + si + ')"></i>'
    overlay('ov-card', '<div class="card result"><h2 class="fk">Hebat!</h2><div class="stars" id="res-stars">' + s + '</div>' +
      '<div class="res-cast"><img class="res-bo" alt="Bo" src="' + MA.lib('mojo-char/bo-celebrate') + '"><div class="mojo-side">' + MA.mojo(G.w.m.form, 'side') + '</div></div>' +
      '<p class="res-line">Misi <b>' + lv.title.replace(/[!.]+$/, '') + '</b> berhasil!</p><div class="why">' + why + '</div>' +
      '<div class="row"><button class="btn b-retry fk" id="res-again" type="button"><i class="ico">' + MA.icon('undo') + '</i><span>Main Lagi</span></button>' +
      '<button class="btn b-map fk" id="res-map" type="button"><i class="ico">' + MA.icon('map') + '</i><span>Peta</span></button>' +
      (next ? '<button class="btn b-go fk" id="res-next" type="button"><span>Lanjut</span><i class="ico">' + MA.icon('run') + '</i></button>' : '') + '</div></div>')
    confetti()
    say('Misi berhasil! Kamu dapat ' + stars + ' bintang.')
    tap('res-again', function () { closeOv('ov-card'); start(lv.id) })
    tap('res-map', function () { closeOv('ov-card'); W.MojoMenu.map() })
    if (next) tap('res-next', function () { closeOv('ov-card'); start(next.id) })
  }
  function confetti () {
    if (RM) return
    if (W.MojoFX) { MojoFX.confetti(D.body, 30); return }   // the owner's confetti sprites
    var cols = ['#FFC83D', '#F2552C', '#1E88E5', '#2FB35E', '#FF8FB1']
    for (var k = 0; k < 36; k++) (function (k) {
      var c = el('i', 'confetti'); c.style.background = cols[k % cols.length]; D.body.appendChild(c)
      var x = W.innerWidth * ((k * 37 % 100) / 100), dx = ((k * 53 % 40) - 20) * 3
      anim(c, [{ transform: 'translate(' + x + 'px,-30px) rotate(0)' }, { transform: 'translate(' + (x + dx) + 'px,' + (W.innerHeight * 0.9) + 'px) rotate(' + (k * 47 % 360 + 180) + 'deg)', opacity: 0.2 }], 1400 + (k % 7) * 120, 'cubic-bezier(.23,1,.32,1)', function () { c.remove() })
    })(k)
  }
  /* "Cara Main": the one rule, two panels, owner sprites only (shown in the t1 / t3 briefing, reopened by #btn-rule) */
  var RULE_LEVELS = { t1: 1, t3: 1 }
  function ruleHtml () {
    function im (k, cls) { return '<img class="' + (cls || '') + '" alt="" src="' + MA.src(k) + '">' }
    return '<div class="rule-card" id="rule-card"><h3 class="fk">Cara Main</h3><div class="rule-panels">' +
      '<div class="rule-p walk"><div class="rule-pic"><span class="rp-ring">' + im('obj/star') + '</span>' + im('obj/bolt', 'sm') + im('obj/toolbox', 'sm') + '</div>' +
      '<p><b>LEWATI</b> untuk ambil ' + im('obj/star', 'inl') + '</p><small>bintang, baut, air, kotak alat</small></div>' +
      '<div class="rule-p side"><div class="rule-pic">' + im('obj/fire') + '<i class="cmdico" style="background:' + cmdColor('spray') + '">' + MA.icon('spray') + '</i>' + im('char/neon') + '<i class="cmdico" style="background:' + cmdColor('rescue') + '">' + MA.icon('rescue') + '</i></div>' +
      '<p>Berhenti di <b>SEBELAH</b>, lalu pakai aksi</p><small>api, batu, teman, yang rusak</small></div>' +
      '</div></div>'
  }
  function ruleCard () {
    if (!G || G.run) return
    SND.place()
    overlay('ov-card', '<div class="card rule-only">' + ruleHtml() + '<div class="row"><button class="btn b-soft fk" id="rule-say" type="button"><i class="ico">' + MA.icon('speak') + '</i><span>Dengar</span></button>' +
      '<button class="btn b-go fk" id="rule-close" type="button"><i class="ico">' + MA.icon('check') + '</i><span>Kembali ke Rencana</span></button></div></div>')
    tap('rule-say', function () { say(RULE_SAY, 'id', true) })
    tap('rule-close', function () { closeOv('ov-card') })
  }
  var RULE_SAY = 'Cara main. Bintang, baut, air dan kotak alat: LEWATI untuk mengambilnya. Api, batu, teman dan yang rusak: berhenti di sebelahnya, lalu pakai aksi.'
  function introCard (resumed) {
    var lv = G.lv, b = beat(), math = b.math ? MS.world(b.math.kind, b.math.about) : null
    var goals = (b.objectives || []).map(function (ob) { var i = obInfo(ob); return '<span class="ob-chip"><img alt="" src="' + i.img + '"><span>' + i.t + '</span></span>' }).join('')
    var forms = (b.forms || []).filter(function (f) { return (b.palette || []).indexOf('swop:' + f) >= 0 }).map(function (f) { return '<span class="fr" title="' + formName(f) + '">' + MA.module(f, 'top') + '</span>' }).join('')
    var mc = ''
    if (math) {
      var ic = MA.src(math.noun === 'baut' ? 'obj/bolt' : 'obj/drop'), dots = ''
      for (var k = 0; k < math.need; k++) dots += k < math.have ? '<i style="background-image:url(' + ic + ')"></i>' : '<i class="miss">?</i>'
      mc = '<div class="mathcard"><p class="q">' + math.prompt + '</p><div class="dots">' + dots + '</div></div>'
    }
    var head = G.lv.beats.length > 1 ? 'Babak ' + (G.bi + 1) + ' dari ' + G.lv.beats.length : (lv.place || ML.CHAPTERS.filter(function (c) { return c.id === lv.ch })[0].title)
    // two groups (story | what to do) so short landscape screens can set them side by side (H1)
    overlay('ov-card', '<div class="card intro-card"><div class="intro"><img class="bo-big" alt="Bo" src="' + MA.src('char/bo') + '"><div class="txt"><div class="in-story">' +
      '<span class="place">' + head + '</span><h2 class="fk">' + (G.bi === 0 ? lv.title : b.title) + '</h2>' +
      (resumed ? '<p>Lanjut dari babak ' + (G.bi + 1) + '. Yang sudah selesai tetap aman!</p>' : '') + '<p>' + b.story + '</p></div><div class="in-extra">' + mc +
      (RULE_LEVELS[lv.id] && G.bi === 0 ? ruleHtml() : '') +
      '<div class="goals">' + goals + '</div>' + (forms ? '<div class="forms-row">' + forms + '</div>' : '') + '</div></div></div>' +
      '<div class="row"><button class="btn b-soft fk" id="in-say" type="button"><i class="ico">' + MA.icon('speak') + '</i><span>Dengar</span></button><button class="btn b-go big fk" id="in-go" type="button"><i class="ico">' + MA.icon('plan') + '</i><span>Ayo Rencanakan!</span></button></div></div>')
    tap('in-go', function () { SND.place(); closeOv('ov-card'); W.MojoMenu.picker(b,G.cp.m.form,function (f) { if (f) addCmd('swop:' + f) }) })
    tap('in-say', function () { say(b.story + ' ' + (math ? math.prompt : ''), 'id', true) })
    say(b.story)
  }

  /* ── settings ───────────────────────────────────────────────────────── */
  function resetProgress (owner) {
    var current = W._activeAvatarSlug ? W._activeAvatarSlug() : null
    if (owner !== current) { toast('Profil anak berubah. Buka kembali Pengaturan.'); return false }
    var key = current ? 'dunia-avatar-' + current + '-progress' : 'dunia-0-progress'
    var previous = null, changed = false, next = fill({set:S.set})
    try {
      previous = localStorage.getItem(key)
      var progress = previous ? JSON.parse(previous) : {}
      if (!progress || typeof progress !== 'object' || Array.isArray(progress)) throw new Error('Invalid progress data')
      var remaining = Object.assign({},progress); delete remaining[GAME_ID]
      sessionStorage.removeItem(GAME_ID + 'Result'); sessionStorage.removeItem('31Result')
      localStorage.setItem(key,JSON.stringify(remaining)); changed = true
      var encoded = JSON.stringify(next)
      if (W.avatarScopedSet) { if (!avatarScopedSet(KEY,encoded)) throw new Error('Progress storage unavailable') }
      else localStorage.setItem(KEY,encoded)
    } catch (e) {
      if (changed) {
        try { if (previous == null) localStorage.removeItem(key); else localStorage.setItem(key,previous) }
        catch (restoreError) { console.warn('[Mojo] Progress rollback unavailable',restoreError) }
      }
      console.warn('[Mojo] Reset could not be saved',e)
      toast('Kemajuan belum bisa dihapus. Coba lagi setelah penyimpanan tersedia.'); return false
    }
    if (G) G.active = false
    cancelPlayback(); hush(); G = null; S = next; saveDirty = false; pendingAwards = []; home(); toast('Kemajuan Mojo profil ini sudah dihapus.'); return true
  }
  function settings () {
    function seg (key, opts) { return '<div class="seg" data-k="' + key + '">' + opts.map(function (o) { return '<button type="button" data-v="' + o[0] + '" class="' + (String(S.set[key]) === String(o[0]) ? 'on' : '') + '">' + o[1] + '</button>' }).join('') + '</div>' }
    overlay('ov-card', '<div class="card"><h2 class="fk">Pengaturan</h2>' +
      '<div class="set-row"><b>Suara efek</b>' + seg('sound', [[true, 'Nyala'], [false, 'Mati']]) + '</div>' +
      '<div class="set-row"><b>Bo membacakan</b>' + seg('narr', [[true, 'Nyala'], [false, 'Mati']]) + '</div>' +
      '<div class="set-row"><b>Kata alat</b>' + seg('lang', [['id', 'Indonesia'], ['en', 'English']]) + '</div>' +
      '<div class="row"><button class="btn b-soft fk" id="set-parent" type="button">Untuk Orang Tua</button><button class="btn b-go fk" id="set-ok" type="button"><i class="ico">' + MA.icon('check') + '</i><span>Selesai</span></button></div></div>')
    ;[].forEach.call($('ov-card').querySelectorAll('.seg button'), function (b) {
      tap(b, function () {
        var k = b.parentNode.getAttribute('data-k'), v = b.getAttribute('data-v')
        S.set[k] = v === 'true' ? true : v === 'false' ? false : v; save(); syncSound(); if (!S.set.narr) hush()
        ;[].forEach.call(b.parentNode.children, function (x) { x.classList.toggle('on', x === b) })
        SND.place()
      })
    })
    tap('set-ok', function () { closeOv('ov-card') })
    tap('set-parent',function () { W.MojoMenu.parentGate(settings) })
  }
  function confirmClear () {
    overlay('ov-card', '<div class="card" style="text-align:center"><h2 class="fk">Hapus semua perintah?</h2><p>Rencana di kotak akan kosong lagi.</p>' +
      '<div class="row"><button class="btn b-soft fk" id="cl-no" type="button"><span>Tidak</span></button><button class="btn b-go fk" id="cl-yes" type="button"><span>Ya, hapus</span></button></div></div>')
    tap('cl-no', function () { closeOv('ov-card') })
    tap('cl-yes', function () { closeOv('ov-card'); edit(function () { return [] }, -1) })
  }

  /* ── wiring ─────────────────────────────────────────────────────────── */
  icons()
  soundBtns()
  tap('btn-play', function () { SND.place(); start(nextLevelId()) })

  tap('btn-exit', function () { storePacing(); cancelPlayback(); hush(); save(); location.href = '../index.html' })
  tap('btn-sound', toggleSound); tap('btn-sound2', toggleSound)
  tap('btn-settings', settings)
  ;[].forEach.call(D.querySelectorAll('[data-go="home"]'), function (b) { tap(b, home) })
  tap('map-back', function () { SND.place(); W.MojoMenu.map() })
  tap('btn-quit', function () { if (G && G.run) stopRun(); hush(); W.MojoMenu.map() })
  tap('btn-run', function () { run() })
  tap('btn-undo', function () { if (G.run || !G.hist.length) return; resetView(); G.prog = G.hist.pop(); G.sel = -1; clearFail(); renderStrip(); renderPalette(); SND.place() })
  tap('btn-clear', function () { if (G.run || !G.prog.length) return; confirmClear() })
  tap('btn-hint', hint)
  tap('btn-rule', ruleCard)
  tap('btn-show', showMe)
  tap('bo-say', function () { say(boLine, 'id', true) })
  tap('bo-details', function () {
    if (!G || G.run) return
    overlay('ov-card','<div class="card bo-explanation"><h2 class="fk">Pesan Bo</h2><p class="bo-goal" id="bo-goal"></p><p id="bo-full"></p><div class="row"><button class="btn b-soft fk" id="bo-full-say">Dengarkan</button><button class="btn b-show fk" id="bo-show" type="button"><i class="ico">' + MA.icon('hint') + '</i><span>Tunjukkan Caranya</span></button><button class="btn b-go fk" id="bo-close">Kembali ke Rencana</button></div></div>')
    $('bo-goal').textContent = 'Tugas sekarang: ' + $('bo-task').textContent
    $('bo-full').textContent = boLine
    tap('bo-full-say',function () { say(boLine,'id',true) })
    tap('bo-show',function () { closeOv('ov-card'); showMe() })
    tap('bo-close',function () { closeOv('ov-card') })
  })
  D.addEventListener('visibilitychange', function () { if (G && G.active) { if (D.hidden) G.elapsed += Math.max(0,performance.now()-G.tick); G.tick=performance.now(); storePacing() } if (D.hidden) { flushAwards(); hush(); if (G && G.run) stopRun() } })
  try { if (W.SFXEngine && SFXEngine.setMute) SFXEngine.setMute(!soundOn()) } catch (e) {}
  // warm every picture the game uses so a level plays offline (the page itself is in sw.js SHELL)
  if (W.MojoFX) MojoFX.init({ layer: function () { return $('fx') }, cell: function () { return CELL }, lib: MA.lib, board: function () { return $('board') } })
  var WARM = MA.libFiles().concat(['road','grass','water','indoor-floor','wall','trap-hole'].map(function (k) { return MA.lib('mojo-tile/' + k) }), BOARD_BUILDINGS.map(function (k) { return MA.lib('mojo-prop/' + k) }), W.MojoFX ? MojoFX.files() : [])
  var assetLoad = { ready:false, pending:WARM.length, failed:[] }, warming = false
  function warmAssets () {
    if (warming) return
    warming = true
    WARM.forEach(function (u) {
      var i = new Image()
      function finish (ok) { if (!ok) assetLoad.failed.push(u); assetLoad.pending--; assetLoad.ready = assetLoad.pending === 0 && assetLoad.failed.length === 0 }
      i.onload = function () { finish(true) }; i.onerror = function () { finish(false) }; i.src = u
    })
  }
  W.addEventListener('pagehide', function () { storePacing(); flushAwards(); cancelPlayback(); hush() })
  /* M5: the first level used to pay ~40 ms of first-use font work inside its layout (the browser builds a font
     "strike" per family x weight x size the first time one is drawn). While the child is still on the home screen,
     idle slices lay out one hidden sample of each face and size the game uses, so starting a level stays a short
     frame. Small batches, only in idle time, stopped as soon as the child leaves home. */
  var TYPE_SIZES = [12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24, 26, 28, 30, 34, 36]
  function warmType () {
    var jobs = []
    TYPE_SIZES.forEach(function (px) {
      ;[400, 700, 800, 900].forEach(function (w) { jobs.push('<span style="font-size:' + px + 'px;font-weight:' + w + '">Aa1 › — ‹</span>') })
      jobs.push('<b class="fk" style="font-size:' + px + 'px">Aa1</b>', '<span class="fk" style="font-size:' + px + 'px">Aa1</span>')
    })
    function slice (dl) {
      if (D.body.getAttribute('data-scr') === 'scr-play') return
      var d = el('div', 'type-warm'), n = 0
      d.setAttribute('aria-hidden', 'true'); d.style.cssText = 'position:fixed;left:-9999px;top:0;visibility:hidden;pointer-events:none;white-space:nowrap'
      while (jobs.length && n < 12 && (!dl || dl.timeRemaining() > 4 || n === 0)) { d.insertAdjacentHTML('beforeend', jobs.shift()); n++ }
      D.body.appendChild(d); void d.offsetWidth; d.remove()
      if (jobs.length) idle(slice)
    }
    idle(slice)
  }
  function idle (fn) { if (W.requestIdleCallback) W.requestIdleCallback(fn, { timeout: 2000 }); else W.setTimeout(fn, 60) }
  W.addEventListener('load', function () {
    warmType()
    if (navigator.serviceWorker) {
      navigator.serviceWorker.ready.then(function () {
        if (navigator.serviceWorker.controller) warmAssets()
        else navigator.serviceWorker.addEventListener('controllerchange',warmAssets,{once:true})
      }).catch(function () { warmAssets() })
    } else warmAssets()
  })
  home()
  function award (n) { S.rewardBolts = Math.min(1000000, (S.rewardBolts || 0) + (n | 0)); save(); homeCounters() }
  W.MojoMenu.setup({ home:home, show:show, toast:toast, episodes:map, start:start, next:nextLevelId, overlay:overlay, close:closeOv, cue:SND.place, say:say, reset:resetProgress, award:award, save:function () { return S } })
  if (W.MojoChaseMenu) W.MojoChaseMenu.setup({ home:home, show:show, toast:toast, cue:SND.place, say:say, award:award, save:function () { return S } })

  /* test seam (QA only: reads state, never plays for the child) */
  W.__mojo = {
    ready: true, levels: function () { return ML.LEVELS.map(function (l) { return l.id }) },
    state: function () { return G ? { id: G.lv.id, beat: G.bi, beats: G.lv.beats.length, prog: G.prog.slice(), running: !!G.run, fail: G.fail, hint: G.hint, hintText: G.hintText || '', fails: G.fails, shown: G.shown, trans: G.trans, boLine: boLine, ghost: G.ghost, form: G.w.m.form, world: PG.key(G.w), res: G.w.res, tools: G.w.tools, objects:G.w.objs, position:G.w.m, events:G.eventGate.state(), elapsed:G.elapsed, bonus:G.bonus } : null },
    solution: function () { return G ? PG.solve(G.cp, beat()) : null },
    alt: function (forbid) { return G ? PG.solve(G.cp, beat(), { forbid: forbid }) : null },
    mg: function () { return MG ? { kind: MG.kind, answer: MG.answer, theme: MG.theme, noun: MG.noun, prompt: MG.prompt } : null },
    themes: function (id) { var lv = ML.byId(id || (G && G.lv.id)); return lv ? levelThemes(lv).map(function (k) { return THEME_ART[k][0] }) : [] },
    eventQuestion:eventQuestion, assets:function () { return JSON.parse(JSON.stringify(assetLoad)) },
    save: function () { return JSON.parse(JSON.stringify(S)) }, warm: function () { return WARM.slice() }, start: start, map: map, home: home
  }
  W.render_game_to_text = function () { return JSON.stringify({ screen:D.body.getAttribute('data-scr'), coordinates:'row,col; origin top left; headings 0 north,1 east,2 south,3 west', game:W.__mojo.state(), microgame:W.__mojo.mg() }) }
})()
