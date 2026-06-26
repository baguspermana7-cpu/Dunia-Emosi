/* =============================================================================
 * bg-audio.js — Audio ambience packs for train-bg-engine (v54.65)
 * =============================================================================
 * Spec source: documentation and standarization/DYNAMIC_BG_ENGINE_SPEC.md §13
 *
 * Provides per-location periodic-accent audio packs. Each location has a small
 * library of WebAudio tones (announcement chime / distant horn / vendor call
 * / gamelan / harbor horn / bird chirp) that fire on staggered timers so the
 * scene feels alive without continuous drone.
 *
 * Why periodic accents not a continuous drone:
 *  - Continuous synthesized drones tend to feel sterile/mechanical
 *  - WebAudio loops have audible seams unless you ship real audio files
 *  - Periodic accents are HOW real train stations sound (occasional horn,
 *    announcement, vendor call, bird) — closer to spec §13
 *
 * Uses existing window.playTone (exposed by train-shared.js v54.27 I6) so
 * any sfx-mute or master-gain rules already configured stay honored.
 *
 * Time-of-day modifier: night packs slow accent frequency 1.6× (quieter).
 * Rain modifier: adds periodic thunder rumble.
 * Reduce-motion gate: no audio change (sound has its own setting via
 * TrainShared.settings.sfx).
 *
 * Public API:
 *   BGAudio.activate(locationId)         — clear old timers + start new pack
 *   BGAudio.stop()                       — clear all timers
 *   BGAudio.setContextAudio(state)       — convenience that reads state.location
 *                                          / state.timeOfDay / state.weather
 *   BGAudio.PACKS                        — pack definitions (debug)
 * ========================================================================== */

