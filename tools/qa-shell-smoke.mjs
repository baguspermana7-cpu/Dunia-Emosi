// Smoke-test games/game-shell.js — mount, drive, screenshot, assert 0 errors.
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
await page.setViewport({ width: 900, height: 560, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) errors.push('http ' + r.status() + ' ' + r.url()); });

await page.goto(`http://127.0.0.1:${port}/games/_shell-smoke.html`, { waitUntil: 'networkidle0', timeout: 30000 });
await page.waitForFunction(() => window.__shellReady === true, { timeout: 15000 });
await new Promise(r => setTimeout(r, 600));

const info = await page.evaluate(() => {
  const q = s => document.querySelector(s);
  return {
    hud: !!q('.gs-hud'), bg: !!q('.gs-bg'), mascot: !!q('.gs-mascot'),
    hero: !!q('.gs-hero'), prog: (document.querySelectorAll('.gs-prog .gs-pdot')||[]).length,
    title: (q('.gs-title')||{}).textContent || '',
    coin: (q('.gs-coinv')||{}).textContent || '',
    bgImg: getComputedStyle(q('.gs-bg')||document.body).backgroundImage || ''
  };
});
await page.screenshot({ path: path.join(ROOT, 'tools/qa-out/shell-smoke.png') });
await browser.close(); server.close();

console.log(JSON.stringify(info, null, 2));
console.log('errors:', errors.length ? errors.join('\n') : 'none');
const ok = info.hud && info.bg && info.mascot && info.hero && info.prog === 6 && errors.length === 0;
console.log(ok ? 'SMOKE PASS' : 'SMOKE FAIL');
process.exit(ok ? 0 : 1);
