// Boot SPA into g3 (letter mode) + screenshot within the render window (~300ms) before the
// no-player watchdog reverts to welcome. Arg1=out name, arg2=w, arg3=h.
import puppeteer from 'puppeteer'; import http from 'http'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const R2=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const OUT=process.argv[2]||'g3', W=+(process.argv[3]||430), H=+(process.argv[4]||860);
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.json':'application/json','.mp3':'audio/mpeg','.woff2':'font/woff2','.svg':'image/svg+xml','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{try{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/index.html';const fp=path.join(R2,p);if(!fs.existsSync(fp)){res.writeHead(404);res.end('nf');return}res.writeHead(200,{'Content-Type':MIME[path.extname(fp)]||'application/octet-stream'});res.end(fs.readFileSync(fp))}catch(e){res.writeHead(500);res.end(String(e))}});
await new Promise(r=>server.listen(0,r)); const PORT=server.address().port;
const br=await puppeteer.launch({headless:'new',args:['--no-sandbox','--use-gl=swiftshader']}); const pg=await br.newPage();
await pg.setViewport({width:W,height:H,deviceScaleFactor:2});
const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
await pg.goto(`http://localhost:${PORT}/index.html`,{waitUntil:'domcontentloaded',timeout:45000});
await pg.waitForFunction(()=>typeof window.startGameWithLevel==='function'&&typeof window.openLevelSelect==='function',{timeout:20000});
await pg.evaluate(()=>{ openLevelSelect(3); startGameWithLevel(1); });
await new Promise(r=>setTimeout(r,320));
const info=await pg.evaluate(()=>{const s=document.querySelector('.screen.active');const w=document.getElementById('g3-word');return {screen:s&&s.id,word:(w&&w.textContent)||'',choices:[...document.querySelectorAll('#screen-game3 .g3-choice-btn')].map(b=>b.textContent),animal:(document.getElementById('g3-animal')||{}).textContent||''};});
await pg.screenshot({path:path.join(R2,'tools/qa-out/'+OUT+'.png')});
console.log(JSON.stringify(info)); console.log('errs:',errs.join('|')||'none');
await br.close(); server.close();
