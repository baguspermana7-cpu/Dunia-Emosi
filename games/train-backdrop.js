/* games/train-backdrop.js — shared painterly backdrop + depth-parallax engine (v55.77)
 *
 * Extracted from balapan-kereta.html's proven g14 engine so all three train games
 * (balapan-kereta · lokomotif-pemberani · balapan-kereta-side) render the SAME clean
 * painterly plates with horizontal depth-band parallax + an edge-safe uniform "rail
 * bob" (the whole stage gently rises/falls → 3D "riding the rails", no inter-band
 * seam, no train float). Zero deps beyond a global PIXI v8. Fully guarded: any miss
 * (no manifest / texture fail) returns null and the caller keeps its procedural bg.
 *
 * API (window.TrainBackdrop):
 *   load(level, dataDir?)            → Promise<manifest|null>   fetch index.json gate + levelNN.json
 *   hasBackdrop(manifest)            → bool
 *   fit(app, aspect)                 → {W,H,scaledW,scaledH,leftX,topY,asp}   cover-fit
 *   mount(stage, app, manifest, opts?) → Promise<handle|null>
 *     opts.assetBase   (default '../')  prefix for tier src
 *     opts.insertIndex (default 0)      stage.addChildAt index (behind gameplay)
 *     opts.bandFilter  (fy0,fy1)=>bool  include predicate (e.g. side-scroller: sky+far only)
 *     opts.railBob     (default true)   uniform stage.y bob, clamped to cover-fit overscan
 *     opts.railBobAmp  (default 2.6)    max bob px
 *     opts.scrollMult  (default 0.9)    global scroll-speed multiplier
 *   handle = { bg, bands, manifest, aspect,
 *              tick(worldSpeed, dt, stage), resetBob(stage), refit(), laneYs(arr?), destroy() }
 */
