/**
 * LearningLog — what each child answered, right or wrong, across games. Listens to DuniaBus 'answer' events and
 * keeps one record per child (avatar-scoped through save-engine: 'dunia-avatar-<slug>-learn-log'; with no avatar
 * chosen, the global 'dunia-learn-log').
 *
 * Stored shape (small on purpose: localStorage, offline, a tablet):
 *   { v: 1,
 *     days:   { 'YYYY-MM-DD': { '<game>|<domain>|<skill>': [answered, rightFirstTry, msTotal, msCount] } },
 *     recent: [[t, game, domain, skill, item, ok, tries, ms], ...]   last RECENT_MAX answers, newest last }
 * Days older than KEEP_DAYS are dropped on write.
 *
 *   LearningLog.summary({ days: 7 }) -> [{ game, domain, skill, n, ok, rate, avgMs }] (most answered first)
 *   LearningLog.recent(n)            -> last n answers as objects
 *   LearningLog.record(ev)           -> stores one answer (what the bus listener calls)
 *
 * The avatar is read when each answer is stored. Pages that lock the avatar session (lockGameAvatarSession) keep
 * writing to the child who started the page. Nothing here ever throws into a game.
 *
 * Created 2026-11-10 (docs/PRODUCT-ASSESSMENT-2026-11-10.md, idea #9).
 */
(function () {
  'use strict'
  var W = window
  if (W.LearningLog) return
  var KEY = 'dunia-learn-log', KEEP_DAYS = 90, RECENT_MAX = 100

  function read () {
    try {
      var raw = W.avatarScopedGet ? W.avatarScopedGet(KEY) : localStorage.getItem(KEY)
      var d = JSON.parse(raw || 'null')
      if (d && d.v === 1 && d.days && typeof d.days === 'object' && Array.isArray(d.recent)) return d
    } catch (e) {}
    return { v: 1, days: {}, recent: [] }
  }
  function write (d) {
    var s = JSON.stringify(d)
    try { if (W.avatarScopedSet) W.avatarScopedSet(KEY, s); else localStorage.setItem(KEY, s) } catch (e) {}
  }
  function dayOf (t) {
    var x = new Date(t)
    return x.getFullYear() + '-' + ('0' + (x.getMonth() + 1)).slice(-2) + '-' + ('0' + x.getDate()).slice(-2)
  }
  function clean (v, n) { return v == null ? '' : String(v).slice(0, n || 40) }

  function record (ev) {
    if (!ev || typeof ev.ok !== 'boolean') return false
    try {
      var d = read(), t = +ev.t || Date.now(), day = dayOf(t)
      var game = clean(ev.game, 30), domain = clean(ev.domain, 20), skill = clean(ev.skill, 40)
      var ms = typeof ev.ms === 'number' && isFinite(ev.ms) && ev.ms >= 0 ? Math.round(ev.ms) : null
      var k = game + '|' + domain + '|' + skill
      var row = (d.days[day] = d.days[day] || {})[k] = d.days[day][k] || [0, 0, 0, 0]
      row[0]++; if (ev.ok) row[1]++
      if (ms !== null) { row[2] += ms; row[3]++ }
      d.recent.push([t, game, domain, skill, clean(ev.item, 60), ev.ok, +ev.tries || 1, ms, clean(ev.hint, 20) || null])
      if (d.recent.length > RECENT_MAX) d.recent = d.recent.slice(-RECENT_MAX)
      var cut = dayOf(t - KEEP_DAYS * 864e5)
      Object.keys(d.days).forEach(function (x) { if (x < cut) delete d.days[x] })
      write(d)
      return true
    } catch (e) { return false }
  }

  function summary (opts) {
    var days = (opts && opts.days) || 7, cut = dayOf(Date.now() - (days - 1) * 864e5), d = read(), acc = {}
    Object.keys(d.days).forEach(function (day) {
      if (day < cut) return
      var rows = d.days[day]
      Object.keys(rows).forEach(function (k) {
        var a = acc[k] = acc[k] || [0, 0, 0, 0], r = rows[k]
        for (var i = 0; i < 4; i++) a[i] += r[i]
      })
    })
    return Object.keys(acc).map(function (k) {
      var p = k.split('|'), a = acc[k]
      return { game: p[0], domain: p[1], skill: p[2], n: a[0], ok: a[1], rate: a[0] ? a[1] / a[0] : 0, avgMs: a[3] ? Math.round(a[2] / a[3]) : null }
    }).sort(function (x, y) { return y.n - x.n })
  }

  function recent (n) {
    return read().recent.slice(-(n || 20)).map(function (r) {
      return { t: r[0], game: r[1], domain: r[2], skill: r[3], item: r[4], ok: r[5], tries: r[6], ms: r[7], hint: r[8] || null }
    })
  }

  /* ── for parents: one row per skill a parent recognises, across games ──────────────────────────────────────
     A recorded skill is game-specific ('tambah-standard' in Kuis, 'add-medium-d0' in Ayo Berhitung, 'add' in a
     TKQuiz question); its first part names the skill. Unknown skills fall back to their domain's name. */
  var SKILL = {
    add: 'Penjumlahan', tambah: 'Penjumlahan', sub: 'Pengurangan', kurang: 'Pengurangan', subtract: 'Pengurangan',
    multiply: 'Perkalian', kali: 'Perkalian', groups: 'Perkalian', divide: 'Pembagian', bagi: 'Pembagian', share: 'Pembagian',
    count: 'Menghitung benda', clock: 'Membaca jam', diff: 'Selisih', twostep: 'Soal cerita dua langkah',
    plus: 'Penjumlahan', join: 'Penjumlahan', minus: 'Pengurangan', compare: 'Membandingkan', max: 'Membandingkan', min: 'Membandingkan',
    pattern: 'Pola', series: 'Pola', shape: 'Bentuk', awal: 'Huruf awal', susun: 'Menyusun kata', gambar: 'Kata dan gambar', pasang: 'Kegunaan alat'
  }
  var DOMAIN = {
    matematika: 'Matematika', islam: 'Pengetahuan Islam', arab: 'Huruf Arab', umum: 'Pengetahuan umum',
    logika: 'Logika', bahasa: 'Bahasa', inggris: 'Bahasa Inggris', bentuk: 'Bentuk', emosi: 'Mengenal perasaan'
  }
  function label (skill, domain) {
    var head = String(skill || '').split('-')[0]
    return SKILL[head] || DOMAIN[domain] || DOMAIN[head] || (domain ? String(domain) : 'Lainnya')
  }
  // status rule (shown to the parent with the numbers, never instead of them)
  function status (n, ok) {
    if (n < 5) return 'baru'
    var r = ok / n
    return r >= 0.8 ? 'bisa' : r < 0.5 ? 'sulit' : 'berkembang'
  }
  function bySkill (opts) {
    var acc = {}
    summary(opts).forEach(function (row) {
      var k = label(row.skill, row.domain), a = acc[k] = acc[k] || { skill: k, n: 0, ok: 0, games: {} }
      a.n += row.n; a.ok += row.ok; a.games[row.game] = 1
    })
    return Object.keys(acc).map(function (k) {
      var a = acc[k]
      return { skill: a.skill, n: a.n, ok: a.ok, rate: a.n ? a.ok / a.n : 0, status: status(a.n, a.ok), games: Object.keys(a.games) }
    }).sort(function (x, y) { return y.n - x.n })
  }

  W.LearningLog = { record: record, summary: summary, recent: recent, bySkill: bySkill, label: label, KEY: KEY }
  if (W.DuniaBus) W.DuniaBus.on('answer', record)
})()
