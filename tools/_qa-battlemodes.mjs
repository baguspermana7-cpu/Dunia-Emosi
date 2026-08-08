// Two dead-screen paths in battle-modes, driven for real:
//  (1) the pokedex JSON parses but is garbage -> the render throws -> the child
//      must NOT be left on "Memuat Pokedex…" with a catch that re-throws.
//  (2) native confirm() suppressed (installed-PWA shell always returns false)
//      -> the × exit button must still respond instead of doing nothing.
import puppeteer from 'puppeteer';

const CASES = [
  { name: 'pokedex rusak', body: '{}' },
  { name: 'pokedex sehat', body: null },
  // A corrupt pokedex turned out NOT to make the render throw, so the guard
  // itself would ship untested -- which is how error paths rot. One-shot fault:
  // the first addEventListener inside the render throws, the fallback's own
  // wiring still works. Proves the failure screen renders AND its retry lives.
  { name: 'render melempar', body: null, breakOnce: true },
];

const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let fail = 0;

for (const c of CASES) {
  const p = await b.newPage();
  await p.setViewport({ width: 1600, height: 900 });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 110)));
  await p.evaluateOnNewDocument(() => { window.confirm = () => false; });
  if (c.breakOnce) {
    await p.evaluateOnNewDocument(() => {
      // The pokedex is already resident by the time we call startPvP, so the
      // render runs SYNCHRONOUSLY inside it -- arming afterwards is too late.
      // Arm up front but fire only on the render's own [data-exit] wiring, the
      // first thing it touches after writing its markup. The fallback screen
      // wires [data-bm-retry]/[data-bm-home], so it cannot re-trigger.
      window.__armFault = () => {
        const real = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function (...a) {
          if (this.matches && this.matches('[data-exit]')) {
            EventTarget.prototype.addEventListener = real;
            throw new Error('fault-injected');
          }
          return real.apply(this, a);
        };
      };
    });
  }
  if (c.body !== null) {
    await p.setRequestInterception(true);
    p.on('request', r => (/pokemon-db\.json/.test(r.url())
      ? r.respond({ status: 200, contentType: 'application/json', body: c.body })
      : r.continue()));
  }
  await p.goto('http://127.0.0.1:8955/games/gym-pokemon.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));

  const out = await p.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const res = { api: !!(window.BattleModes && window.BattleModes.startPvP) };
    if (!res.api) return res;
    let cancelled = false;
    if (window.__armFault) window.__armFault();
    try { window.BattleModes.startPvP({ onCancel: () => { cancelled = true; } }); }
    catch (e) { res.startErr = String(e).slice(0, 100); }
    await wait(4000);                       // past fetch + retries + render
    const root = document.querySelector('.bm-pvp-real');
    res.mounted = !!root;
    if (!root) return res;
    res.stuckOnLoader = /Memuat Pokedex/.test(root.textContent);
    res.showsFailScreen = /gagal memuat/i.test(root.textContent);
    res.hasRetry = !!root.querySelector('[data-bm-retry]');
    const btn = root.querySelector('[data-exit]');
    res.foundExit = !!btn;
    if (btn) {
      btn.click(); await wait(150);
      res.afterFirstTap = btn.textContent.trim();
      btn.click(); await wait(400);
      res.cancelled = cancelled;
      res.rootGone = !document.querySelector('.bm-pvp-real');
    }
    return res;
  }).catch(e => ({ evalErr: String(e).slice(0, 140) }));

  // What must hold in BOTH cases: never stranded on the loader, and the exit
  // button both acknowledges the first tap and actually exits on the second.
  const ok = c.breakOnce
    ? (out.mounted && out.stuckOnLoader === false && out.showsFailScreen === true && out.hasRetry === true)
    : (out.mounted && out.stuckOnLoader === false && out.foundExit &&
       out.afterFirstTap === 'Keluar?' && out.cancelled === true && out.rootGone === true);
  if (!ok) fail++;
  console.log(`\n=== ${c.name} === ${ok ? 'LULUS' : 'GAGAL'}`);
  console.log('   ', JSON.stringify(out));
  console.log('    pageerror:', errs.slice(0, 3));
  await p.close();
}
await b.close();
console.log(fail ? `\n${fail} kasus GAGAL` : '\nsemua kasus LULUS');
process.exit(fail ? 1 : 0);
