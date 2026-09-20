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

async function open (clear = true) {
  const page = await browser.newPage()
  const cdp = await page.createCDPSession()
  await cdp.send('Network.setBypassServiceWorker', { bypass: true })
  page.on('pageerror', e => { throw new Error('page error: ' + e.message) })
  await page.setViewport({ width: 1400, height: 950 })
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForFunction(() => !!window.__berhitung, { timeout: 20000 })
  if (clear) {
    await page.evaluate(() => localStorage.clear())
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__berhitung, { timeout: 20000 })
  }
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
    await sleep(300)
    const p2 = await page.evaluate(() => __berhitung.session.questions.map(q => q.signature).join('|'))
    check(p2 !== p1, 'the next page is a different set of questions')
    await page.evaluate(() => document.getElementById('pg-prev').click())
    await sleep(300)
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
    await sleep(300)
    const repeated = await sigs()
    const cleared = await page.evaluate(() => [...document.querySelectorAll('#q0 .boxes input')].map(i => i.value).join(''))
    check(repeated === first, 'Ulangi Halaman gives back the same ten questions')
    check(cleared === '', 'and clears what was written on them')
    await page.evaluate(() => document.getElementById('btn-new').click())
    await sleep(300)
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
      await sleep(250)
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
    await sleep(250)
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
    await page.keyboard.press('Enter')
    const moved = await page.evaluate(() => document.activeElement.closest('.q') && document.activeElement.closest('.q').id)
    check(moved === 'q1', `Enter moves to the next question (${moved})`)
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
    await sleep(400)
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
