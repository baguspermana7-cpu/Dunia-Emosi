// Fake-clock checks execute the production timer queue (legacy later() before the fix).
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
const source = fs.readFileSync(new URL('../games/tk-grid.js', import.meta.url), 'utf8')
let passed = 0
const failures = []
function fixture () {
  let now = 0, serial = 0
  const jobs = new Map()
  const ctx = { G: { performance: { now: () => now }, console }, console, dead: false, timers: [],
    setTimeout: (fn, ms) => { const id = ++serial; jobs.set(id, { fn, at: now + ms }); return id },
    clearTimeout: id => jobs.delete(id) }
  vm.createContext(ctx)
  const queue = source.match(/^  function timerQueue \(\) \{\n[\s\S]*?^  \}/m)
  if (queue) vm.runInContext(queue[0] + '\nvar clock = timerQueue()', ctx)
  else {
    const old = source.match(/^    function later \(fn, ms\) \{\n[\s\S]*?^    \}/m)
    assert.ok(old, 'legacy production scheduler exists')
    vm.runInContext(old[0] + '\nvar clock = { later: later, pause: function(){}, resume: function(){}, destroy: function(){dead=true} }', ctx)
  }
  return { clock: ctx.clock, advance (ms) {
    const target = now + ms
    while (true) {
      const due = [...jobs].filter(([, job]) => job.at <= target).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0]
      if (!due) break
      now = due[1].at; jobs.delete(due[0]); due[1].fn()
    }
    now = target
  } }
}
function check (name, run) { try { run(); passed++; console.log('PASS ' + name) } catch (error) { failures.push(name); console.error('FAIL ' + name + ': ' + error.message) } }
check('pause freezes a pending step and preserves its remaining delay', () => {
  const f = fixture(), hits = []
  f.clock.later(() => hits.push('step'), 300); f.advance(100); f.clock.pause(); f.advance(5000)
  assert.deepEqual(hits, [])
  f.clock.resume(); f.advance(199); assert.deepEqual(hits, []); f.advance(1); assert.deepEqual(hits, ['step'])
})
check('a question resolved while paused continues exactly once after resume', () => {
  const f = fixture(), hits = []
  f.clock.pause(); f.clock.later(() => { hits.push('answer'); f.clock.later(() => hits.push('move'), 200) }, 0)
  f.advance(4000); assert.deepEqual(hits, [])
  f.clock.resume(); f.advance(200); f.clock.resume(); f.advance(2000)
  assert.deepEqual(hits, ['answer', 'move'])
})
check('repeated pause/resume retains simultaneous callback order', () => {
  const f = fixture(), hits = []
  f.clock.later(() => hits.push(1), 200); f.clock.later(() => hits.push(2), 200)
  f.advance(60); f.clock.pause(); f.advance(1000); f.clock.pause(); f.clock.resume(); f.advance(60)
  f.clock.pause(); f.advance(1000); f.clock.resume(); f.advance(79); assert.deepEqual(hits, [])
  f.advance(1); assert.deepEqual(hits, [1, 2])
})
check('destroy cancels a delayed completion even while paused', () => {
  const f = fixture(), hits = []
  f.clock.later(() => hits.push('done'), 100); f.clock.pause(); f.clock.destroy(); f.clock.resume(); f.advance(1000)
  assert.deepEqual(hits, [])
})
console.log(`qa-tk-grid-pause: ${passed} passed, ${failures.length} failed`)
process.exitCode = failures.length ? 1 : 0
