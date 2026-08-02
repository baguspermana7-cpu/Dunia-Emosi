// Screenshot each game at its DESIGN size after press-play — visual bug inspection.
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path'; import http from 'http'; import fs from 'fs';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.mp3':'audio/mpeg','.ogg':'audio/ogg','.webm':'video/webm','.wav':'audio/wav','.svg':'image/svg+xml','.atlas':'text/plain','.css':'text/css'};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f==='/')f='/index.html';const p=path.join(ROOT,f);fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end('nf');return}r.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});r.end(d)})});
await new Promise(res=>srv.listen(0,res)); const PORT=srv.address().port;
const DIM={'batwheels-breakdown':[1920,768],'batwheels-gotham-getaway':[1920,768],'batwheels-playroom':[1920,768],'batwheels-jigsaw':[1440,900],'batwheels-match-up':[1440,900],'batwheels-toy-trouble':[1280,800],'thomas-rail-muddle':[1280,800],'batwheels-by-you':[1280,720],'batwheels-pranking-prank':[1280,720]};
const browser = await puppeteer.launch({headless:'new',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required','--mute-audio']});
for (const [slug,[W,H]] of Object.entries(DIM)){
  const page = await browser.newPage();
  await page.setViewport({width:W,height:H,deviceScaleFactor:1});
  try{
    await page.goto('http://localhost:'+PORT+'/games/film/'+slug+'/index.html',{waitUntil:'networkidle2',timeout:45000});
    await new Promise(r=>setTimeout(r,6000));
    await page.screenshot({path:'/tmp/shot_'+slug+'_title.png'});
    // press play (center) then a couple more spots to try entering gameplay
    await page.mouse.click(W/2,H/2); await new Promise(r=>setTimeout(r,1500));
    await page.mouse.click(W/2,H*0.62); await new Promise(r=>setTimeout(r,3500));
    await page.screenshot({path:'/tmp/shot_'+slug+'_play.png'});
    console.log(slug,'shot ok');
  }catch(e){ console.log(slug,'ERR',String(e.message||e).slice(0,50)); }
  await page.close();
}
await browser.close(); srv.close(); console.log('SHOT DONE');
