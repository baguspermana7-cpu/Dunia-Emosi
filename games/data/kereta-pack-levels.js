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
  var CHAPTERS = [{ id: 'bl-lembah', title: 'Lembah dan Stasiun', sub: 'Bab 1' }, { id: 'bl-samson', title: 'Samson Datang', sub: 'Bab 2' }, { id: 'bl-hutan', title: 'Hutan Kayu', sub: 'Bab 3' }, { id: 'bl-jembatan', title: 'Jembatan Miring', sub: 'Bab 4' }, { id: 'bl-selamat', title: 'Penyelamatan', sub: 'Bab 5' }, { id: 'bl-pulang', title: 'Pulih dan Pulang', sub: 'Bab 6' }]
  var REGIONS = [
    { id: 'bl-lembah', title: 'Lembah dan Stasiun', bg: 'bg-bl-lembah', card: 'card-bl-lembah-stasiun', open: true, levels: ['bl01', 'bl02', 'bl03', 'bl04', 'bl05'] },
    { id: 'bl-samson', title: 'Samson Datang', bg: 'bg-bl-depot', open: true, levels: ['bl06', 'bl07', 'bl08'] },
    { id: 'bl-hutan', title: 'Hutan Kayu', bg: 'bg-bl-hutan-logging', card: 'card-bl-hutan-logging', open: true, levels: ['bl09', 'bl10', 'bl25', 'bl11', 'bl12'] },
    { id: 'bl-jembatan', title: 'Jembatan Miring', bg: 'bg-bl-jembatan', card: 'card-bl-penyelamatan-jembatan', open: true, levels: ['bl13', 'bl14', 'bl15', 'bl16'] },
    { id: 'bl-selamat', title: 'Penyelamatan', bg: 'bg-bl-malam', card: 'card-bl-penyelamatan-jembatan', open: true, levels: ['bl17', 'bl18', 'bl19', 'bl20'] },
    { id: 'bl-pulang', title: 'Pulih dan Pulang', bg: 'bg-bl-rumah', card: 'card-bl-pulang-rumah', open: true, levels: ['bl21', 'bl22', 'bl23', 'bl24'] }
  ]
  // the art keys the delivery objects ask for ('char/<who>' is a MojoArt LIB entry); all are database keys
  var LIB = {
    'char/tamu-ungu': 'story-char/tuan-merah/stand', 'char/tamu-jam': 'story-char/tuan-merah/point',
    'char/tamu-hijab': 'story-char/pelukis/stand', 'char/henry': 'story-char/henry/wave', 'char/henry-sekop': 'story-char/henry/shovel',
    'obj/batu-bara': 'kereta-prop/coal-pile', 'obj/stasiun-kecil': 'kereta-prop/station-small', 'obj/kura': 'animal/turtle/walk',
    'obj/angka-1': 'mojo-prop/number-1', 'obj/angka-2': 'mojo-prop/number-2', 'obj/angka-3': 'mojo-prop/number-3',
    'char/baron': 'story-char/baron/stand', 'char/baron-angkuh': 'story-char/baron/angkuh', 'char/henry-cemas': 'story-char/henry/worried',
    'char/katrina': 'story-char/katrina/stand', 'train/samson': 'train-char/samson/34l-neutral', 'obj/kontrak': 'school/notebook',
    'char/scarlet': 'story-char/scarlet/stand', 'train/goro': 'train-char/goro-loco/front-34l', 'obj/papan': 'mojo-prop/bridge-wood',
    'obj/lentera': 'kereta-prop/lantern', 'obj/rumah-henry': 'kereta-prop/farmhouse', 'train/kayu': 'kereta-prop/log-stack', 'obj/gudang': 'kereta-prop/engine-house',
    'obj/tali': 'kereta-prop/wheel-bandage', 'char/henry-tunjuk': 'story-char/henry/point', 'obj/pasak': 'kereta-prop/barrel', 'obj/kait': 'kereta-prop/log-stack',
    'train/goro-b': 'train-char/goro-loco/front-34r', 'obj/daratan': 'kereta-prop/station-small', 'train/gerbong-samson': 'train-char/coach-green/side-l',
    'char/anak-kura': 'story-char/anak-kura/hug', 'char/pelukis': 'story-char/pelukis/thumbs', 'obj/kotak-batu': 'kereta-prop/barrel', 'obj/log': 'kereta-prop/log-single',
    'obj/palu': 'mojo-prop/hammer', 'obj/obeng': 'mojo-prop/screwdriver', 'obj/kunci-inggris': 'mojo-prop/wrench', 'obj/koran': 'school/notebook', 'obj/kabin': 'kereta-prop/engine-house',
    'char/mekanik': 'story-char/mekanik/wave', 'char/mekanik-wanita': 'story-char/mekanik-wanita/hips', 'char/nyonya': 'story-char/nyonya-topi/cheer',
    'char/henry-w': 'story-char/henry/wave', 'char/scarlet-t': 'story-char/scarlet/stand', 'obj/sorot': 'mojo-fx/highlight',
    'train/gerbong-hijau': 'train-char/coach-green/side-l', 'train/gerbong-merah': 'train-char/caboose-red/front-34l', 'obj/depo': 'kereta-prop/engine-house'
  }
  // L(): chapter 1. `n` is the scenario number in The_Brave_Locomotive_Linus_30_Skenario_Detail.md (its endpoint is the goal);
  // `decor` is the scenery cast of that scenario (database keys, drawn beside the track, never touched).
  function L (o) { o.ch = o.ch || 'bl-lembah'; o.rev = 3; o.autoAim = true; return o }
  var LEVELS = [
    // 01 Linus and his short rake cross the valley: the first lesson is only to drive (move cards), over a little bridge
    L({ id: 'bl01', terrain: 'meadow', mood: 'sun', n: 1, title: 'Linus di Lembah', place: 'Lembah Hijau', icon: 'cmd/east', bg: 'bg-bl-lembah', edu: { domain: 'algoritma', skill: 'urutan' },
      grid: { rows: 4, cols: 7, map: [',,,~,,T', ',T,~,,,', ',..==..', '..,~,,,'], theme: 'town' },
      mojo: { at: [3, 0], h: 'E', form: HERO },
      cab: 'story-char/henry/wave',
      decor: [{ at: [0, 5], art: 'animal/bird-blue/fly' }, { at: [0, 1], art: 'animal/deer/graze' }],
      objects: [{ id: 'flag', type: 'flag', at: [2, 6] }],
      beats: [{ title: 'Keliling lembah', story: 'Linus dan rangkaiannya jalan-jalan di lembah.',
        bo: 'Antar Linus ke bendera di ujung lembah.',
        objectives: [{ 'do': 'reach', at: [2, 6] }], slots: 9, budget: 7, forms: [HERO], palette: ['up', 'east'] }] }),

    // 02 Henry shovels coal before the steep grade: carry three lumps to Henry (carry and count)
    L({ id: 'bl02', terrain: 'meadow', mood: 'sun', n: 2, title: 'Tenaga untuk Tanjakan', place: 'Kaki Tanjakan', icon: 'cmd/pick', bg: 'bg-bl-lembah', edu: { domain: 'matematika', skill: 'membilang 1-3' },
      grid: { rows: 3, cols: 6, map: [',,,,,,', '......', '.,.,.,'], theme: 'town' },
      mojo: { at: [1, 3], h: 'W', form: HERO },
      objects: [
        { id: 'batu1', type: 'parcel', at: [2, 0], kind: 'batu', name: 'Batu bara pertama', art: 'obj/batu-bara' },
        { id: 'batu2', type: 'parcel', at: [2, 2], kind: 'batu', name: 'Batu bara kedua', art: 'obj/batu-bara' },
        { id: 'batu3', type: 'parcel', at: [2, 4], kind: 'batu', name: 'Batu bara ketiga', art: 'obj/batu-bara' },
        { id: 'henry', type: 'stop', at: [0, 3], accepts: 'batu', need: 3, art: 'char/henry-sekop', name: 'Henry', pay: 'wave' }
      ],
      beats: [{ title: 'Tiga bongkah untuk tungku', story: 'Henry menyekop batu bara sebelum tanjakan.',
        bo: 'Muat tiga batu bara, turunkan di Henry.',
        objectives: [{ 'do': 'deliver', id: 'henry' }], slots: 20, budget: 16, forms: [HERO], palette: MOVE.concat(['pick', 'deliver']) }] }),

    // 03 the mountain line: hitch the whole rake (two green coaches, then the red caboose) from the sidings, then climb to the summit
    L({ id: 'bl03', terrain: 'mountain', mood: 'sun', n: 3, title: 'Rangkaian Mendaki', place: 'Jalur Pegunungan', icon: 'cmd/couple', bg: 'bg-bl-gunung', edu: { domain: 'matematika', skill: 'membilang 1-3' },
      grid: { rows: 4, cols: 8, map: [',,,T,,..', ',,,,,,.,', '.....=.,', '.,.,.~,,'], theme: 'hill' },
      mojo: { at: [2, 0], h: 'E', form: HERO },
      cab: 'story-char/henry/point',
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
    L({ id: 'bl04', terrain: 'meadow', mood: 'sun', n: 4, title: 'Berhenti untuk Kura-kura', place: 'Rel Tepi Sungai', icon: 'cmd/wait', bg: 'bg-bl-lembah', edu: { domain: 'algoritma', skill: 'menunggu giliran' },
      grid: { rows: 3, cols: 7, map: [',,,.,,,', '.......', ',,,.,,,'], theme: 'town' },
      mojo: { at: [1, 0], h: 'E', form: HERO },
      uses: ['animal/turtle/shell'],   // swapped in by the pack while Linus is near (kereta-pack.js objArt)
      cab: 'story-char/henry/jongkok',   // sc4: Henry leans out of the cab to look at the turtle (the child with the baby turtle is Scarlet-era sc27, not here)
      decor: [{ at: [2, 5], art: 'animal/bird-blue/fly' }],
      objects: [
        { id: 'kura', type: 'patrol', at: [0, 3], name: 'Kura-kura', art: 'obj/kura', path: [[0, 3], [1, 3], [2, 3], [2, 3], [1, 3], [0, 3]], phase: 2 },
        { id: 'flag', type: 'flag', at: [1, 6] }
      ],
      beats: [{ title: 'Beri jalan kura-kura', story: 'Ada kura-kura di rel. Linus berhenti dulu.',
        bo: 'Beri jalan kura-kura, lalu ke bendera.',
        objectives: [{ 'do': 'reach', at: [1, 6] }], slots: 10, budget: 7, forms: [HERO], palette: ['east', 'wait'] }] }),

    // 05 serve the village station, then run home to the big depot: two beats (passengers, then the route home)
    L({ id: 'bl05', terrain: 'meadow', mood: 'sunset', n: 5, title: 'Penumpang dan Depo', place: 'Stasiun Kecil', icon: 'cmd/deliver', bg: 'bg-bl-depot', edu: { domain: 'matematika', skill: 'membilang 1-2' },
      grid: { rows: 4, cols: 8, map: ['.,.,,,,,', '.....,,,', ',,,,....', ',T,,,,,T'], theme: 'town' },
      mojo: { at: [1, 0], h: 'E', form: HERO },
      cab: 'story-char/henry/wave',
      decor: [{ at: [0, 6], art: 'animal/bird-blue/fly' }, { at: [0, 5], art: 'char/tamu-jam' }, { at: [1, 7], art: 'obj/depo' }],
      objects: [
        { id: 'tamu1', type: 'rider', at: [0, 0], who: 'tamu-ungu', name: 'Tuan Ungu' },
        { id: 'tamu2', type: 'rider', at: [0, 2], who: 'tamu-hijab', name: 'Kak Aisyah' },
        { id: 'peron', type: 'stop', at: [0, 4], accepts: 'rider', need: 2, art: 'obj/stasiun-kecil', name: 'Peron', pay: 'wave' },
        { id: 'flag', type: 'flag', at: [2, 7] }
      ],
      beats: [
        { title: 'Naikkan penumpang', story: 'Dua penumpang menunggu di stasiun kecil.',
          bo: 'Naikkan dua penumpang, turunkan di peron.',
          objectives: [{ 'do': 'deliver', id: 'peron' }], slots: 16, budget: 12, forms: [HERO], palette: MOVE.concat(['pick', 'deliver']) },
        { title: 'Pulang ke depo', story: 'Sekarang Linus pulang ke depo besar.',
          bo: 'Bawa Linus pulang ke bendera di depo.',
          objectives: [{ 'do': 'reach', at: [2, 7] }], slots: 7, budget: 4, forms: [HERO], palette: ['east', 'down'] }
      ] }),

    // ── Bab 2 "Samson Datang" (scenarios 6-8) ─────────────────────────────────────────────────
    // 06 the numbered tracks of the big depot: Baron points to the far end, Linus follows tracks 1, 2, 3 to it
    L({ id: 'bl06', terrain: 'depot', mood: 'sunset', n: 6, ch: 'bl-samson', title: 'Jalur Bernomor di Depo', place: 'Depo Besar', icon: 'ui/plan', bg: 'bg-bl-depot', edu: { domain: 'matematika', skill: 'urutan bilangan' },
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
    L({ id: 'bl07', terrain: 'depot', mood: 'sunset', n: 7, ch: 'bl-samson', title: 'Samson Tiba', place: 'Jalur Depo', icon: 'cmd/couple', bg: 'bg-bl-depot', edu: { domain: 'matematika', skill: 'membilang 1-3' },
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
    L({ id: 'bl08', terrain: 'depot', mood: 'sunset', n: 8, ch: 'bl-samson', title: 'Kontrak Henry', place: 'Kantor Depo', icon: 'cmd/deliver', bg: 'bg-bl-depot', edu: { domain: 'algoritma', skill: 'urutan' },
      grid: { rows: 3, cols: 8, map: [',,,,,,,,', '........', ',.,,,,,,'], theme: 'town' },
      mojo: { at: [1, 0], h: 'E', form: HERO },
      decor: [{ at: [0, 3], art: 'story-char/henry/worried' }, { at: [0, 6], art: 'story-char/katrina/stand' }],
      objects: [
        { id: 'kontrak', type: 'parcel', at: [2, 1], kind: 'kontrak', name: 'Kontrak', art: 'obj/kontrak' },
        { id: 'baron', type: 'stop', at: [0, 5], accepts: 'kontrak', art: 'char/baron-angkuh', name: 'Baron', pay: 'wave' },
        { id: 'flag', type: 'flag', at: [1, 7] }
      ],
      beats: [
        { title: 'Serahkan kontrak', story: 'Henry menandatangani kontrak. Linus menunggu.',
          bo: 'Ambil kontrak, serahkan ke Baron.',
          objectives: [{ 'do': 'deliver', id: 'baron' }], slots: 10, budget: 7, forms: [HERO], palette: ['east', 'down', 'pick', 'deliver'] },
        { title: 'Linus keluar depo', mood: 'rain', story: 'Linus berangkat sendirian, tanpa Henry.',
          bo: 'Bawa Linus keluar depo ke bendera.',
          objectives: [{ 'do': 'reach', at: [1, 7] }], slots: 5, budget: 2, forms: [HERO], palette: ['east'] }
      ] }),

    // ── Bab 3 "Hutan Kayu" (scenarios 9-14) ───────────────────────────────────────────────────
    // ── "Ke Gunung" PETUALANGAN BESAR (scenarios 9-10, owner alignment doc): Linus goes ALONE with his tender, in the rain, past the
    // POINT OF NO RETURN sign, under the searchlight, through the wreck valley, into the logging yard. No coaches, no loading.
    // CAMERA (when main ships lv.view): beat 1 diag, beat 2 top, beat 3 diag, beat 4 top.
    L({ id: 'bl25', terrain: 'mountain', mood: 'rain', n: 9, ns: [9, 10], big: true, quiet: true, ch: 'bl-hutan', title: 'Ke Gunung', place: 'Petualangan Besar', icon: 'cmd/wait', bg: 'bg-bl-gunung',
      bgs: ['bg-bl-gunung', 'bg-bl-hutan-logging', 'bg-bl-malam', 'bg-bl-hutan-logging'], edu: { domain: 'campuran', skill: 'urutan perjalanan' },
      celebrate: [], tired: [false, false, true, true],
      grid: { rows: 6, cols: 8, map: [',,,,,,,,', '........', ',,,,,,,.', '........', '.,,.,,,,', '........'], theme: 'hill' },
      mojo: { at: [1, 0], h: 'E', form: HERO },
      decor: [{ at: [0, 2], art: 'kereta-prop/pine' }],
      objects: [
        { id: 'sorot', type: 'patrol', at: [4, 3], name: 'Sorot lampu', art: 'obj/sorot', path: [[4, 3], [3, 3], [3, 3], [4, 3]], phase: 0 },
        { id: 'l1', type: 'mark', at: [5, 2], order: 1, seq: 'lampu', art: 'kereta-prop/lantern', name: 'Lampu tua 1' },
        { id: 'l2', type: 'mark', at: [5, 4], order: 2, seq: 'lampu', art: 'kereta-prop/lantern', name: 'Lampu tua 2' },
        { id: 'l3', type: 'mark', at: [5, 6], order: 3, seq: 'lampu', art: 'kereta-prop/lantern', name: 'Lampu tua 3' }
      ],
      beats: [
        { title: 'Jalur sempit di gunung', mood: 'rain', story: 'Hujan turun. Linus mendaki sendirian.',
          bo: 'Bawa Linus ke bendera di gunung.', hide: ['sorot', 'l1', 'l2', 'l3'], fx: ['fog', 'rain', 'lightning'], steam: true, flagAt: [1, 7],
          decor: [{ at: [0, 1], art: 'kereta-prop/pine' }, { at: [0, 5], art: 'kereta-prop/farmhouse' }, { at: [2, 2], art: 'kereta-prop/rock' }, { at: [0, 7], art: 'kereta-prop/pine' }],
          objectives: [{ 'do': 'reach', at: [1, 7] }], slots: 11, budget: 7, forms: [HERO], palette: ['east'] },
        { title: 'Batas tanpa kembali', terrain: 'mountain', mood: 'storm', story: 'Sorot lampu menyapu jalur. Linus menunggu.',
          bo: 'Tunggu sorot lampu lewat, lalu ke bendera.', hide: ['l1', 'l2', 'l3'], fx: ['rain', 'lightning'],
          decor: [{ at: [2, 1], art: 'mojo-prop/direction-sign' }, { at: [2, 2], art: 'animal/vulture/perch-1' }, { at: [2, 4], art: 'animal/vulture/perch-2' }, { at: [4, 5], art: 'train-char/goro-loco/front-34l' }, { at: [0, 6], art: 'kereta-prop/pine' }],
          start: { at: [3, 7], h: 'W' }, objectives: [{ 'do': 'reach', at: [3, 0] }], slots: 12, budget: 9, forms: [HERO], palette: ['west', 'wait'] },
        { title: 'Lembah kereta tua', terrain: 'logging', mood: 'storm', story: 'Kilat menerangi kereta-kereta tua.',
          bo: 'Lampu tua 1, 2, lalu lampu tua 3.', hide: ['sorot'], fx: ['rain', 'lightning', 'fog'], lean: [4, 4], lamps: [[5, 2], [5, 4], [5, 6]],
          decor: [{ at: [0, 0], art: 'train-char/rongsokan-a/v1' }, { at: [0, 2], art: 'train-char/rongsokan-b/v4' }, { at: [0, 4], art: 'train-char/rongsokan-a/v7' }, { at: [0, 6], art: 'train-char/rongsokan-b/v3' }, { at: [0, 7], art: 'train-char/rongsokan-a/v6' }, { at: [2, 0], art: 'train-char/rongsokan-b/v2' }, { at: [2, 2], art: 'train-char/rongsokan-a/v5' }, { at: [2, 4], art: 'train-char/rongsokan-b/v1' }, { at: [2, 6], art: 'train-char/rongsokan-a/v4' }, { at: [4, 1], art: 'train-char/rongsokan-b/v7' }, { at: [4, 5], art: 'train-char/rongsokan-a/v3' }, { at: [4, 7], art: 'train-char/rongsokan-b/v6' }, { at: [2, 7], art: 'train-char/rongsokan-a/v2' }],
          objectives: [{ 'do': 'visit', id: 'l3' }], slots: 10, budget: 8, forms: [HERO], palette: ['east', 'down'] },
        { title: 'Kawasan logging', terrain: 'logging', mood: 'rain', story: 'James menunjuk dari lereng. Linus melaju terus.',
          bo: 'Terus ke bendera di kawasan logging.', hide: ['sorot', 'l1', 'l2', 'l3'], fx: ['rain', 'lightning'], flagAt: [1, 7],
          decor: [{ at: [2, 3], art: 'story-char/james/point-scroll' }, { at: [0, 6], art: 'kereta-prop/sawmill' }, { at: [0, 2], art: 'kereta-prop/log-stack' }, { at: [2, 6], art: 'kereta-prop/log-stack' }, { at: [0, 4], art: 'kereta-prop/lantern' }],
          start: { at: [1, 0], h: 'E' }, objectives: [{ 'do': 'reach', at: [1, 7] }], slots: 11, budget: 7, forms: [HERO], palette: ['east'] }
      ] }),

    // 09 the first night at the logging line: Linus waits under Goro's searchlight (the short TUNGGU lesson of Bab 3; alone, no coaches)
    L({ id: 'bl09', terrain: 'logging', mood: 'storm', n: 9, ch: 'bl-hutan', title: 'Sorot Lampu Goro', place: 'Hutan Gelap', icon: 'cmd/wait', bg: 'bg-bl-hutan-logging', edu: { domain: 'algoritma', skill: 'menunggu giliran' },
      grid: { rows: 3, cols: 8, map: [',,,.,,,,', '........', ',,,,,,,,'], theme: 'town' },
      mojo: { at: [1, 0], h: 'E', form: HERO },
      decor: [{ at: [2, 2], art: 'story-char/carter/hands-hips' }, { at: [2, 6], art: 'story-char/james/arms-folded' }, { at: [0, 6], art: 'train-char/goro-loco/front-34l' }],
      fx: ['rain', 'lightning'],
      objects: [
        { id: 'sorot', type: 'patrol', at: [0, 3], name: 'Sorot lampu', art: 'obj/sorot', path: [[0, 3], [1, 3], [1, 3], [0, 3]], phase: 0 },
        { id: 'flag', type: 'flag', at: [1, 7] }
      ],
      beats: [{ title: 'Tunggu sorot lampu', story: 'Lampu Goro menyapu jalur. Linus menunggu.',
        bo: 'Tunggu sorot lampu lewat, lalu ke bendera.', fx: ['rain', 'lightning'],
        objectives: [{ 'do': 'reach', at: [1, 7] }], slots: 12, budget: 8, forms: [HERO], palette: ['east', 'wait'] }] }),

    // 10 the wrecks beside the line (scenery, nothing to repair): lantern key, the latch at the end, James watching with his scroll
    L({ id: 'bl10', terrain: 'logging', mood: 'storm', n: 10, ch: 'bl-hutan', title: 'Kereta-Kereta Tua', place: 'Bangkai Kereta', icon: 'cmd/unlock', bg: 'bg-bl-malam', edu: { domain: 'algoritma', skill: 'syarat' },
      grid: { rows: 3, cols: 8, map: [',,,,,,,,', '........', ',,,,,,,,'], theme: 'town' },
      mojo: { at: [1, 0], h: 'E', form: HERO },
      decor: [{ at: [0, 1], art: 'train-char/rongsokan-a/v2' }, { at: [0, 4], art: 'train-char/rongsokan-b/v5' }, { at: [2, 3], art: 'train-char/goro-loco/front-34r' }, { at: [2, 6], art: 'story-char/james/scroll' }],
      fx: ['rain', 'lightning', 'fog'], lean: [0, 6],
      objects: [
        { id: 'lentera', type: 'key', at: [1, 2], key: 'bangkai', art: 'obj/lentera', name: 'Lentera' },
        { id: 'palang', type: 'gate', at: [1, 5], key: 'bangkai', name: 'Palang jalur' },
        { id: 'flag', type: 'flag', at: [1, 7] }
      ],
      beats: [{ title: 'Lewati kereta tua', story: 'Kilat menerangi bangkai kereta. Linus lewat pelan.',
        bo: 'Ambil lentera, buka palang, ke bendera.', fx: ['rain', 'lightning', 'fog'], lean: [0, 6],
        objectives: [{ 'do': 'reach', at: [1, 7] }], slots: 11, budget: 8, forms: [HERO], palette: ['east', 'unlock'] }] }),

    // 11 the framed photo of Henry and Linus (sc 11): Linus is NOT at Henry's house. He drives a loop "inside the photo" (sepia) and
    // gathers three memory stars; Scarlet stands behind Henry and comes to comfort him when Linus is near.
    L({ id: 'bl11', terrain: 'depot', mood: 'night', n: 11, ch: 'bl-hutan', title: 'Foto Kenangan', place: 'Rumah Henry', icon: 'ui/plan', bg: 'bg-bl-rumah', tint: 'sepia', edu: { domain: 'matematika', skill: 'membilang 1-3' },
      grid: { rows: 4, cols: 8, map: [',,,,,,,,', '.......,', ',,,,,,.,', '.......,'], theme: 'town' },
      mojo: { at: [1, 0], h: 'E', form: HERO },
      fx: ['rain'],
      decor: [{ at: [0, 2], art: 'story-char/henry/worried' }, { at: [0, 5], art: 'story-char/scarlet/stand', react: 'story-char/scarlet/ramah', flip: true }],
      objects: [{ id: 'b1', type: 'star', at: [1, 2] }, { id: 'b2', type: 'star', at: [3, 4] }, { id: 'b3', type: 'star', at: [3, 1] }],
      beats: [{ title: 'Tiga kenangan', story: 'Foto Henry dan Linus. Scarlet menemani Henry.',
        bo: 'Kumpulkan tiga bintang kenangan.',
        objectives: [{ 'do': 'star', id: 'b1' }, { 'do': 'star', id: 'b2' }, { 'do': 'star', id: 'b3' }], slots: 16, budget: 13, forms: [HERO], palette: ['east', 'down', 'west'] }] }),

    // 12-14 PETUALANGAN BESAR (sc 14 only; sc 12-13 are the story cards on its intro): Linus hauls a log wagon far taller than himself on the
    // cliff line with Carter sitting on the logs, the big truss bridge in the distance. Tired, not triumphant. No turtle, no city, no Henry.
    L({ id: 'bl12', terrain: 'logging', mood: 'rain', n: 12, ns: [12, 13, 14], big: true, quiet: true, ch: 'bl-hutan', title: 'Muatan Kayu Berat', place: 'Petualangan Besar', icon: 'cmd/couple', bg: 'bg-bl-jembatan',
      bgs: ['bg-bl-hutan-logging', 'bg-bl-jembatan', 'bg-bl-jembatan'], edu: { domain: 'campuran', skill: 'urutan perjalanan' },
      tired: [false, true, true], celebrate: [], fx: ['rain'],
      cards: [
        { bg: 'bg-bl-lembah', art: [{ k: 'animal/deer/graze', x: 12, s: 46 }, { k: 'animal/rabbit/sit', x: 40, s: 24 }, { k: 'animal/bird-blue/fly', x: 62, s: 30 }], text: 'Hewan-hewan tenang di lembah, sebelum Samson lewat.' },
        { bg: 'bg-bl-gunung', art: [{ k: 'train-char/samson/34l-neutral', x: 28, s: 62 }], text: 'Samson lewat dengan rangkaian panjang. Ia tidak berhenti.' },
        { bg: 'bg-bl-lembah', art: [{ k: 'animal/turtle/shell', x: 34, s: 26 }, { k: 'train-char/samson/34l-neutral', x: 56, s: 56 }], text: 'Kura-kura masuk ke cangkangnya dan selamat.' },
        { bg: 'bg-bl-jembatan', art: [{ k: 'story-char/baron/angkuh', x: 22, s: 50 }, { k: 'story-char/baron/stand', x: 46, s: 50 }, { k: 'story-char/katrina/stand', x: 68, s: 50 }], text: 'Jembatan tinggi. Di kabin, Baron dan Katrina bersulang.' },
        { bg: 'bg-bl-kota', art: [{ k: 'train-char/samson/34l-neutral', x: 8, s: 40 }], headline: 'Titan Train Tames Terrain!', sub: 'Samson dan Baron di halaman depan', text: 'Samson jadi berita. Linus bekerja di hutan.' }
      ],
      grid: { rows: 6, cols: 8, map: [',,,,,,,,', '........', ',,,,,,,.', '........', '.,,,,,,,', '........'], theme: 'hill' },
      mojo: { at: [1, 0], h: 'E', form: HERO },
      decor: [{ at: [0, 1], art: 'kereta-prop/pine' }],
      objects: [{ id: 'kayu', type: 'wagon', at: [1, 4], art: 'train/kayu', name: 'Gerbong kayu' }],
      beats: [
        { title: 'Gandeng muatan kayu', story: 'Gerbong kayu menjulang di atas Linus.',
          bo: 'Gandeng gerbong kayu, lalu ke ujung rel.', fx: ['rain'], steam: true,
          decor: [{ at: [2, 2], art: 'story-char/carter/hands-hips' }, { at: [2, 6], art: 'story-char/james/walk-scroll', flip: true }, { at: [0, 3], art: 'kereta-prop/sawmill' }, { at: [0, 6], art: 'kereta-prop/log-stack' }],
          objectives: [{ 'do': 'wagons', n: 1 }, { 'do': 'reach', at: [1, 7] }], slots: 11, budget: 8, forms: [HERO], palette: ['east', 'couple'] },
        { title: 'Menanjak pelan', terrain: 'mountain', story: 'Beban berat. Setiap langkah terasa.',
          bo: 'Tarik muatan pelan ke bendera.', fx: ['rain'], steam: true,
          decor: [{ at: [2, 2], art: 'story-char/carter/arms-crossed' }, { at: [4, 4], art: 'kereta-prop/pine' }, { at: [2, 5], art: 'kereta-prop/rock' }],
          objectives: [{ 'do': 'reach', at: [3, 0] }], slots: 12, budget: 9, forms: [HERO], palette: ['down', 'west'] },
        { title: 'Pos pandang', terrain: 'mountain', story: 'Dari tebing, jembatan besar tampak jauh.',
          bo: 'Bawa muatan ke bendera pos pandang.', fx: ['rain'], steam: true,
          decor: [{ at: [4, 3], art: 'story-char/carter/point' }, { at: [4, 5], art: 'kereta-prop/lantern' }],
          objectives: [{ 'do': 'reach', at: [5, 7] }], slots: 11, budget: 9, forms: [HERO], palette: ['down', 'east'] }
      ] }),

    // ── Bab 4 "Jembatan Miring" (scenarios 15-20; the rescue is safe: nobody falls, nobody is hurt) ──────────────
    // 15 (story cards: the bridge sags, Samson tilts, Henry and Baron at the cab window) + 16 (level): Linus is still hooked to the logs on the
    // cliff; he drives up to the lookout steps 1, 2, 3 and SEES the emergency; his face turns from wide-eyed to determined.
    L({ id: 'bl13', terrain: 'gorge', mood: 'sunset', n: 15, ns: [15, 16], ch: 'bl-jembatan', title: 'Linus Melihat Bahaya', place: 'Pos Pandang', icon: 'ui/plan', bg: 'bg-bl-jembatan', edu: { domain: 'matematika', skill: 'urutan bilangan' },
      cards: [
        { bg: 'bg-bl-jembatan', art: [{ k: 'train-char/samson/34l-neutral', x: 30, s: 58, rot: -10 }], text: 'Jembatan melendut. Samson miring!' },
        { bg: 'bg-bl-jembatan', art: [{ k: 'story-char/henry/worried', x: 30, s: 52 }, { k: 'story-char/baron/shocked', x: 54, s: 52 }], text: 'Henry dan Baron melihat ke bawah dari jendela kabin.' }
      ],
      grid: { rows: 4, cols: 8, map: [',,,,,,,,', '........', ',,,,,,.,', '........'], theme: 'hill' },
      mojo: { at: [1, 0], h: 'E', form: HERO },
      fx: ['rain'],
      decor: [{ at: [0, 1], art: 'story-char/carter/hands-open' }, { at: [0, 2], art: 'kereta-prop/log-stack' }, { at: [2, 3], art: 'kereta-prop/pine' }],
      objects: [
        { id: 'p1', type: 'mark', at: [1, 2], order: 1, seq: 'pandang', art: 'obj/angka-1', name: 'Pos 1' },
        { id: 'p2', type: 'mark', at: [1, 5], order: 2, seq: 'pandang', art: 'obj/angka-2', name: 'Pos 2' },
        { id: 'p3', type: 'mark', at: [3, 4], order: 3, seq: 'pandang', art: 'obj/angka-3', name: 'Pos pandang' }
      ],
      beats: [{ title: 'Naik ke pos pandang', story: 'Linus melihat jembatan dan bertekad menolong.',
        bo: 'Naik ke pos pandang 1, 2, lalu 3.',
        objectives: [{ 'do': 'visit', id: 'p3' }], slots: 14, budget: 11, forms: [HERO], palette: ['east', 'down', 'west'] }] }),

    // 17 Linus works loose from the timber load: find the pin, open the coupling latch (sparks!), then roll free
    L({ id: 'bl14', terrain: 'mountain', mood: 'sunset', n: 17, ch: 'bl-jembatan', title: 'Lepas dari Muatan', place: 'Jalur Tebing', icon: 'cmd/unlock', bg: 'bg-bl-hutan-logging', edu: { domain: 'algoritma', skill: 'syarat' },
      grid: { rows: 4, cols: 8, map: [',,,,,,,,', '........', ',,T,,,,,', ',,,,,,,,'], theme: 'hill' },
      mojo: { at: [1, 0], h: 'E', form: HERO },
      decor: [{ at: [0, 1], art: 'story-char/carter/point' }, { at: [2, 5], art: 'kereta-prop/log-stack' }, { at: [0, 6], art: 'animal/vulture/perch-1' }],
      objects: [
        { id: 'pasak', type: 'key', at: [1, 2], key: 'kait', art: 'obj/pasak', name: 'Pasak' },
        { id: 'kait', type: 'gate', at: [1, 4], key: 'kait', name: 'Kait muatan' },
        { id: 'flag', type: 'flag', at: [1, 7] }
      ],
      beats: [{ title: 'Buka kait muatan', story: 'Linus melepas diri dari muatan kayu.',
        bo: 'Ambil pasak, lepas kait, lalu ke bendera.',
        objectives: [{ 'do': 'reach', at: [1, 7] }], slots: 11, budget: 8, forms: [HERO], palette: ['east', 'unlock'] }] }),

    // 18-19 down the cliff line: Goro backs into his dark shed; the lamps 1 and 2 show Linus the way to the bridge
    L({ id: 'bl15', terrain: 'mountain', mood: 'night', n: 18, ns: [18, 19], ch: 'bl-jembatan', title: 'Lampu di Jalur Gelap', place: 'Turunan Tebing', icon: 'ui/plan', bg: 'bg-bl-malam', edu: { domain: 'matematika', skill: 'urutan bilangan' },
      grid: { rows: 4, cols: 8, map: [',,,,,.,,', '.......,', ',,,,,,.,', '.......,'], theme: 'hill' },
      mojo: { at: [1, 0], h: 'E', form: HERO },
      decor: [{ at: [0, 7], art: 'story-char/carter/surprised' }, { at: [0, 2], art: 'train-char/goro-loco/front-34l' }, { at: [2, 1], art: 'story-char/james/point-scroll' }, { at: [2, 4], art: 'story-char/carter/defeated' }],
      objects: [
        { id: 'lampu1', type: 'mark', at: [1, 3], order: 1, seq: 'lampu', art: 'obj/angka-1', name: 'Lampu 1' },
        { id: 'goro', type: 'patrol', at: [0, 5], name: 'Goro', art: 'train/goro-b', path: [[0, 5], [1, 5], [1, 5], [0, 5]], phase: 0 },
        { id: 'lampu2', type: 'mark', at: [3, 4], order: 2, seq: 'lampu', art: 'obj/angka-2', name: 'Lampu 2' },
        { id: 'flag', type: 'flag', at: [3, 0] }
      ],
      beats: [{ title: 'Ikuti lampu 1 dan 2', story: 'Goro mundur ke gudang gelap. Linus turun.',
        bo: 'Lewati lampu 1 dan 2, lalu ke bendera.',
        objectives: [{ 'do': 'visit', id: 'lampu2' }, { 'do': 'reach', at: [3, 0] }], slots: 21, budget: 17, forms: [HERO], palette: ['east', 'down', 'west', 'wait'] }] }),

    // 20 PETUALANGAN BESAR: the whole rescue, four beats (dash down to the bridge, hitch the coaches, cross over the water, hand them over and turn back)
    L({ id: 'bl16', terrain: 'mountain', mood: 'sunset', n: 20, big: true, ch: 'bl-jembatan', title: 'Penyelamatan di Jembatan', place: 'Petualangan Besar', icon: 'cmd/couple', bg: 'bg-bl-jembatan',
      bgs: ['bg-bl-hutan-logging', 'bg-bl-jembatan', 'bg-bl-jembatan', 'bg-bl-lembah'], edu: { domain: 'campuran', skill: 'urutan penyelamatan' },
      celebrate: ['story-char/henry/wave', 'story-char/katrina/stand', 'story-char/baron/stand', 'story-char/scarlet/ramah'],
      grid: { rows: 6, cols: 8, map: [',,,T,,,,', '........', ',,,,,,,.', '........', '.,,,,,,,', '........'], theme: 'hill' },
      mojo: { at: [1, 0], h: 'E', form: HERO },
      decor: [{ at: [0, 1], art: 'story-char/james/arms-folded' }, { at: [0, 5], art: 'animal/bird-blue/fly' }],
      objects: [
        { id: 'g1', type: 'wagon', at: [3, 5], art: 'train/gerbong-samson', name: 'Gerbong penumpang pertama' },
        { id: 'g2', type: 'wagon', at: [3, 2], art: 'train/gerbong-samson', name: 'Gerbong penumpang kedua' },
        { id: 'daratan', type: 'loco', at: [4, 7], needs: 2, art: 'obj/daratan', name: 'Stasiun daratan', pay: 'horn' }
      ],
      beats: [
        { title: 'Meluncur ke jembatan', terrain: 'mountain', story: 'Linus turun dengan uap putih ke jembatan.',
          bo: 'Sampai ke jembatan, ke bendera.', hide: ['g1', 'g2', 'daratan'],
          decor: [{ at: [0, 1], art: 'story-char/james/point-scroll' }, { at: [2, 3], art: 'story-char/carter/defeated' }, { at: [2, 5], art: 'train-char/goro-loco/front-34r' }],
          objectives: [{ 'do': 'reach', at: [3, 7] }], slots: 12, budget: 9, forms: [HERO], palette: ['east', 'down'] },
        { title: 'Gandeng gerbong penumpang', terrain: 'gorge', story: 'Dua gerbong penumpang masih di jembatan.',
          bo: 'Gandeng dua gerbong penumpang.', hide: ['daratan'],
          decor: [{ at: [0, 3], art: 'train-char/samson/34l-neutral' }, { at: [0, 6], art: 'story-char/baron/shocked' }, { at: [2, 2], art: 'story-char/henry/point' }, { at: [2, 5], art: 'story-char/katrina/khawatir' }],
          start: { at: [3, 7], h: 'W' }, objectives: [{ 'do': 'wagons', n: 2 }, { 'do': 'reach', at: [4, 0] }], slots: 13, budget: 10, forms: [HERO], palette: ['west', 'down', 'couple'] },
        { title: 'Seberangi jembatan', terrain: 'gorge', story: 'Linus menarik gerbong lewat jembatan.',
          bo: 'Seberangi jembatan sampai ke bendera.', hide: ['daratan'],
          vis: [{ at: [5, 2], ch: '=' }, { at: [5, 3], ch: '=' }, { at: [5, 4], ch: '=' }, { at: [5, 5], ch: '=' }, { at: [4, 2], ch: '~' }, { at: [4, 3], ch: '~' }, { at: [4, 4], ch: '~' }, { at: [4, 5], ch: '~' }, { at: [4, 6], ch: '~' }],
          decor: [{ at: [2, 4], art: 'train-char/samson/34l-neutral' }, { at: [2, 1], art: 'story-char/henry/point' }],
          objectives: [{ 'do': 'reach', at: [5, 7] }], slots: 11, budget: 8, forms: [HERO], palette: ['down', 'east'] },
        { title: 'Tarik ke daratan', terrain: 'meadow', story: 'Penumpang selamat. Linus berbalik ke jembatan.',
          bo: 'Gandeng ke stasiun daratan, lalu bendera.',
          decor: [{ at: [4, 5], art: 'kereta-prop/station-small' }, { at: [4, 4], art: 'story-char/katrina/stand' }, { at: [4, 3], art: 'story-char/baron/stand' }, { at: [2, 3], art: 'story-char/scarlet/ramah' }],
          objectives: [{ 'do': 'train', id: 'daratan' }, { 'do': 'reach', at: [5, 0] }], slots: 10, budget: 8, forms: [HERO], palette: ['west', 'couple'] }
      ] }),

    // ── Bab 5 "Penyelamatan" (scenarios 21-25; everyone is carried to safety, Linus is only very tired) ───────────────
    // 21 pick Henry, Baron and Katrina off the tilted cab and hand them over to Linus's cab, one by one
    L({ id: 'bl17', terrain: 'gorge', mood: 'sunset', n: 21, ch: 'bl-selamat', title: 'Jemput Henry, Baron, Katrina', place: 'Ujung Jembatan', icon: 'cmd/pick', bg: 'bg-bl-jembatan', edu: { domain: 'matematika', skill: 'membilang 1-3' },
      grid: { rows: 3, cols: 8, map: [',.,.,.,,', '........', ',,,,,,,,'], theme: 'hill' },
      mojo: { at: [1, 0], h: 'E', form: HERO },
      decor: [{ at: [0, 7], art: 'train-char/samson/34l-neutral' }, { at: [2, 6], art: 'story-char/henry/jongkok' }],
      objects: [
        { id: 'r1', type: 'rider', at: [0, 1], who: 'baron', name: 'Baron' },
        { id: 'r2', type: 'rider', at: [0, 3], who: 'katrina', name: 'Katrina' },
        { id: 'r3', type: 'rider', at: [0, 5], who: 'henry-w', name: 'Henry' },
        { id: 'kabin', type: 'stop', at: [2, 3], accepts: 'rider', need: 3, art: 'obj/kabin', name: 'Kabin Linus', pay: 'wave' }
      ],
      beats: [{ title: 'Tiga orang naik', story: 'Henry, Baron, dan Katrina pindah ke kabin Linus.',
        bo: 'Naikkan tiga orang, turunkan di kabin Linus.',
        objectives: [{ 'do': 'deliver', id: 'kabin' }], slots: 18, budget: 15, forms: [HERO], palette: ['east', 'west', 'pick', 'deliver'] }] }),

    // 22 Henry and Katrina shovel at the firebox: scoop coal twice, tip it in (a firebox that takes three scoops), then roll on
    L({ id: 'bl18', terrain: 'gorge', mood: 'sunset', n: 22, ch: 'bl-selamat', title: 'Batu Bara di Tungku', place: 'Kabin Linus', icon: 'cmd/load', bg: 'bg-bl-jembatan', edu: { domain: 'matematika', skill: 'menambah sampai cukup' },
      grid: { rows: 3, cols: 8, map: [',,,.,,,,', '........', ',,,,,,,,'], theme: 'hill' },
      mojo: { at: [1, 0], h: 'E', form: HERO },
      res: { sand: 0 }, cap: { sand: 2 },
      decor: [{ at: [2, 1], art: 'story-char/henry/shovel' }, { at: [2, 2], art: 'story-char/katrina/shovel' }, { at: [0, 6], art: 'story-char/baron/stand' }],
      objects: [
        { id: 'tumpukan', type: 'pile', at: [0, 3], res: 'sand', n: 1, art: 'kereta-prop/coal-pile', name: 'Batu bara' },
        { id: 'tungku', type: 'hole', at: [1, 5], need: 3, res: 'sand', art: 'obj/kotak-batu', name: 'Tungku' },
        { id: 'flag', type: 'flag', at: [1, 7] }
      ],
      beats: [{ title: 'Isi tungku, tiga sekop', story: 'Henry dan Katrina menyekop batu bara.',
        bo: 'Muat batu bara, sekop ke tungku.',
        objectives: [{ 'do': 'fill', id: 'tungku' }, { 'do': 'reach', at: [1, 7] }], slots: 18, budget: 14, forms: [HERO], palette: ['east', 'west', 'load', 'dump'] }] }),

    // 23 the bridge groans: two beams swing over the planks; cross when they are clear
    L({ id: 'bl19', terrain: 'gorge', mood: 'sunset', n: 23, ch: 'bl-selamat', title: 'Jembatan Berderit', place: 'Jembatan Patah', icon: 'cmd/wait', bg: 'bg-bl-jembatan', edu: { domain: 'algoritma', skill: 'menunggu giliran' },
      grid: { rows: 3, cols: 8, map: [',,,.,.,,', '..====..', ',,~~~~,,'], theme: 'hill' },
      mojo: { at: [1, 0], h: 'E', form: HERO },
      decor: [{ at: [2, 0], art: 'story-char/baron/shocked' }, { at: [2, 7], art: 'story-char/katrina/khawatir' }],
      objects: [
        { id: 'balok1', type: 'patrol', at: [0, 3], name: 'Balok jatuh', art: 'obj/log', path: [[0, 3], [1, 3], [1, 3], [0, 3]], phase: 0 },
        { id: 'balok2', type: 'patrol', at: [0, 5], name: 'Balok jatuh', art: 'obj/log', path: [[0, 5], [1, 5], [1, 5], [0, 5]], phase: 2 },
        { id: 'flag', type: 'flag', at: [1, 7] }
      ],
      beats: [{ title: 'Seberangi jembatan', story: 'Balok jatuh di jembatan. Linus menunggu.',
        bo: 'Seberangi jembatan ke bendera, tunggu balok.',
        objectives: [{ 'do': 'reach', at: [1, 7] }], slots: 14, budget: 10, forms: [HERO], palette: ['east', 'wait'] }] }),

    // 24-25 PETUALANGAN BESAR: coal, the collapsing bridge (plank + falling beam), the hard landing, the survivors gather round tired Linus
    L({ id: 'bl20', terrain: 'gorge', mood: 'sunset', n: 24, ns: [24, 25], big: true, ch: 'bl-selamat', title: 'Dorongan Terakhir', place: 'Petualangan Besar', icon: 'cmd/place', bg: 'bg-bl-jembatan',
      bgs: ['bg-bl-jembatan', 'bg-bl-jembatan', 'bg-bl-malam', 'bg-bl-lembah'], edu: { domain: 'campuran', skill: 'urutan penyelamatan' },
      celebrate: ['story-char/henry/wave', 'story-char/scarlet/ramah', 'story-char/katrina/stand', 'story-char/baron/stand'],
      tired: [false, false, true, true],
      res: { sand: 0 }, cap: { sand: 2 },
      grid: { rows: 6, cols: 8, map: [',,,.,,,,', '........', ',,,,,,,.', '...o....', '.,,,,.,,', '........'], theme: 'hill' },
      mojo: { at: [1, 0], h: 'E', form: HERO },
      decor: [{ at: [0, 6], art: 'story-char/baron/shocked' }],
      objects: [
        { id: 'tumpukan', type: 'pile', at: [0, 3], res: 'sand', n: 1, art: 'kereta-prop/coal-pile', name: 'Batu bara' },
        { id: 'tungku', type: 'hole', at: [1, 5], need: 2, res: 'sand', art: 'obj/kotak-batu', name: 'Tungku' },
        { id: 'papan', type: 'part', at: [4, 5], art: 'obj/papan', name: 'Papan' },
        { id: 'flag', type: 'flag', at: [3, 4] }
      ],
      beats: [
        { title: 'Isi tungku', story: 'Henry dan Katrina menyekop batu bara.',
          bo: 'Muat batu bara, sekop ke tungku.', hide: ['papan', 'flag'],
          decor: [{ at: [2, 1], art: 'story-char/henry/shovel' }, { at: [2, 2], art: 'story-char/katrina/shovel' }, { at: [0, 6], art: 'story-char/baron/stand' }],
          objectives: [{ 'do': 'fill', id: 'tungku' }, { 'do': 'reach', at: [1, 7] }], slots: 16, budget: 12, forms: [HERO], palette: ['east', 'west', 'load', 'dump'] },
        { title: 'Papan di rel patah', story: 'Rel patah. Linus memasang papan.',
          bo: 'Pasang papan di rel patah, lalu ke bendera.', hide: ['tumpukan', 'tungku', 'flag'],
          decor: [{ at: [2, 3], art: 'story-char/katrina/khawatir' }, { at: [2, 1], art: 'story-char/baron/shocked' }, { at: [4, 2], art: 'kereta-prop/rock' }],
          objectives: [{ 'do': 'reach', at: [3, 0] }], slots: 16, budget: 12, forms: [HERO], palette: ['west', 'down', 'pick', 'place'] },
        { title: 'Jembatan runtuh', story: 'Jembatan runtuh. Linus melaju terus.',
          bo: 'Seberangi jembatan ke bendera.', hide: ['tumpukan', 'tungku', 'papan', 'flag'],
          vis: [{ at: [5, 2], ch: '=' }, { at: [5, 3], ch: '=' }, { at: [5, 4], ch: '=' }, { at: [5, 5], ch: '=' }, { at: [4, 2], ch: '~' }, { at: [4, 4], ch: '~' }, { at: [4, 6], ch: '~' }],
          decor: [{ at: [2, 4], art: 'story-char/henry/worried' }, { at: [2, 6], art: 'story-char/scarlet/worried' }],
          objectives: [{ 'do': 'reach', at: [5, 7] }], slots: 12, budget: 9, forms: [HERO], palette: ['down', 'east'] },
        { title: 'Berkumpul di sekitar Linus', terrain: 'meadow', story: 'Linus lelah sekali. Semua berkumpul.',
          bo: 'Bawa Linus ke bendera, dekat Henry.', hide: ['papan', 'tumpukan', 'tungku'],
          decor: [{ at: [2, 4], art: 'story-char/katrina/khawatir' }, { at: [2, 6], art: 'story-char/henry/worried' }, { at: [4, 6], art: 'story-char/scarlet/worried' }, { at: [2, 1], art: 'train-char/samson/34l-neutral' }],
          start: { at: [3, 7], h: 'W' }, objectives: [{ 'do': 'reach', at: [3, 4] }], slots: 6, budget: 3, forms: [HERO], palette: ['west'] }
      ] }),

    // ── Bab 6 "Pulih dan Pulang" (scenarios 26-30) ─────────────────────────────────────────────
    // 26 a dream, kind and quiet: three stars of light along a golden track among the animals
    L({ id: 'bl21', terrain: 'meadow', mood: 'dream', n: 26, ch: 'bl-pulang', title: 'Mimpi di Atas Awan', place: 'Gerbang Cahaya', icon: 'ui/plan', bg: 'bg-bl-mimpi', edu: { domain: 'matematika', skill: 'membilang 1-3' },
      grid: { rows: 4, cols: 8, map: [',,,,,,,,', '.......,', ',,,,,,.,', '.......,'], theme: 'park' },
      mojo: { at: [1, 0], h: 'E', form: HERO },
      decor: [{ at: [0, 1], art: 'animal/deer/stand' }, { at: [0, 6], art: 'animal/bird-blue/fly' }, { at: [2, 2], art: 'animal/rabbit/sit' }, { at: [0, 4], art: 'animal/cardinal/fly' }],
      objects: [
        { id: 'b1', type: 'star', at: [1, 2] }, { id: 'b2', type: 'star', at: [3, 4] }, { id: 'b3', type: 'star', at: [3, 1] }
      ],
      beats: [{ title: 'Tiga bintang cahaya', story: 'Linus bermimpi. Bintang menuntunnya.',
        bo: 'Kumpulkan tiga bintang cahaya.',
        objectives: [{ 'do': 'star', id: 'b1' }, { 'do': 'star', id: 'b2' }, { 'do': 'star', id: 'b3' }], slots: 16, budget: 13, forms: [HERO], palette: ['east', 'down', 'west'] }] }),

    // 27 welcomed back at the workshop: each friend is given the tool that fits
    L({ id: 'bl22', terrain: 'depot', mood: 'dream', n: 27, ch: 'bl-pulang', title: 'Disambut di Bengkel', place: 'Bengkel', icon: 'cmd/pick', bg: 'bg-bl-bengkel', edu: { domain: 'matematika', skill: 'memasangkan' },
      grid: { rows: 3, cols: 7, map: [',,,,,,,', '.......', '.,.,.,,'], theme: 'town' },
      mojo: { at: [1, 3], h: 'W', form: HERO },
      decor: [{ at: [2, 6], art: 'story-char/anak-cat/stand' }],
      objects: [
        { id: 'palu', type: 'parcel', at: [2, 0], kind: 'palu', name: 'Palu', art: 'obj/palu' },
        { id: 'obeng', type: 'parcel', at: [2, 2], kind: 'obeng', name: 'Obeng', art: 'obj/obeng' },
        { id: 'kunci', type: 'parcel', at: [2, 4], kind: 'kunci', name: 'Kunci pas', art: 'obj/kunci-inggris' },
        { id: 'mekanik', type: 'stop', at: [0, 0], accepts: 'palu', art: 'story-char/mekanik/wave', name: 'Mekanik', pay: 'wave' },
        { id: 'pelukis', type: 'stop', at: [0, 2], accepts: 'obeng', art: 'story-char/pelukis/stand', name: 'Pelukis', pay: 'wave' },
        { id: 'henry', type: 'stop', at: [0, 4], accepts: 'kunci', art: 'char/henry-w', name: 'Henry', pay: 'wave' }
      ],
      beats: [{ title: 'Alat untuk setiap teman', story: 'Teman-teman menyambut Linus di bengkel.',
        bo: 'Beri alat ke Mekanik, Pelukis, Henry.',
        objectives: [{ 'do': 'deliver', id: 'mekanik' }, { 'do': 'deliver', id: 'pelukis' }, { 'do': 'deliver', id: 'henry' }], slots: 15, budget: 11, forms: [HERO], palette: ['east', 'west', 'pick', 'deliver'] }] }),

    // 28 the news: the child with the baby turtle carries the newspaper to the three friends in order
    L({ id: 'bl23', terrain: 'town', mood: 'sun', n: 28, ch: 'bl-pulang', title: 'Berita untuk Teman', place: 'Kota Kecil', icon: 'cmd/deliver', bg: 'bg-bl-kota', edu: { domain: 'algoritma', skill: 'urutan' },
      grid: { rows: 2, cols: 7, map: [',,,,,,,', '.......'], theme: 'town' },
      mojo: { at: [1, 0], h: 'E', form: HERO },
      decor: [{ at: [0, 6], art: 'story-char/anak-kura/hug' }, { at: [0, 0], art: 'story-char/anak-cat/kneel' }],
      objects: [
        { id: 'anak', type: 'rider', at: [1, 2], who: 'anak-kura', name: 'Anak dan kura-kura' },
        { id: 's1', type: 'stop', at: [0, 1], accepts: 'anak', keep: true, order: 1, seq: 'berita', art: 'char/pelukis', name: 'Pelukis', pay: 'wave' },
        { id: 's2', type: 'stop', at: [0, 3], accepts: 'anak', keep: true, order: 2, seq: 'berita', art: 'char/mekanik-wanita', name: 'Mekanik', pay: 'wave' },
        { id: 's3', type: 'stop', at: [0, 5], accepts: 'anak', order: 3, seq: 'berita', art: 'char/nyonya', name: 'Nyonya Topi', pay: 'reunion' }
      ],
      beats: [{ title: 'Kabar untuk tiga teman', story: 'Berita tentang Linus tersebar.',
        bo: 'Turunkan anak di Pelukis, Mekanik, Nyonya Topi.',
        objectives: [{ 'do': 'visit', id: 's1' }, { 'do': 'visit', id: 's2' }, { 'do': 'deliver', id: 's3' }], slots: 12, budget: 9, forms: [HERO], palette: ['east', 'pick', 'deliver'] }] }),

    // 29-30 PETUALANGAN BESAR: the new bridge, the green and red coaches again, Henry and Scarlet aboard, a peaceful run home
    L({ id: 'bl24', terrain: 'meadow', mood: 'sun', n: 29, ns: [29, 30], big: true, ch: 'bl-pulang', title: 'Pulang Bersama', place: 'Petualangan Besar', icon: 'cmd/couple', bg: 'bg-bl-kota',
      bgs: ['bg-bl-jembatan', 'bg-bl-lembah', 'bg-bl-lembah', 'bg-bl-rumah'], edu: { domain: 'campuran', skill: 'urutan perjalanan' },
      celebrate: ['story-char/henry/wave', 'story-char/scarlet/ramah', 'story-char/anak-kura/shy', 'story-char/mekanik/wave'],
      grid: { rows: 6, cols: 8, map: [',,,.,,,,', '........', ',,,,,,,.', '........', '.,,.,.,,', '........'], theme: 'park' },
      mojo: { at: [1, 0], h: 'E', form: HERO },
      decor: [{ at: [0, 6], art: 'train-char/coach-green/front-34l' }],
      objects: [
        { id: 'kereta', type: 'patrol', at: [0, 3], name: 'Kereta lain', art: 'train/gerbong-hijau', path: [[0, 3], [1, 3], [1, 3], [0, 3]], phase: 0 },
        { id: 'g1', type: 'wagon', at: [3, 5], art: 'train/gerbong-hijau', name: 'Gerbong hijau' },
        { id: 'g2', type: 'wagon', at: [3, 2], art: 'train/gerbong-merah', name: 'Gerbong merah' },
        { id: 'h1', type: 'rider', at: [4, 3], who: 'henry-w', name: 'Henry' },
        { id: 'h2', type: 'rider', at: [4, 5], who: 'scarlet-t', name: 'Scarlet' },
        { id: 'kabin', type: 'stop', at: [4, 4], accepts: 'rider', need: 2, art: 'obj/kabin', name: 'Kabin Linus', pay: 'wave' },
        { id: 'flag', type: 'flag', at: [5, 7] }
      ],
      beats: [
        { title: 'Jembatan baru', story: 'Linus menyeberangi jembatan baru.',
          bo: 'Seberangi jembatan ke bendera.', hide: ['g1', 'g2', 'h1', 'h2', 'kabin', 'flag'],
          vis: [{ at: [1, 4], ch: '=' }, { at: [1, 5], ch: '=' }, { at: [1, 6], ch: '=' }],
          decor: [{ at: [2, 4], art: 'story-char/tuan-merah/stand' }, { at: [0, 5], art: 'train-char/caboose-red/front-34l' }, { at: [2, 1], art: 'animal/bird-blue/fly' }],
          objectives: [{ 'do': 'reach', at: [1, 7] }], slots: 14, budget: 10, forms: [HERO], palette: ['east', 'wait'] },
        { title: 'Gerbong hijau dan merah', story: 'Gerbong hijau dan merah menunggu lagi.',
          bo: 'Gandeng gerbong hijau dan merah.', hide: ['kereta', 'h1', 'h2', 'kabin', 'flag'],
          decor: [{ at: [2, 3], art: 'animal/rabbit/run' }, { at: [2, 6], art: 'animal/deer/graze' }],
          start: { at: [3, 7], h: 'W' }, objectives: [{ 'do': 'wagons', n: 2 }, { 'do': 'reach', at: [4, 0] }], slots: 13, budget: 10, forms: [HERO], palette: ['west', 'down', 'couple'] },
        { title: 'Henry dan Scarlet naik', story: 'Henry dan Scarlet naik ke kabin.',
          bo: 'Naikkan Henry dan Scarlet, turunkan di kabin Linus.', hide: ['kereta', 'flag'],
          decor: [{ at: [2, 2], art: 'story-char/anak-kura/shy' }, { at: [2, 5], art: 'animal/turtle/stand' }, { at: [2, 7], art: 'animal/vulture/perch-2' }],
          objectives: [{ 'do': 'deliver', id: 'kabin' }], slots: 14, budget: 11, forms: [HERO], palette: ['east', 'west', 'down', 'pick', 'deliver'] },
        { title: 'Perjalanan damai', story: 'Linus pulang di lembah yang hijau.',
          bo: 'Pulang ke bendera, perlahan.', hide: ['kereta'],
          decor: [{ at: [4, 6], art: 'story-char/henry/wave' }, { at: [4, 4], art: 'story-char/scarlet/stand' }, { at: [2, 3], art: 'train-char/caboose-red/front-34r' }],
          start: { at: [5, 0], h: 'E' }, objectives: [{ 'do': 'reach', at: [5, 7] }], slots: 9, budget: 7, forms: [HERO], palette: ['east'] }
      ] })
  ]
  // bl25 (id kept for saves) sits after bl10 in play order
  ;(function () { var k = -1, t = -1; LEVELS.forEach(function (l, i) { if (l.id === 'bl25') k = i; if (l.id === 'bl10') t = i }); if (k >= 0 && t >= 0 && k !== t + 1) { var x = LEVELS.splice(k, 1)[0]; LEVELS.splice(t + (k < t ? 0 : 1), 0, x) } })()
  W.KeretaPackLevels = { HERO: HERO, CHAPTERS: CHAPTERS, REGIONS: REGIONS, LEVELS: LEVELS, LIB: LIB }
})(typeof window !== 'undefined' ? window : globalThis)
