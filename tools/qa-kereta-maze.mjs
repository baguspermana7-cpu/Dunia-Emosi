// Kereta Pemberani: Petualangan Rel gate.  node tools/qa-kereta-maze.mjs [--skip-browser] [--perf]
//  static  : every level solvable by its reference plan within its slots (BFS), cast table fresh + complete, SoalEngine packs
//            valid + every sprite key in the database, no emoji in any game file, sw.js lists every file
//  browser : zero page errors on every screen at two viewports, text clip / cover check, real-pointer play (clicks only)
//            of one level per storyline + two-train TURNS + two-train SIMULTANEOUS + a timed critter, question cards
//            answered through the real UI, sprite facing = heading, stars saved per avatar (and not leaked to another),
//            reduced motion, the classic Lokomotif Pemberani still reachable, frame budget at 4x CPU (skipped when loaded)
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import vm from 'node:vm'
import http from 'node:http'
import { spawnSync } from 'node:child_process'
const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..')
const fails = []
const check = (ok, msg) => { console.log((ok ? 'OK   ' : 'FAIL ') + msg); if (!ok) fails.push(msg) }
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8')
const skipBrowser = process.argv.includes('--skip-browser')

/* ── static ──────────────────────────────────────────────────────────────────────────────────────── */
const ctx = { console }; ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx)
const dataFiles = fs.readdirSync(path.join(ROOT, 'games/data')).filter(n => /^kereta-levels-/.test(n)).map(n => 'games/data/' + n)
for (const f of ['games/kereta-grid.js', ...dataFiles]) vm.runInContext(rd(f), ctx, { filename: f })
const KG = ctx.KeretaGrid, LV = ctx.KeretaLevels
const rle = plan => { let n = 0, last = null, c = 0; for (const a of plan) { const k = JSON.stringify(a); if (k === last && c < 9) { c++; continue } n++; last = k; c = 1 } return n }
let total = 0, bad = []
for (const ch of Object.keys(LV)) for (const lv of LV[ch]) {
  total++
  const v = KG.verify(lv, { cap: 300000 }), packed = v.plan ? rle(v.plan) : null
  const probs = v.problems.filter(p => !/shortest plan/.test(p))
  if (probs.length || packed == null || packed > lv.slots) bad.push(`${ch}/${lv.id}: ${probs.join('; ')} packed ${packed}/${lv.slots}`)
}
check(total >= 64 && bad.length === 0, `${total} levels (malivlak ${LV.malivlak.length}, brave ${LV.brave.length}, hellbent ${LV.hellbent.length}) each solved by its reference plan within its slots${bad.length ? ' - ' + bad.slice(0, 3).join(' | ') : ''}`)
check(LV.malivlak.length === 20 && LV.brave.length >= 30 && LV.hellbent.length >= 8, 'storyline sizes: 20 Malivlak, >= 30 Brave Locomotive, >= 8 Hellbent')
const modes = new Set(Object.values(LV).flat().map(l => l.mode || 'solo'))
check(modes.has('turns') && modes.has('both') && modes.has('solo'), 'solo, turn-taking and simultaneous two-train levels all present')
// two-train rules in the engine
{
  const both = LV.hellbent.find(l => l.id === 'hb04'), w = KG.world(both)
  const crash = KG.step(w, { kilat: 'maju', lemas: 'maju' }), ok = KG.step(w, { kilat: 'maju', lemas: 'tunggu' })
  check(ok.status !== 'blocked', 'simultaneous: one moves while the other waits')
  const tr = LV.hellbent.find(l => l.id === 'hb08'), r = KG.step(KG.world(tr), { lemas: 'maju' })
  check(r.status !== 'blocked' && r.world.trains.find(t => t.id === 'kilat').c === KG.world(tr).trains.find(t => t.id === 'kilat').c, 'turns: only the named train moves')
  const head = KG.world({ ...both, rows: ['1=2', ',,,'.padEnd(3, ','), ',,,'] , trains: both.trains.map((t, i) => ({ ...t, dir: i ? 'W' : 'E' })), goal: both.goal })
  check(KG.step(head, { kilat: 'maju', lemas: 'maju' }).reason === 'tabrak', 'simultaneous: two trains into the same tile is a kind "tabrak" block, never a crash')
}
// cast
check(spawnSync('python3', [path.join(ROOT, 'tools/gen-kereta-cast-js.py'), '--check']).status === 0, 'games/data/kereta-cast.js is fresh (names from the database name_id)')
const idx = JSON.parse(rd('assets/db/index.json')).assets
const CAST = (() => { const c = { window: {} }; vm.runInNewContext(rd('games/data/kereta-cast.js'), c); return c.window.KeretaCast })()
const mvKeys = Object.keys(idx).filter(k => k.startsWith('malivlak-char/'))
const usedMv = new Set(Object.values(CAST.malivlak).flat())
check(mvKeys.length >= 38 && mvKeys.every(k => usedMv.has(k)), `all ${mvKeys.length} Malivlak cast poses are used in a scenario${mvKeys.filter(k => !usedMv.has(k)).length ? ' - unused ' + mvKeys.filter(k => !usedMv.has(k)) : ''}`)
const castKeys = new Set([...Object.values(CAST.malivlak).flat(), ...Object.values(CAST.brave).flat()])
check([...castKeys].every(k => idx[k] && CAST.names[k]), `every cast key (${castKeys.size}) is in the database and has its official name`)
check(Object.keys(CAST.malivlak).length === 20 && Object.keys(CAST.brave).length >= 30, 'a cast list for every Malivlak and Brave scenario')
// questions
{
  const c = { console, localStorage: undefined }; c.window = c; c.globalThis = c; vm.createContext(c)
  for (const f of ['games/data/soal-engine.js', 'games/data/soal-gen-matematika.js', 'games/data/soal-pack-kereta.js']) vm.runInContext(rd(f), c, { filename: f })
  const SE = c.SoalEngine; let n = 0, badq = []
  const picKeys = []
  for (const p of ['sinyal', 'muat', 'loket', 'bunker']) for (const q of SE.items('kereta-' + p)) {
    n++; const v = SE.validateItem(q); if (v.length) badq.push(q.id + v)
    ;[q.pic, q.picA, q.picB, ...Object.values(q.choicePics || {})].filter(Boolean).forEach(k => { if (!idx[k]) badq.push(q.id + ' sprite ' + k) })
    if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(q.prompt + q.choices.join(''))) badq.push(q.id + ' emoji')
  }
  const kinds = new Set(SE.items('kereta-muat').map(q => q.kind)), pic = SE.items().filter(q => q.source && /kereta/.test(q.source) && (q.pic || q.picA || q.choicePics || q.shape)).length
  check(n >= 150 && badq.length === 0, `${n} story questions valid, answer in choices, sprites in the database, no emoji${badq.length ? ' - ' + badq.slice(0, 3) : ''}`)
  check(pic >= 40, `${pic} picture questions (count / compare / picture choice / shape) besides the word problems`)
  const q1 = SE.pick({ game: 'kereta', packs: ['kereta-loket'], count: 3, seed: 3 })
  check(q1.length === 3 && q1.every(q => q.choices.includes(q.answer)), 'SoalEngine profile "kereta" serves word problems')
}
// no emoji, sw coverage
const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2705}]/u
const gameFiles = fs.readdirSync(path.join(ROOT, 'games')).filter(n => /^kereta-/.test(n)).map(n => 'games/' + n).concat(dataFiles, ['games/data/soal-pack-kereta.js', 'games/data/kereta-cast.js'])
const emo = gameFiles.filter(f => emoji.test(rd(f)))
check(emo.length === 0, `no emoji in ${gameFiles.length} game files${emo.length ? ' - ' + emo : ''}`)
const sw = rd('sw.js'), missSw = gameFiles.filter(f => !f.endsWith('.html') && !sw.includes('./' + f + '?v=')).concat(sw.includes('./games/kereta-maze.html') ? [] : ['kereta-maze.html'])
check(missSw.length === 0, `sw.js SHELL lists every game file${missSw.length ? ' - ' + missSw : ''}`)
check(/games\/kereta-maze\.html/.test(rd('index.html')) && rd('index.html').includes('keretaClassic'), 'world-map tile opens the hub; hub hands the classic game back through a one-shot flag')
{
  const bgdir = path.join(ROOT, 'assets/kereta/bg'), cards = path.join(ROOT, 'assets/kereta/cards')
  const bgs = fs.existsSync(bgdir) ? fs.readdirSync(bgdir) : [], cs = fs.existsSync(cards) ? fs.readdirSync(cards) : []
  check(bgs.length === 44 && bgs.every(f => f.endsWith('.webp')) && cs.length === 11, `owner art shipped as webp only: ${bgs.length} backgrounds (22 x landscape + portrait), ${cs.length} chapter cards`)
  const tileKeys = ['rail-h', 'rail-v', 'curve-ne', 'curve-nw', 'switch-left', 'switch-right', 'crossing', 'grass', 'grass-flowers', 'water', 'dirt-path', 'bridge', 'gravel', 'bridge-broken', 'tunnel-portal', 'signal-red', 'signal-green', 'platform', 'water-tower', 'coal-bunker']
  check(tileKeys.every(k => idx['kereta-tile/' + k]) && Object.keys(idx).filter(k => k.startsWith('kereta-prop/')).length === 25 && Object.keys(idx).filter(k => k.startsWith('kereta-tile/')).length === 25, 'all 25 board tiles + 25 story props are in the database')
  const sw2 = rd('sw.js'); check(['rail-h', 'curve-ne', 'grass', 'water'].every(k => sw2.includes('kereta-tile/' + k)), 'sw.js precaches the board tiles')
  const need = ['story-char/carter/hands-hips', 'story-char/carter/point', 'story-char/carter/arms-crossed', 'story-char/carter/watch', 'story-char/carter/surprised', 'story-char/carter/defeated', 'story-char/pelukis/stand', 'story-char/anak-cat/stand', 'story-char/mekanik/stand', 'story-char/anak-kura/hold', 'story-char/mekanik-wanita/stand', 'story-char/nyonya-topi/stand-fan', 'story-char/tuan-merah/stand', 'train-char/rongsokan-a/v1', 'train-char/rongsokan-b/v1']
  check(need.every(k => idx[k] && idx[k].name_id), 'Mr Carter (6 safe poses), the workshop cast and the wrecked engines are in the database with official names')
  const forbid = Object.keys(idx).filter(k => /^story-char\/(carter\/(stand|arms-crossed-old)|james\/stand|lelaki-rompi)/.test(k) || (idx[k].name_id === 'Mr Carter' && idx[k].source && /Sprite Sheet|Ten-character/.test(idx[k].source) && idx[k].pose !== 'hands-open'))
  check(forbid.length === 0, 'the wrong earlier Carter / James art is gone from the database')
}
const artSrc = rd('games/kereta-art.js')
const bgKeys = [...artSrc.matchAll(/'(bg-(?:bl|mv|hb)-[a-z-]+)'/g)].map(m => m[1]), uniq = [...new Set(bgKeys)]
check(uniq.length === 22 && fs.readFileSync(path.join(ROOT, 'docs/KERETA-ART-SLOTS.md'), 'utf8').length > 500 && uniq.every(k => rd('docs/KERETA-ART-SLOTS.md').includes(k)), `art map: ${uniq.length} owner background keys, all documented in docs/KERETA-ART-SLOTS.md`)

