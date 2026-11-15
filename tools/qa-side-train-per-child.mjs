#!/usr/bin/env node
// qa-side-train-per-child — the side race keeps each child's own train (audit A-14).
//   1. child A picks train X in Balapan Kereta, child B picks train Y; the side race shows X for A and Y for B
//   2. a choice saved before the fix (one global 'dunia_side_train') moves to the child playing, once: the global key
//      is gone afterwards and the sibling does not inherit it
//   3. the side race's "tutorial seen" flag is the child's own: A finishing it leaves B's tutorial unseen
// Built 2026-11-15: the choice was one global key, so whichever child picked last decided the other child's train.
// Usage: QA_BASE=http://127.0.0.1:8097 node tools/qa-side-train-per-child.mjs
import puppeteer from 'puppeteer'
const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, '')
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m) } }
const PLAYERS = JSON.stringify([{ name: 'Kakak', animal: '🦁' }, { name: 'Adik', animal: '🐰' }])

const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output'] })
const p = await b.newPage(); await p.setViewport({ width: 1280, height: 800 })
const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 120)))
const seed = async fn => { await p.goto(BASE + '/manifest.json'); await p.evaluate(fn) }
const asChild = slot => seed(new Function(`localStorage.setItem('dunia-active-slot', '[${slot},${1 - slot}]'); sessionStorage.clear()`))
// pick a train the way the child does: open its category, tap its card, tap "side race"
async function pick (key) {
  await p.goto(BASE + '/games/balapan-kereta.html', { waitUntil: 'load' })
  await p.waitForFunction('typeof TRAIN_CATS !== "undefined" && typeof showTrainsForCat === "function"', { timeout: 20000 })
  // the card is found by what tapping it selects, so a filtered or reordered grid cannot pick the wrong train
  const found = await p.evaluate(k => {
    const cat = TRAIN_CATS.find(c => (c.trains || []).some(t => t.key === k)); if (!cat) return false
    showTrainsForCat(cat)
    for (const card of document.querySelectorAll('#select-body .train-card')) { card.click(); if (window.selectedTrainKey === k) return true }
    return false
  }, key)
  if (!found) return false
  await Promise.all([p.waitForNavigation({ waitUntil: 'load', timeout: 20000 }).catch(() => null), p.evaluate(() => g14LaunchSideRace())])
  return true
}
// the train the side race actually runs with
async function sideTrain () {
  if (!/balapan-kereta-side\.html/.test(p.url())) await p.goto(BASE + '/games/balapan-kereta-side.html', { waitUntil: 'load' })
  await p.waitForFunction('typeof S !== "undefined" && S.trainCfg && S.trainCfg.key', { timeout: 20000 }).catch(() => null)
  return p.evaluate('typeof S !== "undefined" && S.trainCfg ? S.trainCfg.key : null')
}
const store = () => p.evaluate(() => ({ g: localStorage.getItem('dunia_side_train'), lion: localStorage.getItem('dunia-avatar-lion-dunia_side_train'), rabbit: localStorage.getItem('dunia-avatar-rabbit-dunia_side_train'), tg: localStorage.getItem('g14s-tutorial-seen'), tlion: localStorage.getItem('dunia-avatar-lion-g14s-tutorial-seen'), trabbit: localStorage.getItem('dunia-avatar-rabbit-g14s-tutorial-seen') }))

// two trains that are not the side race's default (Thomas), so a fallback cannot pass for a kept choice
await seed(new Function(`localStorage.clear(); localStorage.setItem('dunia-players', ${JSON.stringify(PLAYERS)}); localStorage.setItem('dunia-active-slot', '[0,1]')`))
await p.goto(BASE + '/games/balapan-kereta.html', { waitUntil: 'load' })
await p.waitForFunction('typeof TRAIN_CATS !== "undefined"', { timeout: 20000 })
const [X, Y] = await p.evaluate(() => {
  const keys = []   // every train a child can actually tap, in grid order
  for (const cat of TRAIN_CATS) {
    showTrainsForCat(cat)
    for (const card of document.querySelectorAll('#select-body .train-card')) { window.selectedTrainKey = null; card.click(); if (window.selectedTrainKey) keys.push(window.selectedTrainKey) }
  }
  const k = keys.filter(x => x !== 'aeg_thomas')
  return [k[0], k[1]]
})
ok(X && Y && X !== Y, `two distinct trains to pick (${X}, ${Y})`)

await asChild(0); ok(await pick(X), `child A picked ${X}`)
let t = await sideTrain(); ok(t === X, `right after the pick, A's side race runs ${X} (got ${t})`)
await asChild(1); ok(await pick(Y), `child B picked ${Y}`)
t = await sideTrain(); ok(t === Y, `right after the pick, B's side race runs ${Y} (got ${t})`)
await asChild(0); t = await sideTrain(); ok(t === X, `A opens the side race later: still ${X} (got ${t})`)
await asChild(1); t = await sideTrain(); ok(t === Y, `B opens the side race later: still ${Y} (got ${t})`)
let s = await store()
ok(s.lion === X && s.rabbit === Y && s.g === null, `each choice lives under its child's key, no global key (${JSON.stringify([s.g, s.lion, s.rabbit])})`)

// tutorial flag: A finishes the side race tutorial, B's stays unseen
await asChild(0); await sideTrain(); await p.evaluate(() => { try { g14sTutorialFinish() } catch (e) {} })
s = await store()
ok(s.tlion === '1' && s.trabbit === null && s.tg === null, `A's finished tutorial is A's alone (${JSON.stringify([s.tg, s.tlion, s.trabbit])})`)

// legacy: a choice saved before the fix moves to the child playing, once
await seed(new Function(`localStorage.clear(); localStorage.setItem('dunia-players', ${JSON.stringify(PLAYERS)}); localStorage.setItem('dunia-active-slot', '[0,1]'); localStorage.setItem('dunia_side_train', ${JSON.stringify(X)})`))
t = await sideTrain(); s = await store()
ok(t === X, `legacy choice: A's side race runs it (got ${t})`)
ok(s.lion === X && s.g === null, `legacy choice moved to A, global key gone (${JSON.stringify([s.g, s.lion])})`)
await asChild(1); t = await sideTrain(); s = await store()
ok(t !== X && s.rabbit === null, `B does not inherit A's legacy choice (got ${t}, rabbit key ${s.rabbit})`)

ok(!errs.length, `page errors: ${errs.slice(0, 2).join(' | ')}`)
await b.close()
console.log(`qa-side-train-per-child: ${pass}/${pass + fail} checks passed`)
process.exit(fail ? 1 : 0)
