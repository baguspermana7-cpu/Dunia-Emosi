/* =============================================================================
 * boss-round.js — window.BossRound (PRD-40). Every tenth level of a run game (G19 Pokemon Birds, G23 Pokemon Run,
 * G24 Bawah Laut) ends in a boss: a big animated Pokemon with a health bar, three phases of questions (each phase one
 * step harder), a big celebration when it falls. The pattern is G10's (boss every 10 levels, legendary pool); the
 * art is the animated GIFs already in assets/Pokemon/showdown-ani: no new assets, no emoji.
 *
 *   BossRound.intercept({ game, level, ask(phase) -> {q, ans, wrong[]}, pause(), done(), bosses: ['lugia', ...] })
 *     -> true when this level is a boss level and the boss starts now (the caller returns and waits for done());
 *        false on every other level, and on the boss level once the boss is beaten (done() calls back into the
 *        caller's win screen, which then saves the level as before).
 *   BossRound.isBossLevel(level)   level % 10 === 0
 *   BossRound.state()              { on, phase, hp, max, asked, right, boss, answer } (a gate reads it)
 *
 * Never lost: a wrong answer makes the boss strike (a shake, nothing taken) and the next question comes; only right
 * answers bring the bar down. Leaving mid-boss changes no saved progress (the level is saved after the win only).
 * Answers are reported to the learning log (DuniaAnswerQ, save-engine.js).
 * ==========================================================================*/
