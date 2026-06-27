import puppeteer from 'puppeteer'
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']})
const wait=ms=>new Promise(r=>setTimeout(r,ms))
for(const t of ['day','rain','sore','malam']){
  const p=await b.newPage(); await p.setViewport({width:1280,height:720,deviceScaleFactor:1})
  const errs=[]; p.on('pageerror',e=>errs.push(String(e))); p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,100))})
  await p.goto('http://localhost:8081/tools/indo-scene-harness.html?t='+t,{waitUntil:'domcontentloaded'})
  await p.waitForFunction(()=>window.__ready===true,{timeout:6000}).catch(()=>{})
  await wait(1500)
  await p.screenshot({path:`tools/qa-screenshots/indo-${t}.png`})
  console.log(t, errs.length?('ERR: '+errs.slice(0,2).join(' | ')):'ok')
  await p.close()
}
await b.close()
