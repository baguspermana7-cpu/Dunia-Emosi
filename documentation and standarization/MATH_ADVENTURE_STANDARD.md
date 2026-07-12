# MATH ADVENTURE STANDARD — "Matematika Petualangan" (G25)

> Design system + engineering contract for `games/kuis-matematika.html` (tile G25).
> Established A-344/A-345 (2026-07-12). Owner mandate: "sama persis dengan design saya",
> "UIUX + taste + colouring harus relevant", full working economy, shared engines.
> Sibling docs: [MATH-DIFFICULTY-STANDARD.md](./MATH-DIFFICULTY-STANDARD.md),
> [SAVE_ENGINE_STANDARD.md](./SAVE_ENGINE_STANDARD.md), [SPRITE_STANDARD.md](./SPRITE_STANDARD.md),
> [GAME_LAYOUT_STANDARD.md](./GAME_LAYOUT_STANDARD.md).

## 1. Screen flow (owner reference — do not reorder)
`Beranda → Peta Petualangan (main) → Sub-level map → Pilih Skill → Gameplay → Hasil`
+ overlay modals: Toko (shop) · Harian (daily) · Turnamen · Peringkat (leaderboard) · Profil.

## 2. Level model
- **10 Worlds × 10 sub-levels = 100 global levels.** Global `g = (world-1)*10 + sub`.
- Progress persists via the shared `saveLevelProgress('g25', g, stars)` (avatar-keyed) — NEVER a
  private key, so the landing page star totals stay correct. Unlock rule: L1 open; L(g+1) needs ≥1★ on L(g).

## 3. Difficulty ramp (owner spec — keyed to global level)
`maxNum(g)`: g≤20 → **20** · 20<g≤30 → **25** · 30<g≤40 → **linear 25→50** · g>40 → **50** (cap 50, kid-safe).
Tier by g: easy ≤34 · medium 35–67 · hard ≥68. Questions/level: easy 6 · medium 8 · hard 10.
Implemented via `makeMathQuestionV2(g, 100, tier, shape, {maxNum, forceOp})` — see §7.

## 4. Palette + taste tokens (cohesive with the owner's storybook-cartoon art)
Warm saturated **clay** look — thick rounded shapes, soft 3D, glossy highlights.
```
--blue #2f6bd8  --green #4caf50  --gold #ffcf3f  --orange #ff8a3d  --purple #7b53c9
--cream #fff6df (cards)  --parch #f0d9a8 (panels)  --ink #3a2a12 (text)
```
**Clay button** = `.clay` base + colour modifier: 22px radius, 3px white border, drop `0 8px 0` +
inset top-highlight + press `translateY(5px)`. Titles: `Baloo 2` display font, gold fill + orange
outline. Body: `Nunito`. NEVER default flat Tailwind buttons — everything is clay/glossy.

## 5. Map screens = owner art backdrop + our interactive node layer
- The owner's `map-main.webp` / `sub-N.webp` are the **full-bleed backdrop** (the screen IS their art).
- On top: a translucent top-bar (back + title + energy chip) that reads over the baked title, an SVG
  dashed golden **path** connecting nodes, and our own **clay nodes** (`.node`) positioned by a `%`
  template (`PETA_POS` / `SUB_POS`). Node state: `.locked` (🔒) · `.current` (gold pulse) · `.cleared`
  (green + ★). Our node layer is the interactive truth; baked map markers are scenery.
- When the owner sends a higher-res `sub-N.webp`, drop it in `assets/math/` — it auto-swaps.

## 6. Sprites — monster roster + hero (SPRITE_STANDARD compliant: clean, no mutilation)
- **Hero** `assets/math/hero-mathhero.webp` — transparent. NOTE: owner exports sometimes bake a
  checkerboard as OPAQUE pixels (alpha all 255). Removal pipeline: neutral-light mask
  (`sat<22 & min>180`) → border flood-fill → keep largest component → soft de-fringe. Verify on a
  coloured checkerboard that the character is intact.