(function (W, D) {
  'use strict'
  if (W.BossRound) return
  var PHASES = 3, PER_PHASE = 3, MAX = PHASES * PER_PHASE
  var me = D.currentScript, base = ((me && me.src) || '').replace(/data\/[^/]*$/, '')
  var st = { on: false, phase: 0, hp: MAX, max: MAX, asked: 0, right: 0 }
  var beaten = {}

  function reduced () { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches } catch (e) { return false } }
  function isBossLevel (lv) { return +lv > 0 && +lv % 10 === 0 }
  function esc (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';' }) }
  function shuffle (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t } return a }
  function anim (el, k, o) { try { return el && el.animate && !reduced() ? el.animate(k, o) : null } catch (e) { return null } }

  function css () {
    if (D.getElementById('boss-round-css')) return
    var s = D.createElement('style'); s.id = 'boss-round-css'
    s.textContent =
      '#boss-round{position:fixed;inset:0;z-index:400;display:flex;flex-direction:column;align-items:center;justify-content:space-between;' +
      'padding:max(16px,env(safe-area-inset-top)) 14px max(16px,env(safe-area-inset-bottom));box-sizing:border-box;' +
      'background:radial-gradient(ellipse at 50% 34%,#4c1d95 0%,#1e0b3a 55%,#0a0418 100%);font-family:inherit;color:#fff;user-select:none}' +
      '#boss-round .br-top{width:min(560px,100%);display:flex;flex-direction:column;align-items:center;gap:8px}' +
      '#boss-round .br-name{font-weight:900;font-size:clamp(18px,4.6vw,26px);letter-spacing:.06em;text-transform:uppercase}' +
      '#boss-round .br-phase{font-weight:800;font-size:clamp(13px,3.4vw,16px);color:#fde68a}' +
      '#boss-round .br-bar{width:100%;height:18px;border-radius:999px;background:rgba(255,255,255,.14);overflow:hidden;box-shadow:inset 0 2px 0 rgba(0,0,0,.35)}' +
      '#boss-round .br-fill{height:100%;width:100%;border-radius:999px;background:linear-gradient(90deg,#ef4444,#f97316);transform-origin:left;transition:transform .45s cubic-bezier(.3,1.2,.5,1)}' +
      '#boss-round .br-stage{flex:1;display:flex;align-items:center;justify-content:center;min-height:0;width:100%}' +
      '#boss-round .br-boss{max-height:min(38vh,320px);max-width:80vw;width:auto;height:min(38vh,320px);object-fit:contain;image-rendering:auto;' +
      'filter:drop-shadow(0 14px 18px rgba(0,0,0,.5))}' +
      '#boss-round .br-q{font-weight:900;font-size:clamp(20px,5.6vw,32px);text-align:center;margin:6px 0 12px;min-height:1.2em}' +
      '#boss-round .br-choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;width:min(560px,100%)}' +
      '#boss-round .br-c{min-height:58px;border-radius:16px;border:none;font:inherit;font-weight:900;font-size:clamp(18px,5vw,26px);color:#fff;cursor:pointer;' +
      'box-shadow:0 5px 0 rgba(0,0,0,.35);-webkit-tap-highlight-color:transparent}' +
      '#boss-round .br-c:nth-child(1){background:#7c3aed}#boss-round .br-c:nth-child(2){background:#dc2626}' +
      '#boss-round .br-c:nth-child(3){background:#059669}#boss-round .br-c:nth-child(4){background:#d97706}' +
      '#boss-round .br-c.qc-col{background:var(--qc);color:var(--qc-ink);box-shadow:0 5px 0 var(--qc-edge)}' +
      '#boss-round .br-c:active{transform:translateY(3px);box-shadow:0 2px 0 rgba(0,0,0,.35)}' +
      '#boss-round .br-c.ok{background:#16a34a;outline:4px solid #bbf7d0}#boss-round .br-c.no{opacity:.45}' +
      '#boss-round .br-banner{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);font-weight:900;font-size:clamp(28px,8vw,52px);' +
      'color:#fde68a;text-shadow:0 4px 0 #7c2d12,0 0 24px rgba(251,191,36,.6);pointer-events:none;white-space:nowrap}' +
      '@media (orientation:landscape) and (max-height:500px){#boss-round{flex-direction:row;gap:16px;align-items:stretch}' +
      '#boss-round .br-left{flex:1;display:flex;flex-direction:column;min-width:0}#boss-round .br-right{flex:1;display:flex;flex-direction:column;justify-content:center;min-width:0}' +
      '#boss-round .br-boss{height:min(52vh,260px)}}'
    ;(D.head || D.documentElement).appendChild(s)
  }

  function say (t) { try { if (W.speak) W.speak(t) } catch (e) {} }
  function burst (el, fx, size) {
    try {
      if (!W.VFX || !VFX.dom || reduced()) return
      var r = el.getBoundingClientRect(); VFX.dom(r.left + r.width / 2, r.top + r.height / 2, { fx: fx, size: size || Math.max(120, r.width) })
    } catch (e) {}
  }
  // the big win moment: VFX.Moment.celebrate (games/vfx-moments.js, loaded here when the page does not have it)
  function celebrate () {
    var go = function () { try { if (W.VFX && VFX.Moment && VFX.Moment.ready()) VFX.Moment.celebrate({ x: innerWidth / 2, y: innerHeight * 0.4 }, { size: Math.min(innerWidth, innerHeight) * 0.32 }) } catch (e) {} }
    if (!W.VFX || reduced()) return
    if (VFX.Moment) return go()
    var q = ((me && me.src) || '').split('?')[1], s = D.createElement('script')
    s.src = base + 'vfx-moments.js' + (q ? '?' + q : ''); s.onload = function () { setTimeout(go, 60) }; D.head.appendChild(s)
  }

  function intercept (o) {
    if (!o || !isBossLevel(o.level) || beaten[o.game + ':' + o.level] || st.on) return false
    if (typeof o.ask !== 'function' || typeof o.done !== 'function') return false
    try { if (o.pause) o.pause() } catch (e) {}
    start(o)
    return true
  }

  function start (o) {
    css()
    var list = o.bosses && o.bosses.length ? o.bosses : ['lugia']
    var key = list[(Math.floor(o.level / 10) - 1) % list.length], name = key.replace(/-mega$/, '').replace(/^./, function (c) { return c.toUpperCase() })
    st = { on: true, phase: 1, hp: MAX, max: MAX, asked: 0, right: 0, boss: key }
    var root = D.createElement('div'); root.id = 'boss-round'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Bos ' + name)
    var land = W.matchMedia && W.matchMedia('(orientation:landscape) and (max-height:500px)').matches
    var top = '<div class="br-top"><div class="br-name">Bos ' + esc(name) + '</div><div class="br-bar" aria-hidden="true"><div class="br-fill"></div></div><div class="br-phase"></div></div>'
    var stage = '<div class="br-stage"><img class="br-boss" alt="' + esc(name) + '" src="' + base + '../assets/Pokemon/showdown-ani/' + key + '.gif"></div>'
    var qa = '<div class="br-q" aria-live="polite"></div><div class="br-choices"></div>'
    root.innerHTML = land ? '<div class="br-left">' + top + stage + '</div><div class="br-right">' + qa + '</div>' : top + stage + qa
    D.body.appendChild(root)
    var $ = function (s) { return root.querySelector(s) }, boss = $('.br-boss'), fill = $('.br-fill')
    // a pixel sprite blurs past ~2.4x its own size: cap the drawn height there
    boss.addEventListener('load', function () { if (boss.naturalHeight) boss.style.maxHeight = Math.round(boss.naturalHeight * 2.4) + 'px' })
    var cur = null, shownAt = 0, lock = false
    say('Bos ' + name + '! Jawab soal untuk mengalahkannya!')
    anim(boss, [{ transform: 'translateY(-30%) scale(.6)', opacity: 0 }, { transform: 'translateY(4%) scale(1.06)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { duration: 700, easing: 'cubic-bezier(.3,1.3,.5,1)' })

    function banner (t, ms) {
      var b = D.createElement('div'); b.className = 'br-banner'; b.textContent = t; root.appendChild(b)
      anim(b, [{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.1)', opacity: 1, offset: 0.35 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: ms || 1100, fill: 'forwards' })
      setTimeout(function () { b.remove() }, ms || 1100)
    }
    function paint () {
      fill.style.transform = 'scaleX(' + (st.hp / st.max) + ')'
      $('.br-phase').textContent = 'Fase ' + st.phase + ' dari ' + PHASES
    }
    function next () {
      var q = null
      for (var tries = 0; tries < 4 && !(q && q.q != null && q.ans != null && q.wrong && q.wrong.length); tries++) { try { q = o.ask(st.phase) } catch (e) { q = null } }
      if (!q) q = { q: '2 + 3', ans: 5, wrong: [4, 6, 7] }
      cur = q; lock = false; shownAt = Date.now(); st.answer = String(q.ans)
      var text = String(q.q).replace(/\s*=\s*\?\s*$/, ''); text += /[?]$/.test(text) ? '' : ' = ?'
      // the game's own renderer (colour emoji -> swatch, the page's emoji map draws the rest as pictures)
      try { if (typeof W.renderQuestionText === 'function') W.renderQuestionText($('.br-q'), text); else $('.br-q').textContent = text } catch (e) { $('.br-q').textContent = text }
      var opts = shuffle([q.ans].concat(q.wrong.slice(0, 3))), box = $('.br-choices'); box.innerHTML = ''
      opts.forEach(function (v) {
        var b = D.createElement('button'); b.type = 'button'; b.className = 'br-c'; b.textContent = v
        try { if (typeof W.paintColourChoice === 'function') W.paintColourChoice(b, v) } catch (e) {}
        b.addEventListener('click', function () { pick(b, v) })
        box.appendChild(b)
      })
      paint()
    }
    function pick (btn, v) {
      if (lock) return
      lock = true; st.asked++
      var ok = String(v) === String(cur.ans)
      try { if (W.DuniaAnswerQ) W.DuniaAnswerQ(cur.q, ok, Date.now() - shownAt) } catch (e) {}
      root.querySelectorAll('.br-c').forEach(function (b) { if (String(b.textContent) === String(cur.ans)) b.classList.add('ok'); else b.classList.add('no') })
      if (ok) {
        st.right++; st.hp = Math.max(0, st.hp - 1)
        try { if (W.HitFeel) HitFeel.hit(boss, { big: st.hp === 0 }) } catch (e) {}
        anim(boss, [{ transform: 'none', filter: 'brightness(1)' }, { transform: 'translateX(-6%) rotate(4deg)', filter: 'brightness(2.4)', offset: 0.25 }, { transform: 'none', filter: 'brightness(1)' }], { duration: 380 })
        burst(boss, 'sparks', 160)
        paint()
        var phaseDone = st.hp % PER_PHASE === 0
        setTimeout(function () {
          if (st.hp === 0) return win()
          if (phaseDone) { st.phase++; banner('Fase ' + st.phase + '!'); say('Fase ' + st.phase + '! Bos makin kuat!'); anim(boss, [{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 600 }); setTimeout(next, 900) } else next()
        }, 650)
      } else {
        // the boss strikes back: a scare, nothing taken
        anim(boss, [{ transform: 'none' }, { transform: 'translateY(10%) scale(1.15)', offset: 0.4 }, { transform: 'none' }], { duration: 420 })
        anim(root, [{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], { duration: 300, delay: 160 })
        setTimeout(next, 1100)
      }
    }
    function win () {
      st.on = false; beaten[o.game + ':' + o.level] = true
      banner('Bos kalah!', 1600); say('Hebat! Bos ' + name + ' kalah!')
      anim(boss, [{ transform: 'none', opacity: 1 }, { transform: 'rotate(-14deg) translateY(20%) scale(.8)', opacity: 0 }], { duration: 900, fill: 'forwards', easing: 'ease-in' })
      celebrate()
      setTimeout(function () { root.remove(); try { o.done() } catch (e) {} }, reduced() ? 900 : 1900)
    }
    next()
  }

  W.BossRound = { intercept: intercept, isBossLevel: isBossLevel, state: function () { return { on: st.on, phase: st.phase, hp: st.hp, max: st.max, asked: st.asked, right: st.right, boss: st.boss, answer: st.answer } }, PHASES: PHASES, PER_PHASE: PER_PHASE }
})(window, document)
