/* ============================================================================
 * tk-hub.js — window.TKHub. G30 "Timmy & Kapal Legendaris" hub screens drawn to the
 * owner's mockups: reward (ui-10 "Level Selesai"), room (ui-09 "Koleksi Kapal"),
 * settings (ui-11 "Pengaturan"), plus narration (TKHub.say) and an original WebAudio
 * sea-shanty loop (TKHub.music). CSS is injected once and scoped under .tkh-.
 *
 *   TKHub.config(settings)               share S.settings (sound, music, narration, musicVol,
 *                                        sfxVol, voiceVol, reducedMotion, effects) — call on load
 *                                        and after every settings change
 *   TKHub.reward(host, data, handlers)   -> { destroy }
 *   TKHub.room(host, data, handlers)     -> { destroy, select(id), tab(name) }
 *   TKHub.settings(host, data, handlers) -> { destroy }
 *   TKHub.say(text) · TKHub.music(on) · TKHub.stats(save, worlds) · TKHub.achievements(stats)
 *   TKHub.normalize(settings) -> copy with musicVol/sfxVol/voiceVol filled and booleans in sync
 *
 * Owner rules: sprites only (no emoji / glyph icons; CSS arrow shapes allowed), no woman
 * without hijab, no shop / coins / gems, Bahasa Indonesia, tap targets >= 44 px, text >= 12 px,
 * transform/opacity motion on cubic-bezier(.23,1,.32,1), reduced motion = fades only.
 * ==========================================================================*/
