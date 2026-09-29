# SOAL ENGINE STANDARD — one question source for every game

> Owner mandate (quoted in `games/quiz-engine.js`): *"quiz/question harusnya ada engine tersendiri yang shared
> among all the game. jangan per-game membuat engine/algo sendiri."*
> 2026-09-29: *"Dunia Emosi has a question engine. Embed and integrate it so questions don't get hardcoded every
> time there's a new game."* + *"Just expand the question engine so it can adapt per game."* + *"soal sering berulang."*

`window.SoalEngine` (`games/data/soal-engine.js`) is THE question source. A game never writes its own
generator, picker, weight table, grade filter or no-repeat list. It declares a **profile** and calls `pick`.

| Layer | File | Role |
|---|---|---|
| Engine | `games/data/soal-engine.js` | packs, generators, profiles, `pick`, history, pictures, safety, validation, adapters |
| Maths | `games/data/soal-gen-matematika.js` | the core Matematika generators `mat-a` (fase A) and `mat-sulit` (Kelas 3–4) |
| Packs | `games/data/soal-pack-<theme>.js` | registers a curated bank + the game profile (e.g. `soal-pack-kapal.js` = pack `kapal` + profile `g30`) |
| Renderer | `games/quiz-engine.js` / the game's own card UI | draws what `pick` returns; never chooses questions |
| Legacy API | `games/data/question-super-engine.js` (`SuperQuiz`) | unchanged API; its subject generators plug into SoalEngine as general pools |

Load order: `soal-engine.js` → `soal-gen-matematika.js` → pack files. Any legacy pool file
(`super-quiz-data.js` + `question-super-engine.js`, `kids-questions.js`, `g23-question-engine.js`) may load
before or after — adapters register them lazily on the first `pick`.

---

## 1. A new game in 5 lines

```html
<script src="data/soal-engine.js?v=…"></script>
<script src="data/soal-gen-matematika.js?v=…"></script>
```
```js
SoalEngine.defineGame('g31', { themes: ['hutan'], nouns: { _: [['animals/monkey', 'monyet'], ['food/banana', 'pisang']] } })
var qs = SoalEngine.pick({ game: 'g31', grade: tingkat /* 'mudah' | 'sulit' */, count: 5 })
// render qs[i].prompt / .choices / .answer (+ .pic / .choicePics sprites) with your card UI or QuizEngine
```

Everything else — weights, grade filter, per-avatar no-repeat, 3 choices in easy mode, sprites instead of
emoji, child-safety filter, themed maths — comes from the `default` profile the game `extends`.
A game with its own curated items adds one pack file (§3). **Never** put question text in the game script.

---

## 2. Question schema (what `pick` returns)

```
{ id, topic, grade 1–4, level?, prompt, choices[], answer,
  pic?        sprite key for the question picture
  choicePics? {choiceText: spriteKey}  (picOnly: true when the choice has no text — show the picture only)
  script?     Arabic text,  translit?  its transliteration
  theme[]     e.g. ['kapal', 'titanic'],  source  pack / generator id,  domain  (= topic)
  …plus every extra field the source carried: explain, hint1, hint2, step1, eq, scene, calc, visual, rtl, trs,
     listen, letters, seq, swatch, hard, kind, easy … }
```

- `topic`: `matematika | umum | logika | islam | arab | bahasa | sains | bentuk | waktu | emosi | …` (lowercase, kebab).
- `grade`: Kelas 1–4. Mudah = grades 1–2 (fase A), Sulit = grades 3–4 (fase B). Untagged curated items count as 2.
- `level`: optional difficulty 1–4 inside the grade band (G30 maps mastery to it).
- Sprite keys: bare library keys (`game/crate-wood` → `assets/db/lib/<key>.webp`) or EmojiMap specs
  (`creatures/28`, `lib:animals/bee`, `eco:star`).
- Bank items are never mutated: every served question is a copy.

## 3. Packs

```js
SoalEngine.registerPack('truk', {
  items: function () { return W.GTQuestions.items },   // array, or a function read lazily (bank may grow / load later)
  meta: { theme: 'truk', grade: 2 }                    // theme -> a THEME pack; general: true -> a general pool
})
```

The engine's normalizer accepts the old shapes, so a legacy pool registers without rewriting:
`{prompt|q|text, choices|options|opts, answer|ans|a | correct(index) | wrong[], domain|topic, world}`.
`meta.map(raw, i)` may re-tag items (topic from tags, grade from age).

| Pack | Source | Kind |
|---|---|---|
| `kapal` | `games/data/tk-questions.js` (`TKQuestions.items`, grade/level/world tags) | theme `kapal` |
| `kids` | `games/data/kids-questions.js` (tags → topic, age → grade) | general (auto) |
| `g23-easy/medium/hard/expert` | `games/data/g23-question-engine.js` (grade 1/2/3/4) | general (auto) |

