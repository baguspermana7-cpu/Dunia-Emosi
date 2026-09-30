/* ============================================================================
 * tk-atlas.js — window.TKAtlas. G30 "Timmy & Kapal Legendaris" WORLD SELECT sea chart.
 *
 * Owner 2026-09-29: "Maybe the world map can be expanded, or have branches." The linear 14-island strip
 * became a branching sea chart: 8 sea REGIONS, every world an island / port inside its region, ROUTES
 * joining them as a directed graph. Three parts, all in this file:
 *
 *  1. DATA   — REGIONS (name, tint, painted scene, blob, banner spot), NODES (world id -> region, x, y,
 *              island sprite, signpost spot), EDGES (from -> to, signpost hint), FINALE (fragments needed).
 *              Chart units: CHART.w x CHART.h; every size below is in chart units.
 *  2. RULES  — pure functions (node-testable; tools/qa-tk-atlas.mjs):
 *     graph(present)      the effective graph for the worlds that exist. An absent world (a legend whose
 *                         data file is not loaded) is CONTRACTED: its predecessors link to its successors;
 *                         a contracted edge that another route already covers is dropped (no shortcuts).
 *     compute(G, st)      st = { done:{id:1}, fragments:n, open:{id:1} (persisted) } -> { open, newly, ... }
 *                         A world is open when: it is already open in the save (NEVER re-locked), or it is
 *                         done, or it is a starter (kamar, titanic), or
 *                           - a route into it comes from a DONE world, or
 *                           - that route is a SEA GATE (crosses regions) and ANY world of the source
 *                             region is done ("the gate opens when any world in the region is finished"),
 *                         the finale (pelabuhan) opens when fragments >= need (min(FINALE.need, worlds)).
 *     migrate(G, st)      first run of the atlas on an old LINEAR save: open = everything the old linear rule
 *                         had open + every world with stars + everything the graph rules open now.
 *     next(G, st, last)   the one glowing "next" world; hint(G, id, st, name) the locked-tap line.
 *  3. VIEW   — mount(host, api): one transformed chart layer (HTML nodes + ONE svg for routes), pan with
 *              momentum, pinch / wheel / buttons zoom, "Lokasi Timmy" recenter, mini-map, fog over locked
 *              regions, signposts at branch points, Timmy's boat sailing the chosen route. Motion is
 *              transform / opacity only; pointer math uses event coordinates and a rect read once per layout
 *              (no per-frame layout reads). Reduced motion: no momentum, camera jumps, the boat fades.
 *
 * SAVE (owned by timmy-kapal.js, key "dunia-tk-v1"): S.atlas = { v: 1, open: [worldId…] } — the set of
 * worlds ever unlocked. It only grows.
 * ==========================================================================*/
