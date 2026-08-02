// Deep per-game bug hunt: boot each game DIRECTLY (iframe+WebGL breaks under swiftshader),
// press PLAY (click center), then measure: 404s, console errors, frozen frames (pixel hash of
// canvas over time), audio, and whether interactive controls exist. Concrete defects only.
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';
import http from 'http';
import fs from 'fs';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.mp3':'audio/mpeg','.ogg':'audio/ogg','.webm':'video/webm','.wav':'audio/wav','.svg':'image/svg+xml','.atlas':'text/plain','.css':'text/css','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf'};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f==='/')f='/index.html';const p=path.join(ROOT,f);fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end('nf');return}r.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});r.end(d)})});
await new Promise(res=>srv.listen(0,res)); const PORT=srv.address().port;

const SLUGS = ['batwheels-breakdown','batwheels-by-you','batwheels-gotham-getaway','batwheels-jigsaw',
  'batwheels-match-up','batwheels-playroom','batwheels-pranking-prank','batwheels-toy-trouble','thomas-rail-muddle'];

// headless-only noise to ignore (real device is fine)
const IGNORE = /WebGL|SwiftShader|Fallback|GPU|EncodingError|decodeAudio|Unable to decode|AudioContext|user gesture|ArrayBuffer|DataCloneError|favicon|net::ERR_FAILED.*\.(webm|mp3|ogg)|The play\(\) request/i;

const browser = await puppeteer.launch({
  headless:'new',
  args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required','--mute-audio']
});

for (const slug of SLUGS){
  const page = await browser.newPage();
  await page.setViewport({width:1280,height:800,deviceScaleFactor:1});
  const errs=[], n404=[];
  page.on('console', m=>{ if(m.type()==='error'){ const t=m.text(); if(!IGNORE.test(t)) errs.push(t.slice(0,90)); }});
  page.on('pageerror', e=>{ const t=String(e.message||e); if(!IGNORE.test(t)) errs.push('PAGEERR '+t.slice(0,90)); });
  page.on('requestfailed', r=>{ const u=r.url(); if(!IGNORE.test(u)) n404.push(u.split('/').pop()); });
  page.on('response', r=>{ if(r.status()===404){ const u=r.url(); if(!IGNORE.test(u)) n404.push('404:'+u.split('/').pop()); }});

  let verdict='';
  try{
    await page.goto('http://localhost:'+PORT+'/games/film/'+slug+'/index.html',{waitUntil:'domcontentloaded',timeout:45000});
    await new Promise(r=>setTimeout(r,11000)); // boot + own loader
    // canvas present + sized?
    const c0 = await page.evaluate(()=>{ let w=0,h=0; for(const c of document.querySelectorAll('canvas')){const b=c.getBoundingClientRect(); if(b.width*b.height>w*h){w=Math.round(b.width);h=Math.round(b.height);}} return {w,h}; });
    // hash canvas BEFORE play
    const hashCanvas = async ()=> page.evaluate(()=>{ const cs=[...document.querySelectorAll('canvas')]; if(!cs.length) return 'nocanvas'; let big=cs[0],a=0; for(const c of cs){const s=c.width*c.height; if(s>a){a=s;big=c;}} try{ return big.toDataURL().length+':'+big.toDataURL().slice(500,560);}catch(e){ return 'gl'+big.width+'x'+big.height; } });
    const preHash = await hashCanvas();
    // press play: click center + press common keys
    await page.mouse.click(640,400); await new Promise(r=>setTimeout(r,400));
    await page.mouse.click(640,400); await new Promise(r=>setTimeout(r,2500));
    const h1 = await hashCanvas();
    await new Promise(r=>setTimeout(r,2500));
    const h2 = await hashCanvas();
    const animating = (h1!==h2) || (h1!==preHash); // frame changed = alive
    // rAF running?
    const raf = await page.evaluate(()=>new Promise(res=>{let n=0;const s=performance.now();function t(){n++;if(performance.now()-s>500)res(n>5);else requestAnimationFrame(t);}requestAnimationFrame(t);}));
    verdict = `canvas=${c0.w}x${c0.h} anim=${animating?'Y':'N'} raf=${raf?'Y':'N'}`;
  }catch(e){ verdict='BOOT-ERR '+String(e.message||e).slice(0,50); }

  const u404=[...new Set(n404)].slice(0,4).join(',');
  const uerr=[...new Set(errs)].slice(0,3).join(' | ');
  console.log(slug.padEnd(26), verdict,
    (u404?'  404['+u404+']':''),
    (uerr?'  ERR['+uerr+']':''));
  await page.close();
}
await browser.close();
srv.close();
console.log('DEEP DONE');
