/* =============================================================================
 * Dunia Emosi — SFX Engine + Adaptive Music
 * =============================================================================
 * Embeds the Pokemon licensed sound database at /Sounds/pokemon sounds/ and
 * exposes a small kid-safe API for all battle games (G10 math battle, G13,
 * G13B Quick Fire, G13C Gym, G23 TR Meowth).
 *
 *   await SFXEngine.init({ basePath: '/Dunia-Emosi/Sounds/pokemon%20sounds/' })
 *   SFXEngine.playPokemonAttack(25)                     // Pikachu signature
 *   SFXEngine.playMoveByType('fire')                    // random fire move
 *   SFXEngine.playMoveByType('fire', 'flamethrower')    // specific
 *   SFXEngine.playHitFeedback({                         // typed hit + cry
 *     attackerId: 25,
 *     moveType: 'electric',
 *     effectiveness: 'super' | 'normal' | 'weak' | 'immune'
 *   })
 *   SFXEngine.setMute(true) / setVolume(0..1)
 *   AdaptiveMusic.setState('idle' | 'battle' | 'lowHp' | 'win')
 *
 * Design rules (matches kid-safe Block E standard in proposals):
 *   - Master gain capped at 0.6 (≈ -6 dBFS), never clips.
 *   - No identical SFX may overlap > 2 voices (concurrent cap).
 *   - LITE mode (skips on rapid fire ≥ 5 hits / 1.2 s).
 *   - Respects `prefers-reduced-motion` (skips music crossfade → hard cut).
 *   - Asset gated by first user gesture (iOS / Chrome autoplay policy).
 *   - All assets local-only. No network calls beyond the Sounds/ folder.
 * ========================================================================== */

