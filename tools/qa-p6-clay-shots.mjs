// P6 — screenshot g1-g8 gameplay + proof-unchanged g9/g12/landing/level-select.
// Drives the SPA via game.js entry points. Pass "before" or "after" as argv[2].
import http from 'http';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TAG = process.argv[2] === 'after' ? 'after' : 'before';
const OUT = path.join(ROOT, 'tools', 'qa-out');
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.json':'application/json','.mp3':'audio/mpeg','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif' };

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
const BASE = `http://127.0.0.1:${port}`;

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));

await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded', timeout: 45000 });
// wait for game.js to expose entry fns
await page.waitForFunction(() => typeof window.startGameWithLevel === 'function' && typeof window.showScreen === 'function', { timeout: 30000 });
// dismiss loader if present
await page.evaluate(() => { const l = document.getElementById('page-loader'); if (l) l.style.display='none'; });

const sleep = ms => new Promise(r => setTimeout(r, ms));
// Let the window 'load' boot sequence (which resets to screen-welcome) fully settle
// BEFORE we start driving games, so it can't revert us mid-capture.
await sleep(2500);

// Launch a learning game screen g1-g8 (SPA). g6 redirects, so we just showScreen it.
async function shotGame(n) {
  await page.evaluate((num) => {
    try {
      if (num === 6) {
        // g6 initGame6 redirects to mobil.html; set state via openLevelSelect then just
        // reveal the legacy SPA screen (skip init which would navigate away).
        window.openLevelSelect(6);
        window.showScreen('screen-game6');
        var tw = document.getElementById('g6-target-word'); if (tw) tw.textContent = 'K U C I N G';
      } else {
        window.openLevelSelect(num);   // sets state.currentGame = num
        window.startGameWithLevel(1);  // shows screen-gameN + runs initGameN
      }
    } catch (e) { window.__p6err = String(e); }
  }, n);
  await sleep(700);
  // If boot reverted us, drive again and confirm the target screen is active.
  for (let t = 0; t < 3; t++) {
    const active = await page.evaluate(() => document.querySelector('.screen.active')?.id);
    if (active === 'screen-game' + n) break;
    await page.evaluate((num) => {
      try {
        if (num === 6) { window.openLevelSelect(6); window.showScreen('screen-game6'); }
        else { window.openLevelSelect(num); window.startGameWithLevel(1); }
      } catch (e) {}
    }, n);
    await sleep(500);
  }
  const f = path.join(OUT, `p6-g${n}-${TAG}.png`);
  await page.screenshot({ path: f });
  return f;
}

const files = [];
for (let n = 1; n <= 8; n++) {
  try { files.push(await shotGame(n)); }
  catch (e) { console.log('ERR g'+n, String(e)); }
  // reset to menu between games to avoid state bleed
  await page.evaluate(() => { try { window.showScreen('screen-menu'); } catch(_){} });
  await sleep(150);
}

// PROOF-UNCHANGED: g9 (SPA), g12 (SPA), landing (welcome), one level-select.
async function shotOther(label, fn, expectId) {
  await page.evaluate(fn);
  await sleep(700);
  if (expectId) {
    for (let t = 0; t < 3; t++) {
      const active = await page.evaluate(() => document.querySelector('.screen.active')?.id);
      if (active === expectId) break;
      await page.evaluate(fn); await sleep(500);
    }
  }
  const f = path.join(OUT, `p6-${label}-${TAG}.png`);
  await page.screenshot({ path: f });
  files.push(f);
}
await shotOther('g9', () => { window.openLevelSelect(9); window.startGameWithLevel(1); }, 'screen-game9');
await page.evaluate(() => { try { window.showScreen('screen-menu'); } catch(_){} }); await sleep(150);
await shotOther('g12', () => { window.openLevelSelect(12); window.startGameWithLevel(1); }, 'screen-game12');
await page.evaluate(() => { try { window.showScreen('screen-menu'); } catch(_){} }); await sleep(150);
await shotOther('landing', () => { window.showScreen('screen-welcome'); }, 'screen-welcome');
await shotOther('levelselect', () => { window.openLevelSelect(1); }, 'screen-level');

console.log('SHOTS:', files.map(f => path.basename(f)).join(', '));
console.log('CONSOLE_ERRORS:', errors.length);
if (errors.length) console.log(errors.slice(0, 20).join('\n'));

await browser.close();
server.close();
