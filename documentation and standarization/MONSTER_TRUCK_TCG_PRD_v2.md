# GARASI TEMPUR — Monster Truck TCG PRD v2.0 (Dunia Emosi edition)

**Working title:** Monster Truck Arena: Garage Clash — *"Garasi Tempur"* in-app (Bahasa Indonesia default)
**Status:** v2.0 draft · 2026-09-27 · supersedes the owner's v1.0 (kept verbatim in `~/Documents/temporary/game asset/monster-truck/PRD-original.md`)
**Where it lives:** Dunia Emosi map → **Kota Balapan**, tile beside *Petualangan Mobil*. Standalone page `games/monster-truck.html` like G27/G28.
**Platform:** the existing offline PWA (vanilla JS, no build, GitHub Pages). **Phone portrait AND landscape are both first-class**; tablet landscape is the showcase.
**Audience:** children 5–10 (Dunia's players are younger than v1's 6–11 → Easy is the default everywhere).

> **What v2 changes.** v1 defined a sound card game. v2 keeps every rule of v1 that fits a 5–10-year-old and adds what v1 left open: (1) how the game reuses Dunia's gym-Pokémon machinery — *Adventure / PvP / Tournament* exactly as the owner asked; (2) a full **micro-interaction, movement and parallax specification** with frame timings; (3) an **attack VFX grammar** mapped onto the effect assets we already own; (4) an **asset licence line** (what may be reused, what may not); (5) the asset list the owner will supply; (6) test gates. Sections marked **[v1]** are unchanged in substance.

---

## 0. THE FIVE-SECOND PITCH

Two kids sit across a table. Each holds a small **fan of cards** in their hand, POV from behind their own hand. They put a **monster truck card** in the middle, **fuel it**, **bolt on parts**, and **attack**. When a truck attacks, the card **lifts off the table, the truck bursts out of its frame** into a parallax arena, jumps, smashes, and the damage number flies onto the other card. A tiny question (`3 + 2 = ?`) makes the jump better. Win by knocking out 2 trucks.

---

## 1. PRODUCT PILLARS [v1 + 2 new]

1. **Literal cards first** — hand, deck, discard, active truck and attachments are always visibly cards.
2. **Readable in seconds** — HP, Type, Fuel and damage recognisable without reading.
3. **Unique trucks** — own silhouette, Type, trait, 2 attacks, signature, animation.
4. **Garage customisation** — Tire + Body + Engine slots.
5. **Education boosts action** — a right answer improves the move; a wrong answer only loses the bonus.
6. **Small numbers** — HP 10–20, damage 1–7.
7. **Independent difficulty** — academic level ≠ AI strength.
8. **Positive failure** — no shame, no "SALAH", no buzzer (same rule as G27/G28).
9. **NEW — Physical, never floaty.** Every card has weight, shadow and inertia; every attack has anticipation → action → impact → settle. Motion always *means* something (PRD G28 §10 rule).
10. **NEW — Same family as Gym Pokémon.** A child who played Gym Pokémon already knows: pick mode → pick team → battle with a question → win a badge. Only the POV is new.

---

## 2. MODES — mirroring Gym Pokémon

The mode card screen is the **same `BattleModes.show()` flow** the gym uses (`games/data/battle-modes.js`), re-skinned:

| Mode | What happens | Reuse |
|---|---|---|
| **Petualangan (Adventure)** | A garage-to-garage ladder of 6 **arenas** (one per Type), 3 opponents each, then an arena **Boss**. Beat an arena → a **Trophy badge** + a new Part card. Same progression shape as the gym's 8 gyms → badges. | gym `TRAINERS`/badge flow shape; `saveLevelProgress(29, arena, stars)` |
| **PvP 1 vs 1 (satu perangkat)** | Pass-and-play on one tablet: **both hands open** (Child Mode) so no hiding is needed; the screen rotates the table 180° on each turn in landscape tablet, or uses split top/bottom in portrait. | `battle-modes` PvP scaffolding (names, colours P1/P2, result screen) |
| **Turnamen** | 4 or 8 players, bracket, same device. | `battle-modes` tournament bracket |
| **Latihan (Tutorial)** | §22 guided match. | new |

