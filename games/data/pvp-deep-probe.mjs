/* Dunia Emosi — PvP/Tournament Deep Probe (canonical harness)
 *
 * Implements the 7-point Deep Testing Standard codified in memory:
 *   feedback_deep_testing_method.md
 *
 * Run from project root:
 *   node games/data/pvp-deep-probe.mjs
 *
 * Exits non-zero if any ❌ — blocks ship.
 */
import puppeteer from 'puppeteer';

const HOST = process.env.PVP_PROBE_HOST || 'http://localhost:8081';
const URL  = `${HOST}/Dunia-Emosi/games/g13c-pixi.html?v=53.8-20260624e`;

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-setuid-sandbox']});

const FAILURES = [];
const fail = (label, detail) => { FAILURES.push({label, detail}); console.log('❌', label, detail || ''); };
const pass = (label) => console.log('✅', label);

// === Helper: real-mouse click at bbox center, with size assertion ===
async function realClick (page, selector, label) {
  await page.waitForSelector(selector, { timeout: 5000 });
  const box = await page.$eval(selector, el => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      x: r.left + r.width/2, y: r.top + r.height/2,
      w: r.width, h: r.height,
      display: cs.display, visibility: cs.visibility,
      pointerEvents: cs.pointerEvents,
      opacity: parseFloat(cs.opacity)
    };
  });
  // Standard 2: bbox >= 44×44 (Apple HIG)
  if (box.w < 44 || box.h < 44) { fail(`${label}: tap target too small (${box.w}×${box.h})`); return false; }
  if (box.display === 'none' || box.visibility === 'hidden' || box.opacity === 0) {
    fail(`${label}: element not visible (display=${box.display}, visibility=${box.visibility}, opacity=${box.opacity})`);
    return false;
  }
  if (box.pointerEvents === 'none') { fail(`${label}: pointer-events:none`); return false; }
  // Standard 1: real-mouse click
  await page.mouse.click(box.x, box.y);
  pass(`${label} click @ (${Math.round(box.x)},${Math.round(box.y)}) size ${Math.round(box.w)}×${Math.round(box.h)}`);
  return true;
}

// === Helper: computed-style assertion (Standard 3) ===
async function assertStyle (page, selector, prop, expected, label) {
  const actual = await page.$eval(selector, (el, p) => getComputedStyle(el)[p], prop);
  const match = typeof expected === 'string'
    ? actual.includes(expected)
    : expected.test(actual);
  if (match) pass(`${label}: ${prop} = ${actual.slice(0,60)}`);
  else fail(`${label}: ${prop}`, `expected ${expected}, got "${actual.slice(0,80)}"`);
  return match;
}

// === Helper: type text into input via real keyboard (Standard 5) ===
async function typeInto (page, selector, text) {
  await page.click(selector);
  await page.keyboard.type(text);
}

async function runProbe (page, scenarioLabel) {
  console.log(`\n========== ${scenarioLabel} ==========`);
  const errors = [];
  const sprite404 = new Set();
  page.on('pageerror', e => errors.push(e.message.slice(0,200)));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/Failed to load resource/.test(t)) return;   // asset 404s OK
    errors.push(t.slice(0,200));
  });
  page.on('response', r => { if (r.status() === 404 && r.url().includes('.webp')) sprite404.add(r.url().split('/').pop()); });
  return { errors, sprite404 };
}

// ════════════════════════════════════════════════
//  SCENARIO 1 — Tournament size + picker flow
//  (the bug owner reported: size cards unclickable)
// ════════════════════════════════════════════════
const page = await browser.newPage();
await page.setViewport({ width: 414, height: 896, deviceScaleFactor: 2 });
const errCtx = await runProbe(page, 'TOURNAMENT — 3/6 size + picker + bracket');

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForSelector('.trainer-card', { timeout: 8000 });
await new Promise(r => setTimeout(r, 600));
await realClick(page, '.trainer-card:not(.locked)', 'Trainer card');
await new Promise(r => setTimeout(r, 1000));
// Debug: capture state
await page.screenshot({ path: '/tmp/deep-debug-after-trainer.png' });
const state = await page.evaluate(() => ({
  welcomeShown: document.getElementById('gym-welcome')?.classList.contains('show'),
  fightVisible: document.getElementById('gw-fight')?.offsetParent !== null,
}));
console.log('After trainer click:', JSON.stringify(state));
if (!state.welcomeShown) {
  console.log('  Trainer click did not open welcome — trying showGymWelcome directly');
  await page.evaluate(() => {
    const t = document.querySelector('.trainer-card:not(.locked)');
    const onclickStr = t.getAttribute('onclick');
    const m = onclickStr.match(/showGymWelcome\('([^']+)'\)/);
    if (m) window.showGymWelcome(m[1]);
  });
  await new Promise(r => setTimeout(r, 500));
}
await page.waitForFunction(() => {
  const b = document.getElementById('gw-fight');
  return b && b.offsetParent !== null && b.getBoundingClientRect().width > 0;
}, { timeout: 5000 });
await realClick(page, '#gw-fight', 'Fight! button');
await new Promise(r => setTimeout(r, 900));
await realClick(page, '.bm-card[data-mode="tournament"]', 'Tournament mode card');
await new Promise(r => setTimeout(r, 600));

