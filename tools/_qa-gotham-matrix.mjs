// Free pairing across a spread of combinations, and -- the owner's actual
// complaint -- does the composition SURVIVE re-entering the Game scene, which
// is what "next level" does.
import puppeteer from 'puppeteer';
const b = await puppeteer.launch({headless:'new',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const C = [
  ['bam','snowy','docks'], ['bibi','ducky','frozenstreet'], ['redbird','prank','citysky'],
  ['batwing','jestah','funstreet'], ['buff','quizz','scrapyard'], ['bibi','jestah','scrapyard'],
];
let fail=0;
for (const [hero,villain,city] of C){
  const p = await b.newPage(); await p.setViewport({width:1600,height:900});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,90)));
  await p.goto('http://127.0.0.1:8955/games/film-play.html?g=batwheels-gotham-getaway',{waitUntil:'domcontentloaded',timeout:60000});
  await new Promise(r=>setTimeout(r,2200));
  const blob = await p.evaluate(async h=>{
    const r = await GGPaint.paintPage('film/batwheels-gotham-getaway/assets/animations/',h,'fed52f',null);
    return GGPaint.pageBlobURL(r);
  }, hero);
  await p.evaluate((h,v,c,bl)=>sessionStorage.setItem('gg_custom',JSON.stringify({hero:h,villain:v,city:c,paint:bl})),hero,villain,city,blob);
  await p.goto('http://127.0.0.1:8955/games/film/batwheels-gotham-getaway/index.html?targetScene=Game',{waitUntil:'domcontentloaded',timeout:60000});
  await new Promise(r=>setTimeout(r,15000));
  const first = await p.evaluate(()=>window.__ggComposed||null);
  const ok = first && first.jadi.hero===hero && first.jadi.villain===villain && errs.length===0;
  if(!ok) fail++;
  console.log(`${hero}/${villain}@${city}  ${ok?'OK':'GAGAL'}  jadi=${first?first.jadi.hero+'/'+first.jadi.villain:'-'} err=${errs.length} ${errs[0]||''}`);
  await p.close();
}
await b.close();
console.log(fail? `${fail}/${C.length} GAGAL` : `${C.length}/${C.length} kombinasi tersusun benar`);
process.exit(fail?1:0);
