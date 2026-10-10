/* G32 Blippi -- core: canvas fit, state + save, shared chrome, Hub / Peta / Kendaraan screens.
 * Mission runtime is blippi-mission.js (+ blippi-jalan.js); simple panels are blippi-panels.js. */
(function (w) {
  'use strict'
  var D = w.BlippiData
  var A = w.BlippiArt
  var stage = document.getElementById('stage')
  var W = 1672
  var H = 941
  var SKEY = 'blippi-g32'

  /* ---------- helpers ---------- */
  function px (n) { return n + 'px' }
  function at (parent, cls, x, y, wd, ht, tag) {
    var e = document.createElement(tag || 'div')
    e.className = 'at ' + cls
    e.style.left = px(x)
    e.style.top = px(y)
    if (wd != null) e.style.width = px(wd)
    if (ht != null) e.style.height = px(ht)
    if (parent) parent.appendChild(e)
    return e
  }
  function art (parent, key, x, y, wd, ht, cls) {
    var h = at(parent, 'at ' + (cls || ''), x, y, wd, ht)
    var row = A.index[key]
    if (wd == null && row) { h.style.width = px(row.w) }
    if (ht == null && row) { h.style.height = px(row.h) }
    A.fill(h, key)
    h.firstChild && h.setAttribute('data-slot', key)
    return h
  }
  function bgslot (parent, key) {
    var b = document.createElement('div')
    b.className = 'bgslot'
    parent.appendChild(b)
    var a = A.frame(key)
    b.appendChild(a)
    return b
  }
  function btn (parent, cls, x, y, wd, ht, label, fn) {
    var b = at(parent, cls, x, y, wd, ht, 'button')
    b.type = 'button'
    if (label) b.setAttribute('aria-label', label)
    if (fn) b.addEventListener('click', function (ev) { sfx('tap'); fn(ev) })
    return b
  }
  function txt (parent, cls, x, y, wd, ht, text) {
    var e = at(parent, cls, x, y, wd, ht)
    e.textContent = text
    return e
  }

  var ICON = {
    back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.4"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2.5" class="f"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1.5" class="f"/><rect x="14" y="5" width="4" height="14" rx="1.5" class="f"/></svg>',
    speaker: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z" class="f"/><path d="M16 9c1.6 1.6 1.6 4.4 0 6M18.5 6.5c3.2 3.2 3.2 8.8 0 12"/></svg>',
    bulb: '<svg viewBox="0 0 40 52"><path d="M20 3C10 3 5 10 5 18c0 6 4 9 6 13h18c2-4 6-7 6-13C35 10 30 3 20 3z" fill="#FFD23F" stroke="#E5A300" stroke-width="2"/><rect x="12" y="35" width="16" height="6" rx="3" fill="#8FA0BE"/><rect x="14" y="43" width="12" height="5" rx="2.5" fill="#8FA0BE"/></svg>',
    drop: '<svg viewBox="0 0 24 30"><path fill="#2F7CF6" d="M12 2C8 9 4 13 4 19a8 8 0 0016 0c0-6-4-10-8-17z"/></svg>',
    dropw: '<svg viewBox="0 0 24 30"><path d="M12 2C8 9 4 13 4 19a8 8 0 0016 0c0-6-4-10-8-17z"/></svg>',
    splash: '<svg viewBox="0 0 40 40"><path d="M6 30c4-10 12-14 22-12" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/><circle cx="30" cy="8" r="4"/><circle cx="36" cy="18" r="3"/><circle cx="22" cy="6" r="3"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    play: '<svg viewBox="0 0 24 28"><path d="M3 2l19 12L3 26z"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 2l3 6.6 7 .8-5.2 4.8 1.5 7L12 17.600 5.700 21.200l1.500-7L2 9.400l7-.8z" fill="#FFC82E" stroke="#fff" stroke-width="1.6"/></svg>',
    hand: '<svg viewBox="0 0 64 72"><path d="M22 36V12a5 5 0 0110 0v18l13 3c6 1.600 9 5 8 11l-3 15c-1 4-4 6-8 6H30c-4 0-6-1-9-5L8 45c-2-4 3-7 6-4l8 8z" fill="#fff" stroke="#3C8CF2" stroke-width="3" stroke-linejoin="round"/></svg>',
    hose: '<svg viewBox="0 0 48 48"><path d="M6 36c4-20 22-22 28-12" fill="none" stroke="#E0A800" stroke-width="10" stroke-linecap="round"/><path d="M6 36c4-20 22-22 28-12" fill="none" stroke="#FFD23F" stroke-width="6" stroke-linecap="round"/><rect x="30" y="10" width="16" height="12" rx="4" fill="#F4761A" stroke="#fff" stroke-width="2" transform="rotate(35 38 16)"/></svg>',
    valve: '<svg viewBox="0 0 48 48"><rect x="22" y="12" width="4" height="14" fill="#6B7A99"/><rect x="8" y="8" width="32" height="7" rx="3.500" fill="#E24D3E"/><rect x="4" y="26" width="40" height="14" rx="4" fill="#1D5FD4" stroke="#fff" stroke-width="1.500"/><rect x="2" y="24" width="6" height="18" rx="2" fill="#8FA0BE"/><rect x="40" y="24" width="6" height="18" rx="2" fill="#8FA0BE"/></svg>',
    plank: '<svg viewBox="0 0 48 48"><rect x="4" y="14" width="40" height="9" rx="2" fill="#C98F50"/><rect x="4" y="26" width="40" height="9" rx="2" fill="#B87A3E"/></svg>',
    wheel: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="16" fill="#2b2f3a"/><circle cx="24" cy="24" r="7" fill="#F4761A"/></svg>',
    box: '<svg viewBox="0 0 48 48"><rect x="8" y="16" width="32" height="24" rx="3" fill="#F4761A"/><rect x="8" y="16" width="32" height="7" fill="#FFA040"/><rect x="22" y="16" width="4" height="24" fill="#FFE0A8"/></svg>'
  }
  ICON.drop2 = ICON.drop

  /* ---------- sound ---------- */
  var actx = null
  function ctx () {
    if (!actx) { try { actx = new (w.AudioContext || w.webkitAudioContext)() } catch (e) { actx = null } }
    return actx
  }
  function tone (f1, f2, dur, vol, type) {
    var c = ctx()
    if (!c) return
    try {
      var o = c.createOscillator()
      var g = c.createGain()
      o.type = type || 'sine'
      o.frequency.setValueAtTime(f1, c.currentTime)
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, c.currentTime + dur)
      g.gain.setValueAtTime(vol || 0.07, c.currentTime)
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur)
      o.connect(g)
      g.connect(c.destination)
      o.start()
      o.stop(c.currentTime + dur + 0.02)
    } catch (e) { /* audio is garnish, never fatal */ }
  }
  function sfx (kind) {
    if (!state.sound) return
    if (kind === 'tap') tone(660, 990, 0.1, 0.06)
    else if (kind === 'ok') { tone(523, 784, 0.16, 0.07); setTimeout(function () { tone(784, 1047, 0.18, 0.07) }, 120) }
    else if (kind === 'bad') tone(330, 260, 0.2, 0.05, 'triangle')
    else if (kind === 'honk') { tone(310, 300, 0.22, 0.09, 'square') }
    else if (kind === 'win') { tone(523, 659, 0.15, 0.08); setTimeout(function () { tone(659, 784, 0.15, 0.08) }, 150); setTimeout(function () { tone(784, 1047, 0.3, 0.08) }, 300) }
    else if (kind === 'water') tone(220, 440, 0.25, 0.03, 'sawtooth')
  }

  /* ---------- state + save (per avatar) ---------- */
  function fresh () { return { v: 1, done: {}, rewards: {}, world: {}, progress: {}, vehicle: 'buggy', sound: true } }
  var state = load()
  function load () {
    var base = fresh()
    try {
      var raw = (typeof w.avatarScopedGet === 'function') ? w.avatarScopedGet(SKEY, null) : localStorage.getItem(SKEY)
      if (!raw) return base
      var p = JSON.parse(raw)
      return {
        v: 1,
        done: p.done || {}, rewards: p.rewards || {}, world: p.world || {}, progress: p.progress || {},
        vehicle: p.vehicle || 'buggy', sound: p.sound !== false
      }
    } catch (e) { return base }
  }
  function save () {
    try {
      var s = JSON.stringify(state)
      if (typeof w.avatarScopedSet === 'function') w.avatarScopedSet(SKEY, s)
      else localStorage.setItem(SKEY, s)
    } catch (e) { /* storage full or blocked: play on */ }
  }
  function commit (mut) {
    var next = JSON.parse(JSON.stringify(state))
    mut(next)
    state = next
    save()
  }
  // one idempotent transaction per reward key: true only the first time
  function grant (mission) {
    var key = mission.reward.key
    if (state.rewards[key]) return false
    commit(function (s) {
      s.rewards[key] = 1
      s.world[mission.worldDelta] = 1
      s.done[mission.id] = Date.now()
    })
    return true
  }
  function reloadState () { state = load() }
  function resetAll () { state = fresh(); save() }

  function missionDone (id) { return !!state.done[id] }
  function recommended () {
    var i
    for (i = 0; i < D.order.length; i++) if (!missionDone(D.order[i])) return D.missions[D.order[i]]
    return D.missions[D.order[D.order.length - 1]]
  }
  function vehicleById (id) {
    var i
    for (i = 0; i < D.vehicles.length; i++) if (D.vehicles[i].id === id) return D.vehicles[i]
    return D.vehicles[0]
  }
  function fits (veh, mission) {
    var i
    for (i = 0; i < mission.needs.length; i++) if (veh.tags.indexOf(mission.needs[i]) < 0) return false
    return true
  }

  /* ---------- canvas fit ---------- */
  function fit () {
    var vw = w.innerWidth
    var vh = w.innerHeight
    var k = Math.min(vw / W, vh / H)
    var ox = (vw - W * k) / 2
    var oy = (vh - H * k) / 2
    stage.style.transform = 'translate(' + ox + 'px,' + oy + 'px) scale(' + k + ')'
    stage.style.setProperty('--tp', (56 / k) + 'px')
    stage.style.setProperty('--ik', String(1 / k))
    if (cur) { var on = stage.querySelector('.scr.on'); if (on) A.spread(on) }
  }
  w.addEventListener('resize', fit)
  w.addEventListener('orientationchange', fit)
  fit()

  function toRef (cx, cy) {
    var r = stage.getBoundingClientRect()
    return { x: (cx - r.left) * W / r.width, y: (cy - r.top) * H / r.height }
  }

  /* ---------- screen manager ---------- */
  var screens = {}
  var cur = null
  var trail = []
  function register (name, build, leave) { screens[name] = { build: build, leave: leave } }
  function go (name, params, noTrail) {
    var scr = screens[name]
    if (!scr) return
    if (cur && screens[cur] && screens[cur].leave) screens[cur].leave()
    closeModal()
    if (cur && !noTrail && cur !== name) trail.push(cur)
    cur = name
    var el = document.getElementById('s-' + name)
    if (!el) {
      el = document.createElement('section')
      el.id = 's-' + name
      el.className = 'scr'
      stage.appendChild(el)
    }
    el.innerHTML = ''
    scr.build(el, params || {})
    var all = stage.querySelectorAll('.scr')
    var i
    for (i = 0; i < all.length; i++) all[i].classList.toggle('on', all[i] === el)
    stage.setAttribute('data-screen', name)
    A.spread(el)
  }
  function back () {
    var to = trail.pop() || 'hub'
    go(to, null, true)
  }
  function home () { location.href = '../index.html' }

  /* ---------- shared chrome ---------- */
  function circle (parent, icon, x, y, label, fn) {
    var b = btn(parent, 'cbtn', x, y, null, null, label, fn)
    b.innerHTML = ICON[icon]
    return b
  }
  function topLeft (el, mode) {
    if (mode === 'hub') { circle(el, 'gear', 22, 18, 'Pengaturan', function () { w.BlippiPanels.settings() }) } else {
      circle(el, 'back', 22, 18, 'Kembali', back)
      circle(el, 'home', 122, 18, 'Ke beranda', home)
    }
  }
  function topRight (el) {
    var p = at(el, 'prof', 1458, 16, 92, 92)
    A.fill(p.appendChild(document.createElement('div')), 'blippi-profil')
    p.firstChild.className = 'art'
    var st = at(p, 'star', 0, 0, 44, 44)
    st.innerHTML = ICON.star
    circle(el, 'lock', 1572, 18, 'Area orang tua', function () { w.BlippiPanels.parent() })
  }
  function logo (el, pillText, pill) {
    art(el, 'logo-blippi', 711, 8, 250, 140, 'logo')
    var p = at(el, 'pill', pill[0], pill[1], pill[2], pill[3])
    p.textContent = pillText
    p.style.fontSize = pillText.length > 18 ? '17px' : '22px'
  }
  var NAV = [['peta', 'PETA', 'map'], ['kendaraan', 'KENDARAAN', 'vehicles'], ['bengkel', 'BENGKEL', 'bengkel'], ['penemuan', 'PENEMUAN', 'penemuan'], ['bermain', 'BERMAIN', 'bermain']]
  function nav (el, active, rect) {
    var bar = at(el, 'bar nav', rect[0], rect[1], rect[2], rect[3])
    bar.setAttribute('role', 'navigation')
    bar.style.top = 'auto'
    bar.style.bottom = (H - rect[1] - rect[3]) + 'px'
    NAV.forEach(function (n) {
      var b = document.createElement('button')
      b.type = 'button'
      b.className = 'nv' + (n[0] === active ? ' on' : '')
      b.setAttribute('data-nav', n[0])
      b.setAttribute('aria-label', n[1])
      var ic = document.createElement('div')
      ic.className = 'ni'
      A.fill(ic, 'nav-' + n[0])
      b.appendChild(ic)
      var l = document.createElement('span')
      l.textContent = n[1]
      b.appendChild(l)
      b.addEventListener('click', function () { sfx('tap'); go(n[2], n[2] === 'vehicles' ? { mission: recommended().id } : null) })
      bar.appendChild(b)
    })
    return bar
  }
  function bubble (parent, text, x, y, wd, ht) {
    var b = at(parent, 'bubble', x, y, wd, ht)
    b.textContent = text
    b.style.whiteSpace = 'nowrap'
    b.style.minWidth = wd + 'px'
    b.style.width = 'auto'
    return b
  }
  function say (b, text) {
    if (!b) return
    b.textContent = text
    b.classList.remove('pop')
    void b.offsetWidth
    b.classList.add('pop')
  }

  /* ---------- modal ---------- */
  var modalEl = null
  function closeModal () {
    if (modalEl && modalEl.parentNode) modalEl.parentNode.removeChild(modalEl)
    modalEl = null
  }
  function modal (o) {
    closeModal()
    var s = at(stage, 'scrim on', 0, 0, W, H)
    s.setAttribute('role', 'dialog')
    s.setAttribute('aria-modal', 'true')
    var m = at(s, 'panel modal', 446, o.top || 210, 780, o.h || 520)
    txt(m, 'title', 0, 0, null, null, o.title)
    var body = document.createElement('p')
    body.textContent = o.text || ''
    if (o.h) body.style.top = '110px'
    m.appendChild(body)
    var n = (o.buttons || []).length
    var bw = n > 2 ? 220 : 300
    var gap = 20
    var total = n * bw + (n - 1) * gap
    ;(o.buttons || []).forEach(function (bd, i) {
      var b = btn(m, 'obtn mbtn ' + (bd.blue ? 'bbtn' : ''), (780 - total) / 2 + i * (bw + gap), (o.h || 520) - 130, bw, 92, bd.label, function () { if (bd.fn) bd.fn(); if (bd.keep !== true) closeModal() })
      b.textContent = bd.label
      b.style.fontSize = '30px'
      b.setAttribute('data-act', bd.id || '')
    })
    modalEl = s
    if (o.build) o.build(m)
    return m
  }

  /* ---------- HUB ---------- */
  function hubBuild (el) {
    bgslot(el, 'bg-hub')
    // hotspots (art slots) -> the places the owner's hub shows
    var garage = art(el, 'hub-garasi', 1000, 0, 672, 450, 'hot')
    garage.setAttribute('data-hot', 'garasi')
    garage.addEventListener('click', function () { sfx('tap'); go('vehicles', { mission: recommended().id }) })
    var table = art(el, 'hub-meja-peta', 30, 420, 560, 235, 'hot')
    table.setAttribute('data-hot', 'peta')
    table.addEventListener('click', function () { sfx('tap'); go('map') })
    if (missionDone('W02-M01')) {
      var mw = at(table, 'mini-wheel', 300, 20, 86, 86)
      mw.innerHTML = wheelSvg()
    }
    var board = art(el, 'hub-papan', 752, 218, 244, 225, 'hot')
    board.setAttribute('data-hot', 'penemuan')
    board.addEventListener('click', function () { sfx('tap'); go('penemuan') })
    var icons = ['daun', 'cakar', 'planet', 'dino', 'gerigi']
    var pos = [[778, 268], [850, 266], [912, 268], [790, 330], [876, 334]]
    icons.forEach(function (k, i) { art(el, 'ikon-wall-' + k, pos[i][0], pos[i][1], 70, 70, 'wallic') })
    at(el, 'pad', 452, 590, 645, 170)
    var bug = art(el, 'veh-buggy', 560, 395, 530, 335, 'hot')
    bug.setAttribute('data-hot', 'buggy')
    bug.addEventListener('click', function () { sfx('honk'); bug.classList.remove('bounce'); void bug.offsetWidth; bug.classList.add('bounce') })
    art(el, 'blippi-menunjuk', 30, 255, 330, 640, '')
    var bub = bubble(el, D.hubLines.hub, 228, 308, 195, 72)
    bub.setAttribute('data-say', 'hub')
    topLeft(el, 'hub')
    topRight(el)
    logo(el, 'MEGA DISCOVERY ADVENTURE', [678, 108, 318, 40])
    // mission card
    var m = recommended()
    var card = at(el, 'panel card', 1098, 515, 550, 200)
    card.setAttribute('data-card', 'mission')
    at(el, 'post', 1170, 712, 26, 60)
    at(el, 'post', 1540, 712, 26, 60)
    var th = at(el, 'thumb', 1122, 538, 165, 150)
    th.appendChild(A.frame(m.thumb))
    txt(el, 'title', 1302, 536, 330, 46, m.title).style.fontSize = '34px'
    var go1 = btn(el, 'obtn', 1302, 598, 330, 90, 'Mulai petualangan', function () { startMission(m.id, m.vehicle) })
    go1.setAttribute('data-act', 'mulai')
    go1.innerHTML = ICON.play + '<span style="font-size:30px">MULAI PETUALANGAN</span>'
    nav(el, '', [293, 762, 1255, 165])
  }

  function wheelSvg () {
    var s = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="none" stroke="#B87A3E" stroke-width="8"/><circle cx="50" cy="50" r="9" fill="#8E5A28"/>'
    var i
    for (i = 0; i < 8; i++) s += '<rect x="47" y="8" width="6" height="84" rx="3" fill="#C98F50" transform="rotate(' + (i * 22.5) + ' 50 50)"/>'
    return s + '</svg>'
  }

  /* ---------- PETA ---------- */
  function mapBuild (el, params) {
    var sel = params.world || state.mapSel || D.missions[recommended().id].world
    bgslot(el, 'bg-peta')
    D.worlds.forEach(function (wd) {
      var done = wd.mission && missionDone(wd.mission)
      var key = (done && wd.artDone) ? wd.artDone : wd.art
      var b = wd.box
      var isl = art(el, key, b[0], b[1], b[2], b[3], 'isl')
      isl.setAttribute('data-world', wd.id)
      isl.addEventListener('click', function () { sfx('tap'); go('map', { world: wd.id }, true) })
      if (done && wd.artDone) at(isl, 'mini-wheel', 80, 40, 86, 86).innerHTML = wheelSvg()
    })
    D.worlds.forEach(function (wd) {
      var done = wd.mission && missionDone(wd.mission)
      var l = at(el, 'islbl' + (wd.locked ? ' lk' : (done ? ' dn' : '')), wd.label[0], wd.label[1], wd.label[2], wd.label[3])
      l.textContent = wd.name
      l.setAttribute('data-world-label', wd.id)
      l.setAttribute('role', 'button')
      l.addEventListener('click', function () { sfx('tap'); go('map', { world: wd.id }, true) })
      if (done) at(el, 'badge', wd.label[0] + wd.label[2] - 30, wd.label[1] - 16, 52, 52).innerHTML = ICON.check
      if (wd.locked) {
        at(el, 'badge', wd.label[0] + wd.label[2] - 30, wd.label[1] - 16, 52, 52).innerHTML = ICON.lock.replace('class="f"', 'style="fill:#fff;stroke:none"')
      }
    })
    var sw = null
    D.worlds.forEach(function (wd) { if (wd.id === sel) sw = wd })
    state.mapSel = sel
    var b2 = sw.box
    at(el, 'ring', b2[0] + 8, b2[1] + 50, b2[2] - 16, b2[3] - 60)
    var pn = at(el, 'pin', sw.label[0] + sw.label[2] / 2 - 22, sw.label[1] - 160, 44, 62)
    pn.innerHTML = '<svg viewBox="0 0 44 62"><path d="M22 2C11 2 3 10 3 21c0 14 19 38 19 38s19-24 19-38C41 10 33 2 22 2z" fill="#F4761A" stroke="#fff" stroke-width="3"/><circle cx="22" cy="21" r="8" fill="#fff"/></svg>'
    art(el, 'blippi-menunjuk', 0, 460, 290, 470, '')
    topLeft(el)
    topRight(el)
    logo(el, 'PETA PETUALANGAN', [662, 108, 348, 42])
    var ex = Math.max(0, 56 * parseFloat(stage.style.getPropertyValue('--ik') || '1') + 14 - 128)
    // bottom card
    at(el, 'bar', 538, 697 - ex, 662, 98).style.borderRadius = '34px'
    var th = at(el, 'thumb', 560, 710 - ex, 140, 74)
    if (sw.thumb) th.appendChild(A.frame(sw.thumb))
    else { th.innerHTML = '<div class="lockic">' + ICON.lock.replace('class="f"', 'style="fill:#fff;stroke:none"') + '</div>'; th.firstChild.style.position = 'absolute' }
    var m = sw.mission ? D.missions[sw.mission] : null
    var t1 = txt(el, 'title', 718, 708 - ex, 226, 40, sw.name === 'TAMAN AIR' ? 'Taman Air' : titleCase(sw.name))
    t1.style.textAlign = 'left'; t1.style.fontSize = '31px'
    var t2 = txt(el, '', 720, 752 - ex, 226, 38, m ? m.title : sw.locked)
    t2.style.cssText += ';font:800 ' + (m ? 18 : 15) + 'px/1.1 Nunito,sans-serif;color:#13318A;text-align:left'
    t2.setAttribute('data-card-sub', '1')
    var jb = btn(el, 'obtn', 948, 712 - ex, 232, 70, 'Jelajahi', function () {
      if (!m) { say(null); return }
      go('vehicles', { mission: m.id })
    })
    jb.setAttribute('data-act', 'jelajahi')
    jb.innerHTML = ICON.play + '<span style="font-size:30px">JELAJAHI</span>'
    if (!m) { jb.disabled = true; jb.setAttribute('aria-disabled', 'true') }
    nav(el, 'peta', [325, 797, 1090, 128])
  }
  function titleCase (s) {
    return s.toLowerCase().replace(/(^|\s)([a-z])/g, function (m0, a, b) { return a + b.toUpperCase() })
  }

  /* ---------- KENDARAAN ---------- */
  function vehiclesBuild (el, params) {
    var mission = D.missions[params.mission || recommended().id]
    var si = 0
    var want = params.vehicle || mission.vehicle
    D.vehicles.forEach(function (v, i) { if (v.id === want) si = i })
    bgslot(el, 'bg-garasi')
    art(el, 'blippi-menunjuk', 50, 200, 300, 555, '')
    var veh = vehicleById(D.vehicles[si].id)
    var bub = bubble(el, veh.say, 240, 222, 195, 72)
    bub.setAttribute('data-say', 'vehicle')
    at(el, 'pad', 225, 505, 950, 135)
    var big = art(el, veh.art, 320, 160, 750, 450, 'vbig hot')
    big.setAttribute('data-vehicle', veh.id)
    big.addEventListener('click', function () { demo(veh, big) })
    topLeft(el)
    topRight(el)
    logo(el, 'PILIH KENDARAAN', [676, 108, 322, 42])
    // carousel: previous, selected, next (cycles)
    var n = D.vehicles.length
    var order = [(si + n - 1) % n, si, (si + 1) % n]
    var cx = [405, 614, 855]
    var cw = [198, 230, 203]
    var cy = [628, 620, 628]
    var chh = [136, 148, 136]
    order.forEach(function (vi, slot) {
      var v = D.vehicles[vi]
      var c = at(el, 'vcard' + (slot === 1 ? ' sel' : ''), cx[slot], cy[slot], cw[slot], chh[slot], 'button')
      c.type = 'button'
      c.setAttribute('data-vcard', v.id)
      c.setAttribute('aria-label', v.name)
      c.setAttribute('aria-pressed', slot === 1 ? 'true' : 'false')
      c.appendChild(A.frame(v.thumb))
      var l = document.createElement('span')
      l.textContent = v.name
      c.appendChild(l)
      if (slot === 1) { var bd = at(c, 'badge', 0, 0, 52, 52); bd.style.left = 'auto'; bd.innerHTML = ICON.check }
      c.addEventListener('click', function () { sfx('tap'); go('vehicles', { mission: mission.id, vehicle: v.id }, true) })
    })
    circle(el, 'back', 322, 650, 'Kendaraan sebelumnya', function () { go('vehicles', { mission: mission.id, vehicle: D.vehicles[order[0]].id }, true) }).setAttribute('data-act', 'prev')
    circle(el, 'back', 1075, 650, 'Kendaraan berikutnya', function () { go('vehicles', { mission: mission.id, vehicle: D.vehicles[order[2]].id }, true) }).setAttribute('data-act', 'next')
    el.querySelector('[data-act=next]').firstChild.style.transform = 'scaleX(-1)'
    // right panel
    at(el, 'panel', 1195, 128, 455, 625).setAttribute('data-panel', 'vehicle')
    var vt = txt(el, 'title', 1195, 158, 455, 56, veh.name)
    vt.style.fontSize = '46px'
    var ok = fits(veh, mission)
    var fp = at(el, 'fitpill' + (ok ? '' : ' no'), 1243, 218, 356, 56)
    fp.setAttribute('data-fit', ok ? 'yes' : 'no')
    fp.innerHTML = ok ? ICON.dropw + '<span>COCOK UNTUK MISI INI</span>' : '<span>UNTUK MISI LAIN</span>'
    veh.modules.forEach(function (m, i) {
      var t = at(el, 'tile', 1222 + i * 206, 290, 195, 140, 'button')
      t.type = 'button'
      t.setAttribute('data-module', m.id)
      t.setAttribute('aria-label', m.name)
      t.appendChild(A.frame(m.art))
      var l = document.createElement('span')
      l.textContent = m.name
      t.appendChild(l)
      t.addEventListener('click', function () { sfx('tap'); say(bub, m.info) ; bub.style.whiteSpace = 'normal'; bub.style.height = '110px'; bub.style.width = '300px' })
    })
    var mr = at(el, 'mrow', 1225, 447, 397, 95)
    mr.setAttribute('data-mission-row', mission.id)
    var th = at(mr, 'thumb', 5, 3, 150, 88)
    th.appendChild(A.frame(mission.thumb))
    mr.insertAdjacentHTML('beforeend', '<b>' + titleCase(mission.sub) + '</b><span>' + mission.title + '</span>')
    var cb = btn(el, 'obtn bbtn', 1222, 548, 400, 68, veh.demo.label, function () { demo(veh, big) })
    cb.setAttribute('data-act', 'coba')
    cb.innerHTML = (veh.demo.id === 'spray' ? ICON.splash : '') + '<span style="font-size:30px">' + veh.demo.label + '</span>'
    var pk = btn(el, 'obtn', 1220, 628, 402, 100, 'Pakai kendaraan', function () {
      if (ok) startMission(mission.id, veh.id)
      else {
        var lone = vehicleById(mission.vehicle)
        say(bub, 'Misi ini butuh ' + titleCase(lone.name) + '. Aku pinjamkan ya!')
        setTimeout(function () { if (cur === 'vehicles') startMission(mission.id, lone.id) }, 1100)
      }
    })
    pk.setAttribute('data-act', 'pakai')
    pk.innerHTML = ICON.play + '<span style="font-size:32px">PAKAI KENDARAAN</span>'
    nav(el, 'kendaraan', [262, 780, 1175, 145])
  }

  function demo (veh, big) {
    big.classList.remove('bounce')
    void big.offsetWidth
    big.classList.add('bounce')
    if (veh.demo.id === 'honk') sfx('honk')
    else if (veh.demo.id === 'dig') sfx('bad')
    else {
      sfx('water')
      var sp = at(stage.querySelector('#s-vehicles'), 'spray', 660, 205, 10, 10)
      var i
      for (i = 0; i < 22; i++) {
        var d = document.createElement('i')
        d.style.setProperty('--dx', (140 + Math.random() * 280) + 'px')
        d.style.setProperty('--dy', (60 + Math.random() * 120 - 60) + 'px')
        d.style.animationDelay = (i * 25) + 'ms'
        sp.appendChild(d)
      }
      setTimeout(function () { if (sp.parentNode) sp.parentNode.removeChild(sp) }, 1600)
    }
  }

  /* ---------- start a mission ---------- */
  function startMission (id, vehicleId) {
    commit(function (s) { s.vehicle = vehicleId })
    go('mission', { mission: id, vehicle: vehicleId })
  }

  register('hub', hubBuild)
  register('map', mapBuild)
  register('vehicles', vehiclesBuild)

  w.Blippi = {
    D: D, A: A, stage: stage, W: W, H: H,
    state: function () { return state }, commit: commit, grant: grant, reloadState: reloadState, resetAll: resetAll, save: save,
    missionDone: missionDone, recommended: recommended, vehicleById: vehicleById, fits: fits,
    at: at, art: art, bgslot: bgslot, btn: btn, txt: txt, circle: circle, ICON: ICON, nav: nav, topLeft: topLeft, topRight: topRight, logo: logo,
    bubble: bubble, say: say, modal: modal, closeModal: closeModal, sfx: sfx, toRef: toRef, wheelSvg: wheelSvg, titleCase: titleCase,
    register: register, go: go, back: back, home: home, startMission: startMission, current: function () { return cur },
    fit: fit
  }
  w.__g32 = {
    show: function (n, p) { go(n, p) },
    places: function () { return ['peta', 'kendaraan', 'bengkel', 'penemuan', 'bermain'] }
  }

  go('hub', null, true)
})(window)
