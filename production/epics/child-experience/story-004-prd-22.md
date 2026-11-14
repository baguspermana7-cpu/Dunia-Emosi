# Story 004: PRD-22 Satu buku koleksi lintas game **[ANAK — hal baru di menu]**

> **Epic**: Child experience
> **Status**: Blocked — BLOCKED: owner must approve the collection book entry on the hub
> **Layer**: Core
> **Type**: Integration
> **Estimate**: L

## Context

**GDD**: `design/gdd/systems-index.md` (row for PRD-22); full design in `docs/prd/PRD-22-satu-buku-koleksi-lintas.md`
**Requirement**: in `docs/prd/PRD-22-satu-buku-koleksi-lintas.md` (no TR registry yet — see `docs/adoption-plan-2026-11-14.md` Step 3)

**ADR Governing Implementation**: `docs/architecture/adr-0002-per-child-save-keys.md`
**Engine**: Web (vanilla JS, zero-build) | **Risk**: LOW

---

## Acceptance Criteria

*From `docs/prd/PRD-22-satu-buku-koleksi-lintas.md` (Laws), each must be shown red on the old code before green:*

- [ ] (L1) hadiah dari 3 game berbeda muncul di satu buku
- [ ] (L2) per avatar
- [ ] (L3) hadiah lama dari 4 halaman termigrasi
- [ ] (L4) screenshot buku di 3 ukuran dilihat
- [ ] Gate wired in `tools/run-gates.mjs` (and `tools/ci-verify.sh` when under 60 s, no GPU)
- [ ] Screenshots at 390x844, 844x390, 800x1280 looked at (visual changes)
- [ ] Live on github.io + Vercel (token + feature string checked with curl)

## Implementation Notes

Reuse the shared modules named in the ADR. Rules from `PRODUCT.md`/`DESIGN.md`: no emoji, no white sprite
outline, women and girls only with hijab, Bahasa Indonesia, targets >= 48 px.

## Out of Scope

Anything not in `docs/prd/PRD-22-satu-buku-koleksi-lintas.md`.

## Files

Named in `docs/prd/PRD-22-satu-buku-koleksi-lintas.md` Desain.

## QA Test Cases

The Laws above, as a `tools/qa-*.mjs` gate.

## Test Evidence

Recorded in the PRD's `## Hasil` section and in `docs/PRODUCT-ASSESSMENT-2026-11-10.md` Deliverable 5.

## Dependencies

See `design/gdd/systems-index.md` Depends On.
