/* DuniaTelemetry — PRD-07 (docs/prd/PRD-07-telemetri-lokal-kesehatan-perangkat.md). Device health, kept on this
 * device only (nothing is sent anywhere): a ring buffer in localStorage 'dunia-telemetry', at most 200 entries and
 * 30 KB, oldest dropped first. Entries { t, k, g, ms?, msg? }:
 *   k 'stall' | 'render-stall' | 'boot-slow'  the freeze watchdog's findings (games/data/freeze-watchdog.js)
 *   k 'error' | 'promise'                      a script error / unhandled rejection, as the watchdog records it
 *   k 'jank'                                   one long task of 200 ms or more (PerformanceObserver 'longtask')
 * and per game a count of every long task (>= 50 ms, the browser's own threshold) in 'lt'.
 * g = the game being played: the hub's G-number while a game screen is open, else the page name.
 * Loaded by freeze-watchdog.js (every game page), which hands its records over through the 'dunia-freeze' event.
 * Passive: no input listeners; the observer runs after the frame, so a tap costs nothing extra (L4).
 *   DuniaTelemetry.read()      -> { e: [entries], lt: { game: n } }
 *   DuniaTelemetry.add(entry)  -> stores one entry (used by the watchdog event, and by the gate)
 *   DuniaTelemetry.report()    -> plain text for the parent to copy
 *   DuniaTelemetry.mountHealth(host)  the Dasbor "Kesehatan perangkat" panel
 */
