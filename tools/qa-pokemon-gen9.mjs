// v56.0 B-289 gate — every hyphenated Gen-9 species must RENDER from the local bundle
// (these were the guaranteed-dice cases), and gym-pokemon must boot with 0 errors.
import puppeteer from 'puppeteer'
import fs from 'fs'
const IGNORE=/favicon|net::ERR_INTERNET|Failed to load resource.*(showdown|pokemondb)/i
const db=JSON.parse(fs.readFileSync('assets/Pokemon/pokemon-db.json','utf8'))
const hyph=db.filter(e=>e.slug.includes('-')&&e.gen===9)
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']})
const p=await b.newPage()
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); p.on('pageerror',e=>errs.push('PE:'+e.message))
await p.goto('http://localhost:8081/games/gym-pokemon.html',{waitUntil:'domcontentloaded',timeout:30000})
await new Promise(r=>setTimeout(r,2500))
const results=await p.evaluate(async(list)=>{
  const load=(u)=>new Promise(res=>{const i=new Image();i.onload=()=>res(i.naturalWidth>10);i.onerror=()=>res(false);i.src=u})
  const out=[]
  for(const e of list){
    const us=e.slug.replace(/-/g,'_')
    const ok=await load(`../assets/Pokemon/pokemondb_hd_alt2/${String(e.id).padStart(4,'0')}_${us}.webp`)
    out.push({slug:e.slug,ok})
  }
  return out
}, hyph)
const bad=results.filter(r=>!r.ok)
const realErrs=errs.filter(e=>!IGNORE.test(e))
console.log(`hyphenated Gen-9 tested: ${results.length}, failed: ${bad.length}`, bad)
console.log('page errors:', realErrs.length, realErrs.slice(0,3))
await b.close()
process.exit(bad.length||realErrs.length?1:0)
