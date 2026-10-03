/* =============================================================================
 * mojo-chase-rules.js — window.MojoChaseRules: the headless rules of the G31 3-lane chase (no DOM, no canvas),
 * so qa-mojo-chase can simulate thousands of rows. PRD §7 rubber-banding, §8 lane objects + spawn validation,
 * §13 tiers, §17 no game over, §23 "never three blocking obstacles".
 *
 *   genRow(rng, st)      one row of 3 lane slots -> st.row (reused array, no allocation)
 *   validate(row, reach) repairs a row so a route stays open: never 3 blockers, and at least one free lane is
 *                        reachable from the previous row's reachable lanes with ONE lane change (rows are spaced
 *                        >= 0.8 s apart, a lane change takes 0.3 s)
 *   progress(st, dt)     chase progress 0..1 (1 = capture range) with rubber-banding and a time assist
 *   sim(n, seed, tier)   QA: n rows -> {threeBlock, unreachable, blockers, stars}
 * ==========================================================================*/
(function (W) {
  'use strict'
  var TIERS = {
    A: { gap: 36, obs: 0.16, slip: 0, star: 0.6, box: 0.06 },
    B: { gap: 31, obs: 0.26, slip: 0.03, star: 0.5, box: 0.08 },
    C: { gap: 28, obs: 0.31, slip: 0.07, star: 0.45, box: 0.08 },
    D: { gap: 26, obs: 0.35, slip: 0.1, star: 0.42, box: 0.09 },
    E: { gap: 24, obs: 0.38, slip: 0.1, star: 0.4, box: 0.1 }
  }
  var BLOCK = { crate: 1, barrel: 1, barrier: 1, cone: 1, tyres: 1, rock: 1, hay: 1, banana: 1, oil: 1, pothole: 1 }
  var SLIPS = ['banana', 'oil', 'pothole']
  function isBlock (t) { return !!BLOCK[t] }

  /** repair the row in place; returns the new reachable-lane bitmask (bit k = lane k) */
  function validate (row, reach) {
    var dil = reach | ((reach << 1) & 7) | (reach >> 1), free = 0, i
    for (i = 0; i < 3; i++) if (!isBlock(row[i])) free |= 1 << i
    // never three blockers: open the centre (PRD §23; the centre is the easiest lane to reach)
    if (free === 0) { row[1] = 'star'; free = 2 }
    if (!(free & dil)) {
      // no free lane reachable with one change: open the blocked lane nearest the reachable set
      for (i = 0; i < 3; i++) if (dil & (1 << i)) { row[i] = 'star'; free |= 1 << i; break }
    }
    return free & dil
  }

  /** one row. st: {tier, assist 0..1, obs: [kinds], reach, starLane, rowN, noHazard} */
  function genRow (r, st) {
    var T = TIERS[st.tier] || TIERS.B, row = st.row || (st.row = ['', '', ''])
    var pObs = T.obs * (1 - 0.45 * (st.assist || 0)), pSlip = T.slip * (1 - 0.5 * (st.assist || 0))
    row[0] = row[1] = row[2] = 'none'
    // a star trail guides a lane (route guide); it drifts one lane at a time
    if (r() < T.star) {
      if (r() < 0.3) st.starLane = Math.max(0, Math.min(2, st.starLane + (r() < 0.5 ? -1 : 1)))
      row[st.starLane] = r() < 0.15 ? 'coin' : 'star'
    }
    if (!st.noHazard) {
      for (var i = 0; i < 3; i++) {
        if (row[i] !== 'none') continue
        var x = r()
        if (x < pObs) row[i] = st.obs[Math.floor(r() * st.obs.length)]
        else if (x < pObs + pSlip) row[i] = SLIPS[Math.floor(r() * SLIPS.length)]
      }
    }
    st.reach = validate(row, st.reach == null ? 7 : st.reach)
    if (!st.reach) st.reach = 7
    st.rowN = (st.rowN || 0) + 1
    return row
  }

  /** chase progress. s: {prog, speed (mult), elapsed, seconds, hits, hasRocket, best} -> s.prog */
  function progress (s, dt) {
    var T = s.seconds * 1.3   // clean, boosted driving lands near 60 s on a 70 s stage
    var rel = Math.min(1.7, (s.speed - 0.8) / 0.2)         // 1 at normal, 1.7 boosting, < 0 while dizzy
    var assist = 0.12 * Math.min(4, s.hits)                // repeated mistakes slow the target (PRD §7)
    if (s.elapsed > s.seconds) assist += 0.8               // and the clock never lets a chase drag on
    if (s.elapsed > s.seconds * 1.25) assist += 2
    s.prog += dt * (rel + assist) / T
    s.best = Math.max(s.best || 0, s.prog)
    if (s.prog < s.best - 0.06) s.prog = s.best - 0.06       // a hit costs a little ground, never a lot
    var cap = s.hasRocket ? 1 : 0.9                         // without the rocket the robber waits at 90%
    if (s.prog > cap) s.prog = cap
    if (s.prog < 0) s.prog = 0
    return s.prog
  }

  function rng (seed) { var s = (seed | 0) || 1; return function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff } }
  function sim (n, seed, tier, assist) {
    var r = rng(seed), st = { tier: tier || 'E', assist: assist || 0, obs: ['crate', 'barrel', 'barrier', 'cone', 'tyres'], reach: 7, starLane: 1 }
    var out = { rows: n, threeBlock: 0, unreachable: 0, blockers: 0, stars: 0 }, prev = 7
    for (var i = 0; i < n; i++) {
      var row = genRow(r, st), b = 0, free = 0
      for (var k = 0; k < 3; k++) { if (isBlock(row[k])) { b++; out.blockers++ } else free |= 1 << k; if (row[k] === 'star' || row[k] === 'coin') out.stars++ }
      if (b === 3) out.threeBlock++
      var dil = prev | ((prev << 1) & 7) | (prev >> 1)
      if (!(free & dil)) out.unreachable++
      prev = free & dil || 7
    }
    return out
  }
  W.MojoChaseRules = { TIERS: TIERS, isBlock: isBlock, validate: validate, genRow: genRow, progress: progress, sim: sim, rng: rng, SLIPS: SLIPS }
})(typeof window !== 'undefined' ? window : globalThis)
