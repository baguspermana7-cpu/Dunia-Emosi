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
  /* ── authored "moments" (owner 2026-10-10: "kurang variatif, make it more seru"). A pattern is a short list of rows
     queued ahead of normal random rows. Every pattern keeps >= 1 open lane reachable with ONE lane change per row
     (validated here and by the gate), uses at most 2 blockers per row, and never punishes: stars mark the way. ── */
  var N = 'none'
  function pickLane (r, reach) { var dil = reach | ((reach << 1) & 7) | (reach >> 1), c = []; for (var i = 0; i < 3; i++) if (dil & (1 << i)) c.push(i); return c[Math.floor(r() * c.length)] }
  var PAT = {
    // one blocker weaves across the lanes; a star sits in the lane to dodge into
    slalom: function (r, st) {
      var obs = st.obs[Math.floor(r() * st.obs.length)], seq = r() < 0.5 ? [0, 1, 2, 1, 0] : [2, 1, 0, 1, 2], rows = []
      for (var i = 0; i < seq.length; i++) { var row = [N, N, N]; row[seq[i]] = obs; row[seq[i] === 1 ? (i % 2 ? 0 : 2) : 1] = 'star'; rows.push(row) }
      return rows
    },
    // gates: two blockers, one gap that drifts at most one lane per row; stars mark the gap
    gates: function (r, st) {
      var obs = st.obs[Math.floor(r() * st.obs.length)], g = pickLane(r, st.reach == null ? 7 : st.reach), rows = []
      for (var i = 0; i < 4; i++) { var row = [obs, obs, obs]; row[g] = i === 3 ? 'coin' : 'star'; rows.push(row); if (r() < 0.6) g = Math.max(0, Math.min(2, g + (r() < 0.5 ? -1 : 1))) }
      return rows
    },
    // boost tunnel: three boost pads down the middle, stars along the sides
    tunnel: function () { return [[N, 'pad', N], ['star', 'pad', 'star'], [N, 'pad', N], ['star', N, 'star']] },
    // jump ramp: airtime (hazards pass underneath) and a star arc to follow
    ramp: function (r, st) { var l = pickLane(r, st.reach == null ? 7 : st.reach), rows = [[N, N, N], [N, N, N]]; rows[0][l] = 'ramp'; for (var i = 0; i < 4; i++) { var row = [N, N, N]; row[l] = i === 3 ? 'heart' : 'star'; rows.push(row) } return rows },
    // star trail: a long, safe, rewarding line to follow, drifting one lane
    trail: function (r, st) { var l = pickLane(r, st.reach == null ? 7 : st.reach), rows = []; for (var i = 0; i < 7; i++) { if (i === 3) l = Math.max(0, Math.min(2, l + (r() < 0.5 ? -1 : 1))); var row = [N, N, N]; row[l] = i === 6 ? 'coin' : 'star'; rows.push(row) } return rows },
    // final sprint when the robber is close: pads in a row, stars either side
    // leap (2026-10-18, owner: "barrier bisa swipe ke atas untuk lompat"): an approach star, a barrier across all three
    // lanes ('leapbar' = a barrier the chase marks as must-jump), and a row of stars where the car lands. 'leapbar' is
    // not in BLOCK: the row is passable -- by jumping -- so the reach / never-three-blockers rules leave it alone
    leap: function () { return [[N, 'star', N], ['leapbar', 'leapbar', 'leapbar'], ['star', 'star', 'star']] },
    sprint: function () { return [[N, 'pad', N], ['star', N, 'star'], [N, 'pad', N], ['star', 'star', 'star'], [N, 'pad', N]] }
  }
  // authored flavour per scenery (biome / base): the first name is the signature moment of that place
  var FLAVOUR = {
    coastal: ['ramp', 'trail', 'slalom'], town: ['slalom', 'gates', 'tunnel'], forest: ['slalom', 'ramp', 'trail'], desert: ['gates', 'tunnel', 'ramp'],
    snow: ['trail', 'slalom', 'tunnel'], construction: ['gates', 'slalom', 'ramp'], farm: ['trail', 'ramp', 'gates'], city: ['gates', 'tunnel', 'slalom']
  }
  /** schedule: every 8-14 rows (earlier ones fewer on the easiest tier); never the same moment twice in a row */
  function nextPattern (r, st) {
    var f0 = FLAVOUR[st.flavour] || FLAVOUR.coastal, rot = st.rot || 0, f = [f0[rot % 3], f0[(rot + 1) % 3], f0[(rot + 2) % 3]], i = Math.floor(r() * 5)
    var name = f[i < 2 ? 0 : i < 4 ? 1 : 2]
    if (name === st.lastPat) name = f[(f.indexOf(name) + 1) % f.length]
    st.lastPat = name
    return name
  }
  /** rows of a named pattern for state st (st.reach = the lanes reachable now) */
  function pattern (name, r, st) { return PAT[name] ? PAT[name](r, st) : [] }
  /** the lanes reachable after a queued row (same rule as validate, without repairing) */
  function reachAfter (row, reach) {
    var dil = reach | ((reach << 1) & 7) | (reach >> 1), free = 0
    for (var i = 0; i < 3; i++) if (!isBlock(row[i])) free |= 1 << i
    return (free & dil) || 7
  }
  /** QA: every pattern row stays solvable and never has 3 blockers; returns the count of broken rows */
  function simPatterns (n, seed) {
    var r = rng(seed), out = { patterns: 0, rows: 0, threeBlock: 0, unreachable: 0, seen: {} }
    for (var k = 0; k < n; k++) {
      var st = { obs: ['crate', 'barrel', 'cone', 'barrier'], reach: 7, flavour: Object.keys(FLAVOUR)[k % 8] }, prev = 1 << Math.floor(r() * 3), name = nextPattern(r, st), rows = (st.reach = prev, pattern(name, r, st))
      out.patterns++; out.seen[name] = (out.seen[name] || 0) + 1
      for (var i = 0; i < rows.length; i++) {
        var b = 0, free = 0; for (var j = 0; j < 3; j++) { if (isBlock(rows[i][j])) b++; else free |= 1 << j }
        var dil = prev | ((prev << 1) & 7) | (prev >> 1); out.rows++
        if (b === 3) out.threeBlock++
        if (!(free & dil)) out.unreachable++
        prev = free & dil || 7
      }
    }
    return out
  }
  W.MojoChaseRules = { PATTERNS: PAT, reachAfter: reachAfter, FLAVOUR: FLAVOUR, pattern: pattern, nextPattern: nextPattern, simPatterns: simPatterns, TIERS: TIERS, isBlock: isBlock, validate: validate, genRow: genRow, progress: progress, sim: sim, rng: rng, SLIPS: SLIPS }
})(typeof window !== 'undefined' ? window : globalThis)
