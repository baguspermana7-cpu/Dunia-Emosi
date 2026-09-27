// G28 narration gate.
//   - every key in games/data/sd-audio.js has a file on disk that is in the verified
//     manifest (sha1 match) — no unverified clip can be played;
//   - Baca Otomatis: playing a card requests exactly its verified story/question clips,
//     in order, and the card still reaches its question when some lines are text-only;
//   - Baca Sendiri / Dibacakan Orang Tua / narration OFF: no clip is requested at all;
//   - a clip that fails to load never blocks the card (volume zero / audio failure).
import puppeteer from 'puppeteer'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import vm from 'node:vm'
const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..')
const sleep = ms => new Promise(r => setTimeout(r, ms))
const fails = []
const check = (ok, msg) => { console.log((ok ? '✅ ' : '❌ ') + msg); if (!ok) fails.push(msg) }

const ctx = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'games/data/sd-audio.js'), 'utf8'), ctx)
const keys = Object.keys(ctx.window.SDAudio.keys)
const man = fs.existsSync(path.join(ROOT, 'assets/sd/audio/verified.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/sd/audio/verified.json'), 'utf8')) : {}
const bad = keys.filter(k => { const f = path.join(ROOT, 'assets/sd/audio', k.replace(':', '/') + '.webm'); return !fs.existsSync(f) || !man[k] || man[k].sha1 !== crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex') })
check(bad.length === 0, `${keys.length} playable clips, every one on disk and ASR-verified${bad.length ? ' — ' + bad.slice(0, 5).join(', ') : ''}`)

const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] })
try {
  const p = await b.newPage()
  await p.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true })
  const errs = []; p.on('pageerror', e => errs.push(e.message))
  await p.evaluateOnNewDocument(() => {
    window.__req = []
    const A = window.Audio
    window.Audio = function (src) { const a = new A(src); window.__req.push(String(src).replace(/^.*\/audio\//, '')); return a }
  })
  const cdp = await p.target().createCDPSession(); await cdp.send('Network.setBypassServiceWorker', { bypass: true })
  await p.goto('http://localhost:8081/games/stinky-dirty.html', { waitUntil: 'networkidle2', timeout: 120000 })
  const cards = ['LIS-01', 'LIS-02', 'MAT-08', 'OBS-12']
  for (const id of cards) {
    await p.evaluate(() => { __sd.set('rm', true); __sd.set('voice', true); __sd.set('mode', 'auto'); window.__req = [] })
    await p.evaluate(i => __sd.playOnly(i), id)
    let ready = false
    for (let k = 0; k < 400 && !ready; k++) { ready = await p.evaluate(() => __sd.state().locked === false); if (!ready) await sleep(100) }
    check(ready, `${id}: card reaches its question with narration ON`)
    await sleep(300)
    const req = await p.evaluate(() => window.__req)
    const card = await p.evaluate(i => SDCards.find(i), id)
    const want = card.story.map((_, i) => `${id}-s${i}`).concat([`${id}-q`]).filter(k => keys.includes(k)).map(k => k + '.webm')
    const got = req.filter(r => r.startsWith(id + '-'))
    check(JSON.stringify(got) === JSON.stringify(want), `${id}: auto-read plays exactly its verified clips in order (${got.length}/${want.length})`)
    check(req.every(r => keys.includes(r.replace('.webm', '').replace('line/', 'line:'))), `${id}: never requests an unverified clip`)
  }
  for (const [label, setup] of [['Baca Sendiri', s => { s('mode', 'self') }], ['Dibacakan Orang Tua', s => { s('mode', 'parent') }], ['narasi OFF', s => { s('mode', 'auto'); s('voice', false) }]]) {
    await p.evaluate(() => { __sd.set('voice', true); window.__req = [] })
    await p.evaluate(`(${setup.toString()})((k,v)=>__sd.set(k,v))`)
    await p.evaluate(() => __sd.playOnly('LIS-02'))
    for (let k = 0; k < 200 && (await p.evaluate(() => __sd.state().locked)); k++) await sleep(100)
    check((await p.evaluate(() => window.__req.length)) === 0, `${label}: no narration requested, card still playable`)
  }
  // a missing clip must not block the card
  await p.setRequestInterception(true)
  p.on('request', r => { if (/\/assets\/sd\/audio\//.test(r.url())) r.abort(); else r.continue() })
  await p.evaluate(() => { __sd.set('mode', 'auto'); __sd.set('voice', true); __sd.playOnly('MAT-08') })
  let ok = false
  for (let k = 0; k < 300 && !ok; k++) { ok = await p.evaluate(() => __sd.state().locked === false); if (!ok) await sleep(100) }
  check(ok, 'audio failure (every clip blocked) never blocks the card')
  check(errs.length === 0, `no page errors${errs.length ? ' — ' + errs.slice(0, 2).join(' | ') : ''}`)
} finally { await b.close() }
console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
