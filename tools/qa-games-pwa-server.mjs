// Isolated nested-path fixture. Production files are read-only; only the served SW version changes.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.ttf':'font/ttf','.woff2':'font/woff2','.woff':'font/woff','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav','.mp4':'video/mp4'};
export function createFixture(){
 let revision=1,swDelay=0,port=0,server=null;
 const missing=[];
 function handle(req,res){
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);res.end();return}
  if(!pathname.startsWith('/Dunia-Emosi/')){res.writeHead(404);res.end('Outside test mount');return}
  const relative=pathname.slice('/Dunia-Emosi/'.length)||'index.html';
  const file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
  fs.stat(file,(err,stat)=>{
   if(err||!stat.isFile()){missing.push(pathname);res.writeHead(404);res.end('Missing fixture file');return}
   if(relative==='sw.js'){
    const source=fs.readFileSync(file,'utf8').replace(/const CACHE_VERSION = '([^']+)'/,(_,v)=>`const CACHE_VERSION = '${v}-qa${revision}'`);
    setTimeout(()=>{if(res.destroyed)return;res.writeHead(200,{'content-type':'text/javascript','cache-control':'no-store','service-worker-allowed':'/Dunia-Emosi/'});res.end(source)},swDelay);return
   }
   res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-cache'});
   fs.createReadStream(file).on('error',()=>res.destroy()).pipe(res);
  });
 }
 return {
  root,missing,
  async start(){if(server)return;server=http.createServer(handle);await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve)});port=server.address().port},
  async stop(){if(!server)return;const old=server;server=null;old.closeAllConnections();await new Promise(resolve=>old.close(resolve))},
  get base(){return `http://127.0.0.1:${port}/Dunia-Emosi/`},
  set revision(n){revision=n},set swDelay(ms){swDelay=ms}
 };
}
