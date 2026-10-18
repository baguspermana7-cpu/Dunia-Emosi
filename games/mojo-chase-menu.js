/* =============================================================================
 * mojo-chase-menu.js — window.MojoChaseMenu: the "Balapan" submenu of G31 and the bridge that runs a chase.
 *
 *   MojoChaseMenu.setup(api)        wires #btn-race on the home screen (api = the parent's MojoMenu API)
 *   MojoChaseMenu.menu()            the stage grid (owner biome cards, robber target, stars per avatar)
 *   MojoChaseMenu.run(cfg) -> Promise<result>   mounts a full-screen host and runs MojoChase.mount
 * Saves per avatar under 'dunia-g31-chase' ({v:1, st:{stageId:{stars,t}}}); the Mojo save is never touched.
 * Unlock (game-wide rule): the first 3 stages are open; finishing any stage with 1+ stars opens the next 3.
 * ==========================================================================*/
(function (W, D) {
  'use strict'
  var KEY = 'dunia-g31-chase', API = null, OPEN_AHEAD = 3
  function lib (k) { return (W.AssetIndex && W.AssetIndex.path(k)) || ('../assets/db/lib/' + k + '.webp') }
  function el (tag, cls, html) { var e = D.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e }
  function load () {
    var raw = null
    try { raw = W.avatarScopedGet ? W.avatarScopedGet(KEY, null) : localStorage.getItem(KEY) } catch (e) { raw = null }
    var o = null; try { o = raw ? JSON.parse(raw) : null } catch (e) { o = null }
    var st = {}, src = o && o.st && typeof o.st === 'object' ? o.st : {}
    ;(W.MojoChases ? W.MojoChases.STAGES : []).forEach(function (s) { var r = src[s.id]; if (r && typeof r.stars === 'number' && r.stars >= 1 && r.stars <= 3) st[s.id] = { stars: Math.floor(r.stars), t: +r.t || 0 } })
    // Tim Film Balap (2026-10-17): its own stars per mission + the chosen racer, kept beside the Mojo progress
    var f0 = o && o.film && typeof o.film === 'object' ? o.film : {}, fst = {}
    if (f0.st && typeof f0.st === 'object') Object.keys(f0.st).forEach(function (k) { var r = f0.st[k]; if (r && typeof r.stars === 'number' && r.stars >= 1 && r.stars <= 3) fst[k] = { stars: Math.floor(r.stars), t: r.t || 0 } })
    return { v: 1, st: st, form: o && typeof o.form === 'string' ? o.form : null, film: { st: fst, racer: typeof f0.racer === 'string' ? f0.racer : null, rival: typeof f0.rival === 'string' ? f0.rival : 'auto' } }
  }
  function save (s) {
    try { var j = JSON.stringify(s); if (W.avatarScopedSet) W.avatarScopedSet(KEY, j); else localStorage.setItem(KEY, j); return true } catch (e) { console.warn('[Mojo chase] save failed', e); return false }
  }
  function unlocked (i, s) {
    if (/[?&]unlock=1/.test(location.search) || i < OPEN_AHEAD) return true
    var stages = W.MojoChases.STAGES, maxDone = -1
    stages.forEach(function (st, k) { if (s.st[st.id]) maxDone = k })
    return !!s.st[stages[i].id] || i <= maxDone + OPEN_AHEAD
  }
  function soundOn () {
    try { if (localStorage.getItem('dunia-emosi-sound') === 'off') return false } catch (e) {}
    var sv = API && API.save ? API.save() : null
    return !sv || !sv.set || sv.set.sound !== false
  }
  function run (cfg) {
    var host = el('div', ''); host.id = 'chase-host'; D.body.appendChild(host)
    cfg = Object.assign({ lastForm: load().form, onForm: function (f) { var sv = load(); sv.form = f; save(sv) }, sound: soundOn, say: function (t) { try { var sv = API.save(); if (sv && sv.set && sv.set.narr && API.say) API.say(t) } catch (e) {} } }, cfg)
    return W.MojoChase.mount(host, cfg).then(function (res) {
      host.remove()
      // COBA LAGI after a game over: the same stage with the same form, full hearts, no picker
      if (res && res.retry) return run(Object.assign({}, cfg, { retry: true, mojo_form: res.mojo_form, picked: true }))
      return res
    })
  }
  function playStage (st) {
    var cfg = W.MojoChases.config(st.id)
    cfg.mission = st.mission; cfg.title = st.title
    run(cfg).then(function (res) {
      if (res.completed) {
        var s = load(), prev = s.st[st.id] || { stars: 0 }, first = !s.st[st.id]
        s.st[st.id] = { stars: Math.max(prev.stars, res.reward_result.stars), t: Date.now() }
        save(s)
        if (first && API.award) API.award(res.reward_result.bolts || 0)
      }
      menu()
    })
  }
  /* ── team choice (owner 2026-10-17): Tim Mojo = the stage list below; Tim Film Balap = film racers, missions that
     chase the robber OR the rival team, on the same chase engine and its weather/atmosphere ── */
  var TEAM = null
  function screen (title, bg) {
    var scr = D.getElementById('scr-race')
    if (!scr) { scr = el('section', 'scr menu-scene race-menu'); scr.id = 'scr-race'; D.body.appendChild(scr) }
    scr.innerHTML = ''
    var head = el('header', 'topbar'), back = el('button', 'btn b-soft fk', 'Kembali'); back.type = 'button'
    head.appendChild(back); head.appendChild(el('h1', 'plate fk', title))
    scr.appendChild(head)
    scr.style.background = bg || 'radial-gradient(120% 80% at 50% 0%,#9EDCFF,#4AA8E6 70%,#2E86C8)'
    var content = el('div', 'menu-content'); scr.appendChild(content)
    return { scr: scr, head: head, back: back, content: content }
  }
  function teamMenu () {
    var T = W.MojoTeams
    if (!T) { TEAM = 'mojo'; return menu() }
    var u = screen('Pilih Tim Balap')
    u.back.addEventListener('click', function () { API.cue(); API.home() })
    u.content.appendChild(el('p', 'race-lead', 'Mau balapan bersama siapa?'))
    var grid = el('div', 'team-grid'); u.content.appendChild(grid)
    T.TEAMS.forEach(function (t) {
      var b = el('button', 'team-card'); b.type = 'button'; b.setAttribute('data-team', t.id)
      b.innerHTML = '<span class="pic"><img alt="" src="' + (t.pic ? '../' + t.pic : lib(t.card)) + '"></span><span class="meta"><strong class="fk">' + t.name + '</strong><span class="sub">' + t.sub + '</span>' +
        (t.soon ? '<span class="soon">Gambar pembalap segera hadir</span>' : '') + '</span>'
      b.addEventListener('click', function () { API.cue(); TEAM = t.id; menu() })
      grid.appendChild(b)
    })
    API.show('scr-race')
  }
  function formSide (id) { var f = (W.MojoChases.FORMS || []).filter(function (x) { return x.id === id })[0]; return f ? (f.side || 'mojo-top/base') : 'mojo-top/base' }
  function filmMenu () {
    var F = W.MojoTeams.film, s = load()
    var racer = F.racers.filter(function (r) { return r.id === s.film.racer })[0] || F.racers[0]
    var u = screen('Tim Film Balap', 'radial-gradient(120% 80% at 50% 0%,#FFE2A8,#F2934A 70%,#C9502E)')
    u.back.addEventListener('click', function () { API.cue(); TEAM = null; menu() })
    var tot = 0; Object.keys(s.film.st).forEach(function (k) { tot += s.film.st[k].stars })
    u.head.appendChild(el('span', 'sp')); u.head.appendChild(el('span', 'starpill fk', '<img src="' + lib('mojo-chase/items/star') + '" alt=""><b>' + tot + '/' + F.missions.length * 3 + '</b>'))
    // the racer bar: pick who drives (placeholder art until the owner's film sprites land)
    var bar = el('div', 'racer-bar'); u.content.appendChild(bar)
    F.racers.forEach(function (r) {
      var b = el('button', 'racer-chip' + (r.id === racer.id ? ' on' : '')); b.type = 'button'; b.setAttribute('data-racer', r.id)
      b.style.setProperty('--rc', r.color)
      b.innerHTML = '<img alt="" src="' + (r.pic ? '../' + r.pic : lib(formSide(r.form))) + '"><span class="fk">' + r.name + '</span>'
      b.addEventListener('click', function () { API.cue(); var sv = load(); sv.film.racer = r.id; save(sv); filmMenu() })
      bar.appendChild(b)
    })
    // the opponent bar: Otomatis (each mission its own rival / pursuer) or any racer -- who drives and who is chased
    // (or chasing) can be combined freely; the child's own racer is never its own opponent
    var rv = s.film.rival || 'auto', obar = el('div', 'racer-bar rival-bar'); u.content.appendChild(el('p', 'race-sub fk', 'Lawan:')); u.content.appendChild(obar)
    var ob = el('button', 'racer-chip auto' + (rv === 'auto' ? ' on' : '')); ob.type = 'button'; ob.setAttribute('data-rival', 'auto'); ob.innerHTML = '<span class="ico-auto fk">?</span><span class="fk">Otomatis</span>'
    ob.addEventListener('click', function () { API.cue(); var sv = load(); sv.film.rival = 'auto'; save(sv); filmMenu() }); obar.appendChild(ob)
    F.racers.forEach(function (r) {
      if (r.id === racer.id || !r.pic) return
      var b = el('button', 'racer-chip' + (r.id === rv ? ' on' : '')); b.type = 'button'; b.setAttribute('data-rival', r.id)
      b.style.setProperty('--rc', r.color)
      b.innerHTML = '<img alt="" src="../' + r.pic + '"><span class="fk">' + r.name + '</span>'
      b.addEventListener('click', function () { API.cue(); var sv = load(); sv.film.rival = r.id; save(sv); filmMenu() })
      obar.appendChild(b)
    })
    u.content.appendChild(el('p', 'race-lead', racer.name + ': ' + racer.line))
    var grid = el('div', 'race-grid'); u.content.appendChild(grid)
    F.missions.forEach(function (m, i) {
      var st = W.MojoChases.stage(m.stage) || {}, rec = s.film.st[m.id]
      var wh = who(m, racer), tx = words(m, wh), tpic = m.mode === 'robber' ? lib('mojo-chase/vehicles/' + m.target) : wh.pic ? '../' + wh.pic : lib('mojo-chase/vehicles/speed')
      var b = el('button', 'race-card film-' + m.mode); b.type = 'button'; b.setAttribute('data-mission', m.id)
      var stars = ''; for (var k = 1; k <= 3; k++) stars += '<img class="' + (rec && rec.stars >= k ? '' : 'off') + '" alt="" src="' + lib('mojo-chase/items/star') + '">'
      b.innerHTML = '<span class="pic" style="background-image:url(' + lib(st.cardKey ? 'mojo-chase/' + st.cardKey : 'mojo-chase/biome/' + st.card) + ')"><img class="tgt" alt="" src="' + tpic + '"><span class="num fk">' + (i + 1) + '</span>' +
        '<span class="mtype fk">' + tx.tag + '</span></span>' +
        '<span class="meta"><strong class="fk">' + tx.title + '</strong><span class="sub">' + (st.place || '') + '</span><span class="st">' + stars + '</span></span>'
      b.addEventListener('click', function () { API.cue(); playFilm(m, racer) })
      grid.appendChild(b)
    })
    API.show('scr-race')
  }
  // the film racer a mission is about (the one ahead, or the pursuer); never the child's own racer: then its alt
  function who (m, racer) {
    var id = m.mode === 'race' ? m.rival : m.mode === 'escape' ? m.pursuer : null
    if (!id) return { id: null, name: 'Pencuri', pic: null }
    var pick = load().film.rival   // the child's own choice of opponent (owner: "bisa pilih"), else the mission's
    if (pick && pick !== 'auto' && W.MojoRacerSheets && W.MojoRacerSheets[pick]) id = pick
    if (racer && racer.id === id) id = m.alt && m.alt !== racer.id ? m.alt : (m.rival !== racer.id ? m.rival : m.pursuer) || id
    var R = W.MojoRacerSheets && W.MojoRacerSheets[id]
    return { id: R ? id : null, name: R ? R.name : m.mode === 'escape' ? 'Pengejar' : 'Rival', pic: R ? R.pic : null }
  }
  // a mission's words: its own (it names its rival) unless the child picked another opponent -- then the words name them
  function words (m, wh) {
    var pick = load().film.rival, own = !pick || pick === 'auto' || m.mode === 'robber'
    if (own) return { title: m.title, intro: m.intro, outro: m.outro, tag: m.tag }
    var place = (W.MojoChases.stage(m.stage) || {}).place || ''
    return m.mode === 'race'
      ? { title: 'Susul ' + wh.name, intro: wh.name + ' ngebut di depan di ' + place + '! Susul sebelum garis finis!', outro: 'Hebat! ' + wh.name + ' tersusul!', tag: 'Kejar ' + wh.name.split(' ')[0] }
      : { title: 'Lari dari ' + wh.name, intro: wh.name + ' mengejarmu di ' + place + '! Hindari rintangan, jangan sampai tersusul!', outro: 'Kamu lolos dari ' + wh.name + '!', tag: 'Dikejar ' + wh.name.split(' ')[0] }
  }
  function playFilm (m, racer) {
    var wh = who(m, racer), tx = words(m, wh)
    var cfg = W.MojoChases.config(m.stage, { target: m.target || 'speed', intro: tx.intro, outro: tx.outro, item: m.item })
    cfg.title = tx.title; cfg.mode = m.mode; cfg.missionType = m.mode; cfg.mojo_form = racer.form; cfg.teamPicked = true; cfg.team = 'film'; cfg.racer = racer.id; cfg.heroName = racer.name
    if (m.mode === 'robber') { cfg.mission = 'Tangkap pencurinya!'; cfg.foe = { n: 'pencuri', N: 'Pencuri', caught: 'Pencuri Tertangkap!' } }
    else if (m.mode === 'race') { cfg.mission = 'Susul ' + wh.name + ' sebelum garis finis!'; cfg.targetRacer = wh.id; cfg.foe = { n: wh.name, N: wh.name, caught: wh.name + ' Tersusul!', title: 'SUSUL ' + wh.name.toUpperCase() + '!' } }
    else { cfg.mission = 'Jangan sampai tersusul ' + wh.name + '!'; cfg.pursuerPic = wh.pic; cfg.foe = { n: wh.name, N: wh.name, caught: 'Kamu Lolos!', title: 'LARI! ' + wh.name.toUpperCase() + ' MENGEJAR' } }
    var me = racer.pic ? '../' + racer.pic : null
    if (me) cfg.cast = m.mode === 'race' && wh.pic ? [me, '../' + wh.pic] : [me]
    cfg.onForm = function () {}   // a film racer never overwrites the child's saved Mojo form
    run(cfg).then(function (res) {
      if (res && res.completed) {
        var s = load(), prev = s.film.st[m.id] || { stars: 0 }
        s.film.st[m.id] = { stars: Math.max(prev.stars, res.reward_result.stars), t: Date.now() }
        save(s)
      }
      menu()
    })
  }
  function menu () {
    if (!API) return
    if (!TEAM) return teamMenu()
    if (TEAM === 'film') return filmMenu()
    var s = load(), stages = W.MojoChases.STAGES
    var scr = D.getElementById('scr-race')
    if (!scr) { scr = el('section', 'scr menu-scene race-menu'); scr.id = 'scr-race'; D.body.appendChild(scr) }
    scr.innerHTML = ''
    var head = el('header', 'topbar'), back = el('button', 'btn b-soft fk', 'Kembali'); back.type = 'button'; back.addEventListener('click', function () { API.cue(); if (W.MojoTeams) { TEAM = null; menu() } else API.home() })
    head.appendChild(back); head.appendChild(el('h1', 'plate fk', 'Balapan Kejar Pencuri'))
    var tot = 0; stages.forEach(function (st) { tot += (s.st[st.id] && s.st[st.id].stars) || 0 })
    var pill = el('span', 'starpill fk', '<img src="' + lib('mojo-chase/items/star') + '" alt=""><b>' + tot + '/' + stages.length * 3 + '</b>')
    head.appendChild(el('span', 'sp')); head.appendChild(pill)
    scr.appendChild(head)
    scr.style.background = 'radial-gradient(120% 80% at 50% 0%,#9EDCFF,#4AA8E6 70%,#2E86C8)'
    var content = el('div', 'menu-content'); scr.appendChild(content)
    content.appendChild(el('p', 'race-lead', 'Pilih jalan, kejar pencuri, dan tangkap dengan roket jaring!'))
    var grid = el('div', 'race-grid'); content.appendChild(grid)
    stages.forEach(function (st, i) {
      var ok = unlocked(i, s), rec = s.st[st.id]
      var b = el('button', 'race-card' + (ok ? '' : ' lock')); b.type = 'button'; b.setAttribute('data-stage', st.id)
      b.setAttribute('aria-label', st.title + (ok ? '' : ' (terkunci)'))
      var stars = ''; for (var k = 1; k <= 3; k++) stars += '<img class="' + (rec && rec.stars >= k ? '' : 'off') + '" alt="" src="' + lib('mojo-chase/items/star') + '">'
      b.innerHTML = '<span class="pic" style="background-image:url(' + lib(st.cardKey ? 'mojo-chase/' + st.cardKey : 'mojo-chase/biome/' + st.card) + ')"><img class="tgt" alt="" src="' + lib('mojo-chase/vehicles/' + st.target) + '"><span class="num fk">' + (i + 1) + '</span></span>' +
        (ok ? '' : '<span class="lk"><i class="ico">' + (W.MojoArt && W.MojoArt.icon ? W.MojoArt.icon('lock') : '') + '</i></span>') +
        '<span class="meta"><strong class="fk">' + st.title + '</strong><span class="sub">' + st.place + '</span>' + (ok ? '<span class="st">' + stars + '</span>' : '<span class="hint">Selesaikan tahap ' + (i - OPEN_AHEAD + 1) + ' dulu</span>') + '</span>'
      b.addEventListener('click', function () {
        API.cue()
        if (!ok) { API.toast('Selesaikan tahap ' + (i - OPEN_AHEAD + 1) + ' dulu, ya!'); return }
        playStage(st)
      })
      grid.appendChild(b)
    })
    API.show('scr-race')
  }
  function setup (api) {
    API = api
    var b = D.getElementById('btn-race')
    if (b) b.addEventListener('click', function () { API.cue(); TEAM = null; menu() })
  }
  /** the adventure hook: run the chase beat configured for (level, beat) then call next(result) */
  function beat (levelId, beatIndex, next) {
    var B = W.MojoChases && W.MojoChases.beatAfter(levelId, beatIndex)
    // automation without an explicit ?chase=1 skips adventure chase beats, so the grid gates (qa-mojo-play)
    // keep testing the grid; ?chase=0 skips them too. A child's browser is never automated.
    var skip = /[?&]chase=0/.test(location.search) || (navigator.webdriver && !/[?&]chase=1/.test(location.search))
    if (!B || !W.MojoChase || skip) return false
    var cfg = W.MojoChases.config(B.stage, B.cfg)
    cfg.title = 'Kejar Pencuri!'
    run(cfg).then(next)
    return true
  }
  W.MojoChaseMenu = { setup: setup, menu: menu, run: run, beat: beat, load: load, unlocked: unlocked, team: function (t) { TEAM = t; menu() }, teamNow: function () { return TEAM } }
})(window, document)
