/* =============================================================================
 * mojo-chases.js — window.MojoChases: the 3-Lane Rescue Chase CONFIG for G31 (PRD MOJO_CHASE_PRD.md).
 *
 *   STAGES      the Balapan submenu roster (one per owner biome; parent contract fields of PRD §20)
 *   PIECES      the modular track-piece library (owner architecture 2026-10-03: an endless ring of segments fed
 *               by a sequencer, never a looping video)
 *   sequence()  seeded piece sequencer: weighted pool per stage + scripted set pieces; a piece (other than
 *               Straight A) never appears more than 2 times in a row
 *   ADVENTURE   chase beats inside existing missions: a beat of type 'chase' runs AFTER beat `after`
 *               (mojo-swoptops.js beat runner hook), with its own story intro/outro
 *   question()  the one educational lane event: SoalEngine profile g31, context 'chase', generator 'mojo-chase'
 * Owner rules: Indonesian text, no failure words, no weapons (the rocket is a capture gadget with a safety net).
 * ==========================================================================*/
(function (W) {
  'use strict'

  /* ── track pieces: len in segments; curve = road bend per segment (+ right); hill = height change over the
     piece (world units, eased); surface/side drive the renderer's biome look; set = scripted only ─────── */
  var PIECES = {
    'straight-a': { len: 40, curve: 0, hill: 0 },
    'straight-b': { len: 50, curve: 0, hill: 0, deco: 'lamps' },
    'straight-c': { len: 36, curve: 0, hill: 0, deco: 'trees' },
    'left': { len: 50, curve: -3.2, hill: 0, chevron: 'left' },
    'right': { len: 50, curve: 3.2, hill: 0, chevron: 'right' },
    'wide-left': { len: 70, curve: -1.6, hill: 0, chevron: 'left' },
    'wide-right': { len: 70, curve: 1.6, hill: 0, chevron: 'right' },
    's-left': { len: 80, curve: -2.6, s: true, hill: 0, chevron: 'left' },
    's-right': { len: 80, curve: 2.6, s: true, hill: 0, chevron: 'right' },
    'uphill': { len: 60, curve: 0, hill: 1600 },
    'downhill': { len: 60, curve: 0, hill: -1600 },
    'bridge': { len: 90, curve: 0, hill: 0, surface: 'bridge', set: true },
    'tunnel': { len: 110, curve: 0.8, hill: 0, surface: 'tunnel', set: true },
    'town': { len: 60, curve: 0, hill: 0, deco: 'town', surface: 'town' },
    'forest': { len: 60, curve: 0.6, hill: 400, deco: 'forest' },
    'construction': { len: 50, curve: 0, hill: 0, deco: 'construction' },
    'coastal': { len: 60, curve: -0.8, hill: 0, deco: 'coastal' },
    'mud': { len: 40, curve: 0, hill: 0, surface: 'mud' },
    'snow': { len: 50, curve: 0.8, hill: 0, surface: 'snow' },
    'crosswalk': { len: 30, curve: 0, hill: 0, surface: 'crosswalk' },
    'finish': { len: 60, curve: 0, hill: 0, set: true, finish: true }
  }

  function rng (seed) { var s = (seed | 0) || 1; return function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff } }

  /** Endless sequencer: next() returns piece ids; scripted {at: pieceIndex, id} set pieces are inserted.
   *  Rule (gate qa-mojo-chase): a piece other than straight-a never repeats more than 2 times in a row. */
  function sequencer (stage, seed) {
    var r = rng(seed), pool = stage.pieces, n = 0, last = null, run = 0, script = {}
    ;(stage.script || []).forEach(function (s) { script[s.at] = s.id })
    var total = 0; pool.forEach(function (p) { total += p[1] })
    function pick () {
      for (var tries = 0; tries < 12; tries++) {
        var x = r() * total, id = pool[0][0]
        for (var i = 0; i < pool.length; i++) { x -= pool[i][1]; if (x <= 0) { id = pool[i][0]; break } }
        if (id === last && id !== 'straight-a' && run >= 2) continue
        return id
      }
      return 'straight-a'
    }
    return {
      next: function () {
        var id = script[n] || pick()
        if (id === last && id !== 'straight-a' && run >= 2) id = 'straight-a'
        run = id === last ? run + 1 : 1; last = id; n++
        return id
      }
    }
  }

  /* ── stages (Balapan submenu). far = owner FAR strip (0.05x), mid = optional MID strip (0.20x) or the
     procedural silhouette set; sky = skybox palette; target = the robber getaway vehicle (striped gang first);
     weather: rain | snow | leaves | dust | none; tier per PRD §13; seconds = the target session length. ── */
  var STAGES = [
    { id: 'pantai', cfar: 'coast', cmid: 'coast', cardKey: 'biome25/02-coastal', title: 'Kejar Pencuri!', place: 'Jalan Pantai', card: 'coastal', far: 'swoppiton', mid: 'swoppiton-mid', sky: 'clear',
      biome: 'coastal', target: 'striped-07', weather: 'none', tier: 'A', seconds: 70, gadget: 'rocket',
      mission: 'Tangkap pencuri dan jaga kota tetap aman!', intro: 'Pencuri kabur membawa karung koin warga! Ayo kejar dengan Mojo Pembalap!',
      outro: 'Pencuri tertangkap jaring! Polisi datang dan koin warga kembali.', item: 'karung koin',
      pieces: [['straight-a', 4], ['straight-b', 2], ['coastal', 3], ['wide-left', 2], ['wide-right', 2], ['left', 1], ['right', 1], ['uphill', 1], ['downhill', 1]],
      script: [{ at: 5, id: 'bridge' }] },
    { id: 'kota', cfar: 'town', cmid: 'town', cardKey: 'biome25/01-town', title: 'Keliling Kota', place: 'Kota Swoppiton', card: 'town', far: 'castle', sky: 'clear', biome: 'town', target: 'striped-14',
      weather: 'none', tier: 'B', seconds: 80, gadget: 'rocket', mission: 'Kejar mobil pencuri sampai tertangkap!',
      intro: 'Mobil belang mengambil bel sekolah! Kejar dia keliling kota.', outro: 'Bel sekolah kembali. Terima kasih, Mojo!', item: 'bel sekolah',
      pieces: [['straight-a', 3], ['town', 4], ['crosswalk', 2], ['left', 2], ['right', 2], ['straight-b', 2], ['s-left', 1], ['s-right', 1]],
      script: [{ at: 4, id: 'tunnel' }] },
    { id: 'hutan', cfar: 'forest', cmid: 'forest', cardKey: 'biome25/03-forest', title: 'Truk Kayu Kabur', place: 'Hutan Pinus', card: 'forest', far: 'forest-lake', sky: 'cloudy', biome: 'forest', target: 'logs',
      weather: 'leaves', tier: 'C', seconds: 85, gadget: 'rocket', mission: 'Hentikan truk kayu yang kabur!',
      intro: 'Truk kayu kabur tanpa izin! Ayo susul di jalan hutan.', outro: 'Truk kayu berhenti dengan aman. Hutan tetap lestari!', item: 'kayu',
      pieces: [['straight-a', 3], ['forest', 4], ['s-left', 2], ['s-right', 2], ['uphill', 2], ['downhill', 2], ['mud', 1], ['left', 1], ['right', 1]],
      script: [{ at: 6, id: 'bridge' }] },
    { id: 'gurun', cfar: 'desert', cmid: 'desert', cardKey: 'biome25/04-desert', title: 'Ngarai Batu Merah', place: 'Ngarai Batu Merah', card: 'desert', far: 'mesas', sky: 'sunset', biome: 'desert', target: 'junk',
      weather: 'dust', heat: true, tier: 'C', seconds: 90, gadget: 'rocket', mission: 'Tangkap truk rongsok di ngarai!',
      intro: 'Truk rongsok membawa kotak alat Kakek! Kejar ke ngarai!', outro: 'Kotak alat Kakek selamat. Hebat sekali!', item: 'kotak alat',
      pieces: [['straight-a', 3], ['straight-c', 2], ['wide-left', 2], ['wide-right', 2], ['uphill', 2], ['downhill', 2], ['left', 1], ['right', 1]],
      script: [{ at: 7, id: 'tunnel' }] },
    { id: 'salju', cfar: 'snow', cmid: 'snow', cardKey: 'biome25/05-snow', title: 'Jalan Salju Licin', place: 'Gunung Salju', card: 'snow', far: 'aurora', sky: 'snow', biome: 'snow', target: 'work',
      weather: 'snow', tier: 'D', seconds: 90, gadget: 'rocket', mission: 'Kejar truk batu di jalan bersalju!',
      intro: 'Truk batu meluncur kencang di jalan salju! Pelan-pelan, tapi terus kejar!', outro: 'Truk batu berhenti. Jalan salju aman lagi!', item: 'batu bangunan',
      pieces: [['straight-a', 3], ['snow', 4], ['wide-left', 2], ['wide-right', 2], ['downhill', 2], ['uphill', 1], ['s-left', 1], ['s-right', 1]],
      script: [{ at: 5, id: 'tunnel' }] },
    { id: 'jembatan', cfar: 'bridge', cmid: 'bridge', cardKey: 'biome25/06-bridge', title: 'Jembatan Merah', place: 'Teluk Mercusuar', card: 'bridge', far: 'lighthouse', sky: 'clear', biome: 'coastal', target: 'striped-02',
      weather: 'none', tier: 'D', seconds: 85, gadget: 'rocket', mission: 'Kejar mobil cepat melewati jembatan dan terowongan!',
      intro: 'Mobil cepat mengambil peta harta warga! Lewati jembatan merah!', outro: 'Peta warga kembali. Jembatan aman!', item: 'peta warga',
      pieces: [['straight-a', 3], ['coastal', 2], ['wide-left', 2], ['wide-right', 2], ['straight-b', 2]],
      script: [{ at: 2, id: 'bridge' }, { at: 5, id: 'tunnel' }, { at: 8, id: 'bridge' }] },
    { id: 'proyek', cfar: 'construction', cmid: 'construction', cardKey: 'biome25/08-construction', title: 'Proyek Kacau', place: 'Lokasi Proyek', card: 'construction', far: 'castle', sky: 'cloudy', biome: 'construction', target: 'chaos',
      weather: 'dust', tier: 'D', seconds: 85, gadget: 'rocket', mission: 'Hentikan bus usil di lokasi proyek!',
      intro: 'Bus usil kabur membawa helm para pekerja! Hati-hati banyak kerucut!', outro: 'Helm pekerja kembali. Proyek aman lagi!', item: 'helm pekerja',
      pieces: [['straight-a', 3], ['construction', 4], ['left', 2], ['right', 2], ['mud', 2], ['straight-c', 1]],
      script: [] },
    { id: 'desa', cfar: 'farm', cmid: 'farm', cardKey: 'biome25/09-farm', title: 'Es Krim Usil', place: 'Desa Peternakan', card: 'farm', far: 'forest-lake', sky: 'clear', biome: 'farm', target: 'sweet',
      weather: 'leaves', tier: 'B', seconds: 75, gadget: 'rocket', mission: 'Kejar truk es krim yang usil!',
      intro: 'Truk es krim usil membawa susu Pak Tani! Susul di jalan desa!', outro: 'Susu Pak Tani kembali. Es krim untuk semua!', item: 'susu segar',
      pieces: [['straight-a', 3], ['straight-c', 3], ['mud', 2], ['wide-left', 2], ['wide-right', 2], ['uphill', 1], ['downhill', 1]],
      script: [] },
    { id: 'malam', cfar: 'city-night', cmid: 'city-night', cardKey: 'biome25/10-city-night', title: 'Kejar Malam', place: 'Kota Malam', card: 'city-night', far: 'night-city', sky: 'night', biome: 'city', night: true, wet: true, target: 'speed',
      weather: 'rain', tier: 'E', seconds: 95, gadget: 'rocket', mission: 'Kejar mobil kencang di kota malam!',
      intro: 'Malam hujan, mobil kencang membawa lampu taman! Nyalakan lampu Mojo!', outro: 'Lampu taman kembali. Kota bersinar lagi!', item: 'lampu taman',
      pieces: [['straight-a', 3], ['straight-b', 3], ['wide-left', 2], ['wide-right', 2], ['s-left', 1], ['s-right', 1], ['town', 2]],
      script: [{ at: 4, id: 'tunnel' }, { at: 9, id: 'bridge' }] }
  ]

  /* ── biomes 11-25 (owner track-biomes-25-sheet + Codex FAR/MID strips). base = the road look (BIOME in
     mojo-chase-track.js); fx = biome lighting/particles in mojo-chase-scene.js ── */
  function extraStage (o) {
    return { id: o.id, title: o.title, place: o.place, cardKey: o.card, cfar: o.strip, cmid: o.strip, far: o.far || 'swoppiton', sky: o.sky || 'clear',
      biome: o.base, look: o.look, night: !!o.night, wet: !!o.wet, heat: !!o.heat, fx: o.fx || null, target: o.target, weather: o.weather || 'none', tier: o.tier || 'C',
      seconds: o.seconds || 85, gadget: 'rocket', mission: o.mission, intro: o.intro, outro: o.outro, item: o.item,
      pieces: o.pieces || [['straight-a', 3], ['straight-b', 2], ['wide-left', 2], ['wide-right', 2], ['left', 1], ['right', 1], ['uphill', 1], ['downhill', 1]], script: o.script || [] }
  }
  ;[
    { id: 'terowongan', look: 'town', title: 'Terowongan Panjang', place: 'Terowongan Gunung', card: 'biome25/07-tunnel', strip: 'town', base: 'town', sky: 'clear', target: 'striped-09', item: 'senter tambang', tier: 'C',
      mission: 'Kejar pencuri di dalam terowongan!', intro: 'Pencuri belang masuk terowongan membawa senter tambang! Lampu Mojo menyala otomatis!', outro: 'Senter tambang kembali. Terowongan terang lagi!',
      script: [{ at: 2, id: 'tunnel' }, { at: 4, id: 'tunnel' }, { at: 6, id: 'tunnel' }] },
    { id: 'rimba', look: 'jungle', title: 'Air Terjun Rimba', place: 'Hutan Rimba', card: 'biome25/11-jungle', strip: 'jungle', base: 'forest', sky: 'cloudy', weather: 'leaves', target: 'army', item: 'peta hutan',
      mission: 'Kejar mobil hijau di jalan rimba!', intro: 'Mobil hijau membawa peta hutan para penjaga! Kejar sampai air terjun!', outro: 'Peta hutan kembali ke penjaga. Hebat!' },
    { id: 'gunung-api', look: 'volcano', title: 'Kaki Gunung Api', place: 'Gunung Api Ceria', card: 'biome25/12-volcano', strip: 'volcano', base: 'desert', sky: 'sunset', fx: 'embers', heat: true, target: 'fuel', item: 'tabung bahan bakar',
      mission: 'Hentikan truk tangki dengan aman!', intro: 'Truk tangki membawa bahan bakar bengkel! Gunungnya hanya bercahaya, kita aman. Kejar!', outro: 'Bahan bakar bengkel kembali. Aman dan selamat!' },
    { id: 'tol-malam', look: 'city', title: 'Jalan Tol Malam', place: 'Tol Bulan Purnama', card: 'biome25/13-night-highway', strip: 'night-highway', base: 'city', sky: 'night', night: true, target: 'rich', item: 'lampu kota', tier: 'D',
      mission: 'Kejar mobil hitam di bawah bulan!', intro: 'Malam purnama, mobil hitam membawa lampu kota! Nyalakan lampu Mojo!', outro: 'Lampu kota menyala lagi. Terima kasih, Mojo!' },
    { id: 'musim-gugur', look: 'autumn', title: 'Daun Berguguran', place: 'Lembah Gugur', card: 'biome25/14-autumn', strip: 'autumn', base: 'farm', sky: 'sunset', weather: 'leaves', target: 'striped-19', item: 'keranjang apel',
      mission: 'Ambil kembali keranjang apel!', intro: 'Pencuri belang membawa keranjang apel petani! Kejar di antara daun jatuh!', outro: 'Keranjang apel kembali ke petani!' },
    { id: 'sakura', look: 'cherry', title: 'Jalan Bunga Sakura', place: 'Taman Sakura', card: 'biome25/15-cherry-blossom', strip: 'cherry-blossom', base: 'town', sky: 'clear', weather: 'petals', target: 'striped-17', item: 'pot bunga', tier: 'B',
      mission: 'Kejar pencuri pot bunga!', intro: 'Pencuri belang membawa pot bunga taman! Kejar di jalan sakura!', outro: 'Pot bunga kembali ke taman. Indah sekali!' },
    { id: 'hujan', look: 'rainy', title: 'Kejar di Hujan', place: 'Kota Hujan', card: 'biome25/16-rain', strip: 'rain', base: 'city', sky: 'rain', wet: true, weather: 'rain', target: 'trash', item: 'payung warga', tier: 'D',
      mission: 'Kejar truk hijau di jalan basah!', intro: 'Hujan turun, truk hijau membawa payung warga! Hati-hati jalan licin!', outro: 'Payung warga kembali. Semua tetap kering!' },
    { id: 'resor', look: 'beach', title: 'Pantai Resor', place: 'Pantai Kelapa', card: 'biome25/17-beach-resort', strip: 'beach-resort', base: 'coastal', sky: 'clear', fx: 'glare', target: 'striped-25', item: 'pelampung',
      mission: 'Kejar pencuri pelampung!', intro: 'Pencuri belang membawa pelampung pantai! Kejar di bawah matahari!', outro: 'Pelampung kembali ke penjaga pantai!' },
    { id: 'kereta-ngarai', look: 'canyon', title: 'Jembatan Kereta Ngarai', place: 'Ngarai Rel', card: 'biome25/18-canyon-railway', strip: 'canyon-railway', base: 'desert', sky: 'sunset', weather: 'dust', target: 'logs', item: 'kayu rel',
      mission: 'Hentikan truk kayu di ngarai!', intro: 'Truk kayu membawa kayu untuk rel kereta! Kejar di bawah jembatan!', outro: 'Kayu rel kembali. Kereta bisa lewat lagi!' },
    { id: 'kincir-angin', look: 'windfarm', title: 'Ladang Kincir Angin', place: 'Bukit Kincir', card: 'biome25/19-wind-farm', strip: 'wind-farm', base: 'farm', sky: 'cloudy', target: 'striped-12', item: 'baling-baling',
      mission: 'Kejar mobil pencuri baling-baling!', intro: 'Mobil belang membawa baling-baling kincir! Kejar di bukit berangin!', outro: 'Baling-baling kembali. Kincir berputar lagi!' },
    { id: 'antariksa', look: 'space', title: 'Pangkalan Antariksa', place: 'Stasiun Bintang', card: 'biome25/20-space-base', strip: 'space-base', base: 'city', sky: 'night', night: true, fx: 'space', target: 'striped-20', item: 'antena roket', tier: 'D',
      mission: 'Kejar pencuri antena roket!', intro: 'Pencuri belang membawa antena roket! Di sini Mojo terasa melayang!', outro: 'Antena roket kembali. Siap meluncur!' },
    { id: 'perumahan', look: 'suburb', title: 'Kompleks Perumahan', place: 'Kompleks Pelangi', card: 'biome25/21-suburb', strip: 'suburb', base: 'town', sky: 'clear', target: 'sweet', item: 'surat warga', tier: 'B',
      mission: 'Kejar truk es krim yang usil!', intro: 'Truk es krim usil membawa kantong surat! Kejar di kompleks!', outro: 'Surat warga sampai ke rumah masing-masing!' },
    { id: 'pelabuhan', look: 'harbour', title: 'Pelabuhan Peti Kemas', place: 'Pelabuhan Biru', card: 'biome25/22-harbor-port', strip: 'harbor-port', base: 'construction', sky: 'cloudy', target: 'big', item: 'peti mainan',
      mission: 'Kejar truk besar di pelabuhan!', intro: 'Truk besar membawa peti mainan anak-anak! Kejar di pelabuhan!', outro: 'Peti mainan kembali ke anak-anak!' },
    { id: 'stadion', look: 'stadium', title: 'Balapan Stadion', place: 'Stadion Mojo', card: 'biome25/23-stadium', strip: 'stadium', base: 'town', sky: 'clear', fx: 'flash', target: 'speed', item: 'piala', tier: 'E',
      mission: 'Rebut kembali piala juara!', intro: 'Mobil kencang membawa piala stadion! Penonton bersorak untuk Mojo!', outro: 'Piala kembali! Penonton bersorak!' },
    { id: 'candi', look: 'ruins', title: 'Gerbang Candi Tua', place: 'Reruntuhan Candi', card: 'biome25/24-ruins-temple', strip: 'ruins-temple', base: 'forest', sky: 'cloudy', weather: 'leaves', target: 'junk', item: 'batu pahat',
      mission: 'Kejar truk rongsok di candi!', intro: 'Truk rongsok membawa batu pahat candi! Kejar dengan hati-hati!', outro: 'Batu pahat kembali ke candi. Terima kasih!' },
    { id: 'permen', look: 'candy', title: 'Negeri Permen', place: 'Negeri Permen', card: 'biome25/25-candy-land', strip: 'candy-land', base: 'farm', sky: 'clear', fx: 'sugar', target: 'yum', item: 'kotak permen', tier: 'B',
      mission: 'Kejar truk hot dog yang usil!', intro: 'Truk hot dog usil membawa kotak permen! Kejar di negeri permen!', outro: 'Kotak permen kembali. Manis sekali!' }
  ].forEach(function (o) { STAGES.push(extraStage(o)) })

  /* ── adventure beats: type 'chase' after the given grid beat of an existing mission ─────────────────── */
  var ADVENTURE = [
    { type: 'chase', level: 'm1', after: 0, stage: 'kota', cfg: { chase_id: 'ADV_M1_ROTI', target: 'striped-14', item: 'roti hangat', seconds: 60, tier: 'A',
      intro: 'Batu sudah minggir, tapi pencuri mengambil roti hangat dari toko! Ayo kejar!', outro: 'Roti hangat kembali ke toko. Terima kasih, Mojo!' } },
    { type: 'chase', level: 'm6', after: 0, stage: 'malam', cfg: { chase_id: 'ADV_M6_LAMPU', target: 'rich', item: 'bola lampu', seconds: 65, tier: 'B',
      intro: 'Lampu menyala, tapi mobil hitam membawa kotak bola lampu! Kejar dia!', outro: 'Kotak bola lampu selamat. Sekarang pulang ke bengkel!' } },
    { type: 'chase', level: 's1', after: 1, stage: 'pantai', cfg: { chase_id: 'ADV_S1_PALU', target: 'striped-03', item: 'kotak alat', seconds: 70, tier: 'B',
      intro: 'Api padam! Tapi pencuri membawa kotak alat bengkel. Tanpa palu, gerbang tidak bisa diperbaiki. Kejar!', outro: 'Kotak alat kembali! Ayo perbaiki gerbang sekolah.' } }
  ]

  function stage (id) { for (var i = 0; i < STAGES.length; i++) if (STAGES[i].id === id) return STAGES[i]; return null }
  /** The parent contract (PRD §20) for a stage, with optional overrides (adventure beats). */
  function config (id, over) {
    var s = stage(id) || STAGES[0], o = over || {}
    return {
      chase_id: o.chase_id || 'CHASE_' + s.id.toUpperCase(), stage: s.id, environment: s.biome, mojo_form: o.mojo_form || null,
      target_type: o.target || s.target, speed_profile: o.tier || s.tier, obstacle_set: s.biome, collectible_set: ['star', 'coin', 'heart'],
      gadget: { type: 'capture_rocket', pickup_required: true, auto_lock: true, capture_effect: 'safety_net' },
      education_payload: { enabled: true, type: 'number_lane', difficulty: 'grade_1_2' },
      story_intro: o.intro || s.intro, story_outro: o.outro || s.outro, item: o.item || s.item, seconds: o.seconds || s.seconds,
      reward: { bolts: 2 }, return_checkpoint: o.return_checkpoint || null
    }
  }
  function beatAfter (levelId, beatIndex) {
    for (var i = 0; i < ADVENTURE.length; i++) if (ADVENTURE[i].level === levelId && ADVENTURE[i].after === beatIndex) return ADVENTURE[i]
    return null
  }

  /* ── the educational lane event: "Pilih jalur 5" / "Jalur mana 2 + 3?" ─────────────────────────────── */
  var SE = W.SoalEngine
  function chaseGen (grade, r, theme, o) {
    var kind = (o && o.kind) || (r() < 0.5 ? 'find' : 'add'), a, b, ans, prompt, choices
    function ri (x, y) { return x + Math.floor(r() * (y - x + 1)) }
    if (kind === 'add') { a = ri(1, 5); b = ri(1, 4); ans = a + b; prompt = 'Jalur mana ' + a + ' + ' + b + '?' }
    else { ans = ri(2, 9); prompt = 'Pilih jalur ' + ans + '!' }
    var pool = [ans - 2, ans - 1, ans + 1, ans + 2].filter(function (v) { return v >= 0 && v <= 12 })
    var w1 = pool.splice(Math.floor(r() * pool.length), 1)[0], w2 = pool.splice(Math.floor(r() * pool.length), 1)[0]
    choices = [ans, w1, w2]
    for (var i = 2; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = choices[i]; choices[i] = choices[j]; choices[j] = t }
    return { id: 'mc-' + kind + '-' + ans + '-' + (a || 0), topic: 'matematika', grade: 1, level: 1, kind: kind, prompt: prompt,
      choices: choices.map(String), answer: String(ans), calc: { op: kind, a: a || 0, b: b || 0, ans: ans }, easy: true, theme: ['mojo'] }
  }
  if (SE && SE.registerGenerator) {
    SE.registerGenerator('matematika', chaseGen, { id: 'mojo-chase', grades: [1, 2], general: false, weight: 1,
      validate: function (q) { var c = q.calc || {}; var ok = c.op === 'add' ? c.a + c.b === c.ans : true; return ok && String(c.ans) === q.answer && q.choices.indexOf(q.answer) >= 0 && q.choices.length === 3 ? [] : ['chase answer'] } })
  }
  var qSeed = 11
  function question (kind) {
    var q = null
    try { if (SE && SE.generate) q = SE.generate('matematika', { game: 'g31', context: 'chase', generator: 'mojo-chase', kind: kind || null, seed: qSeed++ }) } catch (e) { q = null }
    return q || chaseGen(1, rng(qSeed++), null, { kind: kind })
  }

  W.MojoChases = { STAGES: STAGES, PIECES: PIECES, ADVENTURE: ADVENTURE, stage: stage, config: config, beatAfter: beatAfter,
    sequencer: sequencer, rng: rng, question: question, chaseGen: chaseGen }
})(typeof window !== 'undefined' ? window : globalThis)
