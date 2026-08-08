/**
 * One token per shared file, across every page.
 *
 * Why this exists: a shared file carrying DIFFERENT ?v= tokens on different
 * pages means a fix reaches some pages and not others -- the device keeps
 * serving the old bytes from the SW asset cache and the bug "comes back".
 * That has bitten this project repeatedly (sfx-engine alone had SIX variants).
 * The survey before this tool landed found 17 files with divergent tokens.
 *
 * So: stamp ONE token on every local ?v= reference, everywhere, including the
 * sw.js SHELL precache list (a SHELL URL that disagrees with the page's URL
 * precaches a file nobody asks for). Idempotent -- rerun any time.
 *
 *   node tools/normalize-cache-tokens.mjs --token v59.94-20260808a [--dry]
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const check = args.includes('--check');
const ti = args.indexOf('--token');
if (!check && (ti < 0 || !args[ti + 1])) {
  console.error('perlu --token <nilai>  (atau --check)');
  process.exit(2);
}
const TOKEN = args[ti + 1];

const pages = [
  'index.html',
  ...readdirSync('games').filter(f => f.endsWith('.html')).map(f => join('games', f)),
];

// Vendored libraries keep their own token. pixi.min.js is ~450KB and changes
// only when we deliberately upgrade it; stamping it with the app token would
// re-download it on every release, on a throttled tablet, for nothing. Bump
// `lib/pixi.min.js?v=8` by hand when the library itself actually changes.
const VENDOR = /(^|\/)lib\//;

// --check is the ship gate: one shared file may never carry two tokens again.
if (check) {
  const seen = new Map();
  for (const p of pages) {
    for (const m of readFileSync(p, 'utf8').matchAll(/(?:src|href)="((?!https?:|\/\/)[^"?#]+\.(?:js|css))\?v=([^"&]+)"/g)) {
      if (VENDOR.test(m[1])) continue;
      const name = m[1].split('/').pop();
      if (!seen.has(name)) seen.set(name, new Map());
      if (!seen.get(name).has(m[2])) seen.get(name).set(m[2], []);
      seen.get(name).get(m[2]).push(p);
    }
  }
  const split = [...seen].filter(([, v]) => v.size > 1);
  for (const [name, v] of split) {
    console.log(`${name} — ${v.size} token berbeda:`);
    for (const [tok, ps] of v) console.log(`    ${tok}  ${ps.join(', ')}`);
  }
  console.log(split.length ? `\nGAGAL: ${split.length} berkas bersama tokennya berbeda antar halaman` : `LULUS: ${seen.size} berkas, token seragam`);
  process.exit(split.length ? 1 : 0);
}

// Any local .js/.css reference that already carries a ?v=. Absolute/CDN URLs are
// left alone: their versioning is not ours to rewrite.
const REF = /((?:src|href)=")((?!https?:|\/\/)[^"?#]+\.(?:js|css))\?v=[^"&]*"/g;

let changed = 0, refs = 0;
for (const p of pages) {
  const before = readFileSync(p, 'utf8');
  const after = before.replace(REF, (_m, lead, path) => {
    if (VENDOR.test(path)) return _m;
    refs++; return `${lead}${path}?v=${TOKEN}"`;
  });
  if (after !== before) { changed++; if (!dry) writeFileSync(p, after); }
}

// sw.js SHELL entries look like './games/quiz-engine.js?v=55.97-20260630a'
const swPath = 'sw.js';
const swBefore = readFileSync(swPath, 'utf8');
let shell = 0;
const swAfter = swBefore.replace(/('\.\/[^']+\.(?:js|css))\?v=[^']*'/g, (_m, head) => {
  if (VENDOR.test(head)) return _m;
  shell++; return `${head}?v=${TOKEN}'`;
});
if (swAfter !== swBefore && !dry) writeFileSync(swPath, swAfter);

console.log(`token=${TOKEN}${dry ? '  (DRY RUN)' : ''}`);
console.log(`  ${refs} rujukan di ${changed}/${pages.length} halaman`);
console.log(`  ${shell} entri SHELL di sw.js`);
