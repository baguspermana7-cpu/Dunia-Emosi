# ADR-0001: Zero-build static PWA with normalised cache tokens

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

Plain HTML/CSS/ES5-ES2015 JS served as files (GitHub Pages + Vercel), no bundler.

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Web (vanilla JS, Canvas 2D + WebGL via PixiJS 8.18.1, no build) |
| **Domain** | Core |
| **Layer** | Foundation |
| **Knowledge Risk** | LOW |
| **References Consulted** | `PRODUCT.md`, `DESIGN.md`, code named below |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | `bash tools/ci-verify.sh` token check passes; `sw.js` token equals the token on every page. |

## ADR Dependencies

None

## Context

### Problem Statement

The game must run offline on a throttled Android tablet, deploy from a phone-sized team (one owner + agents), and never run stale code after an update.

### Current State

Live since before v64.51; this ADR records it.

### Constraints

Child ~5, offline tablet PWA, zero-build, one shared origin with game1 (shared localStorage).

### Requirements

See Decision and Validation Criteria.

## Decision

Plain HTML/CSS/ES5-ES2015 JS served as files (GitHub Pages + Vercel), no bundler. Every local asset URL carries `?v=<token>`; `tools/normalize-cache-tokens.mjs --token vNN.MM-YYYYMMDDx` rewrites all of them and the `sw.js` precache list in one step. The service worker precaches the shell and defers a deploy reload until the page is hidden (`games/sw-reload.js`).

### Architecture Diagram

Not needed for this decision.

### Key Interfaces

Named in Decision.

### Implementation Guidelines

Reuse the module; never copy its logic into a game.

## Alternatives Considered

### Alternative 1: A bundler (Vite) with hashed file names

A bundler (Vite) with hashed file names — rejected: adds a build step every page and every agent must run; the existing 26 pages and 92 modules are classic scripts sharing globals.

## Consequences

### Positive

One implementation, one gate, one place to fix.

### Negative

One missed token runs old code offline for days.

### Neutral

None.

## Risks

One missed token runs old code offline for days.

## GDD Requirements Addressed

PRODUCT.md Prinsip 4 (offline normal)

## Performance Implications

Page weight is whatever is shipped: no tree-shaking, so large classic scripts load whole.

## Migration Plan

None — already in place.

## Validation Criteria

`bash tools/ci-verify.sh` token check passes; `sw.js` token equals the token on every page.

## Related

`design/gdd/systems-index.md`, `docs/prd/README.md`
