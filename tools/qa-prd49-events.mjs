#!/usr/bin/env node
// qa-prd49-events — PRD-49 (docs/prd/PRD-49-event-level-dan-gerbang-orang-tua.md)
//   L1 one level played to its end in 5 games (hub G4 + G7 with real taps on every round; pages Mobil, Ducky Volley,
//      Kuis Matematika through the game's own end function) -> exactly 1 level:start and 1 level:end, the end's
//      `win` agrees with the result (hub: filled result stars > 0; Ducky: the match won; Mobil game over: false)
//   L2 a new sticker on the 4 reward pages (balapan-kereta, balapan-kereta-side, selamatkan-kereta,
//      lokomotif-pemberani; all grant through ObstacleEngine._addToStorageList) -> one `reward` event; a repeat -> none
//   L3 the Dasbor button opens the parent gate, not the dashboard; letting go before 2 s keeps the hold step; lifting
//      the finger after the hold does not answer the sum (it is still there); a wrong
//      sum closes the gate onto the beranda; a 2 s hold + the right sum opens the dashboard
//   L4 the gate at 390x844, 844x390, 800x1280: every target >= 48 px, text contrast >= 4.5, fully on screen;
//      screenshots (QA_SHOTS=dir) looked at
// Usage: QA_BASE=http://127.0.0.1:8081 node tools/qa-prd49-events.mjs
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'
const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, ''), SH = process.env.QA_SHOTS
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }
const NOISE = /favicon|googleapis|gstatic/i
if (SH) fs.mkdirSync(SH, { recursive: true })
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-audio-output', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })

async function open (url, size = [844, 390], extra = {}) {
  const c = await b.createBrowserContext(), p = await c.newPage(), errs = []
  p.on('pageerror', e => { if (!NOISE.test(e.message)) errs.push(e.message) })
  await p.setViewport({ width: size[0], height: size[1], isMobile: true, hasTouch: true })
  await p.evaluateOnNewDocument(extra => {
    if (!sessionStorage.__s) {
      localStorage.clear(); localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: 'tumbuh' }]))
      localStorage.setItem('dunia-active-slot', '[0,1]'); localStorage.setItem('dunia-emosi-sound', 'off')
      Object.entries(extra).forEach(([k, v]) => sessionStorage.setItem(k, v)); sessionStorage.__s = 1
    }
    window.__ev = []
    ;['level:start', 'level:end', 'reward'].forEach(t => addEventListener('dunia:' + t, e => window.__ev.push(Object.assign({ type: t }, e.detail))))
  }, extra)
  await p.goto(BASE + url, { waitUntil: 'load', timeout: 120000 })
  return { c, p, errs }
}
const tapEl = async (p, el) => {
  await el.evaluate(e => e.scrollIntoView({ block: 'center' })); await sleep(1200)   // scroll + entrance settle on a loaded machine
  // wait until the element stops moving (entrance animations) and its centre hits the element itself
  await p.waitForFunction(e => { const r = e.getBoundingClientRect(), k = Math.round(r.x) + ',' + Math.round(r.y); const same = e.__qaK === k; e.__qaK = k
    const h = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return same && h && (h === e || e.contains(h)) }, { timeout: 6000, polling: 150 }, el).catch(() => {})
  const bx = await el.boundingBox(); if (!bx) return false; await p.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2); return true
}
const evs = async (p, waitEnd = true) => { if (waitEnd) await p.waitForFunction(() => window.__ev.some(e => e.type === 'level:end'), { timeout: 8000 }).catch(() => {}); await sleep(300); return p.evaluate(() => window.__ev) }
function judgeLevel (tag, ev, game, wantWin, errs) {
  const st = ev.filter(e => e.type === 'level:start'), en = ev.filter(e => e.type === 'level:end')
  ok(st.length === 1 && en.length === 1 && st[0].game === game && en[0].game === game && en[0].win === wantWin && !errs.length,
    `L1 ${tag}: level:start ${st.length}, level:end ${en.length} (game ${en[0] && en[0].game}, win ${en[0] && en[0].win}, stars ${en[0] && en[0].stars}; want win ${wantWin}), errors ${errs.slice(0, 2).join(' | ') || 0}`)
}

