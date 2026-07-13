// P2 — verify balapan-kereta-side gap physics: a jump started before a gap clears
// the WHOLE gap (0 HP loss); a fully-grounded pass over a gap still costs HP.
// tick()/g14sJump() are globals (classic script). window.S is exposed (line 353).
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

await page.goto(`http://127.0.0.1:${port}/games/balapan-kereta-side.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.S && typeof window.tick === 'function' && typeof window.g14sJump === 'function', { timeout: 20000 });

const result = await page.evaluate(async () => {
  const S = window.S;
  const step = () => window.tick({ deltaMS: 16.67 });
  const arm = () => { S.running = true; S.paused = false; S.gameOver = false; S.finished = false;
    S.invincible = 0; S.jumping = false; S.jumpY = 0; S.jumpVel = 0; S.jumpBuffered = false; };
  const out = {};

  // CONTROL: grounded, sitting inside a gap → should lose HP.
  arm(); S.hp = 3; S.gaps = [{ worldStart: 100, worldEnd: 130, cleared: false }]; S.distance = 115;
  try { step(); } catch (e) { out.controlErr = String(e); }
  out.controlHp = S.hp;                 // expect 2

  // FIX: jump just before the gap, then advance while airborne across it → cleared, no loss.
  arm(); S.hp = 3; S.gaps = [{ worldStart: 400, worldEnd: 430, cleared: false }]; S.distance = 388;
  window.g14sJump();                     // lift off ~12 units before the gap
  let landed = false, hpDuring = 3;
  for (let i = 0; i < 90 && S.distance < 460; i++) {
    try { step(); } catch (e) { out.fixErr = out.fixErr || String(e); }
    hpDuring = Math.min(hpDuring, S.hp);
    if (!S.jumping && S.distance > 430) { landed = true; break; }
  }
  out.gapCleared = S.gaps[0] && S.gaps[0].cleared === true;
  out.fixHpMin = hpDuring;               // expect 3 (never dropped)
  out.crossed = S.distance >= 430;
  return out;
});

await browser.close();
server.close();

const pass =
  result.controlHp === 2 &&          // grounded gap still punishes
  result.gapCleared === true &&      // airborne latch fired
  result.fixHpMin === 3 &&           // jump-early never lost HP
  result.crossed === true &&
  !result.controlErr && !result.fixErr &&
  errors.length === 0;

console.log(JSON.stringify({ ...result, errors: errors.slice(0, 5), pass }, null, 2));
process.exit(pass ? 0 : 1);
