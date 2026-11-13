#!/usr/bin/env node
// qa-profile-age — PRD-19a (docs/prd/PRD-19a-verifikasi-pita-usia.md): the age band a parent picks on the name screen
// is the one stored, and every game page can read it for the child who is playing.
//   L1 a new child on the name screen: the highlighted age button is the age that gets saved when "Lanjut" is tapped
//      (found 2026-11-14: "5–6" was highlighted while 'tumbuh' (7–8) was stored for every child who left it alone)
//   L2 a saved child with no age on record: the highlighted button is the age the games use for that child
//   L3 tapping 9–10 saves 'pintar'
//   L4 a game page (no game.js) reads the active child's band: DuniaProfile.age() = '9-10' / '7-8'
//   L5 siblings keep their own band; a page that locked its child keeps that child's band after the slot changes
// Usage: BASE=http://127.0.0.1:8097/ node tools/qa-profile-age.mjs   (or through tools/run-gates.mjs)
import puppeteer from 'puppeteer'
const BASE = process.env.BASE || 'http://localhost:8090/Dunia-Emosi/'
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m) } }
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-audio-output'] })
const errs = []
async function page (path, seed) {
  const ctx = await b.createBrowserContext(), p = await ctx.newPage()
  p.on('pageerror', e => errs.push(path + ': ' + e.message))
  await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  if (seed) await p.evaluateOnNewDocument(s => { if (!sessionStorage.__seeded) { localStorage.clear(); for (const k in s) localStorage.setItem(k, s[k]); sessionStorage.__seeded = 1 } }, seed)
  await p.goto(BASE + path, { waitUntil: 'load', timeout: 60000 })
  await sleep(1200)
  return { p, ctx }
}
const lit = p => p.$eval('#p1-age .age-btn.active', e => e.dataset.age).catch(() => null)
const stored = p => p.evaluate(() => (JSON.parse(localStorage.getItem('dunia-players') || '[]')[0] || {}).ageTier || null)

// L1: brand-new child, age left alone
{
  const { p, ctx } = await page('index.html?nocine=1', { 'dunia-active-slot': '[0,1]' })
  await p.evaluate(() => { selectMode('solo'); showScreen('screen-names') }); await sleep(400)
  const shown = await lit(p)
  await p.type('#p1-name', 'Ana')
  await p.click('button[onclick*="confirmNames"]'); await sleep(500)
  const saved = await stored(p)
  ok(shown && shown === saved, `L1 new child: highlighted ${shown}, saved ${saved}`)
  console.log('  L1 highlighted', shown, 'saved', saved)
  await ctx.close()
}
// L2 + L3: saved child without an age on record, then tap 9-10
{
  const { p, ctx } = await page('index.html?nocine=1', { 'dunia-players': JSON.stringify([{ name: 'Lama', animal: '🦁', stars: 3 }]), 'dunia-active-slot': '[0,1]' })
  await p.evaluate(() => { selectMode('solo'); showScreen('screen-names') }); await sleep(400)
  const shown = await lit(p), used = await p.evaluate(() => state.players[0].ageTier)
  ok(shown && shown === used, `L2 old child: highlighted ${shown}, games use ${used}`)
  await p.click('#p1-age .age-btn[data-age="pintar"]'); await sleep(150)
  await p.click('button[onclick*="confirmNames"]'); await sleep(500)
  ok(await stored(p) === 'pintar', 'L3 tapping 9-10 saves pintar: ' + await stored(p))
  await ctx.close()
}
// L4 + L5: a game page reads the band of the child who is playing
{
  const players = JSON.stringify([{ name: 'Kakak', animal: '🦁', ageTier: 'pintar' }, { name: 'Adik', animal: '🐰', ageTier: 'tumbuh' }, { name: 'Lama', animal: '🐸' }])
  const { p, ctx } = await page('games/kuis-matematika.html', { 'dunia-players': players, 'dunia-active-slot': '[0,1]' })
  const r = await p.evaluate(() => {
    const P = window.DuniaProfile; if (!P) return null
    const out = { a: P.age(), tierA: P.ageTier() }
    localStorage.setItem('dunia-active-slot', '[1,0]'); out.b = P.age()
    localStorage.setItem('dunia-active-slot', '[2,0]'); out.old = P.age()
    localStorage.setItem('dunia-active-slot', '[0,1]'); window.lockGameAvatarSession && lockGameAvatarSession()
    localStorage.setItem('dunia-active-slot', '[1,0]'); out.locked = P.age()
    return out
  })
  ok(r, 'L4 DuniaProfile exists on a game page')
  if (r) {
    ok(r.a === '9-10' && r.tierA === 'pintar', 'L4 active child band 9-10: ' + JSON.stringify(r))
    ok(r.b === '7-8', 'L5 sibling keeps own band: ' + r.b)
    ok(r.old === '7-8', 'L5 child with no age on record reads the band game.js uses (7-8): ' + r.old)
    ok(r.locked === '9-10', 'L5 locked page keeps its child after the slot changes: ' + r.locked)
  }
  await ctx.close()
}
ok(!errs.length, 'no page errors: ' + errs.slice(0, 3).join(' | '))
await b.close()
console.log(`qa-profile-age: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
