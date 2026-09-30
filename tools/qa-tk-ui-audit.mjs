// qa-tk-ui-audit.mjs — G30 Timmy & Kapal Legendaris whole-UI audit (owner tablet ~1280x800, "tulisan kecil,
// terpotong, tidak proporsional"). Visits every screen reachable through the window.__tk seam at
// 1280x800 (DPR 2), 1340x800, 1024x768, 800x1280, 390x844 and 844x390 and asserts on each:
//   F  font     every visible text >= 14 px on a tablet (short side >= 600), >= 12 px on a phone
//   O  overflow no text spills out of its box (scroll vs client), no ellipsis truncation
//   C  clip     no visible image / sprite is partly cut by an overflow:hidden ancestor
//   T  taps     live (hit-testable) interactive elements >= 44 px and never overlapping each other
//   X  screen   nothing off screen, no horizontal page scroll
//   K  copy     no "Kapten Pinguin" (the captain is the old human captain; the penguin is Asisten Pinguin)
//   P  pics     picture-answer icons >= 56 px on a phone portrait
//   E  errors   no page errors, no failed requests
// Exemptions are listed below BY SELECTOR with a reason; anything else fails.
// QA_SIZES="1280x800,…"  QA_SCREENS="home,quiz-mudah" (substring match)  QA_SHOTS=<dir> (screenshots at 1280x800 + 390x844)
// QA_BREAK=1 injects a 10 px label on the home screen, QA_BREAK_V=1 a 260 px clock over its question: the gate must FAIL.
// Needs the dev server on :8081 (python3 -m http.server 8081).
import puppeteer from 'puppeteer'
import fs from 'node:fs'
const URL = process.env.QA_URL || 'http://localhost:8081/games/timmy-kapal.html'
const SIZES = (process.env.QA_SIZES || '1280x800,1340x800,1024x768,800x1280,390x844,844x390').split(',').map(s => s.split('x').map(Number))
const ONLY = process.env.QA_SCREENS ? process.env.QA_SCREENS.split(',') : null
const SHOTS = process.env.QA_SHOTS || '/tmp/claude-1000/-home-baguspermana7/006f0cec-d381-48ee-882e-83cf434d8153/scratchpad/tk-ui/shots'
fs.mkdirSync(SHOTS, { recursive: true })
const sleep = ms => new Promise(r => setTimeout(r, ms))

/* deliberate exemptions: [selector, checks it is exempt from, reason] */
const EXEMPT = [
  ['.sea-bg, .map-bg, .ships-bg, .room-bg, .reward-bg, .px-l, .px-l *:not(.home-timmy), .tks-bg, .gc-bg', 'CX', 'full-bleed scenery: bleeds past the frame on purpose (parallax / cover); character art must stay whole'],
  ['.gull', 'CX', 'gulls fly in from off-screen'],
  ['.tkg-coach, .tkg-coach *', 'CXT', 'coach hand: pointer-events none, drawn over the arrow it points at'],
  ['.car-dots, .car-dots *', 'T', 'carousel dots: aria-hidden position markers, not buttons'],
  ['.carousel *, .list *, .route *, .islands *, .room-body *, .tkh-body *, .tkh-side *, .settings *', 'X', 'inside a scroll area: items past the edge are reached by scrolling'],
  ['.fly-layer *', 'CXTFO', 'collectible fly-to-journal sprite in flight'],
  ['.atl-vp, .atl-vp *, .atl-ctl, .atl-ctl *', 'CXOT', 'the world atlas is a pan / zoom viewport (tk-atlas, gated by qa-tk-atlas): nodes pass under its edge and the fixed footer while panning'],
  ['#sndfab', 'T', 'the always-on speaker floats above every scrolling pane (like a status bar); rows pass beneath it while scrolling']
]

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 900000 })
const fails = []
let screensSeen = 0, checks = 0

