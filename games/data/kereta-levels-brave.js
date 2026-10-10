/* =============================================================================
 * kereta-levels-brave.js — chapter "Brave Locomotive": the 30 scenarios of The_Brave_Locomotive_Linus_30_
 * Skenario_Detail.md, one level each (Linus, the small blue engine, and Samson, the giant one).
 * KID-SAFE ADAPTATION (owner audience 6-8; the plot is kept, the content softened):
 *   - no chains, no whip, no weapons, no shooting, no smoking: Linus is made to haul heavy logs and is tired
 *     and sad; Goro, Carter and James are grumpy and bossy, never violent;
 *   - the bridge collapse is a tense but SAFE rescue; Linus is "very tired" (never destroyed); scenario 26 (the
 *     winged figure) becomes Linus resting and dreaming of his friends, then 27-28 repaired and celebrated;
 *   - women (Scarlet, Katrina) appear only in the story text, or drawn with a hijab: never an unveiled woman.
 * Characters without art in the database (Goro, Carter, James, Baron) are text and labelled placeholder slots
 * (docs/KERETA-ART-SLOTS.md). Every level is proved solvable by tools/qa-kereta-maze.mjs.
 * ==========================================================================*/
(function (W) {
  'use strict'
  var K = W.KeretaLevels = W.KeretaLevels || { malivlak: [], brave: [], hellbent: [] }
  function pad (rows) { var w = 0; rows.forEach(function (r) { w = Math.max(w, r.length) }); return rows.map(function (r) { while (r.length < w) r += ','; return r }) }
  function L (o) { o.ch = 'brave'; o.rows = pad(o.rows); K.brave.push(o); return o }
  function LI (extra) { var t = { id: 'linus', char: 'linus', name: 'Linus', dir: 'E' }; for (var k in extra || {}) t[k] = extra[k]; return t }
  function SA (extra) { var t = { id: 'samson', char: 'samson', name: 'Samson', dir: 'E' }; for (var k in extra || {}) t[k] = extra[k]; return t }
  var SIG = { open: 0, look: 'signal' }, BAR = { open: 0, look: 'barrier' }
  var TAMU = { o: { kind: 'tamu', sprite: 'malivlak-char/penumpang-jas-kotak/jalan', q: 'muat' }, p: { kind: 'tamu', sprite: 'tk-char/hijab-officer-pointing', q: 'muat' } }
  var KORAN = { s: { kind: 'koran', sprite: 'school/notebook' } }

  L({ id: 'bl01', n: 1, title: 'Linus dan Rangkaian Kecilnya', bg: 16, biome: 'valley',
    pre: 'Di lembah yang hijau tinggal Linus, lokomotif kecil berwarna biru. Wajahnya ceria dan ia membawa dua gerbong kecil. Mari kenalan lalu jalan-jalan.',
    post: 'Linus melaju riang di lembah bersama dua gerbongnya. Henry, masinis yang baik hati, melambai dari kabin.',
    rows: [',,,T,,,=,,T,', '===1======,,', ',,T,,,T,,=,,', 'Z=========T,', ',,T,,,,,,,,T'], order: {G:[],l:[],C:[]},
    trains: [LI({ wagons: 2 })], verbs: [],
    goal: [{ t: 'wagons', need: 2, label: 'Dua gerbong ikut', icon: 'wagon' }, { t: 'reach', label: 'Sampai di ujung lembah', icon: 'flag' }], slots: 8 })

  L({ id: 'bl02', n: 2, title: 'Henry Menyiapkan Tenaga', bg: 25, biome: 'valley',
    pre: 'Di depan ada tanjakan curam. Henry mengisi tungku dengan batu bara supaya Linus punya tenaga. Berapa bongkah yang perlu dimasukkan?',
    post: 'Tungku menyala terang. Linus siap menanjak dengan semangat!',
    rows: [',b,,=,,T,,,', '1========T,', 'TT,,,,bb=,,', 'ZHH======,,', ',,,,,TT,,,,'], order: {G:[],l:[],C:[]},
    trains: [LI()], legend: { b: { q: 'bunker' } }, verbs: ['muat'],
    goal: [{ t: 'load', kind: 'batubara', need: 3, label: 'Batu bara masuk tungku', icon: 'coal' }, { t: 'reach', label: 'Kaki tanjakan', icon: 'flag' }], slots: 13 })

  L({ id: 'bl03', n: 3, title: 'Menaklukkan Jalur Pegunungan', bg: 34, biome: 'mountain',
    pre: 'Jalurnya berkelok-kelok di lereng gunung. Linus menanjak pelan-pelan dengan dua gerbongnya, lalu turun lagi ke jalur yang lebih rendah.',
    post: 'Linus dan gerbongnya turun dengan selamat. Pemandangannya indah sekali.',
    rows: [',,,T,T,,,,,,', '==1HHHHHHH,,', ',T,,,,,,,H,,', 'ZHHHHHHHHH,T', ',,,,,,,,,,,T'], order: {G:[],l:[],C:[]},
    trains: [LI({ wagons: 2 })], verbs: [],
    goal: [{ t: 'wagons', need: 2, label: 'Gerbong lengkap', icon: 'wagon' }, { t: 'reach', label: 'Turun ke lintasan bawah', icon: 'flag' }], slots: 8 })

  L({ id: 'bl04', n: 4, title: 'Sahabat di Rel', bg: 16, biome: 'valley',
    pre: 'Seekor kura-kura kecil sedang menyeberang rel. Linus tidak mau mengagetkannya. Dekati pelan-pelan, berhenti di belakangnya, lalu beri waktu sampai ia lewat. Peluit juga boleh dipakai.',
    post: 'Kura-kura selamat dan melambai dengan kaki kecilnya. Perjalanan berlanjut.',
    goalText: 'Beri jalan untuk kura-kura',
    say: { who: 'Henry', text: 'Kura-kura ini sedang menyeberang rel. Beri dia waktu untuk lewat dengan aman, ya!' },
    steps: [{ icon: 'turtle', text: 'Dekati kura-kura' }, { icon: 'stop', text: 'Berhenti di belakangnya' }, { icon: 'wait', text: 'Tunggu sampai lewat' }],
    rows: ['TT,,T=TT,,', '1=======,,', ',,,,,TT=,,', 'Z======C,T', ',,,,,T,,,,'], order: {G:[],l:[],C:[0]},
    trains: [LI()], critters: [{ kind: 'kura', sprite: 'animal/turtle/walk', after: 9 }], verbs: ['tiup', 'tunggu', 'berhenti'],
    goal: [{ t: 'critter', label: 'Kura-kura aman', icon: 'turtle' }, { t: 'reach', label: 'Tujuan tercapai', icon: 'flag' }], slots: 9 })

  L({ id: 'bl05', n: 5, title: 'Melayani Penumpang', bg: 8, biome: 'station',
    pre: 'Linus berhenti di stasiun kecil. Naikkan para penumpang, antar mereka ke peron tujuan, lalu pulang ke depo.',
    post: 'Semua penumpang tiba dengan senang. Linus kembali ke depo besar untuk istirahat.',
    rows: [',p=,,,Tp,,,', '1========,,', ',,,,o,,,=,,', 'Z========,,', ',,,TA,T,,,T'], order: {G:[],l:[],C:[]},
    trains: [LI()], legend: TAMU, stops: { A: { accepts: 'tamu', need: 3, label: 'Peron tujuan', q: 'loket', sprite: 'mojo-prop/building-station' } }, verbs: ['muat', 'turun'],
    goal: [{ t: 'load', kind: 'tamu', need: 3, label: 'Penumpang naik', icon: 'penumpang' }, { t: 'deliver', stop: 'A', label: 'Penumpang turun', icon: 'penumpang' }, { t: 'reach', label: 'Tiba di depo', icon: 'flag' }], slots: 15 })

  L({ id: 'bl06', n: 6, title: 'Baron Menyambut Henry', bg: 8, biome: 'station',
    pre: 'Di depo besar, Baron Von Kapital, pria bertubuh besar yang suka mengatur, menyambut Henry. Buka gerbang depo, lalu jemput tamu-tamunya.',
    post: 'Baron tersenyum lebar pada Henry. Perhatian semua orang beralih ke lokomotif baru yang besar.',
    rows: [',,o,,,,=,,,', '1========,,', 'T,T,,Tpl=TT', 'Z=====G==,,', ',,,=,,,,,,,'], order: {G:[0],l:[0],C:[]},
    trains: [LI()], gates: [BAR], legend: TAMU, levers: [{ toggles: [0], q: 'sinyal', label: 'Gerbang depo' }], verbs: ['muat', 'tuas'],
    goal: [{ t: 'load', kind: 'tamu', need: 2, label: 'Tamu naik', icon: 'penumpang' }, { t: 'gate', label: 'Gerbang terbuka', icon: 'signal' }, { t: 'reach', label: 'Masuk depo', icon: 'flag' }], slots: 13 })

  L({ id: 'bl07', n: 7, title: 'Samson, Si Lokomotif Raksasa', bg: 8, biome: 'station',
    pre: 'Samson datang! Tubuhnya besar sekali dan rodanya banyak. Linus yang kecil minggir ke jalur samping supaya Samson bisa lewat.',
    post: 'Linus menatap Samson dengan takjub. Besar sekali, tapi Linus tetap tersenyum.',
    mode: 'turns', rows: [',,T,,,,,,,T,', ',,,,==Y==,,,', ',,,,=,,,,=,,', '2===1======Z', ',,T,,,,T,,,,'],
    trains: [LI(), SA()], verbs: [],
    goal: [{ t: 'reach', train: 'linus', pin: 'Y', label: 'Linus minggir', icon: 'flag' }, { t: 'reach', train: 'samson', pin: 'Z', label: 'Samson lewat', icon: 'flag' }], slots: 9,
    tip: 'Pilih kereta di bagian atas. Perintah dikerjakan bergantian.' })

  L({ id: 'bl08', n: 8, title: 'Surat Penugasan Baru', bg: 8, biome: 'station',
    pre: 'Linus mendapat tugas baru. Ambil surat penugasan dan antarkan ke kantor, lalu Linus berangkat meninggalkan layanan lamanya.',
    post: 'Henry tetap bekerja bersama perusahaan, dan Linus berangkat ke tempat baru. Mereka berpisah sambil saling melambai.',
    rows: [',,s,=,,,,,,', '1========,,', 'T,,,,,,,=,,', 'Z========TT', 'T,,,TT=A,,,'], order: {G:[],l:[],C:[]},
    trains: [LI()], legend: { s: { kind: 'surat', q: 'muat' } }, stops: { A: { accepts: 'surat', label: 'Kantor perusahaan', q: 'loket', sprite: 'tk-prop/sealed-letter' } }, verbs: ['muat', 'turun'],
    goal: [{ t: 'load', kind: 'surat', label: 'Surat diambil', icon: 'surat' }, { t: 'deliver', stop: 'A', label: 'Surat diantar', icon: 'surat' }, { t: 'reach', label: 'Berangkat', icon: 'flag' }], slots: 11 })

  L({ id: 'bl09', n: 9, title: 'Kawasan Logging dan Goro', bg: 10, biome: 'forest',
    pre: 'Linus tiba di hutan tempat penebangan kayu. Di sini gelap, dan Goro, lokomotif yang pemarah, berjaga. Buka dua pagar kayu dengan benar.',
    post: 'Linus melewati jalur gelap dengan hati-hati. Goro hanya mendengus dari kejauhan.',
    rows: ['T,TlT,=,,,,', '1====G===,,', ',T,,,,,,=,,', 'Z===G====,,', ',T,=,,l,,,,'], order: {G:[0,1],l:[0,1],C:[]},
    trains: [LI()], gates: [BAR, BAR], levers: [{ toggles: [0], q: 'sinyal', label: 'Pagar pertama' }, { toggles: [1], q: 'sinyal', label: 'Pagar kedua' }], verbs: ['tuas'],
    goal: [{ t: 'gate', need: 2, label: 'Dua pagar terbuka', icon: 'signal' }, { t: 'reach', label: 'Lewat hutan', icon: 'flag' }], slots: 12 })

  L({ id: 'bl10', n: 10, title: 'Bangkai Gerbong Tua', bg: 10, biome: 'forest',
    pre: 'Pemilik jalur kehutanan, James, orang yang sangat galak, menyuruh Linus bekerja. Di sini banyak gerbong rusak tua. Kumpulkan dua gerbong tua ke tempat barang bekas.',
    post: 'Gerbong tua berhasil dibersihkan dari rel. Tempat kerja baru ini terasa dingin dan berat.',
    rows: [',,,=,,,,,,', '1====W=W,,', ',,,,,,T=,T', '========,T', '=,T,,,,,,,', '=======Z,,', 'T,,,,,=,,,'], order: {G:[],l:[],C:[]},
    trains: [LI()], verbs: [],
    goal: [{ t: 'wagons', need: 2, label: 'Gerbong tua terkumpul', icon: 'wagon' }, { t: 'reach', label: 'Tempat barang bekas', icon: 'flag' }], slots: 12 })

  L({ id: 'bl11', n: 11, title: 'Henry dan Scarlet di Rumah', bg: 22, biome: 'home',
    pre: 'Di rumah, Henry bercerita pada istrinya, Scarlet, tentang Linus yang sedang sedih. Scarlet menyemangatinya. Antar surat Henry untuk Linus ke kotak pos.',
    post: 'Surat sampai di kotak pos. Dukungan Scarlet membuat Henry kembali bersemangat.',
    rows: [',s=,,,,,,T', '1=======,,', ',,,,,,,=,,', 'Z=======,,', ',,,,A=T,,,'], order: {G:[],l:[],C:[]},
    trains: [LI()], legend: { s: { kind: 'surat', q: 'muat' } }, stops: { A: { accepts: 'surat', label: 'Kotak pos', q: 'loket', sprite: 'tk-prop/sealed-letter' } }, verbs: ['muat', 'turun'],
    goal: [{ t: 'load', kind: 'surat', label: 'Surat Henry', icon: 'surat' }, { t: 'deliver', stop: 'A', label: 'Surat dikirim', icon: 'surat' }, { t: 'reach', label: 'Pulang', icon: 'flag' }], slots: 12 })

  L({ id: 'bl12', n: 12, title: 'Samson dan Jalur yang Berubah', bg: 20, biome: 'station',
    pre: 'Samson menguasai lintasan yang sudah diubah. Tuas wesel harus ditarik supaya rangkaian besar itu menuju jalur yang benar.',
    post: 'Rangkaian besar Samson lewat dengan megah di jalur yang sudah diubah.',
    rows: [',,,=T,l,T,', '1=======,T', ',,,TT,,=,,', 'Z====G==,,', ',,,,,,=,T,'], order: {G:[0],l:[0],C:[]},
    trains: [SA()], gates: [SIG], levers: [{ toggles: [0], q: 'sinyal', label: 'Tuas wesel' }], verbs: ['tuas'],
    goal: [{ t: 'gate', label: 'Wesel diubah', icon: 'signal' }, { t: 'reach', label: 'Jalur baru', icon: 'flag' }], slots: 10 })

  L({ id: 'bl13', n: 13, title: 'Layanan Cepat dan Berita Samson', bg: 33, biome: 'town',
    pre: 'Surat kabar memuat berita tentang kereta cepat Samson. Antarkan tiga surat kabar ke kios berita di kota.',
    post: 'Semua orang membaca berita tentang Samson. Samson tampak bangga.',
    rows: ['T,,T,s=,T,', '1=======,,', 's,T,,,T=,,', '========,,', '=,,,,s,,,,', '=======Z,,', ',,,A=,,,T,'], order: {G:[],l:[],C:[]},
    trains: [SA()], legend: { s: { kind: 'koran', sprite: 'school/notebook', q: 'muat' } }, stops: { A: { accepts: 'koran', need: 3, label: 'Kios berita', q: 'loket', sprite: 'school/notebook' } }, verbs: ['muat', 'turun'],
    goal: [{ t: 'load', kind: 'koran', need: 3, label: 'Koran dimuat', icon: 'news' }, { t: 'deliver', stop: 'A', label: 'Koran diantar', icon: 'news' }, { t: 'reach', label: 'Selesai', icon: 'flag' }], slots: 19 })

  L({ id: 'bl14', n: 14, title: 'Linus Menarik Kayu yang Berat', bg: 10, biome: 'forest',
    pre: 'Linus harus menarik kayu-kayu yang sangat berat. Ia lelah dan sedih, tapi ia tetap berusaha. Sambungkan tiga gerbong kayu dan bawa ke ujung jalur.',
    post: 'Linus berhasil, tapi napasnya terengah-engah. Henry mengelus kap lokomotifnya dan berkata, "Kamu sudah berusaha keras."',
    rows: [',,,=,,,,,,', '1MM=WMMM,,', ',,,,T,,MT,', 'MMMMMMW=,T', 'M,,,,,,T,,', 'MW=MMMMZ,,', ',T=TT,T,T,'], order: {G:[],l:[],C:[]},
    trains: [LI()], wagonSprite: 'mojo-prop/logs', mood: 'sad', verbs: [],
    goal: [{ t: 'wagons', need: 3, label: 'Gerbong kayu tersambung', icon: 'log' }, { t: 'reach', label: 'Ujung jalur', icon: 'flag' }], slots: 12 })

  L({ id: 'bl15', n: 15, title: 'Jembatan Miring di Bawah Samson', bg: 43, biome: 'bridge',
    pre: 'Jembatan mulai miring di bawah Samson dan gerbong penumpangnya! Semua orang tegang tapi tidak ada yang terluka. Bunyikan peluit dan nyalakan sinyal darurat minta tolong.',
    post: 'Suara peluit menggema di lembah. Bantuan harus segera datang!',
    rows: [',,,,,,T,,,', '=====1==,T', 'T,,TT,TB,,', 'BBBBBBBB,,', 'BT,T,,,l,,', 'G=======,,', ',,,T,,=,,,'], order: {G:[0],l:[0],C:[]},
    trains: [SA({ wagons: 3 })], gates: [BAR], levers: [{ sets: 'darurat', label: 'Sinyal darurat' }], verbs: ['tiup', 'tuas'],
    goal: [{ t: 'whistle', label: 'Peluit minta tolong', icon: 'whistle' }, { t: 'flag', f: 'darurat', label: 'Sinyal darurat menyala', icon: 'signal' }], slots: 8 })

  L({ id: 'bl16', n: 16, title: 'Linus Melihat Keadaan Darurat', bg: 10, biome: 'forest',
    pre: 'Dari kejauhan Linus melihat jembatan miring. Ia tahu apa yang harus dilakukan. Lepaskan dulu gerbong-gerbong kayunya, lalu berangkat membantu.',
    post: 'Linus bertekad untuk menolong. Wajahnya yang tadi lelah kini penuh semangat.',
    rows: [',,T,,,,,,,', '=====1==,,', ',T,,,,,=,,', '========,,', '=,,,T,,,,,', '=======Z,T', ',,T=,,,T,,'], order: {G:[],l:[],C:[]},
    trains: [LI({ wagons: 3 })], wagonSprite: 'mojo-prop/logs', verbs: ['lepas'],
    goal: [{ t: 'parked', need: 3, label: 'Tiga gerbong kayu dilepas', icon: 'log' }, { t: 'reach', label: 'Berangkat menolong', icon: 'flag' }], slots: 13 })

  L({ id: 'bl17', n: 17, title: 'Linus Bebas dan Carter yang Galak', bg: 10, biome: 'forest',
    pre: 'Carter, pengawas yang galak, menghalangi jalan Linus dengan palang. Linus tidak takut. Jawab pertanyaan di tuas supaya palang terbuka dan Linus bebas.',
    post: 'Palang terbuka. Linus bebas! Carter hanya bisa cemberut dan menggerutu.',
    rows: [',T,,,=,,,T', '1=======T,', 'T,,,,,T=,,', '=====G==,,', '=,,,,,,lT,', '=======Z,,', ',,,,,,=,T,'], order: {G:[0],l:[0],C:[]},
    trains: [LI()], gates: [BAR], levers: [{ toggles: [0], sets: 'bebas', q: 'sinyal', label: 'Tuas palang' }], verbs: ['tuas'],
    goal: [{ t: 'flag', f: 'bebas', label: 'Linus bebas', icon: 'signal' }, { t: 'reach', label: 'Melaju pergi', icon: 'flag' }], slots: 13 })

  L({ id: 'bl18', n: 18, title: 'Goro Mundur', bg: 12, biome: 'night',
    pre: 'Goro menghadang di jalur gelap. Linus membunyikan peluit keras-keras. Goro kaget dan mundur ke bangunan gelapnya.',
    post: 'Goro mundur dengan wajah masam. Jalan menuju jembatan terbuka lebar.',
    rows: [',,,,T=,,,,', '1=======,,', ',,T,,,,=,,', '===C====,,', '=T,,,,T,,,', '=======Z,,', ',,,,T=T,,,'], order: {G:[],l:[],C:[0]},
    trains: [LI()], critters: [{ kind: 'goro', sprite: null }], verbs: ['tiup'],
    goal: [{ t: 'critter', label: 'Goro mundur', icon: 'goro' }, { t: 'reach', label: 'Jalan terbuka', icon: 'flag' }], slots: 14 })

  L({ id: 'bl19', n: 19, title: 'Laju Menuju Jembatan', bg: 20, biome: 'mountain',
    pre: 'Linus melaju kencang menuju jembatan. Ada dua sinyal merah di jalan. Buka keduanya dengan cepat dan tepat!',
    post: 'Linus sampai di belakang rangkaian penumpang yang miring. Waktunya menolong!',
    rows: [',,,,,l=,,,', '1======G,,', ',,,TTT,=,,', 'G=======T,', '=,lT,,,,,T', '=======Z,,', ',=,,,,T,,,'], order: {G:[0,1],l:[0,1],C:[]},
    trains: [LI()], gates: [SIG, SIG], levers: [{ toggles: [0], q: 'sinyal', label: 'Sinyal satu' }, { toggles: [1], q: 'sinyal', label: 'Sinyal dua' }], verbs: ['tuas'],
    goal: [{ t: 'gate', need: 2, label: 'Dua sinyal hijau', icon: 'signal' }, { t: 'reach', label: 'Di belakang rangkaian', icon: 'flag' }], slots: 16 })

  L({ id: 'bl20', n: 20, title: 'Memindahkan Gerbong ke Daratan', bg: 43, biome: 'bridge',
    pre: 'Gerbong penumpang masih di jembatan. Linus menyambung empat gerbong satu per satu dan menariknya pelan-pelan ke daratan yang aman.',
    post: 'Gerbong dan semua penumpangnya sudah di daratan yang aman. Semua bertepuk tangan untuk Linus!',
    rows: ['T,T,,,T,T,', '1BBBBBBB,,', ',,T,,,TB,T', 'BBBBBBBB,,', 'W,,,,T,,,,', '=WW=WBBZ,,', ',,,=,T,,,T'], order: {G:[],l:[],C:[]},
    trains: [LI()], verbs: [],
    goal: [{ t: 'wagons', need: 4, label: 'Empat gerbong tersambung', icon: 'wagon' }, { t: 'reach', label: 'Daratan aman', icon: 'flag' }], slots: 12 })

  L({ id: 'bl21', n: 21, title: 'Menjemput Henry, Baron, dan Katrina', bg: 43, biome: 'bridge',
    pre: 'Masih ada tiga orang di kabin Samson: Henry, Baron, dan Katrina. Linus kembali menjemput mereka dengan hati-hati.',
    post: 'Ketiganya pindah ke kabin Linus dengan selamat. "Terima kasih, Linus!" seru mereka.',
    rows: [',,,,,,T,,,', '1BBBBBBB,,', ',,o,,,,BT,', 'BBBBBBBB,,', 'B,,,o,T,,,', 'BBBBBBBZ,,', 'p,,,,,,,,,'], order: {G:[],l:[],C:[]},
    trains: [LI()], legend: TAMU, verbs: ['muat'],
    goal: [{ t: 'load', kind: 'tamu', need: 3, label: 'Tiga orang dijemput', icon: 'penumpang' }, { t: 'reach', label: 'Kembali ke daratan', icon: 'flag' }], slots: 17 })

  L({ id: 'bl22', n: 22, title: 'Bekerja Sama di Depan Tungku', bg: 43, biome: 'bridge',
    pre: 'Henry dan Katrina membantu mengisi tungku Linus dengan batu bara. Ayo hitung bersama-sama supaya tenaganya cukup untuk menarik Samson.',
    post: 'Api di tungku menyala besar. Linus punya tenaga untuk langkah berikutnya.',
    rows: [',,b,,,=,,,', '1=======T,', ',b,,T,T=,,', '========T,', '=,,,,,,b,,', '=======Z,,', ',,=b,,,,T,'], order: {G:[],l:[],C:[]},
    trains: [LI()], legend: { b: { q: 'bunker' } }, verbs: ['muat'],
    goal: [{ t: 'load', kind: 'batubara', need: 4, label: 'Empat sekop batu bara', icon: 'coal' }, { t: 'reach', label: 'Siap menarik', icon: 'flag' }], slots: 19 })

  L({ id: 'bl23', n: 23, title: 'Menarik Samson Bersama-sama', bg: 43, biome: 'bridge',
    pre: 'Jembatan melendut! Linus dan Samson harus bergerak bersamaan. Tarik tuas bersama dulu supaya kedua palang terbuka, lalu keduanya berjalan serentak.',
    post: 'Dua lokomotif menarik bersama-sama di lintasan yang melendut. Mereka maju selangkah demi selangkah!',
    mode: 'both', rows: [',,T,,,,,,,Z,', '1====G=====,', ',,,,l,,,,,=,', '2====G=====,', ',,T,,,,,,,Y,'],
    trains: [LI(), SA()], gates: [BAR, BAR], levers: [{ toggles: [0, 1], q: 'sinyal', label: 'Tuas bersama' }], verbs: ['tuas', 'tunggu'],
    goal: [{ t: 'gate', need: 2, label: 'Dua palang terbuka', icon: 'signal' }, { t: 'reach', train: 'linus', pin: 'Z', label: 'Linus di daratan', icon: 'flag' }, { t: 'reach', train: 'samson', pin: 'Y', label: 'Samson di daratan', icon: 'flag' }], slots: 7,
    tip: 'Dua kereta berjalan serentak. TUNGGU membuat satu kereta diam sementara yang lain bergerak.' })

  L({ id: 'bl24', n: 24, title: 'Dorongan Terakhir', bg: 43, biome: 'bridge',
    pre: 'Linus sudah sangat lelah, tapi ia mengumpulkan sisa tenaga. Isi batu bara, bunyikan peluit penyemangat, lalu dorong bersama Samson ke daratan.',
    post: 'Semua orang dan kereta tiba di daratan. Linus sangat lelah, tapi ia berhasil.',
    mode: 'both', rows: [',,T,,,,,,T,,', ',,b,,,,,,Z,,', '1=========,,', ',,,,,,,,=,,,', '2=========,,', ',,b,,,,,,Y,,'],
    trains: [LI({ mood: 'sad' }), SA()], legend: { b: { q: 'bunker' } }, verbs: ['muat', 'tiup', 'tunggu'],
    goal: [{ t: 'load', train: 'linus', kind: 'batubara', label: 'Tenaga terakhir', icon: 'coal' }, { t: 'whistle', label: 'Peluit penyemangat', icon: 'whistle' }, { t: 'reach', train: 'linus', pin: 'Z', label: 'Linus di daratan', icon: 'flag' }, { t: 'reach', train: 'samson', pin: 'Y', label: 'Samson di daratan', icon: 'flag' }], slots: 8 })

  L({ id: 'bl25', n: 25, title: 'Linus Sangat Lelah', bg: 22, biome: 'home',
    pre: 'Linus tertidur kelelahan di tepi jalur. Henry menemukannya dan memanggil teman-teman. Bantu Samson menjemput tiga sahabat dan mengantar mereka ke dekat Linus.',
    post: 'Semua sahabat berkumpul di sekitar Linus. Linus hanya perlu istirahat yang panjang.',
    rows: [',,oT,,=TT,', '1=======,,', ',,,,,,p=,T', '========,,', '=,,,,To,T,', '=======Z,,', ',A,,,=T,TT'], order: {G:[],l:[],C:[]},
    trains: [SA()], legend: TAMU, stops: { A: { accepts: 'tamu', need: 3, label: 'Tempat Linus istirahat', q: 'loket', sprite: 'train-char/linus/side-l-sad' } }, verbs: ['muat', 'turun'],
    goal: [{ t: 'load', kind: 'tamu', need: 3, label: 'Sahabat dijemput', icon: 'penumpang' }, { t: 'deliver', stop: 'A', label: 'Sahabat tiba', icon: 'penumpang' }, { t: 'reach', label: 'Selesai', icon: 'flag' }], slots: 16 })

  L({ id: 'bl26', n: 26, title: 'Mimpi Linus', bg: 21, biome: 'dream',
    pre: 'Linus tidur nyenyak. Ia bermimpi berjalan di rel yang bercahaya, bertemu semua sahabatnya. Kumpulkan tiga bintang mimpi dan ikuti cahaya hangat di ujung jalur.',
    post: 'Dalam mimpinya Linus tertawa bersama Henry, Samson, dan semua temannya. Ia bangun dengan hati hangat.',
    rows: ['TT,,=,,m,,', '1=======,,', 'm,,,,m,=,,', '========T,', '=,T,,,,,,,', '=======ZT,', ',,=T,,,,,,'], order: {G:[],l:[],C:[]},
    trains: [LI({ mood: 'happy' })], legend: { m: { kind: 'bintang', sprite: 'game/star' } }, verbs: ['muat'],
    goal: [{ t: 'load', kind: 'bintang', need: 3, label: 'Bintang mimpi', icon: 'star' }, { t: 'reach', label: 'Cahaya hangat', icon: 'flag' }], slots: 16 })

  L({ id: 'bl27', n: 27, title: 'Linus Diperbaiki di Bengkel', bg: 22, biome: 'home',
    pre: 'Linus dibawa ke bengkel. Henry dan teman-teman membantu memperbaikinya. Antarkan tiga baut untuk perbaikan Linus.',
    post: 'Linus bersinar lagi seperti baru! Semua orang bersorak di bengkel.',
    rows: ['T,nT=T,,,,', '1=======,,', ',nT,,,T=,,', '========,,', '=,T,,,,n,T', '=======Z,,', ',,T,,A=,,,'], order: {G:[],l:[],C:[]},
    trains: [SA()], legend: { n: { kind: 'baut', sprite: 'mojo-prop/bolt', q: 'muat' } }, stops: { A: { accepts: 'baut', need: 3, label: 'Bengkel', q: 'loket', sprite: 'mojo-prop/toolbox' } }, verbs: ['muat', 'turun'],
    goal: [{ t: 'load', kind: 'baut', need: 3, label: 'Baut diambil', icon: 'bolt' }, { t: 'deliver', stop: 'A', label: 'Baut di bengkel', icon: 'bolt' }, { t: 'reach', label: 'Selesai', icon: 'flag' }], slots: 19 })

  L({ id: 'bl28', n: 28, title: 'Berita Kepahlawanan', bg: 33, biome: 'town',
    pre: 'Koran memberitakan keberanian Linus dan bagaimana ia diperbaiki. Antarkan koran-koran itu ke dua kios di kota.',
    post: 'Semua orang di kota tahu: Linus adalah pahlawan, dan ia sudah sehat lagi!',
    rows: [',,s=T,,s,,', '1=======,,', 'T,,,,,,=,,', '========,,', '=,T,,,TA,,', '========T,', ',,D,,=,,,,'], order: {G:[],l:[],C:[]},
    trains: [LI()], legend: { s: { kind: 'koran', sprite: 'school/notebook' } }, stops: { A: { accepts: 'koran', need: 1, label: 'Kios pertama', q: 'loket', sprite: 'school/notebook' }, D: { accepts: 'koran', need: 1, label: 'Kios kedua', sprite: 'school/notebook' } }, verbs: ['muat', 'turun'],
    goal: [{ t: 'deliver', stop: 'A', label: 'Kios pertama', icon: 'news' }, { t: 'deliver', stop: 'D', label: 'Kios kedua', icon: 'news' }], slots: 17 })

  L({ id: 'bl29', n: 29, title: 'Jembatan Baru', bg: 43, biome: 'bridge',
    pre: 'Bertahun-tahun kemudian, jembatan yang baru sudah dibangun. Buka palang, lalu Linus menyeberang bersama dua gerbongnya.',
    post: 'Linus menyeberangi jembatan baru yang kokoh, di dunia yang terus berubah.',
    rows: [',,,T,,l,,,', '====1===,,', ',T,,,,,G,,', 'BBBBBBBB,,', 'B,,,,T,,,,', 'B======Z,,', 'T,,T=TT,,,'], order: {G:[0],l:[0],C:[]},
    trains: [LI({ wagons: 2 })], gates: [SIG], levers: [{ toggles: [0], q: 'sinyal', label: 'Palang jembatan' }], verbs: ['tuas'],
    goal: [{ t: 'gate', label: 'Palang terbuka', icon: 'signal' }, { t: 'wagons', need: 2, label: 'Dua gerbong ikut', icon: 'wagon' }, { t: 'reach', label: 'Seberang jembatan', icon: 'flag' }], slots: 14 })

  L({ id: 'bl30', n: 30, title: 'Henry, Scarlet, dan Linus', bg: 20, biome: 'home',
    pre: 'Henry dan Scarlet sekarang sudah tua, dan mereka masih bersahabat dengan Linus. Jemput mereka berdua, lalu Linus dan Samson berjalan santai bersama.',
    post: 'Rangkaian kecil Linus berjalan damai, membawa sahabat-sahabat lama. Tamat. Terima kasih sudah berpetualang!',
    mode: 'both', rows: [',,T,,,,,,T,,', ',,o,,,,,,Z,,', '1=========,,', ',,,,,,,,=,,,', '2=========,,', ',,T,,,,,,Y,,'],
    trains: [LI({ mood: 'happy' }), SA()], legend: TAMU, verbs: ['muat', 'tunggu'],
    goal: [{ t: 'load', train: 'linus', kind: 'tamu', label: 'Henry naik', icon: 'penumpang' }, { t: 'reach', train: 'linus', pin: 'Z', label: 'Linus tiba', icon: 'flag' }, { t: 'reach', train: 'samson', pin: 'Y', label: 'Samson tiba', icon: 'flag' }], slots: 8 })

  /* ── Latihan Rel (31-34): the four practice missions of the owner's UI references, as bonus levels ─────────── */
  L({ id: 'bl31', n: 31, title: 'Berbagi Rel', bg: 43, biome: 'bridge',
    pre: 'Linus yang biru dan Samson yang berwarna gelap datang dari dua arah di jalur yang sama. Pakai jalur samping supaya keduanya bisa lewat, lalu jalankan bersama.',
    post: 'Keduanya lewat dengan sabar. Berbagi rel membuat semua sampai dengan selamat.',
    say: { who: 'Henry', text: 'Jalurnya cuma satu. Pakai jalur samping, ya, supaya Linus dan Samson sama-sama lewat.' },
    steps: [{ icon: 'wagon', text: 'Linus ke jalur samping' }, { icon: 'wait', text: 'Samson lewat' }, { icon: 'flag', text: 'Keduanya sampai' }],
    mode: 'both', rows: [',,T,,,,,,,T,', ',,,======,,,', ',,,=,,,,=,,,', 'Z1==BBBB==2Y', ',,,T,,,,,,T,'], runLabel: 'Jalankan Bersama',
    trains: [LI(), SA({ dir: 'W' })], verbs: ['tunggu'],
    goal: [{ t: 'reach', train: 'linus', pin: 'Y', label: 'Linus ke ujung kanan', icon: 'flag' }, { t: 'reach', train: 'samson', pin: 'Z', label: 'Samson ke ujung kiri', icon: 'flag' }], slots: 12 })

  L({ id: 'bl32', n: 32, title: 'Rangkai Gerbong', bg: 8, biome: 'station',
    pre: 'Di stasiun ada tiga gerbong: gerbong penumpang, gerbong surat, dan gerbong kayu. Pilih gerbong penumpang dan gerbong surat saja. Berhenti tepat di depan gerbong, lalu tekan Sambung.',
    post: 'Rangkaiannya lengkap: penumpang dan surat. Gerbong kayu menunggu giliran lain.',
    say: { who: 'Henry', text: 'Jangan semua gerbong dibawa. Ambil yang penumpang dan yang surat saja.' },
    steps: [{ icon: 'wagon', text: 'Pilih gerbong penumpang' }, { icon: 'surat', text: 'Pilih gerbong surat' }, { icon: 'flag', text: 'Antar ke ujung rel' }],
    rows: [',,T,,,,,,T,,', ',,,T,,,,,,T,', ',==a=,==c=,,', '1==========Z', ',,,,,,,,,,,,'], runLabel: 'Uji Rangkaian',
    wagons: { a: { kind: 'penumpang', manual: 1 }, c: { kind: 'surat', manual: 1 }, d: { kind: 'kayu', manual: 1, sprite: 'mojo-prop/logs' } },
    trains: [LI()], verbs: ['sambung', 'lepas'],
    goal: [{ t: 'consist', kinds: ['penumpang', 'surat'], label: 'Penumpang dan surat tersambung', icon: 'wagon' }, { t: 'reach', label: 'Tiba di ujung rel', icon: 'flag' }], slots: 18 })

  L({ id: 'bl33', n: 33, title: 'Terowongan Berkabut', bg: 12, biome: 'night',
    pre: 'Terowongan penuh kabut tebal. Nyalakan lampu dulu, tunggu sampai sinyal berubah hijau, lalu maju pelan-pelan.',
    post: 'Lampu Linus menembus kabut. Sinyal hijau, dan Linus keluar dari terowongan dengan selamat.',
    say: { who: 'Henry', text: 'Kabutnya tebal. Nyalakan lampu, tunggu sinyal hijau, baru jalan.' },
    steps: [{ icon: 'lamp', text: 'Nyalakan lampu' }, { icon: 'wait', text: 'Tunggu sinyal hijau' }, { icon: 'flag', text: 'Maju keluar terowongan' }],
    rows: [',,,,T=,TT,', '1=====KK,,', ',T,,T,,KT,', 'KKKG=KKK,T', 'K,,,,,,,,,', 'KK=====Z,,', ',,=,,T,,,,'], order: {G:[0],l:[],C:[]}, runLabel: 'Jalankan',
    trains: [LI()], gates: [{ open: 0, look: 'signal', after: 9 }], verbs: ['lampu', 'tunggu'],
    goal: [{ t: 'flag', f: 'lampu', label: 'Lampu menyala', icon: 'lamp' }, { t: 'reach', label: 'Keluar terowongan', icon: 'flag' }], slots: 14 })

  L({ id: 'bl34', n: 34, title: 'Antar ke Tempat Aman', bg: 20, biome: 'station',
    pre: 'Para penumpang menunggu di peron. Naikkan mereka satu per satu, atur wesel supaya jalur ke stasiun aman terbuka, lalu turunkan mereka di sana.',
    post: 'Semua penumpang tiba di stasiun yang aman. Tidak ada yang tertinggal.',
    say: { who: 'Henry', text: 'Jemput semua penumpang dan antar ke stasiun yang aman. Jangan lupa wesel!' },
    steps: [{ icon: 'penumpang', text: 'Naikkan empat penumpang' }, { icon: 'signal', text: 'Atur wesel' }, { icon: 'deliver', text: 'Turun di stasiun aman' }],
    rows: ['T,,=oTo,,T', '1=======,T', ',l,,,,,=,,', '========TT', 'G,To,,o,TT', '=======Z,,', ',,,AT=,,,T'], order: {G:[0],l:[0],C:[]},
    legend: { o: { kind: 'tamu', sprite: 'malivlak-char/penumpang-jas-kotak/jalan', q: 'muat' } }, stops: { A: { accepts: 'tamu', need: 4, label: 'Stasiun aman', q: 'loket', sprite: 'mojo-prop/building-station' } },
    gates: [{ open: 0, look: 'barrier' }], levers: [{ toggles: [0], q: 'sinyal', label: 'Wesel' }],
    trains: [LI()], verbs: ['naik', 'wesel', 'turun'],
    goal: [{ t: 'load', kind: 'tamu', need: 4, label: 'Penumpang naik', icon: 'penumpang' }, { t: 'deliver', stop: 'A', label: 'Penumpang di stasiun aman', icon: 'penumpang' }, { t: 'reach', label: 'Tujuan', icon: 'flag' }], slots: 22 })
})(typeof window !== 'undefined' ? window : globalThis)
