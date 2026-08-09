// After a cache-token sweep, one wrong path 404s a script on every page at once
// and the failure is silent until a child taps something. Load each page and
// count failed same-origin requests plus uncaught errors.
import puppeteer from 'puppeteer';
import { readdirSync } from 'node:fs';
const pages = ['index.html', ...readdirSync('games').filter(f => f.endsWith('.html')).map(f => 'games/' + f)];
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let bad = 0;
for (const page of pages) {
  const p = await b.newPage();
  await p.setViewport({ width: 1600, height: 900 });
  const errs = [], missing = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 90)));
  p.on('response', r => {
    const u = new URL(r.url());
    if (u.origin === 'http://127.0.0.1:8955' && r.status() >= 400) missing.push(u.pathname + ' ' + r.status());
  });
  try { await p.goto('http://127.0.0.1:8955/' + page, { waitUntil: 'domcontentloaded', timeout: 45000 }); }
  catch (e) { errs.push('NAV ' + String(e).slice(0, 60)); }
  await new Promise(r => setTimeout(r, 3500));
  // Two tiles showing the SAME picture on one screen reads as a bug to a child
  // who cannot read the labels -- and it is invisible to a 404 check, because
  // both images load fine. 87 of 217 emoji deliberately share a sprite (there
  // are only 47 ui sprites), so the mapping is not the defect; a screen relying
  // on emoji identity for distinct pictures is.
  const dupPics = await p.evaluate(() => {
    const tiles = [...document.querySelectorAll('.game-tile, .gtile, [class*="tile"]')];
    const seen = {};
    tiles.forEach(t => {
      const im = t.querySelector('img');
      if (!im) return;
      const src = im.getAttribute('src');
      if (!src) return;
      (seen[src] = seen[src] || []).push((t.textContent || '').trim().slice(0, 18));
    });
    return Object.entries(seen).filter(([, v]) => v.length > 1).map(([s, v]) => v.join(' = '));
  }).catch(() => []);
  const js404 = missing.filter(m => /\.(js|css)\b/.test(m));
  const ok = js404.length === 0 && errs.length === 0 && dupPics.length === 0;
  if (!ok) bad++;
  console.log(`${ok ? 'OK  ' : 'BAD '} ${page.padEnd(34)} js/css404=${js404.length} err=${errs.length} kembar=${dupPics.length} lain404=${missing.length - js404.length}`);
  if (js404.length) console.log('      ', js404.slice(0, 4));
  if (errs.length) console.log('      ', errs.slice(0, 2));
  if (dupPics.length) console.log('       gambar kembar:', dupPics.slice(0, 3));
  await p.close();
}
await b.close();
console.log(bad ? `\n${bad}/${pages.length} halaman bermasalah` : `\n${pages.length}/${pages.length} halaman bersih`);
process.exit(bad ? 1 : 0);