Online PvP from v1 is **dropped**: Dunia is an offline PWA with no accounts and no server, and child-to-child online play is a safety scope we don't need.

---

## 3. THE TABLE (POV) — layout for BOTH orientations

### Landscape (tablet / phone on its side) — showcase
```text
┌───────────────────────────────────────────────────────────────────────┐
│ [≡] Opp avatar  ♥♥ KO-tokens   Arena chip "Lumpur: SPEED −1"   [⏸]   │
│      ╲▭╲▭╲▭╱▭╱▭  ← opponent hand (5, face-down in Hidden mode)        │
│ OppDeck▣  [Opp PARTS] [OPP ACTIVE TRUCK CARD] [HP 14]   OppDiscard▣  │
│                ~~~~~~~~ ARENA STRIP (parallax scene) ~~~~~~~~         │
│ MyDeck ▣  [My PARTS]  [MY ACTIVE TRUCK CARD]  [HP 12]   MyDiscard ▣  │
│        ╱▭ ╱▭  ▭  ▭╲ ▭╲   ← MY HAND (fan, 5 cards, bottom 28% of screen)│
│ Fuel ⛽⛽◻  Nitro ▰▰▱   Garage slots ◻◻◻            [SERANG] [SELESAI]│
└───────────────────────────────────────────────────────────────────────┘
```
### Portrait (phone upright) — must be as good, not a squeeze
```text
┌──────────────────────────┐
│ Opp avatar  KO ●●  [⏸]   │
│ ╲▭╲▭╲▭╱▭╱▭ opp hand (mini)│  ← 12% height, cards 40% scale
│ [OPP TRUCK]  HP 14       │
│ ~~~ ARENA (parallax) ~~~ │  ← 26% height: the action happens here
│ [MY TRUCK]   HP 12       │
│ Fuel ⛽⛽◻ Nitro ▰▰▱      │
│  ╱▭ ╱▭  ▭  ▭╲ ▭╲         │  ← my hand fan, 30% height
│ [SERANG]      [SELESAI]  │
└──────────────────────────┘
```
Rules: nothing important under the fan; the fan never covers the active truck's HP; every control ≥ 48 px (primary 56–64 px); both layouts are gated at 360×640, 390×844, 640×360, 844×390, 1024×768, 1280×800 (same matrix as `qa-sd-play`).

---

## 4. CARDS [v1 §4–§9, trimmed for 5–10]

- Card face per v1 §4; **Type = colour + unique symbol + written name** (never colour alone).
- **Types (6):** POWER (red, piston), SPEED (yellow, tachometer), MUD (earth green, mud tyre), STUNT (violet, ramp-star), ARMOR (steel blue, shield), TECH (teal, gear).
- **No 6-way weakness chart.** Each truck card prints its own line: *"Kuat lawan ARMOR: +1"*. The attack preview shows the final sum.
- Categories: Monster Truck · Fuel (one universal can) · Part (Tire / Body / Engine) · Aksi/Kru · Arena.
- Stats: HP 10–20 · attacks 1–5 · signature 4–7 · fuel 0–3 · parts +1–4 HP or +1 dmg.
- **Deck & draw — "ambil kartu dari deck tapi nggak banyak" (owner):**
  - deck **20 cards** (3 trucks · 7 fuel · 6 parts · 4 action);
  - start with **5 in hand**, draw **1 per turn** (never more than 1 by default);
  - hand limit 7: a 7th card is shown, the child picks one to discard;
  - an empty deck never loses the game: the discard pile is reshuffled once, with a visible shuffle.
- **Victory:** KO 2 trucks (tutorial: 1). Typical match 6–10 minutes.

Sample trucks, attacks, Garage slots, Fuel & Nitro, turn loop, authoritative resolver, challenge classes, adaptive learning, AI tiers: **[v1 §7–§17] unchanged**, with Easy default, Bahasa Indonesia first, English optional, and the Islamic pack reusing the vetted G27 Al-Qur'an word list as its seed.

---

## 5. MICRO-INTERACTIONS & MOVEMENT — the spec

