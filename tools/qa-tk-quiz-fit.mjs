// G30 Timmy & Kapal Legendaris — TKQuiz answer-fit gate (games/tk-quiz.js).
// Owner tablet photo 2026-09-28: "Alhamdulillah" / "Wa'alaikumussalam" spilled out of their buttons in a 4-up row.
// Mounts EVERY question of the bank (TKQuestions.items) plus a sample of generated math questions, in three modes
// (normal · easy (3 choices) · challenge card), at 1280x800, 1024x768, 800x1280, 390x844 and 844x390, and asserts
// for every answer button:
//   - each label stays inside its button (scrollWidth <= clientWidth + 1, box inside the button box);
//   - the button itself does not overflow (scrollWidth / scrollHeight <= client + 1);
//   - no two answer buttons overlap; every button is inside the viewport horizontally;
//   - label font >= 16 px (the fit floor) unless the label had to break.
// QA_ROT_ONLY=1 runs only the rotate / owner-size step. Needs the dev server on :8081 (python3 -m http.server 8081). QA_SIZES="1280x800,..." limits sizes.
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const puppeteer = require('puppeteer')
const BASE = process.env.QA_URL || 'http://localhost:8081/tools/tk-harness-quiz.html?set=ladder'
const SIZES = (process.env.QA_SIZES || '1280x800,1024x768,800x1280,390x844,844x390').split(',').map(s => s.split('x').map(Number))
const fails = []
let checked = 0

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 900000 })
for (const [w, h] of (process.env.QA_ROT_ONLY ? [] : SIZES)) {
  const p = await browser.newPage()
  const errs = []
  p.on('pageerror', e => errs.push(e.message))
  await p.setViewport({ width: w, height: h, isMobile: w < 1000, hasTouch: w < 1000 })
  await p.goto(BASE, { waitUntil: 'networkidle0', timeout: 60000 })
  const r = await p.evaluate(async () => {
    await document.fonts.ready
    const host = document.getElementById('host'), out = [], vw = innerWidth
    const raf = () => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)))
    const rng = TKQuiz.rng(3)
    const qs = TKQuestions.items.filter(q => q.choices && !q.letters).map(q => ({ ...q, choices: q.choices.slice() }))
    ;['add', 'sub', 'count', 'groups', 'clock', 'twostep', 'diff', 'share'].forEach(k => { for (let lv = 1; lv <= 4; lv++) { try { qs.push(TKQuiz.make('matematika', lv, rng, { kind: k })) } catch (e) {} } })
    const modes = [['normal', { easy: false }], ['easy', { easy: true, grade: 'kelas1' }], ['challenge', { easy: false, challenge: true }]]
    let n = 0
    for (const [mode, extra] of modes) {
      for (const q of qs) {
        try { window.__tk.ctl && window.__tk.ctl.destroy() } catch (e) {}
        host.innerHTML = ''
        window.__tk.ctl = TKQuiz.mount(host, [{ ...q, choices: q.choices.slice() }], { topInset: 70, reducedMotion: true, sound: false, hints: true, ...extra })
        await raf()
        const bs = [...document.querySelectorAll('.tkq-ans .tkq-opt')]
        n += bs.length
        const bad = []
        const R = bs.map(b => b.getBoundingClientRect())
        bs.forEach((b, i) => {
          const r = R[i], lab = (b.getAttribute('data-c') || '').slice(0, 24)
          if (b.scrollWidth > b.clientWidth + 1 || b.scrollHeight > b.clientHeight + 1) bad.push(`button "${lab}" overflows (${b.scrollWidth}x${b.scrollHeight} > ${b.clientWidth}x${b.clientHeight})`)
          if (r.left < -1 || r.right > vw + 1) bad.push(`button "${lab}" off-screen x ${Math.round(r.left)}..${Math.round(r.right)}`)
          const cd = b.closest('.tkq-card').getBoundingClientRect()
          if (r.bottom > cd.bottom + 1 || r.top < cd.top - 1) bad.push(`button "${lab}" clipped by the card`)
          for (const t of b.children) {
            if (t.tagName !== 'SPAN' || /\b(ck|ear)\b/.test(t.className)) continue
            const tr = t.getBoundingClientRect(), fs = parseFloat(getComputedStyle(t).fontSize)
            if (t.scrollWidth > t.clientWidth + 1) bad.push(`label "${lab}" wider than its box (${t.scrollWidth} > ${t.clientWidth})`)
            if (tr.left < r.left - 1 || tr.right > r.right + 1 || tr.top < r.top - 1 || tr.bottom > r.bottom + 1) bad.push(`label "${lab}" outside its button`)
            if (fs < 15.5 && !b.classList.contains('brk') && !t.classList.contains('tkq-tr')) bad.push(`label "${lab}" font ${fs}px < 16`)
          }
          for (let j = i + 1; j < bs.length; j++) {
            const o = R[j]
            if (r.left < o.right - 1 && o.left < r.right - 1 && r.top < o.bottom - 1 && o.top < r.bottom - 1) bad.push(`buttons "${lab}" and "${(bs[j].getAttribute('data-c') || '').slice(0, 24)}" overlap`)
          }
        })
        if (bad.length) out.push(`${mode} ${q.id || q.kind || '?'}: ${bad.slice(0, 3).join(' ; ')}`)
      }
    }
    return { out, n, qs: qs.length }
  })
  checked += r.n
  console.log(`${w}x${h}: ${r.qs} questions x 3 modes, ${r.n} buttons, ${r.out.length} failing`)
  r.out.slice(0, 12).forEach(f => console.log('  FAIL ' + f))
  r.out.forEach(f => fails.push(`${w}x${h} ${f}`))
  errs.forEach(e => fails.push(`${w}x${h} pageerror ${e}`))
  await p.close()
}

