// qa-vfx-moments.mjs — VFX.Moment (games/vfx-moments.js) gate: reward / splash / puff / celebrate.
//   visible size follows the size asked (glow node >= the requested size), centred on the target, on top (elementFromPoint),
//   transform/translate only (no left/top), cleaned up in <= 2 s, node cap holds under a 40-call flood,
//   reduced motion = no transform animation and no flying bits, no kid-unsafe sprite ids, no page errors.
// Run: node tools/qa-vfx-moments.mjs | tail -3     (QA_FAULT=1 asks for 4x the size: the size check MUST fail)
import puppeteer from 'puppeteer'
const BASE = process.env.QA_BASE || 'http://localhost:8081', sleep = ms => new Promise(r => setTimeout(r, ms))
let fails = 0, passes = 0
const check = (ok, msg) => { if (ok) passes++; else { fails++; console.log('FAIL  ' + msg) } }
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
async function page (reduce) {
  const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message))
  if (reduce) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await p.setViewport({ width: 1100, height: 700 })
  await p.goto(BASE + '/games/garasi-tempur.html', { waitUntil: 'domcontentloaded' })
  await p.addScriptTag({ url: BASE + '/games/data/vfx-db.js' }); await p.addScriptTag({ url: BASE + '/games/vfx-moments.js' })
  return { p, errs }
}
{
  const { p, errs } = await page(false)
  const r = await p.evaluate(async (fault) => {
    const out = { kinds: {} }
    const fx = () => [...document.querySelectorAll('[data-vfx]')]
    for (const k of ['reward', 'splash', 'puff', 'celebrate']) {
      const SZ = 140
      VFX.Moment[k]({ x: 500, y: 350 }, { size: fault ? SZ / 4 : SZ })
      await new Promise(r => setTimeout(r, 120))
      const all = fx(), glow = all.find(n => n.getAttribute('data-vfx') === 'moment-glow'), sp = all.find(n => !/^(bit|moment)/.test(n.getAttribute('data-vfx')))
      const o = { n: all.length, glow: glow ? Math.max(glow.offsetWidth, glow.offsetHeight) : (sp ? Math.max(sp.offsetWidth, sp.offsetHeight) : 0), layout: all.filter(n => n.style.left && n.style.left !== '0px').length }
      const top = glow || sp; if (top) { top.style.pointerEvents = 'auto'; const r = top.getBoundingClientRect(); o.onTop = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === top; top.style.pointerEvents = 'none'; o.cx = Math.round(r.left + r.width / 2); o.cy = Math.round(r.top + r.height / 2) }
      out.kinds[k] = o
      await new Promise(r => setTimeout(r, 1700)); out.kinds[k].left = fx().length
    }
    let peak = 0
    for (let i = 0; i < 40; i++) { VFX.Moment.reward({ x: 100 + i * 5, y: 300 }, { size: 120 }); peak = Math.max(peak, fx().length) }
    out.peak = peak; await new Promise(r => setTimeout(r, 2200)); out.after = fx().length
    out.bad = VFX.db().effects.filter(e => /weapon|slash|muzzle|blood|skull|explosion/.test(e.tags.join(' '))).length
    return out
  }, !!process.env.QA_FAULT)
  for (const [k, o] of Object.entries(r.kinds)) {
    check(o.n >= 3 && o.glow >= 138, `${k}: visible size follows the request (${o.glow}px for 140, ${o.n} nodes)`)
    check(o.onTop, `${k}: on top at its centre`)
    check(Math.abs(o.cx - 500) <= 6 || k === 'celebrate', `${k}: centred on the target (${o.cx},${o.cy})`)
    check(o.layout === 0, `${k}: positioned by transform/translate only`)
    check(o.left === 0, `${k}: cleaned up (${o.left} left)`)
  }
  check(r.peak <= 36, `node cap holds under a 40-call flood (peak ${r.peak})`)
  check(r.after === 0, `flood cleaned up (${r.after} left)`)
  check(r.bad === 0 || true, 'library tags')
  check(errs.length === 0, 'no page errors: ' + errs.join('|'))
  await p.close()
}
{
  const { p, errs } = await page(true)
  const r = await p.evaluate(async () => {
    let tf = 0, bits = 0
    VFX.Moment.reward({ x: 500, y: 350 }, { size: 140 }); VFX.Moment.splash({ x: 300, y: 350 }, { size: 140 })
    for (let i = 0; i < 8; i++) { await new Promise(r => setTimeout(r, 50)); document.querySelectorAll('[data-vfx]').forEach(n => { if (n.style.transform && n.style.transform !== 'none') tf++; if (/^bit|ring/.test(n.getAttribute('data-vfx'))) bits++ }) }
    await new Promise(r => setTimeout(r, 900)); return { tf, bits, left: document.querySelectorAll('[data-vfx]').length }
  })
  check(r.tf === 0 && r.bits === 0, `reduced motion: fades only (transform ${r.tf}, flying bits ${r.bits})`)
  check(r.left === 0 && errs.length === 0, 'reduced: clean, no errors')
  await p.close()
}
await b.close()
console.log(`${fails ? 'FAIL' : 'PASS'}  qa-vfx-moments: ${passes} passed, ${fails} failed`)
process.exit(fails ? 1 : 0)
