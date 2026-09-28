// TEMP audit script (delete after use): screenshots every G30 screen + DOM metrics.
import puppeteer from 'puppeteer'
import fs from 'fs'
const URL = 'http://localhost:8081/games/timmy-kapal.html'
const OUT = process.env.OUT
const SIZES = (process.env.SIZES || '390x844,844x390,1280x800').split(',').map(s => s.split('x').map(Number))
const sleep = ms => new Promise(r => setTimeout(r, ms))
const report = {}

async function metrics (p) {
  return p.evaluate(() => {
    const vw = innerWidth, vh = innerHeight, out = { small: [], tiny: [], clip: [], off: [], svg: [], glyph: [], overlap: [] }
    const vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw }
    const lbl = e => ((e.id ? '#' + e.id : '') + '.' + String(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className).split(' ').slice(0, 2).join('.') + ' "' + (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 24) + '"')
    document.querySelectorAll('button,[role=button],.tkg-chip,.tkq-item,.tkq-bin,a,.tog').forEach(b => {
      if (!vis(b)) return
      const r = b.getBoundingClientRect()
      if (Math.min(r.width, r.height) < 44) out.small.push(Math.round(r.width) + 'x' + Math.round(r.height) + ' ' + lbl(b))
      if (r.right > vw + 1 || r.left < -1 || r.bottom > vh + 1 || r.top < -1) out.off.push(lbl(b) + ' ' + [r.left, r.top, r.right, r.bottom].map(Math.round))
    })
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    let n; const seen = new Set()
    while ((n = walker.nextNode())) {
      const t = n.textContent.trim(); if (!t) continue
      const e = n.parentElement; if (!e || seen.has(e) || !vis(e)) continue
      seen.add(e)
      const cs = getComputedStyle(e), fs = parseFloat(cs.fontSize)
      if (fs < 12) out.tiny.push(fs + 'px ' + lbl(e))
      if ((e.scrollWidth > e.clientWidth + 2 && (cs.overflow === 'hidden' || cs.textOverflow === 'ellipsis' || cs.overflowX === 'hidden')) || (e.scrollHeight > e.clientHeight + 2 && cs.overflowY === 'hidden' && e.clientHeight > 0)) out.clip.push(lbl(e))
      const g = t.match(/[^\p{L}\p{N}\s.,!?:;'"()\-–—/%&…“”‘’+=×÷<>]/gu)
      if (g) out.glyph.push(g.join('') + ' in ' + lbl(e))
      const r = e.getBoundingClientRect()
      if (r.right > vw + 1 || r.left < -1) out.off.push('text ' + lbl(e))
    }
    document.querySelectorAll('img').forEach(i => { if (vis(i) && (i.src.startsWith('data:image/svg') || i.naturalWidth === 0)) out.svg.push((i.naturalWidth === 0 ? 'BROKEN ' : 'drawn-svg ') + lbl(i.parentElement) + ' ' + i.src.slice(0, 60)) })
    document.querySelectorAll('*').forEach(e => { const bg = getComputedStyle(e).backgroundImage; if (bg && bg.includes('data:image/svg') && vis(e) && e.getBoundingClientRect().width > 80) out.svg.push('drawn-bg ' + lbl(e)) })
    for (const k in out) out[k] = [...new Set(out[k])].slice(0, 25)
    return out
  })
}
async function shot (p, tag, name) {
  const f = `${OUT}/${tag}-${name}.png`
  await p.screenshot({ path: f })
  report[`${tag}-${name}`] = await metrics(p)
}
async function tapSel (p, sel) {
  const r = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; try { e.scrollIntoView({ block: 'nearest', inline: 'nearest' }) } catch (x) {} const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 } }, sel)
  if (!r) return false
  await p.touchscreen.tap(r.x, r.y); return true
}
async function waitType (p, t, ms = 8000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) { const s = await p.evaluate(() => !!document.querySelector('.tks-skip')); if (!s) return; await tapSel(p, '.tks-skip'); await sleep(600) }
}

