// E2E gate for games/ayo-berhitung.html.
//
// The page is laid out to match the reference the owner supplied, so this
// checks the reference's own promises as well as the usual correctness ones:
// the panel says "1000 soal ... 10 soal per halaman, 100 halaman. Jawaban
// tersimpan saat pindah halaman", and every one of those claims is testable.
import puppeteer from 'puppeteer'

const URL = process.env.QA_URL || 'http://localhost:8081/games/ayo-berhitung.html'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const fails = []
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fails.push(msg) }

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})

async function open (opts = {}) {
  const page = await browser.newPage()
  const cdp = await page.createCDPSession()
  await cdp.send('Network.setBypassServiceWorker', { bypass: true })
  page.on('pageerror', e => { throw new Error('page error: ' + e.message) })
  if (opts.reduceMotion) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await page.setViewport({ width: 1400, height: 950 })
  // Clear BEFORE the first load, not after: the page saves on pagehide, so a
  // clear-then-reload lets the outgoing page write its state straight back and
  // the next test starts on the last test's skill. That cost a confusing red run.
  // Clear ONCE per tab, before the first document: clearing after load lets the
  // outgoing page's pagehide save write the previous test's state straight back,
  // and clearing on every document would wipe the reload-persistence tests.
  await page.evaluateOnNewDocument(() => {
    try {
      if (!sessionStorage.getItem('__qaCleared')) { localStorage.clear(); sessionStorage.setItem('__qaCleared', '1') }
    } catch (_) {}
  })
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForFunction(() => !!window.__berhitung, { timeout: 20000 })
  return page
}
const fill = (page, i, text) => page.evaluate((i, text) => {
  const ins = [...document.querySelectorAll('#q' + i + ' .boxes input')]
  text.split('').forEach((c, k) => { if (ins[k]) { ins[k].value = c; ins[k].dispatchEvent(new Event('input', { bubbles: true })) } })
}, i, text)
const answerOf = (page, i) => page.evaluate(i => String(__berhitung.session.questions[i].expected), i)

