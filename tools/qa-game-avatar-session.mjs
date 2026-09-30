// A game keeps the child it loaded even if another tab selects another avatar.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const root = new URL('../', import.meta.url)
const source = file => fs.readFileSync(new URL(file, root), 'utf8')
function storage() {
  const data = new Map()
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key) }
}
function page(localStorage) {
  const context = { localStorage, sessionStorage: storage(), console, location: { pathname: '/games/timmy-kapal.html' } }
  context.window = context
  vm.createContext(context)
  const files = ['games/data/save-engine.js', 'games/data/tk-questions.js', 'games/data/soal-engine.js',
    'games/data/soal-gen-matematika.js', 'games/data/soal-pack-kapal.js', 'games/tk-fleet.js']
  for (const file of files) vm.runInContext(source(file), context, { filename: file })
  return context
}
function choose(store, index) {
  store.setItem('dunia-players', JSON.stringify([{ animal: '🦁' }, { animal: '🐰' }]))
  store.setItem('dunia-active-slot', JSON.stringify([index, 1]))
}
let passes = 0
function check(name, run) {
  try { run(); passes++; console.log('PASS ' + name) }
  catch (error) { process.exitCode = 1; console.error('FAIL ' + name + ': ' + error.message) }
}
check('two live game documents preserve each child save, fleet, history and stars', () => {
  const store = storage()
  choose(store, 0)
  const lion = page(store)
  lion.lockGameAvatarSession()
  lion.avatarScopedSet('dunia-g31-mojo', '{"lv":{"t1":{"stars":2}}}')
  lion.TKFleet.save(lion.TKFleet.avatar(), 'titanic')
  const lionHistory = lion.SoalEngine.history('auto')
  choose(store, 1)
  const rabbit = page(store)
  rabbit.lockGameAvatarSession()
  rabbit.avatarScopedSet('dunia-g31-mojo', '{"lv":{"t7":{"stars":3}}}')
  const rabbitShip = rabbit.TKFleet.ships.find(ship => ship.id !== 'titanic').id
  rabbit.TKFleet.save(rabbit.TKFleet.avatar(), rabbitShip)
  rabbit.SoalEngine.one({ game: 'g30', avatar: 'auto', topic: 'matematika', seed: 31 })
  const rabbitHistory = store.getItem('soal-seen-rabbit')
  assert.ok(rabbitHistory)
  rabbit.saveLevelProgress('g31', 7, 3)
  lion.avatarScopedSet('dunia-g31-mojo', '{"lv":{"t1":{"stars":3}}}')
  lion.TKFleet.markSailed(lion.TKFleet.avatar(), 'titanic')
  lion.SoalEngine.one({ game: 'g30', avatar: 'auto', topic: 'matematika', seed: 32 })
  lion.saveLevelProgress('g31', 1, 3)
  lion.saveLevelProgress('g30', 2, 2)
  lion.lockGameAvatarSession() // repeated boot hooks cannot rebind to Rabbit
  assert.equal(lion._activeAvatarSlug(), 'lion')
  assert.equal(lion.SoalEngine.history('auto'), lionHistory)
  assert.notEqual(rabbit.SoalEngine.history('auto').key, lionHistory.key)
  assert.equal(store.getItem('tk-fleet-rabbit'), rabbitShip)
  assert.equal(store.getItem('tk-fleet-sailed-rabbit'), null)
  assert.ok(store.getItem('soal-seen-lion'))
  lion.SoalEngine.resetHistory('auto')
  assert.equal(store.getItem('soal-seen-rabbit'), rabbitHistory)
  assert.equal(JSON.parse(rabbit.avatarScopedGet('dunia-g31-mojo')).lv.t7.stars, 3)
  const rabbitProgress = JSON.parse(store.getItem('dunia-avatar-rabbit-progress'))
  assert.equal(rabbitProgress.g31.stars[7], 3)
  assert.equal(rabbitProgress.g31.stars[1], undefined)
  assert.equal(rabbitProgress.g30, undefined)
  assert.equal(JSON.parse(store.getItem('dunia-avatar-lion-progress')).g30.stars[2], 2)
  lion.avatarScopedRemove('dunia-g31-mojo')
  assert.ok(rabbit.avatarScopedGet('dunia-g31-mojo'))
  assert.equal(lion.avatarScopedGet('dunia-g31-mojo'), null)
})
check('unbound pages retain dynamic routing and one-time legacy migration', () => {
  const store = storage(), app = page(store)
  store.setItem('dunia-collection', 'legacy')
  choose(store, 0)
  assert.equal(app.avatarScopedGet('dunia-collection'), 'legacy')
  choose(store, 1)
  assert.equal(app.avatarScopedGet('dunia-collection'), null)
  app.avatarScopedSet('dunia-collection', 'rabbit')
  assert.equal(store.getItem('dunia-avatar-lion-collection'), 'legacy')
  assert.equal(store.getItem('dunia-avatar-rabbit-collection'), 'rabbit')
})
check('a session opened before avatar selection keeps its legacy keys', () => {
  const store = storage(), game = page(store)
  game.lockGameAvatarSession()
  choose(store, 1)
  game.avatarScopedSet('dunia-tk-v1', 'original')
  game.saveLevelProgress('g30', 1, 2)
  assert.equal(game._activeAvatarSlug(), null)
  assert.equal(store.getItem('dunia-tk-v1'), 'original')
  assert.equal(store.getItem('dunia-avatar-rabbit-tk-v1'), null)
  assert.equal(JSON.parse(store.getItem('dunia-0-progress')).g30.stars[1], 2)
})
check('reward persistence reports a failed write and supports safe retry', () => {
  const store = storage()
  choose(store, 0)
  const game = page(store), write = store.setItem
  game.lockGameAvatarSession()
  game.console = { warn() {} }
  store.setItem = (key, value) => { if (key.endsWith('-progress')) throw Error('simulated quota'); write(key, value) }
  assert.equal(game.saveLevelProgress('g31', 1, 3), false)
  assert.equal(store.getItem('dunia-avatar-lion-progress'), null)
  store.setItem = write
  assert.equal(game.saveLevelProgress('g31', 1, 3), true)
  assert.equal(game.saveLevelProgress('g31', 1, 3), true)
  const progress = JSON.parse(store.getItem('dunia-avatar-lion-progress')).g31
  assert.deepEqual(progress.completed, [1])
  assert.equal(progress.stars[1], 3)
  game.sessionStorage.setItem = () => { throw Error('blocked session storage') }
  assert.equal(game.saveLevelProgress('g31', 2, 2), true)
  assert.equal(game.saveLevelProgress(null, 2, 2), false)
  assert.equal(game.saveLevelProgress('g31', NaN, 2), false)
  assert.equal(game.saveLevelProgress('g31', 2, Infinity), false)
  assert.equal(game.saveLevelProgress('__proto__', 2, 2), false)
  assert.equal(game.saveLevelProgress({ toString: null }, 2, 2), false)
})
check('malformed progress containers never acknowledge a missing reward', () => {
  for (const malformed of [[], { g31: [] }, { g31: null }, { g31: { stars: [] } }, { g31: { completed: {} } }]) {
    const store = storage()
    choose(store, 0)
    const game = page(store)
    game.console = { warn() {} }
    const raw = JSON.stringify(malformed)
    store.setItem('dunia-avatar-lion-progress', raw)
    assert.equal(game.saveLevelProgress('g31', 1, 3), false)
    assert.equal(store.getItem('dunia-avatar-lion-progress'), raw)
    store.setItem('dunia-avatar-lion-progress', '{"g30":{"completed":[4],"stars":{"4":2}}}')
    assert.equal(game.saveLevelProgress('g31', 1, 3), true)
    const progress = JSON.parse(store.getItem('dunia-avatar-lion-progress'))
    assert.deepEqual(progress.g31, { completed: [1], stars: { 1: 3 } })
    assert.deepEqual(progress.g30, { completed: [4], stars: { 4: 2 } })
  }
})
console.log(`${passes}/5 avatar session checks passed`)