/* screen list: [name, async (p) => void] — each drives the real game through __tk / real buttons */
const ev = (p, f, ...a) => p.evaluate(f, ...a)
const click = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; e.click(); return true }, sel)
async function fresh (p, progress) {
  await ev(p, () => { __tk.reset(); __tk.set('reducedMotion', true); document.documentElement.classList.add('rm') })
  if (progress) await ev(p, () => __tk.unlockAll())
}
const SCREENS = [
  ['home-fresh', async p => { await fresh(p) }],
  ['toast-locked', async p => { await fresh(p); await ev(p, () => __tk.open('vasa')) }],
  ['home', async p => { await fresh(p, true); await click(p, '#scr-room [data-back=home]') }],
  ['ships', async p => { await fresh(p, true); await click(p, '#btn-ships') }],
  ['world', async p => { await fresh(p, true); await ev(p, () => { __tk.map('titanic'); document.querySelector('#scr-map [data-back]').click() }) }],
  ['map-titanic-fresh', async p => { await fresh(p); await ev(p, () => __tk.map('titanic')) }],
  ...['kamar', 'titanic', 'britannic', 'vasa', 'cuttysark', 'victory', 'mayflower', 'endurance', 'kontiki', 'calypso', 'queenmary', 'arizona', 'missouri', 'nautilus', 'pelabuhan']
    .map(w => ['map-' + w, async p => { await fresh(p, true); await ev(p, w => __tk.map(w), w) }]),
  ['kisah', async p => { await fresh(p, true); await ev(p, () => { __tk.map('vasa'); document.getElementById('btn-story').click() }) }],
  ['story', async p => { await fresh(p, true); await ev(p, () => __tk.start('kamar', 0)) }],
  ['chapter-story', async p => { await fresh(p, true); await ev(p, () => __tk.chapter(1)) }],
  ['quiz-mudah', async p => { await fresh(p, true); await ev(p, () => __tk.start('britannic', __qaK('britannic', 'quiz', 0))) }],
  ['quiz-mudah-2', async p => { await fresh(p, true); await ev(p, () => __tk.start('vasa', __qaK('vasa', 'quiz', 1))) }],
  ['quiz-sulit', async p => { await fresh(p, true); await ev(p, () => { __tk.set('level', 'sulit'); __tk.start('britannic', __qaK('britannic', 'quiz', 1)) }) }],
  // Sulit (Pengaturan > Tingkat Soal = Sulit) maths kinds, each mounted in the play host: fractions, money, clock, 3-digit sums
  ...['frac', 'money', 'clock5', 'add3'].map(k => ['sulit-' + k, async p => { await fresh(p, true); await ev(p, k => {
    __tk.set('level', 'sulit'); __tk.start('britannic', __qaK('britannic', 'quiz', 1)); const h = __tk.handle(); try { h && h.destroy && h.destroy() } catch (e) {}
    const host = document.getElementById('play-host'); host.innerHTML = ''
    const r = TKQuiz.rng(7); let q = null; for (let i = 0; i < 400 && !(q && q.kind === k); i++) q = TKQuiz.makeHard(r, { world: 'britannic' })
    TKQuiz.mount(host, [q], { topInset: 70, reducedMotion: true, sound: false, hard: true })
  }, k) }]),
  ['quiz-sulit-2', async p => { await fresh(p, true); await ev(p, () => { __tk.set('level', 'sulit'); __tk.start('queenmary', __qaK('queenmary', 'quiz', 2)) }) }],
  // picture answers (owner: ~30 px icons on a phone): a 4-choice and a 3-choice picture question mounted in the play host
  ...[4, 3].map(n => ['quiz-pics' + n, async p => { await fresh(p, true); await ev(p, n => {
    __tk.start('britannic', __qaK('britannic', 'quiz', 0)); const h = __tk.handle(); try { h && h.destroy && h.destroy() } catch (e) {}
    const host = document.getElementById('play-host'); host.innerHTML = ''
    const q = TKQuestions.items.find(x => x.pics && x.choices.length === n && x.choices.every(c => x.pics[c]))
    TKQuiz.mount(host, [{ ...q, choices: q.choices.slice() }], { topInset: 70, reducedMotion: true, sound: false })
  }, n) }]),
  // Arabic-word answers (three in easy mode): each word stays whole with its marks inside the button
  ['quiz-arab4', async p => { await fresh(p, true); await ev(p, () => {
    __tk.start('britannic', __qaK('britannic', 'quiz', 0)); const h = __tk.handle(); try { h && h.destroy && h.destroy() } catch (e) {}
    const host = document.getElementById('play-host'); host.innerHTML = ''
    const q = TKQuestions.items.find(x => x.choices && x.choices.length === 4 && x.choices.every(c => /[\u0600-\u06FF]/.test(c)) && !x.letters && x.trs)
    TKQuiz.mount(host, [{ ...q, choices: q.choices.slice() }], { topInset: 70, reducedMotion: true, sound: false })
  }) }],
  ['quiz-arab3', async p => { await fresh(p, true); await ev(p, () => {
    __tk.start('britannic', __qaK('britannic', 'quiz', 0)); const h = __tk.handle(); try { h && h.destroy && h.destroy() } catch (e) {}
    const host = document.getElementById('play-host'); host.innerHTML = ''
    const q = TKQuestions.items.find(x => x.choices && x.choices.length >= 3 && x.choices.every(c => /[\u0600-\u06FF]/.test(c)) && !x.letters)
    TKQuiz.mount(host, [{ ...q, choices: q.choices.slice(0, 3).includes(q.answer) ? q.choices.slice(0, 3) : [q.answer].concat(q.choices.filter(c => c !== q.answer).slice(0, 2)) }], { topInset: 70, reducedMotion: true, sound: false, easy: true })
  }) }],
  // Arabic listening item (owner tablet photo 2026-09-29): the word is shown, not only spoken
  ['quiz-listen', async p => { await fresh(p, true); await ev(p, () => {
    __tk.start('britannic', __qaK('britannic', 'quiz', 1)); const h = __tk.handle(); try { h && h.destroy && h.destroy() } catch (e) {}
    const host = document.getElementById('play-host'); host.innerHTML = ''
    const q = TKQuestions.items.find(x => x.listen && /safiinah/.test(x.tr)) || TKQuestions.items.find(x => x.listen)
    TKQuiz.mount(host, [{ ...q, choices: q.choices.slice() }], { topInset: 70, reducedMotion: true, sound: false })
  }) }],
  ['quiz-chapter', async p => { await fresh(p, true); await ev(p, () => __tk.chapter(3, 0)) }],
  ['goal-card', async p => { await fresh(p, true); await ev(p, () => { __tk.start('britannic', __qaK('britannic', 'quiz', 0)); document.getElementById('lvchip').click() }) }],
  ['sort', async p => { await fresh(p, true); await ev(p, () => __tk.start('britannic', __qaK('britannic', 'sort', 0))) }],
  ['grid-tutorial', async p => { await fresh(p, true); await ev(p, () => __tk.start('kamar', 1)) }],
  ['grid', async p => { await fresh(p, true); await ev(p, () => __tk.start('britannic', __qaK('britannic', 'grid', 0))) }],
  ['grid-chapter', async p => { await fresh(p, true); await ev(p, () => __tk.chapter(7, 0)) }],
  ['pause', async p => { await fresh(p, true); await ev(p, () => __tk.start('britannic', __qaK('britannic', 'quiz', 0))); await sleep(300); await click(p, '#btn-pause') }],
  ['reward', async p => { await fresh(p, true); await ev(p, () => { __tk.start('britannic', __qaK('britannic', 'quiz', 0)); __tk.finish(3) }) }],
  ['reward-kamar', async p => { await fresh(p); await ev(p, () => { __tk.start('kamar', 3); __tk.finish(2) }) }],
  ...['kapal', 'kompas', 'kartu', 'capaian', 'belajar'].map(t => ['room-' + t, async p => { await fresh(p, true); await ev(p, t => __tk.room(t), t) }]),
  ...['profil', 'audio', 'tampilan', 'permainan', 'bahasa', 'ortu', 'bantuan', 'tentang'].map(t => ['settings-' + t, async p => {
    await fresh(p, true); await click(p, '#btn-settings'); await sleep(200); await click(p, `#scr-settings [data-go="${t}"]`)
  }]),
  ['parent-gate', async p => { await fresh(p, true); await click(p, '#btn-parent') }]
]

