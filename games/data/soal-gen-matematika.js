/* =============================================================================
 * soal-gen-matematika.js — the shared Matematika generators of window.SoalEngine.
 * Moved from games/tk-quiz.js (G30) so every game draws the same maths (owner: "jangan per-game
 * membuat engine/algo sendiri"). Objects in the stories come from the game profile's `nouns`
 * (SoalEngine.defineGame(id, {nouns: {_: [[spriteKey, 'peti'], ...], <theme>: [...]}})).
 *
 *   'mat-a'      fase A (Kelas 1–2, grades 1–2): numbers <= 20, whole-hour clocks, no × / ÷.
 *                o.level 1–4 = difficulty inside fase A; o.easy = picture-first counting only;
 *                o.kind forces a kind; o.about (the level goal) picks a matching kind.
 *   'mat-sulit'  Sulit (Kelas 3–4, grades 3–4): add/sub within 1000 with regrouping, 10×10 tables,
 *                exact division, fractions of 2/3/4, clocks on 5 minutes, Rp1.000–Rp10.000 change,
 *                m -> cm, kg, two-step stories <= 18 words. Target grade 3 only serves grade-3 kinds.
 * Each registers a validate(q) that recomputes the answer from q.calc (the gates run it).
 * Output keeps the G30 renderer's fields: kind, eq, visual, scene, explain, hint1, hint2, step1, calc.
 * ==========================================================================*/
