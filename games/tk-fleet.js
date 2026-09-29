/* ============================================================================
 * tk-fleet.js — window.TKFleet. Timmy & Kapal Legendaris: the ship catalogue + the
 * "Pilih Kapalmu" Character Selection screen (owner 2026-09-28).
 *
 *   TKFleet.ships                        50 ships: { id, name, fact, side, top, stats:{cepat,lincah,kuat}, size, aspect, rec, flag?,
 *                                        group:'modern'|'legend', real? (the ship's real name), alt? [other side-view DB keys] }
 *   TKFleet.groups                       [{ id:'modern', label:'Kapal Modern', ids }, { id:'legend', label:'Kapal Legenda', ids }]
 *   TKFleet.get(id)                      one ship (null if unknown)
 *   TKFleet.sideSrc(id) / topSrc(id)     URLs (side view = picker card, top view = gameplay, bow UP)
 *   TKFleet.handling(id)                 { len, beam, turnK, speedK } — gentle: every ship stays easy
 *   TKFleet.saved(avatar) / save(avatar, id)   per-avatar pick (localStorage 'tk-fleet-<avatar>')
 *   TKFleet.avatar(opts)                 opts.avatar || the active Dunia avatar || 'anon'
 *   TKFleet.open(host, opts) -> { destroy, pick(id), current() }
 *        opts { current, group, onPick(id), onClose (shows a "Kembali" button), lib(key), reducedMotion, sfx:{muted}, title }
 *        Two tabs (Kapal Modern / Kapal Legenda); only the open tab's 25 cards are in the DOM and their
 *        thumbnails load lazily as they scroll into the strip (IntersectionObserver on the strip).
 *   TKFleet.resolve(host, opts, start)   the modules' entry: opts.ship given -> start(id) now; a saved pick ->
 *                                        start(saved); otherwise the picker opens, saves the pick, then start(id).
 *                                        opts.ship === false = no fleet (drawn hull). Returns the picker or null.
 *
 * Modern: side views are sprites already in the shared DB (tk-ship*); top views are tk-top/* (tools/ingest-tk-top.py).
 * Legend (owner sheets 2026-09-29): side tk-legend-side/<id>, top tk-legend-top/<id> (tools/ingest-tk-legend.py).
 * Sprites only, no emoji; warships are "kapal penjaga laut", no weapons talk. CHILD SAFETY: many legend ships are
 * known for disasters or wars; facts NEVER mention sinking, deaths, wars, battles, weapons or disasters (gated by
 * tools/qa-tk-steer.mjs, ban list there).
 * Motion (Emil Kowalski): transform/opacity only, 150–250 ms ease-out; reduced motion = fades only.
 * Vanilla ES5, window global, no build.
 * ==========================================================================*/
