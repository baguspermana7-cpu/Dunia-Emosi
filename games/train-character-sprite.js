// Character Train Sprite Engine (CTSE) — shared module for G15 + G16
// Mounts a bg-removed WebP locomotive sprite with animated wheel overlay, steam smoke,
// and subtle body bob so it feels alive instead of being a static image.
// See documentation/CODING-STANDARDS.md "Character Train Sprite Engine" (TODO).
(function(){
  // Default smoke particle style — gray ellipse, fades while rising + expanding
  function createSmokePuff(stage, x, y) {
    if (!stage || !PIXI) return null
    const g = new PIXI.Graphics()
    const size = 6 + Math.random() * 6
    g.circle(0, 0, size).fill({ color: 0xcccccc, alpha: 0.75 })
    g.x = x + (Math.random() - 0.5) * 4
    g.y = y
    stage.addChild(g)
    return {
      g,
      vx: -0.4 + Math.random() * 0.8,
      vy: -1.2 - Math.random() * 0.6,
      growth: 0.035 + Math.random() * 0.03,
      alphaDecay: 0.012 + Math.random() * 0.008,
      life: 1
    }
  }

  function mount(container, config) {
    if (!container || !config) return null
    const state = {
      container,
      config,
      sprite: null,
      wheels: [],
      smokeParticles: [],
      baseY: container.y || 0,
      bobFrame: 0,
      bobFreq: config.bodyBobFreq || 0.08,
      bobAmp: config.bodyBobAmp || 1.5,
      smokeTimer: 0,
      smokeInterval: config.smokeInterval || 10, // frames between puffs
      smokeParent: null, // assigned by caller via setSmokeParent
      speed: 1,
      disposed: false
    }

    // Async sprite load with emoji fallback
    const placeholder = new PIXI.Text({
      text: '🚂',
      style: { fontSize: 64, fontFamily: 'Arial' }
    })
    placeholder.anchor.set(0.5, 1) // bottom-center
    container.addChild(placeholder)
    state.sprite = placeholder

    if (config.spriteUrl && window.PIXI && PIXI.Assets) {
      PIXI.Assets.load(config.spriteUrl).then(tex => {
        if (state.disposed || !tex) return
        if (placeholder && placeholder.parent) container.removeChild(placeholder)
        const s = new PIXI.Sprite(tex)
        s.anchor.set(0.5, 1) // bottom-center anchor so wheels line up at baseline
        // Scale to a reasonable size — target height ~80-100px
        const targetH = config.spriteHeight || 90
        s.scale.set(targetH / tex.height)
        container.addChildAt(s, 0) // behind wheels
        state.sprite = s
      }).catch(err => console.warn('[CTSE] sprite load failed', config.spriteUrl, err))
    }

    // Wheel overlay — each wheel is a PIXI.Graphics container that rotates independently
    if (Array.isArray(config.wheelPositions)) {
      config.wheelPositions.forEach(pos => {
        const [wx, wy, wr] = pos
        const wc = new PIXI.Container()
        wc.x = wx; wc.y = wy
        // Outer tire
        const tire = new PIXI.Graphics()
        tire.circle(0, 0, wr).fill({ color: 0x1a1a1a })
        tire.circle(0, 0, wr).stroke({ color: 0x333, width: 2 })
        // Inner hub
        tire.circle(0, 0, wr * 0.45).fill({ color: 0x555555 })
        // Spokes — 4 radial lines so rotation is visually detectable
        for (let i = 0; i < 4; i++) {
          const ang = (i / 4) * Math.PI * 2
          tire.moveTo(0, 0).lineTo(Math.cos(ang) * wr * 0.85, Math.sin(ang) * wr * 0.85).stroke({ color: 0x888, width: 1.5 })
        }
        wc.addChild(tire)
        container.addChild(wc)
        state.wheels.push(wc)
      })
    }

    // Methods
    state.tick = function(dt, currentSpeed) {
      if (state.disposed) return
      const s = currentSpeed !== undefined ? currentSpeed : state.speed
      state.bobFrame += dt
      // Body bob — translate sprite only (not wheels, so they stay on baseline)
      if (state.sprite) {
        state.sprite.y = Math.sin(state.bobFrame * state.bobFreq) * state.bobAmp
      }
      // Wheel rotation — scale with speed
      const rot = s * dt * 0.12
      state.wheels.forEach(wc => { wc.rotation += rot })
      // Auto-spawn smoke if parent assigned
      if (state.smokeParent) {
        state.smokeTimer += dt
        if (state.smokeTimer >= state.smokeInterval) {
          state.smokeTimer = 0
          state.spawnSmoke()
        }
      }
      // Update existing smoke particles
      for (let i = state.smokeParticles.length - 1; i >= 0; i--) {
        const p = state.smokeParticles[i]
        p.g.x += p.vx * dt
        p.g.y += p.vy * dt
        p.g.scale.x = p.g.scale.y = p.g.scale.x + p.growth * dt
        p.life -= p.alphaDecay * dt
        p.g.alpha = Math.max(0, p.life * 0.75)
        if (p.life <= 0 && p.g.parent) {
          p.g.parent.removeChild(p.g)
          state.smokeParticles.splice(i, 1)
        }
      }
    }

    state.setSmokeParent = function(stage) { state.smokeParent = stage }

    state.spawnSmoke = function() {
      // No smoke for trains without a chimney (electric/tram) — skip silently
      if (!state.smokeParent || !config.smokePos || !Array.isArray(config.smokePos)) return
      // Smoke position = container world coord + local smokePos offset
      const [sx, sy] = config.smokePos
      const worldX = (container.x || 0) + sx
      const worldY = state.baseY + sy
      const puff = createSmokePuff(state.smokeParent, worldX, worldY)
      if (puff) state.smokeParticles.push(puff)
    }

    state.setSpeed = function(s) { state.speed = s }

    state.dispose = function() {
      state.disposed = true
      state.wheels.forEach(wc => { if (wc.parent) wc.parent.removeChild(wc) })
      state.smokeParticles.forEach(p => { if (p.g.parent) p.g.parent.removeChild(p.g) })
      state.wheels = []
      state.smokeParticles = []
      if (state.sprite && state.sprite.parent) state.sprite.parent.removeChild(state.sprite)
    }

    return state
  }

  // Produce a new config with all geometry multiplied by `s`.
  // Used by G15+G16 buildTrain to scale character trains responsively —
  // base values in trains-db.js represent PC (scale=1) dimensions.
  function scaleConfig(cfg, s) {
    if (!cfg) return cfg
    if (!(s > 0) || s === 1) return cfg
    const out = Object.assign({}, cfg)
    if (typeof cfg.spriteHeight === 'number') out.spriteHeight = cfg.spriteHeight * s
    if (typeof cfg.bottomPaddingOffset === 'number') out.bottomPaddingOffset = cfg.bottomPaddingOffset * s
    if (typeof cfg.bodyBobAmp === 'number') out.bodyBobAmp = cfg.bodyBobAmp * s
    if (Array.isArray(cfg.wheelPositions)) {
      out.wheelPositions = cfg.wheelPositions.map(p => [p[0] * s, p[1] * s, p[2] * s])
    }
    if (Array.isArray(cfg.smokePos)) out.smokePos = [cfg.smokePos[0] * s, cfg.smokePos[1] * s]
    return out
  }

  window.CharacterTrain = { mount, createSmokePuff, scaleConfig }
})()
