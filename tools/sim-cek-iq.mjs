#!/usr/bin/env node
// PRD-54 B7 / law Q2: does the "Perkiraan IQ" formula recover a child's score?
// Simulated grade-1 children (84 months) with known abilities play the six islands through the REAL session rules
// (CekCore.ladder with its 3-wrong stop, CekCore.span with both tries per length) and the REAL scoring (CekProfile.iq).
// The population is built to match what the formula assumes, so this proves the MATHS (scaling, bias, honest range),
// not the norms (the target bands remain what cek-targets.js says they are).
//   observed islands intercorrelate R_ISLAND (.45): true islands correlate .45 / mean reliability
//   each target band is the observed 25th-75th percentile; observed = true + error at the island's reliability
//   "true IQ" = the classical true score: the mean composite over REPS replays of the same child
// Laws: composite SD 15 +- 1.5 | |bias| <= 2 | r(shown, true) >= .85 | 90 % range covers 85-95 %.
// QA_OLD=<dir> also scores with the old cek-profile.js / cek-targets.js from <dir> (the red run).
// Usage: node tools/sim-cek-iq.mjs [children=2000] [reps=24]
import { createRequire } from 'node:module'
import fs from 'node:fs'
import vm from 'node:vm'
const require = createRequire(import.meta.url)
globalThis.location = globalThis.location || { pathname: '/' }
for (const m of ['cek-core', 'cek-targets', 'cek-irt', 'cek-profile']) require(`../games/data/${m}.js`)
const { CekCore, CekTargets, CekIRT, CekProfile } = globalThis
const N = +process.argv[2] || 2000, REPS = +process.argv[3] || 24, M = 84
const MAX = { pola: 24, bentuk: 20, kata: 24 }
// one resettable stream: the old and new formulas see the same children and the same answers
let R = CekCore.rng(20261121)
const rnd = () => R()
const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) }
const T = id => CekTargets.get(id, M), mid = t => (t.lo + t.hi) / 2, sd = t => (t.hi - t.lo) / 1.35
const ISLES = ['pola', 'bentuk', 'kata', 'ingat', 'cepat', 'angka']
// ladder islands: the band in right answers -> logits; the true logit spread is the observed spread x sqrt(reliability)
const LAD = {}
for (const id of ['pola', 'bentuk', 'kata']) {
  const t = T(id), a = CekIRT.thetaOfRaw(t.lo, MAX[id]), b = CekIRT.thetaOfRaw(t.hi, MAX[id]), s = (b - a) / 1.35
  const rel = CekProfile.rel(id, { raw: Math.round(mid(t)), max: MAX[id] }, M)
  LAD[id] = { mid: (a + b) / 2, sdTrue: s * Math.sqrt(rel), rel }
}
const REL = { pola: LAD.pola.rel, bentuk: LAD.bentuk.rel, kata: LAD.kata.rel, ingat: 0.75, cepat: 0.8, angka: 0.75 }
const rbar = ISLES.reduce((a, k) => a + REL[k], 0) / ISLES.length
const RT = Math.min(0.95, CekProfile.R_ISLAND / rbar), LAM = Math.sqrt(RT)   // true-island correlation
function ladder (id, z) {
  const th = LAD[id].mid + z * LAD[id].sdTrue, s = CekCore.ladder({ practice: 0, max: MAX[id], stopAfter: CekCore.STOP_AFTER })
  while (s.phase !== 'done') CekCore.answer(s, rnd() < CekIRT.p(th, CekIRT.b(s.idx, MAX[id])), 2000)
  return { raw: s.raw, max: MAX[id], ok: s.log.map(x => x.ok ? 1 : 0), ms: [] }
}
// a part with a band: observed = mid + sd (sqrt(relPart) z + sqrt(1 - relPart) e); parts of one island at RHO_PART .5
const part = (t, z, rp, flip) => mid(t) + (flip ? -1 : 1) * sd(t) * (Math.sqrt(rp) * z + Math.sqrt(1 - rp) * gauss())
const half = v => Math.max(1, Math.round(v * 2) / 2)
function play (zs) {
  const r = {}
  for (const id of ['pola', 'bentuk', 'kata']) r[id] = [ladder(id, zs[id])]
  r.ingat = [{ maju: half(part(T('ingat-maju'), zs.ingat, 0.5)), mundur: half(part(T('ingat-mundur'), zs.ingat, 0.5)), corsi: half(part(T('ingat-corsi'), zs.ingat, 0.5)) }]
  r.cepat = [{ rate: Math.max(0, part(T('cepat'), zs.cepat, 0.8)) }]
  r.angka = [{ titik: Math.max(0, Math.min(8, Math.round(part(T('angka-titik'), zs.angka, 0.25)))), garis: Math.max(1, part(T('angka-garis'), zs.angka, 0.5, true)), hitung: Math.max(0, Math.min(8, Math.round(part(T('angka-hitung'), zs.angka, 0.5)))) }]
  return r
}
function child () { const g = gauss(), zs = {}; for (const k of ISLES) zs[k] = LAM * g + Math.sqrt(1 - RT) * gauss(); return zs }
function run (P, label) {
  const shown = [], obs = [], truth = [], cover = []
  rndReset()
  for (let i = 0; i < N; i++) {
    const zs = child()
    let acc = 0; for (let k = 0; k < REPS; k++) acc += P.score(play(zs)).obs
    const tr = acc / REPS, e = P.score(play(zs))
    shown.push(e.iq); obs.push(e.obs); truth.push(tr); cover.push(tr >= e.lo && tr <= e.hi)
  }
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length, sdv = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))) }
  const cor = (a, b) => { const ma = mean(a), mb = mean(b); return mean(a.map((x, i) => (x - ma) * (b[i] - mb))) / (sdv(a) * sdv(b)) }
  const rmse = (a, b) => Math.sqrt(mean(a.map((x, i) => (x - b[i]) ** 2)))
  const res = { label, sdObs: sdv(obs), bias: mean(shown.map((x, i) => x - truth[i])), r: cor(shown, truth), cover: mean(cover.map(Number)), rmseShown: rmse(shown, truth), rmseObs: rmse(obs, truth), width: P.width }
  console.log(`  ${label}: composite SD ${res.sdObs.toFixed(1)} | bias ${res.bias.toFixed(2)} | r ${res.r.toFixed(3)} | range covers ${(res.cover * 100).toFixed(1)} % | RMSE shown ${res.rmseShown.toFixed(1)} vs raw composite ${res.rmseObs.toFixed(1)}`)
  return res
}
function rndReset () { R = CekCore.rng(20261121) }
const NEW = { score: r => { const e = CekProfile.iq(r, M); return e }, width: 'from reliability' }
console.log(`sim-cek-iq: ${N} children x ${REPS} replays, 84 months; ladder reliabilities ${['pola', 'bentuk', 'kata'].map(k => k + ' ' + REL[k].toFixed(2)).join(', ')}; true-island r ${RT.toFixed(2)}`)
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok ' + m) } else { fail++; console.log('  ✗ ' + m) } }
if (process.env.QA_OLD) {
  const ctx = { location: { pathname: '/' } }; ctx.globalThis = ctx; vm.createContext(ctx)
  for (const f of ['cek-targets', 'cek-profile']) vm.runInContext(fs.readFileSync(`${process.env.QA_OLD}/${f}.js`, 'utf8'), ctx)
  const OLD = { score: r => { const e = ctx.CekProfile.iq(r, M); return { iq: e.iq, obs: e.iq, lo: e.lo, hi: e.hi } }, width: 'fixed 15' }
  const o = run(OLD, 'old formula (mean z, fixed +-15)')
  ok(Math.abs(o.sdObs - 15) <= 1.5, `RED expected: old composite SD ${o.sdObs.toFixed(1)} within 15 +- 1.5`)
  ok(o.cover >= 0.85 && o.cover <= 0.95, `RED expected: old range coverage ${(o.cover * 100).toFixed(1)} % within 85-95 %`)
}
const n = run(NEW, 'new formula (composite, Kelley, 90 % range)')
ok(Math.abs(n.sdObs - 15) <= 1.5, `Q2 composite SD ${n.sdObs.toFixed(1)} is 15 +- 1.5`)
ok(Math.abs(n.bias) <= 2, `Q2 mean bias of the shown IQ ${n.bias.toFixed(2)} within +-2`)
ok(n.r >= 0.85, `Q2 shown IQ tracks the true score: r ${n.r.toFixed(3)} >= .85`)
ok(n.cover >= 0.85 && n.cover <= 0.95, `Q2 the 90 % range covers the true score ${(n.cover * 100).toFixed(1)} % of the time (85-95)`)
ok(n.rmseShown <= n.rmseObs, `Q2 Kelley estimate is closer to the truth than the raw composite (RMSE ${n.rmseShown.toFixed(2)} <= ${n.rmseObs.toFixed(2)})`)
console.log(`sim-cek-iq: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
