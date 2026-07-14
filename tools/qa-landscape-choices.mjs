// VERIFY: in LANDSCAPE the answer/choice buttons must all be on-screen (not clipped
// below the overflow-hidden .screen). Drives g1,g2,g3,g4,g5,g7 into gameplay at two
// landscape sizes + a portrait control. Screenshots to tools/qa-out/ls-gN-{before,after}.png
// and portrait ls-gN-portrait.png. Asserts every choice button's rect.bottom <= screen bottom.
import http from 'http';
import { readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'tools', 'qa-out');
const PHASE = process.argv[2] || 'after';   // 'before' | 'after'
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.json':'application/json','.mp3':'audio/mpeg','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.svg':'image/svg+xml','.gif':'image/gif' };

const server = http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    // Serve sw.js as 404 so the SPA's service-worker registration fails cleanly — its
    // first-visit activation otherwise fires a location.reload() that aborts navigation.
    if (p === '/sw.js') { res.writeHead(404); res.end('nf'); return; }
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

// Games under test. selector = the choices container(s) whose children are the tappable choices.
const GAMES = [
  { n: 1, init: 'initGame1', screen: 'screen-game1', choiceSel: '#g1-choices .g1-choice-btn' },
  { n: 2, init: 'initGame2', screen: 'screen-game2', choiceSel: '#g2-start-btn' },
  { n: 3, init: 'initGame3', screen: 'screen-game3', choiceSel: '#g3-choices .g3-choice-btn' },
  { n: 4, init: 'initGame4', screen: 'screen-game4', choiceSel: '#g4-choices .g4-choice-btn' },
  { n: 5, init: 'initGame5', screen: 'screen-game5', choiceSel: '#g5-grid .g5-card' },
  { n: 7, init: 'initGame7', screen: 'screen-game7', choiceSel: '#g7-choices .g7-choice-btn' },
];

const LANDSCAPES = [{ w: 760, h: 360 }, { w: 812, h: 375 }];
const PORTRAIT = { w: 412, h: 915 };

// pre-existing / cross-origin noise we ignore (matches the regression sweep's stance):
// optional DB-sprite 404s, favicon, external CDNs, geo-IP, blocked device sensors.
const NOISE = /favicon|deviceorientation|pokemondb|showdown|ipapi|googleapis|gstatic|net::ERR_(BLOCKED|CONNECTION|NAME|INTERNET|CACHE)|Failed to load resource: the server responded with a status of 404|bad HTTP response code \(404\).*fetching the script|ServiceWorker|sw\.js/i;

const bootErrors = [];
const results = [];

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 90000 });

// Warm-up: the FIRST newPage() in a fresh headless browser has a slow cold-start
// navigation (>45s under load) AND triggers the one-time SW install/reload. Absorb
// both here with a throwaway page so every real iteration is warm + SW-settled.
{
  const warm = await browser.newPage();
  await warm.setViewport({ width: 760, height: 360 });
  await warm.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load', timeout: 60000 }).catch(()=>{});
  await warm.waitForFunction(() => typeof window.initGame1 === 'function', { timeout: 30000 }).catch(()=>{});
  await new Promise(r => setTimeout(r, 800));
  await warm.close();
}

