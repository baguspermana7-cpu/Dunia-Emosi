// READ-ONLY audit driver — screenshots g3,g4,g7 in portrait + landscape.
// (g1/g2/g5 were retired on 2026-09-20 and their rows removed.)
import http from 'http';
import { readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'tools', 'qa-out');
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.json':'application/json','.mp3':'audio/mpeg','.woff2':'font/woff2','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif' };
const server = http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const fp = path.join(ROOT, p);
    if (!existsSync(fp)) { res.writeHead(404); res.end('nf'); return; }
    const buf = await readFile(fp);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
    res.end(buf);
  } catch (e) { res.writeHead(500); res.end(String(e)); }
});
await new Promise(r => server.listen(0, r));
const port = server.address().port;
await mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-web-security'] });
const games = [3,4,7];   // 1/2/5 retired 2026-09-20
const report = {};
const ONLY = process.env.VIEW; // 'portrait' | 'landscape' | undefined(both)
let views = [{n:'portrait',w:412,h:915},{n:'landscape',w:760,h:360}];
if (ONLY) views = views.filter(v=>v.n===ONLY);

for (const view of views) {
  for (const g of games) {
    const page = await browser.newPage();
    await page.setViewport({ width: view.w, height: view.h, deviceScaleFactor: 1 });
    await page.evaluateOnNewDocument(()=>{ try{ Object.defineProperty(navigator,'serviceWorker',{configurable:true,get:()=>({register:()=>Promise.reject(new Error('blocked')),addEventListener:()=>{},ready:Promise.resolve({})})}); }catch(_){} });
    await page.setRequestInterception(true);
    page.on('request', r => { const u=r.url(); if (u.startsWith('http://127.0.0.1')||u.startsWith('data:')) r.continue(); else r.abort(); });
    const errors = [];
    page.on('console', m => { if (m.type()==='error') errors.push(m.text().slice(0,160)); });
    page.on('pageerror', e => errors.push(String(e).slice(0,160)));
    try {
      await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil:'domcontentloaded', timeout:30000 });
      await page.waitForFunction(() => typeof window.initGame1==='function' && typeof window.showScreen==='function', { timeout:20000 });
      const info = await page.evaluate((g) => {
        // Neutralize audio/speech to keep drive deterministic.
        try { window.speechSynthesis && (window.speechSynthesis.speak = ()=>{}); } catch(_){}
        try { var l=document.getElementById('page-loader'); if(l) l.remove(); } catch(_){}
        window.state = window.state || {};
        Object.assign(window.state, {
          players:[{animal:'🦊',name:'Rara',stars:0,ageTier:'tumbuh'},{animal:'🐼',name:'Bimo',stars:0,ageTier:'tumbuh'}],
          currentPlayer:0, mode:'solo', selectedLevel:'medium', selectedLevelNum:10,
          gameStars:[0,0], currentGame:g
        });
        try { window.showScreen('screen-game'+g); } catch(e){ return {err:'showScreen '+e}; }
        const inits={3:window.initGame3,4:window.initGame4,7:window.initGame7};
        try { inits[g](); } catch(e){ return {err:'init '+e}; }
        return { ok:true };
      }, g);
      // Let one render settle.
      await new Promise(r=>setTimeout(r,900));
      await page.evaluate(()=>{ try{ var l=document.getElementById('page-loader'); if(l) l.remove(); }catch(_){}});
      report[`g${g}-${view.n}`] = { ...info, errors: errors.slice(0,6) };
      await page.screenshot({ path: path.join(OUT, `audit-g${g}-${view.n}.png`) });
    } catch (e) {
      report[`g${g}-${view.n}`] = { err:String(e).slice(0,200), errors:errors.slice(0,6) };
      try { await page.screenshot({ path: path.join(OUT, `audit-g${g}-${view.n}.png`) }); } catch(_){}
    }
    await page.close();
  }
}

await browser.close();
server.close();
console.log(JSON.stringify(report, null, 2));
