/* ============================================================================
 * stinky-dirty.js — G28 "The Stinky & Dirty Show! — Learning Adventure".
 * Screens, per-child save, parent gate + settings, narration + SFX, sessions.
 * The card itself is played by sd-engine.js; sessions are built by sd-session.js.
 *
 * SAVE (per avatar, save-engine.js avatarScopedGet/Set, key "dunia-sd-v1"):
 *   { hist: { cardId: { seen, right, helped, last } }, stars: { world: n },
 *     stickers: [world...], sessions: [{ t, world, right, helped }] }
 * SETTINGS (shared by the device, key "dunia-sd-settings"):
 *   { mode: 'auto'|'tap'|'parent'|'self', voice, sfx, music, rm }
 * Settings never touch progress (PRD AC 4). Audio failure never blocks play.
 * ==========================================================================*/
(function () {
  'use strict'
  var D = window.SDCards, E = window.SDEngine
  var $ = function (id) { return document.getElementById(id) }
  var BASE = (function () { try { return location.pathname.indexOf('/Dunia-Emosi/') === 0 ? '/Dunia-Emosi/' : '/' } catch (e) { return '/' } })()
  var KEY = 'dunia-sd-v1', SKEY = 'dunia-sd-settings'

  /* ── storage ─────────────────────────────────────────────────────────── */
  function load () {
    var raw = null
    try { raw = window.avatarScopedGet ? avatarScopedGet(KEY, null) : localStorage.getItem(KEY) } catch (e) {}
    try { var v = JSON.parse(raw || 'null'); if (v && typeof v === 'object') return fill(v) } catch (e) {}
    return fill({})
  }
  function fill (v) { v.hist = v.hist || {}; v.stars = v.stars || {}; v.stickers = v.stickers || []; v.sessions = v.sessions || []; return v }
  function save () {
    try { var s = JSON.stringify(P); if (window.avatarScopedSet) avatarScopedSet(KEY, s); else localStorage.setItem(KEY, s) } catch (e) {}
  }
  function loadSet () {
    var d = { mode: 'auto', voice: true, sfx: true, music: false, rm: false }
    try { var v = JSON.parse(localStorage.getItem(SKEY) || '{}'); for (var k in d) if (v[k] !== undefined) d[k] = v[k] } catch (e) {}
    return d
  }
  function saveSet () { try { localStorage.setItem(SKEY, JSON.stringify(SET)) } catch (e) {} }
  var P = load(), SET = loadSet()
  function reduced () { return SET.rm || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) }
  function applyRM () { document.documentElement.classList.toggle('rm', !!SET.rm) }
  applyRM()

  /* ── audio: narration clips (pre-rendered, ASR-verified) + synth SFX ─── */
  var AUD = window.SDAudio || { has: function () { return false } }
  var cur = null, curFin = null, tapRun = 0
  // THE narration gate: every clip (story, question, hints, feedback lines, explanation,
  // replay) goes through say(), and say() plays only when this says yes. Checked at the
  // moment a clip would START, so a queued timer that fires after muting stays silent.
  //   auto: narrate as the story plays; tap: only inside a tap the child made (speaker
  //   replay run); parent/self or narration OFF: never.
  function voiceActive () { return SET.voice && (SET.mode === 'auto' || SET.mode === 'tap') }
  function mayNarrate () { return voiceActive() && (SET.mode === 'auto' || tapRun > 0) }
  function say (key) {
    // Resolves when the clip ends, fails, is skipped — or is stopped by muting.
    return new Promise(function (resolve) {
      if (!key || !mayNarrate() || !AUD.has(key)) return resolve()
      try {
        stopVoice()
        var a = new Audio(BASE + 'assets/sd/audio/' + key.replace(':', '/') + '.webm'), t = null
        var done = false, fin = function () {
          if (done) return; done = true; clearTimeout(t)
          if (cur === a) { cur = null; curFin = null; $('btn-voice').classList.remove('speaking') }
          resolve()
        }
        cur = a; curFin = fin
        a.onended = fin; a.onerror = fin
        $('btn-voice').classList.add('speaking')
        var p = a.play(); if (p && p.catch) p.catch(fin)
        t = setTimeout(fin, 12000)
      } catch (e) { resolve() }
    })
  }
  // stop the clip that is playing NOW and release whatever was waiting on it (the story
  // carries on at reading pace instead of hanging on a clip that will never end)
  function stopVoice () {
    var a = cur, f = curFin; cur = null; curFin = null
    try { if (a) { a.onended = null; a.onerror = null; a.pause(); a.currentTime = 0 } } catch (e) {}
    $('btn-voice').classList.remove('speaking')
    if (f) f()
  }
  // the speaker on the play screen IS the narration switch: speaker = on, speaker+X = off
  function paintVoice () {
    var on = voiceActive(), b = $('btn-voice')
    b.classList.toggle('muted', !on); b.setAttribute('aria-pressed', on ? 'true' : 'false')
    b.setAttribute('aria-label', 'Suara narasi: ' + (on ? 'nyala' : 'mati'))
    document.querySelectorAll('[data-opt="voice"]').forEach(function (x) { x.classList.toggle('on', !!SET.voice); x.setAttribute('aria-pressed', !!SET.voice) })
  }
  function applyVoice () { if (!voiceActive()) stopVoice(); paintVoice() }
  paintVoice()
  function clipKey (card, part) { return card.id + '-' + part }
  var AC = null
  function ctx () { if (!AC) { var C = window.AudioContext || window.webkitAudioContext; if (C) AC = new C() } if (AC && AC.state === 'suspended') AC.resume(); return AC }
  function tone (f, t0, dur, type, vol) {
    var c = ctx(); if (!c) return
    var o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine'; o.frequency.value = f
    g.gain.setValueAtTime(0.0001, c.currentTime + t0); g.gain.exponentialRampToValueAtTime(vol || 0.12, c.currentTime + t0 + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t0 + dur); o.connect(g); g.connect(c.destination); o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + dur + 0.05)
  }
  function sfx (n) {
    if (!SET.sfx) return
    try {
      if (n === 'tap') tone(660, 0, 0.06, 'triangle', 0.07)
      else if (n === 'drop') { tone(520, 0, 0.08, 'triangle', 0.1); tone(780, 0.07, 0.1, 'triangle', 0.08) }
      else if (n === 'good') { tone(523, 0, 0.12, 'sine', 0.14); tone(659, 0.1, 0.12, 'sine', 0.14); tone(784, 0.2, 0.2, 'sine', 0.14) }
      else if (n === 'hint') tone(880, 0, 0.12, 'sine', 0.08)
      else if (n === 'star') { tone(988, 0, 0.1, 'sine', 0.1); tone(1319, 0.08, 0.16, 'sine', 0.1) }
    } catch (e) {}
  }
  // gentle ambient bed (optional, off by default; ducks under narration via low volume)
  var mus = null
  function music (onOff) {
    if (!onOff || !SET.music) { if (mus) { try { mus.stop() } catch (e) {} mus = null } return }
    if (mus) return
    var c = ctx(); if (!c) return
    var g = c.createGain(); g.gain.value = 0.025; g.connect(c.destination)
    var notes = [262, 330, 392, 330], i = 0, alive = true
    ;(function loop () { if (!alive) return; var o = c.createOscillator(); o.type = 'sine'; o.frequency.value = notes[i++ % 4]; var gg = c.createGain(); gg.gain.setValueAtTime(0.0001, c.currentTime); gg.gain.exponentialRampToValueAtTime(1, c.currentTime + 0.4); gg.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 1.8); o.connect(gg); gg.connect(g); o.start(); o.stop(c.currentTime + 2); setTimeout(loop, 1600) })()
    mus = { stop: function () { alive = false; g.disconnect() } }
  }

  /* ── screens ─────────────────────────────────────────────────────────── */
  function show (id) {
    if (id === 'scr-card') paintVoice()
    document.querySelectorAll('.scr').forEach(function (s) { s.classList.toggle('active', s.id === id) })
    if (id !== 'scr-card') { E.stop(); stopVoice() }
  }
  function worldOf (k) { for (var i = 0; i < D.WORLDS.length; i++) if (D.WORLDS[i].key === k) return D.WORLDS[i]; return D.WORLDS[0] }
  function orient () { return innerWidth > innerHeight ? 'land' : 'port' }
  function worldBg (w) { return 'url("' + BASE + 'assets/db/lib/sd/world-' + w.bg + '-' + orient() + '.webp")' }
  function lib (k) { return (window.AssetIndex && AssetIndex.path(k)) || BASE + 'assets/db/lib/' + k + '.webp' }
  function doneIn (w) { return D.byWorld(w.key).filter(function (c) { return P.hist[c.id] && P.hist[c.id].right }).length }

  function buildMap () {
    $('world-grid').innerHTML = D.WORLDS.map(function (w) {
      return '<button class="world" type="button" data-w="' + w.key + '" aria-label="' + w.id + '">' +
        '<div class="wbg" style="background-image:url(\'' + BASE + 'assets/db/lib/sd/world-' + w.bg + '-land.webp\')"></div>' +
        '<div class="wprog"><img src="' + lib('game/star') + '" alt="">' + doneIn(w) + '/12</div>' +
        '<div class="wlab"><img src="' + lib(w.icon) + '" alt=""><b class="fk">' + w.id + '</b><small>' + w.skill + '</small></div></button>'
    }).join('')
    $('world-grid').querySelectorAll('.world').forEach(function (b) {
      b.addEventListener('click', function () { sfx('tap'); openWorld(b.dataset.w) })
    })
  }
  var WORLD = null
  function openWorld (k) {
    WORLD = worldOf(k)
    document.documentElement.style.setProperty('--wc', WORLD.color)
    $('scr-world').style.backgroundImage = worldBg(WORLD)
    $('w-icon').src = lib(WORLD.icon); $('w-name').textContent = WORLD.id; $('w-skill').textContent = WORLD.skill
    var cs = D.byWorld(WORLD.key)
    // the journey shows ONLY what can be played (no "coming soon" stones — owner rule)
    var firstOpen = -1
    $('w-journey').innerHTML = cs.map(function (c, k) {
      var ok = P.hist[c.id] && P.hist[c.id].right
      if (!ok && firstOpen < 0) firstOpen = k
      return '<span class="stop' + (ok ? ' done' : (k === firstOpen ? ' next' : '')) + '" title="' + c.family + '" aria-label="' + (k + 1) + (ok ? ' selesai' : '') + '">' +
        (ok ? '<img src="' + lib('game/star') + '" alt="">' : String(k + 1)) + '</span>'
    }).slice(0, 12).join('')
    var n = doneIn(WORLD)
    $('w-prog').textContent = n === 12 ? 'Semua 12 petualangan selesai! Main lagi untuk berlatih.' : n + ' dari 12 petualangan selesai.'
    show('scr-world')
  }
  function openIntro () {
    $('scr-intro').style.backgroundImage = worldBg(WORLD)
    $('i-icon').src = lib(WORLD.icon); $('i-world').textContent = WORLD.id; $('i-skill').textContent = WORLD.skill
    show('scr-intro')
  }

  /* ── session ─────────────────────────────────────────────────────────── */
  var SES = null
  function startSession () {
    var cards = SDSession.build(D.CARDS, WORLD.key, { seed: Date.now() & 0x7fffffff, history: P.hist })
    SES = { world: WORLD, cards: cards, i: 0, right: 0, helped: 0 }
    $('dots').innerHTML = cards.map(function () { return '<span class="dot"></span>' }).join('')
    show('scr-card')
    playCard()
  }
  function paintDots () {
    $('dots').querySelectorAll('.dot').forEach(function (d, k) { d.classList.toggle('done', k < SES.i); d.classList.toggle('cur', k === SES.i) })
  }
  function sceneBg (card) {
    var s = card.scene || 'world'
    // the stage is wider than tall in both orientations, so it always takes the
    // LANDSCAPE art (the portrait art in a wide box zoomed in on the sign)
    if (s.indexOf('g27:') === 0) return 'url("' + BASE + 'assets/spelling/scenes/' + s.slice(4) + '-land.webp")'
    var key = s.indexOf('world-') === 0 ? ({ memory: 'memory-mountain', number: 'number-island' })[s.slice(6)] : SES.world.bg
    return 'url("' + BASE + 'assets/db/lib/sd/world-' + key + '-land.webp")'
  }
  function playCard () {
    var card = SES.cards[SES.i]
    paintDots()
    $('stage-bg').style.backgroundImage = sceneBg(card)
    E.play(card, {
      reduced: reduced, sfx: sfx, say: say, clipKey: clipKey,
      onToken: flyToken
    }).then(function (res) {
      var h = P.hist[card.id] || (P.hist[card.id] = { seen: 0, right: 0, helped: 0, last: 0 })
      h.seen++; h.last = Date.now()
      if (res.correct) { h.right++; SES.right++ }
      if (res.helped) { h.helped++; SES.helped++ }
      save()
      SES.i++
      if (SES.i >= SES.cards.length) finish(); else playCard()
    })
  }
  function flyToken () {
    var dot = $('dots').children[SES.i]; if (!dot || reduced()) return
    var t = document.createElement('img'); t.className = 'token'; t.src = lib('game/star'); t.alt = ''
    var from = $('btn-check').getBoundingClientRect(), to = dot.getBoundingClientRect()
    t.style.left = (from.left + from.width / 2 - 17) + 'px'; t.style.top = (from.top - 10) + 'px'
    document.body.appendChild(t)
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      t.style.transform = 'translate(' + (to.left - from.left - from.width / 2 + 17 - 8) + 'px,' + (to.top - from.top + 10) + 'px) scale(.6)'; t.style.opacity = '.2'
    }) })
    setTimeout(function () { t.remove(); dot.classList.add('done'); sfx('star') }, 600)
  }
  function finish () {
    var w = SES.world, stars = SES.right >= 5 ? 3 : SES.right >= 3 ? 2 : 1   // effort is rewarded too (PRD §13)
    P.stars[w.key] = Math.max(P.stars[w.key] || 0, stars)
    var newSticker = P.stickers.indexOf(w.key) < 0
    if (newSticker) P.stickers.push(w.key)
    P.sessions.push({ t: Date.now(), world: w.key, right: SES.right, helped: SES.helped })
    if (P.sessions.length > 60) P.sessions = P.sessions.slice(-60)
    save()
    try { if (window.saveLevelProgress) saveLevelProgress(28, 1, stars) } catch (e) {}
    $('scr-done').style.backgroundImage = worldBg(w)
    $('d-stars').innerHTML = [0, 1, 2].map(function (k) { return '<img src="' + lib(k < stars ? 'game/star' : 'game/star') + '" alt="" style="' + (k < stars ? '' : 'filter:grayscale(1);opacity:.35') + '">' }).join('')
    $('d-sticker').src = lib(w.icon)
    $('d-sub').textContent = SES.right + ' dari 5 kartu kamu jawab benar. ' + (newSticker ? 'Kamu mendapat stiker ' + w.id + '!' : 'Terus berlatih, kamu makin pintar!')
    show('scr-done'); sfx('good')
  }

  /* ── parent gate + settings ──────────────────────────────────────────── */
  var gateSeq = [], holdT = null
  var SHAPES = { c: '<circle cx="22" cy="22" r="18" fill="#E53935"/>', t: '<polygon points="22,4 40,38 4,38" fill="#1E88E5"/>', s: '<rect x="5" y="5" width="34" height="34" rx="3" fill="#43A047"/>' }
  function openGate () {
    gateSeq = []
    var order = ['s', 'c', 't']                         // shown shuffled; the ask is circle → triangle → square
    $('gate-shapes').innerHTML = order.map(function (k) { return '<button type="button" data-k="' + k + '" aria-label="' + ({ c: 'lingkaran', t: 'segitiga', s: 'persegi' })[k] + '"><svg viewBox="0 0 44 44">' + SHAPES[k] + '</svg></button>' }).join('')
    $('gate-shapes').querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        var want = ['c', 't', 's'][gateSeq.length]
        if (b.dataset.k === want) { gateSeq.push(want); b.classList.add('ok'); if (gateSeq.length === 3) passGate() }
        else { gateSeq = []; $('gate-shapes').querySelectorAll('button').forEach(function (x) { x.classList.remove('ok') }) }
      })
    })
    $('ov-gate').classList.add('show')
  }
  function passGate () { $('ov-gate').classList.remove('show'); openParent() }
  var hb = $('gate-hold')
  function holdStart (e) { e.preventDefault(); var i = hb.querySelector('i'); i.style.transition = 'width 3s linear'; i.style.width = '100%'; holdT = setTimeout(passGate, 3000) }
  function holdEnd () { clearTimeout(holdT); var i = hb.querySelector('i'); i.style.transition = 'none'; i.style.width = '0' }
  hb.addEventListener('pointerdown', holdStart); hb.addEventListener('pointerup', holdEnd); hb.addEventListener('pointerleave', holdEnd); hb.addEventListener('pointercancel', holdEnd)

  var MODES = [['auto', 'Baca Otomatis'], ['tap', 'Ketuk untuk Dengar'], ['parent', 'Dibacakan Orang Tua'], ['self', 'Baca Sendiri']]
  function openParent () {
    var weekAgo = Date.now() - 7 * 864e5
    var wk = P.sessions.filter(function (s) { return s.t > weekAgo })
    var cardsDone = Object.keys(P.hist).length
    var helped = Object.keys(P.hist).reduce(function (n, k) { return n + (P.hist[k].helped || 0) }, 0)
    $('par-sum').innerHTML = '<div><b>' + wk.length + '</b>sesi minggu ini</div><div><b>' + cardsDone + '</b>kartu dicoba</div><div><b>' + helped + '</b>kali pakai petunjuk</div>'
    var strong = D.WORLDS.filter(function (w) { return doneIn(w) >= 6 }).map(function (w) { return w.skill })
    var revisit = D.WORLDS.filter(function (w) { var cs = D.byWorld(w.key); return cs.some(function (c) { return P.hist[c.id] && P.hist[c.id].helped > P.hist[c.id].right }) }).map(function (w) { return w.skill })
    $('par-skills').textContent = (strong.length ? 'Mulai kuat: ' + strong.join(', ') + '. ' : '') + (revisit.length ? 'Bagus untuk diulang bersama: ' + revisit.join(', ') + '.' : cardsDone ? '' : 'Belum ada sesi. Ajak anak bermain satu petualangan singkat.')
    $('seg-mode').innerHTML = MODES.map(function (m) { return '<button type="button" data-m="' + m[0] + '" class="' + (SET.mode === m[0] ? 'on' : '') + '">' + m[1] + '</button>' }).join('')
    $('seg-mode').querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { SET.mode = b.dataset.m; saveSet(); applyVoice(); openParent() }) })
    document.querySelectorAll('[data-opt]').forEach(function (b) { b.classList.toggle('on', !!SET[b.dataset.opt]); b.setAttribute('aria-pressed', !!SET[b.dataset.opt]) })
    $('ov-parent').classList.add('show')
  }
  document.querySelectorAll('[data-opt]').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.dataset.opt; SET[k] = !SET[k]; saveSet(); b.classList.toggle('on', SET[k]); b.setAttribute('aria-pressed', SET[k])
      if (k === 'rm') applyRM(); if (k === 'music') music(SET.music); if (k === 'voice') applyVoice()
    })
  })
  $('btn-reset').addEventListener('click', function () { $('ov-confirm').classList.add('show') })
  $('btn-reset-yes').addEventListener('click', function () {
    P = fill({}); save(); $('ov-confirm').classList.remove('show'); $('ov-parent').classList.remove('show'); buildMap(); show('scr-home')
  })

  /* ── wiring ──────────────────────────────────────────────────────────── */
  function onc (id, fn) { $(id).addEventListener('click', fn) }
  onc('btn-start', function () { ctx(); sfx('tap'); music(true); buildMap(); var next = D.WORLDS.filter(function (w) { return doneIn(w) < 12 })[0] || D.WORLDS[0]; openWorld(next.key) })
  onc('btn-worlds', function () { ctx(); sfx('tap'); music(true); buildMap(); show('scr-map') })
  onc('btn-parent', function () { sfx('tap'); openGate() })
  onc('btn-exit', function () { location.href = '../index.html' })
  onc('btn-session', function () { sfx('tap'); openIntro() })
  onc('btn-go', function () { sfx('tap'); startSession() })
  onc('btn-again', function () { sfx('tap'); startSession() })
  onc('btn-check', function () { E.check() })
  onc('btn-hint', function () { E.hint() })
  onc('btn-next', function () { sfx('tap'); stopVoice(); E.next() })
  onc('btn-replay', function () {
    // replay the story (and then the question); in "Ketuk untuk Dengar" this tap is what
    // allows the narration, for the whole run — not just its first line
    sfx('tap'); stopVoice()
    var st = E._state(); if (!st) return
    tapRun++
    var run = E.replay(), my = st.replayRun, end = function () { tapRun = Math.max(0, tapRun - 1) }
    ;(run && run.then ? run : Promise.resolve()).then(function () { if (E._state() === st && st.alive && st.replayRun === my) return say(clipKey(st.card, 'q')) }).then(end, end)
  })
  onc('btn-voice', function () {
    // narration on/off, right on the play screen (owner: tap the speaker; X = off).
    // Turning it on from "Dibacakan Orang Tua"/"Baca Sendiri" switches to Baca Otomatis.
    sfx('tap')
    if (voiceActive()) SET.voice = false
    else { SET.voice = true; if (SET.mode !== 'auto' && SET.mode !== 'tap') SET.mode = 'auto' }
    saveSet(); applyVoice()
  })
  onc('btn-quit', function () { $('ov-quit').classList.add('show') })
  onc('btn-quit-yes', function () { $('ov-quit').classList.remove('show'); E.stop(); stopVoice(); buildMap(); show('scr-map') })
  document.querySelectorAll('[data-go]').forEach(function (b) { b.addEventListener('click', function () { sfx('tap'); if (b.dataset.go === 'scr-map') buildMap(); show(b.dataset.go) }) })
  document.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', function () { $(b.dataset.close).classList.remove('show') }) })
  $('scr-home').style.backgroundImage = 'url("' + BASE + 'assets/db/lib/sd/world-story-forest-' + orient() + '.webp")'
  // deep link from the map (e.g. Menara Memori -> ?world=memory): open that world directly
  ;(function () {
    var m = /[?&]world=([a-z]+)/.exec(location.search)
    if (m && D.WORLDS.some(function (w) { return w.key === m[1] })) { buildMap(); openWorld(m[1]) }
  })()
  window.addEventListener('resize', function () {
    var a = document.querySelector('.scr.active'); if (!a) return
    if (a.id === 'scr-home') a.style.backgroundImage = 'url("' + BASE + 'assets/db/lib/sd/world-story-forest-' + orient() + '.webp")'
    if (WORLD && /scr-(world|intro|done)/.test(a.id)) a.style.backgroundImage = worldBg(WORLD)
    if (a.id === 'scr-card' && SES) $('stage-bg').style.backgroundImage = sceneBg(SES.cards[Math.min(SES.i, SES.cards.length - 1)])
  })
  document.addEventListener('visibilitychange', function () { if (document.hidden) { stopVoice(); music(false) } else if (SET.music) music(true) })

  /* OFFLINE: once the page is open online, warm every picture, background and verified
     narration clip the cards use — a few at a time, when the browser is idle — so a whole
     session works offline later (PRD §15). Same approach as G27: a plain fetch() (no Range
     header) gets a 200 the service worker can cache. */
  var warmed = false
  function warmList () {
    var u = {}
    function add (x) { if (x) u[x] = 1 }
    D.CARDS.forEach(function (c) {
      ;(c.beats || []).forEach(function (b) { if (b.s && b.s.indexOf('shape:') && b.s.indexOf('text:')) add(E.src(b.s)) })
      ;(c.options || []).concat(c.left || [], c.right || [], c.target ? [c.target] : []).forEach(function (o) { if (o.s && o.s.indexOf('shape:') && o.s.indexOf('text:')) add(E.src(o.s)) })
      if (c.scene && c.scene.indexOf('g27:') === 0) add(BASE + 'assets/spelling/scenes/' + c.scene.slice(4) + '-land.webp')
    })
    D.WORLDS.forEach(function (w) { add(BASE + 'assets/db/lib/sd/world-' + w.bg + '-land.webp'); add(BASE + 'assets/db/lib/sd/world-' + w.bg + '-port.webp'); add(lib(w.icon)) })
    ;['sd/explorer', 'sd/adventurer', 'game/star', 'nature/cloud'].forEach(function (k) { add(lib(k)) })
    add(BASE + 'assets/spelling/prop/truck.webp'); add(BASE + 'assets/spelling/prop/digger.webp'); add(BASE + 'assets/spelling/prop/barrier.webp')
    Object.keys((window.SDAudio && SDAudio.keys) || {}).forEach(function (k) { add(BASE + 'assets/sd/audio/' + k.replace(':', '/') + '.webm') })
    return Object.keys(u)
  }
  function warm () {
    if (warmed || window.__SD_NO_WARM || !navigator.onLine || !('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return
    warmed = true
    var list = warmList(), i = 0
    function next () { if (i >= list.length) return; fetch(list[i++], { cache: 'no-cache' }).catch(function () {}).then(function () { setTimeout(next, 30) }) }
    for (var k = 0; k < 3; k++) next()
  }
  if ('serviceWorker' in navigator) {
    var go = function () { (window.requestIdleCallback || function (f) { setTimeout(f, 1500) })(function () { try { warm() } catch (e) {} }, { timeout: 4000 }) }
    navigator.serviceWorker.ready.then(go).catch(function () {})
    navigator.serviceWorker.addEventListener('controllerchange', go)
  }

  /* test seam — the QA gates drive real screens through this */
  window.__sd = {
    state: function () { var st = E._state(); return { screen: (document.querySelector('.scr.active') || {}).id, card: st && st.card.id, attempts: st && st.attempts, hints: st && st.hints, locked: st && st.locked, i: SES && SES.i, cards: SES && SES.cards.map(function (c) { return c.id }) } },
    openWorld: openWorld, startSession: startSession,
    playOnly: function (id, worldKey) {                  // a session of exactly this card
      WORLD = worldOf(worldKey || D.find(id).world)
      SES = { world: WORLD, cards: [D.find(id)], i: 0, right: 0, helped: 0 }
      $('dots').innerHTML = '<span class="dot"></span>'; show('scr-card'); playCard(); return 'ok'
    },
    progress: function () { return JSON.parse(JSON.stringify(P)) }, settings: function () { return JSON.parse(JSON.stringify(SET)) },
    reset: function () { P = fill({}); save(); return 'ok' }, warmList: warmList, warmed: function () { return warmed }, set: function (k, v) { SET[k] = v; saveSet(); applyRM(); applyVoice(); return SET }
  }
})()
