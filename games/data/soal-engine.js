/* =============================================================================
 * soal-engine.js — window.SoalEngine. THE shared question source for every Dunia Emosi game.
 * Standard: documentation and standarization/SOAL_ENGINE_STANDARD.md
 *
 * Owner mandate (quoted in games/quiz-engine.js): "quiz/question harusnya ada engine tersendiri yang
 * shared among all the game. jangan per-game membuat engine/algo sendiri." + 2026-09-29: "expand the
 * question engine so it can adapt per game" and "soal sering berulang" (per-avatar no-repeat).
 *
 * It does not compete with SuperQuiz: SuperQuiz (question-super-engine.js) keeps its own API for the
 * games that call it, and plugs in here as general generators. games/quiz-engine.js stays the RENDERER.
 *
 *   SoalEngine.registerPack(id, {items, meta})   items: array OR function returning the array (read
 *        lazily, so a bank that loads later or grows is picked up). meta: {theme, general, topic, grade}
 *   SoalEngine.registerGenerator(topic, fn(grade, rng, theme, o), meta)   meta: {id, grades:[..],
 *        general, core, weight, validate(q)}. o: {level, kind, easy, about, nouns, vocab, extraKinds}
 *   SoalEngine.defineGame(gameId, cfg) / SoalEngine.profile(gameId[, cfg])   per-game profile (below)
 *   SoalEngine.pick(opts) -> [question]          opts: {game, context, avatar, grade, weights, topic,
 *        theme, count, exclude, seed|rng, level, easy, about, aboutCount, maxPer, without, pictures, kind, history}
 *   SoalEngine.one(opts)  -> question | null
 *   SoalEngine.generate(topic, opts) -> one generated question (no history)
 *   SoalEngine.reduceChoices(q, 3) / validate(q) / validateItem(item) / items(filter) / history(avatar)
 *
 * Question (normalized): {id, topic, grade 1–4, level?, prompt, choices[], answer, pic?, choicePics?,
 *   script?, translit?, theme[], source, domain (= topic, for G30's UI) + every extra field the source
 *   carried (explain, hint1, hint2, scene, calc, visual, rtl, ...)}. Bank items are never mutated.
 * ==========================================================================*/
