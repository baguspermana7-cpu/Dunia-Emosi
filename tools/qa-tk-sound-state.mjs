import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
const grid=fs.readFileSync(new URL('../games/tk-grid.js',import.meta.url),'utf8')
const host=fs.readFileSync(new URL('../games/timmy-kapal.js',import.meta.url),'utf8')
let p=0,f=0
function check(n,fn){try{fn();p++;console.log('PASS '+n)}catch(e){f++;console.error('FAIL '+n+': '+e.message)}}
check('grid dynamic mute option permits sound and updates live',()=>{
  let off=false; const c={forcedMute:null,opts:{muted:()=>off},G:{SFXEngine:{getMute:()=>false}}};vm.createContext(c)
  vm.runInContext(grid.match(/^    function muted \(\) \{[^\n]+/m)[0],c)
  assert.equal(c.muted(),false);off=true;assert.equal(c.muted(),true)
})
check('global sound storage event updates immediately without changing child preference',()=>{
  let paints=0;const c={GLOBAL_MUTE:false,localStorage:{getItem:()=> 'off'},paintSound:()=>paints++};vm.createContext(c)
  const fn=host.match(/^  function globalSoundChanged \([^\n]*\) \{\n[\s\S]*?^  \}/m)
  vm.runInContext(fn?fn[0]:'function globalSoundChanged(){}',c)
  c.globalSoundChanged({key:'dunia-emosi-sound'});assert.equal(c.GLOBAL_MUTE,true);assert.equal(paints,1)
  c.globalSoundChanged({key:'unrelated'});assert.equal(paints,1)
})
console.log(`qa-tk-sound-state: ${p} passed, ${f} failed`);process.exitCode=f?1:0
