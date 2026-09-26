// G27 asset + audio coverage. The gate that would have caught the two files
// the Film installer never downloaded, applied before the game ships rather
// than after a child finds the gap:
//   1. every asset the PAGE and the LOGIC reference exists on disk
//   2. every word has a picture AND a pronunciation clip
//   3. every letter a-z has a clip (the tray can offer any of them)
//   4. no clip is silent or a duplicate of another
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..')
const fails = []
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fails.push(msg) }
const exists = p => fs.existsSync(path.join(ROOT, p))

// ---- 1. references in the page + logic --------------------------------
const html = fs.readFileSync(path.join(ROOT, 'games/ejaan-inggris.html'), 'utf8')
const js = fs.readFileSync(path.join(ROOT, 'games/ejaan-inggris.js'), 'utf8')
const refs = new Set()
for (const m of html.matchAll(/\.\.\/(assets\/spelling\/[A-Za-z0-9._/-]+\.(?:webp|ttf))/g)) refs.add(m[1])
// url('ui/x.webp') style references in the logic
for (const m of js.matchAll(/url\('([A-Za-z0-9._/-]+\.webp)'\)/g)) refs.add('assets/spelling/' + m[1])
const missingRefs = [...refs].filter(p => !exists(p))
check(refs.size > 20, `page and logic reference ${refs.size} assets`)
check(missingRefs.length === 0,
  `every referenced asset exists${missingRefs.length ? ' — MISSING: ' + missingRefs.join(', ') : ''}`)

// ---- 2 + 3. word pictures, word clips, letter clips --------------------
global.window = global
const D = (await import(path.join(ROOT, 'games/data/spelling-data.js'))).default || global.SpellingData
const noPic = D.WORDS.filter(w => !exists(`assets/spelling/${w.dir}/${w.pic}.webp`)).map(w => w.w)
const noAud = D.WORDS.filter(w => !exists(`assets/spelling/audio/words/${w.w}.webm`)).map(w => w.w)
check(D.WORDS.length >= 30, `word list has ${D.WORDS.length} words`)
check(noPic.length === 0, `every word has a picture${noPic.length ? ' — MISSING: ' + noPic.join(', ') : ''}`)
check(noAud.length === 0, `every word has a pronunciation clip${noAud.length ? ' — MISSING: ' + noAud.join(', ') : ''}`)
const letters = 'abcdefghijklmnopqrstuvwxyz'.split('')
const noL = letters.filter(l => !exists(`assets/spelling/audio/letters/${l}.webm`))
check(noL.length === 0, `every letter a-z has a clip${noL.length ? ' — MISSING: ' + noL.join(', ') : ''}`)

// every category the data offers as ready must actually have words
const emptyReady = D.CATEGORIES.filter(c => c.ready && D.list(c.key).length === 0).map(c => c.key)
check(emptyReady.length === 0,
  `no category is offered with zero words${emptyReady.length ? ' — EMPTY: ' + emptyReady.join(', ') : ''}`)

// ---- 4. clips must not be empty or duplicates --------------------------
const clipDir = p => fs.readdirSync(path.join(ROOT, p)).map(f => path.join(ROOT, p, f))
const all = [...clipDir('assets/spelling/audio/letters'), ...clipDir('assets/spelling/audio/words')]
const tiny = all.filter(f => fs.statSync(f).size < 700).map(f => path.basename(f))
check(tiny.length === 0, `no clip is suspiciously small${tiny.length ? ' — ' + tiny.join(', ') : ''}`)
const byHash = new Map()
for (const f of all) {
  const h = crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex')
  if (!byHash.has(h)) byHash.set(h, [])
  byHash.get(h).push(path.basename(f))
}
const dupes = [...byHash.values()].filter(v => v.length > 1)
check(dupes.length === 0, `no two clips are byte-identical${dupes.length ? ' — ' + dupes.map(d => d.join('=')).join(' | ') : ''}`)

console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
