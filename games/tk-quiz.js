/* ============================================================================
 * tk-quiz.js — window.TKQuiz. Timmy & Kapal Legendaris (G30) learning engine.
 * PRD: documentation and standarization/TIMMY_LEGENDARY_SHIPS_PRD_v2.md §5 (learning),
 * §6 (motion), §7 (contract). Layout follows the owner mockup ui-08 "Knowledge Challenge":
 * parchment question card ("Soal 1 dari 5" + domain badge), sprite scene, 4 light-blue
 * answers (a row in landscape, 2x2 in portrait), stats column (Soal / Poin / Beruntun),
 * penguin captain + Timmy speech bubbles, progress dots, "Lanjut".
 *
 * QUESTIONS: every question comes from window.SoalEngine, profile 'g30' (games/data/soal-pack-kapal.js):
 * weights, grade filter (Mudah / Sulit), per-avatar no-repeat history across levels and worlds, sprites.
 *   TKQuiz.make(domain, level, rng, opts?)  -> generated Matematika question (SoalEngine 'mat-a', stateless)
 *   TKQuiz.makeHard(rng, opts?)              -> generated Sulit question (SoalEngine 'mat-sulit', stateless)
 *   TKQuiz.pick(domain, level, rng, opts)    -> one question (opts.islam, opts.world, opts.exclude, opts.hard), stateless
 *   TKQuiz.build(spec)                       -> [questions] for spec {domain, world, count, level, grade, hard, islam, mastery,
 *                                               topic, easy, seed, mix, avatar?, history?} (avatar history on)
 *   TKQuiz.validate(q)                       -> SoalEngine.validate (used by the gate)
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
 *          onBack (fn; Kembali is hidden without it), step (0..3 stepper index; quiz 0, sort 2),
 *          subFor (fn(domain) -> plate subtitle, re-set for every question: it always names the CURRENT topic) }
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

  /* ── questions come from window.SoalEngine (games/data/soal-engine.js, profile 'g30' in
     games/data/soal-pack-kapal.js). No generator, picker, weight table or grade filter lives here:
     documentation and standarization/SOAL_ENGINE_STANDARD.md. Load order: soal-engine.js,
     soal-gen-matematika.js, soal-pack-kapal.js, then this file. ─────────────────────────────── */
  var SE = W.SoalEngine
  if (!SE) throw new Error('tk-quiz.js needs games/data/soal-engine.js (+ soal-gen-matematika.js, soal-pack-kapal.js) loaded first')
  var GAME = 'g30'
  var rng = SE.rng, ri = SE.ri, oneOf = SE.oneOf
  function shuffle (a, r) { return SE.shuffle(a, r) }
  function esc (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';' }) }
  var DOMAINS = ['matematika', 'umum', 'arab', 'logika', 'islam']
  var MIX = SE.profile(GAME).weights
  function clockLabel (h, m) { return SE.math.clockLabel(h, m) }
  function validate (q) { return SE.validate(q) }
  function easyify (q) { return SE.reduceChoices(q, 3) }

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
  function masteryOf (ms, d) { return typeof ms === 'number' ? ms : (ms && ms[d]) || 0 }

  /* the SoalEngine options every G30 request shares: Tingkat Soal, level + easy mode per topic (from
     mastery), the world as the preferred theme, the Islamic toggle, the avatar history (profile: 'auto') */
  function seOpts (spec, extra) {
    var lv = {}, ez = {}
    DOMAINS.forEach(function (d) {
      lv[d] = spec.level || mastery.levelFor(masteryOf(spec.mastery, d), spec.grade)
      ez[d] = !spec.hard && isEasy(spec.grade, masteryOf(spec.mastery, d), spec.easy)
    })
    var o = { game: GAME, grade: spec.hard ? 'sulit' : 'mudah', level: lv, easy: ez, theme: spec.world || undefined,
      without: spec.islam === false ? ['islam'] : [], exclude: spec.exclude, history: spec.history, avatar: spec.avatar,
      rng: spec.rng || rng(spec.seed != null ? spec.seed : (Date.now() & 0x7fffffff)) }
    for (var k in extra || {}) o[k] = extra[k]
    return o
  }
  function topicOf (d, spec) { return d === 'islam' && spec.islam === false ? 'umum' : d }

  /* TKQuiz.make / makeHard: one generated Matematika question (fase A / Sulit), stateless */
  function make (domain, level, r, opts) {
    opts = opts || {}
    return SE.generate('matematika', { game: GAME, grade: 2, level: Math.max(1, Math.min(4, level | 0 || 1)), rng: r || Math.random,
      theme: opts.world || undefined, kind: opts.kind, easy: !!opts.easy, about: opts.about })
  }
  function makeHard (r, opts) {
    opts = opts || {}
    return SE.generate('matematika', { game: GAME, grade: 'sulit', rng: r || Math.random, theme: opts.world || undefined, kind: opts.kind })
  }
  /* TKQuiz.pick: one question of a domain, stateless (no avatar history; tests + tooling) */
  function pick (domain, level, r, opts) {
    opts = opts || {}
    if (domain === 'islam' && opts.islam === false) return null
    var spec = { level: Math.max(1, Math.min(4, level | 0 || 1)), hard: !!opts.hard, easy: false, islam: opts.islam, world: opts.world, exclude: opts.exclude, rng: r || Math.random, history: false }
    var mixed = domain === 'campur'
    return SE.one(seOpts(spec, mixed ? { context: 'quiz', easy: false } : { topic: domain, easy: false }))
  }

  /* a set of questions. spec: {domain ('campur' | a topic), world, count, level, grade, hard, islam, mastery,
     topic (the level goal: questions ABOUT it first), easy, seed, mix} */
  function build (spec) {
    spec = spec || {}
    if (spec.mix) return buildMix(spec)
    var mixed = !spec.domain || spec.domain === 'campur'
    var o = seOpts(spec, { count: spec.count || 5, about: spec.topic || null })
    if (mixed) o.context = 'quiz'
    else o.topic = topicOf(spec.domain, spec)
    return SE.pick(o)
  }

  /* a world quiz step (spec.mix, set by the game). A topic-locked step serves only its topic (see below).
     A mixed step: about half Matematika; an 'umum' step fills the rest with Umum about its goal, a campur step by
     the profile weights with at most one Arabic question per 4. Order: other / maths alternating. */
  function buildMix (spec) {
    // owner playtest 2026-09-30: a TOPIC-LOCKED step serves only its topic ("Latihan Matematika" served a science
    // item, the Logika "Lorong Waktu" 2 of 3 maths). Locked = a practice tab (world 'latihan'), spec.topicOnly, or a
    // single-topic domain other than the 'umum' default. 'umum' / 'campur' steps are mixed quizzes: about half maths.
    var d0 = spec.domain && spec.domain !== 'campur' ? spec.domain : null
    if (spec.topicOnly !== false && d0 && (spec.topicOnly === true || spec.world === 'latihan' || d0 !== 'umum')) {
      var one = {}; for (var kk in spec) one[kk] = spec[kk]; one.mix = false; return build(one)
    }
    var r = spec.rng || rng(spec.seed != null ? spec.seed : (Date.now() & 0x7fffffff)), n = spec.count || 4
    var s2 = {}; for (var k in spec) s2[k] = spec[k]; s2.rng = r
    var exclude = {}
    if (Array.isArray(spec.exclude)) spec.exclude.forEach(function (id) { exclude[id] = 1 })
    else for (k in spec.exclude || {}) exclude[k] = spec.exclude[k]
    s2.exclude = exclude
    var lead = d0 ? topicOf(d0, spec) : null   // an 'umum' step leads with Umum about its goal
    var nMath = Math.floor(n / 2) + (n % 2 && r() < 0.5 ? 1 : 0), arabCap = Math.max(1, Math.floor(n / 4))
    var noMath = {}; for (k in MIX) if (k !== 'matematika') noMath[k] = MIX[k]
    // Pick in display order, so the shared engine's rolling quota matches what the child sees.
    // Picking two pools first and interleaving later could bring Arabic items too close across rounds.
    var out = [], otherLeft = n - nMath, mathLeft = nMath, arabic = 0
    while (otherLeft || mathLeft) {
      var other = otherLeft > 0 && (out.length % 2 === 0 || !mathLeft)
      var config = { context: 'quiz', mixed: true, about: spec.hard && !other ? null : (spec.topic || null), aboutCount: out.length < 2 ? 1 : 0 }
      if (other) {
        if (lead) config.topic = lead
        else { config.weights = {}; for (k in noMath) config.weights[k] = k === 'arab' && arabic >= arabCap ? 0 : noMath[k] }
        otherLeft--
      } else { config.topic = 'matematika'; mathLeft-- }
      var q = SE.one(seOpts(s2, config))
      if (!q) q = SE.one(seOpts(s2, { context: 'quiz', mixed: true, topic: 'matematika' }))
      if (q) { out.push(q); exclude[q.id] = 1; if (q.domain === 'arab') arabic++ }
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
    // a text-only challenge (no scene) is as tall as its content, centred with its button right under it (playtest
    // 2026-09-30: a fixed-height card left ~150 px empty above and below the question)
    '.tkq.tkq-chmode.tkq-fill.tkq-wide.tkq-noscene{grid-template-rows:auto auto auto;align-content:center}.tkq.tkq-chmode.tkq-fill.tkq-wide.tkq-noscene .tkq-card{height:auto;align-self:start}',
    '.tkq.tkq-chmode.tkq-fill.tkq-wide .tkq-chars{display:contents}',
    '.tkq.tkq-chmode.tkq-fill.tkq-wide .tkq-chars .tkq-cimg{grid-area:tim;align-self:end;justify-self:start;height:min(46vh,100%);max-width:100%}',
    '.tkq.tkq-chmode.tkq-fill.tkq-wide .tkq-chars .tkq-cimg.peng{grid-area:cap;justify-self:end;height:min(40vh,300px)}',
    '.tkq.tkq-chmode.tkq-fill.tkq-wide .tkq-chars .tkq-bub{grid-area:cap;align-self:start;margin:14px 0 0;max-width:100%;font-size:15px}',
    '.tkq-fill.tkq-wide:not(.tkq-short) .tkq-opt.tkq-opt--ar{max-height:130px;padding-top:4px;padding-bottom:6px;gap:0}.tkq-fill.tkq-wide:not(.tkq-short) .tkq-opt .tkq-ar{font-size:clamp(44px,3.8vw,52px)!important;line-height:1.35}.tkq-fill.tkq-wide:not(.tkq-short) .tkq-opt .tkq-tr{font-size:clamp(18px,1.6vw,22px)!important}',
    '.tkq-wide:not(.tkq-short) .tkq-opt .tkq-ar{font-size:max(44px,1em)}.tkq-wide:not(.tkq-short) .tkq-opt .tkq-tr{font-size:18px}',
    '.tkq-fill.tkq-wide:not(.tkq-short) .tkq-ans{flex:0 0 auto;grid-auto-rows:auto;justify-content:center}',
    '.tkq-fill.tkq-wide:not(.tkq-short) .tkq-ans.n3:not(.pic){grid-template-columns:repeat(3,minmax(0,240px))!important}',
    '.tkq-fill.tkq-wide:not(.tkq-short) .tkq-opt{height:auto;min-height:92px;max-height:124px}',
    '.tkq-fill.tkq-wide:not(.tkq-short) .tkq-opt.num>span:first-child{font-size:clamp(44px,4.4vw,56px)}.tkq-fill.tkq-wide:not(.tkq-short) .tkq-opt>span:first-child:not(.tkq-ar){font-size:clamp(22px,2.4vw,32px)}',
    '.tkq-fill.tkq-wide:not(.tkq-short) .tkq-opt.num>span:first-child{font-size:clamp(44px,4.4vw,56px)}',
    '.tkq-fill.tkq-wide:not(.tkq-short) .tkq-opt img{flex:0 0 auto;height:88px;min-height:0;width:auto;max-width:100%}.tkq-fill.tkq-wide:not(.tkq-short) .tkq-opt .lb{font-size:clamp(18px,1.7vw,22px);line-height:1.05}.tkq-fill.tkq-wide:not(.tkq-short) .tkq-opt.tkq-opt--img{max-height:152px;gap:2px;padding-top:4px;padding-bottom:4px}',
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
    '.tkq-opt .tkq-ar{font-size:44px;line-height:1.35}.tkq-opt .tkq-tr{font-size:14px}',
    // phones: an Arabic answer keeps its 44 px word with the transliteration BESIDE it (a stacked pair did not fit)
    '.tkq-tall .tkq-ans.n3.txt .tkq-opt.tkq-opt--ar{flex-direction:row;gap:10px}',
    '.tkq-tall .tkq-opt.tkq-opt--ar,.tkq-short .tkq-opt.tkq-opt--ar{padding-top:0;padding-bottom:0;gap:0}.tkq-tall .tkq-opt .tkq-ar,.tkq-short .tkq-opt .tkq-ar{line-height:1.35}.tkq-tall .tkq-opt .tkq-tr,.tkq-short .tkq-opt .tkq-tr{line-height:1}',
    // short landscape (844x390) with picture answers: the answer column takes the wider share, picture beside a
    // one-line label, so four picture answers fit as 2x2 inside the card
    '.tkq-short:not(.tkq-sort) .tkq-card.tkq-card--pic,.tkq-short:not(.tkq-sort) .tkq-card.tkq-card--ar{grid-template-columns:56px minmax(0,1fr) minmax(0,2.2fr)}.tkq-short:not(.tkq-sort) .tkq-card.tkq-card--n3txt{grid-template-columns:56px minmax(0,1fr) minmax(0,2.2fr)}.tkq-short .tkq-ans.n3.txt{grid-template-columns:repeat(2,minmax(0,1fr))!important;align-content:center}',
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
    '.tkq-sfill .tkq-seats{gap:5px;flex-wrap:nowrap;width:100%;justify-content:center}.tkq-sfill .tkq-seatp{flex:0 1 48px;min-width:22px;width:auto;height:auto;aspect-ratio:3/4}.tkq-sfill .tkq-seatp img{width:100%;height:95%}.tkq-sfill .tkq-seats.tkq-seats--many{flex-wrap:wrap}.tkq-sfill .tkq-seats.tkq-seats--many .tkq-seatp{flex:0 0 30px}',
    '.tkq.tkq-mt.tkq-short{grid-template-rows:minmax(0,1fr) auto;grid-template-areas:"chars card" "foot foot"}.tkq-mt.tkq-short .tkq-stats,.tkq-mt.tkq-short .tkq-top{display:none}'
  ].join('\n')
  // the clock / fraction cake scales down to its scene instead of spilling over the question above it (qa-tk-ui-audit V);
  // the clock numerals are drawn at 15 viewBox units so a 94 px face still reads 14 px, a 80 px face 12 px
  CSS += '\n.tkq-scene>svg.tkq-clock{max-height:100%;max-width:100%}'
  // tablets: a clock face never below 94 px, even in the compact card (numerals are 15 viewBox units -> >= 14 px);
  // the compact fit shrinks the other scene parts and the gaps instead
  CSS += '\n.tkq:not(.tkq-short):not(.tkq-tall) .tkq-card svg.tkq-clock:not(.tkq-frac){min-width:94px;min-height:94px}'
  // ... and its scene zone keeps room for it (clock + padding), so the face never rides up onto the prompt
  CSS += '\n.tkq:not(.tkq-short):not(.tkq-tall) .tkq-card .tkq-scene.tkq-scene--clock{min-height:100px!important;flex-shrink:0}'
  // Arabic speaker (listening items): a big round button beside the hero word, >= 64 px, drawn with the listen sprite
  CSS += '\n.tkq-arw.tkq-lsn{position:relative;display:flex;flex-direction:column;align-items:center;padding:0 84px}' +
    '.tkq-arsay{position:absolute;right:0;top:50%;margin-top:-36px;width:72px;height:72px;min-width:72px;min-height:72px;padding:0;border-radius:50%;border:3px solid #fff;background:linear-gradient(#5AA2FF,#1F63D6);box-shadow:0 4px 0 #103A88;display:grid;place-items:center;transition:transform 160ms cubic-bezier(.23,1,.32,1)}' +
    '.tkq-arsay[hidden]{display:none}.tkq-arsay img,.tkq-arsay .tk-ico{width:40px;height:40px}.tkq-arsay:active{transform:scale(.94)}' +
    '.tkq-arsay.muted{background:linear-gradient(#9aa6bd,#6b7690);box-shadow:0 4px 0 #4a5268}.tkq-arsay.muted::after{content:"";position:absolute;left:14px;right:14px;top:50%;height:5px;margin-top:-2px;border-radius:3px;background:#fff;transform:rotate(-40deg);box-shadow:0 0 0 2px #4a5268}' +
    '.tkq-arsay.on{animation:tkq-arpulse 220ms ease-out}@keyframes tkq-arpulse{50%{transform:scale(1.08)}}' +
    '.tkq-rm .tkq-arsay.on,.rm .tkq-arsay.on{animation:none}@media (prefers-reduced-motion:reduce){.tkq-arsay.on{animation:none}}' +
    '.tkq-tall .tkq-arw.tkq-lsn{padding:0 70px}.tkq-tall .tkq-arsay,.tkq-short .tkq-arsay{width:64px;height:64px;min-width:64px;min-height:64px;margin-top:-32px}'
  // tablet type floor (qa-tk-ui-audit): the speaker tag on a bubble >= 14 px when the short side is >= 600 px
  CSS += '\n@media (min-width:600px) and (min-height:600px){.tkq-bub b,.tkq .tkq-plate p,.tkq .tkq-stat small,.tkq .tkq-tab,.tkq .tkq-tab span,.tkq .tkq-step span,.tkq .tkq-step,.tkq-tall .tkq-step.cur span{font-size:14px}}'
  // phones (qa-tk-ui-audit 2026-09-29): the long plate title fits a 390 px frame; picture answers go picture-over-label in
  // one row of three / 2x2 so each picture is >= 56 px (stacked rows squeezed them to ~30-48 px and pushed the asked
  // Arabic word over its prompt)
  CSS += '\n.tkq-tall .tkq-plate h2{font-size:clamp(16px,4.8vw,22px)}' +
    '.tkq-fill.tkq-tall .tkq-ans.n3.pic{grid-template-columns:repeat(3,minmax(0,1fr))!important}' +
    '.tkq-fill.tkq-tall .tkq-ans.pic .tkq-opt{flex-direction:column!important;justify-content:center;gap:4px;padding:6px 4px}.tkq-fill.tkq-tall .tkq-ans.n3.pic .tkq-opt{min-height:108px}' +
    '.tkq-fill.tkq-tall .tkq-ans.pic .tkq-opt img{flex:1 1 0;width:100%;max-width:100%;height:auto;min-height:40px;max-height:200px;object-fit:contain}.tkq-fill.tkq-tall .tkq-ans.pic:not(.n3) .tkq-opt{padding:3px 4px;gap:2px}.tkq-fill.tkq-tall .tkq-ans.pic:not(.n3) .tkq-opt img{min-height:0}' +
    '.tkq-fill.tkq-tall .tkq-ans.pic .tkq-opt .lb{flex:0 0 auto;min-width:0;font-size:clamp(16px,4.4vw,24px);text-align:center;line-height:1.1}' +
    // an Arabic answer's harakat (vowel marks) sit above / below the letters: a 1.35 line box plus .18em of padding top and bottom holds the
    // whole Naskh glyph box (~1.7em content area) inside the label, so no mark touches or leaves the button (qa-tk-ui-audit O, 2026-09-30);
    // fitAnswers steps the font down when the taller label would overflow the card
    '.tkq-opt>span.tkq-ar{padding:.18em 2px;flex-shrink:0}' +
    // a phone on its side: an Arabic answer steps its font down (floor 34 px) before it may wrap onto a second line
    // (two wrapped lines with their harakat are too tall for the 2x2 card); .brk is the last resort
    '.tkq-short .tkq-opt:not(.brk)>span.tkq-ar{white-space:nowrap}' +
    '.tkq-tall.tkq-cmp2 .tkq-tabs,.tkq-tall.tkq-cmp2 .tkq-plate p{display:none}.tkq-notr .tkq-opt .tkq-tr{display:none}'
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
  var AR_PAINT = null, AR_LISTEN = false   // the Arabic listening speaker's repaint (see wireArSay)
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
      nums += '<text x="' + (50 + 33 * Math.sin(a)).toFixed(1) + '" y="' + (50 - 33 * Math.cos(a) + 5.3).toFixed(1) + '" text-anchor="middle" font-size="15" fill="#1F3B73" font-family="Fredoka One,system-ui">' + i + '</text>'
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
      '<button type="button" class="tkq-btn tkq-speak" aria-label="Dengar soal">' + sprite('listen', 'tk-prop/ships-bell', lib) + '</button><span class="tkq-count"></span>' +
      (noHints ? '' : '<button type="button" class="tkq-btn tkq-hintbtn" aria-label="Petunjuk">' + sprite('hint', 'tk-prop/lantern', lib) + '<span>Petunjuk</span></button>') + '<span class="tkq-badge"></span></div>' +
      '<div class="tkq-prompt"></div><div class="tkq-eq" hidden></div><div class="tkq-scene"></div><div class="tkq-help" aria-live="polite"></div>' +
      '<div class="tkq-ans" role="group" aria-label="Pilihan jawaban"></div><div class="tkq-explain" hidden aria-live="polite"></div></section>'
    // opts.subFor(domain) -> the plate subtitle for the CURRENT question's topic (re-set on every question)
    var subFor = typeof opts.subFor === 'function' ? opts.subFor : null
    if (subFor && qs[0]) topic = subFor(qs[0].domain) || topic
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
          // a listening item shows the Arabic word as the hero too (owner tablet 2026-09-29: SFX-only mode has no voice, so
          // "Dengar: «safiinah»" alone could not be answered); the round speaker plays it with an Arabic voice when one exists
          h += '<div class="tkq-arw' + (q.listen ? ' tkq-lsn' : '') + '"><span class="tkq-ar" dir="rtl" lang="ar">' + esc(q.ar) + '</span><span class="tkq-tr">' + esc(q.tr) + '</span>' +
            (q.listen ? '<button type="button" class="tkq-btn tkq-arsay" hidden aria-label="Dengarkan kata Arab">' + ICON.speaker + '</button>' : '') + '</div>'
        }
      }
      function inner (g, cls) { var s = ''; for (var j = 0; j < g.n; j++) s += objHTML(g.key, idx++, cls, size); return s }
      E.scene.innerHTML = h
      // .tkq-scene--clock replaces a CSS :has() (Android WebView < Chrome 105 ignores it and the clock rode up onto the prompt)
      E.scene.classList.toggle('tkq-scene--clock', Array.prototype.some.call(E.scene.children, function (c) { return c.tagName.toLowerCase() === 'svg' && c.classList.contains('tkq-clock') && !c.classList.contains('tkq-frac') }))
      E.scene.style.display = h ? '' : 'none'
      root.classList.toggle('tkq-noscene', !h)
      // a scene sprite that arrives after the fit (cold cache: the counting ship had no height yet) fits the card again,
      // so the grown scene never rides over the question (playtest 2026-09-30, challenge card)
      Array.prototype.forEach.call(E.scene.querySelectorAll('img'), function (im) { if (!im.complete) im.addEventListener('load', refitSoon) })
      // counting scenes: every object can be tapped to count it aloud ("satu, dua, ...")
      E.scene.classList.toggle('tapcount', q.domain === 'matematika' && /^(count|add|sub|groups|diff|twostep)$/.test(sc.mode))
      var sayBtn = E.scene.querySelector('.tkq-arsay'); if (sayBtn) wireArSay(sayBtn, q.listen)
      // objects arrive: stagger (base first, then the arriving group)
      var os = E.scene.querySelectorAll('.tkq-o,.tkq-op')
      Array.prototype.forEach.call(os, function (o, k) { later(function () { o.classList.add('in') }, 60 + k * 45) })
      var hide = q.domain === 'matematika' && tierOf(q) >= 3 && sc.mode !== 'clock' && sc.mode !== 'capacity'
      if (hide) { E.scene.style.display = 'none'; root.classList.add('tkq-noscene') }
    }
    // the Arabic speaker (listening items): a child's tap is an explicit play action, so it speaks even with Narasi off;
    // hidden when the device has no speechSynthesis or no Arabic voice; shown muted while G30 sound is off (a tap unmutes)
    function arVoice () { try { return W.speechSynthesis ? (W.speechSynthesis.getVoices() || []).filter(function (x) { return /^ar/i.test(x.lang) })[0] || null : null } catch (e) { return null } }
    function wireArSay (b, text) {
      var paint = function () { if (!b.isConnected) { if (AR_PAINT === paint) AR_PAINT = null; return } b.hidden = !arVoice(); b.classList.toggle('muted', !!(opts.muted && opts.muted())) }
      paint()
      // ONE module-level voiceschanged listener repaints only the current speaker (no listener per question / level)
      AR_PAINT = paint
      if (!AR_LISTEN) { try { if (W.speechSynthesis && W.speechSynthesis.addEventListener) { W.speechSynthesis.addEventListener('voiceschanged', function () { if (AR_PAINT) AR_PAINT() }); AR_LISTEN = true } } catch (e) {} }
      later(paint, 600)
      b.addEventListener('click', function () {
        if (opts.muted && opts.muted() && typeof opts.onUnmute === 'function') { try { opts.onUnmute() } catch (e) {} }
        paint()
        var v = arVoice(); if (!v) return
        try { var u = new W.SpeechSynthesisUtterance(text); u.lang = v.lang || 'ar-SA'; u.voice = v; u.rate = 0.8; W.speechSynthesis.cancel(); W.speechSynthesis.speak(u) } catch (e) {}
        b.classList.remove('on'); void b.offsetWidth; b.classList.add('on')
      })
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
        (twoTap ? '<span class="ear" aria-hidden="true">' + sprite('listen', 'tk-prop/ships-bell', lib) + '</span>' : '') + '<span class="ck">' + ICON.check + '</span></button>'
    }
    // state classes set from JS instead of CSS :has() (older Android WebViews, Chrome < 105, ignore :has): an option with an
    // Arabic label / a picture, and the card holding picture / Arabic / 3-text answers
    function flagAnswers () {
      Array.prototype.forEach.call(E.ans.querySelectorAll('.tkq-opt'), function (b) {
        b.classList.toggle('tkq-opt--ar', !!b.querySelector('.tkq-ar')); b.classList.toggle('tkq-opt--img', !!b.querySelector('img'))
      })
      if (!E.card) return
      var a = E.ans.classList
      E.card.classList.toggle('tkq-card--pic', a.contains('pic')); E.card.classList.toggle('tkq-card--n3txt', a.contains('n3') && a.contains('txt'))
      E.card.classList.toggle('tkq-card--ar', !!E.ans.querySelector('.tkq-opt .tkq-ar'))
    }
    function renderAnswers (q) {
      if (q.letters) { var ra = renderArrange(q); flagAnswers(); return ra }
      E.ans.style.display = ''
      var n3 = q.choices.length === 3, short = q.choices.every(function (c) { return (String(c).length <= 7 && !/[\u0600-\u06FF]/.test(String(c))) || (q.pics && q.pics[c]) })   // an Arabic word is never 'num': three 104 px columns broke it letter by letter (phone, 2026-09-29)
      var pic = q.choices.some(function (c) { return q.pics && q.pics[c] })
      E.ans.className = 'tkq-ans' + (n3 ? ' n3 ' + (short ? 'num' : 'txt') : '') + (pic ? ' pic' : '')
      E.ans.innerHTML = q.choices.map(function (c, i) { return optHTML(q, c, i) }).join('')
      flagAnswers()
      Array.prototype.forEach.call(E.ans.querySelectorAll('.tkq-opt'), function (b, k) {
        later(function () { b.classList.add('in') }, 120 + k * 45)
        b.addEventListener('click', function () { choose(b) })
      })
      fitAnswers()
    }
    /* fit the answers (owner tablet photo 2026-09-28: "Alhamdulillah" / "Wa'alaikumussalam" spilled out of a
       4-up row): four long answers go 2x2 instead of 4-up; then each label steps its font down to a 16 px
       floor until it sits inside its button; only then may a long word break (last resort). */
    var fitKey = '', fitRetry = false, refitT = 0
    function refitSoon () { clearTimeout(refitT); refitT = setTimeout(function () { if (alive) fitAnswers() }, 40); timers.push(refitT) }
    // Arabic answer floor (owner 2026-09-29 "tulisan arabnya terlalu kecil"): 44 px, 34 px only on a phone on its side
    function arFloor () { return root.classList.contains('tkq-short') ? 34 : 44 }
    function fitAnswers () {
      var bs = E.ans.querySelectorAll('.tkq-opt')
      if (!bs.length || !E.ans.clientWidth) return
      var texts = []
      Array.prototype.forEach.call(bs, function (b) {
        b.classList.remove('brk')
        Array.prototype.forEach.call(b.children, function (t) { if (t.tagName === 'SPAN' && !/\b(ck|ear)\b/.test(t.className)) { t.style.fontSize = ''; texts.push([b, t]) } })
      })
      E.ans.style.gridTemplateColumns = ''; E.ans.style.removeProperty('grid-auto-rows'); root.classList.remove('tkq-notr')
      if (bs.length === 4 && root.classList.contains('tkq-wide') && !root.classList.contains('tkq-short')) {
        // 4-up only when the widest label fits a quarter of the row at its own size
        var gap = parseFloat(getComputedStyle(E.ans).columnGap) || 10, per = (E.ans.clientWidth - 3 * gap) / 4 - 34, need = 0
        texts.forEach(function (bt) { var t = bt[1], ws = t.style.whiteSpace; t.style.whiteSpace = 'nowrap'; need = Math.max(need, t.scrollWidth); t.style.whiteSpace = ws })
        E.ans.style.gridTemplateColumns = need <= per ? 'repeat(4,minmax(0,1fr))' : 'repeat(2,minmax(0,1fr))'
      }
      texts.forEach(function (bt) {
        var b = bt[0], t = bt[1], fs = parseFloat(getComputedStyle(t).fontSize) || 20, n = 0
        var ar = t.classList.contains('tkq-ar'), fl = ar ? arFloor() : 16
        // an Arabic label also steps down while its marks do not fit its own line box (the grid row may squeeze the label)
        while ((t.scrollWidth > t.clientWidth + 1 || b.scrollHeight > b.clientHeight + 1 || b.scrollWidth > b.clientWidth + 1 || (ar && t.scrollHeight > t.clientHeight + 1)) && fs > fl && n++ < 40) { fs = Math.max(fl, fs - 1); t.style.fontSize = fs + 'px' }
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
          var ar2 = t.classList.contains('tkq-ar'), fl2 = ar2 ? arFloor() : 16
          while ((t.scrollWidth > t.clientWidth + 1 || b.scrollHeight > b.clientHeight + 1 || (ar2 && t.scrollHeight > t.clientHeight + 1)) && fs > fl2 && n++ < 40) { fs = Math.max(fl2, fs - 1); t.style.fontSize = fs + 'px' }
          b.classList.toggle('brk', t.scrollWidth > t.clientWidth + 1)
        })
        fitRetry = false
      }
      // long Arabic answers (two-word numbers) on a short screen: step every Arabic label down TOGETHER until the
      // card holds all answers (floor 34 px on a phone on its side, 44 px elsewhere)
      var ars = E.ans.querySelectorAll('.tkq-opt .tkq-ar')
      // Arabic answers share one size: the smallest any of them needed
      if (ars.length > 1) {
        var amin = Math.min.apply(null, Array.prototype.map.call(ars, function (a) { return parseFloat(getComputedStyle(a).fontSize) || 44 }))
        Array.prototype.forEach.call(ars, function (a) { if (Math.abs((parseFloat(getComputedStyle(a).fontSize) || 44) - amin) > 0.5) a.style.fontSize = amin + 'px' })
      }
      growArRows(ars)
      if (ars.length && E.card && E.card.scrollHeight > E.card.clientHeight + 1) {
        var afl = arFloor(), af = parseFloat(getComputedStyle(ars[0]).fontSize) || 44
        while (E.card.scrollHeight > E.card.clientHeight + 1 && af > afl) { af = Math.max(afl, af - 2); Array.prototype.forEach.call(ars, function (a) { a.style.fontSize = af + 'px' }); growArRows(ars) }
      }
      fitCard()
      // after the card fit (compact mode may squeeze the rows): one more step for Arabic labels whose marks still do not
      // fit their line box or their button, all together so the answers stay one size
      if (ars.length) {
        var arBad = function () { return Array.prototype.some.call(ars, function (a) { var bb = a.parentNode; return a.scrollHeight > a.clientHeight + 1 || bb.scrollHeight > bb.clientHeight + 1 }) }
        var af2 = parseFloat(getComputedStyle(ars[0]).fontSize) || 44, fl3 = arFloor(), m = 0
        while (arBad() && af2 > fl3 && m++ < 20) { af2 = Math.max(fl3, af2 - 1); Array.prototype.forEach.call(ars, function (a) { a.style.fontSize = af2 + 'px' }) }
        for (var g2 = 0; g2 < 3 && arBad(); g2++) { growArRows(ars); fitCard() }
        // last resort on a phone on its side (four two-word numbers at 34 px): the transliteration line goes (it stays
        // in each button's aria-label) so the four answers keep their harakat inside a card that shows them all
        if (root.classList.contains('tkq-short') && E.card && E.card.scrollHeight > E.card.clientHeight + 1 && E.ans.querySelector('.tkq-opt .tkq-tr')) {
          root.classList.add('tkq-notr'); growArRows(ars); fitCard()
        }
      }
      fitKey = E.ans.clientWidth + 'x' + E.ans.clientHeight
    }
    /* Arabic answers: the label keeps its full line box (harakat included, it does not flex-shrink), so a grid row that is
       too short for it grows to the button's content height; the card fit below then shrinks the scene to make room */
    function growArRows (ars) {
      if (!ars.length) return
      E.ans.style.removeProperty('grid-auto-rows')
      var need = 0, have = 1e9
      Array.prototype.forEach.call(ars, function (a) { var b = a.parentNode; need = Math.max(need, b.scrollHeight + (b.offsetHeight - b.clientHeight)); have = Math.min(have, b.offsetHeight) })
      if (need > have) E.ans.style.setProperty('grid-auto-rows', 'minmax(' + Math.ceil(need + 2) + 'px,1fr)', 'important')
    }
    /* the card never hides an answer below its edge (390x844 / 844x390: the third answer sat under the card's
       bottom): tighten the gaps first, then shrink the scene pictures (--k) down to half size */
    function fitCard () {
      var c = E.card; if (!c || !c.clientHeight) return
      var over = function () { return c.scrollHeight > c.clientHeight + 1 }
      root.classList.remove('tkq-cmp'); root.classList.remove('tkq-cmp2'); c.style.removeProperty('--k')
      var sc = E.scene, ship = sc && sc.querySelector('.tkq-ship')
      // the counting ship stays BESIDE the items (never wrapped onto its own line under them, never over the text)
      var shipWrapped = function () {
        if (!ship || !sc.firstElementChild || sc.firstElementChild === ship) return false
        var a = sc.firstElementChild.getBoundingClientRect(), b = ship.getBoundingClientRect(); return b.top >= a.bottom - 4
      }
      // every scene part inside the scene box (a centred scene overflows UP as well, which scrollHeight cannot see)
      var inside = function () {
        var r = sc.getBoundingClientRect()
        return Array.prototype.every.call(sc.children, function (e) { var q = e.getBoundingClientRect(); return !q.height || (q.top >= r.top - 1 && q.bottom <= r.bottom + 1) })
      }
      if (!over()) {
        if (ship && shipWrapped()) {
          for (var ks = 0.9; ks >= 0.6 && shipWrapped(); ks -= 0.1) c.style.setProperty('--k', ks.toFixed(2))
          if (shipWrapped()) c.style.removeProperty('--k')
          return
        }
        // landscape tablet: the picture grows into the free scene height (up to 1.9x) — never past it
        if (root.classList.contains('tkq-fill') && root.classList.contains('tkq-wide') && !root.classList.contains('tkq-short') && sc && sc.style.display !== 'none' && sc.children.length) {
          var fits = function () { return sc.scrollHeight <= sc.clientHeight + 1 && sc.scrollWidth <= sc.clientWidth + 1 && !over() && inside() && !shipWrapped() }
          var k = 1
          for (var g = 1.1; g <= 1.91; g += 0.1) { c.style.setProperty('--k', g.toFixed(2)); if (fits()) k = g; else break }
          if (k === 1) c.style.removeProperty('--k'); else c.style.setProperty('--k', k.toFixed(2))
        }
        return
      }
      root.classList.add('tkq-cmp')
      for (var k = 0.9; over() && k >= 0.45; k -= 0.1) c.style.setProperty('--k', k.toFixed(2))
      // a phone portrait card that still overflows (three Arabic answers, each with its full harakat line box): drop the
      // subject tabs and the plate subtitle, as a short phone (max-height 720) already does, and fit again
      if (over() && root.classList.contains('tkq-tall')) {
        root.classList.add('tkq-cmp2'); c.style.removeProperty('--k')
        for (var k2 = 0.9; over() && k2 >= 0.45; k2 -= 0.1) c.style.setProperty('--k', k2.toFixed(2))
      }
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
      if (subFor) { var sp = root.querySelector('.tkq-plate p'), st = subFor(q.domain); if (sp && st) sp.textContent = st }
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
        (b.cap ? '<div class="tkq-seats' + (b.cap >= 9 ? ' tkq-seats--many' : '') + '" data-seats="' + esc(b.id) + '" aria-hidden="true">' + seatRow(b, bi) + '</div><div class="cap" data-cap="' + esc(b.id) + '">0 / ' + b.cap + ' orang</div>' : '') + '<div class="tkq-stack"></div></div>'
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
      '<section class="tkq-card"><div class="tkq-head"><button type="button" class="tkq-btn tkq-speak" aria-label="Dengar perintah">' + sprite('listen', 'tk-prop/ships-bell', lib) + '</button><span class="tkq-count" data-k="left"></span>' +
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
    // SoalEngine context 'challenge' (profile g30): no "arrange the letters", no listen-only Arabic (needs a
    // voice the device may lack), short prompts; the avatar history keeps cards from repeating across worlds
    var d = opts.domain || 'campur'
    var o = seOpts(opts, d === 'campur' ? { context: 'challenge' } : { context: 'challenge', topic: topicOf(d, opts) })
    return SE.one(o) || SE.one(seOpts(opts, { context: 'challenge', topic: 'matematika' }))
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
    easyify: easyify, isEasy: isEasy, numWord: numWord, challenge: challenge, makeHard: makeHard, MIX: MIX, challengeQuestion: challengeQuestion,
    VERSION: '1.1.0'
  }
})()
