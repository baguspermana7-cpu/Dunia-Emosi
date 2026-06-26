/* =============================================================================
 * bg-renderers.js — Layer renderers for train-bg-engine (v54.62)
 * =============================================================================
 * Provides _setup + _tick functions for the engine's 12 layers. Registered
 * by attaching them to TrainBG.layers().NAME after init.
 *
 * Implemented here (v54.62):
 *   - sky         (gradient + sun/moon + stars + cloudTint band)
 *   - farFar      (mountain ridge / harbor cranes / Suramadu line)
 *   - far         (city skyline / Tugu Pahlawan / Lawang Sewu / Tugu Jogja)
 *   - mid         (heritage blocks / ruko strip / flyovers / billboards /
 *                  art-deco hall / Malioboro arcade / pine grove / temple roof /
 *                  Kalimas river)
 *   - weather     (rain streaks, fog, dim, heat-haze, puddle reflect)
 *   - lighting    (TimeOfDay ambient soft-light blend)
 *
 * Not implemented yet (later tranches):
 *   - near        (foreground trackside — v54.63)
 *   - station     (platform / canopy / signage — v54.66)
 *   - npc         (commuter / family / tourist — v54.63)
 *   - particles   (TrainVFX-managed — already exists)
 *   - event       (passing train / crossing / fireworks — v54.66)
 *
 * Performance: each landmark drawer creates ONE PIXI.Container per draw
 * call, reused across the run. The engine's quality cap drops oldest if
 * over budget.
 * ========================================================================== */

