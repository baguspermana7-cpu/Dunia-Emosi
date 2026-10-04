/* Mojo scene life (owner 2026-10-04: "give the background an overlay so it doesn't look static, the same for the
 * diorama board"). Pure presentation, two layers, no game state touched:
 *  - #msl-bg: first child of #scr-play, painted under every play-screen panel (z-index -1 in an isolated screen).
 *    A copy of the scene painting breathes (ken burns 1 -> 1.03), two cloud bands drift at two depths, a soft ray
 *    fan sways, a pool of themed particles (<= 14) drifts, and a far flyer crosses now and then.
 *  - #msl-board: inside #board, right over the ground canvases and under every tile, item, tag and Mojo (they all
 *    carry a positive z-index). Cloud shadows slide, a light sweep passes every 8 s, grass tufts sway in batches.
 *    The diorama base (.mbl-skirt) breathes from the CSS file.
 * Theme = the painting's file name (the game writes it to #scr-play's inline background-image), so the game needs
 * no call. Only transform/opacity animate (CSS). Paused while the page is hidden, off the play screen or under an
 * overlay; under reduced motion nothing is built that moves. ES5, vanilla. */
(function (W, D) {
  'use strict'
  var RM = false, mq = null
  try { mq = W.matchMedia('(prefers-reduced-motion: reduce)'); RM = mq.matches } catch (e) {}
  function $ (id) { return D.getElementById(id) }
  function rnd (a, b) { return a + Math.random() * (b - a) }
  function node (tag, cls) { var e = D.createElement(tag); e.className = cls; e.setAttribute('aria-hidden', 'true'); return e }

  // painting file -> theme
  var THEME = { 'fire-station': 'fire', 'forest-fire': 'fire', 'coastal-road': 'coast', 'garage-harbour': 'coast', 'garage-street': 'coast',
    'pirate-pier': 'coast', 'beach-cove': 'coast', 'flood-street': 'coast', 'river-rapids': 'coast', 'night-highway': 'night',
    'space-road': 'space', underwater: 'deep', 'snow-road': 'snow', 'ice-floes': 'snow', 'fallen-tree': 'forest', 'mud-road': 'forest',
    fairground: 'fair' }
  // particles per theme: [kind, count]; the whole pool stays <= 14
  var RECIPE = { sky: [['petal', 5], ['leaf', 3]], fire: [['ember', 12]], coast: [['glint', 9], ['petal', 2]], night: [['star', 12]],
    space: [['star', 14]], deep: [['bubble', 10]], snow: [['snow', 14]], forest: [['firefly', 7], ['leaf', 4]], fair: [['conf', 10], ['balloon', 2]] }
  var FLYER = { sky: ['birds', 'birds', 'plane'], fire: [], coast: ['gulls'], night: ['shoot'], space: ['shoot'], deep: [], snow: ['birds'],
    forest: ['birds'], fair: ['birds', 'plane'] }
  var CONF = ['#FF5252', '#FFD740', '#40C4FF', '#69F0AE', '#FF80AB', '#B388FF']
  var SVG = {
    birds: '<svg viewBox="0 0 60 24"><g fill="none" stroke="#3E4A55" stroke-width="2" stroke-linecap="round"><path d="M2 12Q7 6 12 11Q17 6 22 12"/><path d="M24 6Q28 1 32 5Q36 1 40 6"/><path d="M38 17Q42 12 46 16Q50 12 54 17"/></g></svg>',
    gulls: '<svg viewBox="0 0 60 24"><g fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round"><path d="M2 14Q8 6 14 13Q20 6 26 14"/><path d="M32 8Q37 2 42 7Q47 2 52 8"/></g><g fill="none" stroke="#546E7A" stroke-width="1" stroke-linecap="round" opacity=".6"><path d="M2 14Q8 6 14 13Q20 6 26 14"/><path d="M32 8Q37 2 42 7Q47 2 52 8"/></g></svg>',
    plane: '<svg viewBox="0 0 120 20"><path d="M0 11H70" stroke="rgba(255,255,255,.75)" stroke-width="3" stroke-linecap="round"/><path d="M72 10l22-2 8-6h4l-4 7 10 1-10 2 4 7h-4l-8-6-22-2z" fill="#ECEFF1" stroke="#90A4AE" stroke-width="1"/></svg>',
    shoot: '<svg viewBox="0 0 120 20"><defs><linearGradient id="mslSg" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient></defs><path d="M2 12L112 6" stroke="url(#mslSg)" stroke-width="2.4" stroke-linecap="round"/><circle cx="113" cy="6" r="3" fill="#fff"/></svg>'
  }

  /* ── background life ── */
  var bg = null, theme = '', flyT = 0
  function themeOf (url) {
    var m = /mojo-bg\/([a-z0-9-]+?)(?:-land|-port)?\.(?:webp|png|jpe?g)/.exec(decodeURIComponent(url || ''))
    return m ? (THEME[m[1]] || 'sky') : 'sky'
  }
  function buildBg () {
    var scr = $('scr-play'); if (!scr) return
    bg = $('msl-bg'); if (bg) bg.remove()
    bg = node('div', 'msl-bg'); bg.id = 'msl-bg'
    bg.innerHTML = '<i class="msl-paint msl-anim"></i><i class="msl-rays msl-anim"></i><i class="msl-cl msl-cl1 msl-anim"></i><i class="msl-cl msl-cl2 msl-anim"></i>' +
      '<i class="msl-haze msl-anim"></i><i class="msl-haze msl-haze2 msl-anim"></i><div class="msl-parts"></div><i class="msl-fly"></i>'
    scr.insertBefore(bg, scr.firstChild); scr.classList.add('msl-on')
  }
  function syncPaint () {
    var scr = $('scr-play'); if (!scr) return
    if (!bg || !bg.parentNode) buildBg()
    var img = scr.style.backgroundImage || '', paint = bg.querySelector('.msl-paint')
    if (paint.style.backgroundImage !== img) paint.style.backgroundImage = img
    var t = themeOf(img)
    if (t !== theme) { theme = t; bg.setAttribute('data-msl', t); particles() }
  }
  function particles () {
    var box = bg.querySelector('.msl-parts'); box.innerHTML = ''
    if (RM) return
    ;(RECIPE[theme] || RECIPE.sky).forEach(function (r) {
      for (var i = 0; i < r[1]; i++) {
        var p = node('i', 'msl-p msl-anim msl-' + r[0]), s = p.style, d
        if (r[0] === 'ember') { d = rnd(5, 9); s.left = rnd(4, 96) + '%'; s.top = rnd(70, 92) + '%'; s.setProperty('--dx', rnd(-6, 6).toFixed(1) + 'vw'); s.setProperty('--sz', rnd(3, 6).toFixed(1) + 'px') }
        else if (r[0] === 'star') { d = rnd(2.4, 5); s.left = rnd(2, 98) + '%'; s.top = rnd(10, 46) + '%'; s.setProperty('--sz', rnd(2, 4.5).toFixed(1) + 'px') }
        else if (r[0] === 'glint') { d = rnd(1.8, 3.6); s.left = rnd(3, 97) + '%'; s.top = rnd(58, 90) + '%'; s.setProperty('--sz', rnd(8, 16).toFixed(0) + 'px') }
        else if (r[0] === 'snow') { d = rnd(10, 18); s.left = rnd(0, 100) + '%'; s.top = '-4%'; s.setProperty('--dx', rnd(-8, 8).toFixed(1) + 'vw'); s.setProperty('--sz', rnd(3, 7).toFixed(1) + 'px') }
        else if (r[0] === 'firefly') { d = rnd(6, 10); s.left = rnd(4, 96) + '%'; s.top = rnd(45, 88) + '%'; s.setProperty('--sz', rnd(4, 6).toFixed(1) + 'px') }
        else if (r[0] === 'bubble') { d = rnd(8, 14); s.left = rnd(3, 97) + '%'; s.top = '96%'; s.setProperty('--dx', rnd(-3, 3).toFixed(1) + 'vw'); s.setProperty('--sz', rnd(5, 12).toFixed(0) + 'px') }
        else if (r[0] === 'balloon') { d = rnd(26, 34); s.left = rnd(8, 88) + '%'; s.top = '98%'; s.setProperty('--dx', rnd(-5, 5).toFixed(1) + 'vw'); s.setProperty('--c', CONF[i * 2 % CONF.length]) }
        else if (r[0] === 'conf') { d = rnd(9, 14); s.left = rnd(0, 100) + '%'; s.top = '-3%'; s.setProperty('--dx', rnd(-10, 10).toFixed(1) + 'vw'); s.setProperty('--c', CONF[i % CONF.length]) }
        else { d = rnd(16, 24); s.left = '0'; s.top = rnd(18, 70) + '%'; s.setProperty('--dy', rnd(8, 26).toFixed(1) + 'vh'); s.setProperty('--sz', rnd(7, 11).toFixed(0) + 'px') }   // leaf / petal, crossing
        s.animationDuration = d.toFixed(2) + 's'; s.animationDelay = (-rnd(0, d)).toFixed(2) + 's'
        box.appendChild(p)
      }
    })
  }
  // a far flyer: one element, restarted every 16-28 s while the screen plays
  function fly () {
    flyT = 0; if (RM || !bg) return
    var kinds = FLYER[theme] || []
    if (kinds.length && running()) {
      var f = bg.querySelector('.msl-fly'), k = kinds[Math.floor(Math.random() * kinds.length)], rtl = k !== 'shoot' && Math.random() < 0.5
      f.className = 'msl-fly'; f.innerHTML = SVG[k]; f.style.top = rnd(11, k === 'shoot' ? 26 : 32).toFixed(1) + '%'
      void f.offsetWidth   // restart the animation
      f.className = 'msl-fly msl-anim on msl-f-' + k + (rtl ? ' msl-rtl' : '')
    }
    flyT = W.setTimeout(fly, rnd(16000, 28000))
  }

  /* ── board life ── */
  function buildBoard () {
    var board = $('board'), lv = level(); if (!board) return
    var old = $('msl-board'); if (old) old.remove()
    var L = node('div', 'layer msl-board'); L.id = 'msl-board'
    L.innerHTML = '<i class="msl-cs msl-anim"></i><i class="msl-cs msl-cs2 msl-anim"></i><i class="msl-sweep msl-anim"></i>'
    var after = $('mbl-ground') || $('board-bg')
    board.insertBefore(L, after ? after.nextSibling : board.firstChild); board.classList.add('msl-on')
    if (!lv || RM || lv.grid.theme === 'school') return
    // grass tufts: ',' cells without an object, at most 10, swaying in three batches
    var occ = {}, cells = [], R = lv.grid.rows, C = lv.grid.cols
    ;(lv.objects || []).forEach(function (o) { occ[o.at[0] + ',' + o.at[1]] = 1 })
    lv.grid.map.forEach(function (row, r) { for (var c = 0; c < row.length; c++) if (row.charAt(c) === ',' && !occ[r + ',' + c]) cells.push([r, c]) })
    cells.sort(function (a, b) { return ((a[0] * 7 + a[1] * 13) % 11) - ((b[0] * 7 + b[1] * 13) % 11) })
    cells.slice(0, 10).forEach(function (rc, i) {
      var t = node('i', 'msl-tuft msl-anim'), x = ((rc[0] * 37 + rc[1] * 59) % 50) / 100
      t.style.left = ((rc[1] + 0.2 + x) / C * 100).toFixed(2) + '%'; t.style.top = ((rc[0] + 0.72) / R * 100).toFixed(2) + '%'
      t.style.animationDelay = (-(i % 3) * 1.4).toFixed(1) + 's'
      L.appendChild(t)
    })
  }
  function level () {
    var st = W.__mojo && W.__mojo.state && W.__mojo.state()
    return st && W.MojoLevels ? W.MojoLevels.byId(st.id) : null
  }

  /* ── run / pause ── */
  function running () { return D.body.getAttribute('data-scr') === 'scr-play' && !D.hidden && !D.querySelector('.overlay.on') }
  var paused = null
  function syncRun () {
    var scr = $('scr-play'); if (!scr) return
    var p = !running()
    if (p !== paused) { paused = p; scr.classList.toggle('msl-pause', p) }
  }

  function wire () {
    var scr = $('scr-play'), objs = $('objs')
    if (!scr || W.__mslWired) return
    W.__mslWired = true
    buildBg(); syncPaint(); syncRun()
    new MutationObserver(syncPaint).observe(scr, { attributes: true, attributeFilter: ['style'] })
    new MutationObserver(syncRun).observe(D.body, { attributes: true, attributeFilter: ['data-scr'] })
    ;[].forEach.call(D.querySelectorAll('.overlay'), function (o) { new MutationObserver(syncRun).observe(o, { attributes: true, attributeFilter: ['class'] }) })
    D.addEventListener('visibilitychange', syncRun)
    // after the board look has rebuilt its own layers (it runs on the same mutation, one frame earlier)
    if (objs) new MutationObserver(function (ms) {
      if (ms.some(function (m) { return m.type === 'childList' && m.target === objs })) W.requestAnimationFrame(function () { W.requestAnimationFrame(buildBoard) })
    }).observe(objs, { childList: true })
    if (objs && objs.children.length) buildBoard()
    if (mq && mq.addEventListener) mq.addEventListener('change', function (e) { RM = e.matches; particles(); buildBoard() })
    flyT = W.setTimeout(fly, rnd(5000, 9000))
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', wire); else wire()

  W.MojoSceneLife = { theme: function () { return theme }, themeOf: themeOf, RECIPE: RECIPE, fly: fly, rebuild: function () { theme = ''; syncPaint(); buildBoard() },
    state: function () { return { theme: theme, rm: RM, paused: !!paused, parts: bg ? bg.querySelectorAll('.msl-p').length : 0 } } }
})(window, document)
