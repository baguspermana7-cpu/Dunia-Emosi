/* =============================================================================
 * soal-pack-mojo.js — SoalEngine pack 'mojo' + generator 'mojo-world' + the G31 profile 'g31'.
 * Mojo Swoptops draws its word and number content through SoalEngine (SOAL_ENGINE_STANDARD.md):
 *
 *   pack 'mojo'         tool / world vocabulary (Bahasa Indonesia + the English word, PRD §10.2-10.3):
 *                       the "susun huruf" microgame (P-A-L-U / HAMMER) reads its word from here
 *   gen  'mojo-world'   world-action maths (PRD §10.1 "learning changes the world"):
 *                       kind 'collect'  need N, have M -> collect N - M more (bolts, water drops)
 *                       kind 'height'   a counting-by-step height scale: 2, 4, ?, 8 -> the balcony mark
 *                       Parameters come from the level through `about` ("need=8 have=5 noun=baut"), so a
 *                       level is authored with numbers while the wording, hints and checks stay here.
 *   profile 'g31'       packs ['mojo'], generators ['mojo-world', 'mat-a'], sprites only, fase A.
 *
 * Load order: soal-engine.js, soal-gen-matematika.js, this file.
 * ==========================================================================*/
(function () {
  'use strict'
  var W = (typeof window !== 'undefined' ? window : globalThis)
  var SE = W.SoalEngine
  if (!SE) return

  // [word (ID), English, tool id, sprite key, what it is for]
  var WORDS = [
    ['PALU', 'HAMMER', 'palu', 'mojo:palu', 'memukul paku'],
    ['OBENG', 'SCREWDRIVER', 'obeng', 'mojo:obeng', 'memutar sekrup'],
    ['KUNCI', 'WRENCH', 'kunci', 'mojo:kunci', 'memutar baut'],
    ['TANGGA', 'LADDER', 'tangga', 'game/ladder', 'naik ke atas'],
    ['TALI', 'ROPE', 'tali', 'mojo:tali', 'menarik'],
    ['RODA', 'WHEEL', 'roda', 'gt/part-tire', 'berputar'],
    ['AIR', 'WATER', 'air', 'mojo:tetes', 'memadamkan api'],
    ['API', 'FIRE', 'api', 'gt/fx-fire', 'panas'],
    ['BATU', 'ROCK', 'batu', 'gt/rock', 'menghalangi jalan'],
    ['BAUT', 'BOLT', 'baut', 'mojo:baut', 'menguatkan pagar']
  ]
  // a deterministic scramble that is never the word itself
  function scramble (w, salt) {
    var a = w.split(''), n = a.length, s = salt | 0
    for (var i = n - 1; i > 0; i--) { s = (s * 1103515245 + 12345) & 0x7fffffff; var j = s % (i + 1), t = a[i]; a[i] = a[j]; a[j] = t }
    var out = a.join('')
    if (out === w) out = w.slice(1) + w.charAt(0)
    return out
  }
  function wrongs (w) {
    var o = [], k = 1
    while (o.length < 2 && k < 40) { var s = scramble(w, k * 7 + w.length); if (s !== w && o.indexOf(s) < 0) o.push(s); k++ }
    return o
  }
  var ITEMS = []
  WORDS.forEach(function (x, i) {
    ;[['id', x[0]], ['en', x[1]]].forEach(function (l) {
      var word = l[1]
      ITEMS.push({
        id: 'mojo-' + l[0] + '-' + x[2], topic: 'bahasa', grade: word.length > 6 ? 2 : 1, level: word.length > 5 ? 2 : 1,
        prompt: l[0] === 'en' ? 'Susun huruf. Apa nama alat ini dalam bahasa Inggris?' : 'Susun huruf. Apa nama alat ini?',
        choices: [word].concat(wrongs(word)), answer: word,
        letters: word.split(''), scramble: scramble(word, i + 3), word: word, lang: l[0], tool: x[2], pair: l[0] === 'en' ? x[0] : x[1],
        use: x[4], pic: x[3], kind: 'susun', easy: true,
        hint1: 'Huruf pertama: ' + word.charAt(0) + '.', explain: word + (l[0] === 'en' ? ' = ' + x[0] : ' dipakai untuk ' + x[4]) + '.'
      })
    })
  })
  SE.registerPack('mojo', { items: function () { return ITEMS }, meta: { theme: 'mojo', grade: 1 } })

  /* ── pack 'mojo-learn': "Belajar Bersama Mojo" (owner 2026-10-01: an activity, not a flashcard) ──
     [word (ID), English, tool id, tool picture, what it does, job word, job picture]. Only words a
     grade 1-2 child can spell (3-6 letters); 6-letter words start with their first letter filled in. */
  var LEARN = [
    ['PALU', 'HAMMER', 'palu', 'mojo-prop/hammer', 'memukul paku', 'PAKU', 'mojo:paku'],
    ['KUNCI', 'WRENCH', 'kunci', 'mojo-prop/wrench', 'memutar baut', 'BAUT', 'mojo-prop/bolt'],
    ['BOR', 'DRILL', 'bor', 'mojo-prop/drill', 'melubangi kayu', 'KAYU', 'mojo-prop/logs'],
    ['RODA', 'WHEEL', 'roda', 'gt/part-tire', 'berputar di jalan', 'JALAN', 'mojo-tile/road'],
    ['AIR', 'WATER', 'air', 'mojo-prop/waterdrop-sheet15', 'memadamkan api', 'API', 'mojo-tile/fire'],
    ['MAGNET', 'MAGNET', 'magnet', 'mojo-prop/magnet', 'menarik besi', 'GIR', 'mojo-prop/gear'],
    ['TANGGA', 'LADDER', 'tangga', 'game/ladder', 'naik ke tempat tinggi', 'LAMPU', 'mojo-prop/lamp-post']
  ]
  var LEARN_ITEMS = []
  LEARN.forEach(function (x, i) {
    ;[['id', x[0]], ['en', x[1]]].forEach(function (l) {
      var word = l[1], item = {
        id: 'mlearn-' + l[0] + '-' + x[2], topic: 'bahasa', grade: 1, level: word.length > 5 ? 2 : 1, theme: ['mojo'],
        prompt: l[0] === 'en' ? 'Susun nama alat ini dalam bahasa Inggris.' : 'Susun nama alat ini.',
        choices: [word].concat(wrongs(word)), answer: word, word: word, letters: word.split(''), lang: l[0],
        prefill: word.length >= 6 ? 1 : 0, tool: x[2], pic: x[3], meaning: x[0], english: x[1], use: x[4],
        job: x[5], jobPic: x[6], kind: 'kosakata', easy: true,
        hint1: 'Huruf pertama: ' + word.charAt(0) + '.', explain: x[0] + ' (' + x[1] + ') dipakai untuk ' + x[4] + '.'
      }
      item[l[0] === 'en' ? 'wordEn' : 'wordId'] = true
      LEARN_ITEMS.push(item)
    })
  })
  SE.registerPack('mojo-learn', { items: function () { return LEARN_ITEMS }, meta: { theme: 'mojo', grade: 1 } })
  function shuffleWith (a, r) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t } return a }
  function seeded (seed) { var s = seed | 0; return function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff } }
  var ABC = 'ABCDEFGHIJKLMNOPRSTUW'
  // one Belajar session: 5 rounds that rotate the four activities; the words come from SoalEngine
  // (profile g31, context 'learn') with the per-avatar no-repeat history.
  var ROUNDS = ['susun', 'pasang', 'gambar', 'awal', 'susun']
  function lesson (opts) {
    opts = opts || {}
    var lang = opts.lang === 'id' ? 'id' : 'en', seed = opts.seed != null ? opts.seed : (Date.now() & 0x7fffffff), r = seeded(seed + 11)
    var picks = SE.pick({ game: 'g31', context: 'learn', count: ROUNDS.length, avatar: opts.avatar, seed: seed, history: opts.history,
      without: [lang === 'en' ? 'wordId' : 'wordEn'] })
    var pool = LEARN_ITEMS.filter(function (q) { return q.lang === lang })
    return picks.map(function (q, i) {
      var kind = ROUNDS[i % ROUNDS.length], others = shuffleWith(pool.filter(function (o) { return o.tool !== q.tool }), r).slice(0, 2)
      var round = { kind: kind, id: q.id, word: q.word, lang: lang, tool: q.tool, pic: q.pic, meaning: q.meaning, english: q.english, use: q.use, job: q.job, jobPic: q.jobPic }
      if (kind === 'susun') {
        round.prefill = q.prefill; round.slots = q.letters.slice()
        var rest = q.letters.slice(q.prefill), tiles = shuffleWith(rest, r)
        if (rest.length > 1 && tiles.join('') === rest.join('')) tiles = tiles.slice(1).concat(tiles[0])
        round.tiles = tiles
      } else if (kind === 'pasang') {
        round.options = shuffleWith([{ pic: q.jobPic, label: q.job, ok: true }].concat(others.map(function (o) { return { pic: o.jobPic, label: o.job, ok: false } })), r)
      } else if (kind === 'gambar') {
        round.options = shuffleWith([{ pic: q.pic, label: q.word, ok: true }].concat(others.map(function (o) { return { pic: o.pic, label: o.word, ok: false } })), r)
      } else {
        var first = q.word.charAt(0), wrong = shuffleWith(ABC.split('').filter(function (c) { return c !== first }), r).slice(0, 2)
        round.options = shuffleWith([{ label: first, ok: true }].concat(wrong.map(function (c) { return { label: c, ok: false } })), r)
      }
      return round
    })
  }

  /* ── world-action maths ───────────────────────────────────────────────── */
  function params (about) {
    var o = {}
    String(about || '').split(/\s+/).forEach(function (t) { var m = /^([a-z]+)=(.+)$/.exec(t); if (m) o[m[1]] = /^\d+$/.test(m[2]) ? +m[2] : m[2].replace(/_/g, ' ') })
    return o
  }
  function uniq (a) { var s = {}, o = []; a.forEach(function (v) { if (v >= 0 && !s[v]) { s[v] = 1; o.push(v) } }); return o }
  function world (grade, r, theme, o) {
    var p = params(o && o.about), kind = (o && o.kind) || p.kind || (r() < 0.5 ? 'collect' : 'height')
    function ri (a, b) { return a + Math.floor(r() * (b - a + 1)) }
    if (kind === 'height') {
      var s = p.step || (r() < 0.5 ? 1 : 2), t = p.target || s * ri(2, 3), marks = []
      for (var i = 1; i <= 4; i++) marks.push(s * i)
      if (marks.indexOf(t) < 0) { marks = []; for (var k = t - 2 * s; k <= t + s; k += s) marks.push(k) }
      var ch = uniq([t, t - 1, t + 1, t + s]).slice(0, 3)
      return {
        id: 'mw-height-' + s + '-' + t, topic: 'matematika', grade: 1, level: s === 1 ? 1 : 2, kind: 'height',
        prompt: 'Hitung lompat ' + s + ': ' + marks.map(function (m) { return m === t ? '?' : m }).join(', ') + '. Tanda mana untuk ' + (p.who || 'teman kita') + '?',
        choices: ch.map(String), answer: String(t), marks: marks, step: s, target: t,
        hint1: 'Tiap tanda naik ' + s + '.', hint2: (t - s) + ' tambah ' + s + ' = ?', explain: (t - s) + ' + ' + s + ' = ' + t + '.',
        calc: { op: 'height', s: s, t: t }, easy: true, scene: { mode: 'none', groups: [] }, theme: ['mojo']
      }
    }
    var need = p.need || ri(4, 8), have = p.have != null ? p.have : ri(1, need - 1), miss = need - have, noun = p.noun || 'baut'
    return {
      id: 'mw-collect-' + need + '-' + have, topic: 'matematika', grade: 1, level: need > 10 ? 2 : 1, kind: 'collect',
      prompt: 'Perlu ' + need + ' ' + noun + '. Sudah ada ' + have + '. Kurang berapa?',
      choices: uniq([miss, miss + 1, miss - 1 > 0 ? miss - 1 : miss + 2, need]).slice(0, 3).map(String), answer: String(miss),
      need: need, have: have, miss: miss, noun: noun,
      hint1: 'Hitung maju dari ' + have + ' sampai ' + need + '.', hint2: need + ' dikurangi ' + have + '.',
      explain: have + ' + ' + miss + ' = ' + need + '. Kumpulkan ' + miss + ' ' + noun + ' lagi!',
      calc: { op: 'collect', need: need, have: have }, easy: true, scene: { mode: 'none', groups: [] }, theme: ['mojo']
    }
  }
  SE.registerGenerator('matematika', world, {
    id: 'mojo-world', grades: [1, 2], general: false, weight: 1,
    validate: function (q) {
      var c = q.calc || {}
      if (c.op === 'collect') return String(c.need - c.have) === q.answer ? [] : ['collect answer']
      if (c.op === 'height') return String(c.t) === q.answer && c.t % c.s === 0 ? [] : ['height answer']
      return ['calc']
    }
  })

  SE.defineGame('g31', {
    'extends': 'default',
    topics: ['matematika', 'bahasa'],
    weights: { matematika: 60, bahasa: 40 },
    themes: ['mojo'],
    packs: ['mojo'],
    general: false,
    generators: ['mojo-world', 'mat-a'],
    grade: { mudah: 2, sulit: 2, kelas1: 1, kelas2: 2 },
    choices: { easy: 3, normal: 3 },
    pictures: 'sprite',
    nouns: { _: [['mojo:baut', 'baut'], ['mojo:tetes', 'tetes air'], ['game/gear', 'gir'], ['gt/part-tire', 'ban']] },
    vocab: { place: 'bengkel', deck: 'bengkel', load: 'datang', unload: 'dipakai', carrier: 'Mojo', box: 'kotak alat', crate: 'kotak', seat: 'Mojo', rope: 'Tali', cheer: '' },
    maxWords: { 1: 16, 2: 16, 3: 18, 4: 18 },
    stopWords: ['mojo', 'bo'],
    scope: 'game',
    contexts: {
      // "susun huruf" at a toolbox: only the pack's own words
      susun: { topics: ['bahasa'], weights: { bahasa: 100 } },
      // world-action maths (collect / height): only the world generator
      world: { topics: ['matematika'], weights: { matematika: 100 }, generators: ['mojo-world'] },
      // Belajar Bersama Mojo: only the learn pack (3-6 letter tool words with a job picture)
      learn: { topics: ['bahasa'], weights: { bahasa: 100 }, packs: ['mojo-learn'] }
    }
  })

  // the level-facing helpers: the game asks for a word or a world-maths card; SoalEngine owns the content
  W.MojoSoal = {
    word: function (tool, lang) {
      var id = 'mojo-' + (lang === 'en' ? 'en' : 'id') + '-' + tool
      var all = SE.items('mojo')
      for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i]
      return null
    },
    world: function (kind, about) {
      return SE.generate('matematika', { game: 'g31', context: 'world', generator: 'mojo-world', kind: kind, about: about, seed: 7 })
    },
    words: WORDS.map(function (x) { return { id: x[0], en: x[1], tool: x[2] } }),
    lesson: lesson, ROUNDS: ROUNDS.slice(), learnItems: function () { return LEARN_ITEMS.slice() }
  }
})()
