/* DuniaOffline — PRD-23 (docs/prd/PRD-23-indikator-siap-luring-per.md). On the beranda map, a small "siap" badge (an
 * SVG cloud with a tick, no emoji) on every game whose files are all in this device's cache, so the game opens with
 * no internet. The list per game is games/data/offline-manifest.json (built by tools/build-offline-manifest.mjs).
 * A parent can fetch everything at once: "Unduh semua game" in the Dasbor (behind the parent gate). The fetches go
 * through the service worker, which keeps what it serves (sw.js: pages network-first, files cache-first).
 *   DuniaOffline.refresh()             re-checks the cache and redraws the badges -> Promise<{ ready: [ids] }>
 *   DuniaOffline.downloadAll(onStep)   fetches every file of every game -> Promise<{ ok, failed }>
 *   DuniaOffline.mountSetting(host)    the Dasbor button
 */
;(function (W, D) {
  'use strict'
  if (W.DuniaOffline) return
  var me = D.currentScript && D.currentScript.src || ''
  var ROOT = me ? me.replace(/games\/data\/offline-ready\.js.*$/, '') : ''
  var MAN = ROOT + 'games/data/offline-manifest.json', man = null
  var ICON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 9.2 4.5 4.5 0 0 0 7 18z" fill="#16a34a"/><path d="M9 13.2l2.1 2.1 4-4" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'

  function load () {
    if (man) return Promise.resolve(man)
    return fetch(MAN, { cache: 'no-cache' }).then(function (r) { return r.json() }).then(function (j) { man = j; return j })
  }
  function has (u) { return W.caches.match(new Request(ROOT + u)).then(function (r) { return !!r }).catch(function () { return false }) }
  function css () {
    if (D.getElementById('doff-style')) return
    var st = D.createElement('style'); st.id = 'doff-style'
    st.textContent = '.wmap-node{position:relative}.wn-ready{position:absolute;top:2px;left:2px;width:26px;height:26px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 4px rgba(0,0,0,.18);pointer-events:none;z-index:2}' +
      '#dash-offline .doff-go{min-height:52px;width:100%;border:0;border-radius:14px;background:#0f766e;color:#fff;font:inherit;font-size:17px;font-weight:800;cursor:pointer}' +
      '#dash-offline .doff-go[disabled]{opacity:.6}#dash-offline .doff-note{margin:8px 0 0;font-size:14px;color:#57534e}'
    D.head.appendChild(st)
  }
  function refresh () {
    if (!W.caches) return Promise.resolve({ ready: [] })
    css()
    return load().then(function (m) {
      var ids = Object.keys(m.games)
      return Promise.all(ids.map(function (id) {
        return Promise.all(m.games[id].files.map(has)).then(function (r) { return r.every(Boolean) })
      })).then(function (ok) {
        var ready = []
        ids.forEach(function (id, i) {
          var tile = D.getElementById('gtile-' + id); if (!tile) return
          var b = tile.querySelector('.wn-ready')
          if (ok[i]) { ready.push(id); if (!b) { b = D.createElement('span'); b.className = 'wn-ready'; b.title = 'Siap tanpa internet'; b.innerHTML = ICON; tile.appendChild(b) } }
          else if (b) b.remove()
        })
        return { ready: ready }
      })
    }).catch(function () { return { ready: [] } })
  }
  function downloadAll (onStep) {
    return load().then(function (m) {
      var all = {}
      Object.keys(m.games).forEach(function (id) { m.games[id].files.forEach(function (f) { all[f] = 1 }) })
      var list = Object.keys(all), done = 0, failed = 0, i = 0
      function one () {
        if (i >= list.length) return Promise.resolve()
        var f = list[i++], html = /\.html(\?|$)/.test(f)
        return fetch(ROOT + f, html ? { headers: { Accept: 'text/html' } } : {})
          .then(function (r) { if (!r.ok) failed++ }, function () { failed++ })
          .then(function () { done++; if (onStep) onStep(done, list.length); return one() })
      }
      return Promise.all([one(), one(), one(), one()]).then(function () {
        return new Promise(function (r) { setTimeout(r, 400) })   // the worker writes its copies a moment after it answers
      }).then(function () { return refresh() }).then(function (res) { return { ok: list.length - failed, failed: failed, ready: res.ready } })
    })
  }
  function mountSetting (host) {
    if (!host || host.querySelector('.doff-go')) return
    css()
    var h = D.createElement('h3'); h.className = 'dash-section-title'; h.textContent = 'Main tanpa internet'
    var b = D.createElement('button'); b.type = 'button'; b.className = 'doff-go'; b.textContent = 'Unduh semua game'
    var p = D.createElement('p'); p.className = 'doff-note'; p.textContent = 'Game dengan tanda awan hijau di peta bisa dimainkan tanpa internet.'
    load().then(function (m) { if (m.bytes) p.textContent = 'Sekitar ' + Math.round(m.bytes / 1e6) + ' MB. ' + p.textContent }).catch(function () {})
    b.addEventListener('click', function () {
      if (!navigator.onLine) { p.textContent = 'Sambungkan internet dulu, lalu coba lagi.'; return }
      if (!navigator.serviceWorker || !navigator.serviceWorker.controller) { p.textContent = 'Buka ulang aplikasi sekali, lalu coba lagi.'; return }
      b.disabled = true
      downloadAll(function (n, t) { b.textContent = 'Mengunduh ' + n + ' / ' + t }).then(function (r) {
        b.disabled = false; b.textContent = 'Unduh semua game'
        p.textContent = r.ready.length + ' game siap tanpa internet' + (r.failed ? ' (' + r.failed + ' berkas gagal, coba lagi nanti)' : '') + '.'
      }, function () { b.disabled = false; b.textContent = 'Unduh semua game'; p.textContent = 'Gagal mengunduh. Coba lagi nanti.' })
    })
    host.appendChild(h); host.appendChild(b); host.appendChild(p)
  }

  W.DuniaOffline = { refresh: refresh, downloadAll: downloadAll, mountSetting: mountSetting }
  function start () { setTimeout(refresh, 1500) }   // after the first paint of the map
  if (D.readyState === 'complete') start(); else W.addEventListener('load', start)
})(window, document)