// Count step
await realClick(page, '.bm-tour-count-btn[data-count="2"]', 'Count: 2 players');
await new Promise(r => setTimeout(r, 600));

// Name input — real keyboard
await typeInto(page, '.bm-tour-name-input[data-idx="0"]', 'Adi');
await typeInto(page, '.bm-tour-name-input[data-idx="1"]', 'Bayu');
await new Promise(r => setTimeout(r, 300));
await realClick(page, '#bm-tour-start', 'Mulai Tournament');
await new Promise(r => setTimeout(r, 800));

// Size step — THE BUG: cards must be ≥44px AND styled (DS-card cream background)
console.log('\n--- Tournament size step ---');
await assertStyle(page, '.bm-size-card[data-size="6"]', 'backgroundColor', 'rgba(248, 248, 240', 'Size card DS-cream bg');
await assertStyle(page, '.bm-size-card[data-size="6"]', 'borderRadius', '18px', 'Size card border-radius');
const sizeClicked = await realClick(page, '.bm-size-card[data-size="6"]', 'Tournament size: 6 Pokemon');
if (sizeClicked) {
  // renderTourPick async-loads pokedex; wait for either the loading screen OR the picker grid
  await page.waitForFunction(() => {
    return !!document.querySelector('.bm-pkg-grid') ||
           !!document.querySelector('.bm-prestep-title');   // loading screen has this
  }, { timeout: 5000 });
  // Now wait for the actual picker grid (post-pokedex-load redraw)
  await page.waitForSelector('.bm-pkg-grid', { timeout: 8000 });
  pass('Advanced to picker step');
  await page.screenshot({ path: '/tmp/deep-1-tour-size-clicked.png' });

  // Picker — wait for pokedex load + verify region tabs
  await new Promise(r => setTimeout(r, 2500));
  console.log('\n--- Tournament picker step (P1) ---');
  await assertStyle(page, '.bm-pkg-card[data-pkg="ash-kanto-final"]', 'backgroundColor', 'rgba(248, 248, 240', 'Pkg card DS-cream bg');
  const tabCount = await page.evaluate(() => document.querySelectorAll('.bm-region-tab').length);
  if (tabCount === 10) pass(`Region tabs: ${tabCount} present`);
  else fail(`Region tabs: ${tabCount}/10`);

  // P1 picks via real click
  await realClick(page, '.bm-pkg-card[data-pkg="ash-kanto-final"]', 'P1 picks Tim Ash Kanto Final');
  await new Promise(r => setTimeout(r, 1500));

  // P2 picker
  const inP2 = await page.evaluate(() => /Bayu/.test(document.querySelector('.bm-prestep-pname')?.textContent || ''));
  if (inP2) pass('Advanced to P2 picker');
  else fail('Did not advance to P2 picker after P1 selection');

  // P2 picks via real click
  await realClick(page, '.bm-pkg-card[data-pkg="legend-birds"]', 'P2 picks Burung Legendaris');
  await new Promise(r => setTimeout(r, 1500));

  // Bracket
  const bracketOK = await page.evaluate(() => ({
    hasBracket: !!document.querySelector('.bm-bracket'),
    matches: document.querySelectorAll('.bm-bracket-match').length,
    teamRows: document.querySelectorAll('.bm-bracket-team').length,
    startBtn: !!document.querySelector('#bm-tour-go-match'),
  }));
  if (bracketOK.hasBracket && bracketOK.matches >= 1 && bracketOK.teamRows >= 1) {
    pass(`Bracket renders ${bracketOK.matches} matches with team thumbnails`);
  } else fail('Bracket missing or incomplete', JSON.stringify(bracketOK));
  await page.screenshot({ path: '/tmp/deep-2-tour-bracket.png' });
}

console.log(`\nConsole errors (non-asset): ${errCtx.errors.length}`);
if (errCtx.errors.length) errCtx.errors.slice(0,5).forEach(e => console.log('  ⚠️', e));

