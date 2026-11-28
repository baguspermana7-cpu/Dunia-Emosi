/* PRD-59B §5 quiz engine (pure, no DOM). bank = window.UAESim; saved = localStorage 'dunia-uae-sim-v1'.
   Per question a Leitner box 0..4: right -> box+1 (max 4), wrong -> 0. Mastered = box >= 3. Nothing is mutated. */
(function (root) {
  'use strict'
  function copy(o) { var r = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k]; return r }
  function qs(saved, id) { var s = (saved && saved.q && saved.q[id]) || {}; return { seen: s.seen || 0, right: s.right || 0, streak: s.streak || 0, last: s.last || '', box: s.box || 0 } }
  function record(saved, qid, ok, date) {
    var out = copy(saved || {}), q = copy(out.q || {}), s = qs(saved, qid)
    q[qid] = { seen: s.seen + 1, right: s.right + (ok ? 1 : 0), streak: ok ? s.streak + 1 : 0, last: date || new Date().toISOString().slice(0, 10), box: ok ? Math.min(4, s.box + 1) : 0 }
    out.q = q
    return out
  }
  function inTopic(bank, topic) { return bank.questions.filter(function (q) { return q.topic === topic }) }
  function topicState(bank, saved, topic) {
    var list = inTopic(bank, topic), seen = 0, right = 0, tries = 0, mastered = 0
    list.forEach(function (q) { var s = qs(saved, q.id); if (s.seen) seen++; tries += s.seen; right += s.right; if (s.box >= 3) mastered++ })
    var stage = !seen ? 'baru' : mastered >= 0.8 * list.length ? 'dikuasai' : 'belajar'
    return { n: list.length, seen: seen, mastered: mastered, pct: tries ? right / tries : null, stage: stage }
  }
  function wrongList(bank, saved) { return bank.questions.filter(function (q) { var s = qs(saved, q.id); return s.seen > 0 && s.box === 0 }) }
  function readiness(bank, saved) {
    var tops = bank.topics.map(function (t) { var s = topicState(bank, saved, t.id); return { id: t.id, title: t.title, s: s } })
    var pct = tops.reduce(function (a, t) { return a + (t.s.n ? t.s.mastered / t.s.n : 0) }, 0) / (tops.length || 1)
    var h = (saved && saved.history) || [], last3 = h.slice(-3)
    var avg = last3.length ? last3.reduce(function (a, r) { return a + r.score / r.total }, 0) / last3.length : 0
    var allTopics = tops.every(function (t) { return t.s.pct != null && t.s.pct >= 0.6 })
    var ready = last3.length === 3 && avg >= bank.format.pass / bank.format.count && allTopics && !!h[h.length - 1].pass
    var weakest = tops.slice().sort(function (a, b) { return (a.s.n ? a.s.mastered / a.s.n : 0) - (b.s.n ? b.s.mastered / b.s.n : 0) })[0]
    return { pct: pct, ready: ready, weakest: weakest ? weakest.id : null, weakestTitle: weakest ? weakest.title : '' }
  }
  // seeded PRNG (mulberry32) so an exam can be rebuilt in a test
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
  function shuffle(a, r) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t } return a }
  // quota per topic (Hamilton / largest remainder), then shuffled
  function exam(bank, format, seed) {
    var r = rng(seed == null ? Date.now() : seed), N = Math.min(format.count, bank.questions.length), total = bank.questions.length
    // a topic may carry share (fraction of the exam, e.g. signs 0.3); the rest is split by bank size
    var lists = bank.topics.map(function (t) { return inTopic(bank, t.id) })
    var fixed = bank.topics.reduce(function (a, t) { return a + (t.share || 0) }, 0)
    var free = lists.reduce(function (a, l, i) { return a + (bank.topics[i].share ? 0 : l.length) }, 0)
    var tops = bank.topics.map(function (t, i) {
      var w = t.share ? t.share : (1 - fixed) * lists[i].length / (free || 1), exact = Math.min(N * w, lists[i].length)
      return { list: lists[i], q: Math.floor(exact), rem: exact - Math.floor(exact) }
    })
    var left = N - tops.reduce(function (a, t) { return a + t.q }, 0)
    // largest remainder first; any seat still free goes to topics that have questions left (a capped topic gives its seats away)
    var order = tops.slice().sort(function (a, b) { return b.rem - a.rem })
    while (left > 0 && order.some(function (t) { return t.q < t.list.length })) order.forEach(function (t) { if (left > 0 && t.q < t.list.length) { t.q++; left-- } })
    var out = []
    tops.forEach(function (t) { out = out.concat(shuffle(t.list, r).slice(0, t.q)) })
    return shuffle(out, r).map(function (q) { return { q: q, order: shuffle(q.opts.map(function (_, i) { return i }), r) } })
  }
  function grade(run, format) {
    var right = 0, byTopic = {}
    run.qs.forEach(function (item, i) {
      var ok = run.picks[i] === item.q.a, t = byTopic[item.q.topic] || [0, 0]
      byTopic[item.q.topic] = [t[0] + (ok ? 1 : 0), t[1] + 1]; if (ok) right++
    })
    return { score: right, total: run.qs.length, pass: right >= Math.ceil(format.pass * run.qs.length / format.count), byTopic: byTopic }
  }
  // first saved shape (v0): {topics, wrong:[ids], process:{id:true}, history, lang} -> v1
  function migrate(raw) {
    var out = copy(raw || {})
    if (out.v === 1) return out
    var q = {}
    ;(out.wrong || []).forEach(function (id) { q[id] = { seen: 1, right: 0, streak: 0, last: '', box: 0 } })
    var steps = {}
    Object.keys(out.process || {}).forEach(function (k) { if (out.process[k] === true) steps[k] = { status: 'done', started: '', date: '', actual: '', note: '', bring: {} } })
    return { v: 1, lang: out.lang === 'en' ? 'en' : 'iden', q: q, history: out.history || [], process: { steps: steps } }
  }
  var api = { qs: qs, record: record, topicState: topicState, wrongList: wrongList, readiness: readiness, exam: exam, grade: grade, migrate: migrate, rng: rng }
  root.UAEQuiz = api
  if (typeof module !== 'undefined' && module.exports) module.exports = api
})(typeof window !== 'undefined' ? window : globalThis)
