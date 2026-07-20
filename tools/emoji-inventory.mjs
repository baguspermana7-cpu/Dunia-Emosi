#!/usr/bin/env node
/* emoji-inventory.mjs — enumerate every RENDERED emoji across the app.
 * Pictographic ranges only (skips typographic arrows/stars used in comments).
 * Output: EMOJI_INVENTORY.json { total, distinct, items:[{ch,cp,count,files}] }.
 * Run: node tools/emoji-inventory.mjs                                          */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..')

// Pictographic emoji only — the stuff that renders as a colored glyph.
// Deliberately EXCLUDES bare arrows (2190-21FF), stars/symbols in the 2300-27BF
// text-symbol subset that are used as UI typography, keeping the target to true emoji.
const EMOJI_RE = /(?:\p{Extended_Pictographic})/gu

const FILES = [
  'index.html', 'game.js',
  ...fs.readdirSync(path.join(ROOT, 'games'))
    .filter(f => f.endsWith('.html'))
    .map(f => 'games/' + f),
]

// Strip JS/HTML comments so glyphs living only in comments are not counted as rendered.
function stripComments(src, isJs) {
  let s = src
  if (isJs) {
    s = s.replace(/\/\*[\s\S]*?\*\//g, ' ')     // block comments
    s = s.replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')  // line comments (naive, keeps http:)
  } else {
    s = s.replace(/<!--[\s\S]*?-->/g, ' ')        // html comments
  }
  return s
}

const map = new Map() // ch -> { count, files:Set }
let total = 0

for (const rel of FILES) {
  const abs = path.join(ROOT, rel)
  if (!fs.existsSync(abs)) continue
  const raw = fs.readFileSync(abs, 'utf8')
  const src = stripComments(raw, rel.endsWith('.js'))
  const found = src.match(EMOJI_RE)
  if (!found) continue
  for (const ch of found) {
    total++
    let e = map.get(ch)
    if (!e) { e = { count: 0, files: new Set() }; map.set(ch, e) }
    e.count++
    e.files.add(rel)
  }
}

const items = [...map.entries()]
  .map(([ch, e]) => ({
    ch,
    cp: [...ch].map(c => 'U+' + c.codePointAt(0).toString(16).toUpperCase()).join(' '),
    count: e.count,
    files: [...e.files].sort(),
  }))
  .sort((a, b) => b.count - a.count)

const out = { generated: 'emoji-inventory', total, distinct: items.length, items }
fs.writeFileSync(path.join(ROOT, 'EMOJI_INVENTORY.json'), JSON.stringify(out, null, 2))
console.log(`emoji inventory: ${total} rendered occurrences, ${items.length} distinct`)
console.log('top 40:')
for (const it of items.slice(0, 40)) console.log(`  ${String(it.count).padStart(5)}  ${it.ch}  ${it.cp}`)
