import puppeteer from 'puppeteer'
const IGNORE=/favicon|net::ERR|Failed to load resource/i
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox','--use-gl=swiftshader']})
const p=await b.newPage(); await p.setViewport({width:1100,height:900,deviceScaleFactor:1})
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); p.on('pageerror',e=>errs.push('PE:'+e.message))
await p.goto('http://localhost:8081/plan-pokemon-parallax.html',{waitUntil:'networkidle2',timeout:30000})
await new Promise(r=>setTimeout(r,2500))
await p.screenshot({path:'tools/qa-out/pokeparallax-run.png'})
// switch scenes
for(const [i,name] of [[1,'sea'],[2,'gym']]){
  await p.evaluate(s=>document.querySelector(`.scene-btn[data-scene="${s}"]`).click(), i)
  await new Promise(r=>setTimeout(r,1800))
  await p.screenshot({path:`tools/qa-out/pokeparallax-${name}.png`})
}
const real=errs.filter(e=>!IGNORE.test(e))
console.log(JSON.stringify({errors:real.length, sample:real.slice(0,5)},null,2))
await b.close(); process.exit(real.length?1:0)
