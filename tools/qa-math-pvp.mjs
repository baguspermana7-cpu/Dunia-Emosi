// Smoke: math game Duel PvP end-to-end (setup -> countdown -> turns -> win), 0 console errors.
import puppeteer from 'puppeteer'; import http from 'http'; import fs from 'fs'; import path from 'path'; import {fileURLToPath} from 'url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg','.mp3':'audio/mpeg','.woff2':'font/woff2'};
const srv=http.createServer((q,s)=>{try{let p=decodeURIComponent(q.url.split('?')[0]);const fp=path.join(ROOT,p);if(!fs.existsSync(fp)){s.writeHead(404);s.end('nf');return}s.writeHead(200,{'Content-Type':MIME[path.extname(fp)]||'application/octet-stream'});s.end(fs.readFileSync(fp))}catch(e){s.writeHead(500);s.end(''+e)}});
await new Promise(r=>srv.listen(0,r)); const P=srv.address().port;
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox','--use-gl=swiftshader']}); const pg=await b.newPage();
const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{if(m.type()==='error')errs.push('con:'+m.text())});
await pg.goto(`http://localhost:${P}/games/kuis-matematika.html`,{waitUntil:'domcontentloaded',timeout:45000});
await pg.waitForFunction(()=>window.MP&&typeof MP.openPvP==='function'&&window.makeMathQuestionV2,{timeout:20000});
const active=()=>pg.evaluate(()=>{const a=document.querySelector('.scr.active');return a&&a.id});
await pg.evaluate(()=>MP.openPvP());
const setupOk=(await active())==='scr-pvp-setup';
await pg.evaluate(()=>{document.getElementById('pvp-in-0').value='Adi';document.getElementById('pvp-in-1').value='Bela';MP.pvpSetDiff('easy',document.querySelector('#pvp-diff button[data-d=easy]'));MP.pvpStart();});
// wait for arena + first handoff (after 3-2-1 intro ~2.5s)
await pg.waitForFunction(()=>document.getElementById('pvp-handoff')&&document.getElementById('pvp-handoff').classList.contains('show'),{timeout:8000}).catch(()=>{});
let won=false, turns=0, sawChoices=false, heartsSeen=false;
for(let t=0;t<140&&!won;t++){
  const st=await pg.evaluate(()=>({
    scr:(document.querySelector('.scr.active')||{}).id,
    win:document.getElementById('pvp-win').classList.contains('show'),
    handoff:document.getElementById('pvp-handoff').classList.contains('show'),
    choices:document.querySelectorAll('#pvp-choices button').length,
    heartsHtml:(document.getElementById('pvp-hearts-0').innerHTML.length+document.getElementById('pvp-hearts-1').innerHTML.length)
  }));
  if(st.win){won=true;break;}
  if(st.handoff){ await pg.evaluate(()=>MP.pvpReady()); await new Promise(r=>setTimeout(r,120)); continue; }
  if(st.choices>=2){ sawChoices=true; if(st.heartsHtml>0)heartsSeen=true; turns++; await pg.evaluate(()=>{const b=document.querySelector('#pvp-choices button');if(b)b.click();}); await new Promise(r=>setTimeout(r,1500)); continue; }
  await new Promise(r=>setTimeout(r,200));
}
console.log('setup:',setupOk,'| sawChoices:',sawChoices,'| hearts:',heartsSeen,'| turns:',turns,'| WON:',won);
console.log('errs:',errs.join(' | ')||'none');
console.log((setupOk&&sawChoices&&heartsSeen&&won&&errs.length===0)?'PVP SMOKE PASS':'PVP SMOKE FAIL');
await b.close(); srv.close();
