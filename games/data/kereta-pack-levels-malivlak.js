/* =============================================================================
 * kereta-pack-levels-malivlak.js — "Dragutin dan Malivlak" on the MOJO engine (owner 2026-10-11: four storylines under
 * "Lokomotif Pemberani"). Chapter 1 = scenarios 1-5 of Dragutin_Malivlak_20_Skenario_Detail.md (the station, loading, leaving
 * for the countryside, Malivlak and his three coaches, Dragutin overtaking). Its own cast only (malivlak-char/*, train-char/
 * dragutin + malivlak). Same schema and rules as kereta-pack-levels.js; every level is proved solvable by qa-kereta-pack.
 * Game additions (loading by Malivlak, the porter's trolley) are labelled adaptations that serve each scenario's endpoint.
 * ==========================================================================*/
(function (W) {
  'use strict'
  var MOVE = ['up', 'down', 'west', 'east']
  var CHAPTERS = [{ id: 'mv-ch1', title: 'Stasiun dan Pedesaan', sub: 'Bab 1' }, { id: 'mv-ch2', title: 'Ladang dan Kolam', sub: 'Bab 2' }, { id: 'mv-ch3', title: 'Gunung dan Terowongan', sub: 'Bab 3' }, { id: 'mv-ch4', title: 'Penyambutan dan Museum', sub: 'Bab 4' }]
  var REGIONS = [{ id: 'mv-ch1', title: 'Stasiun dan Pedesaan', bg: 'bg-mv-stasiun', card: 'card-mv-stasiun', open: true, levels: ['mv01', 'mv02', 'mv03', 'mv04', 'mv05'] },
    { id: 'mv-ch2', title: 'Ladang dan Kolam', bg: 'bg-mv-ladang', card: 'card-mv-pedesaan', open: true, levels: ['mv06', 'mv07', 'mv08', 'mv09', 'mv10'] },
    { id: 'mv-ch3', title: 'Gunung dan Terowongan', bg: 'bg-mv-gunung-terowongan', card: 'card-mv-pegunungan', open: true, levels: ['mv11', 'mv12', 'mv13', 'mv14'] },
    { id: 'mv-ch4', title: 'Penyambutan dan Museum', bg: 'bg-mv-penyambutan', card: 'card-mv-penyambutan', open: true, levels: ['mv15', 'mv16', 'mv17', 'mv18', 'mv19', 'mv20'] }]
  var LIB = {
    'char/mv-ungu': 'malivlak-char/penumpang-ungu/berdiri', 'char/mv-ungu-koper': 'malivlak-char/penumpang-ungu/koper', 'char/mv-jas': 'malivlak-char/penumpang-jas-kotak/jam-saku',
    'char/mv-petugas': 'malivlak-char/petugas-stasiun/berdiri', 'char/mv-peluit': 'malivlak-char/petugas-stasiun/peluit', 'char/mv-bendera': 'malivlak-char/petugas-stasiun/bendera-bawah',
    'char/mv-bagasi': 'malivlak-char/petugas-bagasi/angkat', 'char/mv-koper-besar': 'malivlak-char/petugas-bagasi/koper-besar', 'char/mv-masinis': 'malivlak-char/masinis/pipa-2', 'char/mv-masinis-jalan': 'malivlak-char/masinis/jalan',
    'obj/mv-koper': 'kereta-prop/luggage-pile', 'obj/mv-surat': 'kereta-prop/mail-sacks', 'train/dragutin': 'train-char/dragutin/34l-neutral', 'train/dragutin-b': 'train-char/dragutin/34r-neutral',
    'train/mv-gerbong': 'train-char/mv-coach-green/side', 'train/mv-tender': 'train-char/mv-tender/side', 'train/mv-oranye': 'train-char/mv-coach-orange/side', 'train/mv-biru': 'train-char/mv-coach-blue/side', 'char/mv-ungu-rebah': 'malivlak-char/penumpang-ungu/rebah', 'obj/peron': 'kereta-prop/station-small', 'obj/loket': 'kereta-prop/ticket-booth', 'obj/mv-van': 'vehicles/car-red', 'obj/mv-lampu': 'kereta-prop/lantern',
    'char/mv-lari': 'malivlak-char/penumpang-ungu/lari', 'char/mv-masinis-ikan': 'malivlak-char/masinis/ikan', 'char/mv-masinis-wajan': 'malivlak-char/masinis/wajan', 'char/mv-masinis-kaget': 'malivlak-char/masinis/terkejut',
    'char/mv-beruang': 'animal/beruang/duduk', 'char/mv-ungu-duduk': 'malivlak-char/penumpang-ungu/duduk', 'obj/mv-perban': 'kereta-prop/wheel-bandage', 'char/mv-masinis-pipa': 'malivlak-char/masinis/pipa-2', 'obj/mv-ikan': 'animal/ikan/samping', 'obj/mv-wajan': 'kereta-prop/frying-pan-egg', 'train/dragutin-c': 'train-char/dragutin/34l-happy'
  }
  function L (o) { o.ch = o.ch || 'mv-ch1'; o.rev = 1; o.autoAim = true; o.bg = o.bg || 'bg-mv-stasiun'; return o }
  var LEVELS = [
    // 01 Dragutin arrives at the station and stops level with the platform: the first lesson is only to drive
    L({ id: 'mv01', terrain: 'depot', mood: 'sun', n: 1, title: 'Dragutin Tiba di Stasiun', place: 'Stasiun Kecil', icon: 'cmd/east', edu: { domain: 'algoritma', skill: 'urutan' },
      grid: { rows: 4, cols: 8, map: ['........', ',,,.,,,,', ',,,.,,,,', '........'], theme: 'town' },
      mojo: { at: [0, 0], h: 'E', form: 'dragutin' },
      sign: { at: [1, 4], text: 'STASIUN', w: 2 },
      decor: [{ at: [2, 5], art: 'char/mv-petugas' }, { at: [1, 6], art: 'char/mv-jas' }, { at: [1, 2], art: 'char/mv-ungu' }, { at: [2, 0], art: 'obj/loket' }],
      objects: [{ id: 'flag', type: 'flag', at: [3, 7] }],
      beats: [{ title: 'Berhenti di peron', story: 'Dragutin masuk stasiun dan berhenti di peron.',
        bo: 'Bawa Dragutin ke bendera di peron.', objectives: [{ 'do': 'reach', at: [3, 7] }], slots: 13, budget: 10, forms: ['dragutin'], palette: ['down', 'east'] }] }),

    // 02 film 1:00-1:21: the PORTER (kuli bagasi, in the film's overalls) carries the suitcases, the mail sacks and the letters into Dragutin; Malivlak is not in this scene
    L({ id: 'mv02', walk: true, uses: ['malivlak-char/petugas-bagasi/angkat', 'malivlak-char/petugas-bagasi/koper-besar'], terrain: 'depot', mood: 'sun', n: 2, title: 'Penumpang, Koper, Surat', place: 'Peron Stasiun', icon: 'cmd/pick', edu: { domain: 'matematika', skill: 'membilang 1-2' },
      grid: { rows: 4, cols: 8, map: [',,,,,,,,', '........', ',.,.,.,,', ',,,,,,,,'], theme: 'town' },
      mojo: { at: [1, 0], h: 'E', form: 'kuli' },
      decor: [{ at: [0, 5], art: 'char/mv-petugas' }, { at: [3, 3], art: 'char/mv-ungu-koper' }, { at: [0, 2], art: 'char/mv-jas' }, { at: [3, 7], art: 'obj/mv-van' }],
      objects: [
        { id: 'koper', type: 'parcel', at: [2, 1], kind: 'barang', name: 'Koper', art: 'obj/mv-koper' },
        { id: 'surat', type: 'parcel', at: [2, 5], kind: 'barang', name: 'Surat', art: 'obj/mv-surat' },
        { id: 'pintu', type: 'stop', at: [0, 7], accepts: 'barang', need: 2, art: 'train/dragutin', name: 'Dragutin', pay: 'horn' }
      ],
      beats: [{ title: 'Muat koper dan surat', story: 'Kuli bagasi memasukkan koper dan surat.',
        bo: 'Kuli: antar koper dan surat ke Dragutin.', objectives: [{ 'do': 'deliver', id: 'pintu' }], slots: 19, budget: 15, forms: ['kuli'], palette: MOVE.concat(['pick', 'deliver']) }] }),

    // 03 Dragutin leaves the station: wait for the porter to cross, the whistle, then roll out
    L({ id: 'mv03', terrain: 'depot', mood: 'sun', n: 3, title: 'Berangkat ke Pedesaan', place: 'Ujung Peron', icon: 'cmd/wait', bg: 'bg-mv-pedesaan', edu: { domain: 'algoritma', skill: 'menunggu giliran' },
      grid: { rows: 4, cols: 9, map: [',,,.,,,,,', '.......,,', ',,,.,,.,,', ',,,,,,...'], theme: 'town' },
      mojo: { at: [1, 0], h: 'E', form: 'dragutin' },
      decor: [{ at: [2, 5], art: 'char/mv-peluit', react: 'char/mv-bendera' }],
      objects: [
        { id: 'kuli', type: 'patrol', at: [0, 3], name: 'Kuli bagasi', art: 'char/mv-bagasi', path: [[0, 3], [1, 3], [2, 3], [2, 3], [1, 3], [0, 3]], phase: 2 },
        { id: 'flag', type: 'flag', at: [3, 8] }
      ],
      beats: [{ title: 'Tunggu lalu berangkat', story: 'Petugas meniup peluit. Dragutin berangkat.',
        bo: 'Tunggu kuli bagasi, lalu ke bendera.', objectives: [{ 'do': 'reach', at: [3, 8] }], slots: 14, budget: 11, forms: ['dragutin'], palette: ['east', 'down', 'wait'] }] }),

    // 04 Malivlak and his three coaches on the bumpy line: hitch all three, then roll to the flag
    L({ id: 'mv04', terrain: 'meadow', mood: 'sun', n: 4, title: 'Malivlak dan Tiga Gerbong', place: 'Jalur Bergelombang', icon: 'cmd/couple', bg: 'bg-mv-pedesaan', edu: { domain: 'matematika', skill: 'membilang 1-3' },
      grid: { rows: 4, cols: 9, map: ['....,,...', ',.,.,,.,.', ',,,....,,', ',,,,.,,,,'], theme: 'hill' },
      mojo: { at: [0, 0], h: 'E', form: 'malivlak' },
      decor: [{ at: [0, 5], art: 'char/mv-masinis-jalan' }, { at: [3, 2], art: 'animal/bird-blue/fly' }],
      objects: [
        { id: 'g1', type: 'wagon', at: [1, 1], art: 'train/mv-tender', name: 'Tender batu bara' },
        { id: 'g2', type: 'wagon', at: [3, 4], art: 'train/mv-gerbong', name: 'Gerbong hijau' },
        { id: 'g3', type: 'wagon', at: [1, 8], art: 'train/mv-oranye', name: 'Gerbong oranye' },
        { id: 'flag', type: 'flag', at: [0, 8] }
      ],
      beats: [{ title: 'Gandeng tiga gerbong', story: 'Malivlak menyambung tiga gerbongnya.',
        bo: 'Gandeng tiga gerbong, lalu ke bendera.', objectives: [{ 'do': 'wagons', n: 3 }, { 'do': 'reach', at: [0, 8] }], slots: 18, budget: 15, forms: ['malivlak'], palette: ['up', 'east', 'down', 'couple'] }] }),

    // 05 Dragutin catches up: Malivlak waits at the side while the fast green train overtakes, then follows
    L({ id: 'mv05', terrain: 'meadow', mood: 'sun', n: 5, title: 'Dragutin Menyusul', place: 'Jalur Samping', icon: 'cmd/wait', bg: 'bg-mv-pedesaan', edu: { domain: 'algoritma', skill: 'memberi jalan' },
      grid: { rows: 4, cols: 8, map: [',,,,,.,,', '........', ',,,.,.,,', '.....,,,'], theme: 'hill' },
      mojo: { at: [1, 2], h: 'E', form: 'malivlak' },
      decor: [{ at: [0, 2], art: 'char/mv-masinis' }],
      objects: [
        { id: 'gb', type: 'wagon', at: [3, 1], art: 'train/mv-gerbong', name: 'Gerbong Malivlak' },
        { id: 'drag', type: 'patrol', at: [0, 5], name: 'Dragutin', art: 'train/dragutin', path: [[0, 5], [1, 5], [2, 5], [2, 5], [1, 5], [0, 5]], phase: 1 },
        { id: 'flag', type: 'flag', at: [1, 7] }
      ],
      beats: [{ title: 'Beri jalan Dragutin', story: 'Dragutin yang cepat menyusul Malivlak.',
        bo: 'Gandeng gerbong, beri jalan, ke bendera.', objectives: [{ 'do': 'wagons', n: 1 }, { 'do': 'reach', at: [1, 7] }], slots: 16, budget: 13, forms: ['malivlak'], palette: ['east', 'west', 'down', 'up', 'wait', 'couple'] }] }),
    // ── Bab 2 "Ladang dan Kolam" (scenarios 6-10) ────────────────────────────────────────────
    // 06 Malivlak leaves the rails and bumps across the field: a rabbit pops up (wait), the startled man in purple boards a coach, then the pond
    L({ id: 'mv06', ch: 'mv-ch2', cine: { heavy: true }, terrain: 'meadow', mood: 'sun', n: 6, title: 'Menerobos Ladang', place: 'Ladang Terbuka', icon: 'cmd/wait', bg: 'bg-mv-ladang', edu: { domain: 'algoritma', skill: 'menunggu giliran' },
      grid: { rows: 5, cols: 9, map: [',.,,,.,,,', '........,', ',.,,,,,.,', ',,T,,...,', ',,,,,,.,,'], theme: 'hill' },
      mojo: { at: [1, 0], h: 'E', form: 'malivlak' },
      // film 2:51-3:00: the train leaves the rails and ploughs into TALL WHEAT (only the chimney and cab roof show); the man in purple lies in the field with his case
      wheat: [[0, 4], [0, 5], [0, 6], [1, 4], [1, 5], [1, 6], [2, 4], [2, 5], [2, 6]],
      objects: [
        { id: 'kelinci', type: 'patrol', at: [0, 1], name: 'Kelinci', art: 'animal/kelinci/lompat', path: [[0, 1], [1, 1], [2, 1], [2, 1], [1, 1], [0, 1]], phase: 1 },
        { id: 'pria', type: 'rider', at: [0, 5], who: 'mv-ungu-rebah', name: 'Penumpang' },
        { id: 'gerbong', type: 'stop', at: [4, 6], accepts: 'rider', art: 'train/mv-gerbong', name: 'Gerbong', pay: 'wave' },
        { id: 'flag', type: 'flag', at: [3, 5] }
      ],
      beats: [
        { title: 'Keluar dari rel', story: 'Malivlak menerobos ladang gandum. Ada kelinci.', hide: ['pria', 'gerbong'], fx: ['leaves'],
          decor: [{ at: [0, 5], art: 'malivlak-char/penumpang-ungu/berdiri' }, { at: [4, 1], art: 'animal/kelinci/berdiri' }, { at: [4, 8], art: 'kereta-prop/haystack' }],
          bo: 'Tunggu kelinci lewat, lalu ke bendera.', objectives: [{ 'do': 'reach', at: [3, 5] }], slots: 15, budget: 12, forms: ['malivlak'], palette: ['east', 'down', 'west', 'wait'] },
        { title: 'Pria berkoper naik', story: 'Pria berkoper terjatuh, lalu naik. Kolam di depan!', hide: ['kelinci', 'flag'], start: { at: [1, 2], h: 'E' }, fx: ['leaves'],
          decor: [{ at: [4, 2], art: 'animal/kelinci/berdiri' }, { at: [4, 8], art: 'kereta-prop/haystack' }],
          bo: 'Naikkan pria, turunkan di gerbong.', objectives: [{ 'do': 'deliver', id: 'gerbong' }], slots: 13, budget: 10, forms: ['malivlak'], palette: MOVE.concat(['pick', 'deliver']) }
      ] }),

    // 07 the whole train dives into the pond and comes out on the far bank; the driver lifts a fish from the dome
    L({ id: 'mv07', ch: 'mv-ch2', cine: { end: { letterbox: 1800, fx: [{ id: 'px-bubbles', at: [1, 4], size: 170 }, { id: 'bk-circle-01', at: [1, 4], size: 200, delay: 200 }, { id: 'bk-circle-01', at: [1, 3], size: 150, delay: 500 }] } }, terrain: 'meadow', mood: 'sun', n: 7, title: 'Menyelam ke Kolam', place: 'Tepi Kolam', icon: 'cmd/couple', bg: 'bg-mv-kolam', edu: { domain: 'matematika', skill: 'membilang 1-3' },
      grid: { rows: 5, cols: 9, map: [',.,.,,,,,', '......,.,', '.,,.,.,.,', ',,,,,...,', ',,,,,,,.,'], theme: 'hill' },
      mojo: { at: [1, 0], h: 'E', form: 'malivlak' },
      // film 3:00-3:12: the pond lies across the line; the train wades in and sinks until only its chimney and cab roof show above the water, then rises on the far bank
      pond: [[0, 4], [0, 5], [0, 6], [1, 4], [1, 5], [1, 6], [2, 4], [2, 5], [2, 6]],
      objects: [
        { id: 'g1', type: 'wagon', at: [2, 0], art: 'train/mv-tender', name: 'Tender batu bara' },
        { id: 'g2', type: 'wagon', at: [0, 1], art: 'train/mv-gerbong', name: 'Gerbong hijau' },
        { id: 'g3', type: 'wagon', at: [2, 3], art: 'train/mv-oranye', name: 'Gerbong oranye' },
        { id: 'ikan', type: 'parcel', at: [4, 7], kind: 'ikan', name: 'Ikan', art: 'obj/mv-ikan' },
        { id: 'masinis', type: 'stop', at: [0, 3], accepts: 'ikan', art: 'char/mv-masinis-ikan', name: 'Masinis', pay: 'wave' },
        { id: 'flag', type: 'flag', at: [1, 7] }
      ],
      beats: [
        { title: 'Masuk kolam', story: 'Rangkaian menyelam. Hanya cerobong yang tampak.', hide: ['ikan', 'masinis'],
          decor: [{ at: [4, 5], art: 'kereta-prop/bush' }],
          bo: 'Gandeng tiga gerbong, seberangi kolam ke bendera.', objectives: [{ 'do': 'wagons', n: 3 }, { 'do': 'reach', at: [1, 7] }], slots: 17, budget: 14, forms: ['malivlak'], palette: ['east', 'down', 'up', 'couple'] },
        { title: 'Muncul di seberang', story: 'Semua muncul lagi. Masinis mengangkat ikan.', hide: ['g1', 'g2', 'g3', 'flag'], start: { at: [1, 7], h: 'S' }, fx: ['fog'],
          decor: [{ at: [3, 4], art: 'kereta-prop/bush' }],
          bo: 'Ambil ikan, turunkan di masinis.', objectives: [{ 'do': 'deliver', id: 'masinis' }], slots: 13, budget: 10, forms: ['malivlak'], palette: ['east', 'west', 'down', 'up', 'pick', 'deliver'] }
      ] }),

    // 08 under the big tree the three coaches gather round Malivlak, then line up again and return to the rails
    L({ id: 'mv08', ch: 'mv-ch2', terrain: 'meadow', mood: 'sunset', n: 8, title: 'Berkumpul di Bawah Pohon', place: 'Pohon Besar', icon: 'cmd/east', bg: 'bg-mv-pohon', edu: { domain: 'matematika', skill: 'berurutan 1-3' },
      grid: { rows: 4, cols: 9, map: [',,,,,,...', '......,,.', ',,,.T.,,.', ',,,......'], theme: 'hill' },
      mojo: { at: [1, 0], h: 'E', form: 'malivlak' },
      objects: [
        { id: 'k1', type: 'mark', at: [1, 3], order: 1, seq: 'kumpul', art: 'train/mv-tender', name: 'Tender' },
        { id: 'k2', type: 'mark', at: [2, 5], order: 2, seq: 'kumpul', art: 'train/mv-gerbong', name: 'Gerbong 2' },
        { id: 'k3', type: 'mark', at: [3, 3], order: 3, seq: 'kumpul', art: 'train/mv-oranye', name: 'Gerbong 3' },
        { id: 'flag', type: 'flag', at: [0, 6] }
      ],
      beats: [
        { title: 'Kumpul di bawah pohon', story: 'Gerbong berkumpul di sekitar Malivlak.', hide: ['flag'],
          decor: [{ at: [0, 2], art: 'kereta-prop/tree-round' }, { at: [2, 6], art: 'malivlak-char/penumpang-ungu/duduk' }, { at: [3, 1], art: 'animal/kelinci/jongkok' }, { at: [0, 0], art: 'animal/kelinci/duduk-belakang' }],
          bo: 'Gerbong 1, 2, lalu gerbong 3.', objectives: [{ 'do': 'visit', id: 'k1' }, { 'do': 'visit', id: 'k2' }, { 'do': 'visit', id: 'k3' }], slots: 12, budget: 9, forms: ['malivlak'], palette: MOVE },
        { title: 'Kembali ke rel', story: 'Rangkaian memanjang lagi dan kembali ke rel.', hide: ['k1', 'k2', 'k3'],
          decor: [{ at: [0, 2], art: 'kereta-prop/tree-round' }, { at: [2, 6], art: 'malivlak-char/penumpang-ungu/duduk' }, { at: [3, 1], art: 'animal/kelinci/jongkok' }, { at: [0, 0], art: 'animal/kelinci/duduk-belakang' }],
          bo: 'Bawa rangkaian ke bendera di rel.', objectives: [{ 'do': 'reach', at: [0, 6] }], slots: 13, budget: 10, forms: ['malivlak'], palette: ['east', 'west', 'up'] }
      ] }),

    // 09 a bird has nested in the chimney; a puff blows the nest out; the driver lifts a pan of cooked eggs from the dome
    L({ id: 'mv09', ch: 'mv-ch2', cine: { heavy: true, end: { fx: [{ id: 'bk-smoke-07', at: [1, 7], size: 220 }, { id: 'bk-star-04', at: [1, 7], size: 120, delay: 250 }] } }, terrain: 'meadow', mood: 'sun', n: 9, title: 'Burung di Cerobong', place: 'Jalur Berbukit', icon: 'cmd/deliver', bg: 'bg-mv-pedesaan', edu: { domain: 'algoritma', skill: 'sebab dan akibat' },
      grid: { rows: 5, cols: 9, map: [',,,,,,,.,', '.....,,.,', ',,,,.,,.,', ',,,T....,', ',,,,,,.,,'], theme: 'hill' },
      mojo: { at: [1, 0], h: 'E', form: 'malivlak' },
      objects: [
        { id: 'wajan', type: 'parcel', at: [4, 6], kind: 'wajan', name: 'Wajan telur', art: 'obj/mv-wajan' },
        { id: 'masinis', type: 'stop', at: [0, 7], accepts: 'wajan', art: 'char/mv-masinis-wajan', name: 'Masinis', pay: 'wave' },
        { id: 'flag', type: 'flag', at: [1, 7] }
      ],
      beats: [
        { title: 'Sarang di cerobong', story: 'Burung bersarang di cerobong. Uap menyembur!', hide: ['wajan', 'masinis'],
          nest: { blow: 3 }, decor: [{ at: [2, 5], art: 'malivlak-char/masinis/terkejut' }],
          bo: 'Naik bukit sampai ke bendera.', objectives: [{ 'do': 'reach', at: [1, 7] }], slots: 14, budget: 11, forms: ['malivlak'], palette: ['east', 'down', 'up'] },
        { title: 'Telur matang', story: 'Sarang terpental. Masinis membawa wajan.', hide: ['flag'], start: { at: [1, 0], h: 'E' },
          decor: [{ at: [4, 4], art: 'kereta-prop/bird-nest' }, { at: [2, 6], art: 'animal/bird-blue/fly' }],
          bo: 'Ambil wajan, turunkan di masinis.', objectives: [{ 'do': 'deliver', id: 'masinis' }], slots: 16, budget: 13, forms: ['malivlak'], palette: ['east', 'west', 'down', 'up', 'pick', 'deliver'] }
      ] }),

    // 10 BIG ADVENTURE: the climb, the crossing with Dragutin's modern line (wait), and on towards the tunnel in the mountain
    L({ id: 'mv10', ch: 'mv-ch2', big: true, quiet: true, cine: { heavy: true }, terrain: 'mountain', mood: 'sunset', n: 10, title: 'Mendaki ke Gunung', place: 'Petualangan Besar', icon: 'cmd/wait', bg: 'bg-mv-pedesaan',
      bgs: ['bg-mv-pedesaan', 'bg-mv-pedesaan', 'bg-mv-gunung-terowongan'], edu: { domain: 'campuran', skill: 'urutan perjalanan' },
      celebrate: ['malivlak-char/masinis/jalan'],
      grid: { rows: 6, cols: 9, map: ['...,,,,,,', ',,......,', ',.,,,,,.,', '......,.,', ',.,,,.,.,', ',,,,,...,'], theme: 'hill' },
      mojo: { at: [0, 0], h: 'E', form: 'malivlak' },
      objects: [
        { id: 'drag', type: 'patrol', at: [2, 1], name: 'Dragutin', art: 'train/dragutin', path: [[2, 1], [3, 1], [4, 1], [4, 1], [3, 1], [2, 1]], phase: 1 },
        { id: 'flag', type: 'flag', at: [1, 7] },
        { id: 'mulut', type: 'flag', at: [0, 1] }
      ],
      beats: [
        { title: 'Mendaki lereng', story: 'Malivlak menarik tiga gerbong menanjak.', hide: ['drag', 'mulut'],
          decor: [{ at: [0, 3], art: 'malivlak-char/masinis/jalan' }, { at: [2, 4], art: 'kereta-prop/rock' }],
          bo: 'Naik lereng sampai ke bendera.', objectives: [{ 'do': 'reach', at: [1, 7] }], slots: 11, budget: 8, forms: ['malivlak'], palette: ['east', 'down'] },
        { title: 'Perpotongan jalur', story: 'Jalur Dragutin memotong. Tunggu dulu.', hide: ['flag', 'mulut'], start: { at: [3, 0], h: 'E' },
          decor: [{ at: [0, 4], art: 'kereta-prop/pine' }, { at: [4, 4], art: 'kereta-prop/rock' }],
          bo: 'Tunggu Dragutin lewat, lalu ke bendera.', objectives: [{ 'do': 'reach', at: [5, 7] }], slots: 14, budget: 11, forms: ['malivlak'], palette: ['east', 'down', 'wait'] },
        { title: 'Menuju terowongan', story: 'Di depan ada gunung dan terowongan.', hide: ['drag', 'flag'], start: { at: [5, 7], h: 'N' },
          decor: [{ at: [0, 5], art: 'kereta-prop/pine' }, { at: [0, 6], art: 'kereta-prop/pine' }],
          bo: 'Bawa Malivlak ke bendera di gunung.', objectives: [{ 'do': 'reach', at: [0, 1] }], slots: 14, budget: 11, forms: ['malivlak'], palette: ['west', 'up'] }
      ] }),
    // ── Bab 3 "Gunung dan Terowongan" (scenarios 11-14) ──────────────────────────────────────
    // 11 the warning sign at the tunnel, the train rolls in and backs out again; a friendly bear comes up to the engine and the driver peeks from the dome
    L({ id: 'mv11', ch: 'mv-ch3', terrain: 'mountain', mood: 'sunset', n: 11, title: 'Terowongan Bertanda', place: 'Mulut Terowongan', icon: 'cmd/west', bg: 'bg-mv-gunung-terowongan', edu: { domain: 'algoritma', skill: 'maju dan mundur' },
      grid: { rows: 5, cols: 9, map: [',,,,,,,,,', '....,,,,,', ',,,.,,,,,', ',,,......', ',T,,,,,,,'], theme: 'hill' },
      mojo: { at: [1, 0], h: 'E', form: 'malivlak' },
      // film 4:36-4:50: a stone arch in a red cliff; beside the track a SKULL warning board on a post (owner override of the no-skull rule, this sign only)
      tunnel: { at: [3, 8], sign: [4, 7], dir: 'r' },
      objects: [
        { id: 'f1', type: 'flag', at: [3, 8] },
        { id: 'f2', type: 'flag', at: [1, 0] }
      ],
      beats: [
        { title: 'Papan peringatan', story: 'Papan tengkorak di mulut terowongan. Masinis cemas.', hide: ['f2'],
          decor: [{ at: [2, 2], art: 'malivlak-char/masinis/terkejut' }],
          bo: 'Bawa Malivlak ke bendera di terowongan.', objectives: [{ 'do': 'reach', at: [3, 8] }], slots: 13, budget: 10, forms: ['malivlak'], palette: ['east', 'down'] },
        { title: 'Mundur keluar', story: 'Rangkaian mundur. Beruang yang ramah mendekat.', hide: ['f1'], start: { at: [3, 8], h: 'W' }, fx: ['fog'],
          decor: [{ at: [2, 2], art: 'animal/beruang/jalan', react: 'animal/beruang/depan' }],
          bo: 'Mundur ke bendera di luar terowongan.', objectives: [{ 'do': 'reach', at: [1, 0] }], slots: 13, budget: 10, forms: ['malivlak'], palette: ['west', 'up'] }
      ] }),

    // 12 the bear steps into the middle coach; the man in purple hurries out with his case and boards the rear coach
    L({ id: 'mv12', ch: 'mv-ch3', terrain: 'mountain', mood: 'sunset', n: 12, title: 'Beruang Jadi Penumpang', place: 'Di Luar Terowongan', icon: 'cmd/deliver', bg: 'bg-mv-gunung-terowongan', edu: { domain: 'matematika', skill: 'membilang 1-2' },
      grid: { rows: 5, cols: 9, map: [',.,,.,,,.', '.....,,,.', ',,,,.,,,.', ',,,,.....', ',,T,,,.,,'], theme: 'hill' },
      mojo: { at: [1, 0], h: 'E', form: 'malivlak' },
      objects: [
        { id: 'beruang', type: 'rider', at: [0, 4], who: 'mv-beruang', name: 'Beruang' },
        { id: 'pria', type: 'rider', at: [0, 1], who: 'mv-ungu-duduk', name: 'Penumpang' },
        { id: 'tengah', type: 'stop', at: [4, 6], accepts: 'beruang', art: 'train/mv-oranye', name: 'Gerbong tengah', pay: 'wave' },
        { id: 'belakang', type: 'stop', at: [0, 8], accepts: 'pria', art: 'train/mv-biru', name: 'Gerbong belakang', pay: 'wave' }
      ],
      beats: [
        { title: 'Beruang naik', story: 'Beruang yang ramah masuk ke gerbong tengah.', hide: ['pria', 'belakang'],
          decor: [{ at: [4, 4], art: 'kereta-prop/rock' }],
          bo: 'Antar beruang ke gerbong tengah.', objectives: [{ 'do': 'deliver', id: 'tengah' }], slots: 13, budget: 10, forms: ['malivlak'], palette: MOVE.concat(['pick', 'deliver']) },
        { title: 'Pria pindah', story: 'Pria berkoper pindah ke gerbong belakang.', hide: ['beruang', 'tengah'], start: { at: [1, 2], h: 'E' },
          decor: [{ at: [4, 4], art: 'kereta-prop/rock' }],
          bo: 'Antar penumpang ke gerbong belakang.', objectives: [{ 'do': 'deliver', id: 'belakang' }], slots: 17, budget: 14, forms: ['malivlak'], palette: MOVE.concat(['pick', 'deliver']) }
      ] }),

    // 13 down the mountain: the line zigzags down the slope and the bear stays behind on top, waving goodbye
    L({ id: 'mv13', ch: 'mv-ch3', terrain: 'mountain', mood: 'sun', n: 13, title: 'Turun dari Gunung', place: 'Lereng Berkelok', icon: 'cmd/down', bg: 'bg-mv-turunan', edu: { domain: 'algoritma', skill: 'urutan' },
      grid: { rows: 5, cols: 8, map: [',,,,,,,,', '....,,,,', ',,,.,,,,', ',,,....,', ',,,,,,.,'], theme: 'hill' },
      mojo: { at: [1, 0], h: 'E', form: 'malivlak' },
      decor: [{ at: [2, 6], art: 'animal/beruang/belakang' }, { at: [2, 1], art: 'malivlak-char/masinis/jalan' }, { at: [0, 5], art: 'kereta-prop/pine' }],
      objects: [{ id: 'flag', type: 'flag', at: [4, 6] }],
      beats: [{ title: 'Menuruni lereng', story: 'Beruang tinggal di atas. Malivlak terus turun.',
        bo: 'Turun lereng sampai ke bendera.', objectives: [{ 'do': 'reach', at: [4, 6] }], slots: 12, budget: 9, forms: ['malivlak'], palette: ['east', 'down'] }] }),

    // 14 BIG ADVENTURE: the driver listens to the wheels, checks the coaches front to back, bandages a wheel of the blue rear coach, and the train rolls on
    L({ id: 'mv14', ch: 'mv-ch3', big: true, quiet: true, terrain: 'meadow', mood: 'sunset', n: 14, title: 'Roda yang Dibalut', place: 'Petualangan Besar', icon: 'cmd/deliver', bg: 'bg-mv-turunan',
      bgs: ['bg-mv-turunan', 'bg-mv-pedesaan', 'bg-mv-pedesaan'], edu: { domain: 'campuran', skill: 'urutan perjalanan' },
      celebrate: ['malivlak-char/masinis/palu'],
      grid: { rows: 5, cols: 9, map: [',,,,,,,.,', '....,,,.,', ',,,.,,,.,', ',,,.....,', ',,,,,.,,,'], theme: 'hill' },
      mojo: { at: [1, 0], h: 'E', form: 'malivlak' },
      objects: [
        { id: 'k1', type: 'mark', at: [1, 2], order: 1, seq: 'periksa', art: 'train/mv-tender', name: 'Tender' },
        { id: 'k2', type: 'mark', at: [3, 4], order: 2, seq: 'periksa', art: 'train/mv-gerbong', name: 'Gerbong 2' },
        { id: 'k3', type: 'mark', at: [3, 7], order: 3, seq: 'periksa', art: 'train/mv-oranye', name: 'Gerbong 3' },
        { id: 'perban', type: 'parcel', at: [4, 5], kind: 'perban', name: 'Perban', art: 'obj/mv-perban' },
        { id: 'roda', type: 'stop', at: [0, 7], accepts: 'perban', art: 'train/mv-biru', name: 'Gerbong biru', pay: 'wave' },
        { id: 'flag', type: 'flag', at: [1, 7] }
      ],
      beats: [
        { title: 'Periksa gerbong', story: 'Masinis mendengar bunyi. Ia memeriksa roda.', hide: ['perban', 'roda', 'flag'],
          decor: [{ at: [4, 3], art: 'malivlak-char/masinis/palu' }],
          bo: 'Gerbong 1, 2, lalu gerbong 3.', objectives: [{ 'do': 'visit', id: 'k1' }, { 'do': 'visit', id: 'k2' }, { 'do': 'visit', id: 'k3' }], slots: 12, budget: 9, forms: ['malivlak'], palette: ['east', 'down'] },
        { title: 'Balut roda', story: 'Satu roda gerbong biru dibalut putih.', hide: ['k1', 'k2', 'k3', 'flag'], start: { at: [1, 3], h: 'E' },
          decor: [{ at: [4, 3], art: 'malivlak-char/masinis/periksa' }],
          bo: 'Antar perban ke gerbong biru.', objectives: [{ 'do': 'deliver', id: 'roda' }], slots: 13, budget: 10, forms: ['malivlak'], palette: MOVE.concat(['pick', 'deliver']) },
        { title: 'Jalan lagi', story: 'Roda sudah dibalut. Perjalanan berlanjut.', hide: ['k1', 'k2', 'k3', 'perban', 'roda'], start: { at: [1, 0], h: 'E' },
          decor: [{ at: [4, 7], art: 'animal/bird-blue/fly' }],
          bo: 'Bawa Malivlak ke bendera.', objectives: [{ 'do': 'reach', at: [1, 7] }], slots: 14, budget: 11, forms: ['malivlak'], palette: ['east', 'down', 'up'] }
      ] }),
    // ── Bab 4 "Penyambutan dan Museum" (scenarios 15-20) ─────────────────────────────────────
    // 15 the station prepares: the officer throws the switch lever, the signal is set, the band takes its places and waits
    L({ id: 'mv15', ch: 'mv-ch4', terrain: 'town', mood: 'sun', n: 15, title: 'Stasiun Bersiap', place: 'Stasiun Kota', icon: 'cmd/east', bg: 'bg-mv-penyambutan', edu: { domain: 'algoritma', skill: 'urutan' },
      grid: { rows: 5, cols: 9, map: ['.,...,...', '.,.,.,.,.', '.,.,.,.,.', '.,.,.,.,.', '...,...,,'], theme: 'town' },
      mojo: { at: [0, 0], h: 'E', form: 'malivlak' },
      band: { at: [3, 3], n: 5 },
      objects: [
        { id: 'tuas', type: 'mark', at: [1, 2], order: 1, seq: 'siap', art: 'kereta-tile/switch-left', name: 'Tuas wesel' },
        { id: 'sinyal', type: 'mark', at: [3, 6], order: 2, seq: 'siap', art: 'kereta-tile/signal-green', name: 'Sinyal' },
        { id: 'flag', type: 'flag', at: [3, 8] }
      ],
      beats: [
        { title: 'Petugas ke tuas', story: 'Petugas mengatur tuas wesel. Musik bersiap.', hide: ['sinyal', 'flag'],
          decor: [{ at: [3, 1], art: 'malivlak-char/petugas-stasiun/berdiri' }, { at: [0, 5], art: 'kereta-prop/signal-box' }],
          bo: 'Bawa Malivlak ke tuas wesel.', objectives: [{ 'do': 'visit', id: 'tuas' }], slots: 12, budget: 9, forms: ['malivlak'], palette: ['east', 'down', 'up'] },
        { title: 'Atur sinyal', story: 'Sinyal diatur. Para pemusik membawa alat tiup.', hide: ['tuas', 'flag'], start: { at: [1, 2], h: 'E' },
          decor: [{ at: [0, 1], art: 'kereta-prop/signal-box' }],
          bo: 'Bawa Malivlak ke sinyal.', objectives: [{ 'do': 'visit', id: 'sinyal' }], slots: 13, budget: 10, forms: ['malivlak'], palette: ['east', 'down', 'up'] },
        { title: 'Menunggu kereta', story: 'Kelompok musik siap di peron menunggu kereta.', hide: ['tuas', 'sinyal'], start: { at: [3, 6], h: 'E' },
          decor: [{ at: [1, 7], art: 'malivlak-char/petugas-stasiun/berdiri' }],
          bo: 'Bawa Malivlak ke bendera di stasiun.', objectives: [{ 'do': 'reach', at: [3, 8] }], slots: 11, budget: 8, forms: ['malivlak'], palette: ['east', 'down', 'up'] }
      ] }),

    // 16 Malivlak rolls in along the curve and runs PAST the welcomers (they turn their heads), stopping near the signal
    L({ id: 'mv16', ch: 'mv-ch4', terrain: 'town', mood: 'sun', n: 16, title: 'Melewati Penyambut', place: 'Peron Penyambutan', icon: 'cmd/down', bg: 'bg-mv-penyambutan', edu: { domain: 'algoritma', skill: 'berbelok' },
      grid: { rows: 4, cols: 8, map: [',,,,,,,,', '....,,,,', ',,,.,,,,', ',,,.....'], theme: 'town' },
      mojo: { at: [1, 0], h: 'E', form: 'malivlak' },
      band: { at: [2, 4], n: 4 },
      crowd: { at: [0, 0], n: 8 },
      decor: [{ at: [2, 1], art: 'malivlak-char/petugas-stasiun/bendera' }, { at: [3, 1], art: 'malivlak-char/penyambut/jangkung', react: 'malivlak-char/penyambut/jangkung-bungkuk' }],
      objects: [{ id: 'flag', type: 'flag', at: [3, 7] }],
      beats: [{ title: 'Lewat dan berhenti', story: 'Malivlak melewati para penyambut dan berhenti.',
        bo: 'Lewati penyambut, lalu ke bendera.', objectives: [{ 'do': 'reach', at: [3, 7] }], slots: 12, budget: 9, forms: ['malivlak'], palette: ['east', 'down'] }] }),

    // 17 at the signal: Malivlak's chimney bends over and pushes the arm (green to red), then the whole train walks back to the platform
    L({ id: 'mv17', ch: 'mv-ch4', terrain: 'town', mood: 'sun', n: 17, title: 'Sinyal Jadi Merah', place: 'Dekat Sinyal', icon: 'cmd/west', bg: 'bg-mv-penyambutan', edu: { domain: 'algoritma', skill: 'sebab dan akibat' },
      grid: { rows: 5, cols: 9, map: ['.,...,,,,', '.,.,,,,,,', '.,.,,,,,,', '.,.,,,,,,', '...,,,,,,'], theme: 'town' },
      mojo: { at: [0, 0], h: 'E', form: 'malivlak' },
      crowd: { at: [3, 6], n: 6 },
      objects: [
        { id: 'sg', type: 'mark', at: [0, 4], order: 1, seq: 'sinyal', art: 'kereta-tile/signal-green', name: 'Sinyal hijau' },
        { id: 'peron', type: 'flag', at: [0, 0] }
      ],
      beats: [
        { title: 'Dorong lengan sinyal', story: 'Cerobong Malivlak menyentuh lengan sinyal.', hide: ['peron'],
          cine: { end: { fx: [{ id: 'bk-flare-01', at: [0, 4], size: 130 }, { id: 'bk-star-05', at: [0, 4], size: 90, delay: 200 }] } },
          decor: [{ at: [2, 6], art: 'malivlak-char/petugas-stasiun/bendera-bawah' }, { at: [2, 1], art: 'malivlak-char/penyambut/pendek' }, { at: [0, 6], art: 'kereta-tile/water-tower' }],
          bo: 'Bawa Malivlak ke sinyal hijau.', objectives: [{ 'do': 'visit', id: 'sg' }], slots: 15, budget: 12, forms: ['malivlak'], palette: ['east', 'down', 'up'] },
        { title: 'Kembali ke peron', story: 'Sinyal merah. Rangkaian berjalan kembali.', hide: ['sg'], start: { at: [0, 4], h: 'W' },
          decor: [{ at: [2, 6], art: 'malivlak-char/petugas-stasiun/bendera-bawah' }, { at: [2, 1], art: 'malivlak-char/penyambut/pendek' }, { at: [2, 4], art: 'kereta-tile/signal-red' }, { at: [0, 6], art: 'kereta-tile/water-tower' }],
          bo: 'Bawa Malivlak ke bendera di peron.', objectives: [{ 'do': 'reach', at: [0, 0] }], slots: 15, budget: 12, forms: ['malivlak'], palette: ['west', 'down', 'up'] }
      ] }),

    // 18 the speech: wait while the speaker reads, then a big puff of steam fills the platform and cuts him off
    L({ id: 'mv18', ch: 'mv-ch4', terrain: 'town', mood: 'sun', n: 18, title: 'Pidato Terganggu Uap', place: 'Depan Stasiun', icon: 'cmd/wait', bg: 'bg-mv-penyambutan', edu: { domain: 'algoritma', skill: 'menunggu giliran' },
      grid: { rows: 4, cols: 9, map: [',,,.,,,,,', '......,,.', ',,,.,.,,.', ',,,,,....'], theme: 'town' },
      mojo: { at: [1, 0], h: 'E', form: 'malivlak' },
      crowd: { at: [0, 0], n: 8 },
      objects: [
        { id: 'drag', type: 'patrol', at: [0, 3], name: 'Dragutin', art: 'train/dragutin', path: [[0, 3], [1, 3], [2, 3], [2, 3], [1, 3], [0, 3]], phase: 2 },
        { id: 'flag', type: 'flag', at: [1, 8] }
      ],
      beats: [
        { title: 'Pidato dimulai', story: 'Pria di tengah membaca pidato. Dragutin lewat.',
          decor: [{ at: [2, 6], art: 'malivlak-char/pembaca-pidato/gestur', react: 'malivlak-char/pembaca-pidato/kertas' }],
          bo: 'Tunggu Dragutin lewat, lalu ke bendera.', objectives: [{ 'do': 'reach', at: [1, 8] }], slots: 16, budget: 13, forms: ['malivlak'], palette: ['east', 'down', 'up', 'wait'] },
        { title: 'Uap memenuhi peron', story: 'Uap putih menutup pidato. Pembaca terkejut.', start: { at: [1, 4], h: 'E' },
          cine: { end: { fx: [{ id: 'bk-smoke-07', at: [2, 6], size: 220 }, { id: 'bk-smoke-01', at: [2, 6], size: 170, delay: 220 }, { id: 'bk-smoke-05', at: [2, 5], size: 150, delay: 400 }] } },
          decor: [{ at: [2, 6], art: 'malivlak-char/pembaca-pidato/terkejut' }],
          bo: 'Bawa Malivlak ke bendera di depan.', objectives: [{ 'do': 'reach', at: [1, 8] }], slots: 11, budget: 8, forms: ['malivlak'], palette: ['east', 'down', 'up'] }
      ] }),

    // 19 the wreath is carried on Malivlak's nose, the medal goes to the driver (salute), and the train leaves the station
    L({ id: 'mv19', ch: 'mv-ch4', terrain: 'town', mood: 'sunset', n: 19, title: 'Karangan dan Medali', place: 'Peron Seremoni', icon: 'cmd/pick', bg: 'bg-mv-penyambutan', edu: { domain: 'algoritma', skill: 'urutan' },
      grid: { rows: 6, cols: 9, map: [',,,,.,,,,', '.,...,...', '.,.,.,.,.', '.,.,.,.,.', '...,...,.', ',,,,,,,,,'], theme: 'town' },
      mojo: { at: [1, 0], h: 'E', form: 'malivlak' },
      crowd: { at: [0, 0], n: 8 },
      objects: [
        { id: 'karangan', type: 'parcel', at: [0, 4], kind: 'karangan', name: 'Karangan daun', art: 'kereta-prop/wreath' },
        { id: 'medali', type: 'mark', at: [1, 6], order: 1, seq: 'medali', art: 'kereta-prop/medal', name: 'Medali' },
        { id: 'flag', type: 'flag', at: [4, 8] }
      ],
      beats: [
        { title: 'Pasang karangan', story: 'Karangan daun dipasang di depan Malivlak.', hide: ['medali', 'flag'],
          decor: [{ at: [3, 3], art: 'malivlak-char/orkes/pemimpin-kiri' }, { at: [2, 1], art: 'malivlak-char/penyambut/pendek' }],
          bo: 'Ambil karangan daun di peron.', objectives: [{ 'do': 'carry', id: 'karangan' }], slots: 14, budget: 11, forms: ['malivlak'], palette: ['east', 'down', 'up', 'pick'] },
        { title: 'Medali untuk masinis', story: 'Medali berpita merah untuk masinis.', hide: ['karangan', 'flag'], start: { at: [1, 4], h: 'E' },
          decor: [{ at: [2, 1], art: 'malivlak-char/penyambut/pendek-medali' }, { at: [3, 5], art: 'malivlak-char/orkes/drum-angkat' }],
          bo: 'Bawa Malivlak ke medali.', objectives: [{ 'do': 'visit', id: 'medali' }], slots: 11, budget: 8, forms: ['malivlak'], palette: ['east', 'down', 'up'] },
        { title: 'Berangkat', story: 'Masinis memberi hormat. Malivlak berangkat.', hide: ['karangan', 'medali'], start: { at: [4, 4], h: 'E' },
          decor: [{ at: [2, 3], art: 'malivlak-char/orkes/tuba-tekuk' }, { at: [2, 5], art: 'malivlak-char/masinis/medali' }],
          bo: 'Bawa Malivlak ke bendera, keluar stasiun.', objectives: [{ 'do': 'reach', at: [4, 8] }], slots: 13, budget: 10, forms: ['malivlak'], palette: ['east', 'down', 'up'] }
      ] }),

    // 20 BIG ADVENTURE: the line to the big building on the hill, through the wide doors, and Malivlak settles among the old vehicles with his wreath
    L({ id: 'mv20', ch: 'mv-ch4', big: true, quiet: true, terrain: 'meadow', mood: 'sunset', n: 20, title: 'Masuk Museum', place: 'Petualangan Besar', icon: 'cmd/east', bg: 'bg-mv-pedesaan',
      bgs: ['bg-mv-pedesaan', 'bg-mv-museum', 'bg-mv-museum'], edu: { domain: 'campuran', skill: 'urutan perjalanan' },
      celebrate: ['malivlak-char/masinis/medali', 'malivlak-char/penyambut/pendek-medali'],
      grid: { rows: 5, cols: 9, map: ['....,,,,,', ',,,.,,,,,', ',,,....,,', ',,,,,,.,,', ',,,,,,...'], theme: 'hill' },
      mojo: { at: [0, 0], h: 'E', form: 'malivlak' },
      objects: [
        { id: 'f1', type: 'flag', at: [4, 8] },
        { id: 'f2', type: 'flag', at: [4, 8] },
        { id: 'f3', type: 'flag', at: [4, 8] }
      ],
      beats: [
        { title: 'Jalan ke museum', story: 'Rel menuju bangunan besar di bukit.', hide: ['f2', 'f3'], cine: { end: { letterbox: 1800 } },
          decor: [{ at: [1, 5], art: 'malivlak-char/penumpang-jas-kotak/jalan' }, { at: [0, 5], art: 'kereta-prop/pine' }, { at: [0, 6], art: 'kereta-prop/tree-round' }],
          bo: 'Ikuti rel sampai ke bendera di museum.', objectives: [{ 'do': 'reach', at: [4, 8] }], slots: 15, budget: 12, forms: ['malivlak'], palette: ['east', 'down'] },
        { sign: { at: [3, 1], text: 'MUSEUM', w: 3 }, title: 'Masuk pintu lebar', story: 'Malivlak masuk lebih dulu, gerbong menyusul.', hide: ['f1', 'f3'], terrain: 'depot', start: { at: [0, 0], h: 'E' },
          decor: [{ at: [3, 4], art: 'malivlak-char/orkes/kontrabas-2', react: 'malivlak-char/orkes/terompet-atas' }, { at: [2, 1], art: 'mojo-train/diesel' }, { at: [1, 6], art: 'mojo-train/tanker' }],
          bo: 'Masuk ke museum, ke bendera.', objectives: [{ 'do': 'reach', at: [4, 8] }], slots: 15, budget: 12, forms: ['malivlak'], palette: ['east', 'down'] },
        { sign: { at: [3, 1], text: 'MUSEUM', w: 3 }, title: 'Di antara koleksi', story: 'Malivlak berhenti di antara kendaraan lama.', hide: ['f1', 'f2'], terrain: 'depot', start: { at: [0, 0], h: 'E' },
          cine: { end: { letterbox: 2400, fx: [{ id: 'bk-star-02', at: [1, 7], size: 200, n: 3, spread: 40 }, { id: 'bk-light-02', at: [1, 7], size: 300, delay: 300 }] } },
          decor: [{ at: [2, 2], art: 'malivlak-char/masinis/pipa' }, { at: [3, 4], art: 'mojo-train/cargo-nate' }, { at: [2, 7], art: 'mojo-train/coach-slip' }],
          bo: 'Berhenti di bendera, di antara koleksi.', objectives: [{ 'do': 'reach', at: [4, 8] }], slots: 15, budget: 12, forms: ['malivlak'], palette: ['east', 'down'] }
      ] })

  ]
  var NARR = { name: 'Masinis', full: 'Masinis Malivlak', art: { wave: 'malivlak-char/masinis/jalan', think: 'malivlak-char/masinis/terkejut', celebrate: 'malivlak-char/masinis/medali', tools: 'malivlak-char/masinis/palu' } }
  var STORY = { id: 'malivlak', hero: 'malivlak', heroName: 'Malivlak', narrator: NARR, saveKey: 'dunia-g15k-kereta-malivlak', logo: ['Dragutin dan', 'Malivlak'], docTitle: 'Dragutin dan Malivlak', collection: 'Teman-Teman Malivlak',
    heroes: { kuli: { name: 'Kuli bagasi', sprite: 'dragutin', art: 'malivlak-char/petugas-bagasi/angkat', color: '#2f5e9e' }, dragutin: { name: 'Dragutin', sprite: 'dragutin', color: '#2E8B57' }, malivlak: { name: 'Malivlak', sprite: 'malivlak', color: '#B5432B' } },
    pins: { 'mv-ch1': [30, 50], 'mv-ch2': [52, 38], 'mv-ch3': [72, 56], 'mv-ch4': [90, 40] },
    cast: [
      { id: 'malivlak', name: 'Malivlak', ability: 'Lokomotif uap kecil yang periang, membawa tiga gerbong.', key: 'train-char/malivlak/34l-happy' },
      { id: 'dragutin', name: 'Dragutin', ability: 'Kereta modern hijau yang panjang dan cepat.', key: 'train-char/dragutin/34l-happy' },
      { id: 'masinis', name: 'Masinis', ability: 'Masinis berpipa yang menemani Malivlak.', key: 'malivlak-char/masinis/jalan' },
      { id: 'petugas', name: 'Petugas Stasiun', ability: 'Meniup peluit dan mengatur jalur.', key: 'malivlak-char/petugas-stasiun/peluit' }
    ] }
  W.KeretaPackLevels = { HERO: 'malivlak', STORY: STORY, CHAPTERS: CHAPTERS, REGIONS: REGIONS, LEVELS: LEVELS, LIB: LIB }
})(typeof window !== 'undefined' ? window : globalThis)
