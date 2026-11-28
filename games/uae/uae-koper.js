/* PRD-59D the packing list page. Data: uae-koper-data.js (UAEKoper). Saving: UAEStore.KEYS.koper = { v: 1, got: {id: 1},
   loc: 'all'|'kabin'|... }. Children count and names come from the family page (KEYS.familyMeta). */
(function () {
  'use strict'
  var K = window.UAEKoper, KEY = UAEStore.KEYS.koper
  var $ = function (id) { return document.getElementById(id) }
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] }) }
  var INFO = '<svg aria-hidden="true" class="u-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>'
  var saved = UAEStore.read(KEY, {}); if (!saved || typeof saved !== 'object') saved = {}
  saved = { v: 1, got: Object.assign({}, saved.got), loc: saved.loc || 'all' }
  var meta = UAEStore.read(UAEStore.KEYS.familyMeta, {}), kids = Array.isArray(meta.kids) && meta.kids.length ? meta.kids : [{ name: 'Anak 1' }, { name: 'Anak 2' }]
  var all = []; K.groups.forEach(function (g) { g.items.forEach(function (it) { all.push(it) }) })
  var byId = {}; all.forEach(function (it) { byId[it.id] = it })
  var WHO = { ibu: 'Ibu', anak: 'Tiap anak', semua: 'Semua orang' }
  var packable = function (it) { return it.loc !== 'jangan' }
  function persist() { if (!UAEStore.write(KEY, saved)) toast('Tidak bisa menyimpan di perangkat ini') }
  var toastT
  function toast(m) { var t = $('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show') }, 2400) }

  function itemHtml(it) {
    var got = !!saved.got[it.id], no = it.loc === 'jangan'
    var who = it.who === 'anak' ? WHO.anak + ' (' + kids.length + ')' : WHO[it.who]
    return '<li class="u-kp' + (no ? ' u-kp-no' : '') + '" data-loc="' + it.loc + '">' +
      (no ? '<span class="u-kp-mark" aria-hidden="true"><svg class="u-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M6 6l12 12"/></svg></span>'
        : '<input type="checkbox" id="kp-' + it.id + '" data-id="' + it.id + '"' + (got ? ' checked' : '') + '>') +
      '<label for="kp-' + it.id + '" class="u-kp-t"><span>' + esc(it.text) + '</span>' +
        '<span class="u-kp-meta"><span class="u-tag u-kp-loc-' + it.loc + '">' + esc(K.locs[it.loc]) + '</span> <span class="u-muted">' + esc(who) + ', ' + esc(it.qty) + '</span></span></label>' +
      '<button type="button" class="u-tip" data-tip="' + it.id + '" aria-label="Penjelasan: ' + esc(it.text) + '">' + INFO + '</button></li>'
  }
  function render() {
    var shown = function (it) { return saved.loc === 'all' || it.loc === saved.loc }
    $('groups').innerHTML = K.groups.map(function (g) {
      var list = g.items.filter(shown); if (!list.length) return ''
      var pk = g.items.filter(packable), done = pk.filter(function (it) { return saved.got[it.id] }).length
      return '<section class="u-phase" id="kg-' + g.id + '"><div class="u-phase-head"><h2>' + esc(g.title) + '</h2><span class="u-muted">' + done + ' dari ' + pk.length + ' siap</span></div>' +
        (g.intro ? '<p class="u-muted u-sec-sm">' + esc(g.intro) + '</p>' : '') + '<ul class="u-kps">' + list.map(itemHtml).join('') + '</ul></section>'
    }).join('')
    var pk = all.filter(packable), d = pk.filter(function (it) { return saved.got[it.id] }).length
    $('kp-done').textContent = d + ' dari ' + pk.length
    $('kp-bar').style.setProperty('--p', pk.length ? d / pk.length : 0)
    $('kp-kids').textContent = kids.map(function (k) { return k.name || k }).join(', ')
    document.querySelectorAll('[data-loc-f]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.locF === saved.loc)) })
    window.__uaeKoper = { done: d, n: pk.length, items: all.length, no: all.length - pk.length, kids: kids.length, loc: saved.loc }
  }
  function showTip(it, from) {
    var box = $('u-tipbox')
    $('u-tipbox-h').textContent = it.text
    $('u-tipbox-p').textContent = it.tip
    $('u-tipbox-g').textContent = K.grades[it.grade] + ', dicek ' + K.checked
    $('u-tipbox-s').innerHTML = it.src.map(function (u, i) { return '<a href="' + esc(u) + '" target="_blank" rel="noopener">sumber ' + (i + 1) + '</a>' }).join(', ')
    if (box.showPopover) { try { box.showPopover() } catch (e) {} } else box.classList.add('show')
    box._from = from; $('u-tipbox-x').focus({ preventScroll: true })
  }
  document.addEventListener('change', function (e) {
    var id = e.target.dataset && e.target.dataset.id; if (!id || !byId[id]) return
    if (e.target.checked) saved.got[id] = 1; else delete saved.got[id]
    persist(); render(); var el = $('kp-' + id); if (el) el.focus({ preventScroll: true })
  })
  document.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return
    if (b.dataset.tip) showTip(byId[b.dataset.tip], b)
    else if (b.dataset.locF) { saved.loc = b.dataset.locF; persist(); render() }
    else if (b.id === 'u-tipbox-x') { var bx = $('u-tipbox'); if (bx.hidePopover) bx.hidePopover(); else bx.classList.remove('show'); if (bx._from) bx._from.focus({ preventScroll: true }) }
    else if (b.id === 'kp-reset') { saved.got = {}; persist(); render(); toast('Centang dikosongkan') }
  })
  $('btn-print').addEventListener('click', function () { window.print() })
  $('conf').innerHTML = K.conflicts.map(function (t) { return '<li>' + esc(t) + '</li>' }).join('')
  $('checked').textContent = K.checked
  render()
})()
