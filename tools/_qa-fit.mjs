// Visual FIT check: load film-play.html?g=<slug> at owner-like WIDE RETINA specs,
// screenshot, and report the iframe letterbox rect vs viewport (must fit, centered, aspect-kept).
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const base = 'file://' + ROOT + '/games/film-play.html';

const SLUGS = ['batwheels-breakdown','batwheels-by-you','batwheels-gotham-getaway','batwheels-jigsaw',
  'batwheels-match-up','batwheels-playroom','batwheels-pranking-prank','batwheels-toy-trouble','thomas-rail-muddle'];

// owner tablet-ish: wide landscape + retina DPR
const VIEWS = [{w:1280,h:800,dpr:2,tag:'16:10@2x'},{w:1600,h:720,dpr:2,tag:'20:9@2x'}];

const browser = await puppeteer.launch({
  headless:'new',
  args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--ignore-gpu-blocklist']
});
for (const v of VIEWS){
  for (const slug of SLUGS){
    const page = await browser.newPage();
    await page.setViewport({width:v.w,height:v.h,deviceScaleFactor:v.dpr});
    let overflow=false;
    try{
      await page.goto(base+'?g='+slug,{waitUntil:'domcontentloaded',timeout:30000});
      await new Promise(r=>setTimeout(r,9000));  // boot game
      const info = await page.evaluate(()=>{
        const fr=document.getElementById('frame'); if(!fr) return null;
        const r=fr.getBoundingClientRect();
        const vw=innerWidth, vh=innerHeight;
        // is a canvas present inside?
        let cw=0,ch=0; try{ const d=fr.contentDocument; if(d){ const cs=d.querySelectorAll('canvas'); for(const c of cs){const b=c.getBoundingClientRect(); if(b.width*b.height>cw*ch){cw=Math.round(b.width);ch=Math.round(b.height);}}} }catch(e){}
        const scrollX = document.documentElement.scrollWidth>vw+1 || document.body.scrollWidth>vw+1;
        return {rl:Math.round(r.left),rt:Math.round(r.top),rw:Math.round(r.width),rh:Math.round(r.height),vw,vh,cw,ch,scrollX};
      });
      if(!info){ console.log(slug.padEnd(26),v.tag,'NO FRAME'); await page.close(); continue; }
      // letterbox checks: fits inside viewport, centered (bars symmetric), no page scroll
      const fitsW = info.rw <= info.vw+1, fitsH = info.rh <= info.vh+1;
      const centered = Math.abs(info.rl - (info.vw-info.rw)/2)<=2 && Math.abs(info.rt - (info.vh-info.rh)/2)<=2;
      const ok = fitsW && fitsH && centered && !info.scrollX;
      console.log(slug.padEnd(26),v.tag,
        (ok?'OK ':'BAD'),
        `frame=${info.rw}x${info.rh}@(${info.rl},${info.rt})`,
        `vp=${info.vw}x${info.vh}`,
        `canvas=${info.cw}x${info.ch}`,
        (info.scrollX?'SCROLLX!':''), (!fitsW?'OVERW!':''), (!fitsH?'OVERH!':''), (!centered?'OFFCENTER!':''));
      if(v.tag==='16:10@2x') await page.screenshot({path:`/tmp/fit_${slug}.png`});
    }catch(e){ console.log(slug.padEnd(26),v.tag,'ERR',String(e.message||e).slice(0,60)); }
    await page.close();
  }
}
await browser.close();
console.log('FIT DONE');
