/* =============================================================================
 * bg-npcs.js — NPC archetype renderers for train-bg-engine (v54.63)
 * =============================================================================
 * Spec source: documentation and standarization/DYNAMIC_BG_ENGINE_SPEC.md §10
 *
 * Provides Pixi-drawn NPC archetypes + a behavior FSM (idle / walking /
 * sheltering) for the engine's `npc` layer. Reads
 * `state.location.npcProfiles[currentTimeName]` for which archetypes to spawn,
 * with a `hujan` override when weather is rainy.
 *
 * NPCs are small (12-20px tall) — visual depth without obscuring gameplay.
 * The engine's quality cap drops oldest NPCs if over budget (low=4 / med=8 /
 * high=12 active NPCs).
 *
 * Behavior FSM:
 *   idle       — subtle vertical bob, fixed x.
 *   walking    — drifts left at ~0.5-1.2 px/frame, wraps at left edge.
 *   sheltering — fixed x near canopy, no bob, sometimes "looks up".
 *
 * NPC archetypes shipped (10):
 *   commuter, family_passenger, tourist, student, office_worker,
 *   station_staff, security, vendor, umbrella_commuter, sheltering_passenger
 *
 * Aliases (mapped to the 10 archetypes for the various npcProfile keys
 * like office_worker_rush, commuter_dense, etc.):
 *   office_worker_rush, commuter_dense, commuter_rush, commuter_rush_heavy,
 *   late_commuter, raincoat_staff, sheltering_passenger, umbrella_tourist,
 *   tourist_night, backpacker, vendor_jamu, vendor_night, vendor_malioboro,
 *   security_night, vendor_malam, vendor_jamu, family_passenger
 *
 * Each archetype: (container, x, y, opts) → paints into container.
 * ========================================================================== */

