#!/usr/bin/env node
// qa-perf-survey — REPORT tool (exits 0), not a gate. Per page (hub + every games/*.html not starting with `_`) in a fresh
// 390x844 mobile+touch context with the CPU throttled 4x and sound off:
//   load : DCL, load event, bytes (CDP encodedDataLength), requests, JS/image bytes, largest 3 resources
//   idle : 5 s on the first screen — rAF frame intervals (p50, p95, % > 33 ms) + long tasks
//   play : 15 s of a deterministic tapper (least-tapped hittable control every ~600 ms; settings/sound/parent/back skipped,
//          the idea of qa-action-latency) — same frame stats + long tasks + JS heap + DOM nodes + canvases / WebGL contexts
//   errors + console.error count, one mid-play screenshot -> tools/qa-out/perf-survey/<page>.png
// Output: tools/qa-out/perf-survey.json + docs/audit/perf-survey-2026-11-17.md (text below the <!-- CAUSES --> marker is kept
// across re-runs: the hand-written top-10 analysis lives there).
// The tapper's own element scan (candidates) and the screenshot are NOT the page's cost: frames and long tasks that overlap
// them are dropped ("mute windows").
// Serves the tree itself (node http, gzip on text like GitHub Pages, no cache) on a free port unless BASE is set.
// Usage: TMPDIR=$HOME/.cache/qa-tmp flock -w 1800 /tmp/claude-1000/kereta-browser.lock timeout 1500 node tools/qa-perf-survey.mjs
//   QA_QUERY='nocine=1' (A/B without the cinema layer)  QA_ONLY=regex  QA_PREV=tools/qa-out/perf-survey-run1.json (adds the run-to-run spread to the report)
//   QA_OUT=tools/qa-out/perf-survey.json   QA_MD=docs/audit/perf-survey-2026-11-17.md   QA_PLAY_MS=15000  QA_IDLE_MS=5000  QA_CPU=4
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer'
import { startServer, instrument, candidates, tapOnce } from './lib/perf-core.mjs'
import { enterPlay, entryUrl } from './lib/enter-play.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sleep = ms => new Promise(r => setTimeout(r, ms))
const PLAY_MS = +(process.env.QA_PLAY_MS || 15000), IDLE_MS = +(process.env.QA_IDLE_MS || 5000), CPU = +(process.env.QA_CPU || 4)
const OUT = path.resolve(ROOT, process.env.QA_OUT || 'tools/qa-out/perf-survey.json')
const MD = path.resolve(ROOT, process.env.QA_MD || 'docs/audit/perf-survey-2026-11-17.md')
const SHOTS = path.resolve(ROOT, 'tools/qa-out/perf-survey')
let PAGES = ['index.html'].concat(fs.readdirSync(path.join(ROOT, 'games')).filter(f => f.endsWith('.html') && !f.startsWith('_')).sort().map(f => 'games/' + f))
if (process.env.QA_ONLY) { const re = new RegExp(process.env.QA_ONLY); PAGES = PAGES.filter(p => re.test(p)) }


// ---------- stats helpers ----------
const pct = (a, q) => { if (!a.length) return NaN; const s = a.slice().sort((x, y) => x - y); return s[Math.max(0, Math.ceil(q * s.length) - 1)] }
const r1 = x => Number.isFinite(x) ? Math.round(x * 10) / 10 : null
const MB = b => Math.round(b / 1048.576) / 1000

