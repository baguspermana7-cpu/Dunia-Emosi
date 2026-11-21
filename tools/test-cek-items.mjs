#!/usr/bin/env node
// test-cek-items — PRD-53 "Cek Kemampuan" (docs/prd/PRD-53-cek-kemampuan.md): the pure parts, no browser.
//   L1 every generated item has exactly one right answer (2,000 seeded items per generator):
//      Pola  - an independent solver re-derives the missing cell from the grid alone; it must be unique and equal
//              the item's answer, and no distractor may equal it
//      Bentuk - the rotation answer is the shape turned; every distractor is the mirror, which no turn can make
//      Ingat - span sequences have the asked length, no picture twice in a row, tiles inside the board
//   L2 session flow: practice is not scored; 3 wrong in a row ends a ladder; span moves up after one right of two
//      tries and stops after two wrong at one length; the speed island lasts 85 s
//   L3 profile labels come out of fixtures exactly; the reliability flags fire on fast guessing and on a slow session
//   L7 every target has a source and a kind; a `design` target is shown as "perkiraan"; age is read in months
//   L8 the rules equal the PRD table: span start 2, two tries per length; ratios 1:2 to 5:6; turns 0-180 with a
//      mirror distractor; speed 85 s
// Usage: node tools/test-cek-items.mjs        (exit 1 on any failure)
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
globalThis.window = globalThis
for (const m of ['cek-core', 'cek-targets', 'cek-profile', 'cek-pola', 'cek-bentuk', 'cek-ingat']) require(`../games/data/${m}.js`)
const { CekCore, CekTargets, CekProfile, CekPola, CekBentuk, CekIngat } = globalThis
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗ ' + m) } }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const N = 2000

