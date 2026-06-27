#!/usr/bin/env node
/* =============================================================================
 * tools/probe-train-bgm.mjs   (v55.25 — Thomas BGM swap verification)
 * =============================================================================
 * For each of the 3 train games with BGM (g14, g15, g16):
 *   1. Open page, settle.
 *   2. Read window.TrainBGM — confirm helper loaded.
 *   3. Simulate Casey JR selection → confirm SRC stays on train-bgm.mp3.
 *   4. Simulate Thomas selection → confirm SRC swaps to Thomas track.
 *   5. Read audio.volume — confirm in 0.30-0.50 range for Thomas.
 *   6. Confirm only ONE <audio> element exists, only ONE plays at a time.
 * ========================================================================== */
import puppeteer from 'puppeteer'

const BASE = 'http://localhost:8081'
const VP = { width: 412, height: 915, deviceScaleFactor: 1 }
const wait = (ms) => new Promise(r => setTimeout(r, ms))

const findings = []
function note(test, pass, msg) {
  const tag = pass === true ? 'PASS' : pass === false ? 'FAIL' : 'INFO'
  console.log(`  [${tag}] ${test}: ${msg}`)
  findings.push({ test, pass, msg })
}

async function main() {
  console.log('── probe-train-bgm v55.25 ─────────────────────────────────────')
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  const TARGETS = [
    { id: 'B1', label: 'g14 top-down race',  url: '/games/g14.html'     },
    { id: 'B2', label: 'g15 Lokomotif',      url: '/games/g15-pixi.html' },
    { id: 'B3', label: 'g16 Selamatkan',     url: '/games/g16-pixi.html' },
    { id: 'B4', label: 'g14-side (v55.27)',  url: '/games/g14-side.html' },
  ]

  try {
    for (const t of TARGETS) {
      console.log(`${t.id} ${t.label}`)
      const page = await browser.newPage()
      await page.setViewport(VP)
      try {
        await page.goto(`${BASE}${t.url}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
        await wait(2000)

        const helperLoaded = await page.evaluate(() => typeof window.TrainBGM === 'object' && typeof window.TrainBGM.setTrack === 'function')
        note(t.id, helperLoaded, `TrainBGM helper loaded = ${helperLoaded}`)

        const audioCount = await page.evaluate(() => document.querySelectorAll('#game-bgm').length)
        note(t.id, audioCount === 1, `<audio id=game-bgm> count = ${audioCount} (expect 1)`)

        // Default (Casey) — src should stay on train-bgm.mp3
        const caseyState = await page.evaluate(() => {
          window.TrainBGM.setTrack('caseyjr_character', 0.2)
          const a = document.getElementById('game-bgm')
          return { src: a.src.split('/').slice(-2).join('/'), volume: +a.volume.toFixed(2) }
        })
        const caseyOk = /train-bgm\.mp3$/.test(caseyState.src)
        note(t.id, caseyOk, `Casey JR → src ends ${caseyState.src}, vol ${caseyState.volume}`)

        // Thomas — src should swap to one of the Thomas tracks; volume in 0.30-0.50
        const thomasState = await page.evaluate(() => {
          window.TrainBGM.setTrack('aeg_thomas')
          const a = document.getElementById('game-bgm')
          return { src: a.src.split('/').slice(-2).join('/'), volume: +a.volume.toFixed(2) }
        })
        const thomasSrcOk = /train-bgm-thomas\/(all-engines-go-theme|im-gonna-chug-song)\.mp3$/.test(thomasState.src)
        const thomasVolOk = thomasState.volume >= 0.30 && thomasState.volume <= 0.50
        note(t.id, thomasSrcOk, `Thomas → src ends ${thomasState.src}`)
        note(t.id, thomasVolOk, `Thomas → vol ${thomasState.volume} (target 0.30-0.50)`)

        // Percy — different aeg_ key, should still pick one of the 2 tracks
        const percyState = await page.evaluate(() => {
          window.TrainBGM.setTrack('aeg_percy')
          return document.getElementById('game-bgm').src.split('/').slice(-2).join('/')
        })
        const percyOk = /train-bgm-thomas\/(all-engines-go-theme|im-gonna-chug-song)\.mp3$/.test(percyState)
        note(t.id, percyOk, `Percy → src ends ${percyState}`)

        // A-303 collision: rapid swap, check there's no concurrent fetches.
        // The helper pauses BEFORE swapping src, so the audio element should
        // never be playing two srcs at once.
        const collisionOk = await page.evaluate(() => {
          window.TrainBGM.setTrack('aeg_thomas')
          window.TrainBGM.setTrack('caseyjr_character', 0.2)
          window.TrainBGM.setTrack('aeg_percy')
          const a = document.getElementById('game-bgm')
          // After 3 rapid swaps, the audio should be paused (until play() called)
          return a.paused === true
        })
        note(t.id, collisionOk, `A-303 rapid swap → audio is paused (no overlap)`)
      } catch (e) {
        note(t.id, false, `FAIL: ${e.message}`)
      } finally {
        await page.close()
      }
    }
  } finally {
    await browser.close()
  }

  console.log('\n── SUMMARY ───────────────────────────────────────────────────')
  const pass = findings.filter(f => f.pass === true).length
  const fail = findings.filter(f => f.pass === false).length
  console.log(`PASS=${pass}  FAIL=${fail}  TOTAL=${findings.length}`)
  process.exitCode = fail > 0 ? 1 : 0
}

main().catch(e => { console.error(e); process.exit(1) })
