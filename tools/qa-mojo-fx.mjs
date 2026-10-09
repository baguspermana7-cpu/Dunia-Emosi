// G31 Mojo Swoptops board VFX gate (games/mojo-fx.js, owner 2026-10-03): every action shows its effect, effects
// clean up, Berhenti clears them, reduced motion only fades, at most 6 live, art is warmed for offline, and a busy
// beat stays smooth at 4x CPU; the m3 rescue is staged on the real perch (ladder, hop, ride, retract, cancel).   node tools/qa-mojo-fx.mjs   (needs the dev server on :8081)
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

// ── 7. polish: idle life, palette ripple, running chip glow, check pop, bubble spring, screen slide, extras ──
{const p=await page(1280,800);
 const anims=(sel,name)=>p.evaluate((sel,name)=>[...document.querySelectorAll(sel)].some(e=>e.getAnimations().some(a=>a.animationName===name&&a.playState==='running')),sel,name);
 const pseudo=name=>p.evaluate(name=>document.getAnimations().some(a=>a.animationName===name),name);
 await p.evaluate(()=>__mojo.start('t1'));await sleep(300);await intro(p);
 ok(await anims('#mojo .mj-rot','mjBreathe'),'Mojo breathes while idle');ok(await anims('.ob.flag img.main','flagWave'),'the flag waves');ok(await anims('.dec img','treeSway'),'the trees sway');
 const slide=await p.evaluate(()=>{__mojo.home();const a=document.querySelector('.scr.active').getAnimations().find(x=>x.animationName==='scrSlide');return a&&a.effect.getTiming().duration});
 ok(slide===200,'screens change with a 200 ms slide ('+slide+')');
 await p.evaluate(()=>__mojo.start('t2'));await sleep(300);await intro(p);
 const cmd=await p.$('#palette [data-cmd]');const r=await cmd.boundingBox();await p.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);await sleep(30);
 ok(await p.evaluate(()=>{const w=document.querySelector('.cmd-rip>i');return!!w&&w.getAnimations().length>0}),'a palette press ripples');
 await p.evaluate(()=>document.getElementById('btn-hint').click());await sleep(50);ok(await pseudo('bubSpringA')||await pseudo('bubSpringB'),'Bo\'s bubble springs in with a new line');
 await p.evaluate(sol=>{document.getElementById('btn-clear').click();document.getElementById('cl-yes').click();for(const c of sol)document.querySelector(`#palette [data-cmd="${c}"]`).click();document.getElementById('btn-run').click()},await p.evaluate(()=>__mojo.solution()));
 let glow=false,check=false;for(let i=0;i<60&&!(glow&&check);i++){glow=glow||await pseudo('chipGlow');check=check||await pseudo('checkPop');await sleep(60)}
 ok(glow,'the running chip glows');ok(check,'a finished step pops its check');
 // event question: the right answer bursts and a bolt flies to the line that says so
 await p.evaluate(()=>__mojo.start('m2'));await sleep(300);await intro(p);
 await p.evaluate(()=>{document.querySelector('#palette [data-cmd="up"]').click();const n=performance.now.bind(performance);window.__nc=n;performance.now=()=>n()+130000;document.getElementById('btn-run').click()});
 for(let i=0;i<40&&!(await p.evaluate(()=>__mojo.mg()?.kind==='event'));i++)await sleep(150);await p.evaluate(()=>{performance.now=window.__nc});
 await p.evaluate(()=>{const a=__mojo.mg().answer;const b=[...document.querySelectorAll('#ov-mg.on [data-answer]')].find(x=>x.textContent===String(a));b.click()});await sleep(200);
 ok(await p.evaluate(()=>[...document.querySelectorAll('.fly img')].map(i=>i.getAttribute('src')).some(s=>/mojo-fx\/collect/.test(s))&&[...document.querySelectorAll('.fly img')].some(i=>/bolt/.test(i.getAttribute('src')))),'event question: a collect burst and a bolt fly-in');
 await p.evaluate(()=>document.getElementById('event-skip').click());await sleep(300);
 // Belajar: a solved word bursts with the owner sparkle; the reward card gets the level-up badge and confetti
 await p.evaluate(()=>__mojo.home());await sleep(300);await p.evaluate(()=>document.getElementById('btn-learn').click());await sleep(500);
 for(let r=0;r<5;r++){const st=await p.evaluate(()=>MojoLearn.state());
  if(st.kind==='susun'){for(const ch of st.word.slice(await p.$$eval('#learn-slots .lslot.fixed',a=>a.length)))await p.evaluate(ch=>{const t=[...document.querySelectorAll('#learn-tiles .ltile')].find(t=>!t.disabled&&t.dataset.l===ch);t.click()},ch)}
  else await p.evaluate(()=>document.querySelector('#learn-opts .lopt[data-ok="1"]').click());
  await sleep(120);if(r===0)ok(await p.evaluate(()=>!!document.querySelector('.learn-pic .lfx')),'Belajar: a solved word bursts with the owner sparkle');
  await sleep(300);await p.evaluate(()=>document.getElementById('learn-next').click());await sleep(300)}
 await sleep(250);ok(await p.evaluate(()=>!!document.querySelector('.learn-stars .lfx')&&MojoFX.names().includes('confetti')),'Belajar reward: level-up badge and owner confetti');
 await p._ctx.close()}
{const p=await page(1280,800,{reduced:true});await p.evaluate(()=>__mojo.start('t1'));await sleep(300);await intro(p);
 ok(await p.evaluate(()=>!document.getAnimations().some(a=>['mjBreathe','flagWave','treeSway','chipGlow'].includes(a.animationName))),'reduced motion: no idle loops');await p._ctx.close()}
