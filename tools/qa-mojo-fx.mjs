// G31 Mojo Swoptops board VFX gate (games/mojo-fx.js, owner 2026-10-03): every action shows its effect, effects
// clean up, Berhenti clears them, reduced motion only fades, at most 6 live, art is warmed for offline, and a busy
// beat stays smooth at 4x CPU.   node tools/qa-mojo-fx.mjs   (needs the dev server on :8081)
import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
const URL='http://localhost:8081/games/mojo-swoptops.html?unlock=1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
const errors=[];let passed=0;const ok=(c,m)=>{assert.ok(c,m);passed++};
async function page(w,h,{reduced=false}={}){
  const ctx=await browser.createBrowserContext();const p=await ctx.newPage();p._ctx=ctx;
  await p.setViewport({width:w,height:h,isMobile:true,hasTouch:true,deviceScaleFactor:1});
  if(reduced)await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto(URL,{waitUntil:'networkidle0'});await p.waitForFunction(()=>window.__mojo&&__mojo.ready&&window.MojoFX);await sleep(400);
  // record every effect call (name, time, live count) without changing it
  await p.evaluate(()=>{window.__fx=[];['move','bump','swop','swopLock','topOff','pickup','tool','lift','spray','push','fill','jump','rescue','repair','goal','beat','confetti'].forEach(k=>{const f=MojoFX[k];MojoFX[k]=function(){__fx.push({k,t:performance.now()});return f.apply(this,arguments)}})});
  return p}
async function intro(p){if(await p.$('#ov-card.on #in-go')){await p.click('#in-go');await sleep(150);if(await p.$('#ov-card.on #picker-later'))await p.click('#picker-later')}await sleep(100)}
async function help(p){
  await p.evaluate(()=>{const s=document.querySelector('#ov-swop.on');if(s)s.click()});
  const mg=await p.evaluate(()=>__mojo.mg());if(!mg)return;
  if(mg.kind==='letters'){for(const c of mg.answer)await p.evaluate(c=>{const t=document.querySelector(`#ov-mg.on .tile[data-l="${c}"]:not(.used)`);if(t)t.click()},c);await sleep(500);await p.evaluate(()=>{const b=document.getElementById('mg-ok');if(b)b.click()})}
  else if(mg.kind==='height')await p.evaluate(a=>{const b=document.querySelector(`#ov-mg.on [data-v="${a}"]`);if(b)b.click()},mg.answer);
  else if(mg.kind==='event')await p.evaluate(()=>{const b=document.getElementById('event-skip');if(b)b.click()});
  await sleep(300)}
async function playLevel(p,id){
  await p.evaluate(id=>__mojo.start(id),id);await sleep(300);
  for(let g=0;g<900;g++){
    await intro(p);await help(p);
    if(await p.$('#ov-card.on #res-map'))return true;
    const st=await p.evaluate(()=>__mojo.state());
    if(st&&!st.running&&!st.trans&&!(await p.$('.overlay.on'))&&!(await p.$('#btn-run[disabled]'))){
      await p.evaluate(sol=>{if(__mojo.state().prog.length){document.getElementById('btn-clear').click();document.getElementById('cl-yes').click()}for(const c of sol)document.querySelector(`#palette [data-cmd="${c}"]`).click();document.getElementById('btn-run').click()},await p.evaluate(()=>__mojo.solution()))}
    await sleep(120)}
  return false}
const liveNodes=p=>p.evaluate(()=>document.querySelectorAll('#board .mfx').length);

