/* =============================================================================
 * Dunia Emosi — standalone-page SW auto-reload (B-276)
 * =============================================================================
 * The standalone game pages (balapan-kereta.html, lokomotif-pemberani.html, …)
 * are controlled by the root service worker (registered by index.html/game.js)
 * but never LISTENED for its update broadcast — so when a new build deployed,
 * the open game page kept running the OLD cached bytes and every shipped fix
 * stayed invisible ("dimensi tidak berubah" though the server had the fix).
 *
 * This tiny helper makes a fresh deploy auto-refresh the page once:
 *   - SW_UPDATED message  → reload (sw.js posts this from activate)
 *   - controllerchange    → reload (a new SW took control = a deploy)
 * Both are guarded so a page only reloads once per new build.
 * ========================================================================== */
(function () {
  if (!('serviceWorker' in navigator)) return
  var reloaded = false
  function reloadOnce(tag) {
    if (reloaded) return
    // v59.89 — never yank the page out from under an in-flight "Siapkan
    // Offline" download (a 40 MB game takes minutes on a tablet). Re-check
    // shortly; the deploy still lands, just after the download settles.
    // No-op on every page that does not load games/film-offline.js.
    try {
      if (window.FilmOffline && window.FilmOffline.busy && window.FilmOffline.busy()) {
        setTimeout(function () { reloadOnce(tag) }, 4000)
        return
      }
    } catch (e) {}
    var flag = 'dunia-sw-reloaded-' + (tag || '')
    try {
      if (sessionStorage.getItem(flag)) return
      sessionStorage.setItem(flag, '1')
    } catch (e) {
      // Private/blocked storage must not prevent an update. The in-page guard
      // still combines the message and controllerchange into a single reload.
      console.warn('[Dunia PWA] Penyimpanan sesi tidak tersedia; pembaruan tetap dimuat.')
    }
    reloaded = true
    // v63.30 — a deploy must never yank a child out of a game in progress (owner: "random tiba2
    // back to home"). While the page is visible, wait until it is hidden (app switched, screen
    // off, tab closed) and reload then; the new build is picked up on the next return.
    if (document.visibilityState === 'visible') {
      document.addEventListener('visibilitychange', function onHide() {
        if (document.visibilityState !== 'hidden') return
        document.removeEventListener('visibilitychange', onHide)
        location.reload()
      })
      return
    }
    location.reload()
  }
  var ctlAtLoad = !!navigator.serviceWorker.controller
  navigator.serviceWorker.addEventListener('message', function (e) {
    // A page that loaded with no SW (the first visit) is already running fresh bytes:
    // the first activation's SW_UPDATED broadcast is not a deploy, so don't reload mid-play.
    if (!ctlAtLoad) return
    if (e.data && e.data.type === 'SW_UPDATED') reloadOnce(e.data.version)
  })
  // A page opened directly (bookmark, shared link, home-screen shortcut) may never have seen index.html,
  // so the root SW was never registered and Chrome refuses to install the PWA from here
  // ("Aplikasi ini tidak dapat diinstal"). Register the same root SW; the first take-over is not a deploy.
  var hadCtl = !!navigator.serviceWorker.controller
  if (!hadCtl) {
    try { navigator.serviceWorker.register('../sw.js', { scope: '../' }).catch(function () {}) } catch (e) {}
  }
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (!hadCtl) { hadCtl = true; return }   // first registration claimed the page: nothing new to load
    // A new SW took control of this page — pick up the fresh assets.
    reloadOnce('cc')
  })
})()
