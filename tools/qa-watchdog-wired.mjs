#!/usr/bin/env node
// qa-watchdog-wired — every game page loads the freeze watchdog, so a stall or error on a child's tablet leaves
// evidence (localStorage.__freezeLog, #freezelog). Static: each games/*.html (minus the exempt wrappers) carries the
// script tag. Runtime (BASE set): the watchdog is installed after load on the pages that once lacked it.
// Built 2026-11-10: Timmy, the page of the tablet "no respond" report, was one of 5 game pages without it.
// Usage: node tools/qa-watchdog-wired.mjs   |   BASE=http://127.0.0.1:8097/ node tools/qa-watchdog-wired.mjs
import fs from 'fs'
const EXEMPT = new Map([
  ['blippi.html', 'frame wrapper around the separate game1 repo'],
  ['mojo-chase-embed.html', 'iframe embed; the host page carries the watchdog'],
  ['_shell-smoke.html', 'test fixture']
])
const pages = fs.readdirSync('games').filter(f => f.endsWith('.html') && !EXEMPT.has(f)).sort()
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m) } }
for (const f of pages) ok(/<script[^>]+data\/freeze-watchdog\.js/.test(fs.readFileSync('games/' + f, 'utf8')), `games/${f}: no freeze-watchdog script`)
if (process.env.BASE) {
  const { default: puppeteer } = await import('puppeteer')
  const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output'] })
  for (const f of ['timmy-kapal', 'garasi-tempur', 'kereta-maze', 'mojo-swoptops', 'stinky-dirty']) {
    const p = await b.newPage(); await p.setViewport({ width: 1280, height: 800 })
    const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 100)))
    await p.goto(process.env.BASE + 'games/' + f + '.html?nocine=1', { waitUntil: 'load', timeout: 45000 })
    await new Promise(r => setTimeout(r, 2500))
    ok(await p.evaluate(() => window.__freezeWatchdogInstalled === true), `${f}: watchdog not installed at runtime`)
    ok(!errs.length, `${f}: page errors ${errs.slice(0, 2).join(' | ')}`)
    await p.close()
  }
  await b.close()
}
console.log(`qa-watchdog-wired: ${pass}/${pass + fail} checks passed`)
process.exit(fail ? 1 : 0)
