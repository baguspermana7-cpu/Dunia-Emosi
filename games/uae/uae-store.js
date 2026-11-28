/* PRD-59 L3: saving for the two "Relocation to UAE" tools. One localStorage key per tool (device-wide, not per
   child: these are the parent's own records). Backup = a JSON file the parent downloads; restore reads it back and
   only accepts a file made for the same tool. */
(function (root) {
  'use strict'
  var VERSION = 1
  function read(key, fallback) {
    try { var raw = localStorage.getItem(key); if (!raw) return fallback; var v = JSON.parse(raw); return v && typeof v === 'object' ? v : fallback } catch (e) { return fallback }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true } catch (e) { return false }
  }
  function backup(key, tool) {
    var data = { tool: tool, version: VERSION, saved: new Date().toISOString(), data: read(key, {}) }
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    var a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = tool + '-cadangan-' + new Date().toISOString().slice(0, 10) + '.json'
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(function () { URL.revokeObjectURL(a.href) }, 2000)
    return data
  }
  // resolves to the restored data, or rejects with a message a parent can read
  function restore(key, tool, file) {
    return new Promise(function (ok, no) {
      if (!file) return no('Tidak ada berkas yang dipilih.')
      var r = new FileReader()
      r.onerror = function () { no('Berkas tidak bisa dibaca.') }
      r.onload = function () {
        var d
        try { d = JSON.parse(String(r.result)) } catch (e) { return no('Berkas ini bukan cadangan yang benar.') }
        if (!d || d.tool !== tool || typeof d.data !== 'object' || !d.data) return no('Berkas ini cadangan untuk alat lain.')
        write(key, d.data); ok(d.data)
      }
      r.readAsText(file)
    })
  }
  var api = { read: read, write: write, backup: backup, restore: restore, KEYS: { docs: 'dunia-uae-docs-v1', sim: 'dunia-uae-sim-v1', family: 'dunia-uae-family-v1', familyMeta: 'dunia-uae-family-meta-v1', koper: 'dunia-uae-koper-v1' } }
  root.UAEStore = api
  if (typeof module !== 'undefined' && module.exports) module.exports = api
})(typeof window !== 'undefined' ? window : globalThis)
