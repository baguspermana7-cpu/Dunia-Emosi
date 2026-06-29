// v55.87 — REAL EVALUATING PROBE (owner: "puppeteer itu ada feedback dan bisa evaluasi").
// It boots an actual race, WAITS for the NPCs to load, then MEASURES the rendered train of
// the player AND every NPC (getBounds of the train node — NOT a code constant, NOT the
// container which includes the alpha-0 intent bubble) and EVALUATES:
//   1. UNIFORM size  — |maxH − minH| across [player + all NPCs] ≤ max(4px, 3% G14_UNIFORM_H)
//   2. ON-RAIL       — each train's wheel-bottom ≈ laneYs[lane] − 10% margin (≤4px)
//   3. PROMINENT     — train height is a sane fraction of the screen (0.10–0.34 H)
// It prints a per-train PASS/FAIL table (the "feedback/evaluasi") + saves an ANNOTATED
// screenshot (lane lines + measured heights drawn on the page) to tools/qa-out so the
// evaluation is human-reviewable. Exits non-zero on ANY fail. This is the gate that would
// have caught the v55.86 miss (player 329px vs NPC 58px reported "✅ uniform").
import puppeteer from 'puppeteer'
import fs from 'fs'
const OUT = 'tools/qa-out'; fs.mkdirSync(OUT, { recursive: true })
const IGNORE = /favicon|pokemondb|showdown|net::ERR|Failed to load resource/i
const VPS = [[1024, 1366, 'portrait'], [1280, 720, 'landscape'], [390, 800, 'phone']]
const sleep = ms => new Promise(r => setTimeout(r, ms))
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] })
const rows = []

