#!/usr/bin/env node
// qa-prd38-depth — PRD-38 (docs/prd/PRD-38-kedalaman-animasi-tokoh.md): G19 Pokemon Birds and G24 Bawah Laut
// show depth: several background layers moving at different speeds, and an animated hero.
//   L1 at 390x844, 844x390, 800x1280: >= 3 background layers move, at >= 3 different speeds (each layer's median
//      x-speed over 2 s, wrap-arounds left out), the slowest at most half the fastest
//   L2 every species the child can pick whose animated GIF is in assets/Pokemon/showdown-ani shows that GIF when picked
//      (each evolution stage, through the game's own applyPokemon), and each such GIF has more than one frame; a species
//      without one keeps its still picture (no new art)
//   L3 0 page errors; screenshots (QA_SHOTS=dir) are looked at
// Usage: QA_BASE=http://127.0.0.1:8081 node tools/qa-prd38-depth.mjs   (QA_REDUCED=1: prefers-reduced-motion, L1 must fail)
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'
import { fileURLToPath } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const GIFS = new Set(fs.readdirSync(path.join(ROOT, 'assets/Pokemon/showdown-ani')).map(f => f.replace(/\.gif$/, '')))
const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, ''), SH = process.env.QA_SHOTS
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }

// per game: how to read each layer's objects (x positions) and where the hero is
const GAMES = {
  'pokemon-birds': {
    layers: `({ 'far skyline': parallaxFarSkyline.map(o => o.x), 'far clouds': parallaxFarClouds.map(o => o.x), 'near clouds': parallaxNearClouds.map(o => o.x) })`,
    hero: '#bird-gif', list: 'G19_POKEMON'
  },
  'pokemon-bawah-laut': {
    layers: `({ 'far light': _pxFarBeams.map(o => o.x), 'far bubbles': _pxFarBubbles.map(o => o.x), 'mid fish': _pxMidFish.map(o => o.x), 'front kelp': _pxFgKelp.map(o => o.x) })`,
    hero: '#swimmer-gif', list: 'G24_POKEMON'
  }
}
// frames in a GIF: count image descriptors (0x2C) after walking the block structure
function gifFrames (buf) {
  if (buf.slice(0, 3).toString() !== 'GIF') return 0
  let i = 13, n = 0
  const flags = buf[10]; if (flags & 0x80) i += 3 * (1 << ((flags & 7) + 1))
  const skip = () => { while (i < buf.length && buf[i] !== 0) i += buf[i] + 1; i++ }
  while (i < buf.length) {
    const b = buf[i]
    if (b === 0x3B) break
    if (b === 0x21) { i += 2; skip() } else if (b === 0x2C) {
      n++; const f = buf[i + 9]; i += 10; if (f & 0x80) i += 3 * (1 << ((f & 7) + 1)); i++; skip()
    } else break
  }
  return n
}

