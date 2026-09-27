// Garasi Tempur rules gate (PRD v2 §11 #2, v1 §28 edge cases, v1 §38 "no soft-lock in 500+
// simulations", "same seed = same outcome"). Headless: the engine is pure.
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
globalThis.window = globalThis
const C = require('../games/data/gt-cards.js')
const E = require('../games/gt-engine.js')
const fails = []
const check = (ok, msg) => { if (!ok) { fails.push(msg); console.log('❌ ' + msg) } }
const pass = msg => console.log('✅ ' + msg)

// ── data sanity ──────────────────────────────────────────────────────────
const banned = /monster\s*jam|grave\s*digger|el\s*toro|max-?d|megalodon/i
check(C.TRUCKS.length === 12 && Object.keys(C.TYPES).every(t => C.TRUCKS.filter(x => x.type === t).length === 2), '12 trucks, 2 per Type')
check(C.TRUCKS.every(t => t.hp >= 10 && t.hp <= 20 && t.attacks.length === 2 && t.attacks.every(a => a.dmg >= 1 && a.dmg <= 7 && a.fuel >= 0 && a.fuel <= 3) && C.TYPES[t.strongVs]), 'truck stats inside PRD bands (HP 10–20, dmg 1–7, fuel 0–3)')
check(!C.TRUCKS.concat(C.PARTS, C.ACTIONS).some(c => banned.test(c.name) || banned.test(c.id)), 'no trademarked truck names (owner decision)')
for (const [k, s] of Object.entries(C.STARTERS)) {
  check(s.deck.length === 20 && s.deck.every(id => C.get(id)), `starter ${k}: 20 known cards`)
  check(s.deck.filter(id => C.get(id).cat === 'truck').length === 3, `starter ${k}: 3 trucks`)
}
pass('card data checked')

// ── 500 seeded AI battles ────────────────────────────────────────────────
const starters = Object.keys(C.STARTERS), arenas = C.ARENAS.map(a => a.id)
function play (seed, lv1, lv2, o) {
  try { return playRaw(seed, lv1, lv2, o) } catch (e) { return { err: `seed ${seed}: engine threw ${e.message}`, st: { phase: 'crash', log: [], turn: 0 } } }
}
function playRaw (seed, lv1 = 'racer', lv2 = 'rookie', o = {}) {
  let st = E.create({ seed, p1: { name: 'A', starter: starters[seed % 4] }, p2: { name: 'B', starter: starters[(seed >> 2) % 4] }, arena: arenas[seed % 3], ...o })
  let steps = 0
  while (st.phase !== 'over' && steps < 5000) {
    const cmd = E.ai(st, st.active === 0 ? lv1 : lv2)
    cmd.id = 's' + steps
    const r = E.apply(st, cmd)
    if (!r.ok) return { err: `seed ${seed}: AI sent an illegal command ${JSON.stringify(cmd)} (${r.reason})`, st }
    st = r.state; steps++
    // invariants after every command
    for (const [pi, P] of st.players.entries()) {
      const n = P.deck.length + P.hand.length + P.discard.length + (P.active ? 1 + Object.values(P.active.parts).filter(Boolean).length : 0) +
        P.bench.reduce((k, b) => k + 1 + Object.values(b.parts).filter(Boolean).length, 0)
      if (n !== 20) return { err: `seed ${seed} step ${steps}: player ${pi} owns ${n} cards (must stay 20)`, st }
      for (const t of [P.active, ...P.bench].filter(Boolean)) {
        if (t.hp < 0 || t.hp > t.maxHp) return { err: `seed ${seed}: HP out of range ${t.hp}/${t.maxHp}`, st }
        if (t.fuel > E.RULES.FUEL_MAX) return { err: `seed ${seed}: fuel ${t.fuel} over max`, st }
      }
      if (P.bench.length > E.RULES.BENCH_MAX) return { err: `seed ${seed}: bench ${P.bench.length}`, st }
    }
  }
  return { st, steps }
}
let over = 0, byKo = 0, turns = 0, first = 0, errs = 0
for (let s = 1; s <= 500; s++) {
  const r = play(s)
  if (r.err) { if (errs++ < 5) check(false, r.err); continue }
  if (r.st.phase === 'over') over++
  const why = r.st.log.filter(e => e.t === 'gameOver')[0]
  if (why && why.why === 'ko') byKo++
  turns += r.st.turn
  if (r.st.winner === 0) first++
}
check(errs === 0, `${errs} battles hit an illegal AI command or broken invariant`)
check(over === 500, `every battle ends (${over}/500) — no soft-lock`)
check(byKo >= 400, `most battles end by knock-out, not the turn limit (${byKo}/500)`)
pass(`500 battles: ${over} finished, ${byKo} by KO, avg ${(turns / 500).toFixed(1)} rounds, racer-vs-rookie P1 wins ${first}`)

