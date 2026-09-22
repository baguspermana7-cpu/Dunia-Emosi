// Every Film game was crawled from a vendor CDN, and the bundles still carry
// their original absolute URLs (cloudfront, games.toon-cdn.com, fast.fonts.net,
// google fonts...). A grep cannot tell a live request from a leftover constant
// in a comment or a licence header, so this asks the only question that
// matters: does the game REACH THE INTERNET at runtime?
//
// It matters twice over. A game that needs an external origin cannot work
// offline no matter how perfectly it was installed -- and a children's app
// should not be phoning out to third-party CDNs at all.
//
// Every request to a non-local origin is ABORTED, then the game must still
// boot and render a sized canvas. Cheaper than the offline harness (no 196 MB
// of installs) and it covers all 17 games rather than 2.
import puppeteer from 'puppeteer'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..')
const BASE = process.env.QA_BASE || 'http://localhost:8081'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const fails = []
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fails.push(msg) }

const FILM = path.join(ROOT, 'games', 'film')
const only = (process.env.QA_ONLY || '').split(',').map(x => x.trim()).filter(Boolean)
const slugs = fs.readdirSync(FILM)
  .filter(s => fs.existsSync(path.join(FILM, s, 'index.html')))
  .filter(s => (only.length ? only.some(o => s.includes(o)) : true))
  .sort()
console.log(`${slugs.length} film games\n`)

const isLocal = u => /^(https?:\/\/)?(127\.0\.0\.1|localhost)(:|\/)/.test(u) || u.startsWith('data:') || u.startsWith('blob:')

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--mute-audio'],
})

// One attempt per game, plus ONE retry on a render miss. 17 games booted back
// to back on a loaded box makes a slow boot look like a broken one: a run
// flagged to-the-rescue at 0x0 that scored 800x450 when run on its own. A retry
// separates slow from broken; a genuinely broken game fails both times.
async function attempt(slug) {
  {
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 720 })
    const blocked = []
    await page.setRequestInterception(true)
    page.on('request', req => {
      const u = req.url()
      if (isLocal(u)) { req.continue().catch(() => {}); return }
      blocked.push(u.replace(/^(https?:\/\/[^/]+).*$/, '$1'))
      req.abort().catch(() => {})
    })

    let navFailed = null
    for (const t of [45000, 120000]) {
      try { await page.goto(`${BASE}/games/film-play.html?g=${slug}`, { waitUntil: 'domcontentloaded', timeout: t }); navFailed = null; break }
      catch (e) { navFailed = String(e.message).slice(0, 90) }
    }
    if (navFailed) { check(false, `${slug}: page loads (${navFailed})`); await page.close(); return null }
    await sleep(6000)
    // gotham asks which chaser first and leaves the frame empty until you pick
    await page.evaluate(async () => {
      const skip = [...document.querySelectorAll('button, [onclick], a')]
        .find(b => /langsung main/i.test(b.textContent || ''))
      if (skip) { skip.click(); await new Promise(r => setTimeout(r, 2500)) }
    }).catch(() => {})

    let canvas = { w: 0, h: 0 }
    // Request interception routes every request through CDP, which slows a
    // boot noticeably; the biggest bundle here is 42 MB. Wait generously, or
    // the gate reports a slow game as a broken one.
    for (let i = 0; i < 40; i++) {
      await sleep(2000)
      const m = await page.evaluate(() => {
        const fr = document.getElementById('frame')
        let best = { w: 0, h: 0 }
        try {
          const d = fr && fr.contentDocument
          if (d) {
            // Walk OPEN SHADOW ROOTS too. The Flash games run under Ruffle,
            // which puts its canvas inside <ruffle-player>'s shadow DOM where
            // a plain querySelectorAll('canvas') finds nothing -- that reported
            // 0x0 for thomas-lift-load-haul, a game rendering perfectly.
            // qa-film-games already learned this; same walker here.
            const cs = []
            ;(function walk(root) {
              root.querySelectorAll('*').forEach(el => {
                if (el.tagName === 'CANVAS') cs.push(el)
                if (el.shadowRoot) walk(el.shadowRoot)
              })
            })(d)
            cs.forEach(c => {
              const r = c.getBoundingClientRect()
              if (r.width * r.height > best.w * best.h) best = { w: Math.round(r.width), h: Math.round(r.height) }
            })
          }
        } catch (e) {}
        return best
      }).catch(() => ({ w: 0, h: 0 }))
      if (m.w * m.h > canvas.w * canvas.h) canvas = m
      if (canvas.w >= 200) break
    }
    const origins = [...new Set(blocked)]
    await page.close()
    return { canvas, origins, navFailed: null }
  }
}

try {
  for (const slug of slugs) {
    let r = await attempt(slug)
    if (r && r.canvas && r.canvas.w < 200) r = await attempt(slug)   // slow, or broken?
    if (!r) continue
    check(r.canvas.w >= 200, `${slug}: renders with the internet CUT (canvas ${r.canvas.w}x${r.canvas.h})`)
    check(r.origins.length === 0, `${slug}: asks for NO external origin${r.origins.length ? ' — ' + r.origins.slice(0, 3).join(', ') : ''}`)
  }
} finally {
  await browser.close()
}

console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
