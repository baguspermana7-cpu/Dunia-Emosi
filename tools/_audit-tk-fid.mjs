// TEMP audit script (delete after use): one live screenshot per owner mockup screen, landscape + portrait.
import puppeteer from 'puppeteer'
const URL = 'http://localhost:8081/games/timmy-kapal.html'
const OUT = process.env.OUT
const sleep = ms => new Promise(r => setTimeout(r, ms))
async function tapSel (p, sel) {
  const r = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; try { e.scrollIntoView({ block: 'nearest', inline: 'nearest' }) } catch (x) {} const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 } }, sel)
  if (!r) return false
  await p.touchscreen.tap(r.x, r.y); return true
}
async function skipStory (p) { for (let i = 0; i < 6; i++) { if (!(await p.evaluate(() => !!document.querySelector('.tks-skip')))) return; await tapSel(p, '.tks-skip'); await sleep(600) } }
async function seed (p) {
  // progress like the mockups: Titanic 1..10 done with mixed stars, XP level 1 · 120/300 region
  await p.evaluate(() => {
    __tk.reset()
    const W = TKWorlds.get('titanic')
    for (let k = 0; k < 4; k++) { __tk.start('titanic', k); __tk.finish(k % 3 === 2 ? 2 : 3) }
    const K = TKWorlds.get('kamar'); for (let k = 0; k < K.levels.length; k++) { __tk.start('kamar', k); __tk.finish(3) }
  })
  await p.reload({ waitUntil: 'networkidle2' }); await sleep(900)
}
for (const [w, h, tag] of [[1280, 800, 'land'], [390, 844, 'port']]) {
  const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
  const p = await b.newPage()
  await p.setViewport({ width: w, height: h, isMobile: w < 900, hasTouch: true })
  await p.goto(URL, { waitUntil: 'networkidle2' })
  await seed(p)
  const S = async n => { await sleep(900); await p.screenshot({ path: `${OUT}/live-${n}-${tag}.png` }) }
  await S('ui03-home')
  // ui-01 story intro: portal panel
  await p.evaluate(() => __tk.start('kamar', 0)); await sleep(1200); await tapSel(p, '.tks-next'); await sleep(900); await S('ui01-story')
  await skipStory(p); await sleep(500)
  await p.evaluate(() => document.getElementById('p-home').click()); await sleep(600)
  // ui-04 ships
  await tapSel(p, '#btn-ships'); await S('ui04-ships')
  // ui-06 world map (Start = world map once the intro is seen)
  await tapSel(p, '.scr.active [data-back]'); await sleep(500); await tapSel(p, '#btn-start'); await sleep(900); await S('ui06-world')
  // ui-02 #4 level map
  await p.evaluate(() => __tk.open('titanic')); await S('ui02-levelmap')
  // ui-05 grid navigation (Titanic 4)
  await p.evaluate(() => __tk.start('titanic', 3)); await sleep(700); await skipStory(p); await S('ui05-grid')
  // ui-10 reward after really solving it
  await p.evaluate(() => { const h = __tk.handle(); h.setProgram(TKGrid.solve(h.level)) }); await sleep(300); await tapSel(p, '.tkg-go'); await sleep(6500)
  await S('ui10-reward')
  // ui-07 deck puzzle (Britannic 3: pick up + drop)
  await p.evaluate(() => { __tk.unlockAll(); __tk.start('britannic', 2) }); await sleep(700); await skipStory(p); await S('ui07-grid-deck')
  // ui-08 quiz (Titanic 1 maths)
  await p.evaluate(() => __tk.start('titanic', 0)); await sleep(700); await skipStory(p); await S('ui08-quiz')
  // ui-02 #7 steer, #8 cutscene
  await p.evaluate(() => __tk.start('titanic', 6)); await sleep(3000); await S('ui02-steer')
  await p.evaluate(() => __tk.start('titanic', 11)); await sleep(1200); await S('ui02-cutscene')
  await skipStory(p); await sleep(600)
  // ui-09 collection = Kamar Timmy / Kapalku
  await p.goto(URL, { waitUntil: 'networkidle2' }); await sleep(800)
  await tapSel(p, '#btn-room'); await S('ui09-room')
  await tapSel(p, '.scr.active [data-back]'); await sleep(500)
  await tapSel(p, '#btn-settings'); await S('ui11-settings')
  await b.close()
}
console.log('done')
