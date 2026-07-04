// A-317 drive: gym flow → live BattleArena screenshot (landscape + portrait)
import puppeteer from 'puppeteer'
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']})
for(const [w,h,tag] of [[844,390,'land'],[390,844,'port']]){
  const p=await b.newPage(); await p.setViewport({width:w,height:h})
  const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); p.on('pageerror',e=>errs.push('PE:'+e.message))
  await p.goto('http://localhost:8081/games/gym-pokemon.html',{waitUntil:'domcontentloaded'})
  await sleep(2500)
  await p.evaluate(()=>{ const c=document.querySelector('.trainer-card:not(.locked)'); if(c)c.click() })
  await sleep(1500)
  await p.evaluate(()=>{ const c=document.querySelector('.pkg-card'); if(c&&c.offsetParent)c.click() })
  await sleep(1500)
  await p.evaluate(()=>{ const f=document.getElementById('gw-fight'); if(f&&f.offsetParent)f.click() })
  await sleep(1500)
  await p.evaluate(()=>{ const g=document.getElementById('tcf-go'); if(g&&g.offsetParent)g.click() })
  await sleep(6500)   // VS card 3-2-1-FIGHT countdown → mode modal intercepts startBattle
  await p.evaluate(()=>{ const a=document.querySelector('.bm-card[data-mode="adventure"]'); if(a&&a.offsetParent)a.click() })
  await sleep(5000)   // battle boots
  await p.screenshot({path:`tools/qa-out/battle-live-${tag}.png`})
  // battle state probe
  const st=await p.evaluate(()=>({
    baScene: !!document.querySelector('[class*="ba-"]'),
    imgs: [...document.querySelectorAll('img')].filter(i=>i.offsetParent&&i.naturalWidth>10&&/pokemon|showdown|pokemondb/i.test(i.src)).length,
    mathVisible: (()=>{const q=document.getElementById('math-question');return q&&q.offsetParent?q.textContent:null})(),
    // v56.8 B-292 — trainer portraits restored: both must be visible w/ >0 rect
    portraitPlayer: (()=>{const e=document.getElementById('portrait-player');if(!e)return null;const r=e.getBoundingClientRect();const cs=getComputedStyle(e);return {w:Math.round(r.width),h:Math.round(r.height),shown:cs.display!=='none'&&r.width>0,loaded:e.naturalWidth>10}})(),
    portraitEnemy: (()=>{const e=document.getElementById('portrait-enemy'),fb=document.getElementById('portrait-enemy-fb');const pick=(el)=>{if(!el)return null;const r=el.getBoundingClientRect();const cs=getComputedStyle(el);return cs.display!=='none'&&r.width>0?{w:Math.round(r.width),h:Math.round(r.height)}:null};return pick(e)||pick(fb)})(),
    nameEnemy: (()=>{const e=document.getElementById('trainer-name-enemy');if(!e)return null;const r=e.getBoundingClientRect();return getComputedStyle(e).display!=='none'&&r.width>0?e.textContent:null})(),
  }))
  console.log(tag, JSON.stringify(st), 'errors:', errs.filter(e=>!/favicon|net::ERR|Failed to load/i.test(e)).slice(0,3))
  await p.close()
}
await b.close()
