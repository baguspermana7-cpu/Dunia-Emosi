import puppeteer from 'puppeteer';
import fs from 'node:fs';
const url=process.env.QA_URL||'http://localhost:8081/games/mojo-swoptops.html?unlock=1';
const output=process.env.QA_SHOTS||'/tmp/mojo-qa'; fs.mkdirSync(output,{recursive:true});
const sizes=(process.env.QA_SIZES||'1280x800,390x844,844x390,1024x768').split(',').map(x=>x.split('x').map(Number));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const issues=[]; let passed=0;
function check(ok,msg){if(ok)passed++;else{issues.push(msg);console.error('FAIL',msg)}}
async function tap(p,sel){const h=await p.$(sel);if(!h)throw new Error('Missing '+sel);await h.evaluate(e=>e.scrollIntoView({block:'nearest',inline:'nearest'}));await h.click();await sleep(30)}
async function shot(p,name){await sleep(280);await p.screenshot({path:`${output}/${name}.png`})}
async function begin(p,id){await p.evaluate(id=>__mojo.start(id),id);await tap(p,'#in-go');if(await p.$('#ov-card.on #picker-later'))await tap(p,'#picker-later')}
async function clear(p){if(await p.$('#btn-clear:not([disabled])')){await tap(p,'#btn-clear');await tap(p,'#cl-yes')}}
async function program(p,sol){await clear(p);for(const cmd of sol)await tap(p,`[data-cmd="${cmd}"]`)}
async function help(p){
 if(await p.$('#ov-swop.on #sw-skip'))await tap(p,'#sw-skip');
 const mg=await p.evaluate(()=>__mojo.mg()); if(!mg)return;
 if(mg.kind==='letters'){for(const c of mg.answer){const sel=`#ov-mg.on .tile[data-l="${c}"]:not(.used)`;if(await p.$(sel))await tap(p,sel)}await sleep(380);if(await p.$('#mg-ok'))await tap(p,'#mg-ok')}
 else if(mg.kind==='height'){const good=`#ov-mg.on [data-v="${mg.answer}"]`;if(await p.$(good))await tap(p,good)}
 else if(mg.kind==='event')await tap(p,'#event-skip');
}
try{
 for(const [width,height] of sizes){
  const p=await browser.newPage();await p.setViewport({width,height,deviceScaleFactor:1});const errors=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
  await p.goto(url,{waitUntil:'networkidle0'});await p.waitForFunction(()=>window.__mojo&&__mojo.ready&&navigator.serviceWorker.controller);await sleep(800);
  await shot(p,`${width}-splash`);await tap(p,'#scr-splash .splash-stage>.btn');await shot(p,`${width}-home`);
  for(const [button,screen] of [['btn-levels','scr-regions'],['btn-collection','scr-collection'],['btn-workshop','scr-workshop'],['btn-learn','scr-learn'],['btn-profile','scr-profile']]){
   await tap(p,'#'+button);check(await p.evaluate(id=>document.body.dataset.scr===id,screen),`${width} ${screen}`);await shot(p,`${width}-${screen}`);await tap(p,`#${screen} .topbar button`);
  }
  await begin(p,'m8');await p.evaluate(()=>__mojo.start('m8'));await tap(p,'#in-go');
  check(await p.$eval('#ov-card',e=>e.textContent.includes('Paling Tepat')&&e.textContent.includes('Bisa Juga')),`${width} both picker badges`);await shot(p,`${width}-picker`);await tap(p,'#picker-later');
  const levels=process.env.QA_LEVELS?process.env.QA_LEVELS.split(','):await p.evaluate(()=>__mojo.levels());
  for(const id of levels){
   await begin(p,id);let saved=false;const seen=new Set();
   for(let guard=0;guard<500;guard++){
    await help(p);const st=await p.evaluate(()=>__mojo.state());
    if(await p.$('#ov-card.on #res-map')){saved=true;break}
    if(await p.$('#ov-card.on #in-go')){await tap(p,'#in-go');if(await p.$('#ov-card.on #picker-later'))await tap(p,'#picker-later')}
    if(!st.running&&!seen.has(st.beat)&&await p.$('#btn-run:not([disabled])')){
     const sol=await p.evaluate(()=>__mojo.solution());check(sol&&sol.length,`${width} ${id}:${st.beat} solution`);
     if(!sol)break;await shot(p,`${width}-${id}-planning${st.beat}`);await program(p,sol);check(await p.evaluate(()=>!document.querySelector('.slot.ghost')&&__mojo.state().hint===0),`${width} ${id} no preview`);
     await shot(p,`${width}-${id}-beat${st.beat}`);seen.add(st.beat);await tap(p,'#btn-run');
    }
    await sleep(220);
   }
   check(saved,`${width} ${id} completes`);await shot(p,`${width}-${id}-result`);
   console.log(`${width} ${id}: ${saved?'PASS':'FAIL'}`);
   if(!saved){console.log(await p.evaluate(()=>render_game_to_text()));break}
  }
  check(errors.length===0,`${width} browser errors ${errors.join(';')}`);
  await p.close();
 }
}finally{await browser.close()}
fs.writeFileSync(output+'/result.json',JSON.stringify({passed,issues},null,2));console.log(JSON.stringify({passed,issues}));if(issues.length)process.exitCode=1;
