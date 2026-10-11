/* =============================================================================
 * kereta-pack-levels-hellbent.js — "Lomba ke Kota" on the MOJO engine (owner 2026-10-11). A kid-friendly race to the town
 * festival between the bright silver streamliner Kilat Perak and the sleepy old "Defeatist Limited" engine, Tuan Lemas,
 * who keeps wanting to give up. Theme: do not give up, help each other. No war content beyond the text printed on the
 * sprites. Chapter 1 = the first four levels (adapted from the ten of data/kereta-levels-hellbent.js); the rest follow.
 * Own cast only: train-char/silver + defeatist and shared scenery.
 * ==========================================================================*/
(function (W) {
  'use strict'
  var MOVE = ['up', 'down', 'west', 'east']
  var CHAPTERS = [{ id: 'hb-ch1', title: 'Mulai Lomba', sub: 'Bab 1' }, { id: 'hb-ch2', title: 'Jalan Bersama', sub: 'Bab 2' }, { id: 'hb-ch3', title: 'Pesta di Kota', sub: 'Bab 3' }]
  var REGIONS = [{ id: 'hb-ch1', title: 'Mulai Lomba', bg: 'bg-hb-start', card: 'card-hb-start', open: true, levels: ['hb01', 'hb02', 'hb03', 'hb04'] },
    { id: 'hb-ch2', title: 'Jalan Bersama', bg: 'bg-hb-padang', card: 'card-hb-padang', open: true, levels: ['hb05', 'hb06', 'hb07'] },
    { id: 'hb-ch3', title: 'Pesta di Kota', bg: 'bg-hb-kota', card: 'card-hb-kota', open: true, levels: ['hb08', 'hb09', 'hb10'] }]
  var LIB = {
    'train/lemas': 'train-char/defeatist/34l-sad', 'train/lemas-b': 'train-char/defeatist/34l-neutral', 'obj/semangat': 'mojo-prop/star', 'obj/hb-batu': 'kereta-prop/coal-pile',
    'train/hb-gerbong': 'mojo-train/coach-slip', 'obj/hb-panggung': 'kereta-prop/station-small', 'obj/hb-sinyal': 'kereta-tile/signal-red'
  }
  function L (o) { o.ch = o.ch || 'hb-ch1'; o.rev = 1; o.autoAim = true; return o }
  var LEVELS = [
    // 01 the starting whistle: Kilat waits for the signal to turn, then races to the line
    L({ id: 'hb01', cards: [
        { bg: 'bg-hb-start', art: [{ k: 'train-char/silver/front-34l', x: 36, s: 58 }], text: 'Pesta Besar di kota hari ini! Kilat Perak siap berlomba.' }
      ], terrain: 'meadow', mood: 'sun', n: 1, title: 'Peluit Tanda Mulai', place: 'Garis Start', icon: 'cmd/wait', bg: 'bg-hb-start', edu: { domain: 'algoritma', skill: 'menunggu giliran' },
      grid: { rows: 3, cols: 8, map: [',T,.,,T,', '........', ',,T.,,,,'], theme: 'town' },
      mojo: { at: [1, 0], h: 'E', form: 'kilat' },
      decor: [{ at: [2, 6], art: 'animal/bird-blue/fly' }],
      objects: [
        { id: 'sinyal', type: 'patrol', at: [0, 3], name: 'Kelinci', art: 'animal/rabbit/run', path: [[0, 3], [1, 3], [2, 3], [2, 3], [1, 3], [0, 3]], phase: 2 },
        { id: 'flag', type: 'flag', at: [1, 7] }
      ],
      beats: [{ title: 'Tunggu aba-aba', story: 'Hari ini ada Pesta Besar di kota. Lomba dimulai!',
        bo: 'Tunggu kelinci lewat, lalu ke bendera.', objectives: [{ 'do': 'reach', at: [1, 7] }], slots: 11, budget: 8, forms: ['kilat'], palette: ['east', 'wait'] }] }),

    // 02 Tuan Lemas stops at the red signal and wants to give up: bring him a "semangat" star
    L({ id: 'hb02', cards: [
        { bg: 'bg-hb-padang', art: [{ k: 'train-char/defeatist/front-34l', x: 36, s: 58 }], text: 'Tuan Lemas berhenti di sinyal merah. Ia mau menyerah.' }
      ], terrain: 'meadow', mood: 'sun', n: 2, title: 'Tuan Lemas Mau Menyerah', place: 'Sinyal Merah', icon: 'cmd/pick', bg: 'bg-hb-padang', edu: { domain: 'matematika', skill: 'membilang 1-2' },
      grid: { rows: 3, cols: 8, map: [',,,,,,,,', '........', ',.,.,,,,'], theme: 'town' },
      mojo: { at: [1, 0], h: 'E', form: 'kilat' },
      decor: [{ at: [0, 2], art: 'kereta-prop/pine' }],
      objects: [
        { id: 'b1', type: 'parcel', at: [2, 1], kind: 'semangat', name: 'Bintang semangat', art: 'obj/semangat' },
        { id: 'b2', type: 'parcel', at: [2, 3], kind: 'semangat', name: 'Bintang semangat', art: 'obj/semangat' },
        { id: 'lemas', type: 'stop', at: [0, 6], accepts: 'semangat', need: 2, art: 'train/lemas', art2: 'train/lemas-b', name: 'Tuan Lemas', pay: 'wave' }
      ],
      beats: [{ title: 'Semangati Tuan Lemas', story: 'Tuan Lemas berkata, aku menyerah saja.',
        bo: 'Turunkan dua bintang di Tuan Lemas.', objectives: [{ 'do': 'deliver', id: 'lemas' }], slots: 20, budget: 16, forms: ['kilat'], palette: MOVE.concat(['pick', 'deliver']) }] }),

    // 03 Tuan Lemas runs out of coal: fill his furnace so he can go on
    L({ id: 'hb03', cards: [
        { bg: 'bg-hb-padang', art: [{ k: 'train-char/defeatist/front-34l', x: 10, s: 58 }, { k: 'train-char/silver/front-34l', x: 54, s: 58 }], text: 'Tuan Lemas kehabisan batu bara. Kilat mau membantu.' }
      ], terrain: 'meadow', mood: 'sun', n: 5, title: 'Batu Bara untuk Tuan Lemas', place: 'Padang Hijau', icon: 'cmd/load', bg: 'bg-hb-padang', edu: { domain: 'matematika', skill: 'membilang 1-2' },
      grid: { rows: 3, cols: 8, map: [',,,,,,,,', '........', ',,,,,,,,'], theme: 'town' },
      mojo: { at: [1, 3], h: 'E', form: 'kilat' },
      res: { sand: 0 }, cap: { sand: 2 },
      decor: [{ at: [2, 6], art: 'animal/deer/graze' }],
      objects: [
        { id: 'tumpukan', type: 'pile', at: [0, 1], res: 'sand', n: 1, art: 'obj/hb-batu', name: 'Batu bara' },
        { id: 'tungku', type: 'hole', at: [1, 6], need: 2, res: 'sand', art: 'train/lemas', name: 'Tungku Tuan Lemas' },
        { id: 'flag', type: 'flag', at: [1, 7] }
      ],
      beats: [{ title: 'Isi tungku Tuan Lemas', story: 'Tuan Lemas kehabisan batu bara.',
        bo: 'Isi tungku Tuan Lemas, lalu ke bendera.', objectives: [{ 'do': 'fill', id: 'tungku' }, { 'do': 'reach', at: [1, 7] }], slots: 16, budget: 12, forms: ['kilat'], palette: ['east', 'west', 'up', 'load', 'dump'] }] }),

    // 04 the climb is heavy for Tuan Lemas: Kilat takes his two wagons up the hill and into the festival town
    L({ id: 'hb04', cards: [
        { bg: 'bg-hb-kota', art: [{ k: 'train-char/defeatist/front-34l', x: 10, s: 58 }, { k: 'train-char/silver/front-34l', x: 54, s: 58 }], text: 'Tanjakan terasa berat. Mereka mendaki bersama.' }
      ], terrain: 'meadow', mood: 'sunset', n: 6, title: 'Tanjakan yang Berat', place: 'Kaki Bukit', icon: 'cmd/couple', bg: 'bg-hb-kota', edu: { domain: 'matematika', skill: 'membilang 1-2' },
      grid: { rows: 4, cols: 8, map: [',,,,,,,.', '........', ',.,.,,,,', ',,,,,,,,'], theme: 'hill' },
      mojo: { at: [1, 0], h: 'E', form: 'kilat' },
      decor: [{ at: [3, 5], art: 'train/lemas-b' }],
      objects: [
        { id: 'g1', type: 'wagon', at: [2, 1], art: 'train/hb-gerbong', name: 'Gerbong pertama' },
        { id: 'g2', type: 'wagon', at: [2, 3], art: 'train/hb-gerbong', name: 'Gerbong kedua' },
        { id: 'flag', type: 'flag', at: [0, 7] }
      ],
      beats: [{ title: 'Bantu naik tanjakan', story: 'Kilat membantu menarik gerbong Tuan Lemas.',
        bo: 'Gandeng dua gerbong, lalu ke bendera.', objectives: [{ 'do': 'wagons', n: 2 }, { 'do': 'reach', at: [0, 7] }], slots: 14, budget: 10, forms: ['kilat'], palette: ['up', 'east', 'down', 'couple'] }] }),
    // ── Bab 2 "Jalan Bersama" (old hb03/04/07): help each other on the shared line ──────────────
    // 05 the bridge holds one train: Kilat waits for Tuan Lemas to cross, then crosses (be patient)
    L({ id: 'hb05', cards: [
        { bg: 'bg-hb-padang', art: [{ k: 'train-char/silver/front-34l', x: 10, s: 58 }, { k: 'train-char/defeatist/front-34l', x: 54, s: 58 }], text: 'Jembatan kecil hanya muat satu kereta.' },
        { bg: 'bg-hb-padang', art: [{ k: 'train-char/defeatist/front-34l', x: 36, s: 58 }], text: 'Mereka bergiliran. Sabar itu baik.' }
      ], ch: 'hb-ch2', terrain: 'meadow', mood: 'sun', n: 4, title: 'Jembatan Satu Kereta', place: 'Jembatan Kecil', icon: 'cmd/wait', bg: 'bg-hb-padang', edu: { domain: 'algoritma', skill: 'bergiliran' },
      grid: { rows: 4, cols: 8, map: [',,,.,,,,', '...=....', ',,,.,,,,', ',T,,,,,,'], theme: 'town' },
      mojo: { at: [1, 0], h: 'E', form: 'kilat' },
      decor: [{ at: [3, 5], art: 'animal/deer/graze' }],
      objects: [
        { id: 'lemas', type: 'patrol', at: [0, 3], name: 'Tuan Lemas', art: 'train/lemas-b', path: [[0, 3], [1, 3], [2, 3], [2, 3], [1, 3], [0, 3]], phase: 2 },
        { id: 'flag', type: 'flag', at: [1, 7] }
      ],
      beats: [{ title: 'Giliran di jembatan', story: 'Jembatan hanya cukup untuk satu kereta. Sabar!',
        bo: 'Tunggu Tuan Lemas lewat, lalu ke bendera.', objectives: [{ 'do': 'reach', at: [1, 7] }], slots: 11, budget: 8, forms: ['kilat'], palette: ['east', 'wait'] }] }),

    // 06 Tuan Lemas is stuck at his signal box: Kilat opens it for him, then they go on (help each other)
    L({ id: 'hb06', cards: [
        { bg: 'bg-hb-padang', art: [{ k: 'train-char/defeatist/front-34l', x: 36, s: 58 }], text: 'Kotak sinyal Tuan Lemas macet. Kilat mau membukanya.' }
      ], ch: 'hb-ch2', terrain: 'meadow', mood: 'sun', n: 3, title: 'Kilat Membuka Sinyal', place: 'Kotak Sinyal', icon: 'cmd/east', bg: 'bg-hb-padang', edu: { domain: 'algoritma', skill: 'urutan' },
      grid: { rows: 4, cols: 8, map: [',,,,,,,,', '........', ',,T,,,,,', ',,,,,,,,'], theme: 'town' },
      mojo: { at: [1, 0], h: 'E', form: 'kilat' },
      decor: [{ at: [2, 5], art: 'train/lemas', react: 'train/lemas-b' }, { at: [0, 6], art: 'animal/bird-blue/fly' }],
      objects: [
        { id: 'sinyal', type: 'mark', at: [1, 4], order: 1, seq: 'sinyal', art: 'obj/hb-sinyal', name: 'Sinyal' },
        { id: 'flag', type: 'flag', at: [1, 7] }
      ],
      beats: [{ title: 'Buka sinyalnya', story: 'Kilat membuka sinyal supaya Tuan Lemas bisa jalan.',
        bo: 'Buka sinyal, lalu ke bendera.', objectives: [{ 'do': 'visit', id: 'sinyal' }, { 'do': 'reach', at: [1, 7] }], slots: 11, budget: 7, forms: ['kilat'], palette: ['east'] }] }),

    // 07 BIG: the tunnel. Kilat takes the upper line, waits while Tuan Lemas comes the other way, passes with a wave, then returns
    L({ id: 'hb07', cards: [
        { bg: 'bg-hb-start', art: [{ k: 'train-char/silver/front-34l', x: 8, s: 58 }, { k: 'train-char/defeatist/front-34l', x: 56, s: 58 }], text: 'Dua kereta datang dari arah berlawanan, menuju terowongan.' }
      ], ch: 'hb-ch2', big: true, quiet: true, terrain: 'mountain', mood: 'sunset', n: 7, title: 'Berpapasan di Terowongan', place: 'Petualangan Besar', icon: 'cmd/wait', bg: 'bg-hb-start',
      bgs: ['bg-hb-start', 'bg-hb-padang'], edu: { domain: 'campuran', skill: 'bergiliran' },
      celebrate: [],
      grid: { rows: 4, cols: 8, map: [',,,,.,,,', '........', ',,,,.,,,', ',,T,,,,,'], theme: 'hill' },
      mojo: { at: [1, 0], h: 'E', form: 'kilat' },
      objects: [
        { id: 'lemas', type: 'patrol', at: [0, 4], name: 'Tuan Lemas', art: 'train/lemas-b', path: [[0, 4], [1, 4], [2, 4], [2, 4], [1, 4], [0, 4]], phase: 1 },
        { id: 'f1', type: 'flag', at: [1, 7] },
        { id: 'f2', type: 'flag', at: [1, 0] }
      ],
      beats: [
        { title: 'Masuk terowongan', story: 'Tuan Lemas datang dari arah lain. Kilat menunggu.', hide: ['f2'],
          decor: [{ at: [0, 7], art: 'kereta-tile/tunnel-portal' }, { at: [3, 5], art: 'animal/rabbit/sit' }],
          bo: 'Tunggu Tuan Lemas, lalu ke bendera.', objectives: [{ 'do': 'reach', at: [1, 7] }], slots: 11, budget: 8, forms: ['kilat'], palette: ['east', 'wait'] },
        { title: 'Berpapasan sambil melambai', story: 'Mereka berpapasan dengan senyum. Kilat pulang.', hide: ['f1'], start: { at: [1, 6], h: 'W' },
          decor: [{ at: [0, 7], art: 'kereta-tile/tunnel-portal' }, { at: [3, 5], art: 'animal/rabbit/sit' }],
          bo: 'Tunggu Tuan Lemas, lalu ke bendera.', objectives: [{ 'do': 'reach', at: [1, 0] }], slots: 10, budget: 7, forms: ['kilat'], palette: ['west', 'wait'] }
      ] }),

    // ── Bab 3 "Pesta di Kota" (old hb08/09/10): give way, arrive together, the party ─────────────
    // 08 Kilat gives way: he steps onto the side track, lets Tuan Lemas cross, then goes on
    L({ id: 'hb08', cards: [
        { bg: 'bg-hb-padang', art: [{ k: 'train-char/defeatist/front-34l', x: 10, s: 58 }, { k: 'train-char/silver/front-34l', x: 54, s: 58 }], text: 'Tuan Lemas jalan pelan. Kilat memberi jalan.' }
      ], ch: 'hb-ch3', terrain: 'meadow', mood: 'sun', n: 8, title: 'Kilat Memberi Jalan', place: 'Jalur Samping', icon: 'cmd/down', bg: 'bg-hb-padang', edu: { domain: 'algoritma', skill: 'memberi jalan' },
      grid: { rows: 4, cols: 8, map: [',,,,,.,,', '........', ',,,.,.,,', ',,,.,,,,'], theme: 'town' },
      mojo: { at: [1, 0], h: 'E', form: 'kilat' },
      decor: [{ at: [3, 6], art: 'kereta-prop/pine' }],
      objects: [
        { id: 'samping', type: 'mark', at: [3, 3], order: 1, seq: 'samping', art: 'obj/hb-sinyal', name: 'Jalur samping' },
        { id: 'lemas', type: 'patrol', at: [0, 5], name: 'Tuan Lemas', art: 'train/lemas-b', path: [[0, 5], [1, 5], [2, 5], [2, 5], [1, 5], [0, 5]], phase: 2 },
        { id: 'flag', type: 'flag', at: [1, 7] }
      ],
      beats: [{ title: 'Minggir dulu', story: 'Tuan Lemas jalan pelan. Kilat memberi jalan.',
        bo: 'Ke jalur samping, lalu ke bendera.', objectives: [{ 'do': 'visit', id: 'samping' }, { 'do': 'reach', at: [1, 7] }], slots: 16, budget: 12, forms: ['kilat'], palette: ['east', 'west', 'down', 'up', 'wait'] }] }),

    // 09 arrive together: Kilat hitches Tuan Lemas behind him and brings him over the line (nobody is left behind)
    L({ id: 'hb09', cards: [
        { bg: 'bg-hb-kota', art: [{ k: 'train-char/silver/front-34l', x: 10, s: 58 }, { k: 'train-char/defeatist/front-34l', x: 54, s: 58 }], text: 'Garis akhir sudah terlihat. Tidak ada yang tertinggal.' }
      ], ch: 'hb-ch3', cine: { end: { fx: [{ id: 'bk-star-02', at: [1, 7], size: 180, n: 2, spread: 40 }, { id: 'bk-light-02', at: [1, 7], size: 260, delay: 250 }] } }, terrain: 'town', mood: 'sunset', n: 9, title: 'Tiba Bersama', place: 'Garis Akhir', icon: 'cmd/couple', bg: 'bg-hb-kota', edu: { domain: 'matematika', skill: 'membilang 1' },
      grid: { rows: 4, cols: 8, map: [',,,,,,,,', '........', ',.,,,,,,', ',,,,,,,,'], theme: 'town' },
      mojo: { at: [1, 0], h: 'E', form: 'kilat' },
      decor: [{ at: [3, 5], art: 'animal/deer/graze' }, { at: [0, 6], art: 'kereta-prop/pine' }],
      objects: [
        { id: 'lemas', type: 'wagon', at: [2, 1], art: 'train/lemas', name: 'Tuan Lemas' },
        { id: 'flag', type: 'flag', at: [1, 7] }
      ],
      beats: [{ title: 'Jangan tinggalkan teman', story: 'Kilat menggandeng Tuan Lemas. Mereka tiba bersama.',
        bo: 'Gandeng Tuan Lemas, lalu ke garis akhir bendera.', objectives: [{ 'do': 'wagons', n: 1 }, { 'do': 'reach', at: [1, 7] }], slots: 11, budget: 8, forms: ['kilat'], palette: ['east', 'down', 'up', 'couple'] }] }),

    // 10 BIG: the party in town. Flag and star go to their stages, then the two friends cross the finish line together
    L({ id: 'hb10', cards: [
        { bg: 'bg-hb-kota', art: [{ k: 'train-char/silver/front-34l', x: 36, s: 58 }], text: 'Pesta Besar dimulai di kota!' },
        { bg: 'bg-hb-kota', art: [{ k: 'train-char/silver/front-34l', x: 10, s: 58 }, { k: 'train-char/defeatist/front-34l', x: 54, s: 58 }], text: 'Dua sahabat tidak pernah menyerah. Mereka tiba bersama.' }
      ], ch: 'hb-ch3', big: true, cine: { end: { letterbox: 2400, fx: [{ id: 'bk-star-02', at: [1, 7], size: 220, n: 3, spread: 50 }, { id: 'bk-light-02', at: [1, 7], size: 320, delay: 300 }] } }, terrain: 'town', mood: 'sunset', n: 10, title: 'Pesta di Kota', place: 'Petualangan Besar', icon: 'cmd/deliver', bg: 'bg-hb-kota',
      bgs: ['bg-hb-kota', 'bg-hb-kota', 'bg-hb-kota'], edu: { domain: 'campuran', skill: 'urutan perjalanan' },
      celebrate: [],
      grid: { rows: 4, cols: 8, map: [',,,.,.,,', '........', ',,.,,,.,', ',,,,,,,,'], theme: 'town' },
      mojo: { at: [1, 0], h: 'E', form: 'kilat' },
      decor: [{ at: [3, 4], art: 'animal/deer/graze' }, { at: [3, 1], art: 'animal/bird-blue/fly' }],
      objects: [
        { id: 'bendera', type: 'parcel', at: [0, 3], kind: 'bendera', name: 'Bendera pesta', art: 'game/flag-red' },
        { id: 'bintang', type: 'parcel', at: [0, 5], kind: 'bintang', name: 'Bintang', art: 'obj/semangat' },
        { id: 'panggung', type: 'stop', at: [2, 6], accepts: 'bendera', art: 'obj/hb-panggung', name: 'Panggung pesta', pay: 'horn' },
        { id: 'piala', type: 'stop', at: [2, 2], accepts: 'bintang', art: 'game/trophy-cup', name: 'Panggung bintang', pay: 'horn' },
        { id: 'flag', type: 'flag', at: [1, 7] }
      ],
      beats: [
        { title: 'Bendera untuk panggung', story: 'Ada pesta besar di kota. Pasang bendera dulu.', hide: ['bintang', 'piala', 'flag'],
          bo: 'Antar bendera ke panggung pesta.', objectives: [{ 'do': 'deliver', id: 'panggung' }], slots: 11, budget: 8, forms: ['kilat'], palette: MOVE.concat(['pick', 'deliver']) },
        { title: 'Bintang untuk panggung', story: 'Sekarang bintang semangat untuk panggung bintang.', hide: ['bendera', 'panggung', 'flag'], start: { at: [1, 4], h: 'E' },
          bo: 'Antar bintang ke panggung bintang.', objectives: [{ 'do': 'deliver', id: 'piala' }], slots: 9, budget: 6, forms: ['kilat'], palette: MOVE.concat(['pick', 'deliver']) },
        { title: 'Garis akhir bersama', story: 'Pesta dimulai. Dua sahabat tidak pernah menyerah!', hide: ['bendera', 'bintang', 'panggung', 'piala'], start: { at: [1, 3], h: 'E' },
          bo: 'Bawa Kilat ke bendera di garis akhir.', objectives: [{ 'do': 'reach', at: [1, 7] }], slots: 7, budget: 4, forms: ['kilat'], palette: ['east'] }
      ] })

  ]
  var NARR = { name: 'Kilat', full: 'Kilat Perak', art: { wave: 'train-char/silver/face-happy', think: 'train-char/silver/face-happy', celebrate: 'train-char/silver/face-happy', tools: 'train-char/silver/face-happy' } }
  var STORY = { id: 'hellbent', hero: 'kilat', heroName: 'Kilat Perak', narrator: NARR, saveKey: 'dunia-g15k-kereta-hellbent', logo: ['Lomba', 'ke Kota'], docTitle: 'Lomba ke Kota', collection: 'Teman-Teman Lomba',
    heroes: { kilat: { name: 'Kilat Perak', sprite: 'silver', color: '#8FA3B8' } },
    pins: { 'hb-ch1': [20, 55], 'hb-ch2': [50, 38], 'hb-ch3': [80, 52] },
    cast: [
      { id: 'kilat', name: 'Kilat Perak', ability: 'Kereta perak yang cepat dan mau membantu.', key: 'train-char/silver/34l-happy' },
      { id: 'lemas', name: 'Tuan Lemas', ability: 'Lokomotif tua yang gampang menyerah. Semangati dia!', key: 'train-char/defeatist/34l-neutral' }
    ] }
  W.KeretaPackLevels = { HERO: 'kilat', STORY: STORY, CHAPTERS: CHAPTERS, REGIONS: REGIONS, LEVELS: LEVELS, LIB: LIB }
})(typeof window !== 'undefined' ? window : globalThis)
