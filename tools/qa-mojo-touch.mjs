// Native CDP touch gestures, reading time and short-landscape exit visibility.
import puppeteer from 'puppeteer';import fs from 'node:fs';
const out=process.env.QA_TOUCH_SHOTS||'/tmp/mojo-touch';fs.mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const p=await browser.newPage();await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:1});
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),checks=[],errors=[];p.on('pageerror',e=>errors.push(e.message));
function check(ok,message){checks.push({ok,message});console.log((ok?'PASS ':'FAIL ')+message)}
async function tap(s){const e=await p.$(s);if(!e)throw Error('Missing '+s);await e.evaluate(e=>e.scrollIntoView({block:'nearest',inline:'nearest'}));const r=await e.boundingBox();await p.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);await sleep(80)}
async function begin(id){await p.evaluate(id=>__mojo.start(id),id);await tap('#in-go');if(await p.$('#ov-card.on #picker-later'))await tap('#picker-later')}
async function program(a){for(const c of a)await tap(`[data-cmd="${c}"]`)}
async function swipe(x,y,dx,dy){const s=await p.createCDPSession();await s.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1,radiusX:6,radiusY:6,force:1}]});for(let i=1;i<=12;i++){await s.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/12,y:y+dy*i/12,id:1,radiusX:6,radiusY:6,force:1}]});await sleep(25)}await s.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await sleep(300);await s.detach()}
try{
 await p.goto(process.env.QA_URL||'http://localhost:8081/games/mojo-swoptops.html?unlock=1',{waitUntil:'networkidle0'});await p.waitForFunction(()=>window.__mojo?.ready&&navigator.serviceWorker.controller);await sleep(600);
 await begin('s1');await program(['swop:dozer','push','swop:fire','spray','swop:jumper','jump']);
 await p.$eval('#palette',e=>e.scrollTop=0);const before=await p.evaluate(()=>__mojo.state().prog);
 const cmd=await p.$eval('#palette .cmd',e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}});await swipe(cmd.x,cmd.y,0,-145);
 check(await p.$eval('#palette',e=>e.scrollTop>20),'Vertical swipe over command scrolls palette');
 check(JSON.stringify(await p.evaluate(()=>__mojo.state().prog))===JSON.stringify(before),'Palette swipe does not change program');
 check(await p.$eval('#drag-ghost',e=>!e.classList.contains('on')),'Touch panning leaves no drag ghost');
 await p.$eval('#slots',e=>e.scrollLeft=0);const box=await p.$eval('#slots',e=>{const r=e.getBoundingClientRect();return{x:r.left+Math.min(230,r.width-20),y:r.top+r.height/2}});await swipe(box.x,box.y,-180,0);
 check(await p.$eval('#slots',e=>e.scrollLeft>30),'Horizontal swipe over chips scrolls plan');
 check(JSON.stringify(await p.evaluate(()=>__mojo.state().prog))===JSON.stringify(before),'Plan swipe does not reorder commands');
 await tap('[data-slot="1"]');await tap('[data-act="r"]');const reordered=before.slice();[reordered[1],reordered[2]]=[reordered[2],reordered[1]];
 check(JSON.stringify(await p.evaluate(()=>__mojo.state().prog))===JSON.stringify(reordered),'Touch select and explicit arrow deliberately reorder');await p.screenshot({path:out+'/portrait-native-pan.png'});
 await begin('m2');await program(['fwd']);await p.evaluate(()=>{const n=performance.now.bind(performance);window.__nativeClock=n;performance.now=()=>n()+120001});await tap('#btn-run');await p.waitForFunction(()=>__mojo.mg()?.kind==='event');
 const right=await p.evaluate(()=>[...document.querySelectorAll('[data-answer]')].find(e=>e.textContent===String(__mojo.mg().answer)).getAttribute('data-answer'));await tap(`[data-answer="${right}"]`);await sleep(1500);
 check(await p.evaluate(()=>__mojo.mg()?.kind==='event'),'Correct-answer explanation remains until child continues');
 if(await p.$('#ov-mg.on #event-skip')){await p.screenshot({path:out+'/persistent-explanation.png'});await tap('#event-skip')}
 await p.evaluate(()=>performance.now=window.__nativeClock);await p.setViewport({width:844,height:390,isMobile:true,hasTouch:true,deviceScaleFactor:1});
 await begin('s1');await sleep(300);await p.screenshot({path:out+'/landscape-fresh-planning.png'});
 check(await p.evaluate(()=>document.getElementById('run-t').textContent==='Jalan!'&&!document.getElementById('btn-hint').disabled),'New mission restores planning controls after an active run');
 check(await p.$eval('#palette',e=>e.scrollTop===0),'New mission shows palette from first command');
 check(await p.$eval('.palette-box',e=>!e.classList.contains('scrollable')||getComputedStyle(e.querySelector('.palette-scroll-note')).display!=='none'),'Scrollable commands have a visible separate cue');
 await begin('t1');await program(await p.evaluate(()=>__mojo.solution()));await tap('#btn-run');await p.waitForSelector('#ov-card.on #res-map');await sleep(400);
 const actions=await p.$$eval('.result .row button',bs=>bs.map(b=>{const r=b.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{id:b.id,visible:r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth&&b.contains(top)}}));
 check(actions.length>=2&&actions.every(x=>x.visible),'All short-landscape result actions are in view: '+JSON.stringify(actions));await p.screenshot({path:out+'/landscape-visible-result.png'});
 check(errors.length===0,'No uncaught browser errors: '+errors.join(';'));
}catch(e){check(false,e.stack)}finally{await browser.close();fs.writeFileSync(out+'/result.json',JSON.stringify(checks,null,2));if(checks.some(x=>!x.ok))process.exitCode=1}
