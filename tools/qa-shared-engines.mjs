// P7 — shared-engine regression gate. Loads the SPA (which loads every shared
// engine) and asserts each engine's public API is present + smoke-tests methods,
// including the P7 additions (DBLabeled.byName/find/silhouette, QuizEngine.ops,
// DBSprites path/pickN). Catches future breakage of the shared M-303 engines.
import http from 'http';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.json':'application/json','.mp3':'audio/mpeg','.woff2':'font/woff2','.svg':'image/svg+xml' };
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

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));

// Phase 1 — DB engines (loaded by the SPA index.html)
await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.DBSprites && window.DBLabeled, { timeout: 20000 });
const rDb = await page.evaluate(() => {
  const out = {};
  out.dbs_api = ['path','pick','pickN','categories'].every(m => typeof DBSprites[m] === 'function');
  out.dbs_path = /assets\/db\/creatures\/001\.webp$/.test(DBSprites.path('creatures', 1));
  out.dbs_pickN = DBSprites.pickN('vehicles', 5).length === 5;
  out.dbl_api = ['groups','label','pick','question','all','byName','find','silhouette','count','total'].every(m => typeof DBLabeled[m] === 'function');
  out.dbl_total = DBLabeled.total() >= 137;
  out.dbl_byName = !!(DBLabeled.byName('kendaraan','Pesawat') || {}).src;
  out.dbl_find = (DBLabeled.find('Matahari') || {}).group === 'sains';
  const sil = DBLabeled.silhouette('hewan'); out.dbl_sil = !!(sil && sil.shadow && sil.choices.length === 4);
  return out;
});

// Phase 2 — QuizEngine + VFX (loaded by gym-pokemon.html)
await page.goto(`http://127.0.0.1:${port}/games/gym-pokemon.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.QuizEngine && window.VFX, { timeout: 20000 });
const rQv = await page.evaluate(() => {
  const out = {};
  out.qe_api = ['generate','fill','ask'].every(m => typeof QuizEngine[m] === 'function');
  const q1 = QuizEngine.generate({ level: 3 });
  out.qe_default = q1 && typeof q1.answer === 'number' && q1.options.length === 4 && q1.options.indexOf(q1.answer) >= 0;
  const q2 = QuizEngine.generate({ level: 8, ops: ['×'] });
  out.qe_ops = q2 && /×/.test(q2.question) && q2.options.indexOf(q2.answer) >= 0;
  out.vfx_api = ['burst','aura','projectile','dom','domAura','domProjectile','typeFx'].every(m => typeof VFX[m] === 'function');
  out.vfx_typeFx = !!VFX.typeFx('fire');
  return out;
});
const r = { ...rDb, ...rQv };

await browser.close();
server.close();

const checks = Object.entries(r);
const failed = checks.filter(([, v]) => v !== true).map(([k]) => k);
const pass = failed.length === 0 && errors.length === 0;
console.log(JSON.stringify({ ...r, errors: errors.slice(0, 5), failed, pass }, null, 2));
console.log(pass ? 'SHARED ENGINES OK' : 'SHARED ENGINES FAIL: ' + failed.join(', '));
process.exit(pass ? 0 : 1);
