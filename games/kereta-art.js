/* =============================================================================
 * kereta-art.js — window.KeretaArt: where every picture of "Kereta Pemberani: Petualangan Rel" comes from.
 * No emoji anywhere (owner 2026-10-10): command icons are SVG (below), objects and characters are sprites of the
 * shared asset database (assets/db/lib via AssetIndex / TrainSprites), biome backdrops are the existing train
 * painterly plates (assets/train/backdrop/levelNN-*.webp). Anything the owner still has to supply is listed in
 * docs/KERETA-ART-SLOTS.md and drawn here as a labelled placeholder (see KeretaArt.placeholder).
 *
 *   KeretaArt.src(key)          URL of a database sprite key (base-path aware)
 *   KeretaArt.cargo(kind)       sprite key for a cargo / goal kind          KeretaArt.critter(kind)
 *   KeretaArt.icon(name, cls)   inline SVG string (commands, goal glyphs)     KeretaArt.goalIcon(goal) -> html
 *   KeretaArt.plate(n, w)       URL of train backdrop plate n at width 640 | 1024 | 1600
 *   KeretaArt.BIOMES            palette per biome (board colours)           KeretaArt.TRAINS  chars, names, colours
 *   KeretaArt.STORIES           the four storylines and their chapters (names, level ranges, art)
 * ==========================================================================*/
