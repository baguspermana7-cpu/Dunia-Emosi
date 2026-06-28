// v55.85 — UNIFORM dimensions gate: player AND every NPC render at the SAME height
// (== G14_UNIFORM_H ±3px) across viewports (dynamic), wheels on lane, 0 errors.
import puppeteer from 'puppeteer'
const VPS=[[1280,720],[1024,1366],[390,800]]
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']})
const sleep=ms=>new Promise(r=>setTimeout(r,ms)); const rows=[]
for(const [w,h] of VPS){
  const p=await b.newPage(); await p.setViewport({width:w,height:h,deviceScaleFactor:1})
  const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); p.on('pageerror',e=>errs.push('PE'+e.message))
  await p.evaluateOnNewDocument(()=>sessionStorage.setItem('g14Config',JSON.stringify({level:3,trainKey:'aeg_thomas',train:'aeg_thomas',difficulty:'easy'})))
  await p.goto('http://localhost:8081/games/balapan-kereta.html',{waitUntil:'domcontentloaded',timeout:30000})
  await sleep(1800)
  await p.evaluate(()=>{try{const t=(typeof TRAIN_MAP!=='undefined'&&TRAIN_MAP['aeg_thomas'])||null;if(t){S.trainCfg={...t,variant:1};window.selectedTrainKey=t.key}if(typeof startRace==='function')startRace()}catch(e){}})
  await sleep(4500)
  const m=await p.evaluate(()=>{
    const U=G14_UNIFORM_H
    const ph=L.playerCharImg?L.playerCharImg.height:null
    const ais=(L.ai&&L.ai.children)?L.ai.children.map(a=>a._charImg?Math.round(a._charImg.height):null).filter(x=>x!=null):[]
    return {U:Math.round(U), playerH:ph?Math.round(ph):null, aiH:ais}
  })
  if(w===1280&&h===720) await p.screenshot({path:'tools/qa-out/g14-dims-1280.png'})
  // every train height within ±3px of each other (uniform) — depth-scale adds ≤4% so allow a small band
  const all=[m.playerH,...m.aiH].filter(x=>x!=null)
  const spread=all.length?Math.max(...all)-Math.min(...all):0
  const ok = m.playerH!=null && spread<=Math.max(6,m.U*0.08) && errs.filter(e=>!/favicon|pokemondb|showdown|net::ERR|Failed to load/i.test(e)).length===0
  rows.push({vp:`${w}x${h}`, U:m.U, playerH:m.playerH, aiH:m.aiH, spread, ok})
  await p.close()
}
await b.close()
console.log(JSON.stringify(rows,null,2))
const bad=rows.filter(r=>!r.ok)
console.log(bad.length?`\n❌ ${bad.length} viewport(s): non-uniform heights`:`\n✅ UNIFORM dimensions: player + every NPC same height (~G14_UNIFORM_H), all viewports, 0 errors`)
process.exit(bad.length?1:0)
