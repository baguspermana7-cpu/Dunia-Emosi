#!/usr/bin/env node
// qa-perf-budget — PRD-33. The performance budget as a gate: four numbers per page that held still across two survey runs
// on a loaded machine (docs/audit/perf-survey-2026-11-17.md), ratcheted against tools/perf-budget.json.
//   bytes : first-screen bytes (CDP encodedDataLength of every request the page makes by itself before a tap: `load` + at least 6 s,
//           until the network has been still for 2.5 s, so an idle-time asset prefetch is counted whole, not at a random point;
//           a body nobody reads (the offline warmers' fetch(), a streaming <audio>) never "finishes": it counts at its announced Content-Length)
//   req   : requests in that first screen
//   audio : audio bytes downloaded before the first tap (audio/* response or an audio file extension)
//   dom   : DOM nodes after 15 s of play (same-origin iframes included), counted AFTER the page's real entry into gameplay
//           (tools/lib/enter-play.mjs) and the survey's tapper
// Fails when any number is more than 5 % ABOVE its baseline (a number may fall freely; lower the baseline with QA_UPDATE=1).
// DOM only: or more than 40 nodes above, whichever is larger (a small page's own state moves it by a few nodes; 600 hidden nodes still fail everywhere).
// Fails when a page has no baseline, and when a page's entry recipe no longer reaches play (that would measure a menu).
// No CPU throttle (the survey's frame/long-task numbers are noise at this size and stay a report: tools/qa-perf-survey.mjs).
// Serves the tree itself (gzip on text like GitHub Pages, no cache) on a free port; sound left as a first-time visitor has it.
//
//   node tools/run-gates.mjs --tag perf                      the way it runs (browser lock + timeout come from the runner)
//   TMPDIR=$HOME/.cache/qa-tmp flock -w 1800 /tmp/claude-1000/kereta-browser.lock timeout 1500 node tools/qa-perf-budget.mjs
//   QA_UPDATE=1   rewrite the baseline from this run (refused when a recipe failed)     QA_ONLY=regex   a subset (update keeps the rest)
//   QA_PLAY_MS=15000   QA_BASELINE=tools/perf-budget.json   screenshots -> tools/qa-out/perf-budget/<page>.png (end of play)
// run-gates: timeout 1800
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'
import { ROOT, startServer, instrument, candidates, sleep, pageList, tapOnce, countDom } from './lib/perf-core.mjs'
import { enterPlay, entryUrl, isPlaying, avoidFor } from './lib/enter-play.mjs'

const PLAY_MS = +(process.env.QA_PLAY_MS || 15000), TOL = 0.05, DOM_SLACK = 40, UPDATE = process.env.QA_UPDATE === '1'
const BASE_FILE = path.resolve(ROOT, process.env.QA_BASELINE || 'tools/perf-budget.json')
const SHOTS = path.join(ROOT, 'tools/qa-out/perf-budget')
const METRICS = [['bytes', 'first-screen bytes'], ['req', 'requests'], ['audio', 'audio bytes before first tap'], ['dom', 'DOM nodes after 15 s play']]
let PAGES = pageList()
if (process.env.QA_ONLY) { const re = new RegExp(process.env.QA_ONLY); PAGES = PAGES.filter(p => re.test(p)) }

