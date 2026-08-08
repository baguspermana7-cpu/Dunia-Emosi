// The gym move-lock is released only when BattleArena.orbFly's rAF chain reaches
// its end and calls onHit. Any way that chain can stop early -- a throw inside a
// frame, or frames that never resume after the screen sleeps mid-strike -- left
// `battle._moveLock` true and EVERY move button disabled: a battle that still
// looks alive but accepts no input. orbFly is public API, so drive it directly
// instead of walking the whole gym UI, and assert onHit fires in every case.
import puppeteer from 'puppeteer';

const CASES = [
  { name: 'normal', kill: null },
  { name: 'rAF mati di tengah', kill: 'raf' },     // screen sleeps mid-strike
  { name: 'frame melempar', kill: 'throw' },       // an exception inside a frame
];

const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let fail = 0;

for (const c of CASES) {
  const p = await b.newPage();
  await p.setViewport({ width: 1600, height: 900 });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 110)));
  await p.goto('http://127.0.0.1:8955/games/gym-pokemon.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));

  const out = await p.evaluate(async (kill) => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const res = { api: !!(window.BattleArena && window.BattleArena.orbFly) };
    if (!res.api) return res;
    const mk = (x) => {
      const d = document.createElement('div');
      d.style.cssText = 'position:fixed;top:300px;left:' + x + 'px;width:60px;height:60px;background:#333';
      document.body.appendChild(d); return d;
    };
    const from = mk(200), to = mk(900);

    let hit = false;
    const realRAF = window.requestAnimationFrame.bind(window);
    if (kill === 'raf') {
      // Let a couple of frames through, then deliver none -- what a sleeping
      // screen does to a strike that is already in flight.
      let n = 0;
      window.requestAnimationFrame = (fn) => (n++ < 2 ? realRAF(fn) : 0);
    } else if (kill === 'throw') {
      // Make one frame explode inside the animation callback.
      let n = 0;
      window.requestAnimationFrame = (fn) => realRAF((t) => { if (n++ === 1) throw new Error('frame-fault'); return fn(t); });
    }
    try { window.BattleArena.orbFly(from, to, { duration: 300 }, () => { hit = true; }); }
    catch (e) { res.callErr = String(e).slice(0, 90); }

    await wait(2500);                       // well past duration + 600 deadline
    window.requestAnimationFrame = realRAF;
    res.onHitFired = hit;
    res.orphanOrbs = document.querySelectorAll('.ba-orb').length;
    from.remove(); to.remove();
    return res;
  }, c.kill);

  // onHit is the only thing that releases the lock, so it must fire every time,
  // and the orb must not be left hanging on screen.
  const ok = out.api && out.onHitFired === true && out.orphanOrbs === 0;
  if (!ok) fail++;
  console.log(`\n=== ${c.name} === ${ok ? 'LULUS' : 'GAGAL'}`);
  console.log('   ', JSON.stringify(out));
  if (errs.length) console.log('    pageerror:', errs.slice(0, 2));
  await p.close();
}
await b.close();
console.log(fail ? `\n${fail} kasus GAGAL` : '\nsemua kasus LULUS — kunci jurus selalu terlepas');
process.exit(fail ? 1 : 0);
