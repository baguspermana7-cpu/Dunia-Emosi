// G28 Stinky & Dirty — play gate. Drives the REAL page with mouse/touch input.
//   A) every one of the 72 cards, RIGHT path: answer correctly -> check -> "good" state,
//      explanation shown, Lanjut available, result saved as right;
//   B) every card, LADDER path: wrong -> Hint 1 (help text + halo when the card has a
//      clue target) -> wrong -> Hint 2 (+ one wrong choice dimmed on 3+ choice cards) ->
//      wrong -> the answer is SHOWN and explained, Lanjut available (never a trap);
//   C) layout on every card: question + answer controls inside the viewport, controls
//      >= 48 px, answers never overlap the story box or the tool buttons;
//   D) one full session at volume zero from the home screen to "Petualangan selesai",
//      progress survives a reload, parent gate opens by the shape order.
// QA_SIZES="390x844,844x390" (default) · QA_ONLY=<regex of card ids>
import puppeteer from 'puppeteer'

const sleep = ms => new Promise(r => setTimeout(r, ms))
const fails = []
const check = (ok, msg) => { if (!ok) { fails.push(msg); console.log('❌ ' + msg) } }
const SIZES = (process.env.QA_SIZES || '390x844,844x390').split(',').map(s => s.split('x').map(Number))
const ONLY = process.env.QA_ONLY ? new RegExp(process.env.QA_ONLY) : null
const URL = 'http://localhost:8081/games/stinky-dirty.html'
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })

async function open (w, h) {
  const p = await b.newPage()
  await p.setViewport({ width: w, height: h, isMobile: true, hasTouch: true })
  const errs = []
  p.on('pageerror', e => errs.push(e.message))
  p.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) errs.push(r.status() + ' ' + r.url()) })
  const cdp = await p.target().createCDPSession(); await cdp.send('Network.setBypassServiceWorker', { bypass: true })
  for (const t of [45000, 120000]) { try { await p.goto(URL, { waitUntil: 'networkidle2', timeout: t }); break } catch (_) {} }
  await p.evaluate(() => { __sd.set('rm', true); __sd.set('voice', false); __sd.reset() })   // fast + silent (volume zero)
  return { p, errs }
}
async function tapSel (p, sel) {
  const r = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; e.scrollIntoView({ block: 'nearest' }); const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 } }, sel)
  if (!r) return false
  await p.mouse.click(r.x, r.y); await sleep(60); return true
}
async function waitReady (p) {
  for (let i = 0; i < 120; i++) { const s = await p.evaluate(() => __sd.state()); if (s.locked === false) return true; await sleep(100) }
  return false
}
async function answer (p, card, right) {
  const a = card.answer, n = (card.options || []).length
  switch (card.archetype) {
    case 'choice': case 'image': {
      const pick = right ? a : (await p.evaluate(() => [...document.querySelectorAll('#answers .opt')].filter(o => !o.disabled).map(o => +o.dataset.i))).find(i => i !== a)
      await tapSel(p, `#answers .opt[data-i="${pick}"]`); break
    }
    case 'multi': for (const i of (right ? a : [[...Array(n).keys()].find(i => !a.includes(i))])) await tapSel(p, `#answers .opt[data-i="${i}"]`); break
    case 'sequence': for (const i of (right ? a : a.slice().reverse())) await tapSel(p, `#answers .opt[data-i="${i}"]`); break
    case 'match': for (let l = 0; l < a.length; l++) { await tapSel(p, `#answers .opt[data-i="L${l}"]`); await tapSel(p, `#answers .opt[data-i="R${right ? a[l] : a[(l + 1) % a.length]}"]`) } break
    case 'find': await tapSel(p, `.el[aria-label="${right ? a : card.targets.find(t => t !== a)}"]`); break
    case 'count': for (const d of String(right ? a : a + 1)) await tapSel(p, `#answers [data-n="${d}"]`); break
    case 'drag': {
      const items = right ? a : [[...Array(n).keys()].find(i => !a.includes(i))]
      for (const i of items) { await tapSel(p, `#tray .opt[data-i="${i}"]`); await tapSel(p, '#basket') }
      break
    }
  }
}
const st = p => p.evaluate(() => ({ s: __sd.state(), help: document.getElementById('help').textContent, next: !document.getElementById('btn-next').classList.contains('hide'),
  check: !document.getElementById('btn-check').disabled, dim: document.querySelectorAll('#answers .opt.dim').length, halo: document.querySelectorAll('.el.halo').length,
  helpHint: document.getElementById('help').classList.contains('help-hint'),
  good: document.querySelectorAll('#answers .opt.good, .el.right').length + (document.getElementById('count-show') ? 1 : 0) + (document.querySelectorAll('#inb img').length ? 1 : 0),
  banner: document.getElementById('banner').className }))

