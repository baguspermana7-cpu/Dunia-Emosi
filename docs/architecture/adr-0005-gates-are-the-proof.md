# ADR-0005: A change ships only on gates that failed first

## Status

Proposed

> Documents a decision that is already live in the code (reverse-documented 2026-11-14 during CCGS adoption).
> Only the owner may move it to `Accepted`.

## Date

2026-11-14

## Last Verified

2026-11-14 (v64.51)

## Decision Makers

Owner (product), Claude (implementation)

## Summary

Every behaviour change carries a `tools/qa-*.mjs` gate that is shown red on the old code (or a planted mutation) before it is trusted green.

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Web (vanilla JS, Canvas 2D + WebGL via PixiJS 8.18.1, no build) |
| **Domain** | Core |
| **Layer** | Foundation |
| **Knowledge Risk** | LOW |
| **References Consulted** | `PRODUCT.md`, `DESIGN.md`, code named below |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | `ci-verify.sh` green on every commit to main; each PRD Hasil quotes red→green numbers. |

## ADR Dependencies

ADR-0001

## Context

### Problem Statement

The owner does not test. Earlier gates passed while the rendered result was wrong (empty calculators, slop that passed a slop gate).

### Current State

Live since before v64.51; this ADR records it.

### Constraints

Child ~5, offline tablet PWA, zero-build, one shared origin with game1 (shared localStorage).

### Requirements

See Decision and Validation Criteria.

## Decision

Every behaviour change carries a `tools/qa-*.mjs` gate that is shown red on the old code (or a planted mutation) before it is trusted green. Gates read `QA_BASE`, run through `tools/run-gates.mjs` (tags, retries, one headless browser under `flock`), and fast ones run in `tools/ci-verify.sh` in CI before deploy. Visual changes get screenshots at 390×844, 844×390, 800×1280 that are looked at.

### Architecture Diagram

Not needed for this decision.

### Key Interfaces

Named in Decision.

### Implementation Guidelines

Reuse the module; never copy its logic into a game.

## Alternatives Considered

### Alternative 1: Manual QA by the owner

Manual QA by the owner — rejected by the owner ("Kamu yg uji").

## Consequences

### Positive

One implementation, one gate, one place to fix.

### Negative

CI takes ~20 minutes as browser gates grow.

### Neutral

None.

## Risks

CI takes ~20 minutes as browser gates grow.

## GDD Requirements Addressed

PRODUCT.md Prinsip 6 (measure, don't guess)

## Performance Implications

Gates are not shipped to players.

## Migration Plan

None — already in place.

## Validation Criteria

`ci-verify.sh` green on every commit to main; each PRD Hasil quotes red→green numbers.

## Related

`design/gdd/systems-index.md`, `docs/prd/README.md`
