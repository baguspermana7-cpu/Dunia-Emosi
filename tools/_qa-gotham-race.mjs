// The decisive test: does the paint reach the actual RACE, and does a
// cross-pair combination (a hero that does not ship with the chosen villain)
// actually compose? Drive the game page directly with a config in place.
import puppeteer from 'puppeteer';
const OUT='/tmp/claude-1000/-home-baguspermana7/c58644e4-cfc2-4099-9de4-70f989a3b3f7/scratchpad/';
const b = await puppeteer.launch({ headless:'new', args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage();
await p.setViewport({ width:1600, height:900 });
const errs=[], fails=[];
p.on('pageerror',e=>errs.push(String(e).slice(0,110)));
p.on('response',r=>{ if(r.status()>=400) fails.push(r.url().split('/').pop()+' '+r.status()); });

// Build the painted page in a wrapper context, then hand it to the game the
// same way the picker does.
await p.goto('http://127.0.0.1:8955/games/film-play.html?g=batwheels-gotham-getaway',
             { waitUntil:'domcontentloaded', timeout:60000 });
await new Promise(r=>setTimeout(r,2500));
const blob = await p.evaluate(async ()=>{
  const res = await GGPaint.paintPage('film/batwheels-gotham-getaway/assets/animations/','bibi','fed52f',
    { url:'film/assets/gg-stickers/bibi-1.webp', tint:'ffffff' });
  return GGPaint.pageBlobURL(res);
});
await p.evaluate((blob)=>{
  sessionStorage.setItem('gg_custom', JSON.stringify({hero:'bibi',villain:'snowy',city:'docks',paint:blob}));
}, blob);

await p.goto('http://127.0.0.1:8955/games/film/batwheels-gotham-getaway/index.html?targetScene=Game',
             { waitUntil:'domcontentloaded', timeout:60000 });
await new Promise(r=>setTimeout(r,14000));
await p.screenshot({path:OUT+'gg-race.png'});

const info = await p.evaluate(()=>{
  const cvs=[...document.querySelectorAll('canvas')];
  const out={ canvases:cvs.length, size: cvs[0]?cvs[0].width+'x'+cvs[0].height:null };
  // find the Phaser game through the canvas' owning scene manager if exposed
  try {
    const g = window.__ggGame || null;
    out.game = !!g;
  } catch(e){}
  return out;
});
console.log('kanvas:', JSON.stringify(info));
console.log('gagal muat:', fails.slice(0,6));
console.log('pageerror:', errs.slice(0,4));
await b.close();
