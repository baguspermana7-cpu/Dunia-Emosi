// qa-vfx-db.mjs — shared VFX library gate (assets/vfx/*.webp, vfx-db.json, games/data/vfx-db.js, VFX.play).
//   1. every db entry: file exists + decodes, sheet px size == cols*fw x rows*fh, frames <= cols*rows, last frame non-empty
//   2. license is shippable (cc0 / public-domain / owner-supplied-internal / restricted-product-only), license text file shipped,
//      credit present, sha256 present
//   3. no kid-unsafe tags (blood gore skull weapon slash muzzle scorch explosion dynamite spike) and kid_safe === true
//   4. vfx-db.js and vfx-db.json agree; every Pokemon type set references real entries and the 18 sets are all different
//   5. page: VFX.play cleans up (0 live nodes after the effect), the cap holds under a 60-effect flood, reduced motion = no transform
// QA_FAULT=1 raises the cap in-page (check 5 cap MUST fail). Run: node tools/qa-vfx-db.mjs | tail -3
import fs from 'fs'
import path from 'path'
import puppeteer from 'puppeteer'
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const BASE = process.env.QA_BASE || 'http://localhost:8081'
let fails = 0, passes = 0
const check = (ok, msg) => { if (ok) passes++; else { fails++; console.log('FAIL  ' + msg) } }
const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/vfx/vfx-db.json'), 'utf8'))
const OK_LIC = ['cc0', 'public-domain', 'owner-supplied-internal', 'restricted-product-only']
const BAD = /blood|gore|skull|weapon|slash|muzzle|scorch|explosion|dynamite|spike|knife|gun/
const TYPES = ['fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy','normal']

// -- decode with Pillow (sharp-free): read webp header through python once
import { execFileSync } from 'child_process'
const sizes = JSON.parse(execFileSync('python3', ['-c', `
import json,sys
from PIL import Image
db=json.load(open('${ROOT}/assets/vfx/vfx-db.json'))['effects']
out={}
for e in db:
    try:
        im=Image.open('${ROOT}/'+e['file']); im.load(); out[e['id']]=[im.size[0],im.size[1],
          (lambda a:a.getextrema()[1])(im.convert('RGBA').crop(((e['frames']-1)%e['cols']*e['fw'],((e['frames']-1)//e['cols'])*e['fh'],((e['frames']-1)%e['cols']+1)*e['fw'],((e['frames']-1)//e['cols']+1)*e['fh'])).getchannel('A'))]
    except Exception as ex: out[e['id']]=None
print(json.dumps(out))`], { maxBuffer: 1 << 26 }).toString())
let n = 0
for (const e of db.effects) {
  n++
  const sz = sizes[e.id]
  check(!!sz, e.id + ' decodes')
  if (sz) {
    check(sz[0] === e.cols * e.fw && sz[1] === e.rows * e.fh, `${e.id} sheet ${sz[0]}x${sz[1]} != ${e.cols}x${e.rows} of ${e.fw}x${e.fh}`)
    check(e.frames >= 1 && e.frames <= e.cols * e.rows && e.frames > (e.rows - 1) * e.cols, e.id + ' frame count vs grid')
    check(sz[2] > 8, e.id + ' last frame is empty')
  }
  check(OK_LIC.includes(e.license.status), `${e.id} license ${e.license.status} not shippable`)
  check(!!e.license.credit && !!e.license.file && fs.existsSync(path.join(ROOT, e.license.file)), e.id + ' license text file missing')
  check(/^[0-9a-f]{64}$/.test(e.sha256), e.id + ' sha256')
  check(e.kid_safe === true && !BAD.test(e.tags.join(' ')) && !BAD.test(e.id), e.id + ' kid-unsafe tag/id')
}
check(n >= 60, 'library has >= 60 effects (' + n + ')')
const js = fs.readFileSync(path.join(ROOT, 'games/data/vfx-db.js'), 'utf8')
const jsDb = JSON.parse(js.slice(js.indexOf('{'), js.lastIndexOf('}') + 1))
check(jsDb.effects.length === db.effects.length && JSON.stringify(jsDb.sets) === JSON.stringify(db.sets), 'vfx-db.js matches vfx-db.json')
const ids = new Set(db.effects.map(e => e.id))
const sig = new Set()
for (const t of TYPES) {
  const s = db.sets[t]
  check(!!s, 'set for ' + t)
  if (!s) continue
  for (const k of ['windup', 'head', 'trail', 'impact', 'crit', 'flare']) check(s[k] && ids.has(s[k].id), `${t}.${k} references a real entry`)
  sig.add(['windup', 'head', 'trail', 'impact'].map(k => s[k].id + '/' + s[k].filter).join('|'))
}
check(sig.size === TYPES.length, 'every type has its own effect set (' + sig.size + '/' + TYPES.length + ' distinct)')
for (const k of ['_heal', '_shield', '_whiff']) check(!!db.sets[k], 'status set ' + k)
// total size
const tot = db.effects.reduce((a, e) => a + fs.statSync(path.join(ROOT, e.file)).size, 0)
check(tot < 25e6, 'library under 25 MB (' + (tot / 1e6).toFixed(1) + ')')

