# Adoption Plan

> **Generated**: 2026-11-14
> **Project phase**: Production (inferred: 323 source files under `games/`; live v64.51)
> **Engine**: Web — vanilla JavaScript, Canvas 2D + WebGL (PixiJS 8.18.1), zero-build
> **Template version**: Claude Code Game Studios 1.3.0 (pinned abc0de79), installed locally in `.claude/` (git-ignored)

Work through these steps in order. Re-run `/adopt` (after a Claude Code restart the skills become slash
commands) to re-check remaining gaps.

## What adoption did on 2026-11-14 (Phase 1 detection, before → after)

| Fact (`.claude/scripts/project-state.sh`) | Before | After |
|---|---|---|
| engine / code_root | unset / unset | Web / `games` (`project.yaml`, local) |
| phase_inferred | concept (source files "unknown") | production |
| concept | absent | `design/gdd/game-concept.md` |
| systems_index | absent | `design/gdd/systems-index.md` (22 systems, 6 game families) |
| ADRs | 0 | 5 (`docs/architecture/adr-0001..0005`, all 5 required sections present) |
| stories | 0 | 10 in 3 epics (`production/epics/`), one per unfinished PRD, PRD laws as acceptance criteria |

Nothing in the game changed. The PRDs in `docs/prd/` stay the detailed design; the CCGS files index them.

## Gap classification (Phase 3)

| Tier | Count | Items |
|---|---|---|
| BLOCKING | 0 | — |
| HIGH | 4 | ADRs not Accepted; no TR registry; no control manifest; no `docs/engine-reference/web/VERSION.md` |
| MEDIUM | 4 | no per-system GDDs (PRDs stand in); no `project.stage`; no `sprint-status.yaml`; naming + performance budgets unset |
| LOW | 2 | stories without TR-IDs / Manifest Version; `project.yaml` not versioned (repo ignores `.claude/`, excludes `project.yaml`) |

---

## Step 1: Fix Blocking Gaps

None.

---

## Step 2: Fix High-Priority Gaps

### 2a. Owner accepts the five ADRs
The ADRs record decisions already live. CCGS sets stories that reference a `Proposed` ADR to Blocked, and
only the owner may set `Accepted`.
**Fix**: owner reads `docs/architecture/adr-0001..0005` and says yes; then the Status line becomes `Accepted`.
**Time**: 15 min
- [ ] ADR-0001 zero-build static PWA
- [ ] ADR-0002 per-child save keys
- [ ] ADR-0003 DuniaBus learning events
- [ ] ADR-0004 shared learning modules
- [ ] ADR-0005 gates are the proof

### 2b. Engine reference for Web
`/setup-engine web` on an existing project only writes the reference (it never overwrites files; Dunia has
no `package.json`, so the Vite/TypeScript scaffold must NOT be copied — zero-build is ADR-0001).
**Time**: 30 min
- [ ] `docs/engine-reference/web/VERSION.md` names PixiJS 8.18.1 (vendored `games/lib/pixi.min.js`), target Chrome on Android

---

## Step 3: Bootstrap Infrastructure

### 3a. Register existing requirements (creates tr-registry.yaml)
Run `/architecture-review` after 2a.
- [ ] `docs/architecture/tr-registry.yaml` created

### 3b. Create control manifest
Run `/create-control-manifest`. Must carry the owner rules: no emoji, no white sprite outline, hijab only,
targets >= 48 px, one headless browser, per-child saves via save-engine.
- [ ] `docs/architecture/control-manifest.md` created

### 3c. Create sprint tracking file
Run `/sprint-plan update` (sprint = the next PRD wave).
- [ ] `production/sprint-status.yaml` created

### 3d. Set authoritative project stage
Run `/gate-check production`. Expected to report the Step 4 gaps before it can pass; the stage moves only on PASS.
- [ ] `project.stage` written

---

## Step 4: Medium-Priority Gaps

- [ ] Per-system GDDs via `/reverse-document` for the 13 Approved systems, starting with Save engine, Mastery
      model, Review queue (they define numeric rules: tiers 0/30/60/80, review steps 1/3/7 days) — 1 session each
- [ ] Naming and performance budgets in `project.yaml` (`/project-settings`): action latency p95 budget from
      `tools/qa-action-latency.mjs`, asset size budget from the audit below — 30 min

## Step 5: Optional Improvements

- [ ] Decide whether `project.yaml` is versioned (today it is excluded locally, like `.claude/`)
- [ ] Add TR-IDs to the 10 stories after 3a

## What to Expect from Existing Stories

The 10 stories mirror unfinished PRDs. New CCGS checks (TR-ID, manifest version) auto-pass when absent.
Three stories are Blocked on the owner by design (PRD-20 and PRD-22 add new hub entries; PRD-06 needs the tablet).

## Audit

The full audit done with the CCGS audit checklists is in `docs/audit/full-audit-2026-11-14.md`.
