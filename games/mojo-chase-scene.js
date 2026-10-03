/* =============================================================================
 * mojo-chase-scene.js — window.MojoChaseScene: sky, SUPER PARALLAX background layers, weather, lighting and
 * post effects for the G31 chase. Layers (back to front) and their FORWARD factors (owner spec):
 *   SKY       procedural gradient from the owner skybox palette + sun/moon bloom, god rays, lens flare, clouds
 *   FAR 0.05  the owner FAR strip (seamless, image-based), offset by curvature and hills
 *   MID 0.20  the owner MID strip when the stage has one, else a pre-rendered biome silhouette
 *   ROADSIDE 0.70 a pre-rendered near tree/bush/lamp band at the horizon (the depth-scaled props live on the road)
 *   ROAD 1.00 mojo-chase-track.js
 * All bands are pre-rendered canvases; per frame only drawImage + a few fills. Weather emits pooled particles.
 * ==========================================================================*/
(function (W, D) {
  'use strict'
  var TAU = Math.PI * 2
  function OFF (k) { return W.__mcOff && W.__mcOff[k] }
  function cv (w, h) { var c = D.createElement('canvas'); c.width = w; c.height = h; return c }
  function rnd (seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 } }

  // where the horizon sits inside each FAR strip (fraction of its height). Codex strips: 0.62 by contract.
  var FAR_HORIZON = { swoppiton: 0.86, 'swoppiton-mid': 0.9, castle: 0.88, lighthouse: 0.84, 'forest-lake': 0.9, mesas: 0.8, aurora: 0.86, 'night-city': 0.9 }
  var GRADE = { coastal: 'rgba(255,214,150,.10)', town: 'rgba(255,220,170,.08)', forest: 'rgba(120,200,140,.10)', desert: 'rgba(255,150,70,.16)',
    snow: 'rgba(150,200,255,.12)', construction: 'rgba(255,200,90,.10)', farm: 'rgba(255,210,120,.10)', city: 'rgba(120,80,255,.16)' }

  function silhouette (biome, haze, night) {
    var w = 1600, h = 240, c = cv(w, h), x = c.getContext('2d'), r = rnd(biome.length * 97 + 13)
    var M = W.MojoChaseTrack, base = { coastal: '#5a9a6a', town: '#c79a7e', forest: '#2f6b44', desert: '#c4704a', snow: '#dfe9f5', construction: '#8f8a80', farm: '#6aa04e', city: '#232a52' }[biome] || '#5a9a6a'
    var col = M.mix(base, haze, night ? 0.15 : 0.35), dark = M.mix(base, '#000000', 0.25)
    x.fillStyle = col
    if (biome === 'town' || biome === 'city' || biome === 'construction') {
      for (var bx = 0; bx < w;) {
        var bw = 50 + r() * 90, bh = 60 + r() * (biome === 'city' ? 170 : 110)
        x.fillStyle = r() < 0.5 ? col : M.mix(col, '#ffffff', 0.12); x.fillRect(bx, h - bh, bw, bh)
        if (biome !== 'construction') { x.fillStyle = M.mix(col, '#000000', 0.15); x.fillRect(bx + bw * 0.1, h - bh - 10, bw * 0.8, 10) }
        if (night || biome === 'city') { for (var wy = h - bh + 14; wy < h - 12; wy += 16) for (var wx = bx + 8; wx < bx + bw - 10; wx += 14) if (r() < 0.55) { x.fillStyle = r() < 0.7 ? '#ffd86b' : '#7fe7ff'; x.fillRect(wx, wy, 6, 8) } }
        else { x.fillStyle = 'rgba(255,255,255,.35)'; for (var wy2 = h - bh + 14; wy2 < h - 14; wy2 += 20) for (var wx2 = bx + 8; wx2 < bx + bw - 10; wx2 += 16) x.fillRect(wx2, wy2, 6, 9) }
        if (biome === 'construction' && r() < 0.3) { x.strokeStyle = '#e8a317'; x.lineWidth = 5; x.beginPath(); x.moveTo(bx + bw / 2, h - bh); x.lineTo(bx + bw / 2, h - bh - 70); x.lineTo(bx + bw / 2 + 80, h - bh - 70); x.stroke() }
        bx += bw + r() * 12
      }
    } else if (biome === 'desert') {
      x.beginPath(); x.moveTo(0, h)
      for (var mx = 0; mx <= w; mx += 40) { var top = h - 40 - (Math.sin(mx * 0.004) * 0.5 + 0.5) * 110 * r(); x.lineTo(mx, top); x.lineTo(mx + 30, top) }
      x.lineTo(w, h); x.closePath(); x.fill()
    } else {
      x.beginPath(); x.moveTo(0, h)
      for (var hx = 0; hx <= w; hx += 8) x.lineTo(hx, h - 60 - Math.sin(hx * 0.006) * 40 - Math.sin(hx * 0.017 + 1) * 22)
      x.lineTo(w, h); x.closePath(); x.fill()
      if (biome === 'forest' || biome === 'snow' || biome === 'farm' || biome === 'coastal') {
        for (var tx = 0; tx < w; tx += 18 + r() * 26) {
          var th = 40 + r() * 60, ty = h - 50 - Math.sin(tx * 0.006) * 40
          x.fillStyle = biome === 'snow' ? '#f6fbff' : dark
          if (biome === 'coastal' || biome === 'farm') { x.beginPath(); x.arc(tx, ty - th * 0.5, th * 0.35, 0, TAU); x.fill() }
          else { x.beginPath(); x.moveTo(tx, ty - th); x.lineTo(tx - th * 0.3, ty); x.lineTo(tx + th * 0.3, ty); x.closePath(); x.fill() }
        }
      }
    }
    return c
  }
  function nearBand (biome, night) {
    var w = 1600, h = 110, c = cv(w, h), x = c.getContext('2d'), r = rnd(biome.length * 31 + 7), M = W.MojoChaseTrack
    var g = (M.BIOME[biome] || M.BIOME.coastal).grass[1], dark = M.mix(g, '#0a2010', night ? 0.6 : 0.3)
    for (var bx = 0; bx < w; bx += 10 + r() * 22) {
      var s = 18 + r() * 34
      x.fillStyle = r() < 0.5 ? dark : M.mix(dark, '#ffffff', 0.08)
      if (biome === 'desert') { if (r() < 0.25) { x.fillRect(bx, h - s * 1.6, 7, s * 1.6); x.fillRect(bx - 8, h - s * 1.1, 8, 5); x.fillRect(bx - 8, h - s * 1.4, 5, s * 0.35) } continue }
      if (biome === 'city' || biome === 'town') { if (r() < 0.35) { x.fillStyle = '#2b3140'; x.fillRect(bx, h - 70, 4, 70); x.fillStyle = night ? '#ffe08a' : '#cfd8e3'; x.beginPath(); x.arc(bx + 2, h - 72, 6, 0, TAU); x.fill() } else { x.beginPath(); x.arc(bx, h - s * 0.5, s * 0.5, Math.PI, 0); x.fill() } continue }
      if (biome === 'snow') { x.fillStyle = '#f2f8ff' }
      x.beginPath(); x.arc(bx, h - s * 0.45, s * 0.55, Math.PI, 0); x.fill()
      if ((biome === 'forest' || biome === 'snow') && r() < 0.4) { x.beginPath(); x.moveTo(bx, h - s * 2.6); x.lineTo(bx - s * 0.5, h - s * 0.3); x.lineTo(bx + s * 0.5, h - s * 0.3); x.closePath(); x.fill() }
    }
    x.fillStyle = dark; x.fillRect(0, h - 8, w, 8)
    return c
  }

  function create (stage, img, opts) {
    opts = opts || {}
    var A = W.MojoTrackAnchors || { sky: {} }, pal = A.sky[stage.sky] || ['#3f8fe6', '#8cc8ff', '#d9eeff']
    var night = !!stage.night, FX = W.MojoChaseFX, T = FX.build()
    var far = img['far/' + stage.far], mid = stage.mid ? img['far/' + stage.mid] : null
    var haze = pal[2], farTop = pal[1]
    // the sky gradient's lower colour = the FAR strip's own top row, so the strip blends into the sky
    try {
      if (far) { var sc = cv(32, 4), sx = sc.getContext('2d'); sx.drawImage(far, 0, 0, far.naturalWidth, 6, 0, 0, 32, 4); var d = sx.getImageData(0, 0, 32, 1).data, rr = 0, gg = 0, bb = 0; for (var i = 0; i < 128; i += 4) { rr += d[i]; gg += d[i + 1]; bb += d[i + 2] } farTop = 'rgb(' + Math.round(rr / 32) + ',' + Math.round(gg / 32) + ',' + Math.round(bb / 32) + ')' }
    } catch (e) {}
    var midC = mid ? null : silhouette(stage.biome, haze, night), near = nearBand(stage.biome, night)
    if (mid && mid.naturalWidth) {
      // an opaque owner MID strip carries its own sky: fade its top 45% out so the FAR layer shows through
      var mc0 = cv(mid.naturalWidth, mid.naturalHeight), mx0 = mc0.getContext('2d')
      mx0.drawImage(mid, 0, 0)
      if (!/CHASE_BG_MID/.test(mid.src)) {
        var fg0 = mx0.createLinearGradient(0, 0, 0, mc0.height * 0.5); fg0.addColorStop(0, 'rgba(0,0,0,1)'); fg0.addColorStop(1, 'rgba(0,0,0,0)')
        mx0.globalCompositeOperation = 'destination-out'; mx0.fillStyle = fg0; mx0.fillRect(0, 0, mc0.width, mc0.height * 0.5)
      }
      mid = { naturalWidth: mc0.width, naturalHeight: mc0.height, canvas: mc0 }
    }
    var clouds = []
    for (var k = 0; k < 7; k++) clouds.push({ x: k / 7, y: 0.15 + (k % 3) * 0.12, s: 0.18 + (k % 4) * 0.06, sp: 0.004 + (k % 3) * 0.003 })
    var stars = []
    for (var s = 0; s < 70; s++) stars.push({ x: Math.random(), y: Math.random() * 0.8, p: Math.random() * TAU })
    var v = null, skyG = null, hazeG = null, vig = null, cone = null, t = 0
    var S = {
      night: night, haze: haze, grade: GRADE[stage.biome] || null, shimmer: !!stage.heat,
      par: { far: 0, mid: 0, roadside: 0, road: 0 }, curveOff: 0,
      resize: function (view) {
        v = view
        var c = D.createElement('canvas').getContext('2d')
        skyG = c.createLinearGradient(0, 0, 0, v.hy); skyG.addColorStop(0, night ? '#0b1240' : pal[0]); skyG.addColorStop(0.75, farTop); skyG.addColorStop(1, haze)
        hazeG = c.createLinearGradient(0, v.hy - v.h * 0.09, 0, v.hy + 2); hazeG.addColorStop(0, 'rgba(255,255,255,0)'); hazeG.addColorStop(1, night ? 'rgba(40,40,90,.55)' : 'rgba(255,255,255,.55)')
        vig = cv(256, 256); var vx = vig.getContext('2d'), vg = vx.createRadialGradient(128, 128, 60, 128, 128, 182)
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, night ? 'rgba(0,0,20,.6)' : 'rgba(10,20,40,.42)'); vx.fillStyle = vg; vx.fillRect(0, 0, 256, 256)
        cone = cv(256, 256); var cx2 = cone.getContext('2d'), cg = cx2.createLinearGradient(0, 256, 0, 0)
        cg.addColorStop(0, 'rgba(255,244,200,.55)'); cg.addColorStop(1, 'rgba(255,244,200,0)')
        cx2.fillStyle = cg; cx2.beginPath(); cx2.moveTo(96, 256); cx2.lineTo(160, 256); cx2.lineTo(256, 0); cx2.lineTo(0, 0); cx2.closePath(); cx2.fill()
      },
      /** advance the four parallax accumulators by forward distance dz (world units) and the road curvature */
      advance: function (dz, curve, dt) {
        t += dt
        S.par.road += dz; S.par.roadside += dz * 0.70; S.par.mid += dz * 0.20; S.par.far += dz * 0.05
        S.curveOff += curve * dz / 200
      },
      drawBack: function (c, camY, quality) {
        var w = v.w, hy = v.hy, hill = (camY - 950) * 0.012 * v.u
        c.fillStyle = skyG; c.fillRect(0, 0, w, hy + 2)
        if (night) {
          for (var i = 0; i < stars.length; i++) { var st = stars[i], a = 0.5 + 0.5 * Math.sin(t * 2 + st.p); c.globalAlpha = a * 0.9; c.fillStyle = '#fff'; c.fillRect(st.x * w, st.y * hy * 0.6, 2 * v.pr, 2 * v.pr) }
          c.globalAlpha = 1
        }
        // sun / moon bloom + god rays + lens flare (additive)
        var sx = w * 0.74 - S.curveOff * w * 0.002 % w, sy = hy * (stage.sky === 'sunset' ? 0.62 : 0.26)
        c.globalCompositeOperation = 'lighter'
        if (!night && quality > 0 && !OFF('rays')) {
          c.globalAlpha = 0.16 + 0.04 * Math.sin(t * 0.7); c.save(); c.translate(sx, sy); c.rotate(t * 0.03)
          var rs = w * 1.1; c.drawImage(T.rays, -rs / 2, -rs / 2, rs, rs); c.restore()
        }
        c.globalAlpha = night ? 0.5 : 0.95; var gs = (night ? 0.14 : 0.32) * w; c.drawImage(stage.sky === 'sunset' ? T.glowO : T.glowW, sx - gs / 2, sy - gs / 2, gs, gs)
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'
        // clouds (day): drift + parallax with curvature
        if (!night) for (var k = 0; k < clouds.length; k++) {
          var cl = clouds[k], cw = cl.s * w, px = ((cl.x * w + t * cl.sp * w - S.curveOff * w * 0.01) % (w + cw) + (w + cw)) % (w + cw) - cw
          c.globalAlpha = 0.85; c.drawImage(T.puff, px, cl.y * hy * 0.7, cw, cw * 0.55)
        }
        c.globalAlpha = 1
        // FAR strip (0.05x forward, curvature, hills)
        if (far) {
          // Codex contract: uniform scale so the strip's horizon line (62% for Codex strips; measured per owner crop)
          // sits on the screen horizon; tiled, never stretched
          var hf = FAR_HORIZON[stage.far] || 0.62, fh = hy / hf, fw = fh * far.naturalWidth / far.naturalHeight, fy = hy - hf * fh + hill * 0.4
          var fx = -(((S.par.far * 0.004 + S.curveOff * 0.9) * v.u) % fw + fw) % fw
          for (var x = fx; x < w; x += fw) c.drawImage(far, x, fy, fw + 1, fh)
          var fg = c.createLinearGradient(0, fy, 0, fy + fh * 0.28); fg.addColorStop(0, farTop); fg.addColorStop(1, 'rgba(0,0,0,0)')
          c.fillStyle = fg; c.fillRect(0, fy - 1, w, fh * 0.28)
        }
        // MID (0.20x)
        var mh = hy * (mid ? 0.45 : 0.30), my = hy + v.h * (mid ? 0.02 : 0.004) - mh + hill * 0.7
        var mc = mid ? mid.canvas : midC, mw = mh * mc.width / mc.height
        var mxo = -(((S.par.mid * 0.004 + S.curveOff * 2.4) * v.u) % mw + mw) % mw
        c.globalAlpha = mid ? 1 : 0.92
        for (var x2 = mxo; x2 < w; x2 += mw) c.drawImage(mc, x2, my, mw + 1, mh)
        c.globalAlpha = 1
        // haze at the horizon
        c.fillStyle = hazeG; c.fillRect(0, hy - v.h * 0.09, w, v.h * 0.09 + 2)
        // ROADSIDE band (0.70x)
        var nh = hy * 0.11, ny = hy - nh + 4 + hill, nw = nh * near.width / near.height
        var nxo = -(((S.par.roadside * 0.004 + S.curveOff * 6) * v.u) % nw + nw) % nw
        for (var x3 = nxo; x3 < w; x3 += nw) c.drawImage(near, x3, ny, nw + 1, nh)
        // lens flare ghosts (day, high/medium)
        if (!night && quality > 0 && !OFF('flare')) {
          c.globalCompositeOperation = 'lighter'
          var dx = w / 2 - sx, dy = v.h * 0.55 - sy
          for (var f = 1; f <= 4; f++) { var fs = w * (0.03 + f * 0.012), fxp = sx + dx * f * 0.35, fyp = sy + dy * f * 0.35; c.globalAlpha = 0.12; c.drawImage(f % 2 ? T.glowC : T.glowY, fxp - fs / 2, fyp - fs / 2, fs, fs) }
          c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'
        }
      },
      sun: function () { return { x: v.w * 0.74, y: v.hy * (stage.sky === 'sunset' ? 0.62 : 0.26) } },
      headlights: function (c, x, y, wCar, on) {
        if (!on) return
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.75
        var cw = wCar * 2.6, ch = (y - v.hy) * 0.85
        c.drawImage(cone, x - cw / 2, y - ch, cw, ch)
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'
      },
      /** weather: rain (+ splashes), snow, leaves, dust devils — pooled particles */
      weather: function (dt, fx, flow, q) {
        var w = v.w, h = v.h, kind = stage.weather, n
        if (kind === 'rain') {
          n = Math.round(dt * 260 * q)
          for (var i = 0; i < n; i++) { var p = fx.spawn(T.rain, Math.random() * w * 1.2 - w * 0.1, -20, -w * 0.08, h * 2.4, 0.5, h * 0.05, true); if (p) { p.stretch = 1; p.a = 0.5 } }
          n = Math.round(dt * 40 * q)
          for (var j = 0; j < n; j++) { var sp = fx.spawn(T.puff, Math.random() * w, v.hy + Math.random() * (h - v.hy), 0, 0, 0.3, h * 0.012, false); if (sp) { sp.grow = h * 0.06; sp.a = 0.5; sp.flow = 1 } }
        } else if (kind === 'snow') {
          n = Math.round(dt * 90 * q)
          for (var k = 0; k < n; k++) { var f = fx.spawn(T.flake, Math.random() * w, -10, (Math.random() - 0.5) * w * 0.1, h * (0.25 + Math.random() * 0.25), 3, h * (0.006 + Math.random() * 0.012), false); if (f) { f.flow = 0.4 } }
        } else if (kind === 'leaves') {
          n = Math.random() < dt * 9 * q ? 1 : 0
          for (var l = 0; l < n; l++) { var lf = fx.spawn(T.leaf, Math.random() * w, -10, (Math.random() - 0.3) * w * 0.15, h * 0.22, 4, h * 0.03, false); if (lf) { lf.vr = 3 * (Math.random() - 0.5); lf.rot = 0.1; lf.flow = 0.5 } }
        } else if (kind === 'dust') {
          if (Math.random() < dt * 6 * q) { var side = Math.random() < 0.5 ? 0.12 : 0.88, d = fx.spawn(T.puff, w * side, v.hy + (h - v.hy) * 0.25, (Math.random() - 0.5) * 30, -h * 0.02, 1.6, h * 0.04, false); if (d) { d.grow = h * 0.08; d.a = 0.45; d.vr = 2; d.rot = 0.1; d.flow = 0.6 } }
        }
      },
      /** heat shimmer on desert: re-draw thin horizon slices with a sine offset (high/medium only) */
      shimmer: function (c, canvas, q) {
        if (!S.shimmer || q < 1) return
        var y0 = Math.round(v.hy - v.h * 0.05), sh = Math.max(2, Math.round(v.h * 0.008)), n = Math.round(v.h * 0.1 / sh)
        for (var i = 0; i < n; i++) { var y = y0 + i * sh, off = Math.sin(t * 9 + i * 0.9) * v.u * 2.2; c.drawImage(canvas, 0, y, v.w, sh, off, y, v.w, sh) }
      },
      post: function (c, st) {
        var w = v.w, h = v.h
        if (S.grade && st.quality > 1 && !OFF('grade')) { c.globalCompositeOperation = 'soft-light'; c.fillStyle = S.grade; c.globalAlpha = 1; c.fillRect(0, 0, w, h); c.globalCompositeOperation = 'source-over' }
        if (st.strobe > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.16 * st.strobe; c.fillStyle = (Math.floor(t * 8) % 2) ? '#ff2a2a' : '#2a6bff'; c.fillRect(0, 0, w, h); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over' }
        if (st.tunnel > 0) { c.globalAlpha = 0.35 * st.tunnel; c.fillStyle = '#05040a'; c.fillRect(0, 0, w, h); c.globalAlpha = 1 }
        if (!OFF('vig')) c.globalAlpha = 0.7 + 0.3 * st.boost, c.drawImage(vig, -w * 0.05 * st.boost, -h * 0.05 * st.boost, w * (1 + 0.1 * st.boost), h * (1 + 0.1 * st.boost))
        if (st.boost > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.18 * st.boost; c.drawImage(T.glowC, -w * 0.4, -h * 0.4, w * 0.8, h * 0.8); c.drawImage(T.glowC, w * 0.6, h * 0.6, w * 0.8, h * 0.8); c.globalCompositeOperation = 'source-over' }
        if (st.flash > 0) { c.globalAlpha = Math.min(1, st.flash); c.fillStyle = '#fff'; c.fillRect(0, 0, w, h) }
        c.globalAlpha = 1
      }
    }
    return S
  }
  W.MojoChaseScene = { create: create }
})(window, document)
