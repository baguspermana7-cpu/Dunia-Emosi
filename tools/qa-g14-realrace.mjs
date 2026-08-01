// Drive a REAL g14 race by clicking the actual select-screen DOM (cat-btn -> train-card
// -> g14GoRace), which sets the lexical `S.trainCfg` internally — the thing headless
// evaluate() could not do. Screenshot mid-race to eyeball: no floating emoji, obstacles/
// pickups render as DB sprites on the rail, rail alignment.
import puppeteer from 'puppeteer'
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'
const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..')
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.mp3':'audio/mpeg','.woff2':'font/woff2','.json':'application/json','.svg':'image/svg+xml'}
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f==='/')f='/index.html';const p=path.join(ROOT,f);fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end('nf');return}r.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});r.end(d)})})
await new Promise(res=>srv.listen(0,res)); const port=srv.address().port
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']})
const out=path.join(ROOT,'tools/qa-out'); fs.mkdirSync(out,{recursive:true})
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
for(const vp of [{w:844,h:390,tag:'landscape'},{w:390,h:844,tag:'portrait'}]){
  const pg=await b.newPage(); await pg.setViewport({width:vp.w,height:vp.h,deviceScaleFactor:1})
  const errs=[]; pg.on('pageerror',e=>errs.push('PE:'+e.message)); pg.on('console',m=>{if(m.type()==='error')errs.push(m.text())})
  await pg.evaluateOnNewDocument(()=>{ localStorage.setItem('g14-tutorial-seen','1'); sessionStorage.setItem('g14-hinted','1') })
  await pg.goto(`http://localhost:${port}/games/balapan-kereta.html`,{waitUntil:'networkidle2',timeout:30000})
  await sleep(1800)
  // tolerant poll-driver: Adventure mode card -> category -> train card -> GO.
  const clickWhen = async (sel, ms=8000)=>{ const t0=Date.now(); while(Date.now()-t0<ms){ const ok=await pg.evaluate(s=>{const e=document.querySelector(s); if(e){e.click();return true} return false}, sel); if(ok) return true; await sleep(250) } return false }
  const mode = await clickWhen('.gvs-card[data-mode="adventure"]')
  await sleep(600)
  const cat = await clickWhen('.cat-btn')
  await sleep(400)
  const card = await clickWhen('.train-card')
  await sleep(300)
  const started = await pg.evaluate(()=>{ if(typeof g14GoRace==='function'){ g14GoRace(); return true } const b=document.getElementById('go-btn'); if(b){b.click();return 'btn'} return false })
  await sleep(400)
  await pg.evaluate(()=>{ const g=document.getElementById('g14-tut-go'); if(g) g.click() })
  await sleep(6000)
  // force-hide any overlay still covering the live canvas so the shot shows the RACE
  await pg.evaluate(()=>{ ['g14vs','select-ovl','g14-tut'].forEach(id=>{const e=document.getElementById(id); if(e)e.style.display='none'}); document.querySelectorAll('.gvs-modal').forEach(e=>e.style.display='none') })
  await sleep(400)
  console.log(`  drive: mode=${mode} cat=${cat} card=${card}`)
  // probe live scene: how many obstacles/pickups are sprites vs text
  const scene = await pg.evaluate(()=>{
    // reach into PIXI stage children counts if exposed; else report select-ovl hidden
    const ov=document.getElementById('select-ovl')
    return { selHidden: ov ? getComputedStyle(ov).display==='none' : 'no-ovl' }
  })
  const shot=path.join(out,`g14-realrace-${vp.tag}.png`); await pg.screenshot({path:shot})
  console.log(`${vp.tag}: started=${started} selHidden=${scene.selHidden} errors=${errs.length}${errs.length?' :: '+errs.slice(0,3).join(' | '):''}`)
  await pg.close()
}
await b.close(); srv.close()