(function () {
  'use strict'
  var W = (typeof window !== 'undefined' ? window : globalThis)
  if (W.SoalEngine && W.SoalEngine.VERSION) return

  /* ── rng (mulberry32; identical to TKQuiz.rng so seeded tests replay) ─────── */
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
  function copy (o) { var c = {}; for (var k in o) c[k] = o[k]; return c }
  function hash (s) { var h = 0; s = String(s); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) }
  function words (s) { s = String(s == null ? '' : s).trim(); return s ? s.split(/\s+/).length : 0 }
  function arr (v) { return v == null ? [] : Array.isArray(v) ? v : [v] }

  /* ── child safety: an item whose text matches is never served (the gate also scans every source) ── */
  var UNSAFE = /(^|[^a-z])(bunuh|membunuh|dibunuh|pembunuh|tembak|menembak|ditembak|pistol|senapan|senjata|granat|narkoba|mabuk|alkohol|minuman keras|judi|berjudi|bodoh|goblok|tolol|idiot|seks|telanjang|porno)([^a-z]|$)/i
  function unsafe (q) {
    var t = q.prompt + ' ' + q.choices.join(' ') + ' ' + (q.explain || '') + ' ' + (q.hint1 || '') + ' ' + (q.hint2 || '')
    return UNSAFE.test(t)
  }

  /* ── emoji (ES5-safe: surrogate ranges, no /u) ─────────────────────────────── */
  var EMOJI = /(?:[0-9#*]️?⃣|[\uD83C-\uD83E][\uDC00-\uDFFF]|[☀-➿]|[⬀-⯿]|[■-◿]|[←-⇿]|[⌚-⏿]|©|®|™|ℹ|〰|〽|㊗|㊙)️?(?:‍(?:[\uD83C-\uD83E][\uDC00-\uDFFF]|[☀-➿])️?)*/g
  function hasEmoji (s) { EMOJI.lastIndex = 0; var h = EMOJI.test(String(s)); EMOJI.lastIndex = 0; return h }
  function emojis (s) { return String(s).match(EMOJI) || [] }
  function stripEmoji (s) { return String(s).replace(EMOJI, '').replace(/\s+/g, ' ').replace(/\s+([?.!,])/g, '$1').trim() }
  // emoji -> sprite key: the game's own resolver first, then the shared EmojiMap
  function spriteOf (ch, P) {
    var k = null
    if (P && typeof P.spriteResolver === 'function') { try { k = P.spriteResolver(ch) } catch (e) { k = null } }
    if (!k && W.EmojiMap && W.EmojiMap.get) k = W.EmojiMap.get(ch)
    return k || null
  }
  // pictures mode: 'sprite' (emoji -> sprite keys, item dropped when one cannot be mapped),
  // 'none' (emoji stripped, dropped when a choice would be empty), 'emoji' (as authored)
  function applyPictures (q, mode, P) {
    if (mode !== 'sprite' && mode !== 'none') return q
    var any = hasEmoji(q.prompt) || hasEmoji(q.answer) || q.choices.some(hasEmoji)
    if (!any) return q
    var o = copy(q), pics = copy(q.choicePics || {}), ok = true, i
    if (mode === 'sprite') {
      var pe = emojis(q.prompt)
      for (i = 0; i < pe.length; i++) { var pk = spriteOf(pe[i], P); if (!pk) return null; if (!o.pic) o.pic = pk }
    }
    o.prompt = stripEmoji(q.prompt)
    if (!o.prompt) return null
    var map = {}
    o.choices = q.choices.map(function (c) {
      if (!hasEmoji(c)) { map[c] = c; return c }
      var e = emojis(c), key = null
      if (mode === 'sprite') { key = spriteOf(e[0], P); if (!key || e.length > 1) { ok = false; return c } }
      var label = stripEmoji(c)
      if (!label) { if (mode === 'none') { ok = false; return c } label = key; o.picOnly = true }
      if (key) pics[label] = key
      map[c] = label; return label
    })
    if (!ok) return null
    o.answer = map[q.answer] != null ? map[q.answer] : stripEmoji(q.answer)
    var seen = {}
    for (i = 0; i < o.choices.length; i++) { if (seen[o.choices[i]]) return null; seen[o.choices[i]] = 1 }
    if (!seen[o.answer]) return null
    if (Object.keys(pics).length) o.choicePics = pics
    return o
  }

  /* ── normalize any source shape into the one schema ──────────────────────────
     accepts {prompt|q|text, choices|options|opts, answer|ans|a | correct(index), wrong[], domain|topic, ...} */
  var SKIP = { q: 1, ans: 1, a: 1, options: 1, opts: 1, correct: 1, wrong: 1, text: 1 }
  function normalize (raw, meta) {
    if (!raw) return null
    meta = meta || {}
    var o = {}, k
    for (k in raw) if (!SKIP[k]) o[k] = raw[k]
    o.prompt = String(raw.prompt != null ? raw.prompt : raw.q != null ? raw.q : raw.text != null ? raw.text : '')
    var ch = raw.choices || raw.options || raw.opts || null, ans = raw.answer != null ? raw.answer : raw.ans != null ? raw.ans : raw.a
    if (ans == null && ch && typeof raw.correct === 'number') ans = ch[raw.correct]
    if (!ch && raw.wrong) ch = [ans].concat(raw.wrong)
    o.choices = (ch || []).map(String)
    o.answer = ans == null ? '' : String(ans)
    o.topic = String(raw.topic || raw.domain || meta.topic || 'umum')
    if (!o.domain) o.domain = o.topic
    var g = raw.grade != null ? raw.grade : meta.grade
    o.grade = Math.max(1, Math.min(4, parseInt(g, 10) || 2))
    if (raw.level != null) o.level = +raw.level
    if (o.pic == null && raw.visual && raw.visual.length) o.pic = raw.visual[0]
    if (o.choicePics == null && raw.pics) o.choicePics = raw.pics
    if (o.script == null && raw.ar) o.script = raw.ar
    if (o.translit == null && raw.tr) o.translit = raw.tr
    o.theme = arr(raw.theme).concat(arr(meta.theme)).concat(raw.world ? [raw.world] : [])
    o.source = o.source || meta.id || 'x'
    if (o.id == null) o.id = o.source + '-' + hash(o.topic + '|' + o.prompt + '|' + o.answer)
    else o.id = String(o.id)
    if (!o.explain && o.answer) o.explain = 'Jawabannya ' + o.answer + '.'
    return o
  }

  /* ── registries ─────────────────────────────────────────────────────────── */
  var PACKS = {}, PACK_ORDER = [], GENS = {}, AUTO = []
  function registerPack (id, spec) {
    spec = spec || {}
    var meta = copy(spec.meta || {}); meta.id = id
    if (!PACKS[id]) PACK_ORDER.push(id)
    PACKS[id] = { id: id, src: spec.items, meta: meta, cache: null, len: -1, raw: null }
    return PACKS[id]
  }
  function packItems (p) {
    var raw = typeof p.src === 'function' ? p.src() : p.src
    raw = raw || []
    if (p.cache && p.raw === raw && p.len === raw.length) return p.cache
    var out = [], by = {}
    for (var i = 0; i < raw.length; i++) {
      var n = normalize(p.meta.map ? p.meta.map(raw[i], i) : raw[i], p.meta)
      if (!n || !n.prompt || n.choices.length < 2 || n.choices.indexOf(n.answer) < 0) continue
      n.unsafe = unsafe(n)
      n.invalid = validateItem(n).length > 0   // a source defect is quarantined, never served
      n.nw = words(n.prompt)
      out.push(n)
      ;(by[n.topic] = by[n.topic] || []).push(n)
    }
    p.cache = out; p.by = by; p.raw = raw; p.len = raw.length
    return out
  }
  function registerGenerator (topic, fn, meta) {
    meta = copy(meta || {}); meta.topic = topic
    meta.id = meta.id || topic + '-' + ((GENS[topic] || []).length + 1)
    meta.grades = meta.grades || [1, 2, 3, 4]
    if (meta.weight == null) meta.weight = 1
    var list = GENS[topic] = (GENS[topic] || []).filter(function (g) { return g.id !== meta.id })
    meta.fn = fn
    list.push(meta)
    return meta
  }
  function findGen (id) { for (var t in GENS) for (var i = 0; i < GENS[t].length; i++) if (GENS[t][i].id === id) return GENS[t][i]; return null }
  function runAuto () { for (var i = 0; i < AUTO.length; i++) { try { AUTO[i]() } catch (e) {} } }

  /* ── per-game profiles (owner 2026-09-29: "adapt per game") ────────────────── */
  var DEFAULT_NOUNS = [['game/crate-wood', 'kotak'], ['food/apple', 'apel'], ['game/star', 'bintang'], ['toys/ball', 'bola']]
  var PROFILES = {
    'default': {
      topics: null,                           // null = every topic that has a source
      weights: { matematika: 40, umum: 15, logika: 15, bahasa: 10, sains: 10, bentuk: 5, waktu: 5, emosi: 5 },
      themes: [], themeShare: 0.6,            // share of picks restricted to the game's theme packs
      subThemeShare: 0.8,                     // share restricted to the call's own theme (a world / level)
      general: true,                          // may draw general packs / generators
      packs: null,                            // explicit pack allow-list (null = by themes + general)
      grade: { mudah: 2, sulit: 4 },          // Tingkat Soal -> max grade
      sulitShare: 0.7,                        // Sulit: share of curated picks restricted to grade >= 3
      choices: { easy: 3, normal: 4 },
      pictures: 'emoji',                      // 'sprite' | 'emoji' | 'none'
      spriteResolver: null,                   // fn(emojiChar) -> sprite key (game art first)
      nouns: { _: DEFAULT_NOUNS },            // generated-math objects per theme: [[spriteKey, noun]]
      vocab: null,                            // generated-math story words: {place, deck, load, unload, carrier, box, crate, seat, rope, cheer}
      mathKinds: {},                          // extra generator kinds per theme, e.g. {queenmary: [['clock', 60]]}
      maxWords: { 1: 14, 2: 16, 3: 18, 4: 18 },
      scope: 'game',                          // no-repeat history: 'game' (per avatar per game) | 'shared'
      avatar: 'auto',                         // 'auto' = the active Dunia avatar (save-engine)
      stopWords: [],
      without: [],                            // item flags never served (e.g. 'letters')
      contexts: {
        challenge: { maxWords: { 1: 12, 2: 14, 3: 16, 4: 16 }, without: ['letters', 'listen'] },
        gate: { maxWords: { 1: 10, 2: 12, 3: 14, 4: 14 }, without: ['letters', 'listen'] },
        chest: { without: ['letters'] },
        quiz: {}
      }
    }
  }
  function defineGame (id, cfg) {
    cfg = copy(cfg || {})
    if (id !== 'default' && !cfg['extends']) cfg['extends'] = 'default'
    PROFILES[id] = cfg
    return resolveProfile(id)
  }
  function resolveProfile (id, seen) {
    var cfg = PROFILES[id] || PROFILES['default']
    seen = seen || {}
    if (seen[id]) return copy(PROFILES['default'])
    seen[id] = 1
    var base = cfg['extends'] && PROFILES[cfg['extends']] ? resolveProfile(cfg['extends'], seen) : {}
    var out = copy(base), k
    for (k in cfg) if (k !== 'contexts' && k !== 'extends') out[k] = cfg[k]
    var ctx = copy(base.contexts || {})
    for (k in cfg.contexts || {}) ctx[k] = mergeCtx(ctx[k], cfg.contexts[k])
    out.contexts = ctx; out.id = PROFILES[id] ? id : 'default'
    return out
  }
  function mergeCtx (a, b) { var o = copy(a || {}); for (var k in b || {}) o[k] = b[k]; return o }
  function profile (id, cfg) { return cfg ? defineGame(id, cfg) : resolveProfile(id || 'default') }

  /* ── per-avatar history: localStorage 'soal-seen-<avatar>', capped, try/catch ─── */
  // a generated template (kind) at most KIND_MAX times in any KIND_WIN + 1 consecutive generated questions
  // (checked against the previous KIND_WIN), so one template ("Ada berapa peti?") never dominates a session
  var SEEN_CAP = 1500, SEEN_TRIM = 1200, SIG_CAP = 50, KIND_WIN = 5, KIND_MAX = 2, HIST = {}
  function avatarId (a) {
    // 'auto' = the active Dunia avatar; no avatar chosen yet -> 'anon' (still persisted, so a reload or a
    // world change never resets the history). null = memory only (this page load).
    if (a === 'auto') { try { a = W._activeAvatarSlug ? W._activeAvatarSlug() : null } catch (e) { a = null } a = a || (storage() ? 'anon' : null) }
    return a ? String(a) : ''
  }
  function storage () { try { return W.localStorage || null } catch (e) { return null } }
  function hist (avatar) {
    var k = avatarId(avatar)
    if (HIST[k]) return HIST[k]
    var h = { key: k ? 'soal-seen-' + k : null, n: 0, seen: {}, sig: {} }
    if (h.key) {
      try {
        var ls = storage(), raw = ls && ls.getItem(h.key), d = raw ? JSON.parse(raw) : null
        if (d && d.v === 1) { h.n = +d.n || 0; h.seen = d.seen || {}; h.sig = d.sig || {}; h.kinds = d.kinds || {} }
      } catch (e) {}
    }
    HIST[k] = h
    return h
  }
  function histSave (h) {
    if (!h.key) return
    try { var ls = storage(); if (ls) ls.setItem(h.key, JSON.stringify({ v: 1, n: h.n, seen: h.seen, sig: h.sig, kinds: h.kinds || {} })) } catch (e) {}
  }
  function markSeen (h, scope, q) {
    h.n++
    if (q.gen) {
      var s = h.sig[scope] = (h.sig[scope] || []).concat([sigOf(q)])
      if (s.length > SIG_CAP) h.sig[scope] = s.slice(s.length - SIG_CAP)
      h.kinds = h.kinds || {}
      var kk = h.kinds[scope] = (h.kinds[scope] || []).concat([q.gen + ':' + (q.kind || q.shape || '')])
      if (kk.length > KIND_WIN) h.kinds[scope] = kk.slice(kk.length - KIND_WIN)
      return
    }
    var m = h.seen[scope] = h.seen[scope] || {}
    h.size = h.size || {}
    if (h.size[scope] == null) h.size[scope] = Object.keys(m).length
    if (!m[q.id]) h.size[scope]++
    m[q.id] = h.n
    if (h.size[scope] > SEEN_CAP) {
      var ks = Object.keys(m)
      ks.sort(function (a, b) { return m[a] - m[b] })
      for (var i = 0; i < ks.length - SEEN_TRIM; i++) delete m[ks[i]]
      h.size[scope] = Object.keys(m).length
    }
  }
  // a generated question's signature: prompt + its numbers (answer, equation, calc)
  function sigOf (q) { return q.topic + '|' + q.prompt + '|' + (q.eq || '') + '|' + q.answer + '|' + (q.calc ? JSON.stringify(q.calc) : '') }

  /* ── "about": the level's goal line; items that share a content word come first ── */
  var STOP = /^(yang|untuk|dengan|dari|pada|temukan|kenali|kepingan|baca|pilih|cocokkan|atur|ayo|bantu|semua|lagi|benar|menjawab|jawab|soal|teka|teki|tiap|agar|bersama)$/
  function topicWords (text, extraStop) {
    var ex = {}; arr(extraStop).forEach(function (w) { ex[w] = 1 })
    return String(text || '').toLowerCase().replace(/[^a-z\s-]/g, ' ').split(/[\s-]+/).filter(function (w) { return w.length >= 4 && !STOP.test(w) && !ex[w] })
      .map(function (w) { return w.replace(/^(meng|mem|men|me|ber|di|ter|pe)/, '').replace(/(kan|nya|an|i)$/, '').slice(0, 6) }).filter(function (w) { return w.length >= 4 })
  }
  function topicScore (o, ws) {
    if (!ws.length) return 0
    var t = (o.prompt + ' ' + (o.explain || '') + ' ' + (o.hint1 || '') + ' ' + (o.hint2 || '') + ' ' + (o.visual || []).join(' ')).toLowerCase()
    return ws.filter(function (w) { return t.indexOf(w) >= 0 }).length
  }

  /* ── context: profile <- context override <- call options ─────────────────── */
  function gradeOf (g, P) {
    if (g == null || g === '') g = 'mudah'
    if (typeof g === 'number' || /^\d$/.test(String(g))) return Math.max(1, Math.min(4, +g))
    var s = String(g).toLowerCase()
    if (P.grade && P.grade[s] != null) return P.grade[s]
    return /sulit|hard|kelas ?[34]/.test(s) ? 4 : 2
  }
  function ctxFor (opts) {
    opts = opts || {}
    runAuto()
    var P = resolveProfile(opts.game || 'default')
    var C = mergeCtx(P, (opts.context && P.contexts[opts.context]) || {})
    var X = {}, k
    for (k in C) X[k] = C[k]
    for (k in opts) if (opts[k] !== undefined) X[k] = opts[k]
    X.P = P
    X.gradeN = gradeOf(opts.grade, P)
    X.r = typeof opts.rng === 'function' ? opts.rng : rng(opts.seed != null ? opts.seed : (Date.now() & 0x7fffffff))
    X.withoutAll = arr(C.without).concat(arr(opts.without))
    var ex = opts.exclude || {}
    X.ex = Array.isArray(ex) ? ex.reduce(function (m, id) { m[id] = 1; return m }, {}) : ex
    X.themeList = arr(opts.theme)
    X.scope = P.scope === 'shared' ? '*' : (P.id || '*')
    // history: false = a stateless pick (tests, a host replaying a seed): nothing read, nothing stored
    X.h = opts.history === false ? { key: null, n: 0, seen: {}, sig: {} } : hist(opts.avatar !== undefined ? opts.avatar : P.avatar)
    X.sub = arr(P.themes)
    return X
  }
  function maxWordsFor (X, grade) { var m = X.maxWords; return m == null ? 99 : typeof m === 'number' ? m : (m[grade] || m[4] || 99) }
  function levelFor (X, topic) { var l = X.level; return l == null ? null : typeof l === 'number' ? l : (l[topic] != null ? l[topic] : null) }
  function easyFor (X, topic) { var e = X.easy; return e === true || (e && typeof e === 'object' && e[topic] === true) }
  function packAllowed (p, X) {
    if (X.packs) return X.packs.indexOf(p.id) >= 0
    if (p.meta.theme && X.sub.indexOf(p.meta.theme) >= 0) return true
    return X.general !== false && p.meta.general !== false && !p.meta.theme
  }
  function genAllowed (g, X, grade) {
    if (g.grades.indexOf(grade) < 0) return false
    if (X.generators) return X.generators.indexOf(g.id) >= 0
    return g.core || (X.general !== false && g.general)
  }
  // every curated item a context may serve for a topic (topic filter, grade, flags, safety, words, pictures)
  function eligible (X, topic) {
    var out = [], G = X.gradeN
    for (var i = 0; i < PACK_ORDER.length; i++) {
      var p = PACKS[PACK_ORDER[i]]
      if (!packAllowed(p, X)) continue
      var its = packItems(p)
      if (topic) its = p.by[topic] || []
      for (var j = 0; j < its.length; j++) {
        var o = its[j], wo = false
        if (o.unsafe || o.invalid || o.grade > G || X.ex[o.id]) continue
        for (var f = 0; f < X.withoutAll.length; f++) if (o[X.withoutAll[f]]) wo = true
        if (wo || o.nw > maxWordsFor(X, o.grade)) continue
        out.push(o)
      }
    }
    return out
  }
  function topicsAvailable (X) {
    var have = {}, t, i
    for (i = 0; i < PACK_ORDER.length; i++) { var p = PACKS[PACK_ORDER[i]]; if (packAllowed(p, X)) { packItems(p); for (t in p.by) have[t] = 1 } }
    for (t in GENS) for (i = 0; i < GENS[t].length; i++) if (genAllowed(GENS[t][i], X, X.gradeN)) have[t] = 1
    if (X.topics) { var f = {}; X.topics.forEach(function (x) { if (have[x]) f[x] = 1 }); have = f }
    if (X.withoutAll.indexOf('islam') >= 0) delete have.islam
    return have
  }

  /* ── one curated item: stages (sub-theme, game theme, level, near level, all), unseen first,
        least recently seen once every stage is exhausted ─────────────────────────────── */
  function pickItem (X, list, topic, used) {
    var r = X.r, seen = X.h.seen[X.scope] || {}
    list = list.filter(function (o) { return !used[o.id] })
    if (!list.length) return null
    var base = list
    if (X.gradeN >= 3) { var hi = list.filter(function (o) { return o.grade >= 3 }); if (hi.length && r() < X.sulitShare) base = hi }
    var lv = levelFor(X, topic), stages = []
    if (X.themeList.length && r() < X.subThemeShare) {
      var tp = base.filter(function (o) { return X.themeList.some(function (t) { return o.theme.indexOf(t) >= 0 }) && (lv == null || o.level == null || o.level <= lv + 1) })
      if (tp.length) stages.push(tp)
    }
    if (X.sub.length && !X.packs && r() < X.themeShare) {
      var gp = base.filter(function (o) { return X.sub.some(function (t) { return o.theme.indexOf(t) >= 0 }) })
      if (gp.length) stages.push(gp)
    }
    if (lv != null) {
      stages.push(base.filter(function (o) { return o.level === lv }))
      stages.push(base.filter(function (o) { return o.level != null && Math.abs(o.level - lv) <= 1 }))
    }
    stages.push(base, list)
    for (var s = 0; s < stages.length; s++) {
      var un = stages[s].filter(function (o) { return !seen[o.id] })
      if (un.length) return oneOf(un, r)
    }
    // exhausted: least recently seen (ties: the stage order above does not matter any more)
    var best = null
    list.forEach(function (o) { if (!best || (seen[o.id] || 0) < (seen[best.id] || 0)) best = o })
    return best
  }
  function nounsFor (X) {
    var N = X.nouns || {}, t = X.themeList
    for (var i = 0; i < t.length; i++) if (N[t[i]]) return N[t[i]]
    return N._ || DEFAULT_NOUNS
  }
  function runGen (g, X, grade, o) {
    var q = g.fn(grade, X.r, X.themeList[0] || null, o)
    if (!q) return null
    q = normalize(q, { id: g.id, topic: g.topic, grade: grade })
    q.gen = g.id
    return q
  }
  function pickGen (X, topic, used, slot) {
    var G = X.gradeN, gs = (GENS[topic] || []).filter(function (g) { return genAllowed(g, X, G) })
    if (!gs.length) return null
    var recent = {}; (X.h.sig[X.scope] || []).forEach(function (s) { recent[s] = 1 })
    var kc = {}; ((X.h.kinds || {})[X.scope] || []).forEach(function (k) { kc[k] = (kc[k] || 0) + 1 })
    var o = { level: levelFor(X, topic), easy: easyFor(X, topic), nouns: nounsFor(X), vocab: X.vocab || null, kind: X.kind,
      about: slot < X.aboutN ? X.about : null, extraKinds: X.mathKinds && X.themeList.length ? X.mathKinds[X.themeList[0]] : null }
    var q = null, fallback = null
    for (var t = 0; t < 30; t++) {
      var g = wpick(gs.map(function (x) { return [x, x.weight] }), X.r)
      var c = runGen(g, X, G, o)
      if (!c || unsafe(c) || validate(c).length || validateItem(c).length) continue
      c = applyPictures(c, X.pictures, X.P)
      if (!c) continue
      if (!fallback && !used[c.id]) fallback = c
      if (used[c.id] || recent[sigOf(c)] || words(c.prompt) > maxWordsFor(X, c.grade)) continue
      if (t < 20 && !o.kind && (kc[c.gen + ':' + (c.kind || c.shape || '')] || 0) >= KIND_MAX) continue
      q = c; break
    }
    return q || fallback
  }
  function present (X, o) {
    var q = applyPictures(o, X.pictures, X.P)
    if (!q) return null
    q = copy(q); delete q.unsafe; delete q.invalid; delete q.nw
    if (X.pictures === 'none') { delete q.pic; delete q.choicePics }
    if (!o.gen) q.choices = shuffle(q.choices, X.r)
    var n = easyFor(X, q.topic) ? (X.choices && X.choices.easy) : (X.choices && X.choices.normal)
    if (n && n < q.choices.length && !q.hard && !(q.grade >= 3) && !q.letters) q = reduceChoices(q, n)
    return q
  }
  function pickTopic (X, have, count) {
    var w = X.weights || {}, pairs = []
    if (X.topic) return have[X.topic] ? X.topic : null
    for (var t in have) {
      var wt = w[t] != null ? w[t] : (X.weights ? 0 : 10)
      if (X.maxPer && X.maxPer[t] != null && (count[t] || 0) >= X.maxPer[t]) wt = 0
      if (wt > 0) pairs.push([t, wt])
    }
    return pairs.length ? wpick(pairs, X.r) : null
  }
  function pickTopicItem (X, topic, used, slot) {
    var list = eligible(X, topic), gs = (GENS[topic] || []).filter(function (g) { return genAllowed(g, X, X.gradeN) })
    var seen = X.h.seen[X.scope] || {}
    var unseen = list.some(function (o) { return !used[o.id] && !seen[o.id] })
    var gw = gs.reduce(function (s, g) { return s + g.weight }, 0)
    var useGen = gs.length && (!list.length || !unseen || X.r() < gw / (gw + 1))
    if (gs.length && !list.length) useGen = true
    return useGen ? (pickGen(X, topic, used, slot) || (list.length ? pickItem(X, list, topic, used) : null)) : pickItem(X, list, topic, used)
  }

  function pick (opts) {
    var X = ctxFor(opts), n = Math.max(1, (opts && opts.count) || 1), out = [], used = {}, count = {}
    var have = topicsAvailable(X)
    X.aboutN = X.about ? (X.aboutCount != null ? X.aboutCount : Math.ceil(n / 2)) : 0
    var aboutWords = X.about ? topicWords(X.about, X.stopWords) : []
    var topical = []
    if (aboutWords.length && X.aboutN) {
      var ts = X.topic ? [X.topic] : Object.keys(have).filter(function (t) { return !X.weights || X.weights[t] > 0 })
      var seen = X.h.seen[X.scope] || {}
      ts.forEach(function (t) {
        var lv = levelFor(X, t)
        eligible(X, t).forEach(function (o) { if ((lv == null || o.level == null || o.level <= lv + 1) && topicScore(o, aboutWords) > 0) topical.push(o) })
      })
      // unseen matches first (best match first), then the least recently seen matches
      topical = shuffle(topical, X.r).sort(function (a, b) {
        return ((seen[a.id] || 0) - (seen[b.id] || 0)) || (topicScore(b, aboutWords) - topicScore(a, aboutWords)) ||
          (X.themeList.some(function (t) { return b.theme.indexOf(t) >= 0 }) - X.themeList.some(function (t) { return a.theme.indexOf(t) >= 0 }))
      })
    }
    for (var i = 0; i < n; i++) {
      var q = null
      if (i < X.aboutN) while (!q && topical.length) { var tq = topical.shift(); if (!used[tq.id] && (!X.maxPer || X.maxPer[tq.topic] == null || (count[tq.topic] || 0) < X.maxPer[tq.topic])) q = tq }
      var tried = {}
      while (!q) {
        var t = pickTopic(X, have, count)
        if (!t || tried[t]) {
          // the weighted topic had nothing left: any other topic that still has something
          var rest = Object.keys(have).filter(function (x) { return !tried[x] && (!X.topic || x === X.topic) })
          if (!rest.length) break
          t = rest[0]
        }
        tried[t] = 1
        q = pickTopicItem(X, t, used, i)
      }
      if (!q) break
      var pq = present(X, q)
      used[q.id] = 1
      if (!pq) { i--; if (Object.keys(used).length > n * 40) break; continue }
      count[pq.topic] = (count[pq.topic] || 0) + 1
      markSeen(X.h, X.scope, q)
      out.push(pq)
    }
    histSave(X.h)
    return out
  }
  function one (opts) { var o = copy(opts || {}); o.count = 1; return pick(o)[0] || null }
  // one generated question for a topic (no history, no weights): TKQuiz.make / makeHard delegate here
  function generate (topic, opts) {
    opts = opts || {}
    runAuto()
    var X = ctxFor(opts), G = X.gradeN
    var gs = (GENS[topic] || []).filter(function (g) { return opts.generator ? g.id === opts.generator : genAllowed(g, X, G) })
    if (!gs.length) return null
    var g = gs.length === 1 ? gs[0] : wpick(gs.map(function (x) { return [x, x.weight] }), X.r)
    var o = { level: opts.level || null, easy: !!opts.easy, kind: opts.kind || null, about: opts.about || null, nouns: nounsFor(X), vocab: X.vocab || null,
      extraKinds: X.mathKinds && X.themeList.length ? X.mathKinds[X.themeList[0]] : null }
    return runGen(g, X, G, o)
  }

  /* ── easy mode: 3 choices (a NEW object; answer + the two nearest distractors) ── */
  function reduceChoices (q, n) {
    n = n || 3
    if (!q || q.letters || !q.choices || q.choices.length <= n) return q
    var o = copy(q)
    var h = 0; String(q.id).split('').forEach(function (ch) { h = (h * 31 + ch.charCodeAt(0)) | 0 })
    var wrong = q.choices.filter(function (c) { return c !== q.answer })
    if (/^\d+$/.test(q.answer) && !(q.calc && q.calc.op === 'max') && wrong.every(function (c) { return /^\d+$/.test(c) })) {
      // numbers: the nearest values inside 0..10 (the easy range), one dropped (by the id) so the
      // answer is not always the middle value; order shuffled deterministically
      var a = +q.answer, top = Math.max(10, a), seen = {}, pool = []
      seen[a] = 1
      wrong.map(Number).concat([a - 1, a + 1, a - 2, a + 2, a - 3, a + 3]).forEach(function (v) { if (v >= 0 && v <= top && !seen[v]) { seen[v] = 1; pool.push(v) } })
      pool.sort(function (x, y) { return Math.abs(x - a) - Math.abs(y - a) })
      pool = pool.slice(0, n); if (pool.length === n) pool.splice(Math.abs(h) % n, 1)
      o.choices = shuffle([a].concat(pool.slice(0, n - 1)), rng(h)).map(String)
    } else {
      var keep = wrong.slice(0, n - 1)
      o.choices = q.choices.filter(function (c) { return c === q.answer || keep.indexOf(c) >= 0 })
    }
    if (q.calc && q.calc.op === 'max') o.calc = { op: 'max', list: o.choices.map(Number) }
    o.easy = true
    return o
  }

  /* ── validation ───────────────────────────────────────────────────────────
     validate(q): a served question (choices, answer once, generator truth via its own validate) */
  function validate (q) {
    var p = []
    if (!q || !q.choices) return ['missing']
    if (q.domain === 'matematika' || q.letters) { if (q.choices.length !== (q.easy ? 3 : 4)) p.push('choices != ' + (q.easy ? 3 : 4)) }
    else if (q.choices.length < 3 || q.choices.length > 4) p.push('choices not 3–4')
    var seen = {}; q.choices.forEach(function (c) { if (seen[c]) p.push('duplicate choice ' + c); seen[c] = 1 })
    var hits = q.choices.filter(function (c) { return c === q.answer }).length
    if (hits !== 1) p.push('answer present ' + hits + 'x')
    var g = q.gen ? findGen(q.gen) : null
    if (!g && q.domain === 'matematika' && q.calc) g = findGen(q.hard ? 'mat-sulit' : 'mat-a')
    if (g && g.validate) p = p.concat(g.validate(q))
    return p
  }
  var TOPIC_RE = /^[a-z][a-z-]*$/
  // validateItem(item): the pack schema (the gate runs it on every registered item)
  function validateItem (o) {
    var p = []
    if (!o || !o.id) p.push('id')
    if (!TOPIC_RE.test(o.topic || '')) p.push('topic')
    if (!(o.grade >= 1 && o.grade <= 4)) p.push('grade')
    if (o.level != null && !(o.level >= 1 && o.level <= 4)) p.push('level')
    if (!o.prompt || typeof o.prompt !== 'string') p.push('prompt')
    if (!Array.isArray(o.choices) || o.choices.length < 2) p.push('choices')
    else {
      var s = {}; o.choices.forEach(function (c) { if (typeof c !== 'string' || !c.length) p.push('empty choice'); if (s[c]) p.push('dup choice ' + c); s[c] = 1 })
      if (!s[o.answer]) p.push('answer not in choices')
    }
    if (o.pic != null && typeof o.pic !== 'string') p.push('pic')
    if (o.choicePics != null && typeof o.choicePics !== 'object') p.push('choicePics')
    if (!Array.isArray(o.theme)) p.push('theme')
    return p
  }
  // every normalized item (optionally one pack), for gates and tooling
  function items (packId) {
    runAuto()
    var out = []
    PACK_ORDER.forEach(function (id) { if (!packId || id === packId) out = out.concat(packItems(PACKS[id])) })
    return out
  }

  /* ── adapters: existing pools become packs / generators (lazy: registered once the global exists) ── */
  var SQ_TOPIC = { math: 'matematika', bahasa: 'bahasa', sains: 'sains', emosi: 'emosi', umum: 'umum', logika: 'logika', bentuk: 'bentuk', waktu: 'waktu' }
  var SQ_DIFF = { 1: 'easy', 2: 'medium', 3: 'hard', 4: 'expert' }
  var done = {}
  AUTO.push(function () {
    if (done.sq || !W.SuperQuiz || !W.SuperQuiz.generate) return
    done.sq = 1
    W.SuperQuiz.subjects().forEach(function (s) {
      registerGenerator(SQ_TOPIC[s] || s, function (grade, r) {
        var o = W.SuperQuiz.generate({ subject: s, difficulty: SQ_DIFF[grade] || 'medium', _rng: r })
        return { id: 'sq-' + s + '-' + hash(o.q + '|' + o.ans), topic: SQ_TOPIC[s] || s, grade: grade, prompt: o.q, choices: o.choices.map(String), answer: String(o.ans), shape: o.shape }
      // SuperQuiz math mixes × ÷ into 'medium' and serves 2–3-choice comparisons: the core generators own
      // 'matematika', so 'sq-math' only serves when a game lists it (opts.generators: ['sq-math'])
      }, { id: 'sq-' + s, general: s !== 'math', weight: 1 })
    })
  })
  var KQ_TOPIC = { math: 'matematika', count: 'matematika', number: 'matematika', comparison: 'matematika', shape: 'bentuk', color: 'bentuk', animal: 'sains', letter: 'bahasa', safety: 'umum' }
  AUTO.push(function () {
    if (done.kq || !Array.isArray(W.KidsQuestions)) return
    done.kq = 1
    registerPack('kids', { items: function () { return W.KidsQuestions }, meta: { general: true, map: function (o, i) {
      var c = copy(o); c.id = 'kids-' + i; c.topic = KQ_TOPIC[(o.tags || [])[0]] || 'umum'; c.grade = +o.age >= 7 ? 2 : 1; return c
    } } })
  })
  function g23Topic (q) {
    if (/^\s*\d+\s*[+\-×÷x:]\s*\d+\s*=\s*\?/.test(q) || /\d/.test(q) && /dibagi|kali|tambah|kurang|berapa/i.test(q)) return 'matematika'
    if (/huruf|lawan kata|suku kata|kata|[A-Z]{2,}-/.test(q)) return 'bahasa'
    if (/suara|hewan|bernapas|tumbuh|ikan|tanaman/i.test(q)) return 'sains'
    return 'umum'
  }
  AUTO.push(function () {
    if (done.g23 || !W.G23_QUESTIONS_EASY) return
    done.g23 = 1
    ;[['EASY', 1], ['MEDIUM', 2], ['HARD', 3], ['EXPERT', 4]].forEach(function (d) {
      registerPack('g23-' + d[0].toLowerCase(), { items: function () { return W['G23_QUESTIONS_' + d[0]] }, meta: { general: true, grade: d[1], map: function (o, i) {
        var c = copy(o); c.id = 'g23' + d[0].charAt(0).toLowerCase() + '-' + i; c.topic = g23Topic(o.q); return c
      } } })
    })
  })

  W.SoalEngine = {
    registerPack: registerPack, registerGenerator: registerGenerator, defineGame: defineGame, profile: profile,
    pick: pick, one: one, generate: generate, reduceChoices: reduceChoices, validate: validate, validateItem: validateItem,
    items: items, normalize: normalize, topicWords: topicWords, topicScore: topicScore,
    history: function (avatar) { return hist(avatar) },
    resetHistory: function (avatar) { var k = avatarId(avatar), h = HIST[k]; delete HIST[k]; try { var ls = storage(); if (ls && k) ls.removeItem('soal-seen-' + k) } catch (e) {} return !!h },
    packs: function () { runAuto(); return PACK_ORDER.slice() },
    generators: function (topic) { runAuto(); var o = []; for (var t in GENS) if (!topic || t === topic) GENS[t].forEach(function (g) { o.push(g.id) }); return o },
    rng: rng, shuffle: shuffle, ri: ri, oneOf: oneOf, wpick: wpick,
    hasEmoji: hasEmoji, isUnsafe: function (q) { return unsafe(normalize(q)) }, UNSAFE: UNSAFE,
    VERSION: '1.0.0'
  }
})()
