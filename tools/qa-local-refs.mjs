#!/usr/bin/env node
// qa-local-refs — every local <script src>, <link href> and the service worker's precache list point at files that
// exist. A missing script is a page that loads blank on a child's tablet; a missing precache entry makes the
// install fail (cache.addAll is atomic). Static, no browser: runs in CI before deploy.
// Usage: node tools/qa-local-refs.mjs
import fs from 'fs'
import path from 'path'
const pages = ['index.html'].concat(fs.readdirSync('games').filter(f => f.endsWith('.html')).map(f => 'games/' + f))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m) } }
const local = u => u && !/^(https?:|data:|blob:|\/\/|#|mailto:|javascript:)/i.test(u) && !u.includes('${') && !u.includes("'+")
const file = (from, u) => decodeURIComponent(path.normalize(path.join(path.dirname(from), u.split(/[?#]/)[0])))
for (const pg of pages) {
  const html = fs.readFileSync(pg, 'utf8').replace(/<!--[\s\S]*?-->/g, '')
  const refs = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi), ...html.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["']/gi)].map(m => m[1]).filter(local)
  for (const u of refs) ok(fs.existsSync(file(pg, u)), `${pg}: ${u} does not exist`)
}
const sw = fs.readFileSync('sw.js', 'utf8')
const shell = [...sw.matchAll(/'(\.\/[^']+)'/g)].map(m => m[1])
for (const u of shell) ok(fs.existsSync(file('sw.js', u)), `sw.js precache: ${u} does not exist`)
console.log(`qa-local-refs: ${pass}/${pass + fail} checks passed (${pages.length} pages, ${shell.length} precache entries)`)
process.exit(fail ? 1 : 0)
