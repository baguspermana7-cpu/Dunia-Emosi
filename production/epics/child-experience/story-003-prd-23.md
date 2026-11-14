# Story 003: PRD-23 Indikator siap luring per game

> **Epic**: Child experience
> **Status**: Ready
> **Layer**: Presentation
> **Type**: UI
> **Estimate**: M

## Context

**GDD**: `design/gdd/systems-index.md` (row for PRD-23); full design in `docs/prd/PRD-23-indikator-siap-luring-per.md`
**Requirement**: in `docs/prd/PRD-23-indikator-siap-luring-per.md` (no TR registry yet — see `docs/adoption-plan-2026-11-14.md` Step 3)

**ADR Governing Implementation**: `docs/architecture/adr-0001-zero-build-static-pwa.md`
**Engine**: Web (vanilla JS, zero-build) | **Risk**: LOW

---

## Acceptance Criteria

*From `docs/prd/PRD-23-indikator-siap-luring-per.md` (Laws), each must be shown red on the old code before green:*

- [ ] (L1) cache dihapus satu aset → lencana hilang untuk game itu saja
- [ ] (L2) setelah "unduh semua" + offline → semua game dengan lencana bisa dimulai (gate offline per game)
- [ ] Gate wired in `tools/run-gates.mjs` (and `tools/ci-verify.sh` when under 60 s, no GPU)
- [ ] Screenshots at 390x844, 844x390, 800x1280 looked at (visual changes)
- [ ] Live on github.io + Vercel (token + feature string checked with curl)

## Implementation Notes

Reuse the shared modules named in the ADR. Rules from `PRODUCT.md`/`DESIGN.md`: no emoji, no white sprite
outline, women and girls only with hijab, Bahasa Indonesia, targets >= 48 px.

## Out of Scope

Anything not in `docs/prd/PRD-23-indikator-siap-luring-per.md`.

## Files

Named in `docs/prd/PRD-23-indikator-siap-luring-per.md` Desain.

## QA Test Cases

The Laws above, as a `tools/qa-*.mjs` gate.

## Test Evidence

Recorded in the PRD's `## Hasil` section and in `docs/PRODUCT-ASSESSMENT-2026-11-10.md` Deliverable 5.

## Dependencies

See `design/gdd/systems-index.md` Depends On.
