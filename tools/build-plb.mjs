#!/usr/bin/env node
// build-plb.mjs — merge tools/plb-data/g*.json → dedupe → balanced 1000 → inject into
// tools/plb-template.html → write plb.html (A-338). Idempotent.
import fs from 'fs';
import path from 'path';

const ROOT = path.dirname(new URL(import.meta.url).pathname).replace(/\/tools$/, '');
const DATA = path.join(ROOT, 'tools', 'plb-data');
const RICH = path.join(ROOT, 'tools', 'plb-data-rich');
const TPL = path.join(ROOT, 'tools', 'plb-template.html');
const OUT = path.join(ROOT, 'plb.html');
const ORDER = ['g1', 'g2', 'g5', 'g3', 'g8', 'g9', 'g4', 'g7', 'g11', 'g12', 'g25', 'g6', 'g20', 'g22'];
const TARGET = 1000, FLAG_PER_GAME = 6;

const clampI = v => Math.max(1, Math.min(3, parseInt(v) || 2));
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// 1. load + validate + dedupe (per game)
const perGame = {};
let raw = 0, dropped = 0;
let richCount = 0;
for (const g of ORDER) {
  const rf = path.join(RICH, g + '.json');
  const useRich = fs.existsSync(rf);
  if (useRich) richCount++;
  const f = useRich ? rf : path.join(DATA, g + '.json');
  if (!fs.existsSync(f)) { console.warn('MISSING', g); perGame[g] = []; continue; }
  let arr;
  try { arr = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.error('BAD JSON', g, e.message); process.exit(1); }
  const seen = new Set(), keep = [];
  for (const it of arr) {
    raw++;
    if (!it || !it.title || !it.facet) { dropped++; continue; }
    const k = norm(it.title);
    if (seen.has(k)) { dropped++; continue; }
    seen.add(k);
    const o = {
      game: it.game || g.toUpperCase(), zone: it.zone || '', facet: String(it.facet).trim(),
      title: String(it.title).trim(), mechanic: String(it.mechanic || '').trim(),
      gameplay: String(it.gameplay || '').trim(), visual: String(it.visual || '').trim(),
      learning: String(it.learning || '').trim(), effort: clampI(it.effort), impact: clampI(it.impact)
    };
    if (it.hook) o.hook = String(it.hook).trim();
    if (it.contoh) o.contoh = String(it.contoh).trim();
    if (it.usia) o.usia = String(it.usia).trim();
    keep.push(o);
  }
  keep.sort((a, b) => b.impact - a.impact || b.effort - a.effort); // impact desc, then richer first
  perGame[g] = keep;
}

// 2. round-robin interleave across games → balanced, highest-impact-first, cap at TARGET
const final = [];
let i = 0;
while (final.length < TARGET) {
  let added = 0;
  for (const g of ORDER) {
    if (perGame[g][i]) { final.push(perGame[g][i]); added++; if (final.length >= TARGET) break; }
  }
  if (!added) break;
  i++;
}

// 3. assign ids + flag flagships (top FLAG_PER_GAME by impact per game get the demo link)
final.forEach((it, n) => { it.id = n + 1; });
const flaggedCount = {};
for (const it of final) {
  const c = flaggedCount[it.game] || 0;
  if (c < FLAG_PER_GAME) { it.flag = 1; flaggedCount[it.game] = c + 1; }
}

// 4. inject into template
const tpl = fs.readFileSync(TPL, 'utf8');
const json = JSON.stringify(final);
const stamp = new Date().toISOString().slice(0, 10);
const html = tpl
  .replace('/*__IDEAS__*/[]/*__END__*/', json)
  .replace(/<span id="stamp"><\/span>/, '<span id="stamp">v58.4 · ' + stamp + '</span>');
fs.writeFileSync(OUT, html);

// 5. report
const byGame = {}, byFacet = {};
for (const it of final) { byGame[it.game] = (byGame[it.game] || 0) + 1; byFacet[it.facet] = (byFacet[it.facet] || 0) + 1; }
const flagTotal = final.filter(x => x.flag).length;
console.log('rich games', richCount + '/' + ORDER.length, '| raw', raw, 'dropped(dupe/invalid)', dropped, '→ FINAL', final.length, '| flagship', flagTotal);
console.log('with-contoh', final.filter(x => x.contoh).length, '| with-hook', final.filter(x => x.hook).length, '| with-usia', final.filter(x => x.usia).length);
console.log('per game:', JSON.stringify(byGame));
console.log('per facet:', JSON.stringify(byFacet));
console.log('wrote', OUT, (fs.statSync(OUT).size / 1024).toFixed(0) + 'KB');
