#!/usr/bin/env node
// qa-profile-settings — PRD-18 (docs/prd/PRD-18-setelan-profil-dipakai-semua.md): sound, vibration and the maths level
// are set per child; every game page reads the settings of the child who is playing.
//   L1 child A turns sound off in the hub settings, child B leaves it on: each child's setting is the one in force on the
//      hub after switching, and on three game pages (Kuis, Timmy, Mojo)
//   L2 an install from before this change (sound already off, two children, no per-child copy) keeps sound off for BOTH
//      children: the update changes nothing a child hears; a child added later starts with sound on
//   L3 vibration and "Matematika lanjut" follow the child the same way
// Usage: QA_BASE=http://127.0.0.1:8097 node tools/qa-profile-settings.mjs   (or through tools/run-gates.mjs)
import puppeteer from 'puppeteer'
const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, '')
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-audio-output'] })
const errs = []
const keys = () => ({ sound: localStorage.getItem('dunia-emosi-sound'), vib: localStorage.getItem('dunia-emosi-vibrate'), adv: localStorage.getItem('dunia-emosi-mathadv') })
const on = v => v !== 'off'

{
  const ctx = await b.createBrowserContext(), p = await ctx.newPage()
  p.on('pageerror', e => errs.push(e.message))
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
  await p.evaluateOnNewDocument(() => {
    if (sessionStorage.__s) return
    localStorage.clear()
    localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: 'cilik' }, { name: 'Budi', animal: '🐰', ageTier: 'pintar' }]))
    localStorage.setItem('dunia-active-slot', '[0,1]'); sessionStorage.__s = 1
  })
  await p.goto(BASE + '/index.html', { waitUntil: 'load', timeout: 60000 }); await sleep(1200)
  // child A (Ana): sound off, vibration off, maths advanced on - through the hub's own setting toggles
  await p.evaluate(() => { toggleSoundSetting(); toggleVibrateSetting(); toggleMathAdvanced() })
  const a0 = await p.evaluate(keys)
  // switch to child B (Budi) the way the hub does
  await p.evaluate(() => { window._pSlot = [1, 1]; _saveActiveSlot() })
  const b0 = await p.evaluate(keys)
  ok(!on(a0.sound) && on(b0.sound), `L1 hub: Ana turned sound off (${a0.sound}); switching to Budi puts his on (${b0.sound})`)
  ok(!on(a0.vib) && on(b0.vib) && a0.adv === 'on' && b0.adv !== 'on', `L3 vibration and maths level follow the child (Ana ${a0.vib}/${a0.adv}, Budi ${b0.vib}/${b0.adv})`)
  for (const pg of ['/games/kuis-matematika.html?nocine=1', '/games/timmy-kapal.html', '/games/mojo-swoptops.html']) {
    await p.goto(BASE + pg, { waitUntil: 'load', timeout: 60000 }); await sleep(800)
    const bb = await p.evaluate(keys)
    await p.evaluate(() => localStorage.setItem('dunia-active-slot', '[0,1]'))
    await p.goto(BASE + pg, { waitUntil: 'load', timeout: 60000 }); await sleep(800)
    const aa = await p.evaluate(keys)
    await p.evaluate(() => localStorage.setItem('dunia-active-slot', '[1,1]'))
    ok(on(bb.sound) && !on(aa.sound) && on(bb.vib) && !on(aa.vib), `L1 ${pg.split('?')[0]}: Budi plays with sound ${bb.sound || 'on'}, Ana with sound ${aa.sound}`)
  }
  await ctx.close()
}
{
  const ctx = await b.createBrowserContext(), p = await ctx.newPage()
  p.on('pageerror', e => errs.push(e.message))
  await p.evaluateOnNewDocument(() => {
    if (sessionStorage.__s) return
    localStorage.clear()
    localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: 'cilik' }, { name: 'Budi', animal: '🐰', ageTier: 'pintar' }]))
    localStorage.setItem('dunia-active-slot', '[0,1]')
    localStorage.setItem('dunia-emosi-sound', 'off')   // set before per-child settings existed
    sessionStorage.__s = 1
  })
  await p.goto(BASE + '/games/kuis-matematika.html?nocine=1', { waitUntil: 'load', timeout: 60000 }); await sleep(800)
  const k = await p.evaluate(keys)
  await p.evaluate(() => localStorage.setItem('dunia-active-slot', '[1,1]'))
  await p.goto(BASE + '/games/kuis-matematika.html?nocine=1', { waitUntil: 'load', timeout: 60000 }); await sleep(800)
  const k2 = await p.evaluate(keys)
  // a third child joins later
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('dunia-players')); s.push({ name: 'Cici', animal: '🐼', ageTier: 'tumbuh' }); localStorage.setItem('dunia-players', JSON.stringify(s)); localStorage.setItem('dunia-active-slot', '[2,1]') })
  await p.goto(BASE + '/games/kuis-matematika.html?nocine=1', { waitUntil: 'load', timeout: 60000 }); await sleep(800)
  const k3 = await p.evaluate(keys)
  ok(!on(k.sound) && !on(k2.sound), `L2 an old install keeps sound off for both children (Ana ${k.sound}, Budi ${k2.sound})`)
  ok(on(k3.sound), `L2 a child added after the update starts with sound on (${k3.sound || 'on'})`)
  await ctx.close()
}
ok(!errs.length, 'no page errors: ' + errs.slice(0, 3).join(' | '))
await b.close()
console.log(`qa-profile-settings: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
