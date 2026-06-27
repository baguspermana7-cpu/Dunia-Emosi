/* =============================================================================
 * games/indo-scene.js — IndoScene (v1, 2026-06-27)
 * =============================================================================
 * Procedural PixiJS-8 drawer for the Indonesian side-view train landscape from
 * the owner's reference: Merapi volcano + smoke, distant mountains, terraced
 * rice fields (sawah), traditional joglo houses, coconut palms, telephone poles
 * + wires, and a realistic 3-lane ballast/sleeper/steel rail bed. Soft-pastel,
 * with 4 time-of-day moods (day / rain / sore / malam) and parallax-3D depth.
 *
 * NO raster assets — everything is vector Graphics so it scales crisp to any
 * screen. Shared by balapan-kereta (g14) + lokomotif-pemberani (g15).
 *
 * API (all draw into a PIXI.Container you own, so the game keeps its layers):
 *   IndoScene.palette(timeKey)                      → color tokens for a mood
 *   IndoScene.paintSky(g, W, H, pal)                → sky gradient bands
 *   IndoScene.volcano(W, H, pal)                    → Container (Merapi + smoke)
 *   IndoScene.mountains(W, H, pal)                  → Container (distant range)
 *   IndoScene.cloud(pal), IndoScene.tickSmoke(...)  → puffs
 *   IndoScene.sawahBand(W, y, h, pal)               → terraced paddy strip
 *   IndoScene.house(pal), IndoScene.palm(pal),
 *   IndoScene.tree(pal), IndoScene.pole(pal)        → Container per prop
 *   IndoScene.ballastLane(W, cy, half, pal)         → one lane bed (ballast+ties+rail)
 *   IndoScene.TIME = ['day','rain','sore','malam']
 * Plus IndoScene.demo(PIXI, stage, W, H, timeKey)   → full standalone scene
 *   (used by the test harness; the games call the granular drawers).
 * ========================================================================== */
