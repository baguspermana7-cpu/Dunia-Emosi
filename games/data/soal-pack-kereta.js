/* =============================================================================
 * soal-pack-kereta.js — SoalEngine packs 'kereta-sinyal' / 'kereta-muat' / 'kereta-loket' / 'kereta-bunker'
 * and the game profile 'kereta' for "Kereta Pemberani: Petualangan Rel" (games/kereta-maze.html).
 *
 * Questions are STORY MOMENTS on the board (owner 2026-10-10: problems the child must solve to progress; the
 * story's own objects, pictures from the asset database, never emoji):
 *   sinyal   the signal box — logic, patterns, shapes, picture choices       (a lever asks it)
 *   muat     loading the wagons — count the cargo in the picture, compare      (a cargo pile asks it)
 *   loket    the ticket office — addition / subtraction word problems (text)   (a station stop asks it)
 *   bunker   the coal bunker — word problems with coal, sharing, more / less    (the coal pile asks it)
 * Picture fields understood by the game's question card (kereta-quiz.js):
 *   pic + picCount        n copies of one sprite          picA/nA + picB/nB   two groups to compare
 *   choicePics            {choice: sprite key}            shape  'lingkaran' | 'persegi' | 'segitiga' | 'persegi-panjang'
 * A wrong answer is never a failure: the card shows hint1 and lets the child try again (the game side).
 * Load order: soal-engine.js, soal-gen-matematika.js, this file.
 * ==========================================================================*/
