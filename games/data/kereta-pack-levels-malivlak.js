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
  var CHAPTERS = [{ id: 'mv-ch1', title: 'Stasiun dan Pedesaan', sub: 'Bab 1' }]
  var REGIONS = [{ id: 'mv-ch1', title: 'Stasiun dan Pedesaan', bg: 'bg-mv-stasiun', card: 'card-mv-stasiun', open: true, levels: ['mv01', 'mv02', 'mv03', 'mv04', 'mv05'] }]
  var LIB = {
    'char/mv-ungu': 'malivlak-char/penumpang-ungu/berdiri', 'char/mv-ungu-koper': 'malivlak-char/penumpang-ungu/koper', 'char/mv-jas': 'malivlak-char/penumpang-jas-kotak/jam-saku',
    'char/mv-petugas': 'malivlak-char/petugas-stasiun/berdiri', 'char/mv-peluit': 'malivlak-char/petugas-stasiun/peluit', 'char/mv-bendera': 'malivlak-char/petugas-stasiun/bendera-bawah',
    'char/mv-bagasi': 'malivlak-char/petugas-bagasi/angkat', 'char/mv-koper-besar': 'malivlak-char/petugas-bagasi/koper-besar', 'char/mv-masinis': 'malivlak-char/masinis/pipa-2', 'char/mv-masinis-jalan': 'malivlak-char/masinis/jalan',
    'obj/mv-koper': 'kereta-prop/luggage-pile', 'obj/mv-surat': 'kereta-prop/mail-sacks', 'train/dragutin': 'train-char/dragutin/34l-neutral', 'train/dragutin-b': 'train-char/dragutin/34r-neutral',
    'train/mv-gerbong': 'mojo-train/coach-annie', 'obj/peron': 'kereta-prop/station-small', 'obj/loket': 'kereta-prop/ticket-booth', 'obj/mv-lampu': 'kereta-prop/lantern'
  }
  function L (o) { o.ch = 'mv-ch1'; o.rev = 1; o.autoAim = true; o.bg = o.bg || 'bg-mv-stasiun'; return o }
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
        bo: 'Gandeng gerbong, beri jalan, ke bendera.', objectives: [{ 'do': 'wagons', n: 1 }, { 'do': 'reach', at: [1, 7] }], slots: 16, budget: 13, forms: ['malivlak'], palette: ['east', 'west', 'down', 'up', 'wait', 'couple'] }] })
  ]
  var NARR = { name: 'Masinis', full: 'Masinis Malivlak', art: { wave: 'malivlak-char/masinis/jalan', think: 'malivlak-char/masinis/terkejut', celebrate: 'malivlak-char/masinis/medali', tools: 'malivlak-char/masinis/palu' } }
  var STORY = { id: 'malivlak', hero: 'malivlak', heroName: 'Malivlak', narrator: NARR, saveKey: 'dunia-g15k-kereta-malivlak', logo: ['Dragutin dan', 'Malivlak'], docTitle: 'Dragutin dan Malivlak', collection: 'Teman-Teman Malivlak',
    heroes: { dragutin: { name: 'Dragutin', sprite: 'dragutin', color: '#2E8B57' }, malivlak: { name: 'Malivlak', sprite: 'malivlak', color: '#B5432B' } },
    pins: { 'mv-ch1': [30, 50] },
    cast: [
      { id: 'malivlak', name: 'Malivlak', ability: 'Lokomotif uap kecil yang periang, membawa tiga gerbong.', key: 'train-char/malivlak/34l-happy' },
      { id: 'dragutin', name: 'Dragutin', ability: 'Kereta modern hijau yang panjang dan cepat.', key: 'train-char/dragutin/34l-happy' },
      { id: 'masinis', name: 'Masinis', ability: 'Masinis berpipa yang menemani Malivlak.', key: 'malivlak-char/masinis/jalan' },
      { id: 'petugas', name: 'Petugas Stasiun', ability: 'Meniup peluit dan mengatur jalur.', key: 'malivlak-char/petugas-stasiun/peluit' }
    ] }
  W.KeretaPackLevels = { HERO: 'malivlak', STORY: STORY, CHAPTERS: CHAPTERS, REGIONS: REGIONS, LEVELS: LEVELS, LIB: LIB }
})(typeof window !== 'undefined' ? window : globalThis)
