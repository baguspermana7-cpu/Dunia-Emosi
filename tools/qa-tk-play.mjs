// qa-tk-play.mjs — G30 Timmy & Kapal Legendaris end-to-end gate.
// Plays the bedroom tutorial and the whole Titanic journey — 10 CHAPTERS (owner mockup ui-12), each a
// sequence of steps on one play screen — through the real screens, then the other ship worlds level by level:
//   story panels: the real "Lewati" button · quiz / sort: the right answers tapped · grid: the engine's own
//   solution loaded through the UI (setProgram + JALAN) · lanes: an in-page autopilot taps the real LEFT /
//   RIGHT buttons toward state().safeLane; in chapter 5 the ship is first left to hit the ice so the
//   Knowledge Challenge opens, is answered with real taps and the ship sails on · cinema: played at speed 6
//   (__tk.fast), its questions answered with real taps · reflection / fragment: their big button.
// Chapter checks: the parchment chapter map (10 medallions, number + title + subtitle, locked = grey + lock,
// the small ship beside the current chapter, footer line, no overlap, nothing off-screen); "Langkah i/n" chip
// at every step; step order exactly as data; the play screen never changes between steps; checkpoint after
// every step (progress.titanic[chapter]) and at every cinema scene (cine), resume from the map continues at
// the checkpoint (chapter 4 step 2, chapter 9 scene "descent"), a finished chapter replays from step 0; the
// reward's big button leads to the next chapter, chapter 10's to Kamar Timmy with the Titanic model; the
// save migration (old t1..t13 stars -> chapters, fragment kept); the lanes pause button opens OUR pause menu.
// Everywhere: no page errors, no failed requests, nothing off-screen, no horizontal scroll, tap targets
// >= 40 px (main actions >= 56 px), no failure words.
// QA_SIZES="390x844,…"  QA_OTHERS=all (other worlds at every size; default: the first size only)
// QA_FULL=1: play EVERY other world level by level (default: a 4-world sample; every world still gets its level-map checks)
// Level-map checks (every world without chapters, every size): level-mode board, medallions + taps >= 56 px, no overlap,
// titles >= 14 px + stars >= 18 px, the current level has the ring + "Main!" flag + ship beside it, locked = grey + lock and
// a locked tap shakes with the hint toast, chest fragment node, "Peta <kapal>" plate + guide bubble, board fills >= 85%, and
// (Vasa) a rotation re-lays out without replaying the ship.
// QA_WORLDS="kamar,titanic,vasa" (default: all)  QA_SHOTS=<dir> (default: scratchpad tk-chapters/)
import puppeteer from 'puppeteer'
import fs from 'node:fs'
const URL = process.env.QA_URL || 'http://localhost:8081/games/timmy-kapal.html'
const SIZES = (process.env.QA_SIZES || '390x844,844x390,1280x800').split(',').map(s => s.split('x').map(Number))
const SHOTS = process.env.QA_SHOTS || '/tmp/claude-1000/-home-baguspermana7/006f0cec-d381-48ee-882e-83cf434d8153/scratchpad/tk-chapters'
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true })
const BAD = /gagal|kalah|game over/i
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fails = []
const check = (ok, msg) => { if (ok) pass++; else { fails.push(msg); console.log('FAIL ' + msg) } }

