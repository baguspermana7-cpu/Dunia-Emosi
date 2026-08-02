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
// helper: click all interactive game objects' world positions for the active top scene
async function activeInteractives(){
  return p.evaluate(()=>{
    const g=window.__ggGame; if(!g) return {scene:null,objs:[]};
    const scenes=g.scene.scenes.filter(s=>s.scene.settings.active);
    const top=scenes[scenes.length-1]; if(!top) return {scene:null,objs:[]};
    const objs=[];
    top.children && top.children.list.forEach(o=>{
      if(o.input && o.input.enabled){ const b=o.getBounds?o.getBounds():null; if(b) objs.push({x:Math.round(b.centerX),y:Math.round(b.centerY),w:Math.round(b.width),h:Math.round(b.height),name:o.name||o.texture&&o.texture.key||o.type}); }
    });
    return {scene:top.scene.key, objs};
  });
}
try{
  await p.goto('http://localhost:'+PORT+'/games/film/batwheels-gotham-getaway/index.html',{waitUntil:'networkidle2',timeout:45000});
  await new Promise(r=>setTimeout(r,11000));
  let info = await activeInteractives();
  console.log('TITLE scene:', info.scene, 'interactives:', JSON.stringify(info.objs));
  await p.screenshot({path:'/tmp/ggc_title.png'});
}catch(e){ console.log('ERR', String(e.message||e).slice(0,120)); }
await b.close(); srv.close(); console.log('GGCLICK DONE');
