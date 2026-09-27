// Named asset library gate — assets/db/index.json + games/data/asset-index.js.
//   - every indexed file exists, is a real WebP, and has a transparent border (no page left);
//   - the JS index matches index.json exactly (not stale);
//   - safe() excludes every branded/ and currency/ key;
//   - no Pokémon game page loads asset-index.js (owner rule: Pokémon games never use it).
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..')
const fails = []
const check = (ok, msg) => { console.log((ok ? '✅ ' : '❌ ') + msg); if (!ok) fails.push(msg) }
const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/db/index.json'), 'utf8')).assets
const keys = Object.keys(idx)
check(keys.length >= 500, `${keys.length} named sprites indexed`)
const missing = keys.filter(k => !fs.existsSync(path.join(ROOT, idx[k].file)))
check(missing.length === 0, `every indexed file exists${missing.length ? ' — ' + missing.slice(0, 5).join(', ') : ''}`)
const notWebp = keys.filter(k => { const b = fs.readFileSync(path.join(ROOT, idx[k].file)); return b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP' })
check(notWebp.length === 0, `every file is WebP${notWebp.length ? ' — ' + notWebp.slice(0, 5).join(', ') : ''}`)
const onDisk = []
;(function walk (d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.webp')) onDisk.push(path.relative(ROOT, p)) } })(path.join(ROOT, 'assets/db/lib'))
const files = new Set(keys.map(k => idx[k].file))
const orphans = onDisk.filter(f => !files.has(f))
check(orphans.length === 0, `no orphan files outside the index${orphans.length ? ' — ' + orphans.slice(0, 5).join(', ') : ''}`)
const ctx = { location: { pathname: '/Dunia-Emosi/games/x.html' } }; ctx.window = ctx
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'games/data/asset-index.js'), 'utf8'), ctx)
const AI = ctx.AssetIndex
check(JSON.stringify(AI.keys().sort()) === JSON.stringify(keys.slice().sort()), 'asset-index.js matches index.json (not stale)')
check(AI.path(keys[0]) === '/Dunia-Emosi/' + idx[keys[0]].file, 'path() is base-path aware')
const leak = AI.safe().filter(k => /^(real\/)?(branded|currency)\//.test(k))
check(leak.length === 0 && AI.safe().length < keys.length, `safe() excludes branded/currency (${keys.length - AI.safe().length} excluded)`)
const POKE = ['gym-pokemon', 'mario-pokemon', 'monster-candy', 'pokemon-run', 'pokemon-birds', 'pokemon-bawah-laut']
const pokeUse = POKE.filter(g => fs.readFileSync(path.join(ROOT, 'games', g + '.html'), 'utf8').includes('asset-index.js'))
check(pokeUse.length === 0, `no Pokémon game loads the library${pokeUse.length ? ' — ' + pokeUse.join(', ') : ''}`)
// EmojiMap 'lib:' fills: every target exists; on every Pokémon page they stay emoji
const emap = fs.readFileSync(path.join(ROOT, 'games/data/emoji-map.js'), 'utf8')
const load = pg => { const c = { location: { pathname: '/Dunia-Emosi/games/' + pg + '.html' } }; c.window = c; vm.runInNewContext(emap, c); return c.EmojiMap }
const libChars = Object.entries(load('ayo-berhitung')._raw).filter(([, v]) => String(v).startsWith('lib:'))
check(libChars.length > 0, `${libChars.length} emoji GAPs filled from the library`)
const deadLib = libChars.filter(([, v]) => !idx[v.slice(4)])
check(deadLib.length === 0, `every lib: target is an indexed sprite${deadLib.length ? ' — ' + deadLib.map(x => x[1]).join(', ') : ''}`)
const realLib = libChars.filter(([, v]) => v.startsWith('lib:real/'))
check(realLib.length === 0, 'emoji fills use cartoon sprites only (no real/)')
const pokeLeak = POKE.flatMap(pg => { const E = load(pg); return libChars.filter(([c]) => E.spec(c) !== null).map(([c]) => pg + ':' + c) })
check(pokeLeak.length === 0, `on every Pokémon page a lib: emoji stays an emoji${pokeLeak.length ? ' — ' + pokeLeak.slice(0, 5).join(', ') : ''}`)
const E2 = load('ayo-berhitung')
check(libChars.every(([c]) => E2.spec(c) && E2.spec(c).file), 'on other pages every lib: emoji resolves to its file')
console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