async function tapSel (p, sel) {
  const r = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; e.scrollIntoView({ block: 'nearest' }); const b = e.getBoundingClientRect(); if (!b.width) return null; return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width, h: b.height } }, sel)
  if (!r) return false
  await p.touchscreen.tap(r.x, r.y); return true
}
async function layout (p, tag, seen) {
  const L = await p.evaluate(() => {
    const out = []; const vw = innerWidth
    document.querySelectorAll('.scr.active button, .scr.active [role=button]').forEach(b => {
      const r = b.getBoundingClientRect(), cs = getComputedStyle(b)
      if (!r.width || cs.visibility === 'hidden' || cs.display === 'none' || b.closest('.list,.carousel,.islands,.route,.room-body,.settings,.chips,.cats,.tkg-route,.tkq-ans,.tks-thumbs,.tkg-bar') || b.classList.contains('tkf-card')) return
      if (r.right > vw + 2 || r.left < -2) out.push('off-x ' + (b.id || b.className).slice(0, 40))
      if (Math.min(r.width, r.height) < 40) out.push('small ' + Math.round(Math.min(r.width, r.height)) + ' ' + (b.id || b.className).slice(0, 40))
    })
    return { out, hs: document.scrollingElement.scrollWidth > vw + 1 }
  })
  for (const o of L.out) if (!seen.has(o)) { seen.add(o); check(false, `${tag}: ${o}`) }
  if (L.hs && !seen.has('hs')) { seen.add('hs'); check(false, `${tag}: horizontal scroll`) }
}
// in-page autopilot for tk-lanes: real pointerdown taps on the LEFT / RIGHT buttons toward the open lane.
// holdUntilHit: do not steer until the first collision (chapter 5: the Knowledge Challenge must open)
const AUTOPILOT = (holdUntilHit) => {
  window.__autoStop && window.__autoStop()
  const tap = b => b && b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 3, pointerType: 'touch', isPrimary: true }))
  window.__phases = []
  const id = setInterval(() => {
    const h = window.__tk.handle(); if (!h || !h.state) return
    const s = h.state()
    if (window.__phases[window.__phases.length - 1] !== s.phase) window.__phases.push(s.phase)
    if (s.sent) { clearInterval(id); return }
    if (holdUntilHit && s.collisions < 1) return
    if (s.waiting || s.phase !== 'player') return
    const settled = Math.abs(s.x - (s.lane - 1) * 100) < 2
    if (settled && s.lane !== s.safeLane) tap(document.querySelector(s.safeLane < s.lane ? '.tkl-left' : '.tkl-right'))
  }, 60)
  window.__autoStop = () => clearInterval(id)
}
// answers an open TKQuiz.challenge card (lanes collision / cinema question) with real taps
async function answerChallenge (p, tag) {
  const st = await p.evaluate(() => { const c = __tk.challenge(); return c && c.open ? c.state : null })
  if (!st) return false
  if (st.answered) { await tapSel(p, '.tkq-chal .tkq-next:not([disabled])'); await sleep(450); return true }
  const ok = await tapSel(p, `.tkq-chal .tkq-ans [data-c="${String(st.answer).replace(/"/g, '\\"')}"]`)
  if (!ok) check(false, `${tag}: challenge answer button missing (${st.answer})`)
  await sleep(700); return true
}
async function playQuiz (p, tag) {
  const q = await p.evaluate(() => { const h = __tk.handle(); return h && h.state ? h.state() : null })
  if (!q) { await sleep(300); return true }
  if (q.answered) { if (!(await tapSel(p, '.tkq-next:not([disabled])'))) await sleep(300); await sleep(450); return true }
  if (await p.evaluate(() => !!document.querySelector('.tkq-tile'))) {   // arrange-letters (Arabic)
    for (const ch of [...String(q.answer)]) {
      const r = await p.evaluate(c => { const t = [...document.querySelectorAll('.tkq-tile')].find(x => !x.disabled && !x.classList.contains('used') && x.textContent.trim() === c); if (!t) return null; const b = t.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 } }, ch)
      if (r) { await p.touchscreen.tap(r.x, r.y); await sleep(250) }
    }
    await sleep(900); return true
  }
  if (!(await tapSel(p, `.tkq-ans [data-c="${String(q.answer).replace(/"/g, '\\"')}"]`))) { check(false, `${tag}: quiz answer button missing (${q.answer})`); return false }
  await sleep(900); return true
}
async function playSort (p, tag) {
  const done = await p.evaluate(() => { const h = __tk.handle(); return h && h.state ? h.state().done : false })
  if (done) { await tapSel(p, '.tkq-next:not([disabled])'); await sleep(700); return true }
  const items = await p.evaluate(() => document.querySelectorAll('.tkq-tray .tkq-item').length)
  if (!items) { await sleep(400); return true }
  const plan = await p.evaluate(() => {
    const h = __tk.handle(); const el = document.querySelector('.tkq-tray .tkq-item'); if (!el || !h.set) return null
    const set = h.set, it = set.items.filter(i => i.id === el.dataset.id)[0]; if (!it) return null
    if (it.bin !== '*') return { id: it.id, bin: it.bin }
    const key = (__tk.level() || {}).id + ':' + set.items.map(i => i.id + i.n).join()
    if (!window.__qaPlan || window.__qaPlanKey !== key) {   // capacity set: solve the whole partition once per set (backtracking), then follow it
      window.__qaPlanKey = key
      const bins = set.bins.map(b => ({ id: b.id, left: b.cap })), items = set.items.slice().sort((a, b) => b.n - a.n), out = {}
      const go = i => { if (i === items.length) return true; for (const b of bins) if (b.left >= items[i].n) { b.left -= items[i].n; out[items[i].id] = b.id; if (go(i + 1)) return true; b.left += items[i].n } return false }
      go(0); window.__qaPlan = out
    }
    return { id: it.id, bin: window.__qaPlan[it.id] }
  })
  if (!plan || !plan.bin) { check(false, `${tag}: sort item has no target bin`); return false }
  await tapSel(p, `.tkq-tray .tkq-item[data-id="${plan.id}"]`); await sleep(200)
  await tapSel(p, `.tkq-bin[data-bin="${plan.bin}"]`); await sleep(550)
  return true
}
// plays ONE level (or one whole chapter: its steps come one after another) until the reward screen.
// onStep(lv) is called once per new step (chapters) so the caller can screenshot / check it.
async function playLevel (p, tag, onStep, hooks = {}) {
  const t0 = Date.now(); let lastStep = null, lanesArmed = null, subSeen = null
  while (Date.now() - t0 < 240000) {
    const st = await p.evaluate(() => ({ s: __tk.state(), lv: __tk.level(), skip: !!document.querySelector('.tks-skip'), chal: !!document.querySelector('.tkq-chal') }))
    if (st.s.screen === 'scr-reward') return true
    if (st.s.screen !== 'scr-play') { check(false, `${tag}: left the play screen mid-level (${st.s.screen})`); return false }
    if (st.lv && st.lv.chapter && st.lv.id !== lastStep) {
      lastStep = st.lv.id
      if (onStep) { const r = await onStep(st.lv); if (r === 'stop') return 'stopped' }
      continue
    }
    if (st.chal) { await answerChallenge(p, tag); continue }
    // TKFleet "Pilih Kapalmu" (steer / lanes outside the Titanic chapters, first time only): sail the recommended ship
    if (await p.evaluate(() => !!document.querySelector('.tkf-cta'))) { await tapSel(p, '.tkf-cta'); await sleep(700); continue }
    if (st.skip) { await tapSel(p, '.tks-skip'); await sleep(500); continue }
    if (!st.lv) { await sleep(300); continue }
    const type = st.lv.type
    if ((type === 'quiz' || type === 'sort') && subSeen !== st.lv.id) {
      // the plate subtitle belongs to THIS step: a quiz shows a quiz line for its domain (never another step's
      // mission, e.g. "Bantu pasien…" above a salam question); a sort shows its own goal
      const sub = await p.evaluate(() => { const e = document.querySelector('#play-host .tkq-top .tkq-plate p'); return e ? e.textContent : null })
      if (sub !== null) {
        subSeen = st.lv.id
        const ok = await p.evaluate((type, sub) => {
          const lv = __tk.level(), w = TKWorlds.get(lv.world), all = TKWorlds.flat(w), me = all.filter(l => l.id === lv.id)[0]
          const h = __tk.handle(); return type === 'quiz' ? __tk.quizSubs().includes(sub) : (!!me && sub === me.goal) || !!(h && h.set && h.set.topic === sub)
        }, type, sub)
        check(ok, `${tag} ${st.lv.id}: ${type} subtitle belongs to this step ("${sub}")`)
      }
    }
    if (type === 'quiz') { if (!(await playQuiz(p, tag))) return false; continue }
    if (type === 'sort') { if (!(await playSort(p, tag))) return false; continue }
    if (type === 'grid') {
      const ok = await p.evaluate(() => { const h = __tk.handle(); if (!h || !h.level || !h.setProgram) return null; if (h.__qaGo) return 'running'; const sol = TKGrid.solve(h.level); if (!sol) return false; h.setProgram(sol.program || sol); h.__qaGo = 1; return true })
      if (ok === null) { await sleep(300); continue }
      if (ok === false) { check(false, `${tag}: grid could not load a solution`); return false }
      if (ok === true) { await sleep(300); await tapSel(p, '.tkg-go') }
      await sleep(1500); continue
    }
    if (type === 'steer') {
      const drove = await p.evaluate(() => { const h = __tk.handle(); if (h && h.autopilot) { h.autopilot(true); return 'auto' } if (h && h.finish) { h.finish(); return 'finish' } return null })
      if (!drove) { await p.evaluate(() => __tk.finish(2)); pass++ }
      await sleep(1500); continue
    }
    if (type === 'lanes') {
      if (lanesArmed !== st.lv.id) { lanesArmed = st.lv.id; await sleep(300); await p.evaluate(AUTOPILOT, !!(hooks.hitFirst && hooks.hitFirst(st.lv))) }
      if (hooks.lanes) await hooks.lanes(st.lv)
      await sleep(250); continue
    }
    if (type === 'cinema') { if (hooks.cinema) { const r = await hooks.cinema(st.lv); if (r === 'stop') return 'stopped' } await sleep(250); continue }
    if (type === 'reflection' || type === 'fragment') { if (await tapSel(p, '.tkx-go')) await sleep(1500); else await sleep(300); continue }
    await sleep(400)
  }
  check(false, `${tag}: did not finish in 240 s (${JSON.stringify(await p.evaluate(() => [__tk.state(), __tk.level(), __tk.step()]))})`)
  return false
}