// rookie vs rookie: seat balance (first-player advantage within reason)
let p1 = 0
for (let s = 1001; s <= 1400; s++) { const r = play(s, 'rookie', 'rookie'); if (!r.err && r.st.winner === 0) p1++ }
check(p1 >= 140 && p1 <= 260, `first player wins ${p1}/400 mirror-level battles (fair seats: 140–260)`)
pass(`seat balance: first player ${p1}/400`)

// ── determinism ──────────────────────────────────────────────────────────
const a = play(77), b = play(77)
check(E.hash(a.st) === E.hash(b.st) && JSON.stringify(a.st.log) === JSON.stringify(b.st.log), 'same seed → identical battle')
check(E.hash(play(78).st) !== E.hash(a.st), 'different seed → different battle')
pass('determinism checked')

// ── edge cases (PRD v1 §28) ──────────────────────────────────────────────
const fresh = (seed = 5) => E.create({ seed, p1: { starter: 'api' }, p2: { starter: 'lumpur' }, arena: 'lumpur' })
{ // opening hand always has a truck, for every seed
  let ok = true
  for (let s = 1; s <= 300; s++) { const st = fresh(s); if (!st.players.every(P => P.hand.some(c => C.get(st.cards[c]).cat === 'truck'))) ok = false }
  check(ok, 'every opening hand holds a truck (300 seeds)')
}
{ // double tap: the same command id twice is ONE action
  let st = fresh(); const P = st.players[0]
  const t = P.hand.find(c => C.get(st.cards[c]).cat === 'truck')
  const r1 = E.apply(st, { id: 'x1', type: 'playTruck', card: t }), r2 = E.apply(r1.state, { id: 'x1', type: 'playTruck', card: t })
  check(r1.ok && r2.duplicate && r2.state === r1.state, 'duplicate command id is ignored')
}
{ // illegal command changes nothing and explains itself
  const st = fresh(); const fuel = st.players[0].hand.find(c => C.get(st.cards[c]).cat === 'fuel')
  if (fuel) { const r = E.apply(st, { id: 'f', type: 'attachFuel', card: fuel }); check(!r.ok && r.reason === 'noTruck' && r.state === st, 'fuel with no truck is refused with a reason') }
  const r = E.apply(st, { type: 'answer', correct: true }); check(!r.ok && r.reason === 'noChallenge', 'answer without a challenge is refused')
}
{ // repeated End Turn: two ids = two turns, same id = one
  let st = fresh()
  const t = st.players[0].hand.find(c => C.get(st.cards[c]).cat === 'truck'); st = E.apply(st, { type: 'playTruck', card: t }).state
  const r1 = E.apply(st, { id: 'e', type: 'endTurn' }); const r2 = E.apply(r1.state, { id: 'e', type: 'endTurn' })
  check(r1.state.active === 1 && r2.state.active === 1, 'a repeated End Turn tap does not skip the opponent')
}
{ // fuel once per turn, heal never above max, part replacement lowers max HP safely
  let st = fresh(9)
  const P = () => st.players[st.active]
  const t = P().hand.find(c => C.get(st.cards[c]).cat === 'truck'); st = E.apply(st, { type: 'playTruck', card: t }).state
  // put two fuel cards + two tire parts + a repair kit into hand for the test
  const give = id => { const inst = 'z' + Object.keys(st.cards).length; st.cards[inst] = id; P().hand.push(inst); return inst }
  const f1 = give('bahan-bakar'), f2 = give('bahan-bakar')
  st = E.apply(st, { type: 'attachFuel', card: f1 }).state
  const r = E.apply(st, { type: 'attachFuel', card: f2 }); check(!r.ok && r.reason === 'fuelOncePerTurn', 'only one Fuel per turn')
  const kit = give('kit-perbaikan'); const rk = E.apply(st, { type: 'playAction', card: kit }); check(!rk.ok && rk.reason === 'fullHP', 'repair refused at full HP')
  const big = give('ban-raksasa'); st = E.apply(st, { type: 'attachPart', card: big }).state
  check(P().active.maxHp === C.get(st.cards[t]).hp + 2 && P().active.hp === P().active.maxHp, 'HP part raises max and current HP')
  P().active.hp = P().active.maxHp                       // at the top of the raised max
  const small = give('ban-duri'); st = E.apply(st, { type: 'attachPart', card: small }).state
  check(P().active.maxHp === C.get(st.cards[t]).hp && P().active.hp <= P().active.maxHp && P().discard.includes(big), 'replacing an HP part clamps HP to the new max and discards the old part')
}
{ // empty deck: reshuffle once, then draws are skipped (never a crash, never a loss)
  let st = fresh(11); const P = st.players[1]
  P.discard = P.deck.splice(0); const n = P.discard.length
  const t = st.players[0].hand.find(c => C.get(st.cards[c]).cat === 'truck'); st = E.apply(st, { type: 'playTruck', card: t }).state
  let r = E.apply(st, { type: 'endTurn' })
  check(r.ok && r.events.some(e => e.t === 'reshuffle') && r.state.players[1].reshuffled && r.state.players[1].deck.length === n - 1, 'empty deck reshuffles the discard once')
  const Q = r.state.players[1]; Q.discard = Q.discard.concat(Q.deck.splice(0))
  st = E.apply(r.state, { type: 'endTurn' }).state
  r = E.apply(st, { type: 'endTurn' })
  check(r.ok && r.events.some(e => e.t === 'drawSkip'), 'second empty deck skips the draw instead of reshuffling again')
}
{ // hand limit: End Turn refused over 7 until one card is discarded
  let st = fresh(13); const P = st.players[0]
  const t = P.hand.find(c => C.get(st.cards[c]).cat === 'truck'); st = E.apply(st, { type: 'playTruck', card: t }).state
  while (st.players[0].hand.length <= 7) { const inst = 'h' + Object.keys(st.cards).length; st.cards[inst] = 'bahan-bakar'; st.players[0].hand.push(inst) }
  const r = E.apply(st, { type: 'endTurn' }); check(!r.ok && r.reason === 'handLimit', 'End Turn refused above the hand limit')
  const r2 = E.apply(st, { type: 'discard', card: st.players[0].hand[0] }); check(r2.ok && E.apply(r2.state, { type: 'endTurn' }).ok, 'after one discard the turn can end')
}
{ // attack → challenge → answer: wrong still hits (no bonus), right adds the bonus
  const setup = () => {
    let st = fresh(21)
    for (let k = 0; k < 2; k++) { const P = st.players[st.active]; const t = P.hand.find(c => C.get(st.cards[c]).cat === 'truck'); st = E.apply(st, { type: 'playTruck', card: t }).state; if (k === 0) st = E.apply(st, { type: 'endTurn' }).state }
    st.players[st.active].active.fuel = 4
    return st
  }
  let st = setup(); const pv = E.preview(st, 0)
  let r = E.apply(st, { type: 'attack', attack: 0 }); check(r.ok && r.state.phase === 'challenge', 'attack opens the challenge')
  check(!E.apply(r.state, { type: 'endTurn' }).ok, 'nothing else can happen during a challenge')
  const wrong = E.apply(r.state, { type: 'answer', correct: false }).events.find(e => e.t === 'attack')
  const right = E.apply(r.state, { type: 'answer', correct: true }).events.find(e => e.t === 'attack')
  check(wrong.dmg === pv.total && right.dmg === pv.total + E.RULES.CORRECT_BONUS, `wrong answer = normal damage (${wrong.dmg}), right = +${E.RULES.CORRECT_BONUS} (${right.dmg})`)
}
{ // KO of the last truck anywhere ends the game for the other player
  let st = fresh(31)
  for (let k = 0; k < 2; k++) { const P = st.players[st.active]; const t = P.hand.find(c => C.get(st.cards[c]).cat === 'truck'); st = E.apply(st, { type: 'playTruck', card: t }).state; if (k === 0) st = E.apply(st, { type: 'endTurn' }).state }
  const O = st.players[1 - st.active]
  // strip every other truck from the defender
  const isT = c => C.get(st.cards[c]).cat === 'truck'
  O.hand = O.hand.filter(c => !isT(c)); O.deck = O.deck.filter(c => !isT(c)); O.bench = []
  st.players[st.active].active.fuel = 4; O.active.hp = 1
  let r = E.apply(st, { type: 'attack', attack: 0 }); r = E.apply(r.state, { type: 'answer', correct: false })
  check(r.state.phase === 'over' && r.state.winner === st.active, 'knocking out a side with no trucks left wins at once')
}
{ // zero damage stays zero, never negative; armor cannot heal
  let st = fresh(41)
  for (let k = 0; k < 2; k++) { const P = st.players[st.active]; const t = P.hand.find(c => C.get(st.cards[c]).cat === 'truck'); st = E.apply(st, { type: 'playTruck', card: t }).state; if (k === 0) st = E.apply(st, { type: 'endTurn' }).state }
  const O = st.players[1 - st.active]; st.cards.zz = 'bemper-baja'; O.active.parts.body = 'zz'
  st.cards.zy = 'bemper-baja'; st.players[st.active].active.fuel = 4
  const pv = E.preview(st, 0)
  check(pv.total >= 0 && pv.armor === 1, 'damage preview clamps at zero and counts armor')
}
{ // resume: a saved JSON state continues identically
  const r = play(99)
  let st = E.create({ seed: 99, p1: { name: 'A', starter: starters[99 % 4] }, p2: { name: 'B', starter: starters[(99 >> 2) % 4] }, arena: arenas[99 % 3] })
  for (let s = 0; s < 40 && st.phase !== 'over'; s++) { const c = E.ai(st, st.active === 0 ? 'racer' : 'rookie'); c.id = 's' + s; st = E.apply(st, c).state }
  st = JSON.parse(JSON.stringify(st))                   // save + reload
  for (let s = 40; st.phase !== 'over' && s < 5000; s++) { const c = E.ai(st, st.active === 0 ? 'racer' : 'rookie'); c.id = 's' + s; st = E.apply(st, c).state }
  check(E.hash(st) === E.hash(r.st), 'save → reload mid-battle ends exactly like the uninterrupted battle')
}
pass('edge cases checked')
console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