// -- page checks
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
async function page (reduce) {
  const p = await b.newPage(); const errs = []
  p.on('pageerror', e => errs.push(e.message))
  if (reduce) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await p.setViewport({ width: 1024, height: 700 })
  await p.goto(BASE + '/games/garasi-tempur.html', { waitUntil: 'domcontentloaded' })
  await p.addScriptTag({ url: BASE + '/games/data/vfx-db.js' }); await p.addScriptTag({ url: BASE + '/games/vfx-poke.js' })
  if (process.env.QA_FAULT) await p.evaluate(() => { window.__fault = 1; VFX._setCap(99) })
  return { p, errs }
}
{
  const { p, errs } = await page(false)
  const r = await p.evaluate(async () => {
    const out = {}
    out.pick = !!VFX.pick({ tags: ['fire'] }) && !VFX.pick({ tags: ['slash'] }) && !!VFX.pick({ any: ['heal', 'shield'] })
    out.pickSeed = VFX.pick({ tags: ['impact'], seed: 3 }).id === VFX.pick({ tags: ['impact'], seed: 3 }).id
    const nodes = () => [...document.body.children].filter(n => n.getAttribute('aria-hidden') === 'true' && n.style.position === 'fixed').length
    let done = 0
    VFX.play('px-fire', { x: 200, y: 200, size: 90, duration: 300, onDone: () => done++ })
    await new Promise(r => setTimeout(r, 100)); out.mid = nodes()
    await new Promise(r => setTimeout(r, 700)); out.after = nodes(); out.done = done
    let peak = 0
    for (let i = 0; i < 60; i++) { VFX.play('bk-star-03', { x: 100 + i, y: 100, size: 40, duration: 400 }); peak = Math.max(peak, nodes()) }
    out.peak = peak; out.cap = VFX.cap()
    await new Promise(r => setTimeout(r, 1000)); out.flood_after = nodes(); out.live = VFX.liveCount()
    // projectile: onHit fires once near its duration, all nodes gone after
    let hit = 0, t0 = performance.now(), tHit = 0
    VFX.projectile('px-flamelash', { x: 50, y: 400 }, { x: 600, y: 300 }, { duration: 300, trail: 'bk-flame-01', impact: 'px-brightfire', onHit: () => { hit++; tHit = performance.now() - t0 } })
    await new Promise(r => setTimeout(r, 1400))
    out.hit = hit; out.tHit = Math.round(tHit); out.proj_after = nodes()
    // legacy API intact
    out.legacy = ['burst', 'aura', 'dom', 'domAura', 'domProjectile', 'typeFx', 'preload', 'effects'].every(k => typeof VFX[k] === 'function')
    return out
  })
  check(r.pick && r.pickSeed, 'VFX.pick filters (fire ok, slash blocked, any works, seeded)')
  check(r.mid === 1 && r.after === 0 && r.done === 1, `VFX.play cleans up (mid ${r.mid}, after ${r.after}, onDone ${r.done})`)
  check(r.peak <= r.cap, `cap holds under a 60-effect flood (peak ${r.peak} <= ${r.cap})`)
  check(r.flood_after === 0 && r.live === 0, 'flood fully cleaned up')
  check(r.hit === 1 && r.tHit >= 280 && r.tHit <= 520 && r.proj_after === 0, `projectile onHit once at ~duration (${r.tHit} ms), clean after`)
  check(r.legacy, 'legacy VFX API intact')
  check(errs.length === 0, 'no page errors: ' + errs.slice(0, 2).join(' | '))
  await p.close()
}
{
  const { p, errs } = await page(true)
  const r = await p.evaluate(async () => {
    const out = { tf: 0 }
    VFX.play('px-fire', { x: 200, y: 200, size: 90, rotate: 40, spin: 90, duration: 300 })
    VFX.projectile('px-flamelash', { x: 50, y: 400 }, { x: 600, y: 300 }, { duration: 300, trail: 'bk-flame-01', impact: 'px-brightfire', onHit: () => { out.hit = performance.now() } })
    for (let i = 0; i < 8; i++) { await new Promise(r => setTimeout(r, 50)); [...document.body.children].forEach(n => { if (n.style.position === 'fixed' && n.style.transform && n.style.transform !== 'none') out.tf++ }) }
    await new Promise(r => setTimeout(r, 900)); out.left = [...document.body.children].filter(n => n.style.position === 'fixed' && n.getAttribute('aria-hidden')).length
    return out
  })
  check(r.tf === 0, 'reduced motion: no transform animation (' + r.tf + ')')
  check(r.hit > 0 && r.left === 0, 'reduced motion: impact still lands and cleans up')
  check(errs.length === 0, 'reduced: no page errors')
  await p.close()
}
await b.close()
console.log(`vfx-db: ${n} effects, ${(tot / 1e6).toFixed(1)} MB, ${Object.entries(db.effects.reduce((a, e) => (a[e.license.status] = (a[e.license.status] || 0) + 1, a), {})).map(x => x.join(' ')).join(', ')}`)
console.log(`${fails ? 'FAIL' : 'PASS'}  ${passes} passed, ${fails} failed`)
process.exit(fails ? 1 : 0)
