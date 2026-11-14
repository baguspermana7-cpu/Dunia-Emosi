# Systems Index: Dunia Emosi

> **Source**: reverse-documented from the code at v64.51 (2026-11-14).
> **Status column**: CCGS allows only `Not Started / In Progress / In Review / Designed / Approved / Needs Revision`.
> Here **Approved** means *shipped live and held by a gate* (the gate is named in the row); **Designed** means a
> PRD exists but code is not started; **In Progress** means partly shipped. Design docs for shipped systems are
> the PRDs in `docs/prd/` (each has a "Hasil" section with the measured result) until a CCGS GDD is written.

## Overview

One hub (`index.html` + `game.js`) launches 15 in-page games (`screen-game3..25`) and 25 standalone pages in
`games/`. Shared behaviour lives in `games/data/*.js` (92 modules). Every system below is a shared module or a
cross-game behaviour; individual games are content built on them (see the Game Families table).

## Systems Enumeration

| # | System Name | Category | Priority | Status | Design Doc | Depends On |
|---|-------------|----------|----------|--------|------------|------------|
| 1 | Save engine + child profiles (`save-engine.js`, `DuniaProfile`) | Persistence | MVP | Approved | docs/prd/PRD-19a, PRD-18 | — |
| 2 | Event bus (`dunia-bus.js`, `DuniaBus`) | Core | MVP | Approved | docs/prd/PRD-08b | — |
| 3 | Learning log (`learning-log.js`) | Progression | MVP | Approved | docs/prd/PRD-08b | Event bus, Save engine |
| 4 | Mastery model (`mastery.js`, `DuniaMastery`) | Progression | MVP | Approved | docs/prd/PRD-10, PRD-19b | Learning log |
| 5 | Review queue (`review-queue.js`, `DuniaReview`) | Progression | Vertical Slice | Approved | docs/prd/PRD-11 | Event bus, Save engine |
| 6 | Error-kind hints (`error-kinds.js`) | Gameplay | Vertical Slice | Approved | docs/prd/PRD-13 | Maths question engine |
| 7 | Maths question engine (`math-rules.js`, `soal-engine.js`, `soal-gen-matematika.js`) | Gameplay | MVP | Approved | documentation and standarization/MATH-DIFFICULTY-STANDARD.md | Mastery model |
| 8 | Calm moments (`breathe.js`, `feeling-checkin.js`) | Meta | Vertical Slice | Approved | docs/prd/PRD-17b | Learning log, Mastery model |
| 9 | Freeze watchdog + recovery card (`freeze-watchdog.js`) | Core | MVP | Approved | PRODUCT.md §Prinsip 1 | — |
| 10 | Offline / service worker (`sw.js`, `games/sw-reload.js`) | Core | MVP | Approved | PRODUCT.md §Prinsip 4 | — |
| 11 | Cinema layer (`games/dunia-cinema.js`, `dunia-cinema-pixi.js`) | UI | Alpha | Approved | gate `tools/qa-dunia-cinema.mjs` | — |
| 12 | Sprite resolver + emoji map (`emoji-map.js`, `ui-sprites.js`, `db-sprites.js`) | UI | MVP | Approved | DESIGN.md §Ikon dan sprite | — |
| 13 | Settings per child (sound, vibration, maths level) | Persistence | Vertical Slice | Approved | docs/prd/PRD-18 | Save engine |
| 14 | Reward catalogue (`reward-catalog.js`) | Progression | Alpha | In Progress | docs/prd/PRD-22 | Save engine, Event bus |
| 15 | Next-play card on hub | UI | Alpha | In Progress | docs/prd/PRD-20 | Mastery model, Learning log |
| 16 | Voice narration (`narrate.js`, clip map) | Audio | Alpha | Designed | docs/prd/PRD-14 | Settings per child |
| 17 | Session rhythm (parent limit) | Meta | Full Vision | Designed | docs/prd/PRD-21 | Event bus, Learning log |
| 18 | Offline-ready badge per game | UI | Full Vision | Designed | docs/prd/PRD-23 | Offline / service worker |
| 19 | Name-the-feeling in stories | Narrative | Full Vision | Designed | docs/prd/PRD-16C | Event bus |
| 20 | Local telemetry + device health | Meta | Full Vision | Designed | docs/prd/PRD-07 | Event bus |
| 21 | Shared game shell (home/pause/sound) | UI | Full Vision | Designed | docs/prd/PRD-29 | Settings per child |
| 22 | Cloud sync (`cloud-sync.js`) | Persistence | Full Vision | Needs Revision | — (dormant: no config on any page) | Save engine |

