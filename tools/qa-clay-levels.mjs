// A-318 verify: g14 level select = clay station map, 40 station nodes
import puppeteer from 'puppeteer'
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']})
const p=await b.newPage(); await p.setViewport({width:540,height:1100})
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); p.on('pageerror',e=>errs.push('PE:'+e.message))
await p.goto('http://localhost:8081/index.html',{waitUntil:'domcontentloaded'})
await new Promise(r=>setTimeout(r,2500))
await p.evaluate(()=>{ try{ openLevelSelect(14) }catch(e){ console.error('OPEN:'+e.message) } })
await new Promise(r=>setTimeout(r,1500))
const st=await p.evaluate(()=>({
  clay: document.getElementById('screen-level').classList.contains('lvl-clay'),
  stations: document.querySelectorAll('.lvl-station').length,
  names: [...document.querySelectorAll('.lvl-stn-name')].slice(0,6).map(e=>e.textContent),
  tiersVisible: [...document.querySelectorAll('.lvl-tier-card')].filter(e=>e.offsetParent!==null).length,
}))
console.log(JSON.stringify(st))
await p.screenshot({path:'tools/qa-out/clay-levels-top.png'})
await p.evaluate(()=>{ const s=document.getElementById('screen-level'); s.scrollTop=s.scrollHeight })
await new Promise(r=>setTimeout(r,500))
await p.screenshot({path:'tools/qa-out/clay-levels-bottom.png'})
console.log('errors:',errs.filter(e=>!/favicon|net::ERR|Failed to load/i.test(e)).slice(0,3))
await b.close()
