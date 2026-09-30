// Render every authored story panel with its real owner art. Backgrounds may bleed;
// foreground sprites must remain whole inside the stage at each supported size.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import puppeteer from 'puppeteer'
const base = process.env.QA_URL || 'http://localhost:8081/games/timmy-kapal.html'
const sizes = (process.env.QA_SIZES || '1280x800,390x844,844x390').split(',').map(size => size.split('x').map(Number))
const shots = process.env.QA_SHOTS || '/tmp/timmy-story-art'
fs.mkdirSync(shots, { recursive: true })
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
let visits = 0
const failures = []
try {
  for (const [width, height] of sizes) {
    const page = await browser.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.setBypassServiceWorker(true)
    await page.setViewport({ width, height })
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
    await page.goto(base, { waitUntil: 'networkidle2' })
    const result = await page.evaluate(async () => {
      const panels = []
      function walk(value, path) {
        if (!value || typeof value !== 'object') return
        if (value.scene && Array.isArray(value.layers)) panels.push({ panel: value, path })
        else for (const key of Object.keys(value)) walk(value[key], path + '.' + key)
      }
      walk(TKWorlds.WORLDS, 'worlds')
      const host = document.createElement('div')
      host.style.cssText = 'position:fixed;inset:0;z-index:9999'
      document.body.appendChild(host)
      const bad = []
      let firstBad = null
      for (const { panel, path } of panels) {
        const handle = TKStory.play(host, [panel], {})
        await Promise.all([...host.querySelectorAll('img')].map(image => image.complete ? Promise.resolve() :
          new Promise(resolve => { image.onload = resolve; image.onerror = resolve })))
        dispatchEvent(new Event('resize'))
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
        const stage = host.querySelector('.tks-stage').getBoundingClientRect()
        const caption = host.querySelector('.tks-cap').getBoundingClientRect()
        for (const [index, image] of [...host.querySelectorAll('.tks-l img')].entries()) {
          const r = image.getBoundingClientRect()
          const covered = r.left < caption.right - 1 && r.right > caption.left + 1 && r.top < caption.bottom - 1 && r.bottom > caption.top + 1
          if (!image.naturalWidth || covered || r.left < stage.left - 1 || r.right > stage.right + 1 || r.top < stage.top - 1 || r.bottom > stage.bottom + 1) {
            bad.push({ path, covered, key: panel.layers[index].k, bounds: [r.left, r.top, r.right, r.bottom].map(Math.round), stage: [stage.width, stage.height] })
            if (!firstBad) firstBad = panel
          }
        }
        handle.destroy()
      }
      if (firstBad) { TKStory.play(host, [firstBad], {}); await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))) }
      else host.remove()
      return { panels: panels.length, bad }
    })
    visits += result.panels
    failures.push(...result.bad.map(finding => ({ size: `${width}x${height}`, ...finding })))
    if (result.bad.length) await page.screenshot({ path: `${shots}/${width}x${height}-first-crop.png` })
    assert.deepEqual(errors, [], `${width}x${height}: browser errors`)
    await page.close()
  }
} finally { await browser.close() }
fs.writeFileSync(`${shots}/findings.json`, JSON.stringify(failures, null, 2))
console.log(`qa-tk-story-art: ${visits} panels, ${failures.length} cropped, covered or missing sprites`)
if (failures.length) console.log(JSON.stringify(failures.slice(0, 12), null, 2))
process.exitCode = failures.length ? 1 : 0
