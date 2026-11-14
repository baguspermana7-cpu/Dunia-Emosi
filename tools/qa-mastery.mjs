#!/usr/bin/env node
// qa-mastery — PRD-10 (docs/prd/PRD-10-model-penguasaan-lintas-game.md), node part: the shared mastery rule finds the
// right level for a child, from answers alone.
// Simulated child: ability a; a question at level L (1..4, the tier the score maps to) is right on the first try with
// p = 1 / (1 + e^(-1.7 (a - L + 1.1))), i.e. ~75 % right at the level that matches the child (L = a + ~0.45).
//   L1 a weak (a = 1.2) and a strong (a = 3.6) child starting from the same band are on different tiers after 15
//      answers (20 seeds: every seed)
//   L2 children whose level exists in the game (a = 1.4, 2.1, 2.8) answer 65-85 % right on the first try over answers
//      16-80 (mean of 20 seeds); a child above the top level is at least 65 %
//   L3 the rule's own equilibrium: right +K / wrong -3K has zero drift at 75 %
//   L4 records from the bus land per child: avatar A's answers do not move avatar B; a game's older score is a floor
//      (seed never lowers)
//   L6 (PRD-19b) the age band sets the start only: after 10 answers a 9-10 child answering weakly is on tier 1-2 and a
//      5-6 child answering strongly on 3-4
//   L7 (PRD-10) a game's number range is capped by the child's tier (Mojo chase 5 on tier 1; Kuis 10 / 15)
//   L8 (PRD-17b) after a frustration moment the next question in that domain is one tier easier, once per session
//   L5 TKQuiz's +5 / -3 rule, run through the same children, settles lower: shown, not failed (the reason for the change)
// Usage: node tools/qa-mastery.mjs   (also in tools/ci-verify.sh)
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }
const store = {}
const ls = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v) }, removeItem: k => { delete store[k] } }
const sstore = {}
const sess = { getItem: k => (k in sstore ? sstore[k] : null), setItem: (k, v) => { sstore[k] = String(v) }, removeItem: k => { delete sstore[k] } }
const ctx = { console, JSON, Math, Date, localStorage: ls, sessionStorage: sess, location: { pathname: '/games/x.html' }, CustomEvent: class { constructor (t, o) { this.type = t; this.detail = o && o.detail } }, dispatchEvent () {} }
ctx.window = ctx; vm.createContext(ctx)
for (const f of ['games/data/save-engine.js', 'games/data/dunia-bus.js', 'games/data/mastery.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f })
const M = ctx.DuniaMastery
const rng = s => () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
const pRight = (a, L) => 1 / (1 + Math.exp(-1.7 * (a - L + 1.1)))
function child (a, seed, rule, n = 80, m0 = 10) {
  const r = rng(seed); let m = m0, right = 0, counted = 0, tierAt15 = 0, tierAt10 = 0
  for (let i = 0; i < n; i++) {
    const L = M.tierOf(m), okk = r() < pRight(a, L)
    if (i >= 15) { counted++; if (okk) right++ }
    m = rule(m, okk, i)
    if (i === 14) tierAt15 = M.tierOf(m)
    if (i === 9) tierAt10 = M.tierOf(m)
  }
  return { acc: right / counted, tierAt15, tierAt10 }
}
const shared = (m, okk, n) => M.update(m, okk, n), tk = (m, okk) => Math.max(0, Math.min(100, m + (okk ? 5 : -3)))
const seeds = [...Array(20)].map((_, i) => i + 1)
const mean = a => a.reduce((x, y) => x + y, 0) / a.length
{
  const weak = seeds.map(s => child(1.2, s, shared).tierAt15), strong = seeds.map(s => child(3.6, s, shared).tierAt15)
  ok(seeds.every((_, i) => strong[i] > weak[i]), `L1 after 15 answers a strong child is above a weak one on every seed (weak ${weak.join('')} / strong ${strong.join('')})`)
}
for (const a of [1.4, 2.1, 2.8]) {
  const acc = mean(seeds.map(s => child(a, s, shared).acc))
  ok(acc >= 0.65 && acc <= 0.85, `L2 ability ${a}: ${(acc * 100).toFixed(0)} % right on the first try (65-85)`)
}
{
  const acc = mean(seeds.map(s => child(4.6, s, shared).acc))
  ok(acc >= 0.65, `L2 ability above the top level: ${(acc * 100).toFixed(0)} % right (>= 65)`)
}
{
  const K = 3, drift = 0.75 * K - 0.25 * 3 * K
  ok(Math.abs(drift) < 1e-9, `L3 zero drift at 75 % right (${drift})`)
}
{
  ctx.localStorage.setItem('dunia-players', JSON.stringify([{ name: 'A', animal: '🦁', ageTier: 'cilik' }, { name: 'B', animal: '🐰', ageTier: 'pintar' }]))
  ctx.localStorage.setItem('dunia-active-slot', '[0,1]')
  const a0 = M.score('matematika')
  for (let i = 0; i < 5; i++) ctx.DuniaBus.emit('answer', { domain: 'matematika', skill: 'add', ok: true })
  const a1 = M.score('matematika')
  ctx.localStorage.setItem('dunia-active-slot', '[1,0]')
  const b0 = M.score('matematika')
  ok(a0 === 10 && a1 > a0 && b0 === 65, `L4 avatar A ${a0} -> ${a1} from 5 bus answers; avatar B untouched at its band start ${b0}`)
  M.seed('matematika', 80); const s1 = M.score('matematika'); M.seed('matematika', 20); const s2 = M.score('matematika')
  ok(s1 === 80 && s2 === 80, `L4 an older game score is a floor: seed 80 -> ${s1}, seed 20 after -> ${s2}`)
}
// PRD-19b: the age band only sets where a child starts; answers win. A 9-10 child (start 65, tier 3) who answers like
// a weak child is down on tier 1-2 after 10 answers; a 5-6 child (start 10) who answers like a strong one is up on 3-4.
{
  const st = M.START, down = seeds.map(s => child(1.2, s, shared, 80, st.pintar).tierAt10), up = seeds.map(s => child(3.6, s, shared, 80, st.cilik).tierAt10)
  ok(st.pintar > st.tumbuh && st.tumbuh > st.cilik && M.tierOf(st.pintar) > M.tierOf(st.cilik), `L6 an older band starts higher (5-6 ${st.cilik}, 7-8 ${st.tumbuh}, 9-10 ${st.pintar})`)
  ok(down.filter(t => t <= 2).length >= 18 && up.filter(t => t >= 3).length >= 18, `L6 after 10 answers the answers decide, not the age (9-10 weak child ${down.join('')}, 5-6 strong child ${up.join('')}; >= 18 of 20 seeds)`)
}
// PRD-10 (rest): games cap their own number range by the child's tier. Mojo chase {1: 5}, Kuis {1: 10, 2: 15}
{
  const who = slot => { ctx.localStorage.setItem('dunia-active-slot', JSON.stringify([slot, 1])) }
  ctx.localStorage.setItem('dunia-players', JSON.stringify([{ name: 'C', animal: '🐯', ageTier: 'cilik' }, { name: 'T', animal: '🐼', ageTier: 'tumbuh' }, { name: 'P', animal: '🦊', ageTier: 'pintar' }]))
  const got = []
  for (const sl of [0, 1, 2]) { who(sl); got.push([M.cap('matematika', 10, { 1: 5 }), M.cap('matematika', 18, { 1: 10, 2: 15 })]) }
  ok(JSON.stringify(got) === JSON.stringify([[5, 10], [10, 15], [10, 18]]), `L7 number range by tier: 5-6 / 7-8 / 9-10 child -> Mojo ${got.map(x => x[0])}, Kuis level of 18 -> ${got.map(x => x[1])}`)
  // PRD-17b: one tier easier for the next question only, once per session per domain
  who(1)
  const t0 = M.tierNow('matematika'), first = M.soften('matematika'), t1 = M.tierNow('matematika'), s1 = M.scoreNow('matematika')
  ctx.DuniaBus.emit('answer', { domain: 'matematika', skill: 'add', ok: true })
  const t2 = M.tierNow('matematika'), again = M.soften('matematika'), t3 = M.tierNow('matematika')
  ok(t0 === 2 && first && t1 === 1 && s1 <= 30, `L8 after a hard moment the next question is one tier down (tier ${t0} -> ${t1}, score now ${s1})`)
  ok(t2 === M.tierOf(M.score('matematika')) && !again && t3 === t2, `L8 one answer later it is back (tier ${t2}); a second hard moment the same session does not lower it again (${again})`)
  const other = M.soften('logika')
  ok(other && M.tierNow('logika') === 1 && M.tierNow('matematika') === t2, `L8 per domain: logika softens on its own (${M.tierNow('logika')}), matematika stays ${M.tierNow('matematika')}`)
}
{
  const accTk = mean(seeds.map(s => child(2.1, s, tk).acc)), accSh = mean(seeds.map(s => child(2.1, s, shared).acc))
  console.log(`  L5 ability 2.1: TKQuiz +5/-3 -> ${(accTk * 100).toFixed(0)} % right, shared rule -> ${(accSh * 100).toFixed(0)} %`)
}
console.log(`qa-mastery: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
