// qa-hud-responsive.mjs (v55.81)
// Verifies the SHARED glossy HUD buttons (du-hud.css) harmonize across the two
// standalone train games AND that the top HUD survives narrow phones with NO
// horizontal overflow and all utility buttons >=40px (effectively >=44 target).
//
//   games:    lokomotif-pemberani (g15) + balapan-kereta-side (g14-side)
//   viewports: 360x640 (phone) / 768x1024 (tablet) / 1280x720 (desktop)
//
// Boot per game (real flow):
//   g15      -> sessionStorage.g15Config={level:1}; click #train-grid .tcard
//   g14-side -> sessionStorage['g14-side-train']='aeg_thomas';
//               localStorage['g14s-tutorial-seen']='1'
//
// Asserts per game+viewport:
//   - NO horizontal overflow (documentElement.scrollWidth <= innerWidth + 2)
//   - every VISIBLE button in #hud-top has rect width>=40 AND height>=40
//   - 0 console/page errors (favicon / pokemon / network ignored)
// Screenshots: tools/qa-out/hud-<game>-<w>.png  +  start-screen shots.
import puppeteer from 'puppeteer'
import fs from 'fs'

const OUT = 'tools/qa-out'
fs.mkdirSync(OUT, { recursive: true })

const VIEWPORTS = [
  { w: 360, h: 640 },
  { w: 768, h: 1024 },
  { w: 1280, h: 720 },
]

const GAMES = [
  {
    key: 'g15',
    url: 'http://localhost:8081/games/lokomotif-pemberani.html',
    seed: () => { sessionStorage.setItem('g15Config', JSON.stringify({ level: 1 })) },
    boot: () => { const c = document.querySelector('#train-grid .tcard'); if (c) c.click() },
  },
  {
    key: 'g14side',
    url: 'http://localhost:8081/games/balapan-kereta-side.html',
    seed: () => {
      sessionStorage.setItem('g14-side-train', 'aeg_thomas')
      localStorage.setItem('g14s-tutorial-seen', '1')
    },
    boot: () => {},
  },
]

const IGNORE = /favicon|Pokedex|pokemondb|showdown|net::ERR|Failed to load resource|ERR_/i

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
})

const sleep = ms => new Promise(r => setTimeout(r, ms))
const results = []
let hardFail = false

for (const game of GAMES) {
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage()
    await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 })
    const errors = []
    page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(m.text()) })
    page.on('pageerror', e => { if (!IGNORE.test(e.message)) errors.push('PAGEERROR: ' + e.message) })

    await page.evaluateOnNewDocument(game.seed)
    try {
      await page.goto(game.url, { waitUntil: 'networkidle2', timeout: 30000 })
    } catch (e) { errors.push('GOTO: ' + e.message) }
    await sleep(1200)

    // Screenshot the start screen once (largest viewport carries the eyeball shot).
    if (vp.w === 1280) {
      await page.screenshot({ path: `${OUT}/hud-${game.key}-start.png` })
    }

    // Boot into gameplay (mounts the in-game HUD).
    await page.evaluate(game.boot)
    await sleep(3000)

    const probe = await page.evaluate(() => {
      const docW = document.documentElement.scrollWidth
      const innerW = window.innerWidth
      const hud = document.getElementById('hud-top')
      const btns = []
      if (hud) {
        hud.querySelectorAll('button').forEach(b => {
          const r = b.getBoundingClientRect()
          const st = getComputedStyle(b)
          const visible = st.display !== 'none' && st.visibility !== 'hidden' &&
                          parseFloat(st.opacity || '1') > 0.01 && r.width > 0 && r.height > 0
          btns.push({
            id: b.id || '(noid)',
            cls: b.className || '',
            w: Math.round(r.width),
            h: Math.round(r.height),
            visible,
          })
        })
      }
      return { docW, innerW, hudPresent: !!hud, btns }
    })

    await page.screenshot({ path: `${OUT}/hud-${game.key}-${vp.w}.png` })

    // ---- Assertions ----
    const overflow = probe.docW > probe.innerW + 2
    const smallBtns = probe.btns.filter(b => b.visible && (b.w < 40 || b.h < 40))
    const ok = !overflow && smallBtns.length === 0 && errors.length === 0 && probe.hudPresent

    if (!ok) hardFail = true
    results.push({
      game: game.key, vp: `${vp.w}x${vp.h}`, ok,
      overflow: overflow ? `${probe.docW}>${probe.innerW}` : 'no',
      hud: probe.hudPresent,
      smallBtns: smallBtns.map(b => `${b.id}(${b.w}x${b.h})`),
      visBtns: probe.btns.filter(b => b.visible).map(b => `${b.id} ${b.w}x${b.h}`),
      errors,
    })
    await page.close()
  }
}

await browser.close()

console.log('\n=== HUD RESPONSIVE PROBE (v55.81) ===\n')
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.game.padEnd(8)} ${r.vp.padEnd(10)} overflow=${r.overflow} hud=${r.hud}`)
  console.log(`        buttons: ${r.visBtns.join(' | ')}`)
  if (r.smallBtns.length) console.log(`        SMALL: ${r.smallBtns.join(', ')}`)
  if (r.errors.length) console.log(`        ERRORS: ${r.errors.join(' || ')}`)
}
console.log(`\nScreenshots in ${OUT}/  (hud-<game>-<w>.png + hud-<game>-start.png)\n`)
console.log(hardFail ? 'RESULT: FAIL\n' : 'RESULT: ALL GREEN\n')
process.exit(hardFail ? 1 : 0)
