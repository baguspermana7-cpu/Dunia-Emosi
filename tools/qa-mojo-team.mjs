// qa-mojo-team.mjs — Balapan team choice (owner 2026-10-17): Balapan -> "Pilih Tim Balap" (Tim Mojo | Tim Film Balap);
// Tim Mojo = the stage list as before; Tim Film Balap = a racer bar + missions that chase the robber OR the rival team;
// a rival mission plays on the chase engine with the chosen racer, says "rival" (not "pencuri") and saves its stars.
// Server: Dunia on :8081.   node tools/qa-mojo-team.mjs
import puppeteer from 'puppeteer'
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m) } else { fail++; console.log('  ✗ ' + m) } }
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output'] })
for (const [w, h] of [[844, 390], [390, 844], [1280, 800]]) {
  const tag = w + 'x' + h
  const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message))
  await p.setViewport({ width: w, height: h, isMobile: w < 900, hasTouch: w < 900 })
  await p.goto((process.env.BASE || 'http://localhost:8081') + '/games/mojo-swoptops.html?unlock=1', { waitUntil: 'networkidle0' })
  await p.evaluate(() => { const b = document.querySelector('#scr-splash .splash-stage>.btn'); if (b) b.click() }); await sleep(300)
  await p.click('#btn-race'); await sleep(500)
  const teams = await p.evaluate(() => [...document.querySelectorAll('.team-card')].map(c => { const r = c.getBoundingClientRect(); return { id: c.dataset.team, w: r.width, h: r.height, in: r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1 } }))
  ok(teams.length === 2 && teams.every(t => t.in && t.h >= 120), `${tag}: Balapan opens the team choice — 2 cards on screen (${teams.map(t => t.id + ' ' + Math.round(t.w) + 'x' + Math.round(t.h)).join(', ')})`)
  await p.click('.team-card[data-team="mojo"]'); await sleep(500)
  ok((await p.evaluate(() => document.querySelectorAll('.race-card[data-stage]').length)) >= 20, `${tag}: Tim Mojo shows the Mojo stage list`)
  await p.click('#scr-race .topbar .btn'); await sleep(400)
  ok(!!(await p.$('.team-card[data-team="film"]')), `${tag}: Kembali from the stage list returns to the team choice`)
  await p.click('.team-card[data-team="film"]'); await sleep(500)
  await p.waitForFunction(() => [...document.querySelectorAll('.racer-chip img, .race-card[data-mission] .tgt')].every(i => i.complete), { timeout: 10000 }).catch(() => {})
  const film = await p.evaluate(() => ({ racers: document.querySelectorAll('.racer-chip').length, missions: document.querySelectorAll('.race-card[data-mission]').length,
    rival: document.querySelectorAll('.race-card.film-rival').length, robber: document.querySelectorAll('.race-card.film-robber').length,
    imgs: [...document.querySelectorAll('.racer-chip img, .race-card[data-mission] .tgt')].every(i => i.complete && i.naturalWidth > 0) }))
  ok(film.racers === 6 && film.missions === 8 && film.rival >= 4 && film.robber >= 2, `${tag}: Tim Film Balap — ${film.racers} racers, ${film.missions} missions (${film.rival} rival, ${film.robber} robber)`)
  ok(film.imgs, `${tag}: every racer and target picture loads`)
  // pick a racer, it is remembered
  await p.click('.racer-chip[data-racer="biru"]'); await sleep(400)
  ok(await p.evaluate(() => document.querySelector('.racer-chip.on').dataset.racer === 'biru' && MojoChaseMenu.load().film.racer === 'biru'), `${tag}: the chosen racer is highlighted and saved`)
  if (w === 1280) {
    // play a rival mission to the end
    await p.click('.race-card[data-mission="f-gugur"]')
    await p.waitForSelector('#mc-go, .mcp-go', { timeout: 20000 }); await sleep(400)
    const intro = await p.evaluate(() => document.body.innerText)
    ok(/rival/i.test(intro) && !/Pilih wujud Mojo/.test(intro), 'rival mission: the intro talks about the rival, no Mojo form picker')
    await p.evaluate(() => { const g = document.querySelector('.mcp-go') || document.querySelector('#mc-go'); g.click() }); await sleep(4500)
    const st0 = await p.evaluate(() => __mojoChase.state())
    ok(st0.form === 'jet2' && st0.stage === 'musim-gugur', `rival mission drives the chosen racer (${st0.form}) on the autumn stage (${st0.stage})`)
    await p.evaluate(() => { __mojoChase.force({ prog: 0.97, best: 0.97, hasRocket: true, rocket: 1 }); __mojoChase.auto({ mode: 'clean' }) })
    await p.waitForFunction(() => __mojoChase.state().state === 'result', { timeout: 60000 }).catch(() => {})
    const res = await p.evaluate(() => document.body.innerText)
    ok(/Rival Terkejar/.test(res), 'the result says "Rival Terkejar!"')
    await p.click('#mc-done'); await sleep(800)
    ok(await p.evaluate(() => (MojoChaseMenu.load().film.st['f-gugur'] || {}).stars >= 1 && !!document.querySelector('.racer-chip')), 'film stars saved, back on the Tim Film Balap list')
    ok(await p.evaluate(() => MojoChaseMenu.load().form !== 'jet2'), "a film racer never overwrote the child's Mojo form")
  }
  ok(!errs.length, `${tag}: no page errors ${errs.slice(0, 2).join(' | ')}`)
  await p.close()
}
await b.close()
console.log(`\nqa-mojo-team: ${pass}/${pass + fail} checks passed`)
process.exit(fail ? 1 : 0)
