// A-323b/A-327/v57.3 probe — drives the SHARED-SCENE Balapan Kereta PvP redesign.
// Landscape 1024x600 + 900x500 + portrait 390x844. Asserts ONE shared scene
// (zero .gvs-band, zero .qz-pill), bg plate, 2 non-tiny trains, P2 HUD+controls
// LEFT/blue, P1 RIGHT/green, top-center "PVP MODE" + a DYNAMIC leg name (proved
// by booting level 1 AND level 5), bottom-center BOOST, per-side ENERGY+TOKEN,
// NAIK moves the train, spawnToken raises energy, boost surges only that train,
// dist→99 shows the win banner, 0 console errors. Screenshots every state.
import puppeteer from 'puppeteer'
import fs from 'fs'
const OUT = 'tools/qa-out'; fs.mkdirSync(OUT, { recursive: true })
const IGNORE = /favicon|pokemondb|showdown|net::ERR|Failed to load resource|googleapis|gstatic|unpkg/i
const sleep = ms => new Promise(r => setTimeout(r, ms))
const URL = 'http://localhost:8081/games/balapan-kereta.html'

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] })
let fail = 0
const check = (cond, msg) => { console.log((cond ? '  ok  ' : ' FAIL ') + msg); if (!cond) fail++ }

async function boot (w, h, level) {
  const page = await browser.newPage()
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 })
  const errs = []
  page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()) })
  page.on('pageerror', e => { if (!IGNORE.test(e.message)) errs.push('PE:' + e.message) })
  await page.evaluateOnNewDocument((lvl) => {
    localStorage.setItem('g14-tutorial-seen', '1'); sessionStorage.setItem('g14-hinted', '1')
    localStorage.removeItem('dunia-pvp-names')
    sessionStorage.setItem('g14Config', JSON.stringify({ level: lvl, trainKey: 'aeg_thomas', train: 'aeg_thomas', difficulty: 'easy' }))
  }, level)
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await sleep(1500)
  await page.evaluate(() => {
    try { const t = TRAIN_MAP['aeg_thomas']; S.trainCfg = { ...t, variant: 1 }; window.selectedTrainKey = t.key } catch (e) {}
    window.g14GoRace()
  })
  await sleep(400)
  return { page, errs }
}

// walk the mode modal → PvP → names → into the shared arena
async function intoArena (page, n1, n2) {
  await page.evaluate(() => document.querySelector('.gvs-card[data-mode="pvp"]').click())
  await sleep(320)
  await page.type('.gvs-input[data-idx="0"]', n1)
  await page.type('.gvs-input[data-idx="1"]', n2)
  await page.evaluate(() => document.querySelector('#gvs-go').click())
  await sleep(700)
}

async function legText (page) {
  return await page.evaluate(() => { const e = document.querySelector('.gvs-banner [data-leg]'); return e ? e.textContent.trim() : '' })
}