/* ── in-page audit ─────────────────────────────────────────────────────── */
const AUDIT = (EX) => {
  const out = [], vw = innerWidth, vh = innerHeight, tablet = Math.min(vw, vh) >= 600, FMIN = tablet ? 14 : 12
  const ex = (e, k) => EX.some(([s, ks]) => ks.includes(k) && (() => { try { return e.matches(s) } catch (_) { return false } })())
  const name = e => (e.id ? '#' + e.id : e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '')) + (e.parentElement && !e.id ? ' < ' + (e.parentElement.id ? '#' + e.parentElement.id : (typeof e.parentElement.className === 'string' ? e.parentElement.className.split(' ')[0] : '')) : '')
  // topmost layer: a shown overlay / goal card replaces the screen underneath
  const layers = [...document.querySelectorAll('.overlay.show, .gocard.show')]
  const inScope = e => {
    if (e.closest('.toast.show')) return true
    if (layers.length) return layers.some(l => l.contains(e))
    return !!e.closest('.scr.active, .sndfab')
  }
  const visible = e => {
    const r = e.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) return false
    if (r.right <= 0 || r.bottom <= 0 || r.left >= vw || r.top >= vh) return false
    for (let a = e; a && a !== document.documentElement; a = a.parentElement) {
      const cs = getComputedStyle(a)
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return false
    }
    return inScope(e)
  }
  // hidden by a clipping ancestor entirely (e.g. a card scrolled out of its list)
  const clippers = e => { const c = []; for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') c.push([a, cs]) } return c }
  const fullyClipped = (r, cl) => cl.some(([a]) => { const q = a.getBoundingClientRect(); return r.right <= q.left + 1 || r.left >= q.right - 1 || r.bottom <= q.top + 1 || r.top >= q.bottom - 1 })
  const all = [...document.body.querySelectorAll('*')].filter(e => !/^(SCRIPT|STYLE|BR|path|circle|rect|g|line|polygon|polyline|ellipse|defs|use|stop|lineargradient|radialgradient|clippath|mask)$/i.test(e.tagName))
  const vis = all.filter(visible)
  // F + O: text
  for (const e of vis) {
    const own = [...e.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim())
    if (!own.length) continue
    const r = e.getBoundingClientRect(), cl = clippers(e)
    if (fullyClipped(r, cl)) continue
    const cs = getComputedStyle(e), txt0 = 0
    // SVG text (the clock face numerals) is drawn in viewBox units: its size on screen is the font size x the SVG's scale
    let fs = parseFloat(cs.fontSize)
    const svg = e.ownerSVGElement; if (svg && svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width) fs = +(fs * svg.getBoundingClientRect().width / svg.viewBox.baseVal.width).toFixed(1)
    const txt = own.map(n => n.textContent.trim()).join(' ').slice(0, 28)
    if (fs < FMIN - 0.25 && !ex(e, 'F')) out.push(`F ${fs}px < ${FMIN} "${txt}" ${name(e)}`)
    if (ex(e, 'O') || e.ownerSVGElement) continue   // SVG text has no CSS box: V covers it
    if (cs.display !== 'inline') {
      const ox = cs.overflowX, oy = cs.overflowY
      if (e.scrollWidth > e.clientWidth + 1 && ox !== 'auto' && ox !== 'scroll') out.push(`O text wider than its box (${e.scrollWidth}>${e.clientWidth}) "${txt}" ${name(e)}`)
      else if (e.scrollHeight > e.clientHeight + 2 && oy !== 'auto' && oy !== 'scroll' && (oy !== 'visible' || cs.webkitLineClamp !== 'none')) out.push(`O text taller than its box (${e.scrollHeight}>${e.clientHeight}) "${txt}" ${name(e)}`)
      if (cs.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth + 1) out.push(`O ellipsis truncates "${txt}" ${name(e)}`)
    }
    // every text run inside the nearest non-inline box and inside every clipping ancestor
    for (const n of own) {
      const rg = document.createRange(); rg.selectNodeContents(n); const tr = rg.getBoundingClientRect()
      if (!tr.width) continue
      for (const [a, acs] of cl) {
        if (acs.overflowX === 'auto' || acs.overflowX === 'scroll' || acs.overflowY === 'auto' || acs.overflowY === 'scroll') break
        const q = a.getBoundingClientRect()
        if (tr.left < q.left - 1.5 || tr.right > q.right + 1.5 || tr.top < q.top - 1.5 || tr.bottom > q.bottom + 1.5) { out.push(`O text cut by ${name(a)} "${n.textContent.trim().slice(0, 28)}"`); break }
      }
      if (tr.right > vw + 1 || tr.left < -1 || tr.bottom > vh + 1 || tr.top < -1) if (!ex(e, 'X') && !cl.some(([, c]) => /auto|scroll/.test(c.overflowX + c.overflowY))) out.push(`X text off screen "${n.textContent.trim().slice(0, 28)}" ${name(e)}`)
    }
  }
  // C: images / sprites cut by an overflow:hidden ancestor
  for (const e of vis) {
    const isImg = e.tagName === 'IMG' || e.tagName === 'CANVAS' || (e.classList.contains('ico') && getComputedStyle(e).backgroundImage !== 'none')
    if (!isImg || ex(e, 'C')) continue
    if (e.tagName === 'IMG' && (!e.complete || !e.naturalWidth)) { if (e.getAttribute('src')) out.push(`E image failed to load ${e.getAttribute('src').slice(-40)}`); continue }
    const r = e.getBoundingClientRect(), cl = clippers(e)
    if (fullyClipped(r, cl)) continue
    for (const [a, acs] of cl) {
      const scroll = /auto|scroll/.test(acs.overflowX + acs.overflowY)
      if (scroll) break
      const q = a.getBoundingClientRect(), tol = 2
      const cut = (acs.overflowX !== 'visible' && (r.left < q.left - tol || r.right > q.right + tol)) || (acs.overflowY !== 'visible' && (r.top < q.top - tol || r.bottom > q.bottom + tol))
      if (cut) { out.push(`C sprite ${name(e)} ${Math.round(r.width)}x${Math.round(r.height)} cut by ${name(a)}`); break }
    }
    if ((r.left < -2 || r.right > vw + 2 || r.top < -2 || r.bottom > vh + 2) && !ex(e, 'X') && !cl.some(([, c]) => /auto|scroll/.test(c.overflowX + c.overflowY))) out.push(`X sprite off screen ${name(e)} [${[r.left, r.top, r.right, r.bottom].map(Math.round)}]`)
  }
  // visible part of each rect: cut by every clipping / scrolling ancestor (a card scrolled under a footer is not an overlap)
  const visRect = e => { const r = e.getBoundingClientRect(); let l = r.left, t = r.top, rr = r.right, b = r.bottom
    for (const [a, cs] of clippers(e)) { const q = a.getBoundingClientRect(); if (cs.overflowX !== 'visible') { l = Math.max(l, q.left); rr = Math.min(rr, q.right) } if (cs.overflowY !== 'visible') { t = Math.max(t, q.top); b = Math.min(b, q.bottom) } }
    return { left: l, top: t, right: rr, bottom: b } }
  // V: a picture inside a card (the Sulit clock, a fraction cake, a scene sprite) never covers the card's own text
  const texts = vis.filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()))
  for (const pic of vis.filter(e => /^(IMG|svg|CANVAS)$/i.test(e.tagName) && e.closest('.tkq-card, .reward, .tkh-card, .detail') && !ex(e, 'V'))) {
    const a = visRect(pic); if (a.right - a.left < 24 || a.bottom - a.top < 24) continue
    for (const t of texts) {
      if (t.contains(pic) || pic.contains(t) || t.closest('svg') === pic) continue
      if (t.closest('.tkq-card, .reward, .tkh-card, .detail') !== pic.closest('.tkq-card, .reward, .tkh-card, .detail')) continue   // a fixed footer button over a scrolled card is T's business
      const rg = document.createRange(); rg.selectNodeContents(t); const b = rg.getBoundingClientRect()
      const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left), iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
      if (ix > 4 && iy > 4) { out.push(`V picture ${name(pic)} covers text "${t.textContent.trim().slice(0, 24)}"`); break }
    }
  }
  // T: live interactive elements
  const inter = vis.filter(e => e.matches('button, a[href], [role=button], input, select, textarea, [tabindex="0"]') && !e.disabled)
  const live = inter.filter(e => {
    if (ex(e, 'T')) return false
    const r = e.getBoundingClientRect(), cl = clippers(e)
    if (fullyClipped(r, cl)) return false
    const x = Math.min(Math.max(r.left + r.width / 2, 1), vw - 1), y = Math.min(Math.max(r.top + r.height / 2, 1), vh - 1)
    const h = document.elementFromPoint(x, y)
    return h && (e.contains(h) || h.contains(e))
  })
  const R = live.map(visRect), RAW = live.map(e => e.getBoundingClientRect())
  live.forEach((e, i) => {
    const r = R[i], raw = RAW[i]
    if (Math.min(raw.width, raw.height) < 43.5) out.push(`T tap target ${Math.round(raw.width)}x${Math.round(raw.height)} < 44 ${name(e)} "${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 20)}"`)
    if ((r.left < -1 || r.right > vw + 1 || r.top < -1 || r.bottom > vh + 1) && !ex(e, 'X') && !clippers(e).some(([, c]) => /auto|scroll/.test(c.overflowX + c.overflowY))) out.push(`X button off screen ${name(e)} [${[r.left, r.top, r.right, r.bottom].map(Math.round)}]`)
    for (let j = i + 1; j < live.length; j++) {
      const o = R[j], f = live[j]
      if (e.contains(f) || f.contains(e)) continue
      const ix = Math.min(r.right, o.right) - Math.max(r.left, o.left), iy = Math.min(r.bottom, o.bottom) - Math.max(r.top, o.top)
      if (ix > 2 && iy > 2) out.push(`T overlap ${name(e)} x ${name(f)} (${Math.round(ix)}x${Math.round(iy)})`)
    }
  })
  // P: picture answers on a phone portrait
  if (vw < 600 && vh > vw) document.querySelectorAll('.tkq-opt img').forEach(im => { const b = im.getBoundingClientRect(); if (b.width && visible(im) && Math.min(b.width, b.height) < 55.5) out.push(`P picture answer ${Math.round(b.width)}x${Math.round(b.height)} < 56`) })
  // Q: a quiz on a landscape tablet keeps both guides whole on screen — Timmy and the old Kapten (owner photo: the Kapten
  // cut at the right edge, Timmy missing)
  if (vw >= 1000 && vh >= 700 && document.querySelector('.scr.active .tkq:not(.tkq-sort)') && !layers.length) {
    for (const who of ['Timmy', 'Kapten']) {
      const im = [...document.querySelectorAll('.tkq img')].find(i => i.alt === who && visible(i))
      if (!im) { out.push(`Q ${who} missing beside the quiz`); continue }
      const b = im.getBoundingClientRect(); if (b.left < -1 || b.right > vw + 1 || b.bottom > vh + 1) out.push(`Q ${who} cut by the screen edge [${[b.left, b.right].map(Math.round)}]`)
    }
  }
  // G: the grid (command) game on a landscape tablet keeps its controls in proportion to the board (owner photo 2026-09-29):
  // command / action buttons >= 64 px, JALAN! >= 72 px tall and the biggest action, route slots >= 60 px, tip text >= 16 px,
  // the title >= 26 px and the plate no wider than its words need
  const tkg = document.querySelector('.scr.active .tkg')
  if (tkg && vw >= 1000 && vh >= 700 && !layers.length) {
    const sz = s => [...tkg.querySelectorAll(s)].filter(visible).map(e => e.getBoundingClientRect())
    sz('.tkg-pal .tkg-chip, .tkg-cact .tkg-btn').forEach(b => { if (Math.min(b.width, b.height) < 63.5) out.push(`G command button ${Math.round(b.width)}x${Math.round(b.height)} < 64`) })
    const go = sz('.tkg-go')[0]; if (go && go.height < 71.5) out.push(`G JALAN! ${Math.round(go.height)} px tall < 72`)
    sz('.tkg-slots .tkg-slot, .tkg-slots .tkg-pchip').slice(0, 3).forEach(b => { if (Math.min(b.width, b.height) < 59.5) out.push(`G route slot ${Math.round(b.width)} px < 60`) })
    const tip = tkg.querySelector('.tkg-tip'); if (tip && visible(tip) && parseFloat(getComputedStyle(tip).fontSize) < 15.5) out.push(`G tip text ${getComputedStyle(tip).fontSize} < 16`)
    const pb = tkg.querySelector('.tkg-plate b'); if (pb && visible(pb)) {
      if (parseFloat(getComputedStyle(pb).fontSize) < 25.5) out.push(`G plate title ${getComputedStyle(pb).fontSize} < 26`)
      const pl = pb.closest('.tkg-plate').getBoundingClientRect(), rg = document.createRange(); rg.selectNodeContents(pb); const tw = rg.getBoundingClientRect().width
      if (pl.width > Math.max(tw, 200) * 1.8 + 80) out.push(`G plate ${Math.round(pl.width)} px wide for ${Math.round(tw)} px of title (empty parchment)`)
    }
  }
  // H: the first-visit hand must stay whole and leave the primary CTA words readable.
  const start = document.querySelector('#btn-start'), hand = document.querySelector('.tk-hand')
  if (start && hand && visible(start) && getComputedStyle(hand).opacity !== '0') {
    const words = [...start.querySelectorAll('#start-t, #start-sub')].filter(n => n.textContent.trim()).map(n => { const r = document.createRange(); r.selectNodeContents(n); return r.getBoundingClientRect() })
    for (const part of hand.querySelectorAll('.hp > i')) {
      const r = part.getBoundingClientRect()
      if (r.left < -1 || r.right > vw + 1 || r.top < -1 || r.bottom > vh + 1) out.push('H first-visit hand clipped at viewport')
      if (words.some(b => r.left < b.right - 1 && r.right > b.left + 1 && r.top < b.bottom - 1 && r.bottom > b.top + 1)) out.push('H first-visit hand covers primary label')
    }
  }
  // X: page scroll
  if (document.scrollingElement.scrollWidth > vw + 1) out.push(`X horizontal page scroll ${document.scrollingElement.scrollWidth} > ${vw}`)
  // K: copy
  const copy = document.body.innerText + ' ' + [...document.querySelectorAll('[alt],[aria-label],[title]')].map(e => (e.getAttribute('alt') || '') + ' ' + (e.getAttribute('aria-label') || '') + ' ' + (e.getAttribute('title') || '')).join(' ')
  if (/kapten\s+pinguin/i.test(copy)) out.push('K "Kapten Pinguin" in the copy')
  return { out, n: vis.length }
}

