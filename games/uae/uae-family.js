/* PRD-59C §4 the family visa page extras: children, the timeline from UAEFlow.schedule (L21), open questions. */
(function () {
  'use strict'
  var C = window.UAEChecklist, D = C.data, F = window.UAEFlow, MK = UAEStore.KEYS.familyMeta
  var $ = function (id) { return document.getElementById(id) }
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] }) }
  var meta = Object.assign({}, C.meta, { kids: D.kids.map(function (k) { return { name: k.name, stage: k.stage } }) })
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') }
  function fmt(iso) { return new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) }
  function range(a, b) { return a === b ? fmt(a) : fmt(a) + ' sampai ' + fmt(b) }
  function saveMeta(reload) { UAEStore.write(MK, meta); if (reload) location.reload() }

  function renderKids() {
    $('kid-list').innerHTML = meta.kids.map(function (n, i) {
      var opts = UAEFamily.stages.map(function (st) { return '<option value="' + st.id + '"' + (st.id === n.stage ? ' selected' : '') + '>' + esc(st.title) + '</option>' }).join('')
      return '<li><label class="u-field">Nama anak ' + (i + 1) + '<input data-kid="' + i + '" value="' + esc(n.name) + '" maxlength="24" autocomplete="off"></label>' +
        '<label class="u-field">Sekolah di Abu Dhabi<select data-kid-stage="' + i + '">' + opts + '</select></label>' +
        (meta.kids.length > 1 ? '<button type="button" class="u-btn" data-kid-del="' + i + '">Hapus</button>' : '') + '</li>'
    }).join('')
    $('kid-add').disabled = meta.kids.length >= 6
  }
  $('kid-list').addEventListener('change', function (e) {
    var t = e.target, i = t.dataset.kid, j = t.dataset.kidStage
    if (j != null) { meta.kids[j] = Object.assign({}, meta.kids[j], { stage: t.value }); saveMeta(true); return }
    if (i == null) return
    var v = t.value.trim() || ('Anak ' + (Number(i) + 1)); if (v === meta.kids[i].name) return
    meta.kids[i] = Object.assign({}, meta.kids[i], { name: v }); saveMeta(true)
  })
  $('kid-list').addEventListener('click', function (e) {
    var i = e.target.dataset && e.target.dataset.kidDel; if (i == null) return
    meta.kids.splice(Number(i), 1); saveMeta(true)
  })
  $('kid-add').addEventListener('click', function () { meta.kids.push({ name: 'Anak ' + (meta.kids.length + 1), stage: 'g2' }); saveMeta(true) })

  function renderTimeline() {
    var saved = F.migrate(UAEStore.read(C.key, {})), start = meta.start || today()
    var pl = UAEFamily.plan(F, D.steps, saved, start, today()), r = pl.schedule, base = pl.anchor
    $('tl-start').value = start
    var by = {}; D.steps.forEach(function (s) { by[s.id] = s })
    $('tl-sum').innerHTML = pl.done ? 'Semua langkah visa keluarga sudah selesai.' :
      (base !== start ? 'Mulai mengurus sudah lewat, jadi langkah yang belum selesai dihitung dari hari ini. ' : '') +
      'Keluarga bisa berangkat sekitar <b>' + esc(range(pl.depart[0], pl.depart[1])) + '</b>. ' +
      'Semua selesai (izin tinggal dan sekolah) <b>' + esc(range(pl.finish[0], pl.finish[1])) + '</b>, ' + r.total[0] + ' sampai ' + r.total[1] + ' hari lagi. ' +
      (pl.late ? '<span class="u-wait">Bisa melewati target 90 hari (' + esc(fmt(pl.goal)) + '); kerjakan jalur terpanjang lebih dulu.</span>' : 'Masih di dalam target 90 hari (' + esc(fmt(pl.goal)) + ').')
    $('tl-list').innerHTML = r.critical.map(function (id) {
      var s = by[id], x = r.steps[id], done = F.state(saved, id).status === 'done'
      return '<li data-k="' + (done ? 'done' : 'todo') + '"><a href="#step-' + esc(id) + '" data-act="goto" data-id="' + esc(id) + '"><span class="u-tl-t">' + esc(s.title) + '</span>' +
        '<span class="u-muted u-small">' + (done ? 'Selesai' : esc(range(F.addDays(base, x.start[0]), F.addDays(base, x.end[1])))) + '</span></a></li>'
    }).join('')
    $('tl-lanes').innerHTML = D.phases.map(function (ph) {
      var ends = D.steps.filter(function (s) { return s.phase === ph.id }).map(function (s) { return r.steps[s.id].end })
      var e = ends.reduce(function (m, v) { return [Math.max(m[0], v[0]), Math.max(m[1], v[1])] }, [0, 0])
      return '<li><span>' + esc(ph.title) + '</span><span class="u-muted">' + esc(range(F.addDays(base, e[0]), F.addDays(base, e[1]))) + '</span></li>'
    }).join('')
    window.__uaeFamily = { anchor: base, late: pl.late, first: pl.first, total: r.total, critical: r.critical, kids: meta.kids.map(function (k) { return k.name + ':' + k.stage }), steps: D.steps.length, unknown: r.unknown }
  }
  $('tl-start').addEventListener('change', function () { if (this.value) { meta.start = this.value; saveMeta(false); renderTimeline() } })
  document.addEventListener('uae-saved', renderTimeline)

  $('conf').innerHTML = D.conflicts.map(function (t) { return '<li>' + esc(t) + '</li>' }).join('')
  renderKids(); renderTimeline()
})()
