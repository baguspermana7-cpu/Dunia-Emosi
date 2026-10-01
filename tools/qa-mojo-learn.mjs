// G31 "Belajar Bersama Mojo" activity loop (owner 2026-10-01: "not just listen").
// Real taps through every activity type, a wrong letter returns, the words come from SoalEngine,
// the Dunia mute switch silences the spoken word, and the screen fits at four sizes.
import puppeteer from 'puppeteer'; import fs from 'node:fs'
const out = process.env.QA_LEARN_SHOTS || '/tmp/mojo-learn-qa'; fs.mkdirSync(out, { recursive: true })
const url = process.env.QA_URL || 'http://localhost:8081/games/mojo-swoptops.html?unlock=1'
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
const checks = []; function check (ok, m) { checks.push({ ok, m }); console.log((ok ? 'PASS ' : 'FAIL ') + m) }
const sleep = ms => new Promise(r => setTimeout(r, ms))
async function page (w, h, muted) {
  const p = await browser.newPage(); await p.setViewport({ width: w, height: h })
  const errors = []; p.on('pageerror', e => errors.push(e.message))
  await p.evaluateOnNewDocument(m => {
    try { localStorage.setItem('dunia-emosi-sound', m ? 'off' : 'on') } catch (e) {}
    window.__spoken = []
    const fake = { speak (u) { window.__spoken.push({ text: u.text, lang: u.lang }) }, cancel () {}, getVoices () { return [] }, addEventListener () {} }
    Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true })
  }, muted)
  await p.goto(url, { waitUntil: 'networkidle0' }); await p.waitForFunction(() => window.__mojo && __mojo.ready); await sleep(400)
  p.__errors = errors
  return p
}
async function tap (p, sel) { const e = await p.waitForSelector(sel, { visible: true, timeout: 5000 }); await e.click(); await sleep(260) }
const st = p => p.evaluate(() => MojoLearn.state())
async function solve (p) {
  const s = await st(p)
  if (s.kind === 'susun') {
    const pre = await p.$$eval('#learn-slots .lslot.fixed', a => a.length)
    for (const ch of s.word.slice(pre)) {
      const k = await p.$$eval('#learn-tiles .ltile', (ts, ch) => ts.findIndex(t => !t.disabled && t.dataset.l === ch), ch)
      const tiles = await p.$$('#learn-tiles .ltile'); await tiles[k].click(); await sleep(260)
    }
  } else await tap(p, '#learn-opts .lopt[data-ok="1"]')
  return s
}

