// Gate for the Super Question Engine (A-349). Node, no browser.
import { readFileSync } from 'fs';
import vm from 'vm';

const ctx = { window: {}, Math, Date, console, performance: { now: () => Date.now() } };
ctx.window = ctx; // scripts attach to (window||globalThis)
vm.createContext(ctx);
for (const f of [
  'games/data/math-rules.js',
  'games/data/super-quiz-data.js',
  'games/data/question-super-engine.js',
]) vm.runInContext(readFileSync(f, 'utf8'), ctx, { filename: f });

const SQ = ctx.SuperQuiz;
let fail = 0;
const ok = (n, c, extra = '') => { console.log((c ? '✅' : '❌') + ' ' + n + (extra ? '  ' + extra : '')); if (!c) fail++; };

ok('SuperQuiz present', !!SQ);
const subs = SQ.subjects();
ok('subjects (8)', subs.length === 8, subs.join(','));
const cap = SQ.capacity();
ok('capacity >= 100000', cap >= 100000, 'capacity=' + cap.toLocaleString());

// validity sweep across subjects
let bad = 0, badExample = '';
for (const s of subs) {
  for (let i = 0; i < 800; i++) {
    const it = SQ.generate({ subject: s, difficulty: ['easy','medium','hard','expert'][i % 4], seed: i * 7 + s.length });
    const valid = it && typeof it.q === 'string' && it.q.length > 0 &&
      it.ans !== undefined && it.ans !== null && String(it.ans).length > 0 &&
      Array.isArray(it.choices) && it.choices.length >= 3 &&
      it.choices.map(String).includes(String(it.ans)) &&
      it.choices.every(c => c !== undefined && c !== null && String(c).length > 0) &&
      !/undefined|NaN/.test(it.q + '|' + it.ans + '|' + it.choices.join(','));
    if (!valid) { bad++; if (!badExample) badExample = s + ': ' + JSON.stringify(it); }
  }
}
ok('all generated questions valid (6400 sampled)', bad === 0, bad ? bad + ' bad e.g. ' + badExample : '');

// uniqueness within a seeded batch
const B = SQ.batch({ count: 500, seed: 12345 });
const uniq = new Set(B.map(x => x.subject + '|' + x.q)).size;
ok('batch uniqueness > 98%', uniq / B.length > 0.98, (uniq + '/' + B.length));

// per-subject can produce distinct questions in bulk (variety check)
for (const s of ['math','bahasa','sains','umum','logika']) {
  const set = new Set();
  for (let i = 0; i < 400; i++) set.add(SQ.generate({ subject: s, difficulty: 'hard', seed: i * 13 + 1 }).q);
  ok('subject ' + s + ' variety >150 distinct/400', set.size > 150, set.size + ' distinct');
}

console.log('\n' + (fail ? fail + ' FAILURES' : 'ALL GREEN — SuperQuiz capacity ' + cap.toLocaleString()));
process.exit(fail ? 1 : 0);
