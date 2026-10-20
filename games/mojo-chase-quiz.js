/* =============================================================================
 * mojo-chase-quiz.js — window.MojoChaseQuiz: the "Kotak Soal" question box of the G31 chase.
 *
 * Owner 2026-10-03: "a random box that gets hit has a maths question; the screen stops until the question
 * is answered; it fits the game theme; not too many".
 *
 *   spawnFilter(type, info) -> type   registered as MojoChase.hooks.spawnFilter. Turns ONE pickup slot
 *        (star / coin / mystery) into 'quiz' (OBJ.quiz = the owner ? box) when the plan allows: 1-2 per chase, never before
 *        10 s, >= 25 s apart, never in capture range (prog >= 0.8 / lock) or near the lane education event.
 *   onPickup('quiz', info, api) -> true   registered as MojoChase.hooks.onPickup -> api.pause('quiz'), card,
 *        then "Siap? Jalan!" (~1.5 s) -> api.clearAhead(1.5), api.reward({ stars: 2, boost: 1 }) when answered
 *        right (nothing taken away otherwise: never a fail), api.resume().
 *   reset({ seed, stage })          a new chase (the picker calls it; a falling elapsed also resets)
 *   question(rng) / sim(seed)       pure helpers for the gate (no DOM)
 *   state()                         QA seam: { open, phase, tries, answer, spawned, plan }
 *
 * Questions are generated locally (grade 1-2: count, add, subtract within 10, compare) with a seeded RNG and
 * no repeats within the session; SoalEngine profile g31 has no picture-count items for this context.
 * Pictures are owner sprites (mojo-chase/items, police van). No emoji. Answer buttons >= 64 px.
 * ==========================================================================*/
