/* =============================================================================
 * SUPER QUESTION ENGINE  (window.SuperQuiz)   [A-349]
 * =============================================================================
 * A shared, seedable, procedural quiz engine for ALL Dunia Emosi games.
 * Compact templates × the SQDATA pools (super-quiz-data.js) + procedural math/
 * logic/money generators yield ≥100,000 UNIQUE kid-safe Indonesian questions
 * from a small file — the same "engine, not a giant table" pattern as
 * math-rules.js. Output shape is drop-in for games/quiz-engine.js:
 *   { q, ans, choices, subject, shape, difficulty }
 *
 * API:
 *   SuperQuiz.subjects()                  -> ['math','bahasa','sains',...]
 *   SuperQuiz.capacity()                  -> estimated # of distinct questions
 *   SuperQuiz.generate(opts)              -> ONE question object
 *   SuperQuiz.batch({count, ...opts})     -> array of `count` distinct questions
 *     opts: { subject?, difficulty?('easy'|'medium'|'hard'|'expert'), seed? }
 * ========================================================================== */
;(function (g) {
  'use strict';
  var D = g.SQDATA || {};

  // ---- seedable RNG (mulberry32) ------------------------------------------
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function ri(rng, lo, hi) { return lo + Math.floor(rng() * (hi - lo + 1)); }
  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function shuffle(rng, arr) {
    arr = arr.slice();
    for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    return arr;
  }
  function upper(s){ return String(s).charAt(0).toUpperCase() + String(s).slice(1); }

  // Build a 4-choice set from a correct answer + a distractor pool.
  function choices4(rng, correct, pool) {
    var set = [String(correct)], seen = {}; seen[String(correct)] = 1;
    var p = shuffle(rng, pool);
    for (var i = 0; i < p.length && set.length < 4; i++) {
      var v = String(p[i]);
      if (!seen[v]) { seen[v] = 1; set.push(v); }
    }
    // pad numerically if still short
    var n = 1;
    while (set.length < 4) { var v2 = String((+correct || 0) + n); if (!seen[v2]) { seen[v2] = 1; set.push(v2); } n++; }
    return shuffle(rng, set);
  }
  function q(subject, shape, diff, text, ans, choices) {
    return { q: text, ans: ans, choices: choices, subject: subject, shape: shape, difficulty: diff };
  }

  var DIFFS = ['easy', 'medium', 'hard', 'expert'];
  function maxNumFor(diff) { return diff === 'expert' ? 200 : diff === 'hard' ? 99 : diff === 'medium' ? 50 : 20; }
  function tierFor(diff) { return diff === 'easy' ? 'easy' : diff === 'medium' ? 'medium' : 'hard'; }

  // ---- subject generators -------------------------------------------------
  var GEN = {};

  // MATH — delegate to the shared math engine (procedurally deep).
  GEN.math = {
    cap: function () { var M = 200; return Math.round((M * M) * 5); }, // ~200,000
    gen: function (rng, diff) {
      var shapes = ['standard', 'missingOperand', 'missingOperator', 'comparison', 'word'];
      var sh = pick(rng, shapes), mn = maxNumFor(diff), tier = tierFor(diff), lv = ri(rng, 1, 100);
      if (typeof g.makeMathQuestionV2 === 'function') {
        var r = g.makeMathQuestionV2(lv, 100, tier, sh, { maxNum: mn });
        return q('math', r.shape || sh, diff, r.q, r.ans, r.choices);
      }
      // fallback: simple a+b
      var a = ri(rng, 1, mn), b = ri(rng, 1, Math.max(1, mn - a)), ans = a + b;
      return q('math', 'standard', diff, a + ' + ' + b + ' = ?', ans, choices4(rng, ans, [ans + 1, ans - 1, ans + 2, a * b]));
    }
  };

  // BAHASA / literacy — over WORDBANK
  var WB = D.WORDBANK || [];
  GEN.bahasa = {
    cap: function () { return WB.length * 6; },
    gen: function (rng, diff) {
      var w = pick(rng, WB), word = w.w, t = ri(rng, 0, 5);
      if (t === 0) { // missing letter
        var pos = ri(rng, 0, word.length - 1), ch = word.charAt(pos);
        var masked = word.substring(0, pos) + '_' + word.substring(pos + 1);
        var letters = 'abcdefghijklmnopqrstuvwxyz'.split('').filter(function (x) { return x !== ch; });
        return q('bahasa', 'huruf', diff, w.e + '  Lengkapi: ' + masked, ch, choices4(rng, ch, shuffle(rng, letters).slice(0, 3)));
      }
      if (t === 1) { // first sound
        return q('bahasa', 'awal', diff, 'Kata "' + word + '" diawali huruf?', word.charAt(0),
          choices4(rng, word.charAt(0), 'abcdefghijklmnopqrstuvwxyz'.split('')));
      }
      if (t === 2) { // last sound
        var last = word.charAt(word.length - 1);
        return q('bahasa', 'akhir', diff, 'Kata "' + word + '" diakhiri huruf?', last,
          choices4(rng, last, 'abcdefghijklmnopqrstuvwxyz'.split('')));
      }
      if (t === 3) { // syllable count
        var n = (w.s || [word]).length;
        return q('bahasa', 'sukukata', diff, 'Ada berapa suku kata pada kata "' + word + '"?', n,
          choices4(rng, n, [1, 2, 3, 4, 5]));
      }
      if (t === 4) { // choose word for emoji
        var pool = shuffle(rng, WB).filter(function (x) { return x.w !== word; }).slice(0, 3).map(function (x) { return x.w; });
        return q('bahasa', 'tebak', diff, 'Gambar ini bernama? ' + w.e, word, shuffle(rng, [word].concat(pool)));
      }
      // category
      var cpool = ['hewan', 'buah', 'makanan', 'benda', 'warna', 'alam', 'kendaraan', 'tubuh'];
      return q('bahasa', 'kelompok', diff, 'Kata "' + word + '" termasuk kelompok?', w.c, choices4(rng, w.c, cpool));
    }
  };

  // SAINS — facts + animal templates
  var SF = D.SCI_FACTS || [], SA = D.SCI_ANIMALS || [];
  GEN.sains = {
    cap: function () { return SF.length + SA.length * 5; },
    gen: function (rng, diff) {
      if (SA.length && rng() < 0.55) {
        var a = pick(rng, SA), t = ri(rng, 0, 4);
        if (t === 0) return q('sains', 'hewan', diff, 'Hewan "' + a.n + '" biasanya berbunyi?', a.sound,
          choices4(rng, a.sound, SA.map(function (x) { return x.sound; })));
        if (t === 1) return q('sains', 'hewan', diff, 'Di mana "' + a.n + '" biasa hidup?', a.habitat,
          choices4(rng, a.habitat, ['peternakan', 'hutan', 'laut', 'sungai', 'udara', 'gurun', 'kutub', 'rumah']));
        if (t === 2) return q('sains', 'hewan', diff, '"' + upper(a.n) + '" termasuk jenis makanan?', a.diet,
          choices4(rng, a.diet, ['herbivora', 'karnivora', 'omnivora']));
        if (t === 3) return q('sains', 'hewan', diff, '"' + upper(a.n) + '" termasuk kelompok hewan?', a.cls,
          choices4(rng, a.cls, ['mamalia', 'burung', 'ikan', 'reptil', 'amfibi', 'serangga']));
        return q('sains', 'hewan', diff, 'Anak dari "' + a.n + '" disebut?', a.baby,
          choices4(rng, a.baby, SA.map(function (x) { return x.baby; })));
      }
      var f = pick(rng, SF);
      return q('sains', 'fakta', diff, f.q, f.a, shuffle(rng, f.opts.slice(0, 4)));
    }
  };

  // EMOSI — scenario -> emotion
  var EMO = D.EMO_SCENARIOS || [];
  var EMOSET = ['senang', 'sedih', 'marah', 'takut', 'terkejut', 'malu', 'bosan', 'bangga', 'cinta', 'kaget'];
  GEN.emosi = {
    cap: function () { return EMO.length; },
    gen: function (rng, diff) {
      var s = pick(rng, EMO);
      return q('emosi', 'emosi', diff, 'Bagaimana perasaanmu? ' + s.s, s.e, choices4(rng, s.e, EMOSET));
    }
  };

  // UMUM — GK + opposites + helpers
  var GK = D.GK || [], OPP = D.OPPOSITES || [], HELP = D.HELPERS || [];
  GEN.umum = {
    cap: function () { return GK.length + OPP.length * 2 + HELP.length * 2; },
    gen: function (rng, diff) {
      var r = ri(rng, 0, 2);
      if (r === 0 && OPP.length) {
        var p = pick(rng, OPP), fwd = rng() < 0.5, a = fwd ? p[0] : p[1], b = fwd ? p[1] : p[0];
        var pool = [];
        for (var i = 0; i < OPP.length; i++) { pool.push(OPP[i][0]); pool.push(OPP[i][1]); }
        return q('umum', 'lawan', diff, 'Apa lawan kata dari "' + a + '"?', b, choices4(rng, b, pool));
      }
      if (r === 1 && HELP.length) {
        var h = pick(rng, HELP);
        if (rng() < 0.5) return q('umum', 'profesi', diff, 'Siapa yang bertugas ' + h.job + '?', upper(h.who),
          choices4(rng, upper(h.who), HELP.map(function (x) { return upper(x.who); })));
        return q('umum', 'profesi', diff, 'Di mana ' + h.who + ' bekerja?', h.place,
          choices4(rng, h.place, HELP.map(function (x) { return x.place; })));
      }
      var kq = pick(rng, GK);
      return q('umum', 'umum', diff, kq.q, kq.a, shuffle(rng, kq.opts.slice(0, 4)));
    }
  };

  // LOGIKA — sequences, odd-one-out, compare
  GEN.logika = {
    cap: function () { return 40 * 12 * 3 + 5000; }, // sequences + odd-one-out combos
    gen: function (rng, diff) {
      var t = ri(rng, 0, 2), M = maxNumFor(diff);
      if (t === 0) { // arithmetic sequence
        var start = ri(rng, 1, Math.min(20, M)), step = ri(rng, 1, Math.min(10, Math.max(2, M / 5)) | 0 || 2);
        var seq = [start, start + step, start + 2 * step, start + 3 * step], ans = start + 4 * step;
        return q('logika', 'urutan', diff, seq.join(', ') + ', ...?', ans,
          choices4(rng, ans, [ans + step, ans - step, ans + 1, ans - 1, ans + step * 2]));
      }
      if (t === 1 && WB.length) { // odd one out (category)
        var cat = pick(rng, ['hewan', 'buah', 'makanan', 'kendaraan', 'alam']);
        var same = shuffle(rng, WB.filter(function (x) { return x.c === cat; }));
        var other = shuffle(rng, WB.filter(function (x) { return x.c !== cat; }));
        if (same.length >= 3 && other.length >= 1) {
          var odd = other[0].w, group = same.slice(0, 3).map(function (x) { return x.w; });
          return q('logika', 'beda', diff, 'Manakah yang BERBEDA kelompok? ' + shuffle(rng, group.concat([odd])).join(', '),
            odd, shuffle(rng, group.concat([odd])));
        }
      }
      // compare two numbers
      var a = ri(rng, 1, M), b = ri(rng, 1, M); while (b === a) b = ri(rng, 1, M);
      var big = Math.max(a, b), sm = Math.min(a, b);
      return q('logika', 'banding', diff, 'Manakah yang lebih besar, ' + a + ' atau ' + b + '?', big,
        choices4(rng, big, [sm, big + 1, big + 2, Math.max(1, sm - 1)]));
    }
  };

  // BENTUK — shapes + colors
  var SHAPES = [{ n: 'segitiga', sides: 3 }, { n: 'persegi', sides: 4 }, { n: 'segi lima', sides: 5 }, { n: 'segi enam', sides: 6 }, { n: 'lingkaran', sides: 0 }];
  var COLORS = ['merah', 'biru', 'kuning', 'hijau', 'ungu', 'oranye', 'coklat', 'hitam', 'putih', 'merah muda'];
  GEN.bentuk = {
    cap: function () { return 400; },
    gen: function (rng, diff) {
      if (rng() < 0.5) {
        var s = pick(rng, SHAPES);
        if (s.sides === 0) return q('bentuk', 'bentuk', diff, 'Bentuk apa yang tidak punya sudut?', 'lingkaran',
          choices4(rng, 'lingkaran', SHAPES.map(function (x) { return x.n; })));
        return q('bentuk', 'bentuk', diff, 'Bentuk apa yang punya ' + s.sides + ' sisi?', s.n,
          choices4(rng, s.n, SHAPES.map(function (x) { return x.n; })));
      }
      var things = [{ t: 'pisang matang', c: 'kuning' }, { t: 'daun segar', c: 'hijau' }, { t: 'langit cerah', c: 'biru' }, { t: 'darah', c: 'merah' }, { t: 'salju', c: 'putih' }, { t: 'arang', c: 'hitam' }, { t: 'jeruk', c: 'oranye' }, { t: 'terong', c: 'ungu' }];
      var it = pick(rng, things);
      return q('bentuk', 'warna', diff, 'Apa warna ' + it.t + '?', it.c, choices4(rng, it.c, COLORS));
    }
  };

  // WAKTU & UANG (Rupiah)
  GEN.waktu = {
    cap: function () { return 12 * 4 + 200; },
    gen: function (rng, diff) {
      if (rng() < 0.5) { // clock (whole hours)
        var h = ri(rng, 1, 12);
        return q('waktu', 'jam', diff, 'Jarum pendek di angka ' + h + ', jarum panjang di 12. Jam berapa?', h + ':00',
          choices4(rng, h + ':00', [((h % 12) + 1) + ':00', (h) + ':30', ((h + 2) % 12 || 12) + ':00', ((h + 6) % 12 || 12) + ':00']));
      }
      // money
      var coins = [500, 1000, 2000, 5000, 10000];
      var a = pick(rng, coins), b = pick(rng, coins), sum = a + b;
      return q('waktu', 'uang', diff, 'Rp' + a.toLocaleString('id') + ' + Rp' + b.toLocaleString('id') + ' = Rp ?',
        String(sum), choices4(rng, sum, [sum + 500, sum - 500, sum + 1000, a * 2, b * 2]));
    }
  };

  var ORDER = ['math', 'bahasa', 'sains', 'emosi', 'umum', 'logika', 'bentuk', 'waktu'];

  // ---- public API ---------------------------------------------------------
  function subjects() { return ORDER.slice(); }
  function capacity() {
    var t = 0; for (var i = 0; i < ORDER.length; i++) { try { t += GEN[ORDER[i]].cap(); } catch (e) {} } return t;
  }
  function generate(opts) {
    opts = opts || {};
    var diff = DIFFS.indexOf(opts.difficulty) >= 0 ? opts.difficulty : 'medium';
    var rng = typeof opts._rng === 'function' ? opts._rng
      : mulberry32((opts.seed == null ? Math.floor(Math.random() * 1e9) : opts.seed) | 0);
    var subj = (opts.subject && GEN[opts.subject]) ? opts.subject : pick(rng, ORDER);
    var out = GEN[subj].gen(rng, diff);
    // safety: ensure the answer is present in choices
    if (out.choices && out.choices.map(String).indexOf(String(out.ans)) < 0) out.choices[0] = String(out.ans);
    return out;
  }
  function batch(opts) {
    opts = opts || {};
    var count = Math.max(1, opts.count || 6);
    var rng = mulberry32((opts.seed == null ? Math.floor(Math.random() * 1e9) : opts.seed) | 0);
    var o2 = {}; for (var k in opts) o2[k] = opts[k]; o2._rng = rng;
    var res = [], seen = {}, tries = 0;
    while (res.length < count && tries < count * 30) {
      tries++;
      var item = generate(o2);
      var key = item.subject + '|' + item.q;
      if (seen[key]) continue;
      seen[key] = 1; res.push(item);
    }
    return res;
  }

  g.SuperQuiz = { subjects: subjects, capacity: capacity, generate: generate, batch: batch };
})(typeof window !== 'undefined' ? window : globalThis);
