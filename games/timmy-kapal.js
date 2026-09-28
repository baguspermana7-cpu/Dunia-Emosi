/* ============================================================================
 * timmy-kapal.js — G30 "Timmy & Kapal Legendaris" app (GameState, screens, save, flow).
 * PRD: documentation and standarization/TIMMY_LEGENDARY_SHIPS_PRD_v2.md
 *
 * Level types are played by their modules (tk-story / tk-grid / tk-steer / tk-quiz); this file
 * only routes: world → level → (pre-story) → player → (after-story) → reward → next.
 * Never a "game over": every player reports stars 1–3; a scripted level always gives 3.
 *
 * SAVE (per avatar, save-engine avatarScopedGet/Set, key "dunia-tk-v1"), one JSON write:
 *   { xp, stars{world:{level:n}}, fragments[], cards[], badges[], mastery{domain:n},
 *     settings{grade, islam, sound, narration, reducedMotion, timer}, seenIntro, last }
 * ==========================================================================*/

/* ============================================================================
 * ICONS — the ONE place every icon in G30 is chosen (owner rule 2026-09-28:
 * "Di game ini jangan pakai emoji icon symbol. Ambil dari sprite yg sudah disediakan").
 * No emoji, no unicode glyphs (star, tick, arrows, gear…), no hand-drawn SVG pictograms:
 * every icon is an owner sprite from the shared DB (assets/db/lib/<key>.webp).
 *
 * window.TKIcon(name, cls, alt) -> '<img class="tk-ico tk-ico--name cls">' HTML.
 * Each name lists sprite keys in preference order; the first key the AssetIndex knows wins
 * (so tk-ui / tk-char / tk-legend sprites take over automatically once ingested, with no
 * 404 while they are missing). A wide sprite (a tk-ui button plate) adds .tk-ico--wide. The tk-ui plates (btn-map,
 * btn-settings, btn-play) carry ENGLISH words unreadable at 54 px, so square sprites are used.
 * Re-skin = edit this table. Modules (tk-quiz / tk-grid / tk-steer) call window.TKIcon too.
 *
 *   name       sprite(s)                                        used for
 *   star       tk-ui/star > game/star                           stars everywhere (.tk-ico--dim = empty)
 *   ok         tk-prop/flag-white-star                          "done / correct" marks (reward list, chapter, quiz)
 *   back       gt-el/signpost-arrow (mirrored by CSS)           every "Kembali" button
 *   next       gt-el/signpost-arrow                             "Lanjut / Selesai" buttons in the quiz
 *   worldmap   tk-prop/treasure-map                             leave G30 to the Dunia map
 *   settings   game/gear                                        settings button
 *   parent     tk-char/captain-old > tk-prop/captain-hat        parent area
 *   sound      tk-prop/ship-bell (CSS cross when muted)         sound toggle
 *   start      tk-prop/ship-wheel                               "Mulai Petualangan"
 *   go         gt/play-confirm                                  grid "JALAN!"
 *   pause      tk-ui/hourglass > tk-legend/hourglass > game/hourglass   pause button
 *   lock       gt/lock                                          locked level
 *   hint       tk-prop/lantern                                  hint buttons
 *   listen     tk-prop/ship-bell                                "Dengar" (listen) button
 *   trash      things/trash-can                                 grid "Hapus"
 *   repeat     tk-prop/rope-coil                                grid "Ulangi"
 *   turn       tk-prop/ship-wheel                               grid "Belok kiri / kanan"
 *   crate      tk-prop/crate-supplies                           grid "Ambil / Taruh"
 *   drop       tk-prop/crate-white-star                         grid drop square
 *   switch     tk-prop/engine-telegraph                         grid switch
 *   compass    tk-prop/compass                                  compass rose, time-compass fragments
 *   wheel      tk-prop/ship-wheel                               logo, profile badges
 *   journal    tk-legend/journal-book > school/notebook         journal counter
 *   book       tk-prop/books-passenger-list                     history-card button
 *   ice        tk-prop/ice-crystal                              steering goal "avoid the ice"
 *   lifeboat   tk-prop/lifeboat                                 lifeboat sort bins
 *   ship       tk-prop/titanic-ship                             quiz cargo ship
 *   p0..p7     tk-char/{hijab-girl-book, explorer-kid, officer-boy, hijab-girl-camera, chef, mechanic-boy,
 *              hijab-officer-tablet, lantern-boy} > sd/explorer — family / passenger figures (lifeboat
 *              sort, seat counting). OWNER RULE: no woman without hijab — never tk-char/lady-hat or maid.
 * Direction commands in the grid (up/right/down/left, current tiles, heading) are a pure CSS
 * arrow shape (no sprite fits a rotatable arrow); labels are Indonesian words.
 * ==========================================================================*/
