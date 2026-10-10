// G31 chase UI gate: the pre-race picker (games/mojo-chase-picker.js) + the "Kotak Soal" card (games/mojo-chase-quiz.js).
//   node tools/qa-mojo-chase-ui.mjs        (needs the local server on :8081)
// H headless: quiz frequency limits over 50 seeded chases, question validity (3 distinct choices with the answer).
// P picker in a real chase: shown before the countdown, the choice drives the in-race sprite, persists per avatar,
//   Mulai starts the countdown within 300 ms.
// Q quiz in a real chase: a forced quiz hit pauses (prog + timer frozen 3 s, Pause disabled, backgrounding keeps
//   the card), a right answer resumes after "Siap? Jalan!" with +2 stars, two wrong answers never fail.
// F fit: picker + card on 360x780, 412x915, 844x390, 1280x800 — inside the viewport, no overlapping boxes,
//   no clipped text, targets >= 56 px (carousel >= 72, answers >= 64).
// The page's own script tags are used when present; otherwise the gate injects the three files (pre-integration).
import puppeteer from 'puppeteer'
import fs from 'node:fs'
import path from 'node:path'
const root = path.resolve(import.meta.dirname, '..')
const BASE = process.env.QA_BASE || 'http://localhost:8081'
const url = BASE + '/games/mojo-swoptops.html?unlock=1&chase=1'
const out = process.env.QA_SHOTS || '/tmp/mojo-chase-ui-qa'; fs.mkdirSync(out, { recursive: true })
const SIZES = [[360, 780], [412, 915], [844, 390], [1280, 800]]
const sleep = ms => new Promise(r => setTimeout(r, ms))
const issues = []; let passed = 0
function check (ok, msg) { if (ok) passed++; else { issues.push(msg); console.error('FAIL', msg) } }
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/u

/* ── H. headless ─────────────────────────────────────────────────────────────────────────────── */
globalThis.window = globalThis
;(0, eval)(fs.readFileSync(path.join(root, 'games/mojo-chase-quiz.js'), 'utf8'))
const Q = globalThis.MojoChaseQuiz
{
  let bad = [], counts = { 1: 0, 2: 0 }
  for (let seed = 1; seed <= 50; seed++) { const r = Q.sim(seed, 75); if (r.bad.length) bad.push(seed + ':' + r.bad.join('/')); else counts[r.times.length]++ }
  check(bad.length === 0, `quiz frequency: 50 seeded chases keep 1-2 boxes, none before ${Q.LIMITS.first}s, >= ${Q.LIMITS.gap}s apart, none in capture range or at the lane event (${bad.slice(0, 3).join(' ') || 'ok'})`)
  check(counts[1] > 0 && counts[2] > 0, `quiz frequency: both 1 and 2 boxes occur (${counts[1]}/${counts[2]})`)
  // a short chase that reaches capture range early still never spawns inside it
  let early = 0; for (let seed = 1; seed <= 50; seed++) { const r = Q.sim(seed, 30); early += r.bad.filter(b => !/^count/.test(b)).length }
  check(early === 0, `quiz frequency: short chases never break the limits (${early})`)
  let qb = 0, seen = new Set(), dup = 0
  const r = Q.rng(11)
  for (let i = 0; i < 400; i++) {
    const q = Q.question(r), v = q.choices.map(c => c.v)
    if (v.length !== 3 || new Set(v).size !== 3 || !v.includes(q.answer) || EMOJI.test(q.text) || /\b(the|how|many|more)\b/i.test(q.text)) qb++
    if (i < 60) { if (seen.has(q.key)) dup++; seen.add(q.key) }
  }
  check(qb === 0, `quiz questions: 3 distinct choices with the answer, Indonesian, no emoji (${qb} bad of 400)`)
  check(dup === 0, `quiz questions: no repeats within a session (first 60: ${dup})`)
}

