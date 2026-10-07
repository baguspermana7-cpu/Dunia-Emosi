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
  check(await p.evaluate(()=>document.querySelectorAll('.region').length===6&&document.querySelectorAll('button.region').length===6&&MojoLevels.REGIONS.every(r=>r.levels.length>=5)),width+' six geographic places, every one a real region with >= 5 missions (owner bug 2026-10-04)');
  check(await p.evaluate(()=>!/Segera/i.test(document.querySelector('#scr-regions').textContent)&&!document.querySelector('.map-pin.locked')),width+' no region card or pin says "Segera hadir" any more');
  await p.screenshot({path:out+'/'+width+'-map.png'});
  await p.evaluate(()=>__mojo.start('m8'));await tap('#in-go');await sleep(150);
  check(await p.$$eval('.form-badge',bs=>bs.some(b=>b.textContent==='Paling Tepat')&&bs.some(b=>b.textContent==='Bisa Juga')),width+' selector distinguishes strongest and alternative forms');
  check(await p.$$eval('.form-badge',bs=>bs.filter(b=>/Paling Tepat|Bisa Juga/.test(b.textContent)).every(b=>{const r=b.getBoundingClientRect(),p=b.closest('.picker-forms').getBoundingClientRect();return r.top>=p.top&&r.bottom<=p.bottom})),width+' both recommended and alternative badges are visible without scrolling');
  await tap('[data-form="dozer"]');check(await p.$eval('#picker-go',b=>!b.disabled),width+' selecting allowed form enables clear next action');await p.screenshot({path:out+'/'+width+'-picker.png'});
  await tap('#picker-go');check(await p.evaluate(()=>__mojo.state().prog[0]==='swop:dozer'&&__mojo.state().form==='normal'),width+' picker adds program step and preserves world until RUN');
 }

 // ── everything open (owner decision 2026-10-06 "make everything open"): no ?unlock, real saves ──
 {
  const q=await browser.newPage();await q.setViewport({width:1280,height:800});
  await q.goto('http://localhost:8081/games/mojo-swoptops.html',{waitUntil:'networkidle0'});await q.waitForFunction(()=>window.__mojo?.ready);
  const R=await q.evaluate(()=>MojoLevels.REGIONS.map(r=>({id:r.id,title:r.title,levels:r.levels})));
  async function withSave(lv){await q.evaluate(lv=>{avatarScopedSet('dunia-g31-mojo',JSON.stringify({v:1,lv}))},lv);await q.reload({waitUntil:'networkidle0'});await q.waitForFunction(()=>window.__mojo?.ready);await sleep(200);await q.evaluate(()=>__mojo.home());const b=await q.$('#btn-levels');await b.click();await sleep(250);return q.$$eval('.region',bs=>bs.map(b=>({id:b.dataset.region,open:b.tagName==='BUTTON',text:b.textContent})))}
  async function tiles(){const out={};for(const r of R){await q.evaluate(id=>__mojo.map(id),r.id);await sleep(120);out[r.id]=await q.$$eval('.lvl',bs=>bs.map(b=>({id:b.dataset.level,lock:b.classList.contains('lock')||!!b.querySelector('.lk')})))}return out}
  const done=ids=>Object.fromEntries(ids.map(id=>[id,{stars:1,t:1}]));
  for(const [name,save] of [['fresh save',{}],["the owner's save (Kota 12/12, Pelabuhan 4/4)",done(['t1','t2','t3','t4','t5','t6','t7','m1','m2','m3','m4','s1','m5','m6','m7','m8'])]]){
   const cards=await withSave(save);
   check(cards.length===6&&cards.every(c=>c.open&&!/Segera|Selesaikan|terkunci/i.test(c.text))&&!(await q.$('.region.locked, .map-pin.locked')),name+': all six regions are open, no lock and no "Segera" on any card or pin');
   const t=await tiles();
   check(R.every(r=>t[r.id].length===r.levels.length&&r.levels.length>=5&&t[r.id].every(x=>!x.lock)),name+': every level tile in every region is open ('+R.map(r=>r.id+' '+t[r.id].length).join(', ')+')');
  }
  {const cards=await withSave(done(['t1']));check(cards[0].text.includes('1/36')&&cards[0].text.includes('1/12 misi'),'stars and progress still show on the region card: '+cards[0].text.replace(/\s+/g,' ').slice(0,60))}
  await q.evaluate(()=>__mojo.map('pulau'));await sleep(150);await (await q.$('[data-level="p6"]')).click();await sleep(300);
  check(await q.evaluate(()=>__mojo.state()?.id==='p6'),'a fresh child can start the last mission of the last region (Pulau Ceria p6) straight away');
  await q.screenshot({path:out+'/all-open.png'});
  await q.evaluate(()=>avatarScopedRemove('dunia-g31-mojo'));await q.close();
 }
}catch(e){check(false,e.stack)}finally{await browser.close();fs.writeFileSync(out+'/result.json',JSON.stringify(checks,null,2));if(checks.some(x=>!x.ok))process.exitCode=1}
