/* =============================================================================
 * kereta-cam.js — how Linus is drawn on the Brave Locomotive board.
 * Owner 2026-10-11: "Yg grid jangan tampak atas terus ... tampak samping asset, diagonal" then, seeing a tilted
 * board, "Gridnya jangan dimiring2in" and "pakai yg gambar linus tampak miring dari depan diagonal ... accurate
 * positioning ... henrynya kayak 2d di arena 3d aneh".
 * So the board stays flat, and Linus stops being a top-down sprite among standing characters: he STANDS on his
 * cell like the cast, wheels on the rail line, using the view that matches where he is heading:
 *   east  front-34r (front-diagonal, nose to the right)     west  front-34l
 *   south front (coming towards the child)                  north rear (going away)
 * A level or beat may still ask for the old top-down sprite with  view: 'top'.
 * Pure presentation: the grid, the solver, the run and every tap target are untouched.
 * Loaded after data/kereta-pack.js; it wraps that pack's scene() and hero(), nothing else.
 * ==========================================================================*/
(function (W) {
  'use strict'
  var P = W.MojoPack, def = P && P.def
  if (!def || def.id !== 'kereta') return
  var HD = ['n', 'e', 's', 'w']
  var STAND = { n: 'rear', e: 'front-34r', s: 'front', w: 'front-34l' }
  var cam = 'stand'
  function lib (k) { return (W.AssetIndex && W.AssetIndex.path && W.AssetIndex.path(k)) || ('../assets/db/lib/' + k + '.webp') }
  function heading (h) { return typeof h === 'number' ? HD[((h % 4) + 4) % 4] : (HD.indexOf(h) >= 0 ? h : 'e') }
  function camOf (lv, bi) {
    var b = lv && lv.beats && lv.beats[bi || 0]
    return ((b && b.view) || (lv && lv.view)) === 'top' ? 'top' : 'stand'
  }

  var scene0 = def.scene
  def.scene = function (lv, bi) {
    cam = camOf(lv, bi)
    return scene0.apply(this, arguments)
  }
  var hero0 = def.hero
  def.hero = function (form, view, h) {
    // only the board's hero changes; menus and cards keep the pack's own picture
    if (form !== 'linus' || view !== 'top' || cam === 'top') return hero0.apply(this, arguments)
    var d = heading(h)
    return '<img class="owner-mojo owner-linus owner-stand st-' + d + '" src="' + lib('train-char/linus/' + STAND[d]) + '" alt="">'
  }
  // Mojo's own UI strings ("Pesan Bo ›", "Misi selesai bersama Bo", "Ide untuk Mojo", alt and aria labels) are
  // written straight into the page, past the engine's nm(). Rename them wherever they appear, as the DOM changes.
  var NAR = (def.narrator && def.narrator.name) || 'Henry', HERO = def.heroName || 'Linus'
  var RX = /\bBo\b|\bMojo\b/
  function fix (t) { return t.replace(/\bBo\b/g, NAR).replace(/\bMojo\b/g, HERO) }
  function sweep (root) {
    if (!root || root.nodeType === 3) { if (root && RX.test(root.nodeValue)) root.nodeValue = fix(root.nodeValue); return }
    if (root.nodeType !== 1 || root.tagName === 'SCRIPT' || root.tagName === 'STYLE') return
    ;['alt', 'aria-label', 'title', 'placeholder'].forEach(function (a) { var v = root.getAttribute(a); if (v && RX.test(v)) root.setAttribute(a, fix(v)) })
    var w = W.document.createTreeWalker(root, 5, null), n
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) { if (RX.test(n.nodeValue)) n.nodeValue = fix(n.nodeValue) }
      else ['alt', 'aria-label', 'title', 'placeholder'].forEach(function (a) { var v = n.getAttribute(a); if (v && RX.test(v)) n.setAttribute(a, fix(v)) })
    }
  }
  function watch () {
    sweep(W.document.body)
    new W.MutationObserver(function (list) {
      list.forEach(function (m) {
        if (m.type === 'characterData') sweep(m.target)
        else if (m.type === 'attributes') sweep(m.target)
        else Array.prototype.forEach.call(m.addedNodes, sweep)
      })
    }).observe(W.document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['alt', 'aria-label', 'title', 'placeholder'] })
  }
  if (W.document.body) watch(); else W.document.addEventListener('DOMContentLoaded', watch)
  def.cam = function () { return cam }
  def.camOf = camOf
})(window)
