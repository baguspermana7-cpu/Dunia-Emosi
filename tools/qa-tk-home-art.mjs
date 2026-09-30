// Character readability: first/returning home, short landscape plus approved portrait/desktop controls.
import puppeteer from 'puppeteer'
import fs from 'node:fs'
const browser=await puppeteer.launch({headless:'new',args:['--no-sandbox']})
const BASE=process.env.QA_URL||'http://localhost:8081/games/timmy-kapal.html'
const OUT=process.env.QA_SHOTS||'/tmp/timmy-resume/home-art'
fs.mkdirSync(OUT,{recursive:true});let passed=0,failed=0
const check=(ok,m)=>{ok?passed++:failed++;console.log((ok?'PASS ':'FAIL ')+m)}
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
try{
 for(const [width,height] of (process.env.QA_SIZES||'844x390,915x412,667x375,390x844,1280x800').split(',').map(s=>s.split('x').map(Number))){
  const p=await browser.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.setViewport({width,height,hasTouch:true,isMobile:width<1000})
  await p.goto(BASE,{waitUntil:'networkidle2'})
  for(const returning of [false,true]){
   await p.evaluate(returning=>{__tk.load({settings:{reducedMotion:true},seenIntro:returning,guide:returning?{home:1}:{}});__tk.room('kapal');document.querySelector('.tkh-room [data-act="back"]').click()},returning)
   await sleep(1800)
   const result=await p.evaluate(()=>{
    const el=document.querySelector('.home-timmy'),r=el.getBoundingClientRect()
    const short=innerWidth>innerHeight&&innerHeight<=520
    const body=short?r:{left:r.left+r.width*.15,right:r.right-r.width*.15,top:r.top+r.height*.22,bottom:r.top+r.height*.80}
    const overlap=[...document.querySelectorAll('#scr-home .hud,#scr-home .brand,#btn-start,#scr-home .tile,#scr-home .dock')].filter(e=>{const b=e.getBoundingClientRect();return b.width&&b.left<body.right-1&&b.right>body.left+1&&b.top<body.bottom-1&&b.bottom>body.top+1}).map(e=>e.id||e.className)
    const buttons=[...document.querySelectorAll('#scr-home button')].filter(e=>e.offsetWidth&&e.offsetHeight&&!e.closest('.carousel')).map(e=>({e,r:e.getBoundingClientRect()})).filter(({r})=>r.left<-1||r.right>innerWidth+1||r.top<-1||r.bottom>innerHeight+1).map(({e})=>e.id)
    const labels=[...document.querySelectorAll('.cat>span')].filter(e=>{const range=document.createRange();range.selectNodeContents(e);const t=range.getBoundingClientRect(),b=e.parentElement.getBoundingClientRect();return t.left<b.left-1||t.right>b.right+1}).map(e=>e.textContent)
    return {overlap,buttons,labels,whole:r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1,loaded:el.complete&&el.naturalWidth>0,scroll:document.scrollingElement.scrollWidth>innerWidth+1}
   })
   const tag=`${width}x${height}-${returning?'returning':'fresh'}`
   check(result.loaded&&result.whole,tag+' full character source is inside viewport')
   check(!result.overlap.length,tag+' face/torso clear of foreground controls: '+result.overlap.join(','))
   check(!result.buttons.length&&!result.scroll,tag+' home actions fit: '+result.buttons.join(','))
   check(!result.labels.length,tag+' category labels stay in their own buttons: '+result.labels.join(','))
   await p.screenshot({path:OUT+'/'+tag+'.png'})
  }
  check(!errors.length,`${width}x${height} no page errors: `+errors.join('|'));await p.close()
 }
 console.log(`qa-tk-home-art: ${passed} passed, ${failed} failed`);process.exitCode=failed?1:0
}finally{await browser.close()}
