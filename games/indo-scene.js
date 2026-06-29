/* =============================================================================
 * games/indo-scene.js — IndoScene (v2, 2026-06-27 — fidelity-sharpened)
 * =============================================================================
 * Procedural PixiJS-8 drawer for the Indonesian side-view train landscape from
 * the owner's reference: a Merapi volcano nested in layered green forested hills,
 * distant hazy mountains, fluffy clouds, terraced rice fields (sawah), traditional
 * joglo houses, lush coconut palms + trees, telephone poles, a realistic 3-lane
 * ballast/sleeper/steel rail bed (gentle perspective), and FOREGROUND tropical
 * foliage that frames the view (the strong parallax-3D near layer).
 *
 * v2 = "pertajam": every element is 2-TONE SHADED (lit/shadow) for an illustrated
 * feel, softer warm-pastel palettes, aerial haze for depth, + foliage framing +
 * vignette. All pure vector (crisp at any size, no raster assets). 4 time-of-day
 * moods: day / rain / sore / malam.
 * ========================================================================== */
(function () {
  'use strict'
  if (typeof window === 'undefined') return
  var P = window.PIXI

  function _lerp(a, b, t) {
    t = t < 0 ? 0 : t > 1 ? 1 : t
    var ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255
    var br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255
    return ((ar + (br - ar) * t) << 16 | (ag + (bg - ag) * t) << 8 | (ab + (bb - ab) * t)) & 0xffffff
  }
  function light(c, t) { return _lerp(c, 0xffffff, t) }   // toward white
  function dark(c, t) { return _lerp(c, 0x000000, t) }    // toward black
  // Resolve PIXI lazily — the game may load this module BEFORE pixi.min.js, so
  // `P` can be undefined at load; bind it on first draw instead.
  function gfx() { if (!P) P = window.PIXI; return new P.Graphics() }
  function cont() { if (!P) P = window.PIXI; return new P.Container() }

  // ── soft warm-pastel palettes per time-of-day ───────────────────────────
  var PALETTES = {
    day: {
      skyTop: 0x9fcdec, skyMid: 0xc7e6f4, skyBot: 0xeaf6f6,
      sun: 0xfff4cf, sunGlow: 0xfff8e4, haze: 0xeaf4f2,
      mtnFar: 0xaebfd6, hill1: 0x7fb06a, hill2: 0x8fc077, hill3: 0xa7cf86,
      volcano: 0x7d6f66, volcanoLit: 0x9a8d83, volcanoTop: 0xeae2da, crater: 0xc26a3a, smoke: 0xe2e6ea,
      sawahA: 0x86c878, sawahB: 0x6fb863, sawahC: 0x9bd189, water: 0xcdeede,
      grass: 0x82c06c, grassDk: 0x5f9a55,
      house: 0xf3ecdc, houseSh: 0xd9cfb8, roof: 0xc05a34, roofLit: 0xd8854a, ridge: 0xe7a86a, door: 0x7a4a2c,
      palmTrunk: 0x9a7a4e, palmTrunkSh: 0x735836, palmLeaf: 0x57a64a, palmLeafDk: 0x3f8a3e,
      treeLeaf: 0x69bb59, treeDk: 0x4f9a43, foliage: 0x2f6e36, foliageDk: 0x214f28,
      pole: 0xa4937c, wire: 0x5a564f,
      ballast: 0xc09a78, ballastDk: 0x9c7a58, tie: 0x6e4a32, tieDk: 0x4f3322, rail: 0xcdd6dd, railShine: 0xf2f6f8,
      cloud: 0xffffff, cloudSh: 0xdfeaf0, cloudA: 0.95,
      light: 0xfff3d0, lightA: 0.06, dim: 0, stars: false, rain: false
    },
    sore: {
      skyTop: 0x744f86, skyMid: 0xe18a5a, skyBot: 0xffd6a0,
      sun: 0xffb56e, sunGlow: 0xffdcab, haze: 0xf6cda0,
      mtnFar: 0x9277a0, hill1: 0x7e8a55, hill2: 0x8c9a5c, hill3: 0x9da968,
      volcano: 0x6a5856, volcanoLit: 0x8a6f63, volcanoTop: 0xeacdb6, crater: 0xd2622f, smoke: 0xddb59e,
      sawahA: 0x8a955c, sawahB: 0x74804e, sawahC: 0x9aa468, water: 0xe9c89c,
      grass: 0x899054, grassDk: 0x666c40,
      house: 0xf4e2cb, houseSh: 0xddc6a8, roof: 0xb74c2c, roofLit: 0xce7a3a, ridge: 0xe09a5c, door: 0x6a3f27,
      palmTrunk: 0x8a6843, palmTrunkSh: 0x664c30, palmLeaf: 0x6f8a4a, palmLeafDk: 0x556c3a,
      treeLeaf: 0x88934f, treeDk: 0x64713f, foliage: 0x4a5a32, foliageDk: 0x344022,
      pole: 0x927a60, wire: 0x4e463d,
      ballast: 0xbb936c, ballastDk: 0x957153, tie: 0x5e4230, tieDk: 0x432e20, rail: 0xdcb892, railShine: 0xffe7c6,
      cloud: 0xffd9b2, cloudSh: 0xe7b489, cloudA: 0.9,
      light: 0xffb060, lightA: 0.10, dim: 0.05, stars: false, rain: false
    },
    malam: {
      skyTop: 0x0b1330, skyMid: 0x1c2452, skyBot: 0x3a416f,
      sun: 0xf3f0cf, sunGlow: 0xf7f4dc, haze: 0x2c3456,
      mtnFar: 0x2c355a, hill1: 0x355040, hill2: 0x3c5a46, hill3: 0x47664f,
      volcano: 0x2e2937, volcanoLit: 0x47414f, volcanoTop: 0x5b6680, crater: 0xd2622f, smoke: 0x49506e,
      sawahA: 0x3a5440, sawahB: 0x2f4636, sawahC: 0x44604a, water: 0x49636e,
      grass: 0x37543d, grassDk: 0x28402e,
      house: 0x60637a, houseSh: 0x474a60, roof: 0x6e3a2c, roofLit: 0x8a5236, ridge: 0x9a6a44, door: 0xffe6a0,
      palmTrunk: 0x52473a, palmTrunkSh: 0x3a3128, palmLeaf: 0x356046, palmLeafDk: 0x274a36,
      treeLeaf: 0x3c6642, treeDk: 0x2c4d34, foliage: 0x1f3a28, foliageDk: 0x142a1c,
      pole: 0x504c5e, wire: 0x2a2838,
      ballast: 0x5a544f, ballastDk: 0x423c38, tie: 0x352a22, tieDk: 0x241c16, rail: 0x7e8a98, railShine: 0xb0bcc8,
      cloud: 0x3c426440 ? 0x3c4264 : 0x3c4264, cloudSh: 0x2a3050, cloudA: 0.8,
      light: 0x5a6aa0, lightA: 0.0, dim: 0.34, stars: true, rain: false
    },
    rain: {
      skyTop: 0x6b7988, skyMid: 0x8a96a4, skyBot: 0xb1bac2,
      sun: 0xa6b6c4, sunGlow: 0xbcc6d0, haze: 0xb6c2ca,
      mtnFar: 0x7c8896, hill1: 0x5f8c5a, hill2: 0x6b9863, hill3: 0x7ba670,
      volcano: 0x5a554f, volcanoLit: 0x726b63, volcanoTop: 0xc6c6c2, crater: 0x9a4a30, smoke: 0xb6bac0,
      sawahA: 0x6f9a66, sawahB: 0x5e8a56, sawahC: 0x80a874, water: 0xa6c6c0,
      grass: 0x63905c, grassDk: 0x496e46,
      house: 0xd9d4ca, houseSh: 0xbcb6aa, roof: 0xa1492c, roofLit: 0xb6743a, ridge: 0xc2905c, door: 0x5e3c25,
      palmTrunk: 0x7a6244, palmTrunkSh: 0x584634, palmLeaf: 0x4c8a4a, palmLeafDk: 0x3a6e3a,
      treeLeaf: 0x589553, treeDk: 0x42743f, foliage: 0x335c39, foliageDk: 0x244026,
      pole: 0x847c70, wire: 0x47453f,
      ballast: 0x96876f, ballastDk: 0x77694f, tie: 0x564030, tieDk: 0x3c2c20, rail: 0xb0bac2, railShine: 0xd4dee4,
      cloud: 0xc9cfd5, cloudSh: 0xafb7bf, cloudA: 0.96,
      light: 0x9fb0c0, lightA: 0.0, dim: 0.16, stars: false, rain: true
    }
  }
  PALETTES.malam.cloud = 0x3c4264
  var TIME = ['day', 'rain', 'sore', 'malam']
  function palette(k) { return PALETTES[k] || PALETTES.day }

  // ── sky (smooth gradient) + optional stars + horizon haze ───────────────
  function paintSky(g, W, H, pal) {
    var steps = 40
    for (var i = 0; i < steps; i++) {
      var t = i / (steps - 1)
      var c = t < 0.5 ? _lerp(pal.skyTop, pal.skyMid, t * 2) : _lerp(pal.skyMid, pal.skyBot, (t - 0.5) * 2)
      g.rect(0, (H / steps) * i - 0.5, W, H / steps + 1).fill({ color: c })
    }
    if (pal.stars) for (var s = 0; s < 70; s++) {
      var sx = (s * 137.5) % W, sy = (s * 61.7) % (H * 0.55)
      g.circle(sx, sy, s % 5 === 0 ? 1.7 : 0.9).fill({ color: 0xffffff, alpha: 0.3 + 0.45 * ((s * 7) % 5) / 5 })
    }
    return g
  }

  // fluffy multi-lobe cloud: bright top + soft underside
  function cloud(pal, scale) {
    var g = gfx(), s = scale || 1
    var lobes = [[0, 4, 22], [20, 6, 17], [-20, 7, 15], [9, -6, 18], [-9, -2, 14]]
    lobes.forEach(function (p) { g.ellipse(p[0] * s, (p[1] + 3) * s, p[2] * s, p[2] * 0.62 * s).fill({ color: pal.cloudSh, alpha: pal.cloudA }) })
    lobes.forEach(function (p) { g.ellipse(p[0] * s, p[1] * s, p[2] * s, p[2] * 0.66 * s).fill({ color: pal.cloud, alpha: pal.cloudA }) })
    return g
  }

  // distant hazy mountain range (behind the hills)
  function mountains(W, baseY, pal) {
    var c = cont(), g = gfx(), x = -50
    var col = _lerp(pal.mtnFar, pal.haze, 0.35)
    while (x < W + 80) {
      var mw = 120 + ((x * 53) % 110), mh = 60 + ((x * 31) % 80)
      g.moveTo(x, baseY).lineTo(x + mw * 0.5, baseY - mh).lineTo(x + mw, baseY).closePath().fill({ color: col, alpha: 0.9 })
      g.moveTo(x + mw * 0.5, baseY - mh).lineTo(x + mw * 0.62, baseY - mh * 0.78).lineTo(x + mw * 0.5, baseY - mh * 0.5).closePath().fill({ color: light(col, 0.12) })
      x += mw * 0.66
    }
    c.addChild(g); return c
  }

  // layered green forested hills (lighter/hazier toward the back)
  function hills(W, baseY, pal, layer) {
    var c = cont(), g = gfx()
    var cols = [pal.hill3, pal.hill2, pal.hill1]
    var col = _lerp(cols[layer] || pal.hill2, pal.haze, layer === 2 ? 0 : (0.28 - layer * 0.12))
    var amp = 30 + layer * 14, period = 220 - layer * 40
    g.moveTo(-20, baseY + 60)
    for (var x = -20; x <= W + 20; x += period * 0.5) {
      g.quadraticCurveTo(x + period * 0.25, baseY - amp - ((x * 7) % 18), x + period * 0.5, baseY)
    }
    g.lineTo(W + 20, baseY + 200).lineTo(-20, baseY + 200).closePath().fill({ color: col })
    // soft top highlight
    g.moveTo(-20, baseY + 60)
    for (var x2 = -20; x2 <= W + 20; x2 += period * 0.5) g.quadraticCurveTo(x2 + period * 0.25, baseY - amp - ((x2 * 7) % 18), x2 + period * 0.5, baseY)
    g.stroke({ color: light(col, 0.16), width: 3, alpha: 0.5 })
    c.addChild(g); return c
  }

  // Merapi volcano — shaded cone nested in hills + crater glow (smoke via tickSmoke)
  function volcano(W, baseY, pal, vh) {
    var c = cont(), g = gfx(), cx = W * 0.5, vw = W * 0.5
    vh = vh || 230
    var topY = baseY - vh
    // shadow (left) base then lit (right)
    g.moveTo(cx - vw / 2, baseY).lineTo(cx - vw * 0.10, topY).lineTo(cx + vw * 0.10, topY).lineTo(cx + vw / 2, baseY).closePath().fill({ color: pal.volcano })
    g.moveTo(cx, baseY).lineTo(cx + vw * 0.10, topY).lineTo(cx + vw / 2, baseY).closePath().fill({ color: pal.volcanoLit })
    // erosion gullies
    for (var i = -2; i <= 2; i++) { g.moveTo(cx + i * vw * 0.06, topY + 8).lineTo(cx + i * vw * 0.12, baseY).stroke({ color: dark(pal.volcano, 0.18), width: 2, alpha: 0.5 }) }
    // snow/ash cap
    g.moveTo(cx - vw * 0.10, topY).lineTo(cx - vw * 0.02, topY + vh * 0.14).lineTo(cx + vw * 0.05, topY + vh * 0.10).lineTo(cx + vw * 0.10, topY).closePath().fill({ color: pal.volcanoTop })
    // crater glow
    g.ellipse(cx, topY + 2, vw * 0.10, 5).fill({ color: pal.crater, alpha: 0.9 })
    g.ellipse(cx, topY + 2, vw * 0.05, 3).fill({ color: light(pal.crater, 0.3), alpha: 0.8 })
    c.addChild(g)
    c._craterX = cx; c._craterY = topY
    return c
  }

  // ── terraced rice paddies (curved terraces, water sheen) ────────────────
  function sawahBand(W, y, h, pal) {
    var g = gfx(), rows = 5
    for (var r = 0; r < rows; r++) {
      var ry = y + (h / rows) * r, rh = h / rows + 1
      var col = [pal.sawahC, pal.sawahA, pal.sawahB, pal.sawahA, pal.sawahB][r % 5]
      // gentle wavy terrace
      g.moveTo(0, ry)
      for (var x = 0; x <= W; x += 80) g.quadraticCurveTo(x + 40, ry + (r % 2 ? 3 : -3), x + 80, ry)
      g.lineTo(W, ry + rh).lineTo(0, ry + rh).closePath().fill({ color: col })
      // bright water lip + thin white sheen
      g.rect(0, ry + rh - 3, W, 3).fill({ color: pal.water, alpha: 0.85 })
      g.rect(0, ry + rh - 4, W, 1).fill({ color: 0xffffff, alpha: 0.22 })
      for (var fx = (r * 13) % 32; fx < W; fx += 36) g.circle(fx, ry + rh * 0.5, 1.5).fill({ color: light(col, 0.3), alpha: 0.5 })
    }
    return g
  }

  // ── props (2-tone shaded) ───────────────────────────────────────────────
  function house(pal, scale) {
    var c = cont(), g = gfx(), s = scale || 1, w = 50 * s, h = 30 * s
    g.ellipse(0, 2 * s, w * 0.6, 5 * s).fill({ color: 0x000000, alpha: 0.12 })   // ground shadow
    g.rect(-w / 2, -h, w, h).fill({ color: pal.house })
    g.rect(w * 0.18, -h, w * 0.32, h).fill({ color: pal.houseSh })               // shadow side
    // joglo roof (2 tiers) with lit + ridge
    g.moveTo(-w * 0.64, -h).lineTo(0, -h - 24 * s).lineTo(w * 0.64, -h).closePath().fill({ color: pal.roof })
    g.moveTo(0, -h - 24 * s).lineTo(w * 0.64, -h).lineTo(w * 0.18, -h).closePath().fill({ color: dark(pal.roof, 0.12) })
    g.moveTo(-w * 0.44, -h - 12 * s).lineTo(0, -h - 32 * s).lineTo(w * 0.44, -h - 12 * s).closePath().fill({ color: pal.roofLit })
    g.moveTo(-w * 0.46, -h).lineTo(w * 0.46, -h).stroke({ color: pal.ridge, width: 2 * s, alpha: 0.7 })
    // door + windows
    g.rect(-7 * s, -h * 0.92, 14 * s, h * 0.92).fill({ color: pal.door })
    g.rect(-7 * s, -h * 0.92, 14 * s, 2 * s).fill({ color: light(pal.door, 0.3), alpha: 0.5 })
    g.rect(-w * 0.42, -h * 0.72, 9 * s, 9 * s).fill({ color: pal.door, alpha: 0.45 })
    c.addChild(g); return c
  }

  function palm(pal, scale) {
    var c = cont(), g = gfx(), s = scale || 1, th = 64 * s
    g.ellipse(0, 2 * s, 16 * s, 4 * s).fill({ color: 0x000000, alpha: 0.12 })
    // curved trunk (2-tone)
    g.moveTo(-3 * s, 0).quadraticCurveTo(3 * s, -th * 0.5, -2 * s, -th).lineTo(2 * s, -th).quadraticCurveTo(7 * s, -th * 0.5, 3 * s, 0).closePath().fill({ color: pal.palmTrunk })
    g.moveTo(1 * s, 0).quadraticCurveTo(6 * s, -th * 0.5, 1 * s, -th).lineTo(2 * s, -th).quadraticCurveTo(7 * s, -th * 0.5, 3 * s, 0).closePath().fill({ color: pal.palmTrunkSh })
    var fy = -th
    for (var a = 0; a < 9; a++) {
      var ang = (-Math.PI * 0.96) + (a / 8) * (Math.PI * 0.92)
      var ex = Math.cos(ang) * 34 * s, ey = Math.sin(ang) * 26 * s
      var col = a % 2 ? pal.palmLeaf : pal.palmLeafDk
      g.moveTo(0, fy).quadraticCurveTo(ex * 0.5, fy + ey * 0.5 - 7 * s, ex, fy + ey).quadraticCurveTo(ex * 0.55, fy + ey * 0.5 + 3 * s, 0, fy).fill({ color: col })
    }
    g.circle(-3 * s, fy + 2 * s, 3.2 * s).fill({ color: 0x6b4a2c })
    g.circle(3 * s, fy + 3 * s, 3.2 * s).fill({ color: 0x6b4a2c })
    c.addChild(g); return c
  }

  function tree(pal, scale) {
    var c = cont(), g = gfx(), s = scale || 1
    g.ellipse(0, 2 * s, 15 * s, 4 * s).fill({ color: 0x000000, alpha: 0.12 })
    g.rect(-3 * s, -20 * s, 6 * s, 20 * s).fill({ color: pal.palmTrunk })
    g.circle(-10 * s, -26 * s, 15 * s).fill({ color: pal.treeDk })
    g.circle(10 * s, -26 * s, 15 * s).fill({ color: pal.treeDk })
    g.circle(0, -37 * s, 18 * s).fill({ color: pal.treeLeaf })
    g.circle(-5 * s, -42 * s, 9 * s).fill({ color: light(pal.treeLeaf, 0.18) })   // top highlight
    c.addChild(g); return c
  }

  function pole(pal, scale) {
    var c = cont(), g = gfx(), s = scale || 1, ph = 72 * s
    g.rect(-2.5 * s, -ph, 5 * s, ph).fill({ color: pal.pole })
    g.rect(0.5 * s, -ph, 2 * s, ph).fill({ color: dark(pal.pole, 0.18) })
    g.rect(-15 * s, -ph + 8 * s, 30 * s, 4 * s).fill({ color: pal.pole })
    g.rect(-9 * s, -ph + 2 * s, 18 * s, 4 * s).fill({ color: pal.pole })
    c.addChild(g); c._wireY = -ph + 6 * s; return c
  }

  // ── rail bed: one lane (shaded ballast + sleepers + steel rails) ─────────
  function ballastLane(W, cy, half, pal) {
    var base = gfx()
    base.rect(0, cy - half, W, half * 2).fill({ color: pal.ballast })
    base.rect(0, cy - half, W, half * 0.45).fill({ color: light(pal.ballast, 0.08), alpha: 0.6 })
    base.rect(0, cy + half * 0.45, W, half * 0.55).fill({ color: pal.ballastDk, alpha: 0.4 })
    for (var i = 0; i < W; i += 7) {
      var gy = cy - half + ((i * 7) % (half * 2))
      base.circle(i + ((i * 3) % 6), gy, 1.0).fill({ color: ((i * 5) % 2) ? pal.ballastDk : light(pal.ballast, 0.18), alpha: 0.55 })
    }
    ;[-1, 1].forEach(function (sgn) {
      base.rect(0, cy + sgn * half * 0.66 + 1.5, W, 1.5).fill({ color: dark(pal.rail, 0.4), alpha: 0.4 })  // cast shadow
      base.rect(0, cy + sgn * half * 0.66 - 1.5, W, 3).fill({ color: pal.rail })
      base.rect(0, cy + sgn * half * 0.66 - 1.5, W, 1).fill({ color: pal.railShine, alpha: 0.85 })
    })
    return base
  }
  function ties(W, cy, half, pal, gap, tw) {
    var g = gfx(); gap = gap || 30; tw = tw || 11
    for (var x = -gap; x < W + gap; x += gap) {
      g.rect(x, cy - half * 0.82, tw, half * 1.64).fill({ color: pal.tie })
      g.rect(x, cy - half * 0.82, tw, half * 0.3).fill({ color: light(pal.tie, 0.12) })
      g.rect(x + tw, cy - half * 0.82, 2, half * 1.64).fill({ color: pal.tieDk, alpha: 0.5 })
    }
    g._gap = gap; return g
  }

  // ── foreground tropical foliage framing (the parallax-3D near layer) ────
  function frond(g, x, y, len, ang, wide, col) {
    var ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len
    var nx = Math.cos(ang + Math.PI / 2), ny = Math.sin(ang + Math.PI / 2)
    g.moveTo(x, y).quadraticCurveTo(x + Math.cos(ang) * len * 0.5 + nx * wide, y + Math.sin(ang) * len * 0.5 + ny * wide, ex, ey)
      .quadraticCurveTo(x + Math.cos(ang) * len * 0.5 - nx * wide, y + Math.sin(ang) * len * 0.5 - ny * wide, x, y).fill({ color: col })
  }
  function foliageFrame(W, H, pal) {
    var c = cont(), g = gfx()
    // v55.97 B-283 — frond size SCALES with the shorter screen dim. Was a fixed 150px
    // length + 34px width, which ballooned into the play area on phones / short
    // landscape (owner: "kacau parah, tidak responsive" — giant green leaves mid-scene).
    // Cap keeps the lush look on tablets; floor keeps a corner accent on tiny screens.
    var base = Math.max(60, Math.min(150, Math.min(W, H) * 0.2))
    var wide = base * 0.22
    var n = base < 100 ? 4 : 5
    // bottom-left cluster of palm fronds (hugs the corner)
    for (var a = 0; a < n; a++) frond(g, -8, H + 10, base * (1 - a * 0.06), -Math.PI * (0.18 + a * 0.12), wide * (1 - a * 0.09), a % 2 ? pal.foliage : pal.foliageDk)
    // bottom-right cluster
    for (var b = 0; b < n; b++) frond(g, W + 8, H + 10, base * (1 - b * 0.06), -Math.PI * (0.82 - b * 0.12), wide * (1 - b * 0.09), b % 2 ? pal.foliage : pal.foliageDk)
    c.addChild(g); return c
  }

  // ── smoke plume ──────────────────────────────────────────────────────────
  function makeSmoke() { return [] }
  function tickSmoke(stage, arr, x, y, pal, dt, spawn) {
    dt = Math.min(dt, 2)
    if (spawn && arr.length < 9) {
      var g = gfx(); g.circle(0, 0, 9 + Math.random() * 5).fill({ color: pal.smoke, alpha: 0.5 })
      g.x = x + (Math.random() - 0.5) * 6; g.y = y; stage.addChild(g)
      arr.push({ g: g, vy: -0.6 - Math.random() * 0.4, vx: -0.25 - Math.random() * 0.35, life: 1, gr: 0.022 })
    }
    for (var i = arr.length - 1; i >= 0; i--) {
      var p = arr[i]
      p.g.x += p.vx * dt; p.g.y += p.vy * dt
      p.g.scale.set(Math.min(3.2, p.g.scale.x + p.gr * dt))
      p.life -= 0.0055 * dt; p.g.alpha = Math.max(0, p.life * 0.5)
      if (p.life <= 0) { if (p.g.parent) p.g.parent.removeChild(p.g); arr.splice(i, 1) }
    }
  }

  // ── B-258 AMBIENT VARIATION ENGINE ──────────────────────────────────────
  // A self-contained "living sky" layer driven by ENGINE VARIABLES (seed +
  // weather + density + weighted spawn table). The "~1000 variations" the owner
  // asked for = the combinatorial product of these knobs × time-of-day palette,
  // not 1000 literal assets. Perf-budgeted for a throttled tablet: a hard CAP on
  // concurrent ambient sprites, off-screen culling/recycling, dt-clamped motion.
  //
  // Usage (any train game):
  //   var amb = IndoScene.ambient(W, railTopY, pal, { seed: <int>, density: 1 })
  //   stage.addChildAt(amb.container, 1)   // above far backdrop, below props
  //   ... in the ticker: amb.tick(deltaFrames)
  var WEATHERS = ['clear', 'hazy', 'cloudy', 'golden', 'overcast', 'breezy']
  // seeded RNG (mulberry32) — same seed ⇒ same scene (reproducible per level)
  function rng(seed) {
    var s = (seed >>> 0) || 1
    return function () {
      s = (s + 0x6D2B79F5) | 0
      var t = Math.imul(s ^ (s >>> 15), 1 | s)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }
  // soft "M" bird silhouette; phase 0..1 raises the wings
  function birdSilho(col, sz, phase) {
    var g = gfx()
    var up = (Math.sin(phase * Math.PI * 2) * 0.5 + 0.5)
    var wy = -sz * (0.25 + up * 0.55)
    g.moveTo(-sz, 0).quadraticCurveTo(-sz * 0.5, wy, 0, -sz * 0.12)
     .quadraticCurveTo(sz * 0.5, wy, sz, 0)
     .stroke({ color: col, width: Math.max(1.4, sz * 0.18), alpha: 0.7 })
    return g
  }
  function ambient(W, railY, pal, opts) {
    opts = opts || {}
    var rand = rng(opts.seed || 1234)
    var density = opts.density != null ? opts.density : 1
    var weather = opts.weather || WEATHERS[Math.floor(rand() * WEATHERS.length)]
    var skyH = Math.max(40, railY)
    var c = cont()
    var birdCol = dark(pal.mountain || 0x6a7a86, 0.32)
    var ents = []
    var CAP = Math.max(4, Math.round(9 * density))   // throttled-tablet budget
    var t = 0, spawnT = 0

    function spawnFlock() {
      var n = 3 + Math.floor(rand() * 5)
      var sz = 4.5 + rand() * 5
      var dir = rand() < 0.5 ? -1 : 1
      var grp = cont()
      for (var i = 0; i < n; i++) {
        var b = birdSilho(birdCol, sz, rand())
        b.x = i * sz * 2.4 * -dir
        b.y = Math.abs(i - (n - 1) / 2) * sz * 1.1   // V-formation
        grp.addChild(b)
      }
      grp.x = dir < 0 ? W + 40 : -40
      grp.y = skyH * (0.10 + rand() * 0.40)
      c.addChild(grp)
      ents.push({ g: grp, kind: 'flock', vx: dir * (0.22 + rand() * 0.30) })
    }
    function spawnCloud() {
      var cl = cloud(pal, 0.5 + rand() * 0.8)
      cl.x = W + 70; cl.y = skyH * (0.06 + rand() * 0.30); cl.alpha = (weather === 'clear' ? 0.8 : 0.92)
      c.addChild(cl)
      ents.push({ g: cl, kind: 'cloud', vx: -(0.05 + rand() * 0.12) })
    }
    function spawnKite() {   // Indonesian layangan
      var cols = [0xef4444, 0xf59e0b, 0x22d3ee, 0xa855f7, 0xec4899]
      var k = gfx()
      k.poly([0, -11, 8, 0, 0, 13, -8, 0]).fill({ color: cols[Math.floor(rand() * cols.length)], alpha: 0.92 })
      k.moveTo(0, 13).lineTo(0, 34).stroke({ color: 0x7a6a55, width: 1, alpha: 0.5 })
      k.x = 50 + rand() * (W - 100); k.y = skyH * (0.14 + rand() * 0.26)
      c.addChild(k)
      ents.push({ g: k, kind: 'kite', vx: 0.03 * (rand() < 0.5 ? -1 : 1), baseY: k.y, phase: rand() * 6 })
    }

    // pre-seed so the sky isn't empty at start
    spawnFlock()
    if (weather !== 'clear') spawnCloud()

    function tick(dt) {
      var d = Math.min(dt, 2)
      t += d; spawnT -= d
      if (spawnT <= 0 && ents.length < CAP) {
        var roll = rand()
        if (roll < 0.46) spawnFlock()
        else if (roll < 0.80) spawnCloud()
        else if (weather === 'clear' || weather === 'golden' || weather === 'breezy') spawnKite()
        else spawnCloud()
        spawnT = (80 + rand() * 160) / density
      }
      for (var i = ents.length - 1; i >= 0; i--) {
        var e = ents[i]
        e.g.x += e.vx * d
        if (e.kind === 'kite') { e.phase += d * 0.05; e.g.y = e.baseY + Math.sin(e.phase) * 6; e.g.rotation = Math.sin(e.phase * 0.7) * 0.12 }
        else if (e.kind === 'flock') { e.g.y += Math.sin((t + i) * 0.05) * 0.15 }   // gentle bob
        if (e.g.x < -140 || e.g.x > W + 140) { c.removeChild(e.g); try { e.g.destroy({ children: true }) } catch (_) {} ents.splice(i, 1) }
      }
    }
    return { container: c, tick: tick, weather: weather }
  }

  // ── standalone demo (test harness) ──────────────────────────────────────
  function demo(PIXI, stage, W, H, timeKey) {
    P = PIXI
    var pal = palette(timeKey)
    var horizon = H * 0.50

    var L = { sky: cont(), far: cont(), mid: cont(), rail: cont(), fore: cont() }
    Object.keys(L).forEach(function (k) { stage.addChild(L[k]) })

    paintSky(L.sky.addChild(gfx()), W, H, pal)
    var sun = gfx(); sun.circle(0, 0, 30).fill({ color: pal.sun }); sun.circle(0, 0, 54).fill({ color: pal.sunGlow, alpha: 0.28 })
    sun.x = W * 0.8; sun.y = H * 0.18; L.sky.addChild(sun)
    for (var ci = 0; ci < 5; ci++) { var cl = cloud(pal, 0.8 + Math.random() * 0.6); cl.x = (ci * W / 4 + 60) % W; cl.y = H * (0.08 + Math.random() * 0.2); L.sky.addChild(cl) }

    // FAR: distant mountains → green hills (back→front) → volcano → ground
    L.far.addChild(mountains(W, horizon, pal))
    L.far.addChild(hills(W, horizon - 6, pal, 0))
    var vol = volcano(W, horizon + 8, pal, H * 0.34); L.far.addChild(vol)
    var craterWX = vol._craterX, craterWY = vol._craterY
    L.far.addChild(hills(W, horizon + 18, pal, 1))
    L.far.addChild(hills(W, horizon + 40, pal, 2))
    // aerial haze band at the horizon
    var haze = gfx(); for (var hz = 0; hz < 8; hz++) haze.rect(0, horizon - 30 + hz * 6, W, 7).fill({ color: pal.haze, alpha: 0.10 * (1 - hz / 8) }); L.far.addChild(haze)
    // ground + sawah
    var ground = gfx(); ground.rect(0, horizon + 36, W, H - horizon).fill({ color: pal.grass }); L.far.addChild(ground)
    L.far.addChild((function () { var sw = sawahBand(W, horizon + 36, H * 0.15, pal); return sw })())

    // MID: houses / palms / trees / poles on a baseline
    var baseY = horizon + H * 0.16
    var seq = ['house', 'palm', 'tree', 'pole', 'house', 'tree', 'palm']
    for (var pi = 0; pi < seq.length; pi++) {
      var sc = 0.85 + ((pi * 7) % 5) / 10, pr
      if (seq[pi] === 'house') pr = house(pal, sc); else if (seq[pi] === 'palm') pr = palm(pal, sc); else if (seq[pi] === 'tree') pr = tree(pal, sc); else pr = pole(pal, sc)
      pr.x = 50 + pi * (W / seq.length) + ((pi * 13) % 40) - 20; pr.y = baseY + (pi % 2) * 10
      L.mid.addChild(pr)
    }

    // RAIL: 3 lanes with gentle perspective (taller toward viewer)
    var railTop = H * 0.68, band = H - railTop
    var hs = [0.30, 0.34, 0.40]   // half-height grows toward the front
    var cyAcc = railTop
    for (var ln = 0; ln < 3; ln++) {
      var lh = band * [0.30, 0.33, 0.37][ln]
      var cy = cyAcc + lh / 2, half = lh * 0.5
      // grassy verge above each lane
      var verge = gfx(); verge.rect(0, cyAcc - 2, W, 3).fill({ color: pal.grassDk, alpha: 0.6 }); L.rail.addChild(verge)
      L.rail.addChild(ballastLane(W, cy, half * hs[ln] / 0.34, pal))
      L.rail.addChild(ties(W, cy, half * hs[ln] / 0.34, pal, 28 + ln * 3, 11 + ln))
      cyAcc += lh
    }

    // FORE: grass tufts + foliage framing + vignette + weather
    for (var gi = 0; gi < 12; gi++) { var tuft = gfx(); tuft.ellipse(0, 0, 28, 16).fill({ color: pal.grassDk, alpha: 0.85 }); tuft.x = (gi * W / 7) % (W + 40); tuft.y = H - 4; L.fore.addChild(tuft) }
    L.fore.addChild(foliageFrame(W, H, pal))
    // soft light overlay (mood)
    if (pal.lightA > 0) { var lt = gfx(); lt.rect(0, 0, W, H).fill({ color: pal.light, alpha: pal.lightA }); L.fore.addChild(lt) }
    // vignette (radial-ish via stacked frames)
    var vg = gfx(); for (var v = 0; v < 6; v++) { var inset = v * 10; vg.rect(inset, inset, W - inset * 2, H - inset * 2).stroke({ color: 0x000000, width: 22, alpha: 0.03 }) } L.fore.addChild(vg)
    var rainArr = []
    if (pal.rain) for (var ri = 0; ri < 60; ri++) { var rd = gfx(); rd.rect(0, 0, 2, 10).fill({ color: 0xc6d8e8, alpha: 0.5 }); rd.x = Math.random() * W; rd.y = Math.random() * H; L.fore.addChild(rd); rainArr.push(rd) }
    if (pal.dim > 0) { var dm = gfx(); dm.rect(0, 0, W, H).fill({ color: 0x0a1024, alpha: pal.dim }); L.fore.addChild(dm) }

    var smoke = makeSmoke()
    for (var sk = 0; sk < 6; sk++) { var sg = gfx(); sg.circle(0, 0, 9 + sk * 2).fill({ color: pal.smoke, alpha: 0.42 }); sg.x = craterWX - sk * 3; sg.y = craterWY - sk * 18; sg.scale.set(1 + sk * 0.3); L.far.addChild(sg); smoke.push({ g: sg, vy: -0.6, vx: -0.25, life: 1 - sk * 0.12, gr: 0.022 }) }
    var t = 0
    function tick(dt) {
      t += dt
      tickSmoke(L.far, smoke, craterWX, craterWY, pal, dt, t % 5 < dt)
      if (pal.rain) for (var i = 0; i < rainArr.length; i++) { rainArr[i].y += 10 * dt; rainArr[i].x -= 1.6 * dt; if (rainArr[i].y > H) { rainArr[i].y = -10; rainArr[i].x = Math.random() * W } }
    }
    return { tick: tick, layers: L, pal: pal }
  }

  window.IndoScene = {
    palette: palette, paintSky: paintSky, cloud: cloud, mountains: mountains, hills: hills,
    volcano: volcano, sawahBand: sawahBand, house: house, palm: palm, tree: tree, pole: pole,
    ballastLane: ballastLane, ties: ties, foliageFrame: foliageFrame,
    makeSmoke: makeSmoke, tickSmoke: tickSmoke, lerp: _lerp, light: light, dark: dark,
    ambient: ambient, WEATHERS: WEATHERS,
    TIME: TIME, demo: demo, version: '2.1.0'
  }
})()
