import puppeteer from 'puppeteer'
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'
const ROOT='/home/baguspermana7/rz-work/Dunia-Emosi'
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.mp3':'audio/mpeg','.m4a':'audio/mp4','.ogg':'audio/ogg','.woff2':'font/woff2','.ttf':'font/ttf','.jz':'text/javascript','.svg':'image/svg+xml','.gif':'image/gif','.wasm':'application/wasm','.bin':'application/octet-stream','.fnt':'text/plain','.atlas':'text/plain','.webmanifest':'application/manifest+json','.jpeg':'image/jpeg'}
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f==='/')f='/index.html';const p=path.join(ROOT,f);fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});r.end(d)})})
await new Promise(res=>srv.listen(0,res)); const port=srv.address().port
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--mute-audio']})
const games=fs.readdirSync(ROOT+'/games/film').filter(s=>fs.existsSync(ROOT+'/games/film/'+s+'/index.html')).sort()
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
for(const g of games){
  const pg=await b.newPage(); await pg.setViewport({width:1600,height:1000,deviceScaleFactor:1})
  await pg.goto(`http://localhost:${port}/games/film/${g}/index.html`,{waitUntil:'domcontentloaded',timeout:60000}).catch(()=>{})
  await sleep(15000)
  const info=await pg.evaluate(()=>{
    const cs=[...document.querySelectorAll('canvas')]; let best=null,ba=0
    cs.forEach(c=>{const a=c.width*c.height; if(a>ba){ba=a;best=c}})
    const eng = window.PIXI?'pixi':(window.Phaser?'phaser':(window.createjs?'createjs':(window.C3||window.c3_runtimeInterface?'construct':'?')))
    return best? {backW:best.width,backH:best.height,cssW:Math.round(best.getBoundingClientRect().width),cssH:Math.round(best.getBoundingClientRect().height),eng}:{none:1,eng}
  })
  console.log(`${g.padEnd(26)} eng=${info.eng||'?'} backing=${info.backW||'-'}x${info.backH||'-'} css=${info.cssW||'-'}x${info.cssH||'-'}`)
  await pg.close()
}
await b.close(); srv.close(); console.log('DIM DONE')
