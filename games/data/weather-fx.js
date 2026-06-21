/* =============================================================================
 * Dunia Emosi — Battle Weather FX
 * =============================================================================
 * Visual + audio + gameplay weather layer for Pokemon battle games.
 *
 *   const w = WeatherFX.pickRandom();           // pick at battle start
 *   WeatherFX.start({ container: stageEl, kind: w });
 *   const mult = WeatherFX.getMod(moveType);   // damage modifier
 *   WeatherFX.stop();
 *
 * Distribution (matches owner spec): clear 50% · rain 20% · snow 15% · windy 15%.
 *
 * Gameplay modifiers (kid-friendly, mild — never tilts the match):
 *   clear:  fire ×1.10        (sun-buoyed embers)
 *   rain:   water ×1.20, electric ×1.10, fire ×0.85
 *   snow:   ice ×1.20, fire ×0.90
 *   windy:  flying ×1.20, ground ×0.90
 *
 * No paid API. Visual is Canvas + CSS keyframes. Ambient audio is Web Audio
 * synthesis (filtered white noise + occasional plonks) — zero asset files.
 * Honors prefers-reduced-motion: particles capped + animation off.
 * ========================================================================== */

;(function (global) {
  'use strict'

  // ─── Distribution ────────────────────────────────────────────────────
  var DIST = [
    { kind: 'clear', weight: 50 },
    { kind: 'rain',  weight: 20 },
    { kind: 'snow',  weight: 15 },
    { kind: 'windy', weight: 15 }
  ]

  var TOTAL_W = DIST.reduce(function (s, d) { return s + d.weight }, 0)

  function pickRandom (rng) {
    var r = (typeof rng === 'function' ? rng() : Math.random()) * TOTAL_W
    for (var i = 0; i < DIST.length; i++) {
      r -= DIST[i].weight
      if (r <= 0) return DIST[i].kind
    }
    return 'clear'
  }

  // ─── Damage modifier table ───────────────────────────────────────────
  var MODS = {
    clear: { fire: 1.10 },
    rain:  { water: 1.20, electric: 1.10, fire: 0.85 },
    snow:  { ice: 1.20, fire: 0.90 },
    windy: { flying: 1.20, ground: 0.90 }
  }

  function getMod (moveType, kind) {
    var k = kind || state.currentKind
    if (!k) return 1.0
    var table = MODS[k]
    if (!table) return 1.0
    var t = String(moveType || '').toLowerCase()
    return table[t] || 1.0
  }

  // ─── Indonesian labels + tip ─────────────────────────────────────────
  var LABELS = {
    clear: { icon: '☀️', label: 'Cerah',  tip: 'Hari cerah! Tipe api sedikit lebih kuat.' },
    rain:  { icon: '🌧️', label: 'Hujan',  tip: 'Hujan! Tipe air dan listrik lebih kuat, api jadi lemah.' },
    snow:  { icon: '❄️', label: 'Salju',  tip: 'Bersalju! Tipe es lebih kuat, api jadi lemah.' },
    windy: { icon: '💨', label: 'Berangin',tip: 'Berangin! Tipe terbang lebih kuat, tanah jadi lemah.' }
  }
  function getLabel (kind) { return LABELS[kind || state.currentKind] || LABELS.clear }

  // ─── Reduced motion respect ──────────────────────────────────────────
  function reducedMotion () {
    return typeof window !== 'undefined' && window.matchMedia &&
           window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  // ─── State ────────────────────────────────────────────────────────────
  var state = {
    currentKind: null,
    container: null,
    canvas: null,
    ctx2d: null,
    rafId: 0,
    particles: [],
    audioCtx: null,
    audioGain: null,
    audioNodes: [],
    badgeEl: null
  }

  // ─── Visual layer ────────────────────────────────────────────────────

  function _ensureCanvas (container) {
    if (state.canvas && state.canvas.parentNode === container) return state.canvas
    if (state.canvas) {
      try { state.canvas.remove() } catch (e) {}
    }
    var cv = document.createElement('canvas')
    cv.className = 'weather-fx-canvas'
    cv.style.cssText = [
      'position:absolute',
      'inset:0',
      'left:0','top:0',
      'width:100%','height:100%',
      'pointer-events:none',
      'z-index:9',
      'opacity:0.85'
    ].join(';')
    container.appendChild(cv)
    var resize = function () {
      var r = container.getBoundingClientRect()
      cv.width = Math.max(1, Math.round(r.width))
      cv.height = Math.max(1, Math.round(r.height))
    }
    resize()
    if (typeof ResizeObserver !== 'undefined') {
      try { new ResizeObserver(resize).observe(container) } catch (e) {}
    }
    state.canvas = cv
    state.ctx2d = cv.getContext('2d')
    return cv
  }

  function _spawnParticles (kind, w, h) {
    var arr = []
    var n
    if (kind === 'rain')  n = reducedMotion() ? 30 : 80
    else if (kind === 'snow')  n = reducedMotion() ? 20 : 45
    else if (kind === 'windy') n = reducedMotion() ? 12 : 30
    else return arr   // clear → no particles
    for (var i = 0; i < n; i++) {
      arr.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vy: (kind === 'rain') ? 6 + Math.random() * 6
           : (kind === 'snow') ? 0.8 + Math.random() * 1.4
           : 0,
        vx: (kind === 'snow') ? Math.sin(i) * 0.3
           : (kind === 'windy') ? 7 + Math.random() * 6
           : (kind === 'rain') ? 1.5
           : 0,
        size: (kind === 'rain') ? 8 + Math.random() * 6
            : (kind === 'snow') ? 2 + Math.random() * 3
            : (kind === 'windy') ? 6 + Math.random() * 6
            : 2,
        life: 1
      })
    }
    return arr
  }

  function _renderFrame () {
    if (!state.ctx2d || !state.canvas) return
    var ctx = state.ctx2d
    var W = state.canvas.width
    var H = state.canvas.height
    ctx.clearRect(0, 0, W, H)
    var kind = state.currentKind

    // Background tint per weather (subtle)
    if (kind === 'rain') {
      var g = ctx.createLinearGradient(0, 0, 0, H)
      g.addColorStop(0, 'rgba(186,230,253,0.25)')
      g.addColorStop(1, 'rgba(126,176,234,0.12)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
    } else if (kind === 'snow') {
      var g2 = ctx.createLinearGradient(0, 0, 0, H)
      g2.addColorStop(0, 'rgba(241,245,249,0.30)')
      g2.addColorStop(1, 'rgba(199,210,254,0.10)')
      ctx.fillStyle = g2
      ctx.fillRect(0, 0, W, H)
    } else if (kind === 'windy') {
      var g3 = ctx.createLinearGradient(0, 0, W, 0)
      g3.addColorStop(0, 'rgba(254,243,199,0.05)')
      g3.addColorStop(1, 'rgba(254,215,170,0.12)')
      ctx.fillStyle = g3
      ctx.fillRect(0, 0, W, H)
    } else if (kind === 'clear') {
      var r = ctx.createRadialGradient(W * 0.85, H * 0.15, 20, W * 0.85, H * 0.15, Math.max(W, H) * 0.7)
      r.addColorStop(0, 'rgba(253,224,71,0.30)')
      r.addColorStop(1, 'rgba(253,224,71,0)')
      ctx.fillStyle = r
      ctx.fillRect(0, 0, W, H)
    }

    // Particles
    for (var i = 0; i < state.particles.length; i++) {
      var p = state.particles[i]
      p.x += p.vx
      p.y += p.vy
      if (p.y > H) { p.y = -10; p.x = Math.random() * W }
      if (p.x > W) { p.x = -10; p.y = Math.random() * H }
      if (p.x < -10) { p.x = W + 10 }
      if (kind === 'rain') {
        ctx.strokeStyle = 'rgba(59,130,246,0.55)'
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(p.x - p.vx * 1.5, p.y - p.vy * 1.5)
        ctx.stroke()
      } else if (kind === 'snow') {
        ctx.fillStyle = 'rgba(255,255,255,0.92)'
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      } else if (kind === 'windy') {
        ctx.strokeStyle = 'rgba(254,215,170,0.6)'
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(p.x - p.size, p.y)
        ctx.stroke()
      }
    }

    state.rafId = requestAnimationFrame(_renderFrame)
  }

  // ─── Ambient audio (Web Audio synth) ─────────────────────────────────

  function _ensureAudio () {
    if (state.audioCtx) return state.audioCtx
    var ACtx = window.AudioContext || window.webkitAudioContext
    if (!ACtx) return null
    state.audioCtx = new ACtx()
    state.audioGain = state.audioCtx.createGain()
    state.audioGain.gain.value = 0
    state.audioGain.connect(state.audioCtx.destination)
    return state.audioCtx
  }

  function _stopAudio () {
    if (!state.audioCtx) return
    try { state.audioGain.gain.cancelScheduledValues(state.audioCtx.currentTime) } catch (e) {}
    try { state.audioGain.gain.linearRampToValueAtTime(0, state.audioCtx.currentTime + 0.3) } catch (e) {}
    for (var i = 0; i < state.audioNodes.length; i++) {
      try { state.audioNodes[i].stop() } catch (e) {}
      try { state.audioNodes[i].disconnect() } catch (e) {}
    }
    state.audioNodes = []
  }

  function _startAudio (kind) {
    var ctx = _ensureAudio()
    if (!ctx) return
    _stopAudio()
    if (kind === 'clear') return            // silent

    // White-noise generator via ScriptProcessor (legacy but well-supported)
    // and BiquadFilter for color.
    var bufferSize = 4096
    var noise
    try {
      noise = ctx.createScriptProcessor(bufferSize, 1, 1)
    } catch (e) {
      // Fallback: AudioBufferSource with random buffer
      var buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
      var d = buf.getChannelData(0)
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
      noise = ctx.createBufferSource()
      noise.buffer = buf
      noise.loop = true
    }
    if (noise.onaudioprocess !== undefined) {
      noise.onaudioprocess = function (e) {
        var out = e.outputBuffer.getChannelData(0)
        for (var i = 0; i < out.length; i++) out[i] = Math.random() * 2 - 1
      }
    }

    var filter = ctx.createBiquadFilter()
    if (kind === 'rain') {
      filter.type = 'lowpass'
      filter.frequency.value = 1400
      filter.Q.value = 0.6
    } else if (kind === 'snow') {
      filter.type = 'lowpass'
      filter.frequency.value = 600
      filter.Q.value = 0.4
    } else if (kind === 'windy') {
      filter.type = 'bandpass'
      filter.frequency.value = 800
      filter.Q.value = 0.5
    }

    noise.connect(filter)
    filter.connect(state.audioGain)
    if (noise.start) try { noise.start() } catch (e) {}

    state.audioGain.gain.cancelScheduledValues(ctx.currentTime)
    state.audioGain.gain.setValueAtTime(0, ctx.currentTime)
    var targetGain = (kind === 'rain') ? 0.10
                   : (kind === 'snow') ? 0.06
                   : (kind === 'windy') ? 0.08
                   : 0
    state.audioGain.gain.linearRampToValueAtTime(targetGain, ctx.currentTime + 0.8)
    state.audioNodes.push(noise, filter)
  }

  // ─── Badge UI helper (optional — caller may render its own) ──────────

  function _spawnBadge (container, kind) {
    if (state.badgeEl) { try { state.badgeEl.remove() } catch (e) {} state.badgeEl = null }
    var lbl = getLabel(kind)
    var b = document.createElement('div')
    b.className = 'weather-fx-badge'
    b.style.cssText = [
      'position:absolute',
      'top:8px','right:8px',
      'background:rgba(255,255,255,0.92)',
      'border:2px solid rgba(109,40,217,0.4)',
      'border-radius:999px',
      'padding:4px 12px',
      'font-family:system-ui,sans-serif',
      'font-size:13px','font-weight:700',
      'color:#1E1B4B',
      'box-shadow:0 4px 14px rgba(0,0,0,0.18)',
      'z-index:10',
      'animation:weatherBadgePulse 2400ms ease-in-out infinite'
    ].join(';')
    b.textContent = lbl.icon + ' ' + lbl.label
    b.title = lbl.tip
    container.appendChild(b)
    state.badgeEl = b
    if (!document.querySelector('style[data-weather-fx]')) {
      var st = document.createElement('style')
      st.setAttribute('data-weather-fx', 'v1')
      st.textContent = '@keyframes weatherBadgePulse{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}'
      document.head.appendChild(st)
    }
  }

  // ─── Public API ──────────────────────────────────────────────────────

  function start (opts) {
    opts = opts || {}
    var container = opts.container || document.body
    var kind = opts.kind || pickRandom()
    state.currentKind = kind
    state.container = container
    // Ensure container is positioned for absolute children
    var cs = window.getComputedStyle(container)
    if (cs.position === 'static') {
      container.style.position = 'relative'
    }
    var cv = _ensureCanvas(container)
    state.particles = _spawnParticles(kind, cv.width, cv.height)
    if (state.rafId) cancelAnimationFrame(state.rafId)
    state.rafId = requestAnimationFrame(_renderFrame)
    if (opts.audio !== false) _startAudio(kind)
    if (opts.badge !== false) _spawnBadge(container, kind)
    return kind
  }

  function stop () {
    if (state.rafId) { cancelAnimationFrame(state.rafId); state.rafId = 0 }
    if (state.canvas) { try { state.canvas.remove() } catch (e) {} state.canvas = null; state.ctx2d = null }
    if (state.badgeEl) { try { state.badgeEl.remove() } catch (e) {} state.badgeEl = null }
    _stopAudio()
    state.particles = []
    state.currentKind = null
  }

  function getCurrent () { return state.currentKind }

  // ─── Export ──────────────────────────────────────────────────────────
  global.WeatherFX = {
    pickRandom: pickRandom,
    getMod: getMod,
    getLabel: getLabel,
    start: start,
    stop: stop,
    getCurrent: getCurrent,
    DIST: DIST,
    MODS: MODS,
    LABELS: LABELS
  }
})(typeof window !== 'undefined' ? window : globalThis)
