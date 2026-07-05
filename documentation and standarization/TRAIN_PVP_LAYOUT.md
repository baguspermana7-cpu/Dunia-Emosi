# TRAIN_PVP_LAYOUT.md — canonical layout for the Balapan Kereta 2-player PvP/Tournament

> Authoritative contract for the train PvP/Tournament screen (`#g14vs` in `games/balapan-kereta.html`).
> Created 2026-07-05 after the PvP was built TWICE with the wrong layout (stacked bands + quiz). Any
> future PvP work MUST conform to this. Owner reference image: the shared-scene racing HUD (dd990b89).
> See LESSONS-LEARNED L239.

## Non-negotiable layout (LANDSCAPE-first)

```
┌────────────────────────────────────────────────────────────────────────┐
│ [P2 HUD]        ┌──────── 🏁 PVP MODE ────────┐            [P1 HUD]      │
│ avatar·name     │   {dynamic level name}       │       avatar·name       │
│ SPEED km/h      │   First to the finish line!  │       SPEED km/h        │
│ ❤❤❤ · progress  └──────────────────────────────┘   progress · ❤❤❤        │
│┌──┐                                                              ┌──┐    │
││▲ │            ══════ ONE SHARED RACING SCENE ══════            │▲ │    │
││NA│   selected level's real backdrop plate + parallax           │NA│    │
││IK│   both trains on parallel rails (P2 blue, P1 green)          │IK│    │
││▼ │   tokens ⚡/coin + hazards 🚧/🪨 scroll per lane              │▼ │    │
││TU│                                                              │TU│    │
│└RUN┘                                                            └RUN┘    │
│  P2 ENERGY ▓▓▓░ · TOKEN 1250        ( BOOST )      TOKEN 1340 · ENERGY   │
│  (blue, LEFT)                     bottom-center      (green, RIGHT)       │
└────────────────────────────────────────────────────────────────────────┘
   P2 = LEFT, BLUE                                        P1 = RIGHT, GREEN
```

- **ONE shared racing scene** — both trains visible on parallel rails over the SELECTED LEVEL's real
  painterly backdrop (`assets/train/backdrop/level{NN}-1600.webp`, lanes from `laneRatios.lanes`).
  The race standing is shown by the two progress bars, not by screen-x.
- **Player 2 = LEFT, BLUE.** HUD top-left; NAIK/TURUN controls on the FAR-LEFT edge; energy+token bottom-left.
- **Player 1 = RIGHT, GREEN.** HUD top-right; NAIK/TURUN on the FAR-RIGHT edge; token+energy bottom-right.
- **Top-center:** "🏁 PVP MODE" + DYNAMIC level name (from `window.TRAIN_JOURNEY` leg for `cfg.level`) +
  "First to the finish line!". Never hardcode a route.
- **Per-player top HUD:** avatar/emoji · name · SPEED km/h · hearts (❤×hp) · progress bar.
- **Bottom-center:** round glossy BOOST button ("BOOST READY!"). Same-device 2P → each player also has
  their own boost trigger on their side.
- **Train identity outline:** P1 green / P2 blue neon.

## Mechanic (NO math quiz — pure racing)
- NAIK/TURUN move a player's train between lanes to GRAB tokens (⚡/coin, tinted to the player) and DODGE
  hazards (🚧/🪨). Token → +ENERGY (+TOKEN count). Energy ≥ threshold → BOOST READY → BOOST spends energy
  for a ~1.5s speed surge. Hazard hit → brief slow. Both trains auto-creep. First to 100% wins.
- Tournament = single-elimination bracket of these races (2–4 players).

## STRICT AVOID (each = a wrong build)
1. NO two stacked top/bottom horizontal player bands.
2. NO controls at bottom-center (controls hug the LEFT/RIGHT edges).
3. NO math quiz / question panel anywhere in PvP/Tournament.
4. NO hardcoded route/city (Cikarang/Karawang etc) — level name is dynamic.
5. Trains must not be tiny; no large empty dead space.

## Verify before shipping (M-302)
Screenshot the built PvP in landscape (1024×600, 900×500) + portrait and confirm EACH element above is
present in the correct position (side-by-side vs the reference), plus: no `.qz-pill`/quiz host, token→
energy→boost works, first-to-finish banner, `qa-g14-railalign` 0px (Adventure untouched), `qa-app-sweep`
16/16, 0 console errors.

## Reuse (do not rebuild)
Mode modal (`showModeModal`), `askNames`, tournament bracket, `showResult`, `visFromTrain`/`trainNode`
sprite resolution, `CLAY`/`styleVars`, the frame-rate-independent distance integrator, backdrop plate +
`laneRatios`, `TRAIN_JOURNEY`. Adventure code path + `data/g14-journey/*.json` are NEVER touched.
