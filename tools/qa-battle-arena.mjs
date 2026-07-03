/* qa-battle-arena.mjs — A-317 BattleArena presentation probe (v56.1)
 * Boots gym-pokemon, drives a REAL battle via mouse clicks (deep-testing
 * mandate: bbox-center clicks, no synthetic el.click / state shortcuts):
 * trainer card → TANTANG → team confirm → VS skip → mode modal Adventure →
 * battle → Serang → move → math quiz → correct answer → attack FX.
 * Asserts: 0 non-asset console errors · field sprites are real <img> with
 * naturalWidth>0 · 2 corner HP cards (player left / enemy right) · centered
 * quiz question + 4 glassy pills ≥44px tall · HP drops after the attack.
 * Screenshots → tools/qa-out/battle-arena-*.png (landscape 844x390 + portrait
 * 390x844). Exit 1 on any failure.
 */
import puppeteer from 'puppeteer'
import fs from 'fs'

const BASE = process.env.BASE || 'http://localhost:8081'
const OUT = new URL('./qa-out/', import.meta.url).pathname
fs.mkdirSync(OUT, { recursive: true })
const IGNORE = /favicon|pokemondb|showdown|net::ERR|Failed to load resource|404/i
const sleep = ms => new Promise(r => setTimeout(r, ms))

const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--use-gl=swiftshader'] })
let failures = []
const fail = m => { failures.push(m); console.log('  ✗ ' + m) }
const ok = m => console.log('  ✓ ' + m)

async function clickCenter (page, sel) {
  const el = await page.waitForSelector(sel, { visible: true, timeout: 12000 })
  await el.evaluate(e => e.scrollIntoView({ block: 'center' }))
  await sleep(150)
  const box = await el.boundingBox()
  if (!box) throw new Error('no bbox for ' + sel)
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  return el
}

