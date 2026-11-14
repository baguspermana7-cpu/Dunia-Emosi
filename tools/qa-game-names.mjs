#!/usr/bin/env node
// qa-game-names — audit 2026-11-14 A-8: a game has one name. The name the hub tile shows is the name every other
// screen (level select, dashboard) shows, taken from GAME_META in game.js. Static, no browser.
// Usage: node tools/qa-game-names.mjs
import fs from 'fs'
const html = fs.readFileSync('index.html', 'utf8').replace(/<!--[\s\S]*?-->/g, '')
const js = fs.readFileSync('game.js', 'utf8')
const metaSrc = js.slice(js.indexOf('const GAME_META'), js.indexOf('}', js.indexOf("'13c'", js.indexOf('const GAME_META'))) + 2)
const meta = {}
for (const m of metaSrc.matchAll(/(?:^|[\s,{])'?(\w+)'?\s*:\s*\{[^}]*?name\s*:\s*'([^']+)'/g)) meta[m[1]] = m[2]
let pass = 0, fail = 0, seen = 0
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m) } }
for (const m of html.matchAll(/id="gtile-(\w+)"[\s\S]*?class="wmap-node-name">([^<]+)</g)) {
  const id = m[1], tile = m[2].trim()
  if (!(id in meta)) continue
  seen++
  ok(meta[id] === tile, `G${id}: hub tile says "${tile}", GAME_META says "${meta[id]}"`)
}
ok(seen >= 10, `found ${seen} hub tiles with a GAME_META entry (parser sanity)`)
console.log(`qa-game-names: ${pass} passed, ${fail} failed (${Object.keys(meta).length} GAME_META names)`)
process.exit(fail ? 1 : 0)
