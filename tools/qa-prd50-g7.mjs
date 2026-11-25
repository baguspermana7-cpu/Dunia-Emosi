#!/usr/bin/env node
// qa-prd50-g7 — PRD-50 (docs/prd/PRD-50-g7-tebak-gambar.md): G7 Tebak Gambar asks pictures from the shared sprite
// library only (DBLabeled assets/db/<cat>/NNN.webp + the TKQuestions/G11 names of assets/db/lib/<key>.webp).
//   L1 the bank has >= 150 items, each with a sprite and a name, none an emoji; a whole session renders 0 emoji and every
//      picture on screen loaded (naturalWidth > 0)
//   L2 every decoy comes from the answer's own group
//   L3 no listen round at all, with or without an id-ID voice (PRD-55, owner 2026-11-22: nothing read aloud; it was
//      every 3rd round when a voice existed)
//   L4 one session (real taps on the right answer) never asks the same item twice; both picture->word and
//      word->picture rounds are asked; each answer is reported once (DuniaBus 'answer', game g7, skill gambar)
//   L5 390x844, 844x390, 800x1280: choices >= 48 px, on screen; screenshots (QA_SHOTS=dir) of each round kind looked at
// Usage: QA_BASE=http://127.0.0.1:8081 node tools/qa-prd50-g7.mjs
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'
const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, ''), SH = process.env.QA_SHOTS
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }
const NOISE = /favicon|googleapis|gstatic/i
if (SH) fs.mkdirSync(SH, { recursive: true })
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-audio-output'] })

async function session (size, voice, level = 14) {   // level 14 = medium: both picture->word and word->picture
  const c = await b.createBrowserContext(), p = await c.newPage(), errs = []
  p.on('pageerror', e => { if (!NOISE.test(e.message)) errs.push(e.message) })
  await p.setViewport({ width: size[0], height: size[1], isMobile: true, hasTouch: true })
  await p.evaluateOnNewDocument(voice => {
    if (!sessionStorage.__s) {
      localStorage.clear(); localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: 'tumbuh' }]))
      localStorage.setItem('dunia-active-slot', '[0,1]'); localStorage.setItem('dunia-emosi-sound', voice ? 'on' : 'off'); sessionStorage.__s = 1
    }
    window.__said = []; window.__ans = []
    addEventListener('dunia:answer', e => window.__ans.push(e.detail))
    if (voice && window.speechSynthesis) {   // an Indonesian voice, and speech recorded instead of played
      speechSynthesis.getVoices = () => [{ lang: 'id-ID', name: 'Indonesian', default: true, localService: true, voiceURI: 'id' }]
      speechSynthesis.speak = () => {}
      // the stub voice is a plain object, which a real utterance refuses; record what the game asks DuniaSpeak to say
      const hook = () => { if (window.DuniaSpeak && !DuniaSpeak.__qa) { DuniaSpeak.say = t => { window.__said.push(String(t)); return true }; DuniaSpeak.__qa = 1 } }
      document.addEventListener('DOMContentLoaded', hook); addEventListener('load', hook)
    }
  }, voice)
  await p.goto(BASE + '/index.html?nocine=1', { waitUntil: 'load', timeout: 120000 })
  await p.waitForFunction(() => typeof window.startGameWithLevel === 'function', { timeout: 60000 }); await sleep(600)
  await p.evaluate(lv => { state.players = [{ name: 'Ana', animal: '🦁', ageTier: 'tumbuh', stars: 0 }, { name: 'Bima', animal: '🐯', ageTier: 'tumbuh', stars: 0 }]; state.mode = 'solo'; state.currentPlayer = 0; state.currentGame = 7; startGameWithLevel(lv) }, level)
  await p.waitForFunction(() => !!window.TKQuestions, { timeout: 15000 }).catch(() => {})   // G7 loads the Timmy names on its first start
  const bank = await p.evaluate(() => {
    const pool = typeof g7BuildPool === 'function' ? g7BuildPool() : []
    const emo = /\p{Extended_Pictographic}/u
    return { n: pool.length, noSrc: pool.filter(x => !x.src).length, emoji: pool.filter(x => x.emoji || emo.test(x.word || '')).length, noGroup: pool.filter(x => !x.group).length }
  })
  const rounds = [], shots = {}
  for (let k = 0; k < 40; k++) {
    const done = await p.evaluate(() => { const r = document.getElementById('screen-result'); return !!(r && r.classList.contains('active')) })
    if (done) break
    const live = await p.waitForFunction(() => typeof g7State !== 'undefined' && g7State.shuffled && !g7State.answered && document.querySelector('.g7-choice-btn'), { timeout: 8000 }).then(() => true).catch(() => false)
    if (!live) { await sleep(500); continue }
    // pictures load: wait for them (a fixed 900 ms failed on a busy machine with the files on disk); a picture that
    // truly fails stays complete with naturalWidth 0 and is still reported below after 8 s
    await p.waitForFunction(() => [...document.querySelectorAll('#screen-game7 img')].filter(i => i.getClientRects().length).every(i => i.complete && i.naturalWidth > 0), { timeout: 8000 }).catch(() => {})
    const r = await p.evaluate(() => {
      const s = g7State, scr = document.getElementById('screen-game7'), emo = /\p{Extended_Pictographic}/u
      const vis = el => { const st = getComputedStyle(el); return st.display !== 'none' && st.visibility !== 'hidden' && el.getClientRects().length }
      let txt = ''; const w = document.createTreeWalker(scr, NodeFilter.SHOW_TEXT); let n
      while ((n = w.nextNode())) if (n.parentElement && vis(n.parentElement)) txt += n.textContent
      const imgs = [...scr.querySelectorAll('img')].filter(vis)
      const btns = [...document.querySelectorAll('.g7-choice-btn')].map(b => { const q = b.getBoundingClientRect(); return { id: b.dataset.id, w: b.offsetWidth, h: b.offsetHeight, on: q.left >= 0 && q.right <= innerWidth + 1 && q.top >= 0 && q.bottom <= innerHeight + 1, words: (b.textContent || '').trim(), img: !!b.querySelector('img') } })
      return { id: s.cur && s.cur.id, group: s.cur && s.cur.group, groups: (s.choiceGroups || []), mode: s.mode, listen: !!document.getElementById('g7-listen'),
        emoji: emo.test(txt), broken: imgs.filter(i => !(i.complete && i.naturalWidth > 0)).map(i => i.getAttribute('src')), btns }
    })
    rounds.push(r)
    if (SH && !shots[r.mode]) { shots[r.mode] = 1; await p.screenshot({ path: path.join(SH, `g7-${r.mode}-${size[0]}x${size[1]}.png`) }) }
    const h = await p.$(`.g7-choice-btn[data-id="${r.id}"]`)
    if (!h) { await sleep(500); continue }
    await h.evaluate(e => e.scrollIntoView({ block: 'center' })); await sleep(250)
    const bx = await h.boundingBox(); await p.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2)
    await sleep(2200)
  }
  // the longest word of the bank, asked as a word->picture round: it fits inside its box
  const fit = await p.evaluate(() => {
    const pool = g7BuildPool(), long = pool.slice().sort((a, b) => b.word.length - a.word.length)[0]
    g7State.shuffled = [long, ...pool.filter(x => x.id !== long.id)]; g7State.usedIds = new Set(); g7State.maxRound = 10; g7State.round = 6
    state.selectedLevel = 'medium'; const ca = window.duniaCanListen; window.duniaCanListen = () => false
    try { showScreen('screen-game7'); nextG7Round() } finally { window.duniaCanListen = ca }
    const d = document.getElementById('g7-display'), sp = d.querySelector('span'), a = d.getBoundingClientRect(), b = sp && sp.getBoundingClientRect()
    return { word: long.word, mode: g7State.mode, fits: !!b && b.left >= a.left - 1 && b.right <= a.right + 1 && sp.scrollWidth <= sp.clientWidth + 1 && a.right <= innerWidth && a.left >= 0, box: Math.round(a.width), text: b && Math.round(b.width) }
  })
  const out = { fit, bank, rounds, ans: await p.evaluate(() => window.__ans.filter(a => a.game === 'g7')), said: await p.evaluate(() => window.__said), errs }
  await c.close()
  return out
}

