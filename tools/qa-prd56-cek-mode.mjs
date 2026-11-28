#!/usr/bin/env node
// qa-prd56-cek-mode — PRD-56 (docs/prd/PRD-56-cek-mode-cepat.md) in a real browser, real taps, 390x844 (+ the
// chooser screens at 1280x800 and 800x1280).
//   W1 (+ a guest's play is not written to the family child's learning log) "Ganti" in the top bar opens "Siapa yang main?": the family's children and the guests; a new guest (name + age)
//      plays at once, on its own record; picking Bima moves the app's active child; back to Ana keeps Ana's results
//   W2 Normal / Cepat on the island map, stored per child (Ana Cepat, Bima still Normal), survives a reload
//   W3 a whole Cepat sitting: Pola 10 and Bentuk 9 adaptive items (none repeated, saved with their item numbers),
//      Kata 10 (its intro says it is not counted), Ingat backward + Corsi only from length 3, Cepat 45 s, Angka 8 dots
//      + 4 lines of 0-100 and no stories; every record says mode 'cepat'
//   W4 the IQ card names the mode and the reading note, and shows the number CekProfile.iq computes
//   W5 a paused island keeps the mode it began in after the child switches mode
//   W6 no dead "Dengar" buttons (no voice since PRD-55); the island name in the play bar is not cut off
//   W7 0 page errors, no emoji, buttons >= 48 px and on screen, contrast >= 4.5 on every screen; screenshots (QA_SHOTS)
// Usage: QA_BASE=http://127.0.0.1:8081 [QA_SHOTS=dir] node tools/qa-prd56-cek-mode.mjs
import puppeteer from 'puppeteer'
import path from 'node:path'
import fs from 'node:fs'
const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, '')
const SH = process.env.QA_SHOTS || ''
if (SH) fs.mkdirSync(SH, { recursive: true })
const SIZES = [[390, 844], [1280, 800], [800, 1280]]
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

const sid = p => p.evaluate(() => (document.querySelector('.scr.on') || {}).id)
const who = p => p.evaluate(() => ({ name: document.getElementById('me-name').textContent, slot: localStorage.getItem('dunia-active-slot'), guest: localStorage.getItem('cek-aktif'), months: window.__cek.months(), mode: window.__cek.modeNow() }))
const modeOn = p => p.evaluate(() => { const b = document.querySelector('.modes .mode.on'); return b ? b.getAttribute('data-mode') : '' })
const tag = '390x844', worst = []
const { c, p, errs } = await open([390, 844])
await spy(p)
await check(p, tag, 'map', worst)
// W6
const dead = await p.evaluate(() => [...document.querySelectorAll('button')].filter(b => /Dengar/.test(b.textContent)).map(b => b.id || b.textContent.trim()))
// W1
await tap(p, '#me-btn'); await p.waitForSelector('#s-name.on', { timeout: 8000 }).catch(() => {})
const list0 = await p.evaluate(() => [...document.querySelectorAll('#who-list .pl')].map(b => (b.classList.contains('on') ? '*' : '') + b.textContent.trim()))
await check(p, tag, 'who', worst)
await (await p.$('#name-in')).type('Rina'); await tap(p, '.ages [data-age="5-6"]'); await tap(p, '#name-go')
await p.waitForSelector('#s-map.on', { timeout: 8000 }).catch(() => {})
const rina = await who(p)
const rinaRec = await p.evaluate(() => window.__cek.load())
const lv = async () => { await p.evaluate(() => { window.__lv = 0; if (window.DuniaLevel && !window.DuniaLevel.__qa) { const o = window.DuniaLevel.start; window.DuniaLevel.start = function () { window.__lv++; return o.apply(this, arguments) }; window.DuniaLevel.__qa = 1 } })
  await tap(p, '.isle[data-isle="pola"]'); await p.waitForSelector('#s-intro.on', { timeout: 8000 }).catch(() => {}); await tap(p, '#btn-start')
  // up to 3 s for the log call: a fixed 500 ms read 0 for Bima on a slow CI runner (v65.02 run); a guest waits the full 3 s and must still be 0
  for (let i = 0; i < 30 && !(await p.evaluate(() => window.__lv)); i++) await sleep(100)
  const n = await p.evaluate(() => window.__lv); await tap(p, '#btn-pause'); await p.waitForSelector('#s-map.on', { timeout: 8000 }).catch(() => {}); return n }
