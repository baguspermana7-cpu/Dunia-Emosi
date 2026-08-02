import puppeteer from 'puppeteer';
import path from 'path'; import http from 'http'; import fs from 'fs';
import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.mp3':'audio/mpeg','.ogg':'audio/ogg','.webm':'video/webm','.svg':'image/svg+xml','.atlas':'text/plain','.css':'text/css'};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f==='/')f='/index.html';const p=path.join(ROOT,f);fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end('nf');return}r.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});r.end(d)})});
await new Promise(res=>srv.listen(0,res)); const PORT=srv.address().port;
const A=[[375,812,'iphone'],[320,640,'half'],[414,896,'plus'],[360,780,'android']];
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required','--mute-audio']});
for(const [W,H,t] of A){const p=await b.newPage();await p.setViewport({width:W,height:H,deviceScaleFactor:1});
try{await p.goto('http://localhost:'+PORT+'/games/film/batwheels-by-you/index.html',{waitUntil:'networkidle2',timeout:45000});await new Promise(r=>setTimeout(r,7000));await p.screenshot({path:'/tmp/byn_'+t+'.png'});console.log('byn',t,W+'x'+H,'ar='+(W/H).toFixed(3));}catch(e){console.log(t,'ERR');}await p.close();}
await b.close();srv.close();console.log('BYN DONE');
