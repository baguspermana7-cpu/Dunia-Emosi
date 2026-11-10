/**
 * DuniaBus — one shared event channel between games and the modules that listen to them (learning log, cinema,
 * telemetry). A game says what happened; it does not know who is listening.
 *
 *   DuniaBus.emit('answer', { domain, skill, item, ok, tries, ms })   -> the event object that was sent
 *   DuniaBus.on('answer', fn) -> off()          fn(ev) with ev = { type, game, t, ...payload }
 *   DuniaBus.on('*', fn)                         every event
 *
 * Events in use: 'answer' (one per question, once it is resolved). Planned: 'level:start', 'level:end', 'reward'.
 * A listener that throws is logged and skipped: a broken consumer must never break the game that emitted.
 * Every event is also dispatched on window as CustomEvent('dunia:<type>', { detail: ev }).
 *
 * Created 2026-11-10 (docs/PRODUCT-ASSESSMENT-2026-11-10.md, idea #8).
 */
(function () {
  'use strict'
  var W = window
  if (W.DuniaBus) return
  var subs = {}
  var game = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index'

  function on (type, fn) {
    if (typeof fn !== 'function') return function () {}
    if (!subs[type]) subs[type] = []
    subs[type].push(fn)
    return function off () { subs[type] = (subs[type] || []).filter(function (f) { return f !== fn }) }
  }

  function emit (type, payload) {
    var ev = { type: String(type), game: game, t: Date.now() }
    if (payload) for (var k in payload) if (Object.prototype.hasOwnProperty.call(payload, k) && !(k in ev)) ev[k] = payload[k]
    var list = (subs[type] || []).concat(subs['*'] || [])
    for (var i = 0; i < list.length; i++) {
      try { list[i](ev) } catch (e) { if (W.console) console.error('[DuniaBus] listener failed on ' + type, e) }
    }
    try { W.dispatchEvent(new CustomEvent('dunia:' + type, { detail: ev })) } catch (e) {}
    return ev
  }

  W.DuniaBus = { on: on, emit: emit, game: game }
})()