// ── Landscape 1024x600 — full assertion pass ────────────────────────────────
console.log('\n[landscape 1024x600 — level 1]')
let leg1 = ''
{
  const { page, errs } = await boot(1024, 600, 1)
  check(!!(await page.$('.gvs-modal')), 'mode-select modal appears')
  const cards = await page.$$eval('.gvs-card', els => els.map(e => e.getAttribute('data-mode')))
  check(cards.join(',') === 'adventure,pvp,tournament', 'three mode cards (adventure/pvp/tournament)')
  await page.screenshot({ path: `${OUT}/pvp-1-mode-1024.png` })

  await intoArena(page, 'Biru', 'Hijau')
  check(!!(await page.$('#g14vs')), 'shared arena mounts (#g14vs)')
  check(!!(await page.$('.gvs-scene')), 'ONE .gvs-scene present')
  check((await page.$$('.gvs-band')).length === 0, 'ZERO .gvs-band (no stacked race bands)')
  check((await page.$$('.qz-pill')).length === 0, 'ZERO .qz-pill (no math quiz)')

  const scene = await page.evaluate(() => {
    const q = s => document.querySelector(s)
    const bg = q('.gvs-bg')
    const banner = q('.gvs-banner')
    const boost = q('.gvs-boost')
    const trains = [...document.querySelectorAll('.gvs-train')].map(t => t.getBoundingClientRect())
    const hud2 = q('.gvs-hud.p2'), hud1 = q('.gvs-hud.p1')
    const side2 = q('.gvs-side.p2'), side1 = q('.gvs-side.p1')
    const foot2 = q('.gvs-foot.p2'), foot1 = q('.gvs-foot.p1')
    const cs = el => el ? getComputedStyle(el) : null
    const r = el => el ? el.getBoundingClientRect() : null
    const W = window.innerWidth
    return {
      bgSrc: bg ? bg.getAttribute('src') : '',
      bgShown: bg ? (bg.style.display !== 'none') : false,
      bannerTxt: banner ? banner.textContent : '',
      bannerCenter: banner ? Math.abs((r(banner).left + r(banner).right) / 2 - W / 2) < 60 : false,
      boost: !!boost,
      boostCenter: boost ? Math.abs((r(boost).left + r(boost).right) / 2 - W / 2) < 60 : false,
      boostBottom: boost ? r(boost).top > window.innerHeight * 0.6 : false,
      trainCount: trains.length,
      trainMinH: trains.length ? Math.min(...trains.map(t => t.height)) : 0,
      hud2Left: r(hud2) && r(hud1) ? r(hud2).left < r(hud1).left : false,
      hud2E: cs(hud2) ? cs(hud2).getPropertyValue('--e').trim() : '',
      hud1E: cs(hud1) ? cs(hud1).getPropertyValue('--e').trim() : '',
      side2Left: r(side2) && r(side1) ? r(side2).left < r(side1).left : false,
      side2W: side2 ? r(side2.querySelector('.gvs-slane')).width : 0,
      foot2Left: r(foot2) && r(foot1) ? r(foot2).left < r(foot1).left : false,
      foot2Energy: !!(foot2 && foot2.querySelector('.efill')),
      foot2Token: !!(foot2 && foot2.querySelector('.tok')),
      foot1Energy: !!(foot1 && foot1.querySelector('.efill')),
      foot1Token: !!(foot1 && foot1.querySelector('.tok'))
    }
  })
  check(/level01/.test(scene.bgSrc) && scene.bgShown, 'bg plate present (level01 webp) — ' + scene.bgSrc)
  check(/PVP MODE/.test(scene.bannerTxt) && scene.bannerCenter, 'top-center banner reads "PVP MODE"')
  check(scene.trainCount === 2, 'exactly 2 trains in the shared scene')
  check(scene.trainMinH >= 40, 'trains are NOT tiny (min height ' + Math.round(scene.trainMinH) + 'px ≥ 40)')
  check(scene.hud2Left, 'P2 HUD is LEFT of P1 HUD')
  check(scene.hud2E === '#2a7fd4', 'P2 HUD is BLUE (--e #2a7fd4) — got ' + scene.hud2E)
  check(scene.hud1E === '#12b866', 'P1 HUD is GREEN (--e #12b866) — got ' + scene.hud1E)
  check(scene.side2Left, 'P2 side controls on far-LEFT, P1 far-RIGHT')
  check(scene.side2W >= 44, 'side lane buttons ≥44px (' + Math.round(scene.side2W) + 'px)')
  check(scene.boost && scene.boostCenter && scene.boostBottom, 'BOOST medallion bottom-CENTER')
  check(scene.foot2Left && scene.foot2Energy && scene.foot2Token, 'bottom-LEFT foot: P2 ENERGY + TOKEN')
  check(scene.foot1Energy && scene.foot1Token, 'bottom-RIGHT foot: P1 ENERGY + TOKEN')
  await page.screenshot({ path: `${OUT}/pvp-2-scene-1024.png` })

  leg1 = await legText(page)
  check(leg1.length > 0, 'dynamic leg name shown (level 1): "' + leg1 + '"')

  // NAIK moves the train
  const moved = await page.evaluate(async () => {
    const t = document.querySelector('.gvs-train.p2')
    const before = t.getBoundingClientRect().top
    document.querySelector('.gvs-side.p2 .gvs-slane').click()  // ▲ NAIK
    await new Promise(r => setTimeout(r, 260))
    const after = t.getBoundingClientRect().top
    return { before, after, delta: before - after }
  })
  check(Math.abs(moved.delta) > 4, 'NAIK moves the P2 train up (Δtop ' + Math.round(moved.delta) + 'px)')

  // spawnToken → energy rises
  const energyRise = await page.evaluate(async () => {
    const P = window.__g14pvp.byside('p2')
    const before = P.energy
    window.__g14pvp.spawnToken('p2')
    await new Promise(r => setTimeout(r, 500))
    return { before, after: window.__g14pvp.byside('p2').energy }
  })
  check(energyRise.after > energyRise.before, 'spawnToken → P2 energy rises (' + energyRise.before + '→' + energyRise.after + ')')

  // boost surges ONLY that train
  const surge = await page.evaluate(async () => {
    window.__g14pvp.boost('p1')
    await new Promise(r => setTimeout(r, 200))
    const s1 = parseInt(document.querySelector('.gvs-hud.p1 .spdv').textContent) || 0
    const s2 = parseInt(document.querySelector('.gvs-hud.p2 .spdv').textContent) || 0
    return { s1, s2 }
  })
  check(surge.s1 > surge.s2 + 20, 'BOOST surges ONLY P1 (P1 ' + surge.s1 + ' km/h > P2 ' + surge.s2 + ')')
  await page.screenshot({ path: `${OUT}/pvp-3-boost-1024.png` })

  // dist→99 → win banner
  await page.evaluate(() => window.__g14pvp.setDist('p1', 99))
  await sleep(900)
  const win = await page.$('.gvs-panel'); check(!!win, 'dist→99 shows the win banner')
  const title = win ? await page.$eval('.gvs-panel h1', e => e.textContent) : ''
  check(/Menang/.test(title), 'win banner reads "<name> Menang!" — got ' + JSON.stringify(title))
  await page.screenshot({ path: `${OUT}/pvp-4-win-1024.png` })

  check(errs.length === 0, 'no console/page errors (1024) — ' + JSON.stringify(errs.slice(0, 4)))
  await page.close()
}

