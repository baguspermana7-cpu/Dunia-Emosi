/* PRD-59A §5 workflow engine (pure, no DOM; shared by the document checklist and the SIM licence steps).
   steps: data steps ({id, phase, needs, bring:[{id}], cost:{min,max,cur}, payer}); saved: {steps:{[id]: StepState}}.
   StepState = {status:'todo'|'doing'|'done', started, date, actual, note, bring:{[itemId]:true}}.
   Every function returns new objects; nothing passed in is mutated. */
(function (root) {
  'use strict'
  var BLANK = { status: 'todo', started: '', date: '', actual: '', note: '', bring: {} }
  function copy(o) { var r = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k]; return r }
  function today() { return new Date().toISOString().slice(0, 10) }
  function savedSteps(saved) { return (saved && saved.steps) || {} }
  function state(saved, id) {
    var s = savedSteps(saved)[id], r = copy(BLANK)
    if (s) for (var k in s) r[k] = s[k]
    r.bring = copy(r.bring || {})
    if (['todo', 'doing', 'done'].indexOf(r.status) < 0) r.status = 'todo'
    return r
  }
  function byId(steps) { var m = {}; steps.forEach(function (s, i) { m[s.id] = { s: s, i: i } }); return m }
  function blockedBy(steps, saved, id) {
    var m = byId(steps), s = m[id] && m[id].s
    return ((s && s.needs) || []).filter(function (n) { return m[n] && state(saved, n).status !== 'done' })
  }
  function items(step, st) {
    var total = (step.bring || []).length, checked = 0
    ;(step.bring || []).forEach(function (b) { if (st.bring[b.id]) checked++ })
    return { checked: checked, total: total }
  }
  // first step (data order) not done and not blocked; if every open step is blocked, the first open one
  function next(steps, saved) {
    var open = steps.filter(function (s) { return state(saved, s.id).status !== 'done' })
    if (!open.length) return null
    var ready = open.filter(function (s) { return !blockedBy(steps, saved, s.id).length })
    return (ready[0] || open[0]).id
  }
  function progress(steps, saved, filter) {
    var r = { done: 0, doing: 0, todo: 0, n: 0, items: { checked: 0, total: 0 } }
    steps.forEach(function (s) {
      if (filter && !filter(s)) return
      var st = state(saved, s.id), it = items(s, st)
      r.n++; r[st.status]++; r.items.checked += it.checked; r.items.total += it.total
    })
    return r
  }
  function toIdr(v, cur, fx) { return cur === 'AED' ? v * fx : v }
  function money(steps, saved, fx, filter) {
    var r = { min: 0, max: 0, employer: 0, actual: 0 }
    steps.forEach(function (s) {
      if (filter && !filter(s)) return
      var c = s.cost || { min: 0, max: 0, cur: 'IDR' }
      if (s.payer === 'employer') r.employer += toIdr(c.max, c.cur, fx)
      else { r.min += toIdr(c.min, c.cur, fx); r.max += toIdr(c.max, c.cur, fx) }
      var a = Number(String(state(saved, s.id).actual || '').replace(/[^\d]/g, ''))
      if (a > 0) r.actual += a
    })
    return r
  }
  // patch: {status} | {item: itemId, on: bool} | {actual} | {note}; returns a new saved object (PRD-59A §5.1 rules)
  function apply(saved, id, patch, date) {
    var d = date || today(), st = state(saved, id), steps = copy(savedSteps(saved)), out = copy(saved || {})
    if (patch.status) {
      st.status = patch.status
      if (patch.status === 'todo') { st.started = ''; st.date = '' }
      if (patch.status === 'doing') { st.started = st.started || d; st.date = '' }
      if (patch.status === 'done') { st.started = st.started || d; st.date = d }
    }
    if (patch.item) {
      if (patch.on) st.bring[patch.item] = true; else delete st.bring[patch.item]
      if (patch.on && st.status === 'todo') { st.status = 'doing'; st.started = st.started || d }
    }
    if ('actual' in patch) st.actual = String(patch.actual).replace(/[^\d]/g, '')
    if ('note' in patch) st.note = String(patch.note)
    steps[id] = st; out.steps = steps
    return out
  }
  function validate(data) {
    var errs = [], seen = {}
    ;(data.steps || []).forEach(function (s, i) {
      if (seen[s.id] != null) errs.push('duplicate id ' + s.id)
      seen[s.id] = i
      ;(s.needs || []).forEach(function (n) { if (seen[n] == null) errs.push(s.id + ' needs ' + n + ' which is not earlier') })
      var b = {}; (s.bring || []).forEach(function (x) { if (!x.id || b[x.id]) errs.push(s.id + ' bring id missing/duplicate ' + x.id); b[x.id] = 1 })
    })
    return errs
  }
  // older saved shapes: bring stored as an array of ids
  function migrate(raw) {
    var out = copy(raw || {}), steps = {}
    var src = (raw && raw.steps) || {}
    Object.keys(src).forEach(function (k) {
      var s = copy(src[k])
      if (Array.isArray(s.bring)) { var o = {}; s.bring.forEach(function (x) { o[x] = true }); s.bring = o }
      steps[k] = s
    })
    out.steps = steps; out.v = 1
    return out
  }
  // PRD-59C L21 timeline: earliest and latest finish of every step from `needs` and `days: {min, max}` (calendar days).
  // A done step takes 0 days. A step starts when all its needs are finished; steps with no link between them run side
  // by side. Returns per step {start: [min, max], end: [min, max]} in days from day 0, the total and the critical path
  // (the chain that sets the latest finish). Steps without `days` count as 0 and are listed in `unknown`.
  function schedule(steps, saved) {
    var by = {}, out = {}, unknown = []
    steps.forEach(function (s) { by[s.id] = s })
    function walk(id, seen) {
      if (out[id]) return out[id]
      if (seen[id]) throw new Error('needs cycle at ' + id)
      seen[id] = 1
      var s = by[id], d = s.days, st = state(saved, id).status
      if (!d) unknown.push(id)
      var dur = st === 'done' ? [0, 0] : d ? [d.min, d.max] : [0, 0]
      var start = [0, 0], via = null
      ;(s.needs || []).forEach(function (n) {
        if (!by[n]) return
        var e = walk(n, seen).end
        if (e[0] > start[0]) start[0] = e[0]
        if (e[1] > start[1] || via === null && e[1] === start[1]) { start[1] = e[1]; via = n }
      })
      out[id] = { start: start, end: [start[0] + dur[0], start[1] + dur[1]], via: via }
      return out[id]
    }
    steps.forEach(function (s) { walk(s.id, {}) })
    var last = null, total = [0, 0]
    steps.forEach(function (s) { var e = out[s.id].end; if (e[0] > total[0]) total[0] = e[0]; if (e[1] > total[1] || last === null) { if (e[1] >= total[1]) { total[1] = e[1]; last = s.id } } })
    var path = []; for (var k = last; k; k = out[k].via) path.unshift(k)
    return { steps: out, total: total, critical: path, unknown: unknown }
  }
  // day offset -> ISO date (local calendar), for showing a schedule from a chosen start date
  function addDays(iso, n) { var d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') }

  // PRD-59C L18: a fact checked more than `months` ago (default 6) must be re-checked before it is trusted
  function stale(checked, now, months) {
    var m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(String(checked || '')); if (!m) return true
    var d = new Date(+m[1], +m[2] - 1 + (months || 6), +(m[3] || 1)), n = now ? new Date(now + 'T00:00:00') : new Date()
    return n > d
  }
  var api = { stale: stale, state: state, blockedBy: blockedBy, items: items, next: next, progress: progress, money: money, apply: apply, validate: validate, migrate: migrate, schedule: schedule, addDays: addDays }
  root.UAEFlow = api
  if (typeof module !== 'undefined' && module.exports) module.exports = api
})(typeof window !== 'undefined' ? window : globalThis)
