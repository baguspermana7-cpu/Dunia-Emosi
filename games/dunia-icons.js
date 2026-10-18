/* games/dunia-icons.js — window.DuniaIcons: emoji in the page's text become drawn SVG icons (owner rule: no emoji in the
 * children's games; 2026-10-18 audit found ~220 in the markup of 14 games, plus the ones their scripts write).
 *
 * Every text node outside script / style / canvas / form fields is scanned; a known emoji (with or without its
 * variation selector) is replaced by <i class="dico" aria-hidden="true"><svg>…</svg></i>, 1.1em square, sitting on
 * the text baseline like the glyph did, so layouts do not move. Text written later (scores, toasts, dialogs) is
 * caught by a MutationObserver, batched once per frame. Unknown emoji are left as they are (never a blank).
 * Canvas text is not touched (a game drawing an emoji on its canvas has to stop doing that itself).
 */
;(function (W, D) {
  'use strict'
  if (W.DuniaIcons) return
  var S = function (body) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + body + '</svg>' }
  // simple two- or three-colour pictograms, readable at 14-24 px
  var I = {
    heart: S('<path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 4.3 2.5.7-1.3 2.2-2.5 4.3-2.5 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" fill="#E8434A" stroke="#A3222A" stroke-width="1.2"/><path d="M7 7.6c-1.3.3-2.1 1.5-2 2.8" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>'),
    star: S('<path d="M12 2.6l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" fill="#FFC83D" stroke="#C98A00" stroke-width="1.2" stroke-linejoin="round"/>'),
    bolt: S('<path d="M13.5 2L5 13.5h6L9.8 22 19 9.8h-6.2z" fill="#FFD23F" stroke="#C98A00" stroke-width="1.2" stroke-linejoin="round"/>'),
    trophy: S('<path d="M7 3h10v5a5 5 0 0 1-10 0z" fill="#FFC83D" stroke="#B87A00" stroke-width="1.2"/><path d="M7 5H4v1.5A3.5 3.5 0 0 0 7.5 10M17 5h3v1.5A3.5 3.5 0 0 1 16.5 10" fill="none" stroke="#B87A00" stroke-width="1.4"/><path d="M10.5 13h3v3.5h-3z" fill="#E0A21A"/><path d="M7.5 17h9l1 4h-11z" fill="#8A5A1E"/>'),
    medal: S('<path d="M7 2h4l2 6H9zM13 2h4l-2 6h-4z" fill="#3E7BE0"/><circle cx="12" cy="15" r="6" fill="#FFC83D" stroke="#B87A00" stroke-width="1.2"/><path d="M12 11.6l1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.1-2 1.1.4-2.3-1.7-1.6 2.3-.3z" fill="#fff" opacity=".85"/>'),
    coin: S('<circle cx="12" cy="12" r="9" fill="#FFC83D" stroke="#B87A00" stroke-width="1.3"/><circle cx="12" cy="12" r="6" fill="none" stroke="#E0A21A" stroke-width="1.2"/><path d="M12 8.5v7M10 10.2h3.3a1.4 1.4 0 0 1 0 2.8h-2.6a1.4 1.4 0 0 0 0 2.8H14" fill="none" stroke="#9A6400" stroke-width="1.3" stroke-linecap="round"/>'),
    gem: S('<path d="M6 4h12l4 5-10 12L2 9z" fill="#4FC3F7" stroke="#1B6FA8" stroke-width="1.2" stroke-linejoin="round"/><path d="M2 9h20M8.5 4L12 21 15.5 4" fill="none" stroke="#1B6FA8" stroke-width="1" opacity=".6"/>'),
    home: S('<path d="M3 11.5L12 4l9 7.5" fill="none" stroke="#8A4B12" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 10v10h13V10" fill="#FFD47A" stroke="#8A4B12" stroke-width="1.6"/><path d="M10 20v-5.5h4V20" fill="#C9642A"/>'),
    train: S('<rect x="5" y="3" width="14" height="14" rx="3" fill="#3E7BE0" stroke="#1D4C9E" stroke-width="1.2"/><rect x="7.5" y="5.5" width="9" height="4.5" rx="1" fill="#CFE6FF"/><circle cx="8.5" cy="13.5" r="1.3" fill="#FFE07A"/><circle cx="15.5" cy="13.5" r="1.3" fill="#FFE07A"/><path d="M7 21l2.5-3.5M17 21l-2.5-3.5" stroke="#555" stroke-width="1.6" stroke-linecap="round"/>'),
    station: S('<path d="M3 9l9-5 9 5z" fill="#C9642A"/><rect x="5" y="9" width="14" height="10" fill="#FFE2B0" stroke="#8A4B12" stroke-width="1.2"/><rect x="10" y="13" width="4" height="6" fill="#8A4B12"/><rect x="2" y="19" width="20" height="2" fill="#6B6B6B"/>'),
    bag: S('<path d="M8 8V6a4 4 0 0 1 8 0v2" fill="none" stroke="#7A4A1E" stroke-width="1.8"/><rect x="4" y="8" width="16" height="13" rx="3" fill="#E8833A" stroke="#9A4E14" stroke-width="1.2"/><rect x="8" y="12" width="8" height="4" rx="1" fill="#FFD9A8"/>'),
    close: S('<circle cx="12" cy="12" r="9.5" fill="#E8434A"/><path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>'),
    swords: S('<path d="M4 4l9 9M20 4l-9 9" stroke="#B8C4D6" stroke-width="2.6" stroke-linecap="round"/><path d="M4 4l9 9M20 4l-9 9" stroke="#6E7F99" stroke-width="1" stroke-linecap="round"/><path d="M8 14l2 2M16 14l-2 2" stroke="#8A5A1E" stroke-width="3" stroke-linecap="round"/><path d="M6 18l2.5-2.5M18 18l-2.5-2.5" stroke="#8A5A1E" stroke-width="2.4" stroke-linecap="round"/>'),
    sound: S('<path d="M4 9h4l5-4v14l-5-4H4z" fill="#3E7BE0" stroke="#1D4C9E" stroke-width="1.2" stroke-linejoin="round"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="#1D4C9E" stroke-width="1.8" stroke-linecap="round"/>'),
    warn: S('<path d="M12 3l10 18H2z" fill="#FFC83D" stroke="#B87A00" stroke-width="1.3" stroke-linejoin="round"/><path d="M12 9.5v5.5" stroke="#5A3A00" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="18" r="1.3" fill="#5A3A00"/>'),
    flag: S('<path d="M5 21V3" stroke="#555" stroke-width="2" stroke-linecap="round"/><path d="M6 4h13v9H6z" fill="#fff" stroke="#333" stroke-width="1"/><path d="M6 4h3.25v3H6zM12.5 4h3.25v3H12.5zM9.25 7h3.25v3H9.25zM15.75 7H19v3h-3.25zM6 10h3.25v3H6zM12.5 10h3.25v3H12.5z" fill="#222"/>'),
    wave: S('<path d="M2 14c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-2 5-1" fill="none" stroke="#2E86DE" stroke-width="2.4" stroke-linecap="round"/><path d="M2 19c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-2 5-1" fill="none" stroke="#5DADE2" stroke-width="2.2" stroke-linecap="round"/><path d="M6 9c1.5-3 4-4.5 7-3.5" fill="none" stroke="#2E86DE" stroke-width="2" stroke-linecap="round"/>'),
    candy: S('<circle cx="12" cy="12" r="5.5" fill="#FF6FA8" stroke="#B83B72" stroke-width="1.2"/><path d="M9 9.5c2 .8 4 .8 6 0M9 14.5c2-.8 4-.8 6 0" stroke="#fff" stroke-width="1.2" opacity=".8"/><path d="M6.5 12L2 8.5v7zM17.5 12L22 8.5v7z" fill="#FFB0D0" stroke="#B83B72" stroke-width="1"/>'),
    gear: S('<path d="M12 2.5l1.6 2.6 3-.6.6 3 2.6 1.6-1.3 2.9 1.3 2.9-2.6 1.6-.6 3-3-.6L12 21.5l-1.6-2.6-3 .6-.6-3-2.6-1.6 1.3-2.9-1.3-2.9 2.6-1.6.6-3 3 .6z" fill="#9AA7B8" stroke="#5B6779" stroke-width="1.1" stroke-linejoin="round"/><circle cx="12" cy="12" r="3.3" fill="#fff" stroke="#5B6779" stroke-width="1.1"/>'),
    fire: S('<path d="M12 22c-4.4 0-7-2.9-7-6.6 0-3.6 2.8-5.6 3.7-9.4 2 1.4 2.6 3.2 2.5 4.6C13 9 13.3 5.5 12.8 2c4 2.4 6.2 7 6.2 11.6C19 18.6 16.4 22 12 22z" fill="#FF7A1A" stroke="#C2410C" stroke-width="1.1"/><path d="M12 21c-1.8 0-3-1.3-3-3 0-2 1.6-2.8 2.2-4.6 1.6 1.4 3.8 2.6 3.8 4.8 0 1.6-1.2 2.8-3 2.8z" fill="#FFD23F"/>'),
    bird: S('<path d="M3 13c3-1 5-4 9-4 3 0 5 2 6 4l3-1-2 3c-1 3-4 5-8 5-4 0-6-2-8-7z" fill="#5DADE2" stroke="#1F618D" stroke-width="1.1" stroke-linejoin="round"/><path d="M9 11c1-3 3-5 6-6-1 3-2 5-4 7" fill="#85C1E9" stroke="#1F618D" stroke-width="1"/><circle cx="16" cy="12" r=".9" fill="#1B2631"/>'),
    music: S('<path d="M9 17V5l11-2v12" fill="none" stroke="#7D3CDB" stroke-width="2"/><ellipse cx="6.5" cy="17.5" rx="3" ry="2.4" fill="#7D3CDB"/><ellipse cx="17.5" cy="15.5" rx="3" ry="2.4" fill="#7D3CDB"/>'),
    tap: S('<path d="M10 11V4.5a1.5 1.5 0 0 1 3 0V11l3.6.9a2 2 0 0 1 1.5 2.3l-1 5.3A2 2 0 0 1 15.1 21H10a2 2 0 0 1-1.6-.8l-3.6-4.8a1.4 1.4 0 0 1 2.1-1.8L10 16z" fill="#FFD8B0" stroke="#9A5B2A" stroke-width="1.2" stroke-linejoin="round"/>'),
    map: S('<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" fill="#F7E3A7" stroke="#8A6A1E" stroke-width="1.2" stroke-linejoin="round"/><path d="M9 4v14M15 6v14" stroke="#8A6A1E" stroke-width="1"/><path d="M5 12c2-1 3 1 5 0s3-3 5-2 3 1 4 0" fill="none" stroke="#E8434A" stroke-width="1.3" stroke-dasharray="2 1.6"/>'),
    ball: S('<circle cx="12" cy="12" r="9" fill="#fff" stroke="#2E86DE" stroke-width="1.4"/><path d="M12 3c-2 3-2 15 0 18M3.5 9c5 1.5 12 1.5 17 0M4 16c5-1.2 11-1.2 16 0" fill="none" stroke="#FFC83D" stroke-width="1.6"/>'),
    smile: S('<circle cx="12" cy="12" r="9.5" fill="#FFD23F" stroke="#B87A00" stroke-width="1.2"/><circle cx="8.8" cy="10" r="1.3" fill="#5A3A00"/><circle cx="15.2" cy="10" r="1.3" fill="#5A3A00"/><path d="M7.5 14c2.4 3 6.6 3 9 0" fill="none" stroke="#5A3A00" stroke-width="1.6" stroke-linecap="round"/>'),
    repeat: S('<path d="M5 12a7 7 0 0 1 12-5l2-2v6h-6l2-2a4.5 4.5 0 0 0-7.5 3z" fill="#2ECC71" stroke="#1E8449" stroke-width="1"/><path d="M19 12a7 7 0 0 1-12 5l-2 2v-6h6l-2 2a4.5 4.5 0 0 0 7.5-3z" fill="#2ECC71" stroke="#1E8449" stroke-width="1"/>'),
    dot: S('<circle cx="12" cy="12" r="8" fill="#2ECC71" stroke="#1E8449" stroke-width="1.4"/>'),
    alien: S('<path d="M12 3c5 0 8 3.5 8 8 0 5-4 10-8 10S4 16 4 11c0-4.5 3-8 8-8z" fill="#7ED957" stroke="#3A8A1E" stroke-width="1.2"/><ellipse cx="8.8" cy="11.5" rx="2.2" ry="3" fill="#1B2631"/><ellipse cx="15.2" cy="11.5" rx="2.2" ry="3" fill="#1B2631"/>'),
    sprout: S('<path d="M12 21v-9" stroke="#3A8A1E" stroke-width="2" stroke-linecap="round"/><path d="M12 13C8 13 5 10.5 5 6.5c4 0 7 2.5 7 6.5zM12 11c0-4 3-6.5 7-6.5 0 4-3 6.5-7 6.5z" fill="#7ED957" stroke="#3A8A1E" stroke-width="1.1"/>'),
    light: S('<rect x="8" y="2" width="8" height="20" rx="3" fill="#3B3B3B"/><circle cx="12" cy="6.5" r="2.2" fill="#E8434A"/><circle cx="12" cy="12" r="2.2" fill="#FFC83D"/><circle cx="12" cy="17.5" r="2.2" fill="#2ECC71"/>'),
    question: S('<circle cx="12" cy="12" r="9.5" fill="#3E7BE0"/><path d="M9.3 9.3a2.8 2.8 0 1 1 3.9 2.6c-.8.4-1.2 1-1.2 1.9v.6" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="17.6" r="1.3" fill="#fff"/>'),
    museum: S('<path d="M2 9l10-6 10 6z" fill="#C9C2B0" stroke="#7A715E" stroke-width="1.1"/><path d="M5 10v8M9.7 10v8M14.3 10v8M19 10v8" stroke="#7A715E" stroke-width="2"/><rect x="2" y="18" width="20" height="3" fill="#A79F8A"/>'),
    rock: S('<path d="M3 18l3-8 5-4 6 2 4 6-2 5z" fill="#9AA0A6" stroke="#5F6368" stroke-width="1.2" stroke-linejoin="round"/><path d="M8 11l3 2 4-1" fill="none" stroke="#5F6368" stroke-width="1"/>'),
    run: S('<circle cx="14.5" cy="4.5" r="2.3" fill="#E8833A"/><path d="M13 8l-3 5 3 3-1 5M13 8l3 3 3-1M10 13l-4 1M13 16l4 1" fill="none" stroke="#E8833A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
    search: S('<circle cx="10" cy="10" r="6" fill="#CFE6FF" stroke="#1D4C9E" stroke-width="2"/><path d="M14.5 14.5L21 21" stroke="#1D4C9E" stroke-width="2.6" stroke-linecap="round"/>'),
    printer: S('<rect x="6" y="3" width="12" height="6" fill="#fff" stroke="#555" stroke-width="1.2"/><rect x="3" y="9" width="18" height="8" rx="2" fill="#9AA7B8" stroke="#555" stroke-width="1.2"/><rect x="7" y="14" width="10" height="7" fill="#fff" stroke="#555" stroke-width="1.2"/>'),
    hand: S('<path d="M7 12V6a1.5 1.5 0 0 1 3 0v4V4.5a1.5 1.5 0 0 1 3 0V10V5.5a1.5 1.5 0 0 1 3 0V11V8a1.5 1.5 0 0 1 3 0v7c0 3.9-2.7 7-6.5 7-2.6 0-4.3-1.2-5.6-3.3L4.4 14.6a1.5 1.5 0 0 1 2.6-1.5z" fill="#FFD8B0" stroke="#9A5B2A" stroke-width="1.1" stroke-linejoin="round"/>'),
    wrench: S('<path d="M14.5 3a5 5 0 0 0-4.6 6.9L3.5 16.3a2 2 0 0 0 2.8 2.8l6.4-6.4A5 5 0 0 0 19.6 8l-3 1.4-2.2-.8-.8-2.2L15 3.1z" fill="#9AA7B8" stroke="#4E5A6B" stroke-width="1.2" stroke-linejoin="round"/>'),
    dotB: S('<circle cx="12" cy="12" r="8" fill="#3E7BE0" stroke="#1D4C9E" stroke-width="1.4"/>'),
    dotP: S('<circle cx="12" cy="12" r="8" fill="#9B59B6" stroke="#6C3483" stroke-width="1.4"/>'),
    wind: S('<path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h8" fill="none" stroke="#5DADE2" stroke-width="2.2" stroke-linecap="round"/>'),
    heartB: S('<path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 4.3 2.5.7-1.3 2.2-2.5 4.3-2.5 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" fill="#7FD3F7" stroke="#2E86C1" stroke-width="1.2"/>'),
    letter: S('<rect x="3" y="6" width="18" height="13" rx="2" fill="#fff" stroke="#C0392B" stroke-width="1.3"/><path d="M3.5 7l8.5 6.5L20.5 7" fill="none" stroke="#C0392B" stroke-width="1.3"/><path d="M12 15.5s-2.4-1.5-2.4-3a1.3 1.3 0 0 1 2.4-.7 1.3 1.3 0 0 1 2.4.7c0 1.5-2.4 3-2.4 3z" fill="#E8434A"/>'),
    tree: S('<path d="M12 2l5 6h-2.5l4 5h-3l4 5H4.5l4-5h-3l4-5H7z" fill="#2E8B57" stroke="#1E5E3A" stroke-width="1" stroke-linejoin="round"/><rect x="10.5" y="18" width="3" height="4" fill="#8A5A1E"/><circle cx="10" cy="11" r="1" fill="#FFC83D"/><circle cx="14" cy="14.5" r="1" fill="#E8434A"/>'),
    plus: S('<circle cx="12" cy="12" r="9.5" fill="#2ECC71"/><path d="M12 7v10M7 12h10" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>'),
    check: S('<circle cx="12" cy="12" r="9.5" fill="#2ECC71"/><path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>')
  }
  // emoji -> icon (the variation selector ️ after a symbol is consumed with it)
  var MAP = {
    '❤': 'heart', '💖': 'heart', '💛': 'heart', '♥': 'heart', '⭐': 'star', '🌟': 'star', '★': 'star', '⚡': 'bolt',
    '🏆': 'trophy', '🏅': 'medal', '🎖': 'medal', '🥇': 'medal', '🪙': 'coin', '💰': 'coin', '💎': 'gem',
    '🏠': 'home', '🏡': 'home', '🚂': 'train', '🚆': 'train', '🚃': 'train', '🚄': 'train', '🚅': 'train', '🚉': 'station',
    '🎒': 'bag', '✕': 'close', '❌': 'close', '✖': 'close', '⚔': 'swords', '🔊': 'sound', '🔈': 'sound', '🔉': 'sound',
    '⚠': 'warn', '🏁': 'flag', '🌊': 'wave', '🍬': 'candy', '🍭': 'candy', '⚙': 'gear', '🔥': 'fire', '🐦': 'bird',
    '🎵': 'music', '🎶': 'music', '👆': 'tap', '👉': 'tap', '🗺': 'map', '🏐': 'ball', '⚽': 'ball', '😊': 'smile', '😄': 'smile',
    '🙂': 'smile', '🔄': 'repeat', '🔁': 'repeat', '🟢': 'dot', '👾': 'alien', '🌱': 'sprout', '🚦': 'light', '❓': 'question',
    '❔': 'question', '🏛': 'museum', '🪨': 'rock', '🏃': 'run', '🔎': 'search', '🔍': 'search', '🖨': 'printer', '✋': 'hand',
    '✅': 'check', '✔': 'check', '🔧': 'wrench', '🛠': 'wrench', '🔩': 'wrench', '🔵': 'dotB', '🔷': 'gem', '🟣': 'dotP',
    '🌪': 'wind', '💨': 'wind', '🩵': 'heartB', '💙': 'heartB', '💌': 'letter', '✉': 'letter', '🎄': 'tree', '🌲': 'tree',
    '➕': 'plus', '👯': 'smile', '🦸': 'star', '🚞': 'train', '🚋': 'train', '🚈': 'train', '🚝': 'train', '🚇': 'train', '🚊': 'train'
  }
  var KEYS = Object.keys(MAP).sort(function (a, b) { return b.length - a.length })
  var RE = new RegExp('(' + KEYS.map(function (k) { return k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }).join('|') + ')️?', 'g')
  var SKIP = { SCRIPT: 1, STYLE: 1, CANVAS: 1, TEXTAREA: 1, INPUT: 1, SELECT: 1, OPTION: 1, SVG: 1, svg: 1, NOSCRIPT: 1, TITLE: 1 }
  var css = D.createElement('style')
  css.textContent = '.dico{position:relative;display:inline-block;width:1.1em;height:1.1em;vertical-align:-0.18em;line-height:0;flex:none;font-style:normal}.dico svg{width:100%;height:100%;display:block}' +
    '.dico-t{position:absolute;left:0;top:0;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;font-size:1px}'
  function swap (node) {
    var t = node.nodeValue
    RE.lastIndex = 0
    if (!t || !RE.test(t)) return
    RE.lastIndex = 0
    var frag = D.createDocumentFragment(), last = 0, m
    while ((m = RE.exec(t))) {
      if (m.index > last) frag.appendChild(D.createTextNode(t.slice(last, m.index)))
      // the original character stays inside, clipped out of sight: textContent / innerText still read it, so a game
      // that compares a button's text to the emoji keeps working
      var i = D.createElement('i'); i.className = 'dico'; i.innerHTML = I[MAP[m[1]]] + '<span class="dico-t">' + m[0] + '</span>'
      frag.appendChild(i); last = m.index + m[0].length
    }
    if (last < t.length) frag.appendChild(D.createTextNode(t.slice(last)))
    node.parentNode.replaceChild(frag, node)
  }
  function inIcon (n) { var p = n.parentNode; return !!(p && p.classList && (p.classList.contains('dico-t') || p.classList.contains('dico'))) }
  function walk (root) {
    if (!root) return
    if (root.nodeType === 3) { if (root.parentNode && !SKIP[root.parentNode.nodeName] && !inIcon(root)) swap(root); return }
    if (root.nodeType !== 1 || SKIP[root.nodeName] || (root.closest && root.closest('svg,script,style'))) return
    var tw = D.createTreeWalker(root, 4, null), n, list = []
    while ((n = tw.nextNode())) if (n.parentNode && !SKIP[n.parentNode.nodeName] && !inIcon(n)) list.push(n)
    for (var k = 0; k < list.length; k++) swap(list[k])
  }
  var pending = [], raf = 0
  function flush () { raf = 0; var p = pending; pending = []; for (var k = 0; k < p.length; k++) if (p[k].isConnected !== false) walk(p[k]) }
  function start () {
    if (!css.parentNode) (D.head || D.documentElement).appendChild(css)
    walk(D.body)
    new MutationObserver(function (ms) {
      for (var k = 0; k < ms.length; k++) {
        var r = ms[k]
        if (r.type === 'characterData') pending.push(r.target)
        else for (var j = 0; j < r.addedNodes.length; j++) pending.push(r.addedNodes[j])
      }
      if (pending.length && !raf) raf = (W.requestAnimationFrame || setTimeout)(flush)
    }).observe(D.body, { childList: true, subtree: true, characterData: true })
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start()
  W.DuniaIcons = { icon: function (name) { return I[name] || '' }, map: MAP, scan: walk }
})(window, document)
