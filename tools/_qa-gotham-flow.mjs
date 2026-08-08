// Walk the child's real route: pick hero -> paint -> pick villain + city -> race.
// Then prove the two things the owner reported: the paint is REAL (not a multiply
// that can only darken) and it does NOT reset when the game moves on.
import puppeteer from 'puppeteer';
import { writeFileSync } from 'node:fs';
const OUT='/tmp/claude-1000/-home-baguspermana7/c58644e4-cfc2-4099-9de4-70f989a3b3f7/scratchpad/';
const b = await puppeteer.launch({ headless:'new', args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage();
await p.setViewport({ width:1600, height:900 });
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,120)));
await p.goto('http://127.0.0.1:8955/games/film-play.html?g=batwheels-gotham-getaway',
             { waitUntil:'domcontentloaded', timeout:60000 });
await new Promise(r=>setTimeout(r,2500));

const step1 = await p.evaluate(()=>({
  picking: document.body.classList.contains('picking'),
  step: document.getElementById('pick').getAttribute('data-step'),
  heroes: [...document.querySelectorAll('#pgrid .acard')].map(e=>e.getAttribute('aria-label')),
  foes: [...document.querySelectorAll('#foerow .acard')].map(e=>e.getAttribute('aria-label')),
  cities: [...document.querySelectorAll('#cityrow .acard')].map(e=>e.getAttribute('aria-label')),
}));
console.log('langkah 1:', JSON.stringify(step1));

// Bibi (index 1) -- deliberately NOT the hero that ships with the villain we pick.
await p.evaluate(()=>document.querySelectorAll('#pgrid .acard')[1].click());
await p.evaluate(()=>document.getElementById('pgo').click());
await new Promise(r=>setTimeout(r,3000));
await p.screenshot({path:OUT+'gg-step2.png'});
const step2 = await p.evaluate(()=>({
  step: document.getElementById('pick').getAttribute('data-step'),
  paints: document.querySelectorAll('#swrow .sw').length,
  stickers: document.querySelectorAll('#strow .sw').length,
  tints: document.querySelectorAll('#stcrow .dot').length,
}));
console.log('langkah 2:', JSON.stringify(step2));

// pick a bright paint (index 1 = Kuning) and a sticker
await p.evaluate(()=>{ document.querySelectorAll('#swrow .sw')[1].click(); });
await new Promise(r=>setTimeout(r,1200));
await p.evaluate(()=>{ const s=document.querySelectorAll('#strow .sw'); if(s[2]) s[2].click(); });
await new Promise(r=>setTimeout(r,1500));
await p.screenshot({path:OUT+'gg-step2-painted.png'});

await p.evaluate(()=>document.getElementById('pgo').click());     // -> step 3
await new Promise(r=>setTimeout(r,800));
// Snowy (index 4) in Pelabuhan (index 2): a cross-pair combination that the
// shipped game cannot produce at all.
await p.evaluate(()=>{ document.querySelectorAll('#foerow .acard')[4].click();
                       document.querySelectorAll('#cityrow .acard')[2].click(); });
await p.screenshot({path:OUT+'gg-step3.png'});
const cfgBefore = await p.evaluate(()=>document.getElementById('pgo').disabled);
await p.evaluate(()=>document.getElementById('pgo').click());
await new Promise(r=>setTimeout(r,3000));
const stored = await p.evaluate(()=>sessionStorage.getItem('gg_custom'));
console.log('goDisabled=',cfgBefore,' tersimpan:', String(stored).slice(0,120));
console.log('pageerror:', errs.slice(0,4));
await b.close();