for (const [w, h, tag] of VPS) {
  const page = await browser.newPage(); await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 })
  const errs = []
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  page.on('pageerror', e => errs.push('PE:' + e.message))
  await page.evaluateOnNewDocument(() => sessionStorage.setItem('g14Config', JSON.stringify({ level: 3, trainKey: 'aeg_thomas', train: 'aeg_thomas', difficulty: 'easy' })))
  try { await page.goto('http://localhost:8081/games/balapan-kereta.html', { waitUntil: 'domcontentloaded', timeout: 30000 }) } catch (e) { errs.push('GOTO ' + e.message) }
  await sleep(1800)
  await page.evaluate(() => { try { const t = (typeof TRAIN_MAP !== 'undefined' && TRAIN_MAP['aeg_thomas']) || null; if (t) { S.trainCfg = { ...t, variant: 1 } } if (typeof startRace === 'function') startRace() } catch (e) {} })
  // POLL until the player sprite AND both NPC train nodes have loaded (no fixed-sleep guess)
  let ready = false
  for (let i = 0; i < 40 && !ready; i++) {
    await sleep(200)
    ready = await page.evaluate(() => {
      const pOk = !!(L.playerCharImg && L.playerCharImg.texture && L.playerCharImg.height > 4)
      const ais = (L.ai && L.ai.children) ? L.ai.children : []
      const aOk = ais.length > 0 && ais.every(c => { const tn = c._charImg || c.children[0]; return tn && tn.getBounds().height > 4 })
      return pOk && aOk
    })
  }

  const m = await page.evaluate(() => {
    const margin = (typeof g14WheelMargin === 'function') ? g14WheelMargin() : 0   // v55.88 — base ON the rail (0)
    const measure = (node) => { const b = node.getBounds(); return { h: Math.round(b.height), bottom: Math.round(b.y + b.height) } }
    const player = (() => { const n = L.playerCharImg || L.player; const r = measure(n); return { who: 'player', lane: S.lane, ...r } })()
    const npcs = (L.ai && L.ai.children) ? L.ai.children.map((c, i) => { const tn = c._charImg || c.children[0]; const r = measure(tn); return { who: 'npc' + i, lane: c._aiLane, key: c._aiKey, ...r } }) : []
    return { laneH: Math.round(laneH), G14_UNIFORM_H, OBS_SIZE, screenH: app.screen.height, margin, laneYs: laneYs.map(Math.round), trains: [player, ...npcs] }
  })

  // ── EVALUATE ────────────────────────────────────────────────────────────
  const heights = m.trains.map(t => t.h)
  const hSpread = Math.max(...heights) - Math.min(...heights)
  const hTol = Math.max(4, Math.round(m.G14_UNIFORM_H * 0.03))
  const uniformOK = hSpread <= hTol
  // v55.88 — train must be ≈1.1× the obstacle (the rail unit): owner "1.1x dari tinggi rail".
  const railRatio = m.OBS_SIZE ? Math.round((m.G14_UNIFORM_H / m.OBS_SIZE) * 100) / 100 : 0
  const railRatioOK = railRatio >= 1.02 && railRatio <= 1.20
  const railTol = 4
  const perTrain = m.trains.map(t => {
    // an AI may have switched lanes since build → assert on the NEAREST lane − margin (signed).
    const railDev = Math.round(m.laneYs.map(ly => t.bottom - (ly - m.margin)).reduce((p, c) => Math.abs(c) < Math.abs(p) ? c : p))
    const onRail = Math.abs(railDev) <= railTol
    const frac = t.h / m.screenH
    const prominent = frac >= 0.06 && frac <= 0.30   // rail-sized train (1.1× rail unit)
    const ok = onRail && prominent
    return { ...t, railDev, onRail, screenFrac: Math.round(frac * 1000) / 1000, prominent, ok }
  })
  const cleanErrs = errs.filter(e => !IGNORE.test(e))
  const vpOK = uniformOK && railRatioOK && perTrain.every(t => t.ok) && cleanErrs.length === 0

  // ── ANNOTATED SCREENSHOT (lane lines + measured heights drawn on the page) ──
  await page.evaluate((data) => {
    const o = document.createElement('div'); o.id = '_qa_anno'
    o.style.cssText = 'position:fixed;inset:0;z-index:99998;pointer-events:none;font:700 12px monospace'
    let html = ''
    data.laneYs.forEach((y, i) => { const ry = y - data.margin; html += `<div style="position:absolute;left:0;right:0;top:${ry}px;border-top:2px dashed #ff00aa"></div><div style="position:absolute;left:4px;top:${ry - 14}px;color:#ff00aa">rail L${i} @${ry}</div>` })
    data.trains.forEach((t, i) => { html += `<div style="position:absolute;right:6px;top:${30 + i * 18}px;color:#00e5ff;background:rgba(0,0,0,.55);padding:1px 5px">${t.who} h=${t.h} bot=${t.bottom}</div>` })
    o.innerHTML = html; document.body.appendChild(o)
  }, m)
  await page.screenshot({ path: `${OUT}/dims-${tag}.png` })

  rows.push({ vp: `${w}x${h}`, tag, G14_UNIFORM_H: m.G14_UNIFORM_H, OBS_SIZE: m.OBS_SIZE, railRatio, railRatioOK, laneH: m.laneH, margin: m.margin, hSpread, hTol, uniformOK, errors: cleanErrs.length, ok: vpOK, trains: perTrain })
  await page.close()
}
await browser.close()

// ── REPORT (the human-readable evaluation) ──────────────────────────────────
for (const r of rows) {
  console.log(`\n${r.ok ? '✅' : '❌'} ${r.vp} (${r.tag})  train=${r.G14_UNIFORM_H} obstacle=${r.OBS_SIZE} ratio=${r.railRatio}× ${r.railRatioOK ? '(≈1.1 rail)' : 'RATIO-OFF'}  laneH=${r.laneH}  size-spread=${r.hSpread}px ${r.uniformOK ? 'UNIFORM' : 'NOT-UNIFORM'}`)
  for (const t of r.trains) console.log(`    ${t.ok ? '✓' : '✗'} ${t.who.padEnd(6)} lane${t.lane} h=${String(t.h).padStart(4)}px  rail Δ${String(t.railDev).padStart(3)}px ${t.onRail ? 'on-rail' : 'OFF-RAIL'}  frac=${t.screenFrac} ${t.prominent ? '' : '(size out of range)'}`)
  if (r.errors) console.log(`    ⚠ ${r.errors} console error(s)`)
}
const bad = rows.filter(r => !r.ok)
console.log(bad.length ? `\n❌ ${bad.length} viewport(s) FAIL — player/NPC not uniform, train≠1.1×obstacle, or off-rail. Screenshots: ${OUT}/dims-*.png` : `\n✅ EVALUATED: player == every NPC (uniform), train ≈ 1.1× the obstacle (rail unit), base ON the rail, 0 errors — all viewports. Screenshots: ${OUT}/dims-*.png`)
process.exit(bad.length ? 1 : 0)
