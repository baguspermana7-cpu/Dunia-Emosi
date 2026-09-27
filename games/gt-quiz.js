/* ============================================================================
 * gt-quiz.js — window.GTQuiz. Garasi Tempur questions + the Monster Rush round.
 *
 * QUESTIONS (PRD v2 §6): one Easy-math question per attack, 4 big choices, no timer —
 * a right answer is +2 damage (and Nitro), a wrong one still attacks (never punished,
 * never "SALAH"). Two levels the parent picks: 'mudah' (sums to 10) and 'sedang' (to 20).
 * A question is { text, a, b, op, answer, choices[4] } — built from a seeded RNG so a
 * test can replay it.
 *
 * MONSTER RUSH (owner idea, PRD §15): at the end of a battle, BEFORE the final score, a
 * monster DROPS onto the battle arena itself — huge, in the middle — and wrecks the place
 * (tantrums shake the table and knock the trucks) while every player races to answer as
 * many questions as possible in 15 seconds. Each right answer = +10 bonus points and a shot
 * at the monster, which flinches and shrinks; 6+ hits knock it out, otherwise it leaps away.
 * Answer panels are docked at the bottom (player 2: the top, turned round, in portrait;
 * left/right in landscape). Against the computer the rival is a small chip answering at the
 * AI's pace. The round is pure UI; it reports { right:[p0,p1], asked:[p0,p1] } to its caller.
 * ==========================================================================*/
