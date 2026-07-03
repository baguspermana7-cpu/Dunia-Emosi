import puppeteer from 'puppeteer'
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']})
const p=await b.newPage(); await p.setViewport({width:820,height:1180,deviceScaleFactor:1})
await p.goto('http://localhost:8081/index.html',{waitUntil:'domcontentloaded',timeout:30000})
await new Promise(r=>setTimeout(r,2200))
await p.evaluate(()=>{ try{ showScreen('screen-menu') }catch(e){} })
await new Promise(r=>setTimeout(r,1200))
await p.screenshot({path:'tools/qa-out/clay-fullpage.png',fullPage:true})
await b.close(); console.log('done')
