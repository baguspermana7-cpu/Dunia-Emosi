/* =============================================================================
 * train-bg-engine.js — Dynamic Train Racing Background Engine v54.60
 * =============================================================================
 * Spec source: documentation and standarization/DYNAMIC_BG_ENGINE_SPEC.md
 *
 * Goal: Replace flat per-game backgrounds with a layered, location-aware,
 * time + weather + journey-phase aware engine. G14 and G15 are the primary
 * consumers. Owner: "saya ingin Anda mengembangkan Dynamic Train Racing
 * Background Engine yang mampu menghasilkan suasana perjalanan kereta yang
 * dinamis, random, detail, presisi".
 *
 * Foundation (v54.60) ships:
 *
 *   TrainBG.init({ app, stage, viewport })        — bootstrap + create layers
 *   TrainBG.layers                                 — 12 named Pixi Containers
 *   TrainBG.TimeOfDay                              — 8-phase color palette
 *   TrainBG.Weather                                — 12-variant registry
 *   TrainBG.Journey                                — 7-phase FSM
 *   TrainBG.LocationTheme                          — registry + register/get
 *   TrainBG.NPCSystem                              — archetype registry (stub)
 *   TrainBG.AudioSystem                            — ambience pack registry (stub)
 *   TrainBG.tick(dt, journeyProgress, weather, …)  — per-frame update
 *   TrainBG.weightedRandom(weights)                — utility
 *   TrainBG.setQuality(low|med|high)               — performance scaling
 *
 * City + NPC + Audio content land in subsequent tranches (v54.61+). This file
 * is the EMPTY engine — registries are populated by configs that import it.
 *
 * Performance budget per frame:
 *   - sky / lighting / weather layers: full per-frame
 *   - far / mid: scroll-only per-frame (no respawn unless triggered)
 *   - near / npc / event: visibility-culled, only active layers tick
 *   - High quality cap: 300 active sprites total
 *   - Medium quality cap: 180 active sprites total
 *   - Low quality cap:    90  active sprites total
 *
 * Reduce-motion compliance: layers tagged `motion:true` are skipped when
 * reduce-motion is on (inherits from train-vfx.js v54.51 gate via
 * window.TrainVFX.reducedMotion if available).
 * ========================================================================== */

