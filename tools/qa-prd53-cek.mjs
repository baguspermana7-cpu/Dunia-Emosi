#!/usr/bin/env node
// qa-prd53-cek — PRD-53 v2 "Cek Kemampuan" (docs/prd/PRD-53-cek-kemampuan.md) in a real browser, real taps.
//   L2  ladder islands end after 3 wrong in a row (Pola 8+3, Bentuk 5+3, Kata 10+3); practice is not saved; Ingat:
//       right at 2-3, two wrong at 4 -> span 3 in all three parts; Cepat counts right/wrong in 85 s and flags > 20 %
//       wrong; Angka: dot ratios 1:2 + 2:3 right -> level 2, number line 12 % off -> error ~12, stories 5 of 8
//   L9  the active player's name + animal art in the top bar; with no player the name field shows once and the
//       typed name survives a reload
//   L10 fewer than 3 islands: the IQ card says "3 pulau"; after 6 the number equals CekProfile.iq of the saved results
//   L11 the device board ranks a seeded child above, highlights the active child; the online tab without a cloud says
//       offline and keeps the device rows; per child storage (Bima sees none of Ana's results)
//   L12 scored items fire no right/wrong cue (SFXEngine.correct/wrong spies); practice right fires correct; an island
//       end fires SFXEngine.levelup once and VFX.Moment.celebrate
//   L13 at 390x844, 844x390, 800x1280: 0 page errors, no emoji, every image loaded, buttons >= 48 px and on screen,
//       text contrast >= 4.5; screenshots of every screen (QA_SHOTS=dir)
//   L13 a phone on its side (844x390) gets the 'turn it upright' screen; tablets in landscape (1280x800) play in full
//   taps wait 0.9 s after an item shows: a child's pace (faster medians are flagged as guessing, L3)
//   L6  after one visit the page starts offline (service worker), first size only
// Cepat runs its full 85 s at the first size only (QA_CEPAT=0 skips it, CI); other sizes play its practice and leave through "Istirahat".
// Usage: QA_BASE=http://127.0.0.1:8081 [QA_SHOTS=dir] [QA_SIZES=390x844,...] node tools/qa-prd53-cek.mjs
import puppeteer from 'puppeteer'
import path from 'node:path'
const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, '')
const SH = process.env.QA_SHOTS || ''
const SIZES = (process.env.QA_SIZES || '390x844,1280x800,800x1280').split(',').map(s => s.split('x').map(Number))
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }
const NOISE = /favicon|googleapis|gstatic/i
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-audio-output', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })

const PLAYERS = JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: 'tumbuh' }, { name: 'Bima', animal: '🐯', ageTier: 'tumbuh' }])
async function open (size, players = true) {
  const c = await b.createBrowserContext(), p = await c.newPage(), errs = []
  p.on('pageerror', e => { if (!NOISE.test(e.message)) errs.push(e.message) })
  await p.setViewport({ width: size[0], height: size[1], isMobile: true, hasTouch: true })
  await p.evaluateOnNewDocument((players, pl) => {
    if (!sessionStorage.__qa) {
      sessionStorage.__qa = 1; localStorage.setItem('dunia-emosi-sound', 'off')
      if (players) { localStorage.setItem('dunia-players', pl); localStorage.setItem('dunia-active-slot', '[0,1]') }
    }
  }, players, PLAYERS)
  await p.goto(BASE + '/games/cek-kemampuan.html?seed=7', { waitUntil: 'load', timeout: 120000 })
  await p.waitForFunction(() => window.__cek && (document.querySelectorAll('.isle').length === 6 || document.getElementById('s-name').classList.contains('on')), { timeout: 60000 })
  return { c, p, errs }
}
const spy = p => p.evaluate(async () => {
  for (let i = 0; i < 100 && !(window.VFX && window.VFX.Moment && window.SFXEngine); i++) await new Promise(r => setTimeout(r, 100))
  const f = window.__fx = { correct: 0, wrong: 0, levelup: 0, celebrate: 0 }
  ;['correct', 'wrong', 'levelup'].forEach(k => { const o = window.SFXEngine[k]; window.SFXEngine[k] = function () { f[k]++; return o.apply(this, arguments) } })
  if (window.VFX && window.VFX.Moment) { const o = window.VFX.Moment.celebrate; window.VFX.Moment.celebrate = function () { f.celebrate++; return o.apply(this, arguments) } }
  return !!(window.VFX && window.VFX.Moment)
})
const fx = p => p.evaluate(() => Object.assign({}, window.__fx))
const tapEl = async (p, el) => {
  if (!el) return false
  await p.waitForFunction(() => !window.__cek || !window.__cek.since || window.__cek.since() > 900, { timeout: 5000 }).catch(() => {})   // the page ignores taps in the first 300 ms of an item
  await el.evaluate(e => e.scrollIntoView({ block: 'center' })); await sleep(200)
  await p.waitForFunction(e => { const r = e.getBoundingClientRect(), k = Math.round(r.x) + ',' + Math.round(r.y); const s = e.__qaK === k; e.__qaK = k
    const h = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return s && h && (h === e || e.contains(h)) }, { timeout: 6000, polling: 120 }, el).catch(() => {})
  const bx = await el.boundingBox(); if (!bx) return false
  await p.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2); return true
}
const tap = async (p, sel, t = 15000) => { const el = await p.waitForSelector(sel, { visible: true, timeout: t }).catch(() => null); return tapEl(p, el) }
const on = (p, id) => p.evaluate(id => document.getElementById(id).classList.contains('on'), id)
// L13: buttons >= 48 px and on screen; text contrast >= 4.5 against the first opaque background behind it; images loaded
const measure = p => p.evaluate(() => {
  const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' }
  const btn = [...document.querySelectorAll('.panel button')].filter(vis).filter(e => !e.closest('.dh-home') && !e.disabled)
  // layout size (offsetWidth/Height): a press squash or an entrance scale is a transform for a moment, not the target size
  const small = btn.filter(e => Math.min(e.offsetWidth, e.offsetHeight) < 47.5).map(e => (e.id || e.className || e.textContent.trim().slice(0, 12)) + ' ' + e.offsetWidth + 'x' + e.offsetHeight + '@' + (document.querySelector('.scr.on') || {}).id)
  const off = btn.filter(e => { const r = e.getBoundingClientRect(); return r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1 }).map(e => e.id || e.className || e.getAttribute('aria-label'))
  const rgb = s => (s.match(/[\d.]+/g) || []).map(Number), L = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]) }
  const bg = e => { for (let n = e; n; n = n.parentElement) { const s = getComputedStyle(n), c = rgb(s.backgroundColor); if (s.backgroundImage !== 'none' && n.tagName === 'BUTTON') return null; if (c.length >= 3 && (c[3] === undefined || c[3] > 0.9)) return c } return [125, 211, 252] }
  let low = 99, lowWhat = ''
  for (const e of document.querySelectorAll('.panel h1, .panel p, .panel .hint, .panel .tag, .panel .lbl, .panel .target span, .panel .rows li, .panel .tab, .panel .me b, .panel .du-btn-ghost, .panel .word')) {
    if (!vis(e) || !e.textContent.trim()) continue
    const B = bg(e); if (!B) continue
    const a = L(rgb(getComputedStyle(e).color)), z = L(B), cr = (Math.max(a, z) + 0.05) / (Math.min(a, z) + 0.05)
    if (cr < low) { low = cr; lowWhat = (e.id || e.className || e.tagName) + ' "' + e.textContent.trim().slice(0, 20) + '"' }
  }
  const broken = [...document.images].filter(i => vis(i) && i.complete && !i.naturalWidth).map(i => i.getAttribute('src'))
  return { n: btn.length, small, off, low: Math.round(low * 100) / 100, lowWhat, broken, emoji: /\p{Extended_Pictographic}/u.test(document.body.innerText) }
})
const shots = {}
async function check (p, tag, what, worst) {
  const m = await measure(p); worst.push(m)
  if (!shots[tag + what]) { shots[tag + what] = 1; if (SH) await p.screenshot({ path: path.join(SH, `cek-${what}-${tag}.png`) }) }
  return m
}
const store = p => p.evaluate(() => JSON.parse(window.avatarScopedGet('cek-kemampuan') || '{}'))
const lastRec = (s, id) => { const r = s.res && s.res[id]; return r && r.length ? r[r.length - 1] : {} }
async function toMap (p) {
  for (let k = 0; k < 4 && !(await on(p, 's-map')); k++) {
    for (const sel of ['#s-done.on #btn-home', '#s-iq.on #iq-home', '#s-board.on #board-home', '#s-intro.on #btn-back', '#s-play.on #btn-pause']) { const el = await p.$(sel); if (el) { await tapEl(p, el); break } }
    await sleep(500)
  }
}
// the right answer must not be announced while a scored item is on screen
let leak = []
async function scoredTap (p, el, isle) {
  const a = await fx(p); await tapEl(p, el); await sleep(180); const z = await fx(p)
  if (z.correct !== a.correct || z.wrong !== a.wrong) leak.push(isle)
}
async function enter (p, isle, tag, worst) {
  await tap(p, `.isle[data-isle="${isle}"]`); await p.waitForSelector('#s-intro.on', { timeout: 8000 }).catch(() => {})
  await check(p, tag, `intro-${isle}`, worst); await tap(p, '#btn-start')
}
const waitItem = (p, sel) => p.waitForFunction(sel => document.getElementById('s-done').classList.contains('on') || document.getElementById('part-go') || document.querySelector(sel), { timeout: 30000 }, sel).catch(() => {})
let pracRight = 0
async function ladder (p, isle, rights, tag, worst) {
  await enter(p, isle, tag, worst)
  let answered = 0
  for (let guard = 0; guard < 70 && !(await on(p, 's-done')); guard++) {
    await waitItem(p, '#stage [data-i], #tiles-done'); if (await on(p, 's-done')) break
    const it = await p.evaluate(() => { const i = window.__cek.item(); return { practice: i.practice, kind: i.kind || 'pola', answer: i.answer, target: i.target, n: (i.choices || []).length } })
    await check(p, tag, `${isle}-${it.kind}`, worst)
    const right = it.practice || answered < rights, was = await p.evaluateHandle(() => window.__cek.item())
    if (it.kind === 'tiles') {
      if (right) for (let i = 0; i < it.target.length; i++) for (let k = 0; k < it.target[i]; k++) { await tapEl(p, (await p.$$('#mine button'))[i]); await sleep(50) }
      if (it.practice) await tap(p, '#tiles-done'); else await scoredTap(p, await p.$('#tiles-done'), isle)
    } else {
      const el = await p.$(`#stage [data-i="${right ? it.answer : (it.answer + 1) % it.n}"]`)
      if (it.practice) { const a = await fx(p); await tapEl(p, el); await sleep(200); if ((await fx(p)).correct > a.correct) pracRight++ } else await scoredTap(p, el, isle)
    }
    if (!it.practice) answered++
    await p.waitForFunction(w => document.getElementById('s-done').classList.contains('on') || window.__cek.item() !== w, { timeout: 8000 }, was).catch(() => {})
    await sleep(it.practice ? 300 : 80)
  }
  return answered
}
async function ingat (p, tag, worst) {
  await enter(p, 'ingat', tag, worst)
  for (let guard = 0; guard < 40 && !(await on(p, 's-done')); guard++) {
    const go = await p.$('#part-go'); if (go) { await tapEl(p, go); await sleep(200); continue }
    await waitItem(p, '#pics button, #board button:not([disabled])')
    if (await on(p, 's-done') || await p.$('#part-go')) continue
    const it = await p.evaluate(() => { const i = window.__cek.item(), s = window.__cek.state(); return { part: i.part, want: i.want, practice: i.practice, len: s.span.len } })
    await check(p, tag, `ingat-${it.part}`, worst)
    const right = it.practice || it.len <= 3, seq = right ? it.want : it.want.slice().reverse()
    const sel = it.part === 'corsi' ? '#board [data-c="%"]' : '#pics [data-p="%"]'
    for (let k = 0; k < seq.length; k++) { const el = await p.$(sel.replace('%', seq[k])); if (k === seq.length - 1 && !it.practice) await scoredTap(p, el, 'ingat'); else await tapEl(p, el); await sleep(70) }
    await p.waitForFunction(() => !document.querySelector('#pics button, #board button:not([disabled])') || document.getElementById('s-done').classList.contains('on'), { timeout: 8000 }).catch(() => {})
  }
}
async function cepat (p, tag, worst, full) {
  await enter(p, 'cepat', tag, worst)
  let r = 0, w = 0
  for (let guard = 0; guard < 200 && !(await on(p, 's-done')); guard++) {
    const go = await p.$('#part-go'); if (go) { if (!full) { await check(p, tag, 'cepat-ready', worst); return null } await tapEl(p, go); await sleep(200); continue }
    await waitItem(p, '.yn button'); if (await on(p, 's-done') || await p.$('#part-go')) continue
    const it = await p.evaluate(() => { const i = window.__cek.item(); return { same: i.same, practice: i.practice } })
    await check(p, tag, 'cepat-pair', worst)
    const right = it.practice || r < 12 || w >= 4, wantSame = right ? it.same : !it.same
    if (!it.practice && r >= 12 && w >= 4) { await p.waitForSelector('#s-done.on', { timeout: 100000 }).catch(() => {}); break }
    const el = await p.$(`.yn [data-v="${wantSame ? 1 : 0}"]`), was = await p.evaluateHandle(() => window.__cek.item())
    if (it.practice) await tapEl(p, el); else { await scoredTap(p, el, 'cepat'); if (right) r++; else w++ }
    await p.waitForFunction(x => document.getElementById('s-done').classList.contains('on') || document.getElementById('part-go') || window.__cek.item() !== x, { timeout: 8000 }, was).catch(() => {})
  }
  return { r, w }
}
async function angka (p, tag, worst) {
  await enter(p, 'angka', tag, worst)
  let dots = 0, stories = 0
  for (let guard = 0; guard < 60 && !(await on(p, 's-done')); guard++) {
    const go = await p.$('#part-go'); if (go) { await tapEl(p, go); await sleep(200); continue }
    await waitItem(p, '.dots button, #nline, .nums button'); if (await on(p, 's-done') || await p.$('#part-go')) continue
    const it = await p.evaluate(() => { const i = window.__cek.item(); return { practice: i.practice, more: i.more, max: i.max, n: i.n, answer: i.answer, text: i.text } })
    const was = await p.evaluateHandle(() => window.__cek.item())
    if (it.more) {
      await check(p, tag, 'angka-dots', worst)
      const right = it.practice || dots < 4, el = await p.$(`.dots [data-s="${right === (it.more === 'a') ? 'a' : 'b'}"]`)
      if (it.practice) await tapEl(p, el); else { await scoredTap(p, el, 'angka'); dots++ }
    } else if (it.max) {
      await check(p, tag, 'angka-line', worst)
      const t = it.max === 100 && !it.practice ? Math.min(100, it.n + 12) - (it.n + 12 > 100 ? 24 : 0) : it.n
      await p.waitForFunction(() => window.__cek.since() > 900, { timeout: 5000 }).catch(() => {})
    const bx = await (await p.$('#nline')).boundingBox(), x = bx.x + (40 + t / it.max * 520) / 600 * bx.width, y = bx.y + bx.height * 70 / 120
      const a = await fx(p); await p.touchscreen.tap(x, y); await sleep(180); const z = await fx(p)
      if (!it.practice && (z.correct !== a.correct || z.wrong !== a.wrong)) leak.push('angka-line')
    } else {
      await check(p, tag, 'angka-story', worst)
      const right = it.practice || stories < 5, el = await p.$(`.nums [data-i="${right ? it.answer : (it.answer + 1) % 3}"]`)
      if (it.practice) await tapEl(p, el); else { await scoredTap(p, el, 'angka'); stories++ }
    }
    await p.waitForFunction(x => document.getElementById('s-done').classList.contains('on') || document.getElementById('part-go') || window.__cek.item() !== x, { timeout: 8000 }, was).catch(() => {})
    await sleep(120)
  }
}