(function () {
  'use strict'
  const DATA_DIR = '../data/g14-journey/'

  // Cover-fit transform from the manifest ASPECT alone (no image needed) — scaledH ≥ H
  // so the plate always over-covers vertically (topY ≤ 0 = overscan the rail bob uses).
  //
  // v55.86 — OPTIONAL RAIL-ANCHORED fit (railOpts). On a TALL/portrait screen a plain
  // cover-fit leaves the painted rail bed compressed into a thin strip (the 3 lanes +
  // train collapse → tiny train). When railOpts is supplied the plate is instead zoomed
  // + positioned so its PAINTED RAIL BED (fraction [railTopFrac..railBotFrac]) exactly
  // fills the play band [bandTop..bandBot] → rails + lanes + train stay prominent and
  // proportional on every orientation. Coverage is clamped so top+bottom never gap. When
  // railOpts is absent (g15 / g14-side) the behaviour is the original plain cover-fit.
  //   railOpts = { playBand:()=>({bandTop,bandBot}), railTopFrac, railBotFrac }
  function fit(app, aspect, railOpts) {
    const W = app.screen.width, H = app.screen.height
    const asp = aspect || (16 / 9)
    let scaledH = Math.max(H, W / asp)
    let topY = (H - scaledH) / 2
    let scaledW = scaledH * asp
    let mode = 'cover'
    if (railOpts && typeof railOpts.playBand === 'function') {
      const pb = railOpts.playBand()
      const rTop = railOpts.railTopFrac, rBot = railOpts.railBotFrac
      const span = rBot - rTop
      if (span > 0.05 && pb && (pb.bandBot - pb.bandTop) > 40) {
        // v56.3 B-285 — EXACT-MAP fit: railTopFrac→bandTop AND railBotFrac→bandBot hold
        // by construction on EVERY viewport. The old path mutated scaledH/topY to force
        // screen coverage ("never gap"), which silently broke the mapping — the caller's
        // lane clamp then lifted trains off the painted rail ("masih di atas"). Coverage
        // gaps are now closed by SKIRT sprites in mount() instead of by re-mapping.
        scaledH = (pb.bandBot - pb.bandTop) / span
        topY = pb.bandTop - rTop * scaledH
        scaledW = Math.max(W, scaledH * asp)   // anisotropic X-stretch only when needed
        mode = 'exact'
        if (scaledW / (scaledH * asp) > 1.35) {
          // extreme wide/short screens: distortion would show — fall back to a
          // bottom-rail-anchored isotropic fit (bottom lane exact; top lane may ride
          // high under the translucent HUD; huge overscan → cover holds naturally).
          scaledH = Math.max(H, W / asp)
          scaledW = scaledH * asp
          topY = pb.bandBot - rBot * scaledH
          mode = 'bottomAnchor'
        }
      }
    }
    const out = { W, H, scaledW, scaledH, leftX: (W - scaledW) / 2, topY, asp, mode }
    if (railOpts) {
      out.railTopY = topY + (railOpts.railTopFrac || 0) * scaledH
      out.railBotY = topY + (railOpts.railBotFrac || 1) * scaledH
    }
    return out
  }

  function hasBackdrop(m) { return !!(m && m.mode === 'raster' && m.backdrop) }

  // index.json gates which levels HAVE a manifest → no 404 (and no console error) for
  // levels with none. Palette strings ("0x85bceb") are parsed to ints for callers.
  async function load(level, dataDir) {
    const dj = dataDir || DATA_DIR
    try {
      const idxRes = await fetch(dj + 'index.json', { cache: 'no-cache' })
      if (!idxRes.ok) return null
      const idx = await idxRes.json()
      if (!idx || !Array.isArray(idx.levels) || idx.levels.indexOf(level) < 0) return null
      const res = await fetch(dj + 'level' + String(level).padStart(2, '0') + '.json', { cache: 'no-cache' })
      if (!res.ok) return null
      const j = await res.json()
      if (j && j.palette) {
        const p = {}
        for (const k in j.palette) { const v = j.palette[k]; p[k] = (typeof v === 'string') ? parseInt(v, 16) : v }
        j._paletteInt = p
      }
      return j
    } catch (_) { return null }
  }

  async function mount(stage, app, manifest, opts) {
    opts = opts || {}
    try {
      const m = manifest
      if (!hasBackdrop(m) || !window.PIXI || !PIXI.Assets) return null
      if (!(m.clean && Array.isArray(m.bands) && m.bands.length)) return null
      const aspect = (m.backdrop && m.backdrop.aspect) || (16 / 9)
      const railOpts = opts.railFit || null   // v55.86 — rail-anchored fit when supplied (g14)
      const f = fit(app, aspect, railOpts)
      // smallest tier ≥ device px
      const need = f.W * Math.min(window.devicePixelRatio || 1, 2)
      const tiers = (m.backdrop.tiers || []).slice().sort((a, b) => a.w - b.w)
      let pick = tiers[tiers.length - 1]
      for (const t of tiers) { if (t.w >= need) { pick = t; break } }
      if (!pick) return null
      const assetBase = (opts.assetBase != null) ? opts.assetBase : '../'
      const tex = await PIXI.Assets.load(assetBase + pick.src)
      if (!tex || !stage) return null
      const baseW = (tex.source && tex.source.width) || tex.width
      const baseH = (tex.source && tex.source.height) || tex.height
      const filter = (typeof opts.bandFilter === 'function') ? opts.bandFilter : null

      const bg = new PIXI.Container(); bg._speed = 0
      const insertAt = (typeof opts.insertIndex === 'number') ? opts.insertIndex : 0
      stage.addChildAt(bg, Math.min(Math.max(0, insertAt), stage.children.length))

      const bands = []
      for (const bd of m.bands) {
        // v56.3 B-285/A4 — TEXEL SNAP: round fy0/fy1 to the texel grid ONCE and use the
        // SNAPPED fractions for BOTH the texture frame and the screen position/height.
        // (Previously the frame was rounded but cont.y used the raw fraction → the
        // painted rail could sit 1-2px off its nominal fraction inside a band.)
        const rawY0 = Math.max(0, bd.y0), rawY1 = Math.min(1, bd.y1)
        if (filter && !filter(rawY0, rawY1)) continue
        const py0 = Math.round(rawY0 * baseH)
        const py1 = Math.max(py0 + 1, Math.round(rawY1 * baseH))
        const fy0 = py0 / baseH, fy1 = py1 / baseH
        // seam bleed: extend the frame by 1 REAL source row (duplicated content) instead
        // of stretching the sprite +1px (which changed the pixel scale inside the band).
        const bleed = Math.min(1, baseH - py1)
        const rows = py1 - py0
        const frame = new PIXI.Rectangle(0, py0, baseW, rows + bleed)
        const bandTex = new PIXI.Texture({ source: tex.source, frame })
        const screenH = (fy1 - fy0) * f.scaledH
        const tileW = f.scaledW
        const cont = new PIXI.Container()
        for (let copy = 0; copy < 2; copy++) {
          const s = new PIXI.Sprite(bandTex)
          // width tileW+1 → the two copies overlap 1px = no hairline seam mid-scroll
          s.x = copy * tileW; s.y = 0; s.width = tileW + 1
          s.height = screenH * (rows + bleed) / rows   // bleed row at native scale
          cont.addChild(s)
        }
        cont.x = f.leftX; cont.y = f.topY + fy0 * f.scaledH
        cont._homeX = f.leftX; cont._tileW = tileW; cont._pSpeed = bd.speed || 0
        cont._fy0 = fy0; cont._fy1 = fy1; cont._rows = rows; cont._bleed = bleed; cont._bandTex = bandTex
        bg.addChild(cont)   // bands added far→near in manifest order (near covers far)
        bands.push(cont)
      }
      if (!bands.length) { try { stage.removeChild(bg) } catch (_) {} return null }

      // v56.3 B-285/A1 — SKIRTS: with the exact-map fit the plate may not cover the full
      // screen vertically. Fill any top/bottom gap with 1-row texture-slice skirts
      // (stretched real content) so no bare canvas ever shows — WITHOUT touching the
      // rail mapping. Recreated on refit().
      const skirts = []
      function buildSkirts(ff) {
        for (const sk of skirts.splice(0)) { try { bg.removeChild(sk); sk.destroy() } catch (_) {} }
        const margin = 4
        if (ff.topY > 0) {
          const st = new PIXI.Sprite(new PIXI.Texture({ source: tex.source, frame: new PIXI.Rectangle(0, 0, baseW, 1) }))
          st.x = ff.leftX; st.y = -margin; st.width = ff.scaledW + 1; st.height = ff.topY + margin + 1
          st._isSkirt = true; bg.addChildAt(st, 0); skirts.push(st)
        }
        const botEdge = ff.topY + ff.scaledH
        if (botEdge < ff.H) {
          const rows2 = Math.max(1, Math.round(baseH * 0.015))
          const sb = new PIXI.Sprite(new PIXI.Texture({ source: tex.source, frame: new PIXI.Rectangle(0, baseH - rows2, baseW, rows2) }))
          sb.x = ff.leftX; sb.y = botEdge - 1; sb.width = ff.scaledW + 1; sb.height = (ff.H - botEdge) + margin + 1
          sb._isSkirt = true; bg.addChildAt(sb, 0); skirts.push(sb)
        }
      }
      buildSkirts(f)

      const railBob = opts.railBob !== false
      const railBobAmp = (typeof opts.railBobAmp === 'number') ? opts.railBobAmp : 2.6
      const scrollMult = (typeof opts.scrollMult === 'number') ? opts.scrollMult : 0.9
      let bobPhase = 0

      return {
        bg, bands, manifest: m, aspect,
        // Scroll each depth band at its own speed (near fast / far slow) + wrap; then a
        // uniform rail bob on the passed-in stage (clamped to overscan = edge-safe).
        tick(worldSpeed, dt, stageRef) {
          const _d = Math.min(dt, 2)
          for (const c of bands) {
            if (!c || c.destroyed) continue
            c.x -= (c._pSpeed || 0) * worldSpeed * _d * scrollMult
            if (c.x <= c._homeX - c._tileW) c.x += c._tileW
          }
          if (railBob && stageRef) {
            const ff = fit(app, aspect, railOpts)
            const amp = Math.min(railBobAmp, Math.max(0, -ff.topY) * 0.6)
            if (amp > 0.15) {
              bobPhase += worldSpeed * _d * 0.025
              stageRef.y = Math.sin(bobPhase) * amp + Math.sin(bobPhase * 2.3) * amp * 0.28
            } else if (stageRef.y) { stageRef.y = 0 }
          }
        },
        resetBob(stageRef) { bobPhase = 0; if (stageRef) stageRef.y = 0 },
        // Re-cover-fit every band on resize/rotate (snapped math + skirts rebuilt).
        refit() {
          const ff = fit(app, aspect, railOpts)
          for (const c of bands) {
            if (!c || c.destroyed) continue
            const screenH = (c._fy1 - c._fy0) * ff.scaledH
            c.x = ff.leftX; c._homeX = ff.leftX; c._tileW = ff.scaledW
            c.y = ff.topY + c._fy0 * ff.scaledH
            for (let i = 0; i < c.children.length; i++) {
              const s = c.children[i]
              s.x = i * ff.scaledW; s.width = ff.scaledW + 1
              s.height = screenH * (c._rows + c._bleed) / c._rows
            }
          }
          buildSkirts(ff)
        },
        // Current fit transform (mode/railTopY/railBotY included) — for callers + QA.
        fitInfo() { return fit(app, aspect, railOpts) },
        // Lane Y screen positions from manifest.laneRatios (or an override array).
        // v56.3 B-285 — pass railOpts (was plain cover-fit → silently DIFFERENT Ys than
        // the mounted plate when rail-anchored; latent desync).
        laneYs(laneArr) {
          const ff = fit(app, aspect, railOpts)
          const lr = laneArr || (m.laneRatios && m.laneRatios.lanes) || [0.62, 0.74, 0.86]
          return lr.map(r => Math.round(ff.topY + r * ff.scaledH))
        },
        destroy() { try { stage.removeChild(bg); bg.destroy({ children: true }) } catch (_) {} },
      }
    } catch (_) { return null }
  }

  window.TrainBackdrop = { load, mount, fit, hasBackdrop, DATA_DIR }
})()
