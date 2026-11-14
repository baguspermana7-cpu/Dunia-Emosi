# Story 001: PRD-20 Kartu "main berikutnya" di hub **[ANAK — hal baru di menu]**

> **Epic**: Learning loop & hub
> **Status**: Blocked — BLOCKED: owner must approve the new hub card by name + screenshot
> **Layer**: Presentation
> **Type**: UI
> **Estimate**: M

## Context

**GDD**: `design/gdd/systems-index.md` (row for PRD-20); full design in `docs/prd/PRD-20-kartu-main-berikutnya-di.md`
**Requirement**: in `docs/prd/PRD-20-kartu-main-berikutnya-di.md` (no TR registry yet — see `docs/adoption-plan-2026-11-14.md` Step 3)

**ADR Governing Implementation**: `docs/architecture/adr-0003-dunia-bus-learning-events.md`
**Engine**: Web (vanilla JS, zero-build) | **Risk**: LOW

---

## Acceptance Criteria

*From `docs/prd/PRD-20-kartu-main-berikutnya-di.md` (Laws), each must be shown red on the old code before green:*

- [ ] (L1) log simulasi lemah di pengurangan → kartu menunjuk game pengurangan
- [ ] (L2) game yang sudah dimainkan hari ini tidak diulang
- [ ] (L3) avatar tanpa log → kartu game favorit/acak yang aman
- [ ] (L4) target ≥48 px, kontras lulus PRD-28
- [ ] Gate wired in `tools/run-gates.mjs` (and `tools/ci-verify.sh` when under 60 s, no GPU)
- [ ] Screenshots at 390x844, 844x390, 800x1280 looked at (visual changes)
- [ ] Live on github.io + Vercel (token + feature string checked with curl)

## Implementation Notes

Reuse the shared modules named in the ADR. Rules from `PRODUCT.md`/`DESIGN.md`: no emoji, no white sprite
outline, women and girls only with hijab, Bahasa Indonesia, targets >= 48 px.

## Out of Scope

Anything not in `docs/prd/PRD-20-kartu-main-berikutnya-di.md`.

## Files

Named in `docs/prd/PRD-20-kartu-main-berikutnya-di.md` Desain.

## QA Test Cases

The Laws above, as a `tools/qa-*.mjs` gate.

## Test Evidence

Recorded in the PRD's `## Hasil` section and in `docs/PRODUCT-ASSESSMENT-2026-11-10.md` Deliverable 5.

## Dependencies

See `design/gdd/systems-index.md` Depends On.
