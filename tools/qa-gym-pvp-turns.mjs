// Gym Pokemon PvP turn-order gate — strict alternation (no double turns).
//
// Owner bug: in 2-player mode the FASTER side (P2) got two turns in a row after
// wrong answers, timeouts, voluntary switches and KOs; P1 never did. This gate
// drives games/gym-pokemon.html -> PvP with REAL taps (ElementHandle.click),
// gives P1 the slowest package and P2 the fastest one, then plays a full match
// mixing correct answers, wrong answers, one 10-s timeout, a voluntary switch
// and KOs. Every action-menu tap is recorded with its owner.
//
// FAIL when: any player gets two consecutive action menus, the per-player action
// counts differ by more than 1, the engine logs "[pvp] double turn prevented"
// (the guard fired = the logic is still wrong), the match does not finish, a
// required path (wrong / timeout / switch / KO) was not exercised, or the page
// throws.
//
// Run from the repo root (puppeteer resolves from ../node_modules):
//   node tools/qa-gym-pvp-turns.mjs            (dev server http://localhost:8081)
import puppeteer from 'puppeteer'

const BASE = process.env.QA_BASE || 'http://localhost:8081'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const VIEWPORTS = (process.env.QA_ONLY === 'phone') ? [[390, 844, 'phone']] : [[1024, 768, 'tablet'], [390, 844, 'phone']]
const MAX_STEPS = 400

// Real tap (mouse down/up at the element centre — works on the 180°-rotated P2
// zone). If the tap did not land (element still connected and unchanged after
// 300 ms, e.g. an overlay swallowed it) fall back to a DOM click so a missed tap
// can never be recorded as a second action menu for the same player.
let fallbackTaps = 0
const occluded = []
async function tap (page, handle) {
  try {
    await handle.evaluate(el => el.scrollIntoView({ block: 'center', inline: 'center' }))
    // Only tap for real when the element is actually the top-most thing at its
    // centre; an occluded target is recorded and DOM-clicked instead.
    const hit = await handle.evaluate(el => {
      const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2
      const top = document.elementFromPoint(x, y)
      return (top && (top === el || el.contains(top))) ? null : { target: el.className, topmost: top ? String(top.className) : null, x: Math.round(x), y: Math.round(y) }
    })
    if (hit) { occluded.push(hit); throw new Error('occluded') }
    await handle.click({ delay: 20 })
  } catch (e) { /* hit-test failed → fallback below */ }
  await sleep(300)
  const stale = await handle.evaluate(el => el.isConnected && !el.disabled && !el.classList.contains('correct') && !el.classList.contains('wrong')).catch(() => false)
  if (stale) { fallbackTaps++; await handle.evaluate(el => el.click()).catch(() => {}) }
}
async function tapSel (page, sel) {
  const h = await page.$(sel)
  if (!h) return false
  await tap(page, h)
  return true
}

async function enterPvP (page) {
  await page.goto(BASE + '/games/gym-pokemon.html', { waitUntil: 'domcontentloaded' })
  await sleep(2500)
  // Adventure-side navigation is not under test here (same DOM clicks as
  // qa-pvp-drive.mjs); the PvP flow below is driven with real taps.
  for (const sel of ['.trainer-card:not(.locked)', '.pkg-card', '#gw-fight', '#tcf-go']) {
    await page.evaluate(s => { const e = document.querySelector(s); if (e && e.offsetParent) e.click() }, sel)
    await sleep(sel === '#tcf-go' ? 6500 : 1500)
  }
  if (!await tapSel(page, '.bm-card[data-mode="pvp"]')) throw new Error('PvP mode card not found')
  await sleep(2000)
}

// Names -> team size 3 -> P1 slowest package, P2 fastest package.
async function pickTeams (page) {
  const picked = []
  for (let i = 0; i < 20; i++) {
    if (await page.$('.bm-stage-grid')) break
    const inputs = await page.$$('.bm-tour-name-input')
    if (inputs.length) {
      for (let k = 0; k < inputs.length; k++) {
        await inputs[k].click({ clickCount: 3 })
        await inputs[k].type(k ? 'Ayu' : 'Bagas')
      }
      await tapSel(page, '#bm-name-go'); await sleep(900); continue
    }
    if (await tapSel(page, '.bm-size-card[data-size="3"]')) { await sleep(900); continue }
    const choice = await page.evaluate((pickN) => {
      const cards = [...document.querySelectorAll('.bm-pkg-card[data-pkg]')]
      if (!cards.length) return null
      const pk = window.POKE_PACKAGES || []
      const spd = s => window.BattleModes.stats.speedFromSlug(s)
      const scored = cards.map(c => {
        const p = pk.find(x => x.id === c.getAttribute('data-pkg'))
        const team = (p && p.team ? p.team.slice(0, 3) : [])
        const lead = team[0] ? spd(team[0].slug) : 70
        const avg = team.length ? team.reduce((a, t) => a + spd(t.slug), 0) / team.length : 70
        return { id: c.getAttribute('data-pkg'), lead, avg }
      })
      // P1 (first pick): slowest lead then slowest avg. P2: fastest.
      scored.sort((a, b) => (a.lead - b.lead) || (a.avg - b.avg))
      return pickN === 0 ? scored[0] : scored[scored.length - 1]
    }, picked.length)
    if (choice) {
      picked.push(choice)
      await tapSel(page, `.bm-pkg-card[data-pkg="${choice.id}"]`)
      await sleep(1200)
      continue
    }
    await sleep(700)
  }
  return picked
}

