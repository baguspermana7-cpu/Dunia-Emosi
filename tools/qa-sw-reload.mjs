// Standalone PWA lifecycle: first install must preserve play, deployments refresh once,
// and unavailable session storage must not strand the child on stale code.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const source = fs.readFileSync(new URL('../games/sw-reload.js', import.meta.url), 'utf8')
let passes = 0
const failures = []

function page({ controlled = false, blockedStorage = false, stored = {}, busy = false, visible = false } = {}) {
  const listeners = {}, timers = [], registrations = [], warnings = [], docL = {}
  // v63.30+: a visible page defers the reload until it is hidden; the default here is a hidden page
  const doc = { visibilityState: visible ? 'visible' : 'hidden', addEventListener(t, fn) { docL[t] = fn }, removeEventListener(t) { delete docL[t] } }
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
    document: doc,
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
    hide() { doc.visibilityState = 'hidden'; if (docL.visibilitychange) docL.visibilitychange() },
    reloads: () => reloads, registrations, timers, warnings
  }
}

function check(name, test) {
  try { test(); passes++; console.log('PASS ' + name) }
  catch (error) { failures.push(name + ': ' + error.message); console.error('FAIL ' + name + ': ' + error.message) }
}

check('a deploy while the child is playing waits until the app is hidden', () => {
  const p = page({ controlled: true, visible: true })
  p.emit('message')
  assert.equal(p.reloads(), 0, 'no reload while visible')
  p.hide()
  assert.equal(p.reloads(), 1, 'reloads once hidden')
})

// the hub (game.js) has its own SW_UPDATED handler: same rules (2026-10-10, a Blippi tile tap was lost to it)
check('hub: first visit never reloads, a deploy waits until hidden', () => {
  const src = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8')
  const i = src.indexOf('const swCtlAtLoad'), j = src.indexOf("window.addEventListener('load'", i)
  assert.ok(i > 0 && j > i, 'hub SW_UPDATED handler found')
  for (const [controlled, visible, want] of [[false, true, 0], [false, false, 0], [true, true, 0], [true, false, 1]]) {
    let reloads = 0, onMsg = null, onVis = null
    const doc = { visibilityState: visible ? 'visible' : 'hidden', addEventListener(t, fn) { onVis = fn }, removeEventListener() { onVis = null } }
    const ctx = { navigator: { serviceWorker: { controller: controlled ? {} : null, addEventListener(t, fn) { if (t === 'message') onMsg = fn } } },
      document: doc, location: { reload() { reloads++ } }, sessionStorage: { getItem() { return null }, setItem() {} } }
    vm.runInNewContext(src.slice(i, j), ctx)
    onMsg({ data: { type: 'SW_UPDATED', version: 'v1' } })
    assert.equal(reloads, want, `controlled=${controlled} visible=${visible}`)
    if (controlled && visible) { doc.visibilityState = 'hidden'; onVis && onVis(); assert.equal(reloads, 1, 'reloads after hide') }
  }
})

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
