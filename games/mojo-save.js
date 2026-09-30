/* G31 persisted-input boundary. Rebuild mutable checkpoints on trusted level data. */
(function (W) {
  'use strict'
  var MAX_ELAPSED = 31 * 24 * 60 * 60 * 1000, MAX_REWARDS = 1000000
  var STATES = { rock:['block','pushed','cleared'], log:['block','pushed','cleared'], fire:['burning','sprayed','out'], person:['waiting','rescued'], toolbox:['closed','open'], repair:['broken','fixed'], crate:['idle','carried','delivered','delivered-gone'], flag:['idle'], zone:['idle'], bolt:['here','got'], drop:['here','got'], star:['here','got'] }
  function record (v) { return v && typeof v === 'object' && !Array.isArray(v) ? v : {} }
  function integer (v, min, max) { return typeof v === 'number' && isFinite(v) && Math.floor(v) === v && v >= min && v <= max }
  function bounded (v, max, fallback) { return integer(v,0,max) ? v : fallback }
  function duration (v) { return typeof v === 'number' && isFinite(v) && v >= 0 && v <= MAX_ELAPSED ? v : 0 }
  function flags (raw, keys) {
    var src = record(raw), out = {}
    keys.forEach(function (k) { if (src[k] === true || src[k] === 1) out[k] = true })
    return out
  }
  function masteryKeys (levels) {
    var keys = []
    levels.forEach(function (lv) { (lv.objects || []).forEach(function (o) {
      if (o.mg && o.type === 'toolbox') { var word = o.mg.id || 'mg-' + o.id; keys.push(word + ':id',word + ':en') }
      if (o.elev) keys.push(((o.mg && o.mg.id) || 'h-' + o.id) + ':')
    }) })
    return keys
  }
  function world (raw, lv, bi, PG, ML) {
    raw = record(raw)
    var m = record(raw.m), w = PG.world(lv,bi), maxLift = Math.max.apply(Math,[0].concat((lv.objects || []).map(function (o) { return o.elev || 0 })))
    if (raw.rows !== w.rows || raw.cols !== w.cols || raw.beat !== bi || !Array.isArray(raw.objs) || raw.objs.length !== w.objs.length) return null
    if (!integer(m.r,0,w.rows-1) || !integer(m.c,0,w.cols-1) || !integer(m.h,0,3) || typeof m.form !== 'string' || !Object.prototype.hasOwnProperty.call(ML.FORMS,m.form) || !integer(m.lift,0,maxLift) || typeof m.air !== 'boolean') return null
    if (m.carry !== null && !w.objs.some(function (o) { return o.type === 'crate' && o.id === m.carry })) return null
    w.m = {r:m.r,c:m.c,h:m.h,form:m.form,lift:m.lift,air:m.air,carry:m.carry}
    for (var i = 0; i < w.objs.length; i++) {
      var o = w.objs[i], matches = raw.objs.filter(function (x) { return x && x.id === o.id }), v = matches[0]
      if (matches.length !== 1 || !integer(v.r,0,w.rows-1) || !integer(v.c,0,w.cols-1) || (STATES[o.type] || []).indexOf(v.st) < 0) return null
      o.r = v.r; o.c = v.c; o.st = v.st
      if (o.type === 'fire') { if (!integer(v.str,0,o.str)) return null; o.str = v.str }
    }
    var resources = record(raw.res)
    for (var k in w.res) { if (!integer(resources[k],0,(lv.cap || {})[k] == null ? w.res[k] : lv.cap[k])) return null; w.res[k] = resources[k] }
    w.tools = flags(raw.tools,w.objs.filter(function (o) { return o.type === 'toolbox' }).map(function (o) { return o.tool }))
    w.got = flags(raw.got,w.objs.filter(function (o) { return o.type === 'star' }).map(function (o) { return o.id }))
    var pits = [];lv.grid.map.forEach(function (row,r) { for (var c = 0; c < row.length; c++) if (row.charAt(c) === 'o') pits.push(r + ',' + c) })
    w.fill = flags(raw.fill,pits)
    delete w.map; delete w.cap; delete w.forms
    return w
  }
  function checkpoint (raw, ML, PG) {
    raw = record(raw)
    var lv = ML.byId(raw.id)
    if (!lv || !integer(raw.beat,1,lv.beats.length-1)) return null
    var w = world(raw.world,lv,raw.beat,PG,ML)
    if (!w) return null
    var used = [], prior = Array.isArray(raw.used) ? raw.used : [], beats = lv.beats.map(function (_,i) { return String(i) }), events = record(raw.events)
    for (var i = 0; i < raw.beat; i++) used.push(bounded(prior[i],1024,lv.beats[i].slots+1))
    return {id:lv.id,beat:raw.beat,world:w,used:used,ghost:raw.ghost === true,starBeat:flags(raw.starBeat,beats),gotStars:flags(raw.gotStars,(lv.optional || []).map(function (o) { return o.id })),bonus:bounded(raw.bonus,3,0),elapsed:duration(raw.elapsed),events:{count:bounded(events.count,3,0),last:duration(events.last)}}
  }
  /** Return a new safe save; invalid records never discard valid sibling progress. */
  function clean (raw, ML, PG) {
    raw = record(raw)
    var out = {}, records = record(raw.lv), settings = record(raw.set)
    ML.LEVELS.forEach(function (lv) {
      var r = record(records[lv.id])
      if (integer(r.stars,1,3)) out[lv.id] = {stars:r.stars,t:bounded(r.t,8640000000000000,0)}
    })
    return {v:1,lv:out,cp:checkpoint(raw.cp,ML,PG),set:{sound:typeof settings.sound === 'boolean' ? settings.sound : true,narr:typeof settings.narr === 'boolean' ? settings.narr : false,lang:settings.lang === 'en' ? 'en' : 'id'},seen:flags(raw.seen,Object.keys(ML.FORMS)),mg:flags(raw.mg,masteryKeys(ML.LEVELS)),rewardBolts:bounded(raw.rewardBolts,MAX_REWARDS,0)}
  }
  W.MojoSave = {clean:clean}
})(typeof window !== 'undefined' ? window : globalThis)
