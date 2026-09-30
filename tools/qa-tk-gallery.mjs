// qa-tk-gallery.mjs — G30 "Galeri Kapal" gate (TKHub.gallery over TKFleet, owner 2026-09-30:
// "New ships like Edmund Fitzgerald and others aren't there yet?").
// Through the real game page (games/timmy-kapal.html) at every size:
//   - entry: the home carousel's FIRST card is "Galeri Kapal" and opens the gallery; Kamar Timmy's side-nav
//     "Galeri Kapal" opens it too, and its Kembali goes back where it came from
//   - every TKFleet ship once across the two tabs (Kapal Modern + Kapal Legenda; counts from the catalogue, 50 -> 52); each card
//     carries the kid name, the real-name chip (legend), 3 stat rows and the TKFleet fact; after scrolling the
//     pane every side-view thumbnail has loaded (lazy: not all requested up front); every top view URL answers 200
//   - "Punya petualangan!" on exactly the ships with their own story world; the sheet button of that name opens
//     that world's level map (legend worlds carpathia / republic / erebus / maryceleste / queenanne / maryrose +
//     titanic / cuttysark / victory / endurance / arizona)
//   - detail sheet: big side view + "Tampak atas" top view loaded, fact, stats; "Pakai kapal ini" saves the pick
//     (TKFleet.saved, survives a reload) and the NEXT steer level mounts with that ship (handle.state().ship)
//   - sail history: a finished lanes run (real autopilot taps) with a ship marks it sailed; the counter reads
//     "Kapal dicoba: n/<total>" (0/<total> on a fresh save) and the card wears "Sudah berlayar"
//   - layout: no horizontal scroll, header parts and the speaker button never overlap, card parts never overlap,
//     sheet parts never overlap and stay on screen, text >= 14 px, tap targets >= 56 px, the grid fills the frame;
//     card / tab motion is transform-only and <= 250 ms
//   - no banned word (no death / war / disaster words), no page errors, no failed requests
// QA_SIZES="1280x800,…" (default: 1280x800,1340x800,1024x768,390x844,844x390)  QA_SHOTS=<dir>
// QA_URL (default http://localhost:8081/games/timmy-kapal.html; serve the repo root with python3 -m http.server 8081)
import puppeteer from 'puppeteer'
import fs from 'node:fs'
const URL = process.env.QA_URL || 'http://localhost:8081/games/timmy-kapal.html'
const SIZES = (process.env.QA_SIZES || '1280x800,1340x800,1024x768,390x844,844x390').split(',').map(s => s.split('x').map(Number))
const SHOTS = process.env.QA_SHOTS || '/tmp/claude-1000/-home-baguspermana7/006f0cec-d381-48ee-882e-83cf434d8153/scratchpad/tk-gallery'
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true })
const BAN = /tenggelam|karam|tewas|meninggal|korban|perang|tempur|torpedo|senjata|\bbom\b|meriam|bencana|celaka|hancur|menabrak|rudal|tembak|\bmati\b|gagal|kalah/i
// the story world of each ship (TKFleet.storyShip + the legend worlds' own ships)
const WORLD_OF = { 'mary-rose': 'maryrose', 'queen-annes-revenge': 'queenanne', 'hms-erebus': 'erebus', 'hms-terror': 'erebus', 'mary-celeste': 'maryceleste',
  'ss-republic': 'republic', carpathia: 'carpathia', titanic: 'titanic', tallship: 'cuttysark', 'hms-victory': 'victory', endurance: 'endurance', 'uss-arizona': 'arizona' }
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0; const fails = []
const check = (ok, msg) => { if (ok) pass++; else { fails.push(msg); console.log('FAIL ' + msg) } }

