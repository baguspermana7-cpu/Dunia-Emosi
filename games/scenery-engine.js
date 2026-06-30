/* =============================================================================
 * scenery-engine.js — window.SceneryEngine  (v1.0.0, 2026-06-30)
 * =============================================================================
 * SHARED rich atmospheric parallax nature scene for the Dunia Emosi side-scrollers
 * (M-303 — one shared engine, not per-game hardcoded). Owner wanted the side game's
 * pemandangan as nice as the true-3D mockup: "bagus pemandangan, rumput, gunung,
 * matahari buatan" — a glowing artificial sun, layered hazy mountains, detailed grass,
 * soft clouds, real depth. Built with crisp VECTOR graphics (HD at any resolution,
 * lightweight — no pixel-art, no three.js) and dt-clamped parallax for the tablet.
 *
 * Layers (back→front): sky gradient · sun + glow + god-rays · far mountains (hazed) ·
 * near mountains · rolling hills · clouds · tree line · detailed grass foreground.
 *
 * API:
 *   const sc = SceneryEngine.mount(stage, app, { timeOfDay:'sore', seed:7, insertIndex:0 })
 *   sc.tick(worldSpeed, dtFrames)   // scroll layers by depth
 *   sc.resize()                     // rebuild to the new viewport
 *   sc.destroy()
 * ========================================================================== */
