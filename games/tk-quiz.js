/* ============================================================================
 * tk-quiz.js — window.TKQuiz. Timmy & Kapal Legendaris (G30) learning engine.
 * PRD: documentation and standarization/TIMMY_LEGENDARY_SHIPS_PRD_v2.md §5 (learning),
 * §6 (motion), §7 (contract). Layout follows the owner mockup ui-08 "Knowledge Challenge":
 * parchment question card ("Soal 1 dari 5" + domain badge), sprite scene, 4 light-blue
 * answers (a row in landscape, 2x2 in portrait), stats column (Soal / Poin / Beruntun),
 * penguin captain + Timmy speech bubbles, progress dots, "Lanjut".
 *
 *   TKQuiz.make(domain, level, rng, opts?)  -> generated Matematika question (always valid)
 *   TKQuiz.pick(domain, level, rng, opts)    -> curated question (opts.islam, opts.world, opts.exclude)
 *   TKQuiz.build(spec)                       -> [questions] for spec {domain, world, count, level, grade, islam, mastery, seed}
 *   TKQuiz.validate(q)                       -> [] or a list of problems (used by the gate)
 *   TKQuiz.mastery                           -> { tier, present, levelFor, update }
 *   TKQuiz.mount(host, set, opts)            -> controller { el, state(), hint(), destroy() }
 *   TKQuiz.sortSet(domain, world, rng, opts) -> {prompt, bins, items}
 *   TKQuiz.mountSort(host, set, opts)        -> controller (drag archetype)
 * set  = [questions] or {domain, world, count, level, grade, islam, seed, type?:'sort'}
 * opts = { domain, grade, mastery (number | {domain:n}), islam, onDone({right, asked, hints,
 *          masteryDelta, mastery, points, byDomain}), sfx (fn(name) | {name:fn}), lib(key)->url,
 *          timmy (url), topInset (px), reducedMotion, seed }
 * Feedback is never a trap and never "SALAH": a wrong tap wiggles gently and climbs the hint
 * ladder (retry → highlight → animated counting → first step → guided completion).
 * Motion: transform/opacity only, ease-out cubic-bezier(.23,1,.32,1), press .96,
 * reduced motion = fades. Sound: SFXEngine.cue('correct'|'wrong'|'click'|'star'), guarded.
 * ==========================================================================*/
