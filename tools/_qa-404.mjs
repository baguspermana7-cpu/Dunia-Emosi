// Capture EXACT 404 URLs per game (real missing asset vs harmless noise).
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path'; import http from 'http'; import fs from 'fs';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.mp3':'audio/mpeg','.ogg':'audio/ogg','.webm':'video/webm','.wav':'audio/wav','.svg':'image/svg+xml','.atlas':'text/plain','.css':'text/css'};
const miss=[];
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f==='/')f='/index.html';const p=path.join(ROOT,f);fs.readFile(p,(e,d)=>{if(e){miss.push(q.url);r.writeHead(404);r.end('nf');return}r.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});r.end(d)})});
await new Promise(res=>srv.listen(0,res)); const PORT=srv.address().port;
const SLUGS = ['batwheels-breakdown','batwheels-by-you','batwheels-gotham-getaway','batwheels-jigsaw','batwheels-match-up','batwheels-playroom','batwheels-pranking-prank','batwheels-toy-trouble','thomas-rail-muddle'];
const browser = await puppeteer.launch({headless:'new',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required','--mute-audio']});
for (const slug of SLUGS){
  miss.length=0;
  const page = await browser.newPage();
  await page.setViewport({width:1280,height:800,deviceScaleFactor:1});
  try{
    await page.goto('http://localhost:'+PORT+'/games/film/'+slug+'/index.html',{waitUntil:'networkidle2',timeout:45000});
    await new Promise(r=>setTimeout(r,3000));
    await page.mouse.click(640,400); await new Promise(r=>setTimeout(r,3000)); // press play, load gameplay assets
  }catch(e){}
  const rel = [...new Set(miss)].map(u=>u.replace('/games/film/'+slug+'/','').split('?')[0]);
  console.log(slug.padEnd(26), rel.length?rel.join(' , '):'(no 404)');
  await page.close();
}
await browser.close(); srv.close(); console.log('404 DONE');
