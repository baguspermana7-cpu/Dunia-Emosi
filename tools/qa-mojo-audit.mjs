// G31 Mojo Swoptops: regression gate for the 2026-10-03 audit findings (H1 M1 M2 M3 M4 M5 L1 L3 L4 L5 L6 C3).
// Needs the dev server on :8081.  node tools/qa-mojo-audit.mjs   (screens in /tmp/mojo-audit-gate)
import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const URL='http://localhost:8081/games/mojo-swoptops.html';
const out='/tmp/mojo-audit-gate';fs.mkdirSync(out,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
const errors=[];let passed=0;
function ok(cond,msg){assert.ok(cond,msg);passed++}
async function page(w,h,{ctx,query='?unlock=1'}={}){
  const p=await (ctx||browser.defaultBrowserContext()).newPage();
  await p.setViewport({width:w,height:h,isMobile:true,hasTouch:true,deviceScaleFactor:1});
  p.on('pageerror',e=>errors.push(w+'x'+h+' '+e.message));
  await p.goto(URL+query,{waitUntil:'networkidle0'});await p.waitForFunction(()=>window.__mojo&&__mojo.ready);await sleep(500);
  return p}
async function tap(p,s){const e=typeof s==='string'?await p.$(s):s;assert.ok(e,'missing '+s);await e.evaluate(e=>e.scrollIntoView({block:'nearest',inline:'nearest'}));const r=await e.boundingBox();await p.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);await sleep(90)}
async function intro(p){if(await p.$('#ov-card.on #in-go')){await tap(p,'#in-go');await sleep(120);if(await p.$('#ov-card.on #picker-later'))await tap(p,'#picker-later')}}
async function begin(p,id){await p.evaluate(id=>__mojo.start(id),id);await sleep(300);await intro(p);await sleep(150)}
async function program(p,sol){if(await p.evaluate(()=>__mojo.state().prog.length)){await tap(p,'#btn-clear');await tap(p,'#cl-yes')}for(const c of sol)await p.evaluate(c=>document.querySelector(`#palette [data-cmd="${c}"]`).click(),c)}
async function skipSwop(p){if(await p.$('#ov-swop.on'))await p.evaluate(()=>document.getElementById('ov-swop').click())}
// a button is usable without scrolling: inside the viewport and the topmost element at its centre
const onScreen=(p,sel)=>p.evaluate(sel=>{const e=document.querySelector(sel);if(!e)return'missing';const r=e.getBoundingClientRect();if(r.top<-1||r.left<-1||r.bottom>innerHeight+1||r.right>innerWidth+1)return'off '+[r.top|0,r.bottom|0];const t=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return t&&(e===t||e.contains(t))?'ok':'covered by '+(t&&(t.id||t.className))},sel);
async function eventCard(p){ // force the count question: the gate opens after its two-minute gap
  await begin(p,'m2');await program(p,['up']);
  await p.evaluate(()=>{const n=performance.now.bind(performance);window.__nc=n;performance.now=()=>n()+130000});
  await tap(p,'#btn-run');for(let i=0;i<40&&!(await p.evaluate(()=>__mojo.mg()?.kind==='event'));i++)await sleep(150);
  await p.evaluate(()=>{performance.now=window.__nc});await sleep(350)}
async function heightCard(p){
  await begin(p,'m6');await program(p,await p.evaluate(()=>__mojo.solution()));await tap(p,'#btn-run');
  for(let i=0;i<120&&!(await p.evaluate(()=>__mojo.mg()?.kind==='height'));i++){await skipSwop(p);await sleep(150)}await sleep(400)}

