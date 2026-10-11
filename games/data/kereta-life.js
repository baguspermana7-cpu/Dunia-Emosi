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
      LIVE.push({ n: n, img: img, kind: kind, grp: grp, key: key, home: key, next: Date.now() + rnd(2500, 7000), react: !!n.getAttribute('data-react'), alive: /animal\/|char\//.test(key), gone: 0, rc: n.getAttribute('data-rc').split(',').map(Number) })
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

  /* ── group 1 (owner 2026-10-11): look-around flips, voices + bubbles, tap reactions ────────────────────────── */
  var CSS1 = 'html[data-pack="kereta"] .dec.cast.k-live img{transform:translateY(-14%) scaleX(var(--fx,1));transition:transform .3s cubic-bezier(.23,1,.32,1)}' +
    '.k-say{position:absolute;left:50%;bottom:118%;translate:-50% 0;z-index:30;pointer-events:none;white-space:nowrap;background:#fff;color:#5a3a17;font:800 max(11px,calc(var(--cell)*.2))/1.1 system-ui,sans-serif;padding:3px 9px 4px;border-radius:12px;box-shadow:0 0 0 2px #e0a63a,0 3px 0 rgba(92,56,23,.3);animation:kSayIn .26s cubic-bezier(.23,1,.32,1) both}' +
    '.k-say::after{content:"";position:absolute;left:50%;top:100%;margin-left:-5px;border:5px solid transparent;border-top-color:#e0a63a;border-bottom:0}' +
    '.dec.cast .k-name.up~.k-say,.dec.cast:has(.k-name.up) .k-say{bottom:150%}' +
    '.k-pop{position:absolute;left:50%;top:30%;width:max(14px,calc(var(--cell)*.26));height:max(14px,calc(var(--cell)*.26));margin:-7px 0 0 -7px;pointer-events:none;z-index:29}' +
    '@keyframes kSayIn{from{opacity:0;scale:.6;translate:-50% 30%}to{opacity:1;scale:1;translate:-50% 0}}' +
    '@media(prefers-reduced-motion:reduce){.k-say,.k-pop{display:none}}'
  var st1 = D.createElement('style'); st1.textContent = CSS1; D.head.appendChild(st1)

  // sound: own tiny voices (the engine's SND is private); only when the sound toggle is on, never before a user gesture
  var AC = null
  function soundOn () {
    try { if (W.localStorage.getItem('dunia-emosi-sound') === 'off') return false } catch (e) {}
    return ['btn-sound', 'btn-sound2'].every(function (id) { var b = $(id); return !b || b.getAttribute('aria-pressed') !== 'false' })
  }
  function ac (gesture) {
    if (!soundOn()) return null
    try { if (!AC) { if (!gesture) return null; AC = new (W.AudioContext || W.webkitAudioContext)() } if (AC.state === 'suspended') { if (!gesture) return null; AC.resume() } } catch (e) { AC = null }
    return AC && AC.state !== 'closed' ? AC : null
  }
  function tone (c, f0, f1, d, v, type, delay) {
    try { var t = c.currentTime + (delay || 0), g = c.createGain(), o = c.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d)
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + 0.05) } catch (e) {}
  }
  function person (c, f, up) { tone(c, f, f * (up ? 1.3 : 1.15), .12, .05, 'triangle'); tone(c, f * 1.3, f * (up ? 1.0 : 1.05), .17, .05, 'triangle', .13) }
  var VOICES = [   // [art key, words, voice]
    [/animal\/bird/, ['Cuit!', 'Cit cit!'], function (c) { [0, .16, .4].forEach(function (t, i) { tone(c, 2600 + (i % 2) * 450, 3300 + (i % 2) * 300, .07, .035, 'sine', t) }) }],
    [/animal\/(vulture|hering|raven|crow)/, ['Kaak!', 'Kraak!'], function (c) { tone(c, 420, 200, .3, .035, 'sawtooth'); tone(c, 380, 150, .3, .03, 'sawtooth', .34) }],
    [/animal\/deer/, ['Mmh~', 'Nguik!'], function (c) { tone(c, 520, 430, .25, .05, 'sine'); tone(c, 640, 500, .2, .045, 'sine', .27) }],
    [/animal\/turtle/, ['Pelan...', 'Hmm~'], function (c) { tone(c, 170, 120, .32, .06, 'triangle') }],
    [/animal\/rabbit/, ['Hop!', 'Hop hop!'], function (c) { tone(c, 800, 1300, .08, .05, 'sine'); tone(c, 900, 1400, .08, .05, 'sine', .14) }],
    [/story-char\/henry/, ['Ayo!', 'Ayo, Linus!'], function (c) { person(c, 330, true) }],
    [/story-char\/baron/, ['Hmph!', 'Hmph!'], function (c) { tone(c, 140, 85, .28, .06, 'sawtooth') }],
    [/story-char\/carter/, ['Hei!', 'Hei, hati-hati!'], function (c) { person(c, 240, true) }],
    [/story-char\/james/, ['Hmm!', 'Hehe!'], function (c) { person(c, 200, false) }],
    [/story-char\/katrina|malivlak-char\/penyambut/, ['Oh!', 'Halo!'], function (c) { person(c, 470, true) }],
    [/story-char\/scarlet/, ['Halo!', 'Hai!'], function (c) { person(c, 520, true) }],
    [/train-char\/defeatist/, ['Uff, uff!', 'Aku pasti bisa!', 'Tuut!'], function (c) { tone(c, 150, 120, .12, .05, 'sawtooth'); tone(c, 150, 120, .12, .05, 'sawtooth', .2); tone(c, 880, 940, .3, .035, 'sine', .42) }],
    [/train-char\/silver/, ['Wuus!', 'Aku paling cepat!', 'Tiiit!'], function (c) { tone(c, 300, 1100, .35, .04, 'sine'); tone(c, 520, 520, .22, .04, 'square', .36) }],
    [/char\//, ['Halo!', 'Hai!', 'Hore!'], function (c) { person(c, 360, true) }]
  ]
  function voiceOf (L) { for (var i = 0; i < VOICES.length; i++) if (VOICES[i][0].test(L.key)) return VOICES[i]; return null }
  var BUB = null, lastSay = 0
  function say (L, gesture) {
    var v = voiceOf(L); if (!v || RM) return
    if (BUB) { BUB.n.style.zIndex = BUB.z; BUB.el.remove(); clearTimeout(BUB.t); BUB = null }   // never more than one at a time
    var b = el('b', 'k-say', v[1][Math.floor(Math.random() * v[1].length)]), z = L.n.style.zIndex
    L.n.appendChild(b); L.n.style.zIndex = 60
    BUB = { n: L.n, el: b, z: z, t: setTimeout(function () { if (BUB && BUB.el === b) { L.n.style.zIndex = z; b.remove(); BUB = null } }, 1700) }
    lastSay = Date.now()
    var c = ac(gesture); if (c) v[2](c)
  }
  // facing: scaleX(var(--fx)) on the sprite, a quick squash while it turns
  function look (L, left) { flipTo(L, (!!left === L.n.hasAttribute('data-flip')) ? 1 : -1) }   // sprites face right unless the pack flipped them
  function flipTo (L, fx) {
    if (L.fx === fx) return; L.fx = fx
    L.img.style.setProperty('--fx', fx)
    try { L.img.animate([{ scale: '1 1' }, { scale: '1.12 .86', offset: .4 }, { scale: '1 1' }], { duration: 320, easing: 'ease-out' }) } catch (e) {}
  }
  function pop (L) {
    var c = cell(), notes = L.kind === 'bird', cols = notes ? ['#6cb4ff', '#ffd23f', '#7be0a0'] : ['#ff6f91', '#ff9ec0', '#ffc2d6']
    for (var i = 0; i < 5; i++) {
      var p = el('i', 'k-pop'), col = cols[i % cols.length]
      p.innerHTML = notes ? '<svg viewBox="0 0 20 20"><circle cx="6" cy="15" r="4" fill="' + col + '"/><path d="M9.5 15V3l7 2.5V8L12 6.5" fill="none" stroke="' + col + '" stroke-width="2.2" stroke-linecap="round"/></svg>'
        : '<svg viewBox="0 0 20 20"><path d="M10 17S2 12 2 7a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 5-8 10-8 10z" fill="' + col + '"/></svg>'
      L.n.appendChild(p)
      var dx = (i - 2) * c * .2 + rnd(-6, 6), dy = -c * rnd(.7, 1.2)
      try { var a = p.animate([{ translate: '0 0', opacity: 0, scale: .4 }, { opacity: 1, scale: 1, offset: .2 }, { translate: dx + 'px ' + dy + 'px', opacity: 0, scale: .9 }], { duration: rnd(900, 1300), delay: i * 70, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' }); a.onfinish = function () { this.effect.target.remove() } } catch (e) { p.remove() }
    }
  }
  var TAPS = ['hop', 'twirl', 'wave']
  function react (L, gesture) {
    if (RM || L.gone || L.busy) return false
    L.busy = true; setTimeout(function () { L.busy = false }, 900)
    var pick = TAPS[L.tapN = ((L.tapN || 0) + 1) % TAPS.length], c = cell()
    if (pick === 'twirl' && L.kind !== 'deer') pick = 'hop'
    try {
      if (pick === 'hop') L.n.animate([{ translate: '0 0' }, { translate: '0 ' + (-c * .38) + 'px', offset: .35 }, { translate: '0 0', offset: .6 }, { translate: '0 ' + (-c * .16) + 'px', offset: .78 }, { translate: '0 0' }], { duration: 680, easing: 'ease-out' })
      else L.n.animate([{ rotate: 'y 0deg' }, { rotate: 'y 360deg' }], { duration: 700, easing: 'cubic-bezier(.4,0,.2,1)' })
    } catch (e) {}
    var pool = POSES[L.grp]; if (pool && pool.length > 1 && L.kind !== 'bird') { var alt = pool.filter(function (q) { return q !== L.key.split('/').pop() }); swap(L, L.grp + '/' + alt[Math.floor(Math.random() * alt.length)], 1400) }
    pop(L); say(L, gesture); return true
  }
  function tapAt (x, y) {
    var best = null, bd = 1e9
    LIVE.forEach(function (L) {
      if (!L.n.isConnected || L.gone || !L.alive) return
      var r = L.img.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height * .58, hw = r.width * .3, hh = r.height * .36
      if (Math.abs(x - cx) < hw && Math.abs(y - cy) < hh) { var d = Math.abs(x - cx) + Math.abs(y - cy); if (d < bd) { bd = d; best = L } }
    })
    return best ? react(best, true) : false
  }
  if (!RM) D.addEventListener('pointerdown', function (e) {
    if (D.body.getAttribute('data-scr') !== 'scr-play') return
    var b = $('board'); if (!b || !b.contains(e.target)) return   // palette, plan and buttons are outside the board: never touched
    tapAt(e.clientX, e.clientY)
  }, true)
  // every few seconds: look around (or at Linus when he is near), and now and then say something unprompted
  function life () {
    if (RM || D.body.getAttribute('data-scr') !== 'scr-play') return
    var s = W.__mojo && W.__mojo.state && W.__mojo.state(), now = Date.now(), cand = []
    LIVE.forEach(function (L) {
      if (!L.n.isConnected || L.gone || !L.alive) return
      var dx = s ? s.position.c - L.rc[1] : 0, nearL = s && Math.abs(L.rc[0] - s.position.r) + Math.abs(dx) <= 3
      if (nearL && dx !== 0) { look(L, dx < 0); return }
      if (!L.nl || now > L.nl) { L.nl = now + rnd(3800, 9000); if (Math.random() < .8) flipTo(L, -(L.fx || 1)) }
      if (voiceOf(L)) cand.push(L)
    })
    if (cand.length && now - lastSay > 11000 && Math.random() < .35 && ac(false)) say(cand[Math.floor(Math.random() * cand.length)], false)
  }
  W.KeretaLife = { live: function () { return LIVE }, tap: function (i) { var L = LIVE.filter(function (q) { return !q.gone && q.alive })[i || 0]; return L ? react(L, true) : false }, tapAt: tapAt }

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
  if (!RM) { W.setInterval(tick, 350); W.setInterval(drift, 160); W.setInterval(life, 1200) }
})(typeof window !== 'undefined' ? window : globalThis)