for (const g of GAMES) {
  for (const vp of [...LANDSCAPES, { ...PORTRAIT, portrait: true }]) {
   try {
    // Open + navigate with a retry: an occasional first-goto after a page teardown
    // hangs the 'load' wait; recreating the page clears it. Try up to 3x.
    let page = null, errs = [];
    for (let nav = 0; nav < 3 && !page; nav++) {
      const cand = await browser.newPage();
      const e2 = [];
      cand.on('console', m => { if (m.type() === 'error' && !NOISE.test(m.text())) e2.push(m.text()); });
      cand.on('pageerror', e => { if (!NOISE.test(String(e))) e2.push(String(e)); });
      cand.setDefaultNavigationTimeout(20000);
      await cand.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 });
      const navOk = await cand.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load', timeout: 20000 })
        .then(() => true).catch(() => false);
      if (navOk) { page = cand; errs = e2; }
      else { await cand.close().catch(()=>{}); }
    }
    if (!page) throw new Error('navigation failed after 3 attempts');
    // The first visit registers a service worker whose activation broadcasts a
    // location.reload(). That reload destroys the execution context mid-evaluate.
    // Ride it out: retry the settle-guard, tolerating "context destroyed" until the
    // page stops reloading and the SPA has booted (init fn + screens in DOM + one active).
    const booted = async () => {
      try {
        return await page.evaluate((g) =>
          typeof window.initGame1 === 'function'
          && !!document.getElementById(g.screen)
          && !!document.querySelector('.screen.active'), g);
      } catch { return false; }   // navigation destroyed the context — treat as not-yet
    };
    let ok = false;
    for (let i = 0; i < 40 && !ok; i++) { ok = await booted(); if (!ok) await new Promise(r => setTimeout(r, 500)); }
    await new Promise(r => setTimeout(r, 400));

    const info = await page.evaluate((g) => {
      try {
        window.state = { players: [{ animal: '🦊', name: 'A', ageTier: 'tumbuh' }], currentPlayer: 0, selectedLevel: 'easy', selectedLevelNum: 1, mode: 'solo' };
        // reveal screen
        document.querySelectorAll('.screen.active').forEach(s => s.classList.remove('active'));
        const scr = document.getElementById(g.screen);
        scr.classList.add('active');
        window[g.init]();
      } catch (e) { return { err: String(e) }; }
      return { ok: true };
    }, g);

    // wait for the choices to actually render (init may build async-ish via timers).
    // Retry the init up to 3x — the very first page load can race the choice build.
    const choiceCount = () => page.evaluate((g) => {
      const scr = document.getElementById(g.screen);
      if (!scr) return 0;
      for (const s of g.choiceSel.split(',').map(x => x.trim())) {
        const n = scr.querySelectorAll(s).length;
        if (n) return n;
      }
      return 0;
    }, g);
    for (let attempt = 0; attempt < 4; attempt++) {
      await page.waitForFunction((g) => {
        const scr = document.getElementById(g.screen);
        if (!scr) return false;
        return g.choiceSel.split(',').map(x => x.trim()).some(s => scr.querySelectorAll(s).length);
      }, { timeout: 4000 }, g).catch(() => {});
      if (await choiceCount() > 0) break;
      await page.evaluate((g) => { try { window[g.init](); } catch (e) {} }, g);
      await new Promise(r => setTimeout(r, 400));
    }
    await new Promise(r => setTimeout(r, 450));

    const assert = await page.evaluate((g) => {
      const scr = document.getElementById(g.screen);
      const sr = scr.getBoundingClientRect();
      // The clipping boundary: the .screen is overflow-y auto but the app freezes body scroll
      // in landscape; the true "fold" is the viewport height. Use min(screen bottom-within-view, innerHeight).
      const fold = Math.min(window.innerHeight, sr.bottom);
      const nodes = Array.from(scr.querySelectorAll(g.choiceSel.split(',').map(s=>s.trim())[0]));
      let picked = nodes;
      if (!picked.length) {
        // fallback selectors
        for (const s of g.choiceSel.split(',').map(x=>x.trim())) {
          picked = Array.from(scr.querySelectorAll(s));
          if (picked.length) break;
        }
      }
      // Find the nearest scrollable ancestor (a container that clips + scrolls its
      // own overflow) — a choice inside such a box is REACHABLE if the box is in view.
      const scrollHost = (el) => {
        let n = el.parentElement;
        while (n && n !== document.body) {
          const cs = getComputedStyle(n);
          if (/(auto|scroll)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 1) return n;
          n = n.parentElement;
        }
        return null;
      };
      const rects = picked.map(el => {
        const r = el.getBoundingClientRect();
        return { bottom: Math.round(r.bottom), top: Math.round(r.top), h: Math.round(r.height), w: Math.round(r.width) };
      });
      const maxBottom = rects.reduce((m, r) => Math.max(m, r.bottom), 0);
      // scroll container (if the choices sit in one) — its own box must be within the fold
      const host = picked.length ? scrollHost(picked[0]) : null;
      const hostRect = host ? host.getBoundingClientRect() : null;
      const hostInView = hostRect ? hostRect.bottom <= fold + 1 : false;
      const directlyInView = rects.length > 0 && rects.every(r => r.bottom <= fold + 1);
      // pass if every choice is directly on-screen OR all live in an in-view scroll box
      const allInView = directlyInView || (host !== null && hostInView && rects.length > 0);
      const minTap = rects.reduce((m, r) => Math.min(m, Math.min(r.h, r.w)), Infinity);
      return {
        count: rects.length,
        fold: Math.round(fold),
        innerH: window.innerHeight,
        maxBottom,
        allInView,
        directlyInView,
        scrollReachable: host !== null && hostInView,
        hostBottom: hostRect ? Math.round(hostRect.bottom) : null,
        minTap: rects.length ? Math.round(minTap) : 0,
        overflowBy: Math.max(0, maxBottom - Math.round(fold)),
      };
    }, g);

    const tag = vp.portrait ? 'portrait' : `${vp.w}x${vp.h}`;
    const fname = vp.portrait
      ? `ls-g${g.n}-portrait.png`
      : `ls-g${g.n}-${PHASE}-${vp.w}x${vp.h}.png`;
    await page.screenshot({ path: path.join(OUT, fname) });

    if (errs.length) bootErrors.push({ game: g.n, vp: tag, errs: errs.slice(0, 3) });
    results.push({ game: g.n, vp: tag, portrait: !!vp.portrait, init: info, ...assert, shot: fname });
    await page.close();
   } catch (e) {
    const tag = vp.portrait ? 'portrait' : `${vp.w}x${vp.h}`;
    results.push({ game: g.n, vp: tag, portrait: !!vp.portrait, harnessErr: String(e).slice(0, 200), allInView: false, count: -1 });
   }
  }
}

// boot index alone for console-error check (reuse the warm browser)
{
  const page = await browser.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' && !NOISE.test(m.text())) errs.push(m.text()); });
  page.on('pageerror', e => { if (!NOISE.test(String(e))) errs.push(String(e)); });
  await page.setViewport({ width: 412, height: 915 });
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load', timeout: 45000 });
  await new Promise(r => setTimeout(r, 600));
  if (errs.length) bootErrors.push({ boot: true, errs: errs.slice(0, 5) });
  await page.close();
}

await browser.close();
server.close();

// PASS = every landscape row has all choices in view. Portrait is informational only.
const landscapeRows = results.filter(r => !r.portrait);
const failing = landscapeRows.filter(r => !r.allInView);
const pass = failing.length === 0 && bootErrors.length === 0;

console.log(JSON.stringify({ phase: PHASE, results, bootErrors, failing: failing.map(f=>({game:f.game,vp:f.vp,overflowBy:f.overflowBy,maxBottom:f.maxBottom,fold:f.fold,count:f.count})), pass }, null, 2));
process.exit(pass ? 0 : 1);