;(function (W, D) {
  'use strict'
  if (W.DuniaTelemetry) return
  var KEY = 'dunia-telemetry', MAXN = 200, MAXB = 30000, JANK = 200
  function read () {
    try { var d = JSON.parse(localStorage.getItem(KEY) || '{}'); return { e: Array.isArray(d.e) ? d.e : [], lt: d.lt && typeof d.lt === 'object' ? d.lt : {} } } catch (_) { return { e: [], lt: {} } }
  }
  function write (d) {
    var s = JSON.stringify(d)
    while ((d.e.length > MAXN || s.length > MAXB) && d.e.length) { d.e = d.e.slice(Math.max(1, d.e.length - MAXN)); s = JSON.stringify(d) }
    if (s.length > MAXB) { d.lt = {}; s = JSON.stringify(d) }
    try { localStorage.setItem(KEY, s) } catch (_) {}
  }
  function game () {
    try {
      var a = D.querySelector('.screen.active[id^="screen-game"]')
      if (a) return 'G' + a.id.replace('screen-game', '')
    } catch (_) {}
    var p = location.pathname.split('/').pop() || 'index.html'
    return p.replace(/\.html$/, '')
  }
  function add (x) {
    var d = read(), e = { t: x.t || Date.now(), k: String(x.k || 'error').slice(0, 16), g: String(x.g || game()).slice(0, 40) }
    if (x.ms != null) e.ms = Math.round(x.ms)
    if (x.msg) e.msg = String(x.msg).slice(0, 120)
    d.e = d.e.concat([e]); write(d)
    return e
  }
  W.addEventListener('dunia-freeze', function (ev) {
    var r = ev.detail || {}, m = String(r.msg || '').match(/(\d+)ms/)
    add({ t: r.t, k: r.type === 'rejection' ? 'promise' : r.type, g: game(), ms: m ? +m[1] : null, msg: r.msg })
  })
  // long tasks: counted per game in memory, written at most every 5 s (and when the page hides)
  var pend = {}, timer = 0
  function flush () {
    timer = 0; var keys = Object.keys(pend); if (!keys.length) return
    var d = read(); keys.forEach(function (g) { d.lt[g] = (d.lt[g] || 0) + pend[g] }); pend = {}; write(d)
  }
  try {
    new PerformanceObserver(function (list) {
      var g = game()
      list.getEntries().forEach(function (en) {
        pend[g] = (pend[g] || 0) + 1
        if (en.duration >= JANK) add({ k: 'jank', g: g, ms: en.duration })
      })
      if (!timer) timer = setTimeout(flush, 5000)
    }).observe({ type: 'longtask', buffered: false })
  } catch (_) {}
  D.addEventListener('visibilitychange', function () { if (D.visibilityState === 'hidden') flush() })

  var LABEL = { stall: 'Macet', 'render-stall': 'Gambar berhenti', 'render-stall-frame': 'Gambar berhenti', 'boot-slow': 'Lambat dibuka', error: 'Galat', promise: 'Galat', jank: 'Tersendat' }
  function summary () {
    flush()
    var d = read(), by = {}
    d.e.forEach(function (e) { var l = LABEL[e.k] || 'Lain'; by[l] = (by[l] || 0) + 1 })
    return { d: d, by: by }
  }
  function report () {
    var s = summary(), lines = ['Kesehatan perangkat Dunia Emosi', (navigator.userAgent || '').slice(0, 160), '']
    Object.keys(s.by).forEach(function (l) { lines.push(l + ': ' + s.by[l]) })
    var lt = Object.keys(s.d.lt).sort(function (a, b) { return s.d.lt[b] - s.d.lt[a] })
    if (lt.length) lines.push('', 'Tugas panjang per game: ' + lt.map(function (g) { return g + ' ' + s.d.lt[g] }).join(', '))
    lines.push('')
    s.d.e.slice(-60).forEach(function (e) {
      lines.push(new Date(e.t).toISOString().slice(0, 16).replace('T', ' ') + '  ' + e.k + '  ' + e.g + (e.ms != null ? '  ' + e.ms + ' ms' : '') + (e.msg && e.k !== 'jank' ? '  ' + e.msg : ''))
    })
    return lines.join('\n')
  }
  function css () {
    if (D.getElementById('dtel-style')) return
    var st = D.createElement('style'); st.id = 'dtel-style'
    st.textContent = '#dash-health .dtel-row{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 10px}#dash-health .dtel-chip{padding:8px 12px;border-radius:12px;background:#f5f5f4;color:#292524;font-size:15px;font-weight:700}' +
      '#dash-health .dtel-ok{color:#166534}#dash-health .dtel-copy{min-height:48px;width:100%;border:0;border-radius:14px;background:#44403c;color:#fff;font:inherit;font-size:16px;font-weight:800;cursor:pointer}' +
      '#dash-health .dtel-note{margin:6px 0 0;font-size:14px;color:#57534e}#dash-health textarea{width:100%;height:120px;margin-top:8px;font:12px/1.4 monospace}'
    D.head.appendChild(st)
  }
  function mountHealth (host) {
    if (!host) return
    css(); host.textContent = ''
    var s = summary(), h = D.createElement('h3'); h.className = 'dash-section-title'; h.textContent = 'Kesehatan perangkat'
    var row = D.createElement('div'); row.className = 'dtel-row'
    var labels = Object.keys(s.by)
    if (!labels.length) { var ok = D.createElement('span'); ok.className = 'dtel-chip dtel-ok'; ok.textContent = 'Semua lancar'; row.appendChild(ok) }
    labels.forEach(function (l) { var c = D.createElement('span'); c.className = 'dtel-chip'; c.dataset.k = l; c.textContent = l + ' ' + s.by[l]; row.appendChild(c) })
    var b = D.createElement('button'); b.type = 'button'; b.className = 'dtel-copy'; b.textContent = 'Salin laporan'
    var p = D.createElement('p'); p.className = 'dtel-note'; p.textContent = 'Tersimpan di perangkat ini saja (' + s.d.e.length + ' catatan).'
    b.addEventListener('click', function () {
      var txt = report(), done = function () { p.textContent = 'Laporan tersalin.' }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, show); else show()
      function show () { var t = host.querySelector('textarea') || host.appendChild(D.createElement('textarea')); t.readOnly = true; t.value = txt; t.select(); p.textContent = 'Pilih teks di bawah lalu salin.' }
    })
    host.appendChild(h); host.appendChild(row); host.appendChild(b); host.appendChild(p)
  }
  W.DuniaTelemetry = { read: read, add: add, report: report, mountHealth: mountHealth, flush: flush }
})(window, document)
