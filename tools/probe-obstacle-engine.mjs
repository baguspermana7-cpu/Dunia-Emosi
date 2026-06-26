#!/usr/bin/env node
/* =============================================================================
 * tools/probe-obstacle-engine.mjs   (v54.77)
 * =============================================================================
 * Acceptance probe for the ObstacleEngine. Loads obstacle-engine.js +
 * data/kids-questions.js + data/obstacles.js + data/routes.js into a
 * stubbed window environment, then asserts the spec §33 acceptance criteria.
 *
 * Exit non-zero on assertion failure.
 *
 * Usage:
 *   node tools/probe-obstacle-engine.mjs
 * ========================================================================== */
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// ── Stub browser globals so the modules can load ─────────────────────────────
const _ls = {}
const _styleSinks = []
const _elementSinks = []
const document = {
  body: { appendChild() {}, removeChild() {} },
  head: { appendChild(el) { _styleSinks.push(el) } },
  documentElement: { classList: { add(){}, remove(){}, toggle(){} } },
  createElement(tag) {
    const el = {
      tagName: tag, style: {}, dataset: {}, classList: { add(){}, remove(){}, contains(){return false}, toggle(){} },
      children: [], textContent: '', innerHTML: '',
      appendChild(c) { this.children.push(c) },
      removeChild(c) { const i = this.children.indexOf(c); if (i>=0) this.children.splice(i,1) },
      addEventListener() {}, removeEventListener() {},
      setAttribute() {}, getAttribute() { return null },
      querySelector() { return null }, querySelectorAll() { return [] },
      getBoundingClientRect() { return { left:0, top:0, width:100, height:100 } },
      remove() {},
    }
    _elementSinks.push(el)
    return el
  },
  querySelector() { return null },
  querySelectorAll() { return [] },
  readyState: 'complete',
  addEventListener() {},
  dispatchEvent() {},
}
const localStorage = {
  getItem(k) { return _ls[k] ?? null },
  setItem(k, v) { _ls[k] = String(v) },
  removeItem(k) { delete _ls[k] },
}
const window = {}
const stub = {
  window, document, localStorage,
  globalThis: undefined, // set below
  console,
  setTimeout: (fn) => { /* immediately fire 0-delay so async OE.spawn would race — but we don't call spawn in probe */ },
  setInterval: () => 0,
  clearInterval: () => {},
  clearTimeout: () => {},
  requestAnimationFrame: (fn) => fn && fn(0),
  cancelAnimationFrame: () => {},
  matchMedia: () => ({ matches: false, addListener(){}, removeListener(){} }),
  speechSynthesis: { speak(){}, cancel(){} },
  SpeechSynthesisUtterance: function(t){ this.text = t },
}
stub.globalThis = stub
window.document = document
window.localStorage = localStorage
window.matchMedia = stub.matchMedia
window.speechSynthesis = stub.speechSynthesis
window.SpeechSynthesisUtterance = stub.SpeechSynthesisUtterance

const ctx = vm.createContext(stub)

function loadScript(rel) {
  const p = path.join(ROOT, rel)
  const code = fs.readFileSync(p, 'utf8')
  vm.runInContext(code, ctx, { filename: rel })
}

console.log('Loading modules into stub context...')
loadScript('games/obstacle-engine.js')
loadScript('games/data/kids-questions.js')
loadScript('games/data/obstacles.js')
loadScript('games/data/routes.js')

const OE = window.ObstacleEngine
const KQ = window.KidsQuestions
const TR = window.TrainRoutes

if (!OE) { console.error('FAIL: window.ObstacleEngine not loaded'); process.exit(1) }

const registry = OE._registry || {}
const ids = Object.keys(registry)

const results = []
function check(label, cond, detail) {
  results.push({ label, ok: !!cond, detail })
  const tag = cond ? '✓' : '✗'
  console.log(`  ${tag} ${label}` + (detail ? ' — ' + detail : ''))
}

console.log('\n── Acceptance criteria (spec §33) ──────────────────────────────────────────')
check('At least 20 obstacle variations registered', ids.length >= 20, `found ${ids.length}`)
check('ObstacleEngine version stamp present', !!OE.VERSION, OE.VERSION)
check('ObstacleEngine.attach is a function', typeof OE.attach === 'function')
check('ObstacleEngine.spawn is a function', typeof OE.spawn === 'function')

console.log('\n── Per-obstacle assertions ─────────────────────────────────────────────────')
let bad = 0
ids.forEach(id => {
  const def = registry[id]
  if (!def.softFail) { console.log(`  ✗ ${id}: softFail !== true`); bad++ }
  if (def.maxRetry == null || def.maxRetry < 1) { console.log(`  ✗ ${id}: maxRetry missing or <1 (${def.maxRetry})`); bad++ }
  if (!def.reward || typeof def.reward.coins !== 'number') { console.log(`  ✗ ${id}: reward.coins missing`); bad++ }
  if (!def.accessibility) { console.log(`  ✗ ${id}: accessibility config missing`); bad++ }
  if (!def.accessibility?.voicePrompt) { console.log(`  ✗ ${id}: voicePrompt false`); bad++ }
  if (!def.accessibility?.largeTouchTarget) { console.log(`  ✗ ${id}: largeTouchTarget false`); bad++ }
  if (!def.accessibility?.reducedMotion) { console.log(`  ✗ ${id}: reducedMotion false`); bad++ }
})
check('All obstacles softFail + maxRetry≥1 + reward + a11y intact', bad === 0, bad === 0 ? `${ids.length}/${ids.length}` : `${bad} issues across ${ids.length}`)

console.log('\n── Question pool ───────────────────────────────────────────────────────────')
check('KidsQuestions pool ≥ 50 entries', Array.isArray(KQ) && KQ.length >= 50, `found ${KQ ? KQ.length : 0}`)
check('Questions cover ≥ 6 categories (shape/color/count/number/animal/safety)', (() => {
  if (!Array.isArray(KQ)) return false
  const cats = new Set()
  KQ.forEach(q => (q.tags || []).forEach(t => cats.add(t)))
  return cats.size >= 6
})(), '')

console.log('\n── Routes ──────────────────────────────────────────────────────────────────')
const routeKeys = TR ? Object.keys(TR) : []
check('At least 1 scripted route registered', routeKeys.length >= 1, `found ${routeKeys.length}`)
check('Surabaya route exists with ≥7 beats', !!(TR && TR.surabaya_route && TR.surabaya_route.sequence && TR.surabaya_route.sequence.length >= 7), TR?.surabaya_route ? `beats=${TR.surabaya_route.sequence.length}` : '')

console.log('\n── Engine modes / accessibility ────────────────────────────────────────────')
check('Easy mode is default', OE.getMode() === 'easy', `mode=${OE.getMode()}`)
check('Age preset default = 5', OE.getAgePreset() === '5', `age=${OE.getAgePreset()}`)
check('High contrast default = off', OE.getHighContrast() === false, '')
check('suggestedDifficulty fn present', typeof OE.suggestedDifficulty === 'function')
check('pickAdaptiveCandidates fn present', typeof OE.pickAdaptiveCandidates === 'function')

console.log('\n── Summary ─────────────────────────────────────────────────────────────────')
const passed = results.filter(r => r.ok).length
const total = results.length
console.log(`  ${passed}/${total} checks passed`)
if (passed < total) {
  console.log('  FAILURES:')
  results.filter(r => !r.ok).forEach(r => console.log(`    - ${r.label}` + (r.detail ? `: ${r.detail}` : '')))
  process.exit(1)
}
console.log('\n  ✓ All acceptance criteria passed.')
process.exit(0)