const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-audio-output', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
for (const [game, g] of Object.entries(GAMES)) {
  for (const [w, h] of [[390, 844], [844, 390], [800, 1280]]) {
    const tag = `${game} ${w}x${h}`, errs = []
    const c = await b.createBrowserContext(), p = await c.newPage()
    p.on('pageerror', e => errs.push(e.message))
    await p.setViewport({ width: w, height: h, isMobile: true, hasTouch: true })
    if (process.env.QA_REDUCED) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])   // red check: the layers stand still
    await p.evaluateOnNewDocument(() => {
      if (sessionStorage.__s) return
      localStorage.clear(); localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: 'cilik' }]))
      localStorage.setItem('dunia-active-slot', '[0,1]'); localStorage.setItem('dunia-emosi-sound', 'off'); sessionStorage.__s = 1
    })
    await p.goto(BASE + '/games/' + game + '.html?nocine=1', { waitUntil: 'load', timeout: 60000 }); await sleep(2500)
    // start the run (the layers of Bawah Laut move with the run); a tap in the middle of the play field
    await p.evaluate(() => { const cv = document.getElementById('pixi-canvas'); if (cv) cv.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: innerWidth / 2, clientY: innerHeight / 2 })) })
    await sleep(700)
    const read = () => p.evaluate(src => { try { return (0, eval)(src) } catch (e) { return { error: e.message } } }, g.layers)
    const a = await read(); await sleep(2000); const z = await read()
    if (a.error) { ok(false, `L1 ${tag}: layers readable (${a.error})`); await c.close(); continue }
    const speeds = {}
    for (const k of Object.keys(a)) {
      const d = a[k].map((x, i) => (z[k][i] - x) / 2).filter(v => v < 0 && v > -2000).map(v => -v).sort((m, n) => m - n)
      speeds[k] = d.length ? Math.round(d[d.length >> 1] * 10) / 10 : 0
    }
    const moving = Object.values(speeds).filter(v => v > 0), distinct = [...new Set(moving)]
    const spread = moving.length ? Math.min(...moving) / Math.max(...moving) : 1
    ok(moving.length >= 3 && distinct.length >= 3 && spread <= 0.5, `L1 ${tag}: ${moving.length} layers move at ${JSON.stringify(speeds)} px/s (slowest/fastest ${spread.toFixed(2)})`)
    if (w === 390) {   // the species check does not depend on the screen size: once per game
      const slug = src => String(src).split('/').pop().replace(/\.(gif|webp|png)$/, '').replace(/^\d+_/, '')
      const shown = await p.evaluate((list, sel) => {
        const L = (0, eval)(list), out = []
        for (let i = 0; i < L.length; i++) for (let k = 0; k < L[i].evo.length; k++) {
          try { selectedPokemon = i; applyPokemon(k) } catch (e) { out.push({ i, k, err: e.message }); continue }
          const e = document.querySelector(sel); out.push({ name: L[i].evo[k].name, data: L[i].evo[k].src, img: e ? e.getAttribute('src') : null })
        }
        selectedPokemon = 0; try { applyPokemon(0) } catch (e) {}
        return out
      }, g.list, g.hero)
      const want = shown.filter(x => GIFS.has(slug(x.data).replace(/-flying$/, '')) || GIFS.has(slug(x.data)))
      const miss = want.filter(x => !/\.gif$/.test(x.img || ''))
      const frames = {}
      for (const x of shown.filter(x => /\.gif$/.test(x.img || ''))) { const f = slug(x.img); if (!(f in frames)) frames[f] = gifFrames(fs.readFileSync(path.join(ROOT, 'assets/Pokemon/showdown-ani', f + '.gif'))) }
      const flat = Object.entries(frames).filter(([, n]) => n < 2)
      ok(!shown.some(x => x.err) && want.length >= 1 && !miss.length && !flat.length,
        `L2 ${game}: ${shown.length} picks, ${want.length} have a GIF, ${miss.length} not shown as GIF ${miss.map(x => x.name).join(',')}; GIFs shown ${Object.keys(frames).length}, frames ${Object.values(frames).join('/')}`)
    }
    if (SH) {
      fs.mkdirSync(SH, { recursive: true }); await p.screenshot({ path: path.join(SH, `depth-${game}-${w}x${h}.png`) })
      if (game === 'pokemon-birds') {   // the GIF hero as the child sees it: Lugia picked from the bag
        await p.evaluate(() => { selectedPokemon = G19_POKEMON.findIndex(x => x.name === 'Lugia'); applyPokemon(0) }); await sleep(600)
        await p.screenshot({ path: path.join(SH, `depth-${game}-lugia-${w}x${h}.png`) })
      }
    }
    ok(!errs.length, `L3 ${tag}: page errors ${errs.slice(0, 2).join(' | ') || 0}`)
    await c.close()
  }
}
await b.close()
console.log(`qa-prd38-depth: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
