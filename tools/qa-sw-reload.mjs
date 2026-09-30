// Standalone PWA lifecycle: first install must preserve play, deployments refresh once,
// and unavailable session storage must not strand the child on stale code.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const source = fs.readFileSync(new URL('../games/sw-reload.js', import.meta.url), 'utf8')
let passes = 0
const failures = []

function page({ controlled = false, blockedStorage = false, stored = {}, busy = false } = {}) {
  const listeners = {}, timers = [], registrations = [], warnings = []
  let reloads = 0
  const worker = {
    controller: controlled ? {} : null,
    addEventListener(type, fn) { listeners[type] = fn },
    register(url, options) { registrations.push({ url, options }); return Promise.resolve({}) }
  }
  const context = {
    navigator: { serviceWorker: worker },
    window: { FilmOffline: { busy: () => busy } },
    sessionStorage: {
      getItem(key) { if (blockedStorage) throw new Error('Storage denied'); return stored[key] },
      setItem(key, value) { if (blockedStorage) throw new Error('Storage denied'); stored[key] = value }
    },
    location: { reload() { reloads++ } },
    console: { warn(...args) { warnings.push(args) } },
    setTimeout(fn, ms) { timers.push({ fn, ms }) }
  }
  vm.runInNewContext(source, context)
  return {
    emit(type, version = 'release-one') {
      if (type === 'controllerchange') worker.controller = {}
      listeners[type]({ data: { type: 'SW_UPDATED', version } })
    },
    setBusy(value) { busy = value },
    reloads: () => reloads, registrations, timers, warnings
  }
}

function check(name, test) {
  try { test(); passes++; console.log('PASS ' + name) }
  catch (error) { failures.push(name + ': ' + error.message); console.error('FAIL ' + name + ': ' + error.message) }
}

check('direct standalone visit registers the root worker', () => {
  const p = page()
  assert.equal(p.registrations.length, 1)
  assert.equal(p.registrations[0].url, '../sw.js')
  assert.equal(p.registrations[0].options.scope, '../')
})

check('first activation does not reload active play in either event order', () => {
  for (const order of [['message', 'controllerchange'], ['controllerchange', 'message']]) {
    const p = page()
    for (const event of order) p.emit(event)
    assert.equal(p.reloads(), 0, order.join(' -> '))
  }
})

check('the next deployment after first installation still refreshes', () => {
  const p = page()
  p.emit('controllerchange'); p.emit('message', 'initial')
  p.emit('controllerchange'); p.emit('message', 'next')
  assert.equal(p.reloads(), 1)
})

check('a controlled page reloads only once for duplicate deployment events', () => {
  for (const order of [['message', 'controllerchange'], ['controllerchange', 'message']]) {
    const p = page({ controlled: true })
    for (const event of [...order, ...order]) p.emit(event)
    assert.equal(p.reloads(), 1)
  }
})

check('repeated version broadcasts do not create a reload loop', () => {
  const p = page({ controlled: true, stored: { 'dunia-sw-reloaded-release-one': '1' } })
  p.emit('message')
  assert.equal(p.reloads(), 0)
  p.emit('message', 'release-two')
  assert.equal(p.reloads(), 1)
})

check('blocked storage cannot prevent picking up a deployment', () => {
  const p = page({ controlled: true, blockedStorage: true })
  p.emit('message'); p.emit('controllerchange'); p.emit('message')
  assert.equal(p.reloads(), 1)
  assert.equal(p.warnings.length, 1, 'storage fallback is reported once')
})

check('an offline download finishes before deployment refresh', () => {
  const p = page({ controlled: true, busy: true })
  p.emit('message')
  assert.equal(p.reloads(), 0)
  assert.equal(p.timers.length, 1)
  assert.ok(p.timers[0].ms > 0)
  p.setBusy(false); p.timers[0].fn()
  assert.equal(p.reloads(), 1)
})

console.log(`\nSW reload: ${passes} passed, ${failures.length} failed`)
process.exitCode = failures.length ? 1 : 0
