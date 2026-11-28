#!/usr/bin/env node
// qa-prd59-uae — PRD-59 L1, L3, L5, L6 (docs/prd/PRD-59-orang-tua-abudhabi.md), in a real browser.
// L1 the first page shows "Relocation to UAE", reachable (in first view at 390x844 and 800x1280; by scrolling at 844x390, where the hub menu scrolls) and on top, >= 48 px tall, and it
//    opens the landing page; the landing page's two menus open the two tools and show saved progress.
// L3 marking a step, typing the real cost and a note survive a reload; a downloaded backup restored into an empty
//    profile gives the same state.
// L5 a mock exam uses the format from the data, finishing it saves history, wrong answers land in the redo list.
// L6 all three pages: 0 page errors, no sideways scroll at 390 px, every button >= 44 px, print shows every step.
// Usage: QA_BASE=http://127.0.0.1:8089 [QA_SHOTS=dir] node tools/qa-prd59-uae.mjs
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, '')
const SH = process.env.QA_SHOTS || ''
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }
const sleep = ms => new Promise(r => setTimeout(r, ms))
const { default: puppeteer } = await import('puppeteer')
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-audio-output'] })
const shot = async (p, n) => { if (SH) { fs.mkdirSync(SH, { recursive: true }); await p.screenshot({ path: path.join(SH, n + '.png'), fullPage: true }) } }
const page = async (w, h, ctx) => {
  const p = await (ctx || b).newPage(), errs = []
  p.on('pageerror', e => errs.push(String(e).slice(0, 160)))
  p.on('console', m => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text().slice(0, 160)) })
  await p.setViewport({ width: w, height: h, isMobile: w < 900, hasTouch: true })
  return { p, errs }
}
const audit = p => p.evaluate(() => {
  const small = [...document.querySelectorAll('button, a, input, textarea, [role="radio"]')].filter(e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width && r.height && cs.visibility !== 'hidden' && !e.closest('[hidden]') && !e.closest('.u-dl') && !e.closest('.u-hist') && !e.closest('.u-muted') && r.height < 44 }).map(e => (e.id || e.textContent).trim().slice(0, 20))
  return { ox: document.documentElement.scrollWidth - innerWidth, small }
})
try {
  // ---- L1 home link ----
  for (const [w, h] of [[390, 844], [844, 390], [800, 1280]]) {
    const { p, errs } = await page(w, h)
    await p.evaluateOnNewDocument(() => localStorage.setItem('dunia-emosi-sound', 'off'))
    await p.goto(BASE + '/index.html?nocine=1', { waitUntil: 'load', timeout: 90000 })
    await p.waitForSelector('#home-uae-link', { timeout: 30000 }).catch(() => {})
    await sleep(2500)
    const r = await p.evaluate(() => {
      const a = document.getElementById('home-uae-link'); if (!a) return null
      // the hub menu itself scrolls on a phone held sideways (844x390: "Pilih Game" is already cut), so the law is
      // "reachable": bring it into view the way a finger would, then it must be the thing under the finger
      const first = a.getBoundingClientRect(), wasInView = first.top >= 0 && first.bottom <= innerHeight
      a.scrollIntoView({ block: 'center', behavior: 'instant' })   // html has scroll-behavior: smooth; measure after the scroll, not during it
      const q = a.getBoundingClientRect(), t = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2)
      return { h: q.height, wasInView, inView: q.top >= 0 && q.bottom <= innerHeight, onTop: !!t && a.contains(t), text: a.textContent.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href') }
    })
    ok(r && r.inView && (r.wasInView || w > h) && r.onTop && r.h >= 48 && /Relocation to UAE/.test(r.text), `L1 ${w}x${h}: home link "Relocation to UAE" reachable ${r && r.inView} (in first view ${r && r.wasInView}), on top ${r && r.onTop}, ${r && Math.round(r.h)} px`)
    if (w === 390) {
      await Promise.all([p.waitForNavigation({ waitUntil: 'load' }), p.tap('#home-uae-link')])
      ok(/relokasi-uae\.html$/.test(p.url()), `L1: the link opens the landing page (${p.url().split('/').pop()})`)
      for (const [sel, want] of [['#menu-docs', 'pindah-abudhabi.html'], ['#menu-sim', 'ujian-sim-abudhabi.html']]) {
        await p.goto(BASE + '/games/relokasi-uae.html', { waitUntil: 'load' })
        await Promise.all([p.waitForNavigation({ waitUntil: 'load' }), p.tap(sel)])
        ok(p.url().endsWith(want), `L1: landing ${sel} opens ${want}`)
      }
    }
    ok(!errs.length, `L1 ${w}x${h}: home page errors ${errs.length} ${errs.slice(0, 2).join(' | ')}`)
    await p.close()
  }

  // ---- L3 documents: save, reload, backup, restore ----
  const dl = fs.mkdtempSync(path.join(os.tmpdir(), 'uae-dl-'))
  const ctxA = await b.createBrowserContext()
  const { p, errs } = await page(390, 844, ctxA)
  // a download in a non-default browser context needs that context's id, or it silently goes nowhere
  const cdp = await p.createCDPSession(); await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dl, browserContextId: ctxA.id, eventsEnabled: true })
  await p.goto(BASE + '/games/pindah-abudhabi.html', { waitUntil: 'load' })
  const first = await p.evaluate(() => document.querySelector('.u-step').dataset.id)
  await p.tap(`#step-${first} .u-step-head`)
  // L9 an item tick moves todo -> doing; the step stays open (status is never auto-done)
  await p.tap(`#step-${first} input[data-act="item"]`)
  const it = await p.evaluate(id => ({ st: document.getElementById('step-' + id).dataset.status, n: Object.keys(window.__uaeDocs.state().steps[id].bring).length }), first)
  ok(it.st === 'doing' && it.n === 1, `L9: ticking the first item marks the step doing (${it.st}, ${it.n} item)`)
  await p.tap(`#step-${first} [data-act="status"][data-v="done"]`)
  await p.type(`#step-${first} input[data-act="actual"]`, '150000')
  await p.type(`#step-${first} textarea[data-act="note"]`, 'antrean 12')
  await shot(p, 'prd59-docs-390')
  const a1 = await audit(p)
  ok(a1.ox <= 0 && !a1.small.length, `L6 docs 390: sideways ${a1.ox}, small targets ${a1.small.slice(0, 4).join(', ') || 'none'}`)
  await p.reload({ waitUntil: 'load' })
  const s1 = await p.evaluate(id => ({ st: document.getElementById('step-' + id).dataset.status, sum: document.getElementById('sum-actual').textContent, saved: window.__uaeDocs.state().steps[id] }), first)
  ok(s1.st === 'done' && s1.saved.actual === '150000' && s1.saved.note === 'antrean 12' && /150\.000/.test(s1.sum), `L3: after reload step done, real cost and note kept (${JSON.stringify(s1.saved)}, sum ${s1.sum})`)
  const t = await p.evaluate(() => window.__uaeDocs.money())
  ok(t.max > 0 && t.min <= t.max, `L2 page: money to prepare ${Math.round(t.min)}..${Math.round(t.max)} IDR`)
  await p.tap('#btn-backup'); await sleep(1500)
  const file = fs.readdirSync(dl).find(f => f.endsWith('.json'))
  ok(!!file, `L3: backup file downloaded (${file})`)
  // print shows every step body
  await p.emulateMediaType('print')
  const pr = await p.evaluate(() => [...document.querySelectorAll('.u-step-body')].filter(e => getComputedStyle(e).display !== 'none').length + '/' + document.querySelectorAll('.u-step').length)
  const [vis, all] = pr.split('/').map(Number)
  ok(vis === all && all > 0, `L6: print shows every step (${pr})`)
  await p.emulateMediaType('screen')
  ok(!errs.length, `L6 docs: page errors ${errs.length} ${errs.slice(0, 2).join(' | ')}`)
  await ctxA.close()
  if (file) {
    const ctxB = await b.createBrowserContext()
    const { p: q } = await page(390, 844, ctxB)
    await q.goto(BASE + '/games/pindah-abudhabi.html', { waitUntil: 'load' })
    const before = await q.evaluate(id => document.getElementById('step-' + id).dataset.status, first)
    const input = await q.$('#file-restore'); await input.uploadFile(path.join(dl, file)); await sleep(800)
    const after = await q.evaluate(id => ({ st: document.getElementById('step-' + id).dataset.status, s: window.__uaeDocs.state().steps[id] }), first)
    ok(before === 'todo' && after.st === 'done' && after.s.note === 'antrean 12', `L3: restore into an empty profile (${before} -> ${after.st}, note ${after.s && after.s.note})`)
    // landing shows progress
    await q.goto(BASE + '/games/relokasi-uae.html', { waitUntil: 'load' })
    const stat = await q.$eval('#stat-docs', e => e.textContent)
    ok(/^1 dari 21 selesai/.test(stat), `L1: landing shows saved document progress ("${stat}")`)
    await ctxB.close()
  }

  // ---- L5 exam ----
  for (const [w, h] of [[390, 844], [844, 390], [800, 1280]]) {
    const ctx = await b.createBrowserContext()
    const { p: s, errs: e2 } = await page(w, h, ctx)
    await s.goto(BASE + '/games/ujian-sim-abudhabi.html', { waitUntil: 'load' })
    const fmt = await s.evaluate(() => window.UAESim.format)
    await shot(s, `prd59-sim-home-${w}x${h}`)
    await s.tap('[data-act="exam"]')
    const n = await s.evaluate(() => window.__uaeSim.run().qs.length)
    ok(n === fmt.count, `L5 ${w}x${h}: exam has ${n} questions (data says ${fmt.count})`)
    const timer = await s.$eval('#q-timer', e => !e.hidden && e.textContent)
    ok(!!timer, `L5 ${w}x${h}: exam timer shows (${timer})`)
    // answer the first question wrong on purpose, the rest by tapping the first option
    for (let i = 0; i < n; i++) {
      const wrongOi = await s.evaluate(() => { const r = window.__uaeSim.run(), q = r.qs[r.i].q; return (q.a + 1) % q.opts.length })
      if (i === 0) await s.tap(`.u-opt[data-oi="${wrongOi}"]`); else await s.tap('.u-opt')
      if (i === 1) await shot(s, `prd59-sim-q-${w}x${h}`)
      if (i === 0 && w === 390) { const a = await audit(s); ok(a.ox <= 0 && !a.small.length, `L6 sim quiz 390: sideways ${a.ox}, small ${a.small.slice(0, 4).join(', ') || 'none'}`) }
      await s.tap('#q-next')
    }
    const res = await s.evaluate(() => ({ score: document.getElementById('r-score').textContent, st: window.__uaeSim.state() }))
    ok(res.st.history.length === 1 && res.st.history[0].total === n, `L5 ${w}x${h}: finishing saves history (${JSON.stringify(res.st.history[0])})`)
    ok(await s.$eval('#q-timer', e => e.hidden), `L5 ${w}x${h}: the exam timer is gone on the result screen`)
    const nw = Object.values(res.st.q || {}).filter(x => x.box === 0).length
    ok(nw >= 1, `L5 ${w}x${h}: wrong answers go to the redo list (${nw})`)
    const bt = await s.$$eval('#r-topics tr', r => r.length)
    ok(bt >= 1 && res.st.history[0].byTopic, `L5 ${w}x${h}: result lists score per topic (${bt} rows)`)
    await shot(s, `prd59-sim-result-${w}x${h}`)
    await s.reload({ waitUntil: 'load' })
    const kept = await s.evaluate(() => ({ h: window.__uaeSim.state().history.length, btn: document.getElementById('btn-wrong').disabled }))
    ok(kept.h === 1 && kept.btn === false, `L3 sim ${w}x${h}: history and redo list survive reload`)
    // practice mode shows the explanation after a pick
    await s.tap('[data-act="topic"]'); await s.tap('.u-opt')
    const ex = await s.$eval('#q-explain', e => !e.hidden && e.textContent.length > 20)
    ok(ex, `L5 ${w}x${h}: practice shows the explanation after a pick`)
    // leaving a practice run is one tap; an exam needs two (not counted)
    await s.tap('#q-quit')
    ok(await s.$eval('#v-home', e => !e.hidden), `L5 ${w}x${h}: quit from practice returns home`)
    await s.tap('[data-act="exam"]'); await s.tap('#q-quit')
    const armed = await s.$eval('#q-quit', e => e.textContent)
    await s.tap('#q-quit')
    const back = await s.evaluate(() => ({ home: !document.getElementById('v-home').hidden, h: window.__uaeSim.state().history.length }))
    ok(/tidak dihitung/.test(armed) && back.home && back.h === 1, `L5 ${w}x${h}: exam quit asks once, then leaves uncounted ("${armed}", history ${back.h})`)
    const rd = await s.evaluate(() => ({ pct: document.getElementById('ready-pct').textContent, t: document.getElementById('ready-text').textContent }))
    ok(/^\d+%$/.test(rd.pct) && rd.t.length > 10, `L5 ${w}x${h}: readiness shown (${rd.pct}, "${rd.t.slice(0, 50)}")`)
    await s.tap('[data-act="signs"]')
    // L12 (PRD-59B §8): every gallery card shows one sign, real artwork loads from this site, every card has an Indonesian name
    await s.waitForFunction(() => [...document.querySelectorAll('#s-grid img.u-sign-img')].every(i => i.complete), { timeout: 20000 }).catch(() => {})
    const sg = await s.evaluate(() => {
      const figs = [...document.querySelectorAll('#s-grid figure')], imgs = [...document.querySelectorAll('#s-grid img.u-sign-img')]
      return { figs: figs.length, one: figs.filter(f => f.querySelectorAll('img.u-sign-img, svg.u-sign').length === 1).length, imgs: imgs.length,
        broken: imgs.filter(i => !i.naturalWidth).map(i => i.getAttribute('src')).slice(0, 3), foreign: imgs.filter(i => new URL(i.src).origin !== location.origin).length,
        credited: Object.keys(window.UAESignCredits || {}).length, id: figs.filter(f => /\S/.test((f.querySelector('figcaption .u-muted') || {}).textContent || '')).length }
    })
    ok(sg.figs > 0 && sg.one === sg.figs && sg.id === sg.figs, `L5 ${w}x${h}: every gallery card shows one sign with an Indonesian name (${sg.one}/${sg.figs}, id ${sg.id})`)
    ok(sg.imgs >= 100 && sg.imgs === sg.credited && !sg.broken.length && !sg.foreign, `L12 ${w}x${h}: ${sg.imgs} real signs (credited ${sg.credited}) load from this site, broken ${sg.broken.join(', ') || 'none'}, foreign ${sg.foreign}`)
    if (w === 390) await shot(s, 'prd59-sim-signs-390x844')
    await s.tap('#v-signs [data-act="home"]'); await s.tap('[data-act="process"]')
    await s.tap('#p-list [data-act="pstatus"][data-v="doing"]')
    const ps = await s.evaluate(() => Object.values(window.__uaeSim.state().process.steps).map(x => x.status).join(','))
    ok(ps === 'doing', `L8 sim: licence step status saved by the workflow engine (${ps})`)
    await shot(s, `prd59-sim-process-${w}x${h}`)
    const a = await audit(s)
    ok(a.ox <= 0, `L6 sim process ${w}x${h}: sideways ${a.ox}`)
    // L13 (PRD-59B §9): the journey map on the home screen shows every stage, step and exam category, with saved status
    await s.tap('#v-process [data-act="home"]')
    const jm = await s.evaluate(() => {
      const steps = [...document.querySelectorAll('#journey .u-jstep')]
      return { stages: document.querySelectorAll('#journey .u-jstage').length, steps: steps.length, want: window.UAESim.process.steps.length,
        first: steps[0] && steps[0].dataset.k, cats: document.querySelectorAll('#journey .u-jcat').length, tagged: document.querySelectorAll('#journey .u-jcat .u-tag[class*="u-stage-"]').length,
        topics: window.UAESim.topics.length, nextN: document.querySelectorAll('#journey .u-jstep.is-next').length }
    })
    ok(jm.stages === 3 && jm.steps === jm.want && jm.cats === jm.topics && jm.tagged === jm.topics, `L13 ${w}x${h}: journey map ${jm.stages} stages, ${jm.steps}/${jm.want} steps, ${jm.cats}/${jm.topics} categories with a level`)
    ok(jm.first === 'doing' && jm.nextN === 1, `L13 ${w}x${h}: map status matches the saved step (${jm.first}), one next step (${jm.nextN})`)
    if (w === 390) await shot(s, 'prd59-sim-journey-390x844', '#journey')
    await s.tap('#journey .u-jstep:nth-child(2) [data-act="pgo"]')
    const go = await s.evaluate(() => { const v = !document.getElementById('v-process').hidden, ids = window.UAESim.process.stages[0].steps, e = document.getElementById('ps-' + ids[1]); const r = e && e.getBoundingClientRect(); return { v, top: r ? Math.round(r.top) : -1 } })
    ok(go.v && go.top >= 0 && go.top < 200, `L13 ${w}x${h}: tapping a step on the map opens that step (top ${go.top})`)
    ok(!e2.length, `L6 sim ${w}x${h}: page errors ${e2.length} ${e2.slice(0, 2).join(' | ')}`)
    // L14 (PRD-59B §8): after one online visit the page and its real signs open with no network (root SW, runtime cache)
    if (w === 390) {
      await s.evaluate(() => Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(r, 8000))]).then(() => 0))
      await s.reload({ waitUntil: 'load' })   // home screen, and the SW now controls the page
      await s.evaluate(() => Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(r, 8000))]).then(() => 0))
      await s.tap('[data-act="signs"]')
      await s.waitForFunction(() => [...document.querySelectorAll('#s-grid img.u-sign-img')].every(i => i.complete), { timeout: 30000 }).catch(() => {})
      await sleep(1500)
      await s.setOfflineMode(true)
      await s.reload({ waitUntil: 'load' }).catch(() => {})
      const off = await s.evaluate(async () => {
        const home = !!document.getElementById('v-home'); document.querySelector('[data-act="signs"]').click()
        const imgs = [...document.querySelectorAll('#s-grid img.u-sign-img')]
        await Promise.all(imgs.map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r })))
        return { home, n: imgs.length, ok: imgs.filter(i => i.naturalWidth > 0).length, ctl: !!navigator.serviceWorker.controller }
      }).catch(e => ({ err: String(e).slice(0, 80) }))
      await s.setOfflineMode(false)
      ok(off.home && off.n >= 100 && off.ok === off.n, `L14 ${w}x${h}: offline after one visit, page opens and ${off.ok}/${off.n} signs show (sw ${off.ctl}) ${off.err || ''}`)
    }
    await ctx.close()
  }
  // PRD-59C L17 + L21 + L22 in the browser: the family page builds per child, keeps it after reload, explains every field
  {
    const ctx = await b.createBrowserContext()
    const { p: f, errs: e5 } = await page(390, 844, ctx)
    await f.goto(BASE + '/games/visa-keluarga-uae.html', { waitUntil: 'load' })
    const f0 = await f.evaluate(() => ({ ...window.__uaeFamily, li: document.querySelectorAll('.u-step').length, want: window.UAEChecklist.data.steps.length, ow: document.documentElement.scrollWidth, sum: document.getElementById('tl-sum').textContent }))
    ok(f0.li === f0.want && f0.li >= 30 && f0.kids.length === 2 && f0.total[1] > 0 && f0.ow <= 390 && /berangkat/.test(f0.sum), `L17: family page ${f0.li} steps for ${f0.kids}, plan ${f0.total} days, width ${f0.ow}`)
    // the second child is not at school yet: school steps disappear and stay gone after reload
    await f.select('[data-kid-stage="1"]', 'pre'); await f.waitForNavigation({ waitUntil: 'load' }).catch(() => {})
    const f1 = await f.evaluate(() => ({ kids: window.__uaeFamily.kids, school2: !!document.getElementById('step-c-school-docs-2'), school1: !!document.getElementById('step-c-school-docs-1') }))
    ok(f1.kids[1] === 'Anak 2:pre' && !f1.school2 && f1.school1, `L17: a child set to "belum sekolah" loses the school steps after reload (${JSON.stringify(f1)})`)
    // L22: every field of an opened step has an info button that opens a written explanation
    const tip = await f.evaluate(() => {
      const li = document.getElementById('step-w-nikah-kemenag'); li.querySelector('.u-step-head').click()
      const btns = [...li.querySelectorAll('.u-tip')], dts = li.querySelectorAll('dt').length
      const texts = btns.map(x => { x.click(); const bx = document.getElementById('u-tipbox'); return bx && bx.matches(':popover-open') ? bx.textContent.length : 0 })
      const term = li.querySelector('.u-term'); if (term) term.click()
      return { dts, btns: btns.length, open: texts.filter(n => n > 40).length, term: term ? document.getElementById('u-tipbox-h').textContent : null }
    })
    ok(tip.btns >= tip.dts + 3 && tip.open === tip.btns && tip.term, `L22: ${tip.btns} info buttons for ${tip.dts} fields + status/biaya/catatan, ${tip.open} open an explanation, term ${tip.term}`)
    await shot(f, 'prd59c-family-tip-390x844')
    ok(!e5.length, `L17: family page errors ${e5.length} ${e5.slice(0, 2).join(' | ')}`)
    await ctx.close()
  }
  // L15 (PRD-59 §6): the tracker is the sum of both tools, it follows saved status, its links open the named step
  {
    const ctx = await b.createBrowserContext()
    const { p: t, errs: e4 } = await page(390, 844, ctx)
    await t.goto(BASE + '/games/relokasi-uae.html', { waitUntil: 'load' })
    const t0 = await t.evaluate(() => ({ ...window.__uaeTracker, want: window.UAEDocs.steps.length + window.UAESim.process.steps.length + window.__uaeTracker.fam, items: window.UAEDocs.steps.reduce((a, s) => a + s.bring.length, 0) + window.UAEFamily.build([{ name: 'a', stage: 'g2' }, { name: 'b', stage: 'g2' }]).steps.reduce((a, s) => a + s.bring.length, 0), rows: document.querySelectorAll('#tr-journey li').length, wantRows: 4 + 5 + 3 }))
    ok(t0.done === 0 && t0.n === t0.want && t0.left === t0.items && t0.rows === t0.wantRows && t0.next[0] && t0.next[1] && t0.next[2] && t0.fam >= 30, `L15: fresh tracker 0 of ${t0.n} (want ${t0.want}), ${t0.left}/${t0.items} papers to prepare, ${t0.rows} journey rows, next ${t0.next}`)
    // save one finished document step and one finished licence step the way the tools do, then reload
    await t.evaluate(() => {
      const d = window.UAEFlow.apply(window.UAEFlow.migrate(window.UAEStore.read(window.UAEStore.KEYS.docs, {})), window.UAEDocs.steps[0].id, { status: 'done' })
      window.UAEStore.write(window.UAEStore.KEYS.docs, d)
      const s = window.UAEQuiz.migrate(window.UAEStore.read(window.UAEStore.KEYS.sim, {})); s.process = window.UAEFlow.apply(s.process || { steps: {} }, window.UAESim.process.steps[0].id, { status: 'done' })
      window.UAEStore.write(window.UAEStore.KEYS.sim, s)
    })
    await t.reload({ waitUntil: 'load' })
    const t1 = await t.evaluate(() => ({ ...window.__uaeTracker, pct: document.getElementById('tr-total').textContent, doneRows: document.querySelectorAll('#tr-journey li[data-k="doing"], #tr-journey li[data-k="done"]').length }))
    ok(t1.done === 2 && t1.money[1] < t0.money[1] && t1.next[0] !== t0.next[0] && t1.doneRows >= 2, `L15: after 1 document + 1 licence step, tracker ${t1.done} done (${t1.pct}), money left ${t0.money[1]} -> ${t1.money[1]}, next ${t1.next}`)
    await shot(t, 'prd59-tracker-390x844')
    const hrefs = await t.$$eval('#tr-next a', a => a.map(x => x.getAttribute('href')))
    for (const h of hrefs) {
      await t.goto(BASE + '/games/' + h, { waitUntil: 'load' })
      const id = h.split('#')[1]
      const v = await t.evaluate(id => { const e = document.getElementById(id); if (!e) return null; const r = e.getBoundingClientRect(); return { open: e.classList.contains('open'), top: Math.round(r.top), vis: !!e.offsetParent } }, id)
      ok(v && v.open && v.vis && v.top >= 0 && v.top < 220, `L15: tracker link ${h} opens that step on screen (${JSON.stringify(v)})`)
    }
    ok(!e4.length, `L15: page errors ${e4.length} ${e4.slice(0, 2).join(' | ')}`)
    await ctx.close()
  }
  // L24 landing v2: "Mulai dari sini" = first open step of the family critical path; the departure is never in the past
  {
    const ctx = await b.createBrowserContext(), { p: l, errs: e6 } = await page(390, 844, ctx)
    await l.goto(BASE + '/games/relokasi-uae.html', { waitUntil: 'load' })
    const want = await l.evaluate(() => { const fm = window.UAEFamily.build([{ name: 'Anak 1', stage: 'g2' }, { name: 'Anak 2', stage: 'g2' }]); return UAEFlow.schedule(fm.steps, {}).critical[0] })
    const s0 = await l.evaluate(() => ({ lead: window.__uaeTracker.lead, shown: !document.getElementById('start').hidden, h: document.getElementById('start-h').textContent, href: document.getElementById('start-go').getAttribute('href'), plan: document.getElementById('hero-plan').textContent, meta: document.getElementById('start-meta').textContent }))
    ok(s0.shown && s0.lead === want && s0.href === 'visa-keluarga-uae.html#step-' + want && s0.h.length > 10 && /hari/.test(s0.meta), `L24: start card = critical-path step ${s0.lead} (want ${want}), "${s0.h.slice(0, 50)}", ${s0.meta}`)
    ok(/berangkat sekitar .*20\d\d/.test(s0.plan) && /Target 90 hari/.test(s0.plan), `L24: hero plan "${s0.plan}"`)
    await l.click('#start-go'); await l.waitForFunction(() => location.pathname.endsWith('visa-keluarga-uae.html'))
    await new Promise(r => setTimeout(r, 400))
    const op = await l.evaluate(id => { const li = document.getElementById('step-' + id), b = li && li.getBoundingClientRect(); return { open: !!li && li.querySelector('[aria-expanded]') ? li.querySelector('[aria-expanded]').getAttribute('aria-expanded') === 'true' : false, vis: !!b && b.top >= 0 && b.top < innerHeight } }, want)
    ok(op.open && op.vis, `L24: "Buka langkah ini" opens ${want} on screen (${JSON.stringify(op)})`)
    // a start date 4 months back with nothing done: dates run from today, the 90-day target has passed
    await l.evaluate(() => { const k = UAEStore.KEYS.familyMeta, m = UAEStore.read(k, {}); const d = new Date(); d.setDate(d.getDate() - 120); m.start = d.toISOString().slice(0, 10); UAEStore.write(k, m) })
    await l.goto(BASE + '/games/relokasi-uae.html', { waitUntil: 'load' })
    const s1 = await l.evaluate(() => ({ plan: document.getElementById('hero-plan').textContent, late: window.__uaeTracker.late }))
    await l.goto(BASE + '/games/visa-keluarga-uae.html', { waitUntil: 'load' })
    const f1 = await l.evaluate(() => ({ anchor: window.__uaeFamily.anchor, late: window.__uaeFamily.late, sum: document.getElementById('tl-sum').textContent }))
    const td = await l.evaluate(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') })
    ok(s1.late === true && /melewati target/.test(s1.plan) && f1.anchor === td && f1.late && /dihitung dari hari ini/.test(f1.sum), `L24: start 120 days back -> late ${s1.late}, family anchor ${f1.anchor} (today ${td}): "${f1.sum.slice(0, 90)}"`)
    ok(!e6.length, `L24: errors ${e6.length} ${e6.slice(0, 2).join(' | ')}`)
    await ctx.close()
  }
  // landing at 3 sizes
  for (const [w, h] of [[390, 844], [844, 390], [800, 1280]]) {
    const { p: l, errs: e3 } = await page(w, h)
    await l.goto(BASE + '/games/relokasi-uae.html', { waitUntil: 'load' })
    const r = await l.evaluate(() => { const cards = [...document.querySelectorAll('.u-menu .u-card-link'), document.getElementById('start-go')]; return { n: cards.length - 1, both: cards.length === 5 && cards.every(e => { const b = e.getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight }), ox: document.documentElement.scrollWidth - innerWidth } })
    ok(r.both && r.ox <= 0 && !e3.length, `L1 landing ${w}x${h}: all ${r.n} menus and the start button in view ${r.both}, sideways ${r.ox}, errors ${e3.length}`)
    await shot(l, `prd59-landing-${w}x${h}`)
    await l.close()
  }
  // L23 (PRD-59 8.3): Indonesian / English in place. No reload, the open step and the scroll position stay, nothing
  // readable is left in Indonesian, and switching back restores the page text exactly.
  {
    // words that only Indonesian text has; a node whose text is unchanged from ID mode and still carries one was not
    // translated (unchanged is part of the test: English text may quote an Indonesian office name)
    const IDW = '(yang|dan|atau|untuk|dengan|tidak|belum|sudah|dari|pada|bisa|harus|oleh|akan|juga|tanpa|tiap|bila|jika|karena|lalu|sebelum|setelah|dalam|langkah|biaya|selesai|lembar|sumber|dicek|sampai|buka|tutup|siap|perkiraan|gratis|asli|fotokopi|istri|lihat|simpan|hapus|catatan|pilih|semua|barang|orang|berkas|sekolah|kantor|surat|hari|kerja|ibu|anak|saya|suami|koper|akta|nikah|obat|uang|tas|baju|sepatu|ujian|soal|rambu|jalan)'
    // kept on purpose, each with its reason
    const KEEP = [
      /^Anak \d+(, Anak \d+)*$/,                       // nothing: the gate types no names, so this never matches; names the owner types stay
      /Direktorat Pembelajaran dan Kemahasiswaan/,     // official office names are not translated
      /^Kementerian Luar Negeri, Direktorat Konsuler$/,
      /^Abu Dhabi \(DARI \/ TAMM, Tawtheeq\)$/,        // three system names
      /^(STEMPEL ASLI|Kantor Imigrasi .*|Jl\. .*)$/,   // an application name, office names, street addresses
    ]
    for (const f of ['relokasi-uae.html', 'pindah-abudhabi.html', 'visa-keluarga-uae.html', 'koper-uae.html', 'ujian-sim-abudhabi.html']) {
      const { p, errs } = await page(390, 844)
      await p.goto(BASE + '/games/' + f, { waitUntil: 'load' })
      await p.waitForSelector('.u-lang button[data-lang="en"]', { timeout: 15000 }).catch(() => {})
      await sleep(400)
      const pre = await p.evaluate(() => {
        window.__noReload = 1
        const h = document.querySelector('.u-step-head'); if (h) { h.click(); h.scrollIntoView({ block: 'center' }) }
        const el = document.querySelector('.u-sec:last-of-type'); if (!h && el) el.scrollIntoView()
        window.__anc = document.elementFromPoint(innerWidth / 2, innerHeight / 2)
        window.__idText = new Set(); { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) window.__idText.add(n.data.trim().replace(/\s+/g, ' ')) }
        for (const e of document.querySelectorAll('[aria-label],[placeholder],[title]')) for (const a of ['aria-label', 'placeholder', 'title']) if (e.getAttribute(a)) window.__idText.add(e.getAttribute(a))
        return { text: document.body.innerText, y: Math.round(window.__anc.getBoundingClientRect().top), open: document.querySelectorAll('.u-step.open, li.open').length, btn: !!document.querySelector('.u-lang button[data-lang="en"]') }
      })
      await p.evaluate(() => { const b = document.querySelector('.u-lang button[data-lang="en"]'); if (b) b.click() })
      await sleep(300)
      const en = await p.evaluate((IDW, KEEP) => {
        const re = new RegExp('\\b' + IDW + '\\b', 'i'), keep = KEEP.map(k => new RegExp(k.source, k.flags)), left = []
        const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n
        while ((n = w.nextNode())) {
          const pe = n.parentElement; if (!pe || pe.closest('[data-noi18n],script,style,textarea')) continue
          const t = n.data.trim().replace(/\s+/g, ' ')
          if (t && window.__idText.has(t) && re.test(t) && !keep.some(k => k.test(t))) left.push(t.slice(0, 200))
        }
        for (const e of document.querySelectorAll('[aria-label],[placeholder],[title]')) { if (e.closest('[data-noi18n]')) continue; for (const a of ['aria-label', 'placeholder', 'title']) { const v = e.getAttribute(a); if (v && window.__idText.has(v) && re.test(v) && !keep.some(k => k.test(v))) left.push('@' + a + ' ' + v.slice(0, 200)) } }
        return { left: [...new Set(left)], marker: window.__noReload === 1, y: Math.round(window.__anc.getBoundingClientRect().top), open: document.querySelectorAll('.u-step.open, li.open').length, lang: document.documentElement.lang, pressed: document.querySelector('.u-lang button[data-lang="en"]').getAttribute('aria-pressed'), text: document.body.innerText, ox: document.documentElement.scrollWidth - innerWidth, saved: localStorage.getItem('dunia-uae-lang-v1') }
      }, IDW, KEEP.map(k => ({ source: k.source, flags: k.flags })))
      ok(pre.btn && en.marker && en.lang === 'en' && en.pressed === 'true' && en.saved === 'en', `L23 ${f}: switch to EN with no reload (marker ${en.marker}, lang ${en.lang}, saved ${en.saved})`)
      ok(en.open === pre.open && Math.abs(en.y - pre.y) < 4, `L23 ${f}: open steps ${pre.open} -> ${en.open}, the element at screen centre stays at y ${pre.y} -> ${en.y}`)
      ok(en.text !== pre.text && en.left.length === 0, `L23 ${f}: Indonesian text left in EN mode ${en.left.length} ${en.left.slice(0, 4).join(' | ')}`)
      ok(en.ox <= 0, `L23 ${f}: no sideways scroll in EN (${en.ox})`)
      // a page at its top stays at its top; the switch is 2 buttons of 48 px inside the screen
      await p.evaluate(() => { document.querySelector('.u-lang button[data-lang="id"]').click(); scrollTo(0, 0) }); await sleep(150)
      const top = await p.evaluate(() => { document.querySelector('.u-lang button[data-lang="en"]').click(); const g = document.querySelector('.u-lang').getBoundingClientRect(); return { y: scrollY, right: g.right, min: Math.min(...[...document.querySelectorAll('.u-lang button')].map(x => Math.min(x.getBoundingClientRect().width, x.getBoundingClientRect().height))) } })
      ok(top.y === 0 && top.right <= 390 && top.min >= 48, `L23 ${f}: at the top the page stays at scroll ${top.y}; switch ends at x ${Math.round(top.right)}, buttons ${Math.round(top.min)} px`)
      if (process.env.QA_L23_OUT) fs.appendFileSync(process.env.QA_L23_OUT, en.left.join('\n') + '\n')
      await shot(p, 'prd59-en-' + f.replace('.html', ''))
      await p.evaluate(() => document.querySelector('.u-lang button[data-lang="id"]').click())
      await sleep(300)
      const back = await p.evaluate(() => ({ text: document.body.innerText, marker: window.__noReload === 1, lang: document.documentElement.lang }))
      ok(back.marker && back.lang === 'id' && back.text === pre.text, `L23 ${f}: back to ID restores the page text exactly (${back.text === pre.text}), still no reload`)
      // the choice follows to the next page
      await p.evaluate(() => document.querySelector('.u-lang button[data-lang="en"]').click())
      await p.reload({ waitUntil: 'load' }); await sleep(400)
      const kept = await p.evaluate(() => ({ lang: document.documentElement.lang, h1: (document.querySelector('h1') || {}).textContent || '' }))
      ok(kept.lang === 'en' && errs.length === 0, `L23 ${f}: EN kept after a reload ("${kept.h1.slice(0, 40)}"), errors ${errs.length} ${errs[0] || ''}`)
      await p.evaluate(() => localStorage.removeItem('dunia-uae-lang-v1'))
      await p.close()
    }
  }
  // L20 + L22 (PRD-59D, 8.5 no. 3): packing ticks are saved and counted everywhere; every item explains itself with a
  // sourced tooltip, also in English (a text that only exists after a tap).
  {
    const { p, errs } = await page(390, 844)
    await p.goto(BASE + '/games/koper-uae.html', { waitUntil: 'load' }); await sleep(400)
    await p.evaluate(() => { localStorage.removeItem('dunia-uae-koper-v1'); localStorage.removeItem('dunia-uae-lang-v1') })
    await p.reload({ waitUntil: 'load' }); await sleep(400)
    const k0 = await p.evaluate(() => ({ ...window.__uaeKoper, boxes: document.querySelectorAll('.u-kp input[type=checkbox]').length, tips: document.querySelectorAll('.u-kp .u-tip').length, rows: document.querySelectorAll('.u-kp').length, noBoxInBanned: [...document.querySelectorAll('.u-kp-no')].every(li => !li.querySelector('input')) }))
    ok(k0.done === 0 && k0.boxes === k0.n && k0.rows === k0.items && k0.tips === k0.items && k0.no > 0 && k0.noBoxInBanned, `L20: ${k0.n} items to pack each with a tick box, ${k0.no} "do not bring" rows without one; L22: ${k0.tips} of ${k0.items} rows have a tooltip button`)
    for (const i of [0, 3]) await p.evaluate(i => document.querySelectorAll('.u-kp input[type=checkbox]')[i].click(), i)   // each tick redraws the list
    await sleep(200)
    await p.reload({ waitUntil: 'load' }); await sleep(400)
    const k1 = await p.evaluate(() => ({ done: window.__uaeKoper.done, checked: document.querySelectorAll('.u-kp input:checked').length, head: document.getElementById('kp-done').textContent }))
    ok(k1.done === 2 && k1.checked === 2 && /^2 dari /.test(k1.head), `L20: 2 ticks survive a reload (done ${k1.done}, checked ${k1.checked}, "${k1.head}")`)
    await p.evaluate(() => document.querySelector('[data-loc-f="jangan"]').click()); await sleep(150)
    const kf = await p.evaluate(() => ({ rows: document.querySelectorAll('.u-kp').length, other: document.querySelectorAll('.u-kp:not([data-loc="jangan"])').length, no: window.__uaeKoper.no }))
    ok(kf.rows === kf.no && kf.other === 0, `L20: filter "do not bring" shows its ${kf.rows} rows only`)
    await p.evaluate(() => document.querySelector('[data-loc-f="all"]').click()); await sleep(150)
    // every tooltip: explanation, grade + check date, at least one https source
    const tips = await p.evaluate(async () => {
      const bad = []; let n = 0
      for (const b of document.querySelectorAll('.u-kp .u-tip')) {
        b.click(); n++
        const t = document.getElementById('u-tipbox-p').textContent.trim(), g = document.getElementById('u-tipbox-g').textContent, src = [...document.querySelectorAll('#u-tipbox-s a')].map(a => a.href)
        // advice with no rule behind it says so and may cite nothing; a row graded official or secondary must cite a source
        const advice = /^Saran, belum ada aturan/.test(g)
        if (t.length < 20 || !/20\d\d-\d\d-\d\d/.test(g) || !src.every(u => /^https:\/\//.test(u)) || (!advice && !src.length)) bad.push(b.dataset.tip)
        if (advice) window.__advice = (window.__advice || 0) + 1
        document.getElementById('u-tipbox-x').click()
      }
      return { n, bad, advice: window.__advice || 0 }
    })
    ok(tips.n === k0.items && tips.bad.length === 0, `L22: ${tips.n} packing tooltips each carry an explanation and a grade with its check date; ${tips.n - tips.advice} graded rows cite https sources, ${tips.advice} are marked advice with no rule (bad: ${tips.bad.slice(0, 4).join(', ')})`)
    await p.evaluate(() => document.querySelector('.u-lang button[data-lang="en"]').click()); await sleep(200)
    const tipEn = await p.evaluate(async () => {
      const left = []
      for (const b of document.querySelectorAll('.u-kp .u-tip')) {
        const idText = window.UAEKoper.groups.flatMap(g => g.items).find(x => x.id === b.dataset.tip)
        b.click(); await new Promise(r => setTimeout(r, 0)); await new Promise(r => requestAnimationFrame(r))
        const t = document.getElementById('u-tipbox-p').textContent.trim(), h = document.getElementById('u-tipbox-h').textContent.trim(), g = document.getElementById('u-tipbox-g').textContent
        if (t === idText.tip || /dicek/.test(g)) left.push(b.dataset.tip)   // the title may be the same in both languages ("Hand sanitizer")
        document.getElementById('u-tipbox-x').click()
      }
      return left
    })
    ok(tipEn.length === 0 && errs.length === 0, `L22/L23: in EN every packing tooltip (text made on tap) is English; left in Indonesian ${tipEn.length} ${tipEn.slice(0, 4).join(', ')}; errors ${errs.length}`)
    await p.evaluate(() => { localStorage.removeItem('dunia-uae-lang-v1') })
    // the landing counts the same ticks
    await p.goto(BASE + '/games/relokasi-uae.html', { waitUntil: 'load' }); await sleep(400)
    const ls = await p.evaluate(() => document.getElementById('stat-koper').textContent)
    ok(/^2 dari \d+ siap/.test(ls), `L20: the landing shows the same count ("${ls}")`)
    await p.evaluate(() => localStorage.removeItem('dunia-uae-koper-v1'))
    await p.close()
  }
} finally { await b.close() }
console.log(`qa-prd59-uae: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
