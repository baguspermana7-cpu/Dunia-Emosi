import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const out='/tmp/mojo-interactions';fs.mkdirSync(out,{recursive:true});
const p=await browser.newPage();await p.setViewport({width:1280,height:800});
const errors=[];p.on('pageerror',e=>errors.push(e.message));
async function tap(s){const e=await p.$(s);assert.ok(e,s);await e.evaluate(e=>e.scrollIntoView({block:'nearest',inline:'nearest'}));await e.click();await sleep(40)}
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
 assert.equal(errors.length,0,errors.join('\n'));
}finally{await browser.close()}
