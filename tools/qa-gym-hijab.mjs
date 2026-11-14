#!/usr/bin/env node
// qa-gym-hijab — audit 2026-11-14 A-6 (docs/audit/full-audit-2026-11-14.md). Owner rule: women and girls appear
// only wearing hijab. The vendored Showdown trainer sprites of the female Gym leaders do not, so the game never
// shows them: their face is their lead Pokemon.
//   L1 no request for a female trainer's sprite file while the gym list, every welcome card and a battle open
//   L2 the gym list and the welcome card show a picture for each of them (an <img> that loaded, not empty)
//   L5 Pokemon Run's Team Rocket rival pool has no female trainer sprite
//   L4 male trainers keep their own sprite (the swap is not a blanket)
// Usage: QA_BASE=http://127.0.0.1:8097 node tools/qa-gym-hijab.mjs
import puppeteer from 'puppeteer'
const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, '')
const FEMALE = ['acerola', 'agatha', 'akari', 'bea', 'candice', 'cissy', 'clair', 'cynthia', 'dawn', 'diantha', 'elesa', 'erika',
  'flannery', 'gardenia', 'iono', 'irida', 'iris', 'jasmine', 'jessie', 'karen', 'katy', 'korrina', 'lana', 'lenora', 'lorelei',
  'luana', 'mallow', 'may', 'maylene', 'misty', 'nessa', 'olivia', 'roxanne', 'ryme', 'sabrina', 'serena', 'skyla', 'tulip',
  'valerie', 'viola', 'whitney', 'winona']
const FEM_RE_SRC = new RegExp('/trainers?/(' + FEMALE.join('|') + ')\\.(webp|png|gif)')
const FEM_RE = new RegExp('/trainers?/(' + FEMALE.join('|') + ')\\.(webp|png|gif)')
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }
const sleep = ms => new Promise(r => setTimeout(r, ms))
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-audio-output'] })
const p = await b.newPage()
await p.setViewport({ width: 844, height: 390, isMobile: true, hasTouch: true })
const asked = new Set()
p.on('request', r => { const m = r.url().match(FEM_RE); if (m) asked.add(m[1]) })
await p.evaluateOnNewDocument(() => { try { localStorage.setItem('dunia-emosi-sound', 'off') } catch (e) {} })
await p.goto(BASE + '/games/gym-pokemon.html', { waitUntil: 'load', timeout: 60000 })
await sleep(2000)
const female = FEMALE
const r = await p.evaluate(async female => {
  const wait = ms => new Promise(r => setTimeout(r, ms))
  const out = { roster: TRAINERS.length, missing: [], grid: [], welcome: [], male: null, }
  for (const id of female) if (!TRAINERS.some(t => t.sprite === id)) out.missing.push(id)
  try { buildGymSelect() } catch (e) { out.gridErr = e.message }
  await wait(1500)
  for (const img of document.querySelectorAll('#trainer-grid img[data-sprite]')) {
    if (!female.includes(img.dataset.sprite)) continue
    out.grid.push({ id: img.dataset.sprite, src: img.getAttribute('src') || '', w: img.naturalWidth })
  }
  const maleImg = document.querySelector('#trainer-grid img[data-sprite="brock"]')
  out.male = maleImg ? maleImg.getAttribute('src') : null
  for (const id of female) {
    const t = TRAINERS.find(t => t.sprite === id)
    try { showGymWelcome(t.id) } catch (e) { out.welcome.push({ id, err: e.message }); continue }
    const s = document.getElementById('gw-sprite')
    await wait(150)
    out.welcome.push({ id, src: s.getAttribute('src') || '', shown: s.style.display !== 'none' })
    try { closeWelcome() } catch (e) {}
  }
  // the real Adventure path: mode pick -> team confirm -> VS card -> battle (stubbed to answer at once)
  try {
    BattleModes.show = o => o.onAdventure()
    window.showTeamConfirm = (t, cb) => cb()
    window.showAdvVsCard = (t, cb) => cb()
    startBattle(TRAINERS.find(t => t.sprite === 'misty').id)
  } catch (e) { out.battleErr = e.message }
  await wait(2500)
  const ep = document.getElementById('portrait-enemy')
  out.portrait = ep ? ep.getAttribute('src') || '' : null
  return out
}, female)
await sleep(1500)
ok(!r.missing.length, `roster has all ${FEMALE.length} listed female trainers (${r.roster} trainers)${r.missing.length ? ' missing ' + r.missing : ''}`)
ok(asked.size === 0, `L1 0 requests for a female trainer sprite${asked.size ? ': ' + [...asked].join(',') : ''}`)
const gridBad = r.grid.filter(g => !g.src || /\/trainers?\//.test(g.src) || !g.w)
ok(r.grid.length > 0 && !gridBad.length, `L2 gym list: ${r.grid.length} female cards, each a loaded non-trainer picture${gridBad.length ? ' bad: ' + gridBad.slice(0, 6).map(g => g.id + '=' + g.src.split('/').pop() + '/' + g.w).join(' ') : ''}`)
const wBad = r.welcome.filter(w => w.err || !w.src || /\/trainers?\//.test(w.src) || !w.shown)
ok(!wBad.length, `L2 welcome card: ${r.welcome.length - wBad.length}/${r.welcome.length} show a non-trainer picture${wBad.length ? ' bad: ' + wBad.slice(0, 6).map(w => w.id + '=' + (w.err || w.src.split('/').pop())).join(' ') : ''}`)
ok(!r.battleErr && r.portrait !== null && !/\/trainers?\//.test(r.portrait), `L1 battle portrait for Misty is not her sprite (${r.battleErr || (r.portrait || '').split('/').pop()})`)
ok(/\/trainer\/brock\.webp/.test(r.male || ''), `L4 a male trainer keeps his own sprite (${r.male})`)
// L5 Pokemon Run's Team Rocket pool shows no female trainer either
const p2 = await b.newPage()
await p2.goto(BASE + '/games/pokemon-run.html', { waitUntil: 'load', timeout: 60000 })
const run = await p2.evaluate(() => (typeof TR_TRAINERS !== 'undefined' ? TR_TRAINERS : []).map(t => t.name + '|' + t.sprite))
const runBad = run.filter(x => FEM_RE_SRC.test(x.toLowerCase()))
ok(run.length > 0 && !runBad.length, `L5 Pokemon Run rivals: ${run.length}, female sprites ${runBad.length}${runBad.length ? ' ' + runBad.join(' ') : ''}`)
await b.close()
console.log(`qa-gym-hijab: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
