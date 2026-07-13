/**
 * Shared math question generator with difficulty + level constraints.
 * Hotfix #112-H (2026-05-01) per user mandate:
 *
 * - **easy** (default for TK / SD kelas 1):
 *   - addition only at L1-4
 *   - addition + subtraction at L5+
 *   - max number 10 at L1-10, 15 at L11-19, 20 only at L >= 0.95 × maxLevel
 *   - NO multiplication
 *   - NO knowledge questions (capital cities etc.)
 *
 * - **medium**:
 *   - addition + subtraction up to 15 (or 20 at L ≥ 0.95 × maxLevel)
 *   - multiplication allowed BUT max factor 5, and only at L >= 15
 *
 * - **hard**:
 *   - addition + subtraction up to 20
 *   - multiplication up to 9 × 9
 *   - knowledge questions (capital cities, science, etc.) allowed
 *
 * Usage from any game:
 *   const q = window.makeMathQuestion(currentLevel, maxLevel, 'easy')
 *   // q.q = '6 + 3 = ?'
 *   // q.ans = 9
 *   // q.choices = [9, 8, 7, 12]  (shuffled)
 */
(function () {
  'use strict';

  function _randInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
  function _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function makeMathQuestion(level, maxLevel, difficulty) {
    const lv = Math.max(1, parseInt(level) || 1);
    const ml = Math.max(1, parseInt(maxLevel) || 20);
    const diff = (difficulty || 'easy').toLowerCase();
    const isLate = lv >= Math.ceil(0.95 * ml);

    // Pick allowed operations based on difficulty + level
    let ops;
    let maxAdd, maxSub, maxMul;
    if (diff === 'hard') {
      ops = ['+', '-', '*'];
      maxAdd = 20; maxSub = 20; maxMul = 9;
    } else if (diff === 'medium') {
      ops = ['+', '-'];
      if (lv >= 15) ops.push('*');
      maxAdd = isLate ? 20 : 15;
      maxSub = isLate ? 20 : 15;
      maxMul = 5;
    } else {
      // easy
      ops = ['+'];
      if (lv >= 5) ops.push('-');
      maxAdd = isLate ? 20 : (lv >= 11 ? 15 : 10);
      maxSub = maxAdd;
      maxMul = 0; // no multiplication in easy
    }

    const op = ops[Math.floor(Math.random() * ops.length)];
    let q, ans;
    if (op === '+') {
      const a = _randInt(1, maxAdd);
      const bMax = Math.max(1, maxAdd - a); // sum capped at maxAdd
      const b = _randInt(1, Math.max(1, bMax));
      ans = a + b;
      q = `${a} + ${b} = ?`;
    } else if (op === '-') {
      const a = _randInt(2, maxSub);
      const b = _randInt(1, a);
      ans = a - b;
      q = `${a} - ${b} = ?`;
    } else if (op === '*') {
      const a = _randInt(2, maxMul);
      const b = _randInt(2, maxMul);
      ans = a * b;
      q = `${a} × ${b} = ?`;
    } else {
      // fallback
      const a = _randInt(1, 10), b = _randInt(1, 10);
      ans = a + b;
      q = `${a} + ${b} = ?`;
    }

    // Generate 3 wrong choices near the answer
    const wrongs = new Set();
    let safety = 0;
    while (wrongs.size < 3 && safety++ < 20) {
      const off = _randInt(-3, 3) || (Math.random() < 0.5 ? 1 : -1);
      const w = Math.max(0, ans + off);
      if (w !== ans) wrongs.add(w);
    }
    // Pad with external counter, NOT wrongs.size, so loop always advances
    // even when candidate is a duplicate. Hard cap 100 as defensive guard.
    // Same bug as g23-question-engine.js _wrongs (fixed 2026-05-04 410597c).
    let pad = 1;
    while (wrongs.size < 3 && pad < 100) {
      const v = ans + pad;
      if (v !== ans && v >= 0) wrongs.add(v);
      pad++;
    }
    const choices = _shuffle([ans, ...wrongs]);
    return { q, ans, choices, op, level: lv, difficulty: diff };
  }

  // Knowledge questions for HARD mode only.
  // Hotfix #114 (2026-05-01): expanded from 6 → 36 entries across 5 categories
  // — geography (provinsi/ibu kota/pulau), calendar/time, basic science,
  // language (huruf/angka), and Pokemon trivia (kid-friendly hard mode).
  const KNOWLEDGE_BANK = [
    // ── Geography (Indonesia) ──
    { q: 'Ibu kota Jawa Barat?', ans: 'Bandung', choices: ['Bandung', 'Bogor', 'Bekasi', 'Cirebon'] },
    { q: 'Ibu kota Indonesia?', ans: 'Jakarta', choices: ['Jakarta', 'Surabaya', 'Bandung', 'Medan'] },
    { q: 'Ibu kota Jawa Timur?', ans: 'Surabaya', choices: ['Surabaya', 'Malang', 'Madiun', 'Kediri'] },
    { q: 'Ibu kota Jawa Tengah?', ans: 'Semarang', choices: ['Semarang', 'Solo', 'Magelang', 'Salatiga'] },
    { q: 'Ibu kota Bali?', ans: 'Denpasar', choices: ['Denpasar', 'Ubud', 'Kuta', 'Sanur'] },
    { q: 'Ibu kota Yogyakarta?', ans: 'Yogyakarta', choices: ['Yogyakarta', 'Sleman', 'Bantul', 'Solo'] },
    { q: 'Ibu kota Sumatera Barat?', ans: 'Padang', choices: ['Padang', 'Bukittinggi', 'Pekanbaru', 'Medan'] },
    { q: 'Pulau terbesar di Indonesia?', ans: 'Sumatera', choices: ['Sumatera', 'Jawa', 'Kalimantan', 'Papua'] },
    { q: 'Pulau dewata Indonesia?', ans: 'Bali', choices: ['Bali', 'Lombok', 'Sumba', 'Flores'] },
    { q: 'Gunung tertinggi di Indonesia?', ans: 'Puncak Jaya', choices: ['Puncak Jaya', 'Semeru', 'Merapi', 'Kerinci'] },

    // ── Calendar / Time ──
    { q: 'Berapa hari dalam seminggu?', ans: '7', choices: ['7', '5', '6', '8'] },
    { q: 'Berapa bulan dalam setahun?', ans: '12', choices: ['12', '10', '11', '13'] },
    { q: 'Berapa jam dalam sehari?', ans: '24', choices: ['24', '12', '20', '36'] },
    { q: 'Berapa menit dalam satu jam?', ans: '60', choices: ['60', '50', '100', '30'] },
    { q: 'Berapa detik dalam satu menit?', ans: '60', choices: ['60', '30', '45', '100'] },
    { q: 'Berapa hari di bulan Februari (tahun biasa)?', ans: '28', choices: ['28', '29', '30', '31'] },
    { q: 'Bulan ke-1 dalam setahun?', ans: 'Januari', choices: ['Januari', 'Februari', 'Maret', 'Desember'] },
    { q: 'Bulan ke-12 dalam setahun?', ans: 'Desember', choices: ['Desember', 'November', 'Oktober', 'Januari'] },
    { q: 'Hari setelah Senin?', ans: 'Selasa', choices: ['Selasa', 'Rabu', 'Minggu', 'Sabtu'] },

    // ── Basic Science ──
    { q: 'Hewan terbesar di dunia?', ans: 'Paus Biru', choices: ['Paus Biru', 'Gajah', 'Jerapah', 'Hiu'] },
    { q: 'Planet terdekat dengan matahari?', ans: 'Merkurius', choices: ['Merkurius', 'Venus', 'Bumi', 'Mars'] },
    { q: 'Planet kita disebut?', ans: 'Bumi', choices: ['Bumi', 'Mars', 'Venus', 'Saturnus'] },
    { q: 'Warna daun?', ans: 'Hijau', choices: ['Hijau', 'Biru', 'Merah', 'Kuning'] },
    { q: 'Bintang terdekat dengan Bumi?', ans: 'Matahari', choices: ['Matahari', 'Bulan', 'Polaris', 'Mars'] },
    { q: 'Air membeku jadi?', ans: 'Es', choices: ['Es', 'Uap', 'Awan', 'Embun'] },
    { q: 'Hewan yang bisa terbang?', ans: 'Burung', choices: ['Burung', 'Kucing', 'Anjing', 'Ikan'] },

    // ── Language / Counting ──
    { q: 'Berapa huruf vokal dalam bahasa Indonesia?', ans: '5', choices: ['5', '4', '6', '7'] },
    { q: 'Huruf vokal pertama?', ans: 'A', choices: ['A', 'B', 'E', 'I'] },
    { q: '"Kucing" diawali huruf?', ans: 'K', choices: ['K', 'C', 'U', 'I'] },
    { q: 'Lawan kata "besar"?', ans: 'Kecil', choices: ['Kecil', 'Tinggi', 'Lebar', 'Tebal'] },
    { q: 'Lawan kata "panas"?', ans: 'Dingin', choices: ['Dingin', 'Sejuk', 'Hangat', 'Gerah'] },

    // ── Pokemon trivia (kid-friendly) ──
    { q: 'Pokemon kuning yang punya pipi merah?', ans: 'Pikachu', choices: ['Pikachu', 'Bulbasaur', 'Charmander', 'Squirtle'] },
    { q: 'Pokemon api starter Kanto?', ans: 'Charmander', choices: ['Charmander', 'Bulbasaur', 'Squirtle', 'Pikachu'] },
    { q: 'Pokemon air starter Kanto?', ans: 'Squirtle', choices: ['Squirtle', 'Bulbasaur', 'Charmander', 'Pikachu'] },
    { q: 'Pokemon rumput starter Kanto?', ans: 'Bulbasaur', choices: ['Bulbasaur', 'Charmander', 'Squirtle', 'Pikachu'] },
    { q: 'Tipe Pikachu?', ans: 'Listrik', choices: ['Listrik', 'Api', 'Air', 'Rumput'] },
  ];

  function makeKnowledgeQuestion() {
    const k = KNOWLEDGE_BANK[Math.floor(Math.random() * KNOWLEDGE_BANK.length)];
    return {
      q: k.q,
      ans: k.ans,
      choices: _shuffle([...k.choices]),
      op: 'knowledge',
    };
  }

  // Composite generator: hard mode mixes math + knowledge ~30% chance.
  function makeQuestion(level, maxLevel, difficulty) {
    if ((difficulty || 'easy').toLowerCase() === 'hard' && Math.random() < 0.3) {
      return makeKnowledgeQuestion();
    }
    return makeMathQuestion(level, maxLevel, difficulty);
  }

  // ─────────────────────────────────────────────────────────────────────
  // V2 generator (2026-06-21, owner G25 Kuis Matematika spec):
  //   - max number 30 at level > 20 (was capped at 20)
  //   - division (÷) for medium @ L>=20, hard @ any level (integer-only)
  //   - 5 question shapes rotated: standard, missing operand, missing
  //     operator, comparison, word problem (Indonesian kid context)
  //   - shape selected by caller via `shape` arg ('auto' = cycle)
  // ADDITIVE — does not modify makeMathQuestion(); G4/G10/G11/G13 stay
  // zero-regression.
  // ─────────────────────────────────────────────────────────────────────
  function _divisors (n, maxD) {
    var out = [];
    for (var d = 2; d <= Math.min(maxD || 9, n); d++) {
      if (n % d === 0) out.push(d);
    }
    return out;
  }

  // Owner spec (2026-06-21): × should only appear ~10–15% of total events.
  // Return weighted array of {op, w}. Caller uses _pickWeightedOp.
  function _opsForLevel (lv, diff) {
    if (diff === 'hard') {
      // × ≈ 13%, ÷ ≈ 22%, + ≈ 35%, − ≈ 30%
      return [{op:'+',w:35},{op:'-',w:30},{op:'*',w:13},{op:'÷',w:22}];
    }
    if (diff === 'medium') {
      if (lv > 20)  return [{op:'+',w:38},{op:'-',w:35},{op:'*',w:12},{op:'÷',w:15}];
      if (lv >= 15) return [{op:'+',w:44},{op:'-',w:42},{op:'*',w:14}];
      return [{op:'+',w:55},{op:'-',w:45}];
    }
    // easy: + (always), − (from L5), × simple (a≤4, b≤3 — owner spec). Division never.
    if (lv >= 5) return [{op:'+',w:55},{op:'-',w:33},{op:'*',w:12}];
    return [{op:'+',w:88},{op:'*',w:12}];
  }

  function _pickWeightedOp (opsWeighted) {
    var total = 0;
    for (var i = 0; i < opsWeighted.length; i++) total += opsWeighted[i].w;
    var r = Math.random() * total;
    for (var j = 0; j < opsWeighted.length; j++) {
      r -= opsWeighted[j].w;
      if (r <= 0) return opsWeighted[j].op;
    }
    return opsWeighted[0].op;
  }

  // Normalize a display operator ('×','÷','−') to an internal op token.
  function _normOp (op) {
    if (op === '×') return '*';
    if (op === '−') return '-';
    return op; // '+','-','*','÷' pass through
  }

  function _maxForLevel (lv, diff, override) {
    // A-344 (2026-07-12): optional per-call cap override (Matematika
    // Petualangan difficulty ramp). Backward-compatible — undefined = old caps.
    if (override != null && isFinite(override) && override > 0) return Math.round(override);
    // v55.45 B-233 — owner: "max angka 20. Dan jangan sampai 3 angka." Hard
    // capped at 20 (was 30 at L>20). No operand exceeds 20 in any difficulty;
    // sums stay ≤ 40 = 2 digits, products are sub-capped in _mathAtom.
    if (diff === 'hard')   return 20;
    if (diff === 'medium') return lv >= 15 ? 20 : 15;
    // easy
    return lv >= 15 ? 20 : (lv >= 11 ? 15 : 10);
  }

  // Helper to produce one pure-math (a op b = ans) atom.
  // Returns { a, b, op, ans }. Caller wraps into question shape.
  function _mathAtom (lv, diff, opts) {
    var override = opts && opts.maxNum;
    var forceOp  = opts && opts.forceOp ? _normOp(opts.forceOp) : null;
    // P8: multi-select skills — opts.forceOps is an array of chosen operators
    // (a bare string is tolerated); each atom picks uniformly from the set.
    var _fo = opts && opts.forceOps;
    if (_fo && !(_fo instanceof Array)) _fo = [_fo];
    var forceOps = (_fo && _fo.length) ? _fo.map(_normOp) : null;
    var opsWeighted = _opsForLevel(lv, diff);
    var max = _maxForLevel(lv, diff, override);
    // A-344/P8: Pilih Skill screen can force one op or a chosen set to drill.
    var op  = forceOp
      || (forceOps ? forceOps[Math.floor(Math.random() * forceOps.length)] : null)
      || _pickWeightedOp(opsWeighted);
    var a, b, ans;
    if (op === '+') {
      a = _randInt(1, Math.max(1, max - 1));
      b = _randInt(1, Math.max(1, max - a));
      ans = a + b;
    } else if (op === '-') {
      a = _randInt(2, max);
      b = _randInt(1, a);
      ans = a - b;
    } else if (op === '*') {
      // Owner spec (2026-06-21): easy mode multiplication MUST be simple —
      // operand a ≤ 4 and multiplier b ≤ 3, so max product = 12 (kid-safe).
      if (diff === 'easy') {
        a = _randInt(2, 4);
        b = _randInt(2, 3);
      } else {
        // Cap so a*b respects _maxForLevel (e.g. 30 at L>20 hard).
        var maxFac = diff === 'hard' ? 9 : 5;
        var maxMul = _maxForLevel(lv, diff);
        a = _randInt(2, maxFac);
        var bMax = Math.min(maxFac, Math.floor(maxMul / a));
        if (bMax < 2) bMax = 2;
        b = _randInt(2, bMax);
      }
      ans = a * b;
    } else if (op === '÷') {
      // Integer-only division. Cap dividend `a` at _maxForLevel.
      var maxFacD = diff === 'hard' ? 9 : 5;
      var maxDiv = _maxForLevel(lv, diff);
      b = _randInt(2, maxFacD);
      var ansMax = Math.min(maxFacD, Math.floor(maxDiv / b));
      if (ansMax < 2) ansMax = 2;
      ans = _randInt(2, ansMax);
      a = ans * b;  // guaranteed integer division + within cap
    } else {
      a = _randInt(1, 10); b = _randInt(1, 10); ans = a + b; op = '+';
    }
    return { a: a, b: b, op: op, ans: ans };
  }

  function _opStr (op) {
    if (op === '*') return '×';
    if (op === '-') return '−';
    return op;
  }

  function _wrongs (ans, count) {
    var w = new Set();
    var safety = 0;
    while (w.size < count && safety++ < 20) {
      var off = _randInt(-3, 3) || (Math.random() < 0.5 ? 1 : -1);
      var v = Math.max(0, ans + off);
      if (v !== ans) w.add(v);
    }
    var pad = 1;
    while (w.size < count && pad < 100) {
      var v2 = ans + pad;
      if (v2 !== ans && v2 >= 0) w.add(v2);
      pad++;
    }
    return Array.from(w);
  }

  // Indonesian kid word-problem templates — varied subjects, ≤ 25 words.
  var WORD_TEMPLATES = {
    '+': [
      'Pikachu punya {a} apel. Bunda kasih {b} apel lagi. Berapa apel sekarang?',
      'Di kelas ada {a} anak. Datang {b} teman lagi. Berapa anak di kelas?',
      'Bunda beli {a} jeruk. Lalu beli {b} jeruk lagi. Total ada berapa?',
      'Di warung ada {a} bakso. Dibuat lagi {b}. Total berapa bakso?',
      'Charmander tangkap {a} kupu-kupu. Lalu tangkap {b} lagi. Total berapa?'
    ],
    '-': [
      'Bulbasaur punya {a} biji. Dimakan burung {b} biji. Berapa sisanya?',
      'Bunda buat {a} kue. Adik makan {b}. Berapa kue tersisa?',
      'Di kolam ada {a} ikan. {b} ikan kabur. Berapa sisa ikan?',
      'Squirtle mengumpulkan {a} kerang. Hilang {b} kerang. Berapa sisa?',
      'Di pohon ada {a} mangga. Jatuh {b} mangga. Berapa yang masih di pohon?'
    ],
    '*': [
      '{a} kotak berisi {b} permen. Total permen ada berapa?',
      '{a} pohon punya {b} buah setiap pohon. Total buah?',
      '{a} kerangkeng berisi {b} Pokemon. Total Pokemon?',
      'Pikachu makan {b} apel per hari, selama {a} hari. Total?',
      '{a} keranjang berisi {b} bola masing-masing. Berapa total bola?'
    ],
    '÷': [
      '{a} permen dibagi rata ke {b} anak. Setiap anak dapat berapa?',
      '{a} bunga ditanam di {b} pot sama banyak. Berapa per pot?',
      '{a} kue dibagi {b} keluarga sama rata. Per keluarga dapat berapa?',
      '{a} Pokemon dibagi ke {b} trainer sama rata. Per trainer?',
      '{a} apel diatur rapi di {b} piring. Berapa apel per piring?'
    ]
  };

  // Public V2 entry — `shape` ∈ 'standard' | 'missingOperand' | 'missingOperator'
  // | 'comparison' | 'word' | 'auto' (caller cycles).
  function makeMathQuestionV2 (level, maxLevel, difficulty, shape, opts) {
    var lv = Math.max(1, parseInt(level) || 1);
    var diff = (difficulty || 'easy').toLowerCase();
    var sh = shape || 'standard';
    var atom = _mathAtom(lv, diff, opts);

    if (sh === 'standard') {
      return {
        shape: 'standard',
        q: atom.a + ' ' + _opStr(atom.op) + ' ' + atom.b + ' = ?',
        ans: atom.ans,
        choices: _shuffle([atom.ans].concat(_wrongs(atom.ans, 3))),
        op: atom.op, level: lv, difficulty: diff
      };
    }

    if (sh === 'missingOperand') {
      // Owner spec (2026-06-21): ? always at the END of the equation.
      // Transform "a op ? = result" into inverse standard form so ? = final ans.
      //   a + b = ans  →  ans − a = ?  (answer = b)
      //   a × b = ans  →  ans ÷ a = ?  (answer = b)
      //   a − b = ans  →  ans + b = ?  (answer = a)
      //   a ÷ b = ans  →  ans × b = ?  (answer = a)
      var invQ, invAns;
      if (atom.op === '+') { invQ = atom.ans + ' − ' + atom.a + ' = ?'; invAns = atom.b; }
      else if (atom.op === '*') { invQ = atom.ans + ' ÷ ' + atom.a + ' = ?'; invAns = atom.b; }
      else if (atom.op === '-') { invQ = atom.ans + ' + ' + atom.b + ' = ?'; invAns = atom.a; }
      else if (atom.op === '÷') { invQ = atom.ans + ' × ' + atom.b + ' = ?'; invAns = atom.a; }
      else { invQ = atom.a + ' + ' + atom.b + ' = ?'; invAns = atom.ans; }
      return {
        shape: 'inverse',
        q: invQ,
        ans: invAns,
        choices: _shuffle([invAns].concat(_wrongs(invAns, 3))),
        op: atom.op, level: lv, difficulty: diff
      };
    }

    if (sh === 'missingOperator') {
      // Owner spec: ? at end. Replace with CHAINED 3-operand standard form.
      // a op1 b op2 c = ?  (left-to-right evaluation, integer-only result).
      // Keep the second operator weighted (× stays ~10–15%).
      var atom2 = _mathAtom(lv, diff, opts);
      var op2 = atom2.op;
      var c = atom2.b;
      var mid;
      if (atom.op === '+') mid = atom.a + atom.b;
      else if (atom.op === '-') mid = atom.a - atom.b;
      else if (atom.op === '*') mid = atom.a * atom.b;
      else if (atom.op === '÷') mid = atom.a / atom.b;
      else mid = atom.a + atom.b;
      var chainedAns;
      if (op2 === '+') chainedAns = mid + c;
      else if (op2 === '-') chainedAns = mid - c;
      else if (op2 === '*') chainedAns = mid * c;
      else if (op2 === '÷') chainedAns = (c === 0) ? NaN : mid / c;
      else chainedAns = mid + c;
      // Validate: integer-only, non-negative, within cap.
      var capMax = _maxForLevel(lv, diff, opts && opts.maxNum);
      if (!Number.isFinite(chainedAns) || !Number.isInteger(chainedAns) ||
          chainedAns < 0 || chainedAns > capMax || mid < 0) {
        // Fallback to standard if the chain is messy at this difficulty.
        return makeMathQuestionV2(level, maxLevel, difficulty, 'standard', opts);
      }
      return {
        shape: 'chained',
        q: atom.a + ' ' + _opStr(atom.op) + ' ' + atom.b + ' ' +
           _opStr(op2) + ' ' + c + ' = ?',
        ans: chainedAns,
        choices: _shuffle([chainedAns].concat(_wrongs(chainedAns, 3))),
        op: atom.op + op2, level: lv, difficulty: diff
      };
    }

    if (sh === 'comparison') {
      // (a op b) ___ rhs   choices = '<','>','='
      var rhs = atom.ans + (_randInt(-2, 2));  // sometimes equal, sometimes off
      if (rhs < 0) rhs = atom.ans;
      var truth = atom.ans < rhs ? '<' : (atom.ans > rhs ? '>' : '=');
      return {
        shape: 'comparison',
        q: atom.a + ' ' + _opStr(atom.op) + ' ' + atom.b + ' ___ ' + rhs,
        ans: truth,
        choices: ['<','>','='],
        op: atom.op, level: lv, difficulty: diff,
        choicesAreOperators: true
      };
    }

    // word problem
    var tmpl = (WORD_TEMPLATES[atom.op] || WORD_TEMPLATES['+'])[
      Math.floor(Math.random() * (WORD_TEMPLATES[atom.op] || WORD_TEMPLATES['+']).length)
    ];
    return {
      shape: 'word',
      q: tmpl.replace('{a}', atom.a).replace('{b}', atom.b),
      ans: atom.ans,
      choices: _shuffle([atom.ans].concat(_wrongs(atom.ans, 3))),
      op: atom.op, level: lv, difficulty: diff
    };
  }

  if (typeof window !== 'undefined') {
    window.makeMathQuestion = makeMathQuestion;
    window.makeKnowledgeQuestion = makeKnowledgeQuestion;
    window.makeGameQuestion = makeQuestion;
    window.makeMathQuestionV2 = makeMathQuestionV2;
  }
})();
