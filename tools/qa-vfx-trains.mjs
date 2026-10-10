// qa-vfx-trains.mjs — VFX.Moment wiring on the train games (balapan-kereta, selamatkan-kereta, lokomotif-pemberani, museum-kereta).
// Loads each page, checks the library is present, fires the page's own moment helper (vfxMoment / VFX.Moment.reward on a button)
// and asserts: effect nodes appear, are >= 110 px, sit on top, are gone within 2.5 s, no page errors.
import puppeteer from 'puppeteer'
const BASE = process.env.QA_BASE || 'http://localhost:8081', sleep = ms => new Promise(r => setTimeout(r, ms))
let fails = 0, passes = 0
const check = (ok, msg) => { if (ok) passes++; else { fails++; console.log('FAIL  ' + msg) } }
const PAGES = [['balapan-kereta', "vfxMoment('reward', 400, 300, 1)"], ['selamatkan-kereta', "vfxMoment('celebrate', 400, 300, 1)"],
  ['lokomotif-pemberani', "vfxMoment('reward', 400, 300, 1.2)"], ['museum-kereta', "VFX.Moment.reward(document.body.firstElementChild, { size: 160 })"]]
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
for (const [name, call] of PAGES) {
  const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message))
  await p.setViewport({ width: 1100, height: 700 })
  await p.goto(`${BASE}/games/${name}.html`, { waitUntil: 'domcontentloaded', timeout: 40000 }); await sleep(2500)
  const r = await p.evaluate(async (call) => {
    const o = { lib: !!(window.VFX && VFX.Moment && VFX.Moment.ready()) }
    if (!o.lib) return o
    try { (0, eval)('try { if (!app) app = { canvas: document.body, screen: { width: innerWidth, height: innerHeight } } } catch (e) { app = { canvas: document.body, screen: { width: innerWidth, height: innerHeight } } }') } catch (e) {}   // game not started: stub the Pixi app so the page helper has a canvas
    try { (0, eval)(call.replace(/^vfxMoment/, 'window.__vm = typeof vfxMoment === "function" ? vfxMoment : null; (window.__vm||function(){throw new Error("no vfxMoment")})')) } catch (e) { o.err = String(e) }
    await new Promise(r => setTimeout(r, 150))
    const n = [...document.querySelectorAll('[data-vfx]')]; o.n = n.length
    const g = n.find(x => x.getAttribute('data-vfx') === 'moment-glow'); o.size = g ? Math.max(g.offsetWidth, g.offsetHeight) : 0
    if (g) { g.style.pointerEvents = 'auto'; const rc = g.getBoundingClientRect(); o.top = document.elementFromPoint(rc.left + rc.width / 2, rc.top + rc.height / 2) === g; g.style.pointerEvents = 'none' }
    await new Promise(r => setTimeout(r, 2300)); o.left = document.querySelectorAll('[data-vfx]').length
    return o
  }, call)
  if (process.env.QA_DEBUG) console.log(name, JSON.stringify(r))
  check(r.lib, `${name}: library loaded`)
  check(!r.err, `${name}: moment helper ran (${r.err || 'ok'})`)
  check(r.n >= 3 && r.size >= 110, `${name}: effect visible (${r.n} nodes, glow ${r.size}px)`)
  check(r.top, `${name}: on top`)
  check(r.left === 0, `${name}: cleaned up (${r.left})`)
  check(errs.length === 0, `${name}: no page errors: ${errs.slice(0, 2).join(' | ')}`)
  await p.close()
}
await b.close()
console.log(`${fails ? 'FAIL' : 'PASS'}  qa-vfx-trains: ${passes} passed, ${fails} failed`)
process.exit(fails ? 1 : 0)