// ── H1: every card's primary action is on screen without scrolling (phone landscape and the tablet) ──
for(const [w,h] of [[844,390],[740,360],[1280,800]]){
  const tag=w+'x'+h,p=await page(w,h);
  for(const id of await p.evaluate(()=>__mojo.levels())){await p.evaluate(id=>__mojo.start(id),id);await sleep(320);ok((await onScreen(p,'#ov-card.on #in-go'))==='ok',tag+' '+id+' intro "Ayo Rencanakan!" on screen: '+await onScreen(p,'#ov-card.on #in-go'))}
  await p.screenshot({path:`${out}/h1-${tag}-intro.png`});
  await eventCard(p);ok(await p.evaluate(()=>__mojo.mg()?.kind==='event'),tag+' event question opened');
  ok((await onScreen(p,'#event-skip'))==='ok',tag+' event "Lanjutkan Misi" on screen: '+await onScreen(p,'#event-skip'));
  for(const b of await p.$$eval('#ov-mg.on [data-answer]',x=>x.map(e=>e.getAttribute('data-answer'))))ok((await onScreen(p,`#ov-mg.on [data-answer="${b}"]`))==='ok',tag+' event answer '+b+' on screen');
  await p.screenshot({path:`${out}/h1-${tag}-event.png`});await tap(p,'#event-skip');
  await heightCard(p);ok(await p.evaluate(()=>__mojo.mg()?.kind==='height'),tag+' height microgame opened');
  for(const v of await p.$$eval('#ov-mg.on [data-v]',x=>x.map(e=>e.dataset.v)))ok((await onScreen(p,`#ov-mg.on [data-v="${v}"]`))==='ok',tag+' height answer '+v+' on screen: '+await onScreen(p,`#ov-mg.on [data-v="${v}"]`));
  await p.screenshot({path:`${out}/h1-${tag}-height.png`});await p.close()}
console.log('H1 card actions on screen at 844x390 / 740x360 / 1280x800 PASS');

// ── M2: plan chips show whole words (no ellipsis, nothing cut), >= 12 px on phones, >= 13 px on the tablet ──
for(const [w,h,min] of [[1280,800,13],[390,844,12],[844,390,12]]){
  const tag=w+'x'+h,p=await page(w,h);const seen=new Set();
  for(const id of await p.evaluate(()=>__mojo.levels())){
    await begin(p,id);const all=await p.$$eval('#palette [data-cmd]',b=>b.map(x=>x.dataset.cmd));const slots=await p.$$eval('.slot',s=>s.length);
    const cmds=all.filter(c=>c.startsWith('swop:')).concat(all.filter(c=>!c.startsWith('swop:')));
    for(const c of cmds.slice(0,slots))await p.evaluate(c=>document.querySelector(`#palette [data-cmd="${c}"]`)?.click(),c);
    for(const x of await p.$$eval('.slot .chip',cs=>cs.map(c=>{const s=c.querySelector(':scope>span'),cr=c.getBoundingClientRect(),sr=s.getBoundingClientRect(),st=getComputedStyle(s);return{t:s.textContent,fs:parseFloat(st.fontSize),ell:st.textOverflow,fit:sr.left>=cr.left-.5&&sr.right<=cr.right+.5&&s.scrollWidth<=Math.ceil(sr.width)+1}}))){
      seen.add(x.t);ok(x.fit&&x.ell!=='ellipsis',tag+' chip "'+x.t+'" whole');ok(x.fs>=min,tag+' chip "'+x.t+'" font '+x.fs+' >= '+min);ok(!/…|\.\.\./.test(x.t)&&!/^Jadi /.test(x.t),tag+' chip "'+x.t+'" is the short whole word')}
  }
  ok(['Pemadam','Keranjang','Semprot','Perbaiki'].every(t=>seen.has(t)),tag+' the long labels were checked: '+[...seen].join(','));
  await p.close()}
console.log('M2 plan chips: whole words, never ellipsized PASS');

