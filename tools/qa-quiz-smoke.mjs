import puppeteer from 'puppeteer'
const IGNORE=/favicon|pokemondb|showdown|net::ERR|Failed to load resource/i
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox','--use-gl=swiftshader']})
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const out={}
for(const pg of ['balapan-kereta','gym-pokemon']){
  const p=await b.newPage(); const errs=[]
  p.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); p.on('pageerror',e=>errs.push('PE:'+e.message))
  await p.goto(`http://localhost:8081/games/${pg}.html`,{waitUntil:'domcontentloaded',timeout:30000})
  await sleep(2500)
  const probe=await p.evaluate(()=>{
    const r={hasEngine: typeof window.QuizEngine!=='undefined'}
    try{ const g=QuizEngine.generate({level:1}); r.gen={q:g.question, ans:g.answer, nOpt:g.options.length, hasAns:g.options.map(String).includes(String(g.answer))} }catch(e){ r.genErr=String(e) }
    // render into a scratch div and check pills
    try{ const d=document.createElement('div'); const d2=document.createElement('div'); document.body.append(d,d2)
      QuizEngine.fill(d,d2,{level:3},()=>{}); r.pills=d2.querySelectorAll('.qz-pill').length; r.qClass=d.classList.contains('qz-question') }catch(e){ r.fillErr=String(e) }
    return r
  })
  out[pg]={errors:errs.filter(e=>!IGNORE.test(e)), probe}
  await p.close()
}
console.log(JSON.stringify(out,null,2))
await b.close()
const bad=Object.values(out).some(o=>o.errors.length||!o.probe.hasEngine||o.probe.pills!==4)
process.exit(bad?1:0)