if (skipBrowser) { console.log(fails.length ? `\nFAILED ${fails.length}` : '\nALL PASS (static only)'); process.exit(fails.length ? 1 : 0) }

/* ── browser ─────────────────────────────────────────────────────────────────────────────────────── */
const { default: puppeteer } = await import('puppeteer')
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' }
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]), f = path.join(ROOT, u === '/' ? 'index.html' : u)
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return }
  r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r)
})
await new Promise(r => server.listen(0, '127.0.0.1', r))
const PORT = server.address().port, BASE = `http://127.0.0.1:${PORT}/games/kereta-maze.html?mute=1`
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
const sleep = ms => new Promise(r => setTimeout(r, ms))
async function page (w = 1600, h = 900, init) {
  const p = await browser.newPage(); await p.setViewport({ width: w, height: h })
  p._errs = []; p.on('pageerror', e => p._errs.push(String(e).slice(0, 160))); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) p._errs.push('console: ' + m.text().slice(0, 140)) })
  p.on('response', r => { if (r.status() >= 400 && /\/(games|assets)\//.test(r.url()) ) p._errs.push(r.status() + ' ' + r.url().slice(-70)) })
  if (init) await p.evaluateOnNewDocument(init)
  return p
}
const SEL = '.kh-t1, .kh-t2, .kh-tag, button, .kbtn, .kcard, .kcmd, .kslot, .kchip, .knav-tab, .kst, .kp-stop, .kp-ch, .kgoal, .kg-goal, .kb-say, .kg-card, .kb-paper, h2, h3, .kg-title'
async function layoutAudit (p, label) {
  const bad = await p.evaluate(sel => {
    const out = [], vw = innerWidth, vh = innerHeight
    const vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none' && e.closest('.ks.on, #knav, #kov:not([hidden])') && !e.closest('[hidden]') && getComputedStyle(e.closest('.ks, #knav') || e).opacity > 0.5 }
    for (const e of document.querySelectorAll(sel)) {
      if (!vis(e)) continue
      const r = e.getBoundingClientRect(), name = (e.id || e.className || e.tagName).toString().slice(0, 30)
      const scroller = e.closest('.kp-side, .kk-grid, .kk-detail, .kg-lanes, .klane, .kc-lv, .kdlg, .kh-stories, .kg-card, .kr-wrap, .kg-pal')
      if (!scroller && (r.right > vw + 2 || r.left < -2 || r.bottom > vh + 2 || r.top < -2)) out.push('off-screen ' + name + ' ' + [r.left, r.top, r.right, r.bottom].map(Math.round))
      if (/^(BUTTON|H2|H3)$/.test(e.tagName) || e.classList.contains('kbtn') || /\bkh-(t1|t2|tag)\b/.test(e.className)) {
        for (const c of [e].concat([...e.querySelectorAll('span, b')])) if (c.scrollWidth > c.clientWidth + 2 && getComputedStyle(c).overflow !== 'visible' && c.clientWidth > 0 && getComputedStyle(c).textOverflow !== 'ellipsis') out.push('text clipped ' + name)
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2
        if (!scroller && cx > 0 && cy > 0 && cx < vw && cy < vh) { const top = document.elementFromPoint(cx, cy); if (top && top !== e && !e.contains(top) && !top.contains(e)) out.push('covered ' + name + ' by ' + (top.id || top.className).toString().slice(0, 24)) }
      }
    }
    const bp = document.querySelector('#ks-brief.on .kb-paper'); if (bp) { if (bp.scrollHeight > bp.clientHeight + 2) out.push('briefing card overflows by ' + (bp.scrollHeight - bp.clientHeight) + 'px'); const go = document.getElementById('kb-go'), gr = go && go.getBoundingClientRect(); if (gr && (gr.bottom > innerHeight || gr.bottom > bp.getBoundingClientRect().bottom + 1)) out.push('SUSUN LANGKAH not visible'); const st = document.querySelector('#ks-brief.on .ksteps'); if (st && st.getBoundingClientRect().bottom > bp.getBoundingClientRect().bottom) out.push('step cards cut off') }
    return out
  }, SEL)
  check(bad.length === 0, `layout ${label}: nothing off-screen, clipped or covered${bad.length ? ' - ' + [...new Set(bad)].slice(0, 4).join(' | ') : ''}`)
}
const shots = process.env.KERETA_SHOTS || '/tmp/dunia-kereta-shots'; fs.mkdirSync(shots, { recursive: true })
const screens = [['home', ''], ['chap', '&screen=chap'], ['brief', '&screen=brief&level=2'], ['game', '&screen=game&level=2'], ['coll', '&screen=coll']]
for (const [w, h] of [[1280, 800], [1024, 768], [844, 390], [390, 844]]) {
  for (const [name, q] of screens) {
    const p = await page(w, h); await p.goto(BASE + '&story=malivlak' + q, { waitUntil: 'networkidle2', timeout: 60000 }); await sleep(900)
    check(p._errs.length === 0, `no page errors: ${name} @${w}x${h}${p._errs.length ? ' - ' + p._errs[0] : ''}`)
    await layoutAudit(p, `${name} @${w}x${h}`)
    if (w === 1280) await p.screenshot({ path: path.join(shots, `screen-${name}.png`) })
    await p.close()
  }
}

/* every level of every storyline opens (briefing + board) with zero page errors */
{
  const p = await page(1280, 800); await p.goto(BASE + '&story=malivlak', { waitUntil: 'networkidle2', timeout: 60000 }); await sleep(500)
  let opened = 0, badOpen = []
  for (const ch of Object.keys(LV)) for (const lv of LV[ch]) {
    const n0 = p._errs.length
    const r = await p.evaluate((ch, n) => { try { KeretaMaze.S.story = ch; KeretaMaze.drawHome(); KeretaMaze.openBrief(n); const b = document.getElementById('ks-brief').classList.contains('on'); KeretaMaze.openGame(n); return b && document.getElementById('ks-game').classList.contains('on') && !!document.querySelector('.kb-train') } catch (e) { return String(e) } }, ch, lv.n)
    await sleep(60)
    if (r === true && p._errs.length === n0) opened++; else badOpen.push(`${ch}/${lv.n}: ${r === true ? p._errs.slice(n0).join(' ') : r}`)
  }
  check(opened === total && badOpen.length === 0, `all ${total} levels open (briefing + board with train) with zero page errors${badOpen.length ? ' - ' + badOpen.slice(0, 3).join(' | ') : ''}`)
  await p.close()
}

/* real-pointer play */
async function play (story, num, { avatar, reduced, expectQ } = {}) {
  const lv = LV[story].find(l => l.n === num), plan = KG.solve(KG.world(lv), {})
  const init = avatar != null ? `localStorage.setItem('dunia-players', JSON.stringify([{animal:'🦁'},{animal:'🐰'}])); localStorage.setItem('dunia-active-slot', JSON.stringify([${avatar},1]))` : null
  const p = await page(1600, 900, init)
  if (reduced) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await p.goto(`${BASE}&story=${story}&screen=game&level=${num}`, { waitUntil: 'networkidle2', timeout: 60000 }); await sleep(700)
  const mode = lv.mode || 'solo'
  if (mode === 'both') { const ids = lv.trains.map(t => t.id); for (const id of ids) { await p.click(`.ktab[data-t="${id}"]`); for (const a of plan) await p.click(`.kcmd[data-c="${a[id]}"]`) } }
  else for (const a of plan) { const id = Object.keys(a)[0]; if (mode === 'turns') await p.click(`.ktab[data-t="${id}"]`); await p.click(`.kcmd[data-c="${a[id]}"]`) }
  const used = await p.evaluate(() => +document.getElementById('kg-count').textContent.split('/')[0])
  await p.click('#kg-run')
  let q = 0, ok = false, face = null
  for (let i = 0; i < 400; i++) {
    await sleep(200)
    const st = await p.evaluate(() => { const o = document.querySelector('.kq-overlay'), cur = window.KeretaQuiz.current(); if (o && cur) { const bs = [...o.querySelectorAll('.kq-choice')]; return { q: 1, wrong: bs.findIndex(b => b.textContent.trim() !== String(cur.answer)), idx: bs.findIndex(b => b.textContent.trim() === String(cur.answer)) } } return { res: document.getElementById('ks-res').classList.contains('on') } })
    if (st.q) { q++; if (q === 1 && st.wrong >= 0) { await p.evaluate(i => document.querySelectorAll('.kq-choice')[i].click(), st.wrong); await sleep(150); const kind = await p.evaluate(() => ({ msg: document.querySelector('.kq-msg').textContent, open: !!document.querySelector('.kq-overlay') })); check(kind.open && kind.msg.length > 5, `wrong answer: kind hint, card stays, retry (${story} ${num}): "${kind.msg.slice(0, 40)}"`) } await p.evaluate(i => document.querySelectorAll('.kq-choice')[i].click(), st.idx); continue }
    if (!face) face = await p.evaluate(() => { const G = window.KeretaPlay.debug().G; if (!G.world || !G.world.tick) return null; const t = G.world.trains[0], im = document.querySelector('.kb-train img'); return { d: t.d, src: im && im.getAttribute('src') } })
    if (st.res) { ok = true; break }
  }
  const errs = p._errs.slice()
  check(ok && errs.length === 0, `real-pointer play ${story} ${num} "${lv.title}" (${mode}) reaches MISI SELESAI${q ? ', ' + q + ' question card(s)' : ''}${errs.length ? ' - ' + errs[0] : ''}`)
  if (expectQ) check(q >= 1, `${story} ${num}: a story question was asked and answered through the UI`)
  const res = ok ? await p.evaluate(() => ({ stars: document.querySelectorAll('.kr-stars .ki:not(.off)').length, route: document.querySelectorAll('.kr-route .st').length, check: document.querySelectorAll('.krow .ok').length, title: !!document.querySelector('.kr-title') })) : null
  if (res) check(res.stars >= 1 && res.route >= 1 && res.check >= 1, `result screen: ${res.stars} star(s), route replay of ${res.route} commands, ${res.check} checked goals`)
  if (ok && story === 'malivlak' && num === 2) { await sleep(1200); await p.screenshot({ path: path.join(shots, 'screen-res.png') }) }
  return { p, face, used }
}
const r1 = await play('malivlak', 2, { avatar: 0, expectQ: true })
const prog = await r1.p.evaluate(() => JSON.parse(localStorage.getItem('dunia-avatar-lion-progress') || '{}'))
check(!!(prog.g15m && prog.g15m.stars && prog.g15m.stars[2] >= 1 && prog.g15m.completed.includes(2)), 'stars saved to the active avatar (lion): g15m level 2 ' + JSON.stringify(prog).slice(0, 80))
if (r1.face) { const m = r1.face.src.match(/\/(?:top-)?(?:top-)?([nesw]{1,2})\.webp$/); check(!!m, `sprite facing follows the heading: engine heading ${r1.face.d * 90} deg draws ${r1.face.src.split('/').slice(-2).join('/')}`) }
await r1.p.close()
const p2 = await page(1600, 900, `localStorage.setItem('dunia-players', JSON.stringify([{animal:'🦁'},{animal:'🐰'}])); localStorage.setItem('dunia-active-slot', JSON.stringify([1,1]))`)
await p2.goto(BASE + '&story=malivlak', { waitUntil: 'networkidle2' }); await sleep(500)
const other = await p2.evaluate(() => JSON.parse(localStorage.getItem('dunia-avatar-rabbit-progress') || '{}'))
check(!other.g15m, 'a second avatar (rabbit) does not inherit the first child\'s stars')
await p2.close()
const r2 = await play('brave', 4); await r2.p.close()
const r3 = await play('hellbent', 3); await r3.p.close()       // TURNS: two trains, one command each in turn
const r4 = await play('brave', 23); await r4.p.close()         // SIMULTANEOUS: two lanes, shared clock, a lever question
const r5 = await play('hellbent', 4, { reduced: true }); const anim = await r5.p.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.ks.on')).length)
check(anim === 0, `reduced motion: ${anim} CSS animations running on the active screen`); await r5.p.close()

/* the classic game stays reachable */
{
  const p = await page(1280, 800, `sessionStorage.setItem('keretaClassic','1')`)
  await p.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded', timeout: 60000 }); await sleep(5000)
  const r = await p.evaluate(() => ({ lvl: document.getElementById('screen-level').classList.contains('active'), name: (document.getElementById('level-game-name') || {}).textContent, flag: sessionStorage.getItem('keretaClassic') }))
  check(r.lvl && /Lokomotif Pemberani/.test(r.name) && !r.flag, 'classic Lokomotif Pemberani level select opens unchanged from the hub (4th sub-game)')
  await p.close()
}

/* frame budget: 4x CPU throttle on the busiest level */
const load = os.loadavg()[0]
if (process.argv.includes('--perf') || load < 8) {
  if (load >= 8) console.log('load', load.toFixed(1), '- perf skipped')
  else {
    const lv = LV.hellbent.find(l => l.id === 'hb10'), plan = KG.solve(KG.world(lv), {})
    const p = await page(1600, 900); const cdp = await p.createCDPSession(); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    await p.goto(`${BASE}&story=hellbent&screen=game&level=10`, { waitUntil: 'networkidle2' }); await sleep(800)
    const ids = lv.trains.map(t => t.id)
    for (const id of ids) { await p.click(`.ktab[data-t="${id}"]`); for (const a of plan) await p.click(`.kcmd[data-c="${a[id]}"]`) }
    await p.evaluate(() => { window.__dt = []; let last = performance.now(); (function f (t) { window.__dt.push(t - last); last = t; requestAnimationFrame(f) })(last) })
    await p.click('#kg-run')
    for (let i = 0; i < 200; i++) { await sleep(150); const s = await p.evaluate(() => { const o = document.querySelector('.kq-overlay'), cur = window.KeretaQuiz.current(); if (o && cur) { const bs = [...o.querySelectorAll('.kq-choice')]; bs[bs.findIndex(b => b.textContent.trim() === String(cur.answer))].click(); return 'q' } return document.getElementById('ks-res').classList.contains('on') ? 'r' : '' }); if (s === 'r') break }
    const dt = (await p.evaluate(() => window.__dt)).slice(5).sort((a, b) => a - b), p90 = dt[Math.floor(dt.length * 0.9)], mx = dt[dt.length - 1]
    check(dt.length > 30 && p90 <= 16.8 && mx <= 33.4, `frame budget at 4x CPU on the busiest level: p90 ${p90.toFixed(1)} ms, worst ${mx.toFixed(1)} ms over ${dt.length} frames`)
    await p.close()
  }
} else console.log(`perf OWED: load average ${load.toFixed(1)} > 8 (run with --perf when the machine is quiet)`)

await browser.close(); server.close()
console.log(fails.length ? `\nFAILED ${fails.length}` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
