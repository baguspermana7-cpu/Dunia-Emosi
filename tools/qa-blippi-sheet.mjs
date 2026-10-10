// Side-by-side contact sheets: owner reference (left) vs our screen (right), at 1672x941.
//   node tools/qa-blippi-sheet.mjs <outDir>   (server on http://localhost:8081)
import puppeteer from 'puppeteer';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2] || '/tmp/blippi-sheets';
mkdirSync(OUT, { recursive: true });
const URL_ = 'http://localhost:8081/games/blippi.html';
const SCREENS = [
  ['hub', "__g32.show('hub')"],
  ['map', "__g32.show('map')"],
  ['vehicles', "Blippi.go('vehicles',{mission:'W02-M01'})"],
  ['mission-kincir', "Blippi.go('mission',{mission:'W02-M01',vehicle:'truk-air'})"],
];
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
for (const [name, js] of SCREENS) {
  const p = await b.newPage();
  await p.setViewport({ width: 1672, height: 941 });
  await p.goto(URL_, { waitUntil: 'load' });
  await p.evaluate(js);
  await new Promise(r => setTimeout(r, 500));
  const ours = await p.screenshot({ encoding: 'base64' });
  const ref = readFileSync(path.join(ROOT, 'docs/blippi/mockups', name + '.png')).toString('base64');
  const q = await b.newPage();
  await q.setViewport({ width: 3344, height: 941 });
  await q.setContent(`<body style="margin:0;display:flex;background:#000"><img width=1672 height=941 src="data:image/png;base64,${ref}"><img width=1672 height=941 src="data:image/png;base64,${ours}"></body>`);
  await q.screenshot({ path: path.join(OUT, name + '-sheet.png') });
  await p.close(); await q.close();
}
await b.close();
console.log('sheets in', OUT);
