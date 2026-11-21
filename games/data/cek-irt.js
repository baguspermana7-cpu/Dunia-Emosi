/* CekIRT — PRD-54: Rasch scoring for the ladder islands (Pola, Bentuk, Kata). Pure, no DOM.
 * A ladder island gives items in rising difficulty and stops after 3 wrong in a row. A raw count throws away WHICH items
 * were right; the Rasch model (Rasch 1960) reads the answer pattern on a logit scale instead. The stop rule depends only
 * on answers already seen, so the likelihood of the given items is still valid (ignorable design; Mislevy & Wu 1996).
 *   b(i, max)            difficulty of item i: evenly spaced from -2.5 to +2.5 logits (design spacing, not calibrated
 *                        on children; PRD-54 says so)
 *   theta(ok, max)       Warm's (1989) weighted-likelihood estimate from the 0/1 answers in order; finite at 0 or all right
 *   info(theta, n, max)  test information of the first n items at theta (sum of p(1-p))
 *   tcc(theta, max)      expected right answers over all max items (the test characteristic curve)
 *   thetaOfRaw(r, max)   the theta whose expected score is r (TCC inverse, bisection): turns a target band given in
 *                        right answers into the logit scale, and scores old records that kept only the raw count
 */
;(function (W) {
  'use strict'
  var LO = -2.5, HI = 2.5
  function b (i, max) { return max > 1 ? LO + (HI - LO) * i / (max - 1) : 0 }
  function p (t, bi) { return 1 / (1 + Math.exp(bi - t)) }
  function tcc (t, max) { var s = 0; for (var i = 0; i < max; i++) s += p(t, b(i, max)); return s }
  function info (t, n, max) { var s = 0; for (var i = 0; i < n; i++) { var q = p(t, b(i, max)); s += q * (1 - q) } return s }
  // Warm WLE: solve sum(x - p) + J / (2 I) = 0, J = sum p(1-p)(1-2p); Newton from 0 with bisection safeguard
  function theta (ok, max) {
    var n = ok.length; if (!n) return null
    function f (t) {
      var s = 0, I = 0, J = 0
      for (var i = 0; i < n; i++) { var q = p(t, b(i, max)), v = q * (1 - q); s += (ok[i] ? 1 : 0) - q; I += v; J += v * (1 - 2 * q) }
      return s + J / (2 * I)
    }
    var lo = -8, hi = 8
    if (f(lo) <= 0) return lo
    if (f(hi) >= 0) return hi
    for (var k = 0; k < 60; k++) { var m = (lo + hi) / 2; if (f(m) > 0) lo = m; else hi = m }
    return (lo + hi) / 2
  }
  function thetaOfRaw (r, max) {
    var lo = -8, hi = 8
    if (r <= tcc(lo, max)) return lo
    if (r >= tcc(hi, max)) return hi
    for (var k = 0; k < 60; k++) { var m = (lo + hi) / 2; if (tcc(m, max) < r) lo = m; else hi = m }
    return (lo + hi) / 2
  }
  W.CekIRT = { b: b, p: p, tcc: tcc, info: info, theta: theta, thetaOfRaw: thetaOfRaw }
})(typeof window !== 'undefined' ? window : globalThis)
