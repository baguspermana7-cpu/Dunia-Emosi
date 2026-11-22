#!/usr/bin/env node
// record-offline-runtime — PRD-23: the files a game asks for while it runs (sprites, level art, sounds, data loaded by
// a computed name), which the static scan in build-offline-manifest.mjs cannot see. Opens every game of the manifest
// in a real browser, starts it (a hub game: level 1 of that game), and writes the same-origin requests of the first
// seconds to games/data/offline-runtime.json. The release token (?v=v64...) is stored as {v}; the builder puts the
// current one back, so a token bump does not make this file stale.
// Re-record after a game changes what it loads (the offline gate tools/qa-prd23-offline.mjs lists what a badged game
// missed offline: that list is the signal).
// Usage: QA_BASE=http://127.0.0.1:8081 node tools/record-offline-runtime.mjs
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'
const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..')
const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, '') + '/'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const MAN = JSON.parse(fs.readFileSync(path.join(ROOT, 'games/data/offline-manifest.json'), 'utf8')).games
const TOKEN = (fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').match(/save-engine\.js\?v=([^"']+)/) || [, ''])[1]
const b = await puppeteer.launch({ headless: 'new', protocolTimeout: 240000, args: ['--no-sandbox', '--disable-audio-output'] })
const out = {}
for (const id of Object.keys(MAN)) {
  const pg = MAN[id].page, c = await b.createBrowserContext(), p = await c.newPage(), seen = new Set()
  p.on('request', r => { const u = r.url(); if (u.startsWith(BASE) && r.method() === 'GET') seen.add(u.slice(BASE.length)) })
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
  await p.evaluateOnNewDocument(() => {
    if (!sessionStorage.__s) {
      localStorage.clear(); localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: 'tumbuh' }, { name: 'Bima', animal: '🐯', ageTier: 'tumbuh' }]))
      localStorage.setItem('dunia-active-slot', '[0,1]'); localStorage.setItem('dunia-emosi-sound', 'on'); sessionStorage.__s = 1
    }
  })
  await p.goto(BASE + pg, { waitUntil: 'load', timeout: 120000 }).catch(() => {})
  await sleep(4000)
  if (pg === 'index.html' && /^\d+$/.test(id)) {
    await p.evaluate(n => { try { state.players = [{ name: 'Ana', animal: '🦁', ageTier: 'tumbuh', stars: 0 }, { name: 'Bima', animal: '🐯', ageTier: 'tumbuh', stars: 0 }]; state.mode = 'solo'; state.currentPlayer = 0; state.currentGame = n; startGameWithLevel(1) } catch (e) {} }, +id)
    await sleep(5000)
  }
  out[id] = [...seen].filter(u => !/(^|\/)sw\.js|offline-(manifest|runtime)\.json|[?&]x=/.test(u)).map(u => TOKEN ? u.split(TOKEN).join('{v}') : u).sort()
  console.log(`${id.padEnd(4)} ${pg.padEnd(44)} ${out[id].length} requests`)
  await c.close()
}
await b.close()
fs.writeFileSync(path.join(ROOT, 'games/data/offline-runtime.json'), JSON.stringify({ about: 'PRD-23: same-origin files each game asks for while it runs; recorded by tools/record-offline-runtime.mjs ({v} = the release token).', games: out }, null, 1) + '\n')
