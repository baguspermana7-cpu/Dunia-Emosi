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
  def.cam = function () { return cam }
  def.camOf = camOf
})(window)
