# ADR-0002: Per-child saves through save-engine only

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

All persistent per-child state goes through `games/data/save-engine.js` (`avatarScopedGet/Set`, `DuniaProfile`).

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Web (vanilla JS, Canvas 2D + WebGL via PixiJS 8.18.1, no build) |
| **Domain** | Core |
| **Layer** | Foundation |
| **Knowledge Risk** | LOW |
| **References Consulted** | `PRODUCT.md`, `DESIGN.md`, code named below |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | `qa-save-persistence`, `qa-ayo-per-child`, `qa-profile-settings`, `qa-profile-age` pass. |

## ADR Dependencies

ADR-0001

## Context

### Problem Statement

Siblings share one tablet. Before 2026-11-11 some games wrote global keys, so one child's progress overwrote another's.

### Current State

Live since before v64.51; this ADR records it.

### Constraints

Child ~5, offline tablet PWA, zero-build, one shared origin with game1 (shared localStorage).

### Requirements

See Decision and Validation Criteria.

## Decision

All persistent per-child state goes through `games/data/save-engine.js` (`avatarScopedGet/Set`, `DuniaProfile`). Keys are `dunia-avatar-<slug>-<name>`. Moving an old global key to per-child storage is done once, behind a one-time flag, copying to every existing child. `avatarScopedGet` on a global key name MOVES and deletes it — never call it on keys other games still read.

### Architecture Diagram

Not needed for this decision.

### Key Interfaces

Named in Decision.

### Implementation Guidelines

Reuse the module; never copy its logic into a game.

## Alternatives Considered

### Alternative 1: Each game keeps its own save code

Each game keeps its own save code — rejected: that is how the sibling-overwrite bug happened (Ayo Berhitung `berhitung-v2`).

## Consequences

### Positive

One implementation, one gate, one place to fix.

### Negative

A migration bug can overwrite a sibling's progress.

### Neutral

None.

## Risks

A migration bug can overwrite a sibling's progress.

## GDD Requirements Addressed

PRODUCT.md user section (siblings share the device)

## Performance Implications

localStorage reads are synchronous; save-engine keeps writes small (JSON per key).

## Migration Plan

None — already in place.

## Validation Criteria

`qa-save-persistence`, `qa-ayo-per-child`, `qa-profile-settings`, `qa-profile-age` pass.

## Related

`design/gdd/systems-index.md`, `docs/prd/README.md`
