// Garasi Tempur rules gate (PRD v2 §11 #2, v1 §28 edge cases, v1 §38 "no soft-lock in 500+
// simulations", "same seed = same outcome"). Headless: the engine is pure.
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
globalThis.window = globalThis
require('../games/data/gt-trucks.js')
const C = require('../games/data/gt-cards.js')
const E = require('../games/gt-engine.js')
const fails = []
const check = (ok, msg) => { if (!ok) { fails.push(msg); console.log('❌ ' + msg) } }
const pass = msg => console.log('✅ ' + msg)

// ── data sanity ──────────────────────────────────────────────────────────
const banned = /monster\s*jam|grave\s*digger|el\s*toro|max-?d|megalodon/i
check(C.TRUCKS.length === 174 && Object.keys(C.TYPES).every(t => C.TRUCKS.filter(x => x.type === t).length >= 10), '174 trucks, every Type well represented')
check(new Set(C.TRUCKS.map(t => t.name)).size === 174, 'every truck has its own name')
check(C.TRUCKS.every(t => t.sprite && t.hp >= 10 && t.hp <= 20 && t.attacks.length === 2 && t.attacks.every(a => a.dmg >= 1 && a.dmg <= 7 && a.fuel >= 0 && a.fuel <= 3) && C.TYPES[t.strongVs]), 'truck stats inside PRD bands (HP 10–20, dmg 1–7, fuel 0–3)')
check(!C.TRUCKS.concat(C.PARTS, C.ACTIONS).some(c => banned.test(c.name) || banned.test(c.id)), 'no trademarked truck names (owner decision)')
for (const [k, s] of Object.entries(C.STARTERS)) {
  check(s.deck.length === 20 && s.deck.every(id => C.get(id)), `starter ${k}: 20 known cards`)
  check(s.deck.filter(id => C.get(id).cat === 'truck').length === 6 && new Set(s.deck.filter(id => C.get(id).cat === 'truck')).size === 6, `starter ${k}: 6 different trucks`)
  const sup = s.deck.filter(id => C.get(id).cat !== 'truck')
  check(sup.length === 14 && sup.every(id => id.startsWith('sup-')) && new Set(sup).size === 8, `starter ${k}: 14 support cards covering all 8 support types (owner: "terlalu banyak kartu mobil")`)
  check(!s.deck.some(id => C.get(id).cat === 'fuel'), `starter ${k}: no fuel cards (bensin is automatic)`)
  check(s.trucks.every(id => s.deck.includes(id)), `starter ${k}: the 3 chosen trucks are in the deck`)
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
// the edge cases below were written for a hand-held opening truck; `fresh` puts the auto-placed
// trucks back in hand so each case still starts from "nothing on the field"
const fresh = (seed = 5) => { const st = E.create({ seed, p1: { starter: 'api' }, p2: { starter: 'lumpur' }, arena: 'lumpur' }); st.players.forEach(P => { if (P.active) { P.hand.push(P.active.inst); P.active = null } }); return st }
{ // both trucks start on the field; the first player already has 1 bensin (no dead turn 1)
  let ok = true
  for (let s = 1; s <= 300; s++) { const st = E.create({ seed: s, p1: { starter: 'api' }, p2: { starter: 'kilat' } }); if (!(st.players.every(P => P.active) && st.players[0].active.fuel === 1)) ok = false }
  check(ok, 'both trucks start on the field and the first player has 1 bensin (300 seeds)')
}
{ // bensin +1 automatically each turn; Ganti Truk once per turn, old truck to the deck bottom with its bensin moving over
  let seed2 = 22
  while (E.create({ seed: seed2, p1: { starter: 'api' }, p2: { starter: 'baja' } }).players[0].hand.filter(c => C.get(E.create({ seed: seed2, p1: { starter: 'api' }, p2: { starter: 'baja' } }).cards[c]).cat === 'truck').length < 2) seed2++
  let st = E.create({ seed: seed2, p1: { starter: 'api' }, p2: { starter: 'baja' } })
  st = E.apply(st, { type: 'endTurn' }).state
  check(st.players[1].active.fuel === 1 && st.log.some(e => e.t === 'autoFuel' && e.p === 1), 'second player gets +1 bensin at its turn start')
  st = E.apply(st, { type: 'endTurn' }).state
  const P = st.players[0]
  check(P.active.fuel === 2, 'first player has 2 bensin on its second turn')
  const hand = P.hand.filter(c => C.get(st.cards[c]).cat === 'truck')
  if (hand.length >= 2) {
    const old = P.active.inst, r1 = E.apply(st, { type: 'playTruck', card: hand[0] })
    const Q = r1.state.players[0]
    check(r1.ok && Q.active.inst === hand[0] && Q.active.fuel === 1 && Q.deck[Q.deck.length - 1] === old, 'Ganti Truk: new truck in, costs 1 bensin (2 -> 1), old truck at the deck bottom')
    const r2 = E.apply(r1.state, { type: 'playTruck', card: hand[1] })
    check(!r2.ok && r2.reason === 'swapOnce', 'Ganti Truk only once per turn')
    // owner 2026-10-17: swapping before a KO must not heal -- the swapped-out truck keeps its damage
    const sw = JSON.parse(JSON.stringify(st)), W0 = sw.players[0], hurt = W0.active.inst
    W0.active.hp = W0.active.maxHp - 5
    const r3 = E.apply(sw, { type: 'playTruck', card: hand[0] })
    check(r3.ok && r3.state.players[0].wounds[hurt] === 5, 'Ganti Truk: the swapped-out truck remembers its damage (5)')
    const back = r3.state.players[0]; back.deck.splice(back.deck.indexOf(hurt), 1); back.hand.push(hurt)
    back.swapped = false; back.active.fuel = 1
    const r4 = E.apply(r3.state, { type: 'playTruck', card: hurt })
    const T = r4.state.players[0].active
    check(r4.ok && T.inst === hurt && T.hp === T.maxHp - 5 && !r4.state.players[0].wounds[hurt], 'a swapped truck comes back still dented (HP max-5), not healed')
    const nf = JSON.parse(JSON.stringify(st)); nf.players[0].active.fuel = 0
    const r5 = E.apply(nf, { type: 'playTruck', card: hand[0] })
    check(!r5.ok && r5.reason === 'swapFuel', 'Ganti Truk with 0 bensin is refused (swapFuel)')
  } else check(false, 'test setup: two trucks in hand')
}
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
  check(right.dmg === pv.total + E.RULES.CORRECT_BONUS, `right answer = full power + ${E.RULES.CORRECT_BONUS} bonus (${right.dmg})`)
  check(wrong.dmg === Math.floor((pv.total - pv.nitro) * 0.25) && wrong.glancing === true && wrong.dmg < pv.total, `WRONG answer = 25% glancing hit (${wrong.dmg} of ${pv.total})`)
}
{ // KO of the last truck anywhere ends the game for the other player
  let st = fresh(31)
  for (let k = 0; k < 2; k++) { const P = st.players[st.active]; const t = P.hand.find(c => C.get(st.cards[c]).cat === 'truck'); st = E.apply(st, { type: 'playTruck', card: t }).state; if (k === 0) st = E.apply(st, { type: 'endTurn' }).state }
  const O = st.players[1 - st.active]
  // strip every other truck from the defender
  const isT = c => C.get(st.cards[c]).cat === 'truck'
  O.hand = O.hand.filter(c => !isT(c)); O.deck = O.deck.filter(c => !isT(c)); O.bench = []
  st.players[st.active].active.fuel = 4; O.active.hp = 1
  let r = E.apply(st, { type: 'attack', attack: 0 }); r = E.apply(r.state, { type: 'answer', correct: true })
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
// ── type triangle both ways + KO reward (2026-09-27 mechanics pass) ─────────
{
  const find = ty => C.TRUCKS.find(t => t.type === ty && t.rarity === 'biasa')
  const mk = (a, b) => { const st = E.create({ seed: 3, p1: { trucks: [a.id, a.id, a.id] }, p2: { trucks: [b.id, b.id, b.id] } }); return st }
  const pw = find('POWER'), ar = find('ARMOR')       // POWER is strong vs ARMOR
  let st = mk(pw, ar); st.players[0].active.fuel = 4
  const pv = E.preview(st, 0)
  check(pv.type === E.RULES.TYPE_BONUS && pv.weak === 0, 'strong vs the target = +' + E.RULES.TYPE_BONUS + ' (SUPER)')
  st = mk(ar, pw); st.players[0].active.fuel = 4      // ARMOR attacking POWER: POWER is strong vs ARMOR → weak
  const pw2 = E.preview(st, 0)
  check(pw2.weak === E.RULES.TYPE_WEAK && pw2.total >= 1, 'target strong vs you = −' + E.RULES.TYPE_WEAK + ', never below 1')
  // KO reward: the attacker draws one extra card
  st = mk(pw, ar); st.players[0].active.fuel = 4; st.players[1].active.hp = 1
  const h0 = st.players[0].hand.length
  let r = E.apply(st, { type: 'attack', attack: 0 }); r = E.apply(r.state, { type: 'answer', correct: true })
  check(r.events.some(e => e.t === 'koReward' && e.p === 0) && r.state.players[0].hand.length === h0 + 1, 'a KO earns the attacker one card')
}
pass('mechanics pass checked')

// ── REWORK 2026-10-11: glancing hit, lives, support cards, statuses ───────────
const give = (st, p, id) => { const inst = 'g' + Object.keys(st.cards).length; st.cards[inst] = id; st.players[p].hand.push(inst); return inst }
const battle = (seed = 8, p1 = 'api', p2 = 'baja') => { const st = E.create({ seed, p1: { starter: p1 }, p2: { starter: p2 }, arena: 'malam' }); st.players.forEach(P => { P.hand = P.hand.filter(c => C.get(st.cards[c]).cat === 'truck') }); st.players[0].active.fuel = 4; return st }
const attackWith = (st, correct) => E.apply(E.apply(st, { type: 'attack', attack: 0 }).state, { type: 'answer', correct })
{ // wrong = floor(25%), never below 0, never the whole hit; nitro kept on a glancing hit
  const st = battle(); st.players[0].nitro = 3
  const pv = E.preview(st, 0), hp0 = st.players[1].active.hp
  const w = attackWith(st, false), ev = w.events.find(e => e.t === 'attack')
  check(pv.nitro === 2 && pv.glance === Math.floor((pv.total - 2) * 0.25), 'preview exposes the glancing number (Nitro excluded)')
  check(ev.glancing && ev.dmg === pv.glance && w.state.players[1].active.hp === hp0 - pv.glance, 'wrong answer: hp drops by the glancing amount only')
  check(w.state.players[0].nitro === 3, 'a glancing hit does not spend the full Nitro bar')
  const r = attackWith(st, true)
  check(r.events.find(e => e.t === 'attack').dmg === pv.total + 2 && r.state.players[0].nitro === 0, 'right answer: full power + bonus + Nitro spent')
  const low = battle(); low.players[0].active.fuel = 4; const tiny = E.preview(low, 0); check(tiny.glance <= Math.floor(tiny.total / 4), 'glance never exceeds 25% of the power')
  // 3 → 0, 4 → 1, 7 → 1, 8 → 2 (rounded down)
  let seen = new Set()
  for (let s = 1; s <= 60; s++) { const q = battle(s, 'kilat', 'lumpur'); const p = E.preview(q, 0); const n = p.total - p.nitro; if (p.glance !== Math.floor(n * 0.25)) seen.add(s) }
  check(seen.size === 0, 'glance == floor(25%) on 60 seeds')
}
{ // lives: 3 hearts, each KO costs exactly one, 0 = lose
  let st = battle(14)
  check(st.players.every(P => P.lives === 3) && E.RULES.LIVES === 3, 'both sides start with 3 lives')
  for (let k = 1; k <= 3; k++) {
    st.players[st.active].active.fuel = 4; st.players[1 - st.active].active.hp = 1
    const pi = st.active
    const mk = E.apply(E.apply(st, { type: 'attack', attack: 0 }).state, { type: 'answer', correct: true })
    const ko = mk.events.find(e => e.t === 'ko')
    check(ko && ko.lives === 3 - k && mk.state.players[1 - pi].lives === 3 - k, `KO #${k} costs the loser exactly 1 life (${3 - k} left)`)
    if (k < 3) { st = mk.state; check(st.phase !== 'over', 'game goes on with lives left'); st = battleFix(st, pi) } else check(mk.state.phase === 'over' && mk.state.winner === pi && mk.events.some(e => e.t === 'gameOver' && e.why === 'ko'), '0 lives = game over, the attacker wins')
  }
  // the victim's next truck steps in (hand), the attacker keeps swinging at the same player
  function battleFix (s0, pi) { // give the other side's active a fresh truck if none, and let pi attack again
    const s1 = JSON.parse(JSON.stringify(s0)); const v = s1.players[1 - pi]
    while (s1.active !== pi) { const c = E.ai(s1, 'rookie'); const r = E.apply(s1, c); if (!r.ok) break; Object.assign(s1, r.state) }
    return s1
  }
}
{ // support: Turbo, Perisai, Rem Darurat, Lumpur, Oli, Bengkel, Tukar Ban, Nitro Isi — each effect + the 2-per-turn cap
  let st = battle(); const T = give(st, 0, 'sup-turbo'); const base = E.preview(st, 0).total
  let r = E.apply(st, { type: 'playAction', card: T }); check(r.ok && E.preview(r.state, 0).total === base + 2, 'Turbo: +2 power this turn')
  const aft = E.apply(r.state, { type: 'endTurn' }).state; check(aft.players[0].boost === 0, 'Turbo expires at end of turn')
  check(!E.apply(r.state, { type: 'playAction', card: give(r.state, 0, 'sup-turbo') }).ok, 'cannot stack two Turbo')

  st = battle(); const S = give(st, 1, 'sup-perisai'); st.active = 1; st.players[1].active.fuel = 4
  r = E.apply(st, { type: 'playAction', card: S }); check(r.ok && r.state.players[1].active.status.shield === 2, 'Perisai: shield 2 on the truck')
  let hp = r.state.players[1].active.hp
  let q = JSON.parse(JSON.stringify(r.state)); q.active = 0; q.players[0].active.fuel = 4
  const hit = attackWith(q, true), he = hit.events.find(e => e.t === 'attack')
  check(he.absorbed === 2 && hit.state.players[1].active.hp === hp - (he.dmg), `Perisai absorbs the first 2 damage (${he.absorbed} soaked, ${he.dmg} through)`)
  check(hit.state.players[1].active.status.shield === 0, 'Perisai is used up')
  // shield expires with no attack: ticks at the end of its owner's NEXT turn
  let sh = r.state; sh = E.apply(sh, { type: 'endTurn' }).state; sh = E.apply(sh, { type: 'endTurn' }).state
  check(sh.players[1].active.status.shield === 2, 'Perisai still up after one opponent turn')
  sh = E.apply(sh, { type: 'endTurn' }).state
  check(sh.players[1].active.status.shield === 0 && sh.log.some(e => e.t === 'statusEnd' && e.status === 'shield'), 'Perisai expires at the end of its owner’s next turn')

  st = battle(); const R = give(st, 0, 'sup-rem')
  r = E.apply(st, { type: 'playAction', card: R }); check(r.ok && r.state.players[1].skip === 1, 'Rem Darurat: opponent marked to skip')
  let e = E.apply(r.state, { type: 'endTurn' }); check(e.events.some(x => x.t === 'skipTurn' && x.p === 1) && e.state.active === 0, 'skipped player loses the turn, play returns to the caster')
  const R2 = give(e.state, 0, 'sup-rem'); const e2 = E.apply(e.state, { type: 'playAction', card: R2 }); check(!e2.ok && e2.reason === 'justSkipped', 'cannot skip the same player twice in a row')
  const e3 = E.apply(E.apply(E.apply(e.state, { type: 'endTurn' }).state, { type: 'endTurn' }).state, { type: 'playAction', card: R2 }); check(e3.ok, 'after one played turn the skip is available again')

  st = battle(); const L = give(st, 0, 'sup-lumpur')
  r = E.apply(st, { type: 'playAction', card: L }); check(r.ok && r.state.players[1].active.status.stun === 1, 'Lumpur: opponent truck stunned')
  let sn = E.apply(r.state, { type: 'endTurn' }).state; sn.players[1].active.fuel = 4
  check(!E.apply(sn, { type: 'attack', attack: 0 }).ok && E.apply(sn, { type: 'attack', attack: 0 }).reason === 'stunned' && !E.legal(sn).some(c => c.type === 'attack'), 'a stunned truck cannot attack (and legal() hides it)')
  const sn2 = E.apply(sn, { type: 'endTurn' }).state; check(sn2.players[1].active.status.stun === 0 && sn2.players[1].active.status.resist === 1, 'stun expires after the stunned turn, then a 1-turn resist')
  const L2 = give(sn2, 0, 'sup-lumpur'); const again = E.apply(sn2, { type: 'playAction', card: L2 }); check(!again.ok && again.reason === 'alreadyStunned', 'no stun-lock: resist blocks an immediate re-stun')
  const sn3 = JSON.parse(JSON.stringify(sn2)); sn3.players[1].active.fuel = 4; const sn4 = E.apply(E.apply(sn3, { type: 'endTurn' }).state, { type: 'attack', attack: 0 }); check(sn4.ok, 'the stunned truck can attack again the turn after')

  st = battle(); const O = give(st, 0, 'sup-oli')
  r = E.apply(st, { type: 'playAction', card: O }); check(r.ok && r.state.players[1].active.status.down === 2, 'Tumpahan Oli: opponent next attack −2')
  q = E.apply(r.state, { type: 'endTurn' }).state; q.players[1].active.fuel = 4
  const clean = JSON.parse(JSON.stringify(q)); clean.players[1].active.status.down = 0
  check(E.preview(clean, 0).total - E.preview(q, 0).total >= 1 && E.preview(q, 0).down === 2, 'Oli lowers the opponent’s preview by up to 2 (min damage 1)')
  const oa = attackWith(q, true); check(oa.state.players[1].active.status.down === 0, 'Oli is used up by the attack it weakened')
  let ol = E.apply(r.state, { type: 'endTurn' }).state; ol = E.apply(ol, { type: 'endTurn' }).state
  check(ol.players[1].active.status.down === 0, 'Oli expires if the opponent never attacked')

  st = battle(); st.players[0].active.hp = st.players[0].active.maxHp - 5
  const B = give(st, 0, 'sup-bengkel'); const hb = st.players[0].active.hp
  r = E.apply(st, { type: 'playAction', card: B }); check(r.ok && r.state.players[0].active.hp === hb + 3, 'Bengkel: heal 3')
  const full = battle(); check(E.apply(full, { type: 'playAction', card: give(full, 0, 'sup-bengkel') }).reason === 'fullHP', 'Bengkel refused at full HP')

  st = battle(); const N = give(st, 0, 'sup-nitro'); st.players[0].nitro = 0
  r = E.apply(st, { type: 'playAction', card: N }); check(r.ok && r.state.players[0].nitro === 1, 'Nitro Isi: +1 Nitro')
  st.players[0].nitro = 3; check(E.apply(st, { type: 'playAction', card: N }).reason === 'nitroFull', 'Nitro Isi refused when full')

  st = battle(); const X = give(st, 0, 'sup-tukar'); const spare = give(st, 0, 'truck-009'); const oldA = st.players[0].active.inst
  r = E.apply(st, { type: 'playAction', card: X, target: spare })
  check(r.ok && r.state.players[0].active.inst === spare && r.state.players[0].hand.includes(oldA) && r.state.players[0].active.fuel === 4, 'Tukar Ban: chosen hand truck rolls in free, old truck back to hand, bensin kept')
  const sw1 = E.apply(st, { type: 'playTruck', card: spare }).state
  check(E.apply(sw1, { type: 'playAction', card: X, target: give(sw1, 0, 'truck-010') }).ok, 'Tukar Ban works even after the normal once-per-turn swap')
  const nohand = battle(); nohand.players[0].hand = []; const X2 = give(nohand, 0, 'sup-tukar'); check(E.apply(nohand, { type: 'playAction', card: X2 }).reason === 'noTruckInHand', 'Tukar Ban refused with no truck in hand')

  st = battle(); const a1 = give(st, 0, 'sup-turbo'), a2 = give(st, 0, 'sup-nitro'), a3 = give(st, 0, 'sup-perisai')
  st = E.apply(E.apply(st, { type: 'playAction', card: a1 }).state, { type: 'playAction', card: a2 }).state
  const cap = E.apply(st, { type: 'playAction', card: a3 }); check(!cap.ok && cap.reason === 'supportLimit', 'max 2 support cards per turn')
  check(E.apply(E.apply(E.apply(st, { type: 'endTurn' }).state, { type: 'endTurn' }).state, { type: 'playAction', card: a3 }).ok, 'the cap resets every turn')
}
{ // every refusal carries a reason the UI can show; skip does not break the turn counter / game end
  const st = battle(); const refused = ['sup-bengkel'].map(id => E.why(st, { type: 'playAction', card: give(st, 0, id), p: 0 }))
  check(refused[0] === 'fullHP', 'E.why exposes the refusal reason for greyed-out cards')
}
{ // AI plays supports and still finishes; support actually used
  let used = {}, n = 0
  for (let s = 1; s <= 200; s++) { const r = play(s); if (r.err) { check(false, r.err); break }; for (const e of r.st.log) if (e.t === 'action') used[e.effect] = (used[e.effect] || 0) + 1; n++ }
  const kinds = ['boost', 'shield', 'skip', 'stun', 'down', 'heal', 'swapIn', 'nitro']
  check(kinds.every(k => used[k] > 0), 'AI plays every support type over 200 battles: ' + JSON.stringify(used))
}
{ // a full hand skips the draw at turn start (never above the limit through drawing, so no forced discard)
  const st = battle(5); const Q = st.players[1]; while (Q.hand.length < E.RULES.HAND_LIMIT) give(st, 1, 'sup-nitro')
  const r = E.apply(st, { type: 'endTurn' })
  check(r.ok && Q.hand.length === r.state.players[1].hand.length && r.events.some(e => e.t === 'drawSkip' && e.full), 'full hand (7): the turn-start draw is skipped, hand stays 7')
}
console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
