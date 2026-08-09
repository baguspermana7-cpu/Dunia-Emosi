import puppeteer from 'puppeteer';
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); await p.setViewport({width:1600,height:900});
await p.goto('http://127.0.0.1:8955/games/mobil.html',{waitUntil:'domcontentloaded',timeout:60000});
await new Promise(r=>setTimeout(r,5000));
console.log(await p.evaluate(()=>{
  const rows=[...document.querySelectorAll('button')].filter(x=>x.querySelector('img'))
    .map(x=>({label:(x.textContent||'').trim().slice(0,22), src:x.querySelector('img').getAttribute('src')}));
  const by={};
  rows.forEach(r=>{(by[r.src]=by[r.src]||[]).push(r.label)});
  return Object.entries(by).filter(([,v])=>v.length>1).map(([s,v])=>({file:s.split('/').pop(), pakai:v}));
}));
await b.close();
