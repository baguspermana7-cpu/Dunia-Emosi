// Gym Pokemon audio gate — owner: "saat adventure ada 2 background sound. Ada suara
// efek kecil berulang". Drives the REAL adventure path (outer startBattle → mode
// modal → Adventure → team confirm → VS card → battle) with every media play()
// and every synth noise node instrumented, then asserts:
//   - during the battle exactly ONE looping music track plays (the gym's own);
//   - no weather synth hiss runs (weather is visual only in the gym);
//   - after the battle ends no music loop and no hiss is left running.
// Needs the dev server on :8081.
import puppeteer from 'puppeteer'

const sleep = ms => new Promise(r => setTimeout(r, ms))
const fails = []
const check = (ok, msg) => { console.log((ok ? '✅ ' : '❌ ') + msg); if (!ok) fails.push(msg) }

const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] })
try {
  const p = await b.newPage()
  await p.setViewport({ width: 844, height: 390 })
  const errs = []
  p.on('pageerror', e => errs.push(e.message))
  await p.evaluateOnNewDocument(() => {
    const media = new Set()
    const play = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = function () { media.add(this); return play.apply(this, arguments) }
    let noiseTicks = 0
    const AC = window.AudioContext || window.webkitAudioContext
    const sp = AC.prototype.createScriptProcessor
    AC.prototype.createScriptProcessor = function () {
      const n = sp.apply(this, arguments)
      let h = null
      Object.defineProperty(n, 'onaudioprocess', {
        get () { return h },
        set (f) { h = f; n.addEventListener('audioprocess', e => { noiseTicks++; }) },
      })
      return n
    }
    const bs = AC.prototype.createBufferSource
    AC.prototype.createBufferSource = function () {
      const n = bs.apply(this, arguments); const st = n.start.bind(n), sp2 = n.stop.bind(n)
      n.start = function () { if (n.loop) window.__loopSrc = (window.__loopSrc || 0) + 1; return st.apply(null, arguments) }
      n.stop = function () { if (n.loop) window.__loopSrc = (window.__loopSrc || 0) - 1; return sp2.apply(null, arguments) }
      return n
    }
    window.__audio = () => ({
      loops: [...media].filter(m => !m.paused && !m.ended && m.loop).map(m => decodeURIComponent((m.currentSrc || m.src).split('/').pop())),
      noiseTicks, loopSrc: window.__loopSrc || 0,
    })
  })
  let loaded = false
  for (const t of [45000, 120000]) {
    try { await p.goto('http://localhost:8081/games/gym-pokemon.html', { waitUntil: 'domcontentloaded', timeout: t }); loaded = true; break } catch (_) {}
  }
  check(loaded, 'gym page loads')
  if (!loaded) throw new Error('no page')
  await sleep(3000)
  const tid = await p.evaluate(() => window.__g13c.TRAINERS[0].id)
  await p.evaluate(id => window.startBattle(id), tid)
  await sleep(1200)
  const adv = await p.evaluate(() => { const a = document.querySelector('.bm-card[data-mode="adventure"]'); if (a) a.click(); return !!a })
  check(adv, 'mode modal offers Adventure')
  await sleep(1500)
  await p.evaluate(() => { const c = document.querySelector('.pkg-card'); if (c && c.offsetParent) c.click() })
  await sleep(800)
  await p.evaluate(() => { const g = document.getElementById('tcf-go'); if (g && g.offsetParent) g.click() })
  await sleep(7000)          // VS card countdown → battle boots, music starts
  const inBattle = await p.evaluate(() => !!(window.__g13c.battle && !window.__g13c.battle.ended))
  check(inBattle, 'adventure battle is running')
  const t0 = await p.evaluate(() => window.__audio())
  await sleep(1500)
  const a = await p.evaluate(() => window.__audio())
  check(a.loops.length === 1, `exactly one music loop plays in battle (${a.loops.length}: ${a.loops.join(' + ') || 'none'})`)
  check(a.noiseTicks === t0.noiseTicks && a.loopSrc <= 0, `no weather synth hiss runs in battle (ticks +${a.noiseTicks - t0.noiseTicks}, loop sources ${a.loopSrc})`)

  await p.evaluate(() => window.__g13c.endBattleWin())
  await sleep(2500)          // bgmStop fades out
  const e0 = await p.evaluate(() => window.__audio())
  await sleep(1200)
  const e = await p.evaluate(() => window.__audio())
  check(e.loops.length === 0, `no music loop left after the battle (${e.loops.join(' + ') || 'none'})`)
  check(e.noiseTicks === e0.noiseTicks && e.loopSrc <= 0, `no synth hiss left after the battle (ticks +${e.noiseTicks - e0.noiseTicks})`)
  check(errs.length === 0, `no page errors${errs.length ? ' — ' + errs.slice(0, 2).join(' | ') : ''}`)
} finally { await b.close() }
console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
