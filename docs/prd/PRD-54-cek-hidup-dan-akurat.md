# PRD-54 — Cek Kemampuan v3: Perkiraan IQ lebih akurat + hidup (motion, shader, efek)

Owner, 2026-11-21: "Lakukan penyempurnaan, animasi, shader, effect motion banyak yg kurang. Dan IQ calculation improve
agar akurat lebih akurat." Plan approved in plan mode the same day. Two releases: **Q** (accuracy, v64.78) first, then
**M** (motion, v64.79).

## Q — what was wrong with the v2.1 estimate (PRD-53)
| # | Fault | Fix (v64.78) | Where |
|---|---|---|---|
| 1 | `IQ = 100 + 15 x mean z`. The mean of correlated scores has SD < 1, so every child was pulled toward 100 (simulated SD 10.1 instead of 15). | Standardised composite `zc = sum z / sqrt(k + k(k-1) R)`, R = .45 (Tellegen & Briggs 1967) | `cek-profile.js composite()` |
| 2 | Fixed range of +-15, whatever the number of islands (simulated coverage 100 %: it claimed more doubt than there is, and never shrank) | Reliability of the composite (Mosier 1943) -> Kelley true score `100 + 15 rc zc` and a 90 % range `+-1.645 x 15 sqrt(rc (1 - rc))`; card says "kisaran a-b (90 %, dari n pulau)" | `composite()`, `cek-ui.js` |
| 3 | Ladder islands scored by a raw count | Rasch (Warm WLE) from the answer pattern; the band in right answers becomes logits through the test curve; reliability from test information | `cek-irt.js`, `cek-profile.js ladder()` |
| 4 | Span scored by the longest length: one try = a whole length (about 20 IQ points) | Both tries at every length (WISC / WMTB-C), partial-credit score `(start - 1) + right / 2` (Conway et al. 2005) | `cek-core.js spanAnswer`, `cek-play.js` |
| 5 | Multi-part islands averaged their parts (same shrink as #1) | Part composite with RHO_PART .5 | `z()` |
| 6 | Age read from the nearest band | Linear between band centres (78 -> 90 months) | `cek-targets.js get()` |
| 7 | Dots scored as "hardest ratio with 2 of 2 right": under the grade-1 Weber fraction (w .35, SD .14) the 25th and 75th percentile child differ by 0.4 level, mostly guessing noise | Right answers of the 8 trials (`titik`), band 5.2-7.0 from the Halberda model at w .35; old records still read through `angka-banyak` | `cek-play.js`, `angka-titik` |
| 8 | Board kept the highest estimate ever seen: the maximum of noisy estimates is biased upward | Board shows the estimate of the counted set as it stands | `cek-page.js` |
| 9 | Retest only replaced the old sitting | A redo 7+ days later averages both sittings, minus a practice gain of .2 SD (WISC-IV subtests .13-.48, Williams, Weiss & Rolfhus 2003 Table 2); reliability by Spearman-Brown | `island()` |

### Sources read for R0 (2026-11-21)
| Measure | Number | Source | Used |
|---|---|---|---|
| Raven CPM, Indonesia | 6.5 y P25/50/75 14.25/18.5/22.75; 7.5 y 18/23/27 (of 36) | Gusniarti et al. 2021 JP3I 10(2):172, Table 7 (n = 1779) | Pola band, scaled x 2/3: 9.5-15 and 12-18 |
| Number line 0-100 | grade 1 PAE 12 % (n = 25, 6.8 y) | Booth & Siegler 2006 Dev Psychol 42:189, p. 191 | band unchanged (10-18) |
| ANS Weber fraction | grade 1 w M .35 SD .14 (n = 67, 87 months) | Lonnemann et al. 2013 Front Psychol 4:783, Table 1 | `angka-titik` band by the model |
| WMTB-C Digit / Backward / Block Recall | 6-7 y M 25.58 / 10.92 / 22.77 lists correct | Gathercole et al. 2004 Dev Psychol 40:177, Table 2 | notes only (lists, not span lengths) |
| NIH Pattern Comparison | number correct in 90 s: 6 y 40.5 (7.9), 7 y 43.2 (7.4) | Carlozzi et al. 2015 Arch Clin Neuropsychol 30:359, Table 3 | note only (different pairs) |
| WISC-IV retest | subtest d .13-.48, Digit Span .18 | Williams, Weiss & Rolfhus 2003 Tech Report 2, Table 2 | PRACTICE_Z .2 |
| Not found (paywalled) | Corsi norms (Farrell Pagulayan 2006), WISC-V subtest correlations, Halberda & Feigenson 2008 table | | R stays a stated design value |

### Laws Q (red first)
- **Q1** six islands at z = 1, R = .45 -> 120 (the old formula gave 115); Kelley pulls toward 100 by rc. `tools/test-cek-items.mjs`.
- **Q2** `tools/sim-cek-iq.mjs`: simulated children through the real ladder and span rules. New: composite SD 15.1, bias 0.05,
  r .957, 90 % range covers 90.3 % (2000 x 24). Old (QA_OLD): SD 10.1, coverage 100 % -> both red.
- **Q3** one more right answer always raises the Rasch estimate (2000 seeds); WLE finite at 0 and all right; span partial credit.
- **Q4** targets equal the band at its centre month and lie strictly between in between.
- **Q5** every target has kind, source, unit; a published one quotes its number.
- **Q6** card range = computed range; 3 islands wider than 6 (`qa-prd53-cek.mjs`).

What the simulation proves: the arithmetic is unbiased and its range is honest **if** the target bands are right.
It does not prove the bands; most stay "design" and the card keeps "Perkiraan dari permainan, bukan tes resmi psikolog."

## M — motion, shader, effects (v64.79)
Reuse only. New code lives in two files; nothing in the shared engines changed.

| What | How | Where |
|---|---|---|
| Living sea | canvas2D at 0.6 x resolution, <= 30 fps: sky, sun glow, 5 swaying light shafts, 3 parallax wave bands, 26 twinkling glints, 2 drifting clouds, a tide band that rises with answers given; `DuniaGLFX.attach` adds bloom, warm grade, haze | `games/data/cek-sea.js` |
| Screens | one 280 ms slide + fade; back slides from the left; a new screen cancels the old animation | `cek-motion.js screen()`, `cek-page.js show()` |
| Map | islands rise one after another (60 ms apart, 420 ms, overshoot), stars pop, route fades in; next island has a pulsing ring; the owl tilts; a tapped island pulls the map toward it (380 ms) before the intro | `mapIn()`, `zoomTo()`, CSS `ring`, `owl-tilt` |
| Items | card rises 220 ms, choices follow 40 ms apart, only for Pola, Bentuk, Kata, number line and stories | `stage()` + a MutationObserver on `#stage` |
| Island end | stars land one at a time with a star sound; the sea blooms (GL spike); celebrate as before | `stars()`, `CekSea.flash()` |
| IQ reveal | curtain lifts -> trophy drops (+ puff) -> ring gauge fills while the number counts -> range -> bars grow one by one (scaleX) -> celebrate + bloom | `cek-ui.js iqCard()`, `reveal()` |
| Board | rows slide in 50 ms apart; own row shimmers; medals glint | `rows()`, CSS `shine`, `glint` |

**Rule added (accuracy beats flair):** no motion on an item whose showing time is part of the measure: Ingat
sequences, Cepat pairs and the dots (covered after 1.5 s) appear exactly as before. Nothing reacts to right or wrong
on a scored item; the tide rises with answers given.

Reduced motion (OS or `du-reduced-motion=1`), `?nocine=1` or DuniaCinema quality 0: one still sea frame, no GL,
screens fade only, no bounces, no shimmer.

### Laws M (`tools/qa-prd53-cek.mjs`)
- **M1** the sea canvas changes > 1 % of its pixels in 500 ms; GL present when WebGL is; reduced motion: identical frames, no GL.
- **M2** a double tap on an island leaves exactly one screen; the back slide is one animation <= 320 ms on transform/opacity.
- **M3** island end: stars land, sea bloom spikes, item cards animated; IQ reveal steps fire in order.
- **M4** frame budget, measured locally (headless timing is not a CI gate), 390x844 @2x, 5 s of rAF on the map:
  | variant | median | p95 | long tasks > 50 ms |
  |---|---|---|---|
  | 2D sea only (`?nogl=1`) | 16.7 ms | 16.7 ms | 0 |
  | sea + software GL (headless SwiftShader), before the budget check | 16.7 ms | 33-50 ms | 0-19 |
  | default with the budget check (GL dropped itself) | 16.7 ms | 33.4 ms | 0-2 |
  | `?nocine=1` | 16.7 ms | 16.7 ms | 0 |
  The GL layer is the costly part, so `CekSea` measures the first ~90 frames and drops GL when the median gap is over
  22 ms or 4+ gaps exceed 50 ms; the 2D sea stays. On a phone or tablet with a real GPU the bloom stays on.
- **M5** screenshots of every screen at 390x844, 1280x800, 800x1280; button size read from layout (a press squash is a
  transform for 120 ms, not the target size).

> **Lanjutan (PRD-56, v64.90):** Perkiraan IQ sekarang memperkirakan skor umum laten G (bukan Kelley per bentuk), Kata dan soal cerita tidak dihitung ke IQ, ada mode Cepat dan pilihan pemain di dalam halaman. Lihat [PRD-56](PRD-56-cek-mode-cepat.md).
