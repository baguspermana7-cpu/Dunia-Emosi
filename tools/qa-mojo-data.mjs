import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx = { window: null, location: { pathname: '/Dunia-Emosi/games/mojo-swoptops.html' } };
ctx.window = ctx; vm.createContext(ctx);
for (const f of ['prog-grid.js', 'data/mojo-levels.js', 'data/mojo-art.js', 'mojo-events.js']) vm.runInContext(fs.readFileSync(`games/${f}`, 'utf8'),ctx);
assert.match(ctx.MojoArt.mojo('fire','side'),/mojo-top\/fire.webp/);
assert.match(ctx.MojoArt.src('char/bo'),/mojo-char\/bo.webp/);
assert.equal(ctx.MojoArt.catalog.length,44);
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
