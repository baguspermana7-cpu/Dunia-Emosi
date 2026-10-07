import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const out='/tmp/mojo-interactions';fs.mkdirSync(out,{recursive:true});
const p=await browser.newPage();await p.setViewport({width:1280,height:800});
const errors=[];p.on('pageerror',e=>errors.push(e.message));
// Bo's chip (2026-10-04) opens on the first tap; the open popover's tap opens the Pesan Bo card
async function tap(s){if(s==='#bo-details'&&!(await p.$eval('#bo',e=>e.classList.contains('open')))){await (await p.$(s)).click();await sleep(60)}const e=await p.$(s);assert.ok(e,s);await e.evaluate(e=>e.scrollIntoView({block:'nearest',inline:'nearest'}));await e.click();await sleep(40)}
async function start(id){await p.evaluate(id=>__mojo.start(id),id);await tap('#in-go');if(await p.$('#ov-card.on #picker-later'))await tap('#picker-later')}
async function program(a){if(await p.$('#btn-clear:not([disabled])')){await tap('#btn-clear');await tap('#cl-yes')}for(const c of a)await tap(`[data-cmd="${c}"]`)}
async function auto(){
 if(await p.$('#ov-swop.on #sw-skip'))await tap('#sw-skip');const mg=await p.evaluate(()=>__mojo.mg());
 if(mg?.kind==='event')await tap('#event-skip');
 if(mg?.kind==='letters'){for(const c of mg.answer){const sel=`.tile[data-l="${c}"]:not(.used)`;if(await p.$(sel))await tap(sel)}await p.waitForSelector('#mg-ok');await tap('#mg-ok')}
 if(mg?.kind==='height')await tap(`[data-v="${mg.answer}"]`);
}
async function idle(){for(let n=0;n<350;n++){await auto();if(await p.evaluate(()=>!__mojo.state().running))return;await sleep(80)}throw Error('Run did not stop')}
try{
 await p.goto('http://localhost:8081/games/mojo-swoptops.html?unlock=1',{waitUntil:'networkidle0'});
 await p.waitForFunction(()=>window.__mojo?.ready&&navigator.serviceWorker.controller);await sleep(800);
 for(const id of ['t1','s1']){
  await start(id);await program(await p.evaluate(()=>__mojo.solution()));await tap('#btn-run');await idle();
  assert.equal(await p.$eval('#btn-run',e=>e.disabled),true,'completed transition has disabled run');
  await tap('#btn-quit');await sleep(1800);
  assert.equal(await p.evaluate(()=>document.body.dataset.scr),'scr-regions');
  assert.equal(await p.$('.overlay.on'),null,'departing during transition cancels future intro/result');
  console.log(id+' transition departure PASS');
 }

 await start('t6');await tap('#btn-run');await idle();
 assert.equal(await p.evaluate(()=>__mojo.state().fail.reason),'form');
 assert.ok(await p.$('.slot.fail[data-slot="2"]'));await p.screenshot({path:out+'/debug-stop.png'});
 await tap('[data-slot="2"]');await tap('[data-cmd="swop:fire"]');await tap('[data-cmd="spray"]');
 assert.deepEqual(await p.evaluate(()=>__mojo.state().prog),['east','east','swop:fire','spray']);
 await tap('#btn-run');await idle();await p.waitForSelector('#ov-card.on #res-map');console.log('Debug wrong capability → repair chosen slot → real recovery PASS');
 await start('t5');await program(['up','west','east']);await tap('[data-slot="0"]');await tap('[data-act="r"]');
 assert.deepEqual(await p.evaluate(()=>__mojo.state().prog),['west','up','east']);await tap('#btn-undo');
 await tap('[data-slot="0"]');await tap('[data-act="x"]');assert.deepEqual(await p.evaluate(()=>__mojo.state().prog),['west','east']);await tap('#btn-undo');
 const r=await p.$eval('[data-slot="0"]',e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}});
 await p.mouse.move(r.x,r.y);await p.mouse.down();await p.mouse.move(600,200,{steps:8});await p.mouse.up();
 assert.deepEqual(await p.evaluate(()=>__mojo.state().prog),['up','west','east']);console.log('Edit, reorder, delete, undo and outside drag preserve plan PASS');
 await start('m1');await program(['swop:dozer','up']);const before=await p.evaluate(()=>__mojo.state().world);await tap('#btn-run');await sleep(450);await auto();await tap('#btn-run');await sleep(1800);
 assert.equal(await p.evaluate(()=>__mojo.state().world),before);assert.equal(await p.evaluate(()=>__mojo.state().running),false);
 assert.equal(await p.$eval('#mojo-mod',e=>getComputedStyle(e).opacity),'1');console.log('Stop during SWOP returns intact checkpoint sprite PASS');
 await start('m2');await program(['up']);const rewards=await p.evaluate(()=>__mojo.save().rewardBolts);
 await p.evaluate(()=>{const now=performance.now.bind(performance);window.__testClock=now;performance.now=()=>now()+120001});
 await tap('#btn-run');await p.waitForFunction(()=>__mojo.mg()?.kind==='event');
 const answer=await p.evaluate(()=>String(__mojo.mg().answer));const water=await p.evaluate(()=>__mojo.state().res.water);
 const wrong=await p.$$eval('[data-answer]',(bs,a)=>bs.find(b=>b.textContent!==a).getAttribute('data-answer'),answer);
 await tap(`[data-answer="${wrong}"]`);assert.equal(await p.evaluate(()=>__mojo.save().rewardBolts),rewards);
 const right=await p.$$eval('[data-answer]',(bs,a)=>bs.find(b=>b.textContent===a).getAttribute('data-answer'),answer);
 await tap(`[data-answer="${right}"]`);await sleep(1100);assert.equal(await p.evaluate(()=>__mojo.mg()?.kind),'event');await p.screenshot({path:out+'/question-reward.png'});await tap('#event-skip');
 assert.equal(await p.evaluate(()=>__mojo.save().rewardBolts),rewards+1);assert.equal(await p.evaluate(()=>__mojo.state().res.water),water);
 await p.evaluate(()=>performance.now=window.__testClock);await p.evaluate(()=>__mojo.home());await tap('#btn-profile');
 assert.match(await p.$eval('#scr-profile',e=>e.textContent),/Lencana baut/);await p.screenshot({path:out+'/profile-reward.png'});console.log('Real pickup question, wrong retry, saved visible badge reward, unchanged puzzle resources PASS');
 for(const forbid of [['push'],['jump']]){
  await start('m8');await program(await p.evaluate(f=>__mojo.alt(f),forbid));await tap('#btn-run');await idle();await p.waitForSelector('#ov-card.on #res-map');
 }
 console.log('Dozer and Jumper alternate real-control routes PASS');
 await start('s1');
 for(let beat=0;beat<=3;beat++){
  assert.equal(await p.evaluate(()=>__mojo.state().beat),beat);
  await program(await p.evaluate(()=>__mojo.solution()));await tap('#btn-run');await idle();
  if(beat<3){
   const cp=await p.evaluate(()=>__mojo.save().cp);await p.reload({waitUntil:'networkidle0'});await p.waitForFunction(()=>window.__mojo?.ready);await start('s1');
   assert.equal(await p.evaluate(()=>__mojo.state().beat),cp.beat);assert.deepEqual(await p.evaluate(()=>__mojo.save().cp.gotStars),cp.gotStars);
   assert.ok(await p.evaluate(e=>__mojo.state().elapsed>=e,cp.elapsed));
  }else await p.waitForSelector('#ov-card.on #res-map');
 }
 console.log('All school checkpoints survive reload with stars and pacing clock PASS');
 await p.evaluate(()=>__mojo.home());await tap('#btn-settings');await tap('[data-k="lang"] [data-v="en"]');await tap('#set-ok');
 await start('m5');await program(await p.evaluate(()=>__mojo.solution()));await tap('#btn-run');
 for(let n=0;n<250;n++){if(await p.evaluate(()=>__mojo.mg()?.kind==='letters'))break;if(await p.$('#ov-swop.on #sw-skip'))await tap('#sw-skip');await sleep(100)}
 assert.equal(await p.evaluate(()=>__mojo.mg()?.answer),'HAMMER');await p.screenshot({path:out+'/hammer-english.png'});await idle();await p.waitForSelector('#ov-card.on #res-map');
 assert.ok(await p.evaluate(()=>__mojo.state().tools.palu));console.log('PALU mastery keeps separate HAMMER word challenge and grants real tool PASS');
 await p.setViewport({width:390,height:844});await start('m8');await program(['east','up']);await tap('[data-slot="0"]');
 const toolbar=await p.$eval('.slot-act',e=>{const r=e.getBoundingClientRect();return{top:r.top,bottom:r.bottom,left:r.left,right:r.right}});
 assert.ok(toolbar.left>=0&&toolbar.right<=390&&toolbar.top>=0&&toolbar.bottom<=844);await tap('[data-act="r"]');
 assert.deepEqual(await p.evaluate(()=>__mojo.state().prog),['up','east']);const boardWidth=await p.$eval('#board',e=>e.clientWidth);assert.ok(boardWidth>=280,'portrait board stays readable: '+boardWidth);
 await p.screenshot({path:out+'/portrait-edit.png'});await p.setViewport({width:844,height:390});await sleep(350);
 assert.deepEqual(await p.evaluate(()=>__mojo.state().prog),['up','east']);await p.screenshot({path:out+'/rotated-edit.png'});console.log('Portrait editor touch-size actions and rotation preserve plan PASS');
 // ── ONE rule, real taps (owner 2026-10-03, LEWATI vs SEBELAH) ──
 await p.setViewport({width:1280,height:800});await sleep(300);
 // forget the PALU mastery earned above, so the word game must open again
 await p.evaluate(()=>{const k='dunia-g31-mojo',v=JSON.parse(avatarScopedGet(k));v.mg={};avatarScopedSet(k,JSON.stringify(v))});await p.reload({waitUntil:'networkidle0'});await p.waitForFunction(()=>window.__mojo?.ready);await sleep(400);
 await start('m5');await program(await p.evaluate(()=>__mojo.solution()));await tap('#btn-run');
 let mgAt=null;for(let n=0;n<250;n++){const mg=await p.evaluate(()=>__mojo.mg());if(mg?.kind==='letters'){mgAt=await p.evaluate(()=>({cmd:__mojo.state().prog[+document.querySelector('.slot.active').dataset.slot],pos:__mojo.state().position}));break}await sleep(80)}
 assert.ok(mgAt&&['up','down','west','east'].includes(mgAt.cmd),'driving ONTO the toolbox (an arrow, not Ambil) opens the letters microgame: '+JSON.stringify(mgAt));
 await p.screenshot({path:out+'/walk-over-toolbox.png'});await idle();await p.waitForSelector('#ov-card.on #res-map');
 assert.ok(await p.evaluate(()=>__mojo.state().tools.palu&&__mojo.state().objects.find(o=>o.id==='kotak').st==='got'));console.log('Walk onto the toolbox → letters microgame → hammer, box gone PASS');
 // spray from each of the four sides, Mojo facing away: he turns to the fire himself
 for(let side=0;side<4;side++){
  const id=await p.evaluate(side=>{const D=ProgGrid.DIRS,at=[2-D[side][0],2-D[side][1]],id='qa-side'+side;
   if(!MojoLevels.byId(id))MojoLevels.LEVELS.push({id,ch:'qa',place:'Uji sisi',title:'Sisi '+side,icon:'cmd/east',grid:{rows:5,cols:5,map:['.....','.....','.....','.....','.....'],theme:'town'},mojo:{at,h:(side+2)%4,form:'fire'},res:{water:2},cap:{water:5},
    objects:[{id:'api',type:'fire',at:[2,2],str:1}],beats:[{title:'Sisi',story:'Uji sisi.',bo:'Semprot.',objectives:[{do:'extinguish',id:'api'}],slots:3,budget:1,forms:['fire'],palette:['up','down','west','east','spray']}]});return id},side);
  await start(id);await program(['spray']);await tap('#btn-run');await idle();
  assert.equal(await p.evaluate(()=>__mojo.state().objects.find(o=>o.id==='api').st),'out','side '+side);
  assert.equal(await p.evaluate(()=>__mojo.state().position.h),side,'Mojo turned to the fire from side '+side);
  if(await p.$('#ov-card.on #res-map'))await tap('#res-map');
 }
 await p.evaluate(()=>{MojoLevels.LEVELS.splice(MojoLevels.LEVELS.findIndex(l=>l.ch==='qa'))});
 console.log('Spray from each of the four sides with real taps; Mojo turns to the fire PASS');
 // an arrow into a burning fire: one specific message that names the fix
 await start('t4');await program(['east','east','east']);await tap('#btn-run');await idle();
 const msg=await p.evaluate(()=>document.getElementById('bo-text').textContent+'|'+__mojo.state().fail.reason);
 assert.ok(/^Ada api di depan!/.test(msg)&&msg.endsWith('|object'),'fire bump message: '+msg);
 await tap('#bo-details');assert.match(await p.$eval('#bo-full',e=>e.textContent),/Swop jadi Pemadam, lalu SEMPROT dari sebelahnya/);await tap('#bo-close');console.log('Arrow into fire names the form and the action PASS');
 // the Cara Main rule card: in the t1 briefing, and reopened from the ? button
 await p.evaluate(()=>__mojo.start('t1'));await p.waitForSelector('#ov-card.on #rule-card');await p.screenshot({path:out+'/rule-card-t1.png'});await tap('#in-go');if(await p.$('#ov-card.on #picker-later'))await tap('#picker-later');
 await tap('#btn-rule');await p.waitForSelector('#ov-card.on #rule-close');assert.equal(await p.$$eval('#ov-card.on .rule-p',e=>e.length),2);await p.screenshot({path:out+'/rule-card-reopen.png'});await tap('#rule-close');
 assert.equal(await p.$('#ov-card.on'),null);console.log('Cara Main card on t1 and reopenable from the ? button PASS');
 // ── ROAD rule (owner 2026-10-03, m5 photo): grass is park scenery; a real tap onto it stops with the grass message ──
 await start('m5');await program(['west']);await tap('#btn-run');await idle();
 assert.equal(await p.evaluate(()=>__mojo.state().fail.reason),'grass');
 assert.equal(await p.$eval('#bo-text',e=>e.textContent),'Itu rumput taman.');
 await tap('#bo-details');assert.equal(await p.$eval('#bo-full',e=>e.textContent),'Itu rumput taman. Mojo jalan di jalan raya saja.');await p.screenshot({path:out+'/grass-stop.png'});await tap('#bo-close');
 console.log('Real tap onto grass: Mojo stops with "Itu rumput taman. Mojo jalan di jalan raya saja." PASS');
 // ── hint ladder: four distinct, concrete rungs; never exhausted (owner 2026-10-03, m6 photo) ──
 for(const id of await p.evaluate(()=>__mojo.levels())){
  await start(id);const texts=[];
  for(let k=1;k<=5;k++){await tap('#btn-hint');texts.push(await p.evaluate(()=>__mojo.state().hintText))}
  const [r1,r2,r3,r4,r5]=texts;
  assert.ok(/^.*Tugasnya: /.test(r1),id+' rung 1 names the task: '+r1);
  assert.ok(/Urutannya|Lalu:|Cukup panah|LEWATI dulu/.test(r2),id+' rung 2 names the forms / actions: '+r2);
  assert.ok(/^Langkah berikutnya, kotak \d+: /.test(r3),id+' rung 3 names the next command: '+r3);
  assert.ok([r4,r5].every(t=>/^(Dua langkah berikutnya|Tinggal satu langkah)/.test(t)),id+' rung 4 (and every later tap) shows the next steps: '+r4+' / '+r5);
  assert.equal(new Set([r1,r2,r3,r4]).size,4,id+' four distinct rungs');
  assert.ok(await p.$('.cell-mark')&&await p.$('.cmd.cand')&&await p.$('.slot.ghost'),id+' rung 4 marks the target cells, the palette buttons and the slot');
  assert.equal(await p.$eval('#btn-show',e=>e.hidden),false,id+' after the last rung "Tunjukkan Caranya" is offered');
  assert.equal(await p.$eval('#hint-lv',e=>e.textContent),'4/4');
 }
 await p.screenshot({path:out+'/hint-rung4.png'});console.log('Hint ladder: 4 distinct concrete rungs on all levels, then Tunjukkan Caranya PASS');
 // "Tunjukkan Caranya" after two stopped runs
 await start('t2');await program(['west']);for(let k=0;k<2;k++){assert.equal(await p.$eval('#btn-show',e=>e.hidden),true);await tap('#btn-run');await idle()}
 assert.equal(await p.$eval('#btn-show',e=>e.hidden),false,'offered after two stopped runs');console.log('Tunjukkan Caranya offered after two stopped runs PASS');
 // ── show me: fills a solvable plan for EVERY beat of EVERY level, narrates it, the child runs it, 1 star ──
 for(const id of await p.evaluate(()=>__mojo.levels())){
  await start(id);const beats=await p.evaluate(()=>__mojo.state().beats);
  for(let bi=0;bi<beats;bi++){
   await p.waitForFunction(b=>__mojo.state().beat===b&&!__mojo.state().trans&&!document.getElementById('btn-run').disabled,{},bi);
   if(await p.$('#ov-card.on #in-go')){await tap('#in-go');if(await p.$('#ov-card.on #picker-later'))await tap('#picker-later')}
   // the bubble is THIS beat's objective line, the task chip its pending objective
   const bub=await p.evaluate(()=>{const s=__mojo.state(),lv=MojoLevels.byId(s.id),bo=lv.beats[s.beat].bo,first=(bo.match(/^.*?[.!?](?:\s|$)/)||[bo])[0].trim();return{text:document.getElementById('bo-text').textContent,first,task:document.getElementById('bo-task').textContent}});
   assert.equal(bub.text,bub.first,id+':'+bi+' bubble shows this beat\'s own line');assert.ok(bub.task&&bub.task!=='Tugas selesai!',id+':'+bi+' task chip names a pending objective');
   const sol=await p.evaluate(()=>__mojo.solution());
   await tap('#bo-details');await tap('#bo-show');
   let narrated=false;for(let n=0;n<400;n++){const s=await p.evaluate(()=>({run:__mojo.state().running,line:__mojo.state().boLine}));if(/^Langkah 1: /.test(s.line))narrated=true;if(!s.run&&/giliranmu/.test(s.line))break;await sleep(80)}
   assert.ok(narrated,id+':'+bi+' the demo names each step');
   const st=await p.evaluate(()=>__mojo.state());assert.equal(st.beat,bi,id+':'+bi+' the demo does not complete the beat for the child');assert.deepEqual(st.prog,sol,id+':'+bi+' the strip holds the plan');assert.equal(st.shown,true);
   await tap('#btn-run');await idle();
  }
  await p.waitForSelector('#ov-card.on #res-map');
  assert.equal(await p.$$eval('#res-stars i.on',e=>e.length),1,id+' a mission finished after the demo earns one star');
  assert.match(await p.$eval('#ov-card',e=>e.textContent),/bersama Bo/);
 }
 await p.screenshot({path:out+'/show-me-result.png'});console.log('Tunjukkan Caranya: every beat of every level filled, narrated, run by the child, 1 star PASS');
 // ── event questions: drawn, counted, about this level (owner 2026-10-03, m6 photo) ──
 let asked=0;
 for(const id of await p.evaluate(()=>__mojo.levels())){
  for(const evs of [[{e:'collect',res:'bolts'}],[{e:'bump',reason:'object'}],[{e:'ended'}]]){
   await start(id);await p.evaluate(()=>{const real=window.__qaReal||(window.__qaReal=performance.now.bind(performance));window.__qaShift=(window.__qaShift||0)+130000;performance.now=()=>real()+window.__qaShift});
   const ok=await p.evaluate(e=>__mojo.eventQuestion(()=>{},e),evs);if(!ok)continue;asked++;
   const q=await p.evaluate(()=>({mg:__mojo.mg(),themes:__mojo.themes(),imgs:document.querySelectorAll('#ov-mg.on #eq-scene img').length,why:document.querySelector('#ov-mg.on .eq-why').textContent,sizes:[...document.querySelectorAll('#ov-mg.on [data-answer]')].map(b=>Math.min(b.offsetWidth,b.offsetHeight))}));
   if(/berapa/.test(q.mg.prompt))assert.ok(q.imgs>=1&&String(q.imgs)===q.mg.answer,id+' a counting question draws exactly its answer: '+q.imgs+' vs '+q.mg.answer);
   assert.ok(q.themes.includes(q.mg.noun),id+' asks only about things in the level: '+q.mg.noun+' / '+q.themes.join(','));
   assert.ok(/Jawab dulu untuk bonus/.test(q.why),id+' the moment is explained: '+q.why);
   assert.ok(q.sizes.every(s=>s>=56),id+' answers keep 56px targets '+q.sizes);
   if(evs[0].e==='collect'&&q.themes.includes('baut'))assert.equal(q.mg.noun,'baut',id+' a bolt pickup asks about bolts');
   await tap('#event-skip');
  }
 }
 assert.ok(asked>=20,'event questions checked: '+asked);await p.evaluate(()=>{if(window.__qaReal)performance.now=window.__qaReal});
 console.log('Event questions: '+asked+' drawn scenes, nouns from the level, moment explained, 56px answers PASS');
 // ── everything open (owner decision 2026-10-06): no locked tile anywhere; stars still recorded ──
 {
  const q=await browser.newPage();await q.setViewport({width:1280,height:800});
  await q.goto('http://localhost:8081/games/mojo-swoptops.html',{waitUntil:'networkidle0'});await q.waitForFunction(()=>window.__mojo?.ready);
  await q.evaluate(()=>avatarScopedRemove('dunia-g31-mojo'));await q.reload({waitUntil:'networkidle0'});await q.waitForFunction(()=>window.__mojo?.ready);await sleep(400);
  const open=async id=>{await q.evaluate(id=>__mojo.map(id),id);await sleep(200);return q.$$eval('.lvl',bs=>bs.map(b=>b.classList.contains('lock')?0:1).join(''))};
  assert.equal(await open('kota'),'111111111111','a fresh save opens every Kota Pusat level');
  for(const r of await q.evaluate(()=>MojoLevels.REGIONS.map(r=>r.id)))assert.ok(!(await open(r)).includes('0'),r+': every level open on a fresh save');
  const qt=async s=>{if(s==='#bo-details'&&!(await q.$eval('#bo',e=>e.classList.contains('open')))){await (await q.$(s)).click();await sleep(60)}const e=await q.$(s);await e.click();await sleep(60)};
  await open('kota');await qt('[data-level="s1"]');assert.equal(await q.evaluate(()=>__mojo.state()?.id),'s1','tapping any tile starts it (no "Selesaikan" toast)');
  // a map toast never shows during play
  await q.evaluate(()=>__mojo.home());await (await q.$('#btn-levels')).click();await sleep(200);
  assert.equal(await q.$('.region.locked'),null,'no locked region card');
  // finish t1 the "show me" way: one star, shown on its tile
  await q.evaluate(()=>__mojo.start('t1'));await qt('#in-go');if(await q.$('#ov-card.on #picker-later'))await qt('#picker-later');
  await qt('#bo-details');await qt('#bo-show');await q.waitForFunction(()=>!__mojo.state().running&&/giliranmu/.test(__mojo.state().boLine),{timeout:30000});
  await qt('#btn-run');await q.waitForSelector('#ov-card.on #res-map',{timeout:30000});
  assert.equal(await q.evaluate(()=>__mojo.save().lv.t1.stars),1);
  await open('kota');assert.ok(await q.$eval('[data-level="t1"]',b=>b.classList.contains('done')),'the finished tile shows as done with its star');
  await q.screenshot({path:out+'/all-open.png'});await q.evaluate(()=>avatarScopedRemove('dunia-g31-mojo'));await q.close();
  console.log('Everything open from the start; any tile starts; stars still recorded PASS');
 }
 assert.equal(errors.length,0,errors.join('\n'));
}finally{await browser.close()}