// L1 hub: G4 (tap the right count every round) and G7 (tap the first picture every round)
for (const [tag, n, pick] of [
  ['G4', 4, () => { const b = [...document.querySelectorAll('#g4-choices .g4-choice-btn')].find(x => parseInt(x.textContent) === g4State.currentCount); if (b) b.setAttribute('data-qa', '1') }],
  ['G7', 7, () => { const b = document.querySelector('.g7-choice-btn'); if (b) b.setAttribute('data-qa', '1') }]
]) {
  const { c, p, errs } = await open('/index.html?nocine=1')
  await p.waitForFunction(() => typeof window.startGameWithLevel === 'function', { timeout: 60000 }); await p.waitForFunction(() => window.DuniaLevel, { timeout: 8000 }).catch(() => {})
  await sleep(600)
  await p.evaluate(n => { state.players = [{ name: 'Ana', animal: '🦁', ageTier: 'tumbuh', stars: 0 }, { name: 'Bima', animal: '🐯', ageTier: 'tumbuh', stars: 0 }]; state.mode = 'solo'; state.currentPlayer = 0; state.currentGame = n; startGameWithLevel(1) }, n)
  for (let k = 0; k < 30; k++) {
    const done = await p.evaluate(() => document.getElementById('screen-result') && document.getElementById('screen-result').classList.contains('active'))
    if (done) break
    const live = await p.waitForFunction(n => n === 4 ? !g4State.answered && document.querySelector('#g4-choices .g4-choice-btn') : !g7State.answered && document.querySelector('.g7-choice-btn'), { timeout: 6000 }, n).then(() => true).catch(() => false)
    if (!live) { await sleep(500); continue }
    await p.evaluate(pick)
    const el = await p.$('[data-qa]'); if (el) { await tapEl(p, el); await p.evaluate(() => document.querySelectorAll('[data-qa]').forEach(e => e.removeAttribute('data-qa'))) }
    await sleep(1800)
  }
  const ev = await evs(p)
  const filled = await p.evaluate(() => document.querySelectorAll('#result-stars .rstar.filled').length)
  judgeLevel(`${tag} (result stars ${filled})`, ev, 'g' + n, filled > 0, errs)
  await c.close()
}

// L1 pages
{ // Mobil: a won level (all words) and a lost one (game over)
  for (const lose of [false, true]) {
    const { c, p, errs } = await open('/games/mobil.html?nocine=1', [844, 390], { g6Config: JSON.stringify({ mapTheme: 'city', level: 2, totalWords: 2 }) })
    await p.waitForFunction(() => typeof app !== 'undefined' && app && S.wordList.length > 0 && window.DuniaLevel, { timeout: 60000 }).catch(() => {})
    await sleep(600)
    await p.evaluate(() => { selectedDiff = 'normal'; startFromSelect() }); await sleep(400)
    if (lose) {
      for (let k = 0; k < 4; k++) await p.evaluate(() => { S.invincible = 0; const w = S.currentWord[S.letterIdx]; hitTile({ _letter: w === 'Q' ? 'X' : 'Q', x: 100, y: 300, _alive: true }) })
    } else {
      for (let w = 0; w < 2; w++) {
        await p.evaluate(() => { for (let i = S.letterIdx; i < S.currentWord.length; i++) hitTile({ _letter: S.currentWord[S.letterIdx], x: 100, y: 300, _alive: true }) })
        await p.waitForFunction(() => document.getElementById('ovl-wc').classList.contains('show'), { timeout: 5000 }).catch(() => {})
        await p.evaluate(() => nextWord()); await sleep(400)
      }
    }
    judgeLevel(`Mobil ${lose ? 'lost' : 'won'}`, await evs(p), 'g6', !lose, errs)
    await c.close()
  }
}
{ // Ducky Volley: a match lost 0-2 still saves stars; the end says win false. Started by its own start overlay.
  for (const won of [true, false]) {
    const { c, p, errs } = await open('/games/ducky-volley.html?nocine=1')
    await p.waitForFunction(() => typeof S !== 'undefined' && window.DuniaLevel && document.getElementById('start-overlay'), { timeout: 60000 }).catch(() => {})
    await sleep(800)
    const so = await p.$('#start-overlay'); if (so) await tapEl(p, so)
    await sleep(500)
    await p.evaluate(won => { S.pRounds = won ? 2 : 0; S.cRounds = won ? 0 : 2; S.correctQ = 1; endMatch() }, won)
    judgeLevel(`Ducky ${won ? 'won' : 'lost'}`, await evs(p), 'g20', won, errs)
    await c.close()
  }
}
{ // Kuis Matematika: level 1 started by startGame, ended by finish()
  for (const failed of [false, true]) {
    const { c, p, errs } = await open('/games/kuis-matematika.html?nocine=1')
    await p.waitForFunction(() => window.__g25 && window.__g25.startLevel, { timeout: 60000 }).catch(() => {})
    await sleep(800)
    await p.evaluate(() => window.__g25.startLevel(1))   // the page's own test hook (qa-error-kinds, qa-endgame-hang)
    await p.waitForFunction(() => window.__g25.inProgress(), { timeout: 15000 }).catch(() => {})
    await p.evaluate(failed => failed ? window.__g25.finishLose() : window.__g25.finishWin(), failed)
    judgeLevel(`Kuis ${failed ? 'failed' : 'cleared'}`, await evs(p), 'g25', !failed, errs)
    await c.close()
  }
}

