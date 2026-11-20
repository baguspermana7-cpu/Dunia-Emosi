#!/usr/bin/env node
// qa-prd44-g10 — PRD-44 (docs/prd/PRD-44-g10-cuaca-dan-tipe.md): G10 Pertarungan Pokemon.
//   L1 the type table: 18 attacking types x 18 defending types, every entry 1.5 / 1 / 0.75 / 0.5 (the kid-mild map of
//      the canonical 2 / 1 / 0.5 / 0), canonical spot pairs right, every type in assets/Pokemon/pokemon-db.json known
//   L2 a super-effective hit shows its sign (eff-text) and takes 2 HP; the battle's weather is announced with the boosted
//      type's pill, and a neutral hit of a boosted type takes 2 HP in that weather against 1 HP in clear weather (real taps)
//   L3 no battle is impossible: an enemy hit costs the child exactly 1 HP whatever its type, the child is back to full HP
//      when the next enemy comes (both proven on the page); with those rules, a Monte Carlo of the real G10_LEVELS table
//      (worst pairing: the child's type resisted) wins >= 85 % of 3000 runs at 80 % right on every one of the 40 levels
//   L4 0 page errors; screenshots (QA_SHOTS=dir) of the weather banner at 390x844, 844x390, 800x1280 are looked at
// Usage: QA_BASE=http://127.0.0.1:8081 node tools/qa-prd44-g10.mjs   (L1 + the L3 model run without QA_BASE too)
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8')
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }

// L1 type table
{
  const win = { document: { createElement: () => ({ style: {} }), head: { appendChild () {} }, body: { appendChild () {} } } }
  win.window = win
  vm.runInNewContext(rd('games/data/poke-type-chart.js'), win)
  const T = ['normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy']
  const vals = new Set(); for (const a of T) for (const d of T) vals.add(win.calcTypeMult(a, d))
  const spot = [['fire', 'grass', 1.5], ['water', 'fire', 1.5], ['grass', 'fire', 0.75], ['electric', 'ground', 0.5], ['normal', 'ghost', 0.5], ['ghost', 'normal', 0.5],
    ['ground', 'flying', 0.5], ['dragon', 'fairy', 0.5], ['fighting', 'dark', 1.5], ['ice', 'dragon', 1.5], ['fairy', 'dragon', 1.5], ['psychic', 'dark', 0.5], ['bug', 'psychic', 1.5], ['normal', 'normal', 1]]
  const badSpot = spot.filter(([a, d, m]) => win.calcTypeMult(a, d) !== m)
  const db = JSON.parse(rd('assets/Pokemon/pokemon-db.json'))
  const dbTypes = new Set(db.flatMap(p => [p.type, p.type2].filter(Boolean).map(t => String(t).toLowerCase())))
  const unknown = [...dbTypes].filter(t => !T.includes(t))
  ok(Object.keys(win.POKE_EFF).length === 18 && [...vals].every(v => [1.5, 1, 0.75, 0.5].includes(v)) && !badSpot.length && !unknown.length,
    `L1 18 x 18 table: values {${[...vals].sort().join(', ')}}, ${spot.length - badSpot.length}/${spot.length} canonical pairs right, ${dbTypes.size} types in pokemon-db (${db.length} Pokemon), unknown ${unknown.join(',') || 0}`)
}

// L3 model over the real level table, with the rules the page is checked for below
{
  const m = rd('game.js').match(/const G10_LEVELS\s*=\s*\{([\s\S]*?)\n\}/)
  const L = vm.runInNewContext('({' + m[1] + '})')
  let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const sim = (cfg, p, trials) => {
    let win = 0
    for (let t = 0; t < trials; t++) {
      let alive = true
      for (let r = 0; r < cfg.rounds && alive; r++) {
        let ph = cfg.hp, eh = cfg.hp, att = 0 // full HP for every enemy
        while (eh > 0) {
          if (rnd() < p) { eh -= 1; att = 0 } // the child's type resisted: max(1, round(1.25 x 0.75)) = 1
          else if (++att >= cfg.attemptsBeforeDamage) { ph -= 1; att = 0; if (ph <= 0) { alive = false; break } }
        }
      }
      if (alive) win++
    }
    return win / trials
  }
  const rates = Object.keys(L).map(lv => [lv, sim(L[lv], 0.8, 3000)])
  const worst = rates.reduce((a, b) => (b[1] < a[1] ? b : a))
  ok(rates.length === 40 && worst[1] >= 0.85, `L3 model, 40 levels, worst pairing, 80 % right: lowest win rate ${Math.round(worst[1] * 100)} % at level ${worst[0]} (law >= 85 %)`)
}

