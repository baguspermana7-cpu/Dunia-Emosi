#!/usr/bin/env node
// qa-hub-img-size — every <img> on the hub page carries width AND height, so the browser reserves its box before the
// file arrives and the hub does not jump while images load (audit A-16).
//   index.html: every <img> tag (multi-line tags too: a line grep missed 9 of the 44) has width= and height=
//   game.js: no hub-tile template (.game-tile / .wn-icon markup) builds an <img> without both
// Static, no browser. Built 2026-11-15.
// Usage: node tools/qa-hub-img-size.mjs
import fs from 'fs'
import { HUB_FILES, hubSource } from './lib/hub-src.mjs'
import path from 'path'
const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..')
let fail = 0
// comments and script bodies are not hub markup (a script builds its images at run time)
const markup = s => s.replace(/<!--[\s\S]*?-->/g, '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
const sized = tag => /\swidth\s*=/i.test(tag) && /\sheight\s*=/i.test(tag)

const idx = markup(fs.readFileSync(path.join(root, 'index.html'), 'utf8'))
const tags = idx.match(/<img\b[^>]*>/gi) || []
const bare = tags.filter(t => !sized(t))
for (const t of bare.slice(0, 10)) console.log('  ✗ index.html:', t.replace(/\s+/g, ' ').slice(0, 140))
if (bare.length) fail++
console.log(`  index.html: ${tags.length} <img>, ${bare.length} without width and height`)

// game.js: any template literal or string that makes hub-tile markup with an <img>
const js = hubSource()   // game.js + games/hub/*.js (A-18 split)
const tileImgs = (js.match(/<img\b[^>]*\b(?:game-tile|wn-icon)\b[^>]*>/gi) || []).concat(
  (js.match(/class=["'][^"']*\b(?:game-tile|wn-icon)\b[^"']*["'][^<]{0,200}<img\b[^>]*>/gi) || []).map(s => s.slice(s.indexOf('<img'))))
const bareJs = tileImgs.filter(t => !sized(t))
for (const t of bareJs.slice(0, 10)) console.log('  ✗ hub code tile:', t.slice(0, 140))
if (bareJs.length) fail++
console.log(`  hub code (${HUB_FILES.join(' + ')}): ${tileImgs.length} hub-tile <img> templates, ${bareJs.length} without width and height`)

console.log(`qa-hub-img-size: ${fail ? 'FAIL' : 'PASS'}`)
process.exit(fail ? 1 : 0)
