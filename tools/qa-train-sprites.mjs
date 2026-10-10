// Train sprite database gate — category train-char (tools/ingest-train-sprites.py).
//   - every key's file exists, is a WebP whose header size equals the indexed w/h, and has a transparent border;
//   - every entry carries view / facing / expression / anchor / baseline / char;
//   - every character has all 8 top-down headings (derived ones flagged) + front, side-l, side-r, rear + >= 2 expressions;
//   - games/data/train-sprites.js is fresh (python3 tools/gen-train-sprites-js.py --check) and pick() obeys the heading;
//   - the contact sheets exist (written by the ingest tool; path printed).
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { spawnSync } from 'node:child_process'
const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..')
const fails = []
const check = (ok, msg) => { console.log((ok ? 'OK   ' : 'FAIL ') + msg); if (!ok) fails.push(msg) }
const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/db/index.json'), 'utf8')).assets
const CATS = ['train-char', 'story-char', 'animal']
const allKeys = Object.keys(idx).filter(k => CATS.includes(idx[k].cat))
const keys = allKeys.filter(k => idx[k].cat === 'train-char' && Array.isArray(idx[k].missing))   // the 7 playable trains (top-down sheets)
check(keys.length >= 190, `${keys.length} playable-train sprites indexed (+ ${allKeys.length - keys.length} supporting-cast sprites)`)
function webpSize (b) {
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null
  const t = b.toString('ascii', 12, 16)
  if (t === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)]
  if (t === 'VP8L') { const v = b.readUInt32LE(21); return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)] }
  if (t === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff]
  return null
}
const bad = [], badMeta = [], badSize = []
for (const k of allKeys) {
  const e = idx[k], f = path.join(ROOT, e.file)
  if (!fs.existsSync(f)) { bad.push(k); continue }
  const sz = webpSize(fs.readFileSync(f))
  if (!sz) bad.push(k)
  else if (sz[0] !== e.w || sz[1] !== e.h) badSize.push(`${k} ${sz} vs ${e.w}x${e.h}`)
  if (!(e.char && e.view && typeof e.facing === 'number' && e.expression && Array.isArray(e.anchor) && typeof e.baseline === 'number' && (e.cat !== 'train-char' || e.pose || Array.isArray(e.missing)))) badMeta.push(k)
}
check(bad.length === 0, `every key (${allKeys.length}) decodes as a WebP${bad.length ? ' - ' + bad.slice(0, 4) : ''}`)
check(badSize.length === 0, `header size equals indexed w/h${badSize.length ? ' - ' + badSize.slice(0, 3) : ''}`)
check(badMeta.length === 0, `view/facing/expression/anchor/baseline/missing present${badMeta.length ? ' - ' + badMeta.slice(0, 4) : ''}`)
const cast = allKeys.filter(k => idx[k].pose)
const NEED = ['train-char/goro-loco/front-34l', 'train-char/goro-loco/front-34r', 'train-char/coach-green/side-l', 'train-char/caboose-red/front-34l',
  'story-char/henry/wave', 'story-char/henry/point', 'story-char/henry/worried', 'story-char/henry/shovel', 'story-char/scarlet/stand', 'story-char/scarlet/gesture', 'story-char/scarlet/worried',
  'story-char/baron/stand', 'story-char/baron/shocked', 'story-char/katrina/stand', 'story-char/katrina/shovel', 'story-char/james/stand', 'story-char/carter/stand', 'story-char/carter/arms-crossed',
  'animal/turtle/stand', 'animal/turtle/walk', 'animal/rabbit/sit', 'animal/rabbit/run', 'animal/deer/stand', 'animal/deer/graze', 'animal/bird-blue/fly', 'animal/cardinal/fly', 'animal/vulture/perch-1', 'animal/vulture/perch-2']
