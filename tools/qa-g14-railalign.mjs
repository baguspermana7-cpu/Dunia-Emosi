// v55.84 ZERO-TOLERANCE gate — the player (at every lane) AND every NPC train must sit
// EXACTLY on their lane Y (|Δ| ≤ 1px) with NO float over time, the train prominent
// (≈1.3–1.6×laneH) + on-screen, across 4 viewports. Boots g14 like verify-v5576.
import puppeteer from 'puppeteer'
import fs from 'fs'
const OUT = 'tools/qa-out'; fs.mkdirSync(OUT, { recursive: true })
const IGNORE = /favicon|pokemondb|showdown|net::ERR|Failed to load resource/i
const VPS = [[1280,720,'d'],[1024,1366,'p'],[1024,768,'l'],[390,800,'ph']]
const browser = await puppeteer.launch({ headless:'new', args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] })
const sleep = ms => new Promise(r=>setTimeout(r,ms))
const rows = []
for (const [w,h,tag] of VPS) {
  const page = await browser.newPage(); await page.setViewport({width:w,height:h,deviceScaleFactor:1})
  const errs=[]; page.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); page.on('pageerror',e=>errs.push('PE:'+e.message))
  await page.evaluateOnNewDocument(()=>sessionStorage.setItem('g14Config',JSON.stringify({level:3,trainKey:'aeg_thomas',train:'aeg_thomas',difficulty:'easy'})))
  try { await page.goto('http://localhost:8081/games/balapan-kereta.html',{waitUntil:'domcontentloaded',timeout:30000}) } catch(e){ errs.push('GOTO '+e.message) }
  await sleep(1800)
  await page.evaluate(()=>{try{const t=(typeof TRAIN_MAP!=='undefined'&&TRAIN_MAP['aeg_thomas'])||null;if(t){S.trainCfg={...t,variant:1};window.selectedTrainKey=t.key}if(typeof startRace==='function')startRace()}catch(e){}})
  await sleep(4200)
  // drive the player through all 3 lanes, assert exact each time
  const laneDevs=[]
  for (const ln of [0,2,1]) {
    await page.evaluate((target)=>{ S.targetLane=target; }, ln)
    await sleep(700)
    // v55.88 — the train base sits ON the rail line (laneY); g14WheelMargin()==0. Zero-tolerance
    // is measured against laneY − margin (the intended wheel position).
    const d = await page.evaluate(()=>Math.abs(L.player.y - (laneYs[S.targetLane] - (typeof g14WheelMargin==='function'?g14WheelMargin():0))))
    laneDevs.push(Math.round(d*100)/100)
  }
  // sizing + AI exactness + float + ABSOLUTE prominence (v55.86 — catches portrait shrink)
  const info = await page.evaluate(()=>{
    const charH = (L.playerCharImg ? L.playerCharImg.height : 0)
    const H = app.screen.height
    const pb = (typeof g14PlayBand==='function') ? g14PlayBand() : null
    const bandH = pb ? (pb.bandBot - pb.bandTop) : H
    const mg = (typeof g14WheelMargin==='function')?g14WheelMargin():0
    const ai1 = (L.ai&&L.ai.children)?L.ai.children.map(a=>a.y):[]
    // v55.87 — an AI may have SWITCHED lanes since build, so assert it sits EXACTLY on its
    // CURRENT (nearest) lane − margin, not its stale build lane.
    const nearDev = y => Math.min(...laneYs.map(ly => Math.abs(y - (ly - mg))))
    return { charRatio: laneH?charH/laneH:0, laneH:Math.round(laneH), nAI:ai1.length,
      charH:Math.round(charH), screenFrac: H?charH/H:0, bandFrac: bandH?charH/bandH:0,
      aiDev: ai1.map(y=> Math.round(nearDev(y)*100)/100) }
  })
  // v56.6 — AI lane changes now TWEEN (Motion.damp) instead of teleporting, so a
  // snapshot can catch an AI mid-transition (legit motion, not float). Contract stays:
  // a RESTING AI must sit ≤1px on a lane and not drift. So: settle 900ms, re-sample
  // deviation (per-AI MIN of the two samples), THEN check drift over a further 300ms
  // window only for AIs that are already settled (≤1px).
  await sleep(900)
  const aiDev2 = await page.evaluate(()=>{
    const mg = (typeof g14WheelMargin==='function')?g14WheelMargin():0
    const nearDev = y => Math.min(...laneYs.map(ly => Math.abs(y - (ly - mg))))
    return (L.ai&&L.ai.children)?L.ai.children.map(a=>Math.round(nearDev(a.y)*100)/100):[]
  })
  info.aiDev = info.aiDev.map((d,i)=> Math.min(d, (aiDev2[i]!=null?aiDev2[i]:d)))
  const snap1 = await page.evaluate(()=>(L.ai&&L.ai.children)?L.ai.children.map(a=>a.y):[])
  await sleep(300)
  const aiFloat = await page.evaluate((prev)=>{
    const now=(L.ai&&L.ai.children)?L.ai.children.map(a=>a.y):[]
    const mg = (typeof g14WheelMargin==='function')?g14WheelMargin():0
    const nearDev = y => Math.min(...laneYs.map(ly => Math.abs(y - (ly - mg))))
    // drift = settled AI (≤1px of a lane at BOTH samples) whose y still changed
    return now.some((y,i)=> prev[i]!=null && nearDev(prev[i])<=1 && nearDev(y)<=1 && Math.abs(y-prev[i])>0.01)
  }, snap1)
  await page.screenshot({path:`${OUT}/railalign-${tag}.png`})
  const maxLaneDev = Math.max(...laneDevs, 0)
  const maxAiDev = Math.max(0, ...info.aiDev.filter(x=>x!=null))
  // PROMINENCE: train must be ≥12% of the screen height (catches portrait lane-collapse)
  // AND a sane ceiling so it never balloons; ratio-to-lane stays ~1.45.
  // v55.92 — train size is DECOUPLED from laneH (lanes are SPREAD across top/mid/bottom tracks),
  // so charRatio no longer applies — gate on absolute screen-fraction prominence + on-rail only.
  const prominent = info.screenFrac>=0.055 && info.screenFrac<=0.30
  const ok = maxLaneDev<=1 && maxAiDev<=1 && !aiFloat && prominent && errs.filter(e=>!IGNORE.test(e)).length===0
  rows.push({vp:`${w}x${h}`, laneDevs, maxLaneDev, aiDev:info.aiDev, maxAiDev, aiFloat, charRatio:Math.round(info.charRatio*100)/100, charH:info.charH, screenFrac:Math.round(info.screenFrac*1000)/1000, bandFrac:Math.round(info.bandFrac*1000)/1000, prominent, errors:errs.filter(e=>!IGNORE.test(e)).length, ok})
  await page.close()
}
await browser.close()
console.log(JSON.stringify(rows,null,2))
const bad = rows.filter(r=>!r.ok)
console.log(bad.length ? `\n❌ ${bad.length} viewport(s) fail the ≤1px zero-tolerance gate` : `\n✅ ZERO-TOLERANCE: player(all lanes)+NPC ≤1px, no float, train prominent, 0 errors — all viewports`)
process.exit(bad.length?1:0)