console.log('polish PASS');

// ── 8. rescue staging (plan §5, m3 at 1280x800): the NAIK ladder reaches the cat's real perch on the tall tree,
//    the cat hops into Mojo's basket and rides there (purr on landing), TURUN retracts the ladder, and Berhenti
//    mid-rescue removes every staged node and puts the cat back on its branch ──
{const p=await page(1280,800);
 const go=async prog=>{await p.evaluate(()=>__mojo.start('m3'));await sleep(300);await intro(p);await p.evaluate(()=>{__fx=[];MojoBoardLook.log.length=0});
  await p.evaluate(prog=>{if(__mojo.state().prog.length){document.getElementById('btn-clear').click();document.getElementById('cl-yes').click()}for(const c of prog)document.querySelector(`#palette [data-cmd="${c}"]`).click();document.getElementById('btn-run').click()},prog||await p.evaluate(()=>__mojo.solution()))};
 const until=async(fn,ms=15000)=>{const t=Date.now();while(Date.now()-t<ms){await help(p);if(await p.evaluate(fn))return true;await sleep(40)}return false};
 const sol=await p.evaluate(()=>{__mojo.start('m3');return __mojo.solution()});ok(sol.includes('raise')&&sol.at(-1)==='rescue','m3 solution ends NAIK..TOLONG ('+sol.join(',')+')');
 await go(sol);
 ok(await until(()=>!!MojoFX.standing()),'after NAIK the ladder stays standing');
 const lad=await p.evaluate(()=>{const l=document.querySelector('#fx .mfx-lad'),fx=document.getElementById('fx').getBoundingClientRect(),a=l.getBoundingClientRect(),q=MojoBoardLook.perchPoint('kucing'),inner=l.firstChild.getBoundingClientRect();
   return{top:[a.left+a.width/2,Math.max(a.top,inner.top)],perch:[fx.left+q.x,fx.top+q.y],cellTop:fx.top,unit:MojoFX.standing().unit,cell:parseFloat(document.getElementById('board').style.getPropertyValue('--cell'))}});
 const dLad=Math.hypot(lad.top[0]-lad.perch[0],lad.top[1]-lad.perch[1]);
 ok(dLad<=12,'the NAIK ladder top reaches the cat\'s perch within 12 px ('+dLad.toFixed(1)+' px; top '+lad.top.map(v=>v|0)+' perch '+lad.perch.map(v=>v|0)+')');
 ok(lad.perch[1]<lad.cellTop&&lad.unit>lad.cell*0.3,'the perch is on the tall tree above the board and the rungs are spaced to reach it ('+(lad.unit/lad.cell).toFixed(2)+' cell/rung)');
 ok(await until(()=>__fx.some(x=>x.k==='rescue')),'TOLONG stages the rescue');
 ok(await p.evaluate(()=>{const r=document.querySelector('#fx .mfx-rider');const im=document.querySelector('.ob[data-id=kucing] img.main');return!!r&&im.style.visibility==='hidden'}),'the cat leaves its branch as a hopping sprite');
 await sleep(1000);
 const ride=await p.evaluate(()=>{const r=document.querySelector('#fx .mfx-rider'),m=document.getElementById('mojo').getBoundingClientRect();if(!r)return null;const b=r.getBoundingClientRect(),x=b.left+b.width/2,y=b.top+b.height/2;return{x,y,m:[m.left,m.top,m.right,m.bottom],inside:x>=m.left&&x<=m.right&&y>=m.top&&y<=m.bottom}});
 ok(ride&&ride.inside,'after the hop the cat rides inside Mojo\'s box ('+JSON.stringify(ride)+')');
 ok(await p.evaluate(()=>document.querySelector('.ob[data-id=kucing]').classList.contains('gone')&&MojoBoardLook.log.some(l=>l.v==='purr')),'the cat is rescued on landing and purrs');
 ok(await p.evaluate(()=>{const t=document.querySelector('.ob[data-id=kucing] img.perch');return!!t&&getComputedStyle(t).opacity>0.5}),'the tree stays on the board (only the cat hops)');
 for(let i=0;i<80&&!(await p.$('#ov-card.on #res-map'));i++){await help(p);await sleep(100)}
 await sleep(1700);ok(await liveNodes(p)===0&&!(await p.evaluate(()=>MojoFX.standing())),'after the level every staged node is gone');
 await p.click('#res-map').catch(()=>{});await sleep(300);
 // TURUN retracts the standing ladder back into Mojo
 await go(['east','up','up','swop:cherry','raise','lower']);
 ok(await until(()=>!!MojoFX.standing()),'NAIK stands the ladder (no rescue)');
 const h0=await p.evaluate(()=>{const l=document.querySelector('#fx .mfx-lad');return l.getBoundingClientRect().bottom-l.firstChild.getBoundingClientRect().top});
 ok(await until(()=>__fx.filter(x=>x.k==='lift').length>=2),'TURUN plays');await sleep(500);
 const h1=await p.evaluate(()=>{const l=document.querySelector('#fx .mfx-lad');return l?l.getBoundingClientRect().bottom-l.firstChild.getBoundingClientRect().top:0});
 ok(h1<h0-10,'TURUN pulls the ladder back down ('+h0.toFixed(0)+' -> '+h1.toFixed(0)+' px)');
 await sleep(1600);ok(await p.evaluate(()=>!document.querySelector('#fx .mfx-lad')&&!MojoFX.standing()),'the ladder is gone once Mojo is down');
 await until(()=>!__mojo.state().running,8000);
 // Berhenti mid-hop: nothing staged stays, the cat is back on its branch
 await go(sol);
 ok(await until(()=>__fx.some(x=>x.k==='rescue')),'rescue started (cancel case)');await sleep(350);
 await p.click('#btn-run');await sleep(80);
 const c=await p.evaluate(()=>{const im=document.querySelector('.ob[data-id=kucing] img.main');return{n:document.querySelectorAll('#board .mfx').length,live:MojoFX.live(),stand:MojoFX.standing(),vis:im.style.visibility,gone:im.closest('.ob').classList.contains('gone')}});
 ok(c.n===0&&c.live===0&&!c.stand,'Berhenti mid-rescue clears the ladder, rider and hearts ('+JSON.stringify(c)+')');
 ok(c.vis===''&&!c.gone,'Berhenti mid-rescue puts the cat back on its branch');
 await sleep(1500);ok(await liveNodes(p)===0,'nothing staged comes back after Berhenti');
 await p._ctx.close()}
{const p=await page(1280,800,{reduced:true});
 await p.evaluate(()=>{window.__moving=[];setInterval(()=>{for(const a of document.getAnimations()){const t=a.effect&&a.effect.target;if(t&&t.closest&&t.closest('#fx')&&a.effect.getKeyframes().some(k=>k.transform&&k.transform!=='none'))__moving.push(t.className)}},30)});
 ok(await playLevel(p,'m3'),'m3 finished with reduced motion');
 ok(await p.evaluate(()=>__moving.length===0),'reduced motion: the ladder and the rescue hop only fade ('+(await p.evaluate(()=>__moving.slice(0,3).join(',')))+')');
 await p._ctx.close()}
