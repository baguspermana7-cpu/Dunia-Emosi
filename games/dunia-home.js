/* games/dunia-home.js — window.DuniaHome: one Home button back to Dunia Emosi's landing page (owner 2026-10-17:
 * "di setiap game baru — Mojo, Garasi Tempur, Blippi, Lokomotif Pemberani — pastikan ada tombol home").
 *   DuniaHome.mount({ visible: () => bool, top, left, right, onHome, into })
 *   into: an element (or selector) to sit in as its FIRST child, in the flow of a header bar (never covers it);
 *   without it the button floats fixed at top / left.
 * A round house button with a "Rumah" label, shown only while visible() says the page is on a menu screen (never in
 * the middle of play, where a small hand would tap it by accident). Checked 4x a second, cheap; no emoji (owner rule:
 * an SVG house). Tapping runs onHome (the game's own save/hush) and then goes to ../index.html.
 */
;(function (W, D) {
  'use strict'
  if (W.DuniaHome) return
  var HOUSE = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M7 24 L24 9 L41 24" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M12 21 V40 H36 V21" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linejoin="round"/><path d="M20 40 V29 H28 V40" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/></svg>'
  function mount (o) {
    o = o || {}
    var b = D.createElement('button')
    b.type = 'button'; b.className = 'dunia-home'; b.setAttribute('aria-label', 'Kembali ke beranda Dunia Emosi')
    b.innerHTML = HOUSE + '<span>Rumah</span>'
    var pos = 'top:' + (o.top || 'calc(10px + env(safe-area-inset-top, 0px))') + ';' + (o.right ? 'right:' + o.right : 'left:' + (o.left || 'calc(12px + env(safe-area-inset-left, 0px))'))
    var host = typeof o.into === 'string' ? D.querySelector(o.into) : o.into
    b.style.cssText = (host ? 'position:relative;flex:0 0 auto;margin-right:8px;' : 'position:fixed;' + pos + ';z-index:' + (o.z || 2000) + ';') + 'display:none;flex-direction:column;align-items:center;justify-content:center;gap:1px;' +
      'width:60px;height:60px;padding:0;border:3px solid #fff;border-radius:50%;background:linear-gradient(#FFD45C,#F5A623);color:#5A3300;' +
      'box-shadow:0 4px 0 #B86E00,0 8px 16px rgba(0,0,0,.28);cursor:pointer;font:900 11px/1 Nunito,system-ui,sans-serif;-webkit-tap-highlight-color:transparent;touch-action:manipulation'
    var svg = b.querySelector('svg'); svg.style.cssText = 'width:28px;height:28px;display:block'
    b.addEventListener('click', function () {
      try { if (o.onHome) o.onHome() } catch (e) {}
      location.href = o.href || '../index.html'
    })
    function attach () {
      if (b.parentNode) return
      if (!host && typeof o.into === 'string') host = D.querySelector(o.into)
      if (host) host.insertBefore(b, host.firstChild); else if (D.body && !o.into) D.body.appendChild(b)
    }
    var last = null
    function tick () {
      attach()
      var v = false; try { v = !!(o.visible ? o.visible() : true) } catch (e) { v = false }
      if (v !== last) { b.style.display = v ? 'flex' : 'none'; last = v }
    }
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', tick); else tick()
    setInterval(tick, 250)
    return b
  }
  W.DuniaHome = { mount: mount }
})(window, document)
