#!/usr/bin/env node
// qa-prd45-mobil — PRD-45 (docs/prd/PRD-45-mobil-bantuan-dan-streak.md): G6 Mobil gets G15 Lokomotif's help offer and
// streak slow motion, and a bigger word set from the spelling dictionary.
//   L1 3 wrong tiles in a row (easy, lives left) -> the game pauses and offers help once; "Pelan + magnet" slows the game
//      (ticker 0.55) and steers the car to the right letter's lane, back to normal after 5 s; at one life left (normal
//      mode) the offer comes too, and "+1 Nyawa" gives a life back; it is offered once per session
//   L2 5 right letters in a row -> a streak chip and 2 s of slow motion (ticker 0.5), then speed 1 again
//   L3 >= 60 different words over the maps and >= 20 on every map; a session's words are all different; 0 page errors;
//      screenshots (QA_SHOTS=dir) of the offer and the streak chip at 390x844, 844x390, 800x1280 are looked at
// Usage: QA_BASE=http://127.0.0.1:8081 node tools/qa-prd45-mobil.mjs
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'
const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, ''), SH = process.env.QA_SHOTS
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }
const NOISE = /favicon|googleapis|gstatic/i
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-audio-output', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
async function open ([w, h], errs, theme = 'city', diff = 'normal') {
  const c = await b.createBrowserContext(), p = await c.newPage()
  p.on('pageerror', e => { if (!NOISE.test(e.message)) errs.push(e.message) })
  await p.setViewport({ width: w, height: h, isMobile: true, hasTouch: true })
  await p.evaluateOnNewDocument(theme => {
    if (!sessionStorage.__s) {
      localStorage.clear(); localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: 'tumbuh' }]))
      localStorage.setItem('dunia-active-slot', '[0,1]'); localStorage.setItem('dunia-emosi-sound', 'off'); sessionStorage.__s = 1
    }
    sessionStorage.setItem('g6Config', JSON.stringify({ mapTheme: theme, level: 5, totalWords: 5 }))
  }, theme)
  await p.goto(BASE + '/games/mobil.html?nocine=1', { waitUntil: 'load', timeout: 60000 })
  await p.waitForFunction(() => typeof app !== 'undefined' && app && app.ticker && S.wordList.length > 0, { timeout: 20000 }).catch(() => {})
  await sleep(600)
  await p.evaluate(diff => { selectedDiff = diff; startFromSelect() }, diff)
  await sleep(500)
  return { c, p }
}
const wrong = p => p.evaluate(() => { S.invincible = 0; const want = S.currentWord[S.letterIdx]; hitTile({ _letter: want === 'Q' ? 'X' : 'Q', x: 100, y: 300, _alive: true }) })
const right = p => p.evaluate(() => { hitTile({ _letter: S.currentWord[S.letterIdx], x: 100, y: 300, _alive: true }) })
const tapSel = async (p, sel) => { const el = await p.$(sel); if (!el) return false; const bx = await el.boundingBox(); await p.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2); return true }
if (SH) fs.mkdirSync(SH, { recursive: true })

// L3 word pools over every map
{
  const errs = [], { c, p } = await open([844, 390], errs)
  const r = await p.evaluate(() => Object.keys(G6_THEME_CATS).map(th => {
    const base = WORD_BANKS[th] || []
    const extra = SpellingData.WORDS.filter(w => G6_THEME_CATS[th].indexOf(w.cat) >= 0).map(w => String(w.id || '').trim().toUpperCase()).filter(id => /^[A-Z]{3,8}$/.test(id))
    return [th, [...new Set([...base, ...extra])]]
  }))
  const all = new Set(r.flatMap(([, w]) => w)), small = r.filter(([, w]) => w.length < 20)
  const inPage = await p.evaluate(() => ({ bank: cfg.wordBank.length, session: S.wordList.length, uniq: new Set(S.wordList).size }))
  ok(all.size >= 60 && !small.length && inPage.bank >= 20 && inPage.session === inPage.uniq,
    `L3 words: ${all.size} different over ${r.length} maps (${r.map(([t, w]) => t + ' ' + w.length).join(', ')}); this page's bank ${inPage.bank}, session ${inPage.session} all different ${inPage.session === inPage.uniq}`)
  await c.close()
}

