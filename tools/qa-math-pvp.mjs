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
// split-screen turn-based: after the 3-2-1 intro the active half auto-shows its
// question + answers (no handoff). Answer in whichever half has visible choices.
await new Promise(r=>setTimeout(r,4200));
let won=false, turns=0, sawChoices=false, heartsSeen=false;
for(let t=0;t<140&&!won;t++){
  const st=await pg.evaluate(()=>{
    const c0=document.querySelectorAll('#pvp-choices-0 button').length;
    const c1=document.querySelectorAll('#pvp-choices-1 button').length;
    return {
      win:document.getElementById('pvp-win').classList.contains('show'),
      active: c0>=2?0:(c1>=2?1:-1),
      heartsHtml:Array.prototype.reduce.call(document.querySelectorAll('.pvp-hearts'),(n,e)=>n+e.innerHTML.length,0)
    };
  });
  if(st.win){won=true;break;}
  if(st.active>=0){ sawChoices=true; if(st.heartsHtml>0)heartsSeen=true; turns++;
    await pg.evaluate((a)=>{const b=document.querySelector('#pvp-choices-'+a+' button');if(b)b.click();},st.active);
    await new Promise(r=>setTimeout(r,1500)); continue; }
  await new Promise(r=>setTimeout(r,200));
}
console.log('setup:',setupOk,'| sawChoices:',sawChoices,'| hearts:',heartsSeen,'| turns:',turns,'| WON:',won);
console.log('errs:',errs.join(' | ')||'none');
console.log((setupOk&&sawChoices&&heartsSeen&&won&&errs.length===0)?'PVP SMOKE PASS':'PVP SMOKE FAIL');
await b.close(); srv.close();
