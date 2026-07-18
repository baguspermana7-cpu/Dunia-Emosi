/* ============================================================================
 * mascot-sprites.js — window.Mascots. Owner's 12-character mascot/hero sheet
 * (assets/db/mascots/001..012.webp) turned into named, emoji-fallback sprites.
 *
 * Any element with data-mascot="<name>" gets its emoji swapped for the sprite
 * image; on load error the original emoji text is restored (never hard-breaks).
 *
 *   Mascots.path('kodok')   -> 'assets/db/mascots/001.webp'  (base-path aware)
 *   Mascots.applyAll(root?) -> swap every [data-mascot] under root (default: document)
 * ==========================================================================*/
(function () {
  'use strict'
  var W = (typeof window !== 'undefined' ? window : globalThis)
  if (W.Mascots) return

  // name -> sheet cell (1-based). Order = owner's sheet numbering.
  var MAP = {
    'kodok': 1, 'sapi': 2, 'burung-beo': 3, 'keong': 4, 'lebah': 5, 'burung-hantu': 6,
    'hero-anak': 7, 'hero-putri': 8, 'kelinci': 9, 'rubah': 10, 'panda': 11, 'bintang': 12
  }
  // emoji fallback if the sprite 404s (kept child-safe + on-theme)
  var EMOJI = {
    'kodok': '🐸', 'sapi': '🐮', 'burung-beo': '🦜', 'keong': '🐌',
    'lebah': '🐝', 'burung-hantu': '🦉', 'hero-anak': '🦸', 'hero-putri': '🦸‍♀️',
    'kelinci': '🐰', 'rubah': '🦊', 'panda': '🐼', 'bintang': '⭐'
  }

  function base () {
    return (typeof location !== 'undefined' && location.pathname.indexOf('/Dunia-Emosi/') === 0) ? '/Dunia-Emosi/' : '/'
  }
  function path (name) {
    var n = MAP[name]; if (!n) return null
    // build directly — 'mascots' is NOT a DBSprites-registered category, so do not
    // delegate (DBSprites.path returns null for unknown categories and we'd bail).
    return base() + 'assets/db/mascots/' + ('00' + n).slice(-3) + '.webp'
  }
  function emoji (name) { return EMOJI[name] || '' }

  function apply (el) {
    if (!el || el.getAttribute('data-mascot-done')) return
    var name = el.getAttribute('data-mascot')
    var p = path(name); if (!p) return
    var fb = (el.textContent || emoji(name) || '').trim()
    el.setAttribute('data-mascot-done', '1')
    var img = new Image()
    img.alt = ''
    img.decoding = 'async'
    img.className = 'mascot-sprite'
    img.style.cssText = 'width:1.08em;height:1.08em;vertical-align:middle;object-fit:contain;display:inline-block'
    img.onerror = function () { el.removeAttribute('data-mascot-done'); el.textContent = fb }
    el.textContent = ''
    el.appendChild(img)
    img.src = p
  }
  function applyAll (root) {
    root = root || (typeof document !== 'undefined' ? document : null); if (!root) return
    var els = root.querySelectorAll('[data-mascot]')
    for (var i = 0; i < els.length; i++) apply(els[i])
  }

  W.Mascots = {
    path: path, emoji: emoji, apply: apply, applyAll: applyAll,
    names: function () { var k = []; for (var m in MAP) if (MAP.hasOwnProperty(m)) k.push(m); return k },
    _map: MAP
  }

  // auto-run once the DOM is ready (defer-loaded, so DOM is usually parsed already)
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { applyAll() })
    else applyAll()
  }
})();
