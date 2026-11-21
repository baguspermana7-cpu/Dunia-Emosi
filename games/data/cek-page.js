/* cek-page — PRD-53 "Cek Kemampuan" controller (games/cek-kemampuan.html): name, map, intro, item flow, pause,
 * saving, Perkiraan IQ, Papan Juara Otak. Items come from CekPola / CekBentuk / CekKata (ladder islands, here) and
 * CekPlay (Ingat, Cepat, Angka flows). Saved per child under avatarScoped 'cek-kemampuan' =
 *   { res: { isle: [prev, last] }, stars: { isle: best }, best: { iq, islands, at }, pause: {...} }
 * Scored items give NO right/wrong feedback (standard test practice, so the estimate stays honest): only a neutral
 * tap sound, the progress trail and owl cheers that never depend on the answer. Practice items and the end of an
 * island get the full effects (sparkles, cues, celebration).
 */
;(function (W) {
  'use strict'
  var D = W.document, $ = function (id) { return D.getElementById(id) }
  var C = W.CekCore, U = W.CekUI, KEY = 'cek-kemampuan', DAY = 864e5
  var INFO = {
    pola: { planMs: 36e4, text: 'Ada kotak kosong. Pilih gambar yang paling cocok untuk kotak kosong itu.' },
    bentuk: { planMs: 36e4, text: 'Cari bentuk yang sama, hanya diputar. Lalu ketuk ubin sampai sama dengan contoh.' },
    ingat: { planMs: 36e4, text: 'Lihat gambar satu per satu, lalu ketuk dengan urutan yang sama.' },
    kata: { planMs: 3e5, text: 'Dengarkan katanya, lalu ketuk gambar yang benar. Nanti cari gambar yang satu kelompok.' },
    cepat: { planMs: 15e4, text: 'Dua gambar ini sama atau beda? Jawab secepat yang kamu bisa!' },
    angka: { planMs: 42e4, text: 'Mana yang lebih banyak? Di mana letak angkanya? Lalu soal cerita.' }
  }
  var st = null, item = null, shownAt = 0, lock = false, timers = [], spoke = false, sitting = 0, rested = false

  // ---------- storage ----------
  function load () { try { return JSON.parse(W.avatarScopedGet(KEY) || '{}') || {} } catch (_) { return {} } }
  function save (d) { try { W.avatarScopedSet(KEY, JSON.stringify(d)) } catch (_) {} }
  function last (d, id) { var r = d.res && d.res[id]; return r && r.length ? r[r.length - 1] : null }
  function months () { try { return W.CekProfile.months(W.DuniaProfile ? W.DuniaProfile.age() : '7-8') } catch (_) { return 90 } }
  function bestOf (d) { return d && d.best ? d.best : null }
  function zs (d) { var o = {}; U.ORDER.forEach(function (id) { o[id] = W.CekProfile.z(id, last(d, id), months()) }); return o }
  function counted (d) { var o = {}; U.ORDER.forEach(function (id) { if (d.count && d.count[id]) o[id] = [d.count[id]] }); return o }
  function starTotal (d) { return U.ORDER.reduce(function (a, id) { return a + ((d.stars && d.stars[id]) || 0) }, 0) }

  // ---------- helpers ----------
  var SCREENS = ['s-name', 's-map', 's-intro', 's-play', 's-done', 's-iq', 's-board']
  function show (id) { SCREENS.forEach(function (s) { $(s).classList.toggle('on', s === id) }); W.scrollTo(0, 0) }
  function later (fn, ms) { timers.push(setTimeout(fn, ms)) }
  function clearTimers () { timers.forEach(clearTimeout); timers = [] }
  function hint (t) { $('hint').textContent = t || '' }
  function trail (done, max) {
    var t = $('trail'); t.className = 'trail'
    t.innerHTML = Array.apply(null, Array(Math.min(24, max))).map(function (_, i) { return '<i' + (i < done ? ' class="on"' : '') + '></i>' }).join('')
  }

  // ---------- name, map, intro ----------
  function start () {
    var who = U.me()
    if (!who) { $('top').hidden = true; show('s-name'); U.say('Halo! Siapa namamu?'); return }
    home()
  }
  function saveName () {
    var n = W.CekBoard.cleanName($('name-in').value)
    if (!n) { $('name-in').classList.remove('shake'); void $('name-in').offsetWidth; $('name-in').classList.add('shake'); $('name-in').focus(); return }
    try { localStorage.setItem('cek-nama', n) } catch (_) {}
    U.sfx('star'); home()
  }
  function home () {
    clearTimers(); st = null; item = null
    var d = load(), who = U.me(), done = U.ORDER.filter(function (id) { return last(d, id) })
    var best = {}; done.forEach(function (id) { best[id] = { stars: (d.stars && d.stars[id]) || 1 } })
    U.topBar(who, starTotal(d)); U.map(best, intro)
    var nm = who ? who.name : 'Kawan', next = U.ORDER.filter(function (id) { return !best[id] })[0]
    var rest = sitting >= 2 && next && !rested
    U.guide(!done.length ? 'Halo, ' + nm + '! Aku Profesor Owi. Ayo jelajahi 6 pulau otak. Ketuk pulau yang bergoyang!'
      : !next ? 'Semua pulau selesai, ' + nm + '! Lihat Perkiraan IQ-mu.'
        : rest ? 'Hebat, ' + sitting + ' pulau hari ini! Istirahat dulu, lanjut nanti ya.'
          : done.length + ' pulau selesai. Ayo ke ' + U.ISLES[next].name + '!', !spoke || rest)
    spoke = true; if (rest) rested = true
    $('btn-iq').innerHTML = '<img alt="" src="' + U.sprite('badge', 'trophy') + '">Perkiraan IQ'
    show('s-map')
  }
  function intro (id) {
    var d = load(), p0 = d.pause && d.pause[id], p = p0 && Date.now() - p0.at < DAY ? p0 : null
    var c = d.count && d.count[id], all6 = U.ORDER.every(function (k) { return d.count && d.count[k] }), wait = c && W.CekProfile.reliable(c) && (!all6 || Date.now() - c.at < 7 * DAY)
    var when = c ? new Date(all6 ? c.at + 7 * DAY : Date.now()).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' }) : ''
    $('intro-art').src = U.isleArt(id); $('t-intro').textContent = U.ISLES[id].name
    $('intro-text').textContent = INFO[id].text + (wait ? (all6 ? ' Main lagi boleh! Papan juara pulau ini bisa naik mulai ' + when + '.' : ' Main lagi boleh! Papan juara memakai hasil pertamamu sampai 6 pulau selesai.') : '')
    $('btn-start').textContent = p ? 'Lanjutkan' : last(d, id) ? 'Main lagi' : 'Mulai'
    $('btn-listen').onclick = function () { U.say(INFO[id].text) }
    $('btn-start').onclick = function () { begin(id, p) }
    show('s-intro'); U.say(U.ISLES[id].name + '. ' + INFO[id].text)
  }

  // ---------- session ----------
  function seed0 () { var q = /[?&]seed=(\d+)/.exec(location.search); return q ? +q[1] : (Date.now() % 1e6) }
  var MAX = function (id) { return id === 'pola' ? W.CekPola.MAX : id === 'bentuk' ? W.CekBentuk.MAX : W.CekKata.MAX }
  function begin (id, p) {
    var d = load()
    if (p) { st = p.st; delete d.pause[id]; save(d) } else {
      st = { isle: id, seed: seed0(), ms: [], active: 0, n: 0 }
      if (W.CekPlay.has(id)) W.CekPlay.init(id, st)
      else st.sess = C.ladder({ practice: 2, max: MAX(id), stopAfter: C.STOP_AFTER })
    }
    st.seg = Date.now()
    try { if (W.DuniaLevel) W.DuniaLevel.start('cek-' + id, 1) } catch (_) {}
    $('play-tag').textContent = U.ISLES[id].name
    show('s-play'); next()
  }
  function pause () {
    clearTimers(); if (!st) return home()
    if (st.isle !== 'cepat') { st.active += Date.now() - st.seg; var d = load(); d.pause = (d.pause && !d.pause.isle) ? d.pause : {}; d.pause[st.isle] = { at: Date.now(), st: st }; save(d) }
    home()
  }
  function finish (rec) {
    clearTimers(); st.active += Date.now() - st.seg
    var id = st.isle
    rec.at = Date.now(); rec.ms = st.ms; rec.durMs = st.active; rec.planMs = INFO[id].planMs
    // per-answer time means "guessing" only on one-tap items; Ingat times per element and Cepat is meant to be fast
    rec.flags = W.CekProfile.flags(id === 'ingat' || id === 'cepat' ? Object.assign({}, rec, { ms: [] }) : rec)
    var d = load(); d.res = d.res || {}; d.res[id] = (d.res[id] || []).slice(-1).concat([rec]); if (d.pause && d.pause[id]) delete d.pause[id]
    var z = W.CekProfile.z(id, rec, months()), stars = W.CekProfile.stars(z), sure = W.CekProfile.reliable(rec)
    d.stars = d.stars || {}; d.stars[id] = Math.max(d.stars[id] || 0, stars)
    // the board counts each island's first reliable finish; once all 6 are done, a redo 7+ days later may replace it
    d.count = d.count || {}
    var cur = d.count[id], all6 = U.ORDER.every(function (k) { return d.count[k] })
    if (!cur || !W.CekProfile.reliable(cur) || (all6 && rec.at - cur.at >= 7 * DAY)) d.count[id] = rec
    var est = W.CekProfile.iq(d.res, months()), bEst = W.CekProfile.iq(counted(d), months()), who = U.me(), newBest = false
    if (bEst && (!d.best || W.CekBoard.encode(bEst.iq, bEst.islands) > W.CekBoard.encode(d.best.iq, d.best.islands))) { d.best = { iq: bEst.iq, islands: bEst.islands, at: Date.now() }; newBest = true }
    save(d); sitting++
    try { if (W.DuniaLevel) W.DuniaLevel.end('cek-' + id, 1, true, stars) } catch (_) {}
    if (newBest && who) W.CekBoard.submit(who.name, who.avatar, d.best.iq, d.best.islands)
    U.result(id, stars, W.CekProfile.points(rec), !sure ? 'Pelan-pelan ya, coba lagi besok. Pulau ini belum dihitung.' : U.ISLES[id].name + ' selesai!' + (est ? ' Perkiraan IQ-mu sudah ada.' : ''))
    U.say(!sure ? 'Wah, cepat sekali! Pelan-pelan ya, coba lagi besok.' : (stars >= 3 ? 'Luar biasa! ' : 'Hebat! ') + U.ISLES[id].name + ' selesai.')
    $('btn-home').textContent = est ? 'Lihat Perkiraan IQ' : 'Kembali ke peta'
    $('btn-home').onclick = est ? iq : home
    show('s-done'); st = null
  }

  // ---------- ladder islands: Pola, Bentuk, Kata ----------
  function next () {
    lock = false; hint(''); $('stage').innerHTML = ''
    if (W.CekPlay.has(st.isle)) return W.CekPlay.next(st.isle, api)
    var s = st.sess
    if (s.phase === 'done') return finish({ raw: s.raw, max: s.max, reached: s.idx })
    var prac = s.phase === 'practice', k = s.done, sd = prac ? st.seed + 1000 + k : st.seed + s.idx
    if (st.isle === 'pola') item = W.CekPola.make(prac ? 1 : 1 + Math.floor(s.idx / W.CekPola.PER_LEVEL), sd)
    else if (st.isle === 'bentuk') item = W.CekBentuk.make(prac ? (k ? 3 : 1) : 1 + Math.floor(s.idx / W.CekBentuk.PER_LEVEL), sd)
    else item = W.CekKata.make(prac ? k * 16 : s.idx, sd)
    item.practice = prac
    trail(s.idx, s.max)
    if (st.isle === 'pola') drawPola(); else if (st.isle === 'kata') drawKata(); else if (item.kind === 'tiles') drawTiles(); else drawRotate()
    if (prac) hint('Latihan dulu: ' + $('hint').textContent)
    shownAt = Date.now()
  }
  function feedback (right, btn) {   // practice only
    if (right) { U.sfx('correct'); if (btn) U.sparkle(btn); hint('Betul! Pintar!'); return }
    if (btn) { btn.classList.remove('shake'); void btn.offsetWidth; btn.classList.add('shake') }
    var r = D.querySelector('#stage [data-right]'); if (r) r.classList.add('right')
    hint('Lihat, yang ini jawabannya.')
  }
  function tapped () {   // every scored answer: neutral sound, trail, owl cheer every 5 (never depends on the answer)
    U.sfx('click'); st.n++
    if (st.n % 5 === 0) U.cheer()
  }
  function scored (right, btn) {
    if (lock || Date.now() - shownAt < 300) return; lock = true
    var ms = Date.now() - shownAt, s = st.sess
    if (item.practice) { C.answer(s, right, ms); feedback(right, btn); return later(next, right ? 900 : 1900) }
    st.ms.push(ms); C.answer(s, right, ms); tapped(); later(next, 250)
  }
  function choices (list, ans, draw, cls) {
    return '<div class="' + cls + '" role="group" aria-label="Pilihan">' + list.map(function (c, i) {
      return '<button type="button" data-i="' + i + '"' + (i === ans ? ' data-right="1"' : '') + ' aria-label="pilihan ' + (i + 1) + '">' + draw(c) + '</button>'
    }).join('') + '</div>'
  }
  function wire (sel) { D.querySelectorAll(sel + ' button').forEach(function (b) { b.onclick = function () { scored(+b.getAttribute('data-i') === item.answer, b) } }) }
  function drawPola () {
    var px = 64, cells = item.grid.map(function (c, i) {
      return i === item.grid.length - 1 ? '<div class="c gap" aria-label="kotak kosong">?</div>' : '<div class="c">' + W.CekPola.svg(c, px) + '</div>'
    }).join('')
    $('stage').innerHTML = '<div class="mx" style="grid-template-columns:repeat(' + item.cols + ',auto)">' + cells + '</div>' +
      choices(item.choices, item.answer, function (c) { return W.CekPola.svg(c, 70) }, 'ch' + (item.choices.length === 4 ? ' four' : ''))
    hint('Mana yang cocok untuk kotak kosong?'); wire('.ch')
  }
  function drawRotate () {
    $('stage').innerHTML = '<div class="target">' + W.CekBentuk.svgShape(item.cells, 0, 110, '#16a34a') + '<span>Contoh</span></div>' +
      choices(item.choices, item.answer, function (c) { return W.CekBentuk.svgShape(c.cells, c.turn, 76) }, 'ch' + (item.choices.length === 4 ? ' four' : ''))
    hint('Mana yang sama, hanya diputar?'); wire('.ch')
  }
  function drawTiles () {
    var n = item.n, cur = item.target.map(function () { return 0 })
    var tgt = '<div class="target"><div class="tiles small" style="grid-template-columns:repeat(' + n + ',auto)">' + item.target.map(function (o) { return '<div>' + W.CekBentuk.svgTile(o, 60) + '</div>' }).join('') + '</div><span>Contoh</span></div>'
    $('stage').innerHTML = tgt + '<div class="tiles" id="mine" style="grid-template-columns:repeat(' + n + ',auto)">' + cur.map(function (o, i) {
      return '<button type="button" data-t="' + i + '" aria-label="ubin ' + (i + 1) + '">' + W.CekBentuk.svgTile(o, 80) + '</button>'
    }).join('') + '</div><button type="button" class="du-btn du-btn-success du-btn-lg" id="tiles-done">Selesai</button>'
    hint('Ketuk ubin untuk memutar, sampai sama dengan contoh')
    D.querySelectorAll('#mine button').forEach(function (b) {
      b.onclick = function () { if (lock) return; var i = +b.getAttribute('data-t'); cur[i] = (cur[i] + 1) % 4; b.innerHTML = W.CekBentuk.svgTile(cur[i], 80) }
    })
    $('tiles-done').onclick = function () {
      var right = cur.every(function (o, i) { return o === item.target[i] })
      if (item.practice && !right && !lock) { lock = true; hint('Belum sama. Lihat contohnya lagi.'); D.querySelectorAll('#mine button').forEach(function (b, i) { b.innerHTML = W.CekBentuk.svgTile(item.target[i], 80) }); C.answer(st.sess, false, 0); return later(next, 2200) }
      scored(right, $('tiles-done'))
    }
  }
  function pic (x) { var b = W.DBLabeled.byName(x.group, x.name); return '<img alt="" src="' + (b ? b.src : '') + '">' }
  function drawKata () {
    if (item.kind === 'kata') {
      $('stage').innerHTML = '<p class="word">' + U.esc(item.word) + '</p>' + choices(item.choices, item.answer, pic, 'pics4')
      hint('Ketuk gambar ' + item.word); U.say(item.word)
    } else {
      $('stage').innerHTML = '<div class="target"><div class="row">' + item.show.map(function (x) { return '<div class="show" style="width:96px;height:96px">' + pic(x) + '</div>' }).join('') + '</div><span>Satu kelompok</span></div>' +
        choices(item.choices, item.answer, pic, 'pics4')
      hint('Mana yang satu kelompok dengan dua gambar ini?')
    }
    wire('.pics4')
  }

  // ---------- Perkiraan IQ + board ----------
  function iq () {
    var d = load(), unsure = U.ORDER.filter(function (id) { var r = last(d, id); return r && !W.CekProfile.reliable(r) })
    U.iqCard(W.CekProfile.iq(d.res, months()), zs(d), unsure); show('s-iq'); U.sfx('star')
  }
  function deviceRows () { return W.CekBoard.device(bestOf) }
  function board (tab) { show('s-board'); return U.board(tab || 'device', deviceRows, U.me()) }

  // ---------- wiring ----------
  var api = {
    st: function () { return st }, setItem: function (x) { item = x }, item: function () { return item },
    later: later, hint: hint, trail: trail, finish: finish, next: next, feedback: feedback, tapped: tapped,
    lock: function (v) { if (v !== undefined) lock = v; return lock }, shown: function () { shownAt = Date.now() }, since: function () { return Date.now() - shownAt }
  }
  $('name-go').onclick = saveName; $('name-in').onkeydown = function (e) { if (e.key === 'Enter') saveName() }
  $('btn-back').onclick = home; $('btn-pause').onclick = pause
  $('btn-iq').onclick = iq; $('iq-home').onclick = home; $('iq-board').onclick = function () { board('device') }
  $('btn-board').onclick = function () { board('device') }
  $('btn-say').onclick = function () { U.say(U.lastSay()) }; $('board-home').onclick = home
  D.querySelectorAll('.tab').forEach(function (t) { t.onclick = function () { board(t.getAttribute('data-tab')) } })
  W.__cek = { since: function () { return Date.now() - shownAt }, counted: counted, state: function () { return st }, item: function () { return item }, load: load, months: months, board: board, home: home }
  start()
})(window)