Timing tokens (shared with G28, Emil Kowalski rules): `press 80–120 ms` · `quick 160 ms` · `standard 220–280 ms` · `emphasis 350–450 ms` · `action 600–1400 ms` · `celebrate ≤ 1500 ms`.
Curves: `--ease-out: cubic-bezier(.23,1,.32,1)` for everything entering or reacting · `--ease-io: cubic-bezier(.77,0,.175,1)` for travel · springs only for drag release and card settle.
**Only `transform` and `opacity` animate.** No `left/top`, no animated `filter` on moving layers (a blurred moving layer cost G27 50 fps → 6 fps).

### 5.1 The hand (the heart of the POV)
| Moment | Motion | Values |
|---|---|---|
| Idle | fan of 5 on an arc; each card rotated by its position; a **breathing** 1.5 px rise on the whole hand every 3.5 s | rotate ±6–18°, arc radius = 2.4 × card height |
| Draw 1 | card slides from the deck, flips (Y-rotation 180° with a mid-flip darkening), **the fan re-spaces** to make room | 450 ms travel + 220 ms flip, fan re-space 220 ms ease-out |
| Touch down | card rises 18 % of its height, straightens to 0°, scales 1.06, its neighbours lean away 6° | 160 ms ease-out |
| Hold / inspect (long press 350 ms) | card grows to 70 % screen height in the centre, backdrop dims 30 %, rules text becomes readable, narrated if read-aloud is on | 280 ms ease-out |
| Drag | card follows the finger with **velocity tilt** (rotate = horizontal velocity × 0.04°, clamped ±12°) and a **lifted shadow** (offset 14 px, softer); legal targets glow once and **magnetise** within 64 px | per-frame transform; glow 220 ms |
| Drop on a legal target | snap into slot, 1.04 → 1.0 **settle**, a dust puff of the table, a click | spring k=320 d=24, ≤ 260 ms |
| Drop on an illegal spot | glide back to the fan along a curve + a small note *"Bahan bakar dulu, ya!"* — **no shake, no red** | 300 ms ease-io |
| Holo / rarity | a foil **glint band** sweeps once when a rare card is picked up; follows device tilt (gyro) or pointer on desktop via `RZParallax` | 600 ms, once |

### 5.2 Card parallax (the "3-D card" feel)
Every card is 3 layers inside one frame: **background** (sky/arena tint) · **truck art** · **frame + text**. On pick-up and in inspect: layers offset by tilt × depth (bg 0.3, truck 1.0, frame 0) → the truck appears to float inside its card. Source of tilt: device orientation → pointer → gentle auto-drift, exactly the G27 living-layer engine (`games/parallax-engine.js` + `games/g27-scene.js` pattern: no DOM reads inside the frame, clamp to the card bounds, stop when the tab is hidden).
**Asset requirement:** each truck is delivered as a **transparent cut-out** (not baked into a card), so the frame can hold it in 3 layers (§9).

### 5.3 The arena strip (parallax scene)
Layered like `battle-arena.js`: `sky (0.05) · far set (0.15) · stands + crowd (0.35) · ramps & car stack (0.7) · foreground dirt/cones (1.0)`. Idle: slow drift + crowd sway + flag flutter + occasional camera flash (reduced-motion: static). On every attack the whole strip **counter-shifts** against the attack direction (bg 2 %, fg 6 %), which sells depth without a camera.

### 5.4 Attack choreography (frame-accurate)
One attack = **5 beats**, total 1.6–2.4 s, skippable (double-tap = fast-forward ×3):

| Beat | t (ms) | What moves | FX |
|---|---|---|---|
| 1 Anticipation | 0–280 | attacker card lifts 24 px + tilts back 4°, engine **rev** (card jitters 1 px at 30 Hz for 200 ms) | exhaust puff `smoke-puff` at the card's tail |
| 2 Break-out | 280–560 | the **truck art leaves its frame**: scales 1.0 → 1.35 and travels into the arena strip; the empty frame dims | dust `smoke` at the frame edge |
| 3 Action | 560–1300 | Type move (table 5.5): ramp jump arc (ease-io) / charge / slide; arena counter-shifts | Type aura (`VFX.domAura`) + projectile if any |
| 4 Impact | 1300–1500 | hit card **recoils 10 px + 3°**, screen shake **max 6 px for 180 ms** (off in reduced motion), a **hit-stop freeze of 70 ms** before the recoil (makes hits feel heavy) | `boom` + Type burst (`VFX.dom`) |
| 5 Resolve | 1500–2200 | damage chip flies from impact to the HP badge, HP counts down digit by digit, truck art returns into its frame, card settles | number pop ≤ 1.5 s |

