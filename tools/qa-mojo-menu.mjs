// Menu target separation and clear form choice at compact orientations.
import puppeteer from 'puppeteer';import fs from 'node:fs';
const out=process.env.QA_MENU_SHOTS||'/tmp/mojo-menu-qa';fs.mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']}),p=await browser.newPage(),checks=[];
function check(ok,message){checks.push({ok,message});console.log((ok?'PASS ':'FAIL ')+message)}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));async function tap(s){const e=await p.waitForSelector(s,{visible:true});await e.evaluate(e=>e.scrollIntoView({block:'nearest'}));await e.click();await sleep(150)}
try{
 await p.goto('http://localhost:8081/games/mojo-swoptops.html?unlock=1',{waitUntil:'networkidle0'});await p.waitForFunction(()=>window.__mojo?.ready);await sleep(600);
 for(const [width,height] of [[390,844],[844,390]]){
  await p.setViewport({width,height});await p.evaluate(()=>__mojo.home());await tap('#btn-levels');await sleep(250);
  const map=await p.$$eval('.region',bs=>{const rects=bs.map(b=>b.getBoundingClientRect()),overlap=[];for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){const a=rects[i],b=rects[j];if(Math.min(a.right,b.right)>Math.max(a.left,b.left)&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top))overlap.push([i,j])}return{overlap,labels:bs.filter(b=>b.tagName==='BUTTON').every(b=>getComputedStyle(b.querySelector('span')).display!=='none'),inside:rects.every(r=>r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth)}});
  check(!map.overlap.length,width+' region cards never overlap: '+JSON.stringify(map.overlap));check(map.labels,width+' region availability/count stays visible');check(map.inside,width+' every region target is in view');
  check(await p.evaluate(()=>document.querySelectorAll('.region').length===6&&document.querySelectorAll('button.region').length===2&&[...document.querySelectorAll('button.region')].every(b=>MojoLevels.REGIONS.find(r=>r.id===b.dataset.region).levels.length>0)&&[...document.querySelectorAll('.region:not(button)')].every(d=>/Segera/.test(d.textContent)&&!MojoLevels.REGIONS.find(r=>r.id===d.dataset.region).levels.length)),width+' six geographic places; only real missions create buttons; the four empty places say "Segera" (owner 2026-10-01)');
  {const before=await p.evaluate(()=>document.body.dataset.scr);await p.click('.region.locked');await sleep(200);check(await p.evaluate(b=>document.body.dataset.scr===b&&/segera hadir — misi baru sedang dibuat/i.test(document.getElementById('toast').textContent)&&!/Selesaikan/.test(document.getElementById('toast').textContent),before),width+' a region without missions answers a tap honestly (segera hadir, no progress demand)')
   check(await p.$$eval('.region.locked .rsub',e=>e.length===4&&e.every(x=>/Segera hadir — misi baru sedang dibuat!/.test(x.textContent))),width+' every empty region card says "Segera hadir — misi baru sedang dibuat!"')}
  await p.screenshot({path:out+'/'+width+'-map.png'});
  await p.evaluate(()=>__mojo.start('m8'));await tap('#in-go');await sleep(150);
  check(await p.$$eval('.form-badge',bs=>bs.some(b=>b.textContent==='Paling Tepat')&&bs.some(b=>b.textContent==='Bisa Juga')),width+' selector distinguishes strongest and alternative forms');
  check(await p.$$eval('.form-badge',bs=>bs.filter(b=>/Paling Tepat|Bisa Juga/.test(b.textContent)).every(b=>{const r=b.getBoundingClientRect(),p=b.closest('.picker-forms').getBoundingClientRect();return r.top>=p.top&&r.bottom<=p.bottom})),width+' both recommended and alternative badges are visible without scrolling');
  await tap('[data-form="dozer"]');check(await p.$eval('#picker-go',b=>!b.disabled),width+' selecting allowed form enables clear next action');await p.screenshot({path:out+'/'+width+'-picker.png'});
  await tap('#picker-go');check(await p.evaluate(()=>__mojo.state().prog[0]==='swop:dozer'&&__mojo.state().form==='normal'),width+' picker adds program step and preserves world until RUN');
 }
}catch(e){check(false,e.stack)}finally{await browser.close();fs.writeFileSync(out+'/result.json',JSON.stringify(checks,null,2));if(checks.some(x=>!x.ok))process.exitCode=1}
