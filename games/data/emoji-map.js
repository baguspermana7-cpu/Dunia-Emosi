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
    // v59.72 — g14 obstacle/pickup gap-fills so balapan-kereta has ZERO canvas emoji.
    '⚠️': 'extra/7', '🛑': 'extra/7', '🚸': 'extra/7', '🚖': 'vehicles/4', '❤️': 'eco:heart', '❤': 'eco:heart',
    '💔': 'eco:heart-empty',   // v59.74 — lose-a-life flash (g14) renders as the empty-heart sprite
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

    // ── UI icon pack (assets/db/ui, owner-generated sheet 1) ──
    '🔒': 'ui/1', '🔐': 'ui/1', '⏸': 'ui/2', '▶': 'ui/3', '⏯': 'ui/3', '⏮': 'ui/4', '⏭': 'ui/5',
    '⏪': 'ui/6', '◀': 'ui/6', '🔙': 'ui/16', '⏹': 'ui/7', '⏺': 'ui/7', '🔊': 'ui/8', '🔉': 'ui/8', '🔈': 'ui/8', '🔇': 'ui/9',
    '📳': 'ui/10', '📴': 'ui/10', '⚙': 'ui/11', '🏠': 'ui/12', '🏡': 'ui/12', '🗺': 'ui/13',
    '🔄': 'ui/14', '🔃': 'ui/14', '🔁': 'ui/15', '🔂': 'ui/15', '↩': 'ui/16', '↪': 'ui/16',
    '✅': 'ui/17', '☑': 'ui/17', '✔': 'ui/17', '❌': 'ui/18', '✖': 'ui/18', '❎': 'ui/18',
    '⚠': 'ui/19', '🚨': 'ui/20', '🆘': 'ui/21', '🔍': 'ui/22', '🔎': 'ui/22', '🗑': 'ui/23',
    '📝': 'ui/24', '✍': 'ui/25', '⬆': 'ui/26', '🔼': 'ui/26', '⬇': 'ui/27', '🔽': 'ui/27',
    '⬅': 'ui/28', '➡': 'ui/29', '👆': 'ui/30', '☝': 'ui/30', '🏁': 'ui/31', '🚦': 'ui/32', '🚥': 'ui/32',
    '🟢': 'ui/33', '🟩': 'ui/33', '🔴': 'ui/34', '🟥': 'ui/34', '🟡': 'ui/35', '🟨': 'ui/35',
    '⏱': 'ui/36', '⏲': 'ui/36', '⏳': 'ui/37', '⌛': 'ui/37', '📅': 'ui/38', '📆': 'ui/38',
    '📊': 'ui/39', '📈': 'ui/39', '🎯': 'ui/40', '❓': 'ui/41', '❔': 'ui/41', '🔢': 'ui/42',
    '🔤': 'ui/43', '🔡': 'ui/43', '🔠': 'ui/43', '🎵': 'ui/44', '🎶': 'ui/44', '🎮': 'ui/45',
    '🕹': 'ui/45', '📤': 'ui/46', '📥': 'ui/46', '🔗': 'ui/47',

    // ── extra pack (assets/db/extra, owner clean 6×6 sheet) — scenes/props/actions ──
    '🏛': 'extra/1', '🏙': 'extra/2', '🌆': 'extra/2', '🏖': 'extra/3', '🏝': 'extra/3', '🌉': 'extra/4',
    '🌁': 'extra/4', '🏫': 'extra/5', '🚧': 'extra/7', '🏗': 'extra/9', '♨': 'extra/10', '🌑': 'extra/11',
    '🌌': 'extra/12', '🌃': 'extra/12', '🌬': 'extra/13', '🌧': 'extra/15', '⛈': 'extra/15', '🌦': 'extra/15',
    '🤝': 'extra/17', '🏃': 'extra/18', '💪': 'extra/20', '⚕': 'extra/21', '🤔': 'extra/22', '🎓': 'extra/23',
    '🧠': 'extra/25', '🎭': 'extra/26', '🃏': 'extra/28', '🪝': 'extra/30', '🐾': 'extra/31', '🐚': 'extra/34',
    '🛢': 'extra/37', '⛓': 'extra/38', '🔱': 'extra/39', '🛺': 'extra/41', '📍': 'extra/42',
    '💀': 'extra/46', '☠': 'extra/46', '🎲': 'extra/47', '🍳': 'extra/48', '🐦': 'extra/49', '🕊': 'extra/49',
    '🦐': 'creatures/55', '🦞': 'creatures/55',   // shrimp/lobster → crab sprite (nearest crustacean, decorative ambient only)
    '🪼': 'creatures/56', '🦑': 'creatures/54', '🦭': 'creatures/53', '🏊': 'people/1',   // ambient sea decor: jellyfish(exact)/squid→octopus/seal→dolphin/diver→person

    // ── people pack (assets/db/people, owner sheet 3) — friendly avatars.
    //    Decorative person chrome (not quiz content) → generic-avatar match is fine. ──
    '👤': 'people/1', '👥': 'people/1', '🧑': 'people/1', '🙋': 'people/1', '👦': 'people/2',
    '🧒': 'people/3', '👧': 'people/3', '👨': 'people/4', '👩': 'people/5', '👫': 'people/6',
    '👪': 'people/6', '👨‍👩‍👧': 'people/6',

    // ── misc pack (assets/db/misc, owner-generated sheet 4) ──
    '⚔': 'misc/1', '🗡': 'misc/1', '🎒': 'misc/2', '🧮': 'misc/4', '🎨': 'misc/5', '🖼': 'misc/7',
    '🔬': 'misc/8', '⛏': 'misc/10', '👾': 'misc/15', '🐋': 'misc/18', '🐳': 'misc/18', '🐱': 'misc/19',
    '🐈': 'misc/19', '🍜': 'misc/21', '🛒': 'misc/24', '📦': 'misc/25', '🗂': 'misc/26', '📁': 'misc/26',
    '🛸': 'misc/28', '🛂': 'misc/29', '💗': 'misc/30', '💖': 'misc/30', '💕': 'misc/30', '💝': 'misc/30',
    '🚌': 'misc/31', '🚍': 'misc/31',

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
