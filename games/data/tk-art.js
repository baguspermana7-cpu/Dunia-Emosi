/* ============================================================================
 * tk-art.js — window.TKArt. Art SLOTS for Timmy & Kapal Legendaris (PRD v2 §0).
 *
 * Every picture the game shows is asked for by KEY: TKArt.src('ship/titanic'),
 * TKArt.src('char/timmy'), TKArt.scene('harbor-dawn') … Until the owner's art arrives a key
 * resolves to (1) an entry in OVERRIDE (owner files, filled by the ingest pipeline), else
 * (2) a code-drawn SVG (ships, portal, lifeboat) or a shared-library sprite (compass, anchor,
 * explorer boy for Timmy …). Scenes are layered CSS gradients + SVG silhouettes.
 * Re-skinning = add keys to OVERRIDE; no game code changes.
 * ==========================================================================*/
(function () {
  'use strict'
  var W = window
  var BASE = (function () { try { return location.pathname.indexOf('/Dunia-Emosi/') === 0 ? '/Dunia-Emosi/' : '/' } catch (e) { return '/' } })()
  function lib (k) { return (W.AssetIndex && AssetIndex.path(k)) || (BASE + 'assets/db/lib/' + k + '.webp') }
  function svgUrl (s) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s) }

  // owner art goes here, e.g. 'ship/titanic': 'assets/tk/ship/titanic.webp'
  // Owner sheets (2026-09-28, tools/ingest-asset-sheets.py). Ships use the banner-free
  // '-clean' twins (the labelled ones carry a baked-in name plate).
  var L = 'assets/db/lib/'
  var OVERRIDE = {
    // Titanic = the key-art side view with smoke (no name plate); legend twin: tk-legend/ship-titanic-clean
    'ship/titanic': L + 'tk-key/titanic-smoke.webp', 'ship/britannic': L + 'tk-legend/ship-britannic-clean.webp',
    'ship/arizona': L + 'tk-legend/ship-arizona-clean.webp', 'ship/cuttysark': L + 'tk-legend/ship-cuttysark-clean.webp',
    'ship/victory': L + 'tk-legend/ship-victory-clean.webp', 'ship/vasa': L + 'tk-legend/ship-vasa-clean.webp',
    'ship/mayflower': L + 'tk-legend/ship-mayflower-clean.webp', 'ship/endurance': L + 'tk-legend/ship-endurance-clean.webp',
    'ship/kontiki': L + 'tk-legend/ship-kontiki-clean.webp', 'ship/calypso': L + 'tk-legend/ship-calypso-clean.webp',
    'ship/queenmary': L + 'tk-legend/ship-queenmary-clean.webp', 'ship/nautilus': L + 'tk-legend/ship-nautilus-clean.webp',
    // no Missouri on the sheets: the ships-b battleship drawing (not the legend Arizona one)
    'ship/missouri': L + 'tk-ship2/uss-arizona-clean.webp',
    'ship/pelabuhan': L + 'tk-legend/time-harbor.webp',
    'ship/rescue': L + 'tk-ship2/arctic-explorer-clean.webp',
    'fx/portal': L + 'tk-key/portal.webp',          // soft-glow vortex; framed gate: tk-legend/time-portal
    'ui/logo': L + 'tk-key/logo.webp'
  }
  // shared-DB keys for other modules: TKArt.src(TKArt.PROPS.lifebuoy)
  var PROPS = {
    crate: 'tk-prop/crate-titanic', lifebuoy: 'tk-prop/lifebuoy-5', iceberg: 'tk-prop/iceberg-5', compass: 'tk-prop/compass-3',
    bell: 'tk-prop/ship-bell-1912', lantern: 'tk-prop/lantern-4', suitcase: 'tk-prop/suitcase-4', ticket: 'tk-prop/ticket-first-class',
    flag: 'tk-prop/flag-white-star-3', anchor: 'tk-prop/anchor-4', telegraph: 'tk-prop/engine-telegraph-6', lifeboat: 'tk-prop/lifeboat-11',
    wheel: 'tk-legend/ship-wheel-3', spyglass: 'tk-prop/spyglass-4', binoculars: 'tk-prop/binoculars-4', porthole: 'tk-prop/porthole-4',
    sextant: 'tk-prop/sextant-4', map: 'tk-legend/world-map-scroll', hourglass: 'tk-legend/hourglass', seagull: 'tk-legend/seagull-3',
    bottle: 'tk-prop/message-bottle', journal: 'tk-legend/journal-book'
  }
  // Owner rule: no woman without hijab in this game -- tk-char/lady-hat and tk-char/maid are in
  // the shared DB but must never be referenced here.
  var CHARS = {
    timmy: 'tk-key/timmy', captain: 'tk-char/captain-pointing', captain2: 'tk-char/captain-map',
    officer: 'tk-char/officer-boy', officer2: 'tk-char/officer-boy-binoculars', explorer: 'tk-char/explorer-kid',
    lantern: 'tk-char/lantern-boy', mechanic: 'tk-char/mechanic-boy', girl: 'tk-char/hijab-girl-book',
    girl2: 'tk-char/hijab-girl-blueprint', girl3: 'tk-char/hijab-girl-camera', officerGirl: 'tk-char/hijab-officer-tablet',
    officerGirl2: 'tk-char/hijab-officer-pointing', chef: 'tk-char/chef', diver: 'tk-char/diver',
    penguin: 'tk-char/penguin-captain', penguin2: 'tk-char/penguin-sailor'
  }
  // owner backdrops (2026-09-28, tools/tk_scenes.py): scene key -> shared-DB pair tk-scene/<name>-{land,port}
  var SCENE_ART = {
    'harbor-dawn': 'sunset-port', 'harbor-day': 'harbor-dock', 'harbor-morning': 'harbor-dock', 'rescue-dawn': 'sunset-port',
    'ship-deck': 'grand-staircase', 'old-deck': 'ship-deck', 'hospital-ship': 'ship-deck', 'engine': 'engine-room',
    'open-sea': 'jungle-falls', 'research-sea': 'island-cliff', 'shipyard': 'island-cliff',
    'deep-sea': 'underwater', 'antarctic': 'aurora-ice',
    'night-ocean': 'titanic-night-deck', 'lifeboat': 'ice-night', 'collision-far': 'ice-night',
    'time-harbor': 'sky-plaza'
  }
  var PLACEHOLDER = {
    'char/timmy': 'tk-key/timmy', 'char/timmy-sleeping': 'tk-key/timmy-sleeping', 'char/timmy-flying': 'tk-key/timmy-flying',
    'char/captain': 'tk-key/captain-arms', 'char/penguin': 'tk-char/penguin-captain', 'char/guide': 'sd/adventurer'
  }

  /* ── ships (side view, facing right, viewBox 0 0 400 200) ─────────────── */
  var KIND = {
    titanic: ['liner', '#1b1b1f', '#E0A94A', 4], britannic: ['liner', '#F4F4F2', '#E0A94A', 4, 'cross'], queenmary: ['liner', '#1b1b1f', '#C8412D', 3],
    rescue: ['liner', '#2B2F3A', '#C8412D', 1], vasa: ['sail', '#7A4A22', '#E8D9B5', 3, 'gold'], cuttysark: ['sail', '#1E1E1E', '#F2EDE0', 3],
    victory: ['sail', '#2B2B2B', '#EFE6D0', 3, 'band'], mayflower: ['sail', '#6B4423', '#E9DDC1', 3], endurance: ['explorer', '#1E1E1E', '#EDE6D2', 3],
    kontiki: ['raft', '#B98B4E', '#E8D7B2', 1], calypso: ['research', '#F2F2EE', '#2A6EA8', 1], arizona: ['navy', '#8C96A0', '#6E7882', 2],
    missouri: ['navy', '#7F8B97', '#65717D', 2], nautilus: ['sub', '#3D5A80', '#98C1D9', 0], pelabuhan: ['liner', '#4B2E83', '#FFD166', 3, 'glow']
  }
  function ship (id) {
    var k = KIND[id] || KIND.titanic, hull = k[1], acc = k[2], n = k[3], mark = k[4], t = k[0]
    var g = '<defs><linearGradient id="h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + hull + '"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient></defs>'
    var s = ''
    if (t === 'liner') {
      s += '<path d="M20 120 L380 120 L360 170 L45 170 Z" fill="url(#h)"/><path d="M45 160 L362 160 L360 170 L45 170 Z" fill="#9B2A22"/>'
      s += '<rect x="70" y="92" width="270" height="28" rx="3" fill="#F6F4EE"/><rect x="95" y="76" width="215" height="18" rx="3" fill="#EFECE4"/>'
      for (var i = 0; i < 26; i++) s += '<circle cx="' + (60 + i * 12) + '" cy="138" r="2.6" fill="#FFE8A8" opacity=".9"/>'
      for (var j = 0; j < 14; j++) s += '<rect x="' + (78 + j * 18) + '" y="99" width="9" height="7" rx="1" fill="#3A4A66"/>'
      var gap = 200 / Math.max(1, n)
      for (var f = 0; f < n; f++) { var x = 115 + f * gap; s += '<rect x="' + x + '" y="30" width="24" height="48" rx="3" fill="' + acc + '"/><rect x="' + x + '" y="30" width="24" height="10" fill="#1a1a1a"/>' }
      s += '<line x1="60" y1="40" x2="60" y2="92" stroke="#444" stroke-width="3"/><line x1="350" y1="44" x2="350" y2="92" stroke="#444" stroke-width="3"/>'
      if (mark === 'cross') s += '<rect x="205" y="126" width="30" height="10" fill="#D22"/><rect x="215" y="116" width="10" height="30" fill="#D22"/>'
      if (mark === 'glow') s += '<ellipse cx="200" cy="120" rx="190" ry="70" fill="#FFD166" opacity=".18"/>'
    } else if (t === 'sail' || t === 'explorer') {
      s += '<path d="M25 118 Q200 128 375 104 L352 160 Q200 172 52 160 Z" fill="url(#h)"/>'
      if (mark === 'gold') s += '<path d="M40 128 Q200 138 368 114" stroke="#E8B64A" stroke-width="5" fill="none"/><rect x="330" y="92" width="36" height="22" fill="#C99A3A"/>'
      if (mark === 'band') s += '<path d="M36 132 Q200 142 370 118" stroke="#E8B64A" stroke-width="7" fill="none"/>'
      var masts = [110, 200, 290]
      masts.forEach(function (mx, m) {
        var top = m === 1 ? 10 : 24
        s += '<line x1="' + mx + '" y1="' + top + '" x2="' + mx + '" y2="120" stroke="#5a3d22" stroke-width="5"/>'
        for (var r = 0; r < 3; r++) { var y = top + 10 + r * 30, w = 64 - r * 6; s += '<path d="M' + (mx - w / 2) + ' ' + y + ' Q' + mx + ' ' + (y + 8) + ' ' + (mx + w / 2) + ' ' + y + ' L' + (mx + w / 2 - 4) + ' ' + (y + 24) + ' Q' + mx + ' ' + (y + 32) + ' ' + (mx - w / 2 + 4) + ' ' + (y + 24) + ' Z" fill="' + acc + '" stroke="#b9ab8a" stroke-width="1.5"/>' }
      })
      s += '<path d="M290 30 L385 104 L300 104 Z" fill="' + acc + '" opacity=".9"/>'
      if (t === 'explorer') s += '<rect x="235" y="70" width="18" height="40" fill="#E8C35A"/><rect x="235" y="70" width="18" height="8" fill="#222"/>'
    } else if (t === 'raft') {
      for (var l = 0; l < 9; l++) s += '<rect x="' + (70 + l * 30) + '" y="134" width="28" height="24" rx="11" fill="' + (l % 2 ? '#A97B42' : hull) + '"/>'
      s += '<rect x="180" y="118" width="60" height="18" fill="#8a6a3c"/><line x1="200" y1="20" x2="200" y2="134" stroke="#5a3d22" stroke-width="6"/>'
      s += '<rect x="150" y="26" width="100" height="84" rx="6" fill="' + acc + '" stroke="#b9ab8a" stroke-width="2"/><circle cx="200" cy="68" r="22" fill="#C8412D" opacity=".8"/>'
    } else if (t === 'research') {
      s += '<path d="M40 118 L370 110 L350 162 L60 164 Z" fill="url(#h)" stroke="#bbb"/><rect x="170" y="78" width="120" height="34" rx="4" fill="#fff" stroke="#ccc"/>'
      s += '<rect x="220" y="46" width="30" height="32" fill="' + acc + '"/><line x1="100" y1="40" x2="140" y2="112" stroke="#555" stroke-width="5"/><line x1="100" y1="40" x2="70" y2="96" stroke="#555" stroke-width="3"/>'
      s += '<path d="M40 150 L352 146" stroke="' + acc + '" stroke-width="6"/>'
    } else if (t === 'navy') {
      s += '<path d="M20 124 L380 116 L356 162 L50 166 Z" fill="url(#h)"/><rect x="150" y="80" width="90" height="40" fill="' + acc + '"/><rect x="175" y="44" width="36" height="38" fill="' + acc + '"/>'
      s += '<line x1="193" y1="10" x2="193" y2="46" stroke="#555" stroke-width="4"/><rect x="95" y="104" width="40" height="16" rx="4" fill="' + acc + '"/><rect x="262" y="104" width="40" height="16" rx="4" fill="' + acc + '"/>'
      s += '<rect x="186" y="12" width="20" height="12" fill="#fff"/><rect x="186" y="12" width="20" height="4" fill="#3a5bd8"/>'
    } else if (t === 'sub') {
      s += '<ellipse cx="200" cy="120" rx="175" ry="42" fill="url(#h)"/><rect x="170" y="60" width="70" height="40" rx="12" fill="' + hull + '"/><line x1="220" y1="30" x2="220" y2="62" stroke="#333" stroke-width="4"/>'
      for (var p = 0; p < 5; p++) s += '<circle cx="' + (110 + p * 45) + '" cy="120" r="9" fill="' + acc + '" stroke="#fff" stroke-width="2"/>'
      s += '<path d="M25 120 L5 96 L5 144 Z" fill="' + hull + '"/>'
    }
    return svgUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">' + g + s + '</svg>')
  }
  function portal () {
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><radialGradient id="p"><stop offset="0" stop-color="#0a0520"/><stop offset=".35" stop-color="#2a1a7a"/><stop offset=".7" stop-color="#6a5cff"/><stop offset="1" stop-color="#b9a8ff" stop-opacity="0"/></radialGradient></defs>'
    s += '<circle cx="100" cy="100" r="98" fill="url(#p)"/>'
    for (var i = 0; i < 6; i++) s += '<path d="M100 100 m-' + (20 + i * 12) + ' 0 a' + (20 + i * 12) + ' ' + (18 + i * 11) + ' 0 1 1 ' + (40 + i * 24) + ' 0" fill="none" stroke="#c9bcff" stroke-opacity="' + (0.7 - i * 0.1) + '" stroke-width="3" transform="rotate(' + i * 33 + ' 100 100)"/>'
    return svgUrl(s + '</svg>')
  }
  function lifeboat () {
    return svgUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 110"><path d="M10 50 Q100 70 190 50 L170 92 Q100 104 30 92 Z" fill="#F4F1E8" stroke="#8a7a5a" stroke-width="3"/>' +
      '<path d="M22 66 Q100 82 178 66" stroke="#C8412D" stroke-width="5" fill="none"/><circle cx="70" cy="42" r="10" fill="#F2C8A0"/><circle cx="100" cy="40" r="10" fill="#E8B890"/><circle cx="130" cy="42" r="10" fill="#F2C8A0"/>' +
      '<rect x="60" y="48" width="80" height="14" rx="6" fill="#6A7FB0"/></svg>')
  }

  /* ── scenes: layered gradients (sky, sea) + silhouettes ───────────────── */
  var SCN = {
    'bedroom-night': ['linear-gradient(#1a1f4a,#2b2f6b 55%,#3a2f5c)', 'room'], 'bedroom-portal': ['radial-gradient(circle at 68% 42%,#6a5cff,#2a1a7a 30%,#161a44 65%)', 'room'],
    'time-tunnel': ['radial-gradient(circle at 50% 50%,#b9a8ff,#6a5cff 20%,#2a1a7a 45%,#0a0520 80%)', 'tunnel'], 'harbor-dawn': ['linear-gradient(#f6b36a,#f7d7a0 35%,#8fb4d6 60%,#2d5f8a)', 'harbor'],
    'harbor-day': ['linear-gradient(#8fd0ff,#cfeaff 45%,#4a9ad0 60%,#1f5f95)', 'harbor'], 'harbor-morning': ['linear-gradient(#ffd9a8,#e8f0ff 45%,#5aa0d0 60%,#23608f)', 'harbor'],
    'ship-deck': ['linear-gradient(#9cc9ec,#dcefff 50%,#b08858 51%,#7a5a36)', 'deck'], 'old-deck': ['linear-gradient(#bcd6e8,#e7f0f6 50%,#8a6238 51%,#5e4024)', 'deck'],
    'night-ocean': ['linear-gradient(#070b24,#16204f 55%,#0d2a4a 56%,#061a30)', 'night'], 'collision-far': ['linear-gradient(#050818,#101a3e 55%,#0a2340 56%,#04121f)', 'night'],
    'lifeboat': ['linear-gradient(#0b1233,#1c2b62 55%,#123055 56%,#082038)', 'night'], 'rescue-dawn': ['linear-gradient(#f6c38a,#f9e3c0 40%,#7fb0d8 58%,#2c5d88)', 'sea'],
    'hospital-ship': ['linear-gradient(#bfe3ff,#eef8ff 50%,#5aa6d6 58%,#236396)', 'sea'], 'shipyard': ['linear-gradient(#cfe4f2,#f2f5f0 50%,#9c7a52 51%,#6d5236)', 'yard'],
    'antarctic': ['linear-gradient(#bfe6ff,#f0fbff 50%,#dff3ff 56%,#9fd2ef)', 'ice'], 'open-sea': ['linear-gradient(#ffd18a,#ffe9c2 40%,#4fb0d6 56%,#1c6d9a)', 'sea'],
    'research-sea': ['linear-gradient(#9fe0ff,#e6f8ff 45%,#2aa0c8 56%,#0d5f86)', 'sea'], 'deep-sea': ['linear-gradient(#0d4a6e,#083450 50%,#041c30)', 'deep'],
    'time-harbor': ['linear-gradient(#3a1f7a,#7a4fd6 40%,#f2a0c8 58%,#3a2a8a)', 'harbor']
  }
  function sceneSvg (kind) {
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" preserveAspectRatio="xMidYMax slice">'
    if (kind === 'harbor' || kind === 'sea' || kind === 'night' || kind === 'ice') {
      for (var i = 0; i < 6; i++) s += '<path d="M0 ' + (150 + i * 16) + ' q25 -6 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0" fill="none" stroke="#fff" stroke-opacity="' + (0.16 - i * 0.02) + '" stroke-width="2"/>'
    }
    if (kind === 'harbor') s += '<path d="M0 150 L0 110 L30 110 L30 90 L55 90 L55 120 L80 120 L80 100 L100 100 L100 150 Z" fill="#2c3550" opacity=".55"/><rect x="340" y="80" width="16" height="70" fill="#e9e2d0" opacity=".8"/><path d="M332 80 L364 80 L348 60 Z" fill="#c8412d" opacity=".8"/>'
    if (kind === 'night') { for (var st = 0; st < 30; st++) s += '<circle cx="' + ((st * 67) % 400) + '" cy="' + ((st * 37) % 120) + '" r="' + (st % 3 ? 1 : 1.8) + '" fill="#fff" opacity=".8"/>' ; s += '<circle cx="330" cy="40" r="16" fill="#fff6d0"/>' }
    if (kind === 'ice') s += '<path d="M20 150 L60 110 L90 150 Z M260 150 L310 96 L360 150 Z" fill="#fff" opacity=".9"/><path d="M60 110 L72 150 L90 150 Z M310 96 L322 150 L360 150 Z" fill="#cfeefa"/>'
    if (kind === 'room') s += '<rect x="20" y="30" width="80" height="100" rx="4" fill="#0f1440" stroke="#6b72c8" stroke-width="3"/><circle cx="80" cy="55" r="10" fill="#fff6d0"/><rect x="0" y="180" width="400" height="60" fill="#241c44"/><rect x="250" y="150" width="140" height="40" rx="8" fill="#3a3a8a"/>'
    if (kind === 'deck') s += '<rect x="0" y="118" width="400" height="8" fill="#e9e2d0"/>' + [40, 110, 180, 250, 320, 390].map(function (x) { return '<rect x="' + x + '" y="92" width="4" height="30" fill="#e9e2d0"/>' }).join('')
    if (kind === 'yard') s += '<path d="M40 160 L360 160 L330 110 L70 110 Z" fill="#8a5a2c" opacity=".7"/><line x1="200" y1="20" x2="200" y2="110" stroke="#6b4a2a" stroke-width="5"/>'
    if (kind === 'deep') for (var b = 0; b < 12; b++) s += '<circle cx="' + ((b * 53) % 400) + '" cy="' + (40 + (b * 71) % 180) + '" r="' + (2 + b % 4) + '" fill="#9fd8ff" opacity=".35"/>'
    if (kind === 'tunnel') for (var r = 0; r < 7; r++) s += '<ellipse cx="200" cy="120" rx="' + (30 + r * 30) + '" ry="' + (22 + r * 22) + '" fill="none" stroke="#d9d0ff" stroke-opacity="' + (0.5 - r * 0.06) + '" stroke-width="3"/>'
    return svgUrl(s + '</svg>')
  }

  var CACHE = {}
  function src (k) {
    if (OVERRIDE[k]) return BASE + OVERRIDE[k]
    if (CACHE[k]) return CACHE[k]
    var v
    if (k.indexOf('ship/') === 0) v = ship(k.slice(5))
    else if (k === 'fx/portal') v = portal()
    else if (k === 'fx/lifeboat') v = lifeboat()
    else if (PLACEHOLDER[k]) v = lib(PLACEHOLDER[k])
    else v = lib(k)
    return (CACHE[k] = v)
  }
  function scene (k) {
    var d = SCN[k] || SCN['harbor-day']
    if (OVERRIDE['scene/' + k]) return 'url("' + BASE + OVERRIDE['scene/' + k] + '") center/cover'
    if (SCENE_ART[k]) {
      var port = false; try { port = W.innerHeight > W.innerWidth } catch (e) {}
      return 'url("' + lib('tk-scene/' + SCENE_ART[k] + (port ? '-port' : '-land')) + '") center bottom/cover no-repeat, ' + d[0]
    }
    return 'url("' + sceneSvg(d[1]) + '") center bottom/cover no-repeat, ' + d[0]
  }
  W.TKArt = { src: src, scene: scene, lib: lib, OVERRIDE: OVERRIDE, PROPS: PROPS, CHARS: CHARS, SCENE_ART: SCENE_ART, KIND: KIND, scenes: SCN, BASE: BASE }
})()
