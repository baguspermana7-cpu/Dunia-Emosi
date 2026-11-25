#!/usr/bin/env node
// test-prd58f-sw-trim — PRD-58 F1 (docs/prd/PRD-58-kembangkan-dan-sempurnakan.md): the service worker's asset cache
// keeps only the current release. CACHE_VERSION never moved (v63.21), so every release added its own `?v=<token>`
// copy of every script and stylesheet and the old copies stayed on the child's phone forever.
// Runs sw.js in a vm with fake caches, fires `activate`, and checks what is left:
//   - an asset with an OLD release token is gone, the same asset with the CURRENT token stays
//   - an unversioned asset (pictures, sounds: the offline game downloads) stays
//   - a downloaded film bucket (dunia-film-*) is untouched; an old dunia-assets-* bucket is deleted
// Usage: node tools/test-prd58f-sw-trim.mjs
import fs from 'node:fs'
import vm from 'node:vm'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8')
const cur = (src.match(/\?v=(v\d+\.\d+-\d{8}[a-z]?)/) || [])[1]
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }
ok(!!cur, `sw.js carries the release token (${cur})`)

const ORIGIN = 'https://kid.example'
function makeCache () {
  const m = new Map()
  return {
    m,
    keys: async () => [...m.keys()].map(u => ({ url: u })),
    delete: async r => m.delete(typeof r === 'string' ? r : r.url),
    put: async (r, v) => { m.set(typeof r === 'string' ? r : r.url, v) },
    match: async r => m.get(typeof r === 'string' ? r : r.url),
    addAll: async () => {}
  }
}
const store = new Map()
const caches = {
  keys: async () => [...store.keys()],
  open: async n => { if (!store.has(n)) store.set(n, makeCache()); return store.get(n) },
  delete: async n => store.delete(n),
  match: async () => undefined
}
const listeners = {}
const self = {
  addEventListener: (t, f) => { listeners[t] = f },
  clients: { claim: async () => {}, matchAll: async () => [] },
  skipWaiting: () => {},
  location: { origin: ORIGIN, href: ORIGIN + '/sw.js' },
  registration: { scope: ORIGIN + '/' }
}
const ctx = { self, caches, console: { log () {}, warn () {}, error () {} }, URL, Response: class {}, Request: class {}, fetch: async () => ({}), setTimeout, clearTimeout, Promise }
ctx.globalThis = ctx
vm.createContext(ctx)
vm.runInContext(src, ctx, { filename: 'sw.js' })
const ASSET = vm.runInContext('ASSET_CACHE', ctx)
const REL = vm.runInContext('typeof RELEASE === "string" ? RELEASE : null', ctx)
ok(REL === cur, `RELEASE (${REL}) is the token of the precache list (${cur}): the release sed bumps both`)

const old = 'v64.80-20261101a'
const a = await caches.open(ASSET)
const U = {
  oldJs: `${ORIGIN}/game.js?v=${old}`,
  oldCss: `${ORIGIN}/style.css?v=${old}`,
  curJs: `${ORIGIN}/game.js?v=${cur}`,
  pic: `${ORIGIN}/assets/db/lib/apel.webp`,
  sound: `${ORIGIN}/Sounds/train-bgm.mp3`,
  other: `${ORIGIN}/games/data/x.json?v=2`
}
for (const u of Object.values(U)) await a.put(u, 'body')
const film = await caches.open('dunia-film-batwheels'); await film.put(`${ORIGIN}/games/film/batwheels/a.js?v=${old}`, 'body')
await caches.open('dunia-assets-v60.1-20260801a')

let waited = null
listeners.activate({ waitUntil: p => { waited = p } })
await waited

const left = new Set([...a.m.keys()])
ok(!left.has(U.oldJs) && !left.has(U.oldCss), `old release copies removed: game.js ${!left.has(U.oldJs)}, style.css ${!left.has(U.oldCss)}`)
ok(left.has(U.curJs), `current release copy kept (${left.has(U.curJs)})`)
ok(left.has(U.pic) && left.has(U.sound) && left.has(U.other), `unversioned / non-release entries kept: picture ${left.has(U.pic)}, sound ${left.has(U.sound)}, ?v=2 ${left.has(U.other)}`)
ok(store.has('dunia-film-batwheels') && store.get('dunia-film-batwheels').m.size === 1, 'downloaded film bucket untouched')
ok(!store.has('dunia-assets-v60.1-20260801a'), 'an old asset bucket is deleted')
console.log(`test-prd58f-sw-trim: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
