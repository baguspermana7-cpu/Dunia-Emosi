// G30 Timmy & Kapal Legendaris — VESSEL gate (owner bug 2026-10-03).
// Pelabuhan Waktu's grid player piece was tk-legend/time-harbor — a picture of a harbour town — because
// TKArt.OVERRIDE['ship/pelabuhan'] pointed at map art and every screen used `w.ship` as "the boat the child moves".
// This gate makes that class of bug impossible to ship again:
//   A) node: every world (15 originals + 6 legends) declares `w.vessel`; it resolves (TKArt.OVERRIDE) to a real
//      sprite FILE under tk-ship*/, tk-top/, tk-legend-side/, tk-legend-top/ or the reviewed VESSEL_ALLOW list, and
//      never to a key matching DENY (scene, harbour, island, town, building, portal, character); TKArt.vesselKey(w)
//      returns that key itself (no runtime fallback was needed). Every 'ship/<x>' OVERRIDE key (story layers use them
//      too) obeys the same rule. Every TKFleet ship (the picker + the steer/lanes top-down sprite) has side + top keys
//      that are allowed, not denied, and exist. Source scan: no screen picks a vessel picture from `w.ship` directly
//      (Art.src(w.ship…), art(w.ship…), 'ship/' + CUR.w.id) — they must go through TKArt.vessel / vesselKey.
//   B) browser (QA_UI=0 skips): the real game at 1280x800; per world, the first grid, steer and lanes level (chapter
//      steps included) is started with __tk; the grid piece (.tkg-boat img) and chapter card image must be the world's
//      vessel sprite; steer / lanes must sail a TKFleet ship whose top sprite is in the vessel set and was loaded;
//      no "[TKArt] not a vessel sprite" warning, no page error. Screenshots of every grid board -> QA_SHOTS.
// Usage: node tools/qa-tk-vessels.mjs   QA_URL (default http://localhost:8081/games/timmy-kapal.html), QA_WORLDS=a,b
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LIB = path.join(ROOT, 'assets/db/lib')
const SHOTS = process.env.QA_SHOTS || '/tmp/claude-1000/-home-baguspermana7/006f0cec-d381-48ee-882e-83cf434d8153/scratchpad/tk-vessel'
const fails = []
let passes = 0
const check = (ok, msg) => { if (ok) passes++; else { fails.push(msg); console.log('FAIL ' + msg) } }

// vessel set: allowed folders + an explicit, visually reviewed allow list
const ALLOW_DIR = /^(tk-ship\d*|tk-top|tk-legend-side|tk-legend-top)\//
const VESSEL_ALLOW = [
  'tk-key/titanic-smoke',          // Titanic key art, side view with smoke
  'vehicles/sailboat',             // Timmy's toy sailboat (Kamar Timmy)
  /^tk-legend\/ship-[a-z]+-clean$/ // the 13 legend side views without name plate
]
const DENY = /harbor|harbour|island|isle|town|port-|scene|building|portal|char\//
const DENY_EXEMPT = ['tk-ship3/harbor-tug-clean', 'tk-ship3/harbor-tug']   // a tugboat, reviewed
const allowed = k => ALLOW_DIR.test(k) || VESSEL_ALLOW.some(a => typeof a === 'string' ? a === k : a.test(k))
const denied = k => DENY.test(k) && !DENY_EXEMPT.includes(k)
const exists = k => fs.existsSync(path.join(LIB, k + '.webp'))
const libKey = u => { const m = /assets\/db\/lib\/(.+)\.webp(\?.*)?$/.exec(String(u || '')); return m ? decodeURIComponent(m[1]) : null }
const isVessel = k => !!k && allowed(k) && !denied(k) && exists(k)

