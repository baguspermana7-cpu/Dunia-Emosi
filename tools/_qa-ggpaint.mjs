// Prove the JS repaint matches the offline prototype that was eyeballed, and
// prove it does the one thing multiply cannot: make a dark body LIGHTER.
import puppeteer from 'puppeteer';
import { writeFileSync } from 'node:fs';
const OUT = '/tmp/claude-1000/-home-baguspermana7/c58644e4-cfc2-4099-9de4-70f989a3b3f7/scratchpad/';
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 1400, height: 400 });
p.on('pageerror', e => console.log('PAGEERROR', String(e).slice(0, 140)));
// film-anak.html runs its own scripts and navigated mid-probe, destroying the
// execution context. Serve an inert same-origin page instead: we only need the
// origin so relative asset fetches resolve.
await p.setRequestInterception(true);
p.on('request', r => (r.url().endsWith('/games/__paintharness')
  ? r.respond({ status: 200, contentType: 'text/html', body: '<!doctype html><title>h</title>' })
  : r.continue()));
await p.goto('http://127.0.0.1:8955/games/__paintharness', { waitUntil: 'domcontentloaded', timeout: 45000 });
await p.addScriptTag({ url: '/games/film/gg-paint.js' });

const HEROES = ['bam', 'bibi', 'redbird', 'buff', 'batwing'];
for (const hero of HEROES) {
  const r = await p.evaluate(async (hero) => {
    const base = 'film/batwheels-gotham-getaway/assets/animations/';
    const mean = (cv) => {
      const c = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      let n = 0, s = 0, R = 0, G = 0, B = 0;
      for (let i = 0; i < c.length; i += 4) { if (c[i + 3] < 200) continue; n++; R += c[i]; G += c[i + 1]; B += c[i + 2]; s += (c[i] + c[i + 1] + c[i + 2]) / 3; }
      return { n, lum: s / n, r: R / n, g: G / n, bl: B / n };
    };
    const stock = await GGPaint.paintPage(base, hero, null, null);
    const yellow = await GGPaint.paintPage(base, hero, 'fed52f', null);
    const cs = GGPaint.cropBody(stock), cy = GGPaint.cropBody(yellow);
    const strip = document.createElement('canvas');
    strip.width = cs.width * 2; strip.height = cs.height;
    const sc = strip.getContext('2d');
    sc.drawImage(cs, 0, 0); sc.drawImage(cy, cs.width, 0);
    return { stock: mean(cs), yellow: mean(cy), png: strip.toDataURL('image/png'), keepHue: yellow.keepHue };
  }, hero);
  writeFileSync(OUT + `ggpaint-${hero}.png`, Buffer.from(r.png.split(',')[1], 'base64'));
  const lighter = r.yellow.lum > r.stock.lum;
  console.log(`${hero.padEnd(8)} hue=${r.keepHue.toFixed(3)}  luminans ${r.stock.lum.toFixed(1)} -> ${r.yellow.lum.toFixed(1)} ${lighter ? 'LEBIH TERANG (multiply mustahil)' : 'tidak lebih terang'}`);
}
await b.close();