// L2 reward pages
for (const pg of ['balapan-kereta', 'balapan-kereta-side', 'selamatkan-kereta', 'lokomotif-pemberani']) {
  const { c, p, errs } = await open(`/games/${pg}.html?nocine=1`)
  await p.waitForFunction(() => window.ObstacleEngine && ObstacleEngine._addToStorageList && window.DuniaEmit, { timeout: 60000 }).catch(() => {})
  await sleep(500)
  await p.evaluate(() => { ObstacleEngine._addToStorageList('train-stickers', 'qa-prd49'); ObstacleEngine._addToStorageList('train-stickers', 'qa-prd49'); ObstacleEngine._addToStorageList('train-horn-unlocks', 'qa-horn') })
  await p.waitForFunction(() => window.__ev.filter(e => e.type === 'reward').length >= 2, { timeout: 8000 }).catch(() => {})
  await sleep(300)
  const r = (await p.evaluate(() => window.__ev)).filter(e => e.type === 'reward')
  ok(r.length === 2 && r[0].id === 'qa-prd49' && r[0].kind === 'sticker' && r[1].kind === 'horn' && r[0].game === pg && !errs.length,
    `L2 ${pg}: reward events ${r.length} (want 2: new sticker + horn, the repeat says nothing) ${r.map(e => e.kind + ':' + e.id + '@' + e.game).join(', ')}; errors ${errs.slice(0, 2).join(' | ') || 0}`)
  await c.close()
}