const lvGuest = await lv()
await tap(p, '#me-btn'); await p.waitForSelector('#s-name.on', { timeout: 8000 }).catch(() => {})
const list1 = await p.evaluate(() => [...document.querySelectorAll('#who-list .pl')].map(b => (b.classList.contains('on') ? '*' : '') + b.textContent.trim()))
await tap(p, '#who-list .pl[data-k="1"]'); await p.waitForSelector('#s-map.on', { timeout: 8000 }).catch(() => {})
const bima = await who(p)
const lvBima = await lv()
ok(lvGuest === 0 && lvBima === 1, `W1 learning log: a guest's island start logs ${lvGuest} (not under the family's child), Bima's logs ${lvBima}`)
ok(list0.length === 2 && /^\*Ana/.test(list0[0]) && rina.name === 'Rina' && rina.guest === 'tamu:Rina' && rina.months === 78 && !rinaRec.res && list1.length === 3 && /^\*Rina/.test(list1[2]) && bima.name === 'Bima' && JSON.parse(bima.slot)[0] === 1 && !bima.guest,
  `W1 who plays: first ${JSON.stringify(list0)}; guest Rina (5-6 -> ${rina.months} months, own empty record ${!rinaRec.res}); then ${JSON.stringify(list1)}; picked Bima -> slot ${bima.slot}`)