/* rotate mid-question + every owner size (2026-09-29 "truly responsive"): one 4-choice word question, one
   3-choice picture question and a sort set, mounted at A then the viewport rotated to B. Asserts the layout
   class follows the frame, the answers still fit / do not overlap, nothing is off-screen, and the answers
   (or the sort bins) take most of the card's free height (fill the frame). */
const ROT = [[390, 844, 844, 390], [1280, 800, 800, 1280], [844, 390, 390, 844], [800, 1280, 1280, 800]]
const EXTRA = [[360, 640], [412, 915], [915, 412], [768, 1024], [1340, 800], [1920, 1080]]
const CASES = ROT.concat(EXTRA.map(([w, h]) => [w, h, w, h]))
let rotChecks = 0
for (const [w0, h0, w1, h1] of CASES) {
  for (const kind of ['words', 'pics', 'sort']) {
    const p = await browser.newPage(), errs = []
    p.on('pageerror', e => errs.push(e.message))
    await p.setViewport({ width: w0, height: h0, isMobile: w0 < 1000, hasTouch: w0 < 1000 })
    await p.goto(BASE.replace(/set=\w+/, kind === 'sort' ? 'set=sort' : 'set=ladder'), { waitUntil: 'networkidle0', timeout: 60000 })
    if (kind !== 'sort') {
      await p.evaluate(kind => {
        const q = kind === 'words' ? TKQuestions.items.find(x => x.id === 'is-04') : TKQuestions.items.find(x => x.choices.length === 3 && x.pics) || TKQuestions.items.find(x => x.pics)
        window.__tk.ctl.destroy(); const host = document.getElementById('host'); host.innerHTML = ''
        window.__tk.ctl = TKQuiz.mount(host, [{ ...q, choices: q.choices.slice() }], { topInset: 70, reducedMotion: true, sound: false })
      }, kind)
    }
    await new Promise(r => setTimeout(r, 400))
    // same isMobile on both sides: toggling it makes puppeteer reload the page (a real rotation keeps the page)
    if (w1 !== w0) { await p.setViewport({ width: w1, height: h1, isMobile: w0 < 1000, hasTouch: w0 < 1000 }); await new Promise(r => setTimeout(r, 600)) }
    const r = await p.evaluate(kind => {
      const bad = [], vw = innerWidth, vh = innerHeight, root = document.querySelector('.tkq')
      const wide = root.clientWidth > root.clientHeight * 1.15
      if (root.classList.contains('tkq-wide') !== wide) bad.push('layout class ' + root.className + ' does not follow the frame')
      for (const e of document.querySelectorAll('.tkq-card, .tkq-foot, .tkq-next, .tkq-opt, .tkq-bin, .tkq-item')) {
        const b = e.getBoundingClientRect(); if (!b.width) continue
        if (b.left < -1 || b.top < -1 || b.right > vw + 1 || b.bottom > vh + 1) bad.push(e.className.split(' ').pop() + ' off-screen ' + [b.left, b.top, b.right, b.bottom].map(Math.round))
      }
      const bs = [...document.querySelectorAll('.tkq-opt')], R = bs.map(b => b.getBoundingClientRect())
      const cr = document.querySelector('.tkq-card').getBoundingClientRect()
      bs.forEach((b, i) => {
        if (b.scrollWidth > b.clientWidth + 1 || b.scrollHeight > b.clientHeight + 1) bad.push('answer overflows ' + b.dataset.c)
        if (R[i].bottom > cr.bottom + 1 || R[i].top < cr.top - 1) bad.push('answer clipped by the card ' + b.dataset.c)
        for (let j = i + 1; j < bs.length; j++) { const o = R[j], a = R[i]; if (a.left < o.right - 1 && o.left < a.right - 1 && a.top < o.bottom - 1 && o.top < a.bottom - 1) bad.push('answers overlap') }
      })
      const card = document.querySelector('.tkq-card').getBoundingClientRect()
      const zone = document.querySelector(kind === 'sort' ? '.tkq-sortbody' : '.tkq-ans').getBoundingClientRect()
      const short = root.classList.contains('tkq-short')
      if (document.querySelector('.tkq-ans') && !document.querySelector('.tkq-ans .tkq-opt') && kind !== 'sort') bad.push('no answers after rotation (page reloaded?)')
      if (!short && zone.height < card.height * 0.45) bad.push(`answers use only ${Math.round(zone.height / card.height * 100)} % of the card height`)
      if (card.width < root.clientWidth * (wide ? 0.45 : 0.85)) bad.push(`card only ${Math.round(card.width)} px wide of ${root.clientWidth}`)
      return bad
    }, kind)
    rotChecks++
    const tag = `rotate ${w0}x${h0}${w1 !== w0 ? ' -> ' + w1 + 'x' + h1 : ''} ${kind}`
    if (r.length || errs.length) { fails.push(`${tag}: ${r.concat(errs).slice(0, 4).join(' ; ')}`); console.log('  FAIL ' + tag + ': ' + r.concat(errs).slice(0, 4).join(' ; ')) }
    await p.close()
  }
}
console.log(`rotate / owner sizes: ${rotChecks} cases`)
await browser.close()
console.log(fails.length ? `qa-tk-quiz-fit: FAIL ${fails.length} (${checked} buttons checked)` : `PASS qa-tk-quiz-fit: ${checked} answer buttons fit at ${SIZES.length} sizes`)
process.exit(fails.length ? 1 : 0)
