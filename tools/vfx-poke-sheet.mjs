// vfx-poke-sheet.mjs — before/after attack frame sheets for the Pokemon games (QA aid, not a gate).
// before = vfx-poke.js blocked (the old per-game effect); after = shared VFX library. 6 frames over ~0.6 s
// grabbed with CDP screencast, tiled with PIL.   node tools/vfx-poke-sheet.mjs <outdir> [g10|g13|g13b|gym]...
import puppeteer from 'puppeteer'
import fs from 'fs'
import { execFileSync } from 'child_process'
const OUT = process.argv[2] || 'tools/qa-out/vfx-sheets'
const games = process.argv.slice(3).length ? process.argv.slice(3) : ['g10', 'g13', 'g13b', 'gym']
fs.mkdirSync(OUT, { recursive: true })
const BASE = 'http://localhost:8081'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--use-gl=swiftshader'] })
const noSW = () => { try { Object.defineProperty(navigator, 'serviceWorker', { configurable: true, get: () => ({ register: () => Promise.reject(new Error('blocked')), addEventListener () {}, ready: Promise.resolve({}) }) }) } catch (_) {} }
const G = {
  g10: { url: '/index.html', type: 'electric', boot: async p => {
    await p.waitForFunction(() => typeof window.initGame10 === 'function', { timeout: 25000 })
    await p.evaluate(() => { try { document.getElementById('page-loader').remove() } catch (_) {} window.state = window.state || {}
      Object.assign(window.state, { players: [{ animal: '🦊', name: 'Rara', stars: 0, ageTier: 'tumbuh' }, { animal: '🐼', name: 'Bimo', stars: 0, ageTier: 'tumbuh' }], currentPlayer: 0, mode: 'solo', selectedLevel: 'easy', selectedLevelNum: 3, gameStars: [0, 0], currentGame: 10 })
      showScreen('screen-game10'); initGame10() })
    await p.waitForFunction(() => document.querySelectorAll('#g10-choices button').length >= 4, { timeout: 20000 }); await sleep(2500)
  }, fire: p => p.evaluate(() => g10DoAttack('electric', 'player', 'enemy', () => {})) },
  g13: { url: '/index.html', boot: async p => {
    await p.waitForFunction(() => typeof window.initGame13 === 'function', { timeout: 25000 })
    await p.evaluate(() => { try { document.getElementById('page-loader').remove() } catch (_) {} window.state = window.state || {}
      Object.assign(window.state, { players: [{ animal: '🦊', name: 'Rara', stars: 0, ageTier: 'tumbuh' }], currentPlayer: 0, mode: 'solo', selectedLevel: 'easy', selectedLevelNum: 3, gameStars: [0], currentGame: 13 })
      try { localStorage.setItem('g13_lastFamily', 'pikachu') } catch (_) {}
      showScreen('screen-game13'); initGame13() }); await sleep(4000)
  }, fire: p => p.evaluate(() => g13SpawnAttackEffect('Fire', true, 'g13-field', { defType: 'Grass' })) },
  g13b: { url: '/index.html', boot: async p => {
    await p.waitForFunction(() => typeof window.initGame13b === 'function', { timeout: 25000 })
    await p.evaluate(() => { try { document.getElementById('page-loader').remove() } catch (_) {} window.state = window.state || {}
      Object.assign(window.state, { players: [{ animal: '🦊', name: 'Rara', stars: 0, ageTier: 'tumbuh' }], currentPlayer: 0, mode: 'solo', selectedLevel: 'easy', selectedLevelNum: 3, gameStars: [0], currentGame: '13b' })
      showScreen('screen-game13b'); initGame13b() }); await sleep(4000)
  }, fire: p => p.evaluate(() => g13SpawnAttackEffect('Electric', true, 'g13b-field')) },
  gym: { url: '/games/gym-pokemon.html', boot: async p => {
    await sleep(2500)
    const click = async (sel, ms) => { await p.evaluate(s => { const c = document.querySelector(s); if (c && (c.offsetParent || c.id)) c.click() }, sel); await sleep(ms) }
    await click('.trainer-card.current', 1500); await click('.pkg-card:not(.locked)', 1500); await click('.trainer-card.current', 1500); await click('#gw-fight', 1500)
    await click('.bm-card[data-mode="adventure"]', 2500); await click('#tcf-go', 1500); await click('#tcf-go', 8000)
  }, fire: p => p.evaluate(() => BattleArena.attack('player', { type: 'fire', color: '#f97316', superEff: true }, () => {})) }
}
async function shoot (g, block) {
  const p = await b.newPage(); const errs = []
  p.on('pageerror', e => errs.push(e.message))
  await p.setViewport({ width: 1100, height: 700, hasTouch: true })
  await p.evaluateOnNewDocument(noSW)
  if (block) { await p.setCacheEnabled(false); await p.setRequestInterception(true); p.on('request', r => /vfx-poke\.js/.test(r.url()) ? r.abort() : r.continue()) }
  await p.goto(BASE + G[g].url, { waitUntil: 'domcontentloaded', timeout: 40000 })
  await G[g].boot(p)
  const cdp = await p.createCDPSession(); const frames = []
  cdp.on('Page.screencastFrame', async f => { frames.push({ t: f.metadata.timestamp, d: f.data }); try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }) } catch (_) {} })
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 70, everyNthFrame: 1 })
  await sleep(150); const t0 = Date.now() / 1000
  await G[g].fire(p); await sleep(1100)
  await cdp.send('Page.stopScreencast'); await p.close()
  const rel = frames.map(f => ({ ms: Math.round((f.t - t0) * 1000), d: f.d })).filter(f => f.ms > -50 && f.ms < 800)
  const want = [0, 110, 220, 330, 440, 560], pick = want.map(w => rel.reduce((a, c) => Math.abs(c.ms - w) < Math.abs(a.ms - w) ? c : a, rel[0] || { ms: 0, d: '' }))
  const dir = `${OUT}/${g}-${block ? 'before' : 'after'}`; fs.mkdirSync(dir, { recursive: true })
  pick.forEach((f, i) => f.d && fs.writeFileSync(`${dir}/f${i}-${f.ms}ms.jpg`, Buffer.from(f.d, 'base64')))
  return { n: frames.length, errs }
}
for (const g of games) {
  const a = await shoot(g, true), c = await shoot(g, false)
  console.log(g, 'frames before/after', a.n, c.n, 'errors', a.errs.length + c.errs.length)
  execFileSync('python3', ['-c', `
import glob,sys
from PIL import Image, ImageDraw
rows=[]
for k in ('before','after'):
    fs=sorted(glob.glob('${OUT}/${g}-%s/f*.jpg'%k), key=lambda p:int(p.split('/f')[-1].split('-')[0]))
    rows.append([Image.open(f) for f in fs])
w=max(i.width for r in rows for i in r) if rows[0] else 100; h=max(i.height for r in rows for i in r) if rows[0] else 100
# crop the arena band (middle) so the sheet stays small
sc=0.36; tw,th=int(w*sc),int(h*sc)
S=Image.new('RGB',(tw*6+6*5+60,(th+18)*2),(20,20,28)); d=ImageDraw.Draw(S)
for ri,r in enumerate(rows):
    d.text((2,ri*(th+18)+th//2),('BEFORE','AFTER')[ri],fill=(255,255,255))
    for ci,im in enumerate(r): S.paste(im.resize((tw,th)),(60+ci*(tw+6),ri*(th+18)+16))
S.save('${OUT}/${g}-sheet.png')`])
}
await b.close()
