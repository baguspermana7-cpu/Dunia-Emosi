import puppeteer from 'puppeteer';
import path from 'path'; import http from 'http'; import fs from 'fs';
import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.mp3':'audio/mpeg','.ogg':'audio/ogg','.webm':'video/webm','.wav':'audio/wav','.svg':'image/svg+xml','.atlas':'text/plain','.css':'text/css','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf'};
const n404=[];
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f==='/')f='/index.html';const p=path.join(ROOT,f);fs.readFile(p,(e,d)=>{if(e){n404.push(q.url.split('?')[0]);r.writeHead(404);r.end('nf');return}r.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});r.end(d)})});
await new Promise(res=>srv.listen(0,res)); const PORT=srv.address().port;
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required','--mute-audio']});
const p=await b.newPage(); await p.setViewport({width:1280,height:768,deviceScaleFactor:1});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// emit a pointerup on the Nth interactive of the active top scene (by filter), return list
async function tapInteractive(filterFn){
  return p.evaluate((filterStr)=>{
    const g=window.__ggGame; if(!g) return {err:'nogame'};
    const scenes=g.scene.scenes.filter(s=>s.scene.settings.active);
    const top=scenes[scenes.length-1]; if(!top) return {err:'noscene'};
    const list=[]; top.children.list.forEach(o=>{ if(o.input&&o.input.enabled){const b=o.getBounds();list.push({o,x:Math.round(b.centerX),y:Math.round(b.centerY),w:Math.round(b.width),h:Math.round(b.height),name:o.name||o.type});}});
    const filt = eval(filterStr);
    const target = list.find(filt) || list[list.length-1];
    if(!target) return {scene:top.scene.key, tapped:null, list:list.map(l=>({x:l.x,y:l.y,w:l.w,name:l.name}))};
    const P=g.input.activePointer;
    ['pointerover','pointerdown','pointerup'].forEach(ev=>target.o.emit(ev,P,0,0,{stopPropagation(){}}));
    return {scene:top.scene.key, tapped:{x:target.x,y:target.y,name:target.name}, list:list.map(l=>({x:l.x,y:l.y,w:l.w,name:l.name}))};
  }, '('+filterFn.toString()+')');
}
try{
  await p.goto('http://localhost:'+PORT+'/games/film/batwheels-gotham-getaway/index.html',{waitUntil:'networkidle2',timeout:45000});
  await sleep(11000);
  // Title: tap the big bottom-center (Play), not the top-right audio
  let r1=await tapInteractive(o=>o.y>500); console.log('Title tap:', JSON.stringify(r1.tapped), '| had:', JSON.stringify(r1.list));
  await sleep(5000);
  // LevelSelect: tap a level node (upper area) first
  let r2=await tapInteractive(o=>o.w<200 && o.y<500); console.log('Level tap:', JSON.stringify(r2.tapped),'| scene:',r2.scene,'| had:', JSON.stringify(r2.list));
  await sleep(1500);
  // then tap the Play/confirm (big bottom)
  let r3=await tapInteractive(o=>o.y>500); console.log('Play tap:', JSON.stringify(r3.tapped),'| scene:',r3.scene);
  await sleep(8000); // transition + Game load spines + spawn
  const st=await p.evaluate(()=>{ const g=window.__ggGame; const active=g.scene.scenes.filter(s=>s.scene.settings.active).map(s=>s.scene.key);
    const gs=g.scene.getScene('Game'); let hero=false,driver=null,tex=null;
    try{const hv=gs&&gs.runManager&&gs.runManager.vehicleManager&&gs.runManager.vehicleManager.HeroVehicle; hero=!!hv; driver=hv&&hv.DriverProfile&&hv.DriverProfile.driver; tex=hv&&hv.character&&hv.character.skeleton?'spine-ok':null;}catch(e){}
    return {active,hero,driver,tex}; });
  console.log('FINAL active:', JSON.stringify(st.active),'| hero:',st.hero,'| driver:',st.driver,'| char:',st.tex);
  const crit=[...new Set(n404)].filter(u=>!/favicon|SndThrow|SndPickup/.test(u));
  console.log('critical 404s:', crit.length, crit.slice(0,6).join(' , '));
  await p.screenshot({path:'/tmp/ggdrive_final.png'});
}catch(e){ console.log('ERR', String(e.message||e).slice(0,120)); }
await b.close(); srv.close(); console.log('GGDRIVE DONE');