// the always-visible speaker (owner: "Pastiin ada icon sound bisa di tap utk mute"): on screen, >= 48 px, on top
async function fabOk (p, tag, seen) {
  const f = await p.evaluate(() => { const b = document.getElementById('sndfab'); if (!b) return null; const r = b.getBoundingClientRect(), cs = getComputedStyle(b)
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    return { w: r.width, h: r.height, vis: cs.display !== 'none' && cs.visibility !== 'hidden', inside: r.left >= 0 && r.right <= innerWidth && r.top >= 0, onTop: !!(top && (top === b || b.contains(top))) } })
  const ok = !!f && f.vis && f.w >= 48 && f.h >= 48 && f.inside && f.onTop
  const k = 'fab ' + tag.split(' ').slice(1).join(' ')
  if (!ok && !seen.has(k)) { seen.add(k); check(false, `${tag}: sound button visible, >= 48 px, tappable (${JSON.stringify(f)})`) } else if (ok) pass++
}
// rotation mid-chapter: the step keeps running, the host chrome re-lays out (nothing off screen / overlapping,
// sound button visible, no horizontal scroll), then the device turns back
async function rotate (p, tag, seen, w2, h2, w, h) {
  const before = await p.evaluate(() => __tk.step())
  for (const [a, b] of [[w2, h2], [w, h]]) {
    // keep isMobile as it was: changing it makes puppeteer RELOAD the page (a real device rotation does not)
    await p.setViewport({ width: a, height: b, isMobile: w < 900, hasTouch: true }); await sleep(900)
    const t = `${tag} rotated ${a}x${b}`
    const r = await p.evaluate(() => {
      const els = ['#btn-pause', '#lvchip', '#sndfab', '#journal', '#goalbar'].map(q => document.querySelector(q)).filter(e => e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width)
      const R = els.map(e => [e.id, e.getBoundingClientRect()]), ov = []
      for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) { const x = R[i][1], y = R[j][1]; if (x.left < y.right - 1 && y.left < x.right - 1 && x.top < y.bottom - 1 && y.top < x.bottom - 1) ov.push(R[i][0] + '/' + R[j][0]) }
      const off = R.filter(([, b]) => b.left < -1 || b.right > innerWidth + 1 || b.top < -1).map(([id]) => id)
      return { ov, off, step: __tk.step(), hs: document.scrollingElement.scrollWidth > innerWidth + 1 }
    })
    check(!r.ov.length && !r.off.length && !r.hs, `${t}: top-bar chrome does not overlap / leave the screen (${JSON.stringify(r)})`)
    check(r.step && before && r.step.id === before.id && r.step.i === before.i, `${t}: the step keeps running (${JSON.stringify(r.step)})`)
    await fabOk(p, t, seen); await layout(p, t, seen)
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/rotate-${tag.split(' ')[0]}-to-${a}x${b}.png` })
  }
}
// the parchment chapter map (mockup ui-12)
async function checkChapterMap (p, tag, expectNext) {
  await sleep(1900)
  const m = await p.evaluate(() => {
    const vw = innerWidth, ch = [...document.querySelectorAll('#route .chap')]
    const boxes = ch.map(c => { const md = c.querySelector('.md').getBoundingClientRect(), ct = c.querySelector('.ct').getBoundingClientRect(); return { md, ct, t: c.querySelector('.ct b').textContent, sub: (c.querySelector('.ct small') || {}).textContent || '', locked: c.classList.contains('locked'), lock: !!c.querySelector('.lk img'), next: c.classList.contains('next'), gray: getComputedStyle(c.querySelector('.md')).filter } })
    const ov = []
    const hit = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) for (const x of ['md', 'ct']) for (const y of ['md', 'ct']) if (hit(boxes[i][x], boxes[j][y])) ov.push(`${i + 1}.${x}/${j + 1}.${y}`)
    const ship = document.querySelector('.cm-ship'), sb = ship && ship.getBoundingClientRect()
    const nx = boxes.find(b => b.next)
    const shipOnNext = !!(sb && nx && hit(sb, nx.md))
    const off = boxes.filter(b => b.md.left < -1 || b.md.right > vw + 1 || b.ct.left < -1 || b.ct.right > vw + 1).map(b => b.t)
    const small = boxes.filter(b => b.md.width < 56).map(b => b.t + ' ' + Math.round(b.md.width))
    const texts = [...document.querySelectorAll('#route .chap .ct b, #route .chap .ct small, .cm-foot, .cm-plate small')].map(e => parseFloat(getComputedStyle(e).fontSize)).filter(f => f < 12)
    return { n: ch.length, boxes: boxes.map(b => ({ t: b.t, sub: b.sub, locked: b.locked, lock: b.lock, next: b.next, gray: b.gray })), ov, ship: !!ship, shipOnNext, off, small, tiny: texts.length,
      plate: (document.querySelector('.cm-plate b') || {}).textContent, foot: (document.querySelector('.cm-foot') || {}).textContent, hs: document.scrollingElement.scrollWidth > vw + 1 }
  })
  check(m.n === 10, `${tag}: 10 chapter medallions (${m.n})`)
  const want = ['1. Mimpi', '2. Berlayar', '3. Kehidupan di Kapal', '4. Laut Lepas', '5. Peringatan Es', '6. Tabrakan', '7. Evakuasi', '8. Sekoci', '9. Kapal Terbelah', '10. Penyelamatan']
  check(JSON.stringify(m.boxes.map(b => b.t)) === JSON.stringify(want), `${tag}: chapter titles in order (${m.boxes.map(b => b.t).join(' | ')})`)
  check(m.boxes.every(b => /^\(.+\)$/.test(b.sub)), `${tag}: every medallion has its (subtitle)`)
  check(m.boxes.every(b => !b.locked || (b.lock && /grayscale/.test(b.gray))), `${tag}: locked chapters are grey with a lock`)
  check(!m.ov.length, `${tag}: medallions / labels do not overlap (${m.ov.slice(0, 6).join(' ')})`)
  check(!m.off.length && !m.hs, `${tag}: chapter map fits the screen width (${m.off.join(', ')})`)
  check(!m.small.length, `${tag}: medallions >= 56 px (${m.small.join(', ')})`)
  check(!m.tiny, `${tag}: chapter map text >= 12 px`)
  check(m.ship && !m.shipOnNext, `${tag}: the small ship waits beside the current chapter (ship ${m.ship}, covers medallion ${m.shipOnNext})`)
  check(/Peta Bab/i.test(m.plate || '') && /Selesaikan tiap bab untuk membuka ilmu, lencana, dan kisah baru!/.test(m.foot || ''), `${tag}: title plate + footer line (${m.plate} / ${m.foot})`)
  if (expectNext != null) check(m.boxes.findIndex(b => b.next) === expectNext, `${tag}: chapter ${expectNext + 1} is the glowing next one (${m.boxes.findIndex(b => b.next) + 1})`)
  return m
}

// the per-world LEVEL MAP (every world without chapters): the chapter board in level mode.
// Save = levels 1-3 starred (Kamar: 1-2), so the next one is current and the rest are locked.
async function checkLevelMap (p, tag, wid, rotate) {
  await p.evaluate(id => {
    const all = {}; TKWorlds.WORLDS.forEach(x => { all[x.id] = {}; x.levels.forEach(l => { all[x.id][l.id] = 3 }) })
    const lv = TKWorlds.get(id).levels; all[id] = {}; lv.slice(0, id === 'kamar' ? 2 : 3).forEach(l => { all[id][l.id] = 2 })
    const g = __tk.save().guide
    __tk.load({ stars: all, fragments: [], guide: Object.assign({}, g, { map: 1 }) }); __tk.map(id)
  }, wid)
  await sleep(2100)
  const probe = () => p.evaluate(() => {
    const hit = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1
    const ch = [...document.querySelectorAll('#route .chap')], vw = innerWidth
    const bx = ch.map(c => ({ md: c.querySelector('.md').getBoundingClientRect(), ct: c.querySelector('.ct').getBoundingClientRect(), s: c.querySelector('.s').getBoundingClientRect() }))
    const ov = []
    for (let i = 0; i < bx.length; i++) for (let j = i + 1; j < bx.length; j++) for (const x of ['md', 'ct', 's']) for (const y of ['md', 'ct', 's']) if (hit(bx[i][x], bx[j][y])) ov.push(`${i + 1}.${x}/${j + 1}.${y}`)
    const cm = document.querySelector('#route .cmap'), cr = cm && cm.getBoundingClientRect(), tb = document.querySelector('#scr-map .topbar').getBoundingClientRect()
    const nx = document.querySelector('#route .chap.next'), ship = document.querySelector('#route .cm-ship')
    return {
      n: ch.length, lmode: !!(cm && cm.classList.contains('lmode')), still: !!(cm && cm.classList.contains('still')), ov,
      small: bx.map(b => Math.round(Math.min(b.md.width, b.md.height))).filter(w => w < 56),
      tap: ch.map(c => c.getBoundingClientRect()).filter(r => r.width < 56 || r.height < 56).length,
      font: Math.min(...ch.map(c => parseFloat(getComputedStyle(c.querySelector('.ct b')).fontSize))),
      star: Math.min(...ch.map(c => c.querySelector('.s .tk-ico').getBoundingClientRect().width)),
      off: bx.filter(b => b.md.left < -1 || b.md.right > vw + 1 || b.ct.left < -1 || b.ct.right > vw + 1).length,
      next: nx ? +nx.getAttribute('data-k') : -1, ring: !!(nx && nx.querySelector('.ring')), flag: (nx && nx.querySelector('.flag') || {}).textContent,
      ship: !!ship, shipOnNext: !!(ship && nx && hit(ship.getBoundingClientRect(), nx.querySelector('.md').getBoundingClientRect())),
      locked: ch.filter(c => c.classList.contains('locked')).map(c => /grayscale/.test(getComputedStyle(c.querySelector('.md')).filter) && !!c.querySelector('.lk')),
      chest: !!document.querySelector('#route .chap.chest'),
      plate: (document.querySelector('.cm-plate b') || {}).textContent, guide: !!document.querySelector('.cm-guide img'),
      fillW: cr ? cr.width / vw : 0, fillH: cr ? (Math.min(cr.bottom, innerHeight) - Math.max(cr.top, tb.bottom)) / (innerHeight - tb.bottom) : 0,
      pos: bx.map(b => Math.round(b.md.left) + ',' + Math.round(b.md.top)).join(' ')
    }
  })
  const m = await probe()
  const name = await p.evaluate(id => TKWorlds.get(id).name, wid)
  const nLv = await p.evaluate(id => TKWorlds.get(id).levels.length, wid)   // worlds grow (added levels): count from data
  check(m.lmode && m.n === nLv, `${tag}: level-mode board with every level (${m.n}/${nLv})`)
  check(!m.small.length && !m.tap, `${tag}: medallions + tap targets >= 56 px (${m.small.join(',')})`)
  check(!m.ov.length && !m.off, `${tag}: medallions / labels / stars do not overlap or leave the screen (${m.ov.slice(0, 5).join(' ')})`)
  check(m.font >= 14 && m.star >= 18, `${tag}: titles >= 14 px, stars >= 18 px (${m.font} / ${m.star})`)
  check(m.next === (wid === 'kamar' ? 2 : 3) && m.ring && m.flag === 'Main!', `${tag}: the first unplayed level is current: pulse ring + "Main!" flag (${m.next} ${m.ring} ${m.flag})`)
  check(wid === 'kamar' || (m.ship && !m.shipOnNext), `${tag}: the world's ship waits beside the current level`)
  check(m.locked.length >= 1 && m.locked.every(Boolean), `${tag}: locked levels are grey with a lock (${m.locked.join(',')})`)
  check(wid === 'kamar' || m.chest, `${tag}: the fragment level is a treasure chest`)
  check(m.plate === 'Peta ' + name && m.guide, `${tag}: "Peta ${name}" plate + guide bubble (${m.plate} / ${m.guide})`)
  check(m.fillW >= 0.85 && m.fillH >= 0.85, `${tag}: the board fills the frame (w ${m.fillW.toFixed(2)} h ${m.fillH.toFixed(2)})`)
  // a locked tap: gentle shake + the hint toast, no level starts
  await p.evaluate(() => { window.__shook = 0; const o = Element.prototype.animate; if (!o.__qa) { Element.prototype.animate = function (k, t) { if (this.classList && this.classList.contains('chap') && JSON.stringify(k).includes('translate')) window.__shook++; return o.call(this, k, t) }; Element.prototype.animate.__qa = true } })
  await tapSel(p, '#route .chap.locked .md'); await sleep(250)
  const lk = await p.evaluate(() => ({ shook: window.__shook, toast: document.getElementById('toast').textContent, s: __tk.state().screen }))
  check(lk.shook >= 1 && /Selesaikan level sebelumnya dulu/.test(lk.toast) && lk.s === 'scr-map', `${tag}: a locked tap shakes + says "Selesaikan level sebelumnya dulu" (${JSON.stringify(lk)})`)
  if (rotate) {   // rotation: the board re-lays out (debounced) without sailing the ship again
    const vp = p.viewport()
    await p.setViewport(Object.assign({}, vp, { width: vp.height, height: vp.width })); await sleep(700)
    const r = await probe()
    check(r.still && r.pos !== m.pos && !r.ov.length && !r.off && !r.small.length && r.next === m.next, `${tag}: rotation re-lays out the map without replaying the ship (still ${r.still}, overlap ${r.ov.length})`)
    await p.setViewport(vp); await sleep(700)
  }
  return m
}

