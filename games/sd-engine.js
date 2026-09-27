/* ============================================================================
 * sd-engine.js — window.SDEngine. Plays ONE G28 story card (PRD §4, §10, §11):
 *   Establish → Narrate → Demonstrate (beats) → Ask → Teach → Continue.
 *
 * Feedback state machine (§11), never a trap:
 *   wrong #1 → "Ayo lihat lagi." + Hint 1 (halo on the clue in the scene)
 *   wrong #2 → Hint 2 (strategy text, the key story sentence underlined, one
 *              wrong choice dimmed)
 *   wrong #3 → final scaffold: the answer is shown and explained → Lanjut
 *   right    → check on the chosen answer, "Hebat!" + the explanation, a star
 *              token flies to the progress dots → Lanjut
 * No red flash, no shake, no buzzer, no "salah". Replaying the story never
 * resets the answer; retrying never replays the story.
 *
 * Motion (§10): transforms/opacity only; character enter = 250 ms fade + rise,
 * story actions 500–1200 ms, question rises 12 px over 220 ms, answers stagger
 * 40 ms, press 0.97. Reduced Motion: travel → instant, same meaning.
 *
 *   SDEngine.play(card, env) -> Promise<{ correct:bool, attempts, hints, helped }>
 *   env: { root, voiceOn(), sfx(name), say(key)->Promise, clipKey(card,part),
 *          reduced(), onToken(el) }
 * ==========================================================================*/
