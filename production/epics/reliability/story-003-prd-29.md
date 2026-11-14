# Story 003: PRD-29 Shell game bersama (adopsi bertahap)

> **Epic**: Reliability & architecture
> **Status**: Ready
> **Layer**: Presentation
> **Type**: UI
> **Estimate**: XL

## Context

**GDD**: `design/gdd/systems-index.md` (row for PRD-29); full design in `docs/prd/PRD-29-shell-game-bersama-adopsi.md`
**Requirement**: in `docs/prd/PRD-29-shell-game-bersama-adopsi.md` (no TR registry yet — see `docs/adoption-plan-2026-11-14.md` Step 3)

**ADR Governing Implementation**: `docs/architecture/adr-0004-shared-learning-modules.md`
**Engine**: Web (vanilla JS, zero-build) | **Risk**: LOW

---

## Acceptance Criteria

*From `docs/prd/PRD-29-shell-game-bersama-adopsi.md` (Laws), each must be shown red on the old code before green:*

- [ ] (L1) tombol rumah/jeda/suara ada di posisi sama di 3 ukuran
- [ ] (L2) semua gate game itu lulus
- [ ] (L3) `qa-action-latency` tidak memburuk
- [ ] Gate wired in `tools/run-gates.mjs` (and `tools/ci-verify.sh` when under 60 s, no GPU)
- [ ] Screenshots at 390x844, 844x390, 800x1280 looked at (visual changes)
- [ ] Live on github.io + Vercel (token + feature string checked with curl)

## Implementation Notes

Reuse the shared modules named in the ADR. Rules from `PRODUCT.md`/`DESIGN.md`: no emoji, no white sprite
outline, women and girls only with hijab, Bahasa Indonesia, targets >= 48 px.

## Out of Scope

Anything not in `docs/prd/PRD-29-shell-game-bersama-adopsi.md`.

## Files

Named in `docs/prd/PRD-29-shell-game-bersama-adopsi.md` Desain.

## QA Test Cases

The Laws above, as a `tools/qa-*.mjs` gate.

## Test Evidence

Recorded in the PRD's `## Hasil` section and in `docs/PRODUCT-ASSESSMENT-2026-11-10.md` Deliverable 5.

## Dependencies

See `design/gdd/systems-index.md` Depends On.
