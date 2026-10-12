// qa-kereta-bgsound.mjs — the train boards' background bed (games/data/kereta-bgsound.js), checked as numbers:
// every scenario's recipe resolves, every bed bakes fast enough for a level start, each loop joins without a click
// (the jump across the seam is no bigger than the bed's own sample-to-sample motion), the mix stays thin (well under
// the SFX) and one-shots are finite and normalised. Run: node tools/qa-kereta-bgsound.mjs
import fs from 'fs'
const W = {}; new Function('window', fs.readFileSync(new URL('../games/data/kereta-bgsound.js', import.meta.url), 'utf8').replace(/\(typeof window !== 'undefined' \? window : globalThis\)\s*$/, '(window)'))(W)
const B = W.KeretaBgSound
let pass = 0, fail = 0; const check = (ok, msg) => { if (ok) pass++; else { fail++; console.log('FAIL ', msg) } }
const amax = a => { let m = 0; for (const v of a) m = Math.max(m, Math.abs(v)); return m }
const rms = a => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length)
// a loop that joins badly is heard as a STEP: in level (the gusts, a voice of the crowd) or in the waveform (a click).
// Both are measured across the seam and must sit inside the bed's own distribution of the same step at every point:
//   level  RMS of 0.25 s before vs after   click  mean of 32 samples before vs after
const circ = (a, i) => a[((i % a.length) + a.length) % a.length]
const win = (a, i, w, f) => { let s = 0; for (let k = 0; k < w; k++) s += f(circ(a, i + k)); return s / w }
const lvl = (a, i) => { const w = B.SR >> 2; return Math.abs(Math.sqrt(win(a, i - w, w, v => v * v)) - Math.sqrt(win(a, i, w, v => v * v))) }
const clk = (a, i) => Math.abs(win(a, i - 32, 32, v => v) - win(a, i, 32, v => v))
// (points away from the seam only: the seam must not vouch for itself)
const p99 = (a, f) => { const d = [], m = B.SR; for (let i = m; i < a.length - m; i += 211) d.push(f(a, i)); d.sort((x, y) => x - y); return d[Math.floor(d.length * 0.99)] }
const baked = {}
for (const story of ['brave', 'malivlak', 'hellbent']) for (const mood of ['sun', 'sunset', 'rain', 'storm', 'night', 'dream']) for (const terr of ['meadow', 'mountain', 'gorge', 'logging', 'depot', 'town', 'cloud']) {
  const rc = B.recipe(story, mood, terr), tag = `${story}/${mood}/${terr}`
  check(rc.beds.length >= 2 && rc.beds.every(b => B.BEDS[b.k]) && rc.ev.every(e => B.EVENTS[e.k] && e.every > 3), `${tag}: recipe names known beds and events`)
  check(rc.beds.some(b => b.k === 'pad'), `${tag}: a music pad under the scene`)
  let mix = 0
  for (const b of rc.beds) {
    const id = b.k + JSON.stringify(b.o || {})
    if (!baked[id]) { const t = Date.now(), d = B.BEDS[b.k](b.o || {}); baked[id] = { d, ms: Date.now() - t } }
    const { d } = baked[id]; mix += (rms(d.L) * b.g) ** 2
  }
  const out = Math.sqrt(mix) * B.MASTER
  check(out > 0.008 && out < 0.06, `${tag}: the bed is thin, under the SFX (rms ${out.toFixed(4)})`)
}
for (const [id, { d, ms }] of Object.entries(baked)) {
  check(ms < 900, `${id}: bakes in ${ms} ms`)
  for (const ch of [d.L, d.R]) {
    check(ch.every(Number.isFinite) && amax(ch) <= 0.951, `${id}: finite and never clips`)
    for (const [f, what] of [[lvl, 'a jump in level'], [clk, 'a click']]) {
      const seam = f(ch, 0), lim = p99(ch, f) * 1.2
      check(seam <= lim, `${id}: the loop joins without ${what} (seam ${seam.toFixed(4)} <= ${lim.toFixed(4)})`)
    }
  }
}
for (const k of Object.keys(B.EVENTS)) for (let s = 1; s <= 5; s++) {
  const a = B.peakNorm(B.EVENTS[k](B.rng(s * 97))), pk = amax(a)
  check(a.length > 0 && a.every(Number.isFinite) && Math.abs(pk - 1) < 1e-6 && Math.abs(a[a.length - 1]) < 0.05, `${k} #${s}: finite, normalised, ends quiet`)
}
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0)
