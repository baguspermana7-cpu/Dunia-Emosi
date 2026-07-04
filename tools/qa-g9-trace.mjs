// B-294 drive: Jejak Huruf (Game 9) — verify the ghost glyph fills the guide-dot
// bbox and a full-height trace can hit the BOTTOM dots (previously unreachable).
import puppeteer from 'puppeteer'
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']})
for(const [w,h,tag] of [[390,844,'port'],[900,600,'land']]){
  const p=await b.newPage(); await p.setViewport({width:w,height:h})
  const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); p.on('pageerror',e=>errs.push('PE:'+e.message))
  await p.goto('http://localhost:8081/index.html',{waitUntil:'domcontentloaded'})
  await sleep(1800)
  // Jump straight into Game 9 (Jejak Huruf) via its public entry.
  const started=await p.evaluate(()=>{
    try{
      // ensure a player exists
      if(typeof state==='object' && (!state.players||!state.players.length)){ state.players=[{name:'A',ageTier:'tumbuh',avatar:'🦁'}]; state.currentPlayer=0 }
      if(typeof showScreen==='function') showScreen('screen-game9')
      if(typeof initGame9==='function'){ initGame9(); return true }
      return false
    }catch(e){ return 'ERR:'+e.message }
  })
  await sleep(900) // canvas buffer sync setTimeout(100) + guide render
  // Force letter 'A' for a deterministic geometry check.
  await p.evaluate(()=>{ if(typeof g9State==='object'){ g9State.currentLetter='A'; g9Clear(); renderG9GuideDots() } })
  await sleep(300)
  const geo=await p.evaluate(()=>{
    const cvs=document.getElementById('g9-canvas'); if(!cvs) return {err:'no canvas'}
    const sz=cvs.width
    const g=(window.getG9Guides?getG9Guides('A'):[])
    const ctx=cvs.getContext('2d')
    // scan the rendered ghost glyph's painted vertical extent (alpha>0)
    const img=ctx.getImageData(0,0,sz,sz).data
    let top=-1,bot=-1
    for(let y=0;y<sz;y++){ for(let x=0;x<sz;x++){ if(img[(y*sz+x)*4+3]>4){ if(top<0)top=y; bot=y; break } } }
    const dotYs=g.map(gg=>gg.y)
    return { sz, glyphTopFrac:+(top/sz).toFixed(2), glyphBotFrac:+(bot/sz).toFixed(2),
      dotMinY:Math.min(...dotYs), dotMaxY:Math.max(...dotYs), dots:g.length }
  })
  // simulate hitting each guide dot by calling checkGuideHits at each dot center
  const hit=await p.evaluate(()=>{
    const cvs=document.getElementById('g9-canvas'); const sz=cvs.width
    const g=getG9Guides('A')
    g.forEach(gg=>{ checkGuideHits({x:gg.x*sz,y:gg.y*sz}) })
    return {lit:document.querySelectorAll('.g9-dot.hit').length, total:g.length}
  })
  // glyph feet should reach near the bottom dots (was ~0.77 vs 0.95 before)
  const feetReach = geo.glyphBotFrac >= (geo.dotMaxY - 0.12)
  const apexReach = geo.glyphTopFrac <= (geo.dotMinY + 0.12)
  console.log(tag, JSON.stringify({started, ...geo, hit, feetReach, apexReach}),
    'errors:', errs.filter(e=>!/favicon|net::ERR|Failed to load/i.test(e)).slice(0,3))
  await p.screenshot({path:`tools/qa-out/g9-trace-${tag}.png`})
  await p.close()
}
await b.close()
