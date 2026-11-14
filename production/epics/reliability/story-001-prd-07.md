# Story 001: PRD-07 Telemetri lokal + "Kesehatan perangkat"

> **Epic**: Reliability & architecture
> **Status**: Ready
> **Layer**: Feature
> **Type**: Logic
> **Estimate**: M

## Context

**GDD**: `design/gdd/systems-index.md` (row for PRD-07); full design in `docs/prd/PRD-07-telemetri-lokal-kesehatan-perangkat.md`
**Requirement**: in `docs/prd/PRD-07-telemetri-lokal-kesehatan-perangkat.md` (no TR registry yet — see `docs/adoption-plan-2026-11-14.md` Step 3)

**ADR Governing Implementation**: `docs/architecture/adr-0003-dunia-bus-learning-events.md`
**Engine**: Web (vanilla JS, zero-build) | **Risk**: LOW

---

## Acceptance Criteria

*From `docs/prd/PRD-07-telemetri-lokal-kesehatan-perangkat.md` (Laws), each must be shown red on the old code before green:*

- [ ] (L1) setelah sesi skrip, p95 per game tampil dan cocok dengan pengukuran gate ±10 ms
- [ ] (L2) overhead per ketukan <2 ms (A/B pakai `qa-action-latency`)
- [ ] (L3) buffer tidak melebihi 200 entri / 30 KB
- [ ] (L4) jank buatan 60 ms terlihat di halaman
- [ ] Gate wired in `tools/run-gates.mjs` (and `tools/ci-verify.sh` when under 60 s, no GPU)
- [ ] Screenshots at 390x844, 844x390, 800x1280 looked at (visual changes)
- [ ] Live on github.io + Vercel (token + feature string checked with curl)

## Implementation Notes

Reuse the shared modules named in the ADR. Rules from `PRODUCT.md`/`DESIGN.md`: no emoji, no white sprite
outline, women and girls only with hijab, Bahasa Indonesia, targets >= 48 px.

## Out of Scope

Anything not in `docs/prd/PRD-07-telemetri-lokal-kesehatan-perangkat.md`.

## Files

Named in `docs/prd/PRD-07-telemetri-lokal-kesehatan-perangkat.md` Desain.

## QA Test Cases

The Laws above, as a `tools/qa-*.mjs` gate.

## Test Evidence

Recorded in the PRD's `## Hasil` section and in `docs/PRODUCT-ASSESSMENT-2026-11-10.md` Deliverable 5.

## Dependencies

See `design/gdd/systems-index.md` Depends On.
