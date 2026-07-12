// A-351 regression sweep — boot Pokémon + train games, assert 0 console errors +
// 0 404s on the changed shared files. Embedded server (sandbox-safe). Batched.
import puppeteer from 'puppeteer';
import http from 'http'; import fs from 'fs'; import path from 'path';

const ROOT = path.resolve(process.cwd());
const MIME = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.mp3':'audio/mpeg','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon' };
const server = http.createServer((req,res)=>{ let p=decodeURIComponent(req.url.split('?')[0]); if(p==='/')p='/index.html'; fs.readFile(path.join(ROOT,p),(e,b)=>{ if(e){res.writeHead(404);res.end('404');return;} res.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'}); res.end(b); }); });
await new Promise(r=>server.listen(0,r)); const PORT=server.address().port;

const PAGES = [
  { pg:'games/gym-pokemon.html',       kind:'pokemon' },
  { pg:'games/pokemon-run.html',       kind:'pokemon' },
  { pg:'games/mario-pokemon.html',     kind:'pokemon' },
  { pg:'games/pokemon-birds.html',     kind:'pokemon' },
  { pg:'games/pokemon-bawah-laut.html',kind:'pokemon' },
  { pg:'games/balapan-kereta.html',    kind:'train'   },
  { pg:'games/balapan-kereta-side.html',kind:'train'  },
  { pg:'games/lokomotif-pemberani.html',kind:'train'  },
  { pg:'games/selamatkan-kereta.html', kind:'train'   },
  { pg:'games/museum-kereta.html',     kind:'train'   },
];
const CHANGED = /sfx-engine\.js|quiz-engine\.js|math-rules\.js|vfx-engine\.js|explosion-fx\.js|assets\/sfx\/crash\.mp3|assets\/vfx\//;
// noise we ignore (pre-existing, cross-origin, optional assets)
const NOISE = /favicon|deviceorientation|pokemondb|play\.pokemonshowdown|showdown|net::ERR_(BLOCKED|CONNECTION|NAME|INTERNET)|ERR_CACHE|Failed to load resource: the server responded with a status of 404.*\.(png|webp|mp3|json)|ipapi|googleapis|gstatic/;

let bad = 0;
const results = [];
for (let i=0;i<PAGES.length;i+=2){
  const browser = await puppeteer.launch({ headless:'new', args:['--no-sandbox','--use-gl=swiftshader'] });
  const chunk = PAGES.slice(i,i+2);
  await Promise.all(chunk.map(async ({pg,kind})=>{
    const page = await browser.newPage();
    const errs=[]; const changed404=[];
    page.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
    page.on('pageerror', e=>errs.push('PAGEERR: '+e.message));
    page.on('requestfailed', r=>{ const u=r.url(); if(CHANGED.test(u)) changed404.push(u.split('/').pop()); });
    page.on('response', r=>{ const u=r.url(); if(CHANGED.test(u) && r.status()>=400) changed404.push(u.split('/').pop()+':'+r.status()); });
    try{ await page.goto(`http://localhost:${PORT}/${pg}`,{ waitUntil:'networkidle2', timeout:30000 }); }
    catch(e){ errs.push('NAV: '+e.message); }
    await new Promise(r=>setTimeout(r,2200));
    const canvas = await page.evaluate(()=>!!document.querySelector('canvas') || document.body.innerText.length>0);
    const realErrs = errs.filter(t=>!NOISE.test(t));
    const okp = realErrs.length===0 && changed404.length===0 && canvas;
    if(!okp) bad++;
    results.push({pg,kind,ok:okp,errs:realErrs.slice(0,3),changed404,canvas});
    await page.close();
  }));
  await browser.close();
}
server.close();
results.sort((a,b)=>a.pg.localeCompare(b.pg));
for(const r of results){
  console.log((r.ok?'✅':'❌')+' ['+r.kind+'] '+r.pg.replace('games/','')+(r.ok?'':'  '+ (r.changed404.length?('SHARED-404: '+r.changed404.join(','))+' ':'') + r.errs.join(' | ')));
}
console.log('\n'+(bad?bad+' game(s) with problems':'ALL '+results.length+' POKÉMON + TRAIN GAMES CLEAN — 0 console errors, 0 shared-file 404s'));
process.exit(bad?1:0);
