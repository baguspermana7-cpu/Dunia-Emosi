/**
 * berhitung-engine.js — the domain half of "Ayo Berhitung!".
 *
 * Framework-free and UI-free on purpose (PRD §13, §19): every arithmetic fact,
 * every constraint check, every hint and every mastery number is decided here,
 * and the page only renders what this returns. Nothing in the UI recomputes an
 * answer, so an answer can never disagree with itself.
 *
 * Determinism is the spine of the whole thing. A worksheet is (generatorVersion,
 * seed, config); given those three, `buildSession()` returns the same questions
 * in the same order on any device, after any reload, offline. That is what makes
 * "Ulangi Halaman" and printing an answer key honest -- the child re-does the
 * page they saw, not a new page that looks similar.
 *
 * Integers only. No floating point touches a graded value (PRD §15), so no
 * question can be marked wrong because 0.1 + 0.2 is not 0.3.
 *
 * Loads as a classic script (window.Berhitung) and as a node module, so
 * tools/test-berhitung-engine.mjs can property-test the same code the child runs.
 */
;(function (root, factory) {
  var api = factory()
  if (typeof module === 'object' && module.exports) module.exports = api
  if (root) root.Berhitung = api
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict'

  var GENERATOR_VERSION = 1
  var SCHEMA_VERSION = 1

  // ── seeded PRNG ───────────────────────────────────────────────────────────
  // mulberry32 over a string hash. Small, fast, and reproducible across engines
  // -- Math.random() could not give the same worksheet twice.
  function hashSeed (str) {
    var h = 2166136261 >>> 0
    str = String(str)
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i)
      h = Math.imul(h, 16777619) >>> 0
    }
    return h >>> 0
  }

  function rng (seed) {
    var a = hashSeed(seed)
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0
      var t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  function randInt (rand, lo, hi) { return lo + Math.floor(rand() * (hi - lo + 1)) }
  function pick (rand, arr) { return arr[randInt(rand, 0, arr.length - 1)] }

  // ── digits + column analysis ──────────────────────────────────────────────
  function digits (n) {
    var out = []
    n = Math.abs(n)
    if (n === 0) return [0]
    while (n > 0) { out.push(n % 10); n = Math.floor(n / 10) }
    return out            // least-significant first
  }

  /** Which columns carry when a+b is added the way it is taught. */
  function carryColumns (a, b) {
    var A = digits(a), B = digits(b), carry = 0, cols = []
    var n = Math.max(A.length, B.length)
    for (var i = 0; i < n; i++) {
      var s = (A[i] || 0) + (B[i] || 0) + carry
      if (s > 9) { cols.push(i); carry = 1 } else carry = 0
    }
    return cols
  }

  /** Which columns borrow when b is subtracted from a, column by column. */
  function borrowColumns (a, b) {
    var A = digits(a), B = digits(b), borrow = 0, cols = []
    for (var i = 0; i < A.length; i++) {
      var d = (A[i] || 0) - (B[i] || 0) - borrow
      if (d < 0) { cols.push(i); borrow = 1 } else borrow = 0
    }
    return cols
  }

  // ── constraints ───────────────────────────────────────────────────────────
  var DIFFICULTY = {
    easy:   { add: [0, 99],    sub: [0, 99],    mulTables: [2, 3, 4, 5, 10], divMax: 5,  operands: 2 },
    medium: { add: [10, 999],  sub: [10, 999],  mulTables: [2, 3, 4, 5, 6, 7, 8, 9, 10], divMax: 10, operands: 2 },
    hard:   { add: [100, 9999], sub: [100, 9999], mulTables: [6, 7, 8, 9, 11, 12], divMax: 12, operands: 3 }
  }

  var OPERATIONS = ['add', 'subtract', 'multiply', 'divide', 'word', 'mixed']

  /**
   * Validate before generating, never during (PRD §15 "impossible constraints").
   * Returns {ok:true} or {ok:false, reason} -- the caller shows the reason and
   * changes nothing silently, because a silent fallback would quietly teach a
   * different skill than the parent chose.
   */
  function validateConfig (cfg) {
    if (!cfg || OPERATIONS.indexOf(cfg.operation) < 0) return { ok: false, reason: 'operasi tidak dikenal' }
    if (!DIFFICULTY[cfg.difficulty]) return { ok: false, reason: 'tingkat tidak dikenal' }
    var n = cfg.questionCount
    if (!(n >= 1 && n <= 100)) return { ok: false, reason: 'jumlah soal harus 1–100' }
    if (cfg.operation === 'add' && cfg.carryPolicy === 'none' && cfg.difficulty === 'hard' && n > 40) {
      // 4-digit additions with no carry at all in any column are a small pool;
      // asking for more than it holds would loop forever or start repeating.
      return { ok: false, reason: 'terlalu banyak soal tanpa menyimpan pada tingkat sulit' }
    }
    if (cfg.operation === 'multiply' && Array.isArray(cfg.tables) && cfg.tables.length === 0) {
      return { ok: false, reason: 'pilih minimal satu tabel perkalian' }
    }
    return { ok: true }
  }

  // ── generators ────────────────────────────────────────────────────────────
  // Each returns a question or null. Null means "this draw did not satisfy the
  // constraints"; the caller retries a bounded number of times and then fails
  // loudly rather than quietly relaxing the rule.

  function genAdd (rand, cfg) {
    var d = DIFFICULTY[cfg.difficulty]
    var count = cfg.operandCount || (cfg.difficulty === 'hard' && rand() < 0.25 ? 3 : 2)
    var ops = []
    for (var i = 0; i < count; i++) ops.push(randInt(rand, d.add[0], d.add[1]))
    var sum = ops.reduce(function (a, b) { return a + b }, 0)
    var carries = count === 2 ? carryColumns(ops[0], ops[1]) : []
    if (cfg.carryPolicy === 'none' && count === 2 && carries.length) return null
    if (cfg.carryPolicy === 'one' && count === 2 && carries.length !== 1) return null
    if (cfg.carryPolicy === 'many' && count === 2 && carries.length < 2) return null
    if (cfg.maxResult && sum > cfg.maxResult) return null
    return question('add', ops, sum, cfg, { carries: carries })
  }

  function genSubtract (rand, cfg) {
    var d = DIFFICULTY[cfg.difficulty]
    var a = randInt(rand, d.sub[0], d.sub[1])
    var b = randInt(rand, d.sub[0], d.sub[1])
    if (b > a) { var t = a; a = b; b = t }        // default policy: never negative
    if (cfg.allowNegative && rand() < 0.2) { var s = a; a = b; b = s }
    var borrows = borrowColumns(Math.max(a, b), Math.min(a, b))
    if (cfg.borrowPolicy === 'none' && borrows.length) return null
    if (cfg.borrowPolicy === 'one' && borrows.length !== 1) return null
    if (cfg.borrowPolicy === 'many' && borrows.length < 2) return null
    return question('subtract', [a, b], a - b, cfg, { borrows: borrows })
  }

  function genMultiply (rand, cfg) {
    var d = DIFFICULTY[cfg.difficulty]
    var tables = (cfg.tables && cfg.tables.length) ? cfg.tables : d.mulTables
    var table = pick(rand, tables)
    var other = cfg.difficulty === 'hard' && rand() < 0.35
      ? randInt(rand, 11, 99)                       // multi-digit x single table
      : randInt(rand, 2, 12)
    return question('multiply', [table, other], table * other, cfg, { table: table })
  }

  function genDivide (rand, cfg) {
    var d = DIFFICULTY[cfg.difficulty]
    // Built from the answer outwards: dividend = divisor x quotient. Generating
    // a dividend first and hoping it divides is how remainders and divide-by-
    // zero sneak in (PRD §5, §15).
    var divisor = randInt(rand, 2, d.divMax)
    var quotient = randInt(rand, 2, cfg.difficulty === 'hard' ? 24 : 12)
    var dividend = divisor * quotient
    if (divisor === 0) throw new Error('invariant: divisor is zero')
    return question('divide', [dividend, divisor], quotient, cfg, { table: divisor })
  }

  // Curated word problems. Prose and answer come from ONE structured object, so
  // the sentence can never describe a different sum than the one being graded.
  var WORD_TEMPLATES = [
    { id: 'kelereng', op: 'add', a: [5, 40], b: [3, 30],
      text: function (a, b) { return 'Andi punya ' + a + ' kelereng. Ia diberi ' + b + ' kelereng lagi oleh kakaknya. Berapa kelereng Andi sekarang?' },
      unit: 'kelereng' },
    { id: 'kue', op: 'subtract', a: [12, 60], b: [3, 11],
      text: function (a, b) { return 'Ibu membuat ' + a + ' kue. ' + b + ' kue dimakan keluarga. Berapa kue yang tersisa?' },
      unit: 'kue' },
    { id: 'gerbong', op: 'multiply', a: [2, 9], b: [2, 10],
      text: function (a, b) { return 'Satu kereta punya ' + a + ' gerbong. Ada ' + b + ' kereta di stasiun. Berapa jumlah gerbong semuanya?' },
      unit: 'gerbong' },
    { id: 'permen', op: 'divide', a: [2, 9], b: [2, 10],
      text: function (a, b) { return 'Ada ' + (a * b) + ' permen dibagi rata untuk ' + a + ' anak. Berapa permen untuk tiap anak?' },
      unit: 'permen' },
    { id: 'buku', op: 'add', a: [8, 45], b: [6, 40],
      text: function (a, b) { return 'Rak pertama berisi ' + a + ' buku, rak kedua berisi ' + b + ' buku. Berapa buku seluruhnya?' },
      unit: 'buku' },
    { id: 'ayam', op: 'subtract', a: [20, 90], b: [5, 19],
      text: function (a, b) { return 'Di kandang ada ' + a + ' ayam. ' + b + ' ayam dijual. Berapa ayam yang masih ada?' },
      unit: 'ayam' }
  ]

  function genWord (rand, cfg) {
    var t = pick(rand, WORD_TEMPLATES)
    var a = randInt(rand, t.a[0], t.a[1])
    var b = randInt(rand, t.b[0], t.b[1])
    var expected, operands
    if (t.op === 'add') { operands = [a, b]; expected = a + b }
    else if (t.op === 'subtract') { if (b >= a) return null; operands = [a, b]; expected = a - b }
    else if (t.op === 'multiply') { operands = [a, b]; expected = a * b }
    else { operands = [a * b, a]; expected = b }          // divide: built from the answer
    var q = question('word', operands, expected, cfg, { templateId: t.id, unit: t.unit, innerOp: t.op })
    q.prompt = t.text(a, b)
    return q
  }

  var GENERATORS = { add: genAdd, subtract: genSubtract, multiply: genMultiply, divide: genDivide, word: genWord }

  function question (operation, operands, expected, cfg, metadata) {
    if (!Number.isInteger(expected)) throw new Error('invariant: non-integer answer')
    return {
      id: '',
      signature: operation + ':' + operands.join(','),
      generatorVersion: GENERATOR_VERSION,
      operation: operation,
      operands: operands.slice(),
      expected: expected,
      difficulty: cfg.difficulty,
      metadata: metadata || {}
    }
  }

  /**
   * Build the whole question set up front. Bounded retries per slot: if the
   * constraints are so tight that a slot cannot be filled, throw instead of
   * looping forever or relaxing the rule behind the parent's back.
   */
  function buildSession (cfg) {
    var v = validateConfig(cfg)
    if (!v.ok) throw new Error('config: ' + v.reason)
    var seed = cfg.seed || String(Date.now())
    var rand = rng(seed + '|' + cfg.operation + '|' + cfg.difficulty + '|v' + GENERATOR_VERSION)
    var seen = Object.create(null)
    var out = []
    var MAX_TRIES = 400

    while (out.length < cfg.questionCount) {
      var op = cfg.operation === 'mixed'
        ? pick(rand, ['add', 'subtract', 'multiply', 'divide'])
        : cfg.operation
      var q = null
      for (var t = 0; t < MAX_TRIES && !q; t++) {
        var cand = GENERATORS[op](rand, cfg)
        if (!cand) continue
        if (seen[cand.signature]) { cand = null; continue }   // no duplicates in a set
        q = cand
      }
      if (!q) throw new Error('tidak bisa membuat soal dengan batasan ini')
      seen[q.signature] = true
      q.id = 'q' + (out.length + 1) + '-' + hashSeed(q.signature + seed).toString(36)
      out.push(q)
    }
    return {
      id: 's-' + hashSeed(seed + cfg.operation + cfg.questionCount).toString(36),
      seed: seed,
      generatorVersion: GENERATOR_VERSION,
      schemaVersion: SCHEMA_VERSION,
      operation: cfg.operation,
      difficulty: cfg.difficulty,
      mode: cfg.mode || 'focus',
      questionCount: cfg.questionCount,
      constraints: cfg,
      questions: out,
      currentIndex: 0,
      status: 'active'
    }
  }

  // ── answer parsing ────────────────────────────────────────────────────────
  // Empty is NOT zero, and "1e3" is not 1000 (PRD §6, §15). Both of those
  // defaults would mark a child right or wrong for the wrong reason.
  function parseAnswer (raw) {
    if (raw == null) return { ok: false, empty: true, value: null }
    var s = String(raw).trim()
    if (s === '') return { ok: false, empty: true, value: null }
    if (!/^-?\d+$/.test(s)) return { ok: false, empty: false, value: null, reason: 'hanya angka bulat' }
    var n = parseInt(s, 10)
    if (!Number.isSafeInteger(n)) return { ok: false, empty: false, value: null, reason: 'angka terlalu besar' }
    return { ok: true, empty: false, value: n }
  }

  function grade (q, raw) {
    var p = parseAnswer(raw)
    if (!p.ok) return { correct: false, parsed: p }
    return { correct: p.value === q.expected, parsed: p }
  }

  // ── hint engine ───────────────────────────────────────────────────────────
  // Rule-based escalation: point at the column, then name the strategy, then
  // work one step, then show the result. Level 0 never reveals the answer.
  var PLACE = ['satuan', 'puluhan', 'ratusan', 'ribuan', 'puluh ribuan']

  function hint (q, level) {
    var a = q.operands[0], b = q.operands[1]
    var L = Math.max(0, Math.min(3, level | 0))
    if (q.operation === 'add') {
      var carries = q.metadata.carries || []
      if (L === 0) return 'Mulai dari kolom ' + PLACE[0] + '. Jumlahkan angka paling kanan dulu.'
      if (L === 1) return carries.length
        ? 'Ada yang harus disimpan. Kalau hasil satu kolom lebih dari 9, tulis satuannya dan simpan 1 ke kolom ' + PLACE[(carries[0] + 1)] + '.'
        : 'Tidak ada yang perlu disimpan di soal ini. Jumlahkan kolom demi kolom.'
      if (L === 2) return 'Kolom ' + PLACE[0] + ': ' + (digits(a)[0] || 0) + ' + ' + (digits(b)[0] || 0) + ' = ' + ((digits(a)[0] || 0) + (digits(b)[0] || 0)) + '.'
      return a + ' + ' + b + ' = ' + q.expected + '.'
    }
    if (q.operation === 'subtract') {
      var borrows = q.metadata.borrows || []
      if (L === 0) return 'Mulai dari kolom ' + PLACE[0] + '. Kurangi angka paling kanan dulu.'
      if (L === 1) return borrows.length
        ? 'Kolom ' + PLACE[borrows[0]] + ' kurang besar, jadi pinjam 1 dari kolom ' + PLACE[borrows[0] + 1] + '.'
        : 'Tidak perlu meminjam di soal ini. Kurangi kolom demi kolom.'
      if (L === 2) return 'Coba cek: ' + b + ' + ? = ' + a + '.'
      return a + ' − ' + b + ' = ' + q.expected + '.'
    }
    if (q.operation === 'multiply') {
      if (L === 0) return 'Ingat tabel perkalian ' + (q.metadata.table || a) + '.'
      if (L === 1) return 'Pecah dulu: ' + a + ' × ' + b + ' = ' + a + ' × ' + (b - 1) + ' + ' + a + '.'
      if (L === 2) return a + ' × ' + (b - 1) + ' = ' + (a * (b - 1)) + ', lalu tambah ' + a + '.'
      return a + ' × ' + b + ' = ' + q.expected + '.'
    }
    if (q.operation === 'divide') {
      if (L === 0) return 'Pembagian itu kebalikan perkalian.'
      if (L === 1) return 'Cari angka yang kalau dikali ' + b + ' hasilnya ' + a + '.'
      if (L === 2) return b + ' × ' + (q.expected - 1) + ' = ' + (b * (q.expected - 1)) + ' — masih kurang, coba satu lagi.'
      return a + ' ÷ ' + b + ' = ' + q.expected + '.'
    }
    // word problems: name the operation, then the sum, then the answer
    var inner = q.metadata.innerOp
    if (L === 0) return 'Baca lagi pelan-pelan. Angka mana yang bertambah atau berkurang?'
    if (L === 1) return inner === 'add' ? 'Ini soal penjumlahan.'
      : inner === 'subtract' ? 'Ini soal pengurangan.'
      : inner === 'multiply' ? 'Ini soal perkalian.' : 'Ini soal pembagian.'
    if (L === 2) return 'Hitung: ' + q.operands[0] + (inner === 'add' ? ' + ' : inner === 'subtract' ? ' − ' : inner === 'multiply' ? ' × ' : ' ÷ ') + q.operands[1] + '.'
    return 'Jawabannya ' + q.expected + ' ' + (q.metadata.unit || '') + '.'
  }

  // ── scoring + mastery ─────────────────────────────────────────────────────
  // XP is never deducted and a skip earns nothing, so there is nothing to farm
  // and nothing to fear (PRD §8, §15).
  var XP = { first: 10, retry: 7, assisted: 5, revealed: 0, skipped: 0 }

  function outcomeOf (attempt) {
    if (attempt.skipped) return 'skipped'
    if (attempt.revealed) return 'revealed'
    if (attempt.hintLevel > 0) return 'assisted'
    return attempt.attemptNumber <= 1 ? 'first' : 'retry'
  }

  function xpFor (attempt) { return XP[outcomeOf(attempt)] || 0 }

  var PERFORMANCE = { first: 1.0, retry: 0.7, assisted: 0.5, revealed: 0, skipped: 0 }

  function sessionPerformance (attempts) {
    if (!attempts.length) return 0
    var total = attempts.reduce(function (s, a) { return s + (PERFORMANCE[outcomeOf(a)] || 0) }, 0)
    return total / attempts.length
  }

  /** Capped, smoothed update: one lucky page cannot jump a child to "Mantap". */
  function updateMastery (old, attempts) {
    var perf = sessionPerformance(attempts)
    var next = (old || 0) * 0.80 + perf * 100 * 0.20
    return Math.max(0, Math.min(100, Math.round(next)))
  }

  function masteryLabel (m) { return m >= 80 ? 'Mantap' : m >= 45 ? 'Berkembang' : 'Belajar' }

  /** Promotion is a SUGGESTION, and only on a real sample (PRD §8). */
  function recommendHarder (progress) {
    if (!progress || !progress.recentWindow) return false
    var w = progress.recentWindow.slice(-20)
    if (w.length < 20) return false
    var firstTry = w.filter(function (s) { return s === 'first' }).length
    return firstTry / w.length >= 0.85
  }

  return {
    GENERATOR_VERSION: GENERATOR_VERSION,
    SCHEMA_VERSION: SCHEMA_VERSION,
    OPERATIONS: OPERATIONS,
    DIFFICULTY: DIFFICULTY,
    WORD_TEMPLATES: WORD_TEMPLATES,
    rng: rng,
    digits: digits,
    carryColumns: carryColumns,
    borrowColumns: borrowColumns,
    validateConfig: validateConfig,
    buildSession: buildSession,
    parseAnswer: parseAnswer,
    grade: grade,
    hint: hint,
    xpFor: xpFor,
    outcomeOf: outcomeOf,
    sessionPerformance: sessionPerformance,
    updateMastery: updateMastery,
    masteryLabel: masteryLabel,
    recommendHarder: recommendHarder
  }
})
