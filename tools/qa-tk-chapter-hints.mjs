// Execute the real host aggregation/checkpoint functions without mounting a browser.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
const source = fs.readFileSync(new URL('../games/timmy-kapal.js', import.meta.url), 'utf8')
const extract = name => {
  const match = source.match(new RegExp('^  function ' + name + ' \\([^\\n]*\\) \\{\\n[\\s\\S]*?^  \\}', 'm'))
  assert.ok(match, `host function ${name} exists`)
  return match[0]
}
const ctx = { S: { progress: {}, cine: {}, chapterHints: {} }, save() {} }
vm.createContext(ctx)
vm.runInContext(extract('aggregate') + '\n' + extract('setProg') + '\n' + extract('markChapterHint'), ctx)
const failures = []
const check = (name, fn) => { try { fn(); console.log('PASS ' + name) } catch (error) { failures.push(name); console.error('FAIL ' + name + ': ' + error.message) } }
check('hinted grid caps a five-step chapter at two stars', () => {
  assert.equal(ctx.aggregate([{ stars: 2, hinted: true }, ...Array.from({ length: 4 }, () => ({ stars: 3 }))]).stars, 2)
})
check('resumed checkpoint retains the hint cap', () => assert.equal(ctx.aggregate([{ stars: 3 }], true).stars, 2))
check('a fresh unhinted replay can earn three stars', () => assert.equal(ctx.aggregate([{ stars: 3 }], false).stars, 3))
check('ordinary checkpoint preserves this attempt and sibling hints', () => {
  ctx.S.chapterHints = { 'titanic/c7': true, 'titanic/c8': true }
  ctx.setProg({ id: 'titanic' }, { id: 'c7' }, 2)
  assert.equal(ctx.S.chapterHints['titanic/c7'], true)
  assert.equal(ctx.S.chapterHints['titanic/c8'], true)
})
check('fresh replay clears only its own hint checkpoint', () => {
  ctx.setProg({ id: 'titanic' }, { id: 'c7' }, 0, true)
  assert.equal(ctx.S.chapterHints['titanic/c7'], undefined)
  assert.equal(ctx.S.chapterHints['titanic/c8'], true)
})
check('hint is saved immediately and duplicate callbacks do not save twice', () => {
  let saves = 0; ctx.save = () => saves++
  const play = { w: { id: 'titanic' }, lv: { id: 'c7' }, chap: {} }; ctx.PLAYING = play
  ctx.markChapterHint(play); assert.equal(ctx.S.chapterHints['titanic/c7'], true); assert.equal(saves, 1)
  ctx.markChapterHint(play); assert.equal(saves, 1)
  ctx.markChapterHint({ w: { id: 'titanic' }, lv: { id: 'stale' }, chap: {} }); assert.equal(saves, 1)
})
console.log(`qa-tk-chapter-hints: ${6 - failures.length} passed, ${failures.length} failed`)
process.exitCode = failures.length ? 1 : 0
