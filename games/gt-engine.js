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
  var RULES = { HAND_START: 5, HAND_LIMIT: 7, FUEL_MAX: 4, BENCH_MAX: 0, KO_TO_WIN: 3, LIVES: 3, WRONG_PCT: 0.25, SUPPORT_PER_TURN: 2, FUEL_AUTO: 1, TYPE_BONUS: 2, TYPE_WEAK: 1, CORRECT_BONUS: 2, NITRO_FULL: 3, NITRO_BONUS: 2, SWAP_FUEL: 0, LP: 50 }

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
    var st = { v: 2, seed: o.seed >>> 0, rng: o.seed | 0, turn: 1, active: 0, phase: 'setup', winner: null, draw: false,
      arena: o.arena || 'lumpur', maxTurns: o.maxTurns || 40, cards: {}, players: [], seen: {}, log: [], pending: null, next: 1 }
    ;[o.p1, o.p2].forEach(function (p, pi) {
      var starter = p.trucks ? { deck: C.makeDeck(p.trucks) } : C.STARTERS[p.starter]
      if (!starter) throw new Error('unknown starter ' + p.starter)
      var deck = starter.deck.map(function (id) { var inst = 'c' + (st.next++); st.cards[inst] = id; return inst })
      st.players.push({ name: p.name || ('Pemain ' + (pi + 1)), deck: deck, hand: [], discard: [], active: null, bench: [], ko: 0, lp: RULES.LP, skip: 0, skipImmune: false, played: 0,
        fuelPlayed: false, swapped: false, wounds: {}, nitro: 0, boost: 0, reshuffled: false, lastAttack: null })
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
      armor: O.active ? sum(partsOf(st, O.active), 'armor') : 0, down: stat(tr).down, fuelNeed: fuelNeed(st, tr, atk), fuel: tr.fuel, correctBonus: RULES.CORRECT_BONUS }
    out.total = Math.max(1, out.base + out.parts + out.type + out.arena + out.boost + out.nitro - out.armor - out.weak - out.down)
    // a WRONG answer is a glancing hit: 25% of the power (Nitro is not spent), rounded down, min 0
    out.glance = Math.max(0, Math.floor((out.total - out.nitro) * RULES.WRONG_PCT))
    return out
  }
  function arenaOf (st) { for (var i = 0; i < C.ARENAS.length; i++) if (C.ARENAS[i].id === st.arena) return C.ARENAS[i]; return C.ARENAS[0] }
  // A truck swapped out keeps its damage (owner 2026-10-17: "kalau kartu saya ganti sebelum kalah, selalu -- nyawa
  // tidak berkurang, tak terkalahkan?"). It used to come back from the deck/hand at FULL HP, so swapping before a KO
  // was free healing: in 400 simulated games the always-swap player won 96% (normal play 67%). Now the damage is
  // remembered per card and applied when that truck rolls in again; swapping stays a type tactic, not a heal.
  function truckState (st, inst, P) { var d = def(st, inst), w = P && P.wounds && P.wounds[inst] || 0
    if (w) delete P.wounds[inst]
    return { inst: inst, hp: Math.max(1, d.hp - w), maxHp: d.hp, fuel: 0, parts: { tire: null, body: null, engine: null },
    status: { stun: 0, resist: 0, down: 0, downT: 0, shield: 0, shieldT: 0 } } }
  function wound (P, t) { if (t.hp < t.maxHp) { P.wounds = P.wounds || {}; P.wounds[t.inst] = t.maxHp - t.hp } }
  // status badges (all expire at the end of the OWNER's own turn, see tickStatus): stun = cannot attack, resist = cannot be
  // stunned again, down = next attack weaker by N, shield = absorbs N damage points
  function stat (tr) { return (tr && tr.status) || { stun: 0, resist: 0, down: 0, downT: 0, shield: 0, shieldT: 0 } }
  function tickStatus (tr, ev, pi) {
    if (!tr || !tr.status) return
    var S = tr.status
    if (S.stun > 0) { S.stun--; if (!S.stun) { S.resist = 1; ev.push({ t: 'statusEnd', p: pi, card: tr.inst, status: 'stun' }) } }
    else if (S.resist > 0) S.resist--
    if (S.downT > 0) { S.downT--; if (!S.downT) { S.down = 0; ev.push({ t: 'statusEnd', p: pi, card: tr.inst, status: 'down' }) } }
    if (S.shieldT > 0) { S.shieldT--; if (!S.shieldT) { S.shield = 0; ev.push({ t: 'statusEnd', p: pi, card: tr.inst, status: 'shield' }) } }
  }

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
        if (P.active && P.active.fuel < RULES.SWAP_FUEL) return 'swapFuel'
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
        if (P.played >= RULES.SUPPORT_PER_TURN) return 'supportLimit'
        return null
      case 'playAction': {
        if (!inHand || cat(st, cmd.card) !== 'action') return 'notAnAction'
        var a = def(st, cmd.card)
        if (!P.active && a.effect !== 'draw') return 'noTruck'
        if (P.played >= RULES.SUPPORT_PER_TURN) return 'supportLimit'
        var O2 = st.players[1 - st.active], os = stat(O2.active), ms = stat(P.active)
        if (a.effect === 'boost' && P.boost > 0) return 'alreadyBoosted'
        if (a.effect === 'shield' && ms.shield > 0) return 'alreadyShield'
        if (a.effect === 'skip' && (O2.skip > 0 || O2.skipImmune)) return 'justSkipped'
        if ((a.effect === 'stun' || a.effect === 'down') && !O2.active) return 'noTarget'
        if (a.effect === 'stun' && (os.stun > 0 || os.resist > 0)) return 'alreadyStunned'
        if (a.effect === 'down' && os.down > 0) return 'alreadyOily'
        if (a.effect === 'nitro' && P.nitro >= RULES.NITRO_FULL) return 'nitroFull'
        if (a.effect === 'swapIn') {
          var hasT = P.hand.some(function (x) { return cat(st, x) === 'truck' })
          if (!hasT) return 'noTruckInHand'
          if (cmd.target && (P.hand.indexOf(cmd.target) < 0 || cat(st, cmd.target) !== 'truck')) return 'badTarget'
        }
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
        if (stat(P.active).stun > 0) return 'stunned'
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
    if (hi >= 0) { var c = P.hand.splice(hi, 1)[0]; P.active = truckState(st, c, P); ev.push({ t: 'promote', p: pi, from: 'hand', card: c }); return true }
    // search the deck (shown as a search, not a hidden rule), then the discard
    var di = P.deck.findIndex(function (x) { return cat(st, x) === 'truck' })
    if (di >= 0) { var c2 = P.deck.splice(di, 1)[0]; P.active = truckState(st, c2, P); ev.push({ t: 'promote', p: pi, from: 'deck', card: c2 }); return true }
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
    P.fuelPlayed = false; P.swapped = false; P.played = 0
    ev.push({ t: 'turnStart', p: st.active, turn: st.turn })
    if (st.turn > st.maxTurns) {
      var a = st.players[0], b = st.players[1]
      if (a.lp !== b.lp) return finish(st, ev, a.lp > b.lp ? 0 : 1, 'turnLimit')
      var ha = a.active ? a.active.hp : 0, hb = b.active ? b.active.hp : 0
      return finish(st, ev, ha === hb ? null : (ha > hb ? 0 : 1), 'turnLimit')
    }
    if (!P.active && !promote(st, st.active, ev)) return finish(st, ev, 1 - st.active, 'noTrucksLeft')
    if (P.hand.length < RULES.HAND_LIMIT) draw1(st, P, st.active, ev)       // a full hand just skips the draw: no forced discard step
    else ev.push({ t: 'drawSkip', p: st.active, full: true })
    if (P.active.fuel < RULES.FUEL_MAX) { P.active.fuel = Math.min(RULES.FUEL_MAX, P.active.fuel + RULES.FUEL_AUTO); ev.push({ t: 'autoFuel', p: st.active, fuel: P.active.fuel }) }
    if (P.skip > 0) {                           // Rem Darurat: this turn is lost (a skipped side cannot be skipped twice in a row)
      P.skip--; P.skipImmune = true
      ev.push({ t: 'skipTurn', p: st.active })
      return endTurn(st, ev)
    }
    P.skipImmune = false
  }

  function resolveAttack (st, correct, ev) {
    var pi = st.active, P = st.players[pi], O = st.players[1 - pi], pend = st.pending
    var pv = preview(st, pend.attack)
    // the ANSWER decides the hit: right = full power + bonus (+ Nitro); wrong = 25% of the power ("lemah")
    var dmg = correct ? pv.total + RULES.CORRECT_BONUS : pv.glance
    var arena = arenaOf(st)
    if (correct) P.nitro = Math.min(RULES.NITRO_FULL, P.nitro + (arena.nitroPerCorrect || 1) + (arena.nitroBonus || 0))
    if (correct && pv.nitro) P.nitro = 0        // the full Nitro bar was spent on this attack (a glancing hit keeps it)
    P.boost = 0
    var AS = P.active.status; if (AS) { AS.down = 0; AS.downT = 0 }   // Tumpahan Oli is used up by the attack it weakened
    var DS = O.active.status, absorbed = 0
    if (DS && DS.shield > 0 && dmg > 0) {       // Perisai soaks damage points first
      absorbed = Math.min(DS.shield, dmg); DS.shield -= absorbed; dmg -= absorbed
      if (!DS.shield) DS.shieldT = 0
    }
    var before = O.active.hp
    O.active.hp = Math.max(0, O.active.hp - dmg)
    // LIFE POINTS (owner 2026-10-17 "inflict damage ke life point ... agar fair, tidak ada cara curang"): every point of
    // damage also comes off the player's LP, the overkill too. Swapping a hurt truck out can no longer hide damage.
    O.lp = Math.max(0, O.lp - dmg)
    P.lastAttack = { attack: pend.attack, correct: correct, dmg: dmg }
    ev.push({ t: 'attack', p: pi, card: P.active.inst, attack: pend.attack, correct: !!correct, glancing: !correct, breakdown: pv, dmg: dmg, absorbed: absorbed, hpBefore: before, hpAfter: O.active.hp, target: O.active.inst, lp: O.lp })
    st.pending = null
    if (O.lp <= 0) {                            // LP gone: the match is won, whatever truck is still standing
      if (O.active.hp === 0) { var ko0 = O.active.inst; discardTruck(st, O, O.active); O.active = null; P.ko++; ev.push({ t: 'ko', p: 1 - pi, card: ko0, byP: pi, koCount: P.ko, lp: 0 }) }
      return finish(st, ev, pi, 'lp')
    }
    if (O.active.hp === 0) {
      var ko = O.active.inst
      discardTruck(st, O, O.active); O.active = null; P.ko++
      ev.push({ t: 'ko', p: 1 - pi, card: ko, byP: pi, koCount: P.ko, lp: O.lp })
      // a KO earns a card — only while the hand has room (never forces a discard)
      if (P.hand.length < RULES.HAND_LIMIT - 1) { var bonus = draw1(st, P, pi, ev); if (bonus) ev.push({ t: 'koReward', p: pi, card: bonus }) }
    }
    st.phase = 'garage'
    endTurn(st, ev)                            // an attack ends the turn (TCG convention, keeps turns short)
  }
  function endTurn (st, ev) {
    var Pe = st.players[st.active]
    Pe.boost = 0                                // Turbo is "this turn" only
    tickStatus(Pe.active, ev, st.active)
    ev.push({ t: 'turnEnd', p: st.active })
    startTurn(st, ev)
  }

  function exec (st, cmd, ev) {
    var P = st.players[st.active], pi = st.active
    switch (cmd.type) {
      case 'playTruck': {
        P.hand.splice(P.hand.indexOf(cmd.card), 1)
        var tr = truckState(st, cmd.card, P)
        if (!P.active) { P.active = tr; ev.push({ t: 'playTruck', p: pi, card: cmd.card, to: 'active' }); return }
        // swap: the old truck goes to the bottom of the deck (parts to discard), its bensin moves over
        var old = P.active
        wound(P, old)
        ;['tire', 'body', 'engine'].forEach(function (sl) { if (old.parts[sl]) P.discard.push(old.parts[sl]) })
        P.deck.push(old.inst); tr.fuel = Math.max(0, old.fuel - RULES.SWAP_FUEL); P.active = tr; P.swapped = true
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
        P.hand.splice(P.hand.indexOf(cmd.card), 1); P.discard.push(cmd.card); P.played++
        var O = st.players[1 - pi]
        ev.push({ t: 'action', p: pi, card: cmd.card, effect: a.effect, value: a.value })
        if (a.effect === 'heal') { var h0 = P.active.hp; P.active.hp = Math.min(P.active.maxHp, P.active.hp + a.value); var hl = P.active.hp - h0; P.lp = Math.min(RULES.LP, P.lp + hl); ev.push({ t: 'heal', p: pi, amount: hl, lp: P.lp }) }
        if (a.effect === 'draw') draw1(st, P, pi, ev)
        if (a.effect === 'fuel') { P.active.fuel = Math.min(RULES.FUEL_MAX, P.active.fuel + a.value); ev.push({ t: 'fuel', p: pi, fuel: P.active.fuel }) }
        if (a.effect === 'boost') P.boost += a.value
        if (a.effect === 'nitro') P.nitro = Math.min(RULES.NITRO_FULL, P.nitro + a.value)
        if (a.effect === 'shield') { P.active.status.shield = a.value; P.active.status.shieldT = 2; ev.push({ t: 'status', p: pi, card: P.active.inst, status: 'shield', value: a.value }) }
        if (a.effect === 'skip') { O.skip = a.value; ev.push({ t: 'status', p: 1 - pi, status: 'skip' }) }
        if (a.effect === 'stun') { O.active.status.stun = 1; ev.push({ t: 'status', p: 1 - pi, card: O.active.inst, status: 'stun' }) }
        if (a.effect === 'down') { O.active.status.down = a.value; O.active.status.downT = 1; ev.push({ t: 'status', p: 1 - pi, card: O.active.inst, status: 'down', value: a.value }) }
        if (a.effect === 'swapIn') {            // Tukar Ban: a truck from the hand rolls in free (no "once per turn"), the old one returns to the hand
          var tc = cmd.target && P.hand.indexOf(cmd.target) >= 0 ? cmd.target : P.hand.filter(function (x) { return cat(st, x) === 'truck' })[0]
          P.hand.splice(P.hand.indexOf(tc), 1)
          var oldT = P.active, nt = truckState(st, tc, P)
          wound(P, oldT)
          ;['tire', 'body', 'engine'].forEach(function (sl) { if (oldT.parts[sl]) P.discard.push(oldT.parts[sl]) })
          P.hand.push(oldT.inst); nt.fuel = oldT.fuel; P.active = nt
          ev.push({ t: 'playTruck', p: pi, card: tc, to: 'active', swap: oldT.inst, free: true })
        }
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
  /* sensible support use: returns a legal support command worth playing now, or null */
  function aiSupport (st, level, L) {
    var P = st.players[st.active], O = st.players[1 - st.active], p = st.active
    var racer = level === 'racer'
    if (P.played >= RULES.SUPPORT_PER_TURN || !P.active) return null
    var ms = stat(P.active), os = stat(O.active)
    var canAtk = L.some(function (c) { return c.type === 'attack' })
    var best = 0
    if (O.active) def(st, O.active.inst).attacks.forEach(function (a) { best = Math.max(best, a.dmg) })
    var frac = P.active.hp / P.active.maxHp
    var cands = L.filter(function (c) { return c.type === 'playAction' })
    var by = function (e) { return cands.filter(function (c) { return def(st, c.card).effect === e })[0] }
    var roll = function () { return racer || rand(st) < 0.6 }
    var c
    if ((c = by('heal')) && frac <= (racer ? 0.55 : 0.4)) return c
    if ((c = by('shield')) && O.active && best >= 3 && frac < 0.9 && roll()) return c
    if ((c = by('skip')) && O.active && (frac < 0.5 || O.active.hp > P.active.hp) && roll()) return c
    if ((c = by('stun')) && O.active && best >= 4 && roll()) return c
    if ((c = by('down')) && O.active && best >= 3 && roll()) return c
    if ((c = by('swapIn')) && O.active) {
      var tt = P.hand.filter(function (x) { return cat(st, x) === 'truck' && def(st, x).strongVs === def(st, O.active.inst).type })[0]
      var bad = def(st, P.active.inst).strongVs !== def(st, O.active.inst).type
      if (tt && bad && racer) return { type: 'playAction', card: c.card, target: tt, p: p }
      if (frac <= 0.3 && racer) return { type: 'playAction', card: c.card, p: p }
    }
    if ((c = by('boost')) && canAtk && roll()) return c
    if ((c = by('nitro')) && P.nitro >= 1 && roll()) return c
    if ((c = by('nitro')) && racer && P.nitro === 0 && rand(st) < 0.3) return c
    if ((c = cands.filter(function (x) { var e = def(st, x.card).effect; return e === 'fuel' || e === 'draw' })[0]) && roll()) return c
    return null
  }

  function ai (st, level) {
    var P = st.players[st.active], O = st.players[1 - st.active], L = legal(st), p = st.active
    var pick = function (t, f) { return L.filter(function (c) { return c.type === t && (!f || f(c)) })[0] }
    if (st.phase === 'challenge') return { type: 'answer', correct: rand(st) < (level === 'racer' ? 0.75 : 0.45), p: p }
    if (P.hand.length > RULES.HAND_LIMIT) {     // keep trucks, drop the least useful
      var worst = P.hand.slice().sort(function (a, b) { var r = { action: 0, part: 1, fuel: 2, truck: 3 }; return r[cat(st, a)] - r[cat(st, b)] })[0]
      return { type: 'discard', card: worst, p: p }
    }
    if (!P.active) return pick('playTruck')
    var f = pick('attachFuel'); if (f) return f
    var sup = aiSupport(st, level, L); if (sup) return sup
    var part = pick('attachPart', function (c) { return !P.active.parts[def(st, c.card).slot] })
    if (part && (level === 'racer' || rand(st) < 0.5)) return part
    if (level === 'racer' && O.active && def(st, P.active.inst).strongVs !== def(st, O.active.inst).type) {
      var sw = pick('playTruck', function (c) { return def(st, c.card).strongVs === def(st, O.active.inst).type })
      if (sw) return sw
    }
    var atks = L.filter(function (c) { return c.type === 'attack' })
    if (atks.length) {
      atks.sort(function (a, b) { return preview(st, b.attack).total - preview(st, a.attack).total })
      if (level !== 'racer') return atks[atks.length - 1]
      if (O.active) {                             // prefer an attack that KOs even without the bonus
        var ko = atks.filter(function (c) { return preview(st, c.attack).total >= O.active.hp })[0]
        if (ko) return ko
      }
      return atks[0]
    }
    return { type: 'endTurn', p: p }
  }

  W.GTEngine = { RULES: RULES, why: check, stat: stat, create: create, apply: apply, legal: legal, ai: ai, preview: preview, def: def, arena: arenaOf,
    hash: function (st) { var s = JSON.stringify([st.players, st.turn, st.active, st.phase, st.winner, st.rng]); var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return (h >>> 0).toString(16) } }
  if (typeof module !== 'undefined' && module.exports) module.exports = W.GTEngine
})()