// the step types of every Titanic chapter, straight from the data (chapters change: never hardcode them)
const SEQ = await (async () => { const { createRequire } = await import('node:module')
  const T = createRequire(import.meta.url)('../games/data/tk-worlds.js').get('titanic'), o = {}
  T.levels.forEach(c => { o[c.id] = (c.steps || []).map(st => st.type) }); return o })()

// every quiz goal is a line about the questions, never a place / year / ship history (it steers question
// picking and shows in the goal bar; owner photo: "Bantu pasien…" above a salam question)
{
  const { createRequire } = await import('node:module')
  const W = createRequire(import.meta.url)('../games/data/tk-worlds.js')
  const N = /Titanic|Britannic|Vasa|Cutty|Victory|Mayflower|Endurance|Kon-Tiki|Calypso|Queen Mary|Arizona|Missouri|Nautilus|HMS|USS|RMS|Southampton|New York|Stockholm|\b1[5-9]\d\d\b|sejarah/i
  const bad = []
  for (const w of W.WORLDS) for (const l of W.flat(w)) if (l.type === 'quiz' && N.test(l.goal || '')) bad.push(`${l.id}: ${l.goal}`)
  check(!bad.length, `quiz goals name no place, year or ship history (${bad.join(' | ')})`)
}
let sizeNo = 0
for (const [w, h] of SIZES) {
  const first = sizeNo++ === 0
  const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] })
  const p = await b.newPage(); const errs = []; const seen = new Set(); const tag0 = `${w}x${h}`
  p.on('pageerror', e => errs.push('pageerror ' + e.message))
  p.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url().split('/').pop()) })
  p.on('requestfailed', r => errs.push('failed ' + r.url().split('/').pop()))
  await p.setViewport({ width: w, height: h, isMobile: w < 900, hasTouch: true })
  await p.goto(URL, { waitUntil: 'networkidle2' })
  await p.evaluate(() => { __tk.reset(); __tk.fast(true); window.__bad = []; new MutationObserver(() => { const t = document.body.innerText; if (/gagal|kalah|game over/i.test(t)) window.__bad.push(t.slice(0, 120)) }).observe(document.body, { subtree: true, childList: true, characterData: true }) })
  await layout(p, tag0 + ' home', seen)
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/${tag0}-home.png` })
  check(await p.evaluate(() => !!document.querySelector('.tk-hand')), `${tag0}: first-visit pointing hand on Home`)
  await tapSel(p, '#btn-start'); await sleep(2300)
  const s1 = await p.evaluate(() => ({ s: __tk.state(), lv: __tk.level(), hand: !!document.querySelector('.tk-hand'), guide: __tk.save().guide }))
  check(s1.s.screen === 'scr-play' && s1.lv && s1.lv.world === 'kamar', `${tag0}: Start goes straight into the first level (${JSON.stringify(s1.s)})`)
  check(!s1.hand && s1.guide && s1.guide.home, `${tag0}: pointing hand dismissed + remembered`)
  if (s1.lv && s1.lv.type === 'story') {
    const i0 = await p.evaluate(() => __tk.handle().index())
    const pt = await p.evaluate(() => { const r = document.querySelector('.tks-stage').getBoundingClientRect(); return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.3 } })
    await p.touchscreen.tap(pt.x, pt.y); await sleep(500)
    check(await p.evaluate(() => __tk.handle().index()) === i0 + 1, `${tag0}: tapping the story scene advances the panel`)
  }
  let played = 0
  // ── the bedroom tutorial, level by level ──
  {
    const n = await p.evaluate(() => TKWorlds.get('kamar').levels.length)
    for (let k = 0; k < n; k++) {
      const tag = `${tag0} kamar#${k + 1}`
      await p.evaluate(k => { window.__qaPlan = null; __tk.start('kamar', k) }, k)
      await sleep(700)
      const ok = await playLevel(p, tag)
      check(ok === true, `${tag}: reaches the reward screen`)
      if (ok === true) played++
      if (ok === true && played === 1) {
        await sleep(1400)
        check(await p.evaluate(() => { const a = document.activeElement; return !!(a && a.getAttribute('data-act') === 'next' && a.getBoundingClientRect().height >= 56) }), `${tag}: reward "Lanjut" is the big focused default`)
      }
    }
  }
  // ── Titanic: the chapter map, then all 10 chapters in one continuous flow ──
  await p.evaluate(() => { __tk.map('titanic') })
  await checkChapterMap(p, `${tag0} chapter map (new)`, 0)
  await fabOk(p, `${tag0} chapter map`, seen)
  {   // one tap = every G30 sound off (setting, TKHub, SFX), a second tap = on again; narration is opt-in (off)
    const narr = await p.evaluate(() => ({ narrate: __tk.save().settings.narrate, said: TKHub.say('tes') }))
    check(narr.narrate === false && narr.said === false, `${tag0}: narration is off by default and say() is silent (${JSON.stringify(narr)})`)
    await tapSel(p, '#sndfab'); await sleep(250)
    const off = await p.evaluate(() => ({ s: __tk.save().settings.sound, hub: TKHub._cfg.sound, cls: document.getElementById('sndfab').classList.contains('off'), pressed: document.getElementById('sndfab').getAttribute('aria-pressed') }))
    check(off.s === false && off.hub === false && off.cls && off.pressed === 'false', `${tag0}: sound button mutes everything (${JSON.stringify(off)})`)
    await tapSel(p, '#sndfab'); await sleep(250)
    const on = await p.evaluate(() => ({ s: __tk.save().settings.sound, hub: TKHub._cfg.sound, cls: document.getElementById('sndfab').classList.contains('off') }))
    check(on.s === true && on.hub === true && !on.cls, `${tag0}: a second tap turns sound back on (${JSON.stringify(on)})`)
  }
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/${tag0}-map-0.png` })
  check(await tapSel(p, '#route .chap.next .md'), `${tag0}: tap the glowing chapter 1 medallion`)
  await sleep(800)
  let chapterNo = 1, continuous = true
  while (chapterNo <= 10) {
    const cid = 'c' + chapterNo, tag = `${tag0} ${cid}`
    const types = []
    const onStep = async lv => {
      await sleep(lv.type === 'cinema' ? 1500 : 650)
      types.push(lv.type)
      // step progress sits in the chrome (top-bar chip / chapter card / story plate / lanes objective), no floating chip
      const chip = await p.evaluate(() => ({ t: ['#lvchip', '#chapter .stepl', '.tks-plate', '.tkl-obj'].map(q => (document.querySelector(q) || {}).textContent || '').join(' | '), floating: !!document.getElementById('stepchip') }))
      check(lv.chapter === cid, `${tag}: step belongs to ${cid} (${lv.chapter})`)
      check(!chip.floating && new RegExp('Langkah ' + (lv.step + 1) + '/' + lv.steps).test(chip.t), `${tag} step ${lv.step + 1}: "Langkah ${lv.step + 1}/${lv.steps}" in the chrome, no floating chip (${chip.t})`)
      const prog = await p.evaluate(() => __tk.progress())
      if (lv.step > 0) check(((prog.progress.titanic || {})[cid] | 0) === lv.step, `${tag} step ${lv.step + 1}: checkpoint saved after the previous step (${JSON.stringify(prog.progress.titanic)})`)
      if (lv.type === 'cinema') check(!!Object.keys(prog.cine).find(k => k.indexOf('titanic/' + cid + '/') === 0), `${tag}: cinema checkpoint saved at its start (${JSON.stringify(prog.cine)})`)
      await layout(p, `${tag} step ${lv.step + 1} (${lv.type})`, seen)
      await fabOk(p, `${tag} step ${lv.step + 1} (${lv.type})`, seen)
      if (SHOTS) await p.screenshot({ path: `${SHOTS}/${tag0}-${cid}-${lv.step + 1}-${lv.type}.png` })
      if ((w === 390 && cid === 'c3' && lv.step === 1) || (w === 1280 && cid === 'c5' && lv.step === 1)) await rotate(p, `${tag0} ${cid}`, seen, h, w, w, h)
      // resume (first size): chapter 4 is left after its first step from the pause menu, then continued from the map
      if (first && cid === 'c4' && lv.step === 1 && !globalThis.__resumed4) {
        globalThis.__resumed4 = true
        await tapSel(p, '#btn-pause'); await sleep(400); await tapSel(p, '#p-map'); await sleep(1200)
        const pr = await p.evaluate(() => ({ s: __tk.state().screen, pr: (document.querySelector('#route .chap.next .pr') || {}).textContent, prog: __tk.progress().progress.titanic }))
        check(pr.s === 'scr-map' && pr.pr === '1/' + SEQ.c4.length && pr.prog.c4 === 1, `${tag}: leaving mid-chapter keeps the checkpoint, the medallion shows 1/${SEQ.c4.length} (${JSON.stringify(pr)})`)
        await tapSel(p, '#route .chap.next .md'); await sleep(900)
        const st = await p.evaluate(() => __tk.step())
        check(st && st.chapter === 'c4' && st.i === 1, `${tag}: tapping it again resumes at step 2 (${JSON.stringify(st)})`)
        return
      }
    }
    const hooks = {
      hitFirst: lv => first && lv.id === 'c5b',
      lanes: async lv => {
        const s = await p.evaluate(() => { const h = __tk.handle(); return h && h.state ? h.state() : null })
        if (!s) return
        if (lv.id === 'c4c' && first && !globalThis.__lanesPause && s.phase === 'player' && s.t > 1.2) {
          globalThis.__lanesPause = true
          await tapSel(p, '.tkl-pausebtn'); await sleep(400)
          const ps = await p.evaluate(() => ({ ov: document.getElementById('pause').classList.contains('show'), paused: __tk.handle().state().paused, own: !!document.querySelector('.tkl-pause.is-on'), hud: getComputedStyle(document.querySelector('.play-hud')).display }))
          check(ps.ov && ps.paused && !ps.own && ps.hud === 'none', `${tag}: lanes pause button opens our pause menu, lanes paused, no second overlay, our HUD hidden (${JSON.stringify(ps)})`)
          await tapSel(p, '#p-resume'); await sleep(300)
          check(!(await p.evaluate(() => __tk.handle().state().paused)), `${tag}: "Lanjut Main" resumes the ship`)
        }
        if (lv.id === 'c5b' && first && s.collisions >= 1 && !globalThis.__hitChecked) {
          globalThis.__hitChecked = true
          check(true, `${tag}: collision in chapter 5 (${s.collisions})`)
          globalThis.__hitD = s.d
        }
        // host wiring (embedded questions): the bump went through opts.onQuestion -> the real TKQuiz.challenge
        // (answered by the play loop), then the ship sails on
        if (lv.id === 'c5b' && first && globalThis.__hitD != null && !globalThis.__hitOn && !s.waiting && s.q && s.q.asked >= 1 && s.d > globalThis.__hitD + 40) {
          globalThis.__hitOn = true
          check(s.q.n.collide >= 1 && s.running, `${tag}: chapter 5 bump opened the real Knowledge Challenge via onQuestion and the ship sailed on (${JSON.stringify(s.q.n)})`)
        }
      },
      cinema: async lv => {
        const sc = await p.evaluate(() => { const h = __tk.handle(); return h && h.scene ? h.scene() : null })
        // cinema checkpoint (first size): chapter 9 is left during "descent", then resumed from the map there
        if (first && lv.id === 'c9a' && sc && sc.id === 'descent' && !globalThis.__cine9) {
          globalThis.__cine9 = true
          const ck = await p.evaluate(() => __tk.progress().cine['titanic/c9/c9a'])
          check(ck === 'descent', `${tag}: cinema scene checkpoint = descent (${ck})`)
          await tapSel(p, '#btn-pause'); await sleep(400); await tapSel(p, '#p-map'); await sleep(1200)
          await tapSel(p, '#route .chap.next .md'); await sleep(1600)
          const sc2 = await p.evaluate(() => { const h = __tk.handle(); return h && h.scene ? h.scene() : null })
          check(sc2 && sc2.id === 'descent', `${tag}: re-entering chapter 9 resumes the film at "descent" (${sc2 && sc2.id})`)
        }
      }
    }
    const ok = await playLevel(p, tag, onStep, hooks)
    check(ok === true, `${tag}: chapter reaches the reward screen`)
    if (ok !== true) { continuous = false; break }
    check(JSON.stringify(types) === JSON.stringify(SEQ[cid]), `${tag}: steps played in order ${JSON.stringify(types)} (want ${JSON.stringify(SEQ[cid])})`)
    if (first && cid === 'c5') check(!!globalThis.__hitChecked, `${tag}: the chapter-5 run had a collision + Knowledge Challenge`)
    played++
    await sleep(1500)
    await layout(p, tag + ' reward', seen)
    await fabOk(p, tag + ' reward', seen)
    if (SHOTS && (chapterNo === 1 || chapterNo === 6 || chapterNo === 10)) await p.screenshot({ path: `${SHOTS}/${tag0}-${cid}-reward.png` })
    const rw = await p.evaluate(() => { const b = document.querySelector('.tkh-primary'); return { label: b && b.textContent, h: b ? b.getBoundingClientRect().height : 0, stars: __tk.save().stars.titanic, prog: __tk.progress().progress.titanic } })
    check(rw.stars[cid] >= 1 && !(rw.prog || {})[cid], `${tag}: stars saved, checkpoint cleared (${JSON.stringify(rw.stars[cid])} / ${JSON.stringify(rw.prog)})`)
    check(rw.h >= 56, `${tag}: reward main button >= 56 px (${rw.h})`)
    if (chapterNo < 10) {
      check(/Bab Berikutnya/.test(rw.label || ''), `${tag}: reward leads to the next chapter (${rw.label})`)
      if (chapterNo === 3) {   // the map between chapters: 3 done -> chapter 4 glows, ship beside it
        await tapSel(p, '.tkh-acts [data-act="map"]'); await sleep(300)
        await checkChapterMap(p, `${tag0} chapter map (after c3)`, 3)
        if (SHOTS) await p.screenshot({ path: `${SHOTS}/${tag0}-map-3.png` })
        await tapSel(p, '#route .chap.next .md'); await sleep(800)
      } else { await tapSel(p, '.tkh-primary'); await sleep(900) }
      const nx = await p.evaluate(() => __tk.step())
      check(nx && nx.chapter === 'c' + (chapterNo + 1) && nx.i === 0, `${tag}: next chapter starts at its step 1 (${JSON.stringify(nx)})`)
    } else {
      check(/Kembali ke Kamar Timmy/.test(rw.label || ''), `${tag}: chapter 10 ends with "Kembali ke Kamar Timmy" (${rw.label})`)
      await tapSel(p, '.tkh-primary'); await sleep(1400)
      const room = await p.evaluate(() => ({ s: __tk.state().screen, rib: (document.querySelector('#scr-room .tkh-det .rib') || {}).textContent, own: (document.querySelector('#scr-room .tkh-det .tags .t3') || {}).textContent, img: !!document.querySelector('#scr-room .tkh-det .hero img') }))
      check(room.s === 'scr-room' && room.rib === 'RMS Titanic' && room.own === 'Dimiliki' && room.img, `${tag}: Kamar Timmy shows the new Titanic model (${JSON.stringify(room)})`)
      await fabOk(p, `${tag0} room`, seen)
      if (SHOTS) await p.screenshot({ path: `${SHOTS}/${tag0}-room-titanic.png` })
    }
    chapterNo++
  }
  check(continuous, `${tag0}: the Titanic journey played start to end`)
  const sv = await p.evaluate(() => __tk.save())
  check(sv.fragments.includes('titanic'), `${tag0}: Titanic fragment collected`)
  check(Object.keys(sv.stars.titanic || {}).length === 10, `${tag0}: 10 chapters starred (${Object.keys(sv.stars.titanic || {}).join(',')})`)
  // replay: a finished chapter starts again at step 1
  await p.evaluate(() => { __tk.map('titanic') })
  await checkChapterMap(p, `${tag0} chapter map (all done)`, -1)
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/${tag0}-map-done.png` })
  await tapSel(p, '#route .chap[data-k="6"] .md'); await sleep(900)
  const rp = await p.evaluate(() => __tk.step())
  check(rp && rp.chapter === 'c7' && rp.i === 0, `${tag0}: replaying a finished chapter starts at step 1 (${JSON.stringify(rp)})`)
  await tapSel(p, '#btn-pause'); await sleep(300); await tapSel(p, '#p-home'); await sleep(500)

  // ── save migration (old t1..t13 stars) ──
  if (first) {
    const mg = await p.evaluate(() => {
      const all = __tk.load({ stars: { kamar: { k1: 3, k2: 3, k3: 3, k4: 3 }, titanic: { t1: 3, t2: 3, t3: 2, t4: 3, t5: 3, t6: 3, t7: 3, t8: 3, t9: 3, t10: 3, t11: 3, t12: 3, t13: 3 } }, fragments: ['titanic'], last: { w: 'titanic', k: 9 } })
      const part = __tk.load({ stars: { kamar: { k1: 3 }, titanic: { t1: 3, t2: 2, t3: 3, t4: 3, t5: 3, t6: 1, t7: 3, t8: 3 } }, last: { w: 'titanic', k: 8 } })
      const next = __tk.next()
      return { all: all.stars.titanic, allFrag: all.fragments, allLast: all.last, part: part.stars.titanic, legacy: part.legacy.titanic, next }
    })
    check(Object.keys(mg.all).sort().join() === 'c1,c10,c2,c3,c4,c5,c6,c7,c8,c9' && mg.all.c4 === 2 && mg.allFrag.includes('titanic') && mg.allLast.k === 6, `migration: all 13 old levels -> 10 chapters, lowest stars, fragment kept, last level mapped (${JSON.stringify(mg.all)} ${JSON.stringify(mg.allLast)})`)
    check(JSON.stringify(mg.part) === JSON.stringify({ c2: 3, c3: 2, c4: 1, c5: 3, c1: 3 }) && mg.legacy.t8 === 3 && mg.next && mg.next.world === 'titanic' && mg.next.k === 5, `migration: t1..t8 -> c1..c5 done, t8 alone does not finish c6 (needs t9), old stars kept in legacy, next = chapter 6 (${JSON.stringify(mg.part)} next ${JSON.stringify(mg.next)})`)
    await p.evaluate(() => { __tk.reset(); __tk.unlockAll(); __tk.fast(true) })
  } else await p.evaluate(() => { __tk.unlockAll() })

  // ── the other ship worlds, level by level (unchanged) ──
  const others = (process.env.QA_WORLDS ? process.env.QA_WORLDS.split(',') : await p.evaluate(() => TKWorlds.WORLDS.map(w => w.id))).filter(x => x !== 'kamar' && x !== 'titanic')
  // worlds now have up to 9 levels: PLAY a sample of 4 worlds level by level (one per engine mix + a legend world);
  // every world still gets the level-map checks. QA_FULL=1 (or QA_WORLDS=…) plays every listed world.
  const SAMPLE = ['britannic', 'endurance', 'pelabuhan', 'carpathia']
  const playList = process.env.QA_FULL || process.env.QA_WORLDS ? others : others.filter(x => SAMPLE.includes(x))
  // ── the level map of every world without chapters (every size) ──
  {
    const saved = await p.evaluate(() => JSON.parse(JSON.stringify(__tk.save())))
    for (const wid of ['kamar'].concat(others)) {
      await checkLevelMap(p, `${tag0} ${wid} level map`, wid, wid === 'vasa')
      if (SHOTS && ['vasa', 'cuttysark', 'nautilus'].includes(wid)) await p.screenshot({ path: `${SHOTS}/${tag0}-levelmap-${wid}.png` })
    }
    await p.evaluate(s => { __tk.load(s); __tk.unlockAll() }, saved)
  }
  if (first || process.env.QA_OTHERS === 'all') for (const wid of playList) {
    const n = await p.evaluate(id => TKWorlds.get(id).levels.length, wid)
    await p.evaluate(id => __tk.map(id), wid); await sleep(700)
    check(await p.evaluate(() => !!document.querySelector('#route .cmap.lmode .chap') && !document.querySelector('#route .node')), `${tag0} ${wid}: level map in level mode`)
    for (let k = 0; k < n; k++) {
      const tag = `${tag0} ${wid}#${k + 1}`
      await p.evaluate((id, k) => { window.__qaPlan = null; __tk.start(id, k) }, wid, k)
      await sleep(700)
      const type = await p.evaluate(() => __tk.level() && __tk.level().type)
      await layout(p, `${tag} (${type})`, seen)
      const ok = await playLevel(p, tag)
      check(ok === true, `${tag}: reaches the reward screen`)
      if (ok === true) played++
    }
  }
  const bad = await p.evaluate(() => window.__bad)
  check(!bad.length, `${tag0}: no failure words on screen (${bad.slice(0, 2).join(' | ')})`)
  check(errs.length === 0, `${tag0}: no page errors / failed requests (${errs.slice(0, 5).join(' | ')})`)
  console.log(`  ${tag0}: ${played} levels/chapters played, xp ${sv.xp}`)
  await b.close()
}
console.log(`\n${pass} passed, ${fails.length} failed`)
process.exit(fails.length ? 1 : 0)
