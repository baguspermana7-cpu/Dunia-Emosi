import puppeteer from 'puppeteer';
import path from 'path'; import http from 'http'; import fs from 'fs';
import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.mp3':'audio/mpeg','.ogg':'audio/ogg','.webm':'video/webm','.svg':'image/svg+xml','.atlas':'text/plain','.css':'text/css','.woff2':'font/woff2'};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f==='/')f='/index.html';const p=path.join(ROOT,f);fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end('nf');return}r.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});r.end(d)})});
await new Promise(res=>srv.listen(0,res)); const PORT=srv.address().port;
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required','--mute-audio']});
const p=await b.newPage(); await p.setViewport({width:576,height:1024,deviceScaleFactor:1});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
  await p.goto('http://localhost:'+PORT+'/games/film/batwheels-by-you/index.html',{waitUntil:'networkidle2',timeout:45000});
  await sleep(8000);
  await p.screenshot({path:'/tmp/byou_title_portrait.png'});
  // enter customize for vehicle 1 via the game's own API
  const drv = await p.evaluate(()=>{ try{ var g=window.g; if(!g) return 'no-g';
    if(g.titlescreen && g.titlescreen.startgame){ g.titlescreen.startgame(1); return 'startgame(1)'; }
    return 'no-titlescreen'; }catch(e){ return 'err:'+e; } });
  await sleep(6000);
  await p.screenshot({path:'/tmp/byou_customize.png'});
  const info = await p.evaluate(()=>{ try{ var g=window.g; return {scene:g&&g.scenename, hasMenubar:!!(g&&g.menubar), menuVisible: g&&g.menubar? g.menubar.visible : null}; }catch(e){ return {err:String(e)}; } });
  console.log('drive:', drv, '| info:', JSON.stringify(info));
}catch(e){ console.log('ERR', String(e.message||e).slice(0,120)); }
await b.close(); srv.close(); console.log('BYOUFIX DONE');
