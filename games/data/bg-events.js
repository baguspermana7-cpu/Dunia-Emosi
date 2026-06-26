/* =============================================================================
 * bg-events.js — Random journey events for train-bg-engine (v54.66)
 * =============================================================================
 * Spec source: documentation and standarization/DYNAMIC_BG_ENGINE_SPEC.md §22
 *
 * Provides 5 random journey events that fire during gameplay:
 *
 *   passingTrain  — distant train silhouette scrolls across far layer + horn
 *   railwayCrossing — flashing red signal lamps + crossing-bell audio
 *   sunBreak      — sun breaks through clouds (brief golden flash)
 *   tunnel        — dim full-screen overlay 2-4s, exits to brighter scene
 *   fireworks     — particle bursts above skyline at night, festival accent
 *
 * Events are journey-phase-aware:
 *   - tunnel:        countryside / suburban only
 *   - passingTrain:  any non-arrival phase
 *   - crossing:      urban-exit / approaching
 *   - sunBreak:      pagi / siang / sore (not at night)
 *   - fireworks:     petang / malam / blue-hour (festival nights only)
 *
 * Visual content paints onto the engine's `event` layer (z-order: above
 * weather, below UI). Audio uses BGAudio.ACCENTS primitives.
 *
 * Random scheduling: every 18-35s a candidate event is picked weighted by
 * current journey phase. Picked event runs its lifecycle then clears.
 *
 * Performance: max ONE event active at a time (lifecycle promise gate).
 * ========================================================================== */

