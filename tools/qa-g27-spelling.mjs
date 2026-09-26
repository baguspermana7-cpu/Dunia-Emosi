// G27 Spelling Adventure — functional gate, driven the way a child plays.
//
// Letters are placed by REAL pointer input — a mouse drag, a finger drag, a
// tap — not by calling the placing function, because the drag path is the
// one that breaks: a ghost tile left behind, a drop that misses its slot, a
// scroll that steals a finger. Also covered:
//   - a wrong letter is refused and costs a star; stars survive a reload;
//   - Level 2 opens and a level can be replayed (levels are drills, never locked);
//   - Next Word and Replay on the celebration screen do what they say;
//   - turning the device mid-word keeps the letters already placed, the drag
//     still works afterwards, and nothing is left mispositioned;
//   - every clip the game asks for is actually served; nothing 404s.
import puppeteer from 'puppeteer'

const BASE = process.env.QA_BASE || 'http://localhost:8081'
const URL = `${BASE}/games/ejaan-inggris.html`
const sleep = ms => new Promise(r => setTimeout(r, ms))
const fails = []
let passes = 0
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (ok) passes++; else fails.push(msg) }
const IGNORE = /favicon\.ico/

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
})

async function open (vp) {
  const page = await browser.newPage()
  const cdp = await page.createCDPSession()
  await cdp.send('Network.setBypassServiceWorker', { bypass: true })
  await page.emulate({
    viewport: { width: vp.w, height: vp.h, deviceScaleFactor: 1, isMobile: !!vp.touch, hasTouch: !!vp.touch, isLandscape: vp.w > vp.h },
    userAgent: vp.touch ? 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36' : 'Mozilla/5.0 (X11; Linux x86_64) Chrome/120',
  })
  page.__errors = []; page.__bad = []
  page.on('pageerror', e => page.__errors.push(String(e.message).slice(0, 120)))
  page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text()) && !/Failed to load resource/.test(m.text())) page.__errors.push(m.text().slice(0, 120)) })
  page.on('response', r => { if (r.status() >= 400 && !IGNORE.test(r.url())) page.__bad.push(r.url().replace(BASE, '') + ' ' + r.status()) })
  let err = null
  for (const t of [45000, 120000]) {
    try { await page.goto(URL, { waitUntil: 'load', timeout: t }); err = null; break } catch (e) { err = String(e.message).slice(0, 80) }
  }
  if (err) throw new Error('nav: ' + err)
  await page.waitForFunction(() => typeof window.__g27 === 'object', { timeout: 25000 })
  await sleep(900)
  return page
}

/** Drag the tray tile carrying `letter` onto slot `slot` with real input. */
async function drag (page, letter, slot, touch) {
  const tiles = await page.$$('#tray .tile:not(.used)')
  let from = null
  for (const t of tiles) if ((await t.evaluate(e => e.textContent)) === letter.toUpperCase()) { from = t; break }
  if (!from) return false
  const to = (await page.$$('#slots .slot'))[slot]
  const a = await from.boundingBox(), b = await to.boundingBox()
  const ax = a.x + a.width / 2, ay = a.y + a.height / 2, bx = b.x + b.width / 2, by = b.y + b.height / 2
  if (touch) {
    await page.touchscreen.touchStart(ax, ay)
    for (let i = 1; i <= 10; i++) await page.touchscreen.touchMove(ax + (bx - ax) * i / 10, ay + (by - ay) * i / 10)
    await page.touchscreen.touchEnd()
  } else {
    await page.mouse.move(ax, ay); await page.mouse.down()
    for (let i = 1; i <= 10; i++) await page.mouse.move(ax + (bx - ax) * i / 10, ay + (by - ay) * i / 10)
    await page.mouse.up()
  }
  await sleep(260)
  return true
}
/** Spell the current word by dragging every letter into its own slot. */
async function spellByDrag (page, touch) {
  const word = (await page.evaluate(() => window.__g27.state())).word
  for (let i = 0; i < word.length; i++) {
    const st = await page.evaluate(() => window.__g27.state())
    if (st.placed[i]) continue
    await drag(page, word[i], i, touch)
  }
  return word
}

