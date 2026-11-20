#!/usr/bin/env node
// qa-prd35-dom — PRD-35 (DOM ringan dan frame stabil saat main). Four laws, each read from the running page at 390x844:
//   L1a selamatkan-kereta : after "Mulai!" the train picker is gone from the tree (0 .ts-card, <= 8 canvases) and the page holds <= 700 nodes
//   L1b museum-kereta     : the unfiltered list holds <= 900 nodes at rest, draws the rest while the child scrolls (every card reachable), and a card still opens
//   L2  pokemon-birds     : in 5 s of play the HUD text nodes and the ground runners' `top` are written only when the value changes (<= 40 writes in 5 s, was one per frame),
//                           and the page lays out <= 60 times (a Chrome trace; was ~370, one forced layout per frame)
//   L3  selamatkan boost  : the speed-lines filter is no longer a per-frame inline style: forcing BOOSTING for 2 s leaves 0 `filter` writes on #speed-lines and the
//                           `boost` class carries the hue animation
// Serves the tree it lives in (tools/lib/perf-core.mjs). No edit of any game is needed to run it against another tree: copy this file next to that tree's tools/lib.
//   node tools/run-gates.mjs --only qa-prd35-dom        TMPDIR=$HOME/.cache/qa-tmp flock -w 14400 /tmp/claude-1000/kereta-browser.lock timeout 900 node tools/qa-prd35-dom.mjs
// run-gates: timeout 900
import puppeteer from 'puppeteer'
import { startServer, instrument, candidates, sleep, tapOnce, countDom } from './lib/perf-core.mjs'
import { avoidFor } from './lib/enter-play.mjs'

