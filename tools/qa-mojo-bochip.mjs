// Bo's message chip (owner 2026-10-04: "the callout covers the arrows; hide it, tap to expand").
// At every viewport the collapsed chip never touches a palette button, the plan strip or the board, every palette
// button is the element under its own centre, opening the popover never moves the palette, and it closes by itself.
import puppeteer from 'puppeteer';import fs from 'node:fs';
const url=process.env.QA_URL||'http://localhost:8081/games/mojo-swoptops.html?unlock=1';
const out=process.env.QA_BOCHIP_SHOTS||'/tmp/mojo-bochip-qa';fs.mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']}),p=await browser.newPage(),checks=[],errors=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));p.on('pageerror',e=>errors.push(e.message));
function check(ok,message){checks.push({ok,message});if(!ok)console.log('FAIL '+message)}
async function begin(id){await p.evaluate(id=>__mojo.start(id),id);await sleep(250);const go=await p.$('#in-go');if(go)await go.click();await sleep(250);if(await p.$('#ov-card.on #picker-later')){await p.click('#picker-later');await sleep(150)}await sleep(300)}
const isOpen=()=>p.$eval('#bo',e=>e.classList.contains('open'));
const geom=()=>p.evaluate(()=>{
  const R=e=>{const r=e.getBoundingClientRect();return{l:r.left,t:r.top,r:r.right,b:r.bottom}};
  const hit=(a,b)=>a.l<b.r-0.5&&b.l<a.r-0.5&&a.t<b.b-0.5&&b.t<a.b-0.5;
  const chip=R(document.getElementById('bo')),pal=document.getElementById('palette'),res={over:[],blocked:[],n:0};
  for(const [n,s] of [['strip','.p-strip'],['board','#board']]){const e=document.querySelector(s);if(e&&hit(chip,R(e)))res.over.push(n)}
  for(const b of pal.querySelectorAll('.cmd')){res.n++;b.scrollIntoView({block:'nearest',inline:'nearest'});const r=R(b);
    if(hit(chip,r))res.over.push('cmd '+b.dataset.cmd);
    const x=(r.l+r.r)/2,y=(r.t+r.b)/2,top=document.elementFromPoint(x,y);
    if(!top||top.closest('.cmd')!==b)res.blocked.push(b.dataset.cmd+'@'+Math.round(x)+','+Math.round(y)+'->'+(top?top.className||top.id||top.tagName:'none'))}
  pal.scrollTop=0;res.pal=R(pal);res.chipH=Math.round(chip.b-chip.t);return res});
try{
 await p.goto(url,{waitUntil:'networkidle0'});await p.waitForFunction(()=>window.__mojo?.ready&&navigator.serviceWorker.controller);await sleep(600);
 const ids=await p.evaluate(()=>__mojo.levels()),levels=['t2','m5',ids[ids.length-1]];
 for(const [w,h] of [[1280,800],[1024,768],[844,390],[390,844]]){
  await p.setViewport({width:w,height:h});
  for(const id of levels){
   await begin(id);
   await p.evaluate(()=>{document.getElementById('bo').classList.remove('open')});
   const g=await geom(),tag=w+'x'+h+' '+id;
   check(g.n>0,tag+' palette has buttons');
   check(g.over.length===0,tag+' collapsed chip overlaps nothing ('+g.over.join(', ')+')');
   check(g.blocked.length===0,tag+' every palette button is tappable ('+g.blocked.join(', ')+')');
   check(g.chipH<=62,tag+' chip keeps its fixed slot ('+g.chipH+' px)');
   if(w===1280&&id==='t2')await p.screenshot({path:out+'/1280-collapsed.png'});
   await p.click('#bo-details');await sleep(250);
   check(await isOpen(),tag+' a tap opens the message');
   const pal2=await p.$eval('#palette',e=>{const r=e.getBoundingClientRect();return{l:r.left,t:r.top,r:r.right,b:r.bottom}});
   check(JSON.stringify(pal2)===JSON.stringify(g.pal),tag+' opening never moves the palette');
   const full=await p.$eval('#bo-text',e=>e.scrollWidth<=e.clientWidth+1&&getComputedStyle(e).whiteSpace!=='nowrap');
   check(full,tag+' the popover shows the whole sentence');
   if(w===1280&&id==='t2')await p.screenshot({path:out+'/1280-expanded.png'});
   if(id==='t2'){await sleep(4200);check(!(await isOpen()),tag+' the popover closes by itself after ~4 s')}
   else{await p.mouse.click(Math.round(w*0.25),Math.round(h*0.5));await sleep(150);check(!(await isOpen()),tag+' a tap outside closes the popover')}
  }
  await begin('t2');await p.evaluate(()=>document.getElementById('btn-hint').click());await sleep(300);
  const hintOpen=await isOpen();check(hintOpen,w+'x'+h+' a new hint opens by itself');
  await sleep(3300);check(!(await isOpen()),w+'x'+h+' the hint popover collapses after ~3 s');
  await p.evaluate(()=>{const o=document.querySelector('.overlay.on');if(o)o.classList.remove('on')});
 }
 check(errors.length===0,'no page errors ('+errors.join(' | ')+')');
}catch(e){check(false,'run error: '+e.message)}
await browser.close();
const bad=checks.filter(c=>!c.ok);
console.log((bad.length?'FAIL':'PASS')+' bo-chip '+(checks.length-bad.length)+'/'+checks.length+(bad.length?' failing':''));
process.exit(bad.length?1:0);
