import fs from 'node:fs';import vm from 'node:vm';
const c={window:null};c.window=c;vm.createContext(c);for(const f of ['prog-grid.js','data/mojo-levels.js'])vm.runInContext(fs.readFileSync('games/'+f,'utf8'),c);
if(fs.existsSync('games/mojo-save.js'))vm.runInContext(fs.readFileSync('games/mojo-save.js','utf8'),c);
const shell=fs.readFileSync('games/mojo-swoptops.js','utf8');c.W=c;c.ML=c.MojoLevels;c.PG=c.ProgGrid;vm.runInContext(shell.slice(shell.indexOf('  function fill ('),shell.indexOf('  function load (')),c);
let fails=0;function check(ok,label){console.log((ok?'PASS ':'FAIL ')+label);if(!ok)fails++}
const dirty={lv:{t1:null,t2:{stars:'<img src=x onerror=alert(1)>'},t3:{stars:3,t:12},t4:{stars:9},t5:{stars:Infinity},bogus:{stars:3}},set:{sound:'false',narr:[],lang:'<b>x</b>'},rewardBolts:Infinity,seen:{normal:1,nope:1},mg:{'palu:id':1,'<img>':1},cp:{id:'s1',beat:1,world:{objs:null}}};
const clean=c.fill(dirty);check(!Object.hasOwn(clean.lv,'t1')&&!Object.hasOwn(clean.lv,'t2'),'Null and markup records rejected');check(clean.lv.t3?.stars===3,'Valid sibling preserved');check(!Object.hasOwn(clean.lv,'t4')&&!Object.hasOwn(clean.lv,'t5')&&!Object.hasOwn(clean.lv,'bogus'),'Only known levels with bounded finite stars retained');check(clean.set.sound===true&&clean.set.narr===false&&clean.set.lang==='id','Settings recovered by type and allowed value');check(clean.rewardBolts===0,'Nonfinite reward balance rejected');check(clean.cp===null,'Malformed checkpoint discarded safely');check(!clean.seen.nope&&!clean.mg['<img>'],'Unknown form and mastery keys stripped');
const lv=c.ML.byId('s1'),w=c.PG.prep(c.PG.world(lv),lv,0),sol=c.PG.solve(w,lv.beats[0]),end=c.PG.run(w,sol,lv.beats[0],{auto:true}).world,cpWorld=c.PG.startBeat(end,lv,1);delete cpWorld.map;delete cpWorld.cap;delete cpWorld.forms;
const good={id:'s1',beat:1,world:cpWorld,used:[sol.length],ghost:false,elapsed:120010,events:{count:1,last:120000},gotStars:{},starBeat:{},bonus:1};
const saved=c.fill({cp:good});check(saved.cp?.beat===1&&saved.cp.world.m.form===end.m.form&&saved.cp.world.objs.find(o=>o.id==='api1').st==='out','Real completed checkpoint remains resumable');
const injected=JSON.parse(JSON.stringify(good));injected.world.objs.find(o=>o.id==='mia').name='<img src=x>';const repaired=c.fill({cp:injected});check(repaired.cp?.world.objs.find(o=>o.id==='mia').name==='Oona','Checkpoint object labels rebuilt from trusted level content (s1 rescues Oona; no hijab art, owner rule)');
const invalid=JSON.parse(JSON.stringify(good));invalid.world.m.r=999;check(c.fill({cp:invalid}).cp===null,'Out-of-grid checkpoint rejected');
check(dirty.lv.t3.stars===3&&dirty.set.sound==='false','Input object remains unchanged');if(fails)process.exitCode=1;
const fractional=JSON.parse(JSON.stringify(good));fractional.elapsed=120010.75;fractional.events.last=120000.25;const clock=c.fill({cp:fractional}).cp;check(clock.elapsed===120010.75&&clock.events.last===120000.25,'Valid fractional pacing clocks preserved');
let current=c.PG.prep(c.PG.world(lv),lv,0),used=[];for(let i=0;i<lv.beats.length-1;i++){const route=c.PG.solve(current,lv.beats[i]);used.push(route.length);current=c.PG.prep(c.PG.startBeat(c.PG.run(current,route,lv.beats[i],{auto:true}).world,lv,i+1),lv,i+1);const cp=c.fill({cp:{...good,beat:i+1,world:current,used}}).cp;check(cp!==null,'Actual School checkpoint '+(i+1)+' passes shape validation including world changes')}
if(fails)process.exitCode=1;

const poisoned=JSON.parse(JSON.stringify(good));poisoned.world.m.form={toString:null};let kept;try{kept=c.fill({lv:{t3:{stars:2,t:1}},cp:poisoned})}catch{}check(kept?.lv.t3.stars===2&&kept.cp===null,'Poisoned non-string form rejects checkpoint without losing valid sibling');if(fails)process.exitCode=1;

// LEWATI vs SEBELAH (2026-10-03) moved s1's targets off the walls (rev 2). A checkpoint saved under the old layout
// is rebuilt at its beat (earlier beats replayed by the solver): nothing lands on a wall, nothing crashes.
{
 const old=JSON.parse(JSON.stringify(good));delete old.rev;old.world.objs.find(o=>o.id==='api2').r=0;old.world.objs.find(o=>o.id==='api2').c=3;old.world.objs.find(o=>o.id==='kotak').st='open';old.world.objs.find(o=>o.id==='kotak').r=2;old.world.objs.find(o=>o.id==='kotak').c=2;
 const cp=c.fill({cp:old}).cp,wall=o=>'#T'.includes(lv.grid.map[o.r][o.c]);
 check(cp&&cp.beat===1&&cp.rev===lv.rev&&cp.world.objs.every(o=>!wall(o)),'Old-layout (rev 1) checkpoint is rebuilt at its beat on the new layout, no object on a wall');
 check(cp&&cp.world.objs.find(o=>o.id==='api1').st==='out'&&cp.world.res.water===2,'Rebuilt checkpoint keeps the finished beat (first fire out, 2 water left)');
 const cur=c.fill({cp:{...good,rev:lv.rev}}).cp;check(cur&&cur.rev===lv.rev&&cur.world.m.r===good.world.m.r,'A current-layout checkpoint is validated as saved, not rebuilt');
 const bad=JSON.parse(JSON.stringify(old));bad.world.m.c=-4;check(c.fill({cp:bad}).cp===null,'An old-layout checkpoint with a broken position is still rejected');
 const typo=c.fill({cp:{...good,rev:lv.rev,world:{...good.world,objs:good.world.objs.map(o=>o.id==='kotak'?{...o,st:'opened'}:o)}}}).cp;check(typo===null,'Unknown toolbox state is rejected');
 if(fails)process.exitCode=1;
}
