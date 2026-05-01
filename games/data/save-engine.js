/**
 * Shared progress-save engine for Dunia Emosi standalone games.
 *
 * Hotfix #115 (2026-05-01): standalone games (g6/g14/g15/g16/g19/g20/g21/g22)
 * previously each had hardcoded `localStorage.setItem('dunia-0-progress', ...)`
 * blocks that wrote to slot 0 regardless of which avatar was active. Main app
 * (game.js) reads via avatar-keyed `pkey()` (`dunia-avatar-{slug}-progress`)
 * after Hotfix #103. Result: stars saved by standalone games invisible on
 * world map for non-default avatars.
 *
 * This module exposes:
 *   - `window.saveLevelProgress(gameId, level, stars)` — single source of
 *     truth. Routes write to current active avatar's bucket. Falls back to
 *     `dunia-0-progress` if avatar can't be resolved (boot or no slot picked).
 *   - `window.activeAvatarBadgeKey(badgeId)` — returns avatar-keyed badge
 *     key, e.g. `dunia-avatar-lion-g13c_badges`. Used by g13c gym ladder.
 *
 * Usage from any standalone game:
 *
 *   // On level win:
 *   if (typeof saveLevelProgress === 'function') {
 *     saveLevelProgress('g6', S.level, stars)
 *   }
 *
 *   // For g13c badges:
 *   const k = activeAvatarBadgeKey('g13c_badges')
 *   const badges = JSON.parse(localStorage.getItem(k) || '{}')
 *   badges[trainerId] = true
 *   localStorage.setItem(k, JSON.stringify(badges))
 *
 * Both helpers are safe to call before main app boot — they fall back to
 * legacy slot-0 / global keys when slot/avatar isn't yet resolvable.
 */
(function () {
  'use strict';

  const SLUG_MAP = {
    '🦁': 'lion', '🐰': 'rabbit', '🐘': 'elephant', '🦊': 'fox',
    '🐸': 'frog', '🐯': 'tiger', '🐼': 'panda', '🐨': 'koala',
  };

  function _activeAvatarSlug() {
    try {
      const aSlot = JSON.parse(localStorage.getItem('dunia-active-slot') || '[0,1]');
      const slot = (Array.isArray(aSlot) ? parseInt(aSlot[0]) : 0) || 0;
      const slots = JSON.parse(localStorage.getItem('dunia-players') || '[]');
      const animal = slots && slots[slot] && slots[slot].animal;
      return animal ? (SLUG_MAP[animal] || String(animal)) : null;
    } catch (_) {
      return null;
    }
  }

  function _progressKey() {
    const av = _activeAvatarSlug();
    return av ? `dunia-avatar-${av}-progress` : 'dunia-0-progress';
  }

  function activeAvatarBadgeKey(suffix) {
    const av = _activeAvatarSlug();
    if (!av) return suffix;  // fallback to legacy global key
    return `dunia-avatar-${av}-${suffix}`;
  }

  function saveLevelProgress(gameId, level, stars) {
    if (!gameId || typeof level !== 'number' || typeof stars !== 'number') return;
    const key = _progressKey();
    try {
      const prog = JSON.parse(localStorage.getItem(key) || '{}');
      if (!prog[gameId]) prog[gameId] = { completed: [], stars: {} };
      const g = prog[gameId];
      if (!Array.isArray(g.completed)) g.completed = [];
      if (typeof g.stars !== 'object' || g.stars === null) g.stars = {};
      if (!g.completed.includes(level)) g.completed.push(level);
      if ((g.stars[level] || 0) < stars) g.stars[level] = stars;
      localStorage.setItem(key, JSON.stringify(prog));
    } catch (e) {
      console.warn('[save-engine] saveLevelProgress fail:', e);
    }
    // Also surface result via sessionStorage so main app pageshow handler
    // can mirror to setLevelComplete (covers the "first migration" path).
    try {
      sessionStorage.setItem(`${gameId}Result`, JSON.stringify({ stars, level }));
    } catch (_) {}
  }

  if (typeof window !== 'undefined') {
    window.saveLevelProgress = saveLevelProgress;
    window.activeAvatarBadgeKey = activeAvatarBadgeKey;
    window._activeAvatarSlug = _activeAvatarSlug;
  }
})();