// frame + long-task stats inside the page-time window [w0, w1], mute windows removed
function windowStats ([w0, w1]) {
  const to = performance.timeOrigin
  let fr = window.__fr.map(f => [f[0] + to, f[1]]), lt = window.__lt.map(l => [l[0] + to, l[1]]), mw = window.__mw.map(m => [m[0] + to, m[1] + to])
  try { const segs = JSON.parse(sessionStorage.getItem('__seg') || '{}'); for (const k in segs) if (+k !== to) { fr = fr.concat(segs[k].fr); lt = lt.concat(segs[k].lt); mw = mw.concat(segs[k].mw) } } catch (e) {}
  const overlap = (a, b) => mw.some(m => a < m[1] && b > m[0])
  const iv = fr.filter(f => f[0] > w0 && f[0] <= w1 && !overlap(f[0] - f[1], f[0])).map(f => f[1])
  const l2 = lt.filter(l => l[0] >= w0 && l[0] < w1 && !overlap(l[0], l[0] + l[1]))
  const muted = mw.reduce((s, m) => s + Math.max(0, Math.min(m[1], w1) - Math.max(m[0], w0)), 0)
  return { iv, ltCount: l2.length, ltMs: l2.reduce((s, l) => s + l[1], 0), muted }
}
const frameSummary = w => ({ n: w.iv.length, p50: r1(pct(w.iv, 0.5)), p95: r1(pct(w.iv, 0.95)), max: r1(Math.max(0, ...w.iv)), over33: w.iv.length ? r1(100 * w.iv.filter(x => x > 33.4).length / w.iv.length) : null, ltCount: w.ltCount, ltMs: Math.round(w.ltMs), mutedMs: Math.round(w.muted || 0) })