(function () {
  'use strict'
  var W = (typeof window !== 'undefined' ? window : globalThis)
  var SE = W.SoalEngine
  if (!SE) return

  // [sprite key, singular noun, group word] — every key lives in the shared asset database
  var N = {
    koper: ['tk-prop/suitcase-5', 'koper', 'koper'],
    surat: ['tk-prop/sealed-letter', 'surat', 'surat'],
    batu: ['tk-prop/coal-lump', 'bongkah batu bara', 'bongkah batu bara'],
    peti: ['game/crate-wood', 'peti', 'peti'],
    gerbong: ['mojo-train/coach-annie', 'gerbong', 'gerbong'],
    kayu: ['mojo-prop/log2', 'batang kayu', 'batang kayu'],
    telur: ['real/food/eggs', 'telur', 'telur'],
    ikan: ['animals/clownfish', 'ikan', 'ikan'],
    bintang: ['game/star', 'bintang', 'bintang'],
    buku: ['school/books', 'buku', 'buku'],
    bendera: ['game/flag-red', 'bendera', 'bendera']
  }
  var ITEMS = { sinyal: [], muat: [], loket: [], bunker: [] }
  var seq = 0

  function strs (a) { return a.map(String) }
  function uniq (a) { var o = [], s = {}; a.forEach(function (x) { if (!s[x]) { s[x] = 1; o.push(x) } }); return o }
  // choices around a number: the answer plus two near misses, never below 0
  function around (n, max) {
    var c = [n]
    ;[1, -1, 2, -2, 3].forEach(function (d) { var v = n + d; if (c.length < 3 && v >= 0 && v <= (max || 30) && c.indexOf(v) < 0) c.push(v) })
    return strs(c.sort(function (a, b) { return a - b }))
  }
  function add (place, o) {
    o.id = 'ker-' + place + '-' + (++seq)
    o.topic = o.topic || 'matematika'; o.grade = o.grade || 1; o.level = o.level || 1
    o.theme = ['kereta']; o.place = place
    o.explain = o.explain || ('Jawabannya ' + o.answer + '.')
    ITEMS[place].push(o)
  }

  /* ── muat: count the cargo in the picture, compare two piles ─────────────────────────────────────── */
  Object.keys(N).forEach(function (k, ki) {
    for (var n = 2; n <= 8; n++) {
      if ((n + ki) % 2) continue
      add('muat', { prompt: 'Ada berapa ' + N[k][1] + ' di gambar?', pic: N[k][0], picCount: n, choices: around(n, 10), answer: String(n),
        hint1: 'Sentuh satu per satu sambil berhitung: 1, 2, 3 ...', grade: n > 6 ? 2 : 1, level: n > 6 ? 2 : 1, kind: 'count' })
    }
  })
  var PAIRS = [['peti', 'koper'], ['surat', 'buku'], ['kayu', 'batu'], ['telur', 'ikan'], ['bintang', 'bendera'], ['gerbong', 'peti']]
  PAIRS.forEach(function (p, i) {
    ;[[5, 3], [2, 6], [4, 7]].forEach(function (c, j) {
      var a = c[0], b = c[1], A = N[p[0]], B = N[p[1]], more = a > b ? A[2] : B[2]
      add('muat', { prompt: 'Mana yang lebih banyak, ' + A[2] + ' atau ' + B[2] + '?', picA: A[0], nA: a, picB: B[0], nB: b,
        choices: [A[2], B[2], 'Sama banyak'], answer: more, hint1: 'Hitung dulu masing-masing, lalu bandingkan.', kind: 'compare', level: 1 + (j > 1 ? 1 : 0), grade: j > 1 ? 2 : 1 })
    })
    add('muat', { prompt: 'Berapa jumlah ' + N[p[0]][2] + ' dan ' + N[p[1]][2] + ' semuanya?', picA: N[p[0]][0], nA: 2 + (i % 3), picB: N[p[1]][0], nB: 3, choices: around(5 + (i % 3), 12), answer: String(5 + (i % 3)),
      hint1: 'Hitung gambar yang pertama, lalu lanjutkan menghitung gambar yang kedua.', kind: 'join', level: 2, grade: 2 })
  })

  /* ── loket: addition and subtraction word stories (text only) ────────────────────────────────────── */
  var STORIES = [
    ['penumpang', 'di peron', 'naik', 'Linus'], ['tiket', 'di loket', 'terjual', 'petugas loket'], ['koper', 'di peron', 'dibawa naik', 'Malivlak'],
    ['surat', 'di kantor pos', 'diantar', 'Dragutin'], ['gerbong', 'di stasiun', 'disambung', 'Samson'], ['bendera', 'di stasiun', 'dipasang', 'petugas stasiun']
  ]
  STORIES.forEach(function (s, i) {
    ;[[3, 4], [5, 2], [6, 3], [4, 5], [7, 4]].forEach(function (c, j) {
      var a = c[0], b = c[1]
      add('loket', { prompt: 'Ada ' + a + ' ' + s[0] + ' ' + s[1] + '. Datang ' + b + ' ' + s[0] + ' lagi. Berapa ' + s[0] + ' sekarang?', choices: around(a + b, 16), answer: String(a + b),
        hint1: 'Tambahkan: mulai dari ' + a + ', lalu hitung maju ' + b + ' kali.', kind: 'plus', level: a + b > 10 ? 2 : 1, grade: a + b > 10 ? 2 : 1 })
      var tot = a + b + 2
      add('loket', { prompt: 'Di ' + s[1].replace('di ', '') + ' ada ' + tot + ' ' + s[0] + '. ' + b + ' ' + s[0] + ' ' + s[2] + ' bersama ' + s[3] + '. Berapa ' + s[0] + ' yang tersisa?', choices: around(tot - b, 16), answer: String(tot - b),
        hint1: 'Kurangi: mulai dari ' + tot + ', lalu hitung mundur ' + b + ' kali.', kind: 'minus', level: tot > 10 ? 2 : 1, grade: tot > 10 ? 2 : 1 })
    })
  })

  /* ── bunker: coal, sharing, more and less (text only, plus the coal picture) ───────────────────── */
  ;[[2, 3], [4, 2], [5, 5], [3, 6], [6, 4], [8, 2]].forEach(function (c, i) {
    var a = c[0], b = c[1]
    add('bunker', { prompt: 'Henry memasukkan ' + a + ' sekop batu bara, lalu ' + b + ' sekop lagi. Berapa sekop semuanya?', pic: 'tk-prop/coal-scoop', choices: around(a + b, 16), answer: String(a + b),
      hint1: 'Gabungkan dua bagian: ' + a + ' dan ' + b + '.', kind: 'plus', level: a + b > 10 ? 2 : 1, grade: a + b > 10 ? 2 : 1 })
    add('bunker', { prompt: 'Bunker punya ' + (a + b) + ' bongkah batu bara. Tungku memakai ' + b + '. Berapa bongkah yang masih ada?', pic: 'tk-prop/coal-pile', choices: around(a, 16), answer: String(a),
      hint1: 'Mulai dari ' + (a + b) + ', hitung mundur ' + b + ' kali.', kind: 'minus', level: 1, grade: a + b > 10 ? 2 : 1 })
    add('bunker', { prompt: 'Linus membawa ' + a + ' bongkah batu bara. Samson membawa ' + (a + b) + '. Siapa yang membawa lebih banyak?', choices: ['Linus', 'Samson', 'Sama banyak'], answer: 'Samson',
      hint1: 'Angka mana yang lebih besar, ' + a + ' atau ' + (a + b) + '?', kind: 'compare', level: 1, grade: 1 })
  })
  ;[[8, 2], [6, 3], [10, 5], [4, 2]].forEach(function (c) {
    add('bunker', { prompt: c[0] + ' bongkah batu bara dibagi rata ke ' + c[1] + ' gerbong. Berapa bongkah untuk satu gerbong?', pic: 'tk-prop/coal-cart', choices: around(c[0] / c[1], 10), answer: String(c[0] / c[1]),
      hint1: 'Bagikan satu-satu ke setiap gerbong sampai habis.', kind: 'share', level: 3, grade: 2 })
  })

  /* ── sinyal: patterns, shapes, picture choices, sorting ─────────────────────────────────────────── */
  var COL = ['merah', 'biru', 'hijau', 'kuning']
  ;[[0, 1], [1, 2], [2, 3], [3, 0], [0, 2]].forEach(function (p) {
    var a = COL[p[0]], b = COL[p[1]]
    add('sinyal', { prompt: 'Gerbong berjajar: ' + a + ', ' + b + ', ' + a + ', ' + b + ', ' + a + ', ... Gerbong berikutnya warna apa?', choices: uniq([b, a, COL[(p[1] + 1) % 4]]), answer: b,
      hint1: 'Warnanya bergantian. Setelah ' + a + ' selalu datang warna lain.', topic: 'logika', kind: 'pattern', level: 1, grade: 1 })
  })
  ;[['lingkaran', 'roda kereta'], ['persegi', 'jendela kotak'], ['segitiga', 'atap pos jaga'], ['persegi-panjang', 'badan gerbong']].forEach(function (s) {
    add('sinyal', { prompt: 'Bentuk apakah ' + s[1] + ' ini?', shape: s[0], choices: ['lingkaran', 'persegi', 'segitiga', 'persegi-panjang'], answer: s[0],
      hint1: 'Lihat sisinya: berapa sisi dan apakah ada sudut?', topic: 'bentuk', kind: 'shape', level: 1, grade: 1 })
  })
  ;[
    ['Mana yang dipakai masinis untuk membunyikan tanda?', { Peluit: 'tk-prop/whistle', Koper: 'tk-prop/suitcase-5', Telur: 'real/food/eggs' }, 'Peluit', 'Benda ini berbunyi nyaring.'],
    ['Mana yang dibawa gerbong pos?', { Surat: 'tk-prop/sealed-letter', Ikan: 'animals/clownfish', Bintang: 'game/star' }, 'Surat', 'Pos mengantar kabar tertulis.'],
    ['Mana yang dimasukkan ke dalam tungku kereta uap?', { 'Batu bara': 'tk-prop/coal-lump', Telur: 'real/food/eggs', Surat: 'tk-prop/sealed-letter' }, 'Batu bara', 'Tungku butuh bahan bakar yang hitam.'],
    ['Mana yang dipakai untuk membalut roda yang lecet?', { Perban: 'real/things/bandage', Peluit: 'tk-prop/whistle', Bendera: 'game/flag-red' }, 'Perban', 'Perban dipakai untuk membalut.'],
    ['Mana yang menandakan lintasan aman untuk lewat?', { 'Bendera merah': 'game/flag-red', 'Lampu jalan': 'mojo-prop/street-lamp', Peti: 'game/crate-wood' }, 'Lampu jalan', 'Cari yang menyala di dekat rel.']
  ].forEach(function (q) {
    var ch = Object.keys(q[1])
    add('sinyal', { prompt: q[0], choices: ch, choicePics: q[1], answer: q[2], hint1: q[3], topic: 'umum', kind: 'picture', level: 1, grade: 1 })
  })
  ;[[3, 5, 8], [2, 6, 4], [7, 4, 9], [1, 9, 5]].forEach(function (t) {
    var lo = Math.min.apply(null, t), hi = Math.max.apply(null, t)
    add('sinyal', { prompt: 'Sinyal menunjukkan angka ' + t.join(', ') + '. Mana angka yang paling besar?', choices: strs(t), answer: String(hi), hint1: 'Bandingkan dua angka dulu, lalu yang ketiga.', topic: 'matematika', kind: 'max', level: 1, grade: 1 })
    add('sinyal', { prompt: 'Sinyal menunjukkan angka ' + t.join(', ') + '. Mana angka yang paling kecil?', choices: strs(t), answer: String(lo), hint1: 'Cari angka yang paling dekat dengan nol.', topic: 'matematika', kind: 'min', level: 1, grade: 1 })
  })
  ;[[2, 4, 6], [5, 10, 15], [10, 8, 6], [1, 3, 5]].forEach(function (s) {
    var d = s[1] - s[0], nx = s[2] + d
    add('sinyal', { prompt: 'Lampu sinyal menyala: ' + s.join(', ') + ', ... Angka berikutnya?', choices: around(nx, 20), answer: String(nx), hint1: 'Lihat selisih tiap angka: ' + (d > 0 ? 'bertambah ' + d : 'berkurang ' + (-d)) + '.', topic: 'logika', kind: 'series', level: 2, grade: 2 })
  })

  ;['sinyal', 'muat', 'loket', 'bunker'].forEach(function (p) {
    SE.registerPack('kereta-' + p, { items: ITEMS[p], meta: { theme: 'kereta', grade: 2 } })
  })
  SE.defineGame('kereta', {
    'extends': 'default',
    topics: ['matematika', 'logika', 'bentuk', 'umum'],
    weights: { matematika: 60, logika: 20, bentuk: 10, umum: 10 },
    generators: [], themes: ['kereta'], packs: ['kereta-sinyal', 'kereta-muat', 'kereta-loket', 'kereta-bunker'], general: false,
    grade: { mudah: 1, sulit: 2, kelas1: 1, kelas2: 2, adaptif: 2 },
    choices: { easy: 3, normal: 3 },
    pictures: 'sprite',
    maxWords: { 1: 26, 2: 28, 3: 28, 4: 28 },
    scope: 'game'
  })
  W.KeretaQuestions = { items: ITEMS, byPlace: function (p) { return (ITEMS[p] || []).slice() } }
})()
