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
    while (wrongs.size < 3) wrongs.add(ans + wrongs.size + 1);
    const choices = _shuffle([ans, ...wrongs]);
    return { q, ans, choices, op, level: lv, difficulty: diff };
  }

  // Knowledge questions for HARD mode only.
  const KNOWLEDGE_BANK = [
    { q: 'Ibu kota Jawa Barat?', ans: 'Bandung', choices: ['Bandung', 'Bogor', 'Bekasi', 'Cirebon'] },
    { q: 'Ibu kota Indonesia?', ans: 'Jakarta', choices: ['Jakarta', 'Surabaya', 'Bandung', 'Medan'] },
    { q: 'Ibu kota Jawa Timur?', ans: 'Surabaya', choices: ['Surabaya', 'Malang', 'Madiun', 'Kediri'] },
    { q: 'Pulau terbesar di Indonesia?', ans: 'Sumatera', choices: ['Sumatera', 'Jawa', 'Kalimantan', 'Papua'] },
    { q: 'Berapa hari dalam seminggu?', ans: '7', choices: ['7', '5', '6', '8'] },
    { q: 'Berapa bulan dalam setahun?', ans: '12', choices: ['12', '10', '11', '13'] },
    // Add more here as needed
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

  if (typeof window !== 'undefined') {
    window.makeMathQuestion = makeMathQuestion;
    window.makeKnowledgeQuestion = makeKnowledgeQuestion;
    window.makeGameQuestion = makeQuestion;
  }
})();
