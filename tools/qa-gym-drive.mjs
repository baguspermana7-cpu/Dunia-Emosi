import puppeteer from 'puppeteer'
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']})
const p=await b.newPage(); await p.setViewport({width:844,height:390})
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); p.on('pageerror',e=>errs.push('PE:'+e.message))
await p.goto('http://localhost:8081/games/gym-pokemon.html',{waitUntil:'domcontentloaded'})
await new Promise(r=>setTimeout(r,2500))
await p.evaluate(()=>{ const c=document.querySelector('.trainer-card:not(.locked)'); if(c)c.click() })
await new Promise(r=>setTimeout(r,2000))
// pick the first team card in the picker, then any confirm buttons that appear
for(const sel of ['#team-picker .tp-card, .tp-team, [id^=team-] .card, #team-picker div[onclick], .tim-card', '#tcf-go', '.tcf-cta-primary']){
  await p.evaluate((s)=>{ const el=document.querySelector(s); if(el) el.click() }, sel)
  await new Promise(r=>setTimeout(r,2000))
}
// fallback: click first visible clickable card containing 'Tim'
await p.evaluate(()=>{ const els=[...document.querySelectorAll('div,button')].filter(e=>/Tim Ash Kanto Awal/.test(e.innerText||'')&&e.offsetParent); const c=els[els.length-1]; if(c)c.click() })
await new Promise(r=>setTimeout(r,1800))
await p.evaluate(()=>{ const go=document.getElementById('tcf-go'); if(go&&go.offsetParent) go.click() })
await new Promise(r=>setTimeout(r,4000))
// dismiss any VS card / continue prompts
await p.evaluate(()=>{ const btns=[...document.querySelectorAll('button')].filter(b=>/mulai|lanjut|fight|maju/i.test(b.innerText)&&b.offsetParent); if(btns[0])btns[0].click() })
await new Promise(r=>setTimeout(r,3500))
await p.screenshot({path:'tools/qa-out/battle-arena-live.png'})
console.log('errors:',errs.filter(e=>!/favicon|net::ERR|Failed to load/i.test(e)).slice(0,4))
await b.close()
