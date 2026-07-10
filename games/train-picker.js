/* =============================================================================
 * Dunia Emosi — Shared Train Picker helpers  (window.TrainPicker)
 * =============================================================================
 * A-339 P2. Cross-game picker concerns that used to be hand-rolled per game.
 * First adopter: g16 Selamatkan Kereta (categorised chip-row + card grid).
 *
 *   TrainPicker.lazyPreview(gridEl, drawFn)
 *       Draw each card's <canvas[data-lazykey]> ONLY when it scrolls into view
 *       (IntersectionObserver). Lets a full 300+ train roster render smoothly —
 *       no eager 300× Image() decode on tab open.
 *
 *   TrainPicker.markSlidable(rowEl)
 *       Turn a horizontal category chip row into an obviously-slidable strip:
 *       left-aligned, momentum scroll, edge-fade mask hinting "more →".
 *
 * Self-injects its own CSS (idempotent). No dependencies.
 * ========================================================================== */
;(function (global) {
  'use strict'

  function injectCSS () {
    if (document.getElementById('tp-style')) return
    var s = document.createElement('style')
    s.id = 'tp-style'
    s.textContent =
      '.tp-slidable{justify-content:flex-start!important;scroll-snap-type:x proximity;' +
      '-webkit-overflow-scrolling:touch;scroll-padding-left:8px;' +
      '-webkit-mask-image:linear-gradient(90deg,#000 0,#000 calc(100% - 26px),transparent 100%);' +
      'mask-image:linear-gradient(90deg,#000 0,#000 calc(100% - 26px),transparent 100%)}' +
      '.tp-slidable > *{scroll-snap-align:start;flex:0 0 auto!important}'
    document.head.appendChild(s)
  }

  var TrainPicker = {
    _io: null,

    // Observe every canvas[data-lazykey] under `gridEl`; call drawFn(canvas, key)
    // once, the first time it becomes visible. Re-callable per tab switch.
    lazyPreview: function (gridEl, drawFn) {
      if (!gridEl || typeof drawFn !== 'function') return
      if (this._io) { try { this._io.disconnect() } catch (_) {} this._io = null }
      // Fallback for environments without IntersectionObserver: draw all now.
      if (typeof IntersectionObserver === 'undefined') {
        gridEl.querySelectorAll('canvas[data-lazykey]').forEach(function (cv) {
          if (cv._tpDrawn) return; cv._tpDrawn = true
          try { drawFn(cv, cv.dataset.lazykey) } catch (_) {}
        })
        return
      }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return
          var cv = e.target
          if (cv._tpDrawn) { io.unobserve(cv); return }
          cv._tpDrawn = true
          try { drawFn(cv, cv.dataset.lazykey) } catch (_) {}
          io.unobserve(cv)
        })
      }, { root: gridEl, rootMargin: '160px 0px' })
      gridEl.querySelectorAll('canvas[data-lazykey]').forEach(function (cv) { io.observe(cv) })
      this._io = io
    },

    markSlidable: function (rowEl) {
      if (!rowEl) return
      injectCSS()
      rowEl.classList.add('tp-slidable')
    }
  }

  global.TrainPicker = TrainPicker
})(window)
