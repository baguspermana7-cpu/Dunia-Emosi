#!/usr/bin/env node
/* emoji-inventory.mjs — enumerate every RENDERED emoji across the app.
 * Pictographic ranges only (skips typographic arrows/stars used in comments).
 * Output: EMOJI_INVENTORY.json { total, distinct, unmapped, items:[{ch,cp,count,files,mapped}] }.
 * Run: node tools/emoji-inventory.mjs
 *
 * RATCHET (v64.56, audit A-17): emoji in source that games/data/emoji-map.js has no picture for, counted two ways:
 * "unmapped" (distinct characters) and "unmappedUses" (occurrences). Neither may rise.
 *   node tools/emoji-inventory.mjs --check      exit 1 when either is above tools/emoji-unmapped-baseline.json (no write)
 *   node tools/emoji-inventory.mjs --baseline   record the current counts as the new baseline
 *   QA_PLANT=1 node tools/emoji-inventory.mjs --check   counts one extra unmapped emoji (U+1F9FF): must fail  */
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { HUB_FILES } from './lib/hub-src.mjs'

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..')
const BASELINE = path.join(ROOT, 'tools/emoji-unmapped-baseline.json')
const CHECK = process.argv.includes('--check'), WRITE_BASE = process.argv.includes('--baseline')

// the same EmojiMap the browser uses (normalises VS-16 and skin tones before lookup)
const mapCtx = {}; mapCtx.globalThis = mapCtx; vm.createContext(mapCtx)
vm.runInContext(fs.readFileSync(path.join(ROOT, 'games/data/emoji-map.js'), 'utf8'), mapCtx)
const EmojiMap = mapCtx.EmojiMap

// Pictographic emoji only — the stuff that renders as a colored glyph.
// Deliberately EXCLUDES bare arrows (2190-21FF), stars/symbols in the 2300-27BF
// text-symbol subset that are used as UI typography, keeping the target to true emoji.
const EMOJI_RE = /(?:\p{Extended_Pictographic})/gu

const FILES = [
  'index.html', ...HUB_FILES,   // game.js + games/hub/*.js (A-18 split)
  ...fs.readdirSync(path.join(ROOT, 'games'))
    .filter(f => f.endsWith('.html'))
    .map(f => 'games/' + f),
  // v64.56: the game scripts draw text too (toasts, result cards, canvas labels); emoji-map.js is the map itself
  ...fs.readdirSync(path.join(ROOT, 'games')).filter(f => f.endsWith('.js')).map(f => 'games/' + f),
  ...fs.readdirSync(path.join(ROOT, 'games/data')).filter(f => f.endsWith('.js') && f !== 'emoji-map.js').map(f => 'games/data/' + f),
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
  const raw = fs.readFileSync(abs, 'utf8') + (process.env.QA_PLANT && rel === 'game.js' ? '\n"\u{1F9FF}"' : '')
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
    mapped: EmojiMap.has(ch),
  }))
  .sort((a, b) => b.count - a.count)
const unmapped = items.filter(i => !i.mapped).length
const unmappedUses = items.filter(i => !i.mapped).reduce((a, i) => a + i.count, 0)

if (CHECK) {
  const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8'))
  const head = `emoji-inventory: ${unmapped} distinct unmapped emoji in source (${unmappedUses} uses), baseline ${base.unmapped} (${base.unmappedUses} uses)`
  if (unmapped > base.unmapped || unmappedUses > base.unmappedUses) { console.log(head + ' — FAIL (rose: map the new emoji, drop it, or use an existing icon)'); process.exit(1) }
  console.log(head + (unmapped < base.unmapped || unmappedUses < base.unmappedUses ? ' — PASS (below baseline: lower it with --baseline)' : ' — PASS'))
  process.exit(0)
}
if (WRITE_BASE) {
  fs.writeFileSync(BASELINE, JSON.stringify({ unmapped, unmappedUses, distinct: items.length, recorded: new Date().toISOString().slice(0, 10) }, null, 2) + '\n')
  console.log(`emoji-inventory: baseline recorded, ${unmapped} distinct unmapped emoji, ${unmappedUses} uses`)
}

const out = { generated: 'emoji-inventory', total, distinct: items.length, unmapped, unmappedUses, items }
fs.writeFileSync(path.join(ROOT, 'EMOJI_INVENTORY.json'), JSON.stringify(out, null, 2))
console.log(`emoji inventory: ${total} rendered occurrences, ${items.length} distinct, ${unmapped} unmapped (${unmappedUses} uses)`)
console.log('top 40:')
for (const it of items.slice(0, 40)) console.log(`  ${String(it.count).padStart(5)}  ${it.ch}  ${it.cp}`)
