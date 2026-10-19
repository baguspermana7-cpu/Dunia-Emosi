// qa-mojo-team.mjs — Balapan team choice: Balapan -> "Pilih Tim Balap" (Tim Mojo | Tim Film Balap).
// Tim Film Balap (owner 2026-10-18): the owner's film racers (MojoRacerSheets, three rear views each) and missions of
// three kinds -- race (catch the racer ahead: Mack, Sally, the circuit leader...), robber (chase and net a thief),
// escape (a pursuer behind: Sheriff's game of tag). Each kind is played to its end on the chase engine.
// Server: Dunia on :8081.   node tools/qa-mojo-team.mjs
import puppeteer from 'puppeteer'
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m) } else { fail++; console.log('  ✗ ' + m) } }
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output'] })
async function mission (p, id) {
  await p.click(`.race-card[data-mission="${id}"]`)
  await p.waitForSelector('#mc-go, .mcp-go', { timeout: 20000 }); await sleep(400)
  const intro = await p.evaluate(() => document.body.innerText)
  await p.evaluate(() => { const g = document.querySelector('.mcp-go') || document.querySelector('#mc-go'); g.click() })
  await p.waitForFunction(() => window.__mojoChase && __mojoChase.state().state === 'active', { timeout: 30000 }).catch(() => {})
  await sleep(1500)
  return intro
}
for (const [w, h] of [[844, 390], [390, 844], [1280, 800]]) {
  const tag = w + 'x' + h
  const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message))
  p.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()) })
  await p.setViewport({ width: w, height: h, isMobile: w < 900, hasTouch: w < 900 })
  await p.goto((process.env.BASE || 'http://localhost:8081') + '/games/mojo-swoptops.html?unlock=1', { waitUntil: 'networkidle0' })
  await p.evaluate(() => { const b = document.querySelector('#scr-splash .splash-stage>.btn'); if (b) b.click() }); await sleep(300)
  await p.click('#btn-race'); await sleep(500)
  const teams = await p.evaluate(() => [...document.querySelectorAll('.team-card')].map(c => { const r = c.getBoundingClientRect(); return { id: c.dataset.team, w: r.width, h: r.height, in: r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1, soon: !!c.querySelector('.soon') } }))
  ok(teams.length === 2 && teams.every(t => t.in && t.h >= 120), `${tag}: Balapan opens the team choice — 2 cards on screen (${teams.map(t => t.id + ' ' + Math.round(t.w) + 'x' + Math.round(t.h)).join(', ')})`)
  ok(!teams.find(t => t.id === 'film').soon, `${tag}: the film team no longer says "segera hadir"`)
  await p.click('.team-card[data-team="mojo"]'); await sleep(500)
  ok((await p.evaluate(() => document.querySelectorAll('.race-card[data-stage]').length)) >= 20, `${tag}: Tim Mojo shows the Mojo stage list`)
  await p.click('#scr-race .topbar .btn'); await sleep(400)
  await p.click('.team-card[data-team="film"]'); await sleep(500)
  await p.waitForFunction(() => [...document.querySelectorAll('.racer-chip img, .race-card[data-mission] .tgt')].every(i => i.complete), { timeout: 15000 }).catch(() => {})
  const film = await p.evaluate(() => ({ racers: document.querySelectorAll('.racer-bar:not(.rival-bar) .racer-chip').length, sheets: Object.keys(window.MojoRacerSheets || {}).length, missions: document.querySelectorAll('.race-card[data-mission]').length,
    race: document.querySelectorAll('.race-card.film-race').length, robber: document.querySelectorAll('.race-card.film-robber').length, escape: document.querySelectorAll('.race-card.film-escape').length,
    bad: [...document.querySelectorAll('.racer-chip img, .race-card[data-mission] .tgt')].filter(i => !(i.complete && i.naturalWidth > 0)).map(i => i.src.split('/').pop()) }))
  ok(film.racers === film.sheets && film.racers >= 20 && film.missions >= 36 && film.race >= 6 && film.robber >= 3 && film.escape >= 2, `${tag}: Tim Film Balap — ${film.racers} racers (${film.sheets} sheet sets), ${film.missions} missions (${film.race} race, ${film.robber} robber, ${film.escape} escape)`)
  ok(!film.bad.length, `${tag}: every racer and target picture loads ${film.bad.slice(0, 3)}`)
  // the opponent bar: pick Mack, a race mission then names Mack; back to Otomatis
  await p.click('.rival-bar .racer-chip[data-rival="mack"]'); await sleep(500)
  ok(await p.evaluate(() => MojoChaseMenu.load().film.rival === 'mack' && /Susul Mack/.test(document.querySelector('.race-card[data-mission="f-sally"]').textContent)), `${tag}: choosing Mack as the opponent renames the race missions ("Susul Mack")`)
  await p.click('.rival-bar .racer-chip[data-rival="auto"]'); await sleep(500)
  ok(await p.evaluate(() => /Balapan di Ngarai/.test(document.querySelector('.race-card[data-mission="f-sally"]').textContent)), `${tag}: Otomatis restores each mission's own rival`)
  await p.click('.racer-chip[data-racer="tow-mater"]'); await sleep(400)
  ok(await p.evaluate(() => document.querySelector('.racer-chip.on').dataset.racer === 'tow-mater' && MojoChaseMenu.load().film.racer === 'tow-mater'), `${tag}: the chosen racer is highlighted and saved`)
  if (w === 1280 || w === 390) {
    // RACE: catch Mack on the night highway
    let intro = await mission(p, 'f-mack')
    ok(/Mack/.test(intro) && !/Pilih wujud Mojo/.test(intro), `${tag} race: the intro names Mack, no Mojo form picker`)
    let st = await p.evaluate(() => __mojoChase.state())
    ok(st.mode === 'race' && st.racerSheet && st.targetSheet && st.stage === 'tol-malam', `${tag} race: the chosen racer and Mack both drive their own three-view sheets (${JSON.stringify({ m: st.mode, r: st.racerSheet, t: st.targetSheet, s: st.stage })})`)
    ok(await p.evaluate(() => /SUSUL MACK/.test(document.querySelector('.mc-title').textContent)), `${tag} race: the HUD says SUSUL MACK!`)
    // steering: a lane change turns the car into its side view and back
    const steer = await p.evaluate(async () => { const s = [], dir = __mojoChase.state().lane < 2 ? 1 : -1; document.dispatchEvent(new KeyboardEvent('keydown', { key: dir > 0 ? 'ArrowRight' : 'ArrowLeft', bubbles: true })); for (let i = 0; i < 14; i++) { await new Promise(r => setTimeout(r, 40)); { const z0 = __mojoChase.state(); s.push([z0.steer * dir, z0.curveSteer * dir]) } } await new Promise(r => setTimeout(r, 900)); const z = __mojoChase.state(); return { s, end: z.steer - z.curveSteer } })
    // the turn pose rises clearly above whatever the road's curve already asks (the sum saturates at 1), then lets go
    const pk = Math.max(...steer.s.map(x => x[0])), cv = Math.max(...steer.s.map(x => x[1]))
    const kick = Math.max(...steer.s.map(x => x[0] - x[1]))   // the lane change's own share (a bend against it lowers the sum, not the kick)
    ok((pk >= Math.min(0.95, Math.max(0.35, cv + 0.25)) || kick >= 0.6) && Math.abs(steer.end) < 0.2, `${tag} race: a lane change steers into the turn (peak ${pk.toFixed(2)}, curve ${cv.toFixed(2)}, kick ${kick.toFixed(2)}) and straightens, the road's own curve aside (${steer.end.toFixed(2)})`)
    await p.evaluate(() => { __mojoChase.force({ prog: 0.97, best: 0.97 }); __mojoChase.auto({ mode: 'clean' }) })
    await p.waitForFunction(() => __mojoChase.state().state === 'result', { timeout: 30000 }).catch(() => {})
    const res = await p.evaluate(() => ({ t: document.body.innerText, cast: [...document.querySelectorAll('.cast img')].map(i => i.complete && i.naturalWidth > 0) }))
    ok(/Mack Tersusul/.test(res.t) && res.cast.length === 2 && res.cast.every(Boolean), `${tag} race: the result says "Mack Tersusul!" with both racers pictured`)
    await p.click('#mc-done'); await sleep(800)
    ok(await p.evaluate(() => (MojoChaseMenu.load().film.st['f-mack'] || {}).stars >= 1 && !!document.querySelector('.racer-chip')), `${tag} race: stars saved, back on the film list`)
    // ESCAPE: Sheriff behind -- caught when the pressure fills, free at the finish
    intro = await mission(p, 'f-sheriff')
    st = await p.evaluate(() => __mojoChase.state())
    ok(st.mode === 'escape' && st.pursuer, `${tag} escape: Sheriff's mirror badge is loaded (${st.mode})`)
    await p.evaluate(() => { window.__mcNoCrashQuiz = 1; __mojoChase.emitTest('brok') }); await sleep(300)   // no crash question pausing the run here
    ok((await p.evaluate(() => __mojoChase.state().press)) >= 0.25, `${tag} escape: a crash brings Sheriff closer`)
    await p.evaluate(() => __mojoChase.force({ press: 1 })); await sleep(600)
    ok(/Sheriff menyusulmu/.test(await p.evaluate(() => document.body.innerText)), `${tag} escape: when he draws level the card says "Sheriff menyusulmu!" (with COBA LAGI)`)
    await p.click('#mc-retry'); await sleep(1500)
    await p.waitForFunction(() => window.__mojoChase && __mojoChase.state().state === 'active' && __mojoChase.state().press === 0, { timeout: 40000 }).catch(() => {}); await sleep(800)
    await p.evaluate(() => { __mojoChase.force({ prog: 0.97, best: 0.97, press: 0 }); __mojoChase.auto({ mode: 'clean' }) })
    await p.waitForFunction(() => __mojoChase.state().state === 'result', { timeout: 30000 }).catch(() => {})
    ok(/Kamu Lolos/.test(await p.evaluate(() => document.body.innerText)), `${tag} escape: reaching the finish says "Kamu Lolos!"`)
    await p.click('#mc-done'); await sleep(800)
    ok(await p.evaluate(() => MojoChaseMenu.load().form !== 'grapple'), `${tag}: a film racer never overwrote the child's Mojo form`)
  }
  ok(!errs.length, `${tag}: no page errors ${errs.slice(0, 2).join(' | ')}`)
  await p.close()
}
await b.close()
console.log(`\nqa-mojo-team: ${pass}/${pass + fail} checks passed`)
process.exit(fail ? 1 : 0)