// ---------- L1 Pola: an independent solver ----------
// For each attribute of the missing (last) cell try three rules against the complete rows and columns:
// constant along the row, constant down the column, a fixed step along the row. Every rule that fits all the
// complete data votes; the item is sound only if all fitting rules agree on one value for every attribute.
function solve (grid, rows, cols) {
  const at = (r, c) => grid[r * cols + c], miss = rows * cols - 1, out = {}
  for (const k of Object.keys(at(0, 0))) {
    const votes = new Set()
    const full = (r, c) => !(r === rows - 1 && c === cols - 1)
    let rowConst = true; for (let r = 0; r < rows; r++) for (let c = 1; c < cols; c++) if (full(r, c) && full(r, c - 1) && at(r, c)[k] !== at(r, 0)[k]) rowConst = false
    if (rowConst && cols > 1) votes.add(at(rows - 1, 0)[k])
    let colConst = true; for (let c = 0; c < cols; c++) for (let r = 1; r < rows; r++) if (full(r, c) && at(r, c)[k] !== at(0, c)[k]) colConst = false
    if (colConst && rows > 1) votes.add(at(0, cols - 1)[k])
    if (typeof at(0, 0)[k] === 'number' && cols > 2) {
      const d = at(0, 1)[k] - at(0, 0)[k]; let step = d !== 0
      for (let r = 0; r < rows; r++) for (let c = 1; c < cols; c++) if (full(r, c) && at(r, c)[k] - at(r, c - 1)[k] !== d) step = false
      if (step) votes.add(at(rows - 1, cols - 2)[k] + d)
    }
    if (votes.size !== 1) return { ambiguous: k, votes: [...votes] }
    out[k] = [...votes][0]
  }
  return { cell: out, miss }
}
{
  let bad = 0, amb = 0, dup = 0, levels = new Set(), firstBad = ''
  for (let s = 1; s <= N; s++) {
    const lv = 1 + (s % CekPola.LEVELS)
    const it = CekPola.make(lv, s); levels.add(it.level)
    const sol = solve(it.grid, it.rows, it.cols)
    if (sol.ambiguous) { amb++; firstBad = firstBad || `seed ${s} L${lv} attr ${sol.ambiguous} votes ${JSON.stringify(sol.votes)}`; continue }
    if (!same(sol.cell, it.choices[it.answer])) { bad++; firstBad = firstBad || `seed ${s} L${lv} solver ${JSON.stringify(sol.cell)} item ${JSON.stringify(it.choices[it.answer])}` }
    const keys = it.choices.map(c => JSON.stringify(c)); if (new Set(keys).size !== keys.length) dup++
  }
  ok(!bad && !amb && !dup, `L1 Pola ${N} items: solver disagrees ${bad}, ambiguous ${amb}, repeated choice ${dup} ${firstBad}`)
  ok(levels.size === CekPola.LEVELS, `L1 Pola covers all ${CekPola.LEVELS} levels (${levels.size})`)
  ok(same(CekPola.make(3, 42), CekPola.make(3, 42)), 'L1 Pola same seed -> same item')
}
// ---------- L1 Bentuk ----------
{
  let bad = 0, firstBad = '', angles = new Set()
  for (let s = 1; s <= N; s++) {
    const lv = 1 + (s % CekBentuk.LEVELS), it = CekBentuk.make(lv, s)
    if (it.kind === 'rotate') {
      angles.add(it.choices[it.answer].turn)
      const target = CekBentuk.canon(it.cells)
      const right = it.choices.filter(c => !c.mirror && same(CekBentuk.canon(c.cells), target))
      const wrongSame = it.choices.filter(c => c.mirror && same(CekBentuk.canon(c.cells), target))
      if (right.length !== 1 || wrongSame.length || it.choices[it.answer].mirror) { bad++; firstBad = firstBad || `seed ${s} rotate right ${right.length} mirror-equal ${wrongSame.length}` }
    } else if (it.kind === 'tiles') {
      if (it.target.length !== it.n * it.n || !it.target.every(t => t >= 0 && t < 4)) { bad++; firstBad = firstBad || `seed ${s} tiles` }
    } else { bad++; firstBad = firstBad || `seed ${s} unknown kind ${it.kind}` }
  }
  ok(!bad, `L1 Bentuk ${N} items: unsound ${bad} ${firstBad}`)
  ok([0, 45, 90, 135, 180].every(a => angles.has(a)), `L8 Bentuk turns 0-180 all used (${[...angles].sort((a, b) => a - b)})`)
  ok(CekBentuk.SHAPES.every(sh => !same(CekBentuk.canon(sh), CekBentuk.canon(CekBentuk.mirror(sh)))), 'L1 Bentuk every base shape is chiral (its mirror is no turn of it)')
}
// ---------- L1 Ingat ----------
{
  let bad = 0
  for (let s = 1; s <= N; s++) {
    const len = 2 + (s % 7), q = CekIngat.sequence(len, s, CekIngat.POOL), c = CekIngat.corsi(len, s)
    if (q.length !== len || q.some((x, i) => i && x === q[i - 1]) || q.some(x => x < 0 || x >= CekIngat.POOL)) bad++
    if (c.length !== len || c.some((x, i) => i && x === c[i - 1]) || c.some(x => x < 0 || x >= CekIngat.TILES.length)) bad++
  }
  ok(!bad, `L1 Ingat ${N} sequences: unsound ${bad}`)
  const T = CekIngat.TILES; let gap = 100; T.forEach((p, i) => T.slice(i + 1).forEach(q => { gap = Math.min(gap, Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]))) }))
  ok(gap >= 24 && T.every(p => p.every(v => v >= 12 && v <= 88)), `L5 Corsi tiles >= 24 % apart (${gap}) and inside 12-88 %, so 56 px tiles never overlap on a 250 px board`)
}
// ---------- L2 session flow ----------
{
  // ladder: 2 practice (wrong), then right, wrong x3 -> ends, raw 1
  const s = CekCore.ladder({ practice: 2, max: 24, stopAfter: 3 })
  CekCore.answer(s, false, 900); CekCore.answer(s, false, 900)
  ok(s.phase === 'test' && s.raw === 0 && s.log.length === 0, `L2 practice not scored (phase ${s.phase}, raw ${s.raw}, logged ${s.log.length})`)
  CekCore.answer(s, true, 1500); CekCore.answer(s, false, 1500); CekCore.answer(s, false, 1500)
  ok(s.phase === 'test', 'L2 two wrong in a row does not end')
  CekCore.answer(s, false, 1500)
  ok(s.phase === 'done' && s.raw === 1 && s.log.length === 4, `L2 three wrong in a row ends (phase ${s.phase}, raw ${s.raw})`)
  const full = CekCore.ladder({ practice: 0, max: 5, stopAfter: 3 }); for (let i = 0; i < 5; i++) CekCore.answer(full, true, 1000)
  ok(full.phase === 'done' && full.raw === 5, 'L2 ladder ends at max')
}
{
  // span: start 2; length 2 right; length 3 wrong then right -> up; length 4 wrong, wrong -> stop; best 3
  const s = CekCore.span({ start: 2, tries: 2, max: 9 })
  ok(s.len === 2, `L8 span starts at 2 (${s.len})`)
  CekCore.spanAnswer(s, true); ok(s.len === 3, `L2 one right moves up (len ${s.len})`)
  CekCore.spanAnswer(s, false); ok(s.len === 3 && s.phase === 'test', 'L2 first wrong at a length retries the length')
  CekCore.spanAnswer(s, true); ok(s.len === 4, 'L2 right on the second try moves up')
  CekCore.spanAnswer(s, false); CekCore.spanAnswer(s, false)
  ok(s.phase === 'done' && s.best === 3, `L2 two wrong at one length stops, best ${s.best}`)
  ok(CekCore.SPAN.start === 2 && CekCore.SPAN.tries === 2, 'L8 span rule constants = PRD (start 2, two tries)')
}
ok(CekCore.SPEED_MS === 85000, `L8 speed island lasts 85 s (${CekCore.SPEED_MS})`)
ok(same(CekCore.RATIOS, [[1, 2], [2, 3], [3, 4], [5, 6]]), `L8 ratios 1:2 -> 5:6 (${JSON.stringify(CekCore.RATIOS)})`)