(function () {
  'use strict'
  var W = (typeof window !== 'undefined' ? window : globalThis)
  var EASE = 'cubic-bezier(.23,1,.32,1)'
  var BASE = (function () { try { return location.pathname.indexOf('/Dunia-Emosi/') === 0 ? '/Dunia-Emosi/' : '/' } catch (e) { return '/' } })()

  /* ── rng ──────────────────────────────────────────────────────────────── */
  function rng (seed) {
    var s = seed | 0
    return function () {
      var t = (s = (s + 0x6D2B79F5) | 0)
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }
  function ri (r, lo, hi) { return lo + Math.floor(r() * (hi - lo + 1)) }
  function shuffle (a, r) { var b = a.slice(); for (var i = b.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = b[i]; b[i] = b[j]; b[j] = t } return b }
  function oneOf (a, r) { return a[Math.floor(r() * a.length)] }
  function wpick (pairs, r) { var tot = 0, i; for (i = 0; i < pairs.length; i++) tot += pairs[i][1]; var x = r() * tot; for (i = 0; i < pairs.length; i++) { x -= pairs[i][1]; if (x < 0) return pairs[i][0] } return pairs[pairs.length - 1][0] }
  function esc (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';' }) }
  function bank () { return (W.TKQuestions && W.TKQuestions.items) || [] }

  /* ══ MATEMATIKA GENERATOR ═════════════════════════════════════════════ */
  var THEME = {
    _: [['game/crate-wood', 'peti'], ['game/barrel', 'tong'], ['animals/clownfish', 'ikan'], ['game/star', 'bintang']],
    kamar: [['toys/rubber-duck', 'bebek karet'], ['game/star', 'bintang']],
    titanic: [['game/crate-wood', 'peti'], ['school/backpack-brown', 'tas'], ['game/lifebuoy', 'pelampung']],
    britannic: [['things/first-aid-kit', 'kotak obat'], ['food/water-bottle', 'botol air']],
    vasa: [['game/barrel', 'tong'], ['game/crate-wood', 'peti']],
    cuttysark: [['food/mug', 'cangkir teh'], ['game/crate-wood', 'peti']],
    victory: [['game/flag-red', 'bendera'], ['game/barrel', 'tong']],
    mayflower: [['food/apple', 'apel'], ['food/bread', 'roti'], ['game/barrel', 'tong']],
    endurance: [['animals/penguin', 'penguin'], ['game/crystal-ice', 'bongkah es']],
    kontiki: [['food/coconut', 'kelapa'], ['animals/clownfish', 'ikan']],
    calypso: [['animals/clownfish', 'ikan'], ['animals/starfish', 'bintang laut'], ['animals/sea-turtle', 'penyu']],
    queenmary: [['school/backpack-brown', 'tas'], ['game/crate-wood', 'peti']],
    arizona: [['game/flag-red', 'bendera'], ['game/crate-wood', 'peti']],
    missouri: [['game/flag-red', 'bendera'], ['game/crate-wood', 'peti']],
    nautilus: [['animals/clownfish', 'ikan'], ['animals/pufferfish', 'ikan buntal']]
  }
  var KINDS = {
    1: [['count', 40], ['add', 25], ['sub', 20], ['biggest', 15]],
    2: [['add', 25], ['sub', 25], ['groups', 15], ['clock', 15], ['count', 10], ['diff', 10]],
    3: [['add', 20], ['sub', 20], ['share', 15], ['capacity', 15], ['clock', 15], ['groups', 15]],
    4: [['twostep', 40], ['diff', 15], ['groupsplus', 15], ['share', 10], ['clock', 10], ['capacity', 10]]
  }
  function cap (level) { return level <= 2 ? 10 : 20 }
  function clockLabel (h, m) { return m === 30 ? 'Pukul setengah ' + (h % 12 + 1) : 'Pukul ' + h }
  function numChoices (ans, near, r, max) {
    var seen = {}, out = [ans]; seen[ans] = 1
    var pool = shuffle(near.concat([ans + 1, ans - 1, ans + 2, ans - 2]), r)
    for (var i = 0; i < pool.length && out.length < 4; i++) { var v = pool[i]; if (v >= 0 && v <= max + 3 && !seen[v] && v === Math.round(v)) { seen[v] = 1; out.push(v) } }
    for (var d = 3; out.length < 4; d++) { [ans + d, ans - d].forEach(function (v) { if (out.length < 4 && v >= 0 && !seen[v]) { seen[v] = 1; out.push(v) } }) }
    return shuffle(out, r).map(String)
  }

  function make (domain, level, r, opts) {
    opts = opts || {}; r = r || Math.random
    level = Math.max(1, Math.min(4, level | 0 || 1))
    var th = THEME[opts.world] || THEME._, it = oneOf(th, r), key = it[0], noun = it[1]
    var kinds = KINDS[level]
    if (opts.world === 'queenmary') kinds = kinds.concat([['clock', 60]])
    if (opts.kind) kinds = [[opts.kind, 1]]
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
        q = { prompt: 'Ada ' + a + ' ' + noun + ' di kapal. ' + b + ' ' + noun + ' lagi dimuat. Berapa ' + noun + ' sekarang?', eq: a + ' + ' + b + ' = ?', ans: s,
          near: [a, b, Math.abs(a - b), s + 1, s - 1], scene: { mode: 'add', groups: [G(key, a), G(key, b, 'add')] },
          hint1: 'Gabungkan dua kelompok ' + noun + '.', hint2: 'Mulai dari ' + a + ', lalu hitung maju ' + b + ' lagi.',
          step1: 'Mulai dari ' + a + ': ' + seqStr(a + 1, Math.min(s, a + 2)) + (b > 2 ? ', …' : ''), explain: a + ' + ' + b + ' = ' + s + '. Semua ' + noun + ' naik ke kapal!', calc: { op: '+', a: a, b: b } }
        break
      }
      case 'sub': {
        var a2 = ri(r, 3, M), b2 = ri(r, 1, Math.min(a2 - 1, level <= 2 ? 5 : 9)), d2 = a2 - b2
        q = { prompt: 'Ada ' + a2 + ' ' + noun + ' di dek. ' + b2 + ' ' + noun + ' diturunkan ke dermaga. Berapa ' + noun + ' yang masih di dek?', eq: a2 + ' − ' + b2 + ' = ?', ans: d2,
          near: [a2 + b2 <= M + 3 ? a2 + b2 : d2 + 3, b2, a2, d2 + 1, d2 - 1], scene: { mode: 'sub', groups: [G(key, d2), G(key, b2, 'leave')] },
          hint1: 'Yang diturunkan tidak dihitung lagi.', hint2: 'Tutup ' + b2 + ' ' + noun + ' yang pergi, hitung sisanya.',
          step1: 'Mulai dari ' + a2 + ', hitung mundur ' + b2 + ': ' + seqStr(a2 - 1, Math.max(d2, a2 - 2), -1) + (b2 > 2 ? ', …' : ''), explain: a2 + ' − ' + b2 + ' = ' + d2 + '.', calc: { op: '-', a: a2, b: b2 } }
        break
      }
      case 'biggest': {
        var vals = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], r).slice(0, 4), mx = Math.max.apply(null, vals)
        q = { prompt: 'Kapten butuh kapal dengan peti paling banyak. Angka mana yang paling besar?', eq: null, ans: mx, fixed: vals.map(String),
          scene: { mode: 'none', groups: [] }, hint1: 'Angka besar artinya lebih banyak.', hint2: 'Bayangkan urutan 1 sampai 10. Mana yang paling akhir?',
          step1: 'Bandingkan dua angka dulu, simpan yang lebih besar.', explain: mx + ' adalah angka paling besar.', calc: { op: 'max', list: vals } }
        break
      }
      case 'groups': case 'groupsplus': {
        var g = ri(r, 2, level <= 2 ? 3 : 4), k = ri(r, 2, level <= 2 ? Math.floor(10 / g) : Math.min(5, Math.floor((kind === 'groupsplus' ? 17 : 20) / g)))
        var e = kind === 'groupsplus' ? ri(r, 1, Math.min(3, 20 - g * k)) : 0, tot = g * k + e
        var grp = []; for (var gi = 0; gi < g; gi++) grp.push(G(key, k, 'group'))
        if (e) grp.push(G(key, e, 'add'))
        q = { prompt: 'Ada ' + g + ' sekoci. Tiap sekoci membawa ' + k + ' ' + noun + '.' + (e ? ' Lalu ' + e + ' ' + noun + ' lagi datang.' : '') + ' Berapa ' + noun + ' semuanya?',
          eq: new Array(g + 1).join(k + ' + ').slice(0, -3) + (e ? ' + ' + e : '') + ' = ?', ans: tot, near: [g + k, g * k + (e ? 0 : k), tot + k, tot - 1, tot + 1],
          scene: { mode: 'groups', groups: grp }, hint1: 'Hitung isi setiap sekoci.', hint2: 'Tiap sekoci ' + k + '. Hitung loncat: ' + seqStr(k, k * Math.min(g, 3), k) + (g > 3 ? ', …' : ''),
          step1: k + ' + ' + k + ' = ' + (2 * k) + (g > 2 || e ? ', lalu tambah lagi.' : '.'), explain: 'Semuanya ' + tot + ' ' + noun + '.', calc: { op: 'groups', g: g, k: k, e: e } }
        break
      }
      case 'share': {
        var g3 = ri(r, 2, 4), k3 = ri(r, 2, Math.floor((level <= 3 ? 16 : 20) / g3)), t3 = g3 * k3
        q = { prompt: t3 + ' ' + noun + ' dibagi sama rata ke ' + g3 + ' sekoci. Berapa ' + noun + ' di tiap sekoci?', eq: t3 + ' : ' + g3 + ' = ?', ans: k3,
          near: [k3 + 1, k3 - 1, g3, k3 + 2], scene: { mode: 'share', groups: [G(key, t3)], boats: g3 },
          hint1: 'Bagikan satu per satu ke tiap sekoci, bergiliran.', hint2: 'Tiap sekoci harus dapat sama banyak.',
          step1: 'Beri 1 ' + noun + ' ke tiap sekoci: sudah ' + g3 + ' terbagi. Ulangi sampai habis.', explain: t3 + ' dibagi ' + g3 + ' = ' + k3 + '. Tiap sekoci dapat ' + k3 + '.', calc: { op: 'share', t: t3, g: g3 } }
        break
      }
      case 'capacity': {
        var c = ri(r, 5, level <= 3 ? 10 : 12), x = ri(r, 1, c - 1), room = c - x
        q = { prompt: 'Sekoci ini muat ' + c + ' orang. Sudah ada ' + x + ' orang. Berapa orang lagi yang bisa naik?', eq: c + ' − ' + x + ' = ?', ans: room,
          near: [c, x, room + 1, room - 1, c + x <= 20 ? c + x : room + 2], scene: { mode: 'capacity', cap: c, fill: x, groups: [] },
          hint1: 'Hitung kursi yang masih kosong.', hint2: 'Kursi kosong = kursi semua dikurangi yang sudah terisi.',
          step1: 'Mulai dari ' + x + ', hitung maju sampai ' + c + '.', explain: c + ' − ' + x + ' = ' + room + '. Masih ada ' + room + ' kursi kosong.', calc: { op: '-', a: c, b: x } }
        break
      }
      case 'diff': {
        var p = ri(r, 3, M), o = ri(r, 1, p - 1), df = p - o
        var red = r() < 0.5
        q = { prompt: 'Kapal Merah membawa ' + (red ? p : o) + ' ' + noun + '. Kapal Biru membawa ' + (red ? o : p) + ' ' + noun + '. Berapa selisihnya?', eq: p + ' − ' + o + ' = ?', ans: df,
          near: [p + o <= M + 3 ? p + o : df + 3, df + 1, df - 1, o], scene: { mode: 'diff', groups: [G(key, red ? p : o, 'red'), G(key, red ? o : p, 'blue')] },
          hint1: 'Selisih artinya berapa lebih banyak.', hint2: 'Pasangkan satu-satu. Hitung yang tidak punya pasangan.',
          step1: 'Yang banyak ' + p + ', yang sedikit ' + o + '. Hitung dari ' + o + ' sampai ' + p + '.', explain: p + ' − ' + o + ' = ' + df + '.', calc: { op: '-', a: p, b: o } }
        break
      }
      case 'twostep': {
        var a4 = ri(r, 3, 12), b4 = ri(r, 2, Math.min(8, 20 - a4)), c4 = ri(r, 1, Math.min(9, a4 + b4 - 1)), res = a4 + b4 - c4
        q = { prompt: 'Ada ' + a4 + ' ' + noun + ' di kapal. ' + b4 + ' lagi dimuat, lalu ' + c4 + ' diturunkan. Berapa ' + noun + ' sekarang?', eq: a4 + ' + ' + b4 + ' − ' + c4 + ' = ?', ans: res,
          near: [a4 + b4, a4 - c4 >= 0 ? a4 - c4 : res + 2, res + 1, res - 1, res + 2], scene: { mode: 'twostep', groups: [G(key, a4), G(key, b4, 'add')], leave: c4 },
          hint1: 'Kerjakan satu langkah dulu.', hint2: 'Langkah 1: tambah yang dimuat. Langkah 2: kurangi yang diturunkan.',
          step1: 'Langkah 1: ' + a4 + ' + ' + b4 + ' = ' + (a4 + b4) + '. Sekarang kurangi ' + c4 + '.', explain: a4 + ' + ' + b4 + ' = ' + (a4 + b4) + ', lalu ' + (a4 + b4) + ' − ' + c4 + ' = ' + res + '.',
          calc: { op: 'two', a: a4, b: b4, c: c4 } }
        break
      }
      case 'clock': {
        var h = ri(r, 1, 12), half = level >= 3 && r() < 0.6, m = half ? 30 : 0, lab = clockLabel(h, m)
        var alt = [clockLabel(h % 12 + 1, m), clockLabel((h + 10) % 12 + 1, m), clockLabel(h, half ? 0 : 30), clockLabel(h % 12 + 1, half ? 0 : 30)]
        var ch = [lab]; alt.forEach(function (v) { if (ch.length < 4 && ch.indexOf(v) < 0) ch.push(v) })
        q = { prompt: 'Kapal berangkat tepat waktu. Pukul berapa sekarang?', eq: null, ans: lab, fixed: ch,
          scene: { mode: 'clock', h: h, m: m, groups: [] }, hint1: 'Lihat jarum pendek dulu.', hint2: half ? 'Jarum panjang di angka 6 artinya setengah.' : 'Jarum panjang di angka 12 artinya tepat.',
          step1: 'Jarum pendek ' + (half ? 'di antara ' + h + ' dan ' + (h % 12 + 1) : 'menunjuk angka ' + h) + '.',
          explain: half ? 'Jarum panjang di 6 dan jarum pendek lewat angka ' + h + ': ' + lab.toLowerCase() + '.' : 'Jarum pendek di ' + h + ' dan jarum panjang di 12: ' + lab.toLowerCase() + '.',
          calc: { op: 'clock', h: h, m: m } }
        break
      }
    }
    var choices = q.fixed ? shuffle(q.fixed, r) : numChoices(q.ans, q.near, r, M)
    var visual = []; (q.scene.groups || []).forEach(function (g) { if (visual.indexOf(g.key) < 0) visual.push(g.key) })
    var id = 'm' + level + '-' + kind + '-' + JSON.stringify(q.calc).replace(/[^0-9a-z,]/gi, '')
    return { id: id, domain: 'matematika', level: level, kind: kind, prompt: q.prompt, eq: q.eq, visual: visual, scene: q.scene,
      choices: choices, answer: String(q.ans), explain: q.explain, hint1: q.hint1, hint2: q.hint2, step1: q.step1, calc: q.calc, world: opts.world || null }
  }
  function seqStr (from, to, step) { step = step || 1; var o = []; for (var v = from; step > 0 ? v <= to : v >= to; v += step) o.push(v); return o.join(', ') }

  /* validation: the gate runs this on every generated item */
  function validate (q) {
    var p = []
    if (!q || !q.choices) return ['missing']
    if (q.choices.length !== 4) p.push('choices != 4')
    var seen = {}; q.choices.forEach(function (c) { if (seen[c]) p.push('duplicate choice ' + c); seen[c] = 1 })
    var hits = q.choices.filter(function (c) { return c === q.answer }).length
    if (hits !== 1) p.push('answer present ' + hits + 'x')
    if (q.domain === 'matematika') {
      var c = q.calc || {}, M = cap(q.level), truth
      if (c.op !== 'clock') {
        q.choices.forEach(function (x) { if (!/^\d+$/.test(x)) p.push('non-integer/negative choice ' + x) })
        if (c.op === 'count') truth = c.n
        else if (c.op === '+') truth = c.a + c.b
        else if (c.op === '-') truth = c.a - c.b
        else if (c.op === 'max') truth = Math.max.apply(null, c.list)
        else if (c.op === 'groups') truth = c.g * c.k + c.e
        else if (c.op === 'share') truth = c.t % c.g === 0 ? c.t / c.g : NaN
        else if (c.op === 'two') { truth = c.a + c.b - c.c; if (c.a + c.b > M) p.push('intermediate > ' + M) }
        if (String(truth) !== q.answer) p.push('answer ' + q.answer + ' != ' + truth)
        if (!(truth >= 0)) p.push('negative/invalid truth')
        ;['a', 'b', 'c', 'n', 't'].forEach(function (k) { if (c[k] != null && (c[k] < 0 || c[k] > M)) p.push('operand ' + k + '=' + c[k] + ' outside 0..' + M) })
        if (truth > M) p.push('answer above ' + M)
        if (c.op === 'max' && q.choices.filter(function (x) { return +x === truth }).length !== 1) p.push('max not unique')
      } else if (clockLabel(c.h, c.m) !== q.answer) p.push('clock label mismatch')
    }
    return p
  }

  /* ══ MASTERY (0–100 per domain; the caller persists it) ═══════════════ */
  var mastery = {
    tier: function (m) { m = +m || 0; return m <= 30 ? 1 : m <= 60 ? 2 : m <= 80 ? 3 : 4 },
    present: function (m) {
      var t = mastery.tier(m)
      return { tier: t, key: ['objects', 'equation', 'context', 'twostep'][t - 1], objects: t <= 2, equation: t === 2, hintButton: t >= 3 }
    },
    levelFor: function (m, grade) {
      var t = mastery.tier(m), g = normGrade(grade)
      return g === 1 ? Math.min(t, 2) : g === 2 ? Math.max(2, t) : t
    },
    // res: { right, firstTry, rung, streak } -> new score (0..100)
    update: function (m, res) {
      m = +m || 0
      var d = !res.right ? -3 : res.firstTry ? 5 + Math.min(res.streak || 0, 5) : res.rung <= 2 ? 2 : 0
      return Math.max(0, Math.min(100, m + d))
    }
  }
  function normGrade (g) { if (g == null) return 0; var s = String(g); return /1/.test(s) ? 1 : /2/.test(s) ? 2 : 0 }

  /* ══ CURATED PICK ════════════════════════════════════════════════════ */
  function present (item, r) {
    var o = {}; for (var k in item) o[k] = item[k]
    o.choices = shuffle(item.choices, r)
    return o
  }
  function enabledDomains (opts) {
    var d = (opts && opts.domains) || ['matematika', 'umum', 'arab', 'logika', 'islam']
    return d.filter(function (x) { return !(opts && opts.islam === false && x === 'islam') })
  }
  function pick (domain, level, r, opts) {
    opts = opts || {}; r = r || Math.random; level = Math.max(1, Math.min(4, level | 0 || 1))
    if (domain === 'campur') domain = chooseDomain(r, opts)
    if (domain === 'matematika') return make('matematika', level, r, opts)
    if (domain === 'islam' && opts.islam === false) return null
    var ex = opts.exclude || {}
    var all = bank().filter(function (o) { return o.domain === domain && !(opts.islam === false && o.islam) && !ex[o.id] })
    if (!all.length) return null
    var pool = all.filter(function (o) { return o.level === level })
    if (!pool.length) pool = all.filter(function (o) { return Math.abs(o.level - level) <= 1 })
    if (!pool.length) pool = all
    if (opts.world) {
      var wp = all.filter(function (o) { return o.world === opts.world && o.level <= level + 1 })
      if (wp.length && (r() < 0.8 || !pool.length)) pool = wp
    }
    return present(oneOf(pool, r), r)
  }
  function chooseDomain (r, opts) {
    var ds = enabledDomains(opts)
    if (opts && opts.world) {
      var ex = opts.exclude || {}
      var withWorld = ds.filter(function (d) { return d === 'matematika' || bank().some(function (o) { return o.domain === d && o.world === opts.world && !ex[o.id] && !(opts.islam === false && o.islam) }) })
      if (withWorld.length && r() < 0.7) ds = withWorld
    }
    return oneOf(ds, r)
  }
  function masteryOf (ms, d) { return typeof ms === 'number' ? ms : (ms && ms[d]) || 0 }
  function build (spec) {
    spec = spec || {}
    var r = spec.rng || rng(spec.seed != null ? spec.seed : (Date.now() & 0x7fffffff)), n = spec.count || 5, out = [], used = {}
    for (var i = 0; i < n; i++) {
      var d = spec.domain || 'campur'
      if (d === 'campur') d = chooseDomain(r, { islam: spec.islam, world: spec.world, exclude: used, domains: spec.domains })
      if (d === 'islam' && spec.islam === false) d = 'umum'
      var lv = spec.level || mastery.levelFor(masteryOf(spec.mastery, d), spec.grade)
      var q = null
      for (var t = 0; t < 10 && (!q || used[q.id]); t++) q = pick(d, lv, r, { islam: spec.islam, world: spec.world, exclude: used })
      if (!q) q = pick('umum', lv, r, { islam: spec.islam, world: spec.world, exclude: used })
      if (!q) continue
      used[q.id] = 1; out.push(q)
    }
    return out
  }

  /* ══ SORT SETS ═══════════════════════════════════════════════════════ */
  function sortSet (domain, world, r, opts) {
    opts = opts || {}; r = r || Math.random
    var S = (W.TKQuestions && W.TKQuestions.sorts) || []
    var ok = function (s) { return !(opts.islam === false && s.islam) }
    var cand = S.filter(function (s) { return ok(s) && (s.world === world || (s.worlds && s.worlds.indexOf(world) >= 0)) })
    if (cand.length > 1 && domain) { var cd = cand.filter(function (s) { return s.domain === domain }); if (cd.length) cand = cd }
    if (!cand.length) cand = S.filter(function (s) { return ok(s) && s.domain === domain && !s.world })
    if (!cand.length) cand = S.filter(function (s) { return ok(s) && s.domain === domain })
    if (!cand.length) cand = S.filter(function (s) { return ok(s) && s.id === 'so-habitat' })
    var s = oneOf(cand, r)
    if (s.capacity) return capacitySet(s, r)
    var n = Math.max(6, Math.min(8, opts.count || 6)), per = Math.max(2, Math.floor(n / s.bins.length)), items = []
    s.bins.forEach(function (b) { items = items.concat(shuffle(s.items.filter(function (x) { return x.bin === b.id }), r).slice(0, per)) })
    return { id: s.id, domain: s.domain, world: s.world || null, prompt: s.prompt, bins: s.bins.slice(), items: shuffle(items, r), islam: !!s.islam }
  }
  function capacitySet (s, r) {
    var items = [], fam = 0
    s.bins.forEach(function () {
      var left = 5
      while (left > 0) { var k = left <= 2 ? left : ri(r, 2, Math.min(4, left - 1)); items.push({ id: 'f' + (fam++), label: 'Keluarga ' + k + ' orang', n: k, people: k, bin: '*' }); left -= k }
    })
    return { id: s.id, domain: s.domain, world: s.world, prompt: s.prompt, capacity: true, bins: s.bins.map(function (b) { return { id: b.id, label: b.label, cap: b.cap } }), items: shuffle(items, r) }
  }

  /* ══ UI ═════════════════════════════════════════════════════════════ */
  // Icons come from the owner's sprites via window.TKIcon (ICONS table in timmy-kapal.js) — no
  // glyphs, no drawn pictograms. Getters, because timmy-kapal.js (which defines TKIcon) loads after
  // this file; outside the game (QA harness) an icon is simply omitted.
  function ic (n, cls, alt) { return W.TKIcon ? W.TKIcon(n, cls, alt) : '' }
  var personN = 0
  function npeople () { return (W.TKIcon && W.TKIcon.PEOPLE) || 1 }
  function person () { return ic('p' + (personN++ % npeople()), 'tkq-p') }
  function people (n, seed) { var h = ''; for (var i = 0; i < n; i++) h += ic('p' + ((seed * 3 + i) % npeople()), 'tkq-p'); return h }
  var ICON = {}
  Object.defineProperties(ICON, {
    check: { get: function () { return ic('ok') } }, arrow: { get: function () { return ic('next') } },
    lamp: { get: function () { return ic('hint') } }, speaker: { get: function () { return ic('listen') } },
    plus: { get: function () { return '<b class="tkq-opx" aria-label="tambah">+</b>' } }, minus: { get: function () { return '<b class="tkq-opx" aria-label="kurang">-</b>' } },
    person: { get: person }, seat: { get: function () { return '<span class="tkq-seat" aria-hidden="true"></span>' } },
    ship: { get: function () { return ic('ship') } }, boat: { get: function () { return ic('lifeboat') } }
  })
  var DOMAIN_UI = {
    matematika: { label: 'Matematika', icon: 'gt/q-math' }, islam: { label: 'Studi Islam', icon: 'gt/q-islamic' },
    arab: { label: 'Bahasa Arab', icon: 'school/books' },
    umum: { label: 'Pengetahuan Umum', icon: 'school/globe' }, logika: { label: 'Logika', icon: 'things/light-bulb' }
  }
  var PRAISE = ['Hebat! Kamu makin pintar!', 'Luar biasa!', 'Tepat sekali!', 'Pintar! Ayo lanjut!', 'Keren, kamu berhasil!']
  var ENCOURAGE = ['Tidak apa-apa, coba lagi ya!', 'Hampir! Lihat petunjuknya.', 'Ayo, kita cari bersama!', 'Pelan-pelan saja, kamu bisa!']

  var CSS = [
    '.tkq{position:absolute;inset:0;box-sizing:border-box;display:grid;gap:10px;padding:10px 12px 10px;font-family:"Fredoka One","Fredoka","Baloo 2",system-ui,sans-serif;color:#3A2A10;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;overflow:hidden}',
    '.tkq *{box-sizing:border-box}',
    '.tkq-tall{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr) auto auto}',
    '.tkq-wide{grid-template-columns:minmax(150px,20%) minmax(0,1fr) minmax(160px,19%);grid-template-rows:minmax(0,1fr) auto}',
    '.tkq-wide .tkq-left{grid-column:1;grid-row:1}.tkq-wide .tkq-card{grid-column:2;grid-row:1}.tkq-wide .tkq-right{grid-column:3;grid-row:1}.tkq-wide .tkq-foot{grid-column:1/4;grid-row:2}',
    '.tkq-card{position:relative;min-height:0;display:flex;flex-direction:column;gap:8px;padding:12px 14px 14px;background:#FBF1DC;border:3px solid #E2C999;border-radius:22px;box-shadow:0 10px 26px rgba(20,30,60,.28),inset 0 0 0 3px #FFF8E8;overflow:auto;overscroll-behavior:contain}',
    '.tkq-head{display:flex;align-items:center;gap:8px;min-height:40px}',
    '.tkq-count{font-size:15px;color:#6B4B1F;flex:1}',
    '.tkq-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 10px 4px 5px;background:#1F3B73;color:#fff;border-radius:999px;font-size:14px;white-space:nowrap}',
    '.tkq-badge img,.tkq-badge svg{width:28px;height:28px;object-fit:contain}',
    '.tkq-btn{appearance:none;border:0;font:inherit;cursor:pointer;touch-action:manipulation;transition:transform .16s ' + EASE + ',opacity .2s ' + EASE + '}',
    '.tkq-btn:active:not(:disabled){transform:scale(.96)}',
    '.tkq-hintbtn{display:inline-flex;align-items:center;gap:4px;min-height:56px;min-width:56px;padding:4px 10px;border-radius:16px;background:#FFF3C4;border:2px solid #E8C860;color:#6B4B1F;font-size:14px}',
    '.tkq-hintbtn svg{width:28px;height:28px}',
    '.tkq-prompt{font-size:clamp(18px,2.6vw,24px);line-height:1.3;text-align:center;color:#2A1C08}',
    '.tkq-eq{align-self:center;font-size:clamp(22px,3.4vw,32px);color:#1F3B73;padding:2px 14px;border-radius:12px;background:#fff;border:2px dashed #BFD6F2;letter-spacing:.04em;transition:opacity .3s ' + EASE + ',transform .3s ' + EASE + '}',
    '.tkq-eq[hidden]{display:none}',
    '.tkq-scene{position:relative;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:6px 10px;min-height:92px;padding:6px 4px}',
    '.tkq-grp{position:relative;display:flex;flex-wrap:wrap;justify-content:center;align-content:center;gap:3px;max-width:46%;padding:4px;border-radius:14px}',
    '.tkq-grp.boat{background:rgba(244,227,189,.9);border:2px solid #C9A56A;max-width:30%}',
    '.tkq-grp.red{background:rgba(229,57,53,.12);border:2px solid rgba(229,57,53,.5)}.tkq-grp.blue{background:rgba(30,136,229,.12);border:2px solid rgba(30,136,229,.5)}',
    '.tkq-grp .tag{position:absolute;top:-10px;left:8px;font-size:11px;padding:1px 6px;border-radius:8px;color:#fff}.tkq-grp.red .tag{background:#E53935}.tkq-grp.blue .tag{background:#1E88E5}',
    '.tkq-o{position:relative;width:var(--s,44px);height:var(--s,44px);display:flex;align-items:center;justify-content:center;opacity:0;transform:translateY(10px) scale(.8);transition:opacity .35s ' + EASE + ',transform .45s ' + EASE + '}',
    '.tkq-o.in{opacity:1;transform:none}',
    '.tkq-o img,.tkq-o svg{width:100%;height:100%;object-fit:contain;pointer-events:none;-webkit-user-drag:none}',
    '.tkq-o.leave.in{opacity:.38}',
    '.tkq-o.leave::after{content:"";position:absolute;inset:2px;border:2px dashed #8A6A1E;border-radius:10px}',
    '.tkq-o.hl::before{content:"";position:absolute;inset:-4px;border-radius:50%;background:radial-gradient(circle,rgba(255,213,74,.75),rgba(255,213,74,0) 70%);animation:tkqPulse 1.2s ' + EASE + ' infinite;z-index:-1}',
    '.tkq-o .n{position:absolute;right:-4px;top:-6px;min-width:20px;height:20px;padding:0 4px;border-radius:10px;background:#1F3B73;color:#fff;font-size:12px;line-height:20px;text-align:center;opacity:0;transform:scale(.5);transition:opacity .25s ' + EASE + ',transform .3s ' + EASE + '}',
    '.tkq-o .n.on{opacity:1;transform:none}',
    '.tkq-op{width:40px;height:40px;flex:none;opacity:0;transition:opacity .35s ' + EASE + '}.tkq-op.in{opacity:1}.tkq-op svg{width:100%;height:100%}',
    '.tkq-ship{width:108px;flex:none;align-self:flex-end;transition:transform .5s ' + EASE + '}.tkq-ship svg{width:100%;height:auto;display:block}',
    '.tkq-ship img{width:100%;height:auto;display:block}.tkq-ship.done img{animation:tkqBob .6s ' + EASE + '}@keyframes tkqBob{40%{transform:translateY(-6px)}}',
    '.tkq-q{width:var(--s,44px);height:var(--s,44px);border-radius:12px;border:3px dashed #C9A56A;background:#fff;display:flex;align-items:center;justify-content:center;color:#8A6A1E;font-size:26px}',
    '.tkq-swatch{width:96px;height:64px;border-radius:14px;border:3px solid #6B4B1F;box-shadow:inset 0 0 0 3px rgba(255,255,255,.6)}',
    '.tkq-arw{display:flex;flex-direction:column;align-items:center;gap:2px}',
    '.tkq-ar{font-family:"Noto Naskh Arabic","Amiri","Scheherazade New","Geeza Pro","Traditional Arabic","Noto Sans Arabic",serif;direction:rtl;unicode-bidi:isolate;line-height:1.5}',
    '.tkq-arw .tkq-ar{font-size:44px;color:#1F3B73}.tkq-tr{font-family:system-ui,sans-serif;font-size:14px;color:#6B4B1F;font-style:italic}',
    '.tkq-say{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-width:56px;min-height:56px;padding:6px 14px;border-radius:18px;background:#1F3B73;color:#fff;font-size:15px}.tkq-say svg{width:26px;height:26px}',
    '.tkq-clock{width:128px;height:128px}',
    '.tkq-help{min-height:22px;text-align:center;font-size:16px;color:#1F5F2A;opacity:0;transform:translateY(4px);transition:opacity .3s ' + EASE + ',transform .3s ' + EASE + '}.tkq-help.on{opacity:1;transform:none}',
    '.tkq-ans{display:grid;gap:10px}.tkq-tall .tkq-ans{grid-template-columns:repeat(2,minmax(0,1fr))}.tkq-wide .tkq-ans{grid-template-columns:repeat(4,minmax(0,1fr))}',
    '.tkq-opt{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:64px;min-width:56px;padding:8px 6px;border-radius:16px;background:linear-gradient(#EEF6FF,#CFE4FB);border:2px solid #9CC3EA;box-shadow:0 3px 0 #8DB3DD;color:#1F3B73;font-size:clamp(17px,2.4vw,24px);line-height:1.15;text-align:center;opacity:0;transform:translateY(8px)}',
    '.tkq-opt.in{opacity:1;transform:none}',
    '.tkq-opt.num{font-size:clamp(26px,3.6vw,34px)}',
    '.tkq-opt img{width:52px;height:52px;object-fit:contain;pointer-events:none}.tkq-opt .lb{font-size:14px}',
    '.tkq-opt .tkq-ar{font-size:30px}.tkq-opt .tkq-tr{font-size:12px}',
    '.tkq-opt.ok{background:linear-gradient(#3CC460,#1E9A3E);border-color:#15803A;box-shadow:0 3px 0 #11662E;color:#fff}',
    '.tkq-opt.ok .tkq-tr,.tkq-opt.ok .lb{color:#fff}',
    '.tkq-opt .ck{position:absolute;top:4px;right:6px;width:22px;height:22px;opacity:0;transform:scale(.4);transition:opacity .25s ' + EASE + ',transform .35s ' + EASE + '}.tkq-opt.ok .ck{opacity:1;transform:none}',
    '.tkq-opt.tried{opacity:.42}',
    '.tkq-opt.no{animation:tkqWiggle .42s ' + EASE + '}',
    '.tkq-opt.guide{animation:tkqPulse 1.1s ' + EASE + ' infinite}',
    '.tkq-opt:disabled{cursor:default}',
    '.tkq-explain{font-size:16px;text-align:center;color:#2A1C08;background:#fff;border-radius:14px;padding:8px 10px;border:2px solid #CDE9C8;opacity:0;transform:translateY(6px);transition:opacity .3s ' + EASE + ',transform .3s ' + EASE + '}.tkq-explain.on{opacity:1;transform:none}.tkq-explain[hidden]{display:none}',
    '.tkq-side{position:relative;min-height:0;display:flex;flex-direction:column;justify-content:flex-end;gap:8px}',
    '.tkq-stats{display:flex;flex-direction:column;gap:8px;padding:10px;background:rgba(18,36,78,.9);border:2px solid rgba(160,190,240,.45);border-radius:18px;color:#fff}',
    '.tkq-stat{display:flex;align-items:center;gap:8px}.tkq-stat img{width:36px;height:36px;object-fit:contain}.tkq-stat b{font-size:22px;display:block;line-height:1}.tkq-stat small{font-family:system-ui,sans-serif;font-size:12px;opacity:.85}',
    '.tkq-stat b.bump{animation:tkqBump .45s ' + EASE + '}',
    '.tkq-tall .tkq-stats{flex-direction:row;justify-content:space-around;padding:6px 8px;border-radius:16px}.tkq-tall .tkq-stat img{width:28px;height:28px}.tkq-tall .tkq-stat b{font-size:18px}',
    '.tkq-char{display:flex;align-items:flex-end;gap:6px}.tkq-char img{height:clamp(84px,17vh,190px);width:auto;max-width:100%;object-fit:contain;transform-origin:50% 100%}',
    '.tkq-char.peng img{height:clamp(70px,14vh,150px)}',
    '.tkq-bub{position:relative;max-width:230px;background:#fff;border-radius:16px;padding:8px 10px 8px;font-family:system-ui,sans-serif;font-size:14px;line-height:1.3;color:#1F2A44;box-shadow:0 4px 12px rgba(0,0,0,.18);transition:opacity .25s ' + EASE + ',transform .3s ' + EASE + '}',
    '.tkq-bub b{display:inline-block;margin:-18px 0 4px;padding:2px 10px;border-radius:10px;background:#1F4FA0;color:#fff;font-family:"Fredoka One",system-ui,sans-serif;font-weight:normal;font-size:13px}',
    '.tkq-bub.pop{animation:tkqPop .38s ' + EASE + '}',
    '.tkq-wide .tkq-left .tkq-char{flex-direction:column;align-items:flex-start}.tkq-wide .tkq-right .tkq-char{flex-direction:column;align-items:flex-end}',
    '.tkq-foot{display:flex;align-items:center;justify-content:space-between;gap:10px}',
    '.tkq-dots{display:flex;gap:8px;align-items:center;flex-wrap:wrap}',
    '.tkq-dot{width:14px;height:14px;border-radius:50%;background:rgba(255,255,255,.55);border:2px solid rgba(20,40,90,.45);transition:transform .3s ' + EASE + '}',
    '.tkq-dot.cur{transform:scale(1.35);background:#fff;border-color:#1F4FA0}.tkq-dot.right{background:#2EAD4B;border-color:#15803A}.tkq-dot.help{background:#FFB300;border-color:#B07A00}',
    '.tkq-next{display:inline-flex;align-items:center;gap:8px;min-height:60px;min-width:150px;padding:8px 22px;border-radius:18px;background:linear-gradient(#FFE27A,#F5B700);border:2px solid #C98F00;box-shadow:0 4px 0 #A87700;color:#3A2A00;font-size:22px;justify-content:center}',
    '.tkq-next svg{width:26px;height:26px}.tkq-next:disabled{opacity:.4}',
    '.tkq-fly{position:fixed;left:0;top:0;width:38px;height:38px;z-index:9999;pointer-events:none}.tkq-fly img{width:100%;height:100%}',
    // arrange letters
    '.tkq-slots{display:flex;gap:8px;justify-content:center;direction:rtl}',
    '.tkq-slot{width:60px;height:64px;border-radius:14px;border:3px dashed #9CC3EA;background:#fff;display:flex;align-items:center;justify-content:center;font-size:34px;color:#1F3B73}',
    '.tkq-slot.fill{border-style:solid}.tkq-slots.no{animation:tkqWiggle .42s ' + EASE + '}',
    '.tkq-tiles{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}',
    '.tkq-tile{min-width:64px;min-height:64px;border-radius:16px;background:linear-gradient(#EEF6FF,#CFE4FB);border:2px solid #9CC3EA;box-shadow:0 3px 0 #8DB3DD;font-size:34px;color:#1F3B73}',
    '.tkq-tile.used{opacity:.25}.tkq-tile.hl{animation:tkqPulse 1.1s ' + EASE + ' infinite}',
    // sort
    '.tkq-bins{display:grid;gap:10px;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr)}',
    '.tkq-bin{position:relative;min-height:128px;border-radius:18px;border:3px dashed #C9A56A;background:rgba(255,255,255,.7);display:flex;flex-direction:column;align-items:center;padding:6px;gap:4px;transition:transform .2s ' + EASE + '}',
    '.tkq-bin.over{transform:scale(1.03);border-style:solid;border-color:#1F4FA0}.tkq-bin.hl{border-color:#2EAD4B;border-style:solid}',
    '.tkq-bin .bh{display:flex;align-items:center;gap:6px;font-size:15px;color:#3A2A10;text-align:center}.tkq-bin .bh img{width:34px;height:34px;object-fit:contain}.tkq-bin .sw{width:26px;height:26px;border-radius:8px;border:2px solid rgba(0,0,0,.25)}',
    '.tkq-bin .cap{font-family:system-ui,sans-serif;font-size:12px;color:#6B4B1F}',
    '.tkq-stack{display:flex;flex-wrap:wrap;gap:4px;justify-content:center;align-content:flex-start;flex:1;width:100%}',
    '.tkq-tray{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;min-height:80px;padding:6px;border-radius:16px;background:rgba(31,59,115,.08)}',
    '.tkq-item{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:72px;min-height:72px;padding:4px 6px;border-radius:16px;background:#fff;border:2px solid #9CC3EA;box-shadow:0 3px 0 #8DB3DD;touch-action:none;cursor:grab;color:#1F3B73;font-size:13px;z-index:1}',
    '.tkq-item img{width:48px;height:48px;object-fit:contain;pointer-events:none}.tkq-item .lb{max-width:110px;text-align:center;line-height:1.1}.tkq-item .num{font-size:30px}',
    '.tkq-item .ppl{display:flex;align-items:flex-end;padding-left:8px}.tkq-item .ppl img{width:30px;height:38px;object-fit:contain;margin-left:-9px;filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}',
    '.tkq-op{display:grid;place-items:center}.tkq-opx{font-size:34px;line-height:1;color:#1F4FA0;font-family:inherit}.tkq-seat{display:block;width:100%;height:100%;border:2px dashed #8A6A1E;border-radius:8px}.tkq-o img.tkq-p{object-fit:contain}',
    '.tkq-bin .bh img.tk-ico--lifeboat{width:54px;height:34px}.tkq-say img,.tkq-next img,.tkq-hintbtn img{width:28px;height:28px;object-fit:contain}.tkq-opt .ck img{width:100%;height:100%;object-fit:contain}',
    '.tkq-item.drag{z-index:50;cursor:grabbing;box-shadow:0 10px 22px rgba(0,0,0,.25)}',
    '.tkq-item.sel{border-color:#1F4FA0;transform:translateY(-4px) scale(1.04)}',
    '.tkq-item.placed{min-width:56px;min-height:56px;box-shadow:none;border-color:#2EAD4B}.tkq-item.placed img{width:38px;height:38px}',
    '.tkq-item.no{animation:tkqWiggle .42s ' + EASE + '}',
    '.tkq-item.snap{transition:transform .38s ' + EASE + '}',
    '.tkq-wide .tkq-card{align-self:center;max-height:100%}',
    '.tkq-opt.guide{border-color:#F5B700;box-shadow:0 0 0 4px rgba(255,213,74,.85),0 3px 0 #8DB3DD}',
    '.tkq-ship{position:relative}.tkq-cargo{position:absolute;left:24%;right:24%;bottom:55%;display:flex;justify-content:center;gap:1px}',
    '.tkq-cargo img{width:24px;height:24px;object-fit:contain;opacity:0;transform:translateY(-12px) scale(.6);transition:opacity .3s ' + EASE + ',transform .45s ' + EASE + '}.tkq-cargo img.in{opacity:1;transform:none}',
    '.tkq-tall .tkq-chars{display:flex;align-items:flex-end;gap:6px}.tkq-cimg{height:clamp(80px,13vh,130px);width:auto;flex:none;object-fit:contain}.tkq-cimg.peng{height:clamp(66px,11vh,110px)}',
    '.tkq-tall .tkq-chars .tkq-bub{flex:1;max-width:none;margin-bottom:14px}.tkq-bub.from-p b{background:#1F3B73}',
    '.tkq-count{white-space:nowrap}',
    '.tkq-tall .tkq-bin{min-height:min(200px,24vh)}.tkq-tall .tkq-tray{margin-top:auto}',
    '@media (max-width:420px){.tkq-hintbtn span{display:none}.tkq-hintbtn{padding:4px}}',
    '@keyframes tkqWiggle{0%,100%{transform:none}20%{transform:translateX(-7px)}45%{transform:translateX(6px)}70%{transform:translateX(-4px)}88%{transform:translateX(2px)}}',
    '@keyframes tkqPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}',
    '@keyframes tkqBump{0%{transform:scale(1)}40%{transform:scale(1.3)}100%{transform:scale(1)}}',
    '@keyframes tkqPop{0%{opacity:0;transform:translateY(6px) scale(.94)}100%{opacity:1;transform:none}}',
    '@keyframes tkqFade{0%,100%{opacity:1}50%{opacity:.55}}',
    // reduced motion: meaning kept, travel removed (fades only)
    '.tkq-rm .tkq-o,.tkq-rm .tkq-opt,.tkq-rm .tkq-help,.tkq-rm .tkq-explain,.tkq-rm .tkq-o .n{transform:none!important}',
    '.tkq-rm .tkq-opt.no,.tkq-rm .tkq-slots.no,.tkq-rm .tkq-item.no{animation:tkqFade .42s linear}',
    '.tkq-rm .tkq-opt.guide,.tkq-rm .tkq-o.hl::before,.tkq-rm .tkq-tile.hl,.tkq-rm .tkq-stat b.bump,.tkq-rm .tkq-bub.pop{animation:none}',
    '.tkq-rm .tkq-btn:active:not(:disabled){transform:none}',
    '@media (hover:hover){.tkq-opt:hover:not(:disabled){filter:brightness(1.04)}}'
  ].join('\n')
  function injectCSS () {
    if (typeof document === 'undefined' || document.getElementById('tkq-css')) return
    var st = document.createElement('style'); st.id = 'tkq-css'; st.textContent = CSS; document.head.appendChild(st)
  }

  function libFn (opts) {
    return function (k) {
      if (opts && typeof opts.lib === 'function') { var u = opts.lib(k); if (u) return u }
      return (W.AssetIndex && W.AssetIndex.path(k)) || (BASE + 'assets/db/lib/' + k + '.webp')
    }
  }
  function sfxFn (opts) {
    return function (name) {
      if (opts && opts.sound === false) return
      try {
        if (opts && typeof opts.sfx === 'function') return opts.sfx(name)
        if (opts && opts.sfx && typeof opts.sfx[name] === 'function') return opts.sfx[name]()
        if (W.SFXEngine && W.SFXEngine.cue) W.SFXEngine.cue(name)
      } catch (e) {}
    }
  }
  function isReduced (opts) {
    if (opts && opts.reducedMotion != null) return !!opts.reducedMotion
    try { return !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches) } catch (e) { return false }
  }
  function clockSVG (h, m) {
    var ticks = '', nums = ''
    for (var i = 1; i <= 12; i++) {
      var a = i * Math.PI / 6
      nums += '<text x="' + (50 + 34 * Math.sin(a)).toFixed(1) + '" y="' + (50 - 34 * Math.cos(a) + 4.5).toFixed(1) + '" text-anchor="middle" font-size="12" fill="#1F3B73" font-family="Fredoka One,system-ui">' + i + '</text>'
      ticks += '<line x1="' + (50 + 43 * Math.sin(a)).toFixed(1) + '" y1="' + (50 - 43 * Math.cos(a)).toFixed(1) + '" x2="' + (50 + 46 * Math.sin(a)).toFixed(1) + '" y2="' + (50 - 46 * Math.cos(a)).toFixed(1) + '" stroke="#1F3B73" stroke-width="2"/>'
    }
    var ha = ((h % 12) + m / 60) * 30, ma = m * 6
    return '<svg class="tkq-clock" viewBox="0 0 100 100" role="img" aria-label="jam"><circle cx="50" cy="50" r="48" fill="#FFF8E8" stroke="#8A6A1E" stroke-width="4"/>' + ticks + nums +
      '<line class="hand-h" x1="50" y1="50" x2="50" y2="28" stroke="#1F3B73" stroke-width="5" stroke-linecap="round" transform="rotate(' + ha + ' 50 50)"/>' +
      '<line class="hand-m" x1="50" y1="50" x2="50" y2="14" stroke="#E53935" stroke-width="3.2" stroke-linecap="round" transform="rotate(' + ma + ' 50 50)"/><circle cx="50" cy="50" r="4" fill="#1F3B73"/></svg>'
  }

  /* ══ mount: question set ═══════════════════════════════════════════ */
  function mount (host, set, opts) {
    opts = opts || {}
    injectCSS()
    if (opts.mastery == null && set && !Array.isArray(set) && set.mastery != null) opts = Object.assign({}, opts, { mastery: set.mastery })
    if (set && !Array.isArray(set) && set.type === 'sort') return mountSort(host, sortSet(set.domain, set.world, rng(set.seed || Date.now()), set), opts)
    var qs = Array.isArray(set) ? set : build({ domain: (set && set.domain) || opts.domain, world: set && set.world, count: set && set.count, level: set && set.level,
      grade: (set && set.grade) || opts.grade, islam: set && set.islam != null ? set.islam : opts.islam, mastery: opts.mastery, seed: (set && set.seed) || opts.seed })
    if (opts.islam === false) qs = qs.filter(function (q) { return !q.islam })
    var lib = libFn(opts), sfx = sfxFn(opts), reduced = isReduced(opts)
    var timers = [], alive = true
    function later (fn, ms) { var t = setTimeout(function () { if (alive) fn() }, reduced ? Math.min(ms, 120) : ms); timers.push(t); return t }
    var ms0 = {}, ms = {}
    qs.forEach(function (q) { if (!(q.domain in ms0)) { ms0[q.domain] = masteryOf(opts.mastery, q.domain); ms[q.domain] = ms0[q.domain] } })
    var S = { i: 0, right: 0, asked: 0, hints: 0, points: 0, streak: 0, rung: 0, answered: false, results: [] }

    var wide = host.clientWidth > host.clientHeight * 1.15
    var root = document.createElement('div')
    root.className = 'tkq ' + (wide ? 'tkq-wide' : 'tkq-tall') + (reduced ? ' tkq-rm' : '')
    if (opts.topInset) root.style.paddingTop = (opts.topInset + 8) + 'px'
    var timmySrc = opts.timmy || lib('sd/explorer')
    var statsHTML = '<div class="tkq-stats" aria-label="skor">' +
      '<div class="tkq-stat"><img src="' + lib('game/treasure-chest') + '" alt=""><div><b data-k="soal">0/' + qs.length + '</b><small>Soal</small></div></div>' +
      '<div class="tkq-stat"><img src="' + lib('game/star') + '" alt=""><div><b data-k="poin">0</b><small>Poin</small></div></div>' +
      '<div class="tkq-stat"><img src="' + lib('game/trophy-gold') + '" alt=""><div><b data-k="streak">0</b><small>Beruntun</small></div></div></div>'
    var timmyHTML = '<div class="tkq-char timmy"><div class="tkq-bub" data-b="t"><b>Timmy</b><div class="tx">Ayo kita pecahkan bersama!</div></div><img src="' + esc(timmySrc) + '" alt="Timmy" draggable="false"></div>'
    var pengHTML = '<div class="tkq-char peng"><div class="tkq-bub" data-b="p"><b>Kapten Pingu</b><div class="tx">Semangat, pelaut kecil!</div></div><img src="' + esc(opts.penguin || lib('animals/penguin')) + '" alt="Kapten Pingu" draggable="false"></div>'
    var cardHTML = '<section class="tkq-card" aria-live="off"><div class="tkq-head"><span class="tkq-count"></span>' +
      '<button type="button" class="tkq-btn tkq-hintbtn" aria-label="Petunjuk">' + ICON.lamp + '<span>Petunjuk</span></button><span class="tkq-badge"></span></div>' +
      '<div class="tkq-prompt"></div><div class="tkq-eq" hidden></div><div class="tkq-scene"></div><div class="tkq-help" aria-live="polite"></div>' +
      '<div class="tkq-ans" role="group" aria-label="Pilihan jawaban"></div><div class="tkq-explain" hidden aria-live="polite"></div></section>'
    var dots = qs.map(function (q, i) { return '<i class="tkq-dot" data-i="' + i + '"></i>' }).join('')
    var footHTML = '<div class="tkq-foot"><div class="tkq-dots" aria-hidden="true">' + dots + '</div><button type="button" class="tkq-btn tkq-next" disabled>Lanjut ' + ICON.arrow + '</button></div>'
    root.innerHTML = wide
      ? '<div class="tkq-side tkq-left">' + timmyHTML + '</div>' + cardHTML + '<div class="tkq-side tkq-right">' + statsHTML + pengHTML + '</div>' + footHTML
      : statsHTML + cardHTML + '<div class="tkq-chars"><img class="tkq-cimg" src="' + esc(timmySrc) + '" alt="Timmy" draggable="false">' +
        '<div class="tkq-bub" data-b="x"><b>Timmy</b><div class="tx">Ayo kita pecahkan bersama!</div></div>' +
        '<img class="tkq-cimg peng" src="' + esc(opts.penguin || lib('animals/penguin')) + '" alt="Kapten Pingu" draggable="false"></div>' + footHTML
    host.appendChild(root)
    var $ = function (s) { return root.querySelector(s) }
    var E = { count: $('.tkq-count'), badge: $('.tkq-badge'), prompt: $('.tkq-prompt'), eq: $('.tkq-eq'), scene: $('.tkq-scene'), help: $('.tkq-help'),
      ans: $('.tkq-ans'), explain: $('.tkq-explain'), next: $('.tkq-next'), hint: $('.tkq-hintbtn'), card: $('.tkq-card') }

    function say (who, text) {
      var b = root.querySelector('.tkq-bub[data-b="' + who + '"]')
      if (!b) { b = root.querySelector('.tkq-bub[data-b="x"]'); if (!b) return; b.querySelector('b').textContent = who === 'p' ? 'Kapten Pingu' : 'Timmy'; b.classList.toggle('from-p', who === 'p') }
      b.querySelector('.tx').textContent = text
      b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop')
    }
    function stat (k, v) { var b = root.querySelector('[data-k="' + k + '"]'); if (!b) return; b.textContent = v; b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump') }
    function help (t) { E.help.textContent = t || ''; E.help.classList.toggle('on', !!t) }
    function tierOf (q) { return mastery.tier(ms[q.domain]) }

    /* scene */
    function objHTML (key, i, cls, size) {
      var inner = key === 'svg:person' ? ICON.person : key === 'svg:seat' ? ICON.seat : '<img src="' + lib(key) + '" alt="" draggable="false">'
      return '<span class="tkq-o' + (cls ? ' ' + cls : '') + '" data-o="' + i + '" style="--s:' + size + 'px">' + inner + '<span class="n"></span></span>'
    }
    function renderScene (q) {
      var sc = q.scene, h = '', idx = 0, size
      if (q.domain === 'matematika') {
        var total = 0; (sc.groups || []).forEach(function (g) { total += g.n })
        size = wide ? (total <= 6 ? 62 : total <= 10 ? 50 : total <= 16 ? 38 : 32) : (total <= 6 ? 48 : total <= 10 ? 38 : total <= 16 ? 30 : 26)
        var grp = function (g, extra, tag) {
          var s = '<div class="tkq-grp' + (extra ? ' ' + extra : '') + '" data-role="' + g.role + '">' + (tag ? '<span class="tag">' + tag + '</span>' : '')
          for (var j = 0; j < g.n; j++) s += objHTML(g.key, idx++, g.role === 'leave' ? 'leave' : '', size)
          return s + '</div>'
        }
        switch (sc.mode) {
          case 'count': h = grp(sc.groups[0]); break
          case 'add': h = grp(sc.groups[0]) + '<span class="tkq-op">' + ICON.plus + '</span>' + grp(sc.groups[1]); break
          case 'sub': h = '<div class="tkq-grp" data-role="all">' + inner(sc.groups[0], '') + inner(sc.groups[1], 'leave') + '</div>'; break
          case 'twostep': h = grp(sc.groups[0]) + '<span class="tkq-op">' + ICON.plus + '</span>' + grp(sc.groups[1]) + '<span class="tkq-op">' + ICON.minus + '</span><span class="tkq-q" style="--s:' + size + 'px">' + sc.leave + '</span>'; break
          case 'groups': sc.groups.forEach(function (g) { h += grp(g, g.role === 'group' ? 'boat' : '') }); break
          case 'share': h = grp(sc.groups[0]) + '<span class="tkq-op">' + ICON.arrow.replace('currentColor', '#1F4FA0') + '</span>'; for (var b = 0; b < sc.boats; b++) h += '<div class="tkq-grp boat" data-role="empty" style="min-width:' + (size + 16) + 'px;min-height:' + (size + 10) + 'px"></div>'; break
          case 'capacity': {
            h = '<div class="tkq-grp boat" data-role="seats">'
            for (var c = 0; c < sc.cap; c++) h += objHTML(c < sc.fill ? 'svg:person' : 'svg:seat', idx++, c < sc.fill ? '' : 'seat', Math.min(size, 38))
            h += '</div>'; break
          }
          case 'diff': h = grp(sc.groups[0], 'red', 'Merah') + grp(sc.groups[1], 'blue', 'Biru'); break
          case 'clock': h = clockSVG(sc.h, sc.m); break
          default: h = ''
        }
        if (/^(count|add|sub|twostep|groups)$/.test(sc.mode)) h += '<span class="tkq-ship" aria-hidden="true">' + ICON.ship + '<span class="tkq-cargo"></span></span>'
      } else {
        var nv = (q.visual || []).length + (q.seq ? 1 : 0), avail = (E.scene.clientWidth || 320) - 12
        size = Math.max(30, Math.min(nv <= 1 ? 110 : nv <= 4 ? 80 : 64, Math.floor((avail - 10 * (nv - 1)) / Math.max(1, nv))))
        if (q.swatch) h += '<span class="tkq-swatch" style="background:' + esc(q.swatch) + '" role="img" aria-label="warna"></span>'
        ;(q.visual || []).forEach(function (k) { h += objHTML(k, idx++, '', size) })
        if (q.seq) h += '<span class="tkq-q" style="--s:' + size + 'px">?</span>'
        if (q.rtl && q.ar && !q.letters && (q.listen || /^ar-w[pr]-/.test(q.id) || /^ar-fm-/.test(q.id))) {
          h += '<div class="tkq-arw">' + (q.listen ? '<button type="button" class="tkq-btn tkq-say">' + ICON.speaker + '<span>Dengar</span></button><span class="tkq-tr">Dengar: «' + esc(q.tr) + '»</span>'
            : '<span class="tkq-ar" dir="rtl" lang="ar">' + esc(q.ar) + '</span><span class="tkq-tr">' + esc(q.tr) + '</span>') + '</div>'
        }
      }
      function inner (g, cls) { var s = ''; for (var j = 0; j < g.n; j++) s += objHTML(g.key, idx++, cls, size); return s }
      E.scene.innerHTML = h
      E.scene.style.display = h ? '' : 'none'
      var sayBtn = E.scene.querySelector('.tkq-say'); if (sayBtn) sayBtn.addEventListener('click', function () { speak(q.listen) })
      // objects arrive: stagger (base first, then the arriving group)
      var os = E.scene.querySelectorAll('.tkq-o,.tkq-op')
      Array.prototype.forEach.call(os, function (o, k) { later(function () { o.classList.add('in') }, 60 + k * 45) })
      var hide = q.domain === 'matematika' && tierOf(q) >= 3 && sc.mode !== 'clock' && sc.mode !== 'capacity'
      if (hide) E.scene.style.display = 'none'
    }
    function speak (text) {
      sfx('click')
      try {
        if (!W.speechSynthesis) return
        var v = (W.speechSynthesis.getVoices() || []).filter(function (x) { return /^ar/i.test(x.lang) })[0]
        if (!v) { help('Suara bahasa Arab belum tersedia. Baca tulisannya, ya.'); return }
        var u = new W.SpeechSynthesisUtterance(text); u.lang = v.lang; u.voice = v; u.rate = 0.8
        W.speechSynthesis.cancel(); W.speechSynthesis.speak(u)
      } catch (e) {}
    }

    /* answers */
    function optHTML (q, c, i) {
      var inner, cls = 'tkq-btn tkq-opt'
      if (q.pics && q.pics[c]) inner = '<img src="' + lib(q.pics[c]) + '" alt=""><span class="lb">' + esc(c) + '</span>'
      else if (q.rtl && /[؀-ۿ]/.test(c)) inner = '<span class="tkq-ar" dir="rtl" lang="ar">' + esc(c) + '</span>' + (q.trs && q.trs[c] ? '<span class="tkq-tr">' + esc(q.trs[c]) + '</span>' : '')
      else { inner = '<span>' + esc(c) + '</span>'; if (/^\d+$/.test(c)) cls += ' num' }
      return '<button type="button" class="' + cls + '" data-c="' + esc(c) + '" data-i="' + i + '" aria-label="' + esc(q.pics && q.pics[c] ? c : (q.trs && q.trs[c]) || c) + '">' + inner + '<span class="ck">' + ICON.check + '</span></button>'
    }
    function renderAnswers (q) {
      if (q.letters) return renderArrange(q)
      E.ans.style.display = ''
      E.ans.innerHTML = q.choices.map(function (c, i) { return optHTML(q, c, i) }).join('')
      Array.prototype.forEach.call(E.ans.querySelectorAll('.tkq-opt'), function (b, k) {
        later(function () { b.classList.add('in') }, 120 + k * 45)
        b.addEventListener('click', function () { choose(b) })
      })
    }
    /* arrange letters (RTL slots) */
    var AR = null
    function renderArrange (q) {
      var tiles = shuffle(q.letters, rng(q.id.length * 7 + S.i))
      AR = { q: q, slots: [], tiles: tiles }
      E.ans.style.display = 'block'
      E.ans.innerHTML = '<div class="tkq-slots" dir="rtl">' + q.letters.map(function (x, i) { return '<span class="tkq-slot tkq-ar" lang="ar" data-s="' + i + '"></span>' }).join('') + '</div>' +
        '<div class="tkq-tiles" style="margin-top:10px">' + tiles.map(function (x, i) { return '<button type="button" class="tkq-btn tkq-tile tkq-ar" lang="ar" dir="rtl" data-t="' + i + '">' + esc(x) + '</button>' }).join('') + '</div>'
      Array.prototype.forEach.call(E.ans.querySelectorAll('.tkq-tile'), function (t) { t.addEventListener('click', function () { tapTile(t) }) })
      Array.prototype.forEach.call(E.ans.querySelectorAll('.tkq-slot'), function (s) { s.addEventListener('click', function () { tapSlot(+s.dataset.s) }) })
    }
    function tapTile (t) {
      if (S.answered || t.classList.contains('used') || AR.slots.length >= AR.q.letters.length) return
      sfx('click'); t.classList.add('used'); t.disabled = true
      AR.slots.push(+t.dataset.t); drawSlots()
      if (AR.slots.length === AR.q.letters.length) later(checkArrange, 250)
    }
    function tapSlot (i) {
      if (S.answered || i >= AR.slots.length || (S.rung >= 4 && i === 0)) return
      var removed = AR.slots.splice(i)
      removed.forEach(function (ti) { var t = E.ans.querySelector('.tkq-tile[data-t="' + ti + '"]'); t.classList.remove('used'); t.disabled = false })
      drawSlots()
    }
    function drawSlots () {
      Array.prototype.forEach.call(E.ans.querySelectorAll('.tkq-slot'), function (s, i) { var ti = AR.slots[i]; s.textContent = ti == null ? '' : AR.tiles[ti]; s.classList.toggle('fill', ti != null) })
      markNextTile()
    }
    function markNextTile () {
      Array.prototype.forEach.call(E.ans.querySelectorAll('.tkq-tile'), function (t) { t.classList.remove('hl') })
      if (S.rung < 2 || S.answered) return
      var want = AR.q.letters.length ? AR.q.answer.split('')[AR.slots.length] : null
      var t = Array.prototype.filter.call(E.ans.querySelectorAll('.tkq-tile:not(.used)'), function (x) { return AR.tiles[+x.dataset.t] === want })[0]
      if (t) t.classList.add('hl')
      if (S.rung >= 5) Array.prototype.forEach.call(E.ans.querySelectorAll('.tkq-tile:not(.used)'), function (x) { x.disabled = x !== t })
    }
    function checkArrange () {
      var word = AR.slots.map(function (ti) { return AR.tiles[ti] }).join('')
      if (word === AR.q.answer) return correct(null)
      var sl = E.ans.querySelector('.tkq-slots'); sl.classList.remove('no'); void sl.offsetWidth; sl.classList.add('no')
      sfx('wrong'); say('p', oneOf(ENCOURAGE, Math.random))
      later(function () { tapSlot(S.rung >= 3 ? 1 : 0); climb(1) }, 450)
    }

    /* hint ladder */
    function climb (by) {
      var q = qs[S.i]
      var before = S.rung
      S.rung = Math.min(5, S.rung + by)
      if (!q.letters) {
        var left = E.ans.querySelectorAll('.tkq-opt:not(.tried):not(.ok)')
        var wrongLeft = Array.prototype.filter.call(left, function (b) { return b.dataset.c !== q.answer })
        if (!wrongLeft.length) S.rung = 5
      }
      for (var r = before + 1; r <= S.rung; r++) applyRung(q, r)
      S.hints += S.rung - before
    }
    function applyRung (q, r) {
      var math = q.domain === 'matematika'
      if (r === 1) { help(q.hint1); say('t', 'Ayo coba lagi, pelan-pelan!') }
      if (r === 2) {
        help(q.hint2)
        if (E.scene.style.display === 'none' && E.scene.innerHTML) { E.scene.style.display = ''; Array.prototype.forEach.call(E.scene.querySelectorAll('.tkq-o,.tkq-op'), function (o) { o.classList.add('in') }) }
        var os = E.scene.querySelectorAll('.tkq-o')
        var focus = q.focus || null
        Array.prototype.forEach.call(os, function (o, i) { if (!focus || focus.indexOf(i) >= 0) { if (!o.classList.contains('leave')) o.classList.add('hl') } })
        if (q.letters) markNextTile()
      }
      if (r === 3) {
        if (math) countOn(q)
        else dimOneWrong(q)
      }
      if (r === 4) {
        if (math) { help(q.step1); if (q.eq) { E.eq.hidden = false; E.eq.textContent = q.eq } }
        else { help(q.hint2 + ' Tinggal dua pilihan.'); dimOneWrong(q) }
        if (q.letters && AR.slots.length === 0) { var t0 = Array.prototype.filter.call(E.ans.querySelectorAll('.tkq-tile:not(.used)'), function (x) { return AR.tiles[+x.dataset.t] === q.answer.split('')[0] })[0]; if (t0) tapTile(t0) }
      }
      if (r === 5) {
        help('Ini jawabannya. Ketuk yang bersinar untuk menyelesaikan.')
        say('t', 'Kita selesaikan bersama, ya!')
        if (q.letters) { markNextTile(); return }
        Array.prototype.forEach.call(E.ans.querySelectorAll('.tkq-opt'), function (b) {
          if (b.dataset.c === q.answer) { b.classList.add('guide'); b.disabled = false } else { b.disabled = true; b.classList.add('tried') }
        })
      }
    }
    function dimOneWrong (q) {
      if (q.letters) return
      var w = Array.prototype.filter.call(E.ans.querySelectorAll('.tkq-opt:not(.tried)'), function (b) { return b.dataset.c !== q.answer })
      if (w.length > 1) { w[w.length - 1].classList.add('tried'); w[w.length - 1].disabled = true }
    }
    function countOn (q) {
      var os = Array.prototype.filter.call(E.scene.querySelectorAll('.tkq-o'), function (o) { return !o.classList.contains('leave') && !o.classList.contains('seat') })
      if (q.scene.mode === 'capacity') os = Array.prototype.slice.call(E.scene.querySelectorAll('.tkq-o.seat'))
      os.forEach(function (o, k) { later(function () { var n = o.querySelector('.n'); n.textContent = k + 1; n.classList.add('on'); if (k % 2 === 0) sfx('click') }, k * (reduced ? 0 : 260)) })
    }

    /* answering */
    function choose (b) {
      if (S.answered || b.disabled) return
      var q = qs[S.i]
      if (b.dataset.c === q.answer) return correct(b)
      sfx('wrong')
      b.classList.remove('no'); void b.offsetWidth
      b.classList.add('no', 'tried'); b.disabled = true   // gentle wiggle, then it stays faded
      say('p', ENCOURAGE[S.rung % ENCOURAGE.length])
      climb(1)
    }
    function correct (b) {
      var q = qs[S.i]
      S.answered = true
      var first = S.rung === 0
      if (b) { b.classList.remove('guide'); b.classList.add('ok') }
      Array.prototype.forEach.call(E.ans.querySelectorAll('.tkq-opt,.tkq-tile'), function (x) { x.disabled = true })
      sfx('correct')
      S.asked++
      if (first) { S.right++; S.streak++ } else S.streak = 0
      var pts = first ? 10 : S.rung <= 2 ? 5 : 2
      S.points += pts
      var before = ms[q.domain]
      ms[q.domain] = mastery.update(before, { right: true, firstTry: first, rung: S.rung, streak: S.streak - 1 })
      S.results.push({ id: q.id, domain: q.domain, first: first, rung: S.rung })
      consequence(q)
      flyStar(b || E.ans)
      later(function () { stat('poin', S.points); stat('soal', S.asked + '/' + qs.length); stat('streak', S.streak); sfx('star') }, 520)
      say('p', first ? oneOf(PRAISE, Math.random) : 'Bagus! Kamu tidak menyerah!')
      help('')
      E.explain.hidden = false; E.explain.textContent = q.explain
      later(function () { E.explain.classList.add('on') }, 30)
      var dot = root.querySelector('.tkq-dot[data-i="' + S.i + '"]'); if (dot) dot.classList.add(first ? 'right' : 'help')
      E.next.disabled = false
      later(function () { try { E.next.focus({ preventScroll: true }) } catch (e) {} }, 700)
    }
    // correct = a physical consequence in the scene: cargo hops into the ship, the flag rises
    function consequence (q) {
      var ship = E.scene.querySelector('.tkq-ship')
      if (q.scene && q.scene.mode === 'clock') {
        var hm = E.scene.querySelector('.hand-m')
        if (hm && hm.animate && !reduced) hm.animate([{ opacity: 1 }, { opacity: 0.3 }, { opacity: 1 }], { duration: 600, easing: 'ease-out' })
        return
      }
      if (!ship || E.scene.style.display === 'none') {
        Array.prototype.forEach.call(E.scene.querySelectorAll('.tkq-o'), function (o, k) {
          if (o.animate && !reduced) later(function () { o.animate([{ transform: 'none' }, { transform: 'translateY(-14px) scale(1.06)' }, { transform: 'none' }], { duration: 420, easing: EASE }) }, k * 50)
        })
        return
      }
      var sr = ship.getBoundingClientRect()
      var os = Array.prototype.filter.call(E.scene.querySelectorAll('.tkq-o'), function (o) { return !o.classList.contains('leave') })
      os.forEach(function (o, k) {
        var r = o.getBoundingClientRect()
        var dx = sr.left + sr.width * (0.3 + 0.4 * ((k % 5) / 4)) - (r.left + r.width / 2), dy = sr.top + sr.height * 0.45 - (r.top + r.height / 2)
        later(function () {
          if (reduced || !o.animate) { o.style.opacity = '0'; return }
          var a = o.animate([{ transform: 'none', opacity: 1 }, { transform: 'translate(' + dx * 0.5 + 'px,' + (dy * 0.5 - 40) + 'px) scale(.8)', opacity: 1, offset: 0.55 },
            { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.45)', opacity: 0 }], { duration: 620, easing: EASE, fill: 'forwards' })
          a.onfinish = function () { o.style.opacity = '0' }
        }, 120 + k * 55)
      })
      later(function () {
        var cg = ship.querySelector('.tkq-cargo'), key = (q.scene.groups[0] || {}).key
        Array.prototype.forEach.call(E.scene.querySelectorAll('.tkq-op'), function (o) { o.style.opacity = '0' })
        if (cg && key) for (var c = 0; c < Math.min(4, os.length); c++) {
          var im = document.createElement('img'); im.src = lib(key); im.alt = ''; cg.appendChild(im)
          ;(function (el, d) { later(function () { el.classList.add('in') }, d) })(im, c * 70)
        }
        ship.classList.add('done')
        if (ship.animate && !reduced) ship.animate([{ transform: 'none' }, { transform: 'translateY(4px)' }, { transform: 'translateY(-2px)' }, { transform: 'none' }], { duration: 700, easing: EASE })
      }, 120 + os.length * 55 + 380)
    }
    function flyStar (from) {
      var to = root.querySelector('[data-k="poin"]'); if (!to || reduced) return
      var a = from.getBoundingClientRect(), bb = to.getBoundingClientRect()
      var s = document.createElement('div'); s.className = 'tkq-fly'; s.innerHTML = '<img src="' + lib('game/star') + '" alt="">'
      document.body.appendChild(s)
      var x0 = a.left + a.width / 2 - 19, y0 = a.top + a.height / 2 - 19, x1 = bb.left + bb.width / 2 - 19, y1 = bb.top + bb.height / 2 - 19
      if (!s.animate) { s.remove(); return }
      var an = s.animate([{ transform: 'translate(' + x0 + 'px,' + y0 + 'px) scale(.6)', opacity: 0 }, { transform: 'translate(' + ((x0 + x1) / 2) + 'px,' + (Math.min(y0, y1) - 60) + 'px) scale(1.2)', opacity: 1, offset: 0.45 },
        { transform: 'translate(' + x1 + 'px,' + y1 + 'px) scale(.7)', opacity: 0.2 }], { duration: 700, easing: EASE, fill: 'forwards' })
      an.onfinish = function () { s.remove() }
      timers.push(setTimeout(function () { if (s.parentNode) s.remove() }, 1200))
    }

    function show (i) {
      var q = qs[i]
      S.rung = 0; S.answered = false; AR = null
      E.count.textContent = 'Soal ' + (i + 1) + ' dari ' + qs.length
      var du = DOMAIN_UI[q.domain] || DOMAIN_UI.umum
      E.badge.innerHTML = (du.svg || '<img src="' + lib(du.icon) + '" alt="">') + '<span>' + esc(du.label) + '</span>'
      E.prompt.textContent = q.prompt
      E.prompt.dir = 'ltr'
      var t = tierOf(q)
      E.eq.hidden = !(q.eq && q.domain === 'matematika' && t === 2)
      E.eq.textContent = q.eq || ''
      E.hint.style.visibility = ''
      help(q.domain === 'matematika' && t >= 3 ? 'Butuh bantuan? Ketuk Petunjuk.' : '')
      E.explain.hidden = true; E.explain.classList.remove('on')
      E.next.disabled = true
      E.next.innerHTML = (i === qs.length - 1 ? 'Selesai ' : 'Lanjut ') + ICON.arrow
      Array.prototype.forEach.call(root.querySelectorAll('.tkq-dot'), function (d, k) { d.classList.toggle('cur', k === i) })
      renderScene(q)
      renderAnswers(q)
      E.card.scrollTop = 0
      say('t', i === 0 ? 'Ayo kita pecahkan bersama!' : oneOf(['Soal berikutnya!', 'Kita pasti bisa!', 'Ayo, lanjut berlayar!'], Math.random))
    }
    function finish () {
      var delta = 0, by = {}
      Object.keys(ms).forEach(function (d) { by[d] = ms[d] - ms0[d]; delta += by[d] })
      var res = { right: S.right, asked: S.asked, hints: S.hints, masteryDelta: delta, byDomain: by, mastery: ms, points: S.points, results: S.results }
      S.done = true
      E.next.disabled = true
      say('p', S.right === S.asked ? 'Sempurna! Semua benar!' : 'Hebat! Kamu sudah berusaha!')
      if (typeof opts.onDone === 'function') { try { opts.onDone(res) } catch (e) { if (W.console) console.error(e) } }
    }
    E.next.addEventListener('click', function () {
      if (!S.answered || S.done) return
      sfx('click')
      if (S.i + 1 >= qs.length) return finish()
      S.i++; show(S.i)
    })
    E.hint.addEventListener('click', function () { if (S.answered || S.done) return; sfx('click'); climb(1) })
    if (!qs.length) { E.prompt.textContent = 'Belum ada soal.'; return { el: root, state: function () { return S }, destroy: function () { root.remove() } } }
    show(0)
    return {
      el: root, questions: qs,
      state: function () { var q = qs[S.i]; return { i: S.i, n: qs.length, rung: S.rung, answered: !!S.answered, done: !!S.done, qid: q && q.id, answer: q && q.answer, right: S.right, asked: S.asked, hints: S.hints, points: S.points, streak: S.streak } },
      hint: function () { if (!S.answered) climb(1) },
      destroy: function () { alive = false; timers.forEach(clearTimeout); if (root.parentNode) root.parentNode.removeChild(root) }
    }
  }

  /* ══ mountSort: drag archetype (drag with snap; tap item then tap bin also works) ══ */
  function mountSort (host, set, opts) {
    opts = opts || {}
    injectCSS()
    if (set && !set.bins) set = sortSet(set.domain, set.world, rng(set.seed || Date.now()), set)
    var lib = libFn(opts), sfx = sfxFn(opts), reduced = isReduced(opts), alive = true, timers = []
    function later (fn, ms) { var t = setTimeout(function () { if (alive) fn() }, reduced ? Math.min(ms, 100) : ms); timers.push(t) }
    var m0 = masteryOf(opts.mastery, set.domain)
    var S = { placed: 0, wrong: 0, firstOK: 0, tried: {}, sel: null, done: false }
    var wide = host.clientWidth > host.clientHeight * 1.15
    var root = document.createElement('div')
    root.className = 'tkq ' + (wide ? 'tkq-wide' : 'tkq-tall') + (reduced ? ' tkq-rm' : '')
    if (opts.topInset) root.style.paddingTop = (opts.topInset + 8) + 'px'
    var du = DOMAIN_UI[set.domain] || DOMAIN_UI.umum
    var binHTML = set.bins.map(function (b) {
      return '<div class="tkq-bin" data-bin="' + esc(b.id) + '" role="group" aria-label="' + esc(b.label) + '"><div class="bh">' +
        (b.sprite ? '<img src="' + lib(b.sprite) + '" alt="">' : b.color ? '<span class="sw" style="background:' + esc(b.color) + '"></span>' : set.capacity ? '<span style="width:54px">' + ICON.boat + '</span>' : '') +
        '<span' + (b.rtl ? ' class="tkq-ar" dir="rtl" lang="ar"' : '') + '>' + esc(b.label) + '</span></div>' +
        (b.cap ? '<div class="cap" data-cap="' + esc(b.id) + '">0 / ' + b.cap + ' orang</div>' : '') + '<div class="tkq-stack"></div></div>'
    }).join('')
    var itemHTML = set.items.map(function (it) {
      var pic = it.sprite ? '<img src="' + lib(it.sprite) + '" alt="">' : it.people ? '<span class="ppl">' + people(it.people, parseInt(String(it.id).replace(/\D/g, ''), 10) || 0) + '</span>' : '<span class="num">' + esc(it.label) + '</span>'
      var lb = it.sprite || it.people ? '<span class="lb' + (it.rtl ? ' tkq-ar" dir="rtl" lang="ar' : '') + '">' + esc(it.label) + '</span>' : ''
      return '<button type="button" class="tkq-item" data-id="' + esc(it.id) + '" aria-label="' + esc(it.label) + '">' + pic + lb + '</button>'
    }).join('')
    root.innerHTML = '<section class="tkq-card" style="grid-column:1/-1"><div class="tkq-head"><span class="tkq-count">Kelompokkan</span>' +
      '<span class="tkq-badge">' + (du.svg || '<img src="' + lib(du.icon) + '" alt="">') + '<span>' + esc(du.label) + '</span></span></div>' +
      '<div class="tkq-prompt">' + esc(set.prompt) + '</div><div class="tkq-bins">' + binHTML + '</div><div class="tkq-help" aria-live="polite"></div>' +
      '<div class="tkq-tray">' + itemHTML + '</div><div class="tkq-explain" hidden></div></section>' +
      '<div class="tkq-foot" style="grid-column:1/-1"><div class="tkq-dots"><span style="color:#fff;font-size:16px" data-k="left"></span></div><button type="button" class="tkq-btn tkq-next" disabled>Selesai ' + ICON.arrow + '</button></div>'
    root.style.gridTemplateColumns = '1fr'
    root.style.gridTemplateRows = 'minmax(0,1fr) auto'
    host.appendChild(root)
    var $ = function (s) { return root.querySelector(s) }
    var tray = $('.tkq-tray'), helpEl = $('.tkq-help'), next = $('.tkq-next')
    var byId = {}; set.items.forEach(function (it) { byId[it.id] = it })
    var load = {}; set.bins.forEach(function (b) { load[b.id] = 0 })
    function help (t) { helpEl.textContent = t || ''; helpEl.classList.toggle('on', !!t) }
    function left () { $('[data-k="left"]').textContent = (set.items.length - S.placed) + ' lagi' }
    left()
    function binOf (id) { for (var i = 0; i < set.bins.length; i++) if (set.bins[i].id === id) return set.bins[i] }
    function fits (it, b) {
      if (set.capacity) return load[b.id] + it.n <= b.cap
      return it.bin === b.id
    }
    function binAt (x, y) {
      var bins = root.querySelectorAll('.tkq-bin')
      for (var i = 0; i < bins.length; i++) { var r = bins[i].getBoundingClientRect(); if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return bins[i] }
      return null
    }
    function drop (el, binEl) {
      var it = byId[el.dataset.id], b = binOf(binEl.dataset.bin)
      Array.prototype.forEach.call(root.querySelectorAll('.tkq-bin'), function (x) { x.classList.remove('over', 'hl') })
      if (fits(it, b)) {
        var r0 = el.getBoundingClientRect()
        el.style.transform = ''; el.classList.remove('drag', 'sel', 'snap')
        binEl.querySelector('.tkq-stack').appendChild(el)
        el.classList.add('placed')
        var r1 = el.getBoundingClientRect()
        if (!reduced) {
          el.style.transform = 'translate(' + (r0.left - r1.left) + 'px,' + (r0.top - r1.top) + 'px)'
          void el.offsetWidth; el.classList.add('snap'); el.style.transform = ''
          later(function () { el.classList.remove('snap') }, 420)
        }
        if (set.capacity) { load[b.id] += it.n; var c = root.querySelector('[data-cap="' + b.id + '"]'); if (c) c.textContent = load[b.id] + ' / ' + b.cap + ' orang' }
        S.placed++; if (!S.tried[it.id]) S.firstOK++
        sfx('correct'); help(''); left()
        if (S.placed === set.items.length) return complete()
        if (set.capacity && !anyFits()) help('Belum muat. Ketuk satu keluarga di sekoci untuk mengeluarkannya, lalu susun lagi.')
      } else {
        S.wrong++; S.tried[it.id] = (S.tried[it.id] || 0) + 1
        sfx('wrong')
        back(el)
        if (set.capacity) help('Sekoci itu hanya muat ' + (b.cap - load[b.id]) + ' orang lagi. Coba sekoci lain.')
        else {
          help(S.tried[it.id] >= 2 ? 'Lihat yang bersinar: ' + it.label + ' masuk ke sana.' : 'Hampir! Pikirkan lagi: ' + it.label + ' masuk ke kelompok mana?')
          if (S.tried[it.id] >= 2) { var ok = root.querySelector('.tkq-bin[data-bin="' + it.bin + '"]'); if (ok) ok.classList.add('hl') }
        }
      }
    }
    function anyFits () {
      return Array.prototype.some.call(tray.querySelectorAll('.tkq-item'), function (el) { var it = byId[el.dataset.id]; return set.bins.some(function (b) { return fits(it, b) }) })
    }
    function back (el) {
      el.classList.remove('drag', 'sel')
      if (reduced) { el.style.transform = ''; el.classList.add('no'); later(function () { el.classList.remove('no') }, 450); return }
      el.classList.add('snap'); el.style.transform = ''
      later(function () { el.classList.remove('snap'); el.classList.remove('no'); void el.offsetWidth; el.classList.add('no') }, 380)
      later(function () { el.classList.remove('no') }, 850)
    }
    function unplace (el) {        // capacity mode: take a family back out
      if (!set.capacity || S.done) return
      var bEl = el.closest('.tkq-bin'), it = byId[el.dataset.id]; if (!bEl) return
      load[bEl.dataset.bin] -= it.n; S.placed--
      var c = root.querySelector('[data-cap="' + bEl.dataset.bin + '"]'); if (c) c.textContent = load[bEl.dataset.bin] + ' / ' + binOf(bEl.dataset.bin).cap + ' orang'
      el.classList.remove('placed'); tray.appendChild(el); sfx('click'); left(); help('')
    }
    function complete () {
      S.done = true
      var asked = set.items.length, right = S.firstOK
      var mNew = mastery.update(m0, { right: true, firstTry: S.wrong === 0, rung: Math.min(5, S.wrong), streak: 0 })
      var ex = $('.tkq-explain'); ex.hidden = false; ex.textContent = set.capacity ? 'Hebat! Semua keluarga naik sekoci dan tetap bersama.' : 'Hebat! Semua sudah di tempatnya.'
      later(function () { ex.classList.add('on') }, 30)
      sfx('star')
      next.disabled = false
      S.res = { right: right, asked: asked, hints: S.wrong, masteryDelta: mNew - m0, mastery: mNew, byDomain: (function () { var o = {}; o[set.domain] = mNew - m0; return o })() }
    }
    next.addEventListener('click', function () { if (!S.res || S.sent) return; S.sent = true; sfx('click'); if (typeof opts.onDone === 'function') { try { opts.onDone(S.res) } catch (e) { if (W.console) console.error(e) } } })
    // pointer drag (mouse, touch, pen) with a tap fallback
    Array.prototype.forEach.call(root.querySelectorAll('.tkq-item'), function (el) {
      var st = null
      el.addEventListener('pointerdown', function (e) {
        if (S.done || el.classList.contains('placed')) return
        st = { x: e.clientX, y: e.clientY, moved: false, id: e.pointerId }
        try { el.setPointerCapture(e.pointerId) } catch (x) {}
      })
      el.addEventListener('pointermove', function (e) {
        if (!st || e.pointerId !== st.id) return
        var dx = e.clientX - st.x, dy = e.clientY - st.y
        if (!st.moved && Math.abs(dx) + Math.abs(dy) < 8) return
        if (!st.moved) { st.moved = true; el.classList.add('drag'); el.classList.remove('snap', 'sel'); S.sel = null }
        el.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(1.06)'
        var over = binAt(e.clientX, e.clientY)
        Array.prototype.forEach.call(root.querySelectorAll('.tkq-bin'), function (x) { x.classList.toggle('over', x === over) })
      })
      function end (e) {
        if (!st || e.pointerId !== st.id) return
        var was = st; st = null
        if (!was.moved) return
        var b = binAt(e.clientX, e.clientY)
        if (b) drop(el, b); else back(el)
      }
      el.addEventListener('pointerup', end)
      el.addEventListener('pointercancel', function (e) { if (st) { st = null; back(el) } })
      el.addEventListener('click', function () {
        if (S.done) return
        if (el.classList.contains('placed')) {
          // a family is selected and the child taps its target bin where another family already sits:
          // that is a DROP into this bin, not "take this one back out"
          var inBin = el.closest('.tkq-bin')
          if (S.sel && S.sel !== el && inBin) { var sel = S.sel; S.sel = null; return drop(sel, inBin) }
          return unplace(el)
        }
        if (el.classList.contains('drag')) return
        sfx('click')
        if (S.sel && S.sel !== el) S.sel.classList.remove('sel')
        S.sel = el.classList.toggle('sel') ? el : null
        if (S.sel) help('Sekarang ketuk kelompoknya.')
      })
    })
    Array.prototype.forEach.call(root.querySelectorAll('.tkq-bin'), function (b) {
      b.addEventListener('click', function (e) { if (!S.sel || e.target.closest('.tkq-item')) return; var el = S.sel; S.sel = null; drop(el, b) })
    })
    return {
      el: root, set: set,
      state: function () { return { placed: S.placed, n: set.items.length, wrong: S.wrong, done: S.done } },
      destroy: function () { alive = false; timers.forEach(clearTimeout); if (root.parentNode) root.parentNode.removeChild(root) }
    }
  }

  W.TKQuiz = {
    make: make, pick: pick, build: build, validate: validate, mastery: mastery,
    mount: mount, sortSet: sortSet, mountSort: mountSort, rng: rng, clockLabel: clockLabel,
    VERSION: '1.0.0'
  }
})()