(function () {
  'use strict'
  var W = window
  var ICONS = {
    star: ['tk-ui/star', 'game/star'], ok: ['tk-prop/flag-white-star'], back: ['gt-el/signpost-arrow'], next: ['gt-el/signpost-arrow'],
    worldmap: ['tk-prop/treasure-map'], settings: ['game/gear'], parent: ['tk-char/captain-old', 'tk-prop/captain-hat'],
    sound: ['tk-prop/ship-bell'], start: ['tk-prop/ship-wheel'], go: ['gt/play-confirm'],
    pause: ['tk-ui/hourglass', 'tk-legend/hourglass', 'game/hourglass'], lock: ['gt/lock'], hint: ['tk-prop/lantern'], listen: ['tk-prop/ship-bell'],
    trash: ['things/trash-can'], repeat: ['tk-prop/rope-coil'], turn: ['tk-prop/ship-wheel'], crate: ['tk-prop/crate-supplies'], drop: ['tk-prop/crate-white-star'],
    'switch': ['tk-prop/engine-telegraph'], compass: ['tk-prop/compass'], wheel: ['tk-prop/ship-wheel'], journal: ['tk-legend/journal-book', 'school/notebook'],
    book: ['tk-prop/books-passenger-list'], ice: ['tk-prop/ice-crystal'], lifeboat: ['tk-prop/lifeboat'], ship: ['tk-prop/titanic-ship'],
    // passengers: boys, men and HIJAB girls only (owner rule: no woman without hijab — never lady-hat / maid)
    p0: ['tk-char/hijab-girl-book', 'sd/explorer'], p1: ['tk-char/explorer-kid', 'sd/explorer'], p2: ['tk-char/officer-boy', 'sd/explorer'],
    p3: ['tk-char/hijab-girl-camera', 'sd/explorer'], p4: ['tk-char/chef', 'sd/explorer'], p5: ['tk-char/mechanic-boy', 'sd/explorer'],
    p6: ['tk-char/hijab-officer-tablet', 'sd/explorer'], p7: ['tk-char/lantern-boy', 'sd/explorer']
  }
  function ikEsc (t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;') }
  function ikBase () { try { return location.pathname.indexOf('/Dunia-Emosi/') === 0 ? '/Dunia-Emosi/' : '/' } catch (e) { return '/' } }
  // first candidate the AssetIndex knows (no 404 for sprites not ingested yet); else the last one
  function ikResolve (name) {
    var c = ICONS[name] || [name], AI = W.AssetIndex
    for (var i = 0; i < c.length; i++) { var p = AI && AI.path ? AI.path(c[i]) : null; if (p) return p }
    return (W.TKArt && W.TKArt.lib) ? W.TKArt.lib(c[c.length - 1]) : ikBase() + 'assets/db/lib/' + c[c.length - 1] + '.webp'
  }
  function TKIcon (name, cls, alt) {
    return '<img class="tk-ico tk-ico--' + ikEsc(name) + (cls ? ' ' + ikEsc(cls) : '') + '" src="' + ikEsc(ikResolve(name)) + '" alt="' + ikEsc(alt || '') +
      '" draggable="false" onload="TKIcon.ld(this)" onerror="this.style.visibility=\'hidden\'">'
  }
  TKIcon.src = ikResolve
  TKIcon.ICONS = ICONS
  TKIcon.PEOPLE = 8
  TKIcon.ld = function (img) { try { var b = img.parentNode; if (img.naturalWidth > img.naturalHeight * 1.6) { img.classList.add('tk-ico--wide'); if (b && b.classList) b.classList.add('has-wide') } } catch (e) {} }
  // fills every static <i data-ico="name"> placeholder in the page markup
  TKIcon.hydrate = function (root) { (root || document).querySelectorAll('[data-ico]').forEach(function (e) { if (!e.firstChild) e.innerHTML = TKIcon(e.getAttribute('data-ico'), e.getAttribute('data-ico-cls') || '') }) }
  W.TKIcon = TKIcon
})()

;(function () {
  'use strict'
  var W = window, WD = W.TKWorlds, Art = W.TKArt, IC = W.TKIcon
  var KEY = 'dunia-tk-v1', GAME_ID = 30
  function $ (id) { return document.getElementById(id) }
  function esc (t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;') }
  var EO = 'cubic-bezier(.23,1,.32,1)'
  function reduced () { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches || S.settings.reducedMotion } catch (e) { return false } }
  function A (el, f, o) { if (!el || !el.animate || reduced()) return null; try { return el.animate(f, o) } catch (e) { return null } }

  /* ── save ───────────────────────────────────────────────────────────── */
  var S
  function fill (o) {
    o = o || {}
    var st = o.settings || {}
    return { xp: o.xp || 0, stars: o.stars || {}, fragments: o.fragments || [], cards: o.cards || [], badges: o.badges || [], mastery: o.mastery || {},
      settings: { grade: st.grade || 'adaptif', islam: st.islam !== false, sound: st.sound !== false, music: st.music !== false, narration: st.narration !== false, reducedMotion: !!st.reducedMotion, timer: !!st.timer, musicVol: st.musicVol, sfxVol: st.sfxVol, voiceVol: st.voiceVol, hints: st.hints !== false, effects: st.effects !== false, confirmExit: st.confirmExit !== false },
      seenIntro: !!o.seenIntro, last: o.last || null, fav: o.fav || [] }
  }
  function load () {
    var raw = null
    try { raw = W.avatarScopedGet ? avatarScopedGet(KEY, null) : localStorage.getItem(KEY) } catch (e) {}
    try { S = fill(raw ? JSON.parse(raw) : null) } catch (e) { S = fill(null) }
  }
  function save () { try { var s = JSON.stringify(S); if (W.avatarScopedSet) avatarScopedSet(KEY, s); else localStorage.setItem(KEY, s) } catch (e) {} }
  load()

  /* ── sound: shared cues + a small original synth (waves, horn, splash, chime) ─ */
  var AC = null
  function ac () { if (!S.settings.sound) return null; try { if (!AC) AC = new (W.AudioContext || W.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume() } catch (e) { AC = null } return AC }
  function tone (f0, f1, d, v, type) {
    var c = ac(); if (!c) return
    try { var t = c.currentTime, g = c.createGain(), o = c.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d)
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v || 0.15, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + 0.05) } catch (e) {}
  }
  function noise (d, v, lp) {
    var c = ac(); if (!c) return
    try { var n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), ch = b.getChannelData(0)
      for (var i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / n)
      var s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp || 800; g.gain.value = v || 0.2
      s.buffer = b; s.connect(f); f.connect(g); g.connect(c.destination); s.start() } catch (e) {}
  }
  var SND = {
    cue: function (k) { if (!S.settings.sound) return; try { if (W.SFXEngine && SFXEngine.cue) SFXEngine.cue(k) } catch (e) {} },
    horn: function () { tone(110, 104, 1.1, 0.16, 'sawtooth'); tone(165, 156, 1.1, 0.08, 'sawtooth') },
    splash: function () { noise(0.5, 0.25, 1400) },
    wave: function () { noise(1.6, 0.08, 500) },
    chime: function () { tone(880, 880, 0.35, 0.1); setTimeout(function () { tone(1320, 1320, 0.45, 0.08) }, 110) },
    page: function () { noise(0.18, 0.08, 3000) },
    bell: function () { tone(1046, 1040, 0.9, 0.12, 'triangle') }
  }
  SND.click = function () { SND.cue('click') }

  /* ── small UI helpers ───────────────────────────────────────────────── */
  var toastT = 0
  function toast (m) { var t = $('toast'); t.textContent = m; t.className = 'toast show'; clearTimeout(toastT); toastT = setTimeout(function () { t.className = 'toast' }, 2200) }
  function show (id) {
    if (HUB && document.body.getAttribute('data-scr') !== id) { try { HUB.destroy() } catch (e) {} HUB = null }
    document.querySelectorAll('.scr').forEach(function (s) { s.classList.toggle('active', s.id === id) })
    document.body.setAttribute('data-scr', id)
    if (id !== 'scr-play') { clearTimeout(goalT); document.body.classList.remove('goal-on') }
    homeLoop(id === 'scr-home')
  }
  function tap (el, fn) { if (typeof el === 'string') el = $(el); if (el) el.addEventListener('click', function (e) { SND.click(); fn(e) }) }
  // collectible magnetises into the journal (PRD §6)
  function flyTo (src, fromEl, toEl, done) {
    if (!fromEl || !toEl || reduced()) { done && done(); return }
    var a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect(), img = document.createElement('img')
    img.src = src; img.style.left = (a.left + a.width / 2 - 28) + 'px'; img.style.top = (a.top + a.height / 2 - 28) + 'px'; $('fly').appendChild(img)
    var dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2)
    var an = img.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: 'translate(' + dx * 0.35 + 'px,' + (dy * 0.35 - 90) + 'px) scale(1.25)', offset: 0.45 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.4)', opacity: 0.8 }],
      { duration: 820, easing: 'cubic-bezier(.77,0,.175,1)' })
    var fin = function () { img.remove(); A(toEl, [{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 360, easing: EO }); SND.chime(); done && done() }
    an.finished.then(fin, fin); setTimeout(function () { if (img.parentNode) fin() }, 1300)
  }

  /* ── progress model ─────────────────────────────────────────────────── */
  function starsOf (w, l) { return ((S.stars[w] || {})[l]) || 0 }
  function worldStars (w) { var o = S.stars[w.id] || {}; return w.levels.reduce(function (n, l) { return n + (o[l.id] || 0) }, 0) }
  function totalStars () { return WD.WORLDS.reduce(function (n, w) { return n + worldStars(w) }, 0) }
  function maxStars () { return WD.WORLDS.reduce(function (n, w) { return n + w.levels.length * 3 }, 0) }
  function worldDone (w) { return w.levels.every(function (l) { return starsOf(w.id, l.id) > 0 }) }
  function worldOpen (i) { return i === 0 || worldDone(WD.WORLDS[i - 1]) || (S.fragments.length >= i - 1 && i <= 1) }
  function levelOpen (w, k) { return k === 0 || starsOf(w.id, w.levels[k - 1].id) > 0 }
  function xpLevel () { var lv = Math.floor(S.xp / 300) + 1; return { lv: lv, cur: S.xp % 300 } }
  function paintChip () {
    var x = xpLevel(); $('pchip-lv').textContent = 'Level ' + x.lv
    var n = $('pchip-n'); if (n) n.textContent = x.cur + ' / 300'
    $('pchip-xp').style.transform = 'scaleX(' + (x.cur / 300) + ')'; $('pchip-av').src = Art.src('char/timmy')
  }

  /* ── HOME ───────────────────────────────────────────────────────────── */
  var homeRaf = 0, homeT0 = performance.now()
  function homeLoop (on) {
    cancelAnimationFrame(homeRaf)
    if (!on) return
    var ls = [].slice.call(document.querySelectorAll('#home-px .px-l'))
    ;(function f (now) {
      if (!document.hidden && !reduced()) {
        var t = (now - homeT0) / 1000, cx = Math.sin(t * 0.18) * 14, cy = Math.cos(t * 0.15) * 6
        for (var i = 0; i < ls.length; i++) { var d = +ls[i].getAttribute('data-d'); ls[i].style.transform = 'translate3d(' + (cx * d).toFixed(2) + 'px,' + (cy * d).toFixed(2) + 'px,0)' }
      }
      homeRaf = requestAnimationFrame(f)
    })(performance.now())
  }
  // learning categories (home row, room progress, practice): [domain, label, owner sprite, disc colour] — five DISTINCT sprites
  var CATS = [['matematika', 'Matematika', 'sd/cat-math', '#2E7DE0'], ['islam', 'Studi Islam', 'gt/q-islamic', '#1FA54E'], ['arab', 'Bahasa Arab', 'school/books', '#7A4FD6'],
    ['umum', 'Pengetahuan Umum', 'school/globe', '#1E88A8'], ['logika', 'Logika', 'tk-prop/sextant-4', '#E0A21E']]
  // the ship worlds (the bedroom tutorial is not a ship: it is reached from Start the first time and from Kamar Timmy)
  function shipWorlds () { return WD.WORLDS.filter(function (w) { return w.id !== 'kamar' }) }
  function wIndex (w) { return WD.WORLDS.indexOf(w) }
  function lockBadge () { return '<span class="lockb">' + IC('lock', '', 'terkunci') + '</span>' }
  // a ship standing on its own painted scene (Art.scene is a CSS background; esc() keeps it safe inside style="")
  function shipScene (w, cls) {
    return '<span class="' + cls + '" style="background:' + esc(Art.scene(w.scene)) + '"><img src="' + esc(Art.src(w.ship || 'char/timmy')) + '" alt="" draggable="false"></span>'
  }
  function home () {
    show('scr-home')
    $('home-sky').style.background = Art.scene('harbor-dawn')
    $('home-timmy').src = Art.src('char/timmy')
    document.querySelectorAll('#home-px .gull').forEach(function (g) { if (!g.getAttribute('src')) g.src = Art.lib('tk-legend/seagull-3') })
    // owner logo sprite replaces the drawn logo once it exists (tk-key/logo)
    var li = $('logo-img'); if (li && !li.dataset.tried && W.AssetIndex && AssetIndex.path('tk-key/logo')) { li.dataset.tried = 1; li.onload = function () { li.classList.remove('hide'); var d = document.querySelector('#scr-home .logo'); if (d) d.classList.add('hide') }; li.src = Art.src('ui/logo') }
    paintChip()
    $('start-t').textContent = S.seenIntro ? 'Lanjutkan Petualangan' : 'Mulai Petualangan'
    var list = shipWorlds()
    $('carousel').innerHTML = list.map(function (w) {
      var open = worldOpen(wIndex(w))
      return '<button class="sc' + (open ? '' : ' locked') + '" type="button" data-w="' + w.id + '" aria-label="' + esc(w.name + (open ? '' : ' (terkunci)')) + '">' + shipScene(w, 'sc-img') + (open ? '' : lockBadge()) +
        '<span class="sc-t"><b>' + esc(w.name) + '</b><small>' + esc(w.value) + '</small></span></button>'
    }).join('')
    $('car-dots').innerHTML = list.map(function (w, i) { return '<i' + (i ? '' : ' class="on"') + '></i>' }).join('')
    $('cats').innerHTML = CATS.filter(function (c) { return c[0] !== 'islam' || S.settings.islam }).map(function (c) {
      return '<button class="cat" type="button" data-d="' + c[0] + '"><i style="background:' + c[3] + '"><img src="' + esc(Art.lib(c[2])) + '" alt=""></i><span>' + c[1].replace('Pengetahuan', 'Penge\u00ADtahuan') + '</span></button>'
    }).join('')
    paintSound()
    carouselWire(); requestAnimationFrame(paintCar)
  }
  // carousel arrows (CSS chevrons) + dots; landscape pages by a screenful, portrait by one card
  var carWired = false
  function carouselWire () {
    if (carWired) return
    carWired = true
    var tr = $('carousel')
    var step = function (dir) {
      var c = tr.querySelector('.sc'); if (!c) return
      var w = c.offsetWidth + 8, page = Math.max(w, Math.floor(tr.clientWidth / w) * w)
      tr.scrollBy({ left: dir * page, behavior: reduced() ? 'auto' : 'smooth' })
    }
    tap('car-prev', function () { step(-1) }); tap('car-next', function () { step(1) })
    var raf = 0
    tr.addEventListener('scroll', function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(paintCar) }, { passive: true })
    addEventListener('resize', function () { if (document.body.getAttribute('data-scr') === 'scr-home') paintCar() })
  }
  function paintCar () {
    var tr = $('carousel'), c = tr && tr.querySelector('.sc'); if (!c) return
    var i = Math.round(tr.scrollLeft / (c.offsetWidth + 8)), max = tr.scrollWidth - tr.clientWidth
    $('car-dots').querySelectorAll('i').forEach(function (d, k) { d.classList.toggle('on', k === i) })
    $('car-prev').disabled = tr.scrollLeft < 4; $('car-next').disabled = tr.scrollLeft > max - 4
  }

  /* ── SHIP SELECT (mockup ui-04) ─────────────────────────────────────── */
  // detail-panel thumbnails: the ship's scene, its World-Map island and one prop from its story
  var THUMB = { titanic: 'tk-prop/iceberg-5', britannic: 'tk-prop/lifebuoy-5', vasa: 'tk-prop/cannon', cuttysark: 'tk-prop/tea-set', victory: 'tk-prop/spyglass-4',
    mayflower: 'tk-prop/nautical-chart', endurance: 'tk-prop/ice-floe', kontiki: 'tk-prop/message-bottle', calypso: 'tk-prop/diving-helmet', queenmary: 'tk-prop/pocket-watch',
    arizona: 'tk-prop/ship-bell-3', missouri: 'tk-prop/sealed-letter', nautilus: 'tk-prop/porthole-underwater', pelabuhan: 'tk-legend/hourglass' }
  var FILTER = 'semua', SEL_SHIP = 'titanic', shipsWired = false
  function ships () {
    show('scr-ships')
    $('ships-bg').style.background = Art.scene('harbor-dawn')
    var tm = $('ships-timmy'); if (!tm.getAttribute('src')) tm.src = Art.src('char/timmy')
    var lg = $('ships-logo'); if (!lg.getAttribute('src') && W.AssetIndex && AssetIndex.path('tk-key/logo')) lg.src = Art.src('ui/logo')
    $('ships-stars').innerHTML = IC('star') + '<span>' + totalStars() + '/' + maxStars() + '</span>'
    var cats = WD.CATS.concat([['favorit', 'Favorit']])
    $('ship-filter').innerHTML = cats.map(function (c) { return '<button class="chip' + (c[0] === FILTER ? ' on' : '') + '" type="button" data-c="' + c[0] + '" aria-pressed="' + (c[0] === FILTER) + '">' + c[1] + '</button>' }).join('')
    var shown = 0
    $('ship-list').innerHTML = shipWorlds().map(function (w) {
      if (FILTER === 'favorit' ? S.fav.indexOf(w.id) < 0 : (FILTER !== 'semua' && w.cat !== FILTER)) return ''
      var open = worldOpen(wIndex(w)), got = S.fragments.indexOf(w.id) >= 0, fav = S.fav.indexOf(w.id) >= 0
      return '<div class="shipcard' + (open ? '' : ' locked') + (w.id === SEL_SHIP ? ' sel' : '') + '" role="button" tabindex="0" data-w="' + w.id + '" aria-label="' + esc(w.name + (open ? '' : ' (terkunci)')) + '" style="animation-delay:' + (shown++ * 35) + 'ms">' +
        shipScene(w, 'img') + (open ? '' : lockBadge()) +
        '<span class="sc-t"><b>' + esc(w.name) + '</b><small>' + esc(w.value) + '</small></span><span class="st">' + IC('star') + worldStars(w) + '/' + w.levels.length * 3 + '</span>' +
        '<button class="fav' + (fav ? ' on' : '') + '" type="button" data-fav="' + w.id + '" aria-label="Favorit" aria-pressed="' + fav + '">' + IC('star') + '</button>' +
        (got ? IC('compass', 'frag', 'kepingan') : '') + '</div>'
    }).join('') || '<p class="paper-note">Belum ada kapal favorit. Ketuk bintang di kartu kapal!</p>'
    detail(SEL_SHIP)
    bnav('', 'bnav-ships')
    if (!shipsWired) {
      shipsWired = true
      $('bnav-ships').addEventListener('click', bnavForward)
      // the favourite star in the panel; a star tapped on a card (wired in wire()) is mirrored here
      $('ship-detail').addEventListener('click', function (e) {
        var f = e.target.closest('.fav'); if (!f) return
        var id = f.getAttribute('data-fav'), at = S.fav.indexOf(id); if (at >= 0) S.fav.splice(at, 1); else S.fav.push(id)
        save(); SND.chime(); syncFav(id); A(f, [{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }], { duration: 300, easing: EO })
      })
      $('ship-list').addEventListener('click', function (e) { var f = e.target.closest('.fav'); if (f) setTimeout(function () { syncFav(f.getAttribute('data-fav')) }, 0) })
    }
  }
  function syncFav (id) {
    var on = S.fav.indexOf(id) >= 0
    document.querySelectorAll('#scr-ships .fav[data-fav="' + id + '"]').forEach(function (b) { b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)) })
  }
  function detail (id) {
    var w = WD.get(id); if (!w || w.id === 'kamar') w = WD.get('titanic')
    var sp = w.spec || {}, open = worldOpen(wIndex(w)), fav = S.fav.indexOf(w.id) >= 0, isl = isleArt(w.id)
    SEL_SHIP = w.id
    document.querySelectorAll('.shipcard').forEach(function (c) { c.classList.toggle('sel', c.getAttribute('data-w') === w.id) })
    var d = $('ship-detail')
    d.innerHTML = shipScene(w, 'dimg') + (open ? '' : lockBadge()) +
      '<div class="dh"><h3 class="fk">' + esc(w.name) + '</h3><small>' + esc(w.value) + '</small></div>' +
      '<button class="fav dfav' + (fav ? ' on' : '') + '" type="button" data-fav="' + w.id + '" aria-label="Favorit" aria-pressed="' + fav + '">' + IC('star') + '</button>' +
      '<q>' + esc(sp.quote || '') + '</q>' +
      '<div class="thumbs" aria-hidden="true"><span style="background:' + esc(Art.scene(w.scene)) + '"></span>' +
        (isl ? '<span><img src="' + esc(Art.lib(isl)) + '" alt=""></span>' : '') + '<span><img src="' + esc(Art.lib(THUMB[w.id] || 'tk-prop/compass-3')) + '" alt=""></span></div>' +
      '<dl><dt>Tahun</dt><dd>' + (w.year || '-') + '</dd><dt>Jenis</dt><dd>' + esc(sp.type || '') + '</dd><dt>Panjang</dt><dd>' + esc(sp.length || '') + '</dd><dt>Terkenal karena</dt><dd>' + esc(sp.famous || '') + '</dd></dl>' +
      '<button class="btn b-gold fk sail" type="button" id="btn-sail">' + IC('start') + '<span>' + (open ? 'Berlayar!' : 'Terkunci') + '</span><i class="chev" aria-hidden="true"></i></button>'
    A(d, [{ opacity: 0.4, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: EO })
    var b = $('btn-sail'); b.disabled = !open
    b.onclick = function () { SND.click(); openWorld(w.id) }
  }

  /* ── WORLD MAP (mockup ui-06: numbered islands) ─────────────────────── */
  // owner island sprites under each ship. Island-shaped sprites only (the framed picture cards —
  // arch-beach, sunset-sea — read as photos); no ship on the lighthouse (it is scenery).
  var ISLE = { kamar: 'tk-world/lighthouse-island', titanic: 'tk-world/harbor-station', britannic: 'tk-world/arch-island', vasa: 'tk-world/arch-rock',
    cuttysark: 'tk-world/palm-island', victory: 'tk-world/cave-island', mayflower: 'tk-world/arch-island', endurance: 'tk-world/snow-island',
    kontiki: 'tk-world/palm-island', calypso: 'tk-world/cave-island', queenmary: 'tk-world/harbor-station', arizona: 'tk-world/arch-rock',
    missouri: 'tk-world/arch-island', nautilus: 'tk-world/whirlpool', pelabuhan: 'tk-world/ruins' }
  function isleArt (id) { var k = ISLE[id]; return k && W.AssetIndex && AssetIndex.path(k) ? k : null }
  // one dashed route through snake-ordered points: a curve between neighbours in a row; a row change
  // runs down the outer gutter (beside the labels, never across a star row)
  function snakePath (pts, half, midX) {
    var r = 14, d = 'M' + pts[0].x.toFixed(0) + ' ' + pts[0].y.toFixed(0)
    for (var k = 1; k < pts.length; k++) {
      var a = pts[k - 1], b = pts[k]
      if (a.row === b.row) { d += ' Q' + ((a.x + b.x) / 2).toFixed(0) + ' ' + (a.y + 20).toFixed(0) + ' ' + b.x.toFixed(0) + ' ' + b.y.toFixed(0); continue }
      var s = a.x >= midX ? 1 : -1, e = a.x + s * half
      d += ' L' + (e - s * r).toFixed(0) + ' ' + a.y.toFixed(0) + ' Q' + e.toFixed(0) + ' ' + a.y.toFixed(0) + ' ' + e.toFixed(0) + ' ' + (a.y + r).toFixed(0) +
        ' L' + e.toFixed(0) + ' ' + (b.y - r).toFixed(0) + ' Q' + e.toFixed(0) + ' ' + b.y.toFixed(0) + ' ' + (e - s * r).toFixed(0) + ' ' + b.y.toFixed(0) + ' L' + b.x.toFixed(0) + ' ' + b.y.toFixed(0)
    }
    return d
  }
  function pathSvg (w, h, d, sw) {
    return '<svg class="path" width="' + Math.round(w) + '" height="' + Math.round(h) + '" aria-hidden="true"><path d="' + d + '" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="' + (sw + 3) + '" stroke-dasharray="10 12" stroke-linecap="round" transform="translate(0 2)"/>' +
      '<path d="' + d + '" fill="none" stroke="rgba(255,255,255,.92)" stroke-width="' + sw + '" stroke-dasharray="10 12" stroke-linecap="round"/></svg>'
  }
  var wResize = false
  function worldView () {
    show('scr-world')
    $('sea-bg').style.background = Art.scene('harbor-day')
    var cp = $('w-compass'); if (!cp.getAttribute('src')) cp.src = Art.lib('tk-prop/compass')
    var tm = $('w-timmy'); if (!tm.getAttribute('src')) tm.src = Art.lib('tk-char/timmy-map')
    $('world-stars').innerHTML = IC('star') + '<span>' + totalStars() + '/' + maxStars() + '</span>'
    layoutWorld()
    bnav('peta')
    if (!wResize) {
      wResize = true; var rt = 0
      addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (document.body.getAttribute('data-scr') === 'scr-world') layoutWorld() }, 150) })
    }
    var nx = $('islands').querySelector('.isle.next'); if (nx) setTimeout(function () { try { nx.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' }) } catch (e) {} }, 80)
  }
  function layoutWorld () {
    var host = $('islands'), cs = getComputedStyle(host), list = shipWorlds()
    var x0 = parseFloat(cs.paddingLeft) || 0, Wd = host.clientWidth - x0 - (parseFloat(cs.paddingRight) || 0)
    var cols = 3, gx = Wd / cols, short = innerHeight < 520
    var aw = Math.round(Math.min(gx * 0.84, short ? 124 : 230)), ah = Math.round(aw * 0.72)
    var lw = Math.round(Math.min(gx - 14, 210)), rowH = ah + (gx < 150 ? 92 : 78) + (short ? 10 : 24), pts = []
    list.forEach(function (w, k) { var row = Math.floor(k / cols), c = k % cols; if (row % 2) c = cols - 1 - c; pts.push({ x: x0 + gx * (c + 0.5), y: 22 + row * rowH + ah / 2, row: row }) })
    var H = pts[pts.length - 1].y + ah / 2 + rowH - ah + 8
    var nextI = -1; list.forEach(function (w, k) { if (nextI < 0 && worldOpen(wIndex(w)) && !worldDone(w)) nextI = k })
    host.innerHTML = pathSvg(host.clientWidth, H, snakePath(pts, gx / 2 - 3, x0 + Wd / 2), 4) +
      list.map(function (w, k) {
        var open = worldOpen(wIndex(w)), got = worldStars(w), max = w.levels.length * 3, st = '', n = Math.round(got / max * 3), isl = isleArt(w.id)
        for (var q = 0; q < 3; q++) st += IC('star', q < n ? '' : 'tk-ico--dim')
        return '<button class="isle' + (open ? '' : ' locked') + (k === nextI ? ' next' : '') + '" type="button" data-w="' + w.id + '" aria-label="' + esc((k + 1) + '. ' + w.name + (open ? '' : ' (terkunci)')) + '" style="left:' + (pts[k].x - gx / 2).toFixed(0) + 'px;top:' + (pts[k].y - ah / 2).toFixed(0) + 'px;width:' + gx.toFixed(0) + 'px;--aw:' + aw + 'px;--ah:' + ah + 'px;--lw:' + lw + 'px;animation-delay:' + k * 50 + 'ms">' +
          '<span class="land">' + (isl ? '<img class="isl" src="' + esc(Art.lib(isl)) + '" alt="">' : '<i class="isl-d"></i>') +
          '<img class="shp" src="' + esc(Art.src(w.ship || 'char/timmy')) + '" alt=""><b class="no fk">' + (k + 1) + '</b>' + (open ? '' : lockBadge()) + '</span>' +
          '<span class="lab">' + esc(w.name) + '<small>' + esc(w.value) + '</small></span><span class="s">' + st + '</span></button>'
      }).join('')
    var sp = document.createElement('div'); sp.style.height = H + 'px'; host.appendChild(sp)
  }
  var BNAV = [['peta', 'Peta Dunia', 'tk-legend/world-map-scroll'], ['cerita', 'Cerita', 'tk-prop/adventure-log'], ['tantangan', 'Tantangan', 'game/target-board'],
    ['belajar', 'Belajar', 'tk-prop/globe-2'], ['koleksi', 'Koleksi', 'game/treasure-chest']]
  function bnav (on, hostId) {
    $(hostId || 'bnav').innerHTML = BNAV.map(function (x) { return '<button type="button" class="' + (x[0] === on ? 'on' : '') + '" data-n="' + x[0] + '"' + (x[0] === on ? ' aria-current="page"' : '') + '><img src="' + esc(Art.lib(x[2])) + '" alt="">' + x[1] + '</button>' }).join('')
  }
  // a second tab bar (ship select) hands its tap to the World Map bar, whose handler is wired once in wire()
  function bnavForward (e) {
    var b = e.target.closest('button[data-n]'); if (!b) return
    var n = b.getAttribute('data-n'), t = $('bnav').querySelector('[data-n="' + n + '"]')
    if (!t) { bnav('peta'); t = $('bnav').querySelector('[data-n="' + n + '"]') }
    if (t) t.click()
  }

  /* ── LEVEL MAP (mockup ui-02 #4) ────────────────────────────────────── */
  var CUR = { w: null, k: 0 }
  // each world's own captain portrait (owner rule: no woman without hijab)
  var CAPT = { kamar: 'char/timmy', britannic: 'tk-char/hijab-officer-pointing', calypso: 'tk-char/diver', endurance: 'tk-char/captain-binoculars',
    nautilus: 'tk-char/captain-old', kontiki: 'tk-char/explorer-kid', victory: 'tk-char/officer-boy-salute', vasa: 'tk-char/mechanic-boy-wrench', queenmary: 'tk-char/officer-boy' }
  function worldMap (wid) {
    var w = WD.get(wid); if (!w) return
    CUR.w = w; show('scr-map')
    $('map-bg').style.background = Art.scene(w.scene)
    $('map-name').textContent = w.name + (w.year ? ' (' + w.year + ')' : ''); $('map-value').textContent = w.value
    $('map-stars').innerHTML = IC('star') + '<span>Bintang ' + worldStars(w) + '/' + w.levels.length * 3 + '</span>'
    var cap = w.captain || {}
    $('captain').innerHTML = '<img src="' + esc(Art.src(CAPT[w.id] || 'char/captain')) + '" alt=""><div><b>' + esc(cap.name) + '</b><span>“' + esc(cap.quote) + '”</span></div>'
    $('captain').classList.toggle('hide', !cap.quote)
    layoutRoute(w)
  }
  function layoutRoute (w) {
    var host = $('route'), cs = getComputedStyle(host), n = w.levels.length
    var x0 = parseFloat(cs.paddingLeft) || 0, Wd = host.clientWidth - x0 - (parseFloat(cs.paddingRight) || 0)
    var land = innerWidth > innerHeight && Wd >= 560
    var cols = land ? Math.max(2, Math.ceil(n / 2)) : (Wd > 520 ? 4 : 3)
    var gx = Wd / cols, rowH = land ? 150 : 138, tw = Math.round(Math.min(gx - 4, 132)), pts = []
    for (var k = 0; k < n; k++) {
      var row = Math.floor(k / cols), c = k % cols; if (!land && row % 2) c = cols - 1 - c     // portrait: snake
      pts.push({ x: x0 + gx * (c + 0.5), y: 34 + row * rowH, row: row })
    }
    var H = pts[n - 1].y + 100
    if (land) {   // lower the two rows into the open sea under the title, like the mockup
      var avail = host.clientHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0), off = Math.max(0, Math.round((avail - H) * 0.55))
      pts.forEach(function (p) { p.y += off }); H += off
    }
    var d
    if (land) {   // one route: row 1 left→right, down the right gutter, back along the gap under row 1's titles, down, row 2 left→right
      d = 'M' + pts[0].x.toFixed(0) + ' ' + pts[0].y
      for (var q = 1; q < n; q++) {
        var a = pts[q - 1], b = pts[q]
        if (a.row === b.row) { d += ' L' + b.x.toFixed(0) + ' ' + b.y; continue }
        var e1 = a.x + gx / 2 - 3, gy = a.y + Math.round(rowH * 0.64), e2 = b.x - gx / 2 + 3, r = 14
        d += ' L' + (e1 - r).toFixed(0) + ' ' + a.y + ' Q' + e1.toFixed(0) + ' ' + a.y + ' ' + e1.toFixed(0) + ' ' + (a.y + r) + ' L' + e1.toFixed(0) + ' ' + (gy - r) + ' Q' + e1.toFixed(0) + ' ' + gy + ' ' + (e1 - r).toFixed(0) + ' ' + gy +
          ' L' + (e2 + r).toFixed(0) + ' ' + gy + ' Q' + e2.toFixed(0) + ' ' + gy + ' ' + e2.toFixed(0) + ' ' + (gy + r) + ' L' + e2.toFixed(0) + ' ' + (b.y - r) + ' Q' + e2.toFixed(0) + ' ' + b.y + ' ' + (e2 + r).toFixed(0) + ' ' + b.y + ' L' + b.x.toFixed(0) + ' ' + b.y
      }
    } else d = snakePath(pts, gx / 2 - 3, x0 + Wd / 2)
    var nextK = -1; for (var z = 0; z < n; z++) if (!starsOf(w.id, w.levels[z].id) && levelOpen(w, z)) { nextK = z; break }
    host.innerHTML = pathSvg(host.clientWidth, H, d, 4) +
      w.levels.map(function (l, k) {
        var s = starsOf(w.id, l.id), open = levelOpen(w, k), st = ''
        for (var i = 0; i < 3; i++) st += IC('star', i < s ? '' : 'tk-ico--dim')
        return '<button class="node' + (open ? '' : ' locked') + (s ? ' done' : '') + (k === nextK ? ' next' : '') + '" type="button" data-k="' + k + '" aria-label="' + esc('Level ' + (k + 1) + ': ' + l.title + (open ? '' : ' (terkunci)')) + '" style="left:' + pts[k].x.toFixed(0) + 'px;top:' + pts[k].y + 'px;width:' + tw + 'px;animation-delay:' + k * 60 + 'ms">' +
          '<span class="n fk">' + (open ? k + 1 : IC('lock', '', 'terkunci')) + '</span>' +
          '<span class="s">' + st + '</span><span class="t">' + esc(l.title) + '</span></button>'
      }).join('')
    var spacer = document.createElement('div'); spacer.style.height = H + 'px'; host.appendChild(spacer)
    var nx = host.querySelector('.node.next'); if (nx && !land) setTimeout(function () { try { nx.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' }) } catch (e) {} }, 80)
  }
  function historyCards (w) {
    var ov = $('cards')
    ov.innerHTML = '<div class="panel glass"><h2 class="fk">Kartu Sejarah: ' + esc(w.name) + '</h2>' + (w.cards || []).map(function (c) {
      var got = S.cards.indexOf(c.id) >= 0
      return '<div class="hcard' + (got ? '' : ' no') + '"><b>' + esc(c.title) + '</b>' +
        (got ? esc(c.text) : '<span class="tease" aria-hidden="true">' + esc(c.text) + '</span><em>' + IC('lock', '', '') + ' Selesaikan kapal ini untuk membacanya.</em>') + '</div>'
    }).join('') + '<button class="btn b-gold fk" type="button" id="cards-x">Tutup</button></div>'
    ov.className = 'overlay show'
    tap('cards-x', function () { ov.className = 'overlay' })
  }

  /* ── PLAY: route a level to its module ──────────────────────────────── */
  var PLAYING = null
  function rng (seed) { var s = seed | 0; return function () { var t = (s = (s + 0x6D2B79F5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
  function modsMissing (lv) {
    var need = { story: 'TKStory', cutscene: 'TKStory', quiz: 'TKQuiz', sort: 'TKQuiz', grid: 'TKGrid', steer: 'TKSteer' }[lv.type]
    return need && !W[need] ? need : null
  }
  function startLevel (k) {
    var w = CUR.w, lv = w.levels[k]; if (!lv) return
    if (!levelOpen(w, k)) { toast('Selesaikan level sebelumnya dulu, ya!'); return }
    CUR.k = k; S.last = { w: w.id, k: k }; save()
    var miss = modsMissing(lv); if (miss) { toast('Bagian permainan ini sedang dimuat… coba lagi.'); return }
    show('scr-play')
    $('lvchip').textContent = w.name + ' · ' + (k + 1) + '. ' + lv.title
    $('journal-n').textContent = S.cards.length
    var host = $('play-host'); host.innerHTML = ''
    PLAYING = { w: w, lv: lv, k: k, handle: null, t0: Date.now() }
    chapter(w, k)
    var go = function () { runPlayer(lv, host) }
    if (lv.story && lv.type !== 'story' && lv.type !== 'cutscene') story(host, lv.story, lv.title, go)
    else go()
  }
  function chapter (w, k) {
    var c = $('chapter'), host = $('play-host')
    if (!w || !w.levels) { c.innerHTML = ''; host.classList.remove('with-chapter'); return }
    var from = Math.max(0, Math.min(k - 2, w.levels.length - 5)), rows = w.levels.slice(from, from + 5)
    c.innerHTML = '<div class="cimg" style="background:' + Art.scene(w.scene) + '"><img src="' + Art.src(w.ship || 'char/timmy') + '" alt=""></div>' +
      '<h3 class="fk">' + esc(w.name) + '</h3><small>' + esc(w.value) + '</small><ol>' + rows.map(function (l, j) {
        var idx = from + j, done = starsOf(w.id, l.id) > 0 && idx !== k
        return '<li class="' + (idx === k ? 'now' : done ? 'done' : '') + '"><i>' + (done ? IC('ok') : idx + 1) + '</i>' + esc(l.title) + '</li>' }).join('') + '</ol>'
    host.classList.add('with-chapter')
  }
  // level goal: shown IN the play HUD row (in place of the level chip) so it can never cover the
  // module's card header on a phone; fades out after 3.5 s (owner screenshot 2026-09-28)
  var goalT = 0
  function goal (text) {
    if (text && W.TKHub) TKHub.say(text)
    var g = $('goalbar'); clearTimeout(goalT)
    g.textContent = text || ''; g.className = 'goalbar' + (text ? ' show' : ''); document.body.classList.toggle('goal-on', !!text)
    if (text) goalT = setTimeout(function () { g.className = 'goalbar'; goalT = setTimeout(function () { document.body.classList.remove('goal-on') }, 320) }, 3500)
  }
  function story (host, panels, title, done) {
    document.body.classList.add('story-on')
    var wi = CUR.w ? WD.WORLDS.indexOf(CUR.w) : -1
    PLAYING && (PLAYING.handle = TKStory.play(host, panels, { title: title, chapter: CUR.w ? (wi > 0 ? 'Bab ' + wi + ' · ' : '') + CUR.w.name : '', subtitle: CUR.w && CUR.w.value,
      logo: W.AssetIndex && AssetIndex.path('tk-key/logo') ? Art.src('ui/logo') : '', sfx: { page: SND.page, go: SND.chime },
      onDone: function () { document.body.classList.remove('story-on'); host.innerHTML = ''; done() } }))
  }
  function sfxBag () { return { click: SND.click, good: function () { SND.cue('correct') }, bad: function () { SND.cue('wrong') }, win: function () { SND.cue('levelup') }, splash: SND.splash, muted: !S.settings.sound } }
  // a TKArt character key whose sprite is not ingested yet falls back to a library key (no 404)
  function charKey (k, fb) {
    var u = Art.src(k), m = /assets\/db\/lib\/(.+)\.webp$/.exec(u || '')
    return (m && W.AssetIndex && W.AssetIndex.path && !W.AssetIndex.path(m[1])) ? fb : k
  }
  function runPlayer (lv, host) {
    var w = CUR.w, r = rng((Date.now() ^ (CUR.k * 7919)) >>> 0)
    var common = { sfx: sfxBag(), lib: Art.lib, reducedMotion: reduced(), timmy: Art.src('char/timmy'), penguin: Art.src(charKey('char/penguin', 'animals/penguin')), topInset: 70, hints: S.settings.hints }
    goal(lv.goal)
    try {
      if (lv.type === 'story' || lv.type === 'cutscene') return story(host, lv.story || [], lv.title, function () { finish({ stars: 3, story: true }) })
      if (lv.type === 'grid') {
        var gwi = WD.WORLDS.indexOf(w)
        PLAYING.handle = TKGrid.mount(host, WD.grid(lv), Object.assign({}, common, { title: lv.title, mission: lv.goal, lib: Art.src, bg: Art.scene(lv.scene || w.scene || 'harbor-day'),
          chapter: { ship: w.ship, name: w.name, title: w.value, label: (gwi > 0 ? 'Bab ' + gwi + ' · ' : '') + w.name, idx: CUR.k + 1, total: w.levels.length },
          onBack: function () { try { PLAYING && PLAYING.handle && PLAYING.handle.destroy() } catch (e) {} PLAYING = null; $('play-host').innerHTML = ''; worldMap(w.id) },
          art: { boat: CUR.w.id === 'kamar' ? 'vehicles/sailboat' : 'ship/' + CUR.w.id, timmy: 'char/timmy', tipper: charKey('char/penguin', 'animals/penguin') },
          onDone: function (res) { finish({ stars: res.stars, moves: res.moves, shortest: res.shortest }) } }))
        return
      }
      if (lv.type === 'steer') {
        PLAYING.handle = TKSteer.mount(host, { mode: lv.mode, vessel: lv.vessel, goal: lv.goal, seed: (Date.now() >>> 0) }, Object.assign({ sfx: { muted: !S.settings.sound }, lib: Art.lib,
          // TKSteer needs TOP-DOWN art (bow up); the owner's ships are side views, so it keeps its drawn hulls
          onDone: function (res) {
            var after = function () { finish({ stars: res.stars || 1, scripted: res.scripted, hits: res.hits }) }
            if (lv.after) { host.innerHTML = ''; story(host, lv.after, lv.title, after) } else after()
          } }, common))
        return
      }
      var quit = function () { try { PLAYING && PLAYING.handle && PLAYING.handle.destroy && PLAYING.handle.destroy() } catch (e) {} var virt = PLAYING && PLAYING.virtual; PLAYING = null; $('play-host').innerHTML = ''; if (virt) home(); else worldMap(w.id) }
      var opts = Object.assign({ scene: Art.scene(lv.scene || w.scene || 'harbor-day'), topic: lv.goal, onBack: quit, penguin: Art.src('char/penguin'), domain: lv.domain, world: w.id, count: lv.count || 4, grade: S.settings.grade, islam: S.settings.islam, mastery: S.mastery[lv.domain] || 0,
        onDone: function (res) {
          if (res && res.masteryDelta && lv.domain) S.mastery[lv.domain] = Math.max(0, Math.min(100, (S.mastery[lv.domain] || 0) + res.masteryDelta))
          var pct = res && res.asked ? res.right / res.asked : 1
          finish({ stars: res && res.stars ? res.stars : (pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : 1), right: res && res.right, asked: res && res.asked, hints: res && res.hints })
        } }, common)
      if (lv.type === 'sort' && TKQuiz.mountSort && TKQuiz.sortSet) PLAYING.handle = TKQuiz.mountSort(host, TKQuiz.sortSet(lv.domain, w.id, r, { islam: S.settings.islam }), opts)
      else PLAYING.handle = TKQuiz.mount(host, { domain: lv.domain, world: w.id, count: lv.count || 4, grade: S.settings.grade, islam: S.settings.islam, mastery: S.mastery[lv.domain] || 0 }, opts)
    } catch (e) {
      try { console.warn('[tk] level failed to start', e) } catch (x) {}
      toast('Ups, level ini belum bisa dimulai. Kita lanjut, ya!')
      finish({ stars: 1 })
    }
  }

  /* ── REWARD ─────────────────────────────────────────────────────────── */
  function finish (res) {
    if (!PLAYING) return
    var w = PLAYING.w, lv = PLAYING.lv, k = PLAYING.k, t0 = PLAYING.t0
    try { if (PLAYING.handle && PLAYING.handle.destroy) PLAYING.handle.destroy() } catch (e) {}
    PLAYING = null; document.body.classList.remove('story-on')
    var stars = Math.max(1, Math.min(3, res.stars || 1)), prev = starsOf(w.id, lv.id)
    S.stars[w.id] = S.stars[w.id] || {}
    if (stars > prev) S.stars[w.id][lv.id] = stars
    var xp = 10 * Math.max(0, stars - prev) + 5; S.xp += xp
    var newFrag = false, newCards = []
    if (lv.fragment && S.fragments.indexOf(w.id) < 0) { S.fragments.push(w.id); newFrag = true }
    if (worldDone(w)) (w.cards || []).forEach(function (c) { if (S.cards.indexOf(c.id) < 0) { S.cards.push(c.id); newCards.push(c) } })
    if (newFrag && S.badges.indexOf('frag-' + w.id) < 0) S.badges.push('frag-' + w.id)
    save()
    try { if (W.saveLevelProgress) saveLevelProgress(GAME_ID, WD.WORLDS.indexOf(w) * 20 + k + 1, stars) } catch (e) {}
    // screen (TKHub.reward — mockup ui-10)
    show('scr-reward')
    var wi = WD.WORLDS.indexOf(w), nextK = k + 1 < (w.levels || []).length ? k + 1 : -1
    var fact = (w.cards || [])[Math.min((w.cards || []).length - 1, Math.floor(k / Math.max(1, (w.levels || []).length / 3)))]
    if (HUB) { try { HUB.destroy() } catch (e) {} }
    HUB = TKHub.reward($('scr-reward'), {
      world: w, k: k, stars: stars, scene: lv.scene || w.scene,
      chapter: (wi > 0 ? 'Bab ' + wi + ' · ' : '') + w.name,
      title: res.scripted ? 'Kamu tetap tenang!' : (stars === 3 ? 'Luar biasa!' : 'Level Selesai!'),
      subtitle: 'Hebat, Timmy! ' + (lv.goal || ''), banner: false,
      result: { moves: res.moves, shortest: res.shortest, timeMs: Date.now() - (t0 || Date.now()), right: res.right, asked: res.asked, hits: res.hits, scripted: res.scripted, story: res.story },
      xp: xp, newCards: newCards,
      badge: newFrag ? { title: 'Lencana ' + w.name, sub: 'Kepingan kompas ditemukan' } : null,
      fragment: newFrag ? { n: S.fragments.length, total: 14, finale: !!(w.levels[k] && w.levels[k].finale) } : null,
      fact: fact || null, levelStars: (w.levels || []).map(function (l) { return starsOf(w.id, l.id) }), hasNext: nextK >= 0
    }, {
      onReplay: function () { if (w.id === 'latihan') practice(lv.domain); else startLevel(k) },
      onNext: function () { startLevel(nextK) },
      onMap: function () { if (w.id === 'latihan') home(); else worldMap(w.id) },
      sfx: { click: SND.click, chime: SND.chime, bell: SND.bell }
    })
    SND.cue(stars === 3 ? 'levelup' : 'star'); TKHub.say('Level selesai! ' + stars + ' bintang.')
  }
  // Time-Compass progress: the owner's compass sprite inside a conic ring filled n/14 (no drawn pictogram)
  function compassSvg (n, glow) {
    return '<span class="tkc' + (glow ? ' glow' : '') + '" style="--p:' + (Math.max(0, Math.min(14, n)) / 14 * 100).toFixed(1) + '%" aria-hidden="true">' + IC('compass') + '</span>'
  }

  /* ── TIMMY'S ROOM (collection hub) ──────────────────────────────────── */
  var ROOM_TAB = 'kapal', HUB = null
  function room (tab) {
    ROOM_TAB = tab || ROOM_TAB; show('scr-room'); if (HUB) { try { HUB.destroy() } catch (e) {} }
    HUB = TKHub.room($('scr-room'), { save: S, worlds: WD.WORLDS, tab: ROOM_TAB, learn: CATS.filter(function (c) { return c[0] !== 'islam' || S.settings.islam }) },
      { onBack: home,
        onFav: function (id) { var on = S.fav.indexOf(id) < 0; S.fav = on ? S.fav.concat([id]) : S.fav.filter(function (x) { return x !== id }); save(); return on },
        sfx: { click: SND.click } })
  }

  /* ── settings (TKHub.settings — mockup ui-11); parent area stays behind the hold gate ── */
  function settings () {
    show('scr-settings'); if (HUB) { try { HUB.destroy() } catch (e) {} }
    HUB = TKHub.settings($('scr-settings'), { save: S, worlds: WD.WORLDS, version: 'v63' }, {
      get: function () { return S.settings },
      set: function (p) { S.settings = Object.assign({}, S.settings, p); save(); TKHub.config(S.settings); paintSound(); TKHub.music(!!S.settings.music)
        document.documentElement.classList.toggle('rm', !!S.settings.reducedMotion) },
      onSave: function () { toast('Pengaturan disimpan!'); home() },
      onBack: home, onParent: parentGate, sfx: { click: SND.click } })
  }

  /* ── parent area (hold 3 s) ─────────────────────────────────────────── */
  function parentGate () {
    var ov = $('parent')
    ov.innerHTML = '<div class="panel glass"><h2 class="fk">Untuk Orang Tua</h2><p>Tekan dan tahan tombol di bawah selama 3 detik.</p>' +
      '<button class="btn b-gold fk hold" id="hold" type="button"><i></i><span>Tahan</span></button><button class="btn b-soft fk" id="par-x" type="button">Tutup</button></div>'
    ov.className = 'overlay show'
    var h = $('hold'), bar = h.querySelector('i'), t = 0, an = null
    var start = function () { an = bar.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 3000, fill: 'forwards' }); t = setTimeout(parentPanel, 3000) }
    var stop = function () { clearTimeout(t); if (an) an.cancel() }
    h.addEventListener('pointerdown', start); h.addEventListener('pointerup', stop); h.addEventListener('pointerleave', stop); h.addEventListener('pointercancel', stop)
    tap('par-x', function () { ov.className = 'overlay' })
  }
  function seg (key, opts) {
    return '<div class="seg" data-k="' + key + '">' + opts.map(function (o) { return '<button type="button" data-v="' + o[0] + '" class="' + (String(S.settings[key]) === String(o[0]) ? 'on' : '') + '">' + o[1] + '</button>' }).join('') + '</div>'
  }
  function parentPanel () {
    var ov = $('parent'), done = WD.WORLDS.filter(worldDone).length
    ov.innerHTML = '<div class="panel glass"><h2 class="fk">Pengaturan Orang Tua</h2>' +
      '<div class="set">Tingkat soal' + seg('grade', [['kelas1', 'Kelas 1'], ['kelas2', 'Kelas 2'], ['adaptif', 'Adaptif']]) + '</div>' +
      '<div class="set">Studi Islam' + seg('islam', [[true, 'Nyala'], [false, 'Mati']]) + '</div>' +
      '<div class="set">Suara' + seg('sound', [[true, 'Nyala'], [false, 'Mati']]) + '</div>' +
      '<div class="set">Gerakan dikurangi' + seg('reducedMotion', [[false, 'Tidak'], [true, 'Ya']]) + '</div>' +
      '<div class="set">Kemajuan<span>' + totalStars() + ' bintang · ' + S.fragments.length + ' kepingan · ' + done + ' kapal selesai</span></div>' +
      '<button class="btn b-soft fk hold" id="reset" type="button"><i></i><span>Tahan 3 detik untuk hapus kemajuan</span></button>' +
      '<button class="btn b-gold fk" id="par-ok" type="button">Selesai</button></div>'
    ov.querySelectorAll('.seg').forEach(function (sg) {
      sg.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return
        var k = sg.getAttribute('data-k'), v = b.getAttribute('data-v')
        S.settings[k] = v === 'true' ? true : v === 'false' ? false : v; save(); SND.click(); parentPanel(); paintSound()
        document.documentElement.classList.toggle('rm', !!S.settings.reducedMotion)
      })
    })
    var r = $('reset'), bar = r.querySelector('i'), t = 0, an = null
    r.addEventListener('pointerdown', function () { an = bar.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 3000, fill: 'forwards' }); t = setTimeout(function () { var keep = S.settings; S = fill({ settings: keep }); save(); toast('Kemajuan dihapus.'); parentPanel() }, 3000) })
    ;['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { r.addEventListener(ev, function () { clearTimeout(t); if (an) an.cancel() }) })
    tap('par-ok', function () { ov.className = 'overlay'; home() })
  }
  function paintSound () { var b = $('btn-sound'); b.classList.toggle('off', !S.settings.sound); b.setAttribute('aria-pressed', S.settings.sound ? 'true' : 'false'); b.setAttribute('aria-label', S.settings.sound ? 'Suara: nyala' : 'Suara: mati'); try { if (W.SFXEngine && SFXEngine.setMute) SFXEngine.setMute(!S.settings.sound) } catch (e) {} }

  /* ── practice from a learning category (home row) ────────────────────── */
  function practice (domain) {
    CUR.w = { id: 'latihan', name: 'Latihan', levels: [{ id: 'lat-' + domain, title: CATS.filter(function (c) { return c[0] === domain })[0][1], type: 'quiz', domain: domain, count: 5, goal: 'Latihan bebas — tanpa batas waktu.' }], captain: { name: '', quote: '' } }
    CUR.k = 0
    if (!W.TKQuiz) { toast('Soal sedang dimuat… coba lagi.'); return }
    startLevelVirtual()
  }
  function startLevelVirtual () {
    var w = CUR.w, lv = w.levels[0]
    chapter(null)
    show('scr-play'); $('lvchip').textContent = 'Latihan · ' + lv.title
    var host = $('play-host'); host.innerHTML = ''
    PLAYING = { w: w, lv: lv, k: 0, handle: null, t0: Date.now(), virtual: true }
    runPlayer(lv, host)
  }

  /* ── wiring ─────────────────────────────────────────────────────────── */
  function wire () {
    if (IC.hydrate) IC.hydrate()
    tap('btn-map', function () { location.href = '../index.html' })
    tap('btn-start', function () {
      SND.horn(); if (W.TKHub) TKHub.music(!!S.settings.music)
      if (!S.seenIntro) { CUR.w = WD.WORLDS[0]; S.seenIntro = true; save(); return startLevel(0) }
      worldView()
    })
    tap('btn-ships', ships); tap('btn-all', ships)
    tap('btn-settings', settings)
    tap('btn-continue', function () { var last = S.last && WD.get(S.last.w); worldMap(last ? last.id : 'kamar') })
    $('islands').addEventListener('click', function (e) { var b = e.target.closest('.isle'); if (!b) return; SND.click(); openWorld(b.getAttribute('data-w')) })
    $('bnav').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; SND.click(); var n = b.getAttribute('data-n')
      if (n === 'peta') worldView(); else if (n === 'cerita') room('kartu'); else if (n === 'tantangan') practice('campur'); else if (n === 'belajar') room('belajar'); else room('kapal') })
    $('room-tabs').addEventListener('click', function (e) { var b = e.target.closest('button[data-t]'); if (!b) return; SND.click(); room(b.getAttribute('data-t')) })
    tap('btn-room', function () { room('kapal') }); tap('btn-ach', function () { room('capaian') }); tap('btn-gallery', function () { room('kartu') })
    tap('btn-parent', parentGate)
    tap('btn-sound', function () { S.settings.sound = !S.settings.sound; save(); paintSound() })
    $('carousel').addEventListener('click', function (e) { var b = e.target.closest('.sc'); if (!b) return; SND.click(); openWorld(b.getAttribute('data-w')) })
    $('cats').addEventListener('click', function (e) { var b = e.target.closest('.cat'); if (!b) return; SND.click(); practice(b.getAttribute('data-d')) })
    $('ship-filter').addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (!b) return; SND.click(); FILTER = b.getAttribute('data-c'); ships() })
    $('ship-list').addEventListener('click', function (e) {
      var f = e.target.closest('.fav'); if (f) { var id = f.getAttribute('data-fav'), at = S.fav.indexOf(id); if (at >= 0) S.fav.splice(at, 1); else S.fav.push(id); save(); SND.chime(); f.classList.toggle('on', at < 0); A(f, [{ transform: 'scale(1)' }, { transform: 'scale(1.4)' }, { transform: 'scale(1)' }], { duration: 300, easing: EO }); return }
      var b = e.target.closest('.shipcard'); if (!b) return; SND.click(); detail(b.getAttribute('data-w')) })
    $('route').addEventListener('click', function (e) { var b = e.target.closest('.node'); if (!b) return; SND.click(); startLevel(+b.getAttribute('data-k')) })
    tap('btn-story', function () { if (CUR.w) historyCards(CUR.w) })
    document.querySelectorAll('[data-back]').forEach(function (b) { tap(b, function () { var t = b.getAttribute('data-back'); if (t === 'ships') worldView(); else home() }) })
    tap('btn-pause', function () { $('pause').className = 'overlay show'; try { PLAYING && PLAYING.handle && PLAYING.handle.pause && PLAYING.handle.pause() } catch (e) {} })
    tap('p-resume', function () { $('pause').className = 'overlay'; try { PLAYING && PLAYING.handle && PLAYING.handle.resume && PLAYING.handle.resume() } catch (e) {} })
    var quit = function (to) { $('pause').className = 'overlay'; try { PLAYING && PLAYING.handle && PLAYING.handle.destroy && PLAYING.handle.destroy() } catch (e) {} var virt = PLAYING && PLAYING.virtual; PLAYING = null; document.body.classList.remove('story-on'); $('play-host').innerHTML = ''; if (to === 'map' && CUR.w && !virt) worldMap(CUR.w.id); else home() }
    tap('p-map', function () { quit('map') }); tap('p-home', function () { quit('home') })
    addEventListener('resize', function () { if (document.body.getAttribute('data-scr') === 'scr-map' && CUR.w) layoutRoute(CUR.w) })
    document.documentElement.classList.toggle('rm', !!S.settings.reducedMotion)
  }
  function openWorld (id) {
    var i = -1; WD.WORLDS.forEach(function (w, k) { if (w.id === id) i = k })
    if (i < 0) return
    if (!worldOpen(i)) { toast('Selesaikan ' + WD.WORLDS[i - 1].name + ' dulu untuk membuka kapal ini!'); return }
    SND.horn(); worldMap(id)
  }

  /* ── offline warm-up (same approach as G27–G29) ─────────────────────── */
  function warmList () {
    var u = {}
    Object.keys(Art.SCENE_ART).forEach(function (k) { u[Art.lib('tk-scene/' + Art.SCENE_ART[k] + '-land')] = 1; u[Art.lib('tk-scene/' + Art.SCENE_ART[k] + '-port')] = 1 })
    ;['char/timmy', 'char/captain', 'game/compass', 'game/treasure-map', 'game/treasure-chest', 'game/trophy-gold', 'school/books', 'school/notebook', 'school/globe', 'vehicles/sailboat', 'game/crystal-ice',
      'game/flag-red', 'game/crate-wood', 'game/lifebuoy', 'game/anchor', 'things/light-bulb', 'game/coin-star', 'nature/moon-stars', 'gt/lock'].forEach(function (k) { u[Art.src(k)] = 1 })
    var fx = { boom: 10, pop: 7, smoke: 8 }
    Object.keys(fx).forEach(function (k) { for (var i = 1; i <= fx[k]; i++) u[Art.BASE + 'assets/vfx/explosion/' + k + '/f-' + i + '.webp'] = 1 })
    return Object.keys(u).filter(function (x) { return x.indexOf('data:') !== 0 })
  }
  var warmed = false
  function warm () {
    if (warmed || W.__TK_NO_WARM || !navigator.onLine || !('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return
    warmed = true; var list = warmList(), i = 0
    function nx () { if (i >= list.length) return; fetch(list[i++], { cache: 'no-cache' }).catch(function () {}).then(function () { setTimeout(nx, 30) }) }
    for (var k = 0; k < 3; k++) nx()
  }
  if ('serviceWorker' in navigator) {
    var go = function () { (W.requestIdleCallback || function (f) { setTimeout(f, 1500) })(function () { try { warm() } catch (e) {} }, { timeout: 4000 }) }
    navigator.serviceWorker.ready.then(go).catch(function () {}); navigator.serviceWorker.addEventListener('controllerchange', go)
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) save() })

  if (W.TKHub) TKHub.config(S.settings)
  wire(); home()

  /* test seam for the QA gates */
  W.__tk = {
    state: function () { return { screen: document.body.getAttribute('data-scr'), world: CUR.w && CUR.w.id, k: CUR.k, playing: !!PLAYING, stars: totalStars(), fragments: S.fragments.length } },
    save: function () { return JSON.parse(JSON.stringify(S)) }, reset: function () { S = fill({}); save(); home(); return 'ok' },
    open: openWorld, start: function (wid, k) { var w = WD.get(wid); if (!w) return 'no world'; CUR.w = w; startLevel(k || 0); return 'ok' },
    finish: function (stars) { finish({ stars: stars || 3 }); return 'ok' }, set: function (k, v) { S.settings[k] = v; save(); return S.settings },
    unlockAll: function () { WD.WORLDS.forEach(function (w) { S.stars[w.id] = S.stars[w.id] || {}; w.levels.forEach(function (l) { S.stars[w.id][l.id] = S.stars[w.id][l.id] || 1 }) }); save(); return 'ok' },
    warmList: warmList,
    handle: function () { return PLAYING && PLAYING.handle }, level: function () { return PLAYING && { type: PLAYING.lv.type, id: PLAYING.lv.id, world: PLAYING.w.id } }
  }
})()
