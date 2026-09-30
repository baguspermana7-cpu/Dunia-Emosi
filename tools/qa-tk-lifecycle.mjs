// Real browser regression: grid pause/visibility/queued question + host hint checkpoint/replay.
import puppeteer from 'puppeteer'
import fs from 'node:fs'
import assert from 'node:assert/strict'
const BASE=process.env.QA_URL||'http://localhost:8081'
const SHOTS=process.env.QA_SHOTS||'/tmp/timmy-resume/lifecycle'
fs.mkdirSync(SHOTS,{recursive:true})
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const browser=await puppeteer.launch({headless:'new',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']})
let passed=0
const errors=[]
const check=(condition,message)=>{assert.ok(condition,message);passed++;console.log('PASS '+message)}
try{
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:1024,height:768})
 await page.goto(BASE+'/tools/tk-harness-grid.html?rm=1&coach=0',{waitUntil:'networkidle2'})
 const mount=async(question=false,reducedMotion=true)=>page.evaluate(({question,reducedMotion})=>{
   __h.destroy();window.__completed=[];window.__questions=0;window.__resolveQ=null
   __h=TKGrid.mount(document.querySelector('#host'),{id:'pause-regression',w:4,h:2,start:{x:0,y:0,dir:'E'},goal:{x:3,y:0},tools:['E'],q:question?[{x:1,y:0,type:'door'}]:[]},{reducedMotion,coach:false,onQuestion:()=>{__questions++;return new Promise(r=>__resolveQ=r)},onDone:r=>__completed.push(r)})
   __h.setProgram(['E','E','E']);__h.go()
 },{question,reducedMotion})
 await mount();await sleep(180);await page.evaluate(()=>__h.pause())
 const frozen=await page.evaluate(()=>__h.state().boat);await sleep(2000)
 check(await page.evaluate(p=>JSON.stringify(__h.state().boat)===JSON.stringify(p)&&__h.state().paused&&__completed.length===0,frozen),'manual pause holds grid position and completion')
 await page.evaluate(()=>__h.resume());await page.waitForFunction(()=>__completed.length===1,{timeout:15000});await sleep(500)
 check(await page.evaluate(()=>__completed.length===1),'resume completes once')
 await mount(true);await page.waitForFunction(()=>__questions===1)
 await page.evaluate(()=>{__h.pause();__resolveQ({correct:true})});await sleep(1000)
 check(await page.evaluate(()=>__h.state().paused&&__h.el.classList.contains('tkg--ask')&&__completed.length===0),'question resolving while paused stays queued')
 await page.evaluate(()=>__h.resume());await page.waitForFunction(()=>__completed.length===1,{timeout:15000})
 check(await page.evaluate(()=>__questions===1&&__completed.length===1),'queued question resumes once without asking again')
 await mount(false,false);await page.waitForFunction(()=>__h.state().done);await page.evaluate(()=>__h.pause());await sleep(1300)
 check(await page.evaluate(()=>__completed.length===0&&__h.el.getAnimations({subtree:true}).every(a=>a.playState!=='running')),'normal-motion reward animations and delayed completion freeze together')
 await page.evaluate(()=>__h.resume());await page.waitForFunction(()=>__completed.length===1,{timeout:15000})
 check(await page.evaluate(()=>__completed.length===1),'normal-motion reward resumes once')

 await mount();const other=await browser.newPage();await other.goto(BASE+'/tools/tk-harness-grid.html?rm=1&coach=0');await other.bringToFront()
 await page.waitForFunction(()=>document.hidden,{polling:50});const hidden=await page.evaluate(()=>__h.state().boat);await sleep(2000)
 check(await page.evaluate(p=>__h.state().paused&&JSON.stringify(__h.state().boat)===JSON.stringify(p)&&__completed.length===0,hidden),'actual background tab freezes grid')
 await page.evaluate(()=>__h.pause());await page.bringToFront();await sleep(500)
 check(await page.evaluate(()=>__h.state().paused&&__completed.length===0),'visibility restoration preserves explicit manual pause')
 await page.evaluate(()=>__h.resume());await page.waitForFunction(()=>__completed.length===1,{timeout:15000});await other.close()
 await mount();await sleep(160);await page.evaluate(()=>{__h.pause();__h.destroy()});await sleep(1500)
 check(await page.evaluate(()=>__completed.length===0),'destroy during pause cancels delayed completion')
 await page.goto(BASE+'/games/timmy-kapal.html',{waitUntil:'networkidle2'})
 await page.evaluate(()=>{__tk.reset();__tk.set('reducedMotion',true);__tk.set('sound',false);__tk.unlockAll()})
 const chapter=await page.evaluate(()=>{const w=TKWorlds.get('titanic');for(let i=0;i<w.levels.length;i++){const ch=w.levels[i];const k=ch.steps&&ch.steps.findIndex(s=>s.type==='grid');if(k>=0&&k<ch.steps.length-1)return {n:i+1,i:k,id:ch.id,steps:ch.steps.length}}})
 check(!!chapter,'real Titanic chapter contains a grid followed by later steps')
 await page.evaluate(c=>{const s=__tk.save();s.stars.titanic[c.id]=0;__tk.load(s)},chapter)
 await page.evaluate(c=>{__tk.chapter(c.n,Math.max(0,c.i-1));window.__beforeTransition=__tk.handle();__tk.stepDone(3);document.querySelector('#btn-pause').click()},chapter)
 await sleep(650)
 check(await page.evaluate(()=>__tk.handle()===__beforeTransition&&document.querySelector('#pause').classList.contains('show')),'chapter transition waits behind pause menu')
 await page.click('#p-resume');await page.waitForFunction(()=>__tk.handle()!==__beforeTransition)
 check(await page.evaluate(()=>!document.querySelector('#pause').classList.contains('show')),'chapter successor mounts after resume')

 await page.evaluate(c=>__tk.chapter(c.n,c.i),chapter);await page.waitForFunction(()=>__tk.handle()&&__tk.handle().level)
 await page.evaluate(()=>__tk.handle().hint())
 check(await page.evaluate(c=>__tk.save().chapterHints['titanic/'+c.id]===true,chapter),'hint is saved before grid completion')
 await page.reload({waitUntil:'networkidle2'});await page.evaluate(c=>__tk.chapter(c.n,c.i),chapter);await page.waitForFunction(()=>__tk.handle()&&__tk.handle().level)
 await page.evaluate(()=>{const h=__tk.handle();h.setProgram(h.level.solution);h.go()})
 await page.waitForFunction(c=>__tk.step()&&__tk.step().i>c.i,{timeout:30000},chapter)
 // The grid is genuinely played. Remaining steps are advanced through the existing QA seam to isolate aggregation/checkpoint behavior.
 for(let i=0;i<chapter.steps+1;i++){
  if(await page.evaluate(()=>__tk.state().screen==='scr-reward'))break
  await page.evaluate(()=>__tk.stepDone(3));await sleep(650)
 }
 check(await page.evaluate(c=>__tk.save().stars.titanic[c.id]===2,chapter),'reloaded hinted chapter is capped at two stars')
 await sleep(2500);await page.screenshot({path:SHOTS+'/hinted-chapter.png'})
 await page.evaluate(c=>__tk.chapter(c.n,c.i),chapter);await page.waitForFunction(()=>__tk.handle()&&__tk.handle().level)
 check(await page.evaluate(c=>!__tk.save().chapterHints['titanic/'+c.id],chapter),'fresh replay clears previous attempt hint flag')
 await page.evaluate(()=>{const h=__tk.handle();h.setProgram(h.level.solution);h.go()});await page.waitForFunction(c=>__tk.step()&&__tk.step().i>c.i,{timeout:30000},chapter)
 for(let i=0;i<chapter.steps+1;i++){if(await page.evaluate(()=>__tk.state().screen==='scr-reward'))break;await page.evaluate(()=>__tk.stepDone(3));await sleep(650)}
 check(await page.evaluate(c=>__tk.save().stars.titanic[c.id]===3,chapter),'fresh unhinted replay may earn three stars')
 await page.evaluate(()=>{const w=TKWorlds.get('kamar');__tk.start('kamar',w.levels.findIndex(l=>l.type==='grid'))})
 if(await page.$('.tks-skip'))await page.click('.tks-skip')
 await page.waitForFunction(()=>__tk.handle()&&__tk.handle().level)
 const started=Date.now()
 await page.evaluate(()=>{const h=__tk.handle();h.setProgram(h.level.solution);h.go()});await sleep(180);await page.click('#btn-pause')
 const hostFrozen=await page.evaluate(()=>__tk.handle().state().boat);await sleep(2100)
 check(await page.evaluate(p=>__tk.handle().state().paused&&JSON.stringify(__tk.handle().state().boat)===JSON.stringify(p)&&__tk.state().screen==='scr-play',hostFrozen),'real host pause button freezes a running board')
 await page.click('#p-resume');await page.waitForFunction(()=>__tk.state().screen==='scr-reward',{timeout:20000})
 const elapsed=await page.evaluate(()=>{const row=[...document.querySelectorAll('.tkh-card.res tr')].find(r=>/Waktu/.test(r.textContent));const m=row&&row.textContent.match(/(\d+):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):null})
 const wall=(Date.now()-started)/1000
 check(elapsed!==null&&elapsed<=wall-1.5,`reward excludes manual pause (${elapsed}s active of ${wall.toFixed(2)}s wall)`)

 check(errors.length===0,'no page errors: '+errors.join(' | '))
 console.log(`qa-tk-lifecycle: ${passed} passed`)
}finally{await browser.close()}