// ---------- L3 profile ----------
{
  const T = CekTargets.get('ingat-maju', 80)
  ok(T && typeof T.lo === 'number' && typeof T.hi === 'number', 'L3 a target exists for forward span at 80 months')
  ok(CekProfile.label(T.lo - 1, T) === 'Perlu latihan' && CekProfile.label(T.lo, T) === 'Sesuai usia' && CekProfile.label(T.hi + 1, T) === 'Kuat', 'L3 label below / inside / above the target band')
  const fast = CekProfile.flags({ ms: Array(10).fill(500), durMs: 300000, planMs: 360000 })
  const slow = CekProfile.flags({ ms: Array(10).fill(2000), durMs: 800000, planMs: 360000 })
  const fine = CekProfile.flags({ ms: Array(10).fill(2000), durMs: 300000, planMs: 360000 })
  ok(fast.includes('cepat') && slow.includes('lama') && !fine.length, `L3 flags fast ${fast} slow ${slow} fine ${fine}`)
  ok(CekProfile.ageMonths('2019-05', new Date(2026, 10, 21)) === 90, `L7 age in months from the birth month (${CekProfile.ageMonths('2019-05', new Date(2026, 10, 21))})`)
  ok(CekTargets.get('ingat-maju', 140) === null, 'L7 no target outside the grade-1 age band')
}
// ---------- L7 every target has a source ----------
{
  const all = CekTargets.all()
  const noSrc = all.filter(t => !t.src || !['published', 'curriculum', 'design'].includes(t.kind))
  const pubNoQuote = all.filter(t => t.kind === 'published' && !t.quote)
  ok(all.length >= 6 && !noSrc.length && !pubNoQuote.length, `L7 ${all.length} targets, without src/kind ${noSrc.map(t => t.id)}, published without quote ${pubNoQuote.map(t => t.id)}`)
  const d = all.find(t => t.kind === 'design')
  ok(!d || CekProfile.basisText(d) === 'perkiraan', 'L7 a design target reads "perkiraan"')
}
// ---------- v2: Kata, Cepat, Angka generators (L1+), Perkiraan IQ (L10), board ranking (L11) ----------
globalThis.location = globalThis.location || { pathname: '/' }
for (const m of ['db-labeled', 'cek-kata', 'cek-cepat', 'cek-angka', 'cek-board']) require(`../games/data/${m}.js`)
const { CekKata, CekCepat, CekAngka, CekBoard, DBLabeled } = globalThis
{
  let bad = [], groupsSeen = new Set()
  for (let s = 1; s <= N; s++) for (let i = 0; i < CekKata.MAX; i++) {
    const it = CekKata.make(i, s), names = it.choices.map(c => c.name)
    if (new Set(names).size !== 4 || it.answer < 0 || it.answer > 3) { bad.push(`${s}/${i} choices`); continue }
    it.choices.forEach(c => groupsSeen.add(c.group))
    if (it.kind === 'kata') {
      if (it.choices[it.answer].name !== it.word || names.filter(n => n === it.word).length !== 1) bad.push(`${s}/${i} word`)
      if (new Set(it.choices.map(c => c.group)).size !== 1) bad.push(`${s}/${i} mixed groups`)
    } else {
      const home = it.show[0].group, right = it.choices[it.answer]
      if (it.show[1].group !== home || right.group !== home) bad.push(`${s}/${i} home group`)
      if (it.choices.filter(c => c.group === home).length !== 1) bad.push(`${s}/${i} two from the home group`)
      const all = DBLabeled._data, inMany = n => Object.keys(all).filter(g => all[g].items.some(x => x[1] === n)).length > 1
      if (it.choices.concat(it.show).some(c => inMany(c.name))) bad.push(`${s}/${i} a name in two groups`)
      if (it.show.some(x => names.includes(x.name))) bad.push(`${s}/${i} shown picture among choices`)
    }
  }
  ok(!bad.length, `L1 Kata ${N * CekKata.MAX} items: one right answer, same-group pictures, no shared names${bad.length ? ' - ' + bad.slice(0, 4).join('; ') : ''}`)
  const banned = ['profesi', 'tubuh', 'warna', 'pakaian', 'musik', 'olahraga', 'sekolah'].filter(g => groupsSeen.has(g))
  ok(!banned.length, `L1 Kata never uses people, body, colour or the cropped groups (${banned})`)
  let food = [], out = 0
  for (let s = 1; s <= N; s++) for (let i = 16; i < 24; i++) { const it = CekKata.make(i, s), home = it.show[0].group
    if (CekKata.FOOD[home] && it.choices.some((c, k) => k !== it.answer && CekKata.FOOD[c.group])) food.push(`${s}/${i}`) }
  for (let s = 1; s <= 300; s++) for (let i = 0; i < 24; i++) { const it = CekKata.make(i, s); if (it.choices.concat(it.show || []).some(c => CekKata.OUT[c.name])) out++ }
  ok(!food.length && !out, `L1 Kata "kelompok": a food home group never has a food wrong choice (${food.slice(0, 3)}); excluded pictures never shown (${out})`)
}
{
  let bad = [], diff = 0
  for (let s = 1; s <= N; s++) for (let i = 0; i < 20; i++) {
    const p = CekCepat.pair(i, s), keys = ['shape', 'color', 'size', 'count', 'rot'].filter(k => p.a[k] !== p.b[k])
    if (p.same ? keys.length !== 0 : keys.length !== 1) bad.push(`${s}/${i} ${keys}`)
    if (!p.same) diff++
  }
  ok(!bad.length, `L1 Cepat: a "sama" pair is identical, a "beda" pair differs in exactly one thing${bad.length ? ' - ' + bad.slice(0, 3).join('; ') : ''}`)
  ok(diff > N * 20 * 0.4 && diff < N * 20 * 0.6, `L1 Cepat: about half the pairs differ (${diff} of ${N * 20})`)
}
{
  let bad = []
  const area = l => l.reduce((a, p) => a + p.r * p.r, 0)
  for (let s = 1; s <= N; s++) for (let L = 1; L <= 4; L++) for (const kind of ['size', 'area']) {
    const d = CekAngka.dots(L, s, kind), [p, q] = CekCore.RATIOS[L - 1]
    if (d.a.length !== d.na || d.b.length !== d.nb) { bad.push(`${s}/${L}/${kind} placed ${d.a.length}/${d.na} ${d.b.length}/${d.nb}`); continue }
    if (Math.min(d.na, d.nb) * q !== Math.max(d.na, d.nb) * p) bad.push(`${s}/${L} ratio ${d.na}:${d.nb} not ${p}:${q}`)
    if ((d.na > d.nb ? 'a' : 'b') !== d.more) bad.push(`${s}/${L} more`)
    if (kind === 'area') { const A = area(d.a), B = area(d.b); if (Math.abs(A - B) / Math.max(A, B) > 0.1) bad.push(`${s}/${L} area ${A.toFixed(0)} vs ${B.toFixed(0)}`) }
    else if (new Set(d.a.concat(d.b).map(x => x.r)).size !== 1) bad.push(`${s}/${L} size`)
  }
  ok(!bad.length, `L1 Angka dots: the asked ratio, the bigger set is the answer, area-matched trials within 10 %${bad.length ? ' - ' + bad.slice(0, 3).join('; ') : ''}`)
  let sb = []
  for (let s = 1; s <= N; s++) for (let i = 0; i < CekAngka.N_STORY; i++) {
    const t = CekAngka.story(i, s), lim = i < 4 ? 10 : 20, v = t.op === '+' ? t.a + t.b : t.a - t.b
    if (v !== t.ans || t.choices[t.answer] !== t.ans || new Set(t.choices).size !== 3 || t.choices.filter(c => c === t.ans).length !== 1) sb.push(`${s}/${i} answer`)
    if (t.ans < 0 || (t.op === '+' ? t.ans : t.a) > lim) sb.push(`${s}/${i} over ${lim}: ${t.text}`)
    if (!DBLabeled.byName(t.pic.group, t.pic.name)) sb.push(`${s}/${i} picture ${t.pic.name}`)
  }
  ok(!sb.length, `L1 Angka stories: one right answer of 3, sums within 10 then 20, pictures exist${sb.length ? ' - ' + sb.slice(0, 3).join('; ') : ''}`)
  let lb = []
  for (let s = 1; s <= N; s++) for (let i = 0; i < CekAngka.N_LINES; i++) { const l = CekAngka.line(i, s); if (l.n <= 0 || l.n >= l.max) lb.push(`${s}/${i} ${l.n}/${l.max}`) }
  ok(!lb.length && CekAngka.pae(50, 62, 100) === 12, `L1 number line targets inside the line, error 50 vs 62 on 0-100 = 12 % (${lb.slice(0, 2)})`)
}
// ---------- L10 Perkiraan IQ ----------
{
  const m = 78, T = id => CekTargets.get(id, m), mid = id => (T(id).lo + T(id).hi) / 2
  const rec = f => ({ pola: [{ raw: f('pola') }], bentuk: [{ raw: f('bentuk') }], ingat: [{ maju: f('ingat-maju'), mundur: f('ingat-mundur'), corsi: f('ingat-corsi') }] })
  const atMid = CekProfile.iq(rec(mid), m), atHi = CekProfile.iq(rec(id => T(id).hi), m), far = CekProfile.iq(rec(() => 99), m), low = CekProfile.iq(rec(() => 0), m)
  ok(atMid && atMid.iq === 100, `L10 every island at the band middle -> 100 (${atMid && atMid.iq})`)
  ok(atHi && atHi.iq === 110, `L10 every island at the band top (75th percentile) -> 110 (${atHi && atHi.iq})`)
  ok(far.iq === 145 && low.iq === 55, `L10 clamped to 55-145 (${far.iq}, ${low.iq})`)
  ok(CekProfile.iq({ pola: [{ raw: 12 }], bentuk: [{ raw: 10 }] }, m) === null, 'L10 fewer than 3 islands -> no estimate')
  ok(CekProfile.z('angka', { garis: T('angka-garis').lo }, m) > 0 && CekProfile.z('angka', { garis: 24 }, m) < 0, 'L10 number-line error: lower is better (error at lo raises the estimate, 24 % lowers it)')
  ok(atMid.lo === 85 && atMid.hi === 115, `L10 the range shown is +-15 (${atMid.lo}-${atMid.hi})`)
  ok(CekProfile.months('5-6') === 78 && CekProfile.months('7-8') === 90 && CekTargets.near(114) === 95, 'L10 age band -> months; an age past grade 1 uses the nearest band')
  ok(CekProfile.stars(-1) === 1 && CekProfile.stars(0) === 2 && CekProfile.stars(1) === 3, 'L10 stars 1-3 from the island standing')
}
// ---------- L3 reliability ----------
{
  const m = 78, T = id => CekTargets.get(id, m), mid = id => (T(id).lo + T(id).hi) / 2
  const base = { pola: [{ raw: 20 }], bentuk: [{ raw: mid('bentuk') }], ingat: [{ maju: mid('ingat-maju'), mundur: mid('ingat-mundur'), corsi: mid('ingat-corsi') }], kata: [{ raw: mid('kata') }] }
  const a = CekProfile.iq(base, m), flagged = CekProfile.iq(Object.assign({}, base, { pola: [{ raw: 20, flags: ['cepat'] }] }), m)
  ok(a.islands === 4 && flagged.islands === 3 && flagged.iq < a.iq && !CekProfile.reliable({ flags: ['salah'] }) && CekProfile.reliable({ flags: ['lama'] }),
    `L3 a guessed island leaves the estimate (${a.iq} from ${a.islands} -> ${flagged.iq} from ${flagged.islands}); 'lama' alone keeps it`)
}
// ---------- L11 board ----------
{
  const r = CekBoard.rank([{ name: 'B', iq: 104, islands: 3, at: 2 }, { name: 'A', iq: 112, islands: 4, at: 5 }, { name: 'C', iq: 104, islands: 3, at: 1 }, { name: 'D', iq: null, islands: 1 }])
  ok(r.map(x => x.name).join('') === 'ACBD' && r.map(x => x.place).join(',') === '1,2,2,', `L11 ranked by IQ, ties share a place, no estimate last (${r.map(x => x.name + x.place).join(' ')})`)
  ok(CekBoard.cleanName('  ana <img src=x> ') === 'ana' && CekBoard.cleanName('Muhammad Al Fatih') === 'Muhammad' && CekBoard.cleanName('Abcdefghijklmnop') === 'Abcdefghijkl', 'L11 only a first name of letters, max 12, goes online')
  ok(CekBoard.boardName('Ana', 'lion') === 'Ana|lion' && CekBoard.boardName('Ana', '<x>') === 'Ana|', 'L11 board name carries a known avatar slug only')
  ok(CekBoard.publicName('Anjingku') === 'Pemain' && CekBoard.publicName('tolol') === 'Pemain' && CekBoard.publicName('Tiara') === 'Tiara' && CekBoard.publicName('') === 'Pemain', 'L9 rude names go online as "Pemain"; ordinary names pass')
  const e1 = CekBoard.encode(110, 3), e2 = CekBoard.encode(100, 6), e3 = CekBoard.encode(110, 6), d = CekBoard.decode({ name: 'Ana|lion', value: e3, updated_at: '2026-11-21' })
  ok(e3 > e1 && e1 > e2 && d.iq === 110 && d.islands === 6 && d.avatar === 'lion' && CekBoard.decode({ name: '<b>x|zz', value: 1003 }).avatar === '', `L11 value = IQ x 10 + islands ranks IQ then islands and decodes back (${e1}, ${e2}, ${e3})`)
}
console.log(`test-cek-items: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
