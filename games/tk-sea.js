/* ============================================================================
 * tk-sea.js — window.TKSea. Shared sea art + nautical HUD for the two ship modes of
 * Timmy & Kapal Legendaris (tk-steer free steering, tk-lanes three lanes). Owner 2026-09-28:
 * "benar-benar dipoles … jauh lebih bagus dan detail", 60 fps on a mid-range Android tablet.
 *
 * Everything expensive is drawn ONCE into offscreen canvases and reused as patterns/sprites:
 *   TKSea.theme(name)                  palette: day | sunset | night | polar | deep
 *   TKSea.textures(name)               { wave, wave2, foam, foam2, glint, caustic } 256 px seamless tiles (cached per theme)
 *   TKSea.patterns(ctx, name)          CanvasPatterns for that context (create once per mount)
 *   TKSea.ocean(ctx, P, o)             paint the layers over a rect in the CURRENT transform:
 *                                      o { x, y, w, h, t, reduced, par: {x,y} parallax offset, theme }
 *   TKSea.sprites(name)                { berg[6], big[3], rock[6], buoy, post, flagRope, seaweed, floe[3], fish, gull, bubbles, barrel? }
 *   TKSea.dressAt(cx, cy, theme)       deterministic set dressing for a world cell -> item | null
 *   TKSea.drawDress(ctx, item, x, y, k, t, reduced)
 *   TKSea.wake(ctx, pts, o)            V-shaped bow wake + curving turbulent trail from stern points
 *                                      pts [{x, y, nx, ny, age}] newest first (current transform coords)
 *   TKSea.arch(ctx, xL, yL, xR, yR, k, t, o)  gate: two lighthouse posts + a flag rope between them
 *   TKSea.Confetti()                   screen-space confetti burst: burst(x, y, n), step(dt), draw(ctx), n
 *   TKSea.injectHud()                  wood & brass HUD classes (.tkx-*): panels, chips, route bar
 *   TKSea.routeBar(opts)               { el, set(frac), size() } — ship icon sails toward a finish flag
 * Vanilla ES5, no build. Deterministic (seeded) so screenshots are stable.
 * ==========================================================================*/
