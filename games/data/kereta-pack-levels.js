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
  var CHAPTERS = [{ id: 'bl-lembah', title: 'Lembah dan Stasiun', sub: 'Bab 1' }, { id: 'bl-samson', title: 'Samson Datang', sub: 'Bab 2' }, { id: 'bl-hutan', title: 'Hutan Kayu', sub: 'Bab 3' }]
  var REGIONS = [
    { id: 'bl-lembah', title: 'Lembah dan Stasiun', bg: 'bg-bl-lembah', card: 'card-bl-lembah-stasiun', open: true, levels: ['bl01', 'bl02', 'bl03', 'bl04', 'bl05'] },
    { id: 'bl-samson', title: 'Samson Datang', bg: 'bg-bl-depot', open: true, levels: ['bl06', 'bl07', 'bl08'] },
    { id: 'bl-hutan', title: 'Hutan Kayu', bg: 'bg-bl-hutan-logging', card: 'card-bl-hutan-logging', open: true, levels: ['bl09', 'bl10', 'bl11', 'bl12'] },
    { id: 'bl-jembatan', title: 'Jembatan Miring', bg: 'bg-bl-jembatan', card: 'card-bl-penyelamatan-jembatan', open: true, levels: [] },
    { id: 'bl-selamat', title: 'Penyelamatan', bg: 'bg-bl-malam', open: true, levels: [] },
    { id: 'bl-pulang', title: 'Pulih dan Pulang', bg: 'bg-bl-rumah', card: 'card-bl-pulang-rumah', open: true, levels: [] }
  ]
  // the art keys the delivery objects ask for ('char/<who>' is a MojoArt LIB entry); all are database keys
  var LIB = {
    'char/tamu-ungu': 'malivlak-char/penumpang-ungu/berdiri', 'char/tamu-jam': 'malivlak-char/penumpang-jas-kotak/jam-saku',
    'char/tamu-hijab': 'tk-char/hijab-girl-book', 'char/henry': 'story-char/henry/wave', 'char/henry-sekop': 'story-char/henry/shovel',
    'obj/batu-bara': 'kereta-prop/coal-pile', 'obj/stasiun-kecil': 'kereta-prop/station-small', 'obj/kura': 'animal/turtle/walk',
    'obj/angka-1': 'mojo-prop/number-1', 'obj/angka-2': 'mojo-prop/number-2', 'obj/angka-3': 'mojo-prop/number-3',
    'char/baron': 'story-char/baron/stand', 'char/baron-angkuh': 'story-char/baron/angkuh', 'char/henry-cemas': 'story-char/henry/worried',
    'char/katrina': 'story-char/katrina/stand', 'train/samson': 'train-char/samson/34l-neutral', 'obj/kontrak': 'school/notebook',
    'char/scarlet': 'story-char/scarlet/stand', 'train/goro': 'train-char/goro-loco/front-34l', 'obj/papan': 'mojo-prop/bridge-wood',
    'obj/lentera': 'kereta-prop/lantern', 'obj/rumah-henry': 'kereta-prop/farmhouse', 'train/kayu': 'kereta-prop/log-stack', 'obj/gudang': 'kereta-prop/engine-house',
    'train/gerbong-hijau': 'train-char/coach-green/side-l', 'train/gerbong-merah': 'train-char/caboose-red/front-34l', 'obj/depo': 'kereta-prop/engine-house'
  }
  // L(): chapter 1. `n` is the scenario number in The_Brave_Locomotive_Linus_30_Skenario_Detail.md (its endpoint is the goal);
  // `decor` is the scenery cast of that scenario (database keys, drawn beside the track, never touched).
  function L (o) { o.ch = o.ch || 'bl-lembah'; o.rev = 3; return o }
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
      ] }),

    // ── Bab 2 "Samson Datang" (scenarios 6-8) ─────────────────────────────────────────────────
    // 06 the numbered tracks of the big depot: Baron points to the far end, Linus follows tracks 1, 2, 3 to it
    L({ id: 'bl06', n: 6, ch: 'bl-samson', title: 'Jalur Bernomor di Depo', place: 'Depo Besar', icon: 'ui/plan', bg: 'bg-bl-depot', edu: { domain: 'matematika', skill: 'urutan bilangan' },
      grid: { rows: 4, cols: 8, map: [',,,T,,,,', '.......,', ',,,,,,.,', '.......,'], theme: 'town' },
      mojo: { at: [1, 0], h: 'E', form: HERO },
      decor: [{ at: [0, 5], art: 'story-char/baron/stand' }, { at: [0, 1], art: 'story-char/baron/angkuh' }],
      objects: [
        { id: 'jalur1', type: 'mark', at: [1, 2], order: 1, seq: 'jalur', art: 'obj/angka-1', name: 'Jalur 1' },
        { id: 'jalur2', type: 'mark', at: [1, 5], order: 2, seq: 'jalur', art: 'obj/angka-2', name: 'Jalur 2' },
        { id: 'jalur3', type: 'mark', at: [3, 3], order: 3, seq: 'jalur', art: 'obj/angka-3', name: 'Jalur 3' },
        { id: 'flag', type: 'flag', at: [3, 0] }
      ],
      beats: [{ title: 'Ikuti jalur 1, 2, 3', story: 'Baron menunjuk ujung depo. Linus menyusul.',
        bo: 'Lewati jalur 1, 2, 3, lalu ke bendera.',
        objectives: [{ 'do': 'visit', id: 'jalur3' }, { 'do': 'reach', at: [3, 0] }], slots: 16, budget: 14, forms: [HERO], palette: ['east', 'down', 'west'] }] }),

    // 07 Samson arrives and takes over the main service: Linus hands his whole rake (2 green coaches + caboose) to the giant
    L({ id: 'bl07', n: 7, ch: 'bl-samson', title: 'Samson Tiba', place: 'Jalur Depo', icon: 'cmd/couple', bg: 'bg-bl-depot', edu: { domain: 'matematika', skill: 'membilang 1-3' },
      grid: { rows: 3, cols: 7, map: [',,,,,,,', '.......', '.,.,.,,'], theme: 'town' },
      mojo: { at: [1, 0], h: 'E', form: HERO },
      decor: [{ at: [0, 2], art: 'story-char/henry/worried' }, { at: [0, 4], art: 'story-char/baron/stand' }],
      objects: [
        { id: 'gerbong1', type: 'wagon', at: [2, 0], art: 'train/gerbong-hijau', name: 'Gerbong hijau pertama' },
        { id: 'gerbong2', type: 'wagon', at: [2, 2], art: 'train/gerbong-hijau', name: 'Gerbong hijau kedua' },
        { id: 'gerbong3', type: 'wagon', at: [2, 4], art: 'train/gerbong-merah', name: 'Gerbong merah' },
        { id: 'samson', type: 'loco', at: [0, 5], needs: 3, art: 'train/samson', name: 'Samson', pay: 'horn' }
      ],
      beats: [{ title: 'Rangkaian untuk Samson', story: 'Samson menggantikan Linus di layanan utama.',
        bo: 'Gandeng tiga gerbong, antar ke Samson.',
        objectives: [{ 'do': 'train', id: 'samson' }], slots: 14, budget: 10, forms: [HERO], palette: ['east', 'couple'] }] }),

    // 08 the contract: Linus brings the paper to Baron's office window, then drives out of the depot alone (two beats)
    L({ id: 'bl08', n: 8, ch: 'bl-samson', title: 'Kontrak Henry', place: 'Kantor Depo', icon: 'cmd/deliver', bg: 'bg-bl-depot', edu: { domain: 'algoritma', skill: 'urutan' },
      grid: { rows: 3, cols: 8, map: [',,,,,,,,', '........', ',.,,,,,,'], theme: 'town' },
      mojo: { at: [1, 0], h: 'E', form: HERO },
      decor: [{ at: [0, 3], art: 'story-char/henry/worried' }, { at: [0, 6], art: 'story-char/katrina/stand' }],
      objects: [
        { id: 'kontrak', type: 'parcel', at: [2, 1], kind: 'kontrak', name: 'Kontrak', art: 'obj/kontrak' },
        { id: 'baron', type: 'stop', at: [0, 5], accepts: 'kontrak', art: 'char/baron-angkuh', name: 'Baron', pay: 'wave' },
        { id: 'flag', type: 'flag', at: [1, 7] }
      ],
      beats: [
        { title: 'Antar kontrak', story: 'Henry menandatangani kontrak. Linus menunggu.',
          bo: 'Antar kontrak ke Baron.',
          objectives: [{ 'do': 'deliver', id: 'baron' }], slots: 10, budget: 7, forms: [HERO], palette: ['east', 'down', 'pick', 'deliver'] },
        { title: 'Linus keluar depo', story: 'Linus berangkat sendirian, tanpa Henry.',
          bo: 'Bawa Linus keluar depo ke bendera.',
          objectives: [{ 'do': 'reach', at: [1, 7] }], slots: 5, budget: 2, forms: [HERO], palette: ['east'] }
      ] }),

    // ── Bab 3 "Hutan Kayu" (scenarios 9-14) ───────────────────────────────────────────────────
    // 09 the dark logging gate: take the lantern, open the gate, let Goro's searchlight engine cross the line
    L({ id: 'bl09', n: 9, ch: 'bl-hutan', title: 'Gerbang Logging', place: 'Hutan Gelap', icon: 'cmd/unlock', bg: 'bg-bl-hutan-logging', edu: { domain: 'algoritma', skill: 'syarat' },
      grid: { rows: 3, cols: 8, map: [',,T,,.,,T', '........', ',,,,,,,,'].map(function (r) { return r.slice(0, 8) }), theme: 'town' },
      mojo: { at: [1, 0], h: 'E', form: HERO },
      decor: [{ at: [2, 2], art: 'story-char/carter/hands-hips' }, { at: [2, 6], art: 'story-char/james/arms-folded' }],
      objects: [
        { id: 'lentera', type: 'key', at: [1, 1], key: 'logging', art: 'obj/lentera', name: 'Lentera' },
        { id: 'gerbang', type: 'gate', at: [1, 3], key: 'logging', name: 'Gerbang logging' },
        { id: 'goro', type: 'patrol', at: [0, 5], name: 'Goro', art: 'train/goro', path: [[0, 5], [1, 5], [1, 5], [0, 5]], phase: 1 },
        { id: 'flag', type: 'flag', at: [1, 7] }
      ],
      beats: [{ title: 'Lewati gerbang dan Goro', story: 'Hutan gelap. Linus membuka gerbang logging.',
        bo: 'Sampai ke bendera: buka gerbang, tunggu Goro.',
        objectives: [{ 'do': 'reach', at: [1, 7] }], slots: 12, budget: 9, forms: [HERO], palette: ['east', 'unlock', 'wait'] }] }),

    // 10 the broken rail beside the wrecks: fetch a plank and lay it over the gap
    L({ id: 'bl10', n: 10, ch: 'bl-hutan', title: 'Rel Putus', place: 'Bangkai Kereta', icon: 'cmd/place', bg: 'bg-bl-hutan-logging', edu: { domain: 'algoritma', skill: 'alat yang tepat' },
      grid: { rows: 3, cols: 8, map: [',,,,,,,,', '....o...', ',.,,,,,,'], theme: 'town' },
      mojo: { at: [1, 0], h: 'E', form: HERO },
      decor: [{ at: [0, 2], art: 'train-char/rongsokan-a/v2' }, { at: [0, 6], art: 'train-char/rongsokan-b/v5' }, { at: [2, 4], art: 'train-char/goro-loco/front-34r' }, { at: [2, 6], art: 'story-char/james/scroll' }],
      objects: [
        { id: 'papan', type: 'part', at: [2, 1], art: 'obj/papan', name: 'Papan' },
        { id: 'flag', type: 'flag', at: [1, 7] }
      ],
      beats: [{ title: 'Pasang papan di rel putus', story: 'Rel putus dekat bangkai kereta.',
        bo: 'Pasang papan di rel putus, lalu ke bendera.',
        objectives: [{ 'do': 'reach', at: [1, 7] }], slots: 12, budget: 9, forms: [HERO], palette: ['east', 'down', 'pick', 'place'] }] }),

    // 11 Henry at home in the rain: Linus brings Scarlet to him (the quiet comfort scene)
    L({ id: 'bl11', n: 11, ch: 'bl-hutan', title: 'Scarlet untuk Henry', place: 'Rumah Henry', icon: 'cmd/deliver', bg: 'bg-bl-rumah', edu: { domain: 'matematika', skill: 'membilang 1' },
      grid: { rows: 3, cols: 7, map: [',,,,,,,', '.......', ',.,,,,,'], theme: 'town' },
      mojo: { at: [1, 0], h: 'E', form: HERO },
      decor: [{ at: [0, 3], art: 'story-char/henry/worried' }, { at: [2, 5], art: 'story-char/scarlet/ramah' }],
      objects: [
        { id: 'scarlet', type: 'rider', at: [2, 1], who: 'scarlet', name: 'Scarlet' },
        { id: 'rumah', type: 'stop', at: [0, 5], accepts: 'scarlet', art: 'obj/rumah-henry', name: 'Rumah Henry', pay: 'reunion' }
      ],
      beats: [{ title: 'Scarlet menemui Henry', story: 'Henry sedih di rumah. Scarlet menemaninya.',
        bo: 'Antar Scarlet ke rumah Henry.',
        objectives: [{ 'do': 'deliver', id: 'rumah' }], slots: 12, budget: 7, forms: [HERO], palette: ['east', 'down', 'pick', 'deliver'] }] }),

    // 12-14 PETUALANGAN BESAR, four beats across a long journey (fog valley -> timber yard -> signal on the gorge -> city yard)
    L({ id: 'bl12', n: 12, ns: [12, 13, 14], big: true, ch: 'bl-hutan', title: 'Kayu untuk Kota', place: 'Petualangan Besar', icon: 'cmd/couple', bg: 'bg-bl-hutan-logging',
      bgs: ['bg-bl-lembah', 'bg-bl-hutan-logging', 'bg-bl-jembatan', 'bg-bl-kota'], edu: { domain: 'campuran', skill: 'urutan perjalanan' },
      celebrate: ['story-char/henry/wave', 'story-char/scarlet/ramah', 'story-char/baron/stand', 'story-char/katrina/stand'],
      grid: { rows: 6, cols: 8, map: [',,,T.,,,', '........', ',,,,,,,.', '........', '.,,,,,,,', '........'], theme: 'town' },
      mojo: { at: [1, 0], h: 'E', form: HERO },
      decor: [{ at: [0, 1], art: 'story-char/baron/stand' }, { at: [0, 6], art: 'story-char/baron/angkuh' }, { at: [2, 2], art: 'story-char/carter/arms-crossed' },
        { at: [2, 5], art: 'story-char/james/walk-scroll' }, { at: [4, 2], art: 'story-char/henry/worried' }, { at: [4, 6], art: 'story-char/katrina/stand' }],
      objects: [
        { id: 'kura', type: 'patrol', at: [0, 4], name: 'Kura-kura', art: 'obj/kura', path: [[0, 4], [1, 4], [1, 4], [0, 4]], phase: 1 },
        { id: 'kayu1', type: 'wagon', at: [3, 5], art: 'train/kayu', name: 'Gerbong kayu pertama' },
        { id: 'kayu2', type: 'wagon', at: [3, 2], art: 'train/kayu', name: 'Gerbong kayu kedua' },
        { id: 'lampu', type: 'key', at: [5, 1], key: 'sinyal', art: 'obj/lentera', name: 'Lampu sinyal' },
        { id: 'palang', type: 'gate', at: [5, 3], key: 'sinyal', name: 'Palang sinyal' },
        { id: 'gudang', type: 'loco', at: [4, 7], needs: 2, art: 'obj/gudang', name: 'Gudang Kota', pay: 'horn' }
      ],
      beats: [
        { title: 'Lembah berkabut', story: 'Kura-kura menyeberang rel. Linus menunggu.',
          bo: 'Sampai ke bendera, beri jalan kura-kura.',
          objectives: [{ 'do': 'reach', at: [1, 7] }], slots: 13, budget: 10, forms: [HERO], palette: ['east', 'wait'] },
        { title: 'Muatan kayu', story: 'Dua gerbong kayu menunggu di rel.',
          bo: 'Gandeng dua gerbong kayu.',
          objectives: [{ 'do': 'wagons', n: 2 }, { 'do': 'reach', at: [3, 0] }], start: { at: [3, 7], h: 'W' }, slots: 12, budget: 9, forms: [HERO], palette: ['west', 'couple'] },
        { title: 'Palang sinyal', story: 'Palang sinyal menutup jembatan.',
          bo: 'Buka palang sinyal dengan lampu.',
          objectives: [{ 'do': 'open', id: 'palang' }], slots: 8, budget: 5, forms: [HERO], palette: ['down', 'east', 'unlock'] },
        { title: 'Antar ke kota', story: 'Kayu tiba di gudang kota.',
          bo: 'Gandeng gerbong ke Gudang Kota.',
          objectives: [{ 'do': 'train', id: 'gudang' }], slots: 9, budget: 6, forms: [HERO], palette: ['east', 'couple'] }
      ] })
  ]
  W.KeretaPackLevels = { HERO: HERO, CHAPTERS: CHAPTERS, REGIONS: REGIONS, LEVELS: LEVELS, LIB: LIB }
})(typeof window !== 'undefined' ? window : globalThis)
