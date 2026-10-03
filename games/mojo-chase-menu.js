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
    return { v: 1, st: st }
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
    cfg = Object.assign({ sound: soundOn, say: function (t) { try { var sv = API.save(); if (sv && sv.set && sv.set.narr && API.say) API.say(t) } catch (e) {} } }, cfg)
    return W.MojoChase.mount(host, cfg).then(function (res) { host.remove(); return res })
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
  function menu () {
    if (!API) return
    var s = load(), stages = W.MojoChases.STAGES
    var scr = D.getElementById('scr-race')
    if (!scr) { scr = el('section', 'scr menu-scene race-menu'); scr.id = 'scr-race'; D.body.appendChild(scr) }
    scr.innerHTML = ''
    var head = el('header', 'topbar'), back = el('button', 'btn b-soft fk', 'Kembali'); back.type = 'button'; back.addEventListener('click', function () { API.cue(); API.home() })
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
      b.innerHTML = '<span class="pic" style="background-image:url(' + lib('mojo-chase/biome/' + st.card) + ')"><img class="tgt" alt="" src="' + lib('mojo-chase/vehicles/' + st.target) + '"><span class="num fk">' + (i + 1) + '</span></span>' +
        '<span class="meta"><strong class="fk">' + st.title + '</strong><span class="sub">' + st.place + '</span><span class="st">' + stars + '</span></span>'
      b.addEventListener('click', function () {
        API.cue()
        if (!ok) { API.toast('Selesaikan balapan ' + (i - OPEN_AHEAD + 1) + ' dulu, ya!'); return }
        playStage(st)
      })
      grid.appendChild(b)
    })
    API.show('scr-race')
  }
  function setup (api) {
    API = api
    var b = D.getElementById('btn-race')
    if (b) b.addEventListener('click', function () { API.cue(); menu() })
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
  W.MojoChaseMenu = { setup: setup, menu: menu, run: run, beat: beat, load: load, unlocked: unlocked }
})(window, document)