// ── 1. every action shows its own effect, and it cleans up ──
{const p=await page(1280,800);const want={m2:['move','pickup','spray'],m7:['swop','swopLock','topOff','push','fill','spray','rescue'],s1:['jump','repair','tool','pickup','lift','beat','spray'],m6:['lift','repair'],t1:['goal']};
 for(const [id,names] of Object.entries(want)){
  await p.evaluate(()=>{__fx=[]});ok(await playLevel(p,id),id+' finished');
  const got=new Set(await p.evaluate(()=>__fx.map(x=>x.k)));
  for(const n of names)ok(got.has(n),id+': the "'+n+'" effect played (got '+[...got].join(',')+')');
  ok(got.has('confetti'),id+': the result card throws the owner confetti');
  await sleep(1600);ok(await liveNodes(p)===0&&await p.evaluate(()=>MojoFX.names().filter(n=>n!=='confetti').length)===0,id+': every board effect is gone 1.5 s after the last one');
  ok(await p.evaluate(()=>[...document.querySelectorAll('#board .mfx')].every(e=>!e.textContent||/^(\+jalan|Selamat!|\d+)$/.test(e.textContent))),id+': effect text is words or numbers, never emoji');
  await p.click('#res-map').catch(()=>{});await sleep(300)}
 console.log('effects per action PASS');
 // ── 2. the cap ──
 await p.evaluate(()=>__mojo.start('m2'));await sleep(300);await intro(p);
 const peak=await p.evaluate(()=>{let m=0;for(let k=0;k<12;k++){MojoFX.pickup(1,1);m=Math.max(m,MojoFX.live())}return m});
 ok(peak<=6,'at most 6 effects alive at once ('+peak+')');
 // ── 3. Berhenti clears every effect and its timers; the idle item loops keep running ──
 await sleep(1600);const idle0=await p.evaluate(()=>[...document.querySelectorAll('.ob.pickup img,.ob.fire img')].map(e=>e.getAnimations().length));
 await p.evaluate(sol=>{for(const c of sol)document.querySelector(`#palette [data-cmd="${c}"]`).click();document.getElementById('btn-run').click()},await p.evaluate(()=>__mojo.solution()));
 for(let i=0;i<60&&!(await liveNodes(p));i++)await sleep(50);ok(await liveNodes(p)>0,'an effect is on the board mid-run');
 await sleep(400);await p.click('#btn-run');await sleep(50);
 ok(await liveNodes(p)===0&&await p.evaluate(()=>MojoFX.live())===0,'Berhenti clears every effect at once');
 await sleep(1500);ok(await liveNodes(p)===0,'no effect comes back after Berhenti (timers cleared)');
 const idle1=await p.evaluate(()=>[...document.querySelectorAll('.ob.pickup img,.ob.fire img')].map(e=>e.getAnimations().filter(a=>a.playState==='running').length));
 ok(JSON.stringify(idle0)===JSON.stringify(idle1),'idle item animations survive Berhenti');
 // ── 4. offline: every effect picture is warmed into the cache ──
 await p.waitForFunction(()=>__mojo.assets().ready||__mojo.assets().failed.length,{timeout:60000});
 const files=await p.evaluate(()=>MojoFX.files());const warm=new Set(await p.evaluate(()=>__mojo.warm()));
 ok(files.length>=40&&files.every(f=>warm.has(f)),'every effect picture is in the warm list ('+files.length+')');
 ok(await p.evaluate(()=>__mojo.assets().failed.length)===0,'every warmed picture loaded');
 const cached=await p.evaluate(async fs=>{let n=0;for(const f of fs)if(await caches.match(new URL(f,location.href).href,{ignoreSearch:true}))n++;return n},files);
 ok(cached===files.length,'every effect picture is in the offline cache ('+cached+'/'+files.length+')');
 await p._ctx.close()}
console.log('cap / Berhenti / offline PASS');

// ── 5. reduced motion: effects still say what happened, but only fade (no movement, shake or frame loops) ──
{const p=await page(1280,800,{reduced:true});ok(await p.evaluate(()=>MojoFX.reduced()),'reduced motion detected');
 await p.evaluate(()=>{window.__moving=[];const scan=()=>{for(const a of document.getAnimations()){const t=a.effect&&a.effect.target;if(!t||!t.closest||!t.closest('#board'))continue;if(!t.classList.contains('mfx')&&t.id!=='board')continue;if(a.effect.getKeyframes().some(k=>k.transform&&k.transform!=='none'))__moving.push(t.className||t.id)}};setInterval(scan,40)});
 ok(await playLevel(p,'m7'),'m7 finished with reduced motion');ok((await p.evaluate(()=>__fx.length))>5,'effects still mark each action');
 ok((await p.evaluate(()=>__moving.length))===0,'reduced motion: no effect moves or shakes ('+(await p.evaluate(()=>__moving.slice(0,3).join(',')))+')');
 await p._ctx.close()}
console.log('reduced motion PASS');

// ── 6. a busy beat stays smooth: median frame <= 20 ms at 1280x800 with 4x CPU ──
{const p=await page(1280,800);const cdp=await p.target().createCDPSession();
 await p.evaluate(()=>__mojo.start('s1'));await sleep(400);await intro(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 await p.evaluate(()=>{window.__ft=[];let last=performance.now();const f=t=>{__ft.push(t-last);last=t;if(__ft.length<4000)requestAnimationFrame(f)};requestAnimationFrame(f)});
 await p.evaluate(sol=>{for(const c of sol)document.querySelector(`#palette [data-cmd="${c}"]`).click();document.getElementById('btn-run').click()},await p.evaluate(()=>__mojo.solution()));
 for(let i=0;i<300;i++){await help(p);if(!(await p.evaluate(()=>__mojo.state().running))&&i>5)break;await sleep(100)}
 const r=await p.evaluate(()=>{const a=__ft.slice(2).sort((x,y)=>x-y);return{n:a.length,med:a[a.length>>1],p95:a[Math.floor(a.length*.95)],fx:__fx.length}});
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});globalThis.__perf=r;
 ok(r.fx>=6&&r.med<=20,'busy s1 beat at 4x CPU: median frame '+r.med.toFixed(1)+' ms (p95 '+r.p95.toFixed(1)+', '+r.fx+' effects)');
 await p._ctx.close()}
console.log('performance PASS',JSON.stringify(globalThis.__perf||''));

await browser.close();
assert.deepEqual(errors,[],'page errors: '+errors.join(' | '));
console.log('qa-mojo-fx: '+passed+' checks PASS');