// L3 + L4 the parent gate
const active = p => p.evaluate(() => [...document.querySelectorAll('.screen.active')].map(s => s.id).join(','))
// a loaded machine delivers CDP touches late, so the page can see a 0.9 s hold as 2.5 s (or 2.3 s as 1.5 s);
// every hold therefore reads the duration the PAGE saw (pointer event timeStamps) and a trial whose page-side
// length landed on the wrong side of 2 s is not a verdict: it is retried (logged), never counted as pass or fail
async function hold (p, ms) {
  const el = await p.$('#pg-hold'); if (!el) return -1; const bx = await el.boundingBox()
  await p.evaluate(() => { window.__h = { d: 0, u: 0 }; if (!window.__hw) { window.__hw = 1
    document.addEventListener('pointerdown', e => { if (e.target.closest && e.target.closest('#pg-hold')) window.__h.d = e.timeStamp }, true)
    document.addEventListener('pointerup', e => { if (window.__h.d && !window.__h.u) window.__h.u = e.timeStamp }, true) } })
  await p.touchscreen.touchStart(bx.x + bx.width / 2, bx.y + bx.height / 2); await sleep(ms); await p.touchscreen.touchEnd(); await sleep(600)
  return p.evaluate(() => window.__h.d && window.__h.u ? Math.round(window.__h.u - window.__h.d) : -1)
}
const gateOpen = p => p.$('.pg-back').then(Boolean)
async function openGate (p) {   // the Dasbor tap, retried if the tap landed while the page was still moving
  for (let k = 0; k < 3; k++) { await tapEl(p, await p.$('#screen-welcome [onclick*="showDashboard"]')); await sleep(400); if (await gateOpen(p)) return k; if (/screen-dashboard/.test(await active(p))) return -1 }
  return -2
}
async function cancelGate (p) { await sleep(400); const x = await p.$('#pg-cancel'); if (x) await tapEl(p, x); await sleep(400) }
const tries = []
for (const size of [[844, 390], [390, 844], [800, 1280]]) {
  const tag = size.join('x')
  const { c, p, errs } = await open('/index.html?nocine=1', size)
  await p.waitForFunction(() => typeof showDashboard === 'function', { timeout: 60000 }); await p.waitForFunction(() => window.DuniaParentGate, { timeout: 8000 }).catch(() => {})
  await sleep(800)
  const r1 = await openGate(p)
  const s1 = { gate: await gateOpen(p), scr: await active(p) }
  if (SH) await p.screenshot({ path: path.join(SH, `gate-hold-${tag}.png`) })
  let early = { q: false, hold: false, ms: -1 }
  for (let k = 0; k < 4; k++) {   // a short hold, judged only when the page saw it as short
    const ms = await hold(p, 900); early = { q: !!(await p.$('#pg-q')), hold: !!(await p.$('#pg-hold')), ms }
    if (ms >= 0 && ms < 1800) break
    tries.push(`${tag} short hold seen as ${ms} ms, retried`); if (early.q) { await cancelGate(p); await openGate(p) }
  }
  let lm = -1
  for (let k = 0; k < 4; k++) { lm = await hold(p, 2300); if (await p.$('#pg-q') || lm >= 2000 || lm < 0) break; tries.push(`${tag} long hold seen as ${lm} ms, retried`) }
  const q = await p.evaluate(() => { const back = document.querySelector('.pg-back'); return { q: !!document.getElementById('pg-q'), ans: back && back.__ans } })
  if (SH) await p.screenshot({ path: path.join(SH, `gate-sum-${tag}.png`) })
  // L4 measure the sum step: every button >= 48 px, on screen, text contrast >= 4.5
  const m = await p.evaluate(() => {
    const lum = c => { const v = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4) }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2] }
    const bgOf = el => { for (let e = el; e; e = e.parentElement) { const b = getComputedStyle(e).backgroundColor; if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) return b } return 'rgb(255,255,255)' }
    const out = []
    document.querySelectorAll('.pg-card button, .pg-card .pg-q, .pg-card h2, .pg-card p').forEach(el => {
      const r = el.getBoundingClientRect(), l1 = lum(getComputedStyle(el).color), l2 = lum(bgOf(el))
      out.push({ t: el.tagName, h: Math.round(r.height), w: Math.round(r.width), on: r.top >= 0 && r.bottom <= innerHeight + 0.5 && r.left >= 0 && r.right <= innerWidth + 0.5, cr: +((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2) })
    })
    return out
  })
  if (!m.length) m.push({ t: 'none', h: 0, w: 0, on: false, cr: 0 })
  const btns = m.filter(x => x.t === 'BUTTON')
  ok(btns.length === 4 && btns.every(x => x.h >= 48 && x.w >= 48 && x.on) && m.every(x => x.cr >= 4.5),
    `L4 ${tag}: ${btns.length} buttons, smallest ${Math.min(...btns.map(x => Math.min(x.h, x.w)))} px, all on screen ${btns.every(x => x.on)}, lowest contrast ${Math.min(...m.map(x => x.cr))}`)
  // wrong answer -> beranda, gate gone, no dashboard
  const wrongV = await p.evaluate(a => [...document.querySelectorAll('.pg-ch button')].map(b => +b.dataset.v).find(v => v !== a), q.ans)
  { const wb = await p.$(`.pg-ch button[data-v="${wrongV}"]`); if (wb) await tapEl(p, wb) } await sleep(500)
  const afterWrong = { gate: !!(await p.$('.pg-back')), scr: await active(p) }
  // again: hold + right answer -> the dashboard
  await openGate(p)
  for (let k = 0; k < 4; k++) { const ms = await hold(p, 2300); if (await p.$('#pg-q') || ms >= 2000 || ms < 0) break; tries.push(`${tag} long hold (2nd) seen as ${ms} ms, retried`) }
  const ans = await p.evaluate(() => (document.querySelector('.pg-back') || {}).__ans)
  { const rb = await p.$(`.pg-ch button[data-v="${ans}"]`); if (rb) await tapEl(p, rb) } await sleep(800)
  const afterRight = { gate: !!(await p.$('.pg-back')), scr: await active(p) }
  if (SH) await p.screenshot({ path: path.join(SH, `gate-dash-${tag}.png`) })
  ok(s1.gate && !/screen-dashboard/.test(s1.scr) && early.ms >= 0 && early.ms < 1800 && early.hold && !early.q && q.q && !afterWrong.gate && afterWrong.scr === 'screen-welcome' && !afterRight.gate && /screen-dashboard/.test(afterRight.scr) && !errs.length,
    `L3 ${tag}: Dasbor tap -> gate ${s1.gate} (dashboard ${/screen-dashboard/.test(s1.scr)}); Dasbor retries ${r1}; let go at ${early.ms} ms -> still hold ${early.hold}; hold ${lm} ms -> sum ${q.q}; wrong -> ${afterWrong.scr}; right -> ${afterRight.scr}; errors ${errs.slice(0, 2).join(' | ') || 0}`)
  await c.close()
}
tries.forEach(t => console.log("  retry " + t))
await b.close()
console.log(`qa-prd49-events: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
