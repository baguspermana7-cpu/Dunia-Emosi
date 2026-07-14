// Drive monster-candy.html: start the game, observe whether candies spawn/render.
import http from 'http';
import { readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'tools', 'qa-out');
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

const tag = process.argv[2] || 'run';
await mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 600, deviceScaleFactor: 1 });
const errors = [], failed = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('PAGEERR: ' + String(e)));
page.on('requestfailed', r => failed.push(r.url() + ' :: ' + (r.failure()?.errorText||'')));

await page.goto(`http://127.0.0.1:${port}/games/monster-candy.html`, { waitUntil: 'networkidle2', timeout: 30000 });
await page.waitForFunction(() => typeof window.startGame === 'function', { timeout: 20000 });
// S / gameLayer are lexical top-level globals shared across classic scripts. A classic
// <script> added to the page can read them; expose a probe onto window.
await page.addScriptTag({ content: `
  window.__probe = function(){
    try {
      var c0 = S.candies[0];
      return {
        running:S.running, started:S.started, quizActive:S.quizActive, gameOver:S.gameOver,
        candies:S.candies.length, spawnTimer:+S.spawnTimer.toFixed(3), spawnInterval:S.spawnInterval,
        frame:S.frame, score:S.score, glChildren: gameLayer ? gameLayer.children.length : -1,
        firstCandy: c0 ? { x:Math.round(c0.x), y:Math.round(c0.y), alive:c0.alive, caught:c0.caught,
          visible:c0.container.visible, alpha:c0.container.alpha, hasParent:!!c0.container.parent,
          childCount:c0.container.children.length } : null
      };
    } catch(e){ return { probeErr:String(e) }; }
  };
`});

// Screenshot before (start overlay)
await page.screenshot({ path: path.join(OUT, `mc-${tag}-preStart.png`) });

// Start the game
await page.evaluate(() => window.startGame());

// let it run ~2s
await new Promise(r => setTimeout(r, 2200));
const at2 = await page.evaluate(() => window.__probe ? window.__probe() : 'no-probe');
await page.screenshot({ path: path.join(OUT, `mc-${tag}-2s.png`) });

await new Promise(r => setTimeout(r, 3000));
const at5 = await page.evaluate(() => window.__probe ? window.__probe() : 'no-probe');
await page.screenshot({ path: path.join(OUT, `mc-${tag}-5s.png`) });

await browser.close();
server.close();
console.log(JSON.stringify({ tag, at2, at5, errors: errors.slice(0,8), failed: failed.slice(0,8) }, null, 2));