(function (global) {
  'use strict'

  if (!global.TrainBG || !global.PIXI) {
    console.warn('[bg-renderers] TrainBG or PIXI not loaded; renderers inactive')
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
  function rgbHex (top, bot, t) {
    const ar=(top>>16)&255, ag=(top>>8)&255, ab=top&255
    const br=(bot>>16)&255, bg=(bot>>8)&255, bb=bot&255
    const r=Math.round(ar + (br-ar)*t), g=Math.round(ag + (bg-ag)*t), bl=Math.round(ab + (bb-ab)*t)
    return (r<<16) | (g<<8) | bl
  }

  // ── 1. SKY layer renderer ──────────────────────────────────────────────────
  function setupSky (state) {
    const L = state.layers.sky
    if (!L) return
    clearLayer(L)
    const W = vw(), H = vh()
    const tod = state.timeOfDay || TrainBG.TimeOfDay.forName('siang')
    // Vertical gradient via 16 bands for performance.
    const BANDS = 16
    for (let i = 0; i < BANDS; i++) {
      const t = i / (BANDS - 1)
      const c = rgbHex(tod.skyTop, tod.skyBot, t)
      const g = new PIXI.Graphics()
      g.rect(0, (H * 0.55) * (i / BANDS), W, (H * 0.55) / BANDS + 1).fill({ color: c })
      L.addChild(g)
    }
    // Sun / Moon
    if (tod.sunY > 0) {
      const sun = new PIXI.Graphics()
      sun.circle(0, 0, 30).fill({ color: tod.sunColor, alpha: 0.95 })
      sun.circle(0, 0, 22).fill({ color: 0xffffff, alpha: 0.4 })
      sun.x = W * (0.15 + 0.65 * tod.sunY)
      sun.y = H * (0.06 + 0.16 * (1 - tod.sunY))
      L.addChild(sun)
      // Soft halo
      const halo = new PIXI.Graphics()
      halo.circle(0, 0, 80).fill({ color: tod.sunColor, alpha: 0.10 })
      halo.x = sun.x; halo.y = sun.y
      L.addChildAt(halo, 0)   // behind sun
    } else if (tod.stars) {
      const moon = new PIXI.Graphics()
      moon.circle(0, 0, 28).fill({ color: 0xfef9c3 })
      moon.circle(-9, -9, 21).fill({ color: tod.skyTop })
      moon.x = W * 0.78; moon.y = H * 0.10
      L.addChild(moon)
      // 50 stars
      for (let i = 0; i < 50; i++) {
        const s = new PIXI.Graphics()
        const r = 0.6 + Math.random() * 1.2
        s.circle(0, 0, r).fill({ color: 0xffffff, alpha: 0.3 + Math.random() * 0.5 })
        s.x = Math.random() * W; s.y = Math.random() * H * 0.5
        L.addChild(s)
      }
    }
    // 3 clouds drifting with cloudTint
    for (let i = 0; i < 3; i++) {
      const cloud = new PIXI.Graphics()
      const w = 70 + Math.random() * 40
      cloud.ellipse(0, 0, w, 14).fill({ color: tod.cloudTint, alpha: 0.6 })
      cloud.ellipse(w * 0.4, -6, w * 0.5, 12).fill({ color: tod.cloudTint, alpha: 0.55 })
      cloud.ellipse(-w * 0.4, -4, w * 0.4, 10).fill({ color: tod.cloudTint, alpha: 0.55 })
      cloud.x = (i * W * 0.4) + Math.random() * 60
      cloud.y = H * (0.10 + Math.random() * 0.12)
      cloud._vx = -(0.2 + Math.random() * 0.3)
      L.addChild(cloud)
    }
  }
  function tickSky (dt, state) {
    const L = state.layers.sky
    if (!L) return
    const W = vw()
    for (const c of L.children) {
      if (c._vx) {
        c.x += c._vx * dt
        if (c.x < -150) c.x = W + 80
      }
    }
  }

  // ── 2. FAR-FAR layer (distant horizon-line features) ──────────────────────
  function setupFarFar (state) {
    const L = state.layers.farFar
    if (!L) return
    clearLayer(L)
    if (!state.location) return
    const W = vw(), H = vh()
    const horizonY = H * 0.42
    // Distant haze band — shared for coastal / mountain
    if (/coastal|highland/.test(state.location.climateProfile || '')) {
      const haze = new PIXI.Graphics()
      const isCoastal = /coastal/.test(state.location.climateProfile)
      haze.rect(0, horizonY - 4, W, 10).fill({ color: isCoastal ? 0xc7d2fe : 0xe5e7eb, alpha: 0.45 })
      L.addChild(haze)
    }
    // Mountain ridge (Bandung etc.)
    state.location.landmarks.filter(lm => lm.layer === 'farFar').forEach(lm => {
      const drawer = LANDMARK_DRAWERS[lm.name]
      if (drawer && Math.random() < (lm.spawnChance || 0.5)) {
        const cont = new PIXI.Container()
        try { drawer(cont, W, horizonY, state) } catch(_){}
        L.addChild(cont)
      }
    })
  }

  // ── 3. FAR layer (city skyline + main landmarks) ──────────────────────────
  function setupFar (state) {
    const L = state.layers.far
    if (!L) return
    clearLayer(L)
    if (!state.location) return
    const W = vw(), H = vh()
    const horizonY = H * 0.48
    // Generic skyline strip — density based on climate
    const climate = state.location.climateProfile || ''
    let strips = 18
    if (/megacity/.test(climate)) strips = 28
    if (/heritage|highland/.test(climate)) strips = 12
    const palette = (state.location.palette || {})
    const buildingColor = palette.hill || 0x546e7a
    // v54.64 Thomas palette: cycle through 6 pastel building tints so the
    // skyline strip reads as a playful row of varied buildings, not a dark
    // monotone slab.
    const TINTS = [0xfff9c4, 0xb3e5fc, 0xf8bbd0, 0xc8e6c9, 0xffe0b2, 0xd1c4e9]
    const nightLights = (state.timeOfDay && state.timeOfDay.stars) || (state.timeOfDay && /malam|petang|blue-hour/.test(state.timeOfDay.name))
    for (let i = 0; i < strips; i++) {
      const b = new PIXI.Graphics()
      const w = 18 + Math.random() * 30
      const h = 30 + Math.random() * 80
      const tint = nightLights ? buildingColor : TINTS[i % TINTS.length]
      b.rect(0, 0, w, h).fill({ color: tint, alpha: nightLights ? 0.85 : 0.95 })
      // Roof accent stripe in cheerful Thomas red
      b.rect(0, 0, w, 3).fill({ color: 0xe53935, alpha: 0.85 })
      // Night windows for some buildings
      if (nightLights && Math.random() < 0.6) {
        const rows = Math.floor(h / 14)
        const cols = Math.floor(w / 10)
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (Math.random() < 0.35) {
              b.rect(c * 10 + 2, r * 14 + 4, 4, 4).fill({ color: 0xfff59d, alpha: 0.95 })
            }
          }
        }
      }
      b.x = (i / strips) * W + (Math.random() - 0.5) * 20
      b.y = horizonY - h
      L.addChild(b)
    }
    // Per-location landmarks at layer:'far'
    state.location.landmarks.filter(lm => lm.layer === 'far').forEach(lm => {
      const drawer = LANDMARK_DRAWERS[lm.name]
      if (drawer && Math.random() < (lm.spawnChance || 0.5)) {
        const cont = new PIXI.Container()
        try { drawer(cont, W, horizonY, state) } catch(_){}
        L.addChild(cont)
      }
    })
  }

  // ── 4. MID layer (closer landmarks + heritage) ────────────────────────────
  function setupMid (state) {
    const L = state.layers.mid
    if (!L) return
    clearLayer(L)
    if (!state.location) return
    const W = vw(), H = vh()
    const midY = H * 0.58
    state.location.landmarks.filter(lm => lm.layer === 'mid').forEach(lm => {
      const drawer = LANDMARK_DRAWERS[lm.name]
      if (drawer && Math.random() < (lm.spawnChance || 0.5)) {
        const cont = new PIXI.Container()
        try { drawer(cont, W, midY, state) } catch(_){}
        L.addChild(cont)
      }
    })
  }

  // ── 5. WEATHER layer (rain/fog/dim/heat/puddle) ───────────────────────────
  function setupWeather (state) {
    const L = state.layers.weather
    if (!L) return
    clearLayer(L)
    if (!state.weather) return
    const W = vw(), H = vh()
    const w = state.weather
    if (w.dimAlpha > 0) {
      const dim = new PIXI.Graphics()
      dim.rect(0, 0, W, H * 0.6).fill({ color: 0x111827, alpha: w.dimAlpha })
      L.addChild(dim)
    }
    if (w.fogAlpha > 0) {
      const fog = new PIXI.Graphics()
      fog.rect(0, H * 0.35, W, H * 0.4).fill({ color: 0xe5e7eb, alpha: w.fogAlpha })
      L.addChild(fog)
    }
    if (w.rainDensity > 0) {
      for (let i = 0; i < w.rainDensity; i++) {
        const drop = new PIXI.Graphics()
        const len = w.rainDensity >= 40 ? 10 : 7
        drop.rect(-1, -len, 2, len).fill({ color: 0x60a5fa, alpha: 0.5 })
        drop.x = Math.random() * W; drop.y = Math.random() * H
        drop._vy = 6 + Math.random() * 3 + (w.rainDensity >= 40 ? 2 : 0)
        drop._vx = -1.4
        L.addChild(drop)
      }
    }
    if (w.particleHint === 'heat-haze') {
      // Subtle horizontal shimmer band near ground
      for (let i = 0; i < 5; i++) {
        const haze = new PIXI.Graphics()
        haze.rect(0, 0, W, 6).fill({ color: 0xfde047, alpha: 0.06 })
        haze.y = H * (0.75 + i * 0.02)
        haze._vx = -0.3
        haze._heatWobble = i
        L.addChild(haze)
      }
    }
    if (w.wetReflect) {
      // Shiny strip on the rail-level (drawn near top of weather layer, alpha low)
      const shine = new PIXI.Graphics()
      shine.rect(0, H * 0.78, W, 3).fill({ color: 0xffffff, alpha: 0.20 })
      L.addChild(shine)
    }
  }
  function tickWeather (dt, state) {
    const L = state.layers.weather
    if (!L || !L.children.length) return
    const W = vw(), H = vh()
    for (const c of L.children) {
      if (c._vy) {
        c.y += c._vy * dt
        c.x += (c._vx || 0) * dt
        if (c.y > H + 10) { c.y = -10; c.x = Math.random() * W }
        if (c.x < -10) c.x = W + 5
      } else if (c._vx) {
        c.x += c._vx * dt
        if (c.x < -W) c.x = 0
      }
    }
  }

  // ── 6. LIGHTING layer (TimeOfDay ambient soft-light overlay) ───────────────
  function setupLighting (state) {
    const L = state.layers.lighting
    if (!L) return
    clearLayer(L)
    if (!state.timeOfDay) return
    const W = vw(), H = vh()
    const overlay = new PIXI.Graphics()
    overlay.rect(0, 0, W, H).fill({ color: state.timeOfDay.ambient, alpha: 0.12 })
    L.addChild(overlay)
  }

  // ── Landmark drawers (per spec §6) ─────────────────────────────────────────
  // Each drawer: (container, W, baseY, state) — paints into container.
  // baseY is the horizon (far/farFar) or mid-band Y (mid).
  const LANDMARK_DRAWERS = {}

  // FarFar drawers
  LANDMARK_DRAWERS['Distant mountain ridge'] = (c, W, baseY) => {
    // v54.64 Thomas palette: warm sky-blue mountain silhouette (not slate gray)
    const g = new PIXI.Graphics()
    g.poly([
      0, baseY,
      W * 0.05, baseY - 50,
      W * 0.18, baseY - 75,
      W * 0.32, baseY - 50,
      W * 0.45, baseY - 80,
      W * 0.60, baseY - 45,
      W * 0.78, baseY - 90,
      W * 0.92, baseY - 50,
      W, baseY - 30,
      W, baseY + 50,
      0, baseY + 50,
    ]).fill({ color: 0x90caf9, alpha: 0.75 })
    // Snow caps on tall peaks
    g.poly([W*0.14, baseY-68, W*0.18, baseY-75, W*0.22, baseY-68]).fill({color:0xffffff,alpha:0.85})
    g.poly([W*0.74, baseY-82, W*0.78, baseY-90, W*0.82, baseY-82]).fill({color:0xffffff,alpha:0.85})
    c.addChild(g)
  }
  LANDMARK_DRAWERS['Suramadu Bridge far'] = (c, W, baseY) => {
    const g = new PIXI.Graphics()
    // Horizontal bridge line
    g.rect(0, baseY - 4, W, 1.5).fill({ color: 0x1f2937, alpha: 0.55 })
    // Two pylons
    g.rect(W * 0.32, baseY - 36, 1.5, 32).fill({ color: 0x1f2937, alpha: 0.6 })
    g.rect(W * 0.62, baseY - 36, 1.5, 32).fill({ color: 0x1f2937, alpha: 0.6 })
    // Cables (V-shape)
    for (let i = 0; i < 6; i++) {
      const x1 = W * 0.32, x2 = W * 0.32 + (i - 3) * 8
      g.poly([x1, baseY - 34, x2, baseY - 4]).stroke({ color: 0x1f2937, width: 0.5, alpha: 0.45 })
    }
    for (let i = 0; i < 6; i++) {
      const x1 = W * 0.62, x2 = W * 0.62 + (i - 3) * 8
      g.poly([x1, baseY - 34, x2, baseY - 4]).stroke({ color: 0x1f2937, width: 0.5, alpha: 0.45 })
    }
    c.addChild(g)
  }
  LANDMARK_DRAWERS['Harbor cranes distant'] = (c, W, baseY) => {
    const g = new PIXI.Graphics()
    for (let i = 0; i < 4; i++) {
      const cx = W * (0.20 + i * 0.18)
      g.rect(cx - 1, baseY - 38, 2, 36).fill({ color: 0x374151, alpha: 0.65 })
      g.rect(cx - 14, baseY - 38, 28, 2).fill({ color: 0x374151, alpha: 0.65 })
      g.poly([cx, baseY - 38, cx - 12, baseY - 28]).stroke({ color: 0x374151, width: 1, alpha: 0.55 })
    }
    c.addChild(g)
  }
  LANDMARK_DRAWERS['Coastal haze far layer'] = (c, W, baseY) => {
    const g = new PIXI.Graphics()
    g.rect(0, baseY - 6, W, 14).fill({ color: 0xfde6a0, alpha: 0.35 })
    c.addChild(g)
  }

  // Far drawers
  LANDMARK_DRAWERS['Tugu Pahlawan silhouette'] = (c, W, baseY) => {
    const x = W * (0.62 + Math.random() * 0.15)
    const g = new PIXI.Graphics()
    // Tall obelisk-style monument
    g.rect(x - 4, baseY - 100, 8, 100).fill({ color: 0x1f2937, alpha: 0.85 })
    g.poly([x - 4, baseY - 100, x, baseY - 115, x + 4, baseY - 100]).fill({ color: 0x1f2937, alpha: 0.85 })
    // Base
    g.rect(x - 10, baseY - 6, 20, 6).fill({ color: 0x1f2937, alpha: 0.85 })
    c.addChild(g)
  }
  LANDMARK_DRAWERS['Tugu Jogja monument'] = (c, W, baseY) => {
    const x = W * (0.40 + Math.random() * 0.2)
    const g = new PIXI.Graphics()
    g.rect(x - 5, baseY - 80, 10, 80).fill({ color: 0xf3f4f6, alpha: 0.85 })
    g.circle(x, baseY - 86, 8).fill({ color: 0xf3f4f6, alpha: 0.85 })
    g.rect(x - 12, baseY - 4, 24, 4).fill({ color: 0xf3f4f6, alpha: 0.85 })
    c.addChild(g)
  }
  LANDMARK_DRAWERS['Lawang Sewu silhouette'] = (c, W, baseY) => {
    const x = W * (0.35 + Math.random() * 0.25)
    const g = new PIXI.Graphics()
    // Colonial building silhouette — 2 towers + central block
    g.rect(x - 6, baseY - 70, 4, 70).fill({ color: 0x1f2937, alpha: 0.85 })
    g.rect(x + 22, baseY - 70, 4, 70).fill({ color: 0x1f2937, alpha: 0.85 })
    g.rect(x - 4, baseY - 55, 28, 55).fill({ color: 0x1f2937, alpha: 0.85 })
    // Pyramid roofs
    g.poly([x - 8, baseY - 70, x - 4, baseY - 82, x, baseY - 70]).fill({ color: 0x1f2937, alpha: 0.85 })
    g.poly([x + 20, baseY - 70, x + 24, baseY - 82, x + 28, baseY - 70]).fill({ color: 0x1f2937, alpha: 0.85 })
    // Windows
    for (let r = 0; r < 4; r++) {
      for (let col = 0; col < 4; col++) {
        g.rect(x - 2 + col * 7, baseY - 50 + r * 12, 3, 4).fill({ color: 0xfde047, alpha: 0.7 })
      }
    }
    c.addChild(g)
  }
  LANDMARK_DRAWERS['KRL/MRT train passing'] = (c, W, baseY) => {
    const g = new PIXI.Graphics()
    // Distant train silhouette on elevated rail
    const x = W * 0.6
    g.rect(x - 60, baseY - 24, 120, 8).fill({ color: 0x60a5fa, alpha: 0.75 })
    g.rect(x - 60, baseY - 18, 120, 1).fill({ color: 0xffffff, alpha: 0.4 })
    // Pylons
    g.rect(x - 50, baseY - 14, 2, 14).fill({ color: 0x374151, alpha: 0.7 })
    g.rect(x + 50, baseY - 14, 2, 14).fill({ color: 0x374151, alpha: 0.7 })
    c.addChild(g)
  }
  LANDMARK_DRAWERS['Tea plantation field'] = (c, W, baseY) => {
    const g = new PIXI.Graphics()
    g.rect(0, baseY - 4, W, 10).fill({ color: 0x4d7c0f, alpha: 0.55 })
    // Texture: small darker dots
    for (let i = 0; i < 30; i++) {
      g.circle(Math.random() * W, baseY + Math.random() * 4, 1.5).fill({ color: 0x365314, alpha: 0.5 })
    }
    c.addChild(g)
  }

  // Mid drawers
  LANDMARK_DRAWERS['Heritage colonial block'] = (c, W, midY) => {
    // v54.64 Thomas palette: bright cream body + cherry red roof.
    const x = W * (0.10 + Math.random() * 0.7)
    const g = new PIXI.Graphics()
    g.rect(x - 18, midY - 35, 36, 35).fill({ color: 0xfff9c4, alpha: 0.95 })
    g.poly([x - 22, midY - 35, x, midY - 48, x + 22, midY - 35]).fill({ color: 0xe53935, alpha: 0.95 })
    for (let r = 0; r < 2; r++) {
      for (let col = 0; col < 4; col++) {
        g.rect(x - 14 + col * 8, midY - 28 + r * 12, 3, 5).fill({ color: 0x42a5f5, alpha: 0.85 })
      }
    }
    c.addChild(g)
  }
  LANDMARK_DRAWERS['Ruko commercial strip'] = (c, W, midY) => {
    // v54.64 Thomas palette: cycle through happy primaries (red/blue/yellow/
    // green/orange/teal) instead of muted earth tones.
    const g = new PIXI.Graphics()
    const tints = [0xe53935, 0xfb8c00, 0xfdd835, 0x43a047, 0x1e88e5, 0x8e24aa]
    for (let i = 0; i < 6; i++) {
      const x = i * (W / 6) + 10
      const w = W / 6 - 14
      g.rect(x, midY - 30, w, 30).fill({ color: tints[i % tints.length], alpha: 0.95 })
      g.rect(x, midY - 34, w, 4).fill({ color: 0x546e7a, alpha: 0.95 })
      // Lit awning/sign in cheerful yellow
      g.rect(x + 4, midY - 12, w - 8, 10).fill({ color: 0xfff59d, alpha: 0.95 })
    }
    c.addChild(g)
  }
  LANDMARK_DRAWERS['High-rise glass tower'] = (c, W, midY) => {
    // v54.64 Thomas palette: vivid sky-blue with cheerful window-band stripes.
    const x = W * (0.15 + Math.random() * 0.7)
    const g = new PIXI.Graphics()
    const h = 80 + Math.random() * 40
    g.rect(x - 18, midY - h, 36, h).fill({ color: 0x42a5f5, alpha: 0.92 })
    for (let r = 0; r < Math.floor(h / 10); r++) {
      g.rect(x - 16, midY - h + r * 10 + 1, 32, 1.5).fill({ color: 0xfff59d, alpha: 0.55 })
    }
    // Crown stripe
    g.rect(x - 18, midY - h, 36, 3).fill({ color: 0xe53935, alpha: 0.95 })
    c.addChild(g)
  }
  LANDMARK_DRAWERS['Flyover overpass'] = (c, W, midY) => {
    const g = new PIXI.Graphics()
    g.rect(0, midY - 22, W, 6).fill({ color: 0x4b5563, alpha: 0.85 })
    g.rect(0, midY - 24, W, 2).fill({ color: 0x9ca3af, alpha: 0.85 })
    // Pylons
    for (let i = 0; i < 5; i++) {
      const x = (i + 0.5) * W / 5
      g.rect(x - 3, midY - 16, 6, 16).fill({ color: 0x6b7280, alpha: 0.85 })
    }
    c.addChild(g)
  }
  LANDMARK_DRAWERS['Digital billboard'] = (c, W, midY) => {
    const x = W * (0.25 + Math.random() * 0.5)
    const g = new PIXI.Graphics()
    g.rect(x - 26, midY - 30, 52, 22).fill({ color: 0x1f2937, alpha: 0.95 })
    g.rect(x - 24, midY - 28, 48, 18).fill({ color: 0xef4444, alpha: 0.85 })
    g.rect(x - 18, midY - 22, 36, 4).fill({ color: 0xfde047, alpha: 0.95 })
    g.rect(x - 2, midY - 8, 4, 8).fill({ color: 0x6b7280, alpha: 0.85 })
    c.addChild(g)
  }
  LANDMARK_DRAWERS['Art-deco station hall'] = (c, W, midY) => {
    const x = W * 0.5
    const g = new PIXI.Graphics()
    g.rect(x - 50, midY - 36, 100, 36).fill({ color: 0xe5e7eb, alpha: 0.92 })
    g.poly([x - 50, midY - 36, x, midY - 52, x + 50, midY - 36]).fill({ color: 0xc2410c, alpha: 0.92 })
    g.rect(x - 8, midY - 28, 16, 28).fill({ color: 0x1f2937, alpha: 0.85 })
    for (let r = 0; r < 2; r++) {
      for (let col = 0; col < 6; col++) {
        if (col === 2 || col === 3) continue
        g.rect(x - 44 + col * 14, midY - 28 + r * 12, 4, 4).fill({ color: 0xfde047, alpha: 0.7 })
      }
    }
    c.addChild(g)
  }
  LANDMARK_DRAWERS['Pine grove + rumah panggung'] = (c, W, midY) => {
    const g = new PIXI.Graphics()
    for (let i = 0; i < 5; i++) {
      const x = (i / 5) * W + Math.random() * 30
      g.poly([x, midY - 36, x - 10, midY - 4, x + 10, midY - 4]).fill({ color: 0x14532d, alpha: 0.85 })
      g.rect(x - 1.5, midY - 4, 3, 4).fill({ color: 0x422006, alpha: 0.85 })
    }
    // Tiny stilt house
    const hx = W * 0.7
    g.rect(hx - 12, midY - 18, 24, 14).fill({ color: 0xfde68a, alpha: 0.85 })
    g.poly([hx - 14, midY - 18, hx, midY - 26, hx + 14, midY - 18]).fill({ color: 0x991b1b, alpha: 0.85 })
    for (let i = 0; i < 4; i++) {
      g.rect(hx - 10 + i * 6, midY - 4, 1, 4).fill({ color: 0x422006, alpha: 0.85 })
    }
    c.addChild(g)
  }
  LANDMARK_DRAWERS['Heritage cafe row'] = (c, W, midY) => {
    const g = new PIXI.Graphics()
    for (let i = 0; i < 5; i++) {
      const x = (i / 5) * W + 20
      const w = W / 5 - 30
      g.rect(x, midY - 28, w, 28).fill({ color: 0xfed7aa, alpha: 0.88 })
      g.rect(x, midY - 30, w, 4).fill({ color: 0x9a3412, alpha: 0.88 })
      // Cafe window
      g.rect(x + 4, midY - 22, w - 8, 12).fill({ color: 0xfde047, alpha: 0.8 })
    }
    c.addChild(g)
  }
  LANDMARK_DRAWERS['Malioboro arcade glow'] = (c, W, midY) => {
    const g = new PIXI.Graphics()
    g.rect(0, midY - 24, W, 22).fill({ color: 0x991b1b, alpha: 0.85 })
    // Lanterns
    for (let i = 0; i < 8; i++) {
      const x = (i + 0.5) * W / 8
      g.circle(x, midY - 8, 4).fill({ color: 0xfde047, alpha: 0.95 })
      g.rect(x - 0.5, midY - 24, 1, 12).fill({ color: 0x422006, alpha: 0.85 })
    }
    c.addChild(g)
  }
  LANDMARK_DRAWERS['Kalimas river bend'] = (c, W, midY) => {
    const g = new PIXI.Graphics()
    g.rect(0, midY + 6, W, 14).fill({ color: 0x0ea5e9, alpha: 0.65 })
    g.rect(0, midY + 6, W, 2).fill({ color: 0xffffff, alpha: 0.45 })
    g.rect(0, midY + 18, W, 2).fill({ color: 0xffffff, alpha: 0.30 })
    c.addChild(g)
  }
  LANDMARK_DRAWERS['Pedestrian bridge (JPO)'] = (c, W, midY) => {
    const g = new PIXI.Graphics()
    const x = W * 0.55
    g.rect(x - 60, midY - 30, 120, 10).fill({ color: 0x4b5563, alpha: 0.92 })
    g.rect(x - 60, midY - 20, 4, 20).fill({ color: 0x4b5563, alpha: 0.92 })
    g.rect(x + 56, midY - 20, 4, 20).fill({ color: 0x4b5563, alpha: 0.92 })
    g.rect(x - 60, midY - 32, 120, 2).fill({ color: 0x9ca3af, alpha: 0.92 })
    c.addChild(g)
  }
  LANDMARK_DRAWERS['Kota Lama heritage block'] = (c, W, midY) => {
    LANDMARK_DRAWERS['Heritage colonial block'](c, W, midY)
    LANDMARK_DRAWERS['Heritage colonial block'](c, W, midY)
  }
  LANDMARK_DRAWERS['Sam Poo Kong temple roof'] = (c, W, midY) => {
    const x = W * (0.30 + Math.random() * 0.4)
    const g = new PIXI.Graphics()
    g.rect(x - 20, midY - 26, 40, 26).fill({ color: 0xb91c1c, alpha: 0.92 })
    g.poly([x - 26, midY - 26, x, midY - 42, x + 26, midY - 26]).fill({ color: 0x7f1d1d, alpha: 0.92 })
    // Curved eaves (approx)
    g.rect(x - 28, midY - 30, 56, 4).fill({ color: 0xfbbf24, alpha: 0.85 })
    c.addChild(g)
  }
  LANDMARK_DRAWERS['Heritage low-rise row'] = (c, W, midY) => {
    // v54.64 Thomas palette: bright cream + cherry red gabled roofs.
    const g = new PIXI.Graphics()
    for (let i = 0; i < 4; i++) {
      const x = i * (W / 4) + 20
      const w = W / 4 - 30
      g.rect(x, midY - 26, w, 26).fill({ color: 0xfff9c4, alpha: 0.95 })
      g.poly([x - 4, midY - 26, x + w / 2, midY - 38, x + w + 4, midY - 26]).fill({ color: 0xe53935, alpha: 0.95 })
      g.rect(x + 6, midY - 14, 4, 8).fill({ color: 0x42a5f5, alpha: 0.85 })
      g.rect(x + w - 10, midY - 14, 4, 8).fill({ color: 0x42a5f5, alpha: 0.85 })
    }
    c.addChild(g)
  }
  LANDMARK_DRAWERS['Banyan tree (beringin)'] = (c, W, midY) => {
    // v54.64 Thomas palette: happy bright green foliage.
    const x = W * (0.6 + Math.random() * 0.3)
    const g = new PIXI.Graphics()
    g.rect(x - 3, midY - 14, 6, 14).fill({ color: 0x6d4c41, alpha: 0.92 })
    g.circle(x, midY - 26, 18).fill({ color: 0x66bb6a, alpha: 0.95 })
    g.circle(x - 12, midY - 18, 12).fill({ color: 0x81c784, alpha: 0.9 })
    g.circle(x + 12, midY - 18, 12).fill({ color: 0x81c784, alpha: 0.9 })
    c.addChild(g)
  }
  LANDMARK_DRAWERS['Becak/andong silhouette'] = (c, W, midY) => {
    const x = W * (0.4 + Math.random() * 0.5)
    const g = new PIXI.Graphics()
    // Becak cabin
    g.rect(x - 12, midY - 16, 18, 14).fill({ color: 0xef4444, alpha: 0.92 })
    g.poly([x - 14, midY - 16, x, midY - 24, x + 8, midY - 16]).fill({ color: 0xef4444, alpha: 0.92 })
    // Wheel + bike
    g.circle(x - 8, midY - 2, 5).fill({ color: 0x1f2937, alpha: 0.85 })
    g.circle(x + 12, midY - 2, 4).fill({ color: 0x1f2937, alpha: 0.85 })
    g.rect(x + 8, midY - 12, 6, 1.5).fill({ color: 0x1f2937, alpha: 0.85 })
    c.addChild(g)
  }

  // ── Register layer setup/tick on engine init ──────────────────────────────
  // We attach to layers AFTER caller invokes TrainBG.init(), via this hook.
  function attachAll () {
    const layers = TrainBG.layers()
    if (!layers || !layers.sky) return false
    layers.sky._setup     = setupSky
    layers.sky._tick      = tickSky
    layers.farFar._setup  = setupFarFar
    layers.far._setup     = setupFar
    layers.mid._setup     = setupMid
    layers.weather._setup = setupWeather
    layers.weather._tick  = tickWeather
    layers.lighting._setup= setupLighting
    return true
  }

  // ── Public renderer API ───────────────────────────────────────────────────
  TrainBG.Renderers = {
    version: '54.62',
    attachAll,
    LANDMARK_DRAWERS,
    setupSky, tickSky,
    setupFarFar, setupFar, setupMid,
    setupWeather, tickWeather,
    setupLighting,
  }
})(typeof window !== 'undefined' ? window : globalThis)
