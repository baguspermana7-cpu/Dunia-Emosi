// E2E gate for games/ayo-berhitung.html (PRD §17 acceptance criteria).
//
// The engine's own tests prove the arithmetic; this proves the things only a
// real browser can: that a session survives a refresh, that a rapid double tap
// cannot count an answer twice, that the keyboard alone finishes a session,
// that feedback is never colour-only, and that the worksheet's "Ulangi Halaman"
// really returns the same page rather than a similar-looking new one.
import puppeteer from 'puppeteer'

const URL = process.env.QA_URL || 'http://localhost:8081/games/ayo-berhitung.html'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const fails = []
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fails.push(msg) }

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})

async function open () {
  const page = await browser.newPage()
  const cdp = await page.createCDPSession()
  await cdp.send('Network.setBypassServiceWorker', { bypass: true })
  page.on('pageerror', e => { throw new Error('page error: ' + e.message) })
  await page.setViewport({ width: 900, height: 900 })
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForFunction(() => !!window.__berhitung, { timeout: 20000 })
  return page
}

try {
  // ── the loop works, and a first-try answer scores as one ──────────────────
  {
    const page = await open()
    await page.evaluate(() => { localStorage.clear(); __berhitung.startSession({ operation: 'add', difficulty: 'easy', questionCount: 5, mode: 'focus', seed: 'gate-1' }) })
    await page.waitForSelector('#s-focus:not([hidden])')
    const answered = await page.evaluate(async () => {
      const out = []
      for (let i = 0; i < 5; i++) {
        const q = __berhitung.session.questions[__berhitung.session.currentIndex]
        document.getElementById('f-input').value = String(q.expected)
        __berhitung.submit()
        out.push(q.expected)
        await new Promise(r => setTimeout(r, 900))
      }
      return { out, screen: __berhitung.screenId(), attempts: __berhitung.attempts.length, xp: __berhitung.db.xp }
    })
    check(answered.screen === 's-done', `a five-question session completes (ended on ${answered.screen})`)
    check(answered.attempts === 5, `every question recorded one attempt (${answered.attempts})`)
    check(answered.xp === 50, `five first-try answers score 5 x 10 XP (${answered.xp})`)
    const mastery = await page.evaluate(() => __berhitung.db.skills.add.mastery)
    check(mastery === 20, `one perfect session moves mastery by the capped step (${mastery})`)
    await page.close()
  }

  // ── double submit cannot double count ─────────────────────────────────────
  {
    const page = await open()
    const r = await page.evaluate(async () => {
      localStorage.clear()
      __berhitung.startSession({ operation: 'multiply', difficulty: 'easy', questionCount: 3, mode: 'focus', seed: 'gate-2' })
      const q = __berhitung.session.questions[0]
      document.getElementById('f-input').value = String(q.expected)
      __berhitung.submit(); __berhitung.submit(); __berhitung.submit()   // rapid taps
      await new Promise(r => setTimeout(r, 1000))
      return { attempts: __berhitung.attempts.length, index: __berhitung.session.currentIndex }
    })
    check(r.attempts === 1, `three rapid submits record one attempt (${r.attempts})`)
    check(r.index === 1, `and advance exactly one question (${r.index})`)
    await page.close()
  }

  // ── a session survives a refresh ──────────────────────────────────────────
  {
    const page = await open()
    await page.evaluate(async () => {
      localStorage.clear()
      __berhitung.startSession({ operation: 'subtract', difficulty: 'medium', questionCount: 6, mode: 'focus', seed: 'gate-3' })
      const q = __berhitung.session.questions[0]
      document.getElementById('f-input').value = String(q.expected)
      __berhitung.submit()
      await new Promise(r => setTimeout(r, 1000))
    })
    const before = await page.evaluate(() => ({ idx: __berhitung.session.currentIndex, seed: __berhitung.session.seed }))
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__berhitung, { timeout: 20000 })
    const card = await page.evaluate(() => !document.getElementById('continue-card').hidden)
    const resumed = await page.evaluate(async () => {
      document.getElementById('btn-continue').click()
      await new Promise(r => setTimeout(r, 300))
      return { idx: __berhitung.session.currentIndex, seed: __berhitung.session.seed, screen: __berhitung.screenId() }
    })
    check(card, 'after a refresh the home screen offers Lanjutkan')
    check(resumed.idx === before.idx && resumed.seed === before.seed,
      `the resumed session is the same one at the same place (${resumed.idx}/${before.idx})`)
    check(resumed.screen === 's-focus', 'and it resumes into the question, not the menu')
    await page.close()
  }

  // ── keyboard only ─────────────────────────────────────────────────────────
  {
    const page = await open()
    await page.evaluate(() => { localStorage.clear(); __berhitung.startSession({ operation: 'add', difficulty: 'easy', questionCount: 3, mode: 'focus', seed: 'gate-4' }) })
    await page.waitForSelector('#s-focus:not([hidden])')
    for (let i = 0; i < 3; i++) {
      const expected = await page.evaluate(() => String(__berhitung.session.questions[__berhitung.session.currentIndex].expected))
      await page.focus('#f-input')
      await page.keyboard.type(expected)
      await page.keyboard.press('Enter')
      await sleep(900)
    }
    const done = await page.evaluate(() => __berhitung.screenId())
    check(done === 's-done', `a session can be finished with the keyboard alone (ended on ${done})`)
    await page.close()
  }

  // ── feedback is not colour-only ───────────────────────────────────────────
  {
    const page = await open()
    await page.evaluate(() => { localStorage.clear(); __berhitung.startSession({ operation: 'add', difficulty: 'easy', questionCount: 3, mode: 'focus', seed: 'gate-5' }) })
    const wrong = await page.evaluate(async () => {
      const q = __berhitung.session.questions[0]
      document.getElementById('f-input').value = String(q.expected + 1)
      __berhitung.submit()
      await new Promise(r => setTimeout(r, 300))
      const v = document.getElementById('f-verdict')
      return { text: v.textContent.trim(), live: v.getAttribute('aria-live'), hint: document.getElementById('f-hint').textContent.trim() }
    })
    check(/[A-Za-z]/.test(wrong.text) && wrong.text.length > 4, `a wrong answer says so in words ("${wrong.text.slice(0, 40)}")`)
    check(wrong.live === 'polite', 'the verdict is an aria-live region, so a screen reader hears it')
    check(wrong.hint.length > 0, 'a wrong answer also offers a hint')
    const revealing = await page.evaluate(() => {
      const q = __berhitung.session.questions[0]
      return document.getElementById('f-hint').textContent.includes(String(q.expected))
    })
    check(!revealing, 'the first hint does not simply give the answer away')
    await page.close()
  }

  // ── worksheet: same seed repeats the page, new seed does not ──────────────
  {
    const page = await open()
    await page.evaluate(() => { localStorage.clear(); __berhitung.startSession({ operation: 'add', difficulty: 'easy', questionCount: 10, mode: 'worksheet', seed: 'gate-6' }) })
    await page.waitForSelector('#s-ws:not([hidden])')
    const cells = await page.$$eval('#ws-grid .ws-item', els => els.length)
    check(cells === 10, `the worksheet lays out all ten questions (${cells})`)
    const sig = () => page.evaluate(() => __berhitung.session.questions.map(q => q.signature).join('|'))
    const first = await sig()
    await page.evaluate(() => document.getElementById('btn-repeat').click())
    await sleep(400)
    const repeated = await sig()
    await page.evaluate(() => document.getElementById('btn-new').click())
    await sleep(400)
    const fresh = await sig()
    check(repeated === first, 'Ulangi Halaman returns the same questions')
    check(fresh !== first, 'Soal Baru returns a different page')

    // typing a correct answer marks the item without colour alone
    const marked = await page.evaluate(async () => {
      const q = __berhitung.session.questions[0]
      const inputs = [...document.querySelectorAll('#ws-0 .ws-ans input')]
      String(q.expected).split('').forEach((ch, i) => {
        inputs[i].value = ch
        inputs[i].dispatchEvent(new Event('input', { bubbles: true }))
      })
      await new Promise(r => setTimeout(r, 200))
      return { state: document.getElementById('ws-state-0').textContent.trim(), cls: document.getElementById('ws-0').className }
    })
    check(/benar/.test(marked.state), `a correct worksheet answer is labelled in words ("${marked.state}")`)
    check(/ok/.test(marked.cls), 'and marked on the card')

    const key = await page.evaluate(() => {
      document.getElementById('btn-print') // do not actually print in headless
      const host = document.getElementById('print-key')
      return { hiddenByDefault: getComputedStyle(host).display === 'none' }
    })
    check(key.hiddenByDefault, 'the answer key is not visible on screen')
    await page.close()
  }

  // ── corrupt storage fails safe ────────────────────────────────────────────
  {
    const page = await open()
    await page.evaluate(() => localStorage.setItem('berhitung-v1', '{not json'))
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__berhitung, { timeout: 20000 })
    const ok = await page.evaluate(() => __berhitung.db && __berhitung.db.schemaVersion === 1 && __berhitung.screenId() === 's-home')
    check(ok, 'corrupt saved data is discarded quietly and the app still opens')
    await page.close()
  }
} finally {
  await browser.close()
}

console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
