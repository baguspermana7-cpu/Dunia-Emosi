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
  function fit(app, aspect) {
    const W = app.screen.width, H = app.screen.height
    const asp = aspect || (16 / 9)
    const scaledH = Math.max(H, W / asp)
    const scaledW = scaledH * asp
    return { W, H, scaledW, scaledH, leftX: (W - scaledW) / 2, topY: (H - scaledH) / 2, asp }
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
      const f = fit(app, aspect)
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
        const fy0 = Math.max(0, bd.y0), fy1 = Math.min(1, bd.y1)
        if (filter && !filter(fy0, fy1)) continue
        const frame = new PIXI.Rectangle(0, Math.round(fy0 * baseH), baseW, Math.max(1, Math.round((fy1 - fy0) * baseH)))
        const bandTex = new PIXI.Texture({ source: tex.source, frame })
        const screenH = (fy1 - fy0) * f.scaledH
        const tileW = f.scaledW
        const cont = new PIXI.Container()
        for (let copy = 0; copy < 2; copy++) {
          const s = new PIXI.Sprite(bandTex)
          // width tileW+1 → the two copies overlap 1px = no hairline seam mid-scroll
          s.x = copy * tileW; s.y = 0; s.width = tileW + 1; s.height = screenH + 1
          cont.addChild(s)
        }
        cont.x = f.leftX; cont.y = f.topY + fy0 * f.scaledH
        cont._homeX = f.leftX; cont._tileW = tileW; cont._pSpeed = bd.speed || 0
        cont._fy0 = fy0; cont._fy1 = fy1; cont._bandTex = bandTex
        bg.addChild(cont)   // bands added far→near in manifest order (near covers far)
        bands.push(cont)
      }
      if (!bands.length) { try { stage.removeChild(bg) } catch (_) {} return null }

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
            const ff = fit(app, aspect)
            const amp = Math.min(railBobAmp, Math.max(0, -ff.topY) * 0.6)
            if (amp > 0.15) {
              bobPhase += worldSpeed * _d * 0.025
              stageRef.y = Math.sin(bobPhase) * amp + Math.sin(bobPhase * 2.3) * amp * 0.28
            } else if (stageRef.y) { stageRef.y = 0 }
          }
        },
        resetBob(stageRef) { bobPhase = 0; if (stageRef) stageRef.y = 0 },
        // Re-cover-fit every band on resize/rotate.
        refit() {
          const ff = fit(app, aspect)
          for (const c of bands) {
            if (!c || c.destroyed) continue
            const screenH = (c._fy1 - c._fy0) * ff.scaledH
            c.x = ff.leftX; c._homeX = ff.leftX; c._tileW = ff.scaledW
            c.y = ff.topY + c._fy0 * ff.scaledH
            for (let i = 0; i < c.children.length; i++) {
              const s = c.children[i]
              s.x = i * ff.scaledW; s.width = ff.scaledW + 1; s.height = screenH + 1
            }
          }
        },
        // Lane Y screen positions from manifest.laneRatios (or an override array).
        laneYs(laneArr) {
          const ff = fit(app, aspect)
          const lr = laneArr || (m.laneRatios && m.laneRatios.lanes) || [0.62, 0.74, 0.86]
          return lr.map(r => Math.round(ff.topY + r * ff.scaledH))
        },
        destroy() { try { stage.removeChild(bg); bg.destroy({ children: true }) } catch (_) {} },
      }
    } catch (_) { return null }
  }

  window.TrainBackdrop = { load, mount, fit, hasBackdrop, DATA_DIR }
})()
