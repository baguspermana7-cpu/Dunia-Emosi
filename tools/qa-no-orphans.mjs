#!/usr/bin/env node
// qa-no-orphans — counts files under assets/ that nothing references, and fails when that count RISES (ratchet).
// Audit A-9 (2026-11-14) found 353 orphan files (23.1 MB) shipped to a child's tablet. Static, no browser, < 30 s.
//
// A file is referenced (NOT an orphan) when any html/js/mjs/cjs/css/json/svg/webmanifest file of this repo or of
// game1 (it loads Dunia assets through ../Dunia-Emosi/assets/...), or any tools/*.py build script (its inputs are in
// use), contains, case-insensitively:
//   1. its basename, raw or URL-encoded ("car%20and%20vehicle"), or
//   2. its stem as a whole word (code that adds the extension itself: name + '.webp'), or
//   3. a path pattern that matches it: a template literal `assets/x/${n}.webp` or a concatenation
//      'assets/x/' + n + '.webp' (each hole becomes a wildcard), or one of the KEEP patterns below
//      (paths built in ways a line-level parse cannot read).
//
//   node tools/qa-no-orphans.mjs              gate: exit 1 when the count is above tools/orphans-baseline.json
//   node tools/qa-no-orphans.mjs --list       also print every orphan with its size
//   node tools/qa-no-orphans.mjs --baseline   record the current count as the new baseline
//   ORPHAN_STRICT=1                            drop rule 2 (stems) to see what only a stem keeps alive
//   ORPHAN_WHY=assets/x.webp                   print which rule keeps one file
//   GAME1_DIR=/path/to/game1                  default ~/rz-work/game1; missing game1 = exit 2 (its references would be lost)
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BASELINE = join(ROOT, 'tools/orphans-baseline.json')
const GAME1 = process.env.GAME1_DIR || join(homedir(), 'rz-work/game1')
const LIST = process.argv.includes('--list'), WRITE = process.argv.includes('--baseline')
const CORPUS_EXT = /\.(html?|js|mjs|cjs|css|json|svg|webmanifest)$/i
const SELF = new Set(['tools/qa-no-orphans.mjs', 'tools/orphans-baseline.json'])

// Paths the app builds from data or from expressions the parse below cannot join (brief v64.53 L1, audit A-9 §1).
const KEEP = [
  /^assets\/banner-game[^/]*$/i,                         // game.js `assets/banner-game${n}.webp`
  /(^|\/)bg-arena-[^/]*$/i,                              // game.js bg-arena-* per arena and tier
  /\/pokemondb_hd_alt2\/\d+_[^/]+\.webp$/i,              // game.js `pokemondb_hd_alt2/${id}_${slug}.webp`
  /^assets\/Pokemon\/trainer\//i,                        // trainer sprites picked from data
  /\/showdown-ani\//i,                                   // animated Pokemon sprites picked by name
  /^assets\/fonts\//i,                                   // fonts.css and the files it loads
  /^assets\/kereta\//i,                                  // kereta level packs: bg/<key>-landscape|portrait, per level
  /^assets\/math\/sub-[^/]*\.webp$/i,                    // kuis-matematika A+'sub-'+w+'.webp'
  /^assets\/train\/brave-loco-part[^/]*\.mp3$/i,         // game.js `assets/train/brave-loco-part${part}.mp3`
  /^assets\/background\/MountainDuskGodot\/MountainDuskGodot\/MountainsLayers\/[^/]*\.png$/i,   // pokemon-run parallax layers by index
  /(^|[/_-])(license|credits|ofl)[^/]*\.txt$|\/\.gitkeep$/i,        // licence and attribution texts travel with the files they cover
]

const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 1 << 28 }).split('\0').filter(Boolean)
const files = (cwd, ...paths) => git(cwd, ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ...paths]).filter(f => existsSync(join(cwd, f)))

