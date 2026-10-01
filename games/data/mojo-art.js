/* =============================================================================
 * mojo-art.js — window.MojoArt. Art SLOTS for G31 Mojo Swoptops (like tk-art.js for G30).
 *
 * Every picture is asked for by key. The owner's cyan Mojo and Bo sheets are primary, with
 * the shared Dunia library for characters/objects not supplied. Drawn props are only for
 * state-specific details (a repaired gate, water quantity) absent from the owner sheets.
 * The supplied vehicles are three-quarter views, kept upright with a separate heading marker.
 *
 *   MojoArt.chassis(view)                empty: owner images already include the chassis
 *   MojoArt.module(form, view)           complete owner image for the gameplay layer
 *   MojoArt.mojo(form, view)             complete owner image for menus and cards
 *   MojoArt.icon(cmd)                    command icon SVG
 *   MojoArt.src(key)                     supplied/shared prop or character URL
 *   MojoArt.catalog / libFiles()        literal catalog and complete offline art list
 * ==========================================================================*/
(function () {
  'use strict'
  var W = window
  var BASE = '../'
  function lib (k) { return (W.AssetIndex && AssetIndex.path(k)) || (BASE + 'assets/db/lib/' + k + '.webp') }
  function url (s) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s) }

  // Owner sheets 02-29, catalogued by tools/ingest-mojo-sheets.py; mockup characters excluded.
  var OVERRIDE = {}
  var TOPS = 'base fire chopper dozer crane lift racer water jumper boat monster dumper jet wrecking-ball searchlight workshop bridge mixer recycling snow-plow farm tree-cutter drill rescue satellite camera forklift towing ice-cream delivery police ambulance garbage sweeper fuel rocket submarine aerial-ladder logging drilling harvester balloon space-lab cargo-crane'.split(' ')
  var TOP_NAMES = 'Mojo|Pemadam|Helikopter|Dozer|Derek|Keranjang|Pembalap|Tangki Air|Pelompat|Perahu|Monster|Bak Pasir|Jet|Bola Penghancur|Lampu Sorot|Bengkel Berjalan|Jembatan|Pengaduk Semen|Daur Ulang|Bajak Salju|Traktor|Pemangkas|Bor|Penyelamat|Satelit|Kamera|Forklift|Penarik|Es Krim|Pengantar|Polisi|Ambulans|Pengangkut Sampah|Penyapu|Bahan Bakar|Roket|Kapal Selam|Tangga Udara|Pengangkut Kayu|Pengebor|Pemanen|Balon Udara|Lab Antariksa|Derek Kargo'.split('|')
  function topKey (form) { return form === 'normal' ? 'base' : form === 'cherry' ? 'lift' : form }
  function ownerTop (form, view) { return '<img class="owner-mojo owner-' + view + '" src="' + lib('mojo-top/' + topKey(form)) + '" alt="">' }
  // one kid-friendly line per form for the Bengkel showroom ("Derek: mengangkat barang berat")
  var TOP_ABILITY = ('menolong, mengambil, dan memperbaiki|menyemprot air ke api|terbang tinggi menolong teman|mendorong batu besar|mengangkat barang berat|' +
    'naik tinggi dengan keranjang|melaju paling cepat|membawa banyak air|melompati lubang dan batu|berlayar di air|melewati jalan berbatu|mengangkut pasir|' +
    'terbang sangat cepat|merobohkan dinding tua|menerangi tempat gelap|membawa alat bengkel|menjadi jembatan|mengaduk semen|mengumpulkan barang daur ulang|' +
    'menyingkirkan salju|membajak sawah|merapikan pohon|melubangi tanah keras|menolong saat darurat|mengirim pesan jauh|memotret dan merekam|mengangkat kotak|' +
    'menarik mobil mogok|membagikan es krim|mengantar paket|menjaga jalan tetap aman|membawa orang sakit|mengangkut sampah|menyapu jalan|membawa bahan bakar|' +
    'meluncur ke angkasa|menyelam di laut|menjulurkan tangga tinggi|mengangkut kayu|mengebor sumur|memanen padi|melayang di udara|meneliti di angkasa|memindahkan peti kemas').split('|')
  var catalog = TOPS.map(function (id, i) { return { id: id, name: TOP_NAMES[i], ability: TOP_ABILITY[i] || '', src: lib('mojo-top/' + id) } })
  var OWNER = { 'char/bo':'mojo-char/bo', 'char/oona':'mojo-char/oona', 'char/mia':'mojo-char/oona', 'char/bo-wrench':'mojo-char/bo-tools', 'char/neon':'mojo-char/neon', 'char/grandad':'mojo-char/grandad',
    'char/cat':'mojo-char/cat', 'obj/rock':'mojo-tile/rock-push', 'obj/fire':'mojo-tile/fire', 'obj/star':'mojo-prop/star', 'obj/toolbox':'mojo-prop/toolbox',
    'obj/tree':'mojo-prop/tree-round', 'obj/lamp':'mojo-prop/lamp-post', 'obj/crate':'mojo-tile/crate', 'obj/bolt':'mojo-prop/bolt',
    'tool/palu':'mojo-prop/hammer', 'tool/obeng':'mojo-prop/screwdriver', 'tool/kunci':'mojo-prop/wrench' }
  Object.keys(OWNER).forEach(function (k) { OVERRIDE[k] = 'assets/db/lib/' + OWNER[k] + '.webp' })

  var FORM = { normal: '#F2552C', dozer: '#F4B400', fire: '#E53935', cherry: '#FB8C00', jumper: '#43A047', crane: '#8D6E63', chopper: '#1E88E5' }
  var TOP_VB = '-10 -10 120 120', SIDE_VB = '0 0 220 150'
  function svg (vb, inner, cls) { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '"' + (cls ? ' class="' + cls + '"' : '') + ' aria-hidden="true">' + inner + '</svg>' }
  function chassis () { return '' }
  function module (form, view) {
    if (TOPS.indexOf(topKey(form)) < 0) throw new Error('Unknown Mojo artwork: ' + form)
    return ownerTop(form, view || 'top')
  }
  function mojo (form, view) { return module(form, view || 'side') }

  /* ── command icons (48×48, drawn in white on the chip colour) ───────── */
  var ST = ' stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"'
  var ICON = {
    fwd: '<path d="M24 40 V10"' + ST + '/><path d="M12 22 L24 9 L36 22"' + ST + '/>',
    left: '<path d="M34 40 V24 Q34 14 24 14 H12"' + ST + '/><path d="M20 5 L11 14 L20 23"' + ST + '/>',
    right: '<path d="M14 40 V24 Q14 14 24 14 H36"' + ST + '/><path d="M28 5 L37 14 L28 23"' + ST + '/>',
    back: '<path d="M24 8 V38"' + ST + '/><path d="M12 26 L24 39 L36 26"' + ST + '/>',
    // board-absolute arrows (owner decision 2026-10-01): straight arrows that point where Mojo goes on the board
    up: '<path d="M24 41 V9"' + ST + '/><path d="M11 21 L24 8 L37 21"' + ST + '/>',
    down: '<path d="M24 7 V39"' + ST + '/><path d="M11 27 L24 40 L37 27"' + ST + '/>',
    west: '<path d="M41 24 H9"' + ST + '/><path d="M21 11 L8 24 L21 37"' + ST + '/>',
    east: '<path d="M7 24 H39"' + ST + '/><path d="M27 11 L40 24 L27 37"' + ST + '/>',
    push: '<rect x="6" y="10" width="8" height="28" rx="3" fill="#fff"/><path d="M18 24 H38"' + ST + '/><path d="M30 15 L40 24 L30 33"' + ST + '/>',
    spray: '<path d="M6 30 H18 L24 24"' + ST + '/><path d="M30 12 q4 6 0 9 q-4 -3 0 -9 Z M40 22 q4 6 0 9 q-4 -3 0 -9 Z M32 32 q4 6 0 9 q-4 -3 0 -9 Z" fill="#fff" stroke="#fff" stroke-width="2"/>',
    raise: '<rect x="10" y="34" width="28" height="7" rx="2" fill="#fff"/><path d="M24 30 V8"' + ST + '/><path d="M14 17 L24 7 L34 17"' + ST + '/>',
    lower: '<rect x="10" y="7" width="28" height="7" rx="2" fill="#fff"/><path d="M24 18 V40"' + ST + '/><path d="M14 31 L24 41 L34 31"' + ST + '/>',
    rescue: '<circle cx="24" cy="24" r="15"' + ST + '/><circle cx="24" cy="24" r="6"' + ST + '/><path d="M13 13 L19 19 M35 13 L29 19 M13 35 L19 29 M35 35 L29 29" stroke="#fff" stroke-width="4" stroke-linecap="round"/>',
    pick: '<path d="M14 26 V14 M20 24 V10 M26 24 V11 M32 26 V15"' + ST + '/><path d="M12 26 Q12 42 24 42 Q36 42 36 26"' + ST + '/>',
    drop: '<rect x="12" y="24" width="24" height="16" rx="3" fill="#fff"/><path d="M24 4 V18"' + ST + '/><path d="M17 12 L24 19 L31 12"' + ST + '/>',
    repair: '<rect x="8" y="8" width="22" height="12" rx="3" fill="#fff" transform="rotate(-30 19 14)"/><path d="M22 20 L38 40"' + ST + '/>',
    jump: '<path d="M6 38 Q24 0 42 38"' + ST + '/><path d="M34 31 L42 38 L44 28"' + ST + '/>',
    takeoff: '<path d="M8 12 H40"' + ST + '/><path d="M24 12 V20"' + ST + '/><rect x="14" y="20" width="20" height="10" rx="5" fill="#fff"/><path d="M24 44 V34"' + ST + '/>',
    land: '<path d="M8 8 H40"' + ST + '/><rect x="14" y="16" width="20" height="10" rx="5" fill="#fff"/><path d="M8 42 H40"' + ST + '/>',
    hook: '<path d="M24 4 V22 Q24 34 16 34 Q10 34 10 28"' + ST + '/>',
    release: '<path d="M24 4 V18"' + ST + '/><rect x="12" y="26" width="24" height="14" rx="3" fill="#fff"/>',
    swop: '<path d="M10 20 A15 15 0 0 1 38 16"' + ST + '/><path d="M38 6 V16 H28"' + ST + '/><path d="M38 28 A15 15 0 0 1 10 32"' + ST + '/><path d="M10 42 V32 H20"' + ST + '/>',
    run: '<path d="M16 9 L38 24 L16 39 Z" fill="#fff"/>',
    undo: '<path d="M14 18 H30 Q40 18 40 28 Q40 38 30 38 H18"' + ST + '/><path d="M20 9 L11 18 L20 27"' + ST + '/>',
    clear: '<path d="M12 14 H36 M18 14 V10 H30 V14 M15 14 L17 40 H31 L33 14"' + ST + '/>',
    hint: '<path d="M24 6 Q36 6 36 18 Q36 25 30 29 V34 H18 V29 Q12 25 12 18 Q12 6 24 6 Z" fill="#fff"/><rect x="18" y="37" width="12" height="5" rx="2" fill="#fff"/>',
    home: '<path d="M8 24 L24 9 L40 24"' + ST + '/><path d="M13 21 V40 H35 V21"' + ST + '/>',
    map: '<path d="M6 12 L17 8 L31 13 L42 9 V36 L31 40 L17 35 L6 39 Z" fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="round"/><path d="M17 8 V35 M31 13 V40" stroke="#fff" stroke-width="3"/>',
    sound: '<path d="M8 18 H16 L27 9 V39 L16 30 H8 Z" fill="#fff"/><path d="M33 17 Q38 24 33 31 M37 12 Q45 24 37 36"' + ST + '/>',
    mute: '<path d="M8 18 H16 L27 9 V39 L16 30 H8 Z" fill="#fff"/><path d="M33 18 L43 30 M43 18 L33 30"' + ST + '/>',
    settings: '<circle cx="24" cy="24" r="7"' + ST + '/><path d="M24 5 V11 M24 37 V43 M5 24 H11 M37 24 H43 M11 11 L15 15 M33 33 L37 37 M37 11 L33 15 M15 33 L11 37"' + ST + '/>',
    close: '<path d="M13 13 L35 35 M35 13 L13 35"' + ST + '/>',
    check: '<path d="M10 25 L20 35 L38 13"' + ST + '/>',
    star: '<path d="M24 5 L29.5 17.5 L43 18.8 L32.8 27.8 L35.8 41 L24 34 L12.2 41 L15.2 27.8 L5 18.8 L18.5 17.5 Z" fill="#fff"/>',
    lock: '<rect x="11" y="21" width="26" height="20" rx="4" fill="#fff"/><path d="M16 21 V15 Q16 7 24 7 Q32 7 32 15 V21"' + ST + '/>',
    speak: '<path d="M8 10 H40 V32 H22 L13 40 V32 H8 Z" fill="#fff"/>',
    left2: '<path d="M30 8 L14 24 L30 40"' + ST + '/>',
    right2: '<path d="M18 8 L34 24 L18 40"' + ST + '/>',
    plan: '<rect x="8" y="8" width="10" height="10" rx="2" fill="#fff"/><rect x="8" y="21" width="10" height="10" rx="2" fill="#fff"/><rect x="8" y="34" width="10" height="7" rx="2" fill="#fff"/><path d="M24 13 H40 M24 26 H40 M24 38 H34"' + ST + '/>',
    debug: '<circle cx="21" cy="21" r="12"' + ST + '/><path d="M30 30 L41 41"' + ST + '/>'
  }
  // colour category per command (with the icon, never colour alone — PRD §22.4)
  var CAT = { up: '#1E88E5', down: '#1E88E5', west: '#1E88E5', east: '#1E88E5', fwd: '#1E88E5', left: '#1E88E5', right: '#1E88E5', back: '#1E88E5', push: '#E0A100', spray: '#E53935', raise: '#FB8C00', lower: '#FB8C00',
    rescue: '#D81B60', pick: '#6D4C41', drop: '#6D4C41', repair: '#546E7A', jump: '#43A047', takeoff: '#1565C0', land: '#1565C0', hook: '#8D6E63', release: '#8D6E63', swop: '#7B1FA2' }
  function icon (cmd) {
    if (!cmd) return ''
    if (cmd.indexOf('swop:') === 0 || cmd.indexOf('form/') === 0) {
      var f = cmd.split(/[:\/]/)[1]
      return '<span class="mj-formico">' + module(f, 'top').replace('<svg ', '<svg class="mj-mini-top" ') + '</span>'
    }
    var b = ICON[cmd]
    return b ? svg('0 0 48 48', b) : ''
  }

  /* ── props and characters ───────────────────────────────────────────── */
  var DRAWN = {
    'obj/drop': svg('0 0 64 64', '<path d="M32 4 Q52 30 52 42 A20 20 0 0 1 12 42 Q12 30 32 4 Z" fill="#29B6F6" stroke="#0277BD" stroke-width="3"/><path d="M22 40 Q22 50 30 52" stroke="#E1F5FE" stroke-width="4" fill="none" stroke-linecap="round"/>'),
    'obj/bolt': svg('0 0 64 64', '<path d="M20 8 H44 L54 26 L44 44 H20 L10 26 Z" fill="#B0BEC5" stroke="#455A64" stroke-width="3"/><circle cx="32" cy="26" r="8" fill="#ECEFF1" stroke="#455A64" stroke-width="3"/><rect x="27" y="40" width="10" height="20" rx="2" fill="#90A4AE" stroke="#455A64" stroke-width="2"/><path d="M27 46 H37 M27 52 H37" stroke="#455A64" stroke-width="2"/>'),
    'tool/palu': svg('0 0 64 64', '<rect x="10" y="8" width="30" height="16" rx="3" fill="#78909C" stroke="#37474F" stroke-width="3" transform="rotate(-25 25 16)"/><rect x="26" y="20" width="9" height="40" rx="4" fill="#A1887F" stroke="#5D4037" stroke-width="3" transform="rotate(-25 30 40)"/>'),
    'tool/obeng': svg('0 0 64 64', '<rect x="26" y="4" width="12" height="26" rx="5" fill="#E53935" stroke="#8E0000" stroke-width="3"/><rect x="29.5" y="30" width="5" height="24" fill="#B0BEC5" stroke="#455A64" stroke-width="2"/><path d="M29 54 H35 L32 60 Z" fill="#455A64"/>'),
    'tool/tali': svg('0 0 64 64', '<circle cx="32" cy="32" r="22" fill="none" stroke="#A1887F" stroke-width="7"/><circle cx="32" cy="32" r="12" fill="none" stroke="#8D6E63" stroke-width="6"/><path d="M50 44 Q58 56 48 60" stroke="#A1887F" stroke-width="6" fill="none" stroke-linecap="round"/>'),
    'obj/gate-broken': svg('0 0 64 64', '<rect x="4" y="10" width="8" height="50" rx="2" fill="#8D6E63"/><rect x="52" y="10" width="8" height="50" rx="2" fill="#8D6E63"/><rect x="10" y="20" width="44" height="7" rx="2" fill="#BCAAA4" transform="rotate(12 32 24)"/><rect x="10" y="40" width="20" height="7" rx="2" fill="#BCAAA4" transform="rotate(-20 20 44)"/><rect x="36" y="44" width="18" height="7" rx="2" fill="#BCAAA4" transform="rotate(25 45 48)"/><path d="M30 30 l4 6 l-3 4 l4 5" stroke="#5D4037" stroke-width="2" fill="none"/>'),
    'obj/gate-fixed': svg('0 0 64 64', '<rect x="4" y="10" width="8" height="50" rx="2" fill="#8D6E63"/><rect x="52" y="10" width="8" height="50" rx="2" fill="#8D6E63"/><rect x="10" y="18" width="10" height="36" rx="2" fill="#A5D6A7" stroke="#2E7D32" stroke-width="2" transform="rotate(-70 12 54)"/><rect x="44" y="18" width="10" height="36" rx="2" fill="#A5D6A7" stroke="#2E7D32" stroke-width="2" transform="rotate(70 52 54)"/>'),
    'obj/swing-broken': svg('0 0 64 64', '<path d="M8 60 L20 6 H44 L56 60" stroke="#E53935" stroke-width="5" fill="none"/><path d="M26 6 V40 M38 6 V30" stroke="#795548" stroke-width="2.5"/><rect x="22" y="38" width="20" height="5" rx="2" fill="#FFB300" transform="rotate(28 32 40)"/>'),
    'obj/swing-fixed': svg('0 0 64 64', '<path d="M8 60 L20 6 H44 L56 60" stroke="#43A047" stroke-width="5" fill="none"/><path d="M26 6 V42 M38 6 V42" stroke="#795548" stroke-width="2.5"/><rect x="22" y="40" width="20" height="5" rx="2" fill="#FFB300"/>'),
    'obj/pit': svg('0 0 64 64', '<ellipse cx="32" cy="34" rx="27" ry="22" fill="#6D4C41"/><ellipse cx="32" cy="36" rx="21" ry="16" fill="#3E2723"/><ellipse cx="30" cy="38" rx="12" ry="8" fill="#1B0F0C"/>'),
    'obj/rubble': svg('0 0 64 64', '<ellipse cx="32" cy="36" rx="26" ry="20" fill="#8D6E63"/><circle cx="22" cy="34" r="6" fill="#A1887F"/><circle cx="38" cy="30" r="7" fill="#9E9E9E"/><circle cx="36" cy="42" r="5" fill="#BCAAA4"/>'),
    'obj/ash': svg('0 0 64 64', '<ellipse cx="32" cy="40" rx="22" ry="10" fill="#9E9E9E" opacity=".7"/><path d="M24 34 q4 -10 0 -18 M34 30 q5 -10 1 -20 M42 36 q3 -8 0 -14" stroke="#BDBDBD" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>'),
    // a nail for Belajar "Pasangkan Alat" (palu -> paku); no owner drawing of a nail exists
    'obj/paku': svg('0 0 64 64', '<g transform="rotate(35 32 32)"><rect x="18" y="8" width="28" height="8" rx="4" fill="#B0BEC5" stroke="#455A64" stroke-width="3"/><path d="M28 16 H36 V46 L32 58 L28 46 Z" fill="#CFD8DC" stroke="#455A64" stroke-width="3" stroke-linejoin="round"/><path d="M31 19 V44" stroke="#fff" stroke-width="2" stroke-linecap="round"/></g>'),
    'ui/bo-hat': svg('0 0 64 64', '<path d="M8 40 Q8 14 32 14 Q56 14 56 40 Z" fill="#FFB300" stroke="#8D6E00" stroke-width="3"/><rect x="4" y="38" width="56" height="8" rx="4" fill="#FFB300" stroke="#8D6E00" stroke-width="3"/>')
  }
  var LIB = {
    'char/bo': 'tk-char/mechanic-boy', 'char/bo-wrench': 'tk-char/mechanic-boy-wrench', 'char/mia': 'mojo-char/oona', 'char/kid': 'tk-char/explorer-kid', 'char/rafi': 'tk-char/lantern-boy',
    'char/cat': 'animals/cat', 'obj/rock': 'gt/rock', 'obj/fire': 'gt/fx-fire', 'obj/star': 'gt/star-collectible', 'obj/toolbox': 'gt/tool-kit', 'obj/flag': 'game/flag-red',
    'obj/tree': 'park/tree', 'obj/lamp': 'park/street-lamp', 'obj/crate': 'game/crate-wood', 'obj/cone': 'things/traffic-cone', 'obj/bush': 'game/bush', 'obj/bench': 'park/bench',
    'tool/kunci': 'gt/repair', 'tool/tangga': 'game/ladder', 'tool/roda': 'gt/part-tire', 'ui/trophy': 'game/trophy-gold', 'ui/gear': 'game/gear'
  }
  var cache = {}
  function src (key) {
    if (key.indexOf('mojo:') === 0) key = { 'mojo:palu': 'tool/palu', 'mojo:baut': 'obj/bolt', 'mojo:tetes': 'obj/drop', 'mojo:obeng': 'tool/obeng', 'mojo:kunci': 'tool/kunci', 'mojo:tali': 'tool/tali', 'mojo:paku': 'obj/paku' }[key] || key
    if (OVERRIDE[key]) return BASE + OVERRIDE[key]
    if (cache[key]) return cache[key]
    var s = DRAWN[key] ? url(DRAWN[key]) : LIB[key] ? lib(LIB[key]) : (key.indexOf('/') > 0 ? lib(key) : null)
    cache[key] = s
    return s
  }
  // every library file the game may show (warmed into the cache by the page for offline play)
  function libFiles () { var o = []; for (var k in LIB) if (!OVERRIDE[k]) o.push(lib(LIB[k])); Object.keys(OWNER).forEach(function (k) { o.push(lib(OWNER[k])) }); catalog.forEach(function (x) { o.push(x.src) }); 'map garage construction garage-street-land garage-street-port beach-dock-land beach-dock-port forest-trail-land forest-trail-port waterfall-land waterfall-port coast-land coast-port'.split(' ').forEach(function (k) { o.push(lib('mojo-bg/' + k)) })
    // menu art (home icons, map, garage stand, Bo poses) and the Belajar pictures
    ;('mojo-char/bo-think mojo-char/bo-celebrate mojo-prop/swap-stand mojo-prop/star mojo-ui/chevron-left-sheet15 mojo-ui/chevron-right-sheet15 mojo-ui/play-sheet15 ' +
      'mojo-ui/ico-peta mojo-ui/ico-bengkel mojo-ui/ico-koleksi mojo-ui/ico-episode mojo-ui/bo-profile-sheet11 mojo-ui/back-sheet15 mojo-prop/hammer mojo-prop/wrench ' +
      'mojo-prop/drill mojo-prop/logs mojo-prop/magnet mojo-prop/gear mojo-prop/lamp-post mojo-prop/waterdrop-sheet15 mojo-tile/road mojo-tile/fire game/ladder gt/part-tire').split(' ').forEach(function (k) { if (o.indexOf(lib(k)) < 0) o.push(lib(k)) })
    return o }

  W.MojoArt = { chassis: chassis, module: module, mojo: mojo, icon: icon, src: src,
    catalog: catalog, lib: lib, CAT: CAT, FORM: FORM, TOP_VB: TOP_VB, SIDE_VB: SIDE_VB, OVERRIDE: OVERRIDE, libFiles: libFiles, hasOverride: function (k) { return !!OVERRIDE[k] } }
})()
