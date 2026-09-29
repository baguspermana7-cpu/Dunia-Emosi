/* ============================================================================
 * tk-worlds.js — window.TKWorlds. Timmy & Kapal Legendaris: worlds, levels, story.
 * PRD: documentation and standarization/TIMMY_LEGENDARY_SHIPS_PRD_v2.md
 *
 * Every world is DATA over a few level types (story · quiz · grid · steer · sort · cutscene ·
 * fragment). Grid boards are written as text so a person can read and check them:
 *   '.' water   '#' iceberg/rock   'S' start (dir from `dir`)   'G' goal   'c' crate to pick
 *   'd' drop spot   '>' '<' '^' 'v' current pushing that way
 * `TKWorlds.grid(level)` turns a board into a TKGrid definition.
 * Story panels: { scene, caption, speaker?, layers:[{k, x, y, s, d}] } — `scene` is a key in
 * TKArt.scenes (code-drawn backdrop until the owner's art arrives), `k` a sprite/art key,
 * x/y in % of the panel, s = size in % of panel height, d = parallax depth (0.08 … 1.2).
 * Child safety (PRD §0): tragedy is told calmly, from a distance, never as a failure.
 * ==========================================================================*/
(function () {
  'use strict'
  var W = (typeof window !== 'undefined' ? window : globalThis)

  function board (rows, dir, tools, extra) { var o = { rows: rows, dir: dir || 'E', tools: tools || ['N', 'E', 'S', 'W'], theme: 'sea' }; for (var k in extra || {}) o[k] = extra[k]; return o }
  function P (scene, caption, speaker, layers) { return { scene: scene, caption: caption, speaker: speaker || null, layers: layers || [] } }
  var TIMMY = 'char/timmy'
  // grid obstacle sprites (owner sheets): sea boards = icebergs, rocky coasts = arch rock, decks = cargo (never cannons)
  var ICE = ['tk-prop/iceberg-5', 'tk-world/iceberg-2', 'tk-prop/iceberg-3']
  var ROCK = ['tk-world/arch-rock']
  var BARRELS = ['tk-prop/barrel', 'tk-prop/barrels', 'tk-prop/water-barrel']
  var CAPT = 'char/captain'
  /* route-logic grid levels with a scenario (owner 2026-09-29: "more right/left/down logic on the grid, across
     several scenarios"). gl(id, title, mission, rows, o): o.scene backdrop · o.who speaker of the one-panel intro
     (the old human captain; Timmy in his bedroom) · o.say the scenario line · o.fact a fun fact (said in the intro,
     also the penguin tip) · o.pic the intro sprite (who is rescued / what is delivered) · o.blk obstacle sprites ·
     o.item cargo sprite · o.deck deck theme · o.tools · o.dir · o.ice moving ice · o.par = the TRUE shortest
     route (3 stars; tools/qa-tk-grid-levels.mjs proves it with its own solver) · o.max route slots. */
  function gl (id, title, mission, rows, o) {
    var who = o.who || 'Kapten', pic = o.pic || o.item
    var layers = who === 'Timmy' ? [{ k: TIMMY, x: 26, y: 78, s: 42, d: 1 }] : [{ k: CAPT, x: 76, y: 74, s: 44, d: 0.9 }, { k: TIMMY, x: 20, y: 78, s: 36, d: 1 }]
    if (pic) layers.push({ k: pic, x: 50, y: 64, s: 20, d: 1.15 })
    var ex = { theme: o.deck ? 'deck' : 'sea', blockArt: o.blk, par: o.par }
    if (o.item) ex.itemArt = o.item
    if (o.ice) ex.ice = o.ice
    if (o.max) ex.maxLen = o.max
    return { id: id, title: title, type: 'grid', goal: mission, scene: o.scene, fact: o.fact, hint: o.hint, added: '2026-09-29',
      story: [P(o.scene, o.say + ' Tahukah kamu? ' + o.fact, who, layers)],
      board: board(rows, o.dir || 'E', o.tools || (o.item ? ['N', 'E', 'S', 'W', 'P', 'D'] : null), ex) }
  }
  var PD = ['N', 'E', 'S', 'W', 'P', 'D'], PK = ['N', 'E', 'S', 'W', 'P']

  /* ── World 0: Timmy's bedroom (tutorial + time corridor) ───────────────── */
  var INTRO = [
    P('bedroom-night', 'Timmy tertidur saat membaca buku tentang kapal-kapal legendaris…', null,
      [{ k: 'tk-legend/bedroom', x: 50, y: 96, s: 70, d: 0.6 }, { k: 'char/timmy-sleeping', x: 36, y: 86, s: 46, d: 0.85 }, { k: 'nature/moon-stars', x: 66, y: 26, s: 14, d: 0.1 }]),
    P('bedroom-portal', 'Tengah malam… sebuah pusaran cahaya muncul di kamarnya!', 'Timmy',
      [{ k: 'tk-legend/bedroom', x: 34, y: 98, s: 58, d: 0.6 }, { k: 'fx/portal', x: 70, y: 62, s: 62, d: 0.4 }, { k: TIMMY, x: 25, y: 90, s: 46, d: 0.9 }]),
    P('bedroom-portal', 'Kompas Timmy menyala. "Wah… apa itu? Pintu waktu di kamarku!"', 'Timmy',
      [{ k: 'fx/portal', x: 68, y: 45, s: 76, d: 0.4 }, { k: 'game/compass', x: 40, y: 55, s: 18, d: 1.2 }, { k: TIMMY, x: 22, y: 72, s: 44, d: 0.9 }]),
    P('time-tunnel', 'Timmy tertarik masuk ke lorong waktu yang berputar-putar!', null,
      [{ k: 'char/timmy-flying', x: 50, y: 62, s: 48, d: 1 }, { k: 'vehicles/sailboat', x: 20, y: 25, s: 14, d: 0.3 }, { k: 'game/treasure-map', x: 80, y: 70, s: 14, d: 0.6 }]),
    P('harbor-dawn', 'Ia tiba di sebuah pelabuhan… kapal raksasa berdiri di depannya.', 'Timmy',
      [{ k: 'ship/titanic', x: 62, y: 52, s: 70, d: 0.6 }, { k: TIMMY, x: 20, y: 76, s: 40, d: 1 }]),
    P('harbor-dawn', 'Seorang kapten tersenyum: "Tiap kapal menyimpan satu kepingan Kompas Waktu. Kumpulkan semuanya, dan kamu bisa pulang."', 'Kapten',
      [{ k: 'char/captain', x: 72, y: 70, s: 44, d: 0.9 }, { k: TIMMY, x: 25, y: 74, s: 40, d: 1 }, { k: 'game/compass', x: 50, y: 40, s: 16, d: 1.2 }])
  ]

  var BEDROOM = {
    id: 'kamar', name: 'Kamar Timmy', ship: null, value: 'Awal petualangan', cat: 'awal', color: '#5B6BD6', scene: 'bedroom-night',
    captain: { name: 'Timmy', quote: 'Ayo belajar memberi perintah pada perahu!' },
    levels: [
      { id: 'k1', title: 'Mimpi Misterius', type: 'story', story: INTRO },
      { id: 'k2', title: 'Perahu Mainan', type: 'grid', goal: 'Bawa perahu mainan ke bendera!', board: board(['S...G']) },
      { id: 'k3', title: 'Belok!', type: 'grid', goal: 'Belok untuk sampai ke bendera.', board: board(['S..', '..#', '..G'], 'E', null, { blockArt: ICE }) },
      gl('k5', 'Bendera Jatuh', 'Bendera perahu jatuh! Ambil, lalu berlayar ke mercusuar.', ['S.#.', '.c..', '#..G', '....'],
        { scene: 'bedroom-night', who: 'Timmy', say: 'Aduh, bendera perahu mainanku jatuh ke air! Ayo ambil dulu.', item: 'game/flag-red', tools: PK,
          blk: ['tk-prop/books-ocean', 'game/crate-wood', 'tk-legend/journal-book'], par: 6,
          fact: 'Kapal sungguhan memasang bendera supaya kapal lain tahu dari negara mana ia datang.', hint: 'Ambil bendera dulu, lalu ke mercusuar.' }),
      { id: 'k4', title: 'Lorong Waktu', type: 'quiz', domain: 'logika', count: 3, scene: 'time-tunnel', goal: 'Buka lorong waktu dengan menjawab 3 teka-teki!' }
    ]
  }

  /* ── World 1: RMS Titanic — ONE continuous 10-chapter journey (owner mockup ui-12, PRD v2 §13) ──
     Each level is a CHAPTER ({type:'chapter', steps:[…]}); a step is any level type (story · quiz · sort ·
     grid · lanes · cinema · reflection · fragment) and plays inside the chapter without leaving the play
     screen. The old t1–t13 levels live on as steps (`from`: the old level id, used by the save migration):
     t1 → c2 quiz · t2 → c3 quiz · t4 → c4 grid · t5 → c4 quiz · t7 → c5 lanes · t8 → c6 lanes + cinema ·
     t10 → c7 grid · t11 → c8 sort · t12 → c9 cinema · t13 → c10.
     The free-steering levels t3 / t6 are replaced by the three-lane navigation (tk-lanes). Child safety
     (PRD §0): the collision is scripted, Timmy is in the lifeboat before the ship breaks, no people on
     the sinking ship, the ending is the rescue at dawn and what we learn. */
  var DECK = ['tk-prop/crate-plain', 'tk-prop/barrels', 'tk-char/officer-boy', 'tk-prop/crate-titanic', 'tk-prop/rope-coil']
  var CAPTAIN = 'char/captain'
  var TITANIC = {
    id: 'titanic', name: 'RMS Titanic', ship: 'ship/titanic', year: 1912, value: 'Keberanian & Kebaikan', cat: 'tragedi', color: '#1F5FA8', scene: 'harbor-dawn',
    chapters: true, mapTitle: 'Peta Bab', mapSub: 'Perjalanan Ilmu dan Keberanian',
    mapFoot: 'Selesaikan tiap bab untuk membuka ilmu, lencana, dan kisah baru!',
    captain: { name: 'Kapten Smith', quote: 'Mari lakukan yang terbaik, dan baik kepada semua orang di kapal.' },
    cards: [
      { id: 'titanic-1', title: 'Kapal Terbesar', text: 'Titanic berlayar pertama kali pada April 1912 dari Southampton, Inggris, menuju New York. Saat itu ia kapal penumpang terbesar di dunia.' },
      { id: 'titanic-2', title: 'Sekoci', text: 'Titanic membawa 20 sekoci. Sejak kejadian Titanic, setiap kapal wajib membawa sekoci yang cukup untuk semua orang.' },
      { id: 'titanic-3', title: 'Pelajaran Berharga', text: 'Kisah Titanic mengajarkan kita untuk berhati-hati, saling menolong, dan mendengarkan peringatan.' }
    ],
    levels: [
      { id: 'c1', no: 1, type: 'chapter', title: 'Mimpi', sub: 'Pengenalan', scene: 'harbor-dawn', pic: 'tk-key/timmy-sleeping', picScene: 'bedroom-night',
        goal: 'Timmy tiba di kapal Titanic. Dengarkan sambutan Kapten!',
        steps: [
          { id: 'c1a', type: 'story', title: 'Mimpi Timmy', goal: 'Timmy bermimpi tentang kapal legendaris.',
            story: [P('bedroom-night', 'Malam itu Timmy membaca buku tentang kapal Titanic… lalu tertidur.', null,
              [{ k: 'tk-legend/bedroom', x: 50, y: 96, s: 70, d: 0.6 }, { k: 'char/timmy-sleeping', x: 36, y: 86, s: 46, d: 0.85 }, { k: 'nature/moon-stars', x: 66, y: 26, s: 14, d: 0.1 }]),
            P('time-tunnel', 'Kompasnya bersinar! Lorong waktu membawa Timmy ke tahun 1912.', null,
              [{ k: 'char/timmy-flying', x: 50, y: 62, s: 48, d: 1 }, { k: 'game/compass', x: 78, y: 30, s: 16, d: 0.4 }]),
            P('harbor-dawn', 'Ia tiba di pelabuhan. Di depannya berdiri kapal raksasa: RMS Titanic!', 'Timmy',
              [{ k: 'ship/titanic', x: 62, y: 52, s: 70, d: 0.6 }, { k: TIMMY, x: 20, y: 76, s: 40, d: 1 }])] },
          { id: 'c1b', type: 'story', title: 'Sambutan Kapten', goal: 'Dengarkan sambutan Kapten Smith.',
            story: [P('harbor-dawn', 'Selamat datang di kapal, penjelajah muda! Ini RMS Titanic. Bersama-sama kita akan menjelajah, belajar hal baru, dan menghadapi tantangan seru. Kamu siap?', 'Kapten Smith',
              [{ k: CAPTAIN, x: 70, y: 72, s: 50, d: 0.9 }, { k: TIMMY, x: 25, y: 76, s: 40, d: 1 }]),
            P('harbor-dawn', 'Siap, Kapten! Aku akan belajar dan menolong semua orang di kapal.', 'Timmy',
              [{ k: CAPTAIN, x: 72, y: 72, s: 46, d: 0.9 }, { k: TIMMY, x: 28, y: 76, s: 44, d: 1 }, { k: 'game/compass', x: 50, y: 34, s: 14, d: 1.2 }])] }
        ] },
      { id: 'c2', no: 2, type: 'chapter', title: 'Berlayar', sub: 'Dasar & Latihan', scene: 'harbor-dawn', pic: 'tk-prop/titanic-ship', picScene: 'harbor-dawn',
        goal: 'Bantu penumpang di pelabuhan, lalu naik ke kapal!',
        steps: [
          { id: 'c2a', type: 'story', title: 'Pelabuhan Southampton', goal: 'Semua bersiap naik kapal.',
            story: [P('harbor-dawn', 'Pelabuhan Southampton, 1912. Semua orang bersiap naik kapal!', 'Timmy', [{ k: 'ship/titanic', x: 62, y: 50, s: 72, d: 0.6 }, { k: TIMMY, x: 18, y: 76, s: 38, d: 1 }]),
              P('harbor-dawn', 'Banyak koper dan tiket yang harus dihitung. Ayo bantu petugas pelabuhan!', 'Kapten Smith', [{ k: 'tk-prop/suitcase-first-class', x: 30, y: 80, s: 26, d: 1 }, { k: 'tk-prop/boarding-pass', x: 55, y: 70, s: 18, d: 1.1 }, { k: CAPTAIN, x: 78, y: 72, s: 44, d: 0.9 }])] },
          { id: 'c2b', from: 't1', type: 'quiz', title: 'Tiket & Koper', domain: 'matematika', count: 4, scene: 'harbor-dawn', goal: 'Bantu menghitung tiket dan koper penumpang.' },
          { id: 'c2c', type: 'story', title: 'Naik ke Kapal', goal: 'Titanic mulai berlayar!',
            story: [P('harbor-dawn', 'Tiket sudah diperiksa. Timmy naik ke Titanic! Tuuut… kapal mulai berlayar.', 'Timmy', [{ k: 'ship/titanic', x: 58, y: 52, s: 74, d: 0.6 }, { k: TIMMY, x: 20, y: 78, s: 36, d: 1 }, { k: 'tk-legend/seagull-3', x: 30, y: 22, s: 10, d: 0.3 }])] }
        ] },
      { id: 'c3', no: 3, type: 'chapter', title: 'Kehidupan di Kapal', sub: 'Belajar & Teman', scene: 'ship-deck', pic: 'char/timmy', picScene: 'ship-deck',
        goal: 'Jelajahi kapal: kenali kamar dan antar barang!',
        steps: [
          { id: 'c3a', from: 't2', type: 'sort', title: 'Nomor Kamar', domain: 'umum', count: 4, scene: 'ship-deck', goal: 'Pilah benda-benda kapal ke tempatnya!' },
          { id: 'c3b', type: 'grid', title: 'Antar Koper', scene: 'ship-deck', goal: 'Ambil koper, lalu antar ke kamar penumpang!',
            board: board(['S#..', '.c.#', '...d'], 'S', ['N', 'E', 'S', 'W', 'P', 'D'], { theme: 'deck', blockArt: DECK, itemArt: 'tk-prop/suitcase-4', easy: true }) }
        ] },
      { id: 'c4', no: 4, type: 'chapter', title: 'Laut Lepas', sub: 'Navigasi', scene: 'night-ocean', pic: 'tk-prop/ship-wheel', picScene: 'night-ocean',
        goal: 'Bawa pesan ke ruang radio, lalu kemudikan kapal!',
        steps: [
          { id: 'c4a', from: 't4', type: 'grid', title: 'Rute ke Ruang Radio', goal: 'Bawa pesan ke ruang radio!', scene: 'night-ocean', board: board(['S.#..', '..#.G', '.....'], 'E', null, { blockArt: ICE }) },
          { id: 'c4b', from: 't5', type: 'sort', title: 'Laut Malam', domain: 'campur', count: 3, scene: 'night-ocean', goal: 'Pilah bintang dan arah kompas di laut malam!' },
          gl('c4d', 'Batu Bara untuk Mesin', 'Ambil 3 karung batu bara, lalu ke ujung lorong!', ['Scc#', '#.c.', '...G'],
            { scene: 'engine', deck: true, say: 'Mesin kapal butuh batu bara supaya bisa berlayar. Tolong kumpulkan 3 karung, ya!', item: 'tk-prop/coal-crate', tools: PK,
              blk: ['tk-prop/coal-cart', 'tk-prop/coal-pile', 'tk-prop/crate-engine-room'], par: 8,
              fact: 'Titanic punya 29 ketel uap besar yang dipanaskan dengan batu bara.', hint: 'Ambil tiap karung: Ambil di atas karungnya.' }),
          { id: 'c4c', type: 'lanes', title: 'Tantangan Navigasi', difficulty: 1, sections: ['open', 'sparse', 'more'], tutorial: true, seed: 41, questions: { on: 'collide', count: 2 },
            goal: 'Pindah jalur ke kiri atau kanan. Kumpulkan bintang!' }
        ] },
      { id: 'c5', no: 5, type: 'chapter', title: 'Peringatan Es', sub: 'Tantangan', scene: 'night-ocean', pic: 'tk-prop/iceberg-5', picScene: 'night-ocean',
        goal: 'Hindari gunung es. Kalau menabrak, jawab soal untuk berlayar lagi!',
        steps: [
          { id: 'c5a', type: 'story', title: 'Pesan dari Kapal Lain', goal: 'Ada peringatan es!',
            story: [P('night-ocean', 'Ruang radio menerima pesan dari kapal lain: "Hati-hati, ada banyak gunung es di depan!"', 'Operator radio',
              [{ k: 'tk-char/officer-boy-binoculars', x: 72, y: 74, s: 44, d: 0.9 }, { k: 'tk-prop/sealed-letter', x: 40, y: 60, s: 16, d: 1.1 }, { k: 'tk-prop/iceberg-5', x: 20, y: 72, s: 26, d: 0.4 }])] },
          gl('c5c', 'Ladang Es Malam', 'Lewati ladang es dengan hati-hati sampai ke mercusuar!', ['S..#..', '.#...#', '.#.#..', '...#..', '#....G'],
            { scene: 'night-ocean', say: 'Malam ini banyak gunung es. Pelan-pelan, cari jalan yang aman!', pic: 'tk-prop/iceberg-5', blk: ICE,
              ice: [{ path: [{ x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 }, { x: 4, y: 2 }] }], par: 9,
              fact: 'Sebagian besar gunung es tersembunyi di bawah air. Yang terlihat hanya puncaknya saja.' }),
          { id: 'c5b', from: 't7', type: 'lanes', title: 'Ladang Es', difficulty: 2, sections: ['sparse', 'more', 'narrow', 'dense'], seed: 57, questions: { on: 'collide', count: 3 },
            goal: 'Hindari gunung es. Kalau menabrak, jawab soal lalu berlayar lagi!' }
        ] },
      { id: 'c6', no: 6, type: 'chapter', title: 'Tabrakan', sub: 'Peristiwa Besar', scene: 'collision-far', pic: 'tk-key/titanic-bow', picScene: 'collision-far',
        goal: 'Malam 14 April 1912. Tetap tenang, Kapten membantu.',
        steps: [
          { id: 'c6a', from: 't8', type: 'lanes', title: 'Malam 14 April', final: true, difficulty: 2, seed: 1412, goal: 'Kemudi dibantu Kapten. Tetap tenang.' },
          { id: 'c6b', type: 'cinema', title: 'Tabrakan', scenes: ['IcebergImpact', 'InteriorReaction', 'FloodingCutaway', 'EvacuationTransition'], goal: 'Lihat apa yang terjadi, lalu jawab soalnya.' }
        ] },
      { id: 'c7', no: 7, type: 'chapter', title: 'Evakuasi', sub: 'Bertahan & Menolong', scene: 'night-deck', pic: 'tk-prop/life-vest', picScene: 'night-deck',
        goal: 'Bantu penumpang menuju sekoci!',
        steps: [
          { id: 'c7a', from: 't10', type: 'grid', title: 'Cari Dek Sekoci', goal: 'Cari jalan ke dek sekoci!', scene: 'night-deck',
            board: board(['S.#..', '..#.#', '....G'], 'E', null, { theme: 'deck', blockArt: DECK, easy: true }) },
          { id: 'c7b', type: 'grid', title: 'Bantu Penumpang', goal: 'Bawakan koper penumpang ke tanda kuning!', scene: 'night-deck',
            board: board(['Sc.#', '.#..', '...d'], 'E', ['N', 'E', 'S', 'W', 'P', 'D'], { theme: 'deck', blockArt: DECK, itemArt: 'tk-prop/suitcase-2', easy: true }) },
          { id: 'c7c', type: 'grid', title: 'Ambil Pelampung', goal: 'Ambil pelampung, lalu taruh di tanda kuning!', scene: 'night-deck',
            board: board(['S.c.', '.#..', '..#d'], 'E', ['N', 'E', 'S', 'W', 'P', 'D'], { theme: 'deck', blockArt: DECK, itemArt: 'tk-prop/life-vest', easy: true }) },
          gl('c7e', 'Pelampung untuk Kabin', 'Ambil 2 pelampung, antar ke kabin, lalu ke sekoci!', ['...##.', 'c...#.', 'S.G.#.', 'c#d#..', '#.....'],
            { scene: 'night-deck', deck: true, say: 'Keluarga di kabin belum punya pelampung. Bawakan dua, lalu kita ke sekoci bersama.', item: 'tk-prop/life-vest',
              blk: DECK, par: 11, hint: 'Ambil kedua pelampung dulu, Taruh di tanda kuning, lalu ke sekoci.',
              fact: 'Pelampung membuat orang tetap mengapung di air, jadi selalu pakai pelampung saat naik perahu.' }),
          { id: 'c7d', type: 'story', title: 'Menuju Sekoci', goal: 'Semua naik sekoci dengan tertib.',
            story: [P('night-deck', 'Semua memakai pelampung dan antre dengan tertib. Timmy naik ke sekoci bersama sebuah keluarga.', 'Timmy',
              [{ k: 'fx/lifeboat', x: 62, y: 70, s: 34, d: 0.8 }, { k: 'tk-char/hijab-girl-book', x: 36, y: 78, s: 34, d: 0.95 }, { k: TIMMY, x: 18, y: 78, s: 36, d: 1 }])] }
        ] },
      { id: 'c8', no: 8, type: 'chapter', title: 'Sekoci', sub: 'Kerja Sama', scene: 'lifeboat', pic: 'tk-prop/lifeboat', picScene: 'lifeboat',
        goal: 'Isi sekoci dengan adil dan hitung kursinya!',
        steps: [
          { id: 'c8a', from: 't11', type: 'sort', title: 'Logika Sekoci', domain: 'matematika', count: 4, scene: 'lifeboat', goal: 'Isi sekoci dengan adil — keluarga tetap bersama!' },
          { id: 'c8b', type: 'cinema', title: 'Kursi Sekoci', scenes: ['LifeboatView'], goal: 'Hitung kursi yang masih kosong.' }
        ] },
      { id: 'c9', no: 9, type: 'chapter', title: 'Kapal Terbelah', sub: 'Inti Kisah', scene: 'night-ocean', pic: 'tk-prop/porthole-moon', picScene: 'night-ocean',
        goal: 'Dari sekoci yang aman, Timmy melihat dari kejauhan.',
        steps: [
          { id: 'c9a', from: 't12', type: 'cinema', title: 'Dari Kejauhan', scenes: ['ShipBreakSequence', 'FinalDescent'], goal: 'Timmy sudah aman di sekoci.' }
        ] },
      { id: 'c10', no: 10, type: 'chapter', title: 'Penyelamatan', sub: 'Harapan & Renungan', scene: 'rescue-dawn', pic: 'tk-prop/blanket-navy', picScene: 'rescue-dawn', fragment: true,
        goal: 'Kapal penolong datang. Mari belajar dari kisah Titanic.',
        cheer: 'Kamu berhasil! Kamu menolong banyak orang, belajar hal baru, dan menunjukkan keberanian. Ilmu dan kebaikan membuat dunia lebih cerah.',
        steps: [
          { id: 'c10a', type: 'cinema', title: 'Fajar Penyelamatan', scenes: ['RescueDawn'], goal: 'Pagi datang, kapal penolong tiba!' },
          { id: 'c10b', from: 't13', type: 'sort', title: 'Berbagi Selimut', domain: 'matematika', count: 3, scene: 'rescue-dawn', goal: 'Bagikan selimut dengan adil ke setiap sekoci!' },
          { id: 'c10c', type: 'reflection', title: 'Pelajaran dari Titanic', goal: 'Apa yang kita pelajari dari Titanic?',
            lessons: [
              { k: 'tk-prop/sealed-letter', t: 'Dengarkan peringatan', s: 'Titanic menerima pesan tentang es. Peringatan penting harus didengarkan.' },
              { k: 'tk-prop/lifebuoy-5', t: 'Saling menolong', s: 'Banyak orang membantu yang lain naik sekoci dengan tenang dan tertib.' },
              { k: 'tk-prop/lifeboat', t: 'Aman untuk semua', s: 'Sejak itu, setiap kapal wajib membawa sekoci yang cukup untuk semua orang.' }
            ],
            fact: 'Pagi hari 15 April 1912, kapal Carpathia datang menolong dan membawa para penumpang sekoci ke New York.' },
          { id: 'c10d', type: 'fragment', title: 'Kepingan Kompas', goal: 'Kamu menemukan Kepingan Kompas Waktu!' }
        ] }
    ]
  }
  // old level id (t1…t13) -> chapter id, for the save migration (a chapter counts as done when the LAST of
  // its old levels was done: levels unlocked in order, so the last one done means all were)
  var TITANIC_LEGACY = { c2: ['t1'], c3: ['t2'], c4: ['t3', 't4', 't5', 't6'], c5: ['t7'], c6: ['t8', 't9'], c7: ['t10'], c8: ['t11'], c9: ['t12'], c10: ['t13'] }

  /* ── Worlds 2–14: a complete 6-level arc each, same level types ────────── */
  // o.more = three route-logic grid levels (ids <world>7..9, appended ids so saves keep every old one), played
  // after the world's first board (easy), after the play level (easy) and just before the fragment (the harder one)
  function arc (o) {
    var id = o.id, g = (o.more || []).map(function (lv) { if (!lv.scene) { lv.scene = o.scene; lv.story[0].scene = o.scene } return lv })
    var lvs = arcLevels(o, id)
    if (g.length) lvs = [lvs[0], lvs[1], lvs[2], g[0], lvs[3], g[1], lvs[4], g[2], lvs[5]].filter(Boolean)
    return {
      id: id, name: o.name, ship: 'ship/' + id, year: o.year, value: o.value, cat: o.cat, color: o.color, scene: o.scene,
      captain: o.captain, cards: o.cards,
      levels: lvs
    }
  }
  // action rebalance (owner 2026-09-29: "too much is just questions — lots of action, questions slipped in on
  // conditions, e.g. hitting an iceberg"): ONE pure quiz per world (level 1, the welcome); level 2 = a 3-lane run
  // whose collisions ask a Knowledge Challenge; level 5 = free sailing with question buoys (worlds whose level 4
  // already sails get a sort instead); level 6 (the compass fragment) = the harder lane run. Ids unchanged (saves
  // key stars by id). `questions` = the embedded-question triggers the lanes / steer engines read:
  //   { on: 'collide' | 'buoy' | 'gate' | [..], topic?, count? (max challenges), buoys?, gates? }
  var ACT = {
    britannic: [['Lorong Rumah Sakit', 'Berlayar di tiga jalur. Menabrak? Jawab soal, lalu lanjut!'], ['Antar Pasien', 'Kemudikan kapal, ambil pelampung soal untuk bintang bonus!', 'gates', 'liner'], ['Kepingan II', 'Hindari rintangan dan temukan Kepingan Kompas II!']],
    vasa: [['Uji Coba Berlayar', 'Pindah jalur, jangan sampai kapal miring!'], ['Pelabuhan Stockholm', 'Lewati gerbang pelampung, jawab soal di pelampung!', 'gates', 'boat'], ['Kepingan III', 'Lewati semua rintangan untuk Kepingan Kompas III!']],
    cuttysark: [['Balapan Teh', 'Melaju di tiga jalur. Menabrak karang? Jawab soal!'], ['Muat Kargo', 'Pilah muatan kapal dengan benar.'], ['Kepingan IV', 'Balapan terakhir menuju Kepingan Kompas IV!']],
    victory: [['Pelayaran Pagi', 'Pindah jalur dan kumpulkan bintang!'], ['Bendera di Laut', 'Kemudikan kapal, ambil pelampung soal!', 'sail', 'clipper'], ['Kepingan V', 'Hindari rintangan untuk Kepingan Kompas V!']],
    mayflower: [['Samudra Luas', 'Berlayar di tiga jalur menyeberangi samudra!'], ['Badai Kecil', 'Kemudikan kapal melewati ombak, ambil pelampung soal!', 'sail', 'clipper'], ['Kepingan VI', 'Sampai di daratan baru dan temukan Kepingan VI!']],
    endurance: [['Laut Beku', 'Hindari es di tiga jalur. Menabrak? Jawab soal!'], ['Bekal Kutub', 'Pilah perlengkapan untuk cuaca dingin.'], ['Kepingan VII', 'Lewati ladang es menuju Kepingan Kompas VII!']],
    kontiki: [['Ombak Pasifik', 'Rakit melaju di tiga jalur. Hindari karang!'], ['Isi Rakit', 'Pilah benda yang mengapung dan yang tenggelam.'], ['Kepingan VIII', 'Arungi samudra menuju Kepingan Kompas VIII!']],
    calypso: [['Menuju Lokasi Selam', 'Pindah jalur, hindari karang!'], ['Jelajah Terumbu', 'Kemudikan kapal, ambil pelampung soal!', 'gates', 'boat'], ['Kepingan IX', 'Hindari rintangan untuk Kepingan Kompas IX!']],
    queenmary: [['Menyeberangi Atlantik', 'Melaju di tiga jalur, tepat waktu!'], ['Masuk Pelabuhan', 'Lewati gerbang pelabuhan, jawab soal di pelampung!', 'gates', 'liner'], ['Kepingan X', 'Tiba tepat waktu dan temukan Kepingan X!']],
    arizona: [['Pelabuhan Pagi', 'Berlayar pelan di tiga jalur.'], ['Perahu Kenangan', 'Dayung ke monumen, ambil pelampung soal!', 'gates', 'boat'], ['Kepingan XI', 'Berlayar dengan tenang menuju Kepingan XI!']],
    missouri: [['Patroli Damai', 'Pindah jalur, hindari rintangan!'], ['Teluk Tokyo', 'Kemudikan kapal ke teluk, ambil pelampung soal!', 'gates', 'liner'], ['Kepingan XII', 'Hindari rintangan untuk Kepingan Kompas XII!']],
    nautilus: [['Lorong Gelap', 'Kapal selam melaju di tiga jalur. Hindari batu!'], ['Suara Sonar', 'Pilah hewan laut menurut sonar.'], ['Kepingan XIII', 'Menyelam lebih dalam menuju Kepingan XIII!']],
    pelabuhan: [['Arus Waktu', 'Semua jalur bercampur! Menabrak? Jawab soal!'], ['Ujian Kapten', 'Pilah semua yang kamu pelajari.'], ['Kompas Utuh', 'Lintasan terakhir: satukan Kompas Waktu dan pulang!']]
  }
  var ACT_SEED = 0
  function arcLevels (o, id) {
    var A = ACT[id], sails = o.play.type === 'steer', sd = 700 + (++ACT_SEED) * 37
    var lv4 = { id: id + '4', title: o.t[3], type: o.play.type, mode: o.play.mode, vessel: o.play.vessel, domain: o.play.domain, count: 4, scene: o.scene, goal: o.g[3] }
    if (sails) lv4.questions = { on: ['collide', 'buoy'], buoys: 2, count: 3 }
    var lv5 = sails
      ? { id: id + '5', title: A[1][0], type: 'sort', domain: 'logika', count: 4, scene: o.scene, goal: A[1][1] }
      : { id: id + '5', title: A[1][0], type: 'steer', mode: A[1][2], vessel: A[1][3], domain: 'campur', scene: o.scene, goal: A[1][1], questions: { on: ['collide', 'buoy'], buoys: 2, count: 3 } }
    return [
        { id: id + '1', title: o.t[0], type: 'quiz', domain: 'umum', count: 4, scene: o.scene, goal: o.g[0], world: id, story: [P(o.scene, o.intro, 'Timmy', [{ k: 'ship/' + id, x: 60, y: 52, s: 64, d: 0.6 }, { k: TIMMY, x: 18, y: 76, s: 38, d: 1 }])] },
        { id: id + '2', title: A[0][0], type: 'lanes', difficulty: 1, sections: ['open', 'sparse', 'more'], seed: sd, domain: 'campur', scene: o.scene, goal: A[0][1], questions: { on: 'collide', count: 2 } },
        { id: id + '3', title: o.t[2], type: 'grid', goal: o.g[2], board: o.board, scene: o.scene },
        lv4, lv5,
        { id: id + '6', title: A[2][0], type: 'lanes', difficulty: 2, sections: ['sparse', 'more', 'narrow', 'dense'], seed: sd + 11, domain: 'campur', scene: o.scene, goal: A[2][1], fragment: true, questions: { on: 'collide', count: 3 } }
    ]
  }
  var C = function (a, b, c) { return [{ id: a[0], title: a[1], text: a[2] }, { id: b[0], title: b[1], text: b[2] }, { id: c[0], title: c[1], text: c[2] }] }

  var OTHERS = [
    arc({ id: 'britannic', name: 'HMHS Britannic', year: 1915, value: 'Menolong Sesama', cat: 'perang-damai', color: '#2E8B8B', scene: 'hospital-ship', dom: 'matematika',
      captain: { name: 'Perawat Violet', quote: 'Menolong orang lain adalah tugas paling mulia.' },
      intro: 'Britannic adalah saudara Titanic yang menjadi kapal rumah sakit.',
      t: ['Kapal Rumah Sakit', 'Memilah Obat', 'Antar Obat', 'Pintu & Lorong', 'Membantu Pasien', 'Kepingan II'],
      g: ['Jawab soal tentang laut dan kapal.', 'Hitung dan pilah kotak obat.', 'Ambil kotak obat lalu antar ke dokter!', 'Kelompokkan perlengkapan dengan benar.', 'Jawab soal campuran, lalu lanjut berlayar!', 'Temukan Kepingan Kompas II!'],
      board: board(['S.c.#', '..#..', '...#d'], 'E', ['N', 'E', 'S', 'W', 'P', 'D'], { theme: 'deck', blockArt: ['tk-prop/crate-plain', 'tk-prop/crate-white-star', 'gt-el/crate'], itemArt: 'tk-prop/crate-fragile' }),
      play: { type: 'sort', domain: 'umum' },
      more: [      gl('britannic7', 'Air untuk Pasien', 'Ambil tong air, lalu antar ke tempat tidur pasien!', ['S.c', '.#.', '..d'],
        { deck: true, say: 'Pasien di kamar ujung kehausan. Yuk, antarkan air minum segar!', item: 'tk-prop/water-barrel-2', blk: ['tk-prop/crate-white-star'], par: 6,
          fact: 'Britannic bisa merawat lebih dari 3.000 orang sakit sekaligus.' }),
      gl('britannic8', 'Panggil Pelaut', 'Jemput pelaut di dek, lalu ajak ke sekoci latihan!', ['S..#', '.#c.', '...#', '#..G'],
        { deck: true, say: 'Ada latihan sekoci hari ini. Jemput pelaut yang masih di dek, ya!', item: 'tk-char/officer-boy-salute', tools: PK,
          blk: ['tk-prop/rope-coil', 'tk-prop/rope-coil-2', 'tk-prop/cargo-net'], par: 7,
          fact: 'Badan Britannic dicat putih dengan garis hijau dan palang merah besar.' }),
      gl('britannic9', 'Dua Kotak Obat', 'Ambil 2 kotak obat, lalu antar ke ruang dokter!', ['Sc.#c', '.#...', '....d', '.#...', '#.##.'],
        { deck: true, say: 'Dokter butuh dua kotak obat. Kotaknya ada di dua tempat berbeda!', item: 'tk-prop/crate-fragile',
          blk: ['tk-prop/crate-plain', 'gt-el/crate', 'tk-prop/crate-white-star'], par: 11,
          fact: 'Britannic punya empat cerobong asap, tetapi satu hanya untuk mengalirkan udara.' })],
      cards: C(['britannic-1', 'Kapal Rumah Sakit', 'HMHS Britannic dipakai sebagai kapal rumah sakit pada Perang Dunia I untuk merawat orang yang terluka.'],
        ['britannic-2', 'Tanda Palang Merah', 'Kapal rumah sakit dicat putih dengan tanda palang merah agar semua tahu kapal itu untuk menolong.'],
        ['britannic-3', 'Belajar dari Titanic', 'Britannic dibangun lebih aman setelah kejadian Titanic, misalnya dengan lebih banyak sekoci.']) }),
    arc({ id: 'vasa', name: 'Vasa', year: 1628, value: 'Belajar dari Kesalahan', cat: 'sains', color: '#8B5A2B', scene: 'shipyard', dom: 'matematika',
      captain: { name: 'Tukang Kayu Henrik', quote: 'Kapal yang indah juga harus seimbang.' },
      intro: 'Kapal Vasa dari Swedia sangat megah — tapi terlalu berat di bagian atas.',
      t: ['Galangan Kapal', 'Pola Hiasan', 'Antar Kayu', 'Seimbang!', 'Angin Bertiup', 'Kepingan III'],
      g: ['Jawab soal tentang laut dan kapal.', 'Lanjutkan pola hiasan kapal.', 'Ambil kayu lalu antar ke tukang!', 'Timbang peti dan tong supaya seimbang.', 'Jawab soal campuran, lalu lanjut berlayar!', 'Temukan Kepingan Kompas III!'],
      board: board(['Sc.#.', '..#..', '..d..'], 'E', ['N', 'E', 'S', 'W', 'P', 'D'], { blockArt: ROCK, itemArt: 'game/crate-wood' }),
      play: { type: 'sort', domain: 'matematika' },
      more: [      gl('vasa7', 'Patung Singa', 'Ambil patung singa, lalu antar ke tukang ukir!', ['.Sc', '#..', '..d'],
        { say: 'Tukang ukir menunggu patung singa untuk menghias buritan kapal.', item: 'game/shield-lion', blk: ROCK, par: 5,
          fact: 'Kapal Vasa dihias lebih dari 500 patung ukiran kayu.' }),
      gl('vasa8', 'Dermaga Nomor Dua', 'Merapat di dermaga yang benar, lewati tiang-tiang kayu!', ['S.#.', '..#.', '#...', '.#.G'],
        { say: 'Perahu kayu harus merapat di dermaga kedua. Hati-hati tiang kayu!', pic: 'tk-key/dock', blk: ['tk-prop/bollard-rope', 'tk-key/dock'], par: 6,
          fact: 'Vasa tenggelam setelah berlayar hanya sekitar 1.300 meter.' }),
      gl('vasa9', 'Batu Pemberat', 'Ambil 2 batu pemberat, lalu taruh di lambung kapal!', ['S....', '.#..#', 'c#c#.', '..d..', '..###'],
        { say: 'Kapal butuh pemberat di bawah supaya tidak mudah miring. Ambil dua batu!', item: 'gt-el/boulders', blk: ['tk-world/arch-rock', 'gt-el/boulders'], par: 10,
          fact: 'Batu pemberat di dasar kapal membuat kapal tegak dan tidak mudah terbalik.' })],
      cards: C(['vasa-1', 'Kapal Megah', 'Vasa dibuat untuk raja Swedia dan berlayar pertama kali pada tahun 1628 di Stockholm.'],
        ['vasa-2', 'Terlalu Berat di Atas', 'Vasa terlalu berat di bagian atas sehingga mudah miring saat tertiup angin.'],
        ['vasa-3', 'Diangkat Kembali', 'Vasa diangkat dari dasar laut pada tahun 1961 dan kini ada di museum di Stockholm.']) }),
    arc({ id: 'cuttysark', name: 'Cutty Sark', year: 1869, value: 'Kecepatan & Kerja Keras', cat: 'penjelajahan', color: '#2F7D4F', scene: 'harbor-day', dom: 'logika',
      captain: { name: 'Kapten Woodget', quote: 'Baca angin, atur layar, dan melesatlah!' },
      intro: 'Cutty Sark adalah kapal layar yang sangat cepat, pembawa teh dan wol.',
      t: ['Pelabuhan Teh', 'Arah Angin', 'Rute Pelabuhan', 'Berlayar!', 'Cuaca di Laut', 'Kepingan IV'],
      g: ['Jawab soal tentang laut dan kapal.', 'Cocokkan panah angin.', 'Keluar dari pelabuhan yang ramai!', 'Atur layar mengikuti angin.', 'Baca simbol cuaca.', 'Temukan Kepingan Kompas IV!'],
      board: board(['S.#..', '.>...', '...#G'], 'E', null, { blockArt: ROCK }),
      play: { type: 'steer', mode: 'sail', vessel: 'clipper' },
      more: [      gl('cuttysark7', 'Kapal Tunda', 'Tarik kapal tunda ke mercusuar. Hanya kanan dan bawah!', ['S.#.', '#...', '.#..', '..#G'],
        { say: 'Kapal tunda kecil membantu kapal besar keluar pelabuhan. Ayo ke mercusuar!', pic: 'tk-ship/tugboat-red', tools: ['E', 'S'], blk: ['tk-world/arch-rock', 'gt-el/boulders'], par: 6,
          fact: 'Kapal tunda kecil tapi sangat kuat, bisa menarik kapal yang jauh lebih besar.' }),
      gl('cuttysark8', 'Peti Teh', 'Ambil peti teh, lalu muat ke gudang kapal!', ['S>.c', '.#..', '..#d'],
        { say: 'Peti teh dari Tiongkok harus dimuat. Arus laut bisa membantumu!', item: 'tk-prop/tea-set', blk: ['tk-prop/buoy-light'], par: 6,
          fact: 'Nama Cutty Sark berasal dari sebuah puisi Skotlandia.' }),
      gl('cuttysark9', 'Bal Wol dari Pulau', 'Ambil 2 bal wol di pulau-pulau, lalu antar ke kapal!', ['Sc.#..', '.v.#.#', '....#.', '.#.#..', '.c.d..'],
        { say: 'Cutty Sark kini membawa wol. Ambil dua bal wol di antara pulau-pulau!', item: 'gt-el/hay-roll', blk: ['tk-world/palm-island', 'tk-world/arch-island'], par: 11,
          fact: 'Cutty Sark pernah membawa wol dari Australia ke Inggris.' })],
      cards: C(['cuttysark-1', 'Kapal Teh', 'Cutty Sark dibuat pada tahun 1869 untuk membawa teh dari Tiongkok ke Inggris.'],
        ['cuttysark-2', 'Sangat Cepat', 'Dengan layar yang banyak, Cutty Sark termasuk kapal layar tercepat di zamannya.'],
        ['cuttysark-3', 'Museum di Greenwich', 'Sekarang Cutty Sark bisa dikunjungi di Greenwich, London.']) }),
    arc({ id: 'victory', name: 'HMS Victory', year: 1765, value: 'Kepemimpinan', cat: 'perang-damai', color: '#A23B2A', scene: 'old-deck', dom: 'logika',
      captain: { name: 'Pelaut Tom', quote: 'Pemimpin yang baik mendengarkan kawannya.' },
      intro: 'HMS Victory adalah kapal kayu tua yang kini menjadi museum.',
      t: ['Menjelajah Dek', 'Tugas Awak', 'Antar Pesan', 'Bendera Sinyal', 'Kompas Kuno', 'Kepingan V'],
      g: ['Jawab soal tentang laut dan kapal.', 'Siapa mengerjakan apa?', 'Bawa pesan ke kapten!', 'Pilah bendera sinyal.', 'Baca arah kompas.', 'Temukan Kepingan Kompas V!'],
      board: board(['S....', '.###.', '....G'], 'E', null, { theme: 'deck', blockArt: BARRELS }),
      play: { type: 'sort', domain: 'logika' },
      more: [      gl('victory7', 'Bendera Jatuh', 'Bendera jatuh ke dek! Ambil, lalu pasang di tiang.', ['Sc.', '.#.', '..d'],
        { deck: true, say: 'Angin kencang menjatuhkan bendera. Pungut dan pasang lagi di tiang!', item: 'game/flag-red', blk: ['tk-prop/rope-coil', 'tk-prop/rope-coil-3'], par: 6,
          fact: 'HMS Victory punya tiga tiang layar yang tinggi.' }),
      gl('victory8', 'Kucing Kapal', 'Kucing kapal bersembunyi! Jemput, lalu bawa ke sekoci.', ['S#..', '...#', '#c..', '..#G'],
        { deck: true, say: 'Kucing kapal suka bersembunyi di antara tong. Ayo jemput dia!', item: 'animals/tabby-cat', tools: PK, blk: BARRELS, par: 7,
          fact: 'Dulu banyak kapal membawa kucing untuk menjaga makanan dari tikus.' }),
      gl('victory9', 'Bendera Sinyal', 'Ambil 2 bendera sinyal, lalu kibarkan di tiang!', ['Sc#...', '#.#...', '.....#', '.c#d..', '.#...#'],
        { deck: true, say: 'Kapten ingin mengirim pesan dengan bendera. Kumpulkan dua bendera sinyal!', item: 'tk-prop/flag-compass', blk: ['tk-prop/cargo-net', 'tk-prop/crate-plain', 'tk-prop/barrels'], par: 11,
          fact: 'Kapal zaman dulu mengirim pesan dengan bendera berwarna, seperti bahasa rahasia.' })],
      cards: C(['victory-1', 'Kapal Kayu Tua', 'HMS Victory diluncurkan pada tahun 1765 dan masih ada sampai sekarang di Portsmouth, Inggris.'],
        ['victory-2', 'Bendera Sinyal', 'Kapal zaman dulu berbicara dengan bendera berwarna yang punya arti masing-masing.'],
        ['victory-3', 'Museum', 'Kini HMS Victory menjadi museum tempat anak-anak belajar sejarah pelayaran.']) }),
    arc({ id: 'mayflower', name: 'Mayflower', year: 1620, value: 'Awal yang Baru', cat: 'penjelajahan', color: '#9C6B30', scene: 'harbor-day', dom: 'matematika',
      captain: { name: 'Kapten Jones', quote: 'Persiapan yang baik membuat perjalanan aman.' },
      intro: 'Mayflower membawa keluarga-keluarga menyeberangi lautan untuk memulai hidup baru.',
      t: ['Pilih Bekal', 'Hitung Tong', 'Gudang Kapal', 'Muat Barang', 'Simbol Cuaca', 'Kepingan VI'],
      g: ['Pilih bekal yang penting.', 'Hitung tong air dan makanan.', 'Ambil peti lalu simpan di gudang!', 'Muat barang sesuai tempatnya.', 'Cuaca apa yang aman untuk berlayar?', 'Temukan Kepingan Kompas VI!'],
      board: board(['S.c..', '#.#.#', '....d'], 'E', ['N', 'E', 'S', 'W', 'P', 'D'], { theme: 'deck', blockArt: BARRELS, itemArt: 'tk-prop/crate-plain' }),
      play: { type: 'sort', domain: 'matematika' },
      more: [      gl('mayflower7', 'Tong Air Minum', 'Ambil tong air, lalu simpan di gudang!', ['S.#', '.c.', '#.d'],
        { deck: true, say: 'Perjalanan masih panjang. Simpan tong air minum di gudang, ya!', item: 'tk-prop/water-barrel', blk: ['tk-prop/crate-plain'], par: 6,
          fact: 'Mayflower membawa sekitar 102 penumpang.' }),
      gl('mayflower8', 'Daratan Baru', 'Berlayar ke daratan baru. Awas gosong pasir!', ['S..#', '.#..', '..#.', '#..G'],
        { say: 'Daratan sudah terlihat! Hati-hati, ada gosong pasir yang dangkal.', pic: 'gt-el/sandcastle', blk: ['gt-el/sandcastle', 'gt-el/boulders'], par: 6,
          fact: 'Perjalanan Mayflower menyeberangi lautan memakan waktu sekitar 66 hari.' }),
      gl('mayflower9', 'Bekal untuk Keluarga', 'Ambil 3 keranjang bekal, lalu bagikan ke keluarga!', ['Sc...', '#c.#.', '.#.#.', '.....', '#cd..'],
        { deck: true, say: 'Tiga keranjang bekal tersebar di dek. Kumpulkan lalu bagikan!', item: 'tk-prop/picnic-basket', blk: BARRELS, par: 12,
          fact: 'Sebelum membawa penumpang, Mayflower adalah kapal pengangkut barang dagangan.' })],
      cards: C(['mayflower-1', 'Tahun 1620', 'Mayflower berlayar dari Inggris ke Amerika pada tahun 1620.'],
        ['mayflower-2', 'Perjalanan Panjang', 'Perjalanan menyeberangi Samudra Atlantik itu memakan waktu sekitar dua bulan.'],
        ['mayflower-3', 'Berbagi', 'Para penumpang harus berbagi ruang dan bekal selama perjalanan.']) }),
    arc({ id: 'endurance', name: 'Endurance', year: 1914, value: 'Pantang Menyerah', cat: 'penjelajahan', color: '#4F7FA8', scene: 'antarctic', dom: 'umum',
      captain: { name: 'Shackleton', quote: 'Bersama-sama, kita pasti bisa pulang.' },
      intro: 'Endurance berlayar ke Antartika yang sangat dingin dan penuh es.',
      t: ['Persiapan', 'Baju Hangat', 'Es Bergerak', 'Menembus Es', 'Hewan Kutub', 'Kepingan VII'],
      g: ['Jawab soal tentang laut dan kapal.', 'Pilih pakaian untuk cuaca dingin.', 'Hindari es yang bergerak!', 'Kemudikan kapal di antara es.', 'Kenali hewan kutub.', 'Temukan Kepingan Kompas VII!'],
      board: board(['S...#', '.#...', '...#G'], 'E', null, { blockArt: ICE, ice: [{ path: [{ x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 1 }] }] }),
      play: { type: 'steer', mode: 'ice', vessel: 'explorer' },
      more: [      gl('endurance7', 'Anak Pinguin Tersesat', 'Antar anak pinguin kembali ke ibunya!', ['S.#.', '#c.d'],
        { say: 'Seekor anak pinguin terpisah dari ibunya. Ayo antar dia pulang!', item: 'animals/penguin', blk: ['gt-el/ice-crystal', 'tk-prop/ice-cube'], par: 6,
          fact: 'Pinguin kaisar bisa setinggi anak kelas 1 SD.' }),
      gl('endurance8', 'Bongkah Es Berjalan', 'Tunggu bongkah es lewat, lalu ke bendera!', ['S...', '.#..', '...#', '#..G'],
        { say: 'Bongkah es itu bergerak naik turun. Perhatikan dulu, baru jalan!', pic: 'tk-prop/ice-floe', blk: ICE, par: 6,
          ice: [{ path: [{ x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 1 }] }],
          fact: 'Air laut di Antartika bisa membeku menjadi lautan es yang luas.' }),
      gl('endurance9', 'Jemput Awak Kapal', 'Jemput 2 awak kapal di es, lalu ke bendera!', ['S..#..', '.#...#', '.c.#..', '##..c.', '...#.G'],
        { say: 'Dua awak kapal menunggu di atas es. Jemput mereka satu per satu!', item: 'tk-char/explorer-kid', tools: PK, blk: ICE, par: 11,
          ice: [{ path: [{ x: 4, y: 0 }, { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 1 }] }],
          fact: 'Semua 28 awak Endurance selamat karena mereka bekerja sama.' })],
      cards: C(['endurance-1', 'Ke Antartika', 'Kapal Endurance berangkat pada tahun 1914 menuju Antartika.'],
        ['endurance-2', 'Terjebak Es', 'Kapal itu terjebak es laut, tetapi semua awaknya bekerja sama dan akhirnya selamat.'],
        ['endurance-3', 'Ditemukan', 'Bangkai Endurance ditemukan di dasar laut pada tahun 2022.']) }),
    arc({ id: 'kontiki', name: 'Kon-Tiki', year: 1947, value: 'Berani Mencoba', cat: 'penjelajahan', color: '#C08A3E', scene: 'open-sea', dom: 'umum',
      captain: { name: 'Thor', quote: 'Kalau belum dicoba, kita tak pernah tahu.' },
      intro: 'Kon-Tiki adalah rakit kayu yang menyeberangi Samudra Pasifik.',
      t: ['Membuat Rakit', 'Mengapung?', 'Arus Laut', 'Ikuti Arus', 'Bintang Penunjuk', 'Kepingan VIII'],
      g: ['Jawab soal tentang laut dan kapal.', 'Benda apa yang mengapung?', 'Gunakan arus untuk sampai!', 'Kemudikan rakit mengikuti arus.', 'Bintang membantu pelaut.', 'Temukan Kepingan Kompas VIII!'],
      board: board(['S>>.#', '...v.', '#...G'], 'E', null, { blockArt: ROCK }),
      play: { type: 'steer', mode: 'current', vessel: 'raft' },
      more: [      gl('kontiki7', 'Ikuti Arus', 'Biarkan arus membawa rakit ke pulau. Kanan dan bawah saja!', ['S.>.', '#..v', '.#.G'],
        { say: 'Rakit tidak punya mesin. Arus laut yang mendorongnya!', pic: 'tk-world/palm-island', tools: ['E', 'S'], blk: ROCK, par: 3,
          fact: 'Kon-Tiki berlayar hampir 7.000 kilometer di Samudra Pasifik.' }),
      gl('kontiki8', 'Burung Beo', 'Burung beo terbang ke batu karang! Jemput, lalu ke pulau.', ['S.#.', '.>.c', '#...', '.#.G'],
        { say: 'Burung beo kesayangan awak hinggap di batu karang. Ayo jemput!', item: 'animals/parrot', tools: PK, blk: ['tk-world/arch-rock', 'gt-el/boulders'], par: 6,
          fact: 'Awak Kon-Tiki ada 6 orang, dan mereka membawa seekor burung beo.' }),
      gl('kontiki9', 'Awas Pusaran Air', 'Ambil 2 tong air minum. Hindari pusaran air!', ['S.v..#', '...#..', 'c#c#..', '<..G..', '#.....'],
        { say: 'Rakit butuh air minum. Ambil dua tong, tapi jauhi pusaran air!', item: 'tk-prop/water-barrel-2', tools: PK, blk: ['tk-world/whirlpool'], par: 10,
          fact: 'Ikan terbang sering melompat dan mendarat di atas rakit Kon-Tiki.' })],
      cards: C(['kontiki-1', 'Rakit Kayu', 'Kon-Tiki adalah rakit dari kayu balsa yang berlayar pada tahun 1947.'],
        ['kontiki-2', '101 Hari', 'Rakit itu menyeberangi Samudra Pasifik selama sekitar 101 hari.'],
        ['kontiki-3', 'Arus & Angin', 'Kon-Tiki bergerak dengan bantuan arus laut dan angin.']) }),
    arc({ id: 'calypso', name: 'Calypso', year: 1950, value: 'Menjaga Laut', cat: 'sains', color: '#1E88A8', scene: 'research-sea', dom: 'umum',
      captain: { name: 'Peneliti Laut', quote: 'Laut adalah rumah bagi jutaan makhluk.' },
      intro: 'Calypso adalah kapal peneliti yang mempelajari kehidupan laut.',
      t: ['Kapal Peneliti', 'Siapkan Kamera', 'Menyelam', 'Laut Bersih', 'Hewan Laut', 'Kepingan IX'],
      g: ['Jawab soal tentang laut dan kapal.', 'Hitung alat penyelam.', 'Temukan jalan di bawah laut!', 'Pilah sampah dan hewan laut.', 'Kenali hewan laut.', 'Temukan Kepingan Kompas IX!'],
      board: board(['S.#.G', '..#..', '.....'], 'E', null, { blockArt: ROCK }),
      play: { type: 'sort', domain: 'umum' },
      more: [      gl('calypso7', 'Jemput Penyelam', 'Jemput penyelam, lalu antar ke terumbu karang!', ['Sc#', '...', '#.d'],
        { say: 'Penyelam ingin memotret ikan di terumbu karang. Antar dia ke sana!', item: 'tk-char/diver', blk: ROCK, par: 6,
          fact: 'Tim Calypso ikut membuat alat selam agar orang bisa bernapas di bawah air.' }),
      gl('calypso8', 'Laut Bersih', 'Ambil 2 sampah dari laut, lalu ke bendera!', ['S.c.', '.#..', '..c#', '#..G'],
        { say: 'Ada sampah mengapung di laut. Ayo bersihkan supaya ikan tetap sehat!', item: 'gt-el/tire-stack', tools: PK, blk: ['tk-world/arch-rock', 'tk-world/cave-island'], par: 8,
          fact: 'Sampah plastik bisa bertahan di laut sampai ratusan tahun.' }),
      gl('calypso9', 'Penyu Pulang', 'Antar penyu kecil ke terumbu karang. Ikuti arus!', ['S...#v', '>...#.', '.##...', '#.c.d.', '#.#...'],
        { say: 'Penyu kecil tersesat jauh dari rumahnya. Bawa dia ke terumbu karang!', item: 'animals/sea-turtle', blk: ['gt-el/pink-crystal', 'gt-el/purple-crystal'], par: 10,
          fact: 'Terumbu karang sebenarnya terbuat dari hewan-hewan kecil yang hidup bersama.' })],
      cards: C(['calypso-1', 'Kapal Peneliti', 'Calypso dipakai untuk meneliti laut dan membuat film tentang kehidupan bawah laut.'],
        ['calypso-2', 'Menjaga Laut', 'Para peneliti mengajak semua orang untuk menjaga laut tetap bersih.'],
        ['calypso-3', 'Makhluk Laut', 'Laut adalah rumah bagi ikan, penyu, lumba-lumba, terumbu karang, dan banyak lagi.']) }),
    arc({ id: 'queenmary', name: 'RMS Queen Mary', year: 1936, value: 'Tepat Waktu', cat: 'penjelajahan', color: '#B23A3A', scene: 'harbor-day', dom: 'matematika',
      captain: { name: 'Pramugara Leo', quote: 'Tepat waktu membuat semua orang senang.' },
      intro: 'Queen Mary adalah kapal penumpang yang mewah dan cepat.',
      t: ['Pelabuhan', 'Membaca Jam', 'Antar Koper', 'Ruang Makan', 'Jadwal Kapal', 'Kepingan X'],
      g: ['Jawab soal tentang laut dan kapal.', 'Jam berapa kapal berangkat?', 'Ambil koper lalu antar ke kabin!', 'Hitung piring dan gelas.', 'Susun jadwal dengan benar.', 'Temukan Kepingan Kompas X!'],
      board: board(['S.c.#', '..#..', 'd....'], 'E', ['N', 'E', 'S', 'W', 'P', 'D'], { theme: 'deck', blockArt: ['tk-prop/crate-plain', 'tk-prop/deck-chair', 'tk-prop/rope-coil'], itemArt: 'tk-prop/suitcase-5' }),
      play: { type: 'sort', domain: 'matematika' },
      more: [      gl('queenmary7', 'Kunci Kabin', 'Ambil kunci, lalu antar ke pintu kabin!', ['Sc.#', '#..d'],
        { deck: true, say: 'Seorang penumpang lupa kuncinya. Tolong antarkan ke kabinnya!', item: 'tk-prop/cabin-key', blk: ['tk-prop/deck-chair'], par: 6,
          fact: 'Queen Mary punya tiga cerobong asap besar berwarna merah dan hitam.' }),
      gl('queenmary8', 'Pelampung Suar', 'Bawa kapal ke pelabuhan. Lewati pelampung suar!', ['S..#', '#...', '..#.', '.#.G'],
        { say: 'Pelampung suar menandai jalur aman di pelabuhan. Jangan menabraknya!', pic: 'tk-prop/buoy-light', blk: ['tk-prop/buoy-light'], par: 6,
          fact: 'Queen Mary menyeberangi Samudra Atlantik lebih dari 1.000 kali.' }),
      gl('queenmary9', 'Teh Pagi', 'Ambil 2 cangkir teh, lalu antar ke ruang makan!', ['Scc..', '..##.', '.....', '#.d..', '##...'],
        { deck: true, say: 'Sarapan hampir siap! Bawakan dua cangkir teh ke ruang makan.', item: 'tk-prop/tea-set', blk: ['tk-prop/deck-chair', 'tk-prop/crate-plain', 'tk-prop/rope-coil'], par: 10,
          fact: 'Kini Queen Mary menjadi hotel. Orang bisa menginap di kabinnya.' })],
      cards: C(['queenmary-1', 'Tahun 1936', 'Queen Mary berlayar pertama kali pada tahun 1936 antara Inggris dan Amerika.'],
        ['queenmary-2', 'Hotel Terapung', 'Kini Queen Mary menjadi hotel dan museum di Long Beach, California.'],
        ['queenmary-3', 'Jadwal', 'Kapal penumpang harus menjaga jadwal agar semua penumpang tiba tepat waktu.']) }),
    arc({ id: 'arizona', name: 'USS Arizona', year: 1915, value: 'Mengenang & Belajar', cat: 'perang-damai', color: '#5A6B7A', scene: 'harbor-morning', dom: 'logika',
      captain: { name: 'Penjaga Monumen', quote: 'Kita mengenang agar kita belajar menjaga perdamaian.' },
      intro: 'Pagi yang tenang di Pearl Harbor. Kapal-kapal berjajar di pelabuhan.',
      t: ['Pagi yang Tenang', 'Pola Sinyal', 'Pesan Pagi', 'Bendera Kapal', 'Mengenang', 'Kepingan XI'],
      g: ['Jawab soal tentang laut dan kapal.', 'Lanjutkan pola sinyal.', 'Antar pesan pagi!', 'Pilah bendera dan artinya.', 'Jawab soal campuran, lalu lanjut berlayar!', 'Temukan Kepingan Kompas XI!'],
      board: board(['S....', '.#.#.', '...#G'], 'E', null, { theme: 'deck', blockArt: BARRELS }),
      play: { type: 'sort', domain: 'logika' },
      more: [      gl('arizona7', 'Surat Pagi', 'Ambil surat, lalu antar ke ruang radio!', ['S.c', '.#.', '.#d'],
        { deck: true, say: 'Pagi yang tenang. Ada surat yang harus sampai ke ruang radio.', item: 'tk-prop/sealed-letter', blk: BARRELS, par: 6,
          fact: 'Pelaut dulu menerima kabar keluarga lewat surat yang dibawa kapal.' }),
      gl('arizona8', 'Perahu ke Monumen', 'Dayung perahu ke monumen putih. Kanan dan bawah saja!', ['S.#', '..#', '#..', '#.G'],
        { say: 'Pengunjung pergi ke monumen dengan perahu. Ayo mendayung pelan-pelan.', pic: 'tk-prop/rowboat', tools: ['E', 'S'], blk: ['tk-prop/buoy-light'], par: 5,
          fact: 'Monumen Arizona punya 21 jendela terbuka.' }),
      gl('arizona9', 'Bunga Kenangan', 'Ambil 2 bunga, lalu letakkan di monumen!', ['S.#d..', 'cc#.#.', '#.....', '...#..', '###...'],
        { say: 'Orang membawa bunga untuk mengenang. Kumpulkan dua bunga dengan tenang.', item: 'nature/flower-pink', blk: ['tk-prop/buoy-light', 'tk-prop/bollard-rope'], par: 10,
          fact: 'Monumen Arizona dibangun di atas kapal, tanpa menyentuh kapalnya.' })],
      cards: C(['arizona-1', 'Sebuah Kapal Perang', 'USS Arizona adalah kapal Angkatan Laut Amerika Serikat yang diluncurkan pada tahun 1915.'],
        ['arizona-2', '7 Desember 1941', 'Pada tanggal ini kapal Arizona tenggelam di Pearl Harbor saat perang.'],
        ['arizona-3', 'Monumen Kenangan', 'Kini ada monumen putih di atas kapal itu, tempat orang mengenang dan belajar tentang perdamaian.']) }),
    arc({ id: 'missouri', name: 'USS Missouri', year: 1944, value: 'Perdamaian', cat: 'perang-damai', color: '#4A5A8A', scene: 'harbor-day', dom: 'umum',
      captain: { name: 'Pemandu Museum', quote: 'Perdamaian lebih kuat dari apa pun.' },
      intro: 'USS Missouri adalah kapal tempat perjanjian damai ditandatangani.',
      t: ['Menjelajah', 'Sinyal', 'Rute Dek', 'Cocokkan Mesin', 'Hari Damai', 'Kepingan XII'],
      g: ['Jawab soal tentang laut dan kapal.', 'Arti sinyal kapal.', 'Cari jalan di dek kapal!', 'Cocokkan bagian mesin.', 'Jawab soal campuran, lalu lanjut berlayar!', 'Temukan Kepingan Kompas XII!'],
      board: board(['S.#..', '.....', '#.#.G'], 'E', null, { theme: 'deck', blockArt: BARRELS }),
      play: { type: 'sort', domain: 'logika' },
      more: [      gl('missouri7', 'Surat Perdamaian', 'Ambil surat perdamaian, lalu taruh di meja!', ['S.', 'c#', '..', '#d'],
        { deck: true, say: 'Hari ini hari damai. Bawa surat perjanjian ke meja di dek!', item: 'tk-prop/scroll-sealed', blk: ['tk-prop/crate-plain'], par: 6,
          fact: 'Kapal Missouri punya nama panggilan "Mighty Mo".' }),
      gl('missouri8', 'Dermaga yang Benar', 'Merapat di dermaga bertanda bendera!', ['S.#.', '#...', '..#.', '.#.G'],
        { say: 'Pelabuhan punya banyak dermaga. Cari dermaga yang bertanda bendera!', pic: 'tk-key/dock', blk: ['tk-key/dock', 'tk-prop/bollard-rope'], par: 6,
          fact: 'Penandatanganan perdamaian di atas Missouri hanya berlangsung sekitar 23 menit.' }),
      gl('missouri9', 'Roda Gigi Mesin', 'Ambil 2 roda gigi, lalu antar ke ruang mesin!', ['S#.##.', '.c##d#', 'c.....', '....#.', '.#.#..', '....#.'],
        { deck: true, say: 'Mesin kapal butuh dua roda gigi baru. Ambil dari gudang!', item: 'gt-el/gear', blk: ['tk-prop/propeller', 'gt-el/crate', 'tk-prop/crate-plain'], par: 12,
          fact: 'USS Missouri lebih panjang dari dua lapangan sepak bola.' })],
      cards: C(['missouri-1', 'Kapal Besar', 'USS Missouri adalah kapal besar Angkatan Laut Amerika Serikat yang diluncurkan pada tahun 1944.'],
        ['missouri-2', 'Hari Damai', 'Pada 2 September 1945 perjanjian yang mengakhiri Perang Dunia II ditandatangani di atas kapal ini.'],
        ['missouri-3', 'Museum', 'Kini USS Missouri menjadi museum di Pearl Harbor, dekat monumen Arizona.']) }),
    arc({ id: 'nautilus', name: 'Kapal Selam Nautilus', year: 1954, value: 'Menjelajah yang Tak Terlihat', cat: 'sains', color: '#3D5A80', scene: 'deep-sea', dom: 'umum',
      captain: { name: 'Kapten Nemo', quote: 'Di bawah laut, ada dunia yang menakjubkan.' },
      intro: 'Timmy menaiki kapal selam yang terinspirasi Nautilus untuk menjelajah laut dalam.',
      t: ['Menyelam', 'Kedalaman', 'Gua Bawah Laut', 'Sonar', 'Tekanan Air', 'Kepingan XIII'],
      g: ['Kenali kapal selam.', 'Semakin dalam, semakin…?', 'Lewati gua bawah laut!', 'Kenali hewan dengan sonar.', 'Mengapa laut dalam gelap?', 'Temukan Kepingan Kompas XIII!'],
      board: board(['S.#..', '.##.#', '....G'], 'E', null, { blockArt: ROCK }),
      play: { type: 'steer', mode: 'gates', vessel: 'sub' },
      more: [      gl('nautilus7', 'Peta Harta Karun', 'Ambil peta, lalu ikuti ke harta karun!', ['S#.', '.c.', '#.G'],
        { say: 'Ada peta tua di dasar laut! Ambil, lalu ikuti petunjuknya.', item: 'game/treasure-map', tools: PK, blk: ROCK, par: 5,
          fact: 'Di laut dalam, ada ikan yang bisa membuat cahaya sendiri.' }),
      gl('nautilus8', 'Gua Karang', 'Lewati gua karang. Arus mendorong ke bawah!', ['S.#.', '.v..', '#...', '..#G'],
        { say: 'Arus di dalam gua kuat sekali. Pakai arusnya untuk turun!', pic: 'tk-world/cave-island', blk: ['tk-world/cave-island', 'tk-world/arch-rock'], par: 5,
          fact: 'Kapal selam naik dan turun dengan mengisi tangkinya dengan air atau udara.' }),
      gl('nautilus9', 'Tiga Mutiara', 'Kumpulkan 3 mutiara, lalu ke bendera!', ['Sc....', '#c#cG#', '##...#', '......', '.<....'],
        { say: 'Tiga mutiara bersinar di lorong gelap. Kumpulkan semuanya!', item: 'game/gem-blue', tools: PK, blk: ['tk-world/arch-rock', 'gt-el/boulders'], par: 10,
          fact: 'Nautilus adalah kapal selam pertama yang melewati bawah es Kutub Utara.' })],
      cards: C(['nautilus-1', 'Nama dari Buku', 'Nama Nautilus berasal dari kapal selam dalam novel karya Jules Verne.'],
        ['nautilus-2', 'Kapal Selam Nyata', 'USS Nautilus (1954) adalah kapal selam pertama yang melewati bawah es Kutub Utara.'],
        ['nautilus-3', 'Sonar', 'Sonar memakai suara untuk "melihat" benda di bawah air.']) }),
    arc({ id: 'pelabuhan', name: 'Pelabuhan Waktu', year: null, value: 'Pulang ke Rumah', cat: 'penjelajahan', color: '#7A4FD6', scene: 'time-harbor', dom: 'campur',
      captain: { name: 'Penjaga Waktu', quote: 'Semua yang kamu pelajari akan membawamu pulang.' },
      intro: 'Pelabuhan ajaib tempat semua kapal legendaris bertemu.',
      t: ['Pelabuhan Ajaib', 'Ujian Campuran', 'Labirin Waktu', 'Arus & Es', 'Gerbang Terakhir', 'Kompas Utuh'],
      g: ['Selamat datang di Pelabuhan Waktu.', 'Jawab soal dari semua kapal.', 'Pakai semua perintah untuk keluar!', 'Arus dan es sekaligus!', 'Gerbang terakhir menuju rumah.', 'Satukan Kompas Waktu dan pulang!'],
      board: board(['Sc..', '..>.', '#...', '.d.G'], 'E', ['N', 'E', 'S', 'W', 'P', 'D', 'R2'], { blockArt: ICE, itemArt: 'game/gem-green' }),
      play: { type: 'steer', mode: 'current', vessel: 'boat' },
      more: [      gl('pelabuhan7', 'Dermaga Ajaib', 'Merapat di dermaga ajaib!', ['S.#', '..#', '#.G'],
        { say: 'Dermaga ajaib bersinar. Ayo merapat ke sana!', pic: 'gt-el/portal-blue', blk: ICE, par: 4,
          fact: 'Mercusuar membantu kapal menemukan pelabuhan pada malam hari.' }),
      gl('pelabuhan8', 'Kepingan Kompas', 'Ambil kepingan kompas, lalu taruh di tanda kuning!', ['S.#.', '.>c.', '#..#', '...d'],
        { say: 'Sebuah kepingan kompas jatuh ke air. Kembalikan ke tempatnya!', item: 'tk-prop/compass-3', blk: ['tk-world/whirlpool', 'tk-prop/iceberg-3'], par: 7,
          fact: 'Jarum kompas selalu menunjuk ke arah utara.' }),
      gl('pelabuhan9', 'Gerbang Waktu', 'Ambil 2 kepingan, awas es dan arus, lalu ke gerbang!', ['..#...', 'S.c.#.', '.#....', '...>.d', '#.c#..'],
        { say: 'Gerbang waktu hampir terbuka! Ambil dua kepingan terakhir, lalu antar ke gerbang.', item: 'tk-key/crystal', tools: ['N', 'E', 'S', 'W', 'P', 'D', 'R2', 'R3'],
          blk: ['tk-world/whirlpool', 'tk-prop/iceberg-5', 'tk-world/storm-cloud'], par: 11,
          ice: [{ path: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }, { x: 3, y: 2 }] }],
          fact: 'Pelaut zaman dulu memakai bintang di langit untuk menentukan arah.' })],
      cards: C(['pelabuhan-1', 'Kompas Waktu', 'Semua kepingan kompas sudah terkumpul.'],
        ['pelabuhan-2', 'Pelajaran Kapal', 'Setiap kapal mengajarkan sesuatu: berani, menolong, teliti, dan menjaga perdamaian.'],
        ['pelabuhan-3', 'Pulang', 'Timmy kembali ke kamarnya dengan kenangan dan ilmu baru.']) })
  ]
  OTHERS[OTHERS.length - 1].levels.filter(function (l) { return l.fragment })[0].finale = true

  var WORLDS = [BEDROOM, TITANIC].concat(OTHERS)
  // ship facts for the detail panel (mockup ui-04). Lengths are rounded public figures;
  // `verified:false` until an editor checks them (PRD QA: fact cards need editorial review)
  var SPEC = {
    titanic: ['Kapal penumpang', '269 m', 'Kisahnya yang terkenal dan keberanian para penumpangnya', 'Bahkan di saat paling gelap, kebaikan manusia bersinar paling terang.'],
    britannic: ['Kapal rumah sakit', '269 m', 'Merawat orang terluka di Perang Dunia I', 'Menolong orang lain adalah pekerjaan paling mulia.'],
    vasa: ['Kapal perang kayu', '69 m', 'Diangkat utuh dari dasar laut setelah 333 tahun', 'Dari kesalahan, kita belajar menjadi lebih baik.'],
    cuttysark: ['Kapal layar (clipper)', '85 m', 'Salah satu kapal layar tercepat pembawa teh', 'Kerja keras dan semangat membawa kita jauh.'],
    victory: ['Kapal kayu tua', '69 m', 'Kapal tua yang masih bisa dikunjungi di museum', 'Pemimpin yang baik mendengarkan orang lain.'],
    mayflower: ['Kapal layar', '30 m', 'Membawa keluarga menyeberangi Samudra Atlantik', 'Setiap awal yang baru butuh keberanian.'],
    endurance: ['Kapal ekspedisi', '44 m', 'Semua awaknya selamat berkat kerja sama', 'Jangan menyerah, tetap bersama.'],
    kontiki: ['Rakit kayu balsa', '14 m', 'Menyeberangi Samudra Pasifik dengan rakit', 'Berani mencoba hal baru.'],
    calypso: ['Kapal peneliti', '43 m', 'Mengenalkan dunia bawah laut kepada banyak orang', 'Laut adalah rumah yang harus kita jaga.'],
    queenmary: ['Kapal penumpang', '311 m', 'Kini menjadi hotel dan museum terapung', 'Tepat waktu membuat semua orang senang.'],
    arizona: ['Kapal angkatan laut', '185 m', 'Monumen untuk mengenang dan belajar tentang damai', 'Kita mengenang agar menjaga perdamaian.'],
    missouri: ['Kapal angkatan laut', '271 m', 'Tempat penandatanganan perdamaian tahun 1945', 'Perdamaian lebih kuat dari apa pun.'],
    nautilus: ['Kapal selam', '98 m', 'Kapal selam pertama yang melintas di bawah es Kutub Utara', 'Dunia yang tak terlihat juga layak dijelajahi.'],
    pelabuhan: ['Pelabuhan ajaib', '—', 'Tempat semua kapal legendaris bertemu', 'Semua yang kamu pelajari akan membawamu pulang.'],
    kamar: ['Kamar Timmy', '—', 'Awal dari semua petualangan', 'Setiap petualangan besar dimulai dari mimpi.']
  }
  WORLDS.forEach(function (w) { var x = SPEC[w.id]; if (x) w.spec = { type: x[0], length: x[1], famous: x[2], quote: x[3], verified: false } })
  // ease ladder (owner 2026-09-28: "easy to be played, tapi cakep"): the first 3 grid boards of every world
  // are EASY (only the commands the route needs, forgiving stars, coach on first visit); the very first
  // grid of the game always shows the coach. The first steer level of every world is the slow, assisted one.
  var EASY_GRIDS = 3
  var gameFirstGrid = null
  // every playable level of a world in play order: a chapter contributes its steps (the chapter itself is
  // a container, not a level); worlds without chapters return their levels as they are
  function flat (w) {
    var out = []
    ;(w && w.levels || []).forEach(function (lv) { if (lv.type === 'chapter') (lv.steps || []).forEach(function (s) { out.push(s) }); else out.push(lv) })
    return out
  }
  WORLDS.forEach(function (w) {
    var g = 0, st = 0
    flat(w).forEach(function (lv) {
      if (lv.type === 'grid') { lv.gridNo = ++g; if (!gameFirstGrid) gameFirstGrid = lv }
      if (lv.type === 'steer') lv.steerNo = ++st
    })
  })
  var CATS = [['semua', 'Semua Kapal'], ['penjelajahan', 'Penjelajahan'], ['tragedi', 'Tragedi'], ['perang-damai', 'Perang & Damai'], ['sains', 'Sains']]

  /* board text -> TKGrid definition */
  function grid (lv) {
    var b = lv.board, rows = b.rows, def = { w: rows[0].length, h: rows.length, blocks: [], items: [], currents: [], tools: b.tools.slice(), ice: b.ice || [] }
    var CUR = { '>': 'E', '<': 'W', '^': 'N', v: 'S' }
    rows.forEach(function (r, y) {
      for (var x = 0; x < r.length; x++) {
        var ch = r[x]
        if (ch === 'S') def.start = { x: x, y: y, dir: b.dir }
        else if (ch === 'G') def.goal = { x: x, y: y }
        else if (ch === '#') def.blocks.push({ x: x, y: y })
        else if (ch === 'c') def.items.push({ x: x, y: y, id: 'peti' })
        else if (ch === 'd') def.drop = { x: x, y: y }
        else if (CUR[ch]) def.currents.push({ x: x, y: y, dir: CUR[ch] })
      }
    })
    if (!def.goal && def.drop) def.goal = { x: def.drop.x, y: def.drop.y }
    // look (read by TKGrid.mount): theme 'sea' | 'deck', obstacle + cargo sprites, backdrop scene
    def.id = lv.id; def.title = lv.title; def.mission = lv.goal
    if (b.maxLen) def.maxLen = b.maxLen
    if (lv.hint) def.hint = lv.hint          // Timmy's idle line
    if (lv.fact) def.tip = lv.fact           // the penguin tip card (read by TKGrid once it takes def.tip)
    if (b.par) def.par = b.par
    def.theme = b.theme === 'deck' ? 'deck' : 'sea'
    if (b.blockArt) def.blockArt = b.blockArt.slice ? b.blockArt.slice() : b.blockArt
    if (b.itemArt) def.itemArt = b.itemArt
    if (lv.scene) def.scene = lv.scene
    def.easy = b.easy != null ? !!b.easy : !(lv.gridNo > EASY_GRIDS)
    // owner "no help" rule: only the tutorial room's first two boards trim the palette to the arrows the route needs
    if (lv.id === 'k2' || lv.id === 'k3') def.trim = true
    def.coach = lv === gameFirstGrid ? 'always' : 'first'
    return def
  }
  // steer level -> TKSteer level: kid assist on everywhere, the first steer level of a world is the slow one
  function steer (lv) {
    return { mode: lv.mode, vessel: lv.vessel, goal: lv.goal, assist: lv.assist !== false, first: lv.steerNo === 1, id: lv.id }
  }
  // TKSteer looks a level up by its goal text when the host passes only { mode, vessel, goal }
  function findSteer (goal, mode) {
    for (var i = 0; i < WORLDS.length; i++) {
      var L = flat(WORLDS[i])
      for (var j = 0; j < L.length; j++) if (L[j].type === 'steer' && L[j].goal === goal && (!mode || L[j].mode === mode)) return steer(L[j])
    }
    return null
  }

  W.TKWorlds = { WORLDS: WORLDS, CATS: CATS, grid: grid, steer: steer, findSteer: findSteer, flat: flat, LEGACY: { titanic: TITANIC_LEGACY },
    get: function (id) { for (var i = 0; i < WORLDS.length; i++) if (WORLDS[i].id === id) return WORLDS[i]; return null } }
  if (typeof module !== 'undefined' && module.exports) module.exports = W.TKWorlds
})()
