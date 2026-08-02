import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path'; import http from 'http'; import fs from 'fs';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.mp3':'audio/mpeg','.ogg':'audio/ogg','.webm':'video/webm','.wav':'audio/wav','.svg':'image/svg+xml','.atlas':'text/plain','.css':'text/css'};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f==='/')f='/index.html';const p=path.join(ROOT,f);fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end('nf');return}r.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});r.end(d)})});
await new Promise(res=>srv.listen(0,res)); const PORT=srv.address().port;
const ASPECTS=[[2048,1536,'big43'],[2560,1440,'big169'],[1920,1080,'fhd'],[1600,1000,'16x10'],[2048,1152,'big169b']];
const browser = await puppeteer.launch({headless:'new',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required','--mute-audio']});
for (const [W,H,tag] of ASPECTS){
  const page = await browser.newPage();
  await page.setViewport({width:W,height:H,deviceScaleFactor:1});
  try{
    await page.goto('http://localhost:'+PORT+'/games/film/batwheels-by-you/index.html',{waitUntil:'networkidle2',timeout:45000});
    await new Promise(r=>setTimeout(r,7000));
    await page.screenshot({path:'/tmp/byyou2_'+tag+'.png'});
    console.log('by-you',tag,W+'x'+H);
  }catch(e){ console.log(tag,'ERR',String(e.message||e).slice(0,50)); }
  await page.close();
}
await browser.close(); srv.close(); console.log('BY2 DONE');
