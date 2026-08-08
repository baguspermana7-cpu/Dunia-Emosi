// Prove pixiSprite can no longer return an invisible sprite, offline or cold.
import puppeteer from 'puppeteer';
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

for (const mode of ['online', 'sprites-blocked', 'glyph-broken']) {
  const p = await b.newPage();
  await p.setViewport({ width: 1280, height: 720 });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 140)));
  if (mode !== 'online') {
    await p.setRequestInterception(true);
    p.on('request', r => (/\/assets\/db\//.test(r.url()) ? r.abort() : r.continue()));
  }
  await p.goto('http://127.0.0.1:8955/games/pokemon-birds.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 5000));

  const out = await p.evaluate(async (mode) => {
    if (!window.PIXI || !window.UISprites) return { err: 'no PIXI/UISprites' };
    // Last hole in the contract: textures blocked AND the glyph rescue itself
    // cannot make a texture. Only glyphTexture calls Texture.from, so breaking it
    // isolates that branch. Correct outcome is an HONEST zero -- invisible with a
    // zero box -- never a full-size box drawing nothing.
    if (mode === 'glyph-broken') PIXI.Texture.from = () => { throw new Error('no-texture'); };
    const app = new PIXI.Application();
    await app.init({ width: 128, height: 128, backgroundAlpha: 0 });
    const res = [];
    for (const ch of ['🪙', '❤️', '⚡', '🕊']) {
      const s = UISprites.pixiSprite(ch, 48, PIXI, { center: true });
      if (!s) { res.push({ ch, sprite: false }); continue; }
      s.x = 64; s.y = 64; app.stage.addChild(s);
      await new Promise(r => setTimeout(r, 4000));   // let load or rescue settle
      app.renderer.render(app.stage);
      const px = app.renderer.extract.pixels(app.stage);
      const arr = px.pixels || px;
      let drawn = 0;
      for (let i = 3; i < arr.length; i += 4) if (arr[i] > 8) drawn++;
      res.push({ ch, w: Math.round(s.texture.width), h: Math.round(s.texture.height), drawn, vis: s.visible, sx: s.scale.x });
      app.stage.removeChild(s);
    }
    app.destroy();
    return { res };
  }, mode);
  console.log(`\n=== ${mode} ===`);
  if (out.err) { console.log('  ', out.err); }
  else for (const r of out.res) {
    const bad = mode === 'glyph-broken'
      ? (r.vis !== false || r.sx !== 0)          // must be honestly absent
      : (!r.drawn || r.drawn < 20);
    console.log(`  ${r.ch}  tekstur ${r.w}x${r.h}  piksel ${r.drawn}  visible=${r.vis} skala=${r.sx}${bad ? '   <-- TAK TERLIHAT' : ''}`);
  }
  console.log('  err:', errs.slice(0, 3));
  await p.close();
}
await b.close();