(function () {
  'use strict'
  var W = window
  var $ = function (id) { return document.getElementById(id) }
  var BASE = (function () { try { return location.pathname.indexOf('/Dunia-Emosi/') === 0 ? '/Dunia-Emosi/' : '/' } catch (e) { return '/' } })()

  /* ── sprites ─────────────────────────────────────────────────────────── */
  function src (s) {
    if (s.indexOf('g27:') === 0) return BASE + 'assets/spelling/prop/' + s.slice(4) + '.webp'
    if (s.indexOf('db:') === 0) { var p = s.slice(3).split('/'); return BASE + 'assets/db/' + p[0] + '/' + ('00' + p[1]).slice(-3) + '.webp' }
    return (W.AssetIndex && AssetIndex.path(s)) || (BASE + 'assets/db/lib/' + s + '.webp')
  }
  function shapeSVG (spec) {
    var p = spec.split(':'), kind = p[1], col = p[2] || '#1E88E5'
    if (kind === 'question') return '<svg viewBox="0 0 100 100"><rect x="6" y="6" width="88" height="88" rx="22" fill="#fff" stroke="#C9B48E" stroke-width="6" stroke-dasharray="10 8"/><text x="50" y="70" font-size="56" text-anchor="middle" font-family="Fredoka One,system-ui" fill="#8A6A1E">?</text></svg>'
    if (kind === 'bar') { var f = parseFloat(col) || 1; return '<svg viewBox="0 0 200 40" preserveAspectRatio="xMinYMid meet"><rect x="2" y="10" width="' + (196 * f) + '" height="20" rx="10" fill="#8D6E63" stroke="#5D4037" stroke-width="3"/></svg>' }
    var body = kind === 'circle' ? '<circle cx="50" cy="50" r="42"/>'
      : kind === 'triangle' ? '<polygon points="50,8 94,90 6,90"/>'
      : kind === 'square' ? '<rect x="10" y="10" width="80" height="80" rx="6"/>'
      : '<polygon points="50,6 61,38 95,38 67,58 78,92 50,72 22,92 33,58 5,38 39,38"/>'
    return '<svg viewBox="0 0 100 100"><g fill="' + col + '" stroke="rgba(0,0,0,.25)" stroke-width="4">' + body + '</g></svg>'
  }
  function pic (s, n, clip) {
    var one
    if (s.indexOf('shape:') === 0) one = shapeSVG(s)
    else if (s.indexOf('text:') === 0) one = '<div class="txt-el" style="font-size:100%">' + s.slice(5) + '</div>'
    else one = '<img src="' + src(s) + '" alt="" draggable="false"' + (clip === 'right' ? ' style="clip-path:inset(0 0 0 50%)"' : '') + '>'
    var out = ''
    for (var i = 0; i < (n || 1); i++) out += one
    return out
  }

  /* ── stage ───────────────────────────────────────────────────────────── */
  var S = null        // current card run state
  function el (id) { return S && S.els[id] }
  function wait (ms) { return new Promise(function (r) { setTimeout(r, S && S.env.reduced() ? Math.min(ms, 120) : ms) }) }
  function frame () { return new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r) }) }) }

  function showEl (b) {
    var d = document.createElement('div')
    d.className = 'el' + (b.shadow ? ' shadow' : '') + (b.clip === 'left' ? ' clipL' : '')
    d.style.left = b.x + '%'; d.style.top = b.y + '%'; d.style.height = b.h + '%'
    var n = b.n || 1
    d.style.width = (b.s.indexOf('shape:bar') === 0 ? 40 : (b.h * 0.9 * n * (S.stageH / S.stageW) * (n > 1 ? 0.9 : 1.1))) + '%'
    if (b.s.indexOf('text:') === 0) d.style.fontSize = (S.stageH * b.h / 100 * 0.9) + 'px'
    d.innerHTML = '<div class="in">' + pic(b.s, n) + '</div>'
    if (b.behind) d.style.zIndex = 0; else d.style.zIndex = 2
    if (/^sd\/|^g27:(truck|digger)/.test(b.s)) d.classList.add('idle')
    if (b.s.indexOf('shape:') === 0 || b.s.indexOf('text:') === 0) d.classList.add('tile')   // legible on busy scenery
    S.layer.appendChild(d)
    S.els[b.id] = d
    var from = b.from || 'fade'
    if (S.env.reduced() || from === 'none') return Promise.resolve()
    var t0 = from === 'left' ? 'translate(-140%,-50%)' : from === 'right' ? 'translate(40%,-50%)' : from === 'up' ? 'translate(-50%,-50%) translateY(14px)' : 'translate(-50%,-50%) translateY(8px)'
    d.style.opacity = '0'; d.style.transform = t0
    return frame().then(function () {
      d.style.transition = 'opacity .25s cubic-bezier(.23,1,.32,1), transform ' + (from === 'left' || from === 'right' ? '.6s' : '.25s') + ' cubic-bezier(.23,1,.32,1)'
      d.style.opacity = '1'; d.style.transform = 'translate(-50%,-50%)'
      return wait(from === 'left' || from === 'right' ? 520 : 260)
    })
  }
  function moveEl (b) {
    // travel on TRANSFORM (compositor only), then commit left/top once it lands —
    // animating left/top re-laid-out the stage every frame
    var d = el(b.id); if (!d) return Promise.resolve()
    var ms = S.env.reduced() ? 0 : (b.ms || 700)
    var dx = (b.x - parseFloat(d.style.left)) / 100 * S.stageW, dy = (b.y - parseFloat(d.style.top)) / 100 * S.stageH
    if (!ms) { d.style.transition = 'none'; d.style.left = b.x + '%'; d.style.top = b.y + '%'; return Promise.resolve() }
    d.style.transition = 'transform ' + ms + 'ms cubic-bezier(.77,0,.175,1)'
    d.style.transform = 'translate(-50%,-50%) translate(' + dx + 'px,' + dy + 'px)'
    return wait(ms + 30).then(function () {
      d.style.transition = 'none'
      d.style.left = b.x + '%'; d.style.top = b.y + '%'; d.style.transform = 'translate(-50%,-50%)'
      void d.offsetWidth
    })
  }
  function anim (d, kf, ms) {
    if (!d || S.env.reduced() || !d.animate) return Promise.resolve()
    return d.animate(kf, { duration: ms, easing: 'ease-in-out' }).finished.catch(function () {})
  }
  var T = 'translate(-50%,-50%)'
  function beat (b) {
    switch (b.t) {
      case 'show': return showEl(b)
      case 'move': return moveEl(b)
      case 'hide': { var d = el(b.id); if (d) { d.style.transition = 'opacity .25s'; d.style.opacity = '0' } return wait(260) }
      case 'hop': return anim(el(b.id), [{ transform: T }, { transform: 'translate(-50%,-62%) scaleY(1.03)' }, { transform: 'translate(-50%,-50%) scaleY(.96)' }, { transform: T }], 420)
      case 'sway': return anim(el(b.id), [{ transform: T }, { transform: T + ' rotate(-6deg)' }, { transform: T + ' rotate(5deg)' }, { transform: T }], 900)
      case 'tilt': { var t = el(b.id); var p = anim(t, [{ transform: T }, { transform: T + ' rotate(8deg)' }], 600); if (t) t.style.transform = T + ' rotate(8deg)'; return p }
      case 'settle': return anim(el(b.id), [{ transform: T }, { transform: 'translate(-50%,-47%)' }, { transform: T }], 140)
      case 'melt': { var m = el(b.id); var q = anim(m, [{ transform: T }, { transform: 'translate(-50%,-38%) scaleY(.55) scaleX(1.25)' }], 1100); if (m) m.style.transform = 'translate(-50%,-38%) scaleY(.55) scaleX(1.25)'; return q }
      case 'cover': { var c = el(b.id); if (c) { var k = document.createElement('div'); k.className = 'cover'; c.appendChild(k); c.querySelector('.in').style.visibility = 'hidden' } return wait(380) }
      case 'wait': return wait(b.ms || 600)
      case 'say': return sayLine(b.i)
      case 'rain': fx('drop', 36); return wait(200)
      case 'snow': fx('flake', 28); return wait(200)
      case 'smoke': smoke(); return wait(300)
      case 'paths': paths(b); return wait(300)
    }
    return Promise.resolve()
  }
  function fx (cls, n) {
    if (S.env.reduced()) return
    var box = $('fx')
    for (var i = 0; i < n; i++) {
      var d = document.createElement('i'); d.className = cls
      d.style.left = (Math.random() * 100) + '%'; d.style.animationDelay = (-Math.random() * 3) + 's'
      box.appendChild(d)
    }
  }
  function smoke () {
    var box = $('fx')
    for (var i = 0; i < 3; i++) { var d = document.createElement('i'); d.className = 'puff'; d.style.left = (62 + i * 8) + '%'; d.style.top = '52%'; d.style.animationDelay = (i * 0.6) + 's'; box.appendChild(d) }
  }
  function paths (b) {
    for (var i = 1; i <= b.n; i++) {
      var d = document.createElement('div'); d.className = 'path'; d.id = 'path' + i
      d.style.top = (20 + (i - 1) * 25) + '%'
      d.innerHTML = '<b>' + i + '</b>' + (b.blocked.indexOf(i) >= 0 ? '<img src="' + BASE + 'assets/spelling/prop/barrier.webp" alt="">' : '')
      S.layer.appendChild(d); S.els['path' + i] = d
    }
  }

  /* ── story text + narration ──────────────────────────────────────────── */
  function renderStory (card) {
    $('story-t').innerHTML = card.story.map(function (s, i) { return '<span class="s" data-i="' + i + '">' + esc(s) + '</span> ' }).join('')
  }
  function esc (t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;') }
  function sayLine (i) {
    var sp = $('story-t').querySelector('[data-i="' + i + '"]')
    $('story-t').querySelectorAll('.s').forEach(function (x) { x.classList.remove('now') })
    if (sp) { sp.classList.add('on', 'now'); sp.scrollIntoView({ block: 'nearest' }) }
    var text = S.card.story[i] || ''
    // reading time floor keeps the pace calm even with the sound off (volume zero)
    var floor = Math.min(3200, 700 + text.length * 32)
    var t0 = Date.now()
    return S.env.say(S.env.clipKey(S.card, 's' + i)).then(function () {
      var left = floor - (Date.now() - t0)
      return left > 0 ? wait(left) : null
    })
  }
  function playStory (fromScratch) {
    var card = S.card, my = ++S.storyRun
    if (fromScratch) {
      S.layer.innerHTML = ''; $('fx').innerHTML = ''; S.els = {}
      renderStory(card)
    }
    var i = 0
    return (function next () {
      if (my !== S.storyRun || !S.alive) return Promise.resolve()
      if (i >= card.beats.length) return Promise.resolve()
      return beat(card.beats[i++]).then(next)
    })()
  }

  /* ── answers ─────────────────────────────────────────────────────────── */
  function optHTML (o, i, big) {
    var inner = ''
    if (o.sw) inner += '<span class="sw" style="background:' + o.sw + '"></span>'
    if (o.s) inner += '<span class="pic' + (o.n > 1 ? ' n' : '') + '">' + pic(o.s, o.n, o.clip) + '</span>'
    inner += '<span class="t">' + esc(o.l) + '</span>'
    return '<button class="opt' + (big || o.big ? ' big' : '') + '" type="button" data-i="' + i + '" aria-label="' + esc(o.l) + '">' + inner + '<span class="mark">✓</span></button>'
  }
  function cols (n) { return n === 4 ? 'repeat(2,minmax(0,1fr))' : n === 2 ? 'repeat(2,minmax(0,1fr))' : 'repeat(' + Math.min(3, n) + ',minmax(0,1fr))' }
  function stagger () {
    var os = $('answers').querySelectorAll('.opt')
    os.forEach(function (o, k) { setTimeout(function () { o.classList.add('in') }, S.env.reduced() ? 0 : k * 40) })
  }

  var A = {}                                        // archetype renderers
  function grid () {                               // options only; each archetype binds its OWN handler
    var c = S.card
    $('answers').innerHTML = '<div class="grid' + (c.options.length === 3 ? ' g3' : c.options.length === 4 ? ' g4' : '') + (c.hideLabels ? ' lbl-hide' : '') + '" style="grid-template-columns:' + cols(c.options.length) + '">' +
      c.options.map(function (o, i) { return optHTML(o, i, c.big) }).join('') + '</div>'
  }
  A.choice = A.image = function () {
    grid()
    on('.opt', function (b) { select([+b.dataset.i]) })
  }
  A.multi = function () {
    grid()
    S.sel = []
    $('answers').querySelectorAll('.opt').forEach(function (b) {
      b.addEventListener('click', function () {
        if (S.locked) return
        var i = +b.dataset.i, k = S.sel.indexOf(i)
        if (k >= 0) S.sel.splice(k, 1); else S.sel.push(i)
        b.classList.toggle('sel', k < 0); b.setAttribute('aria-pressed', k < 0)
        S.env.sfx('tap'); ready(S.sel.length > 0)
      })
    })
  }
  A.sequence = function () {
    grid()
    S.sel = []
    $('answers').querySelectorAll('.opt').forEach(function (b) {
      b.addEventListener('click', function () {
        if (S.locked) return
        var i = +b.dataset.i, k = S.sel.indexOf(i)
        if (k >= 0) S.sel = S.sel.slice(0, k)          // tapping a numbered card undoes it and after
        else S.sel.push(i)
        S.env.sfx('tap'); paintSeq(); ready(S.sel.length === S.card.options.length)
      })
    })
  }
  function paintSeq () {
    $('answers').querySelectorAll('.opt').forEach(function (b) {
      var k = S.sel.indexOf(+b.dataset.i)
      b.classList.toggle('num', k >= 0); b.classList.toggle('sel', k >= 0)
      b.querySelector('.mark').textContent = k >= 0 ? String(k + 1) : '✓'
    })
  }
  A.match = function () {
    var c = S.card
    S.pairs = {}; S.pickL = null
    $('answers').innerHTML = '<div class="match">' + c.left.map(function (o, i) {
      return optHTML(o, 'L' + i) + optHTML(c.right[i], 'R' + i)
    }).join('') + '</div>'
    $('answers').querySelectorAll('.opt').forEach(function (b) {
      b.addEventListener('click', function () {
        if (S.locked) return
        var id = b.dataset.i, side = id[0], i = +id.slice(1)
        if (side === 'L') { S.pickL = i; clearPick(); b.classList.add('sel'); S.env.sfx('tap'); return }
        if (S.pickL === null) return
        for (var k in S.pairs) if (S.pairs[k] === i) delete S.pairs[k]
        S.pairs[S.pickL] = i; S.pickL = null; S.env.sfx('tap'); paintPairs()
        ready(Object.keys(S.pairs).length === c.left.length)
      })
    })
  }
  function clearPick () { $('answers').querySelectorAll('[data-i^="L"]').forEach(function (b) { if (S.pairs[+b.dataset.i.slice(1)] === undefined) b.classList.remove('sel') }) }
  function paintPairs () {
    var n = 1
    $('answers').querySelectorAll('.opt').forEach(function (b) { b.classList.remove('sel', 'num'); b.querySelector('.mark').textContent = '✓' })
    Object.keys(S.pairs).sort().forEach(function (l) {
      var L = $('answers').querySelector('[data-i="L' + l + '"]'), R = $('answers').querySelector('[data-i="R' + S.pairs[l] + '"]')
      ;[L, R].forEach(function (x) { x.classList.add('num', 'sel'); x.querySelector('.mark').textContent = String(n) })
      n++
    })
  }
  A.find = function () {
    $('answers').innerHTML = '<p style="margin:0;font-size:17px;color:var(--ink2);text-align:center">' + ICON.hand + 'Ketuk langsung di gambar cerita</p>'
    S.card.targets.forEach(function (id) {
      var d = el(id); if (!d) return
      d.classList.add('target'); d.setAttribute('role', 'button'); d.setAttribute('aria-label', id); d.tabIndex = 0
      d.addEventListener('click', function () {
        if (S.locked) return
        S.card.targets.forEach(function (x) { var e = el(x); if (e) e.classList.remove('sel') })
        d.classList.add('sel'); S.sel = id; S.env.sfx('tap'); ready(true)
      })
    })
  }
  A.count = function () {
    S.num = ''
    var keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(function (n) { return '<button class="opt in" type="button" data-n="' + n + '">' + n + '</button>' }).join('')
    $('answers').innerHTML = '<div class="pad"><div id="count-show" aria-live="polite">?</div>' + keys + '</div>'
    $('answers').querySelectorAll('[data-n]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (S.locked) return
        S.num = (S.num.length >= 2 ? '' : S.num) + b.dataset.n
        if (S.num.length === 2 && S.num[0] === '0') S.num = S.num[1]
        $('count-show').textContent = S.num; S.env.sfx('tap'); ready(true)
      })
    })
  }
  A.drag = function () {
    var c = S.card
    S.inBasket = []
    $('answers').innerHTML = '<div class="drag-zone"><div class="basket" id="basket" role="button" aria-label="' + esc(c.target.l) + '"><img src="' + src(c.target.s) + '" alt=""><div class="inb" id="inb"></div></div>' +
      '<div class="tray" id="tray">' + c.options.map(function (o, i) { return optHTML(o, i) }).join('') + '</div></div>'
    var basket = $('basket'), picked = null
    function put (i) {
      if (S.inBasket.indexOf(i) >= 0) return
      S.inBasket.push(i)
      var b = $('tray').querySelector('[data-i="' + i + '"]'); b.classList.add('gone')
      $('inb').insertAdjacentHTML('beforeend', '<img src="' + src(c.options[i].s) + '" alt="" data-i="' + i + '">')
      S.env.sfx('drop'); ready(true)
    }
    function takeOut (i) {
      S.inBasket = S.inBasket.filter(function (x) { return x !== i })
      var im = $('inb').querySelector('[data-i="' + i + '"]'); if (im) im.remove()
      $('tray').querySelector('[data-i="' + i + '"]').classList.remove('gone'); ready(S.inBasket.length > 0)
    }
    S.takeOut = takeOut
    // tapping a fruit IN the basket takes it out — unless one is picked up: then the tap
    // means "put it here" (dropping a banana on the apple used to knock the apple out)
    $('inb').addEventListener('click', function (e) {
      if (picked !== null || S.locked) return
      e.stopPropagation()
      var i = e.target.dataset && e.target.dataset.i; if (i !== undefined) takeOut(+i)
    })
    // tap-then-tap (accessible) AND drag (pointer)
    basket.addEventListener('click', function () { if (picked !== null && !S.locked) { put(picked); picked = null } })
    $('tray').querySelectorAll('.opt').forEach(function (b) {
      var i = +b.dataset.i, sx, sy, moved = false
      b.addEventListener('pointerdown', function (e) {
        if (S.locked) return
        sx = e.clientX; sy = e.clientY; moved = false
        b.setPointerCapture(e.pointerId); b.classList.add('lift')
      })
      b.addEventListener('pointermove', function (e) {
        if (!b.classList.contains('lift')) return
        var dx = e.clientX - sx, dy = e.clientY - sy
        if (Math.abs(dx) + Math.abs(dy) > 8) moved = true
        b.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(1.04)'
        var r = basket.getBoundingClientRect()
        basket.classList.toggle('over', e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom)
      })
      b.addEventListener('pointerup', function (e) {
        if (!b.classList.contains('lift')) return
        b.classList.remove('lift')
        var r = basket.getBoundingClientRect(), inside = e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom
        basket.classList.remove('over')
        b.style.transition = 'transform ' + (inside ? '.2s' : '.28s') + ' ease-out'; b.style.transform = ''
        setTimeout(function () { b.style.transition = '' }, 300)
        if (moved && inside) put(i)
        else if (!moved) { picked = i; $('tray').querySelectorAll('.opt').forEach(function (x) { x.classList.toggle('sel', x === b) }); S.env.sfx('tap') }
      })
    })
  }
  function on (sel, fn) { $('answers').querySelectorAll(sel).forEach(function (b) { b.addEventListener('click', function () { if (!S.locked) fn(b) }) }) }
  function select (arr) {
    S.sel = arr
    $('answers').querySelectorAll('.opt').forEach(function (b) { b.classList.toggle('sel', arr.indexOf(+b.dataset.i) >= 0) })
    S.env.sfx('tap'); ready(true)
  }
  function ready (ok) { $('btn-check').disabled = !ok }

  /* ── judging ─────────────────────────────────────────────────────────── */
  function isRight () {
    var c = S.card, a = c.answer
    switch (c.archetype) {
      case 'choice': case 'image': return S.sel && S.sel[0] === a
      case 'multi': return S.sel.length === a.length && a.every(function (i) { return S.sel.indexOf(i) >= 0 })
      case 'sequence': return S.sel.join(',') === a.join(',')
      case 'match': return a.every(function (r, l) { return S.pairs[l] === r })
      case 'find': return S.sel === a
      case 'count': return parseInt(S.num, 10) === a
      case 'drag': return S.inBasket.length === a.length && a.every(function (i) { return S.inBasket.indexOf(i) >= 0 })
    }
    return false
  }
  function showAnswer () {                          // final scaffold / after right: show the truth
    var c = S.card, a = c.answer
    var mark = function (i) { var b = $('answers').querySelector('[data-i="' + i + '"]'); if (b) { b.classList.add('good'); b.classList.remove('dim') } }
    if (c.archetype === 'find') { var d = el(a); if (d) { d.classList.remove('sel'); d.classList.add('right') } return }
    if (c.archetype === 'count') { $('count-show').textContent = String(a); return }
    if (c.archetype === 'multi') { $('answers').querySelectorAll('.opt').forEach(function (b) { b.classList.remove('sel') }); a.forEach(mark); return }
    if (c.archetype === 'sequence') { S.sel = a.slice(); paintSeq(); a.forEach(mark); return }
    if (c.archetype === 'match') { S.pairs = {}; a.forEach(function (r, l) { S.pairs[l] = r }); paintPairs(); a.forEach(function (r, l) { mark('L' + l); mark('R' + r) }); return }
    if (c.archetype === 'drag') {
      S.inBasket.slice().forEach(function (i) { if (a.indexOf(i) < 0) S.takeOut(i) })
      a.forEach(function (i) { if (S.inBasket.indexOf(i) < 0) { S.inBasket.push(i); $('tray').querySelector('[data-i="' + i + '"]').classList.add('gone'); $('inb').insertAdjacentHTML('beforeend', '<img src="' + src(c.options[i].s) + '" alt="">') } })
      return
    }
    $('answers').querySelectorAll('.opt').forEach(function (b) { b.classList.remove('sel') })
    mark(a)
    $('answers').querySelectorAll('.lbl-hide').forEach(function (g) { g.classList.add('revealed') })
  }
  function resetWrong () {                          // answer returns to neutral (PRD: no shame)
    var c = S.card
    if (c.archetype === 'sequence') { S.sel = []; paintSeq() }
    else if (c.archetype === 'match') { S.pairs = {}; S.pickL = null; paintPairs() }
    else if (c.archetype === 'count') { S.num = ''; $('count-show').textContent = '?' }
    else if (c.archetype === 'find') { c.targets.forEach(function (x) { var e = el(x); if (e) e.classList.remove('sel') }); S.sel = null }
    else if (c.archetype === 'drag') { S.inBasket.slice().forEach(function (i) { if (c.answer.indexOf(i) < 0) S.takeOut(i) }) }
    else if (c.archetype === 'multi') { /* keep the right picks, drop the wrong ones */
      S.sel = S.sel.filter(function (i) { return c.answer.indexOf(i) >= 0 })
      $('answers').querySelectorAll('.opt').forEach(function (b) { b.classList.toggle('sel', S.sel.indexOf(+b.dataset.i) >= 0) })
    } else { S.sel = null; $('answers').querySelectorAll('.opt').forEach(function (b) { b.classList.remove('sel') }) }
    ready(c.archetype === 'drag' ? S.inBasket.length > 0 : c.archetype === 'multi' ? S.sel.length > 0 : false)
  }

  // zero-emoji (project rule): hint and pointer glyphs are drawn, not emoji
  var ICON = {
    bulb: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5a6.5 6.5 0 0 0-3.9 11.7c.6.5.9 1.1.9 1.8V17h6v-1c0-.7.3-1.3.9-1.8A6.5 6.5 0 0 0 12 2.5z" fill="#F2B632"/><rect x="9" y="18.2" width="6" height="2.2" rx="1" fill="#8A93A6"/></svg>',
    hand: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11V4.5a1.5 1.5 0 0 1 3 0V10l5.2 1.1a2 2 0 0 1 1.6 2.3l-.9 5A3 3 0 0 1 15 21h-3.6a3 3 0 0 1-2.3-1.1L5.5 15.5a1.5 1.5 0 0 1 2.2-2L9 15z" fill="#FFD2A6" stroke="#8A5A2B" stroke-width="1.4" stroke-linejoin="round"/></svg>'
  }
  function help (text, strong, icon) { var h = $('help'); h.innerHTML = text ? (icon ? ICON[icon] : '') + esc(text) : ''; h.classList.toggle('help-hint', icon === 'bulb'); h.classList.toggle('say', !!strong) }
  function banner (kind, t, s) {
    var b = $('banner'); b.className = kind; $('banner-t').textContent = t; $('banner-s').textContent = s || ''
    void b.offsetWidth; b.classList.add('on')
    clearTimeout(S.bt); S.bt = setTimeout(function () { b.classList.remove('on') }, 2200)
  }
  function hint (level) {
    var c = S.card
    S.hints = Math.max(S.hints, level)
    if (level === 1) {
      var d = c.hintTarget && el(c.hintTarget)
      if (d) { d.classList.remove('halo'); void d.offsetWidth; d.classList.add('halo') }
      help(c.hints[0], true, 'bulb')
      S.env.say(S.env.clipKey(c, 'h1'))
    } else {
      $('story').classList.add('hint2')
      var key = keySentence(); if (key) key.classList.add('key')
      // reduce choices: dim ONE wrong option (never the right one, never blink it)
      if (c.options && (c.archetype === 'choice' || c.archetype === 'image') && c.options.length >= 3) {
        var wrong = c.options.map(function (_, i) { return i }).filter(function (i) { return i !== c.answer && S.dimmed.indexOf(i) < 0 })
        var w = wrong[wrong.length - 1]
        if (w !== undefined) { S.dimmed.push(w); var b = $('answers').querySelector('[data-i="' + w + '"]'); if (b) { b.classList.add('dim'); b.disabled = true } }
      }
      help(c.hints[1], true, 'bulb')
      S.env.say(S.env.clipKey(c, 'h2'))
    }
  }
  function keySentence () {                        // the sentence that carries the answer: the last one
    var ss = $('story-t').querySelectorAll('.s'); return ss[ss.length - 1]
  }

  function check () {
    var c = S.card
    if ($('btn-check').disabled) return
    S.attempts++
    S.env.sfx('tap')
    if (isRight()) return teach(true)
    if (S.attempts === 1) {
      banner('again', 'Ayo lihat lagi.', 'Pelan-pelan, kamu pasti bisa!')
      S.env.say('line:lihat-lagi')
      resetWrong(); hint(1)
    } else if (S.attempts === 2) {
      banner('again', 'Hampir!', 'Ini petunjuk lagi.')
      resetWrong(); hint(2)
    } else {
      teach(false)
    }
  }
  function teach (right) {
    var c = S.card
    S.locked = true; S.right = right
    showAnswer()
    $('btn-check').classList.add('hide'); $('btn-hint').classList.add('hide'); $('btn-next').classList.remove('hide')
    if (right) {
      banner('good', S.attempts === 1 && !S.hints ? 'Hebat!' : 'Kamu berhasil!', 'Jawabanmu benar.')
      S.env.sfx('good'); S.env.say('line:hebat')
      reactScene()
      S.env.onToken && S.env.onToken()
    } else {
      banner('again', 'Ayo kita lihat bersama.', 'Begini jawabannya.')
    }
    help(c.explain, true)
    setTimeout(function () { S.env.say(S.env.clipKey(c, 'x')) }, 700)
    $('btn-next').focus && $('btn-next').focus()
  }
  function reactScene () {                          // a meaningful 300–600 ms scene response
    if (S.env.reduced()) return
    Object.keys(S.els).forEach(function (k) {
      var d = S.els[k]; if (d.classList.contains('idle')) anim(d, [{ transform: T }, { transform: 'translate(-50%,-58%)' }, { transform: T }], 420)
    })
  }

  /* ── public ──────────────────────────────────────────────────────────── */
  function play (card, env) {
    return new Promise(function (resolve) {
      var stage = $('stage')
      S = { card: card, env: env, els: {}, layer: $('stage-layer'), alive: true, storyRun: 0,
        attempts: 0, hints: 0, dimmed: [], sel: null, locked: true, stageW: stage.clientWidth || 1, stageH: stage.clientHeight || 1 }
      S.done = function () { S.alive = false; resolve({ correct: S.right === true, attempts: S.attempts, hints: S.hints, helped: S.hints > 0 || S.right === false }) }
      $('q').classList.remove('on'); $('q').textContent = card.q
      $('answers').innerHTML = ''; help('')
      $('story').classList.remove('hint2')
      $('btn-check').classList.remove('hide'); $('btn-check').disabled = true
      $('btn-hint').classList.remove('hide'); $('btn-next').classList.add('hide')
      $('btn-hint').disabled = true
      playStory(true).then(function () {
        if (!S.alive || S.card !== card) return
        return wait(250).then(function () {                     // pause before the question
          $('q').classList.add('on')
          env.say(env.clipKey(card, 'q'))
          ;(A[card.archetype] || A.choice)()
          stagger()
          S.locked = false; $('btn-hint').disabled = false
        })
      })
    })
  }
  function replay () {                            // PRD: unrestricted, never resets the answer
    if (!S || !S.alive) return
    var keepSel = S.locked
    S.storyRun++
    $('story-t').querySelectorAll('.s').forEach(function (x) { x.classList.remove('now') })
    var i = 0, ss = S.card.story
    ;(function next () { if (i < ss.length && S.alive) sayLine(i++).then(next) })()
    void keepSel
  }
  function hintNext () { if (!S || S.locked) return; hint(Math.min(2, S.hints + 1)); S.env.sfx('hint') }
  function next () { if (S && S.alive) S.done() }
  function stop () { if (S) { S.alive = false; S.storyRun++ } }

  W.SDEngine = { play: play, check: function () { if (S && !S.locked) check() }, replay: replay, hint: hintNext, next: next, stop: stop,
    _state: function () { return S }, src: src }
})()