(function (W) {
  'use strict'
  function base () { try { return location.pathname.indexOf('/Dunia-Emosi/') === 0 ? '/Dunia-Emosi/' : '/' } catch (e) { return '/' } }
  function src (key) {
    if (!key) return null
    var p = W.AssetIndex && W.AssetIndex.path ? W.AssetIndex.path(key) : null
    return p || (base() + 'assets/db/lib/' + key + '.webp')
  }
  function chapPic (ch, w) { return ch && ch.card ? base() + 'assets/kereta/cards/' + ch.card + '.webp' : plate(ch.plate, w || 640) }
  function plate (n, w) { var s = (n < 10 ? '0' : '') + n; return base() + 'assets/train/backdrop/level' + s + '-' + (w || 1024) + '.webp' }

  var CARGO = {
    penumpang: 'malivlak-char/penumpang-ungu/berdiri', tamu: 'malivlak-char/penumpang-jas-kotak/jalan', koper: 'kereta-prop/luggage-pile', surat: 'kereta-prop/mail-sacks', kayu: 'kereta-prop/log-stack',
    batubara: 'kereta-prop/coal-pile', ikan: 'animal/ikan/samping', telur: 'kereta-prop/frying-pan-egg', medali: 'kereta-prop/medal', karangan: 'kereta-prop/wreath',
    beruang: 'animal/beruang/depan', perban: 'kereta-prop/wheel-bandage', koran: 'school/notebook', baut: 'mojo-prop/bolt', bintang: 'game/star',
    bendera: 'game/flag-red', musisi: 'toys/trumpet', peti: 'game/crate-wood', x: 'toys/drum'
  }
  var CRITTER = { kura: 'animal/turtle/walk', burung: 'animal/bird-blue/fly', beruang: 'animal/beruang/depan', goro: 'train-char/goro-loco/front-34l' }
  var GOAL = { // goal glyph -> sprite key (or an svg name)
    penumpang: 'malivlak-char/penumpang-ungu/berdiri', koper: 'kereta-prop/luggage-pile', surat: 'kereta-prop/mail-sacks', flag: 'game/flag-red', coal: 'kereta-prop/coal-pile', wagon: 'mojo-train/coach-annie',
    whistle: 'tk-prop/whistle', star: 'game/star', bird: 'animal/bird-blue/fly', bear: 'animal/beruang/depan', turtle: 'animal/turtle/walk', bandage: 'kereta-prop/wheel-bandage',
    log: 'kereta-prop/log-stack', news: 'school/notebook', bolt: 'mojo-prop/bolt', music: 'toys/trumpet', medal: 'kereta-prop/medal', wreath: 'kereta-prop/wreath', ikan: 'animal/ikan/samping',
    telur: 'kereta-prop/frying-pan-egg', tunnel: 'mojo-prop/tunnel', signal: '#signal', door: '#door', carpet: '#carpet', goro: '#goro', stop: '#stop', wait: '#wait', lamp: '#lamp', consist: 'mojo-train/coach-annie', load: 'game/crate-wood', deliver: 'mojo-prop/building-station'
  }

  /* ── SVG command icons (24x24, currentColor) ─────────────────────────────────────────────────────── */
  var P = {
    maju: '<path d="M12 3.5l7.5 8.5H15v8.5H9V12H4.5z"/>',
    kiri: '<path d="M10 4L3.5 10.5 10 17v-4h4.5a2 2 0 0 1 2 2v5h4v-5a6 6 0 0 0-6-6H10z"/>',
    kanan: '<path d="M14 4l6.5 6.5L14 17v-4H9.5a2 2 0 0 0-2 2v5h-4v-5a6 6 0 0 1 6-6H14z"/>',
    putar: '<path d="M7 20.5V9.5a5 5 0 0 1 10 0V12h3l-5 5-5-5h3V9.5a2 2 0 0 0-4 0v11z"/>',
    muat: '<path d="M3 12.5h18v8H3z"/><path d="M8 3.5h8v5h3.5L12 15 4.5 8.5H8z" opacity=".95"/>',
    turun: '<circle cx="8" cy="7" r="2.8"/><circle cx="16" cy="7" r="2.8"/><path d="M3 18c0-3.3 2.3-5.5 5-5.5s5 2.2 5 5.5zM11 18c0-3.3 2.3-5.5 5-5.5s5 2.2 5 5.5z"/>',
    tuas: '<path d="M5 20.5h14v-3.5H5z"/><path d="M10.5 17V7.2l-2.3-1 1.5-3.2 7.3 3.4-1.5 3.1-1.9-.9V17z"/>',
    tiup: '<path d="M12 2.8a6.2 6.2 0 0 0-6.2 6.2v4.2L3.5 17h17l-2.3-3.8V9A6.2 6.2 0 0 0 12 2.8z"/><path d="M9.6 19h4.8a2.4 2.4 0 0 1-4.8 0z"/>',
    tunggu: '<rect x="6" y="4.5" width="4.2" height="15" rx="1.2"/><rect x="13.8" y="4.5" width="4.2" height="15" rx="1.2"/>',
    lepas: '<rect x="2.5" y="9.5" width="8" height="5" rx="2"/><rect x="13.5" y="9.5" width="8" height="5" rx="2"/><path d="M11 6l1 3M13 6l-1 3M11 18l1-3M13 18l-1-3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    undo: '<path d="M9 7L3.5 12 9 17v-3.5c4 0 6.8 1 8.5 4.5.4-4.8-2.8-8.6-8.5-8.8z"/>',
    clear: '<path d="M6 7h12l-1 13H7zM9 3.5h6l1 2.2H8z"/>',
    play: '<path d="M7 4.5v15l13-7.5z"/>',
    reset: '<path d="M12 4.5a7.5 7.5 0 1 0 7.2 9.6h-2.4A5.2 5.2 0 1 1 12 6.8c1.4 0 2.6.5 3.6 1.4L13 10.8h7V3.8l-2.4 2.4A7.4 7.4 0 0 0 12 4.5z"/>',
    gear: '<path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm8.4 5.2l1.8 1.4-1.8 3.1-2.1-.8a7.6 7.6 0 0 1-1.7 1l-.3 2.2h-3.6l-.3-2.2a7.6 7.6 0 0 1-1.7-1l-2.1.8-1.8-3.1 1.8-1.4a7.6 7.6 0 0 1 0-2l-1.8-1.4 1.8-3.1 2.1.8a7.6 7.6 0 0 1 1.7-1l.3-2.2h3.6l.3 2.2a7.6 7.6 0 0 1 1.7 1l2.1-.8 1.8 3.1-1.8 1.4a7.6 7.6 0 0 1 0 2z"/>',
    sound: '<path d="M4 9.5h4L13 5v14l-5-4.5H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    mute: '<path d="M4 9.5h4L13 5v14l-5-4.5H4z"/><path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    book: '<path d="M3 5.5c3-1 6-1 9 .8 3-1.8 6-1.8 9-.8v13c-3-1-6-1-9 .8-3-1.8-6-1.8-9-.8z"/>',
    people: '<circle cx="8.5" cy="7.5" r="3"/><circle cx="16.5" cy="8.5" r="2.5"/><path d="M2.5 19c0-3.8 2.7-6 6-6s6 2.2 6 6zM14 19c0-2 .9-3.6 2.4-4.4 3 0 5.1 1.6 5.1 4.4z"/>',
    back: '<path d="M10.5 5L3.5 12l7 7v-4.5H20v-5h-9.5z"/>',
    check: '<path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
    next: '<path d="M5 4.5v15l7-7.5zm8 0v15l7-7.5z"/>',
    hint: '<path d="M12 2.5a6.5 6.5 0 0 0-3.6 11.9V17h7.2v-2.6A6.5 6.5 0 0 0 12 2.5zM9.5 19h5v1.8a2.5 2.5 0 0 1-5 0z"/>',
    signal: '<rect x="7" y="2.5" width="10" height="19" rx="3"/><circle cx="12" cy="8" r="2.6" fill="#e5483b"/><circle cx="12" cy="15.5" r="2.6" fill="#2ea36a"/>',
    door: '<path d="M6 3h12v18H6z"/><circle cx="15" cy="12.5" r="1.3" fill="#e8c46a"/>',
    carpet: '<path d="M3 15l3-9h12l3 9z"/><path d="M5 18h14" stroke="currentColor" stroke-width="2.2"/>',
    goro: '<circle cx="12" cy="12" r="9"/><path d="M9.2 9.5a3 3 0 1 1 4.6 2.5c-1 .7-1.8 1.2-1.8 2.5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17.8" r="1.3" fill="#fff"/>',
    star: '<path d="M12 2.8l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 17l-5.8 3.3 1.4-6.4L2.7 9.5l6.5-.7z"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2"/>',
    mundur: '<path d="M12 20.5L4.5 12H9V3.5h6V12h4.5z"/>',
    sambung: '<rect x="2" y="9.5" width="8.5" height="5" rx="2"/><rect x="13.5" y="9.5" width="8.5" height="5" rx="2"/><path d="M9 12h6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    lampu: '<path d="M9 2.5h6v2h-6zM8 6h8l1.5 3v8.5a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2V9z"/><circle cx="12" cy="13.2" r="2.8" fill="#ffe27a"/>',
    naik: '<circle cx="8" cy="6.5" r="2.6"/><path d="M3 17c0-3 2.2-5 5-5s5 2 5 5z"/><path d="M17 4v8h-2.8L18 17l3.8-5H19V4z"/>',
    wesel: '<path d="M4 20.5l5-8V6.5h2V13l-5 7.5zM13 6.5h2V13l4 7.5h-2.5L13 14z"/><circle cx="10" cy="4.5" r="2"/>',
    berhenti: '<path d="M8.2 2.8h7.6l5.4 5.4v7.6l-5.4 5.4H8.2l-5.4-5.4V8.2z" fill="#d8402e"/><rect x="7" y="10.6" width="10" height="2.8" rx="1" fill="#fff"/>',
    stop: '<path d="M8.2 2.8h7.6l5.4 5.4v7.6l-5.4 5.4H8.2l-5.4-5.4V8.2z" fill="#d8402e"/><path d="M8 12.5l3 3 5-6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" opacity="0"/><rect x="7" y="10.6" width="10" height="2.8" rx="1" fill="#fff"/>',
    wait: '<path d="M6 2.8h12v2.2c0 3-2.6 4.4-4 7 1.4 2.6 4 4 4 7v2.2H6v-2.2c0-3 2.6-4.4 4-7-1.4-2.6-4-4-4-7z"/>',
    lamp: '<path d="M9 2.5h6v2h-6zM8 6h8l1.5 3v8.5a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2V9z"/><circle cx="12" cy="13.2" r="2.8" fill="#ffe27a"/>',
    deliver: '<path d="M3 11l9-7 9 7v9H3z"/><rect x="10" y="13" width="4" height="7" fill="#f4e8c8"/>',
    pause: '<rect x="6" y="4.5" width="4.2" height="15" rx="1.2"/><rect x="13.8" y="4.5" width="4.2" height="15" rx="1.2"/>',
    chev: '<path d="M9 4.5l7.5 7.5L9 19.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
    loco: '<path d="M4 17.5V9h6V6.5h3V9h1.5l2-2.8H20V17.5h-1.2a2.4 2.4 0 0 1-4.6 0H9.2a2.4 2.4 0 0 1-4.6 0z"/>'
  }
  var FLIP = { kanan: 0 }
  function icon (name, cls) {
    var body = P[name] || P.goro
    return '<svg class="ki ' + (cls || '') + '" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false" fill="currentColor">' + body + '</svg>'
  }
  function goalIcon (g) {
    var k = (g && (g.icon || g.t)) || 'flag', v = GOAL[k]
    if (g && g.sprite) v = g.sprite
    if (!v && g && g.kind && CARGO[g.kind]) v = CARGO[g.kind]
    if (!v) v = GOAL.flag
    if (v.charAt(0) === '#') return '<span class="kgi kgi-svg">' + icon(v.slice(1)) + '</span>'
    return '<span class="kgi"><img alt="" decoding="async" src="' + src(v) + '"></span>'
  }
  function goalSprite (g) { var v = (g && g.sprite) || GOAL[(g && (g.icon || g.t)) || 'flag']; return v && v.charAt(0) !== '#' ? v : null }
  function placeholder (label) {
    return '<span class="kph" title="Gambar menyusul: ' + String(label).replace(/"/g, '') + '">' + icon('goro') + '</span>'
  }

  /* biomes: board colours (the chapter's own world). g1/g2 grass checker, bed = ballast, deco = scatter sprites */
  var BIOMES = {
    station: { g1: '#8fbf6a', g2: '#86b562', bed: '#b9a98a', sleeper: '#6b4a2b', rail: '#c9ccd2', sky: '#f6c87c', deco: ['mojo-prop/street-lamp', 'game/bush'] },
    country: { g1: '#93c46e', g2: '#8abb66', bed: '#b8a888', sleeper: '#6b4a2b', rail: '#c9ccd2', sky: '#a9d3ef', deco: ['gt/pine-tree', 'game/bush', 'gt-el/oak-tree'] },
    valley: { g1: '#7fbf72', g2: '#76b46a', bed: '#b5a688', sleeper: '#6b4a2b', rail: '#c9ccd2', sky: '#a9d3ef', deco: ['gt/pine-tree', 'gt-el/oak-tree', 'game/bush'] },
    field: { g1: '#a8c76c', g2: '#9fbe63', bed: '#c2a979', sleeper: '#6b4a2b', rail: '#c9ccd2', sky: '#f2d27a', deco: ['gt-el/oak-tree', 'game/bush'] },
    pond: { g1: '#86c077', g2: '#7db56f', bed: '#b8a888', sleeper: '#6b4a2b', rail: '#c9ccd2', sky: '#a9d3ef', deco: ['game/bush', 'mojo-prop/pond'] },
    mountain: { g1: '#7ea978', g2: '#759f6f', bed: '#a9a08e', sleeper: '#5f4a35', rail: '#c9ccd2', sky: '#c8d6ea', deco: ['gt/pine-tree', 'mojo-prop/rock'] },
    bridge: { g1: '#83a97a', g2: '#7aa072', bed: '#a9a08e', sleeper: '#5f4a35', rail: '#c9ccd2', sky: '#e9b97d', deco: ['gt/pine-tree', 'mojo-prop/rock'] },
    forest: { g1: '#5f9a63', g2: '#578f5c', bed: '#9a8a70', sleeper: '#5a4129', rail: '#bfc3c9', sky: '#8fb597', deco: ['gt/pine-tree', 'gt/pine-tree', 'game/bush'] },
    night: { g1: '#3d6b6e', g2: '#376266', bed: '#6f6a66', sleeper: '#3d2d20', rail: '#aab4c4', sky: '#243a63', deco: ['gt/pine-tree', 'mojo-prop/street-lamp'] },
    town: { g1: '#9bc47a', g2: '#92bb72', bed: '#bdae92', sleeper: '#6b4a2b', rail: '#c9ccd2', sky: '#f4c47e', deco: ['mojo-prop/house', 'mojo-prop/street-lamp', 'game/bush'] },
    home: { g1: '#98c577', g2: '#8fbc6f', bed: '#bdae92', sleeper: '#6b4a2b', rail: '#c9ccd2', sky: '#f2d3a0', deco: ['mojo-prop/house', 'gt-el/oak-tree', 'game/bush'] },
    museum: { g1: '#b6c28a', g2: '#adba82', bed: '#c4b79a', sleeper: '#6b4a2b', rail: '#c9ccd2', sky: '#f0c987', deco: ['mojo-prop/street-lamp', 'game/bush'] },
    dream: { g1: '#8f9fd0', g2: '#8696c8', bed: '#c9c2e6', sleeper: '#5b4a8a', rail: '#e8e2ff', sky: '#4a4f9a', deco: ['game/star', 'game/bush'] }
  }
  /* the trains: character id -> sprite character, display name, body colour of its wagons, short role line */
  var TRAINS = {
    linus: { char: 'linus', name: 'Linus', body: '#2f5fc4', trim: '#1b3a82', role: 'Lokomotif kecil biru yang ceria dan pemberani.' },
    samson: { char: 'samson', name: 'Samson', body: '#4a3a3c', trim: '#7a2f2f', role: 'Lokomotif raksasa dengan banyak roda.' },
    malivlak: { char: 'malivlak', name: 'Malivlak', body: '#d4361a', trim: '#2a2a2a', role: 'Lokomotif kecil merah yang periang dan suka petualangan.' },
    dragutin: { char: 'dragutin', name: 'Dragutin', body: '#1f5a3d', trim: '#f2d9b0', role: 'Kereta hijau-krem yang panjang dan ramah.' },
    kilat: { char: 'silver', name: 'Kilat Perak', body: '#8aa3c8', trim: '#3e5a86', role: 'Kereta perak yang sangat cepat.' },
    lemas: { char: 'defeatist', name: 'Tuan Lemas', body: '#3a3a3e', trim: '#8a7a68', role: 'Lokomotif tua yang sering ingin menyerah, tapi hatinya baik.' }
  }

  /* the four storylines. 'classic' is the existing Lokomotif Pemberani game (G15), reachable unchanged. */
  var STORIES = {
    brave: { id: 'brave', gid: 'g15b', title: 'The Brave Locomotive', sub: 'Linus dan Samson', blurb: '30 misi cerita + 4 latihan: lokomotif kecil yang berani menolong sahabatnya.', subtitle: 'Petualangan Linus', mainCount: 30, cover: 34, heroes: ['linus', 'samson'], plate: 43,
      chapters: [
        { card: 'card-bl-lembah-stasiun', name: 'Lembah', from: 1, to: 5, plate: 16, desc: 'Linus memulai perjalanan pertamanya di lembah yang indah.' },
        { name: 'Samson Datang', from: 6, to: 8, plate: 8, desc: 'Lokomotif raksasa tiba di depo besar.' },
        { card: 'card-bl-hutan-logging', name: 'Hutan Kayu', from: 9, to: 14, plate: 10, desc: 'Linus bekerja di hutan yang gelap, tapi ia tetap bersemangat.' },
        { card: 'card-bl-penyelamatan-jembatan', name: 'Jembatan Miring', from: 15, to: 20, plate: 43, desc: 'Keadaan darurat! Linus bergegas menolong.' },
        { card: 'card-bl-penyelamatan-jembatan', name: 'Penyelamatan', from: 21, to: 25, plate: 38, desc: 'Bersama-sama menarik Samson ke daratan.' },
        { card: 'card-bl-pulang-rumah', name: 'Pulih dan Pulang', from: 26, to: 30, plate: 20, desc: 'Istirahat, perbaikan, dan perjalanan yang damai.' },
        { name: 'Latihan Rel', from: 31, to: 34, plate: 12, desc: 'Latihan tambahan: berbagi rel, merangkai gerbong, terowongan berkabut, dan mengantar ke tempat aman.' }] },
    malivlak: { id: 'malivlak', gid: 'g15m', title: 'Malivlak', sub: 'Dragutin dan Malivlak', blurb: '20 misi: dari stasiun, kolam, gunung, sampai museum.', cover: 16, subtitle: 'Petualangan Malivlak', heroes: ['malivlak', 'dragutin'], plate: 25,
      chapters: [
        { card: 'card-mv-stasiun', name: 'Stasiun', from: 1, to: 3, plate: 8, desc: 'Dragutin tiba, memuat penumpang, dan berangkat.' },
        { card: 'card-mv-pedesaan', name: 'Jalur Bergelombang', from: 4, to: 5, plate: 16, desc: 'Malivlak yang kecil berjalan di jalur tidak rata.' },
        { name: 'Ladang dan Kolam', from: 6, to: 9, plate: 6, desc: 'Keluar rel, menyelam ke kolam, dan bertemu burung.' },
        { card: 'card-mv-pegunungan', name: 'Gunung', from: 10, to: 13, plate: 34, desc: 'Mendaki, terowongan gelap, dan beruang yang ramah.' },
        { card: 'card-mv-penyambutan', name: 'Kota dan Museum', from: 14, to: 20, plate: 40, desc: 'Penyambutan meriah dan perjalanan ke museum.' }] },
    hellbent: { id: 'hellbent', gid: 'g15h', title: 'Lomba ke Kota', sub: 'Kilat Perak dan Tuan Lemas', blurb: '10 misi: dua kereta, satu pesan: jangan menyerah.', cover: 33, subtitle: 'Lomba ke Kota', heroes: ['kilat', 'lemas'], plate: 33,
      chapters: [
        { card: 'card-hb-start', name: 'Mulai Lomba', from: 1, to: 3, plate: 16, desc: 'Kilat dan Tuan Lemas bersiap. Giliran bergantian!' },
        { card: 'card-hb-padang', name: 'Saling Membantu', from: 4, to: 7, plate: 34, desc: 'Jalan bersamaan: tunggu, atur, dan bantu teman.' },
        { card: 'card-hb-kota', name: 'Pesta di Kota', from: 8, to: 10, plate: 20, desc: 'Garis akhir dan pesta untuk semua.' }] },
    classic: { id: 'classic', gid: 'g15', title: 'Lokomotif Pemberani', sub: 'Game aslinya', blurb: 'Game Lokomotif Pemberani yang lama, tetap seperti biasa.', subtitle: 'Game Aslinya', cover: 20, heroes: [], plate: 20, chapters: [] }
  }

  /* ── owner art slots (prompts: Documents/temporary/game asset/train/kekurangan/PROMPTS-KERETA-PEMBERANI.md) ───────
     Backgrounds: assets/kereta/bg/<key>-landscape.webp and -portrait.webp (opaque). Until the file exists the game
     falls back to a painterly train plate; tiles and props are database sprites keyed kereta-tile/<name> and
     kereta-prop/<name> (checked with AssetIndex), with the procedural board / existing sprites as the fallback. */
  var BG_KEYS = ['bg-bl-depot', 'bg-bl-lembah', 'bg-bl-gunung', 'bg-bl-hutan-logging', 'bg-bl-jembatan', 'bg-bl-kota', 'bg-bl-rumah', 'bg-bl-malam', 'bg-bl-mimpi', 'bg-bl-bengkel',
    'bg-mv-stasiun', 'bg-mv-pedesaan', 'bg-mv-ladang', 'bg-mv-kolam', 'bg-mv-pohon', 'bg-mv-gunung-terowongan', 'bg-mv-turunan', 'bg-mv-penyambutan', 'bg-mv-museum',
    'bg-hb-start', 'bg-hb-padang', 'bg-hb-kota']
  var TILE_SLOTS = ['rail-h', 'rail-v', 'curve-ne', 'curve-nw', 'curve-se', 'curve-sw', 'switch-left', 'switch-right', 'crossing', 'buffer',
    'grass', 'grass-flowers', 'gravel', 'dirt-path', 'water', 'bridge', 'bridge-sagging', 'bridge-broken', 'tunnel-portal', 'level-crossing',
    'signal-red', 'signal-green', 'platform', 'water-tower', 'coal-bunker']
  var PROP_SLOTS = ['luggage-pile', 'mail-sacks', 'log-stack', 'log-single', 'coal-pile', 'crate', 'barrel', 'lantern', 'signal-box', 'ticket-booth',
    'station-small', 'sawmill', 'farmhouse', 'engine-house', 'pine', 'tree-round', 'bush', 'rock', 'haystack', 'fence',
    'bird-nest', 'frying-pan-egg', 'wheel-bandage', 'medal', 'wreath']
  function brRange (n, list) { for (var i = 0; i < list.length; i++) if (list[i][0].indexOf(n) >= 0) return list[i][1]; return null }
  var BG_BRAVE = [[[5, 6, 7, 8], 'bg-bl-depot'], [[1, 4], 'bg-bl-lembah'], [[2, 3], 'bg-bl-gunung'], [[9, 10, 12, 14, 17, 19], 'bg-bl-hutan-logging'], [[18], 'bg-bl-malam'],
    [[15, 16, 20, 21, 22, 23, 24, 25, 31], 'bg-bl-jembatan'], [[13, 29], 'bg-bl-kota'], [[11, 30], 'bg-bl-rumah'], [[26], 'bg-bl-mimpi'], [[27, 28], 'bg-bl-bengkel'], [[32, 34], 'bg-bl-depot'], [[33], 'bg-bl-malam']]
  var BG_MV = [[[1, 2], 'bg-mv-stasiun'], [[3, 4, 5, 9, 14], 'bg-mv-pedesaan'], [[6], 'bg-mv-ladang'], [[7], 'bg-mv-kolam'], [[8], 'bg-mv-pohon'], [[10, 11, 12], 'bg-mv-gunung-terowongan'],
    [[13], 'bg-mv-turunan'], [[15, 16, 17, 18, 19], 'bg-mv-penyambutan'], [[20], 'bg-mv-museum']]
  var BG_HB = [[[1, 2, 3], 'bg-hb-start'], [[4, 5, 6, 7, 8], 'bg-hb-padang'], [[9, 10], 'bg-hb-kota']]
  function bgKey (lv) {
    var t = lv.ch === 'brave' ? BG_BRAVE : lv.ch === 'malivlak' ? BG_MV : BG_HB
    return brRange(lv.n, t) || (lv.ch === 'brave' ? 'bg-bl-lembah' : lv.ch === 'malivlak' ? 'bg-mv-pedesaan' : 'bg-hb-padang')
  }
  var bgOk = {}
  function bgUrl (key, orient) { return base() + 'assets/kereta/bg/' + key + '-' + orient + '.webp' }
  /* set the background of `el` for a level: the owner's file when it exists, else the painterly plate */
  function setBg (el, lv, w) {
    var orient = (W.innerHeight > W.innerWidth) ? 'portrait' : 'landscape', key = bgKey(lv), url = bgUrl(key, orient)
    el.style.backgroundImage = 'url(' + plate(lv.bg || 16, w || 1024) + ')'
    el.setAttribute('data-bg', key)
    if (bgOk[url] === false) return
    if (bgOk[url] === true) { el.style.backgroundImage = 'url(' + url + ')'; return }
    var im = new Image(); im.onload = function () { bgOk[url] = true; el.style.backgroundImage = 'url(' + url + ')' }; im.onerror = function () { bgOk[url] = false }; im.src = url
  }
  function slot (kind, name) { var k = 'kereta-' + kind + '/' + name; return W.AssetIndex && W.AssetIndex.path && W.AssetIndex.path(k) ? k : null }
  W.KeretaArt = { chapPic: chapPic, bgKey: bgKey, setBg: setBg, bgUrl: bgUrl, slot: slot, BG_KEYS: BG_KEYS, TILE_SLOTS: TILE_SLOTS, PROP_SLOTS: PROP_SLOTS, src: src, plate: plate, cargo: function (k) { return CARGO[k] || CARGO.x }, critter: function (k) { return CRITTER[k] || null }, icon: icon, goalIcon: goalIcon, goalSprite: goalSprite, placeholder: placeholder,
    BIOMES: BIOMES, TRAINS: TRAINS, STORIES: STORIES, CARGO: CARGO, base: base }
})(typeof window !== 'undefined' ? window : globalThis)
