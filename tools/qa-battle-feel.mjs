// qa-battle-feel.mjs — Gym Pokemon hit feel, summon and sprite cache (owner videos 2026-10-17).
//   hit:     impact frame = target pure white + squash, held (hitstop) BEFORE the knockback; slash arc + sparks;
//            the HP bar's white trail holds the old value and drains later; a crunch is scheduled (AudioContext)
//   summon:  switching Pokemon recalls the old one, plays a VFX-library circle, the new one grows from white,
//            and the "Ayo, X!" message appears only AFTER the summon
//   KO:      the knocked-out sprite shatters into pieces
//   cache:   a reload resolves sprites from the remembered URL (hits), with no failed probe requests
//   layout:  the gym welcome's TANTANG! button is on screen at 844x390
// Server: Dunia on :8081.   node tools/qa-battle-feel.mjs
import puppeteer from 'puppeteer'
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m) } else { fail++; console.log('  ✗ ' + m) } }
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage(); const errs = []
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()) })
await p.setViewport({ width: 844, height: 390 })
await p.evaluateOnNewDocument(() => { try { localStorage.setItem('g13c_lastPackage', 'ash-kanto-base') } catch (_) {} })
const BASE = process.env.BASE || 'http://localhost:8081'
await p.goto(BASE + '/games/gym-pokemon.html', { waitUntil: 'domcontentloaded' }); await sleep(2200)
async function cc (sel) { const el = await p.waitForSelector(sel, { visible: true, timeout: 15000 }); await el.evaluate(e => e.scrollIntoView({ block: 'center' })); await sleep(150); const bx = await el.boundingBox(); await p.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2); return bx }
await cc('.trainer-card')
await sleep(500)
const fb = await (await p.waitForSelector('#gw-fight', { visible: true })).boundingBox()
ok(fb && fb.y >= 0 && fb.y + fb.height <= 390, `welcome: TANTANG! fully on screen at 844x390 (y ${fb && Math.round(fb.y)}-${fb && Math.round(fb.y + fb.height)})`)
await cc('#gw-fight'); await cc('.bm-card[data-mode="adventure"]'); await cc('.tcf-cta-primary')
try { await cc('#adv-vs-skip') } catch (_) {}
try { await p.waitForFunction(() => document.getElementById('action-btns') && getComputedStyle(document.getElementById('action-btns')).display === 'grid', { timeout: 20000 }) } catch (e) {
  await p.screenshot({ path: process.env.SHOT || '/tmp/qa-battle-feel-stuck.png' })
  console.log('stuck:', await p.evaluate(() => [...document.querySelectorAll('button')].filter(e => e.offsetParent && e.getBoundingClientRect().width > 5).map(e => (e.id || e.className).slice(0, 24) + ':' + e.textContent.trim().slice(0, 16)).slice(0, 15)), errs)
  throw e
}
await sleep(500)

// ── hit: sample the target every frame across the impact ──
const hit = await p.evaluate(() => new Promise(res => {
  const f = document.getElementById('poke-enemy'), bob = f.closest('.ba-bob'), wrap = f.closest('.ba-fighter')
  const trail = document.querySelector('.ba-card-enemy .ba-hp-trail'), fill = document.querySelector('.ba-card-enemy .ba-hp-fill')
  const log = []; let t0 = 0, hitAt = 0
  const tick = () => {
    const t = performance.now()
    log.push({ t: t - t0, white: f.classList.contains('ba-white'), squash: bob.classList.contains('ba-squash'), knock: /ba-knock2/.test(wrap.className),
      slash: !!document.querySelector('.ba-slash'), sparks: document.querySelectorAll('.ba-spark').length,
      trail: trail && trail.getBoundingClientRect().width, fill: fill && fill.getBoundingClientRect().width })
    if (t - t0 < 5000) requestAnimationFrame(tick); else { mo.disconnect(); res({ log, hitAt, mo: hit }) }
  }
  const mo = new MutationObserver(() => { const t = performance.now() - t0
    if (hit.w < 0 && f.classList.contains('ba-white')) hit.w = t
    if (hit.k < 0 && /ba-knock2/.test(wrap.className)) hit.k = t })
  const hit = { w: -1, k: -1 }
  mo.observe(f, { attributes: true, attributeFilter: ['class'] }); mo.observe(wrap, { attributes: true, attributeFilter: ['class'] })
  window.__hitMO = hit
  t0 = performance.now()
  BattleArena.attack('player', { color: '#FF6B35', type: 'fire', superEff: true }, () => {
    hitAt = performance.now() - t0
    const ep = battle.enemyTeam[battle.enemyIdx]; ep.hp = Math.max(1, Math.round(ep.hp * 0.5)); updateHpUI()
  })
  requestAnimationFrame(tick)
}))
const L = hit.log, iw = L.findIndex(x => x.white), ik = L.findIndex(x => x.knock)
ok(iw >= 0, 'impact: the target blinks pure white')
ok(L.some(x => x.white && x.squash), 'impact: the target squashes on the white frame')
const hs = hit.mo.k - hit.mo.w   // exact class-change times (MutationObserver), not rAF samples
ok(hit.mo.w >= 0 && hit.mo.k > hit.mo.w && hs >= 60, `hitstop: knockback starts ${Math.round(hs)} ms after the white frame (want >= 60)`)
ok(L.some(x => x.slash), 'slash arc drawn across the target')
ok(Math.max(...L.map(x => x.sparks)) >= 6, 'sparks burst off the hit')
const after = L.filter(x => x.t > hit.hitAt + 150 && x.t < hit.hitAt + 380)
ok(after.length && after.every(x => x.trail > x.fill + 5), 'HP bar: the white trail holds the old value right after the hit')
const last = L[L.length - 1]
ok(Math.abs(last.trail - last.fill) < 3, 'HP bar: the trail has drained down to the bar by the end')