const A = await session([390, 844], true)
ok(A.bank.n >= 150 && !A.bank.noSrc && !A.bank.emoji && !A.bank.noGroup, `L1 bank: ${JSON.stringify(A.bank)}`)
const emojiR = A.rounds.filter(r => r.emoji).length, broken = A.rounds.flatMap(r => r.broken)
ok(A.rounds.length >= 5 && !emojiR && !broken.length, `L1 session ${A.rounds.length} rounds: emoji in ${emojiR} rounds, broken pictures ${JSON.stringify(broken.slice(0, 3))}`)
const badDecoy = A.rounds.filter(r => r.groups.length !== 4 || r.groups.some(g => g !== r.group))
ok(A.rounds.length && !badDecoy.length, `L2 decoys from the answer's group: ${badDecoy.length} bad of ${A.rounds.length} (e.g. ${JSON.stringify(badDecoy[0] && { group: badDecoy[0].group, groups: badDecoy[0].groups })})`)
const lis = A.rounds.map((r, i) => r.mode === 'listen' ? i + 1 : 0).filter(Boolean)
const lisOk = A.rounds.filter(r => r.mode === 'listen').every(r => r.listen && r.btns.every(x => x.img && !x.words))
// PRD-55 (owner 2026-11-22): nothing is read aloud, so even with an id-ID voice there is no listen round
ok(!lis.length && lisOk && !A.said.length, `L3 with an id-ID voice (PRD-55): listen rounds ${JSON.stringify(lis)}, pictures without words ${lisOk}, spoken ${JSON.stringify(A.said.slice(0, 4))}`)
const ids = A.rounds.map(r => r.id), modes = new Set(A.rounds.map(r => r.mode))
ok(new Set(ids).size === ids.length && modes.has('img2word') && modes.has('word2img') && A.ans.length === A.rounds.length && A.ans.every(a => a.skill === 'gambar') && !A.errs.length,
  `L4 one session: ${ids.length} rounds, ${new Set(ids).size} different items, modes ${[...modes]}, answers reported ${A.ans.length}, errors ${A.errs.slice(0, 2).join(' | ') || 0}`)
const B = await session([844, 390], false)
ok(B.rounds.length >= 5 && !B.rounds.some(r => r.mode === 'listen' || r.listen), `L3 no id-ID voice (sound off): listen rounds ${B.rounds.filter(r => r.mode === 'listen').length} of ${B.rounds.length}`)
for (const [tag, S] of [['390x844', A], ['844x390', B], ['800x1280', await session([800, 1280], true)]]) {
  const small = S.rounds.flatMap(r => r.btns).filter(x => x.w < 48 || x.h < 48 || !x.on)
  ok(S.rounds.length && !small.length && S.fit.fits && S.fit.mode === 'word2img' && !S.errs.length, `L5 ${tag}: choices < 48 px or off screen ${small.length} (${JSON.stringify(small[0] || null)}), longest word ${JSON.stringify(S.fit)}, errors ${S.errs.length}`)
}
await b.close()
console.log(`qa-prd50-g7: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
