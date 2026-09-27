/* ============================================================================
 * gt-engine.js — window.GTEngine. Garasi Tempur rules engine (PRD v2 §4, v1 §11–§12, §27–§29).
 *
 * ONE place for every rule and every number. The UI and the animations only
 * READ state and REPLAY events; they never compute damage (PRD: "combat
 * arithmetic lives in one battle engine"). Pure, deterministic, serialisable:
 *
 *   var st = GTEngine.create({ seed, p1:{name,starter}, p2:{name,starter}, arena, maxTurns })
 *   var r  = GTEngine.apply(st, cmd)   // -> { ok, state, events, reason }
 *   GTEngine.legal(st)                 // -> commands the active player may send now
 *   GTEngine.ai(st, level)             // -> the next command for the active player ('rookie'|'racer')
 *   GTEngine.preview(st, attackIdx)    // -> { base, parts, type, arena, boost, nitro, armor, total } (no answer bonus)
 *
 * Commands carry an `id`; a repeated id is ignored (double tap / double drag = one action).
 * An illegal command returns { ok:false, reason } and changes NOTHING.
 * Attacks: 'attack' opens a Boost challenge (phase 'challenge'); 'answer' {correct} resolves it.
 * The engine does not generate questions — the UI asks, then reports correct/incorrect.
 * ==========================================================================*/
