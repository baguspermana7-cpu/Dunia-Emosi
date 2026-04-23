// Responsive Display Engine (RDE) — Layer 3 JS Runtime
// Mirrors the CSS `--rz-scale` clamp formula so PixiJS/Canvas games share the same
// fluid scaling as DOM games. Include as <script src="shared/rz-responsive.js"></script>
// then read `window.RZ.scale()`, `RZ.bp()`, `RZ.btn('md')`, etc.
//
// See documentation/CODING-STANDARDS.md "Responsive Display Engine (RDE) Layer 3".
//
// Usage in PixiJS game:
//   const btnSize = RZ.btn('md')          // 58 * currentScale
//   const font = RZ.fontScale(22)         // 22 * currentScale
//   RZ.onResize(() => redrawLayout())     // re-layout on viewport change
(function(){
  // Master scale — matches CSS `clamp(0.7, calc(0.44 + 0.175vw), 1)`.
  // 320px → 0.7, 480px+ → 1.0, smoothly interpolated between.
  function scale() {
    return Math.min(1, Math.max(0.7, 0.44 + window.innerWidth * 0.00175))
  }

  // Breakpoint label — matches mental model for discrete decisions.
  function bp() {
    const w = window.innerWidth
    if (w < 360) return 'xs'
    if (w < 480) return 'sm'
    if (w < 768) return 'md'
    return 'lg'
  }

  // Viewport orientation — useful for Pixi games deciding landscape vs portrait layout.
  function orient() {
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
  }

  // Dynamic font size for PixiJS text — multiplies by current scale.
  // Mirrors CSS `--rz-font-*` but takes an arbitrary base size.
  function fontScale(baseSize) {
    return Math.round(baseSize * scale())
  }

  // Gap size in px, matches CSS `--rz-gap-*` clamp midpoints at current viewport.
  // xs/sm/md/lg.
  function gap(kind) {
    const w = window.innerWidth
    const vw = w / 100
    const clamp = (lo, vwMul, hi) => Math.min(hi, Math.max(lo, vwMul * vw))
    if (kind === 'xs') return clamp(4, 1, 8)
    if (kind === 'sm') return clamp(8, 2, 12)
    if (kind === 'md') return clamp(12, 3, 20)
    if (kind === 'lg') return clamp(20, 4, 32)
    return 12 // fallback
  }

  // Button size — matches CSS `--rz-btn-*` (base * scale).
  function btn(kind) {
    const s = scale()
    const base = ({ xs: 36, sm: 44, md: 58, lg: 76 })[kind] || 58
    return Math.round(base * s)
  }

  // Train / game-world sprite scale — tracks viewport HEIGHT since sprites are
  // calibrated to a reference laptop viewport (H ≈ 800). Differs from `scale()`
  // (which is CSS-UI-oriented and saturates at 1.0 for viewports ≥ 320w): trains
  // need to shrink on mobile portrait (H ~ 667) and landscape (H ~ 375) and stay
  // at their designed PC size on laptop/desktop (H ≥ 800).
  //
  // Returns a viewport-ratio-driven multiplier. Targets character train height
  // at ~7% of viewport height across all devices (was ~11% pre-2026-04-23).
  // Formula derivation: spriteHeight in configs = 90px PC-reference, want desired_h
  // to be viewport_h × 0.07, so scale = (viewport_h × 0.07) / 90 = viewport_h × 0.000778.
  // Clamp to [0.32, 0.55] so small phones stay readable, large displays don't oversize.
  //   - 320px      → 0.32 (floor)
  //   - 480px      → 0.374
  //   - 700px      → 0.547
  //   - 800+ px    → 0.55 (ceiling)
  function trainScale() {
    const h = window.innerHeight || 800
    return Math.min(0.55, Math.max(0.32, h * 0.00078))
  }

  // Resize listener helper — passes the RZ object to the callback so consumer
  // can call `r.scale()`, `r.btn('md')` etc without re-importing.
  function onResize(fn) {
    const handler = () => fn(window.RZ)
    window.addEventListener('resize', handler, { passive: true })
    handler() // fire once immediately
    return () => window.removeEventListener('resize', handler)
  }

  window.RZ = { scale, bp, orient, fontScale, gap, btn, trainScale, onResize }
})()