(function () {
  'use strict'
  var W = window
  var RUSH_MS = 15000, RUSH_POINTS = 10

  function rng (seed) {
    var s = seed | 0
    return function () {
      var t = (s = (s + 0x6D2B79F5) | 0)
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }
  function ri (r, lo, hi) { return lo + Math.floor(r() * (hi - lo + 1)) }

  // one question; `last` avoids asking the very same sum twice in a row
  function make (r, level, last) {
    var max = level === 'sedang' ? 20 : 10, q
    for (var tries = 0; tries < 12; tries++) {
      var plus = r() < 0.6, a, b
      if (plus) { a = ri(r, 1, max - 1); b = ri(r, 1, max - a) } else { a = ri(r, 2, max); b = ri(r, 1, a - 1) }
      q = { a: a, b: b, op: plus ? '+' : '−', answer: plus ? a + b : a - b }
      q.text = a + ' ' + q.op + ' ' + b + ' = ?'
      if (!last || last.text !== q.text) break
    }
    // distractors: near misses (±1, ±2, the other operation) — plausible, never negative
    var pool = [q.answer + 1, q.answer - 1, q.answer + 2, q.answer - 2, q.op === '+' ? Math.abs(q.a - q.b) : q.a + q.b, q.answer + 10 > max * 2 ? q.answer + 3 : q.answer + 10]
    var seen = {}; seen[q.answer] = 1
    var ch = [q.answer]
    for (var i = 0; ch.length < 4 && i < 40; i++) {
      var v = pool.length ? pool.splice(Math.floor(r() * pool.length), 1)[0] : ri(r, 0, max * 2)
      if (v >= 0 && !seen[v]) { seen[v] = 1; ch.push(v) }
    }
    for (var j = ch.length - 1; j > 0; j--) { var k = Math.floor(r() * (j + 1)); var t = ch[j]; ch[j] = ch[k]; ch[k] = t }
    q.choices = ch
    return q
  }

  /* ── Monster Rush ─────────────────────────────────────────────────────── */
  // opts: { host, scene, table, trucks:[el,el], monster:{key,name}, players:[{name,human}], level, seed,
  //         aiPace:[ms,acc], aiAvatar, lib(), sfx{right,wrong,tick,go}, onDone(res) }
  // The monster is laid out in px from the host box (not CSS %), so its drawn picture IS its
  // element box: ~70 % of the height in portrait / ~75 % in landscape, never wider than the
  // screen (or, in 2-player landscape, much wider than the gap between the two panels).
  var TANTRUM_FX = ['boom', 'fire-sparks', 'electric-a', 'smoke-cloud', 'poison-cloud', 'rocket-fire', 'sparks']
  var KO_HITS = 6, SHRINK = 0.03, SHRINK_MIN = 0.8     // beaten back, but never a "small picture" again

  function esc (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';' }) }

  function rush (opts) {
    var host = opts.host, lib = opts.lib, r = rng(opts.seed || Date.now())
    var FX = W.GTFx || null, VX = function () { return W.VFX || null }
    var two = opts.players[0].human && opts.players[1].human
    // COMBO: 3+ right in a row = every further right answer is worth double (and hits twice as hard)
    var res = { right: [0, 0], asked: [0, 0], points: [0, 0], best: [0, 0] }, streak = [0, 0]
    var reduced = FX ? FX.reduced() : !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches)
    var trucks = (opts.trucks || []).filter(Boolean)
    var mon = opts.monster || { key: 'gt-monster/robo-gorilla', name: 'Monster' }

    function panel (pi) {
      var P = opts.players[pi]
      if (!P.human) {                                     // vs computer: a compact rival chip
        return '<div class="rush-half rh-1 rh-ai" data-p="1"><img src="' + lib(opts.aiAvatar || 'gt/avatar-opponent') + '" alt="">' +
          '<div class="rush-ai-txt"><span class="rush-name">' + esc(P.name) + '</span><span id="rush-ai-t">sedang berpikir…</span></div>' +
          '<b class="rush-score fk" id="rush-s1">0</b></div>'
      }
      return '<div class="rush-half rh-' + pi + (pi === 1 ? ' flip' : '') + '" data-p="' + pi + '">' +
        '<div class="rush-head"><span class="rush-name">' + esc(P.name) + '</span><b class="rush-score fk" id="rush-s' + pi + '">0</b></div>' +
        '<div class="rush-qrow"><div class="rush-q fk" id="rush-q' + pi + '"></div><div class="rush-ch" id="rush-c' + pi + '"></div></div></div>'
    }
    host.innerHTML =
      '<div class="rush' + (two ? ' rush-two' : ' rush-one') + (reduced ? ' rush-rm' : '') + '">' +
        '<div class="rush-dim"></div><div class="rush-tint"></div>' +
        '<div class="rush-mbox"><div class="rush-breath"><div class="rush-act"><div class="rush-hit">' +
          '<img class="rush-mon" src="' + lib(mon.key) + '" alt="' + esc(mon.name) + '" draggable="false"></div></div></div></div>' +
        '<div class="rush-top">' + panel(1) + '</div>' +
        '<div class="rush-stage"><div class="rush-ring" aria-label="sisa waktu"><svg viewBox="0 0 100 100" aria-hidden="true">' +
          '<circle class="rr-bg" cx="50" cy="50" r="43"/><circle class="rr-fg" cx="50" cy="50" r="43" pathLength="100"/></svg>' +
          '<b class="fk" id="rush-sec">15</b></div></div>' +
        '<div class="rush-bot">' + panel(0) + '</div>' +
        '<div class="rush-banner"><div class="rush-title fk">MONSTER RUSH!</div>' +
          '<div class="rush-name-big fk">' + esc(mon.name) + ' mengamuk!</div>' +
          '<div class="rush-sub">Jawab sebanyak-banyaknya dalam 15 detik! Tiap jawaban benar +' + RUSH_POINTS + '</div>' +
          '<div class="rush-count fk" id="rush-count"></div></div>' +
      '</div>'
    var root = host.querySelector('.rush'), mbox = host.querySelector('.rush-mbox'), act = host.querySelector('.rush-act')
    var hitL = host.querySelector('.rush-hit'), img = host.querySelector('.rush-mon'), dim = host.querySelector('.rush-dim')
    var tint = host.querySelector('.rush-tint'), stage = host.querySelector('.rush-stage'), banner = host.querySelector('.rush-banner')
    var Q = [null, null], ended = false, done = false, timers = [], endTimers = [], loops = [], hits = 0

    function later (fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t }
    function laterEnd (fn, ms) { var t = setTimeout(fn, ms); endTimers.push(t); return t }
    function snd (k) { try { if (FX && FX.SND[k]) FX.SND[k]() } catch (e) {} }
    function cue (k) { try { opts.sfx[k]() } catch (e) {} }
    // fire-and-forget WAAPI (transform/opacity only); loops are kept so they can be cancelled
    function A (el, frames, o) {
      if (!el || !el.animate) return null
      try { var a = el.animate(frames, o); if (o.iterations === Infinity) loops.push(a); return a } catch (e) { return null }
    }
    function shake (el, px) { if (FX && el && !reduced) FX.shake(el, px) }
    function pan (px) { try { if (FX && !reduced) FX.pan(px) } catch (e) {} }
    function box (el) { var b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width, h: b.height, t: b.top, b: b.bottom, l: b.left } }
    function fxAt (x, y, name, size) { var V = VX(); if (V) try { V.dom(x, y, { fx: name, size: Math.round(size), blend: 'screen' }) } catch (e) {} }
    function pop (el) { if (!reduced && el) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop') } }

    /* layout: size + place the monster from the real host box */
    function layout () {
      if (done) return
      var H = host.clientHeight, Wd = host.clientWidth
      if (!H || !Wd) return
      var land = Wd > H, ar = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1.06
      var st = stage.getBoundingClientRect(), hb = host.getBoundingClientRect()
      // phones held upright are narrow: the monster may spill past both sides (owner: "monster di HP
      // dibesarkan saja") — the host clips it, a wrecking monster too big for the screen reads right
      var maxW = two && land ? Math.min(Wd * 0.96, st.width * 1.45) : (land ? Wd : Wd * 1.3)
      var h = H * (land ? 0.75 : 0.62), w = h * ar
      if (w > maxW) { w = maxW; h = w / ar }
      // centred on the free band between the panels, kept inside the screen
      var cy = (st.top - hb.top) + st.height / 2
      if (land && !two) cy = Math.min(cy, H * 0.5)
      var top = Math.max(H * 0.02, Math.min(H - h - H * 0.02, cy - h / 2))
      mbox.style.width = Math.round(w) + 'px'; mbox.style.height = Math.round(h) + 'px'
      mbox.style.left = Math.round((Wd - w) / 2) + 'px'; mbox.style.top = Math.round(top) + 'px'
    }
    img.addEventListener('load', layout)
    W.addEventListener('resize', layout)
    layout()

    function shrinkTo () {
      var s = Math.max(SHRINK_MIN, 1 - SHRINK * hits)
      mbox.style.transform = s < 1 ? 'scale(' + s.toFixed(3) + ')' : ''
    }
    function jolt () {
      trucks.forEach(function (t, i) {
        var d = (i ? 1 : -1) * (6 + Math.random() * 6), rot = (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 5)
        A(t, [{ transform: 'none' }, { transform: 'translate(' + d.toFixed(1) + 'px,-10px) rotate(' + rot.toFixed(1) + 'deg)', offset: 0.3 },
          { transform: 'translate(' + (-d / 3).toFixed(1) + 'px,2px) rotate(' + (-rot / 3).toFixed(1) + 'deg)', offset: 0.65 }, { transform: 'none' }],
        { duration: 520, easing: 'ease-out' })
      })
    }

    /* 1. entry: dark flash, shake, the monster DROPS to the centre, ground impact */
    function entry () {
      A(dim, [{ opacity: 0 }, { opacity: 0.95, offset: 0.18 }, { opacity: 0.55 }], { duration: reduced ? 400 : 900, fill: 'forwards', easing: 'ease-out' })
      if (reduced) {
        A(act, [{ opacity: 0 }, { opacity: 1 }], { duration: 450, fill: 'backwards', delay: 150 })
      } else {
        shake(opts.table, 10); pan(-36); snd('whoosh')
        A(act, [{ transform: 'translateY(-120vh) scale(.92)' }, { transform: 'translateY(0) scale(1)' }],
          { duration: 520, delay: 180, fill: 'backwards', easing: 'cubic-bezier(.55,0,1,.45)' })
        later(impact, 700)
      }
      later(function () { banner.classList.add('show') }, reduced ? 300 : 950)
    }
    function impact () {
      A(act, [{ transform: 'scale(1.14,.84)' }, { transform: 'scale(.96,1.05)', offset: 0.45 }, { transform: 'none' }], { duration: 420, easing: 'ease-out' })
      var m = box(img)
      fxAt(m.x, m.b - m.h * 0.08, 'boom', m.w * 0.9)
      fxAt(m.x, m.b - m.h * 0.05, 'smoke-cloud', m.w * 1.15)
      fxAt(m.x - m.w * 0.42, m.b - m.h * 0.04, 'smoke-puff', m.w * 0.5)
      fxAt(m.x + m.w * 0.42, m.b - m.h * 0.04, 'smoke-puff', m.w * 0.5)
      shake(opts.table, 18); shake(root, 8); snd('thud'); pan(0); jolt()
      A(tint, [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }], { duration: 700 })
    }

    /* 2. chaos: breathing (CSS), tantrum every ~2.5 s, subtle rumble */
    function tantrum () {
      if (ended) return
      A(tint, [{ opacity: 0 }, { opacity: reduced ? 0.6 : 1, offset: 0.3 }, { opacity: 0 }], { duration: 650 })
      if (!reduced) {
        A(act, [{ transform: 'none' }, { transform: 'scale(1.1) rotate(-3deg)', offset: 0.22 }, { transform: 'scale(1.13) rotate(3deg)', offset: 0.45 },
          { transform: 'scale(1.06) rotate(-2deg)', offset: 0.7 }, { transform: 'none' }], { duration: 640, easing: 'ease-out' })
        shake(opts.table, 9); snd('rev'); jolt()
        var m = box(img), side = Math.random() < 0.5 ? -1 : 1
        fxAt(m.x + side * m.w * (0.25 + Math.random() * 0.2), m.t + m.h * (0.25 + Math.random() * 0.45),
          TANTRUM_FX[Math.floor(Math.random() * TANTRUM_FX.length)], Math.max(90, m.w * 0.45))
      }
      later(tantrum, 2300 + Math.random() * 500)
    }
    function rumble () {
      if (reduced || !opts.scene) return
      A(opts.scene, [{ transform: 'translate(0,0)' }, { transform: 'translate(1.5px,-1px)' }, { transform: 'translate(-1px,1.5px)' }, { transform: 'translate(0,0)' }],
        { duration: 240, iterations: Infinity })
    }

    /* 3. questions */
    function ask (pi) {
      if (ended) return
      var q = Q[pi] = make(r, opts.level, Q[pi])
      var qel = host.querySelector('#rush-q' + pi), cel = host.querySelector('#rush-c' + pi)
      qel.textContent = q.text
      cel.innerHTML = q.choices.map(function (v) { return '<button class="rush-b fk" type="button" data-v="' + v + '">' + v + '</button>' }).join('')
      pop(qel)
    }
    function score (pi, ok, fromEl) {
      res.asked[pi]++
      var s = host.querySelector('#rush-s' + pi), mult = 1
      if (ok) { res.right[pi]++; streak[pi]++; res.best[pi] = Math.max(res.best[pi], streak[pi]); mult = streak[pi] >= 3 ? 2 : 1; res.points[pi] += RUSH_POINTS * mult }
      else streak[pi] = 0
      s.textContent = res.points[pi]
      if (ok) {
        pop(s); hitMonster(pi, fromEl || s, mult)
        if (streak[pi] === 3 && FX) { var sb = box(s); FX.floatText(sb.x, sb.y - 30, 'COMBO x2!', 'super') }
      }
    }
    // 4. a right answer: projectile -> the monster flinches, "+10", it shrinks a little
    function hitMonster (pi, fromEl, mult) {
      mult = mult || 1; hits += mult
      var a = box(fromEl), m = box(img)
      var to = { x: m.x + m.w * (Math.random() * 0.3 - 0.15), y: m.t + m.h * (0.3 + Math.random() * 0.25) }
      var land = function () {
        if (done) return
        A(hitL, [{ transform: 'none' }, { transform: 'translate(' + (pi ? -10 : 10) + 'px,-6px) rotate(' + (pi ? -5 : 5) + 'deg) scale(.92)', offset: 0.3 }, { transform: 'none' }],
          { duration: 300, easing: 'ease-out' })
        if (FX) FX.floatText(to.x, to.y, '+' + RUSH_POINTS * mult + (mult > 1 ? ' COMBO' : ''), 'rush-plus')
        shrinkTo()
      }
      var V = VX()
      if (V && !reduced) {
        try { V.domProjectile({ x: a.x, y: a.y }, to, { fx: pi ? 'electric-a' : 'rocket-fire', size: 76, duration: 300, onHit: land }) } catch (e) { land() }
      } else { fxAt(to.x, to.y, 'pop', 110); land() }
    }
    host.addEventListener('pointerdown', function (e) {
      var b = e.target.closest && e.target.closest('.rush-b'); if (!b || ended || b.disabled) return
      var pi = +b.closest('.rush-half').getAttribute('data-p'), q = Q[pi]
      if (!q) return
      var ok = +b.getAttribute('data-v') === q.answer
      b.classList.add(ok ? 'ok' : 'no')
      host.querySelectorAll('#rush-c' + pi + ' .rush-b').forEach(function (x) { x.disabled = true })
      cue(ok ? 'right' : 'wrong')
      score(pi, ok, b)
      later(function () { ask(pi) }, ok ? 180 : 420)       // a wrong answer costs a little time, nothing else
    })
    function aiLoop () {
      if (ended) return
      var pace = opts.aiPace || [3200, 0.7]
      later(function () {
        if (ended) return
        var ok = r() < pace[1]
        score(1, ok, host.querySelector('.rh-ai img'))
        var t = host.querySelector('#rush-ai-t'); if (t) t.textContent = ok ? 'benar! +' + RUSH_POINTS : 'meleset…'
        aiLoop()
      }, pace[0] * (0.8 + r() * 0.4))
    }

    // intro, then 3-2-1, then 15 s
    var n = 3, cnt = host.querySelector('#rush-count')
    cue('go')
    entry()
    function countdown () {
      if (n <= 0) return start()
      cnt.textContent = n; pop(cnt)
      cue('tick')
      n--; later(countdown, 800)
    }
    later(countdown, reduced ? 700 : 1500)
    function start () {
      banner.classList.remove('show')
      root.classList.add('play')
      layout()
      ;[0, 1].forEach(function (pi) { if (opts.players[pi].human) ask(pi) })
      if (!opts.players[1].human) aiLoop()
      rumble()
      later(tantrum, 1400)
      var t0 = Date.now(), ring = host.querySelector('.rr-fg'), sec = host.querySelector('#rush-sec'), lastS = 15
      ;(function tick () {
        if (ended) return
        var left = Math.max(0, RUSH_MS - (Date.now() - t0)), s = Math.ceil(left / 1000)
        // stepped from the 100 ms tick, not a CSS transition: reduced-motion CSS zeroes transitions
        ring.style.strokeDashoffset = (100 - left / RUSH_MS * 100).toFixed(1)
        if (s !== lastS) {
          lastS = s; sec.textContent = s
          if (s <= 3 && s > 0) { cue('tick'); root.classList.add('low'); pop(sec) }
        }
        if (left <= 0) return stop()
        later(tick, 100)
      })()
    }

    /* 5. time up: KO (enough hits) or the monster leaps away; then who answered most */
    function stop () {
      if (ended) return
      ended = true; timers.forEach(clearTimeout); timers = []
      loops.forEach(function (a) { try { a.cancel() } catch (e) {} }); loops = []
      host.querySelectorAll('.rush-b').forEach(function (x) { x.disabled = true })
      root.classList.add('over'); banner.classList.remove('show')
      var ko = res.right[0] + res.right[1] >= KO_HITS
      var msg = document.createElement('div'); msg.className = 'rush-end fk'
      msg.innerHTML = 'Waktu habis!<small>' + (ko ? mon.name + ' KO! Kalian hebat!' : mon.name + ' kabur!') + '</small>'
      root.appendChild(msg)
      laterEnd(function () { ko ? knockOut() : flee() }, 350)
      laterEnd(function () {
        var win = res.right[0] === res.right[1] ? -1 : (res.right[0] > res.right[1] ? 0 : 1)
        msg.innerHTML = (win < 0 ? 'Seri!' : esc(opts.players[win].name)) + '<small>' +
          (win < 0 ? 'Kalian sama cepat — ' + res.right[0] + ' benar!' : 'paling banyak menjawab — ' + res.right[win] + ' benar!') + '</small>'
        pop(msg)
      }, 1500)
      laterEnd(function () { finish() }, 3000)
    }
    function knockOut () {
      var m = box(img)
      snd('ko'); shake(opts.table, 20); shake(root, 10)
      fxAt(m.x, m.y, 'boom', m.w * 1.3); fxAt(m.x, m.b - m.h * 0.1, 'smoke-cloud', m.w * 1.2)
      if (FX) FX.floatText(m.x, m.y - m.h * 0.2, 'KO!', 'ko')
      A(act, reduced ? [{ opacity: 1 }, { opacity: 0 }]
        : [{ transform: 'none', opacity: 1 }, { transform: 'translateY(-4%) rotate(-6deg) scale(1.05)', opacity: 1, offset: 0.25 },
          { transform: 'translateY(30%) rotate(20deg) scale(.8)', opacity: 0 }], { duration: 900, easing: 'ease-in', fill: 'forwards' })
    }
    function flee () {
      var m = box(img)
      if (reduced) { A(act, [{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'forwards' }); return }
      snd('rev'); fxAt(m.x, m.b - m.h * 0.05, 'smoke-cloud', m.w)
      A(act, [{ transform: 'none' }, { transform: 'scale(1.14) rotate(3deg)', offset: 0.25 }, { transform: 'translateY(6%) scale(1.06,.88)', offset: 0.45 },
        { transform: 'translateY(-140vh) scale(.7)' }], { duration: 1000, easing: 'cubic-bezier(.5,0,.9,.5)', fill: 'forwards' })
      laterEnd(function () { snd('whoosh') }, 450)
    }
    function finish () {
      if (done) return
      done = true
      endTimers.forEach(clearTimeout); endTimers = []
      W.removeEventListener('resize', layout)
      pan(0)
      opts.onDone(res)
    }
    return {
      stop: stop, result: function () { return res },
      _force: function (a, b) { res.right = [a, b]; stop() },
      _hits: function () { return hits }
    }
  }

  W.GTQuiz = { make: make, rng: rng, rush: rush, RUSH_MS: RUSH_MS, RUSH_POINTS: RUSH_POINTS }
})()