// ── M3 Cara Main on a phone, L1 the 1024 header, L5 hint text in the bubble ──
{const p=await page(390,844);await begin(p,'t2');await tap(p,'#btn-rule');await sleep(400);
 const r=await p.evaluate(()=>{const c=document.querySelector('#rule-card .rule-panels'),b=c.getBoundingClientRect();return{over:c.scrollWidth-c.clientWidth,out:[...c.children].some(e=>{const r=e.getBoundingClientRect();return r.right>b.right+1||r.left<b.left-1})}});
 ok(r.over<=0&&!r.out,'M3 390x844 Cara Main panels stay inside the card '+JSON.stringify(r));await p.screenshot({path:`${out}/m3-rule-390.png`});await p.close()}
{const p=await page(1024,768);await begin(p,'s1');
 const r=await p.evaluate(()=>{const t=document.getElementById('p-title'),o=document.getElementById('p-objs').getBoundingClientRect();return{tclip:t.scrollHeight>t.clientHeight+1||t.scrollWidth>t.clientWidth+1,chips:[...document.querySelectorAll('#p-objs .ob-chip')].map(c=>{const r=c.getBoundingClientRect(),s=c.querySelector(':scope>span');return r.right<=o.right+1&&s.scrollWidth<=s.clientWidth+1})}});
 ok(!r.tclip,'L1 1024x768 mission title shown whole');ok(r.chips.length&&r.chips.every(Boolean),'L1 1024x768 objective chip shown whole');
 for(let k=1;k<=4;k++){await tap(p,'#btn-hint');await sleep(250);
  const b=await p.evaluate(()=>{const s=__mojo.state(),t=document.getElementById('bo-text'),task=document.getElementById('bo-task');return{full:t.textContent===s.hintText,task:task.getBoundingClientRect().height>0}});
  ok(b.full,'L5 hint rung '+k+' shows its whole text in the bubble');ok(!b.task,'L5 hint rung '+k+': the bubble does not repeat the objective')}
 await p.screenshot({path:`${out}/l1-l5-1024.png`});await p.close()}
console.log('M3 / L1 / L5 PASS');

// ── M1 double tap, M4 idle animations survive Berhenti, L4 a stopped demo, M5 start() time ──
{const p=await page(1280,800);
 await begin(p,'m2');const n0=await p.evaluate(()=>[...document.querySelectorAll('.ob.pickup img,.ob.fire img')].map(e=>e.getAnimations().length));
 await program(p,['up']);await tap(p,'#btn-run');await sleep(700);await tap(p,'#btn-run');await sleep(1200);
 ok(!await p.evaluate(()=>__mojo.state().running),'M4 the run stopped');
 const n1=await p.evaluate(()=>[...document.querySelectorAll('.ob.pickup img,.ob.fire img')].map(e=>e.getAnimations().filter(a=>a.playState==='running').length));
 ok(n0.some(Boolean)&&JSON.stringify(n0)===JSON.stringify(n1),'M4 idle animations alive after Berhenti '+JSON.stringify([n0,n1]));
 await begin(p,'t2');await program(p,await p.evaluate(()=>__mojo.solution()));const r=await (await p.$('#btn-run')).boundingBox();
 for(const gap of [40,120,200]){await p.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);await sleep(gap);await p.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);await sleep(60);
  ok(await p.evaluate(()=>__mojo.state().running),'M1 a double tap '+gap+' ms apart keeps the run going');await sleep(400);await tap(p,'#btn-run');await sleep(300);ok(!await p.evaluate(()=>__mojo.state().running),'M1 a later tap still stops it');}
 await begin(p,'t5');for(let k=0;k<4;k++)await tap(p,'#btn-hint');await tap(p,'#btn-show');await sleep(400);await tap(p,'#btn-run');await sleep(300);
 ok(await p.evaluate(()=>__mojo.state().shown)===false,'L4 a demo stopped before its first step does not cap the stars');
 await program(p,await p.evaluate(()=>__mojo.solution()));await tap(p,'#btn-run');await p.waitForSelector('#ov-card.on #res-map',{timeout:20000});
 ok(!/bersama Bo/.test(await p.$eval('#ov-card',e=>e.textContent)),'L4 the result is not the "with Bo" one-star card');
 const t=[];for(const id of ['t7','s1','m6','m8']){await p.evaluate(()=>__mojo.home());await sleep(300);t.push(await p.evaluate(id=>{const a=performance.now();__mojo.start(id);return performance.now()-a},id))}
 ok(Math.max(...t)<50,'M5 start() main-thread time < 50 ms: '+t.map(x=>x.toFixed(1)).join(' '));
 // L6: the rock and the fire are drawn from art at least twice the old tile size
 await begin(p,'m7');const art=await p.evaluate(()=>[...document.querySelectorAll('.ob.rock img.main,.ob.fire img.main')].map(i=>Math.max(i.naturalWidth,i.naturalHeight)));
 ok(art.length>=2&&art.every(n=>n>=120),'L6 rock and fire art is sharp at board size '+art.join(','));
 await p.close()}
