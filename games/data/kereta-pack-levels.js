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
    'char/tamu-hijab': 'tk-char/hijab-girl-book', 'char/henry': 'story-char/henry/shovel', 'char/henry-wave': 'story-char/henry/wave',
    'obj/batu-bara': 'kereta-prop/coal-pile', 'obj/stasiun-kecil': 'kereta-prop/station-small', 'obj/kura': 'animal/turtle/walk',
    'train/gerbong-hijau': 'train-char/coach-green/side-l', 'obj/depo': 'kereta-prop/engine-house'
  }
  function L (o) { o.ch = 'bl-lembah'; o.rev = 3; return o }
  var LEVELS = [
    L({ id: 'bl01', title: 'Linus Jalan-Jalan', place: 'Lembah Hijau', icon: 'cmd/east', bg: 'bg-bl-lembah', edu: { domain: 'algoritma', skill: 'urutan' },
      grid: { rows: 3, cols: 5, map: [',,...', 'T,.,T', '...,,'], theme: 'town' },
      mojo: { at: [2, 0], h: 'E', form: HERO },
      objects: [{ id: 'flag', type: 'flag', at: [0, 4] }],
      beats: [{ title: 'Keliling lembah', story: 'Di lembah yang hijau tinggal Linus, lokomotif kecil berwarna biru. Mari jalan-jalan sampai ke ujung lembah.',
        bo: 'Bawa Linus sampai ke bendera di ujung lembah. Ikuti relnya: KANAN, ATAS, lalu KANAN lagi.',
        objectives: [{ 'do': 'reach', at: [0, 4] }], slots: 8, budget: 6, forms: [HERO], palette: ['up', 'east'] }] }),

    L({ id: 'bl02', title: 'Henry Menyiapkan Tenaga', place: 'Kaki Tanjakan', icon: 'cmd/pick', bg: 'bg-bl-lembah', edu: { domain: 'matematika', skill: 'membilang 1-3' },
      grid: { rows: 3, cols: 6, map: [',,,,,,', '......', '.,.,.,'], theme: 'town' },
      mojo: { at: [1, 3], h: 'W', form: HERO },
      objects: [
        { id: 'batu1', type: 'parcel', at: [2, 0], kind: 'batu', name: 'Batu bara pertama', art: 'obj/batu-bara' },
        { id: 'batu2', type: 'parcel', at: [2, 2], kind: 'batu', name: 'Batu bara kedua', art: 'obj/batu-bara' },
        { id: 'batu3', type: 'parcel', at: [2, 4], kind: 'batu', name: 'Batu bara ketiga', art: 'obj/batu-bara' },
        { id: 'henry', type: 'stop', at: [0, 3], accepts: 'batu', need: 3, art: 'char/henry', name: 'Henry', pay: 'wave' }
      ],
      beats: [{ title: 'Tiga bongkah untuk tungku', story: 'Di depan ada tanjakan curam. Henry butuh tiga bongkah batu bara supaya Linus punya tenaga.',
        bo: 'Antar tiga bongkah batu bara ke Henry. AMBIL satu bongkah, lalu ANTAR di SEBELAH Henry.',
        objectives: [{ 'do': 'deliver', id: 'henry' }], slots: 20, budget: 16, forms: [HERO], palette: MOVE.concat(['pick', 'deliver']) }] }),

    L({ id: 'bl03', title: 'Dua Gerbong Mendaki', place: 'Jalur Pegunungan', icon: 'cmd/couple', bg: 'bg-bl-gunung', edu: { domain: 'matematika', skill: 'membilang 1-2' },
      grid: { rows: 3, cols: 7, map: [',,,,,,.', '.......', '.,.,,,,'], theme: 'hill' },
      mojo: { at: [1, 0], h: 'E', form: HERO },
      objects: [
        { id: 'gerbong1', type: 'wagon', at: [2, 0], art: 'train/gerbong-hijau', name: 'Gerbong pertama' },
        { id: 'gerbong2', type: 'wagon', at: [2, 2], art: 'train/coach-slip', name: 'Gerbong kedua' },
        { id: 'flag', type: 'flag', at: [0, 6] }
      ],
      beats: [{ title: 'Dua gerbong ikut', story: 'Jalurnya menanjak pelan-pelan. Linus mau membawa dua gerbongnya sampai ke ujung jalur.',
        bo: 'Bawa dua gerbong sampai ke bendera. Berhenti di SEBELAH gerbong, lalu GANDENG. Setelah itu jalan terus.',
        objectives: [{ 'do': 'wagons', n: 2 }, { 'do': 'reach', at: [0, 6] }], slots: 12, budget: 9, forms: [HERO], palette: MOVE.concat(['couple']) }] }),

    L({ id: 'bl04', title: 'Sahabat di Rel', place: 'Rel Tepi Sungai', icon: 'cmd/wait', bg: 'bg-bl-lembah', edu: { domain: 'algoritma', skill: 'menunggu giliran' },
      grid: { rows: 3, cols: 7, map: [',,,.,,,', '.......', ',,,.,,,'], theme: 'town' },
      mojo: { at: [1, 0], h: 'E', form: HERO },
      objects: [
        { id: 'kura', type: 'patrol', at: [0, 3], name: 'Kura-kura', art: 'obj/kura', path: [[0, 3], [1, 3], [2, 3], [2, 3], [1, 3], [0, 3]], phase: 2 },
        { id: 'flag', type: 'flag', at: [1, 6] }
      ],
      beats: [{ title: 'Beri jalan kura-kura', story: 'Seekor kura-kura kecil sedang menyeberang rel. Linus tidak mau mengagetkannya.',
        bo: 'Beri jalan untuk kura-kura, lalu sampai ke bendera. Kalau ia di depan, TUNGGU sampai relnya kosong.',
        objectives: [{ 'do': 'reach', at: [1, 6] }], slots: 10, budget: 7, forms: [HERO], palette: ['east', 'wait'] }] }),

    L({ id: 'bl05', title: 'Melayani Penumpang', place: 'Stasiun Kecil', icon: 'cmd/deliver', bg: 'bg-bl-depot', edu: { domain: 'matematika', skill: 'membilang 1-3' },
      grid: { rows: 3, cols: 7, map: [',,,,,,,', '.......', '.,.,.,,'], theme: 'town' },
      mojo: { at: [1, 2], h: 'E', form: HERO },
      objects: [
        { id: 'tamu1', type: 'rider', at: [2, 0], who: 'tamu-ungu', name: 'Tuan Ungu' },
        { id: 'tamu2', type: 'rider', at: [2, 2], who: 'tamu-jam', name: 'Tuan Jam Saku' },
        { id: 'tamu3', type: 'rider', at: [2, 4], who: 'tamu-hijab', name: 'Kak Aisyah' },
        { id: 'peron', type: 'stop', at: [0, 2], accepts: 'rider', need: 3, art: 'obj/stasiun-kecil', name: 'Peron tujuan', pay: 'wave' },
        { id: 'flag', type: 'flag', at: [1, 6] }
      ],
      beats: [{ title: 'Tiga penumpang', story: 'Linus berhenti di stasiun kecil. Para penumpang menunggu di peron, lalu Linus pulang ke depo.',
        bo: 'Antar tiga penumpang ke peron tujuan, lalu ke bendera. AMBIL satu penumpang, lalu ANTAR di SEBELAH peron.',
        objectives: [{ 'do': 'deliver', id: 'peron' }, { 'do': 'reach', at: [1, 6] }], slots: 22, budget: 18, forms: [HERO], palette: MOVE.concat(['pick', 'deliver']) }] })
  ]
  W.KeretaPackLevels = { HERO: HERO, CHAPTERS: CHAPTERS, REGIONS: REGIONS, LEVELS: LEVELS, LIB: LIB }
})(typeof window !== 'undefined' ? window : globalThis)
