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
 *   TKQuiz.challenge(host, opts)             -> Promise<{correct, tries, hints, points, qid, domain, mastery}>
 *        one Knowledge Challenge card over host (tk-lanes collision, cinema questions). opts: domain
 *        ('campur' default | matematika | islam | arab | umum | logika), world, grade, mastery, islam, seed,
 *        title, intro (plate subtitle), nextLabel, question ({prompt, choices, answer, explain, hint1?, hint2?,
 *        step1?, eq?, domain?, scene?} = a fixed question), + any mount opts (lib, sfx, reducedMotion ...).
 *        correct = right on the first try; the child can never get stuck (hint ladder, guided answer).
 *        The promise has .close() (removes the card, resolves {correct:false, closed:true}).
 * set  = [questions] or {domain, world, count, level, grade, islam, seed, type?:'sort'}
 * opts = { domain, grade, mastery (number | {domain:n}), islam, onDone({right, asked, hints,
 *          masteryDelta, mastery, points, byDomain}), sfx (fn(name) | {name:fn}), lib(key)->url,
 *          timmy (url), penguin (url), topInset (px), reducedMotion, seed,
 *          scene (CSS background, e.g. TKArt.scene(lv.scene)), topic (level goal line: plate subtitle +
 *          questions about it first), title (plate), hints (false = no hint button/ladder),
 *          onBack (fn; Kembali is hidden without it), step (0..3 stepper index; quiz 0, sort 2) }
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
  // fase A (Kelas 1–2, owner 2026-09-28): numbers <= 20, whole-hour clocks, no multiplication / division.
  // groups / share / groupsplus stay in the generator (TKQuiz.make(..., { kind })) but are never scheduled.
  var KINDS = {
    1: [['count', 40], ['add', 25], ['sub', 20], ['biggest', 15]],
    2: [['add', 25], ['sub', 25], ['count', 15], ['clock', 15], ['diff', 10], ['capacity', 10]],
    3: [['add', 25], ['sub', 25], ['capacity', 15], ['clock', 15], ['diff', 20]],
    4: [['twostep', 35], ['add', 15], ['sub', 15], ['diff', 15], ['clock', 10], ['capacity', 10]]
  }
  var MAXN = 20
  var EASY_KINDS = [['count', 45], ['add', 30], ['sub', 25]]
  function cap (level) { return level <= 2 ? 10 : 20 }
  function clockLabel (h, m) { return m === 30 ? 'Pukul setengah ' + (h % 12 + 1) : 'Pukul ' + h }
  function numChoices (ans, near, r, max) {
    var seen = {}, out = [ans]; seen[ans] = 1
    var pool = shuffle(near.concat([ans + 1, ans - 1, ans + 2, ans - 2]), r)
    var top = Math.min(max + 3, MAXN)
    for (var i = 0; i < pool.length && out.length < 4; i++) { var v = pool[i]; if (v >= 0 && v <= top && !seen[v] && v === Math.round(v)) { seen[v] = 1; out.push(v) } }
    for (var d = 3; out.length < 4 && d < 40; d++) { [ans + d, ans - d].forEach(function (v) { if (out.length < 4 && v >= 0 && v <= MAXN && !seen[v]) { seen[v] = 1; out.push(v) } }) }
    return shuffle(out, r).map(String)
  }

  function make (domain, level, r, opts) {
    opts = opts || {}; r = r || Math.random
    level = Math.max(1, Math.min(4, level | 0 || 1))
    var th = THEME[opts.world] || THEME._, it = oneOf(th, r), key = it[0], noun = it[1]
    var kinds = KINDS[level]
    if (opts.world === 'queenmary') kinds = kinds.concat([['clock', 60]])
    // easy (Kelas 1 / low mastery): picture-first counting only — every number is an object on screen
    if (opts.easy && level <= 2) kinds = EASY_KINDS
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
        q = { prompt: 'Ada ' + a + ' ' + noun + ' di kapal. ' + b + ' lagi dimuat. Jadi berapa?', eq: a + ' + ' + b + ' = ?', ans: s,
          near: [a, b, Math.abs(a - b), s + 1, s - 1], scene: { mode: 'add', groups: [G(key, a), G(key, b, 'add')] },
          hint1: 'Gabungkan dua kelompok ' + noun + '.', hint2: 'Mulai dari ' + a + ', lalu hitung maju ' + b + ' lagi.',
          step1: 'Mulai dari ' + a + ': ' + seqStr(a + 1, Math.min(s, a + 2)) + (b > 2 ? ', …' : ''), explain: a + ' + ' + b + ' = ' + s + '. Semua ' + noun + ' naik ke kapal!', calc: { op: '+', a: a, b: b } }
        break
      }
      case 'sub': {
        var a2 = ri(r, 3, M), b2 = ri(r, 1, Math.min(a2 - 1, level <= 2 ? 5 : 9)), d2 = a2 - b2
        q = { prompt: 'Ada ' + a2 + ' ' + noun + ' di dek. ' + b2 + ' diturunkan. Sisa berapa?', eq: a2 + ' − ' + b2 + ' = ?', ans: d2,
          near: [a2 + b2 <= M + 3 ? a2 + b2 : d2 + 3, b2, a2, d2 + 1, d2 - 1], scene: { mode: 'sub', groups: [G(key, d2), G(key, b2, 'leave')] },
          hint1: 'Yang diturunkan tidak dihitung lagi.', hint2: 'Tutup ' + b2 + ' ' + noun + ' yang pergi, hitung sisanya.',
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
        q = { prompt: 'Ada ' + g + ' sekoci. Tiap sekoci ' + k + ' ' + noun + '.' + (e ? ' ' + e + ' lagi datang.' : '') + ' Semuanya berapa?',
          eq: new Array(g + 1).join(k + ' + ').slice(0, -3) + (e ? ' + ' + e : '') + ' = ?', ans: tot, near: [g + k, g * k + (e ? 0 : k), tot + k, tot - 1, tot + 1],
          scene: { mode: 'groups', groups: grp }, hint1: 'Hitung isi setiap sekoci.', hint2: 'Tiap sekoci ' + k + '. Hitung loncat: ' + seqStr(k, k * Math.min(g, 3), k) + (g > 3 ? ', …' : ''),
          step1: k + ' + ' + k + ' = ' + (2 * k) + (g > 2 || e ? ', lalu tambah lagi.' : '.'), explain: 'Semuanya ' + tot + ' ' + noun + '.', calc: { op: 'groups', g: g, k: k, e: e } }
        break
      }
      case 'share': {
        var g3 = ri(r, 2, 3), k3 = ri(r, 2, Math.floor(10 / g3)), t3 = g3 * k3
        q = { prompt: t3 + ' ' + noun + ' dibagi ke ' + g3 + ' sekoci. Tiap sekoci dapat berapa?', eq: t3 + ' : ' + g3 + ' = ?', ans: k3,
          near: [k3 + 1, k3 - 1, g3, k3 + 2], scene: { mode: 'share', groups: [G(key, t3)], boats: g3 },
          hint1: 'Bagikan satu per satu ke tiap sekoci, bergiliran.', hint2: 'Tiap sekoci harus dapat sama banyak.',
          step1: 'Beri 1 ' + noun + ' ke tiap sekoci: sudah ' + g3 + ' terbagi. Ulangi sampai habis.', explain: t3 + ' dibagi ' + g3 + ' = ' + k3 + '. Tiap sekoci dapat ' + k3 + '.', calc: { op: 'share', t: t3, g: g3 } }
        break
      }
      case 'capacity': {
        var c = ri(r, 5, level <= 3 ? 10 : 12), x = ri(r, 1, c - 1), room = c - x
        q = { prompt: 'Sekoci muat ' + c + ' orang. Sudah ada ' + x + '. Berapa lagi bisa naik?', eq: c + ' − ' + x + ' = ?', ans: room,
          near: [c, x, room + 1, room - 1, c + x <= 20 ? c + x : room + 2], scene: { mode: 'capacity', cap: c, fill: x, groups: [] },
          hint1: 'Hitung kursi yang masih kosong.', hint2: 'Kursi kosong = kursi semua dikurangi yang sudah terisi.',
          step1: 'Mulai dari ' + x + ', hitung maju sampai ' + c + '.', explain: c + ' − ' + x + ' = ' + room + '. Masih ada ' + room + ' kursi kosong.', calc: { op: '-', a: c, b: x } }
        break
      }
      case 'diff': {
        var p = ri(r, 3, M), o = ri(r, 1, p - 1), df = p - o
        var red = r() < 0.5
        q = { prompt: 'Kapal Merah bawa ' + (red ? p : o) + ' ' + noun + '. Kapal Biru bawa ' + (red ? o : p) + '. Selisihnya berapa?', eq: p + ' − ' + o + ' = ?', ans: df,
          near: [p + o <= M + 3 ? p + o : df + 3, df + 1, df - 1, o], scene: { mode: 'diff', groups: [G(key, red ? p : o, 'red'), G(key, red ? o : p, 'blue')] },
          hint1: 'Selisih artinya berapa lebih banyak.', hint2: 'Pasangkan satu-satu. Hitung yang tidak punya pasangan.',
          step1: 'Yang banyak ' + p + ', yang sedikit ' + o + '. Hitung dari ' + o + ' sampai ' + p + '.', explain: p + ' − ' + o + ' = ' + df + '.', calc: { op: '-', a: p, b: o } }
        break
      }
      case 'twostep': {
        var a4 = ri(r, 3, 12), b4 = ri(r, 2, Math.min(8, 20 - a4)), c4 = ri(r, 1, Math.min(9, a4 + b4 - 1)), res = a4 + b4 - c4
        q = { prompt: 'Ada ' + a4 + ' ' + noun + '. ' + b4 + ' dimuat, ' + c4 + ' diturunkan. Sekarang berapa?', eq: a4 + ' + ' + b4 + ' − ' + c4 + ' = ?', ans: res,
          near: [a4 + b4, a4 - c4 >= 0 ? a4 - c4 : res + 2, res + 1, res - 1, res + 2], scene: { mode: 'twostep', groups: [G(key, a4), G(key, b4, 'add')], leave: c4 },
          hint1: 'Kerjakan satu langkah dulu.', hint2: 'Langkah 1: tambah yang dimuat. Langkah 2: kurangi yang diturunkan.',
          step1: 'Langkah 1: ' + a4 + ' + ' + b4 + ' = ' + (a4 + b4) + '. Sekarang kurangi ' + c4 + '.', explain: a4 + ' + ' + b4 + ' = ' + (a4 + b4) + ', lalu ' + (a4 + b4) + ' − ' + c4 + ' = ' + res + '.',
          calc: { op: 'two', a: a4, b: b4, c: c4 } }
        break
      }
      case 'clock': {
        // fase A: whole hours only, in the answer AND the wrong choices
        var h = ri(r, 1, 12), half = false, m = 0, lab = clockLabel(h, m)
        var alt = [clockLabel(h % 12 + 1, 0), clockLabel((h + 10) % 12 + 1, 0), clockLabel((h + 1) % 12 + 1, 0), clockLabel((h + 9) % 12 + 1, 0)]
        var ch = [lab]; alt.forEach(function (v) { if (ch.length < 4 && ch.indexOf(v) < 0) ch.push(v) })
        q = { prompt: 'Lihat jamnya. Pukul berapa sekarang?', eq: null, ans: lab, fixed: ch,
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
    if (q.domain === 'matematika' || q.letters) { if (q.choices.length !== (q.easy ? 3 : 4)) p.push('choices != ' + (q.easy ? 3 : 4)) }
    else if (q.choices.length < 3 || q.choices.length > 4) p.push('choices not 3–4')
    var seen = {}; q.choices.forEach(function (c) { if (seen[c]) p.push('duplicate choice ' + c); seen[c] = 1 })
    var hits = q.choices.filter(function (c) { return c === q.answer }).length
    if (hits !== 1) p.push('answer present ' + hits + 'x')
    if (q.domain === 'matematika' && q.hard) {
      var hc = q.calc || {}, ht = hardTruth(hc)
      if (ht !== q.answer) p.push('answer ' + q.answer + ' != ' + ht)
      ;['a', 'b', 'c'].forEach(function (k) { if (hc[k] != null && (hc[k] < 0 || hc[k] > 10000)) p.push('operand out of range') })
      if ((hc.op === '+' || hc.op === '-') && (+ht < 0 || +ht > 1000)) p.push('result outside 0..1000')
      if (hc.op === '*' && (hc.a > 10 || hc.b > 10)) p.push('times table beyond 10x10')
      if (hc.op === 'clock5' && hc.m % 5) p.push('clock not on 5 minutes')
      if (hc.op === 'money' && (hc.a < 1000 || hc.a > 10000)) p.push('money outside Rp1.000–Rp10.000')
      if (String(q.prompt).trim().split(/\s+/).length > 18) p.push('story over 18 words')
      return p
    }
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
        q.choices.forEach(function (x) { if (+x > MAXN) p.push('choice ' + x + ' above ' + MAXN) })
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
  /* easy mode: Kelas 1 always; Adaptif while the domain is still at tier 1 (mastery <= 30); Kelas 2 never.
     opts.easy (true/false) overrides. */
  function isEasy (grade, m, force) {
    if (force === true || force === false) return force
    var g = normGrade(grade)
    return g === 1 || (g !== 2 && mastery.tier(m) === 1)
  }
  /* 3 choices instead of 4: a NEW question object (the bank item is never mutated). The answer and the
     two nearest distractors stay (numbers: closest value; words: the first two in presented order). */
  function easyify (q) {
    if (!q || q.letters || !q.choices || q.choices.length <= 3) return q
    var o = {}; for (var k in q) o[k] = q[k]
    var h = 0; String(q.id).split('').forEach(function (ch) { h = (h * 31 + ch.charCodeAt(0)) | 0 })
    var wrong = q.choices.filter(function (c) { return c !== q.answer })
    if (/^\d+$/.test(q.answer) && !(q.calc && q.calc.op === 'max') && wrong.every(function (c) { return /^\d+$/.test(c) })) {
      // numbers: the three nearest values inside 0..10 (the easy range), one dropped (by the id) so the
      // answer is not always the middle value; order shuffled deterministically
      var a = +q.answer, top = Math.max(10, a), seen = {}, pool = []
      seen[a] = 1
      wrong.map(Number).concat([a - 1, a + 1, a - 2, a + 2, a - 3, a + 3]).forEach(function (v) { if (v >= 0 && v <= top && !seen[v]) { seen[v] = 1; pool.push(v) } })
      pool.sort(function (x, y) { return Math.abs(x - a) - Math.abs(y - a) })
      pool = pool.slice(0, 3); if (pool.length === 3) pool.splice(Math.abs(h) % 3, 1)
      o.choices = shuffle([a].concat(pool.slice(0, 2)), rng(h)).map(String)
    } else {
      var keep = wrong.slice(0, 2)
      o.choices = q.choices.filter(function (c) { return c === q.answer || keep.indexOf(c) >= 0 })
    }
    if (q.calc && q.calc.op === 'max') o.calc = { op: 'max', list: o.choices.map(Number) }
    o.easy = true
    return o
  }

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
    if (domain === 'campur') { domain = chooseDomain(r, opts); opts = Object.assign({}, opts, { mixed: true }) }
    if (domain === 'matematika') return opts.hard ? makeHard(r, opts) : make('matematika', level, r, opts)
    if (domain === 'islam' && opts.islam === false) return null
    var ex = opts.exclude || {}
    // a mixed ("campur") level never serves the arrange-letters archetype: it is an Arabic lesson of
    // its own, and inside a mixed/Logika level it read as a wrong question for the level's goal
    var all = bank().filter(function (o) { return o.domain === domain && !(opts.islam === false && o.islam) && !ex[o.id] && !(opts.mixed && o.letters) })
    // Tingkat Soal: Mudah = Kelas 1–2 only (untagged items count as 1–2); Sulit = mostly Kelas 3–4, some 1–2 mixed in
    var hi = function (o) { return +o.grade >= 3 || /^[34]/.test(String(o.grade || '')) }
    if (!opts.hard) all = all.filter(function (o) { return !hi(o) })
    else { var hard = all.filter(hi); if (hard.length && r() < 0.7) all = hard }
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
  /* topic mix (owner 2026-09-29: "jangan banyak soal kata Arab, matematika 50%"): a mixed pick is weighted,
     math about half; inside a domain, pick() still prefers the world's own items */
  var MIX = { matematika: 50, umum: 15, logika: 15, islam: 12, arab: 8 }
  function chooseDomain (r, opts) {
    var ds = enabledDomains(opts)
    if (opts && opts.noArab) ds = ds.filter(function (d) { return d !== 'arab' })
    if (opts && opts.noMath) ds = ds.filter(function (d) { return d !== 'matematika' })
    return wpick(ds.map(function (d) { return [d, MIX[d] || 10] }), r)
  }
  function masteryOf (ms, d) { return typeof ms === 'number' ? ms : (ms && ms[d]) || 0 }
  /* topic = the level's goal line ("Baca arah kompas."). Questions should be ABOUT it: curated items
     whose text shares a content word with the goal come first, and generated maths picks a kind
     that matches the goal's verb (bagikan -> share, pukul -> clock ...). */
  var STOP = /^(yang|untuk|dengan|dari|pada|kapal|timmy|temukan|kenali|kepingan|baca|pilih|cocokkan|atur|ayo|bantu|semua|lagi|benar|menjawab|jawab|soal|teka|teki|tiap|agar|bersama)$/
  function topicWords (topic) {
    return String(topic || '').toLowerCase().replace(/[^a-z\s-]/g, ' ').split(/[\s-]+/).filter(function (w) { return w.length >= 4 && !STOP.test(w) })
      .map(function (w) { return w.replace(/^(meng|mem|men|me|ber|di|ter|pe)/, '').replace(/(kan|nya|an|i)$/, '').slice(0, 6) }).filter(function (w) { return w.length >= 4 })
  }
  function topicScore (o, words) {
    if (!words.length) return 0
    var t = (o.prompt + ' ' + o.explain + ' ' + (o.hint1 || '') + ' ' + (o.hint2 || '') + ' ' + (o.visual || []).join(' ')).toLowerCase()
    return words.filter(function (w) { return t.indexOf(w) >= 0 }).length
  }
  var MATH_TOPIC = [[/bagi/, 'share'], [/pukul|jam\b|waktu|jadwal/, 'clock'], [/muat|kursi|sekoci/, 'capacity'], [/selisih|banding/, 'diff'], [/kelompok|rombongan/, 'groups'],
    [/turun|kurang|sisa/, 'sub'], [/muatan|dimuat|naik|tambah|kargo/, 'add'], [/hitung|berapa/, 'count']]
  function mathKindFor (topic, level) {
    // share / groups are topic-only in fase A ("Bagikan selimut…"): fair sharing / equal groups within 10, with pictures
    var t = String(topic || '').toLowerCase(), have = (KINDS[level] || []).map(function (k) { return k[0] }).concat(['share', 'groups'])
    for (var i = 0; i < MATH_TOPIC.length; i++) if (MATH_TOPIC[i][0].test(t) && have.indexOf(MATH_TOPIC[i][1]) >= 0) return MATH_TOPIC[i][1]
    return null
  }
  function build (spec) {
    spec = spec || {}
    if (spec.mix) return buildMix(spec)
    var r = spec.rng || rng(spec.seed != null ? spec.seed : (Date.now() & 0x7fffffff)), n = spec.count || 5, out = [], used = {}
    var mixed = !spec.domain || spec.domain === 'campur'
    var words = topicWords(spec.topic), onTopic = Math.ceil(n / 2)
    var lvOf = function (d) { return spec.level || mastery.levelFor(masteryOf(spec.mastery, d), spec.grade) }
    // curated items about the goal, best match first (same world breaks ties)
    var topical = !words.length ? [] : bank().filter(function (o) {
      return (mixed ? enabledDomains({ islam: spec.islam, domains: spec.domains }).indexOf(o.domain) >= 0 : o.domain === spec.domain) &&
        !(spec.islam === false && o.islam) && !(mixed && o.letters) && o.level <= lvOf(o.domain) + 1 && topicScore(o, words) > 0
    }).sort(function (a, b) { return (topicScore(b, words) - topicScore(a, words)) || ((b.world === spec.world) - (a.world === spec.world)) || (r() - 0.5) })
    for (var i = 0; i < n; i++) {
      if (i < onTopic && topical.length) {
        var tq = topical.shift()
        if (!used[tq.id]) { used[tq.id] = 1; out.push(present(tq, r)); continue }
      }
      var d = spec.domain || 'campur'
      if (d === 'campur') d = chooseDomain(r, { islam: spec.islam, world: spec.world, exclude: used, domains: spec.domains })
      if (d === 'islam' && spec.islam === false) d = 'umum'
      var lv = lvOf(d)
      var popts = { islam: spec.islam, world: spec.world, exclude: used, mixed: mixed, hard: !!spec.hard, easy: !spec.hard && isEasy(spec.grade, masteryOf(spec.mastery, d), spec.easy) }
      if (d === 'matematika' && i < onTopic) { var mk = mathKindFor(spec.topic, lv); if (mk) popts.kind = mk }
      var q = null
      for (var t = 0; t < 10 && (!q || used[q.id]); t++) q = pick(d, lv, r, popts)
      if (!q) q = pick('umum', lv, r, popts)
      if (!q) continue
      used[q.id] = 1; out.push(q)
    }
    return out
  }

  /* a world quiz step (spec.mix, set by the game): about half the questions are Matematika, the step's own topic
     (spec.domain, its goal line) fills the rest; a mixed / Arab / math-led step fills the rest by the MIX weights.
     Never more than one Arabic question per 4 and never an all-Arabic step. Order: the lead topic first. */
  function buildMix (spec) {
    var r = spec.rng || rng(spec.seed != null ? spec.seed : (Date.now() & 0x7fffffff)), n = spec.count || 4
    var lead = spec.domain && spec.domain !== 'campur' && spec.domain !== 'matematika' && spec.domain !== 'arab' ? spec.domain : null
    if (lead === 'islam' && spec.islam === false) lead = 'umum'
    var nMath = Math.floor(n / 2) + (n % 2 && r() < 0.5 ? 1 : 0), arabCap = Math.max(1, Math.floor(n / 4)), arab = 0
    var slots = [], i
    for (i = 0; i < n - nMath; i++) {
      var d = lead || chooseDomain(r, { islam: spec.islam, domains: spec.domains, noMath: true, noArab: arab >= arabCap })
      if (d === 'arab') arab++
      slots.push(d)
    }
    // interleave: lead topic first, then math / other alternating
    var others = slots.slice(), maths = []; for (i = 0; i < nMath; i++) maths.push('matematika')
    var order = []; while (others.length || maths.length) { if (others.length) order.push(others.shift()); if (maths.length) order.push(maths.shift()) }
    var out = [], used = {}, words = topicWords(spec.topic)
    order.forEach(function (d, k) {
      var lv = spec.level || mastery.levelFor(masteryOf(spec.mastery, d), spec.grade)
      var popts = { islam: spec.islam, world: spec.world, exclude: used, mixed: true, hard: !!spec.hard, easy: !spec.hard && isEasy(spec.grade, masteryOf(spec.mastery, d), spec.easy) }
      if (d === 'matematika' && k < 2 && !spec.hard) { var mk = mathKindFor(spec.topic, lv); if (mk) popts.kind = mk }
      var q = null
      // the lead topic's first question follows the step's goal when a curated item matches it
      if (k === 0 && lead && words.length) {
        var tp = bank().filter(function (o) { return o.domain === d && !used[o.id] && !o.letters && !(spec.islam === false && o.islam) && (spec.hard || !(+o.grade >= 3)) && topicScore(o, words) > 0 })
          .sort(function (a, b) { return topicScore(b, words) - topicScore(a, words) })
        if (tp.length) q = present(tp[0], r)
      }
      for (var t = 0; t < 10 && (!q || used[q.id]); t++) q = pick(d, lv, r, popts)
      if (!q) q = pick('matematika', lv, r, popts)
      if (!q) return
      used[q.id] = 1; out.push(q)
    })
    return out
  }

  /* ══ SULIT (Kelas 3–4, setting "Tingkat Soal") ══════════════════════════ */
  var HARD_KINDS = [['add3', 14], ['sub3', 14], ['times', 16], ['div', 10], ['frac', 10], ['clock5', 10], ['money', 10], ['measure', 8], ['story', 8]]
  function rp (v) { return 'Rp' + String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.') }
  function clock5Label (h, m) { return 'Pukul ' + h + '.' + (m < 10 ? '0' : '') + m }
  function uniq4 (ans, alts, r) {
    var out = [ans], seen = {}; seen[ans] = 1
    alts.forEach(function (v) { if (out.length < 4 && v != null && !seen[v]) { seen[v] = 1; out.push(v) } })
    return shuffle(out, r)
  }
  function numAlts (a, steps) { var o = []; steps.forEach(function (d) { if (a + d >= 0) o.push(String(a + d)) }); return o }
  function makeHard (r, opts) {
    opts = opts || {}
    var th = THEME[opts.world] || THEME._, it = oneOf(th, r), key = it[0], noun = it[1]
    var kind = opts.kind && /^(add3|sub3|times|div|frac|clock5|money|measure|story)$/.test(opts.kind) ? opts.kind : wpick(HARD_KINDS, r), q
    switch (kind) {
      case 'add3': {   // within 1000, the ones regroup
        var a = ri(r, 105, 780), b = ri(r, 17, Math.min(219, 999 - a)); if ((a % 10) + (b % 10) < 10) b = Math.min(999 - a, b + (10 - (a % 10)))
        var s = a + b
        q = { prompt: 'Kapal membawa ' + a + ' ' + noun + '. Lalu dimuat ' + b + ' lagi. Jumlahnya?', eq: a + ' + ' + b + ' = ?', ans: String(s),
          alts: numAlts(s, [10, -10, 1, -1, 100]), calc: { op: '+', a: a, b: b }, explain: a + ' + ' + b + ' = ' + s + '.', hint1: 'Jumlahkan satuan dulu, lalu puluhan, lalu ratusan.', hint2: 'Kalau satuan lebih dari 9, simpan 1 ke puluhan.' }
        break
      }
      case 'sub3': {
        var a2 = ri(r, 210, 990), b2 = ri(r, 18, Math.min(199, a2 - 10)); if ((a2 % 10) >= (b2 % 10)) b2 = Math.min(a2 - 10, b2 + ((a2 % 10) - (b2 % 10)) + 1)
        var d2 = a2 - b2
        q = { prompt: 'Ada ' + a2 + ' ' + noun + '. Sebanyak ' + b2 + ' diturunkan. Sisanya?', eq: a2 + ' − ' + b2 + ' = ?', ans: String(d2),
          alts: numAlts(d2, [10, -10, 1, -1, 100]), calc: { op: '-', a: a2, b: b2 }, explain: a2 + ' − ' + b2 + ' = ' + d2 + '.', hint1: 'Kurangi satuan dulu. Kalau kurang, pinjam 1 dari puluhan.', hint2: 'Periksa: jawaban + ' + b2 + ' harus sama dengan ' + a2 + '.' }
        break
      }
      case 'times': {
        var x = ri(r, 2, 10), y = ri(r, 2, 10), p = x * y
        q = { prompt: 'Ada ' + x + ' peti. Tiap peti berisi ' + y + ' ' + noun + '. Semuanya berapa?', eq: x + ' × ' + y + ' = ?', ans: String(p),
          alts: numAlts(p, [x, -x, y, -y, 1, -1]), calc: { op: '*', a: x, b: y }, explain: x + ' × ' + y + ' = ' + p + '.', hint1: 'Perkalian = penjumlahan berulang.', hint2: 'Hitung loncat ' + y + ' sebanyak ' + x + ' kali.' }
        break
      }
      case 'div': {
        var g = ri(r, 2, 9), k = ri(r, 2, 10), t = g * k
        q = { prompt: t + ' ' + noun + ' dibagi rata ke ' + g + ' sekoci. Tiap sekoci dapat berapa?', eq: t + ' : ' + g + ' = ?', ans: String(k),
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
        var price = 500 * ri(r, 2, 16), pay = [2000, 5000, 10000].filter(function (v) { return v > price })[0] || 10000, ch = pay - price
        if (ch <= 0) { price = 3000; pay = 5000; ch = 2000 }
        q = { prompt: 'Harga roti ' + rp(price) + '. Kamu bayar ' + rp(pay) + '. Kembaliannya berapa?', eq: rp(pay) + ' − ' + rp(price) + ' = ?', ans: rp(ch),
          alts: [rp(ch + 500), rp(Math.max(500, ch - 500)), rp(ch + 1000), rp(price), rp(ch + 1500), rp(ch + 2000)], calc: { op: 'money', a: pay, b: price }, explain: rp(pay) + ' − ' + rp(price) + ' = ' + rp(ch) + '.', hint1: 'Kembalian = uang dibayar dikurangi harga.', hint2: 'Hitung dalam ribuan dulu.' }
        break
      }
      case 'measure': {
        if (r() < 0.5) {
          var mm = ri(r, 2, 9), cm = mm * 100
          q = { prompt: 'Tali jangkar panjangnya ' + mm + ' meter. Berapa sentimeter?', eq: mm + ' m = ? cm', ans: cm + ' cm', alts: [mm * 10 + ' cm', mm * 1000 + ' cm', (mm + 1) * 100 + ' cm'],
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
        q = { prompt: 'Ada ' + s1 + ' kotak, tiap kotak ' + s2 + ' ' + noun + '. ' + gv + ' dibagikan. Sisa berapa?', eq: s1 + ' × ' + s2 + ' − ' + gv + ' = ?', ans: String(res),
          alts: numAlts(res, [gv > 10 ? 10 : 2, -1, 1, s2]), calc: { op: 'story', a: s1, b: s2, c: gv }, explain: s1 + ' × ' + s2 + ' = ' + (s1 * s2) + ', lalu ' + (s1 * s2) + ' − ' + gv + ' = ' + res + '.', hint1: 'Langkah 1: kalikan. Langkah 2: kurangi.', hint2: 'Semua ' + noun + ': ' + s1 + ' × ' + s2 + '.' }
        kind = 'story'
      }
    }
    var id = 'h-' + kind + '-' + JSON.stringify(q.calc).replace(/[^0-9a-z,]/gi, '')
    return { id: id, domain: 'matematika', level: 4, hard: true, kind: kind, prompt: q.prompt, eq: q.eq, visual: [], scene: q.scene || { mode: 'none', groups: [] },
      choices: uniq4(q.ans, q.alts, r), answer: q.ans, explain: q.explain, hint1: q.hint1, hint2: q.hint2, step1: q.hint1, calc: q.calc, world: opts.world || null }
  }
  // answer check for a Sulit question, recomputed from its calc (the gate runs this)
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
  // passenger figures: boys, men and HIJAB girls only (owner rule) — mirrors TKIcon p0..p7 for pages without it
  var PEOPLE_KEYS = ['tk-char/hijab-girl-book', 'tk-char/explorer-kid', 'tk-char/officer-boy', 'tk-char/hijab-girl-camera', 'tk-char/chef', 'tk-char/mechanic-boy', 'tk-char/hijab-officer-tablet', 'tk-char/lantern-boy']
  var personN = 0
  function npeople () { return (W.TKIcon && W.TKIcon.PEOPLE) || PEOPLE_KEYS.length }
  function pfig (k, cls) { return W.TKIcon ? ic('p' + k, cls) : '<img class="' + cls + '" src="' + esc(libFn(null)(PEOPLE_KEYS[k % PEOPLE_KEYS.length])) + '" alt="" draggable="false">' }
  function person () { return pfig(personN++ % npeople(), 'tkq-p') }
  function people (n, seed) { var h = ''; for (var i = 0; i < n; i++) h += pfig((seed * 3 + i) % npeople(), 'tkq-p'); return h }
  // a sprite icon through the TKIcon re-skin table, or straight from the library outside the game
  function sprite (name, key, lib) { return W.TKIcon ? ic(name) : '<img src="' + esc(lib(key)) + '" alt="" draggable="false">' }
  /* ── read-aloud: Indonesian narration via the hub (TKHub.say respects the narration settings) ── */
  var NUMW = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas']
  function numWord (n) { return n <= 11 ? NUMW[n] : n < 20 ? NUMW[n - 10] + ' belas' : n === 20 ? 'dua puluh' : String(n) }
  // Arabic script is dropped from the Indonesian voice (it would be spelled out); the transliteration is used instead
  function spoken (t) { return String(t == null ? '' : t).replace(/[\u0600-\u06FF\u0750-\u077F]+/g, ' ').replace(/[«»]/g, '').replace(/\s+/g, ' ').trim() }
  function narrator (opts) {
    return function (text, force) {
      if (opts.narrate === false && !force) return false
      try { if (W.TKHub && typeof W.TKHub.say === 'function') { W.TKHub.say(spoken(text)); return true } } catch (e) {}
      return false
    }
  }
  function choiceWords (q, c) {
    if (q.trs && q.trs[c]) return q.trs[c]
    if (/[\u0600-\u06FF]/.test(c)) return q.tr || ''
    return c
  }
  function questionWords (q) {
    var t = q.prompt
    if (q.ar && q.tr && !q.listen && !q.letters) t += ' ' + q.tr
    return t
  }
  var SORT_TUTORED = false
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
  // owner 2026-09-29: the captain is the old man; the penguin is only his assistant (never "Pingu", a trademark)
  var PENGUIN = 'Kapten', ASSIST = 'Asisten Pinguin'
  var PRAISE = ['Hebat! Kamu makin pintar!', 'Luar biasa!', 'Tepat sekali!', 'Pintar! Ayo lanjut!', 'Keren, kamu berhasil!']
  var ENCOURAGE = ['Tidak apa-apa, coba lagi ya!', 'Hampir! Lihat petunjuknya.', 'Ayo, kita cari bersama!', 'Pelan-pelan saja, kamu bisa!']

  var CSS = [
    '.tkq{position:absolute;inset:0;box-sizing:border-box;display:grid;gap:10px;padding:10px 12px 10px;font-family:"Fredoka One","Fredoka","Baloo 2",system-ui,sans-serif;color:#3A2A10;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;overflow:hidden}',
    '.tkq *{box-sizing:border-box}',
    // ui-08 layout. tall: stats / plate+tabs / card / characters / footer. wide: Timmy | plate+tabs+card | stats+penguin, footer across.
    '.tkq-tall{grid-template-columns:minmax(0,1fr);grid-template-rows:auto auto minmax(0,1fr) auto auto;grid-template-areas:"stats" "top" "card" "chars" "foot";gap:8px}',
    '.tkq-wide{grid-template-columns:minmax(130px,19%) minmax(0,1fr) minmax(150px,17%);grid-template-rows:auto minmax(0,1fr) auto;grid-template-areas:"left top right" "left card right" "foot foot foot"}',
    '.tkq-stats{grid-area:stats}.tkq-top{grid-area:top}.tkq-card{grid-area:card}.tkq-chars{grid-area:chars}.tkq-foot{grid-area:foot}.tkq-left{grid-area:left}.tkq-right{grid-area:right}',
    '.tkq-wide .tkq-card{justify-self:center;width:min(720px,60vw,100%)}',
    '.tkq-wide .tkq-right{justify-content:space-between}',
    // parchment title plate + domain tabs (display only)
    '.tkq-top{display:flex;flex-direction:column;align-items:center;gap:6px;min-width:0}',
    '.tkq-plate{position:relative;max-width:100%;padding:8px 34px 9px;text-align:center;color:#3A2208;background:linear-gradient(175deg,#FBEFD2 0%,#EFD9A8 55%,#E2C184 100%);border:2px solid #B98A4A;border-radius:10px 16px 10px 16px;box-shadow:0 6px 16px rgba(20,20,40,.35),inset 0 0 0 3px rgba(255,248,226,.7),inset 0 -6px 12px rgba(150,100,40,.18);transform:rotate(-1deg)}',
    '.tkq-plate::before,.tkq-plate::after{content:"";position:absolute;top:10px;bottom:10px;width:14px;border:2px solid #B98A4A;background:linear-gradient(90deg,#E2C184,#F6E6C0);border-radius:8px}.tkq-plate::before{left:-8px}.tkq-plate::after{right:-8px}',
    '.tkq-plate h2{margin:0;font-weight:normal;font-size:clamp(22px,3vw,36px);line-height:1.05;letter-spacing:.01em}',
    '.tkq-plate p{margin:3px 0 0;font-family:system-ui,sans-serif;font-size:clamp(12px,1.3vw,15px);font-style:italic;color:#5A3A12}',
    '.tkq-tabs{display:flex;gap:6px;padding:5px;border-radius:16px;background:rgba(16,34,78,.82);border:2px solid rgba(150,185,240,.45);max-width:100%}',
    '.tkq-tab{display:flex;align-items:center;gap:6px;min-width:0;padding:4px 12px 4px 4px;border-radius:12px;border:2px solid transparent;color:#DCE8FF;font-size:15px;white-space:nowrap;opacity:.78}',
    '.tkq-tab i{flex:none;display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:var(--c);box-shadow:inset 0 -3px 0 rgba(0,0,0,.2)}.tkq-tab img{width:24px;height:24px;object-fit:contain}',
    '.tkq-tab.on{opacity:1;color:#fff;background:linear-gradient(#2F63C8,#1D448F);border-color:#9CC3FF;box-shadow:0 0 0 2px rgba(255,255,255,.25),0 4px 10px rgba(0,0,0,.3)}',
    '.tkq-tall .tkq-tabs{width:100%;justify-content:space-between;gap:2px;padding:4px}.tkq-tall .tkq-tab{flex:1 1 auto;flex-direction:column;gap:2px;padding:3px 1px;font-size:12px}.tkq-tall .tkq-tab span{max-width:100%;overflow:hidden;text-overflow:ellipsis}',
    '.tkq-tall .tkq-plate{padding:5px 26px 6px}.tkq-tall .tkq-plate h2{font-size:24px}.tkq-tall .tkq-plate p{font-size:12px}',
    // stepper footer: Kembali | Kuis - Jelajah - Aktivitas - Hadiah | Lanjut
    '.tkq-steps{flex:1;min-width:0;display:flex;justify-content:center;margin:0;padding:0;list-style:none}',
    '.tkq-step{position:relative;flex:0 1 120px;display:flex;flex-direction:column;align-items:center;gap:3px;color:#C8D6F0;font-size:14px}',
    '.tkq-step+.tkq-step::before{content:"";position:absolute;top:17px;right:calc(50% + 22px);width:calc(100% - 44px);border-top:3px dotted rgba(200,214,240,.7)}',
    '.tkq-step i{position:relative;display:block;width:36px;height:36px;border-radius:50%;background:rgba(18,36,78,.9);border:3px solid #9FB3D6}',
    '.tkq-step i::after{content:"";position:absolute;left:50%;top:50%;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:#9FB3D6}',
    '.tkq-step.cur{color:#fff}.tkq-step.cur i{background:linear-gradient(#3C86F0,#1F55C0);border-color:#fff;box-shadow:0 0 0 4px rgba(90,160,255,.45)}',
    '.tkq-step.cur i::after{width:0;height:0;border-radius:0;background:none;margin:-8px 0 0 -4px;border-left:13px solid #fff;border-top:8px solid transparent;border-bottom:8px solid transparent}',
    '.tkq-step.done i{border-color:#6FD08A}.tkq-step.done i::after{background:#6FD08A}',
    '.tkq-back{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:56px;min-width:120px;padding:8px 18px;border-radius:16px;background:rgba(16,34,78,.9);border:2px solid rgba(160,190,240,.6);color:#fff;font-size:21px}',
    '.tkq-back[hidden]{display:inline-flex;visibility:hidden}',
    '.tkq-ai{position:relative;display:inline-block;flex:none;width:22px;height:4px;border-radius:2px;background:currentColor}',
    '.tkq-ai::after{content:"";position:absolute;right:-1px;top:50%;width:10px;height:10px;border-top:4px solid currentColor;border-right:4px solid currentColor;border-radius:1px;transform:translateY(-50%) rotate(45deg)}',
    '.tkq-ai.l{transform:scaleX(-1)}',
    '.tkq-tall .tkq-step span{display:none}.tkq-tall .tkq-step.cur span{display:block;font-size:12px}.tkq-tall .tkq-step i{width:22px;height:22px;border-width:2px}.tkq-tall .tkq-step+.tkq-step::before{top:10px;right:calc(50% + 13px);width:calc(100% - 26px)}',
    '.tkq-tall .tkq-step.cur i::after{margin:-5px 0 0 -2px;border-left-width:8px;border-top-width:5px;border-bottom-width:5px}.tkq-tall .tkq-step i::after{width:6px;height:6px;margin:-3px 0 0 -3px}',
    '@media (max-width:480px){.tkq-tall .tkq-back .tx{display:none}}.tkq-tall .tkq-step{position:relative}.tkq-tall .tkq-step.cur span{position:absolute;top:24px;white-space:nowrap}.tkq-tall .tkq-steps{align-self:flex-start;padding-top:8px;min-height:44px}',
    '.tkq-tall .tkq-back{min-width:56px;padding:8px 12px;font-size:17px}.tkq-tall .tkq-next{min-width:108px;padding:8px 14px;font-size:19px}',
    '.tkq-foot{padding:6px 10px;border-radius:18px;background:rgba(12,28,64,.84);border:2px solid rgba(150,185,240,.35);box-shadow:0 6px 16px rgba(0,0,0,.3)}',
    '.tkq-wide:not(.tkq-short) .tkq-card{align-self:start;margin-top:4px}',
    '.tkq-tall .tkq-tab{letter-spacing:-.02em}.tkq-tall .tkq-tab i{width:30px;height:30px}.tkq-tall .tkq-tab img{width:21px;height:21px}',
    '.tkq-tall .tkq-cimg{height:clamp(72px,11vh,120px)}.tkq-tall .tkq-cimg.peng{height:clamp(62px,9.5vh,104px)}.tkq-tall .tkq-opt{min-height:62px}.tkq-tall .tkq-foot{padding:4px 6px}',
    '.tkq-tall:not(.tkq-sort) .tkq-help,.tkq-short:not(.tkq-sort) .tkq-help{display:none}.tkq-tall .tkq-help:empty,.tkq-short .tkq-help:empty{display:none}.tkq-tall .tkq-stats{padding:4px 8px}.tkq-tall .tkq-top{gap:4px}.tkq-tall .tkq-tab i{width:28px;height:28px}.tkq-tall .tkq-plate h2{font-size:clamp(18px,5.4vw,22px);white-space:nowrap}',
    '.tkq-tall .tkq-stat>div{display:flex;align-items:baseline;gap:5px}.tkq-tall .tkq-stat b{display:inline}.tkq-tall .tkq-cimg{height:clamp(64px,10vh,110px)}',
    '.tkq-tall .tkq-scene{min-height:0;flex:none}.tkq-tall .tkq-grp{max-width:62%}.tkq-tall .tkq-clock{width:104px;height:104px}.tkq-tall .tkq-plate p{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tkq-tall .tkq-ship{width:84px}.tkq-tall .tkq-card{padding:10px 12px 12px}',
    // short landscape (phone on its side): plate and tabs share one row, compact everything
    '.tkq-short{gap:6px;padding-bottom:6px}.tkq-short .tkq-top{flex-direction:row;justify-content:center;gap:10px}',
    '.tkq-short .tkq-plate{padding:3px 20px 4px;transform:none}.tkq-short .tkq-plate h2{font-size:18px}.tkq-short .tkq-plate p{display:none}.tkq-short .tkq-plate::before,.tkq-short .tkq-plate::after{top:5px;bottom:5px;width:10px}',
    '.tkq-short .tkq-tabs{padding:3px;gap:3px}.tkq-short .tkq-tab{padding:2px}.tkq-short .tkq-tab span{display:none}.tkq-short .tkq-tab i{width:30px;height:30px}.tkq-short .tkq-tab img{width:21px;height:21px}',
    '.tkq-short .tkq-card{padding:8px 12px 10px;gap:6px}.tkq-short .tkq-head{min-height:32px}.tkq-short .tkq-hintbtn{min-height:56px;padding:2px 10px}.tkq-short .tkq-scene{min-height:0;padding:2px}',
    '.tkq-short .tkq-stats{gap:3px;padding:6px 8px}.tkq-short .tkq-stat img{width:26px;height:26px}.tkq-short .tkq-stat b{font-size:17px}',
    '.tkq-short{grid-template-columns:minmax(112px,15%) minmax(0,1fr) minmax(128px,16%)}.tkq-short .tkq-card{width:100%}',
    '.tkq-short:not(.tkq-sort) .tkq-card{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);grid-template-rows:auto auto minmax(0,1fr) auto auto;column-gap:10px;row-gap:4px;grid-template-areas:"prompt head" "eq ans" "scene ans" "help ans" "explain ans"}',
    '.tkq-short .tkq-head .tkq-badge{display:none}.tkq-short .tkq-head{justify-content:flex-end;align-self:start}.tkq-short .tkq-prompt{text-align:left;align-self:center}',
    '.tkq-short .tkq-head{grid-area:head}.tkq-short .tkq-prompt{grid-area:prompt}.tkq-short .tkq-eq{grid-area:eq}.tkq-short .tkq-scene{grid-area:scene}.tkq-short .tkq-help{grid-area:help;font-size:14px;min-height:0}.tkq-short .tkq-ans{grid-area:ans;align-self:center}.tkq-short .tkq-explain{grid-area:explain;font-size:14px;padding:4px 8px}',
    '.tkq-short.tkq-wide .tkq-ans{grid-template-columns:repeat(2,minmax(0,1fr))}.tkq-short .tkq-ship{width:64px}.tkq-short .tkq-clock{width:96px;height:96px}',
    '.tkq-short .tkq-step{font-size:12px}.tkq-short .tkq-step i{width:28px;height:28px}.tkq-short .tkq-step+.tkq-step::before{top:13px;right:calc(50% + 18px);width:calc(100% - 36px)}',
    '.tkq-short .tkq-back{min-height:56px;min-width:100px;font-size:18px}.tkq-short .tkq-next{min-height:56px;min-width:120px;font-size:19px}.tkq-short .tkq-foot{padding:3px 8px}',
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
    '.tkq-o{position:relative;width:calc(var(--s,44px) * var(--k,1));height:calc(var(--s,44px) * var(--k,1));display:flex;align-items:center;justify-content:center;opacity:0;transform:translateY(10px) scale(.8);transition:opacity .35s ' + EASE + ',transform .45s ' + EASE + '}',
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
    '.tkq-q{width:calc(var(--s,44px) * var(--k,1));height:calc(var(--s,44px) * var(--k,1));border-radius:12px;border:3px dashed #C9A56A;background:#fff;display:flex;align-items:center;justify-content:center;color:#8A6A1E;font-size:26px}',
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
    '.tkq-wide .tkq-opt{min-height:84px;font-size:clamp(18px,2vw,24px)}.tkq-wide .tkq-opt.num{font-size:34px}.tkq-tall .tkq-opt{min-height:68px}',
    '.tkq-short .tkq-opt{min-height:58px;padding:4px}.tkq-short .tkq-opt.num{font-size:28px}.tkq-short .tkq-ans{gap:8px}.tkq-short .tkq-prompt{font-size:18px}',
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
    '.tkq-char{display:flex;align-items:flex-end;gap:6px;min-height:0}.tkq-char img{height:clamp(84px,17vh,190px);width:auto;max-width:100%;object-fit:contain;transform-origin:50% 100%;filter:drop-shadow(0 6px 10px rgba(0,0,0,.35))}',
    '.tkq-wide .tkq-char.timmy img{height:clamp(120px,44vh,380px)}.tkq-wide .tkq-char.peng img{height:clamp(84px,24vh,230px)}',
    '.tkq-short .tkq-char.timmy img{height:clamp(96px,40vh,170px)}.tkq-short .tkq-char.peng img{height:clamp(60px,22vh,100px)}.tkq-short .tkq-bub{font-size:13px;padding:6px 8px}',
    '.tkq-char.peng img{height:clamp(70px,14vh,150px)}',
    '.tkq-bub{position:relative;max-width:230px;background:#fff;border-radius:16px;padding:8px 10px 8px;font-family:system-ui,sans-serif;font-size:14px;line-height:1.3;color:#1F2A44;box-shadow:0 4px 12px rgba(0,0,0,.18);transition:opacity .25s ' + EASE + ',transform .3s ' + EASE + '}',
    '.tkq-bub b{display:inline-block;margin:-18px 0 4px;padding:2px 10px;border-radius:10px;background:#1F4FA0;color:#fff;font-family:"Fredoka One",system-ui,sans-serif;font-weight:normal;font-size:13px}',
    '.tkq-bub.pop{animation:tkqPop .38s ' + EASE + '}',
    '.tkq-wide .tkq-left .tkq-char{flex-direction:column;align-items:flex-start}.tkq-wide .tkq-right .tkq-char{flex-direction:column;align-items:flex-end}',
    '.tkq-foot{display:flex;align-items:center;justify-content:space-between;gap:10px}',
    '.tkq-next{display:inline-flex;align-items:center;gap:8px;min-height:60px;min-width:150px;padding:8px 22px;border-radius:18px;background:linear-gradient(#FFE27A,#F5B700);border:2px solid #C98F00;box-shadow:0 4px 0 #A87700;color:#3A2A00;font-size:22px;justify-content:center}',
    '.tkq-next svg{width:26px;height:26px}.tkq-next:disabled{opacity:.45;filter:saturate(.6)}',
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
    '.tkq-bin .bh .bi{flex:none;display:inline-flex}.tkq-bin .bh img.tk-ico--lifeboat{width:54px;height:34px}.tkq-say img,.tkq-next img,.tkq-hintbtn img{width:28px;height:28px;object-fit:contain}.tkq-opt .ck img{width:100%;height:100%;object-fit:contain}',
    // sort layout: tall = plate / card (bins over tray) / footer; wide = bins beside the tray so nothing sits below the fold
    '.tkq-sort.tkq-tall{grid-template-rows:auto minmax(0,1fr) auto;grid-template-areas:"top" "card" "foot"}',
    '.tkq-sort.tkq-wide{grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(0,1fr) auto;grid-template-areas:"top" "card" "foot"}',
    '.tkq-sort.tkq-wide .tkq-card{width:min(1040px,100%);max-height:100%}.tkq-sort.tkq-short{grid-template-rows:minmax(0,1fr) auto;grid-template-areas:"card" "foot"}',
    '.tkq-sortbody{display:flex;flex-direction:column;gap:10px;min-height:0;flex:1}',
    '.tkq-wide .tkq-sortbody{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(240px,1fr);align-items:stretch}.tkq-wide .tkq-sortbody .tkq-tray{align-content:flex-start;min-height:0;overflow:auto}',
    '.tkq-wide .tkq-bin{min-height:120px}.tkq-sort .tkq-help{min-height:20px}.tkq-sort .tkq-count{font-size:17px;color:#1F3B73}',
    '.tkq-short.tkq-sort .tkq-card{display:grid;grid-template-columns:auto minmax(0,1fr);grid-template-rows:auto auto minmax(0,1fr) auto;grid-template-areas:"h p" "x x" "b b" "e e";column-gap:12px;row-gap:4px;padding:6px 10px 8px}',
    '.tkq-short.tkq-sort .tkq-head{grid-area:h;min-height:30px}.tkq-short.tkq-sort .tkq-badge{display:none}.tkq-short.tkq-sort .tkq-prompt{grid-area:p;font-size:16px;text-align:left;align-self:center}',
    '.tkq-short.tkq-sort .tkq-help{grid-area:x}.tkq-short.tkq-sort .tkq-sortbody{grid-area:b;gap:8px;grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.tkq-short.tkq-sort .tkq-explain{grid-area:e}',
    '.tkq-short .tkq-tray{gap:6px;padding:4px}.tkq-short .tkq-item{min-width:64px;min-height:60px;padding:2px 4px}.tkq-short .tkq-item img{width:36px;height:36px}.tkq-short .tkq-item .ppl img{width:24px;height:32px}.tkq-short .tkq-item .lb{font-size:12px}',
    '.tkq-short .tkq-bin{min-height:120px;padding:4px}.tkq-short .tkq-bin .bh{font-size:14px}.tkq-short .tkq-bin .bh img{width:28px;height:28px}',
    '.tkq-item.drag{z-index:50;cursor:grabbing;box-shadow:0 10px 22px rgba(0,0,0,.25)}',
    '.tkq-item.sel{border-color:#1F4FA0;transform:translateY(-4px) scale(1.04)}',
    '.tkq-item.placed{min-width:56px;min-height:56px;box-shadow:none;border-color:#2EAD4B}.tkq-item.placed img{width:38px;height:38px}',
    '.tkq-item.no{animation:tkqWiggle .42s ' + EASE + '}',
    '.tkq-item.snap{transition:transform .38s ' + EASE + '}',
    '.tkq-wide .tkq-card{align-self:center;max-height:100%}.tkq-wide .tkq-left{justify-content:flex-end}.tkq-wide .tkq-right .tkq-char{margin-top:auto}',
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
    '@media (hover:hover){.tkq-opt:hover:not(:disabled){filter:brightness(1.04)}}',
    /* ── TKQuiz.challenge: one question card over the game (collision -> answer -> sail on) ── */
    '.tkq-chal{position:absolute;inset:0;z-index:60;display:grid;place-items:center;background:rgba(4,16,40,.7);opacity:0;transition:opacity .25s ease-out}.tkq-chal.on{opacity:1}',
    '.tkq-chal-box{position:relative;width:min(760px,calc(100% - 12px));height:min(700px,calc(100% - 12px));transform:translateY(16px) scale(.97);transition:transform .38s ' + EASE + '}.tkq-chal.on .tkq-chal-box{transform:none}',
    '.tkq-chal.rm .tkq-chal-box{transform:none;transition:none}',
    '.tkq.tkq-chmode{grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(0,max-content) auto auto;align-content:center;grid-template-areas:"top" "card" "chars" "foot";gap:8px;padding:6px}',
    '.tkq.tkq-chmode .tkq-card{width:100%;justify-self:stretch;align-self:start;margin:0}.tkq.tkq-chmode .tkq-plate p{white-space:normal}',
    '.tkq.tkq-chmode .tkq-next:disabled{opacity:.8}',
    '.tkq.tkq-chmode .tkq-chars{display:flex;align-items:flex-end;gap:6px}.tkq.tkq-chmode .tkq-chars .tkq-bub{flex:1;max-width:none;margin-bottom:12px}.tkq.tkq-chmode .tkq-cimg{height:clamp(64px,11vh,110px)}',
    '.tkq.tkq-chmode.tkq-short .tkq-chars{display:none}.tkq.tkq-chmode .tkq-help:not(:empty){display:block}',
    '.tkq.tkq-chmode .tkq-steps,.tkq.tkq-chmode .tkq-back{display:none}.tkq.tkq-chmode .tkq-foot{justify-content:center;background:transparent;border:0;box-shadow:none;padding:0}',
    '.tkq.tkq-chmode .tkq-next{min-width:240px;min-height:64px}.tkq.tkq-chmode .tkq-next:not(:disabled){box-shadow:0 4px 0 #A87700,0 0 0 5px rgba(255,226,122,.55)}',
    '.tkq.tkq-chmode .tkq-plate h2{font-size:clamp(20px,3vw,30px)}.tkq.tkq-chmode.tkq-short .tkq-plate p{display:block;font-size:12px}',
    /* ── ease pass (5–8 y, many not reading yet): speaker, glowing lantern, 3 big choices, tap-to-count,
       two-tap read-aloud answers, star burst, stepper motion, sort tutorial + seat rows ── */
    '.tkq-speak{position:relative;display:inline-flex;align-items:center;justify-content:center;flex:none;width:60px;height:60px;min-width:56px;min-height:56px;padding:0;border-radius:50%;background:radial-gradient(circle at 50% 38%,#FFF6D8,#F5D27A 70%,#D9A93F);border:3px solid #B98A4A;box-shadow:0 3px 0 #9A6E2E,0 6px 12px rgba(60,40,10,.25)}',
    '.tkq-speak img{width:40px;height:40px;object-fit:contain;pointer-events:none}',
    '.tkq-speak.talk img{animation:tkqRing .7s ' + EASE + '}',
    '@keyframes tkqRing{0%,100%{transform:none}25%{transform:rotate(-14deg)}55%{transform:rotate(11deg)}80%{transform:rotate(-5deg)}}',
    '.tkq-hintbtn{position:relative;isolation:isolate}.tkq-hintbtn img{width:32px;height:32px;object-fit:contain;position:relative;z-index:1}.tkq-hintbtn span{position:relative;z-index:1}',
    '.tkq-hintbtn::after{content:"";position:absolute;inset:-6px;border-radius:20px;background:radial-gradient(circle,rgba(255,214,90,.95) 0%,rgba(255,214,90,.45) 45%,rgba(255,214,90,0) 72%);opacity:0;pointer-events:none;z-index:0;transition:opacity .3s ' + EASE + '}',
    '.tkq-hintbtn.glow{border-color:#F5B700;background:#FFE890}.tkq-hintbtn.glow::after{animation:tkqGlow 1.5s ' + EASE + ' infinite}',
    '@keyframes tkqGlow{0%,100%{opacity:.35;transform:scale(.94)}50%{opacity:1;transform:scale(1.08)}}',
    // easy: bigger words, picture first, 3 roomy answers
    '.tkq-easy .tkq-prompt{font-size:clamp(20px,3vw,28px);line-height:1.25}',
    '.tkq-tall .tkq-head .tkq-badge{display:none}.tkq-tall.tkq-easy:not(.tkq-sort) .tkq-card .tkq-head{order:-3}.tkq-tall.tkq-easy .tkq-card .tkq-scene,.tkq-wide:not(.tkq-short).tkq-easy .tkq-card .tkq-scene{order:-2}.tkq-wide:not(.tkq-short).tkq-easy .tkq-card .tkq-head{order:-3}',
    '.tkq-ans.n3.num{grid-template-columns:repeat(3,minmax(0,1fr))!important}.tkq-ans.n3.txt{grid-template-columns:minmax(0,1fr)!important}.tkq-wide:not(.tkq-short) .tkq-ans.n3.txt{grid-template-columns:repeat(3,minmax(0,1fr))!important}',
    '.tkq-easy .tkq-opt.num{font-size:clamp(32px,4.4vw,42px)}.tkq-easy .tkq-opt{min-height:72px;font-size:clamp(19px,2.6vw,26px)}.tkq-short.tkq-easy .tkq-opt{min-height:60px}.tkq-short.tkq-easy .tkq-opt.num{font-size:32px}',
    '.tkq-short.tkq-easy .tkq-prompt{font-size:19px;line-height:1.2}.tkq-short .tkq-head .tkq-count{display:none}.tkq-short .tkq-speak{width:56px;height:56px}.tkq-short .tkq-speak img{width:36px;height:36px}',
    // short landscape: speaker + lantern become a slim column on the left so the answers get the full right-column height
    '.tkq-short:not(.tkq-sort) .tkq-card{grid-template-columns:56px minmax(0,1.35fr) minmax(0,1fr);grid-template-rows:auto auto minmax(0,1fr) auto;grid-template-areas:"head prompt ans" "head eq ans" "head scene ans" "head explain ans"}',
    '.tkq-short:not(.tkq-sort) .tkq-head{flex-direction:column;justify-content:flex-start;align-items:center;gap:8px;align-self:start}.tkq-short .tkq-hintbtn{width:56px;padding:2px;justify-content:center}.tkq-short .tkq-hintbtn span{display:none}',
    '.tkq-short.tkq-easy .tkq-grp{max-width:100%}',
    '.tkq-short .tkq-bin .tkq-item.placed{min-width:56px;min-height:56px;padding:2px}.tkq-short .tkq-bin .tkq-item.placed .lb{display:none}.tkq-short .tkq-bin .tkq-seats{margin-top:-2px}.tkq-short .tkq-bin .tkq-seats+.cap{display:none}.tkq-short.tkq-sort .tkq-explain{grid-area:x;padding:3px 8px;font-size:14px}',
    '.tkq-easy .tkq-opt img{width:60px;height:60px}.tkq-short.tkq-easy .tkq-opt img{width:44px;height:44px}',
    // two-tap read-aloud: first tap = hear it (ring), second tap = choose
    '.tkq-opt.armed{border-color:#F5B700;box-shadow:0 0 0 4px rgba(255,213,74,.9),0 3px 0 #8DB3DD;transform:translateY(-2px)}',
    '.tkq-opt .ear{position:absolute;left:6px;top:5px;width:22px;height:22px;opacity:0;transform:scale(.5);transition:opacity .2s ' + EASE + ',transform .25s ' + EASE + '}.tkq-opt .ear img{width:100%;height:100%;object-fit:contain}.tkq-opt.armed .ear{opacity:1;transform:none}',
    // tap-to-count
    '.tkq-scene.tapcount .tkq-o:not(.leave){cursor:pointer;pointer-events:auto}.tkq-o.counted img{filter:drop-shadow(0 0 5px rgba(255,200,40,.95))}',
    '.tkq-o .n{min-width:24px;height:24px;line-height:24px;font-size:14px;right:-6px;top:-8px;box-shadow:0 2px 0 rgba(0,0,0,.2)}',
    '.tkq-o.tick{animation:tkqTick .32s ' + EASE + '}@keyframes tkqTick{40%{transform:scale(1.18)}100%{transform:none}}',
    // correct: star burst sprites
    '.tkq-burst{position:fixed;left:0;top:0;width:26px;height:26px;z-index:9998;pointer-events:none}.tkq-burst img{width:100%;height:100%}',
    // stepper: current dot pops in, the dotted trail before it draws
    '.tkq-step.cur i{animation:tkqStepIn .55s ' + EASE + ' both}.tkq-step.cur::before{transform-origin:left center;animation:tkqDraw .6s ' + EASE + ' both}',
    '@keyframes tkqStepIn{0%{transform:scale(.55);opacity:.3}70%{transform:scale(1.12)}100%{transform:none;opacity:1}}@keyframes tkqDraw{0%{transform:scaleX(0)}100%{transform:none}}',
    // sort tutorial + capacity seat rows
    '.tkq-item.tut{animation:tkqTut 1.1s ' + EASE + ' infinite;border-color:#F5B700;box-shadow:0 0 0 4px rgba(255,213,74,.85),0 3px 0 #8DB3DD}',
    '@keyframes tkqTut{0%,100%{transform:none}50%{transform:translateY(-6px) scale(1.06)}}',
    '.tkq-bin.tut{animation:tkqBinTut .9s ' + EASE + ' 2;border-color:#2EAD4B;border-style:solid}@keyframes tkqBinTut{0%,100%{transform:none}50%{transform:scale(1.05)}}',
    '.tkq-seats{display:flex;flex-wrap:wrap;justify-content:center;gap:3px}',
    '.tkq-seatp{position:relative;display:grid;place-items:end center;width:30px;height:40px;border-radius:9px 9px 5px 5px;background:linear-gradient(#8B5A2B,#6B4220);box-shadow:inset 0 -5px 0 rgba(0,0,0,.25)}',
    '.tkq-seatp.full{background:linear-gradient(#5E9BD8,#2F66A8)}.tkq-seatp img{width:30px;height:38px;object-fit:contain;opacity:0;transform:translateY(6px);transition:opacity .3s ' + EASE + ',transform .35s ' + EASE + '}.tkq-seatp.full img{opacity:1;transform:none}',
    '.tkq-short .tkq-seatp{width:24px;height:32px}.tkq-short .tkq-seatp img{width:24px;height:30px}',
    '.tkq-rm .tkq-hintbtn.glow::after{animation:tkqFade 1.6s linear infinite}.tkq-rm .tkq-item.tut,.tkq-rm .tkq-bin.tut{animation:tkqFade 1.2s linear 2}.tkq-rm .tkq-step.cur i,.tkq-rm .tkq-step.cur::before,.tkq-rm .tkq-o.tick,.tkq-rm .tkq-speak.talk img{animation:none}.tkq-rm .tkq-opt.armed{transform:none}',
    /* ── fill the frame (owner, real tablet 2026-09-28: a small card in a big empty space). The card takes the
       whole middle column; the answers take the rest of the card and grow into big picture cards (3 in a row
       on a landscape tablet, stacked on portrait, 2x2 for four); pictures and labels scale with the button. ── */
    '.tkq-fill.tkq-wide{grid-template-columns:minmax(120px,15%) minmax(0,1fr) minmax(140px,15%)}',
    '.tkq-fill.tkq-wide .tkq-card{width:min(1180px,100%);align-self:stretch;margin-top:0;max-height:100%}',
    '.tkq-fill .tkq-card{gap:10px}',
    '.tkq-fill .tkq-ans{flex:1 1 auto;min-height:0;grid-auto-rows:minmax(64px,1fr);align-content:stretch;align-items:center;gap:12px}',
    '.tkq-fill .tkq-opt{height:100%;max-height:340px;min-height:64px;padding:clamp(4px,1vh,10px) 8px;gap:clamp(2px,.6vh,6px);border-radius:20px;border-width:3px;box-shadow:0 4px 0 #8DB3DD}',
    '.tkq-fill .tkq-opt img{flex:1 1 0;width:100%;min-height:20px;max-height:200px;height:auto}',
    '.tkq-fill .tkq-opt .lb{flex:none;font-size:clamp(17px,2.2vw,30px);line-height:1.1}',
    '.tkq-fill .tkq-opt>span:first-child:not(.tkq-ar){font-size:clamp(20px,3vw,40px)}.tkq-fill .tkq-opt.num>span:first-child{font-size:clamp(34px,5vw,64px)}',
    '.tkq-fill .tkq-opt .tkq-ar{font-size:clamp(44px,5vw,52px)}',
    '.tkq-fill .tkq-opt .ck{width:clamp(22px,3vw,36px);height:clamp(22px,3vw,36px)}',
    '.tkq-fill .tkq-prompt{font-size:clamp(20px,2.8vw,36px)}',
    '.tkq-fill.tkq-wide .tkq-ans.n3{grid-template-columns:repeat(3,minmax(0,1fr))!important}',
    '.tkq-fill.tkq-wide .tkq-ans:not(.n3){grid-template-columns:repeat(2,minmax(0,1fr))}',
    /* landscape tablet proportions (owner photo 2026-09-29 "tidak proporsional"): the picture is the hero of the
       card (the scene takes the free height, objects scale up to fill it), answers are one compact row of big
       numbers / words (90–124 px tall), and Timmy (left) + the old Kapten (right, the penguin assistant small at
       his side) stand full-size beside a centred card of ~55–60 % width */
    '.tkq-fill.tkq-wide:not(.tkq-short){grid-template-columns:minmax(200px,20%) minmax(0,1fr) minmax(230px,23%)}',
    '.tkq-fill.tkq-wide:not(.tkq-short) .tkq-card{justify-content:center}.tkq-noscene.tkq-fill.tkq-wide:not(.tkq-short):not(.tkq-chmode) .tkq-card{align-self:center;height:auto}',
    '.tkq-fill.tkq-wide:not(.tkq-short) .tkq-scene{flex:1 1 0;min-height:33%;align-content:center}',
    // the "benar" mark stays inside its answer (a wide flag sprite poked out of the first answer, owner photo)
    '.tkq-opt .ck img{width:100%!important;height:100%!important;max-width:100%!important;object-fit:contain}',
    // challenge card (lanes collision) on a landscape tablet: the same proportions — Timmy left, the Kapten
    // right, his bubble above him, never over the card; Arabic answers >= 40 px, 2x2 compact
    '@media (min-width:900px) and (min-height:560px){.tkq-chal-box{width:min(1240px,calc(100% - 12px));height:min(780px,calc(100% - 12px))}}',
    '.tkq.tkq-chmode.tkq-fill.tkq-wide{grid-template-columns:minmax(150px,19%) minmax(0,1fr) minmax(170px,22%);grid-template-rows:auto minmax(0,1fr) auto;grid-template-areas:"tim top cap" "tim card cap" "tim foot cap";align-content:stretch}',
    '.tkq.tkq-chmode.tkq-fill.tkq-wide .tkq-card{align-self:stretch}',
    '.tkq.tkq-chmode.tkq-fill.tkq-wide .tkq-chars{display:contents}',
    '.tkq.tkq-chmode.tkq-fill.tkq-wide .tkq-chars .tkq-cimg{grid-area:tim;align-self:end;justify-self:start;height:min(46vh,100%);max-width:100%}',
    '.tkq.tkq-chmode.tkq-fill.tkq-wide .tkq-chars .tkq-cimg.peng{grid-area:cap;justify-self:end;height:min(40vh,300px)}',
    '.tkq.tkq-chmode.tkq-fill.tkq-wide .tkq-chars .tkq-bub{grid-area:cap;align-self:start;margin:14px 0 0;max-width:100%;font-size:15px}',
    '.tkq-fill.tkq-wide:not(.tkq-short) .tkq-opt:has(.tkq-ar){max-height:130px;padding-top:4px;padding-bottom:6px;gap:0}.tkq-fill.tkq-wide:not(.tkq-short) .tkq-opt .tkq-ar{font-size:clamp(44px,3.8vw,52px)!important;line-height:1.2}.tkq-fill.tkq-wide:not(.tkq-short) .tkq-opt .tkq-tr{font-size:clamp(18px,1.6vw,22px)!important}',
    '.tkq-wide:not(.tkq-short) .tkq-opt .tkq-ar{font-size:max(44px,1em)}.tkq-wide:not(.tkq-short) .tkq-opt .tkq-tr{font-size:18px}',
    '.tkq-fill.tkq-wide:not(.tkq-short) .tkq-ans{flex:0 0 auto;grid-auto-rows:auto;justify-content:center}',
    '.tkq-fill.tkq-wide:not(.tkq-short) .tkq-ans.n3:not(.pic){grid-template-columns:repeat(3,minmax(0,240px))!important}',
    '.tkq-fill.tkq-wide:not(.tkq-short) .tkq-opt{height:auto;min-height:92px;max-height:124px}',
    '.tkq-fill.tkq-wide:not(.tkq-short) .tkq-opt.num>span:first-child{font-size:clamp(44px,4.4vw,56px)}.tkq-fill.tkq-wide:not(.tkq-short) .tkq-opt>span:first-child:not(.tkq-ar){font-size:clamp(22px,2.4vw,32px)}',
    '.tkq-fill.tkq-wide:not(.tkq-short) .tkq-opt.num>span:first-child{font-size:clamp(44px,4.4vw,56px)}',
    '.tkq-fill.tkq-wide:not(.tkq-short) .tkq-opt img{flex:0 0 auto;height:88px;min-height:0;width:auto;max-width:100%}.tkq-fill.tkq-wide:not(.tkq-short) .tkq-opt .lb{font-size:clamp(18px,1.7vw,22px);line-height:1.05}.tkq-fill.tkq-wide:not(.tkq-short) .tkq-opt:has(img){max-height:152px;gap:2px;padding-top:4px;padding-bottom:4px}',
    '.tkq-wide:not(.tkq-short) .tkq-char.timmy img{height:min(46vh,100%);max-width:100%}',
    '.tkq-char .tkq-capt{position:relative;display:block;line-height:0}',
    '.tkq-wide:not(.tkq-short) .tkq-char.peng .tkq-capt>img:first-child{height:min(42vh,340px);width:auto;max-width:100%}',
    '.tkq-char.peng .tkq-capt .asst{position:absolute;left:-14%;bottom:-2%;height:36%!important;width:auto!important;max-width:none!important;filter:drop-shadow(0 4px 6px rgba(0,0,0,.4))}',
    '.tkq-short .tkq-char.peng .tkq-capt>img:first-child{height:clamp(60px,26vh,110px)}.tkq-tall .tkq-char.peng .tkq-capt .asst{display:none}',
    '.tkq-wide:not(.tkq-short) .tkq-right{justify-content:space-between}.tkq-wide:not(.tkq-short) .tkq-left,.tkq-wide:not(.tkq-short) .tkq-right{overflow:visible}',
    '.tkq-wide:not(.tkq-short) .tkq-stat small{font-size:14px}.tkq-wide:not(.tkq-short) .tkq-bub{font-size:15px}',
    // portrait: three stack (one per row), four go 2x2; a stacked picture card lays out picture | label
    '.tkq-fill.tkq-tall .tkq-ans.n3{grid-template-columns:minmax(0,1fr)!important}',
    '.tkq-fill.tkq-tall .tkq-ans.n3 .tkq-opt{flex-direction:row;justify-content:center;gap:clamp(10px,3vw,28px);max-height:240px}',
    '.tkq-fill.tkq-tall .tkq-ans.n3 .tkq-opt img{flex:0 1 auto;width:auto;height:100%;max-width:45%;max-height:180px}.tkq-fill.tkq-tall .tkq-ans.n3 .tkq-opt .lb{flex:0 1 auto;min-width:0}',
    '.tkq-fill.tkq-tall .tkq-ans.n3 .tkq-opt .lb{font-size:clamp(20px,4.4vw,34px)}',
    '.tkq-fill.tkq-tall .tkq-ans.n3.num:not(.pic){grid-template-columns:repeat(3,minmax(0,1fr))!important}.tkq-fill.tkq-tall .tkq-ans.n3.num:not(.pic) .tkq-opt{max-height:360px}',
    '.tkq-fill.tkq-tall .tkq-ans.n3.pic .tkq-opt{max-height:300px}.tkq-fill.tkq-tall .tkq-ans.n3.pic .tkq-opt img{max-height:240px}',
    '.tkq-fill.tkq-tall .tkq-prompt{font-size:clamp(20px,4.2vw,34px)}',
    '.tkq-fill .tkq-scene{flex:0 1 auto}',
    // the Arabic word being asked about is the hero of its card (owner: "tulisan arabnya terlalu kecil"): >= 80 px on a
    // tablet, >= 56 px on a phone, transliteration >= 22 / 16 px; answers in Arabic >= 44 px everywhere
    '.tkq-scene .tkq-arw .tkq-ar{font-size:calc(clamp(56px,min(10.5vh,17vw),110px) * min(1,var(--k,1)) + 0px);line-height:1.35}',
    '.tkq-scene .tkq-arw .tkq-tr{font-size:clamp(16px,min(2.9vh,4.4vw),28px)}',
    '.tkq-cmp .tkq-scene .tkq-arw .tkq-ar{font-size:max(56px,calc(clamp(56px,min(10.5vh,17vw),110px) * var(--k,1)))}',
    '.tkq-opt .tkq-ar{font-size:44px;line-height:1.1}.tkq-opt .tkq-tr{font-size:14px}',
    // phones: an Arabic answer keeps its 44 px word with the transliteration BESIDE it (a stacked pair did not fit)
    '.tkq-tall .tkq-ans.n3.txt .tkq-opt:has(.tkq-ar){flex-direction:row;gap:10px}',
    '.tkq-tall .tkq-opt:has(.tkq-ar),.tkq-short .tkq-opt:has(.tkq-ar){padding-top:1px;padding-bottom:2px;gap:0}.tkq-tall .tkq-opt .tkq-ar,.tkq-short .tkq-opt .tkq-ar{line-height:1.05}.tkq-tall .tkq-opt .tkq-tr,.tkq-short .tkq-opt .tkq-tr{line-height:1}',
    // short landscape (844x390) with picture answers: the answer column takes the wider share, picture beside a
    // one-line label, so four picture answers fit as 2x2 inside the card
    '.tkq-short:not(.tkq-sort) .tkq-card:has(.tkq-ans.pic),.tkq-short:not(.tkq-sort) .tkq-card:has(.tkq-opt .tkq-ar){grid-template-columns:56px minmax(0,1fr) minmax(0,2.2fr)}.tkq-short:not(.tkq-sort) .tkq-card:has(.tkq-ans.n3.txt){grid-template-columns:56px minmax(0,1fr) minmax(0,2.2fr)}.tkq-short .tkq-ans.n3.txt{grid-template-columns:repeat(2,minmax(0,1fr))!important;align-content:center}',
    '.tkq-short .tkq-ans.pic .tkq-opt{flex-direction:row;gap:4px;padding:2px 4px}.tkq-short .tkq-ans.pic .tkq-opt img{flex:0 0 auto;width:auto;height:min(30px,55%);max-height:30px;min-height:0}',
    '.tkq-short .tkq-ans.pic .tkq-opt .lb{flex:0 1 auto;min-width:0;line-height:1.05;text-align:left}',
    // compact card (fitCard): tighter gaps and answer heights (still >= 44 px targets); pictures scale by --k
    '.tkq-cmp .tkq-card{gap:4px;padding-top:6px;padding-bottom:8px}.tkq-cmp .tkq-ans{gap:6px!important;grid-auto-rows:minmax(56px,1fr)!important}.tkq-cmp .tkq-opt{min-height:56px!important;padding-top:2px;padding-bottom:2px}',
    '.tkq-cmp .tkq-scene{min-height:0!important;padding:0 2px;gap:4px 8px}.tkq-cmp .tkq-head{min-height:0}.tkq-cmp .tkq-prompt{line-height:1.15}',
    '.tkq-card .tkq-clock{width:calc(var(--cw,128px) * var(--k,1));height:calc(var(--cw,128px) * var(--k,1))}.tkq-tall .tkq-card{--cw:104px}.tkq-short .tkq-card{--cw:96px}',
    '.tkq-card .tkq-ship{width:calc(var(--sw,108px) * var(--k,1))}.tkq-tall .tkq-card{--sw:84px}.tkq-short .tkq-card{--sw:64px}.tkq-cmp .tkq-opt img{min-height:16px}',
    // small phones (360x640): the tabs, the plate subtitle and the stats labels go first so the answers stay on screen
    '@media (max-height:720px){.tkq-tall .tkq-tabs,.tkq-tall .tkq-plate p,.tkq-tall .tkq-stat small{display:none}.tkq-tall .tkq-cimg{height:56px}.tkq-tall .tkq-cimg.peng{height:50px}.tkq-tall .tkq-chars .tkq-bub{margin-bottom:4px}.tkq-fill.tkq-tall .tkq-ans{grid-auto-rows:minmax(52px,1fr)}.tkq-fill.tkq-tall .tkq-opt{min-height:52px}.tkq-tall .tkq-card{padding:8px 10px 10px}.tkq-fill.tkq-tall .tkq-ans{gap:8px}}',
    '@media (max-height:680px){.tkq-tall:not(.tkq-chmode) .tkq-chars{display:none}.tkq-tall .tkq-head{min-height:0}.tkq-tall .tkq-speak{width:48px;height:48px;min-width:48px;min-height:48px}.tkq-tall .tkq-hintbtn{min-height:48px}}',
    // answer labels: centred, padded, never past the button edge (fitAnswers shrinks them first)
    '.tkq-opt{overflow:hidden;min-width:0;justify-content:center;align-items:center;padding-left:10px;padding-right:10px}',
    '.tkq-opt>span:not(.ck):not(.ear){display:block;max-width:100%;min-width:0;overflow:hidden;text-align:center;overflow-wrap:normal;word-break:normal}',
    '.tkq-opt.brk>span:not(.ck):not(.ear){overflow-wrap:anywhere}',
    // three picture answers in a short landscape: one row of three (picture over label) — a stack of three did not fit
    '.tkq-short .tkq-ans.n3.pic{grid-template-columns:repeat(3,minmax(0,1fr))!important;align-content:center}.tkq-short .tkq-ans.n3.pic .tkq-opt{flex-direction:column;gap:4px;min-height:96px;padding:6px 4px}.tkq-short .tkq-ans.n3.pic .tkq-opt img{height:44px;max-height:44px;width:auto;flex:0 0 auto}.tkq-short .tkq-ans.n3.pic .tkq-opt .lb{flex:0 1 auto;min-width:0;text-align:center}',
    '.tkq-opt img{flex:0 1 auto;min-height:20px}.tkq-opt .lb{flex:none;font-size:max(16px,1em)}.tkq-fill .tkq-opt .lb{font-size:clamp(17px,2.2vw,30px)}',
    // rotated after mount: landscape markup shown tall / portrait markup shown wide
    '.tkq-mw.tkq-tall{grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-rows:auto auto minmax(0,1fr) auto auto;grid-template-areas:"top top" "stats stats" "card card" "tim peng" "foot foot"}',
    '.tkq-mw .tkq-side{display:contents}.tkq-mw .tkq-char.timmy{grid-area:tim;flex-direction:row;align-items:flex-end}.tkq-mw .tkq-char.peng{grid-area:peng;flex-direction:row-reverse;align-items:flex-end}',
    '.tkq-mw .tkq-char img{height:clamp(64px,10vh,120px)}.tkq-mw .tkq-bub{max-width:none;flex:1}.tkq-mw .tkq-stats{flex-direction:row;justify-content:space-around}',
    '.tkq.tkq-mt.tkq-wide{grid-template-columns:minmax(140px,17%) minmax(0,1fr);grid-template-rows:auto minmax(0,1fr) auto;grid-template-areas:"stats top" "chars card" "foot foot"}',
    '.tkq-mt .tkq-chars{flex-direction:column;justify-content:flex-end;align-items:center}.tkq-mt .tkq-chars .tkq-bub{flex:none;margin:0}',
    // sort fill: the card takes the full height, the bins grow, items / seats / people are tablet-sized
    '.tkq-sfill.tkq-wide .tkq-card{align-self:stretch;max-height:100%}.tkq-sfill .tkq-sortbody{flex:1 1 auto;min-height:0}.tkq-sfill .tkq-card{gap:10px}',
    '.tkq-sfill.tkq-tall .tkq-bins{flex:1 1 auto;min-height:0}.tkq-sfill.tkq-tall .tkq-bin{min-height:0}.tkq-sfill.tkq-tall .tkq-seatp{flex-basis:50px}',
    '.tkq-sfill .tkq-bin{padding:10px;gap:8px}.tkq-sfill .tkq-bin .bh{font-size:clamp(16px,1.8vw,22px)}.tkq-sfill .tkq-bin .bh img{width:48px;height:48px}.tkq-sfill .tkq-bin .bh img.tk-ico--lifeboat{width:76px;height:48px}.tkq-sfill .tkq-bin .cap{font-size:15px}',
    '.tkq-sfill .tkq-tray{gap:clamp(6px,1.2vh,12px);padding:clamp(6px,1vh,10px)}.tkq-sfill .tkq-item{min-width:clamp(88px,9vw,112px);min-height:clamp(72px,11vh,104px);padding:4px 8px;font-size:15px;border-width:3px}.tkq-sfill .tkq-item img{width:clamp(40px,6.4vh,68px);height:clamp(40px,6.4vh,68px)}.tkq-sfill .tkq-item .num{font-size:clamp(28px,4.4vh,40px)}',
    '.tkq-sfill .tkq-item .ppl{padding-left:12px}.tkq-sfill .tkq-item .ppl img{width:clamp(30px,4.2vh,44px);height:clamp(40px,5.6vh,58px);margin-left:-12px}.tkq-sfill .tkq-item .lb{max-width:150px;font-size:16px}',
    '.tkq-sfill .tkq-item.placed{min-width:84px;min-height:78px}.tkq-sfill .tkq-item.placed img{width:52px;height:52px}.tkq-sfill .tkq-item.placed .ppl img{width:36px;height:48px}',
    // seats stay on one row: each seat shrinks with its lifeboat card (5 across) instead of wrapping to 4 + 1
    '.tkq-sfill .tkq-seats{gap:5px;flex-wrap:nowrap;width:100%;justify-content:center}.tkq-sfill .tkq-seatp{flex:0 1 48px;min-width:22px;width:auto;height:auto;aspect-ratio:3/4}.tkq-sfill .tkq-seatp img{width:100%;height:95%}.tkq-sfill .tkq-seats:has(.tkq-seatp:nth-child(9)){flex-wrap:wrap}.tkq-sfill .tkq-seats:has(.tkq-seatp:nth-child(9)) .tkq-seatp{flex:0 0 30px}',
    '.tkq.tkq-mt.tkq-short{grid-template-rows:minmax(0,1fr) auto;grid-template-areas:"chars card" "foot foot"}.tkq-mt.tkq-short .tkq-stats,.tkq-mt.tkq-short .tkq-top{display:none}'
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
  // a round cake cut into den equal slices, num of them coloured (Sulit: fractions of a picture)
  function fracSVG (num, den) {
    var sl = ''
    for (var i = 0; i < den; i++) {
      var a0 = -Math.PI / 2 + i * 2 * Math.PI / den, a1 = a0 + 2 * Math.PI / den
      sl += '<path d="M50 50 L' + (50 + 44 * Math.cos(a0)).toFixed(2) + ' ' + (50 + 44 * Math.sin(a0)).toFixed(2) + ' A44 44 0 0 1 ' + (50 + 44 * Math.cos(a1)).toFixed(2) + ' ' + (50 + 44 * Math.sin(a1)).toFixed(2) +
        ' Z" fill="' + (i < num ? '#F2A33A' : '#DCE8F7') + '" stroke="#8A5A1E" stroke-width="2.5"/>'
    }
    return '<svg class="tkq-clock tkq-frac" viewBox="0 0 100 100" role="img" aria-label="kue dibagi ' + den + ', ' + num + ' berwarna">' + sl + '</svg>'
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

  /* ══ shared ui-08 chrome: layout mode, plate, tabs, stepper footer, characters ══ */
  var TAB_ORDER = ['matematika', 'islam', 'arab', 'umum', 'logika']
  var TAB_COLOR = { matematika: '#2F6FD0', islam: '#2E9E5B', arab: '#7B4FD0', umum: '#1E88A8', logika: '#E0A21E' }
  var TAB_SHORT = { matematika: 'Matematika', islam: 'Islam', arab: 'Arab', umum: 'Umum', logika: 'Logika' }
  var STEPS = ['Kuis', 'Jelajah', 'Aktivitas', 'Hadiah']
  var DEFAULT_SUB = 'Jawab soalnya, bantu Timmy berlayar!'
  function layoutOf (host) {
    var w = host.clientWidth, h = host.clientHeight, wide = w > h * 1.15
    return { wide: wide, short: wide && h < 540 }
  }
  function rootFor (host, opts, L, reduced) {
    var root = document.createElement('div')
    root.className = 'tkq ' + (L.wide ? 'tkq-wide' : 'tkq-tall') + (L.short ? ' tkq-short' : '') + (reduced ? ' tkq-rm' : '')
    if (opts.topInset) root.style.paddingTop = (opts.topInset + (L.short ? 4 : 8)) + 'px'
    if (typeof opts.scene === 'string' && opts.scene) root.style.background = opts.scene
    return root
  }
  // re-layout on rotate / resize without re-mounting (state lives in the closure): swap the layout classes;
  // the markup built for the other orientation is placed by the .tkq-mw / .tkq-mt rules below
  function watchLayout (host, root, L0, fill) {
    var cur = L0.wide + ':' + L0.short, ro = null
    function check () {
      var L = layoutOf(host)
      if (!host.clientWidth || !host.clientHeight) return
      var k = L.wide + ':' + L.short
      if (k === cur) return
      cur = k
      root.classList.toggle('tkq-wide', L.wide); root.classList.toggle('tkq-tall', !L.wide); root.classList.toggle('tkq-short', L.short)
      root.classList.toggle('tkq-mw', L0.wide && !L.wide); root.classList.toggle('tkq-mt', !L0.wide && L.wide)
      if (fill) root.classList.toggle('tkq-fill', !L.short && (fill !== 'wide' || L.wide))
      if (root.classList.contains('tkq-sort')) root.classList.toggle('tkq-sfill', !L.short)
    }
    try { if (W.ResizeObserver) { ro = new W.ResizeObserver(check); ro.observe(host) } } catch (e) { ro = null }
    if (!ro && W.addEventListener) W.addEventListener('resize', check)
    return function () { try { if (ro) ro.disconnect(); else if (W.removeEventListener) W.removeEventListener('resize', check) } catch (e) {} }
  }
  function charSrc (opts, lib, who) {
    if (who === 'timmy') return opts.timmy || (W.TKArt ? W.TKArt.src('char/timmy') : lib('sd/explorer'))
    if (who === 'captain') return opts.captain || lib('tk-char/captain-pointing')
    return opts.penguin || (W.TKArt ? W.TKArt.src('char/penguin') : lib('animals/penguin'))
  }
  function plateHTML (title, sub) {
    return '<div class="tkq-plate"><h2>' + esc(title) + '</h2>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + '</div>'
  }
  function tabsHTML (lib, opts, cur) {
    return '<div class="tkq-tabs" role="list" aria-label="Bidang soal">' + TAB_ORDER.filter(function (d) { return !(opts.islam === false && d === 'islam') }).map(function (d) {
      var du = DOMAIN_UI[d]
      return '<div class="tkq-tab' + (d === cur ? ' on' : '') + '" role="listitem" data-d="' + d + '"' + (d === cur ? ' aria-current="true"' : '') + ' style="--c:' + TAB_COLOR[d] + '">' +
        '<i><img src="' + lib(du.icon) + '" alt="" draggable="false"></i><span>' + esc(TAB_SHORT[d]) + '</span></div>'
    }).join('') + '</div>'
  }
  function footHTML (opts, step, nextLabel) {
    var steps = '<ol class="tkq-steps" aria-label="Tahap petualangan">' + STEPS.map(function (s, i) {
      return '<li class="tkq-step' + (i === step ? ' cur' : i < step ? ' done' : '') + '"' + (i === step ? ' aria-current="step"' : '') + '><i></i><span>' + s + '</span></li>'
    }).join('') + '</ol>'
    return '<div class="tkq-foot"><button type="button" class="tkq-btn tkq-back" aria-label="Kembali"' + (typeof opts.onBack === 'function' ? '' : ' hidden') + '><span class="tkq-ai l" aria-hidden="true"></span><span class="tx">Kembali</span></button>' +
      steps + '<button type="button" class="tkq-btn tkq-next" disabled>' + esc(nextLabel) + ' <span class="tkq-ai" aria-hidden="true"></span></button></div>'
  }
  function wireBack (root, opts, sfx) {
    var b = root.querySelector('.tkq-back')
    if (b && typeof opts.onBack === 'function') b.addEventListener('click', function () { sfx('click'); try { opts.onBack() } catch (e) { if (W.console) console.error(e) } })
  }
  function stepOf (opts, dflt) { var s = opts.step; return typeof s === 'number' && s >= 0 && s < STEPS.length ? s : dflt }

  /* ══ mount: question set ═══════════════════════════════════════════ */
  function mount (host, set, opts) {
    opts = opts || {}
    injectCSS()
    if (opts.mastery == null && set && !Array.isArray(set) && set.mastery != null) opts = Object.assign({}, opts, { mastery: set.mastery })
    if (set && !Array.isArray(set) && set.type === 'sort') return mountSort(host, sortSet(set.domain, set.world, rng(set.seed || Date.now()), set), opts)
    var qs = Array.isArray(set) ? set : build({ domain: (set && set.domain) || opts.domain, world: set && set.world, count: set && set.count, level: set && set.level,
      grade: (set && set.grade) || opts.grade, islam: set && set.islam != null ? set.islam : opts.islam, mastery: opts.mastery, seed: (set && set.seed) || opts.seed,
      topic: (set && set.topic) || opts.topic, easy: opts.easy })
    if (opts.islam === false) qs = qs.filter(function (q) { return !q.islam })
    // easy mode per question (Kelas 1 / low mastery): 3 choices, bigger words, picture first
    var grade = (set && !Array.isArray(set) && set.grade) || opts.grade
    // Sulit (generated or Kelas 3–4 bank items) keeps its own choices: easyify's 0..10 numbers are for Kelas 1–2
    qs = qs.map(function (q) { return !q.hard && !(+q.grade >= 3) && isEasy(grade, masteryOf(opts.mastery, q.domain), opts.easy) ? easyify(q) : q })
    var lib = libFn(opts), sfx = sfxFn(opts), reduced = isReduced(opts), narrate = narrator(opts), twoTap = opts.readAloud === true
    var timers = [], alive = true
    function later (fn, ms) { var t = setTimeout(function () { if (alive) fn() }, reduced ? Math.min(ms, 120) : ms); timers.push(t); return t }
    var ms0 = {}, ms = {}
    qs.forEach(function (q) { if (!(q.domain in ms0)) { ms0[q.domain] = masteryOf(opts.mastery, q.domain); ms[q.domain] = ms0[q.domain] } })
    var S = { i: 0, right: 0, asked: 0, hints: 0, points: 0, streak: 0, rung: 0, wrong: 0, counted: 0, answered: false, results: [] }
    var noHints = opts.hints === false

    var L = layoutOf(host), wide = L.wide
    var root = rootFor(host, opts, L, reduced)
    // answers grow to fill the card (tablets); the challenge card only in landscape (beside Timmy + the Kapten)
    if (!L.short && (!opts.challenge || L.wide)) root.classList.add('tkq-fill')
    var unwatch = watchLayout(host, root, L, opts.challenge ? 'wide' : true)
    var timmySrc = charSrc(opts, lib, 'timmy'), pengSrc = charSrc(opts, lib, 'captain'), asstSrc = charSrc(opts, lib, 'peng')
    var specDom = (set && !Array.isArray(set) && set.domain) || opts.domain
    var single = specDom !== 'campur' && qs.length && qs.every(function (q) { return q.domain === qs[0].domain }) ? qs[0].domain : null
    var title = opts.title || (single && DOMAIN_UI[single] ? 'Tantangan ' + DOMAIN_UI[single].label : 'Tantangan Pengetahuan')
    var topic = (set && !Array.isArray(set) && set.topic) || opts.topic
    var statsHTML = '<div class="tkq-stats" aria-label="skor">' +
      '<div class="tkq-stat"><img src="' + lib('tk-prop/crate-plain') + '" alt=""><div><b data-k="soal">0/' + qs.length + '</b><small>Soal</small></div></div>' +
      '<div class="tkq-stat"><img src="' + lib('tk-ui/star') + '" alt=""><div><b data-k="poin">0</b><small>Poin</small></div></div>' +
      '<div class="tkq-stat"><img src="' + lib('tk-key/compass') + '" alt=""><div><b data-k="streak">0</b><small>Beruntun</small></div></div></div>'
    var bubT = '<div class="tkq-bub" data-b="' + (L.short ? 'x' : 't') + '"><b>Timmy</b><div class="tx">Ayo kita pecahkan bersama!</div></div>'
    var timmyHTML = '<div class="tkq-char timmy">' + bubT + '<img src="' + esc(timmySrc) + '" alt="Timmy" draggable="false"></div>'
    var pengHTML = '<div class="tkq-char peng">' + (L.short ? '' : '<div class="tkq-bub from-p" data-b="p"><b>' + PENGUIN + '</b><div class="tx">Semangat, pelaut kecil!</div></div>') +
      '<span class="tkq-capt"><img src="' + esc(pengSrc) + '" alt="' + PENGUIN + '" draggable="false"><img class="asst" src="' + esc(asstSrc) + '" alt="' + ASSIST + '" draggable="false"></span></div>'
    var cardHTML = '<section class="tkq-card" aria-live="off"><div class="tkq-head">' +
      '<button type="button" class="tkq-btn tkq-speak" aria-label="Dengar soal">' + sprite('listen', 'tk-prop/ship-bell', lib) + '</button><span class="tkq-count"></span>' +
      (noHints ? '' : '<button type="button" class="tkq-btn tkq-hintbtn" aria-label="Petunjuk">' + sprite('hint', 'tk-prop/lantern', lib) + '<span>Petunjuk</span></button>') + '<span class="tkq-badge"></span></div>' +
      '<div class="tkq-prompt"></div><div class="tkq-eq" hidden></div><div class="tkq-scene"></div><div class="tkq-help" aria-live="polite"></div>' +
      '<div class="tkq-ans" role="group" aria-label="Pilihan jawaban"></div><div class="tkq-explain" hidden aria-live="polite"></div></section>'
    var topHTML = '<div class="tkq-top">' + plateHTML(title, topic || DEFAULT_SUB) + tabsHTML(lib, opts, qs[0] && qs[0].domain) + '</div>'
    var chal = !!opts.challenge, chalNext = opts.nextLabel || 'Lanjut Berlayar'
    var foot = footHTML(opts, stepOf(opts, 0), chal ? chalNext : 'Lanjut')
    if (chal) {
      // TKQuiz.challenge: plate + one card + Timmy's bubble + a single big "Lanjut Berlayar" (no tabs/stats/stepper)
      root.classList.add('tkq-chmode')
      root.innerHTML = '<div class="tkq-top">' + plateHTML(opts.title || 'Tantangan Pengetahuan', opts.intro || topic || DEFAULT_SUB) + '</div>' + cardHTML +
        '<div class="tkq-chars"><img class="tkq-cimg" src="' + esc(timmySrc) + '" alt="Timmy" draggable="false">' +
        '<div class="tkq-bub" data-b="x"><b>Timmy</b><div class="tx">Ayo kita pecahkan bersama!</div></div>' +
        '<img class="tkq-cimg peng" src="' + esc(pengSrc) + '" alt="' + PENGUIN + '" draggable="false"></div>' + foot
    } else root.innerHTML = wide
      ? topHTML + '<div class="tkq-side tkq-left">' + timmyHTML + '</div>' + cardHTML + '<div class="tkq-side tkq-right">' + statsHTML + pengHTML + '</div>' + foot
      : statsHTML + topHTML + cardHTML + '<div class="tkq-chars"><img class="tkq-cimg" src="' + esc(timmySrc) + '" alt="Timmy" draggable="false">' +
        '<div class="tkq-bub" data-b="x"><b>Timmy</b><div class="tx">Ayo kita pecahkan bersama!</div></div>' +
        '<img class="tkq-cimg peng" src="' + esc(pengSrc) + '" alt="' + PENGUIN + '" draggable="false"></div>' + foot
    host.appendChild(root)
    var $ = function (s) { return root.querySelector(s) }
    var E = { count: $('.tkq-count'), badge: $('.tkq-badge'), prompt: $('.tkq-prompt'), eq: $('.tkq-eq'), scene: $('.tkq-scene'), help: $('.tkq-help'),
      ans: $('.tkq-ans'), explain: $('.tkq-explain'), next: $('.tkq-next'), hint: $('.tkq-hintbtn'), card: $('.tkq-card'), speak: $('.tkq-speak') }
    function ring () { if (!E.speak) return; E.speak.classList.remove('talk'); void E.speak.offsetWidth; E.speak.classList.add('talk') }
    function readQuestion (force) { var q = qs[S.i]; if (!q) return; if (narrate(questionWords(q), force)) ring() }

    function say (who, text) {
      if (helpLock && who === 't') return
      var b = root.querySelector('.tkq-bub[data-b="' + who + '"]')
      if (!b) { b = root.querySelector('.tkq-bub[data-b="x"]'); if (!b) return; b.querySelector('b').textContent = who === 'p' ? PENGUIN : 'Timmy'; b.classList.toggle('from-p', who === 'p') }
      b.querySelector('.tx').textContent = text
      b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop')
    }
    function stat (k, v) { var b = root.querySelector('[data-k="' + k + '"]'); if (!b) return; b.textContent = v; b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump') }
    // phone layouts have no room for a hint line inside the card (it pushed the answers below the fold):
    // Timmy says it instead, and holds it until the question changes or is answered
    var bubbleHelp = !chal && (!wide || L.short), helpLock = false
    function help (t) {
      E.help.textContent = t || ''; E.help.classList.toggle('on', !!t)
      if (!bubbleHelp) return
      helpLock = false
      if (t) { say('t', t); helpLock = true }
    }
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
        size = L.short ? (total <= 6 ? 38 : total <= 10 ? 30 : total <= 16 ? 24 : 22) : wide ? (total <= 6 ? 62 : total <= 10 ? 50 : total <= 16 ? 38 : 32) : (total <= 6 ? 44 : total <= 10 ? 34 : total <= 16 ? 28 : 24)
        if (q.easy && !L.short) size = Math.round(size * (wide ? 1.1 : 1.18))
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
          case 'frac': h = fracSVG(sc.num, sc.den); break
          default: h = ''
        }
        if (/^(count|add|sub|twostep|groups)$/.test(sc.mode)) h += '<span class="tkq-ship" aria-hidden="true">' + ICON.ship + '<span class="tkq-cargo"></span></span>'
      } else {
        var nv = (q.visual || []).length + (q.seq ? 1 : 0), avail = (E.scene.clientWidth || 320) - 12
        size = Math.max(30, Math.min(nv <= 1 ? (L.short ? 72 : wide ? 110 : 88) : nv <= 4 ? (L.short ? 56 : 80) : 64, Math.floor((avail - 10 * (nv - 1)) / Math.max(1, nv))))
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
      root.classList.toggle('tkq-noscene', !h)
      // counting scenes: every object can be tapped to count it aloud ("satu, dua, ...")
      E.scene.classList.toggle('tapcount', q.domain === 'matematika' && /^(count|add|sub|groups|diff|twostep)$/.test(sc.mode))
      var sayBtn = E.scene.querySelector('.tkq-say'); if (sayBtn) sayBtn.addEventListener('click', function () { speak(q.listen) })
      // objects arrive: stagger (base first, then the arriving group)
      var os = E.scene.querySelectorAll('.tkq-o,.tkq-op')
      Array.prototype.forEach.call(os, function (o, k) { later(function () { o.classList.add('in') }, 60 + k * 45) })
      var hide = q.domain === 'matematika' && tierOf(q) >= 3 && sc.mode !== 'clock' && sc.mode !== 'capacity'
      if (hide) { E.scene.style.display = 'none'; root.classList.add('tkq-noscene') }
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
      else { inner = '<span>' + esc(c).replace(/\+/g, '+<wbr>') + '</span>'; if (/^\d+$/.test(c)) cls += ' num' }   // "Rp500+Rp200+Rp100" may break after a +
      return '<button type="button" class="' + cls + '" data-c="' + esc(c) + '" data-i="' + i + '" aria-label="' + esc(q.pics && q.pics[c] ? c : (q.trs && q.trs[c]) || c) + '">' + inner +
        (twoTap ? '<span class="ear" aria-hidden="true">' + sprite('listen', 'tk-prop/ship-bell', lib) + '</span>' : '') + '<span class="ck">' + ICON.check + '</span></button>'
    }
    function renderAnswers (q) {
      if (q.letters) return renderArrange(q)
      E.ans.style.display = ''
      var n3 = q.choices.length === 3, short = q.choices.every(function (c) { return String(c).length <= 7 || (q.pics && q.pics[c]) })
      var pic = q.choices.some(function (c) { return q.pics && q.pics[c] })
      E.ans.className = 'tkq-ans' + (n3 ? ' n3 ' + (short ? 'num' : 'txt') : '') + (pic ? ' pic' : '')
      E.ans.innerHTML = q.choices.map(function (c, i) { return optHTML(q, c, i) }).join('')
      Array.prototype.forEach.call(E.ans.querySelectorAll('.tkq-opt'), function (b, k) {
        later(function () { b.classList.add('in') }, 120 + k * 45)
        b.addEventListener('click', function () { choose(b) })
      })
      fitAnswers()
    }
    /* fit the answers (owner tablet photo 2026-09-28: "Alhamdulillah" / "Wa'alaikumussalam" spilled out of a
       4-up row): four long answers go 2x2 instead of 4-up; then each label steps its font down to a 16 px
       floor until it sits inside its button; only then may a long word break (last resort). */
    var fitKey = '', fitRetry = false
    function fitAnswers () {
      var bs = E.ans.querySelectorAll('.tkq-opt')
      if (!bs.length || !E.ans.clientWidth) return
      var texts = []
      Array.prototype.forEach.call(bs, function (b) {
        b.classList.remove('brk')
        Array.prototype.forEach.call(b.children, function (t) { if (t.tagName === 'SPAN' && !/\b(ck|ear)\b/.test(t.className)) { t.style.fontSize = ''; texts.push([b, t]) } })
      })
      E.ans.style.gridTemplateColumns = ''
      if (bs.length === 4 && root.classList.contains('tkq-wide') && !root.classList.contains('tkq-short')) {
        // 4-up only when the widest label fits a quarter of the row at its own size
        var gap = parseFloat(getComputedStyle(E.ans).columnGap) || 10, per = (E.ans.clientWidth - 3 * gap) / 4 - 34, need = 0
        texts.forEach(function (bt) { var t = bt[1], ws = t.style.whiteSpace; t.style.whiteSpace = 'nowrap'; need = Math.max(need, t.scrollWidth); t.style.whiteSpace = ws })
        E.ans.style.gridTemplateColumns = need <= per ? 'repeat(4,minmax(0,1fr))' : 'repeat(2,minmax(0,1fr))'
      }
      texts.forEach(function (bt) {
        var b = bt[0], t = bt[1], fs = parseFloat(getComputedStyle(t).fontSize) || 20, n = 0
        var fl = t.classList.contains('tkq-ar') ? (root.classList.contains('tkq-short') ? 34 : 44) : 16
        while ((t.scrollWidth > t.clientWidth + 1 || b.scrollHeight > b.clientHeight + 1 || b.scrollWidth > b.clientWidth + 1) && fs > fl && n++ < 40) { fs = Math.max(fl, fs - 1); t.style.fontSize = fs + 'px' }
        if (t.scrollWidth > t.clientWidth + 1) b.classList.add('brk')
      })
      // a landscape tablet keeps words >= 18 px: when a label had to shrink below that, use fewer columns
      if (!fitRetry && root.classList.contains('tkq-fill') && root.classList.contains('tkq-wide') && !root.classList.contains('tkq-short') && bs.length >= 3 &&
          texts.some(function (bt) { return !bt[1].classList.contains('tkq-ar') && parseFloat(bt[1].style.fontSize || '99') < 18 })) {
        fitRetry = true
        texts.forEach(function (bt) { bt[1].style.fontSize = '' })
        E.ans.style.setProperty('grid-template-columns', 'repeat(2,minmax(0,1fr))', 'important')
        texts.forEach(function (bt) {
          var b = bt[0], t = bt[1], fs = parseFloat(getComputedStyle(t).fontSize) || 20, n = 0
          var fl2 = t.classList.contains('tkq-ar') ? (root.classList.contains('tkq-short') ? 34 : 44) : 16
          while ((t.scrollWidth > t.clientWidth + 1 || b.scrollHeight > b.clientHeight + 1) && fs > fl2 && n++ < 40) { fs = Math.max(fl2, fs - 1); t.style.fontSize = fs + 'px' }
          b.classList.toggle('brk', t.scrollWidth > t.clientWidth + 1)
        })
        fitRetry = false
      }
      // long Arabic answers (two-word numbers) on a short screen: step every Arabic label down TOGETHER until the
      // card holds all answers (floor 34 px on a phone on its side, 44 px elsewhere)
      var ars = E.ans.querySelectorAll('.tkq-opt .tkq-ar')
      if (ars.length && E.card && E.card.scrollHeight > E.card.clientHeight + 1) {
        var afl = root.classList.contains('tkq-short') ? 34 : 44, af = parseFloat(getComputedStyle(ars[0]).fontSize) || 44
        while (E.card.scrollHeight > E.card.clientHeight + 1 && af > afl) { af = Math.max(afl, af - 2); Array.prototype.forEach.call(ars, function (a) { a.style.fontSize = af + 'px' }) }
      }
      fitCard()
      fitKey = E.ans.clientWidth + 'x' + E.ans.clientHeight
    }
    /* the card never hides an answer below its edge (390x844 / 844x390: the third answer sat under the card's
       bottom): tighten the gaps first, then shrink the scene pictures (--k) down to half size */
    function fitCard () {
      var c = E.card; if (!c || !c.clientHeight) return
      var over = function () { return c.scrollHeight > c.clientHeight + 1 }
      root.classList.remove('tkq-cmp'); c.style.removeProperty('--k')
      if (!over()) {
        // landscape tablet: the picture grows into the free scene height (up to 1.9x) — never past it
        var sc = E.scene
        if (root.classList.contains('tkq-fill') && root.classList.contains('tkq-wide') && !root.classList.contains('tkq-short') && sc && sc.style.display !== 'none' && sc.children.length) {
          var fits = function () { return sc.scrollHeight <= sc.clientHeight + 1 && sc.scrollWidth <= sc.clientWidth + 1 && !over() }
          var k = 1
          for (var g = 1.1; g <= 1.91; g += 0.1) { c.style.setProperty('--k', g.toFixed(2)); if (fits()) k = g; else break }
          if (k === 1) c.style.removeProperty('--k'); else c.style.setProperty('--k', k.toFixed(2))
        }
        return
      }
      root.classList.add('tkq-cmp')
      for (var k = 0.9; over() && k >= 0.45; k -= 0.1) c.style.setProperty('--k', k.toFixed(2))
    }
    var fitRO = null
    try {
      if (W.ResizeObserver) {
        fitRO = new W.ResizeObserver(function () { if (alive && E.ans.clientWidth + 'x' + E.ans.clientHeight !== fitKey) fitAnswers() })
        fitRO.observe(E.ans)
      }
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (alive) fitAnswers() })
    } catch (e) {}
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
      if (S.answered || i >= AR.slots.length || (!noHints && S.rung >= 4 && i === 0)) return
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
      later(function () { tapSlot(!noHints && S.rung >= 3 ? 1 : 0); climb(1) }, 450)
    }

    /* hint ladder */
    function climb (by) {
      var q = qs[S.i]
      var before = S.rung
      S.rung = Math.min(5, S.rung + by)
      // hints off (parent setting): no ladder. A wrong tap only fades that choice; the child retries,
      // and the explanation still follows the right answer. rung keeps counting tries for scoring.
      if (noHints) return
      if (!q.letters) {
        var left = E.ans.querySelectorAll('.tkq-opt:not(.tried):not(.ok)')
        var wrongLeft = Array.prototype.filter.call(left, function (b) { return b.dataset.c !== q.answer })
        if (!wrongLeft.length) S.rung = 5
      }
      for (var r = before + 1; r <= S.rung; r++) applyRung(q, r)
      S.hints += S.rung - before
    }
    // after two wrong tries the answer is shown kindly (it glows; the child taps it to finish)
    function guideNow () { if (S.rung < 5) climb(5 - S.rung) }
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
        // easy mode stays picture-first: no abstract equation, the counted objects carry the step
        if (math) { help(q.step1); if (q.eq && !q.easy) { E.eq.hidden = false; E.eq.textContent = q.eq } }
        else { help(q.hint2 + ' Tinggal dua pilihan.'); dimOneWrong(q) }
        if (q.letters && AR.slots.length === 0) { var t0 = Array.prototype.filter.call(E.ans.querySelectorAll('.tkq-tile:not(.used)'), function (x) { return AR.tiles[+x.dataset.t] === q.answer.split('')[0] })[0]; if (t0) tapTile(t0) }
      }
      if (r === 5) {
        var aw = q.letters ? '' : choiceWords(q, q.answer)
        help(q.letters ? 'Ini jawabannya. Ketuk yang bersinar untuk menyelesaikan.' : 'Jawabannya ' + aw + '. Ketuk yang bersinar, ya!')
        say('t', 'Kita selesaikan bersama, ya!')
        if (!q.letters) narrate('Tidak apa-apa. Jawabannya ' + aw + '. Ketuk yang bersinar, ya!')
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
      os.forEach(function (o, k) { later(function () { var n = o.querySelector('.n'); n.textContent = k + 1; n.classList.add('on'); o.classList.add('counted'); if (k % 2 === 0) sfx('click') }, k * (reduced ? 0 : 260)) })
      S.counted = os.length
    }
    /* tap-to-count: each tap numbers the next object and says the number word */
    function countables () { return Array.prototype.filter.call(E.scene.querySelectorAll('.tkq-o'), function (o) { return !o.classList.contains('leave') && !o.classList.contains('seat') }) }
    function tapCount (o) {
      var n = o.querySelector('.n'); if (!n) return
      var all = countables(); if (all.indexOf(o) < 0) return
      if (!o.classList.contains('counted')) {
        if (S.counted >= all.length) { all.forEach(function (x) { x.classList.remove('counted'); var m = x.querySelector('.n'); m.classList.remove('on'); m.textContent = '' }); S.counted = 0 }
        S.counted++; n.textContent = S.counted; n.classList.add('on'); o.classList.add('counted')
      }
      o.classList.remove('tick'); void o.offsetWidth; o.classList.add('tick')
      sfx('click'); narrate(numWord(+n.textContent), true)
      if (S.counted === all.length && !S.answered && o.classList.contains('counted') && +n.textContent === all.length) say('t', 'Kamu menghitung sampai ' + all.length + '!')
    }
    E.scene.addEventListener('click', function (e) {
      var o = e.target.closest && e.target.closest('.tkq-o')
      if (o && E.scene.classList.contains('tapcount')) tapCount(o)
    })

    /* answering */
    function choose (b) {
      if (S.answered || b.disabled) return
      var q = qs[S.i]
      // read-aloud (pre-readers): first tap says the choice, a second tap on it chooses
      if (twoTap && !b.classList.contains('armed')) {
        Array.prototype.forEach.call(E.ans.querySelectorAll('.tkq-opt.armed'), function (x) { x.classList.remove('armed') })
        b.classList.add('armed'); sfx('click')
        narrate(choiceWords(q, b.dataset.c), true)
        if (!S.armedOnce) { S.armedOnce = true; say('t', 'Ketuk sekali lagi untuk memilih.') }
        return
      }
      b.classList.remove('armed')
      if (b.dataset.c === q.answer) return correct(b)
      sfx('wrong')
      b.classList.remove('no'); void b.offsetWidth
      b.classList.add('no', 'tried'); b.disabled = true   // gentle wiggle, then it stays faded
      S.wrong++
      var enc = ENCOURAGE[S.rung % ENCOURAGE.length]
      say('p', enc)
      if (E.hint) E.hint.classList.add('glow')             // the lantern lights up after a wrong answer
      if (!noHints && S.wrong >= 2) guideNow()
      else { climb(1); narrate(enc) }
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
      if (E.hint) E.hint.classList.remove('glow')
      burst(b || E.ans)
      flyStar(b || E.ans)
      narrate((first ? oneOf(['Hebat!', 'Betul!', 'Pintar!'], Math.random) : 'Bagus!') + ' ' + q.explain)
      later(function () { stat('poin', S.points); stat('soal', S.asked + '/' + qs.length); stat('streak', S.streak); sfx('star') }, 520)
      say('p', first ? oneOf(PRAISE, Math.random) : 'Bagus! Kamu tidak menyerah!')
      help('')
      E.explain.hidden = false; E.explain.textContent = q.explain
      later(function () { E.explain.classList.add('on') }, 30)
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
    // correct: a small ring of star sprites pops out of the answer
    function burst (from) {
      if (reduced) return
      var a = from.getBoundingClientRect(), cx = a.left + a.width / 2 - 13, cy = a.top + a.height / 2 - 13
      for (var k = 0; k < 7; k++) {
        var s = document.createElement('div'); s.className = 'tkq-burst'; s.innerHTML = '<img src="' + lib('tk-ui/star') + '" alt="">'
        document.body.appendChild(s)
        var ang = (k / 7) * Math.PI * 2 - Math.PI / 2, d = 46 + (k % 2) * 16
        if (!s.animate) { s.remove(); continue }
        var an = s.animate([{ transform: 'translate(' + cx + 'px,' + cy + 'px) scale(.3)', opacity: 1 },
          { transform: 'translate(' + (cx + Math.cos(ang) * d) + 'px,' + (cy + Math.sin(ang) * d) + 'px) scale(1) rotate(' + (k * 40) + 'deg)', opacity: 0 }], { duration: 560, easing: EASE, fill: 'forwards' })
        ;(function (el) { an.onfinish = function () { el.remove() }; timers.push(setTimeout(function () { if (el.parentNode) el.remove() }, 900)) })(s)
      }
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
      S.rung = 0; S.wrong = 0; S.counted = 0; S.answered = false; AR = null
      root.classList.toggle('tkq-easy', !!q.easy)
      if (E.hint) E.hint.classList.remove('glow')
      E.count.textContent = chal ? '' : 'Soal ' + (i + 1) + ' dari ' + qs.length
      var du = DOMAIN_UI[q.domain] || DOMAIN_UI.umum
      E.badge.innerHTML = (du.svg || '<img src="' + lib(du.icon) + '" alt="">') + '<span>' + esc(du.label) + '</span>'
      E.prompt.textContent = q.prompt
      E.prompt.dir = 'ltr'
      var t = tierOf(q)
      E.eq.hidden = !(q.eq && q.domain === 'matematika' && t === 2)
      E.eq.textContent = q.eq || ''
      help(!noHints && q.domain === 'matematika' && t >= 3 ? 'Butuh bantuan? Ketuk Petunjuk.' : '')
      Array.prototype.forEach.call(root.querySelectorAll('.tkq-tab'), function (tb) { var on = tb.dataset.d === q.domain; tb.classList.toggle('on', on); if (on) tb.setAttribute('aria-current', 'true'); else tb.removeAttribute('aria-current') })
      E.explain.hidden = true; E.explain.classList.remove('on')
      E.next.disabled = true
      E.next.innerHTML = (chal ? esc(chalNext) + ' ' : i === qs.length - 1 ? 'Selesai ' : 'Lanjut ') + '<span class="tkq-ai" aria-hidden="true"></span>'
      renderScene(q)
      renderAnswers(q)
      E.card.scrollTop = 0
      var tapHint = E.scene.classList.contains('tapcount') && E.scene.style.display !== 'none'
      say('t', tapHint && (q.easy || i === 0) ? 'Ketuk bendanya untuk menghitung!' : i === 0 ? 'Ayo kita pecahkan bersama!' : oneOf(['Soal berikutnya!', 'Kita pasti bisa!', 'Ayo, lanjut berlayar!'], Math.random))
      later(function () { readQuestion(false) }, 380)
    }
    function finish () {
      var delta = 0, by = {}
      Object.keys(ms).forEach(function (d) { by[d] = ms[d] - ms0[d]; delta += by[d] })
      var res = { right: S.right, asked: S.asked, hints: S.hints, masteryDelta: delta, byDomain: by, mastery: ms, points: S.points, results: S.results, wrong: S.wrong }
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
    if (E.hint) E.hint.addEventListener('click', function () { if (S.answered || S.done) return; sfx('click'); E.hint.classList.remove('glow'); climb(1); var h = E.help.textContent; if (h) narrate(h, true) })
    if (E.speak) E.speak.addEventListener('click', function () { sfx('click'); readQuestion(true) })
    wireBack(root, opts, sfx)
    if (!qs.length) { E.prompt.textContent = 'Belum ada soal.'; return { el: root, state: function () { return S }, destroy: function () { unwatch(); root.remove() } } }
    show(0)
    return {
      el: root, questions: qs,
      state: function () { var q = qs[S.i]; return { i: S.i, n: qs.length, rung: S.rung, wrong: S.wrong, answered: !!S.answered, done: !!S.done, qid: q && q.id, answer: q && q.answer, easy: !!(q && q.easy), choices: q && q.choices ? q.choices.length : 0, counted: S.counted, right: S.right, asked: S.asked, hints: S.hints, points: S.points, streak: S.streak } },
      hint: function () { if (!S.answered) climb(1) },
      destroy: function () { alive = false; unwatch(); try { if (fitRO) fitRO.disconnect() } catch (e) {} timers.forEach(clearTimeout); try { if (W.TKHub && W.TKHub.say) W.TKHub.say('') } catch (e) {} if (root.parentNode) root.parentNode.removeChild(root) }
    }
  }

  /* ══ mountSort: drag archetype (drag with snap; tap item then tap bin also works) ══ */
  function mountSort (host, set, opts) {
    opts = opts || {}
    injectCSS()
    if (set && !set.bins) set = sortSet(set.domain, set.world, rng(set.seed || Date.now()), set)
    var lib = libFn(opts), sfx = sfxFn(opts), reduced = isReduced(opts), alive = true, timers = [], narrate = narrator(opts)
    function later (fn, ms) { var t = setTimeout(function () { if (alive) fn() }, reduced ? Math.min(ms, 100) : ms); timers.push(t) }
    // first sort of the game: the first item pulses ("tap me"), then its bin pulses once
    var tut = opts.tutorial != null ? !!opts.tutorial : !SORT_TUTORED
    SORT_TUTORED = true
    var m0 = masteryOf(opts.mastery, set.domain)
    var S = { placed: 0, wrong: 0, firstOK: 0, tried: {}, sel: null, done: false }
    var L = layoutOf(host)
    var root = rootFor(host, opts, L, reduced)
    root.classList.add('tkq-sort')
    if (!L.short) root.classList.add('tkq-sfill')
    var unwatch = watchLayout(host, root, L, false)
    var du = DOMAIN_UI[set.domain] || DOMAIN_UI.umum
    // wording follows the set: families into lifeboats, words, numbers, or things into groups
    var noun = set.capacity ? 'keluarga' : set.items.some(function (x) { return x.rtl }) ? 'kata' : set.items.every(function (x) { return !x.sprite && !x.people }) ? 'angka' : 'barang'
    var target = set.capacity ? 'sekocinya' : 'kelompoknya'
    var startHint = 'Ketuk satu ' + noun + ', lalu ketuk ' + target + '.'
    var binHTML = set.bins.map(function (b, bi) {
      return '<div class="tkq-bin" data-bin="' + esc(b.id) + '" role="group" aria-label="' + esc(b.label) + '"><div class="bh">' +
        (b.sprite ? '<img src="' + lib(b.sprite) + '" alt="">' : b.color ? '<span class="sw" style="background:' + esc(b.color) + '"></span>' : set.capacity ? '<span class="bi">' + ICON.boat + '</span>' : '') +
        '<span' + (b.rtl ? ' class="tkq-ar" dir="rtl" lang="ar"' : '') + '>' + esc(b.label) + '</span></div>' +
        (b.cap ? '<div class="tkq-seats" data-seats="' + esc(b.id) + '" aria-hidden="true">' + seatRow(b, bi) + '</div><div class="cap" data-cap="' + esc(b.id) + '">0 / ' + b.cap + ' orang</div>' : '') + '<div class="tkq-stack"></div></div>'
    }).join('')
    // capacity: one seat per place; a filled seat shows a passenger sprite (hijab girls, boys, men only)
    function seatRow (b, bi) { var h = ''; for (var j = 0; j < b.cap; j++) h += '<span class="tkq-seatp" data-j="' + j + '">' + pfig((bi * 3 + j) % npeople(), 'tkq-p') + '</span>'; return h }
    var itemHTML = set.items.map(function (it) {
      var pic = it.sprite ? '<img src="' + lib(it.sprite) + '" alt="">' : it.people ? '<span class="ppl">' + people(it.people, parseInt(String(it.id).replace(/\D/g, ''), 10) || 0) + '</span>' : '<span class="num">' + esc(it.label) + '</span>'
      var lb = it.sprite || it.people ? '<span class="lb' + (it.rtl ? ' tkq-ar" dir="rtl" lang="ar' : '') + '">' + esc(it.label) + '</span>' : ''
      return '<button type="button" class="tkq-item" data-id="' + esc(it.id) + '" aria-label="' + esc(it.label) + '">' + pic + lb + '</button>'
    }).join('')
    var topic = set.topic || opts.topic
    root.innerHTML = (L.short ? '' : '<div class="tkq-top">' + plateHTML(opts.title || 'Tantangan ' + du.label, topic || '') + '</div>') +
      '<section class="tkq-card"><div class="tkq-head"><button type="button" class="tkq-btn tkq-speak" aria-label="Dengar perintah">' + sprite('listen', 'tk-prop/ship-bell', lib) + '</button><span class="tkq-count" data-k="left"></span>' +
      '<span class="tkq-badge">' + (du.svg || '<img src="' + lib(du.icon) + '" alt="">') + '<span>' + esc(du.label) + '</span></span></div>' +
      '<div class="tkq-prompt">' + esc(set.prompt) + '</div><div class="tkq-help" aria-live="polite"></div>' +
      '<div class="tkq-sortbody"><div class="tkq-bins">' + binHTML + '</div><div class="tkq-tray" aria-label="Barang yang belum dipilah">' + itemHTML + '</div></div>' +
      '<div class="tkq-explain" hidden></div></section>' + footHTML(opts, stepOf(opts, 2), 'Selesai')
    host.appendChild(root)
    var $ = function (s) { return root.querySelector(s) }
    var tray = $('.tkq-tray'), helpEl = $('.tkq-help'), next = $('.tkq-next')
    var byId = {}; set.items.forEach(function (it) { byId[it.id] = it })
    var load = {}; set.bins.forEach(function (b) { load[b.id] = 0 })
    function help (t) { helpEl.textContent = t || ''; helpEl.classList.toggle('on', !!t) }
    function left () { var n = set.items.length - S.placed; $('[data-k="left"]').textContent = n ? n + ' ' + noun + ' lagi' : 'Selesai!' }
    left(); help(tut ? 'Ketuk ' + noun + ' yang bergoyang.' : startHint)
    wireBack(root, opts, sfx)
    var speakBtn = $('.tkq-speak')
    function readPrompt (force) { if (narrate(set.prompt, force) && speakBtn) { speakBtn.classList.remove('talk'); void speakBtn.offsetWidth; speakBtn.classList.add('talk') } }
    speakBtn.addEventListener('click', function () { sfx('click'); readPrompt(true) })
    later(function () { readPrompt(false) }, 380)
    function seats (bid) {
      var row = root.querySelector('[data-seats="' + bid + '"]'); if (!row) return
      Array.prototype.forEach.call(row.children, function (x, j) { x.classList.toggle('full', j < load[bid]) })
    }
    // tutorial: which bin is right for this item (capacity: the first that still fits)
    function goodBin (el) { var it = byId[el.dataset.id]; for (var i = 0; i < set.bins.length; i++) if (fits(it, set.bins[i])) return root.querySelector('.tkq-bin[data-bin="' + set.bins[i].id + '"]'); return null }
    function tutBin (el, keepItem) {
      if (!tut) return
      var bEl = goodBin(el); if (!bEl) return
      Array.prototype.forEach.call(root.querySelectorAll('.tkq-bin.tut'), function (x) { x.classList.remove('tut') })
      void bEl.offsetWidth; bEl.classList.add('tut')
      later(function () { bEl.classList.remove('tut') }, 1900)
      var tItem = tray.querySelector('.tkq-item.tut'); if (tItem && !keepItem) tItem.classList.remove('tut')
    }
    function endTut () { tut = false; Array.prototype.forEach.call(root.querySelectorAll('.tut'), function (x) { x.classList.remove('tut') }) }
    if (tut) {
      var first = tray.querySelector('.tkq-item'); if (first) first.classList.add('tut')
      // nobody tapped yet: show where it goes anyway, once
      later(function () { if (tut && S.placed === 0 && !S.sel && first && first.parentNode === tray) tutBin(first, true) }, 3400)
    }
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
        if (set.capacity) { load[b.id] += it.n; var c = root.querySelector('[data-cap="' + b.id + '"]'); if (c) c.textContent = load[b.id] + ' / ' + b.cap + ' orang'; seats(b.id) }
        S.placed++; if (!S.tried[it.id]) S.firstOK++
        if (tut) endTut()
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
      seats(bEl.dataset.bin)
      el.classList.remove('placed'); tray.appendChild(el); sfx('click'); left(); help('')
    }
    function complete () {
      S.done = true
      var asked = set.items.length, right = S.firstOK
      var mNew = mastery.update(m0, { right: true, firstTry: S.wrong === 0, rung: Math.min(5, S.wrong), streak: 0 })
      var ex = $('.tkq-explain'); ex.hidden = false; ex.textContent = set.capacity ? 'Hebat! Semua keluarga naik sekoci dan tetap bersama.' : 'Hebat! Semua sudah di tempatnya.'
      narrate(ex.textContent)
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
        if (!st.moved) { st.moved = true; el.classList.add('drag'); el.classList.remove('snap', 'sel'); S.sel = null; tutBin(el) }
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
        if (S.sel) { help(tut ? 'Sekarang ketuk ' + target + ' yang bersinar.' : 'Sekarang ketuk ' + target + '.'); narrate(byId[el.dataset.id].label, true); tutBin(el) }
      })
    })
    Array.prototype.forEach.call(root.querySelectorAll('.tkq-bin'), function (b) {
      b.addEventListener('click', function (e) { if (!S.sel || e.target.closest('.tkq-item')) return; var el = S.sel; S.sel = null; drop(el, b) })
    })
    return {
      el: root, set: set,
      state: function () { return { placed: S.placed, n: set.items.length, wrong: S.wrong, done: S.done, tutorial: tut } },
      destroy: function () { alive = false; unwatch(); timers.forEach(clearTimeout); try { if (W.TKHub && W.TKHub.say) W.TKHub.say('') } catch (e) {} if (root.parentNode) root.parentNode.removeChild(root) }
    }
  }

  /* ══ challenge: ONE question card over a running game (PRD v2 §13 "Collision → Knowledge Challenge") ══
     Reuses mount() whole (badge, prompt, scene, choices, hint ladder, explanation, read-aloud), composed
     as a single card with one "Lanjut Berlayar" button. Resolves when the child continues. */
  var RECENT = [], RECENT_MAX = 40
  function remember (id) { if (!id) return; RECENT.push(id); if (RECENT.length > RECENT_MAX) RECENT.shift() }
  function recentMap () { var m = {}; RECENT.forEach(function (id) { m[id] = 1 }); return m }
  // a host-given question ("3 + 2" in the flooding scene, "20 − 14" in the lifeboat) -> engine question
  function fixedQuestion (o, opts) {
    var prompt = String(o.prompt || ''), answer = String(o.answer)
    var choices = (o.choices || []).map(String).filter(function (c, i, a) { return a.indexOf(c) === i })
    if (choices.indexOf(answer) < 0) choices.push(answer)
    var m = /(\d+)\s*([+\-−])\s*(\d+)/.exec(prompt), a = m ? +m[1] : 0, b = m ? +m[3] : 0, plus = m && m[2] === '+'
    var dom = o.domain || (m ? 'matematika' : 'umum'), key = o.item || 'game/crate-wood'
    var scene = o.scene || { mode: 'none', groups: [] }
    if (!o.scene && m && plus && a + b <= 12) scene = { mode: 'add', groups: [{ key: key, n: a, role: 'base' }, { key: key, n: b, role: 'add' }] }
    if (!o.scene && m && !plus && a <= 12 && b < a) scene = { mode: 'sub', groups: [{ key: key, n: a - b, role: 'base' }, { key: key, n: b, role: 'leave' }] }
    if (!scene.groups) scene.groups = []
    var h = 0; (prompt + answer).split('').forEach(function (ch) { h = (h * 31 + ch.charCodeAt(0)) | 0 })
    return { id: o.id || 'fx-' + (h >>> 0).toString(36), domain: dom, level: 1, prompt: prompt, choices: shuffle(choices, rng(h)), answer: answer,
      explain: o.explain || ('Jawabannya ' + answer + '.'), eq: o.eq || (m ? m[1] + ' ' + m[2] + ' ' + m[3] + ' = ?' : null),
      hint1: o.hint1 || (m ? (plus ? 'Gabungkan kedua kelompok, lalu hitung.' : 'Yang pergi tidak dihitung lagi.') : 'Baca soalnya pelan-pelan, ya.'),
      hint2: o.hint2 || (m ? (plus ? 'Mulai dari ' + a + ', hitung maju ' + b + ' lagi.' : 'Mulai dari ' + a + ', hitung mundur ' + b + '.') : 'Pikirkan lagi, pilih yang paling cocok.'),
      step1: o.step1 || (m ? (plus ? a + ' lalu ' + (a + 1) + ', …' : a + ' lalu ' + (a - 1) + ', …') : 'Coret pilihan yang pasti salah dulu.'),
      scene: scene, visual: o.visual || [], world: opts.world || null,
      // a bank item passed as a fixed question keeps its script / pictures (Arabic + transliteration, picture answers)
      rtl: o.rtl, trs: o.trs, pics: o.pics, ar: o.ar, tr: o.tr, swatch: o.swatch, seq: o.seq }
  }
  function challengeQuestion (opts) {
    if (opts.question && opts.question.prompt) return fixedQuestion(opts.question, opts)
    var r = rng(opts.seed != null ? opts.seed : (Date.now() & 0x7fffffff)), ex = recentMap()
    var d = opts.domain || 'campur'
    if (d === 'campur') d = chooseDomain(r, { islam: opts.islam, world: opts.world, exclude: ex, domains: opts.domains })
    if (d === 'islam' && opts.islam === false) d = 'umum'
    var lv = opts.level || mastery.levelFor(masteryOf(opts.mastery, d), opts.grade)
    var popts = { islam: opts.islam, world: opts.world, exclude: ex, mixed: true, hard: !!opts.hard, easy: !opts.hard && isEasy(opts.grade, masteryOf(opts.mastery, d), opts.easy) }
    var q = null
    // a quick card never serves "arrange the letters" or listen-only Arabic (needs a voice the device may lack)
    for (var t = 0; t < 12 && (!q || q.letters || q.listen); t++) q = pick(d, lv, r, popts)
    if (!q || q.letters || q.listen) q = make('matematika', Math.min(lv, 2), r, { world: opts.world, easy: popts.easy })
    return q
  }
  function challenge (host, opts) {
    opts = opts || {}
    injectCSS()
    var q = challengeQuestion(opts)
    var reduced = isReduced(opts), ctrl = null, ov = null, settled = false, resolveFn = null
    var p = new Promise(function (resolve) { resolveFn = resolve })
    function settle (res) {
      if (settled) return
      settled = true
      var o = ov
      if (o) {
        o.classList.remove('on')
        setTimeout(function () { try { if (ctrl) ctrl.destroy() } catch (e) {} if (o.parentNode) o.parentNode.removeChild(o) }, reduced ? 0 : 240)
      }
      resolveFn(res)
    }
    p.close = function () { settle({ correct: false, tries: 0, hints: 0, closed: true }) }
    if (!host || !q) { settle({ correct: true, tries: 1, hints: 0, skipped: true }); return p }
    remember(q.id)
    ov = document.createElement('div')
    ov.className = 'tkq-chal' + (reduced ? ' rm' : '')
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', opts.title || 'Tantangan Pengetahuan')
    var box = document.createElement('div'); box.className = 'tkq-chal-box'
    ov.appendChild(box); host.appendChild(ov)
    // a pointer that started the collision must not fall through to the game under the card
    ;['pointerdown', 'pointerup', 'touchstart', 'keydown'].forEach(function (ev) { ov.addEventListener(ev, function (e) { e.stopPropagation() }) })
    var mo = {}; for (var k in opts) if (k !== 'question' && k !== 'onDone') mo[k] = opts[k]
    mo.challenge = true
    if (opts.question && opts.easy == null) mo.easy = false   // the host's own choices stay as given
    mo.onDone = function (res) {
      var tries = (res.wrong || 0) + 1
      settle({ correct: res.right === 1, tries: tries, hints: res.hints || 0, points: res.points || 0, qid: q.id, domain: q.domain,
        mastery: res.mastery, masteryDelta: res.masteryDelta })
    }
    // a question renderer that throws must never leave the full-screen overlay behind (soft-lock)
    try { ctrl = mount(box, [q], mo) } catch (err) {
      try { if (ov && ov.parentNode) ov.parentNode.removeChild(ov) } catch (e) {} ov = null
      settle({ correct: true, tries: 1, hints: 0, points: 0, qid: q && q.id, domain: q && q.domain, error: true })
      return p
    }
    p.ctrl = ctrl
    // double rAF so the fade/rise transition runs from the initial state
    var raf = W.requestAnimationFrame || function (f) { return setTimeout(f, 16) }
    raf(function () { raf(function () { if (ov) ov.classList.add('on') }) })
    return p
  }

  W.TKQuiz = {
    make: make, pick: pick, build: build, validate: validate, mastery: mastery,
    mount: mount, sortSet: sortSet, mountSort: mountSort, rng: rng, clockLabel: clockLabel,
    easyify: easyify, isEasy: isEasy, numWord: numWord, challenge: challenge, makeHard: makeHard, MIX: MIX, chooseDomain: chooseDomain, challengeQuestion: challengeQuestion,
    VERSION: '1.1.0'
  }
})()
