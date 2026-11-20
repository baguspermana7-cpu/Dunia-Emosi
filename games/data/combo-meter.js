/* =============================================================================
 * combo-meter.js — window.ComboMeter (PRD-37). The streak meter from G13b (`g13bShowCombo`, game.js) made shared:
 * three right answers in a row show "COMBO x3", every next one counts up, a wrong answer resets it. No emoji.
 *
 *   var cm = ComboMeter.create('kuis'[, {anchor: '#qcard'}])   one meter per game id; with an anchor the pill sits just
 *                                        above that element (so it never covers the game's story text), else top centre
 *   cm.ok()    -> the streak now (shows the pill from 3 on)
 *   cm.miss()  -> 0 (hides the pill)
 *   cm.streak  the current streak; cm.best() the child's best streak in this game (kept per child)
 * With prefers-reduced-motion the pill appears and changes without movement; the number is the same.
 * ==========================================================================*/
(function (W, D) {
  'use strict'
  if (W.ComboMeter) return
  var SHOW_FROM = 3

  function reduced () {
    try { return !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches) } catch (e) { return false }
  }
  // kept per child through the shared per-child save (save-engine.js avatarScopedGet/Set); a plain key without it
  function getBest (id) {
    try { var k = 'dunia-combo-best-' + id; return +((W.avatarScopedGet ? W.avatarScopedGet(k) : localStorage.getItem(k)) || 0) } catch (e) { return 0 }
  }
  function setBest (id, n) {
    try { var k = 'dunia-combo-best-' + id, v = String(n); if (W.avatarScopedSet) W.avatarScopedSet(k, v); else localStorage.setItem(k, v) } catch (e) {}
  }
  function css () {
    if (D.getElementById('combo-meter-css')) return
    var s = D.createElement('style'); s.id = 'combo-meter-css'
    s.textContent =
      '.combo-meter{position:fixed;left:50%;top:max(64px,9vh);z-index:60;transform:translateX(-50%);pointer-events:none;' +
      'display:flex;align-items:baseline;gap:8px;padding:8px 18px 9px;border-radius:999px;background:linear-gradient(180deg,#ffb347,#f0752a);' +
      'box-shadow:0 6px 0 #b4501a,0 10px 22px rgba(0,0,0,.28);color:#fff;font-family:inherit;font-weight:900;letter-spacing:.04em;opacity:0;' +
      'transition:opacity .18s ease}' +
      '.combo-meter.on{opacity:1}' +
      '.combo-meter b{font-size:clamp(20px,5.4vw,30px);line-height:1}.combo-meter span{font-size:clamp(13px,3.4vw,16px);opacity:.92}' +
      '.combo-meter.bump{animation:comboMeterBump .32s cubic-bezier(.3,1.6,.5,1)}' +
      '@keyframes comboMeterBump{0%{transform:translateX(-50%) scale(.82)}60%{transform:translateX(-50%) scale(1.12)}100%{transform:translateX(-50%) scale(1)}}' +
      '@media (prefers-reduced-motion: reduce){.combo-meter,.combo-meter.bump{animation:none;transition:none}}'
    ;(D.head || D.documentElement).appendChild(s)
  }

  function create (id, opt) {
    id = String(id || 'game')
    opt = opt || {}
    var el = null, hideT = 0
    var m = { streak: 0 }
    function pill () {
      if (el && el.isConnected) return el
      css()
      el = D.createElement('div'); el.className = 'combo-meter'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite')
      el.innerHTML = '<span>COMBO</span><b>x0</b>'
      D.body.appendChild(el)
      return el
    }
    m.ok = function () {
      m.streak++
      if (m.streak > getBest(id)) setBest(id, m.streak)
      if (m.streak >= SHOW_FROM) {
        var p = pill()
        p.querySelector('b').textContent = 'x' + m.streak
        place(p)
        p.classList.add('on')
        if (!reduced()) { p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump') }
        clearTimeout(hideT); hideT = setTimeout(function () { if (el) el.classList.remove('on') }, 2600)
      }
      return m.streak
    }
    function place (p) {
      var a = typeof opt.anchor === 'string' ? D.querySelector(opt.anchor) : opt.anchor
      if (!a || !a.getBoundingClientRect) { p.style.top = ''; return }
      var r = a.getBoundingClientRect(), h = p.offsetHeight || 44
      p.style.top = Math.max(8, Math.round(r.top - h - 8)) + 'px'
    }
    m.miss = function () {
      m.streak = 0
      clearTimeout(hideT)
      if (el) el.classList.remove('on', 'bump')
      return 0
    }
    m.best = function () { return getBest(id) }
    m.el = function () { return el }
    return m
  }

  W.ComboMeter = { create: create, SHOW_FROM: SHOW_FROM }
})(window, document)
