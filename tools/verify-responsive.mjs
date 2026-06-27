/* M-302 responsive sweep — g14/g15/g14-side at phone/tablet/desktop sizes.
 * Drives a real race each, screenshots full frame. Check: on-rail, no clipping,
 * proportional scaling, 0 console errors. */
import puppeteer from 'puppeteer'
import path from 'path'; import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'qa-screenshots')
const wait = ms => new Promise(r => setTimeout(r, ms))
const SIZES = [[360,640,'phone'],[768,1024,'tabletP'],[1280,800,'desktop']]
const GAMES = [
  ['g14','balapan-kereta.html', async (p)=>{ await p.evaluate(()=>{const t=[...document.querySelectorAll('button,.cat-btn,[onclick]')].find(x=>/thomas|aeg|friends/i.test(x.textContent));if(t)t.click()}); await wait(600); await p.evaluate(()=>{const c=[...document.querySelectorAll('.train-card,[class*=card]')].find(x=>x.textContent.toLowerCase().includes('thomas'));if(c)c.click()}); await wait(350); await p.evaluate(()=>{const g=document.getElementById('go-btn');if(g)g.click()}); }],
  ['g15','lokomotif-pemberani.html', async (p)=>{ await p.evaluate(()=>{const c=[...document.querySelectorAll('[class*=card],[onclick]')].find(x=>x.textContent.toLowerCase().includes('thomas'));if(c)c.click()}); }],
  ['g14side','balapan-kereta-side.html', async (p)=>{ await p.evaluate(()=>{const s=[...document.querySelectorAll('button,[onclick]')].find(b=>/mulai|start|main/i.test(b.textContent));if(s)s.click()}); }],
]
const b = await puppeteer.launch({ headless:'new', args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'] })
const report = []
for (const [gid, file, drive] of GAMES) {
  for (const [w,h,label] of SIZES) {
    const p = await b.newPage(); await p.setViewport({ width:w, height:h })
    const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())})
    await p.goto('http://localhost:8081/games/'+file,{waitUntil:'domcontentloaded'}); await wait(2400)
    try { await drive(p) } catch(_){}
    await wait(5500)
    // horizontal overflow check
    const ov = await p.evaluate(()=>({ sx: window.scrollX, sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
    await p.screenshot({ path: path.join(OUT,`resp-${gid}-${label}.png`) })
    const clean = errs.filter(e=>!/404|favicon|Failed to load/i.test(e))
    report.push(`${gid}/${label} ${w}x${h} overflow=${ov.sw>ov.iw+2?('YES('+ov.sw+'>'+ov.iw+')'):'no'} errors=${clean.length}`)
    await p.close()
  }
}
console.log(report.join('\n'))
await b.close()
