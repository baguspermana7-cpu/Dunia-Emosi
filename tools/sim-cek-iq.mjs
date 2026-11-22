#!/usr/bin/env node
// sim-cek-iq — PRD-54 law Q2, rebuilt for PRD-56: does "Perkiraan IQ" recover a child's LATENT score, in Normal and in
// Cepat mode? Simulated grade-1 children (84 months) with known true islands play the five IQ islands through the REAL
// session rules (CekCore.ladder with its 3-wrong stop, or CekCore.cat in Cepat; parts at their stated reliability) and
// the REAL scoring (CekProfile.iq). Truth = 100 + 15 G, G the standardised sum of the five true islands, the same for
// both modes (PRD-54's truth was the mean replay of ONE form, which cannot compare two forms).
// The population follows what the scoring assumes, so this proves the MATHS and the Normal-vs-Cepat equivalence, not
// the norms (cek-targets.js bands stay what they say they are).
// Laws, per mode: |bias| <= 1 | the 90 % range covers the truth 87-93 % | calibration slope of truth on shown .9-1.1
//   Cepat vs Normal: r(Cepat, truth) >= r(Normal, truth) - .04 | RMSE(Cepat) <= 1.2 RMSE(Normal) |
//   r(Cepat, Normal) >= r(Normal, Normal replay) - .05 and the same band (< 85, 85-115, > 115) as often as two Normal
//   sittings, minus 5 points (Cepat agrees with Normal about as well as Normal agrees with itself; both share the truth and
//   have independent errors, so r(Cepat, Normal) cannot exceed r(Cepat, truth) x r(Normal, truth)) | Cepat time <= 55 %
// QA_OLD=<dir with old cek-profile.js> scores Normal with the PRD-54 formula against the same latent truth (red run).
// QA_MUT=easy: Cepat picks the easiest unused item instead of the informative one (mutation; must fail).
// Usage: node tools/sim-cek-iq.mjs [children=2000]
import { createRequire } from 'node:module'
import fs from 'node:fs'
import vm from 'node:vm'
const require = createRequire(import.meta.url)
globalThis.location = globalThis.location || { pathname: '/' }
for (const m of ['cek-core', 'cek-targets', 'cek-irt', 'cek-profile']) require(`../games/data/${m}.js`)
const { CekCore: C, CekTargets: T0, CekIRT: I, CekProfile: P } = globalThis
const N = +process.argv[2] || 2000, M = 84
const MAX = { pola: 24, bentuk: 20 }, CAT_N = P.CAT_N || { pola: 9, bentuk: 8 }
let R = C.rng(20261122)
const rnd = () => R()
const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) }
const T = id => T0.get(id, M), mid = t => (t.lo + t.hi) / 2, sdb = t => Math.max(0.5, (t.hi - t.lo) / 1.35)
const ISLES = ['pola', 'bentuk', 'ingat', 'cepat', 'angka'], RT = P.R_TRUE(M)
// a ladder island: true logit = band centre + T x (band SD in logits) x sqrt(rN)
const LAD = {}
for (const id of ['pola', 'bentuk']) {
  const t = T(id), a = I.thetaOfRaw(t.lo, MAX[id]), b = I.thetaOfRaw(t.hi, MAX[id])
  LAD[id] = { mid: (a + b) / 2, sd: Math.max(0.2, (b - a) / 1.35), rN: P.popRel(id, M) }
}
if (process.env.QA_MUT === 'easy') {   // mutation: the selector always takes the easiest unused item
  const orig = C.cat
  C.cat = o => { const s = orig(o); s.target = 0.999; return s }
}
function ladder (id, Tz, mode) {
  const L = LAD[id], th = L.mid + Tz * L.sd * Math.sqrt(L.rN)
  let s, prac = 0
  if (mode === 'cepat') {
    s = C.cat({ max: MAX[id], n: CAT_N[id], start: P.startTheta(id, M, MAX[id]) })
    while (s.phase === 'practice') { prac++; C.answer(s, rnd() < 0.85, 2000) }
  } else { s = C.ladder({ practice: 2, max: MAX[id], stopAfter: C.STOP_AFTER }); while (s.phase === 'practice') { prac++; C.answer(s, true, 2000) } }
  while (s.phase !== 'done') C.answer(s, rnd() < I.p(th, I.b(s.kind === 'cat' ? s.idx : s.idx, MAX[id])), 2000)
  const rec = { raw: s.raw, max: MAX[id], ok: s.log.map(x => x.ok ? 1 : 0), ms: [], mode }
  if (s.kind === 'cat') rec.items = s.log.map(x => x.i)
  return { rec, items: s.log.length + prac }
}
// a part: observed = mid + sd (sqrt(rN) T + error), error variance rN (1 - r) / r at this form's reliability r
function part (target, Tz, mode, flip) {
  const t = T(target), rN = P.partRel(target, 'normal'), r = P.partRel(target, mode)
  const v = Math.sqrt(rN) * Tz + Math.sqrt(rN * (1 - r) / r) * gauss()
  return mid(t) + (flip ? -1 : 1) * sdb(t) * v
}
const half = v => Math.max(1, Math.round(v * 2) / 2)
function play (Ts, mode) {
  const res = {}, items = {}
  for (const id of ['pola', 'bentuk']) { const o = ladder(id, Ts[id], mode); res[id] = [o.rec]; items[id] = o.items }
  const ing = { mode }
  for (const k of (mode === 'cepat' ? ['mundur', 'corsi'] : ['maju', 'mundur', 'corsi'])) ing[k] = half(part('ingat-' + k, Ts.ingat, mode))
  res.ingat = [ing]
  items.ingat = Object.keys(ing).filter(k => k !== 'mode').reduce((a, k) => a + 1 + 2 * Math.max(1, Math.ceil(ing[k]) - (mode === 'cepat' ? 2 : 1)), 0)
  res.cepat = [{ rate: Math.max(0, part('cepat', Ts.cepat, mode)), mode }]
  items.cepat = mode === 'cepat' ? (45 + 15) / 6 : (85 + 15) / 6   // seconds in 6 s units, practice ~15 s
  const nT = 8, tv = part('angka-titik', Ts.angka, mode)
  res.angka = [{ titik: Math.max(0, Math.min(8, Math.round(tv / (8 / nT)) * (8 / nT))), garis: Math.max(1, part('angka-garis', Ts.angka, mode, true)), mode }]
  items.angka = mode === 'cepat' ? (1 + 8) + (1 + 4) : (1 + 8) + (1 + 7) + (1 + 8)
  return { res, items }
}
function child () { const g = gauss(), Ts = {}; for (const k of ISLES) Ts[k] = Math.sqrt(RT) * g + Math.sqrt(1 - RT) * gauss(); return Ts }
const Gof = Ts => ISLES.reduce((a, k) => a + Ts[k], 0) / Math.sqrt(5 + 20 * RT)
const mean = a => a.reduce((x, y) => x + y, 0) / a.length, sdv = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))) }
const cor = (a, b) => { const ma = mean(a), mb = mean(b); return mean(a.map((x, i) => (x - ma) * (b[i] - mb))) / (sdv(a) * sdv(b)) }
const slope = (y, x) => cor(x, y) * sdv(y) / sdv(x)
const band = v => v < 85 ? 0 : v > 115 ? 2 : 1
const out = { normal: { shown: [], cover: [], items: [] }, cepat: { shown: [], cover: [], items: [] }, old: { shown: [], cover: [] }, again: [] }, truth = []
let OLD = null
if (process.env.QA_OLD) {
  const ctx = { location: { pathname: '/' }, CekIRT: I }; ctx.globalThis = ctx; vm.createContext(ctx)
  for (const f of ['cek-targets', 'cek-profile']) vm.runInContext(fs.readFileSync(`${process.env.QA_OLD}/${f}.js`, 'utf8'), ctx)
  OLD = ctx.CekProfile
}
for (let i = 0; i < N; i++) {
  const Ts = child(), tr = 100 + 15 * Gof(Ts); truth.push(tr)
  for (const mode of ['normal', 'cepat']) {
    const p = play(Ts, mode), e = P.iq(p.res, M)
    out[mode].shown.push(e.iq); out[mode].cover.push(tr >= e.lo && tr <= e.hi)
    // time: one unit per answer, weighted by the island's planned Normal minutes over its Normal answers
    out[mode].items.push(p.items)
    if (mode === 'normal') out.again.push(P.iq(play(Ts, 'normal').res, M).iq)
    if (OLD && mode === 'normal') { const o = OLD.iq(p.res, M); out.old.shown.push(o.iq); out.old.cover.push(tr >= o.lo && tr <= o.hi) }
  }
}
const PLAN = { pola: 6, bentuk: 6, ingat: 6, cepat: 2.5, angka: 7 }   // planned Normal minutes per island (cek-page INFO)
const avgItems = (mode, id) => mean(out[mode].items.map(x => x[id]))
const minutes = mode => ISLES.reduce((a, id) => a + PLAN[id] * avgItems(mode, id) / avgItems('normal', id), 0)
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok ' + m) } else { fail++; console.log('  ✗ ' + m) } }
const stat = mode => {
  const s = out[mode].shown, err = s.map((x, i) => x - truth[i])
  return { bias: mean(err), rmse: Math.sqrt(mean(err.map(e => e * e))), r: cor(s, truth), cover: mean(out[mode].cover.map(Number)), slope: slope(truth, s) }
}
console.log(`sim-cek-iq: ${N} children, 84 months, true-island r ${RT.toFixed(2)}; Cepat CAT n ${JSON.stringify(CAT_N)}${process.env.QA_MUT ? ' MUTATION ' + process.env.QA_MUT : ''}`)
const S = {}
for (const mode of ['normal', 'cepat']) {
  const x = S[mode] = stat(mode)
  console.log(`  ${mode}: bias ${x.bias.toFixed(2)} | RMSE ${x.rmse.toFixed(2)} | r ${x.r.toFixed(3)} | 90 % range covers ${(x.cover * 100).toFixed(1)} % | slope ${x.slope.toFixed(3)} | ~${minutes(mode).toFixed(1)} min`)
  ok(Math.abs(x.bias) <= 1, `${mode}: |bias| ${Math.abs(x.bias).toFixed(2)} <= 1`)
  ok(x.cover >= 0.87 && x.cover <= 0.93, `${mode}: the 90 % range covers the truth ${(x.cover * 100).toFixed(1)} % (87-93)`)
  ok(x.slope >= 0.9 && x.slope <= 1.1, `${mode}: calibration slope ${x.slope.toFixed(3)} in .9-1.1 (the shown number means what it says)`)
}
const agree = mean(out.cepat.shown.map((v, i) => band(v) === band(out.normal.shown[i]) ? 1 : 0)), agreeNN = mean(out.again.map((v, i) => band(v) === band(out.normal.shown[i]) ? 1 : 0))
const rCN = cor(out.cepat.shown, out.normal.shown), rNN = cor(out.again, out.normal.shown)
ok(S.cepat.r >= S.normal.r - 0.04, `Cepat tracks the truth: r ${S.cepat.r.toFixed(3)} >= Normal ${S.normal.r.toFixed(3)} - .04`)
ok(S.cepat.rmse <= 1.2 * S.normal.rmse, `Cepat RMSE ${S.cepat.rmse.toFixed(2)} <= 1.2 x Normal ${S.normal.rmse.toFixed(2)}`)
ok(rCN >= rNN - 0.05, `r(Cepat, Normal) ${rCN.toFixed(3)} >= r(Normal, Normal again) ${rNN.toFixed(3)} - .05`)
ok(agree >= Math.min(0.8, agreeNN - 0.05), `same band as Normal ${(agree * 100).toFixed(1)} % >= min(80, Normal-vs-Normal ${(agreeNN * 100).toFixed(1)} - 5) %`)
ok(minutes('cepat') <= 0.55 * minutes('normal'), `Cepat ~${minutes('cepat').toFixed(1)} min <= 55 % of Normal ~${minutes('normal').toFixed(1)} min`)
if (OLD) {
  const s = out.old.shown, err = s.map((x, i) => x - truth[i]), cv = mean(out.old.cover.map(Number))
  console.log(`  old PRD-54 formula on the latent truth: bias ${mean(err).toFixed(2)} | covers ${(cv * 100).toFixed(1)} % | slope ${slope(truth, s).toFixed(3)}`)
  ok(cv >= 0.87 && cv <= 0.93 && slope(truth, s) >= 0.9 && slope(truth, s) <= 1.1, 'RED expected: old formula covers 87-93 % with slope .9-1.1')
}
console.log(`sim-cek-iq: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
