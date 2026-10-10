/* =============================================================================
 * kereta-levels-malivlak.js — chapter "Malivlak": the 20 scenarios of Dragutin_Malivlak_20_Skenario_Detail.md,
 * one level each; the goal is that scenario's endpoint. Maps are ASCII (see kereta-grid.js for the legend).
 * Kid-safe by construction: the driver's pipe is never drawn, the bear is a friendly teddy, nobody is hurt.
 * Every level is proved solvable by tools/qa-kereta-maze.mjs (BFS reference plan <= slots, run-length packed).
 * ==========================================================================*/
(function (W) {
  'use strict'
  var K = W.KeretaLevels = W.KeretaLevels || { malivlak: [], brave: [], hellbent: [] }
  function pad (rows) { var w = 0; rows.forEach(function (r) { w = Math.max(w, r.length) }); return rows.map(function (r) { while (r.length < w) r += ','; return r }) }
  function L (o) { o.ch = 'malivlak'; o.rows = pad(o.rows); K.malivlak.push(o); return o }
  var D = { id: 'dragutin', char: 'dragutin', name: 'Dragutin', dir: 'E' }
  function M (extra) { var m = { id: 'malivlak', char: 'malivlak', name: 'Malivlak', dir: 'E' }; for (var k in extra || {}) m[k] = extra[k]; return m }
  var SIG = { open: 0, look: 'signal' }

  L({ id: 'mv01', n: 1, title: 'Dragutin Tiba di Stasiun', bg: 8, biome: 'station',
    pre: 'Pagi di stasiun kecil. Dragutin, kereta hijau yang panjang, datang pelan-pelan. Bantu dia berhenti tepat di peron.',
    post: 'Dragutin berhenti. Pintu dan pijakan terbuka lebar. Selamat datang, penumpang!',
    rows: [',,T,,,,,,T,,,', ',,l,,,,,,,,,,', '1==G=====S=Z', ',,,,,,,,,,,,,'],
    trains: [D], gates: [SIG], levers: [{ toggles: [0], q: 'sinyal', label: 'Kotak sinyal' }], verbs: ['tuas'],
    goal: [{ t: 'gate', label: 'Sinyal hijau', icon: 'signal' }, { t: 'reach', label: 'Berhenti di peron', icon: 'flag' }], slots: 6,
    tip: 'MAJU menjalankan kereta satu petak. Berhenti di dekat tuas, lalu TUAS membuka sinyal.' })

  L({ id: 'mv02', n: 2, title: 'Penumpang, Koper, dan Surat', bg: 8, biome: 'station',
    pre: 'Di peron sudah menunggu penumpang, koper, dan surat. Muat semuanya, lalu tutup pintu kereta.',
    post: 'Semua sudah naik dan pintu tertutup rapat. Satu calon penumpang masih berlari dari kejauhan.',
    rows: [',,T,,,,,,,T,,,', ',p,,k,,s,,l,,,,', '1==========Z', ',,p,,,,,,,,,,'],
    trains: [D], legend: { p: { q: 'muat' } }, levers: [{ sets: 'pintu', label: 'Tutup pintu' }], verbs: ['muat', 'tuas'],
    goal: [{ t: 'load', kind: 'penumpang', need: 2, label: 'Penumpang', icon: 'penumpang' }, { t: 'load', kind: 'koper', label: 'Koper', icon: 'koper' },
      { t: 'load', kind: 'surat', label: 'Surat', icon: 'surat' }, { t: 'flag', f: 'pintu', label: 'Pintu tertutup', icon: 'door' }, { t: 'reach', label: 'Siap berangkat', icon: 'flag' }], slots: 12,
    tip: 'MUAT mengangkut semua yang ada di samping kereta.' })

  L({ id: 'mv03', n: 3, title: 'Berangkat ke Pedesaan', bg: 16, biome: 'country',
    pre: 'Dragutin meluncur keluar dari stasiun menuju pedesaan. Di tikungan ada sinyal yang harus dibuka.',
    post: 'Kereta melaju lancar di jalur yang mulus, dekat jalur bergelombang di sebelahnya.',
    rows: ['1=====,,,,,,,,', ',,,,,=,,T,,,,,', ',,,,,=,,l,,,,', ',T,,,====G==Z'],
    trains: [D], gates: [SIG], levers: [{ toggles: [0], q: 'sinyal', label: 'Kotak sinyal' }], verbs: ['tuas'],
    goal: [{ t: 'gate', label: 'Sinyal hijau', icon: 'signal' }, { t: 'reach', label: 'Tiba di desa', icon: 'flag' }], slots: 10,
    tip: 'KIRI dan KANAN membelokkan kereta sambil maju satu petak.' })

  L({ id: 'mv04', n: 4, title: 'Malivlak di Jalur Bergelombang', bg: 25, biome: 'country',
    pre: 'Ini Malivlak, lokomotif kecil yang periang. Ia ingin menyambung tiga gerbong sebelum melewati jalur yang bergelombang.',
    post: 'Tiga gerbong ikut di belakang Malivlak. Mereka sampai di dekat jalur Dragutin sambil bergoyang-goyang.',
    rows: [',,T,,,,,,,,,,', '1MWMMMMM,,,,,', ',,,,,,,W,,,,,', ',,,,,,,MMWMMZ'],
    trains: [M()], verbs: [],
    goal: [{ t: 'wagons', need: 3, label: 'Gerbong tersambung', icon: 'wagon' }, { t: 'reach', label: 'Tiba di ujung jalur', icon: 'flag' }], slots: 9,
    tip: 'Kereta menyambung gerbong kalau melewati petak gerbong.' })

  L({ id: 'mv05', n: 5, title: 'Dragutin Menyusul Malivlak', bg: 16, biome: 'country',
    pre: 'Malivlak berjalan pelan di depan. Beri jalan di jalur samping, supaya Dragutin yang cepat bisa menyusul.',
    post: 'Dragutin melaju di depan sambil membunyikan klakson. Malivlak melambai dari jalur samping.',
    mode: 'turns', rows: [',,,,,,,,,,,,,', ',,,,===Y=,,,,', '2===1=======Z'],
    trains: [M(), D], verbs: [],
    goal: [{ t: 'reach', train: 'malivlak', pin: 'Y', label: 'Malivlak minggir', icon: 'flag' }, { t: 'reach', train: 'dragutin', pin: 'Z', label: 'Dragutin menyusul', icon: 'flag' }], slots: 8,
    tip: 'Pilih kereta di bagian atas. Giliran bergantian: satu perintah untuk satu kereta.' })

  L({ id: 'mv06', n: 6, title: 'Keluar Rel Menerobos Ladang', bg: 25, biome: 'field',
    pre: 'Malivlak terlalu semangat dan keluar dari rel! Untung ladangnya empuk. Seorang pria berkoper melambai minta ikut.',
    post: 'Pria berkoper naik dengan gembira. Di depan terlihat kolam yang berkilau.',
    rows: [',T,,,,,,T,,,,,', '1==FFFFF,,,,,,', ',,,,,o,F,~~~~~', ',,,,,,,FFFZ~~~'],
    trains: [M()], legend: { o: { kind: 'tamu', sprite: 'malivlak-char/petugas-stasiun/berdiri' } }, verbs: ['muat'],
    goal: [{ t: 'load', kind: 'tamu', label: 'Pria berkoper naik', icon: 'penumpang' }, { t: 'reach', label: 'Tiba di tepi kolam', icon: 'flag' }], slots: 8 })

  L({ id: 'mv07', n: 7, title: 'Menyelam ke Kolam', bg: 6, biome: 'pond',
    pre: 'Plung! Malivlak masuk ke kolam. Tenang, airnya dangkal dan seru. Masinis ingin mengangkat seekor ikan.',
    post: 'Malivlak naik lagi ke daratan. Masinis mengangkat ikan tinggi-tinggi sambil tertawa.',
    rows: [',,,,~~~~~~,,,,', '1==PPPPPP==Z', ',,,,~f~~~~,,,,'],
    trains: [M()], verbs: ['muat'],
    goal: [{ t: 'load', kind: 'ikan', label: 'Ikan ditangkap', icon: 'ikan' }, { t: 'reach', label: 'Kembali ke daratan', icon: 'flag' }], slots: 6 })

  L({ id: 'mv08', n: 8, title: 'Berkumpul di Bawah Pohon', bg: 25, biome: 'field',
    pre: 'Gerbong-gerbong tersebar di ladang, ada yang berteduh di bawah pohon. Kumpulkan ketiganya, lalu kembali ke rel.',
    post: 'Tiga gerbong kembali mengikuti Malivlak dengan rapi. Mereka kembali di atas rel.',
    rows: [',,,T,,,T,,,,', '1=FFFWFFF,,,', ',,,,T,,,W,,,,', ',,,,,,,,F,,,,', 'Z=FFWFFFF,,,'],
    trains: [M()], verbs: [],
    goal: [{ t: 'wagons', need: 3, label: 'Gerbong terkumpul', icon: 'wagon' }, { t: 'reach', label: 'Kembali ke rel', icon: 'flag' }], slots: 10 })

  L({ id: 'mv09', n: 9, title: 'Burung di Cerobong', bg: 16, biome: 'country',
    pre: 'Seekor burung membuat sarang di cerobong dan tidak mau pindah! Bunyikan peluit sampai ia terbang.',
    post: 'Sarang terpental dan burung terbang riang. Masinis memasak telur di wajan, harum sekali.',
    rows: [',,T,,,,,,,T,,', '1=====C====Z', ',,e,,,,,,,,,'],
    trains: [M()], decor: [{ r: 0, c: 6, sprite: 'kereta-prop/bird-nest', label: 'Sarang burung' }], critters: [{ kind: 'burung', sprite: 'animal/bird-blue/fly' }], verbs: ['tiup', 'muat'],
    goal: [{ t: 'critter', label: 'Burung terbang', icon: 'bird' }, { t: 'load', kind: 'telur', label: 'Telur dimasak', icon: 'telur' }, { t: 'reach', label: 'Lanjut jalan', icon: 'flag' }], slots: 8 })

  L({ id: 'mv10', n: 10, title: 'Mendaki dan Perpotongan Jalur', bg: 34, biome: 'mountain',
    pre: 'Jalur menanjak ke gunung. Di perpotongan jalur ada sinyal merah. Buka dulu sinyalnya.',
    post: 'Perpotongan terlewati dengan aman. Gunung sudah tampak di depan.',
    rows: [',,,,,,l,,T,,,,', '1==HHH=G==HHZ', ',,,,,,,,,=,,,,', ',,,,,,,,,=,,,,'],
    trains: [M()], gates: [SIG], levers: [{ toggles: [0], q: 'sinyal', label: 'Kotak sinyal' }], verbs: ['tuas'],
    goal: [{ t: 'gate', label: 'Sinyal hijau', icon: 'signal' }, { t: 'reach', label: 'Menuju gunung', icon: 'flag' }], slots: 6 })

  L({ id: 'mv11', n: 11, title: 'Masuk dan Mundur dari Terowongan', bg: 34, biome: 'mountain',
    pre: 'Malivlak masuk ke terowongan gelap... ternyata buntu! Ada sesuatu yang besar mengintip dari semak. Putar balik dan keluar.',
    post: 'Malivlak keluar dari terowongan. Seekor beruang yang ramah muncul dari semak. Masinis cepat-cepat bersembunyi sambil tersenyum.',
    rows: [',,,,,,,,,,,,,', 'Z=====1==UUUY', ',,,,,,,,,,,,,'],
    trains: [M()], decor: [{ r: 0, c: 3, sprite: 'animal/beruang/depan', label: 'Beruang mengintip' }], verbs: ['putar'],
    goal: [{ t: 'visit', pin: 'Y', label: 'Masuk terowongan', icon: 'tunnel' }, { t: 'reach', label: 'Keluar lagi', icon: 'flag' }], slots: 5,
    tip: 'PUTAR membalik arah kereta di tempat. Hanya bisa kalau tidak membawa gerbong.' })

  L({ id: 'mv12', n: 12, title: 'Beruang Jadi Penumpang', bg: 43, biome: 'mountain',
    pre: 'Beruang ternyata ingin ikut naik kereta! Bunyikan peluit sapaan, lalu ajak dia masuk dan lewati terowongan.',
    post: 'Malivlak keluar dari sisi lain terowongan, dengan beruang ramah duduk manis sebagai penumpang.',
    rows: [',,,,,,,,,,,,,,', '1====C==UUU==Z', ',,,,,,,,,,,,,,'],
    trains: [M()], critters: [{ kind: 'beruang', aside: [2, 6], sprite: 'animal/beruang/depan' }], verbs: ['tiup', 'muat'],
    goal: [{ t: 'critter', label: 'Beruang minggir', icon: 'bear' }, { t: 'load', kind: 'beruang', label: 'Beruang naik', icon: 'bear' }, { t: 'reach', label: 'Keluar terowongan', icon: 'flag' }], slots: 8 })

  L({ id: 'mv13', n: 13, title: 'Menuruni Pegunungan', bg: 34, biome: 'mountain',
    pre: 'Saatnya turun gunung. Antar beruang ke hutan kecil di tengah jalan, lalu lanjut ke lembah yang landai.',
    post: 'Beruang turun dengan melambai. Kereta sampai di lembah yang landai dan teduh.',
    rows: [',,,,,,,,,,,,,', 'o1HHH=,,,,,,,', ',,,,,H,A,,,,,,', ',,,,,HHHH,,,,,', ',,,,,,,,H,,,,,', ',,,,,,,,HHHZ,,'],
    trains: [M({ dir: 'E' })], legend: { o: { kind: 'beruang', sprite: 'animal/beruang/depan' } }, stops: { A: { accepts: 'beruang', label: 'Hutan kecil' } }, verbs: ['muat', 'turun'],
    goal: [{ t: 'load', kind: 'beruang', label: 'Beruang naik', icon: 'bear' }, { t: 'deliver', stop: 'A', label: 'Beruang turun', icon: 'bear' }, { t: 'reach', label: 'Tiba di lembah', icon: 'flag' }], slots: 12 })

  L({ id: 'mv14', n: 14, title: 'Membalut Roda', bg: 25, biome: 'country',
    pre: 'Roda gerbong paling belakang lecet. Ambil perban, lalu balut roda itu. Setelah itu perjalanan boleh lanjut.',
    post: 'Roda gerbong terbalut perban putih. Tidak sakit sama sekali. Kereta berjalan lagi dengan hati-hati.',
    rows: [',,T,,,,,,,,,,', ',,n,,,,,,A,,,,', '=1==========Z', ',,,,,,,,,,,,,'],
    trains: [M({ wagons: 1 })], legend: { n: { kind: 'perban', sprite: 'kereta-prop/wheel-bandage', q: 'muat' } }, stops: { A: { accepts: 'perban', label: 'Roda gerbong', q: 'loket', sprite: 'kereta-prop/wheel-bandage' } }, verbs: ['muat', 'turun'],
    goal: [{ t: 'load', kind: 'perban', label: 'Ambil perban', icon: 'bandage' }, { t: 'deliver', stop: 'A', label: 'Roda terbalut', icon: 'bandage' }, { t: 'reach', label: 'Lanjut perjalanan', icon: 'flag' }], slots: 8 })

  L({ id: 'mv15', n: 15, title: 'Persiapan Penyambutan', bg: 8, biome: 'station',
    pre: 'Di stasiun kota, petugas dan pemain musik bersiap menyambut kereta. Antar para pemain musik ke panggung dan bentangkan karpet.',
    post: 'Semua siap! Petugas berdiri tegak dan musik mulai dimainkan pelan-pelan.',
    rows: [',,,,T,,,,,,,,', ',o,,o,,l,,A,,,,', '1==========Z', ',,,,,,,,,,,,,'],
    trains: [D], legend: { o: { kind: 'musisi', sprite: 'malivlak-char/orkes/terompet', q: 'muat' } }, levers: [{ sets: 'karpet', label: 'Bentangkan karpet' }], stops: { A: { accepts: 'musisi', need: 2, label: 'Panggung', q: 'loket', sprite: 'malivlak-char/orkes/drum' } }, verbs: ['muat', 'turun', 'tuas'],
    goal: [{ t: 'deliver', stop: 'A', label: 'Pemain musik di panggung', icon: 'music' }, { t: 'flag', f: 'karpet', label: 'Karpet terbentang', icon: 'carpet' }, { t: 'reach', label: 'Siap menyambut', icon: 'flag' }], slots: 9 })

  L({ id: 'mv16', n: 16, title: 'Melewati Para Penyambut', bg: 8, biome: 'station',
    pre: 'Malivlak datang ke stasiun kota. Para penyambut melambai di kedua sisi rel. Lewati mereka dan berhenti dekat sinyal.',
    post: 'Malivlak melewati barisan penyambut, lalu berhenti dengan sopan di depan sinyal merah.',
    rows: [',,,,,,,,,,,,,', ',,o,,,o,,,,,,,', '1=========ZG=', ',,,,,,,,,,,,,'],
    trains: [M()], gates: [SIG], decor: [{ r: 1, c: 2, sprite: 'malivlak-char/petugas-stasiun/berdiri' }, { r: 1, c: 6, sprite: 'malivlak-char/orkes/tuba' }], legend: { o: { kind: 'x', sprite: 'malivlak-char/orkes/drum' } }, verbs: ['tiup'],
    goal: [{ t: 'whistle', label: 'Menyapa dengan peluit', icon: 'whistle' }, { t: 'reach', label: 'Berhenti dekat sinyal', icon: 'flag' }], slots: 5 })

  L({ id: 'mv17', n: 17, title: 'Mengubah Sinyal', bg: 8, biome: 'station',
    pre: 'Sinyal masih merah. Petugas stasiun menunggu di kotak sinyal. Jawab pertanyaannya, ubah sinyal, lalu berjalan kembali di depan para penyambut.',
    post: 'Sinyal hijau menyala! Malivlak kembali lewat di depan para penyambut dengan bangga.',
    rows: [',,,,l,,,,,,,,,', '1====G====,,,,', ',,,,,,,,=,,,,,', ',,,,,,,,====Y'],
    trains: [M()], gates: [SIG], levers: [{ toggles: [0], q: 'sinyal', label: 'Kotak sinyal' }], verbs: ['tuas'],
    goal: [{ t: 'gate', label: 'Sinyal hijau', icon: 'signal' }, { t: 'reach', pin: 'Y', label: 'Kembali di depan penyambut', icon: 'flag' }], slots: 9 })

  L({ id: 'mv18', n: 18, title: 'Pidato Tertutup Uap', bg: 8, biome: 'station',
    pre: 'Seorang bapak sedang berpidato. Tiba-tiba uap dari Malivlak menyembur dan menutupi semuanya! Bunyikan peluit, lalu berhenti di depan panggung.',
    post: 'Uap menyelimuti panggung sampai semua orang tertawa. Pidato selesai, dan acara beralih ke penghargaan.',
    rows: [',,,,,T,,,,,,,,', '1===========Z', ',,,,,,,,,,,,,'],
    trains: [M()], decor: [{ r: 0, c: 10, sprite: 'malivlak-char/pembaca-pidato/kertas', label: 'Pembaca pidato' }], verbs: ['tiup', 'tunggu'],
    goal: [{ t: 'whistle', label: 'Peluit berbunyi', icon: 'whistle' }, { t: 'reach', label: 'Berhenti di panggung', icon: 'flag' }], slots: 4 })

  L({ id: 'mv19', n: 19, title: 'Karangan Daun dan Medali', bg: 20, biome: 'station',
    pre: 'Saatnya penghargaan! Terima karangan daun untuk kereta dan medali untuk masinis. Mereka siap di tepi peron.',
    post: 'Malivlak berangkat dengan karangan daun di depan. Masinis memakai medali dan tersenyum lebar.',
    rows: [',,,,,,,,,,,,', ',w,,,,m,,,,,,', '1==========Z', ',,,,,,,,,,,,'],
    trains: [M()], legend: { w: { kind: 'karangan', sprite: 'kereta-prop/wreath', q: 'muat' }, m: { kind: 'medali', sprite: 'kereta-prop/medal' } }, verbs: ['muat'],
    goal: [{ t: 'load', kind: 'karangan', label: 'Karangan daun', icon: 'wreath' }, { t: 'load', kind: 'medali', label: 'Medali masinis', icon: 'medal' }, { t: 'reach', label: 'Berangkat', icon: 'flag' }], slots: 7 })

  L({ id: 'mv20', n: 20, title: 'Masuk Museum', bg: 40, biome: 'museum',
    pre: 'Perjalanan panjang berakhir di museum kereta tua. Bawa ketiga gerbong masuk ke aula dan berhenti di antara koleksi.',
    post: 'Malivlak dan gerbongnya berhenti di antara kendaraan-kendaraan tua. Mereka dikenang selamanya. Tamat!',
    rows: [',,,,,,T,,,,,,,,,', '===1==SSS=,,,,,,', ',,,,,,,,,=,,,,,,', ',,,,,,,,,UUUUZ,,'],
    trains: [M({ wagons: 3 })], verbs: [],
    goal: [{ t: 'wagons', need: 3, label: 'Tiga gerbong ikut', icon: 'wagon' }, { t: 'reach', label: 'Masuk museum', icon: 'flag' }], slots: 8 })
})(typeof window !== 'undefined' ? window : globalThis)