(function (W) {
  'use strict'
  var D = W.document
  var TAU = Math.PI * 2
  var T = 256

  function rng (seed) {
    var s = (Math.floor(seed) >>> 0) || 1
    return function () {
      s = (s + 0x6D2B79F5) >>> 0
      var t = s
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }
  function canvas (w, h) { var c = D.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c }
  function hash (x, y) { var h = Math.imul(x | 0, 73856093) ^ Math.imul(y | 0, 19349663); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296 }

  /* ── palettes ─────────────────────────────────────────────────────────── */
  var THEMES = {
    day:    { top: '#35aee0', mid: '#1b86bd', bot: '#0d5f93', hi: 'rgba(255,255,255,', lo: 'rgba(0,45,80,', waveA: 0.9, foamA: 0.75, glint: 'rgba(255,251,225,', glintA: 0.4, caustic: 0.09, haze: 'rgba(190,235,255,', dress: ['gull', 'barrel', 'seaweed', 'gull'], ice: 'day' },
    sunset: { top: '#3d86b6', mid: '#2c6796', bot: '#1c456f', hi: 'rgba(255,225,190,', lo: 'rgba(30,20,50,', waveA: 0.85, foamA: 0.65, glint: 'rgba(255,210,140,', glintA: 0.7, caustic: 0.08, haze: 'rgba(255,190,140,', dress: ['gull', 'barrel', 'gull'], ice: 'day' },
    night:  { top: '#123a66', mid: '#0c2a4d', bot: '#061a33', hi: 'rgba(170,215,255,', lo: 'rgba(0,8,20,', waveA: 0.7, foamA: 0.5, glint: 'rgba(210,232,255,', glintA: 0.45, caustic: 0, haze: 'rgba(8,20,44,', dress: ['floe', 'floe', 'barrel'], ice: 'night' },
    polar:  { top: '#3b93bf', mid: '#236f9c', bot: '#154f76', hi: 'rgba(240,252,255,', lo: 'rgba(0,40,70,', waveA: 0.8, foamA: 0.8, glint: 'rgba(255,255,255,', glintA: 0.4, caustic: 0.05, haze: 'rgba(220,245,255,', dress: ['floe', 'floe', 'gull'], ice: 'day' },
    deep:   { top: '#0f4d73', mid: '#0a3656', bot: '#041c30', hi: 'rgba(140,220,255,', lo: 'rgba(0,10,20,', waveA: 0.45, foamA: 0, glint: null, glintA: 0, caustic: 0.07, haze: 'rgba(4,20,36,', dress: ['fish', 'bubbles', 'seaweed', 'fish'], ice: 'rock' }
  }
  function theme (n) { return THEMES[n] || THEMES.day }

  /* ── seamless tiles ───────────────────────────────────────────────────── */
  function wrapDraw (fn) { for (var ox = -T; ox <= T; ox += T) for (var oy = -T; oy <= T; oy += T) fn(ox, oy) }
  function waveTile (th, seed, big) {
    var c = canvas(T, T), x = c.getContext('2d'), r = rng(seed)
    x.lineCap = 'round'
    var n = big ? 26 : 70
    for (var i = 0; i < n; i++) {
      var px = r() * T, py = r() * T, s = (big ? 22 : 8) + r() * (big ? 26 : 14), a = (0.05 + r() * 0.12) * th.waveA, lo = r() < 0.4
      x.strokeStyle = (lo ? th.lo : th.hi) + a.toFixed(3) + ')'; x.lineWidth = big ? 3 + r() * 2 : 1.2 + r() * 1.4
      wrapDraw(function (ox, oy) {
        x.beginPath(); x.moveTo(px + ox - s, py + oy)
        x.quadraticCurveTo(px + ox - s / 2, py + oy - s * 0.32, px + ox, py + oy)
        x.quadraticCurveTo(px + ox + s / 2, py + oy + s * 0.32, px + ox + s, py + oy)
        x.stroke()
      })
    }
    return c
  }
  function foamTile (th, seed, coarse) {
    var c = canvas(T, T), x = c.getContext('2d'), r = rng(seed)
    if (!th.foamA) return c
    var clusters = coarse ? 7 : 16
    for (var i = 0; i < clusters; i++) {
      var cx = r() * T, cy = r() * T, m = coarse ? 5 : 3 + Math.floor(r() * 4)
      for (var j = 0; j < m; j++) {
        var fx = cx + (r() - 0.5) * (coarse ? 30 : 16), fy = cy + (r() - 0.5) * (coarse ? 12 : 7), rw = (coarse ? 3 : 1.2) + r() * (coarse ? 5 : 2.4)
        var a = (0.18 + r() * 0.4) * th.foamA
        x.fillStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')'
        wrapDraw(function (ox, oy) { x.beginPath(); x.ellipse(fx + ox, fy + oy, rw, rw * 0.45, 0, 0, TAU); x.fill() })
      }
    }
    return c
  }
  function glintTile (th, seed) {
    var c = canvas(T, T), x = c.getContext('2d'), r = rng(seed)
    if (!th.glint) return c
    x.lineCap = 'round'
    for (var i = 0; i < 26; i++) {
      var gx = r() * T, gy = r() * T, l = 3 + r() * 9, a = 0.25 + r() * 0.75
      x.strokeStyle = th.glint + (a * th.glintA).toFixed(3) + ')'; x.lineWidth = 1 + r() * 1.3
      wrapDraw(function (ox, oy) { x.beginPath(); x.moveTo(gx + ox - l / 2, gy + oy); x.lineTo(gx + ox + l / 2, gy + oy); x.stroke() })
    }
    return c
  }
  // soft caustics: F2-F1 cellular edges on a jittered grid, computed once per theme (~20 ms)
  function causticTile (th, seed) {
    var S = 128, c = canvas(S, S), x = c.getContext('2d')
    if (!th.caustic) return c
    var r = rng(seed), G = 5, pts = []
    for (var gy = 0; gy < G; gy++) for (var gx = 0; gx < G; gx++) pts.push([(gx + r()) * S / G, (gy + r()) * S / G])
    var img = x.createImageData(S, S), d = img.data
    for (var y = 0; y < S; y++) {
      for (var xx = 0; xx < S; xx++) {
        var f1 = 1e9, f2 = 1e9
        for (var i = 0; i < pts.length; i++) {
          var dx = Math.abs(xx - pts[i][0]); if (dx > S / 2) dx = S - dx
          var dy = Math.abs(y - pts[i][1]); if (dy > S / 2) dy = S - dy
          var dd = dx * dx + dy * dy
          if (dd < f1) { f2 = f1; f1 = dd } else if (dd < f2) f2 = dd
        }
        var e = Math.sqrt(f2) - Math.sqrt(f1), v = Math.max(0, 1 - e / 10)
        var o = (y * S + xx) * 4
        d[o] = 230; d[o + 1] = 250; d[o + 2] = 255; d[o + 3] = Math.round(v * v * v * 200)
      }
    }
    x.putImageData(img, 0, 0)
    var big = canvas(T, T), bx = big.getContext('2d')
    bx.imageSmoothingEnabled = true; bx.drawImage(c, 0, 0, T, T)
    return big
  }
  // big soft swells: light and dark blobs, drawn at 4x scale -> slow variation over the whole sea
  function swellTile (th, seed) {
    var c = canvas(T, T), x = c.getContext('2d'), r = rng(seed)
    for (var i = 0; i < 14; i++) {
      var cx = r() * T, cy = r() * T, rad = 30 + r() * 60, lo = r() < 0.5
      wrapDraw(function (ox, oy) {
        var g = x.createRadialGradient(cx + ox, cy + oy, 0, cx + ox, cy + oy, rad)
        g.addColorStop(0, (lo ? th.lo : th.hi) + (lo ? 0.16 : 0.1) + ')'); g.addColorStop(1, (lo ? th.lo : th.hi) + '0)')
        x.fillStyle = g; x.fillRect(cx + ox - rad, cy + oy - rad, rad * 2, rad * 2)
      })
    }
    return c
  }
  // deep sea: slanted light shafts from the surface (screen space, cheap: a few gradient polygons)
  function rays (ctx, vw, vh, t, reduced) {
    var tt = reduced ? 0 : t
    ctx.save()
    for (var i = 0; i < 5; i++) {
      var x0 = vw * (i / 4.5) + Math.sin(tt * 0.3 + i * 1.7) * vw * 0.04, wd = vw * (0.06 + (i % 3) * 0.03)
      var a = 0.05 + 0.03 * Math.sin(tt * 0.5 + i)
      ctx.fillStyle = 'rgba(150,225,255,' + (a * 0.8).toFixed(3) + ')'
      ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + wd, 0); ctx.lineTo(x0 + wd - vw * 0.18, vh); ctx.lineTo(x0 - vw * 0.25, vh); ctx.closePath(); ctx.fill()
    }
    ctx.restore()
  }
  // soft darkening bands at the top and bottom edges (a full-screen radial vignette costs ~6 ms on a
  // software canvas; two 12% bands cost a quarter of that)
  function vignette (ctx, vw, vh, name) {
    var th = theme(name), a = name === 'night' || name === 'deep' ? 0.45 : 0.25, h = Math.round(vh * 0.12)
    var top = ctx.createLinearGradient(0, 0, 0, h); top.addColorStop(0, th.lo + a + ')'); top.addColorStop(1, th.lo + '0)')
    var bot = ctx.createLinearGradient(0, vh - h, 0, vh); bot.addColorStop(0, th.lo + '0)'); bot.addColorStop(1, th.lo + a + ')')
    return { top: top, bot: bot, h: h, draw: function (c, W, H) { c.fillStyle = top; c.fillRect(0, 0, W, h); c.fillStyle = bot; c.fillRect(0, H - h, W, h) } }
  }
  var TEX = {}
  function textures (name) {
    if (TEX[name]) return TEX[name]
    var th = theme(name)
    var t = { swell: swellTile(th, 71), wave: waveTile(th, 11, false), wave2: waveTile(th, 23, true), foam: foamTile(th, 31, false), foam2: foamTile(th, 47, true),
      glint: glintTile(th, 53), caustic: causticTile(th, 61) }
    // PERF (measured, software canvas: a scaled pattern fill costs ~6 ms, 'lighter' ~20 ms, an UNSCALED
    // pattern at integer offsets ~1.3 ms): everything static is baked into ONE opaque 256-unit tile —
    // theme colour, swells, waves, fine foam, soft caustics — and that tile is pre-scaled to the screen's
    // device-pixel scale (Sea.draw), so a frame paints the whole sea with a single unscaled fill.
    var B = canvas(T, T), bx = B.getContext('2d')
    var g = bx.createLinearGradient(0, 0, T, T); g.addColorStop(0, th.mid); g.addColorStop(0.5, th.top); g.addColorStop(1, th.mid)
    bx.fillStyle = th.mid; bx.fillRect(0, 0, T, T)
    bx.globalAlpha = 0.35; bx.fillStyle = g; bx.fillRect(0, 0, T, T); bx.globalAlpha = 1
    bx.drawImage(t.swell, 0, 0); bx.drawImage(t.wave2, 0, 0); bx.drawImage(t.wave, 0, 0); bx.drawImage(t.foam, 0, 0)
    if (th.caustic) { bx.globalAlpha = Math.min(1, th.caustic * 1.4); bx.drawImage(t.caustic, 0, 0); bx.globalAlpha = 1 }
    TEX[name] = { base: B, foam2: t.foam2, glint: t.glint, caustic: t.caustic }
    return TEX[name]
  }
  function patterns (ctx, name) {
    var t = textures(name), P = {}
    for (var k in t) P[k] = ctx.createPattern(t[k], 'repeat')
    P.theme = theme(name); P.name = name
    return P
  }
  // one layer: pattern at scale s, offset (ox, oy), over the rect (in current transform coordinates)
  function layer (ctx, pat, o, s, ox, oy, alpha, op) {
    if (!pat || alpha <= 0) return
    ctx.save()
    ctx.globalAlpha = alpha
    if (op) ctx.globalCompositeOperation = op
    ctx.translate(ox, oy); ctx.scale(s, s)
    ctx.fillStyle = pat
    ctx.fillRect((o.x - ox) / s, (o.y - oy) / s, o.w / s, o.h / s)
    ctx.restore()
  }
  // Sea(name): the fast painter. draw(ctx, k, ox, oy, W, H) paints the sea in DEVICE pixels:
  // k = device px per world unit, (ox, oy) = device position of the world origin. The tile is rebuilt
  // only when k changes by more than 3% (resize / camera zoom), never per frame.
  function Sea (name) {
    var tex = textures(name), cur = null, TILE = 1.4        // one tile = 256 * 1.4 world units
    return {
      draw: function (ctx, k, ox, oy, Wd, Hd) {
        var px = Math.max(64, Math.round(T * TILE * k))
        if (!cur || Math.abs(cur.px - px) / px > 0.03) {
          px = Math.min(px, 2048)
          var c = canvas(px, px), x = c.getContext('2d')
          x.imageSmoothingQuality = 'high'; x.drawImage(tex.base, 0, 0, px, px)
          cur = { px: px, pat: ctx.createPattern(c, 'repeat') }
        }
        var tx = Math.round(((ox % cur.px) + cur.px) % cur.px), ty = Math.round(((oy % cur.px) + cur.px) % cur.px)
        ctx.setTransform(1, 0, 0, 1, tx, ty)
        ctx.fillStyle = cur.pat
        ctx.fillRect(-tx, -ty, Wd, Hd)
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        return cur.px
      }
    }
  }
  // the living part of the sea as a few dozen small sprites (cheap): twinkling glints and drifting foam
  // flecks on a world grid (current transform = world units). parallax: offset of the fleck layer.
  var GL = {}
  function glintSprite (col) {
    if (GL[col]) return GL[col]
    var c = canvas(24, 8), x = c.getContext('2d')
    var g = x.createLinearGradient(0, 0, 24, 0); g.addColorStop(0, col + '0)'); g.addColorStop(0.5, col + '1)'); g.addColorStop(1, col + '0)')
    x.fillStyle = g; x.beginPath(); x.ellipse(12, 4, 12, 2.2, 0, 0, TAU); x.fill()
    return (GL[col] = c)
  }
  function sparkles (ctx, name, x0, y0, x1, y1, t, reduced, par) {
    var th = theme(name), C = 70, tt = reduced ? 0 : t
    if (th.glint) {
      var g = glintSprite(th.glint)
      for (var cy = Math.floor(y0 / C); cy <= Math.ceil(y1 / C); cy++) {
        for (var cx = Math.floor(x0 / C); cx <= Math.ceil(x1 / C); cx++) {
          var h = hash(cx, cy)
          if (h > 0.42) continue
          var tw = Math.sin(tt * (1.5 + h * 3) + h * 40)
          if (tw < 0.2) continue
          ctx.globalAlpha = (tw - 0.2) * th.glintA * 1.6
          var s = 10 + h * 18
          ctx.drawImage(g, cx * C + hash(cx + 1, cy) * C - s / 2, cy * C + hash(cx, cy + 1) * C, s, s * 0.33)
        }
      }
      ctx.globalAlpha = 1
    }
    if (th.foamA) {
      // parallax flecks: a second, slower foam layer
      var px = par ? par.x * 0.25 : 0, py = par ? par.y * 0.25 : 0, C2 = 110
      ctx.fillStyle = 'rgba(255,255,255,' + (0.35 * th.foamA).toFixed(3) + ')'
      ctx.beginPath()
      for (var fy = Math.floor((y0 - py) / C2); fy <= Math.ceil((y1 - py) / C2); fy++) {
        for (var fx = Math.floor((x0 - px) / C2); fx <= Math.ceil((x1 - px) / C2); fx++) {
          var hh = hash(fx + 91, fy - 17)
          if (hh > 0.5) continue
          var ex = fx * C2 + hash(fx, fy + 5) * C2 + px + Math.sin(tt * 0.6 + hh * 9) * 6, ey = fy * C2 + hash(fx + 3, fy) * C2 + py
          var r = 2 + hh * 4
          ctx.moveTo(ex + r, ey); ctx.ellipse(ex, ey, r, r * 0.45, 0, 0, TAU)
        }
      }
      ctx.fill()
    }
  }
  function ocean (ctx, P, o) {
    var th = P.theme, t = o.reduced ? 0 : o.t || 0, px = o.par ? o.par.x : 0, py = o.par ? o.par.y : 0, s = o.scale || 1
    layer(ctx, P.base, o, 1.4 * s, t * 6, t * 2.5, 1)
    if (th.foamA) layer(ctx, P.foam2, o, 1.4 * s, px * 0.3 - t * 6, py * 0.3 + t * 2, 0.8)
    if (th.glint) layer(ctx, P.glint, o, s, t * 2, 0, o.reduced ? 0.7 : 0.55 + 0.45 * Math.sin(t * 1.7))
  }

  /* ── sprites ──────────────────────────────────────────────────────────── */
  function polyPts (r, n, R, sq) {
    var pts = []
    for (var i = 0; i < n; i++) { var a = i / n * TAU + (r() - 0.5) * 0.45, d = R * (0.72 + r() * 0.28); pts.push([Math.cos(a) * d, Math.sin(a) * d * (sq || 0.86)]) }
    return pts
  }
  function pathPts (x, pts, cx, cy, k, dx, dy) { x.beginPath(); for (var j = 0; j < pts.length; j++) { var px = cx + pts[j][0] * k + (dx || 0), py = cy + pts[j][1] * k + (dy || 0); if (j) x.lineTo(px, py); else x.moveTo(px, py) } x.closePath() }
  // layered iceberg (top view, slightly oblique): underwater shelf, shaded body, faceted top, white rim
  function berg (seed, R, tall, mode) {
    var r = rng(seed), pad = R * 0.6, cw = R * 2 + pad * 2, ch = R * 2 + pad * 2 + tall
    var c = canvas(cw, ch), x = c.getContext('2d'), cx = cw / 2, cy = pad + R
    var pts = polyPts(r, 9 + Math.floor(r() * 4), R)
    var rock = mode === 'rock', night = mode === 'night'
    // shelf under the water: a big pale-cyan (or dark) shape, softened by stacking
    for (var s = 3; s >= 1; s--) {
      x.fillStyle = rock ? 'rgba(20,60,70,' + (0.12 * s) + ')' : night ? 'rgba(110,200,235,' + (0.1 * s) + ')' : 'rgba(170,240,255,' + (0.14 * s) + ')'
      pathPts(x, pts, cx, cy + tall * 0.7, 1.05 + s * 0.12); x.fill()
    }
    // body (the near face in shade)
    for (var h = tall; h > 0; h -= 2) { x.fillStyle = rock ? (h === tall ? '#1f2e36' : '#33454f') : (h === tall ? '#3a8cb7' : '#5aaad2'); pathPts(x, pts, cx, cy, 1, 0, h); x.fill() }
    x.fillStyle = rock ? '#5b6f78' : '#e8f7ff'; pathPts(x, pts, cx, cy, 1); x.fill()
    var px0 = cx + (r() - 0.5) * R * 0.4, py0 = cy - R * 0.1
    for (var f = 0; f < pts.length; f++) {
      var p1 = pts[f], p2 = pts[(f + 1) % pts.length], sh = Math.cos(Math.atan2(p1[1] + p2[1], p1[0] + p2[0]) + 2.2)
      x.fillStyle = rock ? (sh > 0 ? 'rgba(170,190,190,' + (0.1 + sh * 0.3) + ')' : 'rgba(10,25,30,' + (-sh * 0.4) + ')')
        : (sh > 0 ? 'rgba(255,255,255,' + (0.25 + sh * 0.55) + ')' : 'rgba(80,160,205,' + (-sh * 0.45) + ')')
      x.beginPath(); x.moveTo(px0, py0); x.lineTo(cx + p1[0], cy + p1[1]); x.lineTo(cx + p2[0], cy + p2[1]); x.closePath(); x.fill()
    }
    if (rock) {
      // algae patches
      for (var a = 0; a < 5; a++) { x.fillStyle = 'rgba(70,140,90,.35)'; x.beginPath(); x.ellipse(cx + (r() - 0.5) * R, cy + (r() - 0.5) * R * 0.8, R * 0.18, R * 0.1, r() * 3, 0, TAU); x.fill() }
    }
    // rim: white (ice) / wet highlight (rock)
    x.strokeStyle = rock ? 'rgba(200,230,235,.55)' : '#ffffff'; x.lineWidth = Math.max(1.5, R * 0.05); pathPts(x, pts, cx, cy, 1); x.stroke()
    x.strokeStyle = rock ? '#15242b' : '#4c9dc8'; x.lineWidth = Math.max(1, R * 0.025); pathPts(x, pts, cx, cy, 1.02, 0, 1); x.stroke()
    return { c: c, cx: cx, cy: cy, R: R }
  }
  function buoy (size) {
    var S = size, c = canvas(S * 2.2, S * 2.6), x = c.getContext('2d'), cx = S * 1.1, cy = S * 1.4
    x.fillStyle = 'rgba(0,15,30,.28)'; x.beginPath(); x.ellipse(cx + S * 0.12, cy + S * 0.35, S * 0.78, S * 0.42, 0, 0, TAU); x.fill()
    x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.ellipse(cx, cy + S * 0.22, S * 0.95, S * 0.42, 0, 0, TAU); x.fill()
    var g = x.createRadialGradient(cx - S * 0.25, cy - S * 0.3, S * 0.1, cx, cy, S * 0.75)
    g.addColorStop(0, '#ff8a7a'); g.addColorStop(0.55, '#e0392f'); g.addColorStop(1, '#8e1a14')
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, S * 0.7, 0, TAU); x.fill()
    x.save(); x.beginPath(); x.arc(cx, cy, S * 0.7, 0, TAU); x.clip()
    x.fillStyle = '#f7f3ea'; x.fillRect(cx - S, cy - S * 0.2, S * 2, S * 0.36)
    x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(cx - S, cy + S * 0.12, S * 2, S * 0.05)
    x.restore()
    x.fillStyle = '#3a3a3a'; x.fillRect(cx - S * 0.08, cy - S * 1.15, S * 0.16, S * 0.6)
    var lg = x.createRadialGradient(cx, cy - S * 1.2, 0, cx, cy - S * 1.2, S * 0.4)
    lg.addColorStop(0, 'rgba(255,245,190,1)'); lg.addColorStop(1, 'rgba(255,220,120,0)')
    x.fillStyle = lg; x.beginPath(); x.arc(cx, cy - S * 1.2, S * 0.4, 0, TAU); x.fill()
    x.fillStyle = '#ffe9a0'; x.beginPath(); x.arc(cx, cy - S * 1.2, S * 0.14, 0, TAU); x.fill()
    return { c: c, cx: cx, cy: cy, S: S }
  }
  // gate post: a small striped lighthouse seen from above-front
  function post (size) {
    var S = size, c = canvas(S * 2.4, S * 4), x = c.getContext('2d'), cx = S * 1.2, by = S * 3.5
    x.fillStyle = 'rgba(255,255,255,.5)'; x.beginPath(); x.ellipse(cx, by, S * 1.1, S * 0.42, 0, 0, TAU); x.fill()
    x.fillStyle = '#6d7a82'; x.beginPath(); x.ellipse(cx, by - S * 0.1, S * 0.9, S * 0.34, 0, 0, TAU); x.fill()
    // tower
    var tw = S * 0.62, top = by - S * 2.6
    for (var i = 0; i < 4; i++) {
      x.fillStyle = i % 2 ? '#f5f1e8' : '#d8392f'
      var y0 = by - S * 0.2 - (i + 1) * S * 0.6, w0 = tw * (1 - i * 0.08)
      x.beginPath(); x.moveTo(cx - w0, y0 + S * 0.6); x.lineTo(cx + w0, y0 + S * 0.6); x.lineTo(cx + w0 * 0.92, y0); x.lineTo(cx - w0 * 0.92, y0); x.closePath(); x.fill()
    }
    x.fillStyle = 'rgba(0,0,0,.14)'; x.fillRect(cx + tw * 0.3, top, tw * 0.5, S * 2.4)
    // lamp room
    x.fillStyle = '#2b3a44'; x.fillRect(cx - tw * 0.7, top - S * 0.5, tw * 1.4, S * 0.5)
    var lg = x.createRadialGradient(cx, top - S * 0.28, 0, cx, top - S * 0.28, S * 1.1)
    lg.addColorStop(0, 'rgba(255,240,170,.95)'); lg.addColorStop(1, 'rgba(255,220,120,0)')
    x.fillStyle = lg; x.beginPath(); x.arc(cx, top - S * 0.28, S * 1.1, 0, TAU); x.fill()
    x.fillStyle = '#b8332a'; x.beginPath(); x.moveTo(cx - tw * 0.8, top - S * 0.5); x.lineTo(cx, top - S * 1.05); x.lineTo(cx + tw * 0.8, top - S * 0.5); x.closePath(); x.fill()
    return { c: c, cx: cx, by: by, top: top - S * 0.3, S: S }
  }
  function seaweed (seed) {
    var c = canvas(90, 90), x = c.getContext('2d'), r = rng(seed)
    x.lineCap = 'round'
    for (var i = 0; i < 6; i++) {
      var a = r() * TAU, l = 22 + r() * 18
      x.strokeStyle = i % 2 ? 'rgba(60,130,70,.75)' : 'rgba(95,160,70,.7)'; x.lineWidth = 4 + r() * 3
      x.beginPath(); x.moveTo(45, 45)
      x.quadraticCurveTo(45 + Math.cos(a + 0.6) * l * 0.6, 45 + Math.sin(a + 0.6) * l * 0.6, 45 + Math.cos(a) * l, 45 + Math.sin(a) * l)
      x.stroke()
    }
    return c
  }
  function floeS (seed, R) {
    var r = rng(seed), c = canvas(R * 2.6, R * 2.6), x = c.getContext('2d'), cx = R * 1.3, cy = R * 1.3, pts = polyPts(r, 8, R, 0.8)
    x.fillStyle = 'rgba(160,230,250,.35)'; pathPts(x, pts, cx, cy + 3, 1.15); x.fill()
    x.fillStyle = '#9fd3ea'; pathPts(x, pts, cx, cy + 2, 1); x.fill()
    x.fillStyle = '#f2fbff'; pathPts(x, pts, cx, cy, 1); x.fill()
    x.strokeStyle = 'rgba(120,190,220,.8)'; x.lineWidth = 1; x.beginPath(); x.moveTo(cx - R * 0.5, cy); x.lineTo(cx + R * 0.2, cy + R * 0.2); x.stroke()
    return c
  }
  function fish () {
    var c = canvas(64, 28), x = c.getContext('2d')
    x.fillStyle = 'rgba(0,12,24,.55)'
    x.beginPath(); x.ellipse(28, 14, 20, 8, 0, 0, TAU); x.fill()
    x.beginPath(); x.moveTo(46, 14); x.lineTo(62, 4); x.lineTo(62, 24); x.closePath(); x.fill()
    return c
  }
  function gull () {
    var c = canvas(70, 40), x = c.getContext('2d')
    x.strokeStyle = 'rgba(0,20,40,.28)'; x.lineWidth = 5; x.lineCap = 'round'; x.lineJoin = 'round'
    x.beginPath(); x.moveTo(6, 16); x.quadraticCurveTo(20, 6, 35, 20); x.quadraticCurveTo(50, 6, 64, 16); x.stroke()
    return c
  }
  function bubbles (seed) {
    var c = canvas(60, 60), x = c.getContext('2d'), r = rng(seed)
    for (var i = 0; i < 7; i++) {
      var bx = 10 + r() * 40, by = 10 + r() * 40, br = 2 + r() * 5
      x.strokeStyle = 'rgba(190,240,255,.6)'; x.lineWidth = 1.2; x.beginPath(); x.arc(bx, by, br, 0, TAU); x.stroke()
      x.fillStyle = 'rgba(255,255,255,.5)'; x.beginPath(); x.arc(bx - br * 0.35, by - br * 0.35, br * 0.3, 0, TAU); x.fill()
    }
    return c
  }
  var SPR = {}
  function sprites (name) {
    var th = theme(name), key = name
    if (SPR[key]) return SPR[key]
    var m = th.ice === 'rock' ? 'rock' : th.ice === 'night' ? 'night' : 'day'
    var o = { berg: [], big: [], floe: [], mode: m }
    for (var i = 0; i < 6; i++) o.berg.push(berg(11 + i * 7, 90, m === 'rock' ? 12 : 16, m))
    for (var j = 0; j < 3; j++) o.big.push(berg(97 + j * 13, 110, 26, m))
    for (var f = 0; f < 3; f++) o.floe.push(floeS(301 + f * 5, 20 + f * 6))
    o.fated = berg(211, 110, 30, m)
    o.buoy = buoy(22); o.post = post(22)
    o.seaweed = [seaweed(5), seaweed(9)]; o.fish = fish(); o.gull = gull(); o.bubbles = [bubbles(3), bubbles(8)]
    return (SPR[key] = o)
  }

  /* ── set dressing: one deterministic item per world cell (or none) ───── */
  function dressAt (cx, cy, name) {
    var th = theme(name), h = hash(cx, cy)
    if (h > 0.42) return null
    var kind = th.dress[Math.floor(hash(cx + 7, cy - 3) * th.dress.length)]
    return { kind: kind, fx: hash(cx, cy + 11), fy: hash(cx - 5, cy), v: hash(cx + 3, cy + 3), rot: hash(cx - 9, cy + 1) * TAU }
  }
  // (x, y) = where the item sits (current transform), k = pixels per world unit, img = optional owner sprites
  function drawDress (ctx, S, it, x, y, k, t, reduced, img) {
    var tt = reduced ? 0 : t
    if (it.kind === 'gull') {
      // a gull's shadow gliding across the water
      var gx = x + ((tt * (30 + it.v * 30) + it.fx * 600) % 600 - 300) * k, gy = y + Math.sin(tt * 0.7 + it.v * 6) * 20 * k
      var s = 0.7 + it.v * 0.5, flap = reduced ? 1 : 0.8 + 0.2 * Math.sin(tt * 6 + it.v * 9)
      ctx.drawImage(S.gull, gx - 35 * k * s, gy - 20 * k * s * flap, 70 * k * s, 40 * k * s * flap)
      return
    }
    if (it.kind === 'fish') {
      var fx = x + ((tt * (18 + it.v * 20) + it.fx * 400) % 400 - 200) * k * (it.v > 0.5 ? 1 : -1)
      ctx.save(); ctx.translate(fx, y); if (it.v <= 0.5) ctx.scale(-1, 1)
      ctx.drawImage(S.fish, -32 * k, -14 * k, 64 * k, 28 * k); ctx.restore()
      return
    }
    var bob = reduced ? 0 : Math.sin(tt * 1.5 + it.v * 9) * 2 * k
    if (it.kind === 'seaweed') { var sw = S.seaweed[it.v > 0.5 ? 1 : 0]; ctx.drawImage(sw, x - 45 * k, y - 45 * k + bob, 90 * k, 90 * k); return }
    if (it.kind === 'bubbles') {
      var bb = S.bubbles[it.v > 0.5 ? 1 : 0], ph = reduced ? 0.5 : (tt * 0.4 + it.v) % 1
      ctx.globalAlpha = Math.sin(ph * Math.PI); ctx.drawImage(bb, x - 30 * k, y - 30 * k - ph * 20 * k, 60 * k, 60 * k); ctx.globalAlpha = 1
      return
    }
    if (it.kind === 'floe') { var fl = S.floe[Math.floor(it.v * 3) % 3]; ctx.globalAlpha = 0.75; ctx.drawImage(fl, x - fl.width / 2 * k, y - fl.height / 2 * k + bob, fl.width * k * 0.7, fl.height * k * 0.7); ctx.globalAlpha = 1; return }
    if (it.kind === 'barrel') {
      var im = img && img.barrel
      var sz = 30 * k
      ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.ellipse(x, y + sz * 0.3 + bob, sz * 0.6, sz * 0.22, 0, 0, TAU); ctx.fill()
      if (im && im.complete && im.naturalWidth) ctx.drawImage(im, x - sz / 2, y - sz * 0.6 + bob, sz, sz * im.naturalHeight / im.naturalWidth)
      else { ctx.fillStyle = '#8a5a2c'; ctx.fillRect(x - sz * 0.3, y - sz * 0.4 + bob, sz * 0.6, sz * 0.7) }
    }
  }

  /* ── wake ─────────────────────────────────────────────────────────────── */
  // pts newest (at the stern) first: {x, y, nx, ny, age}; o { w0 half-width at the stern, spread per second,
  // arm (Kelvin arm spread), boost 0..1, fade seconds, scale }
  function wake (ctx, pts, o) {
    var n = pts.length
    if (n < 3) return
    var w0 = o.w0, sp = o.spread, fade = o.fade || 3, k = o.scale || 1, i, p
    // turbulent centre ribbon, quads with falling alpha
    for (i = 0; i < n - 1; i++) {
      p = pts[i]; var q = pts[i + 1]
      var a = Math.max(0, 1 - p.age / fade) * (0.34 + (o.boost || 0) * 0.16)
      if (a <= 0.01) break
      var wa = w0 * (0.6 + p.age * 0.5), wb = w0 * (0.6 + q.age * 0.5)
      ctx.fillStyle = 'rgba(235,250,255,' + a.toFixed(3) + ')'
      ctx.beginPath()
      ctx.moveTo(p.x + p.nx * wa, p.y + p.ny * wa); ctx.lineTo(q.x + q.nx * wb, q.y + q.ny * wb)
      ctx.lineTo(q.x - q.nx * wb, q.y - q.ny * wb); ctx.lineTo(p.x - p.nx * wa, p.y - p.ny * wa)
      ctx.closePath(); ctx.fill()
    }
    // V arms: two diverging foam lines, thick near the ship, thin and faint behind
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    for (var side = -1; side <= 1; side += 2) {
      for (var c = 0; c < 4; c++) {
        var i0 = Math.floor(n * c / 4), i1 = Math.min(n - 1, Math.floor(n * (c + 1) / 4) + 1)
        if (i1 - i0 < 1) continue
        var al = (0.7 - c * 0.16) * (1 + (o.boost || 0) * 0.3)
        ctx.strokeStyle = 'rgba(245,252,255,' + Math.min(0.95, al).toFixed(3) + ')'
        ctx.lineWidth = Math.max(0.8, (3.4 - c * 0.7) * k)
        ctx.beginPath()
        for (i = i0; i <= i1; i++) {
          p = pts[i]
          var d = w0 + p.age * sp
          var x = p.x + p.nx * d * side, y = p.y + p.ny * d * side
          if (i === i0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
    }
    // foam dots scattered along the arms
    ctx.fillStyle = 'rgba(255,255,255,.55)'
    for (i = 1; i < n; i += 2) {
      p = pts[i]
      var dd = w0 + p.age * sp, jj = hash(i, Math.round(p.age * 3)) - 0.5
      var r = Math.max(0.6, (2.2 - p.age * 0.5) * k)
      if (r <= 0.6 || p.age > fade) continue
      ctx.beginPath(); ctx.arc(p.x + p.nx * dd * (jj > 0 ? 1 : -1) * (0.85 + Math.abs(jj) * 0.3), p.y + p.ny * dd * (jj > 0 ? 1 : -1), r, 0, TAU); ctx.fill()
    }
  }

  /* ── gate arch: two lighthouse posts, a sagging rope with pennants ─────── */
  function arch (ctx, S, xL, yL, xR, yR, k, t, o) {
    o = o || {}
    var P = S.post, s = k * (o.size || 1)
    var sag = 26 * s, ph = o.reduced ? 0 : t
    // rope
    var hL = P.by - P.top, topL = yL - hL * s * 0.72, topR = yR - hR(P) * s * 0.72
    function hR (p) { return p.by - p.top }
    var mx = (xL + xR) / 2, my = (topL + topR) / 2 + sag
    ctx.strokeStyle = o.passed ? 'rgba(255,236,150,.95)' : 'rgba(250,240,220,.9)'; ctx.lineWidth = Math.max(1, 2 * s)
    ctx.beginPath(); ctx.moveTo(xL, topL); ctx.quadraticCurveTo(mx, my, xR, topR); ctx.stroke()
    // pennants along the rope
    var cols = o.passed ? ['#ffd24a', '#fff2a8'] : ['#e8412f', '#ffd24a', '#2f8fd0', '#f7f3ea']
    var N = 9
    for (var i = 1; i < N; i++) {
      var u = i / N, px = (1 - u) * (1 - u) * xL + 2 * (1 - u) * u * mx + u * u * xR, py = (1 - u) * (1 - u) * topL + 2 * (1 - u) * u * my + u * u * topR
      var sw = o.reduced ? 0 : Math.sin(ph * 3 + i) * 2 * s
      ctx.fillStyle = cols[i % cols.length]
      ctx.beginPath(); ctx.moveTo(px - 6 * s, py); ctx.lineTo(px + 6 * s, py); ctx.lineTo(px + sw, py + 13 * s); ctx.closePath(); ctx.fill()
    }
    // posts
    for (var sd = 0; sd < 2; sd++) {
      var x = sd ? xR : xL, y = sd ? yR : yL
      ctx.drawImage(P.c, x - P.cx * s, y - P.by * s * 0.72 - (P.c.height - P.by) * s * 0.0, P.c.width * s, P.c.height * s * 0.72)
    }
    if (o.passed && o.glow > 0) {
      ctx.strokeStyle = 'rgba(255,230,120,' + (o.glow * 0.8).toFixed(3) + ')'; ctx.lineWidth = 6 * s
      ctx.beginPath(); ctx.moveTo(xL, topL); ctx.quadraticCurveTo(mx, my, xR, topR); ctx.stroke()
    }
  }

  /* ── confetti (screen space) ──────────────────────────────────────────── */
  function Confetti () {
    var parts = [], COLS = ['#ffd24a', '#e8412f', '#2fb866', '#2f8fd0', '#ffffff', '#ff8fb1']
    return {
      burst: function (x, y, n) {
        for (var i = 0; i < n && parts.length < 220; i++) {
          var a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, v = 260 + Math.random() * 380
          parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: Math.random() * TAU, vr: (Math.random() - 0.5) * 14, w: 6 + Math.random() * 6, h: 3 + Math.random() * 4, c: COLS[i % COLS.length], life: 0, max: 2.2 + Math.random() * 1.2 })
        }
      },
      step: function (dt) {
        for (var i = parts.length - 1; i >= 0; i--) {
          var p = parts[i]
          p.life += dt; if (p.life > p.max) { parts.splice(i, 1); continue }
          p.vy += 520 * dt; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt
        }
      },
      draw: function (ctx) {
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i]
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = Math.min(1, (p.max - p.life) * 2)
          ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 1.7))); ctx.restore()
        }
        ctx.globalAlpha = 1
      },
      get n () { return parts.length }
    }
  }

  /* ── HUD: wood & brass (shared classes) ───────────────────────────────── */
  var HUD_CSS = [
    '.tkx-wood{background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(0,0,0,.12)),repeating-linear-gradient(92deg,#7a4a24 0 7px,#6d4120 7px 9px,#835029 9px 17px,#70431f 17px 20px);border:3px solid #d9a441;border-radius:16px;box-shadow:inset 0 0 0 2px #7a5314,inset 0 2px 0 3px rgba(255,236,170,.35),0 4px 0 #4a2c10,0 8px 16px rgba(0,0,0,.3);color:#fff4d6;text-shadow:0 1px 0 rgba(40,20,0,.8)}',
    '.tkx-brass{background:radial-gradient(circle at 35% 28%,#fff4c4 0,#f2c65e 30%,#cf9433 64%,#8d5b18 100%);border:4px solid #6b4412;box-shadow:inset 0 -5px 0 rgba(90,55,10,.45),inset 0 3px 0 rgba(255,250,220,.6),0 6px 0 #4f310b,0 10px 18px rgba(0,0,0,.32)}',
    '.tkx-chip{display:flex;align-items:center;gap:8px;padding:5px 12px 5px 6px;font-family:"Fredoka One","Fredoka",var(--font-display,"Nunito"),system-ui,sans-serif}',
    '.tkx-chip img{width:30px;height:30px;object-fit:contain;flex:none;filter:drop-shadow(0 2px 0 rgba(0,0,0,.35))}',
    '.tkx-chip small{display:block;font:800 12px/1.1 system-ui,sans-serif;color:#ffe3a3;letter-spacing:.3px}',
    '.tkx-chip b{display:block;font-weight:400;font-size:21px;line-height:1.05;font-variant-numeric:tabular-nums}',
    '.tkx-route{position:relative;display:flex;align-items:center;gap:8px;padding:8px 12px 8px 10px;min-width:220px}',
    '.tkx-track{position:relative;flex:1;height:14px;border-radius:8px;background:#2e1a0a;box-shadow:inset 0 2px 3px rgba(0,0,0,.6),0 1px 0 rgba(255,236,170,.35)}',
    '.tkx-fill{position:absolute;left:2px;top:2px;bottom:2px;width:calc(100% - 4px);border-radius:6px;background:linear-gradient(#7fe0ff,#2f8fd0);transform-origin:0 50%;transform:scaleX(var(--tkx-p,0))}',
    '.tkx-dots{position:absolute;inset:0;background:radial-gradient(circle,rgba(255,244,210,.7) 1.5px,transparent 2px) 0 50%/14px 14px repeat-x;border-radius:8px}',
    '.tkx-rship{position:absolute;top:50%;left:0;width:40px;height:32px;margin:-18px 0 0 -20px;object-fit:contain;transform:translateX(calc(var(--tkx-p,0) * var(--tkx-tw,160px)));filter:drop-shadow(0 2px 0 rgba(0,0,0,.45));pointer-events:none}',
    '.tkx-rdot{position:absolute;top:50%;left:0;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:#fff4d6;border:3px solid #d9a441;transform:translateX(calc(var(--tkx-p,0) * var(--tkx-tw,160px)))}',
    '.tkx-flag{flex:none;position:relative;width:26px;height:30px}',
    '.tkx-flag:before{content:"";position:absolute;left:3px;top:0;width:3px;height:30px;border-radius:2px;background:#f4e6c4}',
    '.tkx-flag:after{content:"";position:absolute;left:6px;top:1px;width:19px;height:14px;background:conic-gradient(#111 25%,#fff 0 50%,#111 0 75%,#fff 0) 0 0/9.5px 7px;box-shadow:0 1px 2px rgba(0,0,0,.5)}',
    '.tkx-rlabel{position:absolute;left:12px;top:-9px;padding:1px 8px;border-radius:8px;background:#4a2c10;border:1.5px solid #d9a441;font:800 12px/1.3 system-ui,sans-serif;color:#ffe3a3;white-space:nowrap}',
    '.tkx-pop{font-family:"Fredoka One","Fredoka",var(--font-display,"Nunito"),system-ui,sans-serif!important;color:#ffe066!important;-webkit-text-stroke:1.5px #5a3200;text-shadow:0 3px 0 #5a3200,0 0 14px rgba(255,210,90,.7)!important}'
  ].join('\n')
  function injectHud () {
    if (D.getElementById('tkx-style')) return
    var s = D.createElement('style'); s.id = 'tkx-style'; s.textContent = HUD_CSS; D.head.appendChild(s)
  }
  // route bar: ship icon (img url, or a brass dot) sails from 0 to 1 toward the checkered flag
  function routeBar (o) {
    injectHud()
    o = o || {}
    var el = D.createElement('div')
    el.className = 'tkx-route tkx-wood' + (o.cls ? ' ' + o.cls : '')
    el.setAttribute('role', 'progressbar'); el.setAttribute('aria-valuemin', '0'); el.setAttribute('aria-valuemax', '100'); el.setAttribute('aria-label', o.label || 'Perjalanan')
    el.innerHTML = '<div class="tkx-track"><i class="tkx-fill"></i><i class="tkx-dots"></i>' + (o.ship ? '<img class="tkx-rship" alt="" draggable="false">' : '<i class="tkx-rdot"></i>') + '</div><span class="tkx-flag" aria-hidden="true"></span>' + (o.text != null ? '<span class="tkx-rlabel"></span>' : '')
    if (o.ship) el.querySelector('img').src = o.ship
    var track = el.querySelector('.tkx-track'), lab = el.querySelector('.tkx-rlabel'), last = -1, lastTxt = null
    return {
      el: el,
      set: function (f, txt) {
        f = Math.max(0, Math.min(1, f || 0))
        var q = Math.round(f * 400) / 400
        if (q !== last) { last = q; el.style.setProperty('--tkx-p', String(q)); el.setAttribute('aria-valuenow', String(Math.round(q * 100))) }
        if (lab && txt != null && txt !== lastTxt) { lastTxt = txt; lab.textContent = txt }
      },
      // call from resize only (one layout read)
      size: function () { var w = track.getBoundingClientRect().width; if (w) el.style.setProperty('--tkx-tw', Math.round(w) + 'px') },
      value: function () { return last }
    }
  }
  function chip (icon, label, cls) {
    injectHud()
    var e = D.createElement('div')
    e.className = 'tkx-chip tkx-wood' + (cls ? ' ' + cls : '')
    e.innerHTML = (icon ? '<img alt="" draggable="false">' : '') + '<span><small></small><b></b></span>'
    if (icon) e.querySelector('img').src = icon
    e.querySelector('small').textContent = label
    return e
  }

  W.TKSea = { theme: theme, THEMES: THEMES, textures: textures, patterns: patterns, ocean: ocean, layer: layer, sprites: sprites, dressAt: dressAt, drawDress: drawDress,
    wake: wake, arch: arch, rays: rays, vignette: vignette, Sea: Sea, sparkles: sparkles, Confetti: Confetti, injectHud: injectHud, routeBar: routeBar, chip: chip, hash: hash, version: '1.0.0' }
})(window)
