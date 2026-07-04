import puppeteer from 'puppeteer'
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']})
const p=await b.newPage(); await p.setViewport({width:390,height:844})
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); p.on('pageerror',e=>errs.push('PE:'+e.message))
p.on('dialog',d=>d.accept())
await p.goto('http://localhost:8081/games/gym-pokemon.html',{waitUntil:'domcontentloaded'})
await sleep(2500)
await p.evaluate(()=>{document.querySelector('.trainer-card:not(.locked)')?.click()}); await sleep(1500)
await p.evaluate(()=>{const c=document.querySelector('.pkg-card');if(c&&c.offsetParent)c.click()}); await sleep(1500)
await p.evaluate(()=>{const f=document.getElementById('gw-fight');if(f&&f.offsetParent)f.click()}); await sleep(1500)
await p.evaluate(()=>{const g=document.getElementById('tcf-go');if(g&&g.offsetParent)g.click()}); await sleep(6500)
await p.evaluate(()=>{document.querySelector('.bm-card[data-mode="tournament"]')?.click()}); await sleep(2000)
const st=await p.evaluate(()=>({
  tourRoot: !!document.querySelector('.bm-tour'),
  baHidden: (()=>{const e=document.querySelector('.ba-backdrop');return e?getComputedStyle(e).display==='none':null})(),
}))
await p.screenshot({path:'tools/qa-out/tour-mount.png'})
// back out of tournament
await p.evaluate(()=>{const x=document.querySelector('.bm-tour .bm-back,[data-bm-cancel]');if(x)x.click()}); await sleep(1500)
const rest=await p.evaluate(()=>({
  tourGone: !document.querySelector('.bm-tour'),
  baRestored: (()=>{const e=document.querySelector('.ba-backdrop');return e?getComputedStyle(e).display:null})(),
}))
console.log('TOUR',JSON.stringify(st),JSON.stringify(rest),'errors:',errs.filter(e=>!/favicon|net::ERR|Failed to load/i.test(e)).slice(0,3))
await b.close()
