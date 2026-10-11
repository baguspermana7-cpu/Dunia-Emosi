/* =============================================================================
 * kereta-pack.js — the "Kereta Pemberani" PACK for the Mojo engine (games/mojo-pack.js loads it for
 * `mojo-swoptops.html?pack=kereta`). It edits MojoLevels / MojoArt IN PLACE before any other module reads them and
 * publishes window.MojoPack.def, the hooks the Mojo shell asks for. Everything else is Mojo code untouched.
 *   levels + regions   data/kereta-pack-levels.js (Brave Locomotive, Bab 1 for checkpoint 1)
 *   hero               Linus drawn top-down, one picture per heading (TrainSprites.pick top-n/e/s/w); wagons trail
 *                      behind through prog-grid's own wagon / couple rules
 *   narrator           Henry McCloud (story-char/henry/*) in the chip that Mojo gives to Bo
 *   backgrounds        assets/kereta/bg/<key>-landscape|portrait.webp, per level
 *   ground             rails (kereta-tile/*) on the road cells, drawn by connection (straight, curve, crossing)
 *   skin               games/kereta-pack.css (wood, brass, parchment) keyed on <html data-pack="kereta">
 * ==========================================================================*/
(function (W) {
  'use strict'
  var P = W.MojoPack, ML = W.MojoLevels, MA = W.MojoArt, PG = W.ProgGrid, K = W.KeretaPackLevels, D = W.document
  if (!P || P.id !== 'kereta' || !ML || !K) return

  /* ── the hero: Linus (verbs = what the five missions use) ─────────────────────────────────────────── */
  ML.FORMS.linus = { name: 'Linus', verbs: ['pick', 'drop', 'deliver', 'couple', 'unlock', 'place', 'load', 'dump'], color: '#2F5FA8', ability: 'couple' }
  if (PG) PG.defineForm('linus', { verbs: ML.FORMS.linus.verbs })

  /* ── content: the Mojo level set becomes this storyline (arrays edited in place, other modules hold refs) ── */
  function swap (arr, next) { arr.length = 0; next.forEach(function (x) { arr.push(x) }) }
  swap(ML.CHAPTERS, K.CHAPTERS); swap(ML.REGIONS, K.REGIONS); swap(ML.LEVELS, K.LEVELS)

  var CAST = [
    { id: 'linus', name: 'Linus', ability: 'Lokomotif kecil berwarna biru yang ceria dan berani.', key: 'train-char/linus/34l-happy' },
    { id: 'henry', name: 'Henry McCloud', ability: 'Masinis yang baik hati. Ia menemani Linus di setiap misi.', key: 'story-char/henry/wave' },
    { id: 'samson', name: 'Samson', ability: 'Lokomotif raksasa yang kuat. Ia akan datang di Bab 2.', key: 'train-char/samson/34l-neutral' },
    { id: 'kura', name: 'Kura-kura', ability: 'Sahabat kecil di rel. Beri ia waktu untuk lewat.', key: 'animal/turtle/walk' }
  ]

  /* ── the art table: every object type resolves STORYLINE-SPECIFIC first (kereta-prop / kereta-tile / train-char /
     story-char / malivlak-char / animal), then the SHARED library (park/tree, mojo-prop/*, animals ...) where the story
     has no piece of its own. `specific` is only used when the database really holds it. ── */
  var AI = W.AssetIndex
  function has (k) { return !AI || !AI.path ? true : !!AI.path(k) }
  var SPECIFIC = {
    'obj/tree': 'kereta-prop/pine', 'obj/rock': 'kereta-prop/rock', 'obj/lamp': 'kereta-prop/lantern', 'obj/crate': 'kereta-prop/crate',
    'obj/bush': 'kereta-prop/bush', 'obj/dermaga': 'kereta-prop/station-small', 'obj/bengkel': 'kereta-prop/engine-house'
    // shared on purpose (the story draws none): obj/star, obj/flag, obj/bench, fences and flowers from mojo-prop / park
  }
  var ART = {}   // the resolved table (also read by the pack gate): key -> { key, specific: bool }
  Object.keys(SPECIFIC).forEach(function (k) { ART[k] = has(SPECIFIC[k]) ? { key: SPECIFIC[k], specific: true } : { key: null, specific: false } })
  Object.keys(K.LIB).forEach(function (k) { ART[k] = { key: K.LIB[k], specific: !/^(tk-|mojo-|park\/|game\/|things\/)/.test(K.LIB[k]) } })

  var libmap = {
    // the narrator chip: Henry in Bo's three poses
    'mojo-char/bo': 'story-char/henry/wave', 'mojo-char/bo-think': 'story-char/henry/worried', 'mojo-char/bo-celebrate': 'story-char/henry/wave',
    'mojo-char/bo-tools': 'story-char/henry/shovel', 'tk-char/mechanic-boy': 'story-char/henry/wave', 'tk-char/mechanic-boy-wrench': 'story-char/henry/shovel',
    // ground the Mojo board paints on its own: grass and water come from the owner's rail tile sheet
    'mojo-tile/grass': 'kereta-tile/grass', 'mojo-tile/water': 'kereta-tile/water'
  }

  function lib (k) { return (W.AssetIndex && W.AssetIndex.path && W.AssetIndex.path(k)) || ('../assets/db/lib/' + k + '.webp') }
  var HD = ['n', 'e', 's', 'w']
  function heading (h) { return typeof h === 'number' ? HD[((h % 4) + 4) % 4] : (typeof h === 'string' && HD.indexOf(h) >= 0 ? h : 'e') }
  function heroKey (view, h) {
    var TS = W.TrainSprites
    if (view === 'top') return (TS && TS.pick('linus', { view: 'top', facing: heading(h) })) || ('train-char/linus/top-' + heading(h))
    return (TS && TS.pick('linus', { view: 'front', facing: 225, expression: 'happy' })) || 'train-char/linus/34l-happy'
  }
  function hero (form, view, h) {
    if (form !== 'linus') return null
    var top = view === 'top', k = heroKey(view, h)
    return '<img class="owner-mojo owner-linus owner-' + (top ? 'top h-' + heading(h) : view) + '" src="' + lib(k) + '" alt="">'
  }

  /* ── backgrounds ─────────────────────────────────────────────────────────────────────────────────── */
  function background (key, port) { return '../assets/kereta/bg/' + key + (port ? '-portrait' : '-landscape') + '.webp' }
  var TERRAIN = 'meadow'
  function terrainOf (lv, bi) { var b = lv.beats[bi || 0]; return (b && b.terrain) || lv.terrain || 'meadow' }
  function moodOf (lv, bi) { var b = lv.beats[bi || 0]; return (b && b.mood) || lv.mood || 'sun' }
  function scene (lv, bi) {
    var scr = D.getElementById('scr-play'); if (scr) { scr.setAttribute('data-tint', lv.tint || ''); scr.setAttribute('data-mood', moodOf(lv, bi)); scr.setAttribute('data-terrain', terrainOf(lv, bi)) } TERRAIN = terrainOf(lv, bi)
    cabSet(lv)
    var mj = D.getElementById('mojo'); if (mj) mj.classList.toggle('k-tired', !!((lv.tired && lv.tired[bi || 0]) || (lv.beats[bi || 0] && lv.beats[bi || 0].tired === true)))
    return (lv.bgs && lv.bgs[Math.min(bi || 0, lv.bgs.length - 1)]) || lv.bg || 'bg-bl-lembah' }
  function regionScene (r) { return r.bg }

  /* ── rails: ONE continuous track. Every road cell paints the same bed / sleepers / steel from its cell centre to
     each connected edge (a corner is one arc), at fixed widths and fixed sleeper phase, so neighbouring cells share
     edges exactly and no per-cell border or grass gap appears. Colours and the gravel bed come from the owner's
     kereta-tile art (gravel texture; bridge cells use planks). ── */
  var TILE = {}
  ;['gravel', 'water'].forEach(function (n) { if (!W.Image) return; var im = new W.Image(); im.src = lib('kereta-tile/' + n); TILE[n] = im })
  var GROUND = '#86bf55'
  /* ── terrain: the ground looks like the PLACE (meadow, mountain, logging, depot, town, gorge), seeded per cell so it never shimmers ── */
  function rnd (r, c, k) { var h = (r * 73856093) ^ (c * 19349663) ^ ((k || 0) * 83492791); h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295 }
  function blot (x, cx, cy, rx, ry, col, a) { x.save(); x.globalAlpha = a; x.fillStyle = col; x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, 7); x.fill(); x.restore() }
  var BASE = { meadow: '#86bf55', mountain: '#7a756b', logging: '#6a4f34', depot: '#8b8478', town: '#9a8f7e', gorge: '#716c63' }
  function groundCell (x, kind, r, c, s, water) {
    var X = c * s, Y = r * s, i
    x.fillStyle = BASE[kind] || BASE.meadow; x.fillRect(X - 0.5, Y - 0.5, s + 1, s + 1)
    if (kind === 'mountain' || kind === 'gorge') {
      for (i = 0; i < 6; i++) blot(x, X + rnd(r, c, i) * s, Y + rnd(r, c, i + 9) * s, s * (0.12 + rnd(r, c, i + 3) * 0.2), s * (0.08 + rnd(r, c, i + 5) * 0.12), i % 2 ? '#5d5950' : '#9a948a', 0.5)
      for (i = 0; i < 9; i++) blot(x, X + rnd(r, c, i + 20) * s, Y + rnd(r, c, i + 30) * s, s * 0.025, s * 0.02, '#4c4840', 0.7)
      if (rnd(r, c, 77) > 0.72) blot(x, X + s * 0.5, Y + s * 0.5, s * 0.3, s * 0.16, '#f4f8fb', 0.92)
      if (r === 0) { var g = x.createLinearGradient(0, Y, 0, Y + s * 0.5); g.addColorStop(0, 'rgba(30,25,20,.55)'); g.addColorStop(1, 'rgba(30,25,20,0)'); x.fillStyle = g; x.fillRect(X, Y, s, s * 0.5) }
    } else if (kind === 'logging') {
      for (i = 0; i < 7; i++) blot(x, X + rnd(r, c, i) * s, Y + rnd(r, c, i + 9) * s, s * (0.1 + rnd(r, c, i + 3) * 0.16), s * 0.07, i % 2 ? '#52391f' : '#82643f', 0.55)
      for (i = 0; i < 10; i++) blot(x, X + rnd(r, c, i + 40) * s, Y + rnd(r, c, i + 50) * s, s * 0.035, s * 0.018, '#e2c78e', 0.8)   // sawdust
      if (rnd(r, c, 61) > 0.86) { blot(x, X + s * 0.5, Y + s * 0.62, s * 0.16, s * 0.1, '#5a3d20', 1); blot(x, X + s * 0.5, Y + s * 0.58, s * 0.13, s * 0.07, '#c89a5e', 1) }   // a stump
    } else if (kind === 'depot' || kind === 'town') {
      x.strokeStyle = 'rgba(60,52,42,.45)'; x.lineWidth = Math.max(1, s * 0.025)
      var n = kind === 'town' ? 3 : 4
      for (i = 0; i <= n; i++) { x.beginPath(); x.moveTo(X, Y + i * s / n); x.lineTo(X + s, Y + i * s / n); x.stroke() }
      for (var rr = 0; rr < n; rr++) { var off = (rr % 2) * s / (n * 1.4); for (i = 0; i < n; i++) { x.beginPath(); x.moveTo(X + off + i * s / n * 1.0, Y + rr * s / n); x.lineTo(X + off + i * s / n * 1.0, Y + (rr + 1) * s / n); x.stroke() } }
      for (i = 0; i < 4; i++) blot(x, X + rnd(r, c, i) * s, Y + rnd(r, c, i + 4) * s, s * 0.14, s * 0.08, '#6d665a', 0.3)
    }
    if (water) { var wg = x.createLinearGradient(X, Y, X, Y + s); wg.addColorStop(0, '#1d3b55'); wg.addColorStop(1, '#2f6a8c'); x.fillStyle = wg; x.fillRect(X - 0.5, Y - 0.5, s + 1, s + 1); blot(x, X + s * 0.5, Y + s * 0.6, s * 0.3, s * 0.05, '#9ed3ee', 0.45) }
  }
  function paintGround (x, ch, R, Cn, s, grass) {
    var kind = TERRAIN
    for (var r = 0; r < R; r++) for (var c = 0; c < Cn; c++) {
      var k = ch(r, c)
      if (kind === 'meadow' || kind === 'forest') {
        if (c === 0 && r === 0) { x.fillStyle = GROUND; x.fillRect(0, 0, Cn * s, R * s) }
        if (k === '~') continue
        if (grass) { var iw = grass.naturalWidth, ih = grass.naturalHeight, ix = iw * 0.1, iy = ih * 0.1; x.drawImage(grass, ix, iy, iw - 2 * ix, ih - 2 * iy, c * s - s * 0.07, r * s - s * 0.07, s * 1.14, s * 1.14) }
      } else groundCell(x, kind, r, c, s, kind === 'gorge' && k === '~')
    }
  }
  function isRoad (k) { return k === '.' || k === '=' || k === 'o' }
  var PAT = null
  function bed (x) {
    var im = TILE.gravel
    if (!PAT && im && im.complete && im.naturalWidth) { try { PAT = x.createPattern(im, 'repeat') } catch (e) { PAT = null } }
    return PAT || '#a08f78'
  }
  // points of one track arm: from the cell centre to the middle of an edge (or, for a corner, edge to edge)
  function arm (X, Y, s, d) { var cx = X + s / 2, cy = Y + s / 2, V = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] }[d]; return [[cx, cy], [cx + V[0] * s / 2, cy + V[1] * s / 2]] }
  function line (a, b, n) { var o = []; for (var i = 0; i <= n; i++) o.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]); return o }
  function curve (a, c, b, n) { var o = []; for (var i = 0; i <= n; i++) { var t = i / n, u = 1 - t; o.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]) } return o }
  function strokePts (x, pts) { x.beginPath(); pts.forEach(function (p, i) { if (i) x.lineTo(p[0], p[1]); else x.moveTo(p[0], p[1]) }); x.stroke() }
  function offset (pts, d) {
    return pts.map(function (p, i) {
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.sqrt(dx * dx + dy * dy) || 1
      return [p[0] - dy / l * d, p[1] + dx / l * d]
    })
  }
  function sleepers (x, pts, s, ts) {
    x.lineCap = 'butt'
    ts.forEach(function (t) {
      var k = Math.max(1, Math.min(pts.length - 2, Math.round(t * (pts.length - 1)))), p = pts[k], a = pts[k - 1], b = pts[k + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / l, ny = dx / l, h = s * 0.25
      x.beginPath(); x.moveTo(p[0] - nx * h, p[1] - ny * h); x.lineTo(p[0] + nx * h, p[1] + ny * h); x.stroke()
    })
  }
  function paintRoad (x, ch, r, c, X, Y, s, grass, drawTile) {
    var D4 = { n: isRoad(ch(r - 1, c)), e: isRoad(ch(r, c + 1)), s: isRoad(ch(r + 1, c)), w: isRoad(ch(r, c - 1)) }
    if (ch(r, c) === '=' && TILE.water && TILE.water.complete && TILE.water.naturalWidth) { var wi = TILE.water; x.drawImage(wi, wi.naturalWidth * 0.1, wi.naturalHeight * 0.1, wi.naturalWidth * 0.8, wi.naturalHeight * 0.8, X - s * 0.04, Y - s * 0.04, s * 1.08, s * 1.08) }   // a bridge crosses water
    var dirs = ['n', 'e', 's', 'w'].filter(function (d) { return D4[d] }), bridge = ch(r, c) === '='
    if (!dirs.length) dirs = ['e', 'w']
    var paths = [], isCorner = dirs.length === 2 && !(D4.n && D4.s) && !(D4.e && D4.w)
    if (isCorner) {
      var a = arm(X, Y, s, dirs[0])[1], b = arm(X, Y, s, dirs[1])[1]
      paths.push({ pts: curve(a, [X + s / 2, Y + s / 2], b, 18), ts: [0.14, 0.38, 0.62, 0.86] })
    } else if (dirs.length === 1) {   // a dead end: arm plus the opposite half so the line reads as a buffer-stop stub
      var o = { n: 's', s: 'n', e: 'w', w: 'e' }[dirs[0]]
      paths.push({ pts: line(arm(X, Y, s, dirs[0])[1], arm(X, Y, s, dirs[0])[0], 8), ts: [0.25, 0.75].map(function (t) { return t * 0.5 + 0.0 }) })
    } else {
      dirs.forEach(function (d) { var a2 = arm(X, Y, s, d); paths.push({ pts: line(a2[0], a2[1], 8), ts: [0.25, 0.75] }) })
    }
    var all = []; paths.forEach(function (p) { all = all.concat(p.pts) })
    x.save(); x.lineJoin = 'round'
    if (TERRAIN === 'mountain' || TERRAIN === 'gorge') { x.lineCap = 'butt'; x.strokeStyle = 'rgba(25,20,15,.5)'; x.lineWidth = s * 0.74; paths.forEach(function (p) { strokePts(x, p.pts) }); if (bridge) { x.strokeStyle = '#3a2a1a'; x.lineWidth = s * 0.66; paths.forEach(function (p) { strokePts(x, p.pts) }); x.strokeStyle = '#5c3d1f'; for (var q = 0; q < 4; q++) { x.beginPath(); x.moveTo(X + s * (0.15 + q * 0.23), Y + s * 0.78); x.lineTo(X + s * (0.15 + q * 0.23), Y + s); x.stroke() } } }
    // soft shadow, then the gravel (or plank) bed, drawn 1px long at both ends so cells overlap exactly
    x.lineCap = 'butt'
    x.lineWidth = s * 0.62; x.strokeStyle = bridge ? '#5c3a18' : 'rgba(70,52,30,.55)'
    paths.forEach(function (p) { strokePts(x, p.pts) })
    x.lineWidth = s * 0.54; x.strokeStyle = bridge ? '#8b5a2b' : '#8c7b64'
    paths.forEach(function (p) { strokePts(x, p.pts) })
    if (dirs.length > 2) { x.beginPath(); x.rect(X + s * 0.23, Y + s * 0.23, s * 0.54, s * 0.54); x.fillStyle = bridge ? '#8b5a2b' : '#8c7b64'; x.fill() }
    if (!bridge) {   // the owner's gravel texture over the solid bed (its own transparent rim never shows)
      x.globalAlpha = 0.7; x.strokeStyle = bed(x)
      paths.forEach(function (p) { strokePts(x, p.pts) })
      if (dirs.length > 2) { x.fillStyle = bed(x); x.fillRect(X + s * 0.23, Y + s * 0.23, s * 0.54, s * 0.54) } x.globalAlpha = 1
    }
    // sleepers
    x.strokeStyle = bridge ? '#5c3a18' : '#7a4a22'; x.lineWidth = s * 0.085
    paths.forEach(function (p) { sleepers(x, p.pts, s, p.ts) })
    // steel: dark underline, then the bright rail, both sides
    paths.forEach(function (p) {
      ;[-1, 1].forEach(function (sd) {
        var o2 = offset(p.pts, sd * s * 0.13)
        x.lineCap = 'butt'; x.strokeStyle = '#4b4f57'; x.lineWidth = s * 0.055; strokePts(x, o2)
        x.strokeStyle = '#d3d9e0'; x.lineWidth = s * 0.03; strokePts(x, o2)
      })
    })
    x.restore()
  }

  // cheap life on the board (transform / opacity only): glints on every water and bridge cell, chimney smoke over stations and the depot
  function ambient (lv, bi, b) {
    var out = [], vis = (b && b.vis) || []
    lv.grid.map.forEach(function (row, r) { for (var c = 0; c < row.length; c++) { var k = row.charAt(c); vis.forEach(function (v) { if (v.at[0] === r && v.at[1] === c) k = v.ch }); if (k === '~' || k === '=') out.push({ at: [r, c], cls: 'k-water', html: '<i class="k-glint"></i><i class="k-glint g2"></i><i class="k-glint g3"></i>' }) } })
    ;((b && b.decor) || lv.decor || []).concat(lv.objects || []).forEach(function (d) {
      var a = d.art || ''
      if (/engine-house|station-small|stasiun-kecil|depo/.test(a) || (K.LIB[a] && /engine-house|station-small/.test(K.LIB[a]))) out.push({ at: d.at, cls: 'k-chimney', html: '<i class="k-puff"></i><i class="k-puff p2"></i>' })
    })
    // the board takes the scenario's mood: wet dark ground gets puddles, sheen, rain across the board and lightning; lamps glow warm
    var md = moodOf(lv, bi), dark = md === 'night' || md === 'rain' || md === 'storm', fxl = (b && b.fx) || lv.fx || []
    if (dark) {
      if ((md === 'rain' || md === 'storm') && fxl.indexOf('rain') < 0) out.push({ at: [0, 0], cls: 'k-fx k-fx-rain', html: (function () { var h = ''; for (var i = 0; i < 16; i++) h += '<i class="f' + (i + 1) + '" style="--i:' + i + '"></i>'; return h })() })
      if (md === 'storm' && fxl.indexOf('lightning') < 0) out.push({ at: [0, 0], cls: 'k-fx k-fx-lightning', html: '<i></i>' })
      out.push({ at: [0, 0], cls: 'k-fx k-fx-sheen', html: '<i></i>' })
      lv.grid.map.forEach(function (row, r) { for (var c = 0; c < row.length; c++) if (',T'.indexOf(row.charAt(c)) >= 0 && ((r * 7 + c * 13) % 6 === 0)) out.push({ at: [r, c], cls: 'k-puddle', html: '<i></i>' }) })
      ;((b && b.decor) || lv.decor || []).concat(lv.objects || []).forEach(function (d) { if (/lantern|lentera/.test((d.art || '') + (d.id || '')) || d.id === 'sorot') out.push({ at: d.at, cls: 'k-lamp', html: '<i></i>' }) })
    } else if (md === 'sunset') out.push({ at: [0, 0], cls: 'k-fx k-fx-glow', html: '<i></i>' })
    else if (md === 'dream') out.push({ at: [0, 0], cls: 'k-fx k-fx-haze', html: '<i></i><i class="f2"></i>' })
    // whole-board atmosphere named by the beat: fog drifting, falling leaves, dust motes; flickering old lamps
    ;((b && b.fx) || lv.fx || []).forEach(function (f) {
      var n = f === 'fog' ? 2 : f === 'lightning' ? 1 : f === 'rain' ? 14 : 6, h = ''
      for (var i = 0; i < n; i++) h += '<i class="f' + (i + 1) + '" style="--i:' + i + '"></i>'
      out.push({ at: [0, 0], cls: 'k-fx k-fx-' + f, html: h })
    })
    ;((b && b.objectives) || []).forEach(function (ob) {
      if (ob['do'] !== 'reach') return
      var has = (lv.objects || []).some(function (o) { return o.type === 'flag' && o.at[0] === ob.at[0] && o.at[1] === ob.at[1] })
      if (!has) out.push({ at: ob.at, cls: 'k-flag', html: '<img alt="" src="' + lib('mojo-prop/flag-board') + '">' })
    })
    var ln = (b && b.lean) || lv.lean   // one wreck creaks and tilts as Linus passes
    if (ln) out.push({ at: ln, cls: 'k-lean', html: '<img alt="" src="' + lib('train-char/rongsokan-b/v3') + '">' })
    ;((b && b.lamps) || []).forEach(function (l) { out.push({ at: l, cls: 'k-lamp', html: '<i></i>' }) })
    ;((b && b.decor) || lv.decor || []).forEach(function (d) { if (/sawmill/.test(d.art || '')) out.push({ at: d.at, cls: 'k-chimney k-saw', html: '<i class="k-puff"></i><i class="k-puff p2"></i>' }) })
    return out
  }
  // Henry rides in Linus's cab (scenarios 1-8): a small leaning figure that travels with the engine
  function cabSet (lv) {
    var m = D.getElementById('mojo'); if (!m) return
    var c = m.querySelector('.k-cab')
    if (!lv.cab) { if (c) c.style.display = 'none'; return }
    if (!c) { c = D.createElement('img'); c.className = 'k-cab'; c.alt = ''; m.appendChild(c) }
    c.style.display = ''; c.src = lib(lv.cab)
  }
  // cast react when Linus comes next to them (pose swap), checked a few times a second while a level is on screen
  function startReact () {
    if (startReact.on) return; startReact.on = true
    setInterval(function () {
      if (D.body.getAttribute('data-scr') !== 'scr-play' || !W.__mojo) return
      var st = W.__mojo.state(); if (!st) return
      var r = st.position.r, c = st.position.c
      ;[].forEach.call(D.querySelectorAll('#decor .cast[data-react]'), function (d) {
        var p = d.getAttribute('data-rc').split(','), near = Math.abs(+p[0] - r) + Math.abs(+p[1] - c) <= 2, im = d.firstChild, want = near ? d.getAttribute('data-react') : d.getAttribute('data-src')
        if (im.getAttribute('src') !== want) { im.src = want; if (near && im.animate) im.animate([{ translate: '0 0' }, { translate: '0 -10px' }, { translate: '0 0' }], { duration: 320, easing: 'ease-out' }) }
      })
    }, 180)
  }
  // story cards on a level's intro (cutscene beats between playable moments)
  function onIntro (lv, bi) {
    if (!lv.cards || bi !== 0) return
    var box = D.querySelector('#ov-card .intro-card .intro'); if (!box || box.querySelector('.k-cards')) return
    var wrap = D.createElement('div'); wrap.className = 'k-cards'; var i = 0, timer = 0
    var slides = lv.cards.map(function (cd, n) {
      var sl = D.createElement('div'); sl.className = 'k-card' + (n ? '' : ' on')
      sl.style.backgroundImage = 'url(' + background(cd.bg || lv.bg, false) + ')'
      ;(cd.art || []).forEach(function (a) {
        var im = D.createElement('img'); im.alt = ''; im.src = lib(a.k); im.className = 'k-card-art'
        im.style.cssText = 'left:' + a.x + '%;height:' + (a.s || 60) + '%;' + (a.rot ? 'rotate:' + a.rot + 'deg;' : '') + (a.flip ? 'scale:-1 1;' : '')
        sl.appendChild(im)
      })
      var cap = D.createElement('p'); cap.className = 'k-card-cap'; cap.textContent = cd.text; sl.appendChild(cap)
      if (cd.headline) { var hl = D.createElement('div'); hl.className = 'k-paper'; hl.innerHTML = '<b></b><small>' + (cd.sub || '') + '</small>'; hl.firstChild.textContent = cd.headline; sl.appendChild(hl) }
      wrap.appendChild(sl); return sl
    })
    var dots = D.createElement('div'); dots.className = 'k-dots'; slides.forEach(function () { dots.appendChild(D.createElement('i')) }); wrap.appendChild(dots)
    function show (n) { i = n % slides.length; slides.forEach(function (s, k) { s.classList.toggle('on', k === i) }); [].forEach.call(dots.children, function (d, k) { d.classList.toggle('on', k === i) }) }
    function auto () { clearTimeout(timer); if (i < slides.length - 1) timer = setTimeout(function () { show(i + 1); auto() }, 3200) }
    wrap.addEventListener('click', function () { show(i + 1); auto() })
    show(0); auto(); box.insertBefore(wrap, box.firstChild)
  }
  function addSteam () {   // the locomotive's own chimney (steams while it stands, harder when it moves)
    var m = D.getElementById('mojo'); if (!m || m.querySelector('.k-steam')) return
    var e = D.createElement('div'); e.className = 'k-steam'; e.setAttribute('aria-hidden', 'true'); e.innerHTML = '<i></i><i></i>'; m.appendChild(e)
  }
  // the turtle tucks into its shell when Linus is close and walks when it is safe
  function objArt (o, w) {
    if (o.id !== 'kura' || !w || !w.m) return null
    return Math.abs(o.r - w.m.r) + Math.abs(o.c - w.m.c) <= 2 ? 'animal/turtle/shell' : 'animal/turtle/walk'
  }

  /* ── home: the owner's bright landing (primary-linus-bright.png): wooden sign, red MULAI MAIN, blue PILIH MISI,
     round Cara Main / Teman, Linus and Henry at the station, a rabbit and a turtle ── */
  function setText (sel, t) { var e = D.querySelector(sel); if (e) e.textContent = t }
  function reskinStatic () {
    D.title = 'Petualangan Linus: The Brave Locomotive'
    setText('.logo .l1', 'Petualangan'); setText('.logo .l2', 'Linus')
    setText('.home-brand .tag', 'Ayo susun langkah dan bantu teman!')
    setText('#btn-levels span', 'PILIH MISI'); setText('#btn-collection span', 'Teman')
    D.querySelectorAll('[aria-label*="Bo"]').forEach(function (e) { e.setAttribute('aria-label', e.getAttribute('aria-label').replace(/\bBo\b/g, 'Henry')) })
    D.querySelectorAll('.bo-copy small').forEach(function (e) { e.textContent = 'Pesan Henry ›' })
    D.querySelectorAll('img[alt="Bo"]').forEach(function (e) { e.alt = 'Henry' })
    var pt = D.getElementById('p-title'); if (pt && pt.parentNode) pt.parentNode.setAttribute('data-sub', 'Susun kartu, lalu tekan Jalan!')
  }
  function howTo () {
    var o = D.getElementById('ov-card'); if (!o) return
    o.innerHTML = '<div class="card k-howto"><h2 class="fk">Cara Main</h2><ol>' +
      '<li><b>1</b><span>Pilih kartu perintah, lalu susun urutannya di bawah.</span></li>' +
      '<li><b>2</b><span>Tekan <em>Jalan!</em> dan lihat Linus menjalankan kartumu.</span></li>' +
      '<li><b>3</b><span>Kalau belum pas, tidak apa-apa. Ubah kartunya, lalu coba lagi.</span></li></ol>' +
      '<div class="row"><button class="btn b-go fk" id="k-howto-ok" type="button">Ayo Main!</button></div></div>'
    o.classList.add('on'); D.getElementById('k-howto-ok').addEventListener('click', function () { o.classList.remove('on') })
  }
  var decor = false
  function onHome (st) {
    var home = D.getElementById('scr-home'); if (!home) return
    var hm = D.getElementById('home-mojo'); if (hm) hm.innerHTML = hero('linus', 'side')
    var hb = D.getElementById('home-bo'); if (hb) hb.src = lib('story-char/henry/wave')
    if (decor) return
    decor = true
    var d = D.createElement('div'); d.className = 'k-decor'; d.setAttribute('aria-hidden', 'true')
    d.innerHTML = '<img class="k-rabbit" alt="" src="' + lib('animal/kelinci/berdiri') + '"><img class="k-turtle" alt="" src="' + lib('animal/turtle/walk') + '">'
    home.appendChild(d)
    var r = D.createElement('div'); r.className = 'k-round'
    r.innerHTML = '<button type="button" id="k-howto"><img alt="" src="' + lib('mojo-ui/ico-episode') + '"><span>Cara Main</span></button>'
    r.firstChild.addEventListener('click', howTo)
    var coll = D.getElementById('btn-collection'); if (coll) r.appendChild(coll)
    home.appendChild(r)
    // PILIH MISI goes straight to the missions of the storyline (one chapter map), not the Mojo world map
    var lv = D.getElementById('btn-levels')
    if (lv) lv.addEventListener('click', function (e) { e.stopImmediatePropagation(); var n = ML.byId(st.next) || ML.LEVELS[0]; if (W.__mojo) W.__mojo.map(ML.region(n.id).id) }, true)
  }

  /* ── PILIH MISI: the trail of numbered stops and the mission card with AYO MULAI ── */
  function onMap (info) {
    var scr = D.getElementById('scr-map'), box = D.getElementById('chapters'); if (!scr || !box) return
    var card = D.getElementById('k-detail')
    if (!card) {
      card = D.createElement('div'); card.id = 'k-detail'; card.className = 'k-detail'; scr.appendChild(card)
      box.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('.lvl'); if (!b || b.classList.contains('lock')) return
        e.stopPropagation(); e.preventDefault(); pick(b.getAttribute('data-level'))
      }, true)
    }
    var done = 0, total = ML.LEVELS.length
    ML.LEVELS.forEach(function (l) { if (info.save.lv[l.id]) done++ })
    var pill = D.getElementById('map-stars'); if (pill) pill.innerHTML = '<i class="ico"><img src="' + MA.src('obj/star') + '" alt="" style="width:100%;height:100%"></i><b>' + done + ' dari ' + total + ' selesai</b>'
    var title = D.getElementById('map-title'); if (title) title.textContent = 'Pilih Misi'
    function pick (id) {
      var lv = ML.byId(id); if (!lv) return
      var pic = '../assets/kereta/cards/' + (ML.region(id).card || 'card-bl-lembah-stasiun') + '.webp'
      card.innerHTML = '<img alt="" src="' + pic + '"><span class="k-d-t"><b class="fk">Misi ' + (ML.index(id) + 1) + ': ' + lv.title + '</b><small>' + lv.beats[0].story + '</small></span><button type="button" class="btn b-go fk" id="k-go"><i class="ico">' + MA.icon('run') + '</i><span>AYO MULAI</span></button>'
      D.getElementById('k-go').addEventListener('click', function () { info.start(id) })
      ;[].forEach.call(box.querySelectorAll('.lvl'), function (x) { x.classList.toggle('k-sel', x.getAttribute('data-level') === id) })
    }
    var chips = D.getElementById('k-chips')
    if (!chips) { chips = D.createElement('nav'); chips.id = 'k-chips'; chips.setAttribute('aria-label', 'Bab'); scr.insertBefore(chips, box) }
    chips.innerHTML = ''
    ML.CHAPTERS.forEach(function (ch, i) {
      var b = D.createElement('button'); b.type = 'button'; b.className = 'k-chip'; b.textContent = (i + 1)
      b.setAttribute('aria-label', 'Bab ' + (i + 1) + ': ' + ch.title)
      b.addEventListener('click', function () { var h = [].filter.call(box.querySelectorAll('.chap'), function (c) { return c.querySelector('.ep') && c.querySelector('.ep').textContent === 'Episode ' + (i + 1) })[0]; if (h) box.scrollTo({ top: h.offsetTop - box.offsetTop - 6, behavior: 'smooth' }) })
      chips.appendChild(b)
    })
    ;[].forEach.call(box.querySelectorAll('.lvl'), function (x) { var l = ML.byId(x.getAttribute('data-level')); if (l && l.big) x.classList.add('k-big') })
    pick(info.nextId)
  }


  /* ── HUB: the title screen of Lokomotif Pemberani. ?pack=kereta&hub=1 shows it; a card reloads the page with
     the storyline's own level set (?pack=kereta&story=<id>, brave when absent). The fourth card is the classic game
     unchanged. A storyline that is not built yet has no card at all (children never see "segera hadir"). ── */
  var STORIES = [
    { id: 'brave', title: 'Petualangan Linus', sub: 'The Brave Locomotive', pic: '../assets/kereta/cards/card-bl-lembah-stasiun.webp', built: true },
    { id: 'malivlak', title: 'Dragutin dan Malivlak', sub: 'Dari stasiun sampai museum', pic: '../assets/kereta/cards/card-mv-stasiun.webp', built: false },
    { id: 'hellbent', title: 'Lomba ke Kota', sub: 'Kilat Perak dan Tuan Lemas', pic: '../assets/kereta/cards/card-hb-start.webp', built: false },
    { id: 'classic', title: 'Lokomotif Pemberani', sub: 'Game aslinya', pic: '../assets/train/backdrop/level20-640.webp', built: true, href: 'lokomotif-pemberani.html' }
  ]
  function buildHub () {
    if (!/[?&]hub=1/.test(W.location.search) || D.getElementById('k-hub')) return
    var h = D.createElement('section'); h.id = 'k-hub'; h.setAttribute('aria-label', 'Pilih cerita')
    h.innerHTML = '<button type="button" class="ibtn" id="k-hub-back" aria-label="Kembali ke peta Dunia"><i class="ico" data-ico="map"></i></button>' +
      '<div class="k-hub-sign fk"><span>Lokomotif</span><b>PEMBERANI</b><small>Pilih ceritamu!</small></div><div class="k-hub-cards" id="k-hub-cards"></div>'
    D.body.appendChild(h)
    var back = h.querySelector('#k-hub-back'); back.innerHTML = MA ? MA.icon('map') : ''
    back.addEventListener('click', function () { W.location.href = '../index.html' })
    var box = h.querySelector('#k-hub-cards')
    STORIES.filter(function (st) { return st.built }).forEach(function (st) {
      var b = D.createElement('button'); b.type = 'button'; b.className = 'k-hub-card'; b.setAttribute('data-story', st.id)
      b.innerHTML = '<img alt="" src="' + st.pic + '"><span class="fk">' + st.title + '</span><small>' + st.sub + '</small>'
      b.addEventListener('click', function () { W.location.href = st.href || ('mojo-swoptops.html?pack=kereta' + (st.id === 'brave' ? '' : '&story=' + st.id)) })
      box.appendChild(b)
    })
  }
  // inside a storyline the back button returns to the hub, not to the world map
  function rewireExit () {
    var b = D.getElementById('btn-exit'); if (!b) return
    b.addEventListener('click', function (e) { e.stopImmediatePropagation(); W.location.href = 'mojo-swoptops.html?pack=kereta&hub=1' }, true)
  }

  // the big adventure's payoff: the scenario's cast cheers on the result card, with a second round of confetti and fireworks
  function onResult (lv, stars) {
    if (!lv.big) return
    var card = D.querySelector('#ov-card .result'); if (!card) return
    var row = D.createElement('div'); row.className = 'k-cheer'
    row.innerHTML = '<b class="fk">' + (lv.quiet ? 'Linus tiba di kawasan baru' : 'Petualangan Besar selesai!') + '</b>' + (lv.celebrate || []).map(function (k) { return '<img alt="" src="' + lib(k) + '">' }).join('')
    card.insertBefore(row, card.querySelector('.res-line'))
    if (W.MojoFX && !lv.quiet) { setTimeout(function () { try { W.MojoFX.confetti() } catch (e) {} }, 700); setTimeout(function () { try { W.MojoFX.confetti() } catch (e) {} }, 1500) }
  }

  var def = {
    id: 'kereta', gameId: 'g15k', saveKey: 'dunia-g15k-kereta',
    narrator: { name: 'Henry', full: 'Henry McCloud' }, heroName: 'Linus',
    text: { play: ['MULAI MAIN', 'LANJUT MAIN', 'MAIN LAGI'], again: 'Coba Lagi', mapTitle: 'Pilih Misi', collectionTitle: 'Teman-Teman Linus',
      collectionLead: 'Kenali para sahabat di atas rel. Ketuk untuk melihat.', collectionHead: 'Para Sahabat' },
    msg: { 'cap-full': function () { return 'Sekopnya sudah penuh! Sekop dulu ke tungku.' }, 'no-load': function () { return 'Sekopnya kosong! MUAT batu bara dulu.' }, 'hole-full': function () { return 'Tungkunya sudah penuh.' }, caught: 'Ada yang lewat di rel! TUNGGU sebentar sampai relnya kosong, lalu jalan lagi.' },
    libmap: libmap, hero: hero, scene: scene, regionScene: regionScene, background: background,
    pins: { 'bl-lembah': [14, 62], 'bl-samson': [30, 42], 'bl-hutan': [47, 66], 'bl-jembatan': [64, 40], 'bl-selamat': [80, 58], 'bl-pulang': [90, 34] },
    mapArt: function (port) { return background('bg-bl-lembah', port) },
    onResult: onResult, onIntro: onIntro, allChapters: true, paintGround: paintGround, objArt: objArt, ambient: ambient, art: ART, stories: STORIES, paintRoad: paintRoad, noKerbs: true, onHome: onHome, onMap: onMap, cast: CAST
  }
  P.def = def
  if (MA) {
    MA.setPack(def)
    MA.extendLib(K.LIB)
    var useLib = {}, ovr = MA.OVERRIDE
    Object.keys(SPECIFIC).forEach(function (k) {
      if (!ART[k].specific) return
      if (ovr[k]) ovr[k] = 'assets/db/lib/' + SPECIFIC[k] + '.webp'   // keys the Mojo art pins to its own sheet
      else useLib[k] = SPECIFIC[k]
    })
    MA.extendLib(useLib)
    MA.OVERRIDE['char/bo'] = 'assets/db/lib/story-char/henry/wave.webp'   // the narrator chip's own picture
    // the collection: the cast, not the Mojo forms
    swap(MA.heroCatalog, []); swap(MA.catalog, [])
    swap(MA.showcase, CAST.map(function (c) { return { id: c.id, name: c.name, ability: c.ability, src: lib(c.key), film: true, note: c.ability } }))
  }
  if (D && D.addEventListener) {
    var ready = function () { reskinStatic(); buildHub(); rewireExit(); addSteam(); startReact() }
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', ready); else ready()
  }
})(typeof window !== 'undefined' ? window : globalThis)