// Behaviour of the Nth action a player takes (per-player counter). Mixes all
// paths while keeping the match finite.
function planFor (n, player, flags) {
  if (!flags.timeoutDone && player === 0 && n === 2) return 'timeout'
  if (!flags.switchDone[player] && n === 3) return 'switch'
  if (n % 4 === 1) return 'wrong'
  return 'correct'
}

async function playMatch (page, tag) {
  const owners = []          // owner (0=P1 bottom, 1=P2 top) of every action-menu tap
  const perPlayerN = [0, 0]
  const counts = { correct: 0, wrong: 0, timeout: 0, vswitch: 0, forced: 0 }
  const flags = { timeoutDone: false, switchDone: [false, false] }
  let pending = null         // what the current active player intends to do
  let finished = false
  let firstOwner = null
  let speeds = null

  let idle = 0
  for (let step = 0; step < MAX_STEPS; step++) {
    if (await page.$('#bm-match-next')) { finished = true; break }
    const s = await page.evaluate(() => {
      const root = document.querySelector('.bm-pvp-real')
      const z = document.querySelector('.bm-qzone[data-state="active"]')
      if (!root || !z) return { kind: 'wait' }
      const owner = z.classList.contains('bm-qzone-bot') ? 0 : 1
      const pills = [...document.querySelectorAll('.bm-speed-pill')].map(e => +(e.textContent.match(/\d+/) || [0])[0])
      if (document.querySelector('.bm-pause-overlay')) return { kind: 'wait' }
      if (z.querySelector('.bm-switch-card[data-swap]:not([disabled])')) {
        return { kind: 'switch', owner, forced: !z.querySelector('[data-cancel-switch]'), pills }
      }
      if (z.querySelector('[data-action="attack"]')) {
        const sw = z.querySelector('[data-action="switch"]')
        return { kind: 'menu', owner, canSwitch: !!(sw && !sw.disabled), pills }
      }
      const choices = [...z.querySelectorAll('.bm-choice:not([disabled])')]
      if (choices.length) {
        const q = root._questions && root._questions[owner]
        return { kind: 'question', owner, ans: q ? String(q.ans) : null, choices: choices.map(c => c.getAttribute('data-c')) }
      }
      if (z.querySelector('.bm-move:not([disabled])')) return { kind: 'moves', owner }
      return { kind: 'wait' }
    })

    if (s.kind === 'menu') {
      idle = 0
      owners.push(s.owner)
      if (firstOwner === null) { firstOwner = s.owner; speeds = s.pills }
      const n = perPlayerN[s.owner]++
      let plan = planFor(n, s.owner, flags)
      if (plan === 'switch' && !s.canSwitch) plan = 'correct'
      pending = plan
      if (plan === 'switch') {
        await tapSel(page, '.bm-qzone[data-state="active"] [data-action="switch"]')
      } else {
        await tapSel(page, '.bm-qzone[data-state="active"] [data-action="attack"]')
      }
      await sleep(350)
      continue
    }
    if (s.kind === 'switch') {
      idle = 0
      const cards = await page.$$('.bm-qzone[data-state="active"] .bm-switch-card[data-swap]:not([disabled])')
      if (cards.length) await tap(page, cards[0])
      if (s.forced) counts.forced++
      else { counts.vswitch++; flags.switchDone[s.owner] = true }
      pending = null
      await sleep(600)
      continue
    }
    if (s.kind === 'question') {
      idle = 0
      if (pending === 'timeout') {
        // Wait out the real 10-s answer clock without touching anything.
        const t0 = Date.now()
        await page.waitForFunction(() => !document.querySelector('.bm-qzone[data-state="active"] .bm-choice:not([disabled])'), { timeout: 16000 })
        counts.timeout++; flags.timeoutDone = true
        console.log(tag, `timeout path took ${((Date.now() - t0) / 1000).toFixed(1)} s`)
        pending = null
        await sleep(1600)
        continue
      }
      const wantWrong = pending === 'wrong'
      const target = wantWrong ? s.choices.find(c => c !== s.ans) : s.ans
      const h = await page.$(`.bm-qzone[data-state="active"] .bm-choice[data-c="${String(target).replace(/"/g, '\\"')}"]`)
      if (h) await tap(page, h)
      if (wantWrong) counts.wrong++; else counts.correct++
      pending = null
      await sleep(wantWrong ? 1700 : 900)
      continue
    }
    if (s.kind === 'moves') {
      idle = 0
      const mv = await page.$('.bm-qzone[data-state="active"] .bm-move:not([disabled])')
      if (mv) await tap(page, mv)
      await sleep(1800)
      continue
    }
    if (++idle > 60) {   // ~25 s with nothing to tap → stalled; dump for diagnosis
      const dump = await page.evaluate(() => {
        const z = document.querySelector('.bm-qzone[data-state="active"]')
        return { zone: z ? z.className : null, html: z ? z.innerHTML.replace(/\s+/g, ' ').slice(0, 600) : null,
          overlays: [...document.querySelectorAll('.bm-pause-overlay,.bm-vs-card,[class*="overlay"]')].map(e => e.className).slice(0, 5) }
      })
      console.log(tag, 'STALL', JSON.stringify(dump))
      await page.screenshot({ path: `tools/qa-out/pvp-turns-stall-${tag.split(' ')[0]}.png` }).catch(() => {})
      break
    }
    await sleep(400)
    continue
  }
  return { owners, counts, finished, firstOwner, speeds }
}

