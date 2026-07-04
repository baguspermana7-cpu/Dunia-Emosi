import puppeteer from 'puppeteer'
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']})
const p=await b.newPage(); await p.setViewport({width:900,height:500})
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); p.on('pageerror',e=>errs.push('PE:'+e.message))
await p.goto('http://localhost:8081/games/balapan-kereta.html',{waitUntil:'domcontentloaded'})
await sleep(2500)
// Force minimal running state and invoke the obstacle challenge directly.
const t=await p.evaluate(()=>{
  try{
    if(typeof S==='undefined') return 'no-S'
    S.running=true; S.gameOver=false; S.quizOpen=false
    if(typeof cfg==='object' && cfg) cfg.level=cfg.level||1
    g14ObstacleQuiz()
    return 'called'
  }catch(e){ return 'ERR:'+e.message }
})
await sleep(1000)
const st=await p.evaluate(()=>{
  const ovl=document.getElementById('quiz-ovl')
  return {
    ovlVisible: ovl && getComputedStyle(ovl).display!=='none',
    label:(document.getElementById('quiz-label')||{}).textContent||null,
    qText:(document.getElementById('quiz-q')||{}).textContent||null,
    qzPills:document.querySelectorAll('#quiz-choices .qz-pill, #quiz-choices button').length,
    oeDialog: !!document.querySelector('.oe-modal,.oe-dialog,[class*="obstacle-modal"]')
  }
})
console.log('OBSTACLE-QUIZ',t,JSON.stringify(st),'errors:',errs.filter(e=>!/favicon|net::ERR|Failed to load/i.test(e)).slice(0,3))
await p.screenshot({path:'tools/qa-out/g14-obstacle-quiz.png'})
await b.close()