for (const [w, h] of SIZES) {
  const p = await browser.newPage()
  const errs = []
  p.on('pageerror', e => errs.push('pageerror ' + e.message))
  p.on('requestfailed', r => { if (!/favicon|sw-reload|\.mp3/.test(r.url())) errs.push('requestfailed ' + r.url().split('/').slice(-2).join('/')) })
  p.on('response', r => { if (r.status() >= 400) errs.push('HTTP ' + r.status() + ' ' + r.url().split('/').slice(-2).join('/')) })
  await p.evaluateOnNewDocument(() => { window.__TK_NO_WARM = true
    // the level list changes as worlds grow: find the n-th level of a type instead of hard-coding its index
    window.__qaK = (w, type, n) => { const L = TKWorlds.WORLDS.find(x => x.id === w).levels; let c = n || 0; for (let i = 0; i < L.length; i++) if (L[i].type === type && !c--) return i; return 0 } })
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await p.setViewport({ width: w, height: h, deviceScaleFactor: w === 1280 && h === 800 ? 2 : 1, isMobile: w < 1000, hasTouch: true })
  await p.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  await ev(p, () => document.fonts.ready.then(() => 1))
  const seen = new Set()
  for (const [nm, go] of SCREENS) {
    if (ONLY && !ONLY.some(o => nm.includes(o))) continue
    errs.length = 0
    try { await go(p) } catch (e) { fails.push(`${w}x${h} ${nm}: could not open (${e.message.split('\n')[0]})`); continue }
    await sleep(900)
    try { await p.waitForNetworkIdle({ idleTime: 250, timeout: 4000 }) } catch (e) {}
    if (process.env.QA_BREAK_V && nm === 'sulit-clock5') { await ev(p, () => { const st = document.createElement('style'); st.textContent = '.tkq-scene>svg.tkq-clock{max-height:none!important;min-width:260px!important;min-height:260px!important}'; document.head.appendChild(st) }); await sleep(800) }
    if (process.env.QA_BREAK && nm === 'home') await ev(p, () => { const st = document.createElement('style'); st.id = 'qa-break'; st.textContent = '#btn-ships span{font-size:10px!important}'; document.head.appendChild(st) }); await sleep(1500)
    const r = await ev(p, AUDIT, EXEMPT)
    screensSeen++; checks += r.n
    const msgs = r.out.concat(errs)
    const fresh = msgs.filter(m => { const k = nm + '|' + m; if (seen.has(k)) return false; seen.add(k); return true })
    if (fresh.length) { console.log(`${w}x${h} ${nm}: ${fresh.length} findings`); fresh.slice(0, 14).forEach(m => console.log('   ' + m)) }
    fresh.forEach(m => fails.push(`${w}x${h} ${nm}: ${m}`))
    if (process.env.QA_SAVE_ALL || (w === 1280 && h === 800) || (w === 390 && h === 844)) await p.screenshot({ path: `${SHOTS}/${w}x${h}-${nm}.png` })
    // leave any running level cleanly
    await ev(p, () => { try { if (document.body.getAttribute('data-scr') === 'scr-play') document.getElementById('p-home').click() } catch (e) {} try { const ps = document.getElementById('pause'); ps.className = 'overlay'; document.getElementById('parent').className = 'overlay'; document.getElementById('cards').className = 'overlay' } catch (e) {} })
  }
  await p.close()
}
await browser.close()
console.log(fails.length ? `qa-tk-ui-audit: FAIL ${fails.length} findings (${screensSeen} screen visits, ${checks} elements)` : `PASS qa-tk-ui-audit: ${screensSeen} screen visits at ${SIZES.length} sizes, ${checks} visible elements checked`)
process.exit(fails.length ? 1 : 0)