// ── summon: switch to the 2nd Pokemon through the real switch panel ──
const sw = await p.evaluate(() => new Promise(res => {
  const before = document.getElementById('poke-player').src
  const seen = { white: false, vfx: 0, msgAt: -1, grownAt: -1 }
  const t0 = performance.now(), bob = document.getElementById('poke-player').closest('.ba-bob')
  const mt = document.getElementById('msg-text'), m0 = mt.textContent
  const tick = () => {
    const t = performance.now() - t0
    if (document.getElementById('poke-player').classList.contains('ba-white')) seen.white = true
    seen.vfx = Math.max(seen.vfx, document.querySelectorAll('[data-vfx]').length)
    if (seen.msgAt < 0 && mt.textContent !== m0 && /Ayo/.test(mt.textContent)) seen.msgAt = t
    if (t < 4000) requestAnimationFrame(tick); else res(Object.assign(seen, { changed: document.getElementById('poke-player').src !== before, op: getComputedStyle(bob).opacity }))
  }
  requestAnimationFrame(tick)
  buildSwitchPanel(false); switchPoke(battle.playerIdx === 0 ? 1 : 0)
}))
ok(sw.changed, 'summon: the player sprite changed')
ok(sw.white, 'summon: the fighter goes through a white (recall / materialise) frame')
ok(sw.vfx >= 1, `summon: a VFX-library effect played (${sw.vfx} node)`)
ok(sw.msgAt >= 600, `summon: "Ayo, X!" shows only after the summon (${Math.round(sw.msgAt)} ms)`)
ok(sw.op === '1', 'summon: the new fighter ends fully visible')

// ── KO shatter ──
const shards = await p.evaluate(() => new Promise(res => { BattleArena.faintDrop('enemy'); setTimeout(() => res(document.querySelectorAll('.ba-shard').length), 120) }))
ok(shards >= 8, `KO: the sprite shatters (${shards} pieces)`)

// ── sprite cache: reload, the same sprites come from the remembered URL ──
const st1 = await p.evaluate(() => window.spriteCacheStats && spriteCacheStats())
const failed = []
p.on('requestfailed', r => failed.push(r.url())); p.on('response', r => { if (r.status() >= 400 && /Pokemon|sprites/.test(r.url())) failed.push(r.status() + ' ' + r.url()) })
await p.reload({ waitUntil: 'domcontentloaded' }); await sleep(2200)
await cc('.trainer-card'); await sleep(400); await cc('#gw-fight'); await cc('.bm-card[data-mode="adventure"]'); await cc('.tcf-cta-primary')
try { await cc('#adv-vs-skip') } catch (_) {}
await p.waitForFunction(() => document.getElementById('action-btns') && getComputedStyle(document.getElementById('action-btns')).display === 'grid', { timeout: 20000 })
await sleep(800)
const st2 = await p.evaluate(() => window.spriteCacheStats && spriteCacheStats())
ok(st1 && st1.size > 0, `cache: winners remembered on the first visit (${st1 && st1.size})`)
ok(st2 && st2.hit > 0 && st2.hit >= st2.miss, `cache: the reload is mostly hits (hit ${st2 && st2.hit}, miss ${st2 && st2.miss}, stale ${st2 && st2.stale})`)
const probes = failed.filter(u => /pokemondb_hd_alt2|\/svg\//.test(u))
ok(!probes.length, `cache: no failed local sprite probes on the second battle (${probes.length}${probes.length ? ': ' + probes.slice(0, 2).join(' ') : ''})`)
ok(!errs.length, 'no page errors: ' + errs.slice(0, 3).join(' | '))
await b.close()
console.log(`\nqa-battle-feel: ${pass}/${pass + fail} checks passed`)
process.exit(fail ? 1 : 0)