await tap(p, '#me-btn'); await p.waitForSelector('#s-name.on', { timeout: 8000 }).catch(() => {})
await tap(p, '#who-list .pl[data-k="0"]'); await p.waitForSelector('#s-map.on', { timeout: 8000 }).catch(() => {})
// W2
const m0 = await modeOn(p)
await tap(p, '.modes [data-mode="cepat"]'); await sleep(300)
await check(p, tag, 'map-cepat', worst)
await p.reload({ waitUntil: 'load' }); await p.waitForFunction(() => window.__cek && document.querySelectorAll('.isle').length === 6, { timeout: 60000 }); await spy(p)
const m1 = await modeOn(p), ana = await who(p)
const bMode = await p.evaluate(() => { const a = localStorage.getItem('dunia-active-slot'); localStorage.setItem('dunia-active-slot', '[1,1]'); const m = window.__cek.modeNow(); localStorage.setItem('dunia-active-slot', a); return m })
ok(m0 === 'normal' && m1 === 'cepat' && ana.name === 'Ana' && ana.mode === 'cepat' && bMode === 'normal', `W2 mode: default ${m0}; Ana picks Cepat -> after reload ${m1} (${ana.name}); Bima still ${bMode}`)
// W5 pause keeps the mode
await tap(p, '.isle[data-isle="pola"]'); await p.waitForSelector('#s-intro.on', { timeout: 8000 }).catch(() => {}); await tap(p, '#btn-start')
await waitItem(p, '#stage [data-i]'); const pAns = await p.evaluate(() => window.__cek.item().answer)
await tap(p, `#stage [data-i="${pAns}"]`); await sleep(1200)
await tap(p, '#btn-pause'); await p.waitForSelector('#s-map.on', { timeout: 8000 }).catch(() => {})
await tap(p, '.modes [data-mode="normal"]'); await sleep(200)
await tap(p, '.isle[data-isle="pola"]'); await p.waitForSelector('#s-intro.on', { timeout: 8000 }).catch(() => {})
const w5 = await p.evaluate(() => ({ tag: document.getElementById('intro-mode').textContent, btn: document.getElementById('btn-start').textContent }))
await tap(p, '#btn-start'); await sleep(600)
const w5b = await p.evaluate(() => { const s = window.__cek.state(); return s && { mode: s.mode, kind: s.sess.kind } })
ok(/Cepat/.test(w5.tag) && w5.btn === 'Lanjutkan' && w5b && w5b.mode === 'cepat' && w5b.kind === 'cat', `W5 paused Pola after switching to Normal: intro "${w5.tag}", button "${w5.btn}", resumed as ${JSON.stringify(w5b)}`)
await tap(p, '#btn-pause'); await p.waitForSelector('#s-map.on', { timeout: 8000 }).catch(() => {})
await p.evaluate(() => { const d = window.__cek.load(); delete d.pause; d.mode = 'cepat'; window.avatarScopedSet('cek-kemampuan', JSON.stringify(d)) }); await p.reload({ waitUntil: 'load' })
await p.waitForFunction(() => window.__cek && document.querySelectorAll('.isle').length === 6, { timeout: 60000 }); await spy(p)
// W3 a whole Cepat sitting
const polaN = await ladder(p, 'pola', 6, tag, worst)
const tagFit = await p.evaluate(() => { const t = document.getElementById('play-tag'); return t.textContent + (t.scrollWidth <= t.clientWidth + 1 ? '' : ' CUT') })
await toMap(p); await ladder(p, 'bentuk', 5, tag, worst); await toMap(p)
await ingat(p, tag, worst); await toMap(p)
await tap(p, '.isle[data-isle="kata"]'); await p.waitForSelector('#s-intro.on', { timeout: 8000 }).catch(() => {})
const kataNote = await p.evaluate(() => document.getElementById('intro-mode').textContent); await check(p, tag, 'intro-kata', worst); await tap(p, '#btn-back'); await sleep(500)
await ladder(p, 'kata', 7, tag, worst); await toMap(p)
const t0 = Date.now(); const cp = await cepat(p, tag, worst, true); const cMs = Date.now() - t0; await toMap(p)
let stories = 0; p.on('console', () => {})
await angka(p, tag, worst)
const s = await store(p), L = id => lastRec(s, id)
const P = L('pola'), B = L('bentuk'), I = L('ingat'), K = L('kata'), C = L('cepat'), A = L('angka')
const uniq = a => a && new Set(a).size === a.length
ok(P.mode === 'cepat' && P.items && P.items.length === 10 && uniq(P.items) && P.ok.length === 10 && P.raw === 6 && polaN === 10, `W3 Pola Cepat: ${P.items && P.items.length} adaptive items ${JSON.stringify(P.items)}, ${P.raw} right, mode ${P.mode}`)
ok(B.mode === 'cepat' && B.items && B.items.length === 9 && uniq(B.items) && B.raw === 5, `W3 Bentuk Cepat: ${B.items && B.items.length} items ${JSON.stringify(B.items)}, ${B.raw} right`)
ok(I.mode === 'cepat' && !('maju' in I) && I.mundur === 3 && I.corsi === 3, `W3 Ingat Cepat: parts ${Object.keys(I).filter(k => ['maju', 'mundur', 'corsi'].includes(k))} -> mundur ${I.mundur}, kotak ${I.corsi} (right at 3, wrong at 4 = 2 + 2/2)`)
ok(K.mode === 'cepat' && K.items && K.items.length === 10 && /Belum dihitung ke IQ/.test(kataNote), `W3 Kata Cepat: ${K.items && K.items.length} items; intro "${kataNote}"`)
ok(C.mode === 'cepat' && C.right === cp.r && C.rate === Math.round(cp.r / (45 / 60) * 10) / 10 && cMs < 75000, `W3 Cepat island in Cepat mode: ${cp.r} right in 45 s -> rate ${C.rate}/min (island took ${(cMs / 1000).toFixed(0)} s incl. practice)`)
ok(A.mode === 'cepat' && A.titik >= 4 && A.pae && A.pae.length === 4 && !('hitung' in A), `W3 Angka Cepat: ${A.titik} dots right of 8, ${A.pae && A.pae.length} lines of 0-100, stories ${'hitung' in A ? A.hitung : 'skipped'}`)
// W4
await toMap(p); await tap(p, '#btn-iq'); await p.waitForSelector('#s-iq.on', { timeout: 8000 }).catch(() => {})
await p.waitForFunction(() => { const e = window.CekProfile.iq(window.__cek.load().res, window.__cek.months()); return !e || document.getElementById('iq-num').textContent === String(e.iq) }, { timeout: 6000 }).catch(() => {})
await sleep(1500)
const iq = await p.evaluate(() => { const e = window.CekProfile.iq(window.__cek.load().res, window.__cek.months()); return { e, shown: document.getElementById('iq-num').textContent, range: document.getElementById('iq-range').textContent, note: document.getElementById('iq-note').textContent, out: [...document.querySelectorAll('#iq-bars .unsure')].map(x => x.textContent) } })
await check(p, tag, 'iq', worst)
ok(iq.e && String(iq.e.iq) === iq.shown && /mode Cepat/.test(iq.range) && iq.range.indexOf(iq.e.lo + '-' + iq.e.hi) >= 0 && /Kata dan soal cerita belum dihitung/.test(iq.note) && /bukan tes resmi/.test(iq.note) && iq.out.includes('belum dihitung'),
  `W4 IQ card ${iq.shown} = computed ${iq.e && iq.e.iq} (${iq.e && iq.e.islands} islands, mode ${iq.e && iq.e.mode}); "${iq.range}"; note "${iq.note}"; bar tags ${JSON.stringify(iq.out)}`)