(function (global) {
  'use strict'

  // ── reduce-motion gate (inherited from TrainVFX if loaded) ────────────────
  function reducedMotion () {
    try {
      if (global.TrainVFX && typeof global.TrainVFX.reducedMotion === 'function') {
        return global.TrainVFX.reducedMotion()
      }
      if (localStorage.getItem('train-bg-reduced-motion') === '1') return true
      if (global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches) return true
    } catch (_) {}
    return false
  }

  // ── 8-phase TimeOfDay palette (extended from TrainShared.timeOfDay 6-phase) ─
  // Adds golden-hour + blue-hour to the existing subuh/pagi/siang/sore/petang/malam.
  // Phases are ordered chronologically so forProgress(t) lerps in real time.
  // v54.64 Thomas & Friends: All Engines Go cheerful palette pass.
  // Owner: "warna2nya buat ceria… colour pallet seperti di thomas all engine
  // go… ceria sekali". Sky tops vivid azure/cream/coral. Cloud tints near-white.
  // Sun is bright sun-yellow (#FFD54F-class), not orange-red. Night still
  // playable (not pure black) — uses deep cobalt with bright stars.
  const TimeOfDay = {
    PHASES: [
      { name:'dini-hari',   skyTop:0x1a237e, skyBot:0x3949ab, cloudTint:0x9fa8da, sunY:-0.50, sunColor:0xb39ddb, stars:true,  ambient:0x7986cb },
      { name:'subuh',       skyTop:0x3949ab, skyBot:0xff8a65, cloudTint:0xffccbc, sunY:-0.20, sunColor:0xffab40, stars:true,  ambient:0xffccbc },
      { name:'pagi',        skyTop:0x4fc3f7, skyBot:0xfff59d, cloudTint:0xffffff, sunY: 0.20, sunColor:0xffd54f, stars:false, ambient:0xfff8e1 },
      { name:'golden-hour', skyTop:0xffb74d, skyBot:0xfff176, cloudTint:0xfff8e1, sunY: 0.30, sunColor:0xffc107, stars:false, ambient:0xfff3e0 },
      { name:'siang',       skyTop:0x29b6f6, skyBot:0xe1f5fe, cloudTint:0xffffff, sunY: 0.55, sunColor:0xffeb3b, stars:false, ambient:0xffffff },
      { name:'sore',        skyTop:0xff7043, skyBot:0xffcc80, cloudTint:0xffe0b2, sunY: 0.78, sunColor:0xffa726, stars:false, ambient:0xffe0b2 },
      { name:'petang',      skyTop:0xab47bc, skyBot:0xff7043, cloudTint:0xf48fb1, sunY: 0.90, sunColor:0xff5722, stars:false, ambient:0xf8bbd0 },
      { name:'blue-hour',   skyTop:0x283593, skyBot:0x5c6bc0, cloudTint:0x9fa8da, sunY:-0.10, sunColor:0xb39ddb, stars:true,  ambient:0x7986cb },
      { name:'malam',       skyTop:0x1a237e, skyBot:0x3f51b5, cloudTint:0x7986cb, sunY:-0.40, sunColor:0xfff59d, stars:true,  ambient:0x5c6bc0 },
    ],
    _lerpHex (a, b, t) {
      const ar=(a>>16)&255, ag=(a>>8)&255, ab=a&255
      const br=(b>>16)&255, bg=(b>>8)&255, bb=b&255
      const r=Math.round(ar + (br-ar)*t), g=Math.round(ag + (bg-ag)*t), bl=Math.round(ab + (bb-ab)*t)
      return (r<<16) | (g<<8) | bl
    },
    forProgress (t) {
      const tc = Math.max(0, Math.min(1, t))
      const span = tc * this.PHASES.length
      const idx = Math.min(this.PHASES.length - 1, Math.floor(span))
      const nextIdx = Math.min(this.PHASES.length - 1, idx + 1)
      const lerp = span - idx
      const a = this.PHASES[idx], b = this.PHASES[nextIdx]
      return {
        phase: a, next: b, lerp,
        name:     a.name,
        skyTop:   this._lerpHex(a.skyTop, b.skyTop, lerp),
        skyBot:   this._lerpHex(a.skyBot, b.skyBot, lerp),
        cloudTint:this._lerpHex(a.cloudTint, b.cloudTint, lerp),
        sunY:     a.sunY + (b.sunY - a.sunY) * lerp,
        sunColor: this._lerpHex(a.sunColor, b.sunColor, lerp),
        ambient:  this._lerpHex(a.ambient, b.ambient, lerp),
        stars:    a.stars || b.stars,
      }
    },
    forLevel (level, maxLevel) {
      const lv = Math.max(1, level | 0)
      const max = Math.max(1, maxLevel | 0)
      return this.forProgress((lv - 0.5) / max)
    },
    forName (name) {
      return this.PHASES.find(p => p.name === name) || this.PHASES[4]   // siang fallback
    },
  }

  // ── 12 weather variants (visual rule per spec §4) ──────────────────────────
  const Weather = {
    VARIANTS: [
      { id:'cerah',          rainDensity:0, fogAlpha:0, dimAlpha:0,    wetReflect:false, particleHint:null },
      { id:'berawan',        rainDensity:0, fogAlpha:0, dimAlpha:0.08, wetReflect:false, particleHint:'cloud-soft' },
      { id:'mendung',        rainDensity:0, fogAlpha:0, dimAlpha:0.20, wetReflect:false, particleHint:'cloud-dense' },
      { id:'gerimis',        rainDensity:14,fogAlpha:0, dimAlpha:0.05, wetReflect:true,  particleHint:'rain-mist' },
      { id:'hujan-ringan',   rainDensity:24,fogAlpha:0, dimAlpha:0.10, wetReflect:true,  particleHint:'rain-slow' },
      { id:'hujan-deras',    rainDensity:48,fogAlpha:0, dimAlpha:0.22, wetReflect:true,  particleHint:'rain-fast' },
      { id:'badai-ringan',   rainDensity:60,fogAlpha:0, dimAlpha:0.30, wetReflect:true,  particleHint:'rain-fast+thunder' },
      { id:'kabut-tipis',    rainDensity:0, fogAlpha:0.18,dimAlpha:0,  wetReflect:false, particleHint:'fog-thin' },
      { id:'kabut-tebal',    rainDensity:0, fogAlpha:0.42,dimAlpha:0.10,wetReflect:false,particleHint:'fog-thick' },
      { id:'wet-road',       rainDensity:0, fogAlpha:0, dimAlpha:0.05, wetReflect:true,  particleHint:'puddle-shine' },
      { id:'panas-tropis',   rainDensity:0, fogAlpha:0, dimAlpha:0,    wetReflect:false, particleHint:'heat-haze' },
      { id:'angin-ringan',   rainDensity:0, fogAlpha:0, dimAlpha:0.04, wetReflect:false, particleHint:'wind-streak' },
    ],
    forId (id) { return this.VARIANTS.find(v => v.id === id) || this.VARIANTS[0] },
    // weightedPick(weights:{ id: w }) returns a Weather variant
    weightedPick (weights) {
      const ids = Object.keys(weights || {})
      if (!ids.length) return this.VARIANTS[0]
      let sum = 0
      ids.forEach(k => sum += weights[k])
      let r = Math.random() * sum
      for (const id of ids) {
        r -= weights[id]
        if (r <= 0) return this.forId(id)
      }
      return this.forId(ids[ids.length - 1])
    },
  }

  // ── 7-phase Journey FSM (per spec §8) ──────────────────────────────────────
  const Journey = {
    PHASES: ['departure','urban-exit','suburban','countryside','landmark','approaching','arrival'],
    // Map race progress 0..1 → journey phase index (with weights so countryside
    // gets the longest window — that's where racing is most dramatic).
    DURATIONS: [0.08, 0.12, 0.15, 0.30, 0.10, 0.18, 0.07],
    forProgress (t) {
      const tc = Math.max(0, Math.min(1, t))
      let acc = 0
      for (let i = 0; i < this.PHASES.length; i++) {
        const next = acc + this.DURATIONS[i]
        if (tc <= next) {
          const localT = (tc - acc) / Math.max(0.0001, (next - acc))
          return { name: this.PHASES[i], idx: i, localT }
        }
        acc = next
      }
      return { name: 'arrival', idx: this.PHASES.length - 1, localT: 1 }
    },
  }

  // ── LocationTheme registry (per spec §5 + §17) ─────────────────────────────
  const LocationTheme = {
    REGISTRY: {},
    register (cfg) {
      if (!cfg || !cfg.locationId) return false
      this.REGISTRY[cfg.locationId] = cfg
      return true
    },
    get (locationId) { return this.REGISTRY[locationId] || null },
    list () { return Object.keys(this.REGISTRY) },
    // Pick a location's weather variant respecting the per-location weights.
    pickWeatherFor (locationId) {
      const cfg = this.get(locationId)
      if (!cfg || !cfg.defaultWeatherWeights) return Weather.VARIANTS[0]
      return Weather.weightedPick(cfg.defaultWeatherWeights)
    },
    // Pick a time-of-day phase respecting the per-location weights (or use
    // a level-mapped distribution if weights absent).
    pickTimeFor (locationId, level, maxLevel) {
      const cfg = this.get(locationId)
      if (cfg && cfg.timeOfDayWeights) {
        const ids = Object.keys(cfg.timeOfDayWeights)
        let sum = 0
        ids.forEach(k => sum += cfg.timeOfDayWeights[k])
        let r = Math.random() * sum
        for (const id of ids) {
          r -= cfg.timeOfDayWeights[id]
          if (r <= 0) return TimeOfDay.forName(id)
        }
        return TimeOfDay.forName(ids[ids.length - 1])
      }
      return TimeOfDay.forLevel(level || 1, maxLevel || 30)
    },
  }

  // ── NPC archetype registry (stub — populated by v54.63) ─────────────────────
  const NPCSystem = {
    REGISTRY: {},
    register (archetype, def) { this.REGISTRY[archetype] = def },
    get (archetype) { return this.REGISTRY[archetype] || null },
    list () { return Object.keys(this.REGISTRY) },
  }

  // ── Audio ambience pack registry (stub — populated by v54.65) ───────────────
  const AudioSystem = {
    REGISTRY: {},
    register (packId, def) { this.REGISTRY[packId] = def },
    get (packId) { return this.REGISTRY[packId] || null },
    list () { return Object.keys(this.REGISTRY) },
  }

  // ── Layer manager (12 layers per spec §9) ──────────────────────────────────
  // Each layer is a PIXI.Container child of the engine's root container.
  // Z-order from back to front: sky → farFar → far → mid → near → track →
  //                              station → npc → weather → lighting → particles → event.
  // The actual `track` rendering stays per-game (G14 uses Pixi Graphics rails,
  // G15 has its own buildTracks); the engine just reserves the slot so other
  // layers respect z-order around it.
  const LAYER_NAMES = ['sky','farFar','far','mid','near','track','station','npc','weather','lighting','particles','event']
  function createLayers (PIXI, parent) {
    const out = {}
    if (!PIXI || !parent || !PIXI.Container) return out
    LAYER_NAMES.forEach(name => {
      const c = new PIXI.Container()
      c._bgLayer = name
      parent.addChild(c)
      out[name] = c
    })
    return out
  }

  // ── Performance quality scaling ─────────────────────────────────────────────
  let _quality = 'medium'
  const QUALITY_CAPS = { low: 90, medium: 180, high: 300 }
  function setQuality (q) {
    if (q === 'low' || q === 'medium' || q === 'high') _quality = q
  }
  function getActiveCap () { return QUALITY_CAPS[_quality] || 180 }
  function getQuality () { return _quality }

  // ── State (per-init context) ───────────────────────────────────────────────
  const State = {
    inited: false,
    PIXI: null,
    app: null,
    stage: null,
    container: null,
    viewport: { w: 0, h: 0 },
    layers: {},
    location: null,        // current LocationTheme (object reference)
    timeOfDay: null,       // current TimeOfDay phase (object reference)
    weather: null,         // current Weather variant (object reference)
    journey: null,         // current Journey phase (object)
    journeyProgress: 0,
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  // opts: { app: PIXI.Application, container?: Container, viewport?: {w,h} }
  // Either `app` (we pull stage from it) or `container` (we attach there).
  function init (opts) {
    opts = opts || {}
    const PIXI = global.PIXI
    if (!PIXI) { console.warn('[TrainBG] PIXI not loaded; engine inactive'); return false }
    State.PIXI = PIXI
    if (opts.app) {
      State.app = opts.app
      State.stage = opts.app.stage
      State.viewport.w = opts.app.screen ? opts.app.screen.width : 0
      State.viewport.h = opts.app.screen ? opts.app.screen.height : 0
    }
    if (opts.container) {
      State.container = opts.container
    } else if (State.stage) {
      State.container = new PIXI.Container()
      State.container._bgLayer = 'root'
      State.stage.addChild(State.container)
    }
    if (opts.viewport) {
      State.viewport.w = opts.viewport.w || State.viewport.w
      State.viewport.h = opts.viewport.h || State.viewport.h
    }
    State.layers = createLayers(PIXI, State.container)
    State.inited = true
    return true
  }

  // ── Layer count helper (for quality-cap enforcement) ────────────────────────
  function activeSpriteCount () {
    let n = 0
    for (const k in State.layers) {
      const L = State.layers[k]
      n += (L && L.children) ? L.children.length : 0
    }
    return n
  }

  // ── Clear all layers (between race-starts) ──────────────────────────────────
  function clearAll () {
    for (const k in State.layers) {
      const L = State.layers[k]
      if (!L || !L.removeChildren) continue
      try {
        while (L.children.length) {
          const ch = L.children.pop()
          try { ch.destroy && ch.destroy({ children: true }) } catch(_){}
        }
      } catch(_){}
    }
  }

  // ── Set context (location + time + weather for this run) ────────────────────
  // v54.62: after applying new context, fire each layer's `_setup` (if any)
  // so renderers can rebuild their content for the new location/time/weather.
  function setContext (opts) {
    opts = opts || {}
    if (opts.locationId) State.location = LocationTheme.get(opts.locationId)
    if (opts.timeOfDay)  State.timeOfDay = (typeof opts.timeOfDay === 'string') ? TimeOfDay.forName(opts.timeOfDay) : opts.timeOfDay
    if (opts.weather)    State.weather   = (typeof opts.weather === 'string')   ? Weather.forId(opts.weather)       : opts.weather
    if (typeof opts.journeyProgress === 'number') State.journeyProgress = opts.journeyProgress
    // Fire each layer's setup so renderers populate.
    for (const k in State.layers) {
      const L = State.layers[k]
      if (L && typeof L._setup === 'function') {
        try { L._setup(State) } catch(_){}
      }
    }
  }

  // ── Tick (per-frame update) ────────────────────────────────────────────────
  // Each layer that has a `_tick` fn registered fires it here. Layers without
  // a tick fn are static. journeyProgress (0..1) tracks the train's distance.
  function tick (dt, journeyProgress) {
    if (!State.inited) return
    if (typeof journeyProgress === 'number') {
      State.journeyProgress = journeyProgress
      State.journey = Journey.forProgress(journeyProgress)
    }
    // Quality cap: if over budget, hide oldest particles/event children.
    const cap = getActiveCap()
    const count = activeSpriteCount()
    if (count > cap) {
      const overflow = count - cap
      // Drop from less-important layers first: event > particles > npc > weather > near.
      const ORDER = ['event','particles','npc','weather','near']
      let dropped = 0
      for (const k of ORDER) {
        if (dropped >= overflow) break
        const L = State.layers[k]
        if (!L || !L.children) continue
        while (L.children.length && dropped < overflow) {
          const ch = L.children.shift()
          try { L.removeChild(ch); ch.destroy && ch.destroy() } catch(_){}
          dropped++
        }
      }
    }
    for (const k in State.layers) {
      const L = State.layers[k]
      if (L && typeof L._tick === 'function') {
        try { L._tick(dt, State) } catch(_){}
      }
    }
  }

  // ── Utility: weighted random pick ──────────────────────────────────────────
  function weightedRandom (weights) {
    const ids = Object.keys(weights || {})
    if (!ids.length) return null
    let sum = 0
    ids.forEach(k => sum += weights[k])
    let r = Math.random() * sum
    for (const id of ids) {
      r -= weights[id]
      if (r <= 0) return id
    }
    return ids[ids.length - 1]
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  global.TrainBG = {
    version: '54.60',
    init,
    setContext,
    tick,
    clearAll,
    layers: () => State.layers,
    state: () => State,
    activeSpriteCount,
    weightedRandom,
    reducedMotion,
    setQuality,
    getQuality,
    LAYER_NAMES,
    TimeOfDay,
    Weather,
    Journey,
    LocationTheme,
    NPCSystem,
    AudioSystem,
  }
})(typeof window !== 'undefined' ? window : globalThis)
