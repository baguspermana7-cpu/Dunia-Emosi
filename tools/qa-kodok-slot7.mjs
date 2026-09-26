// Easter egg: the 7th player slot with the FROG avatar opens most of the Pokemon
// gym straight away ("savenya langsung terbuka banyak").
//
// It had rotted silently. The preset in game.js is a HAND-KEPT copy of the gym
// roster, written when the gym had 77 trainers. Alola, Paldea, Hisui and Orange
// (28 trainers) were added to games/gym-pokemon.html later and never to the
// copy, so they were never unlocked: measured 27 of 105 = 25.7%, while the owner
// expects ~70%. Nothing failed -- the egg just quietly shrank.
//
// Asserts:
//   1. STATIC: the preset map covers every region and every trainer id of the
//      live gym roster (so the copy can never go stale again unnoticed)
//   2. slot 7 + frog: Kanto fully open, overall >= 75% of the real roster
//      (owner, 2026-09-27: "75%")
//   3. the egg stays hidden: slot 7 with another animal, or a frog elsewhere,
//      gets nothing
//   4. it MERGES: badges a child already earned are never taken away, and a
//      player who got the old 27-badge preset is topped up
import puppeteer from 'puppeteer'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..')
const BASE = process.env.QA_BASE || 'http://localhost:8081'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const fails = []
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fails.push(msg) }

// ---- 1. static roster coverage -----------------------------------------
const gym = fs.readFileSync(path.join(ROOT, 'games/gym-pokemon.html'), 'utf8')
const roster = {}
for (const m of gym.matchAll(/\{id:'([a-z_0-9]+)',[^}]*?group:'([a-z]+)'/g)) (roster[m[2]] = roster[m[2]] || []).push(m[1])
const total = Object.values(roster).reduce((t, v) => t + v.length, 0)
const gj = fs.readFileSync(path.join(ROOT, 'game.js'), 'utf8')
const blk = gj.slice(gj.indexOf('const TRAINERS_BY_REGION'), gj.indexOf('const badgesKey'))
const preset = {}
for (const m of blk.matchAll(/^\s*([a-z]+):\s*\[([^\]]*)\]/gm)) preset[m[1]] = [...m[2].matchAll(/'([a-z_0-9]+)'/g)].map(x => x[1])
const missingRegions = Object.keys(roster).filter(g => !preset[g])
const missingIds = Object.entries(roster).flatMap(([g, ids]) => ids.filter(id => !(preset[g] || []).includes(id)).map(id => g + ':' + id))
check(total > 0, `gym roster parsed (${total} trainers, ${Object.keys(roster).length} regions)`)
check(missingRegions.length === 0, `preset covers every gym region${missingRegions.length ? ' — MISSING: ' + missingRegions.join(', ') : ''}`)
check(missingIds.length === 0, `preset lists every gym trainer${missingIds.length ? ' — MISSING ' + missingIds.length + ': ' + missingIds.slice(0, 6).join(', ') : ''}`)

// ---- 2-4. behaviour in the real app ------------------------------------
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
try {
  const page = await browser.newPage()
  const cdp = await page.createCDPSession()
  await cdp.send('Network.setBypassServiceWorker', { bypass: true })
  let err = null
  for (const t of [45000, 120000]) {
    try { await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded', timeout: t }); err = null; break }
    catch (e) { err = String(e.message).slice(0, 100) }
  }
  if (err) throw new Error('nav ' + err)
  await page.waitForFunction(() => typeof _applyKodokSlot7Unlock === 'function', { timeout: 30000 })

  const run = (slot, animal, before) => page.evaluate((slot, animal, before) => {
    localStorage.clear()
    const players = []
    for (let i = 0; i < 7; i++) players.push({ name: 'P' + i, animal: i === slot ? animal : '\u{1F981}', stars: 0 })
    localStorage.setItem('dunia-players', JSON.stringify(players))
    localStorage.setItem('dunia-active-slot', JSON.stringify([slot, 1]))
    for (const [k, v] of Object.entries(before || {})) localStorage.setItem(k, v)
    _applyKodokSlot7Unlock()
    const keys = Object.keys(localStorage).filter(k => k.endsWith('-g13c_badges'))
    const b = keys.length ? JSON.parse(localStorage.getItem(keys[0]) || '{}') : {}
    const prog = JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.endsWith('-progress')) || 'x') || '{}')
    return { ids: Object.keys(b).filter(k => b[k]), g13b: ((prog.g13b || {}).completed || []).length }
  }, slot, animal, before)

  const FROG = '\u{1F438}'
  const egg = await run(6, FROG)
  const kanto = roster.kanto || []
  const kantoOpen = kanto.filter(id => egg.ids.includes(id)).length
  const pct = 100 * egg.ids.filter(id => Object.values(roster).flat().includes(id)).length / total
  check(kantoOpen === kanto.length, `slot 7 + frog opens ALL of Kanto (${kantoOpen}/${kanto.length})`)
  check(pct >= 75, `slot 7 + frog opens most of the gym (${egg.ids.length}/${total} = ${pct.toFixed(1)}%, need >= 75%)`)
  const perRegion = Object.entries(roster).filter(([g]) => !egg.ids.some(id => roster[g].includes(id))).map(([g]) => g)
  check(perRegion.length === 0, `every region gets something${perRegion.length ? ' — NONE in: ' + perRegion.join(', ') : ''}`)
  check(egg.g13b >= 30, `slot 7 + frog also opens all 30 G13B levels (${egg.g13b})`)

  const notFrog = await run(6, '\u{1F43C}')
  check(notFrog.ids.length === 0, `slot 7 with another animal gets nothing (${notFrog.ids.length})`)
  const frogElsewhere = await run(2, FROG)
  check(frogElsewhere.ids.length === 0, `a frog in another slot gets nothing from THIS egg (${frogElsewhere.ids.length})`)

  // merge, never wipe: a badge earned in a region the preset does not open stays
  const lastOf = g => roster[g][roster[g].length - 1]
  const earned = lastOf('paldea')
  const kept = await run(6, FROG, { 'dunia-avatar-frog-g13c_badges': JSON.stringify({ [earned]: true }) })
  check(kept.ids.includes(earned), `a badge the child already earned is kept (${earned})`)

  // players who already ran an OLDER preset must be topped up, not skipped:
  // v4 = the original 27, v5 = the 72 shipped earlier on 2026-09-27
  for (const flag of ['dunia-kodok-slot7-v4', 'dunia-kodok-slot7-v5']) {
    const old = await run(6, FROG, { [flag]: '1',
      'dunia-avatar-frog-g13c_badges': JSON.stringify(Object.fromEntries(kanto.map(id => [id, true]))) })
    check(old.ids.length >= Math.ceil(total * 0.75), `a player who ran ${flag.slice(-2)} is topped up (${old.ids.length})`)
  }
} finally {
  await browser.close()
}
console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