for (const [w, h] of SIZES) {
  const tag = `${w}x${h}`
  const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] })
  const p = await b.newPage(); const errs = []
  p.on('pageerror', e => errs.push('pageerror ' + e.message))
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push('console ' + m.text().slice(0, 160)) })
  p.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()) })
  await p.setViewport({ width: w, height: h, isMobile: w < 900, hasTouch: true })
  await p.goto(URL, { waitUntil: 'networkidle2' })
  await p.evaluate(() => __tk.reset()); await sleep(1200)
  await shot(p, tag, '01-home')
  // opening story via the real Start button
  await tapSel(p, '#btn-start'); await sleep(1400)
  for (let i = 0; i < 6; i++) { await shot(p, tag, `02-intro-${i + 1}`); await tapSel(p, '.tks-next'); await sleep(1100) }
  await sleep(800)
  await shot(p, tag, '03-kamar-k2-grid')
  // world map via start again (seenIntro now true)
  await p.evaluate(() => { document.getElementById('p-home').click() }); await sleep(600)
  await p.evaluate(() => __tk.unlockAll()); await p.evaluate(() => { document.getElementById('p-home').click() }); await sleep(600)
  await tapSel(p, '#btn-start'); await sleep(1500)
  await shot(p, tag, '04-worldmap')
  await p.evaluate(() => document.querySelector('.islands').scrollTo(0, 99999)); await sleep(500)
  await shot(p, tag, '04b-worldmap-bottom')
  await tapSel(p, '.scr.active [data-back]'); await sleep(600)
  await tapSel(p, '#btn-ships'); await sleep(1200)
  await shot(p, tag, '05-ships')
  await tapSel(p, '.shipcard[data-w="vasa"]'); await sleep(700)
  await shot(p, tag, '05b-ships-detail-vasa')
  await p.evaluate(() => { const d = document.getElementById('ship-detail'); d.scrollIntoView() }); await sleep(400)
  await shot(p, tag, '05c-ships-detail-scrolled')
  await p.evaluate(() => __tk.open('titanic')); await sleep(1400)
  await shot(p, tag, '06-levelmap-titanic')
  await tapSel(p, '#btn-story'); await sleep(600)
  await shot(p, tag, '06b-historycards')
  await p.evaluate(() => { const x = document.getElementById('cards-x'); x && x.click() })
  const levels = [['titanic', 0, 'story-pre'], ['titanic', 1, 'quiz'], ['titanic', 2, 'steer-gates'], ['titanic', 3, 'grid'], ['titanic', 6, 'steer-ice'], ['titanic', 7, 'steer-scripted'], ['titanic', 10, 'sort'], ['titanic', 11, 'cutscene'],
    ['cuttysark', 3, 'steer-sail'], ['kontiki', 3, 'steer-current'], ['kontiki', 2, 'grid-current'], ['endurance', 2, 'grid-ice'], ['britannic', 2, 'grid-crate'], ['vasa', 3, 'sort-balance'], ['arizona', 3, 'sort-flags'], ['kamar', 3, 'quiz-logic'], ['titanic', 4, 'quiz-arab']]
  for (const [wid, k, nm] of levels) {
    await p.evaluate((id, k) => __tk.start(id, k), wid, k); await sleep(1300)
    if (nm === 'story-pre' || nm === 'cutscene') { await shot(p, tag, `07-${wid}${k + 1}-${nm}`); await waitType(p); await sleep(900); if (nm === 'cutscene') { await shot(p, tag, `07-${wid}${k + 1}-${nm}-reward`); continue } }
    else await waitType(p)
    await sleep(700)
    await shot(p, tag, `07-${wid}${k + 1}-${nm}`)
    await sleep(3200)
    await shot(p, tag, `07-${wid}${k + 1}-${nm}-t4s`)
    if (nm.startsWith('grid') && w !== 844) {
      const okp = await p.evaluate(() => { const h = __tk.handle(); if (!h || !h.level) return false; const sol = TKGrid.solve(h.level); h.setProgram(sol.program || sol); return true }); if (!okp) { report[tag + '-' + wid + k + '-nohandle'] = 1; continue } await sleep(300)
      await shot(p, tag, `07-${wid}${k + 1}-${nm}-prog`)
      await tapSel(p, '.tkg-go')
      for (const t of [250, 350, 400]) { await sleep(t); await shot(p, tag, `07-${wid}${k + 1}-${nm}-run${t}`) }
      await sleep(4000); await shot(p, tag, `07-${wid}${k + 1}-${nm}-after`)
    }
    if (nm.startsWith('quiz')) {
      const q = await p.evaluate(() => { const h = __tk.handle(); return h && h.state ? h.state() : null })
      if (q && q.answer != null) {
        const wrong = await p.evaluate(a => { const b = [...document.querySelectorAll('.tkq-ans [data-c]')].find(x => x.dataset.c !== String(a)); return b ? b.dataset.c : null }, q.answer)
        if (wrong) { await tapSel(p, `.tkq-ans [data-c="${wrong}"]`); await sleep(500); await shot(p, tag, `07-${wid}${k + 1}-${nm}-wrong`) }
        await tapSel(p, `.tkq-ans [data-c="${String(q.answer).replace(/"/g, '\\"')}"]`); await sleep(450); await shot(p, tag, `07-${wid}${k + 1}-${nm}-right`)
      }
    }
    if (nm === 'sort' || nm.startsWith('sort')) {
      await tapSel(p, '.tkq-tray .tkq-item'); await sleep(300); await shot(p, tag, `07-${wid}${k + 1}-${nm}-picked`)
    }
    if (nm.startsWith('steer') && nm !== 'steer-scripted') {
      // hold right for 1.2 s via the on-screen buttons if present
      await p.keyboard.down('ArrowRight'); await sleep(900); await shot(p, tag, `07-${wid}${k + 1}-${nm}-turn`); await p.keyboard.up('ArrowRight')
    }
    if (nm === 'steer-scripted') { await sleep(9000); await shot(p, tag, `07-${wid}${k + 1}-${nm}-t13s`); await sleep(9000); await shot(p, tag, `07-${wid}${k + 1}-${nm}-t22s`) }
    // pause overlay
    if (nm === 'grid' || nm === 'steer-gates' || nm === 'quiz') { await tapSel(p, '#btn-pause'); await sleep(500); await shot(p, tag, `08-pause-${nm}`); await p.evaluate(() => document.getElementById('p-resume').click()); await sleep(300) }
  }
  // reward frames
  await p.evaluate(() => __tk.start('titanic', 12)); await sleep(1000); await waitType(p); await sleep(600)
  await p.evaluate(() => __tk.finish(3))
  for (const t of [120, 300, 600, 1400]) { await sleep(t); await shot(p, tag, `09-reward-frag-${t}`) }
  await p.evaluate(() => __tk.start('vasa', 2)); await sleep(800); await p.evaluate(() => __tk.finish(2)); await sleep(1600)
  await shot(p, tag, '09b-reward-2star')
  // room tabs
  await p.evaluate(() => { document.querySelectorAll('.scr').forEach(s => s.classList.remove('active')) })
  await p.goto(URL, { waitUntil: 'networkidle2' }); await sleep(800)
  await tapSel(p, '#btn-room'); await sleep(800)
  for (const t of ['kapal', 'kompas', 'kartu', 'capaian', 'belajar']) { await tapSel(p, `#room-tabs [data-t="${t}"]`); await sleep(600); await shot(p, tag, `10-room-${t}`) }
  await tapSel(p, '.scr.active [data-back]'); await sleep(500)
  await tapSel(p, '#btn-settings'); await sleep(800)
  await shot(p, tag, '11-settings')
  await p.evaluate(() => document.getElementById('settings').scrollTo(0, 9999)); await sleep(300)
  await shot(p, tag, '11b-settings-bottom')
  await tapSel(p, '#set-parent'); await sleep(600)
  await shot(p, tag, '12-parentgate')
  const hb = await p.evaluate(() => { const b = document.getElementById('hold').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 } })
  await p.mouse.move(hb.x, hb.y); await p.mouse.down(); await sleep(1500); await shot(p, tag, '12b-parentgate-holding'); await sleep(1800); await p.mouse.up(); await sleep(400)
  await shot(p, tag, '12c-parentpanel')
  // practice from home category
  await p.goto(URL, { waitUntil: 'networkidle2' }); await sleep(800)
  await shot(p, tag, '13-home-progress')
  const cat = await tapSel(p, '.cat[data-d="arab"]'); await sleep(1500)
  if (cat) await shot(p, tag, '13b-practice-arab')
  report[tag + '-errors'] = errs
  await b.close()
}
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1))
console.log('done')