console.log('rescue staging PASS');

// ── 9. the crash kit (owner 2026-10-08 "when Mojo crashes the BROK text effect and the like don't appear"):
//    a bump bursts BROK!, throws chunky debris and spins dizzy stars over Mojo, holds an 80 ms hit-stop, stays
//    off the palette and Bo's chip, cleans itself up within 1.5 s, and Berhenti clears it mid-burst ──
{const p=await page(1280,800);
 await p.evaluate(()=>__mojo.start('m2'));await sleep(300);await intro(p);
 const crash=()=>p.evaluate(()=>{const m=__mojo.state().position||{};MojoFX.bump(m.r||1,m.c||1,(m.h||0))});
 const look=()=>p.evaluate(()=>{
   const q=s=>[...document.querySelectorAll('#board '+s)];
   const chrome=['#bo','#palette','#scr-play .p-top','#scr-play .p-strip'].map(s=>document.querySelector(s)).filter(e=>e&&e.offsetParent!==null);
   const hits=e=>{const a=e.getBoundingClientRect();return chrome.some(t=>{const b=t.getBoundingClientRect();return Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1})};
   const brok=q('.mfx-brok'),chunk=q('.mfx-chunk'),star=q('.mfx-spr').filter(e=>/dizzy-/.test(e.style.backgroundImage));
   return{brok:brok.length,chunk:chunk.length,star:star.length,over:[...brok,...chunk,...star].filter(hits).map(e=>e.className),
     stop:document.getElementById('board').classList.contains('mfx-stop'),live:MojoFX.live(),names:MojoFX.names()}});
 await crash();await sleep(40);let b=await look();
 ok(b.brok===1,'a bump bursts one comic BROK! ('+b.brok+')');
 ok(b.chunk>=5,'a bump throws chunky debris ('+b.chunk+')');
 ok(b.star===1,'dizzy stars spin over Mojo ('+b.star+')');
 ok(b.stop,'the impact holds the board for a hit-stop');
 ok(b.over.length===0,'the crash never covers the palette, the plan strip, the top bar or Bo ('+b.over.join(',')+')');
 ok(b.names.filter(n=>n==='bump').length===1,'the whole crash is ONE effect in the cap ('+b.names.join(',')+')');
 await sleep(260);ok(!(await p.evaluate(()=>document.getElementById('board').classList.contains('mfx-stop'))),'the hit-stop lifts itself');
 await sleep(1500);b=await look();ok(b.brok+b.chunk+b.star===0,'the crash is gone 1.5 s later ('+JSON.stringify(b)+')');
 await crash();await sleep(40);await p.evaluate(()=>MojoFX.clear());b=await look();
 ok(b.brok+b.chunk+b.star===0&&!b.stop&&b.live===0,'Berhenti mid-crash clears it and lifts the hit-stop ('+JSON.stringify(b)+')');
 await p._ctx.close()}
{const p=await page(1280,800,{reduced:true});
 await p.evaluate(()=>__mojo.start('m2'));await sleep(300);await intro(p);
 await p.evaluate(()=>{const m=__mojo.state().position||{};MojoFX.bump(m.r||1,m.c||1,(m.h||0))});await sleep(60);
 const r=await p.evaluate(()=>({chunk:document.querySelectorAll('#board .mfx-chunk').length,
   moving:[...document.querySelectorAll('#board .mfx')].filter(e=>e.getAnimations().some(a=>a.effect.getKeyframes().some(k=>k.transform&&k.transform!=='none'))).map(e=>e.className),
   boardAnim:document.getElementById('board').getAnimations().length,stop:document.getElementById('board').classList.contains('mfx-stop')}));
 ok(r.chunk===0&&r.moving.length===0&&r.boardAnim===0&&!r.stop,'reduced motion: the crash only fades, no debris, no shake, no hit-stop ('+JSON.stringify(r)+')');
 await p._ctx.close()}
console.log('crash kit PASS');

await browser.close();
assert.deepEqual(errors,[],'page errors: '+errors.join(' | '));
console.log('qa-mojo-fx: '+passed+' checks PASS');