try {
  for (const [w, h] of SIZES) {
    const tag = `${w}x${h}`
    const { p, errs } = await open(w, h)
    const cards = await p.evaluate(() => SDCards.CARDS)
    // journey stops are true circles and every sheet screen fits (owner: "bulatan progressnya aneh" — ovals)
    for (const w of ['listening', 'math']) {
      await p.evaluate(k => __sd.openWorld(k), w); await sleep(250)
      const j = await p.evaluate(() => ({ round: [...document.querySelectorAll('.stop')].every(e => { const b = e.getBoundingClientRect(); return Math.abs(b.width - b.height) < 1.5 && b.width >= 24 }),
        n: document.querySelectorAll('.stop').length, fits: (() => { const b = document.getElementById('world-sheet').getBoundingClientRect(); return b.top >= -1 && b.bottom <= innerHeight + 1 })() }))
      check(j.n === 12 && j.round, `${tag} ${w}: 12 journey stops, all true circles`)
      check(j.fits, `${tag} ${w}: world sheet fits the screen`)
    }
    let n = 0
    for (const card of cards) {
      if (ONLY && !ONLY.test(card.id)) continue
      n++
      const id = `${tag} ${card.id} (${card.archetype})`
      // ── right path + layout
      await p.evaluate(i => __sd.playOnly(i), card.id)
      check(await waitReady(p), `${id}: question becomes answerable`)
      const lay = await p.evaluate(() => {
        const R = e => e.getBoundingClientRect(), vw = innerWidth, vh = innerHeight
        const ctl = [...document.querySelectorAll('#answers .opt, #answers .el, .el.target')].filter(e => getComputedStyle(e).visibility !== 'hidden')
        const story = R(document.getElementById('story')), tools = R(document.getElementById('tools')), q = R(document.getElementById('q'))
        const hit = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1
        const ansCtl = [...document.querySelectorAll('#answers .opt')]
        return {
          // a scene target's hit box includes its 16px ::after ring (pseudo-elements take the element's clicks)
          small: ctl.filter(e => { const r = R(e), pad = e.classList.contains('target') ? 32 : 0; return r.width + pad < 48 || r.height + pad < 48 }).length,
          scrollAns: document.getElementById('answers').scrollHeight > document.getElementById('answers').clientHeight + 2,
          off: ctl.concat([document.getElementById('btn-check'), document.getElementById('btn-hint')]).filter(e => { const r = R(e); return r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1 }).length,
          overlap: ansCtl.filter(e => hit(R(e), story) || hit(R(e), tools) || hit(R(e), q)).length,
          qOn: document.getElementById('q').classList.contains('on'),
          scroll: document.documentElement.scrollWidth > vw + 1
        }
      })
      check(lay.qOn, `${id}: question shown`)
      check(lay.small === 0, `${id}: ${lay.small} answer controls smaller than 48px`)
      check(lay.off === 0, `${id}: ${lay.off} controls off screen`)
      check(lay.overlap === 0, `${id}: ${lay.overlap} answers overlap the story/question/tools`)
      check(!lay.scrollAns, `${id}: all answers fit without scrolling`)
      check(!lay.scroll, `${id}: no horizontal scroll`)
      check(!(await st(p)).check, `${id}: Periksa disabled before an answer`)
      await answer(p, card, true)
      check((await st(p)).check, `${id}: Periksa enabled after answering`)
      await tapSel(p, '#btn-check'); await sleep(150)
      let s1 = await st(p)
      check(s1.next && /good/.test(s1.banner) && s1.help.length > 5, `${id}: right answer -> "good" + explanation + Lanjut (${s1.banner})`)
      await tapSel(p, '#btn-next'); await sleep(150)
      const prog = await p.evaluate(i => __sd.progress().hist[i], card.id)
      check(prog && prog.right === 1, `${id}: saved as right`)

      // ── ladder path
      await p.evaluate(i => __sd.playOnly(i), card.id)
      await waitReady(p)
      for (let k = 1; k <= 3; k++) {
        await answer(p, card, false)
        const ready = (await st(p)).check
        if (!ready) { check(false, `${id}: a wrong answer can be submitted (attempt ${k})`); break }
        await tapSel(p, '#btn-check'); await sleep(150)
        const s = await st(p)
        if (k === 1) {
          check(/again/.test(s.banner) && s.helpHint && !s.next, `${id}: wrong #1 -> "Ayo lihat lagi" + hint 1, still answering`)
          if (card.hintTarget && card.archetype !== 'find' && !card.hintTarget.startsWith('path')) check(s.halo > 0, `${id}: hint 1 puts a halo on the clue`)
          check(!/salah/i.test(s.help + s.banner), `${id}: never says "salah"`)
        }
        if (k === 2) {
          check(s.help.includes(card.hints[1]) && !s.next, `${id}: wrong #2 -> hint 2`)
          if ((card.archetype === 'choice' || card.archetype === 'image') && card.options.length >= 3) check(s.dim === 1, `${id}: hint 2 dims one wrong choice (${s.dim})`)
        }
        if (k === 3) check(s.next && s.good > 0 && s.help.includes(card.explain), `${id}: wrong #3 -> answer shown + explained + Lanjut (never a trap)`)
      }
      await tapSel(p, '#btn-next'); await sleep(120)
    }
    console.log(`${tag}: ${n} cards x 2 paths driven`)
    check(errs.length === 0, `${tag}: no page errors / 404s${errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''}`)
    await p.close()
  }

  // ── D: full session from home, volume zero, reload persistence, parent gate
  if (!ONLY) {
    const { p, errs } = await open(390, 844)
    await tapSel(p, '#btn-start'); await sleep(300)
    await tapSel(p, '#btn-session'); await sleep(300)
    await tapSel(p, '#btn-go'); await sleep(200)
    const cards = await p.evaluate(() => { const s = __sd.state(); return s.cards.map(id => SDCards.find(id)) })
    check(cards.length === 5, `session: 5 cards (${cards.length})`)
    for (const c of cards) {
      await waitReady(p); await answer(p, c, true); await tapSel(p, '#btn-check'); await sleep(150); await tapSel(p, '#btn-next'); await sleep(250)
    }
    await sleep(400)
    const done = await p.evaluate(() => ({ scr: __sd.state().screen, sub: document.getElementById('d-sub').textContent }))
    check(done.scr === 'scr-done' && /5 dari 5/.test(done.sub), `session: ends on "Petualangan selesai" with 5/5 (${done.scr}: ${done.sub})`)
    const before = await p.evaluate(() => Object.keys(__sd.progress().hist).length)
    await p.reload({ waitUntil: 'networkidle2' })
    const after = await p.evaluate(() => Object.keys(__sd.progress().hist).length)
    check(before === 5 && after === 5, `progress survives a reload (${before} -> ${after})`)
    await tapSel(p, '#btn-parent'); await sleep(200)
    for (const k of ['c', 't', 's']) await tapSel(p, `#gate-shapes [data-k="${k}"]`)
    await sleep(200)
    check(await p.evaluate(() => document.getElementById('ov-parent').classList.contains('show')), 'parent gate opens with circle → triangle → square')
    check(errs.length === 0, `session: no page errors${errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''}`)
    await p.close()
  }
} finally { await b.close() }
console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