for (const size of [[390, 844], [844, 390], [800, 1280]]) {
  const tag = `${size[0]}x${size[1]}`
  // L1 easy: three wrong in a row -> offer; slow + magnet
  {
    const errs = [], { c, p } = await open(size, errs, 'forest', 'easy')
    for (let k = 0; k < 2; k++) await wrong(p)
    const early = await p.$('.g6-assist')
    await wrong(p); await sleep(300)
    const st = await p.evaluate(() => ({ offer: !!document.querySelector('.g6-assist'), paused: S.paused, lives: S.lives }))
    if (SH) await p.screenshot({ path: path.join(SH, `g6-assist-${tag}.png`) })
    await tapSel(p, '.g6-assist button.slow'); await sleep(400)
    const slow = await p.evaluate(() => ({ speed: app.ticker.speed, paused: S.paused, magnet: G6.magnetUntil > performance.now() }))
    // a right letter in another lane while the magnet is on
    const steer = await p.evaluate(() => {
      S.tiles.forEach(t => { t._alive = false; t.visible = false })
      const want = S.currentWord[S.letterIdx], lane = (S.carTargetLane + 2) % LANES
      spawnTile(lane, want, true); const t = S.tiles[S.tiles.length - 1]; t.y = carContainer.y - 220
      return lane
    })
    await sleep(700)
    const lane = await p.evaluate(() => S.carTargetLane)
    await sleep(5000)
    const after = await p.evaluate(() => ({ speed: app.ticker.speed, magnet: G6.magnetUntil > performance.now() }))
    for (let k = 0; k < 3; k++) await wrong(p)
    const again = await p.evaluate(() => document.querySelectorAll('.g6-assist').length)
    ok(!early && st.offer && st.paused && slow.speed === 0.55 && !slow.paused && slow.magnet && lane === steer && after.speed === 1 && !after.magnet && again === 0,
      `L1 ${tag} easy: offer after the 3rd wrong in a row (not before: ${!early}), paused ${st.paused}; slow -> speed ${slow.speed}, magnet steered to lane ${lane} (right letter in lane ${steer}); after 5 s speed ${after.speed}; offered again ${again}`)
    ok(!errs.length, `L3 ${tag} page errors (easy run) ${errs.slice(0, 2).join(' | ') || 0}`)
    await c.close()
  }
  // L1 normal: one life left -> offer, +1 life;  L2 streak of 5
  {
    const errs = [], { c, p } = await open(size, errs, 'kebun', 'normal')
    await wrong(p); await right(p); await wrong(p); await sleep(300)
    const st = await p.evaluate(() => ({ offer: !!document.querySelector('.g6-assist'), lives: S.lives }))
    await tapSel(p, '.g6-assist button.heart'); await sleep(300)
    const lives = await p.evaluate(() => S.lives)
    ok(st.offer && st.lives === 1 && lives === 2, `L1 ${tag} normal: at ${st.lives} life the offer came (${st.offer}); "+1 Nyawa" -> ${lives} lives`)
    // streak: five right letters in a row (start fresh words as needed)
    await p.evaluate(() => { G6.streak = 0; S.running = true })
    let chip = null, speed = null
    for (let k = 0; k < 5; k++) {
      await p.evaluate(() => { if (S.letterIdx >= S.currentWord.length) { document.getElementById('ovl-wc').classList.remove('show'); startWord() } })
      await right(p)
      if (k === 4) {
        await sleep(250)
        chip = await p.evaluate(() => { const e = document.getElementById('g6-streak'); return e && e.classList.contains('show') ? e.textContent : null })
        speed = await p.evaluate(() => app.ticker.speed)
        if (SH) await p.screenshot({ path: path.join(SH, `g6-streak-${tag}.png`) })
      }
    }
    await sleep(2200)
    const back = await p.evaluate(() => app.ticker.speed)
    ok(chip === 'Beruntun 5!' && speed === 0.5 && back === 1 && !errs.length, `L2 ${tag}: 5 right in a row -> chip "${chip}", speed ${speed}, 2 s later ${back}; errors ${errs.slice(0, 2).join(' | ') || 0}`)
    await c.close()
  }
}
await b.close()
console.log(`qa-prd45-mobil: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