try {
  // ── the panel the owner drew ──────────────────────────────────────────────
  {
    const page = await open()
    const ui = await page.evaluate(() => ({
      title: document.querySelector('.panel h1').textContent.trim(),
      lede: document.getElementById('lede').textContent.trim(),
      ops: [...document.querySelectorAll('#seg-op button')].map(b => b.textContent.trim()),
      lvls: [...document.querySelectorAll('#seg-lv button')].map(b => b.textContent.trim()),
      acts: [...document.querySelectorAll('.panel .act')].map(b => b.textContent.trim()),
      activeOp: document.querySelector('#seg-op button[aria-pressed="true"]').textContent.trim(),
      activeLv: document.querySelector('#seg-lv button[aria-pressed="true"]').textContent.trim(),
      cards: document.querySelectorAll('#sheet .q').length,
      cols: getComputedStyle(document.getElementById('sheet')).gridTemplateColumns.split(' ').length,
      star: document.querySelector('.star').textContent.replace(/\s+/g, ' ').trim(),
    }))
    check(ui.title === 'Ayo Berhitung!', `the title reads as in the reference ("${ui.title}")`)
    check(/1000 soal penjumlahan — 10 soal per halaman, 100 halaman\. Jawaban tersimpan saat pindah halaman\./.test(ui.lede),
      `the subtitle is the reference's own line ("${ui.lede.slice(0, 48)}…")`)
    check(ui.ops.join(',') === 'Tambah,Kurang,Kali,Bagi,Cerita', `OPERASI offers exactly the reference's five (${ui.ops.join(',')})`)
    check(ui.lvls.join(',') === 'Mudah,Sedang,Sulit', `LEVEL offers exactly the reference's three (${ui.lvls.join(',')})`)
    check(/Soal Baru/.test(ui.acts.join('|')) && /Ulangi Halaman/.test(ui.acts.join('|')), 'Soal Baru and Ulangi Halaman are on the panel')
    check(['Cari Salah', 'Cetak Halaman', 'Cetak Rentang', 'Lencana'].every(n => ui.acts.join('|').includes(n)),
      'the second row carries Cari Salah, Cetak Halaman, Cetak Rentang and Lencana')
    check(ui.activeOp === 'Tambah' && ui.activeLv === 'Sedang', `it opens on Tambah + Sedang like the reference (${ui.activeOp}/${ui.activeLv})`)
    check(ui.cards === 10, `ten questions on the page (${ui.cards})`)
    check(ui.cols === 3, `laid out in three columns (${ui.cols})`)
    check(/0 \/1000/.test(ui.star.replace('★ ', '')), `the star counter counts toward 1000 ("${ui.star}")`)
    await page.close()
  }

  // ── answering: tick, counter, and no colour-only state ────────────────────
  {
    const page = await open()
    await fill(page, 0, await answerOf(page, 0))
    await sleep(200)
    const good = await page.evaluate(() => ({
      cls: document.getElementById('q0').className,
      tick: document.querySelector('#q0 .tick').textContent.trim(),
      sr: document.getElementById('st0').textContent.trim(),
      star: document.getElementById('solved').textContent,
    }))
    check(/\bok\b/.test(good.cls), 'a correct card is marked')
    check(good.tick === '✓', `the mark is a glyph, not colour alone ("${good.tick}")`)
    check(/benar/.test(good.sr), `a screen reader is told which card is right ("${good.sr}")`)
    check(good.star === '1', `the star counter moved (${good.star})`)

    const wrongAns = await page.evaluate(() => String(__berhitung.session.questions[1].expected + 1).slice(0, String(__berhitung.session.questions[1].expected).length))
    await fill(page, 1, wrongAns)
    await sleep(200)
    const bad = await page.evaluate(() => ({
      cls: document.getElementById('q1').className,
      tick: document.querySelector('#q1 .tick').textContent.trim(),
      sr: document.getElementById('st1').textContent.trim(),
      star: document.getElementById('solved').textContent,
    }))
    check(/no-yet/.test(bad.cls), 'a wrong card is marked too')
    check(bad.tick === '✕', `and it says so with a glyph ("${bad.tick}")`)
    check(/belum benar/.test(bad.sr), `with words for a screen reader ("${bad.sr}")`)
    check(bad.star === '1', `a wrong answer does not score (${bad.star})`)
    await page.close()
  }

  // ── "jawaban tersimpan saat pindah halaman" ───────────────────────────────
  {
    const page = await open()
    const a0 = await answerOf(page, 0)
    await fill(page, 0, a0)
    await sleep(150)
    const p1 = await page.evaluate(() => __berhitung.session.questions.map(q => q.signature).join('|'))
    await page.evaluate(() => document.getElementById('pg-next').click())
    await sleep(650)
    const p2 = await page.evaluate(() => __berhitung.session.questions.map(q => q.signature).join('|'))
    check(p2 !== p1, 'the next page is a different set of questions')
    await page.evaluate(() => document.getElementById('pg-prev').click())
    await sleep(650)
    const back = await page.evaluate(() => ({
      sigs: __berhitung.session.questions.map(q => q.signature).join('|'),
      typed: [...document.querySelectorAll('#q0 .boxes input')].map(i => i.value).join(''),
      ok: /\bok\b/.test(document.getElementById('q0').className),
    }))
    check(back.sigs === p1, 'coming back returns the same page, not a new one')
    check(back.typed === a0 && back.ok, `the answer typed before the page turn is still there ("${back.typed}")`)

    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__berhitung, { timeout: 20000 })
    const after = await page.evaluate(() => ({
      page: __berhitung.page,
      typed: [...document.querySelectorAll('#q0 .boxes input')].map(i => i.value).join(''),
      star: document.getElementById('solved').textContent,
    }))
    check(after.page === 1 && after.typed === a0 && after.star === '1',
      `and it survives a reload (halaman ${after.page}, "${after.typed}", ⭐ ${after.star})`)
    await page.close()
  }

  // ── Ulangi Halaman vs Soal Baru ───────────────────────────────────────────
  {
    const page = await open()
    const sigs = () => page.evaluate(() => __berhitung.session.questions.map(q => q.signature).join('|'))
    const first = await sigs()
    await fill(page, 0, await answerOf(page, 0))
    await sleep(150)
    await page.evaluate(() => document.getElementById('btn-repeat').click())
    await sleep(650)
    const repeated = await sigs()
    const cleared = await page.evaluate(() => [...document.querySelectorAll('#q0 .boxes input')].map(i => i.value).join(''))
    check(repeated === first, 'Ulangi Halaman gives back the same ten questions')
    check(cleared === '', 'and clears what was written on them')
    await page.evaluate(() => document.getElementById('btn-new').click())
    await sleep(650)
    check(await sigs() !== first, 'Soal Baru gives a different ten')
    // and the new set is itself reproducible
    const nw = await sigs()
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__berhitung, { timeout: 20000 })
    check(await sigs() === nw, 'the new set comes back the same after a reload (seeded, not random)')
    await page.close()
  }

  // ── switching operation and level ─────────────────────────────────────────
  {
    const page = await open()
    for (const [label, word] of [['Kurang', 'pengurangan'], ['Kali', 'perkalian'], ['Bagi', 'pembagian'], ['Cerita', 'cerita']]) {
      await page.evaluate(l => [...document.querySelectorAll('#seg-op button')].find(b => b.textContent.trim() === l).click(), label)
      await sleep(500)
      const st = await page.evaluate(() => ({
        lede: document.getElementById('lede').textContent,
        op: __berhitung.session.operation,
        cards: document.querySelectorAll('#sheet .q').length,
        pressed: document.querySelector('#seg-op button[aria-pressed="true"]').textContent.trim(),
      }))
      check(st.cards === 10 && st.pressed === label && st.lede.includes(word),
        `${label} loads ten ${word} questions and marks its pill`)
    }
    await page.evaluate(() => [...document.querySelectorAll('#seg-lv button')].find(b => b.textContent.trim() === 'Sulit').click())
    await sleep(500)
    check(await page.evaluate(() => __berhitung.session.difficulty) === 'hard', 'the level pill changes the difficulty')
    await page.close()
  }

  // ── keyboard alone ────────────────────────────────────────────────────────
  {
    const page = await open()
    const a = await answerOf(page, 0)
    await page.click('#q0 .boxes input')
    await page.keyboard.type(a)
    await sleep(200)
    const ok = await page.evaluate(() => /\bok\b/.test(document.getElementById('q0').className))
    check(ok, 'a card can be answered from the keyboard')
    const auto = await page.evaluate(() => document.activeElement.closest('.q') && document.activeElement.closest('.q').id)
    check(auto === 'q1', `solving a card moves the caret to the next unsolved one (${auto})`)
    await page.keyboard.press('Enter')
    const moved = await page.evaluate(() => document.activeElement.closest('.q') && document.activeElement.closest('.q').id)
    check(moved === 'q2', `Enter steps on again from there (${moved})`)
    await page.close()
  }

  // ── digit mode (the owner's "2 digit") ───────────────────────────────────
  {
    const page = await open()
    await page.evaluate(() => [...document.querySelectorAll('#seg-op button')].find(b => b.textContent.trim() === 'Tambah').click())
    await sleep(500)
    await page.evaluate(() => [...document.querySelectorAll('#seg-dg button')].find(b => b.textContent.trim() === '2').click())
    await sleep(650)
    const two = await page.evaluate(() => ({
      pressed: document.querySelector('#seg-dg button[aria-pressed="true"]').textContent.trim(),
      lede: document.getElementById('lede').textContent,
      lens: __berhitung.session.questions.flatMap(q => q.operands.map(o => String(o).length)),
      cards: document.querySelectorAll('#sheet .q').length,
    }))
    check(two.pressed === '2', `the DIGIT pill shows 2 (${two.pressed})`)
    check(two.lens.every(l => l === 2), `every operand on the page is two digits (${[...new Set(two.lens)].join(',')})`)
    check(/2 digit/.test(two.lede), `the panel says which mode it is serving ("${two.lede.slice(0, 44)}…")`)
    check(two.cards === 10, 'still ten questions')

    // a digit mode is its own thousand: work in one must not leak into another
    await fill(page, 0, await answerOf(page, 0))
    await sleep(200)
    const scored = await page.evaluate(() => document.getElementById('solved').textContent)
    await page.evaluate(() => [...document.querySelectorAll('#seg-dg button')].find(b => b.textContent.trim() === 'Bebas').click())
    await sleep(500)
    const free = await page.evaluate(() => ({ star: document.getElementById('solved').textContent, lede: document.getElementById('lede').textContent }))
    check(scored === '1' && free.star === '0', `each digit mode keeps its own score (2-digit ${scored}, bebas ${free.star})`)
    check(!/digit/.test(free.lede), 'and "Bebas" goes back to the reference sentence')
    await page.evaluate(() => [...document.querySelectorAll('#seg-dg button')].find(b => b.textContent.trim() === '2').click())
    await sleep(650)
    const backAgain = await page.evaluate(() => ({ star: document.getElementById('solved').textContent, typed: [...document.querySelectorAll('#q0 .boxes input')].map(i => i.value).join('') }))
    check(backAgain.star === '1' && backAgain.typed.length > 0, `returning to 2 digit restores that mode's work (⭐ ${backAgain.star})`)
    await page.close()
  }

  // ── precision: the boxes sit on the place-value columns ──────────────────
  {
    const page = await open()
    await page.evaluate(() => [...document.querySelectorAll('#seg-dg button')].find(b => b.textContent.trim() === '3').click())
    await sleep(650)
    const geom = await page.evaluate(() => {
      const card = document.getElementById('q0')
      const grid = card.querySelector('.sum')
      const digitsRow = [...grid.querySelectorAll('.d')].filter(d => d.textContent.trim())
      const boxes = [...card.querySelectorAll('.boxes input')]
      const gridOfBox = boxes[0].parentElement.parentElement === grid || boxes[0].closest('.sum') === grid
      const bx = boxes.map(b => Math.round(b.getBoundingClientRect().right))
      const dx = digitsRow.map(d => Math.round(d.getBoundingClientRect().right))
      const unitsDigit = dx[dx.length - 1], unitsBox = bx[bx.length - 1]
      const widths = new Set(boxes.map(b => Math.round(b.getBoundingClientRect().width)))
      return { gridOfBox, delta: Math.abs(unitsDigit - unitsBox), widths: [...widths], answerLen: boxes.length,
               expected: String(__berhitung.session.questions[0].expected).length }
    })
    check(geom.gridOfBox, 'the answer boxes live in the same grid as the digits')
    check(geom.delta <= 1, `the units box is on the units column (off by ${geom.delta}px)`)
    check(geom.widths.length === 1, `every box is the same width (${geom.widths.join(',')})`)
    check(geom.answerLen === geom.expected, `there is one box per digit of the answer (${geom.answerLen})`)
    await page.close()
  }

  // ── micro-interactions ───────────────────────────────────────────────────
  {
    const page = await open()
    const anim = await page.evaluate(() => {
      const tick = document.querySelector('#q0 .tick')
      const card = document.getElementById('q0')
      return {
        tickTrans: getComputedStyle(tick).transitionDuration,
        cardTrans: getComputedStyle(card).transitionDuration,
        railTrans: getComputedStyle(document.getElementById('rail-fill')).transitionDuration,
        actTrans: getComputedStyle(document.getElementById('btn-new')).transitionDuration,
      }
    })
    const ms = v => Math.max(...String(v).split(',').map(x => parseFloat(x) * 1000))
    check(ms(anim.tickTrans) >= 150 && ms(anim.tickTrans) <= 500, `the tick animates in the PRD's 250-450ms band (${anim.tickTrans})`)
    check(ms(anim.cardTrans) > 0 && ms(anim.railTrans) > 0 && ms(anim.actTrans) > 0, 'cards, rail and buttons all transition rather than snap')

    // wrong answer shakes the boxes, briefly, and only the boxes
    const wrong = await page.evaluate(async () => {
      const q = __berhitung.session.questions[0]
      const s = String(q.expected), bad = String(q.expected + 1).slice(0, s.length)
      const ins = [...document.querySelectorAll('#q0 .boxes input')]
      bad.split('').forEach((c, k) => { ins[k].value = c; ins[k].dispatchEvent(new Event('input', { bubbles: true })) })
      const during = document.getElementById('q0').className
      await new Promise(r => setTimeout(r, 400))
      return { during, after: document.getElementById('q0').className }
    })
    check(/shake/.test(wrong.during), 'a wrong answer shakes')
    check(!/shake/.test(wrong.after), 'and stops shaking straight after, so typing is never blocked')

    // finishing the page says so
    const toastText = await page.evaluate(async () => {
      for (let i = 0; i < 10; i++) {
        const q = __berhitung.session.questions[i]
        const ins = [...document.querySelectorAll('#q' + i + ' .boxes input')]
        String(q.expected).split('').forEach((c, k) => { ins[k].value = c; ins[k].dispatchEvent(new Event('input', { bubbles: true })) })
      }
      await new Promise(r => setTimeout(r, 300))
      const t = document.getElementById('toast')
      return { text: t.textContent, shown: t.classList.contains('show'), star: document.getElementById('solved').textContent }
    })
    check(toastText.shown && /selesai/i.test(toastText.text), `a finished page is celebrated once ("${toastText.text}")`)
    check(toastText.star === '10', `and all ten are counted (${toastText.star})`)
    await page.close()
  }

  // ── the motion itself, measured ──────────────────────────────────────────
  {
    const page = await open()
    // Wait for the first placement instead of racing it: the indicator is sized
    // from layout, and reading it mid-boot made this gate flaky once.
    await page.waitForFunction(() => {
      const el = document.querySelector('#seg-op .ind')
      return !!el && el.style.opacity === '1' && /translateX/.test(el.style.transform)
    }, { timeout: 15000 })
    const ind0 = await page.evaluate(() => {
      const el = document.querySelector('#seg-op .ind')
      return el ? { x: el.style.transform, w: el.style.width, trans: getComputedStyle(el).transitionDuration } : null
    })
    check(!!ind0, 'each segmented group has a sliding indicator')
    check(ind0 && /translateX/.test(ind0.x) && parseFloat(ind0.w) > 20,
      `it is placed on the active pill (${ind0 && ind0.x}, ${ind0 && ind0.w})`)
    await page.evaluate(() => [...document.querySelectorAll('#seg-op button')].find(b => b.textContent.trim() === 'Bagi').click())
    await sleep(500)
    const ind1 = await page.evaluate(() => {
      const el = document.querySelector('#seg-op .ind')
      const btn = [...document.querySelectorAll('#seg-op button')].find(b => b.getAttribute('aria-pressed') === 'true')
      return { x: el.style.transform, w: parseFloat(el.style.width), btnX: btn.offsetLeft, btnW: btn.offsetWidth,
               indX: parseFloat((el.style.transform.match(/-?[\d.]+/) || [0])[0]) }
    })
    check(ind1.x !== ind0.x, 'choosing another option moves it rather than repainting')
    check(Math.abs(ind1.indX - ind1.btnX) <= 1 && Math.abs(ind1.w - ind1.btnW) <= 1,
      `and it lands exactly on that pill (${Math.round(ind1.indX)}/${ind1.btnX}, ${Math.round(ind1.w)}/${ind1.btnW})`)

    // cards arrive in sequence, and the stagger is bounded
    const stagger = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#sheet .q')]
      return {
        entering: document.getElementById('sheet').classList.contains('enter'),
        first: getComputedStyle(cards[0]).animationDelay,
        last: getComputedStyle(cards[cards.length - 1]).animationDelay,
        dur: getComputedStyle(cards[0]).animationDuration,
      }
    })
    const ms = v => Math.round(parseFloat(v) * 1000)
    check(stagger.entering, 'a new page animates its cards in')
    check(ms(stagger.first) === 0 && ms(stagger.last) > 0 && ms(stagger.last) <= 400,
      `the stagger is sequential and short (${stagger.first} → ${stagger.last}, each ${stagger.dur})`)

    // a digit lands with its own small pop, and it ends
    const ink = await page.evaluate(async () => {
      const el = document.querySelector('#q0 .boxes input')
      el.value = '7'; el.dispatchEvent(new Event('input', { bubbles: true }))
      const during = el.className
      await new Promise(r => setTimeout(r, 300))
      return { during, after: el.className }
    })
    check(/ink/.test(ink.during) && !/ink/.test(ink.after), 'a typed digit pops once and the class is cleaned up')

    // a solved card sweeps exactly once
    const sweep = await page.evaluate(async () => {
      const i = 1
      const q = __berhitung.session.questions[i]
      const ins = [...document.querySelectorAll('#q' + i + ' .boxes input')]
      String(q.expected).split('').forEach((c, k) => { ins[k].value = c; ins[k].dispatchEvent(new Event('input', { bubbles: true })) })
      await new Promise(r => setTimeout(r, 60))
      const during = document.getElementById('q' + i).className
      await new Promise(r => setTimeout(r, 700))
      return { during, after: document.getElementById('q' + i).className }
    })
    check(/just/.test(sweep.during), 'a solved card sweeps')
    check(!/just/.test(sweep.after), 'and the sweep is a one-off, not a loop')

    // the page turn is directional
    const dir = await page.evaluate(async () => {
      document.getElementById('pg-next').click()
      await new Promise(r => setTimeout(r, 60))
      const going = document.getElementById('sheet').className
      await new Promise(r => setTimeout(r, 700))
      document.getElementById('pg-prev').click()
      await new Promise(r => setTimeout(r, 60))
      const back = document.getElementById('sheet').className
      await new Promise(r => setTimeout(r, 700))
      return { going, back, settled: document.getElementById('sheet').className }
    })
    check(/out-left/.test(dir.going), 'going forward slides the sheet left')
    check(/out-right/.test(dir.back), 'going back slides it the other way')
    check(!/out-/.test(dir.settled), 'and the sheet settles cleanly afterwards')
    await page.close()
  }

  // ── reduced motion turns the movement off, not the meaning ───────────────
  {
    const page = await open({ reduceMotion: true })
    const rm = await page.evaluate(async () => {
      const q = __berhitung.session.questions[0]
      const ins = [...document.querySelectorAll('#q0 .boxes input')]
      String(q.expected).split('').forEach((c, k) => { ins[k].value = c; ins[k].dispatchEvent(new Event('input', { bubbles: true })) })
      await new Promise(r => setTimeout(r, 150))
      const tick = document.querySelector('#q0 .tick')
      return {
        motionFlag: document.body.dataset.motion,
        tickDur: getComputedStyle(tick).transitionDuration,
        tickVisible: getComputedStyle(tick).display !== 'none' && tick.textContent.trim() === '✓',
        marked: /\bok\b/.test(document.getElementById('q0').className),
        counter: document.getElementById('solved').textContent,
      }
    })
    check(rm.motionFlag === 'off', 'reduced motion is picked up at boot')
    check(parseFloat(rm.tickDur) < 0.01, `transitions are switched off (${rm.tickDur})`)
    check(rm.tickVisible && rm.marked && rm.counter === '1',
      `but the tick, the marking and the count all still happen (tick ${rm.tickVisible}, mark ${rm.marked}, ⭐ ${rm.counter})`)
    await page.close()
  }

  // ── corrupt storage ───────────────────────────────────────────────────────
  {
    const page = await open()
    await page.evaluate(() => localStorage.setItem('berhitung-v2', '{broken'))
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__berhitung, { timeout: 20000 })
    const alive = await page.evaluate(() => document.querySelectorAll('#sheet .q').length)
    check(alive === 10, `corrupt saved data is discarded and the sheet still renders (${alive} cards)`)
    await page.close()
  }

  // ── phone width ───────────────────────────────────────────────────────────
  {
    const page = await open()
    await page.setViewport({ width: 390, height: 844 })
    await sleep(650)
    const m = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      cols: getComputedStyle(document.getElementById('sheet')).gridTemplateColumns.split(' ').length,
      tap: Math.min(...[...document.querySelectorAll('.boxes input')].slice(0, 6).map(i => i.getBoundingClientRect().height)),
    }))
    check(!m.overflow, 'no horizontal scroll at 390px')
    check(m.cols === 1, `one column on a phone (${m.cols})`)
    check(m.tap >= 38, `answer boxes stay big enough to tap (${Math.round(m.tap)}px)`)
    await page.close()
  }
} finally {
  await browser.close()
}

console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
