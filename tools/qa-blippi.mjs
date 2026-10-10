// G32 Blippi gate. Server: http://localhost:8081 (setsid nohup python3 -m http.server 8081 &).
//   node tools/qa-blippi.mjs      -> prints failures, last line is the summary.
import puppeteer from 'puppeteer';
const URL_ = 'http://localhost:8081/games/blippi.html';
const fails = []; let checks = 0;
process.on('uncaughtException', e => { console.log(fails.map(f => 'FAIL ' + f).join('\n')); console.log('ABORT ' + String(e.message).split('\n')[0]); process.exit(1); });
const ok = (c, m) => { checks++; if (!c) fails.push(m); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio'] });
const errors = [];
async function fresh(w, h, clear = true) {
  const p = await b.newPage();
  p.on('pageerror', e => errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error' && !/favicon|fonts\.g|ERR_|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await p.setViewport({ width: w, height: h });
  await p.goto(URL_, { waitUntil: 'load' });
  if (clear) { await p.evaluate(() => { localStorage.clear(); }); await p.reload({ waitUntil: 'load' }); }
  return p;
}
const center = async (p, sel) => p.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
const txt = (p, sel) => p.evaluate(s => (document.querySelector(s) || {}).textContent || '', sel);
async function layout(p, label, expectRot) {
  const r = await p.evaluate(() => {
    const de = document.documentElement, st = document.getElementById('stage').getBoundingClientRect();
    const small = [];
    document.querySelectorAll('#stage button, #stage .hot, #stage .isl, #stage .hend, #stage .valve, #stage .pumpunit').forEach(e => {
      const rc = e.getBoundingClientRect();
      if (!rc.width || e.closest('.scr:not(.on)') || e.disabled) return;
      if (rc.width < 55.5 || rc.height < 55.5) small.push((e.getAttribute('data-act') || e.className) + ':' + Math.round(rc.width) + 'x' + Math.round(rc.height));
    });
    const phs = [...document.querySelectorAll('.scr.on .ph')];
    const hid = e => { for (let n = e; n && n.nodeType === 1; n = n.parentNode) { const s = getComputedStyle(n); if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return true; } return false; };
    const chips = [...document.querySelectorAll('.scr.on .ph-l')].filter(c => !hid(c)).map(c => ({ n: c.textContent, r: c.getBoundingClientRect() }));
    const clash = [], out = [];
    chips.forEach((a, i) => {
      if (a.r.left < -1 || a.r.top < -1 || a.r.right > innerWidth + 1 || a.r.bottom > innerHeight + 1) out.push(a.n);
      for (let j = i + 1; j < chips.length; j++) { const b2 = chips[j]; if (!(a.r.right <= b2.r.left || a.r.left >= b2.r.right || a.r.bottom <= b2.r.top || a.r.top >= b2.r.bottom)) clash.push(a.n + '/' + b2.n); }
    });
    return { hs: de.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth, vs: de.scrollHeight > innerHeight,
      inside: st.left >= -1 && st.top >= -1 && st.right <= innerWidth + 1 && st.bottom <= innerHeight + 1,
      small, clash, out, phs: phs.length, nolabel: phs.filter(e => !e.querySelector('.ph-l').textContent.trim()).length,
      rot: getComputedStyle(document.getElementById('rot')).display };
  });
  ok(!r.hs && !r.vs, `${label}: page scrolls`);
  if (expectRot) { ok(r.rot !== 'none', `${label}: rotate prompt missing`); return; }
  ok(r.inside, `${label}: stage outside viewport`);
  ok(r.phs > 0 && r.nolabel === 0, `${label}: placeholders ${r.phs}, unlabeled ${r.nolabel}`);
  ok(r.clash.length === 0, `${label}: label chips intersect ${r.clash.slice(0, 3).join(',')}`);
  ok(r.out.length === 0, `${label}: label chip outside viewport ${r.out.slice(0, 3).join(',')}`);
  ok(r.small.length === 0, `${label}: touch targets <56px ${r.small.slice(0, 4).join(',')}`);
}

// text clipping / occlusion: every visible text element must be fully readable
async function textCheck(p, label) {
  const bad = await p.evaluate(() => {
    const st = document.createElement('style');
    st.textContent = '#stage *:not(svg):not(svg *){pointer-events:auto!important}';
    document.head.appendChild(st);
    const out = [];
    const hid = e => { for (let n = e; n && n.nodeType === 1; n = n.parentNode) { const s = getComputedStyle(n); if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return true; } return false; };
    const inRound = (r, a, cs) => { // rect r inside ancestor box a honouring border-radius
      const rad = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map(v => parseFloat(v) || 0);
      const k = a.width / (parseFloat(cs.width) || a.width);
      const R = rad.map(v => v * k);
      const pts = [[r.left, r.top, 0, a.left, a.top, 1, 1], [r.right, r.top, 1, a.right, a.top, -1, 1], [r.right, r.bottom, 2, a.right, a.bottom, -1, -1], [r.left, r.bottom, 3, a.left, a.bottom, 1, -1]];
      for (const [x, y, i, ax, ay, sx, sy] of pts) {
        const rr = Math.min(R[i], a.width / 2, a.height / 2); if (rr < 1) continue;
        const cx = ax + sx * rr, cy = ay + sy * rr;
        if ((sx > 0 ? x < cx : x > cx) && (sy > 0 ? y < cy : y > cy) && Math.hypot(x - cx, y - cy) > rr + 0.5) return false;
      }
      return true;
    };
    const roots = [...document.querySelectorAll('#stage .scr.on, #stage .scrim')];
    const seen = new Set();
    roots.forEach(root => {
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = w.nextNode())) {
        if (!n.textContent.trim()) continue;
        const el = n.parentElement;
        if (!el || seen.has(el) || /^(STYLE|SCRIPT)$/.test(el.tagName) || hid(el) || el.closest('.payoff:not(.on)')) continue;
        seen.add(el);
        const range = document.createRange(); range.selectNodeContents(n);
        const rects = [...range.getClientRects()].filter(r => r.width > 0.5);
        if (!rects.length) continue;
        const name = (typeof el.className === 'string' ? el.className : el.tagName) + '"' + n.textContent.trim().slice(0, 18) + '"';
        const ell = el.classList.contains('ph-l');
        const cs = getComputedStyle(el);
        if (!ell && cs.display !== 'inline' && (el.scrollWidth > el.clientWidth + 1 || (cs.overflowY !== 'visible' && el.scrollHeight > el.clientHeight + 1))) out.push('overflow ' + name);
        let bb = { left: Math.min(...rects.map(r => r.left)), right: Math.max(...rects.map(r => r.right)), top: Math.min(...rects.map(r => r.top)), bottom: Math.max(...rects.map(r => r.bottom)) };
        if (ell) { const er = el.getBoundingClientRect(); bb = { left: er.left, right: er.right, top: er.top, bottom: er.bottom }; rects.splice(0, rects.length, er); }
        if (ell && el.scrollWidth > el.clientWidth + 1) { /* ellipsis is the sanctioned shortening; only the visible part is judged */ }
        for (let a = el.parentElement; a && a.id !== 'stage'; a = a.parentElement) {
          const acs = getComputedStyle(a);
          if (acs.overflow === 'visible' && acs.overflowX === 'visible' && acs.overflowY === 'visible') continue;
          const ar = a.getBoundingClientRect();
          if (bb.left < ar.left - 1 || bb.right > ar.right + 1 || bb.top < ar.top - 1 || bb.bottom > ar.bottom + 1 || !inRound(bb, ar, acs)) { out.push('clipped ' + name + ' by ' + (a.className || a.tagName)); break; }
        }
        const r0 = rects[0], r1 = rects[rects.length - 1];
        const pts = [[r0.left + 2, r0.top + r0.height / 2], [(bb.left + bb.right) / 2, r0.top + r0.height / 2], [r1.right - 2, r1.top + r1.height / 2]];
        for (const [x, y] of pts) {
          if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
          const top = document.elementsFromPoint(x, y)[0];
          if (top && top !== el && !el.contains(top) && !top.contains(el)) { out.push('covered ' + name + ' by ' + (typeof top.className === 'string' ? top.className : top.tagName)); break; }
        }
      }
    });
    st.remove();
    return out;
  });
  ok(bad.length === 0, `${label}: text clipped/covered: ${bad.slice(0, 4).join(' ; ')}`);
}
const SCREENS = [['hub', "Blippi.go('hub')"], ['map', "Blippi.go('map')"], ['vehicles', "Blippi.go('vehicles',{mission:'W02-M01'})"],
  ['m-kincir', "Blippi.go('mission',{mission:'W02-M01',vehicle:'truk-air'})"], ['m-jalan', "Blippi.go('mission',{mission:'W01-M01',vehicle:'buggy'})"],
  ['bengkel', "Blippi.go('bengkel')"], ['penemuan', "Blippi.go('penemuan')"], ['bermain', "Blippi.go('bermain')"]];
