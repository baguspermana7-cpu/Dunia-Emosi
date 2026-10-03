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
 *     settings{grade, islam, sound, narration, reducedMotion, timer, easy}, seenIntro, last, fav[],
 *     guide{home, world, map} (pointing-hand hints already shown),
 *     progress{world:{chapter:stepIndex}} (next step of an unfinished chapter), chapterHints{'world/chapter':true}, cine{'world/chapter/step': sceneId}
 *     (cinema checkpoint), legacy{world:{t1..:n}} (stars before the chapter restructure), migrated{world:1} }
 *
 * CHAPTERS (Titanic, owner mockup ui-12): a level may be {type:'chapter', steps:[…]}; its steps are ordinary
 * level types plus 'lanes' (TKLanes), 'cinema' (TKCinema), 'reflection' and 'fragment'. Steps play in order on
 * the play screen (cross-fade, "Langkah 2/4" chip); the next step index is saved after every step and the
 * cinema scene at every scene start, so leaving and coming back resumes there. A finished chapter replays
 * from step 0. Stars / XP / fragment are given once, at the end of the chapter (aggregated step results).
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
 *   sound      tk-prop/ships-bell (CSS cross when muted)         sound toggle
 *   start      tk-prop/ship-wheel                               "Mulai Petualangan"
 *   go         gt/play-confirm                                  grid "JALAN!"
 *   pause      tk-ui/hourglass > tk-legend/hourglass > game/hourglass   pause button
 *   lock       gt/lock                                          locked level
 *   hint       tk-prop/lantern                                  hint buttons
 *   listen     tk-prop/ships-bell                               "Dengar" (listen) button
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
    sound: ['tk-prop/ships-bell'], start: ['tk-prop/ship-wheel'], go: ['gt/play-confirm'],
    pause: ['tk-ui/hourglass', 'tk-legend/hourglass', 'game/hourglass'], lock: ['gt/lock'], hint: ['tk-prop/lantern'], listen: ['tk-prop/ships-bell'],
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
  if (W.lockGameAvatarSession) W.lockGameAvatarSession()
  var KEY = 'dunia-tk-v1', GAME_ID = 'g30'
  function $ (id) { return document.getElementById(id) }
  function esc (t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;') }
  var EO = 'cubic-bezier(.23,1,.32,1)'
  function reduced () { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches || S.settings.reducedMotion } catch (e) { return false } }
  function A (el, f, o) { if (!el || !el.animate || reduced()) return null; try { return el.animate(f, o) } catch (e) { return null } }

  /* ── save ───────────────────────────────────────────────────────────── */
  var S
  function chapterHintMap (value) {
    var out = {}
    Object.keys(value || {}).forEach(function (key) { if (/^[a-z0-9-]+\/[a-z0-9-]+$/.test(key) && value[key] === true) out[key] = true })
    return out
  }
  function fill (o) {
    o = o || {}
    var st = o.settings || {}
    return { xp: o.xp || 0, stars: o.stars || {}, fragments: o.fragments || [], cards: o.cards || [], badges: o.badges || [], mastery: o.mastery || {},
      settings: { grade: st.grade || 'adaptif', islam: st.islam !== false, sound: st.sound !== false, music: st.music !== false, narration: st.narration !== false, narrate: st.narrate === true, reducedMotion: !!st.reducedMotion, timer: !!st.timer, musicVol: st.musicVol, sfxVol: st.sfxVol, voiceVol: st.voiceVol, hints: st.hints !== false, effects: st.effects !== false, confirmExit: st.confirmExit !== false, easy: st.easy !== false,
        // Tingkat Soal (owner 2026-09-29): 'mudah' = Kelas 1–2 (default), 'sulit' = Kelas 3–4
        level: st.level === 'sulit' ? 'sulit' : 'mudah' },
      seenIntro: !!o.seenIntro, last: o.last || null, fav: o.fav || [], guide: o.guide || {}, seenSortTut: !!o.seenSortTut,
      progress: o.progress || {}, cine: o.cine || {}, chapterHints: chapterHintMap(o.chapterHints), legacy: o.legacy || {}, migrated: o.migrated || {},
      atlas: o.atlas && o.atlas.open ? { v: 1, open: o.atlas.open.slice() } : null }   // world-select sea chart: worlds ever unlocked (tk-atlas.js)
  }
  /* save migration: a world that became chapters (Titanic t1..t13 -> c1..c10) keeps its progress. A chapter
     is done when the LAST of its old levels was done (old levels unlocked in order, so all of them were),
     with the lowest of their stars; a new chapter with no old level (c1) counts as done once any later
     chapter is. The old stars stay under legacy{} (never lost). */
  function migrate (o) {
    var LG = (WD && WD.LEGACY) || {}
    Object.keys(LG).forEach(function (wid) {
      var st = (o.stars || {})[wid], w = WD.get(wid); if (!st || !w || (o.migrated || {})[wid]) return
      var old = {}, keep = {}, any = false
      Object.keys(st).forEach(function (k) { if (/^t\d+$/.test(k)) { old[k] = st[k]; any = true } else keep[k] = st[k] })
      if (!any) return
      var map = LG[wid], done = {}
      w.levels.forEach(function (lv) {
        var ids = map[lv.id]; if (!ids || !old[ids[ids.length - 1]]) return
        var m = 3; ids.forEach(function (id) { if (old[id]) m = Math.min(m, old[id]) })
        done[lv.id] = Math.max(keep[lv.id] || 0, m)
      })
      var seen = false
      for (var i = w.levels.length - 1; i >= 0; i--) { var id = w.levels[i].id; if (done[id]) seen = true; else if (seen && !map[id]) done[id] = 3 }
      o.stars = Object.assign({}, o.stars); o.stars[wid] = Object.assign(keep, done)
      o.legacy = Object.assign({}, o.legacy); o.legacy[wid] = old
      o.migrated = Object.assign({}, o.migrated); o.migrated[wid] = 1
      if (o.last && o.last.w === wid) {   // the old level index -> the chapter that now holds it
        var tk = 't' + ((o.last.k | 0) + 1), ck = 0
        w.levels.forEach(function (lv, j) { if ((map[lv.id] || []).indexOf(tk) >= 0) ck = j })
        o.last = { w: wid, k: ck }
      }
    })
    return o
  }
  function load () {
    var raw = null
    try { raw = W.avatarScopedGet ? avatarScopedGet(KEY, null) : localStorage.getItem(KEY) } catch (e) {}
    try { S = fill(raw ? JSON.parse(raw) : null) } catch (e) { S = fill(null) }
    try { var mg = JSON.stringify(S.migrated); S = migrate(S); if (JSON.stringify(S.migrated) !== mg) save() } catch (e) {}
  }
  function save () { try { var s = JSON.stringify(S); if (W.avatarScopedSet) avatarScopedSet(KEY, s); else localStorage.setItem(KEY, s) } catch (e) {} }
  load()
  // the main app's Settings > Suara OFF mutes this session without overwriting the child's own choice
  var GLOBAL_MUTE = false; try { GLOBAL_MUTE = localStorage.getItem('dunia-emosi-sound') === 'off' } catch (e) {}
  function soundOn () { return S.settings.sound && !GLOBAL_MUTE }

  /* ── sound: shared cues + a small original synth (waves, horn, splash, chime) ─ */
  var AC = null
  function ac () { if (!soundOn()) return null; try { if (!AC) AC = new (W.AudioContext || W.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume() } catch (e) { AC = null } return AC }
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
    cue: function (k) { if (!soundOn()) return; try { if (W.SFXEngine && SFXEngine.cue) SFXEngine.cue(k) } catch (e) {} },
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
  // every toast is also read aloud (many players cannot read yet); TKHub.say honours the narration setting
  function toast (m, quiet) { var t = $('toast'); t.textContent = m; t.className = 'toast show'; clearTimeout(toastT); toastT = setTimeout(function () { t.className = 'toast' }, 2600); if (!quiet) say(m) }
  function say (m) { try { if (W.TKHub && m) TKHub.say(m) } catch (e) {} }
  /* scene-image skeleton: an element whose inline background is still downloading pulses softly
     (opacity only), then fades in once the image is decoded. No layout change: size is set by CSS. */
  var LOADED = {}
  function skel (root) {
    if (!root) return
    var els = root.nodeType === 1 && root.hasAttribute('style') ? [root] : []
    els = els.concat([].slice.call((root.querySelectorAll ? root.querySelectorAll('[style*="url("]') : [])))
    els.forEach(function (el) {
      var m = /url\(['"]?([^'")]+\.(?:webp|png|jpe?g))['"]?\)/i.exec(el.getAttribute('style') || ''); if (!m) return
      var u = m[1]; if (LOADED[u]) return
      var im = new Image(); im.src = u
      if (im.complete && im.naturalWidth) { LOADED[u] = 1; return }
      el.classList.add('tk-ld')
      var fin = function () { LOADED[u] = 1; if (!el.classList.contains('tk-ld')) return; el.classList.remove('tk-ld'); if (!reduced()) el.classList.add('tk-in'); setTimeout(function () { el.classList.remove('tk-in') }, 400) }
      im.onload = fin; im.onerror = function () { el.classList.remove('tk-ld') }
      setTimeout(function () { el.classList.remove('tk-ld') }, 6000)   // never pulse forever
    })
  }
  W.TKSkel = skel
  function show (id) {
    if (HUB && document.body.getAttribute('data-scr') !== id) { try { HUB.destroy() } catch (e) {} HUB = null }
    document.querySelectorAll('.scr').forEach(function (s) { s.classList.toggle('active', s.id === id) })
    document.body.setAttribute('data-scr', id)
    if (id !== 'scr-play') { clearTimeout(goalT); document.body.classList.remove('goal-on'); mode(null); stepChipHide() }
    homeLoop(id === 'scr-home')
    unhand()
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

  /* ── guidance: an animated pointing hand (drawn in CSS, no glyph) on the FIRST visit of Home,
     World Map and a Level map; any tap dismisses it and S.guide remembers it per avatar. It lives in
     a fixed layer and follows its target every frame, so list scrolling and relayouts never strand it. */
  var HAND = null
  // side: the hand comes in from the right (or the left near the right edge) so it never hides the
  // label under an island / level node
  function hand (key, getTarget, line, side) {
    unhand()
    if ((S.guide || {})[key]) return
    var el = document.createElement('div'); el.className = 'tk-hand' + (side ? ' side' : '') + (key === 'home' ? ' home' : ''); el.setAttribute('aria-hidden', 'true')
    el.innerHTML = '<i class="ring"></i><i class="hp"><i class="palm"></i><i class="fg"></i><i class="th"></i><i class="cuff"></i></i>'
    $('fly').appendChild(el)
    var done = function () { S.guide = Object.assign({}, S.guide); S.guide[key] = 1; save(); unhand() }
    var cur = { el: el, get: getTarget, raf: 0, done: done }
    HAND = cur
    var loop = function () {
      if (HAND !== cur) return
      var t = null; try { t = cur.get() } catch (e) {}
      if (t && t.isConnected) {
        var r = t.getBoundingClientRect(), vis = r.width > 0 && r.bottom > 0 && r.top < innerHeight
        el.style.opacity = vis ? '' : '0'
        var x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2), pad = 6
        if (side) el.classList.toggle('flip', key !== 'home' && x > innerWidth * 0.62)
        // Home points from the arrow's right side, leaving the words uncovered. Shrink only the
        // decorative hand on a phone; the button itself retains its full touch target.
        if (key === 'home') el.style.setProperty('--hand-scale', Math.min(1, Math.max(0.45, (innerWidth - x - pad) / 96)))
        el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)'
        var parts = [].slice.call(el.querySelectorAll('.hp > i')).map(function (p) { return p.getBoundingClientRect() })
        var left = Math.min.apply(null, parts.map(function (p) { return p.left })), right = Math.max.apply(null, parts.map(function (p) { return p.right }))
        var top = Math.min.apply(null, parts.map(function (p) { return p.top })), bottom = Math.max.apply(null, parts.map(function (p) { return p.bottom }))
        x += Math.max(0, pad - left) - Math.max(0, right - innerWidth + pad)
        y += Math.max(0, pad - top) - Math.max(0, bottom - innerHeight + pad)
        el.style.transform = 'translate3d(' + Math.round(x) + 'px,' + Math.round(y) + 'px,0)'
      } else el.style.opacity = '0'
      cur.raf = requestAnimationFrame(loop)
    }
    loop()
    setTimeout(function () { if (HAND === cur) document.addEventListener('pointerdown', done, true) }, 0)
    if (line) setTimeout(function () { if (HAND === cur) say(line) }, 500)
  }
  function unhand () {
    if (!HAND) return
    var h = HAND; HAND = null
    cancelAnimationFrame(h.raf); document.removeEventListener('pointerdown', h.done, true)
    if (reduced() || !h.el.animate) { h.el.remove(); return }
    var a = h.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-out', fill: 'forwards' })
    a.finished.then(function () { h.el.remove() }, function () { h.el.remove() })
  }

  /* ── progress model ─────────────────────────────────────────────────── */
  function starsOf (w, l) { return ((S.stars[w] || {})[l]) || 0 }
  function worldStars (w) { var o = S.stars[w.id] || {}; return w.levels.reduce(function (n, l) { return n + (o[l.id] || 0) }, 0) }
  function totalStars () { return WD.WORLDS.reduce(function (n, w) { return n + worldStars(w) }, 0) }
  function maxStars () { return WD.WORLDS.reduce(function (n, w) { return n + w.levels.length * 3 }, 0) }
  // levels inserted later (lv.added) are optional: a finished world stays finished, reached levels stay open (TKAtlas rules)
  function sfOf (w) { return function (id) { return starsOf(w.id, id) } }
  function worldDone (w) { return W.TKAtlas ? TKAtlas.worldDone(w, sfOf(w)) : w.levels.every(function (l) { return starsOf(w.id, l.id) > 0 }) }
  function levelOpen (w, k) { return W.TKAtlas ? TKAtlas.levelOpen(w, k, sfOf(w)) : k < 3 || [1, 2, 3].some(function (b) { return k - b >= 0 && starsOf(w.id, w.levels[k - b].id) > 0 }) }
  /* WORLD UNLOCK (branching sea chart, tk-atlas.js): S.atlas.open only grows. The first run on an old linear save
     migrates it (old linear rule + every world with stars + the graph rules). A world the atlas does not know
     keeps the old linear rule. */
  var AG = null, AGK = ''
  function atlasG () {
    if (!W.TKAtlas) return null
    var ids = WD.WORLDS.map(function (w) { return w.id }), k = ids.join(',')
    if (k !== AGK) { AGK = k; AG = TKAtlas.graph(ids) }
    return AG
  }
  function atlasNow () {
    var G = atlasG(); if (!G) return null
    var done = {}, started = {}
    WD.WORLDS.forEach(function (w) { if (worldDone(w)) done[w.id] = 1; if (worldStars(w) > 0) started[w.id] = 1 })
    if (S.last && S.last.w) started[S.last.w] = 1
    if (!S.atlas) { S.atlas = { v: 1, open: TKAtlas.migrate(G, { done: done, fragments: S.fragments.length, started: started }) }; save() }
    var kept = {}; S.atlas.open.forEach(function (id) { kept[id] = 1 })
    var r = TKAtlas.compute(G, { done: done, fragments: S.fragments.length, open: kept })
    if (r.newly.length) { S.atlas = { v: 1, open: S.atlas.open.concat(r.newly).sort() }; save() }
    return r
  }
  function worldOpenLinear (i) { return i === 0 || worldDone(WD.WORLDS[i - 1]) || (S.fragments.length >= i - 1 && i <= 1) }
  function worldOpen (i) {
    var w = WD.WORLDS[i], r = w && atlasNow()
    if (r && TKAtlas.NODES[w.id]) return !!r.open[w.id]
    return (r && r.open[w && w.id]) || worldOpenLinear(i)
  }
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
    return '<span class="' + cls + '" style="background:' + esc(Art.scene(w.scene)) + '"><img src="' + esc(Art.vessel(w)) + '" alt="" draggable="false"></span>'
  }
  function home () {
    show('scr-home')
    $('home-sky').style.background = Art.scene('harbor-dawn')
    $('home-timmy').src = Art.src('char/timmy')
    document.querySelectorAll('#home-px .gull').forEach(function (g) { if (!g.getAttribute('src')) g.src = Art.lib('tk-legend/seagull-3') })
    // owner logo sprite replaces the drawn logo once it exists (tk-key/logo)
    // playtest 2026-09-29: the logo sprite is lettered in English ("& THE LEGENDARY SHIPS · EXPLORE…"): the game shows
    // the drawn Indonesian logo instead, with ONE tagline (the ribbon). Flip LOGO_ART once an Indonesian sprite exists.
    var li = $('logo-img'); if (LOGO_ART && li && !li.dataset.tried && W.AssetIndex && AssetIndex.path('tk-key/logo')) { li.dataset.tried = 1; li.onload = function () { li.classList.remove('hide'); var d = document.querySelector('#scr-home .logo'); if (d) d.classList.add('hide') }; li.src = Art.src('ui/logo') }
    paintChip()
    $('start-t').textContent = S.seenIntro ? 'Lanjutkan Petualangan' : 'Mulai Petualangan'
    // the one big button goes straight into the next unplayed level; its small line says which
    var nu = nextUp(), sub = $('start-sub')
    if (sub) sub.textContent = nu ? (nu.w.id === 'kamar' ? 'Kamar Timmy' : nu.w.name) + ' · ' + unitLabel(nu.w, nu.k) : 'Semua level selesai!'
    skel($('home-sky'))
    var list = shipWorlds()
    // first card: Galeri Kapal (every TKFleet ship, Modern + Legenda; owner 2026-09-30 looked for Edmund Fitzgerald here)
    $('carousel').innerHTML = galCard() + list.map(function (w) {
      var open = worldOpen(wIndex(w))
      return '<button class="sc' + (open ? '' : ' locked') + '" type="button" data-w="' + w.id + '" aria-label="' + esc(w.name + (open ? '' : ' (terkunci)')) + '">' + shipScene(w, 'sc-img') + (open ? '' : lockBadge()) +
        '<span class="sc-t"><b>' + esc(w.name) + '</b><small>' + esc(w.value) + '</small></span></button>'
    }).join('')
    $('car-dots').innerHTML = [0].concat(list).map(function (w, i) { return '<i' + (i ? '' : ' class="on"') + '></i>' }).join('')
    $('cats').innerHTML = CATS.filter(function (c) { return c[0] !== 'islam' || S.settings.islam }).map(function (c) {
      return '<button class="cat" type="button" data-d="' + c[0] + '"><i style="background:' + c[3] + '"><img src="' + esc(Art.lib(c[2])) + '" alt=""></i><span>' + c[1].replace('Matematika', 'Mate\u00ADmatika').replace('Pengetahuan', 'Penge\u00ADtahuan') + '</span></button>'
    }).join('')
    paintSound()
    carouselWire(); requestAnimationFrame(paintCar)
    skel($('carousel'))
    hand('home', function () { return $('btn-start').querySelector('.chev') || $('btn-start') }, S.seenIntro ? 'Ketuk tombol kuning untuk lanjut berlayar!' : 'Halo! Ketuk tombol kuning untuk mulai berlayar!', 'r')   // side hand: it pointed down over the Kamar Timmy tile (playtest)
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
    var lg = $('ships-logo'); if (LOGO_ART && !lg.getAttribute('src') && W.AssetIndex && AssetIndex.path('tk-key/logo')) lg.src = Art.src('ui/logo')
    $('ships-stars').innerHTML = IC('star') + '<span>' + totalStars() + '/' + maxStars() + '</span>'
    // kid-safe chip labels (playtest 2026-09-30): no war / disaster words on a filter chip
    var KID_CAT = { tragedi: 'Kisah Haru', 'perang-damai': 'Kenangan & Damai' }
    var cats = WD.CATS.map(function (c) { return /perang|tragedi|bencana/i.test(c[1]) && KID_CAT[c[0]] ? [c[0], KID_CAT[c[0]]] : c }).concat([['favorit', 'Favorit']])
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
    skel($('ship-list')); skel($('ships-bg'))
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
        (isl ? '<span><img src="' + esc(Art.lib(isl)) + '" alt=""></span>' : '') + '<span><img src="' + esc(Art.lib(THUMB[w.id] || w.thumb || 'tk-prop/compass-3')) + '" alt=""></span></div>' +
      '<dl><dt>Tahun</dt><dd>' + (w.year || '-') + '</dd><dt>Jenis</dt><dd>' + esc(sp.type || '') + '</dd><dt>Panjang</dt><dd>' + esc(sp.length || '') + '</dd><dt>Terkenal karena</dt><dd>' + esc(sp.famous || '') + '</dd></dl>' +
      '<button class="btn b-gold fk sail" type="button" id="btn-sail">' + IC('start') + '<span>' + (open ? 'Berlayar!' : 'Terkunci') + '</span><i class="chev" aria-hidden="true"></i></button>'
    A(d, [{ opacity: 0.4, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: EO })
    skel(d)
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
  function isleArt (id) { var k = ISLE[id] || (W.TKAtlas && TKAtlas.NODES[id] && TKAtlas.NODES[id].isle) || (WD.get(id) || {}).isle; return k && W.AssetIndex && AssetIndex.path(k) ? k : null }
  /* the WORLD SELECT sea chart (tk-atlas.js: regions, branching routes, sea gates, pan / zoom, mini-map). */
  var ATL = null
  function atlasHere (G, r) {
    var l = S.last && S.last.w
    if (l && G.has[l] && r.open[l]) return l
    var best = 'kamar'; G.order.forEach(function (id) { if (r.done[id]) best = id })
    return best
  }
  function worldView () {
    show('scr-world')
    document.getElementById('scr-world').classList.toggle('atl-on', !!W.TKAtlas)
    $('sea-bg').style.background = Art.scene('harbor-day')
    $('world-stars').innerHTML = IC('star') + '<span>' + totalStars() + '/' + maxStars() + '</span>'
    bnav('peta')
    layoutWorld()
    skel($('sea-bg'))
    if ($('islands').querySelector('.atl-node.next')) hand('world', function () { return $('islands').querySelector('.atl-node.next .land') }, 'Ketuk pulau yang bersinar untuk berlayar!', true)
  }
  function layoutWorld () {
    var G = atlasG(), r = atlasNow(); if (!G || !r) return
    var here = atlasHere(G, r)
    ATL = TKAtlas.mount($('islands'), {
      G: G, status: r, here: here, next: TKAtlas.next(G, r, S.last && S.last.w),
      world: function (id) { var w = WD.get(id) || { name: id }; return { name: id === 'kamar' ? 'Kamar Timmy' : w.name, shipSrc: w.ship ? Art.vessel(w) : (TKAtlas.NODES[id].ship && W.AssetIndex && AssetIndex.path(TKAtlas.NODES[id].ship) ? Art.lib(TKAtlas.NODES[id].ship) : '') } },
      stars: function (id) { var w = WD.get(id); if (!w || !w.levels.length) return 0; return worldDone(w) ? Math.max(1, Math.round(worldStars(w) / (w.levels.length * 3) * 3)) : Math.min(2, Math.round(worldStars(w) / (w.levels.length * 3) * 3)) },
      frag: function (id) { return S.fragments.indexOf(id) >= 0 },
      lib: function (k) { return k && W.AssetIndex && AssetIndex.path(k) ? Art.lib(k) : '' },
      icon: IC, scene: Art.scene, reduced: reduced, click: function () { SND.click() },
      boat: Art.lib('vehicles/sailboat'), timmy: Art.src('char/timmy'),
      pick: atlasPick
    })
    skel($('islands'))
  }
  // an open world: Timmy's boat sails the route there, then the world opens; a locked one shakes + says why
  function atlasPick (id, el) {
    var G = atlasG(), r = atlasNow(); if (!G || !r) return
    if (!r.open[id]) {
      var land = el && el.querySelector('.land')
      if (land) A(land, [{ translate: '0 0' }, { translate: '-8px 0' }, { translate: '7px 0' }, { translate: '-4px 0' }, { translate: '0 0' }], { duration: 240, easing: 'ease-out' })
      toast(TKAtlas.hint(G, id, r, function (x) { var w = WD.get(x); return x === 'kamar' ? 'Kamar Timmy' : w ? w.name : x }))
      return
    }
    SND.click(); unhand()
    if (ATL) ATL.sail(id, function () { openWorld(id) }); else openWorld(id)
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
    $('captain').innerHTML = '<img src="' + esc(Art.src(CAPT[w.id] || w.guideArt || 'char/captain')) + '" alt=""><div><b>' + esc(cap.name) + '</b><span>“' + esc(cap.quote) + '”</span></div>'
    $('captain').classList.add('hide')   // every world: the guide speaks from the board's footer bubble
    $('scr-map').classList.add('cmode')
    layoutRoute(w)
    skel($('map-bg'))
    if ($('route').querySelector('.chap.next')) hand('map', function () { return $('route').querySelector('.chap.next .md') }, w.chapters ? 'Ketuk bab yang bersinar untuk bermain!' : 'Ketuk level yang bersinar untuk bermain!', true)
  }
  /* ── LEVEL MAP (every other world): the same parchment board in "level mode" (.lmode) ──
     Big medallions showing the level's art (the ship for the opening level, a prop per level type, a
     treasure chest for the compass fragment), a number badge, "Judul" + "(jenis)" and a row of 3 stars
     under each; a serpentine rope route (odd rows run right→left, a row change runs down the board edge);
     the current level pulses under a "Main!" flag with the world's ship bobbing beside it; the guide
     speaks from the footer bubble. Columns are picked for the biggest medallion that fits. */
  var TYPE_SUB = { quiz: 'Kuis', grid: 'Jalur', sort: 'Pilah', steer: 'Kemudi', lanes: 'Navigasi', story: 'Cerita', cutscene: 'Cerita', cinema: 'Film' }
  var TYPE_PIC = { grid: 'tk-prop/treasure-map', sort: 'tk-prop/crate-plain', steer: 'tk-prop/ship-wheel', lanes: 'tk-prop/compass', story: 'tk-prop/adventure-log', cutscene: 'tk-prop/adventure-log', cinema: 'tk-prop/porthole' }
  var DOM_PIC = { umum: 'tk-prop/books-ocean', matematika: 'tk-prop/sextant', logika: 'tk-prop/compass-open-2', campur: 'tk-prop/nautical-chart', sains: 'tk-prop/globe-2' }
  function libOr (k, alt) { return Art.lib(k && W.AssetIndex && AssetIndex.path(k) ? k : alt) }
  function medPic (w, lv, k, done) {
    if (lv.pic) return Art.src(lv.pic)
    if (lv.fragment) return libOr(done ? 'tk-prop/treasure-chest-open' : 'tk-prop/treasure-chest-3', 'tk-prop/treasure-chest-2')
    if (k === 0 && w.ship) return Art.vessel(w)
    return libOr(lv.type === 'quiz' ? DOM_PIC[lv.domain] : TYPE_PIC[lv.type], 'tk-prop/compass-3')
  }
  // level-mode geometry: try each column count, keep the one with the biggest medallion
  // label block under a medallion of m px (mirrors the .lmode clamps; a narrow column wraps the title to 2 lines)
  function labOf (m, colW, short) {
    var cl = function (a, v, b) { return Math.max(a, Math.min(b, v)) }
    return Math.ceil(cl(14, m * 0.1, 20) * 1.15 * (colW < 170 ? 2 : 1) + (short ? 0 : cl(13, m * 0.075, 15) * 1.15) + cl(18, m * 0.13, 26) + 26)
  }
  // level-mode geometry: per column count, the biggest medallion whose rows (flag room + medallion + label)
  // fit the board; prefer a layout that fits, then the bigger medallion
  function levelGeom (n, bw, avail) {
    var land = innerWidth > innerHeight, short = innerHeight < 520, wide = bw >= 600, FLAG = 36
    var cand = land ? (short ? [Math.min(n, 6)] : [Math.min(5, Math.ceil(n / 2)), Math.min(5, n)]) : [2, 3]
    var mMin = short || !wide ? 64 : 96, best = null
    cand.forEach(function (cols) {
      var rows = Math.ceil(n / cols), colW = bw / cols, m = Math.min(colW * 0.64, 200)
      for (; m > mMin; m -= 2) if (rows * (m + labOf(m, colW, short) + FLAG) + 10 <= avail) break
      m = Math.round(Math.max(mMin, m))
      var labH = labOf(m, colW, short), need = rows * (m + labH + FLAG) + 10, fit = need <= avail
      if (!best || (fit && !best.fit) || (fit === best.fit && (fit ? m > best.m + 8 : need < best.need))) best = { cols: cols, rows: rows, colW: colW, m: m, labH: labH, need: need, fit: fit }
    })
    best.rowH = Math.max(Math.floor((avail - 10) / best.rows), best.m + best.labH + FLAG)
    best.top = FLAG + Math.max(0, Math.round((best.rowH - FLAG - best.m - best.labH) * 0.5))
    return best
  }
  /* ── CHAPTER MAP (owner mockup ui-12 "CHAPTER MAP — A Journey of Knowledge and Courage") ──
     A parchment sea chart: a wooden title plate, round chapter medallions (the chapter's scene + an owner
     sprite) with "N. Judul" and "(Subjudul)", a dashed route in reading order (each row left→right; a row
     change runs down the right edge, back along the gap under the titles, down the left edge), a small
     ship that sails from the last finished chapter to the current one, grey + lock for locked chapters,
     and a ribbon footer. 5 columns in landscape / wide portrait, 2 columns on a phone held upright.
     Worlds without chapters use the same board in level mode (see LEVEL MAP above). */
  var SHIP_RAF = 0
  function layoutChapters (w, still) {
    var host = $('route'), L = w.levels, n = L.length, lm = !w.chapters, cap = w.captain || {}
    cancelAnimationFrame(SHIP_RAF)
    var foot = lm ? (cap.quote ? '<footer class="cm-foot cm-guide"><img src="' + esc(Art.src(CAPT[w.id] || w.guideArt || 'char/captain')) + '" alt=""><span><b class="fk">' + esc(cap.name) + '</b><q>' + esc(cap.quote) + '</q></span></footer>' : '')
      : '<footer class="cm-foot fk">' + esc(w.mapFoot || '') + '</footer>'
    host.innerHTML = '<div class="cmap' + (lm ? ' lmode' : '') + (still ? ' still' : '') + '"><i class="cm-rose" aria-hidden="true"><img src="' + esc(Art.lib('tk-prop/compass-3')) + '" alt=""></i>' +
      '<header class="cm-plate"><b class="fk">' + esc(lm ? 'Peta ' + w.name : (w.mapTitle || 'Peta Bab')) + '</b><small>' + esc(w.mapSub || w.value) + '</small></header>' +
      '<div class="cm-board"></div>' + foot + '</div>'
    var cmap = host.firstChild, board = cmap.querySelector('.cm-board')
    var bw = board.clientWidth, land = innerWidth > innerHeight
    var short = innerHeight < 520
    var avail = board.clientHeight, cols, rows, colW, labH, rowH, m, top, pts = []
    if (lm) { var G = levelGeom(n, bw, avail); cols = G.cols; rows = G.rows; colW = G.colW; labH = G.labH; rowH = G.rowH; m = G.m; top = G.top }
    else {
      cols = land ? Math.min(5, n) : 2; rows = Math.ceil(n / cols); colW = bw / cols
      labH = short ? 34 : 44; rowH = land ? Math.max(short ? 104 : 150, Math.floor(avail / rows)) : Math.max(146, Math.min(bw >= 600 ? 220 : 176, Math.floor(avail / rows)))
      m = Math.round(Math.max(56, Math.min(colW * (land ? 0.56 : 0.5), rowH - labH - (short ? 18 : 30), bw >= 600 ? 132 : 116)))
      top = Math.max(4, Math.round((rowH - m - labH) * (short ? 0.3 : 0.4)))
    }
    for (var k = 0; k < n; k++) { var r = Math.floor(k / cols), c = k % cols; if (lm && r % 2) c = cols - 1 - c; pts.push({ x: colW * (c + 0.5), y: r * rowH + top + m / 2, row: r }) }
    var H = lm ? Math.max(rows * rowH, (rows - 1) * rowH + top + m + labH + 14) : rows * rowH
    board.style.height = H + 'px'
    // route: a gentle wave between neighbours; a row change goes right edge -> gap under the titles -> left edge
    // (level mode is serpentine: a row change just runs down the board edge beside the last medallion)
    var d = 'M' + pts[0].x.toFixed(0) + ' ' + pts[0].y.toFixed(0), segs = []
    for (var q = 1; q < n; q++) {
      var a = pts[q - 1], b = pts[q], sd, rr = 12
      if (a.row === b.row) sd = ' Q' + ((a.x + b.x) / 2).toFixed(0) + ' ' + (a.y + m * (lm ? 0.22 : 0.34)).toFixed(0) + ' ' + b.x.toFixed(0) + ' ' + b.y.toFixed(0)
      else if (lm) {
        var sg = a.x > bw / 2 || cols === 1 ? 1 : -1, ex = sg > 0 ? Math.min(bw - 8, a.x + colW / 2 - 4) : Math.max(8, a.x - colW / 2 + 4)
        sd = ' L' + (ex - sg * rr).toFixed(0) + ' ' + a.y.toFixed(0) + ' Q' + ex.toFixed(0) + ' ' + a.y.toFixed(0) + ' ' + ex.toFixed(0) + ' ' + (a.y + rr).toFixed(0) +
          ' L' + ex.toFixed(0) + ' ' + (b.y - rr).toFixed(0) + ' Q' + ex.toFixed(0) + ' ' + b.y.toFixed(0) + ' ' + (ex - sg * rr).toFixed(0) + ' ' + b.y.toFixed(0) + ' L' + b.x.toFixed(0) + ' ' + b.y.toFixed(0)
      } else {
        var e1 = Math.min(bw - 6, a.x + colW / 2 - 4), e2 = Math.max(6, b.x - colW / 2 + 4), gy = a.y + m / 2 + labH + Math.max(6, (rowH - m - labH) / 2) - 4
        sd = ' L' + (e1 - rr).toFixed(0) + ' ' + a.y.toFixed(0) + ' Q' + e1.toFixed(0) + ' ' + a.y.toFixed(0) + ' ' + e1.toFixed(0) + ' ' + (a.y + rr).toFixed(0) +
          ' L' + e1.toFixed(0) + ' ' + (gy - rr).toFixed(0) + ' Q' + e1.toFixed(0) + ' ' + gy.toFixed(0) + ' ' + (e1 - rr).toFixed(0) + ' ' + gy.toFixed(0) +
          ' L' + (e2 + rr).toFixed(0) + ' ' + gy.toFixed(0) + ' Q' + e2.toFixed(0) + ' ' + gy.toFixed(0) + ' ' + e2.toFixed(0) + ' ' + (gy + rr).toFixed(0) +
          ' L' + e2.toFixed(0) + ' ' + (b.y - rr).toFixed(0) + ' Q' + e2.toFixed(0) + ' ' + b.y.toFixed(0) + ' ' + (e2 + rr).toFixed(0) + ' ' + b.y.toFixed(0) + ' L' + b.x.toFixed(0) + ' ' + b.y.toFixed(0)
      }
      segs.push('M' + a.x.toFixed(0) + ' ' + a.y.toFixed(0) + sd); d += sd
    }
    var nextK = -1; for (var z = 0; z < n; z++) if (!starsOf(w.id, L[z].id) && levelOpen(w, z)) { nextK = z; break }
    var shipK = nextK >= 0 ? nextK : n - 1
    var rope = lm ? '<path d="' + d + '" fill="none" stroke="rgba(255,248,225,.7)" stroke-width="11" stroke-linecap="round"/>' +
        '<path d="' + d + '" fill="none" stroke="' + esc(w.color || '#7A5226') + '" stroke-opacity=".55" stroke-width="5" stroke-dasharray="2 12" stroke-linecap="round"/>' +
        (shipK > 0 ? '<path d="' + segs.slice(0, shipK).join(' ') + '" fill="none" stroke="#7A5226" stroke-width="5" stroke-dasharray="14 8" stroke-linecap="round"/>' : '')
      : '<path d="' + d + '" fill="none" stroke="rgba(255,248,225,.55)" stroke-width="6" stroke-linecap="round"/><path d="' + d + '" fill="none" stroke="#7A5226" stroke-width="3" stroke-dasharray="9 9" stroke-linecap="round"/>'
    board.innerHTML = '<svg class="cm-path" width="' + Math.round(bw) + '" height="' + H + '" aria-hidden="true">' + rope +
      (shipK > 0 ? '<path class="cm-seg" d="' + segs[shipK - 1] + '" fill="none" stroke="none"/>' : '') + '</svg>' +
      L.map(function (lv, k) {
        var st = starsOf(w.id, lv.id), open = levelOpen(w, k), pr = open && !st ? progOf(w, lv) : 0, stars = ''
        var sub = lm ? (lv.fragment ? 'Harta Karun' : TYPE_SUB[lv.type] || '') : lv.sub
        for (var i = 0; i < 3; i++) stars += IC('star', i < st ? '' : 'tk-ico--dim')
        return '<button class="chap' + (open ? '' : ' locked') + (st ? ' done' : '') + (k === nextK ? ' next' : '') + (lv.fragment ? ' chest' : '') + '" type="button" data-k="' + k + '"' +
          ' aria-label="' + esc(unitLabel(w, k) + ': ' + lv.title + (sub ? ' (' + sub + ')' : '') + (open ? '' : ' (terkunci)') + (lm && st ? ', ' + st + ' bintang' : '')) + '"' +
          ' style="left:' + pts[k].x.toFixed(0) + 'px;top:' + (pts[k].y - m / 2).toFixed(0) + 'px;--m:' + m + 'px;width:' + Math.floor(colW - 6) + 'px;animation-delay:' + k * 45 + 'ms">' +
          '<span class="md" style="background:' + esc(Art.scene(lv.picScene || lv.scene || w.scene)) + '"><img src="' + esc(lm ? medPic(w, lv, k, !!st) : (lv.pic ? Art.src(lv.pic) : Art.vessel(w))) + '" alt="" draggable="false">' +
            (open ? '' : '<i class="lk">' + IC('lock', '', '') + '</i>') + (pr ? '<i class="pr fk">' + pr + '/' + (lv.steps || []).length + '</i>' : '') + '</span>' +
          (lm ? '<b class="no fk" aria-hidden="true">' + (k + 1) + '</b>' + (k === nextK ? '<i class="ring" aria-hidden="true"></i><i class="flag fk" aria-hidden="true">Main!</i>' : '') : '') +
          '<span class="ct"><b class="fk">' + (lm ? '' : (k + 1) + '. ') + esc(lv.title) + '</b>' + (sub ? '<small>(' + esc(sub) + ')</small>' : '') + '</span>' +
          (st || lm ? '<span class="s">' + stars + '</span>' : '') + '</button>'
      }).join('') + (w.ship ? '<img class="cm-ship" src="' + esc(Art.vessel(w)) + '" alt="" draggable="false">' : '')
    skel(board)
    // the small ship: sails along the route from the previous chapter to the current one, stopping beside it
    var ship = board.querySelector('.cm-ship'), seg = board.querySelector('.cm-seg'), sw = Math.round(Math.max(44, m * (lm ? 0.56 : 0.62)))
    var nx = board.querySelector('.chap.next'), scrollNext = function () { if (nx && !land) setTimeout(function () { try { nx.scrollIntoView({ block: 'center', behavior: reduced() || still ? 'auto' : 'smooth' }) } catch (e) {} }, 80) }
    if (!ship) { scrollNext(); return }
    ship.style.width = sw + 'px'
    var bob = function () { if (lm) ship.classList.add('bob') }
    var place = function (x, y, flip) { x = Math.max(sw / 2 + 2, Math.min(bw - sw / 2 - 2, x));   // never cut by the board edge (chapter map too, playtest)
      ship.style.transform = 'translate3d(' + Math.round(x - sw / 2) + 'px,' + Math.round(y - sw * 0.62) + 'px,0)' + (flip ? ' scaleX(-1)' : '') }
    var P0 = pts[shipK]
    if (!seg || !seg.getTotalLength) {
      if (P0.x - m / 2 - sw - 6 < 0) place(P0.x + m / 2 + sw / 2 + 4, P0.y, false); else place(P0.x - m / 2 - sw / 2 - 4, P0.y, false)
      bob(); if (lm) scrollNext(); return
    }
    var len = seg.getTotalLength(), stop = Math.max(0, len - (m / 2 + sw / 2 + 8)), at = function (u) { return seg.getPointAtLength(u) }
    {   // back the ship off along the rope until it clears the current medallion (and, on level maps, its "Main!" flag)
      var clear = function (u) { var q = at(u), x = Math.max(sw / 2, Math.min(bw - sw / 2, q.x)); return x + sw / 2 < P0.x - m / 2 - 6 || x - sw / 2 > P0.x + m / 2 + 6 || q.y + sw * 0.2 < P0.y - m / 2 - 34 || q.y - sw * 0.62 > P0.y + m / 2 }
      while (stop > 0 && !clear(stop)) stop -= 4
    }
    var end = at(stop), flipEnd = at(Math.max(0, stop - 6)).x > end.x
    if (still) { place(end.x, end.y, flipEnd); bob(); return }   // a resize / rotation re-lays the map without sailing again
    if (reduced()) { place(end.x, end.y, flipEnd); ship.animate && ship.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 }); bob(); if (lm) scrollNext(); return }
    var t0 = performance.now() + 380, dur = 1400
    ;(function f (now) {
      if (!ship.isConnected) return
      var k = Math.max(0, Math.min(1, (now - t0) / dur)), e = 1 - Math.pow(1 - k, 3), u = stop * e, p = at(u), p2 = at(Math.min(len, u + 4))
      place(p.x, p.y, p2.x < p.x - 0.5 || (k >= 1 && flipEnd))
      if (k < 1) SHIP_RAF = requestAnimationFrame(f); else bob()
    })(performance.now())
    scrollNext()
  }
  function layoutRoute (w, still) { return layoutChapters(w, still) }
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
    var need = { story: 'TKStory', cutscene: 'TKStory', quiz: 'TKQuiz', sort: 'TKQuiz', grid: 'TKGrid', steer: 'TKSteer', lanes: 'TKLanes', cinema: 'TKCinema' }[lv.type]
    return need && !W[need] ? need : null
  }
  /* ── one-tap flow: the next unplayed level (the last world played first, then world order) ── */
  function firstUnplayed (w) {
    for (var k = 0; k < w.levels.length; k++) if (!starsOf(w.id, w.levels[k].id) && levelOpen(w, k)) return k
    return -1
  }
  function nextUp () {
    var last = S.last && WD.get(S.last.w), li = last ? wIndex(last) : -1
    if (li >= 0 && worldOpen(li)) { var lk = firstUnplayed(last); if (lk >= 0) return { w: last, k: lk } }
    // then the sea chart's glowing "next" world, then the chart's order (closest to home first)
    var G = atlasG(), an = G && TKAtlas.next(G, atlasNow(), S.last && S.last.w), aw = an && WD.get(an)
    if (aw && worldOpen(wIndex(aw))) { var ak = firstUnplayed(aw); if (ak >= 0) return { w: aw, k: ak } }
    var ord = WD.WORLDS.map(function (w, i) { return i })
    if (G) ord.sort(function (a, b) { var x = G.order.indexOf(WD.WORLDS[a].id), y = G.order.indexOf(WD.WORLDS[b].id); return (x < 0 ? 999 + a : x) - (y < 0 ? 999 + b : y) })
    for (var q = 0; q < ord.length; q++) {
      var i = ord[q]
      if (!worldOpen(i)) continue
      var k = firstUnplayed(WD.WORLDS[i]); if (k >= 0) return { w: WD.WORLDS[i], k: k }
    }
    return null
  }
  // "Ayo lanjut!" card (≈1 s, tap to skip), then the level itself; everything done → the World Map
  var goT = 0
  function goNext () {
    unhand()
    var n = nextUp(); if (!n) { toast('Hebat! Semua level sudah selesai. Pilih kapal favoritmu!'); worldView(); return }
    CUR.w = n.w
    var c = $('gocard'), lv = n.w.levels[n.k], go = function () { clearTimeout(goT); if (!c.classList.contains('show')) return; c.classList.remove('show'); c.onclick = null; startLevel(n.k) }
    c.innerHTML = '<div class="gc-bg" style="background:' + esc(Art.scene(lv.scene || n.w.scene || 'harbor-day')) + '"></div>' +
      '<div class="gc-card glass"><img class="gc-ship" src="' + esc(Art.vessel(n.w)) + '" alt=""><b class="fk">Ayo lanjut!</b>' +
      '<span>' + esc(n.w.id === 'kamar' ? 'Kamar Timmy' : n.w.name) + '</span><small>' + unitLabel(n.w, n.k) + ' · ' + esc(lv.title) + resumeNote(n.w, lv) + '</small></div>'
    c.classList.add('show'); skel(c)
    say('Ayo lanjut! ' + (isChap(lv) ? 'Bab ' + (n.k + 1) + ', ' : '') + lv.title)
    c.onclick = go
    goT = setTimeout(go, 1300)
  }
  /* ── chapters: helpers ──────────────────────────────────────────────── */
  var LOGO_ART = false   // the owner logo sprite is lettered in English; see home()
  var FAST = false   // QA seam (__tk.fast): shorter lanes runs, faster cinema — never set by the game itself
  function isChap (lv) { return !!lv && lv.type === 'chapter' }
  function unitLabel (w, k) { return (w && w.chapters ? 'Bab ' : 'Level ') + (k + 1) }
  function progOf (w, lv) { return (((S.progress || {})[w.id] || {})[lv.id]) | 0 }
  // clear: also forget the chapter's cinema scene checkpoints (chapter finished / replayed from the start)
  function setProg (w, lv, i, clear) {
    var o = Object.assign({}, (S.progress || {})[w.id])
    if (i > 0) o[lv.id] = i; else delete o[lv.id]
    S.progress = Object.assign({}, S.progress); S.progress[w.id] = o
    if (clear) { var hints = Object.assign({}, S.chapterHints); delete hints[w.id + '/' + lv.id]; S.chapterHints = hints }
    if (clear) { var c = Object.assign({}, S.cine), pre = w.id + '/' + lv.id + '/'; Object.keys(c).forEach(function (k) { if (k.indexOf(pre) === 0) delete c[k] }); S.cine = c }
    save()
  }
  function setCine (key, id) { var c = Object.assign({}, S.cine); if (id) c[key] = id; else delete c[key]; S.cine = c; save() }
  function resumeNote (w, lv) { var p = isChap(lv) && !starsOf(w.id, lv.id) ? progOf(w, lv) : 0; return p ? ' · Langkah ' + (p + 1) + '/' + lv.steps.length : '' }
  // body modes: lanes / cinema bring their own HUD (immersive), a story hides the play HUD (story-on)
  function mode (type) {
    var b = document.body.classList
    b.toggle('imm', type === 'lanes' || type === 'cinema'); b.toggle('lanes-on', type === 'lanes'); b.toggle('cine-on', type === 'cinema')
    // quiz / sort: Timmy and the Kapten stand beside the card in the full frame; the chapter column steps aside
    // (the plate + top-bar chip still name the chapter) — owner photo 2026-09-29
    b.toggle('quiz-on', type === 'quiz' || type === 'sort')
  }
  // "Bab 4 · Laut Lepas — Langkah 2/3": a brief chip at every step start (read aloud with the step goal)
  function stepLabel (ch, i) { return 'Langkah ' + (i + 1) + '/' + ch.steps.length }
  // step progress lives IN the chrome (top-bar chip, chapter card, story plate, lanes objective) — never a
  // floating chip over module content (coordinator 2026-09-29: it covered the grid plate at 1280x800)
  function stepChip (ch, i) {
    var st = ch.steps[i]
    $('lvchip').textContent = 'Bab ' + ch.no + ' · ' + ch.title + ' · ' + stepLabel(ch, i) + (st.title ? ' · ' + st.title : '')
  }
  function stepChipHide () {}
  // cross-fade of the play host between steps: opacity only (also with reduced motion), never a flash
  function hostFade (host, out, done) {
    if (!host.animate) { host.style.opacity = out ? '0' : ''; done && done(); return }
    var a = host.animate(out ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: 1 }], { duration: out ? 240 : 320, easing: out ? 'ease-in' : 'ease-out', fill: 'forwards' })
    var fin = false, f = function () { if (fin) return; fin = true; host.style.opacity = out ? '0' : ''; try { a.cancel() } catch (e) {} done && done() }
    a.finished.then(f, f); setTimeout(f, out ? 420 : 520)
  }

  function startLevel (k, opt) {
    var w = CUR.w, lv = w.levels[k]; if (!lv) return
    if (!levelOpen(w, k)) { toast(w.chapters ? 'Selesaikan bab sebelumnya dulu, ya!' : 'Selesaikan level sebelumnya dulu, ya!'); return }
    CUR.k = k; S.last = { w: w.id, k: k }; save()
    // the counting-scene ship in questions is the Titanic only in the Titanic world (playtest: a Titanic in Britannic)
    IC.ICONS.ship = w.id === 'titanic' ? ['tk-prop/titanic-ship'] : ['tk-ship/sailboat']
    var miss = isChap(lv) ? null : modsMissing(lv); if (miss) { toast('Bagian permainan ini sedang dimuat… coba lagi.'); return }
    if (PLAYING && PLAYING.handle && PLAYING.handle.destroy) { try { PLAYING.handle.destroy() } catch (e) {} }
    show('scr-play')
    $('lvchip').textContent = (w.id === 'kamar' ? 'Kamar Timmy' : w.name) + ' · ' + (k + 1) + '. ' + lv.title
    $('journal-n').textContent = S.cards.length
    var host = $('play-host'); host.innerHTML = ''; host.style.opacity = ''
    PLAYING = { w: w, lv: lv, k: k, handle: null, t0: Date.now() }
    if (isChap(lv)) {
      // a finished chapter (or a replay) starts at step 0; an unfinished one resumes at its checkpoint
      var fresh = (opt && opt.fresh) || starsOf(w.id, lv.id) > 0, from = fresh ? 0 : progOf(w, lv)
      if (opt && typeof opt.step === 'number') from = opt.step
      if (!(from >= 0 && from < lv.steps.length)) from = 0
      if (fresh) setProg(w, lv, 0, true)   // a replay forgets the old checkpoint (and its cinema scene)
      PLAYING.chap = { i: from, res: [], doneI: -1, hinted: S.chapterHints[w.id + '/' + lv.id] === true }
      $('lvchip').textContent = w.name + ' · Bab ' + lv.no + ' · ' + lv.title
      runStep(from, true)
      return
    }
    mode(lv.type); chapter(w, k)
    var go = function () { runPlayer(lv, host) }
    if (lv.story && lv.type !== 'story' && lv.type !== 'cutscene') story(host, lv.story, lv.title, go)
    else go()
  }
  // one step of a chapter: fade the previous step out, mount this one, fade in
  function runStep (i, first) {
    var P0 = PLAYING; if (!P0 || !P0.chap) return
    var ch = P0.lv, st = ch.steps[i], host = $('play-host')
    P0.chap.i = i; P0.step = st
    var mount = function () {
      if (PLAYING !== P0) return
      if (document.hidden || Object.keys(P0.pauseReasons || {}).length) { P0.resumeMount = mount; return }
      P0.resumeMount = null
      try { if (P0.handle && P0.handle.destroy) P0.handle.destroy() } catch (e) {}
      P0.handle = null; host.innerHTML = ''; document.body.classList.remove('story-on')
      mode(st.type); chapter(P0.w, P0.k)
      stepChip(ch, i)
      if (st.type === 'cinema') setProg(P0.w, ch, i)   // checkpoint right before every cinema
      hostFade(host, false)
      var miss = modsMissing(st)
      if (miss) { toast('Bagian permainan ini sedang dimuat… kita lanjut, ya!'); setTimeout(function () { stepDone(P0, i, { stars: 1 }) }, 900); return }
      var go = function () { runPlayer(st, host, function (res) { stepDone(P0, i, res) }) }
      if (st.story && st.type !== 'story' && st.type !== 'cutscene') story(host, st.story, st.title, go)
      else go()
    }
    if (first) mount(); else hostFade(host, true, mount)
  }
  function markChapterHint (P0) {
    if (PLAYING !== P0 || !P0.chap || P0.chap.hinted) return
    P0.chap.hinted = true
    S.chapterHints = Object.assign({}, S.chapterHints); S.chapterHints[P0.w.id + '/' + P0.lv.id] = true
    save()
  }
  function stepDone (P0, i, res) {
    if (PLAYING !== P0 || !P0.chap || P0.chap.i !== i || P0.chap.doneI === i) return
    P0.chap.doneI = i
    P0.chap.res.push(res || { stars: 3 })
    if (res && res.hinted) markChapterHint(P0)
    var ch = P0.lv, n = ch.steps.length
    if (i + 1 < n) { setProg(P0.w, ch, i + 1); SND.chime(); runStep(i + 1, false); return }
    setProg(P0.w, ch, 0, true)
    finish(aggregate(P0.chap.res, P0.chap.hinted))
  }
  // chapter result = its steps together: mean stars (story / cinema steps count as 3), summed answers
  function aggregate (list, hinted) {
    var o = { stars: 0, story: false, hinted: !!hinted }, n = 0
    list.forEach(function (r) {
      n++; o.stars += Math.max(1, Math.min(3, r.stars || 3))
      ;['right', 'asked', 'moves', 'shortest', 'hits'].forEach(function (k) { if (typeof r[k] === 'number') o[k] = (o[k] || 0) + r[k] })
      if (r.story) o.story = true
      if (r.hinted) o.hinted = true
    })
    o.stars = n ? Math.max(1, Math.min(3, Math.round(o.stars / n))) : 3
    if (o.hinted) o.stars = Math.min(o.stars, 2)
    if (o.right != null || o.moves != null || o.hits != null) o.story = false
    return o
  }
  function chapter (w, k) {
    var c = $('chapter'), host = $('play-host')
    if (!w || !w.levels) { c.innerHTML = ''; host.classList.remove('with-chapter'); return }
    var cur = w.levels[k]
    if (isChap(cur)) {   // a chapter: its steps, the current one highlighted
      var si = PLAYING && PLAYING.chap ? PLAYING.chap.i : 0
      c.innerHTML = '<div class="cimg" style="background:' + Art.scene(cur.picScene || cur.scene || w.scene) + '"><img src="' + (cur.pic ? Art.src(cur.pic) : Art.vessel(w)) + '" alt=""></div>' +
        '<h3 class="fk">Bab ' + cur.no + ' · ' + esc(cur.title) + '</h3><small class="stepl">' + stepLabel(cur, si) + ' · ' + esc(w.name) + '</small><ol>' + cur.steps.map(function (s, j) {
          return '<li class="' + (j === si ? 'now' : j < si ? 'done' : '') + '"><i>' + (j < si ? IC('ok') : j + 1) + '</i>' + esc(s.title || '') + '</li>' }).join('') + '</ol>'
      host.classList.add('with-chapter'); skel(c); return
    }
    var from = Math.max(0, Math.min(k - 2, w.levels.length - 5)), rows = w.levels.slice(from, from + 5)
    c.innerHTML = '<div class="cimg" style="background:' + Art.scene(w.scene) + '"><img src="' + Art.vessel(w) + '" alt=""></div>' +
      '<h3 class="fk">' + esc(w.name) + '</h3><small>' + esc(w.value) + '</small><ol>' + rows.map(function (l, j) {
        var idx = from + j, done = starsOf(w.id, l.id) > 0 && idx !== k
        return '<li class="' + (idx === k ? 'now' : done ? 'done' : '') + '"><i>' + (done ? IC('ok') : idx + 1) + '</i>' + esc(l.title) + '</li>' }).join('') + '</ol>'
    host.classList.add('with-chapter'); skel(c)
  }
  // level goal: shown IN the play HUD row (in place of the level chip) so it can never cover the
  // module's card header on a phone; fades out after 3.5 s (owner screenshot 2026-09-28)
  var goalT = 0
  // answer help (3 choices) only under Tingkat Soal = Mudah: an old save may carry easy:true next to level:'sulit'
  function easyOn () { return !!S.settings.easy && S.settings.level !== 'sulit' }
  function goal (text) {
    if (text && W.TKHub) TKHub.say(text)
    var g = $('goalbar'); clearTimeout(goalT)
    g.textContent = text || ''; g.className = 'goalbar' + (text ? ' show' : ''); document.body.classList.toggle('goal-on', !!text)
    if (text) goalT = setTimeout(function () { g.className = 'goalbar'; goalT = setTimeout(function () { document.body.classList.remove('goal-on') }, 320) }, S.settings.easy ? 5000 : 3500)
  }
  function chapLabel () {
    var P0 = PLAYING
    if (P0 && P0.chap) return 'Bab ' + P0.lv.no + ' · ' + P0.lv.title + ' · ' + stepLabel(P0.lv, P0.chap.i)
    var wi = CUR.w ? WD.WORLDS.indexOf(CUR.w) : -1
    return CUR.w ? CUR.w.name : ''
  }
  // Story reading, menu pauses and hidden tabs may overlap; subtract their union only once.
  function playIdle (P0, reason, on) {
    if (!P0) return
    var reasons = Object.assign({}, P0.idleReasons || {}), was = Object.keys(reasons).length > 0
    if (on) reasons[reason] = true; else delete reasons[reason]
    var now = Date.now(), active = Object.keys(reasons).length > 0
    if (!was && active) P0.idleSince = now
    if (was && !active) { P0.idle = (P0.idle || 0) + now - P0.idleSince; P0.idleSince = null }
    P0.idleReasons = reasons
  }
  function pausePlay (reason, on) {
    var P0 = PLAYING; if (!P0) return
    var reasons = Object.assign({}, P0.pauseReasons || {})
    if (on) reasons[reason] = true; else delete reasons[reason]
    var active = Object.keys(reasons).length > 0
    P0.pauseReasons = reasons; playIdle(P0, 'pause', active)
    if (!active && P0.resumeMount) { var mount = P0.resumeMount; P0.resumeMount = null; mount() }
    try { var handle = P0.handle, method = active ? 'pause' : 'resume'; if (handle && handle[method]) handle[method]() } catch (e) { console.error('[Timmy] pause', e) }
  }
  // keep: leave the last panel on screen when it ends (a chapter cross-fades it into the next step)
  function story (host, panels, title, done, keep) {
    document.body.classList.add('story-on')
    var P0 = PLAYING; playIdle(P0, 'story', true)
    P0 && (P0.handle = TKStory.play(host, panels, { title: title, chapter: chapLabel(), subtitle: P0 && P0.chap ? CUR.w.name : CUR.w && CUR.w.value,
      logo: LOGO_ART && W.AssetIndex && AssetIndex.path('tk-key/logo') ? Art.src('ui/logo') : '', sfx: { page: SND.page, go: SND.chime },
      say: say, listen: IC('listen', '', ''), easy: easyOn(),
      onDone: function () { if (PLAYING !== P0) return; playIdle(P0, 'story', false); document.body.classList.remove('story-on'); if (!keep) host.innerHTML = ''; done() } }))
  }
  function sfxBag () { return { click: SND.click, good: function () { SND.cue('correct') }, bad: function () { SND.cue('wrong') }, win: function () { SND.cue('levelup') }, splash: SND.splash, muted: !soundOn() } }
  // a TKArt character key whose sprite is not ingested yet falls back to a library key (no 404)
  function charKey (k, fb) {
    var u = Art.src(k), m = /assets\/db\/lib\/(.+)\.webp$/.exec(u || '')
    return (m && W.AssetIndex && W.AssetIndex.path && !W.AssetIndex.path(m[1])) ? fb : k
  }
  // one Knowledge Challenge card over the play host (lanes collisions, cinema questions)
  function challenge (host, o) {
    var p = TKQuiz.challenge(host, Object.assign({ hard: S.settings.level === 'sulit', world: CUR.w && CUR.w.id, grade: S.settings.grade, islam: S.settings.islam, mastery: S.mastery, lib: Art.lib, reducedMotion: reduced(),
      timmy: Art.src('char/timmy'), penguin: Art.src(charKey('char/penguin', 'animals/penguin')), sound: soundOn() ? undefined : false, readAloud: !!S.settings.narrate, say: say,
      title: 'Tantangan Pengetahuan', nextLabel: 'Lanjut' }, o))
    p.then(function (r) { if (r && r.masteryDelta && r.domain) { S.mastery[r.domain] = Math.max(0, Math.min(100, (S.mastery[r.domain] || 0) + r.masteryDelta)); save() } }, function () {})
    if (PLAYING) PLAYING.chal = p
    return p
  }
  // the quiz plate subtitle: what kind of questions these are (never another step's mission)
  var QUIZ_SUB = { matematika: 'Soal matematika: hitung dengan teliti!', islam: 'Soal Studi Islam: pilih jawaban yang benar.', arab: 'Soal Bahasa Arab: kenali katanya!',
    umum: 'Soal pengetahuan umum: kapal, laut, dan dunia.', logika: 'Teka-teki logika: pikirkan baik-baik!', campur: 'Soal campuran — jawab dan lanjut berlayar!' }
  function quizSub (d) { return QUIZ_SUB[d] || QUIZ_SUB.campur }
  // a scene that has a painted owner backdrop (else the sea harbour: never a plain gradient behind a board)
  function painted (sc) { return Art.SCENE_ART && Art.SCENE_ART[sc] ? sc : 'harbor-day' }
  function runPlayer (lv, host, end) {
    var w = CUR.w, r = rng((Date.now() ^ (CUR.k * 7919)) >>> 0), P0 = PLAYING
    end = end || finish
    // the play screen itself carries the step's scene (dimmed), so the column beside a module is never an
    // empty navy strip — the painting runs full-bleed behind the chapter card
    try { $('scr-play').style.background = 'linear-gradient(rgba(6,12,32,.62),rgba(6,12,32,.62)),' + Art.scene(painted(lv.scene || (P0 && P0.chap && P0.lv.scene) || w.scene)) } catch (e) {}
    var common = { sfx: sfxBag(), lib: Art.lib, reducedMotion: reduced(), timmy: Art.src('char/timmy'), penguin: Art.src(charKey('char/penguin', 'animals/penguin')), topInset: 70, hints: S.settings.hints,
      // Mode Mudah + read-aloud: modules that know them use them; the rest ignore unknown opts
      easy: easyOn(), readAloud: !!S.settings.narrate, say: say, tutorial: !S.seenSortTut,
      // the Arabic listening speaker: shown muted while G30 sound is off; its tap turns sound back on
      muted: function () { return !soundOn() }, onUnmute: function () { if (!soundOn()) toggleSound() } }
    var chN = P0 && P0.chap ? P0.lv : null
    if (lv.type !== 'lanes' && lv.type !== 'cinema') goal(lv.goal)
    var toMap = function () { try { PLAYING && PLAYING.handle && PLAYING.handle.destroy() } catch (e) {} PLAYING = null; $('play-host').innerHTML = ''; worldMap(w.id) }
    try {
      if (lv.type === 'story' || lv.type === 'cutscene') return story(host, lv.story || [], lv.title, function () { end({ stars: 3, story: true }) }, !!(P0 && P0.chap))
      if (lv.type === 'grid') {
        P0.handle = TKGrid.mount(host, WD.grid(lv, { level: S.settings.level }), Object.assign({}, common, { title: lv.title, mission: lv.goal, lib: Art.src, bg: Art.scene(painted(lv.scene || (chN && chN.scene) || w.scene)), chapterCard: false,
          chapter: chN ? { ship: Art.vesselKey(w), name: w.name, title: chN.title, label: 'Bab ' + chN.no + ' · ' + chN.title, idx: chN.no, total: w.levels.length }
            : { ship: Art.vesselKey(w), name: w.name, title: w.value, label: w.name, idx: CUR.k + 1, total: w.levels.length },
          onBack: toMap,
          onHint: function () { markChapterHint(P0) },
          onQuestion: function (q) { return challenge(host, { domain: q.topic || lv.domain || 'campur', seed: ((lv.seed || 7) * 97 + q.index * 13 + (Date.now() & 1023)) >>> 0, intro: q.reason === 'door' ? 'Jawab soal ini untuk membuka pintu.' : 'Jawab soal ini untuk membuka peti.', nextLabel: 'Lanjut' }) },
          art: { boat: Art.vesselKey(CUR.w), timmy: 'char/timmy', tipper: charKey('char/penguin', 'animals/penguin') },
          onDone: function (res) { end({ stars: res.stars, moves: res.moves, shortest: res.shortest, hinted: !!res.hinted }) } }))
        return
      }
      // action steps (steer / lanes): questions slipped into the sailing — a bump, a Soal buoy, a lighthouse gate —
      // each one Knowledge Challenge card (Mudah/Sulit, the step's topic, else the world's campur mix)
      var askAction = function (info) {
        info = info || {}
        return challenge(host, { domain: info.topic || lv.domain || 'campur', seed: ((lv.seed || 7) * 97 + (info.index || 0) * 13 + (Date.now() & 1023)) >>> 0,
          intro: info.intro || 'Jawab soal ini, lalu kapal berlayar lagi.', nextLabel: 'Lanjut Berlayar' })
      }
      if (lv.type === 'steer') {
        P0.handle = TKSteer.mount(host, Object.assign(WD.steer ? WD.steer(lv) : { mode: lv.mode, vessel: lv.vessel, goal: lv.goal }, { seed: (Date.now() >>> 0), questions: lv.questions }), Object.assign({ sfx: { muted: !soundOn() }, lib: Art.lib, world: w.id,
          // TKSteer sails the child's TKFleet ship (top-down art; the "Pilih Kapalmu" screen opens when none is saved)
          onQuestion: askAction,
          onDone: function (res) {
            sailedWith(P0)
            var after = function () { end({ stars: res.stars || 1, scripted: res.scripted, hits: res.hits, right: res.qAsked ? res.qRight : undefined, asked: res.qAsked || undefined }) }
            if (lv.after) { host.innerHTML = ''; story(host, lv.after, lv.title, after) } else after()
          } }, common))
        return
      }
      if (lv.type === 'lanes') {
        // three-lane navigation (tk-lanes): a collision asks one Knowledge Challenge; the Titanic's final run
        // (final:true) ends in the scripted impact that the next step's cinema continues
        P0.handle = TKLanes.mount(host, { seed: lv.seed || (Date.now() >>> 0), difficulty: lv.difficulty, final: !!lv.final, title: chN ? stepLabel(chN, P0.chap.i) + ' · ' + lv.title : lv.title, goal: lv.goal, sections: lv.sections,
          night: lv.night, lengthScale: FAST ? 0.6 : lv.lengthScale, tutorial: lv.tutorial, world: w.id, questions: lv.questions, obstacle: lv.obstacle }, {
          world: w.id, grade: S.settings.grade, mastery: S.mastery, islam: S.settings.islam, lib: Art.lib, sfx: { muted: !soundOn() }, reducedMotion: reduced(), topInset: 70,
          // the Titanic's chapters are the Titanic's own story: the child sails the Titanic (no ship picker there);
          // lanes in other worlds keep the TKFleet choice (saved pick, or the "Pilih Kapalmu" screen first)
          ship: w.chapters ? w.id : undefined,
          tutorial: !!lv.tutorial, narrate: !!S.settings.narrate, pauseOverlay: false,
          onQuestion: askAction,
          onDone: function (res) {
            sailedWith(P0)
            if (res.final) { end({ stars: 3, scripted: true }); return }
            end({ stars: res.stars, hits: res.collisions, right: res.qAsked ? res.qRight : undefined, asked: res.qAsked || undefined })
          } })
        return
      }
      if (lv.type === 'cinema') return cinema(lv, host, end)
      if (lv.type === 'reflection') return reflection(lv, host, end)
      if (lv.type === 'fragment') return fragmentStep(lv, host, end)
      var quit = function () { try { PLAYING && PLAYING.handle && PLAYING.handle.destroy && PLAYING.handle.destroy() } catch (e) {} var virt = PLAYING && PLAYING.virtual; PLAYING = null; $('play-host').innerHTML = ''; if (virt) home(); else worldMap(w.id) }
      // Kembali mid-quiz (playtest: a child left by accident) opens the pause menu: Lanjut Main / Peta / Beranda
      var askQuit = function () { var pb = $('btn-pause'); if (pb) pb.click(); else quit() }
      var opts = Object.assign({ scene: Art.scene(lv.scene || w.scene || 'harbor-day'), topic: lv.goal, onBack: askQuit, penguin: Art.src('char/penguin'), domain: lv.domain, world: w.id, count: lv.count || 4, grade: S.settings.grade, islam: S.settings.islam, mastery: S.mastery[lv.domain] || 0,
        onDone: function (res) {
          if (res && res.masteryDelta && lv.domain) S.mastery[lv.domain] = Math.max(0, Math.min(100, (S.mastery[lv.domain] || 0) + res.masteryDelta))
          var pct = res && res.asked ? res.right / res.asked : 1
          end({ stars: res && res.stars ? res.stars : (pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : 1), right: res && res.right, asked: res && res.asked, hints: res && res.hints })
        } }, common)
      if (lv.type === 'sort' && TKQuiz.mountSort && TKQuiz.sortSet) { S.seenSortTut = true; save() }
      if (lv.type === 'sort' && TKQuiz.mountSort && TKQuiz.sortSet) P0.handle = TKQuiz.mountSort(host, TKQuiz.sortSet(lv.domain, w.id, r, { islam: S.settings.islam }), opts)
      else {
        // the questions are picked with the step's goal (on-topic first), but the plate subtitle describes the
        // QUIZ itself: a mission line ("Antar barang…", "Bantu pasien…") never sits above an unrelated question
        // mix: about half Matematika, the step's own topic fills the rest (owner 2026-09-29); hard = Tingkat Soal Sulit
        var qs = TKQuiz.build({ mix: true, hard: S.settings.level === 'sulit', domain: lv.domain, world: w.id, count: lv.count || 4, grade: S.settings.grade, islam: S.settings.islam, mastery: S.mastery[lv.domain] || 0, topic: lv.goal, easy: common.easy, seed: (Date.now() ^ (CUR.k * 7919)) >>> 0 })
        // the subtitle follows the CURRENT question's topic (a mixed step keeps the neutral line)
        var subFor = function (d) { return lv.domain === 'campur' || !lv.domain ? QUIZ_SUB.campur : quizSub(d) }
        P0.handle = TKQuiz.mount(host, qs, Object.assign({}, opts, { topic: subFor(qs[0] && qs[0].domain), subFor: subFor }))
      }
    } catch (e) {
      try { console.warn('[tk] level failed to start', e) } catch (x) {}
      toast('Ups, bagian ini belum bisa dimulai. Kita lanjut, ya!')
      end({ stars: 1 })
    }
  }
  /* cinema step (tk-cinema): the chosen Titanic scenes; a question holds the scene clock and is asked with
     TKQuiz.challenge (the lifeboat seats question shows the 20 seats, 14 filled); every scene start is saved,
     so leaving mid-film resumes at that scene. */
  function cinema (lv, host, end) {
    var w = CUR.w, P0 = PLAYING, lib = W.TKCinema.TITANIC || {}
    var key = w.id + '/' + (P0.chap ? P0.lv.id : lv.id) + '/' + lv.id
    var seq = (lv.scenes || []).map(function (n) { var f = lib[n]; return typeof f === 'function' ? f() : null }).filter(Boolean)
    var ids = seq.map(function (x) { return x.id }), at = (S.cine || {})[key]
    if (ids.indexOf(at) < 0) at = null
    setCine(key, at || ids[0])
    P0.handle = W.TKCinema.play(host, seq, { startAt: at || undefined, say: function () {}, muted: !soundOn(), reducedMotion: reduced(), speed: FAST ? 6 : 1, lib: Art.lib,
      onCheckpoint: function (id, info) { if (PLAYING === P0 && info && info.phase === 'start') setCine(key, id) },
      onQuestion: function (q) {
        var o = { prompt: q.prompt, choices: q.choices, answer: q.answer, explain: q.explain }
        if (q.kind === 'seats') o.scene = { mode: 'capacity', cap: 20, fill: 14, groups: [] }
        return challenge(host, { question: o, intro: 'Jawab dulu, lalu ceritanya berlanjut.', nextLabel: 'Lanjut' })
      },
      onDone: function (res) {
        if (PLAYING !== P0) return
        var asked = 0, right = 0
        Object.keys((res && res.answers) || {}).forEach(function (k) { asked++; var a = res.answers[k]; if (a === true || (a && a.correct)) right++ })
        setCine(key, null)
        end({ stars: 3, story: true, right: asked ? right : undefined, asked: asked || undefined })
      } })
  }
  // reflection card: "Pelajaran dari Titanic" — three lessons (owner sprites) + one historical fact
  function reflection (lv, host, end) {
    var w = CUR.w, P0 = PLAYING
    var el = document.createElement('div'); el.className = 'tkx tkx-refl'; el.style.background = Art.scene(lv.scene || (P0.chap && P0.lv.scene) || w.scene)
    el.innerHTML = '<div class="tkx-card"><h2 class="fk">' + esc(lv.title) + '</h2><ul class="tkx-ls">' + (lv.lessons || []).map(function (x) {
      return '<li><img src="' + esc(Art.lib(x.k)) + '" alt=""><span><b class="fk">' + esc(x.t) + '</b><span>' + esc(x.s) + '</span></span></li>' }).join('') + '</ul>' +
      (lv.fact ? '<div class="tkx-fact"><img src="' + esc(Art.lib('tk-legend/journal-book')) + '" alt=""><p><b>Fakta Sejarah</b>' + esc(lv.fact) + '</p></div>' : '') +
      '<button class="btn b-gold fk tkx-go" type="button">Aku Mengerti<i class="chev" aria-hidden="true"></i></button></div>'
    host.appendChild(el); skel(el)
    var parts = el.querySelectorAll('.tkx-card h2, .tkx-ls li, .tkx-fact, .tkx-go')
    parts.forEach(function (p, i) { if (reduced()) { p.animate && p.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: i * 120, fill: 'backwards' }) } else A(p, [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 150 + i * 140, easing: EO, fill: 'backwards' }) })
    say(lv.title + '. ' + (lv.lessons || []).map(function (x) { return x.t + '. ' + x.s }).join(' '))
    var b = el.querySelector('.tkx-go'), fired = false
    tap(b, function () { if (fired) return; fired = true; end({ stars: 3, story: true }) })
    setTimeout(function () { try { b.focus({ preventScroll: true }) } catch (e) {} }, 600)
    P0.handle = { destroy: function () { el.remove() } }
  }
  // Time Compass fragment moment: the glowing piece, then it flies into Timmy's journal
  // fragments count per series: the Time Compass (14 worlds) and the Legend Ships (w.series 'legenda', PRD §14)
  function fragSeries (w) { return (w && w.series) || 'kompas' }
  function fragTally (w) {
    var se = fragSeries(w), has = function (x) { return WD.flat(x).some(function (l) { return l.fragment || l.type === 'fragment' }) }
    var total = WD.WORLDS.filter(function (x) { return fragSeries(x) === se && has(x) }).length
    var n = S.fragments.filter(function (id) { var x = WD.get(id); return x && fragSeries(x) === se }).length
    return { n: n, total: total || 14, legend: se === 'legenda' }
  }
  function fragmentStep (lv, host, end) {
    var w = CUR.w, P0 = PLAYING, ft = fragTally(w), n = ft.n + (S.fragments.indexOf(w.id) >= 0 ? 0 : 1)
    var el = document.createElement('div'); el.className = 'tkx tkx-frag'; el.style.background = Art.scene((P0.chap && P0.lv.scene) || w.scene)
    el.innerHTML = '<div class="tkx-card">' + compassSvg(n, true) + '<h2 class="fk">Kepingan Kompas Waktu!</h2><p>Kamu menemukan kepingan ke-' + n + ' dari ' + ft.total + '. Kompas Waktu makin lengkap!</p>' +
      '<button class="btn b-gold fk tkx-go" type="button">' + IC('compass') + '<span>Ambil Kepingan</span></button></div>'
    host.appendChild(el)
    var cmp = el.querySelector('.tkcmp')
    if (reduced()) { cmp.animate && cmp.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400 }) } else A(cmp, [{ opacity: 0, transform: 'scale(.2) rotate(-120deg)' }, { opacity: 1, transform: 'scale(1.12) rotate(8deg)', offset: 0.6 }, { opacity: 1, transform: 'none' }], { duration: 900, easing: EO })
    SND.bell(); say('Kepingan Kompas Waktu! Kamu menemukan kepingan ke ' + n + ' dari ' + ft.total + '.')
    var b = el.querySelector('.tkx-go'), fired = false
    tap(b, function () {
      if (fired) return; fired = true
      var fin = function () { end({ stars: 3, story: true }) }
      flyTo(IC.src('compass'), cmp, $('journal'), fin)
    })
    setTimeout(function () { try { b.focus({ preventScroll: true }) } catch (e) {} }, 700)
    P0.handle = { destroy: function () { el.remove() } }
  }


  /* ── REWARD ─────────────────────────────────────────────────────────── */
  function finish (res) {
    if (!PLAYING) return
    var w = PLAYING.w, lv = PLAYING.lv, k = PLAYING.k, t0 = PLAYING.t0, idleMs = (PLAYING.idle || 0) + (PLAYING.idleSince != null ? Date.now() - PLAYING.idleSince : 0)   // union of story, menu and background intervals
    // a world's way home (w.outro panels, Legend Ships PRD §14): played once, right after its fragment level
    if (!res.outro && lv.fragment && w.outro && w.outro.length && S.fragments.indexOf(w.id) < 0) {
      try { if (PLAYING.handle && PLAYING.handle.destroy) PLAYING.handle.destroy() } catch (e) {}
      var oh = $('play-host'); oh.innerHTML = ''; mode('story')
      story(oh, w.outro, 'Pulang ke Kamar', function () { finish(Object.assign({}, res, { outro: true })) })
      return
    }
    try { if (PLAYING.handle && PLAYING.handle.destroy) PLAYING.handle.destroy() } catch (e) {}
    PLAYING = null; document.body.classList.remove('story-on'); mode(null); stepChipHide()
    var host = $('play-host'); host.innerHTML = ''; host.style.opacity = ''
    var stars = Math.max(1, Math.min(3, res.stars || 1)), prev = starsOf(w.id, lv.id), chap = isChap(lv)
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
    var more = nextK < 0 && w.id !== 'latihan' ? nextUp() : null
    // "Luar biasa!" only when it is true: never above a quiz score with wrong answers (playtest: 0/2 under "Luar biasa!")
    var allRight = !res.asked || res.right >= res.asked
    var title = res.scripted ? 'Kamu tetap tenang!' : (stars === 3 && allRight ? 'Luar biasa!' : chap ? 'Bab Selesai!' : 'Level Selesai!')
    // the last chapter of a chapter world ends in Timmy's room, where the new ship model now stands
    var home2 = chap && nextK < 0 && !!w.chapters
    var fact = (w.cards || [])[Math.min((w.cards || []).length - 1, Math.floor(k / Math.max(1, (w.levels || []).length / 3)))]
    if (HUB) { try { HUB.destroy() } catch (e) {} }
    HUB = TKHub.reward($('scr-reward'), {
      world: w, k: k, stars: stars, scene: lv.scene || w.scene,
      chapter: chap ? w.name + ' · Bab ' + lv.no + ' · ' + lv.title : w.name,
      title: title,
      subtitle: 'Hebat, Timmy! ' + (lv.goal || ''), banner: false, cheer: lv.cheer,
      result: { moves: res.moves, shortest: res.shortest, timeMs: res.story ? 0 : Math.max(0, Date.now() - (t0 || Date.now()) - (idleMs || 0)), right: res.right, asked: res.asked, hits: res.hits, scripted: res.scripted, story: res.story },
      xp: xp, newCards: newCards,
      badge: newFrag ? { title: 'Lencana ' + w.name, sub: w.fragmentName ? 'Kepingan Legenda: ' + w.fragmentName : 'Kepingan kompas ditemukan' } : null,
      fragment: newFrag ? { n: fragTally(w).n, total: fragTally(w).total, finale: !!(w.levels[k] && w.levels[k].finale) } : null,
      fact: fact || null, levelStars: (w.levels || []).map(function (l) { return starsOf(w.id, l.id) }), hasNext: nextK >= 0 || !!more || home2,
      practice: w.id === 'latihan', mapLabel: w.id === 'latihan' ? 'Beranda' : null,
      nextLabel: home2 ? 'Kembali ke Kamar Timmy' : nextK >= 0 ? (chap ? 'Bab Berikutnya' : 'Lanjut') : 'Kapal Berikutnya',
      nextSub: home2 ? 'Lihat model ' + w.name + ' di koleksimu' : nextK >= 0 ? unitLabel(w, nextK) + ' · ' + w.levels[nextK].title : more ? (more.w.id === 'kamar' ? 'Kamar Timmy' : more.w.name) : ''
    }, {
      onReplay: function () { if (w.id === 'latihan') practice(lv.domain); else { CUR.w = w; startLevel(k, { fresh: true }) } },
      onNext: function () { if (home2) room('kapal', w.id); else if (nextK >= 0) { CUR.w = w; startLevel(nextK) } else goNext() },
      onMap: function () { if (w.id === 'latihan') home(); else worldMap(w.id) },
      sfx: { click: SND.click, chime: SND.chime, bell: SND.bell }
    })
    SND.cue(stars === 3 ? 'levelup' : 'star')
    say(title + ' Kamu dapat ' + stars + ' bintang. ' + (home2 ? 'Ketuk tombol kuning untuk kembali ke kamar Timmy!' : nextK >= 0 || more ? 'Ketuk tombol kuning untuk lanjut!' : 'Ketuk tombol kuning untuk kembali ke peta.'))
  }
  // Time-Compass progress: the owner's compass sprite inside a conic ring filled n/14 (no drawn pictogram)
  function compassSvg (n, glow) {
    return '<span class="tkcmp' + (glow ? ' glow' : '') + '" style="--p:' + (Math.max(0, Math.min(14, n)) / 14 * 100).toFixed(1) + '%" aria-hidden="true">' + IC('compass') + '</span>'
  }

  /* ── TIMMY'S ROOM (collection hub) ──────────────────────────────────── */
  var ROOM_TAB = 'kapal', HUB = null
  function room (tab, select) {
    ROOM_TAB = tab || ROOM_TAB; show('scr-room'); if (HUB) { try { HUB.destroy() } catch (e) {} }
    HUB = TKHub.room($('scr-room'), { save: S, worlds: WD.WORLDS, tab: ROOM_TAB, select: select || null, learn: CATS.filter(function (c) { return c[0] !== 'islam' || S.settings.islam }) },
      { onBack: home,
        onFav: function (id) { var on = S.fav.indexOf(id) < 0; S.fav = on ? S.fav.concat([id]) : S.fav.filter(function (x) { return x !== id }); save(); return on },
        onGallery: function () { gallery('room') },
        sfx: { click: SND.click } })
  }
  /* ── GALERI KAPAL (TKHub.gallery): every TKFleet ship; from the home carousel's first card and Kamar Timmy ── */
  function galCard () {
    var n = W.TKFleet ? TKFleet.ships.length : 50
    return '<button class="sc sc-gal" type="button" data-gal="1" aria-label="Galeri Kapal, ' + n + ' kapal"><span class="sc-img"><img src="' + esc(Art.lib('tk-legend-side/edmund-fitzgerald')) + '" alt="" draggable="false"></span>' +
      '<span class="sc-t"><b>Galeri Kapal</b><small>Semua ' + n + ' kapal</small></span></button>'
  }
  function gallery (from) {
    if (!W.TKHub || !TKHub.gallery) return room('kapal')
    show('scr-room'); if (HUB) { try { HUB.destroy() } catch (e) {} }
    HUB = TKHub.gallery($('scr-room'), { worlds: WD.WORLDS }, {
      onBack: from === 'room' ? function () { room() } : home,
      onWorld: openWorld,
      sfx: { click: SND.click, chime: SND.chime } })
  }
  // sail history for the Galeri Kapal ribbon: the ship a finished steer / lanes run sailed (TKFleet, per avatar)
  function sailedWith (P0) {
    try { var sh = P0 && P0.handle && P0.handle.state && P0.handle.state().ship; if (sh && W.TKFleet && TKFleet.markSailed) TKFleet.markSailed(TKFleet.avatar(), sh) } catch (e) {}
  }

  /* ── settings (TKHub.settings — mockup ui-11); parent area stays behind the hold gate ── */
  function settings () {
    show('scr-settings'); if (HUB) { try { HUB.destroy() } catch (e) {} }
    HUB = TKHub.settings($('scr-settings'), { save: S, worlds: WD.WORLDS, version: 'v63' }, {
      get: function () { return S.settings },
      set: function (p) { S.settings = Object.assign({}, S.settings, p); save(); TKHub.config(S.settings); paintSound(); TKHub.music(!!S.settings.music)
        document.documentElement.classList.toggle('rm', !!S.settings.reducedMotion) },
      onSave: function () { toast('Pengaturan disimpan!'); home() },
      onBack: home, onParent: parentGate, onExit: exitGame, sfx: { click: SND.click } })
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
  // the home sound button AND the always-visible speaker (#sndfab, every other screen) show one state
  function paintSound () {
    ;['btn-sound', 'sndfab'].forEach(function (id) { var b = $(id); if (!b) return; b.classList.toggle('off', !soundOn()); b.setAttribute('aria-pressed', soundOn() ? 'true' : 'false'); b.setAttribute('aria-label', soundOn() ? 'Suara: nyala (ketuk untuk bisukan)' : 'Suara: mati (ketuk untuk menyalakan)') })
    try { if (W.SFXEngine && SFXEngine.setMute) SFXEngine.setMute(!soundOn()) } catch (e) {}
    try { if (W.TKHub) TKHub.config(Object.assign({}, S.settings, { sound: soundOn() })) } catch (e) {}
    try { if (PLAYING && PLAYING.handle && PLAYING.handle.setMuted) PLAYING.handle.setMuted(!soundOn()) } catch (e) {}
    try { if (!soundOn() && AC && AC.state === 'running') AC.suspend(); else if (soundOn() && AC && AC.state === 'suspended') AC.resume() } catch (e) {}
  }
  function globalSoundChanged (event) {
    if (event.key !== 'dunia-emosi-sound' && event.key !== null) return
    try { GLOBAL_MUTE = localStorage.getItem('dunia-emosi-sound') === 'off' } catch (e) { return }
    paintSound()
  }
  W.addEventListener('storage', globalSoundChanged)
  // one tap: all G30 sound off / on (the same setting as Pengaturan > Bisukan semua; also lifts the main app's mute for G30)
  function toggleSound () { if (GLOBAL_MUTE) { GLOBAL_MUTE = false; S.settings = Object.assign({}, S.settings, { sound: true }) } else S.settings = Object.assign({}, S.settings, { sound: !S.settings.sound }); save(); paintSound(); if (soundOn()) SND.click() }

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
    // playtest 2026-09-30: the map icon opened ../index.html (left the game). It opens the sea chart; leaving is "Keluar"
    tap('btn-map', worldView)
    tap('p-exit', exitGame)
    tap('btn-start', function () {
      SND.horn(); if (W.TKHub) TKHub.music(!!S.settings.music && !GLOBAL_MUTE)
      if (!S.seenIntro) { S.seenIntro = true; save() }
      goNext()
    })
    // the level chip re-shows (and re-reads) the level goal
    tap('lvchip', function () { var g = PLAYING && ((PLAYING.step && PLAYING.step.goal) || (PLAYING.lv && PLAYING.lv.goal)); if (g) goal(g) })
    tap('btn-ships', ships); tap('btn-all', ships)
    tap('btn-settings', settings)
    tap('btn-continue', function () { var last = S.last && WD.get(S.last.w); worldMap(last ? last.id : 'kamar') })
    $('islands').addEventListener('click', function (e) { var b = e.target.closest('.isle'); if (!b) return; SND.click(); openWorld(b.getAttribute('data-w')) })
    $('bnav').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; SND.click(); var n = b.getAttribute('data-n')
      if (n === 'peta') worldView(); else if (n === 'cerita') room('kartu'); else if (n === 'tantangan') practice('campur'); else if (n === 'belajar') room('belajar'); else room('kapal') })
    $('room-tabs').addEventListener('click', function (e) { var b = e.target.closest('button[data-t]'); if (!b) return; SND.click(); room(b.getAttribute('data-t')) })
    tap('btn-room', function () { room('kapal') }); tap('btn-ach', function () { room('capaian') }); tap('btn-gallery', function () { room('kartu') })
    tap('btn-parent', parentGate)
    $('btn-sound').addEventListener('click', toggleSound)
    $('sndfab').addEventListener('click', toggleSound)
    paintSound()
    $('carousel').addEventListener('click', function (e) { var b = e.target.closest('.sc'); if (!b) return; SND.click(); if (b.hasAttribute('data-gal')) { gallery('home'); return } openWorld(b.getAttribute('data-w')) })
    $('cats').addEventListener('click', function (e) { var b = e.target.closest('.cat'); if (!b) return; SND.click(); practice(b.getAttribute('data-d')) })
    $('ship-filter').addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (!b) return; SND.click(); FILTER = b.getAttribute('data-c'); ships() })
    $('ship-list').addEventListener('click', function (e) {
      var f = e.target.closest('.fav'); if (f) { var id = f.getAttribute('data-fav'), at = S.fav.indexOf(id); if (at >= 0) S.fav.splice(at, 1); else S.fav.push(id); save(); SND.chime(); f.classList.toggle('on', at < 0); A(f, [{ transform: 'scale(1)' }, { transform: 'scale(1.4)' }, { transform: 'scale(1)' }], { duration: 300, easing: EO }); return }
      var b = e.target.closest('.shipcard'); if (!b) return; SND.click(); detail(b.getAttribute('data-w')) })
    $('route').addEventListener('click', function (e) { var b = e.target.closest('.node, .chap'); if (!b) return; SND.click()
      // a locked medallion: a gentle shake (the `translate` property, so the centring transform stays) + the hint toast
      if (b.classList.contains('locked')) A(b, [{ translate: '0 0' }, { translate: '-7px 0' }, { translate: '6px 0' }, { translate: '-4px 0' }, { translate: '0 0' }], { duration: 240, easing: 'ease-out' })
      startLevel(+b.getAttribute('data-k')) })
    tap('btn-story', function () { if (CUR.w) historyCards(CUR.w) })
    document.querySelectorAll('[data-back]').forEach(function (b) { tap(b, function () { var t = b.getAttribute('data-back'); if (t === 'ships') worldView(); else home() }) })
    var openPause = function () { $('pause').className = 'overlay show'; pausePlay('menu', true) }
    tap('btn-pause', openPause)
    // the lanes module keeps its own pause button (our HUD is hidden there): it opens OUR pause menu
    $('play-host').addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.tkl-pausebtn')) openPause() })
    tap('p-resume', function () { $('pause').className = 'overlay'; pausePlay('menu', false) })
    var quit = function (to) { $('pause').className = 'overlay'; try { PLAYING && PLAYING.handle && PLAYING.handle.destroy && PLAYING.handle.destroy() } catch (e) {} try { PLAYING && PLAYING.chal && PLAYING.chal.close && PLAYING.chal.close() } catch (e) {}
      var virt = PLAYING && PLAYING.virtual; PLAYING = null; document.body.classList.remove('story-on'); $('play-host').innerHTML = ''; $('play-host').style.opacity = ''; if (to === 'map' && CUR.w && !virt) worldMap(CUR.w.id); else home() }
    tap('p-map', function () { quit('map') }); tap('p-home', function () { quit('home') })
    var rzT = 0
    addEventListener('resize', function () { clearTimeout(rzT); rzT = setTimeout(function () { if (document.body.getAttribute('data-scr') === 'scr-map' && CUR.w) layoutRoute(CUR.w, true) }, 120) })
    document.documentElement.classList.toggle('rm', !!S.settings.reducedMotion)
  }
  // leave G30 for the Dunia Emosi hub (pause menu + Pengaturan "Keluar")
  function exitGame () { try { save() } catch (e) {} location.href = '../index.html' }
  function openWorld (id) {
    var i = -1; WD.WORLDS.forEach(function (w, k) { if (w.id === id) i = k })
    if (i < 0) return
    if (!worldOpen(i)) {
      var G = atlasG(), r = G && atlasNow()
      toast(G && TKAtlas.NODES[id] ? TKAtlas.hint(G, id, r, function (x) { var w = WD.get(x); return x === 'kamar' ? 'Kamar Timmy' : w ? w.name : x }) : 'Selesaikan ' + WD.WORLDS[i - 1].name + ' dulu untuk membuka kapal ini!')
      return
    }
    SND.horn(); worldMap(id)
  }

  /* ── offline warm-up (same approach as G27–G29) ─────────────────────── */
  function warmList () {
    var u = {}
    Object.keys(Art.SCENE_ART).forEach(function (k) { u[Art.lib('tk-scene/' + Art.SCENE_ART[k] + '-land')] = 1; u[Art.lib('tk-scene/' + Art.SCENE_ART[k] + '-port')] = 1 })
    ;['char/timmy', 'char/captain', 'game/compass', 'game/treasure-map', 'game/treasure-chest', 'game/trophy-gold', 'school/books', 'school/notebook', 'school/globe', 'vehicles/sailboat', 'game/crystal-ice',
      'game/flag-red', 'game/crate-wood', 'game/lifebuoy', 'game/anchor', 'things/light-bulb', 'game/coin-star', 'nature/moon-stars', 'gt/lock'].forEach(function (k) { u[Art.src(k)] = 1 })
    if (W.AssetIndex && AssetIndex.keys) AssetIndex.keys().forEach(function (k) {
      if (/^tk-(key|char|ui|legend|world|prop|scene)\//.test(k) && !/lady-hat|\/maid$/.test(k)) u[Art.lib(k)] = 1
    })
    if (W.TKFleet) TKFleet.ships.forEach(function (s) { u[Art.lib(s.top)] = 1; u[Art.lib(s.side)] = 1 })   // ship select (side) + gameplay (top), offline
    WD.WORLDS.forEach(function (w) { u[Art.vessel(w)] = 1 })
    ;['gt/undo', 'gt/play-confirm', 'things/trash-can', 'gt-el/lighthouse', 'gt-el/star-gold', 'gt-el/signpost-arrow', 'game/gear', 'gt/q-islamic', 'sd/cat-math', 'animals/penguin'].forEach(function (k) { u[Art.lib(k)] = 1 })
    ;['click', 'correct', 'wrong', 'levelup', 'star'].forEach(function (k) { u[Art.BASE + 'assets/sfx/' + k + '.mp3'] = 1 })
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
  document.addEventListener('visibilitychange', function () { pausePlay('hidden', document.hidden); if (document.hidden) save() })

  if (W.TKHub) TKHub.config(GLOBAL_MUTE ? Object.assign({}, S.settings, { sound: false, music: false, narration: false }) : S.settings)
  wire(); home()

  /* test seam for the QA gates */
  W.__tk = {
    state: function () { return { screen: document.body.getAttribute('data-scr'), world: CUR.w && CUR.w.id, k: CUR.k, playing: !!PLAYING, stars: totalStars(), fragments: S.fragments.length } },
    save: function () { return JSON.parse(JSON.stringify(S)) }, reset: function () { S = fill({}); save(); home(); return 'ok' },
    open: openWorld, start: function (wid, k) { var w = WD.get(wid); if (!w) return 'no world'; CUR.w = w; startLevel(k || 0); return 'ok' },
    finish: function (stars) { finish({ stars: stars || 3 }); return 'ok' }, set: function (k, v) { S.settings[k] = v; save(); return S.settings },
    next: function () { var n = nextUp(); return n && { world: n.w.id, k: n.k } }, go: function () { goNext(); return 'ok' },
    unlockAll: function () { WD.WORLDS.forEach(function (w) { S.stars[w.id] = S.stars[w.id] || {}; w.levels.forEach(function (l) { S.stars[w.id][l.id] = S.stars[w.id][l.id] || 1 }) }); save(); return 'ok' },
    warmList: warmList,
    handle: function () { return PLAYING && PLAYING.handle },
    // level(): for a chapter, the CURRENT STEP's type / id (so a gate drives it like a level) + the chapter
    level: function () {
      if (!PLAYING) return null
      if (PLAYING.chap) { var st = PLAYING.step || PLAYING.lv.steps[PLAYING.chap.i]; return { type: st.type, id: st.id, world: PLAYING.w.id, chapter: PLAYING.lv.id, step: PLAYING.chap.i, steps: PLAYING.lv.steps.length } }
      return { type: PLAYING.lv.type, id: PLAYING.lv.id, world: PLAYING.w.id }
    },
    // chapters: chapter(n [, step]) starts chapter n (1-based) of a chapter world (default titanic) — resume
    // rules as a tap on the map unless a step is given; step() = the running step; stepDone(stars) ends it
    chapter: function (n, step, wid) { var w = WD.get(wid || 'titanic'); if (!w || !w.levels[n - 1]) return 'no chapter'; CUR.w = w; startLevel(n - 1, typeof step === 'number' ? { step: step } : null); return 'ok' },
    step: function () { var P0 = PLAYING; return P0 && P0.chap ? { chapter: P0.lv.id, no: P0.lv.no, i: P0.chap.i, n: P0.lv.steps.length, type: (P0.step || {}).type, id: (P0.step || {}).id, title: (P0.step || {}).title } : null },
    stepDone: function (stars) { var P0 = PLAYING; if (!P0 || !P0.chap) return 'no chapter'; stepDone(P0, P0.chap.i, { stars: stars || 3 }); return 'ok' },
    progress: function () { return JSON.parse(JSON.stringify({ progress: S.progress, cine: S.cine })) },
    challenge: function () { return PLAYING && PLAYING.chal ? { open: !!document.querySelector('.tkq-chal'), state: PLAYING.chal.ctrl && PLAYING.chal.ctrl.state ? PLAYING.chal.ctrl.state() : null } : null },
    fast: function (on) { FAST = on !== false; return FAST },
    quizSubs: function () { return Object.keys(QUIZ_SUB).map(function (k) { return QUIZ_SUB[k] }) },
    // save migration check: load(raw save object) runs the same fill + migrate as a real start
    load: function (raw) { S = migrate(fill(JSON.parse(JSON.stringify(raw)))); save(); return JSON.parse(JSON.stringify(S)) },
    map: function (wid) { worldMap(wid || 'titanic'); return 'ok' },
    room: function (tab, sel) { room(tab || 'kapal', sel); return 'ok' },
    // world-select sea chart: unlock status (open / done / next / Timmy's spot) and the view controller
    atlas: function () { var G = atlasG(), r = atlasNow(); return r && { open: Object.keys(r.open).sort(), done: Object.keys(r.done).sort(), need: r.need, fragments: r.fragments, saved: S.atlas && S.atlas.open.slice(), here: atlasHere(G, r), next: TKAtlas.next(G, r, S.last && S.last.w) } },
    world: function () { worldView(); return 'ok' }
  }
})()
