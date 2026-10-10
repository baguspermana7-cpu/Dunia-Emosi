/* G32 Blippi -- mission screen template (the owner's mission reference) + W02-M01 "Kincir yang Menunggu".
 * Template: pause/home, title pill, step bar, instruction pill, tool tray, Blippi portrait + speaker, PETUNJUK.
 * A mission module (register) fills the scene and reacts to steps, tools and hints. */
(function (w) {
  'use strict'
  var B = w.Blippi
  var D = w.BlippiData
  var A = w.BlippiArt
  var ICON = B.ICON
  var modules = {}
  var run = null

  function register (id, mod) { modules[id] = mod }
  function reduced () { return w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches }

  function tween (from, to, ms, step, done) {
    if (reduced()) ms = 1
    var t0 = null
    function f (t) {
      if (!run || run.dead) return
      if (t0 === null) t0 = t
      var k = Math.min(1, (t - t0) / ms)
      var e = 1 - Math.pow(1 - k, 3)
      step({ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e }, k)
      if (k < 1) run.raf = requestAnimationFrame(f)
      else if (done) done()
    }
    run.raf = requestAnimationFrame(f)
  }

  function build (el, params) {
    var m = D.missions[params.mission]
    var steps = m.steps
    var saved = B.state().progress[m.id]
    run = { m: m, el: el, step: saved && saved.step > 0 && saved.step < steps.length ? saved.step : 0, tool: null, hint: 0, idle: 0, paused: false,
      dead: false, timers: [], raf: 0, data: (saved && saved.data) || {}, vehicle: params.vehicle || m.vehicle, ctl: null, warnT: 0 }
    B.bgslot(el, m.bg)
    var scene = B.at(el, '', 0, 0, B.W, B.H)
    scene.id = 'm-scene'
    scene.setAttribute('data-mission', m.id)
    scene.setAttribute('data-vehicle', run.vehicle)

    // chrome
    B.circle(el, 'pause', 25, 22, 'Jeda', pause).setAttribute('data-act', 'pause')
    B.circle(el, 'home', 125, 22, 'Ke beranda', function () { B.home() })
    B.art(el, 'logo-blippi', 1465, 22, 185, 100, 'logo')
    var tp = B.at(el, 'pill big', 586, 12, 500, 58)
    tp.textContent = m.title
    var sb = B.at(el, 'bar stepbar', 470, 74, 735, 80)
    sb.setAttribute('data-stepbar', '1')
    var ins = B.at(el, 'bar instr', 608, 160, 458, 58)
    ins.setAttribute('data-instr', '1')
    var tray = B.at(el, 'panel tray', 462, 738, 752, 168)
    tray.setAttribute('data-tray', '1')
    tray.style.borderRadius = '30px'
    tray.style.borderWidth = '5px'
    var por = B.at(el, 'portrait', 30, 718, 196, 196)
    por.appendChild(A.frame('blippi-potret'))
    var sp = B.circle(el, 'speaker', 168, 820, 'Dengarkan petunjuk', function () { speak(currentText()) })
    sp.setAttribute('data-act', 'speaker')
    var hb = B.btn(el, 'hintbtn', 1378, 798, 268, 104, 'Petunjuk', function () { hintPress() })
    hb.setAttribute('data-act', 'petunjuk')
    hb.innerHTML = ICON.bulb + '<span>PETUNJUK</span>'

    var payoff = B.at(el, 'payoff', 0, 0, B.W, B.H)

    var api = {
      m: m, scene: scene, W: B.W, H: B.H,
      step: function () { return run.step },
      tool: function () { return run.tool },
      data: function () { return run.data },
      restore: saved && saved.step > 0 ? saved : null,
      at: B.at, art: B.art, sfx: B.sfx, toRef: B.toRef, tween: tween, reduced: reduced,
      touch: touch, warn: warn, advance: advance, persist: persist,
      later: function (fn, ms) { var id = setTimeout(function () { if (run && !run.dead) fn() }, ms); run.timers.push(id); return id },
      shakeTool: shakeTool, glowTool: glowTool,
      paused: function () { return run.paused },
      lines: m.lines
    }
    run.api = api
    run.nodes = { ins: ins, sb: sb, tray: tray, payoff: payoff, scene: scene }
    var mod = modules[m.id]
    run.ctl = mod.mount(api)
    renderSteps()
    renderTray()
    setInstr(steps[run.step].instr)
    if (run.step === 0) { run.tool = steps[0].tool; renderTray() }
    if (run.ctl.onStep) run.ctl.onStep(run.step, true)
    run.idleT = setInterval(function () {
      if (run.paused || run.dead || run.winning) return
      run.idle++
      if (run.idle === 8 && run.hint < 1) { run.hint = 1; run.ctl.hint && run.ctl.hint(1) }
    }, 1000)
    document.addEventListener('visibilitychange', onVis)
  }

  function onVis () { if (document.hidden && run && !run.dead && !run.paused && !run.winning && B.current() === 'mission') pause() }

  function leave () {
    if (!run) return
    run.dead = true
    clearInterval(run.idleT)
    run.timers.forEach(clearTimeout)
    if (run.raf) cancelAnimationFrame(run.raf)
    if (run.ctl && run.ctl.destroy) run.ctl.destroy()
    document.removeEventListener('visibilitychange', onVis)
    if (w.speechSynthesis) { try { w.speechSynthesis.cancel() } catch (e) { /* ignore */ } }
    run = null
  }

  function currentText () { return run.nodes.ins.textContent }
  function speak (t) {
    if (!B.state().sound || !w.speechSynthesis) return
    try {
      w.speechSynthesis.cancel()
      var u = new w.SpeechSynthesisUtterance(t)
      u.lang = 'id-ID'
      u.rate = 0.9
      w.speechSynthesis.speak(u)
    } catch (e) { /* speech is optional */ }
  }
  function touch () { run.idle = 0 }

  function setInstr (text, warnMsg) {
    var n = run.nodes.ins
    n.textContent = text
    n.style.color = warnMsg ? '#C4500A' : ''
    var wd = Math.max(458, Math.min(900, text.length * 15 + 70))
    n.style.width = wd + 'px'
    n.style.left = (836 - wd / 2) + 'px'
  }
  function warn (text) {
    setInstr(text, true)
    B.sfx('bad')
    clearTimeout(run.warnT)
    run.warnT = setTimeout(function () { if (run && !run.dead) setInstr(run.m.steps[run.step].instr) }, 3400)
  }

  function renderSteps () {
    var sb = run.nodes.sb
    sb.innerHTML = ''
    run.m.steps.forEach(function (s, i) {
      if (i) { var sep = document.createElement('span'); sep.className = 'sep'; sb.appendChild(sep) }
      var d = document.createElement('div')
      d.className = 'step' + (i === run.step ? ' on' : (i < run.step ? ' done' : ''))
      d.setAttribute('data-step', String(i))
      d.innerHTML = '<span style="display:inline-flex;width:40px;height:40px">' + (ICON[s.icon] || '') + '</span><i>' + (i + 1) + '</i><span>' + s.label + '</span>'
      sb.appendChild(d)
    })
  }

  function renderTray () {
    var tray = run.nodes.tray
    tray.innerHTML = ''
    var steps = run.m.steps
    steps.forEach(function (s, i) {
      var t = document.createElement('button')
      t.type = 'button'
      t.className = 'tool' + (run.tool === s.tool ? ' sel' : '') + (i === run.step ? ' cur' : '') + (i < run.step ? ' done' : '')
      t.setAttribute('data-tool', s.tool)
      t.setAttribute('aria-pressed', run.tool === s.tool ? 'true' : 'false')
      t.style.cssText = 'position:absolute;left:' + (12 + i * 245) + 'px;top:12px;width:232px;height:140px'
      var a = document.createElement('div')
      a.className = 'art'
      a.style.cssText = 'inset:6px 20px 52px 20px;width:auto;height:auto'
      A.fill(a, s.toolArt)
      t.appendChild(a)
      var l = document.createElement('span')
      l.className = 'lb'
      l.textContent = s.toolName
      t.appendChild(l)
      t.addEventListener('click', function () { B.sfx('tap'); touch(); pickTool(s.tool) })
      tray.appendChild(t)
    })
  }
  function toolEl (id) { return run.nodes.tray.querySelector('[data-tool=' + id + ']') }
  function shakeTool (id) {
    var t = toolEl(id)
    if (!t) return
    t.classList.remove('shake'); void t.offsetWidth; t.classList.add('shake')
  }
  function glowTool (id, ms) {
    var t = toolEl(id)
    if (!t) return
    t.classList.add('glow')
    setTimeout(function () { if (t) t.classList.remove('glow') }, ms || 2600)
  }

  function pickTool (id) {
    if (!run || run.winning) return
    var s = run.m.steps[run.step]
    if (id === s.tool) {
      run.tool = id
      renderTray()
      if (run.ctl.onTool) run.ctl.onTool(id)
    } else {
      warn(s.wrong)
      shakeTool(id)
      glowTool(s.tool)
    }
  }

  function persist (data) {
    run.data = data
    var id = run.m.id
    var step = run.step
    B.commit(function (s) { s.progress[id] = { step: step, data: data } })
  }

  function advance () {
    if (!run || run.winning) return
    run.step++
    run.tool = null
    run.hint = 0
    run.idle = 0
    var id = run.m.id
    var step = run.step
    if (run.step >= run.m.steps.length) return win()
    B.commit(function (s) { s.progress[id] = { step: step, data: run.data } })
    renderSteps()
    renderTray()
    setInstr(run.m.steps[run.step].instr)
    if (run.ctl.onStep) run.ctl.onStep(run.step, false)
  }

  function hintPress () {
    if (!run || run.winning) return
    touch()
    run.hint = Math.min(4, run.hint + 1)
    var msg = run.m.hints[Math.min(run.hint, 3) - 1]
    if (run.hint <= 3) setInstr(msg, true)
    if (run.ctl.hint) run.ctl.hint(run.hint)
    if (run.hint >= 2) speak(msg)
    clearTimeout(run.warnT)
    run.warnT = setTimeout(function () { if (run && !run.dead) setInstr(run.m.steps[run.step].instr) }, 4200)
  }

  function pause () {
    if (!run || run.paused) return
    run.paused = true
    B.modal({ title: 'Jeda', text: 'Petualanganmu aman. Kembali kapan saja!', h: 420, buttons: [
      { id: 'lanjut', label: 'LANJUT', blue: true, fn: function () { if (run) { run.paused = false; run.idle = 0 } } },
      { id: 'peta', label: 'KE PETA', fn: function () { B.go('map') } },
      { id: 'beranda', label: 'BERANDA', blue: true, fn: function () { B.home() } }
    ] })
  }

  function win () {
    run.winning = true
    var m = run.m
    if (run.ctl.win) run.ctl.win()
    B.sfx('win')
    var first = B.grant(m)
    B.commit(function (s) { delete s.progress[m.id] })
    run.api.later(function () {
      var p = run.nodes.payoff
      p.innerHTML = ''
      p.classList.add('on')
      var box = B.at(p, 'panel box pp', 456, 190, 760, 560)
      box.setAttribute('data-payoff', first ? 'first' : 'again')
      B.txt(box, 'title', 0, 28, 760, 56, 'Hore!').style.fontSize = '58px'
      var line = B.txt(box, '', 40, 100, 680, 70, m.lines.win)
      line.style.cssText += ';font:900 30px/1.2 Nunito,sans-serif;color:#13318A;text-align:center'
      B.art(box, m.reward.sticker, 270, 180, 220, 220, 'pp')
      var l2 = B.txt(box, '', 40, 405, 680, 50, first ? ('Kamu dapat ' + m.reward.stickerName + (m.reward.vehicle ? ' dan ' + B.titleCase(B.vehicleById(m.reward.vehicle).name) + ' jadi milikmu!' : '!')) : 'Kamu sudah punya stikernya. Main lagi kapan saja!')
      l2.style.cssText += ';font:800 24px/1.2 Nunito,sans-serif;color:#C4500A;text-align:center'
      var nb = B.btn(box, 'obtn', 230, 462, 300, 80, 'Lanjut', function () { B.go('map', { world: m.world }) })
      nb.textContent = 'LANJUT'
      nb.setAttribute('data-act', 'lanjut')
    }, 1800)
  }

  function mission (el, params) { build(el, params) }
  B.register('mission', mission, leave)
  w.BlippiMissionRegister = register

  /* ====================== W02-M01 Kincir yang Menunggu ====================== */
  var E0 = { x: 800, y: 600 }
  var T = { x: 975, y: 540 }
  var AN = { x: 535, y: 470 }
  var VAL = { x: 1040, y: 430 }

  function hosePath (e) {
    var c1 = { x: AN.x - 60, y: AN.y + 230 }
    var c2 = { x: e.x - 200, y: e.y + 120 }
    return 'M' + AN.x + ',' + AN.y + ' C' + c1.x + ',' + c1.y + ' ' + c2.x + ',' + c2.y + ' ' + e.x + ',' + e.y
  }

  register('W02-M01', { mount: function (api) {
    var sc = api.scene
    var NS = 'http://www.w3.org/2000/svg'
    var L = api.lines
    var connected = !!(api.restore && api.restore.step >= 1)
    var opened = !!(api.restore && api.restore.step >= 2)
    var E = connected ? { x: T.x - 38, y: T.y + 6 } : { x: E0.x, y: E0.y }
    var drag = null
    var attempts = 0
    var level = 0
    var holding = false
    var pumpRaf = 0
    var rot = 0

    api.art(sc, 'prop-kincir-rumah', 960, 180, 690, 500)
    var wheel = api.art(sc, 'prop-kincir-roda', 1085, 255, 400, 400, 'wheel')
    wheel.setAttribute('data-wheel', 'off')
    api.art(sc, 'prop-pipa', 962, 330, 150, 300)
    var truck = api.art(sc, 'veh-truk-air-sisi', 10, 190, 760, 495)
    var valve = api.art(sc, 'prop-katup', VAL.x - 50, VAL.y - 50, 100, 100, 'valve')
    valve.style.opacity = '0'
    valve.style.transformOrigin = '50% 50%'
    var pump = api.art(sc, 'prop-pompa-truk', 560, 480, 180, 120, 'pumpunit')
    pump.style.opacity = '0'
    var svg = document.createElementNS(NS, 'svg')
    svg.setAttribute('viewBox', '0 0 1672 941')
    svg.setAttribute('width', '1672')
    svg.setAttribute('height', '941')
    svg.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none'
    svg.innerHTML = '<path id="hose-o" fill="none" stroke="#B8860B" stroke-width="24" stroke-linecap="round"/>' +
      '<path id="hose-i" fill="none" stroke="#F5C518" stroke-width="16" stroke-linecap="round"/>' +
      '<path id="hose-w" class="flow" fill="none" stroke="#8fd0ff" stroke-width="8" stroke-linecap="round" opacity="0"/>' +
      '<g id="arrow"><path d="M868,572 Q905,548 930,545" fill="none" stroke="#F4761A" stroke-width="6" stroke-dasharray="12 9" stroke-linecap="round"/><path d="M922,531 L942,544 L920,556" fill="none" stroke="#F4761A" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></g>' +
      '<g id="fall" opacity="0"><path d="M1190,300 L1190,330 M1230,296 L1230,330 M1270,292 L1270,330 M1310,296 L1310,330" stroke="#8fd0ff" stroke-width="8" stroke-linecap="round" class="fall" stroke-dasharray="14 10"/></g>'
    sc.appendChild(svg)
    var hoseO = svg.querySelector('#hose-o')
    var hoseI = svg.querySelector('#hose-i')
    var hoseW = svg.querySelector('#hose-w')
    var arrow = svg.querySelector('#arrow')
    var fall = svg.querySelector('#fall')
    var ring = api.at(sc, 'tring', T.x - 38, T.y - 38, 76, 76)
    ring.style.cssText += ';border:7px solid #FFC440;border-radius:50%;box-shadow:0 0 18px 4px rgba(255,190,60,.85);pointer-events:none'
    ring.setAttribute('data-target', 'inlet')
    var hend = api.at(sc, 'hend', 0, 0, 120, 80)
    hend.setAttribute('data-hose-end', '1')
    hend.style.touchAction = 'none'
    hend.style.cursor = 'grab'
    hend.style.zIndex = '5'
    hend.appendChild(A.frame('prop-selang-ujung'))
    var hand = api.at(sc, 'ghost hand-idle', 0, 0, 90, 90)
    hand.innerHTML = B.ICON.hand
    hand.style.opacity = '1'
    hand.style.left = '800px'
    hand.style.top = '640px'
    var ghost = api.at(sc, 'ghost', 0, 0, 90, 90)
    ghost.innerHTML = B.ICON.hand
    var meter = api.at(sc, 'meter', 540, 440, 240, 26)
    meter.style.display = 'none'
    meter.innerHTML = '<i></i>'
    meter.setAttribute('data-meter', '1')

    function setHose (e) {
      E = e
      var d = hosePath(e)
      hoseO.setAttribute('d', d)
      hoseI.setAttribute('d', d)
      hoseW.setAttribute('d', d)
      hend.style.transform = 'translate(' + (e.x - 60) + 'px,' + (e.y - 40) + 'px)'
    }
    setHose(E)
    if (connected) { arrow.style.display = 'none'; hand.style.display = 'none'; ring.style.borderColor = '#41C27D' }

    function connect () {
      connected = true
      arrow.style.display = 'none'
      hand.style.display = 'none'
      ring.style.borderColor = '#41C27D'
      ring.style.boxShadow = '0 0 18px 4px rgba(65,194,125,.85)'
      api.sfx('ok')
      var to = { x: T.x - 38, y: T.y + 6 }
      api.tween(E, to, 220, setHose, function () { api.later(function () { api.persist({ connected: true }); api.advance() }, 350) })
    }
    function dist (a, b) { var dx = a.x - b.x; var dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy) }
    function backHome (msg) {
      attempts++
      api.tween(E, { x: E0.x, y: E0.y }, 380, setHose)
      hend.firstChild.classList.remove('bounce'); void hend.offsetWidth; hend.firstChild.classList.add('bounce')
      if (msg) { api.warn(L.retry) }
      if (attempts >= 2 && api.step() === 0) api_hint(2)
    }
    function api_hint (lvl) { if (ctl.hint) ctl.hint(lvl) }

    hend.addEventListener('pointerdown', function (ev) {
      if (api.step() !== 0 || connected || drag) return
      api.touch()
      var r = api.toRef(ev.clientX, ev.clientY)
      drag = { id: ev.pointerId, ox: E.x - r.x, oy: E.y - r.y }
      try { hend.setPointerCapture(ev.pointerId) } catch (e) { /* ignore */ }
      hand.style.display = 'none'
      hend.style.cursor = 'grabbing'
    })
    hend.addEventListener('pointermove', function (ev) {
      if (!drag || ev.pointerId !== drag.id) return
      var r = api.toRef(ev.clientX, ev.clientY)
      setHose({ x: r.x + drag.ox, y: r.y + drag.oy })
    })
    function end (ev, cancelled) {
      if (!drag || ev.pointerId !== drag.id) return
      drag = null
      hend.style.cursor = 'grab'
      if (cancelled) { backHome(false); return }
      if (dist(E, { x: T.x - 38, y: T.y + 6 }) <= 95) connect()
      else backHome(true)
    }
    hend.addEventListener('pointerup', function (ev) { end(ev, false) })
    hend.addEventListener('pointercancel', function (ev) { end(ev, true) })
    hend.addEventListener('lostpointercapture', function (ev) { end(ev, true) })

    /* step 2: valve */
    var acc = 0
    var vdrag = null
    var moved = 0
    function setRot (v) { rot = v; valve.style.transform = 'rotate(' + v + 'deg)' }
    function openValve () {
      if (opened) return
      opened = true
      api.sfx('ok')
      setRot(270)
      valve.setAttribute('data-valve', 'open')
      api.persist({ connected: true, opened: true })
      api.later(function () { api.advance() }, 450)
    }
    function valveTurn () {
      if (api.step() !== 1) return
      if (api.tool() !== 'katup') { api.warn(L.pickValve); api.shakeTool('katup'); api.glowTool('katup'); return }
      setRot(Math.min(270, rot + 90))
      api.sfx('tap')
      if (rot >= 270) openValve()
    }
    valve.style.cursor = 'pointer'
    valve.style.touchAction = 'none'
    valve.setAttribute('data-valve', opened ? 'open' : 'closed')
    valve.addEventListener('pointerdown', function (ev) {
      if (api.step() !== 1) return
      api.touch()
      var r = api.toRef(ev.clientX, ev.clientY)
      vdrag = { id: ev.pointerId, a: Math.atan2(r.y - VAL.y, r.x - VAL.x), x: r.x, y: r.y }
      moved = 0
      acc = 0
      try { valve.setPointerCapture(ev.pointerId) } catch (e) { /* ignore */ }
    })
    valve.addEventListener('pointermove', function (ev) {
      if (!vdrag || ev.pointerId !== vdrag.id || api.tool() !== 'katup') return
      var r = api.toRef(ev.clientX, ev.clientY)
      moved += Math.abs(r.x - vdrag.x) + Math.abs(r.y - vdrag.y)
      vdrag.x = r.x; vdrag.y = r.y
      var a = Math.atan2(r.y - VAL.y, r.x - VAL.x)
      var da = a - vdrag.a
      if (da > Math.PI) da -= 2 * Math.PI
      if (da < -Math.PI) da += 2 * Math.PI
      vdrag.a = a
      acc += da * 180 / Math.PI
      if (moved > 14) { setRot(Math.max(0, Math.min(270, acc))); if (rot >= 268) openValve() }
    })
    function vend (ev) {
      if (!vdrag || ev.pointerId !== vdrag.id) return
      var tap = moved < 14
      vdrag = null
      if (tap) valveTurn()
      else if (!opened) setRot(Math.round(rot / 90) * 90)
    }
    valve.addEventListener('pointerup', vend)
    valve.addEventListener('pointercancel', function () { vdrag = null })
    valve.addEventListener('lostpointercapture', function () { vdrag = null })

    /* step 3: hold the pump */
    function flow (on) { hoseW.setAttribute('opacity', on ? '1' : '0') }
    function setLevel (v) {
      level = Math.max(0, Math.min(1, v))
      meter.firstChild.style.width = (level * 100) + '%'
      meter.setAttribute('data-level', level.toFixed(2))
      flow(level > 0)
      if (level >= 1 && api.step() === 2) finishPump()
    }
    function finishPump () {
      holding = false
      cancelAnimationFrame(pumpRaf)
      api.persist({ connected: true, opened: true })
      api.advance()
    }
    function pumpLoop (t0) {
      var last = t0
      function f (t) {
        if (!holding || api.step() !== 2) return
        var dt = Math.min(60, t - last)
        last = t
        if (!api.paused()) setLevel(level + dt / 2200)
        pumpRaf = requestAnimationFrame(f)
      }
      pumpRaf = requestAnimationFrame(f)
    }
    pump.style.touchAction = 'none'
    pump.style.cursor = 'pointer'
    pump.style.zIndex = '4'
    pump.addEventListener('pointerdown', function (ev) {
      if (api.step() !== 2) return
      api.touch()
      if (api.tool() !== 'pompa') { api.warn(L.pickPump); api.shakeTool('pompa'); api.glowTool('pompa'); return }
      holding = true
      api.sfx('water')
      try { pump.setPointerCapture(ev.pointerId) } catch (e) { /* ignore */ }
      pumpLoop(performance.now())
    })
    function release () { holding = false }
    pump.addEventListener('pointerup', release)
    pump.addEventListener('pointercancel', release)
    pump.addEventListener('lostpointercapture', release)

    function ghostMove (pts, ms, cb) {
      ghost.style.opacity = '1'
      var i = 0
      function nextLeg () {
        if (i >= pts.length - 1) { ghost.style.opacity = '0'; if (cb) cb(); return }
        api.tween(pts[i], pts[i + 1], ms, function (p) { ghost.style.transform = 'translate(' + p.x + 'px,' + p.y + 'px)' }, function () { i++; nextLeg() })
      }
      ghost.style.transform = 'translate(' + pts[0].x + 'px,' + pts[0].y + 'px)'
      nextLeg()
    }

    var ctl = {
      onStep: function (n, initial) {
        if (n >= 1) valve.style.opacity = '1'
        if (n >= 2) { pump.style.opacity = '1'; meter.style.display = 'block' }
        if (n === 1) hand.style.display = 'none'
        if (n === 1 && !initial) api.sfx('ok')
        if (n >= 2) flow(false)
      },
      onTool: function (id) {
        if (id === 'katup') { valve.classList.add('glow'); api.later(function () { valve.classList.remove('glow') }, 2200) }
        if (id === 'pompa') { pump.classList.add('glow'); api.later(function () { pump.classList.remove('glow') }, 2200) }
      },
      hint: function (lvl) {
        var s = api.step()
        if (s === 0) {
          if (lvl === 1) { hend.classList.add('glow'); ring.classList.add('glow') }
          else if (lvl === 2) { arrow.style.display = ''; hand.style.display = ''; hand.style.left = '800px' }
          else if (lvl === 3) { hand.style.display = 'none'; ghostMove([{ x: E0.x - 30, y: E0.y + 10 }, { x: T.x - 60, y: T.y - 10 }], 900) }
          else if (lvl >= 4 && !connected) { api.tween(E, { x: T.x - 38, y: T.y + 6 }, 400, setHose, connect) }
        } else if (s === 1) {
          if (api.tool() !== 'katup') api.glowTool('katup', 3000)
          if (lvl === 1) valve.classList.add('glow')
          else if (lvl === 2) { ring.style.display = 'none'; api.glowTool('katup', 3000); valve.classList.add('glow') }
          else if (lvl === 3) ghostMove([{ x: VAL.x - 30, y: VAL.y - 10 }, { x: VAL.x - 30, y: VAL.y - 20 }, { x: VAL.x - 30, y: VAL.y - 10 }], 400)
          else if (lvl >= 4) { openValve() }
        } else if (s === 2) {
          if (api.tool() !== 'pompa') api.glowTool('pompa', 3000)
          if (lvl === 1) pump.classList.add('glow')
          else if (lvl === 2) { pump.classList.add('glow'); api.glowTool('pompa', 3000) }
          else if (lvl === 3) ghostMove([{ x: 620, y: 520 }, { x: 625, y: 530 }, { x: 620, y: 520 }], 500)
          else if (lvl >= 4) { api.tool() !== 'pompa' || setLevel(1) }
        }
      },
      win: function () {
        flow(true)
        fall.setAttribute('opacity', '1')
        wheel.classList.add('on')
        wheel.setAttribute('data-wheel', 'on')
        api.sfx('water')
      },
      destroy: function () { holding = false; cancelAnimationFrame(pumpRaf) }
    }
    if (api.restore) setRot(opened ? 270 : 0)
    return ctl
  } })
})(window)
