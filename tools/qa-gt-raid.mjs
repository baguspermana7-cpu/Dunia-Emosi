// qa-gt-raid.mjs — Monster Rush as a raid (owner 2026-10-17): the monster stays big with a health bar; a right answer
// hurts it (white blink, knock-back, bar drops, white trail drains after), a wrong answer makes it strike the player's
// panel (red flash + "Aduh!", no points lost), the bar at zero = an early KO ("Raid berhasil!").
// Server: Dunia on :8081.   node tools/qa-gt-raid.mjs
import puppeteer from 'puppeteer'
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m) } else { fail++; console.log('  ✗ ' + m) } }
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output'] })
for (const [w, h, MON] of [[844, 390, 'gt-monster/robo-gorilla'], [390, 844, 'gt-monster/robo-gorilla'], [844, 390, 'gt-monster/mecha-ember-golem'], [390, 844, 'gt-monster/mecha-frost-yeti']]) {
  const tag = w + 'x' + h + (/mecha/.test(MON) ? ' animated' : ' still')
  const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message))
  await p.setViewport({ width: w, height: h, isMobile: true, hasTouch: true })
  await p.goto((process.env.BASE || 'http://localhost:8081') + '/games/garasi-tempur.html', { waitUntil: 'load' })
  await p.waitForFunction(() => window.GTQuiz && typeof GTQuiz.rush === 'function', { timeout: 15000 }).catch(() => {}) // PRD-47: wait for the module, not 800 ms
  // PRD-47: the rush is a 15 s wall clock; on a loaded machine the checks below outran it (3 of 5 runs red). Slow the
  // page clock to 1/4 (continuous, no jump) so the checks see the round, not its time-out. The 15 s is not under test here.
  await p.evaluate(() => { const real = Date.now.bind(Date), s0 = real(); Date.now = () => s0 + (real() - s0) / 4 })
  await p.evaluate((MON) => {
    const host = document.createElement('div'); host.id = 'raid-host'; host.style.cssText = 'position:fixed;inset:0;z-index:999'; document.body.appendChild(host)
    window.__done = null
    window.__r = GTQuiz.rush({ host, players: [{ human: true, name: 'Kamu' }, { human: false, name: 'Komputer' }], aiPace: [999999, 0], level: 'mudah', seed: 5,
      lib: k => '../assets/db/lib/' + k + '.webp', monster: { key: MON, name: 'Monster' }, sfx: {}, onDone: r => { window.__done = r } })
  }, MON)
  await p.waitForFunction(() => document.querySelector('#raid-host .rush.play') && document.querySelector('#rush-c0 .rush-b:not([disabled])'), { timeout: 15000 })
  await sleep(300)
  const big = await p.evaluate(() => { const m = document.querySelector('.rush-mbox').getBoundingClientRect(); return { w: m.width, h: m.height, vw: innerWidth, vh: innerHeight } })
  ok(big.h >= big.vh * 0.45, `${tag}: the monster is big (${Math.round(big.h)} px of ${big.vh})`)
  await p.waitForFunction(() => +getComputedStyle(document.querySelector('.rush-boss')).opacity > 0.9, { timeout: 10000 }).catch(() => {})   // its fade-in (.3 s) on a slow machine
  const bar0 = await p.evaluate(() => { const b = document.querySelector('.rush-boss').getBoundingClientRect(); return { vis: getComputedStyle(document.querySelector('.rush-boss')).opacity, w: b.width, top: b.top } })
  if (/mecha/.test(MON)) {   // the owner's animated monster: its sheet plays on a canvas in place of the still
    const an = await p.evaluate(() => { const c = document.querySelector('canvas.mon-anim'); if (!c) return null; const r = c.getBoundingClientRect(), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 64) if (d[i] > 0) n++; return { w: r.width, h: r.height, painted: n, img: getComputedStyle(document.querySelector('img.rush-mon')).display, st: __r._anim() } })
    ok(an && an.painted > 200 && an.img === 'none' && an.h > 150 && an.st === 'idle', `${tag}: the animated sheet plays on a canvas in place of the still (${an && Math.round(an.w)}x${an && Math.round(an.h)}, ${an && an.st})`)
    // PRD-47: compare whole frames over up to 2 s (two frames 400 ms apart, compared by URL length, flaked on a slow machine)
    const moved = await p.evaluate(() => new Promise(res => { const c = document.querySelector('canvas.mon-anim'), f0 = c.toDataURL(), t0 = performance.now()
      const f = () => { if (c.toDataURL() !== f0) return res(true); if (performance.now() - t0 > 2000) return res(false); setTimeout(f, 150) }; setTimeout(f, 150) }))
    ok(moved, `${tag}: the monster is moving (frames differ)`)
  }
  ok(+bar0.vis > 0.9 && bar0.w > 150 && bar0.top >= 0, `${tag}: the monster's health bar shows (${Math.round(bar0.w)} px wide, opacity ${bar0.vis}, top ${Math.round(bar0.top)})`)
  const answer = () => p.evaluate(() => { const t = document.querySelector('#rush-q0').textContent.replace(/×/g, '*').replace(/−/g, '-').replace(/[^0-9+\-*= ]/g, '').split('=')[0]; return Function('return ' + t)() })
  async function tapV (v) { const el = await p.$(`#rush-c0 .rush-b[data-v="${v}"]:not([disabled])`); if (!el) return false; const bx = await el.boundingBox(); await p.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2); return true }
  // a right answer: hurt + bar drop + trail lag
  let a = await answer()
  // PRD-47: 'hurt' lives 160 ms; rAF polling on a loaded machine missed it. A MutationObserver sees every class flip.
  const watch = p.evaluate(() => new Promise(res => { const seen = { hurt: false, lag: false }, t0 = performance.now()
    const mo = new MutationObserver(() => { if (document.querySelector('.rush-mon.hurt')) seen.hurt = true }); mo.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] })
    const f = () => { if (document.querySelector('.rush-mon.hurt')) seen.hurt = true; const fi = document.querySelector('.rb-fill').getBoundingClientRect().width, tr = document.querySelector('.rb-trail').getBoundingClientRect().width; if (tr > fi + 5) seen.lag = true; if (performance.now() - t0 < 4000) setTimeout(f, 16); else { mo.disconnect(); res(seen) } }; f() }))
  ok(await tapV(a), `${tag}: tapped the right answer (${a})`)
  if (process.env.SHOTS) { await sleep(330); await p.screenshot({ path: `${process.env.SHOTS}/raid-hit-${tag}.png` }) }
  const sw = await watch
  ok(sw.hurt, `${tag}: right answer -> the monster blinks white (hurt)`)
  ok(sw.lag, `${tag}: the health bar drops and its white trail drains after`)
  ok((await p.evaluate(() => __r._hp())) < 1, `${tag}: monster health went down (${(await p.evaluate(() => __r._hp())).toFixed(2)})`)
  // PRD-47: wait for the next question's buttons instead of a fixed 400 ms, and pick the wrong value among enabled ones
  await p.waitForFunction(() => document.querySelector('#rush-c0 .rush-b:not([disabled])'), { timeout: 6000 }).catch(() => {})
  // a wrong answer: the monster strikes the panel, points unchanged
  const pts0 = await p.evaluate(() => +document.querySelector('#rush-s0').textContent)
  a = await answer()
  const wrong = await p.evaluate(a => [...document.querySelectorAll('#rush-c0 .rush-b:not([disabled])')].map(b => +b.dataset.v).find(v => v !== a), a)
  const ouch = p.evaluate(() => new Promise(res => { const t0 = performance.now(); let hit = false
    const mo = new MutationObserver(() => { if (document.querySelector('.rush-half.ouch')) hit = true }); mo.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] })
    const f = () => { if (hit || document.querySelector('.rush-half.ouch')) { mo.disconnect(); return res(true) } if (performance.now() - t0 < 4000) setTimeout(f, 16); else { mo.disconnect(); res(false) } }; f() }))
  ok(await tapV(wrong), `${tag}: tapped a wrong answer (${wrong})`)
  if (process.env.SHOTS) { await sleep(560); await p.screenshot({ path: `${process.env.SHOTS}/raid-ouch-${tag}.png` }) }
  ok(await ouch, `${tag}: wrong answer -> the monster strikes the player's panel (red flash)`)
  ok((await p.evaluate(() => +document.querySelector('#rush-s0').textContent)) === pts0, `${tag}: a wrong answer costs no points (${pts0})`)
  // knock it out: right answers until the bar is empty -> early "Raid berhasil!"
  for (let k = 0; k < 20 && !(await p.evaluate(() => !!document.querySelector('.rush-end'))); k++) { await sleep(350); const v = await answer().catch(() => null); if (v != null) await tapV(v) }
  await p.waitForFunction(() => document.querySelector('.rush-end'), { timeout: 8000 }).catch(() => {})
  const end = await p.evaluate(() => (document.querySelector('.rush-end') || {}).textContent || '')
  // PRD-47: 'Raid berhasil' is only written on a KO (a time-out writes 'Waktu habis'), so the message proves 'early'
  ok(/Raid berhasil/.test(end), `${tag}: an empty bar knocks it out early — "${end.slice(0, 40)}"`)
  await p.waitForFunction(() => window.__done, { timeout: 8000 }).catch(() => {})
  ok(!!(await p.evaluate(() => window.__done)), `${tag}: the round reports its result`)
  ok(!errs.length, `${tag}: no page errors ${errs.slice(0, 2).join(' | ')}`)
  await p.close()
}
await b.close()
console.log(`\nqa-gt-raid: ${pass}/${pass + fail} checks passed`)
process.exit(fail ? 1 : 0)
