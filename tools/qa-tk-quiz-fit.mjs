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
for (const [w, h] of (process.env.QA_ROT_ONLY || process.env.QA_PROP_ONLY ? [] : SIZES)) {
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
            // tablets (owner photo 2026-09-29): Arabic >= 40 px, transliteration / words >= 18 px
            if (vw >= 1000 && innerHeight >= 700) {
              if (t.classList.contains('tkq-ar') && fs < 43.5) bad.push(`Arabic "${lab}" ${fs}px < 44 on a tablet`)
              else if (!t.classList.contains('tkq-ar') && fs < 17.5 && !b.classList.contains('brk')) bad.push(`label "${lab}" ${fs}px < 18 on a tablet`)
            }
          }
          for (let j = i + 1; j < bs.length; j++) {
            const o = R[j]
            if (r.left < o.right - 1 && o.left < r.right - 1 && r.top < o.bottom - 1 && o.top < r.bottom - 1) bad.push(`buttons "${lab}" and "${(bs[j].getAttribute('data-c') || '').slice(0, 24)}" overlap`)
          }
        })
        // owner 2026-09-29 "tulisan arabnya terlalu kecil": the asked Arabic word is the card's hero, answers >= 44 px
        // (a phone on its side, ~390 px tall, may step a long two-word Arabic answer down to 34 px so all four fit)
        const arMin = innerHeight < 500 ? 33.5 : 43.5
        bs.forEach(b => { const a = b.querySelector('.tkq-ar'); if (a && parseFloat(getComputedStyle(a).fontSize) < arMin) bad.push(`Arabic answer ${parseFloat(getComputedStyle(a).fontSize)}px < ${Math.ceil(arMin)}`) })
        const tab = vw >= 1000 && innerHeight >= 700
        const pa = document.querySelector('.tkq-scene .tkq-arw .tkq-ar'), pt = document.querySelector('.tkq-scene .tkq-arw .tkq-tr')
        if (pa && getComputedStyle(document.querySelector('.tkq-scene')).display !== 'none') {
          const f = parseFloat(getComputedStyle(pa).fontSize), ft = pt ? parseFloat(getComputedStyle(pt).fontSize) : 99
          if (f < (tab ? 79.5 : 55.5)) bad.push(`asked Arabic word ${f}px < ${tab ? 80 : 56}`)
          if (ft < (tab ? 21.5 : 15.5)) bad.push(`transliteration ${ft}px < ${tab ? 22 : 16}`)
        }
        if (tab && mode !== 'challenge') bs.forEach(b => { const im = b.querySelector('img:not(.ck img)'); if (im && im.getBoundingClientRect().height < 87.5) bad.push(`picture answer ${Math.round(im.getBoundingClientRect().height)}px < 88`) })
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
for (const [w0, h0, w1, h1] of (process.env.QA_PROP_ONLY ? [] : CASES)) {
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
      // landscape tablet (owner 2026-09-29): compact answers under a big picture — picture + answers fill the card
      const scn = document.querySelector('.tkq-scene'), scH = scn && getComputedStyle(scn).display !== 'none' ? scn.getBoundingClientRect().height : 0
      const used = kind !== 'sort' && wide && !short ? zone.height + scH : zone.height
      if (!short && used < card.height * (kind !== 'sort' && wide ? 0.3 : 0.45)) bad.push(`answers${kind !== 'sort' && wide ? ' + picture' : ''} use only ${Math.round(used / card.height * 100)} % of the card height`)
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

/* proportions at 1280x800 (owner photo 2026-09-29 "tidak proporsional"): counting math, text Islam, picture Arab,
   in the quiz AND the challenge overlay. The picture takes >= 30 % of the card, answers are compact (<= 130 px),
   Timmy and the Kapten (the old captain, not the penguin) stand >= 35 % of the viewport high beside the card. */
for (const [w, h] of [[1280, 800], [1340, 800], [1024, 768]]) for (const [kind, id] of [['math', null], ['islam', 'is-01'], ['arab', 'ar-pw-05'], ['arab-word', 'ar-wp-01']]) for (const chal of [false, true]) {
  const p = await browser.newPage(), errs = []
  p.on('pageerror', e => errs.push(e.message))
  await p.setViewport({ width: w, height: h })
  await p.goto(BASE, { waitUntil: 'networkidle0', timeout: 60000 })
  const r = await p.evaluate(async (id, chal) => {
    await document.fonts.ready
    window.__tk.ctl.destroy(); const host = document.getElementById('host'); host.innerHTML = ''
    const q = id ? { ...TKQuestions.items.find(x => x.id === id) } : TKQuiz.make('matematika', 1, TKQuiz.rng(4), { kind: 'add', world: 'titanic' })
    q.choices = q.choices.slice()
    if (chal) TKQuiz.challenge(host, { question: q, reducedMotion: true, sound: false })
    else TKQuiz.mount(host, [q], { topInset: 70, reducedMotion: true, sound: false })
    await new Promise(r => setTimeout(r, 900))
    const bad = [], vh = innerHeight, R = s => { const e = document.querySelector(s); return e && e.getBoundingClientRect() }
    const card = R('.tkq-card'), sc = document.querySelector('.tkq-scene'), scr = sc.getBoundingClientRect()
    if (getComputedStyle(sc).display !== 'none' && scr.height < card.height * 0.3) bad.push(`picture ${Math.round(scr.height / card.height * 100)} % of the card`)
    document.querySelectorAll('.tkq-opt').forEach(b => { if (b.getBoundingClientRect().height > (b.querySelector('img') ? 152.5 : 130.5)) bad.push('answer ' + Math.round(b.getBoundingClientRect().height) + ' px tall') })
    const tim = [...document.querySelectorAll('img')].find(i => i.alt === 'Timmy'), cap = [...document.querySelectorAll('img')].find(i => i.alt === 'Kapten')
    for (const [n, im] of [['Timmy', tim], ['Kapten', cap]]) {
      if (!im) { bad.push(n + ' missing'); continue }
      const b = im.getBoundingClientRect()
      if (b.height < vh * 0.35) bad.push(`${n} ${Math.round(b.height / vh * 100)} % of the viewport height`)
      if (b.left < card.right - 1 && card.left < b.right - 1 && b.top < card.bottom - 1 && card.top < b.bottom - 1) bad.push(n + ' overlaps the card')
      if (b.left < -1 || b.right > innerWidth + 1 || b.bottom > vh + 1) bad.push(n + ' off-screen')
    }
    if (cap && !/captain/.test(cap.src)) bad.push('the Kapten is not the old captain: ' + cap.src)
    document.querySelectorAll('.tkq-bub').forEach(b => { const x = b.getBoundingClientRect(); if (x.width && x.left < card.right - 1 && card.left < x.right - 1 && x.top < card.bottom - 1 && card.top < x.bottom - 1) bad.push('speech bubble over the card') })
    return bad
  }, id, chal)
  const tag = `proportions ${w}x${h} ${kind}${chal ? ' challenge' : ''}`
  if (r.length || errs.length) { fails.push(`${tag}: ${r.concat(errs).join(' ; ')}`); console.log('  FAIL ' + tag + ': ' + r.concat(errs).join(' ; ')) }
  await p.close()
}
console.log('proportions: 24 cases')

/* Arabic listening items (owner tablet 2026-09-29 "tidak ada huruf arab, tidak ada suara"): SFX-only mode has no voice, so
   every listen item shows the Arabic word at the hero size (>= 80 px tablet / >= 56 px phone) with its transliteration
   (>= 22 / 16 px), the prompt is solvable by reading, no "Dengar: «" line remains, and the round speaker (>= 64 px)
   is there when the device has an Arabic voice (stubbed) and hidden when it has none. */
let lsnChecks = 0
for (const [w, h] of [[1280, 800], [1340, 800], [1024, 768], [390, 844], [844, 390]]) for (const voice of [true, false]) {
  const p = await browser.newPage(), errs = []
  p.on('pageerror', e => errs.push(e.message))
  await p.evaluateOnNewDocument(voice => {
    const vs = voice ? [{ lang: 'ar-SA', name: 'stub-ar', voiceURI: 'stub-ar' }] : [{ lang: 'id-ID', name: 'stub-id', voiceURI: 'stub-id' }]
    window.__spoken = []
    try { Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { getVoices: () => vs, speak: u => window.__spoken.push(u.text), cancel () {}, addEventListener () {} } }) } catch (e) {}
    window.SpeechSynthesisUtterance = function (t) { this.text = t }
  }, voice)
  await p.setViewport({ width: w, height: h, isMobile: w < 1000, hasTouch: w < 1000 })
  await p.goto(BASE, { waitUntil: 'networkidle0', timeout: 60000 })
  const r = await p.evaluate(async (voice) => {
    await document.fonts.ready
    const bad = [], tab = innerWidth >= 1000 && innerHeight >= 700, host = document.getElementById('host')
    const L = TKQuestions.items.filter(q => q.listen)
    if (!L.length) bad.push('no listening items in the bank')
    for (const q0 of L) {
      try { window.__tk.ctl && window.__tk.ctl.destroy() } catch (e) {}
      host.innerHTML = ''
      window.__tk.ctl = TKQuiz.mount(host, [{ ...q0, choices: q0.choices.slice() }], { topInset: 70, reducedMotion: true, sound: false })
      await new Promise(r => setTimeout(r, 120))
      const ar = document.querySelector('.tkq-scene .tkq-arw .tkq-ar'), tr = document.querySelector('.tkq-scene .tkq-arw .tkq-tr')
      if (!ar || !/[\u0600-\u06FF]/.test(ar.textContent)) { bad.push(q0.id + ': no Arabic script'); continue }
      const f = parseFloat(getComputedStyle(ar).fontSize), ft = tr ? parseFloat(getComputedStyle(tr).fontSize) : 0
      if (f < (tab ? 79.5 : 55.5)) bad.push(`${q0.id}: Arabic ${f}px < ${tab ? 80 : 56}`)
      if (ft < (tab ? 21.5 : 15.5)) bad.push(`${q0.id}: transliteration ${ft}px < ${tab ? 22 : 16}`)
      if (/Dengar:\s*«/.test(document.querySelector('.tkq').innerText)) bad.push(q0.id + ': "Dengar: «" text')
      if (/^Dengarkan,/.test(q0.prompt)) bad.push(q0.id + ': prompt needs audio')
      const b = document.querySelector('.tkq-arsay'), shown = b && !b.hidden && getComputedStyle(b).display !== 'none'
      if (voice && !shown) bad.push(q0.id + ': speaker hidden although an Arabic voice exists')
      if (!voice && shown) bad.push(q0.id + ': speaker shown without an Arabic voice')
      if (shown) {
        const bb = b.getBoundingClientRect(), ab = ar.getBoundingClientRect()
        if (Math.min(bb.width, bb.height) < 63.5) bad.push(`${q0.id}: speaker ${Math.round(bb.width)} px < 64`)
        if (bb.left < ab.right - 1 && ab.left < bb.right - 1 && bb.top < ab.bottom - 1 && ab.top < bb.bottom - 1) bad.push(q0.id + ': speaker over the Arabic word')
        if (bb.right > innerWidth + 1 || bb.left < -1) bad.push(q0.id + ': speaker off-screen')
        b.click(); if (window.__spoken[window.__spoken.length - 1] !== q0.listen) bad.push(q0.id + ': tap did not speak the word')
      }
      const card = document.querySelector('.tkq-card').getBoundingClientRect()
      if ((ar.getBoundingClientRect().top < card.top - 1 || ar.getBoundingClientRect().bottom > card.bottom + 1)) bad.push(q0.id + ': Arabic word outside the card')
    }
    return { bad, n: L.length }
  }, voice).catch(e => ({ bad: ['evaluate: ' + e.message.split('\n')[0]], n: 0 }))
  lsnChecks += r.n
  const tag = `listen ${w}x${h} voice=${voice}`
  if (r.bad.length || errs.length) { fails.push(`${tag}: ${r.bad.concat(errs).slice(0, 5).join(' ; ')}`); console.log('  FAIL ' + tag + ': ' + r.bad.concat(errs).slice(0, 5).join(' ; ')) }
  await p.close()
}
console.log(`listening items: ${lsnChecks} renders checked`)
await browser.close()
console.log(fails.length ? `qa-tk-quiz-fit: FAIL ${fails.length} (${checked} buttons checked)` : `PASS qa-tk-quiz-fit: ${checked} answer buttons fit at ${SIZES.length} sizes`)
process.exit(fails.length ? 1 : 0)
