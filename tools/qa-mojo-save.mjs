import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const p=await browser.newPage();const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function tap(s){await p.click(s);await sleep(40)}
async function child(index){await p.evaluate(i=>{localStorage.setItem('dunia-players',JSON.stringify([{animal:'lion'},{animal:'rabbit'}]));localStorage.setItem('dunia-active-slot',JSON.stringify([i,1]))},index);await p.reload({waitUntil:'networkidle0'});await p.waitForFunction(()=>window.__mojo?.ready)}
async function finish(id){await p.evaluate(id=>__mojo.start(id),id);await tap('#in-go');if(await p.$('#picker-later'))await tap('#picker-later');for(const c of await p.evaluate(()=>__mojo.solution()))await tap(`[data-cmd="${c}"]`);await tap('#btn-run');await p.waitForSelector('#ov-card.on #res-map')}
try{
 await p.goto('http://localhost:8081/games/mojo-swoptops.html?unlock=1',{waitUntil:'networkidle0'});await p.waitForFunction(()=>window.__mojo?.ready&&navigator.serviceWorker.controller);await sleep(500);
 await p.evaluate(()=>__mojo.start('m8'));await tap('#in-go');await tap('#picker-later');
 for(const c of ['swop:dozer','fwd','swop:jumper','jump'])await tap(`[data-cmd="${c}"]`);
 await tap('[data-slot="1"]');assert.ok(await p.$('[data-cmd="push"]'),'editing earlier slot offers preceding form capability');
 console.log('Editing earlier command follows its preceding SWOP capability PASS');
 await child(0);await finish('t1');assert.ok(await p.evaluate(()=>__mojo.save().lv.t1));
 await child(1);assert.deepEqual(await p.evaluate(()=>__mojo.save().lv),{});assert.equal(await p.evaluate(()=>__mojo.save().rewardBolts),0);await finish('t2');
 await child(0);assert.deepEqual(await p.evaluate(()=>Object.keys(__mojo.save().lv)),['t1']);
 await child(1);assert.deepEqual(await p.evaluate(()=>Object.keys(__mojo.save().lv)),['t2']);
 await p.evaluate(()=>__mojo.start('s1'));await tap('#in-go');await tap('#picker-later');
 const starRoute=await p.evaluate(()=>{const l=MojoLevels.byId('s1'),b=l.beats[0];return ProgGrid.solve(ProgGrid.prep(ProgGrid.world(l),l,0),b,{goal:{objectives:b.objectives.concat(l.optional)}})});
 assert.ok(starRoute);for(const c of starRoute)await tap(`[data-cmd="${c}"]`);await tap('#btn-run');
 for(let i=0;i<350;i++){if(await p.$('#ov-swop.on #sw-skip'))await tap('#sw-skip');if(await p.evaluate(()=>__mojo.save().cp?.beat===1))break;await sleep(100)}
 assert.equal(await p.evaluate(()=>__mojo.save().cp.gotStars.bintang),true);
 await p.reload({waitUntil:'networkidle0'});await p.waitForFunction(()=>window.__mojo?.ready);await p.evaluate(()=>__mojo.start('s1'));
 assert.equal(await p.evaluate(()=>__mojo.state().beat),1);assert.equal(await p.evaluate(()=>__mojo.save().cp.gotStars.bintang),true);assert.ok(await p.$('#g-star.have'));
 console.log('Actual optional star collected and retained after checkpoint reload PASS');
 console.log('Mojo two-child progress and reward isolation across reload PASS');
}finally{await browser.close()}