(function () {
  'use strict'
  if (typeof window === 'undefined') return
  var P = window.PIXI

  // ── soft-pastel palettes per time-of-day ───────────────────────────────
  var PALETTES = {
    day: {
      skyTop: 0x8fc6ef, skyMid: 0xbfe2f5, skyBot: 0xe9f6fb,
      sun: 0xfff3c4, sunGlow: 0xfff7e0,
      mtnFar: 0x9fb8d6, mtnNear: 0x7c9ec4, volcano: 0x6b5d57, volcanoTop: 0xece4df,
      crater: 0xb5562f, smoke: 0xdfe4ea,
      sawah1: 0x8fd17a, sawah2: 0x6fbf63, sawah3: 0x57a84f, water: 0xbfe9d2,
      grass: 0x7fc06a, grassDk: 0x5aa257,
      house: 0xf6efe2, roof: 0xc6552f, roof2: 0xd98a3a, door: 0x7a4a2c,
      palmTrunk: 0x8a6a44, palmLeaf: 0x4f9e4a, treeLeaf: 0x66b85a, treeDk: 0x4f9543,
      pole: 0x9a8c7a, wire: 0x55524d,
      ballast: 0xb9a07e, ballastDk: 0x9c8463, tie: 0x6e4a32, rail: 0xc9d2da, railShine: 0xeef3f7,
      cloud: 0xffffff, cloudA: 0.9, haze: 0xdfeef7, tint: 0xffffff, dim: 0,
      stars: false, rain: false
    },
    rain: {
      skyTop: 0x6c7a8c, skyMid: 0x8c98a6, skyBot: 0xb3bcc4,
      sun: 0x9fb0c0, sunGlow: 0xb9c4cf,
      mtnFar: 0x7a8694, mtnNear: 0x68727f, volcano: 0x55504c, volcanoTop: 0xc8c8c6,
      crater: 0x8a4a30, smoke: 0xb8bcc0,
      sawah1: 0x6f9a66, sawah2: 0x5a8a54, sawah3: 0x497845, water: 0x9fc2bd,
      grass: 0x5f8c5a, grassDk: 0x466b44,
      house: 0xd7d2c8, roof: 0xa1492c, roof2: 0xb0743a, door: 0x5e3c25,
      palmTrunk: 0x6f573a, palmLeaf: 0x468145, treeLeaf: 0x53935080 ? 0x539350 : 0x539350, treeDk: 0x3f7340,
      pole: 0x7c7468, wire: 0x44423e,
      ballast: 0x8f8270, ballastDk: 0x756a5b, tie: 0x564030, rail: 0xaab4bd, railShine: 0xccd6dd,
      cloud: 0xc6ccd2, cloudA: 0.95, haze: 0xb8c4cc, tint: 0xc9d2da, dim: 0.18,
      stars: false, rain: true
    },
    sore: {
      skyTop: 0x6b4a7e, skyMid: 0xe08a5b, skyBot: 0xffd29a,
      sun: 0xffb070, sunGlow: 0xffd9a8,
      mtnFar: 0x8a6f95, mtnNear: 0x6f5577, volcano: 0x5a4a4e, volcanoTop: 0xe9cdb8,
      crater: 0xd2622f, smoke: 0xd8b4a0,
      sawah1: 0x86955a, sawah2: 0x6f8050, sawah3: 0x5b6c46, water: 0xe6c69a,
      grass: 0x7e8a52, grassDk: 0x5e6a42,
      house: 0xf3e0cb, roof: 0xb84d2c, roof2: 0xcf7a36, door: 0x6a3f27,
      palmTrunk: 0x7a5a3c, palmLeaf: 0x6f8a4a, treeLeaf: 0x84934f, treeDk: 0x64713f,
      pole: 0x8a7660, wire: 0x4e463d,
      ballast: 0xb38f6e, ballastDk: 0x917152, tie: 0x5e4230, rail: 0xd9b48f, railShine: 0xffe6c4,
      cloud: 0xffd9b0, cloudA: 0.85, haze: 0xf2c79a, tint: 0xffcaa0, dim: 0.08,
      stars: false, rain: false
    },
    malam: {
      skyTop: 0x0c1430, skyMid: 0x1b2350, skyBot: 0x39406e,
      sun: 0xf2efc8, sunGlow: 0xf6f3d8,
      mtnFar: 0x2a3358, mtnNear: 0x222a4a, volcano: 0x2a2533, volcanoTop: 0x55617e,
      crater: 0xc05a2f, smoke: 0x4a5170,
      sawah1: 0x3a5440, sawah2: 0x2f4636, sawah3: 0x27382c, water: 0x3f5a66,
      grass: 0x33513a, grassDk: 0x263e2c,
      house: 0x5b5e72, roof: 0x6e3a2c, roof2: 0x7a5236, door: 0xffe6a0,
      palmTrunk: 0x4a3f33, palmLeaf: 0x2f5740, treeLeaf: 0x37603c, treeDk: 0x2a4a30,
      pole: 0x4c4858, wire: 0x2a2838,
      ballast: 0x55504c, ballastDk: 0x423d3a, tie: 0x352a22, rail: 0x7a8694, railShine: 0xaab6c2,
      cloud: 0x3a4060, cloudA: 0.75, haze: 0x2a3252, tint: 0x6a76a0, dim: 0.30,
      stars: true, rain: false
    }
  }
  PALETTES.rain.treeLeaf = 0x539350
  var TIME = ['day', 'rain', 'sore', 'malam']
  function palette(k) { return PALETTES[k] || PALETTES.day }

  // ── helpers ─────────────────────────────────────────────────────────────
  function gfx() { return new P.Graphics() }
  function cont() { return new P.Container() }

  // sky: stacked horizontal bands → smooth gradient (Graphics has no gradient fill)
  function paintSky(g, W, H, pal) {
    var steps = 24
    for (var i = 0; i < steps; i++) {
      var t = i / (steps - 1)
      var c = t < 0.5 ? _lerp(pal.skyTop, pal.skyMid, t * 2) : _lerp(pal.skyMid, pal.skyBot, (t - 0.5) * 2)
      g.rect(0, (H / steps) * i, W, H / steps + 1).fill({ color: c })
    }
    if (pal.stars) {
      for (var s = 0; s < 60; s++) {
        var sx = (s * 137.5) % W, sy = (s * 61.7) % (H * 0.55)
        g.circle(sx, sy, s % 5 === 0 ? 1.6 : 0.9).fill({ color: 0xffffff, alpha: 0.35 + 0.4 * ((s * 7) % 5) / 5 })
      }
    }
    return g
  }

  // Merapi volcano + crater glow + (animated) smoke handled by tickSmoke
  function volcano(W, H, pal) {
    var c = cont()
    var baseY = H, cx = W * 0.5, vw = W * 0.42, vh = H * 0.62
    var g = gfx()
    // cone
    g.moveTo(cx - vw / 2, baseY)
      .lineTo(cx - vw * 0.12, baseY - vh)
      .lineTo(cx + vw * 0.12, baseY - vh)
      .lineTo(cx + vw / 2, baseY)
      .closePath().fill({ color: pal.volcano })
    // lit right face
    g.moveTo(cx, baseY - vh * 0.98).lineTo(cx + vw * 0.12, baseY - vh).lineTo(cx + vw / 2, baseY).lineTo(cx, baseY).closePath().fill({ color: _lerp(pal.volcano, 0xffffff, 0.10) })
    // snow / ash cap
    g.moveTo(cx - vw * 0.12, baseY - vh).lineTo(cx - vw * 0.02, baseY - vh * 0.86).lineTo(cx + vw * 0.06, baseY - vh * 0.92).lineTo(cx + vw * 0.12, baseY - vh).closePath().fill({ color: pal.volcanoTop })
    // crater glow
    g.ellipse(cx, baseY - vh + 2, vw * 0.12, 5).fill({ color: pal.crater, alpha: 0.85 })
    c.addChild(g)
    c._craterX = cx; c._craterY = baseY - vh
    return c
  }

  // distant mountain range silhouette (repeatable across width)
  function mountains(W, H, pal) {
    var c = cont(), g = gfx(), baseY = H
    var x = -40
    while (x < W + 80) {
      var mw = 90 + ((x * 53) % 90), mh = 50 + ((x * 31) % 70)
      g.moveTo(x, baseY).lineTo(x + mw / 2, baseY - mh).lineTo(x + mw, baseY).closePath().fill({ color: pal.mtnFar, alpha: 0.9 })
      x += mw * 0.7
    }
    c.addChild(g)
    return c
  }

  // soft cloud puff
  function cloud(pal, scale) {
    var g = gfx(), s = scale || 1
    ;[[0, 0, 26], [22, 4, 20], [-22, 5, 18], [10, -8, 18]].forEach(function (p) {
      g.ellipse(p[0] * s, p[1] * s, p[2] * s, p[2] * 0.7 * s).fill({ color: pal.cloud, alpha: pal.cloudA })
    })
    return g
  }

  // ── mid-ground props ────────────────────────────────────────────────────
  // terraced rice field strip (stepped paddies), tileable horizontally
  function sawahBand(W, y, h, pal) {
    var g = gfx()
    var rows = 5
    for (var r = 0; r < rows; r++) {
      var ry = y + (h / rows) * r
      var rh = h / rows + 1
      var col = [pal.sawah3, pal.sawah1, pal.sawah2, pal.sawah1, pal.sawah3][r % 5]
      // each terrace steps slightly (near rows a touch lower-left → paddy feel)
      g.rect(0, ry, W, rh).fill({ color: col })
      // bright water lip at the front edge of each terrace
      g.rect(0, ry + rh - 3, W, 3).fill({ color: pal.water, alpha: 0.85 })
      g.rect(0, ry + rh - 4, W, 1).fill({ color: 0xffffff, alpha: 0.25 })
      // sparse rice tufts
      for (var fx = (r * 13) % 30; fx < W; fx += 34) g.circle(fx, ry + rh * 0.5, 1.6).fill({ color: _lerp(col, 0xffffff, 0.25), alpha: 0.5 })
    }
    return g
  }

  // traditional house: white wall + pitched joglo roof
  function house(pal, scale) {
    var c = cont(), g = gfx(), s = scale || 1
    var w = 48 * s, h = 30 * s
    g.rect(-w / 2, -h, w, h).fill({ color: pal.house })           // wall
    g.rect(-w / 2, -h, w, 3 * s).fill({ color: 0x000000, alpha: 0.06 })
    // joglo roof — wide eaves, layered
    g.moveTo(-w * 0.62, -h).lineTo(0, -h - 22 * s).lineTo(w * 0.62, -h).closePath().fill({ color: pal.roof })
    g.moveTo(-w * 0.42, -h - 12 * s).lineTo(0, -h - 30 * s).lineTo(w * 0.42, -h - 12 * s).closePath().fill({ color: pal.roof2 })
    // door + windows
    g.rect(-6 * s, -h * 0.9, 12 * s, h * 0.9).fill({ color: pal.door })
    g.rect(-w * 0.4, -h * 0.7, 9 * s, 9 * s).fill({ color: pal.door, alpha: 0.5 })
    g.rect(w * 0.4 - 9 * s, -h * 0.7, 9 * s, 9 * s).fill({ color: pal.door, alpha: 0.5 })
    c.addChild(g)
    return c
  }

  // coconut palm: thin curved trunk + frond burst
  function palm(pal, scale) {
    var c = cont(), g = gfx(), s = scale || 1, th = 60 * s
    // trunk
    g.moveTo(-3 * s, 0).quadraticCurveTo(2 * s, -th * 0.5, -2 * s, -th).lineTo(2 * s, -th).quadraticCurveTo(6 * s, -th * 0.5, 3 * s, 0).closePath().fill({ color: pal.palmTrunk })
    // fronds
    var fy = -th
    for (var a = 0; a < 7; a++) {
      var ang = (-Math.PI * 0.92) + (a / 6) * (Math.PI * 0.84)
      var ex = Math.cos(ang) * 30 * s, ey = Math.sin(ang) * 22 * s
      g.moveTo(0, fy).quadraticCurveTo(ex * 0.5, fy + ey * 0.5 - 6 * s, ex, fy + ey)
        .quadraticCurveTo(ex * 0.5, fy + ey * 0.5 + 2 * s, 0, fy).fill({ color: a % 2 ? pal.palmLeaf : _lerp(pal.palmLeaf, 0x000000, 0.12) })
    }
    g.circle(0, fy, 4 * s).fill({ color: 0x6b4a2c })  // coconuts hub
    c.addChild(g)
    return c
  }

  // round leafy tree
  function tree(pal, scale) {
    var c = cont(), g = gfx(), s = scale || 1
    g.rect(-3 * s, -18 * s, 6 * s, 18 * s).fill({ color: pal.palmTrunk })
    g.circle(-9 * s, -24 * s, 14 * s).fill({ color: pal.treeDk })
    g.circle(9 * s, -24 * s, 14 * s).fill({ color: pal.treeDk })
    g.circle(0, -34 * s, 17 * s).fill({ color: pal.treeLeaf })
    c.addChild(g)
    return c
  }

  // telephone pole + sagging wires
  function pole(pal, scale) {
    var c = cont(), g = gfx(), s = scale || 1, ph = 70 * s
    g.rect(-2.5 * s, -ph, 5 * s, ph).fill({ color: pal.pole })
    g.rect(-14 * s, -ph + 8 * s, 28 * s, 4 * s).fill({ color: pal.pole })  // crossarm
    g.rect(-9 * s, -ph + 2 * s, 18 * s, 4 * s).fill({ color: pal.pole })
    c.addChild(g)
    c._wireY = -ph + 6 * s
    return c
  }

  // ── rail bed: one lane (ballast + sleepers + steel rails) ────────────────
  // cy = lane center Y, half = half-height of the rail strip. Returns {static, ties}
  // where `ties` is a separate Graphics the game scrolls.
  function ballastLane(W, cy, half, pal) {
    var base = gfx()
    // ballast (gravel) trapezoid-ish bed, speckled
    base.rect(0, cy - half, W, half * 2).fill({ color: pal.ballast })
    base.rect(0, cy - half, W, half * 0.5).fill({ color: pal.ballastDk, alpha: 0.35 })
    for (var i = 0; i < W; i += 9) {
      var gy = cy - half + ((i * 7) % (half * 2))
      base.circle(i + ((i * 3) % 7), gy, 1.1).fill({ color: pal.ballastDk, alpha: 0.5 })
    }
    // steel rails (two) + shine
    ;[-1, 1].forEach(function (sgn) {
      base.rect(0, cy + sgn * half * 0.7 - 1.5, W, 3).fill({ color: pal.rail })
      base.rect(0, cy + sgn * half * 0.7 - 1.5, W, 1).fill({ color: pal.railShine, alpha: 0.8 })
    })
    return base
  }
  // sleepers/ties as a scrolling Graphics (tile period = gap)
  function ties(W, cy, half, pal, gap, tw) {
    var g = gfx(); gap = gap || 30; tw = tw || 10
    for (var x = -gap; x < W + gap; x += gap) g.rect(x, cy - half * 0.85, tw, half * 1.7).fill({ color: pal.tie })
    g._gap = gap
    return g
  }

  // ── colour lerp ───────────────────────────────────────────────────────
  function _lerp(a, b, t) {
    t = t < 0 ? 0 : t > 1 ? 1 : t
    var ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255
    var br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255
    return ((ar + (br - ar) * t) << 16 | (ag + (bg - ag) * t) << 8 | (ab + (bb - ab) * t)) & 0xffffff
  }

  // ── smoke particle system (volcano plume) ──────────────────────────────
  function makeSmoke() { return [] }
  function tickSmoke(stage, arr, x, y, pal, dt, spawn) {
    dt = Math.min(dt, 2)
    if (spawn && arr.length < 9) {
      var g = gfx(); g.circle(0, 0, 8 + Math.random() * 5).fill({ color: pal.smoke, alpha: 0.55 })
      g.x = x + (Math.random() - 0.5) * 6; g.y = y
      stage.addChild(g)
      arr.push({ g: g, vy: -0.6 - Math.random() * 0.4, vx: -0.25 - Math.random() * 0.35, life: 1, gr: 0.022 })
    }
    for (var i = arr.length - 1; i >= 0; i--) {
      var p = arr[i]
      p.g.x += p.vx * dt; p.g.y += p.vy * dt
      p.g.scale.set(Math.min(3, p.g.scale.x + p.gr * dt))
      p.life -= 0.006 * dt; p.g.alpha = Math.max(0, p.life * 0.5)
      if (p.life <= 0) { if (p.g.parent) p.g.parent.removeChild(p.g); arr.splice(i, 1) }
    }
  }

  // ── standalone demo (test harness) ──────────────────────────────────────
  // Builds a full scene into `stage` and returns a controller {tick, layers}.
  function demo(PIXI, stage, W, H, timeKey) {
    P = PIXI
    var pal = palette(timeKey)
    var horizon = H * 0.52

    var L = { sky: cont(), far: cont(), mid: cont(), rail: cont(), fore: cont() }
    Object.keys(L).forEach(function (k) { stage.addChild(L[k]) })

    // sky
    paintSky(L.sky.addChild(gfx()), W, H, pal)
    // sun/moon
    var sun = gfx(); sun.circle(0, 0, 26).fill({ color: pal.sun }); sun.circle(0, 0, 46).fill({ color: pal.sunGlow, alpha: 0.25 })
    sun.x = W * 0.78; sun.y = H * 0.2; L.sky.addChild(sun)

    // far: mountains + volcano + clouds
    var mt = mountains(W, horizon + 30, pal); mt.y = horizon - (horizon + 30) + 30; L.far.addChild(mt)
    var vol = volcano(W * 0.5, horizon, pal); vol.x = W * 0.26; vol.y = horizon - horizon; L.far.addChild(vol)
    var craterWX = vol.x + vol._craterX, craterWY = vol.y + vol._craterY
    for (var ci = 0; ci < 4; ci++) { var cl = cloud(pal, 0.8 + Math.random() * 0.5); cl.x = (ci * W / 3) % W; cl.y = H * (0.1 + Math.random() * 0.18); L.far.addChild(cl) }

    // ground band under horizon
    var ground = gfx(); ground.rect(0, horizon, W, H - horizon).fill({ color: pal.grass }); L.far.addChildAt(ground, 0)
    // sawah strip just below horizon
    var sw = sawahBand(W, horizon, H * 0.16, pal); L.far.addChild(sw)

    // mid: houses + palms + trees + poles spread along a baseline
    var baseY = horizon + H * 0.14
    var props = ['house', 'palm', 'tree', 'pole', 'house', 'palm', 'tree']
    for (var pi = 0; pi < props.length; pi++) {
      var pr
      var sc = 0.8 + Math.random() * 0.5
      if (props[pi] === 'house') pr = house(pal, sc)
      else if (props[pi] === 'palm') pr = palm(pal, sc)
      else if (props[pi] === 'tree') pr = tree(pal, sc)
      else pr = pole(pal, sc)
      pr.x = 40 + pi * (W / props.length) + (Math.random() - 0.5) * 40
      pr.y = baseY + (pi % 2) * 8
      L.mid.addChild(pr)
    }

    // rail: 3 lanes in the lower band
    var railTop = H * 0.70, laneH = (H - railTop) / 3
    for (var ln = 0; ln < 3; ln++) {
      var cy = railTop + laneH * ln + laneH / 2
      L.rail.addChild(ballastLane(W, cy, laneH * 0.34, pal))
      L.rail.addChild(ties(W, cy, laneH * 0.34, pal, 30, 10))
    }

    // foreground grass tufts
    for (var gi = 0; gi < 10; gi++) {
      var tuft = gfx(); tuft.ellipse(0, 0, 26, 18).fill({ color: pal.grassDk, alpha: 0.85 })
      tuft.x = (gi * W / 6) % (W + 40); tuft.y = H - 6; L.fore.addChild(tuft)
    }

    // rain overlay
    var rainArr = []
    if (pal.rain) for (var ri = 0; ri < 50; ri++) { var rd = gfx(); rd.rect(0, 0, 2, 9).fill({ color: 0xbcd3e8, alpha: 0.5 }); rd.x = Math.random() * W; rd.y = Math.random() * H; L.fore.addChild(rd); rainArr.push(rd) }
    // dim overlay for mood
    if (pal.dim > 0) { var dm = gfx(); dm.rect(0, 0, W, H).fill({ color: 0x0a1024, alpha: pal.dim }); L.fore.addChild(dm) }

    var smoke = makeSmoke()
    // seed a rising plume so it's immediately visible
    for (var sk = 0; sk < 6; sk++) { var sg = gfx(); sg.circle(0, 0, 9 + sk * 2).fill({ color: pal.smoke, alpha: 0.45 }); sg.x = craterWX - sk * 3; sg.y = craterWY - sk * 16; sg.scale.set(1 + sk * 0.3); L.far.addChild(sg); smoke.push({ g: sg, vy: -0.6, vx: -0.25, life: 1 - sk * 0.12, gr: 0.022 }) }
    var t = 0
    function tick(dt) {
      t += dt
      tickSmoke(L.far, smoke, craterWX, craterWY, pal, dt, t % 5 < dt)
      if (pal.rain) for (var i = 0; i < rainArr.length; i++) { rainArr[i].y += 9 * dt; rainArr[i].x -= 1.5 * dt; if (rainArr[i].y > H) { rainArr[i].y = -10; rainArr[i].x = Math.random() * W } }
    }
    return { tick: tick, layers: L, pal: pal }
  }

  window.IndoScene = {
    palette: palette, paintSky: paintSky, volcano: volcano, mountains: mountains,
    cloud: cloud, sawahBand: sawahBand, house: house, palm: palm, tree: tree, pole: pole,
    ballastLane: ballastLane, ties: ties, makeSmoke: makeSmoke, tickSmoke: tickSmoke,
    lerp: _lerp, TIME: TIME, demo: demo, version: '1.0.0'
  }
})()