**Truth first:** the battle engine commits the result *before* beat 1 (v1 §12/§27); animation only replays it. A backgrounded or skipped animation leaves identical state.

### 5.5 Attack VFX grammar → assets we already own
All effect frames are from `assets/vfx/` via `window.VFX` (`games/vfx-engine.js`); licences recorded in `assets/vfx/CREDITS` (CC0 Ansimuz explosions; CC-BY 4.0 Raphael Hatencia particles — **credit screen required**).

| Type | Movement | Aura (attacker) | Projectile / travel | Impact burst | Arena reaction |
|---|---|---|---|---|---|
| POWER | straight **ram**, low and heavy | `fire-sparks` | `flamethrower` streak for signature | `boom` + `sparks` | car stack crumples 1 frame, shake 6 px |
| SPEED | **dash** with 3 after-image ghosts (opacity .5/.3/.15) | `electric-aura` | `electric-a` bolt | `spark1` | tire skid marks draw on the ground (SVG stroke) |
| MUD | **wheel-spin** then charge | `smoke-cloud` (tinted brown) | mud clods (new sprite, §9) | `smoke-puff` + mud splat decal that fades 2 s | mud splashes the fg layer |
| STUNT | **ramp jump**: arc 40 % of arena height, 1 flip on signature | `holy-light` sparkle trail | star trail `sparks` | `pop` + crowd **cheer** + camera-flash burst | crowd layer jumps 6 px |
| ARMOR | **brace** (squash 0.92) then shove | `gravity` | — | `boom` small + steel **spark shower** `sparks` | target slides back, no bounce |
| TECH | drone/gadget: small **nitro** bursts | `regen` (teal tint) | `rocket-fire` | `electric-a` + gear icons pop | screen glitch 2 frames (off in reduced motion) |
| Nitro / Signature | slow-mo 0.5× for the jump apex (300 ms), letterbox bars 6 % | `rocket-fire` from exhausts | — | double burst | crowd cheer + confetti (only on KO) |
| Heal / Repair | wrench spin | `regen` | — | `holy-light` | — |
| Part install | part card **slides under** the truck, 3 bolt ticks, the part icon **assembles** over the art (scale .6 → 1 in 3 steps) | — | — | `pop` small | — |
| KO | card **cracks** (SVG crack lines), engine **sputters** (3 puffs), card slides to discard, **no destruction/injury** | `smoke-puff` | — | — | crowd "ooh" |

Colour tint on shared frames (e.g. brown mud from `smoke-cloud`) is applied **once, at load**, to a cached copy — never a per-frame CSS filter.

### 5.6 Challenge overlay (the question)
Arena **stays visible and alive** behind a 30 % dim; the attacker keeps revving (card jitter). Question card rises 12 px / 220 ms; answers stagger 40 ms; tap = 0.97 press. **Right:** answer glows green + check, a `+1 BOOST` chip flies to the attack, the rev **peaks** (brief glow) → attack plays with the bonus FX (bigger burst, +1 extra after-image). **Wrong:** answer returns neutral, the right answer is shown softly for 900 ms with its reason, attack continues **without** bonus. Timer off by default. Reuses `games/quiz-engine.js` question generation where it fits (math/pattern), G28 card content for listening/vocabulary.

### 5.7 Reduced motion (setting + OS)
Travel → fade in place · shake → none · slow-mo → none · after-images → none · parallax → static · hand fan idle → static · **every meaning kept** (damage chip still moves to HP as a fade; KO still shows the crack as a still frame). Gate: same "0 running animations, match still completes" test as `qa-sd-motion`.

### 5.8 Performance budget
≥ 45 fps on the owner's tablet at idle, ≥ 30 fps during an attack at 4× CPU throttle in headless Chrome (G27/G28 gate: ≥ 20 fps floor), main-thread work < 4 ms/frame at idle, ≤ 8 DOM VFX elements alive at once, all frames preloaded before the match (`VFX.preload`).