(function () {
  'use strict'
  var W = (typeof window !== 'undefined' ? window : globalThis)

  /* ── 1. DATA ─────────────────────────────────────────────────────────── */
  var CHART = { w: 2400, h: 1480 }
  // blob: ellipse cx, cy, rx, ry · ban: banner centre · scene: TKArt.scene key (painted backdrop)
  // A banner sits nearest its OWN worlds (qa-tk-atlas: >= 40 units from any other region's world); playtest 2026-09-30:
  // "Laut Karibia" read as Vasa's sea, "Bawah Laut" sat against Erebus, so both moved into open water of their region
  // (Karibia's sea reaches west past Queen Anne's Revenge to hold its banner).
  var REGIONS = [
    { id: 'kamar', name: 'Laut Kamar', tint: '#F2B85A', scene: 'bedroom-night', blob: [215, 1290, 205, 175], ban: [215, 1170] },
    { id: 'atlantik', name: 'Samudra Atlantik', tint: '#2F7FD0', scene: 'harbor-dawn', blob: [500, 640, 410, 610], ban: [500, 455] },
    { id: 'eropa', name: 'Laut Eropa', tint: '#3FA37A', scene: 'shipyard', blob: [1105, 860, 310, 280], ban: [1125, 880] },
    { id: 'karibia', name: 'Laut Karibia', tint: '#23C9C0', scene: 'open-sea', blob: [960, 1320, 380, 175], ban: [560, 1330] },
    { id: 'kutub', name: 'Kutub Es', tint: '#CFEFFF', scene: 'antarctic', blob: [1690, 530, 310, 230], ban: [1690, 372] },
    { id: 'pasifik', name: 'Pasifik', tint: '#1E5FB8', scene: 'harbor-morning', blob: [1660, 1200, 300, 215], ban: [1560, 1068] },
    { id: 'bawah', name: 'Bawah Laut', tint: '#123E78', scene: 'deep-sea', blob: [2120, 600, 245, 430], ban: [2160, 540] },
    { id: 'pelabuhan', name: 'Pelabuhan Waktu', tint: '#8A5CE0', scene: 'time-harbor', blob: [1250, 175, 260, 175], ban: [1250, 34] }
  ]
  // world id -> [region, x, y, island sprite, legend ship sprite (used only when the world has none)], sign = signpost spot
  var NODES = {
    kamar: { r: 'kamar', x: 220, y: 1300, isle: 'tk-world/lighthouse-island' },
    titanic: { r: 'atlantik', x: 560, y: 1080, isle: 'tk-world/harbor-station', sign: [240, 1010], boat: [150, 70] },
    carpathia: { r: 'atlantik', x: 520, y: 790, isle: 'tk-world/arch-rock', ship: 'tk-legend-side/carpathia', legend: true },
    britannic: { r: 'atlantik', x: 250, y: 590, isle: 'tk-world/arch-island', sign: [490, 560] },
    republic: { r: 'atlantik', x: 760, y: 620, isle: 'tk-world/palm-island', ship: 'tk-legend-side/ss-republic', legend: true },
    queenmary: { r: 'atlantik', x: 230, y: 270, isle: 'tk-world/harbor-station' },
    maryceleste: { r: 'atlantik', x: 820, y: 300, isle: 'tk-world/cave-island', ship: 'tk-legend-side/mary-celeste', legend: true },
    mayflower: { r: 'atlantik', x: 520, y: 120, isle: 'tk-world/arch-island' },
    vasa: { r: 'eropa', x: 900, y: 1010, isle: 'tk-world/arch-rock', sign: [790, 868] },
    maryrose: { r: 'eropa', x: 1010, y: 670, isle: 'tk-world/cave-island', ship: 'tk-legend-side/mary-rose', legend: true },
    victory: { r: 'eropa', x: 1260, y: 1030, isle: 'tk-world/cave-island' },
    cuttysark: { r: 'eropa', x: 1310, y: 700, isle: 'tk-world/palm-island' },
    endurance: { r: 'kutub', x: 1560, y: 560, isle: 'tk-world/snow-island' },
    erebus: { r: 'kutub', x: 1840, y: 500, isle: 'tk-world/snow-mountain', ship: 'tk-legend-side/hms-erebus', legend: true },
    queenanne: { r: 'karibia', x: 840, y: 1330, isle: 'tk-world/palm-island', ship: 'tk-legend-side/queen-annes-revenge', legend: true },
    kontiki: { r: 'karibia', x: 1150, y: 1300, isle: 'tk-world/palm-island' },
    arizona: { r: 'pasifik', x: 1480, y: 1250, isle: 'tk-world/arch-rock' },
    missouri: { r: 'pasifik', x: 1830, y: 1140, isle: 'tk-world/arch-island' },
    nautilus: { r: 'bawah', x: 2120, y: 330, isle: 'tk-world/whirlpool' },
    calypso: { r: 'bawah', x: 2130, y: 850, isle: 'tk-world/cave-island' },
    pelabuhan: { r: 'pelabuhan', x: 1250, y: 150, isle: 'tk-world/ruins', finale: true }
  }
  // routes: [from, to, signpost hint]. A route whose ends lie in different regions is a SEA GATE.
  var EDGES = [
    ['kamar', 'titanic', 'Ke Samudra Atlantik!'],
    ['titanic', 'carpathia', 'Atlantik — kapal penolong!'],
    ['titanic', 'vasa', 'Laut Eropa — kapal kuno!'],
    ['titanic', 'queenanne', 'Laut Karibia — pulau hangat!'],
    ['carpathia', 'britannic', 'Kapal rumah sakit'],
    ['britannic', 'queenmary', 'Kapal tepat waktu'],
    ['britannic', 'republic', 'Harta karun kapal uap!'],
    ['queenmary', 'mayflower', 'Awal yang baru'],
    ['republic', 'maryceleste', 'Kapal misteri!'],
    ['maryceleste', 'mayflower', 'Awal yang baru'],
    ['mayflower', 'pelabuhan', 'Ke Pelabuhan Waktu!'],
    ['vasa', 'maryrose', 'Kapal Raja Inggris'],
    ['vasa', 'victory', 'Kapal pemimpin'],
    ['maryrose', 'cuttysark', 'Kapal tercepat'],
    ['victory', 'cuttysark', 'Kapal tercepat'],
    ['cuttysark', 'endurance', 'Ke Kutub Es — dingin & seru!'],
    ['endurance', 'erebus', 'Dua kapal kutub'],
    ['erebus', 'nautilus', 'Menyelam ke Bawah Laut!'],
    ['queenanne', 'kontiki', 'Naik rakit kayu!'],
    ['kontiki', 'arizona', 'Ke Pasifik — kapal besar!'],
    ['arizona', 'missouri', 'Kapal perdamaian'],
    ['missouri', 'calypso', 'Menyelam ke Bawah Laut!'],
    ['calypso', 'nautilus', 'Kapal selam!'],
    ['nautilus', 'pelabuhan', 'Ke Pelabuhan Waktu!']
  ]
  // scenery on the chart (owner sprites, no meaning): [sprite, x, y, width]
  var DECOR = [['tk-world/whale-tail', 930, 520, 150], ['tk-world/iceberg-2', 1490, 365, 130], ['tk-world/iceberg-big', 1990, 150, 150],
    ['tk-world/palm-island', 2285, 1065, 120], ['tk-world/whirlpool', 1960, 1010, 120], ['tk-prop/message-bottle', 560, 1400, 70]]
  var ROOT = 'kamar', STARTERS = ['kamar', 'titanic']
  var FINALE = { id: 'pelabuhan', need: 8 }
  // the order worlds unlocked in before the atlas (old worldOpen(i): i-th opens when the (i-1)-th is done)
  var LEGACY = ['kamar', 'titanic', 'britannic', 'vasa', 'cuttysark', 'victory', 'mayflower', 'endurance', 'kontiki',
    'calypso', 'queenmary', 'arizona', 'missouri', 'nautilus', 'pelabuhan']

  /* ── 2. RULES ────────────────────────────────────────────────────────── */
  function has (o, k) { return Object.prototype.hasOwnProperty.call(o, k) }
  function setOf (a) { var o = {}; (a || []).forEach(function (k) { o[k] = 1 }); return o }
  // present: array of world ids that exist (TKWorlds). Unknown ids (not in NODES) are ignored here.
  function graph (present) {
    var P = setOf(present), ids = Object.keys(NODES).filter(function (id) { return P[id] })
    var raw = {}; Object.keys(NODES).forEach(function (id) { raw[id] = [] })
    var hint = {}
    EDGES.forEach(function (e) { raw[e[0]].push(e[1]); hint[e[0] + '>' + e[1]] = e[2] })
    // successors of a present node through absent ones (contraction); remember which edges are contracted
    var out = {}, contracted = {}
    ids.forEach(function (a) {
      var res = [], seen = {}
      ;(function walk (u, via) {
        raw[u].forEach(function (v) {
          if (seen[v + '|' + via]) return; seen[v + '|' + via] = 1
          if (P[v]) { if (res.indexOf(v) < 0) res.push(v); if (via) contracted[a + '>' + v] = via } else walk(v, via || v)
        })
      })(a, '')
      out[a] = res
    })
    // drop a contracted edge a>v when v is still reachable from a through another route (no shortcuts)
    function reach (a, v, skip) {
      var st = out[a].filter(function (x) { return a + '>' + x !== skip }), seen = {}
      while (st.length) { var u = st.pop(); if (u === v) return true; if (seen[u]) continue; seen[u] = 1; st.push.apply(st, out[u]) }
      return false
    }
    Object.keys(contracted).forEach(function (k) { var p = k.split('>'); if (reach(p[0], p[1], k)) out[p[0]] = out[p[0]].filter(function (x) { return x !== p[1] }) })
    var inn = {}; ids.forEach(function (id) { inn[id] = [] })
    ids.forEach(function (a) { out[a].forEach(function (b) { inn[b].push(a) }) })
    var gate = {}, hints = {}
    ids.forEach(function (a) { out[a].forEach(function (b) {
      if (NODES[a].r !== NODES[b].r && b !== FINALE.id) gate[a + '>' + b] = 1
      // a contracted route keeps the sea-gate hint when it leaves the region, else the hint of its last leg
      var via = contracted[a + '>' + b]
      hints[a + '>' + b] = hint[a + '>' + b] || (via ? (NODES[a].r !== NODES[b].r ? hint[a + '>' + via] || hint[via + '>' + b] : hint[via + '>' + b] || hint[a + '>' + via]) : '') || ''
    }) })
    // BFS depth from the root: the recommended play order (ties: data order)
    var depth = {}, q = [ROOT]; if (P[ROOT]) depth[ROOT] = 0
    while (q.length) { var u = q.shift(); (out[u] || []).forEach(function (v) { if (!has(depth, v)) { depth[v] = depth[u] + 1; q.push(v) } }) }
    var order = ids.slice().sort(function (a, b) { return ((has(depth, a) ? depth[a] : 99) - (has(depth, b) ? depth[b] : 99)) || (ids.indexOf(a) - ids.indexOf(b)) })
    var regions = REGIONS.filter(function (r) { return ids.some(function (id) { return NODES[id].r === r.id }) })
    var fragWorlds = ids.filter(function (id) { return id !== ROOT && id !== FINALE.id }).length
    return { ids: ids, out: out, inn: inn, gate: gate, hints: hints, depth: depth, order: order, regions: regions,
      need: Math.max(1, Math.min(FINALE.need, fragWorlds)), has: P }
  }
  function regionOf (id) { return NODES[id] ? NODES[id].r : null }
  // which gates / regions are open for a done-set
  function regionDone (G, done) { var o = {}; G.ids.forEach(function (id) { if (done[id]) o[regionOf(id)] = 1 }); return o }
  function edgeOpen (G, a, b, done, rd) { return !!done[a] || (!!G.gate[a + '>' + b] && !!rd[regionOf(a)]) }
  function ruleOpen (G, id, st, rd) {
    if (STARTERS.indexOf(id) >= 0) return true
    if (id === FINALE.id) return (st.fragments | 0) >= G.need
    return G.inn[id].some(function (a) { return edgeOpen(G, a, id, st.done, rd) })
  }
  function compute (G, st) {
    var done = st.done || {}, kept = st.open || {}, rd = regionDone(G, done), open = {}, newly = []
    G.ids.forEach(function (id) {
      if (kept[id] || done[id] || ruleOpen(G, id, { done: done, fragments: st.fragments }, rd)) { open[id] = 1; if (!kept[id]) newly.push(id) }
    })
    // worlds unknown to the atlas that the save had open stay open (never re-lock)
    Object.keys(kept).forEach(function (id) { if (!G.has[id] || !NODES[id]) open[id] = 1 })
    var regionOpen = {}; G.ids.forEach(function (id) { if (open[id]) regionOpen[regionOf(id)] = 1 })
    return { open: open, newly: newly, regionOpen: regionOpen, regionDone: rd, done: done, fragments: st.fragments | 0, need: G.need }
  }
  // the old linear rule on the fixed legacy order (worlds appended later never shift it)
  function legacyOpen (done) {
    var o = { kamar: 1, titanic: 1 }
    for (var i = 1; i < LEGACY.length; i++) if (done[LEGACY[i - 1]]) o[LEGACY[i]] = 1
    return o
  }
  // st: { done, fragments, started:{id:1} (any stars / last played) }. Returns the sorted open list for S.atlas.
  function migrate (G, st) {
    var o = legacyOpen(st.done || {})
    Object.keys(st.started || {}).forEach(function (k) { o[k] = 1 })
    Object.keys(st.done || {}).forEach(function (k) { if (st.done[k]) o[k] = 1 })
    var r = compute(G, { done: st.done || {}, fragments: st.fragments, open: o })
    return Object.keys(r.open).sort()
  }
  // the one glowing world: the last played if still unfinished, else the open unfinished world closest to home
  function next (G, r, last) {
    if (last && r.open[last] && !r.done[last] && G.has[last]) return last
    // just finished a world: the first open unfinished route out of it (the child keeps sailing forward)
    var fw = last && G.has[last] ? G.out[last].filter(function (v) { return r.open[v] && !r.done[v] }) : []
    if (fw.length) return fw[0]
    for (var i = 0; i < G.order.length; i++) { var id = G.order[i]; if (r.open[id] && !r.done[id]) return id }
    return null
  }
  // the kind line for a locked tap (name(id) -> display name)
  function hint (G, id, r, name) {
    if (id === FINALE.id) return 'Kumpulkan ' + G.need + ' Kepingan Kompas dulu! Sekarang: ' + Math.min(r.fragments, G.need) + '.'
    var ins = G.inn[id] || [], gate = ins.filter(function (a) { return G.gate[a + '>' + id] })[0]
    if (gate) { var rg = REGIONS.filter(function (x) { return x.id === regionOf(gate) })[0]; return 'Selesaikan satu kapal di ' + rg.name + ' untuk membuka gerbang laut!' }
    var pre = ins.filter(function (a) { return r.open[a] })[0] || ins[0]
    return pre ? 'Selesaikan ' + name(pre) + ' dulu untuk membuka kapal ini!' : 'Kapal ini belum terbuka.'
  }
  // shortest route between two worlds over OPEN worlds (either direction), for the sailing boat
  function path (G, a, b, open) {
    if (a === b) return [a]
    var nb = {}; G.ids.forEach(function (id) { nb[id] = [] })
    G.ids.forEach(function (x) { G.out[x].forEach(function (y) { nb[x].push(y); nb[y].push(x) }) })
    var prev = {}, q = [a]; prev[a] = a
    while (q.length) {
      var u = q.shift(); if (u === b) break
      nb[u].forEach(function (v) { if (!has(prev, v) && (open[v] || v === b)) { prev[v] = u; q.push(v) } })
    }
    if (!has(prev, b)) return [a, b]
    var out = [b]; while (out[0] !== a) out.unshift(prev[out[0]])
    return out
  }
  // QA: structural checks for one presence set. Returns a list of problems (empty = valid).
  function validate (G) {
    var bad = [], seen = {}, q = [ROOT]
    while (q.length) { var u = q.shift(); if (seen[u]) continue; seen[u] = 1; q.push.apply(q, G.out[u] || []) }
    G.ids.forEach(function (id) {
      if (!seen[id]) bad.push('unreachable ' + id)
      if (id !== FINALE.id && !G.out[id].length) bad.push('dead end ' + id)
      if (G.out[id].length > 3) bad.push('>3 routes from ' + id)
      // one finish never opens more than 3 new worlds: its own routes + (when it can be the FIRST world finished
      // in its region: a starter or a region entry) the sea gates of its region
      var gates = {}; G.out[id].forEach(function (b) { gates[b] = 1 })
      var first = STARTERS.indexOf(id) >= 0 || !G.inn[id].length || G.inn[id].some(function (a) { return regionOf(a) !== regionOf(id) })
      if (first) G.ids.forEach(function (a) { if (regionOf(a) === regionOf(id)) G.out[a].forEach(function (b) { if (G.gate[a + '>' + b]) gates[b] = 1 }) })
      if (Object.keys(gates).length > 3) bad.push('>3 unlocks when finishing ' + id + ': ' + Object.keys(gates).join(','))
    })
    return bad
  }

  /* level completion that survives levels INSERTED into a world later (a level with `added` is optional):
     sf(levelId) -> stars. worldDone: every original level starred, or every level starred.
     levelOpen: the first level; the previous one starred; progress beyond it (a later level starred);
     or an added level whose nearest earlier ORIGINAL level is starred. Nothing a save reached re-locks. */
  function worldDoneOf (w, sf) {
    var L = (w && w.levels) || []; if (!L.length) return false
    var orig = L.filter(function (l) { return !l.added })
    return (orig.length ? orig : L).every(function (l) { return sf(l.id) > 0 }) || L.every(function (l) { return sf(l.id) > 0 })
  }
  function levelOpenOf (w, k, sf) {
    var L = (w && w.levels) || []
    if (k <= 0) return true
    if (sf(L[k - 1].id) > 0) return true
    for (var j = k + 1; j < L.length; j++) if (sf(L[j].id) > 0) return true
    // after an added (optional) level: open once the nearest earlier ORIGINAL level is starred
    if (L[k - 1].added) { for (var i = k - 1; i >= 0; i--) if (!L[i].added) return sf(L[i].id) > 0; return true }
    return false
  }

  /* ── 3. VIEW ─────────────────────────────────────────────────────────── */
  var MIN_S = 0.66, MAX_S = 1.6   // MIN_S: a 22-unit label is >= 14.5 px on screen
  function clamp (a, v, b) { return Math.max(a, Math.min(b, v)) }
  function esc (t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;') }
  // a gentle curve for a route (control point off the middle, side fixed by the ids so it never flips)
  function curve (a, b, k) {
    var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, L = Math.sqrt(dx * dx + dy * dy) || 1
    var sd = (k % 2 ? 1 : -1) * Math.min(90, L * 0.16)
    return { x: mx - dy / L * sd, y: my + dx / L * sd }
  }
  // the direction (degrees, 0 = right, 90 = down) a route leaves world a for world b: the first stretch of its curve
  function signAngle (a, b) {
    var A = NODES[a], B = NODES[b], c = curve(A, B, hashOf(a + b)), p = qpt(A, c, B, 0.3)
    return Math.atan2(p.y - A.y, p.x - A.x) * 180 / Math.PI
  }
  function hashOf (s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h) }
  function qpt (a, c, b, t) { var u = 1 - t; return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y } }

  function mount (host, api) {
    if (MOUNTED && MOUNTED.host === host) { MOUNTED.refresh(api); return MOUNTED }
    if (MOUNTED) MOUNTED.destroy()
    var C = { host: host, api: api }, cam = { s: 1, x: 0, y: 0 }, vp, world, mini, miniRect, ship, RO = null, rzT = 0
    var box = { w: 0, h: 0, l: 0, t: 0, top: 0, bot: 0 }, raf = 0, tw = 0, sailing = false, atHome = false
    host.classList.add('atl-host')
    host.innerHTML = '<div class="atl-vp" role="application" aria-label="Peta laut: geser untuk melihat, cubit untuk memperbesar">' +
      '<div class="atl-world"></div></div>' +
      '<div class="atl-ctl"><button class="ibtn atl-zi" type="button" aria-label="Perbesar peta"><i class="atl-plus" aria-hidden="true"></i></button>' +
      '<button class="ibtn atl-zo" type="button" aria-label="Perkecil peta"><i class="atl-minus" aria-hidden="true"></i></button>' +
      '<button class="ibtn lbl atl-me" type="button" aria-label="Lokasi Timmy"><img alt="" draggable="false"><span>Timmy</span></button></div>' +
      '<button class="atl-mini" type="button" aria-label="Peta kecil: ketuk untuk pindah"><svg viewBox="0 0 ' + CHART.w + ' ' + CHART.h + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true"></svg></button>'
    vp = host.querySelector('.atl-vp'); world = host.querySelector('.atl-world'); mini = host.querySelector('.atl-mini')
    world.style.width = CHART.w + 'px'; world.style.height = CHART.h + 'px'

    /* camera */
    function clampCam (c) {
      var s = clamp(MIN_S, c.s, MAX_S), cw = CHART.w * s, ch = CHART.h * s, x = c.x, y = c.y
      var avW = box.w, top = box.top, avH = box.h - box.bot
      // the chart may slide past its edge by the width of the side chrome, so an edge world can clear the buttons / mini-map
      x = cw <= avW ? (avW - cw) / 2 : clamp(avW - cw - (box.padR || 12), x, box.padL || 12)
      y = ch <= avH - top ? top + (avH - top - ch) / 2 : clamp(avH - ch - 12 - (box.padB || 0), y, top + 12)
      return { s: s, x: x, y: y }
    }
    function apply () {
      world.style.transform = 'translate3d(' + cam.x.toFixed(1) + 'px,' + cam.y.toFixed(1) + 'px,0) scale(' + cam.s.toFixed(4) + ')'
      if (miniRect) {
        miniRect.setAttribute('x', (-cam.x / cam.s).toFixed(0)); miniRect.setAttribute('y', ((box.top - cam.y) / cam.s).toFixed(0))
        miniRect.setAttribute('width', (box.w / cam.s).toFixed(0)); miniRect.setAttribute('height', ((box.h - box.top - box.bot) / cam.s).toFixed(0))
      }
    }
    function set (c) { cam = clampCam(c); apply() }
    function stopAnim () { cancelAnimationFrame(raf); cancelAnimationFrame(tw); raf = tw = 0 }
    // animate the camera (240 ms ease-out; reduced motion jumps)
    function tweenTo (c, ms, done) {
      stopAnim(); var to = clampCam(c), from = { s: cam.s, x: cam.x, y: cam.y }
      if (api.reduced() || !ms) { set(to); done && done(); return }
      var t0 = 0
      ;(function f (now) {
        if (!t0) t0 = now
        var k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3)
        cam = { s: from.s + (to.s - from.s) * e, x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e }; apply()
        if (k < 1) tw = requestAnimationFrame(f); else { tw = 0; done && done() }
      })(performance.now())
    }
    // put chart point (px, py) at the middle of the free area
    function centerOn (px, py, s, ms, done) {
      var s2 = clamp(MIN_S, s || cam.s, MAX_S), midY = box.top + (box.h - box.top - box.bot) / 2
      tweenTo({ s: s2, x: box.w / 2 - px * s2, y: midY - py * s2 }, ms, done)
    }
    function zoomAt (sx, sy, f) {
      var s2 = clamp(MIN_S, cam.s * f, MAX_S), k = s2 / cam.s
      set({ s: s2, x: sx - (sx - cam.x) * k, y: sy - (sy - cam.y) * k })
    }
    C.center = function (id, ms) { var n = NODES[id]; atHome = false; if (n) centerOn(n.x, n.y + 30, null, ms == null ? 240 : ms) }
    C.cam = function () { return { s: cam.s, x: cam.x, y: cam.y } }
    C.busy = function () { return !!(raf || tw || sailing) }   // camera tween / momentum / sailing in progress
    C.box = function () { return { w: box.w, h: box.h, top: box.top, bot: box.bot } }
    C.zoom = function (f) { atHome = false; var midY = box.top + (box.h - box.top - box.bot) / 2, s2 = clamp(MIN_S, cam.s * f, MAX_S), k = s2 / cam.s
      tweenTo({ s: s2, x: box.w / 2 - (box.w / 2 - cam.x) * k, y: midY - (midY - cam.y) * k }, 220) }
    C.pan = function (dx, dy) { atHome = false; stopAnim(); set({ s: cam.s, x: cam.x + dx, y: cam.y + dy }) }

    /* measure: the free area between the top bar and the footer (read once per layout, never per frame) */
    function measure () {
      var r = vp.getBoundingClientRect(), scr = host.closest('.scr') || document.body
      var tb = scr.querySelector('.topbar'), ft = scr.querySelector('.w-foot')
      var tbR = tb ? tb.getBoundingClientRect() : null, ftR = ft ? ft.getBoundingClientRect() : null
      box = { w: r.width, h: r.height, l: r.left, t: r.top, top: tbR ? Math.max(0, tbR.bottom - r.top) : 0, bot: ftR ? Math.max(0, r.bottom - ftR.top) : 0 }
      // ONE control group at the bottom right, just above the footer: the mini-map over a backed dock of zoom in /
      // zoom out / Timmy (owner tablet 2026-09-30: the old left column hid the Atlantik banner and a signpost; the
      // mini-map at the top right covered banners and worlds under the star counter). On a short free area the dock
      // lies down as a row with the mini-map beside it.
      var mw = Math.round(clamp(104, box.w * 0.16, 190)), mh = Math.round(mw * CHART.h / CHART.w); mini.style.width = mw + 'px'; mini.style.height = mh + 'px'
      var ctl = host.querySelector('.atl-ctl'), b0 = Math.round(box.bot + 10); ctl.style.top = ''; ctl.style.bottom = b0 + 'px'
      ctl.classList.remove('atl-ctl--row'); mini.style.top = ''; mini.style.right = ''
      var free = box.h - box.top - box.bot, row = box.w < 500 || ctl.offsetHeight + mh + 28 > free   // a phone upright: a strip above the footer, not a column over the chart
      // a phone on its side (free height < 300 px): no room for a mini-map beside the dock without covering the
      // world in the middle — it is hidden there (the dock's zoom and Timmy buttons stay)
      mini.hidden = row && free < 300
      if (row) ctl.classList.add('atl-ctl--row')
      box.dockW = ctl.offsetWidth; box.dockH = ctl.offsetHeight; box.miniW = mw; box.miniH = mh
      if (row) { mini.style.right = (10 + box.dockW + 8) + 'px'; mini.style.bottom = b0 + 'px' }
      else { mini.style.right = '10px'; mini.style.bottom = (b0 + box.dockH + 8) + 'px' }
      box.colW = row ? box.dockW + (mini.hidden ? 0 : 8 + mw) : Math.max(mw, box.dockW); box.row = row
      box.padL = 12; box.padR = 10 + box.colW + 12; box.padB = row ? box.dockH + 10 : 0
    }

    /* build the chart */
    function build () {
      var G = api.G, r = api.status, nx = api.next, me = api.here, sp = { }
      var svg = '<svg class="atl-svg" width="' + CHART.w + '" height="' + CHART.h + '" viewBox="0 0 ' + CHART.w + ' ' + CHART.h + '" aria-hidden="true">' +
        '<defs><pattern id="atl-wave" width="120" height="60" patternUnits="userSpaceOnUse"><path d="M6 34 q14 -12 28 0 t28 0" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="3" stroke-linecap="round"/>' +
        '<path d="M66 12 q12 -9 24 0" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="3" stroke-linecap="round"/></pattern></defs>' +
        '<rect width="' + CHART.w + '" height="' + CHART.h + '" fill="url(#atl-wave)"/>'
      var k = 0, routes = ''
      G.ids.forEach(function (a) { G.out[a].forEach(function (b) {
        var A = NODES[a], B = NODES[b], c = curve(A, B, hashOf(a + b)), d = 'M' + A.x + ' ' + A.y + ' Q' + c.x.toFixed(0) + ' ' + c.y.toFixed(0) + ' ' + B.x + ' ' + B.y
        var open = r.open[b] && (r.open[a] || r.done[a]), trav = r.done[a] && r.done[b], gate = G.gate[a + '>' + b]
        var cls = trav ? 'trav' : open ? 'open' : 'shut'
        routes += '<g class="rt ' + cls + (gate ? ' gate' : '') + '" data-e="' + a + '>' + b + '"><path class="rb" d="' + d + '"/><path class="rd" d="' + d + '"/></g>'
        sp[a + '>' + b] = { a: A, c: c, b: B }; k++
      }) })
      svg += routes + '</svg>'
      C.segs = sp
      var html = ''
      // regions: the painted scene, masked soft, tinted; locked regions are under drifting fog
      G.regions.forEach(function (g) {
        var b = g.blob, on = !!r.regionOpen[g.id]
        html += '<div class="atl-reg' + (on ? '' : ' fogged') + '" style="left:' + (b[0] - b[2]) + 'px;top:' + (b[1] - b[3]) + 'px;width:' + 2 * b[2] + 'px;height:' + 2 * b[3] + 'px;--tint:' + g.tint + '"></div>'
      })
      DECOR.forEach(function (d) { var u = api.lib(d[0]); if (u) html += '<img class="atl-dec" src="' + esc(u) + '" alt="" aria-hidden="true" draggable="false" style="left:' + (d[1] - d[3] / 2) + 'px;top:' + (d[2] - d[3] / 2) + 'px;width:' + d[3] + 'px">' })
      html += svg
      // islands / ports
      G.ids.forEach(function (id) {
        var n = NODES[id], w = api.world(id), open = !!r.open[id], done = !!r.done[id], st = api.stars(id), isl = api.lib(n.isle), frag = api.frag(id)
        var stars = ''; for (var q = 0; q < 3; q++) stars += api.icon('star', q < st ? '' : 'tk-ico--dim')
        var fr = id === ROOT ? '' : id === FINALE.id ? '<em class="need fk">' + Math.min(r.fragments, G.need) + '/' + G.need + '</em>' + api.icon('compass', r.fragments >= G.need ? '' : 'tk-ico--dim') : api.icon('compass', frag ? 'frag' : 'frag tk-ico--dim')
        html += '<button class="atl-node' + (open ? ' open' : ' locked') + (done ? ' done' : '') + (id === nx ? ' next' : '') + (n.finale ? ' finale' : '') + '" type="button" data-w="' + id + '"' +
          ' aria-label="' + esc(w.name + (open ? (done ? ', selesai' : '') : ' (terkunci)') + ', ' + st + ' bintang') + '" style="left:' + n.x + 'px;top:' + n.y + 'px">' +
          '<span class="land">' + (id === nx ? '<i class="ring" aria-hidden="true"></i>' : '') + (isl ? '<img class="isl" src="' + esc(isl) + '" alt="" draggable="false">' : '') +
            (w.shipSrc ? '<img class="shp" src="' + esc(w.shipSrc) + '" alt="" draggable="false">' : '') + (open ? '' : '<i class="lk">' + api.icon('lock', '', '') + '</i>') + '</span>' +
          '<span class="lab"><b class="fk">' + esc(w.name) + '</b><span class="s">' + stars + fr + '</span></span>' +
          (id === nx ? '<i class="flag fk" aria-hidden="true">Main!</i>' : '') + '</button>'
      })
      // signposts: a branch point (2–3 routes out) that is done and still has an unfinished way to go
      G.ids.forEach(function (id) {
        var n = NODES[id], outs = G.out[id]; if (outs.length < 2 || !r.done[id] || !n.sign) return
        if (!outs.some(function (b) { return !r.done[b] })) return
        var sx = n.sign[0], sy = n.sign[1]
        // each plank's arrow points the way its route leaves the branch world (up / right / down …), not just left or
        // right (playtest 2026-09-30: three right arrows for branches going up, right and down)
        html += '<div class="atl-sign" data-w="' + id + '" style="left:' + sx + 'px;top:' + sy + 'px" aria-hidden="true"><i class="post"></i>' + outs.map(function (b) {
          var ang = signAngle(id, b), dir = Math.abs(ang) <= 90 ? 'r' : 'l'
          return '<span class="pl ' + dir + (r.done[b] ? ' been' : '') + '" data-to="' + b + '" data-ang="' + Math.round(ang) + '"><b>' + esc(G.hints[id + '>' + b] || api.world(b).name) + '</b>' +
            '<i class="ar" style="transform:rotate(' + Math.round(ang) + 'deg)"></i></span>'
        }).join('') + '</div>'
      })
      // banners (painted parchment), compass rose, Timmy's boat
      G.regions.forEach(function (g) {
        var on = !!r.regionOpen[g.id]
        html += '<div class="atl-ban' + (on ? '' : ' shut') + '" data-r="' + g.id + '" style="left:' + g.ban[0] + 'px;top:' + g.ban[1] + 'px"><i class="th" style="background:' + esc(api.scene(g.scene)) + '"></i><b class="fk">' + esc(g.name) + '</b></div>'
      })
      // fog clouds over locked regions (after the nodes so they veil them)
      G.regions.forEach(function (g) {
        if (r.regionOpen[g.id]) return
        var b = g.blob
        for (var i = 0; i < 3; i++) {
          var fx = b[0] + (i - 1) * b[2] * 0.55, fy = b[1] + (i % 2 ? -1 : 1) * b[3] * 0.22
          html += '<i class="atl-fog f' + i + '" style="left:' + Math.round(fx - 170) + 'px;top:' + Math.round(fy - 90) + 'px"></i>'
        }
      })
      html += '<img class="atl-rose" src="' + esc(api.lib('tk-prop/compass-3')) + '" alt="" aria-hidden="true" draggable="false">'
      html += '<span class="atl-boat"><img class="bt" src="' + esc(api.boat) + '" alt="" draggable="false"><img class="tm" src="' + esc(api.timmy) + '" alt="" draggable="false"></span>'
      world.innerHTML = html
      // chart-unit boxes of the banners, signposts (planks + arrows) and worlds (island, label): the first view keeps
      // them clear of the chrome. Read once per build from the laid-out chart (screen box / scale).
      var wr = world.getBoundingClientRect(), ks = cam.s || 1
      var cu = function (els) {
        var u = null
        els.forEach(function (e) { if (!e) return; var q = e.getBoundingClientRect(); if (!q.width) return
          var r = { l: (q.left - wr.left) / ks, t: (q.top - wr.top) / ks, r: (q.right - wr.left) / ks, b: (q.bottom - wr.top) / ks }
          u = u ? { l: Math.min(u.l, r.l), t: Math.min(u.t, r.t), r: Math.max(u.r, r.r), b: Math.max(u.b, r.b) } : r })
        return u
      }
      C.labels = []
      Array.prototype.forEach.call(world.querySelectorAll('.atl-ban'), function (e) { var u = cu([e]); if (u) { u.reg = e.getAttribute('data-r'); C.labels.push(u) } })
      Array.prototype.forEach.call(world.querySelectorAll('.atl-sign'), function (e) { var u = cu([e].concat(Array.prototype.slice.call(e.querySelectorAll('.pl, .ar')))); if (u) { u.sign = e.getAttribute('data-w'); C.labels.push(u) } })
      Array.prototype.forEach.call(world.querySelectorAll('.atl-node'), function (e) {
        var id = e.getAttribute('data-w')
        // layout offsets, not screen boxes: the nodes are still running their entrance (scale) animation here
        ;['.land', '.lab'].forEach(function (sel) { var q = e.querySelector(sel); if (q) C.labels.push({ node: id, l: e.offsetLeft + q.offsetLeft, t: e.offsetTop + q.offsetTop, r: e.offsetLeft + q.offsetLeft + q.offsetWidth, b: e.offsetTop + q.offsetTop + q.offsetHeight }) })
      })
      ship = world.querySelector('.atl-boat')
      placeBoat(me)
      // mini-map
      var m = '', ms = mini.querySelector('svg')
      G.regions.forEach(function (g) { var b = g.blob; m += '<ellipse cx="' + b[0] + '" cy="' + b[1] + '" rx="' + b[2] + '" ry="' + b[3] + '" fill="' + g.tint + '" fill-opacity="' + (r.regionOpen[g.id] ? '.55' : '.18') + '"/>' })
      G.ids.forEach(function (a) { G.out[a].forEach(function (b) { m += '<line x1="' + NODES[a].x + '" y1="' + NODES[a].y + '" x2="' + NODES[b].x + '" y2="' + NODES[b].y + '" stroke="' + (r.open[b] ? '#fff' : 'rgba(255,255,255,.3)') + '" stroke-width="14"/>' }) })
      G.ids.forEach(function (id) { var n = NODES[id]; m += '<circle cx="' + n.x + '" cy="' + n.y + '" r="' + (id === nx ? 62 : 44) + '" fill="' + (r.done[id] ? '#2FB35A' : r.open[id] ? '#FFC53D' : '#8a8f9c') + '" stroke="#0B1A3A" stroke-width="10"/>' })
      if (NODES[me]) m += '<circle cx="' + (NODES[me].x - 70) + '" cy="' + (NODES[me].y + 40) + '" r="46" fill="#E5412D" stroke="#fff" stroke-width="12"/>'
      m += '<rect class="vr" fill="none" stroke="#FFE15A" stroke-width="22" rx="30"/>'
      ms.innerHTML = m; miniRect = ms.querySelector('.vr')
      host.querySelector('.atl-me img').src = api.timmy
      apply()
    }
    // the boat waits beside (lower left of) a world's island
    function boatAt (id) { var n = NODES[id], o = (n && n.boat) || [-118, 40]; return n ? { x: n.x + o[0], y: n.y + o[1] } : { x: 120, y: 1400 } }
    function placeBoat (id, flip) { var p = boatAt(id); moveBoat(p.x, p.y, flip) }
    function moveBoat (x, y, flip) { if (ship) ship.style.transform = 'translate3d(' + Math.round(x - 60) + 'px,' + Math.round(y - 84) + 'px,0)' + (flip ? ' scaleX(-1)' : '') }

    /* sail Timmy's boat along the open routes to the picked world, then open it */
    C.sail = function (to, done) {
      var G = api.G, r = api.status, from = api.here
      if (!NODES[to] || sailing) return
      var ids = path(G, NODES[from] && G.has[from] ? from : ROOT, to, r.open), pts = [boatAt(ids[0])]
      for (var i = 1; i < ids.length; i++) {
        var a = ids[i - 1], b = ids[i], sg = C.segs[a + '>' + b], rev = false
        if (!sg) { sg = C.segs[b + '>' + a]; rev = true }
        var end = boatAt(b)
        if (!sg) { pts.push(end); continue }
        for (var t = 1; t <= 16; t++) { var u = rev ? 1 - t / 16 : t / 16, p = qpt(sg.a, sg.c, sg.b, u); pts.push({ x: p.x - 60 * (t / 16), y: p.y + 30 * (t / 16) }) }
        pts.push(end)
      }
      var A = NODES[ids[0]] || NODES[to], B = NODES[to]
      // frame both ends, then sail (ease-out, 450–1200 ms)
      var s = cam.s, span = Math.max(Math.abs(A.x - B.x) + 320, 1), spanY = Math.max(Math.abs(A.y - B.y) + 320, 1)
      s = clamp(MIN_S, Math.min(cam.s, box.w / span, (box.h - box.top - box.bot) / spanY), MAX_S)
      sailing = true; host.classList.add('sailing')
      var fin = function () { sailing = false; host.classList.remove('sailing'); done && done() }
      centerOn((A.x + B.x) / 2, (A.y + B.y) / 2 + 30, s, 260)
      if (api.reduced() || !ship || !ship.animate) {
        var last = pts[pts.length - 1]; moveBoat(last.x, last.y)
        if (ship && ship.animate) ship.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 })
        setTimeout(fin, 260); return
      }
      var L = [0]; for (var j = 1; j < pts.length; j++) L.push(L[j - 1] + Math.hypot(pts[j].x - pts[j - 1].x, pts[j].y - pts[j - 1].y))
      var tot = L[L.length - 1] || 1, dur = clamp(450, 300 + tot * 0.9, 1200), t0 = 0, seg = 0
      ship.classList.remove('bob')
      ;(function f (now) {
        if (!ship.isConnected) { fin(); return }
        if (!t0) t0 = now + 180
        var k = clamp(0, (now - t0) / dur, 1), e = 1 - Math.pow(1 - k, 3), at = e * tot
        while (seg < L.length - 2 && L[seg + 1] < at) seg++
        var p0 = pts[seg], p1 = pts[seg + 1] || p0, u = (at - L[seg]) / ((L[seg + 1] - L[seg]) || 1)
        moveBoat(p0.x + (p1.x - p0.x) * u, p0.y + (p1.y - p0.y) * u, p1.x < p0.x - 0.5)
        if (k < 1) raf = requestAnimationFrame(f); else { raf = 0; ship.classList.add('bob'); setTimeout(fin, 120) }
      })(performance.now())
    }

    /* input: one pointer pans (momentum on release), two pinch; a short still tap picks */
    var ptr = {}, down = null, samples = [], pinch = null
    function local (e) { return { x: e.clientX - box.l, y: e.clientY - box.t } }
    function count () { return Object.keys(ptr).length }
    vp.addEventListener('pointerdown', function (e) {
      atHome = false
      if (e.button > 0 || sailing) return
      stopAnim()
      ptr[e.pointerId] = local(e)
      if (count() === 1) { down = { p: local(e), t: e.timeStamp, el: e.target.closest ? e.target.closest('.atl-node') : null, moved: 0 }; samples = [{ t: e.timeStamp, x: ptr[e.pointerId].x, y: ptr[e.pointerId].y }] }
      if (count() === 2) { var k = Object.keys(ptr), a = ptr[k[0]], b = ptr[k[1]]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, m: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }; if (down) down.moved = 99 }
      try { vp.setPointerCapture(e.pointerId) } catch (x) {}
    })
    vp.addEventListener('pointermove', function (e) {
      var prev = ptr[e.pointerId]; if (!prev) return
      var p = local(e); ptr[e.pointerId] = p
      if (count() === 1) {
        var dx = p.x - prev.x, dy = p.y - prev.y; if (down) down.moved += Math.abs(dx) + Math.abs(dy)
        if (!down || down.moved > 8) set({ s: cam.s, x: cam.x + dx, y: cam.y + dy })
        samples.push({ t: e.timeStamp, x: p.x, y: p.y }); if (samples.length > 6) samples.shift()
      } else if (count() === 2 && pinch) {
        var k = Object.keys(ptr), a = ptr[k[0]], b = ptr[k[1]], d = Math.hypot(a.x - b.x, a.y - b.y) || 1, m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        set({ s: cam.s, x: cam.x + m.x - pinch.m.x, y: cam.y + m.y - pinch.m.y }); zoomAt(m.x, m.y, d / pinch.d)
        pinch = { d: d, m: m }
      }
    })
    function up (e) {
      if (!ptr[e.pointerId]) return
      delete ptr[e.pointerId]
      if (count() === 1) { pinch = null; samples = []; return }
      if (count()) return
      pinch = null
      var dn = down; down = null
      if (dn && dn.moved <= 8 && e.type === 'pointerup') { if (dn.el) C.tap(dn.el.getAttribute('data-w'), dn.el); return }
      // momentum from the last ~120 ms of movement (none when the finger rested before lifting)
      var s1 = samples[samples.length - 1], s0 = null
      for (var i = samples.length - 2; i >= 0; i--) { if (s1.t - samples[i].t <= 120 || !s0) s0 = samples[i]; else break }
      if (!s0 || !s1 || s1.t - s0.t <= 0 || s1.t - s0.t > 160 || e.timeStamp - s1.t > 100 || api.reduced()) return
      var vx = (s1.x - s0.x) / (s1.t - s0.t), vy = (s1.y - s0.y) / (s1.t - s0.t), last = 0
      if (Math.abs(vx) + Math.abs(vy) < 0.15) return
      ;(function f (now) {
        var dt = last ? Math.min(40, now - last) : 16; last = now
        var before = cam; set({ s: cam.s, x: cam.x + vx * dt, y: cam.y + vy * dt })
        if (Math.abs(cam.x - before.x) < 0.01) vx = 0; if (Math.abs(cam.y - before.y) < 0.01) vy = 0
        var fr = Math.pow(0.94, dt / 16); vx *= fr; vy *= fr
        if (Math.abs(vx) + Math.abs(vy) > 0.02) raf = requestAnimationFrame(f); else raf = 0
      })(performance.now())
    }
    vp.addEventListener('pointerup', up); vp.addEventListener('pointercancel', up); vp.addEventListener('lostpointercapture', up)
    vp.addEventListener('wheel', function (e) { e.preventDefault(); atHome = false; stopAnim(); var p = local(e); zoomAt(p.x, p.y, Math.exp(-e.deltaY * 0.0015)) }, { passive: false })
    // keyboard: a focused node opens with Enter / Space (click with detail 0); pointer taps are handled above
    world.addEventListener('click', function (e) { var b = e.target.closest('.atl-node'); if (b && e.detail === 0) C.tap(b.getAttribute('data-w'), b) })
    C.tap = function (id, el) { if (sailing) return; api.pick(id, el) }
    host.querySelector('.atl-zi').addEventListener('click', function () { api.click(); C.zoom(1.3) })
    host.querySelector('.atl-zo').addEventListener('click', function () { api.click(); C.zoom(1 / 1.3) })
    host.querySelector('.atl-me').addEventListener('click', function () { api.click(); C.center(api.here, 300); if (ship && ship.animate && !api.reduced()) ship.animate([{ scale: '1' }, { scale: '1.25' }, { scale: '1' }], { duration: 360, easing: 'cubic-bezier(.23,1,.32,1)' }) })
    mini.addEventListener('click', function (e) {
      api.click(); var r = mini.getBoundingClientRect(), mw = r.width, mh = r.height, sc = Math.min(mw / CHART.w, mh / CHART.h)
      var ox = (mw - CHART.w * sc) / 2, oy = (mh - CHART.h * sc) / 2
      centerOn((e.clientX - r.left - ox) / sc, (e.clientY - r.top - oy) / sc, null, 260)
    })

    C.relayout = function () {
      if (!host.isConnected) return
      // still on the first view (nobody panned / zoomed yet): frame it again for the new layout
      if (atHome && !sailing) { measure(); C.home(); return }
      // keep the chart point in the middle of the free area where it was
      var midY = box.top + (box.h - box.top - box.bot) / 2, cx = box.w ? (box.w / 2 - cam.x) / cam.s : null, cy = box.w ? (midY - cam.y) / cam.s : null
      measure()
      if (cx == null) return
      var my = box.top + (box.h - box.top - box.bot) / 2
      set({ s: cam.s, x: box.w / 2 - cx * cam.s, y: my - cy * cam.s })
    }
    C.refresh = function (a2) { api = a2 || api; C.api = api; stopAnim(); sailing = false; host.classList.remove('sailing'); measure(); build(); C.home() }
    // first view (owner tablet 2026-09-30): the region of the glowing world FULLY framed (its sea, its banner, Timmy and
    // the glowing world) inside the space the chrome leaves; when the region is too big for the screen even at MIN_S,
    // Timmy + the glowing world + the banner. Then a small nudge so no banner / signpost is cut by the screen edge or
    // sits under a bar, button or the mini-map.
    function nodeBox (id) {
      var n = NODES[id], e = world.querySelector('.atl-node[data-w="' + id + '"]')
      if (!n) return null
      return e ? { l: e.offsetLeft, t: e.offsetTop - 30, r: e.offsetLeft + e.offsetWidth, b: e.offsetTop + e.offsetHeight } : { l: n.x - 118, t: n.y - 102, r: n.x + 118, b: n.y + 140 }
    }
    function uni (a, b) { return !a ? b : !b ? a : { l: Math.min(a.l, b.l), t: Math.min(a.t, b.t), r: Math.max(a.r, b.r), b: Math.max(a.b, b.b) } }
    function chromeRects () {
      var scr = host.closest('.scr') || document, out = []
      Array.prototype.forEach.call(scr.querySelectorAll('.topbar > *, .w-foot > *, .atl-ctl, .atl-mini'), function (e) {
        var r = e.getBoundingClientRect(); if (r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden') out.push({ l: r.left - box.l, t: r.top - box.t, r: r.right - box.l, b: r.bottom - box.t })
      })
      var f = document.getElementById('sndfab'); if (f) { var q = f.getBoundingClientRect(); if (q.width) out.push({ l: q.left - box.l, t: q.top - box.t, r: q.right - box.l, b: q.bottom - box.t }) }
      return out
    }
    C.home = function () {
      var here = NODES[api.here] ? api.here : ROOT, nxt = NODES[api.next] ? api.next : here, B = NODES[nxt]
      var reg = REGIONS.filter(function (g) { return g.id === B.r })[0], lb = C.labels || []
      var banner = null
      if (reg) banner = lb.filter(function (q) { return q.reg === reg.id })[0] || null
      var hn = lb.filter(function (q) { return q.node === here || q.node === nxt })
      var core = uni(uni(nodeBox(here), nodeBox(nxt)), banner)
      // a signpost of a world in the framed region is part of the frame (its planks reach out past the region's sea)
      lb.forEach(function (q) { if (q.sign && (q.sign === here || q.sign === nxt)) core = uni(core, q) })
      var full = reg ? uni(core, { l: reg.blob[0] - reg.blob[2], t: reg.blob[1] - reg.blob[3], r: reg.blob[0] + reg.blob[2], b: reg.blob[1] + reg.blob[3] }) : core
      if (reg) lb.forEach(function (q) { if (q.sign && NODES[q.sign] && NODES[q.sign].r === reg.id) full = uni(full, q) })
      // the space the chrome leaves: the mini-map / dock column on the right, the bars above and below
      var row = host.querySelector('.atl-ctl').classList.contains('atl-ctl--row')
      var aL = 12, aR = box.w - (row ? 0 : box.colW || 0) - 22, aT = box.top + 8, aB = box.h - box.bot - 8 - (row ? box.dockH + 10 : 0)
      var fitRaw = function (f) { return Math.min((aR - aL) / (f.r - f.l), (aB - aT) / (f.b - f.t)) }, fit = function (f) { return Math.min(0.8, fitRaw(f)) }
      var frame = fit(full) >= MIN_S ? full : core, s = clamp(MIN_S, fit(frame), MAX_S)
      var base = clampCam({ s: s, x: (aL + aR) / 2 - (frame.l + frame.r) / 2 * s, y: (aT + aB) / 2 - (frame.t + frame.b) / 2 * s })
      var tab = Math.min(box.w, box.h) >= 600, ch = chromeRects(), W0 = box.w, H0 = box.h, FT = box.top, FB = box.h - box.bot
      var hit = function (a, c) { return a.l < c.r - 2 && c.l < a.r - 2 && a.t < c.b - 2 && c.t < a.b - 2 }
      // the share of a world's island / label that a piece of chrome covers (a sliver at a corner still reads)
      var cover = function (a, c) { var w = Math.min(a.r, c.r) - Math.max(a.l, c.l), h = Math.min(a.b, c.b) - Math.max(a.t, c.t); return w > 0 && h > 0 ? w * h / ((a.r - a.l) * (a.b - a.t)) : 0 }
      var scr = function (c, q) { return { l: c.x + q.l * c.s, t: c.y + q.t * c.s, r: c.x + q.r * c.s, b: c.y + q.b * c.s } }
      var cost = function (c, lim) {
        if (lim == null) lim = 1e9
        var bad = 0, f = scr(c, frame)
        if (f.l < aL - 1 || f.r > aR + 1 || f.t < aT - 1 || f.b > aB + 1) bad += frame === full ? 1000 : 0
        hn.forEach(function (q) { var r = scr(c, q); if (r.l < 0 || r.r > W0 || r.t < FT || r.b > FB || ch.some(function (k) { return hit(r, k) })) bad += 100 })
        // a banner / signpost on screen is WHOLE on screen (tablets) and clear of every bar button, the title plate, the
        // star counter, the dock and the mini-map; a world whose centre lies in the free area F (between the top bar and
        // the footer) has at most a 20 % corner of its island / label under any of them (one whose centre is past a bar
        // is off the chart view, like one past the edge)
        if (bad > lim) return bad
        lb.some(function (q) {
          if (bad > lim) return true
          var r = scr(c, q)
          if (q.node) {
            var mx = (r.l + r.r) / 2, my = (r.t + r.b) / 2
            if (mx > 0 && mx < W0 && my > FT && my < FB && ch.some(function (k) { return cover(r, k) > 0.2 })) bad++
            return false
          }
          if (r.r <= 0 || r.l >= W0 || r.b <= 0 || r.t >= H0) return false
          if ((tab && (r.l < 0 || r.t < 0 || r.r > W0 || r.b > H0)) || ch.some(function (k) { return hit(r, k) })) bad++
        })
        return bad
      }
      // search: the nearest shift (and, if needed, a slightly smaller scale — about the frame's centre) that leaves
      // nothing cut or covered; ~10k candidate cameras of pure arithmetic, once per layout
      var search = function (fr) {
        frame = fr; s = clamp(MIN_S, fit(fr), MAX_S)
        var b0 = clampCam({ s: s, x: (aL + aR) / 2 - (fr.l + fr.r) / 2 * s, y: (aT + aB) / 2 - (fr.t + fr.b) / 2 * s })
        var best = b0, bc = cost(b0), bd = 0, mx = (fr.l + fr.r) / 2, my = (fr.t + fr.b) / 2
        var scales = [s], fmax = Math.min(1.1, fitRaw(fr))
        for (var f = 1.08; s * f <= fmax && scales.length < 4; f += 0.08) scales.push(s * f)
        for (var g = 0.94; s * g >= MIN_S - 1e-6 && scales.length < 10; g -= 0.06) scales.push(s * g)
        if (s > MIN_S && scales[scales.length - 1] > MIN_S) scales.push(MIN_S)
        for (var si = 0; si < scales.length && bc; si++) {
          var s2 = scales[si], cx0 = b0.x + mx * s - mx * s2, cy0 = b0.y + my * s - my * s2
          for (var dy = -320; dy <= 320; dy += 16) for (var dx = -448; dx <= 448; dx += 16) {
            var dd = dx * dx + dy * dy + si * 40000; if (dd >= bd && bc <= 0) continue
            var c = clampCam({ s: s2, x: cx0 + dx, y: cy0 + dy }), k = cost(c, bc)
            if (k < bc || (k === bc && dd < bd)) { best = c; bc = k; bd = dd }
          }
        }
        return { cam: best, cost: bc, before: cost(b0) }
      }
      // the region framed whole if that leaves every banner / signpost / world clear; else Timmy + the glowing world
      // (+ its banner and signpost) — the owner's rule "nothing under the chrome" wins over the full region
      var R1 = fit(full) >= MIN_S ? search(full) : null, R2 = (!R1 || R1.cost) ? search(core) : null
      var pick = R1 && (!R2 || R1.cost <= R2.cost) ? R1 : R2, best = pick.cam, bc = pick.cost
      frame = pick === R1 ? full : core
      C.homeInfo = { frame: frame === full ? 'region ' + (reg && reg.id) : 'core', s: +best.s.toFixed(3), left: bc, before: pick.before, region: R1 ? R1.cost : null }
      tweenTo(best, 0); atHome = true
    }
    C.destroy = function () { stopAnim(); if (RO) RO.disconnect(); host.classList.remove('atl-host'); host.innerHTML = ''; if (MOUNTED === C) MOUNTED = null }
    if (W.ResizeObserver) { RO = new ResizeObserver(function () { clearTimeout(rzT); rzT = setTimeout(C.relayout, 120) }); RO.observe(host) }
    else W.addEventListener('resize', function () { clearTimeout(rzT); rzT = setTimeout(C.relayout, 120) })
    MOUNTED = C
    C.refresh(api)
    return C
  }
  var MOUNTED = null

  W.TKAtlas = { CHART: CHART, REGIONS: REGIONS, NODES: NODES, EDGES: EDGES, FINALE: FINALE, LEGACY: LEGACY, STARTERS: STARTERS, ROOT: ROOT, MIN_S: MIN_S, MAX_S: MAX_S,
    DECOR: DECOR, signAngle: signAngle, graph: graph, compute: compute, migrate: migrate, legacyOpen: legacyOpen, next: next, hint: hint, path: path, validate: validate, regionOf: regionOf,
    worldDone: worldDoneOf, levelOpen: levelOpenOf,
    mount: mount, view: function () { return MOUNTED } }
  if (typeof module !== 'undefined' && module.exports) module.exports = W.TKAtlas
})()
