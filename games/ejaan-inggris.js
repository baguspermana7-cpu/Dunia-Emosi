/* ============================================================================
 * G27 Spelling Adventure — logic.
 *
 * DRAG-DROP ON A TABLET. One Pointer-Events path covers mouse, pen and touch;
 * `touch-action:none` on a tile stops the browser stealing the gesture as a
 * scroll. Tap-to-place is kept alongside deliberately: a child who cannot
 * drag must still be able to finish the word (tap a tile, then a slot — or
 * just tap a tile and it goes into the first empty slot).
 *
 * AUDIO. Pre-rendered clips (assets/spelling/audio) — never Web Speech, whose
 * voice differs on every device and which the owner already switched off once
 * for mangling text. Browsers refuse audio before a gesture, so the first tap
 * unlocks it. Sound effects are synthesised with WebAudio (no files, offline).
 *
 * LEVELS ARE DRILLS, NOT LOCKS — "semua kata di level 1 dan level 2, bisa
 * diulang2, utk persiapan lomba". Nothing is ever locked behind a score.
 * ==========================================================================*/
(function () {
  'use strict'
  var D = window.SpellingData
  var $ = function (id) { return document.getElementById(id) }
  var BASE = (function () {
    try { var s = document.currentScript && document.currentScript.src
          if (s) return new URL('..', s).href } catch (e) {}
    return new URL('../', location.href).href
  })()
  var url = function (p) { return BASE + 'assets/spelling/' + p }
  var cap = function (w) { return w.charAt(0).toUpperCase() + w.slice(1) }

  /* ── settings + progress (per avatar, via save-engine) ─────────────── */
  var SKEY = 'dunia-g27-spelling'
  function readStore () {
    try {
      var raw = (typeof avatarScopedGet === 'function') ? avatarScopedGet(SKEY, null) : localStorage.getItem(SKEY)
      var o = raw ? JSON.parse(raw) : null
      if (!o || typeof o !== 'object') throw 0
      if (!o.stars || typeof o.stars !== 'object') o.stars = {}
      if (!o.opt || typeof o.opt !== 'object') o.opt = {}
      return o
    } catch (e) { return { stars: {}, opt: {} } }
  }
  function writeStore () {
    try {
      var s = JSON.stringify(ST)
      if (typeof avatarScopedSet === 'function') avatarScopedSet(SKEY, s)
      else localStorage.setItem(SKEY, s)
    } catch (e) {}
  }
  var ST = readStore()
  var DEFAULTS = { sfx: true, music: false, voice: true, hint: true }
  function opt (k) { return (k in ST.opt) ? !!ST.opt[k] : DEFAULTS[k] }
  function setOpt (k, v) { ST.opt[k] = !!v; writeStore() }
  function starsOf (w) { return ST.stars[w] || 0 }
  function award (w, n) { if (n > starsOf(w)) { ST.stars[w] = n; writeStore() } }   // best only
  function totalStars () { var t = 0; for (var k in ST.stars) t += ST.stars[k] || 0; return t }
  function earned (pool) { return pool.reduce(function (t, x) { return t + (starsOf(x.w) ? 1 : 0) }, 0) }

  /* ── audio: clips ──────────────────────────────────────────────────── */
  var cache = {}, unlocked = false, current = null, seq = 0
  function clip (kind, name) {
    var key = kind + '/' + name
    if (!cache[key]) { var a = new Audio(url('audio/' + key + '.webm')); a.preload = 'auto'; cache[key] = a }
    return cache[key]
  }
  function unlock () {
    if (unlocked) return
    unlocked = true
    try {
      var a = clip('letters', 'a'); a.muted = true
      var p = a.play()
      if (p && p.then) p.then(function () { a.pause(); a.currentTime = 0; a.muted = false }).catch(function () { a.muted = false })
    } catch (e) {}
    try { ctx() } catch (e) {}
    if (opt('music')) music(true)
  }
  /* OFFLINE VOICE. An <audio> element fetches with a Range header; a real
     host (GitHub Pages) answers 206 Partial Content, and the service worker
     only caches whole 200 responses — so a clip that was only ever PLAYED
     online is not in the cache and the spelling voice goes silent offline.
     A plain fetch() carries no Range header, gets a 200, and the worker caches
     it; the audio element's later Range request then matches it by URL.
     So once the page is open online, warm every clip and word picture
     (~450 KB, 90 files), a few at a time, when the browser is idle. */
  var warmed = false
  function warmClips () {
    // __G27_NO_WARM: test seam, lets the offline gate prove the gap this closes
    if (warmed || window.__G27_NO_WARM || !navigator.onLine || !('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return
    warmed = true
    // every clip, and every word's picture: a word the child never opened
    // online must still show what it means offline
    var urls = D.WORDS.map(function (x) { return url('audio/words/' + x.w + '.webm') })
      .concat('abcdefghijklmnopqrstuvwxyz'.split('').map(function (c) { return url('audio/letters/' + c + '.webm') }))
      .concat(D.WORDS.map(function (x) { return picURL(x) }))
    var i = 0
    function next () {
      if (i >= urls.length) return
      var u = urls[i++]
      fetch(u, { cache: 'no-cache' }).catch(function () {}).then(function () { setTimeout(next, 30) })
    }
    for (var k = 0; k < 3; k++) next()
  }
  function scheduleWarm () {
    var go = function () { try { warmClips() } catch (e) {} }
    if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 4000 }); else setTimeout(go, 1500)
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(scheduleWarm).catch(function () {})
    navigator.serviceWorker.addEventListener('controllerchange', scheduleWarm)
  }

  function stopAudio () {
    seq++                                            // cancels any running sequence
    try { if (current) { current.onended = null; current.pause(); current.currentTime = 0 } } catch (e) {}
    current = null; wave(false)
  }
  function play (kind, name, done) {
    if (!opt('voice')) { if (done) done(); return }
    try { if (current) { current.onended = null; current.pause() } } catch (e) {}
    var a = clip(kind, name); current = a
    var finished = false
    var fin = function () { if (finished) return; finished = true; a.onended = null; if (done) done() }
    try {
      a.currentTime = 0
      var p = a.play()
      if (p && p.catch) p.catch(fin)
    } catch (e) { fin(); return }
    a.onended = fin
    // a clip that never fires 'ended' (blocked, decode error) must not hang a sequence
    setTimeout(fin, Math.max(1400, ((a.duration && isFinite(a.duration)) ? a.duration : 1) * 1000 + 500))
  }
  /* say the word, then spell it letter by letter */
  function sayAndSpell (word, after) {
    var my = ++seq
    wave(true)
    play('words', word, function () {
      if (my !== seq) return
      var i = 0
      ;(function step () {
        if (my !== seq) return
        if (i >= word.length) { wave(false); if (after) after(); return }
        play('letters', word[i++], function () { if (my === seq) setTimeout(step, 110) })
      })()
    })
  }
  function wave (on) { var w = $('wave'); if (w) w.classList.toggle('on', !!on); var l = $('btn-listen'); if (l) l.classList.toggle('speaking', !!on) }

  /* ── audio: synthesised sound effects (no files) ───────────────────── */
  var AC = null
  function ctx () {
    if (!AC) { var C = window.AudioContext || window.webkitAudioContext; if (C) AC = new C() }
    if (AC && AC.state === 'suspended') AC.resume()
    return AC
  }
  function tone (freq, t0, dur, type, vol) {
    var c = ctx(); if (!c) return
    var o = c.createOscillator(), g = c.createGain()
    o.type = type || 'sine'; o.frequency.value = freq
    g.gain.setValueAtTime(0.0001, c.currentTime + t0)
    g.gain.exponentialRampToValueAtTime(vol || 0.18, c.currentTime + t0 + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t0 + dur)
    o.connect(g); g.connect(c.destination); o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + dur + 0.02)
  }
  function sfx (kind) {
    if (!opt('sfx')) return
    try {
      if (kind === 'pop') tone(660, 0, 0.09, 'triangle', 0.14)
      else if (kind === 'good') { tone(784, 0, 0.12, 'triangle'); tone(1047, 0.08, 0.16, 'triangle') }
      else if (kind === 'bad') tone(180, 0, 0.22, 'sawtooth', 0.08)
      else if (kind === 'win') [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.11, 0.22, 'triangle', 0.16) })
      else if (kind === 'click') tone(520, 0, 0.05, 'square', 0.05)
    } catch (e) {}
  }

  /* ── background music (off by default; starts only after a tap) ───── */
  var BGM = null
  function music (on) {
    try {
      if (!BGM) { BGM = new Audio(BASE + 'assets/audio/math-bgm.mp3'); BGM.loop = true; BGM.volume = 0.22 }
      if (on && unlocked) { var p = BGM.play(); if (p && p.catch) p.catch(function () {}) } else BGM.pause()
    } catch (e) {}
    var b = $('btn-music'); if (b) b.style.opacity = on ? '1' : '.6'
  }

  /* ── characters: sized by the rule in CSS, never over a control ───────
     Width comes from the owner's rule (a share of the screen). In LANDSCAPE
     the screens reserve side room so content sits between the two
     characters, so they are never shrunk or hidden there — if one still
     touched a control that would be a layout bug, and qa-g27-visual fails it.
     In PORTRAIT a character may be hidden when a screen genuinely has no room
     (e.g. a 10-letter word on a 360x640 phone); the sign and the speech
     bubble are hidden whenever they would touch anything. */
  function blockersFor (root) {
    return [].slice.call(root.querySelectorAll('button, .tile, .slot, #logo, #tagline, #prompt, #meaning, #word-pic, #ok-title, #ok-pic, #ok-sub, #say-panel, #topbar'))
      .filter(function (el) { var cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' })
      .map(function (el) { return el.getBoundingClientRect() })
      .filter(function (r) { return r.width && r.height })
  }
  function touches (el, blockers) {
    var r = el.getBoundingClientRect()
    if (!r.width || !r.height) return false
    var k = el.classList.contains('g27-char') ? 0.06 : 0      // a sprite's transparent margin is not the character
    var a = { left: r.left + r.width * k, right: r.right - r.width * k, top: r.top + r.height * k, bottom: r.bottom - r.height * k }
    return blockers.some(function (b) { return !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top) })
  }
  function layoutChars () {
    var portrait = window.matchMedia ? matchMedia('(orientation:portrait)').matches : innerHeight > innerWidth
    var scr = document.querySelector('.scr.active'), ok = $('ov-ok')
    var celebrating = ok && ok.classList.contains('show')
    var root = celebrating ? ok : scr
    var chars = celebrating ? ['ok-truck', 'ok-digger'] : ['deco-truck', 'deco-digger']
    var extras = celebrating ? [] : ['title-sign', 'cheer-bubble']
    chars.concat(extras).forEach(function (id) { var e = $(id); if (e) e.classList.remove('no-room') })
    if (!root) return
    // the bubble sits above the truck's cab
    var tr = $('deco-truck'), bub = $('cheer-bubble')
    if (tr && bub && getComputedStyle(bub).display !== 'none') {
      var r = tr.getBoundingClientRect()
      bub.style.left = Math.round(r.left + r.width * 0.12) + 'px'
      bub.style.bottom = Math.round(innerHeight - r.top + 6) + 'px'
    }
    var blockers = blockersFor(root)
    extras.forEach(function (id) { var e = $(id); if (e && getComputedStyle(e).display !== 'none' && touches(e, blockers)) e.classList.add('no-room') })
    if (portrait) chars.forEach(function (id) { var e = $(id); if (e && getComputedStyle(e).display !== 'none' && touches(e, blockers)) e.classList.add('no-room') })
  }
  var placeDecor = layoutChars          // older call sites

  /* ── screens ───────────────────────────────────────────────────────── */
  function show (id) {
    var all = document.querySelectorAll('.scr')
    for (var i = 0; i < all.length; i++) all[i].classList.remove('active')
    var el = $(id); if (el) { el.classList.add('active'); el.scrollTop = 0 }
    document.body.setAttribute('data-scr', id)
    document.body.setAttribute('data-scene', sceneFor(id))
    layoutChars(); setTimeout(layoutChars, 80)
  }
  /* one scene per screen; words + play take their category's scene */
  var CAT_SCENE = { colors: 'park', school: 'classroom', everyday: 'bedroom', mixed: 'town', athome: 'bedroom', quran: 'night' }
  function sceneFor (id) {
    if (id === 'scr-title') return 'construction'
    if (id === 'scr-words' || id === 'scr-play') return CAT_SCENE[S.cat] || 'town'
    if (id === 'scr-progress') return 'sunrise'
    return 'town'
  }
  function openOv (id) { $(id).classList.add('show') }
  function closeOv (id) { $(id).classList.remove('show') }

  /* ── state ─────────────────────────────────────────────────────────── */
  var S = { cat: 'colors', level: 1, queue: [], idx: 0, word: null, placed: [], wrong: 0, solved: false }
  function catInfo (k) { return D.CATEGORIES.filter(function (c) { return c.key === k })[0] }
  function starRow (n) {
    var h = ''
    for (var i = 0; i < 3; i++) h += '<img src="' + url('ui/' + (i < n ? 'star' : 'star-empty') + '.webp') + '" alt="">'
    return h
  }
  function picURL (x) { return url(x.dir + '/' + x.pic + '.webp') }

  /* ── category screen ───────────────────────────────────────────────── */
  function buildCategories () {
    var g = $('cat-grid'); g.innerHTML = ''
    D.CATEGORIES.forEach(function (c) {
      var pool = D.list(c.key)
      var d = document.createElement('div')
      d.className = 'card cat-' + c.key + (c.ready ? '' : ' locked')
      d.setAttribute('role', 'button')
      d.innerHTML = '<img class="cico" src="' + url('cat/' + c.icon + '.webp') + '" alt="">' +
        '<div class="cname">' + c.name + '</div>' +
        (c.ready ? '<div class="cmeta"><img src="' + url('ui/star.webp') + '" alt="">' + earned(pool) + '/' + pool.length + '</div>'
                 : '<div class="cmeta">Segera Hadir</div>')
      if (c.ready) d.addEventListener('click', function () { unlock(); sfx('click'); S.cat = c.key; openWords(1) })
      g.appendChild(d)
    })
  }

  /* ── word list screen ──────────────────────────────────────────────── */
  function openWords (level) {
    S.level = level
    var cat = catInfo(S.cat)
    $('words-title').textContent = cat ? cat.name : S.cat
    $('lv1').classList.toggle('on', level === 1); $('lv1').setAttribute('aria-selected', level === 1)
    $('lv2').classList.toggle('on', level === 2); $('lv2').setAttribute('aria-selected', level === 2)
    var pool = D.list(S.cat, level)
    $('words-count').querySelector('span').textContent = earned(pool) + '/' + pool.length
    var g = $('word-grid'); g.innerHTML = ''
    pool.forEach(function (x, i) {
      var n = starsOf(x.w)
      var d = document.createElement('div')
      d.className = 'wcard' + (n ? ' done' : '')
      d.setAttribute('role', 'button')
      d.innerHTML = '<img class="wpic" src="' + picURL(x) + '" alt="">' +
                    '<div class="wname">' + cap(x.w) + '</div><div class="stars">' + starRow(n) + '</div>'
      d.addEventListener('click', function () { unlock(); sfx('click'); startQueue(pool, i) })
      g.appendChild(d)
    })
    var soon = document.createElement('div')
    soon.className = 'wcard soon'
    soon.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.4" fill="#F2B632"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="#B9831A" stroke-width="2.4" fill="none"/></svg><div>More<br>Coming Soon!</div>'
    g.appendChild(soon)
    show('scr-words')
  }

  /* ── play ──────────────────────────────────────────────────────────── */
  function startQueue (pool, from) {
    S.queue = pool.slice(); S.idx = from || 0
    show('scr-play'); loadWord()
    // images decode asynchronously; measure again once the picture has a size
    setTimeout(function () { fitGrids(); layoutChars() }, 120); setTimeout(function () { fitGrids(); layoutChars() }, 600)
  }
  function shuffled (letters) {
    var a = letters.slice()
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t }
    if (a.join('') === letters.join('') && a.length > 1) {    // never hand over the answer in order
      for (var k = 1; k < a.length; k++) if (a[k] !== a[0]) { var t2 = a[0]; a[0] = a[k]; a[k] = t2; break }
    }
    return a
  }
  var trayLetters = [], picked = null
  function loadWord () {
    stopAudio()
    var x = S.queue[S.idx]
    if (!x) { openWords(S.level); return }
    S.word = x; S.placed = new Array(x.w.length).fill(null); S.wrong = 0; S.solved = false
    trayLetters = shuffled(x.w.split('')); picked = null
    var cat = catInfo(S.cat)
    $('play-cat-ico').src = url('cat/' + (cat ? cat.icon : 'colors') + '.webp')
    $('play-cat-name').textContent = cat ? cat.name : ''
    $('play-count').textContent = (S.idx + 1) + ' / ' + S.queue.length
    $('play-stars').innerHTML = starRow(starsOf(x.w))
    $('word-pic').src = picURL(x); $('word-pic').alt = x.w
    $('meaning').textContent = x.id ? '(' + x.id + ')' : ''
    renderSlots(); renderTray(); fitGrids(); layoutChars()
    setTimeout(function () { if (S.word === x && !S.solved) sayAndSpell(x.w) }, 300)
  }
  /* Size the picture, slots and tiles from the REAL space, then MEASURE:
     a child must reach every letter without scrolling, in portrait and in a
     phone on its side. Width first — one row when every cell can stay
     >= 44 px (a fingertip), otherwise two balanced rows, never a ragged wrap —
     then shrink picture, then cells, until the play screen stops overflowing.
     Cells never go below 44 px. */
  var LAND = window.matchMedia ? matchMedia('(orientation:landscape) and (max-height:500px)') : { matches: false }
  function fitGrids () {
    if (!S.word || !$('scr-play').classList.contains('active')) return
    var host = LAND.matches ? $('stage-right') : $('stage')
    var W = Math.min(host.clientWidth || window.innerWidth, 720) - 4
    var n = S.word.w.length, small = W < 520
    var sg = small ? 7 : 10, tg = small ? 8 : 12
    function fit (maxSz, gap) {
      var cols = n, sz = Math.floor((W - gap * (cols - 1)) / cols)
      if (sz < 44) { cols = Math.ceil(n / 2); sz = Math.floor((W - gap * (cols - 1)) / cols) }
      return { cols: cols, sz: Math.max(44, Math.min(maxSz, sz)) }
    }
    var a = fit(small ? 60 : 70, sg), b = fit(small ? 66 : 80, tg)
    var sl = $('slots'), tr = $('tray'), pic = $('word-pic'), scr = $('scr-play')
    function apply (picPx) {
      sl.style.setProperty('--cols', a.cols); sl.style.setProperty('--sz', a.sz + 'px'); sl.style.setProperty('--gap', sg + 'px')
      tr.style.setProperty('--tcols', b.cols); tr.style.setProperty('--tsz', b.sz + 'px'); tr.style.setProperty('--tgap', tg + 'px')
      if (picPx) pic.style.setProperty('--pic', picPx + 'px'); else pic.style.removeProperty('--pic')
    }
    apply(0)
    var over = function () { return scr.scrollHeight - scr.clientHeight > 1 }
    var p = Math.round(pic.getBoundingClientRect().width) || 180
    for (var guard = 0; guard < 40 && over(); guard++) {
      if (p > 84) p -= 12
      else if (b.sz > 44 || a.sz > 44) { b.sz = Math.max(44, b.sz - 4); a.sz = Math.max(44, a.sz - 4) }
      else break
      apply(p)
    }
  }
  function fitOk () {
    fitOkWord()
    var ov = $('ov-ok'); if (!ov.classList.contains('show')) return
    var pic = $('ok-pic'), st = $('ok-stars')
    pic.style.removeProperty('--okpic'); st.style.removeProperty('--okstar')
    var p = Math.round(pic.getBoundingClientRect().width) || 150, s = 62
    for (var g = 0; g < 30 && ov.scrollHeight - ov.clientHeight > 1; g++) {
      if (p > 72) p -= 10; else if (s > 34) s -= 4; else break
      pic.style.setProperty('--okpic', p + 'px'); st.style.setProperty('--okstar', s + 'px')
    }
  }
  function fitOkWord () {
    if (!S.word) return
    var n = S.word.w.length, host = LAND.matches ? $('ok-right') : $('ov-ok')
    var W = Math.min((host.clientWidth || window.innerWidth) - 28, 640), gap = 8
    var cols = n, sz = Math.floor((W - gap * (cols - 1)) / cols)
    if (sz < 38) { cols = Math.ceil(n / 2); sz = Math.floor((W - gap * (cols - 1)) / cols) }
    sz = Math.max(36, Math.min(58, sz))
    var ok = $('ok-word'); ok.style.setProperty('--okc', cols); ok.style.setProperty('--oks', sz + 'px')
  }
  window.addEventListener('orientationchange', function () { setTimeout(function () { fitGrids(); fitOk(); placeDecor() }, 250) })
  if (LAND.addEventListener) LAND.addEventListener('change', function () { fitGrids(); fitOk() })
  window.addEventListener('resize', function () { fitGrids(); fitOk(); placeDecor() })
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeDecor)
  window.addEventListener('load', placeDecor)

  function renderSlots () {
    var s = $('slots'); s.innerHTML = ''
    S.word.w.split('').forEach(function (ch, i) {
      var d = document.createElement('div')
      d.className = 'slot' + (S.placed[i] ? ' filled' : '')
      d.dataset.i = String(i)
      d.textContent = S.placed[i] ? S.placed[i].toUpperCase() : ''
      d.addEventListener('click', function () {
        if (S.solved) return
        if (S.placed[i]) { S.placed[i] = null; sfx('pop'); renderSlots(); renderTray() }  // take it back
        else if (picked != null) placeAt(i, trayLetters[picked])
      })
      s.appendChild(d)
    })
  }
  function renderTray () {
    var t = $('tray'); t.innerHTML = ''
    var usedCount = {}
    S.placed.forEach(function (c) { if (c) usedCount[c] = (usedCount[c] || 0) + 1 })
    var seen = {}
    trayLetters.forEach(function (ch, i) {
      seen[ch] = (seen[ch] || 0) + 1
      var used = seen[ch] <= (usedCount[ch] || 0)
      var d = document.createElement('div')
      d.className = 'tile' + (used ? ' used' : '') + (picked === i ? ' picked' : '')
      d.textContent = ch.toUpperCase()
      d.dataset.i = String(i); d.dataset.ch = ch
      if (!used) attachDrag(d, ch, i)
      t.appendChild(d)
    })
  }
  function firstEmpty () { for (var i = 0; i < S.placed.length; i++) if (!S.placed[i]) return i; return -1 }
  function placeAt (slot, letter) {
    if (slot < 0 || S.solved || letter == null || S.placed[slot]) return
    picked = null
    if (letter === S.word.w[slot]) {
      S.placed[slot] = letter
      renderSlots(); renderTray()
      var el = $('slots').children[slot]
      if (el) { el.classList.add('good'); setTimeout(function () { el.classList.remove('good') }, 320) }
      sfx('good')
      if (opt('voice')) play('letters', letter)
      if (S.placed.every(function (c) { return !!c })) setTimeout(win, 420)
    } else {
      S.wrong++
      sfx('bad')
      var bad = $('slots').children[slot]
      if (bad) { bad.classList.add('bad'); setTimeout(function () { bad.classList.remove('bad') }, 340) }
      renderTray()
    }
  }
  /* pointer drag: one path for mouse, pen and touch */
  function attachDrag (tile, ch, i) {
    tile.addEventListener('pointerdown', function (ev) {
      if (S.solved) return
      unlock(); ev.preventDefault()
      var startX = ev.clientX, startY = ev.clientY, ghost = null
      var slots = $('slots').children
      var move = function (e) {
        var far = Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY) > 8
        if (!ghost && far) {
          ghost = tile.cloneNode(true); ghost.classList.add('ghost')
          ghost.style.width = tile.offsetWidth + 'px'; ghost.style.height = tile.offsetHeight + 'px'
          document.body.appendChild(ghost); tile.style.opacity = '.35'
        }
        if (!ghost) return
        ghost.style.left = (e.clientX - ghost.offsetWidth / 2) + 'px'
        ghost.style.top = (e.clientY - ghost.offsetHeight / 2) + 'px'
        var el = document.elementFromPoint(e.clientX, e.clientY)
        var slot = el && el.closest ? el.closest('#slots .slot') : null
        for (var k = 0; k < slots.length; k++) slots[k].classList.toggle('hot', slots[k] === slot)
      }
      var up = function (e) {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        window.removeEventListener('pointercancel', up)
        for (var k = 0; k < slots.length; k++) slots[k].classList.remove('hot')
        tile.style.opacity = ''
        if (ghost) {
          if (ghost.parentNode) ghost.parentNode.removeChild(ghost)
          if (e.type === 'pointercancel') return
          var el = document.elementFromPoint(e.clientX, e.clientY)
          var slot = el && el.closest ? el.closest('#slots .slot') : null
          if (slot) placeAt(parseInt(slot.dataset.i, 10), ch)
        } else {
          // a TAP: the letter goes into the first empty slot
          sfx('pop'); placeAt(firstEmpty(), ch)
        }
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
      window.addEventListener('pointercancel', up)
    })
  }

  function confetti () {
    var c = $('confetti'); c.innerHTML = ''
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return
    var cols = ['#FF5A5F', '#FFC928', '#3FB8FF', '#58D35E', '#A66BFF', '#FF8A3D']
    for (var i = 0; i < 70; i++) {
      var p = document.createElement('i')
      p.style.left = (Math.random() * 100) + 'vw'
      p.style.background = cols[i % cols.length]
      p.style.animationDuration = (2.4 + Math.random() * 2.2) + 's'
      p.style.animationDelay = (Math.random() * 0.8) + 's'
      p.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)'
      c.appendChild(p)
    }
  }
  function win () {
    if (S.solved) return
    S.solved = true
    var n = S.wrong === 0 ? 3 : S.wrong <= 2 ? 2 : 1
    award(S.word.w, n)
    $('ok-title').textContent = n === 3 ? 'Amazing!' : n === 2 ? 'Good Job!' : 'Keep Trying!'
    $('ok-sub').textContent = n === 3 ? 'Well done!' : n === 2 ? 'Great spelling!' : 'You did it — try for 3 stars!'
    $('ok-pic').src = picURL(S.word)
    $('ok-word').innerHTML = S.word.w.split('').map(function (c) { return '<div class="slot filled">' + c.toUpperCase() + '</div>' }).join('')
    $('ok-stars').innerHTML = starRow(n)
    $('say-word').textContent = cap(S.word.w)
    $('next-lbl').textContent = (S.idx + 1 >= S.queue.length) ? 'Finish' : 'Next Word'
    document.body.classList.add('celebrate')
    $('ov-ok').classList.add('show'); fitOk(); layoutChars(); setTimeout(function () { fitOk(); layoutChars() }, 120)
    confetti(); sfx('win')
    setTimeout(function () { if (S.solved) sayAndSpell(S.word.w) }, 650)
  }
  function closeWin () {
    $('ov-ok').classList.remove('show'); document.body.classList.remove('celebrate'); $('confetti').innerHTML = ''
    setTimeout(layoutChars, 30)
    stopAudio()
  }
  function restartWord () {
    if (!S.word) return
    stopAudio()
    S.placed = new Array(S.word.w.length).fill(null); S.wrong = 0; S.solved = false
    trayLetters = shuffled(S.word.w.split('')); picked = null
    renderSlots(); renderTray()
  }

  function showHint () {
    if (!S.word) return
    var x = S.word
    $('hint-pic').src = picURL(x)
    $('hint-clue').textContent = x.clue || ''
    $('hint-id').textContent = x.id ? 'Artinya: ' + x.id + ' · ' + x.w.length + ' huruf' : ''
    $('hint-slots').innerHTML = x.w.split('').map(function (c, i) {
      var open = (i === 0 || i === x.w.length - 1)
      return '<div class="slot' + (open ? ' filled' : '') + '">' + (open ? c.toUpperCase() : '') + '</div>'
    }).join('')
    openOv('ov-hint')
    var hs = $('hint-slots'), W = (hs.clientWidth || 300) - 4, n = x.w.length, gap = 8
    var cols = n, sz = Math.floor((W - gap * (cols - 1)) / cols)
    if (sz < 36) { cols = Math.ceil(n / 2); sz = Math.floor((W - gap * (cols - 1)) / cols) }
    hs.style.setProperty('--hc', cols); hs.style.setProperty('--hs', Math.max(34, Math.min(52, sz)) + 'px')
  }

  /* ── progress + collection ─────────────────────────────────────────── */
  var BAR = { colors: '#58C45E', school: '#3E8EE8', everyday: '#FF9A2E', mixed: '#A66BFF' }
  function avatarSrc () {
    try {
      var a = JSON.parse(localStorage.getItem('dunia-active-slot') || '[0,1]')
      var slot = (Array.isArray(a) ? parseInt(a[0], 10) : 0) || 0
      var players = JSON.parse(localStorage.getItem('dunia-players') || '[]')
      var animal = players && players[slot] && players[slot].animal
      var spec = animal && window.EmojiMap && EmojiMap.spec ? EmojiMap.spec(animal) : null
      if (spec && spec.cat && spec.n) return BASE + 'assets/db/' + spec.cat + '/' + String(spec.n).padStart(3, '0') + '.webp'
    } catch (e) {}
    return url('ui/star.webp')
  }
  function playerName () {
    try {
      var a = JSON.parse(localStorage.getItem('dunia-active-slot') || '[0,1]')
      var slot = (Array.isArray(a) ? parseInt(a[0], 10) : 0) || 0
      var players = JSON.parse(localStorage.getItem('dunia-players') || '[]')
      var n = players && players[slot] && players[slot].name
      return n ? String(n).slice(0, 20) : ''
    } catch (e) { return '' }
  }
  function buildProgress () {
    $('avatar').src = avatarSrc()
    $('prog-name').textContent = playerName() || 'My Progress'
    var ready = D.CATEGORIES.filter(function (c) { return c.ready && !c.mixed })
    var all = D.list('mixed')
    $('prog-total').querySelector('span').textContent = earned(all) + ' / ' + all.length
    var l = $('prog-list'); l.innerHTML = ''
    ready.forEach(function (c) {
      var pool = D.list(c.key), got = earned(pool)
      var pct = pool.length ? Math.round(got / pool.length * 100) : 0
      var row = document.createElement('div'); row.className = 'prow'
      row.innerHTML = '<img src="' + url('cat/' + c.icon + '.webp') + '" alt="" style="width:34px;height:34px;object-fit:contain">' +
        '<span class="pname">' + c.name + '</span>' +
        '<div class="bar"><i style="width:' + pct + '%;background:' + (BAR[c.key] || '#58C45E') + '"></i></div>' +
        '<span class="cnt">' + got + '/' + pool.length + '</span>'
      l.appendChild(row)
    })
    var total = earned(all)
    $('great-txt').textContent = total === 0 ? 'Let’s start!' : total >= all.length ? 'Word Champion!' : 'Great Progress!'
    var coll = $('coll'); coll.innerHTML = ''
    var got = all.filter(function (x) { return starsOf(x.w) })
    if (!got.length) coll.innerHTML = '<div id="coll-empty">Belum ada kata. Main dulu, yuk!</div>'
    got.forEach(function (x) {
      var d = document.createElement('div'); d.className = 'wcard done'
      d.innerHTML = '<img class="wpic" src="' + picURL(x) + '" alt=""><div class="wname">' + x.w + '</div>'
      coll.appendChild(d)
    })
  }
  function buildParents () {
    var all = D.list('mixed')
    $('par-stars').textContent = String(totalStars())
    $('par-master').textContent = all.filter(function (x) { return starsOf(x.w) === 3 }).length + ' / ' + all.length
    $('reset-note').textContent = ''
    armed = false; $('btn-reset').textContent = 'Hapus kemajuan'
  }

  /* ── wiring ────────────────────────────────────────────────────────── */
  function on (id, fn) { var e = $(id); if (e) e.addEventListener('click', function (ev) { unlock(); fn(ev) }) }
  on('btn-play', function () { sfx('click'); buildCategories(); show('scr-category') })
  on('btn-open-settings', function () { sfx('click'); syncSwitches(); show('scr-settings') })
  on('btn-open-progress', function () { sfx('click'); buildProgress(); show('scr-progress') })
  on('btn-home-out', function () { stopAudio(); music(false); location.href = '../index.html' })
  on('btn-music', function () { setOpt('music', !opt('music')); music(opt('music')); syncSwitches() })
  on('lv1', function () { sfx('click'); openWords(1) })
  on('lv2', function () { sfx('click'); openWords(2) })
  on('btn-listen', function () { if (S.word) sayAndSpell(S.word.w) })
  on('btn-say', function () { if (S.word) sayAndSpell(S.word.w) })
  on('btn-hint', function () { sfx('click'); showHint() })
  on('btn-clear', function () { sfx('click'); restartWord() })
  on('btn-play-home', function () { stopAudio(); openWords(S.level) })
  on('btn-next', function () {
    closeWin(); S.idx++
    if (S.idx >= S.queue.length) openWords(S.level); else loadWord()
  })
  on('btn-again', function () { closeWin(); restartWord(); setTimeout(function () { if (S.word) sayAndSpell(S.word.w) }, 250) })
  on('btn-sound', function () { setOpt('voice', !opt('voice')); if (!opt('voice')) stopAudio(); syncSwitches() })
  on('coll-l', function () { $('coll').scrollBy({ left: -260, behavior: 'smooth' }) })
  on('coll-r', function () { $('coll').scrollBy({ left: 260, behavior: 'smooth' }) })

  // Parents: hold to open, so a child tapping around cannot wipe progress.
  var holdT = null
  var pb = $('btn-parents')
  pb.addEventListener('pointerdown', function () {
    unlock(); $('parents-lbl').textContent = 'Tahan…'
    holdT = setTimeout(function () { holdT = null; $('parents-lbl').textContent = 'Parents'; buildParents(); openOv('ov-parents') }, 1200)
  })
  ;['pointerup', 'pointerleave', 'pointercancel'].forEach(function (t) {
    pb.addEventListener(t, function () { if (holdT) { clearTimeout(holdT); holdT = null; $('parents-lbl').textContent = 'Parents' } })
  })
  var armed = false
  on('btn-reset', function () {
    if (!armed) { armed = true; $('btn-reset').textContent = 'Yakin? Ketuk lagi'; $('reset-note').textContent = 'Semua bintang anak ini akan dihapus.'; return }
    ST.stars = {}; writeStore(); armed = false
    $('btn-reset').textContent = 'Hapus kemajuan'; $('reset-note').textContent = 'Kemajuan sudah dihapus.'
    buildParents()
  })

  document.querySelectorAll('[data-back]').forEach(function (b) {
    b.addEventListener('click', function () {
      stopAudio(); sfx('click')
      var t = b.getAttribute('data-back')
      if (t === 'scr-category') buildCategories()
      show(t)
    })
  })
  document.querySelectorAll('[data-close]').forEach(function (b) {
    b.addEventListener('click', function () { closeOv(b.getAttribute('data-close')) })
  })
  ;[['sw-sfx', 'sfx'], ['sw-music', 'music'], ['sw-voice', 'voice'], ['sw-hint', 'hint']].forEach(function (p) {
    var e = $(p[0]); if (!e) return
    e.addEventListener('click', function () {
      unlock(); setOpt(p[1], !opt(p[1]))
      if (p[1] === 'music') music(opt('music'))
      if (p[1] === 'voice' && !opt('voice')) stopAudio()
      syncSwitches()
    })
  })
  function syncSwitches () {
    ;[['sw-sfx', 'sfx'], ['sw-music', 'music'], ['sw-voice', 'voice'], ['sw-hint', 'hint']].forEach(function (p) {
      var e = $(p[0]); if (e) { e.classList.toggle('on', opt(p[1])); e.setAttribute('aria-pressed', opt(p[1])) }
    })
    var si = $('btn-sound'); if (si) si.style.opacity = opt('voice') ? '1' : '.45'
    var mb = $('btn-music'); if (mb) mb.style.opacity = opt('music') ? '1' : '.6'
    var hb = $('btn-hint'); if (hb) hb.style.display = opt('hint') ? '' : 'none'
  }
  syncSwitches()
  window.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return
    if ($('ov-hint').classList.contains('show')) return closeOv('ov-hint')
    if ($('ov-parents').classList.contains('show')) return closeOv('ov-parents')
  })
  window.addEventListener('pagehide', function () { stopAudio(); music(false) })
  document.addEventListener('visibilitychange', function () { if (document.hidden) { stopAudio(); music(false) } else if (opt('music')) music(true) })

  /* test seam — the gates drive the real screens through this, not synthetic
     clicks, so what they assert is what a child gets. */
  window.__g27 = {
    show: show,
    state: function () { return { cat: S.cat, level: S.level, idx: S.idx, count: S.queue.length,
      word: S.word && S.word.w, placed: S.placed.slice(), wrong: S.wrong, solved: S.solved } },
    openCategory: function (c, lv) { S.cat = c; openWords(lv || 1); return 'ok' },
    startWord: function (w) { var x = D.find(w); if (!x) return 'no word'; startQueue([x], 0); return 'ok' },
    place: function (i, ch) { placeAt(i, ch); return S.placed.slice() },
    solve: function () { if (!S.word) return 'no word'; S.word.w.split('').forEach(function (c, i) { placeAt(i, c) }); return S.placed.slice() },
    showHint: showHint, buildProgress: buildProgress,
    openParents: function () { buildParents(); openOv('ov-parents'); return 'ok' },
    closeAll: function () {
      closeOv('ov-hint'); closeOv('ov-parents')
      if ($('ov-ok').classList.contains('show')) closeWin()
      stopAudio(); return 'ok'
    },
    fit: function () { fitGrids(); fitOk(); return 'ok' },
    stars: function (w) { return starsOf(w) },
    total: function () { return totalStars() },
    opt: opt,
    reset: function () { ST = { stars: {}, opt: {} }; writeStore(); syncSwitches(); return 'ok' },
    audioURL: function (kind, name) { return url('audio/' + kind + '/' + name + '.webm') },
    warmed: function () { return warmed },
    warmCount: function () { return D.WORDS.length * 2 + 26 },
  }
})()
