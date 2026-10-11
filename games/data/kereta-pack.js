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
  ML.FORMS.linus = { name: 'Linus', verbs: ['pick', 'drop', 'deliver', 'couple', 'unlock', 'place'], color: '#2F5FA8', ability: 'couple' }
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
  function scene (lv, bi) { return (lv.bgs && lv.bgs[Math.min(bi || 0, lv.bgs.length - 1)]) || lv.bg || 'bg-bl-lembah' }
  function regionScene (r) { return r.bg }

  /* ── rails: ONE continuous track. Every road cell paints the same bed / sleepers / steel from its cell centre to
     each connected edge (a corner is one arc), at fixed widths and fixed sleeper phase, so neighbouring cells share
     edges exactly and no per-cell border or grass gap appears. Colours and the gravel bed come from the owner's
     kereta-tile art (gravel texture; bridge cells use planks). ── */
  var TILE = {}
  ;['gravel', 'water'].forEach(function (n) { if (!W.Image) return; var im = new W.Image(); im.src = lib('kereta-tile/' + n); TILE[n] = im })
  var GROUND = '#86bf55'
  // the whole lawn first: every non-water cell gets the grass tile drawn 12% oversize, so tiles overlap and no cell rim shows
  function paintGround (x, ch, R, Cn, s, grass) {
    x.fillStyle = GROUND; x.fillRect(0, 0, Cn * s, R * s)
    if (!grass) return
    var iw = grass.naturalWidth, ih = grass.naturalHeight, ix = iw * 0.1, iy = ih * 0.1
    for (var r = 0; r < R; r++) for (var c = 0; c < Cn; c++) {
      if (ch(r, c) === '~') continue
      x.drawImage(grass, ix, iy, iw - 2 * ix, ih - 2 * iy, c * s - s * 0.07, r * s - s * 0.07, s * 1.14, s * 1.14)
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
    return out
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
    row.innerHTML = '<b class="fk">Petualangan Besar selesai!</b>' + (lv.celebrate || []).map(function (k) { return '<img alt="" src="' + lib(k) + '">' }).join('')
    card.insertBefore(row, card.querySelector('.res-line'))
    if (W.MojoFX) { setTimeout(function () { try { W.MojoFX.confetti() } catch (e) {} }, 700); setTimeout(function () { try { W.MojoFX.confetti() } catch (e) {} }, 1500) }
  }

  var def = {
    id: 'kereta', gameId: 'g15k', saveKey: 'dunia-g15k-kereta',
    narrator: { name: 'Henry', full: 'Henry McCloud' }, heroName: 'Linus',
    text: { play: ['MULAI MAIN', 'LANJUT MAIN', 'MAIN LAGI'], again: 'Coba Lagi', mapTitle: 'Pilih Misi', collectionTitle: 'Teman-Teman Linus',
      collectionLead: 'Kenali para sahabat di atas rel. Ketuk untuk melihat.', collectionHead: 'Para Sahabat' },
    msg: { caught: 'Ada yang lewat di rel! TUNGGU sebentar sampai relnya kosong, lalu jalan lagi.' },
    libmap: libmap, hero: hero, scene: scene, regionScene: regionScene, background: background,
    pins: { 'bl-lembah': [14, 62], 'bl-samson': [30, 42], 'bl-hutan': [47, 66], 'bl-jembatan': [64, 40], 'bl-selamat': [80, 58], 'bl-pulang': [90, 34] },
    mapArt: function (port) { return background('bg-bl-lembah', port) },
    onResult: onResult, allChapters: true, paintGround: paintGround, objArt: objArt, ambient: ambient, art: ART, stories: STORIES, paintRoad: paintRoad, noKerbs: true, onHome: onHome, onMap: onMap, cast: CAST
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
    var ready = function () { reskinStatic(); buildHub(); rewireExit(); addSteam() }
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', ready); else ready()
  }
})(typeof window !== 'undefined' ? window : globalThis)
