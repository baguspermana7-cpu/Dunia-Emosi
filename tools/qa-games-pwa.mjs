// Real-browser PWA integration: no production writes and no simulated win hooks.
// Run ONLY while holding the team's serial Chromium lease: node tools/qa-games-pwa.mjs
import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createFixture} from './qa-games-pwa-server.mjs';
const out=process.env.QA_PWA_SHOTS||'/tmp/dunia-games-pwa';fs.mkdirSync(out,{recursive:true});
const fixture=createFixture(),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const cueSource=fs.readFileSync(path.join(fixture.root,'games/data/sfx-engine.js'),'utf8').match(/var CUE_FILES = \{([\s\S]*?)\n  \}/)[1];
const cues=[...cueSource.matchAll(/(\w+): '([^']+\.mp3)'/g)].map(m=>({name:m[1],file:m[2]}));
const report={checks:[],installability:{},offline:[],failures:[]};
let browser;
function check(ok,text){assert.ok(ok,text);report.checks.push(text);console.log('PASS '+text)}
async function tap(p,s){const e=await p.waitForSelector(s,{visible:true});assert.ok(e,'Missing control '+s);await e.evaluate(e=>e.scrollIntoView({block:'nearest',inline:'nearest'}));await e.click();await sleep(40)}
async function shot(p,name){await sleep(300);await p.screenshot({path:path.join(out,name+'.png')})}
async function ready(p,game){await p.waitForFunction(g=>g==='g31'?window.__mojo?.ready:!!window.__tk,{},game)}
async function controlled(p){await p.waitForFunction(()=>!!navigator.serviceWorker.controller,{timeout:60000});await p.evaluate(()=>navigator.serviceWorker.ready)}
async function images(p){
 await p.waitForFunction(()=>[...document.images].every(i=>{const r=i.getBoundingClientRect();return !i.getAttribute('src')||!r.width||!r.height||r.bottom<=0||r.top>=innerHeight||r.right<=0||r.left>=innerWidth||i.complete}),{timeout:15000});
 const broken=await p.evaluate(()=>[...document.images].filter(i=>{const r=i.getBoundingClientRect();return i.getAttribute('src')&&r.width&&r.height&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth&&!i.naturalWidth}).map(i=>i.currentSrc));
 check(broken.length===0,'Visible pictures decode: '+p.url()+' '+broken.join(','));
}
async function installability(p,id){
 const session=await p.createCDPSession();await session.send('Page.enable');
 const manifest=await session.send('Page.getAppManifest');
 const install=await session.send('Page.getInstallabilityErrors');
 report.installability[id]={manifestURL:manifest.url,errors:install.installabilityErrors};
 check(manifest.url===new URL('manifest.json',fixture.base).href,id+' resolves root manifest from nested direct link');
 check(install.installabilityErrors.length===0,id+' Chrome installability has zero errors');
 await session.detach();
}
async function shellCached(p,id){
 const page=id==='g31'?'mojo-swoptops.html':'timmy-kapal.html';
 const html=fs.readFileSync(path.join(fixture.root,'games',page),'utf8');
 const urls=[new URL('games/'+page,fixture.base).href];
 for(const m of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"[^>]*>/g))if(/\.(?:js|css)(?:\?|$)/.test(m[1]))urls.push(new URL(m[1],urls[0]).href);
 const missing=await p.evaluate(async us=>{const bad=[];for(const u of us)if(!(await caches.match(u)))bad.push(u);return bad},urls);
 check(missing.length===0,id+' standalone shell and every loaded local script/style cached: '+missing.join(','));
 const missingSounds=await p.evaluate(async entries=>{const bad=[];for(const x of entries){const r=await caches.match(new URL('../assets/sfx/'+x.file,location.href).href);if(!r||r.status!==200)bad.push(x.file)}return bad},cues);
 check(missingSounds.length===0,id+' all '+cues.length+' shared SFX files cached in full: '+missingSounds.join(','));
}
async function freshDirect(id){
 const context=browser.defaultBrowserContext(),p=await context.newPage();await p.setViewport({width:1280,height:800});
 let navigations=0;p.on('framenavigated',f=>{if(f===p.mainFrame())navigations++});
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 fixture.swDelay=2200;
 const page=id==='g31'?'mojo-swoptops.html':'timmy-kapal.html';
 await p.goto(fixture.base+'games/'+page,{waitUntil:'domcontentloaded'});await ready(p,id);
 const token=await p.evaluate(()=>window.__pwaBoot=Math.random());
 check(await p.evaluate(()=>!navigator.serviceWorker.controller),id+' starts on a fresh direct link before SW claim');
 if(id==='g31'){
  await p.evaluate(()=>__mojo.start('t1'));await tap(p,'#in-go');await tap(p,'[data-cmd="east"]');await tap(p,'#btn-run');
 }else await tap(p,'#btn-start');
 await controlled(p);fixture.swDelay=0;await sleep(900);
 check(navigations===1&&(await p.evaluate(()=>window.__pwaBoot))===token,id+' first SW activation does not reload a game already in progress');
 check(await p.evaluate(g=>g==='g31'?__mojo.state()?.id==='t1':__tk.state().playing,id),id+' play state survives initial claim');
 check(errors.length===0,id+' direct link has no uncaught errors: '+errors.join(';'));
 const scope=await p.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return r.scope});
 check(scope===fixture.base,id+' registration controls the nested app scope');
 await installability(p,id);await shellCached(p,id);await shot(p,id+'-fresh-direct');
 return{context,p};
}
async function begin(p,id){await p.evaluate(id=>__mojo.start(id),id);await tap(p,'#in-go');if(await p.$('#ov-card.on #picker-later'))await tap(p,'#picker-later')}
async function program(p,commands){
 if(await p.$('#btn-clear:not([disabled])')){await tap(p,'#btn-clear');await tap(p,'#cl-yes')}
 for(const c of commands)await tap(p,`[data-cmd="${c}"]`);
}
async function help(p){
 if(await p.$('#ov-swop.on #sw-skip'))await tap(p,'#sw-skip');
 const mg=await p.evaluate(()=>__mojo.mg());
 if(mg?.kind==='letters'){for(const ch of mg.answer){const s=`#ov-mg.on .tile[data-l="${ch}"]:not(.used)`;if(await p.$(s))await tap(p,s)}await p.waitForSelector('#mg-ok');await tap(p,'#mg-ok')}
 if(mg?.kind==='height')await tap(p,`#ov-mg.on [data-v="${mg.answer}"]`);
 if(mg?.kind==='event')await tap(p,'#event-skip');
}
async function finishMission(p,id){
 await begin(p,id);const seen=new Set();
 for(let n=0;n<650;n++){
  await help(p);
  if(await p.$('#ov-card.on #res-map')){check(true,id+' completed through actual command and microgame controls');return}
  if(await p.$('#ov-card.on #in-go')){await tap(p,'#in-go');if(await p.$('#ov-card.on #picker-later'))await tap(p,'#picker-later')}
  const state=await p.evaluate(()=>__mojo.state());
  if(!state.running&&!seen.has(state.beat)&&await p.$('#btn-run:not([disabled])')){
   const solution=await p.evaluate(()=>__mojo.solution());assert.ok(solution?.length,'Solver supplies only input data');await program(p,solution);
   check(await p.evaluate(()=>!document.querySelector('.slot.ghost')&&__mojo.state().hint===0),id+' has no automatic hint or ghost');
   seen.add(state.beat);await tap(p,'#btn-run');
  }
  await sleep(160);
 }
 throw Error(id+' did not complete: '+await p.evaluate(()=>render_game_to_text()));
}
async function hubRoundTrip(p){
 await p.goto(fixture.base+'index.html',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>typeof showScreen==='function');
 await tap(p,'#screen-welcome [onclick*="screen-menu"]');
 await Promise.all([p.waitForNavigation({waitUntil:'domcontentloaded'}),tap(p,'#gtile-31')]);await ready(p,'g31');
 check(p.url().endsWith('/games/mojo-swoptops.html'),'Hub G31 tile launches correct standalone page');
 await finishMission(p,'t1');const stars=await p.evaluate(()=>__mojo.save().lv.t1.stars);
 check(stars>0&&await p.evaluate(()=>!!sessionStorage.getItem('g31Result')),'Actual t1 win writes stars and return marker');
 await tap(p,'#res-map');await tap(p,'#scr-regions .topbar button');
 await Promise.all([p.waitForNavigation({waitUntil:'domcontentloaded'}),tap(p,'#btn-exit')]);await p.waitForFunction(()=>typeof showScreen==='function');
 await tap(p,'#screen-welcome [onclick*="screen-menu"]');
 check(await p.$eval('#gstars-31-lbl',(e,n)=>e.dataset.total===String(n),stars),'Hub displays actual earned G31 stars');
 check(await p.evaluate(()=>sessionStorage.getItem('g31Result')===null&&sessionStorage.getItem('31Result')===null),'Hub consumes G31 return markers');
 await shot(p,'hub-earned-g31');return stars;
}
async function controlledUpdate(p,stars){
 await p.goto(fixture.base+'games/mojo-swoptops.html',{waitUntil:'networkidle0'});await ready(p,'g31');await controlled(p);
 await begin(p,'m2');await program(p,['up']);await tap(p,'#btn-run');
 const prior=await p.evaluate(()=>__mojo.save().lv.t1),token=await p.evaluate(()=>window.__pwaBoot=Math.random());let reloads=0;
 const listener=f=>{if(f===p.mainFrame())reloads++};p.on('framenavigated',listener);fixture.revision=2;
 const next=p.waitForNavigation({waitUntil:'networkidle0',timeout:60000});
 await p.evaluate(()=>{navigator.serviceWorker.getRegistration().then(r=>r.update()).catch(e=>console.error(e))});await next;await ready(p,'g31');await sleep(1600);p.off('framenavigated',listener);
 check(reloads===1,'Controlled SW version update reloads exactly once');
 check(await p.evaluate(t=>window.__pwaBoot!==t,token),'Updated document starts a fresh boot');
 assert.deepEqual(await p.evaluate(()=>__mojo.save().lv.t1),prior);check(prior.stars===stars,'SW update retains earned child progress');
 check(await p.evaluate(async()=>(await caches.keys()).some(k=>k.endsWith('-qa2'))),'New SW cache version activates');
 await shot(p,'after-controlled-update');
}
async function warmAndKill(p){
 await p.waitForFunction(()=>__mojo.assets().pending===0,{timeout:60000});const assets=await p.evaluate(()=>__mojo.assets());
 check(assets.ready&&assets.failed.length===0,'Mojo offline warming resolves all required artwork');
 const cached=await p.evaluate(async()=>{const missing=[];for(const u of __mojo.warm())if(!(await caches.match(new URL(u,location.href).href)))missing.push(u);return{count:__mojo.warm().length,missing}});
 check(cached.count>=88&&cached.missing.length===0,'Every warm URL is persisted in SW cache: '+JSON.stringify(cached));
 check(await p.evaluate(()=>!__mojo.save().lv.m8&&!__mojo.save().lv.s1),'Offline target missions have never been completed or checkpointed');
 await fixture.stop();let unavailable=false;try{await fetch(fixture.base)}catch{unavailable=true}
 check(unavailable,'Origin HTTP server is actually stopped, not emulated offline');
}
async function offlineCold(context){
 const p=await context.newPage(),errors=[],failed=[];await p.setCacheEnabled(false);await p.setViewport({width:390,height:844});
 p.on('pageerror',e=>errors.push(e.message));p.on('requestfailed',r=>{if(r.url().startsWith(fixture.base))failed.push(r.url())});
 p.on('response',r=>{if(r.url().startsWith(fixture.base)&&r.status()>=400)failed.push(r.status()+' '+r.url())});
 await p.goto(fixture.base+'games/mojo-swoptops.html',{waitUntil:'networkidle0'});await ready(p,'g31');await controlled(p);await tap(p,'#scr-splash .splash-stage>.btn');
 report.offlineAudio=await p.evaluate(async entries=>{
  const ctx=new AudioContext(),proof=[];
  try{for(const x of entries){const res=await fetch('../assets/sfx/'+x.file);if(!res.ok)throw Error(x.file+' offline HTTP '+res.status);const buffer=await ctx.decodeAudioData(await res.arrayBuffer());
   await new Promise((resolve,reject)=>{const a=new Audio('../assets/sfx/'+x.file),timer=setTimeout(()=>reject(Error(x.name+' did not play offline')),5000);a.addEventListener('playing',()=>{clearTimeout(timer);a.pause();resolve()},{once:true});a.addEventListener('error',()=>{clearTimeout(timer);reject(Error(x.name+' media error'))},{once:true});a.play().catch(e=>{clearTimeout(timer);reject(e)})});
   proof.push({file:x.file,seconds:buffer.duration,channels:buffer.numberOfChannels});
  }}finally{await ctx.close()}return proof;
 },cues);
 check(report.offlineAudio.length===cues.length&&report.offlineAudio.every(x=>x.seconds>0&&x.channels>0),'Every shared cue decodes and starts real audio while origin is stopped');
 for(const [width,height] of [[390,844],[844,390]]){
  await p.setViewport({width,height});
  for(const [button,screen] of [['btn-levels','scr-regions'],['btn-workshop','scr-workshop'],['btn-collection','scr-collection'],['btn-learn','scr-learn'],['btn-profile','scr-profile']]){
   await tap(p,'#'+button);await images(p);await shot(p,`offline-${width}-${screen}`);await tap(p,`#${screen} .topbar button`);
  }
 }
 await p.setViewport({width:1024,height:768});await finishMission(p,'m8');await images(p);await shot(p,'offline-m8-result');
 await p.setViewport({width:390,height:844});await finishMission(p,'s1');await images(p);await shot(p,'offline-school-result');
 report.offline={uncaught:errors,failedRequests:[...new Set(failed)]};
 check(errors.length===0,'Offline missions and menus have zero uncaught errors: '+errors.join(';'));
 check(failed.length===0,'Offline missions and menus have no missing local requests: '+[...new Set(failed)].join(';'));
 await p.close();
}
try{
 await fixture.start();browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 await freshDirect('g30');await browser.close();
 browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const mojo=await freshDirect('g31'),stars=await hubRoundTrip(mojo.p);
 await controlledUpdate(mojo.p,stars);await warmAndKill(mojo.p);await mojo.p.close();await offlineCold(mojo.context);
}catch(e){report.failures.push(e.stack);console.error(e);process.exitCode=1}
finally{if(browser)await browser.close();await fixture.stop();report.fixtureMissing=[...new Set(fixture.missing)];fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,failures:report.failures.length,evidence:out}))}
