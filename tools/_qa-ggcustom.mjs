import puppeteer from 'puppeteer';
import path from 'path'; import http from 'http'; import fs from 'fs';
import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.mp3':'audio/mpeg','.ogg':'audio/ogg','.webm':'video/webm','.svg':'image/svg+xml','.atlas':'text/plain','.css':'text/css','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf'};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f==='/')f='/index.html';const p=path.join(ROOT,f);fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end('nf');return}r.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});r.end(d)})});
await new Promise(res=>srv.listen(0,res)); const PORT=srv.address().port;
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required','--mute-audio']});
const p=await b.newPage(); await p.setViewport({width:1280,height:768,deviceScaleFactor:1});
const ggLogs=[], errs=[];
p.on('console',m=>{const t=m.text(); if(t.includes('[gg-custom]')) ggLogs.push(t); if(m.type()==='error' && !/WebGL|SwiftShader|GPU|EncodingError|favicon|ArrayBuffer|audio/i.test(t)) errs.push(t.slice(0,100));});
p.on('pageerror',e=>{const t=String(e.message||e); if(!/WebGL|SwiftShader/i.test(t)) errs.push('PAGEERR '+t.slice(0,100));});
try{
  await p.goto('http://localhost:'+PORT+'/games/film/batwheels-gotham-getaway/index.html?chaser=buff,ff3b30',{waitUntil:'networkidle2',timeout:45000});
  await new Promise(r=>setTimeout(r,12000)); // boot to Title
  const info = await p.evaluate(()=>{
    var g = window.__ggGame;
    var scenes = [];
    try { if(g && g.scene && g.scene.scenes) scenes = g.scene.scenes.filter(s=>s.scene.settings.active||s.scene.settings.visible).map(s=>s.scene.key); } catch(e){}
    return { installed: !!window.__ggCustomInstalled, captured: !!g, activeScenes: scenes,
             canvas: (function(){var c=document.querySelector('#game canvas');return c?c.width+'x'+c.height:'none';})() };
  });
  console.log('installed:', info.installed, '| captured:', info.captured);
  console.log('activeScenes:', JSON.stringify(info.activeScenes), '| canvas:', info.canvas);
  console.log('ggLogs:', JSON.stringify(ggLogs));
  console.log('realErrors:', errs.length, errs.slice(0,3).join(' | '));
  await p.screenshot({path:'/tmp/ggcustom_title.png'});
}catch(e){ console.log('ERR', String(e.message||e).slice(0,80)); }
await b.close(); srv.close(); console.log('GGC DONE');
