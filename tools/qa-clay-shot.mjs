import puppeteer from 'puppeteer'
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']})
const p=await b.newPage(); await p.setViewport({width:820,height:1180,deviceScaleFactor:1})
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); p.on('pageerror',e=>errs.push('PE:'+e.message))
await p.goto('http://localhost:8081/index.html',{waitUntil:'domcontentloaded',timeout:30000})
await new Promise(r=>setTimeout(r,2200))
// go from welcome to the world map like a user
await p.evaluate(()=>{ try{ if(typeof showScreen==='function') showScreen('screen-menu') }catch(e){ console.error(e) } })
await new Promise(r=>setTimeout(r,1500))
// tile inventory (hard constraint: none lost)
const inv=await p.evaluate(()=>({
  zones: document.querySelectorAll('.wmap-zone').length,
  tiles: [...document.querySelectorAll('.wmap-node')].map(n=>n.id),
  visible: [...document.querySelectorAll('.wmap-node')].filter(n=>n.offsetParent!==null).length,
}))
console.log('zones:',inv.zones,'tiles:',inv.tiles.length,'visible:',inv.visible)
await p.screenshot({path:'tools/qa-out/clay-map.png',fullPage:false})
await p.evaluate(()=>window.scrollTo(0,0))
const root=await p.$('.wmap-root'); if(root){ await p.evaluate(()=>{document.querySelector('.wmap-root').scrollTop=0}) }
await p.screenshot({path:'tools/qa-out/clay-map-top.png'})
console.log('errors:',errs.filter(e=>!/favicon|net::ERR|Failed to load/i.test(e)))
await b.close()
