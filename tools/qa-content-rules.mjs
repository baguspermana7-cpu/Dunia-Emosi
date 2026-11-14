#!/usr/bin/env node
// qa-content-rules — PRD-27 (docs/prd/PRD-27-gate-aturan-konten-lintas.md), static part, no browser.
//   L3 every people sprite the code can show (assets/db/people via 'people/N' keys) is one a human reviewed and passed
//      (tools/people-reviewed.json 'ok'); a random pick from the people pack is not allowed at all (it could land on one of
//      the many women and girls without hijab in that pack)
// (rendered emoji: tools/qa-no-emoji.mjs; white sticker outline: tools/qa-white-outline.mjs — PRD-27 part 2)
// Usage: node tools/qa-content-rules.mjs   (also in tools/ci-verify.sh)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8')
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok', m) } else { fail++; console.log('  ✗', m) } }
const files = ['game.js', 'index.html', ...fs.readdirSync(path.join(ROOT, 'games')).filter(f => /\.(js|html)$/.test(f)).map(f => 'games/' + f),
  ...fs.readdirSync(path.join(ROOT, 'games/data')).filter(f => f.endsWith('.js')).map(f => 'games/data/' + f)]
const rev = JSON.parse(rd('tools/people-reviewed.json'))
const used = new Map(), randomPicks = []
for (const f of files) {
  const s = rd(f)
  for (const m of s.matchAll(/['"]people\/(\d+)['"]/g)) { const n = String(+m[1]); if (!used.has(n)) used.set(n, f) }
  if (/\b(pick|path|sprite|src)\(\s*['"]people['"]/.test(s)) randomPicks.push(f)
}
const bad = [...used].filter(([n]) => !rev.ok[n]).map(([n, f]) => `people/${n} in ${f} (${rev.blocked[n] || 'not reviewed'})`)
ok(!bad.length, `L3 ${used.size} people sprites in use, all reviewed and passed${bad.length ? ' - ' + bad.join('; ') : ''}`)
ok(!randomPicks.length, `L3 no random pick from the people pack${randomPicks.length ? ' - ' + randomPicks.join(', ') : ''}`)
console.log(`qa-content-rules: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
