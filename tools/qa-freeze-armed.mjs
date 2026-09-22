// The freeze recovery net is PROVEN on two pages by qa-freeze-recovery, which
// actually kills the frames there. That is the expensive test, and it does not
// scale to every page -- but "the net exists in the repo" is not the same claim
// as "the net is installed on the page a child opens", and a script tag that
// 404s, loads too late, or is skipped by the service worker fails silently.
//
// This is the cheap half: on EVERY page that ships the watchdog, assert it
// actually installed itself and armed. The page list is taken from the
// FILESYSTEM, not from a hand-kept list, so a new game cannot quietly ship
// without the net.
import puppeteer from 'puppeteer'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..')
const BASE = process.env.QA_BASE || 'http://localhost:8081'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const fails = []
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fails.push(msg) }

// every page on disk that references the watchdog — the inventory, not a list
const pages = []
for (const f of fs.readdirSync(ROOT).filter(f => f.endsWith('.html'))) {
  if (fs.readFileSync(path.join(ROOT, f), 'utf8').includes('freeze-watchdog')) pages.push(f)
}
const GD = path.join(ROOT, 'games')
for (const f of fs.readdirSync(GD).filter(f => f.endsWith('.html'))) {
  if (fs.readFileSync(path.join(GD, f), 'utf8').includes('freeze-watchdog')) pages.push('games/' + f)
}
pages.sort()
// QA_PAGES narrows the run to a comma-separated subset. It exists so the gate's
// own failure path can be proven cheaply (break one page, expect it flagged)
// without a full 18-page sweep; the default is still the whole inventory.
const only = (process.env.QA_PAGES || '').split(',').map(x => x.trim()).filter(Boolean)
const targets = only.length ? pages.filter(p => only.some(o => p.includes(o))) : pages
console.log(`${targets.length} of ${pages.length} pages ship the watchdog\n`)

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
})

try {
  for (const p of targets) {
    const page = await browser.newPage()
    const cdp = await page.createCDPSession()
    await cdp.send('Network.setBypassServiceWorker', { bypass: true })
    await page.setViewport({ width: 1100, height: 720 })
    let navFailed = null
    for (const t of [45000, 120000]) {
      try { await page.goto(`${BASE}/${p}`, { waitUntil: 'domcontentloaded', timeout: t }); navFailed = null; break }
      catch (e) { navFailed = String(e.message).slice(0, 110) }
    }
    if (navFailed) { check(false, `${p}: page loads (${navFailed})`); await page.close(); continue }

    // the watchdog arms 8s after load on purpose, so a slow boot is not a freeze
    await sleep(11000)
    const r = await page.evaluate(() => ({
      installed: window.__freezeWatchdogInstalled === true,
      logFn: typeof window.freezeLog === 'function',
    }))
    check(r.installed, `${p}: watchdog installed`)
    check(r.logFn, `${p}: freezeLog() available for diagnosis`)
    await page.close()
  }
} finally {
  await browser.close()
}

console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