;(function (global) {
  'use strict'
  const PIXI = global.PIXI
  if (!PIXI) { global.SceneryEngine = { mount() { return null } }; return }

  // ── time-of-day palettes (dusk = the look the owner liked in the mockup) ──
  const PAL = {
    pagi: {
      sky: [0xbfe6ff, 0xd9f0ff, 0xe9f6ef, 0xdaf0df],
      sun: 0xfff6d8, sunGlow: 0xffeaa6, sunX: 0.80, sunY: 0.24, sunR: 0.072,
      mtnFar: 0x9db4c6, mtnNear: 0x6e8aa0, hill: 0x6aa05f, hillDk: 0x4f8450,
      haze: 0xe3f0f6, tree: 0x356048, grassTop: 0x6fae5e, grassDk: 0x3f7a3c, cloud: 0xffffff,
    },
    siang: {
      sky: [0x6fb7ed, 0x97cdf2, 0xc7e7f7, 0xe6f4e8],
      sun: 0xfffbe0, sunGlow: 0xfff2b0, sunX: 0.58, sunY: 0.18, sunR: 0.055,
      mtnFar: 0x8fb0bd, mtnNear: 0x6f9277, hill: 0x67a356, hillDk: 0x4d8340,
      haze: 0xeaf6ef, tree: 0x2f6242, grassTop: 0x74b85e, grassDk: 0x437f3a, cloud: 0xffffff,
    },
    sore: {
      sky: [0x35306a, 0x6a4a86, 0xb56a7e, 0xeb9a5f, 0xf7cf94],
      sun: 0xfff0c4, sunGlow: 0xff9d52, sunX: 0.66, sunY: 0.46, sunR: 0.095,
      mtnFar: 0x7d6f95, mtnNear: 0x5a4f74, hill: 0x6e5e52, hillDk: 0x4d4038,
      haze: 0xe8b78a, tree: 0x3a2f44, grassTop: 0x7c7250, grassDk: 0x53492f, cloud: 0xf3d9c4,
    },
  }

  function rng(seed) {
    let s = (seed >>> 0) || 1
    return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  }
  function lerpHex(a, b, t) {
    const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255
    const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255
    return ((Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t))
  }

  // a horizontally-tiled layer: draw the pattern at width=tileW twice, scroll + wrap.
  function tiled(parent, tileW, speed, drawFn) {
    const c = new PIXI.Container()
    for (let i = 0; i < 2; i++) { const g = new PIXI.Graphics(); drawFn(g); g.x = i * tileW; c.addChild(g) }
    c._tileW = tileW; c._speed = speed; c._scroll = 0
    parent.addChild(c)
    return c
  }

  function paintSky(g, W, H, pal) {
    const stops = pal.sky, n = stops.length
    const bands = 28
    for (let i = 0; i < bands; i++) {
      const t = i / (bands - 1), f = t * (n - 1), k = Math.min(n - 2, Math.floor(f))
      g.rect(0, H * i / bands, W, H / bands + 1).fill(lerpHex(stops[k], stops[k + 1], f - k))
    }
  }

  function paintSun(g, W, H, pal) {
    const cx = W * pal.sunX, cy = H * pal.sunY, R = Math.min(W, H) * pal.sunR
    // soft outer glow (concentric, fading)
    for (let i = 10; i >= 1; i--) {
      g.circle(cx, cy, R * (1 + i * 0.55)).fill({ color: pal.sunGlow, alpha: 0.05 + 0.012 * (10 - i) })
    }
    // faint god-rays
    for (let r = 0; r < 10; r++) {
      const a = (r / 10) * Math.PI * 2 + 0.2, len = R * (4.5 + (r % 3))
      const wx = Math.cos(a + Math.PI / 2) * R * 0.32, wy = Math.sin(a + Math.PI / 2) * R * 0.32
      g.poly([cx, cy, cx + Math.cos(a) * len + wx, cy + Math.sin(a) * len + wy, cx + Math.cos(a) * len - wx, cy + Math.sin(a) * len - wy]).fill({ color: pal.sunGlow, alpha: 0.045 })
    }
    // bright core
    g.circle(cx, cy, R * 1.3).fill({ color: pal.sun, alpha: 0.9 })
    g.circle(cx, cy, R).fill({ color: 0xffffff, alpha: 0.85 })
  }

  // jagged mountain ridge spanning tileW, periodic at the edges for seamless wrap
  function paintRidge(g, tileW, baseY, H, peak, col, rnd, hazeCol, hazeAmt) {
    const segs = 9, pts = [[0, baseY]]
    for (let i = 1; i < segs; i++) {
      const x = tileW * i / segs
      const y = baseY - peak * (0.35 + rnd() * 0.65) * (i === 1 || i === segs - 1 ? 0.4 : 1)
      pts.push([x, y])
    }
    pts.push([tileW, baseY])
    const poly = []
    pts.forEach(p => poly.push(p[0], p[1]))
    poly.push(tileW, H, 0, H)
    g.poly(poly).fill(col)
    // lighter top rim
    g.poly(poly).stroke({ color: lerpHex(col, 0xffffff, 0.25), width: 2, alpha: 0.5 })
    if (hazeAmt > 0) { g.rect(0, baseY - peak, tileW, H - (baseY - peak)).fill({ color: hazeCol, alpha: hazeAmt }) }
  }

  function paintHills(g, tileW, baseY, H, col, amp) {
    const poly = [0, H]
    for (let x = 0; x <= tileW; x += 22) poly.push(x, baseY - Math.sin((x / tileW) * Math.PI * 2) * amp - amp * 0.5)
    poly.push(tileW, H)
    g.poly(poly).fill(col)
  }

  function paintClouds(g, tileW, H, pal, rnd) {
    for (let i = 0; i < 4; i++) {
      const cx = rnd() * tileW, cy = H * (0.1 + rnd() * 0.28), s = 0.7 + rnd() * 0.8
      ;[[0, 0, 30], [-26, 6, 22], [28, 6, 24], [4, -14, 20]].forEach(c =>
        g.ellipse(cx + c[0] * s, cy + c[1] * s, c[2] * s * 1.3, c[2] * s * 0.8).fill({ color: pal.cloud, alpha: 0.85 }))
    }
  }

  function paintTrees(g, tileW, baseY, pal, rnd) {
    for (let x = 8; x < tileW; x += 46 + rnd() * 26) {
      const h = 28 + rnd() * 34
      g.poly([x, baseY, x + 13, baseY - h, x + 26, baseY]).fill(pal.tree)
      g.poly([x + 2, baseY - h * 0.4, x + 13, baseY - h * 1.35, x + 24, baseY - h * 0.4]).fill(lerpHex(pal.tree, 0xffffff, 0.12))
    }
  }

  function paintGrass(g, tileW, H, pal, rnd) {
    const topY = H * 0.9
    // ground gradient band
    const bands = 8, gh = H - topY
    for (let i = 0; i < bands; i++) g.rect(0, topY + gh * i / bands, tileW, gh / bands + 1).fill(lerpHex(pal.grassTop, pal.grassDk, i / (bands - 1)))
    // dense detailed blades + tufts + flowers
    for (let x = 0; x < tileW; x += 6 + rnd() * 6) {
      const bh = 14 + rnd() * 26, lean = (rnd() - 0.5) * 10
      const c = lerpHex(pal.grassDk, pal.grassTop, rnd())
      g.moveTo(x, H).quadraticCurveTo(x + lean * 0.5, H - bh * 0.6, x + lean, H - bh).stroke({ color: c, width: 2 + rnd() * 1.5, alpha: 0.9 })
      if (rnd() < 0.06) g.circle(x + lean, H - bh, 2.4).fill({ color: rnd() < 0.5 ? 0xffd76a : 0xff9ec4, alpha: 0.9 })
    }
  }

  function build(stage, app, opts) {
    opts = opts || {}
    const W = app.screen.width, H = app.screen.height
    const pal = PAL[opts.timeOfDay] || PAL.pagi
    const rnd = rng((opts.seed || 1) * 2654435761 % 2147483647)
    const root = new PIXI.Container()
    const layers = []

    // 1 sky (static)
    { const g = new PIXI.Graphics(); paintSky(g, W, H, pal); root.addChild(g) }
    // 2 sun (very slow parallax)
    const sun = new PIXI.Container(); { const g = new PIXI.Graphics(); paintSun(g, W, H, pal); sun.addChild(g) }
    sun._speed = 0.04; sun._scroll = 0; sun._noWrap = true; root.addChild(sun); layers.push(sun)
    // 3 far mountains (hazed)
    layers.push(tiled(root, W, 0.12, g => paintRidge(g, W, H * 0.60, H, H * 0.26, pal.mtnFar, rnd, pal.haze, 0.22)))
    // 4 near mountains
    layers.push(tiled(root, W, 0.24, g => paintRidge(g, W, H * 0.70, H, H * 0.34, pal.mtnNear, rnd, pal.haze, 0.10)))
    // 5 clouds (slow)
    layers.push(tiled(root, W, 0.16, g => paintClouds(g, W, H, pal, rnd)))
    // 6 rolling hills
    layers.push(tiled(root, W, 0.40, g => paintHills(g, W, H * 0.80, H, pal.hillDk, H * 0.05)))
    layers.push(tiled(root, W, 0.55, g => paintHills(g, W, H * 0.86, H, pal.hill, H * 0.045)))
    // 7 tree line
    layers.push(tiled(root, W, 0.72, g => paintTrees(g, W, H * 0.88, pal, rnd)))
    // 8 detailed grass foreground (fast = close)
    layers.push(tiled(root, W, 1.0, g => paintGrass(g, W, H, pal, rnd)))

    if (typeof opts.insertIndex === 'number') stage.addChildAt(root, opts.insertIndex)
    else stage.addChild(root)
    return { root, layers, W, H, pal }
  }

  function mount(stage, app, opts) {
    if (!stage || !app) return null
    let st = build(stage, app, opts)
    return {
      container: st.root,
      tick(worldSpeed, dt) {
        const d = Math.min(dt || 1, 2)            // dt-clamp (throttled tablet)
        const sp = (worldSpeed || 1)
        for (const L of st.layers) {
          L._scroll += L._speed * sp * d * 0.6
          if (L._noWrap) { L.x = -L._scroll * 0.4; continue }   // sun drifts a touch, no wrap
          let x = -(L._scroll % L._tileW)
          L.x = x
        }
      },
      resize() {
        try { st.root.destroy({ children: true }) } catch (_) {}
        st = build(stage, app, opts)
        this.container = st.root
      },
      setTime(t) { opts.timeOfDay = t; this.resize() },
      destroy() { try { st.root.destroy({ children: true }) } catch (_) {} },
    }
  }

  global.SceneryEngine = { version: '1.0.0', mount }
})(typeof window !== 'undefined' ? window : this)
