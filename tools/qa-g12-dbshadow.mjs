// Verify g12 Tebak Bayangan DB-silhouette questions: black-out real sprite +
// readable name choices, reveal to full colour on answer; emoji shadows still work.
// g12State is a lexical `let` (not window.g12State) — verify via rendered DOM only.
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
const base = `http://127.0.0.1:${port}`;

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));

await page.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window.initGame12 === 'function' && window.DBLabeled, { timeout: 20000 });

const result = await page.evaluate(async () => {
  window.state = window.state || {};
  state.players = [{ animal: '🦊', stars: 0 }];
  state.currentPlayer = 0;
  state.selectedLevel = 'medium';
  const qEl = document.getElementById('g12-question');
  const host = qEl && qEl.closest('[id^="screen"]');
  if (host) host.style.display = 'block';

  const out = { sawDb: false, sawEmoji: false, silhouette: false, choiceCount: 0, choiceTexts: [], revealed: false, allNamesLabeled: false };

  // Re-init until we render a DB-silhouette question (≈60% each try).
  for (let i = 0; i < 30 && !out.sawDb; i++) {
    initGame12();
    const img = document.getElementById('g12-shadow-img');
    if (img) {
      out.sawDb = true;
      out.silhouette = /brightness\(0\)/.test(img.style.filter);
      const btns = Array.from(document.querySelectorAll('#g12-choices .shadow-btn'));
      out.choiceCount = btns.length;
      out.choiceTexts = btns.map(b => b.textContent.trim());
      out.allNamesLabeled = btns.every(b => b.textContent.trim().length > 0 && !/�/.test(b.textContent));
      // Answer (any choice) → silhouette must reveal to full colour.
      if (btns[0]) btns[0].click();
      await new Promise(r => setTimeout(r, 150));
      const img2 = document.getElementById('g12-shadow-img');
      out.revealed = !!img2 && img2.style.filter === 'none';
    } else {
      out.sawEmoji = true;
    }
  }
  // Ensure emoji path also reachable.
  for (let i = 0; i < 30 && !out.sawEmoji; i++) {
    initGame12();
    if (!document.getElementById('g12-shadow-img')) out.sawEmoji = true;
  }
  return out;
});

await browser.close();
server.close();

const pass =
  result.sawDb &&
  result.sawEmoji &&
  result.silhouette &&
  result.choiceCount === 4 &&
  result.allNamesLabeled &&
  result.revealed &&
  errors.length === 0;

console.log(JSON.stringify({ ...result, errors: errors.slice(0, 5), pass }, null, 2));
process.exit(pass ? 0 : 1);
