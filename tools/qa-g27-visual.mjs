// G27 Spelling Adventure — visual / layout gate, in BOTH orientations.
//
// The first build of this game passed every functional gate and was still
// wrong on screen: a white halo round every sprite, a success panel that let
// the play screen show through it, a top bar that pushed the sound button off
// a phone, confetti painted over the letters. None of that is visible to a
// test that only reads state. This one measures what is actually drawn.
//
// Every screen, at 7 viewports (phones and a tablet in portrait AND
// landscape, plus desktop), must satisfy:
//   - no horizontal scroll;
//   - every control fully inside the viewport horizontally; on the PLAY and
//     SUCCESS screens and in the modals, fully inside vertically too — a
//     child must reach every letter without scrolling, even at 640x360;
//     list screens may scroll, but only if the screen is a scroll container;
//   - no character or scenery layer overlapping any control, slot, tile or text;
//   - tiles and buttons at least 44 px each way;
//   - no visible text under 12 px (build stamp exempt BY NAME);
//   - the self-hosted Fredoka One actually in use.
// Screenshots land in tools/qa-out/g27/ for a person to look at.
import puppeteer from 'puppeteer'
import fs from 'node:fs'

const BASE = process.env.QA_BASE || 'http://localhost:8081'
const URL = `${BASE}/games/ejaan-inggris.html`
const OUT = 'tools/qa-out/g27'
fs.mkdirSync(OUT, { recursive: true })
const sleep = ms => new Promise(r => setTimeout(r, ms))
const fails = []
const check = (ok, msg) => { if (!ok) { console.log(`FAIL  ${msg}`); fails.push(msg) } return ok }
let passes = 0
const pass = (ok, msg) => { if (check(ok, msg)) passes++ }

const VIEWPORTS = [
  { name: 'phone-portrait',     w: 390,  h: 844,  device: true },
  { name: 'phone-landscape',    w: 844,  h: 390,  device: true },
  { name: 'small-portrait',     w: 360,  h: 640,  device: true },
  { name: 'small-landscape',    w: 640,  h: 360,  device: true },
  { name: 'tablet-portrait',    w: 768,  h: 1024, device: true },
  { name: 'tablet-landscape',   w: 1024, h: 768,  device: true },
  { name: 'desktop',            w: 1280, h: 800,  device: false },
]
const ONLY = (process.env.QA_VIEWPORTS || '').split(',').filter(Boolean)
// screens that show the two characters, and where the size rule applies
const CHAR_SCREENS = new Set(['title', 'play', 'play-long', 'success'])
const hiddenPortrait = []

// Screens, each reached through the page's own seam. `fit` = must fit with no
// vertical scroll.
const SCREENS = [
  { key: 'title',      fit: true,  go: () => window.__g27.show('scr-title') },
  { key: 'category',   fit: false, go: () => document.getElementById('btn-play').click() },
  { key: 'words',      fit: false, go: () => window.__g27.openCategory('school', 1) },
  { key: 'words-l2',   fit: false, go: () => window.__g27.openCategory('school', 2) },
  { key: 'play',       fit: true,  go: () => { window.__g27.startWord('pencil'); window.__g27.place(0, 'p') } },
  { key: 'play-long',  fit: true,  go: () => { window.__g27.startWord('calculator'); window.__g27.place(0, 'c') } },
  { key: 'hint',       fit: true,  go: () => { window.__g27.startWord('scissors'); window.__g27.showHint() }, modal: 'ov-hint' },
  { key: 'success',    fit: true,  go: () => { window.__g27.startWord('calculator'); window.__g27.solve() }, modal: 'ov-ok', wait: 1100 },
  { key: 'progress',   fit: false, go: () => { window.__g27.buildProgress(); window.__g27.show('scr-progress') } },
  { key: 'settings',   fit: false, go: () => window.__g27.show('scr-settings') },
  { key: 'parents',    fit: true,  go: () => window.__g27.openParents(), modal: 'ov-parents' },
]

