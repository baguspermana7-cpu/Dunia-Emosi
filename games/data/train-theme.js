/* =============================================================================
 * Dunia Emosi — Shared Train Theme Module
 * =============================================================================
 * Pastel "brick-train" visual system shared across all train-themed games
 * (G14 Balapan Kereta, G16 Lokomotif Pemberani, G19 Selamatkan Kereta) and
 * any future train-pillar ideas.
 *
 * Direction: Lego City Train + Nintendo Labo Toy-Con Train aesthetic.
 *   - Soft cardboard cream background
 *   - Pastel primaries (mint / sky / peach / pink / butter)
 *   - Rounded-corner brick silhouettes (no jagged emoji clutter)
 *   - Soft purple outline (not harsh black) — reduces eye strain for kids
 *   - Saturated red used ONLY for the genuine brake / danger warning
 *
 * Loaded as a plain script:
 *   <script src="data/train-theme.js"></script>
 * Then globals available:
 *   window.BRICK_PALETTE
 *   window.BRICK_SHAPES
 *   window.brickResponsive(viewport)
 *   window.brickRender(ctx, shapeId, x, y, w, h, palette?)
 * ========================================================================== */

;(function (global) {
  'use strict'

  // ── 1. PASTEL PALETTE ───────────────────────────────────────────────────
  // Tokens are CSS color strings so they can be used in CSS variables,
  // PIXI Graphics tint, Canvas fillStyle, and inline style.

  var BRICK_PALETTE = {
    cream:    '#FFF6E5', // base background, cardboard
    mint:     '#A7F3D0', // track / safe zone / grass
    sky:      '#BAE6FD', // distant parallax sky
    peach:    '#FED7AA', // warm accent, station roof
    pink:     '#FBCFE8', // gentle highlight, cabin trim
    butter:   '#FDE68A', // lights, signal lamp, sparkle
    lavender: '#DDD6FE', // cooler accent, shadow
    redSoft:  '#FCA5A5', // restricted use: brake / genuine danger only
    stroke:   '#6D28D9', // soft purple outline — easier on kid eyes than black
    inkDark:  '#1E1B4B', // text / strongest dark, rarely used
    strokeWidth: 2,      // px outline weight at base size
    radiusSmall: 4,
    radiusMedium: 8,
    radiusLarge: 12
  }

  // Helper: convert hex string to PIXI 0xRRGGBB number.
  function hexToPixi (hex) {
    return parseInt(String(hex || '#000000').replace('#', ''), 16) | 0
  }
  BRICK_PALETTE.toPixi = hexToPixi

  // ── 2. CURATED BRICK SHAPES ─────────────────────────────────────────────
  // 6 obstacle / NPC shapes that replace the emoji clutter
  // (🐍🐢🦖🦊🐿️🐰🦔 etc.). Each shape is defined as a `draw(ctx, w, h)`
  // function that renders into a Canvas 2D context, normalized to a w×h box
  // with origin (0,0) at top-left. PIXI users can call `drawToPixi(graphics,
  // shapeId, w, h)` to get an equivalent PIXI Graphics rendering.

  function roundedRect (ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2)
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }

  var BRICK_SHAPES = {
    // 1. Signal post — yellow lamp on slim cream pole.
    signalPost: {
      label: 'Tiang Sinyal',
      draw: function (ctx, w, h) {
        var P = BRICK_PALETTE
        var poleW = w * 0.16
        var poleX = (w - poleW) / 2
        // pole
        ctx.fillStyle = P.cream
        ctx.strokeStyle = P.stroke
        ctx.lineWidth = P.strokeWidth
        roundedRect(ctx, poleX, h * 0.3, poleW, h * 0.7, P.radiusSmall)
        ctx.fill(); ctx.stroke()
        // lamp head
        ctx.fillStyle = P.butter
        roundedRect(ctx, w * 0.18, h * 0.04, w * 0.64, h * 0.32, P.radiusMedium)
        ctx.fill(); ctx.stroke()
        // light glow inside
        ctx.fillStyle = P.peach
        roundedRect(ctx, w * 0.32, h * 0.14, w * 0.36, h * 0.14, P.radiusSmall)
        ctx.fill()
      }
    },
    // 2. Hay bale — round mint pillow with horizontal lines.
    hayBale: {
      label: 'Bal Jerami',
      draw: function (ctx, w, h) {
        var P = BRICK_PALETTE
        ctx.fillStyle = P.butter
        ctx.strokeStyle = P.stroke
        ctx.lineWidth = P.strokeWidth
        roundedRect(ctx, w * 0.06, h * 0.18, w * 0.88, h * 0.74, P.radiusLarge)
        ctx.fill(); ctx.stroke()
        // straw lines
        ctx.strokeStyle = P.peach
        ctx.lineWidth = P.strokeWidth - 0.5
        for (var i = 1; i < 4; i++) {
          var yy = h * (0.18 + i * 0.18)
          ctx.beginPath()
          ctx.moveTo(w * 0.14, yy)
          ctx.lineTo(w * 0.86, yy)
          ctx.stroke()
        }
      }
    },
    // 3. Brick wall — pastel pink bricks staggered.
    brickWall: {
      label: 'Tembok Bata',
      draw: function (ctx, w, h) {
        var P = BRICK_PALETTE
        ctx.fillStyle = P.pink
        ctx.strokeStyle = P.stroke
        ctx.lineWidth = P.strokeWidth
        roundedRect(ctx, 0, 0, w, h, P.radiusMedium)
        ctx.fill(); ctx.stroke()
        // brick lines
        ctx.strokeStyle = P.stroke
        ctx.lineWidth = 1
        var rows = 4, cols = 3
        var bw = w / cols, bh = h / rows
        for (var r = 0; r < rows; r++) {
          var offset = (r % 2) * (bw / 2)
          for (var c = 0; c < cols; c++) {
            var xx = c * bw + offset
            if (xx + bw > w) continue
            roundedRect(ctx, xx, r * bh, bw, bh, 1)
            ctx.stroke()
          }
        }
      }
    },
    // 4. Cattle gate — wood plank gate.
    cattleGate: {
      label: 'Gerbang Sapi',
      draw: function (ctx, w, h) {
        var P = BRICK_PALETTE
        ctx.fillStyle = P.peach
        ctx.strokeStyle = P.stroke
        ctx.lineWidth = P.strokeWidth
        // 3 horizontal planks
        for (var i = 0; i < 3; i++) {
          var yy = h * (0.18 + i * 0.28)
          roundedRect(ctx, 0, yy, w, h * 0.18, P.radiusSmall)
          ctx.fill(); ctx.stroke()
        }
        // 2 vertical posts
        ctx.fillStyle = P.cream
        roundedRect(ctx, w * 0.04, 0, w * 0.16, h, P.radiusSmall)
        ctx.fill(); ctx.stroke()
        roundedRect(ctx, w * 0.80, 0, w * 0.16, h, P.radiusSmall)
        ctx.fill(); ctx.stroke()
      }
    },
    // 5. Log — soft brown rounded log lying across track.
    log: {
      label: 'Batang Kayu',
      draw: function (ctx, w, h) {
        var P = BRICK_PALETTE
        ctx.fillStyle = '#D4A574' // soft brown (one-off, not in palette)
        ctx.strokeStyle = P.stroke
        ctx.lineWidth = P.strokeWidth
        roundedRect(ctx, 0, h * 0.28, w, h * 0.44, P.radiusLarge)
        ctx.fill(); ctx.stroke()
        // rings on the end
        ctx.beginPath()
        ctx.arc(w * 0.92, h * 0.5, h * 0.14, 0, Math.PI * 2)
        ctx.fillStyle = '#E8C9A0'
        ctx.fill(); ctx.stroke()
      }
    },
    // 6. Cow — friendly pastel-pink head with horns peeking.
    cow: {
      label: 'Sapi',
      draw: function (ctx, w, h) {
        var P = BRICK_PALETTE
        ctx.fillStyle = '#FFFFFF'
        ctx.strokeStyle = P.stroke
        ctx.lineWidth = P.strokeWidth
        // body
        roundedRect(ctx, w * 0.05, h * 0.36, w * 0.90, h * 0.56, P.radiusLarge)
        ctx.fill(); ctx.stroke()
        // head
        roundedRect(ctx, w * 0.10, h * 0.04, w * 0.42, h * 0.42, P.radiusMedium)
        ctx.fill(); ctx.stroke()
        // pink ear blob
        ctx.fillStyle = P.pink
        ctx.beginPath()
        ctx.arc(w * 0.18, h * 0.18, h * 0.10, 0, Math.PI * 2)
        ctx.fill(); ctx.stroke()
        // pink spot on body
        ctx.beginPath()
        ctx.arc(w * 0.66, h * 0.62, h * 0.14, 0, Math.PI * 2)
        ctx.fill(); ctx.stroke()
        // eye
        ctx.fillStyle = P.inkDark
        ctx.beginPath()
        ctx.arc(w * 0.38, h * 0.22, h * 0.04, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  // ── 3. PIXI ADAPTER ─────────────────────────────────────────────────────
  // Bake a shape onto an offscreen canvas, then return a PIXI Texture.
  // Caller supplies the PIXI module via `brickPixiTexture(PIXI, shapeId, w, h)`.

  function brickPixiTexture (PIXI, shapeId, w, h) {
    var shape = BRICK_SHAPES[shapeId]
    if (!shape) return null
    var canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    var ctx = canvas.getContext('2d')
    shape.draw(ctx, w, h)
    return PIXI && PIXI.Texture && PIXI.Texture.from
      ? PIXI.Texture.from(canvas)
      : null
  }

  // Pure-canvas render for non-PIXI callers (e.g. CSS preview).
  function brickRender (ctx, shapeId, x, y, w, h) {
    var shape = BRICK_SHAPES[shapeId]
    if (!shape || !ctx) return
    ctx.save()
    ctx.translate(x, y)
    shape.draw(ctx, w, h)
    ctx.restore()
  }

  // ── 4. RESPONSIVE LAYOUT ───────────────────────────────────────────────
  // Returns the recommended layout shape for the current viewport, so each
  // train game can pick HUD stack-vs-row, canvas size, sprite scale.

  function brickResponsive (viewport) {
    viewport = viewport || {
      w: window.innerWidth || 360,
      h: window.innerHeight || 640
    }
    var w = viewport.w
    var h = viewport.h
    var tier = 'phone'
    if (w >= 1280) tier = 'tv'
    else if (w >= 768) tier = 'tablet'

    // Canvas size: keep aspect, fit to viewport with margins
    var canvasW = Math.min(w * 0.96, 1200)
    var canvasH = Math.min(h * 0.70, 720)
    if (tier === 'phone') {
      canvasW = Math.min(w * 0.98, 480)
      canvasH = Math.min(h * 0.66, 600)
    }

    return {
      tier: tier,
      isPortrait: h > w,
      canvasW: Math.round(canvasW),
      canvasH: Math.round(canvasH),
      hudLayout: tier === 'phone' ? 'stack' : 'row',
      touchTargetMin: tier === 'phone' ? 48 : 44, // px
      fontScale: tier === 'tv' ? 1.25 : (tier === 'tablet' ? 1.1 : 1.0),
      spriteScale: tier === 'tv' ? 1.4 : (tier === 'tablet' ? 1.15 : 1.0),
      padding: tier === 'phone' ? 8 : 16
    }
  }

  // ── 5. CSS HELPERS ─────────────────────────────────────────────────────
  // Inject CSS custom properties + utility classes so HTML/CSS callers can
  // use --brick-cream etc. directly. Safe to call multiple times.

  var _cssInjected = false
  function injectBrickCSS () {
    if (_cssInjected || typeof document === 'undefined') return
    var style = document.createElement('style')
    style.setAttribute('data-brick-theme', 'v1')
    style.textContent = [
      ':root {',
      '  --brick-cream:'    + BRICK_PALETTE.cream    + ';',
      '  --brick-mint:'     + BRICK_PALETTE.mint     + ';',
      '  --brick-sky:'      + BRICK_PALETTE.sky      + ';',
      '  --brick-peach:'    + BRICK_PALETTE.peach    + ';',
      '  --brick-pink:'     + BRICK_PALETTE.pink     + ';',
      '  --brick-butter:'   + BRICK_PALETTE.butter   + ';',
      '  --brick-lavender:' + BRICK_PALETTE.lavender + ';',
      '  --brick-red-soft:' + BRICK_PALETTE.redSoft  + ';',
      '  --brick-stroke:'   + BRICK_PALETTE.stroke   + ';',
      '  --brick-ink:'      + BRICK_PALETTE.inkDark  + ';',
      '}',
      '.brick-bg { background: var(--brick-cream); }',
      '.brick-card { background: var(--brick-cream); border: 2px solid var(--brick-stroke); border-radius: 12px; }',
      '.brick-banner { background: var(--brick-butter); color: var(--brick-ink); border: 2px solid var(--brick-stroke); border-radius: 999px; padding: 6px 14px; font-weight: 700; }',
      '.brick-danger { background: var(--brick-red-soft); color: var(--brick-ink); border: 2px solid var(--brick-stroke); border-radius: 999px; padding: 6px 14px; font-weight: 800; }',
      '.brick-tap { min-width: 48px; min-height: 48px; border-radius: 12px; }',
      ''
    ].join('\n')
    document.head.appendChild(style)
    _cssInjected = true
  }

  // ── EXPORT ─────────────────────────────────────────────────────────────
  global.BRICK_PALETTE = BRICK_PALETTE
  global.BRICK_SHAPES = BRICK_SHAPES
  global.brickRender = brickRender
  global.brickPixiTexture = brickPixiTexture
  global.brickResponsive = brickResponsive
  global.injectBrickCSS = injectBrickCSS
})(typeof window !== 'undefined' ? window : globalThis)
