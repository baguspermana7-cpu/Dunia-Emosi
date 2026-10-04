/* G30 Timmy board look + scene life (owner 2026-10-04, the Mojo "diorama board" and "living scene" ported to the sea).
 * Pure presentation over games/tk-grid.js; the engine, the tap targets and the solver are untouched.
 *  - board: rocks, icebergs, deck props and the goal lighthouse stand on their tile and grow past it (bottom
 *    anchored, never taller than the free strip above the board), lower rows draw over upper rows, contact shadows,
 *    foam rings round rocks and ripple rings under the vessel, water glints, cloud shadows and a glint sweep, a
 *    sea-cliff (or hull) skirt under the board, and now and then a fish jump, a dolphin or gulls.
 *  - background (#tkb-bg, first child of the .tkg root, under every panel): the scene painting breathes, two cloud
 *    bands drift, a ray fan sways, themed particles drift, a far flyer crosses.
 *  - sounds (WebAudio synth, quiet, rate limited): gulls, soft waves, a buoy bell, a ship horn on the goal. Mute =
 *    the game's own rule: the global 'dunia-emosi-sound' key and the G30 speaker (#sndfab / #btn-sound aria-pressed).
 *    No AudioContext is made before the child's first touch.
 * Self-wiring: watches the mount hosts (#play-host, the harness #host) for a new .tkg root, then the root's style
 * (--t, scene painting) and class (tkg--won = horn, tkg--ask = pause). Tags (flags, keys, doors, question tiles,
 * currents) sit ABOVE the art; the vessel (z 5) and the fog (z 6) above everything here. Only transform/opacity
 * animate. Paused when hidden, off the play screen, under an overlay or a question. Reduced motion (OS or the G30
 * setting, .tkg--rm) builds nothing that moves. ES5, vanilla. */
