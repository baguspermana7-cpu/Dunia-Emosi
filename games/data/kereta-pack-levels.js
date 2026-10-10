/* =============================================================================
 * kereta-pack-levels.js — Kereta Pemberani on the MOJO engine: the story of "The Brave Locomotive" (Linus and Henry)
 * written as Mojo level data (games/data/mojo-levels.js schema). Checkpoint 1 = Bab 1 "Lembah", the first five
 * missions. The map is the rail: '.' is rail (road cells), ',' grass, 'T' pine. Objects use prog-grid's own types:
 *   passengers = rider, the platform = stop, coal = parcel, wagons = wagon, the turtle = patrol (TUNGGU lets it pass).
 * Story, titles and cast come from the original scenarios (data/kereta-levels-brave.js, kid-safe adaptation: no
 * chains, no whip, women only in hijab). Level rules are Mojo's: one concept per level, a restricted palette,
 * slots = shortest + 2-4, the beat line names its objective. Every level is proved solvable by
 * tools/qa-kereta-pack.mjs (ProgGrid.verify).
 * ==========================================================================*/
(function (W) {
  'use strict'
  var MOVE = ['up', 'down', 'west', 'east']
  var HERO = 'linus'
  var CHAPTERS = [{ id: 'bl-lembah', title: 'Lembah dan Stasiun', sub: 'Bab 1' }]
  var REGIONS = [
    { id: 'bl-lembah', title: 'Lembah dan Stasiun', bg: 'bg-bl-lembah', card: 'card-bl-lembah-stasiun', open: true, levels: ['bl01', 'bl02', 'bl03', 'bl04', 'bl05'] },
    { id: 'bl-samson', title: 'Samson Datang', bg: 'bg-bl-depot', open: true, levels: [] },
    { id: 'bl-hutan', title: 'Hutan Kayu', bg: 'bg-bl-hutan-logging', card: 'card-bl-hutan-logging', open: true, levels: [] },
    { id: 'bl-jembatan', title: 'Jembatan Miring', bg: 'bg-bl-jembatan', card: 'card-bl-penyelamatan-jembatan', open: true, levels: [] },
    { id: 'bl-selamat', title: 'Penyelamatan', bg: 'bg-bl-malam', open: true, levels: [] },
    { id: 'bl-pulang', title: 'Pulih dan Pulang', bg: 'bg-bl-rumah', card: 'card-bl-pulang-rumah', open: true, levels: [] }
  ]
  // the art keys the delivery objects ask for ('char/<who>' is a MojoArt LIB entry); all are database keys
  var LIB = {
    'char/tamu-ungu': 'malivlak-char/penumpang-ungu/berdiri', 'char/tamu-jam': 'malivlak-char/penumpang-jas-kotak/jam-saku',
    'char/tamu-hijab': 'tk-char/hijab-girl-book', 'char/henry': 'story-char/henry/wave', 'char/henry-sekop': 'story-char/henry/shovel',
    'obj/batu-bara': 'kereta-prop/coal-pile', 'obj/stasiun-kecil': 'kereta-prop/station-small', 'obj/kura': 'animal/turtle/walk',
    'train/gerbong-hijau': 'train-char/coach-green/side-l', 'train/gerbong-merah': 'train-char/caboose-red/front-34l', 'obj/depo': 'kereta-prop/engine-house'
  }
  // L(): chapter 1. `n` is the scenario number in The_Brave_Locomotive_Linus_30_Skenario_Detail.md (its endpoint is the goal);
  // `decor` is the scenery cast of that scenario (database keys, drawn beside the track, never touched).
  function L (o) { o.ch = 'bl-lembah'; o.rev = 3; return o }
  var LEVELS = [
    // 01 Linus and his short rake cross the valley: the first lesson is only to drive (move cards), over a little bridge
    L({ id: 'bl01', n: 1, title: 'Linus di Lembah', place: 'Lembah Hijau', icon: 'cmd/east', bg: 'bg-bl-lembah', edu: { domain: 'algoritma', skill: 'urutan' },
      grid: { rows: 4, cols: 7, map: [',,,~,,T', ',T,~,,,', ',..==..', '..,~,,,'], theme: 'town' },
      mojo: { at: [3, 0], h: 'E', form: HERO },
      decor: [{ at: [2, 0], art: 'story-char/henry/wave' }, { at: [0, 5], art: 'animal/bird-blue/fly' }, { at: [0, 1], art: 'animal/deer/graze' }],
      objects: [{ id: 'flag', type: 'flag', at: [2, 6] }],
      beats: [{ title: 'Keliling lembah', story: 'Linus dan rangkaiannya jalan-jalan di lembah.',
        bo: 'Antar Linus ke bendera di ujung lembah.',
        objectives: [{ 'do': 'reach', at: [2, 6] }], slots: 9, budget: 7, forms: [HERO], palette: ['up', 'east'] }] }),

    // 02 Henry shovels coal before the steep grade: carry three lumps to Henry (carry and count)
    L({ id: 'bl02', n: 2, title: 'Tenaga untuk Tanjakan', place: 'Kaki Tanjakan', icon: 'cmd/pick', bg: 'bg-bl-lembah', edu: { domain: 'matematika', skill: 'membilang 1-3' },
      grid: { rows: 3, cols: 6, map: [',,,,,,', '......', '.,.,.,'], theme: 'town' },
      mojo: { at: [1, 3], h: 'W', form: HERO },
      objects: [
        { id: 'batu1', type: 'parcel', at: [2, 0], kind: 'batu', name: 'Batu bara pertama', art: 'obj/batu-bara' },
        { id: 'batu2', type: 'parcel', at: [2, 2], kind: 'batu', name: 'Batu bara kedua', art: 'obj/batu-bara' },
        { id: 'batu3', type: 'parcel', at: [2, 4], kind: 'batu', name: 'Batu bara ketiga', art: 'obj/batu-bara' },
        { id: 'henry', type: 'stop', at: [0, 3], accepts: 'batu', need: 3, art: 'char/henry-sekop', name: 'Henry', pay: 'wave' }
      ],
      beats: [{ title: 'Tiga bongkah untuk tungku', story: 'Henry menyekop batu bara sebelum tanjakan.',
        bo: 'Antar tiga batu bara ke Henry.',
        objectives: [{ 'do': 'deliver', id: 'henry' }], slots: 20, budget: 16, forms: [HERO], palette: MOVE.concat(['pick', 'deliver']) }] }),

    // 03 the mountain line: hitch the whole rake (two green coaches, then the red caboose) from the sidings, then climb to the summit
    L({ id: 'bl03', n: 3, title: 'Rangkaian Mendaki', place: 'Jalur Pegunungan', icon: 'cmd/couple', bg: 'bg-bl-gunung', edu: { domain: 'matematika', skill: 'membilang 1-3' },
      grid: { rows: 4, cols: 8, map: [',,,T,,..', ',,,,,,.,', '.....=.,', '.,.,.~,,'], theme: 'hill' },
      mojo: { at: [2, 0], h: 'E', form: HERO },
      decor: [{ at: [1, 4], art: 'story-char/henry/point' }],
      objects: [
        { id: 'gerbong1', type: 'wagon', at: [3, 0], art: 'train/gerbong-hijau', name: 'Gerbong hijau pertama' },
        { id: 'gerbong2', type: 'wagon', at: [3, 2], art: 'train/gerbong-hijau', name: 'Gerbong hijau kedua' },
        { id: 'gerbong3', type: 'wagon', at: [3, 4], art: 'train/gerbong-merah', name: 'Gerbong merah' },
        { id: 'flag', type: 'flag', at: [0, 7] }
      ],
      beats: [{ title: 'Seluruh rangkaian ikut', story: 'Linus membawa tiga gerbong naik ke puncak.',
        bo: 'Gandeng tiga gerbong, lalu naik ke bendera.',
        objectives: [{ 'do': 'wagons', n: 3 }, { 'do': 'reach', at: [0, 7] }], slots: 16, budget: 12, forms: [HERO], palette: ['up', 'east', 'couple'] }] }),

    // 04 the turtle on the rail: stop and let it pass (TUNGGU); it tucks into its shell as Linus nears
    L({ id: 'bl04', n: 4, title: 'Berhenti untuk Kura-kura', place: 'Rel Tepi Sungai', icon: 'cmd/wait', bg: 'bg-bl-lembah', edu: { domain: 'algoritma', skill: 'menunggu giliran' },
      grid: { rows: 3, cols: 7, map: [',,,.,,,', '.......', ',,,.,,,'], theme: 'town' },
      mojo: { at: [1, 0], h: 'E', form: HERO },
      uses: ['animal/turtle/shell'],   // swapped in by the pack while Linus is near (kereta-pack.js objArt)
      decor: [{ at: [0, 5], art: 'story-char/henry/jongkok' }, { at: [2, 1], art: 'story-char/anak-kura/hold' }],
      objects: [
        { id: 'kura', type: 'patrol', at: [0, 3], name: 'Kura-kura', art: 'obj/kura', path: [[0, 3], [1, 3], [2, 3], [2, 3], [1, 3], [0, 3]], phase: 2 },
        { id: 'flag', type: 'flag', at: [1, 6] }
      ],
      beats: [{ title: 'Beri jalan kura-kura', story: 'Ada kura-kura di rel. Linus berhenti dulu.',
        bo: 'Beri jalan kura-kura, lalu ke bendera.',
        objectives: [{ 'do': 'reach', at: [1, 6] }], slots: 10, budget: 7, forms: [HERO], palette: ['east', 'wait'] }] }),

    // 05 serve the village station, then run home to the big depot: two beats (passengers, then the route home)
    L({ id: 'bl05', n: 5, title: 'Penumpang dan Depo', place: 'Stasiun Kecil', icon: 'cmd/deliver', bg: 'bg-bl-depot', edu: { domain: 'matematika', skill: 'membilang 1-2' },
      grid: { rows: 4, cols: 8, map: ['.,.,,,,,', '.....,,,', ',,,,....', ',T,,,,,T'], theme: 'town' },
      mojo: { at: [1, 0], h: 'E', form: HERO },
      decor: [{ at: [3, 0], art: 'story-char/henry/wave' }, { at: [0, 6], art: 'animal/bird-blue/fly' }, { at: [0, 5], art: 'char/tamu-jam' }, { at: [1, 7], art: 'obj/depo' }],
      objects: [
        { id: 'tamu1', type: 'rider', at: [0, 0], who: 'tamu-ungu', name: 'Tuan Ungu' },
        { id: 'tamu2', type: 'rider', at: [0, 2], who: 'tamu-hijab', name: 'Kak Aisyah' },
        { id: 'peron', type: 'stop', at: [0, 4], accepts: 'rider', need: 2, art: 'obj/stasiun-kecil', name: 'Peron', pay: 'wave' },
        { id: 'flag', type: 'flag', at: [2, 7] }
      ],
      beats: [
        { title: 'Naikkan penumpang', story: 'Dua penumpang menunggu di stasiun kecil.',
          bo: 'Antar dua penumpang ke peron.',
          objectives: [{ 'do': 'deliver', id: 'peron' }], slots: 16, budget: 12, forms: [HERO], palette: MOVE.concat(['pick', 'deliver']) },
        { title: 'Pulang ke depo', story: 'Sekarang Linus pulang ke depo besar.',
          bo: 'Bawa Linus pulang ke bendera di depo.',
          objectives: [{ 'do': 'reach', at: [2, 7] }], slots: 7, budget: 4, forms: [HERO], palette: ['east', 'down'] }
      ] })
  ]
  W.KeretaPackLevels = { HERO: HERO, CHAPTERS: CHAPTERS, REGIONS: REGIONS, LEVELS: LEVELS, LIB: LIB }
})(typeof window !== 'undefined' ? window : globalThis)
