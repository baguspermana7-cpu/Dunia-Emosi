#!/usr/bin/env node
// qa-ayo-per-child — Ayo Berhitung keeps each child's worksheet and XP under that child's avatar.
//   1. an install from before the fix (one global 'berhitung-v2' store) opens for the active child with that work
//      intact, the work now lives under the child's avatar key and the global key is gone (one-time migration)
//   2. a sibling (other avatar slot) opens a fresh book: xp 0, no solved sets
//   3. the sibling's work is saved under the sibling's own key and does not touch the first child's
//   4. switching back to the first child shows the first child's xp again
//   5. with no avatar chosen the page keeps the legacy global key (no data orphaned)
// Built 2026-11-10: the store was one global key, so siblings overwrote each other's worksheets.
// Usage: QA_URL=http://127.0.0.1:8097/games/ayo-berhitung.html node tools/qa-ayo-per-child.mjs
import puppeteer from 'puppeteer'
const URL = process.env.QA_URL || 'http://localhost:8081/games/ayo-berhitung.html'
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m) } }
const PLAYERS = JSON.stringify([{ name: 'Kakak', animal: '🦁' }, { name: 'Adik', animal: '🐰' }])
const LEGACY = JSON.stringify({ schemaVersion: 2, prefs: { sound: false }, op: 'add', level: 'medium', digits: 0, page: 1, sets: { 'add|medium|d0|1': { nonce: 0, answers: {}, solved: { q1: true } } }, xp: 70 })

const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output'] })
const p = await b.newPage(); await p.setViewport({ width: 1280, height: 800 })
const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 120)))
const open = async () => { await p.goto(URL, { waitUntil: 'load' }); await sleep(600) }
// storage is seeded from a non-game page of the same origin: leaving the game page saves its book on the way out
const seed = async fn => { await p.goto(new globalThis.URL('/manifest.json', URL).href); await p.evaluate(fn) }
const db = () => p.evaluate(() => { const d = window.__berhitung && window.__berhitung.db; return d ? { xp: d.xp, sets: Object.keys(d.sets).length } : null })
const keys = () => p.evaluate(() => ({ g: localStorage.getItem('berhitung-v2'), lion: localStorage.getItem('dunia-avatar-lion-berhitung-v2'), rabbit: localStorage.getItem('dunia-avatar-rabbit-berhitung-v2') }))

await seed(new Function(`localStorage.clear(); localStorage.setItem('dunia-players', ${JSON.stringify(PLAYERS)}); localStorage.setItem('dunia-active-slot', '[0,1]'); localStorage.setItem('berhitung-v2', ${JSON.stringify(LEGACY)})`))
await open()
let d = await db(), k = await keys()
ok(d && d.xp === 70 && d.sets === 1, `child 1 opens with the pre-fix work (${JSON.stringify(d)})`)
ok(k.lion && JSON.parse(k.lion).xp === 70, `child 1's work is under its avatar key (${k.lion && k.lion.slice(0, 40)})`)
ok(k.g === null, `the global key is gone after the move (${k.g && k.g.slice(0, 40)})`)

await seed(() => localStorage.setItem('dunia-active-slot', '[1,0]'))
await open()
d = await db()
ok(d && d.xp === 0 && d.sets <= 1, `child 2 opens a fresh book (${JSON.stringify(d)})`)
await p.evaluate(() => { window.__berhitung.db.xp = 30 })
await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')) })
k = await keys()
ok(k.rabbit && JSON.parse(k.rabbit).xp === 30, `child 2's work is saved under its own key (${k.rabbit && k.rabbit.slice(0, 40)})`)
ok(k.lion && JSON.parse(k.lion).xp === 70, `child 1's work is untouched by child 2 (${k.lion && k.lion.slice(0, 40)})`)

await seed(() => localStorage.setItem('dunia-active-slot', '[0,1]'))
await open()
d = await db()
ok(d && d.xp === 70, `switching back shows child 1's xp (${JSON.stringify(d)})`)

await seed(new Function(`localStorage.clear(); localStorage.setItem('berhitung-v2', ${JSON.stringify(LEGACY)})`))
await open()
d = await db(); k = await keys()
ok(d && d.xp === 70 && k.g !== null, `no avatar: the legacy global key is used as before (${JSON.stringify(d)})`)
ok(!errs.length, `page errors: ${errs.slice(0, 2).join(' | ')}`)
await b.close()
console.log(`qa-ayo-per-child: ${pass}/${pass + fail} checks passed`)
process.exit(fail ? 1 : 0)