console.log('M1 / M4 / L4 / M5 / L6 PASS');

// ── L3: Peta works during the Swop showcase (a first-ever Swop needs a fresh profile), and a tap skips it ──
for(const how of ['peta','skip']){
  const ctx=await browser.createBrowserContext();const p=await page(1280,800,{ctx});
  await begin(p,'t4');await program(p,await p.evaluate(()=>__mojo.solution()));await tap(p,'#btn-run');
  for(let i=0;i<40&&!(await p.$('#ov-swop.on'));i++)await sleep(100);ok(!!await p.$('#ov-swop.on'),'L3 the showcase opened');await sleep(300);
  if(how==='peta'){ok((await onScreen(p,'#btn-quit'))==='ok','L3 Peta is tappable during the showcase: '+await onScreen(p,'#btn-quit'));await tap(p,'#btn-quit');await sleep(400);
   ok(await p.evaluate(()=>document.body.dataset.scr)==='scr-regions','L3 Peta leaves to the map');ok(await p.evaluate(()=>{const o=document.getElementById('ov-swop');return!o.classList.contains('on')&&!o.firstChild}),'L3 the showcase is cancelled cleanly');
   await sleep(3200);ok(await p.evaluate(()=>document.body.dataset.scr==='scr-regions'&&!document.querySelector('.overlay.on')),'L3 nothing of the run comes back after leaving')}
  else{const sw=await p.$('#ov-swop.on .sw-stage');await tap(p,sw);await sleep(300);ok(!await p.$('#ov-swop.on'),'L3 a tap on the showcase skips it');
   await p.waitForSelector('#ov-card.on #res-map',{timeout:20000});ok(true,'L3 the run finishes after a skipped showcase')}
  await ctx.close()}
console.log('L3 showcase: Peta reachable, tap to skip PASS');

// ── C3: leaving the story chase still ends the mission with its result card (stars are saved when the grid part ends) ──
{const ctx=await browser.createBrowserContext();const p=await page(1280,800,{ctx,query:'?unlock=1&chase=1'});
 await begin(p,'m1');await program(p,await p.evaluate(()=>__mojo.solution()));await tap(p,'#btn-run');
 for(let i=0;i<80&&!(await p.$('#chase-host'));i++)await sleep(150);ok(!!await p.$('#chase-host'),'C3 the story chase opened');
 ok(await p.evaluate(()=>(__mojo.save().lv.m1||{}).stars>=1),'C3 the stars are already safe while the chase runs');
 await sleep(1200);if(await p.$('.mcp-go'))await tap(p,'.mcp-go');else if(await p.$('#mc-go'))await tap(p,'#mc-go');for(let i=0;i<60&&(await p.evaluate(()=>{const s=window.__mojoChase&&__mojoChase.state&&__mojoChase.state();return s?s.state:''}))!=='active';i++){if(await p.$('.mc-skip.on'))await tap(p,'.mc-skip.on').catch(()=>{});await sleep(250)}
 const pause=await p.$('#chase-host .mc-pause');ok(!!pause,'C3 the chase has its pause button');await tap(p,pause);await sleep(500);await tap(p,'#mc-exit');
 await p.waitForSelector('#ov-card.on #res-map',{timeout:8000});ok(true,'C3 leaving the chase shows the result card');
 ok(await p.evaluate(()=>(__mojo.save().lv.m1||{}).stars>=1),'C3 the grid stars are saved');ok(!await p.$('#chase-host'),'C3 the chase is gone');
 await p.screenshot({path:`${out}/c3-exit-result.png`});await ctx.close()}
console.log('C3 chase exit keeps the result card PASS');

await browser.close();
assert.deepEqual(errors,[],'page errors: '+errors.join(' | '));
console.log('qa-mojo-audit: '+passed+' checks PASS');
