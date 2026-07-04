import puppeteer from 'puppeteer'
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']})
for(const [url,tag] of [['index.html','index'],['games/balapan-kereta.html','g14'],['games/gym-pokemon.html','gym']]){
  const p=await b.newPage(); await p.setViewport({width:900,height:500})
  const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); p.on('pageerror',e=>errs.push('PE:'+e.message))
  await p.goto('http://localhost:8081/'+url,{waitUntil:'domcontentloaded'}); await sleep(2500)
  const info=await p.evaluate(()=>({ w:innerWidth,h:innerHeight, sx:document.documentElement.scrollWidth-innerWidth, bodyH:document.body.scrollHeight }))
  await p.screenshot({path:`tools/qa-out/land-${tag}.png`})
  console.log(tag,JSON.stringify(info),'errors:',errs.filter(e=>!/favicon|net::ERR|Failed to load/i.test(e)).slice(0,2))
  await p.close()
}
await b.close()
