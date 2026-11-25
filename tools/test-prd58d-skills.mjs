#!/usr/bin/env node
// test-prd58d-skills — PRD-58 D4 (docs/prd/PRD-58-kembangkan-dan-sempurnakan.md): the beranda "main berikutnya" card
// knows the skills the arcade games ask. A weak Pola or Bentuk row used to give no card (no game in SkillGames.MAP).
// Pure: SkillGames.pick in a vm, no browser.
import fs from 'node:fs'; import vm from 'node:vm'
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }
const ctx = { console, document: { getElementById: () => null, addEventListener () {} }, addEventListener () {} }; ctx.window = ctx; vm.createContext(ctx)
vm.runInContext(fs.readFileSync(new URL('../games/data/skill-games.js', import.meta.url), 'utf8'), ctx)
const S = ctx.SkillGames
for (const skill of ['Pola', 'Bentuk']) {
  const p = S.pick({ rows: [{ skill, n: 10, rate: 0.3 }, { skill: 'Penjumlahan', n: 10, rate: 0.9 }], played: [], seed: 'x' })
  ok(p && p.why === 'weak' && p.skill === skill && ['g19', 'g20'].includes(p.game) && S.GAMES[p.game], `D4 weak ${skill} -> ${p && p.game} (${p && p.why}), tile ${p && S.GAMES[p.game]}`)
  const q = S.pick({ rows: [{ skill, n: 10, rate: 0.3 }], played: ['g19'], seed: 'x' })
  ok(q && q.game === 'g20', `D4 weak ${skill}, Pokemon Birds played today -> ${q && q.game}`)
}
console.log(`test-prd58d-skills: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
