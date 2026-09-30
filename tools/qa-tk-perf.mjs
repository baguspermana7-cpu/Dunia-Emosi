// Focused reproduction of the unchanged performance budgets in qa-tk-steer.mjs.
// Each viewport gets a fresh Chromium process; optional profiling runs AFTER the measured window.
import puppeteer from 'puppeteer'
import fs from 'node:fs'
const BASE = process.env.QA_URL || 'http://localhost:8081/tools/tk-harness-steer.html'
const OUT = process.env.QA_SHOTS || '/tmp/timmy-resume/perf'
fs.mkdirSync(OUT,{recursive:true})
const sleep = ms => new Promise(r=>setTimeout(r,ms))
let failed=0
const AUTOPILOT = () => {
  window.__autoStop && window.__autoStop()
  const h = window.__h
  const L = document.querySelector('.tks-left-btn'), R = document.querySelector('.tks-right-btn')
  const range = document.querySelector('.tks-range')
  let cur = 0
  const ev = (btn, type) => btn.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true }))
  const set = d => {
    if (d === cur) return
    if (cur === -1) ev(L, 'pointerup'); if (cur === 1) ev(R, 'pointerup')
    if (d === -1) ev(L, 'pointerdown'); if (d === 1) ev(R, 'pointerdown')
    cur = d
  }
  const norm = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a }
  window.__presses = 0
  const id = setInterval(() => {
    const s = h.state()
    if (s.sent) { set(0); clearInterval(id); return }
    const want = Math.atan2(s.aimX - s.x, -(s.aimY - s.y))
    const e = norm(want - (s.heading + s.yaw * (s.lag + 0.5)))   // + ~0.5 s for the wheel to ramp
    const d = e > 0.02 ? 1 : e < -0.02 ? -1 : 0
    if (d !== cur && d !== 0) window.__presses++
    set(d)
    if (range && s.sailOpt != null && Math.abs(+range.value - s.sailOpt) > 4) {
      range.value = String(Math.round(s.sailOpt)); range.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }, 50)
  window.__autoStop = () => { clearInterval(id); set(0) }
}

const WATCH = () => {
  window.__bad = []
  const re = /gagal|kalah|game over|failed/i
  const scan = () => { const t = document.body.innerText; if (re.test(t)) window.__bad.push(t.slice(0, 200)) }
  new MutationObserver(scan).observe(document.body, { subtree: true, childList: true, characterData: true })
  scan()
}

const measure = ms => new Promise(resolve=>{
  const samples=[],long=[];let last=performance.now();const start=last
  const po=new PerformanceObserver(list=>list.getEntries().forEach(e=>long.push(e.duration)))
  po.observe({type:'longtask',buffered:false})
  requestAnimationFrame(function step(now){samples.push(now-last);last=now;if(now-start<ms)requestAnimationFrame(step);else{po.disconnect();samples.sort((a,b)=>a-b);resolve({median:samples[samples.length>>1],p90:samples[Math.floor(samples.length*.9)],p95:samples[Math.floor(samples.length*.95)],long,n:samples.length})}})
})
for(const [width,height,query,settle,kind] of [
 [1024,768,'mode=ice&vessel=liner&len=3200&seed=3&muted=1',6000,'budget'],
 [1280,800,'mode=ice&theme=night&ship=titanic&seed=3&muted=1&cd=0&len=6000',2500,'polish']
]){
 const browser=await puppeteer.launch({headless:'new',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']})
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.setViewport({width,height,isMobile:width<900,hasTouch:true})
  await page.goto(BASE+'?'+query,{waitUntil:'networkidle2'});if(process.env.QA_WATCH!=='0')await page.evaluate(WATCH);await page.evaluate(AUTOPILOT);await sleep(settle)
  const cdp=await page.createCDPSession()
  const normal=kind==='polish'?await page.evaluate(measure,5000):null
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await sleep(kind==='polish'?4500:2500)
  const slow=await page.evaluate(measure,kind==='polish'?5000:3000)
  const state=await page.evaluate(()=>__h.state())
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:1})
  const ok=kind==='budget'?Math.round(1000/slow.p90)>=24:normal.median<=20&&normal.long.length===0&&slow.p95<=50&&slow.long.filter(v=>v>50).length===0
  const result={width,height,query,normal,slow,quality:state.quality,errors,ok}
  console.log(JSON.stringify(result));fs.writeFileSync(`${OUT}/${width}-${kind}.json`,JSON.stringify(result,null,2))
  if(!ok||errors.length)failed++
  if(process.env.QA_PROFILE==='1'){
   await cdp.send('Profiler.enable');await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Profiler.start');await sleep(5000)
   const {profile}=await cdp.send('Profiler.stop');await cdp.send('Emulation.setCPUThrottlingRate',{rate:1})
   fs.writeFileSync(`${OUT}/${width}.cpuprofile`,JSON.stringify(profile))
   await page.tracing.start({path:`${OUT}/${width}-trace.json`,categories:['devtools.timeline','disabled-by-default-devtools.timeline','blink.user_timing']});await sleep(3000);await page.tracing.stop()
  }
  await page.screenshot({path:`${OUT}/${width}.png`})
 }finally{await browser.close()}
}
console.log(`qa-tk-perf: ${failed} failed`);process.exitCode=failed?1:0