(function (W, D) {
  'use strict'
  var FIRST_S = 10, GAP_S = 25, CAPTURE_PROG = 0.8, EDU_SEGS = 60, CONVERT = { star: 1, coin: 1, mystery: 1 }
  var RM = false; try { RM = !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches) } catch (e) {}

  function lib (k) { return (W.AssetIndex && W.AssetIndex.path(k)) || ('../assets/db/lib/' + k + '.webp') }
  function rng (seed) { var s = (seed >>> 0) || 1; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
  function ri (r, a, b) { return a + Math.floor(r() * (b - a + 1)) }
  function shuffle (r, a) { var o = a.slice(); for (var i = o.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = o[i]; o[i] = o[j]; o[j] = t } return o }

  /* ── spawn plan: decided once per chase from the seed ───────────────────────────────────────────── */
  function makePlan (seed) {
    var r = rng(seed)
    return { r: r, max: r() < 0.55 ? 1 : 2, spawned: 0, lastAt: -1e9, nextAt: FIRST_S + 2 + r() * 8, lastElapsed: 0, times: [] }
  }
  var plan = makePlan(Date.now() & 0xffff)
  function reset (o) { o = o || {}; crashReset(); plan = makePlan(o.seed != null ? o.seed : (Date.now() ^ ((o.stage || '').length * 7919)) & 0xffffff) }

  // ctx = { elapsed, prog, state, seg, eduSeg, lock, edu }; tolerant of a core that passes fewer fields
  function allowed (ctx) {
    var t = +ctx.elapsed || 0
    if (plan.spawned >= plan.max || t < FIRST_S || t < plan.nextAt || t - plan.lastAt < GAP_S) return false
    if (ctx.state && ctx.state !== 'active') return false
    if (ctx.lock || (+ctx.prog || 0) >= CAPTURE_PROG) return false
    if (ctx.edu) return false
    if (ctx.eduSeg > 0 && ctx.seg != null && Math.abs(ctx.seg - ctx.eduSeg) < EDU_SEGS) return false
    return true
  }
  // core contract: spawnFilter(type, info) -> type | 'none'; info = { seg, lane, elapsed, prog, state, edu?, lock? }
  function filter (type, info) {
    if (!CONVERT[type]) return type
    var ctx = info || {}, t = +ctx.elapsed || 0
    if (t + 1 < plan.lastElapsed) reset({})   // a new chase without a picker run
    plan.lastElapsed = t
    if (!allowed(ctx)) return type
    plan.spawned++; plan.lastAt = t; plan.times.push(t); plan.nextAt = t + GAP_S + plan.r() * 10
    return 'quiz'
  }

  /* ── questions (grade 1-2, pictures) ────────────────────────────────────────────────────────────── */
  var PICS = [
    { k: 'mojo-chase/items/star', n: 'bintang' }, { k: 'mojo-chase/items/cone', n: 'kerucut' },
    { k: 'mojo-chase/items/tyres-2', n: 'ban' }, { k: 'mojo-chase/vehicles/police-van', n: 'mobil polisi', look: true },
    { k: 'mojo-chase/items/coin', n: 'koin' }, { k: 'mojo-chase/items/crate', n: 'peti' }
  ]
  var seen = {}   // no repeats within the session
  function numChoices (r, ans) {
    var c = [ans], tries = 0
    while (c.length < 3 && tries++ < 50) { var d = ans + (r() < 0.5 ? -1 : 1) * ri(r, 1, 2); if (d >= 0 && d <= 10 && c.indexOf(d) < 0) c.push(d) }
    for (var x = 0; c.length < 3; x++) if (c.indexOf(x) < 0) c.push(x)
    return shuffle(r, c).map(function (v) { return { v: v, t: String(v) } })
  }
  function make (r, want) {
    var kind = want || ['count', 'add', 'sub', 'compare'][ri(r, 0, 3)], a, b, q
    // the police van is only counted or compared; Mojo collects and the robber takes the other pictures
    var pool = kind === 'add' || kind === 'sub' ? PICS.filter(function (x) { return !x.look }) : PICS, p = pool[ri(r, 0, pool.length - 1)]
    if (kind === 'count') {
      a = ri(r, 3, 9)
      q = { kind: kind, key: 'c' + a + p.n, text: 'Ada berapa ' + p.n + '?', groups: [{ n: a, k: p.k }], answer: a, hint: 'Sentuh dan hitung satu per satu, ya.' }
    } else if (kind === 'add') {
      a = ri(r, 1, 6); b = ri(r, 1, 10 - a)
      q = { kind: kind, key: 'a' + a + '+' + b + p.n, text: 'Mojo punya ' + a + ' ' + p.n + ', dapat ' + b + ' lagi. Jadi berapa?', groups: [{ n: a, k: p.k }, { op: '+' }, { n: b, k: p.k }], answer: a + b, hint: 'Hitung semua gambarnya bersama-sama.' }
    } else if (kind === 'sub') {
      a = ri(r, 3, 10); b = ri(r, 1, a - 1)
      q = { kind: kind, key: 's' + a + '-' + b + p.n, text: 'Ada ' + a + ' ' + p.n + '. ' + b + ' diambil pencuri. Sisa berapa?', groups: [{ n: a, k: p.k, gone: b }], answer: a - b, hint: 'Hitung yang masih terang saja.' }
    } else {
      a = ri(r, 1, 8); b = r() < 0.2 ? a : ri(r, 1, 8)
      q = { kind: kind, key: 'm' + a + '?' + b + p.n, text: 'Mana yang lebih banyak?', groups: [{ n: a, k: p.k, side: 'Kiri' }, { op: 'atau' }, { n: b, k: p.k, side: 'Kanan' }],
        answer: a > b ? 'L' : a < b ? 'R' : 'S', hint: 'Hitung kiri, lalu hitung kanan.' }
      q.choices = [{ v: 'L', t: 'Kiri' }, { v: 'S', t: 'Sama' }, { v: 'R', t: 'Kanan' }]
      q.answerText = a > b ? 'Kiri lebih banyak' : a < b ? 'Kanan lebih banyak' : 'Sama banyak'
      return q
    }
    q.choices = numChoices(r, q.answer); q.answerText = String(q.answer)
    return q
  }
  function question (r, kind) {
    r = r || plan.r
    var q = null
    for (var i = 0; i < 40; i++) { q = make(r, kind); if (!seen[q.key]) break }
    seen[q.key] = true
    return q
  }

  /* ── headless simulation for the gate: one chase of `secs` seconds, a pickup slot every 0.25 s ──── */
  function sim (seed, secs) {
    secs = secs || 75
    reset({ seed: seed })
    var r = rng(seed * 31 + 7), eduAt = 20 + r() * 30, out = [], bad = []
    for (var t = 0; t <= secs; t += 0.25) {
      var prog = Math.min(1, t / (secs * 0.9)), seg = Math.round(t * 30), eduSeg = Math.round(eduAt * 30)
      var ctx = { elapsed: t, prog: prog, state: 'active', seg: seg, eduSeg: eduSeg, lock: prog >= 0.85 }
      var o = filter(r() < 0.8 ? 'star' : 'coin', ctx)
      if (o === 'quiz') {
        out.push(t)
        if (t < FIRST_S) bad.push('early ' + t)
        if (prog >= CAPTURE_PROG || ctx.lock) bad.push('capture ' + t)
        if (Math.abs(seg - eduSeg) < EDU_SEGS) bad.push('edu ' + t)
      }
    }
    for (var i = 1; i < out.length; i++) if (out[i] - out[i - 1] < GAP_S) bad.push('gap ' + out[i])
    if (out.length < 1 || out.length > 2) bad.push('count ' + out.length)
    return { times: out, bad: bad }
  }

  /* ── the card ───────────────────────────────────────────────────────────────────────────────────── */
  var cur = null
  function soundOn () { try { if (W.localStorage.getItem('dunia-emosi-sound') === 'off') return false } catch (e) {} return true }
  function cue (k) { if (!soundOn()) return; try { if (W.SFXEngine && W.SFXEngine.cue) W.SFXEngine.cue(k) } catch (e) {} }
  function el (tag, cls, html) { var e = D.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e }
  function pics (g) {
    var h = ''
    for (var i = 0; i < g.n; i++) h += '<span class="cnt"><img alt="" draggable="false" class="' + (g.gone && i >= g.n - g.gone ? 'gone' : '') + '" src="' + lib(g.k) + '" onerror="this.style.visibility=\'hidden\'"></span>'
    return '<div class="grp' + (g.n > 5 ? ' many' : '') + '">' + (g.side ? '<b class="side">' + g.side + '</b>' : '') + '<div class="pics">' + h + '</div></div>'
  }

  function open (info, api, opt) {
    if (cur) return
    try { if (api && api.pause) api.pause('quiz') } catch (e) { console.warn('[Mojo quiz] pause', e) }
    var host = (api && api.host) || D.getElementById('chase-host') || D.body
    var crash = !!(opt && opt.crash)
    var q = (opt && opt.q) || question(null, opt && opt.kind)
    var root = el('div', 'mcq' + (RM ? ' rm' : '') + (crash ? ' crash' : ''))
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Kotak Soal')
    root.innerHTML = '<div class="mcq-dim"></div><div class="mcq-card"><div class="mcq-plank">' +
      '<div class="mcq-head"><img class="bo" alt="" src="' + (W.__mcCallerPic || lib('mojo-char/bo')) + '"><h2>' + (crash ? 'Soal Cepat!' : 'Kotak Soal!') + '</h2><img class="box" alt="" src="' + lib(crash ? 'mojo-chase/items/star' : 'mojo-chase/items/mystery') + '"></div>' +
      '<p class="mcq-lab">' + (crash ? 'JAWAB UNTUK LANJUT!' : 'JAWAB UNTUK MELAJU!') + '</p><p class="mcq-eq"></p>' +
      '<p class="mcq-q"></p><div class="mcq-pics' + (q.groups.some(function (g) { return g.n > 10 }) ? ' tiny' : '') + '">' + q.groups.map(function (g) { return g.op ? '<span class="op">' + g.op + '</span>' : pics(g) }).join('') + '</div>' +
      '<p class="mcq-say" aria-live="polite"></p><div class="mcq-ans"></div></div></div><div class="mcq-go"><span></span></div>'
    root.querySelector('.mcq-q').textContent = q.text
    root.querySelector('.mcq-eq').textContent = q.eq || ''
    if (!q.groups.length) root.querySelector('.mcq-pics').style.display = 'none'
    // tap a picture to number it (counting aid): 1, 2, 3 ...
    var tapN = 0
    root.querySelector('.mcq-pics').addEventListener('click', function (ev) {
      var im = ev.target; if (!im || im.tagName !== 'IMG' || !im.parentNode || im.parentNode.className !== 'cnt' || im.className === 'gone') return
      if (im.parentNode.querySelector('b')) return
      tapN++; var b = D.createElement('b'); b.textContent = String(tapN); im.parentNode.appendChild(b); cue('click')
    })
    host.appendChild(root)
    if (host.classList) host.classList.add('mcq-open')
    var ans = root.querySelector('.mcq-ans'), say = root.querySelector('.mcq-say')
    cur = { root: root, q: q, tries: 0, phase: 'ask', info: info || {}, host: host, api: api || null, crash: crash }
    q.choices.forEach(function (c) {
      var b = el('button', 'mcq-btn'); b.type = 'button'; b.textContent = c.t; b.setAttribute('data-v', c.v)
      b.addEventListener('click', function () { pick(b, c.v) })
      ans.appendChild(b)
    })
    cue('levelup')
    function pick (b, v) {
      if (!cur || cur.phase !== 'ask' || b.disabled) return
      if (v === q.answer) {
        cur.phase = 'right'; cue('correct'); b.classList.add('right'); root.classList.add('win')
        say.textContent = crash ? 'Hebat! Hati kembali dan ngebut sedikit!' : 'Hebat! Dapat 2 bintang dan ngebut!'
        if (!RM) sparkle(b)
        setTimeout(function () { countdown(crash ? { heart: 1, boost: 0.6, stars: 1 } : { stars: 2, boost: 1 }) }, RM ? 500 : 1100)
        return
      }
      cur.tries++; cue('click')
      b.disabled = true; b.classList.add('dim'); b.classList.remove('bad'); void b.offsetWidth; b.classList.add('bad')
      if (crash) {   // never a fail: a kind hint, then try again; from the 2nd miss the right pill glows as a guide
        say.textContent = cur.tries < 2 ? 'Hampir! ' + q.hint : 'Coba yang bersinar, ya!'
        root.classList.add('hint')
        if (cur.tries >= 2) [].forEach.call(ans.children, function (x) { if (x.getAttribute('data-v') === String(q.answer)) x.classList.add('show') })
        return
      }
      if (cur.tries < 2) {
        say.textContent = 'Hampir! ' + q.hint
        root.classList.add('hint')
        return
      }
      cur.phase = 'shown'
      say.textContent = 'Jawabannya ' + q.answerText + '. Kamu sudah berusaha, ayo lanjut!'
      ;[].forEach.call(ans.children, function (x) { x.disabled = true; if (x.getAttribute('data-v') === String(q.answer)) x.classList.add('show') })
      setTimeout(function () { countdown(null) }, RM ? 900 : 1800)
    }
  }
  // a small ring of gold sparks around the right pill (transform/opacity only)
  function sparkle (b) {
    try {
      var r = b.getBoundingClientRect(), root = b.closest('.mcq'), rr0 = root.getBoundingClientRect()
      for (var i = 0; i < 8; i++) {
        var d = el('i'); d.style.cssText = 'position:absolute;left:' + (r.left - rr0.left + r.width / 2) + 'px;top:' + (r.top - rr0.top + r.height / 2) + 'px;width:10px;height:10px;border-radius:50%;background:#fde68a;pointer-events:none;will-change:transform,opacity'
        root.appendChild(d)
        var a = i / 8 * 6.283, dx = Math.cos(a) * 70, dy = Math.sin(a) * 50
        if (d.animate) d.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.2)', opacity: 0 }], { duration: 600, easing: 'cubic-bezier(.23,1,.32,1)' }).onfinish = (function (n) { return function () { if (n.parentNode) n.parentNode.removeChild(n) } })(d)
        else if (d.parentNode) d.parentNode.removeChild(d)
      }
    } catch (e) {}
  }
  function countdown (reward) {
    if (!cur) return
    var c = cur, go = c.root.querySelector('.mcq-go'), t = go.querySelector('span')
    c.phase = 'go'; c.reward = reward
    c.root.classList.add('counting')
    t.textContent = 'Siap?'; go.classList.add('on')
    setTimeout(function () { t.textContent = 'Jalan!'; go.classList.remove('on'); void go.offsetWidth; go.classList.add('on'); cue('swoosh') }, 750)
    setTimeout(function () { close() }, 1500)
  }
  function close () {
    if (!cur) return
    var c = cur; cur = null
    if (c.root.parentNode) c.root.parentNode.removeChild(c.root)
    if (c.host.classList) c.host.classList.remove('mcq-open')
    var A = c.api
    if (!A) return
    try { A.clearAhead(1.5) } catch (e) { console.warn('[Mojo quiz] clearAhead', e) }
    try { if (c.reward) A.reward(c.reward) } catch (e) { console.warn('[Mojo quiz] reward', e) }
    try { A.resume() } catch (e) { console.warn('[Mojo quiz] resume', e) }
  }

  /* ── crash question (owner 2026-10-10): a BROK may ask a maths / counting question, fairly ──────────────────────
     at most one per CRASH_GAP seconds of play, never on two crashes in a row, never near the capture; the run is
     paused while the card is open; right = a heart back + a small boost, wrong = a kind hint and try again. */
  var CRASH_GAP = 20, CRASH_PROG = 0.85, ASK_DELAY = 750
  var cstate = { lastAt: -1e9, lastAsked: false, asked: 0, crashes: 0, pending: false }
  function crashReset () { cstate = { lastAt: -1e9, lastAsked: false, asked: 0, crashes: 0, pending: false } }
  var OK_KINDS = { count: 1, add: 1, sub: 1, collect: 1, biggest: 1, smallest: 1, bond: 1, tomake: 1, pattern: 1, double: 1, diff: 1, fewer: 1 }
  var ROLE_OP = { add: '+', diff: 'dan' }
  var SPR_FALLBACK = 'mojo-chase/items/star'
  // a SoalEngine maths item -> the card's shape (prompt, big equation, picture groups, hint, choices)
  function fromSE (it) {
    var sc = it.scene || {}, groups = [], mode = sc.mode
    ;(sc.groups || []).forEach(function (g, i) {
      var key = String(g.key || ''); key = key.indexOf(':') > 0 ? SPR_FALLBACK : key
      if (i && ROLE_OP[mode]) groups.push({ op: ROLE_OP[mode] })
      groups.push({ n: Math.min(20, g.n | 0), k: key })
    })
    var ch = (it.choices || []).slice(0, 4).map(function (c) { return { v: String(c), t: String(c) } })
    var ans = String(it.answer); if (ch.every(function (c) { return c.v !== ans })) ch[0] = { v: ans, t: ans }
    return { kind: it.kind, key: it.id, text: it.prompt, eq: it.eq || '', groups: groups, answer: ans, choices: ch, hint: it.hint1 || 'Hitung pelan-pelan, ya.', answerText: ans, src: 'se' }
  }
  function crashQuestion (r) {
    r = r || plan.r
    var SE = W.SoalEngine
    if (SE && SE.one && r() < 0.7) {
      for (var i = 0; i < 8; i++) {
        var it = null
        try { it = SE.one({ game: 'g31', context: 'quiz', topic: 'matematika', grade: 1, level: 1 + Math.floor(r() * 2), seed: Math.floor(r() * 1e9), easy: true }) } catch (e) {}
        if (it && OK_KINDS[it.kind] && it.choices && it.choices.length >= 2 && !seen['se' + it.id]) { seen['se' + it.id] = true; return fromSE(it) }
      }
    }
    return question(r)   // the current kinds: count / add / sub / compare with Mojo's own pictures
  }
  function crashAllowed (ctx) {
    var t = +ctx.elapsed || 0
    if (cur || cstate.pending) return false
    if (W.__mcNoCrashQuiz) return false   // QA seam: timing gates that measure BROK recovery switch the crash question off
    if (ctx.state && ctx.state !== 'active') return false
    if ((+ctx.prog || 0) >= CRASH_PROG) return false
    if (cstate.lastAsked) return false                       // never on two consecutive crashes
    if (t - cstate.lastAt < CRASH_GAP) return false           // at most one per ~20 s of play
    return true
  }
  // core contract: onCrash(info, api) -> true when a question was scheduled
  function crashDecide (ctx) {
    cstate.crashes++
    var ok = crashAllowed(ctx)
    cstate.lastAsked = ok
    if (ok) { cstate.lastAt = +ctx.elapsed || 0; cstate.asked++ }
    return ok
  }
  // headless gate helper: crashes every 2-7 s for `secs` s of play; returns the times a question was asked + any rule breaks
  function crashSim (seed, secs) {
    crashReset(); var r = rng(seed * 17 + 3), t = 4, asked = [], bad = [], prev = false, crashes = 0
    while (t < (secs || 90)) {
      var ok = crashDecide({ elapsed: t, prog: Math.min(1, t / ((secs || 90) * 0.9)), state: 'active' }); crashes++
      if (ok) { asked.push(t); if (prev) bad.push('consecutive ' + t) }
      prev = ok; t += 2 + r() * 5
    }
    for (var i = 1; i < asked.length; i++) if (asked[i] - asked[i - 1] < CRASH_GAP) bad.push('gap ' + asked[i])
    crashReset()
    return { asked: asked, crashes: crashes, bad: bad }
  }
  function onCrash (info, api) {
    var ctx = info || {}
    if (!crashDecide(ctx)) return false
    cstate.pending = true
    // let the crash read first (BROK, shake, dizzy), then the run pauses on the question
    // the run may have ended in the delay (a race won, a capture, game over): a question then would freeze the finish
    setTimeout(function () {
      cstate.pending = false
      var st = 'active'; try { st = api && api.state ? api.state().state : 'active' } catch (e) {}
      if (!cur && (st === 'active' || st === 'tutorial')) open(ctx, api, { crash: true, q: crashQuestion() })
    }, RM ? 400 : ASK_DELAY)
    return true
  }
  // core contract: onPickup(type, info, api) -> true when handled
  function onPickup (type, info, api) { if (type !== 'quiz' && type !== 'qbox') return false; open(info, api); return true }
  function state () { return { open: !!cur, phase: cur ? cur.phase : null, tries: cur ? cur.tries : 0, answer: cur ? cur.q.answer : null, kind: cur ? cur.q.kind : null, spawned: plan.spawned, plan: { max: plan.max, times: plan.times.slice() } } }

  W.MojoChaseQuiz = { onCrash: onCrash, crashSim: crashSim, crashQuestion: crashQuestion, crashState: function () { return { lastAt: cstate.lastAt, lastAsked: cstate.lastAsked, asked: cstate.asked, crashes: cstate.crashes, pending: cstate.pending, gap: CRASH_GAP } }, crashPlan: crashAllowed, spawnFilter: filter, onPickup: onPickup, open: open, reset: reset, question: question, sim: sim, state: state, rng: rng,
    LIMITS: { first: FIRST_S, gap: GAP_S, max: 2, captureProg: CAPTURE_PROG }, version: 1 }

  /* hook registration: chain any spawnFilter / onPickup registered before this file */
  if (W.MojoChase) {
    // copy-on-register (never mutate the core's defaults table in place)
    var Hk = W.MojoChase.hooks || {}, prevF = Hk.spawnFilter, prevP = Hk.onPickup, prevC = Hk.onCrash, next = {}
    for (var hk in Hk) next[hk] = Hk[hk]
    next.spawnFilter = function (type, info) { var t = type; if (typeof prevF === 'function') { try { t = prevF(type, info) || type } catch (e) {} } return filter(t, info) }
    next.onCrash = function (info, api) { var r = onCrash(info, api); if (typeof prevC === 'function') try { prevC(info, api) } catch (e) {} return r }
    next.onPickup = function (type, info, api) { if (onPickup(type, info, api)) return true; if (typeof prevP === 'function') try { return prevP(type, info, api) } catch (e) {} return false }
    W.MojoChase.hooks = next
  }
})(typeof window !== 'undefined' ? window : globalThis, typeof document !== 'undefined' ? document : null)
