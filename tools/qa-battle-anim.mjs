// A-317 animation verify: Serang! → quiz → answer → attack/damage frames
import puppeteer from 'puppeteer'
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']})
const p=await b.newPage(); await p.setViewport({width:844,height:390})
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); p.on('pageerror',e=>errs.push('PE:'+e.message))
await p.goto('http://localhost:8081/games/gym-pokemon.html',{waitUntil:'domcontentloaded'})
await sleep(2500)
await p.evaluate(()=>{ const c=document.querySelector('.trainer-card:not(.locked)'); if(c)c.click() })
await sleep(1500)
await p.evaluate(()=>{ const c=document.querySelector('.pkg-card'); if(c&&c.offsetParent)c.click() })
await sleep(1500)
await p.evaluate(()=>{ const f=document.getElementById('gw-fight'); if(f&&f.offsetParent)f.click() })
await sleep(1500)
await p.evaluate(()=>{ const g=document.getElementById('tcf-go'); if(g&&g.offsetParent)g.click() })
await sleep(6500)
await p.evaluate(()=>{ const a=document.querySelector('.bm-card[data-mode="adventure"]'); if(a&&a.offsetParent)a.click() })
await sleep(5000)
// click Serang!
await p.evaluate(()=>{ const s=[...document.querySelectorAll('button')].filter(b=>/serang/i.test(b.innerText)&&b.offsetParent)[0]; if(s)s.click() })
await sleep(900)
// pick the first MOVE from the move-select panel
await p.evaluate(()=>{ const mv=[...document.querySelectorAll('button')].filter(b=>/thunder|quick|tail|growl|tackle/i.test(b.innerText)&&b.offsetParent)[0]; if(mv)mv.click() })
await sleep(1000)
await p.screenshot({path:'tools/qa-out/anim-1-quiz.png'})   // quiz should float center + pills bottom
// answer the CORRECT pill (find via QuizEngine data — click each until correct class appears? click first pill)
const clicked=await p.evaluate(()=>{
  const q=document.getElementById('math-question'); const m=q?q.textContent.match(/(\d+)\s*([+\-×])\s*(\d+)/):null
  let ans=null; if(m){const a=+m[1],b2=+m[3]; ans=m[2]==='+'?a+b2:(m[2]==='-'?a-b2:a*b2)}
  const pills=[...document.querySelectorAll('.qz-pill')].filter(e=>e.offsetParent)
  const target=pills.find(p2=>p2.textContent.trim()==String(ans))||pills[0]
  if(target){target.click(); return {q:q&&q.textContent, picked:target.textContent}}
  return null
})
console.log('quiz:',JSON.stringify(clicked))
// burst frames during attack anim
for(let i=0;i<6;i++){ await sleep(350); await p.screenshot({path:`tools/qa-out/anim-2-atk${i}.png`}) }
await sleep(1500)
await p.screenshot({path:'tools/qa-out/anim-3-after.png'})
console.log('errors:',errs.filter(e=>!/favicon|net::ERR|Failed to load/i.test(e)).slice(0,4))
await b.close()
