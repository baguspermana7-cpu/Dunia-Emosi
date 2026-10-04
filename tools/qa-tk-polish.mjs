// G30 Timmy & Kapal Legendaris — the Mojo improvements, ported (owner 2026-10-04: "Apply the improvements made in
// the Mojo game to the other games too, especially the Timmy game"). Real game page, real grid levels:
//   A) Timmy's bubble has a capped height (board, commands and route never move): a long line folds to its first sentence (or "Ketuk untuk membaca") with a
//      Baca pill; the full text opens in a popover that never covers the command panel and stays on screen;
//      it closes by a tap outside and by itself; a short line never folds. The bubble never grows past the viewport.
//   B) no cut-off text: no '…' in a story thumbnail, no element with text-overflow:ellipsis / line-clamp clipping on
//      the story strip or a grid level.
// QA_SIZES="844x390,..." (default 844x390,1280x800,390x844) · QA_URL
import puppeteer from 'puppeteer'

const URL = process.env.QA_URL || 'http://localhost:8081/games/timmy-kapal.html'
const SIZES = (process.env.QA_SIZES || '844x390,1280x800,390x844').split(',').map(s => s.split('x').map(Number))
const sleep = ms => new Promise(r => setTimeout(r, ms))
const fails = []
let passes = 0
const check = (ok, msg) => { if (ok) passes++; else { fails.push(msg); console.log('FAIL ' + msg) } }
const LONG = 'Hmm, kapal menabrak tiang kayu di langkah 3. Coba ganti kotak nomor 3 dengan panah ke bawah, lalu tekan JALAN lagi ya! Kamu pasti bisa, ayo coba sekali lagi.'
const overlap = (a, b) => !(a[2] <= b[0] || a[0] >= b[2] || a[3] <= b[1] || a[1] >= b[3])
const CLIPPED = `(() => { const o = []; document.querySelectorAll('body *').forEach(e => { if (!e.offsetParent) return; const c = getComputedStyle(e)
  if ((c.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth + 1) || (c.webkitLineClamp !== 'none' && e.scrollHeight > e.clientHeight + 2)) o.push((typeof e.className === 'string' ? e.className : e.tagName) + ': ' + e.textContent.trim().slice(0, 40)) }); return o })()`
const RECT = `(s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom].map(Math.round) })`

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
try {
  for (const [w, h] of SIZES) {
    const tag = `${w}x${h}`
    const page = await browser.newPage()
    const errs = []
    page.on('pageerror', e => errs.push(e.message))
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
    await page.setViewport({ width: w, height: h, hasTouch: true, isMobile: w < 900 })
    await page.goto(URL, { waitUntil: 'networkidle2' })
    await page.evaluate(() => { __tk.unlockAll(); return __tk.start('vasa', 5) })
    await sleep(1800)
    // B) the story strip before the level
    const thumbs = await page.$$eval('.tks-tc', ns => ns.map(n => n.textContent))
    check(thumbs.length > 0, `${tag}: story thumbnails shown`)
    check(thumbs.every(t => !/…|\.\.\./.test(t)), `${tag}: no thumbnail caption is cut with an ellipsis (${thumbs.filter(t => /…|\.\.\./.test(t)).join(' | ')})`)
    const clipStory = await page.evaluate(CLIPPED)
    check(clipStory.length === 0, `${tag}: story screen has no clipped text (${clipStory.join(' | ')})`)
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Lewati/.test(x.textContent) && x.offsetParent); if (b) b.click() })
    await sleep(1600)
    const clipGrid = await page.evaluate(CLIPPED)
    check(clipGrid.length === 0, `${tag}: grid level has no clipped text (${clipGrid.join(' | ')})`)
    // A) the bubble chip
    const short = await page.evaluate(() => { const h = __tk.handle(); h.say('Ayo jalan!', 'good', 4000); return h.chip() })
    check(!short.more && short.shown === 'Ayo jalan!', `${tag}: a short line shows whole, no chip (${JSON.stringify(short)})`)
    const LAY = `JSON.stringify(['.tkg-sea', '.tkg-cmd', '.tkg-route'].map(s => (${RECT})(s)))`
    const lay0 = await page.evaluate(LAY)
    await page.evaluate(t => __tk.handle().say(t, 'bad', 6000), LONG)
    await sleep(450)
    const c = await page.evaluate(() => __tk.handle().chip())
    const R = await page.evaluate(`({ bub: (${RECT})('.tkg-bubble'), pop: (${RECT})('.tkg-bpop'), cmd: (${RECT})('.tkg-cmd'), vw: innerWidth, vh: innerHeight })`)
    check(c.more && c.full === LONG && c.shown.length < LONG.length && !/…/.test(c.shown), `${tag}: a long line folds to a whole short line (${c.shown})`)
    const lay1 = await page.evaluate(LAY)
    check(lay1 === lay0, `${tag}: a long line moves nothing (board, commands, route) (${lay0} -> ${lay1})`)
    check(R.bub[3] <= R.vh + 1 && R.bub[1] >= 0, `${tag}: the bubble is on screen (${R.bub})`)
    check(c.open, `${tag}: feedback opens the popover by itself`)
    check(R.pop && !overlap(R.pop, R.cmd), `${tag}: the popover never covers the command panel (pop ${R.pop} cmd ${R.cmd})`)
    check(R.pop && R.pop[0] >= 0 && R.pop[2] <= R.vw + 1 && R.pop[1] >= 0 && R.pop[3] <= R.vh + 1, `${tag}: the popover is on screen (${R.pop})`)
    // a tap outside closes it; a tap on the chip opens it again
    await page.mouse.click(Math.round((R.cmd[0] + R.cmd[2]) / 2), R.cmd[3] - 4)
    await sleep(250)
    check(!(await page.evaluate(() => __tk.handle().chip().open)), `${tag}: a tap outside closes the popover`)
    await page.mouse.click(Math.round((R.bub[0] + R.bub[2]) / 2), Math.round((R.bub[1] + R.bub[3]) / 2))
    await sleep(250)
    check(await page.evaluate(() => __tk.handle().chip().open), `${tag}: a tap on the chip opens the popover`)
    await sleep(4300)
    check(!(await page.evaluate(() => __tk.handle().chip().open)), `${tag}: the popover closes by itself`)
    check(errs.length === 0, `${tag}: no page errors (${errs.slice(0, 3).join(' | ')})`)
    await page.close()
  }
} finally { await browser.close() }
console.log(`qa-tk-polish: ${passes} passed, ${fails.length} failed`)
process.exitCode = fails.length ? 1 : 0
