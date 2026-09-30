// Scoped reset transaction: use real SaveEngine helpers and the production reset function.
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const shell=fs.readFileSync('games/mojo-swoptops.js','utf8'),fill=shell.slice(shell.indexOf('  function fill ('),shell.indexOf('  function load (')),reset=shell.slice(shell.indexOf('  function resetProgress ('),shell.indexOf('  function settings ('));
function storage(initial={}){const data=new Map(Object.entries(initial));return{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)}}
function fixture(){
 const s=storage({'dunia-players':JSON.stringify([{animal:'lion'},{animal:'rabbit'}]),'dunia-active-slot':'[0,1]','dunia-avatar-lion-progress':JSON.stringify({g31:{completed:[0],stars:{0:3}},g30:{completed:[4],stars:{4:2}}}),'dunia-avatar-rabbit-g31-mojo':'other-child'});
 const c={localStorage:s,sessionStorage:storage({g31Result:'pending'}),console:{warn:()=>{}},toast:()=>{},cancelPlayback:()=>{},hush:()=>{},home:()=>{},G:{active:true}};c.window=c;c.W=c;vm.createContext(c);
 for(const f of ['data/save-engine.js','prog-grid.js','data/mojo-levels.js','mojo-save.js'])vm.runInContext(fs.readFileSync('games/'+f,'utf8'),c);c.ML=c.MojoLevels;c.PG=c.ProgGrid;vm.runInContext(fill+'\nvar KEY="dunia-g31-mojo",GAME_ID="g31";var S=fill({lv:{t1:{stars:3}},cp:{id:"s1",beat:1},set:{sound:false,lang:"en"},rewardBolts:4});'+reset,c);
 c.avatarScopedSet('dunia-g31-mojo',JSON.stringify(c.S));return c;
}
{
 const c=fixture();assert.equal(c.resetProgress('lion'),true);const game=JSON.parse(c.avatarScopedGet('dunia-g31-mojo'));assert.deepEqual(game.lv,{});assert.equal(game.cp,null);assert.equal(game.rewardBolts,0);assert.equal(game.set.sound,false);assert.equal(game.set.lang,'en');
 assert.deepEqual(JSON.parse(c.localStorage.getItem('dunia-avatar-lion-progress')),{g30:{completed:[4],stars:{4:2}}});assert.equal(c.localStorage.getItem('dunia-avatar-rabbit-g31-mojo'),'other-child');assert.equal(c.sessionStorage.getItem('g31Result'),null);assert.equal(c.G,null);console.log('PASS Reset clears only active G31, preserves settings, other game and other child');
}
{
 const c=fixture(),before=c.localStorage.getItem('dunia-avatar-lion-progress'),game=c.avatarScopedGet('dunia-g31-mojo');c.avatarScopedSet=()=>false;assert.equal(c.resetProgress('lion'),false);assert.equal(c.localStorage.getItem('dunia-avatar-lion-progress'),before);assert.equal(c.avatarScopedGet('dunia-g31-mojo'),game);assert.equal(c.G.active,true);console.log('PASS Failed game write rolls back shared stars without replacing live state');
}
{
 const c=fixture(),before=c.avatarScopedGet('dunia-g31-mojo');assert.equal(c.resetProgress('rabbit'),false);assert.equal(c.avatarScopedGet('dunia-g31-mojo'),before);assert.equal(c.sessionStorage.getItem('g31Result'),'pending');console.log('PASS Changed child cannot reset a different profile through an old confirmation');
}
{
 const c=fixture(),before=c.avatarScopedGet('dunia-g31-mojo');c.localStorage.setItem('dunia-avatar-lion-progress','broken-json');assert.equal(c.resetProgress('lion'),false);assert.equal(c.localStorage.getItem('dunia-avatar-lion-progress'),'broken-json');assert.equal(c.avatarScopedGet('dunia-g31-mojo'),before);console.log('PASS Corrupt shared progress is preserved instead of erasing unrelated games');
}
