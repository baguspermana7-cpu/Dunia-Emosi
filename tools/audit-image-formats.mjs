// A-357 image-format gate — enforce "served images = local WebP" (see
// documentation and standarization/IMAGE_ASSET_STANDARD.md).
//
// Scans only GIT-TRACKED rasters under assets/ (what actually deploys; untracked
// source-art scratch is ignored). FAILS if a tracked raster is PNG/JPG/JPEG,
// unless it is on the documented ALLOW list (PWA icons that must stay PNG,
// animated GIFs) or under a grandfathered legacy SOURCE dir. New game art MUST
// be WebP. Also warns on oversized WebP. Not network-dependent.
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd());
const WEBP_BUDGET_KB = 260;

// PWA/browser icons (spec expects PNG) + animated GIFs kept for fidelity.
const ALLOW = [
  /(favicon|apple-touch|maskable|icon-\d+|g23-icon)\S*\.png$/i,
  /\.gif$/i,
];
// Grandfathered legacy sets — small, already-shipped, migrate opportunistically.
// New categories must NOT be added here; add WebP instead.
const GRANDFATHER = [
  /^assets\/Pokemon\/(g23|g19|g24|others)\//i,      // legacy HD Pokémon renders
  /^assets\/Pokemon\/pokeballs-png\//i,             // pokéball icon set
  /^assets\/car and vehicle\//i,                    // legacy vehicle top-views
  /^assets\/background\/MountainDuskGodot\//i,      // Godot source layers (referenced ones already WebP)
  /^assets\/wants candy\//i,
];

let tracked = [];
try {
  tracked = execSync('git ls-files -- assets', { cwd: ROOT, encoding: 'utf8' })
    .split('\n').map(s => s.trim()).filter(Boolean);
} catch (e) { console.error('git ls-files failed:', e.message); process.exit(2); }

const violations = [], oversized = [];
for (const rel of tracked) {
  if (/(^|\/)_backup(\/|$)/.test(rel)) continue;
  const ext = path.extname(rel).toLowerCase();
  if (['.png', '.jpg', '.jpeg'].includes(ext)) {
    if (ALLOW.some(re => re.test(rel)) || GRANDFATHER.some(re => re.test(rel))) continue;
    violations.push(rel);
  } else if (ext === '.webp') {
    let kb = 0; try { kb = fs.statSync(path.join(ROOT, rel)).size / 1024; } catch {}
    if (kb > WEBP_BUDGET_KB) oversized.push(rel + '  (' + Math.round(kb) + 'KB)');
  }
}

if (oversized.length) {
  console.log('⚠  ' + oversized.length + ' tracked WebP over ' + WEBP_BUDGET_KB + 'KB (review, not a hard fail):');
  oversized.slice(0, 25).forEach(v => console.log('   ' + v));
  console.log('');
}
if (violations.length) {
  console.log('❌ ' + violations.length + ' tracked served raster(s) are PNG/JPG and not allowlisted/grandfathered:');
  violations.forEach(v => console.log('   ' + v));
  console.log('\nConvert to WebP + repoint (see IMAGE_ASSET_STANDARD.md), or justify an exception.');
  process.exit(1);
}
const nWebp = tracked.filter(f => f.endsWith('.webp')).length;
console.log('✅ Image-format gate: no un-allowlisted PNG/JPG in tracked assets. ' + nWebp + ' WebP tracked.');
process.exit(0);