/* ── browser ─────────────────────────────────────────────────────────────────────────────────── */
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--ignore-gpu-blocklist', '--use-angle=vulkan', '--enable-gpu'] })
async function page (w, h, slot, p0) {
  const p = p0 || await browser.newPage()
  if (!p0) {
    await p.setBypassServiceWorker(true)
    await p.setViewport({ width: w, height: h, deviceScaleFactor: 1, hasTouch: w < 900, isMobile: w < 500 })
    const errors = []; p.on('pageerror', e => errors.push(String(e))); p.__errors = errors
  }
  await p.goto(url, { waitUntil: 'networkidle2' })
  // the game locks the avatar for the session at load: set the slot, then load again
  if (slot != null) { if (!p0) await p.evaluate(() => localStorage.clear()); await avatar(p, slot); await p.goto(url, { waitUntil: 'networkidle2' }) }
  await p.waitForFunction(() => window.MojoChaseMenu && window.MojoChase)
  if (!await p.evaluate(() => !!window.MojoChasePicker)) {
    await p.addStyleTag({ url: BASE + '/games/mojo-chase-ui.css' })
    await p.addScriptTag({ url: BASE + '/games/mojo-chase-picker.js' }); await p.addScriptTag({ url: BASE + '/games/mojo-chase-quiz.js' })
  }
  // keep the session api so a quiz hit can be forced through the real hook path
  await p.evaluate(() => {
    const H = MojoChase.hooks, b = H.beforeStart
    H.beforeStart = function (c, a) { window.__qaApi = a; return b(c, a) }
  })
  return p
}
async function avatar (p, slot) { await p.evaluate(s => { localStorage.setItem('dunia-players', JSON.stringify([{ animal: 'kucing', name: 'A' }, { animal: 'anjing', name: 'B' }])); localStorage.setItem('dunia-active-slot', JSON.stringify([s, 1])) }, slot) }
const st = p => p.evaluate(() => window.__mojoChase && __mojoChase.state())
async function waitState (p, fn, ms) { const t0 = Date.now(); let s; while (Date.now() - t0 < ms) { s = await st(p); if (s && fn(s)) return s; await sleep(100) } return s }
// fit audit: every box inside the viewport, no two boxes overlap, no clipped text, minimum target sizes
async function fit (p, sel, minT) {
  return p.evaluate((sel, minT) => {
    const vw = innerWidth, vh = innerHeight, bad = []
    const boxes = sel.map(s => [s, document.querySelector(s)]).filter(x => x[1]).map(([s, e]) => [s, e.getBoundingClientRect()])
    for (const [s, r] of boxes) { if (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1) bad.push('out ' + s + ' ' + [r.left, r.top, r.right, r.bottom].map(Math.round)); if (!r.width || !r.height) bad.push('empty ' + s) }
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i][1], b = boxes[j][1], ix = Math.min(a.right, b.right) - Math.max(a.left, b.left), iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
      if (ix > 2 && iy > 2) bad.push('overlap ' + boxes[i][0] + ' / ' + boxes[j][0])
    }
    document.querySelectorAll('.mcp b,.mcp span,.mcp h2,.mcp p,.mcp button,.mcq h2,.mcq p,.mcq button').forEach(e => {
      if (e.offsetParent && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 2) && getComputedStyle(e).overflow !== 'visible') bad.push('clip ' + e.className + ':' + e.textContent.slice(0, 20))
      if (e.offsetParent && e.tagName !== 'BUTTON' && e.scrollWidth > e.clientWidth + 1 && /mcp-(name|perk)|mcq-(q|say)/.test(e.className)) bad.push('clip ' + e.className)
    })
    for (const [s, m] of Object.entries(minT)) document.querySelectorAll(s).forEach(e => { const r = e.getBoundingClientRect(); if (r.height < m || r.width < m) bad.push('small ' + s + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)) })
    const pl = document.querySelector('.mcq-plank'); if (pl && pl.scrollHeight > pl.clientHeight + 2) bad.push('card scrolls ' + pl.scrollHeight + '>' + pl.clientHeight)
    const txt = (document.querySelector('.mcp') || document.querySelector('.mcq') || document.body).innerText
    if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(txt)) bad.push('emoji')
    return bad
  }, sel, minT)
}
const FAKE_API = () => { window.__fk = { paused: 0, resumed: 0, reward: null, cleared: 0 }; return { host: document.body, pause () { __fk.paused++ }, resume () { __fk.resumed++ }, reward (o) { __fk.reward = o }, clearAhead (s) { __fk.cleared = s } } }

