// Free pairing: does a hero that does NOT ship with the chosen villain actually
// race, in the chosen city? Report what the game really composed, not what was
// asked for.
import puppeteer from 'puppeteer';
const OUT='/tmp/claude-1000/-home-baguspermana7/dc8f871a-75a8-419a-87d8-5457cc8916de/';
const b = await puppeteer.launch({headless:'new',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const COMBOS = [
  { hero:'bibi', villain:'snowy', city:'docks' },      // 3 different pairs
  { hero:'bam',  villain:'prank', city:'funstreet' },  // the shipped pairing
];
for (const c of COMBOS){
  const p = await b.newPage();
  await p.setViewport({width:1600,height:900});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,100)));
  await p.goto('http://127.0.0.1:8955/games/film-play.html?g=batwheels-gotham-getaway',{waitUntil:'domcontentloaded',timeout:60000});
  await new Promise(r=>setTimeout(r,2500));
  const blob = await p.evaluate(async (hero)=>{
    const r = await GGPaint.paintPage('film/batwheels-gotham-getaway/assets/animations/',hero,'fed52f',null);
    return GGPaint.pageBlobURL(r);
  }, c.hero);
  await p.evaluate((c,blob)=>sessionStorage.setItem('gg_custom',JSON.stringify({...c,paint:blob})), c, blob);
  await p.goto('http://127.0.0.1:8955/games/film/batwheels-gotham-getaway/index.html?targetScene=Game',
               {waitUntil:'domcontentloaded',timeout:60000});
  await new Promise(r=>setTimeout(r,26000));
  // sample the left third where the hero runs, and report the dominant hue so a
  // yellow-painted Bibi is distinguishable from a stock car
  const hero = await p.evaluate(()=>{
    const cv=document.querySelector('canvas'); if(!cv) return null;
    const t=document.createElement('canvas'); t.width=cv.width; t.height=cv.height;
    t.getContext('2d').drawImage(cv,0,0);
    const d=t.getContext('2d').getImageData(0,Math.round(cv.height*0.45),Math.round(cv.width*0.30),Math.round(cv.height*0.45)).data;
    let n=0,r=0,g=0,bl=0;
    for(let i=0;i<d.length;i+=4){ if(d[i+3]<200) continue; n++; r+=d[i]; g+=d[i+1]; bl+=d[i+2]; }
    return {n, r:Math.round(r/n), g:Math.round(g/n), b:Math.round(bl/n)};
  });
  const got = await p.evaluate(()=>window.__ggComposed || null);
  await p.screenshot({path:OUT+`pair-${c.hero}-${c.villain}-${c.city}.png`});
  const ok = got && got.jadi.hero===c.hero && got.jadi.villain===c.villain;
  console.log(`${c.hero} vs ${c.villain} @ ${c.city}  ${ok?'TERSUSUN':'GAGAL SUSUN'}  jadi=${got?got.jadi.hero+'/'+got.jadi.villain:'-'} spine=${got?JSON.stringify(got.spine):'-'} err=${errs.length}`);
  await p.close();
}
await b.close();
