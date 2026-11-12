// qa-speedlines-fx.mjs — node-only laws for games/speedlines-fx.js (shared turbo speed lines, 5 games)
//   1. a game that calls hold(key, 0) every frame without ever boosting never clears (= re-uploads) the full-screen
//      canvas and leaves no loop running (2026-11-13: it cleared once per frame, ~2 s of every 3 s spent copying canvases
//      in headless software compositing; red on the old file: 120 clears in 120 frames)
//   2. turbo draws every frame, release clears it and stops the loop   3. a burst fades out and ends on a clear
//   node tools/qa-speedlines-fx.mjs [path/to/speedlines-fx.js]
import vm from 'node:vm'; import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
const src = fs.readFileSync(process.argv[2] || fileURLToPath(new URL('../games/speedlines-fx.js', import.meta.url)), 'utf8')
let now = 0, q = [], clears = 0, fills = 0
const cx = { setTransform() {}, clearRect() { clears++ }, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() { fills++ } }
const doc = { body: { appendChild() {} }, createElement: () => ({ setAttribute() {}, style: {}, getContext: () => cx }) }
const W = { document: doc, innerWidth: 800, innerHeight: 600, devicePixelRatio: 1, performance: { now: () => now }, matchMedia: () => ({ matches: false }),
  requestAnimationFrame: f => { q.push(f); return q.length } }
vm.runInNewContext(src, { window: W, Math })
const frames = n => { for (let i = 0; i < n; i++) { now += 16; const f = q; q = []; f.forEach(g => g(now)) } }
let ok = true; const law = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); ok = ok && c }
// 1. a game releasing a hold it never took, every frame, for 120 frames
clears = 0; for (let i = 0; i < 120; i++) { W.SpeedLines.hold('g', 0); frames(1) }
law(clears === 0 && q.length === 0, `idle hold(key,0) x120 frames: ${clears} clears, loop ${q.length ? 'running' : 'stopped'}`)
// 2. turbo for 30 frames then release: drawn, cleared once, loop stops
fills = 0; clears = 0; for (let i = 0; i < 30; i++) { W.SpeedLines.hold('g', 1); frames(1) }
const drawn = fills; W.SpeedLines.hold('g', 0); frames(3)
law(drawn >= 29 && W.SpeedLines.level() === 0 && q.length === 0 && clears >= 1, `turbo 30 frames: ${drawn} draws, after release level ${W.SpeedLines.level()}, loop ${q.length ? 'running' : 'stopped'}, clears ${clears}`)
// 3. a burst fades out and leaves a clean canvas (last op is a clear after the last fill)
let ops = []; cx.fill = () => ops.push('f'); cx.clearRect = () => ops.push('c')
W.SpeedLines.burst({ dur: 300 }); frames(40)
law(ops.includes('f') && ops[ops.length - 1] === 'c' && q.length === 0, `burst: drew ${ops.filter(o => o === 'f').length} frames, ends cleared, loop stopped`)

console.log(ok ? 'qa-speedlines-fx: ALL PASS' : 'qa-speedlines-fx: FAILED')
process.exit(ok ? 0 : 1)
