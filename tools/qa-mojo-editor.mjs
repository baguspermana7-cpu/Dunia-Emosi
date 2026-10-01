// Context stays visible while editing; explicit replacement/add modes and honest workshop navigation.
import puppeteer from 'puppeteer';import fs from 'node:fs';
const out=process.env.QA_EDITOR_SHOTS||'/tmp/mojo-editor-qa';fs.mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']}),p=await browser.newPage(),checks=[],errors=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));p.on('pageerror',e=>errors.push(e.message));
function check(ok,message){checks.push({ok,message});console.log((ok?'PASS ':'FAIL ')+message)}
async function tap(s){const e=await p.waitForSelector(s,{visible:true});await e.evaluate(e=>e.scrollIntoView({block:'nearest',inline:'nearest'}));await e.click();await sleep(120)}
async function begin(id){await p.evaluate(id=>__mojo.start(id),id);await tap('#in-go');if(await p.$('#ov-card.on #picker-later'))await tap('#picker-later')}
async function visible(s){return p.$eval(s,e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth&&(!e.clientHeight||e.scrollHeight<=e.clientHeight+1)})}
try{
 await p.goto('http://localhost:8081/games/mojo-swoptops.html?unlock=1',{waitUntil:'networkidle0'});await p.waitForFunction(()=>window.__mojo?.ready&&navigator.serviceWorker.controller);await sleep(700);
 for(const [width,height] of [[390,844],[844,390]]){
  await p.setViewport({width,height});await p.evaluate(()=>__mojo.start('t1'));await sleep(300);await p.screenshot({path:out+'/'+width+'-first-briefing.png'});
  check(await visible('#in-go'),width+' first tutorial next action is visible');await tap('#in-go');await sleep(200);await p.screenshot({path:out+'/'+width+'-first-planning.png'});
  check(await visible('#bo-task'),width+' complete task is visible without scrolling');check(await visible('#bo-text'),width+' visible Bo sentence is complete');
  await begin('s1');for(const c of ['swop:dozer','push','swop:fire','spray'])await tap(`[data-cmd="${c}"]`);await tap('[data-slot="2"]');await sleep(350);
  check(await p.$eval('#edit-step',e=>e.textContent==='Ubah langkah 3: Jadi Pemadam'),width+' selected step uses complete untruncated name');
  check(await p.evaluate(()=>{const b=document.getElementById('board').getBoundingClientRect(),w=document.getElementById('board-wrap').getBoundingClientRect();return [...document.querySelectorAll('.edit-label,.edit-tools')].every(e=>e.getBoundingClientRect().top>=b.bottom)&&b.top>=w.top&&b.bottom<=w.bottom&&b.left>=w.left&&b.right<=w.right}),width+' reserved editor never covers board and board fits its area');
  check(await visible('#edit-step')&&await visible('[data-act="add"]'),width+' edit explanation and return-to-add action are readable');await p.screenshot({path:out+'/'+width+'-selected-step.png'});
  const before=await p.evaluate(()=>__mojo.state().prog);await tap('[data-act="add"]');await tap('[data-cmd="east"]');
  check(await p.evaluate(a=>JSON.stringify(__mojo.state().prog)===JSON.stringify(a.concat("east")),before),width+' explicit return-to-add appends instead of replacing');await tap('#btn-undo');check(await p.evaluate(a=>JSON.stringify(__mojo.state().prog)===JSON.stringify(a),before),width+' Undo remains available after editor mode');
  await begin('t6');await tap('[data-cmd="east"]');await tap('#btn-run');await p.waitForFunction(()=>!!__mojo.state().fail);await sleep(500);await p.screenshot({path:out+'/'+width+'-failed-run.png'});
  check(await visible('#bo-task')&&await visible('#bo-text'),width+' failed run keeps current task and concise feedback visible');check(await p.$eval('#bo-text',e=>e.textContent.includes('belum bisa menyemprot air')),width+' wrong-form feedback immediately explains the blocked capability');await tap('#bo-details');check(await visible('#bo-close'),width+' complete Bo message has visible return action');await p.screenshot({path:out+'/'+width+'-failure-explanation.png'});await tap('#bo-close');
  await p.evaluate(()=>__mojo.home());await tap('#btn-workshop');check((await p.$eval('#workshop-availability',e=>e.textContent)).includes('Ada di misi'),width+' workshop marks a playable form');
  for(let n=0;n<44;n++){if((await p.$eval('#workshop-availability',e=>e.textContent)).includes('Segera di misi baru'))break;await tap('#workshop-next')}
  check((await p.$eval('#workshop-availability',e=>e.textContent)).includes('Segera di misi baru'),width+' workshop discloses pictured forms without missions (friendly "Segera di misi baru!" badge, owner 2026-10-01)');check(await p.$eval('#workshop-missions',e=>e.textContent==='Lihat Misi'),width+' workshop navigation makes no per-form play promise');await p.screenshot({path:out+'/'+width+'-workshop-planned.png'});
 }
 await p.setViewport({width:1280,height:800});await begin('m1');for(const c of await p.evaluate(()=>__mojo.solution()))await tap(`[data-cmd="${c}"]`);console.log('Desktop strip geometry '+JSON.stringify(await p.evaluate(()=>{const s=document.getElementById('slots'),f=s.firstElementChild;return{wrap:getComputedStyle(s).flexWrap,overflow:getComputedStyle(s).overflowX,scroll:s.scrollLeft,first:f.getBoundingClientRect().toJSON(),slots:s.getBoundingClientRect().toJSON(),body:document.body.getBoundingClientRect().toJSON(),width:document.documentElement.scrollWidth}})));await p.screenshot({path:out+'/1280-long-plan.png'});
 check(!errors.length,'No uncaught browser errors: '+errors.join(';'));
}catch(e){check(false,e.stack)}finally{await browser.close();fs.writeFileSync(out+'/result.json',JSON.stringify(checks,null,2));if(checks.some(x=>!x.ok))process.exitCode=1}
