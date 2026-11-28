/* PRD-59 §6 the relocation tracker on relokasi-uae.html: everything to prepare, from the saved state of both tools.
   Numbers come from the same engines the tools use (UAEFlow.progress / next / money); nothing is copied. */
(function () {
  'use strict'
  var F = window.UAEFlow, D = window.UAEDocs, S = window.UAESim, Q = window.UAEQuiz
  var $ = function (id) { return document.getElementById(id) }
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] }) }
  var rp = function (n) { return 'Rp ' + Math.round(n).toLocaleString('id-ID') }
  var bar = function (p) { return '<span class="u-progress"><i style="--p:' + p + '"></i></span>' }
  if (!F || !D || !S || !$('tracker')) return
  var docs = F.migrate(UAEStore.read(UAEStore.KEYS.docs, {}))
  var sim = Q.migrate(UAEStore.read(UAEStore.KEYS.sim, {})), simP = sim.process || { steps: {} }
  var fx = Number(docs.fx) > 0 ? Number(docs.fx) : D.fx.aedToIdr
  // PRD-59C/D: the family visa (built for the saved children) and the packing list count too
  var FM = window.UAEFamily, KP = window.UAEKoper
  var meta = UAEStore.read(UAEStore.KEYS.familyMeta, {})
  var fam = FM ? FM.build(Array.isArray(meta.kids) && meta.kids.length ? meta.kids : [{ name: 'Anak 1', stage: 'g2' }, { name: 'Anak 2', stage: 'g2' }]) : { steps: [], phases: [] }
  var famS = F.migrate(UAEStore.read(UAEStore.KEYS.family, {}))
  var kpGot = (UAEStore.read(UAEStore.KEYS.koper, {}) || {}).got || {}
  var kpAll = KP ? [].concat.apply([], KP.groups.map(function (g) { return g.items })).filter(function (x) { return x.loc !== 'jangan' }) : []
  var kpDone = kpAll.filter(function (x) { return kpGot[x.id] }).length
  var pd = F.progress(D.steps, docs), ps = F.progress(S.process.steps, simP), pf = F.progress(fam.steps, famS)
  var done = pd.done + ps.done + pf.done, n = pd.n + ps.n + pf.n
  var open = function (saved) { return function (s) { return F.state(saved, s.id).status !== 'done' } }
  var md = F.money(D.steps, docs, fx, open(docs)), ms = F.money(S.process.steps, simP, fx, open(simP)), mf = F.money(fam.steps, famS, fx, open(famS))
  var r = Q.readiness(S, sim)

  $('tr-total').textContent = Math.round(n ? done / n * 100 : 0) + '%'
  $('tr-total-bar').style.setProperty('--p', n ? done / n : 0)
  $('tr-total-text').textContent = done + ' dari ' + n + ' langkah selesai (' + pd.n + ' dokumen kerja, ' + pf.n + ' visa keluarga, ' + ps.n + ' SIM). Koper: ' + kpDone + ' dari ' + kpAll.length + ' barang siap.'

  function costText(c) {
    return !c.max ? 'Gratis atau termasuk paket' : (c.cur === 'AED' ? 'AED ' + c.min.toLocaleString('id-ID') + (c.min !== c.max ? '-' + c.max.toLocaleString('id-ID') : '') : rp(c.min) + (c.min !== c.max ? ' sampai ' + rp(c.max) : ''))
  }
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') }
  function fmt(iso) { return new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) }
  function range(a, b) { return a === b ? fmt(a) : fmt(a) + ' sampai ' + fmt(b) }

  // landing v2: the plan in one sentence, and "Mulai dari sini" = the open step that sets the departure date (the first
  // open step of the family critical path); once the family visa is done, the next work-document step, then SIM
  var pl = FM ? FM.plan(F, fam.steps, famS, meta.start || today(), today()) : null
  if (pl && $('hero-plan')) {
    $('hero-plan').innerHTML = pl.done ? 'Visa keluarga selesai. Lanjutkan dokumen kerja, koper, dan SIM di bawah.' :
      'Keluarga bisa berangkat sekitar <b>' + esc(range(pl.depart[0], pl.depart[1])) + '</b>. ' +
      (pl.late ? 'Bisa melewati target 90 hari (' + esc(fmt(pl.goal)) + '), kerjakan langkah di bawah lebih dulu.' : 'Target 90 hari: ' + esc(fmt(pl.goal)) + '.')
  }
  var lead = pl && pl.first ? { s: fam.steps.filter(function (x) { return x.id === pl.first })[0], href: 'visa-keluarga-uae.html#step-', why: 'Paling menentukan tanggal keluarga berangkat.' } : null
  if (!lead) {
    var nd0 = F.next(D.steps, docs), ns0 = F.next(S.process.steps, simP)
    if (nd0) lead = { s: D.steps.filter(function (x) { return x.id === nd0 })[0], href: 'pindah-abudhabi.html#step-', why: 'Langkah berikutnya untuk dokumen kerja.' }
    else if (ns0) lead = { s: S.process.steps.filter(function (x) { return x.id === ns0 })[0], href: 'ujian-sim-abudhabi.html#ps-', why: 'Langkah berikutnya untuk SIM.' }
  }
  if (lead && $('start')) {
    var ls = lead.s, w = ls.where || {}, dd = ls.days
    $('start-why').textContent = lead.why
    $('start-h').textContent = ls.title
    $('start-meta').textContent = [w.name || ls.issuer, (ls.cost && ls.cost.max ? costText(ls.cost) : 'gratis'), dd ? (dd.min === dd.max ? dd.min + ' hari' : dd.min + ' sampai ' + dd.max + ' hari') : ''].filter(Boolean).join(', ')
    $('start-go').href = lead.href + ls.id
    $('start').hidden = false
  }

  // what to do now: the next open step of each tool, opened directly
  var card = function (kind, steps, saved, id, href, num) {
    if (!id) return '<li class="u-tr-next"><span class="u-tr-kind">' + kind + '</span><b>Semua langkah selesai.</b></li>'
    var s = steps.filter(function (x) { return x.id === id })[0], c = s.cost || {}
    var cost = costText(c)
    var st = F.state(saved, id).status
    return '<li class="u-tr-next"><a href="' + href + '"><span class="u-tr-kind">' + kind + ', langkah ' + num + (st === 'doing' ? ', sedang dikerjakan' : '') + '</span>' +
      '<b>' + esc(s.title) + '</b><span class="u-muted u-small">' + esc(s.issuer || '') + '</span><span class="u-money u-small">' + esc(cost) + (s.payer === 'employer' ? ', dibayar pemberi kerja' : '') + '</span></a></li>'
  }
  var nd = F.next(D.steps, docs), ns = F.next(S.process.steps, simP), nf = (pl && pl.first) || F.next(fam.steps, famS)
  var idx = function (steps, id) { var i = 0; steps.some(function (s, k) { i = k; return s.id === id }); return i + 1 }
  $('tr-next').innerHTML = card('Dokumen', D.steps, docs, nd, 'pindah-abudhabi.html#step-' + nd, idx(D.steps, nd)) +
    card('Visa keluarga', fam.steps, famS, nf, 'visa-keluarga-uae.html#step-' + nf, idx(fam.steps, nf)) +
    card('SIM', S.process.steps, simP, ns, 'ujian-sim-abudhabi.html#ps-' + ns, idx(S.process.steps, ns))

  // the whole journey: 4 document phases, then 3 licence stages
  var rows = D.phases.map(function (ph) {
    var p = F.progress(D.steps, docs, function (s) { return s.phase === ph.id })
    var first = D.steps.filter(function (s) { return s.phase === ph.id })[0]
    return { href: 'pindah-abudhabi.html#step-' + first.id, kind: 'Dokumen', title: ph.title.replace(/^\d+\.\s*/, ''), done: p.done, n: p.n, doing: p.doing }
  }).concat(fam.phases.map(function (ph) {
    var inPh = function (s) { return s.phase === ph.id }, p = F.progress(fam.steps, famS, inPh), first = fam.steps.filter(inPh)[0]
    return { href: 'visa-keluarga-uae.html#step-' + (first ? first.id : ''), kind: 'Visa keluarga', title: ph.title, done: p.done, n: p.n, doing: p.doing }
  })).concat((S.process.stages || []).map(function (g) {
    var d = g.steps.filter(function (id) { return F.state(simP, id).status === 'done' }).length
    var g2 = g.steps.filter(function (id) { return F.state(simP, id).status === 'doing' }).length
    return { href: 'ujian-sim-abudhabi.html#ps-' + g.steps[0], kind: 'SIM', title: g.title, done: d, n: g.steps.length, doing: g2 }
  }))
  $('tr-journey').innerHTML = rows.map(function (x, i) {
    var k = x.done === x.n ? 'done' : x.done || x.doing ? 'doing' : 'todo'
    return '<li data-k="' + k + '"><a href="' + x.href + '"><span class="u-pmap-n">' + (i + 1) + '</span><span class="u-pmap-t">' + esc(x.title) + ' <span class="u-muted u-small">' + x.kind + '</span></span>' +
      '<span class="u-muted u-small">' + x.done + ' dari ' + x.n + '</span>' + bar(x.n ? x.done / x.n : 0) + '</a></li>'
  }).join('')

  // still to prepare: papers not ticked, own money still to set aside, theory readiness
  var left = pd.items.total - pd.items.checked + pf.items.total - pf.items.checked
  $('tr-left').innerHTML =
    '<li><b>' + left + '</b> dari ' + (pd.items.total + pf.items.total) + ' berkas (dokumen kerja dan visa keluarga) belum siap</li>' +
    '<li><b>' + (kpAll.length - kpDone) + '</b> dari ' + kpAll.length + ' barang koper belum siap</li>' +
    '<li>Biaya sendiri yang belum dibayar: <b class="u-money">' + rp(md.min + ms.min + mf.min) + ' sampai ' + rp(md.max + ms.max + mf.max) + '</b> <span class="u-muted u-small">(kurs AED ' + fx.toLocaleString('id-ID') + ')</span></li>' +
    '<li>Kesiapan ujian teori SIM: <b>' + Math.round(r.pct * 100) + '%</b>' + (r.ready ? ', siap' : r.weakestTitle && (sim.history || []).length + Object.keys(sim.q || {}).length ? ', perlu latihan ' + esc(r.weakestTitle) : '') + '</li>'
  window.__uaeTracker = { done: done, n: n, left: left, money: [md.min + ms.min + mf.min, md.max + ms.max + mf.max], next: [nd, ns, nf], lead: lead ? lead.s.id : null, late: pl ? pl.late : null, fam: pf.n, rows: rows.length, koper: [kpDone, kpAll.length] }
})()
