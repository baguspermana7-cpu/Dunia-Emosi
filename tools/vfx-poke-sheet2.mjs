// vfx-poke-sheet2.mjs — 6 types x 3 moments (wind-up / mid-flight / impact) at 1280x800, cropped to the arena.
//   node tools/vfx-poke-sheet2.mjs <outdir> [g10|gym]
import puppeteer from 'puppeteer'
import fs from 'fs'
import { execFileSync } from 'child_process'
const OUT = process.argv[2] || 'tools/qa-out/vfx-sheets2'
const games = process.argv.slice(3).length ? process.argv.slice(3) : ['g10', 'gym']
fs.mkdirSync(OUT, { recursive: true })
const BASE = 'http://localhost:8081', sleep = ms => new Promise(r => setTimeout(r, ms))
const TYPES = ['fire', 'water', 'electric', 'grass', 'ice', 'psychic']
const noSW = () => { try { Object.defineProperty(navigator, 'serviceWorker', { configurable: true, get: () => ({ register: () => Promise.reject(new Error('blocked')), addEventListener () {}, ready: Promise.resolve({}) }) }) } catch (_) {} }
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--use-gl=swiftshader'] })
const G = {
  g10: { url: '/index.html', moments: [110, 250, 400], arena: '#g10-field', boot: async p => {
    await p.waitForFunction(() => typeof window.initGame10 === 'function', { timeout: 25000 })
    await p.evaluate(() => { try { document.getElementById('page-loader').remove() } catch (_) {} window.state = window.state || {}
      Object.assign(window.state, { players: [{ animal: '🦊', name: 'Rara', stars: 0, ageTier: 'tumbuh' }, { animal: '🐼', name: 'Bimo', stars: 0, ageTier: 'tumbuh' }], currentPlayer: 0, mode: 'solo', selectedLevel: 'easy', selectedLevelNum: 3, gameStars: [0, 0], currentGame: 10 })
      showScreen('screen-game10'); initGame10() })
    await p.waitForFunction(() => document.querySelectorAll('#g10-choices button').length >= 4, { timeout: 20000 }); await sleep(2500)
  }, fire: (p, t) => p.evaluate(t => g10DoAttack(t, 'player', 'enemy', () => {}), t) },
  gym: { url: '/games/gym-pokemon.html', moments: [230, 700, 880], arena: '.ba-field', boot: async p => {
    await sleep(2500)
    const click = async (sel, ms) => { await p.evaluate(s => { const c = document.querySelector(s); if (c && (c.offsetParent || c.id)) c.click() }, sel); await sleep(ms) }
    await click('.trainer-card.current', 1500); await click('.pkg-card:not(.locked)', 1500); await click('.trainer-card.current', 1500); await click('#gw-fight', 1500)
    await click('.bm-card[data-mode="adventure"]', 2500); await click('#tcf-go', 1500); await click('#tcf-go', 8000)
  }, fire: (p, t) => p.evaluate(t => BattleArena.attack('player', { type: t, color: '#fff', superEff: true }, () => {}), t) }
}
for (const g of games) {
  const p = await b.newPage(); await p.setViewport({ width: 1280, height: 800 }); await p.evaluateOnNewDocument(noSW)
  await p.goto(BASE + G[g].url, { waitUntil: 'domcontentloaded', timeout: 40000 }); await G[g].boot(p)
  const box = await p.evaluate(sel => { const r = (document.querySelector(sel) || document.body).getBoundingClientRect(); return [Math.max(0, r.left), Math.max(0, r.top), Math.min(1280, r.width), Math.min(800, r.height)].map(Math.round) }, G[g].arena)
  const cdp = await p.createCDPSession(); let frames = []
  cdp.on('Page.screencastFrame', async f => { frames.push({ t: f.metadata.timestamp * 1000, d: f.data }); try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }) } catch (_) {} })
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 80, maxWidth: 1280, maxHeight: 800, everyNthFrame: 1 })
  const d = `${OUT}/${g}`; fs.mkdirSync(d, { recursive: true })
  for (const t of TYPES) {
    await sleep(1300); frames = []; const t0 = Date.now(); await G[g].fire(p, t); await sleep(1300)
    const pick = G[g].moments.map(m => frames.reduce((a, c) => Math.abs(c.t - t0 - m) < Math.abs(a.t - t0 - m) ? c : a, frames[0]))
    pick.forEach((f, i) => fs.writeFileSync(`${d}/${t}-${i}.jpg`, Buffer.from(f.d, 'base64')))
    console.log(g, t, 'frames', frames.length, 'at', pick.map(f => Math.round(f.t - t0)).join('/'))
  }
  await cdp.send('Page.stopScreencast'); await p.close()
  execFileSync('python3', ['-c', `
from PIL import Image, ImageDraw
x,y,w,h=${JSON.stringify(box)}; T=${JSON.stringify(TYPES)}; sc=0.62
tw,th=int(w*sc),int(h*sc); S=Image.new('RGB',(tw*3+4*6+70,(th+6)*len(T)),(18,18,26)); dr=ImageDraw.Draw(S)
for r,t in enumerate(T):
    dr.text((4,r*(th+6)+th//2),t,fill=(255,255,255))
    for c in range(3):
        im=Image.open('${d}/%s-%d.jpg'%(t,c)); im=im.resize((1280,800)).crop((x,y,x+w,y+h)).resize((tw,th)); S.paste(im,(70+c*(tw+6),r*(th+6)))
S.save('${OUT}/${g}-sheet.png'); print(S.size)`])
}
await b.close()