function measure (fit, modal) {
  const vw = innerWidth, vh = innerHeight
  const vis = el => {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) return false
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  }
  // everything that belongs to the screen the child is looking at
  const root = modal ? document.getElementById(modal) : document.querySelector('.scr.active')
  const scope = [...root.querySelectorAll('*')].filter(vis)
  const name = el => (el.id ? '#' + el.id : el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : el.tagName) +
    (el.textContent ? '"' + el.textContent.trim().slice(0, 14) + '"' : '')
  const controls = scope.filter(el => el.matches('button, [role="button"], .tile, .sw'))
  const cells = scope.filter(el => el.matches('.slot, .tile'))
  const texts = scope.filter(el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()))
  // every visible character / scenery layer (visibility inherits, so layers
  // hidden by the celebration or by a media query drop out here)
  // A hint/parents modal is a full-screen overlay ABOVE the characters, so a
  // character underneath it is not "over" anything; the celebration carries
  // its own characters, which ARE in the same layer as its content.
  const decor = (modal && modal !== 'ov-ok') ? [] : [...document.querySelectorAll('.g27-char, .g27-prop')].filter(vis)
    .filter(el => modal === 'ov-ok' ? el.closest('#ov-ok') : !el.closest('#ov-ok'))

  const out = {}
  out.hscroll = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - vw
  const scr = document.querySelector('.scr.active')
  out.scrHscroll = scr ? scr.scrollWidth - scr.clientWidth : 0
  out.vOverflow = modal ? Math.max(0, root.scrollHeight - root.clientHeight) : (scr ? scr.scrollHeight - scr.clientHeight : 0)
  out.scrollable = scr ? /auto|scroll/.test(getComputedStyle(scr).overflowY) : false

  out.outX = controls.filter(el => { const r = el.getBoundingClientRect(); return r.left < -1 || r.right > vw + 1 }).map(name).slice(0, 4)
  out.outY = (fit ? controls.concat(cells) : []).filter(el => { const r = el.getBoundingClientRect(); return r.top < -1 || r.bottom > vh + 1 }).map(name).slice(0, 4)
  out.small = controls.filter(el => { const r = el.getBoundingClientRect(); return r.width < 43.5 || r.height < 43.5 }).map(el => {
    const r = el.getBoundingClientRect(); return name(el) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) }).slice(0, 4)
  out.tinyText = texts.filter(el => !el.closest('.du-build-stamp') && parseFloat(getComputedStyle(el).fontSize) < 12)
    .map(el => name(el) + ' ' + getComputedStyle(el).fontSize).slice(0, 4)

  // decor vs anything a child reads or touches
  const hit = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top)
  const shrink = (r, k) => ({ left: r.left + r.width * k, right: r.right - r.width * k, top: r.top + r.height * k, bottom: r.bottom - r.height * k })
  const targets = [...new Set(controls.concat(cells, texts))].filter(el => !el.closest('.g27-char-wrap'))
  out.overlap = []
  for (const d of decor) {
    // the sprite's transparent margin is not the character: test its inner 88%
    const dr = shrink(d.getBoundingClientRect(), 0.06)
    for (const t of targets) {
      if (d.contains(t) || t.contains(d)) continue
      if (hit(dr, t.getBoundingClientRect())) { out.overlap.push(name(d) + ' over ' + name(t)); break }
    }
  }
  out.overlap = out.overlap.slice(0, 4)
  // text sliding under a control (a long title under the star badge) is as
  // unreadable as decor over it. Only unrelated pairs count: a label inside
  // its own button is not a collision.
  out.textHit = []
  // against controls AND badges, chips and other text: the collision this was
  // written for was a title under the star badge, which is a <div>, not a button
  const solids = [...new Set(controls.concat(scope.filter(el => el.matches('.badge, .chip, #lvl')), texts))]
  for (const tx of texts) {
    const tr = tx.getBoundingClientRect()
    for (const c of solids) {
      if (c.contains(tx) || tx.contains(c) || c === tx) continue
      const cr = c.getBoundingClientRect()
      const ix = Math.min(tr.right, cr.right) - Math.max(tr.left, cr.left)
      const iy = Math.min(tr.bottom, cr.bottom) - Math.max(tr.top, cr.top)
      if (ix > 2 && iy > 2) { out.textHit.push(name(tx) + ' / ' + name(c)); break }
    }
    if (out.textHit.length >= 4) break
  }
  // the two characters: the owner's size rule, depth tag, no filter
  const celebrating = !!(modal === 'ov-ok')
  out.chars = (celebrating ? ['ok-truck', 'ok-digger'] : ['deco-truck', 'deco-digger']).map(id => {
    const el = document.getElementById(id)
    const cs = getComputedStyle(el), r = el.getBoundingClientRect()
    return { id, shown: cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0,
      w: r.width, depth: el.getAttribute('data-depth'), filter: cs.filter }
  })
  out.bgFilter = getComputedStyle(document.querySelector('.g27-bg')).filter
  out.portrait = matchMedia('(orientation:portrait)').matches
  out.font = document.fonts.check('24px "Fredoka One"') && /Fredoka One/.test(getComputedStyle(document.body).fontFamily)
  out.fontLoaded = [...document.fonts].some(f => /Fredoka One/.test(f.family) && f.status === 'loaded')
  return out
}

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
})
const errors = []
try {
  for (const vp of VIEWPORTS.filter(v => !ONLY.length || ONLY.includes(v.name))) {
    const page = await browser.newPage()
    const cdp = await page.createCDPSession()
    await cdp.send('Network.setBypassServiceWorker', { bypass: true })
    await page.emulate({
      viewport: { width: vp.w, height: vp.h, deviceScaleFactor: 1, isMobile: vp.device, hasTouch: vp.device, isLandscape: vp.w > vp.h },
      userAgent: vp.device ? 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36' : 'Mozilla/5.0 (X11; Linux x86_64) Chrome/120',
    })
    page.on('pageerror', e => errors.push(`${vp.name}: ${String(e.message).slice(0, 100)}`))
    let nav = null
    for (const t of [45000, 120000]) {
      try { await page.goto(URL, { waitUntil: 'load', timeout: t }); nav = null; break } catch (e) { nav = String(e.message).slice(0, 80) }
    }
    if (!check(!nav, `${vp.name}: page loads ${nav || ''}`)) { await page.close(); continue }
    await page.waitForFunction(() => window.__g27 && document.fonts.status === 'loaded', { timeout: 30000 }).catch(() => {})
    await sleep(900)
    await page.evaluate(() => window.__g27.reset())

    for (const sc of SCREENS) {
      await page.evaluate(() => window.__g27.closeAll())
      await page.evaluate(sc.go)
      await sleep(sc.wait || 750)
      const m = await page.evaluate(measure, sc.fit, sc.modal || null)
      const tag = `${vp.name} ${sc.key}`
      pass(m.hscroll <= 1 && m.scrHscroll <= 1, `${tag}: no horizontal scroll (page ${m.hscroll}, screen ${m.scrHscroll})`)
      pass(m.outX.length === 0, `${tag}: controls inside the viewport horizontally${m.outX.length ? ' — ' + m.outX.join(', ') : ''}`)
      if (sc.fit) pass(m.vOverflow <= 1 && m.outY.length === 0,
        `${tag}: everything reachable WITHOUT scrolling (overflow ${m.vOverflow}px${m.outY.length ? '; off-screen: ' + m.outY.join(', ') : ''})`)
      else pass(m.vOverflow <= 1 || m.scrollable, `${tag}: overflowing list is a scroll container (overflow ${m.vOverflow}px)`)
      pass(m.overlap.length === 0, `${tag}: no character/scenery over a control or text${m.overlap.length ? ' — ' + m.overlap.join(' | ') : ''}`)
      pass(m.textHit.length === 0, `${tag}: no text colliding with a control, badge or other text${m.textHit.length ? ' — ' + m.textHit.join(' | ') : ''}`)
      pass(m.small.length === 0, `${tag}: tiles and buttons >= 44px${m.small.length ? ' — ' + m.small.join(', ') : ''}`)
      pass(m.tinyText.length === 0, `${tag}: no text under 12px${m.tinyText.length ? ' — ' + m.tinyText.join(', ') : ''}`)
      pass(m.font && m.fontLoaded, `${tag}: Fredoka One is the face actually in use`)
      pass(m.bgFilter === 'none', `${tag}: the moving backdrop carries no css filter (${m.bgFilter})`)
      if (CHAR_SCREENS.has(sc.key)) {
        for (const c of m.chars) {
          const aspect = /truck/.test(c.id) ? 1.008 : 1.14
          const want = m.portrait ? Math.max(96, Math.min(0.26 * vp.w, 0.22 * vp.h * aspect))
                                  : Math.max(96, Math.min(0.15 * vp.w, 0.30 * vp.h * aspect))
          pass(c.depth === '0.7' && c.filter === 'none', `${tag}: ${c.id} has data-depth 0.7 and no filter (${c.depth}, ${c.filter})`)
          if (!m.portrait) pass(c.shown, `${tag}: ${c.id} is SHOWN in landscape (the rule never hides it)`)
          else if (!c.shown) hiddenPortrait.push(`${tag}: ${c.id}`)
          if (c.shown) pass(Math.abs(c.w - want) <= 2, `${tag}: ${c.id} is ${Math.round(c.w)}px wide = the rule's ${Math.round(want)}px`)
        }
      }
      await page.screenshot({ path: `${OUT}/${vp.w}x${vp.h}-${sc.key}.png` })
    }
    await page.close()
  }
} finally {
  await browser.close()
}
check(errors.length === 0, `no page errors${errors.length ? ' — ' + errors[0] : ''}`)
if (hiddenPortrait.length) console.log(`\nCharacters hidden in PORTRAIT because that screen had no room (allowed by the rule):\n  ` + hiddenPortrait.join('\n  '))
console.log(`\n${passes} checks passed, ${fails.length} failed`)
console.log(fails.length ? `${fails.length} FAILED` : 'ALL PASS')
process.exit(fails.length ? 1 : 0)
