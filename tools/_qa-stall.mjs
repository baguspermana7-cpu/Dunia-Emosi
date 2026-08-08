// The freezes the owner reports throw nothing, so the error/rejection handlers
// capture nothing at all. Block the main thread for real and assert the log
// records it -- and that a boot-time block is labelled apart from a freeze that
// happens under the child's hands.
import puppeteer from 'puppeteer';
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
let fail = 0;

for (const phase of ['boot', 'bermain']) {
  const p = await b.newPage();
  await p.goto('http://127.0.0.1:8955/games/kuis-matematika.html', { waitUntil: 'domcontentloaded', timeout: 45000 });
  const out = await p.evaluate(async (phase) => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    localStorage.removeItem('__freezeLog');
    // The detector arms 3s after load, so a block before that is startup cost.
    if (phase === 'bermain') await wait(6000);
    window.__freezeContext = 'uji ' + phase;
    const t = Date.now();
    while (Date.now() - t < 6000) {}          // block, exactly like the real freeze
    await wait(2500);
    const log = window.freezeLog ? window.freezeLog() : [];
    return { hasApi: typeof window.freezeLog === 'function', entries: log.map(e => ({ type: e.type, msg: e.msg, ctx: e.ctx })) };
  }, phase);

  const want = phase === 'boot' ? 'boot-slow' : 'stall';
  const hit = out.entries.filter(e => e.type === want);
  const ok = out.hasApi && hit.length === 1 && hit[0].ctx === 'uji ' + phase && out.entries.length === 1;
  if (!ok) fail++;
  console.log(`=== ${phase} === ${ok ? 'LULUS' : 'GAGAL'}  ${JSON.stringify(out.entries)}`);
  await p.close();
}
await b.close();
console.log(fail ? `\n${fail} kasus GAGAL` : '\nLULUS — macet tercatat dan boot dibedakan dari beku saat bermain');
process.exit(fail ? 1 : 0);