(function () {
  'use strict'
  var W = (typeof window !== 'undefined' ? window : globalThis)
  var C = W.GTCards || (typeof require === 'function' ? require('./data/gt-cards.js') : null)

  // BENCH_MAX 0 (owner 2026-09-27: "seperti pokemon hanya 1 kartu di arena"): one truck per side;
  // the other trucks wait in the hand/deck and step in when the active one is knocked out.
  var RULES = { HAND_START: 5, HAND_LIMIT: 7, FUEL_MAX: 4, BENCH_MAX: 0, KO_TO_WIN: 3, FUEL_AUTO: 1, TYPE_BONUS: 2, TYPE_WEAK: 1, CORRECT_BONUS: 2, NITRO_FULL: 3, NITRO_BONUS: 2 }

  /* ── rng (mulberry32, state stored as an int) ─────────────────────────── */
  function rand (st) {
    var t = (st.rng = (st.rng + 0x6D2B79F5) | 0)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  function shuffle (st, a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rand(st) * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t }
    return a
  }
  function clone (o) { return JSON.parse(JSON.stringify(o)) }
  function def (st, inst) { return C.get(st.cards[inst]) }
  function cat (st, inst) { var d = def(st, inst); return d ? d.cat : null }

  /* ── setup ───────────────────────────────────────────────────────────── */
  function create (o) {
    var st = { v: 1, seed: o.seed >>> 0, rng: o.seed | 0, turn: 1, active: 0, phase: 'setup', winner: null, draw: false,
      arena: o.arena || 'lumpur', maxTurns: o.maxTurns || 40, cards: {}, players: [], seen: {}, log: [], pending: null, next: 1 }
    ;[o.p1, o.p2].forEach(function (p, pi) {
      var starter = p.trucks ? { deck: C.makeDeck(p.trucks) } : C.STARTERS[p.starter]
      if (!starter) throw new Error('unknown starter ' + p.starter)
      var deck = starter.deck.map(function (id) { var inst = 'c' + (st.next++); st.cards[inst] = id; return inst })
      st.players.push({ name: p.name || ('Pemain ' + (pi + 1)), deck: deck, hand: [], discard: [], active: null, bench: [], ko: 0,
        fuelPlayed: false, swapped: false, nitro: 0, boost: 0, reshuffled: false, lastAttack: null })
    })
    var ev = []
    st.players.forEach(function (P, pi) {
      // opening hand of 5 that always holds a truck (a truckless opening would soft-lock the
      // child): shuffle once; if no truck came up (~40% of shuffles with 3 trucks in 20), swap the
      // last hand card with the first truck in the deck — one path, exercised on every seed
      shuffle(st, P.deck)
      P.hand = P.deck.slice(0, RULES.HAND_START); P.deck = P.deck.slice(RULES.HAND_START)
      if (!P.hand.some(function (x) { return cat(st, x) === 'truck' })) {
        var ti = P.deck.findIndex(function (x) { return cat(st, x) === 'truck' })
        var out = P.hand.pop(); P.hand.push(P.deck[ti]); P.deck[ti] = out
        ev.push({ t: 'mulligan', p: pi })
      }
      ev.push({ t: 'deal', p: pi, n: P.hand.length })
      // both trucks start on the field (audit: turn 1 was always dead and the AI always swung first)
      promote(st, pi, ev)
    })
    // bensin is automatic: the first player starts with 1 (the second gets its +1 at its first turn)
    if (st.players[0].active) { st.players[0].active.fuel = RULES.FUEL_AUTO; ev.push({ t: 'autoFuel', p: 0, fuel: st.players[0].active.fuel }) }
    st.phase = 'garage'
    ev.push({ t: 'turnStart', p: 0, turn: 1 })
    st.log = ev.slice()
    return st
  }

  /* ── derived numbers ─────────────────────────────────────────────────── */
  function partsOf (st, tr) { return ['tire', 'body', 'engine'].map(function (s) { return tr.parts[s] ? def(st, tr.parts[s]) : null }).filter(Boolean) }
  function sum (arr, k) { return arr.reduce(function (n, p) { return n + (p[k] || 0) }, 0) }
  function fuelNeed (st, tr, atk) { return atk.fuel + sum(partsOf(st, tr), 'fuelTax') }
  function preview (st, idx, forPlayer) {
    var pi = forPlayer === undefined ? st.active : forPlayer
    var P = st.players[pi], O = st.players[1 - pi], tr = P.active
    if (!tr) return null
    var d = def(st, tr.inst), atk = d.attacks[idx]
    var tgt = O.active ? def(st, O.active.inst) : null
    var arena = arenaOf(st)
    // Type triangle both ways: strong vs the target = SUPER (+2); the target strong vs you = weak (−1)
    var out = { base: atk.dmg, parts: sum(partsOf(st, tr), 'dmg'), type: tgt && d.strongVs === tgt.type ? RULES.TYPE_BONUS : 0,
      weak: tgt && tgt.strongVs === d.type ? RULES.TYPE_WEAK : 0,
      arena: (arena.mod && arena.mod[d.type]) || 0, boost: P.boost, nitro: P.nitro >= RULES.NITRO_FULL ? RULES.NITRO_BONUS : 0,
      armor: O.active ? sum(partsOf(st, O.active), 'armor') : 0, fuelNeed: fuelNeed(st, tr, atk), fuel: tr.fuel, correctBonus: RULES.CORRECT_BONUS }
    out.total = Math.max(1, out.base + out.parts + out.type + out.arena + out.boost + out.nitro - out.armor - out.weak)
    return out
  }
  function arenaOf (st) { for (var i = 0; i < C.ARENAS.length; i++) if (C.ARENAS[i].id === st.arena) return C.ARENAS[i]; return C.ARENAS[0] }
  function truckState (st, inst) { var d = def(st, inst); return { inst: inst, hp: d.hp, maxHp: d.hp, fuel: 0, parts: { tire: null, body: null, engine: null } } }

  /* ── legality ────────────────────────────────────────────────────────── */
  function check (st, cmd) {
    if (st.phase === 'over') return 'gameOver'
    var P = st.players[st.active]
    if (cmd.p !== undefined && cmd.p !== st.active) return 'notYourTurn'
    var inHand = cmd.card && P.hand.indexOf(cmd.card) >= 0
    if (st.phase === 'challenge') return cmd.type === 'answer' ? null : 'answerFirst'
    if (cmd.type === 'answer') return 'noChallenge'
    if (cmd.type === 'discard') return inHand ? null : 'notInHand'
    if (P.hand.length > RULES.HAND_LIMIT && cmd.type !== 'discard') return 'handLimit'
    switch (cmd.type) {
      case 'playTruck':                       // with a truck already out this is "Ganti Truk" (once per turn)
        if (!inHand || cat(st, cmd.card) !== 'truck') return 'notATruck'
        if (P.active && P.swapped) return 'swapOnce'
        return null
      case 'attachFuel':
        if (!inHand || cat(st, cmd.card) !== 'fuel') return 'notFuel'
        if (!P.active) return 'noTruck'
        if (P.fuelPlayed) return 'fuelOncePerTurn'
        if (P.active.fuel >= RULES.FUEL_MAX) return 'fuelFull'
        return null
      case 'attachPart':
        if (!inHand || cat(st, cmd.card) !== 'part') return 'notAPart'
        if (!P.active) return 'noTruck'
        return null
      case 'playAction': {
        if (!inHand || cat(st, cmd.card) !== 'action') return 'notAnAction'
        var a = def(st, cmd.card)
        if (!P.active && a.effect !== 'draw') return 'noTruck'
        if (a.effect === 'heal' && P.active.hp >= P.active.maxHp) return 'fullHP'
        if (a.effect === 'fuel' && P.active.fuel >= RULES.FUEL_MAX) return 'fuelFull'
        if (a.effect === 'switch' && !P.bench.length) return 'nothingToSwitch'
        if (a.effect === 'draw' && !P.deck.length && (P.reshuffled || !P.discard.length)) return 'deckEmpty'
        return null
      }
      case 'attack': {
        if (!P.active) return 'noTruck'
        var O = st.players[1 - st.active]
        if (!O.active) return 'noTarget'
        var atk = def(st, P.active.inst).attacks[cmd.attack]
        if (!atk) return 'noSuchAttack'
        if (P.active.fuel < fuelNeed(st, P.active, atk)) return 'needFuel'
        return null
      }
      case 'endTurn': return null
    }
    return 'unknownCommand'
  }

  /* ── state transitions ───────────────────────────────────────────────── */
  function draw1 (st, P, pi, ev) {
    if (!P.deck.length) {
      if (P.reshuffled || !P.discard.length) { ev.push({ t: 'drawSkip', p: pi }); return null }
      P.deck = shuffle(st, P.discard.splice(0)); P.reshuffled = true
      ev.push({ t: 'reshuffle', p: pi, n: P.deck.length })
    }
    var c = P.deck.shift(); P.hand.push(c); ev.push({ t: 'draw', p: pi, card: c })
    return c
  }
  function discardTruck (st, P, tr) {
    ;['tire', 'body', 'engine'].forEach(function (s) { if (tr.parts[s]) P.discard.push(tr.parts[s]) })
    P.discard.push(tr.inst)
  }
  function promote (st, pi, ev) {             // a knocked-out side always gets a truck back if it has one anywhere
    var P = st.players[pi]
    if (P.active) return true
    if (P.bench.length) { P.active = P.bench.shift(); ev.push({ t: 'promote', p: pi, from: 'bench', card: P.active.inst }); return true }
    var hi = P.hand.findIndex(function (x) { return cat(st, x) === 'truck' })
    if (hi >= 0) { var c = P.hand.splice(hi, 1)[0]; P.active = truckState(st, c); ev.push({ t: 'promote', p: pi, from: 'hand', card: c }); return true }
    // search the deck (shown as a search, not a hidden rule), then the discard
    var di = P.deck.findIndex(function (x) { return cat(st, x) === 'truck' })
    if (di >= 0) { var c2 = P.deck.splice(di, 1)[0]; P.active = truckState(st, c2); ev.push({ t: 'promote', p: pi, from: 'deck', card: c2 }); return true }
    return false
  }
  function finish (st, ev, winnerIdx, why) {
    st.phase = 'over'; st.winner = winnerIdx; st.draw = winnerIdx === null
    ev.push({ t: 'gameOver', winner: winnerIdx, why: why })
  }
  function startTurn (st, ev) {
    st.active = 1 - st.active
    if (st.active === 0) st.turn++
    var P = st.players[st.active]
    P.fuelPlayed = false; P.swapped = false
    ev.push({ t: 'turnStart', p: st.active, turn: st.turn })
    if (st.turn > st.maxTurns) {
      var a = st.players[0], b = st.players[1]
      if (a.ko !== b.ko) return finish(st, ev, a.ko > b.ko ? 0 : 1, 'turnLimit')
      var ha = a.active ? a.active.hp : 0, hb = b.active ? b.active.hp : 0
      return finish(st, ev, ha === hb ? null : (ha > hb ? 0 : 1), 'turnLimit')
    }
    if (!P.active && !promote(st, st.active, ev)) return finish(st, ev, 1 - st.active, 'noTrucksLeft')
    draw1(st, P, st.active, ev)
    if (P.active.fuel < RULES.FUEL_MAX) { P.active.fuel = Math.min(RULES.FUEL_MAX, P.active.fuel + RULES.FUEL_AUTO); ev.push({ t: 'autoFuel', p: st.active, fuel: P.active.fuel }) }
  }

  function resolveAttack (st, correct, ev) {
    var pi = st.active, P = st.players[pi], O = st.players[1 - pi], pend = st.pending
    var pv = preview(st, pend.attack)
    var dmg = pv.total + (correct ? RULES.CORRECT_BONUS : 0)
    if (pv.total === 0 && !correct) dmg = 0
    var arena = arenaOf(st)
    if (correct) P.nitro = Math.min(RULES.NITRO_FULL, P.nitro + (arena.nitroPerCorrect || 1) + (arena.nitroBonus || 0))
    if (pv.nitro) P.nitro = 0                   // the full Nitro bar was spent on this attack
    P.boost = 0
    var before = O.active.hp
    O.active.hp = Math.max(0, O.active.hp - dmg)
    P.lastAttack = { attack: pend.attack, correct: correct, dmg: dmg }
    ev.push({ t: 'attack', p: pi, card: P.active.inst, attack: pend.attack, correct: !!correct, breakdown: pv, dmg: dmg, hpBefore: before, hpAfter: O.active.hp, target: O.active.inst })
    st.pending = null
    if (O.active.hp === 0) {
      var ko = O.active.inst
      discardTruck(st, O, O.active); O.active = null; P.ko++
      ev.push({ t: 'ko', p: 1 - pi, card: ko, byP: pi, koCount: P.ko })
      if (P.ko >= RULES.KO_TO_WIN) return finish(st, ev, pi, 'ko')
      // a KO earns a card — only while the hand has room (never forces a discard)
      if (P.hand.length < RULES.HAND_LIMIT - 1) { var bonus = draw1(st, P, pi, ev); if (bonus) ev.push({ t: 'koReward', p: pi, card: bonus }) }
    }
    st.phase = 'garage'
    endTurn(st, ev)                            // an attack ends the turn (TCG convention, keeps turns short)
  }
  function endTurn (st, ev) {
    ev.push({ t: 'turnEnd', p: st.active })
    startTurn(st, ev)
  }

  function exec (st, cmd, ev) {
    var P = st.players[st.active], pi = st.active
    switch (cmd.type) {
      case 'playTruck': {
        P.hand.splice(P.hand.indexOf(cmd.card), 1)
        var tr = truckState(st, cmd.card)
        if (!P.active) { P.active = tr; ev.push({ t: 'playTruck', p: pi, card: cmd.card, to: 'active' }); return }
        // swap: the old truck goes to the bottom of the deck (parts to discard), its bensin moves over
        var old = P.active
        ;['tire', 'body', 'engine'].forEach(function (sl) { if (old.parts[sl]) P.discard.push(old.parts[sl]) })
        P.deck.push(old.inst); tr.fuel = old.fuel; P.active = tr; P.swapped = true
        ev.push({ t: 'playTruck', p: pi, card: cmd.card, to: 'active', swap: old.inst })
        return
      }
      case 'attachFuel':
        P.hand.splice(P.hand.indexOf(cmd.card), 1); P.discard.push(cmd.card)
        P.active.fuel++; P.fuelPlayed = true
        ev.push({ t: 'fuel', p: pi, card: cmd.card, fuel: P.active.fuel }); return
      case 'attachPart': {
        var d = def(st, cmd.card), slot = d.slot, old = P.active.parts[slot]
        P.hand.splice(P.hand.indexOf(cmd.card), 1)
        if (old) {                              // replacing a part discards the old one; HP bonus comes off first
          var od = def(st, old)
          P.active.maxHp -= od.hp || 0; P.active.hp = Math.min(P.active.hp, P.active.maxHp); P.active.hp = Math.max(1, P.active.hp)
          P.discard.push(old); ev.push({ t: 'partOff', p: pi, card: old, slot: slot })
        }
        P.active.parts[slot] = cmd.card
        P.active.maxHp += d.hp || 0; P.active.hp += d.hp || 0
        if (d.nitro) P.nitro = Math.min(RULES.NITRO_FULL, P.nitro + d.nitro)
        ev.push({ t: 'part', p: pi, card: cmd.card, slot: slot, hp: P.active.hp, maxHp: P.active.maxHp }); return
      }
      case 'playAction': {
        var a = def(st, cmd.card)
        P.hand.splice(P.hand.indexOf(cmd.card), 1); P.discard.push(cmd.card)
        ev.push({ t: 'action', p: pi, card: cmd.card, effect: a.effect })
        if (a.effect === 'heal') { var h0 = P.active.hp; P.active.hp = Math.min(P.active.maxHp, P.active.hp + a.value); ev.push({ t: 'heal', p: pi, amount: P.active.hp - h0 }) }
        if (a.effect === 'draw') draw1(st, P, pi, ev)
        if (a.effect === 'fuel') { P.active.fuel = Math.min(RULES.FUEL_MAX, P.active.fuel + a.value); ev.push({ t: 'fuel', p: pi, fuel: P.active.fuel }) }
        if (a.effect === 'boost') P.boost += a.value
        if (a.effect === 'nitro') P.nitro = Math.min(RULES.NITRO_FULL, P.nitro + a.value)
        if (a.effect === 'switch') { var b = P.bench.shift(); P.bench.push(P.active); P.active = b; ev.push({ t: 'switch', p: pi, card: b.inst }) }
        return
      }
      case 'attack':
        st.pending = { attack: cmd.attack }; st.phase = 'challenge'
        ev.push({ t: 'challenge', p: pi, attack: cmd.attack, preview: preview(st, cmd.attack) }); return
      case 'answer': return resolveAttack(st, !!cmd.correct, ev)
      case 'discard':
        P.hand.splice(P.hand.indexOf(cmd.card), 1); P.discard.push(cmd.card)
        ev.push({ t: 'discard', p: pi, card: cmd.card }); return
      case 'endTurn': return endTurn(st, ev)
    }
  }

  function apply (state, cmd) {
    if (!cmd || !cmd.type) return { ok: false, state: state, events: [], reason: 'badCommand' }
    if (cmd.id && state.seen[cmd.id]) return { ok: true, state: state, events: [], duplicate: true }
    var why = check(state, cmd)
    if (why) return { ok: false, state: state, events: [], reason: why }
    var st = clone(state), ev = []
    if (cmd.id) st.seen[cmd.id] = 1
    exec(st, cmd, ev)
    st.log = st.log.concat(ev)
    if (st.log.length > 400) st.log = st.log.slice(-400)
    return { ok: true, state: st, events: ev }
  }

  /* ── legal commands (UI highlights exactly these) ─────────────────────── */
  function legal (st) {
    var out = [], P = st.players[st.active], p = st.active
    var tryCmd = function (c) { c.p = p; if (!check(st, c)) out.push(c) }
    if (st.phase === 'challenge') return [{ type: 'answer', correct: true, p: p }, { type: 'answer', correct: false, p: p }]
    P.hand.forEach(function (c) {
      ;['playTruck', 'attachFuel', 'attachPart', 'playAction', 'discard'].forEach(function (t) { tryCmd({ type: t, card: c }) })
    })
    if (P.active) def(st, P.active.inst).attacks.forEach(function (_, i) { tryCmd({ type: 'attack', attack: i }) })
    tryCmd({ type: 'endTurn' })
    return out.filter(function (c) { return c.type !== 'discard' || P.hand.length > RULES.HAND_LIMIT })
  }

  /* ── AI (PRD v1 §17) ─────────────────────────────────────────────────── */
  function ai (st, level) {
    var P = st.players[st.active], O = st.players[1 - st.active], L = legal(st), p = st.active
    var pick = function (t, f) { return L.filter(function (c) { return c.type === t && (!f || f(c)) })[0] }
    if (st.phase === 'challenge') return { type: 'answer', correct: rand(st) < (level === 'racer' ? 0.75 : 0.45), p: p }
    if (P.hand.length > RULES.HAND_LIMIT) {     // keep trucks and fuel, drop the least useful
      var worst = P.hand.slice().sort(function (a, b) { var r = { action: 0, part: 1, fuel: 2, truck: 3 }; return r[cat(st, a)] - r[cat(st, b)] })[0]
      return { type: 'discard', card: worst, p: p }
    }
    if (!P.active) return pick('playTruck')
    var f = pick('attachFuel'); if (f) return f
    if (level === 'racer' && P.active.hp <= P.active.maxHp / 2) { var h = pick('playAction', function (c) { return def(st, c.card).effect === 'heal' }); if (h) return h }
    var part = pick('attachPart', function (c) { return !P.active.parts[def(st, c.card).slot] })
    // rookie is the child's first opponent: it skips half its upgrades and swings its weaker
    // attack (measured: a coached child answering 2/3 right won 2 of 26 against the old rookie)
    if (part && (level === 'racer' || rand(st) < 0.5)) return part
    if (level === 'racer' && O.active && def(st, P.active.inst).strongVs !== def(st, O.active.inst).type) {
      var sw = pick('playTruck', function (c) { return def(st, c.card).strongVs === def(st, O.active.inst).type })
      if (sw) return sw
    }
    var boost = pick('playAction', function (c) { var e = def(st, c.card).effect; return e === 'boost' || e === 'nitro' || e === 'fuel' || e === 'draw' })
    if (boost && (level === 'racer' || rand(st) < 0.5)) return boost
    var atks = L.filter(function (c) { return c.type === 'attack' })
    if (atks.length) {
      atks.sort(function (a, b) { return preview(st, b.attack).total - preview(st, a.attack).total })
      if (level !== 'racer') return atks[atks.length - 1]
      if (level === 'racer' && O.active) {        // prefer an attack that KOs even without the bonus
        var ko = atks.filter(function (c) { return preview(st, c.attack).total >= O.active.hp })[0]
        if (ko) return ko
      }
      return atks[0]
    }
    return { type: 'endTurn', p: p }
  }

  W.GTEngine = { RULES: RULES, create: create, apply: apply, legal: legal, ai: ai, preview: preview, def: def, arena: arenaOf,
    hash: function (st) { var s = JSON.stringify([st.players, st.turn, st.active, st.phase, st.winner, st.rng]); var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return (h >>> 0).toString(16) } }
  if (typeof module !== 'undefined' && module.exports) module.exports = W.GTEngine
})()
