import puppeteer from 'puppeteer'
import fs from 'fs'
const OUT='tools/qa-out'; fs.mkdirSync(OUT,{recursive:true})
const IGNORE=/favicon|pokemondb|showdown|net::ERR|Failed to load resource/i
const VPS=[[844,390,'landscape'],[390,844,'portrait']]
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']})
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const res={}
for(const [w,h,tag] of VPS){
  const p=await b.newPage(); await p.setViewport({width:w,height:h,deviceScaleFactor:1})
  const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); p.on('pageerror',e=>errs.push('PE:'+e.message))
  await p.evaluateOnNewDocument(()=>{ sessionStorage.setItem('g14-side-train','aeg_thomas'); localStorage.setItem('g14s-tutorial-seen','1'); localStorage.setItem('dunia-side-bgleg','1') })
  await p.goto('http://localhost:8081/games/balapan-kereta-side.html',{waitUntil:'domcontentloaded',timeout:30000})
  await sleep(2000)
  // force-start past tutorial/countdown if needed
  await p.evaluate(()=>{ try{ if(typeof g14sTutorialFinish==='function') g14sTutorialFinish() }catch(e){} })
  await sleep(3500)
  await p.evaluate(()=>{ try{ if(typeof S!=='undefined') S.running=true }catch(e){} })
  await sleep(2500)
  await p.screenshot({path:`${OUT}/side-${tag}.png`})
  // zoom the player train
  res[tag]={errors:errs.filter(e=>!IGNORE.test(e)).length}
  await p.close()
}
console.log(JSON.stringify(res,null,2))
await b.close()
