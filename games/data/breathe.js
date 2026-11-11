/**
 * DuniaBreath — "Napas bersama": a calm tool, never a level. A cloud friend grows for 4 s (tarik napas) and
 * shrinks for 4 s (buang), three times (24 s), with a spoken count. It cannot be failed and can always be closed.
 *
 *   DuniaBreath.open({ onClose })   start now (from the feeling check-in: sedih / marah / takut)
 *   DuniaBreath.maybeOffer()        on the map: if the child's last 3 recorded answers were all wrong (learning
 *                                   log) and nothing was offered today, ask "Mau tarik napas dulu?" (Ya / Nanti)
 *   DuniaBreath.ROUND_MS            8000 (one in + out)
 *
 * It is offered at calm moments only (the map, the check-in), never on top of a running game: games with a clock
 * keep running behind an overlay. Sends DuniaBus 'calm' { done: true | false } when it closes.
 * Like the check-in, an automated browser is only offered it with ?feel=1 (tools/qa-breathe.mjs).
 * Mechanic B of docs/SPEC-EMOSI-REPLACEMENT-2026-11-11.md.
 */
(function () {
  'use strict'
  var W = window
  if (W.DuniaBreath) return
  var ROUND_MS = 8000, ROUNDS = 3, KEY = 'dunia-calm-offer'
  var SELF = (document.currentScript && document.currentScript.src) || ''
  var PIC = SELF ? new URL('../../assets/db/breathe/001.webp', SELF).href : ''

  function soundOn () { try { return localStorage.getItem('dunia-emosi-sound') !== 'off' } catch (e) { return true } }
  function say (text) {
    try {
      if (!soundOn() || !W.speechSynthesis) return
      var u = new SpeechSynthesisUtterance(text); u.lang = 'id-ID'; u.rate = 0.85
      W.speechSynthesis.cancel(); W.speechSynthesis.speak(u)
    } catch (e) {}
  }
  function today () { var x = new Date(); return x.getFullYear() + '-' + ('0' + (x.getMonth() + 1)).slice(-2) + '-' + ('0' + x.getDate()).slice(-2) }
  function getS (k) { try { return W.avatarScopedGet ? W.avatarScopedGet(k) : localStorage.getItem(k) } catch (e) { return null } }
  function setS (k, v) { try { if (W.avatarScopedSet) W.avatarScopedSet(k, v); else localStorage.setItem(k, v) } catch (e) {} }

  function css () {
    if (document.getElementById('dbreath-css')) return
    var s = document.createElement('style'); s.id = 'dbreath-css'
    s.textContent = [
      '#dbreath{position:fixed;inset:0;z-index:2147483001;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(12,10,26,.82);font-family:inherit}',
      '#dbreath .dbr-card{position:relative;width:100%;max-width:520px;background:#EEF6FF;border:3px solid #BFDBFE;border-radius:28px;box-shadow:0 10px 0 #93B4DA;padding:22px 16px 20px;text-align:center;color:#1E293B}',
      '#dbreath .dbr-x{position:absolute;z-index:2;top:10px;right:10px;width:48px;height:48px;border:0;border-radius:50%;background:#DBEAFE;cursor:pointer;display:flex;align-items:center;justify-content:center}',
      '#dbreath .dbr-stage{position:relative;height:230px;display:flex;align-items:center;justify-content:center}',
      '#dbreath .dbr-ring{position:absolute;left:50%;top:50%;width:140px;height:140px;margin:-70px 0 0 -70px;border-radius:50%;background:radial-gradient(circle,rgba(96,165,250,.28) 0%,rgba(96,165,250,.12) 60%,rgba(96,165,250,0) 72%);border:2px solid rgba(59,130,246,.35);will-change:transform,opacity;pointer-events:none}',
      // the sprite carries a pale glow whose edge turns ragged when scaled: keep the friend, drop the glow
      '#dbreath .dbr-pic{position:relative;pointer-events:none;-webkit-mask-image:radial-gradient(circle closest-side,#000 62%,transparent 70%);mask-image:radial-gradient(circle closest-side,#000 62%,transparent 70%)}',
      '#dbreath .dbr-pic{width:150px;height:150px;object-fit:contain;will-change:transform}',
      '#dbreath .dbr-cue{font-size:26px;font-weight:900;margin:4px 0 10px;min-height:34px}',
      '#dbreath .dbr-dots{display:flex;gap:10px;justify-content:center;margin-bottom:6px}',
      '#dbreath .dbr-dots i{width:16px;height:16px;border-radius:50%;background:#BFDBFE;display:block}',
      '#dbreath .dbr-dots i.on{background:#2563EB}',
      '#dbreath .dbr-go{min-height:56px;padding:0 28px;border:0;border-radius:18px;background:#FFD968;box-shadow:0 5px 0 #D4A017;font:inherit;font-size:18px;font-weight:900;color:#3A2B12;cursor:pointer;margin:6px}',
      '#dbreath .dbr-soft{background:#E2E8F0;box-shadow:0 5px 0 #94A3B8}',
      '#dbreath .dbr-go,#dbreath .dbr-x{transition:transform 120ms cubic-bezier(0.23,1,0.32,1),box-shadow 120ms cubic-bezier(0.23,1,0.32,1);-webkit-tap-highlight-color:transparent;touch-action:manipulation}',
      '#dbreath .dbr-go:active{transform:translateY(3px) scale(0.97);box-shadow:0 1px 0 #D4A017}',
      '#dbreath .dbr-x:active{transform:scale(0.92)}',
      '@media (prefers-reduced-motion: reduce){#dbreath .dbr-go:active,#dbreath .dbr-x:active{transform:none}}',
      '#dbreath h2{margin:0 0 6px;padding:0 52px;font-size:22px;font-weight:900;line-height:1.25}'
    ].join('\n')
    document.head.appendChild(s)
  }
  function closeBtn (onClick) {
    var x = document.createElement('button'); x.className = 'dbr-x'; x.setAttribute('aria-label', 'Tutup')
    x.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="#1E293B" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
    x.addEventListener('click', onClick)
    return x
  }
  function shell () {
    var o = document.getElementById('dbreath'); if (o) o.remove()
    css()
    o = document.createElement('div'); o.id = 'dbreath'; o.setAttribute('role', 'dialog')
    var card = document.createElement('div'); card.className = 'dbr-card'
    o.appendChild(card); document.body.appendChild(o)
    return card
  }

  // motion (owner 2026-11-11 "Polish more"): the overlay fades in, the card rises from scale .96, its children
  // follow 40 ms apart; it leaves faster than it came. transform/opacity only; reduced motion = fade only.
  var EASE = 'cubic-bezier(0.23, 1, 0.32, 1)'
  function still () { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches } catch (e) { return false } }
  function enter (back, card, kids) {
    try {
      back.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: EASE })
      card.animate(still() ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(10px) scale(0.96)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: EASE })
      ;(kids || []).forEach(function (k, i) {
        k.animate(still() ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 220, delay: 80 + i * 40, easing: EASE, fill: 'backwards' })
      })
    } catch (e) {}
  }
  function leave (back, done) {
    try {
      var a = back.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: EASE, fill: 'forwards' })
      a.onfinish = done; return
    } catch (e) {}
    done()
  }
  var run = null
  function stop (done, onClose) {
    if (run) { run.timers.forEach(clearTimeout); [run.anim, run.ring].forEach(function (a) { if (a) try { a.cancel() } catch (e) {} }); run = null }
    var o = document.getElementById('dbreath'); if (o && !o.dataset.closing) { o.dataset.closing = '1'; leave(o, function () { o.remove() }) }
    try { if (W.speechSynthesis) W.speechSynthesis.cancel() } catch (e) {}
    if (W.DuniaBus) W.DuniaBus.emit('calm', { done: !!done })
    if (typeof onClose === 'function') try { onClose(!!done) } catch (e) {}
  }

  function open (opts) {
    opts = opts || {}
    var card = shell()
    card.appendChild(closeBtn(function () { stop(false, opts.onClose) }))
    var stage = document.createElement('div'); stage.className = 'dbr-stage'
    var pic = document.createElement('img'); pic.className = 'dbr-pic'; pic.alt = ''; pic.src = PIC
    var ring = document.createElement('div'); ring.className = 'dbr-ring'
    stage.appendChild(ring); stage.appendChild(pic)
    var cue = document.createElement('div'); cue.className = 'dbr-cue'
    var dots = document.createElement('div'); dots.className = 'dbr-dots'
    for (var i = 0; i < ROUNDS; i++) dots.appendChild(document.createElement('i'))
    card.appendChild(stage); card.appendChild(cue); card.appendChild(dots)
    enter(card.parentNode, card, [cue, dots])

    run = { timers: [], anim: null, t0: performance.now() }
    try {
      // one animation for all three rounds: grow on the in-breath, shrink on the out-breath (it IS the mechanic, so
      // it also runs under reduced motion, only smaller)
      var big = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1.18 : 1.4
      var kf = []
      for (var r = 0; r < ROUNDS; r++) {
        kf.push({ transform: 'scale(1)', offset: r / ROUNDS, easing: 'ease-in-out' })
        kf.push({ transform: 'scale(' + big + ')', offset: (r + 0.5) / ROUNDS, easing: 'ease-in-out' })
      }
      kf.push({ transform: 'scale(1)', offset: 1 })
      run.anim = pic.animate(kf, { duration: ROUND_MS * ROUNDS, fill: 'forwards', id: 'dbreath' })
      // the ring breathes with the cloud, wider and brighter at the top of a breath: an easier shape to follow
      var rk = []
      for (var q = 0; q < ROUNDS; q++) {
        rk.push({ transform: 'scale(0.85)', opacity: 0.55, offset: q / ROUNDS, easing: 'ease-in-out' })
        rk.push({ transform: 'scale(' + (big + 0.05) + ')', opacity: 1, offset: (q + 0.5) / ROUNDS, easing: 'ease-in-out' })
      }
      rk.push({ transform: 'scale(0.85)', opacity: 0.55, offset: 1 })
      run.ring = ring.animate(rk, { duration: ROUND_MS * ROUNDS, fill: 'forwards' })
    } catch (e) {}
    function phase (r, inhale) {
      cue.textContent = inhale ? 'Tarik napas...' : 'Buang pelan...'
      try { cue.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: EASE }) } catch (e) {}
      cue.dataset.phase = inhale ? 'in' : 'out'
      if (inhale) dots.children[r].className = 'on'
      say(inhale ? 'Tarik napas' : 'Buang pelan-pelan')
    }
    for (var k = 0; k < ROUNDS; k++) {
      (function (r) {
        run.timers.push(setTimeout(function () { phase(r, true) }, r * ROUND_MS))
        run.timers.push(setTimeout(function () { phase(r, false) }, r * ROUND_MS + ROUND_MS / 2))
      })(k)
    }
    run.timers.push(setTimeout(function () {
      if (run) run.ms = performance.now() - run.t0
      var ms = run && run.ms
      card.innerHTML = ''
      card.appendChild(closeBtn(function () { stop(true, opts.onClose) }))
      var p = document.createElement('img'); p.className = 'dbr-pic'; p.alt = ''; p.src = PIC
      var h = document.createElement('h2'); h.textContent = 'Hebat! Kamu lebih tenang.'
      var go = document.createElement('button'); go.className = 'dbr-go'; go.textContent = 'Ayo main'
      go.addEventListener('click', function () { stop(true, opts.onClose) })
      card.appendChild(p); card.appendChild(h); card.appendChild(go)
      enter(card.parentNode, card, [h, go])
      card.dataset.doneMs = String(Math.round(ms || 0))
      say('Hebat! Kamu lebih tenang.')
    }, ROUND_MS * ROUNDS))
    say('Ayo tarik napas bersama.')
  }

  // the last answers this child gave, newest last: three wrong in a row = offer a breath, once a day
  function frustrated () {
    try {
      var r = W.LearningLog ? W.LearningLog.recent(3) : []
      return r.length === 3 && r.every(function (x) { return x.ok === false })
    } catch (e) { return false }
  }
  function maybeOffer () {
    try {
      if (navigator.webdriver && !/[?&]feel=1\b/.test(location.search)) return false
      if (document.getElementById('dfeel') || document.getElementById('dbreath')) return false
      if (getS(KEY) === today() || !frustrated()) return false
      setS(KEY, today())
      var card = shell()
      card.appendChild(closeBtn(function () { stop(false) }))
      var p = document.createElement('img'); p.className = 'dbr-pic'; p.alt = ''; p.src = PIC
      var h = document.createElement('h2'); h.textContent = 'Mau tarik napas dulu?'
      var yes = document.createElement('button'); yes.className = 'dbr-go'; yes.dataset.act = 'yes'; yes.textContent = 'Ya'
      var no = document.createElement('button'); no.className = 'dbr-go dbr-soft'; no.dataset.act = 'later'; no.textContent = 'Nanti'
      yes.addEventListener('click', function () { open() })
      no.addEventListener('click', function () { var o = document.getElementById('dbreath'); if (o && !o.dataset.closing) { o.dataset.closing = '1'; leave(o, function () { o.remove() }) } })
      card.appendChild(p); card.appendChild(h); card.appendChild(yes); card.appendChild(no)
      enter(card.parentNode, card, [p, h, yes, no])
      say('Soalnya susah, ya. Mau tarik napas dulu?')
      return true
    } catch (e) { return false }
  }

  W.DuniaBreath = { open: open, maybeOffer: maybeOffer, ROUND_MS: ROUND_MS, ROUNDS: ROUNDS }
})()
