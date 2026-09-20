// Scene probe for Batwheels Gotham Getaway (games/film/batwheels-gotham-getaway).
//
// Kept because it is the only way found so far to see inside this bundle, and
// because its LIMITS are the useful part of the record:
//
//   * window.Phaser cannot be trapped from outside -- the page installs its own
//     configurable trap on that property and replaces any earlier one. The live
//     SceneManager is captured from its per-frame `update` instead.
//   * Forcing `sm.start('Game')` REPRODUCES A FREEZE, but it is the probe's own:
//     it skips LevelSelect, where the engine builds runSettings, and the render
//     loop then dies on a null Spine skeleton (`skeletonData` / `isGLTexture`).
//     That is a real demonstration of the freeze CLASS -- one throw inside the
//     frame and the picture stops with the page still responsive -- but it is
//     not evidence about the owner's report.
//   * Synthetic clicks do not reach the bundle's own buttons: neither guessed
//     coordinates nor the display list's input-enabled objects (walked and
//     clicked at their scaled screen positions) get past Title/LevelSelect.
//
// So a faithful headless reproduction of the owner's combination is still open.
// What shipped instead is recovery: games/data/freeze-watchdog.js notices a dead
// frame chain -- including inside the film player's iframe -- and shows a card
// that carries the last error for a screenshot.
//
// Usage:
//   GG='{"hero":"bam","villain":"quizz","city":"frozenstreet"}' SECS=90 \
//     node tools/qa-gg-scene-probe.mjs
import puppeteer from 'puppeteer'
import crypto from 'crypto'
const CFG = JSON.parse(process.env.GG || '{"hero":"bam","villain":"quizz","city":"frozenstreet"}')
const SECS = +(process.env.SECS || 100)
const sleep = ms => new Promise(r => setTimeout(r, ms))
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage()
await p.setViewport({ width: 1100, height: 620 })
const errs = [], bad = []
p.on('pageerror', e => errs.push('PAGEERROR ' + String(e.message).slice(0, 180)))
p.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/favicon/.test(t)) errs.push('CONSOLE ' + t.slice(0, 180)) })
p.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url().split('/').slice(-2).join('/')) })

await p.evaluateOnNewDocument(cfg => {
  sessionStorage.setItem('gg_custom', JSON.stringify(cfg))
  // Capture the live SceneManager from its per-frame update, which runs on the
  // instance. Trapping window.Phaser does not work: the page installs its own
  // trap on the same property and replaces ours.
  window.__hookScene = function () {
    const P = window.Phaser
    if (!P || !P.Scenes || window.__hooked) return false
    const SM = P.Scenes.SceneManager.prototype
    const up = SM.update
    SM.update = function () { window.__sm = this; return up.apply(this, arguments) }
    window.__hooked = true
    return true
  }
}, CFG)

await p.goto('http://localhost:8081/games/film/batwheels-gotham-getaway/index.html', { waitUntil: 'domcontentloaded', timeout: 60000 })
for (let i = 0; i < 40 && !(await p.evaluate(() => window.__hookScene && window.__hookScene())); i++) await sleep(500)
for (let i = 0; i < 40 && !(await p.evaluate(() => !!window.__sm)); i++) await sleep(500)
// Do NOT force the Game scene: starting it directly skips LevelSelect, where the
// engine builds runSettings, and the resulting `skeletonData` null is the probe's
// own doing rather than the bug being hunted.
//
// Blind clicks at guessed coordinates did not land either, so press what the
// scene itself says is pressable: walk the display list for input-enabled
// objects and click their real screen positions, scaled from the canvas rect.
async function pressables () {
  return p.evaluate(() => {
    try {
      const canvas = document.querySelector('canvas')
      const r = canvas.getBoundingClientRect()
      const scenes = window.__sm.getScenes(true)
      const out = []
      for (const sc of scenes) {
        const sx = r.width / sc.scale.width, sy = r.height / sc.scale.height
        const walk = (list) => {
          for (const o of list) {
            if (o.input && o.input.enabled && o.visible !== false) {
              const b = (o.getBounds && o.getBounds()) || null
              if (b && b.width > 4 && b.height > 4) {
                out.push({ scene: sc.scene.key, name: o.name || o.type,
                           x: Math.round(r.left + (b.centerX * sx)), y: Math.round(r.top + (b.centerY * sy)) })
              }
            }
            if (o.list && o.list.length) walk(o.list)
          }
        }
        walk(sc.children.list)
      }
      return out
    } catch (e) { return [] }
  })
}
let entered = false
for (let round = 0; round < 8 && !entered; round++) {
  const hits = await pressables()
  if (!hits.length) await sleep(1200)
  for (const h of hits.slice(0, 8)) {
    try { await p.mouse.click(h.x, h.y) } catch (_) {}
    await sleep(900)
    entered = await p.evaluate(() => { try { return window.__sm.getScenes(true).some(s => s.scene.key === 'Game') } catch (e) { return false } })
    if (entered) { console.log('entered via', h.scene + '/' + h.name); break }
  }
}
console.log('cfg', JSON.stringify(CFG), '| reached Game by tapping:', entered)
await sleep(8000)
console.log('composed:', JSON.stringify(await p.evaluate(() => window.__ggComposed || null)))

const hashes = []
let lastNew = 0, frozenAt = null
for (let i = 0; i < SECS / 2; i++) {
  try { await p.mouse.click(550, 380); await p.keyboard.press('Space') } catch (_) {}
  const buf = await p.screenshot({ encoding: 'binary' })
  const h = crypto.createHash('md5').update(buf).digest('hex').slice(0, 10)
  if (!hashes.length || hashes[hashes.length - 1] !== h) lastNew = i
  hashes.push(h)
  if (i - lastNew >= 5) { frozenAt = i * 2; break }
  await sleep(2000)
}
console.log(`frames=${hashes.length} unique=${new Set(hashes).size} lastChange=${lastNew * 2}s frozen=${frozenAt === null ? 'no' : frozenAt + 's'}`)
console.log('scene now:', await p.evaluate(() => { try { return window.__sm.getScenes(true).map(s => s.scene.key).join(',') } catch (e) { return 'n/a' } }))
console.log('errors:', errs.slice(0, 5).join('\n  ') || 'none')
console.log('http>=400:', [...new Set(bad)].slice(0, 8).join('\n  ') || 'none')
await p.screenshot({ path: 'tools/qa-out/gg-' + CFG.hero + '-' + CFG.villain + '-' + CFG.city + '.png' })
await b.close()
