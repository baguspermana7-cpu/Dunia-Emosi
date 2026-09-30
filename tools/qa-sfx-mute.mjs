// Shared sound boundary: mute ends current voices and never revives interrupted cues.
import fs from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
const source=fs.readFileSync(new URL('../games/data/sfx-engine.js',import.meta.url),'utf8')
let passed=0,failed=0
function check(name,run){try{run();passed++;console.log('PASS '+name)}catch(e){failed++;console.error('FAIL '+name+': '+e.message)}}
function fixture(){
 const audios=[],pending=[],timers=[],osc=[]
 class Audio{constructor(src){this.src=src;this.paused=true;this.ended=false;this.currentTime=4;this.listeners={};audios.push(this)}addEventListener(n,f){(this.listeners[n]||(this.listeners[n]=new Set())).add(f)}removeEventListener(n,f){this.listeners[n]?.delete(f)}emit(n){for(const f of [...(this.listeners[n]||[])])f()}play(){this.paused=false;return{catch:f=>pending.push(f)}}pause(){this.paused=true;this.emit('pause')}}
 class AudioContext{constructor(){this.currentTime=1;this.destination={}}createOscillator(){const o={frequency:{value:0},connect(){},start(){o.started=true},stop(at){if(at==null)o.stopped=true}};osc.push(o);return o}createGain(){return{gain:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){}}}}
 const ctx={Audio,AudioContext,console,location:{pathname:'/'},performance:{now:()=>0},setTimeout:f=>{timers.push(f);return timers.length},clearTimeout(){},document:{addEventListener(){},removeEventListener(){}}};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source,ctx)
 return {engine:ctx.SFXEngine,audios,pending,timers,osc}
}
check('mute stops and rewinds all pooled voices immediately',()=>{const f=fixture();const a=f.engine.cue('correct'),b=f.engine.cue('coin');f.engine.setMute(true);assert.equal(a.paused,true);assert.equal(b.paused,true);assert.equal(a.currentTime,0);assert.equal(f.engine.status().activeVoices,0);assert.equal(f.engine.cue('star'),null)})
check('unmute does not resume previous voices and released pool remains usable',()=>{const f=fixture();const a=f.engine.cue('correct');f.engine.setMute(true);f.engine.setMute(false);assert.equal(a.paused,true);const next=f.engine.cue('correct');assert.ok(next);assert.equal(f.engine.status().activeVoices,1);f.pending[0](new Error('old interrupted play'));assert.equal(f.engine.status().activeVoices,1);next.emit('ended');assert.equal(f.engine.status().activeVoices,0)})
check('mute cancels fallback synth and old delayed notes even after rapid unmute',()=>{const f=fixture();const a=f.engine.cue('correct');a.emit('error');assert.ok(f.osc.length);f.engine.setMute(true);assert.ok(f.osc.every(o=>o.stopped));f.engine.setMute(false);const n=f.osc.length;f.timers.forEach(fn=>fn());assert.equal(f.osc.length,n)})
check('old audio error after mute/unmute cannot start a fallback cue',()=>{const f=fixture();const a=f.engine.cue('correct');f.engine.setMute(true);f.engine.setMute(false);a.emit('error');assert.equal(f.osc.length,0);assert.equal(f.timers.length,0);f.engine.cue('correct');assert.ok(f.osc.length>0,'failed source remains cached for the next intentional cue')})
console.log(`qa-sfx-mute: ${passed} passed, ${failed} failed`);process.exitCode=failed?1:0
