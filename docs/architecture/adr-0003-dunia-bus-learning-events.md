# ADR-0003: DuniaBus is the only channel from games to the learning systems

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

Games emit `DuniaBus.emit('answer', {game, domain, skill, item, ok, tries, ms, review, hint})` and `level:start/end`.

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Web (vanilla JS, Canvas 2D + WebGL via PixiJS 8.18.1, no build) |
| **Domain** | Core |
| **Layer** | Core |
| **Knowledge Risk** | LOW |
| **References Consulted** | `PRODUCT.md`, `DESIGN.md`, code named below |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | `qa-bus-coverage` (answer count = questions answered per game) and `qa-learning-log` pass. |

## ADR Dependencies

ADR-0002

## Context

### Problem Statement

Learning features (mastery, review queue, hints, calm moments, dashboard) need answers from every game, but games are separate pages with their own code.

### Current State

Live since before v64.51; this ADR records it.

### Constraints

Child ~5, offline tablet PWA, zero-build, one shared origin with game1 (shared localStorage).

### Requirements

See Decision and Validation Criteria.

## Decision

Games emit `DuniaBus.emit('answer', {game, domain, skill, item, ok, tries, ms, review, hint})` and `level:start/end`. `LearningLog` subscribes and stores a daily summary + last 100 answers per child. Learning modules read `LearningLog`, never a game's internals. A game that does not emit simply does not feed the loop; nothing breaks.

### Architecture Diagram

Not needed for this decision.

### Key Interfaces

Named in Decision.

### Implementation Guidelines

Reuse the module; never copy its logic into a game.

## Alternatives Considered

### Alternative 1: Each learning feature reads each game's own save

Each learning feature reads each game's own save — rejected: N×M coupling, and every new game would need edits in every feature.

## Consequences

### Positive

One implementation, one gate, one place to fix.

### Negative

A game emitting a wrong domain/skill silently skews mastery.

### Neutral

None.

## Risks

A game emitting a wrong domain/skill silently skews mastery.

## GDD Requirements Addressed

Assessment register #8, #10, #11, #13

## Performance Implications

One synchronous listener per event; measured inside `qa-action-latency` budget.

## Migration Plan

None — already in place.

## Validation Criteria

`qa-bus-coverage` (answer count = questions answered per game) and `qa-learning-log` pass.

## Related

`design/gdd/systems-index.md`, `docs/prd/README.md`