async function runScenario (label, vw, vh) {
  console.log(`\n── ${label} (${vw}x${vh}) ──`)
  const p = await b.newPage()
  const errs = []
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  p.on('pageerror', e => errs.push('PE:' + e.message))
  await p.setViewport({ width: vw, height: vh })
  // Pre-seed team so the first-visit package selector doesn't cover the flow
  await p.evaluateOnNewDocument(() => {
    try { localStorage.setItem('g13c_lastPackage', 'ash-kanto-base') } catch (_) {}
  })
  await p.goto(`${BASE}/games/gym-pokemon.html`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await sleep(2200)

  // engine presence
  const eng = await p.evaluate(() => ({
    ba: typeof window.BattleArena, qz: typeof window.QuizEngine,
    scene: !!document.querySelector('.ba-field')
  }))
  if (eng.ba !== 'object') fail('BattleArena missing'); else ok('BattleArena loaded')
  if (!eng.scene) fail('.ba-field scene not mounted'); else ok('scene mounted')

  // ── boot a battle via real clicks ──
  await clickCenter(p, '.trainer-card')                 // gym ladder → welcome
  await clickCenter(p, '#gw-fight')                     // TANTANG!
  await clickCenter(p, '.tcf-cta-primary')              // team confirm → VS card
  try { await clickCenter(p, '#adv-vs-skip') } catch (_) {} // skip countdown
  await clickCenter(p, '.bm-card[data-mode="adventure"]') // mode modal → Adventure
  // 3 intro messages auto-advance (1.2s each) → action menu
  await p.waitForFunction(() =>
    document.getElementById('action-btns') &&
    getComputedStyle(document.getElementById('action-btns')).display === 'grid',
  { timeout: 15000 })
  await sleep(400)

  // ── field layout assertions ──
  const field = await p.evaluate(() => {
    const r = {}
    const pl = document.getElementById('poke-player')
    const en = document.getElementById('poke-enemy')
    r.playerImg = !!(pl && pl.tagName === 'IMG')
    r.enemyImg = !!(en && en.tagName === 'IMG')
    r.playerNW = pl ? pl.naturalWidth : 0
    r.enemyNW = en ? en.naturalWidth : 0
    r.playerRect = pl ? pl.getBoundingClientRect().toJSON() : null
    r.enemyRect = en ? en.getBoundingClientRect().toJSON() : null
    const cards = [...document.querySelectorAll('.ba-card')]
    r.cards = cards.length
    const pc = document.querySelector('.ba-card-player')
    const ec = document.querySelector('.ba-card-enemy')
    r.pCard = pc ? pc.getBoundingClientRect().toJSON() : null
    r.eCard = ec ? ec.getBoundingClientRect().toJSON() : null
    r.pHpText = pc ? pc.querySelector('.ba-hp-text').textContent : ''
    r.eHpText = ec ? ec.querySelector('.ba-hp-text').textContent : ''
    r.pDots = pc ? pc.querySelectorAll('.ba-dot').length : 0
    r.narrate = !!document.querySelector('.ba-narrate')
    r.W = innerWidth; r.H = innerHeight
    return r
  })
  if (!field.playerImg || !field.enemyImg) fail('field sprites not <img> (player:' + field.playerImg + ' enemy:' + field.enemyImg + ')')
  else ok('both field sprites are <img>')
  if (field.playerNW > 0 && field.enemyNW > 0) ok(`sprites loaded (nw ${field.playerNW}/${field.enemyNW})`)
  else {
    await sleep(2500)
    const nw = await p.evaluate(() => ({
      p: (document.getElementById('poke-player') || {}).naturalWidth || 0,
      e: (document.getElementById('poke-enemy') || {}).naturalWidth || 0
    }))
    if (nw.p > 0 && nw.e > 0) ok(`sprites loaded after wait (nw ${nw.p}/${nw.e})`)
    else fail(`sprite naturalWidth=0 (player:${nw.p} enemy:${nw.e})`)
  }
  if (field.cards !== 2) fail(`expected 2 HP cards, got ${field.cards}`); else ok('2 corner HP cards')
  if (field.pCard && field.pCard.left > field.W * 0.3) fail('player card not top-left')
  if (field.eCard && field.eCard.right < field.W * 0.7) fail('enemy card not top-right')
  if (field.pCard && field.pCard.top > field.H * 0.4) fail('player card not near top')
  if (!/\d+\/\d+/.test(field.pHpText)) fail(`player HP text malformed: "${field.pHpText}"`)
  else ok(`HP texts: player ${field.pHpText} · enemy ${field.eHpText}`)
  if (field.pDots < 1) fail('no pokeball team dots on player card'); else ok(`${field.pDots} team dots`)
  // sprites ON the field: player left half, enemy right half, both in lower 75%
  if (field.playerRect) {
    const c = field.playerRect.left + field.playerRect.width / 2
    if (c > field.W * 0.5) fail('player sprite not on LEFT')
    if (field.playerRect.bottom < field.H * 0.35) fail('player sprite floating too high')
  }
  if (field.enemyRect) {
    const c = field.enemyRect.left + field.enemyRect.width / 2
    if (c < field.W * 0.5) fail('enemy sprite not on RIGHT')
  }
  const shot1 = `${OUT}battle-arena-field-${label}.png`
  await p.screenshot({ path: shot1 })
  console.log('  📸 ' + shot1)

  // ── quiz: Serang → move → floating question + glassy pills ──
  await clickCenter(p, '#btn-fight')
  await clickCenter(p, '.move-btn')
  await p.waitForSelector('.ba-quiz .qz-pill', { visible: true, timeout: 8000 })
  await sleep(300)
  const quiz = await p.evaluate(() => {
    const q = document.querySelector('.ba-quiz .qz-question')
    const pills = [...document.querySelectorAll('.ba-quiz .qz-pill')]
    const qr = q ? q.getBoundingClientRect() : null
    return {
      qText: q ? q.textContent : '',
      qCenterX: qr ? qr.left + qr.width / 2 : 0,
      qTop: qr ? qr.top : 0,
      qFontSize: q ? parseFloat(getComputedStyle(q).fontSize) : 0,
      pills: pills.map(el => { const r = el.getBoundingClientRect(); return { h: r.height, w: r.width, bottom: r.bottom, text: el.textContent } }),
      W: innerWidth, H: innerHeight
    }
  })
  if (!quiz.qText) fail('quiz question missing')
  else ok(`question "${quiz.qText}" @ ${Math.round(quiz.qFontSize)}px`)
  if (Math.abs(quiz.qCenterX - quiz.W / 2) > quiz.W * 0.15) fail('question not horizontally centered')
  if (quiz.qTop > quiz.H * 0.55) fail('question not in upper/center arena')
  if (quiz.qFontSize < 34) fail(`question too small (${quiz.qFontSize}px)`)
  if (quiz.pills.length !== 4) fail(`expected 4 pills, got ${quiz.pills.length}`)
  else ok('4 answer pills')
  const short = quiz.pills.filter(pl => pl.h < 44)
  if (short.length) fail(`pill(s) under 44px tall: ${short.map(s => Math.round(s.h)).join(',')}`)
  else ok(`pill heights ${quiz.pills.map(pl => Math.round(pl.h)).join('/')}px (≥44)`)
  const lowPill = quiz.pills.every(pl => pl.bottom > quiz.H * 0.7)
  if (!lowPill) fail('pills not in bottom row')
  else ok('pills across the bottom')
  const shot2 = `${OUT}battle-arena-quiz-${label}.png`
  await p.screenshot({ path: shot2 })
  console.log('  📸 ' + shot2)

  // ── answer CORRECTLY (parse "a + b = ?" from the shared engine) → attack FX ──
  const eHpBefore = field.eHpText
  const m = quiz.qText.match(/(\d+)\s*([+\-])\s*(\d+)/)
  if (m) {
    const ans = m[2] === '+' ? (+m[1] + +m[3]) : (+m[1] - +m[3])
    const pillIdx = quiz.pills.findIndex(pl => pl.text.trim() === String(ans))
    if (pillIdx === -1) fail(`correct answer ${ans} not among pills [${quiz.pills.map(pl => pl.text).join(',')}]`)
    else {
      const pillEls = await p.$$('.ba-quiz .qz-pill')
      const box = await pillEls[pillIdx].boundingBox()
      await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
      await sleep(900) // lunge (250ms) + orb (300ms) + pop start
      const shot3 = `${OUT}battle-arena-attack-${label}.png`
      await p.screenshot({ path: shot3 })
      console.log('  📸 ' + shot3)
      await sleep(1600)
      const after = await p.evaluate(() => ({
        eHp: (document.querySelector('.ba-card-enemy .ba-hp-text') || {}).textContent || '',
        quizGone: !document.querySelector('.ba-quiz')
      }))
      if (!after.quizGone) fail('quiz overlay not removed after answer')
      if (after.eHp === eHpBefore) fail(`enemy HP unchanged after correct hit (${after.eHp})`)
      else ok(`enemy HP ${eHpBefore} → ${after.eHp} after attack`)
    }
  } else fail('could not parse math question: ' + quiz.qText)

  const realErrs = errs.filter(e => !IGNORE.test(e))
  if (realErrs.length) fail('console errors: ' + realErrs.slice(0, 4).join(' | '))
  else ok('0 non-asset console errors')
  await p.close()
}

try {
  await runScenario('landscape', 844, 390)
  await runScenario('portrait', 390, 844)
} catch (e) {
  fail('scenario crash: ' + e.message)
}
await b.close()
console.log(failures.length ? `\nFAIL (${failures.length}):\n- ` + failures.join('\n- ') : '\nALL PASS ✅')
process.exit(failures.length ? 1 : 0)
