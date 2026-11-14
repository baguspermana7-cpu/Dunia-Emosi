/**
 * DuniaReview — missed questions come back on later days, in any game that can ask them
 * (docs/prd/PRD-11-antrean-pengulangan-lintas-game.md).
 *
 * Fed by DuniaBus 'answer' events that carry `review: {a, b, op}` (Kuis Matematika, Mojo chase). Stored per child
 * through save-engine ('dunia-avatar-<slug>-review').
 *   wrong                    -> the item is due tomorrow (step 0)
 *   right on a queued item   -> due in 3 days, then 7, then it leaves the queue
 *   wrong on a queued item   -> back to tomorrow
 *   DuniaReview.next(domain, fits) -> a due item {a, b, op} the calling game can ask (fits(item) says whether it can),
 *                                     at most one of every three questions, never the same item twice in a day
 * window.__reviewOffsetDays (tests only) moves "today". Nothing here throws into a game.
 */
(function () {
  'use strict'
  var W = window
  if (W.DuniaReview) return
  var KEY = 'dunia-review', STEPS = [1, 3, 7], MAX = 60

  function today () {
    var d = new Date(Date.now() + (W.__reviewOffsetDays || 0) * 86400000)
    return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000)
  }
  function read () {
    try {
      var raw = W.avatarScopedGet ? W.avatarScopedGet(KEY) : localStorage.getItem(KEY)
      var d = JSON.parse(raw || 'null')
      return d && d.v === 1 && d.items ? d : { v: 1, items: {} }
    } catch (e) { return { v: 1, items: {} } }
  }
  function write (d) {
    try { var s = JSON.stringify(d); if (W.avatarScopedSet) W.avatarScopedSet(KEY, s); else localStorage.setItem(KEY, s) } catch (e) {}
  }
  function idOf (dom, x) { return dom + ':' + x.a + x.op + x.b }

  function record (ev) {
    try {
      var x = ev && ev.review
      if (!x || x.a === undefined || x.b === undefined || !x.op) return
      var dom = String(ev.domain || 'matematika'), id = idOf(dom, x), d = read(), it = d.items[id], t = today()
      if (!ev.ok) {
        d.items[id] = { d: dom, a: +x.a, b: +x.b, op: String(x.op), step: 0, due: t + STEPS[0], shown: it ? it.shown : -1 }
      } else if (it) {
        if (it.step + 1 >= STEPS.length) delete d.items[id]
        else { it.step += 1; it.due = t + STEPS[it.step] }
      } else return
      // keep the queue small: drop the items due latest
      var ids = Object.keys(d.items)
      if (ids.length > MAX) ids.sort(function (p, q) { return d.items[p].due - d.items[q].due }).slice(MAX).forEach(function (k) { delete d.items[k] })
      write(d)
    } catch (e) {}
  }

  var since = {}   // questions asked per domain since the last review item, this page
  function next (domain, fits) {
    try {
      var dom = String(domain), n = since[dom] === undefined ? 2 : since[dom]
      if (n < 2) { since[dom] = n + 1; return null }
      var d = read(), t = today(), best = null
      for (var k in d.items) {
        var it = d.items[k]
        if (it.d !== dom || it.due > t || it.shown === t) continue
        if (fits && !fits({ a: it.a, b: it.b, op: it.op })) continue
        if (!best || it.due < best.due) best = it
      }
      if (!best) { since[dom] = n + 1; return null }
      best.shown = t; write(d); since[dom] = 0
      return { a: best.a, b: best.b, op: best.op }
    } catch (e) { return null }
  }
  function due (domain) {
    var d = read(), t = today(), out = []
    for (var k in d.items) { var it = d.items[k]; if ((!domain || it.d === domain) && it.due <= t) out.push(k) }
    return out
  }

  W.DuniaReview = { record: record, next: next, due: due, items: function () { return read().items }, STEPS: STEPS, KEY: KEY, _today: today }
  if (W.DuniaBus) W.DuniaBus.on('answer', record)
})()