// board: Ana, Bima, Rina on this device; Ana's row says Cepat
await tap(p, '#iq-board'); await p.waitForSelector('#s-board.on', { timeout: 8000 }).catch(() => {}); await sleep(400)
const dev = await p.evaluate(() => [...document.querySelectorAll('#board-rows li')].map(li => (li.classList.contains('me') ? '*' : '') + li.innerText.replace(/\s+/g, ' ').trim()))
await check(p, tag, 'board', worst)
ok(dev.length === 3 && dev.some(r => /^\*.*Ana.*Cepat/.test(r)) && dev.some(r => /Rina/.test(r)) && dev.some(r => /Bima/.test(r)), `W1/W4 device board ${JSON.stringify(dev)}`)
ok(!dead.length && !/CUT/.test(tagFit), `W6 dead Dengar buttons [${dead}]; play bar "${tagFit}"`)
await c.close()
// the chooser and the map at the other sizes
for (const size of SIZES.slice(1)) {
  const t = size.join('x'), o = await open(size)
  await check(o.p, t, 'map', worst)
  await tap(o.p, '#me-btn'); await o.p.waitForSelector('#s-name.on', { timeout: 8000 }).catch(() => {}); await check(o.p, t, 'who', worst)
  errs.push(...o.errs); await o.c.close()
}
const small = [...new Set(worst.flatMap(m => m.small))], off = [...new Set(worst.flatMap(m => m.off))], broken = [...new Set(worst.flatMap(m => m.broken))]
const low = Math.min(...worst.map(m => m.low)), lowWhat = worst.find(m => m.low === low).lowWhat
ok(!small.length && !off.length && low >= 4.5 && !worst.some(m => m.emoji) && !broken.length && !errs.length, `W7 ${worst.length} screens: buttons < 48 px [${small}], off screen [${off}], lowest contrast ${low} (${lowWhat}), images not loaded [${broken}], emoji ${worst.some(m => m.emoji)}, page errors ${errs.slice(0, 2).join(' | ') || 0}`)
await b.close()
console.log(`qa-prd56-cek-mode: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
