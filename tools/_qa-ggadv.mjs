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
async function step(){
  return p.evaluate(()=>{
    const g=window.__ggGame; if(!g) return {err:'nogame'};
    const active=g.scene.scenes.filter(s=>s.scene.settings.active);
    const top=active[active.length-1]; const keys=active.map(s=>s.scene.key);
    // reached Game?
    const gs=g.scene.getScene('Game');
    let hero=false,driver=null;
    try{const hv=gs&&gs.runManager&&gs.runManager.vehicleManager&&gs.runManager.vehicleManager.HeroVehicle;hero=!!hv;driver=hv&&hv.DriverProfile&&hv.DriverProfile.driver;}catch(e){}
    if(hero) return {keys,done:true,hero,driver};
    // tap interactives on the top scene: prefer a level node (small, upper) then a big/bottom play/skip
    if(top){ const list=[]; top.children.list.forEach(o=>{if(o.input&&o.input.enabled){const bb=o.getBounds();list.push({o,x:Math.round(bb.centerX),y:Math.round(bb.centerY),w:Math.round(bb.width)});}});
      // tap ALL interactives except the top-right audio (x>1400 && y<150)
      const P=g.input.activePointer;
      list.filter(t=>!(t.x>1400&&t.y<150)).forEach(t=>['pointerover','pointerdown','pointerup'].forEach(ev=>t.o.emit(ev,P,0,0,{stopPropagation(){}})));
      return {keys,done:false,hero:false,tapped:list.length};
    }
    return {keys,done:false,hero:false,tapped:0};
  });
}
try{
  await p.goto('http://localhost:'+PORT+'/games/film/batwheels-gotham-getaway/index.html',{waitUntil:'networkidle2',timeout:45000});
  await sleep(11000);
  let last=null;
  for(let i=0;i<14;i++){
    const s=await step();
    if(s&&s.keys) last=s;
    console.log('step',i,JSON.stringify(s));
    if(s&&s.done){ break; }
    await sleep(3500);
  }
  await sleep(3000);
  await p.screenshot({path:'/tmp/ggadv_final.png'});
  const crit=[...new Set(n404)].filter(u=>!/favicon|SndThrow|SndPickup/.test(u));
  console.log('critical 404s:', crit.length, crit.slice(0,6).join(' , '));
}catch(e){ console.log('ERR', String(e.message||e).slice(0,120)); }
await b.close(); srv.close(); console.log('GGADV DONE');
