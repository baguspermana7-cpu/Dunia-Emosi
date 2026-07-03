import puppeteer from 'puppeteer'
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']})
const p=await b.newPage(); await p.setViewport({width:820,height:1180,deviceScaleFactor:1})
await p.goto('http://localhost:8081/index.html',{waitUntil:'domcontentloaded',timeout:30000})
await new Promise(r=>setTimeout(r,2200))
await p.evaluate(()=>{ try{ showScreen('screen-menu') }catch(e){} })
await new Promise(r=>setTimeout(r,1000))
const d=await p.evaluate(()=>{
  const el=document.elementFromPoint(410,1150)
  const bg=(e)=>getComputedStyle(e).backgroundColor+' | '+getComputedStyle(e).backgroundImage.slice(0,60)
  const sm=document.querySelector('#screen-menu')
  return {
    at1150: el? el.className||el.id||el.tagName : null,
    at1150bg: el? bg(el):null,
    bodyBg: bg(document.body),
    htmlBg: bg(document.documentElement),
    smScroll: sm? {sh:sm.scrollHeight, ch:sm.clientHeight, oy:getComputedStyle(sm).overflowY} : null,
    wr: (()=>{const w=document.querySelector('.wmap-root');return w?{sh:w.scrollHeight,ch:w.clientHeight,oy:getComputedStyle(w).overflowY,h:w.offsetHeight}:null})(),
  }
})
console.log(JSON.stringify(d,null,1))
await b.close()
