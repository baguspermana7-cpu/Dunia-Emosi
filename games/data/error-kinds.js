/**
 * DuniaErrorKinds — what kind of mistake a wrong maths answer is, and a hint that fits it
 * (docs/prd/PRD-13-petunjuk-sesuai-jenis-kesalahan.md).
 *
 *   DuniaErrorKinds.classify(q, picked) -> { kind: 'off-by-one' | 'swapped-op' | 'general', ... }
 *     q = a question from makeMathQuestionV2 ({ ans, shape, atom: {a, b, op} })
 *     swapped-op  only on 'standard' / 'word' questions (there the atom IS the question): 5 + 2 answered 3
 *     off-by-one  any numeric question: the answer was one away
 *     general     anything else: no specific hint is better than a wrong one
 *   DuniaErrorKinds.show(host, hint, q, picked) -> draws the hint just above host (fixed, on the page) (a number strip with an arrow for off-by-one,
 *     the operation sign with its word for swapped-op, a short line otherwise) and says it, if sound is on
 *   DuniaErrorKinds.clear(host)
 * Nothing here throws into a game.
 */
(function () {
  'use strict'
  var W = window
  if (W.DuniaErrorKinds) return
  var WORD = { '+': 'ditambah', '-': 'dikurangi', '*': 'dikali', '÷': 'dibagi' }
  var SIGN = { '+': '+', '-': '−', '*': '×', '÷': '÷' }

  function classify (q, picked) {
    try {
      var n = Number(picked), ans = Number(q && q.ans)
      if (!q || !isFinite(n) || !isFinite(ans) || String(picked).trim() === '') return { kind: 'general' }
      var x = q.atom, sh = q.shape || 'standard'
      if (x && (sh === 'standard' || sh === 'word')) {
        var a = +x.a, b = +x.b, other = null
        if (x.op === '+' && (n === a - b || n === b - a)) other = '-'
        else if (x.op === '-' && n === a + b) other = '+'
        else if (x.op === '*' && n === a + b) other = '+'
        else if (x.op === '÷' && n === a * b) other = '*'
        if (other) return { kind: 'swapped-op', op: x.op, used: other }
      }
      if (Math.abs(n - ans) === 1) return { kind: 'off-by-one', more: n > ans }
      return { kind: 'general' }
    } catch (e) { return { kind: 'general' } }
  }

  function text (h) {
    if (h.kind === 'off-by-one') return h.more ? 'Hampir! Kelebihan satu.' : 'Hampir! Kurang satu.'
    if (h.kind === 'swapped-op') return 'Lihat tandanya: ' + SIGN[h.op] + ' artinya ' + WORD[h.op] + '.'
    return 'Lihat jawaban yang benar, ya.'
  }
  function soundOn () { try { return localStorage.getItem('dunia-emosi-sound') !== 'off' } catch (e) { return true } }
  function say (s) {
    try {
      if (!soundOn() || !W.speechSynthesis) return
      var u = new SpeechSynthesisUtterance(s); u.lang = 'id-ID'; u.rate = 0.95
      W.speechSynthesis.cancel(); W.speechSynthesis.speak(u)
    } catch (e) {}
  }
  var CSS = '.dek{position:fixed;left:50%;top:8px;transform:translateX(-50%);z-index:60;display:flex;flex-direction:column;align-items:center;gap:6px;' +
    'background:#fffaf0;border:3px solid #f59e0b;border-radius:18px;padding:8px 14px;box-shadow:0 6px 16px rgba(0,0,0,.25);pointer-events:none;max-width:min(92vw,420px);' +
    'animation:dek-in .2s cubic-bezier(.23,1,.32,1)}' +
    '.dek p{margin:0;font:800 18px/1.2 "Fredoka One","Nunito",sans-serif;color:#7c2d12;text-align:center}' +
    '.dek .row{display:flex;gap:6px;align-items:flex-end}' +
    '.dek .n{position:relative;width:40px;height:40px;border-radius:10px;background:#fff;border:2px solid #d6d3d1;display:flex;align-items:center;justify-content:center;font:800 20px "Fredoka One",sans-serif;color:#44403c}' +
    '.dek .n.pick{border-color:#dc2626;color:#b91c1c;background:#fee2e2}.dek .n.ans{border-color:#15803d;color:#fff;background:#16a34a}' +
    '.dek .n.ans::after{content:"";position:absolute;top:-14px;left:50%;margin-left:-7px;border:7px solid transparent;border-top-color:#16a34a}' +
    '.dek .op{width:56px;height:56px;border-radius:50%;background:#16a34a;color:#fff;display:flex;align-items:center;justify-content:center;font:800 36px "Fredoka One",sans-serif}' +
    '@keyframes dek-in{from{opacity:0;transform:translateX(-50%) scale(.95)}}' +
    '@media (prefers-reduced-motion:reduce){.dek{animation:none}}'
  function style () {
    if (document.getElementById('dek-css')) return
    var s = document.createElement('style'); s.id = 'dek-css'; s.textContent = CSS; document.head.appendChild(s)
  }
  function clear () { try { var o = document.querySelector('.dek'); if (o) o.remove() } catch (e) {} }
  function show (host, h, q, picked) {
    try {
      if (!host || !h) return null
      style(); clear(host)
      var box = document.createElement('div'); box.className = 'dek'; box.dataset.kind = h.kind
      if (h.kind === 'off-by-one') {
        var ans = Number(q.ans), n = Number(picked), lo = Math.max(0, Math.min(ans, n) - 1), row = document.createElement('div')
        row.className = 'row'
        for (var v = lo; v <= lo + 3; v++) {
          var c = document.createElement('div'); c.className = 'n' + (v === ans ? ' ans' : v === n ? ' pick' : ''); c.textContent = String(v); row.appendChild(c)
        }
        box.appendChild(row)
      } else if (h.kind === 'swapped-op') {
        var o = document.createElement('div'); o.className = 'op'; o.textContent = SIGN[h.op]; box.appendChild(o)
      }
      var p = document.createElement('p'); p.textContent = text(h); box.appendChild(p)
      // on the page itself (a game's card clips its children), just above the host, never off the screen
      document.body.appendChild(box)
      var hr = host.getBoundingClientRect(), bh = box.getBoundingClientRect().height
      box.style.top = Math.max(8, Math.min(innerHeight - bh - 8, hr.top - bh - 10)) + 'px'
      say(text(h))
      return box
    } catch (e) { return null }
  }

  W.DuniaErrorKinds = { classify: classify, show: show, clear: clear, text: text }
})()