(function () {
  'use strict'
  var W = (typeof window !== 'undefined' ? window : globalThis)
  var SE = W.SoalEngine
  if (!SE) return
  var ri = SE.ri, shuffle = function (a, r) { return SE.shuffle(a, r) }, oneOf = SE.oneOf, wpick = SE.wpick

  /* ══ fase A ═══════════════════════════════════════════════════════════════ */
  // groups / share / groupsplus stay available (o.kind) but are never scheduled in fase A
  var KINDS = {
    // owner 2026-09-30 ("soalnya itu-itu saja"): many templates, none above ~20 %
    1: [['count', 18], ['add', 14], ['sub', 12], ['biggest', 8], ['smallest', 8], ['bond', 12], ['tomake', 10], ['pattern', 9], ['double', 9]],
    2: [['add', 13], ['sub', 13], ['count', 8], ['clock', 10], ['diff', 8], ['capacity', 8], ['bond', 10], ['tomake', 10], ['double', 8], ['pattern', 7], ['fewer', 5]],
    3: [['add', 13], ['sub', 13], ['capacity', 9], ['clock', 10], ['diff', 11], ['bond', 9], ['tomake', 10], ['pattern', 10], ['length', 9], ['fewer', 6]],
    4: [['twostep', 22], ['add', 10], ['sub', 10], ['diff', 9], ['clock', 8], ['capacity', 7], ['tomake', 10], ['pattern', 9], ['length', 9], ['bond', 6]]
  }
  var MAXN = 20
  // easy (Kelas 1 / low mastery): picture-first — the objects of the story are on screen
  var EASY_KINDS = [['count', 22], ['add', 20], ['sub', 18], ['double', 18], ['tomake', 12], ['bond', 10]]
  function cap (level) { return level <= 2 ? 10 : 20 }
  function clockLabel (h, m) { return m === 30 ? 'Pukul setengah ' + (h % 12 + 1) : 'Pukul ' + h }
  function seqStr (from, to, step) { step = step || 1; var o = []; for (var v = from; step > 0 ? v <= to : v >= to; v += step) o.push(v); return o.join(', ') }
  function numChoices (ans, near, r, max) {
    var seen = {}, out = [ans]; seen[ans] = 1
    var pool = shuffle(near.concat([ans + 1, ans - 1, ans + 2, ans - 2]), r)
    var top = Math.min(max + 3, MAXN)
    for (var i = 0; i < pool.length && out.length < 4; i++) { var v = pool[i]; if (v >= 0 && v <= top && !seen[v] && v === Math.round(v)) { seen[v] = 1; out.push(v) } }
    for (var d = 3; out.length < 4 && d < 40; d++) { [ans + d, ans - d].forEach(function (v) { if (out.length < 4 && v >= 0 && v <= MAXN && !seen[v]) { seen[v] = 1; out.push(v) } }) }
    return shuffle(out, r).map(String)
  }
  // the level goal line -> a kind ("Bagikan selimut…" -> share); share / groups are goal-only
  var MATH_TOPIC = [[/bagi/, 'share'], [/pukul|jam\b|waktu|jadwal/, 'clock'], [/muat|kursi|sekoci/, 'capacity'], [/selisih|banding/, 'diff'], [/kelompok|rombongan/, 'groups'],
    [/turun|kurang|sisa/, 'sub'], [/muatan|dimuat|naik|tambah|kargo/, 'add'], [/hitung|berapa/, 'count']]
  function kindFor (about, level) {
    var t = String(about || '').toLowerCase(), have = (KINDS[level] || []).map(function (k) { return k[0] }).concat(['share', 'groups'])
    for (var i = 0; i < MATH_TOPIC.length; i++) if (MATH_TOPIC[i][0].test(t) && have.indexOf(MATH_TOPIC[i][1]) >= 0) return MATH_TOPIC[i][1]
    return null
  }
  // story words per game (profile.vocab); the neutral defaults read well anywhere
  var VOCAB = { place: 'meja', deck: 'meja', load: 'ditambah', unload: 'diambil', carrier: 'Tim', box: 'kotak', crate: 'kotak', seat: 'Mobil', rope: 'Tali', cheer: '' }
  function vocabOf (o) { var v = {}, k; for (k in VOCAB) v[k] = VOCAB[k]; for (k in (o && o.vocab) || {}) v[k] = o.vocab[k]; return v }
  // avoid: container words of the story ("Tiap peti berisi 7 peti" must never happen) -> another noun, else 'ikan'
  function nounOf (o, r, avoid) {
    var th = (o.nouns && o.nouns.length) ? o.nouns : [['game/crate-wood', 'kotak']]
    if (avoid) {
      var bad = function (n) { return avoid.some(function (a) { a = String(a || '').toLowerCase(); return a && (n === a || n.indexOf(a + ' ') === 0) }) }
      var ok = th.filter(function (x) { return !bad(x[1]) })
      th = ok.length ? ok : [['animals/clownfish', 'ikan']]
    }
    return oneOf(th, r)
  }

  function faseA (grade, r, theme, o) {
    o = o || {}
    var level = Math.max(1, Math.min(4, (o.level | 0) || (grade <= 1 ? 1 : 2)))
    var v = vocabOf(o), it = nounOf(o, r, [v.box, v.crate, v.seat]), key = it[0], noun = it[1]
    var kinds = KINDS[level]
    if (o.extraKinds) kinds = kinds.concat(o.extraKinds)
    // easy (Kelas 1 / low mastery): the picture-first kinds only (EASY_KINDS)
    if (o.easy && level <= 2) kinds = EASY_KINDS
    var forced = o.kind || (o.about ? kindFor(o.about, level) : null)
    if (forced) kinds = [[forced, 1]]
    var kind = wpick(kinds, r), M = cap(level), q
    var G = function (k, n, role) { return { key: k, n: n, role: role || 'base' } }
    switch (kind) {
      case 'count': {
        var n = level === 1 ? ri(r, 2, 10) : ri(r, 6, 10)
        q = { prompt: 'Ada berapa ' + noun + '?', eq: null, ans: n, near: [n + 1, n - 1, n + 2],
          scene: { mode: 'count', groups: [G(key, n)] }, hint1: 'Hitung pelan-pelan, satu per satu.', hint2: 'Sentuh setiap ' + noun + ' sambil menghitung.',
          step1: 'Mulai dari yang paling kiri: 1, 2, 3, …', explain: 'Ada ' + n + ' ' + noun + '.', calc: { op: 'count', n: n } }
        break
      }
      case 'add': {
        var a = ri(r, 1, M - 1), b = ri(r, 1, Math.min(M - a, level <= 2 ? 5 : 9)), s = a + b
        q = { prompt: 'Ada ' + a + ' ' + noun + ' di ' + v.place + '. ' + b + ' lagi ' + v.load + '. Jadi berapa?', eq: a + ' + ' + b + ' = ?', ans: s,
          near: [a, b, Math.abs(a - b), s + 1, s - 1], scene: { mode: 'add', groups: [G(key, a), G(key, b, 'add')] },
          hint1: 'Gabungkan dua kelompok ' + noun + '.', hint2: 'Mulai dari ' + a + ', lalu hitung maju ' + b + ' lagi.',
          step1: 'Mulai dari ' + a + ': ' + seqStr(a + 1, Math.min(s, a + 2)) + (b > 2 ? ', …' : ''), explain: a + ' + ' + b + ' = ' + s + '.' + (v.cheer ? ' ' + v.cheer.replace('{noun}', noun) : ''), calc: { op: '+', a: a, b: b } }
        break
      }
      case 'sub': {
        var a2 = ri(r, 3, M), b2 = ri(r, 1, Math.min(a2 - 1, level <= 2 ? 5 : 9)), d2 = a2 - b2
        q = { prompt: 'Ada ' + a2 + ' ' + noun + ' di ' + v.deck + '. ' + b2 + ' ' + v.unload + '. Sisa berapa?', eq: a2 + ' − ' + b2 + ' = ?', ans: d2,
          near: [a2 + b2 <= M + 3 ? a2 + b2 : d2 + 3, b2, a2, d2 + 1, d2 - 1], scene: { mode: 'sub', groups: [G(key, d2), G(key, b2, 'leave')] },
          hint1: 'Yang ' + v.unload + ' tidak dihitung lagi.', hint2: 'Tutup ' + b2 + ' ' + noun + ' yang pergi, hitung sisanya.',
          step1: 'Mulai dari ' + a2 + ', hitung mundur ' + b2 + ': ' + seqStr(a2 - 1, Math.max(d2, a2 - 2), -1) + (b2 > 2 ? ', …' : ''), explain: a2 + ' − ' + b2 + ' = ' + d2 + '.', calc: { op: '-', a: a2, b: b2 } }
        break
      }
      case 'biggest': {
        var vals = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], r).slice(0, 4), mx = Math.max.apply(null, vals)
        q = { prompt: 'Angka mana yang paling besar?', eq: null, ans: mx, fixed: vals.map(String),
          scene: { mode: 'none', groups: [] }, hint1: 'Angka besar artinya lebih banyak.', hint2: 'Bayangkan urutan 1 sampai 10. Mana yang paling akhir?',
          step1: 'Bandingkan dua angka dulu, simpan yang lebih besar.', explain: mx + ' adalah angka paling besar.', calc: { op: 'max', list: vals } }
        break
      }
      case 'groups': case 'groupsplus': {
        var g = ri(r, 2, 3), k = ri(r, 2, kind === 'groupsplus' ? Math.min(5, Math.floor(17 / g)) : Math.floor(10 / g))
        var e = kind === 'groupsplus' ? ri(r, 1, Math.min(3, 20 - g * k)) : 0, tot = g * k + e
        var grp = []; for (var gi = 0; gi < g; gi++) grp.push(G(key, k, 'group'))
        if (e) grp.push(G(key, e, 'add'))
        q = { prompt: 'Ada ' + g + ' ' + v.box + '. Tiap ' + v.box + ' ' + k + ' ' + noun + '.' + (e ? ' ' + e + ' lagi datang.' : '') + ' Semuanya berapa?',
          eq: new Array(g + 1).join(k + ' + ').slice(0, -3) + (e ? ' + ' + e : '') + ' = ?', ans: tot, near: [g + k, g * k + (e ? 0 : k), tot + k, tot - 1, tot + 1],
          scene: { mode: 'groups', groups: grp }, hint1: 'Hitung isi setiap ' + v.box + '.', hint2: 'Tiap ' + v.box + ' ' + k + '. Hitung loncat: ' + seqStr(k, k * Math.min(g, 3), k) + (g > 3 ? ', …' : ''),
          step1: k + ' + ' + k + ' = ' + (2 * k) + (g > 2 || e ? ', lalu tambah lagi.' : '.'), explain: 'Semuanya ' + tot + ' ' + noun + '.', calc: { op: 'groups', g: g, k: k, e: e } }
        break
      }
      case 'share': {
        var g3 = ri(r, 2, 3), k3 = ri(r, 2, Math.floor(10 / g3)), t3 = g3 * k3
        q = { prompt: t3 + ' ' + noun + ' dibagi ke ' + g3 + ' ' + v.box + '. Tiap ' + v.box + ' dapat berapa?', eq: t3 + ' : ' + g3 + ' = ?', ans: k3,
          near: [k3 + 1, k3 - 1, g3, k3 + 2], scene: { mode: 'share', groups: [G(key, t3)], boats: g3 },
          hint1: 'Bagikan satu per satu ke tiap ' + v.box + ', bergiliran.', hint2: 'Tiap ' + v.box + ' harus dapat sama banyak.',
          step1: 'Beri 1 ' + noun + ' ke tiap ' + v.box + ': sudah ' + g3 + ' terbagi. Ulangi sampai habis.', explain: t3 + ' dibagi ' + g3 + ' = ' + k3 + '. Tiap ' + v.box + ' dapat ' + k3 + '.', calc: { op: 'share', t: t3, g: g3 } }
        break
      }
      case 'capacity': {
        var c = ri(r, 5, level <= 3 ? 10 : 12), x = ri(r, 1, c - 1), room = c - x
        q = { prompt: v.seat + ' muat ' + c + ' orang. Sudah ada ' + x + '. Berapa lagi bisa naik?', eq: c + ' − ' + x + ' = ?', ans: room,
          near: [c, x, room + 1, room - 1, c + x <= 20 ? c + x : room + 2], scene: { mode: 'capacity', cap: c, fill: x, groups: [] },
          hint1: 'Hitung kursi yang masih kosong.', hint2: 'Kursi kosong = kursi semua dikurangi yang sudah terisi.',
          step1: 'Mulai dari ' + x + ', hitung maju sampai ' + c + '.', explain: c + ' − ' + x + ' = ' + room + '. Masih ada ' + room + ' kursi kosong.', calc: { op: '-', a: c, b: x } }
        break
      }
      case 'diff': {
        var p = ri(r, 3, M), o2 = ri(r, 1, p - 1), df = p - o2
        var red = r() < 0.5
        q = { prompt: v.carrier + ' Merah bawa ' + (red ? p : o2) + ' ' + noun + '. ' + v.carrier + ' Biru bawa ' + (red ? o2 : p) + '. Selisihnya berapa?', eq: p + ' − ' + o2 + ' = ?', ans: df,
          near: [p + o2 <= M + 3 ? p + o2 : df + 3, df + 1, df - 1, o2], scene: { mode: 'diff', groups: [G(key, red ? p : o2, 'red'), G(key, red ? o2 : p, 'blue')] },
          hint1: 'Selisih artinya berapa lebih banyak.', hint2: 'Pasangkan satu-satu. Hitung yang tidak punya pasangan.',
          step1: 'Yang banyak ' + p + ', yang sedikit ' + o2 + '. Hitung dari ' + o2 + ' sampai ' + p + '.', explain: p + ' − ' + o2 + ' = ' + df + '.', calc: { op: '-', a: p, b: o2 } }
        break
      }
      case 'twostep': {
        var a4 = ri(r, 3, 12), b4 = ri(r, 2, Math.min(8, 20 - a4)), c4 = ri(r, 1, Math.min(9, a4 + b4 - 1)), res = a4 + b4 - c4
        q = { prompt: 'Ada ' + a4 + ' ' + noun + '. ' + b4 + ' ' + v.load + ', ' + c4 + ' ' + v.unload + '. Sekarang berapa?', eq: a4 + ' + ' + b4 + ' − ' + c4 + ' = ?', ans: res,
          near: [a4 + b4, a4 - c4 >= 0 ? a4 - c4 : res + 2, res + 1, res - 1, res + 2], scene: { mode: 'twostep', groups: [G(key, a4), G(key, b4, 'add')], leave: c4 },
          hint1: 'Kerjakan satu langkah dulu.', hint2: 'Langkah 1: tambah yang ' + v.load + '. Langkah 2: kurangi yang ' + v.unload + '.',
          step1: 'Langkah 1: ' + a4 + ' + ' + b4 + ' = ' + (a4 + b4) + '. Sekarang kurangi ' + c4 + '.', explain: a4 + ' + ' + b4 + ' = ' + (a4 + b4) + ', lalu ' + (a4 + b4) + ' − ' + c4 + ' = ' + res + '.',
          calc: { op: 'two', a: a4, b: b4, c: c4 } }
        break
      }
      case 'smallest': {
        var sv = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], r).slice(0, 4), mn = Math.min.apply(null, sv)
        q = { prompt: 'Angka mana yang paling kecil?', eq: null, ans: mn, fixed: sv.map(String),
          scene: { mode: 'none', groups: [] }, hint1: 'Angka kecil artinya lebih sedikit.', hint2: 'Bayangkan urutan 1 sampai 10. Mana yang paling awal?',
          step1: 'Bandingkan dua angka dulu, simpan yang lebih kecil.', explain: mn + ' adalah angka paling kecil.', calc: { op: 'min', list: sv } }
        break
      }
      case 'bond': {   // number bonds: a + ? = t
        var bt = level <= 2 ? ri(r, 4, 10) : ri(r, 8, 20), ba = ri(r, 1, bt - 1), bm = bt - ba
        q = { prompt: ba + ' dan berapa supaya jadi ' + bt + '?', eq: ba + ' + ? = ' + bt, ans: bm, near: [bt, ba, bm + 1, bm - 1, bt + ba <= 20 ? bt + ba : bm + 2],
          scene: { mode: 'count', groups: [G(key, ba)] }, hint1: 'Mulai dari ' + ba + ', hitung maju sampai ' + bt + '.', hint2: 'Berapa langkah dari ' + ba + ' ke ' + bt + '?',
          step1: ba + ', ' + seqStr(ba + 1, Math.min(bt, ba + 2)) + (bt - ba > 2 ? ', …' : ''), explain: ba + ' + ' + bm + ' = ' + bt + '.', calc: { op: 'bond', a: ba, t: bt } }
        break
      }
      case 'tomake': {   // "berapa lagi supaya jadi N"
        var tt = level <= 2 ? ri(r, 5, 10) : ri(r, 10, 20), th2 = ri(r, 2, tt - 1), tn = tt - th2
        q = { prompt: 'Sudah ada ' + th2 + ' ' + noun + '. Berapa lagi supaya jadi ' + tt + '?', eq: tt + ' − ' + th2 + ' = ?', ans: tn,
          near: [tt, th2, tn + 1, tn - 1, tn + 2], scene: { mode: 'count', groups: [G(key, th2)] },
          hint1: 'Hitung maju dari ' + th2 + ' sampai ' + tt + '.', hint2: 'Yang kurang = ' + tt + ' dikurangi ' + th2 + '.',
          step1: 'Mulai dari ' + th2 + ': ' + seqStr(th2 + 1, Math.min(tt, th2 + 2)) + (tn > 2 ? ', …' : ''), explain: 'Kurang ' + tn + ' lagi: ' + th2 + ' + ' + tn + ' = ' + tt + '.', calc: { op: '-', a: tt, b: th2 } }
        break
      }
      case 'double': {   // doubles with pictures
        var dd = ri(r, 1, level <= 2 ? 5 : 9), ds = dd * 2
        q = { prompt: 'Kiri ' + dd + ' ' + noun + ', kanan juga ' + dd + '. Semuanya berapa?', eq: dd + ' + ' + dd + ' = ?', ans: ds,
          near: [dd, ds + 1, ds - 1, ds + 2], scene: { mode: 'add', groups: [G(key, dd), G(key, dd, 'add')] },
          hint1: 'Dua kelompok sama banyak.', hint2: 'Hitung yang kiri, lalu lanjut hitung yang kanan.',
          step1: 'Kiri ' + dd + ', lalu ' + seqStr(dd + 1, Math.min(ds, dd + 2)) + (dd > 2 ? ', …' : ''), explain: dd + ' + ' + dd + ' = ' + ds + '. Dua kali ' + dd + ' sama dengan ' + ds + '.', calc: { op: '+', a: dd, b: dd } }
        break
      }
      case 'pattern': {   // skip counting: a, a+s, a+2s, ?
        var ps = level <= 1 ? 1 : oneOf(level <= 2 ? [1, 2, 2] : [1, 2, 2, 5], r), pa = ri(r, 1, Math.max(1, (level <= 2 ? 10 : 20) - 3 * ps)), pn = pa + 3 * ps
        if (ps === 5) { pa = 5 * ri(r, 0, 1); pn = pa + 15 }
        q = { prompt: 'Lanjutkan pola ' + pa + ', ' + (pa + ps) + ', ' + (pa + 2 * ps) + ', …', eq: null, ans: pn, near: [pn + 1, pn - 1, pn + ps, pa + 2 * ps],
          scene: { mode: 'none', groups: [] }, hint1: 'Lihat, tiap angka naik berapa?', hint2: 'Tiap langkah tambah ' + ps + '.',
          step1: (pa + 2 * ps) + ' + ' + ps + ' = ?', explain: 'Tiap langkah tambah ' + ps + ', jadi ' + (pa + 2 * ps) + ' + ' + ps + ' = ' + pn + '.', calc: { op: 'seq', a: pa, s: ps } }
        break
      }
      case 'fewer': {   // compare: how many fewer
        var fa = ri(r, 4, M), fb = ri(r, 1, fa - 1), fd = fa - fb, fr = r() < 0.5
        q = { prompt: v.carrier + ' Merah ' + (fr ? fa : fb) + ' ' + noun + ', ' + v.carrier + ' Biru ' + (fr ? fb : fa) + '. Yang sedikit kurang berapa?', eq: fa + ' − ' + fb + ' = ?', ans: fd,
          near: [fb, fd + 1, fd - 1, fa + fb <= M + 3 ? fa + fb : fd + 2], scene: { mode: 'diff', groups: [G(key, fr ? fa : fb, 'red'), G(key, fr ? fb : fa, 'blue')] },
          hint1: 'Pasangkan satu-satu.', hint2: 'Yang tidak punya pasangan, itu kurangnya.',
          step1: 'Yang banyak ' + fa + ', yang sedikit ' + fb + '.', explain: fb + ' kurang ' + fd + ' dari ' + fa + ': ' + fa + ' − ' + fb + ' = ' + fd + '.', calc: { op: '-', a: fa, b: fb } }
        break
      }
      case 'length': {   // measuring with pictures (blocks)
        var ma = ri(r, 3, Math.min(M, 12)), mb = ri(r, 2, ma - 1), mdf = ma - mb
        q = { prompt: 'Tali ' + ma + ' kotak, pita ' + mb + ' kotak. Tali lebih panjang berapa kotak?', eq: ma + ' − ' + mb + ' = ?', ans: mdf,
          near: [mb, ma, mdf + 1, mdf - 1], scene: { mode: 'diff', groups: [G('game/crate-wood', ma, 'red'), G('game/crate-wood', mb, 'blue')] },
          hint1: 'Bandingkan kedua baris kotak.', hint2: 'Hitung kotak yang lebih pada tali.',
          step1: 'Tali ' + ma + ', pita ' + mb + '. Hitung dari ' + mb + ' sampai ' + ma + '.', explain: ma + ' − ' + mb + ' = ' + mdf + ' kotak.', calc: { op: '-', a: ma, b: mb } }
        break
      }
      default: {  // clock — fase A: whole hours only, in the answer AND the wrong choices
        var h = ri(r, 1, 12), m = 0, lab = clockLabel(h, m)
        var alt = [clockLabel(h % 12 + 1, 0), clockLabel((h + 10) % 12 + 1, 0), clockLabel((h + 1) % 12 + 1, 0), clockLabel((h + 9) % 12 + 1, 0)]
        var ch = [lab]; alt.forEach(function (v) { if (ch.length < 4 && ch.indexOf(v) < 0) ch.push(v) })
        q = { prompt: 'Lihat jamnya. Pukul berapa sekarang?', eq: null, ans: lab, fixed: ch,
          scene: { mode: 'clock', h: h, m: m, groups: [] }, hint1: 'Lihat jarum pendek dulu.', hint2: 'Jarum panjang di angka 12 artinya tepat.',
          step1: 'Jarum pendek menunjuk angka ' + h + '.', explain: 'Jarum pendek di ' + h + ' dan jarum panjang di 12: ' + lab.toLowerCase() + '.',
          calc: { op: 'clock', h: h, m: m } }
        kind = 'clock'
      }
    }
    var choices = q.fixed ? shuffle(q.fixed, r) : numChoices(q.ans, q.near, r, M)
    var visual = []; (q.scene.groups || []).forEach(function (gg) { if (visual.indexOf(gg.key) < 0) visual.push(gg.key) })
    var id = 'm' + level + '-' + kind + '-' + JSON.stringify(q.calc).replace(/[^0-9a-z,]/gi, '')
    return { id: id, topic: 'matematika', domain: 'matematika', grade: level <= 2 ? 1 : 2, level: level, kind: kind, prompt: q.prompt, eq: q.eq, visual: visual, scene: q.scene,
      choices: choices, answer: String(q.ans), explain: q.explain, hint1: q.hint1, hint2: q.hint2, step1: q.step1, calc: q.calc, world: theme || null, noun: noun }
  }
  function validateA (q) {
    var p = [], c = q.calc || {}, M = cap(q.level), truth
    if (c.op !== 'clock') {
      q.choices.forEach(function (x) { if (!/^\d+$/.test(x)) p.push('non-integer/negative choice ' + x) })
      if (c.op === 'count') truth = c.n
      else if (c.op === '+') truth = c.a + c.b
      else if (c.op === '-') truth = c.a - c.b
      else if (c.op === 'max') truth = Math.max.apply(null, c.list)
      else if (c.op === 'min') truth = Math.min.apply(null, c.list)
      else if (c.op === 'bond') truth = c.t - c.a
      else if (c.op === 'seq') { truth = c.a + 3 * c.s; if (truth > MAXN) p.push('pattern above ' + MAXN) }
      else if (c.op === 'groups') truth = c.g * c.k + c.e
      else if (c.op === 'share') truth = c.t % c.g === 0 ? c.t / c.g : NaN
      else if (c.op === 'two') { truth = c.a + c.b - c.c; if (c.a + c.b > M) p.push('intermediate > ' + M) }
      if (String(truth) !== q.answer) p.push('answer ' + q.answer + ' != ' + truth)
      if (!(truth >= 0)) p.push('negative/invalid truth')
      ;['a', 'b', 'c', 'n', 't'].forEach(function (k) { if (c[k] != null && (c[k] < 0 || c[k] > M)) p.push('operand ' + k + '=' + c[k] + ' outside 0..' + M) })
      if (truth > M) p.push('answer above ' + M)
      q.choices.forEach(function (x) { if (+x > MAXN) p.push('choice ' + x + ' above ' + MAXN) })
      if ((c.op === 'max' || c.op === 'min') && q.choices.filter(function (x) { return +x === truth }).length !== 1) p.push(c.op + ' not unique')
      if (c.op === 'bond' && (c.t > M || c.a >= c.t)) p.push('bond outside 1..' + M)
    } else if (clockLabel(c.h, c.m) !== q.answer) p.push('clock label mismatch')
    return p
  }

  /* ══ Sulit (Kelas 3–4) ═══════════════════════════════════════════════════ */
  var HARD_KINDS = [['add3', 14], ['sub3', 14], ['times', 16], ['div', 10], ['frac', 10], ['clock5', 10], ['money', 10], ['measure', 8], ['story', 8]]
  var HARD_GRADE = { add3: 3, sub3: 3, times: 3, div: 3, clock5: 3, money: 3, frac: 4, measure: 4, story: 4 }
  function rp (v) { return 'Rp' + String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.') }
  function clock5Label (h, m) { return 'Pukul ' + h + '.' + (m < 10 ? '0' : '') + m }
  function uniq4 (ans, alts, r) {
    var out = [ans], seen = {}; seen[ans] = 1
    alts.forEach(function (v) { if (out.length < 4 && v != null && !seen[v]) { seen[v] = 1; out.push(v) } })
    return shuffle(out, r)
  }
  function numAlts (a, steps) { var o = []; steps.forEach(function (d) { if (a + d >= 0) o.push(String(a + d)) }); return o }
  function sulit (grade, r, theme, o) {
    o = o || {}
    var v = vocabOf(o), it = nounOf(o, r, [v.crate, v.box, 'kotak']), noun = it[1]
    var kinds = grade <= 3 ? HARD_KINDS.filter(function (k) { return HARD_GRADE[k[0]] <= 3 }) : HARD_KINDS
    var kind = o.kind && HARD_GRADE[o.kind] ? o.kind : wpick(kinds, r), q
    switch (kind) {
      case 'add3': {   // within 1000, the ones regroup
        var a = ri(r, 105, 780), b = ri(r, 17, Math.min(219, 999 - a)); if ((a % 10) + (b % 10) < 10) b = Math.min(999 - a, b + (10 - (a % 10)))
        var s = a + b
        q = { prompt: v.carrier + ' membawa ' + a + ' ' + noun + '. Lalu ' + v.load + ' ' + b + ' lagi. Jumlahnya?', eq: a + ' + ' + b + ' = ?', ans: String(s),
          alts: numAlts(s, [10, -10, 1, -1, 100]), calc: { op: '+', a: a, b: b }, explain: a + ' + ' + b + ' = ' + s + '.', hint1: 'Jumlahkan satuan dulu, lalu puluhan, lalu ratusan.', hint2: 'Kalau satuan lebih dari 9, simpan 1 ke puluhan.' }
        break
      }
      case 'sub3': {
        var a2 = ri(r, 210, 990), b2 = ri(r, 18, Math.min(199, a2 - 10)); if ((a2 % 10) >= (b2 % 10)) b2 = Math.min(a2 - 10, b2 + ((a2 % 10) - (b2 % 10)) + 1)
        var d2 = a2 - b2
        q = { prompt: 'Ada ' + a2 + ' ' + noun + '. Sebanyak ' + b2 + ' ' + v.unload + '. Sisanya?', eq: a2 + ' − ' + b2 + ' = ?', ans: String(d2),
          alts: numAlts(d2, [10, -10, 1, -1, 100]), calc: { op: '-', a: a2, b: b2 }, explain: a2 + ' − ' + b2 + ' = ' + d2 + '.', hint1: 'Kurangi satuan dulu. Kalau kurang, pinjam 1 dari puluhan.', hint2: 'Periksa: jawaban + ' + b2 + ' harus sama dengan ' + a2 + '.' }
        break
      }
      case 'times': {
        var x = ri(r, 2, 10), y = ri(r, 2, 10), p = x * y
        q = { prompt: 'Ada ' + x + ' ' + v.crate + '. Tiap ' + v.crate + ' berisi ' + y + ' ' + noun + '. Semuanya berapa?', eq: x + ' × ' + y + ' = ?', ans: String(p),
          alts: numAlts(p, [x, -x, y, -y, 1, -1]), calc: { op: '*', a: x, b: y }, explain: x + ' × ' + y + ' = ' + p + '.', hint1: 'Perkalian = penjumlahan berulang.', hint2: 'Hitung loncat ' + y + ' sebanyak ' + x + ' kali.' }
        break
      }
      case 'div': {
        var g = ri(r, 2, 9), k = ri(r, 2, 10), t = g * k
        q = { prompt: t + ' ' + noun + ' dibagi rata ke ' + g + ' ' + v.box + '. Tiap ' + v.box + ' dapat berapa?', eq: t + ' : ' + g + ' = ?', ans: String(k),
          alts: numAlts(k, [1, -1, 2, -2, g - k]), calc: { op: '/', a: t, b: g }, explain: t + ' : ' + g + ' = ' + k + ', karena ' + g + ' × ' + k + ' = ' + t + '.', hint1: 'Pembagian adalah kebalikan perkalian.', hint2: 'Berapa kali ' + g + ' supaya jadi ' + t + '?' }
        break
      }
      case 'frac': {
        var den = oneOf([2, 3, 4], r), num = den === 4 && r() < 0.4 ? 3 : 1, lab = num + '/' + den
        q = { prompt: 'Berapa bagian kue yang berwarna?', eq: null, ans: lab, alts: ['1/2', '1/3', '1/4', '3/4', '2/3'].filter(function (v) { return v !== lab }),
          scene: { mode: 'frac', den: den, num: num, groups: [] }, calc: { op: 'frac', num: num, den: den }, explain: 'Kue dibagi ' + den + ' sama besar, ' + num + ' bagian berwarna: ' + lab + '.', hint1: 'Hitung semua potongan kue.', hint2: 'Pecahan = bagian berwarna / semua bagian.' }
        break
      }
      case 'clock5': {
        var h = ri(r, 1, 12), m = 5 * ri(r, 1, 11), lab2 = clock5Label(h, m)
        q = { prompt: 'Lihat jamnya. Pukul berapa sekarang?', eq: null, ans: lab2,
          alts: [clock5Label(h, (m + 30) % 60 || 5), clock5Label(h % 12 + 1, m), clock5Label(h, m >= 10 ? m - 5 : m + 5), clock5Label(m / 5 > 12 ? h : (m / 5) || 12, h * 5 % 60 || 5)],
          scene: { mode: 'clock', h: h, m: m, groups: [] }, calc: { op: 'clock5', h: h, m: m }, explain: 'Jarum pendek dekat angka ' + h + ', jarum panjang di menit ' + m + ': ' + lab2.toLowerCase() + '.', hint1: 'Jarum panjang: tiap angka = 5 menit.', hint2: 'Jarum pendek menunjuk jamnya.' }
        break
      }
      case 'money': {
        var price = 500 * ri(r, 2, 16), pay = [2000, 5000, 10000].filter(function (v) { return v > price })[0] || 10000, chg = pay - price
        if (chg <= 0) { price = 3000; pay = 5000; chg = 2000 }
        q = { prompt: 'Harga roti ' + rp(price) + '. Kamu bayar ' + rp(pay) + '. Kembaliannya berapa?', eq: rp(pay) + ' − ' + rp(price) + ' = ?', ans: rp(chg),
          alts: [rp(chg + 500), rp(Math.max(500, chg - 500)), rp(chg + 1000), rp(price), rp(chg + 1500), rp(chg + 2000)], calc: { op: 'money', a: pay, b: price }, explain: rp(pay) + ' − ' + rp(price) + ' = ' + rp(chg) + '.', hint1: 'Kembalian = uang dibayar dikurangi harga.', hint2: 'Hitung dalam ribuan dulu.' }
        break
      }
      case 'measure': {
        if (r() < 0.5) {
          var mm = ri(r, 2, 9), cm = mm * 100
          q = { prompt: v.rope + ' panjangnya ' + mm + ' meter. Berapa sentimeter?', eq: mm + ' m = ? cm', ans: cm + ' cm', alts: [mm * 10 + ' cm', mm * 1000 + ' cm', (mm + 1) * 100 + ' cm'],
            calc: { op: 'm2cm', a: mm }, explain: '1 meter = 100 cm, jadi ' + mm + ' m = ' + cm + ' cm.', hint1: '1 meter sama dengan 100 sentimeter.', hint2: 'Kalikan dengan 100.' }
        } else {
          var k1 = ri(r, 2, 15), k2 = ri(r, 2, 15), kt = k1 + k2
          q = { prompt: 'Satu koper ' + k1 + ' kg, satu lagi ' + k2 + ' kg. Berat semuanya?', eq: k1 + ' kg + ' + k2 + ' kg = ?', ans: kt + ' kg', alts: [(kt + 1) + ' kg', (kt - 1) + ' kg', (kt + 10) + ' kg'],
            calc: { op: 'kg', a: k1, b: k2 }, explain: k1 + ' + ' + k2 + ' = ' + kt + ' kg.', hint1: 'Jumlahkan kedua berat.', hint2: 'Satuannya tetap kg.' }
        }
        break
      }
      default: {   // story: two steps, <= 18 words
        var s1 = ri(r, 3, 9), s2 = ri(r, 3, 9), gv = ri(r, 5, Math.min(40, s1 * s2 - 1)), res = s1 * s2 - gv
        q = { prompt: 'Ada ' + s1 + ' ' + v.crate + ', tiap ' + v.crate + ' ' + s2 + ' ' + noun + '. ' + gv + ' dibagikan. Sisa berapa?', eq: s1 + ' × ' + s2 + ' − ' + gv + ' = ?', ans: String(res),
          alts: numAlts(res, [gv > 10 ? 10 : 2, -1, 1, s2]), calc: { op: 'story', a: s1, b: s2, c: gv }, explain: s1 + ' × ' + s2 + ' = ' + (s1 * s2) + ', lalu ' + (s1 * s2) + ' − ' + gv + ' = ' + res + '.', hint1: 'Langkah 1: kalikan. Langkah 2: kurangi.', hint2: 'Semua ' + noun + ': ' + s1 + ' × ' + s2 + '.' }
        kind = 'story'
      }
    }
    var id = 'h-' + kind + '-' + JSON.stringify(q.calc).replace(/[^0-9a-z,]/gi, '')
    return { id: id, topic: 'matematika', domain: 'matematika', grade: HARD_GRADE[kind], level: 4, hard: true, kind: kind, prompt: q.prompt, eq: q.eq, visual: [], scene: q.scene || { mode: 'none', groups: [] },
      choices: uniq4(q.ans, q.alts, r), answer: q.ans, explain: q.explain, hint1: q.hint1, hint2: q.hint2, step1: q.hint1, calc: q.calc, world: theme || null, noun: noun }
  }
  // answer check for a Sulit question, recomputed from its calc
  function hardTruth (c) {
    switch (c.op) {
      case '+': return String(c.a + c.b)
      case '-': return String(c.a - c.b)
      case '*': return String(c.a * c.b)
      case '/': return c.a % c.b === 0 ? String(c.a / c.b) : null
      case 'frac': return c.num + '/' + c.den
      case 'clock5': return clock5Label(c.h, c.m)
      case 'money': return rp(c.a - c.b)
      case 'm2cm': return (c.a * 100) + ' cm'
      case 'kg': return (c.a + c.b) + ' kg'
      case 'story': return String(c.a * c.b - c.c)
    }
    return null
  }
  function validateSulit (q) {
    var p = [], hc = q.calc || {}, ht = hardTruth(hc)
    if (ht !== q.answer) p.push('answer ' + q.answer + ' != ' + ht)
    ;['a', 'b', 'c'].forEach(function (k) { if (hc[k] != null && (hc[k] < 0 || hc[k] > 10000)) p.push('operand out of range') })
    if ((hc.op === '+' || hc.op === '-') && (+ht < 0 || +ht > 1000)) p.push('result outside 0..1000')
    if (hc.op === '*' && (hc.a > 10 || hc.b > 10)) p.push('times table beyond 10x10')
    if (hc.op === 'clock5' && hc.m % 5) p.push('clock not on 5 minutes')
    if (hc.op === 'money' && (hc.a < 1000 || hc.a > 10000)) p.push('money outside Rp1.000–Rp10.000')
    if (String(q.prompt).trim().split(/\s+/).length > 18) p.push('story over 18 words')
    return p
  }

  SE.registerGenerator('matematika', faseA, { id: 'mat-a', grades: [1, 2], core: true, validate: validateA })
  SE.registerGenerator('matematika', sulit, { id: 'mat-sulit', grades: [3, 4], core: true, validate: validateSulit })
  SE.math = { clockLabel: clockLabel, clock5Label: clock5Label, rp: rp, hardTruth: hardTruth, kindFor: kindFor, KINDS: KINDS, HARD_KINDS: HARD_KINDS }
})()
