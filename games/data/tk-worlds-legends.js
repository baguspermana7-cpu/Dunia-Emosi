/* ============================================================================
 * tk-worlds-legends.js — "Kapal Legenda baru" for G30 Timmy & Kapal Legendaris.
 * PRD: documentation and standarization/TIMMY_LEGENDARY_SHIPS_PRD_v2.md §14.
 *
 * Six more story worlds from the owner's 25-ship sheet (2026-09-29), APPENDED to
 * window.TKWorlds.WORLDS after games/data/tk-worlds.js has loaded. Nothing in tk-worlds.js is
 * changed: the worlds are added at the END (after Pelabuhan Waktu), so no existing world moves
 * index (the host keys unlock order and saveLevelProgress by index; stars by world id + level id).
 *
 *   Mary Rose (1545 / diangkat 1982) · Queen Anne's Revenge (1718 / ditemukan 1996) ·
 *   HMS Erebus & HMS Terror (1845 / ditemukan 2014 + 2016) · Mary Celeste (1872) ·
 *   SS Republic (1909, panggilan radio CQD) · RMS Carpathia (1912, penolong Titanic)
 *
 * Every world is DATA over the level types the host already plays: story · quiz · sort · grid ·
 * steer · lanes. A level may carry `story` panels (played before it, like tk-worlds). The last level
 * of a world carries `fragment:true`. Extra fields the host may read later (wiring list in §14):
 *   w.series 'legenda' · w.legend [picker slugs] · w.guideArt / w.thumb / w.isle sprite keys ·
 *   w.fragmentName · w.outro [panels: Timmy returns to his room] · lv.steer {extra TKSteer level
 *   fields, passed through a wrapper around TKWorlds.steer}.
 * Also appended: themed sort sets (TKQuestions.sorts) and a few curated questions (TKQuestions.items)
 * tagged with these world ids; a 'penyelamatan' ship category; the ship art slots 'ship/<world id>'
 * (TKArt.OVERRIDE) -> the owner's crop tk-legend-side/<slug> once it is in the AssetIndex, until then
 * the closest existing ship sprite.
 * Child safety (PRD §0): no one is hurt on screen, no weapons, the hard parts of each history are
 * told calmly and briefly, every world ends on the people who searched, helped or learned.
 * Vanilla ES5, idempotent (a second load does nothing). Load order: after tk-worlds.js (required)
 * and ideally after tk-art.js + tk-questions.js (else those parts are added on DOMContentLoaded).
 * ==========================================================================*/
