/* PRD-59A §3 the document checklist page. Data: uae-docs-data.js (UAEDocs). Engine: uae-flow.js (UAEFlow).
   Saving: uae-store.js, key 'dunia-uae-docs-v1', shape in PRD-59A §4.3. */
(function () {
  'use strict'
  // PRD-59C: the same checklist renders the family visa page; that page sets window.UAEChecklist = {data, key} first
  var CFG = window.UAEChecklist || {}
  var D = CFG.data || window.UAEDocs, F = window.UAEFlow, KEY = CFG.key || UAEStore.KEYS.docs
  var saved = F.migrate(UAEStore.read(KEY, {}))
  var $ = function (id) { return document.getElementById(id) }
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] }) }
  var ICON = {
    chev: '<svg aria-hidden="true" class="u-icon u-chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
    pin: '<svg aria-hidden="true" class="u-icon" viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    tick: '<svg aria-hidden="true" class="u-icon" viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>',
    info: '<svg aria-hidden="true" class="u-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>'
  }
  var num = {}; D.steps.forEach(function (s, i) { num[s.id] = i + 1 })
  var STATUS = { todo: 'Belum', doing: 'Sedang', done: 'Selesai' }
  // PRD-59 §7 L22: every field of a step has a plain explanation behind an info button
  var TIP = {
    why: ['Untuk apa', 'Alasan langkah ini diperlukan, menurut sumber resmi yang ditautkan di bawah.'],
    issuer: ['Penerbit', 'Lembaga yang menerbitkan atau mengesahkan dokumen di langkah ini.'],
    where: ['Lokasi', 'Kantor yang didatangi, alamat dan jam layanan. Tautan layanan online membuka situs resminya.'],
    bring: ['Yang dibawa', 'Berkas yang harus dibawa atau diunggah. Centang setiap berkas yang sudah siap; centangan tersimpan di perangkat ini. Angka dalam kurung adalah jumlah asli atau salinan.'],
    pages: ['Jumlah lembar', 'Jumlah halaman dokumen hasil langkah ini, untuk menyiapkan map dan fotokopi.'],
    time: ['Waktu proses', 'Lama proses menurut sumber. Bila sumber resmi tidak menyebutnya, tertulis perkiraan.'],
    cost: ['Biaya', 'Biaya resmi. AED dihitung ke rupiah dengan kurs di ringkasan. Label perkiraan berarti angkanya belum dari sumber resmi; cek layar pembayaran sebelum membayar.'],
    payer: ['Dibayar oleh', 'Siapa yang biasanya membayar. Pastikan di kontrak kerja atau tanyakan HR.'],
    result: ['Hasilnya', 'Dokumen atau status yang Anda dapat setelah langkah ini selesai.'],
    notes: ['Catatan dan jebakan', 'Hal yang sering membuat berkas ditolak atau terlambat.'],
    sources: ['Sumber', 'Halaman resmi atau sekunder yang dipakai untuk langkah ini, dan tanggal terakhir dicek.'],
    status: ['Status', 'Belum, Sedang, atau Selesai. Langkah berikutnya dan sisa biaya dihitung dari status ini.'],
    actual: ['Biaya sebenarnya', 'Isi jumlah yang benar-benar Anda bayar. Ringkasan memakai angka ini sebagai biaya terpakai.'],
    note: ['Catatan', 'Catatan pribadi: nomor antrean, nama petugas, nomor resi. Tersimpan di perangkat ini.'],
    terms: ['Istilah', 'Ketuk istilah untuk melihat artinya.'],
    sumdone: ['Langkah selesai', 'Jumlah langkah berstatus Selesai dari semua langkah, dan berapa berkas bawaan yang sudah dicentang.'],
    summoney: ['Uang yang disiapkan', 'Jumlah biaya resmi langkah yang belum selesai dan Anda bayar sendiri, dalam rupiah. Rentang muncul bila biayanya berkisar.'],
    sumactual: ['Sudah keluar', 'Jumlah dari kolom Biaya sebenarnya yang Anda isi di setiap langkah.'],
    sumemp: ['Dibayar pemberi kerja', 'Biaya yang biasanya ditanggung perusahaan. Tidak masuk uang yang disiapkan.'],
    fx: ['Kurs', 'Kurs AED ke rupiah untuk menghitung biaya dalam AED. Ganti dengan kurs hari ini dari bank Anda.'],
    pmap: ['Peta', 'Semua bagian sekaligus. Ketuk bagian untuk melompat ke sana.'],
    filter: ['Saring', 'Tampilkan hanya langkah dengan status tertentu.']
  }
  var GLOSS = D.glossary || (window.UAEFamily && window.UAEFamily.glossary) || []
  function tipBtn(k) { return ' <button type="button" class="u-tip" data-act="tip" data-k="' + k + '" aria-label="Penjelasan: ' + esc(TIP[k][0]) + '">' + ICON.info + '</button>' }
  function dt(k, label) { return '<dt>' + esc(label || TIP[k][0]) + tipBtn(k) + '</dt>' }
  function termsOf(s) {
    var text = [s.title, s.why, s.notes, s.issuer, (s.where || {}).name].concat((s.bring || []).map(function (b) { return b.text })).join(' ')
    return GLOSS.filter(function (g) { return text.indexOf(g.term) >= 0 })
  }
  function showTip(title, text, from) {
    var box = $('u-tipbox')
    if (!box) {
      box = document.createElement('div'); box.id = 'u-tipbox'; box.className = 'u-tipbox'; box.setAttribute('popover', ''); box.setAttribute('role', 'dialog')
      box.innerHTML = '<strong id="u-tipbox-h"></strong><p id="u-tipbox-p"></p><button type="button" class="u-btn" data-act="tipclose">Tutup</button>'
      box.setAttribute('aria-labelledby', 'u-tipbox-h'); document.body.appendChild(box)
    }
    $('u-tipbox-h').textContent = title; $('u-tipbox-p').textContent = text
    if (box.showPopover) { try { box.showPopover() } catch (e) {} } else box.classList.add('show')
    box.querySelector('button').focus({ preventScroll: true }); box._from = from
  }

  function fx() { var v = Number(saved.fx); return v > 0 ? v : D.fx.aedToIdr }
  function rp(n) { return 'Rp ' + Math.round(n).toLocaleString('id-ID') }
  function costText(c) {
    if (!c || (c.min === 0 && c.max === 0)) return 'Gratis'
    var f = function (n) { return (c.cur === 'AED' ? 'AED ' : 'Rp ') + Number(n).toLocaleString('id-ID') }
    return c.min === c.max ? f(c.min) : f(c.min) + ' sampai ' + f(c.max)
  }
  function moneyText(m) { return m.max ? (m.min === m.max ? rp(m.max) : rp(m.min) + ' sampai ' + rp(m.max)) : 'tanpa biaya sendiri' }
  function persist() { if (!UAEStore.write(KEY, saved)) toast('Tidak bisa menyimpan di perangkat ini'); document.dispatchEvent(new CustomEvent('uae-saved', { detail: saved })) }
  function update(id, patch) { saved = F.apply(saved, id, patch); persist() }
  function inPhase(ph) { return function (s) { return s.phase === ph } }
  function shown(s) { var f = saved.filter || 'all'; return f === 'all' || F.state(saved, s.id).status === f }

  function renderSummary() {
    var p = F.progress(D.steps, saved), m = F.money(D.steps, saved, fx())
    $('sum-done').textContent = p.done + ' dari ' + p.n
    $('sum-bar').style.setProperty('--p', p.n ? p.done / p.n : 0)
    $('sum-items').textContent = p.items.checked + ' dari ' + p.items.total + ' berkas siap'
    $('sum-money').textContent = moneyText(m)
    $('sum-actual').textContent = m.actual ? rp(m.actual) : 'belum diisi'
    $('sum-emp').textContent = rp(m.employer)
    $('fx').value = fx()
    $('fx-note').textContent = 'Bawaan ' + D.fx.aedToIdr.toLocaleString('id-ID') + ', per ' + D.fx.asOf + ', sumber ' + D.fx.source + '.'
    var n = F.next(D.steps, saved), box = $('next')
    if (!n) { box.innerHTML = '<h2>Semua langkah selesai</h2><p class="u-muted">Simpan cadangan untuk arsip.</p>'; return }
    var s = D.steps[num[n] - 1], st = F.state(saved, n), wait = F.blockedBy(D.steps, saved, n)
    box.innerHTML = '<span class="u-muted">Langkah berikutnya</span><h2>' + num[n] + '. ' + esc(s.title) + '</h2>' +
      '<p class="u-muted">' + esc(s.where && s.where.name) + ', ' + esc(costText(s.cost)) + '</p>' +
      (wait.length ? '<p class="u-wait">Masih menunggu langkah ' + wait.map(function (w) { return num[w] }).join(', ') + '</p>' : '') +
      '<div class="u-row"><button type="button" class="u-btn u-btn-primary" data-act="goto" data-id="' + n + '">' + (st.status === 'doing' ? 'Lanjutkan' : 'Buka langkah') + '</button></div>'
  }

  function stepHtml(s) {
    var terms = termsOf(s), st = F.state(saved, s.id), c = s.cost || {}, wait = F.blockedBy(D.steps, saved, s.id), it = F.items(s, st), where = s.where || {}
    var bring = (s.bring || []).map(function (b) {
      return '<li><label class="u-check"><input type="checkbox" data-act="item" data-item="' + esc(b.id) + '"' + (st.bring[b.id] ? ' checked' : '') + '><span>' + esc(b.text) + (b.copies ? ' <span class="u-muted">(' + esc(b.copies) + ')</span>' : '') + '</span></label></li>'
    }).join('')
    var src = (s.sources || []).map(function (u, i) { return '<a href="' + esc(u) + '" target="_blank" rel="noopener">sumber ' + (i + 1) + '</a>' }).join(', ')
    var statusBtn = function (v) { return '<button type="button" class="u-chip" data-act="status" data-v="' + v + '" aria-pressed="' + (st.status === v) + '">' + STATUS[v] + '</button>' }
    var aedIdr = c.cur === 'AED' && c.max ? ' <span class="u-muted">(sekitar ' + rp(c.min * fx()) + (c.min !== c.max ? ' sampai ' + rp(c.max * fx()) : '') + ')</span>' : ''
    return '<li class="u-step" id="step-' + s.id + '" data-id="' + s.id + '" data-status="' + st.status + '">' +
      '<button type="button" class="u-step-head" aria-expanded="false" aria-controls="body-' + s.id + '" data-act="toggle">' +
        '<span class="u-num">' + (st.status === 'done' ? ICON.tick : num[s.id]) + '</span>' +
        '<span><span class="u-step-title">' + esc(s.title) + '</span><br><span class="u-step-sub">' + esc(s.issuer) + '</span><br>' +
          '<span class="u-tag u-st-' + st.status + '">' + STATUS[st.status] + '</span>' + (it.total ? ' <span class="u-muted u-small">' + it.checked + '/' + it.total + ' berkas</span>' : '') +
          (wait.length && st.status !== 'done' ? '<br><span class="u-wait">Tunggu langkah ' + wait.map(function (w) { return num[w] }).join(', ') + ' dulu</span>' : '') +
          '<span class="u-step-cost"><span class="u-money">' + esc(costText(c)) + '</span>' + (s.payer === 'employer' ? ' <span class="u-tag u-tag-emp">pemberi kerja</span>' : '') + '</span></span>' +
        '<span class="u-step-end">' + ICON.chev + '</span>' +
      '</button>' +
      '<div class="u-step-body" id="body-' + s.id + '"><dl class="u-dl">' +
        (s.why ? '<div class="u-wide">' + dt('why') + '<dd>' + esc(s.why) + '</dd></div>' : '') +
        '<div>' + dt('issuer') + '<dd>' + esc(s.issuer) + '</dd></div>' +
        '<div>' + dt('where') + '<dd>' + esc(where.name || '') + (where.address ? '<br>' + esc(where.address) : '') + (where.hours ? '<br><span class="u-muted">' + esc(where.hours) + '</span>' : '') +
          (where.map ? '<br><a href="' + esc(where.map) + '" target="_blank" rel="noopener">' + ICON.pin + '<span>buka peta</span></a>' : '') +
          (where.online ? '<br><a href="' + esc(where.online) + '" target="_blank" rel="noopener">layanan online</a>' : '') + '</dd></div>' +
        '<div class="u-wide">' + dt('bring', 'Yang dibawa (centang yang sudah siap)') + '<dd><ul class="u-checks">' + bring + '</ul></dd></div>' +
        '<div>' + dt('pages') + '<dd>' + esc(s.pages || '-') + '</dd></div>' +
        '<div>' + dt('time') + '<dd>' + esc(s.time || '-') + '</dd></div>' +
        '<div>' + dt('cost') + '<dd><span class="u-money">' + esc(costText(c)) + '</span>' + aedIdr + (c.est ? ' <span class="u-tag u-tag-est">perkiraan</span>' : '') +
          (c.note ? '<br><span class="u-muted">' + esc(c.note) + '</span>' : '') + '<br><span class="u-muted">berlaku ' + esc(c.asOf) + '</span></dd></div>' +
        '<div>' + dt('payer') + '<dd>' + (s.payer === 'employer' ? 'Biasanya pemberi kerja (cek kontrak)' : s.payer === 'either' ? 'Tergantung kontrak' : 'Sendiri') + '</dd></div>' +
        (s.result ? '<div>' + dt('result') + '<dd>' + esc(s.result) + '</dd></div>' : '') +
        (s.notes ? '<div class="u-wide">' + dt('notes') + '<dd>' + esc(s.notes) + '</dd></div>' : '') +
        (terms.length ? '<div class="u-wide">' + dt('terms') + '<dd class="u-terms">' + terms.map(function (g) { return '<button type="button" class="u-chip u-term" data-act="term" data-term="' + esc(g.term) + '">' + esc(g.term) + '</button>' }).join('') + '</dd></div>' : '') +
        '<div class="u-wide">' + dt('sources') + '<dd class="u-small">' + (src || '-') + ' <span class="u-muted">dicek ' + esc(s.checked || D.checked) + '</span>' + (F.stale(s.checked || D.checked) ? ' <span class="u-tag u-tag-est">perlu dicek ulang</span>' : '') + '</dd></div>' +
      '</dl>' +
      '<div class="u-stack u-sec u-noprint">' +
        '<div class="u-status" role="group" aria-label="Status langkah ' + num[s.id] + '">' + statusBtn('todo') + statusBtn('doing') + statusBtn('done') + tipBtn('status') + '</div>' +
        (st.started || st.date ? '<p class="u-muted">' + (st.started ? 'Mulai ' + esc(st.started) : '') + (st.date ? ', selesai ' + esc(st.date) : '') + '</p>' : '') +
        '<label class="u-field"><span>Biaya sebenarnya (Rp)' + tipBtn('actual') + '</span><input inputmode="numeric" data-act="actual" value="' + esc(st.actual) + '" placeholder="contoh 150000"></label>' +
        '<label class="u-field"><span>Catatan' + tipBtn('note') + '</span><textarea data-act="note" placeholder="nomor antrean, nama petugas, dan lain-lain">' + esc(st.note) + '</textarea></label>' +
      '</div></div></li>'
  }

  function render() {
    var open = {}; document.querySelectorAll('.u-step.open').forEach(function (e) { open[e.dataset.id] = 1 })
    // PRD-59B §9 / 59A: every phase at a glance, x of y done, a link to it
    $('pmap').innerHTML = D.phases.map(function (ph, i) {
      var p = F.progress(D.steps, saved, inPhase(ph.id)), k = p.done === p.n ? 'done' : p.done ? 'doing' : 'todo'
      return '<li data-k="' + k + '"><a href="#phase-' + ph.id + '"><span class="u-pmap-n">' + (i + 1) + '</span><span class="u-pmap-t">' + esc(ph.title.replace(/^\d+\.\s*/, '')) + '</span><span class="u-muted u-small">' + p.done + ' dari ' + p.n + '</span><span class="u-progress"><i style="--p:' + (p.n ? p.done / p.n : 0) + '"></i></span></a></li>'
    }).join('')
    $('phases').innerHTML = D.phases.map(function (ph) {
      var p = F.progress(D.steps, saved, inPhase(ph.id)), m = F.money(D.steps, saved, fx(), inPhase(ph.id))
      var list = D.steps.filter(function (s) { return s.phase === ph.id && shown(s) })
      return '<section class="u-phase" id="phase-' + ph.id + '"><div class="u-phase-head"><h2>' + esc(ph.title) + '</h2>' +
        '<span class="u-muted">' + p.done + ' dari ' + p.n + ' selesai, ' + moneyText(m) + '</span></div>' +
        '<span class="u-progress"><i style="--p:' + (p.n ? p.done / p.n : 0) + '"></i></span>' +
        (ph.intro ? '<p class="u-muted u-sec-sm">' + esc(ph.intro) + '</p>' : '') +
        (list.length ? '<ol class="u-steps">' + list.map(stepHtml).join('') + '</ol>' : '<p class="u-muted u-sec-sm">Tidak ada langkah dengan saringan ini.</p>') + '</section>'
    }).join('')
    Object.keys(open).forEach(function (id) { setOpen($('step-' + id), true) })
    document.querySelectorAll('[data-act="filter"]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === (saved.filter || 'all'))) })
    renderSummary()
  }
  function setOpen(li, on) { if (!li) return; li.classList.toggle('open', on); li.querySelector('.u-step-head').setAttribute('aria-expanded', String(on)) }

  var toastT
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show') }, 2600) }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b || b.tagName === 'INPUT' || b.tagName === 'TEXTAREA') return
    var li = b.closest('.u-step'), id = li && li.dataset.id, a = b.dataset.act
    if (a === 'tip') { e.preventDefault(); showTip(TIP[b.dataset.k][0], TIP[b.dataset.k][1], b) }
    else if (a === 'term') { var g = GLOSS.filter(function (x) { return x.term === b.dataset.term })[0]; if (g) showTip(g.term, g.tip, b) }
    else if (a === 'tipclose') { var bx = $('u-tipbox'); if (bx.hidePopover) bx.hidePopover(); else bx.classList.remove('show'); if (bx._from) bx._from.focus({ preventScroll: true }) }
    else if (a === 'toggle') setOpen(li, !li.classList.contains('open'))
    else if (a === 'status') { update(id, { status: b.dataset.v }); render(); toast('Tersimpan: ' + STATUS[b.dataset.v]) }
    else if (a === 'filter') { saved.filter = b.dataset.v; persist(); render() }
    else if (a === 'goto') {
      if (saved.filter && saved.filter !== 'all') { saved.filter = 'all'; persist(); render() }
      var el = $('step-' + b.dataset.id); setOpen(el, true); el.scrollIntoView({ block: 'start' }); el.querySelector('.u-step-head').focus({ preventScroll: true })
    }
  })
  document.addEventListener('change', function (e) {
    var el = e.target, li = el.closest('.u-step')
    if (!li || el.dataset.act !== 'item') return
    update(li.dataset.id, { item: el.dataset.item, on: el.checked }); render(); toast('Tersimpan')
  })
  document.addEventListener('input', function (e) {
    var el = e.target, li = el.closest('.u-step'); if (!li || (el.dataset.act !== 'actual' && el.dataset.act !== 'note')) return
    var patch = {}; patch[el.dataset.act] = el.value; update(li.dataset.id, patch)
    if (el.dataset.act === 'actual') renderSummary()
  })
  $('fx').addEventListener('change', function () { var v = Number(String(this.value).replace(',', '.')); saved.fx = v > 0 ? v : null; persist(); render(); toast('Kurs disimpan') })
  $('btn-backup').addEventListener('click', function () { UAEStore.backup(KEY, 'relokasi-dokumen'); toast('Cadangan diunduh') })
  $('btn-restore').addEventListener('click', function () { $('file-restore').click() })
  $('file-restore').addEventListener('change', function () {
    UAEStore.restore(KEY, 'relokasi-dokumen', this.files[0]).then(function (d) { saved = F.migrate(d); render(); toast('Cadangan dipulihkan') }, toast)
    this.value = ''
  })
  $('btn-print').addEventListener('click', function () { window.print() })
  $('btn-open-all').addEventListener('click', function () {
    var all = document.querySelectorAll('.u-step'), anyClosed = [].some.call(all, function (e) { return !e.classList.contains('open') })
    all.forEach(function (e) { setOpen(e, anyClosed) })
    this.textContent = anyClosed ? 'Tutup semua' : 'Buka semua'
  })
  $('checked').textContent = D.checked
  var problems = F.validate(D); if (problems.length && window.console) console.warn('UAEDocs data:', problems)
  render()
  // PRD-59 §6: the tracker links here as #step-<id>; open that step (clear a filter that hides it) and bring it into view
  function openHash() {
    var m = /^#step-([\w-]+)$/.exec(location.hash); if (!m || !D.steps.some(function (s) { return s.id === m[1] })) return
    if (!$('step-' + m[1])) { saved.filter = 'all'; persist(); render() }
    var li = $('step-' + m[1]); setOpen(li, true); li.scrollIntoView({ block: 'start' })
  }
  openHash(); window.addEventListener('hashchange', openHash)
  window.__uaeDocs = { render: render, state: function () { return saved }, progress: function () { return F.progress(D.steps, saved) }, money: function () { return F.money(D.steps, saved, fx()) } }
})()
