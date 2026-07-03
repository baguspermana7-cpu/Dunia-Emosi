import puppeteer from 'puppeteer'
import fs from 'fs'
const OUT='tools/qa-out'; fs.mkdirSync(OUT,{recursive:true})
const IGNORE=/favicon|pokemondb|showdown|net::ERR|Failed to load resource/i
const LEVEL = process.argv[2] ? +process.argv[2] : 2
const VPS=[[390,844,'portrait'],[844,390,'landscape'],[834,1112,'tabletP']]
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']})
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const res={}
for(const [w,h,tag] of VPS){
  const p=await b.newPage(); await p.setViewport({width:w,height:h,deviceScaleFactor:1})
  const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); p.on('pageerror',e=>errs.push('PE:'+e.message))
  await p.evaluateOnNewDocument((lv)=>{ localStorage.setItem('g14-tutorial-seen','1'); sessionStorage.setItem('g14-hinted','1'); sessionStorage.setItem('g14Config',JSON.stringify({level:lv,trainKey:'aeg_thomas',train:'aeg_thomas',difficulty:'easy'})) },LEVEL)
  await p.goto('http://localhost:8081/games/balapan-kereta.html',{waitUntil:'domcontentloaded',timeout:30000})
  await sleep(1800)
  await p.evaluate(()=>{try{const t=(typeof TRAIN_MAP!=='undefined'&&TRAIN_MAP['aeg_thomas'])||null;if(t){S.trainCfg={...t,variant:1};window.selectedTrainKey=t.key}if(typeof startRace==='function')startRace()}catch(e){}})
  await sleep(4000)
  await p.screenshot({path:`${OUT}/g14-L${LEVEL}-${tag}.png`})
  res[tag]={errors:errs.filter(e=>!IGNORE.test(e)).length}
  await p.close()
}
console.log(JSON.stringify(res,null,2))
await b.close()
