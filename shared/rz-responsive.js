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

  // Resize listener helper — passes the RZ object to the callback so consumer
  // can call `r.scale()`, `r.btn('md')` etc without re-importing.
  function onResize(fn) {
    const handler = () => fn(window.RZ)
    window.addEventListener('resize', handler, { passive: true })
    handler() // fire once immediately
    return () => window.removeEventListener('resize', handler)
  }

  window.RZ = { scale, bp, orient, fontScale, gap, btn, onResize }
})()
