#!/usr/bin/env node
// PRD-58 G3 (6.6): motion polish laws, every game.
//   M1  no `transition: all` in any stylesheet or game page (it animates layout properties on cheap tablets; list the
//       properties that change instead)
//   (M2, no screen shake on a wrong answer, was withdrawn: PRD-58B B1 made that shake play on purpose so a wrong
//    answer shows with the sound off; qa-prd58b-feel keeps it)
//   M3  nothing is seen at `scale(0)` (nothing appears from nothing; an entrance starts at scale(.4))
// M1/M3 read the sources (CSS files, <style> in pages, CSS strings in JS, WAAPI frames). No browser needed.
import fs from 'node:fs'
import path from 'node:path'
let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.name.startsWith('_') || e.name === 'vendor' || e.name === 'node_modules' ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)])
const files = ['style.css', 'index.html', 'game.js', ...walk('games').filter(f => /\.(css|html|js)$/.test(f))]
const hits = re => files.flatMap(f => fs.readFileSync(f, 'utf8').split('\n').map((l, i) => re.test(l) ? `${f}:${i + 1}` : null).filter(Boolean))
const all = hits(/transition\s*:\s*all\b/).filter(h => !/games\/film\//.test(h))
ok(!all.length, `M1 no "transition: all" (${all.length}${all.length ? ': ' + all.slice(0, 6).join(' ') + (all.length > 6 ? ' ...' : '') : ''})`)
// M3: scale(0) only where the same block (keyframe stop, rule or WAAPI frame) is also opacity 0 or display none,
// so nothing is ever SEEN at zero size. Exempt by name: battle-arena.js (a fighter recalled into and released from its
// ball: shrinking to nothing is the picture), games/film/ (a third-party Flash export).
const M3_EXEMPT = /games\/battle-arena\.js$|games\/film\//
const s0 = files.filter(f => !M3_EXEMPT.test(f)).flatMap(f => {
  const t = fs.readFileSync(f, 'utf8'), out = []
  for (const m of t.matchAll(/(?<![a-z-])scale\(\s*0\s*\)/g)) {
    const a = t.lastIndexOf('{', m.index), z = t.indexOf('}', m.index), blk = t.slice(a + 1, z)
    if (/opacity\s*:\s*['"]?0(?![.\d])|display\s*:\s*none/.test(blk)) continue
    out.push(f + ':' + (t.slice(0, m.index).split('\n').length))
  }
  return out
})
ok(!s0.length, `M3 nothing is seen at scale(0) (${s0.length}${s0.length ? ': ' + s0.slice(0, 8).join(' ') + (s0.length > 8 ? ' ...' : '') : ''})`)

console.log(`qa-prd58g-motion: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