for (const size of SIZES) {
  const tag = size.join('x'), first = size === SIZES[0], full = first && process.env.QA_CEPAT !== '0', worst = []
  leak = []; pracRight = 0
  const { c, p, errs } = await open(size)
  const vfxOn = await spy(p)
  await check(p, tag, 'map', worst)
  const top = await p.evaluate(() => ({ name: document.getElementById('me-name').textContent, av: document.getElementById('me-av').getAttribute('src'), n: document.querySelectorAll('.isle').length }))
  ok(top.n === 6 && top.name === 'Ana' && /assets\/db\/emo\/011\.webp/.test(top.av), `L9 ${tag}: 6 islands; top bar shows ${top.name} with ${top.av}`)
  // PRD-54 M1: the sea lives (two canvas frames 500 ms apart differ), GL bloom on top when WebGL exists
  const sea = await p.evaluate(async () => {
    const c = document.querySelector('canvas.cek-sea:not(.cek-sea-gl)'); if (!c) return null
    const px = () => { const g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height).data; return d }
    const a = px(), f0 = window.CekSea.state().frames; await new Promise(r => setTimeout(r, 500)); const b = px()
    let diff = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 6) diff++
    return { diff: diff / (a.length / 4), frames: window.CekSea.state().frames - f0, gl: window.CekSea.state().gl, glSlow: window.CekSea.state().glSlow, glEl: !!document.querySelector('canvas.cek-sea-gl'), still: window.CekSea.state().still }
  })
  ok(sea && sea.diff > 0.01 && sea.frames >= 2 && !sea.still && (sea.gl || sea.glSlow) === sea.glEl, `M1 ${tag}: sea canvas changes ${sea && (sea.diff * 100).toFixed(1)} % of pixels in 500 ms (${sea && sea.frames} frames), GL ${sea && sea.gl}${sea && sea.glSlow ? ' (dropped: frames too slow)' : ''}`)
  // M2: a screen change runs one short slide; a fast double tap on an island still leaves exactly one screen
  const tr = await p.evaluate(async () => {
    const b = document.querySelector('#map .isle'); b.click(); b.click()
    await new Promise(r => setTimeout(r, 700))
    const on = [...document.querySelectorAll('.scr.on')].map(x => x.id), intro = document.getElementById('s-intro')
    const log = window.CekMotion.log.map(x => x.k)
    document.getElementById('btn-back').click(); await new Promise(r => setTimeout(r, 60))
    const an = document.getElementById('s-map').getAnimations().map(a => ({ d: a.effect.getTiming().duration, props: Object.keys(a.effect.getKeyframes()[0]).filter(k => !['offset', 'easing', 'composite', 'computedOffset'].includes(k)) }))
    await new Promise(r => setTimeout(r, 500))
    return { on, zoom: log.includes('zoom'), an, intro: !!intro }
  })
  ok(tr.on.length === 1 && tr.on[0] === 's-intro' && tr.zoom && tr.an.length >= 1 && tr.an.every(a => a.d <= 320 && a.props.every(k => k === 'opacity' || k === 'transform')), `M2 ${tag}: double tap -> screens on ${JSON.stringify(tr.on)}, zoom ${tr.zoom}; back -> ${JSON.stringify(tr.an)}`)
  const polaN = await ladder(p, 'pola', 8, tag, worst)
  await check(p, tag, 'done', worst)
  let f = await fx(p), s = await store(p), pr = lastRec(s, 'pola')
  const m3 = await p.evaluate(() => ({ stars: window.CekMotion.log.some(x => x.k === 'stars'), bloom: window.CekSea.state().bloom, items: window.CekMotion.log.filter(x => x.k === 'item').length }))
  ok(m3.stars && m3.items >= 8, `M3 ${tag}: island end -> stars land (${m3.stars}), sea bloom ${m3.bloom.toFixed(2)}; Pola item cards animated ${m3.items}`)
  ok(pr.raw === 8 && pr.reached === 11 && polaN === 11, `L2 ${tag} Pola: 8 right then 3 wrong -> raw ${pr.raw}, tried ${pr.reached}; practice not counted`)
  ok(f.levelup === 1 && (!vfxOn || f.celebrate >= 1), `L12 ${tag}: island end -> levelup ${f.levelup}, celebrate ${f.celebrate} (VFX loaded ${vfxOn})`)
  await toMap(p)
  await ladder(p, 'bentuk', 5, tag, worst)
  s = await store(p); const br = lastRec(s, 'bentuk')
  ok(br.raw === 5 && br.reached === 8, `L2 ${tag} Bentuk: 5 right then 3 wrong -> raw ${br.raw}, tried ${br.reached}`)
  await toMap(p); await tap(p, '#btn-iq'); await p.waitForSelector('#s-iq.on', { timeout: 8000 }).catch(() => {})
  const two = await p.evaluate(() => ({ num: document.getElementById('iq-num').textContent, txt: document.getElementById('iq-range').textContent }))
  await check(p, tag, 'iq-two', worst)
  ok(two.num === '?' && /3 pulau/.test(two.txt), `L10 ${tag}: after 2 islands no estimate ("${two.num}", "${two.txt}")`)
  await toMap(p)
  await ingat(p, tag, worst)
  s = await store(p); const ir = lastRec(s, 'ingat')
  ok(ir.maju === 3 && ir.mundur === 3 && ir.corsi === 3 && ir.longest && ir.longest.maju === 3, `L2/Q3 ${tag} Ingat (both tries per length, partial credit 1 + 4/2): maju ${ir.maju}, mundur ${ir.mundur}, kotak ${ir.corsi}, longest ${JSON.stringify(ir.longest)}`)
  await toMap(p)
  await ladder(p, 'kata', 10, tag, worst)
  s = await store(p); const kr = lastRec(s, 'kata')
  ok(kr.raw === 10 && kr.reached === 13, `L2 ${tag} Kata: 10 right then 3 wrong -> raw ${kr.raw}, tried ${kr.reached}`)
  await toMap(p)
  const cp = await cepat(p, tag, worst, full)
  if (full) {
    s = await store(p); const cr = lastRec(s, 'cepat')
    ok(cr.right === cp.r && cr.wrong === cp.w && cr.rate === Math.round(cp.r / (85 / 60) * 10) / 10 && (cr.flags || []).includes('salah'),
      `L2 ${tag} Cepat: ${cp.r} right + ${cp.w} wrong in 85 s -> saved ${cr.right}/${cr.wrong}, rate ${cr.rate}/min, flags ${cr.flags}`)
  }
  await toMap(p)
  await angka(p, tag, worst)
  s = await store(p); const ar = lastRec(s, 'angka')
  ok(ar.banyak === 2 && ar.titik >= 4 && ar.titik <= 8 && Math.abs(ar.garis - 12) <= 1.5 && ar.hitung === 5, `L2 ${tag} Angka: dots level ${ar.banyak}, dots right ${ar.titik} of 8, line error ${ar.garis} %, stories ${ar.hitung}`)
  ok(!leak.length && pracRight >= 2, `L12 ${tag}: scored answers with a right/wrong cue [${leak}]; practice right answers with the correct cue ${pracRight}`)
  await toMap(p); await tap(p, '#btn-iq'); await p.waitForSelector('#s-iq.on', { timeout: 8000 }).catch(() => {}); await sleep(1500)
  // PRD-54: the number counts up inside a staged reveal; give a loaded machine up to 5 s for it to land
  await p.waitForFunction(() => { const e = window.CekProfile.iq(window.__cek.load().res, window.__cek.months()); return !e || document.getElementById('iq-num').textContent === String(e.iq) }, { timeout: 5000 }).catch(() => {})
  const iq = await p.evaluate(() => { const d = window.__cek.load(), e = window.CekProfile.iq(d.res, window.__cek.months()); return { shown: document.getElementById('iq-num').textContent, range: document.getElementById('iq-range').textContent, e, bars: document.querySelectorAll('#iq-bars .b').length, unsure: [...document.querySelectorAll('#iq-bars .unsure')].length, best: d.best } })
  await check(p, tag, 'iq', worst)
  ok(iq.e && String(iq.e.iq) === iq.shown && iq.bars === iq.e.islands + iq.unsure && iq.unsure === (full ? 1 : 0) && iq.best && iq.best.iq === iq.e.iq, `L10/L3 ${tag}: Perkiraan IQ shown ${iq.shown} = computed ${iq.e && iq.e.iq} from ${iq.e && iq.e.islands} reliable islands, ${iq.bars} bars, ${iq.unsure} "kurang pasti" (Cepat flagged), best ${iq.best && iq.best.iq}`)
  await sleep(2600)
  const rv = await p.evaluate(() => window.CekMotion.log.filter(x => /^reveal-/.test(x.k)).slice(-6))
  const order = ['reveal-curtain', 'reveal-trophy', 'reveal-gauge', 'reveal-range', 'reveal-bars', 'reveal-celebrate']
  ok(rv.map(x => x.k).join() === order.join() && rv.every((x, i) => !i || x.t >= rv[i - 1].t), `M3 ${tag}: IQ reveal steps in order ${rv.map(x => x.k.slice(7) + '@' + (x.t - rv[0].t)).join(' ')}`)
  ok(iq.e && iq.range.indexOf(iq.e.lo + '-' + iq.e.hi + ' (90 %') >= 0 && iq.e.hi - iq.e.lo < 30, `Q6 ${tag}: the card range "${iq.range}" = computed ${iq.e && iq.e.lo}-${iq.e && iq.e.hi} (90 %, from reliability ${iq.e && iq.e.rel})`)
  // L11 board: Bima seeded higher
  await p.evaluate(() => localStorage.setItem('dunia-avatar-tiger-cek-kemampuan', JSON.stringify({ best: { iq: 141, islands: 3, at: 1 } })))
  await tap(p, '#iq-board'); await p.waitForSelector('#s-board.on', { timeout: 8000 }).catch(() => {})
  await tap(p, '.tab[data-tab="online"]')
  await p.waitForFunction(() => /offline|Semua pemain\./.test(document.getElementById('board-note').textContent), { timeout: 12000 }).catch(() => {})
  const onl = await p.evaluate(() => ({ note: document.getElementById('board-note').textContent, rows: document.querySelectorAll('#board-rows li').length }))
  await check(p, tag, 'board', worst)
  await tap(p, '.tab[data-tab="device"]'); await sleep(300)
  const dev = await p.evaluate(() => [...document.querySelectorAll('#board-rows li')].map(li => (li.classList.contains('me') ? '*' : '') + li.innerText.replace(/\s+/g, ' ').trim()))
  ok(/offline/.test(onl.note) && onl.rows === 2, `L11 ${tag}: online tab without a cloud -> "${onl.note}", ${onl.rows} device rows`)
  ok(dev.length === 2 && /Bima/.test(dev[0]) && /141/.test(dev[0]) && /^\*/.test(dev[1]) && /Ana/.test(dev[1]), `L11 ${tag}: device board ${JSON.stringify(dev)}`)
  // per child
  const bima = await p.evaluate(() => { localStorage.setItem('dunia-active-slot', '[1,1]'); const v = JSON.parse(window.avatarScopedGet('cek-kemampuan') || '{}'); localStorage.setItem('dunia-active-slot', '[0,1]'); return v })
  ok(!bima.res && bima.best.iq === 141, `L11 ${tag}: per child (Bima has ${bima.res ? 'Ana\'s results' : 'no results'})`)
  await toMap(p); await check(p, tag, 'map-done', worst)
  const flags = await p.$$eval('.isle .flag', e => e.length)
  ok(flags === (full ? 6 : 5), `L13 ${tag}: finished islands carry a flag (${flags})`)
  const small = [...new Set(worst.flatMap(m => m.small))], off = [...new Set(worst.flatMap(m => m.off))], broken = [...new Set(worst.flatMap(m => m.broken))]
  const low = Math.min(...worst.map(m => m.low)), lowWhat = worst.find(m => m.low === low).lowWhat
  ok(!small.length && !off.length && low >= 4.5 && !worst.some(m => m.emoji) && !broken.length, `L13 ${tag}: ${worst.length} screens, buttons < 48 px [${small}], off screen [${off}], lowest contrast ${low} (${lowWhat}), images not loaded [${broken}], emoji ${worst.some(m => m.emoji)}`)
  ok(!errs.length, `L13 ${tag}: page errors ${errs.slice(0, 2).join(' | ') || 0}`)
  if (first) {
    const swOk = await p.evaluate(async () => { try { const r = await navigator.serviceWorker.ready; await new Promise(res => setTimeout(res, 3000)); return !!r.active } catch (_) { return false } })
    await p.setOfflineMode(true)
    const offl = await p.reload({ waitUntil: 'load', timeout: 60000 }).then(() => p.waitForFunction(() => document.querySelectorAll('.isle').length === 6 && window.CekKata && window.CekCepat && window.CekAngka && window.CekPlay && document.querySelector('.isle .art').naturalWidth > 0, { timeout: 20000 }).then(() => true)).catch(() => false)
    ok(swOk && offl, `L6 ${tag}: offline start after one visit (service worker ${swOk}, page + modules + island art ${offl})`)
  }
  await c.close()
}
// L9 no player: the name field once, then remembered
{
  const size = SIZES[0], tag = size.join('x'), worst = []
  const { c, p, errs } = await open(size, false)
  const asked = await on(p, 's-name'); await check(p, tag, 'name', worst)
  await tap(p, '#name-go'); const stay = await on(p, 's-name')
  await (await p.$('#name-in')).type('Sari 7'); await tap(p, '#name-go'); await p.waitForSelector('#s-map.on', { timeout: 8000 }).catch(() => {})
  const n1 = await p.evaluate(() => document.getElementById('me-name').textContent)
  await p.reload({ waitUntil: 'load' }); await p.waitForFunction(() => window.__cek, { timeout: 30000 }).catch(() => {})
  const again = await p.evaluate(() => ({ name: document.getElementById('s-name').classList.contains('on'), map: document.getElementById('s-map').classList.contains('on'), who: document.getElementById('me-name').textContent }))
  ok(asked && stay && n1 === 'Sari' && !again.name && again.map && again.who === 'Sari' && !errs.length, `L9 ${tag} no player: asked ${asked}, empty name refused ${stay}, saved "${n1}", after reload map ${again.map} with "${again.who}", errors ${errs.length}`)
  await c.close()
}
// L13 a phone on its side: the "turn it upright" screen covers the page; upright again, it is gone
{
  const { c, p, errs } = await open([844, 390])
  const side = await p.evaluate(() => { const e = document.getElementById('rotate'), r = e.getBoundingClientRect(); return getComputedStyle(e).display !== 'none' && r.width >= innerWidth && r.height >= innerHeight && e.textContent.trim() })
  if (SH) await p.screenshot({ path: `${SH}/cek-rotate-844x390.png` })
  await p.setViewport({ width: 390, height: 844 }); await sleep(300)
  const up = await p.evaluate(() => getComputedStyle(document.getElementById('rotate')).display)
  ok(side && up === 'none' && !errs.length, `L13 844x390: phone on its side shows "${side}", upright the cover is ${up}, errors ${errs.length}`)
  await c.close()
}
// PRD-54 M1/A6: reduced motion -> the sea is one still frame and screens only fade
{
  const { c, p, errs } = await open([390, 844], true)
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await p.reload({ waitUntil: 'load' }); await p.waitForFunction(() => window.CekSea && document.querySelectorAll('.isle').length === 6, { timeout: 60000 })
  const r = await p.evaluate(async () => {
    const c = document.querySelector('canvas.cek-sea'), a = c.toDataURL(), f0 = window.CekSea.state().frames
    await new Promise(r => setTimeout(r, 600))
    document.querySelector('#map .isle').click(); await new Promise(r => setTimeout(r, 40))
    const an = document.getElementById('s-intro').getAnimations().map(x => Object.keys(x.effect.getKeyframes()[0]).filter(k => k === 'transform').length)
    return { same: a === c.toDataURL(), frames: window.CekSea.state().frames - f0, still: window.CekSea.state().still, gl: !!document.querySelector('canvas.cek-sea-gl'), moves: an.reduce((x, y) => x + y, 0) }
  })
  ok(r.still && r.same && r.frames === 0 && !r.gl && r.moves === 0 && !errs.length, `M1/A6 reduced motion: still sea ${r.still}, frames unchanged ${r.same} (+${r.frames}), no GL ${!r.gl}, screen moves ${r.moves}, errors ${errs.length}`)
  await c.close()
}
await b.close()
console.log(`qa-prd53-cek: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
