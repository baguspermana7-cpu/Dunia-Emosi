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
try{
  await p.goto('http://localhost:'+PORT+'/games/film/batwheels-gotham-getaway/index.html',{waitUntil:'networkidle2',timeout:45000});
  await new Promise(r=>setTimeout(r,10000)); // boot to Title
  // drive to a race via the captured game
  const drive = await p.evaluate(async ()=>{
    const g = window.__ggGame; if(!g) return {err:'no game'};
    function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
    try {
      g.scene.start('LevelSelect', {});
      await sleep(3500);
      const ls = g.scene.getScene('LevelSelect');
      if (ls && ls.onLevelSelected) { ls.onLevelSelected(0); }
      await sleep(6000); // wait play transition -> Game
      return {ok:true};
    } catch(e){ return {err:String(e).slice(0,120)}; }
  });
  await new Promise(r=>setTimeout(r,6000)); // let Game load spines + spawn
  const state = await p.evaluate(()=>{
    const g = window.__ggGame; if(!g) return {};
    const active = g.scene.scenes.filter(s=>s.scene.settings.active).map(s=>s.scene.key);
    const gs = g.scene.getScene('Game');
    let hero=null, heroSkin=null;
    try { const vm = gs && gs.runManager && gs.runManager.vehicleManager; const hv = vm && vm.HeroVehicle;
          hero = !!hv; heroSkin = hv && hv.DriverProfile && hv.DriverProfile.driver; } catch(e){}
    return {active, hero, heroSkin};
  });
  console.log('drive:', JSON.stringify(drive));
  console.log('active scenes:', JSON.stringify(state.active), '| heroVehicle:', state.hero, '| driver:', state.heroSkin);
  const crit = [...new Set(n404)].filter(u=>!/favicon|SndThrow|SndPickup/.test(u));
  console.log('critical 404s:', crit.length, crit.slice(0,8).join(' , '));
  await p.screenshot({path:'/tmp/ggrace.png'});
}catch(e){ console.log('ERR', String(e.message||e).slice(0,100)); }
await b.close(); srv.close(); console.log('GGRACE DONE');