/* ── A: node ─────────────────────────────────────────────────────────── */
globalThis.window = globalThis
require(path.join(ROOT, 'games/data/asset-index.js'))
require(path.join(ROOT, 'games/data/tk-art.js'))
const TKW = require(path.join(ROOT, 'games/data/tk-worlds.js'))
require(path.join(ROOT, 'games/data/tk-worlds-legends.js'))
require(path.join(ROOT, 'games/tk-fleet.js'))
const ART = globalThis.TKArt, FLEET = globalThis.TKFleet
const warned = []; const cw = console.warn; console.warn = (...a) => { warned.push(a.join(' ')); }
const WORLDS = TKW.WORLDS
check(WORLDS.length >= 21, `21 worlds loaded (15 + 6 legends): ${WORLDS.length}`)
const VES = {}
for (const w of WORLDS) {
  check(typeof w.vessel === 'string' && w.vessel.length > 0, `${w.id}: declares w.vessel`)
  const raw = w.vessel || w.ship || ''
  const k = libKey(ART.src(raw))
  VES[w.id] = k
  check(!!k, `${w.id}: vessel ${raw} resolves to a sprite FILE (got ${String(ART.src(raw)).slice(0, 60)})`)
  check(k && allowed(k), `${w.id}: vessel ${raw} -> ${k} is under tk-ship*/tk-top/tk-legend-side/tk-legend-top or VESSEL_ALLOW`)
  check(k && !denied(k), `${w.id}: vessel ${raw} -> ${k} is not a scene/harbour/island/building/portal/character`)
  check(k && exists(k), `${w.id}: vessel file exists (${k})`)
  check(ART.vesselKey(w) === raw, `${w.id}: TKArt.vesselKey needs no fallback (${ART.vesselKey(w)} vs ${raw})`)
  if (w.ship) check(w.ship === w.vessel, `${w.id}: w.ship (${w.ship}) and w.vessel (${w.vessel}) name the same ship`)
}
for (const [key, file] of Object.entries(ART.OVERRIDE)) {
  if (!key.startsWith('ship/')) continue
  const k = libKey(file)
  check(isVessel(k), `TKArt.OVERRIDE['${key}'] = ${k} is a vessel sprite`)
}
for (const s of FLEET.ships) {
  for (const which of ['side', 'top']) check(isVessel(s[which]), `TKFleet ${s.id}.${which} = ${s[which]} is a vessel sprite`)
}
console.warn = cw
check(!warned.some(t => /not a vessel/.test(t)), `no TKArt vessel fallback warning in node (${warned.filter(t => /not a vessel/.test(t)).join(' | ')})`)
// source scan: a vessel picture must come from TKArt.vessel / vesselKey, never straight from w.ship
const SRC_BAN = [/Art\.src\(\s*[\w.]*\bship\b/, /\bart\(\s*[\w.]*\.ship\b/, /'ship\/'\s*\+\s*CUR\.w\.id/, /Art\.src\(\s*[\w.]*\.pic\s*\|\|\s*[\w.]*\.ship/]
for (const f of ['games/timmy-kapal.js', 'games/tk-hub.js']) {
  const lines = fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n')
  lines.forEach((ln, i) => SRC_BAN.forEach(rx => { if (rx.test(ln)) check(false, `${f}:${i + 1} picks a vessel picture from w.ship directly: ${ln.trim().slice(0, 100)}`) }))
}
console.log(`node: ${passes} checks, ${fails.length} fails`)

/* ── B: browser ──────────────────────────────────────────────────────── */
async function ui () {
  const { default: puppeteer } = await import('puppeteer')
  const URL = process.env.QA_URL || 'http://localhost:8081/games/timmy-kapal.html'
  const only = (process.env.QA_WORLDS || '').split(',').filter(Boolean)
  fs.mkdirSync(SHOTS, { recursive: true })
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] })
  try {
    const p = await b.newPage(); const errs = [], warns = []
    p.on('pageerror', e => errs.push(String(e.message || e).slice(0, 160)))
    p.on('console', m => { if (/not a vessel/.test(m.text())) warns.push(m.text()) })
    await p.setViewport({ width: 1280, height: 800, isMobile: false, hasTouch: true })
    // the shared python server is single-threaded (other gates may be running): wait for the game, not for idle
    await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await p.waitForFunction(() => window.__tk && window.TKWorlds, { timeout: 90000 })
    await p.evaluate(() => { __tk.reset(); __tk.fast(true); __tk.unlockAll(); performance.setResourceTimingBufferSize(100000) })
    // a level's pre-story panels come first: tap the real "Lewati" until the module itself is on screen
    const SEL = { grid: '#play-host .tkg-boat', steer: '#play-host canvas', lanes: '#play-host canvas' }
    const skipStory = async t => {
      for (let i = 0; i < 30; i++) {
        const st = await p.evaluate(sel => { const sk = document.querySelector('#play-host .tks-skip'); if (sk) { sk.click(); return 'skip' } return document.querySelector(sel) || (window.__tk.handle() && __tk.handle().picker && __tk.handle().picker()) ? 'ok' : 'wait' }, SEL[t])
        if (st === 'ok') break
        await sleep(st === 'skip' ? 500 : 250)
      }
      await sleep(t === 'grid' ? 700 : 500)
    }
    const plan = await p.evaluate(() => TKWorlds.WORLDS.map(w => {
      const all = t => { const o = []; for (let k = 0; k < w.levels.length; k++) { const lv = w.levels[k]; if (lv.type === t) o.push({ k }); if (lv.type === 'chapter') (lv.steps || []).forEach((s, i) => { if (s.type === t) o.push({ k, step: i }) }) } return o }
      return { id: w.id, grid: all('grid'), steer: all('steer'), lanes: all('lanes') }
    }))
    let counts = { grid: 0, steer: 0, lanes: 0, deck: 0 }; const gridWorlds = new Set(), deckOnly = new Set()
    for (const w of plan) {
      if (only.length && !only.includes(w.id)) continue
      for (const t of ['grid', 'steer', 'lanes']) {
       for (const at of w[t]) {
        const tag = `${w.id} ${t} (level ${at.k}${at.step != null ? ' step ' + at.step : ''})`
        await p.evaluate((id, at) => { if (at.step != null) __tk.chapter(at.k + 1, at.step, id); else __tk.start(id, at.k) }, w.id, at)
        await skipStory(t)
        if (t === 'grid') {
          const r = await p.evaluate(() => {
            const b = document.querySelector('#play-host .tkg-boat img'), c = document.querySelector('#play-host .tkg-chap img'), root = document.querySelector('#play-host [data-theme]')
            return { lv: __tk.level(), theme: root && root.getAttribute('data-theme'), boat: b && b.getAttribute('src'), chap: c && c.getAttribute('src'), ok: !!(b && b.complete && b.naturalWidth) }
          })
          if (r.theme === 'deck') {
            // deck boards (mockup ui-07): Timmy WALKS the ship's deck, by design; the piece is Timmy, not a vessel
            check(libKey(r.boat) === 'tk-key/timmy', `${tag}: deck board piece is Timmy walking (${libKey(r.boat)})`)
            counts.deck++; gridWorlds.add(w.id); deckOnly.add(w.id)
            await p.evaluate(() => { try { const h = __tk.handle(); h && h.destroy && h.destroy() } catch (e) {} __tk.world() })
            continue
          }
          const bk = libKey(r.boat), ck = libKey(r.chap)
          check(r.lv && r.lv.type === 'grid', `${tag}: a grid level is running (${JSON.stringify(r.lv)})`)
          gridWorlds.add(w.id); deckOnly.delete(w.id)
          check(isVessel(bk), `${tag}: grid player piece is a vessel sprite (${bk || r.boat})`)
          check(bk === VES[w.id], `${tag}: grid player piece is the world's own vessel (${bk} vs ${VES[w.id]})`)
          check(r.ok, `${tag}: grid player piece image loaded`)
          if (r.chap) check(isVessel(ck), `${tag}: chapter card picture is a vessel sprite (${ck || r.chap})`)
          await p.screenshot({ path: path.join(SHOTS, `grid-${w.id}.png`) })
        } else {
          // a picker may open first ("Pilih Kapalmu", or the story ship of a new world): take its preselected ship
          for (let i = 0; i < 10; i++) {
            const st = await p.evaluate(() => { const h = __tk.handle(); if (!h || !h.state) return null; const pk = h.picker && h.picker(); if (pk) { pk.pick(pk.current()); return 'picked' } const s = h.state(); return s.ship ? 'ok' : 'wait' })
            if (st === 'ok') break
            await sleep(400)
          }
          await sleep(700)
          const r = await p.evaluate(() => {
            const h = __tk.handle(), s = h && h.state ? h.state() : {}, f = s.ship && TKFleet.get(s.ship)
            const loaded = f ? performance.getEntriesByType('resource').some(e => e.name.indexOf('/' + f.top + '.webp') >= 0) : false
            return { lv: __tk.level(), ship: s.ship, top: f && f.top, side: f && f.side, loaded }
          })
          check(r.lv && r.lv.type === t, `${tag}: a ${t} level is running (${JSON.stringify(r.lv)})`)
          check(!!r.ship, `${tag}: sails a TKFleet ship (${r.ship})`)
          check(isVessel(r.top), `${tag}: top-down player sprite is a vessel (${r.top})`)
          check(isVessel(r.side), `${tag}: picker side view is a vessel (${r.side})`)
          check(r.loaded, `${tag}: the player sprite ${r.top} was actually loaded`)
          if (t === 'steer' || w.id === 'pelabuhan') await p.screenshot({ path: path.join(SHOTS, `${t}-${w.id}.png`) })
        }
        counts[t]++
        await p.evaluate(() => { try { const h = __tk.handle(); h && h.destroy && h.destroy() } catch (e) {} __tk.world() })
        break
       }
      }
    }
    // the Pelabuhan Waktu "Gerbang Waktu" board from the owner's photo
    if (!only.length || only.includes('pelabuhan')) {
      const k = await p.evaluate(() => TKWorlds.get('pelabuhan').levels.findIndex(l => l.id === 'pelabuhan9'))
      await p.evaluate(k => __tk.start('pelabuhan', k), k); await skipStory('grid'); await sleep(500)
      const bk = libKey(await p.evaluate(() => { const b = document.querySelector('#play-host .tkg-boat img'); return b && b.getAttribute('src') }))
      check(bk === VES.pelabuhan && isVessel(bk), `pelabuhan9 Gerbang Waktu: player piece is a vessel (${bk})`)
      await p.screenshot({ path: path.join(SHOTS, 'gerbang-waktu.png') })
    }
    console.log(`browser: grid ${counts.grid} (+${counts.deck} deck boards), steer ${counts.steer}, lanes ${counts.lanes} levels mounted`)
    if (deckOnly.size) console.log(`worlds whose grids are all deck boards (Timmy walks): ${[...deckOnly].join(', ')}`)
    check(gridWorlds.size >= (only.length || 21), `a grid level mounted in every world (${gridWorlds.size})`)
    check(!warns.length, `no TKArt vessel fallback warning in the page (${warns.slice(0, 3).join(' | ')})`)
    check(!errs.length, `no page errors (${errs.slice(0, 3).join(' | ')})`)
  } finally { await b.close() }
}
if (process.env.QA_UI !== '0') await ui()

console.log(`\nqa-tk-vessels: ${passes} passed, ${fails.length} failed`)
if (fails.length) { console.log(fails.map(f => ' - ' + f).join('\n')); process.exit(1) }
