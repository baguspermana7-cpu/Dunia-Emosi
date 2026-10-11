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
  var CHAPTERS = [{ id: 'mv-ch1', title: 'Stasiun dan Pedesaan', sub: 'Bab 1' }, { id: 'mv-ch2', title: 'Ladang dan Kolam', sub: 'Bab 2' }]
  var REGIONS = [{ id: 'mv-ch1', title: 'Stasiun dan Pedesaan', bg: 'bg-mv-stasiun', card: 'card-mv-stasiun', open: true, levels: ['mv01', 'mv02', 'mv03', 'mv04', 'mv05'] },
    { id: 'mv-ch2', title: 'Ladang dan Kolam', bg: 'bg-mv-ladang', card: 'card-mv-pedesaan', open: true, levels: ['mv06', 'mv07', 'mv08', 'mv09', 'mv10'] }]
  var LIB = {
    'char/mv-ungu': 'malivlak-char/penumpang-ungu/berdiri', 'char/mv-ungu-koper': 'malivlak-char/penumpang-ungu/koper', 'char/mv-jas': 'malivlak-char/penumpang-jas-kotak/jam-saku',
    'char/mv-petugas': 'malivlak-char/petugas-stasiun/berdiri', 'char/mv-peluit': 'malivlak-char/petugas-stasiun/peluit', 'char/mv-bendera': 'malivlak-char/petugas-stasiun/bendera-bawah',
    'char/mv-bagasi': 'malivlak-char/petugas-bagasi/angkat', 'char/mv-koper-besar': 'malivlak-char/petugas-bagasi/koper-besar', 'char/mv-masinis': 'malivlak-char/masinis/pipa-2', 'char/mv-masinis-jalan': 'malivlak-char/masinis/jalan',
    'obj/mv-koper': 'kereta-prop/luggage-pile', 'obj/mv-surat': 'kereta-prop/mail-sacks', 'train/dragutin': 'train-char/dragutin/34l-neutral', 'train/dragutin-b': 'train-char/dragutin/34r-neutral',
    'train/mv-gerbong': 'mojo-train/coach-annie', 'obj/peron': 'kereta-prop/station-small', 'obj/loket': 'kereta-prop/ticket-booth', 'obj/mv-lampu': 'kereta-prop/lantern',
    'char/mv-lari': 'malivlak-char/penumpang-ungu/lari', 'char/mv-masinis-ikan': 'malivlak-char/masinis/ikan', 'char/mv-masinis-wajan': 'malivlak-char/masinis/wajan', 'char/mv-masinis-kaget': 'malivlak-char/masinis/terkejut',
    'obj/mv-ikan': 'animal/ikan/samping', 'obj/mv-wajan': 'kereta-prop/frying-pan-egg', 'train/dragutin-c': 'train-char/dragutin/34l-happy'
  }
  function L (o) { o.ch = o.ch || 'mv-ch1'; o.rev = 1; o.autoAim = true; o.bg = o.bg || 'bg-mv-stasiun'; return o }
  var LEVELS = [
    // 01 Dragutin arrives at the station and stops level with the platform: the first lesson is only to drive
    L({ id: 'mv01', terrain: 'depot', mood: 'sun', n: 1, title: 'Dragutin Tiba di Stasiun', place: 'Stasiun Kecil', icon: 'cmd/east', edu: { domain: 'algoritma', skill: 'urutan' },
      grid: { rows: 4, cols: 8, map: ['........', ',,,.,,,,', ',,,.,,,,', '........'], theme: 'town' },
      mojo: { at: [0, 0], h: 'E', form: 'dragutin' },
      decor: [{ at: [2, 5], art: 'char/mv-petugas' }, { at: [1, 6], art: 'char/mv-jas' }, { at: [1, 1], art: 'char/mv-ungu' }, { at: [2, 1], art: 'obj/loket' }],
      objects: [{ id: 'flag', type: 'flag', at: [3, 7] }],
      beats: [{ title: 'Berhenti di peron', story: 'Dragutin masuk stasiun dan berhenti di peron.',
        bo: 'Bawa Dragutin ke bendera di peron.', objectives: [{ 'do': 'reach', at: [3, 7] }], slots: 13, budget: 10, forms: ['dragutin'], palette: ['down', 'east'] }] }),

    // 02 passengers, luggage and the letters are loaded; the doors close (Malivlak the shunter brings them to Dragutin: adaptation)
    L({ id: 'mv02', terrain: 'depot', mood: 'sun', n: 2, title: 'Penumpang, Koper, Surat', place: 'Peron Stasiun', icon: 'cmd/pick', edu: { domain: 'matematika', skill: 'membilang 1-2' },
      grid: { rows: 4, cols: 8, map: [',,,,,,,,', '........', ',.,.,.,,', ',,,,,,,,'], theme: 'town' },
      mojo: { at: [1, 0], h: 'E', form: 'malivlak' },
      decor: [{ at: [3, 1], art: 'char/mv-bagasi', react: 'char/mv-koper-besar' }, { at: [0, 5], art: 'char/mv-petugas' }, { at: [3, 3], art: 'char/mv-ungu-koper' }],
      objects: [
        { id: 'koper', type: 'parcel', at: [2, 1], kind: 'barang', name: 'Koper', art: 'obj/mv-koper' },
        { id: 'surat', type: 'parcel', at: [2, 5], kind: 'barang', name: 'Surat', art: 'obj/mv-surat' },
        { id: 'pintu', type: 'stop', at: [0, 7], accepts: 'barang', need: 2, art: 'train/dragutin', name: 'Dragutin', pay: 'horn' }
      ],
      beats: [{ title: 'Muat koper dan surat', story: 'Koper dan surat naik ke Dragutin.',
        bo: 'Turunkan koper dan surat di Dragutin.', objectives: [{ 'do': 'deliver', id: 'pintu' }], slots: 19, budget: 15, forms: ['malivlak'], palette: MOVE.concat(['pick', 'deliver']) }] }),

    // 03 Dragutin leaves the station: wait for the porter to cross, the whistle, then roll out
    L({ id: 'mv03', terrain: 'depot', mood: 'sun', n: 3, title: 'Berangkat ke Pedesaan', place: 'Ujung Peron', icon: 'cmd/wait', bg: 'bg-mv-pedesaan', edu: { domain: 'algoritma', skill: 'menunggu giliran' },
      grid: { rows: 3, cols: 8, map: [',,,.,,,,', '........', ',,,.,,,,'], theme: 'town' },
      mojo: { at: [1, 0], h: 'E', form: 'dragutin' },
      decor: [{ at: [2, 5], art: 'char/mv-peluit', react: 'char/mv-bendera' }],
      objects: [
        { id: 'kuli', type: 'patrol', at: [0, 3], name: 'Kuli bagasi', art: 'char/mv-bagasi', path: [[0, 3], [1, 3], [2, 3], [2, 3], [1, 3], [0, 3]], phase: 2 },
        { id: 'flag', type: 'flag', at: [1, 7] }
      ],
      beats: [{ title: 'Tunggu lalu berangkat', story: 'Petugas meniup peluit. Dragutin berangkat.',
        bo: 'Tunggu kuli bagasi, lalu ke bendera.', objectives: [{ 'do': 'reach', at: [1, 7] }], slots: 11, budget: 8, forms: ['dragutin'], palette: ['east', 'wait'] }] }),

    // 04 Malivlak and his three coaches on the bumpy line: hitch all three, then roll to the flag
    L({ id: 'mv04', terrain: 'meadow', mood: 'sun', n: 4, title: 'Malivlak dan Tiga Gerbong', place: 'Jalur Bergelombang', icon: 'cmd/couple', bg: 'bg-mv-pedesaan', edu: { domain: 'matematika', skill: 'membilang 1-3' },
      grid: { rows: 4, cols: 8, map: [',,T,,,,.', '........', ',.,.,.,,', ',,,,,,,,'], theme: 'hill' },
      mojo: { at: [1, 0], h: 'E', form: 'malivlak' },
      decor: [{ at: [0, 5], art: 'char/mv-masinis-jalan' }, { at: [3, 2], art: 'animal/bird-blue/fly' }],
      objects: [
        { id: 'g1', type: 'wagon', at: [2, 1], art: 'train/mv-gerbong', name: 'Gerbong pertama' },
        { id: 'g2', type: 'wagon', at: [2, 3], art: 'train/mv-gerbong', name: 'Gerbong kedua' },
        { id: 'g3', type: 'wagon', at: [2, 5], art: 'train/mv-gerbong', name: 'Gerbong ketiga' },
        { id: 'flag', type: 'flag', at: [0, 7] }
      ],
      beats: [{ title: 'Gandeng tiga gerbong', story: 'Malivlak menyambung tiga gerbongnya.',
        bo: 'Gandeng tiga gerbong, lalu ke bendera.', objectives: [{ 'do': 'wagons', n: 3 }, { 'do': 'reach', at: [0, 7] }], slots: 16, budget: 12, forms: ['malivlak'], palette: ['up', 'east', 'down', 'couple'] }] }),

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
      grid: { rows: 4, cols: 8, map: [',,,.,,.,', '........', ',,,.,,,,', ',,T,,,,,'], theme: 'hill' },
      mojo: { at: [1, 0], h: 'E', form: 'malivlak' },
      objects: [
        { id: 'kelinci', type: 'patrol', at: [0, 3], name: 'Kelinci', art: 'animal/kelinci/lompat', path: [[0, 3], [1, 3], [2, 3], [2, 3], [1, 3], [0, 3]], phase: 2 },
        { id: 'pria', type: 'rider', at: [0, 6], who: 'mv-lari', name: 'Penumpang' },
        { id: 'gerbong', type: 'stop', at: [2, 5], accepts: 'rider', art: 'train/mv-gerbong', name: 'Gerbong', pay: 'wave' },
        { id: 'flag', type: 'flag', at: [1, 7] }
      ],
      beats: [
        { title: 'Keluar dari rel', story: 'Malivlak keluar rel. Seekor kelinci muncul.', hide: ['pria', 'gerbong'], fx: ['leaves'],
          decor: [{ at: [2, 6], art: 'malivlak-char/penumpang-ungu/lari-2' }, { at: [3, 4], art: 'animal/kelinci/berdiri' }, { at: [3, 7], art: 'kereta-prop/haystack' }],
          bo: 'Tunggu kelinci lewat, lalu ke bendera.', objectives: [{ 'do': 'reach', at: [1, 7] }], slots: 11, budget: 8, forms: ['malivlak'], palette: ['east', 'wait'] },
        { title: 'Pria berkoper naik', story: 'Pria berkoper kaget, lalu naik ke gerbong.', hide: ['kelinci'], start: { at: [1, 4], h: 'E' }, fx: ['leaves'],
          decor: [{ at: [3, 3], art: 'animal/kelinci/berdiri' }, { at: [3, 7], art: 'kereta-prop/haystack' }],
          bo: 'Naikkan pria, turunkan di gerbong.', objectives: [{ 'do': 'deliver', id: 'gerbong' }], slots: 8, budget: 5, forms: ['malivlak'], palette: MOVE.concat(['pick', 'deliver']) }
      ] }),

    // 07 the whole train dives into the pond and comes out on the far bank; the driver lifts a fish from the dome
    L({ id: 'mv07', ch: 'mv-ch2', cine: { end: { letterbox: 1800, fx: [{ id: 'px-bubbles', at: [0, 4], size: 170 }, { id: 'bk-circle-01', at: [0, 4], size: 200, delay: 200 }, { id: 'bk-circle-01', at: [0, 3], size: 150, delay: 500 }] } }, terrain: 'meadow', mood: 'sun', n: 7, title: 'Menyelam ke Kolam', place: 'Tepi Kolam', icon: 'cmd/couple', bg: 'bg-mv-kolam', edu: { domain: 'matematika', skill: 'membilang 1-3' },
      grid: { rows: 4, cols: 8, map: [',~~~~~,,', '........', ',.,.,.,.', ',,,,,,,,'], theme: 'hill' },
      mojo: { at: [1, 0], h: 'E', form: 'malivlak' },
      objects: [
        { id: 'g1', type: 'wagon', at: [2, 1], art: 'train/mv-gerbong', name: 'Gerbong pertama' },
        { id: 'g2', type: 'wagon', at: [2, 3], art: 'train/mv-gerbong', name: 'Gerbong kedua' },
        { id: 'g3', type: 'wagon', at: [2, 5], art: 'train/mv-gerbong', name: 'Gerbong ketiga' },
        { id: 'ikan', type: 'parcel', at: [2, 7], kind: 'ikan', name: 'Ikan', art: 'obj/mv-ikan' },
        { id: 'masinis', type: 'stop', at: [0, 6], accepts: 'ikan', art: 'char/mv-masinis-ikan', name: 'Masinis', pay: 'wave' },
        { id: 'flag', type: 'flag', at: [1, 5] }
      ],
      beats: [
        { title: 'Masuk kolam', story: 'Malivlak dan tiga gerbong menyelam ke kolam.', hide: ['ikan', 'masinis'],
          decor: [{ at: [0, 1], art: 'animal/ikan/kanan' }, { at: [3, 6], art: 'kereta-prop/bush' }],
          bo: 'Gandeng tiga gerbong, lalu ke bendera.', objectives: [{ 'do': 'wagons', n: 3 }, { 'do': 'reach', at: [1, 5] }], slots: 11, budget: 8, forms: ['malivlak'], palette: ['east', 'down', 'up', 'couple'] },
        { title: 'Muncul di seberang', story: 'Semua muncul lagi. Masinis mengangkat ikan.', hide: ['g1', 'g2', 'g3', 'flag'], start: { at: [1, 6], h: 'E' }, fx: ['fog'],
          decor: [{ at: [3, 4], art: 'kereta-prop/bush' }],
          bo: 'Ambil ikan, turunkan di masinis.', objectives: [{ 'do': 'deliver', id: 'masinis' }], slots: 7, budget: 4, forms: ['malivlak'], palette: ['east', 'west', 'down', 'pick', 'deliver'] }
      ] }),

    // 08 under the big tree the three coaches gather round Malivlak, then line up again and return to the rails
    L({ id: 'mv08', ch: 'mv-ch2', terrain: 'meadow', mood: 'sunset', n: 8, title: 'Berkumpul di Bawah Pohon', place: 'Pohon Besar', icon: 'cmd/east', bg: 'bg-mv-pohon', edu: { domain: 'matematika', skill: 'berurutan 1-3' },
      grid: { rows: 4, cols: 8, map: [',,,,,,,,', '........', '.,,T,,,.', '........'], theme: 'hill' },
      mojo: { at: [1, 0], h: 'E', form: 'malivlak' },
      objects: [
        { id: 'k1', type: 'mark', at: [2, 0], order: 1, seq: 'kumpul', art: 'train/mv-gerbong', name: 'Gerbong 1' },
        { id: 'k2', type: 'mark', at: [3, 2], order: 2, seq: 'kumpul', art: 'train/mv-gerbong', name: 'Gerbong 2' },
        { id: 'k3', type: 'mark', at: [3, 4], order: 3, seq: 'kumpul', art: 'train/mv-gerbong', name: 'Gerbong 3' },
        { id: 'flag', type: 'flag', at: [1, 7] }
      ],
      beats: [
        { title: 'Kumpul di bawah pohon', story: 'Gerbong berkumpul di sekitar Malivlak.', hide: ['flag'],
          decor: [{ at: [0, 2], art: 'kereta-prop/tree-round' }, { at: [2, 5], art: 'malivlak-char/penumpang-ungu/duduk' }, { at: [0, 5], art: 'animal/kelinci/jongkok' }, { at: [2, 6], art: 'animal/kelinci/duduk-belakang' }],
          bo: 'Gerbong 1, 2, lalu gerbong 3.', objectives: [{ 'do': 'visit', id: 'k1' }, { 'do': 'visit', id: 'k2' }, { 'do': 'visit', id: 'k3' }], slots: 9, budget: 6, forms: ['malivlak'], palette: MOVE },
        { title: 'Kembali ke rel', story: 'Rangkaian memanjang lagi dan kembali ke rel.', hide: ['k1', 'k2', 'k3'],
          decor: [{ at: [0, 2], art: 'kereta-prop/tree-round' }, { at: [2, 5], art: 'malivlak-char/penumpang-ungu/duduk' }, { at: [0, 5], art: 'animal/kelinci/jongkok' }, { at: [2, 6], art: 'animal/kelinci/duduk-belakang' }],
          bo: 'Bawa rangkaian ke bendera di rel.', objectives: [{ 'do': 'reach', at: [1, 7] }], slots: 8, budget: 5, forms: ['malivlak'], palette: ['east', 'up'] }
      ] }),

    // 09 a bird has nested in the chimney; a puff blows the nest out; the driver lifts a pan of cooked eggs from the dome
    L({ id: 'mv09', ch: 'mv-ch2', cine: { heavy: true, end: { fx: [{ id: 'bk-smoke-07', at: [1, 7], size: 220 }, { id: 'bk-star-04', at: [1, 7], size: 120, delay: 250 }] } }, terrain: 'meadow', mood: 'sun', n: 9, title: 'Burung di Cerobong', place: 'Jalur Berbukit', icon: 'cmd/deliver', bg: 'bg-mv-pedesaan', edu: { domain: 'algoritma', skill: 'sebab dan akibat' },
      grid: { rows: 4, cols: 8, map: [',,,,,,,,', '........', ',.,,,,,,', ',,,T,,,,'], theme: 'hill' },
      mojo: { at: [1, 0], h: 'E', form: 'malivlak' },
      objects: [
        { id: 'wajan', type: 'parcel', at: [2, 1], kind: 'wajan', name: 'Wajan telur', art: 'obj/mv-wajan' },
        { id: 'masinis', type: 'stop', at: [0, 6], accepts: 'wajan', art: 'char/mv-masinis-wajan', name: 'Masinis', pay: 'wave' },
        { id: 'flag', type: 'flag', at: [1, 7] }
      ],
      beats: [
        { title: 'Sarang di cerobong', story: 'Ada sarang di cerobong. Uap menyembur!', hide: ['wajan', 'masinis'],
          decor: [{ at: [2, 5], art: 'malivlak-char/masinis/terkejut' }, { at: [0, 4], art: 'animal/bird-blue/fly' }],
          bo: 'Naik bukit sampai ke bendera.', objectives: [{ 'do': 'reach', at: [1, 7] }], slots: 11, budget: 7, forms: ['malivlak'], palette: ['east'] },
        { title: 'Telur matang', story: 'Sarang terpental. Masinis membawa wajan.', hide: ['flag'], start: { at: [1, 0], h: 'E' },
          decor: [{ at: [3, 6], art: 'kereta-prop/bird-nest' }],
          bo: 'Ambil wajan, turunkan di masinis.', objectives: [{ 'do': 'deliver', id: 'masinis' }], slots: 11, budget: 8, forms: ['malivlak'], palette: ['east', 'west', 'down', 'up', 'pick', 'deliver'] }
      ] }),

    // 10 BIG ADVENTURE: the climb, the crossing with Dragutin's modern line (wait), and on towards the tunnel in the mountain
    L({ id: 'mv10', ch: 'mv-ch2', big: true, quiet: true, cine: { heavy: true }, terrain: 'mountain', mood: 'sunset', n: 10, title: 'Mendaki ke Gunung', place: 'Petualangan Besar', icon: 'cmd/wait', bg: 'bg-mv-pedesaan',
      bgs: ['bg-mv-pedesaan', 'bg-mv-pedesaan', 'bg-mv-gunung-terowongan'], edu: { domain: 'campuran', skill: 'urutan perjalanan' },
      celebrate: ['malivlak-char/masinis/jalan'],
      grid: { rows: 5, cols: 8, map: [',,,,,,,,', '........', ',,,.,,,.', '........', ',,T,,,,,'], theme: 'hill' },
      mojo: { at: [1, 0], h: 'E', form: 'malivlak' },
      objects: [
        { id: 'drag', type: 'patrol', at: [2, 3], name: 'Dragutin', art: 'train/dragutin', path: [[1, 3], [2, 3], [3, 3], [3, 3], [3, 3], [2, 3]], phase: 1 },
        { id: 'flag', type: 'flag', at: [1, 7] },
        { id: 'mulut', type: 'flag', at: [1, 5] }
      ],
      beats: [
        { title: 'Mendaki lereng', story: 'Malivlak menarik tiga gerbong menanjak.', hide: ['drag', 'mulut'],
          decor: [{ at: [0, 2], art: 'malivlak-char/masinis/jalan' }, { at: [3, 5], art: 'kereta-prop/rock' }],
          bo: 'Naik lereng sampai ke bendera.', objectives: [{ 'do': 'reach', at: [1, 7] }], slots: 11, budget: 7, forms: ['malivlak'], palette: ['east'] },
        { title: 'Perpotongan jalur', story: 'Jalur Dragutin memotong. Tunggu dulu.', hide: ['flag', 'mulut'], start: { at: [3, 0], h: 'E' },
          decor: [{ at: [0, 2], art: 'kereta-prop/pine' }, { at: [4, 5], art: 'kereta-prop/rock' }],
          bo: 'Tunggu Dragutin lewat, lalu ke bendera.', objectives: [{ 'do': 'reach', at: [3, 7] }], slots: 11, budget: 8, forms: ['malivlak'], palette: ['east', 'wait'] },
        { title: 'Menuju terowongan', story: 'Di depan ada gunung dan terowongan.', hide: ['drag', 'flag'], start: { at: [3, 7], h: 'N' },
          decor: [{ at: [0, 2], art: 'kereta-prop/pine' }, { at: [0, 6], art: 'kereta-prop/pine' }],
          bo: 'Bawa Malivlak ke bendera di gunung.', objectives: [{ 'do': 'reach', at: [1, 5] }], slots: 8, budget: 4, forms: ['malivlak'], palette: ['west', 'up'] }
      ] })

  ]
  var NARR = { name: 'Masinis', full: 'Masinis Malivlak', art: { wave: 'malivlak-char/masinis/jalan', think: 'malivlak-char/masinis/terkejut', celebrate: 'malivlak-char/masinis/medali', tools: 'malivlak-char/masinis/palu' } }
  var STORY = { id: 'malivlak', hero: 'malivlak', heroName: 'Malivlak', narrator: NARR, saveKey: 'dunia-g15k-kereta-malivlak', logo: ['Dragutin dan', 'Malivlak'], docTitle: 'Dragutin dan Malivlak', collection: 'Teman-Teman Malivlak',
    heroes: { dragutin: { name: 'Dragutin', sprite: 'dragutin', color: '#2E8B57' }, malivlak: { name: 'Malivlak', sprite: 'malivlak', color: '#B5432B' } },
    pins: { 'mv-ch1': [30, 50], 'mv-ch2': [52, 38] },
    cast: [
      { id: 'malivlak', name: 'Malivlak', ability: 'Lokomotif uap kecil yang periang, membawa tiga gerbong.', key: 'train-char/malivlak/34l-happy' },
      { id: 'dragutin', name: 'Dragutin', ability: 'Kereta modern hijau yang panjang dan cepat.', key: 'train-char/dragutin/34l-happy' },
      { id: 'masinis', name: 'Masinis', ability: 'Masinis berpipa yang menemani Malivlak.', key: 'malivlak-char/masinis/jalan' },
      { id: 'petugas', name: 'Petugas Stasiun', ability: 'Meniup peluit dan mengatur jalur.', key: 'malivlak-char/petugas-stasiun/peluit' }
    ] }
  W.KeretaPackLevels = { HERO: 'malivlak', STORY: STORY, CHAPTERS: CHAPTERS, REGIONS: REGIONS, LEVELS: LEVELS, LIB: LIB }
})(typeof window !== 'undefined' ? window : globalThis)
