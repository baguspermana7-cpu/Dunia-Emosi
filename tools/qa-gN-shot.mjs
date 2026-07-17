// Boot the SPA into game N + screenshot the render window (polls; SPA reverts to
// welcome ~0.7s after a name-less start in headless — real play doesn't). 
// Args: gameNum out-name [w] [h] [contentSel]
import puppeteer from 'puppeteer'; import http from 'http'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const R2=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const N=+(process.argv[2]||3), OUT=process.argv[3]||('g'+N), W=+(process.argv[4]||430), H=+(process.argv[5]||880);
const SEL=process.argv[6]||('#screen-game'+N+' button, #screen-game'+N+' .g'+N+'-choice-btn, #screen-game'+N+' [class*=choice]');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.json':'application/json','.mp3':'audio/mpeg','.woff2':'font/woff2','.svg':'image/svg+xml','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{try{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/index.html';const fp=path.join(R2,p);if(!fs.existsSync(fp)){res.writeHead(404);res.end('nf');return}res.writeHead(200,{'Content-Type':MIME[path.extname(fp)]||'application/octet-stream'});res.end(fs.readFileSync(fp))}catch(e){res.writeHead(500);res.end(String(e))}});
await new Promise(r=>server.listen(0,r)); const PORT=server.address().port;
const br=await puppeteer.launch({headless:'new',args:['--no-sandbox','--use-gl=swiftshader']}); const pg=await br.newPage();
await pg.setViewport({width:W,height:H,deviceScaleFactor:2});
const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
await pg.goto(`http://localhost:${PORT}/index.html`,{waitUntil:'domcontentloaded',timeout:45000});
await pg.waitForFunction(()=>typeof window.startGameWithLevel==='function'&&typeof window.openLevelSelect==='function',{timeout:20000});
// set up a real player (name) so the no-player watchdog that bounces headless to
// welcome doesn't fire — real play with a named profile behaves the same
await pg.evaluate(()=>{ try{ var el=document.getElementById('p1-name'); if(el)el.value='Uji'; if(typeof confirmNames==='function')confirmNames(); }catch(e){} });
let ok=false, info=null;
for(let a=0;a<3 && !ok;a++){
  await pg.evaluate((n)=>{ openLevelSelect(n); startGameWithLevel(1); }, N);
  for(let i=0;i<30;i++){
    const st=await pg.evaluate((n,sel)=>{ const s=document.querySelector('.screen.active');
      return { active:s&&s.id, n:document.querySelectorAll(sel).length }; }, N, SEL);
    if(st.active===('screen-game'+N) && st.n>0){ info=st; await pg.screenshot({path:path.join(R2,'tools/qa-out/'+OUT+'.png')}); ok=true; break; }
    await new Promise(r=>setTimeout(r,55));
  }
}
console.log(ok?('SNAP '+JSON.stringify(info)):'FAILED'); console.log('errs:',errs.join('|')||'none');
await br.close(); server.close(); process.exit(ok?0:1);