---

## 6. AUDIO & HAPTICS
- **Do NOT reuse `Sounds/Attack/*` or `Sounds/pokemon sounds/*`** — they are Pokémon Sun/Moon rips (its own README says "for private testing"), and v1's IP note forbids Pokémon assets. Same for the gym BGM.
- Reuse: `assets/sfx/*` cues (click, coin, whoosh, swoosh, crash, star, levelup — **provenance to be confirmed before shipping**), `SFXEngine` synth tones as fallback.
- New sound set needed (CC0 sources such as Kenney / Sonniss GDC bundles, or recorded): engine idle loop, rev, skid, mud splat, crowd cheer/ooh, bolt ratchet, card snap, card flip, shuffle, nitro whoosh, impact ×3 weights.
- Narration: G28 pipeline (Indonesian MMS-TTS, ASR-verified) for card names, questions and tutorial lines.
- Haptics: `navigator.vibrate` 10 ms on snap, 20 ms on right answer, 30–15–30 on impact; parent toggle.

---

## 7. REUSE MAP (Dunia engines → this game)

| Need | Reuse | Notes |
|---|---|---|
| Modes, PvP, tournament | `games/data/battle-modes.js` | re-skin; its PvP already handles names/colours |
| Effects | `games/vfx-engine.js` + `assets/vfx/*` | TYPE_FX map extended with the 6 truck Types |
| Parallax / tilt | `games/parallax-engine.js`, G27 `g27-scene.js` pattern | card + arena |
| Easing / springs | `games/motion.js` (`damp`, `squash`, `reduced`) | |
| Questions | `games/quiz-engine.js`, `data/math-rules.js`, G28 card content | Easy default |
| Save per child | `data/save-engine.js` (`avatarScopedGet/Set`) | |
| Icons, fuel can, stars, trophies | named library `AssetIndex` (`game/*`, `things/*`) | cartoon only |
| Mode/scene layering, camera punch-in | `games/battle-arena.js` patterns | code patterns, not its Pokémon art |
| Offline | G27/G28 idle warm-up + `sw.js` shell | |

---

## 8. ACCESSIBILITY, SAFETY, PRIVACY [v1 §32–§34, adjusted]
All of v1, plus: parent gate = G28's (hold 3 s or tap shapes in order); no online play, no accounts, no ads, no purchases in this build; reading mode (auto / tap / parent reads / self) shared with G28.

---

## 9. ASSETS THE OWNER WILL SUPPLY (checklist)

Delivered as sheets like G27/G28 (white background, generous gaps between items, **no labels touching art**); every cropped element goes into the shared DB (`assets/db/lib/mt/…`), WebP q95, white sticker outline where it is a cut-out.

1. **18 trucks** (3 per Type) — each as a **side view cut-out** facing right, same scale, plus (nice-to-have) the **wheels on a separate layer** so they can spin and the body can bounce on suspension.
2. **Card frames** — 6 Type frames (colour + symbol + pattern), 1 Part frame, 1 Action frame, 1 Fuel card, **card back**, rarity foil overlay (★, ★★, ★★★).
3. **6 arenas** (Lumpur, Tumpukan Mobil, Ramp Raksasa, Debu, Stadion Malam, Lapangan Rongsok) as **separate layers**: sky / far / stands+crowd / ramps / foreground — landscape and portrait crops.
4. **Parts** 24 icons (Tire ×8, Body ×8, Engine ×8) + **Action/Crew** 12 icons.
5. **Type symbols** ×6, **status chips** (boost, nitro, shield, mud, burn), **HP badge**, **fuel can**, **nitro bar**, **KO token**, **trophy badges** ×6 + boss trophy.
6. **Table surface** (wood/garage mat) + card shadow + deck/discard piles.
7. **FX not yet in the library:** mud clod, tire-skid decal, crack overlay (3 stages), crowd camera flash, confetti (reuse `conf` pack if it fits).
8. **Mascots/opponents:** 6 arena rivals + 6 bosses (friendly, cartoon drivers — not scary).
9. **UI kit:** buttons (SERANG, SELESAI, AMBIL), mode cards (Petualangan / PvP / Turnamen / Latihan), result screens.