- **Monsters** `assets/math/monsters/mon-1..81.webp` — 81 distinct chars cropped from the owner sheet
  (white bg). Per-level foe = `mon-((g-1)%81 + 1)`; shown in Pilih Skill preview + Gameplay (with emoji
  fallback on 404). Crop pipeline = the `IKON.png` recipe: scipy border flood-fill + connected-components
  + soft-alpha de-fringe, then a checkerboard montage QA (no fragments/merges/mutilation).
- Asset budget: compress every owner PNG → WebP at display res (maps ≤1400w q84, sprites ≤760/360w q90).
  90MB of raw PNG → ~3MB. The throttled retina tablet cannot afford multi-MB frames.

## 7. Shared engines (M-303 — never per-game hardcode)
- **Questions:** `games/data/math-rules.js` `makeMathQuestionV2(level, maxLevel, difficulty, shape, opts)`.
  `opts.maxNum` = ramp cap override; `opts.forceOp` (`'+'|'-'|'*'|'÷'`) = Pilih Skill drill. Additive —
  4-arg callers unchanged. Shapes cycle: standard/missingOperand/missingOperator/comparison/word.
- **SFX cues:** `games/data/sfx-engine.js` `SFXEngine.cue(name)` + aliases
  `click/coin/levelup/star/correct/wrong/crash`. Files at `assets/sfx/*.mp3`; kid-safe WebAudio synth
  fallback on 404; honours `setMute`/`setVolume`. **SCOPE:** these are for the **question/answer moment +
  general UI** and may be used by ANY game (train coin/crash too) — but they DO NOT replace Pokémon
  **battle SFX** (cries + move sounds stay on `playPokemonAttack`/`playMoveByType`/`playHitFeedback`).
  Shared adoption point for answer feedback = the `games/quiz-engine.js` answer handler (guarded).
- **Save:** `saveLevelProgress` (see SAVE_ENGINE_STANDARD).

## 8. Economy (localStorage `mp_econ`, fully functional)
Energy (regen 1/5min, cap 30, gates each level), coins (earn per correct + level clear; spend in Toko),
gems (premium; 3★/boss/daily), Toko (buy energy/nyawa/bom), Harian (7-day escalating + streak by date),
Turnamen (60s timed run → trofi = score/3, posts to leaderboard), Peringkat (player + 9 seeded bots,
ranked, player highlighted), Profil (name, totals, accuracy, best streak, cleared, mute). Level stars
ALSO persist to the shared save so landing progress is correct.

## 9. Motion / polish (owner: "jangan static, sedikit parallax + line highlight + bonus")
- **Parallax:** ONE cheap rAF loop translates only `.scr.active .bgimg/.map-img` (breathing sine drift +
  pointer/`deviceorientation` depth). CSS transforms only — **NO Canvas2D blur in a frame loop**
  (see LESSON canvas2d-blur-perf). `prefers-reduced-motion` disables it.
- **Highlight line:** glossy `.fighter::before` line + `::after` ground ellipse under each combatant;
  green rim = hero, orange rim = foe; a bright underline on the correct choice.
- **Bonus variety** (`bonusFor(g)`, MATH-only — no non-math minigames): boss (g%10) chest+trofi,
  coin×2 (g%5), gem chance (g%7), streak-fever glow (g%3). Chest pop on 3★/boss.

## 10. Verification gate (before claiming done — M-302 / verify-before-claim)
- `node tools/qa-math-adventure.mjs` — embedded static server + puppeteer at retina dpr, **landscape +
  portrait**: every screen boots, Peta 10 nodes + lock/★, sub 10 nodes, Pilih Skill 5 cards + monster
  preview, gameplay renders Q+4 choices+foe+hearts, forced-op respected, reaches Hasil, **answer SFX
  cue fires**, shop/daily/leaderboard/profil round-trip, **0 console errors, 0 asset 404s**. Must be GREEN.
- Screenshot each screen vs the owner reference; hero/monster sprites clean (no baked checkerboard,
  no mutilation). `node tools/qa-app-sweep.mjs` 16/16. Bump `sw.js` CACHE_VERSION + `?v=` on shared JS.

## 11. Landing integration
`index.html` G25 tile → `location.href='games/kuis-matematika.html'` (external page, A-305 pattern).
The old in-`index.html` G25 screen stays unreached.