async function tapSel (p, sel) {
  const r = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; e.scrollIntoView({ block: 'nearest', inline: 'nearest' }); const b = e.getBoundingClientRect(); if (!b.width) return null; return { x: b.left + b.width / 2, y: b.top + b.height / 2 } }, sel)
  if (!r) return false
  await p.touchscreen.tap(r.x, r.y); return true
}
const gstate = p => p.evaluate(() => { const g = document.querySelector('.tkh-gal'); return g ? { tab: g.querySelector('[data-gtab][aria-selected="true"]').getAttribute('data-gtab'), cards: g.querySelectorAll('.tkg-card').length, sheet: !g.querySelector('.tkg-sheet').hidden, cnt: g.querySelector('[data-cnt]').textContent } : null })
async function openFromHome (p) {
  await p.evaluate(() => { document.querySelector('#p-home') && document.querySelector('#p-home').click() })
  await sleep(300)
  if (await p.evaluate(() => __tk.state().screen) !== 'scr-home') { await p.evaluate(() => { const b = document.querySelector('#scr-map [data-back], .scr.active [data-back]'); if (b) b.click() }); await sleep(400) }
  if (await p.evaluate(() => __tk.state().screen) !== 'scr-home') await p.evaluate(() => __tk.room('kapal'))
  if (await p.evaluate(() => __tk.state().screen) === 'scr-room' && await p.evaluate(() => !!document.querySelector('.tkh-room'))) { await tapSel(p, '.tkh-room [data-tab="galeri"]'); await sleep(500); return }
  await p.evaluate(() => { const c = document.getElementById('carousel'); if (c) c.scrollLeft = 0 })
  await tapSel(p, '#carousel .sc-gal'); await sleep(500)
}
async function setTab (p, t) { if ((await gstate(p)).tab !== t) { await tapSel(p, `.tkh-gal [data-gtab="${t}"]`); await sleep(450) } }
// scroll the pane down in steps so the lazy thumbnails come in, then report the images
async function scrollAll (p) {
  for (let i = 0; i < 40; i++) {
    const done = await p.evaluate(() => { const b = document.querySelector('.tkg-body'); b.scrollTop += b.clientHeight * 0.8; return b.scrollTop + b.clientHeight >= b.scrollHeight - 2 })
    await sleep(160); if (done) break
  }
  await sleep(900)
  return p.evaluate(() => [...document.querySelectorAll('.tkg-card')].map(c => { const im = c.querySelector('.tkg-pic img'); return { id: c.getAttribute('data-ship'), src: im.getAttribute('src'), ok: im.complete && im.naturalWidth > 0 } }))
}
// geometry rules for the gallery at this size
const LAYOUT = () => {
  const out = [], vw = innerWidth, vh = innerHeight, R = e => e.getBoundingClientRect()
  const ov = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1
  const vis = e => { const r = R(e), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' }
  const g = document.querySelector('.tkh-gal')
  if (document.scrollingElement.scrollWidth > vw + 1) out.push('page horizontal scroll')
  const body = g.querySelector('.tkg-body'); if (body.scrollWidth > body.clientWidth + 1) out.push('pane horizontal scroll')
  const head = ['.tkg-back', '.tkg-title', '.tkg-tabs', '.tkg-cnt'].map(s => g.querySelector(s)).filter(vis)
  const fab = document.getElementById('sndfab'); if (fab && vis(fab)) head.push(fab)
  for (let i = 0; i < head.length; i++) {
    const a = R(head[i]); if (a.left < -1 || a.right > vw + 1 || a.top < -1) out.push('off-screen ' + head[i].className)
    for (let j = i + 1; j < head.length; j++) if (ov(a, R(head[j]))) out.push('header overlap ' + (head[i].className || head[i].id) + ' / ' + (head[j].className || head[j].id))
  }
  const ti = g.querySelector('.tkg-title'); if (!g.classList.contains('is-short') && ti.scrollWidth > ti.clientWidth + 1) out.push('title cut off')
  const hb = R(g.querySelector('.tkg-head')), bb = R(body)
  if (bb.top < hb.bottom - 1) out.push('pane under the header')
  if (bb.bottom < vh - 2 || (vh - hb.bottom) > 0 && bb.height < (vh - hb.bottom) * 0.9) out.push('pane does not fill the frame ' + Math.round(bb.height))
  const gr = R(g.querySelector('.tkg-grid')); if (gr.width < vw * 0.85) out.push('grid narrower than 85% of the frame ' + Math.round(gr.width))
  const cards = [...g.querySelectorAll('.tkg-card')]
  const cols = new Set(cards.slice(0, 12).map(c => Math.round(R(c).left))).size
  cards.forEach((c, i) => {
    const r = R(c)
    if (r.right > vw + 1 || r.left < -1) out.push('card off-x ' + c.dataset.ship)
    if (Math.min(r.width, r.height) < 56) out.push('card target < 56 ' + c.dataset.ship)
    const parts = ['.tkg-name', '.tkg-real', '.tkg-stats', '.tkg-fact', '.tkg-topnote', '.tkg-adv'].map(s => c.querySelector(s)).filter(e => e && vis(e))
    for (let a = 0; a < parts.length; a++) {
      const ra = R(parts[a]); if (ra.right > r.right + 1 || ra.bottom > r.bottom + 1 || ra.left < r.left - 1) out.push('card part outside ' + c.dataset.ship + ' ' + parts[a].className)
      for (let b = a + 1; b < parts.length; b++) if (ov(ra, R(parts[b]))) out.push('card overlap ' + c.dataset.ship + ' ' + parts[a].className + '/' + parts[b].className)
    }
    // the corner badges never cover each other or the card's text (they may sit over the picture)
    const badges = ['.tkg-rib', '.tkg-mine'].map(s => c.querySelector(s)).filter(Boolean)
    if (badges.length === 2 && ov(R(badges[0]), R(badges[1]))) out.push('ribbon overlap ' + c.dataset.ship)
    badges.forEach(bd => { const rb = R(bd); if (rb.right > r.right + 1 || rb.left < r.left - 1) out.push('badge outside ' + c.dataset.ship); parts.forEach(pt => { if (ov(rb, R(pt))) out.push('badge covers text ' + c.dataset.ship + ' ' + bd.className + '/' + pt.className) }) })
    for (let j = i + 1; j < Math.min(cards.length, i + 8); j++) if (ov(r, R(cards[j]))) out.push('cards overlap ' + c.dataset.ship + '/' + cards[j].dataset.ship)
  })
  // text >= 14 px, targets >= 56 px (buttons of the header / sheet)
  g.querySelectorAll('*').forEach(e => { if (!vis(e) || e.closest('.tkg-sheet[hidden]')) return
    const own = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); if (own && parseFloat(getComputedStyle(e).fontSize) < 14) out.push('text < 14px ' + e.className + ' "' + e.textContent.trim().slice(0, 20) + '"') })
  g.querySelectorAll('button').forEach(b => { if (!vis(b) || b.classList.contains('tkg-card')) return; const r = { width: b.offsetWidth, height: b.offsetHeight }; if (Math.min(r.width, r.height) < 56) out.push('target < 56 ' + b.className + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)) })
  // motion: cards + tabs animate transform only, <= 250 ms
  const tr = e => { const cs = getComputedStyle(e); return { p: cs.transitionProperty, d: Math.max(...cs.transitionDuration.split(',').map(parseFloat)) } }
  ;[cards[0], g.querySelector('.tkg-tabs button')].filter(Boolean).forEach(e => { const t = tr(e); if (t.p.split(',').some(x => !/transform|opacity|all/.test(x.trim())) && t.p !== 'none') out.push('transition not transform/opacity: ' + t.p); if (t.d > 0.25) out.push('transition > 250 ms: ' + t.d) })
  return { out, cols }
}
const SHEET = () => {
  const out = [], vw = innerWidth, vh = innerHeight, R = e => e.getBoundingClientRect()
  const ov = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1
  const s = document.querySelector('.tkg-sheet'); if (!s || s.hidden) return { open: false }
  const pan = s.querySelector('.tkg-pan'), pr = R(pan)
  if (pr.left < -1 || pr.right > vw + 1 || pr.top < -1 || pr.bottom > vh + 1) out.push('sheet off-screen')
  const parts = ['.tkg-sv', '.tkg-info', '.tkg-top', '.tkg-acts'].map(q => pan.querySelector(q))
  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) if (ov(R(parts[i]), R(parts[j]))) out.push('sheet overlap ' + parts[i].className + '/' + parts[j].className)
  const fab = document.getElementById('sndfab'); if (fab && getComputedStyle(fab).display !== 'none' && ov(R(fab), pr)) out.push('speaker button over the sheet')
  const btns = [...pan.querySelectorAll('.tkg-acts button')]
  for (let i = 0; i < btns.length; i++) { const r = R(btns[i]); if (Math.min(r.width, r.height) < 56) out.push('sheet target < 56 ' + btns[i].className); for (let j = i + 1; j < btns.length; j++) if (ov(r, R(btns[j]))) out.push('sheet buttons overlap') }
  // the actions must be reachable: on screen, or reachable by scrolling the sheet
  const ar = R(pan.querySelector('.tkg-acts')); if (ar.bottom > vh + 1 && pan.scrollHeight <= pan.clientHeight + 1) out.push('sheet actions below the screen')
  const side = pan.querySelector('.tkg-sv img'), top = pan.querySelector('.tkg-top img')
  pan.querySelectorAll('*').forEach(e => { const own = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); if (own && parseFloat(getComputedStyle(e).fontSize) < 14) out.push('sheet text < 14px ' + e.className) })
  return { open: true, out, side: side.complete && side.naturalWidth > 0, top: top.complete && top.naturalWidth > 0, caption: (pan.querySelector('.tkg-top figcaption') || {}).textContent,
    name: pan.querySelector('h2').textContent, fact: pan.querySelector('.tkg-f2').textContent, stats: pan.querySelectorAll('.tkg-stats .st').length, go: pan.querySelector('.tkg-go') ? pan.querySelector('.tkg-go').getAttribute('data-world') : null, text: pan.innerText }
}
// lanes autopilot (same as qa-tk-play): real pointerdown taps on LEFT / RIGHT toward the open lane
const AUTOPILOT = () => {
  window.__autoStop && window.__autoStop()
  const tap = b => b && b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 3, pointerType: 'touch', isPrimary: true }))
  const id = setInterval(() => {
    const h = window.__tk.handle(); if (!h || !h.state) return
    const s = h.state(); if (s.sent) { clearInterval(id); return }
    if (s.waiting || s.phase !== 'player') return
    if (Math.abs(s.x - (s.lane - 1) * 100) < 2 && s.lane !== s.safeLane) tap(document.querySelector(s.safeLane < s.lane ? '.tkl-left' : '.tkl-right'))
  }, 60)
  window.__autoStop = () => clearInterval(id)
}
async function answerChallenge (p) {
  const st = await p.evaluate(() => { const c = __tk.challenge(); return c && c.open ? c.state : null })
  if (!st) return false
  if (st.answered) { await tapSel(p, '.tkq-chal .tkq-next:not([disabled])'); await sleep(450); return true }
  await tapSel(p, `.tkq-chal .tkq-ans [data-c="${String(st.answer).replace(/"/g, '\\"')}"]`); await sleep(700); return true
}
// starts a world's first level of `type` and waits until that module runs (story panels skipped, challenges answered)
// a world with a level of `type` and NO story ship of its own (a story world reopens "Pilih Kapalmu" once, by design)
const plainWorld = (p, type) => p.evaluate(type => { const w = TKWorlds.WORLDS.find(w => w.id !== 'kamar' && !w.chapters && !TKFleet.storyShip(w.id) && w.levels.some(l => l.type === type)); return w && w.id }, type)
async function startType (p, wid, type) {
  const k = await p.evaluate((wid, type) => TKWorlds.get(wid).levels.findIndex(l => l.type === type), wid, type)
  if (k < 0) return false
  await p.evaluate((wid, k) => __tk.start(wid, k), wid, k)
  const t0 = Date.now()
  while (Date.now() - t0 < 20000) {
    const s = await p.evaluate(() => ({ lv: __tk.level(), skip: !!document.querySelector('.tks-skip'), picker: !!document.querySelector('.tkf-root'), h: __tk.handle() && __tk.handle().state ? __tk.handle().state() : null }))
    if (s.skip) { await tapSel(p, '.tks-skip'); await sleep(500); continue }
    if (s.lv && s.lv.type === type && s.h) return s
    await sleep(300)
  }
  return false
}