// ── Landscape 900x500 + level 5 (prove the leg name is dynamic) ─────────────
console.log('\n[landscape 900x500 — level 5]')
{
  const { page, errs } = await boot(900, 500, 5)
  await intoArena(page, 'P2', 'P1')
  check(!!(await page.$('.gvs-scene')), 'shared scene renders at 900x500')
  const bg5 = await page.evaluate(() => { const b = document.querySelector('.gvs-bg'); return b ? b.getAttribute('src') : '' })
  check(/level05/.test(bg5), 'bg plate switches to level05 — ' + bg5)
  const leg5 = await legText(page)
  check(leg5.length > 0, 'leg name shown (level 5): "' + leg5 + '"')
  check(leg5 !== leg1, 'leg name is DYNAMIC — level 5 ("' + leg5 + '") ≠ level 1 ("' + leg1 + '")')
  await page.screenshot({ path: `${OUT}/pvp-5-scene-900-lvl5.png` })
  check(errs.length === 0, 'no console/page errors (900) — ' + JSON.stringify(errs.slice(0, 4)))
  await page.close()
}

// ── Portrait 390x844 — render + no overflow ─────────────────────────────────
console.log('\n[portrait 390x844]')
{
  const { page, errs } = await boot(390, 844, 3)
  await intoArena(page, 'Adik', 'Kakak')
  const ov = await page.evaluate(() => ({
    hasScene: !!document.querySelector('.gvs-scene'),
    trains: document.querySelectorAll('.gvs-train').length,
    overflow: document.body.scrollWidth > window.innerWidth + 1,
    banner: /PVP MODE/.test((document.querySelector('.gvs-banner') || {}).textContent || ''),
    boost: !!document.querySelector('.gvs-boost')
  }))
  check(ov.hasScene && ov.trains === 2, 'shared scene + 2 trains render in portrait')
  check(ov.banner && ov.boost, 'banner + BOOST medallion present in portrait')
  check(!ov.overflow, 'no horizontal overflow at 390px')
  await page.screenshot({ path: `${OUT}/pvp-6-portrait.png` })
  check(errs.length === 0, 'no console/page errors (portrait) — ' + JSON.stringify(errs.slice(0, 4)))
  await page.close()
}

await browser.close()
console.log('\n' + (fail === 0 ? 'ALL PASS' : fail + ' CHECK(S) FAILED'))
process.exit(fail === 0 ? 0 : 1)
