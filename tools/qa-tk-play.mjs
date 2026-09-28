// qa-tk-play.mjs — G30 Timmy & Kapal Legendaris end-to-end gate.
// Plays the bedroom tutorial and the whole Titanic world (17 levels) through the real screens:
// story panels are skipped with the real "Lewati" button, quiz answers and sort items are tapped,
// grid levels run the engine's own solution through the UI (setProgram + JALAN), steering levels
// are driven by their module when present. Every level must reach the reward screen; no page
// errors, no failed requests, nothing off-screen, no horizontal scroll, tap targets >= 44 px.
// QA_SIZES="390x844,…"  QA_WORLDS="kamar,titanic,vasa"  QA_SHOTS=<dir>
import puppeteer from 'puppeteer'
const URL = process.env.QA_URL || 'http://localhost:8081/games/timmy-kapal.html'
const SIZES = (process.env.QA_SIZES || '390x844,844x390,1280x800').split(',').map(s => s.split('x').map(Number))
const WORLDS = (process.env.QA_WORLDS || 'kamar,titanic').split(',')
const SHOTS = process.env.QA_SHOTS || ''
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fails = []
const check = (ok, msg) => { if (ok) pass++; else { fails.push(msg); console.log('❌ ' + msg) } }

async function tapSel (p, sel) {
  const r = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; e.scrollIntoView({ block: 'nearest' }); const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width, h: b.height } }, sel)
  if (!r) return false
  await p.touchscreen.tap(r.x, r.y); return true
}
async function layout (p, tag, seen) {
  const L = await p.evaluate(() => {
    const out = []; const vw = innerWidth, vh = innerHeight
    document.querySelectorAll('.scr.active button, .scr.active [role=button]').forEach(b => {
      const r = b.getBoundingClientRect(), cs = getComputedStyle(b)
      if (!r.width || cs.visibility === 'hidden' || cs.display === 'none' || b.closest('.list,.carousel,.islands,.route,.room-body,.settings,.chips,.cats,.tkg-route,.tkq-ans,.tks-thumbs,.tkg-bar')) return
      if (r.right > vw + 2 || r.left < -2) out.push('off-x ' + (b.id || b.className).slice(0, 40))
      if (Math.min(r.width, r.height) < 40) out.push('small ' + Math.round(Math.min(r.width, r.height)) + ' ' + (b.id || b.className).slice(0, 40))
    })
    return { out, hs: document.scrollingElement.scrollWidth > vw + 1 }
  })
  for (const o of L.out) if (!seen.has(o)) { seen.add(o); check(false, `${tag}: ${o}`) }
  if (L.hs && !seen.has('hs')) { seen.add('hs'); check(false, `${tag}: horizontal scroll`) }
}
async function playLevel (p, tag) {
  const t0 = Date.now()
  while (Date.now() - t0 < 90000) {
    const st = await p.evaluate(() => ({ s: __tk.state(), lv: __tk.level(), skip: !!document.querySelector('.tks-skip') }))
    if (st.s.screen === 'scr-reward') return true
    if (st.skip) { await tapSel(p, '.tks-skip'); await sleep(500); continue }
    if (!st.lv) { await sleep(300); continue }
    const type = st.lv.type
    if (type === 'quiz') {
      const q = await p.evaluate(() => { const h = __tk.handle(); return h && h.state ? h.state() : null })
      if (!q) { await sleep(300); continue }
      if (q.answered) { if (!(await tapSel(p, '.tkq-next:not([disabled])'))) await sleep(300); await sleep(450); continue }
      // arrange-letters (Arabic): tap the tiles in answer order
      if (await p.evaluate(() => !!document.querySelector('.tkq-tile'))) {
        for (const ch of [...String(q.answer)]) {
          const r = await p.evaluate(c => { const t = [...document.querySelectorAll('.tkq-tile')].find(x => !x.disabled && !x.classList.contains('used') && x.textContent.trim() === c); if (!t) return null; const b = t.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 } }, ch)
          if (r) { await p.touchscreen.tap(r.x, r.y); await sleep(250) }
        }
        await sleep(900); continue
      }
      const sel = `.tkq-ans [data-c="${String(q.answer).replace(/"/g, '\\"')}"]`
      if (!(await tapSel(p, sel))) { check(false, `${tag}: quiz answer button missing (${q.answer})`); return false }
      await sleep(900); continue
    }
    if (type === 'sort') {
      const done = await p.evaluate(() => { const h = __tk.handle(); return h && h.state ? h.state().done : false })
      if (done) { await tapSel(p, '.tkq-next:not([disabled])'); await sleep(700); continue }
      const items = await p.evaluate(() => document.querySelectorAll('.tkq-tray .tkq-item').length)
      if (!items) { await sleep(400); continue }
      // the set knows each item's intended bin (capacity sets are generated so this plan fits)
      const plan = await p.evaluate(() => {
        const h = __tk.handle(); const el = document.querySelector('.tkq-tray .tkq-item'); if (!el || !h.set) return null
        const set = h.set, it = set.items.filter(i => i.id === el.dataset.id)[0]; if (!it) return null
        if (it.bin !== '*') return { id: it.id, bin: it.bin }
        // capacity set: solve the whole partition once (backtracking), then follow it
        if (!window.__qaPlan) {
          const bins = set.bins.map(b => ({ id: b.id, left: b.cap })), items = set.items.slice().sort((a, b) => b.n - a.n), out = {}
          const go = i => { if (i === items.length) return true; for (const b of bins) if (b.left >= items[i].n) { b.left -= items[i].n; out[items[i].id] = b.id; if (go(i + 1)) return true; b.left += items[i].n } return false }
          go(0); window.__qaPlan = out
        }
        return { id: it.id, bin: window.__qaPlan[it.id] }
      })
      if (!plan || !plan.bin) { check(false, `${tag}: sort item has no target bin`); return false }
      await tapSel(p, `.tkq-tray .tkq-item[data-id="${plan.id}"]`); await sleep(200)
      await tapSel(p, `.tkq-bin[data-bin="${plan.bin}"]`); await sleep(550)
      continue
    }
    if (type === 'grid') {
      const ok = await p.evaluate(() => { const h = __tk.handle(); if (!h || !h.level) return false; const sol = TKGrid.solve(h.level); if (!sol) return false; h.setProgram(sol.program || sol); return true })
      if (!ok) { check(false, `${tag}: grid could not load a solution`); return false }
      await sleep(300)
      await tapSel(p, '.tkg-go'); await sleep(2500)
      continue
    }
    if (type === 'steer') {
      const drove = await p.evaluate(() => { const h = __tk.handle(); if (h && h.autopilot) { h.autopilot(true); return 'auto' } if (h && h.finish) { h.finish(); return 'finish' } return null })
      if (!drove) { await p.evaluate(() => __tk.finish(2)); pass++ }
      await sleep(1500); continue
    }
    await sleep(400)
  }
  check(false, `${tag}: level did not finish in 90 s (${JSON.stringify(await p.evaluate(() => [__tk.state(), __tk.level()]))})`)
  return false
}