(function (global) {
  'use strict'

  if (!global.TrainBG || !global.PIXI) {
    console.warn('[bg-npcs] TrainBG or PIXI not loaded; NPCs inactive')
    return
  }
  const TrainBG = global.TrainBG
  const PIXI = global.PIXI

  // ── Helpers ────────────────────────────────────────────────────────────────
  function vw () { return TrainBG.state().viewport.w || 800 }
  function vh () { return TrainBG.state().viewport.h || 600 }
  function clearLayer (L) {
    if (!L || !L.removeChildren) return
    while (L.children.length) {
      const ch = L.children.pop()
      try { ch.destroy && ch.destroy({ children: true }) } catch(_){}
    }
  }

  // ── 10 NPC archetype drawers ──────────────────────────────────────────────
  // v54.64 Thomas & Friends: All Engines Go cheerful pass. All NPC skin tones
  // warmer (peach), shirts in bright primary colors (cherry red / royal blue /
  // happy yellow / emerald green) instead of muted slate/navy/olive. Pants
  // stay mid-tone for contrast.
  const SKIN = 0xffab91   // warm peach (was khaki tan)
  const SKIN_DARK = 0xff8a65
  const PANT = 0x546e7a   // warm blue-gray pants (was near-black)
  const SHOE = 0x6d4c41
  const ARCHETYPES = {
    commuter: (c) => {
      const g = new PIXI.Graphics()
      g.circle(0, -16, 3.5).fill({ color: SKIN })
      g.rect(-3, -13, 6, 8).fill({ color: 0x1e88e5 })   // royal blue jacket
      g.rect(-3, -5, 2.5, 5).fill({ color: PANT })
      g.rect(0.5, -5, 2.5, 5).fill({ color: PANT })
      g.rect(2, -10, 3, 4).fill({ color: 0xa1887f })    // briefcase
      c.addChild(g)
    },
    family_passenger: (c) => {
      const g = new PIXI.Graphics()
      // Adult — cherry red shirt
      g.circle(-2, -16, 3.5).fill({ color: SKIN })
      g.rect(-5, -13, 6, 8).fill({ color: 0xe53935 })
      g.rect(-5, -5, 2.5, 5).fill({ color: PANT })
      g.rect(-2.5, -5, 2.5, 5).fill({ color: PANT })
      // Child — happy yellow shirt
      g.circle(5, -10, 2.5).fill({ color: SKIN_DARK })
      g.rect(3, -8, 4, 5).fill({ color: 0xfdd835 })
      g.rect(3, -3, 1.5, 3).fill({ color: 0x6d4c41 })
      g.rect(5, -3, 1.5, 3).fill({ color: 0x6d4c41 })
      c.addChild(g)
    },
    tourist: (c) => {
      const g = new PIXI.Graphics()
      g.circle(0, -16, 3.5).fill({ color: SKIN })
      g.rect(-3, -13, 6, 8).fill({ color: 0x43a047 })   // bright emerald
      g.rect(-5, -12, 2.5, 7).fill({ color: 0xe53935 }) // red backpack strap
      g.rect(2.5, -12, 2.5, 7).fill({ color: 0xe53935 })
      g.rect(-1, -10, 3, 2.5).fill({ color: 0x546e7a }) // camera
      g.rect(-3, -5, 2.5, 5).fill({ color: 0x6d4c41 })
      g.rect(0.5, -5, 2.5, 5).fill({ color: 0x6d4c41 })
      c.addChild(g)
    },
    student: (c) => {
      const g = new PIXI.Graphics()
      g.circle(0, -16, 3.5).fill({ color: SKIN_DARK })
      g.rect(-3, -13, 6, 5).fill({ color: 0xffffff })   // white shirt
      g.rect(-1, -12, 2, 3).fill({ color: 0xe53935 })   // red bow tie
      g.rect(-3, -8, 6, 4).fill({ color: 0x1565c0 })    // royal blue uniform pants
      g.rect(2.5, -12, 3, 6).fill({ color: 0xfdd835 })  // happy yellow backpack
      g.rect(-3, -4, 2.5, 4).fill({ color: PANT })
      g.rect(0.5, -4, 2.5, 4).fill({ color: PANT })
      c.addChild(g)
    },
    office_worker: (c) => {
      const g = new PIXI.Graphics()
      g.circle(0, -17, 3.5).fill({ color: SKIN })
      g.rect(-3, -14, 6, 9).fill({ color: 0x283593 })   // deep indigo suit
      g.rect(-1, -13, 2, 4).fill({ color: 0xe53935 })   // cherry red tie
      g.rect(-3, -5, 2.5, 5).fill({ color: 0x283593 })
      g.rect(0.5, -5, 2.5, 5).fill({ color: 0x283593 })
      g.rect(2, -10, 3.5, 4).fill({ color: 0xa1887f })
      c.addChild(g)
    },
    station_staff: (c) => {
      // KAI-style royal-blue uniform + cap with red band.
      const g = new PIXI.Graphics()
      g.circle(0, -16, 3.5).fill({ color: SKIN })
      g.rect(-4, -19, 8, 2).fill({ color: 0x1565c0 })   // cap top
      g.rect(-4, -17, 8, 1).fill({ color: 0xe53935 })   // red band
      g.rect(-3, -13, 6, 6).fill({ color: 0x1565c0 })
      g.rect(-1, -12, 2, 4).fill({ color: 0xfdd835 })   // yellow stripe
      g.rect(-3, -7, 6, 7).fill({ color: PANT })
      c.addChild(g)
    },
    security: (c) => {
      const g = new PIXI.Graphics()
      g.circle(0, -16, 3.5).fill({ color: SKIN })
      g.rect(-3, -13, 6, 8).fill({ color: 0xfdd835 })   // bright yellow vest
      g.rect(-3, -13, 6, 1.5).fill({ color: 0xe53935 }) // red shoulder
      g.rect(-3, -10, 6, 1).fill({ color: 0xff5722 })   // hi-vis orange stripe
      g.rect(-3, -5, 2.5, 5).fill({ color: PANT })
      g.rect(0.5, -5, 2.5, 5).fill({ color: PANT })
      g.rect(3, -12, 1.5, 3).fill({ color: 0x546e7a })
      c.addChild(g)
    },
    vendor: (c) => {
      const g = new PIXI.Graphics()
      g.circle(-4, -14, 3).fill({ color: SKIN })
      g.rect(-6, -12, 4, 7).fill({ color: 0xe53935 })   // cherry red shirt
      g.rect(-6, -5, 1.5, 5).fill({ color: 0x6d4c41 })
      g.rect(-4.5, -5, 1.5, 5).fill({ color: 0x6d4c41 })
      // Cart — cream top + cherry red awning + happy yellow trim
      g.rect(-2, -9, 12, 6).fill({ color: 0xfff9c4 })
      g.rect(-2, -10, 12, 1.5).fill({ color: 0xe53935 })
      g.rect(-2, -7, 12, 1).fill({ color: 0xfdd835 })
      g.circle(0, -2, 1.5).fill({ color: 0x546e7a })
      g.circle(8, -2, 1.5).fill({ color: 0x546e7a })
      c.addChild(g)
    },
    umbrella_commuter: (c) => {
      const g = new PIXI.Graphics()
      g.circle(0, -14, 3.5).fill({ color: SKIN })
      g.rect(-3, -11, 6, 7).fill({ color: 0x1e88e5 })   // royal blue jacket
      g.rect(-3, -4, 2.5, 4).fill({ color: PANT })
      g.rect(0.5, -4, 2.5, 4).fill({ color: PANT })
      // Cherry red umbrella canopy + dark shaft
      g.ellipse(0, -19, 10, 4).fill({ color: 0xe53935 })
      g.rect(-0.5, -19, 1, 5).fill({ color: 0x546e7a })
      c.addChild(g)
    },
    sheltering_passenger: (c) => {
      const g = new PIXI.Graphics()
      // Cheerful blue canopy bar with red trim
      g.rect(-12, -22, 24, 1.5).fill({ color: 0xfdd835 })
      g.rect(-12, -23, 24, 1).fill({ color: 0xe53935 })
      g.circle(0, -16, 3.5).fill({ color: SKIN })
      g.rect(-3, -13, 6, 8).fill({ color: 0x6a1b9a })   // purple raincoat (playful)
      g.rect(-3, -5, 2.5, 5).fill({ color: PANT })
      g.rect(0.5, -5, 2.5, 5).fill({ color: PANT })
      c.addChild(g)
    },
  }

  // Aliases: map config NPC profile names to the 10 archetypes.
  const ALIASES = {
    'office_worker_rush': 'office_worker',
    'commuter_dense': 'commuter',
    'commuter_rush': 'commuter',
    'commuter_rush_heavy': 'commuter',
    'late_commuter': 'commuter',
    'tourist_night': 'tourist',
    'umbrella_tourist': 'umbrella_commuter',
    'backpacker': 'tourist',
    'raincoat_staff': 'station_staff',
    'vendor_jamu': 'vendor',
    'vendor_night': 'vendor',
    'vendor_malam': 'vendor',
    'vendor_malioboro': 'vendor',
    'security_night': 'security',
    'student_jpa': 'student',
    'umbrella_student': 'umbrella_commuter',
    'poncho_commuter': 'umbrella_commuter',
    'poncho_rider': 'umbrella_commuter',
    'family_passenger': 'family_passenger',
  }
  function resolveArchetype (name) {
    if (ARCHETYPES[name]) return name
    return ALIASES[name] || 'commuter'
  }

  // ── Behavior FSM ──────────────────────────────────────────────────────────
  // States: 'idle', 'walking', 'sheltering'
  // npc.behavior carries the state. tickNPC updates per state.
  function pickBehavior (archetype, isRain) {
    if (archetype === 'umbrella_commuter') return 'walking'
    if (archetype === 'sheltering_passenger') return 'sheltering'
    if (archetype === 'vendor') return 'idle'
    if (archetype === 'station_staff' || archetype === 'security') return 'idle'
    if (isRain && Math.random() < 0.45) return 'sheltering'
    return Math.random() < 0.55 ? 'walking' : 'idle'
  }

  // ── NPC layer setup + tick ────────────────────────────────────────────────
  function setupNPCs (state) {
    const L = state.layers.npc
    if (!L) return
    clearLayer(L)
    if (!state.location) return
    const cfg = state.location.npcProfiles || {}
    const todName = (state.timeOfDay && state.timeOfDay.name) || 'siang'
    const isRain = state.weather && /hujan|gerimis|badai/.test(state.weather.id || '')
    // Map ToD name to npcProfiles key. Configs use 'pagi','siang','sore',
    // 'petang','malam' so we collapse blue-hour/golden-hour/dini-hari/subuh
    // to the nearest.
    const todKey = ({
      'dini-hari':'malam', 'subuh':'pagi', 'pagi':'pagi',
      'golden-hour':'sore', 'siang':'siang', 'sore':'sore',
      'petang':'petang', 'blue-hour':'malam', 'malam':'malam'
    })[todName] || 'siang'
    let pool = (cfg[todKey] || cfg['siang'] || []).slice()
    if (isRain && Array.isArray(cfg.hujan)) {
      // Rain override: prepend rain-specific archetypes so they're more likely.
      pool = cfg.hujan.concat(pool)
    }
    if (!pool.length) pool = ['commuter','family_passenger','station_staff']
    // Density by quality.
    const q = TrainBG.getQuality()
    const density = q === 'high' ? 11 : q === 'medium' ? 7 : 4
    const W = vw(), H = vh()
    // NPCs sit near platform Y — between rail (mid-band) and bottom 12% of screen.
    const platformY = H * 0.85
    for (let i = 0; i < density; i++) {
      const name = pool[Math.floor(Math.random() * pool.length)]
      const archetype = resolveArchetype(name)
      const cont = new PIXI.Container()
      try { ARCHETYPES[archetype](cont) } catch (_){}
      cont.x = (i / density) * W + (Math.random() - 0.5) * (W / density)
      cont.y = platformY + (Math.random() - 0.5) * 8
      cont._baseY = cont.y
      cont._phase = Math.random() * Math.PI * 2
      cont._behavior = pickBehavior(archetype, isRain)
      cont._archetype = archetype
      // Walking: drift left slow; wrap at right.
      if (cont._behavior === 'walking') {
        cont._vx = -(0.6 + Math.random() * 0.6)
      }
      L.addChild(cont)
    }
  }
  function tickNPCs (dt, state) {
    const L = state.layers.npc
    if (!L || !L.children.length) return
    const W = vw()
    const _frame = (TrainBG._npcFrame || 0) + dt
    TrainBG._npcFrame = _frame
    for (const npc of L.children) {
      if (npc._behavior === 'idle') {
        npc.y = npc._baseY + Math.sin(_frame * 0.06 + npc._phase) * 0.4
      } else if (npc._behavior === 'walking') {
        npc.x += npc._vx * dt
        if (npc.x < -20) npc.x = W + 10
        npc.y = npc._baseY + Math.sin(_frame * 0.10 + npc._phase) * 0.6
      } else if (npc._behavior === 'sheltering') {
        // Subtle stand-still; occasionally "looks up" via small scale pulse.
        const t = Math.sin(_frame * 0.04 + npc._phase)
        npc.scale.set(1 + t * 0.02)
      }
    }
  }

  // ── Extend Renderers with NPC layer wiring ────────────────────────────────
  const origAttach = (TrainBG.Renderers && TrainBG.Renderers.attachAll) || function(){}
  if (TrainBG.Renderers) {
    TrainBG.Renderers.setupNPCs = setupNPCs
    TrainBG.Renderers.tickNPCs = tickNPCs
    TrainBG.Renderers.NPC_ARCHETYPES = ARCHETYPES
    TrainBG.Renderers.NPC_ALIASES = ALIASES
    TrainBG.Renderers.attachAll = function () {
      const ok = origAttach()
      const layers = TrainBG.layers()
      if (layers && layers.npc) {
        layers.npc._setup = setupNPCs
        layers.npc._tick = tickNPCs
      }
      return ok
    }
  }

  // ── Register on the engine NPCSystem registry ─────────────────────────────
  Object.keys(ARCHETYPES).forEach(k => TrainBG.NPCSystem.register(k, { draw: ARCHETYPES[k] }))

  try { console.log('[bg-npcs] registered', Object.keys(ARCHETYPES).length, 'archetypes +', Object.keys(ALIASES).length, 'aliases') } catch(_){}

})(typeof window !== 'undefined' ? window : globalThis)