const VP = { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true }
const srv = await startServer()
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--enable-gpu', '--use-angle=gl', '--ignore-gpu-blocklist', '--disable-dev-shm-usage'] })
const checks = []
const check = (name, ok, detail) => { checks.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${detail}`) }

async function open (pg) {
  const ctx = await b.createBrowserContext(), p = await ctx.newPage(), errs = []
  await p.setViewport(VP)
  await p.evaluateOnNewDocument(instrument, { soundDefault: true })
  await p.evaluateOnNewDocument(`window.__cand = ${candidates.toString()}`)
  p.on('pageerror', e => errs.push(String(e).slice(0, 120))); p.on('dialog', d => d.dismiss().catch(() => {}))
  await p.goto(srv.origin + pg, { waitUntil: 'load', timeout: 60000 }); await sleep(2500)
  return { p, ctx, errs }
}

// ---- L1a + L3: selamatkan-kereta
{
  const { p, ctx, errs } = await open('games/selamatkan-kereta.html')
  const before = await p.evaluate(() => document.querySelectorAll('.ts-card').length)
  await p.evaluate(() => document.getElementById('btn-start').click())
  await sleep(7000)
  const dom = await p.evaluate(countDom)
  const s = await p.evaluate(() => ({ cards: document.querySelectorAll('.ts-card').length, cv: document.querySelectorAll('canvas').length, running: typeof S !== 'undefined' && S.running === true }))
  check('L1a selamatkan picker released in play', before > 300 && s.running && s.cards === 0 && s.cv <= 8 && dom <= 700, `picker had ${before} cards, in play ${s.cards} cards / ${s.cv} canvases / ${dom} nodes (law <= 700), running=${s.running}, errors ${errs.length}`)
  // L3: force BOOSTING, count style writes that touch `filter` on #speed-lines
  const w = await p.evaluate(async () => {
    const el = document.getElementById('speed-lines'); let writes = 0
    new MutationObserver(ms => { for (const m of ms) if (/filter/.test(m.target.getAttribute('style') || '')) writes++ })   // an inline filter present after a style write
      .observe(el, { attributes: true, attributeFilter: ['style'], attributeOldValue: true })
    let anim = '', cls = false
    for (let i = 0; i < 40; i++) {   // a signal ahead would brake the train: push every obstacle far away and hold BOOSTING for 2 s, look at the class in between
      for (const o of S.obstacles) o.worldX = S.worldX + 1e7   // nothing to brake for
      S.trainState = 'BOOSTING'; S.boostTimer = 999
      await new Promise(r => setTimeout(r, 50))
      if (el.classList.contains('boost')) { cls = true; anim = getComputedStyle(el).animationName }
    }
    S.trainState = 'MOVING'
    return { writes, anim, cls }
  })
  check('L3 selamatkan boost hue = one CSS class', w.writes === 0 && w.cls && /g16SpeedHue/.test(w.anim), `inline filter writes in 2 s of BOOSTING: ${w.writes}, class boost=${w.cls}, animation=${w.anim}`)
  await ctx.close()
}

// ---- L1b: museum-kereta
{
  const { p, ctx, errs } = await open('games/museum-kereta.html')
  await sleep(1000)
  const st = () => p.evaluate(() => ({ cards: document.querySelectorAll('#g18-card-grid .g18-card').length, nodes: document.getElementsByTagName('*').length }))
  const rest = await st()
  for (let i = 0; i < 60; i++) { await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await sleep(100) }
  const end = await st()
  const total = await p.evaluate(() => g18BuildItems().length)
  const opened = await p.evaluate(() => { const c = document.querySelector('#g18-card-grid .g18-card:last-child'); if (c) c.click(); return document.getElementById('g18-light-modal').classList.contains('open') || document.getElementById('g18-modal').classList.contains('open') })
  check('L1b museum list at rest', rest.nodes <= 900 && rest.cards < total, `${rest.nodes} nodes (law <= 900), ${rest.cards} of ${total} cards drawn at rest`)
  check('L1b museum list reachable by scroll', end.cards === total && opened, `after scrolling to the end ${end.cards} of ${total} cards, last card opens its modal=${opened}, errors ${errs.length}`)
  await ctx.close()
}

// ---- L2: pokemon-birds
{
  const { p, ctx, errs } = await open('games/pokemon-birds.html')
  const count = new Map(), tap = () => tapOnce(p, count, { backPenalty: 14, avoid: avoidFor('games/pokemon-birds.html') })
  const isRun = () => p.evaluate(() => typeof S !== 'undefined' && S.running === true && !S.paused)
  for (let i = 0; i < 20 && !await isRun(); i++) { await tap(); await sleep(500) }   // the tapper walks the start screen into the flight
  await p.evaluate(() => {
    window.__w = { hud: 0, top: 0, live: 0 }
    const tick = () => { if (typeof S !== 'undefined' && S.running === true && !S.paused) window.__w.live++; requestAnimationFrame(tick) }; requestAnimationFrame(tick)   // frames really flown (a pipe or a quiz may end or pause the flight inside the window)
    const mo = new MutationObserver(ms => { for (const m of ms) window.__w[m.type === 'attributes' ? 'top' : 'hud']++ })
    for (const id of ['status-text', 'pipe-progress-n', 'hud-lives-n']) mo.observe(document.getElementById(id), { childList: true, characterData: true, subtree: true })
    for (const id of ['ash-runner', 'pika-runner']) mo.observe(document.getElementById(id), { attributes: true, attributeFilter: ['style'] })
  })
  await p.tracing.start({ categories: ['devtools.timeline'] })
  for (const t0 = Date.now(); Date.now() - t0 < 5000;) { await tap(); await sleep(450) }   // keeps flapping, as a child does
  const tr = JSON.parse(Buffer.from(await p.tracing.stop()).toString()), ev = tr.traceEvents || tr
  const layouts = ev.filter(x => x.name === 'Layout' && (x.ph === 'X' || x.ph === 'B')).length
  const w = await p.evaluate(() => window.__w), running = w.live >= 90
  check('L2 birds HUD and runners written on change only', running && w.hud + w.top <= 40, `in 5 s of play: ${w.hud} HUD text writes + ${w.top} runner style writes (law <= 40; one per frame = ~300), ${w.live} frames flown (need >= 90)`)
  check('L2 birds layout per 5 s', running && layouts <= 60, `${layouts} Layout events in a 5 s trace (law <= 60; was ~370 on the old code), ${w.live} frames flown, errors ${errs.length}`)
  await ctx.close()
}

await b.close(); srv.srv.close()
const bad = checks.filter(x => !x).length
console.log(bad ? `${bad} of ${checks.length} FAILED` : `ALL PASS (${checks.length} checks)`)
process.exit(bad ? 1 : 0)
