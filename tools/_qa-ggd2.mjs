import puppeteer from 'puppeteer';
import path from 'path'; import http from 'http'; import fs from 'fs';
import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.mp3':'audio/mpeg','.ogg':'audio/ogg','.webm':'video/webm','.wav':'audio/wav','.svg':'image/svg+xml','.atlas':'text/plain','.css':'text/css','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf'};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f==='/')f='/index.html';const p=path.join(ROOT,f);fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end('nf');return}r.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});r.end(d)})});
await new Promise(res=>srv.listen(0,res)); const PORT=srv.address().port;
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required','--mute-audio']});
const p=await b.newPage(); await p.setViewport({width:1280,height:768,deviceScaleFactor:1});
const gg=[]; p.on('console',m=>{const t=m.text(); if(t.includes('[gg-custom]'))gg.push(t.replace('[gg-custom]','').trim());});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function st(){ return p.evaluate(()=>{ const g=window.__ggGame; if(!g)return{};
  const active=g.scene.scenes.filter(s=>s.scene.settings.active).map(s=>s.scene.key);
  const gs=g.scene.getScene('Game'); let driver=null,color=null;
  try{const hv=gs&&gs.runManager&&gs.runManager.vehicleManager&&gs.runManager.vehicleManager.HeroVehicle;if(hv){driver=hv.DriverProfile&&hv.DriverProfile.driver;const c=hv.character&&hv.character.skeleton&&hv.character.skeleton.color;if(c)color=[+c.r.toFixed(2),+c.g.toFixed(2),+c.b.toFixed(2)];}}catch(e){}
  return {active,driver,color}; }); }
// tap a LevelSelect level node + go button (D2 handles Title/Intro)
async function tapLevelSelect(){ return p.evaluate(()=>{ const g=window.__ggGame; const s=g.scene.getScene('LevelSelect'); if(!s||!s.scene.settings.active||!s.children)return 'noLS';
  const list=[]; s.children.list.forEach(o=>{if(o.input&&o.input.enabled){const b=o.getBounds();list.push({o,x:b.centerX,y:b.centerY,w:b.width});}});
  const P=g.input.activePointer; const tap=t=>['pointerover','pointerdown','pointerup'].forEach(ev=>t.o.emit(ev,P,0,0,{stopPropagation(){}}));
  const node=list.filter(t=>t.y<470&&t.w<220&&!(t.x<380&&t.y<260)); if(node.length){tap(node[0]);return 'node@'+Math.round(node[0].x)+','+Math.round(node[0].y);}
  const go=list.filter(t=>t.y>520).sort((a,b)=>b.w-a.w)[0]; if(go){tap(go);return 'go@'+Math.round(go.x)+','+Math.round(go.y);}
  return 'LS-none'; }); }
try{
  await p.goto('http://localhost:'+PORT+'/games/film/batwheels-gotham-getaway/index.html?chaser=buff,ff3b30',{waitUntil:'networkidle2',timeout:45000});
  await sleep(11000);
  let reachedLS=false;
  for(let i=0;i<26;i++){ const s=await st(); if(s.driver){console.log('REACHED GAME at',i);break;}
    if(s.active.indexOf('LevelSelect')>=0){ await p.mouse.click(467,300); await sleep(600); await p.mouse.click(640,470); await sleep(600); await p.mouse.click(640,560); if(i%2===0)console.log(i,'LS real-click'); reachedLS=true; }
    else if(i%3===0) console.log(i,JSON.stringify(s.active));
    await sleep(2500);
  }
  await sleep(3000);
  const fin=await st();
  console.log('FINAL:', JSON.stringify(fin));
  console.log('gg logs:', JSON.stringify(gg.slice(-8)));
  await p.screenshot({path:'/tmp/ggd2_final.png'});
}catch(e){ console.log('ERR', String(e.message||e).slice(0,120)); }
await b.close(); srv.close(); console.log('GGD2 DONE');