if (!existsSync(join(GAME1, '.git'))) { console.log(`qa-no-orphans: game1 not found at ${GAME1} (set GAME1_DIR); its references cannot be checked`); process.exit(2) }

const assets = files(ROOT, 'assets').filter(f => !f.endsWith('/'))
const corpusFiles = [
  ...files(ROOT).filter(f => (CORPUS_EXT.test(f) || /^tools\/[^/]+\.py$/.test(f)) && !SELF.has(f)).map(f => join(ROOT, f)),   // a build tool's input is in use
  ...files(GAME1).filter(f => CORPUS_EXT.test(f) && !/(^|\/)node_modules\//.test(f)).map(f => join(GAME1, f)),
]
const texts = corpusFiles.map(f => readFileSync(f, 'utf8').toLowerCase())
const text = texts.join('\n')

// 1 + 2: tokens. Path tokens keep . - _ % @ ~ so "foo-1.webp?v=2" yields "foo-1.webp"; stems are the dot-free pieces.
// Only names of real assets are kept, so the sets stay small; runs over 200 chars are base64/minified blobs.
const wantBase = new Set(), wantStem = new Set()
for (const f of assets) { const b = basename(f.toLowerCase()); wantBase.add(b); wantBase.add(encodeURIComponent(b)); wantStem.add(b.replace(/\.[^.]+$/, '')) }
const pathTok = new Set(), wordTok = new Set()
const baseLen = new Set([...wantBase].map(b => b.length)), stemLen = new Set([...wantStem].map(b => b.length))
const see = seg => {                                                 // length first: a Set lookup hashes the whole slice
  if (baseLen.has(seg.length) && wantBase.has(seg)) pathTok.add(seg)
  const dot = seg.indexOf('.')
  if (dot < 0) { if (stemLen.has(seg.length) && wantStem.has(seg)) wordTok.add(seg); return }
  for (const w of seg.split('.')) if (stemLen.has(w.length) && wantStem.has(w)) wordTok.add(w)
}
for (const src of texts) for (const t of src.split(/[^a-z0-9._\-%@~]+/)) {
  if (t.length < 3 || t.length > 200) continue                        // stems under 3 chars count as present (below)
  see(t)
  if (t.includes('%')) for (const seg of safeDecode(t).split(/[^a-z0-9._\-@~]+/)) see(seg)
}
function safeDecode (s) { try { return decodeURIComponent(s) } catch (e) { return s } }

// 3: path patterns from template literals and '+' concatenations. A hole (${...} or + expr +) inside a path becomes
// "[^/]*" (one name, not a whole subtree); a leading hole leaves the start unanchored (`${base}assets/x/${n}.webp`).
const HOLE = '\u0000', patterns = [], seen = new Set()
const EXT = /\.(webp|png|jpe?g|gif|svg|mp3|ogg|wav|json|mp4|webm)$/
const ROOTS = /^(\u0000|\.\.?\/|\/|dunia-emosi\/)*(assets\/)?/
function addSegments (s) {
  for (const seg of s.split(/[\s"'<>=(),;`]+/)) {
    if (!seg.includes(HOLE)) continue
    if (!seg.includes('/') && !EXT.test(seg)) continue                // `battle-${id}` is a class name, not a path
    // what the pattern pins down beyond the roots and the extension: `assets/${f}.webp` pins nothing and would keep
    // every asset alive, `${id}_${slug}.webp` likewise (those shapes are covered by KEEP instead)
    const lit = seg.replace(ROOTS, '').split(HOLE).join('').replace(EXT, '')
    if ((lit.match(/[a-z0-9]/g) || []).length < 3 || !/[a-z]/.test(lit)) continue
    const body = seg.replace(/^(\.\.?\/)+/, '').split(HOLE).map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')
    const src = (seg.startsWith(HOLE) ? '' : '(^|/)') + body + '$'
    if (!seen.has(src)) { seen.add(src); try { patterns.push(new RegExp(src)) } catch (e) {} }
  }
}
for (const src of texts) {
  for (const m of src.matchAll(/`([^`]{0,400})`/g)) {               // template literals: replace ${...} holes (balanced braces)
    if (!m[1].includes('${')) continue
    let out = '', depth = 0
    for (let i = 0; i < m[1].length; i++) {
      const c = m[1][i]
      if (!depth && c === '$' && m[1][i + 1] === '{') { depth = 1; i++; out += HOLE; continue }
      if (depth) { if (c === '{') depth++; else if (c === '}') depth--; continue }
      out += c
    }
    addSegments(out)
  }
  for (const line of src.split('\n')) {                              // 'a/' + x + '.webp' on one line
    if (!line.includes('+')) continue
    const lits = [...line.matchAll(/(['"])((?:(?!\1)[^\\\n]|\\.)*)\1/g)]
    if (lits.length < 1) continue
    let joined = '', prevEnd = -1
    for (const m of lits) {
      if (prevEnd >= 0) {
        const gap = line.slice(prevEnd, m.index)
        joined += /^\s*\+[^'"`;]*\+\s*$/.test(gap) ? HOLE : /^\s*\+\s*$/.test(gap) ? '' : ' '
      } else if (/\+\s*$/.test(line.slice(0, m.index))) joined += HOLE
      joined += m[2]; prevEnd = m.index + m[0].length
    }
    if (/^\s*\+/.test(line.slice(prevEnd))) joined += HOLE
    if (joined.includes(HOLE)) addSegments(joined)
  }
}

