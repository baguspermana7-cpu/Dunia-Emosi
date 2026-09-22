// Gate for the defect class fixed in 97b9a5f4, not just its two instances.
//
// The wrapper pages (film-anak.html, film-play.html) and the shared scripts
// they load reference files under games/film/ that belong to NO game: they sit
// outside every <slug>/ folder, so build-film-manifests.mjs never saw them and
// no installer ever downloaded them. An installed game then reported
// "Siap offline" and died with no network -- match-up on one missing script,
// gotham on ten missing portraits.
//
// Both were HTML/JS references in the WRAPPER, which is exactly what a static
// scan can see cheaply. This asserts that every shared file the wrapper names,
// and every file in the shared directories it reads at runtime, is covered by
// something that actually caches it: SHELL_FILES in film-offline.js, or
// games/film/shared-manifest.json. No browser, no 196 MB install.
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..')
const FILM = path.join(ROOT, 'games', 'film')
const fails = []
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fails.push(msg) }

// ---- what the wrapper names -----------------------------------------------
const wrapperFiles = ['film-anak.html', 'film-play.html', 'film-offline.js']
  .map(f => path.join(ROOT, 'games', f))
  .filter(f => fs.existsSync(f))
const sharedScripts = fs.existsSync(FILM)
  ? fs.readdirSync(FILM).filter(f => /\.(js|css)$/.test(f)).map(f => path.join(FILM, f))
  : []

const referenced = new Set()
const dirsRead = new Set()
for (const f of [...wrapperFiles, ...sharedScripts]) {
  const src = fs.readFileSync(f, 'utf8')
  // direct references: 'film/<something>' with an extension
  for (const m of src.matchAll(/['"(]film\/([A-Za-z0-9._/-]+\.[A-Za-z0-9]+)/g)) referenced.add(m[1])
  // runtime-built references: 'film/assets/<dir>/' + name
  for (const m of src.matchAll(/['"(]film\/(assets\/[A-Za-z0-9._-]+)\//g)) dirsRead.add(m[1])
}
// every file the game bundles already carry is covered by their own manifest
const isSlugFile = p => {
  const first = p.split('/')[0]
  return fs.existsSync(path.join(FILM, first, 'index.html'))
}

// ---- what is actually cached ----------------------------------------------
const foSrc = fs.readFileSync(path.join(ROOT, 'games', 'film-offline.js'), 'utf8')
const shellBlock = (foSrc.match(/var SHELL_FILES = \[([\s\S]*?)\]/) || [])[1] || ''
const shellFiles = new Set([...shellBlock.matchAll(/'([^']+)'/g)].map(m => m[1]))

const smPath = path.join(FILM, 'shared-manifest.json')
check(fs.existsSync(smPath), 'games/film/shared-manifest.json exists')
const shared = fs.existsSync(smPath) ? JSON.parse(fs.readFileSync(smPath, 'utf8')) : { assets: [] }
const sharedSet = new Set((shared.assets || []).map(a => a.p))

const covered = p => sharedSet.has(p) || shellFiles.has('film/' + p) || shellFiles.has(p)

// ---- 1. every named shared file is cached ---------------------------------
// The generated manifests themselves are install-time CONTROL files, not
// content: they are only read to decide what to download, which happens
// online. Both degrade by design when unreachable -- film-offline.js fetches
// offline-index.json with `.catch(() => null)`, and film-anak.html has an
// explicit "size is unknown (offline-index.json unreachable)" branch. Named
// exemption with that evidence, rather than a pattern that would also hide a
// real asset.
const CONTROL_FILES = new Set(['offline-index.json', 'shared-manifest.json'])
const named = [...referenced].filter(p => !isSlugFile(p) && !CONTROL_FILES.has(p)).sort()
check(named.length > 0, `found shared files referenced by the wrapper (${named.length})`)
const uncovered = named.filter(p => !covered(p) && fs.existsSync(path.join(FILM, p)))
check(uncovered.length === 0,
  `every shared file the wrapper names is cached${uncovered.length ? ' — UNCACHED: ' + uncovered.join(', ') : ''}`)

// ---- 2. directories read at runtime are cached IN FULL --------------------
// The portraits are picked by id at runtime ('film/assets/gg-heroes/' + id),
// so a static scan can never name them. Whole-directory coverage is the only
// honest assertion: one uncached file there is one child staring at a gap.
for (const d of [...dirsRead].sort()) {
  const abs = path.join(FILM, d)
  if (!fs.existsSync(abs)) { check(false, `${d} exists on disk`); continue }
  const files = fs.readdirSync(abs).filter(f => fs.statSync(path.join(abs, f)).isFile())
  const miss = files.filter(f => !covered(d + '/' + f))
  check(miss.length === 0,
    `${d} is cached in full (${files.length} files)${miss.length ? ' — UNCACHED: ' + miss.slice(0, 5).join(', ') : ''}`)
}

// ---- 3. the shared manifest must describe what is on disk -----------------
const onDisk = []
const walk = (dir, base) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name)
    if (e.isDirectory()) walk(abs, base)
    else onDisk.push(path.relative(base, abs).split(path.sep).join('/'))
  }
}
if (fs.existsSync(path.join(FILM, 'assets'))) walk(path.join(FILM, 'assets'), FILM)
const missingFromManifest = onDisk.filter(p => !sharedSet.has(p))
check(missingFromManifest.length === 0,
  `shared-manifest.json lists every file under games/film/assets/ (${onDisk.length})${missingFromManifest.length ? ' — MISSING: ' + missingFromManifest.slice(0, 5).join(', ') : ''}`)

console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
