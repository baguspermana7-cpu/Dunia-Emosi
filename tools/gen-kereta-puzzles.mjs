// Rebuilds the board of every SINGLE-TRAIN Kereta Pemberani level as a real 2D route puzzle (owner 2026-10-10: "levels are not puzzles").
//   node tools/gen-kereta-puzzles.mjs [--write] [id ...]
// For each level: the old rail line is linearised (end to end), its specials (gates, critters, wagons, pins, the train) and the things
// beside it (cargo, stops, levers) keep their ORDER along the route, and the route is re-laid as a serpentine of 2 or 3 lanes on a
// 12 x 5..7 board, so the child has to TURN (kiri / kanan) at every lane end; a dead-end spur or two are decoys (a wrong branch).
// `order` keeps the reading order of gates / levers / critters pointing at the same data arrays; slots = shortest plan + 3.
// Levels that are not one simple line (two-train levels, branching rails) are reported and left for hand design.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..')
const write = process.argv.includes('--write'), only = process.argv.slice(2).filter(a => !a.startsWith('--'))
const files = ['malivlak', 'brave', 'hellbent'].map(c => `games/data/kereta-levels-${c}.js`)
const ctx = { console }; ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx)
import { execSync } from 'node:child_process'
const fromGit = !!process.env.FROM_HEAD, L3 = (process.env.FORCE_L3 || '').split(',')
for (const f of ['games/kereta-grid.js', ...files]) vm.runInContext(fromGit && f.includes('levels') ? execSync(`git show HEAD:${f}`, { cwd: ROOT }).toString() : fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx)
const KG = ctx.KeretaGrid, LV = ctx.KeretaLevels
const RAIL = KG.RAIL, DR = [-1, 0, 1, 0], DC = [0, 1, 0, -1], HEAD = { N: 0, E: 1, S: 2, W: 3 }
const hash = (a, b, k) => { let h = (a * 73856093) ^ (b * 19349663) ^ (k * 83492791); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296 }
const rle = plan => { let n = 0, last = null, c = 0; for (const a of plan) { const k = JSON.stringify(a); if (k === last && c < 9) { c++; continue } n++; last = k; c = 1 } return n }