(function (W, D) {
  'use strict'
  var OSRM = false, mq = null
  try { mq = W.matchMedia('(prefers-reduced-motion: reduce)'); OSRM = mq.matches } catch (e) {}
  function dec (s) { try { return decodeURIComponent(s || '') } catch (e) { return String(s || '') } }
  function rnd (a, b) { return a + Math.random() * (b - a) }
  function node (tag, cls, html) { var e = D.createElement(tag); e.className = cls; e.setAttribute('aria-hidden', 'true'); if (html) e.innerHTML = html; return e }

  /* ── LOOK: art box in tiles (w, h), bottom-centre anchored. Matched on the library key in the image src. ── */
  var LOOK = [
    [/lighthouse/, { w: 0.58, h: 1.34, lh: 1 }],
    [/crane/, { w: 1.1, h: 1.6 }],
    [/island|cliff/, { w: 1.18, h: 1.3, foam: 1 }],
    [/iceberg|ice-floe/, { w: 1.1, h: 1.3, foam: 1 }],
    [/arch-rock|boulder|rock|reef/, { w: 1.14, h: 1.2, foam: 1 }],
    [/ship-|tk-legend\//, { w: 1.2, h: 1.25, foam: 1 }],
    [/officer|char\//, { w: 0.96, h: 1.22 }],
    [/barrel|crate|rope|net|chest/, { w: 1.04, h: 1.06 }]
  ]
  function lookOf (src) {
    var s = dec(src)
    for (var i = 0; i < LOOK.length; i++) if (LOOK[i][0].test(s)) return LOOK[i][1]
    return { w: 1.04, h: 1.08 }
  }
  // scene painting -> background theme
  function themeOf (bg) {
    var m = /tk-scene\/([a-z0-9-]+?)(?:-land|-port)?\.(?:webp|png|jpe?g)/.exec(dec(bg)), n = m ? m[1] : ''
    if (/underwater|deep/.test(n)) return 'deep'
    if (/ice|aurora|antarc|snow/.test(n)) return 'snow'
    if (/night|bedroom/.test(n)) return 'night'
    if (/engine|stair|room|indoor/.test(n)) return 'indoor'
    return 'coast'
  }
  var RECIPE = { coast: [['glint', 9]], deep: [['bubble', 10]], snow: [['snow', 12]], night: [['star', 12]], indoor: [['mote', 8]] }
  var FLYER = { coast: ['gulls'], snow: ['gulls'], night: ['shoot'], deep: [], indoor: [] }
  var SVG = {
    gulls: '<svg viewBox="0 0 60 24"><g fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round"><path d="M2 14Q8 6 14 13Q20 6 26 14"/><path d="M32 8Q37 2 42 7Q47 2 52 8"/></g><g fill="none" stroke="#546E7A" stroke-width="1" stroke-linecap="round" opacity=".6"><path d="M2 14Q8 6 14 13Q20 6 26 14"/><path d="M32 8Q37 2 42 7Q47 2 52 8"/></g></svg>',
    shoot: '<svg viewBox="0 0 120 20"><defs><linearGradient id="tkbSg" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient></defs><path d="M2 12L112 6" stroke="url(#tkbSg)" stroke-width="2.4" stroke-linecap="round"/><circle cx="113" cy="6" r="3" fill="#fff"/></svg>',
    gull: '<svg viewBox="0 0 26 12"><path d="M1 9Q7 1 13 7Q19 1 25 9" fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round"/><path d="M1 9Q7 1 13 7Q19 1 25 9" fill="none" stroke="#455A64" stroke-width=".9" stroke-linecap="round" opacity=".7"/></svg>',
    fish: '<svg viewBox="0 0 30 16"><path d="M2 8Q10 0 20 8Q10 16 2 8Z" fill="#FF9F43"/><path d="M19 8L28 2V14Z" fill="#F57C00"/><circle cx="7" cy="7" r="1.3" fill="#263238"/></svg>',
    dolphin: '<svg viewBox="0 0 60 30"><path d="M3 20Q14 6 36 8Q50 9 57 16Q50 15 46 17Q40 22 30 22Q18 22 10 24Z" fill="#5C8DB8"/><path d="M27 8L31 1L35 9Z" fill="#4A78A0"/><path d="M8 23L2 28L4 21Z" fill="#4A78A0"/><path d="M14 20Q30 20 44 16" stroke="#DCEBF5" stroke-width="2" fill="none" opacity=".7"/><circle cx="50" cy="13" r="1.3" fill="#1B2B3A"/></svg>'
  }

  /* ── state (one mounted board at a time) ── */
  var root = null, board = null, T = 0, theme = 'coast', sea = true, RM = OSRM, won = false, gapT = 0, gapB = 0
  var bg = null, ground = null, amb = null, skirt = null, obs = [], ticker = 0, flyT = 0, paused = null, openAt = 0
  var nextWave = 0, nextGull = 0, nextBell = 0, nextActor = 0
  var log = []

  function attach (r) {
    if (r === root) return
    detach()
    root = r; board = r.querySelector('.tkg-board'); if (!board) { root = null; return }
    RM = OSRM || r.classList.contains('tkg--rm')
    sea = !r.classList.contains('tkg--deck'); won = r.classList.contains('tkg--won'); openAt = Date.now()
    r.classList.add('tkb-on'); r.setAttribute('data-tkb-sea', sea ? '1' : '0'); if (RM) r.classList.add('tkb-rm')
    buildBg(); syncPaint(); buildGround(); dress(); measure()
    var o1 = new MutationObserver(onRoot); o1.observe(r, { attributes: true, attributeFilter: ['style', 'class'] })
    var o2 = new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) for (var j = 0; j < ms[i].addedNodes.length; j++) {
        var n = ms[i].addedNodes[j]; if (n.classList && (n.classList.contains('tkg-blk') || n.classList.contains('tkg-goal'))) { W.requestAnimationFrame(dress); return }
      }
    }); o2.observe(board, { childList: true })
    obs = [o1, o2]
    T = tileOf()
    var now = Date.now()
    nextWave = now + rnd(2500, 4500); nextGull = now + rnd(5000, 9000); nextBell = now + rnd(12000, 20000); nextActor = now + rnd(4000, 7000)
    if (!ticker) ticker = W.setInterval(tick, 500)
    if (!flyT && !RM) flyT = W.setTimeout(fly, rnd(5000, 9000))
    syncRun()
    W.setTimeout(measure, 700)   // after the screen's entrance and the grid's first layout
  }
  function detach () {
    obs.forEach(function (o) { o.disconnect() }); obs = []
    if (root) { root.classList.remove('tkb-on', 'tkb-pause', 'tkb-rm'); root.removeAttribute('data-tkb-sea') }
    root = board = bg = ground = amb = skirt = null; paused = null
  }
  function tileOf () { var v = root ? parseFloat(root.style.getPropertyValue('--t')) : 0; return v > 0 ? v : 0 }

  /* ── background life ── */
  function buildBg () {
    var old = root.querySelector(':scope > .tkb-bg'); if (old) old.remove()
    bg = node('div', 'tkb-bg')
    bg.innerHTML = '<i class="tkb-paint tkb-anim"></i><i class="tkb-rays tkb-anim"></i><i class="tkb-cl tkb-cl1 tkb-anim"></i><i class="tkb-cl tkb-cl2 tkb-anim"></i><div class="tkb-parts"></div><i class="tkb-fly"></i>'
    root.insertBefore(bg, root.firstChild)
  }
  function syncPaint () {
    if (!bg) return
    var b = root.style.background || '', paint = bg.querySelector('.tkb-paint')
    if (paint.__b !== b) { paint.__b = b; paint.style.background = b }
    var t = themeOf(b)
    if (t !== theme || !bg.getAttribute('data-tkb')) { theme = t; bg.setAttribute('data-tkb', t); root.setAttribute('data-tkb-th', t); particles() }
  }
  function particles () {
    var box = bg.querySelector('.tkb-parts'); box.innerHTML = ''
    if (RM) return
    ;(RECIPE[theme] || RECIPE.coast).forEach(function (r) {
      for (var i = 0; i < r[1]; i++) {
        var p = node('i', 'tkb-p tkb-anim tkb-' + r[0]), s = p.style, d
        if (r[0] === 'glint') { d = rnd(1.8, 3.6); s.left = rnd(3, 97) + '%'; s.top = rnd(56, 92) + '%'; s.setProperty('--sz', rnd(10, 18).toFixed(0) + 'px') }
        else if (r[0] === 'star') { d = rnd(2.4, 5); s.left = rnd(2, 98) + '%'; s.top = rnd(6, 44) + '%'; s.setProperty('--sz', rnd(2, 4.5).toFixed(1) + 'px') }
        else if (r[0] === 'snow') { d = rnd(10, 18); s.left = rnd(0, 100) + '%'; s.top = '-4%'; s.setProperty('--dx', rnd(-8, 8).toFixed(1) + 'vw'); s.setProperty('--sz', rnd(3, 7).toFixed(1) + 'px') }
        else if (r[0] === 'bubble') { d = rnd(8, 14); s.left = rnd(3, 97) + '%'; s.top = '96%'; s.setProperty('--dx', rnd(-3, 3).toFixed(1) + 'vw'); s.setProperty('--sz', rnd(5, 12).toFixed(0) + 'px') }
        else { d = rnd(9, 15); s.left = rnd(4, 96) + '%'; s.top = rnd(20, 85) + '%'; s.setProperty('--sz', rnd(3, 5).toFixed(1) + 'px') }   // mote
        s.animationDuration = d.toFixed(2) + 's'; s.animationDelay = (-rnd(0, d)).toFixed(2) + 's'
        box.appendChild(p)
      }
    })
  }
  function fly () {
    flyT = 0; if (RM) return
    if (bg && running()) {
      var kinds = FLYER[theme] || []
      if (kinds.length) {
        var f = bg.querySelector('.tkb-fly'), k = kinds[0], rtl = k !== 'shoot' && Math.random() < 0.5
        f.className = 'tkb-fly'; f.innerHTML = SVG[k]; f.style.top = rnd(6, k === 'shoot' ? 22 : 26).toFixed(1) + '%'
        void f.offsetWidth
        f.className = 'tkb-fly tkb-anim on tkb-f-' + k + (rtl ? ' tkb-rtl' : '')
      }
    }
    flyT = W.setTimeout(fly, rnd(16000, 28000))
  }

  /* ── board: ground layer (the grid's own waves move in, clipped), glints, cloud shadows, sweep, skirt, amb ── */
  function buildGround () {
    ;[].forEach.call(board.querySelectorAll(':scope > .tkb-ground, :scope > .tkb-amb, :scope > .tkb-skirt'), function (e) { e.remove() })
    ground = node('div', 'tkb-ground')
    if (!RM) {
      var html = ''
      for (var i = 0; i < 7; i++) html += '<i class="tkb-gl tkb-anim" style="left:' + ((i * 37 + 11) % 92 + 2) + '%;top:' + ((i * 53 + 19) % 86 + 6) + '%;animation-delay:-' + (i * 0.7).toFixed(1) + 's;animation-duration:' + (2.6 + (i % 3) * 0.7).toFixed(1) + 's"></i>'
      html += '<i class="tkb-cs tkb-anim"></i><i class="tkb-cs tkb-cs2 tkb-anim"></i><i class="tkb-sweep tkb-anim"></i>'
      ground.innerHTML = html
    }
    ;[].slice.call(board.querySelectorAll(':scope > .tkg-wv')).reverse().forEach(function (w) { ground.insertBefore(w, ground.firstChild) })
    board.insertBefore(ground, board.firstChild)
    amb = node('div', 'tkb-amb'); board.appendChild(amb)
    skirt = node('div', 'tkb-skirt' + (RM ? '' : ' tkb-anim')); board.appendChild(skirt)
  }
  // dress the art: classes + vars on the grid's own tiles, then sort them by row (lower rows draw later = on top)
  function dress () {
    if (!board) return
    var cols = Math.round(board.offsetWidth / (T || tileOf() || 1)) || 0
    var arts = [].slice.call(board.querySelectorAll(':scope > .tkg-blk, :scope > .tkg-goal'))
    arts.forEach(function (e) {
      var im = e.classList.contains('tkg-goal') ? (e.querySelector('img.lh') || null) : e.querySelector('img')
      if (!im) return
      var L = lookOf(im.getAttribute('src'))
      if (e.classList.contains('tkg-goal')) { if (!L.lh || e.classList.contains('art')) return; e.classList.add('tkb-a', 'tkb-lh') }
      else e.classList.add('tkb-a')
      e.__tkbH = L.h; e.style.setProperty('--tkb-w', L.w)
      e.classList.toggle('tkb-foam', !!L.foam && sea)
      var o = L.lh ? 0 : Math.max(0, (L.w - 1) / 2)
      e.style.setProperty('--tkb-dx', (e._x === 0 ? o : cols && e._x === cols - 1 ? -o : 0).toFixed(3))
    })
    var sorted = arts.slice().sort(function (a, b) { return ((a._y || 0) - (b._y || 0)) || ((a._x || 0) - (b._x || 0)) })
    if (sorted.some(function (e, i) { return arts[i] !== e })) {
      var mark = D.createComment('tkb'); board.insertBefore(mark, arts[0])
      sorted.forEach(function (e) { board.insertBefore(e, mark) }); mark.remove()
    }
    var boat = board.querySelector(':scope > .tkg-boat')
    if (boat && !boat.querySelector(':scope > .tkb-rip')) boat.insertBefore(node('i', 'tkb-rip', '<b></b><b></b>'), boat.firstChild)
    heights()
  }
  // row-0 art never grows past the free strip above the board (the title plate, the HUD)
  function heights () {
    if (!board) return
    var room = T ? 0.96 + Math.max(0, gapT - 4) / T : 1
    ;[].forEach.call(board.querySelectorAll(':scope > .tkb-a'), function (e) {
      var h = e.__tkbH || 1; if (e._y === 0) h = Math.min(h, Math.max(0.96, room))
      e.style.setProperty('--tkb-h', h.toFixed(3))
    })
  }
  function measure () {
    if (!board || !board.isConnected) return
    T = tileOf()
    var b = board.getBoundingClientRect(); if (!b.width) return
    var top = root.getBoundingClientRect().top + (parseFloat(root.style.getPropertyValue('--top')) || 70)
    var plate = root.querySelector('.tkg-plate'), pr = plate && plate.offsetParent ? plate.getBoundingClientRect() : null
    if (pr && pr.height && pr.right > b.left && pr.left < b.right && pr.bottom <= b.top + 2) top = Math.max(top, pr.bottom)
    gapT = Math.max(0, b.top - top)
    var below = root.getBoundingClientRect().bottom
    ;[].forEach.call(root.querySelectorAll('.tkg-bot, .tkg-cmd, .tkg-foot'), function (e) {
      var r = e.getBoundingClientRect(); if (r.height && r.top >= b.bottom - 2 && r.right > b.left && r.left < b.right) below = Math.min(below, r.top)
    })
    gapB = Math.max(0, below - b.bottom)
    if (skirt) { var sk = Math.min(T * 0.2, gapB - 6); skirt.style.height = Math.max(0, sk).toFixed(0) + 'px'; skirt.style.display = sk >= 6 ? '' : 'none' }
    heights()
  }

  /* ── ambient life on the board: only in empty sea tiles, under the vessel ── */
  function busy () {
    var occ = {}
    ;[].forEach.call(board.querySelectorAll(':scope > .tkg-o'), function (e) {
      if (e.classList.contains('tkg-fogc') && e.classList.contains('clear')) return
      if (e.classList.contains('tkg-gb') || e.classList.contains('gone')) return
      occ[e._x + ',' + e._y] = 1
    })
    return occ
  }
  function actor () {
    if (RM || !amb || !T || amb.childElementCount > 2) return
    var cols = Math.round(board.offsetWidth / T), rows = Math.round(board.offsetHeight / T), occ = busy(), free = []
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) if (!occ[x + ',' + y]) free.push([x, y])
    var pick = Math.random()
    if (theme === 'coast' && gapT >= T * 0.3 && pick < 0.3) return gulls(cols)
    var pairs = free.filter(function (c) { return !occ[(c[0] + 1) + ',' + c[1]] && c[0] + 1 < cols })
    if (pick < 0.55 && pairs.length && theme === 'coast') { var p = pairs[Math.floor(Math.random() * pairs.length)]; return arc('dolphin', p[0], p[1], 2) }
    if (free.length) { var f = free[Math.floor(Math.random() * free.length)]; arc('fish', f[0], f[1], 1) }
  }
  function splash (x, y) {
    var s = node('i', 'tkb-splash'); s.style.left = x.toFixed(1) + 'px'; s.style.top = y.toFixed(1) + 'px'
    s.addEventListener('animationend', function () { s.remove() }); amb.appendChild(s)
  }
  function arc (kind, cx, cy, span) {
    var e = node('i', 'tkb-actor tkb-' + kind, SVG[kind]), ltr = Math.random() < 0.5
    var w = kind === 'fish' ? T * 0.3 : T * 0.8, h = w * (kind === 'fish' ? 16 / 30 : 0.5), base = (cy + 0.72) * T, lift = T * (kind === 'fish' ? 0.5 : 0.45)
    var x0 = (cx + (ltr ? 0.18 : span - 0.18)) * T, x1 = (cx + (ltr ? span - 0.18 : 0.18)) * T
    e.style.width = w.toFixed(1) + 'px'; e.style.height = h.toFixed(1) + 'px'; amb.appendChild(e)
    var kf = [], n = 10
    for (var i = 0; i <= n; i++) {
      var t = i / n, x = x0 + (x1 - x0) * t - w / 2, yy = base - Math.sin(t * Math.PI) * lift - h / 2, rot = (t - 0.5) * 80 * (ltr ? 1 : -1)
      kf.push({ transform: 'translate(' + x.toFixed(1) + 'px,' + yy.toFixed(1) + 'px) rotate(' + rot.toFixed(1) + 'deg)' + (ltr ? '' : ' scaleX(-1)'), opacity: i === 0 || i === n ? 0 : 1 })
    }
    splash(x0, base)
    var a = e.animate(kf, { duration: kind === 'fish' ? 1100 : 1900, easing: 'linear' })
    a.onfinish = function () { e.remove(); if (amb) splash(x1, base) }
    if (kind === 'dolphin') voice('splash')
  }
  function gulls (cols) {
    var Wd = cols * T, ltr = Math.random() < 0.5, y = -gapT * 0.55
    for (var k = 0; k < 2; k++) {
      var e = node('i', 'tkb-actor tkb-gull', SVG.gull); e.style.width = (T * 0.26).toFixed(0) + 'px'; e.style.height = (T * 0.12).toFixed(0) + 'px'
      amb.appendChild(e)
      var yk = y - k * T * 0.12, x0 = ltr ? -T * 0.4 - k * T * 0.35 : Wd + k * T * 0.35, x1 = ltr ? Wd + T * 0.2 : -T * 0.6
      var a = e.animate([{ transform: 'translate(' + x0 + 'px,' + yk + 'px)', opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1, offset: 0.9 },
        { transform: 'translate(' + x1 + 'px,' + (yk - T * 0.15) + 'px)', opacity: 0 }], { duration: 5200 + k * 400, easing: 'linear' })
      a.onfinish = (function (el) { return function () { el.remove() } })(e)
    }
    voice('gull')
  }

  /* ── run / pause ── */
  function running () {
    if (!root || !root.isConnected || D.hidden) return false
    var s = D.body.getAttribute('data-scr'); if (s && s !== 'scr-play') return false
    return !D.querySelector('.overlay.show') && !root.classList.contains('tkg--ask')
  }
  function syncRun () {
    if (!root) return
    var p = !running(); if (p === paused) return
    paused = p; root.classList.toggle('tkb-pause', p)
    if (amb && W.Animation) [].forEach.call(amb.children, function (e) { (e.getAnimations ? e.getAnimations() : []).forEach(function (a) { p ? a.pause() : a.play() }) })
  }
  function onRoot (ms) {
    var cls = false, sty = false
    ms.forEach(function (m) { if (m.attributeName === 'class') cls = true; else sty = true })
    if (sty) { syncPaint(); var t = tileOf(); if (t !== T) { T = t; W.requestAnimationFrame(measure) } }
    if (cls) {
      var w = root.classList.contains('tkg--won')
      if (w && !won) voice('horn')
      won = w; syncRun()
    }
  }
  function tick () {
    if (root && !root.isConnected) { detach(); return }
    syncRun()
    if (!root || paused) return
    var now = Date.now(), wet = theme !== 'indoor' && theme !== 'night'
    if (wet && now >= nextWave) { nextWave = now + rnd(6000, 10000); voice('waves') }
    if (theme === 'coast' && now >= nextGull) { nextGull = now + rnd(15000, 24000); voice('gull') }
    if (wet && sea && theme !== 'deep' && now >= nextBell) { nextBell = now + rnd(22000, 36000); voice('bell') }
    if (!RM && sea && now >= nextActor) { nextActor = now + rnd(7000, 12000); actor() }
  }

  /* ── voices (WebAudio synth, quiet, rate limited) ── */
  var AC = null, lastVoice = {}, touched = false
  function soundOn () {
    try { if (localStorage.getItem('dunia-emosi-sound') === 'off') return false } catch (e) {}
    var b = D.getElementById('sndfab') || D.getElementById('btn-sound')
    return b ? b.getAttribute('aria-pressed') !== 'false' : true
  }
  function ctx () {
    if (!soundOn()) { if (AC) { var o = AC; AC = null; try { o.close() } catch (e) {} } return null }
    if (!touched) return null
    try { if (!AC) AC = new (W.AudioContext || W.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume() } catch (e) { AC = null }
    return AC
  }
  function env (g, t, a, v, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.setValueAtTime(v, t + d * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + d) }
  function noise (c, d) {
    var n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), ch = b.getChannelData(0)
    for (var i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1
    var s = c.createBufferSource(); s.buffer = b; return s
  }
  var VOICES = {
    waves: function (c) {   // a slow swell of filtered noise
      var t = c.currentTime + 0.02, d = 3.2, s = noise(c, d), lp = c.createBiquadFilter(), g = c.createGain()
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(380, t); lp.frequency.linearRampToValueAtTime(900, t + d * 0.45); lp.frequency.linearRampToValueAtTime(300, t + d)
      env(g, t, d * 0.45, 0.035, d); s.connect(lp); lp.connect(g); g.connect(c.destination); s.start(t); s.stop(t + d + 0.05)
    },
    gull: function (c) {    // two falling "kee-ow" cries
      var t0 = c.currentTime + 0.02
      for (var i = 0; i < 2; i++) {
        var t = t0 + i * 0.32, o = c.createOscillator(), g = c.createGain(), bp = c.createBiquadFilter(), f = rnd(1500, 1800)
        o.type = 'sawtooth'; bp.type = 'bandpass'; bp.frequency.value = 2000; bp.Q.value = 3
        o.frequency.setValueAtTime(f * 1.25, t); o.frequency.linearRampToValueAtTime(f * 1.5, t + 0.05); o.frequency.exponentialRampToValueAtTime(f * 0.75, t + 0.24)
        env(g, t, 0.02, 0.02, 0.26); o.connect(bp); bp.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.3)
      }
    },
    bell: function (c) {    // a buoy bell: inharmonic partials, long decay
      var t = c.currentTime + 0.02, f = 520
      ;[[1, 0.03], [2.76, 0.014], [5.4, 0.007]].forEach(function (p) {
        var o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f * p[0]
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(p[1], t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4 / p[0] + 0.4)
        o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 2.9)
      })
    },
    horn: function (c) {    // a ship horn, two low reeds
      var t = c.currentTime + 0.05, d = 1.3, lp = c.createBiquadFilter(), g = c.createGain()
      lp.type = 'lowpass'; lp.frequency.value = 700; env(g, t, 0.12, 0.05, d)
      ;[110, 165].forEach(function (f) { var o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 0.97, t); o.frequency.linearRampToValueAtTime(f, t + 0.15); o.connect(lp); o.start(t); o.stop(t + d + 0.05) })
      lp.connect(g); g.connect(c.destination)
    },
    splash: function (c) {
      var t = c.currentTime + 0.02, s = noise(c, 0.35), bp = c.createBiquadFilter(), g = c.createGain()
      bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 0.8; env(g, t, 0.01, 0.025, 0.32)
      s.connect(bp); bp.connect(g); g.connect(c.destination); s.start(t); s.stop(t + 0.36)
    }
  }
  var GAP = { waves: 5000, gull: 6000, bell: 12000, horn: 3000, splash: 1500 }
  function voice (name) {
    var now = Date.now()
    if (lastVoice[name] && now - lastVoice[name] < GAP[name]) return false
    lastVoice[name] = now
    var c = ctx(), played = false
    if (c && VOICES[name]) { try { VOICES[name](c); played = true } catch (e) { console.warn('[TKBoardLook] voice failed', name, e) } }
    log.push({ v: name, played: played, muted: !soundOn(), at: now - openAt }); if (log.length > 60) log.shift()
    return played
  }

  /* ── wiring ── */
  function scan () { var r = D.querySelector('.tkg'); if (r && r !== root && r.querySelector('.tkg-board')) attach(r) }
  function wire () {
    if (W.__tkbWired) return
    W.__tkbWired = true
    var hosts = ['play-host', 'host'].map(function (id) { return D.getElementById(id) }).filter(Boolean)
    var mo = new MutationObserver(function () { W.requestAnimationFrame(scan) })
    if (hosts.length) hosts.forEach(function (h) { mo.observe(h, { childList: true }) })
    else mo.observe(D.body, { childList: true, subtree: true })
    D.addEventListener('visibilitychange', syncRun)
    ;[].forEach.call(D.querySelectorAll('.overlay'), function (o) { new MutationObserver(syncRun).observe(o, { attributes: true, attributeFilter: ['class'] }) })
    if (D.body) new MutationObserver(syncRun).observe(D.body, { attributes: true, attributeFilter: ['data-scr'] })
    ;['pointerdown', 'keydown', 'touchstart'].forEach(function (k) { D.addEventListener(k, function () { touched = true }, { capture: true, passive: true }) })
    W.addEventListener('resize', function () { W.setTimeout(measure, 250) })
    if (mq && mq.addEventListener) mq.addEventListener('change', function (e) { OSRM = e.matches; var r = root; if (r) { detach(); attach(r) } })
    scan()
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', wire); else wire()

  W.TKBoardLook = {
    LOOK: LOOK, themeOf: themeOf, voice: voice, log: log, actor: function () { actor() }, fly: fly, soundOn: soundOn,
    apply: function () { var r = root; detach(); if (r && r.isConnected) attach(r); else scan() },
    state: function () { return { on: !!root, tile: T, theme: theme, sea: sea, rm: RM, paused: !!paused, gap: [Math.round(gapT), Math.round(gapB)], won: won, parts: bg ? bg.querySelectorAll('.tkb-p').length : 0 } }
  }
})(window, document)
