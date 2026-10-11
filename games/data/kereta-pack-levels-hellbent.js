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
  var CHAPTERS = [{ id: 'hb-ch1', title: 'Pesta di Kota', sub: 'Bab 1' }]
  var REGIONS = [{ id: 'hb-ch1', title: 'Mulai Lomba', bg: 'bg-hb-start', card: 'card-hb-start', open: true, levels: ['hb01', 'hb02', 'hb03', 'hb04'] }]
  var LIB = {
    'train/lemas': 'train-char/defeatist/34l-sad', 'train/lemas-b': 'train-char/defeatist/34l-neutral', 'obj/semangat': 'mojo-prop/star', 'obj/hb-batu': 'kereta-prop/coal-pile',
    'train/hb-gerbong': 'mojo-train/coach-slip', 'obj/hb-panggung': 'kereta-prop/station-small', 'obj/hb-sinyal': 'kereta-tile/signal-red'
  }
  function L (o) { o.ch = 'hb-ch1'; o.rev = 1; o.autoAim = true; return o }
  var LEVELS = [
    // 01 the starting whistle: Kilat waits for the signal to turn, then races to the line
    L({ id: 'hb01', terrain: 'meadow', mood: 'sun', n: 1, title: 'Peluit Tanda Mulai', place: 'Garis Start', icon: 'cmd/wait', bg: 'bg-hb-start', edu: { domain: 'algoritma', skill: 'menunggu giliran' },
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
    L({ id: 'hb02', terrain: 'meadow', mood: 'sun', n: 2, title: 'Tuan Lemas Mau Menyerah', place: 'Sinyal Merah', icon: 'cmd/pick', bg: 'bg-hb-padang', edu: { domain: 'matematika', skill: 'membilang 1-2' },
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
    L({ id: 'hb03', terrain: 'meadow', mood: 'sun', n: 5, title: 'Batu Bara untuk Tuan Lemas', place: 'Padang Hijau', icon: 'cmd/load', bg: 'bg-hb-padang', edu: { domain: 'matematika', skill: 'membilang 1-2' },
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
    L({ id: 'hb04', terrain: 'meadow', mood: 'sunset', n: 6, title: 'Tanjakan yang Berat', place: 'Kaki Bukit', icon: 'cmd/couple', bg: 'bg-hb-kota', edu: { domain: 'matematika', skill: 'membilang 1-2' },
      grid: { rows: 4, cols: 8, map: [',,,,,,,.', '........', ',.,.,,,,', ',,,,,,,,'], theme: 'hill' },
      mojo: { at: [1, 0], h: 'E', form: 'kilat' },
      decor: [{ at: [3, 5], art: 'train/lemas-b' }],
      objects: [
        { id: 'g1', type: 'wagon', at: [2, 1], art: 'train/hb-gerbong', name: 'Gerbong pertama' },
        { id: 'g2', type: 'wagon', at: [2, 3], art: 'train/hb-gerbong', name: 'Gerbong kedua' },
        { id: 'flag', type: 'flag', at: [0, 7] }
      ],
      beats: [{ title: 'Bantu naik tanjakan', story: 'Kilat membantu menarik gerbong Tuan Lemas.',
        bo: 'Gandeng dua gerbong, lalu ke bendera.', objectives: [{ 'do': 'wagons', n: 2 }, { 'do': 'reach', at: [0, 7] }], slots: 14, budget: 10, forms: ['kilat'], palette: ['up', 'east', 'down', 'couple'] }] })
  ]
  var NARR = { name: 'Kilat', full: 'Kilat Perak', art: { wave: 'train-char/silver/face-happy', think: 'train-char/silver/face-happy', celebrate: 'train-char/silver/face-happy', tools: 'train-char/silver/face-happy' } }
  var STORY = { id: 'hellbent', hero: 'kilat', heroName: 'Kilat Perak', narrator: NARR, saveKey: 'dunia-g15k-kereta-hellbent', logo: ['Lomba', 'ke Kota'], docTitle: 'Lomba ke Kota', collection: 'Teman-Teman Lomba',
    heroes: { kilat: { name: 'Kilat Perak', sprite: 'silver', color: '#8FA3B8' } },
    pins: { 'hb-ch1': [30, 50] },
    cast: [
      { id: 'kilat', name: 'Kilat Perak', ability: 'Kereta perak yang cepat dan mau membantu.', key: 'train-char/silver/34l-happy' },
      { id: 'lemas', name: 'Tuan Lemas', ability: 'Lokomotif tua yang gampang menyerah. Semangati dia!', key: 'train-char/defeatist/34l-neutral' }
    ] }
  W.KeretaPackLevels = { HERO: 'kilat', STORY: STORY, CHAPTERS: CHAPTERS, REGIONS: REGIONS, LEVELS: LEVELS, LIB: LIB }
})(typeof window !== 'undefined' ? window : globalThis)