if (process.env.QA_BASE) {
  const { default: puppeteer } = await import('puppeteer')
  const BASE = process.env.QA_BASE.replace(/\/$/, ''), SH = process.env.QA_SHOTS
  const NOISE = /favicon|pokemondb|showdown|ipapi|googleapis|gstatic|deviceorientation|pokeapi/i
  const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-audio-output', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  const open = async ([w, h], errs) => {
    const c = await b.createBrowserContext(), p = await c.newPage()
    p.on('pageerror', e => { if (!NOISE.test(e.message)) errs.push(e.message) })
    await p.setViewport({ width: w, height: h, isMobile: true, hasTouch: true })
    await p.evaluateOnNewDocument(() => {
      if (!sessionStorage.__s) {
        localStorage.clear(); localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: 'tumbuh' }]))
        localStorage.setItem('dunia-active-slot', '[0,1]'); localStorage.setItem('dunia-emosi-sound', 'off'); sessionStorage.__s = 1
      }
    })
    await p.goto(BASE + '/index.html?nocine=1', { waitUntil: 'load', timeout: 60000 })
    await p.waitForFunction(() => typeof window.startGameWithLevel === 'function' && typeof window.g10WeatherMult === 'function', { timeout: 30000 }).catch(() => {})
    await sleep(600)
    await p.evaluate(() => {
      state.players = [{ name: 'Ana', animal: '🦁', ageTier: 'tumbuh', stars: 0 }, { name: 'Bima', animal: '🐯', ageTier: 'tumbuh', stars: 0 }]
      state.mode = 'solo'; state.currentPlayer = 0; state.currentGame = 10; startGameWithLevel(5)
    })
    await p.waitForFunction(() => typeof g10State !== 'undefined' && g10State.playerPoke && document.querySelectorAll('.g10-cbtn').length >= 2, { timeout: 20000 }).catch(() => {})
    await sleep(800)
    return { c, p }
  }
  // set a pairing + weather, then answer the current question right (real tap) and read the enemy's HP loss
  const hit = async (p, pType, eType, weather) => {
    await p.evaluate((pType, eType, weather) => {
      g10State.playerPoke = { ...g10State.playerPoke, type: pType }; g10State.enemyPoke = { ...g10State.enemyPoke, type: eType }
      g10State.enemyHp = g10State.enemyMaxHp = 5; g10State.weather = weather; g10State.locked = false
      document.querySelectorAll('.eff-text').forEach(e => e.remove())
    }, pType, eType, weather)
    const ans = await p.evaluate(() => String(g10State.currentAnswer))
    for (const x of await p.$$('.g10-cbtn')) {
      if ((await x.evaluate(e => e.textContent.trim())) === ans) {
        await x.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }))
        const bx = await x.boundingBox(); await p.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2); break
      }
    }
    await p.waitForFunction(() => g10State.enemyHp < 5, { timeout: 8000 }).catch(() => {})
    await sleep(300)
    const r = await p.evaluate(() => ({ lost: 5 - g10State.enemyHp, sign: [...document.querySelectorAll('.eff-text')].map(e => e.textContent.trim()).join('|') }))
    await p.waitForFunction(() => !g10State.locked && document.querySelectorAll('.g10-cbtn:not([disabled])').length >= 2, { timeout: 8000 }).catch(() => {})
    await sleep(300)
    return r
  }
  // L2 at 844x390
  {
    const errs = [], { c, p } = await open([844, 390], errs)
    const sup = await hit(p, 'water', 'fire', 'clear')
    ok(sup.lost === 2 && /Super/i.test(sup.sign), `L2 water on fire: ${sup.lost} HP, sign "${sup.sign}"`)
    const calm = await hit(p, 'electric', 'normal', 'clear')
    const rain = await hit(p, 'electric', 'normal', 'rain')
    ok(calm.lost === 1 && rain.lost === 2, `L2 a neutral electric hit: ${calm.lost} HP in clear weather, ${rain.lost} HP in rain (rain boosts electric)`)
    // L3 on the page: an enemy super-effective hit costs 1 HP; after an enemy falls the child is at full HP
    const enemy = await p.evaluate(async () => {
      const s = g10State
      s.playerPoke = { ...s.playerPoke, type: 'grass' }; s.enemyPoke = { ...s.enemyPoke, type: 'fire' }; s.weather = 'clear'
      s.playerHp = s.playerMaxHp; s.attempts = 0; s.attemptsBeforeDamage = 1; s.locked = false
      const wrong = [...document.querySelectorAll('.g10-cbtn')].find(x => x.textContent.trim() !== String(s.currentAnswer) && !x.disabled)
      const before = s.playerHp; g10Answer(wrong.textContent.trim(), wrong)
      await new Promise(r => { const t0 = Date.now(); (function w () { if (s.playerHp < before || Date.now() - t0 > 8000) r(); else setTimeout(w, 100) })() })
      const lost = before - s.playerHp
      s.enemyHp = 0; g10EnemyDefeated()
      await new Promise(r => setTimeout(r, 2200))
      return { lost, healed: s.playerHp === s.playerMaxHp, hp: s.playerHp + '/' + s.playerMaxHp }
    })
    ok(enemy.lost === 1 && enemy.healed, `L3 page: a super-effective enemy hit (fire on grass) cost ${enemy.lost} HP; next enemy, child at ${enemy.hp}`)
    ok(!errs.length, `L4 L2/L3 page errors ${errs.slice(0, 2).join(' | ') || 0}`)
    await c.close()
  }
  // L2 + L4 the banner at three sizes
  if (SH) fs.mkdirSync(SH, { recursive: true })
  for (const size of [[390, 844], [844, 390], [800, 1280]]) {
    const errs = [], { c, p } = await open(size, errs)
    await p.evaluate(() => { g10State.weather = 'rain'; g10WeatherBanner('rain') })
    await sleep(500)
    const r = await p.evaluate(() => { const e = document.getElementById('g10-wx-banner'); const bx = e && e.getBoundingClientRect(); return e ? { text: e.textContent, pills: e.querySelectorAll('.g10-wx-pill').length, inView: bx.left >= 0 && bx.right <= innerWidth && bx.top >= 0, label: e.getAttribute('aria-label') } : null })
    if (SH) await p.screenshot({ path: path.join(SH, `g10-weather-${size[0]}x${size[1]}.png`) })
    ok(r && r.pills === 2 && /Air/.test(r.text) && /Listrik/.test(r.text) && r.inView && !/\p{Extended_Pictographic}/u.test(r.text) && !errs.length,
      `L2/L4 ${size[0]}x${size[1]}: banner "${r && r.text}" (${r && r.label}), in view ${r && r.inView}, errors ${errs.slice(0, 2).join(' | ') || 0}`)
    await c.close()
  }
  await b.close()
}
console.log(`qa-prd44-g10: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
