/* =============================================================================
 * kereta-levels-hellbent.js — chapter "Lomba ke Kota" (authored for the game, 10 levels).
 * A kid-friendly race to the town festival between the bright silver streamliner (Kilat Perak) and the sleepy
 * old "Defeatist Limited" engine (Tuan Lemas), who keeps wanting to give up. Theme: do not give up, help each
 * other. No politics and no war content beyond the text printed on the sprites ("WIN THE WAR SPECIAL",
 * "DEFEATIST LIMITED 1929", kept as drawn). Exercises BOTH two-train modes: 'turns' and 'both'.
 * ==========================================================================*/
(function (W) {
  'use strict'
  var K = W.KeretaLevels = W.KeretaLevels || { malivlak: [], brave: [], hellbent: [] }
  function pad (rows) { var w = 0; rows.forEach(function (r) { w = Math.max(w, r.length) }); return rows.map(function (r) { while (r.length < w) r += ','; return r }) }
  function L (o) { o.ch = 'hellbent'; o.rows = pad(o.rows); K.hellbent.push(o); return o }
  function KP (dir) { return { id: 'kilat', char: 'silver', name: 'Kilat Perak', dir: dir || 'E' } }
  function TL (dir) { return { id: 'lemas', char: 'defeatist', name: 'Tuan Lemas', dir: dir || 'E' } }
  var SIG = { open: 0, look: 'signal' }

  L({ id: 'hb01', n: 1, title: 'Peluit Tanda Mulai', bg: 33, biome: 'town',
    pre: 'Hari ini ada Pesta Besar di kota! Kilat Perak, kereta perak yang cepat, siap berlomba. Bunyikan peluit tanda mulai, lalu meluncurlah ke garis akhir.',
    post: 'Kilat Perak sampai duluan. Tapi lomba ini belum selesai: Tuan Lemas masih tidur di stasiun tua.',
    rows: [',,,T=,,T,,T,', '1=========,,', ',,T,,,T,,=,,', 'Z=========T,', ',,T,,,,,,,,T'], order: {G:[],l:[],C:[]},
    trains: [KP()], verbs: ['tiup'],
    goal: [{ t: 'whistle', label: 'Peluit tanda mulai', icon: 'whistle' }, { t: 'reach', label: 'Sampai di garis akhir', icon: 'flag' }], slots: 9 })

  L({ id: 'hb02', n: 2, title: 'Tuan Lemas Mau Menyerah', bg: 25, biome: 'country',
    pre: 'Tuan Lemas berhenti di depan sinyal merah. "Ah, sudahlah, aku menyerah saja," katanya. Ayo semangati dia. Jawab pertanyaan di kotak sinyal supaya lampunya hijau.',
    post: 'Lampu hijau menyala. "Eh, ternyata bisa!" kata Tuan Lemas sambil tersenyum kecil. Ia pun jalan lagi.',
    rows: [',T,,=,lT,,', '1=======,T', 'TT,,,,,=,,', 'Z======G,,', ',,,,,TT,,,'], order: {G:[0],l:[0],C:[]},
    trains: [TL()], gates: [SIG], levers: [{ toggles: [0], q: 'sinyal', label: 'Kotak sinyal' }], verbs: ['tuas'],
    goal: [{ t: 'gate', label: 'Sinyal hijau', icon: 'signal' }, { t: 'reach', label: 'Tuan Lemas lanjut', icon: 'flag' }], slots: 10 })

  L({ id: 'hb03', n: 3, title: 'Gantian Membantu', bg: 16, biome: 'country',
    pre: 'Kilat Perak lewat dekat kotak sinyal Tuan Lemas. Ia mau membantu! Gantian: Kilat membuka sinyal dulu, baru Tuan Lemas jalan.',
    post: 'Dengan bantuan temannya, Tuan Lemas lewat dengan lancar. Mereka berdua tertawa bersama.',
    mode: 'turns', rows: [',,T,,l,,,T,,', '1====Y=,=Z,,', ',,,,,,=,=,,,', '2==G=====,,,', ',,,T,,,,,,,,'],
    trains: [KP(), TL()], gates: [SIG], levers: [{ toggles: [0], q: 'sinyal', label: 'Kotak sinyal' }], verbs: ['tuas'],
    goal: [{ t: 'gate', label: 'Sinyal dibuka Kilat', icon: 'signal' }, { t: 'reach', train: 'kilat', pin: 'Y', label: 'Kilat sampai', icon: 'flag' }, { t: 'reach', train: 'lemas', pin: 'Z', label: 'Tuan Lemas sampai', icon: 'flag' }], slots: 9,
    tip: 'Pilih kereta di bagian atas, lalu beri perintah. Setiap perintah dikerjakan bergantian.' })

  L({ id: 'hb04', n: 4, title: 'Jalan Bersama di Jembatan', bg: 43, biome: 'bridge',
    pre: 'Jembatan ini hanya cukup untuk satu kereta. Dua kereta jalan bersamaan: kalau tidak sabar, mereka bertemu di tengah. Atur kapan harus TUNGGU.',
    post: 'Mereka bergantian lewat dengan sabar. Kilat dan Tuan Lemas sama-sama sampai di seberang.',
    mode: 'both', rows: [',,T,,,,,,,T,', '1===,,,===Z,', ',,,BBBBB,,,,', '2===,,,===Y,', ',,T,,,,,,T,,'],
    trains: [KP(), TL()], verbs: ['tunggu'],
    goal: [{ t: 'reach', train: 'kilat', pin: 'Z', label: 'Kilat di seberang', icon: 'flag' }, { t: 'reach', train: 'lemas', pin: 'Y', label: 'Lemas di seberang', icon: 'flag' }], slots: 14,
    tip: 'Dua kereta berjalan serentak. Pakai TUNGGU supaya satu kereta menunggu yang lain lewat.' })

  L({ id: 'hb05', n: 5, title: 'Batu Bara untuk Tuan Lemas', bg: 10, biome: 'forest',
    pre: 'Tuan Lemas kehabisan batu bara dan hampir menyerah lagi. Bantu ia mengisi tungku, lalu tarik tuas supaya sinyal Kilat hijau.',
    post: 'Tungku Tuan Lemas menyala terang. "Aku masih kuat!" serunya, dan dua sahabat itu melaju ke kota.',
    mode: 'both', rows: [',,T,,,,,,,Z,', '1====G=====,', ',,b,,,,l,,=,', '2==========Y', ',,b,,,,,,,,,'],
    trains: [KP(), TL()], gates: [SIG], levers: [{ toggles: [0], q: 'sinyal', label: 'Kotak sinyal' }], legend: { b: { q: 'bunker' } }, verbs: ['muat', 'tuas', 'tunggu'],
    goal: [{ t: 'load', train: 'lemas', kind: 'batubara', need: 2, label: 'Batu bara terisi', icon: 'coal' }, { t: 'reach', train: 'kilat', pin: 'Z', label: 'Kilat sampai', icon: 'flag' }, { t: 'reach', train: 'lemas', pin: 'Y', label: 'Lemas sampai', icon: 'flag' }], slots: 11 })

  L({ id: 'hb06', n: 6, title: 'Tanjakan yang Berat', bg: 34, biome: 'mountain',
    pre: 'Tanjakan ini berat untuk Tuan Lemas yang membawa gerbong. Kilat membantu: ambil dua gerbong dan tinggalkan di tempat parkir, lalu Tuan Lemas mendaki dengan ringan.',
    post: 'Tuan Lemas mendaki tanpa beban dan sampai di puncak. "Teman yang baik itu hebat," katanya.',
    mode: 'turns', rows: [',,T,,,,,,T,,', '1==W=W=====Y', ',,,,,,,,,=,,', '2=HHH=HHH===', ',,,,,,,,,,,Z'],
    trains: [KP(), TL()], verbs: ['lepas'],
    goal: [{ t: 'parked', need: 2, label: 'Dua gerbong diparkir', icon: 'wagon' }, { t: 'reach', train: 'kilat', pin: 'Y', label: 'Kilat sampai', icon: 'flag' }, { t: 'reach', train: 'lemas', pin: 'Z', label: 'Lemas di puncak', icon: 'flag' }], slots: 9 })

  L({ id: 'hb07', n: 7, title: 'Berpapasan di Terowongan', bg: 34, biome: 'mountain',
    pre: 'Dua kereta datang dari arah berlawanan menuju satu terowongan. Satu naik ke jalur atas, satu lewat bawah. Atur giliran bersama-sama supaya tidak bertabrakan.',
    post: 'Mereka berpapasan dengan senyum. Kilat melambai dan Tuan Lemas melambai balik.',
    mode: 'both', rows: [',,T,,,,,,,T,', ',,,======,,,', ',,,=,,,,=,,,', 'Y1==UUUU==2Z', ',,,T,,,,,,T,'],
    trains: [KP(), TL('W')], verbs: ['tunggu'],
    goal: [{ t: 'reach', train: 'kilat', pin: 'Z', label: 'Kilat ke ujung kanan', icon: 'flag' }, { t: 'reach', train: 'lemas', pin: 'Y', label: 'Lemas ke ujung kiri', icon: 'flag' }], slots: 12 })

  L({ id: 'hb08', n: 8, title: 'Kilat Memberi Jalan', bg: 16, biome: 'country',
    pre: 'Tuan Lemas jalan pelan di depan. Kilat sabar menunggu di jalur samping dan memberi jalan, lalu mereka lewat satu per satu.',
    post: 'Tidak ada yang tertinggal. Mereka sudah dekat sekali dengan kota.',
    mode: 'turns', rows: [',,T,,,,,,,T,', ',,,,==Y==,,,', ',,,,=,,,,=,,', '2===1======Z', ',,T,,,,T,,,,'],
    trains: [TL(), KP()], verbs: [],
    goal: [{ t: 'reach', train: 'lemas', pin: 'Y', label: 'Tuan Lemas minggir', icon: 'flag' }, { t: 'reach', train: 'kilat', pin: 'Z', label: 'Kilat lewat', icon: 'flag' }], slots: 9 })

  L({ id: 'hb09', n: 9, title: 'Tiba Bersama', bg: 33, biome: 'town',
    pre: 'Garis akhir sudah terlihat! Kilat dan Tuan Lemas ingin tiba berbarengan. Jalan bersama, jangan bertabrakan, dan bunyikan peluit di akhir.',
    post: 'Mereka tiba tepat bersamaan! Orang-orang bersorak. "Kita menang bersama," kata Kilat.',
    mode: 'both', rows: [',,T,,,,,Z,,,', '1========,,,', ',,,=,,,,,,,,', '2========,,,', ',,T,,,,,Y,,,'],
    trains: [KP(), TL()], verbs: ['tiup', 'tunggu'],
    goal: [{ t: 'reach', train: 'kilat', pin: 'Z', label: 'Kilat di garis akhir', icon: 'flag' }, { t: 'reach', train: 'lemas', pin: 'Y', label: 'Lemas di garis akhir', icon: 'flag' }, { t: 'whistle', label: 'Peluit kemenangan', icon: 'whistle' }], slots: 6 })

  L({ id: 'hb10', n: 10, title: 'Pesta di Kota', bg: 20, biome: 'town',
    pre: 'Di kota ada Pesta Besar! Kilat membawa bendera, Tuan Lemas membawa bintang. Antar semuanya ke panggung pesta.',
    post: 'Pesta dimulai! Semua bersorak untuk dua sahabat yang tidak pernah menyerah. Tamat!',
    mode: 'both', rows: [',,T,,,,,,T,,', ',,,w,,A,,Z,,', '1=========,,', ',,,,,,,,=,,,', '2=========,,', ',,,m,,D,,Y,,'],
    trains: [KP(), TL()], verbs: ['muat', 'turun', 'tunggu'], legend: { w: { kind: 'bendera', sprite: 'game/flag-red', q: 'muat' }, m: { kind: 'bintang', sprite: 'game/star', q: 'muat' } },
    stops: { A: { accepts: 'bendera', label: 'Panggung pesta', q: 'loket', sprite: 'game/flag-red' }, D: { accepts: 'bintang', label: 'Panggung bintang', sprite: 'game/star' } },
    goal: [{ t: 'deliver', stop: 'A', label: 'Bendera di panggung', icon: 'flag' }, { t: 'deliver', stop: 'D', label: 'Bintang di panggung', icon: 'star' }, { t: 'reach', train: 'kilat', pin: 'Z', label: 'Kilat di garis akhir', icon: 'flag' }, { t: 'reach', train: 'lemas', pin: 'Y', label: 'Lemas di garis akhir', icon: 'flag' }], slots: 9 })
})(typeof window !== 'undefined' ? window : globalThis)