function analyse (lv) {
  const wag = lv.wagons || {}, rows = lv.rows, R = rows.length, C = rows[0].length
  const isPath = ch => RAIL.includes(ch) || /[12ZYXGCW]/.test(ch) || !!wag[ch]
  const cells = {}; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (isPath(rows[r][c])) cells[r + ',' + c] = [r, c]
  const nb = ([r, c]) => [0, 1, 2, 3].map(d => cells[(r + DR[d]) + ',' + (c + DC[d])]).filter(Boolean)
  const ends = Object.values(cells).filter(p => nb(p).length === 1)
  if (Object.values(cells).some(p => nb(p).length > 2) || ends.length !== 2) return null
  let seq = [ends[0]], prev = null
  while (true) { const cur = seq[seq.length - 1], nxt = nb(cur).find(q => !prev || q[0] !== prev[0] || q[1] !== prev[1]); if (!nxt || seq.length > Object.keys(cells).length) break; prev = cur; seq.push(nxt) }
  if (seq.length !== Object.keys(cells).length) return null
  const ti = seq.findIndex(([r, c]) => rows[r][c] === '1'); if (ti < 0) return null
  const d = HEAD[(lv.trains[0].dir) || 'E'], fwd = seq[ti + 1], bwd = seq[ti - 1]
  const isF = q => q && q[0] === seq[ti][0] + DR[d] && q[1] === seq[ti][1] + DC[d]
  if (!isF(fwd)) { if (isF(bwd)) seq.reverse(); else return null }
  const t = seq.findIndex(([r, c]) => rows[r][c] === '1')
  // old reading order of gates / levers / critters
  const oldIdx = { G: {}, l: {}, C: {} }, cnt = { G: 0, l: 0, C: 0 }
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { const ch = rows[r][c]; if (cnt[ch] != null) oldIdx[ch][r + ',' + c] = cnt[ch]++ }
  const special = [], beside = [], types = []
  seq.forEach(([r, c], i) => { const ch = rows[r][c]; if (RAIL.includes(ch)) types.push(ch); else { types.push('='); special.push({ i, ch, old: oldIdx[ch] ? oldIdx[ch][r + ',' + c] : null }) } })
  const onPath = new Set(Object.keys(cells))
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const ch = rows[r][c]; if (onPath.has(r + ',' + c) || /[,.T~#RV ]/.test(ch)) continue
    let ref = -1; for (let d2 = 0; d2 < 4 && ref < 0; d2++) { const k = (r + DR[d2]) + ',' + (c + DC[d2]); if (onPath.has(k)) ref = seq.findIndex(q => q[0] + ',' + q[1] === k) }
    beside.push({ ch, ref: Math.max(0, ref), old: oldIdx[ch] ? oldIdx[ch][r + ',' + c] : null })
  }
  return { N: seq.length, t, nw: lv.trains[0].wagons || 0, special, beside, types, water: rows.join('').split('~').length - 1 }
}

function build (lv, info, tier) {
  const L = tier < 0.34 ? 2 : 3, nw = info.nw
  const target = L === 2 ? Math.max(info.N + 4, 16) : Math.max(info.N + 8, 24)
  const W = Math.max(Math.max(6, nw + 4), Math.min(10, Math.round(target / L))), C = W + 2, R = 2 * L + 1
  const path = []
  for (let k = 0; k < L; k++) {
    const row = 1 + 2 * k, east = k % 2 === 0
    for (let j = 0; j < W; j++) path.push([row, east ? j : W - 1 - j])
    if (k < L - 1) path.push([row + 1, east ? W - 1 : 0])
  }
  const N = path.length, g = Array.from({ length: R }, () => Array(C).fill(','))
  const used = new Set(), pidx = {}
  path.forEach(([r, c], i) => { pidx[r + ',' + c] = i })
  const scale = i => Math.round(i * (N - 1) / Math.max(1, info.N - 1))
  const take = (want, lo = 0) => { for (let dd = 0; dd < N; dd++) for (const j of [want + dd, want - dd]) if (j >= lo && j < N && !used.has(j)) { used.add(j); return j } return -1 }
  const t2 = Math.min(Math.max(nw, scale(info.t)), W - 3)
  for (let i = 0; i <= t2; i++) used.add(i)   // the train and its wagons stand on the first lane
  const placed = []
  for (const s of info.special) {
    if (s.ch === '1') { placed.push({ i: t2, ch: '1' }); continue }
    if (s.ch === 'Z' && s.i === info.N - 1) { used.add(N - 1); placed.push({ i: N - 1, ch: 'Z', old: null }); continue }
    const j = take(Math.max(t2 + 1, scale(s.i)), s.i < info.t ? 0 : t2 + 1); if (j < 0) return null
    placed.push({ i: j, ch: s.ch, old: s.old })
  }
  path.forEach(([r, c], i) => { g[r][c] = info.types[Math.min(info.N - 1, Math.round(i * (info.N - 1) / (N - 1)))] || '=' })
  // wagons behind the train: plain rail (the engine puts them there)
  for (const p of placed) { const [r, c] = path[p.i]; g[r][c] = p.ch }
  // things beside the route: stand on grass next to the cell they belonged to, alternating sides
  const free = (r, c) => r >= 0 && c >= 0 && r < R && c < C && g[r][c] === ',' && !(r in {}) && !(pidx[r + ',' + c] != null)
  let flip = 0
  const claimed = new Set()
  for (const b of info.beside) {
    const want = Math.min(N - 2, Math.max(t2 + 1, scale(b.ref))); let ok = false
    for (let dd = 0; dd < N && !ok; dd++) for (const j of [want + dd, want - dd]) {
      if (j < 1 || j >= N - 1 || ok) continue
      const [r, c] = path[j], sides = flip % 2 ? [[1, 0], [-1, 0]] : [[-1, 0], [1, 0]]
      for (const [dr, dc] of sides) { const rr = r + dr, cc = c + dc; if (free(rr, cc) && !claimed.has(rr + ',' + cc)) { g[rr][cc] = b.ch; b.pos = [rr, cc]; claimed.add(rr + ',' + cc); ok = true; break } }
    }
    flip++; if (!ok) return null
  }
  // decoy spurs (a wrong branch that ends at a buffer): above lane 1 and, on tall boards, below the last lane
  const spurs = tier < 0.15 ? 1 : 2
  const tryS = (r0, dr, cols) => { for (const c of cols) { const r1 = r0 + dr; if (g[r1] && g[r1][c] === ',' && g[r0][c] === '=' && !claimed.has(r1 + ',' + c)) { g[r1][c] = '='; return true } } return false }
  const cols = []; for (let c = t2 + 2; c < W - 1; c++) cols.push(c)
  cols.sort((a, b) => hash(a, 3, lv.n || 1) - hash(b, 3, lv.n || 1))
  tryS(1, -1, cols)
  if (spurs > 1) { const lastRow = 1 + 2 * (L - 1); const cs2 = []; for (let c = 1; c < W - 1; c++) cs2.push(c); cs2.sort((a, b) => hash(a, 9, lv.n || 1) - hash(b, 9, lv.n || 1)); tryS(lastRow, 1, cs2) }
  // scenery
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (g[r][c] === ',' && hash(r, c, lv.n || 7) > 0.84) g[r][c] = (info.water > 4 && (r === 0 || r === R - 1)) ? '~' : 'T'
  const rows = g.map(r => r.join(''))
  const items = []   // everything carrying an index into lv.gates / lv.levers / lv.critters
  for (const p of placed) if ((p.ch === 'G' || p.ch === 'C') && p.old != null) items.push({ ch: p.ch, pos: path[p.i], old: p.old })
  for (const b of info.beside) if (b.ch === 'l') items.push({ ch: 'l', pos: b.pos, old: b.old })
  const order = { G: [], l: [], C: [] }
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { const ch = g[r][c]; if (!order[ch]) continue; const it = items.find(x => x.ch === ch && x.pos[0] === r && x.pos[1] === c); order[ch].push(it ? it.old : order[ch].length) }
  return { rows, order, R, C }
}

const fixSlots = process.argv.includes('--slots')
const report = []
const srcOf = { malivlak: files[0], brave: files[1], hellbent: files[2] }, patches = {}
for (const ch of Object.keys(LV)) for (const lv of LV[ch]) {
  if (only.length && !only.includes(lv.id)) continue
  const m = lv.mode || 'solo'
  if (fixSlots) { const plan = KG.solve(KG.world({ ...lv, slots: 99 }), { cap: 600000, maxDepth: 60 }); if (!plan) { report.push(`${lv.id}: NO PLAN`); continue } const pk = rle(plan); report.push(`${lv.id}: plan ${plan.length} packed ${pk} kinds ${new Set(plan.flatMap(a => Object.values(a))).size}`); patches[lv.id] = { ch, slotsOnly: true, slots: pk + 3 }; continue }
  if (m !== 'solo') { report.push(`${lv.id}: two-train (hand design)`); continue }
  const info = analyse(lv); if (!info) { report.push(`${lv.id}: not a single line (hand design)`); continue }
  const tier = (lv.n - 1) / Math.max(1, LV[ch].length - 1)
  let b = null, plan = null
  for (const bump of [0, 0.2, 0.4]) {
    const tt = Math.min(0.9, (L3.includes(lv.id) ? 0.5 : tier) + bump); b = build(lv, analyse(lv), tt); if (!b) continue
    const t = { ...lv, rows: b.rows, order: b.order, slots: 99 }; const w = KG.world(t)
    if (KG.lint(t).length) { b = null; continue }
    plan = KG.solve(w, { cap: 500000, maxDepth: 60 }); if (plan && new Set(plan.flatMap(a => Object.values(a))).size >= (lv.n <= 3 ? 2 : 3)) break; b = null; plan = null
  }
  if (!b || !plan) { report.push(`${lv.id}: no solvable layout (hand design)`); continue }
  const packed = rle(plan), kinds = new Set(plan.map(a => Object.values(a)[0])), turns = plan.filter(a => ['kiri', 'kanan', 'tuas', 'wesel', 'putar'].includes(Object.values(a)[0])).length
  report.push(`${lv.id}: ${b.R}x${b.C} plan ${plan.length} packed ${packed} kinds ${kinds.size} turns ${turns}`)
  patches[lv.id] = { ch, rows: b.rows, order: b.order, slots: packed + 3 }
}
console.log(report.join('\n'))
if (write) {
  for (const f of files) {
    let s = fs.readFileSync(path.join(ROOT, f), 'utf8')
    for (const [id, p] of Object.entries(patches)) {
      if (srcOf[p.ch] !== f) continue
      const a = s.indexOf(`id: '${id}'`); if (a < 0) continue
      let e = s.indexOf('\n  L({', a + 5); if (e < 0) e = s.indexOf('\n  /*', a + 5); if (e < 0) e = s.length
      let seg = s.slice(a, e)
      if (p.slotsOnly) { seg = seg.replace(/slots: \d+/, 'slots: ' + p.slots); s = s.slice(0, a) + seg + s.slice(e); continue }
      const rowsTxt = 'rows: [' + p.rows.map(r => `'${r}'`).join(', ') + '], order: ' + JSON.stringify(p.order).replace(/"/g, '') + ','
      seg = seg.replace(/rows: \[[^\]]*\],(\s*order: \{[^}]*\}\s*\}?,)?/, rowsTxt).replace(/slots: \d+/, 'slots: ' + p.slots)
      s = s.slice(0, a) + seg + s.slice(e)
    }
    fs.writeFileSync(path.join(ROOT, f), s)
  }
  console.log('patched', Object.keys(patches).length, 'levels')
}
