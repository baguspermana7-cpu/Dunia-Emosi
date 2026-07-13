// Repro/verify: PvP shared arena — P1 (self) portrait must be FULLY visible above
// the bottom question zone in BOTH portrait and landscape. Drives BattleModes.startPvP
// directly (opts.teams → jumps straight to 'battle'), screenshots both orientations,
// and measures whether the self sprite bottom is clipped by .bm-arena overflow or
// covered by the row3 qzone / .bm-qzone-wait overlay.
import http from 'http';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'tools', 'qa-out');
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.json':'application/json','.mp3':'audio/mpeg','.woff2':'font/woff2','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg' };
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

const tag = process.argv[2] || 'before';
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });

async function run(label, w, h) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/games/gym-pokemon.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.BattleModes && typeof window.BattleModes.startPvP === 'function', { timeout: 20000 });

  // Launch PvP with two named players — real flow (size step → pkg pick P1 → pkg pick P2 → battle).
  await page.evaluate(() => {
    window.BattleModes.startPvP({
      players: [{ name: 'Andi' }, { name: 'Budi' }],
      matchNo: 1,
      stageLineText: 'PvP',
      questionType: 'math',
      questionLevel: 3,
      _noBgm: true,
      onComplete: () => {}, onCancel: () => {}
    });
  });
  await new Promise(r => setTimeout(r, 500));
  // 1) size step — pick "Cepat" (3) or any size card.
  await page.evaluate(() => { const c = document.querySelector('.bm-pvp-real .bm-size-card'); if (c) c.click(); });
  await new Promise(r => setTimeout(r, 700));
  // 2) package pick — P1 then P2 (each renderRoot re-renders a fresh .bm-pkg-card set).
  for (let i = 0; i < 2; i++) {
    await page.waitForFunction(() => !!document.querySelector('.bm-pvp-real .bm-pkg-card[data-pkg]'), { timeout: 8000 }).catch(()=>{});
    const info = await page.evaluate(() => {
      const cards = document.querySelectorAll('.bm-pvp-real .bm-pkg-card[data-pkg]');
      const arena = document.querySelector('.bm-pvp-real .bm-arena-self-img');
      return { cards: cards.length, hasArena: !!arena };
    });
    console.log(`  pick step ${i}: pkg-cards=${info.cards} arenaMounted=${info.hasArena}`);
    await page.evaluate(() => { const c = document.querySelector('.bm-pvp-real .bm-pkg-card[data-pkg]'); if (c) c.click(); });
    await new Promise(r => setTimeout(r, 1000));
  }
  // 3) wait for the battle arena to be VISIBLE (offsetParent set), picker gone, VS settled.
  await page.waitForFunction(() => {
    const arena = document.querySelector('.bm-pvp-real .bm-arena');
    const prestep = document.querySelector('.bm-pvp-real .bm-prestep');
    return arena && arena.offsetParent !== null && !prestep;
  }, { timeout: 15000 }).catch(()=>{});
  await new Promise(r => setTimeout(r, 3000));
  const dbg = await page.evaluate(() => ({
    roots: document.querySelectorAll('.bm-pvp-real').length,
    prestep: !!document.querySelector('.bm-pvp-real .bm-prestep'),
    arenaVisible: (function(){ const a = document.querySelector('.bm-pvp-real .bm-arena'); return a ? a.offsetParent !== null : false; })(),
    vsIntro: !!document.querySelector('.bm-vs-intro, .bm-vs-card, [class*="vs-intro"]')
  }));
  console.log('  dbg:', JSON.stringify(dbg));

  const measure = () => page.evaluate(() => {
    const arena = document.querySelector('.bm-pvp-real .bm-arena');
    const selfImg = document.querySelector('.bm-pvp-real .bm-arena-self-img, .bm-pvp-real .bm-arena-self-sprite');
    const selfCard = document.querySelector('.bm-pvp-real .bm-arena-self .bm-info-card');
    const qbot = document.querySelector('.bm-pvp-real .bm-qzone-bot');
    const wait = document.querySelector('.bm-pvp-real .bm-qzone-bot .bm-qzone-wait');
    const waitVisible = wait ? (getComputedStyle(wait).display !== 'none') : false;
    const r = (el) => el ? (() => { const b = el.getBoundingClientRect(); return { top:+b.top.toFixed(1), bottom:+b.bottom.toFixed(1), left:+b.left.toFixed(1), right:+b.right.toFixed(1), h:+b.height.toFixed(1), w:+b.width.toFixed(1) }; })() : null;
    const arenaR = r(arena), imgR = r(selfImg), cardR = r(selfCard), qbotR = r(qbot);
    return {
      hasImg: !!selfImg, waitVisible,
      arena: arenaR, img: imgR, card: cardR, qbot: qbotR,
      // px the self-IMG bottom is clipped by the arena overflow box
      imgClippedByArena: (arenaR && imgR) ? +Math.max(0, imgR.bottom - arenaR.bottom).toFixed(1) : null,
      // px the self-IMG bottom is COVERED by (overlaps into) the bottom qzone
      imgCoveredByQzone: (qbotR && imgR) ? +Math.max(0, imgR.bottom - qbotR.top).toFixed(1) : null,
      // px the self HP CARD bottom is covered by the bottom qzone
      cardCoveredByQzone: (qbotR && cardR) ? +Math.max(0, cardR.bottom - qbotR.top).toFixed(1) : null
    };
  });

  // Host page's own #pkg-overlay (z-9999) is NOT the PvP arena — hide it.
  await page.evaluate(() => { const o = document.getElementById('pkg-overlay'); if (o) o.style.display = 'none'; });

  const metrics = await measure();
  const file = path.join(OUT, `pvp-${label}-${tag}.png`);
  await page.screenshot({ path: file });
  console.log(`\n[${label}] ${w}x${h} -> ${path.basename(file)}  (ACTIVE / P1 turn)`);
  console.log('    arena.bottom=', metrics.arena && metrics.arena.bottom, ' selfImg.bottom=', metrics.img && metrics.img.bottom, ' selfCard.bottom=', metrics.card && metrics.card.bottom, ' qbot.top=', metrics.qbot && metrics.qbot.top);
  console.log('    gap(qbot.top - card.bottom)=', (metrics.qbot && metrics.card) ? +(metrics.qbot.top - metrics.card.bottom).toFixed(1) : null);
  console.log('    imgClippedByArena=', metrics.imgClippedByArena, ' imgCoveredByQzone=', metrics.imgCoveredByQzone, ' cardCoveredByQzone=', metrics.cardCoveredByQzone);

  // ── Also capture the P1-WAITING state (opponent turn → bottom qzone dark overlay). ──
  // Click Serang → answer (first choice) → turn passes to P2 → bottom .bm-qzone-wait shows.
  await page.evaluate(() => { const b = document.querySelector('.bm-pvp-real .bm-qzone-bot .bm-action-card[data-action="attack"]'); if (b) b.click(); });
  await new Promise(r => setTimeout(r, 500));
  await page.evaluate(() => { const c = document.querySelector('.bm-pvp-real .bm-qzone-bot .bm-choice'); if (c) c.click(); });
  await new Promise(r => setTimeout(r, 900));
  await page.evaluate(() => { const o = document.getElementById('pkg-overlay'); if (o) o.style.display = 'none'; });
  const waitM = await measure();
  const fileW = path.join(OUT, `pvp-${label}-wait-${tag}.png`);
  await page.screenshot({ path: fileW });
  console.log(`  -> ${path.basename(fileW)}  (P1 WAITING / opponent turn, waitVisible=${waitM.waitVisible})`);
  console.log('    imgClippedByArena=', waitM.imgClippedByArena, ' imgCoveredByQzone=', waitM.imgCoveredByQzone, ' cardCoveredByQzone=', waitM.cardCoveredByQzone);

  if (errors.length) console.log('  JS errors:', errors.slice(0,3));
  await page.close();
  return { active: metrics, wait: waitM };
}

if (!existsSync(OUT)) { await (await import('fs/promises')).mkdir(OUT, { recursive: true }); }
const portraitM = await run('portrait', 412, 915);
const landscapeM = await run('landscape', 760, 360);

await browser.close();
server.close();

const line = (m) => `clip=${m.imgClippedByArena} imgCover=${m.imgCoveredByQzone} cardCover=${m.cardCoveredByQzone}`;
console.log('\n=== SUMMARY (' + tag + ') === (all should be 0 = P1 portrait fully clear)');
console.log('portrait  ACTIVE :', line(portraitM.active));
console.log('portrait  WAITING:', line(portraitM.wait));
console.log('landscape ACTIVE :', line(landscapeM.active));
console.log('landscape WAITING:', line(landscapeM.wait));
