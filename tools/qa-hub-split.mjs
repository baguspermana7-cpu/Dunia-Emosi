#!/usr/bin/env node
// qa-hub-split — game.js is being split into games/hub/*.js (audit A-18, v64.57). Classic scripts share one global
// scope, so a part only works if the hub page loads it, after game.js, in the order the code was cut, with the same
// cache token (a stale part next to a fresh game.js is two versions of one program), and if the service worker
// precaches it (offline the hub would boot without G14-G16). game.js may only shrink.
// Static, no browser. Usage: node tools/qa-hub-split.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8')

// The cut order. A new part is appended here when it is moved out of game.js.
const ORDER = ['games/hub/g14-g16-trains.js', 'games/hub/g11-kuis-sains.js', 'games/hub/g10-weather.js']
// Ratchet: game.js line count after the last cut. It may fall; lower this number when it does. It may never rise.
const GAME_JS_MAX_LINES = 10829

let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m) } }

const html = rd('index.html').replace(/<!--[\s\S]*?-->/g, '')
const tags = [...html.matchAll(/<script\b[^>]*>/g)].map(m => {
  const src = (m[0].match(/\bsrc="([^"]+)"/) || [])[1] || ''
  return { tag: m[0], file: src.split(/[?#]/)[0], token: (src.match(/\?v=([^"&#]+)/) || [])[1] || '', defer: /\sdefer\b/.test(m[0]) }
})
const game = tags.findIndex(t => t.file === 'game.js')
ok(game >= 0, 'index.html loads game.js')
const gameTag = tags[game] || {}

const onDisk = fs.existsSync(path.join(ROOT, 'games/hub'))
  ? fs.readdirSync(path.join(ROOT, 'games/hub')).filter(f => f.endsWith('.js')).map(f => 'games/hub/' + f).sort() : []
ok(JSON.stringify(onDisk) === JSON.stringify([...ORDER].sort()), `games/hub/*.js on disk = the cut order (disk: ${onDisk.join(', ') || 'none'})`)

const loaded = tags.filter(t => t.file.startsWith('games/hub/'))
ok(JSON.stringify(loaded.map(t => t.file)) === JSON.stringify(ORDER),
  `index.html loads the hub parts once each, in the cut order (loads: ${loaded.map(t => t.file).join(', ') || 'none'})`)

const sw = rd('sw.js')
const shell = (sw.match(/const SHELL = \[([\s\S]*?)\n\]/) || [])[1] || ''
for (const [i, f] of ORDER.entries()) {
  const at = tags.findIndex(t => t.file === f)
  const t = tags[at]
  ok(at >= 0, `${f}: <script> tag in index.html`)
  if (!t) continue
  ok(at === game + 1 + i, `${f}: loads directly after game.js${i ? ' and the parts before it' : ''} (tag #${at}, game.js #${game})`)
  ok(t.defer && gameTag.defer, `${f}: defer, same as game.js`)
  ok(t.token && t.token === gameTag.token, `${f}: ?v=${t.token || '(none)'} matches game.js ?v=${gameTag.token || '(none)'}`)
  ok(shell.includes(`'./${f}?v=${gameTag.token}'`), `${f}: in sw.js SHELL as './${f}?v=${gameTag.token}'`)
}

const lines = rd('game.js').split('\n').length - 1
ok(lines <= GAME_JS_MAX_LINES, `game.js has ${lines} lines, ceiling ${GAME_JS_MAX_LINES} (the ceiling may only fall)`)
if (lines < GAME_JS_MAX_LINES) console.log(`  note: game.js shrank to ${lines} lines: lower GAME_JS_MAX_LINES to ${lines}`)

console.log(`qa-hub-split: ${pass} passed, ${fail} failed (${ORDER.length} hub part(s), game.js ${lines} lines)`)
process.exit(fail ? 1 : 0)
