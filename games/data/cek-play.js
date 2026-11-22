/* CekPlay — PRD-53 islands with their own flow (cek-page runs the ladder islands):
 *   ingat  picture span forward, backward, then Corsi blocks (CekCore.span rules, CekIngat sequences)
 *   cepat  "Sama atau beda?" for 85 s (CekCepat pairs); value = right answers per minute
 *   angka  dot sets (CekAngka.dots, shown 1.5 s then covered by a cloud), number line, story sums (ladder)
 * Each island: a short intro per part, practice with full feedback, scored items with only the neutral tap (api.tapped).
 * api comes from cek-page (st, item, later, hint, trail, finish, next, feedback, tapped, lock, shown, since).
 */
;(function (W) {
  'use strict'
  var D = W.document, $ = function (id) { return D.getElementById(id) }
  var C = W.CekCore, U = W.CekUI
  var PICS = [1, 12, 13, 28, 31, 32, 37, 51, 58]   // DBLabeled 'hewan' (creatures) ids: familiar animals
  var ING = [
    { id: 'maju', say: 'Lihat gambarnya satu per satu. Lalu ketuk dengan urutan yang sama.' },
    { id: 'mundur', say: 'Sekarang dibalik. Ketuk dari gambar yang TERAKHIR sampai yang pertama.' },
    { id: 'corsi', say: 'Kotak akan menyala satu per satu. Ketuk kotak dengan urutan yang sama.' }
  ]
  var ANG = [
    { id: 'banyak', say: 'Lihat dua kotak titik. Ketuk kotak yang titiknya lebih banyak. Tidak usah dihitung!' },
    { id: 'garis', say: 'Ketuk garis di tempat angkanya.' },
    { id: 'hitung', say: 'Baca ceritanya, lalu pilih jawabannya.' }
  ]
  function picSrc (n) { return U.asset('assets/db/creatures/' + ('000' + n).slice(-3) + '.webp') }
  function picName (n) { var it = (W.DBLabeled && W.DBLabeled._data.hewan.items || []).filter(function (x) { return x[0] === n })[0]; return it ? it[1] : 'gambar' }
  function partIntro (text, go) {
    $('stage').innerHTML = '<p class="ask">' + text + '</p><button type="button" class="du-btn du-btn-success du-btn-lg" id="part-go">Siap!</button>'
    U.say(text); $('part-go').onclick = function () { this.disabled = true; setTimeout(go, 250) }
  }

  // ---------- Ingat ----------
  // PRD-56: Cepat mode plays backward + Corsi only, each starting at length 3 (a child of grade-1 age; both tries wrong
  // at 3 go back to 2 once, CekCore.span reverse rule). A part not played is left out of the record, never saved as 0.
  function ingParts (st) { return st.mode === 'cepat' ? ING.slice(1) : ING }
  function newSpan (st) { return st.mode === 'cepat' && (st.months || 90) >= 78 ? C.span({ start: 3, reverse: true }) : C.span() }
  function ingatNext (a) {
    var st = a.st(), parts = ingParts(st)
    if (st.part >= parts.length) {
      var rec = { longest: st.longest || {} }
      parts.forEach(function (P) { rec[P.id] = st.best[P.id] || 0 })
      return a.finish(rec)
    }
    var P = parts[st.part]
    if (!st.introDone) return partIntro(P.say, function () { st.introDone = true; ingatNext(a) })
    if (st.span.phase === 'done') { st.best[P.id] = st.span.score; st.longest = st.longest || {}; st.longest[P.id] = st.span.best; st.part++; st.span = newSpan(st); st.practiced = false; st.introDone = false; return ingatNext(a) }
    a.trail(st.n, st.mode === 'cepat' ? 10 : 18)
    var len = st.practiced ? st.span.len : 2, sd = st.seed + st.part * 1000 + (st.trial++)
    var seq = P.id === 'corsi' ? W.CekIngat.corsi(len, sd) : W.CekIngat.sequence(len, sd, PICS.length)
    a.setItem({ seq: seq, want: P.id === 'mundur' ? seq.slice().reverse() : seq, practice: !st.practiced, part: P.id, got: [] })
    a.hint(st.practiced ? 'Lihat baik-baik.' : 'Latihan dulu. Lihat baik-baik.')
    if (P.id === 'corsi') corsiShow(a); else picShow(a)
  }
  function picShow (a) {
    var k = 0, S = W.CekIngat, it = a.item()
    $('stage').innerHTML = '<div class="show" id="show"></div>'
    ;(function step () {
      if (k >= it.seq.length) { $('show').innerHTML = ''; return a.later(function () { picAsk(a) }, S.GAP_MS) }
      var n = PICS[it.seq[k++]]
      $('show').innerHTML = '<img src="' + picSrc(n) + '" alt="' + picName(n) + '">'
      a.later(function () { $('show').innerHTML = ''; a.later(step, S.GAP_MS) }, S.SHOW_MS)
    })()
  }
  function picAsk (a) {
    var st = a.st(), it = a.item(), order = C.shuffle(C.rng(st.seed + st.trial * 31), PICS.map(function (_, i) { return i }))
    $('stage').innerHTML = '<div class="pics" id="pics">' + order.map(function (i) {
      return '<button type="button" data-p="' + i + '" aria-label="' + picName(PICS[i]) + '"><img src="' + picSrc(PICS[i]) + '" alt=""></button>'
    }).join('') + '</div>'
    a.hint(it.part === 'mundur' ? 'Ketuk dari yang TERAKHIR' : 'Ketuk dengan urutan yang sama')
    D.querySelectorAll('#pics button').forEach(function (b) { b.onclick = function () { tapSeq(a, b, +b.getAttribute('data-p')) } })
    a.shown()
  }
  function corsiShow (a) {
    var T = W.CekIngat.TILES, k = 0, S = W.CekIngat, it = a.item()
    $('stage').innerHTML = '<div class="board" id="board">' + T.map(function (t, i) {
      return '<button type="button" data-c="' + i + '" style="left:' + t[0] + '%;top:' + t[1] + '%" aria-label="kotak ' + (i + 1) + '" disabled></button>'
    }).join('') + '</div>'
    var btn = function (i) { return D.querySelector('#board [data-c="' + i + '"]') }
    ;(function step () {
      if (k >= it.seq.length) return a.later(function () { corsiAsk(a) }, S.GAP_MS)
      var b = btn(it.seq[k++]); b.classList.add('lit')
      a.later(function () { b.classList.remove('lit'); a.later(step, S.GAP_MS) }, S.SHOW_MS)
    })()
  }
  function corsiAsk (a) {
    D.querySelectorAll('#board button').forEach(function (b) { b.disabled = false; b.onclick = function () { tapSeq(a, b, +b.getAttribute('data-c')) } })
    a.hint('Ketuk kotak dengan urutan yang sama'); a.shown()
  }
  function tapSeq (a, b, v) {
    var it = a.item(), st = a.st()
    if (a.lock() || it.got.length >= it.want.length) return
    it.got.push(v)
    var n = D.createElement('span'); n.className = 'n'; n.textContent = it.got.length; b.appendChild(n)
    if (it.got.length < it.want.length) return
    a.lock(true)
    var right = it.got.every(function (x, i) { return x === it.want[i] }), ms = a.since()
    if (it.practice) { st.practiced = true; a.feedback(right, $('stage')); if (!right) a.hint('Belum tepat. Tidak apa-apa, ayo mulai.'); return a.later(a.next, 1500) }
    st.ms.push(Math.round(ms / it.want.length)); C.spanAnswer(st.span, right, ms); a.tapped(); a.later(a.next, 500)
  }

  // ---------- Cepat ----------
  function cepatNext (a) {
    var st = a.st()
    var T = st.speedMs || C.SPEED_MS
    if (st.t0 && Date.now() - st.t0 >= T) return cepatEnd(a)
    if (st.prac >= 2 && !st.t0) {
      return partIntro('Bagus! Sekarang jawab sebanyak-banyaknya sampai waktunya habis.', function () {
        st.t0 = Date.now(); a.later(function () { cepatEnd(a) }, T); tick(a); cepatNext(a)
      })
    }
    if (!st.t0) a.trail(st.prac, 2)
    var it = W.CekCepat.pair(st.k++, st.t0 ? st.seed : st.seed + 777); it.practice = !st.t0; a.setItem(it)
    $('stage').innerHTML = '<div class="pair"><div class="c">' + W.CekPola.svg(it.a, 110) + '</div><div class="c">' + W.CekPola.svg(it.b, 110) + '</div></div>' +
      '<div class="yn"><button type="button" class="du-btn du-btn-success" data-v="1"' + (it.same ? ' data-right="1"' : '') + '>Sama</button>' +
      '<button type="button" class="du-btn du-btn-warn" data-v="0"' + (!it.same ? ' data-right="1"' : '') + '>Beda</button></div>'
    a.hint(it.practice ? 'Latihan: sama atau beda?' : 'Sama atau beda?')
    D.querySelectorAll('.yn button').forEach(function (b) {
      b.onclick = function () {
        if (a.lock() || a.since() < 300) return; a.lock(true)
        var right = (b.getAttribute('data-v') === '1') === it.same
        if (it.practice) { st.prac++; a.feedback(right, b); return a.later(a.next, right ? 800 : 1700) }
        st.ms.push(a.since()); if (right) st.right++; else st.wrong++; a.tapped(); a.later(a.next, 120)
      }
    })
    a.shown()
  }
  function tick (a) {
    var st = a.st(); if (!st || st.isle !== 'cepat' || !st.t0) return
    var left = Math.max(0, 1 - (Date.now() - st.t0) / (st.speedMs || C.SPEED_MS)), t = $('trail')
    t.className = 'trail timer'; t.innerHTML = '<b class="time" style="width:' + (left * 100).toFixed(1) + '%"></b>'
    if (left > 0) a.later(function () { tick(a) }, 250)
  }
  function cepatEnd (a) {
    var st = a.st(); if (!st || st.isle !== 'cepat' || st.ended) return
    st.ended = true
    var n = st.right + st.wrong
    a.finish({ rate: Math.round(st.right / ((st.speedMs || C.SPEED_MS) / 6e4) * 10) / 10, right: st.right, wrong: st.wrong, errRate: n ? st.wrong / n : 0 })
  }

  // ---------- Angka ----------
  function dotSvg (list) {
    return '<svg viewBox="0 0 100 100" aria-hidden="true">' + list.map(function (p) { return '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + p.r.toFixed(1) + '" fill="#7c3aed"/>' }).join('') + '</svg>'
  }
  // PRD-56: Cepat mode skips the three 0-20 lines (only the 0-100 lines are scored) and the story problems (read, not in
  // the IQ); the dot trials stay whole (their reliability is the island's weak part)
  function angParts (st) { return st.mode === 'cepat' ? ANG.slice(0, 2) : ANG }
  function angkaNext (a) {
    var st = a.st(), parts = angParts(st)
    if (st.part >= parts.length) {
      var pae = st.pae.length ? st.pae.reduce(function (x, y) { return x + y }, 0) / st.pae.length : null
      var lv = 0; for (var L = 1; L <= 4; L++) if ((st.bOK[L] || 0) >= 2) lv = L
      // PRD-54: 'titik' = right answers of the 8 scored dot trials (all ratios); the old 'banyak' level is kept for display
      var titik = 0; for (var L2 = 1; L2 <= 4; L2++) titik += st.bOK[L2] || 0
      var rec = { banyak: lv, titik: titik, garis: pae === null ? undefined : Math.round(pae * 10) / 10, pae: st.pae }
      if (parts.length === ANG.length) rec.hitung = st.hl.raw
      return a.finish(rec)
    }
    var P = parts[st.part]
    if (!st.introDone) return partIntro(P.say, function () { st.introDone = true; angkaNext(a) })
    a.trail(st.n, st.mode === 'cepat' ? 12 : 23)
    var prac = !st.practiced
    if (P.id === 'banyak') {
      if (!prac && st.k >= W.CekAngka.N_DOTS) return partDone(a)
      return drawDots(a, prac ? W.CekAngka.dots(1, st.seed + 999, 'size') : W.CekAngka.dots((st.k >> 1) + 1, st.seed + st.k, st.k % 2 ? 'area' : 'size'), prac)
    }
    if (P.id === 'garis') {
      if (!prac && st.k >= W.CekAngka.N_LINES) return partDone(a)
      return drawLine(a, prac ? { max: 20, n: 10 } : W.CekAngka.line(st.k, st.seed), prac)
    }
    if (!prac && st.hl.phase === 'done') return partDone(a)
    drawStory(a, W.CekAngka.story(prac ? 0 : st.hl.idx, prac ? st.seed + 555 : st.seed), prac)
  }
  function partDone (a) { var st = a.st(); st.part++; st.k = st.mode === 'cepat' && angParts(st)[st.part] && angParts(st)[st.part].id === 'garis' ? W.CekAngka.N_LINES - 4 : 0; st.practiced = false; st.introDone = false; angkaNext(a) }
  function after (a, right, btn) {   // one answer in Angka: practice gets feedback, scored only the neutral tap
    var st = a.st(), it = a.item()
    if (it.practice) { st.practiced = true; a.feedback(right, btn); return a.later(a.next, right ? 900 : 1900) }
    st.ms.push(a.since()); st.k++; a.tapped(); a.later(a.next, 300)
  }
  function drawDots (a, it, prac) {
    it.practice = prac; a.setItem(it)
    $('stage').innerHTML = '<div class="dots">' + ['a', 'b'].map(function (s) {
      return '<button type="button" data-s="' + s + '"' + (s === it.more ? ' data-right="1"' : '') + ' aria-label="kotak ' + (s === 'a' ? 'kiri' : 'kanan') + '">' + dotSvg(it[s]) + '</button>'
    }).join('') + '</div>'
    a.hint(prac ? 'Latihan: mana yang lebih banyak?' : 'Mana yang lebih banyak?')
    a.later(function () {   // cover after 1.5 s so the child estimates instead of counting
      if (a.item() !== it) return
      D.querySelectorAll('.dots button').forEach(function (b) { b.innerHTML = '<img alt="" src="' + U.sprite('deco', 'cloud') + '" style="width:80%;height:80%;object-fit:contain">' })
    }, 1500)
    D.querySelectorAll('.dots button').forEach(function (b) {
      b.onclick = function () {
        if (a.lock() || a.since() < 300) return; a.lock(true)
        var right = b.getAttribute('data-s') === it.more, st = a.st()
        if (!prac && right) { var L = (st.k >> 1) + 1; st.bOK[L] = (st.bOK[L] || 0) + 1 }
        after(a, right, b)
      }
    })
    a.shown()
  }
  function drawLine (a, it, prac) {
    it.practice = prac; a.setItem(it)
    var X0 = 40, X1 = 560
    $('stage').innerHTML = '<p class="word">' + it.n + '</p><svg class="nline" id="nline" viewBox="0 0 600 120" role="img" aria-label="garis bilangan 0 sampai ' + it.max + '">' +
      '<rect x="0" y="30" width="600" height="80" fill="transparent"/><line x1="' + X0 + '" y1="70" x2="' + X1 + '" y2="70" stroke="#3b2a4a" stroke-width="6" stroke-linecap="round"/>' +
      '<line x1="' + X0 + '" y1="52" x2="' + X0 + '" y2="88" stroke="#3b2a4a" stroke-width="5"/><line x1="' + X1 + '" y1="52" x2="' + X1 + '" y2="88" stroke="#3b2a4a" stroke-width="5"/>' +
      '<text x="' + X0 + '" y="22" text-anchor="middle" font-size="26" font-family="Fredoka One,sans-serif" fill="#3b2a4a">0</text>' +
      '<text x="' + X1 + '" y="22" text-anchor="middle" font-size="26" font-family="Fredoka One,sans-serif" fill="#3b2a4a">' + it.max + '</text><g id="mk"></g></svg>'
    a.hint((prac ? 'Latihan: ' : '') + 'Di mana angka ' + it.n + '? Ketuk garisnya.'); U.say('Di mana angka ' + it.n + '?')
    $('nline').onpointerdown = function (e) {
      if (a.lock() || a.since() < 300) return
      var r = this.getBoundingClientRect(), x = Math.max(X0, Math.min(X1, (e.clientX - r.left) / r.width * 600))
      a.lock(true)
      var placed = (x - X0) / (X1 - X0) * it.max, pae = W.CekAngka.pae(placed, it.n, it.max)
      $('mk').innerHTML = '<path d="M' + x.toFixed(1) + ' 70 l-12 -26 h24 z" fill="#f59e0b" stroke="#b45309" stroke-width="3"/>'
      if (prac) { var tx = X0 + it.n / it.max * (X1 - X0); $('mk').innerHTML += '<circle cx="' + tx.toFixed(1) + '" cy="70" r="11" fill="#22c55e"/>' }
      else if (it.max === 100) a.st().pae.push(Math.round(pae * 10) / 10)
      after(a, pae <= 10, null)
    }
    a.shown()
  }
  function drawStory (a, it, prac) {
    it.practice = prac; a.setItem(it)
    var b = W.DBLabeled.byName(it.pic.group, it.pic.name), src = b ? b.src : ''
    var total = it.op === '+' ? it.a + it.b : it.a
    var counters = Array.apply(null, Array(total)).map(function (_, i) { return '<img alt="" src="' + src + '"' + (it.op === '-' && i >= it.a - it.b ? ' class="gone"' : '') + '>' }).join('')
    $('stage').innerHTML = '<p class="story">' + U.esc(it.text) + '</p><div class="counters" aria-hidden="true">' + counters + '</div>' +
      '<div class="nums" role="group" aria-label="Pilihan">' + it.choices.map(function (c, i) { return '<button type="button" data-i="' + i + '"' + (i === it.answer ? ' data-right="1"' : '') + '>' + c + '</button>' }).join('') + '</div>'
    a.hint(prac ? 'Latihan: soal cerita' : 'Soal cerita'); U.say(it.text)
    D.querySelectorAll('.nums button').forEach(function (bt) {
      bt.onclick = function () {
        if (a.lock() || a.since() < 300) return; a.lock(true)
        var right = +bt.getAttribute('data-i') === it.answer, st = a.st()
        if (!prac) C.answer(st.hl, right, a.since())
        after(a, right, bt)
      }
    })
    a.shown()
  }

  var FLOWS = { ingat: ingatNext, cepat: cepatNext, angka: angkaNext }
  W.CekPlay = {
    has: function (id) { return !!FLOWS[id] },
    init: function (id, st) {
      if (id === 'ingat') { st.part = 0; st.practiced = false; st.trial = 0; st.span = C.span(); st.best = {} }
      if (id === 'ingat') st.span = newSpan(st)
      if (id === 'cepat') { st.k = 0; st.prac = 0; st.right = 0; st.wrong = 0; st.t0 = 0; st.speedMs = st.mode === 'cepat' ? 45000 : C.SPEED_MS }
      if (id === 'angka') { st.part = 0; st.k = 0; st.practiced = false; st.bOK = {}; st.pae = []; st.hl = C.ladder({ practice: 0, max: W.CekAngka.N_STORY, stopAfter: C.STOP_AFTER }) }
    },
    next: function (id, a) { FLOWS[id](a) },
    PICS: PICS
  }
})(window)