function judge (tag, picked, r, warns, errs) {
  const fails = []
  const doubles = []
  for (let i = 1; i < r.owners.length; i++) if (r.owners[i] === r.owners[i - 1]) doubles.push(i)
  const c0 = r.owners.filter(o => o === 0).length
  const c1 = r.owners.filter(o => o === 1).length
  if (doubles.length) fails.push(`${doubles.length} double turn(s) at action #${doubles.slice(0, 8).join(',')}`)
  if (Math.abs(c0 - c1) > 1) fails.push(`action counts P1=${c0} P2=${c1} differ by >1`)
  if (!r.finished) fails.push('match did not finish')
  if (r.counts.wrong < 1) fails.push('no wrong answer exercised')
  if (r.counts.timeout < 1) fails.push('no timeout exercised')
  if (r.counts.vswitch < 1) fails.push('no voluntary switch exercised')
  if (r.counts.forced < 1) fails.push('no KO / forced switch exercised')
  if (warns.length) fails.push(`guard fired ${warns.length}x: ${warns[0]}`)
  if (errs.length) fails.push(`page errors: ${errs.slice(0, 3).join(' | ')}`)
  console.log(tag, JSON.stringify({
    p1Pkg: picked[0], p2Pkg: picked[1], openingSpeeds_P2_P1: r.speeds, opener: r.firstOwner === null ? null : 'P' + (r.firstOwner + 1),
    actions: r.owners.length, p1: c0, p2: c1, counts: r.counts, finished: r.finished,
    seq: r.owners.map(o => o + 1).join('')
  }))
  console.log(tag, fails.length ? 'FAIL: ' + fails.join('; ') : 'PASS')
  return fails.length === 0
}

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
let allOk = true
try {
  for (const [w, h, tag] of VIEWPORTS) {
    const page = await browser.newPage()
    await page.setViewport({ width: w, height: h, hasTouch: false })
    const errs = []; const warns = []
    page.on('console', m => {
      const t = m.text()
      if (/\[pvp\] double turn prevented/.test(t)) warns.push(t)
      if (m.type() === 'error' && !/favicon|net::ERR|Failed to load/i.test(t)) errs.push(t)
    })
    page.on('pageerror', e => errs.push('PE:' + e.message))
    page.on('dialog', d => d.accept())
    await enterPvP(page)
    const picked = await pickTeams(page)
    await sleep(4500) // VS card + initiative banner
    const r = await playMatch(page, `${tag} ${w}x${h}`)
    if (!judge(`${tag} ${w}x${h}`, picked, r, warns, errs)) allOk = false
    await page.close()
  }
} finally {
  await browser.close()
}
console.log(`DOM-click fallbacks after a missed real tap: ${fallbackTaps}; occluded targets: ${occluded.length}`, JSON.stringify(occluded.slice(0, 4)))
console.log(allOk ? 'GATE PASS' : 'GATE FAIL')
process.exit(allOk ? 0 : 1)