try {
  /* ── F. fit on 4 viewports (stand-alone: picker on the pantai stage, the largest cards of each quiz kind) ── */
  for (const [w, h] of SIZES) {
    const p = await page(w, h)
    // the unlock celebration card first (a save that has only seen Mojo, 3 stages cleared -> 9 new forms on one card)
    await p.evaluate(() => { localStorage.removeItem('dunia-g31-chase'); avatarScopedSet('dunia-g31-chase', JSON.stringify({ v: 1, st: { pantai: { stars: 1, t: 1 }, kota: { stars: 1, t: 1 }, hutan: { stars: 1, t: 1 } }, formsSeen: ['racer'] })) })   // worst case: 9 forms in ONE card
    await p.evaluate(() => { window.__pk = MojoChasePicker.run(MojoChases.config('desa'), { host: document.body }) })
    await p.waitForSelector('.mcp-new-ok'); await sleep(450)
    const cb = await fit(p, ['.mcp-new .art', '.mcp-new h2', '.mcp-new p', '.mcp-new-ok'], { '.mcp-new-ok': 56 })
    check(cb.length === 0, `${w}x${h} unlock celebration fits: ${cb.slice(0, 4).join('; ') || 'ok'}`)
    const cov = await p.evaluate(() => { const r = document.querySelector('.mcp-new').getBoundingClientRect(); return r.left <= 1 && r.top <= 1 && r.right >= innerWidth - 1 && r.bottom >= innerHeight - 1 })
    check(cov, `${w}x${h} unlock celebration covers the whole picker`)
    if (w === 412) await p.screenshot({ path: `${out}/unlock-${w}.png` })
    while (await p.$('.mcp-new-ok')) { await p.click('.mcp-new-ok'); await sleep(120) }
    await sleep(300)
    const bad = await fit(p, ['.mcp-plank', '.mcp-rear', '.mcp-info', '.mcp-car', '.mcp-go'], { '.mcp-card': 72, '.mcp-nav': 56, '.mcp-go': 56 })
    check(bad.length === 0, `${w}x${h} picker fits: ${bad.slice(0, 4).join('; ') || 'ok'}`)
    const vis = await p.evaluate(() => { const c = document.querySelector('.mcp-card.on').getBoundingClientRect(), t = document.querySelector('.mcp-track').getBoundingClientRect(); return c.left >= t.left - 1 && c.right <= t.right + 1 })
    check(vis, `${w}x${h} picker: the selected form card is fully visible in the strip`)
    const gap = await p.evaluate(() => { const r = document.querySelector('.mcp-rear').getBoundingClientRect(), l = document.querySelector('.mcp-line').getBoundingClientRect(); return Math.round(r.bottom - r.height * 0.03 - l.top) })
    check(gap >= -12 && gap <= 2, `${w}x${h} picker: Mojo's wheels stand just behind the start line (${gap} px)`)
    const perk = await p.evaluate(() => ({ n: document.querySelector('.mcp-name').textContent, l: document.querySelector('.mcp-perk').textContent, hero: [...document.querySelectorAll('.mcp-card')].filter(c => { const f = MojoChases.form(c.dataset.form), i = c.querySelector('img'); return f && i.dataset.key === f.side && i.src.indexOf(f.side) >= 0 }).length, n0: document.querySelectorAll('.mcp-card').length }))
    check(perk.l.indexOf(perk.n + ':') !== 0 && perk.hero === perk.n0, `${w}x${h} picker: perk line without the name prefix, every card shows the table's SIDE art (${perk.l} / ${perk.hero} of ${perk.n0})`)
    if (w === 412 || w === 1280) await p.screenshot({ path: `${out}/picker-${w}.png` })
    await p.click('.mcp-go'); await p.evaluate(() => window.__pk)
    for (const kind of ['add', 'compare', 'sub']) {
      await p.evaluate(k => { const q = MojoChaseQuiz.question(MojoChaseQuiz.rng(3), k); if (k === 'add') { q.text = q.text.replace(/\d+/, '5').replace(/\d+ lagi/, '5 lagi'); q.groups[0].n = 5; q.groups[2].n = 5 } if (k === 'compare') { q.groups[0].n = 8; q.groups[2].n = 7 } if (k === 'sub') { q.groups[0].n = 10; q.groups[0].gone = 3 } MojoChaseQuiz.open({}, null, { q }) }, kind)
      await p.waitForSelector('.mcq-btn'); await sleep(450)
      await p.evaluate(() => { document.querySelector('.mcq-say').textContent = 'Jawabannya Kanan lebih banyak. Kamu sudah berusaha, ayo lanjut!' })
      const qb = await fit(p, ['.mcq-head', '.mcq-q', '.mcq-pics', '.mcq-say', '.mcq-ans'], { '.mcq-btn': 64 })
      check(qb.length === 0, `${w}x${h} quiz card (${kind}) fits: ${qb.slice(0, 4).join('; ') || 'ok'}`)
      if ((w === 412 || w === 1280) && kind === 'add') await p.screenshot({ path: `${out}/quiz-${w}.png` })
      await p.evaluate(() => { const m = document.querySelector('.mcq'); m.remove(); MojoChaseQuiz.__drop && MojoChaseQuiz.__drop() })
      await p.close().catch(() => {}); break   // one card per page: a fresh page per kind below
    }
    for (const kind of ['compare', 'sub']) {
      const p2 = await page(w, h)
      await p2.evaluate(k => { const q = MojoChaseQuiz.question(MojoChaseQuiz.rng(5), k); if (k === 'compare') { q.groups[0].n = 8; q.groups[2].n = 7 } else { q.groups[0].n = 10; q.groups[0].gone = 3 } MojoChaseQuiz.open({}, null, { q }) }, kind)
      await p2.waitForSelector('.mcq-btn'); await sleep(450)
      await p2.evaluate(() => { document.querySelector('.mcq-say').textContent = 'Jawabannya Kanan lebih banyak. Kamu sudah berusaha, ayo lanjut!' })
      const qb = await fit(p2, ['.mcq-head', '.mcq-q', '.mcq-pics', '.mcq-say', '.mcq-ans'], { '.mcq-btn': 64 })
      check(qb.length === 0, `${w}x${h} quiz card (${kind}) fits: ${qb.slice(0, 4).join('; ') || 'ok'}`)
      await p2.close()
    }
  }

  /* ── stand-alone quiz behaviour (fake api): wrong twice never fails, right rewards ─────────────── */
  {
    const p = await page(412, 915)
    await p.evaluate(`(${FAKE_API})()`).catch(() => {})
    await p.evaluate(fk => { window.__api = (0, eval)('(' + fk + ')')(); MojoChaseQuiz.open({}, __api, { kind: 'count' }) }, FAKE_API.toString())
    await p.waitForSelector('.mcq-btn')
    check(await p.evaluate(() => __fk.paused === 1), 'quiz: opening calls api.pause once')
    const wrong = await p.evaluate(() => { const a = String(MojoChaseQuiz.state().answer); return [...document.querySelectorAll('.mcq-btn')].map((b, i) => b.dataset.v === a ? -1 : i).filter(i => i >= 0) })
    await p.click(`.mcq-btn:nth-child(${wrong[0] + 1})`); await sleep(200)
    const s1 = await p.evaluate(() => ({ s: MojoChaseQuiz.state(), say: document.querySelector('.mcq-say').textContent }))
    check(s1.s.open && s1.s.phase === 'ask' && s1.s.tries === 1 && /Hampir/.test(s1.say), `quiz: first wrong answer gives a gentle hint and a retry (${s1.say})`)
    await p.click(`.mcq-btn:nth-child(${wrong[1] + 1})`); await sleep(200)
    const s2 = await p.evaluate(() => ({ s: MojoChaseQuiz.state(), say: document.querySelector('.mcq-say').textContent, shown: !!document.querySelector('.mcq-btn.show') }))
    check(s2.s.phase === 'shown' && s2.shown && /Jawabannya/.test(s2.say) && !/salah|gagal|kalah/i.test(s2.say), `quiz: after 2 tries the answer is shown kindly (${s2.say})`)
    await sleep(3600)
    const f = await p.evaluate(() => ({ fk: __fk, open: MojoChaseQuiz.state().open }))
    check(!f.open && f.fk.resumed === 1 && f.fk.cleared === 1.5 && !f.fk.reward, `quiz: after the answer is shown the chase resumes with the road cleared, no penalty (${JSON.stringify(f.fk)})`)
    await p.close()
  }

  /* ── U. progressive unlock ───────────────────────────────────────────────────────────────── */
  {
    const p = await page(412, 915, 0)
    const sched = await p.evaluate(() => {
      const S = MojoChases.STAGES, out = []
      for (let k = 0; k <= S.length; k++) {
        const st = {}; S.slice(0, k).forEach(s => { st[s.id] = { stars: 1, t: 1 } })
        const row = { k, unlocked: MojoChasePicker.available({ v: 1, st }, S[0]).unlocked.length, recOk: true, sel: [] }
        S.forEach(s => { const a = MojoChasePicker.available({ v: 1, st }, s), rec = MojoChasePicker.recommend(s).rec; if (a.selectable.indexOf(rec) < 0) row.recOk = false; row.sel.push(a.selectable.length) })
        out.push(row)
      }
      return { out, n: MojoChasePicker.FORMS.length, s1: MojoChasePicker.available({ v: 1, st: {} }, S[0]).selectable.length }
    })
    check(sched.s1 === 7, `unlock: stage 1 with nothing cleared offers 7 selectable forms (4 + the 3 turnaround forms) (${sched.s1})`)
    // owner 2026-10-04 "every level opens 2-3 characters": +2..3 per cleared stage until all are open
    // (2026-10-10: six new turnaround forms join the ladder at stages 2-4, so all are open after 4 stages)
    const u = sched.out.map(r => r.unlocked)
    check(u[0] === 7 && u.slice(1).every((n, i) => n === sched.n || (n - u[i] >= 2 && n - u[i] <= 3)) && u[4] === sched.n, `unlock: 7 at start, +2..3 per cleared stage, all ${sched.n} after 4 stages (${u.slice(0, 5).join(',')})`)
    check(sched.out.every((r, i) => i === 0 || r.unlocked >= sched.out[i - 1].unlocked), `unlock: the unlocked count grows monotonically (${sched.out.map(r => r.unlocked).join(',')})`)
    check(sched.out.filter(r => r.k >= sched.out.length - 6).every(r => r.unlocked === sched.n), `unlock: every form unlocked by the final stages (${sched.out.find(r => r.unlocked === sched.n).k} cleared of ${sched.out.length - 1})`)
    check(sched.out.every(r => r.recOk), 'unlock: the stage\'s recommended form is always selectable, at every progress level')
    // DOM: harbour stage with nothing cleared -> Truk Kargo as a "Baru!" trial; locked cards cannot be selected
    await p.evaluate(() => { window.__pk = MojoChasePicker.run(MojoChases.config('pelabuhan'), { host: document.body }) }); await p.waitForSelector('.mcp-go'); await sleep(400)
    const d = await p.evaluate(() => ({ n: MojoChasePicker.FORMS.length, sel: document.querySelectorAll('.mcp-card:not(.lock)').length, lock: document.querySelectorAll('.mcp-card.lock').length, trial: !!document.querySelector('.mcp-card[data-form="cargo"] em.new'), form: MojoChasePicker.state().form, hint: [...document.querySelectorAll('.mcp-card.lock b')].every(b => /^Selesaikan \d+ tahap lagi$/.test(b.textContent)) }))
    check(d.sel === 8 && d.lock === d.n - 8 && d.trial && d.form === 'cargo' && d.hint, `unlock: harbour stage at the start = 7 unlocked + the "Baru!" trial, 5 locked silhouettes with "Selesaikan N tahap lagi" (${JSON.stringify(d)})`)
    await p.evaluate(() => document.querySelector('.mcp-card.lock[data-form="jet"]').click()); await sleep(150)
    const lk = await p.evaluate(() => ({ form: MojoChasePicker.state().form, wig: document.querySelector('.mcp-card[data-form="jet"]').classList.contains('wiggle'), ask: document.querySelector('.mcp-ask').textContent }))
    check(lk.form === 'cargo' && lk.wig && /tahap lagi/.test(lk.ask), `unlock: tapping a locked card wiggles + hints and never selects it (${lk.ask})`)
    const seen = []
    for (let i = 0; i < 7; i++) { await p.click('.mcp-nav.next'); await sleep(470); seen.push(await p.evaluate(() => MojoChasePicker.state().form)) }
    const selIds = await p.evaluate(() => MojoChasePicker.state().selectable)
    check(seen.every(f => selIds.includes(f)), `unlock: the arrows skip locked forms (${seen.join(',')})`)
    await p.click('.mcp-go'); await p.evaluate(() => window.__pk)
    // per avatar: clearing 1 stage unlocks 3 forms at once -> ONE celebration card listing all three with their art, once
    await p.evaluate(() => { const sv = MojoChasePicker.readSave(); avatarScopedSet('dunia-g31-chase', JSON.stringify(Object.assign({}, sv, { st: { pantai: { stars: 1, t: 1 } } }))) })
    await page(412, 915, 0, p)
    await p.evaluate(() => { window.__pk = MojoChasePicker.run(MojoChases.config('pantai'), { host: document.body }) }); await p.waitForSelector('.mcp-go'); await sleep(400)
    const cel = []
    let celArt = null
    while (await p.$('.mcp-new-ok')) { cel.push(await p.$eval('.mcp-new h2', e => e.textContent)); if (!celArt) celArt = await p.evaluate(() => [...document.querySelectorAll('.mcp-new .art.many figure')].map(f => { const i = f.querySelector('img'), r = MojoChases.form(i.dataset.form); return { ok: !!r && i.getAttribute('src').indexOf(r.side) >= 0 && f.textContent.trim() === r.name } })); await p.click('.mcp-new-ok'); await sleep(150) }
    check(cel.length === 1 && /^Wujud baru terbuka: .+, .+ dan .+!$/.test(cel[0]) && celArt && celArt.length === 3 && celArt.every(a => a.ok), `unlock: 3 forms opened at once -> ONE celebration card naming all three, each with its side art (${cel.join(' | ')}; ${celArt && celArt.length} art)`)
    const s6 = await p.evaluate(() => MojoChasePicker.state().selectable.length)
    check(s6 === 10, `unlock: 1 stage cleared -> 10 selectable (${s6})`)
    await p.click('.mcp-go'); await p.evaluate(() => window.__pk)
    await page(412, 915, 1, p)
    await p.evaluate(() => { window.__pk = MojoChasePicker.run(MojoChases.config('pantai'), { host: document.body }) }); await p.waitForSelector('.mcp-go'); await sleep(300)
    const other = await p.evaluate(() => ({ n: MojoChasePicker.state().selectable.length, cel: !!document.querySelector('.mcp-new') }))
    check(other.n === 7 && !other.cel, `unlock per avatar: the second avatar keeps its own progress (${other.n} selectable, celebration ${other.cel})`)
    await p.click('.mcp-go'); await p.evaluate(() => window.__pk)
    await page(412, 915, 0, p)
    await p.evaluate(() => { window.__pk = MojoChasePicker.run(MojoChases.config('pantai'), { host: document.body }) }); await p.waitForSelector('.mcp-go'); await sleep(300)
    const back = await p.evaluate(() => ({ n: MojoChasePicker.state().selectable.length, cel: !!document.querySelector('.mcp-new'), seen: MojoChasePicker.readSave().formsSeen }))
    check(back.n === 10 && !back.cel && back.seen.length === 10, `unlock per avatar: switching back keeps 10 forms and celebrates nothing twice (${JSON.stringify(back)})`)
    await p.close()
  }

  /* ── N. the 3 TURNAROUND forms (owner 2026-10-06 "in the selection by DEFAULT"): present and selectable on stage 1
     with nothing cleared; card = mojo-turn/<v>-side, preview = -diag, race = -rear of the SAME sheet row; every image
     loads with clear alpha at its borders and no label-pill colour in its top corners. ─────────────────────────── */
  {
    const p = await page(1280, 800, 0)
    await p.evaluate(() => { avatarScopedSet('dunia-g31-chase', JSON.stringify({ v: 1, st: {}, formsSeen: ['racer'] })) })
    await page(1280, 800, 0, p)
    await p.evaluate(() => { window.__pk = MojoChasePicker.run(MojoChases.config('pantai'), { host: document.body }) }); await p.waitForSelector('.mcp-go'); await sleep(400)
    while (await p.$('.mcp-new-ok')) { await p.click('.mcp-new-ok'); await sleep(100) }
    const T3 = ['wrecking', 'boat', 'dump'], bad = []
    for (const v of T3) {
      const r = await p.evaluate(async v => {
        const f = MojoChases.form(v), c = document.querySelector('.mcp-card[data-form="' + v + '"]')
        if (!f || !c) return { miss: true }
        const lock = c.classList.contains('lock'), key = c.querySelector('img').dataset.key
        c.click(); await new Promise(res => setTimeout(res, 560))
        const b = document.querySelector('.mcp-rear')
        const scan = k => new Promise(res => { const i = new Image(); i.onload = () => { const cv = document.createElement('canvas'); cv.width = i.naturalWidth; cv.height = i.naturalHeight; const x = cv.getContext('2d'); x.drawImage(i, 0, 0); const d = x.getImageData(0, 0, cv.width, cv.height).data, W = cv.width, H = cv.height; let border = 0, pill = 0
          for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) { const o = (y * W + xx) * 4, a = d[o + 3]; if ((y === 0 || y === H - 1 || xx === 0 || xx === W - 1) && a > 0) border++
            if (a > 128 && y < H * 0.2 && (xx < W * 0.25 || xx >= W * 0.75)) { const R = d[o], G = d[o + 1], B = d[o + 2]; if ((R < 40 && G > 120 && G < 175 && B > 215) || (R >= 210 && R <= 232 && G >= 228 && G <= 242 && B >= 243 && B - R > 15) || (R < 30 && G < 50 && B > 60 && B < 110)) pill++ } }
          res({ ok: true, border, pill }) }; i.onerror = () => res({ ok: false }); i.src = (window.AssetIndex && AssetIndex.path(k)) || ('../assets/db/lib/' + k + '.webp') })
        return { lock, key, form: MojoChasePicker.state().form, side: b.dataset.side, card: b.dataset.card, rear: b.dataset.rear, row: f,
          imgs: [await scan(f.side), await scan(f.preview), await scan(f.rear)], anchor: !!(MojoRearAnchors.extra && MojoRearAnchors.extra[f.rear]), core: MojoChase.rearKey(v) }
      }, v)
      if (r.miss) { bad.push(v + ': not in the table / no card'); continue }
      if (r.lock || r.form !== v) bad.push(v + ': not selectable at stage 1')
      if (r.key !== 'mojo-turn/' + v + '-side' || r.card !== r.key) bad.push(v + ': card ' + r.key)
      if (r.side !== 'mojo-turn/' + v + '-diag') bad.push(v + ': preview ' + r.side)
      if (r.rear !== 'mojo-turn/' + v + '-rear' || r.core !== r.rear || !r.anchor) bad.push(v + ': race ' + r.rear + '/' + r.core + ' anchor ' + r.anchor)
      r.imgs.forEach((im, j) => { if (!im.ok || im.border || im.pill) bad.push(v + ' ' + ['side', 'diag', 'rear'][j] + ': ' + JSON.stringify(im)) })
    }
    check(!bad.length, `turnaround: Bola Penghancur, Perahu and Dump Truck selectable at stage 1; card = side, preview = diag, race = rear of the same row; 9 images with alpha borders and no label pill (${bad.slice(0, 3).join(' | ') || 'ok'})`)
    await p.click('.mcp-go'); await p.evaluate(() => window.__pk)
    await p.close()
  }

  /* ── T. THE form table (owner 2026-10-04: "the preview and the selection use the side or front view, only the
     game uses the rear view; don't let the front view show transformation 4 while the game uses transformation 5").
     For every row i: card src = preview src = FORMS[i].side, race sprite = FORMS[i].rear, the preview changes on every
     selection, both keys exist. Then a REAL chase per form (picker select -> Mulai -> mount -> api.state()), spread
     over all four viewports: state().form is the picked id and its race sprite is that same row's rear. ─────── */
  {
    const allClear = () => { const st = {}; MojoChases.STAGES.forEach(s => { st[s.id] = { stars: 1, t: 1 } }); avatarScopedSet('dunia-g31-chase', JSON.stringify({ v: 1, st, formsSeen: MojoChases.FORMS.map(f => f.id) })) }
    const p = await page(1280, 800, 0)
    const tab = await p.evaluate(async () => {
      const RA = window.MojoRearAnchors
      const has = k => new Promise(res => { const i = new Image(); i.onload = () => res(i.naturalWidth > 0); i.onerror = () => res(false); i.src = (window.AssetIndex && AssetIndex.path(k)) || ('../assets/db/lib/' + k + '.webp') })
      const rows = []
      for (const f of MojoChases.FORMS) rows.push({ id: f.id, side: f.side, preview: f.preview || f.side, rear: f.rear, kind: f.kind, sideOk: /^mojo-(hero|top|turn)\//.test(f.side) && await has(f.side) && await has(f.preview || f.side), rearOk: !!(RA.sprites[f.rear] || (RA.extra && RA.extra[f.rear])) && await has(f.rear.indexOf('/') >= 0 ? f.rear : 'mojo-rear/' + f.rear), core: MojoChase.rearKey(f.id) })
      return { rows, same: MojoChasePicker.FORMS.length === MojoChases.FORMS.length && MojoChasePicker.FORMS.every((f, i) => f === MojoChases.FORMS[i]) }
    })
    check(tab.same && tab.rows.length >= 10, `form table: the picker offers exactly the MojoChases.FORMS rows (${tab.rows.length} forms)`)
    // owner 2026-10-06 overrides the earlier "no boat on the road": the turnaround Perahu IS offered, as kind 'amph'
    // (pontoon glide + spray); the old mojo-rear boat/hover sprites (kind 'water') stay out
    check(tab.rows.every(r => r.kind !== 'water' && !/^(boat|hover)$/.test(r.rear)) && tab.rows.some(r => r.id === 'boat' && r.kind === 'amph'), `form table: the road boat is the amphibious turnaround Perahu only, no kind 'water' row (${tab.rows.filter(r => r.kind === 'water').map(r => r.id).join(',') || 'none'})`)
    check(tab.rows.every(r => r.sideOk), `form table: every side + preview key is a real mojo-hero / mojo-top / mojo-turn image (${tab.rows.filter(r => !r.sideOk).map(r => r.side).join(',') || 'ok'})`)
    check(tab.rows.every(r => r.rearOk), `form table: every rear key is a real mojo-rear sprite with anchors (${tab.rows.filter(r => !r.rearOk).map(r => r.rear).join(',') || 'ok'})`)
    check(tab.rows.every(r => r.core === r.rear), `form table: MojoChase.rearKey(id) is the same row's rear for every form (${tab.rows.filter(r => r.core !== r.rear).map(r => r.id + ':' + r.core).join(',') || 'ok'})`)
    await p.evaluate(allClear)
    await p.evaluate(() => { window.__pk = MojoChasePicker.run(MojoChases.config('kota'), { host: document.body }) }); await p.waitForSelector('.mcp-go'); await sleep(400)
    while (await p.$('.mcp-new-ok')) { await p.click('.mcp-new-ok'); await sleep(100) }
    const bad = [], srcs = []
    for (let i = 0; i < tab.rows.length; i++) {
      const r = tab.rows[i]
      const card = await p.evaluate(id => { const c = document.querySelector('.mcp-card[data-form="' + id + '"]'); if (!c) return null; const im = c.querySelector('img'); c.click(); return { key: im.dataset.key, src: im.getAttribute('src'), lock: c.classList.contains('lock') } }, r.id)
      await sleep(520)
      const pv = await p.evaluate(() => { const b = document.querySelector('.mcp-rear'); return { form: MojoChasePicker.state().form, side: b.dataset.side, card: b.dataset.card, rear: b.dataset.rear, src: b.querySelector('img.side').getAttribute('src') } })
      if (!card || card.lock) { bad.push(i + ' ' + r.id + ': no card or locked'); continue }
      if (card.key !== r.side || card.src.indexOf(r.side) < 0) bad.push(i + ' ' + r.id + ': card ' + card.src)
      if (pv.form !== r.id || pv.side !== r.preview || pv.card !== r.side || pv.src.indexOf(r.preview) < 0) bad.push(i + ' ' + r.id + ': preview ' + pv.src)
      if (r.preview === r.side && pv.src.split('?')[0] !== card.src.split('?')[0]) bad.push(i + ' ' + r.id + ': card and preview differ')
      if (pv.rear !== r.rear) bad.push(i + ' ' + r.id + ': race key ' + pv.rear)
      if (srcs.length && srcs[srcs.length - 1] === pv.src) bad.push(i + ' ' + r.id + ': preview did not change')
      srcs.push(pv.src)
    }
    check(!bad.length, `form table: for each of ${tab.rows.length} forms card src = FORMS[i].side, preview src = FORMS[i].preview || side, picker race key = FORMS[i].rear, and the preview changes on every selection (${bad.slice(0, 3).join(' | ') || 'ok'})`)
    await p.click('.mcp-go'); await p.evaluate(() => window.__pk)
    // the stage board never repeats itself ("Ngarai Batu Merah / Ngarai Batu Merah" on the gurun stage)
    const boards = []
    for (const sid of ['gurun', 'kota', 'malam']) {
      await p.evaluate(sid => { window.__pk = MojoChasePicker.run(MojoChases.config(sid), { host: document.body }) }, sid); await p.waitForSelector('.mcp-go'); await sleep(250)
      boards.push(await p.evaluate(() => { const b = document.querySelector('.mcp-plank b').textContent.trim(), s = document.querySelector('.mcp-plank span'); return [b, s ? s.textContent.trim() : ''] }))
      await p.click('.mcp-go'); await p.evaluate(() => window.__pk)
    }
    check(boards.every(([b, s]) => b && b.toLowerCase() !== s.toLowerCase()) && boards[0][0] === 'Kejar Pencuri!' && boards[0][1] === 'Ngarai Batu Merah', `stage board: title and place never repeat (${boards.map(x => x.join(' / ')).join(' ; ')})`)
    check(p.__errors.length === 0, `form table: no page errors (${p.__errors.slice(0, 2).join(' | ')})`)
    await p.close()
    // runtime: every form raced once, the forms spread over the four viewports
    const ids = tab.rows.map(r => r.id), want = Object.fromEntries(tab.rows.map(r => [r.id, r.rear])), miss = []
    for (let v = 0; v < SIZES.length; v++) {
      const [w, h] = SIZES[v], mine = ids.filter((_, i) => i % SIZES.length === v)
      if (!mine.length) continue
      const q = await page(w, h, 0); await q.evaluate(allClear); await page(w, h, 0, q)
      for (const id of mine) {
        const done = q.evaluate(() => MojoChaseMenu.run(MojoChases.config('kota')).catch(() => null))
        await q.waitForSelector('.mcp-go', { timeout: 60000 }); await sleep(300)
        while (await q.$('.mcp-new-ok')) { await q.click('.mcp-new-ok'); await sleep(100) }
        await q.evaluate(id => document.querySelector('.mcp-card[data-form="' + id + '"]').click(), id); await sleep(520)
        await q.evaluate(() => document.querySelector('.mcp-go').click())
        await waitState(q, s => ['cut', 'swop', 'countdown', 'tutorial', 'active'].includes(s.state), 20000)
        await q.evaluate(() => { const b = document.querySelector('.mc-skip'); if (b) b.click() })
        const s = await waitState(q, s => s.state === 'active' || s.state === 'tutorial' || s.state === 'swop', 30000)
        if (!s || s.form !== id || s.rear !== want[id]) miss.push(`${w}x${h} ${id}: race form ${s && s.form} sprite ${s && s.rear} (table ${want[id]})`)
        await q.evaluate(() => { const b = document.querySelector('.mc-pause'); if (b) b.click() }); await sleep(250)
        await q.evaluate(() => { const b = document.querySelector('#mc-exit'); if (b) b.click() }); await done; await sleep(200)
      }
      check(q.__errors.length === 0, `${w}x${h} form races: no page errors (${q.__errors.slice(0, 2).join(' | ')})`)
      await q.close()
    }
    check(!miss.length, `form table runtime: picker select -> Mulai -> api.state().form races the SAME row's rear sprite, ${ids.length} forms over ${SIZES.length} viewports (${miss.slice(0, 3).join(' | ') || 'ok'})`)
  }

  /* ── P + Q. a real chase (phone) ───────────────────────────────────────────────────────────── */
  {
    const p = await page(412, 915, 0)
    check(await p.evaluate(() => /^dunia-avatar-/.test(activeAvatarBadgeKey('g31-chase'))), 'per avatar: the chase save resolves to an avatar-scoped key')
    await p.evaluate(() => { const k = 'dunia-g31-chase'; avatarScopedSet(k, JSON.stringify({ v: 1, st: { pantai: { stars: 2, t: 5 } } })) })
    const done = p.evaluate(() => MojoChaseMenu.run(MojoChases.config('pantai')).then(r => (window.__res = r)))
    await p.waitForSelector('.mcp-go', { timeout: 60000 }); await sleep(400)
    let s = await st(p)
    check(s && !['cut', 'swop', 'countdown', 'tutorial', 'active'].includes(s.state) && !await p.$('#mc-go'), `picker appears before the countdown (core state ${s && s.state})`)
    const pk = await p.evaluate(() => MojoChasePicker.state())
    check(pk.open && pk.form === 'racer' && pk.rec === 'racer', `picker: pre-selects the stage pick for a new avatar (${pk.form}/${pk.rec})`)
    check(await p.evaluate(() => document.querySelectorAll('.mcp-card em.gold').length === 1 && /Paling Tepat/.test(document.querySelector('.mcp-card[data-form="racer"]').textContent) && [...document.querySelectorAll('.mcp-card em.alt')].every(e => !e.parentNode.classList.contains('lock'))), 'picker: one "Paling Tepat"; "Bisa Juga" only on selectable forms')
    // the arrow swops with the portal + click-lock
    await p.click('.mcp-nav.next'); await sleep(60)
    check(await p.evaluate(() => document.querySelector('.mcp').classList.contains('locked')), 'picker: the swop locks input while it plays')
    await sleep(500)
    check(await p.evaluate(() => MojoChasePicker.state().form === 'monster' && document.querySelector('.mcp-rear').dataset.side === MojoChases.form('monster').side && document.querySelector('.mcp-rear img.side').getAttribute('src').indexOf(MojoChases.form('monster').side) >= 0 && document.querySelector('.mcp-rear').dataset.rear === 'monster-2'), 'picker: next arrow selects the next form and shows its SIDE art')
    // swipe on the preview
    const sb = await p.$eval('.mcp-stage', e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })
    await p.mouse.move(sb.x + 80, sb.y); await p.mouse.down(); await p.mouse.move(sb.x - 80, sb.y, { steps: 4 }); await p.mouse.up(); await sleep(520)
    check(await p.evaluate(() => MojoChasePicker.state().form === 'jumper'), 'picker: a swipe on the preview changes the form')
    await p.evaluate(() => document.querySelector('.mcp-card[data-form="monster"]').click()); await sleep(520)
    const t0 = await p.evaluate(() => { window.__t0 = performance.now(); document.querySelector('.mcp-go').click(); return 1 })
    const ms = await p.evaluate(() => new Promise(res => { const tick = () => { const s = __mojoChase.state(); if (['countdown', 'cut', 'swop', 'tutorial', 'active'].includes(s.state)) res(performance.now() - __t0); else if (performance.now() - __t0 > 1500) res(-1); else requestAnimationFrame(tick) }; tick() }))
    check(ms >= 0 && ms <= 300, `Mulai starts the countdown within 300 ms (${ms < 0 ? 'not started: ' + (await st(p)).state + (await p.$('#mc-go') ? ', core still shows its intro card' : '') : Math.round(ms) + ' ms'})`)
    if (await p.$('#mc-go')) await p.evaluate(() => document.querySelector('#mc-go').click())
    await waitState(p, s => s.state === 'cut' || s.state === 'active' || s.state === 'swop', 15000); await p.evaluate(() => { const b = document.querySelector('.mc-skip'); if (b) b.click() })
    s = await waitState(p, s => s.state === 'active', 30000)
    check(s && s.form === 'monster' && s.rear === 'monster-2', `the choice changes the in-race sprite key (${s && s.form}/${s && s.rear})`)
    const sv = await p.evaluate(() => ({ a: MojoChasePicker.readSave(), m: MojoChaseMenu.load() }))
    check(sv.a.form === 'monster' && sv.m.form === 'monster' && sv.a.st && sv.a.st.pantai && sv.a.st.pantai.stars === 2, `the choice persists per avatar without touching the stage stars (${JSON.stringify(sv.a)})`)

    // Q: a forced quiz hit through the hook path
    await p.evaluate(() => __mojoChase.auto({ mode: 'clean' }))
    await sleep(800)
    await p.evaluate(() => { __mojoChase.auto(null); if (__mojoChase.emitTest) __mojoChase.emitTest('quiz'); if (!MojoChaseQuiz.state().open) MojoChase.hooks.onPickup('quiz', { sx: 0, sy: 0 }, window.__qaApi) })
    await p.waitForSelector('.mcq-btn', { timeout: 3000 })
    await sleep(300)
    const a0 = await st(p)
    await sleep(3000)
    const a1 = await st(p)
    check(a1.paused && a0.prog === a1.prog && a0.elapsed === a1.elapsed && a0.z === a1.z, `a quiz hit pauses: robber progress and timer unchanged for 3 s (${a0.prog.toFixed(4)}=${a1.prog.toFixed(4)}, ${a0.elapsed.toFixed(2)}=${a1.elapsed.toFixed(2)})`)
    check(await p.evaluate(() => getComputedStyle(document.querySelector('.mc-pause')).pointerEvents === 'none'), 'the Pause button is disabled while the card is open')
    await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')) })
    await sleep(300)
    check(await p.evaluate(() => MojoChaseQuiz.state().open && !document.querySelector('.mc-card.on')), 'backgrounding keeps the card open (no pause card on top)')
    await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')) })
    // right answer
    const stars0 = (await p.evaluate(() => __mojoChase.state().stars))
    await p.evaluate(() => { const a = String(MojoChaseQuiz.state().answer); document.querySelector('.mcq-btn[data-v="' + a + '"]').click() })
    await sleep(1300)
    const cd = await p.evaluate(() => ({ t: (document.querySelector('.mcq-go span') || {}).textContent, paused: __mojoChase.state().paused }))
    check(cd.paused && /Siap|Jalan/.test(cd.t || ''), `a right answer shows "Siap? Jalan!" while still paused (${cd.t})`)
    const r1 = await waitState(p, s => !s.paused, 3000)
    await sleep(500); const r2 = await st(p)
    check(r1 && !r1.paused && r2.elapsed > r1.elapsed && !await p.$('.mcq'), `answering resumes after the countdown (elapsed ${r1 && r1.elapsed.toFixed(2)} -> ${r2.elapsed.toFixed(2)})`)
    check(r2.stars >= stars0 + 2, `a right answer gives +2 stars (${stars0} -> ${r2.stars})`)
    // wrong twice in the real chase: never a fail
    await p.evaluate(() => MojoChase.hooks.onPickup('quiz', { sx: 0, sy: 0 }, window.__qaApi)); await p.waitForSelector('.mcq-btn')
    const h0 = await p.evaluate(() => document.querySelectorAll('.mc-hearts img.off').length)
    for (let k = 0; k < 2; k++) await p.evaluate(() => { const a = String(MojoChaseQuiz.state().answer); const b = [...document.querySelectorAll('.mcq-btn')].find(b => b.dataset.v !== a && !b.disabled); b.click() })
    const w1 = await waitState(p, s => !s.paused, 6000)
    const h1 = await p.evaluate(() => document.querySelectorAll('.mc-hearts img.off').length)
    check(w1 && !w1.paused && w1.state === 'active' && h1 === h0 && !await p.$('.mcq'), `a wrong answer never fails: the chase continues, hearts unchanged (${w1 && w1.state}, ${h0}->${h1})`)
    // per avatar: the other avatar has its own choice
    await p.evaluate(() => { __mojoChase.force({ prog: 0.99, best: 0.99, hasRocket: true, rocket: 1 }); document.querySelector('.mc-pause').click() }); await sleep(300)
    await p.evaluate(() => { const b = document.querySelector('#mc-exit'); if (b) b.click() }); await done.catch(() => {})
    await page(412, 915, 1, p)
    check(await p.evaluate(() => MojoChasePicker.readSave().form !== 'monster'), 'per avatar: the second avatar does not inherit the first choice')
    await p.evaluate(() => { window.__pk = MojoChasePicker.run(MojoChases.config('pelabuhan'), { host: document.body }) }); await p.waitForSelector('.mcp-go')
    check(await p.evaluate(() => MojoChasePicker.state().form === 'cargo'), 'per avatar: a new avatar starts on the stage pick (harbour stage -> Truk Kargo)')
    await p.evaluate(() => { document.querySelector('.mcp-card[data-form="excavator"]').click() }); await sleep(520); await p.click('.mcp-go')
    const c2 = await p.evaluate(() => window.__pk)
    check(await p.evaluate(() => MojoChase.rearKey('excavator') === 'excavator'), 'the excavator races as the excavator rear sprite')
    check(c2.mojo_form === 'excavator' && c2.perk === 'grip', `the picker resolves cfg with mojo_form + perk (${c2.mojo_form}/${c2.perk})`)
    await page(412, 915, 0, p)
    check(await p.evaluate(() => MojoChasePicker.readSave().form === 'monster'), 'per avatar: switching back restores the first avatar choice')
    check(p.__errors.length === 0, `no page errors (${p.__errors.slice(0, 2).join(' | ')})`)
    await p.close()
  }
} catch (e) { check(false, 'gate crashed: ' + (e && e.stack || e).toString().split('\n').slice(0, 3).join(' ')) }
await browser.close()
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({ passed, issues }, null, 1))
console.log(`\nmojo-chase-ui: ${passed} passed, ${issues.length} failed  (shots ${out})`)
if (issues.length) console.log('failed: ' + issues.map(s => s.slice(0, 110)).join(' || '))
process.exit(issues.length ? 1 : 0)