(function () {
  'use strict'
  var W = window, D = document
  var EO = 'cubic-bezier(.23,1,.32,1)'
  var CFG = { sound: true, music: true, narration: true, musicVol: 70, sfxVol: 80, voiceVol: 100, reducedMotion: false, effects: true }

  /* ── helpers ─────────────────────────────────────────────────────────── */
  function esc (t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }
  function lib (k) { var A = W.TKArt; if (A && A.lib) return A.lib(k); var p = W.AssetIndex && AssetIndex.path && AssetIndex.path(k); return p || '/assets/db/lib/' + k + '.webp' }
  function art (k) { var A = W.TKArt; return A && A.src ? A.src(k) : lib(k) }
  function scene (k) { var A = W.TKArt; return A && A.scene ? A.scene(k) : '#15295A' }
  function ico (k, cls) { return '<img class="tkh-i' + (cls ? ' ' + cls : '') + '" src="' + esc(lib(k)) + '" alt="" draggable="false" onerror="this.style.visibility=\'hidden\'">' }
  function img (u, cls) { return '<img class="' + (cls || '') + '" src="' + esc(u) + '" alt="" draggable="false" onerror="this.style.visibility=\'hidden\'">' }
  function reduced () { try { return !!CFG.reducedMotion || W.matchMedia('(prefers-reduced-motion: reduce)').matches } catch (e) { return !!CFG.reducedMotion } }
  function anim (el, f, o) {
    if (!el || !el.animate) return null
    if (reduced()) { f = [{ opacity: 0 }, { opacity: 1 }]; o = { duration: 220, delay: o && o.delay || 0, fill: 'both', easing: 'linear' } }
    try { return el.animate(f, Object.assign({ easing: EO, fill: 'both' }, o)) } catch (e) { return null }
  }
  function starsRow (n, max, cls) { var s = ''; for (var i = 0; i < (max || 3); i++) s += ico('tk-ui/star', i < n ? 'on' : 'off'); return '<span class="tkh-st ' + (cls || '') + '">' + s + '</span>' }
  function xpLevel (xp) { xp = xp || 0; return { lv: Math.floor(xp / 300) + 1, cur: xp % 300 } }
  function clamp (v, a, b) { return Math.max(a, Math.min(b, v)) }
  // root element that tracks its own size (portrait / landscape / short) — works for any host size
  function mountRoot (host, cls) {
    host.innerHTML = ''
    var r = D.createElement('div'); r.className = 'tkh ' + cls; host.appendChild(r)
    var fit = function () { var w = r.clientWidth || W.innerWidth, h = r.clientHeight || W.innerHeight
      r.classList.toggle('is-port', w < 700 || h > w * 1.05); r.classList.toggle('is-land', !(w < 700 || h > w * 1.05)); r.classList.toggle('is-short', h < 560) }
    fit()
    var ro = null; try { ro = new ResizeObserver(fit); ro.observe(r) } catch (e) { W.addEventListener('resize', fit) }
    r._off = function () { try { if (ro) ro.disconnect(); else W.removeEventListener('resize', fit) } catch (e) {} }
    return r
  }
  function on (root, sel, ev, fn) { root.addEventListener(ev, function (e) { var t = e.target.closest ? e.target.closest(sel) : null; if (t && root.contains(t)) fn(t, e) }) }
  function profileChip (xp) {
    var x = xpLevel(xp)
    return '<div class="tkh-prof">' + img(art('char/timmy'), 'av') + '<div><b>Timmy</b><span>' + ico('tk-ui/star', 'on') + 'Level ' + x.lv + '</span>' +
      '<i class="bar"><s style="transform:scaleX(' + (x.cur / 300).toFixed(3) + ')"></s><em>' + x.cur + ' / 300</em></i></div></div>'
  }
  function backBtn () { return '<button type="button" class="tkh-btn blue tkh-back" data-act="back"><i class="tkh-arr l"></i>Kembali</button>' }

  /* ── sound (tiny synth; respects sound + sfxVol) ──────────────────────── */
  var AC = null
  function ctx () { try { if (!AC) AC = new (W.AudioContext || W.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume() } catch (e) { AC = null } return AC }
  function blip (f0, f1, d, v, type, when) {
    if (!CFG.sound || !(CFG.sfxVol > 0)) return
    var c = ctx(); if (!c) return
    try { var t = c.currentTime + (when || 0), g = c.createGain(), o = c.createOscillator(), vol = (v || 0.1) * CFG.sfxVol / 100
      o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d)
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d)
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + 0.05) } catch (e) {}
  }
  var SFX = {
    tick: function () { blip(1500, 1400, 0.035, 0.05, 'triangle') },
    pop: function (i) { blip(520 + (i || 0) * 180, 900 + (i || 0) * 220, 0.18, 0.12, 'triangle') },
    chime: function () { blip(880, 880, 0.35, 0.09); blip(1320, 1320, 0.45, 0.07, 'sine', 0.11) },
    bell: function () { blip(1046, 1040, 1.1, 0.1, 'triangle'); blip(2093, 2090, 0.6, 0.03, 'sine', 0.01) },
    click: function () { blip(700, 500, 0.06, 0.06, 'triangle') }
  }
  function sfx (h, k, a) { try { if (h && h.sfx && typeof h.sfx[k] === 'function') return h.sfx[k](a) } catch (e) {} ; if (SFX[k]) SFX[k](a) }

  /* ── narration: Indonesian speech synthesis ───────────────────────────── */
  var VOICE = null
  function pickVoice () {
    try { var vs = W.speechSynthesis.getVoices() || []
      VOICE = vs.filter(function (v) { return /^id([-_]|$)/i.test(v.lang) })[0] || vs.filter(function (v) { return /indonesia/i.test(v.name) })[0] || null } catch (e) { VOICE = null }
  }
  try { if (W.speechSynthesis) { pickVoice(); W.speechSynthesis.addEventListener('voiceschanged', pickVoice) } } catch (e) {}
  function say (text) {
    try {
      if (!W.speechSynthesis || !W.SpeechSynthesisUtterance) return false
      W.speechSynthesis.cancel()
      if (!text || CFG.narration === false || !(CFG.voiceVol > 0)) return false
      var u = new SpeechSynthesisUtterance(String(text)); u.lang = 'id-ID'; u.rate = 0.95; u.pitch = 1.05; u.volume = clamp(CFG.voiceVol / 100, 0, 1)
      if (!VOICE) pickVoice(); if (VOICE) u.voice = VOICE
      W.speechSynthesis.speak(u); return true
    } catch (e) { return false }
  }

  /* ── music: original gentle sea-shanty loop (D major pentatonic, 84 bpm, 6/8 feel) ─ */
  var MU = { on: false, gain: null, timer: 0, next: 0, step: 0 }
  var SCALE = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25]       // D E F# A B D' E'
  var MEL = [0, -1, 2, 3, -1, 3, 4, -1, 3, 2, -1, 0, 1, -1, 2, 1, -1, -1, 0, -1, 2, 3, -1, 5, 4, -1, 3, 2, -1, 1, 0, -1, -1, -1, -1, -1]
  var BASS = [146.83, 146.83, 110, 110, 123.47, 123.47, 110, 110, 146.83, 146.83, 110, 146.83]
  var EIGHTH = 60 / 84 / 2
  function musicGainValue () { return (CFG.music === false ? 0 : 0.055 * clamp(CFG.musicVol, 0, 100) / 100) }
  function note (c, f, t, d, v, type) {
    var o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t)
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + d)
    o.connect(g); g.connect(MU.gain); o.start(t); o.stop(t + d + 0.05)
  }
  function schedule () {
    var c = AC; if (!c || !MU.on || c.state !== 'running') return
    while (MU.next < c.currentTime + 0.35) {
      var s = MU.step % MEL.length, m = MEL[s], t = MU.next
      if (m >= 0) note(c, SCALE[m], t, EIGHTH * 1.8, 0.5, 'triangle')
      if (s % 3 === 0) note(c, BASS[(s / 3) % BASS.length], t, EIGHTH * 2.8, 0.55, 'sine')
      if (s % 6 === 3) note(c, SCALE[(s / 3) % 2 ? 3 : 2] / 2, t, EIGHTH * 1.2, 0.18, 'sine')
      MU.next += EIGHTH; MU.step++
    }
  }
  function onVis () { if (!AC || !MU.on) return; try { if (D.hidden) AC.suspend(); else AC.resume().then(function () { MU.next = Math.max(MU.next, AC.currentTime + 0.05) }) } catch (e) {} }
  function music (want) {
    var play = want !== false && CFG.music !== false && CFG.musicVol > 0
    if (!play) {
      if (MU.on) { MU.on = false; clearInterval(MU.timer); var g = MU.gain; MU.gain = null
        try { g.gain.setTargetAtTime(0.0001, AC.currentTime, 0.25); setTimeout(function () { try { g.disconnect() } catch (e) {} }, 1500) } catch (e) {} }
      return false
    }
    var c = ctx(); if (!c) return false
    if (!MU.gain) { MU.gain = c.createGain(); MU.gain.gain.value = 0.0001; MU.gain.connect(c.destination) }
    try { MU.gain.gain.setTargetAtTime(musicGainValue(), c.currentTime, 0.6) } catch (e) {}
    if (!MU.on) { MU.on = true; MU.next = c.currentTime + 0.1; MU.step = 0; MU.timer = setInterval(schedule, 100); schedule() }
    return true
  }
  D.addEventListener('visibilitychange', onVis)

  /* ── settings plumbing ───────────────────────────────────────────────── */
  function normalize (st) {
    st = st || {}
    var o = {}; for (var k in st) o[k] = st[k]
    o.musicVol = typeof st.musicVol === 'number' ? clamp(Math.round(st.musicVol), 0, 100) : 70
    o.sfxVol = typeof st.sfxVol === 'number' ? clamp(Math.round(st.sfxVol), 0, 100) : 80
    o.voiceVol = typeof st.voiceVol === 'number' ? clamp(Math.round(st.voiceVol), 0, 100) : 100
    o.music = st.music !== false && o.musicVol > 0; o.sound = st.sound !== false && o.sfxVol > 0; o.narration = st.narration !== false && o.voiceVol > 0
    return o
  }
  function config (st) {
    var n = normalize(st); ['sound', 'music', 'narration', 'musicVol', 'sfxVol', 'voiceVol', 'reducedMotion', 'effects'].forEach(function (k) { if (n[k] !== undefined) CFG[k] = n[k] })
    if (MU.on) music(true)
    if (!CFG.narration) try { W.speechSynthesis && W.speechSynthesis.cancel() } catch (e) {}
    return n
  }

  /* ── stats + achievements (shared by room + settings) ────────────────── */
  function stats (s, worlds) {
    s = s || {}; worlds = worlds || []
    var st = 0, mx = 0, done = 0
    worlds.forEach(function (w) { var o = (s.stars || {})[w.id] || {}, all = true
      w.levels.forEach(function (l) { st += o[l.id] || 0; mx += 3; if (!o[l.id]) all = false }); if (all && w.levels.length) done++ })
    return { xp: s.xp || 0, stars: st, maxStars: mx, fragments: (s.fragments || []).length, cards: (s.cards || []).length, worldsDone: done }
  }
  function achievements (x) {
    return [
      ['Layar Pertama', 'tk-prop/ship-wheel', x.xp > 0, 'Selesaikan level pertama'],
      ['Penjelajah', 'tk-prop/compass-open-2', x.fragments >= 1, 'Temukan kepingan kompas pertama'],
      ['Pengamat Laut', 'tk-prop/spyglass', x.stars >= 10, 'Kumpulkan 10 bintang'],
      ['Navigator', 'tk-prop/sextant-4', x.stars >= 30, 'Kumpulkan 30 bintang'],
      ['Pencari Ilmu', 'tk-legend/journal-book', x.cards >= 3, 'Buka 3 Kartu Sejarah'],
      ['Penjaga Cahaya', 'tk-prop/lantern', x.worldsDone >= 3, 'Selesaikan 3 kapal'],
      ['Setengah Kompas', 'tk-prop/anchor-gold', x.fragments >= 7, 'Kumpulkan 7 kepingan'],
      ['Kolektor Kartu', 'tk-prop/treasure-chest-open', x.cards >= 9, 'Buka 9 Kartu Sejarah'],
      ['Bintang 50', 'tk-ui/star', x.stars >= 50, 'Kumpulkan 50 bintang'],
      ['Kompas Utuh', 'tk-prop/globe', x.fragments >= 14, 'Satukan Kompas Waktu']
    ].map(function (a) { return { name: a[0], sprite: a[1], got: !!a[2], how: a[3] } })
  }
  function badgeGrid (list) {
    return '<div class="tkh-badges">' + list.map(function (b) {
      return '<div class="tkh-badge' + (b.got ? '' : ' no') + '" title="' + esc(b.how) + '">' + ico(b.sprite, 'bi') + (b.got ? '' : ico('gt/lock', 'lk')) + '<b>' + esc(b.name) + '</b></div>'
    }).join('') + '</div>'
  }
  var CATL = { penjelajahan: 'Penjelajahan', tragedi: 'Kisah Sejarah', 'perang-damai': 'Perang & Damai', sains: 'Sains', awal: 'Awal' }

  /* ════════════════════════════════════════════════════════════════════════
   * REWARD — mockup ui-10
   * data = { world, k, stars, title?, subtitle?, result:{ moves, shortest, timeMs, items:{got,total},
   *          right, asked, hits, story, scripted }, xp, newCards:[{title,text}], badge?:{title,sub},
   *          fragment?:{ n, total, finale }, fact?:{title,text}, levelStars:[n per level], hasNext }
   * handlers = { onReplay, onNext, onMap, sfx? }
   * ══════════════════════════════════════════════════════════════════════ */
  function rows (r) {
    r = r || {}; var out = [], g = function (p) { return p >= 0.9 ? 'Hebat!' : 'Bagus!' }
    if (r.moves) out.push(['tk-prop/ship-wheel', 'Langkah', r.moves + (r.shortest > 0 ? ' / ' + r.shortest : ''), r.shortest > 0 ? g(r.shortest / r.moves) : 'Bagus!'])
    if (r.timeMs > 0) { var s = Math.round(r.timeMs / 1000); out.push(['tk-prop/pocket-watch-2', 'Waktu', Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2), 'Hebat!']) }
    if (r.items && r.items.total) out.push(['tk-prop/crate-supplies', 'Barang', r.items.got + ' / ' + r.items.total, g(r.items.got / r.items.total)])
    if (r.asked) out.push(['tk-legend/journal-book', 'Skor kuis', r.right + ' / ' + r.asked, g(r.right / r.asked)])
    if (r.hits !== undefined && !r.scripted) out.push(['tk-prop/lifebuoy-5', 'Tabrakan', String(r.hits), r.hits ? 'Bagus!' : 'Hebat!'])
    if (r.scripted) out.push(['tk-prop/lifebuoy-5', 'Tetap tenang', 'Ya', 'Hebat!'])
    if (r.story && !out.length) out.push(['tk-prop/scroll-sealed', 'Kisah disimak', 'Selesai', 'Hebat!'])
    if (!out.length) out.push(['tk-prop/flag-compass', 'Sampai tujuan', 'Ya', 'Hebat!'])
    return out
  }
  function reward (host, data, h) {
    data = data || {}; h = h || {}
    var w = data.world || { name: '', levels: [] }, k = data.k || 0, stars = clamp(data.stars || 1, 1, 3)
    var R = mountRoot(host, 'tkh-rw'), dead = false, raf = 0, timers = []
    var later = function (fn, ms) { timers.push(setTimeout(function () { if (!dead) fn() }, ms)) }
    var chap = (data.chapter != null ? data.chapter : (w.chapterNo ? 'Bab ' + w.chapterNo + ' · ' : '') + (w.name || ''))
    var rs = rows(data.result)
    var gifts = []
    gifts.push('<div class="gift"><span class="gi">' + ico('tk-key/star') + '</span><div><b class="fk">+<span data-xp>0</span> XP</b><small>Pengetahuan</small></div></div>')
    if (data.badge) gifts.push('<div class="gift"><span class="gi">' + ico('tk-prop/ship-wheel') + '</span><div><b>' + esc(data.badge.title) + '</b><small>' + esc(data.badge.sub || 'Lencana baru') + '</small></div></div>')
    ;(data.newCards || []).slice(0, 2).forEach(function (c) { gifts.push('<div class="gift"><span class="gi">' + ico('tk-prop/scroll-sealed') + '</span><div><b>Kartu Sejarah Baru</b><small>' + esc(c.title) + '</small></div></div>') })
    var fr = data.fragment
    if (fr) gifts.push('<div class="gift frag"><span class="gi tkh-cmp" style="--p:' + (clamp(fr.n, 0, fr.total || 14) / (fr.total || 14) * 100).toFixed(1) + '%">' + ico('tk-key/compass') + '</span><div><b>Kepingan Kompas ' + fr.n + '/' + (fr.total || 14) + '</b><small>' + (fr.finale ? 'Kompas utuh — Timmy bisa pulang!' : 'Kompas Waktu makin lengkap') + '</small></div></div>')
    var fact = data.fact
    var lvStars = data.levelStars || []
    var LV = w.levels || [], lo = 0, hi = LV.length
    if (LV.length > 7) { lo = clamp(k - 3, 0, LV.length - 7); hi = lo + 7 }   // a window of 7 around the current level
    var strip = LV.slice(lo, hi).map(function (l, jj) {
      var j = jj + lo
      var n = lvStars[j] || 0, cur = j === k, open = n > 0 || cur || (j > 0 && lvStars[j - 1] > 0)
      return '<li class="' + (cur ? 'now' : n ? 'done' : open ? 'open' : 'lock') + '">' + (n ? starsRow(n, 3, 'mini') : '<span class="tkh-st mini"></span>') +
        '<i class="dot">' + (cur ? '<em class="tkh-arr r"></em>' : !open ? ico('gt/lock', 'lk') : '') + '</i><b>' + (j + 1) + '</b><small>' + esc(l.title || '') + '</small></li>'
    }).join('')
    var shipLbl = esc(chap)
    R.innerHTML =
      '<div class="tkh-bg" style="background:' + esc(scene(data.scene || w.scene || 'harbor-dawn')).replace(/&quot;/g, '"') + '"></div><div class="tkh-shade"></div>' +
      '<div class="tkh-hero">' + img(art('char/timmy'), 'timmy') + img(art('char/penguin'), 'peng') + '<div class="sign fk">Langkah kecil,<br>petualangan besar!</div></div>' +
      '<div class="tkh-main">' +
        '<header class="tkh-plate">' + (data.banner === false ? '' : img(lib('tk-key/mission-complete'), 'ban')) + '<small class="fk">' + shipLbl + '</small><h1 class="fk">' + esc(data.title || 'Level Selesai!') + '</h1><p>' + esc(data.subtitle || 'Kerja bagus, Timmy!') + '</p></header>' +
        '<div class="tkh-bigstars">' + [0, 1, 2].map(function (i) { return ico('tk-ui/star', i < stars ? 'on' : 'off') }).join('') + '</div>' +
        '<div class="tkh-herop">' + img(art('char/timmy'), 'timmy') + img(art('char/penguin'), 'peng') + '</div>' +
        '<div class="tkh-row2">' +
          '<section class="tkh-card res"><h2 class="tkh-tab fk">Hasilmu</h2><table>' + rs.map(function (r) {
            return '<tr><td>' + ico(r[0]) + '</td><th>' + esc(r[1]) + '</th><td class="v fk">' + esc(r[2]) + '</td><td><span class="chip fk">' + esc(r[3]) + '</span></td></tr>' }).join('') + '</table></section>' +
          '<section class="tkh-card navy gifts"><h2 class="tkh-tab fk">Hadiah</h2>' + gifts.join('') + '</section>' +
        '</div>' +
        '<div class="tkh-row2 b">' +
          (fact ? '<section class="tkh-card fact"><h2 class="tkh-tab fk">' + ico('tk-legend/journal-book') + 'Fakta Sejarah</h2><div class="photo" style="background:' + esc(scene(w.scene || 'harbor-dawn')).replace(/&quot;/g, '"') + '">' + img(art(w.ship || 'char/timmy')) + '</div>' +
            '<div class="ft"><b class="fk">' + esc(fact.title) + '</b><p>' + esc(fact.text) + '</p></div></section>' : '') +
          '<div class="tkh-say"><p>' + esc(data.cheer || 'Hebat, Timmy! Kamu belajar, menjelajah, dan membuat sejarah jadi hidup!') + '</p>' + img(art('char/penguin'), 'peng') + '</div>' +
        '</div>' +
        '<nav class="tkh-acts">' +
          '<button type="button" class="tkh-btn blue" data-act="replay"><i class="tkh-rep"></i>Ulangi</button>' +
          '<button type="button" class="tkh-btn gold big" data-act="next">' + (data.hasNext === false ? 'Peta Level' : 'Level Berikutnya') + '<i class="tkh-arr r"></i></button>' +
          '<button type="button" class="tkh-btn blue" data-act="map">' + ico('tk-prop/treasure-map') + 'Peta Level</button>' +
        '</nav>' +
        (strip ? '<ol class="tkh-strip">' + strip + '</ol>' : '') +
      '</div><div class="tkh-fly"></div>'
    on(R, '[data-act]', 'click', function (b) {
      var a = b.getAttribute('data-act'); sfx(h, 'click')
      if (a === 'replay' && h.onReplay) h.onReplay()
      if (a === 'next') { if (data.hasNext === false) { h.onMap && h.onMap() } else if (h.onNext) h.onNext() }
      if (a === 'map' && h.onMap) h.onMap()
    })
    // entrance
    anim(R.querySelector('.tkh-plate'), [{ opacity: 0, transform: 'translateY(-24px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 420 })
    R.querySelectorAll('.tkh-bigstars .tkh-i').forEach(function (s, i) {
      var isOn = s.classList.contains('on')
      anim(s, [{ opacity: 0, transform: 'scale(.3) rotate(-25deg)' }, { opacity: 1, transform: 'scale(1.18) rotate(6deg)', offset: 0.7 }, { opacity: 1, transform: 'none' }], { duration: 520, delay: 250 + i * 220 })
      if (isOn) later(function () { sfx(h, 'pop', i) }, 250 + i * 220 + 300)
    })
    R.querySelectorAll('.tkh-card, .tkh-say, .tkh-acts, .tkh-strip').forEach(function (c, i) { anim(c, [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: 500 + i * 90 }) })
    R.querySelectorAll('.tkh-hero .timmy, .tkh-herop .timmy').forEach(function (t) { anim(t, [{ opacity: 0, transform: 'translateY(30px)' }, { opacity: 1, transform: 'none' }], { duration: 520, delay: 150 }) })
    // XP count-up (600 ms, tick sound)
    var xpEl = R.querySelector('[data-xp]'), xpT = Math.max(0, data.xp || 0)
    later(function () {
      if (reduced() || !xpT) { xpEl.textContent = xpT; return }
      var t0 = performance.now(), lastTick = 0
      ;(function f (now) { if (dead) return
        var p = clamp((now - t0) / 600, 0, 1), v = Math.round(xpT * (1 - Math.pow(1 - p, 3))); xpEl.textContent = v
        if (now - lastTick > 55 && p < 1) { lastTick = now; sfx(h, 'tick') }
        if (p < 1) raf = requestAnimationFrame(f)
      })(t0)
    }, 900)
    // compass-fragment moment: glow + fly-in to its reward slot
    if (fr) later(function () {
      var slot = R.querySelector('.gift.frag .gi'), fly = R.querySelector('.tkh-fly'); if (!slot) return
      sfx(h, 'bell')
      var rb = R.getBoundingClientRect(), sb = slot.getBoundingClientRect()
      var el = D.createElement('div'); el.className = 'tkh-flyc'; el.innerHTML = ico('tk-key/compass'); fly.appendChild(el)
      var cx = rb.width / 2 - 70, cy = rb.height / 2 - 70, tx = sb.left - rb.left + sb.width / 2 - 70, ty = sb.top - rb.top + sb.height / 2 - 70
      el.style.left = cx + 'px'; el.style.top = cy + 'px'
      if (reduced()) { anim(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 }); later(function () { el.remove(); slot.classList.add('lit') }, 900); return }
      var a1 = el.animate([{ opacity: 0, transform: 'scale(.2) rotate(-90deg)' }, { opacity: 1, transform: 'scale(1.15) rotate(10deg)', offset: 0.55 }, { opacity: 1, transform: 'scale(1)' }], { duration: 700, easing: EO, fill: 'forwards' })
      a1.finished.then(function () {
        if (dead) return
        var a2 = el.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: 'translate(' + (tx - cx) + 'px,' + (ty - cy) + 'px) scale(.34)', opacity: 0.9 }], { duration: 650, delay: 350, easing: 'cubic-bezier(.77,0,.175,1)', fill: 'forwards' })
        a2.finished.then(function () { el.remove(); slot.classList.add('lit'); sfx(h, 'chime'); anim(slot, [{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }], { duration: 380, fill: 'none' }) }, function () {})
      }, function () {})
    }, 1500)
    return { root: R, destroy: function () { dead = true; cancelAnimationFrame(raf); timers.forEach(clearTimeout); R._off(); R.remove() } }
  }

  /* ════════════════════════════════════════════════════════════════════════
   * ROOM — mockup ui-09 "Koleksi Kapal"
   * data = { save: S, worlds: WD.WORLDS, learn: [[domain,label]...], tab?, select? }
   * handlers = { onBack, onFav(id) -> new fav bool, sfx? }
   * ══════════════════════════════════════════════════════════════════════ */
  var ROOM_TABS = [['kapal', 'Kapal', 'tk-prop/titanic-ship'], ['kompas', 'Kompas Waktu', 'tk-key/compass'], ['kartu', 'Kartu Sejarah', 'tk-legend/journal-book'],
    ['capaian', 'Pencapaian', 'game/trophy-gold'], ['belajar', 'Kemajuan Belajar', 'tk-prop/globe']]
  function room (host, data, h) {
    data = data || {}; h = h || {}
    var S = data.save || {}, all = (data.worlds || []), ships = all.filter(function (w) { return w.ship })
    var R = mountRoot(host, 'tkh-room'), st = { tab: data.tab || 'kapal', q: '', f: 'semua', sel: data.select || null }
    var fav = function (id) { return (S.fav || []).indexOf(id) >= 0 }
    var done = function (w) { var o = (S.stars || {})[w.id] || {}; return w.levels.length > 0 && w.levels.every(function (l) { return o[l.id] > 0 }) }
    var wStars = function (w) { var o = (S.stars || {})[w.id] || {}, n = 0; w.levels.forEach(function (l) { n += o[l.id] || 0 }); return Math.round(3 * n / Math.max(1, w.levels.length * 3)) }
    if (!st.sel) { var f0 = ships.filter(function (w) { return fav(w.id) })[0] || ships.filter(done)[0] || ships[0]; st.sel = f0 && f0.id }
    var owned = ships.filter(done).length
    R.innerHTML =
      '<div class="tkh-bg" style="background:' + esc(scene('night-deck')).replace(/&quot;/g, '"') + '"></div><div class="tkh-shade"></div>' +
      '<header class="tkh-top"><div class="tkh-plate sm"><h1 class="fk">Koleksi Kapal</h1><p>Temukan kapal legendaris, buka kisahnya, dan lengkapi koleksimu!</p></div>' + profileChip(S.xp) + '</header>' +
      '<nav class="tkh-side">' + ROOM_TABS.map(function (t) { return '<button type="button" data-tab="' + t[0] + '">' + ico(t[2]) + '<span>' + t[1] + '</span></button>' }).join('') + '</nav>' +
      '<main class="tkh-body"></main><aside class="tkh-det"></aside>' +
      '<div class="tkh-spy">' + img(lib('tk-char/timmy-spyglass-2')) + '</div>' + backBtn() + '<div class="tkh-modal" hidden></div>'
    var body = R.querySelector('.tkh-body'), det = R.querySelector('.tkh-det'), modal = R.querySelector('.tkh-modal')
    function card (w) {
      var got = done(w), f = fav(w.id)
      return '<div class="tkh-ship' + (got ? '' : ' no') + (w.id === st.sel ? ' sel' : '') + '" data-sel="' + w.id + '" role="button" tabindex="0" aria-label="' + esc(w.name) + '">' +
        '<div class="th" style="background:' + esc(scene(w.scene)).replace(/&quot;/g, '"') + '">' + img(art(w.ship), 'sh') + (got ? '' : ico('gt/lock', 'lk')) + '</div>' +
        '<button type="button" class="fav' + (f ? ' on' : '') + '" data-fav="' + w.id + '" aria-pressed="' + f + '" aria-label="Favorit ' + esc(w.name) + '">' + ico('tk-ui/heart') + '</button>' +
        '<b class="fk">' + esc(w.name) + '</b>' + starsRow(wStars(w), 3) + '</div>'
    }
    function list () {
      var q = st.q.trim().toLowerCase()
      return ships.filter(function (w) { return (!q || w.name.toLowerCase().indexOf(q) >= 0) && (st.f === 'semua' || (st.f === 'milik') === done(w)) })
    }
    function paintGrid () {
      var L = list(), g = body.querySelector('.tkh-grid')
      if (g) g.innerHTML = L.length ? L.map(card).join('') : '<p class="empty">Tidak ada kapal yang cocok. Coba kata lain, ya!</p>'
      body.querySelectorAll('[data-f]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-f') === st.f); b.setAttribute('aria-pressed', String(b.getAttribute('data-f') === st.f)) })
    }
    function paintDet () {
      var w = ships.filter(function (x) { return x.id === st.sel })[0]
      if (st.tab !== 'kapal' || !w) { det.innerHTML = ''; R.classList.add('nodet'); return }
      R.classList.remove('nodet')
      var sp = w.spec || {}, got = done(w), f = fav(w.id)
      var scenes = []; [w.scene].concat(w.levels.map(function (l) { return l.scene })).forEach(function (s) { if (s && scenes.indexOf(s) < 0) scenes.push(s) })
      while (scenes.length < 3) scenes.push(scenes[scenes.length - 1] || 'harbor-day')
      det.innerHTML =
        '<div class="rib fk">' + esc(w.name) + '</div>' +
        '<div class="hero" style="background:' + esc(scene(w.scene)).replace(/&quot;/g, '"') + '">' + img(art(w.ship)) + '<button type="button" class="fav' + (f ? ' on' : '') + '" data-fav="' + w.id + '" aria-label="Favorit">' + ico('tk-ui/heart') + '</button></div>' +
        '<div class="tags"><span class="t1">' + esc(CATL[w.cat] || 'Kapal') + '</span>' + (sp.type ? '<span class="t2">' + esc(sp.type) + '</span>' : '') + '<span class="t3">' + (got ? 'Dimiliki' : 'Belum dimiliki') + '</span></div>' +
        '<p class="txt">' + esc(((w.cards || [])[0] || {}).text || w.value || '') + '</p>' +
        '<dl class="spec"><dt>Jenis</dt><dd>' + esc(sp.type || '—') + '</dd><dt>Panjang</dt><dd>' + esc(sp.length || '—') + '</dd><dt>Tahun</dt><dd>' + esc(w.year || '—') + '</dd><dt>Nilai</dt><dd>' + esc(w.value || '—') + '</dd><dt>Terkenal</dt><dd>' + esc(sp.famous || '—') + '</dd></dl>' +
        '<button type="button" class="tkh-btn blue wide" data-story="' + w.id + '">' + ico('tk-legend/journal-book') + 'Baca Kisah</button>' +
        '<div class="pics">' + scenes.slice(0, 3).map(function (s, i) { return '<div style="background:' + esc(scene(s)).replace(/&quot;/g, '"') + '">' + (i === 0 ? img(art(w.ship)) : '') + '</div>' }).join('') + '</div>' +
        '<button type="button" class="tkh-btn green wide" data-fav="' + w.id + '">' + ico('tk-ui/heart') + (f ? 'Favoritku' : 'Jadikan Favorit') + '</button>'
    }
    function paint () {
      R.querySelectorAll('[data-tab]').forEach(function (b) { var o = b.getAttribute('data-tab') === st.tab; b.classList.toggle('on', o); b.setAttribute('aria-pressed', String(o)) })
      var x = stats(S, all), html = ''
      if (st.tab === 'kapal') {
        html = '<div class="tkh-tools"><label class="srch"><i class="tkh-lens"></i><input type="search" placeholder="Cari kapal…" value="' + esc(st.q) + '" aria-label="Cari kapal"></label>' +
          '<div class="chips"><button type="button" data-f="semua">Semua</button><button type="button" data-f="milik">Dimiliki</button><button type="button" data-f="belum">Belum</button></div>' +
          '<div class="cnt">' + ico('tk-prop/ship-wheel') + '<span>Terkumpul<b class="fk">' + owned + ' / ' + ships.length + '</b></span></div></div><div class="tkh-grid"></div>'
      }
      if (st.tab === 'kompas') {
        var fw = all.filter(function (w) { return w.levels.some(function (l) { return l.fragment }) })
        html = '<div class="tkh-panel"><div class="tkh-cbig"><span class="tkh-cmp xl" style="--p:' + (clamp(x.fragments, 0, 14) / 14 * 100).toFixed(1) + '%">' + ico('tk-key/compass') + '</span>' +
          '<div><b class="fk">' + x.fragments + ' / 14 kepingan</b><p>Setiap kapal menyimpan satu kepingan Kompas Waktu. Kumpulkan semuanya agar Timmy bisa pulang!</p></div></div>' +
          '<div class="tkh-frags">' + fw.map(function (w, i) { var g = (S.fragments || []).indexOf(w.id) >= 0
            return '<div class="' + (g ? 'got' : 'no') + '">' + ico('tk-key/compass') + '<b>' + (i + 1) + '</b><small>' + esc(g ? w.name : 'Belum') + '</small></div>' }).join('') + '</div></div>'
      }
      if (st.tab === 'kartu') {
        html = '<div class="tkh-cards">' + all.map(function (w) { return (w.cards || []).map(function (c) { var g = (S.cards || []).indexOf(c.id) >= 0
          return '<button type="button" class="tkh-hc' + (g ? '' : ' no') + '" data-story="' + w.id + '">' + ico(g ? 'tk-prop/scroll-sealed' : 'gt/lock') + '<b class="fk">' + esc(g ? c.title : 'Kartu terkunci') + '</b><small>' + esc(w.name) + '</small></button>' }).join('') }).join('') + '</div>'
      }
      if (st.tab === 'capaian') html = '<div class="tkh-panel"><h2 class="tkh-h fk">Pencapaian ' + achievements(x).filter(function (a) { return a.got }).length + ' / ' + achievements(x).length + '</h2>' + badgeGrid(achievements(x)) + '</div>'
      if (st.tab === 'belajar') {
        html = '<div class="tkh-panel"><h2 class="tkh-h fk">Kemajuan Belajar</h2><div class="tkh-prog">' + (data.learn || []).map(function (c) { var m = clamp((S.mastery || {})[c[0]] || 0, 0, 100)
          return '<div><span>' + esc(c[1]) + '</span><i><s style="transform:scaleX(' + (m / 100) + ')"></s></i><b class="fk">' + m + '%</b></div>' }).join('') +
          '</div><p class="tkh-note">' + x.stars + ' dari ' + x.maxStars + ' bintang · ' + x.worldsDone + ' kapal selesai · ' + x.cards + ' kartu sejarah</p></div>'
      }
      body.innerHTML = html
      if (st.tab === 'kapal') paintGrid()
      paintDet()
      anim(body, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 260 })
    }
    function story (id) {
      var w = all.filter(function (x) { return x.id === id })[0]; if (!w) return
      modal.innerHTML = '<div class="box"><div class="rib fk">Kisah ' + esc(w.name) + '</div><div class="list">' + (w.cards || []).map(function (c) { var g = (S.cards || []).indexOf(c.id) >= 0
        return '<article class="' + (g ? '' : 'no') + '">' + ico(g ? 'tk-prop/scroll-sealed' : 'gt/lock') + '<div><b class="fk">' + esc(g ? c.title : 'Kartu terkunci') + '</b><p>' + esc(g ? c.text : 'Selesaikan semua level ' + w.name + ' untuk membuka kartu ini.') + '</p></div></article>' }).join('') +
        '</div><button type="button" class="tkh-btn gold wide" data-close="1">Tutup</button></div>'
      modal.hidden = false; anim(modal.firstChild, [{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 280 })
      var ttl = modal.querySelector('article:not(.no) b'); if (ttl) say(ttl.textContent + '. ' + modal.querySelector('article:not(.no) p').textContent)
    }
    on(R, '[data-tab]', 'click', function (b) { sfx(h, 'click'); st.tab = b.getAttribute('data-tab'); paint() })
    on(R, '[data-f]', 'click', function (b) { sfx(h, 'click'); st.f = b.getAttribute('data-f'); paintGrid() })
    on(R, '[data-fav]', 'click', function (b, e) { e.stopPropagation(); sfx(h, 'click'); var id = b.getAttribute('data-fav'), v = h.onFav ? h.onFav(id) : !fav(id)
      if (!h.onFav) { S.fav = (S.fav || []).filter(function (x) { return x !== id }).concat(v ? [id] : []) } paintGrid(); paintDet() })
    on(R, '[data-sel]', 'click', function (b, e) { if (e.target.closest('[data-fav]')) return; sfx(h, 'click'); st.sel = b.getAttribute('data-sel'); paintGrid(); paintDet()
      var w = ships.filter(function (x) { return x.id === st.sel })[0]; if (R.classList.contains('is-port')) det.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }); if (w) say(w.name) })
    on(R, '[data-sel]', 'keydown', function (b, e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); b.click() } })
    on(R, '[data-story]', 'click', function (b) { sfx(h, 'click'); story(b.getAttribute('data-story')) })
    on(R, '[data-close]', 'click', function () { sfx(h, 'click'); modal.hidden = true; say('') })
    modal.addEventListener('click', function (e) { if (e.target === modal) { modal.hidden = true; say('') } })
    on(R, '[data-act="back"]', 'click', function () { sfx(h, 'click'); h.onBack && h.onBack() })
    R.addEventListener('input', function (e) { if (e.target.matches('.srch input')) { st.q = e.target.value; paintGrid() } })
    paint()
    return { root: R, select: function (id) { st.sel = id; st.tab = 'kapal'; paint() }, tab: function (t) { st.tab = t; paint() },
      destroy: function () { say(''); R._off(); R.remove() } }
  }

  /* ════════════════════════════════════════════════════════════════════════
   * SETTINGS — mockup ui-11 "Pengaturan"
   * data = { save: S, worlds: WD.WORLDS, version? }
   * handlers = { get() -> settings, set(patch) (merge + save), onSave, onBack, onParent, sfx? }
   * ══════════════════════════════════════════════════════════════════════ */
  var SET_TABS = [['profil', 'Profil', 'tk-key/timmy'], ['audio', 'Audio', 'tk-prop/ship-bell'], ['tampilan', 'Tampilan', 'tk-prop/spyglass'], ['permainan', 'Permainan', 'tk-prop/ship-wheel'],
    ['bahasa', 'Bahasa', 'tk-prop/globe'], ['ortu', 'Orang Tua', 'tk-char/captain-old'], ['bantuan', 'Bantuan', 'tk-prop/lantern'], ['tentang', 'Tentang', 'tk-legend/journal-book']]
  function settings (host, data, h) {
    data = data || {}; h = h || {}
    var S = data.save || {}, get = function () { return normalize(h.get ? h.get() : S.settings) }
    var saved = null   // volumes remembered by "Bisukan semua"
    var R = mountRoot(host, 'tkh-set')
    function set (patch) { if (h.set) h.set(patch); else { S.settings = Object.assign({}, S.settings || {}, patch) } config(get()); paint() }
    function tog (k, label, icon) { var v = !!get()[k]; return '<div class="srow">' + (icon ? ico(icon) : '') + '<span>' + label + '</span><button type="button" class="tkh-tog' + (v ? ' on' : '') + '" data-tog="' + k + '" role="switch" aria-checked="' + v + '" aria-label="' + label + '"></button></div>' }
    function slider (k, bk, label, icon) { var s = get(), v = s[bk] ? s[k] : 0
      return '<div class="srow sl">' + ico(icon) + '<span>' + label + '</span><input type="range" min="0" max="100" step="5" value="' + v + '" data-vol="' + k + '" data-b="' + bk + '" aria-label="' + label + '" style="--v:' + v + '%"><b class="fk" data-pct="' + k + '">' + v + '%</b></div>' }
    function quality () { var s = get(); return s.reducedMotion ? 'rendah' : s.effects === false ? 'sedang' : 'tinggi' }
    var x = stats(S, data.worlds || []), ach = achievements(x), xl = xpLevel(S.xp)
    R.innerHTML =
      '<div class="tkh-bg" style="background:' + esc(scene('old-deck')).replace(/&quot;/g, '"') + '"></div><div class="tkh-shade"></div>' +
      '<header class="tkh-top"><div class="tkh-plate sm">' + ico('game/gear', 'gear') + '<div><h1 class="fk">Pengaturan</h1><p>Atur petualanganmu sendiri!</p></div></div>' + profileChip(S.xp) + '</header>' +
      '<nav class="tkh-side">' + SET_TABS.map(function (t) { return '<button type="button" data-go="' + t[0] + '">' + ico(t[2]) + '<span>' + t[1] + '</span></button>' }).join('') + '</nav>' +
      '<main class="tkh-body"><div class="tkh-sgrid"></div></main>' +
      '<div class="tkh-deck">' + img(art('char/timmy'), 'timmy') + img(art('char/penguin'), 'peng') + '<div class="bub">Atur permainanmu dan jadikan petualangan milikmu!</div></div>' +
      backBtn() + '<button type="button" class="tkh-btn gold tkh-save" data-act="save">' + ico('tk-legend/journal-book') + 'Simpan</button>'
    var grid = R.querySelector('.tkh-sgrid')
    function paint () {
      var s = get(), q = quality(), mute = !s.sound && !s.music && !s.narration
      grid.innerHTML =
        '<section class="tkh-card pa" id="tkh-s-audio" data-sec="audio"><h2 class="tkh-tab fk">' + ico('tk-prop/ship-bell') + 'Audio</h2>' +
          slider('musicVol', 'music', 'Musik', 'tk-prop/violin') + slider('sfxVol', 'sound', 'Efek suara', 'tk-prop/ship-bell') + slider('voiceVol', 'narration', 'Narasi', 'tk-prop/ship-horn') +
          '<div class="srow"><i class="tkh-mute"></i><span>Bisukan semua</span><button type="button" class="tkh-tog' + (mute ? ' on' : '') + '" data-mute="1" role="switch" aria-checked="' + mute + '" aria-label="Bisukan semua"></button></div></section>' +
        '<section class="tkh-card pa" data-sec="tampilan"><h2 class="tkh-tab fk">' + ico('tk-prop/spyglass') + 'Tampilan</h2><div class="lbl">Kualitas grafis</div>' +
          '<div class="tkh-seg">' + [['rendah', 'Rendah'], ['sedang', 'Sedang'], ['tinggi', 'Tinggi']].map(function (o) { return '<button type="button" data-q="' + o[0] + '" class="' + (q === o[0] ? 'on' : '') + '" aria-pressed="' + (q === o[0]) + '">' + o[1] + '</button>' }).join('') + '</div>' +
          tog('effects', 'Efek visual') + tog('reducedMotion', 'Gerakan dikurangi') + '</section>' +
        '<section class="tkh-card pa" data-sec="permainan"><h2 class="tkh-tab fk">' + ico('tk-prop/ship-wheel') + 'Permainan</h2>' +
          tog('hints', 'Petunjuk', 'tk-prop/lantern') + tog('confirmExit', 'Konfirmasi sebelum keluar', 'tk-prop/signpost-harbor') + tog('timer', 'Tampilkan waktu', 'tk-prop/pocket-watch-2') + '</section>' +
        '<section class="tkh-card pa" data-sec="bahasa"><h2 class="tkh-tab fk">' + ico('tk-prop/globe') + 'Bahasa</h2>' +
          '<button type="button" class="tkh-lang on" aria-pressed="true">' + ico('tk-prop/flag-compass') + '<span>Bahasa Indonesia</span><i class="tkh-check"></i></button>' +
          '<button type="button" class="tkh-btn blue wide" data-test="1">' + ico('tk-prop/ship-horn') + 'Dengar suara narasi</button></section>' +
        '<section class="tkh-card navy prof" data-sec="profil"><h2 class="tkh-h fk">Profil Pemain</h2><div class="pr">' + img(art('char/timmy'), 'av') +
          '<div><b class="fk">Timmy</b><span>' + ico('tk-ui/star', 'on') + 'Level ' + xl.lv + '</span><i class="bar"><s style="transform:scaleX(' + (xl.cur / 300).toFixed(3) + ')"></s><em>' + xl.cur + ' / 300</em></i></div></div>' +
          '<p class="quote">“Langkah kecil, petualangan besar!”</p>' +
          '<h3 class="fk">Lencana <b>' + ach.filter(function (a) { return a.got }).length + ' / ' + ach.length + '</b></h3>' + badgeGrid(ach) + '</section>' +
        '<section class="tkh-card pa" data-sec="ortu"><h2 class="tkh-tab fk">' + ico('tk-char/captain-old') + 'Orang Tua</h2><p class="tkh-p">Tingkat soal, Studi Islam, dan kemajuan belajar. Dijaga dengan tombol tahan 3 detik.</p>' +
          '<button type="button" class="tkh-btn blue wide" data-act="parent">' + ico('tk-char/captain-old') + 'Buka area orang tua</button></section>' +
        '<section class="tkh-card pa" data-sec="bantuan"><h2 class="tkh-tab fk">' + ico('tk-prop/lantern') + 'Bantuan</h2><p class="tkh-p">Pilih kapal di peta, selesaikan levelnya, dan kumpulkan kepingan Kompas Waktu. Tekan lentera saat butuh petunjuk. Tidak ada kalah — selalu boleh mencoba lagi!</p></section>' +
        '<section class="tkh-card pa" data-sec="tentang"><h2 class="tkh-tab fk">' + ico('tk-legend/journal-book') + 'Tentang</h2><p class="tkh-p">Timmy &amp; Kapal Legendaris — belajar sejarah, matematika, bahasa, dan kebaikan bersama kapal-kapal terkenal dunia.' + (data.version ? ' Versi ' + esc(data.version) + '.' : '') + '</p></section>'
    }
    var cur = 'audio'
    function mark (k) { cur = k; R.querySelectorAll('[data-go]').forEach(function (b) { var o = b.getAttribute('data-go') === k; b.classList.toggle('on', o); b.setAttribute('aria-pressed', String(o)) }) }
    on(R, '[data-go]', 'click', function (b) { sfx(h, 'click'); var k = b.getAttribute('data-go'), sec = grid.querySelector('[data-sec="' + k + '"]'); mark(k)
      if (sec) { sec.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }); anim(sec, [{ transform: 'scale(1)' }, { transform: 'scale(1.02)' }, { transform: 'scale(1)' }], { duration: 360, fill: 'none', delay: 250 }) } })
    on(R, '[data-tog]', 'click', function (b) { sfx(h, 'click'); var k = b.getAttribute('data-tog'), p = {}; p[k] = !get()[k]
      if (k === 'reducedMotion' && p[k]) p.effects = false
      set(p) })
    on(R, '[data-q]', 'click', function (b) { sfx(h, 'click'); var q = b.getAttribute('data-q')
      set(q === 'rendah' ? { reducedMotion: true, effects: false } : q === 'sedang' ? { reducedMotion: false, effects: false } : { reducedMotion: false, effects: true }) })
    on(R, '[data-mute]', 'click', function () {
      var s = get(), mute = !s.sound && !s.music && !s.narration
      if (!mute) { saved = { musicVol: s.musicVol, sfxVol: s.sfxVol, voiceVol: s.voiceVol }; set({ sound: false, music: false, narration: false }); music(false) }
      else { var v = saved || s; set({ sound: true, music: true, narration: true, musicVol: v.musicVol || 70, sfxVol: v.sfxVol || 80, voiceVol: v.voiceVol || 100 }); sfx(h, 'click') }
    })
    R.addEventListener('input', function (e) { var t = e.target; if (!t.matches('[data-vol]')) return
      var v = +t.value; t.style.setProperty('--v', v + '%'); var p = R.querySelector('[data-pct="' + t.getAttribute('data-vol') + '"]'); if (p) p.textContent = v + '%' })
    R.addEventListener('change', function (e) { var t = e.target; if (!t.matches('[data-vol]')) return
      var k = t.getAttribute('data-vol'), b = t.getAttribute('data-b'), v = +t.value, p = {}; p[k] = v; p[b] = v > 0; set(p)
      if (k === 'sfxVol') sfx(h, 'chime'); if (k === 'voiceVol') say('Halo, aku Timmy!'); if (k === 'musicVol' && MU.on) music(true) })
    on(R, '[data-test]', 'click', function () { if (!say('Halo! Aku Timmy. Ayo berlayar bersama!')) sfx(h, 'chime') })
    on(R, '[data-act]', 'click', function (b) { var a = b.getAttribute('data-act'); sfx(h, 'click')
      if (a === 'back' && h.onBack) h.onBack(); if (a === 'parent' && h.onParent) h.onParent()
      if (a === 'save') { anim(b, [{ transform: 'scale(1)' }, { transform: 'scale(.94)' }, { transform: 'scale(1)' }], { duration: 240, fill: 'none' }); if (h.onSave) h.onSave(get()) } })
    // highlight the sidebar entry of the section in view
    var body = R.querySelector('.tkh-body')
    body.addEventListener('scroll', function () { var best = null, top = body.getBoundingClientRect().top + 20
      grid.querySelectorAll('[data-sec]').forEach(function (s) { var r = s.getBoundingClientRect(); if (r.bottom > top && (!best || r.top < best.r)) best = { k: s.getAttribute('data-sec'), r: r.top } })
      if (best && best.k !== cur) mark(best.k) }, { passive: true })
    config(get()); paint(); mark('audio')
    grid.querySelectorAll('.tkh-card').forEach(function (c, i) { anim(c, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 340, delay: 80 + i * 60 }) })
    return { root: R, destroy: function () { R._off(); R.remove() } }
  }

  /* ── CSS (scoped .tkh-) ──────────────────────────────────────────────── */
  var CSS = [
    '.tkh{position:absolute;inset:0;overflow:hidden;color:#F4F7FF;font-family:Nunito,"Segoe UI",system-ui,sans-serif;font-size:14px;--ease:cubic-bezier(.23,1,.32,1);-webkit-tap-highlight-color:transparent;z-index:1}',
    '.tkh *{box-sizing:border-box}.tkh .fk{font-family:"Fredoka One",Nunito,sans-serif;font-weight:400;letter-spacing:.2px}',
    '.tkh-bg{position:absolute;inset:0;z-index:0}.tkh-shade{position:absolute;inset:0;z-index:0;background:linear-gradient(180deg,rgba(8,16,48,.35),rgba(8,16,48,.15) 40%,rgba(6,12,36,.55))}',
    '.tkh-i{width:28px;height:28px;object-fit:contain;flex:none;vertical-align:middle;pointer-events:none}',
    '.tkh-st{display:inline-flex;gap:1px}.tkh-st .tkh-i{width:20px;height:20px}.tkh-st .off,.tkh-bigstars .off{filter:grayscale(1) brightness(.55);opacity:.55}.tkh-st.mini .tkh-i{width:15px;height:15px}',
    // buttons
    '.tkh-btn{min-height:48px;border:0;border-radius:16px;padding:8px 18px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font:18px "Fredoka One",Nunito,sans-serif;color:#fff;cursor:pointer;touch-action:manipulation;transition:transform .16s var(--ease),filter .16s var(--ease)}',
    '.tkh-btn:active{transform:scale(.96)}.tkh-btn .tkh-i{width:30px;height:30px}.tkh-btn.wide{width:100%}',
    '.tkh-btn.blue{background:linear-gradient(#4b93ff,#1f56c9);box-shadow:inset 0 2px 0 rgba(255,255,255,.35),inset 0 0 0 2px rgba(150,200,255,.55),0 4px 0 #13357e,0 8px 16px rgba(0,0,0,.3)}',
    '.tkh-btn.gold{background:linear-gradient(#ffe45a,#f6b10c);color:#3a2300;box-shadow:inset 0 2px 0 rgba(255,255,255,.6),inset 0 0 0 2px #fff0a0,0 4px 0 #a86a00,0 8px 16px rgba(0,0,0,.3)}',
    '.tkh-btn.green{background:linear-gradient(#4fdc7a,#1d9a48);box-shadow:inset 0 2px 0 rgba(255,255,255,.4),inset 0 0 0 2px #a8f3bd,0 4px 0 #0f6a2f,0 8px 16px rgba(0,0,0,.3)}',
    '.tkh-btn:focus-visible,.tkh button:focus-visible,.tkh [role=button]:focus-visible{outline:3px solid #FFE45A;outline-offset:2px}',
    '.tkh-arr{display:inline-block;width:0;height:0;border-style:solid;flex:none}.tkh-arr.r{border-width:9px 0 9px 13px;border-color:transparent transparent transparent currentColor;margin-left:2px}',
    '.tkh-arr.l{border-width:9px 13px 9px 0;border-color:transparent currentColor transparent transparent}',
    '.tkh-rep{width:20px;height:20px;border:4px solid #fff;border-right-color:transparent;border-radius:50%;position:relative;flex:none}.tkh-rep:after{content:"";position:absolute;right:-6px;top:-3px;border:5px solid transparent;border-top-color:#fff;border-left-color:#fff;transform:rotate(80deg)}',
    // parchment + panels
    '.tkh-plate{position:relative;z-index:2;background:linear-gradient(#fbf0d6,#ecd6a6);color:#3b2410;text-align:center;padding:12px 28px 14px;border-radius:6px;clip-path:polygon(0 8%,3% 0,20% 4%,45% 0,70% 5%,97% 0,100% 10%,98% 50%,100% 92%,96% 100%,70% 96%,40% 100%,15% 96%,2% 100%,0 88%,2% 50%);filter:drop-shadow(0 6px 10px rgba(0,0,0,.4))}',
    '.tkh-plate h1{margin:0;font-size:clamp(26px,4.4vw,48px);line-height:1.05;color:#2d1a08}.tkh-plate small{font-size:clamp(14px,1.8vw,20px);color:#4a2f14;display:block}.tkh-plate p{margin:4px 0 0;font-size:clamp(12px,1.4vw,16px);font-weight:700;color:#5a3b1c}',
    '.tkh-card{position:relative;border-radius:16px;background:linear-gradient(#fbf1d9,#efdcb1);color:#3b2410;padding:26px 14px 10px;box-shadow:inset 0 0 0 2px rgba(255,255,255,.6),0 0 0 3px rgba(40,80,160,.55),0 8px 20px rgba(0,0,0,.35)}',
    '.tkh-card.navy{background:linear-gradient(rgba(22,48,110,.92),rgba(11,26,70,.94));color:#F4F7FF;box-shadow:inset 0 0 0 2px rgba(120,190,255,.45),0 8px 20px rgba(0,0,0,.35)}',
    '.tkh-tab{position:absolute;left:12px;top:-12px;margin:0;display:inline-flex;align-items:center;gap:6px;padding:5px 16px;border-radius:12px 12px 12px 4px;background:linear-gradient(#2c6fe0,#16439e);color:#fff;font-size:18px;box-shadow:inset 0 0 0 2px rgba(150,200,255,.55),0 3px 6px rgba(0,0,0,.3)}.tkh-tab .tkh-i{width:26px;height:26px}',
    '.tkh-h{margin:0 0 10px;font-size:20px}',
    // profile chip
    '.tkh-prof{display:flex;align-items:center;gap:8px;padding:6px 12px 6px 6px;border-radius:40px;background:linear-gradient(rgba(22,48,110,.94),rgba(11,26,70,.94));box-shadow:inset 0 0 0 2px rgba(120,190,255,.5);flex:none}',
    '.tkh-prof .av{width:46px;height:46px;border-radius:50%;object-fit:cover;object-position:top;background:#fbe3b5;border:2px solid #FFC53D}.tkh-prof b{display:block;font-size:14px}.tkh-prof span{font-size:12px;display:flex;align-items:center;gap:3px}.tkh-prof span .tkh-i{width:14px;height:14px}',
    '.bar{display:block;position:relative;width:120px;height:14px;border-radius:8px;background:#0a1633;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(255,255,255,.25)}.bar s{position:absolute;inset:0;background:linear-gradient(#ffe45a,#f6a60c);transform-origin:0 50%;text-decoration:none}.bar em{position:relative;display:block;text-align:right;padding-right:6px;font:12px/14px Nunito,sans-serif;font-weight:800;font-style:normal;color:#fff;text-shadow:0 1px 2px #000}',
    // back
    '.tkh-back{position:absolute;left:14px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:6}',
    // ── reward
    '.tkh-rw .tkh-hero{position:absolute;left:0;bottom:0;width:31%;height:100%;z-index:1;pointer-events:none}',
    '.tkh-rw .tkh-hero .timmy{position:absolute;left:8%;bottom:4%;height:72%;max-width:92%;object-fit:contain;filter:drop-shadow(0 10px 16px rgba(0,0,0,.45))}',
    '.tkh-rw .tkh-hero .peng{position:absolute;left:-2%;bottom:3%;height:30%;object-fit:contain;filter:drop-shadow(0 6px 10px rgba(0,0,0,.4))}',
    '.tkh-rw .tkh-hero .sign{position:absolute;left:4%;bottom:5%;transform:rotate(-8deg);background:linear-gradient(#f3e0b4,#dcc08a);color:#3b2410;padding:10px 14px;border-radius:6px;font-size:15px;line-height:1.25;box-shadow:0 6px 12px rgba(0,0,0,.4);display:none}',
    '.tkh-rw .tkh-main{position:absolute;inset:0 0 0 30%;z-index:2;overflow:auto;overscroll-behavior:contain;padding:12px 16px 12px;display:flex;flex-direction:column;align-items:center;gap:10px}',
    '.tkh-rw .tkh-main>*{flex:none}.tkh-rw.is-land .tkh-main{gap:6px;padding-top:8px}.tkh-rw.is-land .tkh-plate{padding:8px 28px 10px}.tkh-rw.is-land .tkh-plate h1{font-size:clamp(26px,5.2vh,44px)}.tkh-rw.is-land .tkh-row2{margin-top:6px}.tkh-rw.is-land .tkh-acts{padding:6px 12px}.tkh-rw.is-land .tkh-acts .tkh-btn{min-height:52px}.tkh-rw.is-land .tkh-card.fact .photo{height:84px}.tkh-rw.is-land .tkh-say .peng{height:72px}.tkh-rw .tkh-plate{width:min(560px,100%)}.tkh-rw .tkh-plate .ban{position:absolute;right:-6px;top:-4px;width:92px;transform:rotate(8deg);opacity:.95}',
    '.tkh-bigstars{display:flex;gap:10px;margin-top:-6px}.tkh-bigstars .tkh-i{width:clamp(52px,9vh,84px);height:clamp(52px,9vh,84px);filter:drop-shadow(0 6px 10px rgba(0,0,0,.45))}',
    '.tkh-herop{display:none}',
    '.tkh-row2{display:grid;grid-template-columns:1.25fr 1fr;gap:16px;width:min(760px,100%);margin-top:8px;align-items:start}.tkh-row2.b{grid-template-columns:1.6fr 1fr;align-items:center}',
    '.tkh-card.res table{width:100%;border-collapse:collapse}.tkh-card.res tr+tr td,.tkh-card.res tr+tr th{border-top:1px dashed rgba(90,60,20,.3)}',
    '.tkh-card.res td,.tkh-card.res th{padding:5px 4px;text-align:left;font-size:15px}.tkh-card.res th{font-weight:800}.tkh-card.res .v{font-size:17px;text-align:right;white-space:nowrap}',
    '.chip{display:inline-block;padding:4px 10px;border-radius:8px;background:linear-gradient(#fff07a,#ffcf1f);color:#3a2300;font-size:13px;box-shadow:inset 0 0 0 1px #d09a00;white-space:nowrap}',
    '.gift{display:flex;align-items:center;gap:10px;padding:4px 0}.gift+.gift{border-top:1px solid rgba(120,190,255,.25)}.gift b{display:block;font-size:16px}.gift small{font-size:12px;color:#B9C8E6;display:block}',
    '.gift .gi{width:46px;height:46px;border-radius:12px;display:grid;place-items:center;background:radial-gradient(circle,#2d5fc0,#132d6e);box-shadow:inset 0 0 0 2px rgba(150,200,255,.5);flex:none}.gift .gi .tkh-i{width:40px;height:40px}',
    '.tkh-cmp{position:relative}.tkh-cmp:before{content:"";position:absolute;inset:-3px;border-radius:50%;background:conic-gradient(#FFD34D var(--p),rgba(255,255,255,.15) 0);-webkit-mask:radial-gradient(circle,transparent 60%,#000 61%);mask:radial-gradient(circle,transparent 60%,#000 61%)}',
    '.gift.frag .gi{border-radius:50%}.gift .gi.lit{box-shadow:0 0 0 3px #FFE45A,0 0 22px 6px rgba(255,210,80,.8)}',
    '.tkh-fly{position:absolute;inset:0;z-index:20;pointer-events:none}.tkh-flyc{position:absolute;width:140px;height:140px;display:grid;place-items:center;border-radius:50%;background:radial-gradient(circle,rgba(255,230,120,.95),rgba(255,200,60,.35) 45%,transparent 70%)}.tkh-flyc .tkh-i{width:100px;height:100px}',
    '.tkh-card.fact{display:grid;grid-template-columns:120px 1fr;gap:12px;align-items:center;padding-top:34px}.tkh-card.fact .photo{height:96px;border-radius:6px;border:5px solid #fff;box-shadow:0 4px 8px rgba(0,0,0,.35);display:grid;place-items:center;transform:rotate(-3deg);filter:sepia(.55) contrast(1.05);overflow:hidden}',
    '.tkh-card.fact .photo img{width:94%;height:80%;object-fit:contain}.tkh-card.fact .ft b{font-size:17px}.tkh-card.fact .ft p{margin:4px 0 0;font-size:13px;line-height:1.4}',
    '.tkh-say{position:relative;display:flex;flex-direction:column;align-items:flex-end}.tkh-say p{margin:0;background:#fff;color:#1b2a55;border-radius:16px;padding:10px 14px;font-weight:800;font-size:14px;line-height:1.35;box-shadow:0 6px 14px rgba(0,0,0,.3);position:relative}',
    '.tkh-say p:after{content:"";position:absolute;right:40px;bottom:-12px;border:8px solid transparent;border-top:12px solid #fff}.tkh-say .peng{height:90px;object-fit:contain;margin:6px 10px 0 0;filter:drop-shadow(0 6px 8px rgba(0,0,0,.4))}',
    '.tkh-acts{display:flex;gap:14px;flex-wrap:wrap;justify-content:center;padding:8px 14px;border-radius:20px;background:rgba(10,24,64,.55);box-shadow:inset 0 0 0 2px rgba(120,190,255,.35)}.tkh-acts .tkh-btn{min-width:150px;min-height:56px}.tkh-acts .big{min-width:210px;font-size:20px}',
    '.tkh-strip{list-style:none;margin:2px 0 0;padding:6px 10px;display:flex;gap:0;width:min(820px,100%);overflow-x:auto;border-radius:18px;background:linear-gradient(rgba(22,48,110,.9),rgba(11,26,70,.92));box-shadow:inset 0 0 0 2px rgba(120,190,255,.45)}',
    '.tkh-strip li{flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;gap:3px;position:relative;text-align:center}.tkh-strip li:before{content:"";position:absolute;top:30px;left:0;right:0;height:4px;background:rgba(120,190,255,.35)}',
    '.tkh-strip li.done:before,.tkh-strip li.now:before{background:#3d9bff}.tkh-strip .tkh-st{height:16px}',
    '.tkh-strip .dot{position:relative;width:20px;height:20px;border-radius:50%;background:#0c1d4c;box-shadow:inset 0 0 0 3px #3d9bff;display:grid;place-items:center;margin-top:1px}.tkh-strip .done .dot{background:#9fd0ff}',
    '.tkh-strip .now .dot{width:30px;height:30px;margin-top:-4px;background:#1f56c9;box-shadow:0 0 0 3px #fff,0 0 14px #5ab0ff;color:#fff}.tkh-strip .now .tkh-arr.r{border-width:7px 0 7px 10px}',
    '.tkh-strip .lock .dot{box-shadow:inset 0 0 0 3px #56627e}.tkh-strip .lk{width:18px;height:18px}.tkh-strip b{font-size:14px}.tkh-strip small{font-size:12px;line-height:1.2;color:#cfe0ff;max-width:100%;padding:0 3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tkh-strip .lock small,.tkh-strip .lock b{color:#8190b0}',
    // reward portrait
    '.tkh-rw.is-port .tkh-hero{display:none}.tkh-rw.is-port .tkh-main{inset:0;padding:12px 12px 96px}',
    '.tkh-rw.is-port .tkh-herop{display:block;position:relative;width:100%;height:190px;margin-top:-6px}.tkh-rw.is-port .tkh-herop .timmy{position:absolute;left:50%;bottom:0;height:190px;transform:translateX(-40%);filter:drop-shadow(0 8px 12px rgba(0,0,0,.45))}',
    '.tkh-rw.is-port .tkh-herop .peng{position:absolute;left:8%;bottom:0;height:96px;filter:drop-shadow(0 6px 10px rgba(0,0,0,.4))}',
    '.tkh-rw.is-port .tkh-row2,.tkh-rw.is-port .tkh-row2.b{grid-template-columns:1fr;gap:18px}.tkh-rw.is-port .tkh-say{display:none}',
    '.tkh-rw.is-port .tkh-acts{position:absolute;position:fixed;left:0;right:0;bottom:0;border-radius:18px 18px 0 0;gap:8px;padding:10px 10px calc(10px + env(safe-area-inset-bottom));flex-wrap:nowrap;background:rgba(10,24,64,.94);z-index:5}',
    '.tkh-rw.is-port .tkh-acts .tkh-btn{min-width:0;flex:1;font-size:15px;padding:6px 8px}.tkh-rw.is-port .tkh-acts .big{flex:1.5;font-size:16px}.tkh-rw.is-port .tkh-acts .tkh-btn .tkh-i{width:24px;height:24px}',
    '.tkh-rw.is-port .tkh-plate .ban{width:70px}.tkh-rw.is-port .tkh-card.fact{grid-template-columns:96px 1fr}',
    '.tkh-rw.is-land.is-short .tkh-acts{position:sticky;bottom:0;z-index:4;background:rgba(10,24,64,.92)}.tkh-rw.is-land.is-short .tkh-acts{flex-wrap:nowrap;gap:8px}.tkh-rw.is-land.is-short .tkh-acts .tkh-btn{min-height:48px;min-width:0;font-size:16px;padding:6px 14px}.tkh-rw.is-land.is-short .tkh-hero .timmy{height:78%}.tkh-rw.is-land.is-short .tkh-main{gap:6px;padding-top:8px}.tkh-rw.is-land.is-short .tkh-bigstars .tkh-i{width:52px;height:52px}',
    '.tkh-rw.is-land:not(.is-short) .tkh-hero .sign{display:none}',
    // ── room + settings shared layout
    '.tkh-top{position:absolute;left:0;right:0;top:0;z-index:3;display:flex;align-items:flex-start;justify-content:center;gap:16px;padding:10px 16px;padding-top:calc(10px + env(safe-area-inset-top))}',
    '.tkh-top .tkh-plate.sm{padding:8px 34px 10px;max-width:620px}.tkh-top .tkh-plate.sm h1{font-size:clamp(26px,3.6vw,42px)}.tkh-top .tkh-prof{position:absolute;right:16px;top:calc(12px + env(safe-area-inset-top))}',
    '.tkh-side{position:absolute;z-index:3;left:14px;top:120px;width:190px;display:flex;flex-direction:column;gap:6px;padding:10px;border-radius:18px;background:linear-gradient(rgba(22,48,110,.92),rgba(11,26,70,.94));box-shadow:inset 0 0 0 2px rgba(120,190,255,.45),0 8px 20px rgba(0,0,0,.35)}',
    '.tkh-side button{min-height:50px;display:flex;align-items:center;gap:10px;border:0;border-radius:12px;background:transparent;color:#F4F7FF;font:600 15px Nunito,sans-serif;font-weight:800;padding:4px 10px;text-align:left;cursor:pointer;transition:background .2s var(--ease),transform .16s var(--ease)}',
    '.tkh-side button .tkh-i{width:34px;height:34px}.tkh-side button.on{background:linear-gradient(#3b86ff,#1c4fbf);box-shadow:inset 0 0 0 2px rgba(170,215,255,.7),0 3px 8px rgba(0,0,0,.3)}.tkh-side button:active{transform:scale(.97)}',
    '.tkh-body{position:absolute;z-index:2;left:220px;top:120px;bottom:12px;overflow:auto;overscroll-behavior:contain;padding:14px 6px 80px 6px}',
    '.tkh-room .tkh-body{right:calc(30% + 20px)}.tkh-room.nodet .tkh-body{right:16px}.tkh-set .tkh-body{right:16px}',
    '.tkh-spy{position:absolute;z-index:4;left:0;bottom:66px;width:210px;pointer-events:none}.tkh-spy img{width:100%;filter:drop-shadow(0 8px 12px rgba(0,0,0,.45))}',
    '.tkh-tools{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:14px}.srch{flex:1 1 150px;display:flex;align-items:center;gap:8px;min-height:48px;padding:0 14px;border-radius:14px;background:rgba(10,24,64,.85);box-shadow:inset 0 0 0 2px rgba(120,190,255,.45)}',
    '.srch input{flex:1;min-width:0;height:44px;border:0;background:transparent;color:#fff;font:700 16px Nunito,sans-serif;outline:none}.srch input::placeholder{color:#9fb2d8}',
    '.tkh-lens{width:18px;height:18px;border:3px solid #cfe0ff;border-radius:50%;position:relative;flex:none}.tkh-lens:after{content:"";position:absolute;width:3px;height:9px;background:#cfe0ff;right:-5px;bottom:-8px;transform:rotate(-45deg);border-radius:2px}',
    '.tkh-room.is-land:not(.is-short) .tkh-tools{flex-wrap:nowrap}.tkh-room.is-land:not(.is-short) .srch{min-width:120px}.chips{display:flex;gap:6px;flex:none}.cnt{flex:none}.chips button{min-height:44px;min-width:64px;padding:0 14px;border:0;border-radius:22px;background:rgba(10,24,64,.85);color:#fff;font:800 14px Nunito,sans-serif;box-shadow:inset 0 0 0 2px rgba(120,190,255,.45);cursor:pointer}',
    '.chips button.on{background:linear-gradient(#5aa8ff,#1f5fd6);box-shadow:inset 0 0 0 2px #d0e8ff,0 0 12px rgba(90,168,255,.6)}',
    '.cnt{display:flex;align-items:center;gap:8px;padding:6px 14px;border-radius:14px;background:rgba(10,24,64,.85);box-shadow:inset 0 0 0 2px rgba(120,190,255,.45)}.cnt .tkh-i{width:36px;height:36px}.cnt span{font-size:13px;font-weight:800;line-height:1.1}.cnt b{display:block;font-size:20px}',
    '.tkh-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:12px}.tkh-grid .empty{grid-column:1/-1;text-align:center;font-weight:800}',
    '.tkh-ship{position:relative;border-radius:14px;padding:6px 6px 8px;text-align:center;background:linear-gradient(#27509f,#12306e);box-shadow:inset 0 0 0 2px rgba(120,190,255,.5),0 6px 12px rgba(0,0,0,.35);cursor:pointer;transition:transform .2s var(--ease),box-shadow .2s var(--ease)}',
    '.tkh-ship:active{transform:scale(.97)}.tkh-ship.sel{box-shadow:inset 0 0 0 2px #fff6b0,0 0 0 3px #FFD34D,0 0 18px rgba(255,210,80,.7)}',
    '.tkh-ship .th{height:92px;border-radius:10px;display:grid;place-items:center;overflow:hidden;position:relative}.tkh-ship .th .sh{width:96%;height:88%;object-fit:contain;filter:drop-shadow(0 4px 6px rgba(0,0,0,.4))}',
    '.tkh-ship.no .th .sh{filter:brightness(.4) saturate(0);opacity:.9}.tkh-ship .th .lk{position:absolute;width:30px;height:30px;right:6px;bottom:6px}',
    '.tkh-ship b{display:block;font-size:14px;margin:6px 0 2px;line-height:1.15;min-height:32px;display:flex;align-items:center;justify-content:center}',
    '.fav{position:absolute;top:2px;right:2px;width:44px;height:44px;border:0;border-radius:50%;background:transparent;display:grid;place-items:center;cursor:pointer;padding:0}.fav .tkh-i{width:28px;height:28px;filter:grayscale(1) brightness(1.6);opacity:.75;transition:transform .2s var(--ease)}',
    '.fav.on .tkh-i{filter:none;opacity:1;transform:scale(1.12)}',
    '.tkh-det{position:absolute;z-index:3;right:16px;top:120px;bottom:12px;width:30%;overflow:auto;overscroll-behavior:contain;padding:22px 14px 14px;border-radius:18px;background:linear-gradient(rgba(22,48,110,.94),rgba(11,26,70,.96));box-shadow:inset 0 0 0 2px rgba(120,190,255,.5),0 8px 20px rgba(0,0,0,.35);display:flex;flex-direction:column;gap:10px}',
    '.tkh-det>*{flex:none}.tkh-det .hero,.tkh-ship .th,.pics div,.tkh-card.fact .photo{grid-template-rows:100%;grid-template-columns:100%}.tkh-det:empty{display:none}.rib{align-self:center;background:linear-gradient(#e2393a,#a81d24);color:#fff;font-size:20px;padding:6px 26px;border-radius:6px;box-shadow:0 4px 8px rgba(0,0,0,.35);clip-path:polygon(0 0,100% 0,96% 50%,100% 100%,0 100%,4% 50%);text-align:center}',
    '.tkh-det .hero{position:relative;height:150px;border-radius:12px;display:grid;place-items:center;box-shadow:inset 0 0 0 2px rgba(255,255,255,.3)}.tkh-det .hero img{width:92%;height:88%;object-fit:contain;filter:drop-shadow(0 6px 10px rgba(0,0,0,.45))}',
    '.tkh-det .hero .fav{background:rgba(10,24,64,.7)}.tags{display:flex;flex-wrap:wrap;gap:6px}.tags span{padding:4px 12px;border-radius:12px;font-size:13px;font-weight:800}.tags .t1{background:#2f6fd6}.tags .t2{background:#f2c85a;color:#3a2300}.tags .t3{background:#8b5fd6}',
    '.tkh-det .txt{margin:0;font-size:14px;line-height:1.45}.spec{display:grid;grid-template-columns:auto 1fr;gap:4px 14px;margin:0;padding:10px 12px;border-radius:12px;background:rgba(6,16,44,.6);font-size:13px}.spec dt{color:#B9C8E6;font-weight:700}.spec dd{margin:0;font-weight:800}',
    '.pics{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.pics div{height:68px;border-radius:8px;display:grid;place-items:center;box-shadow:inset 0 0 0 2px rgba(255,255,255,.35)}.pics div:first-child{filter:sepia(.7)}.pics img{width:90%;height:80%;object-fit:contain}',
    '.tkh-panel{padding:16px;border-radius:18px;background:linear-gradient(rgba(22,48,110,.92),rgba(11,26,70,.94));box-shadow:inset 0 0 0 2px rgba(120,190,255,.45)}',
    '.tkh-cbig{display:flex;align-items:center;gap:18px;margin-bottom:16px}.tkh-cmp.xl{display:grid;place-items:center;width:130px;height:130px;border-radius:50%;flex:none}.tkh-cmp.xl .tkh-i{width:110px;height:110px}.tkh-cbig b{font-size:24px}.tkh-cbig p{margin:6px 0 0;font-size:14px;line-height:1.4}',
    '.tkh-frags{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:10px}.tkh-frags div{text-align:center;padding:8px;border-radius:12px;background:rgba(6,16,44,.6)}.tkh-frags .tkh-i{width:48px;height:48px}.tkh-frags .no .tkh-i{filter:grayscale(1) brightness(.5)}',
    '.tkh-frags b{display:block;font-size:14px}.tkh-frags small{font-size:12px;color:#cfe0ff}',
    '.tkh-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}.tkh-hc{min-height:64px;display:grid;grid-template-columns:44px 1fr;grid-template-rows:auto auto;column-gap:8px;align-items:center;text-align:left;border:0;border-radius:12px;padding:8px 10px;background:linear-gradient(#fbf1d9,#efdcb1);color:#3b2410;cursor:pointer;box-shadow:0 4px 10px rgba(0,0,0,.3)}',
    '.tkh-hc .tkh-i{grid-row:1/3;width:40px;height:40px}.tkh-hc b{font-size:14px}.tkh-hc small{font-size:12px;color:#6a4a24}.tkh-hc.no{background:linear-gradient(#5b6780,#414b61);color:#dfe6f5}.tkh-hc.no small{color:#c3cbe0}',
    '.tkh-badges{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:8px}.tkh-badge{position:relative;text-align:center;padding:8px 4px;border-radius:12px;background:rgba(6,16,44,.6);box-shadow:inset 0 0 0 2px rgba(120,190,255,.35)}',
    '.tkh-badge .bi{width:56px;height:56px}.tkh-badge b{display:block;font-size:12px;line-height:1.2;margin-top:4px}.tkh-badge.no .bi{filter:grayscale(1) brightness(.45);opacity:.6}.tkh-badge.no b{color:#8fa0c4}.tkh-badge .lk{position:absolute;left:50%;top:22px;width:30px;height:30px;transform:translateX(-50%)}',
    '.tkh-prog div{display:grid;grid-template-columns:150px 1fr 52px;gap:10px;align-items:center;margin:8px 0;font-weight:800}.tkh-prog i{height:16px;border-radius:9px;background:#0a1633;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(255,255,255,.2)}',
    '.tkh-prog s{display:block;height:100%;background:linear-gradient(90deg,#3dd17a,#9ff06a);transform-origin:0 50%}.tkh-prog b{text-align:right}.tkh-note{font-size:13px;color:#cfe0ff;margin:12px 0 0}',
    '.tkh-modal{position:absolute;inset:0;z-index:30;background:rgba(4,10,30,.6);display:grid;place-items:center;padding:16px}.tkh-modal[hidden]{display:none}',
    '.tkh-modal .box{width:min(560px,100%);max-height:100%;overflow:auto;display:flex;flex-direction:column;gap:12px;padding:18px;border-radius:18px;background:linear-gradient(rgba(22,48,110,.98),rgba(11,26,70,.98));box-shadow:inset 0 0 0 2px rgba(120,190,255,.5)}',
    '.tkh-modal article{display:flex;gap:10px;align-items:flex-start;padding:10px;border-radius:12px;background:linear-gradient(#fbf1d9,#efdcb1);color:#3b2410}.tkh-modal article .tkh-i{width:44px;height:44px}.tkh-modal article p{margin:4px 0 0;font-size:14px;line-height:1.45}.tkh-modal article.no{opacity:.75;filter:grayscale(.6)}',
    '.tkh-modal .list{display:flex;flex-direction:column;gap:10px}',
    // room portrait
    '.tkh.is-port .tkh-top{position:relative;flex-direction:column;align-items:stretch;gap:8px}.tkh.is-port .tkh-top .tkh-prof{position:static;align-self:flex-end;order:-1}.tkh.is-port .tkh-top .tkh-plate.sm{max-width:none}',
    '.tkh-room.is-port,.tkh-set.is-port{overflow:auto;overscroll-behavior:contain}',
    '.tkh.is-port .tkh-side{position:relative;left:auto;top:auto;width:auto;margin:0 12px;flex-direction:row;overflow-x:auto;gap:4px;padding:6px;scrollbar-width:none}',
    '.tkh.is-port .tkh-side button{flex:0 0 auto;flex-direction:column;gap:2px;min-width:74px;font-size:12px;text-align:center;padding:6px}.tkh.is-port .tkh-side button .tkh-i{width:30px;height:30px}',
    '.tkh.is-port .tkh-body{position:relative;left:auto;top:auto;right:auto!important;bottom:auto;overflow:visible;padding:14px 12px}',
    '.tkh-room.is-port .tkh-grid{grid-template-columns:repeat(3,1fr);gap:8px}.tkh-room.is-port .tkh-ship .th{height:64px}.tkh-room.is-port .tkh-ship b{font-size:12px;min-height:30px}.tkh-room.is-port .tkh-st .tkh-i{width:16px;height:16px}',
    '.tkh-room.is-port .tkh-det{position:relative;right:auto;top:auto;bottom:auto;width:auto;margin:0 12px 90px;overflow:visible}',
    '.tkh-room.is-port .tkh-spy{display:none}.tkh.is-port .tkh-back{position:fixed}',
    '.tkh-room.is-land.is-short .tkh-spy{display:none}.tkh-room.is-land.is-short .tkh-side{top:96px;width:170px;bottom:74px;overflow:auto}.tkh-room.is-land.is-short .tkh-body,.tkh-room.is-land.is-short .tkh-det{top:96px}.tkh-room.is-land.is-short .tkh-body{left:194px}',
    '.tkh-room.is-land.is-short .tkh-side button{min-height:44px;font-size:13px}.tkh-room.is-land.is-short .tkh-top .tkh-plate.sm p{display:none}',
    // ── settings
    '.tkh-set .tkh-plate.sm{display:flex;align-items:center;gap:12px;text-align:left}.tkh-set .tkh-plate .gear{width:52px;height:52px}',
    '.tkh-sgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:22px 16px;padding-top:12px;align-items:start}',
    '.tkh-set.is-land:not(.is-short) .tkh-sgrid{grid-template-columns:1fr 1fr minmax(250px,.9fr);grid-auto-flow:row dense}.tkh-set.is-land:not(.is-short) .tkh-sgrid .prof{grid-column:3;grid-row:1/span 4}.tkh-set.is-land .prof .tkh-badges{grid-template-columns:repeat(auto-fill,minmax(74px,1fr))}.tkh-set.is-land .prof .tkh-badge .bi{width:42px;height:42px}.tkh-set.is-land .prof .tkh-badge .lk{top:14px;width:24px;height:24px}',
    '.tkh-sgrid .prof{grid-column:auto}.srow{display:flex;align-items:center;gap:10px;min-height:48px;border-bottom:1px dashed rgba(90,60,20,.25)}.srow:last-child{border-bottom:0}.srow>span{flex:1;font-weight:800;font-size:15px}.srow .tkh-i{width:30px;height:30px}',
    '.srow.sl>span{flex:0 0 96px}.srow input[type=range]{flex:1;min-width:80px;height:44px;-webkit-appearance:none;appearance:none;background:transparent;cursor:pointer}',
    '.srow input[type=range]::-webkit-slider-runnable-track{height:10px;border-radius:6px;background:linear-gradient(90deg,#2f7bff var(--v),#c9b98f var(--v))}.srow input[type=range]::-moz-range-track{height:10px;border-radius:6px;background:linear-gradient(90deg,#2f7bff var(--v),#c9b98f var(--v))}',
    '.srow input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:28px;height:28px;margin-top:-9px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#fff,#9cc7ff 40%,#1f56c9);border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)}',
    '.srow input[type=range]::-moz-range-thumb{width:24px;height:24px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#fff,#9cc7ff 40%,#1f56c9);border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)}',
    '.srow b{min-width:46px;text-align:right;font-size:15px}',
    '.tkh-mute{position:relative;width:30px;height:30px;flex:none}.tkh-mute:before{content:"";position:absolute;left:2px;top:9px;width:9px;height:12px;background:#3b2410;border-radius:2px;box-shadow:6px 0 0 -1px #3b2410}.tkh-mute:after{content:"";position:absolute;left:6px;top:13px;width:22px;height:3px;background:#d33;transform:rotate(-40deg);border-radius:2px}',
    '.tkh-tog{position:relative;width:62px;height:44px;border:0;background:transparent;cursor:pointer;flex:none;padding:0}.tkh-tog:before{content:"";position:absolute;left:4px;right:4px;top:9px;height:26px;border-radius:14px;background:#8d8a86;box-shadow:inset 0 2px 4px rgba(0,0,0,.35);transition:background .2s var(--ease)}',
    '.tkh-tog:after{content:"";position:absolute;left:7px;top:12px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 2px 4px rgba(0,0,0,.35);transition:transform .22s var(--ease)}.tkh-tog.on:before{background:linear-gradient(#3b86ff,#1c4fbf)}.tkh-tog.on:after{transform:translateX(28px)}',
    '.lbl{font-weight:800;font-size:14px;margin:2px 0 6px}.tkh-seg{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:6px}.tkh-seg button{min-height:46px;border:0;border-radius:10px;background:linear-gradient(#f7f1e4,#dfd3b8);color:#1c3a7a;font:16px "Fredoka One",Nunito,sans-serif;box-shadow:inset 0 0 0 2px rgba(60,90,160,.25);cursor:pointer}',
    '.tkh-seg button.on{background:linear-gradient(#3b86ff,#1c4fbf);color:#fff;box-shadow:inset 0 0 0 2px #cfe4ff}',
    '.tkh-lang{width:100%;min-height:52px;display:flex;align-items:center;gap:10px;border:0;border-radius:12px;padding:6px 14px;margin-bottom:10px;background:linear-gradient(#3b86ff,#1c4fbf);color:#fff;font:17px "Fredoka One",Nunito,sans-serif;box-shadow:inset 0 0 0 2px #cfe4ff}.tkh-lang span{flex:1;text-align:left}',
    '.tkh-check{width:12px;height:22px;border:solid #fff;border-width:0 4px 4px 0;transform:rotate(45deg);margin-right:6px}',
    '.tkh-card.prof{padding-top:14px}.tkh-card.prof .pr{display:flex;align-items:center;gap:12px}.tkh-card.prof .av{width:84px;height:84px;border-radius:50%;object-fit:cover;object-position:top;background:#fbe3b5;border:3px solid #FFC53D;flex:none}',
    '.tkh-card.prof .pr b{font-size:22px;display:block}.tkh-card.prof .pr span{display:flex;align-items:center;gap:4px;font-weight:800}.tkh-card.prof .pr span .tkh-i{width:20px;height:20px}.tkh-card.prof .bar{width:150px;margin-top:4px}',
    '.tkh-card.prof .quote{font-size:16px;font-style:italic;margin:10px 0;color:#e8eeff}.tkh-card.prof h3{display:flex;justify-content:space-between;margin:6px 0 8px;font-size:18px;padding-top:8px;border-top:1px solid rgba(120,190,255,.3)}',
    '.tkh-p{margin:0 0 10px;font-size:14px;line-height:1.45}',
    '.tkh-deck{position:absolute;z-index:4;left:0;bottom:62px;width:215px;height:calc(100% - 650px);max-height:260px;pointer-events:none}.tkh-deck .timmy{position:absolute;left:6px;bottom:0;height:100%;filter:drop-shadow(0 8px 12px rgba(0,0,0,.45))}',
    '.tkh-deck .peng{position:absolute;right:0;bottom:0;height:52%;filter:drop-shadow(0 6px 8px rgba(0,0,0,.4))}.tkh-deck .bub{display:none;position:absolute;left:12px;top:-64px;width:200px;background:#fff8e6;color:#3b2410;padding:10px 12px;border-radius:14px;font:15px "Fredoka One",Nunito,sans-serif;box-shadow:0 6px 12px rgba(0,0,0,.35)}',
    '.tkh-save{position:absolute;right:16px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:6;min-width:170px;min-height:56px;font-size:20px}',
    '.tkh-set.is-port .tkh-sgrid{grid-template-columns:1fr;padding-right:0;padding-bottom:90px}.tkh-set.is-port .tkh-deck{display:none}.tkh-set.is-port .tkh-save{position:fixed}',
    '.tkh-set.is-land.is-short .tkh-deck{display:none}.tkh-set.is-land.is-short .tkh-sgrid{padding-right:0}.tkh-set.is-land.is-short .tkh-side{top:96px;width:170px;bottom:74px;overflow:auto}.tkh-set.is-land.is-short .tkh-body{top:96px;left:194px}.tkh-set.is-land.is-short .tkh-side button{min-height:44px;font-size:13px}',
    '.tkh-set.is-land.is-short .tkh-top .tkh-plate.sm p{display:none}.tkh-set.is-land.is-short .tkh-plate .gear{width:36px;height:36px}',
    '.tkh-set.is-land:not(.is-short) .tkh-side{bottom:auto}',
    '@media (prefers-reduced-motion:reduce){.tkh *{transition:none!important}}'
  ].join('\n')
  function injectCss () { if (D.getElementById('tkh-css')) return; var s = D.createElement('style'); s.id = 'tkh-css'; s.textContent = CSS; (D.head || D.documentElement).appendChild(s) }
  injectCss()

  W.TKHub = { reward: reward, room: room, settings: settings, say: say, music: music, config: config, normalize: normalize,
    stats: stats, achievements: achievements, rows: rows, sfx: SFX, _cfg: CFG, version: '1.0.0' }
})()