const AUDIO_EXT = /\.(mp3|ogg|oga|wav|m4a|aac|opus|flac)(\?|#|$)/i
const kb = b => Math.round(b / 102.4) / 10 + ' kB'

async function measure (b, origin, pg) {
  const url = origin + entryUrl(pg), errs = []
  const ctx = await b.createBrowserContext()
  const p = await ctx.newPage()
  const res = { page: pg }
  try {
    await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
    await p.evaluateOnNewDocument(instrument, { soundDefault: true })
    await p.evaluateOnNewDocument(`window.__cand = ${candidates.toString()}`)
    p.on('pageerror', e => errs.push(String(e).slice(0, 120)))
    p.on('dialog', d => d.dismiss().catch(() => {}))
    const cdp = await p.createCDPSession()
    await cdp.send('Network.enable'); await cdp.send('Network.setBypassServiceWorker', { bypass: true }).catch(() => {})
    const reqs = new Map()
    let act = Date.now()   // last request started / finished
    cdp.on('Network.requestWillBeSent', e => { if (!/^(data:|blob:)/.test(e.request.url) && !/\/favicon\.ico/.test(e.request.url) && !reqs.has(e.requestId)) { reqs.set(e.requestId, { url: e.request.url, mime: '', bytes: 0, rx: 0, cl: 0, done: false }); act = Date.now() } })
    cdp.on('Network.responseReceived', e => { const r = reqs.get(e.requestId); if (r) { r.mime = e.response.mimeType || ''; const h = e.response.headers || {}; r.cl = +(h['Content-Length'] || h['content-length'] || 0) } })
    cdp.on('Network.dataReceived', e => { const r = reqs.get(e.requestId); if (r) { r.rx += e.encodedDataLength || 0; act = Date.now() } })   // a fetch() whose body nobody reads never "finishes" (the offline warmers, a streaming <audio>)
    cdp.on('Network.loadingFinished', e => { const r = reqs.get(e.requestId); if (r) { r.bytes = e.encodedDataLength; r.done = true; act = Date.now() } })
    cdp.on('Network.loadingFailed', e => { const r = reqs.get(e.requestId); if (r) { r.done = true; act = Date.now() } })

    await p.goto(url, { waitUntil: 'load', timeout: 60000 })
    // first screen = what the page loads by itself before a tap. garasi-tempur and mojo-swoptops start an idle-time asset prefetch
    // ~2 s after `load` (479 / 800 requests until ~9 s), so a snapshot taken at `load` + 1 s or after a short lull counts a random part of it.
    // Wait at least 6 s, then until nothing has started, arrived or finished for 2.5 s (40 s at most): the totals no longer depend on timing.
    for (const t0 = Date.now(); Date.now() - t0 < 40000;) {
      await sleep(250)
      if (Date.now() - t0 >= 6000 && Date.now() - act >= 2500) break
    }
    const all = [...reqs.values()], got = r => r.done ? r.bytes : (r.cl || r.rx)   // unread bodies: the size the response announced (what arrived so far depends on timing)
    res.bytes = all.reduce((s, r) => s + got(r), 0)
    res.req = all.length
    res.audio = all.filter(r => /^audio\//i.test(r.mime) || AUDIO_EXT.test(r.url)).reduce((s, r) => s + got(r), 0)

    const home = url.split('#')[0].split('?')[0], count = new Map()
    let enter = await enterPlay(p, pg, {}), taps = 0, resets = 0
    res.enter = { ok: enter.ok, how: enter.how }
    const t1 = Date.now()
    if (enter.tap === 'none') await sleep(PLAY_MS)
    else while (Date.now() - t1 < PLAY_MS) {
      const iter = Date.now()
      // a tap left the page, or left play (a map, a dialog): load the page again and walk the recipe again (3 times at most)
      const left = p.url().split('#')[0].split('?')[0] !== home
      if ((left || !await isPlaying(p, pg)) && (resets < 3 || left)) {
        if (++resets > 6) break
        await p.goto(url, { waitUntil: 'load', timeout: 45000 }).catch(() => {}); await sleep(1500)
        enter = await enterPlay(p, pg, {}); res.enter = { ok: enter.ok, how: enter.how }
      }
      if (await tapOnce(p, count, { backPenalty: 14, avoid: avoidFor(pg) })) taps++
      await sleep(Math.max(50, 600 - (Date.now() - iter)))
    }
    // the tapper can end a round, open a map: if play was left in the last seconds, walk the recipe once more so the count is taken IN play
    if (enter.tap !== 'none' && !await isPlaying(p, pg)) {
      await p.goto(url, { waitUntil: 'load', timeout: 45000 }).catch(() => {}); await sleep(1500)
      enter = await enterPlay(p, pg, {}); res.enter = { ok: enter.ok, how: enter.how }; resets++
      await sleep(1500)
    }
    res.dom = await p.evaluate(countDom)
    res.taps = taps; res.resets = resets
    fs.mkdirSync(SHOTS, { recursive: true })
    await p.screenshot({ path: path.join(SHOTS, pg.replace(/^games\//, '').replace('.html', '') + '.png') }).catch(e => errs.push('shot ' + e.message.slice(0, 60)))
  } catch (e) { res.crash = String(e.message || e).slice(0, 140) }
  res.errors = errs.length
  await ctx.close().catch(() => {})
  return res
}

const own = await startServer()
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output', '--enable-gpu', '--use-angle=gl', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--disable-dev-shm-usage'] })
const results = []
for (const pg of PAGES) {
  const t0 = Date.now()
  const r = await measure(b, own.origin, pg)
  results.push(r)
  console.log(`${pg.padEnd(32)} ${r.crash ? 'CRASH ' + r.crash : `${kb(r.bytes)}  req ${r.req}  audio ${kb(r.audio)}  dom ${r.dom}  taps ${r.taps}${r.resets ? ' reloads ' + r.resets : ''}  err ${r.errors}  | ${r.enter.ok ? 'in play' : 'ENTRY FAILED'}: ${r.enter.how}`}  (${Math.round((Date.now() - t0) / 1000)} s)`)
}
await b.close(); own.srv.close()

let base = { pages: {} }
try { base = JSON.parse(fs.readFileSync(BASE_FILE, 'utf8')) } catch (e) { if (!UPDATE) { console.log(`✗ no baseline at ${path.relative(ROOT, BASE_FILE)} (QA_UPDATE=1 writes it)`); process.exit(1) } }

const bad = [], notes = []
for (const r of results) {
  if (r.crash) { bad.push(`${r.page}: crashed (${r.crash})`); continue }
  if (!r.enter.ok) bad.push(`${r.page}: entry recipe did not reach play — ${r.enter.how}`)
  const bl = base.pages[r.page]
  if (!bl) { if (!UPDATE) bad.push(`${r.page}: no baseline entry (QA_UPDATE=1 records it)`); continue }
  for (const [k, label] of METRICS) {
    const cap = Math.max(bl[k] * (1 + TOL), k === 'dom' ? bl[k] + DOM_SLACK : 0)   // a game's own state moves its DOM by a few nodes (stinky-dirty 273-295 between two runs)
    if (r[k] > cap) bad.push(`${r.page}: ${label} ${r[k]} > baseline ${bl[k]} (allowed up to ${Math.floor(cap)})`)
    else if (r[k] < bl[k] * (1 - TOL)) notes.push(`${r.page}: ${label} ${r[k]} < baseline ${bl[k]} (QA_UPDATE=1 lowers the baseline)`)
  }
}
const sum = k => results.reduce((s, r) => s + (r[k] || 0), 0)
console.log(`\ntotals (${results.length} pages): first-screen ${kb(sum('bytes'))}, ${sum('req')} requests, audio before first tap ${kb(sum('audio'))}, DOM after play ${sum('dom')}`)

if (UPDATE) {
  if (results.some(r => r.crash || !r.enter.ok)) { console.log('✗ QA_UPDATE refused: a page crashed or its entry recipe failed, a baseline of a menu proves nothing'); process.exit(1) }
  const pages = { ...base.pages }
  for (const r of results) pages[r.page] = { bytes: r.bytes, req: r.req, audio: r.audio, dom: r.dom }
  const out = { note: 'PRD-33 budget baseline. A number may fall, a rise of more than 5 % fails (tools/qa-perf-budget.mjs). Rewrite with QA_UPDATE=1.', measured: new Date().toISOString().slice(0, 10), tolerance: TOL, pages: Object.fromEntries(Object.keys(pages).sort().map(k => [k, pages[k]])) }
  fs.writeFileSync(BASE_FILE, JSON.stringify(out, null, 1) + '\n')
  console.log(`baseline written: ${path.relative(ROOT, BASE_FILE)} (${Object.keys(pages).length} pages)`)
  process.exit(0)
}
for (const n of notes) console.log('  below baseline: ' + n)
for (const m of bad) console.log('✗ ' + m)
console.log(bad.length ? `${bad.length} FAILED` : `ALL PASS (${results.length} pages within 5 % of tools/perf-budget.json)`)
process.exit(bad.length ? 1 : 0)
