// Integration contract: a standalone game must be reachable and cached, and its
// save marker must be consumed when a child returns to the world map.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
const root = path.resolve(import.meta.dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const failures = []
function check(name, fn) {
  try { fn(); console.log('PASS ' + name) } catch (e) { failures.push(name); console.error('FAIL ' + name + ': ' + e.message) }
}
const index = read('index.html'), game = read('game.js'), page = read('games/mojo-swoptops.html'), sw = read('sw.js')
check('G31 is reachable from its own map node and has a star label', () => {
  const tile = index.match(/<div[^>]+id="gtile-31"[\s\S]*?id="gstars-31-lbl"/)
  assert.ok(tile, 'missing G31 map tile')
  assert.match(tile[0], /location.href='games\/mojo-swoptops.html'/)
  assert.match(tile[0], /assets\/db\/lib\/mojo-top\/base.webp/)
})
check('G31 document and every local script/style are precached', () => {
  const shell = new Set([...sw.match(/const SHELL = \[([\s\S]*?)\n\]/)[1].matchAll(/'([^']+)'/g)].map(m => m[1].replace(/^\.\//, '').split('?')[0]))
  assert.ok(shell.has('games/mojo-swoptops.html'), 'missing document')
  for (const m of page.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"[^>]*>/g)) {
    if (!/\.js(?:\?|$)|\.css(?:\?|$)/.test(m[1])) continue
    const local = path.posix.normalize('games/' + m[1].split('?')[0])
    assert.ok(fs.existsSync(path.join(root, local)), 'missing file ' + local)
    assert.ok(shell.has(local), 'not in shell: ' + local)
  }
})
check('returning to the app consumes G31 result markers without awarding again', () => {
  const source = game.match(/window.addEventListener\('pageshow', function\(e\) \{([\s\S]*?)\n\}\)/)
  assert.ok(source, 'pageshow handler missing')
  const data = new Map([['g31Result', '{"stars":3,"level":1}'], ['31Result', '{"stars":3}']])
  const context = { window: { addEventListener: (_, fn) => fn({ persisted: false }) }, sessionStorage: { getItem: k => data.get(k), removeItem: k => data.delete(k) }, setLevelComplete: () => { throw Error('duplicate award') }, saveStars: () => { throw Error('duplicate award') } }
  vm.runInNewContext(source[0], context)
  assert.equal(data.size, 0)
})
if (failures.length) process.exitCode = 1
