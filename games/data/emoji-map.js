/* ============================================================================
 * emoji-map.js — window.EmojiMap. Single source of truth: emoji char → sprite.
 *
 * Value form (string):
 *   'creatures/28'  → assets/db/creatures/028.webp  (direct DB category/index)
 *   'eco:star'      → resolved via UISprites pack map → assets/db/eco/018.webp
 *
 * Only CONFIDENT, kid-recognizable mappings (educational — never a wrong picture).
 * Anything not here returns null → the resolver leaves the emoji AND records it as
 * a GAP (owner then generates the missing art). Variation-selectors (U+FE0F) and
 * the keycap combiner are normalized away before lookup.
 *
 *   EmojiMap.get('🦁')   → 'creatures/28'
 *   EmojiMap.spec('🦁')  → { cat:'creatures', n:28 }   (null if unmapped)
 *   EmojiMap.has('🦁')   → true
 *   EmojiMap.chars()     → array of every mapped emoji char
 * ==========================================================================*/
(function () {
  'use strict'
  var W = (typeof window !== 'undefined' ? window : globalThis)
  if (W.EmojiMap) return

  // char → 'cat/index' (assets/db) OR 'pack:name' (UISprites pack)
  var M = {
    // ── Trains + vehicles (assets/db/vehicles) ──
    '🚂': 'vehicles/51', '🚃': 'vehicles/51', '🚋': 'vehicles/51', '🚆': 'vehicles/51',
    '🚄': 'vehicles/51', '🚅': 'vehicles/51', '🚈': 'vehicles/51', '🚝': 'vehicles/51',
    '🚞': 'vehicles/51', '🚇': 'vehicles/51', '🚊': 'vehicles/51', '🚉': 'vehicles/51',
    '🚀': 'vehicles/60', '🚗': 'vehicles/41', '🚘': 'vehicles/41', '🚙': 'vehicles/41',
    '🚕': 'vehicles/4', '🚑': 'vehicles/10', '🚒': 'vehicles/19', '🚓': 'vehicles/18',
    '🚔': 'vehicles/18', '🚜': 'vehicles/23', '🚲': 'vehicles/28', '🏍': 'vehicles/30',
    '🚚': 'vehicles/46', '🚛': 'vehicles/46', '🚐': 'vehicles/46', '🚁': 'vehicles/58',
    '✈': 'vehicles/57', '🛩': 'vehicles/57', '⛵': 'vehicles/54', '🚢': 'vehicles/55',
    '🛥': 'vehicles/55', '⚓': 'vehicles/55',

    // ── Animals (assets/db/creatures) ──
    '🦁': 'creatures/28', '🐯': 'creatures/29', '🐅': 'creatures/29', '🐆': 'creatures/30',
    '🐘': 'creatures/31', '🦒': 'creatures/32', '🦓': 'creatures/33', '🐴': 'creatures/34',
    '🐎': 'creatures/34', '🐄': 'creatures/37', '🐮': 'creatures/37', '🐐': 'creatures/38',
    '🐑': 'creatures/40', '🐏': 'creatures/40', '🐷': 'creatures/41', '🐖': 'creatures/41',
    '🐵': 'creatures/42', '🐒': 'creatures/42', '🦍': 'creatures/43', '🦘': 'creatures/44',
    '🐪': 'creatures/45', '🐫': 'creatures/45', '🦔': 'creatures/46', '🦌': 'creatures/47',
    '🐟': 'creatures/51', '🐠': 'creatures/51', '🐡': 'creatures/51', '🦈': 'creatures/52',
    '🐬': 'creatures/53', '🐙': 'creatures/54', '🦀': 'creatures/55', '🐸': 'creatures/58',
    '🐊': 'creatures/59', '🐌': 'creatures/60', '🐔': 'creatures/1', '🐓': 'creatures/1',
    '🐣': 'creatures/1', '🐤': 'creatures/1', '🦆': 'creatures/2', '🦢': 'creatures/3',
    '🦃': 'creatures/4', '🦉': 'creatures/5', '🦅': 'creatures/6', '🦩': 'creatures/7',
    '🦚': 'creatures/8', '🦜': 'creatures/9', '🐧': 'creatures/10', '🐶': 'creatures/12',
    '🐕': 'creatures/12', '🐰': 'creatures/13', '🐇': 'creatures/13', '🐭': 'creatures/14',
    '🐁': 'creatures/14', '🐹': 'creatures/16', '🐿': 'creatures/18', '🦊': 'creatures/21',
    '🐺': 'creatures/23', '🐻': 'creatures/24', '🐼': 'creatures/26', '🐨': 'creatures/27',
    '🐢': 'creatures/57', '🦄': 'emo:unicorn', '🐉': 'fx:dragon', '🐲': 'fx:dragon',

    // ── Fruit + food (assets/db/objects) ──
    '🍎': 'objects/1', '🍏': 'objects/1', '🍌': 'objects/2', '🍊': 'objects/3', '🍋': 'objects/3',
    '🥭': 'objects/4', '🍇': 'objects/5', '🍉': 'objects/6', '🍍': 'objects/7', '🍓': 'objects/8',
    '🍐': 'objects/10', '🍒': 'objects/11', '🥝': 'objects/12', '🥑': 'objects/13', '🥥': 'objects/16',
    '🍞': 'objects/21', '🥖': 'objects/21', '🍰': 'objects/22', '🎂': 'objects/22', '🍩': 'objects/23',
    '🧁': 'objects/24', '🍦': 'objects/25', '🍨': 'objects/25', '🍬': 'objects/26', '🍭': 'objects/26',
    '🍫': 'objects/27', '🍕': 'objects/28', '🍔': 'objects/29', '🥚': 'objects/30', '🥛': 'objects/32',
    '🧀': 'objects/33', '☕': 'objects/37', '🥗': 'objects/39',

    // ── Everyday objects (assets/db/objects) ──
    '⚽': 'objects/41', '📚': 'objects/42', '📖': 'objects/42', '📕': 'objects/42', '📗': 'objects/42',
    '📘': 'objects/42', '📙': 'objects/42', '🥄': 'objects/45', '⏰': 'objects/46', '⌚': 'objects/46',
    '☂': 'objects/49', '🌂': 'objects/49', '👜': 'objects/50', '👝': 'objects/50', '🎩': 'objects/51',
    '👟': 'objects/52', '👞': 'objects/52', '👕': 'objects/53', '👚': 'objects/53', '👓': 'objects/54',
    '🕶': 'objects/54', '✂': 'objects/56', '✏': 'objects/57', '🖊': 'objects/57', '🪑': 'objects/63',
    '🤖': 'objects/82',

    // ── Science + nature (assets/db/science) ──
    '🌍': 'science/4', '🌎': 'science/4', '🌏': 'science/4', '🔭': 'science/8', '🧲': 'science/10',
    '🔋': 'science/11', '🌋': 'science/16', '⛰': 'science/17', '🏔': 'science/17', '🧊': 'science/27',
    '🌵': 'science/34',

    // ── Veg / body / music / school (assets/db/words2) ──
    '🥕': 'words2/1', '🥬': 'words2/2', '🍅': 'words2/3', '🥔': 'words2/4', '🌽': 'words2/5',
    '🥦': 'words2/6', '🍆': 'words2/7', '🌶': 'words2/8', '🥒': 'words2/9', '🎃': 'words2/10',
    '🧅': 'words2/15', '✋': 'words2/32', '🖐': 'words2/32', '🦶': 'words2/33', '👁': 'words2/34',
    '👀': 'words2/34', '👃': 'words2/35', '👂': 'words2/36', '👄': 'words2/37', '👅': 'words2/37',
    '🦷': 'words2/38', '🎸': 'words2/60', '🥁': 'words2/61', '🎹': 'words2/62', '🎺': 'words2/63',
    '🎻': 'words2/64',

    // ── Economy / reward (UISprites: eco, badge, conf) ──
    '⭐': 'eco:star', '🌟': 'eco:star-sparkle', '✨': 'fx:sparkle', '💫': 'fx:glow', '⚡': 'eco:energy',
    '❤': 'eco:heart', '🧡': 'eco:heart', '💛': 'eco:heart', '💚': 'eco:heart', '💙': 'eco:heart',
    '💜': 'eco:heart', '🤍': 'eco:heart-empty', '🖤': 'eco:heart-empty', '💎': 'eco:gem', '🪙': 'eco:coin',
    '🔑': 'eco:key', '🗝': 'eco:key', '💰': 'eco:coin-stack', '🔥': 'fx:fire', '💧': 'fx:water',
    '🌊': 'fx:water', '🍃': 'fx:grass', '🌿': 'fx:grass', '☘': 'fx:grass', '🍀': 'fx:grass',
    '🔮': 'fx:psychic', '❄': 'fx:ice', '☃': 'fx:ice', '⛄': 'fx:ice', '💥': 'fx:hit', '💢': 'fx:normal',

    // ── Trophy / medal / crown (UISprites: badge) ──
    '🏆': 'badge:trophy', '🏅': 'badge:medal', '🥇': 'badge:medal', '🥈': 'badge:medal-silver',
    '🥉': 'badge:medal-bronze', '👑': 'badge:crown', '🎖': 'badge:rosette',

    // ── Celebration (UISprites: conf) ──
    '🎉': 'conf:hore', '🎊': 'conf:conf-pink', '🎆': 'conf:firework', '🎇': 'conf:firework',
    '🎈': 'conf:balloon-red', '🎁': 'conf:gift', '🎀': 'conf:ribbon',

    // ── Sky / decor (UISprites: deco) ──
    '☀': 'deco:sun', '🌞': 'deco:sun', '🌙': 'deco:moon', '🌛': 'deco:moon', '🌜': 'deco:moon',
    '🌕': 'deco:moon', '☁': 'deco:cloud', '⛅': 'deco:cloud', '🌤': 'deco:cloud', '🌳': 'deco:tree',
    '🌲': 'deco:tree', '🌴': 'deco:tree', '🌈': 'deco:rainbow', '🍄': 'deco:mushroom', '🌸': 'deco:flower-pink',
    '🌺': 'deco:flower-pink', '🌷': 'deco:flower-pink', '🌻': 'deco:flower-yellow', '🌼': 'deco:flower-yellow',
    '🌱': 'deco:grass', '🌾': 'deco:grass',

    // ── Emotion faces (UISprites: emo) ──
    '😀': 'emo:senang', '😃': 'emo:senang', '😄': 'emo:senang', '😁': 'emo:bahagia', '🙂': 'emo:senang',
    '😊': 'emo:senang', '😆': 'emo:bahagia', '😍': 'emo:kagum', '🤩': 'emo:kagum', '😢': 'emo:sedih',
    '😭': 'emo:sedih', '😞': 'emo:sedih', '😠': 'emo:marah', '😡': 'emo:marah', '🤬': 'emo:marah',
    '😨': 'emo:takut', '😱': 'emo:takut', '😰': 'emo:takut', '😲': 'emo:terkejut', '😮': 'emo:terkejut',
    '😳': 'emo:malu', '😊': 'emo:senang', '😑': 'emo:bosan', '😐': 'emo:bosan', '😤': 'emo:kesal',

    // ── extra content emoji that DO have an existing DB sprite (accurate) ──
    '🐥': 'creatures/1', '🐤': 'creatures/1', '🐣': 'creatures/1', '🏐': 'objects/41', '⚾': 'objects/41',
    '🏀': 'objects/41', '🏈': 'objects/41', '🎾': 'objects/41', '💨': 'fx:dust', '💡': 'objects/47',
    '🔨': 'objects/71', '🪨': 'fx:ground', '🌅': 'deco:sun', '🌄': 'deco:sun', '🏎': 'vehicles/41',
    '🛵': 'vehicles/30', '🚤': 'vehicles/55', '⛵': 'vehicles/54'
  }

  // Normalize: drop VS-15/16 + ZWJ tails + skin tones so '❤️' matches '❤'.
  function norm (ch) {
    return String(ch).replace(/[︎️]/g, '').replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '')
  }

  var NM = {}
  for (var k in M) if (M.hasOwnProperty(k)) NM[norm(k)] = M[k]

  function get (ch) { var v = NM[norm(ch)]; return v || null }
  function has (ch) { return !!get(ch) }
  function spec (ch) {
    var v = get(ch); if (!v) return null
    if (v.indexOf(':') > -1) {                        // pack:name → resolve index via UISprites
      var pn = v.split(':')
      if (W.UISprites && W.UISprites._pack && W.UISprites._pack[pn[0]]) {
        var n = W.UISprites._pack[pn[0]][pn[1]]
        if (n) return { cat: pn[0], n: n, pack: pn[0], name: pn[1] }
      }
      return null
    }
    var cn = v.split('/')
    return { cat: cn[0], n: parseInt(cn[1], 10) }
  }
  function chars () { var a = []; for (var c in M) if (M.hasOwnProperty(c)) a.push(c); return a }

  W.EmojiMap = { get: get, has: has, spec: spec, chars: chars, norm: norm, _raw: M }
})();
