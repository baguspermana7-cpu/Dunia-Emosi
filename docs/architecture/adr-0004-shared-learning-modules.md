# ADR-0004: Mastery, review and hints are shared modules, not per-game logic

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

`games/data/mastery.js` (`DuniaMastery`: score, tier, cap, soften), `review-queue.js` (`DuniaReview`: 1/3/7-day schedule, at most 1 in 3 questions), `error-kinds.js` (`DuniaErrorKinds`: off-by-one, swapped-op, general) are the only implementations.

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Web (vanilla JS, Canvas 2D + WebGL via PixiJS 8.18.1, no build) |
| **Domain** | Core |
| **Layer** | Feature |
| **Knowledge Risk** | LOW |
| **References Consulted** | `PRODUCT.md`, `DESIGN.md`, code named below |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | `qa-mastery`, `qa-soften`, `qa-review`, `qa-error-kinds` pass (node + browser parts). |

## ADR Dependencies

ADR-0003

## Context

### Problem Statement

Timmy had its own mastery model (`TKQuiz.mastery`); other games had none. Copying it would create diverging models.

### Current State

Live since before v64.51; this ADR records it.

### Constraints

Child ~5, offline tablet PWA, zero-build, one shared origin with game1 (shared localStorage).

### Requirements

See Decision and Validation Criteria.

## Decision

`games/data/mastery.js` (`DuniaMastery`: score, tier, cap, soften), `review-queue.js` (`DuniaReview`: 1/3/7-day schedule, at most 1 in 3 questions), `error-kinds.js` (`DuniaErrorKinds`: off-by-one, swapped-op, general) are the only implementations. Games ask them (`cap('matematika', max, table)`, `next(domain, fits)`, `classify(q, picked)`) and keep their own presentation.

### Architecture Diagram

Not needed for this decision.

### Key Interfaces

Named in Decision.

### Implementation Guidelines

Reuse the module; never copy its logic into a game.

## Alternatives Considered

### Alternative 1: Put the logic in each game's question engine

Put the logic in each game's question engine — rejected: PRODUCT.md Prinsip 5 (fix in one place).

## Consequences

### Positive

One implementation, one gate, one place to fix.

### Negative

A shared change shifts difficulty in every game at once.

### Neutral

None.

## Risks

A shared change shifts difficulty in every game at once.

## GDD Requirements Addressed

PRD-10, PRD-11, PRD-13, PRD-17b

## Performance Implications

Pure functions over at most 100 log rows; negligible.

## Migration Plan

None — already in place.

## Validation Criteria

`qa-mastery`, `qa-soften`, `qa-review`, `qa-error-kinds` pass (node + browser parts).

## Related

`design/gdd/systems-index.md`, `docs/prd/README.md`
