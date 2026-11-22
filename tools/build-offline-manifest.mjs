#!/usr/bin/env node
// build-offline-manifest — PRD-23 (docs/prd/PRD-23-indikator-siap-luring-per.md). Writes
// games/data/offline-manifest.json: for every game tile on the beranda map (index.html .wmap-node#gtile-*), the files
// that game needs to open with no internet, as the browser requests them (root-relative, ?v= token kept, because the
// service worker caches by exact URL):
//   - the page the tile opens (a hub game = index.html) and every local file the page names statically: <script src>,
//     <link href> (stylesheet, preload, icon, manifest), <img src>, <source src>, <audio src>, <video src|poster>
//   - a page that loads save-engine.js also gets the modules save-engine's loader brings in (dunia-bus.js ...)
//   - the files the game asked for while it ran, from games/data/offline-runtime.json (tools/record-offline-runtime.mjs)
// A page that only wraps a game served elsewhere (an <iframe>) is left out: it cannot open offline from this cache.
// Film tiles are left out: film games have their own "Siapkan Offline" (games/film-offline.js).
//   node tools/build-offline-manifest.mjs           write the file
//   node tools/build-offline-manifest.mjs --check   exit 1 when the file differs from a fresh build (CI)
import fs from 'node:fs'
import path from 'node:path'
const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..')
const OUT = path.join(ROOT, 'games/data/offline-manifest.json')
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8')
const index = read('index.html'), gamejs = read('game.js')
const TOKEN = (index.match(/save-engine\.js\?v=([^"']+)/) || [, ''])[1]
const RUNTIME = fs.existsSync(path.join(ROOT, 'games/data/offline-runtime.json')) ? JSON.parse(read('games/data/offline-runtime.json')).games : {}

function refs (page) {
  const html = read(page).replace(/<!--[\s\S]*?-->/g, '')
  const dir = path.posix.dirname(page), out = new Set([page])
  const re = /<(script|link|img|source|audio|video)\b[^>]*?\s(src|href|poster)=["']([^"']+)["']/gi
  let m
  while ((m = re.exec(html))) {
    const [, tag, attr, raw] = m
    if (/^(https?:|data:|blob:|mailto:|#|javascript:)/i.test(raw) || raw.startsWith('//')) continue
    if (tag.toLowerCase() === 'link' && attr === 'href' && !/rel=["'](stylesheet|preload|modulepreload|icon|apple-touch-icon|manifest)["']/i.test(m[0])) continue
    const [p, q] = raw.split('?'), abs = path.posix.normalize(path.posix.join(dir, p))
    if (abs.startsWith('..') || !fs.existsSync(path.join(ROOT, abs)) || fs.statSync(path.join(ROOT, abs)).isDirectory()) continue
    out.add(abs + (q ? '?' + q : ''))
  }
  // save-engine's late loader (games/data/save-engine.js DuniaEmit): same folder and ?v= token as save-engine itself
  const se = [...out].find(u => /games\/data\/save-engine\.js/.test(u))
  if (se) {
    const lazy = (read('games/data/save-engine.js').match(/const files = \[([^\]]+)\]/) || [, ''])[1].match(/'([^']+\.js)'/g) || []
    const q = se.includes('?') ? se.slice(se.indexOf('?')) : ''
    lazy.forEach(f => { const n = f.slice(1, -1); if (fs.existsSync(path.join(ROOT, 'games/data', n))) out.add('games/data/' + n + q) })
  }
  // freeze-watchdog.js loads telemetry.js beside itself (PRD-07)
  const wd = [...out].find(u => /games\/data\/freeze-watchdog\.js/.test(u))
  if (wd) out.add(wd.replace('freeze-watchdog.js', 'telemetry.js'))
  return [...out].sort()
}

const games = {}
const tileRe = /<div class="wmap-node"[^>]*\bid="gtile-([^"]+)"[^>]*onclick="([^"]*)"/g
let t
while ((t = tileRe.exec(index))) {
  const [, id, onclick] = t
  if (/^film-/.test(id)) continue
  let nav = onclick.match(/location\.href='([^']+)'/)
  // a tile that calls a game.js function which itself leaves the hub (openGymGame -> games/gym-pokemon.html)
  const fn = !nav && onclick.match(/(\w+)\(\)\s*$/)
  if (fn) { const body = (gamejs.match(new RegExp('function ' + fn[1] + '\\s*\\([^)]*\\)\\s*\\{([\\s\\S]*?)\\n\\}')) || [, ''])[1]; const go = body.match(/location\.href\s*=\s*'(games\/[^']+)'/); if (go) nav = go }
  const page = nav ? nav[1] : 'index.html'
  const file = page.split('?')[0]
  if (!fs.existsSync(path.join(ROOT, file))) continue
  if (/<iframe\b[^>]*\ssrc=/i.test(read(file))) continue   // a wrapper around a game served elsewhere (blippi -> /game1/): cannot be offline from here
  const files = refs(file)
  if (page !== file) files.splice(files.indexOf(file), 1, page)   // the page as the tile opens it (its query kept)
  // the files the game asks for while it runs, recorded by tools/record-offline-runtime.mjs ({v} = the release token)
  ;(RUNTIME[id] || []).forEach(u => {
    const f = u.split('{v}').join(TOKEN), disk = path.join(ROOT, decodeURIComponent(f.split('?')[0]))
    if (!fs.existsSync(disk) || fs.statSync(disk).isDirectory()) return   // asked for but not in the tree (favicon.ico 404)
    if (!files.includes(f) && !files.includes(decodeURI(f))) files.push(f)
    // a game that picks one of a numbered family at random (deck-chair-3.webp, creatures/033.webp) may pick another
    // next time: the whole family comes along (same folder, same stem, same query)
    const [fp, fq] = f.split('?'), m = fp.match(/^(.*\/)([^/]*?)(-?\d+)?(\.(?:webp|png|jpg|svg))$/)
    if (m) {
      const stem = m[3] ? m[2] : /^\d+$/.test(m[2]) ? '' : m[2], re = stem ? new RegExp('^' + stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(-?\\d+)?' + m[4].replace('.', '\\.') + '$') : new RegExp('^\\d+' + m[4].replace('.', '\\.') + '$')
      fs.readdirSync(path.join(ROOT, decodeURIComponent(m[1]))).filter(n => re.test(n)).forEach(n => { const g = m[1] + n + (fq ? '?' + fq : ''); if (!files.includes(g)) files.push(g) })
    }
  })
  // a game that draws many pictures from one folder (Timmy's props: 24 of 277 in one run) picks others next time:
  // a folder with 8 or more recorded pictures comes along whole
  const per = {}
  ;(RUNTIME[id] || []).forEach(u => { const m = u.split('?')[0].match(/^(.*\/)[^/]+\.(?:webp|png|jpg|svg)$/); if (m) per[m[1]] = (per[m[1]] || 0) + 1 })
  Object.keys(per).filter(d => per[d] >= 8).forEach(d => {
    const dir = path.join(ROOT, decodeURIComponent(d)); if (!fs.existsSync(dir)) return
    fs.readdirSync(dir).filter(n => /\.(webp|png|jpg|svg)$/.test(n)).forEach(n => { const g = d + n; if (!files.includes(g) && !files.some(f => f.split('?')[0] === g)) files.push(g) })
  })
  games[id] = { page, files: files.sort() }
}
const all = new Set(Object.values(games).flatMap(g => g.files.map(f => decodeURIComponent(f.split('?')[0]))))
const bytes = [...all].reduce((n, f) => n + fs.statSync(path.join(ROOT, f)).size, 0)
const json = JSON.stringify({ about: 'PRD-23: files each beranda game needs offline. Built by tools/build-offline-manifest.mjs; do not edit.', bytes, games }, null, 1) + '\n'
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : ''
  if (cur !== json) { console.log('offline-manifest: STALE — run node tools/build-offline-manifest.mjs'); process.exit(1) }
  console.log(`offline-manifest: fresh (${Object.keys(games).length} games)`)
} else {
  fs.writeFileSync(OUT, json)
  console.log(`offline-manifest: ${Object.keys(games).length} games, ${new Set(Object.values(games).flatMap(g => g.files)).size} distinct files`)
}