### Game families (content on the systems above)

| Family | Pages | Systems used |
|---|---|---|
| Trains (Kereta) | `selamatkan-kereta`, `balapan-kereta(-side)`, `lokomotif-pemberani`, `kereta-maze`, `museum-kereta` | 1, 9, 10, 11, 12 |
| Timmy boat | `timmy-kapal` (+ `tk-*.js`) | 1–4, 7, 9–13 |
| Mojo Swoptops | `mojo-swoptops`, `mojo-chase-embed` | 1–7, 9–13 |
| Maths / letters | `kuis-matematika`, `ayo-berhitung`, `ejaan-inggris`, in-hub games | 1–8, 12, 13 |
| Pokemon | `gym-pokemon`, `pokemon-run`, `pokemon-birds`, `pokemon-bawah-laut`, `mario-pokemon` | 1, 9, 10, 12 |
| Vehicles / other | `mobil`, `garasi-tempur`, `monster-candy`, `stinky-dirty`, `ducky-volley`, `blippi`, film hub | 1, 9, 10, 12 |

## Categories
Standard CCGS categories (Core, Gameplay, Progression, Economy, Persistence, UI, Audio, Narrative, Meta).
No Economy system: the game has no currency beyond stars.

## Priority Tiers
Standard CCGS tiers. MVP and Vertical Slice are shipped.

## Dependency Map

### Foundation Layer (no dependencies)
Save engine, Event bus, Freeze watchdog, Offline / service worker, Sprite resolver, Cinema layer.

### Core Layer (depends on foundation)
Learning log, Settings per child, Reward catalogue, Cloud sync.

### Feature Layer (depends on core)
Mastery model, Review queue, Maths question engine, Error-kind hints, Calm moments.

### Presentation Layer (depends on features)
Next-play card, Voice narration, Offline-ready badge, Shared game shell.

### Polish Layer (depends on everything)
Session rhythm, Local telemetry, Name-the-feeling.

## Recommended Design Order

| Order | System | Priority | Layer | Agent(s) | Est. Effort |
|-------|--------|----------|-------|----------|-------------|
| 1 | Next-play card (PRD-20) | Alpha | Presentation | game-designer, ux-designer | M |
| 2 | Voice narration (PRD-14) | Alpha | Presentation | audio-director, sound-designer | L |
| 3 | Session rhythm (PRD-21) | Full Vision | Polish | game-designer | M |
| 4 | Offline-ready badge (PRD-23) | Full Vision | Presentation | web-specialist | M |
| 5 | Reward catalogue as one book (PRD-22) | Alpha | Core | game-designer | L |
| 6 | Name-the-feeling (PRD-16C) | Full Vision | Polish | narrative-director | M |
| 7 | Local telemetry (PRD-07) | Full Vision | Polish | performance-analyst | M |
| 8 | Shared game shell (PRD-29) | Full Vision | Presentation | lead-programmer | XL |

## Circular Dependencies
None found. Mastery reads Learning log; Calm moments write a soften flag that Mastery reads — one direction.

## High-Risk Systems

| System | Risk Type | Risk Description | Mitigation |
|---|---|---|---|
| Save engine | Data loss | Every game writes per-child keys; a migration bug overwrites a sibling's progress | One-time flags + `qa-save-persistence`, `qa-profile-settings`, `qa-ayo-per-child` |
| Offline / service worker | Stale code | A missed cache token runs old code offline | `tools/normalize-cache-tokens.mjs` + `ci-verify.sh` token check |
| Hub (`game.js`, 14,960 lines) | Maintainability | One file holds hub, 15 games, dashboard, settings | Tech-debt register item; split per ADR before new hub features |
| Shared game shell | Scope | Touches every game | Adopt one game per release (PRD-29) |
