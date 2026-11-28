/* PRD-59B §3 the Abu Dhabi driving theory page. Bank: uae-sim-bank.js (UAESim). Engines: uae-quiz.js (UAEQuiz),
   uae-flow.js (UAEFlow, licence steps). Signs: uae-signs.js. Saving: key 'dunia-uae-sim-v1', PRD-59B §4.3. */
(function () {
  'use strict'
  var B = window.UAESim, Q = window.UAEQuiz, F = window.UAEFlow, KEY = UAEStore.KEYS.sim
  var saved = Q.migrate(UAEStore.read(KEY, {}))
  saved.process = saved.process || { steps: {} }
  var $ = function (id) { return document.getElementById(id) }
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] }) }
  var STAGE = { baru: 'Baru', belajar: 'Belajar', dikuasai: 'Dikuasai' }, STATUS = { todo: 'Belum', doing: 'Sedang', done: 'Selesai' }
  var byId = {}; B.questions.forEach(function (q) { byId[q.id] = q })
  function persist() { UAEStore.write(KEY, saved) }
  function en() { return saved.lang === 'en' }
  function show(v) { ['v-home', 'v-quiz', 'v-result', 'v-process', 'v-signs'].forEach(function (x) { $(x).hidden = x !== v }); window.scrollTo(0, 0) }
  function topicTitle(id) { var t = B.topics.filter(function (x) { return x.id === id })[0]; return t ? t.title : id }
  function bi(o) { return en() ? esc(o.en) : esc(o.id) + '<span class="u-en" lang="en">' + esc(o.en) + '</span>' }
  function rp(n) { return 'Rp ' + Math.round(n).toLocaleString('id-ID') }

  // ---------- home ----------
  function renderHome() {
    $('q-timer').hidden = true
    $('lang-iden').setAttribute('aria-pressed', String(!en())); $('lang-en').setAttribute('aria-pressed', String(en()))
    var f = B.format
    $('exam-desc').textContent = f.count + ' soal, ' + f.minutes + ' menit, lulus bila benar ' + f.pass + ' atau lebih.'
    $('exam-src').innerHTML = f.verified ? 'Format ujian dari <a href="' + esc(f.source) + '" target="_blank" rel="noopener">sumber ini</a>, dicek ' + esc(f.asOf) + '.' : 'Perkiraan format: ' + esc(f.note || '')
    var r = Q.readiness(B, saved), h = saved.history
    $('ready-pct').textContent = Math.round(r.pct * 100) + '%'
    $('ready-bar').style.setProperty('--p', r.pct)
    $('ready-text').textContent = r.ready ? 'Siap ujian: 3 ujian terakhir lulus dan semua topik di atas 60 persen.' : !h.length && !Object.keys(saved.q || {}).length ? 'Mulai dari latihan per topik, lalu ujian simulasi.' : 'Perlu latihan: ' + r.weakestTitle + '.'
    $('topics').innerHTML = B.topics.map(function (t) {
      var s = Q.topicState(B, saved, t.id)
      return '<button type="button" class="u-btn u-topic" data-act="topic" data-topic="' + t.id + '"><span class="u-topic-main"><span>' + esc(t.title) + '</span><span class="u-tag u-stage-' + s.stage + '">' + STAGE[s.stage] + '</span></span>' +
        '<span class="u-muted u-small">dikuasai ' + s.mastered + ' dari ' + s.n + (s.pct == null ? '' : ', ' + Math.round(s.pct * 100) + '% benar') + '</span><span class="u-progress"><i style="--p:' + (s.n ? s.mastered / s.n : 0) + '"></i></span></button>'
    }).join('')
    var wrong = Q.wrongList(B, saved)
    $('btn-wrong').disabled = !wrong.length
    $('btn-wrong').textContent = 'Ulang soal yang salah (' + wrong.length + ')'
    var pp = F.progress(B.process.steps, saved.process)
    $('proc-stat').textContent = pp.done + ' dari ' + pp.n + ' langkah selesai'
    renderJourney(r)
    var hh = h.slice(-8).reverse()
    $('hist').innerHTML = hh.length ? '<table class="u-hist"><thead><tr><th>Tanggal</th><th>Nilai</th><th>Hasil</th></tr></thead><tbody>' + hh.map(function (x) {
      return '<tr><td>' + esc(x.date) + '</td><td>' + x.score + ' / ' + x.total + '</td><td>' + (x.pass ? 'Lulus' : 'Belum lulus') + '</td></tr>'
    }).join('') + '</tbody></table>' : '<p class="u-muted">Belum ada ujian simulasi.</p>'
    show('v-home')
  }

  // PRD-59B §9 the whole journey on one screen: stages, steps with status, exam categories with their level
  function renderJourney(r) {
    var P = B.process, steps = P.steps, num = {}, byStep = {}
    steps.forEach(function (s, i) { num[s.id] = i + 1; byStep[s.id] = s })
    var pp = F.progress(steps, saved.process), nx = F.next(steps, saved.process)
    $('journey-sum').textContent = pp.done + ' dari ' + pp.n + ' langkah selesai, kesiapan ujian teori ' + Math.round(r.pct * 100) + ' persen.' + (nx ? ' Berikutnya: langkah ' + num[nx] + ', ' + byStep[nx].title + '.' : '')
    $('journey').innerHTML = (P.stages || []).map(function (g, gi) {
      var done = g.steps.filter(function (id) { return F.state(saved.process, id).status === 'done' }).length
      return '<li class="u-jstage" data-done="' + (done === g.steps.length) + '"><div class="u-jstage-head"><span class="u-jstage-n">Tahap ' + (gi + 1) + '</span><h3>' + esc(g.title) + '</h3><span class="u-muted u-small">' + done + ' dari ' + g.steps.length + ' selesai</span></div>' +
        '<span class="u-progress"><i style="--p:' + (done / g.steps.length) + '"></i></span><ol class="u-jsteps">' + g.steps.map(function (id) {
          var s = byStep[id], st = F.state(saved.process, id).status, wait = st !== 'done' && F.blockedBy(steps, saved.process, id).length
          var k = st === 'done' ? 'done' : st === 'doing' ? 'doing' : wait ? 'wait' : 'todo', lab = { done: 'Selesai', doing: 'Sedang', wait: 'Menunggu', todo: 'Belum' }[k]
          var cats = id === 'theory' ? '<ul class="u-jcats" aria-label="Kategori ujian teori">' + B.topics.map(function (t) {
            var ts = Q.topicState(B, saved, t.id)
            return '<li><button type="button" class="u-jcat" data-act="topic" data-topic="' + t.id + '"><span>' + esc(t.title) + '</span><span class="u-tag u-stage-' + ts.stage + '">' + STAGE[ts.stage] + '</span><span class="u-progress"><i style="--p:' + (ts.n ? ts.mastered / ts.n : 0) + '"></i></span></button></li>'
          }).join('') + '</ul>' : ''
          return '<li class="u-jstep' + (id === nx ? ' is-next' : '') + '" data-k="' + k + '"><button type="button" class="u-jstep-btn" data-act="pgo" data-id="' + id + '"><span class="u-jdot" aria-hidden="true">' + (k === 'done' ? '<svg class="u-icon" viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>' : num[id]) + '</span><span class="u-jstep-t">' + esc(s.title) + '</span><span class="u-tag u-jk-' + k + '">' + lab + '</span></button>' + cats + '</li>'
        }).join('') + '</ol></li>'
    }).join('')
  }

  // ---------- quiz ----------
  var run = null, tick = null, quitArmed = 0
  function start(kind, items) {
    run = { kind: kind, qs: items, i: 0, picks: [], t0: Date.now(), limit: kind === 'exam' ? B.format.minutes * 60 : 0 }
    clearInterval(tick); quitArmed = 0
    $('q-timer').hidden = !run.limit
    if (run.limit) { timer(); tick = setInterval(timer, 500) }
    show('v-quiz'); renderQ()
  }
  function practice(list) { var r = Q.rng(Date.now() & 0xffffffff); return list.map(function (q) { return { q: q, order: shuffle(q.opts.map(function (_, i) { return i }), r) } }).sort(function () { return r() - 0.5 }) }
  function shuffle(a, r) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t } return a }
  function timer() {
    var left = run.limit - Math.floor((Date.now() - run.t0) / 1000)
    if (left <= 0) { finish(); return }
    $('q-timer').textContent = 'Sisa ' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0')
  }
  function renderQ() {
    var item = run.qs[run.i], q = item.q, picked = run.picks[run.i], answered = picked != null && run.kind !== 'exam'
    $('q-count').textContent = 'Soal ' + (run.i + 1) + ' dari ' + run.qs.length + (run.kind === 'exam' ? ', terjawab ' + run.picks.filter(function (x) { return x != null }).length : '')
    $('q-topic').textContent = topicTitle(q.topic)
    $('q-text').innerHTML = en() ? esc(q.q.en) : esc(q.q.id) + '<span class="u-q-en" lang="en">' + esc(q.q.en) + '</span>'
    $('q-sign').innerHTML = q.sign ? UAESigns.show(q.sign, 'Rambu pada soal ini') : ''
    $('q-opts').innerHTML = item.order.map(function (oi, k) {
      var cls = 'u-opt'
      if (answered) { if (oi === q.a) cls += ' is-right'; else if (oi === picked) cls += ' is-wrong' }
      return '<button type="button" role="radio" class="' + cls + '" data-act="pick" data-oi="' + oi + '" aria-checked="' + (picked === oi) + '"' + (answered ? ' aria-disabled="true"' : '') + '><span class="u-k">' + 'ABCD'[k] + '</span><span>' + bi(q.opts[oi]) + '</span></button>'
    }).join('')
    var ex = $('q-explain')
    if (answered) {
      ex.hidden = false
      ex.innerHTML = '<p><b>' + (picked === q.a ? 'Benar.' : 'Belum tepat. Jawaban: ' + esc(en() ? q.opts[q.a].en : q.opts[q.a].id) + '.') + '</b></p><p>' + esc(en() ? q.ex.en : q.ex.id) + '</p>' +
        '<p class="u-muted u-small">' + (q.rule ? esc(q.rule) + '. ' : '') + 'Dasar: <a href="' + esc(q.src) + '" target="_blank" rel="noopener">sumber</a>, dicek ' + esc(q.asOf) + '.</p>'
    } else ex.hidden = true
    $('q-prev').disabled = run.i === 0
    $('q-next').textContent = run.i === run.qs.length - 1 ? (run.kind === 'exam' ? 'Kumpulkan' : 'Selesai') : 'Berikutnya'
    $('q-next').disabled = run.kind !== 'exam' && picked == null
    $('q-quit').textContent = 'Keluar'
  }
  function pick(oi) {
    if (run.kind !== 'exam' && run.picks[run.i] != null) return
    run.picks[run.i] = oi
    var q = run.qs[run.i].q
    if (run.kind !== 'exam') { saved = Q.record(saved, q.id, oi === q.a); persist() }
    renderQ()
  }
  function finish() {
    clearInterval(tick); $('q-timer').hidden = true
    var g = Q.grade(run, B.format), secs = Math.round((Date.now() - run.t0) / 1000)
    if (run.kind === 'exam') {
      run.qs.forEach(function (item, i) { saved = Q.record(saved, item.q.id, run.picks[i] === item.q.a) })
      saved.history = (saved.history || []).concat([{ date: new Date().toISOString().slice(0, 10), score: g.score, total: g.total, pass: g.pass, secs: secs, byTopic: g.byTopic }])
      persist()
    }
    $('r-score').textContent = g.score + ' / ' + g.total
    $('r-verdict').textContent = run.kind === 'exam' ? (g.pass ? 'Lulus simulasi.' : 'Belum lulus. Batas lulus ' + B.format.pass + ' dari ' + B.format.count + '.') : (g.pass ? 'Bagus, topik ini sudah kuat.' : 'Ulangi topik ini sekali lagi.')
    $('r-topics').innerHTML = Object.keys(g.byTopic).map(function (t) { var x = g.byTopic[t]; return '<tr><td>' + esc(topicTitle(t)) + '</td><td>' + x[0] + ' / ' + x[1] + '</td></tr>' }).join('')
    $('r-list').innerHTML = run.qs.map(function (item, i) {
      var q = item.q, p = run.picks[i]
      return p === q.a ? '' : '<div class="u-panel u-stack"><p><b>' + esc(en() ? q.q.en : q.q.id) + '</b></p>' + (q.sign ? UAESigns.show(q.sign) : '') + (p == null ? '<p class="u-wait">Tidak dijawab</p>' : '<p class="u-wait">Jawaban Anda: ' + esc(en() ? q.opts[p].en : q.opts[p].id) + '</p>') + '<p class="u-right-ans"><b>Jawaban benar: ' + esc(en() ? q.opts[q.a].en : q.opts[q.a].id) + '</b></p><p class="u-muted">' + esc(en() ? q.ex.en : q.ex.id) + '</p></div>'
    }).join('') || '<p class="u-muted">Semua benar.</p>'
    $('r-redo').disabled = !Q.wrongList(B, saved).length
    run = null
    show('v-result')
  }

  // ---------- licence steps (workflow engine, same as the document checklist) ----------
  function renderProcess(focus) {
    var P = B.process, steps = P.steps, fx = (window.UAEDocs && UAEDocs.fx.aedToIdr) || 4400
    var num = {}; steps.forEach(function (s, i) { num[s.id] = i + 1 })
    $('p-intro').textContent = P.intro
    var m = F.money(steps, saved.process, fx), pp = F.progress(steps, saved.process)
    var nx = F.next(steps, saved.process), nxs = steps.filter(function (s) { return s.id === nx })[0]
    $('p-sum').innerHTML = '<b>' + pp.done + ' dari ' + pp.n + ' langkah selesai.</b> Biaya sendiri sekitar ' + esc(rp(m.min)) + ' sampai ' + esc(rp(m.max)) + ' (kurs AED ' + fx.toLocaleString('id-ID') + ').' +
      (nxs ? '<br>Langkah berikutnya: <a href="#ps-' + nx + '">' + num[nx] + '. ' + esc(nxs.title) + '</a>' : '<br>Semua langkah selesai.')
    $('p-list').innerHTML = steps.map(function (s) {
      var st = F.state(saved.process, s.id), wait = F.blockedBy(steps, saved.process, s.id), c = s.cost || {}
      var btn = function (v) { return '<button type="button" class="u-chip" data-act="pstatus" data-id="' + s.id + '" data-v="' + v + '" aria-pressed="' + (st.status === v) + '">' + STATUS[v] + '</button>' }
      return '<li class="u-step open' + (s.id === nx ? ' is-next' : '') + '" id="ps-' + s.id + '" data-status="' + st.status + '"><div class="u-step-head u-static"><span class="u-num">' + num[s.id] + '</span><span><span class="u-step-title">' + esc(s.title) + '</span><br><span class="u-step-sub">' + esc(s.issuer || '') + '</span>' +
        (wait.length && st.status !== 'done' ? '<br><span class="u-wait">Tunggu langkah ' + wait.map(function (w) { return num[w] }).join(', ') + ' dulu</span>' : '') +
        '<span class="u-step-cost"><span class="u-money">' + (c.max ? (c.cur === 'AED' ? 'AED ' : 'Rp ') + c.min.toLocaleString('id-ID') + (c.min !== c.max ? ' sampai ' + c.max.toLocaleString('id-ID') : '') + (c.cur === 'AED' ? ' (sekitar ' + rp(c.min * fx) + (c.min !== c.max ? ' sampai ' + rp(c.max * fx) : '') + ')' : '') : 'Termasuk paket / gratis') + '</span>' + (c.est ? ' <span class="u-tag u-tag-est">perkiraan</span>' : '') + '</span></span></div>' +
        '<div class="u-step-body"><p>' + esc(s.why || '') + '</p>' + (s.bring && s.bring.length ? '<p class="u-small"><b>Bawa:</b> ' + s.bring.map(function (b) { return esc(b.text) }).join('; ') + '</p>' : '') +
        (s.notes ? '<p class="u-small u-muted">' + esc(s.notes) + '</p>' : '') +
        '<p class="u-small">' + (s.sources || []).map(function (u, i) { return '<a href="' + esc(u) + '" target="_blank" rel="noopener">sumber ' + (i + 1) + '</a>' }).join(', ') + (c.note ? ' <span class="u-muted">' + esc(c.note) + '</span>' : '') + '</p>' +
        '<div class="u-status u-sec-sm" role="group" aria-label="Status langkah ' + num[s.id] + '">' + btn('todo') + btn('doing') + btn('done') + '</div></div></li>'
    }).join('')
    $('p-notes').innerHTML = (P.notes || []).map(function (n) { return '<li>' + esc(n) + '</li>' }).join('')
    show('v-process')
    if (focus && $('ps-' + focus)) $('ps-' + focus).scrollIntoView({ block: 'start' })
  }
  // PRD-59B §8: real UAE artwork grouped like the sign manual, English name (as in the exam) + Indonesian, credit per file
  function renderSigns() {
    var R = window.UAESignsReal, C = window.UAESignCredits || {}, html = '', nav = []
    if (R) {
      Object.keys(R.groups).forEach(function (g) {
        var items = R.list.filter(function (x) { return x.group === g && C[x.code] })
        if (!items.length) return
        nav.push('<a class="u-chip" href="#sg-' + g + '">' + esc(R.groups[g]) + ' (' + items.length + ')</a>')
        html += '<h2 class="u-sec u-sg-h" id="sg-' + g + '">' + esc(R.groups[g]) + ' <span class="u-muted u-small">(' + items.length + ')</span></h2><div class="u-sign-grid">' + items.map(function (x) {
          var c = C[x.code]
          return '<figure>' + UAESigns.img(x.code, x.en) + '<figcaption><span lang="en">' + esc(x.en) + '</span><br><span class="u-muted">' + esc(x.id) + '</span>' +
            '<br><a class="u-credit" href="' + esc(c.page) + '" target="_blank" rel="noopener">' + esc(x.code.replace(/_/g, ' ')) + ', ' + esc(c.licence) + (/^cc by/i.test(c.licence) && c.artist ? ', ' + esc(c.artist) : '') + '</a></figcaption></figure>'
        }).join('') + '</div>'
      })
    }
    // a drawn stand-in is shown only when a question needs it (no free UAE file exists for it); the rest are not shown
    var used = {}; B.questions.forEach(function (q) { if (q.sign) used[q.sign] = 1 })
    var drawn = UAESigns.keys.filter(function (k) { return !UAESigns.realCode(k) && used[k] })
    if (drawn.length) html += '<h2 class="u-sec">Gambar ulang (belum ada berkas asli)</h2><div class="u-sign-grid">' + drawn.map(function (k) { return '<figure>' + UAESigns.svg(k) + '<figcaption><span lang="en">' + esc(UAESigns.label(k)) + '</span><br><span class="u-muted">' + esc(UAESigns.labelId(k)) + '</span></figcaption></figure>' }).join('') + '</div>'
    // a long gallery (125 signs): one row of links to each group, like the sections of the sign manual
    $('s-grid').innerHTML = (nav.length ? '<nav class="u-row u-sg-nav" aria-label="Kelompok rambu">' + nav.join('') + '</nav>' : '') + html
    show('v-signs')
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return
    var a = b.dataset.act
    if (a === 'topic') start('topic', practice(B.questions.filter(function (q) { return q.topic === b.dataset.topic })))
    else if (a === 'exam') start('exam', Q.exam(B, B.format))
    else if (a === 'wrong') start('wrong', practice(Q.wrongList(B, saved)))
    else if (a === 'pick') pick(Number(b.dataset.oi))
    else if (a === 'next') { if (run.i < run.qs.length - 1) { run.i++; renderQ() } else finish() }
    else if (a === 'prev') { if (run.i > 0) { run.i--; renderQ() } }
    else if (a === 'quit') {
      // an exam left half way is not counted; the first tap asks, the second leaves (no native confirm)
      if (run && run.kind === 'exam' && Date.now() - quitArmed > 3000) { quitArmed = Date.now(); b.textContent = 'Keluar? Ujian tidak dihitung'; return }
      clearInterval(tick); run = null; renderHome()
    }
    else if (a === 'home') { clearInterval(tick); run = null; renderHome() }
    else if (a === 'process') renderProcess()
    else if (a === 'pgo') renderProcess(b.dataset.id)
    else if (a === 'signs') renderSigns()
    else if (a === 'pstatus') { saved.process = F.apply(saved.process, b.dataset.id, { status: b.dataset.v }); persist(); renderProcess() }
    else if (a === 'lang') { saved.lang = b.dataset.v; persist(); if (run) renderQ(); else renderHome() }
    else if (a === 'backup') UAEStore.backup(KEY, 'latihan-sim')
    else if (a === 'restore') $('file-restore').click()
  })
  $('file-restore').addEventListener('change', function () {
    UAEStore.restore(KEY, 'latihan-sim', this.files[0]).then(function (d) { saved = Q.migrate(d); saved.process = saved.process || { steps: {} }; renderHome() }, function (m) { $('hist').insertAdjacentHTML('afterbegin', '<p class="u-note">' + esc(m) + '</p>') })
    this.value = ''
  })
  renderHome()
  // PRD-59 §6: the tracker links here as #ps-<id>
  var hm = /^#ps-([\w-]+)$/.exec(location.hash)
  if (hm && B.process.steps.some(function (s) { return s.id === hm[1] })) renderProcess(hm[1])
  window.__uaeSim = { state: function () { return saved }, run: function () { return run } }
})()