;(function (global) {
  'use strict'

  // ─── Internals ───────────────────────────────────────────────────────
  var state = {
    ready: false,
    initing: null,
    muted: false,
    volume: 0.6,
    // v54.36 audit fix: default basePath now detects deployment root (Vercel
    // serves at `/` while GitHub Pages serves at `/Dunia-Emosi/`). Previously
    // hardcoded /Dunia-Emosi/ → silently 404'd on Vercel → SFX engine fell
    // into "fallback mode" and ALL Pokemon SFX were missing.
    basePath: (function () {
      try {
        var base = (location.pathname.indexOf('/Dunia-Emosi/') === 0) ? '/Dunia-Emosi/' : '/'
        return base + 'Sounds/pokemon%20sounds/'
      } catch (e) { return '/Sounds/pokemon%20sounds/' }
    })(),
    // manifests
    speciesByName: {},   // 'pikachu' → manifest entry
    speciesById: {},     // 25 → manifest entry
    movesByType: {},     // 'fire' → array of move entries
    moveBySlug: {},      // 'flamethrower' → move entry
    // playback bookkeeping
    voicesPerSrc: {},    // src → count of active <audio>
    audioCache: {},      // src → array of pooled Audio elements
    recentHits: [],      // rapid-fire detector timestamps
    ctx: null,           // shared Web Audio context (init lazily after gesture)
    masterGain: null,
    unlocked: false      // true after first gesture unlocked audio
  }

  var CONCURRENT_CAP = 2
  var RAPID_WINDOW_MS = 1200
  var RAPID_THRESHOLD = 5
  var DEFAULT_VOL = {
    pokemonAttack: 0.85,
    moveByType:    0.78,
    hitNormal:     0.70,
    hitSuper:      0.92,
    hitWeak:       0.55,
    hitImmune:     0.45,
    music:         0.55
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  function reducedMotion () {
    return typeof window !== 'undefined' &&
           window.matchMedia &&
           window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  function nowMs () {
    return (typeof performance !== 'undefined' && performance.now)
      ? performance.now()
      : Date.now()
  }

  function isRapidFire () {
    var t = nowMs()
    while (state.recentHits.length && t - state.recentHits[0] > RAPID_WINDOW_MS) {
      state.recentHits.shift()
    }
    state.recentHits.push(t)
    if (state.recentHits.length > 32) state.recentHits.shift()
    return state.recentHits.length >= RAPID_THRESHOLD
  }

  function getCachedAudio (src) {
    var pool = state.audioCache[src]
    if (!pool) { pool = state.audioCache[src] = []; }
    for (var i = 0; i < pool.length; i++) {
      var a = pool[i]
      if (a.paused || a.ended) {
        try { a.currentTime = 0 } catch (e) {}
        return a
      }
    }
    if (pool.length >= 4) return null   // hard cap pool size
    var audio = new Audio(src)
    audio.preload = 'auto'
    pool.push(audio)
    return audio
  }

  function playAudio (src, volume) {
    if (state.muted || !src) return null
    if ((state.voicesPerSrc[src] || 0) >= CONCURRENT_CAP) return null

    var audio = getCachedAudio(src)
    if (!audio) return null

    audio.volume = Math.max(0, Math.min(1, (volume == null ? 1 : volume) * state.volume))
    state.voicesPerSrc[src] = (state.voicesPerSrc[src] || 0) + 1

    var release = function () {
      state.voicesPerSrc[src] = Math.max(0, (state.voicesPerSrc[src] || 1) - 1)
      audio.removeEventListener('ended', release)
      audio.removeEventListener('error', release)
    }
    audio.addEventListener('ended', release, { once: true })
    audio.addEventListener('error', release, { once: true })

    var p = audio.play()
    if (p && typeof p.catch === 'function') {
      p.catch(function () { release() })
    }
    return audio
  }

  function pickRandom (arr) {
    if (!arr || !arr.length) return null
    return arr[Math.floor(Math.random() * arr.length)]
  }

  // ─── Public init ─────────────────────────────────────────────────────
  function init (opts) {
    if (state.ready) return Promise.resolve(state)
    if (state.initing) return state.initing
    opts = opts || {}
    if (opts.basePath) state.basePath = opts.basePath
    var bp = state.basePath
    if (bp.charAt(bp.length - 1) !== '/') bp += '/'
    state.basePath = bp

    state.initing = Promise.all([
      fetch(bp + 'pokemon_attack_sfx_manifest.json').then(function (r) { return r.json() }),
      fetch(bp + 'attack_move_sfx_manifest.json').then(function (r) { return r.json() })
    ]).then(function (results) {
      var species = results[0] || []
      var moves   = results[1] || []
      for (var i = 0; i < species.length; i++) {
        var s = species[i]
        if (!s || !s.id) continue
        state.speciesById[s.id] = s
        if (s.slug) state.speciesByName[s.slug.toLowerCase()] = s
        if (s.name) state.speciesByName[s.name.toLowerCase()] = s
      }
      for (var j = 0; j < moves.length; j++) {
        var m = moves[j]
        if (!m) continue
        var t = (m.inferred_type || m.type || 'normal').toLowerCase()
        if (!state.movesByType[t]) state.movesByType[t] = []
        state.movesByType[t].push(m)
        if (m.move_slug) state.moveBySlug[m.move_slug.toLowerCase()] = m
      }
      state.ready = true
      attachGestureUnlock()
      return state
    }).catch(function (err) {
      console.warn('[SFXEngine] manifest load failed; engine in fallback mode', err)
      state.ready = true
      attachGestureUnlock()
      return state
    })
    return state.initing
  }

  function attachGestureUnlock () {
    if (state.unlocked || typeof document === 'undefined') return
    var unlock = function () {
      state.unlocked = true
      // Touch any cached audio to satisfy iOS autoplay policy
      try {
        var silent = new Audio()
        silent.muted = true
        silent.play && silent.play().catch(function () {})
      } catch (e) {}
      document.removeEventListener('pointerdown', unlock)
      document.removeEventListener('keydown', unlock)
    }
    document.addEventListener('pointerdown', unlock, { once: true, passive: true })
    document.addEventListener('keydown',     unlock, { once: true, passive: true })
  }

  // ─── Public play API ─────────────────────────────────────────────────

  function playPokemonAttack (pokemonId, opts) {
    if (!state.ready) return null
    var entry = state.speciesById[pokemonId]
    if (!entry || !entry.sfx_file) return null
    opts = opts || {}
    var src = state.basePath + entry.sfx_file
    return playAudio(src, opts.volume == null ? DEFAULT_VOL.pokemonAttack : opts.volume)
  }

  function playMoveByType (type, slug, opts) {
    if (!state.ready || !type) return null
    type = String(type).toLowerCase()
    opts = opts || {}
    var entry = null
    if (slug) {
      entry = state.moveBySlug[String(slug).toLowerCase()]
    }
    if (!entry) {
      entry = pickRandom(state.movesByType[type])
    }
    if (!entry || !entry.compressed_file) return null
    var src = state.basePath + entry.compressed_file
    return playAudio(src, opts.volume == null ? DEFAULT_VOL.moveByType : opts.volume)
  }

  // ─── Layered hit feedback — aligned with attacker species + move type ──
  // effectiveness: 'super' | 'normal' | 'weak' | 'immune'
  function playHitFeedback (opts) {
    if (!state.ready) return
    opts = opts || {}
    var atkId   = opts.attackerId
    var moveType = (opts.moveType || '').toLowerCase()
    var moveSlug = opts.moveSlug ? String(opts.moveSlug).toLowerCase() : null
    var eff      = opts.effectiveness || 'normal'

    // Rapid fire → drop to LITE mode
    var lite = isRapidFire()

    // Layer 1: attacker signature
    if (!lite && atkId) {
      var atkVol = eff === 'super' ? 0.95
                 : eff === 'weak'  ? 0.55
                 : eff === 'immune'? 0.30
                 :                   DEFAULT_VOL.pokemonAttack
      playPokemonAttack(atkId, { volume: atkVol })
    }

    // Layer 2: move-type SFX (whoosh / boom / zap / splash)
    if (moveType) {
      var moveVol = eff === 'super' ? DEFAULT_VOL.hitSuper
                  : eff === 'weak'  ? DEFAULT_VOL.hitWeak
                  : eff === 'immune'? DEFAULT_VOL.hitImmune
                  :                   DEFAULT_VOL.hitNormal
      var delay = lite ? 0 : 80   // tight layered timing
      setTimeout(function () { playMoveByType(moveType, moveSlug, { volume: moveVol }) }, delay)
    }
  }

  // ─── Volume / mute ───────────────────────────────────────────────────
  function setMute (m) { state.muted = !!m }
  function getMute () { return state.muted }
  function setVolume (v) { state.volume = Math.max(0, Math.min(1, +v || 0)) }
  function getVolume () { return state.volume }

  // ─── Diagnostics ─────────────────────────────────────────────────────
  function status () {
    return {
      ready: state.ready,
      muted: state.muted,
      volume: state.volume,
      basePath: state.basePath,
      speciesCount: Object.keys(state.speciesById).length,
      moveTypeCount: Object.keys(state.movesByType).length,
      moveSlugCount: Object.keys(state.moveBySlug).length,
      activeVoices: Object.keys(state.voicesPerSrc).reduce(function (n, k) {
        return n + (state.voicesPerSrc[k] || 0)
      }, 0)
    }
  }

  // ─── Web Audio adaptive music (4 states, 400 ms crossfade) ───────────
  var Music = {
    state: 'idle',
    layers: {},        // name → { audio, gain }
    ctx: null,
    masterGain: null,
    crossfadeMs: 400,
    targets: (function () {
      // v54.38: dynamic deployment-root detection — same pattern as basePath above.
      var base = '/'
      try { if (location.pathname.indexOf('/Dunia-Emosi/') === 0) base = '/Dunia-Emosi/' } catch(_){}
      return {
        idle:   null,
        battle: base + 'Sounds/battle-bgm.mp3',
        lowHp:  base + 'Sounds/battle-bgm.mp3',
        win:    null
      }
    })(),
    init: function () {
      if (this.ctx) return
      var ACtx = window.AudioContext || window.webkitAudioContext
      if (!ACtx) return
      this.ctx = new ACtx()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = DEFAULT_VOL.music * state.volume
      this.masterGain.connect(this.ctx.destination)
    },
    setVolume: function (v) {
      if (!this.masterGain) return
      this.masterGain.gain.setValueAtTime(
        Math.max(0, Math.min(1, +v || 0)) * state.volume,
        this.ctx.currentTime
      )
    },
    _ensureLayer: function (name, src) {
      var L = this.layers[name]
      if (L) return L
      if (!src || !this.ctx) return null
      var audio = new Audio(src)
      audio.loop = true
      audio.crossOrigin = 'anonymous'
      var srcNode
      try { srcNode = this.ctx.createMediaElementSource(audio) }
      catch (e) { return null }
      var gain = this.ctx.createGain()
      gain.gain.value = 0
      srcNode.connect(gain)
      // Low-pass filter for lowHp state — muffled feel
      var filter = null
      if (name === 'lowHp') {
        filter = this.ctx.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.value = 600
        gain.connect(filter)
        filter.connect(this.masterGain)
      } else {
        gain.connect(this.masterGain)
      }
      L = this.layers[name] = { audio: audio, gain: gain, filter: filter }
      return L
    },
    setState: function (next) {
      if (next === this.state) return
      this.init()
      if (!this.ctx) return
      // Unlock context on first state change (post-gesture)
      if (this.ctx.state === 'suspended' &&
          state.unlocked && this.ctx.resume) {
        this.ctx.resume()
      }

      var crossfade = reducedMotion() ? 0 : this.crossfadeMs / 1000
      var nowT = this.ctx.currentTime

      var prevName = this.state
      var prev = this.layers[prevName]
      if (prev) {
        prev.gain.gain.cancelScheduledValues(nowT)
        prev.gain.gain.setValueAtTime(prev.gain.gain.value, nowT)
        prev.gain.gain.linearRampToValueAtTime(0, nowT + crossfade)
        if (crossfade > 0) {
          setTimeout(function () { try { prev.audio.pause() } catch (e) {} }, crossfade * 1000 + 80)
        } else {
          try { prev.audio.pause() } catch (e) {}
        }
      }

      var src = this.targets[next]
      if (src) {
        var L = this._ensureLayer(next, src)
        if (L) {
          try {
            L.audio.currentTime = (prevName !== next) ? L.audio.currentTime : 0
            L.audio.play && L.audio.play().catch(function () {})
          } catch (e) {}
          L.gain.gain.cancelScheduledValues(nowT)
          L.gain.gain.setValueAtTime(0, nowT)
          L.gain.gain.linearRampToValueAtTime(1, nowT + crossfade)
        }
      }

      this.state = next
    },
    stop: function () {
      var names = Object.keys(this.layers)
      for (var i = 0; i < names.length; i++) {
        var L = this.layers[names[i]]
        try { L.audio.pause(); L.gain.gain.value = 0 } catch (e) {}
      }
      this.state = 'idle'
    }
  }

  // ─── Generic UI-cue subsystem (shared, owner mandate 2026-07-12) ──────
  // Real cues live at /assets/sfx/*.mp3. Adopted by the math game + the
  // shared QuizEngine answer handler. SCOPE: question/answer feedback +
  // general UI ONLY — Pokémon BATTLE SFX (cries + move sounds) stay on the
  // playPokemonAttack / playMoveByType / playHitFeedback API above. If a
  // file 404s, a kid-safe WebAudio synth tone is used instead so no game
  // is left silent. Honours setMute / setVolume. Works without init().
  var CUE_BASE = (function () {
    try {
      var base = (location.pathname.indexOf('/Dunia-Emosi/') === 0) ? '/Dunia-Emosi/' : '/'
      return base + 'assets/sfx/'
    } catch (e) { return '/assets/sfx/' }
  })()
  var CUE_FILES = {
    click: 'click.mp3', coin: 'coin.mp3', levelup: 'levelup.mp3',
    star: 'star.mp3', correct: 'correct.mp3', wrong: 'wrong.mp3',
    // general gameplay cues (train games: coin pickup, collision, whoosh)
    crash: 'crash.mp3', swoosh: 'swoosh.mp3', whoosh: 'whoosh.mp3'
  }
  var CUE_VOL = {
    click: 0.5, coin: 0.7, levelup: 0.85, star: 0.72, correct: 0.85, wrong: 0.8,
    crash: 0.7, swoosh: 0.55, whoosh: 0.55
  }
  var _cueFailed = {}      // name → true once the file 404s → synth thereafter
  var _cueCtx = null

  function _cctx () {
    if (_cueCtx) return _cueCtx
    try { _cueCtx = new (window.AudioContext || window.webkitAudioContext)() }
    catch (e) { _cueCtx = null }
    return _cueCtx
  }
  function _beep (freq, dur, type, vol) {
    var c = _cctx(); if (!c) return
    try {
      var o = c.createOscillator(), g = c.createGain()
      o.type = type || 'sine'; o.frequency.value = freq
      g.gain.setValueAtTime(0, c.currentTime)
      g.gain.linearRampToValueAtTime((vol == null ? 0.15 : vol) * state.volume, c.currentTime + 0.01)
      g.gain.linearRampToValueAtTime(0, c.currentTime + (dur || 0.15))
      o.connect(g); g.connect(c.destination)
      o.start(); o.stop(c.currentTime + (dur || 0.15) + 0.02)
    } catch (e) {}
  }
  function _cueSynth (name) {
    if (state.muted) return
    if (name === 'correct') {
      _beep(523, 0.1, 'triangle', 0.16)
      setTimeout(function () { _beep(659, 0.1, 'triangle', 0.16) }, 80)
      setTimeout(function () { _beep(784, 0.16, 'triangle', 0.18) }, 160)
    } else if (name === 'wrong') {
      _beep(311, 0.14, 'sawtooth', 0.12)
      setTimeout(function () { _beep(196, 0.22, 'sawtooth', 0.10) }, 100)
    } else if (name === 'coin') {
      _beep(988, 0.06, 'square', 0.12)
      setTimeout(function () { _beep(1319, 0.10, 'square', 0.12) }, 55)
    } else if (name === 'levelup') {
      [523, 659, 784, 1047].forEach(function (f, i) {
        setTimeout(function () { _beep(f, 0.16, 'triangle', 0.16) }, i * 90)
      })
    } else if (name === 'star') {
      _beep(1047, 0.12, 'triangle', 0.16)
    } else { // click / unknown
      _beep(660, 0.05, 'square', 0.10)
    }
  }

  function cue (name, opts) {
    if (state.muted) return null
    opts = opts || {}
    attachGestureUnlock()
    var file = CUE_FILES[name]
    if (!file || _cueFailed[name]) { _cueSynth(name); return null }
    var src = CUE_BASE + file
    var vol = (opts.volume == null) ? (CUE_VOL[name] || 0.7) : opts.volume
    var a = playAudio(src, vol)
    if (a) {
      a.addEventListener('error', function () {
        _cueFailed[name] = true; _cueSynth(name)
      }, { once: true })
    }
    return a
  }

  // ─── Export ──────────────────────────────────────────────────────────
  global.SFXEngine = {
    init: init,
    playPokemonAttack: playPokemonAttack,
    playMoveByType: playMoveByType,
    playHitFeedback: playHitFeedback,
    // shared UI cues (question/answer + general UI)
    cue: cue,
    click:   function (o) { return cue('click', o) },
    coin:    function (o) { return cue('coin', o) },
    levelup: function (o) { return cue('levelup', o) },
    star:    function (o) { return cue('star', o) },
    correct: function (o) { return cue('correct', o) },
    wrong:   function (o) { return cue('wrong', o) },
    crash:   function (o) { return cue('crash', o) },
    setMute: setMute,
    getMute: getMute,
    setVolume: setVolume,
    getVolume: getVolume,
    status: status,
    // expose internals for debugging only
    _state: state
  }
  global.AdaptiveMusic = Music
})(typeof window !== 'undefined' ? window : globalThis)