// ---------- one page ----------
async function survey (b, origin, pg) {
  const url = origin + entryUrl(pg) + (process.env.QA_QUERY ? '?' + process.env.QA_QUERY : ''), errs = [], cons = []
  const ctx = await b.createBrowserContext()
  const p = await ctx.newPage()
  await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await p.evaluateOnNewDocument(instrument)
  await p.evaluateOnNewDocument(`window.__cand = ${candidates.toString()}`)
  p.on('pageerror', e => errs.push(String(e).slice(0, 160)))
  p.on('console', m => { if (m.type() === 'error') cons.push(m.text().slice(0, 160)) })
  p.on('dialog', d => d.dismiss().catch(() => {}))
  const cdp = await p.createCDPSession()
  await cdp.send('Network.enable'); await cdp.send('Network.setBypassServiceWorker', { bypass: true }).catch(() => {})
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU })
  const reqs = new Map()
  cdp.on('Network.requestWillBeSent', e => { if (!e.request.url.startsWith('data:') && !reqs.has(e.requestId)) reqs.set(e.requestId, { url: e.request.url, type: e.type, bytes: 0, done: false }) })
  cdp.on('Network.responseReceived', e => { const r = reqs.get(e.requestId); if (r && e.type) r.type = e.type })
  cdp.on('Network.loadingFinished', e => { const r = reqs.get(e.requestId); if (r) { r.bytes = e.encodedDataLength; r.done = true } })
  const netSnap = () => {
    const all = [...reqs.values()], sum = t => all.filter(r => r.type === t).reduce((s, r) => s + r.bytes, 0)
    return { req: all.length, bytes: all.reduce((s, r) => s + r.bytes, 0), js: sum('Script'), img: sum('Image'), media: sum('Media'),
      top3: all.slice().sort((a, z) => z.bytes - a.bytes).slice(0, 3).map(r => ({ url: r.url.replace(/^https?:\/\/[^/]+\//, ''), type: r.type, kb: Math.round(r.bytes / 1024) })) }
  }
  const res = { page: pg, tapped: [] }
  try {
    await p.goto(url, { waitUntil: 'load', timeout: 60000 }).catch(e => errs.push('goto ' + e.message.slice(0, 100)))
    const nav = await p.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return n ? { dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd) } : {} }).catch(() => ({}))
    await sleep(1000)
    const idle0 = await p.evaluate(() => performance.timeOrigin + performance.now()).catch(() => 0)
    const net = netSnap()
    const loadLT = await p.evaluate(windowStats, [0, idle0 - 1000]).catch(() => ({ iv: [], ltCount: 0, ltMs: 0 }))
    res.load = { dcl: nav.dcl, load: nav.load, req: net.req, bytes: net.bytes, js: net.js, img: net.img, media: net.media, top3: net.top3, longTaskCount: loadLT.ltCount, longTaskMs: Math.round(loadLT.ltMs) }
    // idle
    await sleep(IDLE_MS)
    const idle1 = await p.evaluate(() => performance.timeOrigin + performance.now()).catch(() => 0)
    res.idle = frameSummary(await p.evaluate(windowStats, [idle0, idle1]).catch(() => ({ iv: [], ltCount: 0, ltMs: 0 })))
    // play: first walk the page's entry recipe (tools/lib/enter-play.mjs) so the window below is gameplay, not a menu
    const entry = await enterPlay(p, pg, { slow: CPU })
    res.entry = { ok: entry.ok, how: entry.how }
    const heap0 =await p.evaluate(() => performance.memory ? performance.memory.usedJSHeapSize : 0).catch(() => 0)
    const play0 = await p.evaluate(() => performance.timeOrigin + performance.now()).catch(() => 0)
    const tStart = Date.now(), count = new Map(), home = url.split('#')[0].split('?')[0]
    let taps = 0, resets = 0, shot = false
    while (Date.now() - tStart < PLAY_MS) {
      const iter = Date.now()
      if (p.url().split('#')[0].split('?')[0] !== home) {
        if (++resets > 3) break
        await p.goto(url, { waitUntil: 'load', timeout: 45000 }).catch(() => {}); await sleep(1500)
        await enterPlay(p, pg, { slow: CPU })
      }
      if (entry.tap !== 'none' && await tapOnce(p, count)) taps++
      if (!shot && Date.now() - tStart > PLAY_MS / 2) {
        shot = true
        await p.evaluate(() => { window.__shotA = performance.now() }).catch(() => {})
        fs.mkdirSync(SHOTS, { recursive: true })
        await p.screenshot({ path: path.join(SHOTS, pg.replace(/^games\//, '').replace('.html', '') + '.png') }).catch(e => errs.push('shot ' + e.message.slice(0, 80)))
        await p.evaluate(() => { window.__mw.push([window.__shotA, performance.now() + 50]) }).catch(() => {})
      }
      await sleep(Math.max(50, 600 - (Date.now() - iter)))
    }
    const play1 = await p.evaluate(() => performance.timeOrigin + performance.now()).catch(() => 0)
    const ws = await p.evaluate(windowStats, [play0, play1]).catch(() => ({ iv: [], ltCount: 0, ltMs: 0 }))
    const end = await p.evaluate(() => ({ heap: performance.memory ? performance.memory.usedJSHeapSize : 0, dom: document.getElementsByTagName('*').length, canvases: document.getElementsByTagName('canvas').length, ctx: window.__ctx })).catch(() => ({ heap: 0, dom: 0, canvases: 0, ctx: {} }))
    const nt = netSnap()
    res.play = { ...frameSummary(ws), taps, actions: count.size, keys: [...count.keys()].slice(0, 14), heapStartMB: MB(heap0), heapEndMB: MB(end.heap), dom: end.dom, canvases: end.canvases, ctx2d: end.ctx['2d'], webgl: (end.ctx.webgl || 0) + (end.ctx.webgl2 || 0), resets, reqTotal: nt.req, bytesTotal: nt.bytes }
  } catch (e) { res.crash = e.message.slice(0, 160) }
  res.errors = { page: errs.slice(0, 3), pageCount: errs.length, consoleCount: cons.length, consoleSample: [...new Set(cons)].slice(0, 3) }
  await ctx.close().catch(() => {})
  return res
}

// ---------- report ----------
const cell = (v, d = '') => v == null || Number.isNaN(v) ? '-' : (d ? v + d : v)
function report (data, prev) {
  const rows = data.pages.slice().sort((a, z) => (z.play?.p95 ?? -1) - (a.play?.p95 ?? -1) || (z.play?.ltMs ?? -1) - (a.play?.ltMs ?? -1))
  const L = []
  L.push('# Perf survey 2026-11-17', '')
  L.push(`Tool: \`tools/qa-perf-survey.mjs\` (report only). 390x844 @2x mobile+touch, CPU throttle ${CPU}x, sound off, headless chrome (gpu flags as qa-action-latency), local node server with gzip, service worker bypassed.`)
  L.push(`Load = navigation timing under throttle; MB/req/js/img = CDP encodedDataLength at load+1 s. Idle = ${IDLE_MS / 1000} s on the first screen; play = ${PLAY_MS / 1000} s of the least-tapped-control tapper (tapper scan + screenshot frames excluded; "left page" = taps that navigated away, page reloaded; muted % = share of the window excluded). Frame stats from rAF intervals: p50, p95, % of frames > 33 ms. LT = long tasks (>50 ms) count / total ms. Heap = usedJSHeapSize at end of play. loadavg at start ${data.env.loadStart.join(' ')} / end ${data.env.loadEnd.join(' ')} (${data.env.cpus} cpus).`, '')
  L.push('Sorted by play p95, worst first (frame times are quantised to 16.7 ms steps, so ties are broken by long-task ms).', '')
  L.push('| page | load ms | DCL ms | MB | req | JS MB | img MB | idle p95 | play p50 | play p95 | >33ms % | LT n / ms | heap MB (start>end) | DOM | canv / 2d / GL | taps / actions / left page / muted % | errs (page / console) |')
  L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|')
  for (const r of rows) {
    if (r.crash || !r.play) { L.push(`| ${r.page} | CRASH ${r.crash || ''} |`); continue }
    L.push(`| ${r.page.replace('games/', '')} | ${cell(r.load.load)} | ${cell(r.load.dcl)} | ${MB(r.load.bytes)} | ${r.load.req} | ${MB(r.load.js)} | ${MB(r.load.img)} | ${cell(r.idle.p95)} | ${cell(r.play.p50)} | ${cell(r.play.p95)} | ${cell(r.play.over33)} | ${r.play.ltCount} / ${r.play.ltMs} | ${r.play.heapStartMB}>${r.play.heapEndMB} | ${r.play.dom} | ${r.play.canvases} / ${r.play.ctx2d} / ${r.play.webgl} | ${r.play.taps} / ${r.play.actions} / ${r.play.resets} / ${Math.round(100 * r.play.mutedMs / PLAY_MS)} | ${r.errors.pageCount} / ${r.errors.consoleCount} |`)
  }
  L.push('', '## Largest resources at load (top 3 per page)', '')
  for (const r of rows) if (r.load) L.push(`- ${r.page.replace('games/', '')}: ` + r.load.top3.map(t => `${t.url} (${t.type}, ${t.kb} kB)`).join('; '))
  L.push('', '## Tapper reach (menu-suspect = 3 or fewer distinct actions)', '')
  for (const r of rows) if (r.play) L.push(`- ${r.page.replace('games/', '')}: ${r.play.taps} taps, ${r.play.actions} actions${r.play.actions <= 3 ? ' MENU-SUSPECT' : ''}: ${r.play.keys.join(' ')}${r.entry ? ` [entry ${r.entry.ok ? 'ok' : 'FAILED'}: ${r.entry.how}]` : ''}`)
  const errRows = rows.filter(r => r.errors && (r.errors.pageCount || r.errors.consoleCount))
  if (errRows.length) { L.push('', '## Errors', ''); for (const r of errRows) L.push(`- ${r.page}: ${r.errors.pageCount} page, ${r.errors.consoleCount} console. ${[...r.errors.page, ...r.errors.consoleSample].join(' | ')}`) }
  if (prev) {
    const pm = new Map(prev.pages.map(x => [x.page, x]))
    L.push('', '## Run-to-run spread (same tree, run A then run B)', '', '| page | p95 A / B | >33ms % A / B | long-task ms A / B | load ms A / B |', '|---|---|---|---|---|')
    const stat = { p95: [], over33: [], ltMs: [], load: [] }
    const g = (r, f) => f(r)
    for (const r of rows) {
      const a = pm.get(r.page); if (!a?.play || !r.play) continue
      const pair = (f, k) => { const x = f(a), y = f(r); if (x != null && y != null) stat[k].push([x, y]); return `${x} / ${y}` }
      L.push(`| ${r.page.replace('games/', '')} | ${pair(q => q.play.p95, 'p95')} | ${pair(q => q.play.over33, 'over33')} | ${pair(q => q.play.ltMs, 'ltMs')} | ${pair(q => q.load.load, 'load')} |`)
    }
    const sp = k => { const d = stat[k].map(([x, y]) => Math.abs(x - y)), rl = stat[k].map(([x, y]) => 100 * Math.abs(x - y) / ((x + y) / 2 || 1)); return `${k}: median abs diff ${r1(pct(d, 0.5))}, p90 ${r1(pct(d, 0.9))}, max ${r1(Math.max(...d))}; median relative ${r1(pct(rl, 0.5))} %, p90 ${r1(pct(rl, 0.9))} %` }
    L.push('', 'Spread over all pages: ' + ['p95', 'over33', 'ltMs', 'load'].map(sp).join('. ') + '. A change smaller than these is noise on this loaded machine.')
  }
  L.push('', '<!-- CAUSES -->')
  return L.join('\n') + '\n'
}

// ---------- main ----------
const REPORT_ONLY = !!process.env.QA_REPORT_ONLY
const own = process.env.BASE || REPORT_ONLY ? null : await startServer()
const origin = process.env.BASE || (own ? own.origin : '')
const b = REPORT_ONLY ? null : await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output', '--enable-gpu', '--use-angle=gl', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--disable-dev-shm-usage'] })
const data = { date: new Date().toISOString(), cpuThrottle: CPU, origin, env: { loadStart: os.loadavg().map(x => +x.toFixed(2)), cpus: os.cpus().length }, pages: [] }
const flush = () => { data.env.loadEnd = os.loadavg().map(x => +x.toFixed(2)); fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(data, null, 1)) }
if (REPORT_ONLY) Object.assign(data, JSON.parse(fs.readFileSync(OUT, 'utf8')))
for (const pg of REPORT_ONLY ? [] : PAGES) {
  const t0 = Date.now()
  const r = await survey(b, origin, pg)
  data.pages.push(r); flush()
  console.log(`${pg.padEnd(34)} load ${cell(r.load?.load)} ms  ${r.load ? MB(r.load.bytes) : '-'} MB  play p50/p95 ${cell(r.play?.p50)}/${cell(r.play?.p95)}  >33 ${cell(r.play?.over33)}%  LT ${r.play?.ltMs ?? '-'} ms  heap ${r.play?.heapEndMB ?? '-'}  taps ${r.play?.taps ?? '-'}/${r.play?.actions ?? '-'}  err ${r.errors.pageCount}/${r.errors.consoleCount}  (${Math.round((Date.now() - t0) / 1000)} s)`)
}
if (b) await b.close(); if (own) own.srv.close()
if (!REPORT_ONLY) flush()
const prev = process.env.QA_PREV && fs.existsSync(path.resolve(ROOT, process.env.QA_PREV)) ? JSON.parse(fs.readFileSync(path.resolve(ROOT, process.env.QA_PREV), 'utf8')) : null
let tail = ''
if (fs.existsSync(MD)) { const old = fs.readFileSync(MD, 'utf8'), i = old.indexOf('<!-- CAUSES -->'); if (i >= 0) tail = old.slice(i + '<!-- CAUSES -->'.length) }
fs.mkdirSync(path.dirname(MD), { recursive: true })
const md = report(data, prev)
fs.writeFileSync(MD, md.replace(/\n$/, '') + tail)
console.log('\n' + md.split('\n').filter(l => l.startsWith('|')).slice(0, 14).join('\n'))
console.log(`\nwrote ${path.relative(ROOT, OUT)} and ${path.relative(ROOT, MD)}`)
process.exit(0)
