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
    if (sessionStorage.getItem(flag)) return
    sessionStorage.setItem(flag, '1')
    reloaded = true
    location.reload()
  }
  navigator.serviceWorker.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'SW_UPDATED') reloadOnce(e.data.version)
  })
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    // A new SW took control of this page — pick up the fresh assets.
    reloadOnce('cc')
  })
})()