const rare = /[^a-z0-9._\-%@~]/                                       // basenames the token split would cut (spaces, unicode)
const orphans = []
for (const f of assets) {
  const p = f.toLowerCase(), base = basename(p), stem = base.replace(/\.[^.]+$/, '')
  if (pathTok.has(base) || pathTok.has(encodeURIComponent(base)) || (!process.env.ORPHAN_STRICT && ((stem.length < 3 && /[a-z0-9]/.test(stem)) || wordTok.has(stem)))) continue
  if (rare.test(base) && (text.includes(base) || text.includes(encodeURIComponent(base)) || text.includes(encodeURI(base)))) continue
  if (KEEP.some(re => re.test(f))) continue
  if (patterns.some(re => re.test(p))) continue
  orphans.push(f)
}

const bytes = orphans.reduce((n, f) => n + statSync(join(ROOT, f)).size, 0)
if (process.env.ORPHAN_WHY) {
  const f = process.env.ORPHAN_WHY, p = f.toLowerCase(), b = basename(p)
  console.log('why ' + f + ': basename ' + pathTok.has(b) + ', stem ' + wordTok.has(b.replace(/\.[^.]+$/, '')) +
    ', keep ' + KEEP.filter(re => re.test(f)).map(String) + ', patterns ' + patterns.filter(re => re.test(p)).slice(0, 5).map(String))
}
if (LIST) for (const f of orphans) console.log(statSync(join(ROOT, f)).size + '\t' + f)
if (WRITE) {
  writeFileSync(BASELINE, JSON.stringify({ count: orphans.length, bytes, recorded: new Date().toISOString().slice(0, 10) }, null, 2) + '\n')
  console.log(`qa-no-orphans: baseline recorded, ${orphans.length} orphans (${bytes} B)`); process.exit(0)
}
const base = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')).count : 0
const head = `qa-no-orphans: ${orphans.length} orphan files under assets/ (${bytes} B), baseline ${base}; ${assets.length} assets, ${corpusFiles.length} referencing files, ${patterns.length} path patterns`
if (orphans.length > base) {
  console.log(head + ' — FAIL: count rose. New orphans (reference them, delete them, or move dev files to docs/):')
  if (!LIST) for (const f of orphans.slice(0, 20)) console.log('  ' + f)
  process.exit(1)
}
console.log(head + (orphans.length < base ? ' — PASS (below baseline: lower it with --baseline)' : ' — PASS'))
