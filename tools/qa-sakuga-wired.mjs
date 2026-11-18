#!/usr/bin/env node
// qa-sakuga-wired — PRD-46 law L1 (static, no browser): the hub and every game page load the vendored Sakuga core and
// our button module, in that order, and both are in the sw.js SHELL precache so the effects work offline.
//   per page : a `core.js` tag (games/vendor/sakuga/) then a `dunia-sakuga.js` tag, both `defer`, token = the page's
//              own shared-file token (normalize-cache-tokens keeps them one value)
//   sw.js    : SHELL lists both files with that token
//   files    : both exist; the vendored core keeps its MIT notice + upstream commit; THIRD_PARTY.md records it
//   module   : never calls the katakana lettering (sfx / hollow / dotted): children of 5-10 cannot read it
// Exempt: `_*.html` test fixtures. blippi.html is only a wrapper but still loads them (the PRD counts it).
// Usage: node tools/qa-sakuga-wired.mjs
import fs from 'node:fs'
const pages = ['index.html', ...fs.readdirSync('games').filter(f => f.endsWith('.html') && !f.startsWith('_')).sort().map(f => 'games/' + f)]
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m) } }
const sw = fs.readFileSync('sw.js', 'utf8')
const CORE = /<script\s+src="((?:games\/)?vendor\/sakuga\/core\.js)\?v=([^"]+)"\s+defer\s*>\s*<\/script>/
const MOD = /<script\s+src="((?:games\/)?data\/dunia-sakuga\.js)\?v=([^"]+)"\s+defer\s*>\s*<\/script>/
let tokens = new Set()
for (const pg of pages) {
  const s = fs.readFileSync(pg, 'utf8'), pre = pg === 'index.html' ? 'games/' : ''
  const c = CORE.exec(s), m = MOD.exec(s)
  ok(c && c[1] === pre + 'vendor/sakuga/core.js', `${pg}: no defer script tag for vendor/sakuga/core.js`)
  ok(m && m[1] === pre + 'data/dunia-sakuga.js', `${pg}: no defer script tag for data/dunia-sakuga.js`)
  ok(c && m && c.index < m.index, `${pg}: core.js must come before dunia-sakuga.js`)
  if (c && m) { ok(c[2] === m[2], `${pg}: the two tags carry different tokens (${c[2]} / ${m[2]})`); tokens.add(m[2]) }
}
ok(tokens.size === 1, `one token across all pages, got ${[...tokens].join(' ')}`)
const tok = [...tokens][0]
for (const f of ['games/vendor/sakuga/core.js', 'games/data/dunia-sakuga.js']) {
  ok(sw.includes(`'./${f}?v=${tok}'`), `sw.js SHELL lacks ./${f}?v=${tok}`)
  ok(fs.existsSync(f), `${f} is missing`)
}
const core = fs.readFileSync('games/vendor/sakuga/core.js', 'utf8')
ok(/c3dabb173928a3ad2372183103caf2e6f50953d0/.test(core.slice(0, 600)) && /MIT License/.test(core.slice(0, 1800)) && /Permission is hereby granted/.test(core.slice(0, 2400)), 'vendored core.js lost its upstream commit or MIT notice')
ok(fs.existsSync('games/vendor/sakuga/LICENSE'), 'games/vendor/sakuga/LICENSE is missing')
ok(/window\.SakugaFX\s*=/.test(core), 'vendored core.js no longer defines window.SakugaFX')
ok(/c3dabb173928a3ad2372183103caf2e6f50953d0/.test(fs.existsSync('THIRD_PARTY.md') ? fs.readFileSync('THIRD_PARTY.md', 'utf8') : ''), 'THIRD_PARTY.md does not record the Sakuga commit')
const mod = fs.readFileSync('games/data/dunia-sakuga.js', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
ok(!/\.(sfx|hollow|dotted)\s*\(/.test(mod), 'dunia-sakuga.js calls the katakana lettering (sfx / hollow / dotted)')
ok(!/https?:\/\//.test(mod), 'dunia-sakuga.js names a remote URL')
console.log(`qa-sakuga-wired: ${pass}/${pass + fail} checks passed (${pages.length} pages)`)
process.exit(fail ? 1 : 0)
