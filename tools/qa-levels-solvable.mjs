#!/usr/bin/env node
// qa-levels-solvable — PRD-25 (docs/prd/PRD-25-validator-keterselesaian-level-di.md): every authored level of the
// data-driven games can be finished, checked in CI on every push, without a browser.
//   L1 Timmy grid boards: tools/qa-tk-grid-levels.mjs part A (independent solver, cross-checked against TKGrid,
//      every board solvable in par, every shorter program fails) exits 0
//   L2 Kereta Pemberani rail mazes: KeretaGrid.verify solves every level, and the reference plan run-length packed
//      fits the level's command slots
//   L3 Mojo chase patterns: over 40 seeds x 200 patterns no row of three blockers and a lane always reachable
//   L4 the checks can fail: a kereta level squeezed to 1 slot and a Mojo pattern made of three barriers are both
//      caught in-process (a validator that cannot fail proves nothing)
// Usage: node tools/qa-levels-solvable.mjs   (also in tools/ci-verify.sh)
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8')
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok', m) } else { fail++; console.log('  ✗', m) } }
const t0 = Date.now()

// L1
{
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools/qa-tk-grid-levels.mjs')], { cwd: ROOT, env: { ...process.env, QA_UI: '0' }, encoding: 'utf8', maxBuffer: 64 << 20 })
  const last = ((r.stdout || '') + (r.stderr || '')).trim().split('\n').pop()
  ok(r.status === 0, 'L1 Timmy grid boards: ' + last)
}

// L2 + L4 (kereta)
const ctx = { console }; ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx)
const kfiles = fs.readdirSync(path.join(ROOT, 'games/data')).filter(n => /^kereta-levels-/.test(n)).map(n => 'games/data/' + n)
for (const f of ['games/kereta-grid.js', ...kfiles]) vm.runInContext(rd(f), ctx, { filename: f })
const KG = ctx.KeretaGrid, LV = ctx.KeretaLevels
const rle = plan => { let n = 0, last = null, c = 0; for (const a of plan) { const k = JSON.stringify(a); if (k === last && c < 9) { c++; continue } n++; last = k; c = 1 } return n }
const keretaBad = lv => {
  const v = KG.verify(lv, { cap: 300000 }), packed = v.plan ? rle(v.plan) : null
  const probs = v.problems.filter(p => !/shortest plan/.test(p))
  return probs.length || packed == null || packed > lv.slots ? `${lv.id}: ${probs.join('; ')} packed ${packed}/${lv.slots}` : null
}
{
  let total = 0; const bad = []
  for (const ch of Object.keys(LV)) for (const lv of LV[ch]) { total++; const b = keretaBad(lv); if (b) bad.push(ch + '/' + b) }
  ok(total >= 64 && !bad.length, `L2 Kereta: ${total} levels solved within their slots${bad.length ? ' - ' + bad.slice(0, 3).join(' | ') : ''}`)
  const first = LV[Object.keys(LV)[0]][0]
  ok(!!keretaBad({ ...first, slots: 1 }), 'L4 a kereta level squeezed to 1 slot is caught')
}

// L3 + L4 (Mojo)
{
  const m = { console, Math }; m.window = m; m.globalThis = m; vm.createContext(m)
  vm.runInContext(rd('games/mojo-chase-rules.js'), m, { filename: 'games/mojo-chase-rules.js' })
  const R = m.MojoChaseRules
  const broken = () => { let n = 0; for (let sd = 1; sd <= 40; sd++) { const sp = R.simPatterns(200, sd); n += sp.threeBlock + sp.unreachable } return n }
  const b = broken()
  ok(b === 0, `L3 Mojo: 40 x 200 patterns, ${b} rows of three blockers or unreachable`)
  const names = Object.keys(R.PATTERNS).filter(n => n !== 'leap'), keep = {}
  for (const n of names) { keep[n] = R.PATTERNS[n]; R.PATTERNS[n] = () => [['barrier', 'barrier', 'barrier']] }
  const caught = broken()
  for (const n of names) R.PATTERNS[n] = keep[n]
  ok(caught > 0, `L4 a pattern of three barriers is caught (${caught} broken rows)`)
}

console.log(`qa-levels-solvable: ${pass} passed, ${fail} failed (${Math.round((Date.now() - t0) / 1000)} s)`)
process.exit(fail ? 1 : 0)
