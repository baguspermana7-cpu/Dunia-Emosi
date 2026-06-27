/* M-302 — verify in-game facing for many AEG characters. Each should face RIGHT
 * (travel direction). Produces a labeled montage of player crops. */
import puppeteer from 'puppeteer'
import path from 'path'; import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'qa-screenshots')
const wait = ms => new Promise(r => setTimeout(r, ms))
const NAMES = ['Thomas','James','Percy','Hiro','Gordon','Edward','Winston','Sandy','Kana','Diesel','Ashima','Salty']
const b = await puppeteer.launch({ headless:'new', args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'] })
const errsAll = []
for (const name of NAMES) {
  const p = await b.newPage(); await p.setViewport({ width:412, height:915, deviceScaleFactor:2 })
  p.on('pageerror', e => errsAll.push(name+': '+e.message))
  await p.goto('http://localhost:8081/games/balapan-kereta.html',{waitUntil:'domcontentloaded'}); await wait(2300)
  await p.evaluate(()=>{const t=[...document.querySelectorAll('button,.cat-btn,[onclick]')].find(x=>/thomas|aeg|friends/i.test(x.textContent));if(t)t.click()}); await wait(600)
  const picked = await p.evaluate((nm)=>{const c=[...document.querySelectorAll('.train-card,[class*=card]')].find(x=>x.textContent.toLowerCase().includes(nm.toLowerCase()));if(c){c.click();return true}return false}, name)
  await wait(350)
  await p.evaluate(()=>{const g=document.getElementById('go-btn');if(g)g.click()}); await wait(6200)
  const faces = await p.evaluate(()=>{try{return S.trainCfg?S.trainCfg.faces:'?'}catch(e){return 'noS'}})
  const vp = p.viewport()
  await p.screenshot({ path: path.join(OUT,'facing-'+name+'.png'), clip:{ x:0, y:Math.round(vp.height*0.5), width:Math.round(vp.width*0.62), height:Math.round(vp.height*0.32) } })
  console.log(name.padEnd(9), 'picked='+picked, 'faces='+faces)
  await p.close()
}
console.log('ERRORS:', errsAll.slice(0,8))
await b.close()