(function (global) {
  'use strict'

  if (!global.TrainBG || !global.PIXI) {
    console.warn('[bg-events] TrainBG or PIXI not loaded; events inactive')
    return
  }
  const TrainBG = global.TrainBG
  const PIXI = global.PIXI

  function vw () { return TrainBG.state().viewport.w || 800 }
  function vh () { return TrainBG.state().viewport.h || 600 }
  function eventLayer () { const L = TrainBG.layers(); return L && L.event }
  function bgAudio () { return global.BGAudio }

  // ── State ──────────────────────────────────────────────────────────────────
  const State = {
    running: false,
    active: null,         // currently running event name (or null)
    scheduleTimer: null,
  }

  // ── 1. Passing train ──────────────────────────────────────────────────────
  function fireEventPassingTrain () {
    const L = eventLayer()
    if (!L) return Promise.resolve()
    const W = vw(), H = vh()
    const baseY = H * 0.48
    const train = new PIXI.Container()
    const g = new PIXI.Graphics()
    // Locomotive — Thomas-ish blue
    g.rect(0, -16, 26, 16).fill({ color: 0x1e88e5, alpha: 0.95 })
    g.poly([0, -16, 0, -22, 14, -22, 14, -16]).fill({ color: 0x1e88e5, alpha: 0.95 })
    g.rect(2, -28, 6, 8).fill({ color: 0x546e7a, alpha: 0.95 })   // chimney
    g.rect(20, -14, 4, 8).fill({ color: 0xfff59d, alpha: 0.95 })  // headlight
    g.circle(4, 0, 3).fill({ color: 0x37474f, alpha: 1 })
    g.circle(14, 0, 3).fill({ color: 0x37474f, alpha: 1 })
    g.circle(22, 0, 3).fill({ color: 0x37474f, alpha: 1 })
    // Coaches (4)
    for (let i = 0; i < 4; i++) {
      const cx = 32 + i * 28
      g.rect(cx, -14, 26, 14).fill({ color: 0xe53935, alpha: 0.95 })
      g.rect(cx, -14, 26, 2).fill({ color: 0x546e7a, alpha: 0.95 })
      // Windows
      for (let w = 0; w < 4; w++) g.rect(cx + 3 + w * 6, -10, 3, 4).fill({ color: 0xfff59d, alpha: 0.85 })
      g.circle(cx + 6, 0, 2.5).fill({ color: 0x37474f, alpha: 1 })
      g.circle(cx + 20, 0, 2.5).fill({ color: 0x37474f, alpha: 1 })
    }
    train.addChild(g)
    train.x = W + 60
    train.y = baseY
    L.addChild(train)
    // Horn audio
    try { bgAudio() && bgAudio().ACCENTS.distantHorn() } catch (_) {}
    // Animate scroll across viewport in 3.5s
    return new Promise(resolve => {
      const dur = 3500
      const start = (global.performance && global.performance.now) ? global.performance.now() : Date.now()
      const totalDist = W + 240
      const step = (now) => {
        const t = Math.min(1, ((now || (global.performance && global.performance.now ? global.performance.now() : Date.now())) - start) / dur)
        train.x = (W + 60) - totalDist * t
        if (t >= 1) {
          try { L.removeChild(train); train.destroy && train.destroy({ children: true }) } catch (_) {}
          resolve()
          return
        }
        requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    })
  }

  // ── 2. Railway crossing ────────────────────────────────────────────────────
  function fireEventCrossing () {
    const L = eventLayer()
    if (!L) return Promise.resolve()
    const W = vw(), H = vh()
    const cont = new PIXI.Container()
    // Two lamp posts with alternating red flashing.
    const lamp1 = new PIXI.Graphics()
    const lamp2 = new PIXI.Graphics()
    const drawLamp = (g, on) => {
      g.clear()
      g.rect(-1, -32, 2, 26).fill({ color: 0x6d4c41, alpha: 1 })
      g.circle(0, -32, 5).fill({ color: on ? 0xef5350 : 0x6d4c41, alpha: on ? 1 : 0.8 })
    }
    lamp1.x = W * 0.30; lamp1.y = H * 0.78
    lamp2.x = W * 0.70; lamp2.y = H * 0.78
    cont.addChild(lamp1); cont.addChild(lamp2)
    L.addChild(cont)
    let flashState = false
    const flashInterval = setInterval(() => {
      flashState = !flashState
      drawLamp(lamp1, flashState)
      drawLamp(lamp2, !flashState)
    }, 400)
    // Crossing bell + occasional honk
    try { bgAudio() && bgAudio().ACCENTS.crossingBell() } catch (_) {}
    setTimeout(() => { try { bgAudio() && bgAudio().ACCENTS.crossingBell() } catch (_) {} }, 1200)
    setTimeout(() => { try { bgAudio() && bgAudio().ACCENTS.klaxonShort() } catch (_) {} }, 2400)
    return new Promise(resolve => {
      setTimeout(() => {
        clearInterval(flashInterval)
        try { L.removeChild(cont); cont.destroy && cont.destroy({ children: true }) } catch (_) {}
        resolve()
      }, 5200)
    })
  }

  // ── 3. Sun break ───────────────────────────────────────────────────────────
  function fireEventSunBreak () {
    const L = eventLayer()
    if (!L) return Promise.resolve()
    const W = vw(), H = vh()
    const flash = new PIXI.Graphics()
    flash.rect(0, 0, W, H).fill({ color: 0xfff59d, alpha: 0 })
    L.addChild(flash)
    return new Promise(resolve => {
      let t = 0
      const dur = 1800
      const peak = 0.20
      const start = (global.performance && global.performance.now) ? global.performance.now() : Date.now()
      const step = () => {
        const now = (global.performance && global.performance.now) ? global.performance.now() : Date.now()
        t = Math.min(1, (now - start) / dur)
        // Bell-curve alpha
        flash.alpha = peak * Math.sin(t * Math.PI)
        if (t >= 1) {
          try { L.removeChild(flash); flash.destroy && flash.destroy() } catch (_) {}
          resolve()
          return
        }
        requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    })
  }

  // ── 4. Tunnel ──────────────────────────────────────────────────────────────
  function fireEventTunnel () {
    const L = eventLayer()
    if (!L) return Promise.resolve()
    const W = vw(), H = vh()
    const dim = new PIXI.Graphics()
    dim.rect(0, 0, W, H).fill({ color: 0x111827, alpha: 0 })
    L.addChild(dim)
    // Tunnel rumble
    try { bgAudio() && bgAudio().ACCENTS.mountainWind() } catch (_) {}
    return new Promise(resolve => {
      const ramp = 600
      const hold = 2400
      const fadeOut = 800
      const start = (global.performance && global.performance.now) ? global.performance.now() : Date.now()
      const total = ramp + hold + fadeOut
      const peak = 0.78
      const step = () => {
        const now = (global.performance && global.performance.now) ? global.performance.now() : Date.now()
        const t = Math.min(1, (now - start) / total)
        const elapsed = (now - start)
        if (elapsed < ramp) dim.alpha = (elapsed / ramp) * peak
        else if (elapsed < ramp + hold) dim.alpha = peak
        else dim.alpha = peak * (1 - (elapsed - ramp - hold) / fadeOut)
        if (t >= 1) {
          try { L.removeChild(dim); dim.destroy && dim.destroy() } catch (_) {}
          // Exit accent: brighter flash for "exiting tunnel to bright city"
          fireEventSunBreak()
          resolve()
          return
        }
        requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    })
  }

  // ── 5. Fireworks ───────────────────────────────────────────────────────────
  function fireEventFireworks () {
    const L = eventLayer()
    if (!L) return Promise.resolve()
    const W = vw(), H = vh()
    const COLORS = [0xe53935, 0xfdd835, 0x42a5f5, 0x66bb6a, 0xab47bc, 0xfb8c00]
    return new Promise(resolve => {
      const bursts = 5
      let firedCount = 0
      const fire = () => {
        if (firedCount >= bursts) {
          setTimeout(resolve, 800)
          return
        }
        firedCount++
        const cx = W * (0.15 + Math.random() * 0.7)
        const cy = H * (0.15 + Math.random() * 0.20)
        const col = COLORS[firedCount % COLORS.length]
        // Use TrainVFX if present for a richer particle burst.
        try {
          if (global.TrainVFX && global.TrainVFX.particles) {
            global.TrainVFX.particles.spawn({
              type: 'star', parent: L, x: cx, y: cy,
              count: 18, speed: 5, ttl: 50, gravity: 0.05, opts: { color: col }
            })
            global.TrainVFX.particles.spawn({
              type: 'sparkle', parent: L, x: cx, y: cy,
              count: 10, speed: 4, ttl: 35, opts: { color: col }
            })
          } else {
            // Fallback: render a small radial burst inline
            const burst = new PIXI.Graphics()
            for (let i = 0; i < 12; i++) {
              const ang = (i / 12) * Math.PI * 2
              burst.circle(Math.cos(ang) * 14, Math.sin(ang) * 14, 2).fill({ color: col, alpha: 0.9 })
            }
            burst.x = cx; burst.y = cy
            L.addChild(burst)
            setTimeout(() => { try { L.removeChild(burst); burst.destroy && burst.destroy() } catch (_) {} }, 600)
          }
        } catch (_) {}
        // Pop tone
        try {
          if (typeof global.playTone === 'function') {
            global.playTone(660 + Math.random() * 400, 0.08, 'sine')
            setTimeout(() => global.playTone(330 + Math.random() * 200, 0.06, 'sine'), 100)
          }
        } catch (_) {}
        setTimeout(fire, 700 + Math.random() * 600)
      }
      fire()
    })
  }

  // ── Event registry + scheduler ─────────────────────────────────────────────
  const EVENTS = {
    passingTrain: {
      name: 'passingTrain',
      run: fireEventPassingTrain,
      allowedPhases: ['departure','urban-exit','suburban','countryside','landmark','approaching'],
      excludeAtNight: false,
      weight: 0.25,
    },
    crossing: {
      name: 'crossing',
      run: fireEventCrossing,
      allowedPhases: ['urban-exit','approaching','arrival'],
      excludeAtNight: false,
      weight: 0.20,
    },
    sunBreak: {
      name: 'sunBreak',
      run: fireEventSunBreak,
      allowedPhases: ['*'],
      excludeAtNight: true,
      weight: 0.18,
    },
    tunnel: {
      name: 'tunnel',
      run: fireEventTunnel,
      allowedPhases: ['suburban','countryside','landmark'],
      excludeAtNight: false,
      weight: 0.22,
    },
    fireworks: {
      name: 'fireworks',
      run: fireEventFireworks,
      allowedPhases: ['arrival','departure'],
      nightOnly: true,
      weight: 0.15,
    },
  }

  function pickEvent (state) {
    if (!state || !state.journey) return null
    const journeyName = state.journey.name
    const todName = (state.timeOfDay && state.timeOfDay.name) || 'siang'
    const isNight = /malam|petang|blue-hour|dini-hari/.test(todName)
    const pool = []
    for (const id in EVENTS) {
      const e = EVENTS[id]
      if (e.nightOnly && !isNight) continue
      if (e.excludeAtNight && isNight) continue
      if (!e.allowedPhases.includes('*') && !e.allowedPhases.includes(journeyName)) continue
      for (let i = 0; i < (e.weight || 0.1) * 10; i++) pool.push(e)
    }
    if (!pool.length) return null
    return pool[Math.floor(Math.random() * pool.length)]
  }

  function scheduleNext () {
    if (!State.running) return
    const delay = 18000 + Math.random() * 17000   // 18-35s between events
    State.scheduleTimer = setTimeout(() => {
      if (!State.running) return
      if (State.active) {
        // already running, push back
        scheduleNext()
        return
      }
      const state = TrainBG.state()
      const ev = pickEvent(state)
      if (!ev) { scheduleNext(); return }
      State.active = ev.name
      try {
        ev.run().then(() => { State.active = null; scheduleNext() }).catch(() => { State.active = null; scheduleNext() })
      } catch (_) {
        State.active = null
        scheduleNext()
      }
    }, delay)
  }

  function start () {
    if (State.running) return
    State.running = true
    scheduleNext()
  }
  function stop () {
    State.running = false
    if (State.scheduleTimer) { try { clearTimeout(State.scheduleTimer) } catch (_) {} State.scheduleTimer = null }
    State.active = null
  }

  // Pause on tab hidden
  try {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop()
      else if (TrainBG.state().location) start()
    })
  } catch (_) {}

  // Auto-start on first setContext that has a location.
  const origSet = global.TrainBG.setContext
  if (typeof origSet === 'function') {
    global.TrainBG.setContext = function (opts) {
      origSet.call(this, opts)
      try {
        const st = global.TrainBG.state()
        if (st && st.location && !State.running) start()
      } catch (_) {}
    }
  }

  global.BGEvents = {
    version: '54.66',
    start, stop,
    EVENTS,
    get _activeName () { return State.active },  // v54.67: for debug overlay
    fire (name) {
      const e = EVENTS[name]; if (!e) return
      State.active = name
      e.run().finally(() => { State.active = null })
    },
  }
  try { console.log('[bg-events] registered', Object.keys(EVENTS).length, 'event types') } catch (_) {}

})(typeof window !== 'undefined' ? window : globalThis)