(function (W) {
  'use strict'
  var D = W.document
  var BASE = (function () { try { return location.pathname.indexOf('/Dunia-Emosi/') === 0 ? '/Dunia-Emosi/' : '/' } catch (e) { return '/' } })()
  var EASE = 'cubic-bezier(.23,1,.32,1)'

  // [id, name, fact, side-view DB key, cepat, lincah, kuat, size s|m|l, top aspect (w/h), flag]
  // flag = the side view is the CLOSEST DB ship, not the same ship (no invented art)
  var ROWS = [
    ['titanic', 'Kapal Titanic', 'Kapal besar dengan empat cerobong asap!', 'tk-ship2/rms-titanic-clean', 2, 1, 3, 'l', 0.408],
    ['battleship', 'Kapal Penjaga Raksasa', 'Kapal penjaga laut yang besar dan kokoh.', 'tk-ship2/uss-arizona-clean', 2, 1, 3, 'l', 0.565],
    ['carrier', 'Kapal Induk', 'Pesawat bisa mendarat di atasnya!', 'tk-ship3/uss-nimitz-clean', 2, 1, 3, 'l', 0.429],
    ['container', 'Kapal Peti Kemas', 'Membawa ribuan kotak warna-warni.', 'tk-ship2/container-ship-clean', 2, 1, 3, 'l', 0.362, 'lambung samping biru, atas merah'],
    ['lng', 'Kapal Pembawa Gas', 'Tangki bulatnya menyimpan gas yang sangat dingin.', 'tk-ship3/lng-voyager-clean', 1, 1, 3, 'l', 0.37, 'lambung samping biru, geladak atas hijau'],
    ['offshore', 'Kapal Pemasok', 'Ada tempat helikopter mendarat di depannya!', 'tk-ship3/hos-achiever-clean', 2, 2, 2, 'm', 0.361, 'kapal pemasok oranye, atas hijau'],
    ['cruise', 'Kapal Pesiar', 'Ada kolam renangnya!', 'tk-ship3/cruise-ship-symphony-clean', 2, 1, 2, 'l', 0.4],
    ['bulk', 'Kapal Kargo Merah', 'Membawa muatan seperti beras dan jagung.', 'tk-ship3/polar-supply-clean', 1, 1, 3, 'l', 0.349, 'tak ada kapal curah; kapal kargo merah terdekat'],
    ['roro', 'Kapal Pengangkut Mobil', 'Mobil-mobil naik ke dalamnya sendiri!', 'tk-ship3/ocean-carrier-clean', 2, 1, 2, 'l', 0.377],
    ['research', 'Kapal Peneliti', 'Membantu ilmuwan mempelajari laut.', 'tk-ship3/rv-discovery-clean', 2, 2, 2, 'm', 0.399, 'kapal riset biru, atas hijau'],
    ['tug', 'Kapal Tunda', 'Kecil tapi kuat, bisa menarik kapal besar!', 'tk-ship3/harbor-tug-clean', 1, 3, 3, 's', 0.55],
    ['tallship', 'Kapal Layar Tinggi', 'Berlayar dengan tenaga angin.', 'tk-ship2/cutty-sark-clean', 2, 2, 1, 'm', 0.747],
    ['coastguard', 'Kapal Penjaga Pantai', 'Siap menolong orang di laut.', 'tk-ship3/national-guard-cutter-clean', 3, 2, 2, 'm', 0.439],
    ['icebreaker', 'Kapal Pemecah Es', 'Hidungnya kuat untuk membelah es.', 'tk-ship3/icebreaker-50-let-pobedy-clean', 1, 2, 3, 'm', 0.584, 'pemecah es merah-hitam, atas merah-hijau bulat'],
    ['submarine', 'Kapal Selam', 'Bisa menyelam ke bawah laut!', 'tk-ship/submarine-black', 2, 2, 2, 'm', 0.627],
    ['frigate', 'Kapal Penjaga Cepat', 'Ada tempat helikopter di belakangnya.', 'tk-ship3/hms-dreadnought-f111-clean', 3, 2, 2, 'm', 0.418],
    ['patrol', 'Kapal Patroli', 'Berkeliling menjaga laut tetap aman.', 'tk-ship3/corvette-clean', 3, 3, 1, 'm', 0.381],
    ['destroyer', 'Kapal Penjaga Panjang', 'Panjang dan cepat menjaga laut.', 'tk-ship3/uss-arleigh-burke-clean', 3, 2, 2, 'm', 0.414],
    ['fastferry', 'Kapal Cepat', 'Melaju cepat membawa penumpang.', 'tk-ship3/eclipse-yacht-clean', 3, 2, 1, 'm', 0.351, 'kapal pesiar pribadi, bukan feri'],
    ['amphibious', 'Kapal Induk Helikopter', 'Helikopter parkir di atas geladaknya.', 'tk-ship2/uss-enterprise-clean', 1, 1, 3, 'l', 0.516, 'kapal induk biasa'],
    ['landing', 'Kapal Pendarat', 'Pintu depannya bisa terbuka di pantai!', 'tk-ship3/borealis-heavy-lift-clean', 1, 2, 3, 's', 0.548, 'tak ada kapal pendarat; kapal angkut berat'],
    ['sailyacht', 'Perahu Layar', 'Layarnya menangkap angin.', 'tk-ship/sailboat', 2, 3, 1, 's', 0.963],
    ['motoryacht', 'Kapal Pesiar Mini', 'Kapal kecil mewah dengan kolam.', 'tk-ship2/ocean-dream-yacht-clean', 3, 3, 1, 's', 0.348],
    ['lifeboat', 'Kapal Penyelamat', 'Selalu siap menolong!', 'tk-ship3/sea-guardian-clean', 2, 3, 2, 's', 0.468, 'kapal penyelamat merah yang lebih besar'],
    ['hovercraft', 'Hoverkraf', 'Bisa melayang di atas air dan pasir!', 'tk-ship3/hovercraft-clean', 3, 3, 1, 's', 0.707]
  ]
  // LEGEND (owner sheets 2026-09-29): [id, kid name, real name, fact, cepat, lincah, kuat, size, top aspect, alt side art]
  // alt = the SAME ship already drawn elsewhere in the DB (different style): the story-level agent picks one.
  // Note: the modern 'battleship' borrows tk-ship2/uss-arizona-clean as its side view; legend 'uss-arizona' is the real one.
  var LEGEND = [
    ['mary-rose', 'Kapal Kayu Sang Raja', 'Mary Rose', 'Kapal kayu kesayangan seorang raja dari Inggris.', 1, 2, 2, 'l', 0.447],
    ['queen-annes-revenge', 'Kapal Bajak Laut', "Queen Anne's Revenge", 'Kapal bajak laut terkenal milik si Janggut Hitam!', 2, 3, 1, 'm', 0.492, ['tk-ship2/blackbeard-clean']],
    ['hms-victory', 'Kapal Layar Agung', 'HMS Victory', 'Kapal kayu tua yang masih bisa kamu kunjungi di Inggris!', 1, 2, 3, 'l', 0.44, ['tk-ship2/hms-victory-clean', 'tk-legend/ship-victory-clean']],
    ['hms-erebus', 'Kapal Penjelajah Es', 'HMS Erebus', 'Kapal penjelajah es yang berlayar jauh ke laut beku.', 1, 2, 3, 'm', 0.465],
    ['hms-terror', 'Kapal Kembar Penjelajah', 'HMS Terror', 'Kembaran Erebus, lambungnya dibuat kuat untuk melewati es.', 1, 2, 3, 'm', 0.455],
    ['mary-celeste', 'Kapal Layar Dua Tiang', 'Mary Celeste', 'Kapal layar dari kayu yang membawa barang menyeberangi samudra.', 2, 3, 1, 's', 0.484],
    ['ss-republic', 'Kapal Uap Pembawa Koin', 'SS Republic', 'Kapal uap ini pernah membawa banyak koin emas!', 2, 2, 2, 'm', 0.369],
    ['ss-sultana', 'Kapal Roda Kayuh', 'SS Sultana', 'Kapal sungai dengan roda kayuh besar di sampingnya.', 1, 2, 2, 'm', 0.421],
    ['empress-of-ireland', 'Kapal Permaisuri', 'RMS Empress of Ireland', 'Kapal penumpang dengan dua cerobong merah, berlayar ke Kanada.', 2, 1, 3, 'l', 0.351],
    ['lusitania', 'Kapal Kilat Samudra', 'RMS Lusitania', 'Dulu ia kapal penumpang tercepat menyeberangi samudra!', 3, 1, 3, 'l', 0.33],
    ['ss-waratah', 'Kapal Bunga Waratah', 'SS Waratah', 'Namanya diambil dari bunga merah di Australia.', 2, 1, 3, 'l', 0.353],
    ['hms-hood', 'Kapal Penjaga Anggun', 'HMS Hood', 'Kapal penjaga laut yang panjang dan anggun dari Inggris.', 3, 1, 2, 'l', 0.371],
    ['bismarck', 'Kapal Penjaga Abu-abu', 'Bismarck', 'Kapal penjaga laut besar berwarna abu-abu dari Jerman.', 2, 1, 3, 'l', 0.415],
    ['uss-arizona', 'Kapal Penjaga Arizona', 'USS Arizona', 'Namanya sama dengan nama sebuah daerah di Amerika.', 2, 1, 3, 'l', 0.483, ['tk-ship2/uss-arizona-clean', 'tk-legend/ship-arizona-clean']],
    ['yamato', 'Kapal Penjaga Raksasa Jepang', 'Yamato', 'Salah satu kapal penjaga laut terbesar yang pernah dibuat!', 1, 1, 3, 'l', 0.471],
    ['wilhelm-gustloff', 'Kapal Liburan Putih', 'Wilhelm Gustloff', 'Kapal putih yang dibuat untuk membawa orang berlibur.', 2, 1, 2, 'l', 0.374],
    ['andrea-doria', 'Kapal Galeri Italia', 'Andrea Doria', 'Kapal penumpang dari Italia yang dihiasi banyak lukisan indah.', 2, 2, 2, 'l', 0.358],
    ['edmund-fitzgerald', 'Kapal Kargo Danau', 'SS Edmund Fitzgerald', 'Kapal kargo panjang yang berlayar di danau besar di Amerika.', 2, 1, 3, 'l', 0.311],
    ['dona-paz', 'Kapal Feri Pulau', 'MV Doña Paz', 'Kapal feri yang membawa orang dari pulau ke pulau di Filipina.', 2, 2, 2, 'm', 0.376],
    ['ms-estonia', 'Kapal Feri Biru Putih', 'MS Estonia', 'Kapal feri besar yang membawa mobil dan penumpang.', 2, 1, 3, 'l', 0.365],
    ['kursk', 'Kapal Selam Raksasa', 'Kursk (K-141)', 'Kapal selam yang sangat besar dan bisa menyelam dalam sekali.', 2, 1, 3, 'l', 0.325],
    ['endurance', 'Kapal Penjelajah Kutub', 'Endurance', 'Kapal kayu yang kuat untuk menjelajah laut es di Kutub Selatan.', 2, 3, 2, 'm', 0.502, ['tk-ship2/endurance-clean', 'tk-legend/ship-endurance-clean']],
    ['carpathia', 'Kapal Penolong Berani', 'RMS Carpathia', 'Kapal penolong yang berani, melaju cepat untuk menolong orang di laut.', 3, 2, 2, 'm', 0.343],
    ['andrea-gail', 'Kapal Nelayan Tangguh', 'Andrea Gail', 'Kapal nelayan yang mencari ikan todak di laut lepas.', 2, 3, 2, 's', 0.476],
    ['costa-concordia', 'Kapal Pesiar Raksasa', 'Costa Concordia', 'Kapal pesiar raksasa dengan banyak kolam renang, seperti hotel terapung!', 2, 1, 3, 'l', 0.416]
  ]
  var REC = 'lifeboat'
  var SHIPS = ROWS.map(function (r) {
    return { id: r[0], name: r[1], fact: r[2], side: r[3], top: 'tk-top/' + r[0], stats: { cepat: r[4], lincah: r[5], kuat: r[6] },
      size: r[7], aspect: r[8], flag: r[9] || null, rec: r[0] === REC, group: 'modern', real: null, alt: null }
  }).concat(LEGEND.map(function (r) {
    return { id: r[0], name: r[1], real: r[2], fact: r[3], side: 'tk-legend-side/' + r[0], top: 'tk-legend-top/' + r[0],
      stats: { cepat: r[4], lincah: r[5], kuat: r[6] }, size: r[7], aspect: r[8], flag: null, rec: false, group: 'legend', alt: r[9] || null }
  }))
  var GROUPS = [{ id: 'modern', label: 'Kapal Modern', ids: [] }, { id: 'legend', label: 'Kapal Legenda', ids: [] }]
  var GBY = { modern: GROUPS[0], legend: GROUPS[1] }
  SHIPS.forEach(function (s) { GBY[s.group].ids.push(s.id) })
  var BY = {}
  SHIPS.forEach(function (s) { BY[s.id] = s })
  var LEN = { s: 84, m: 104, l: 124 }
  // a world / story level whose OWN ship is in the catalogue (tk-worlds ids, 'ship/<world>' keys, or any catalogue
  // id such as the legend ships). Only the SAME ship: Nautilus, Missouri, Britannic ... have none and get null.
  var WORLD_SHIP = { titanic: 'titanic', cuttysark: 'tallship', 'cutty-sark': 'tallship', victory: 'hms-victory',
    endurance: 'endurance', arizona: 'uss-arizona' }
  function storyShip (x) {
    if (!x) return null
    x = String(x).replace(/^ship\//, '')
    if (WORLD_SHIP[x]) return WORLD_SHIP[x]
    return BY[x] ? x : null
  }

  function lib (k, opts) {
    try { if (opts && typeof opts.lib === 'function') { var u = opts.lib(k); if (u) return u } } catch (e) {}
    return (W.AssetIndex && W.AssetIndex.path(k)) || (BASE + 'assets/db/lib/' + k + '.webp')
  }
  function get (id) { return BY[id] || null }
  function seenWorlds (av) { try { var v = JSON.parse(W.localStorage.getItem('tk-fleet-world-' + av) || '[]'); return v && v.push ? v : [] } catch (e) { return [] } }
  function markWorld (av, w) { var v = seenWorlds(av); if (v.indexOf(w) < 0) v.push(w); try { W.localStorage.setItem('tk-fleet-world-' + av, JSON.stringify(v)) } catch (e) {} }
  function sideSrc (id, opts) { var s = get(id); return s ? lib(s.side, opts) : null }
  function topSrc (id, opts) { var s = get(id); return s ? lib(s.top, opts) : null }
  // gentle handling: at most ±10% turn and ±6% speed between the slowest and the nimblest ship
  function handling (id) {
    var s = get(id)
    if (!s) return null
    var len = LEN[s.size] || 96
    return { len: len, beam: Math.max(16, Math.min(48, len * Math.min(s.aspect, 0.62))), turnK: 0.9 + 0.1 * (s.stats.lincah - 1),
      speedK: 0.94 + 0.06 * (s.stats.cepat - 1) }
  }
  function avatar (opts) {
    if (opts && opts.avatar) return String(opts.avatar)
    try { var a = W._activeAvatarSlug && W._activeAvatarSlug(); if (a) return String(a) } catch (e) {}
    return 'anon'
  }
  function saved (av) { try { var v = W.localStorage.getItem('tk-fleet-' + av); return BY[v] ? v : null } catch (e) { return null } }
  function save (av, id) { if (!BY[id]) return false; try { W.localStorage.setItem('tk-fleet-' + av, id); return true } catch (e) { return false } }

  /* ── CSS (injected once, scoped to .tkf-root) ─────────────────────────── */
  var CSS = [
    '.tkf-root{position:absolute;inset:0;z-index:60;overflow:hidden;display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(0,1fr) auto;color:#fff;font-family:var(--font,"Nunito",system-ui,sans-serif);background:radial-gradient(120% 80% at 50% 0%,#2f8fd0 0%,#135f8c 48%,#0b3a5c 100%);user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;opacity:0;transition:opacity .2s ease-out}',
    '.tkf-root.is-in{opacity:1}',
    '.tkf-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 12px;padding:calc(12px + env(safe-area-inset-top,0px)) 16px 4px}',
    '.tkf-tabs{display:flex;gap:4px;padding:4px;border-radius:18px;background:rgba(6,26,46,.55);box-shadow:inset 0 0 0 1.5px rgba(150,215,255,.3)}',
    '.tkf-tab{min-height:48px;min-width:48px;padding:0 16px;border:0;border-radius:14px;background:transparent;color:#d6efff;font:900 16px/1 var(--font,"Nunito",system-ui,sans-serif);cursor:pointer;transition:background-color .18s ease-out,color .18s ease-out,transform .16s ' + EASE + '}',
    '.tkf-tab[aria-selected="true"]{background:#ffc83d;color:#3b2800;box-shadow:0 3px 0 #c98f00}',
    '.tkf-tab:active{transform:scale(.97)}',
    '.tkf-tab:focus-visible{outline:3px solid #fff3c4;outline-offset:2px}',
    '.tkf-port .tkf-tabs{order:3;flex:1 1 100%;justify-content:stretch}.tkf-port .tkf-tab{flex:1}',
    '.tkf-head h2{margin:0;font-family:var(--font-display,"Fredoka One","Nunito",sans-serif);font-weight:400;font-size:clamp(24px,3.6vmin,34px);letter-spacing:.5px;text-shadow:0 2px 0 rgba(0,0,0,.25)}',
    '.tkf-back{min-width:48px;min-height:48px;padding:0 18px;border:0;border-radius:16px;background:rgba(6,26,46,.6);color:#fff;font:900 16px/1 var(--font,"Nunito",system-ui,sans-serif);cursor:pointer;box-shadow:inset 0 0 0 1.5px rgba(150,215,255,.4)}',
    '.tkf-main{min-height:0;overflow:hidden;display:grid;grid-template-rows:minmax(0,1fr);grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);align-items:center;gap:12px 24px;padding:4px 24px}',
    '.tkf-stage{position:relative;align-self:stretch;width:100%;height:100%;min-height:0}',
    '.tkf-sea{position:absolute;left:4%;right:4%;bottom:10%;height:22%;border-radius:50%;background:radial-gradient(closest-side,rgba(160,230,255,.55),rgba(160,230,255,0) 70%);overflow:hidden}',
    '.tkf-sea:after{content:"";position:absolute;inset:0 -50%;background:radial-gradient(ellipse 18% 34% at 30% 45%,rgba(255,255,255,.5),rgba(255,255,255,0)),radial-gradient(ellipse 14% 28% at 62% 60%,rgba(255,255,255,.4),rgba(255,255,255,0)),radial-gradient(ellipse 12% 26% at 85% 40%,rgba(255,255,255,.35),rgba(255,255,255,0));animation:tkf-shim 3.6s ease-in-out infinite alternate}',
    '@keyframes tkf-shim{from{transform:translateX(-12%)}to{transform:translateX(12%)}}',
    '.tkf-hero{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 10px 14px rgba(0,0,0,.35));animation:tkf-bob 2.6s ease-in-out infinite}',
    '.tkf-heroBox{position:absolute;inset:4% 2% 6%;transition:transform .22s ' + EASE + ',opacity .18s ease-out}',
    '.tkf-heroBox.is-swap{transform:translateX(var(--tkf-dx,14px));opacity:0;transition:none}',
    '@keyframes tkf-bob{0%,100%{transform:translateY(0) rotate(-.6deg)}50%{transform:translateY(-6px) rotate(.6deg)}}',
    '.tkf-info{display:flex;flex-direction:column;gap:12px;align-items:flex-start;min-width:0}',
    '.tkf-rec{display:inline-flex;align-items:center;padding:5px 12px;border-radius:999px;background:#ffc83d;color:#3b2800;font-weight:900;font-size:14px}',
    '.tkf-rec[hidden]{display:none}',
    '.tkf-real{display:inline-block;padding:3px 10px;border-radius:10px;background:rgba(6,26,46,.55);color:#bfe6ff;font-weight:900;font-size:15px;letter-spacing:.3px}',
    '.tkf-real[hidden]{display:none}',
    '.tkf-name{margin:0;font-family:var(--font-display,"Fredoka One","Nunito",sans-serif);font-weight:400;font-size:clamp(26px,4.4vmin,44px);line-height:1.05;text-shadow:0 2px 0 rgba(0,0,0,.25)}',
    '.tkf-fact{margin:0;font-weight:800;font-size:clamp(16px,2.4vmin,21px);line-height:1.35;color:#e8f6ff;max-width:34ch}',
    '.tkf-stats{display:flex;flex-wrap:wrap;gap:8px}',
    '.tkf-stat{display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:14px;background:rgba(6,26,46,.55);font-weight:900;font-size:15px}',
    '.tkf-pips{display:flex;gap:4px}.tkf-pips i{width:12px;height:12px;border-radius:50%;background:rgba(255,255,255,.22)}.tkf-pips i.on{background:#ffd166;box-shadow:0 0 0 1.5px #fff3c4 inset}',
    '.tkf-cta{min-height:60px;min-width:220px;padding:0 28px;border:0;border-radius:20px;background:#ffc83d;color:#3b2800;font:900 21px/1 var(--font,"Nunito",system-ui,sans-serif);cursor:pointer;box-shadow:0 6px 0 #c98f00,0 10px 18px rgba(0,0,0,.28);transition:transform .16s ' + EASE + ',box-shadow .16s ' + EASE + '}',
    '.tkf-cta:active{transform:translateY(4px) scale(.98);box-shadow:0 2px 0 #c98f00}',
    '.tkf-cta:focus-visible,.tkf-card:focus-visible,.tkf-nav:focus-visible,.tkf-back:focus-visible{outline:3px solid #fff3c4;outline-offset:3px}',
    '.tkf-foot{display:flex;align-items:center;gap:8px;padding:6px 12px calc(12px + env(safe-area-inset-bottom,0px))}',
    '.tkf-nav{flex:none;width:52px;height:52px;border:0;border-radius:50%;background:rgba(6,26,46,.6);cursor:pointer;display:grid;place-items:center;box-shadow:inset 0 0 0 1.5px rgba(150,215,255,.4)}',
    '.tkf-nav i{display:block;width:16px;height:16px;border-left:5px solid #fff;border-bottom:5px solid #fff;transform:translateX(3px) rotate(45deg)}.tkf-nav.is-next i{transform:translateX(-3px) rotate(-135deg)}',
    '.tkf-strip{flex:1;min-width:0;display:flex;gap:10px;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scroll-padding:0 8px;padding:8px 4px;-webkit-overflow-scrolling:touch;scrollbar-width:none;overscroll-behavior-x:contain;touch-action:pan-x}',
    '.tkf-strip::-webkit-scrollbar{display:none}',
    '.tkf-card{position:relative;flex:none;scroll-snap-align:center;width:var(--tkf-card,132px);height:calc(var(--tkf-card,132px) * .78);padding:6px;border:0;border-radius:16px;background:rgba(255,255,255,.14);box-shadow:inset 0 0 0 2px rgba(255,255,255,.18);cursor:pointer;display:grid;place-items:center;transition:transform .2s ' + EASE + ',background-color .2s ease-out,box-shadow .2s ease-out}',
    '.tkf-card img{position:absolute;inset:6px;width:calc(100% - 12px);height:calc(100% - 12px);object-fit:contain;pointer-events:none;opacity:0;transition:opacity .2s ease-out}',
    '.tkf-card img.is-ok{opacity:1}',
    '.tkf-card.is-on{background:rgba(255,209,102,.3);box-shadow:inset 0 0 0 3px #ffd166,0 6px 14px rgba(0,0,0,.25);transform:translateY(-3px)}',
    '.tkf-card .tkf-dot{position:absolute;top:6px;right:6px;width:14px;height:14px;border-radius:50%;background:#ffc83d;box-shadow:0 0 0 2px #fff}',
    '.tkf-port .tkf-main{grid-template-columns:1fr;grid-template-rows:minmax(0,1fr) auto;align-items:stretch;justify-items:center;padding:4px 16px}',
    '.tkf-port .tkf-info{align-items:center;text-align:center}.tkf-port .tkf-fact{max-width:40ch}.tkf-port .tkf-stats{justify-content:center}',
    '.tkf-short .tkf-tab{min-height:44px;padding:0 12px}',
    '.tkf-short .tkf-head{padding-top:calc(6px + env(safe-area-inset-top,0px))}.tkf-short .tkf-main{gap:8px 16px}.tkf-short .tkf-info{gap:7px}.tkf-short .tkf-foot{padding-top:2px;padding-bottom:calc(6px + env(safe-area-inset-bottom,0px))}',
    '.tkf-short .tkf-cta{min-height:56px}.tkf-short .tkf-stat{padding:4px 10px;font-size:14px}',
    '.tkf-short .tkf-real{font-size:14px;padding:2px 8px}.tkf-short .tkf-name{font-size:clamp(22px,4vmin,30px)}.tkf-short .tkf-fact{font-size:15px;line-height:1.25}',
    '.tkf-short .tkf-stats{flex-wrap:nowrap;gap:6px}.tkf-short .tkf-stat{gap:5px;padding:4px 8px}.tkf-short .tkf-pips i{width:10px;height:10px}',
    '.tkf-rm .tkf-card img{transition:none}',
    '.tkf-rm .tkf-hero,.tkf-rm .tkf-sea:after{animation:none}.tkf-rm .tkf-heroBox,.tkf-rm .tkf-heroBox.is-swap{transform:none}.tkf-rm .tkf-card,.tkf-rm .tkf-card.is-on{transform:none}',
    '@media (hover:hover){.tkf-card:hover{background:rgba(255,255,255,.22)}.tkf-cta:hover{background:#ffd35c}}'
  ].join('\n')
  function injectCss () {
    if (D.getElementById('tkf-style')) return
    var s = D.createElement('style'); s.id = 'tkf-style'; s.textContent = CSS; D.head.appendChild(s)
  }
  function el (tag, cls, html) { var e = D.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e }
  var STAT_LABEL = { cepat: 'Cepat', lincah: 'Lincah', kuat: 'Kuat' }

  function open (host, opts) {
    opts = opts || {}
    injectCss()
    var reduced = !!opts.reducedMotion
    if (opts.reducedMotion == null) { try { reduced = !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches) } catch (e) {} }
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative'
    var story = storyShip(opts.worldShip || opts.world)
    var recId = story || REC
    var cur = BY[opts.current] ? opts.current : recId
    var grp = GBY[opts.group] ? opts.group : BY[cur].group
    if (BY[cur].group !== grp) cur = GBY[grp].ids[0]
    var lastIn = {}; lastIn[grp] = cur
    var root = el('div', 'tkf-root' + (reduced ? ' tkf-rm' : ''))
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Pilih kapalmu')
    // the host's own chip row (level chip, sound button) stays visible above the picker
    if (opts.topInset > 0) root.style.top = Math.round(opts.topInset) + 'px'
    var head = el('div', 'tkf-head', '<h2></h2>')
    head.querySelector('h2').textContent = opts.title || 'Pilih Kapalmu'
    // segmented control: Kapal Modern | Kapal Legenda
    var tabs = el('div', 'tkf-tabs')
    tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Jenis kapal')
    var tabBtns = GROUPS.map(function (g) {
      var t = el('button', 'tkf-tab'); t.type = 'button'; t.textContent = g.label
      t.setAttribute('role', 'tab'); t.setAttribute('data-group', g.id)
      t.addEventListener('click', function () { setGroup(g.id, true) })
      tabs.appendChild(t)
      return t
    })
    head.appendChild(tabs)
    if (typeof opts.onClose === 'function') {
      var back = el('button', 'tkf-back', 'Kembali'); back.type = 'button'
      back.addEventListener('click', function () { close(); try { opts.onClose() } catch (e) {} })
      head.appendChild(back)
    }
    var main = el('div', 'tkf-main')
    var stage = el('div', 'tkf-stage', '<div class="tkf-sea"></div><div class="tkf-heroBox"><img class="tkf-hero" alt="" draggable="false" decoding="async"></div>')
    var heroBox = stage.querySelector('.tkf-heroBox'), hero = stage.querySelector('.tkf-hero')
    var info = el('div', 'tkf-info', '<span class="tkf-rec">Rekomendasi</span><span class="tkf-real" hidden></span><h3 class="tkf-name" aria-live="polite"></h3><p class="tkf-fact"></p><div class="tkf-stats"></div>')
    var cta = el('button', 'tkf-cta', 'Pilih Kapal Ini'); cta.type = 'button'
    info.appendChild(cta)
    main.appendChild(stage); main.appendChild(info)
    var foot = el('div', 'tkf-foot')
    var prev = el('button', 'tkf-nav', '<i></i>'), next = el('button', 'tkf-nav is-next', '<i></i>')
    prev.type = next.type = 'button'; prev.setAttribute('aria-label', 'Kapal sebelumnya'); next.setAttribute('aria-label', 'Kapal berikutnya')
    var strip = el('div', 'tkf-strip')
    strip.setAttribute('role', 'radiogroup'); strip.setAttribute('aria-label', 'Daftar kapal')
    foot.appendChild(prev); foot.appendChild(strip); foot.appendChild(next)
    root.appendChild(head); root.appendChild(main); root.appendChild(foot)
    host.appendChild(root)
    var dead = false, cards = [], list = []

    // lazy thumbnails: a card's image is requested when it comes within ~2 cards of the strip's view
    var io = null
    try { if (W.IntersectionObserver) io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) loadThumb(e.target) }) }, { root: strip, rootMargin: '0px 320px' }) } catch (e) { io = null }
    function loadThumb (c) {
      if (io) io.unobserve(c)
      var img = c.querySelector('img')
      if (!img || img.getAttribute('src')) return
      img.onload = function () { img.classList.add('is-ok') }
      img.onerror = function () { img.classList.add('is-ok') }
      img.src = lib(BY[c.getAttribute('data-id')].side, opts)
    }
    function buildCards () {
      if (io) io.disconnect()
      strip.innerHTML = ''
      list = GBY[grp].ids
      cards = list.map(function (id) {
        var s = BY[id]
        var c = el('button', 'tkf-card', '<img alt="" draggable="false" decoding="async">' + (id === recId ? '<span class="tkf-dot"></span>' : ''))
        c.type = 'button'; c.setAttribute('role', 'radio'); c.setAttribute('aria-label', s.real ? s.name + ', ' + s.real : s.name); c.setAttribute('data-id', id)
        c.addEventListener('click', function () { select(id, true) })
        strip.appendChild(c)
        if (io) io.observe(c); else loadThumb(c)
        return c
      })
      strip.scrollLeft = 0
    }
    function setGroup (g, user) {
      if (dead || !GBY[g]) return
      tabBtns.forEach(function (t) { var on = t.getAttribute('data-group') === g; t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1 })
      if (g === grp && cards.length) return
      if (cur) lastIn[grp] = cur
      grp = g
      buildCards()
      var id = lastIn[g] || (g === BY[recId].group ? recId : GBY[g].ids[0])
      cur = null
      select(id, false)
      reveal(idx(id), false)
      if (user) sfx()
    }
    tabs.addEventListener('keydown', function (e) {
      var k = e.key, i = GROUPS.indexOf(GBY[grp])
      if (k !== 'ArrowRight' && k !== 'ArrowLeft') return
      e.preventDefault()
      var n = GROUPS[(i + (k === 'ArrowRight' ? 1 : -1) + GROUPS.length) % GROUPS.length].id
      setGroup(n, true)
      tabBtns[GROUPS.indexOf(GBY[n])].focus()
    })

    function sfx () {
      try { if (opts.sfx && opts.sfx.muted) return; var E = W.SFXEngine; if (E && E.getMute && E.getMute()) return; if (E && typeof E.click === 'function') E.click() } catch (e) {}
    }
    function idx (id) { var i = list.indexOf(id); return i < 0 ? 0 : i }
    function render (id, dir) {
      var s = BY[id]
      if (!reduced && dir) { heroBox.style.setProperty('--tkf-dx', (dir > 0 ? 14 : -14) + 'px') }
      heroBox.classList.add('is-swap')
      hero.src = lib(s.side, opts)
      hero.alt = s.real ? s.name + ', ' + s.real : s.name
      void heroBox.offsetWidth
      heroBox.classList.remove('is-swap')
      var rec = info.querySelector('.tkf-rec')
      rec.hidden = id !== recId
      rec.textContent = story ? 'Kapal di cerita ini!' : 'Rekomendasi'
      var real = info.querySelector('.tkf-real'); real.hidden = !s.real; real.textContent = s.real || ''
      info.querySelector('.tkf-name').textContent = s.name
      info.querySelector('.tkf-fact').textContent = s.fact
      var st = info.querySelector('.tkf-stats'); st.innerHTML = ''
      ;['cepat', 'lincah', 'kuat'].forEach(function (k) {
        var n = s.stats[k], b = el('span', 'tkf-stat', '<span></span><span class="tkf-pips"><i></i><i></i><i></i></span>')
        b.firstChild.textContent = STAT_LABEL[k]
        b.setAttribute('aria-label', STAT_LABEL[k] + ' ' + n + ' dari 3')
        var pips = b.querySelectorAll('i'); for (var i = 0; i < n; i++) pips[i].className = 'on'
        st.appendChild(b)
      })
      cards.forEach(function (c) {
        var on = c.getAttribute('data-id') === id
        c.classList.toggle('is-on', on); c.setAttribute('aria-checked', on ? 'true' : 'false'); c.tabIndex = on ? 0 : -1
      })
    }
    function reveal (i, smooth) {
      var c = cards[i]
      if (!c) return
      var sl = strip.scrollLeft, sw = strip.clientWidth
      var target = c.offsetLeft - strip.offsetLeft - (sw - c.offsetWidth) / 2
      if (c.offsetLeft - strip.offsetLeft < sl || c.offsetLeft - strip.offsetLeft + c.offsetWidth > sl + sw || !smooth) {
        try { strip.scrollTo({ left: target, behavior: smooth && !reduced ? 'smooth' : 'auto' }) } catch (e) { strip.scrollLeft = target }
      }
    }
    function select (id, user) {
      if (dead || !BY[id]) return
      if (BY[id].group !== grp) { lastIn[BY[id].group] = id; setGroup(BY[id].group, false); return }
      var dir = cur ? idx(id) - idx(cur) : 0
      cur = id
      lastIn[grp] = id
      render(id, dir)
      reveal(idx(id), true)
      if (user) sfx()
    }
    function step (d, focus) {
      var i = (idx(cur) + d + list.length) % list.length
      select(list[i], true)
      if (focus) cards[i].focus({ preventScroll: true })
    }
    prev.addEventListener('click', function () { step(-1) })
    next.addEventListener('click', function () { step(1) })
    strip.addEventListener('keydown', function (e) {
      var k = e.key, n = list.length
      if (k === 'ArrowRight' || k === 'ArrowDown') { e.preventDefault(); step(1, true) } else if (k === 'ArrowLeft' || k === 'ArrowUp') { e.preventDefault(); step(-1, true) } else if (k === 'Home') { e.preventDefault(); select(list[0], true); cards[0].focus() } else if (k === 'End') { e.preventDefault(); select(list[n - 1], true); cards[n - 1].focus() } else if (k === 'Enter') { e.preventDefault(); choose() }
    })
    function choose () {
      if (dead) return
      sfx()
      var id = cur
      close()
      try { if (typeof opts.onPick === 'function') opts.onPick(id) } catch (e) { if (W.console) console.error('TKFleet onPick', e) }
    }
    cta.addEventListener('click', choose)
    // swipe on the stage = previous / next ship
    var sw = null
    stage.addEventListener('pointerdown', function (e) { sw = { x: e.clientX, y: e.clientY } })
    stage.addEventListener('pointerup', function (e) {
      if (!sw) return
      var dx = e.clientX - sw.x, dy = e.clientY - sw.y
      sw = null
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1)
    })
    function layout () {
      if (dead) return
      var r = host.getBoundingClientRect(), w = r.width, h = r.height
      var port = h > w * 1.05, short = !port && h < 520
      root.classList.toggle('tkf-port', port); root.classList.toggle('tkf-short', short)
      var card = short ? 104 : port ? Math.max(112, Math.min(176, w / 3.6)) : Math.max(120, Math.min(176, h / 5.6))
      root.style.setProperty('--tkf-card', Math.round(card) + 'px')
    }
    var ro = null
    if (W.ResizeObserver) { ro = new ResizeObserver(layout); ro.observe(host) } else W.addEventListener('resize', layout)
    layout()
    var first = cur
    cur = null
    setGroup(grp, false)
    select(first, false)
    W.requestAnimationFrame(function () { if (dead) return; root.classList.add('is-in'); reveal(idx(cur), false); try { cta.focus({ preventScroll: true }) } catch (e) {} })
    function close () {
      if (dead) return
      dead = true
      if (io) io.disconnect()
      if (ro) ro.disconnect(); else W.removeEventListener('resize', layout)
      if (root.parentNode) root.parentNode.removeChild(root)
    }
    return { destroy: close, pick: function (id) { if (BY[id]) { select(id, false); choose() } }, current: function () { return cur },
      group: function () { return grp }, setGroup: function (g) { setGroup(g, false) }, root: root }
  }

  // entry for TKSteer / TKLanes: returns the picker handle (or null when the game can start now)
  // opts.worldShip / opts.world: the story's own ship (see storyShip). The saved per-avatar pick still applies,
  // but the picker reopens ONCE per new world whose own ship is in the catalogue, with that ship preselected
  // and marked "Kapal di cerita ini!". opts.topInset (px) keeps the host's chip row clear.
  function resolve (host, opts, start) {
    opts = opts || {}
    if (opts.ship === false) { start(null); return null }
    if (opts.ship && BY[opts.ship]) { start(opts.ship); return null }
    var av = avatar(opts), s = saved(av), story = storyShip(opts.worldShip || opts.world)
    var wkey = String(opts.world || opts.worldShip || '').replace(/^ship\//, '')
    var fresh = story && wkey && seenWorlds(av).indexOf(wkey) < 0
    if (s && !fresh) { start(s); return null }
    return open(host, { lib: opts.lib, reducedMotion: opts.reducedMotion, sfx: opts.sfx, current: story || REC, worldShip: story, topInset: opts.topInset,
      onPick: function (id) { save(av, id); if (fresh) markWorld(av, wkey); start(id) } })
  }

  W.TKFleet = { ships: SHIPS, groups: GROUPS, get: get, storyShip: storyShip, sideSrc: sideSrc, topSrc: topSrc, handling: handling, saved: saved, save: save,
    avatar: avatar, open: open, resolve: resolve, recommended: REC, version: '1.2.0' }
})(window)