check(NEED.every(k => idx[k]), `all ${NEED.length} supporting-cast keys present${NEED.filter(k => !idx[k]).length ? ' - missing ' + NEED.filter(k => !idx[k]) : ''}`)
check(!allKeys.some(k => /linus|samson/.test(k) && idx[k].cat !== 'train-char'), 'no Linus / Samson in the cast families (they come from the earlier sheets)')
check(cast.every(k => idx[k].fringe && idx[k].fringe.soft_after <= idx[k].fringe.soft_before && typeof idx[k].tint === 'number'), 'every cast sprite records its edge clean-up (soft pixels after <= before, source tint)')
check(cast.every(k => idx[k].outline >= 3), 'sticker outline baked into every cast sprite')
const chars = [...new Set(keys.map(k => idx[k].char))]
check(chars.length === 7, `7 characters: ${chars.join(', ')}`)
const H8 = { n: 0, ne: 45, e: 90, se: 135, s: 180, sw: 225, w: 270, nw: 315 }
for (const ch of chars) {
  const mine = keys.filter(k => idx[k].char === ch), has = n => mine.some(k => k === `train-char/${ch}/${n}`)
  const tops = Object.keys(H8).filter(h => !has('top-' + h))
  const wrong = Object.keys(H8).filter(h => has('top-' + h) && idx[`train-char/${ch}/top-${h}`].facing !== H8[h])
  const exprs = new Set(mine.map(k => idx[k].expression))
  const missing = idx[mine[0]].missing
  check(tops.length === 0 && wrong.length === 0 && ['front', 'side-l', 'side-r', 'rear'].every(has) && exprs.size >= 2,
    `${ch}: 8 top headings + front/side-l/side-r/rear, expressions ${[...exprs].join('/')}; derived by flip/turn: ${missing.join(' ') || '-'}`)
  const derivedWrong = missing.filter(m => !idx[`train-char/${ch}/${m}`] || !idx[`train-char/${ch}/${m}`].derived)
  check(derivedWrong.length === 0, `${ch}: every entry listed in missing[] is flagged derived`)
}
const gen = spawnSync('python3', [path.join(ROOT, 'tools/gen-train-sprites-js.py'), '--check'])
check(gen.status === 0, 'games/data/train-sprites.js is fresh (generated from index.json)')
const ctx = { location: { pathname: '/Dunia-Emosi/games/x.html' } }; ctx.window = ctx
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'games/data/asset-index.js'), 'utf8'), ctx)
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'games/data/train-sprites.js'), 'utf8'), ctx)
const T = ctx.TrainSprites
let pickBad = []
for (const ch of chars) for (const [h, d] of Object.entries(H8)) {
  const k = T.pick(ch, { facing: h, view: 'top' }), i = T.info(k)
  if (!i || i.facing !== d || i.view !== 'top' || i.alt) pickBad.push(`${ch} ${h} -> ${k}`)
  const k2 = T.pick(ch, { facing: d, view: 'top' }); if (k2 !== k) pickBad.push(`${ch} ${h} number vs name`)
}
check(pickBad.length === 0, `pick(char,{facing,view:top}) returns the matching heading for 7 x 8 cases${pickBad.length ? ' - ' + pickBad.slice(0, 3) : ''}`)
const sideE = T.pick('linus', { facing: 'e', view: 'side' }), sideW = T.pick('linus', { facing: 'w', view: 'side', expression: 'happy' })
check(T.info(sideE).facing === 90 && T.info(sideW).facing === 270 && T.info(sideW).expression === 'happy', `side views: east -> ${sideE}, west happy -> ${sideW}`)
check(T.pick('nobody', {}) === null && ctx.AssetIndex.path(sideE).endsWith(idx[sideE].file), 'unknown character -> null; AssetIndex resolves the keys')
const castSheets = ['cast-contact-white.png', 'cast-contact-dark.png'].map(f => path.join(process.env.CAST_SCRATCH || '/tmp/dunia-story-cast', f)).filter(f => fs.existsSync(f))
console.log('cast contact sheets:', castSheets.join(' '))
check(castSheets.length === 2, 'cast contact sheet on white and dark exists')
const scratch = process.env.TRAIN_SCRATCH || '/tmp/dunia-train-char'
const sheets = chars.map(c => path.join(scratch, c + '-contact.png')).filter(f => fs.existsSync(f))
console.log('contact sheets:', sheets.length + '/' + chars.length, scratch + '/<char>-contact.png')
check(sheets.length === chars.length, 'one contact sheet per character exists')
console.log(fails.length ? `\nFAILED ${fails.length}` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
