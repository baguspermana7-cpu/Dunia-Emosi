// Production elapsed-time accounting: overlapping story/menu/background intervals count once.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
const src = fs.readFileSync(new URL('../games/timmy-kapal.js', import.meta.url), 'utf8')
const match = src.match(/^  function playIdle \([^\n]*\) \{\n[\s\S]*?^  \}/m)
let t = 1000
const ctx = { Date: { now: () => t } }; vm.createContext(ctx)
vm.runInContext(match ? match[0] : 'function playIdle(){}', ctx)
let passed = 0, failed = 0
function check(name, fn) { try { fn(); passed++; console.log('PASS ' + name) } catch(e) { failed++; console.error('FAIL ' + name + ': ' + e.message) } }
check('manual pause excludes its interval', () => { const p = {}; ctx.playIdle(p,'pause',true); t+=5000; ctx.playIdle(p,'pause',false); assert.equal(p.idle,5000) })
check('story and background overlap counts once', () => { const p={}; ctx.playIdle(p,'story',true); t+=1000; ctx.playIdle(p,'pause',true); t+=2000; ctx.playIdle(p,'story',false); t+=3000; ctx.playIdle(p,'pause',false); assert.equal(p.idle,6000) })
check('repeated pause and stale resume do not create extra elapsed deductions', () => { const p={}; ctx.playIdle(p,'pause',true); t+=1000; ctx.playIdle(p,'pause',true); t+=1000; ctx.playIdle(p,'pause',false); t+=1000; ctx.playIdle(p,'pause',false); assert.equal(p.idle,2000) })
console.log(`qa-tk-active-time: ${passed} passed, ${failed} failed`)
process.exitCode = failed ? 1 : 0
