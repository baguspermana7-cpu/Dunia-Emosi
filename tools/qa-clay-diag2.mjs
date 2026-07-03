import puppeteer from 'puppeteer'
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']})
const p=await b.newPage(); await p.setViewport({width:820,height:1180})
await p.goto('http://localhost:8081/index.html',{waitUntil:'domcontentloaded'})
await new Promise(r=>setTimeout(r,2200))
await p.evaluate(()=>{ try{ showScreen('screen-menu') }catch(e){} })
await new Promise(r=>setTimeout(r,1200))
const d=await p.evaluate(()=>{
  const doc=document
  const bottomEls=[...doc.querySelectorAll('#screen-menu *')].filter(e=>{
    const cs=getComputedStyle(e); const bg=cs.backgroundColor
    const r=e.getBoundingClientRect()
    return r.width>60 && /rgba?\((\d+),\s*(\d+)/.test(bg) && (()=>{const m=bg.match(/(\d+),\s*(\d+),\s*(\d+)/);return m&&+m[1]<60&&+m[2]<60})()
  }).slice(0,8).map(e=>({tag:e.tagName,cls:String(e.className).slice(0,50),id:e.id,txt:(e.innerText||'').slice(0,30)}))
  // fixed/absolute overlays outside screen-menu
  const fixedDark=[...doc.body.children].filter(e=>e.id!=='screen-menu').map(e=>({id:e.id,cls:String(e.className).slice(0,30),disp:getComputedStyle(e).display,bg:getComputedStyle(e).backgroundColor})).filter(x=>x.disp!=='none')
  return {bottomEls,fixedDark:fixedDark.slice(0,12)}
})
console.log(JSON.stringify(d,null,1))
await b.close()
