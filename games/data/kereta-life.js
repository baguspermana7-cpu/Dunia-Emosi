/* =============================================================================
 * kereta-life.js — the board LIVES (owner 2026-10-11: "NPC jangan statis, buat bergerak, parallax overlay, trik keren, lihat
 * Mojo tapi improve"). Built on the cast layer (#decor .dec.cast) the pack already draws; the engine is untouched.
 *   idle      every cast figure/animal gets TWO independent idles on separate CSS properties (scale: breathe or blink-squash,
 *             rotate: sway or head tilt), with its own phase and speed, so no two stand alike
 *   poses     figures swap to another pose of THEMSELVES for a moment, now and then (Henry wave -> point, Baron stand -> angkuh)
 *   deer      graze, lift the head, step a little, graze again
 *   birds     hop on the spot; when Linus passes close they fly off and settle back later
 *   fringe    grass blades and flowers along the board's lower edge, in FRONT of the board, drifting against Linus's position
 *   shadows   soft cloud shadows slide over the board on bright days; dust motes float in the light
 * Transform / opacity / the individual translate-scale-rotate properties only. Everything is off under prefers-reduced-motion
 * (the figures keep their pose, the fringe stands still). Loaded after kereta-cine.js.
 * ==========================================================================*/
(function (W) {
  'use strict'
  var P = W.MojoPack, def = P && P.def
  if (!def || def.id !== 'kereta') return
  var D = W.document, PG = W.ProgGrid, MA = W.MojoArt
  var RM = false; try { RM = W.matchMedia('(prefers-reduced-motion: reduce)').matches } catch (e) {}
  function $ (id) { return D.getElementById(id) }
  function el (tag, cls, html) { var e = D.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e }
  function rnd (a, b) { return a + Math.random() * (b - a) }
  function cell () { return parseFloat(W.getComputedStyle(D.documentElement).getPropertyValue('--cell')) || 64 }

  // another pose of the SAME character (database keys: <group>/<who>/<pose>)
  var POSES = {
    'story-char/henry': ['wave', 'point'], 'story-char/baron': ['stand', 'angkuh'], 'story-char/katrina': ['stand', 'khawatir'], 'story-char/scarlet': ['stand', 'ramah', 'gesture'],
    'story-char/carter': ['hands-hips', 'point', 'hands-open', 'arms-crossed'], 'story-char/james': ['arms-folded', 'point-scroll', 'scroll'],
    'animal/deer': ['graze', 'stand'], 'animal/turtle': ['walk', 'stand'], 'animal/vulture': ['perch-1', 'perch-2'], 'animal/rabbit': ['sit', 'run'],
    'malivlak-char/masinis': ['jalan', 'pipa-2', 'periksa'], 'malivlak-char/petugas-stasiun': ['berdiri', 'peluit', 'bendera'], 'malivlak-char/penumpang-ungu': ['berdiri', 'duduk'],
    'malivlak-char/penyambut': ['jangkung', 'jangkung-bungkuk', 'pendek', 'pendek-medali'], 'malivlak-char/orkes': ['pemimpin', 'pemimpin-tongkat', 'pemimpin-kiri']
  }
  function dbKey (img) { var m = /assets\/db\/lib\/(.+)\.webp/.exec(img.getAttribute('data-k0') || img.getAttribute('src') || ''); return m ? m[1] : '' }
  function keyOf (src) { var m = /assets\/db\/lib\/(.+?)\.webp/.exec(src || ''); return m ? m[1] : '' }
  function srcOf (key, ref) { return (ref || '').replace(/assets\/db\/lib\/.+?\.webp/, 'assets/db/lib/' + key + '.webp') }

  /* ── cast: independent idles + pose swaps + deer + birds ──────────────── */
  var LIVE = []
  function adopt () {
    ;[].forEach.call(D.querySelectorAll('#decor .dec.cast'), function (n, i) {
      if (n.getAttribute('data-live')) return
      n.setAttribute('data-live', '1')
      var img = n.querySelector('img'); if (!img) return
      var key = keyOf(img.getAttribute('src')), grp = key.replace(/\/[^/]+$/, ''), kind = /animal\/bird/.test(key) ? 'bird' : /animal\/deer/.test(key) ? 'deer' : /animal\//.test(key) ? 'animal' : 'person'
      var a = i % 2 ? 'kBlink' : 'kBreath2', b = (i % 3 === 0) ? 'kTilt' : 'kSway'
      if (kind === 'bird') { a = 'kHop'; b = 'kSway' }
      img.style.setProperty('--d', rnd(3.6, 6.4).toFixed(2) + 's'); img.style.setProperty('--e', rnd(4.5, 8).toFixed(2) + 's')
      img.style.setProperty('--p', (-rnd(0, 6)).toFixed(2) + 's'); img.style.setProperty('--q', (-rnd(0, 8)).toFixed(2) + 's')
      n.classList.add('k-live', 'k-a-' + a, 'k-b-' + b)
      LIVE.push({ n: n, img: img, kind: kind, grp: grp, key: key, home: key, next: Date.now() + rnd(2500, 7000), react: !!n.getAttribute('data-react'), gone: 0, rc: n.getAttribute('data-rc').split(',').map(Number) })
    })
  }
  function swap (L, key, ms) {
    var s = srcOf(key, L.img.getAttribute('src')); if (W.AssetIndex && AssetIndex.path && !AssetIndex.path(key)) return false
    L.img.src = s; L.cur = key
    if (ms) setTimeout(function () { if (L.cur === key && !L.gone) { L.img.src = srcOf(L.home, L.img.getAttribute('src')); L.cur = L.home } }, ms)
    return true
  }
  function tick () {
    if (RM || D.body.getAttribute('data-scr') !== 'scr-play') return
    adopt()
    var st = W.__mojo && W.__mojo.state && W.__mojo.state(), now = Date.now(), c = cell()
    LIVE = LIVE.filter(function (L) { return L.n.isConnected })
    LIVE.forEach(function (L) {
      var near = st && Math.abs(L.rc[0] - st.position.r) + Math.abs(L.rc[1] - st.position.c) <= 2
      if (L.kind === 'bird') {
        if (near && !L.gone) { L.gone = now; L.n.style.transition = 'translate .9s cubic-bezier(.4,0,.8,.6), opacity .9s ease-in'; L.n.style.translate = (c * 3.2) + 'px ' + (-c * 2.4) + 'px'; L.n.style.opacity = 0 }
        else if (L.gone && now - L.gone > 6500 && !near) { L.gone = 0; L.n.style.transition = 'translate .8s ease-out, opacity .8s ease-out'; L.n.style.translate = '0 0'; L.n.style.opacity = '' }
        return
      }
      if (now < L.next) return
      L.next = now + rnd(5500, 10500)
      if (L.kind === 'deer') {
        // lift the head, step, graze again
        swap(L, 'animal/deer/stand', 1800); L.n.style.transition = 'translate 1.2s ease-in-out'
        var dx = (Math.random() < .5 ? -1 : 1) * c * .22; L.n.style.translate = dx + 'px 0'
        setTimeout(function () { L.n.style.translate = '0 0' }, 3200)
      } else if (!L.react) {
        var pool = POSES[L.grp]; if (pool && pool.length > 1) { var cur = L.key.split('/').pop(), alt = pool.filter(function (p) { return p !== cur }); swap(L, L.grp + '/' + alt[Math.floor(Math.random() * alt.length)], rnd(1300, 2300)) }
      }
    })
  }

  /* ── parallax fringe, cloud shadows, motes ───────────────────────────── */
  var FR = null, lastKey = ''
  function blades (n) {
    var h = ''
    for (var i = 0; i < n; i++) {
      var x = (i / n * 100 + rnd(-1.2, 1.2)).toFixed(1), ht = rnd(.26, .6).toFixed(2), tone = ['#5fae3b', '#4c9a30', '#76c24a', '#3d8528'][i % 4], dl = (-rnd(0, 4)).toFixed(2)
      h += '<i style="left:' + x + '%;--h:' + ht + ';--c:' + tone + ';--dl:' + dl + 's"></i>'
    }
    return h
  }
  function build (lv) {
    var wrap = $('board-wrap'), board = $('board'); if (!wrap || !board) return
    ;[].forEach.call(board.querySelectorAll('.k-fringe,.k-shade,.k-motes'), function (n) { n.remove() })
    var mood = ($('scr-play') && $('scr-play').getAttribute('data-mood')) || 'sun', dark = /night|rain|storm|dream/.test(mood)
    var terrain = ($('scr-play') && $('scr-play').getAttribute('data-terrain')) || 'meadow'
    if (terrain === 'meadow' || terrain === 'mountain' || terrain === 'logging' || terrain === 'gorge') {
      FR = el('div', 'k-fringe', blades(46) + '<img class="fl a" alt="" src="' + MA.src('nature/flower-pink') + '"><img class="fl b" alt="" src="' + MA.src('nature/sunflower') + '"><img class="fl c" alt="" src="' + MA.src('nature/sprout') + '">')
      board.appendChild(FR)
    } else FR = null
    if (!dark) {
      board.appendChild(el('div', 'k-shade', '<i></i><i class="s2"></i>'))
      board.appendChild(el('div', 'k-motes', '<i></i><i></i><i></i><i></i><i></i><i></i>'))
    }
  }
  // the fringe drifts against Linus: he goes right, the near grass slides left a little
  function drift () {
    if (RM || !FR || !FR.isConnected) return
    var m = $('mojo'), b = $('board'); if (!m || !b) return
    var mr = m.getBoundingClientRect(), br = b.getBoundingClientRect()
    var k = ((mr.left + mr.width / 2) - (br.left + br.width / 2)) / Math.max(1, br.width)
    FR.style.transform = 'translateX(' + (-k * 26).toFixed(1) + 'px)'
  }
  var hud0 = def.onHud
  def.onHud = function (c) {
    if (hud0) hud0(c)
    var key = c.lv.id + '/' + c.bi
    if (key !== lastKey || !D.querySelector('#board .k-fringe,#board .k-shade')) { lastKey = key; try { build(c.lv) } catch (e) {} }
  }
  if (!RM) { W.setInterval(tick, 350); W.setInterval(drift, 160) }
})(typeof window !== 'undefined' ? window : globalThis)