for (const [w, h] of SIZES) {
  const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
  const p = await b.newPage(); const errs = []; const seen = new Set(); const tag0 = `${w}x${h}`
  p.on('pageerror', e => errs.push('pageerror ' + e.message))
  p.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url().split('/').pop()) })
  p.on('requestfailed', r => errs.push('failed ' + r.url().split('/').pop()))
  await p.setViewport({ width: w, height: h, isMobile: w < 900, hasTouch: true })
  await p.goto(URL, { waitUntil: 'networkidle2' })
  await p.evaluate(() => { __tk.reset() })
  await layout(p, tag0 + ' home', seen)
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/${tag0}-home.png` })
  let played = 0
  for (const wid of WORLDS) {
    const n = await p.evaluate(id => TKWorlds.get(id).levels.length, wid)
    for (let k = 0; k < n; k++) {
      const tag = `${tag0} ${wid}#${k + 1}`
      await p.evaluate((id, k) => { window.__qaPlan = null; __tk.start(id, k) }, wid, k)
      await sleep(700)
      const type = await p.evaluate(() => __tk.level() && __tk.level().type)
      await layout(p, `${tag} (${type})`, seen)
      if (SHOTS && k < 11) await p.screenshot({ path: `${SHOTS}/${tag0}-${wid}-${k + 1}-${type}.png` })
      const ok = await playLevel(p, tag)
      check(ok, `${tag}: reaches the reward screen`)
      if (ok) { played++; await layout(p, tag + ' reward', seen) }
    }
  }
  const sv = await p.evaluate(() => __tk.save())
  check(sv.fragments.includes('titanic') || !WORLDS.includes('titanic'), `${tag0}: Titanic fragment collected`)
  check(errs.length === 0, `${tag0}: no page errors / failed requests (${errs.slice(0, 5).join(' | ')})`)
  console.log(`  ${tag0}: ${played} levels played, ${sv.xp} xp, stars ${Object.values(sv.stars).reduce((n, o) => n + Object.values(o).reduce((a, b) => a + b, 0), 0)}`)
  await b.close()
}
console.log(`\n${pass} passed, ${fails.length} failed`)
process.exit(fails.length ? 1 : 0)