---

## 10. MVP (Phase 1) — realistic for this codebase

| Area | Phase 1 | Later |
|---|---|---|
| Trucks | 12 (2 per Type) | 18+ |
| Parts / Actions | 12 / 6 | 24 / 12 |
| Arenas | 3 (Lumpur, Ramp Raksasa, Stadion Malam) | 6 |
| Modes | Latihan, Petualangan (3 arenas), PvP 1v1 | Turnamen, Garage deck-builder |
| Questions | Easy: math ≤ 20, patterns, G28-style vocabulary | Medium, adaptive per skill |
| AI | Rookie, Racer | Champion |
| Deck | preset starter decks (3) + Auto Build | full deck builder |

---

## 11. ACCEPTANCE GATES (automated, same style as G27/G28)
1. `mt-validate-cards` — every card: Type symbol+name, HP/dmg/fuel in range, attacks resolve through the engine only, sprite files exist, cartoon/safe.
2. `qa-mt-rules` — **500 seeded headless battles** AI vs AI: no soft-lock, deterministic from seed, every v1 §28 edge case scripted (empty deck, hand limit, simultaneous KO, double-tap, repeated End Turn, zero damage, heal over max, part replaced mid-effect, app backgrounded mid-attack → identical state).
3. `qa-mt-play` — real touch drag at 6 viewports: draw, drag Fuel/Part to legal target (snaps), illegal drop returns + explains, attack preview sum shown, right/wrong challenge paths, KO, win screen; controls ≥ 48 px, nothing off-screen, hand never covers HP.
4. `qa-mt-motion` — fps floors (§5.8), hit-stop and shake bounded, reduced motion leaves 0 running animations and the match completes.
5. `qa-mt-offline` — full match offline after one online visit (Range-honouring server killed).
6. `qa-app-sweep` picks the page up automatically; `qa-asset-index` confirms no Pokémon asset and no `Sounds/Attack` reference in the game's files.

---

## 12. FIRST PLAY [v1 §39, adjusted]
Splash (engine rev, logo slam with dust) → pick a starter truck (POWER / SPEED / MUD, each **revs** when tapped) → 20-second garage preview (bolt on a tyre) → tutorial match with 5 open cards → attach Fuel → first attack triggers `3 + 2 = ?` → right answer → Nitro jump in slow-mo → opponent installs a Part (teaches customisation) → child installs a Bumper → signature available → first KO → new Part card flies into the collection → "Coba part barumu!" → Garage.

---

## 13. OWNER DECISIONS (2026-09-27: "ok setuju semua saran, nama Garasi Tempur")
1. **Name: Garasi Tempur.** Page `games/garasi-tempur.html`, tile in Kota Balapan beside Petualangan Mobil.
2. **Open hands** by default (Hidden Hand as an option later).
3. **Phase 1 = §10**: 12 trucks (2 per Type), 3 arenas, Latihan + Petualangan + PvP.
4. **Sounds: CC0 sources** (Kenney / similar), licence recorded per file. The same CC0 set will later replace Gym Pokémon's `Sounds/Attack/*` Pokémon rips.
5. **Original trucks** (look-alike colours/silhouettes, own names, no Monster Jam logos); **no coins/gems/shop/daily reward**; Bahasa Indonesia; "Berhenti" in the pause menu (§14).

---

## 14. UI/UX REFERENCE — owner mockups (2026-09-27)

Archived: `~/Documents/temporary/game asset/monster-truck/ui-1-battle-table.png`, `ui-2-math-challenge.png`, `ui-3-home.png`. They confirm the portrait POV table of §3 and set the visual style.

