// G28 Stinky & Dirty — card data gate (PRD acceptance criteria that data can prove).
//   - 6 worlds x 12 cards, every card L1, 12 DISTINCT skill families per world;
//   - every card: objective, story (visible text), beats, question, hints x2, explanation;
//   - answer is defensible for its archetype (index in range, sequence is a permutation,
//     match is a bijection, multi has >= 2 right and >= 1 wrong, find target exists on stage);
//   - options are unique; distractors exist; no option label repeats;
//   - every sprite (stage + options) resolves to a real file (PRD AC 13: essential visuals);
//   - every `say` beat points at a story sentence, every sentence is revealed;
//   - 500 random sessions from the session builder never put > 2 same archetypes in a row.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..')
const fails = []
const check = (ok, msg) => { if (!ok) fails.push(msg) }
const ctx = { location: { pathname: '/Dunia-Emosi/games/stinky-dirty.html' } }; ctx.window = ctx
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'games/data/sd-cards.js'), 'utf8'), ctx)
const { WORLDS, CARDS } = ctx.SDCards
const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/db/index.json'), 'utf8')).assets
const ARCH = ['choice', 'image', 'multi', 'sequence', 'drag', 'match', 'find', 'count']

function spriteFile (s) {
  if (!s || s.startsWith('shape:') || s.startsWith('text:')) return null
  if (s.startsWith('g27:')) return `assets/spelling/prop/${s.slice(4)}.webp`
  if (s.startsWith('db:')) { const [c, n] = s.slice(3).split('/'); return `assets/db/${c}/${String(n).padStart(3, '0')}.webp` }
  return idx[s] ? idx[s].file : `(unindexed ${s})`
}
function sprites (c) {
  const out = []
  for (const b of c.beats || []) if (b.s) out.push(b.s)
  for (const o of (c.options || []).concat(c.left || [], c.right || [], c.target ? [c.target] : [])) if (o.s) out.push(o.s)
  return out
}

check(WORLDS.length === 6, `6 worlds (got ${WORLDS.length})`)
for (const w of WORLDS) {
  const cs = CARDS.filter(c => c.world === w.key)
  check(cs.length === 12, `${w.key}: 12 cards (got ${cs.length})`)
  const fam = new Set(cs.map(c => c.family))
  check(fam.size === 12, `${w.key}: 12 distinct skill families (got ${fam.size})`)
  for (const k of ['story-forest', 'logic-lab', 'memory-mountain', 'word-village', 'number-island', 'detective-city'].filter(k => k === w.bg))
    for (const kind of ['land', 'port']) check(fs.existsSync(path.join(ROOT, `assets/db/lib/sd/world-${k}-${kind}.webp`)), `${w.key}: world background ${kind}`)
}
const ids = new Set()
for (const c of CARDS) {
  const t = c.id
  check(!ids.has(t), `${t}: duplicate id`); ids.add(t)
  check(c.level === 1, `${t}: level 1`)
  check(ARCH.includes(c.archetype), `${t}: archetype ${c.archetype}`)
  for (const f of ['objective', 'q', 'explain']) check(typeof c[f] === 'string' && c[f].length > 3, `${t}: ${f}`)
  check(Array.isArray(c.story) && c.story.length >= 1 && c.story.every(s => s.length > 3), `${t}: visible story text`)
  check(Array.isArray(c.hints) && c.hints.length === 2 && c.hints.every(h => h.length > 3), `${t}: two hints`)
  const says = (c.beats || []).filter(b => b.t === 'say').map(b => b.i)
  check(says.every(i => i >= 0 && i < c.story.length), `${t}: say beats point at story sentences`)
  check(c.story.every((_, i) => says.includes(i)), `${t}: every story sentence is revealed`)
  const stageIds = new Set((c.beats || []).filter(b => b.id).map(b => b.id))
  if (c.hintTarget && !c.hintTarget.startsWith('path')) check(stageIds.has(c.hintTarget), `${t}: hint target "${c.hintTarget}" is on stage`)
  const opts = c.options || []
  const labels = opts.map(o => o.l)
  check(new Set(labels).size === labels.length, `${t}: option labels unique`)
  const a = c.answer
  switch (c.archetype) {
    case 'choice': case 'image':
      check(opts.length >= 2 && Number.isInteger(a) && a >= 0 && a < opts.length, `${t}: answer index in range`); break
    case 'multi':
      check(Array.isArray(a) && a.length >= 2 && a.length < opts.length && a.every(i => i >= 0 && i < opts.length), `${t}: multi has >=2 right and >=1 wrong`); break
    case 'sequence':
      check(Array.isArray(a) && a.length === opts.length && new Set(a).size === a.length && a.every(i => i >= 0 && i < opts.length), `${t}: sequence is a permutation`)
      check(a.some((v, i) => v !== i), `${t}: sequence is not already in order`); break
    case 'match':
      check(c.left && c.right && c.left.length === c.right.length && Array.isArray(a) && new Set(a).size === a.length && a.length === c.left.length, `${t}: match is a bijection`)
      check(a.some((v, i) => v !== i), `${t}: match pairs are not already aligned`); break
    case 'find':
      check(Array.isArray(c.targets) && c.targets.length >= 2 && c.targets.includes(a) && c.targets.every(x => stageIds.has(x)), `${t}: find target on stage`); break
    case 'count':
      check(Number.isInteger(a) && a >= 0 && a <= 20, `${t}: count answer 0..20`); break
    case 'drag':
      check(c.target && Array.isArray(a) && a.length >= 1 && a.length < opts.length, `${t}: drag has a target, right items and a distractor`); break
  }
  for (const s of sprites(c)) {
    const f = spriteFile(s)
    if (f) check(fs.existsSync(path.join(ROOT, f)), `${t}: sprite ${s} -> ${f} missing`)
    if (s.startsWith('real/') || /^(branded|currency)\//.test(s)) fails.push(`${t}: ${s} is not a cartoon/safe sprite`)
  }
}

// session builder (same code the game runs)
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'games/sd-session.js'), 'utf8'), ctx)
let worst = 0
for (let r = 0; r < 500; r++) {
  const w = WORLDS[r % 6].key
  const s = ctx.SDSession.build(CARDS, w, { seed: r + 1, history: {} })
  check(s.length === 5, `session ${r}: 5 cards`)
  check(new Set(s.map(c => c.id)).size === s.length, `session ${r}: no duplicate card`)
  let run = 1
  for (let i = 1; i < s.length; i++) { run = s[i].archetype === s[i - 1].archetype ? run + 1 : 1; worst = Math.max(worst, run) }
}
check(worst <= 2, `sessions never have > 2 same archetypes in a row (worst ${worst})`)

const counts = {}
for (const c of CARDS) counts[c.archetype] = (counts[c.archetype] || 0) + 1
console.log(`${CARDS.length} cards · archetypes ${JSON.stringify(counts)}`)
for (const f of fails) console.log('❌ ' + f)
console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