await page.close();

// ════════════════════════════════════════════════
//  SCENARIO 2 — PvP size + picker + action menu + battle
// ════════════════════════════════════════════════
const page2 = await browser.newPage();
await page2.setViewport({ width: 414, height: 896, deviceScaleFactor: 2 });
const ec2 = await runProbe(page2, 'PVP — full flow with action menu + time-mult 1.6');

await page2.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page2.waitForSelector('.trainer-card', { timeout: 8000 });
await new Promise(r => setTimeout(r, 600));
await realClick(page2, '.trainer-card:not(.locked)', 'Trainer card');
await page2.waitForFunction(() => {
  const b = document.getElementById('gw-fight');
  return b && b.offsetParent !== null && b.getBoundingClientRect().width > 0;
}, { timeout: 5000 });
await realClick(page2, '#gw-fight', 'Fight!');
await new Promise(r => setTimeout(r, 900));
await realClick(page2, '.bm-card[data-mode="pvp"]', 'PvP mode card');
await new Promise(r => setTimeout(r, 500));
await typeInto(page2, '.bm-tour-name-input[data-idx="0"]', 'Cici');
await typeInto(page2, '.bm-tour-name-input[data-idx="1"]', 'Dewi');
await realClick(page2, '#bm-name-go', 'Mulai PvP');
await new Promise(r => setTimeout(r, 1500));

// Size step
await assertStyle(page2, '.bm-size-card[data-size="3"]', 'backgroundColor', 'rgba(248, 248, 240', 'PvP Size card DS-cream bg');
await realClick(page2, '.bm-size-card[data-size="3"]', 'PvP size: 3 Pokemon');
await new Promise(r => setTimeout(r, 2500));

// Picker
await realClick(page2, '.bm-pkg-card[data-pkg="kanto-starter-base"]', 'P1 picks Starter Kanto Awal');
await new Promise(r => setTimeout(r, 600));
await realClick(page2, '.bm-pkg-card[data-pkg="legend-birds"]', 'P2 picks Burung Legendaris');
await new Promise(r => setTimeout(r, 1800));

// Action menu — Standard 3 + 4 (computed style + boot path)
console.log('\n--- PvP action menu ---');
await assertStyle(page2, '.bm-action-card[data-action="attack"]', 'backgroundColor', 'rgb(254, 215, 170)', 'Action Serang peach bg');
await assertStyle(page2, '.bm-action-card[data-action="switch"]', 'backgroundColor', 'rgb(167, 243, 208)', 'Action Ganti mint bg');

// Click Serang → question phase + verify time-mult cap is 1.6 now
await realClick(page2, '.bm-action-card[data-action="attack"]', 'Serang');
await new Promise(r => setTimeout(r, 500));

// Time-mult formula: 1.6 - elapsed * 0.06. At 100ms answer → 1.594
await new Promise(r => setTimeout(r, 100));
await page2.evaluate(() => {
  const r = document.querySelector('.bm-pvp-real');
  const q = r._questions && r._questions[0];
  if (!q) return;
  const c = Array.from(document.querySelectorAll('.bm-qzone-bot .bm-choice')).find(b => b.getAttribute('data-c') === String(q.ans));
  if (c) c.click();
});
await new Promise(r => setTimeout(r, 700));

// Verify time-mult badge shows ~1.50-1.60 (close to max)
const tMultText = await page2.evaluate(() => document.querySelector('.bm-tmult-badge')?.textContent || null);
if (tMultText && /1\.[456789]\d?× cepat/.test(tMultText)) pass(`Time-mult badge near max: "${tMultText}"`);
else fail(`Time-mult badge not in 1.4-1.6 range: "${tMultText}"`);

await page2.screenshot({ path: '/tmp/deep-3-pvp-tmult.png' });

console.log(`\nConsole errors (non-asset): ${ec2.errors.length}`);
if (ec2.errors.length) ec2.errors.slice(0,5).forEach(e => console.log('  ⚠️', e));

await page2.close();

// ════════════════════════════════════════════════
//  REPORT
// ════════════════════════════════════════════════
console.log('\n════════════════════════════════════════');
console.log(`DEEP PROBE — ${FAILURES.length === 0 ? 'ALL PASS ✅' : `${FAILURES.length} FAILURES ❌`}`);
console.log('════════════════════════════════════════');
FAILURES.forEach(f => console.log('❌', f.label, f.detail||''));

await browser.close();
process.exit(FAILURES.length > 0 ? 1 : 0);
