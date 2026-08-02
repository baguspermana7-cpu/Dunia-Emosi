/* =============================================================================
 * Dunia Emosi — Film Anak offline-manifest builder
 * =============================================================================
 * WHY THIS EXISTS
 *   games/film-anak.html offers a per-game "Siapkan Offline" installer. To make
 *   a game work with ZERO network, the installer must download EVERY file the
 *   game can ever need — including assets that are only requested when a
 *   specific level/scene is played (gotham-getaway loads a per-level theme pack
 *   plus Spine skeletons per level; a child who only played level 1 online used
 *   to get a broken race on levels 2-5 offline). Static presence on disk is NOT
 *   offline capability.
 *
 *   So we do NOT try to be clever about which files a game "really" uses.
 *   We enumerate the ENTIRE game folder. Whole-folder enumeration is the only
 *   guarantee that the level-gated assets are covered.
 *
 * OUTPUT
 *   games/film/<slug>/offline-manifest.json   per-game file list + sizes + hashes
 *   games/film/offline-index.json             slug -> {files,bytes,hash} summary
 *                                             (so the hub shows sizes without
 *                                              fetching 17 manifests)
 *
 * MUST BE RE-RUN whenever ANY file of ANY film game changes (added / removed /
 * edited). The per-game `hash` is what the client compares against the hash it
 * recorded at install time; if they differ the hub shows "Perbarui" (stale) and
 * the child re-downloads only the files whose content hash changed.
 *
 *   node tools/build-film-manifests.mjs           # all games
 *   node tools/build-film-manifests.mjs thomas-jigsaw batwheels-jigsaw
 *   node tools/build-film-manifests.mjs --check   # verify manifests are current
 *
 * Idempotent: the generated manifest is excluded from its own enumeration, so
 * re-running without touching game files rewrites byte-identical output (the
 * `generated` timestamp is only rewritten when something actually changed).
 * ========================================================================== */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const FILM_DIR = path.join(ROOT, 'games', 'film')
const MANIFEST_NAME = 'offline-manifest.json'
const INDEX_PATH = path.join(FILM_DIR, 'offline-index.json')

// Files that must never end up in a manifest: our own generated output, editor
// crud, and OS junk. Everything else in the folder ships.
const SKIP_FILE = new Set([MANIFEST_NAME, '.DS_Store', 'Thumbs.db', 'desktop.ini'])
const SKIP_EXT = new Set(['.md'])          // crawl notes / plans live next to games
const SKIP_DIR = new Set(['.git', 'node_modules', '__pycache__'])

const args = process.argv.slice(2)
const CHECK_ONLY = args.includes('--check')
const only = args.filter((a) => !a.startsWith('-'))

/** Recursively list files under `dir`, returned as POSIX-relative paths. */
function walk(dir, base, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))
  for (const e of entries) {
    const abs = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (SKIP_DIR.has(e.name)) continue
      walk(abs, base, out)
    } else if (e.isFile()) {
      if (SKIP_FILE.has(e.name)) continue
      if (SKIP_EXT.has(path.extname(e.name).toLowerCase())) continue
      out.push(path.relative(base, abs).split(path.sep).join('/'))
    }
  }
  return out
}

/** Short content hash — content-based (not mtime) so a git checkout is stable. */
function fileHash(abs) {
  return crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex').slice(0, 12)
}

function buildManifest(slug) {
  const dir = path.join(FILM_DIR, slug)
  const rel = walk(dir, dir, []).sort()
  const assets = []
  let bytes = 0
  for (const p of rel) {
    const abs = path.join(dir, p)
    const s = fs.statSync(abs).size
    bytes += s
    assets.push({ p, s, h: fileHash(abs) })
  }
  // Fingerprint of the whole game = hash of the sorted "path:size:contenthash"
  // lines. Changes if ANY file is added, removed, resized or edited.
  const hash = crypto
    .createHash('sha256')
    .update(assets.map((a) => a.p + ':' + a.s + ':' + a.h).join('\n'))
    .digest('hex')
    .slice(0, 16)
  return { slug, hash, files: assets.length, bytes, assets }
}

/** Stable serialisation — `generated` is injected separately so we can diff. */
function serialize(m, generated) {
  return JSON.stringify(
    {
      slug: m.slug,
      hash: m.hash,
      files: m.files,
      bytes: m.bytes,
      generated,
      assets: m.assets,
    },
    null,
    0
  ) + '\n'
}

function readExisting(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return null }
}

const slugs = fs
  .readdirSync(FILM_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && fs.existsSync(path.join(FILM_DIR, d.name, 'index.html')))
  .map((d) => d.name)
  .filter((s) => (only.length ? only.includes(s) : true))
  .sort()

if (!slugs.length) {
  console.error('No film games found under', FILM_DIR, only.length ? `(filter: ${only.join(', ')})` : '')
  process.exit(1)
}

const index = { generated: '', games: {} }
let changed = 0
let totalBytes = 0
let totalFiles = 0

for (const slug of slugs) {
  const m = buildManifest(slug)
  const file = path.join(FILM_DIR, slug, MANIFEST_NAME)
  const prev = readExisting(file)
  const isSame = prev && prev.hash === m.hash && prev.files === m.files && prev.bytes === m.bytes
  // Keep the old timestamp when nothing changed → byte-identical re-runs.
  const generated = isSame ? prev.generated : new Date().toISOString()
  if (!isSame) changed++
  if (!CHECK_ONLY) fs.writeFileSync(file, serialize(m, generated))
  index.games[slug] = { files: m.files, bytes: m.bytes, hash: m.hash }
  totalBytes += m.bytes
  totalFiles += m.files
  const mb = (m.bytes / 1048576).toFixed(1)
  console.log(
    `${isSame ? '=' : '*'} ${slug.padEnd(28)} ${String(m.files).padStart(4)} files  ${mb.padStart(6)} MB  ${m.hash}`
  )
}

// Only rewrite the combined index when a full build ran (a filtered run would
// otherwise drop the games it did not look at).
if (!only.length) {
  const prevIdx = readExisting(INDEX_PATH)
  const sameIdx =
    prevIdx && JSON.stringify(prevIdx.games) === JSON.stringify(index.games)
  index.generated = sameIdx ? prevIdx.generated : new Date().toISOString()
  if (!CHECK_ONLY) fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 0) + '\n')
  if (!sameIdx) changed++
}

console.log(
  `\n${slugs.length} games · ${totalFiles} files · ${(totalBytes / 1048576).toFixed(1)} MB total` +
    (CHECK_ONLY ? '' : ` · ${changed} manifest(s) rewritten`)
)

if (CHECK_ONLY && changed) {
  console.error('\nSTALE: manifests are out of date. Run: node tools/build-film-manifests.mjs')
  process.exit(2)
}
