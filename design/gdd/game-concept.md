# Game Concept: Dunia Emosi

> **Status**: Implemented
> **Source**: reverse-documented from the shipped game (v64.51, 2026-11-14) and from `PRODUCT.md` / `DESIGN.md`.
> This file does not replace them: `PRODUCT.md` stays the authority for user, goal, principles and tone;
> `DESIGN.md` for colour, type, touch targets, motion and the ban list. This file maps them onto the
> Claude Code Game Studios (CCGS) structure so studio skills (`/gate-check`, `/create-stories`,
> `/architecture-review`) can read the project.

## Elevator Pitch

A Bahasa Indonesia learning-and-play hub for one child of about five who cannot read yet: an installed
PWA on a landscape Android tablet, mostly offline, with ~40 short games (trains, boats, Pokemon,
maths, spelling, feelings) that the child can open, choose and finish alone, again and again.

## Core Identity

| Field | Value |
|---|---|
| Genre | Educational mini-game collection (hub + games) |
| Platform | PWA, Android tablet, landscape; also works on phone and desktop |
| Player | One child ~5 years old, Indonesian, pre-reader; siblings share the device (multi-avatar) |
| Session | 5–20 minutes, one game at a time |
| Language | Bahasa Indonesia (spoken prompts `id-ID`) |
| Engine | Web: vanilla ES5/ES2015 JS, Canvas 2D + WebGL (PixiJS 8.18.1), zero-build, service-worker offline |

## Core Fantasy

"I can do it myself": the child picks a favourite world (Thomas-style trains, a boat called Timmy,
Pokemon, monster trucks), plays, and is told by pictures and voice how it went — no adult needed.

## Unique Hook

Every game feeds one learning record per child (`DuniaBus` + `LearningLog`): a missed sum in the maths
quiz comes back days later inside a different game (`DuniaReview`), the difficulty follows the child
across games (`DuniaMastery`), and a calm-down moment after three misses makes the next question easier.

## Player Experience Analysis (MDA Framework)

### Target Aesthetics (What the player FEELS)
- Competence ("I solved it"), Fantasy (favourite characters), Sensation (sound, cinema layer), calm.

### Key Dynamics
- Repeat-play of favourites; trying a harder level after a win; switching games on a whim.

### Core Mechanics
- Tap-to-answer quizzes (counting, add/subtract, letters, English words), lane/steer driving, mazes,
  match/collect, races, simple battles. All targets ≥48 px; no text needed to play.

## Player Motivation Profile

### Primary Psychological Needs Served
- Autonomy (choose any game), Competence (adaptive difficulty, fair levels), Relatedness (sibling profiles).

### Player Type Appeal (Bartle Taxonomy)
- Not applicable to a single pre-reader; collection books and stars serve "achiever" play lightly.

### Flow State Design
- Mastery tiers keep a target 65–85 % correct (`tools/qa-mastery.mjs`); breathing card after 3 misses.

## Core Loop

### Moment-to-Moment (30 seconds)
Tap an answer or steer; immediate picture + sound feedback; a hint that fits the mistake when wrong.

### Short-Term (5-15 minutes)
One level/run → stars/reward → back to hub or next level.

### Session-Level (30-120 minutes)
Not a target. Sessions are short; a parent session-rhythm limit is planned (PRD-21).

### Long-Term Progression
Per-child stars, badges, XP tier, mastery per skill, review queue, collections.

### Retention Hooks
Favourite characters; review items returning; collection books (PRD-22 planned).

## Game Pillars

Taken from `PRODUCT.md` §Prinsip (authoritative wording there).

### Pillar 1: No dead ends
A silent button, a loader that never leaves or an invisible layer eating taps ends the session. Worst bug class.

### Pillar 2: Fair before pretty
Every hazard and level is provably passable with how a five-year-old actually plays.

### Pillar 3: Pictures first, text second
Real sprites and voice, never emoji or generic glyphs; text only accompanies.

### Pillar 4: Offline is the normal state
Assets that decide play are loaded explicitly and precached; never rely on a warm cache.

### Pillar 5: Fix in one place / measure, don't guess
Shared modules are the only implementation; visual claims are proven by rendering and counting pixels.

### Anti-Pillars (What This Game Is NOT)
- Not ad-supported, no purchases, no accounts, no network required, no trackers.
- No emoji, no white sticker outlines on sprites, no aurora/neon/glass "AI slop" styling (`DESIGN.md` §Yang dilarang).
- Women and girls appear only wearing hijab (owner rule).
- No reading-dependent instructions; no judging failure ("Coba lagi ya", never "Gagal!").

## Inspiration and References
Children's TV worlds the child loves (trains, boats, Pokemon, monster trucks). Assets are used for a
private family app; see `docs/` briefs per world.

## Target Player Profile
See `PRODUCT.md` §Pengguna. One real child, not a persona; the parent is the bug reporter, not the player.

## Technical Considerations
- Zero-build static site on GitHub Pages + Vercel; cache tokens (`?v=`) normalised by
  `tools/normalize-cache-tokens.mjs`; service worker precache in `sw.js`.
- ~200 Puppeteer gates in `tools/qa-*.mjs`, run through `tools/run-gates.mjs` and `tools/ci-verify.sh` (CI).
- Shared modules in `games/data/` (save-engine, bus, learning-log, mastery, review-queue, error-kinds,
  freeze-watchdog, breathe, feeling-checkin, cinema layer).

## Risks and Open Questions

### Design Risks
- Emotion games were retired (G1, G2, G5, G12); the replacement is owner-led (`docs/SPEC-EMOSI-REPLACEMENT-2026-11-11.md`).

### Technical Risks
- Very large single files (`game.js` 14,960 lines, `games/balapan-kereta.html` 7,476) — see tech-debt register.
- No real-device test path yet (PRD-06 blocked on USB debugging).

### Market Risks
None: private family product.

### Scope Risks
~40 games for one child; new games dilute polish. Owner names every new menu item before it ships.

### Open Questions
See `docs/prd/README.md` (owner decisions) and `docs/adoption-plan-2026-11-14.md`.

## MVP Definition
Shipped. The project is in live Production (v64.x), not pre-MVP.

### Scope Tiers (if budget/time shrinks)
1. Reliability (no dead ends, offline) 2. Learning loop 3. New content.

## Next Steps
Follow `docs/adoption-plan-2026-11-14.md` and `production/epics/`.
