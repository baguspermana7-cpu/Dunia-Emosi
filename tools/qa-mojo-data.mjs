import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx = { window: null, location: { pathname: '/Dunia-Emosi/games/mojo-swoptops.html' } };
ctx.window = ctx; vm.createContext(ctx);
for (const f of ['prog-grid.js', 'data/mojo-levels.js', 'data/mojo-art.js', 'mojo-events.js']) vm.runInContext(fs.readFileSync(`games/${f}`, 'utf8'),ctx);
assert.match(ctx.MojoArt.mojo('fire','side'),/mojo-top\/fire.webp/);
assert.match(ctx.MojoArt.src('char/bo'),/mojo-char\/bo.webp/);
assert.equal(ctx.MojoArt.catalog.length,44);
// owner 2026-10-03: the film Mojo (mojo-hero, 25 poses) leads every selection list; the board keeps mojo-top art
assert.equal(ctx.MojoArt.heroCatalog.length,25);
assert.equal(ctx.MojoArt.showcase.length,69);
assert.ok(ctx.MojoArt.showcase.slice(0,25).every(f=>f.film&&/mojo-hero\//.test(f.src)),'film poses listed first');
assert.ok(ctx.MojoArt.showcase.slice(25).every(f=>!f.film&&/mojo-top\//.test(f.src)),'workshop forms after the film poses');
assert.match(ctx.MojoArt.mojo('normal','side'),/mojo-hero\/base-bo.webp/);
for(const f of ['normal','dozer','fire','cherry','jumper','crane','chopper'])assert.match(ctx.MojoArt.module(f,'top'),/mojo-top\//,'board art unchanged: '+f);
for(const lv of ctx.MojoLevels.LEVELS)lv.beats.forEach((b,i)=>{const k=ctx.MojoArt.scene(lv,i,ctx.MojoLevels.region(lv.id));for(const o of ['land','port'])assert.ok(k==='mojo-bg/construction'||fs.existsSync(`assets/db/lib/${k}-${o}.webp`),lv.id+' scene '+k)});
for(const r of ctx.MojoLevels.REGIONS){const k=ctx.MojoArt.regionScene(r);assert.ok(k==='mojo-bg/construction'||fs.existsSync(`assets/db/lib/${k}-land.webp`),r.id)}
for(const f of ctx.MojoArt.libFiles()) assert.ok(fs.existsSync(f.replace(/^\.\.\//,'').replace(/^\/Dunia-Emosi\//,'')),f);
const limit = ctx.MojoEvents.create(false);
assert.equal(limit.ready(119999,1), false);
assert.equal(limit.ready(120000,1), true);
limit.mark(120000,1); assert.equal(limit.ready(240000,1),false);
assert.equal(limit.ready(240000,2),true);
limit.mark(240000,2); limit.mark(360000,3);
assert.equal(limit.ready(480000,4),false);
assert.equal(ctx.MojoEvents.create(true).ready(999999,8),false);
for (const lv of ctx.MojoLevels.LEVELS) for (const b of lv.beats) for (const f of [...b.best||[],...b.alt||[]]) assert.ok(b.forms.includes(f),`${lv.id} badge ${f}`);
console.log('Mojo owner-art routes, 44-form catalog, safe files, badge metadata and question pacing PASS');

const resumed=ctx.MojoEvents.create(false,{count:1,last:240000});
assert.equal(resumed.ready(359999,1),false);assert.equal(resumed.ready(360000,1),true);

assert.equal(ctx.MojoEvents.resumeElapsed({last:240000},0),240000);
assert.equal(ctx.MojoEvents.resumeElapsed({last:240000},260000),260000);