try {
  // ── 1. mouse, desktop: the real flow from the title screen ─────────────
  {
    const page = await open({ w: 1280, h: 800 })
    await page.evaluate(() => window.__g27.reset())
    await page.click('#btn-play'); await sleep(500)
    const cards = await page.$$('#cat-grid .card:not(.locked)')
    check(cards.length === 4, `four playable categories are offered (${cards.length})`)
    await cards[0].click(); await sleep(500)
    const wc = await page.$$('#word-grid .wcard:not(.soon)')
    check(wc.length > 0, `Colors Level 1 lists its words (${wc.length})`)
    await wc[0].click(); await sleep(1100)
    const st0 = await page.evaluate(() => window.__g27.state())
    check(st0.word === 'blue' && st0.count === wc.length, `tapping a word starts that word in a queue of the level (${st0.word}, ${st0.count})`)

    // a wrong letter dropped on slot 0 is refused
    const wrong = await page.evaluate(w => [...document.querySelectorAll('#tray .tile')].map(t => t.textContent.toLowerCase()).find(c => c !== w[0]), st0.word)
    await drag(page, wrong, 0, false)
    const afterWrong = await page.evaluate(() => window.__g27.state())
    check(afterWrong.placed[0] === null && afterWrong.wrong === 1, `a wrong letter dragged to a slot is refused and counted (${afterWrong.placed[0]}, wrong=${afterWrong.wrong})`)

    const word = await spellByDrag(page, false)
    await sleep(900)
    const done = await page.evaluate(() => ({ st: window.__g27.state(), ok: document.getElementById('ov-ok').classList.contains('show'),
      ghosts: document.querySelectorAll('body > .tile.ghost').length }))
    check(done.st.placed.join('') === word, `the whole word is spelled by MOUSE drag (${done.st.placed.join('')})`)
    check(done.ok, 'finishing the word opens the celebration')
    check(done.ghosts === 0, `no drag ghost left behind (${done.ghosts})`)
    check(await page.evaluate(() => window.__g27.stars('blue')) === 2, 'one mistake = 2 stars, not 3')

    // Replay on the celebration: same word, fresh
    await page.click('#btn-again'); await sleep(600)
    const rep = await page.evaluate(() => ({ st: window.__g27.state(), ok: document.getElementById('ov-ok').classList.contains('show') }))
    check(!rep.ok && rep.st.word === 'blue' && rep.st.placed.every(c => c === null), 'Replay closes the celebration and restarts the SAME word')
    await spellByDrag(page, false); await sleep(900)
    check(await page.evaluate(() => window.__g27.stars('blue')) === 3, 'a clean replay upgrades the record to 3 stars')

    // Next Word moves on in the queue
    await page.click('#btn-next'); await sleep(900)
    const nx = await page.evaluate(() => window.__g27.state())
    check(nx.idx === 1 && nx.word !== 'blue', `Next Word moves to the next word (${nx.word}, #${nx.idx + 1})`)

    // reload: stars survive
    await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.__g27, { timeout: 25000 }); await sleep(600)
    check(await page.evaluate(() => window.__g27.stars('blue')) === 3, 'stars SURVIVE a reload')

    // Level 2 + replaying a whole level: nothing ever locks
    await page.evaluate(() => window.__g27.openCategory('school', 2)); await sleep(500)
    const l2 = await page.evaluate(() => ({ on: document.getElementById('lv2').classList.contains('on'),
      n: document.querySelectorAll('#word-grid .wcard:not(.soon)').length }))
    check(l2.on && l2.n > 0, `Level 2 opens and lists its words (${l2.n})`)
    await page.click('#lv1'); await sleep(300); await page.click('#lv2'); await sleep(300)
    check(await page.evaluate(() => document.querySelectorAll('#word-grid .wcard:not(.soon)').length) === l2.n, 'Level 2 can be reopened (replayed) at will')

    // every clip the game asks for is served
    const audio = await page.evaluate(async () => {
      const bad = []
      for (const w of window.SpellingData.WORDS.map(x => x.w)) { const r = await fetch(window.__g27.audioURL('words', w)); if (r.status !== 200) bad.push(w) }
      for (const l of 'abcdefghijklmnopqrstuvwxyz') { const r = await fetch(window.__g27.audioURL('letters', l)); if (r.status !== 200) bad.push(l) }
      return bad
    })
    check(audio.length === 0, `every word and letter clip is served (${audio.length ? audio.join(',') : 'all'})`)
    check(page.__bad.length === 0, `nothing 404s${page.__bad.length ? ' — ' + page.__bad.slice(0, 3).join(', ') : ''}`)
    check(page.__errors.length === 0, `no page errors (desktop)${page.__errors.length ? ' — ' + page.__errors[0] : ''}`)
    await page.close()
  }

  // ── 2. touch, phone: finger drag + tap-to-place ───────────────────────
  {
    const page = await open({ w: 390, h: 844, touch: true })
    await page.evaluate(() => window.__g27.reset())
    await page.evaluate(() => window.__g27.startWord('pencil')); await sleep(900)
    const word = await spellByDrag(page, true); await sleep(900)
    const st = await page.evaluate(() => window.__g27.state())
    check(st.placed.join('') === word, `the whole word is spelled by FINGER drag (${st.placed.join('')})`)
    await page.evaluate(() => window.__g27.closeAll())
    // tap-to-place: tapping a tile puts it in the first empty slot
    await page.evaluate(() => window.__g27.startWord('book')); await sleep(900)
    const tile = await page.evaluateHandle(() => [...document.querySelectorAll('#tray .tile')].find(t => t.textContent === 'B'))
    const bb = await tile.boundingBox()
    await page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await sleep(300)
    check((await page.evaluate(() => window.__g27.state())).placed[0] === 'b', 'a TAP on the right tile fills the first empty slot')
    check(page.__errors.length === 0, `no page errors (phone)${page.__errors.length ? ' — ' + page.__errors[0] : ''}`)
    await page.close()
  }

  // ── 3. rotate mid-word: landscape -> portrait -> landscape ─────────────
  {
    const page = await open({ w: 844, h: 390, touch: true })
    await page.evaluate(() => window.__g27.reset())
    await page.evaluate(() => window.__g27.startWord('scissors')); await sleep(1000)
    await drag(page, 's', 0, true); await drag(page, 'c', 1, true)
    const before = (await page.evaluate(() => window.__g27.state())).placed.slice(0, 2).join('')
    const rotate = async (w, h) => {
      await page.emulate({ viewport: { width: w, height: h, deviceScaleFactor: 1, isMobile: true, hasTouch: true, isLandscape: w > h },
        userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36' })
      await sleep(700)
    }
    const layout = () => page.evaluate(() => {
      const vw = innerWidth, vh = innerHeight
      const els = [...document.querySelectorAll('#slots .slot, #tray .tile:not(.used), #play-tools button, #topbar button')]
      const out = els.filter(e => { const r = e.getBoundingClientRect(); return r.left < -1 || r.right > vw + 1 || r.top < -1 || r.bottom > vh + 1 })
      const scr = document.getElementById('scr-play')
      return { off: out.length, overflow: scr.scrollHeight - scr.clientHeight, placed: window.__g27.state().placed }
    })
    await rotate(390, 844)
    const p1 = await layout()
    check(p1.placed.slice(0, 2).join('') === before, `rotating to portrait keeps the letters already placed (${p1.placed.slice(0, 2).join('')})`)
    check(p1.off === 0 && p1.overflow <= 1, `after rotating to portrait nothing is off-screen (${p1.off} off, overflow ${p1.overflow}px)`)
    await drag(page, 'i', 2, true)
    check((await page.evaluate(() => window.__g27.state())).placed[2] === 'i', 'the drag still works after rotating')
    await rotate(844, 390)
    const p2 = await layout()
    check(p2.placed.slice(0, 3).join('') === 'sci', `rotating back keeps all placed letters (${p2.placed.slice(0, 3).join('')})`)
    check(p2.off === 0 && p2.overflow <= 1, `after rotating back nothing is off-screen (${p2.off} off, overflow ${p2.overflow}px)`)
    await spellByDrag(page, true); await sleep(900)
    check((await page.evaluate(() => window.__g27.state())).placed.join('') === 'scissors', 'the word can be finished after two rotations')
    check(page.__errors.length === 0, `no page errors (rotation)${page.__errors.length ? ' — ' + page.__errors[0] : ''}`)
    await page.close()
  }
} finally {
  await browser.close()
}
console.log(`\n${passes} passed, ${fails.length} failed`)
console.log(fails.length ? `${fails.length} FAILED` : 'ALL PASS')
process.exit(fails.length ? 1 : 0)
