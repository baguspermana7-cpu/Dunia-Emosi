import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
const src=fs.readFileSync(new URL('../games/timmy-kapal.js',import.meta.url),'utf8')
const extract=name=>{const m=src.match(new RegExp('^  function '+name+' \\([^\\n]*\\) \\{\\n[\\s\\S]*?^  \\}','m'));assert.ok(m,name);return m[0]}
let queued,mounts=0,oldPauses=0
const host={innerHTML:''},old={pause(){oldPauses++},resume(){},destroy(){}}
const ctx={Date,console,PLAYING:{lv:{steps:[{type:'grid'},{type:'grid'}]},chap:{i:0},handle:old,w:{},k:0},document:{hidden:false,body:{classList:{remove(){}}}},$:()=>host,hostFade:(h,out,fn)=>{if(out)queued=fn},mode(){},chapter(){},stepChip(){},modsMissing:()=>null,runPlayer(){mounts++;ctx.PLAYING.handle={pause(){},resume(){},destroy(){}}}}
vm.createContext(ctx);vm.runInContext(['runStep','pausePlay','playIdle'].map(extract).join('\n'),ctx)
ctx.runStep(1,false);ctx.pausePlay('menu',true);queued()
assert.equal(oldPauses,1,'old module is paused')
assert.equal(mounts,0,'new chapter module must not mount behind the pause menu')
ctx.pausePlay('hidden',true);ctx.pausePlay('menu',false)
assert.equal(mounts,0,'hidden tab still blocks deferred mount')
ctx.pausePlay('hidden',false)
assert.equal(mounts,1,'last pause reason ending mounts the next step exactly once')
ctx.pausePlay('menu',false);assert.equal(mounts,1)
console.log('qa-tk-transition-pause: 5 passed')