// 1. every screen at 4 viewports
for (const [w, h] of [[1280, 800], [1024, 768], [844, 390], [390, 844]]) {
  const p = await fresh(w, h);
  for (const [n, js] of SCREENS) { await p.evaluate(js); await sleep(120); await layout(p, `${n}@${w}x${h}`, w < h); if (w > h) await textCheck(p, `${n}@${w}x${h}`); }
  await p.close();
}
// 2. W01-M01 by real pointer, from the hub card
let p = await fresh(1280, 800);
await p.click('[data-act=mulai]'); await sleep(200);
ok(await p.evaluate(() => Blippi.current()) === 'mission', 'hub card did not open mission');
await p.click('[data-tool=paket]'); await sleep(100);
ok(/Belum waktunya|nanti|dulu/i.test(await txt(p, '[data-instr]')), 'W01 wrong tool: no kind message');
await p.click('[data-cross=R]'); await p.click('[data-cross=L]'); await sleep(100);
ok(/sudah memilih/i.test(await txt(p, '[data-instr]')), 'W01 other-route tap: no kind message');
await p.click('[data-cross=R]'); await p.click('[data-cross=R]'); await sleep(900);
ok(await p.evaluate(() => document.querySelector('.step.on').getAttribute('data-step')) === '1', 'W01 boards did not advance to step 2');
await p.reload({ waitUntil: 'load' }); await p.evaluate("Blippi.go('mission',{mission:'W01-M01',vehicle:'buggy'})"); await sleep(200);
ok(await p.evaluate(() => document.querySelector('.step.on').getAttribute('data-step')) === '1', 'W01 resume lost step');
await p.click('[data-tool=jalan]');
let c = await center(p, '[data-act=jalan-hold]'); await p.mouse.move(c.x, c.y); await p.mouse.down(); await sleep(3400); await p.mouse.up(); await sleep(300);
ok(await p.evaluate(() => document.querySelector('.step.on').getAttribute('data-step')) === '2', 'W01 hold-to-drive did not arrive');
await p.click('[data-tool=paket]'); await sleep(100);
c = await center(p, '[data-box]'); await p.mouse.click(c.x, c.y); await sleep(2800);
ok(await p.$('[data-payoff=first]') !== null, 'W01 no first payoff');
ok(await p.evaluate(() => document.querySelector('[data-park]').getAttribute('data-park')) === 'on', 'W01 park path missing');
ok(await p.evaluate(() => Object.keys(Blippi.state().rewards).length) === 1, 'W01 reward count');
// 3. W02-M01 by real pointer, from the hub card (recommended is now W02)
await p.click('[data-act=lanjut]'); await sleep(200);
await p.evaluate("Blippi.go('hub')"); await sleep(100);
ok((await txt(p, '[data-card=mission] ~ .title') || await txt(p, '.title')).length > 0, 'hub card');
await p.click('[data-nav=peta]'); await sleep(150);
ok(await p.$('[data-world-label=kota-roda] ~ .badge') !== null, 'map: no check on Kota Roda after W01');
await p.click('[data-world-label=taman-air]'); await sleep(100);
await p.click('[data-world-label=kebun-ceria]'); await sleep(100);
ok(/Terbuka setelah/.test(await txt(p, '[data-card-sub]')), 'locked island: no kind reason');
await p.click('[data-world-label=taman-air]'); await sleep(100);
await p.click('[data-act=jelajahi]'); await sleep(150);
await p.click('[data-vcard=excavator]'); await sleep(120);
ok(await p.evaluate(() => document.querySelector('[data-fit]').getAttribute('data-fit')) === 'no', 'excavator should not fit W02');
await p.click('[data-vcard=truk-air]'); await sleep(120);
ok(await p.evaluate(() => document.querySelector('[data-fit]').getAttribute('data-fit')) === 'yes', 'truck should fit W02');
await p.click('[data-act=coba]'); await p.click('[data-act=pakai]'); await sleep(250);
ok(await p.evaluate(() => Blippi.current()) === 'mission', 'PAKAI KENDARAAN did not start mission');
// wrong tool at step 1
await p.click('[data-tool=pompa]'); await sleep(100);
ok(/Sambungkan selang dulu/.test(await txt(p, '[data-instr]')), 'W02 wrong tool: no kind explanation');
// wrong drop
c = await center(p, '[data-hose-end]'); await p.mouse.move(c.x, c.y); await p.mouse.down(); await p.mouse.move(c.x - 150, c.y - 200, { steps: 6 }); await p.mouse.up(); await sleep(600);
ok(/coba lagi/i.test(await txt(p, '[data-instr]')), 'W02 wrong drop: no "coba lagi"');
ok(await p.evaluate(() => document.querySelector('.step.on').getAttribute('data-step')) === '0', 'W02 wrong drop advanced');
// hint ladder
for (let i = 0; i < 3; i++) { await p.click('[data-act=petunjuk]'); await sleep(250); }
await sleep(1200);
// real drag to the inlet
c = await center(p, '[data-hose-end]'); const t = await center(p, '[data-target=inlet]');
await p.mouse.move(c.x, c.y); await p.mouse.down(); await p.mouse.move(t.x - 20, t.y, { steps: 12 }); await p.mouse.up(); await sleep(1000);
ok(await p.evaluate(() => document.querySelector('.step.on').getAttribute('data-step')) === '1', 'W02 hose drag did not connect');
// valve: must choose KATUP first
let v = await center(p, '[data-valve]'); await p.mouse.click(v.x, v.y); await sleep(100);
ok(/katup dulu/i.test(await txt(p, '[data-instr]')), 'W02 valve without tool: no kind message');
await p.click('[data-tool=katup]');
for (let i = 0; i < 3; i++) { v = await center(p, '[data-valve]'); await p.mouse.click(v.x, v.y); await sleep(120); }
await sleep(800);
ok(await p.evaluate(() => document.querySelector('.step.on').getAttribute('data-step')) === '2', 'W02 valve did not open');
await p.click('[data-tool=pompa]');
c = await center(p, '.pumpunit'); await p.mouse.move(c.x, c.y); await p.mouse.down(); await sleep(2900); await p.mouse.up(); await sleep(2400);
ok(await p.$('[data-payoff=first]') !== null, 'W02 no first payoff');
ok(await p.evaluate(() => Object.keys(Blippi.state().rewards).length) === 2, 'W02 reward count');
await p.click('[data-act=lanjut]'); await sleep(200);
ok(await p.$('.mini-wheel') !== null, 'map: no working wheel after W02');
await p.reload({ waitUntil: 'load' });
const st = await p.evaluate(() => Blippi.state());
ok(Object.keys(st.rewards).length === 2 && st.world['taman-air:kincir-aktif'] === 1, 'reload lost reward/world');
await p.evaluate("Blippi.go('map')"); await sleep(100);
ok(await p.$('.mini-wheel') !== null, 'wheel not persisted after reload');
// replay: reward must not duplicate
await p.evaluate("Blippi.go('mission',{mission:'W02-M01',vehicle:'truk-air'})"); await sleep(150);
await p.evaluate("Blippi.go('map')"); // leave cleanly
ok(await p.evaluate(() => Blippi.grant(Blippi.D.missions['W02-M01'])) === false, 'reward granted twice');
// panels
await p.evaluate("Blippi.go('penemuan')"); await sleep(100);
ok(await p.evaluate(() => document.querySelectorAll('.stk.found').length) === 2, 'penemuan: stickers not shown');
await p.evaluate("Blippi.go('bermain')"); await sleep(100);
c = await center(p, '[data-yard]'); await p.mouse.move(c.x - 300, c.y); await p.mouse.down(); await p.mouse.move(c.x + 200, c.y, { steps: 8 }); await sleep(900); await p.mouse.up();
ok(await p.$('[data-car]') !== null, 'yard car missing');
// pause + pointer-cancel safety (no throw): dispatch pointercancel mid-drag
await p.evaluate("Blippi.go('mission',{mission:'W02-M01',vehicle:'truk-air'})"); await sleep(150);
c = await center(p, '[data-hose-end]'); await p.mouse.move(c.x, c.y); await p.mouse.down(); await p.mouse.move(c.x + 30, c.y - 10);
await p.evaluate(() => document.querySelector('[data-hose-end]').dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, bubbles: true })));
await p.mouse.up(); await sleep(500);
await p.click('[data-act=pause]'); await sleep(100);
ok(await p.$('[data-act=lanjut]') !== null, 'pause modal missing');
ok(await p.evaluate(() => /Segera/i.test(document.body.innerText)) === false, 'found "Segera Hadir"');
ok(await p.evaluate(() => /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(document.body.innerText)) === false, 'emoji in page');
ok(errors.length === 0, 'page errors: ' + errors.slice(0, 3).join(' | '));
await b.close();
console.log(fails.map(f => 'FAIL ' + f).join('\n'));
console.log(`qa-blippi: ${checks - fails.length}/${checks} checks passed, ${errors.length} page errors`);
process.exit(fails.length ? 1 : 0);
