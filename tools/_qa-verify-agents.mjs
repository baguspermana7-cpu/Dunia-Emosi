// The agents died without reporting. Re-measure the headline claims they were
// told to fix, at the viewports that matter, against the numbers on record.
import puppeteer from 'puppeteer';
const b = await puppeteer.launch({headless:'new',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const VP = [[1600,900],[2400,1080],[1024,600]];

async function at(page, url, fn, wait=5000){
  const p = await b.newPage();
  await p.setViewport({width:page[0],height:page[1],deviceScaleFactor:1});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,90)));
  await p.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await new Promise(r=>setTimeout(r,wait));
  const out = await p.evaluate(fn);
  await p.close();
  return {out, errs};
}

// 1) selamatkan-kereta: overlapping picker cards (on record: 657 at every viewport)
for (const vp of VP){
  const {out,errs} = await at(vp,'http://127.0.0.1:8955/games/selamatkan-kereta.html', ()=>{
    try{ if (typeof g16OpenPicker!=='undefined') g16OpenPicker(); }catch(e){}
    const cards=[...document.querySelectorAll('.ts-card')];
    let ov=0;
    for(let i=0;i<cards.length;i++){
      const a=cards[i].getBoundingClientRect();
      for(let j=i+1;j<cards.length;j++){
        const c=cards[j].getBoundingClientRect();
        if(Math.max(0,Math.min(a.right,c.right)-Math.max(a.left,c.left))>2 &&
           Math.max(0,Math.min(a.bottom,c.bottom)-Math.max(a.top,c.top))>2) ov++;
      }
    }
    return {cards:cards.length, overlap:ov};
  }, 6000);
  console.log(`selamatkan ${vp[0]}x${vp[1]}  kartu=${out.cards} bertumpuk=${out.overlap} ${out.overlap===0?'(sebelumnya 657)':'MASIH BERTUMPUK'} err=${errs.length}`);
}

// 2) museum: grid width use (on record: 28% of 1600, 18% of 2400)
for (const vp of [[1600,900],[2400,1080]]){
  const {out} = await at(vp,'http://127.0.0.1:8955/games/museum-kereta.html', ()=>{
    const g=document.querySelector('.mk-grid,.grid,#grid,[class*="grid"]');
    const cards=document.querySelectorAll('[class*="card"]');
    let above=0; cards.forEach(c=>{const r=c.getBoundingClientRect(); if(r.top<innerHeight&&r.bottom>0)above++;});
    return {gw: g?Math.round(g.getBoundingClientRect().width):null, vw:innerWidth, cards:cards.length, above};
  });
  const pct = out.gw? Math.round(out.gw/out.vw*100):null;
  console.log(`museum ${vp[0]}   grid=${out.gw}px (${pct}% lebar)  kartu terlihat=${out.above}/${out.cards}`);
}

// 3) mobil: distinct pictures across picker buttons (on record: 17 of 20)
{
  const {out} = await at([1600,900],'http://127.0.0.1:8955/games/mobil.html', ()=>{
    const im=[...document.querySelectorAll('button img,[class*="pick"] img')].map(e=>e.getAttribute('src'));
    return {n:im.length, distinct:new Set(im).size};
  });
  console.log(`mobil    tombol bergambar=${out.n} gambar berbeda=${out.distinct} ${out.n&&out.distinct===out.n?'(semua unik)':'(masih ada kembar)'}`);
}
await b.close();
