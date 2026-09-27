// G27 "Ask the Judge" gate — spelling-bee asks (definition, part of speech, sentence).
// Real touch taps at phone/tablet sizes in both orientations:
//   - the Ask button is on the play screen and opens the panel;
//   - each ask plays ITS clip (definitions/<w>, pos/<pos>, sentences/<w>, words/<w>) and
//     that clip is really served (200) and decodes;
//   - the sentence text shows the word as a blank — nothing on the panel spells the word;
//   - the panel fits the viewport, every button is >= 44px and the top element at its centre;
//   - closing the panel stops the voice.
// Needs the dev server on :8081.
import puppeteer from 'puppeteer'

const sleep = ms => new Promise(r => setTimeout(r, ms))
const fails = []
const check = (ok, msg) => { console.log((ok ? '✅ ' : '❌ ') + msg); if (!ok) fails.push(msg) }
const SIZES = [[390, 844], [360, 640], [844, 390], [1024, 768]]
const WORDS = ['scissors', 'quran', 'blue']
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] })

try {
  for (const [w, h] of SIZES) {
    const tag = `${w}x${h}`
    const p = await b.newPage()
    await p.setViewport({ width: w, height: h, isMobile: true, hasTouch: true })
    const errs = [], bad = []
    p.on('pageerror', e => errs.push(e.message))
    p.on('response', r => { if (/\/audio\//.test(r.url()) && r.status() >= 400) bad.push(r.status() + ' ' + r.url()) })
    await p.evaluateOnNewDocument(() => {
      window.__played = []
      const play = HTMLMediaElement.prototype.play
      window.__els = new Set()
      HTMLMediaElement.prototype.play = function () { window.__els.add(this); if (!this.muted) window.__played.push(this.src.replace(/^.*\/audio\//, '')); return play.apply(this, arguments) }
    })
    const cdp = await p.target().createCDPSession(); await cdp.send('Network.setBypassServiceWorker', { bypass: true })
    for (const t of [45000, 120000]) { try { await p.goto('http://localhost:8081/games/ejaan-inggris.html', { waitUntil: 'networkidle2', timeout: t }); break } catch (_) {} }
    await sleep(900)
    for (const word of WORDS) {
      await p.evaluate(wd => { window.__g27.closeAll(); window.__g27.startWord(wd) }, word); await sleep(700)
      const askBtn = await p.evaluate(() => { const e = document.getElementById('btn-ask'); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, top: document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest('#btn-ask') === e } })
      check(askBtn.top && askBtn.w >= 44 && askBtn.h >= 44, `${tag} ${word}: Ask button tappable (${Math.round(askBtn.w)}x${Math.round(askBtn.h)})`)
      await p.touchscreen.tap(askBtn.x, askBtn.y); await sleep(300)
      const lay = await p.evaluate(() => {
        const pn = document.querySelector('#ov-ask .panel').getBoundingClientRect()
        const btns = [...document.querySelectorAll('#ask-btns .askb')].map(e => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height, top: document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest('.askb') === e } })
        return { open: document.getElementById('ov-ask').classList.contains('show'), fits: pn.top >= 0 && pn.left >= 0 && pn.bottom <= innerHeight + 0.5 && pn.right <= innerWidth + 0.5, btns }
      })
      check(lay.open && lay.fits, `${tag} ${word}: panel opens and fits the screen`)
      check(lay.btns.length === 4 && lay.btns.every(x => x.w >= 44 && x.h >= 44 && x.top), `${tag} ${word}: 4 ask buttons, each >= 44px and on top`)
      const pos = await p.evaluate(wd => SpellingData.find(wd).pos, word)
      for (const [ask, want] of [['definition', `definitions/${word}.webm`], ['pos', `pos/${pos}.webm`], ['sentence', `sentences/${word}.webm`], ['again', `words/${word}.webm`]]) {
        await p.evaluate(() => { window.__played = [] })
        const c = await p.evaluate(a => { const e = document.querySelector(`#ask-btns [data-ask="${a}"]`).getBoundingClientRect(); return { x: e.left + e.width / 2, y: e.top + e.height / 2 } }, ask)
        await p.touchscreen.tap(c.x, c.y); await sleep(600)
        const r = await p.evaluate(wd => ({ played: window.__played.slice(), text: document.getElementById('ask-answer').textContent, gap: !!document.querySelector('#ask-answer .gap'), panel: document.getElementById('ov-ask').innerText.toLowerCase(), wd }), word)
        check(r.played.includes(want), `${tag} ${word}: "${ask}" plays ${want} (${r.played.join(', ') || 'nothing'})`)
        check(!new RegExp('\\b' + word + '\\b').test(r.panel), `${tag} ${word}: after "${ask}" nothing on the panel spells "${word}"`)
        if (ask === 'sentence') check(r.gap && r.text.trim().length > 8, `${tag} ${word}: sentence shown with the word as a blank ("${r.text.trim()}")`)
      }
      // start the longest answer, then close mid-sentence: the voice must stop with the panel
      await p.evaluate(() => document.querySelector('#ask-btns [data-ask="sentence"]').click()); await sleep(250)
      await p.evaluate(() => document.querySelector('#ov-ask .xbtn').click()); await sleep(200)
      const st = await p.evaluate(() => ({ hidden: !document.getElementById('ov-ask').classList.contains('show'), playing: [...window.__els].filter(a => !a.paused && !a.muted && /\/audio\//.test(a.src)).length }))
      check(st.hidden && st.playing === 0, `${tag} ${word}: closing the panel hides it and stops the voice (${st.playing} still playing)`)
    }
    const dec = await p.evaluate(async () => {
      const out = []
      for (const k of ['definitions/scissors', 'sentences/quran', 'pos/noun', 'pos/adjective']) {
        const a = new Audio(window.__g27.audioURL(k.split('/')[0], k.split('/')[1]))
        const ok = await new Promise(r => { a.onloadedmetadata = () => r(a.duration > 0.3); a.onerror = () => r(false); setTimeout(() => r(false), 8000) })
        out.push(k + ':' + ok)
      }
      return out
    })
    check(dec.every(x => x.endsWith('true')), `${tag}: ask clips decode (${dec.join(' ')})`)
    check(bad.length === 0, `${tag}: no audio 404s${bad.length ? ' — ' + bad.slice(0, 3).join(' | ') : ''}`)
    check(errs.length === 0, `${tag}: no page errors${errs.length ? ' — ' + errs.slice(0, 2).join(' | ') : ''}`)
    await p.close()
  }
} finally { await b.close() }
console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
