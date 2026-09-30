/* G31 contextual-card pacing. Content stays in SoalEngine; this module only budgets interruptions. */
(function (W) {
  'use strict'
  var GAP_MS = 120000, MAX_CARDS = 3
  function positive (n) { n = Number(n); return isFinite(n) && n > 0 ? n : 0 }
  W.MojoEvents = {
    resumeElapsed: function (prior, elapsed) { return Math.max(positive(elapsed),positive(prior && prior.last)) },
    create: function (tutorialFirstTry, prior) {
      var count = Math.min(MAX_CARDS,Math.floor(positive(prior && prior.count))), last = positive(prior && prior.last), run = -1
      return {
        ready: function (elapsed, runId) { return !tutorialFirstTry && count < MAX_CARDS && elapsed - last >= GAP_MS && runId !== run },
        mark: function (elapsed, runId) { count++; last = elapsed; run = runId },
        state: function () { return { count: count, last: last } }
      }
    }
  }
})(typeof window !== 'undefined' ? window : globalThis)