for (const [w, h] of SIZES) {
  const tag = `${w}x${h}`, first = w === SIZES[0][0] && h === SIZES[0][1]
  const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] })
  const p = await b.newPage(); const errs = []
  p.on('pageerror', e => errs.push('pageerror ' + e.message))
  p.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url().split('/').pop()) })
  p.on('requestfailed', r => { if (!/favicon/.test(r.url())) errs.push('failed ' + r.url().split('/').pop()) })
  // no service worker: a new worker taking over (sw-reload) reloads the page mid-check; offline is qa-tk-offline's job
  await p.setBypassServiceWorker(true)
  await p.setViewport({ width: w, height: h, isMobile: w < 900, hasTouch: true })
  await p.goto(URL, { waitUntil: 'networkidle2' })
  // sw-reload may reload the page once when a new service worker takes over: wait for the game globals
  const ready = () => p.waitForFunction(() => window.TKFleet && window.__tk && window.TKHub, { timeout: 20000 })
  await ready(); await sleep(400); await ready()
  await p.evaluate(() => { Object.keys(localStorage).filter(k => /^tk-fleet/.test(k)).forEach(k => localStorage.removeItem(k)); __tk.reset() })
  await sleep(600)
  const av = await p.evaluate(() => TKFleet.avatar())
  // counts come from the catalogue (it grows: 50 -> 52 when legend ships are added)
  const TOTAL = await p.evaluate(() => TKFleet.ships.length), PER = await p.evaluate(() => Object.fromEntries(TKFleet.groups.map(g => [g.id, g.ids.length])))

  // ── entry from home: the carousel's first card ──
  const hc = await p.evaluate(() => { const c = document.querySelector('#carousel .sc'); return c && { gal: c.hasAttribute('data-gal'), text: c.innerText.replace(/\s+/g, ' ').trim() } })
  check(hc && hc.gal && /Galeri Kapal/.test(hc.text), `${tag}: home carousel starts with the Galeri Kapal card (${JSON.stringify(hc)})`)
  if (SHOTS && first) await p.screenshot({ path: `${SHOTS}/${tag}-home.png` })
  await tapSel(p, '#carousel .sc-gal'); await sleep(600)
  let g = await gstate(p)
  check(!!g && (await p.evaluate(() => __tk.state().screen)) === 'scr-room', `${tag}: the home card opens the gallery (${JSON.stringify(g)})`)
  if (!g) { await b.close(); continue }
  check(g.cnt === `0/${TOTAL}`, `${tag}: fresh save counter "Kapal dicoba: 0/${TOTAL}" (${g.cnt})`)
  check(await p.evaluate(() => /Kapal dicoba/.test(document.querySelector('.tkg-cnt').textContent)), `${tag}: counter label "Kapal dicoba"`)

  // ── every ship across the two tabs, content + lazy thumbnails + layout ──
  const seenIds = [], texts = []
  for (const t of ['modern', 'legend']) {
    await setTab(p, t)
    const pre = await p.evaluate(() => [...document.querySelectorAll('.tkg-card .tkg-pic img')].filter(i => i.getAttribute('src')).length)
    const L = await p.evaluate(LAYOUT)
    L.out.forEach(o => check(false, `${tag} ${t}: ${o}`)); if (!L.out.length) pass++
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/${tag}-${t}.png` })
    const content = await p.evaluate(t => {
      const bad = []
      document.querySelectorAll('.tkg-card').forEach(c => {
        const s = TKFleet.get(c.dataset.ship); if (!s) { bad.push('unknown ' + c.dataset.ship); return }
        if (s.group !== t) bad.push('wrong tab ' + s.id)
        if (c.querySelector('.tkg-name').textContent !== s.name) bad.push('name ' + s.id)
        if (c.querySelector('.tkg-fact').textContent !== s.fact) bad.push('fact ' + s.id)
        const note = c.querySelector('.tkg-topnote')
        if (!!note !== !!s.topNote || (note && note.textContent !== s.topNote)) bad.push('art disclosure ' + s.id)
        if (c.querySelectorAll('.tkg-stats .st').length !== 3) bad.push('stats ' + s.id)
        const on = [...c.querySelectorAll('.tkg-stats .st')].map(x => x.querySelectorAll('i.on').length).join(''); if (on !== '' + s.stats.cepat + s.stats.lincah + s.stats.kuat) bad.push('pips ' + s.id)
        const real = c.querySelector('.tkg-real'); if (!!s.real !== !!real || (real && real.textContent !== s.real)) bad.push('real ' + s.id)
      })
      return { ids: [...document.querySelectorAll('.tkg-card')].map(c => c.dataset.ship), bad, adv: [...document.querySelectorAll('.tkg-card')].filter(c => c.querySelector('.tkg-adv')).map(c => c.dataset.ship), text: document.querySelector('.tkh-gal').innerText }
    }, t)
    check(content.ids.length === PER[t], `${tag} ${t}: ${PER[t]} cards (${content.ids.length})`)
    check(!content.bad.length, `${tag} ${t}: card content = TKFleet (${content.bad.slice(0, 5).join(', ')})`)
    const expAdv = Object.keys(WORLD_OF).filter(id => content.ids.includes(id)).sort()
    check(JSON.stringify(content.adv.slice().sort()) === JSON.stringify(expAdv), `${tag} ${t}: "Punya petualangan!" exactly on the story ships (${content.adv.join(',')} vs ${expAdv.join(',')})`)
    seenIds.push(...content.ids); texts.push(content.text)
    const imgs = await scrollAll(p)
    check(pre < PER[t], `${tag} ${t}: thumbnails load lazily (${pre}/${PER[t]} requested before scrolling)`)
    const miss = imgs.filter(i => !i.ok).map(i => i.id)
    check(!miss.length, `${tag} ${t}: every side-view sprite loads (${miss.join(',')})`)
    if (first && t === 'legend') {
      await p.evaluate(() => { document.querySelector('.tkg-body').scrollTop = 0 }); await sleep(300)
      const L2 = await p.evaluate(LAYOUT); L2.out.forEach(o => check(false, `${tag} ${t} after scroll: ${o}`))
    }
  }
  const all = await p.evaluate(() => TKFleet.ships.map(s => s.id).sort())
  check(seenIds.length === TOTAL && JSON.stringify([...new Set(seenIds)].sort()) === JSON.stringify(all), `${tag}: the two tabs hold all ${TOTAL} TKFleet ships once (${seenIds.length})`)
  if (first) {
    const tops = await p.evaluate(async () => { const bad = []; for (const s of TKFleet.ships) { const r = await fetch(TKFleet.topSrc(s.id, { lib: TKArt.lib })); if (!r.ok) bad.push(s.id) } return bad })
    check(!tops.length, `${tag}: every top-view sprite answers 200 (${tops.join(',')})`)
  }

  // ── detail sheet: Edmund Fitzgerald (the owner's example) ──
  await setTab(p, 'legend')
  for (const id of ['uss-enterprise', 'great-eastern']) {
    await tapSel(p, `.tkg-card[data-ship="${id}"]`); await sleep(700)
    const alternative = await p.evaluate(SHEET)
    check(alternative.open && alternative.caption === 'Tampak atas contoh', `${tag} ${id}: borrowed gameplay view is disclosed`)
    if (alternative.open) {
      alternative.out.forEach(problem => check(false, `${tag} ${id}: ${problem}`))
      if (SHOTS) await p.screenshot({ path: `${SHOTS}/${tag}-${id}-disclosure.png` })
      await p.keyboard.press('Escape'); await sleep(350)
    }
  }
  await tapSel(p, '.tkg-card[data-ship="edmund-fitzgerald"]'); await sleep(700)
  let S = await p.evaluate(SHEET)
  check(S.open, `${tag}: tapping a card opens the detail sheet`)
  if (S.open) {
    S.out.forEach(o => check(false, `${tag} sheet: ${o}`)); if (!S.out.length) pass++
    check(S.side && S.top, `${tag} sheet: big side view + top view loaded (${S.side}/${S.top})`)
    check(S.caption === 'Tampak atas' && S.name === 'Kapal Kargo Danau' && /danau besar/.test(S.fact) && S.stats === 3, `${tag} sheet: caption / name / fact / stats (${S.caption}, ${S.name})`)
    texts.push(S.text)
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/${tag}-sheet.png` })
    await tapSel(p, '.tkg-use'); await sleep(500)
    const u = await p.evaluate(() => ({ saved: TKFleet.saved(TKFleet.avatar()), btn: document.querySelector('.tkg-use').textContent, mine: !!document.querySelector('.tkg-card[data-ship="edmund-fitzgerald"] .tkg-mine') }))
    check(u.saved === 'edmund-fitzgerald' && /Kapalmu/.test(u.btn) && u.mine, `${tag}: "Pakai kapal ini" saves the ship for this avatar (${JSON.stringify(u)})`)
    if (SHOTS && first) await p.screenshot({ path: `${SHOTS}/${tag}-sheet-used.png` })
    await tapSel(p, '.tkg-close'); await sleep(500)
    if ((await gstate(p)).sheet) { await sleep(400); await tapSel(p, '.tkg-close'); await sleep(500) }   // one retry: a tap during the press animation
    check(!(await gstate(p)).sheet, `${tag}: Tutup closes the sheet`)
  }
  // a sheet with the story button (Carpathia): layout + text
  await tapSel(p, '.tkg-card[data-ship="carpathia"]'); await sleep(700)
  S = await p.evaluate(SHEET)
  if (S.open) { S.out.forEach(o => check(false, `${tag} sheet carpathia: ${o}`)); check(S.go === 'carpathia', `${tag}: Carpathia sheet has "Punya petualangan!" -> carpathia (${S.go})`); texts.push(S.text); if (SHOTS) await p.screenshot({ path: `${SHOTS}/${tag}-sheet-story.png` }) }
  await p.keyboard.press('Escape'); await sleep(400)
  check(!(await gstate(p)).sheet, `${tag}: Escape closes the sheet`)
  // no banned words anywhere the child reads
  const hit = texts.map(t => (t.match(BAN) || [])[0]).filter(Boolean)
  check(!hit.length, `${tag}: no banned word (${hit.join(',')})`)
  // Kembali returns home
  await tapSel(p, '.tkg-back'); await sleep(500)
  check((await p.evaluate(() => __tk.state().screen)) === 'scr-home', `${tag}: Kembali returns to Home`)

  // ── the pick persists (reload) and the next steer level sails it ──
  // a reload can miss networkidle while the service worker warms its cache: fall back to the load event
  try { await p.reload({ waitUntil: 'networkidle2', timeout: 45000 }) } catch (e) { await p.reload({ waitUntil: 'load', timeout: 60000 }) }
  await ready(); await sleep(500)
  check(await p.evaluate(() => TKFleet.saved(TKFleet.avatar())) === 'edmund-fitzgerald', `${tag}: the pick survives a reload`)
  await p.evaluate(() => __tk.unlockAll())
  const sw = await plainWorld(p, 'steer')
  const sm = sw && await startType(p, sw, 'steer')
  check(sm && sm.h.ship === 'edmund-fitzgerald' && !sm.picker, `${tag}: the next steer level mounts with the picked ship (${sm && sm.h.ship}, picker ${sm && sm.picker})`)
  if (SHOTS && first) await p.screenshot({ path: `${SHOTS}/${tag}-steer-ship.png` })
  await p.evaluate(() => document.getElementById('p-home').click()); await sleep(500)

  // ── story badges jump to the right world (room entry; every mapping at the first size, 2 elsewhere) ──
  const pairs = Object.entries(WORLD_OF).filter((e, i) => first || i === 0 || i === 6)
  for (const [ship, wid] of pairs) {
    await p.evaluate(() => __tk.room('kapal')); await sleep(400)
    await tapSel(p, '.tkh-room [data-tab="galeri"]'); await sleep(600)
    const gg = await gstate(p); if (!gg) { check(false, `${tag}: Kamar Timmy "Galeri Kapal" opens the gallery`); break }
    await setTab(p, await p.evaluate(id => TKFleet.get(id).group, ship))
    await tapSel(p, `.tkg-card[data-ship="${ship}"]`); await sleep(600)
    await tapSel(p, '.tkg-go'); await sleep(900)
    const st = await p.evaluate(() => __tk.state())
    check(st.screen === 'scr-map' && st.world === wid, `${tag}: "Punya petualangan!" on ${ship} opens the ${wid} level map (${st.screen} ${st.world})`)
  }
  // Kembali from a room-opened gallery goes back to the room
  await p.evaluate(() => __tk.room('kapal')); await sleep(400); await tapSel(p, '.tkh-room [data-tab="galeri"]'); await sleep(500)
  await tapSel(p, '.tkg-back'); await sleep(500)
  check(await p.evaluate(() => !!document.querySelector('.tkh-room') && __tk.state().screen === 'scr-room'), `${tag}: Kembali from the room's gallery returns to Kamar Timmy`)
  if (SHOTS && first) await p.screenshot({ path: `${SHOTS}/${tag}-room.png` })

  // ── sail history: a finished lanes run with the picked ship (first size; real autopilot taps) ──
  if (first) {
    await p.evaluate(() => { TKFleet.save(TKFleet.avatar(), 'hms-terror'); __tk.fast(true) })
    const n0 = await p.evaluate(() => TKFleet.sailed(TKFleet.avatar()).length)
    const lw = await plainWorld(p, 'lanes')
    check(!!lw, `${tag}: a lanes world without its own story ship exists (${lw})`)
    const ln = lw && await startType(p, lw, 'lanes')
    check(ln && ln.h.ship === 'hms-terror', `${tag}: lanes level sails the picked ship (${ln && ln.h.ship})`)
    if (ln) {
      await p.evaluate(AUTOPILOT)
      const t0 = Date.now(); let scr = ''
      while (Date.now() - t0 < 150000) {
        scr = await p.evaluate(() => __tk.state().screen); if (scr === 'scr-reward') break
        if (!(await answerChallenge(p))) await sleep(300)
      }
      await p.evaluate(() => window.__autoStop && window.__autoStop())
      check(scr === 'scr-reward', `${tag}: the lanes run finished (${scr})`)
      const n1 = await p.evaluate(() => TKFleet.sailed(TKFleet.avatar()))
      check(n1.length === n0 + 1 && n1.includes('hms-terror'), `${tag}: a finished run marks the ship sailed (${n0} -> ${n1.join(',')})`)
      check(await p.evaluate(() => TKFleet.markSailed(TKFleet.avatar(), 'hms-terror').length) === n0 + 1, `${tag}: sailing the same ship again does not count twice`)
      await p.evaluate(() => __tk.room('kapal')); await sleep(300); await tapSel(p, '.tkh-room [data-tab="galeri"]'); await sleep(500); await setTab(p, 'legend')
      const gs = await p.evaluate(() => ({ cnt: document.querySelector('[data-cnt]').textContent, rib: !!document.querySelector('.tkg-card[data-ship="hms-terror"] .tkg-rib'), n: document.querySelectorAll('.tkg-rib').length }))
      check(gs.cnt === `${n0 + 1}/${TOTAL}` && gs.rib && gs.n === n0 + 1, `${tag}: counter "${gs.cnt}" + "Sudah berlayar" ribbon on the sailed ship`)
      const L3 = await p.evaluate(LAYOUT); L3.out.forEach(o => check(false, `${tag} with ribbon: ${o}`))
      if (SHOTS) await p.screenshot({ path: `${SHOTS}/${tag}-sailed.png` })
    }
  } else {
    // other sizes: a seeded history renders the ribbon + counter without overlap
    await p.evaluate(() => { ['hms-terror', 'carpathia', 'titanic', 'tug'].forEach(id => TKFleet.markSailed(TKFleet.avatar(), id)); TKFleet.save(TKFleet.avatar(), 'tug') })
    await p.evaluate(() => __tk.room('kapal')); await sleep(300); await tapSel(p, '.tkh-room [data-tab="galeri"]'); await sleep(500)
    const gs = await p.evaluate(() => ({ cnt: document.querySelector('[data-cnt]').textContent, rib: document.querySelectorAll('.tkg-rib').length }))
    check(gs.cnt === `4/${TOTAL}` && gs.rib === 2, `${tag}: seeded history -> "4/${TOTAL}" + ribbons on the modern tab (${JSON.stringify(gs)})`)
    const L3 = await p.evaluate(LAYOUT); L3.out.forEach(o => check(false, `${tag} with ribbon: ${o}`))
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/${tag}-sailed.png` })
  }
  check(!errs.length, `${tag}: no page errors / failed requests (${errs.slice(0, 5).join(' | ')})`)
  await b.close()
}
console.log(`qa-tk-gallery: ${pass} passed, ${fails.length} failed`)
if (fails.length) { console.log(fails.join('\n')); process.exit(1) }