An item that fails the schema (e.g. a duplicate choice in the source) is **quarantined**: registered, never served,
listed by the gate. An item carrying a banned word (§9) is never served.

## 4. Generators

```js
SoalEngine.registerGenerator(topic, function (grade, rng, theme, o) { … return question }, {
  id, grades: [1, 2], core?: true, general?: true, weight?: 1, validate?: function (q) { return [problems] } })
```
`o` = `{level, kind, easy, about, nouns, vocab, extraKinds}` from the profile and the call. A generator must be
seeded only by `rng`, return a full question (answer among the choices) and register a `validate` that recomputes
the answer from `q.calc`. The engine rejects any generated item that fails `validate` / the schema / safety.

| Generator | Topic | Grades | Eligible |
|---|---|---|---|
| `mat-a` | matematika | 1–2 | core (every game): numbers ≤ 20, whole hours, no × ÷; level 1–4, easy = counting only |
| `mat-sulit` | matematika | 3–4 | core: 3-digit ± with regrouping, 10×10, exact ÷, ½ ⅓ ¼, 5-minute clocks, Rp change, m→cm, kg, 2-step stories ≤ 18 words |
| `sq-bahasa/-sains/-emosi/-umum/-logika/-bentuk/-waktu` | SuperQuiz subjects | 1–4 | general pools (`general !== false`) |
| `sq-math` | matematika | 1–4 | only when a game lists it (`generators: ['sq-math']`) — it mixes × ÷ into "medium" |

**Themed maths.** Objects come from the profile's `nouns` (per theme, falling back to `_`); story words from
`vocab`. The G30 text ("Ada 5 peti di kapal. 2 lagi dimuat.") and a Garasi text ("Ada 5 ban di garasi. 2 lagi
datang.") are the same generator. Neutral defaults: `{place:'meja', deck:'meja', load:'ditambah', unload:'diambil',
carrier:'Tim', box:'kotak', crate:'kotak', seat:'Mobil', rope:'Tali', cheer:''}`.

## 5. Profiles — "adapt per game"

```js
SoalEngine.defineGame('g29', { extends: 'default', … })   // extends defaults to 'default'
SoalEngine.profile('g29')                                  // the resolved profile (inheritance applied)
```

| Key | Default | Meaning |
|---|---|---|
| `topics` | all with a source | allowed topics |
| `weights` | `{matematika:40, umum:15, logika:15, bahasa:10, sains:10, bentuk:5, waktu:5, emosi:5}` | share per topic (unlisted topics get 0 once weights exist) |
| `themes` / `themeShare` | `[]` / 0.6 | THEME packs the game may draw; share of curated picks restricted to them (rest = general pools) |
| `packs` | null | explicit pack allow-list (overrides themes + general) |
| `general` | true | may draw general packs / generators |
| `subThemeShare` | 0.8 | share restricted to the call's own `theme` (a world, a level biome) |
| `grade` | `{mudah:2, sulit:4}` | Tingkat Soal → max grade; add aliases (`kelas1`, `adaptif`) or pass 1–4 |
| `sulitShare` | 0.7 | in Sulit, share of curated picks restricted to grade ≥ 3 (the rest mixes in 1–2) |
| `choices` | `{easy:3, normal:4}` | choice count; easy keeps the answer + the nearest distractors |
| `pictures` | `'emoji'` | `'sprite'` (emoji → sprite keys; unmappable items dropped) · `'emoji'` · `'none'` |
| `spriteResolver` | null | `fn(emojiChar) → spriteKey` — game art first, then the shared EmojiMap |
| `nouns` / `vocab` / `mathKinds` | neutral | generated-maths vocabulary per theme; extra kinds per theme (`{queenmary: [['clock', 60]]}`) |
| `maxWords` | `{1:14, 2:16, 3:18, 4:18}` | max prompt words per grade (curated filtered, generated retried) |
| `scope` | `'game'` | no-repeat history per avatar **per game**, or `'shared'` across games |
| `avatar` | `'auto'` | the active Dunia avatar (save-engine `_activeAvatarSlug`) |
| `without` | `[]` | item flags never served (`letters`, `listen`, `islam` …) |
| `stopWords` | `[]` | extra words ignored when matching `about` |
| `contexts` | see below | per-context overrides |

**Contexts** — `pick({game, context})` merges `profile.contexts[context]` over the profile, and the call's own
options over both (call > context > profile > extends chain):

| Context | Default override | Use |
|---|---|---|
| `challenge` | `maxWords {1:12, 2:14, 3:16, 4:16}`, `without ['letters','listen']` | one quick card over a running game |
| `gate` | `maxWords {1:10, 2:12, 3:14, 4:14}`, `without ['letters','listen']` | obstacle / door gates |
| `chest` | `without ['letters']` | reward chests |
| `quiz` | `{}` | a quiz step / round |

## 6. `pick(opts)` → `[question]`

```
{ game, context, avatar ('auto' | id | null = session only), history? (false = stateless), grade ('mudah' | 'sulit' | 1–4 | a profile alias),
  count (1), topic?, weights?, maxPer? {arab: 1}, theme? (string | [..], e.g. the world), level? (n | {topic:n}),
  easy? (bool | {topic:bool}), about? (the level goal line), aboutCount? (ceil(count/2)), exclude? (ids),
  without? [...], seed? | rng?, pictures?, kind? (force a generator kind), generators? [...], packs? [...] }
