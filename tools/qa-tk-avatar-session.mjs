// Two real tabs: the active game remains bound to its child after hub switches profiles.
import puppeteer from 'puppeteer'
import assert from 'node:assert/strict'
const BASE=process.env.QA_URL||'http://localhost:8081'
const browser=await puppeteer.launch({headless:'new',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']})
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let passed=0
const check=(condition,message)=>{assert.ok(condition,message);passed++;console.log('PASS '+message)}
const errors=[]
try{
 const a=await browser.newPage();a.on('pageerror',e=>errors.push(e.message));await a.setViewport({width:1280,height:800})
 await a.goto(BASE+'/games/timmy-kapal.html',{waitUntil:'networkidle2'})
 await a.evaluate(()=>{localStorage.clear();localStorage.setItem('dunia-players',JSON.stringify([{animal:'lion'},{animal:'rabbit'}]));localStorage.setItem('dunia-active-slot','[0,1]');localStorage.setItem('dunia-avatar-rabbit-tk-v1',JSON.stringify({xp:900,settings:{sound:true}}));localStorage.setItem('tk-fleet-rabbit','tug');localStorage.setItem('tk-fleet-sailed-rabbit','["tug"]')})
 await a.reload({waitUntil:'networkidle2'});check(await a.evaluate(()=>_activeAvatarSlug()==='lion'),'first game binds Lion')
 await a.evaluate(()=>{__tk.set('reducedMotion',true);__tk.set('sound',true)})
 const b=await browser.newPage();b.on('pageerror',e=>errors.push(e.message));await b.goto(BASE+'/tools/tk-harness-grid.html?rm=1&coach=0')
 await b.evaluate(()=>localStorage.setItem('dunia-active-slot','[1,1]'))
 await b.goto(BASE+'/games/timmy-kapal.html',{waitUntil:'networkidle2'});check(await b.evaluate(()=>_activeAvatarSlug()==='rabbit'),'second game binds Rabbit')
 const rabbit=await b.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k.includes('rabbit')).map(k=>[k,localStorage.getItem(k)])))
 await a.bringToFront();await a.evaluate(()=>{__tk.set('grade','kelas2');TKFleet.save(TKFleet.avatar(),'titanic');TKFleet.markSailed(TKFleet.avatar(),'titanic');SoalEngine.one({game:'g30',domain:'matematika'});__tk.start('kamar',0);__tk.finish(3)})
 const owned=await a.evaluate(()=>({avatar:_activeAvatarSlug(),state:JSON.parse(localStorage.getItem('dunia-avatar-lion-tk-v1')),fleet:localStorage.getItem('tk-fleet-lion'),sailed:localStorage.getItem('tk-fleet-sailed-lion'),history:localStorage.getItem('soal-seen-lion'),progress:JSON.parse(localStorage.getItem('dunia-avatar-lion-progress'))}))
 check(owned.avatar==='lion'&&owned.state.settings.grade==='kelas2','game save still belongs to original Lion')
 check(owned.fleet==='titanic'&&JSON.parse(owned.sailed).includes('titanic'),'ship selection and sail history remain Lion owned')
 check(!!owned.history&&owned.progress.g30.completed.length>0,'question history and shared stars remain Lion owned')
 check(await b.evaluate(before=>Object.entries(before).every(([k,v])=>localStorage.getItem(k)===v),rabbit),'Rabbit saves, fleet and history are unchanged')
 // Actual parent gate and destructive-hold UI use the same locked save owner.
 await a.evaluate(()=>__tk.room('kapal'));await a.click('.tkh-room [data-act="back"]');await a.click('#btn-parent');await a.waitForSelector('#hold')
 const hold=await a.$('#hold');let box=await hold.boundingBox();await a.mouse.move(box.x+box.width/2,box.y+box.height/2);await a.mouse.down();await sleep(3150);await a.mouse.up();await a.waitForSelector('#reset')
 box=await (await a.$('#reset')).boundingBox();await a.mouse.move(box.x+box.width/2,box.y+box.height/2);await a.mouse.down();await sleep(3150);await a.mouse.up()
 check(await a.evaluate(()=>JSON.parse(localStorage.getItem('dunia-avatar-lion-tk-v1')).xp===0),'parent reset clears the original child game state')
 check(await b.evaluate(before=>Object.entries(before).every(([k,v])=>localStorage.getItem(k)===v),rabbit),'parent reset does not overwrite the newly selected Rabbit')
 await a.click('#par-ok')
 await a.evaluate(()=>{window.__activeCue=SFXEngine.cue('levelup');if(__activeCue)__activeCue.loop=true})
 await a.waitForFunction(()=>__activeCue&&!__activeCue.paused)
 await b.evaluate(()=>localStorage.setItem('dunia-emosi-sound','off'))
 await a.waitForFunction(()=>document.querySelector('#btn-sound').getAttribute('aria-pressed')==='false')
 check(await a.evaluate(()=>SFXEngine.getMute()===true&&__tk.save().settings.sound===true),'external global mute immediately mutes SFX without changing child preference')
 check(await a.evaluate(()=>__activeCue.paused&&SFXEngine.cue('correct')===null),'external global mute stops active audio and blocks future cues')
 await b.evaluate(()=>localStorage.setItem('dunia-emosi-sound','on'));await a.waitForFunction(()=>document.querySelector('#btn-sound').getAttribute('aria-pressed')==='true')
 check(await a.evaluate(()=>SFXEngine.getMute()===false),'external global unmute restores child sound preference')
 check(errors.length===0,'no page errors: '+errors.join(' | '))
 console.log(`qa-tk-avatar-session: ${passed} passed`)
}finally{await browser.close()}
