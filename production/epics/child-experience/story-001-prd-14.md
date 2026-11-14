# Story 001: PRD-14 Cakupan narasi suara **[ANAK — suara baru]**

> **Epic**: Child experience
> **Status**: Ready
> **Layer**: Presentation
> **Type**: Integration
> **Estimate**: L

## Context

**GDD**: `design/gdd/systems-index.md` (row for PRD-14); full design in `docs/prd/PRD-14-cakupan-narasi-suara.md`
**Requirement**: in `docs/prd/PRD-14-cakupan-narasi-suara.md` (no TR registry yet — see `docs/adoption-plan-2026-11-14.md` Step 3)

**ADR Governing Implementation**: `docs/architecture/adr-0003-dunia-bus-learning-events.md`
**Engine**: Web (vanilla JS, zero-build) | **Risk**: LOW

---

## Acceptance Criteria

*From `docs/prd/PRD-14-cakupan-narasi-suara.md` (Laws), each must be shown red on the old code before green:*

- [ ] (L1) gate: setiap instruksi di layar mulai tiap game punya klip (merah sekarang)
- [ ] (L2) total ukuran tambahan dicatat dan masuk precache tanpa melanggar batas prune Pages
- [ ] (L3) offline gate memutar klip tanpa jaringan
- [ ] (L4) saya dengarkan sampel acak 10 klip (transkrip Whisper-lokal cocok dengan teks)
- [ ] Gate wired in `tools/run-gates.mjs` (and `tools/ci-verify.sh` when under 60 s, no GPU)
- [ ] Screenshots at 390x844, 844x390, 800x1280 looked at (visual changes)
- [ ] Live on github.io + Vercel (token + feature string checked with curl)

## Implementation Notes

Reuse the shared modules named in the ADR. Rules from `PRODUCT.md`/`DESIGN.md`: no emoji, no white sprite
outline, women and girls only with hijab, Bahasa Indonesia, targets >= 48 px.

## Out of Scope

Anything not in `docs/prd/PRD-14-cakupan-narasi-suara.md`.

## Files

Named in `docs/prd/PRD-14-cakupan-narasi-suara.md` Desain.

## QA Test Cases

The Laws above, as a `tools/qa-*.mjs` gate.

## Test Evidence

Recorded in the PRD's `## Hasil` section and in `docs/PRODUCT-ASSESSMENT-2026-11-10.md` Deliverable 5.

## Dependencies

See `design/gdd/systems-index.md` Depends On.
