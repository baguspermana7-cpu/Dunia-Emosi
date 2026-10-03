import puppeteer from 'puppeteer';
const out=process.env.OUT||'/tmp/claude-1000/-home-baguspermana7/006f0cec-d381-48ee-882e-83cf434d8153/scratchpad/mojo-chase/smoke';
const [W,H]=(process.env.S||'1280x800').split('x').map(Number); const stage=process.env.ST||'pantai';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const b=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--ignore-gpu-blocklist'].concat((process.env.GA||'').split(' ').filter(Boolean))});
const p=await b.newPage(); await p.setViewport({width:W,height:H});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error'||m.type()==='warn')errs.push(m.text())}); p.on('response',r=>{if(r.status()>=400)errs.push(r.status()+' '+r.url())});
await p.goto('http://localhost:8081/games/mojo-swoptops.html?unlock=1&chase=1'+(process.env.CPU?'&cpu=1':''),{waitUntil:'networkidle2'});
await p.waitForFunction(()=>window.MojoChaseMenu&&window.__mojo);
await p.evaluate(()=>{const b=document.querySelector('#scr-splash .splash-stage>.btn'); if(b) b.click()}); await sleep(300);
await p.click('#btn-race'); await sleep(500); await p.screenshot({path:`${out}/${W}-menu.png`});
const e=await p.evaluate(s=>{try{document.querySelector('.race-card[data-stage="'+s+'"]').click();return 'ok'}catch(x){return x.stack}},stage);
console.log('click',e);
await sleep(2500);
console.log('host',await p.evaluate(()=>{const h=document.getElementById('chase-host');return h?h.className+' '+h.children.length:'nohost'}),errs);
await p.waitForSelector('#mc-go',{timeout:15000}); await sleep(400); await p.screenshot({path:`${out}/${W}-${stage}-intro.png`});
await p.click('#mc-go'); await sleep(1500); await p.screenshot({path:`${out}/${W}-${stage}-start.png`});
await p.evaluate(m=>__mojoChase.auto({mode:m,boost:true}),process.env.M||'clean');
if(process.env.OFF)await p.evaluate(o=>localStorage.off=o,process.env.OFF);
if(process.env.Q){await p.evaluate(q=>{__mojoChase.quality(+q,true);window.__mcOff=JSON.parse(localStorage.off||'{}');window.__mcFlush=1;__mojoChase.profile(true)},process.env.Q)}
for(let i=0;i<(+process.env.N||40);i++){ await sleep(2500); if(i<14)await p.screenshot({path:`${out}/${W}-${stage}-t${i}.png`}); const s=await p.evaluate(()=>__mojoChase.state()); console.log(i, s.state, s.prog.toFixed(2), 'hits',s.hits,'stars',s.stars,'rocket',s.rocket,'q',s.quality,'fm',s.frameMedian.toFixed(1),'work',JSON.stringify(s.workMedian), 'miss',s.missing.join(','), s.prof?JSON.stringify(Object.fromEntries(Object.entries(s.prof).map(([k,v])=>[k,+v.toFixed(1)]))):''); if(s.state==='result'||s.state==='done')break }
await p.screenshot({path:`${out}/${W}-${stage}-end.png`});
console.log('errors',errs.slice(0,10));
await b.close();
