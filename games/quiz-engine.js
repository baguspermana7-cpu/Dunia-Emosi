/* =============================================================================
 * quiz-engine.js — window.QuizEngine  (v1.0.0, 2026-06-29)
 * =============================================================================
 * SHARED question + answer-choices engine for ALL Dunia Emosi games (M-303).
 *
 * Owner mandate: "quiz/question harusnya ada engine tersendiri yang shared among
 * all the game. jangan per-game membuat engine/algo sendiri. tidak scalable per
 * game di-hardcode." — same shared-module pattern as TrainBackdrop / TrainSpeedFX
 * / TrainJourney / RZParallax.
 *
 * Owns THREE things every game used to hand-roll:
 *   1. Question generation  — kid-friendly, level-scaled arithmetic (single source
 *      of the difficulty curve; was duplicated in g14 buildQuiz + g13c genMathQuestion).
 *   2. Styled rendering      — gym-pokemon look: gold-glow question + 4 per-position
 *      coloured pills (lavender/rose/sage/gold) with a 3D bottom-shadow.
 *   3. Answer handling       — tap → lock → reveal correct/wrong + animation → callback.
 *
 * The styling is injected once (no separate CSS link to forget). Games provide a
 * question element + a choices element (or a single host) and a result callback.
 *
 * ── API ──────────────────────────────────────────────────────────────────────
 *   QuizEngine.generate(opts) -> { question, answer, options }
 *       opts: { level, maxN?, useMinus?, type?:'makeMath', max?, difficulty? }
 *       - default: level-scaled kid arithmetic (+/-, answer ≤ 20).
 *       - type:'makeMath' delegates to window.makeMathQuestion if loaded.
 *       - or pass { question, answer, options } through unchanged.
 *
 *   QuizEngine.fill(questionEl, choicesEl, opts, onResult) -> { data }
 *       Fills EXISTING elements (least-invasive adoption). Adds .qz-* classes.
 *       opts may also carry { variant:'overlay'|'mini'|'inline', revealMs:{correct,wrong} }.
 *       onResult({ correct, chosen, answer }) fires after the reveal delay.
 *
 *   QuizEngine.ask(hostEl, opts, onResult) -> { data, close }
 *       Builds <div.qz-question> + <div.qz-choices> inside hostEl (new adopters).
 * ========================================================================== */
