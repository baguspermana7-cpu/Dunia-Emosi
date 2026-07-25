/* ============================================================================
 * ui-sprites.js — window.UISprites. Owner's 6 UIUX/gameplay sprite packs
 * (assets/db/{eco,badge,fx,emo,deco,conf}/NNN.webp) as named, emoji-fallback sprites.
 *
 * Cells are mapped by POSITION (the AI sheet labels are unreliable). Any element
 * with data-uisprite="pack:name" gets its emoji swapped for the sprite; on load
 * error the original emoji text is restored (never hard-breaks).
 *
 *   UISprites.path('emo','senang')     -> 'assets/db/emo/001.webp'  (base-path aware)
 *   UISprites.applyAll(root?)          -> swap every [data-uisprite] under root
 * ==========================================================================*/
(function () {
  'use strict'
  var W = (typeof window !== 'undefined' ? window : globalThis)
  if (W.UISprites) return

  // pack -> { name: index (1-based sheet cell) }  — authored from the cropped montages
  var PACK = {
    eco: {
      coin: 1, 'coin-stack': 2, 'coin-bonus': 3, gem: 4, 'gem-sparkle': 5, 'gem-glow': 6, 'star-gold': 7,
      heart: 8, 'heart-half': 9, 'heart-empty': 10, energy: 11, 'energy-glow': 12, 'energy-hi': 13, badge1: 14,
      'star-empty': 15, 'star-1': 16, 'star-2': 17, star: 18, 'star-sparkle': 19, 'star-orange': 20, 'star-blue': 21,
      streak: 22, 'streak-big': 23, key: 24, chest: 25, 'chest-2': 26, 'chest-open': 27, 'chest-open2': 28
    },
    badge: {
      trophy: 1, 'trophy-silver': 2, 'trophy-bronze': 3, medal: 4, 'medal-gold2': 5, 'medal-silver': 6, 'medal-bronze': 7,
      'medal-bronze2': 8, crown: 9, 'crown-jewel': 10, 'crown-jewel2': 11, rosette: 12, winner: 13, 'winner2': 14,
      'rank-bronze': 15, 'rank-silver': 16, 'rank-gold': 17, 'rank-diamond': 18, 'star1': 19, 'star1b': 20, 'star2': 21,
      'star2b': 22, 'star3': 23, 'star3b': 24, juara: 25, first: 26, sparkle: 27, 'sparkle2': 28
    },
    fx: {
      fire: 1, water: 2, electric: 3, grass: 4, psychic: 5, ice: 6, dragon: 7,
      fairy: 8, 'dragon2': 9, 'fairy2': 10, bug: 11, steel: 12, normal: 13, ground: 14,
      'normal2': 15, 'ground2': 16, sparkle: 17, 'sparkle2': 18, twinkle: 19, burst: 20, dust: 21,
      'dust2': 22, confetti: 23, shockwave: 24, glow: 25, 'glow2': 26, hit: 27, plus: 28
    },
    emo: {
      // faces 1-10
      senang: 1, sedih: 2, marah: 3, takut: 4, terkejut: 5, malu: 6, bahagia: 7, bosan: 8, kesal: 9, kagum: 10,
      // animals 11-20
      singa: 11, kelinci: 12, harimau: 13, gajah: 14, rubah: 15, katak: 16, panda: 17, koala: 18, serigala: 19, unicorn: 20
    },
    deco: {
      sun: 1, 'sun-soft': 2, moon: 3, 'moon-full': 4, cloud: 5, 'cloud-small': 6, 'cloud-row': 7, tree: 8, 'tree-pine': 9, bush: 10,
      grass: 11, 'grass-tile': 12, firefly: 13, sparkle: 14, twinkle: 15, 'shooting-star': 16, rainbow: 17, 'flower-pink': 18, 'flower-yellow': 19, mushroom: 20
    },
    conf: {
      'conf-pink': 1, 'conf-blue': 2, 'conf-yellow': 3, 'conf-green': 4, 'conf-purple': 5, 'conf-red': 6, streamer: 7,
      popper: 8, 'balloon-red': 9, 'balloon-blue': 10, 'balloon-gold': 11, firework: 12, 'firework-pink': 13, sparkler: 14,
      'star-spray': 15, rain: 16, gift: 17, ribbon: 18, star: 19, hore: 20
    }
  }
  // emoji fallback per pack:name (only the ones actually wired need entries; others degrade to '')
  var EMOJI = {
    'eco:coin': '🪙', 'eco:gem': '💎', 'eco:heart': '❤️', 'eco:heart-empty': '🤍', 'eco:energy': '⚡',
    'eco:star': '⭐', 'eco:star-empty': '☆', 'eco:streak-big': '🔥', 'eco:streak': '🔥', 'eco:key': '🔑', 'eco:chest': '🎁',
    'badge:trophy': '🏆', 'badge:medal': '🏅', 'badge:crown': '👑', 'badge:first': '🥇', 'badge:juara': '🏆', 'badge:sparkle': '✨',
    'fx:fire': '🔥', 'fx:water': '💧', 'fx:electric': '⚡', 'fx:grass': '🍃', 'fx:psychic': '🔮', 'fx:ice': '❄️',
    'fx:dragon': '🐉', 'fx:fairy': '✨', 'fx:bug': '🌿', 'fx:steel': '⚔️', 'fx:normal': '💢', 'fx:ground': '🪨',
    'fx:sparkle': '✨', 'fx:confetti': '🎉', 'fx:glow': '💫', 'fx:hit': '💥',
    'deco:sun': '☀️', 'deco:moon': '🌙', 'deco:cloud': '☁️', 'deco:tree': '🌳', 'deco:rainbow': '🌈', 'deco:firefly': '✨',
    'conf:conf-pink': '🎊', 'conf:firework': '🎆', 'conf:star': '⭐', 'conf:gift': '🎁', 'conf:hore': '🎉', 'conf:balloon-red': '🎈'
  }

  function base () {
    return (typeof location !== 'undefined' && location.pathname.indexOf('/Dunia-Emosi/') === 0) ? '/Dunia-Emosi/' : '/'
  }
  function path (pack, name) {
    var p = PACK[pack]; if (!p) return null
    var n = p[name]; if (!n) return null
    return base() + 'assets/db/' + pack + '/' + ('00' + n).slice(-3) + '.webp'
  }
  function emoji (pack, name) { return EMOJI[pack + ':' + name] || '' }

  // ---- wiring maps + helpers (emoji -> pack sprite name; unmapped -> null -> keep emoji) ----
  var FX_TYPE = { fire:'fire', water:'water', electric:'electric', grass:'grass', psychic:'psychic',
    ice:'ice', dragon:'dragon', fairy:'fairy', bug:'bug', steel:'steel', normal:'normal', ground:'ground' }
  var BADGE_EMOJI = { '🏆':'trophy', '🥇':'medal', '🥈':'medal-silver', '🥉':'medal-bronze', '👑':'crown', '🏅':'medal' }
  var CONF_EMOJI = { '🎉':'hore', '🎊':'conf-pink', '🎈':'balloon-red', '🥳':'popper' }
  function fxName (type) { return FX_TYPE[(type || '').toLowerCase()] || null }
  function badgeName (e) { return BADGE_EMOJI[e] || null }
  function confName (e) { return CONF_EMOJI[e] || null }

  // build an <img> HTML string (for innerHTML/template sites). null if pack/name missing.
  // onerror restores the fallback emoji so a 404 never leaves a blank.
  function imgHTML (pack, name, opts) {
    opts = opts || {}
    var p = path(pack, name); if (!p) return null
    var fb = opts.emoji || emoji(pack, name) || ''
    var st = opts.style || 'width:1em;height:1em;object-fit:contain;vertical-align:middle;display:inline-block'
    var cls = opts.cls || 'ui-sprite'
    var oe = fb ? " onerror=\"this.onerror=null;this.outerHTML='" + fb + "'\"" : ''
    return '<img class="' + cls + '" alt="" decoding="async" src="' + p + '" style="' + st + '"' + oe + '>'
  }

  function apply (el) {
    if (!el || el.getAttribute('data-uisprite-done')) return
    var spec = (el.getAttribute('data-uisprite') || '').split(':')
    if (spec.length !== 2) return
    var p = path(spec[0], spec[1]); if (!p) return
    var fb = (el.textContent || emoji(spec[0], spec[1]) || '').trim()
    el.setAttribute('data-uisprite-done', '1')
    var img = new Image()
    img.alt = ''; img.decoding = 'async'; img.className = 'ui-sprite'
    img.style.cssText = 'width:1.05em;height:1.05em;vertical-align:middle;object-fit:contain;display:inline-block'
    img.onerror = function () { el.removeAttribute('data-uisprite-done'); el.textContent = fb }
    el.textContent = ''; el.appendChild(img); img.src = p
  }
  function applyAll (root) {
    root = root || (typeof document !== 'undefined' ? document : null); if (!root) return
    var els = root.querySelectorAll('[data-uisprite]')
    for (var i = 0; i < els.length; i++) apply(els[i])
  }

  // ── raw path for ANY assets/db category + index (not just named packs) ──
  function rawPath (cat, n) {
    if (!cat || !n) return null
    return base() + 'assets/db/' + cat + '/' + ('00' + n).slice(-3) + '.webp'
  }

  // ══════════════════════════════════════════════════════════════════════
  // ZERO-EMOJI universal resolver — walk text nodes app-wide, swap every
  // pictographic emoji for its DB sprite (via window.EmojiMap). Unmapped
  // emoji are left in place AND recorded to GAPS for the audit + owner art.
  // Fallback-safe: a 404 sprite restores the original emoji, never blank.
  // ══════════════════════════════════════════════════════════════════════
  var EMO_RE = /([\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2900}-\u{297F}\u{25A0}-\u{25FF}]️?\u{20E3}?)/gu
  var GAPS = {}                      // norm-char -> count of unmapped sightings
  var seenText = (typeof WeakSet !== 'undefined') ? new WeakSet() : null
  var SKIP_TAG = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, SELECT: 1, OPTION: 1, CANVAS: 1, NOSCRIPT: 1, CODE: 1, PRE: 1 }

  function emojiImgEl (ch) {
    var spec = W.EmojiMap && W.EmojiMap.spec ? W.EmojiMap.spec(ch) : null
    if (!spec) {                                     // unmapped → record gap, keep emoji
      if (W.EmojiMap) { var nk = W.EmojiMap.norm(ch); GAPS[nk] = (GAPS[nk] || 0) + 1 }
      return null
    }
    var src = rawPath(spec.cat, spec.n); if (!src) return null
    var img = new Image()
    img.alt = ''; img.decoding = 'async'; img.className = 'ui-sprite emoji-sprite'
    img.style.cssText = 'width:1em;height:1em;vertical-align:-0.15em;object-fit:contain;display:inline-block'
    img.onerror = function () { var t = document.createTextNode(ch); if (img.parentNode) img.parentNode.replaceChild(t, img) }
    img.src = src
    return img
  }

  function skipNode (el) {
    for (var p = el; p; p = p.parentNode) {
      if (p.nodeType !== 1) continue
      if (SKIP_TAG[p.tagName]) return true
      if (p.getAttribute && (p.getAttribute('data-no-emoji') !== null || p.isContentEditable)) return true
    }
    return false
  }

  function deEmojiTextNode (node) {
    if (!node || node.nodeType !== 3) return
    if (seenText && seenText.has(node)) return
    var txt = node.nodeValue
    if (!txt || !EMO_RE.test(txt)) { if (seenText) seenText.add(node); return }
    if (!node.parentNode || skipNode(node.parentNode)) { if (seenText) seenText.add(node); return }
    EMO_RE.lastIndex = 0
    var frag = document.createDocumentFragment()
    var last = 0, m, replaced = false
    while ((m = EMO_RE.exec(txt)) !== null) {
      var ch = m[1]
      var el = emojiImgEl(ch)
      if (last < m.index) frag.appendChild(document.createTextNode(txt.slice(last, m.index)))
      if (el) { frag.appendChild(el); replaced = true }
      else frag.appendChild(document.createTextNode(ch))   // unmapped → keep emoji text
      last = m.index + ch.length
    }
    if (last < txt.length) frag.appendChild(document.createTextNode(txt.slice(last)))
    if (replaced) { node.parentNode.replaceChild(frag, node) }
    else if (seenText) seenText.add(node)
  }

  function deEmoji (root) {
    root = root || (typeof document !== 'undefined' ? document.body : null)
    if (!root || typeof document === 'undefined') return
    if (root.nodeType === 3) { deEmojiTextNode(root); return }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return
    if (root.nodeType === 1 && skipNode(root)) return
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false)
    var batch = [], n
    while ((n = walker.nextNode())) batch.push(n)
    for (var i = 0; i < batch.length; i++) deEmojiTextNode(batch[i])
  }

  var _observer = null, _pending = null
  function schedule (nodes) {
    if (!_pending) _pending = []
    for (var i = 0; i < nodes.length; i++) _pending.push(nodes[i])
    if (schedule._t) return
    var run = function () {
      schedule._t = null
      var list = _pending; _pending = null
      if (!list) return
      for (var j = 0; j < list.length; j++) {
        var nd = list[j]
        if (nd.nodeType === 3) deEmojiTextNode(nd)
        else if (nd.nodeType === 1) deEmoji(nd)
      }
    }
    schedule._t = (W.requestAnimationFrame ? W.requestAnimationFrame(run) : setTimeout(run, 16))
  }

  function startObserver () {
    if (_observer || typeof MutationObserver === 'undefined' || !document.body) return
    _observer = new MutationObserver(function (muts) {
      var add = []
      for (var i = 0; i < muts.length; i++) {
        var mu = muts[i]
        if (mu.type === 'characterData') { if (mu.target) add.push(mu.target) }
        else for (var j = 0; j < mu.addedNodes.length; j++) {
          var nd = mu.addedNodes[j]
          if (nd.nodeType === 1 && nd.classList && nd.classList.contains('emoji-sprite')) continue
          if (nd.nodeType === 1 || nd.nodeType === 3) add.push(nd)
        }
      }
      if (add.length) schedule(add)
    })
    _observer.observe(document.body, { childList: true, subtree: true, characterData: true })
  }

  function gaps () { return JSON.parse(JSON.stringify(GAPS)) }

  // ── PixiJS canvas helper: build a PIXI.Sprite for an emoji when mapped ──
  // Returns a sized+anchored sprite (texture loads async, v8 PIXI.Sprite.from),
  // or null when the emoji has no DB sprite (caller keeps its PIXI.Text fallback).
  function pixiSprite (ch, size, PIXI) {
    if (!PIXI || !PIXI.Sprite) return null
    var sp = W.EmojiMap && W.EmojiMap.spec ? W.EmojiMap.spec(ch) : null
    if (!sp) { if (W.EmojiMap) { var nk = W.EmojiMap.norm(ch); GAPS[nk] = (GAPS[nk] || 0) + 1 } return null }
    var src = rawPath(sp.cat, sp.n); if (!src) return null
    var s
    try { s = PIXI.Sprite.from(src) } catch (_) { return null }
    if (size) { s.width = size; s.height = size }
    // default: keep top-left anchor (matches PIXI.Text) for drop-in position parity;
    // pass opts.center to anchor at 0.5 for particles positioned by their centre.
    if (arguments.length > 3 && arguments[3] && arguments[3].center && s.anchor && s.anchor.set) s.anchor.set(0.5)
    return s
  }

  W.UISprites = {
    path: path, rawPath: rawPath, emoji: emoji, apply: apply, applyAll: applyAll,
    imgHTML: imgHTML, fxName: fxName, badgeName: badgeName, confName: confName,
    deEmoji: deEmoji, emojiImgEl: emojiImgEl, gaps: gaps, pixiSprite: pixiSprite,
    packs: function () { var k = []; for (var m in PACK) if (PACK.hasOwnProperty(m)) k.push(m); return k },
    _pack: PACK
  }

  function boot () {
    applyAll(); deEmoji(document.body); startObserver()
    // safety re-sweeps: heavy game boots can inject/replace static DOM after the
    // first pass; catch anything the observer's rAF missed during the boot storm.
    setTimeout(function () { deEmoji(document.body) }, 600)
    if (W.addEventListener) W.addEventListener('load', function () { deEmoji(document.body) })
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot)
    else boot()
  }
})();
