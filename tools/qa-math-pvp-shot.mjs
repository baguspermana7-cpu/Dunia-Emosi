// Screenshot the redesigned math PvP arena (portrait + landscape) for owner review.
import puppeteer from 'puppeteer'
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'
const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..')
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.mp3':'audio/mpeg','.woff2':'font/woff2','.json':'application/json','.svg':'image/svg+xml'}
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f==='/')f='/index.html';const p=path.join(ROOT,f);fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end('nf');return}r.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});r.end(d)})})
await new Promise(res=>srv.listen(0,res)); const port=srv.address().port
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']})
const out=path.join(ROOT,'tools/qa-out'); fs.mkdirSync(out,{recursive:true})
for(const vp of [{w:390,h:840,tag:'portrait'},{w:840,h:390,tag:'landscape'}]){
  const pg=await b.newPage(); await pg.setViewport({width:vp.w,height:vp.h})
  const errs=[]; pg.on('pageerror',e=>errs.push(String(e))); pg.on('console',m=>{if(m.type()==='error')errs.push(m.text())})
  await pg.goto(`http://localhost:${port}/games/kuis-matematika.html`,{waitUntil:'networkidle2',timeout:30000})
  await new Promise(r=>setTimeout(r,600))
  await pg.evaluate(()=>{ try{ MP.openPvP&&MP.openPvP(); }catch(e){} })
  await new Promise(r=>setTimeout(r,300))
  await pg.evaluate(()=>{ try{ MP.pvpStart&&MP.pvpStart(); }catch(e){} })
  await new Promise(r=>setTimeout(r,4600))          // 3-2-1 intro → active half auto-renders (split-screen, no handoff)
  const shot=path.join(out,`math-pvp-${vp.tag}.png`); await pg.screenshot({path:shot})
  console.log(`${vp.tag}: ${shot}  errors=${errs.length}${errs.length?' :: '+errs.slice(0,3).join(' | '):''}`)
  await pg.close()
}
await b.close(); srv.close()