;(function (global) {
  'use strict'

  var CSS_ID = 'qz-engine-css'
  var CSS = [
    '.qz-question{text-align:center;color:#fbbf24;font-weight:900;font-size:26px;margin-bottom:12px;',
    'text-shadow:0 0 16px rgba(251,191,36,.5);font-family:inherit;line-height:1.1}',
    '.qz-choices{display:flex;gap:8px;justify-content:center;width:100%}',
    '.qz-panel.qz-mini .qz-choices,.qz-choices.qz-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}',
    /* per-position coloured pills — gym-pokemon palette (pastel-soft, kid-distinct) */
    '.qz-pill{flex:1;max-width:88px;min-height:44px;padding:14px 4px;border:2.5px solid;border-radius:14px;',
    'font-size:20px;font-weight:900;cursor:pointer;font-family:inherit;-webkit-tap-highlight-color:transparent;',
    'transition:transform .1s,box-shadow .1s,border-color .15s}',
    '.qz-choices.qz-grid .qz-pill,.qz-panel.qz-mini .qz-pill{max-width:none;font-size:18px;padding:12px 4px}',
    '.qz-pill:nth-child(1){background:#f0eaf6;color:#6d28d9;border-color:#c4a5e0;box-shadow:0 4px 0 #a48cc8}',
    '.qz-pill:nth-child(2){background:#fce8e8;color:#8a4a4a;border-color:#f4a8a8;box-shadow:0 4px 0 #d68888}',
    '.qz-pill:nth-child(3){background:#e8f5e8;color:#4a7c4a;border-color:#a8d8a8;box-shadow:0 4px 0 #84b884}',
    '.qz-pill:nth-child(4){background:#fef9e7;color:#92400e;border-color:#fde68a;box-shadow:0 4px 0 #f59e0b}',
    '.qz-pill:active{transform:translateY(3px) scale(.96);box-shadow:0 1px 0 rgba(0,0,0,.18)}',
    '.qz-pill.qz-correct{background:#e8f5e8!important;color:#4a7c4a!important;border-color:#a8d8a8!important;',
    'box-shadow:0 4px 0 #84b884;animation:qzCorrect .35s ease}',
    '.qz-pill.qz-wrong{background:#fce8e8!important;color:#8a4a4a!important;border-color:#f4a8a8!important;',
    'box-shadow:0 4px 0 #d68888;animation:qzWrong .4s ease}',
    '@keyframes qzCorrect{0%{transform:scale(1)}50%{transform:scale(1.18)}100%{transform:scale(1)}}',
    '@keyframes qzWrong{0%{transform:translateX(0)}20%{transform:translateX(-8px)}50%{transform:translateX(8px)}',
    '80%{transform:translateX(-5px)}100%{transform:translateX(0)}}'
  ].join('')

  function injectCSS () {
    if (typeof document === 'undefined' || document.getElementById(CSS_ID)) return
    var s = document.createElement('style')
    s.id = CSS_ID
    s.textContent = CSS
    ;(document.head || document.documentElement).appendChild(s)
  }

  function randInt (min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
  function shuffle (a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t }
    return a
  }

  // Kid-friendly, level-scaled arithmetic. Single source of the difficulty curve
  // (was duplicated in g14 buildQuiz B-261 + g13c). +/- only, answer ≤ 2 digits.
  function mathQuestion (opts) {
    opts = opts || {}
    var lv = Math.max(1, parseInt(opts.level, 10) || 1)
    var maxN, useMinus
    if (opts.maxN) { maxN = opts.maxN; useMinus = !!opts.useMinus }
    else if (lv <= 2) { maxN = 5; useMinus = false }       // L1-2: 1..5  (trivial)
    else if (lv <= 5) { maxN = 10; useMinus = false }      // L3-5: 1..10
    else if (lv <= 10) { maxN = 20; useMinus = false }     // L6-10: 1..20, + only
    else { maxN = 20; useMinus = true }                    // L11+: add subtraction
    var op = (useMinus && Math.random() < 0.5) ? '-' : '+'
    var a, b, ans
    if (op === '+') { a = randInt(1, maxN); b = randInt(1, maxN); ans = a + b }
    else { a = randInt(2, maxN); b = randInt(1, a); ans = a - b }   // b ≤ a → never negative
    var question = a + ' ' + op + ' ' + b + ' = ?'
    // 3 distractors near the answer (never negative, never duplicate)
    var wrong = {}
    var guard = 0
    while (Object.keys(wrong).length < 3 && guard++ < 40) {
      var d = randInt(1, 8)
      var w = ans + (Math.random() < 0.5 ? d : -d)
      if (w !== ans && w > 0) wrong[w] = 1
    }
    var pad = 1
    while (Object.keys(wrong).length < 3 && pad < 100) {
      var v = ans + pad
      if (v !== ans && v > 0) wrong[v] = 1
      pad++
    }
    var options = shuffle([ans].concat(Object.keys(wrong).map(Number))).slice(0, 4)
    if (options.indexOf(ans) === -1) options[0] = ans   // defensive: answer always present
    return { question: question, answer: ans, options: shuffle(options) }
  }

  function generate (opts) {
    opts = opts || {}
    if (opts.question != null && opts.options) {
      return { question: opts.question, answer: opts.answer, options: opts.options }
    }
    if (opts.type === 'makeMath' && typeof global.makeMathQuestion === 'function') {
      try {
        var r = global.makeMathQuestion(opts.level || 1, opts.max || 20, opts.difficulty || 'easy')
        if (r && r.q != null && r.choices) return { question: r.q, answer: r.ans, options: r.choices }
      } catch (_) {}
    }
    return mathQuestion(opts)
  }

  // Wire a built choices element: tap → lock → reveal → callback after delay.
  function wireChoices (choicesEl, answer, reveal, onResult) {
    var locked = false
    Array.prototype.forEach.call(choicesEl.children, function (btn) {
      btn.addEventListener('click', function () {
        if (locked) return
        locked = true
        var chosen = btn.textContent
        var correct = String(chosen) === String(answer)
        Array.prototype.forEach.call(choicesEl.children, function (b) {
          if (String(b.textContent) === String(answer)) b.classList.add('qz-correct')
          else if (b === btn && !correct) b.classList.add('qz-wrong')
          b.style.pointerEvents = 'none'
        })
        var delay = correct ? (reveal.correct || 420) : (reveal.wrong || 720)
        setTimeout(function () {
          if (typeof onResult === 'function') onResult({ correct: correct, chosen: chosen, answer: answer })
        }, delay)
      })
    })
  }

  function buildPills (choicesEl, options) {
    choicesEl.innerHTML = ''
    options.forEach(function (opt) {
      var b = document.createElement('button')
      b.className = 'qz-pill'
      b.type = 'button'
      b.textContent = opt
      choicesEl.appendChild(b)
    })
  }

  // Least-invasive adoption: fill EXISTING question + choices elements.
  function fill (questionEl, choicesEl, opts, onResult) {
    injectCSS()
    if (typeof questionEl === 'string') questionEl = document.getElementById(questionEl)
    if (typeof choicesEl === 'string') choicesEl = document.getElementById(choicesEl)
    if (!questionEl || !choicesEl) return null
    opts = opts || {}
    var data = (opts.question != null && opts.options) ? opts : generate(opts)
    questionEl.classList.add('qz-question')
    questionEl.textContent = data.question
    choicesEl.classList.add('qz-choices')
    if (opts.variant === 'mini' || opts.grid) choicesEl.classList.add('qz-grid')
    buildPills(choicesEl, data.options)
    wireChoices(choicesEl, data.answer, opts.revealMs || {}, onResult)
    return { data: data }
  }

  // New adopters: build the structure inside a single host.
  function ask (host, opts, onResult) {
    injectCSS()
    if (typeof host === 'string') host = document.getElementById(host)
    if (!host) return null
    opts = opts || {}
    host.classList.add('qz-panel', 'qz-' + (opts.variant || 'overlay'))
    host.innerHTML = ''
    if (opts.label) { var lab = document.createElement('div'); lab.className = 'qz-label'; lab.textContent = opts.label; host.appendChild(lab) }
    var qEl = document.createElement('div'); host.appendChild(qEl)
    var cEl = document.createElement('div'); host.appendChild(cEl)
    var r = fill(qEl, cEl, opts, onResult)
    return {
      data: r && r.data,
      close: function () { host.classList.remove('qz-panel', 'qz-' + (opts.variant || 'overlay')); host.innerHTML = '' }
    }
  }

  global.QuizEngine = {
    version: '1.0.0',
    generate: generate,
    mathQuestion: mathQuestion,
    fill: fill,
    ask: ask,
    injectCSS: injectCSS
  }
})(typeof window !== 'undefined' ? window : this)
