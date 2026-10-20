/* games/mojo-chase-embed.js — runs ONE Mojo chase for a host page that frames mojo-chase-embed.html (see its header).
 * A host fleet (window.BlippiFleet[cat]: rear-view frame sheets [frameW, frameH, frames, cols] at frameMs) becomes
 * MojoRacerSheets entries, so the child's vehicle and the rival drive the Mojo road with their own animation; the race
 * is the chase core's 'race' mode (catch the rival before the finish), with its lanes, hills, bends, weather, jump,
 * question lanes and turbo. pace=a,b: the road speed as a share of the Mojo race, a at the start rising to b at the end. */
;(function (W, D) {
  'use strict'
  var Q = {}
  location.search.replace(/^\?/, '').split('&').forEach(function (kv) { if (!kv) return; var i = kv.indexOf('='); Q[decodeURIComponent(i < 0 ? kv : kv.slice(0, i))] = i < 0 ? '' : decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' ')) })
  function post (o) { o.type = 'shared-race'; try { if (W.parent && W.parent !== W) W.parent.postMessage(o, location.origin) } catch (e) {} }
  // only a same-origin data file is loaded (the host's own fleet); anything else is refused
  function safeUrl (u) { try { var x = new URL(u, location.href); return x.origin === location.origin ? x.href : null } catch (e) { return null } }
  function loadScript (u) { return new Promise(function (res, rej) { var s = D.createElement('script'); s.src = u; s.onload = res; s.onerror = rej; D.head.appendChild(s) }) }
  // a fleet frame sheet -> a racer sheet: one 'straight' view (a turn is drawn as a body roll by the core), the anchor
  // from the frame box (frames are cut to the vehicle's own box with a 2 px margin: wheels touch the bottom)
  function sheetOf (dirUrl, it, frameMs, color) {
    var fw = it.play[0], fh = it.play[1], base = fh - 2, bw = fw - 4
    return {
      name: it.name, cell: [fw, fh], fps: 1000 / (frameMs || 50), color: color || '#E8432E', form: 'racer',
      pic: dirUrl + it.id + '-tile.webp', views: { straight: { cols: it.play[3], frames: it.play[2], src: dirUrl + it.id + '.webp' } },
      anchor: { cx: fw / 2, base: base, bw: bw, top: 2, kind: 'ground', dust: [[fw * 0.24, base], [fw * 0.76, base]],
        exhaust: [[fw * 0.36, fh * 0.82], [fw * 0.64, fh * 0.82]], lights: [[fw * 0.2, fh * 0.58], [fw * 0.8, fh * 0.58]] }
    }
  }
  function start () {
    var fleetUrl = safeUrl(Q.fleet || '')
    if (!fleetUrl || !Q.cat || !Q.me) { post({ event: 'error', why: 'missing race parameters' }); return }
    loadScript(fleetUrl).then(function () {
      var F = W.BlippiFleet && W.BlippiFleet[Q.cat]
      if (!F || !F.items || !F.items.length) throw new Error('fleet ' + Q.cat + ' is empty')
      // the art folder: <fleet file>/../../assets/fleet/<dir>/ (dir = the placeholder pack it borrows, else its own key)
      var dirUrl = new URL('../assets/fleet/' + (F.dir || Q.cat) + '/', fleetUrl).href
      function item (id) { for (var i = 0; i < F.items.length; i++) if (F.items[i].id === id) return F.items[i]; return null }
      var me = item(Q.me) || F.items[0], rv = item(Q.rival) || F.items.filter(function (x) { return x.id !== me.id })[0] || me
      W.MojoRacerSheets = W.MojoRacerSheets || {}
      W.MojoRacerSheets['host:me'] = sheetOf(dirUrl, me, F.frameMs, '#E8432E')
      W.MojoRacerSheets['host:rival'] = sheetOf(dirUrl, rv, F.frameMs, '#2E7BE8')
      var rname = Q.rivalName || rv.name
      var pace = (Q.pace || '0.8,0.9').split(',').map(parseFloat)
      var cfg = W.MojoChases.config(Q.stage || 'kota', { target: 'speed', intro: Q.intro, outro: Q.outro || ('Hebat! ' + rname + ' tersusul. Kamu juara!'), item: Q.item || 'piala', seconds: +Q.seconds || 75 })
      cfg.title = Q.title || 'Balapan'; cfg.mode = 'race'; cfg.missionType = 'race'
      cfg.team = 'film'; cfg.racer = 'host:me'; cfg.targetRacer = 'host:rival'; cfg.teamPicked = true; cfg.formChosen = true
      cfg.mojo_form = 'racer'; cfg.heroName = Q.hero || me.name; cfg.paceK = [pace[0] || 0.8, pace[1] || pace[0] || 0.9]
      cfg.mission = Q.mission || ('Susul ' + rname + ' sebelum garis finis!')
      cfg.foe = { n: rname, N: rname, caught: rname + ' Tersusul!', title: 'SUSUL ' + rname.toUpperCase() + '!' }
      if (Q.caller) { var cu = safeUrl(Q.caller); if (cu) cfg.callerPic = cu }
      cfg.sound = function () { return Q.sound !== '0' }
      cfg.onForm = function () {}
      // the end card shows the host's caller and both vehicles (not Bo and the police van)
      cfg.cast = [cfg.callerPic, W.MojoRacerSheets['host:me'].pic, W.MojoRacerSheets['host:rival'].pic].filter(Boolean)
      post({ event: 'ready' })
      // COBA LAGI after a game over runs the same race again (as MojoChaseMenu.run does)
      function race (c) {
        var host = D.getElementById('chase-host'); if (host) host.remove()
        host = D.createElement('div'); host.id = 'chase-host'; D.body.appendChild(host)
        return W.MojoChase.mount(host, c).then(function (res) {
          res = res || {}
          if (res.retry) return race(Object.assign({}, c, { retry: true }))
          var rr = res.reward_result || {}
          post({ event: res.completed ? 'done' : 'exit', completed: !!res.completed, stars: rr.stars || 0, collected: res.stars_collected || 0, hits: res.collisions || 0 })
        })
      }
      return race(cfg)
    }).catch(function (e) { post({ event: 'error', why: String(e && e.message || e) }) })
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start()
})(window, document)