(function () {
  'use strict'
  var W = (typeof window !== 'undefined' ? window : globalThis)
  var TKW = W.TKWorlds
  if (!TKW || !TKW.WORLDS) { try { console.warn('[tk-legends] load after tk-worlds.js') } catch (e) {} return }
  if (TKW.LEGENDS) return

  function P (scene, caption, speaker, layers) { return { scene: scene, caption: caption, speaker: speaker || null, layers: layers || [] } }
  function board (rows, dir, tools, extra) { var o = { rows: rows, dir: dir || 'E', tools: tools || ['N', 'E', 'S', 'W'], theme: 'sea' }; for (var k in extra || {}) o[k] = extra[k]; return o }
  var PD = ['N', 'E', 'S', 'W', 'P', 'D'], PK = ['N', 'E', 'S', 'W', 'P']

  // characters (owner sheets). The captain is the OLD HUMAN captain; the penguin is only his assistant.
  var TIMMY = 'char/timmy', CAPT = 'tk-char/captain-old', PENG = 'tk-char/penguin-sailor'
  var DIVER = 'tk-char/diver', DIVER2 = 'tk-char/diver-bearded', GIRL_CAM = 'tk-char/hijab-girl-camera', GIRL_TAB = 'tk-char/hijab-officer-tablet'
  var GIRL_MAP = 'tk-char/hijab-girl-map', GIRL_BOOK = 'tk-char/hijab-girl-book', OFFICER = 'tk-char/officer-boy', OFF_BIN = 'tk-char/officer-boy-binoculars'
  var CAP_BIN = 'tk-char/captain-binoculars', CAP_MAP = 'tk-char/captain-map', CHEF = 'tk-char/chef', MECH = 'tk-char/mechanic-boy', EXPLORER = 'tk-char/explorer-kid'
  // grid obstacle sprites
  var ICE = ['tk-prop/iceberg-5', 'tk-world/iceberg-2', 'tk-prop/iceberg-3']
  var ROCK = ['tk-world/arch-rock', 'gt-el/boulders']
  var DECKB = ['tk-prop/rope-coil', 'tk-prop/barrels', 'tk-prop/crate-plain']

  function T (x, y, s, d) { return { k: TIMMY, x: x, y: y, s: s || 40, d: d || 1 } }
  function K (k, x, y, s, d) { return { k: k, x: x, y: y, s: s, d: d || 0.9 } }
  // the time-travel opening every world shares: the bedroom, then the corridor to the ship's year
  function away (name, year) {
    return [
      P('bedroom-night', 'Malam itu Timmy membaca buku tentang ' + name + '… lalu tertidur.', null,
        [K('tk-legend/bedroom', 50, 96, 70, 0.6), K('char/timmy-sleeping', 36, 86, 46, 0.85), K('nature/moon-stars', 66, 26, 14, 0.1)]),
      P('time-tunnel', 'Kompas Timmy bersinar! Lorong waktu membawanya ke tahun ' + year + '.', null,
        [K('char/timmy-flying', 50, 62, 48, 1), K('game/compass', 78, 30, 16, 0.4)])
    ]
  }
  // the way home (host hook w.outro): the fragment glows and the corridor brings Timmy back to his room
  function home (fragName, pic) {
    return [
      P('bedroom-portal', 'Kepingan ' + fragName + ' bersinar di tangan Timmy. Lorong waktu terbuka lagi.', 'Timmy',
        [K('fx/portal', 68, 50, 70, 0.4), K(pic, 44, 46, 16, 1.2), T(22, 76, 42)]),
      P('bedroom-night', 'Timmy kembali ke kamarnya. Satu kisah kapal legenda kini ada di buku hariannya.', null,
        [K('tk-legend/bedroom', 50, 96, 70, 0.6), K('tk-legend/journal-book', 70, 70, 18, 1.1), T(34, 82, 40)])
    ]
  }
  var C = function (a, b, c) { return [{ id: a[0], title: a[1], text: a[2] }, { id: b[0], title: b[1], text: b[2] }, { id: c[0], title: c[1], text: c[2] }] }

  /* ── 1. Mary Rose — diangkat dari dasar laut oleh penyelam dan ilmuwan (Sabar & Teliti) ─── */
  var MARYROSE = {
    id: 'maryrose', name: 'Mary Rose', legend: ['mary-rose'], year: 1545, value: 'Sabar & Teliti', cat: 'sains', color: '#8E3B2F', scene: 'harbor-morning',
    captain: { name: 'Kapten Tua', quote: 'Pelan-pelan dan hati-hati. Laut menyimpan banyak pelajaran.' }, guideArt: CAPT,
    thumb: 'tk-prop/diving-helmet', isle: 'tk-world/harbor-station', fragmentName: 'Mawar Emas', fragmentArt: 'tk-prop/compass-3',
    spec: { type: 'Kapal kayu kerajaan', length: '45 m', famous: 'Diangkat utuh dari dasar laut pada tahun 1982', quote: 'Sabar dan teliti membuka rahasia masa lalu.', verified: false },
    cards: C(['maryrose-1', 'Kapal Raja', 'Mary Rose dibuat tahun 1510 untuk Raja Henry VIII dari Inggris. Tahun 1545 kapal ini terbalik dan hilang ke dasar laut dekat Portsmouth.'],
      ['maryrose-2', 'Dijaga Lumpur', 'Lumpur lembut di dasar laut menjaga separuh kapal dan ribuan benda di dalamnya selama lebih dari 400 tahun.'],
      ['maryrose-3', 'Diangkat Pelan-pelan', 'Pada 11 Oktober 1982 penyelam dan ilmuwan mengangkat Mary Rose. Kini kapal itu bisa dilihat di museum di Portsmouth.']),
    levels: [
      { id: 'maryrose1', title: 'Kapal di Dasar Laut', type: 'story', goal: 'Timmy tiba di Portsmouth. Dengarkan Kapten!',
        story: away('Mary Rose', 1982).concat([
          P('harbor-morning', 'Timmy tiba di sebuah perahu penyelam. Kapten tua dan asisten pinguinnya melambai.', 'Kapten Tua',
            [K(CAPT, 74, 72, 46, 0.9), K(PENG, 52, 82, 22, 1.05), T(20, 78, 38)]),
          P('harbor-morning', 'Di bawah kita ada Mary Rose, kapal Raja Henry VIII. Tahun 1545 kapal ini terbalik dan hilang ke dasar laut.', 'Kapten Tua',
            [K('ship/maryrose', 58, 50, 62, 0.5), K(CAPT, 82, 74, 40, 0.9), T(18, 78, 36)]),
          P('deep-sea', 'Lumpur lembut menjaganya selama ratusan tahun. Sekarang para penyelam datang untuk belajar darinya.', 'Timmy',
            [K(DIVER, 70, 66, 40, 0.9), K('tk-prop/diving-helmet', 36, 60, 18, 1.1), T(22, 78, 36)])]) },
      { id: 'maryrose2', title: 'Peluit Tua', type: 'grid', scene: 'deep-sea', goal: 'Ambil peluit tua, lalu taruh di keranjang penyelam!',
        fact: 'Awak Mary Rose memakai peluit untuk memberi aba-aba di kapal.', hint: 'Ambil peluit dulu, lalu ke keranjang.',
        story: [P('deep-sea', 'Timmy memakai baju selam. Ada peluit tua di dekat lumpur. Ayo ambil dengan hati-hati!', 'Kapten Tua',
          [K(DIVER2, 74, 70, 40, 0.9), K('tk-prop/whistle', 48, 60, 14, 1.15), T(20, 78, 34)])],
        board: board(['S#.', '.c.', '#.d'], 'E', PD, { blockArt: ROCK, itemArt: 'tk-prop/whistle', par: 6 }) },
      { id: 'maryrose3', title: 'Harta di Lumpur', type: 'grid', scene: 'deep-sea', goal: 'Ambil 2 lonceng tua, awas arus, lalu ke keranjang!',
        fact: 'Penyelam menyelam lebih dari 20.000 kali untuk mengangkat benda-benda Mary Rose.', hint: 'Arus mendorong perahumu satu kotak.',
        story: [P('deep-sea', 'Arus laut di sini kuat. Arus bisa mendorongmu. Pakai arus itu untuk membantumu!', 'Kapten Tua',
          [K(CAPT, 78, 72, 40, 0.9), K('tk-prop/ship-bell', 48, 58, 14, 1.15), T(20, 78, 34)])],
        board: board(['S.#..', '.c>..', '#..#c', '..dT.'], 'E', PD, { blockArt: ROCK, itemArt: 'tk-prop/ship-bell', par: 11, qTopic: 'umum' }) },
      { id: 'maryrose4', title: 'Memilah Temuan', type: 'sort', domain: 'umum', scene: 'shipyard', goal: 'Kelompokkan benda temuan sebelum diangkat!',
        story: [P('shipyard', 'Ada 19.000 benda dari Mary Rose! Ilmuwan memilahnya satu per satu sebelum diangkat.', 'Ilmuwan',
          [K(GIRL_TAB, 74, 72, 42, 0.9), K('tk-prop/violin', 46, 62, 16, 1.1), T(20, 78, 36)])] },
      { id: 'maryrose5', title: 'Hari Pengangkatan', type: 'steer', mode: 'gates', vessel: 'boat', scene: 'harbor-morning', goal: 'Tarik Mary Rose pelan-pelan lewat semua gerbang!',
        steer: { gateCount: 4, night: false, length: 2300, obstacle: 'rock' }, questions: { on: 'gate', gates: 1, count: 1 },
        story: [P('harbor-morning', '11 Oktober 1982. Bingkai kuning raksasa mengangkat Mary Rose dari laut. Banyak orang menonton!', 'Kapten Tua',
          [K('ship/maryrose', 58, 52, 58, 0.5), K(CAPT, 82, 74, 38, 0.9), T(18, 78, 34)]),
          P('harbor-morning', 'Kapal kayu tua itu rapuh. Kemudikan dengan pelan menuju pelabuhan.', 'Timmy', [T(30, 76, 42), K(PENG, 70, 80, 24, 1)])] },
      { id: 'maryrose6', title: 'Museum Mary Rose', type: 'quiz', domain: 'umum', count: 4, scene: 'harbor-morning', fragment: true,
        goal: 'Hitung benda temuan untuk museum, lalu buka lorong waktu!',
        story: [P('harbor-morning', 'Bertahun-tahun kapal itu disemprot air dan lilin supaya tidak retak. Ilmuwan bekerja dengan sabar.', 'Ilmuwan',
          [K(GIRL_TAB, 74, 72, 42, 0.9), T(22, 78, 36)]),
          P('harbor-morning', 'Kompas Timmy bersinar lagi. Jawab soalnya untuk membuka lorong waktu pulang!', 'Kapten Tua',
            [K(CAPT, 76, 72, 42, 0.9), K('game/compass', 48, 40, 16, 1.2), T(22, 78, 36)])] }
    ],
    outro: home('Mawar Emas', 'tk-prop/compass-3')
  }

  /* ── 2. Queen Anne's Revenge — kapal bajak laut, hartanya kini milik semua (Jujur & Berbagi) ─── */
  var QUEENANNE = {
    id: 'queenanne', name: "Queen Anne's Revenge", legend: ['queen-annes-revenge'], year: 1718, value: 'Jujur & Berbagi', cat: 'sains', color: '#3B3F5C', scene: 'research-sea',
    captain: { name: 'Penyelam Pak Mark', quote: 'Harta yang ditemukan adalah milik semua orang.' }, guideArt: DIVER2,
    thumb: 'tk-prop/ship-bell-2', isle: 'tk-world/palm-island', fragmentName: 'Lonceng Jujur', fragmentArt: 'tk-prop/ship-bell-2',
    spec: { type: 'Kapal layar bajak laut', length: '31 m', famous: 'Hartanya ditemukan penyelam dan kini ada di museum', quote: 'Jujur dan berbagi lebih berharga dari emas.', verified: false },
    cards: C(['queenanne-1', 'Kapal Blackbeard', "Queen Anne's Revenge adalah kapal bajak laut Blackbeard. Tahun 1718 kapal ini kandas di gosong pasir di Amerika. Awaknya turun ke darat."],
      ['queenanne-2', 'Ditemukan Lagi', 'Pada tahun 1996 penyelam menemukan kapal ini lagi. Mereka mengangkat lonceng, jangkar, piring, dan butiran emas.'],
      ['queenanne-3', 'Harta untuk Semua', 'Temuan dari kapal ini disimpan di museum di Carolina Utara, supaya semua orang bisa melihat dan belajar.']),
    levels: [
      { id: 'queenanne1', title: 'Layar Hitam', type: 'story', goal: 'Timmy melihat kapal bajak laut. Dengarkan Kapten!',
        story: away("Queen Anne's Revenge", 1718).concat([
          P('research-sea', 'Sebuah kapal berlayar hitam muncul. Itu kapal Blackbeard, sang bajak laut!', 'Timmy',
            [K('ship/queenanne', 60, 50, 64, 0.5), T(18, 78, 38)]),
          P('research-sea', 'Bajak laut suka mengambil barang milik orang lain. Itu tidak baik, ya.', 'Kapten Tua',
            [K(CAPT, 74, 72, 44, 0.9), K(PENG, 52, 82, 22, 1.05), T(20, 78, 36)]),
          P('research-sea', 'Tahun 1718 kapal itu kandas di gosong pasir. Awaknya turun ke darat. Kapalnya tertinggal di laut.', 'Kapten Tua',
            [K('ship/queenanne', 56, 56, 54, 0.5), K(CAPT, 82, 74, 38, 0.9)]),
          P('deep-sea', 'Hampir 300 tahun kemudian, tahun 1996, penyelam menemukannya lagi! Timmy ikut menyelam.', 'Penyelam Pak Mark',
            [K(DIVER2, 72, 68, 42, 0.9), T(22, 78, 36)])]) },
      { id: 'queenanne2', title: 'Lonceng Kapal', type: 'grid', scene: 'deep-sea', goal: 'Ambil lonceng kapal, lalu bawa ke perahu penyelam!',
        fact: 'Lonceng kapal ini punya angka tahun 1709.', hint: 'Ambil lonceng dulu, lalu ke tanda kuning.',
        story: [P('deep-sea', 'Ada lonceng tua di pasir! Ambil, lalu bawa ke perahu penyelam.', 'Penyelam Pak Mark',
          [K(DIVER2, 74, 70, 40, 0.9), K('tk-prop/ship-bell-2', 48, 60, 14, 1.15), T(20, 78, 34)])],
        board: board(['Sc.#', '.#..', '..d.'], 'E', PD, { blockArt: ROCK, itemArt: 'tk-prop/ship-bell-2', par: 6 }) },
      { id: 'queenanne3', title: 'Koin Emas', type: 'grid', scene: 'deep-sea', goal: 'Ambil 2 tumpukan koin, awas arus, lalu ke perahu!',
        fact: 'Penyelam juga menemukan piring, gelas, dan butiran emas yang sangat kecil.', hint: 'Arus mendorong perahumu satu kotak.',
        story: [P('deep-sea', 'Dua tumpukan koin tua tersebar di dasar laut. Hati-hati, ada arus! Ada juga peti tanya.', 'Penyelam Pak Mark',
          [K(DIVER2, 74, 70, 40, 0.9), K('gt/coin-stack', 48, 60, 14, 1.15), T(20, 78, 34)])],
        board: board(['Sc>..', '..#cT', '#...d'], 'E', PD, { blockArt: ROCK, itemArt: 'gt/coin-stack', par: 8, qTopic: 'matematika' }) },
      { id: 'queenanne4', title: 'Harta untuk Museum', type: 'sort', domain: 'umum', scene: 'harbor-day', goal: 'Pilah harta untuk dipamerkan di museum!',
        story: [P('harbor-day', 'Semua harta dibawa ke museum. Tidak ada yang disimpan sendiri. Ayo pilah!', 'Penyelam Pak Mark',
          [K(DIVER2, 76, 72, 40, 0.9), K('tk-prop/treasure-chest-open', 46, 64, 18, 1.1), T(20, 78, 36)])] },
      { id: 'queenanne5', title: 'Jujur & Berbagi', type: 'quiz', domain: 'umum', count: 4, scene: 'harbor-day', goal: 'Bagikan koin emas dengan adil kepada teman!',
        story: [P('harbor-day', 'Harta paling berharga adalah yang dibagi. Di museum, semua anak bisa melihatnya.', 'Kapten Tua',
          [K(CAPT, 76, 72, 42, 0.9), K(GIRL_BOOK, 48, 78, 30, 1), T(20, 78, 34)])] },
      { id: 'queenanne6', title: 'Keluar dari Teluk', type: 'steer', mode: 'sail', vessel: 'clipper', scene: 'research-sea', fragment: true,
        goal: 'Berlayar keluar teluk, jangan sampai kandas!',
        steer: { night: false, gateCount: 4, obstacle: 'rock' }, questions: { on: ['collide', 'buoy'], buoys: 2, count: 2 },
        story: [P('research-sea', 'Kompas Timmy bersinar! Satu tugas lagi: layarkan perahu keluar teluk tanpa kandas.', 'Kapten Tua',
          [K(CAPT, 76, 72, 42, 0.9), K('game/compass', 48, 40, 16, 1.2), T(22, 78, 36)])] }
    ],
    outro: home('Lonceng Jujur', 'tk-prop/ship-bell-2')
  }

  /* ── 3. HMS Erebus & HMS Terror — dua kapal di es, dicari 170 tahun (Tekun Mencari) ─── */
  var EREBUS = {
    id: 'erebus', name: 'HMS Erebus & HMS Terror', legend: ['hms-erebus', 'hms-terror'], year: 1845, value: 'Tekun Mencari', cat: 'penjelajahan', color: '#3E6D8E', scene: 'antarctic',
    captain: { name: 'Kapten Pencari', quote: 'Jangan berhenti mencari, dan dengarkan cerita orang di sekitarmu.' }, guideArt: CAP_MAP,
    thumb: 'tk-prop/ice-floe', isle: 'tk-world/snow-island', fragmentName: 'Jarum Utara', fragmentArt: 'tk-prop/compass-4',
    spec: { type: 'Dua kapal penjelajah kutub', length: '32 m', famous: 'Ditemukan lagi tahun 2014 dan 2016 berkat cerita orang Inuit', quote: 'Tekun mencari dan mau mendengarkan.', verified: false },
    cards: C(['erebus-1', 'Mencari Jalan di Utara', 'Tahun 1845 kapal Erebus dan Terror berangkat dari Inggris. Mereka ingin menemukan jalan laut di utara Kanada, melewati es.'],
      ['erebus-2', 'Hilang di Es', 'Es laut membeku di sekeliling kedua kapal. Kapal-kapal itu tidak pernah pulang, dan orang mencarinya selama lebih dari 150 tahun.'],
      ['erebus-3', 'Cerita Orang Inuit', 'Orang Inuit mengingat cerita tentang kapal besar di es. Berkat cerita itu, Erebus ditemukan tahun 2014 dan Terror tahun 2016.']),
    levels: [
      { id: 'erebus1', title: 'Dua Kapal Berangkat', type: 'story', goal: 'Timmy ikut ekspedisi ke utara yang dingin.',
        story: away('HMS Erebus dan HMS Terror', 1845).concat([
          P('harbor-dawn', 'Dua kapal kayu bersiap berlayar: Erebus dan Terror. Tujuannya jauh ke utara!', 'Timmy',
            [K('ship/erebus', 60, 50, 64, 0.5), T(18, 78, 38)]),
          P('harbor-dawn', 'Mereka ingin menemukan jalan laut di utara, melewati es. Perjalanannya bisa bertahun-tahun.', 'Kapten Tua',
            [K(CAPT, 74, 72, 44, 0.9), K(PENG, 52, 82, 22, 1.05), T(20, 78, 36)])]) },
      { id: 'erebus2', title: 'Bekal Tiga Tahun', type: 'sort', domain: 'umum', scene: 'harbor-dawn', goal: 'Kelompokkan bekal untuk perjalanan panjang!',
        story: [P('harbor-dawn', 'Kapal membawa bekal untuk tiga tahun: makanan, pakaian hangat, bahkan ribuan buku!', 'Koki Kapal',
          [K(CHEF, 74, 72, 42, 0.9), K('school/books', 46, 64, 16, 1.1), T(20, 78, 36)])] },
      { id: 'erebus3', title: 'Laut Penuh Es', type: 'steer', mode: 'ice', vessel: 'explorer', scene: 'antarctic', goal: 'Kemudikan kapal di antara bongkahan es!',
        steer: { night: false }, questions: { on: 'collide', count: 2 },
        story: [P('antarctic', 'Laut di utara penuh bongkahan es. Pelan-pelan, cari jalan yang aman!', 'Kapten Tua',
          [K(CAP_BIN, 76, 72, 42, 0.9), K('tk-prop/ice-floe', 46, 66, 18, 1.1), T(20, 78, 34)])] },
      { id: 'erebus4', title: 'Kapal Pencari', type: 'lanes', difficulty: 1, seed: 1845, night: false, domain: 'campur', scene: 'antarctic',
        goal: 'Kapal pencari melaju di antara es. Pindah jalur!', questions: { on: ['collide', 'buoy', 'gate'], buoys: 2, gates: 1, count: 2 }, lengthScale: 2.2,
        sections: [{ kind: 'open', title: 'Mulai Mencari', sub: 'Kumpulkan bintang di jalurmu!' }, { kind: 'sparse', title: 'Es Mulai Muncul', sub: 'Pindah jalur untuk menghindar.' },
          { kind: 'more', title: 'Jangan Menyerah', sub: 'Pencari terus mencari bertahun-tahun.' }],
        story: [P('antarctic', 'Es membeku di sekeliling kedua kapal, dan kapal itu tidak pernah pulang. Orang terus bertanya: di mana mereka?', 'Kapten Tua',
          [K(CAPT, 76, 72, 42, 0.9), K('tk-prop/iceberg-5', 40, 64, 24, 0.6), T(18, 78, 34)]),
          P('antarctic', 'Selama bertahun-tahun, banyak kapal pencari datang. Ayo ikut mencari!', 'Kapten Pencari',
            [K(CAP_MAP, 76, 72, 42, 0.9), T(22, 78, 36)])] },
      { id: 'erebus5', title: 'Peta untuk Tim Pencari', type: 'grid', scene: 'antarctic', goal: 'Bawa peta menyeberangi es ke tim pencari!',
        fact: 'Orang Inuit mengingat cerita tentang kapal besar yang terjebak es.', hint: 'Es bergerak. Tunggu sampai jalannya terbuka.',
        story: [P('antarctic', 'Seorang pemburu Inuit ingat pernah melihat tiang kapal di es! Bawa petanya ke tim pencari.', 'Kapten Pencari',
          [K(CAP_MAP, 76, 72, 42, 0.9), K('tk-prop/nautical-chart', 46, 60, 16, 1.15), T(20, 78, 34)])],
        board: board(['S..#.', '.#c..', '..T#.', '#..d.'], 'E', PD, { blockArt: ICE, itemArt: 'tk-prop/nautical-chart', par: 10, qTopic: 'umum',
          ice: [{ path: [{ x: 1, y: 0 }, { x: 2, y: 0 }] }] }) },
      { id: 'erebus6', title: 'Ditemukan!', type: 'quiz', domain: 'umum', count: 4, scene: 'antarctic', fragment: true,
        goal: 'Hitung penyelam yang turun ke kapal, lalu buka lorong waktu!',
        story: [P('deep-sea', 'Tahun 2014 Erebus ditemukan di dasar laut. Tahun 2016 Terror juga ditemukan!', 'Kapten Pencari',
          [K(DIVER, 72, 66, 42, 0.9), K('ship/erebus', 40, 58, 40, 0.5), T(18, 80, 32)]),
          P('antarctic', 'Pencarian itu berhasil karena orang tidak menyerah dan mau mendengarkan. Kompas Timmy bersinar!', 'Kapten Tua',
            [K(CAPT, 76, 72, 42, 0.9), K('game/compass', 48, 40, 16, 1.2), T(22, 78, 36)])] }
    ],
    outro: home('Jarum Utara', 'tk-prop/compass-4')
  }

  /* ── 4. Mary Celeste — kapal yang berlayar tanpa awak (Teliti & Siaga) ─── */
  var MARYCELESTE = {
    id: 'maryceleste', name: 'Mary Celeste', legend: ['mary-celeste'], year: 1872, value: 'Teliti & Siaga', cat: 'sains', color: '#5F7A55', scene: 'research-sea',
    captain: { name: 'Kapten Morehouse', quote: 'Amati baik-baik. Setiap petunjuk punya cerita.' }, guideArt: CAP_BIN,
    thumb: 'tk-prop/captains-log', isle: 'tk-world/arch-island', fragmentName: 'Kaca Pengamat', fragmentArt: 'tk-prop/spyglass-4',
    spec: { type: 'Kapal layar dagang', length: '31 m', famous: 'Ditemukan berlayar sendiri tanpa seorang pun di dalamnya', quote: 'Teliti mengamati, siaga saat latihan.', verified: false },
    cards: C(['maryceleste-1', 'Kapal Misteri', 'Desember 1872, kapal Dei Gratia menemukan Mary Celeste berlayar sendiri di Samudra Atlantik. Tidak ada seorang pun di dalamnya.'],
      ['maryceleste-2', 'Petunjuk', 'Makanan dan air masih banyak. Sekoci kapal tidak ada. Dari 1.701 tong muatan, 9 tong kosong.'],
      ['maryceleste-3', 'Dibawa ke Pelabuhan', 'Tiga pelaut Dei Gratia membawa Mary Celeste dengan selamat ke Gibraltar. Sampai sekarang, tidak ada yang tahu pasti ke mana awaknya pergi.']),
    levels: [
      { id: 'maryceleste1', title: 'Kapal Tanpa Awak', type: 'story', goal: 'Ada kapal aneh di laut. Ayo amati!',
        story: away('Mary Celeste', 1872).concat([
          P('research-sea', 'Timmy tiba di kapal Dei Gratia. Kapten Morehouse melihat kapal lain berlayar aneh.', 'Kapten Morehouse',
            [K(CAP_BIN, 74, 72, 46, 0.9), T(20, 78, 38)]),
          P('research-sea', '"Halo? Ada orang?" Tidak ada yang menjawab. Layarnya terbuka, tapi dek kapal kosong.', 'Timmy',
            [K('ship/maryceleste', 60, 52, 60, 0.5), T(18, 78, 36)]),
          P('old-deck', 'Namanya Mary Celeste. Ayo naik dan cari petunjuk, seperti detektif!', 'Kapten Tua',
            [K(CAPT, 76, 72, 42, 0.9), K(PENG, 54, 82, 22, 1.05), T(20, 78, 36)])]) },
      { id: 'maryceleste2', title: 'Petunjuk di Dek', type: 'grid', scene: 'old-deck', goal: 'Kumpulkan 3 petunjuk, lalu pergi ke kemudi!',
        fact: 'Buku catatan kapal masih ada, tapi sekoci kapal hilang.', hint: 'Ambil tiap petunjuk: Ambil di atas petunjuknya.',
        story: [P('old-deck', 'Ada tiga catatan tersebar di dek. Kumpulkan semuanya!', 'Kapten Morehouse',
          [K(CAP_BIN, 76, 72, 42, 0.9), K('tk-prop/scroll-sealed', 46, 60, 14, 1.15), T(20, 78, 34)])],
        board: board(['Sc.', '#c.', 'cTG'], 'E', PK, { theme: 'deck', blockArt: DECKB, itemArt: 'tk-prop/scroll-sealed', par: 9, qTopic: 'logika' }) },
      { id: 'maryceleste3', title: 'Tong Muatan', type: 'sort', domain: 'matematika', scene: 'old-deck', goal: 'Pisahkan tong muatan dan bekal makanan!',
        story: [P('old-deck', 'Di gudang ada banyak tong dan bekal makanan. Makanannya masih cukup untuk enam bulan!', 'Timmy',
          [K('tk-prop/barrels', 70, 70, 24, 0.95), K('food/bread', 46, 66, 14, 1.1), T(20, 78, 36)])] },
      { id: 'maryceleste4', title: 'Mata Detektif', type: 'quiz', domain: 'logika', count: 4, scene: 'old-deck', goal: 'Amati gambarnya dengan teliti, lalu jawab!',
        story: [P('old-deck', 'Detektif selalu mengamati dengan teliti. Ayo latih mata detektifmu!', 'Kapten Tua',
          [K(CAPT, 76, 72, 42, 0.9), K('tk-prop/spyglass-4', 48, 58, 16, 1.15), T(20, 78, 34)])] },
      { id: 'maryceleste5', title: 'Laut Tenang', type: 'steer', mode: 'sail', vessel: 'clipper', scene: 'research-sea', goal: 'Layarkan Mary Celeste ke pelabuhan lewat semua gerbang!',
        steer: { night: false, gateCount: 4, obstacle: 'rock' }, questions: { on: 'buoy', buoys: 2, count: 1 },
        story: [P('research-sea', 'Tiga pelaut Dei Gratia membawa Mary Celeste ke pelabuhan Gibraltar. Timmy ikut membantu!', 'Kapten Morehouse',
          [K('ship/maryceleste', 60, 52, 56, 0.5), K(CAP_BIN, 82, 74, 38, 0.9), T(18, 78, 34)])] },
      { id: 'maryceleste6', title: 'Latihan Sekoci', type: 'grid', scene: 'old-deck', fragment: true, goal: 'Ambil 2 pelampung, lalu kumpul di sekoci!',
        fact: 'Latihan keselamatan membuat semua orang tahu harus ke mana dan tetap bersama.', hint: 'Ambil kedua pelampung dulu, lalu ke tanda kuning.',
        story: [P('old-deck', 'Tidak ada yang tahu pasti ke mana awak Mary Celeste pergi. Pelajarannya: selalu latihan keselamatan dan tetap bersama.', 'Kapten Tua',
          [K(CAPT, 76, 72, 42, 0.9), K('tk-prop/lifebuoy-10', 48, 60, 14, 1.15), T(20, 78, 34)]),
          P('old-deck', 'Kompas Timmy bersinar! Ayo latihan sekoci sekali lagi sebelum pulang.', 'Timmy', [T(30, 76, 42), K(PENG, 70, 80, 24, 1)])],
        board: board(['S.#.', '.c..', '#..#', '.c.d'], 'E', PD, { theme: 'deck', blockArt: DECKB, itemArt: 'tk-prop/lifebuoy-10', par: 9 }) }
    ],
    outro: home('Kaca Pengamat', 'tk-prop/spyglass-4')
  }

  /* ── 5. SS Republic — panggilan radio CQD pertama yang terkenal (Minta Tolong dengan Tenang) ─── */
  var REPUBLIC = {
    id: 'republic', name: 'SS Republic', legend: ['ss-republic'], year: 1909, value: 'Minta Tolong dengan Tenang', cat: 'penyelamatan', color: '#2F6F8F', scene: 'harbor-morning',
    captain: { name: 'Operator Radio Jack', quote: 'Kalau butuh bantuan, minta tolong dengan tenang dan jelas.' }, guideArt: OFFICER,
    thumb: 'tk-prop/sealed-letter', isle: 'tk-world/lighthouse-island', fragmentName: 'Gelombang Radio', fragmentArt: 'tk-prop/searchlight',
    spec: { type: 'Kapal penumpang', length: '175 m', famous: 'Panggilan radio CQD yang menyelamatkan ratusan penumpang', quote: 'Minta tolong dengan tenang dan jelas.', verified: false },
    cards: C(['republic-1', 'Kapal Ber-radio', 'Tahun 1909 kapal Republic sudah punya radio. Saat itu radio di kapal masih hal baru.'],
      ['republic-2', 'Panggilan CQD', 'Dalam kabut tebal, kapal Florida menabrak sisi Republic. Operator radio Jack Binns mengirim panggilan minta tolong CQD berulang-ulang.'],
      ['republic-3', 'Kapal Baltic Datang', 'Kapal Baltic mendengar panggilan itu. Lebih dari 1.500 orang dipindahkan dengan selamat ke Baltic. Jack Binns disebut pahlawan.']),
    levels: [
      { id: 'republic1', title: 'Kapal Ber-radio', type: 'story', goal: 'Timmy naik kapal yang punya radio!',
        story: away('SS Republic', 1909).concat([
          P('harbor-morning', 'Pelabuhan New York, Januari 1909. Kapal Republic siap berlayar.', 'Timmy',
            [K('ship/republic', 60, 50, 64, 0.5), T(18, 78, 38)]),
          P('harbor-morning', 'Aku Jack, operator radio. Dengan radio, kapal bisa mengirim pesan jauh sekali!', 'Operator Radio Jack',
            [K(OFFICER, 74, 72, 44, 0.9), K('tk-prop/sealed-letter', 48, 60, 14, 1.15), T(20, 78, 36)]),
          P('research-sea', 'Pagi itu kabut tebal turun. Kapal lain, Florida, tidak terlihat dan menabrak sisi Republic.', 'Kapten Tua',
            [K(CAPT, 76, 72, 42, 0.9), K(PENG, 54, 82, 22, 1.05), T(20, 78, 34)]),
          P('research-sea', 'Semua orang tetap tenang, memakai pelampung, dan berkumpul di dek. Jack segera ke ruang radio.', 'Timmy',
            [K('tk-prop/life-vest', 48, 62, 16, 1.1), K(GIRL_BOOK, 74, 76, 32, 0.95), T(20, 78, 36)])]) },
      { id: 'republic2', title: 'Sinyal CQD', type: 'quiz', domain: 'logika', count: 4, scene: 'harbor-morning', goal: 'Lanjutkan pola sinyal radio: pendek dan panjang!',
        story: [P('harbor-morning', 'Jack mengetuk sinyal pendek dan panjang: C-Q-D, artinya tolong! Bantu Jack menyusun polanya.', 'Operator Radio Jack',
          [K(OFFICER, 74, 72, 42, 0.9), T(20, 78, 36)])] },
      { id: 'republic3', title: 'Menembus Kabut', type: 'steer', mode: 'gates', vessel: 'liner', scene: 'research-sea', goal: 'Ikuti pelampung lampu menembus kabut!',
        steer: { night: true, gateCount: 4, obstacle: 'rock' }, questions: { on: 'gate', gates: 1, count: 1 },
        story: [P('research-sea', 'Kapal Baltic mendengar panggilan itu dan datang menolong. Kemudikan Baltic lewat pelampung lampu!', 'Kapten Tua',
          [K(CAP_BIN, 76, 72, 42, 0.9), K('tk-prop/buoy-light', 46, 62, 16, 1.1), T(20, 78, 34)])] },
      { id: 'republic4', title: 'Antar Penumpang', type: 'grid', scene: 'research-sea', goal: 'Jemput 2 penumpang, lalu antar ke kapal Baltic!',
        fact: 'Sekoci bolak-balik membawa penumpang dari Republic ke Baltic.', hint: 'Jemput kedua penumpang dulu, lalu ke tanda kuning.',
        story: [P('research-sea', 'Kabut masih tebal! Pelampung lampu menerangi laut di sekitarnya. Sekoci menjemput penumpang satu per satu, tenang dan tertib.', 'Operator Radio Jack',
          [K('tk-prop/rowboat', 50, 66, 22, 1.05), K(OFFICER, 78, 72, 38, 0.9), T(20, 78, 34)])],
        board: board(['S.c.#', '#..c.', '..#..', 'd.TL.'], 'E', PD, { blockArt: ['tk-world/arch-rock', 'gt-el/boulders'], itemArt: 'tk-char/explorer-kid', par: 12, fog: true, qTopic: 'umum' }) },
      { id: 'republic5', title: 'Kursi Sekoci', type: 'sort', domain: 'matematika', scene: 'research-sea', goal: 'Tiap sekoci muat 5 orang. Keluarga tetap bersama!',
        story: [P('research-sea', 'Tiap sekoci muat 5 orang. Isi dengan adil, dan keluarga tetap bersama!', 'Kapten Tua',
          [K(CAPT, 76, 72, 42, 0.9), K('tk-prop/lifeboat', 46, 64, 20, 1.1), T(20, 78, 34)])] },
      { id: 'republic6', title: 'Semua Aman', type: 'lanes', difficulty: 1, seed: 1909, night: false, domain: 'campur', scene: 'harbor-morning', fragment: true,
        goal: 'Antar Baltic ke New York. Ambil pelampung soal!', questions: { on: ['collide', 'buoy', 'gate'], buoys: 2, gates: 1, count: 2 }, lengthScale: 2.2,
        sections: [{ kind: 'open', title: 'Semua di Baltic', sub: 'Kumpulkan bintang di jalurmu!' }, { kind: 'sparse', title: 'Pelampung Soal', sub: 'Jawab soal di pelampung bercahaya.' },
          { kind: 'more', title: 'Menuju New York', sub: 'Pindah jalur, hindari rintangan.' }],
        story: [P('harbor-morning', 'Lebih dari 1.500 orang dipindahkan dengan selamat ke Baltic. Jack Binns disebut pahlawan!', 'Timmy',
          [K('ship/republic', 60, 50, 50, 0.5), K(OFFICER, 80, 74, 36, 0.9), T(18, 78, 34)]),
          P('harbor-morning', 'Pelajarannya: minta tolong dengan tenang dan jelas. Kompas Timmy bersinar! Antar Baltic ke New York dulu.', 'Kapten Tua',
            [K(CAPT, 76, 72, 42, 0.9), K('game/compass', 48, 40, 16, 1.2), T(22, 78, 36)])] }
    ],
    outro: home('Gelombang Radio', 'tk-prop/searchlight')
  }

  /* ── 6. RMS Carpathia — kapal penolong Titanic (Sigap Menolong) ─── */
  var CARPATHIA = {
    id: 'carpathia', name: 'RMS Carpathia', legend: ['carpathia'], year: 1912, value: 'Sigap Menolong', cat: 'penyelamatan', color: '#A8432E', scene: 'rescue-dawn',
    captain: { name: 'Kapten Rostron', quote: 'Kalau ada yang butuh bantuan, kita datang secepat mungkin.' }, guideArt: CAPT,
    thumb: 'tk-prop/blanket-navy', isle: 'tk-world/sunset-sea', fragmentName: 'Lentera Fajar', fragmentArt: 'tk-prop/lantern-4',
    spec: { type: 'Kapal penumpang', length: '164 m', famous: 'Menembus malam berbahaya untuk menjemput sekoci Titanic', quote: 'Sigap menolong, tenang bekerja.', verified: false },
    cards: C(['carpathia-1', 'Panggilan Malam', 'Malam 15 April 1912, operator radio Carpathia mendengar panggilan minta tolong dari Titanic. Kapten Rostron langsung memutar kapal.'],
      ['carpathia-2', 'Secepat Mungkin', 'Semua tenaga kapal dipakai untuk mesin. Awak berjaga melihat es, dan menyiapkan selimut, sup, serta minuman hangat.'],
      ['carpathia-3', '705 Orang', 'Pagi harinya Carpathia menjemput 705 orang dari sekoci-sekoci, lalu membawa mereka ke New York.']),
    levels: [
      { id: 'carpathia1', title: 'Panggilan Malam', type: 'story', goal: 'Carpathia mendengar panggilan minta tolong.',
        story: away('RMS Carpathia', 1912).concat([
          P('night-ocean', 'Tengah malam. Di ruang radio Carpathia, operator Harold mendengar panggilan minta tolong!', 'Timmy',
            [K(OFF_BIN, 74, 72, 44, 0.9), K('tk-prop/sealed-letter', 48, 60, 14, 1.15), T(20, 78, 36)]),
          P('night-ocean', 'Putar kapal! Kita pergi menolong, secepat mungkin!', 'Kapten Rostron',
            [K(CAPT, 74, 70, 50, 0.9), K(PENG, 50, 82, 22, 1.05), T(20, 78, 36)]),
          P('night-ocean', 'Pemanas kapal dihentikan. Semua tenaga dipakai untuk mesin, supaya kapal melaju kencang.', 'Kapten Rostron',
            [K('ship/carpathia', 58, 52, 62, 0.5), K(MECH, 84, 76, 32, 0.95)])]) },
      { id: 'carpathia2', title: 'Menembus Malam', type: 'lanes', difficulty: 2, seed: 1204, night: true, domain: 'campur', scene: 'night-ocean',
        goal: 'Melaju menembus malam. Hindari es, pindah jalur!', questions: { on: ['collide', 'buoy', 'gate'], buoys: 2, gates: 1, count: 3 }, lengthScale: 2.5,
        sections: [{ kind: 'open', title: 'Putar Haluan', sub: 'Carpathia berbalik menuju sekoci.' }, { kind: 'sparse', title: 'Es di Malam Hari', sub: 'Awak berjaga melihat es.' },
          { kind: 'more', title: 'Hampir Sampai', sub: 'Lihat lampu hijau sekoci!' }],
        story: [P('night-ocean', 'Laut malam penuh es. Awak berjaga di depan kapal. Pindah jalur untuk menghindar!', 'Kapten Rostron',
          [K(CAP_BIN, 76, 72, 42, 0.9), K('tk-prop/iceberg-5', 40, 64, 24, 0.6), T(18, 78, 34)])] },
      { id: 'carpathia3', title: 'Jemput Sekoci', type: 'grid', scene: 'rescue-dawn', goal: 'Jemput 3 sekoci, lalu kembali ke Carpathia!',
        fact: 'Sekoci terakhir naik ke Carpathia sekitar pukul 8.30 pagi.', hint: 'Jemput sekoci satu per satu, lalu ke tanda kuning.',
        story: [P('rescue-dawn', 'Fajar tiba. Sekoci-sekoci terlihat di antara es. Jemput satu per satu, ya!', 'Kapten Rostron',
          [K(CAPT, 78, 72, 42, 0.9), K('tk-prop/lifeboat', 46, 64, 20, 1.1), T(20, 78, 34)])],
        board: board(['Sc.#', '#.cT', '..#c', '...d'], 'E', PD, { blockArt: ICE, itemArt: 'tk-prop/lifeboat', par: 10, qTopic: 'matematika' }) },
      { id: 'carpathia4', title: 'Selimut & Minuman Hangat', type: 'sort', domain: 'umum', scene: 'rescue-dawn', goal: 'Siapkan selimut dan minuman hangat untuk penumpang!',
        story: [P('rescue-dawn', 'Penumpang sekoci kedinginan. Koki menyiapkan sup dan minuman hangat, awak membawa selimut.', 'Koki Kapal',
          [K(CHEF, 76, 72, 42, 0.9), K('tk-prop/blanket-navy', 46, 64, 18, 1.1), T(20, 78, 34)])] },
      { id: 'carpathia5', title: 'Menghitung Sekoci', type: 'quiz', domain: 'umum', count: 4, scene: 'rescue-dawn', goal: 'Hitung sekoci yang dijemput kapal penolong!',
        story: [P('rescue-dawn', 'Kapten ingin tahu: berapa sekoci yang sudah naik? Bantu menghitung!', 'Kapten Rostron',
          [K(CAPT, 76, 72, 42, 0.9), K(GIRL_TAB, 50, 78, 30, 1), T(20, 78, 34)])] },
      { id: 'carpathia6', title: 'Menuju New York', type: 'steer', mode: 'gates', vessel: 'liner', scene: 'rescue-dawn', fragment: true,
        goal: 'Bawa semua penumpang ke New York lewat semua gerbang!',
        steer: { night: false, gateCount: 4 }, questions: { on: 'buoy', buoys: 2, count: 1 },
        story: [P('rescue-dawn', '705 orang kini aman dan hangat di Carpathia. Kapten Rostron mendapat medali karena sigap menolong.', 'Timmy',
          [K('ship/carpathia', 58, 50, 58, 0.5), K(CAPT, 82, 74, 38, 0.9), T(18, 78, 34)]),
          P('rescue-dawn', 'Kompas Timmy bersinar! Antar penumpang ke New York, lalu kita pulang.', 'Kapten Rostron',
            [K(CAPT, 76, 72, 42, 0.9), K('game/compass', 48, 40, 16, 1.2), T(22, 78, 36)])] }
    ],
    outro: home('Lentera Fajar', 'tk-prop/lantern-4')
  }

  // chronological; appended after Pelabuhan Waktu so no existing world changes index
  var NEW = [MARYROSE, QUEENANNE, EREBUS, MARYCELESTE, REPUBLIC, CARPATHIA]

  /* ── ship art slots: owner crop when indexed, else the closest existing ship sprite ── */
  var SIDE = { maryrose: 'mary-rose', queenanne: 'queen-annes-revenge', erebus: 'hms-erebus', maryceleste: 'mary-celeste', republic: 'ss-republic', carpathia: 'carpathia' }
  var STANDIN = { maryrose: 'tk-ship3/spanish-galleon-clean', queenanne: 'tk-ship2/blackbeard-clean', erebus: 'tk-ship3/hms-beagle-clean',
    maryceleste: 'tk-ship3/flying-cloud-clean', republic: 'tk-ship3/ss-rotterdam-clean', carpathia: 'tk-ship3/ss-great-eastern-clean' }
  function shipKey (id) {
    var own = 'tk-legend-side/' + SIDE[id]
    return (W.AssetIndex && W.AssetIndex.path && W.AssetIndex.path(own)) ? own : STANDIN[id]
  }
  function artSlots () {
    if (!W.TKArt || !W.TKArt.OVERRIDE) return false
    NEW.forEach(function (w) { W.TKArt.OVERRIDE['ship/' + w.id] = 'assets/db/lib/' + shipKey(w.id) + '.webp' })
    return true
  }

  /* ── themed sort sets + a few curated questions (TKQuestions) ── */
  function S (k, label, bin) { return { id: k.replace(/\W+/g, '-'), label: label, sprite: k, bin: bin } }
  var SORTS = [
    { id: 'so-maryrose', domain: 'umum', world: 'maryrose', prompt: 'Benda ini untuk musik, kerja, atau makan?',
      bins: [{ id: 'musik', label: 'Alat Musik', sprite: 'toys/drum' }, { id: 'kerja', label: 'Alat Kerja', sprite: 'tk-prop/rope-coil' }, { id: 'makan', label: 'Alat Makan', sprite: 'tk-prop/dinner-plate' }],
      items: [S('toys/drum', 'Gendang', 'musik'), S('tk-prop/violin', 'Biola', 'musik'), S('tk-prop/violin-2', 'Biola kecil', 'musik'),
        S('tk-prop/whistle', 'Peluit', 'kerja'), S('tk-prop/compass', 'Kompas', 'kerja'), S('tk-prop/lantern', 'Lentera', 'kerja'), S('tk-prop/rope-coil-2', 'Tali', 'kerja'),
        S('tk-prop/dinner-plate', 'Piring', 'makan'), S('tk-prop/dinner-plate-2', 'Piring besar', 'makan'), S('food/bread', 'Roti', 'makan')] },
    { id: 'so-queenanne', domain: 'umum', world: 'queenanne', prompt: 'Pilah harta untuk museum: perhiasan atau alat kapal?',
      bins: [{ id: 'harta', label: 'Perhiasan', sprite: 'game/crown-jewel' }, { id: 'alat', label: 'Alat Kapal', sprite: 'tk-prop/anchor-4' }],
      items: [S('game/crown-jewel', 'Mahkota', 'harta'), S('game/gem-blue', 'Permata biru', 'harta'), S('game/gem-green', 'Permata hijau', 'harta'), S('tk-prop/necklace-box', 'Kalung', 'harta'),
        S('tk-prop/ship-bell-2', 'Lonceng', 'alat'), S('tk-prop/anchor-4', 'Jangkar', 'alat'), S('tk-prop/sextant-4', 'Sekstan', 'alat'), S('tk-prop/compass-2', 'Kompas', 'alat')] },
    { id: 'so-erebus', domain: 'umum', world: 'erebus', prompt: 'Bekal perjalanan: makanan, penghangat, atau untuk belajar?',
      bins: [{ id: 'makan', label: 'Makanan', sprite: 'food/bread' }, { id: 'hangat', label: 'Penghangat', sprite: 'tk-prop/blanket' }, { id: 'belajar', label: 'Belajar', sprite: 'school/books' }],
      items: [S('food/bread', 'Roti', 'makan'), S('food/carrot', 'Wortel', 'makan'), S('food/cheese', 'Keju', 'makan'),
        S('tk-prop/blanket', 'Selimut', 'hangat'), S('tk-prop/blanket-2', 'Selimut tebal', 'hangat'), S('tk-prop/lantern-2', 'Lentera', 'hangat'),
        S('school/books', 'Buku', 'belajar'), S('tk-prop/sextant', 'Sekstan', 'belajar'), S('tk-prop/nautical-chart', 'Peta laut', 'belajar')] },
    { id: 'so-maryceleste', domain: 'matematika', world: 'maryceleste', prompt: 'Pisahkan tong muatan dan bekal makanan!',
      bins: [{ id: 'tong', label: 'Tong Muatan', sprite: 'game/barrel' }, { id: 'bekal', label: 'Bekal Makanan', sprite: 'food/bread' }],
      items: [S('game/barrel', 'Tong', 'tong'), S('tk-prop/barrel', 'Tong kayu', 'tong'), S('tk-prop/water-barrel', 'Tong air', 'tong'), S('tk-prop/water-barrel-2', 'Tong besar', 'tong'),
        S('food/bread', 'Roti', 'bekal'), S('food/apple', 'Apel', 'bekal'), S('food/cheese', 'Keju', 'bekal'), S('food/milk', 'Susu', 'bekal')] },
    { id: 'so-republic', domain: 'matematika', world: 'republic', prompt: 'Tiap sekoci muat 5 orang. Naikkan semua keluarga. Keluarga tetap bersama!',
      bins: [{ id: 's1', label: 'Sekoci 1', cap: 5 }, { id: 's2', label: 'Sekoci 2', cap: 5 }], capacity: true, items: [] },
    { id: 'so-carpathia', domain: 'umum', world: 'carpathia', prompt: 'Siapkan untuk penumpang: selimut atau minuman hangat?',
      bins: [{ id: 'selimut', label: 'Selimut', sprite: 'tk-prop/blanket-navy' }, { id: 'minum', label: 'Minuman Hangat', sprite: 'food/mug' }],
      items: [S('tk-prop/blanket', 'Selimut', 'selimut'), S('tk-prop/blanket-2', 'Selimut tebal', 'selimut'), S('tk-prop/blanket-navy', 'Selimut biru', 'selimut'),
        S('food/mug', 'Cangkir', 'minum'), S('tk-prop/teacup', 'Teh hangat', 'minum'), S('tk-prop/teacup-2', 'Cangkir teh', 'minum'), S('things/cooking-pot', 'Sup hangat', 'minum')] }
  ]
  // [id, domain, world, prompt, choices (answer first), explain, hint1, hint2, visual?]
  var QS = [
    ['lg-rp1', 'logika', 'republic', 'Pola sinyal: pendek, panjang, pendek, panjang, …', ['pendek', 'panjang', 'diam'], 'Polanya bergantian: pendek, panjang, pendek, panjang, lalu pendek.', 'Lihat bunyi yang berulang.', 'Sesudah panjang datang…'],
    ['lg-rp2', 'logika', 'republic', 'Pola sinyal: panjang, panjang, pendek, panjang, panjang, …', ['pendek', 'panjang', 'diam'], 'Dua panjang lalu satu pendek, berulang.', 'Hitung: dua panjang, lalu…', 'Sesudah dua panjang datang satu…'],
    ['lg-rp3', 'logika', 'republic', 'Pola sinyal: pendek, pendek, panjang, pendek, pendek, …', ['panjang', 'pendek', 'diam'], 'Dua pendek lalu satu panjang, berulang.', 'Hitung: dua pendek, lalu…', 'Sesudah dua pendek datang satu…'],
    ['um-rp1', 'umum', 'republic', 'Kapal minta tolong lewat…', ['Radio', 'Layang-layang', 'Surat'], 'Radio mengirim pesan jauh dengan cepat.', 'Alat ini bisa mengirim suara jauh.', 'Operator radio memakainya.'],
    ['um-rp2', 'umum', 'republic', 'Kalau tersesat, kita minta tolong kepada…', ['Petugas', 'Kucing', 'Pohon'], 'Petugas bisa membantu kita dengan aman.', 'Orang yang bertugas membantu.', 'Ia memakai seragam.'],
    ['um-qa1', 'umum', 'queenanne', 'Kamu menemukan mainan teman. Sebaiknya…', ['Dikembalikan', 'Disembunyikan', 'Dibuang'], 'Barang milik teman kita kembalikan. Itu jujur.', 'Mainan itu milik siapa?', 'Anak jujur mengembalikannya.'],
    ['um-qa2', 'umum', 'queenanne', 'Temanmu tidak punya bekal. Kita…', ['Berbagi', 'Mengejek', 'Diam saja'], 'Berbagi membuat teman senang.', 'Apa yang dilakukan teman baik?', 'Bekalnya bisa dibagi dua.'],
    ['um-qa3', 'umum', 'queenanne', 'Harta dari dasar laut sebaiknya disimpan di…', ['Museum', 'Saku sendiri', 'Tong sampah'], 'Di museum semua orang bisa melihat dan belajar.', 'Tempat semua orang bisa melihatnya.', 'Ada banyak benda kuno di sana.'],
    ['um-mc1', 'umum', 'maryceleste', 'Saat latihan keselamatan, kita…', ['Tetap bersama', 'Pergi sendiri', 'Bersembunyi'], 'Saat latihan kita tetap bersama dan mengikuti petugas.', 'Jangan berpisah dari kelompok.', 'Bersama itu lebih aman.'],
    ['um-mc2', 'umum', 'maryceleste', 'Sebelum naik perahu, kita memakai…', ['Pelampung', 'Topi pesta', 'Sandal'], 'Pelampung membuat kita tetap mengapung.', 'Lihat gambarnya.', 'Warnanya oranye.', ['tk-prop/life-vest']],
    ['um-cp1', 'umum', 'carpathia', 'Teman kedinginan. Kita beri…', ['Selimut', 'Es krim', 'Kipas'], 'Selimut membuat badan hangat.', 'Benda yang membuat hangat.', 'Lihat gambarnya.', ['tk-prop/blanket']],
    ['um-cp2', 'umum', 'carpathia', 'Ada yang butuh bantuan. Kita…', ['Segera membantu', 'Pura-pura tidak lihat', 'Tertawa'], 'Menolong dengan sigap itu baik.', 'Apa yang dilakukan penolong?', 'Seperti kapal Carpathia.'],
    ['um-eb1', 'umum', 'erebus', 'Belum berhasil menemukan sesuatu? Kita…', ['Coba lagi', 'Menyerah', 'Marah'], 'Tekun mencari membuat kita berhasil.', 'Jangan berhenti.', 'Seperti para pencari kapal.'],
    ['um-eb2', 'umum', 'erebus', 'Es terasa…', ['Dingin', 'Panas', 'Manis'], 'Es itu dingin.', 'Lihat gambarnya.', 'Es ada di kutub.', ['game/crystal-ice']],
    ['um-mr1', 'umum', 'maryrose', 'Benda tua yang rapuh dipegang dengan…', ['Hati-hati', 'Kasar', 'Terburu-buru'], 'Benda rapuh mudah pecah, jadi kita pegang dengan hati-hati.', 'Supaya tidak pecah.', 'Pelan-pelan saja.'],
    ['um-mr2', 'umum', 'maryrose', 'Penyelam memakai ini untuk bernapas…', ['Tabung udara', 'Payung', 'Sepatu'], 'Tabung udara berisi udara untuk bernapas di bawah air.', 'Lihat gambarnya.', 'Dibawa di punggung.', ['tk-char/diver-bearded']]
  ]
  function bankParts () {
    var Q = W.TKQuestions; if (!Q || !Q.sorts || !Q.items) return false
    var have = {}; Q.sorts.forEach(function (s) { have[s.id] = 1 })
    SORTS.forEach(function (s) { if (!have[s.id]) Q.sorts.push(s) })
    var hq = {}; Q.items.forEach(function (o) { hq[o.id] = 1 })
    QS.forEach(function (r) {
      if (hq[r[0]]) return
      var o = { id: r[0], domain: r[1], world: r[2], level: 1, grade: 2, prompt: r[3], choices: r[4].slice(), answer: r[4][0], explain: r[5], hint1: r[6], hint2: r[7] }
      if (r[8]) o.visual = r[8].slice()
      Q.items.push(o)
    })
    return true
  }

  /* ── append the worlds + everything a normal world gets from tk-worlds.js ── */
  NEW.forEach(function (w) { w.ship = 'ship/' + w.id; w.series = 'legenda' })
  var EASY_GRIDS = 3
  NEW.forEach(function (w) {
    var g = 0, st = 0
    w.levels.forEach(function (lv) {
      lv.legend = true
      if (lv.type === 'grid') { lv.gridNo = ++g; if (lv.board && lv.board.easy == null) lv.board.easy = g <= EASY_GRIDS }
      if (lv.type === 'steer') lv.steerNo = ++st
      if (lv.story && lv.story.length && !lv.story[0].scene) lv.story[0].scene = lv.scene || w.scene
    })
  })
  // no world may be appended twice (ids are the save keys)
  var ids = {}; TKW.WORLDS.forEach(function (w) { ids[w.id] = 1 })
  NEW.forEach(function (w) { if (!ids[w.id]) TKW.WORLDS.push(w) })
  if (TKW.CATS && !TKW.CATS.some(function (c) { return c[0] === 'penyelamatan' })) TKW.CATS.push(['penyelamatan', 'Penyelamatan'])
  // TKSteer extras (night, gateCount, obstacle, length…) ride on lv.steer; the host only asks TKWorlds.steer
  var baseSteer = TKW.steer
  TKW.steer = function (lv) {
    var o = baseSteer(lv)
    if (lv && lv.legend && lv.steer) for (var k in lv.steer) if (!(k in o)) o[k] = lv.steer[k]
    return o
  }
  TKW.LEGENDS = { WORLDS: NEW, SORTS: SORTS, QUESTIONS: QS, SIDE: SIDE, STANDIN: STANDIN, shipKey: shipKey, version: '1.0.0' }

  var ok1 = artSlots(), ok2 = bankParts()
  if ((!ok1 || !ok2) && W.document && W.document.addEventListener) {
    W.document.addEventListener('DOMContentLoaded', function () { if (!ok1) artSlots(); if (!ok2) bankParts() })
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = TKW.LEGENDS
})()