**Kept exactly (matches the plan):**
- Portrait table: opponent profile + 5 face-down cards top, **opponent truck card centre-top**, arena "MONSTER TRUCK" mat with 2 empty slots each side (Part/bench slots, "+" = legal drop), **my truck centre-bottom**, my hand of 5 at the bottom, DECK / DISCARD / FUEL bar (3/4) / big green END TURN.
- Truck card: Type icon, name, HP top-right, art, two attacks with damage on the right, Type-coloured frame.
- **Arena card** on the left edge ("Car Stack Arena — Crush attacks deal +2 damage") = §19 arena rule shown as icon + one sentence.
- **Phase checklist** (Draw / Garage / Action / End) on the right — the turn loop taught by highlighting, not text.
- Math challenge **over the table, arena still visible**, 4 big coloured answers, a side panel "If correct: +2 · If wrong: normal damage" — exactly §5.6 (right answer adds bonus, wrong loses only the bonus).
- Home: 6 big mode tiles; Quick Battle / Local PvP / Championship / Garage / My Cards / Learn Mode map to §2 (Latihan, PvP, Petualangan, Garasi, Koleksi, Belajar).

**Adjusted, with reasons:**
| Mockup | Build | Why |
|---|---|---|
| Real trucks & logos: *Grave Digger, El Toro Loco, Max-D, Megalodon*, "MONSTER JAM" banners | **Original look-alike trucks** with our own names (e.g. *Kuburan Hijau*, *Banteng Api*, *Duri Emas*, *Hiu Biru*), no Monster Jam logo | These are registered trademarks of Feld Motor Sports; Dunia is a **public repo on a public site**. v1 PRD's own IP note says the same. Same colours/silhouettes are fine, names/logos are not. |
| Coins 1,250 / gems 50 / "+" buy, SHOP tab, DAILY REWARD, "Starter Pack — VIEW", Missions badge "!" | **Removed.** Rewards = Part cards, stickers, trophies earned by playing | §34 + Dunia rule: no purchases, no pressure loops for children; a red "!" and daily-login rewards are engagement pressure. |
| "Math Challenge" as a card in the hand | Kept as an **Action card** that arms +2 on the next attack | fits §6 Action/Crew; the question appears when the attack is confirmed |
| Trophy score 320 vs 280 | Kept as a friendly **level/trophy** count, never a leaderboard | §33/§35: no public ranking of children |
| "SURRENDER" | "**Berhenti**" in the pause menu, not on the table | a child should not be one tap from quitting mid-attack |
| English labels | Bahasa Indonesia default ("Giliranmu!", "SELESAI", "Bahan Bakar"), English optional | Dunia's language |
| Turn 3/20 ring | Kept only in Petualangan; PvP has no turn limit | |
| Landscape | same components re-flowed per §3 | owner requires both orientations |

**Asset note for the next delivery:** trucks as separate cut-outs (right-facing, wheels ideally on a separate layer), card frames empty (no baked text — text is rendered live so it can be translated and read aloud), arena backdrop in layers (§9).

---

## 15. OWNER ADDITIONS (2026-09-27)

**Arenas:** used AS SUPPLIED — owner: "jangan ditutup biarkan aja … sudah dapat izin dan ini utk keperluan testing", "jangan di blur". 9 arenas × landscape/portrait in `assets/db/lib/gt-arena/` (ESRGAN ×4 → 2000 px).

**MONSTER RUSH — bonus round before the final score (owner idea).**
Near the end of a match — after the deciding KO, before the final score screen — a **monster** bursts into the middle of the table (roar, screen shake, dust). For **15 seconds** BOTH players answer questions as fast as they can, each on their own half of the screen (PvP) or the child vs the AI's simulated pace (Adventure). Every right answer is a hit on the monster (damage number flies at it, the monster flinches); a wrong answer just moves to the next question — no penalty. When time runs out the monster flees or falls, and each player gets **bonus points = right answers × 10** added to the final score. Then the final score is shown.
- Timer ring 15 → 0, big and friendly (no red flashing).
- Questions: the Easy pool (math ≤ 20, patterns, vocabulary), 2 big answer buttons per player side so both kids can tap at once without blocking each other (multi-touch: each side listens to its own pointer).
- Monster pool: 33 monsters from the owner's sheets (`assets/db/lib/gt-monster/`), picked by arena theme (lava → magma golem, ice → yeti, sea → pirate octopus, …).
- Final score = KO win points + damage dealt + Monster Rush bonus; the win is still decided by KOs (the bonus ranks, it doesn't overturn the winner) — so a child who lost the duel still earns a proud number.
- Reduced motion: no shake; the monster fades in/out.
- Gate: a scripted Rush with fixed answers gives the exact bonus; two simultaneous pointers on the two halves both register.