try {
  /* 1. every activity type completes with real taps; a wrong letter returns; reward pays bolts */
  {
    const p = await page(1280, 800, false)
    await p.evaluate(() => __mojo.home()); await tap(p, '#btn-learn')
    const s0 = await st(p)
    check(s0 && s0.rounds === 5 && s0.kind === 'susun' && s0.lang === 'en', 'Belajar opens a 5-round session that starts with Susun Kata in English')
    const items = await p.evaluate(() => SoalEngine.items('mojo-learn').map(q => q.id))
    check(s0.words.length === 5 && s0.words.every(id => items.includes(id)) && new Set(s0.words).size === 5, 'all five words come from the SoalEngine mojo-learn pack (profile g31, context learn), no repeats in a session')
    check(await p.evaluate(() => { const w = MojoLearn.state().word; return /^[A-Z]{3,6}$/.test(w) }), 'the word to spell has 3-6 letters (grades 1-2)')
    // a wrong letter: hops, shakes and stays in the tray; no slot fills
    const wrong = await p.evaluate(() => { const s = MojoLearn.state(), pre = document.querySelectorAll('#learn-slots .lslot.fixed').length, need = s.word.charAt(pre); const t = [...document.querySelectorAll('#learn-tiles .ltile')].find(t => t.dataset.l !== need); return t ? +t.dataset.k : -1 })
    if (wrong >= 0) {
      const before = await st(p)
      await tap(p, `#learn-tiles .ltile[data-k="${wrong}"]`); await sleep(300)
      const after = await p.evaluate(k => ({ filled: document.querySelectorAll('#learn-slots .lslot.filled').length, used: document.querySelector(`#learn-tiles .ltile[data-k="${k}"]`).disabled, m: MojoLearn.state().mistakes }), wrong)
      check(after.filled === 0 && !after.used && after.m === before.mistakes + 1, 'a wrong letter returns to the tray (no slot filled, block still tappable), no penalty beyond the star count')
    } else check(true, 'a wrong letter returns (every block in this word is the needed letter; skipped)')
    // tap a filled slot to send its letter back
    const pre = await p.$$eval('#learn-slots .lslot.fixed', a => a.length)
    const first = s0.word.charAt(pre)
    await tap(p, `#learn-tiles .ltile[data-l="${first}"]:not([disabled])`)
    check(await p.$eval(`#learn-slots .lslot[data-i="${pre}"]`, e => e.textContent) === first, 'tapping the right block flies it into the next empty box')
    await tap(p, `#learn-slots .lslot[data-i="${pre}"]`)
    check(await p.$eval(`#learn-slots .lslot[data-i="${pre}"]`, e => e.textContent === '') && await p.$$eval('#learn-tiles .ltile:not([disabled])', a => a.length) === s0.word.length - pre, 'tapping a filled box sends its letter back to the tray')
    const kinds = new Set()
    for (let r = 0; r < 5; r++) {
      const s = await solve(p); kinds.add(s.kind)
      await sleep(250)
      const done = await p.evaluate(() => ({ solved: MojoLearn.state().solved, mean: (document.querySelector('.learn-mean') || {}).textContent || '' }))
      check(done.solved && done.mean.length > 8, `round ${r + 1} (${s.kind} ${s.word}) completes with real taps and shows the meaning: "${done.mean}"`)
      if (s.kind === 'susun') check(await p.evaluate(w => window.__spoken.some(x => x.text === w && x.lang === 'en-US'), s.word), `the finished word ${s.word} is spoken with en-US`)
      await p.screenshot({ path: `${out}/1280-round${r + 1}-${s.kind}.png` })
      await tap(p, '#learn-next')
    }
    check(['susun', 'pasang', 'gambar', 'awal'].every(k => kinds.has(k)), 'the session rotates all four activities: ' + [...kinds].join(', '))
    const fin = await st(p)
    check(fin.kind === 'reward' && fin.done && fin.stars >= 1, 'after five rounds a reward card shows stars (' + fin.stars + ')')
    check(await p.evaluate(s => __mojo.save().rewardBolts === s, fin.stars), 'the reward adds bolts to the profile')
    await p.screenshot({ path: `${out}/1280-reward.png` })
    // a second session draws other words (per-avatar no-repeat history)
    await tap(p, '#learn-again')
    const s2 = await st(p)
    const unseen = (await p.evaluate(() => SoalEngine.items('mojo-learn').filter(q => q.lang === 'en').map(q => q.id))).filter(id => !s0.words.includes(id))
    check(unseen.length > 0 && unseen.every(id => s2.words.includes(id)), 'a new session brings the words the last one did not use (per-avatar no-repeat history): ' + unseen.join(','))
    // the language chip switches to Bahasa words
    await tap(p, '#learn-lang')
    check((await st(p)).lang === 'id' && (await p.evaluate(() => SoalEngine.items('mojo-learn').filter(q => q.lang === 'id').map(q => q.id))).includes((await st(p)).words[0]), 'the EN/ID chip switches the session to Bahasa words from the same pack')
    check(p.__errors.length === 0, 'no page errors ' + p.__errors.join(';'))
    await p.close()
  }
  /* 2. mute: the Dunia sound switch silences every spoken word */
  {
    const p = await page(1280, 800, true)
    await p.evaluate(() => __mojo.home()); await tap(p, '#btn-learn')
    await solve(p); await sleep(300); await tap(p, '#learn-say')
    check(await p.evaluate(() => window.__spoken.length === 0), 'with Dunia sound off, finishing a word and the speaker button speak nothing')
    await p.close()
  }
  /* 3. layout fits at four sizes: card in view, targets >= 56px, text >= 14px on tablets */
  for (const [w, h] of [[1280, 800], [1024, 768], [844, 390], [390, 844]]) {
    const p = await page(w, h, false)
    await p.evaluate(() => __mojo.home()); await tap(p, '#btn-learn')
    for (let r = 0; r < 5; r++) {
      const s = await st(p)
      const m = await p.evaluate(() => {
        const vis = e => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height } }
        const card = vis(document.querySelector('.learn-card'))
        const all = [...document.querySelectorAll('.ltile,.lslot:not(.fixed),.lopt,#learn-say,#learn-lang,#scr-learn .topbar button')].filter(e => e.tagName === 'BUTTON' && e.offsetParent)
        const targets = all.map(vis), slots = all.filter(e => e.classList.contains('lslot')).map(vis), others = all.filter(e => !e.classList.contains('lslot')).map(vis)
        const texts = [...document.querySelectorAll('#scr-learn .learn-card *')].filter(e => e.childNodes.length && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && e.offsetParent).map(e => parseFloat(getComputedStyle(e).fontSize))
        return { card, inView: targets.every(t => t.l >= 0 && t.r <= innerWidth + 0.5 && t.t >= 0 && t.b <= innerHeight + 0.5), small: others.filter(t => t.w < 55.5 || t.h < 55.5).length, smallSlots: slots.filter(t => t.w < (innerWidth >= 700 ? 55.5 : 47.5) || t.h < 55.5).length, minText: Math.min.apply(null, texts), scroll: document.documentElement.scrollWidth > innerWidth }
      })
      check(m.inView && m.card.b <= h + 0.5 && m.card.r <= w + 0.5 && !m.scroll, `${w}x${h} ${s.kind}: card and every target in view`)
      check(m.small === 0, `${w}x${h} ${s.kind}: letter blocks, choices and buttons >= 56px (${m.small} smaller)`)
      check(m.smallSlots === 0, `${w}x${h} ${s.kind}: letter boxes >= 56px tall (>= 48px wide on a phone, 56px from 700px) (${m.smallSlots} smaller)`)
      check(m.minText >= 14, `${w}x${h} ${s.kind}: text >= 14px (min ${m.minText})`)
      await p.screenshot({ path: `${out}/${w}x${h}-${r + 1}-${s.kind}.png` })
      await solve(p); await sleep(250)
      const foot = await p.$eval('#learn-next', e => { const r = e.getBoundingClientRect(); return r.bottom <= innerHeight + 0.5 && r.height >= 55.5 })
      check(foot, `${w}x${h} ${s.kind}: the Lanjut button is in view and >= 56px after solving`)
      await tap(p, '#learn-next')
    }
    const rw = await p.$eval('.learn-reward', e => { const r = e.getBoundingClientRect(); return r.bottom <= innerHeight + 0.5 && r.right <= innerWidth + 0.5 })
    check(rw, `${w}x${h}: the reward card fits`)
    await p.screenshot({ path: `${out}/${w}x${h}-reward.png` })
    await p.close()
  }
} catch (e) { check(false, e.stack) } finally {
  await browser.close()
  fs.writeFileSync(out + '/result.json', JSON.stringify(checks, null, 2))
  const bad = checks.filter(c => !c.ok); console.log(`${checks.length - bad.length} passed, ${bad.length} failed`)
  if (bad.length) process.exitCode = 1
}