(function (global) {
  'use strict'

  if (!global.TrainBG) {
    console.warn('[bg-audio] TrainBG not loaded; audio packs inactive')
    return
  }

  // ── tone helper (delegates to global.playTone if available) ────────────────
  function tone (freq, dur, type) {
    try {
      if (typeof global.playTone === 'function') {
        global.playTone(freq, dur || 0.12, type || 'sine')
        return
      }
      // Fallback: stand-alone WebAudio synth if playTone isn't loaded yet.
      const Ctx = global.AudioContext || global.webkitAudioContext
      if (!Ctx) return
      if (!_localCtx) _localCtx = new Ctx()
      const ctx = _localCtx
      const osc = ctx.createOscillator(), gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = type || 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (dur || 0.12))
      osc.start(); osc.stop(ctx.currentTime + (dur || 0.12))
    } catch (_) {}
  }
  let _localCtx = null

  function muted () {
    try {
      if (global.TrainShared && global.TrainShared.settings) {
        const s = global.TrainShared.settings.get()
        if (s && s.sfx === false) return true
      }
    } catch (_) {}
    return false
  }

  // ── Accent helpers (reused across packs) ───────────────────────────────────
  const ACCENTS = {
    distantHorn:  () => { tone(180, 0.40, 'sine'); setTimeout(() => tone(140, 0.30, 'sine'), 180) },
    klaxonShort:  () => { tone(440, 0.12, 'square'); setTimeout(() => tone(330, 0.18, 'square'), 90) },
    KAIChime:     () => { tone(523, 0.18, 'sine'); setTimeout(() => tone(659, 0.20, 'sine'), 200); setTimeout(() => tone(784, 0.22, 'sine'), 420) },
    KRLDoorChime: () => { tone(880, 0.08, 'sine'); setTimeout(() => tone(880, 0.08, 'sine'), 150); setTimeout(() => tone(880, 0.08, 'sine'), 300) },
    crossingBell: () => { tone(880, 0.06, 'triangle'); setTimeout(() => tone(880, 0.06, 'triangle'), 120); setTimeout(() => tone(880, 0.06, 'triangle'), 240) },
    vendorCall:   () => { tone(660, 0.15, 'triangle'); setTimeout(() => tone(880, 0.10, 'triangle'), 180); setTimeout(() => tone(659, 0.18, 'triangle'), 360) },
    birdsLow:     () => { tone(2200, 0.04, 'triangle'); setTimeout(() => tone(2600, 0.05, 'triangle'), 90); setTimeout(() => tone(2400, 0.03, 'triangle'), 220) },
    birdsHigh:    () => { tone(3000, 0.04, 'triangle'); setTimeout(() => tone(3400, 0.05, 'triangle'), 110); setTimeout(() => tone(3100, 0.04, 'triangle'), 240) },
    mountainWind: () => { tone(80, 0.50, 'sawtooth') },
    cityMurmur:   () => { tone(220, 0.30, 'sawtooth') },
    harborHorn:   () => { tone(95, 0.65, 'sawtooth'); setTimeout(() => tone(75, 0.45, 'sawtooth'), 600) },
    distantThunder:() => { tone(70, 0.40, 'sawtooth'); setTimeout(() => tone(50, 0.55, 'sawtooth'), 200); setTimeout(() => tone(40, 0.45, 'sawtooth'), 500) },
    gamelanLow:   () => { tone(440, 0.30, 'sine'); setTimeout(() => tone(523, 0.30, 'sine'), 280); setTimeout(() => tone(659, 0.30, 'sine'), 580) },
    andongBells:  () => { tone(1200, 0.05, 'sine'); setTimeout(() => tone(1400, 0.05, 'sine'), 80); setTimeout(() => tone(1200, 0.07, 'sine'), 200) },
    cricket:      () => { tone(4400, 0.03, 'triangle'); setTimeout(() => tone(4400, 0.03, 'triangle'), 120) },
  }

  // ── Per-location packs ────────────────────────────────────────────────────
  // accents[].every = base period ms; jitter = random ±ms; fire = accent fn.
  // dayOnly / nightOnly / rainOnly filter accents by context if set.
  const PACKS = {
    id_surabaya: {
      label: 'Surabaya — tropical urban',
      accents: [
        { every: 20000, jitter: 6000, fire: ACCENTS.distantHorn },
        { every: 32000, jitter: 8000, fire: ACCENTS.KAIChime },
        { every: 22000, jitter: 6000, fire: ACCENTS.vendorCall },
        { every: 25000, jitter: 6000, fire: ACCENTS.cityMurmur },
        { every: 28000, jitter: 6000, fire: ACCENTS.crossingBell },
        { every: 30000, jitter: 6000, fire: ACCENTS.birdsLow, dayOnly: true },
        { every: 26000, jitter: 5000, fire: ACCENTS.cricket, nightOnly: true },
        { every: 36000, jitter: 8000, fire: ACCENTS.distantThunder, rainOnly: true },
      ]
    },
    id_jakarta: {
      label: 'Jakarta — megacity dense',
      accents: [
        { every: 14000, jitter: 4000, fire: ACCENTS.klaxonShort },
        { every: 28000, jitter: 6000, fire: ACCENTS.KAIChime },
        { every: 30000, jitter: 6000, fire: ACCENTS.KRLDoorChime },
        { every: 18000, jitter: 5000, fire: ACCENTS.cityMurmur },
        { every: 24000, jitter: 5000, fire: ACCENTS.crossingBell },
        { every: 30000, jitter: 6000, fire: ACCENTS.distantHorn },
        { every: 32000, jitter: 7000, fire: ACCENTS.cricket, nightOnly: true },
        { every: 30000, jitter: 7000, fire: ACCENTS.distantThunder, rainOnly: true },
      ]
    },
    id_bandung: {
      label: 'Bandung — highland calm',
      accents: [
        { every: 18000, jitter: 5000, fire: ACCENTS.birdsHigh, dayOnly: true },
        { every: 22000, jitter: 6000, fire: ACCENTS.mountainWind },
        { every: 40000, jitter: 10000, fire: ACCENTS.distantHorn },
        { every: 45000, jitter: 10000, fire: ACCENTS.KAIChime },
        { every: 28000, jitter: 7000, fire: ACCENTS.birdsLow },
        { every: 28000, jitter: 6000, fire: ACCENTS.cricket, nightOnly: true },
        { every: 40000, jitter: 8000, fire: ACCENTS.distantThunder, rainOnly: true },
      ]
    },
    id_yogyakarta: {
      label: 'Yogyakarta — heritage cultural',
      accents: [
        { every: 25000, jitter: 7000, fire: ACCENTS.gamelanLow },
        { every: 18000, jitter: 5000, fire: ACCENTS.andongBells },
        { every: 30000, jitter: 7000, fire: ACCENTS.vendorCall },
        { every: 35000, jitter: 8000, fire: ACCENTS.KAIChime },
        { every: 24000, jitter: 6000, fire: ACCENTS.cityMurmur },
        { every: 22000, jitter: 5000, fire: ACCENTS.birdsLow, dayOnly: true },
        { every: 26000, jitter: 6000, fire: ACCENTS.cricket, nightOnly: true },
      ]
    },
    id_semarang: {
      label: 'Semarang — coastal heritage',
      accents: [
        { every: 28000, jitter: 8000, fire: ACCENTS.harborHorn },
        { every: 30000, jitter: 7000, fire: ACCENTS.distantHorn },
        { every: 34000, jitter: 8000, fire: ACCENTS.KAIChime },
        { every: 25000, jitter: 6000, fire: ACCENTS.cityMurmur },
        { every: 30000, jitter: 7000, fire: ACCENTS.vendorCall },
        { every: 28000, jitter: 6000, fire: ACCENTS.birdsLow, dayOnly: true },
        { every: 36000, jitter: 8000, fire: ACCENTS.distantThunder, rainOnly: true },
      ]
    },
  }

  // ── Active timer state ─────────────────────────────────────────────────────
  const State = {
    locationId: null,
    timers: [],
    nightPace: 1.6,    // multiplier on night → slower accent cadence
    rainPace:  0.85,   // multiplier on rain → faster accents (busier)
  }

  function clearAllTimers () {
    for (const id of State.timers) {
      try { clearTimeout(id) } catch (_) {}
    }
    State.timers.length = 0
  }

  // Schedule a single accent. Each timer self-reschedules with a jittered
  // delay so the cadence feels natural.
  function scheduleAccent (accent, paceMul) {
    if (!accent || typeof accent.fire !== 'function') return
    const base = accent.every || 30000
    const j = accent.jitter || 0
    const delay = Math.max(2000, (base + (Math.random() - 0.5) * 2 * j) * (paceMul || 1))
    const id = setTimeout(() => {
      try { if (!muted()) accent.fire() } catch (_) {}
      // Reschedule
      scheduleAccent(accent, paceMul)
    }, delay)
    State.timers.push(id)
  }

  // Activate a pack: clear prior timers, schedule new ones.
  // opts: { isNight?: boolean, isRain?: boolean }
  function activate (locationId, opts) {
    opts = opts || {}
    clearAllTimers()
    State.locationId = locationId
    const pack = PACKS[locationId]
    if (!pack) return false
    const paceMul = (opts.isNight ? State.nightPace : 1) * (opts.isRain ? State.rainPace : 1)
    pack.accents.forEach(a => {
      if (a.dayOnly && opts.isNight) return
      if (a.nightOnly && !opts.isNight) return
      if (a.rainOnly && !opts.isRain) return
      scheduleAccent(a, paceMul)
    })
    return true
  }

  function stop () {
    clearAllTimers()
    State.locationId = null
  }

  // Convenience: read engine context and activate the right pack.
  function setContextAudio (state) {
    if (!state || !state.location) return
    const todName = (state.timeOfDay && state.timeOfDay.name) || 'siang'
    const isNight = /malam|petang|blue-hour|dini-hari/.test(todName)
    const isRain = state.weather && /hujan|gerimis|badai/.test(state.weather.id || '')
    activate(state.location.locationId, { isNight, isRain })
  }

  // Pause / resume on tab blur (so accents don't queue while user is away)
  try {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clearAllTimers()
      else if (State.locationId) {
        // Re-activate using last engine state
        try { setContextAudio(global.TrainBG.state()) } catch (_) {}
      }
    })
  } catch (_) {}

  global.BGAudio = {
    version: '54.65',
    activate,
    stop,
    setContextAudio,
    PACKS,
    ACCENTS,
  }

  // Hook into TrainBG.setContext: auto-call setContextAudio after each
  // setContext invocation so audio always tracks the latest engine state.
  // This is non-invasive (wraps via monkey-patch + delegates).
  const origSetContext = global.TrainBG.setContext
  if (typeof origSetContext === 'function') {
    global.TrainBG.setContext = function (opts) {
      origSetContext.call(this, opts)
      try { setContextAudio(global.TrainBG.state()) } catch (_) {}
    }
  }

  try { console.log('[bg-audio] registered', Object.keys(PACKS).length, 'audio packs') } catch (_) {}

})(typeof window !== 'undefined' ? window : globalThis)
