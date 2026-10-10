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
  ML.FORMS.linus = { name: 'Linus', verbs: ['pick', 'drop', 'deliver', 'couple', 'unlock'], color: '#2F5FA8', ability: 'couple' }
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
  function scene (lv) { return lv.bg || 'bg-bl-lembah' }
  function regionScene (r) { return r.bg }

  /* ── rails: each road cell takes the tile that joins its road neighbours ──────────────────────────── */
  var TILE = {}
  ;['rail-h', 'rail-v', 'curve-ne', 'crossing', 'bridge'].forEach(function (n) { if (!W.Image) return; var im = new W.Image(); im.src = lib('kereta-tile/' + n); TILE[n] = im })
  function ready (n) { var im = TILE[n]; return im && im.complete && im.naturalWidth ? im : null }
  function isRoad (k) { return k === '.' || k === '=' || k === 'o' }
  function paintRoad (x, ch, r, c, X, Y, s, grass, drawTile) {
    if (grass) drawTile(x, grass, X, Y, s, 0.07); else { x.fillStyle = '#7DB85A'; x.fillRect(X, Y, s, s) }
    var n = isRoad(ch(r - 1, c)), e = isRoad(ch(r, c + 1)), so = isRoad(ch(r + 1, c)), w = isRoad(ch(r, c - 1))
    if (ch(r, c) === '=') { var bi = ready('bridge'); if (bi) { x.drawImage(bi, X - s * 0.02, Y - s * 0.02, s * 1.04, s * 1.04); return } }   // a bridge cell: the owner's bridge tile
    var cnt = (n ? 1 : 0) + (e ? 1 : 0) + (so ? 1 : 0) + (w ? 1 : 0), draws = []
    if (cnt === 4) draws.push(['crossing', 1, 1])
    else if (cnt === 3) {   // a T: the through line, then a half-cell stub toward the branch
      var vertical = n && so, stub = vertical ? (e ? 'e' : 'w') : (n ? 'n' : 's')
      draws.push([vertical ? 'rail-v' : 'rail-h', 1, 1, null], [vertical ? 'rail-h' : 'rail-v', 1, 1, stub])
    } else if (cnt === 2 && !(n && so) && !(e && w)) draws.push(['curve-ne', e ? -1 : 1, so ? -1 : 1])   // the sheet draws N+W; mirror for the other three
    else draws.push([(n || so) && !(e || w) ? 'rail-v' : 'rail-h', 1, 1])
    var pad = s * 0.02
    draws.forEach(function (d) {
      var im = ready(d[0])
      if (!im) { x.fillStyle = '#8A7A66'; x.fillRect(X + s * 0.1, Y + s * 0.1, s * 0.8, s * 0.8); return }
      x.save()
      if (d[3]) { x.beginPath(); var h = s / 2; x.rect(d[3] === 'e' ? X + h : X, d[3] === 's' ? Y + h : Y, (d[3] === 'e' || d[3] === 'w') ? h : s, (d[3] === 'n' || d[3] === 's') ? h : s); x.clip() }
      x.translate(X + s / 2, Y + s / 2); x.scale(d[1], d[2])
      x.drawImage(im, -s / 2 - pad, -s / 2 - pad, s + 2 * pad, s + 2 * pad); x.restore()
    })
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
    var done = 0, total = info.region.levels.length
    info.region.levels.forEach(function (id) { if (info.save.lv[id]) done++ })
    var pill = D.getElementById('map-stars'); if (pill) pill.innerHTML = '<i class="ico"><img src="' + MA.src('obj/star') + '" alt="" style="width:100%;height:100%"></i><b>' + done + ' dari ' + total + ' selesai</b>'
    var title = D.getElementById('map-title'); if (title) title.textContent = 'Pilih Misi'
    function pick (id) {
      var lv = ML.byId(id); if (!lv) return
      var pic = '../assets/kereta/cards/' + (info.region.card || 'card-bl-lembah-stasiun') + '.webp'
      card.innerHTML = '<img alt="" src="' + pic + '"><span class="k-d-t"><b class="fk">Misi ' + (ML.index(id) + 1) + ': ' + lv.title + '</b><small>' + lv.beats[0].story + '</small></span><button type="button" class="btn b-go fk" id="k-go"><i class="ico">' + MA.icon('run') + '</i><span>AYO MULAI</span></button>'
      D.getElementById('k-go').addEventListener('click', function () { info.start(id) })
      ;[].forEach.call(box.querySelectorAll('.lvl'), function (x) { x.classList.toggle('k-sel', x.getAttribute('data-level') === id) })
    }
    pick(info.nextId)
  }

  var def = {
    id: 'kereta', gameId: 'g15k', saveKey: 'dunia-g15k-kereta',
    narrator: { name: 'Henry', full: 'Henry McCloud' },
    text: { play: ['MULAI MAIN', 'LANJUT MAIN', 'MAIN LAGI'], again: 'Coba Lagi', mapTitle: 'Pilih Misi', collectionTitle: 'Teman-Teman Linus',
      collectionLead: 'Kenali para sahabat di atas rel. Ketuk untuk melihat.', collectionHead: 'Para Sahabat' },
    msg: { caught: 'Kura-kura sedang menyeberang rel! TUNGGU sebentar sampai relnya kosong, lalu jalan lagi.' },
    libmap: libmap, hero: hero, scene: scene, regionScene: regionScene, background: background,
    pins: { 'bl-lembah': [14, 62], 'bl-samson': [30, 42], 'bl-hutan': [47, 66], 'bl-jembatan': [64, 40], 'bl-selamat': [80, 58], 'bl-pulang': [90, 34] },
    mapArt: function (port) { return background('bg-bl-lembah', port) },
    art: ART, paintRoad: paintRoad, noKerbs: true, onHome: onHome, onMap: onMap, cast: CAST
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
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', reskinStatic); else reskinStatic()
  }
})(typeof window !== 'undefined' ? window : globalThis)
