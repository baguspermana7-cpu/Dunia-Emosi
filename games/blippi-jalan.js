/* G32 Blippi -- W01-M01 "Jalan Pertamaku" on the shared mission template.
 * Step 1 place three bridge boards on the LEFT or RIGHT crossing, step 2 hold to drive the buggy
 * over what you built, step 3 deliver the parcel; the park path appears. */
(function (w) {
  'use strict'
  var B = w.Blippi
  var A = w.BlippiArt

  var XS = { L: 560, R: 1110 }
  var BOARD_Y = [335, 381, 427]
  var START = { x: 836, y: 570 }
  var FLAG = { x: 836, y: 285 }

  function pathFor (route) {
    var cx = XS[route]
    return [START, { x: cx, y: START.y }, { x: cx, y: FLAG.y }, FLAG]
  }
  function lengths (pts) {
    var out = []
    var tot = 0
    var i
    for (i = 0; i < pts.length - 1; i++) {
      var d = Math.abs(pts[i + 1].x - pts[i].x) + Math.abs(pts[i + 1].y - pts[i].y)
      out.push(d)
      tot += d
    }
    return { legs: out, total: tot }
  }
  function at (pts, len, dist) {
    var d = dist
    var i
    for (i = 0; i < len.legs.length; i++) {
      if (d <= len.legs[i]) {
        var k = len.legs[i] ? d / len.legs[i] : 0
        return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * k, y: pts[i].y + (pts[i + 1].y - pts[i].y) * k }
      }
      d -= len.legs[i]
    }
    return pts[pts.length - 1]
  }

  var mod = { mount: function (api) {
    var sc = api.scene
    var L = api.lines
    var route = null
    var placed = []
    var dist = 0
    var holding = false
    var raf = 0
    var delivered = false
    var rs = api.restore
    var saved = api.data() || {}
    if (rs) { route = saved.route || 'R'; placed = [0, 1, 2] }
    if (rs && rs.step >= 2) dist = 1e9

    // the gap itself is gameplay, drawn in CSS (not art)
    var river = api.at(sc, 'river', 0, 330, 1672, 140)
    river.style.cssText += ';background:repeating-linear-gradient(90deg,rgba(255,255,255,.35) 0 40px,transparent 40px 90px),linear-gradient(#58B7F5,#2E8FE0);border-top:8px solid #E9D8A8;border-bottom:8px solid #E9D8A8;pointer-events:none'
    var slots = {}
    var cross = {}
    ;['L', 'R'].forEach(function (r) {
      slots[r] = []
      var c = api.at(sc, 'cross', XS[r] - 75, 326, 150, 148, 'button')
      c.type = 'button'
      c.setAttribute('data-cross', r)
      c.setAttribute('aria-label', 'Jalur ' + (r === 'L' ? 'kiri' : 'kanan') + ': pasang papan')
      c.style.cssText += ';background:none;border:0;cursor:pointer;z-index:3;padding:0'
      c.addEventListener('click', function () { tapCross(r) })
      cross[r] = c
      BOARD_Y.forEach(function (y, i) {
        var s = document.createElement('div')
        s.style.cssText = 'position:absolute;left:5px;top:' + (y - 326) + 'px;width:140px;height:48px;border:4px dashed #FFB347;border-radius:12px;background:rgba(255,255,255,.18)'
        s.setAttribute('data-slot', r + i)
        c.appendChild(s)
        slots[r].push(s)
      })
      var lb = api.at(sc, 'jl', XS[r] - 70, 480, 140, 40)
      lb.style.cssText += ';font:900 26px/40px Nunito,sans-serif;color:#fff;text-align:center;text-shadow:0 2px 4px rgba(0,0,0,.6);pointer-events:none'
      lb.textContent = r === 'L' ? 'KIRI' : 'KANAN'
    })
    var flag = api.art(sc, 'prop-bendera', FLAG.x - 35, FLAG.y - 110, 70, 110)
    var park = api.art(sc, 'prop-jalur-taman', 340, 215, 420, 120, 'park')
    park.style.opacity = '0'
    park.setAttribute('data-park', 'off')
    var buggy = api.art(sc, 'veh-buggy-misi', 0, 0, 200, 130, 'jbuggy')
    buggy.setAttribute('data-buggy', '1')
    var box = api.art(sc, 'prop-paket', 0, 0, 90, 80, 'jbox')
    box.style.zIndex = '1'
    box.style.cursor = 'pointer'
    box.setAttribute('data-box', '1')
    var go = api.at(sc, 'obtn bbtn', 686, 655, 300, 66, 'button')
    go.type = 'button'
    go.textContent = 'TAHAN UNTUK JALAN'
    go.style.fontSize = '26px'
    go.style.touchAction = 'none'
    go.setAttribute('data-act', 'jalan-hold')
    go.style.opacity = '0'
    go.style.pointerEvents = 'none'
    go.style.zIndex = '6'

    function place (pt) {
      buggy.style.transform = 'translate(' + (pt.x - 100) + 'px,' + (pt.y - 65) + 'px)'
      box.style.transform = 'translate(' + (pt.x + 10) + 'px,' + (pt.y + 5) + 'px)'
    }
    function board (r, i) {
      var s = slots[r][i]
      s.style.border = 'none'
      s.style.background = 'none'
      s.innerHTML = ''
      var b = A.frame('prop-papan')
      b.style.cssText += ';pointer-events:none'
      s.appendChild(b)
      s.setAttribute('data-board', 'on')
    }
    function refreshSlots () {
      ;['L', 'R'].forEach(function (r) {
        cross[r].style.opacity = route && route !== r ? '.35' : '1'
      })
    }
    if (route) { [0, 1, 2].forEach(function (i) { board(route, i) }) }
    refreshSlots()

    function tapCross (r) {
      var s
      var i = [0, 1, 2].filter(function (k) { return placed.indexOf(k) < 0 })[0]
      if (api.step() !== 0) return
      api.touch()
      if (api.tool() !== 'papan') { api.warn(L.wrongTool); api.shakeTool('papan'); return }
      if (route && route !== r) { api.warn('Kamu sudah memilih jalur ' + (route === 'L' ? 'kiri' : 'kanan') + '. Selesaikan dulu ya. Jalur lain boleh dicoba nanti!'); return }
      if (i == null) return
      s = slots[r][i]
      if (!route) { route = r; refreshSlots(); api.sfx('ok') }
      placed = placed.concat([i])
      board(r, i)
      api.sfx('tap')
      s.classList.remove('bounce'); void s.offsetWidth; s.classList.add('bounce')
      if (placed.length >= 3) {
        api.persist({ route: route })
        api.later(function () { api.advance() }, 450)
      }
    }

    function pts () { return pathFor(route || 'R') }
    function len () { return lengths(pts()) }

    function loop (t0) {
      var last = t0
      function f (t) {
        if (!holding || api.step() !== 1) return
        var dt = Math.min(60, t - last)
        last = t
        if (!api.paused()) {
          dist += dt * 0.34
          var l = len()
          if (dist >= l.total) {
            dist = l.total
            place(at(pts(), l, dist))
            holding = false
            api.persist({ route: route })
            api.advance()
            return
          }
          place(at(pts(), l, dist))
        }
        raf = requestAnimationFrame(f)
      }
      raf = requestAnimationFrame(f)
    }
    function startHold (ev) {
      if (api.step() !== 1) return
      api.touch()
      if (api.tool() !== 'jalan') { api.warn(L.wrongTool); api.shakeTool('jalan'); return }
      holding = true
      api.sfx('honk')
      try { ev.target.setPointerCapture && ev.target.setPointerCapture(ev.pointerId) } catch (e) { /* ignore */ }
      loop(performance.now())
    }
    function stopHold () { holding = false }
    ;[go, buggy].forEach(function (el) {
      el.style.touchAction = 'none'
      el.addEventListener('pointerdown', startHold)
      el.addEventListener('pointerup', stopHold)
      el.addEventListener('pointercancel', stopHold)
      el.addEventListener('lostpointercapture', stopHold)
    })

    box.addEventListener('click', function () {
      if (api.step() !== 2 || delivered) return
      api.touch()
      if (api.tool() !== 'paket') { api.warn(L.wrongTool); api.shakeTool('paket'); return }
      deliver()
    })
    function deliver () {
      delivered = true
      api.sfx('ok')
      var from = { x: FLAG.x - 45, y: FLAG.y + 100 }
      api.tween(from, { x: FLAG.x + 60, y: FLAG.y - 20 }, 500, function (p) { box.style.transform = 'translate(' + p.x + 'px,' + p.y + 'px)' }, function () {
        api.persist({ route: route })
        api.advance()
      })
    }

    place(rs && rs.step >= 2 ? at(pts(), len(), len().total) : START)
    var ctl = {
      onStep: function (n) {
        go.style.opacity = n === 1 ? '1' : '0'
        go.style.pointerEvents = n === 1 ? 'auto' : 'none'
        box.style.pointerEvents = n === 2 ? 'auto' : 'none'
        if (n === 2) { box.classList.add('glow') }
      },
      onTool: function () {},
      hint: function (lvl) {
        var s = api.step()
        if (s === 0) {
          var r = route || 'R'
          cross[r].classList.add('glow'); setTimeout(function () { cross[r].classList.remove('glow') }, 2600)
          if (lvl >= 4 && api.tool() === 'papan') tapCross(r)
        } else if (s === 1) {
          if (api.tool() !== 'jalan') api.glowTool('jalan', 3000)
          go.classList.add('glow'); setTimeout(function () { go.classList.remove('glow') }, 2600)
          if (lvl >= 4 && api.tool() === 'jalan') { dist = len().total; place(at(pts(), len(), dist)); api.persist({ route: route }); api.advance() }
        } else {
          if (api.tool() !== 'paket') api.glowTool('paket', 3000)
          box.classList.add('glow')
          if (lvl >= 4 && api.tool() === 'paket') deliver()
        }
      },
      win: function () {
        park.style.opacity = '1'
        park.setAttribute('data-park', 'on')
        api.sfx('ok')
      },
      destroy: function () { holding = false; cancelAnimationFrame(raf) }
    }
    return ctl
  } }

  if (w.BlippiMissionRegister) w.BlippiMissionRegister('W01-M01', mod)
})(window)