```

Per question slot:
1. `about` slots: curated items matching the goal line (shared content word), unseen first, best match first.
2. Topic by the weights (capped by `maxPer`); a topic with nothing left falls through to one that has.
3. Curated vs generated: generated only when the topic has no curated items, the curated pool is all seen, or by
   the generator weight share.
4. Curated stages: call theme (80 %) → game theme (`themeShare`) → exact level → level ± 1 → all. Sulit restricts to
   grade ≥ 3 first (`sulitShare`). Inside the first stage that still has an **unseen** item, a random unseen item.
   Every stage exhausted → the **least recently seen** item.
5. Generated: retried until the signature (prompt + numbers) is not among the avatar's last 50, the prompt fits
   `maxWords` and the item validates.
6. Output: pictures mode applied, choices shuffled, easy → `choices.easy`, history marked and saved.

`SoalEngine.one(opts)` = the first of `pick({count: 1})`. `SoalEngine.generate(topic, opts)` = one generated question
without history (tests, harnesses, host-fixed rounds).

## 7. No repeats

- localStorage **`soal-seen-<avatar>`** = `{v:1, n, seen:{scope:{id:stamp}}, sig:{scope:[last 50 signatures]}}`.
  Every read/write is in try/catch; private mode / blocked storage falls back to memory for the session.
- Capped at 1,500 ids per scope (trimmed to the 1,200 most recent).
- Scope = the game id (`scope:'game'`) or `*` (`scope:'shared'`).
- Within one call: never the same id twice. Without an avatar: no repeats within the session (memory).
- Once a pool is exhausted: least recently seen first, so the cycle restarts oldest-first.

## 8. Pictures

G27–G30 ask for `pictures: 'sprite'` (owner rule: sprites, not emoji). Emoji in a prompt become `pic`; emoji in a
choice become `choicePics[label]` (`picOnly` when the choice was only an emoji). Resolution: the profile's
`spriteResolver`, then `EmojiMap.get` (`games/data/emoji-map.js`). An item with an unmappable emoji is not served
in sprite mode — add the mapping to EmojiMap (or the game resolver) rather than an emoji fallback.

## 9. Child safety

`SoalEngine.UNSAFE` (violence, weapons, drugs/alcohol, gambling, insults, sexual words) is checked on every item and
every generated question (prompt, choices, explain, hints). A match is never served. Content rules for Kelas 1–2
(no history names / years / countries in G30) stay in each bank's own gate (`qa-tk-questions` B3).

## 10. Games

### G30 Timmy & Kapal Legendaris — profile `g30` (wired, `games/data/soal-pack-kapal.js`)

`topics [matematika, umum, logika, islam, arab]`, weights `50/15/15/12/8`, `packs ['kapal']`, `general:false`
(fase A content rules are stricter than the general pools), `pictures:'sprite'`, nouns per world, ship vocab,
`mathKinds.queenmary` clock boost, contexts `challenge` (≤ 14 words, no letters / listen) and `quiz` (no letters).
`games/tk-quiz.js` draws every question through `SoalEngine.pick({game:'g30', …})`.

### Draft — G29 Garasi Tempur (not wired yet)

```js
SoalEngine.defineGame('g29', {
  topics: ['matematika', 'logika'], weights: { matematika: 85, logika: 15 },
  grade: { mudah: 1, sedang: 2, sulit: 4 },        // gt-quiz levels: 'mudah' sums to 10, 'sedang' to 20
  themes: ['truk'], themeShare: 0.6, pictures: 'sprite',
  nouns: { _: [['gt/part-tire', 'ban'], ['gt/fuel-can', 'jeriken bensin'], ['gt/part-engine', 'mesin'], ['gt/oil-barrel', 'tong oli']] },
  vocab: { place: 'garasi', deck: 'garasi', load: 'datang', unload: 'dibawa pergi', carrier: 'Truk', box: 'truk', crate: 'kotak', seat: 'Truk', rope: 'Tali derek' },
  contexts: { attack: { maxWords: 8, choices: { easy: 4, normal: 4 } }, rush: { maxWords: 6 } }   // one answer per attack; Monster Rush = bare sums
})
// gt-quiz: q = SoalEngine.one({ game: 'g29', context: 'attack', grade: level, avatar: 'auto' })
```
Grade 1 via `mat-a` level 1–2 gives numbers ≤ 10; grade 2 gives ≤ 20 (matching `mudah` / `sedang`).

### Draft — balapan-kereta (train games, not wired yet)

```js
SoalEngine.defineGame('balapan-kereta', {
  topics: ['matematika', 'bentuk', 'sains', 'umum', 'bahasa'], weights: { matematika: 40, bentuk: 20, sains: 15, umum: 15, bahasa: 10 },
  themes: ['kereta'], themeShare: 0.6, general: true, pictures: 'sprite',   // obstacle gates draw kids-questions today
  nouns: { _: [['people/<passenger>', 'penumpang'], ['vehicles/<wagon>', 'gerbong'], ['things/cardboard-box', 'kotak']] },
  vocab: { place: 'kereta', deck: 'gerbong', load: 'naik', unload: 'turun', carrier: 'Kereta', box: 'gerbong', crate: 'gerbong', seat: 'Gerbong', rope: 'Rel' },
  contexts: { gate: { maxWords: { 1: 8, 2: 10, 3: 12, 4: 12 }, choices: { easy: 3, normal: 3 } } }
})
// ObstacleEngine gate: SoalEngine.one({ game: 'balapan-kereta', context: 'gate', grade: 1 })
```
(`<passenger>` / `<wagon>`: pick the library keys when wiring — the gate checks every sprite key exists.)

## 11. Games still on private engines — migration plan (not migrated yet)

| Game(s) | Private source today | Plan |
|---|---|---|
| G29 Garasi Tempur (`garasi-tempur.html`) | `gt-quiz.js` `make()` — own ± generator, own RNG, "not the same sum twice" | profile `g29` (above); `make` → `SoalEngine.one`; Monster Rush keeps its UI, draws `context:'rush'`; delete `make` |
| mario-pokemon, pokemon-run, pokemon-birds, pokemon-bawah-laut, ducky-volley | `g23-question-engine.js` `G23_/G24_pickQuestions` (Math.random pools) | pools already a general pack; per-game profile + `pick`; then retire `G2x_pickQuestions` |
| balapan-kereta, balapan-kereta-side, lokomotif-pemberani, selamatkan-kereta | `kids-questions.js` via `obstacle-engine.js` (age filter) | already a general pack; ObstacleEngine asks `SoalEngine.one({game, context:'gate'})`; emoji options go sprite |
| gym-pokemon, balapan-kereta | `quiz-engine.js` `QuizEngine.generate` (level arithmetic) | QuizEngine keeps rendering (`fill`), its generate delegates to `SoalEngine.generate('matematika', …)` |
| monster-candy | `question-bank.js` (`QuestionBank.pick/get`) | register its POOLS as a pack (math/warna/hewan/buah → topics), profile + `pick` |
| kuis-matematika, plb | `math-rules.js` (`makeMathQuestionV2`), `math-stories.js`, `math-cloud.js` | math-rules becomes a generator (`sq-math`-style, opt-in per game) until `mat-a`/`mat-sulit` cover its shapes; stories → a pack |
| ayo-berhitung | `berhitung-engine.js` | counting drills: move into `mat-a` kinds or register as a generator |
| ejaan-inggris | `spelling-data.js` | a `bahasa-inggris` pack |

Order: shared-pool games first (they only change the call), then G29, then math-rules.
**SuperQuiz stays backward compatible**: its API (`subjects/capacity/generate/batch`) and outputs are unchanged
(gate H). Note (2026-09-29): no page currently loads `question-super-engine.js`; gym-pokemon, balapan-kereta,
monster-candy, lokomotif and selamatkan-kereta use `quiz-engine.js`, `kids-questions.js` and `question-bank.js`.

## 12. Gates

- `node tools/qa-soal-engine.mjs` — schema of every pack item (quarantine listed), grade filter, 5,000-pick weight
  distribution per profile (±5), no-repeat until exhaustion + LRU, history across a simulated reload + cap + blocked
  storage, 10,000 fase A + 10,000 Sulit generated items, no emoji in sprite mode + resolver hook, SuperQuiz
  compatibility, banned words, profile inheritance, themed nouns / vocab, context overrides, `about`.
- G30: `qa-tk-questions`, `qa-tk-mix`, `qa-tk-quiz-fit`, `qa-tk-play` (`QA_SIZES=1280x800,390x844`).
- A new pack or profile runs `qa-soal-engine` plus the game's own gate. Adding a generator = register a `validate`.
