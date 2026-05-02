/**
 * cloud-sync.js — Shared Progress via Supabase REST API
 *
 * Concept: All players using the same avatar (e.g. "lion") share ONE global
 * progress record. If User A on Device 1 completes City X as lion, User B on
 * Device 2 also sees City X already cleared when they pick lion.
 *
 * Architecture:
 *   - localStorage = primary (instant, offline-first)
 *   - Supabase = secondary (synced in background, shared across devices)
 *   - Merge strategy: take-max (highest stars, union of completed arrays)
 *   - Sync direction: bidirectional — load on boot, save on progress change
 *
 * Setup (owner only): Set window.CLOUD_SYNC_CONFIG before this script:
 *   window.CLOUD_SYNC_CONFIG = {
 *     url: 'https://xxxx.supabase.co',
 *     key: 'eyJ...'          // anon/public key only
 *   }
 *
 * If CLOUD_SYNC_CONFIG is missing or Supabase is unreachable, this module
 * degrades silently — game works purely on localStorage.
 *
 * Supabase table DDL:
 *   CREATE TABLE shared_progress (
 *     slot_key   TEXT PRIMARY KEY,          -- 'lion','rabbit','elephant',etc.
 *     progress   JSONB NOT NULL DEFAULT '{}',
 *     xp         INTEGER NOT NULL DEFAULT 0,
 *     updated_at TIMESTAMPTZ DEFAULT NOW()
 *   );
 *   ALTER TABLE shared_progress ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "public read"  ON shared_progress FOR SELECT USING (true);
 *   CREATE POLICY "public write" ON shared_progress FOR ALL  USING (true);
 */
(function () {
  'use strict';

  const TABLE = 'shared_progress';
  const SAVE_DEBOUNCE_MS = 30000; // 30s debounce — don't hammer Supabase
  const SYNC_TIMEOUT_MS  = 8000;  // 8s network timeout

  function _cfg() {
    return (typeof window !== 'undefined' && window.CLOUD_SYNC_CONFIG) || null;
  }

  function _headers(cfg) {
    return {
      'apikey': cfg.key,
      'Authorization': 'Bearer ' + cfg.key,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  }

  function _url(cfg, slotKey) {
    return cfg.url.replace(/\/$/, '') + '/rest/v1/' + TABLE + '?slot_key=eq.' + encodeURIComponent(slotKey);
  }

  function _upsertUrl(cfg) {
    return cfg.url.replace(/\/$/, '') + '/rest/v1/' + TABLE;
  }

  // Merge two progress objects — take higher stars, union completed arrays
  function _mergeProgress(local, remote) {
    if (!remote || typeof remote !== 'object') return local;
    if (!local  || typeof local  !== 'object') return remote;
    const merged = Object.assign({}, local);
    for (const gameKey of Object.keys(remote)) {
      if (!merged[gameKey]) { merged[gameKey] = remote[gameKey]; continue; }
      const loc = merged[gameKey];
      const rem = remote[gameKey];
      // Union completed arrays
      const locDone = Array.isArray(loc.completed) ? loc.completed : [];
      const remDone = Array.isArray(rem.completed) ? rem.completed : [];
      const allDone = Array.from(new Set([...locDone, ...remDone]));
      // Take max stars per level
      const locStars = (loc.stars && typeof loc.stars === 'object') ? loc.stars : {};
      const remStars = (rem.stars && typeof rem.stars === 'object') ? rem.stars : {};
      const mergedStars = Object.assign({}, locStars);
      for (const lvl of Object.keys(remStars)) {
        mergedStars[lvl] = Math.max(mergedStars[lvl] || 0, remStars[lvl] || 0);
      }
      merged[gameKey] = { completed: allDone, stars: mergedStars };
    }
    return merged;
  }

  // Fetch with timeout
  function _fetch(url, opts, timeoutMs) {
    return new Promise((resolve, reject) => {
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = setTimeout(() => {
        if (ctrl) ctrl.abort();
        reject(new Error('timeout'));
      }, timeoutMs || SYNC_TIMEOUT_MS);
      const fetchOpts = ctrl ? Object.assign({}, opts, { signal: ctrl.signal }) : opts;
      fetch(url, fetchOpts)
        .then(r => { clearTimeout(timer); resolve(r); })
        .catch(e => { clearTimeout(timer); reject(e); });
    });
  }

  // Load shared progress from Supabase for a given avatar slug.
  // Merges with localStorage and updates localStorage with the merged result.
  // Returns merged progress object (or null if cloud unavailable).
  async function load(slotKey, localProgress) {
    const cfg = _cfg();
    if (!cfg || !slotKey) return null;
    try {
      const res = await _fetch(_url(cfg, slotKey), {
        method: 'GET',
        headers: _headers(cfg)
      });
      if (!res.ok) return null;
      const rows = await res.json();
      if (!Array.isArray(rows) || rows.length === 0) return null;
      const remoteProgress = rows[0].progress || {};
      return _mergeProgress(localProgress || {}, remoteProgress);
    } catch (_) {
      return null; // silently degrade
    }
  }

  // Pending save state for debounce
  let _saveTimer = null;
  let _pendingSlot = null;
  let _pendingProg = null;
  let _pendingXp   = 0;

  // Save progress to Supabase (debounced). Merges with remote before writing
  // to avoid overwriting concurrent updates from other devices.
  function save(slotKey, progress, xp) {
    if (!_cfg() || !slotKey) return;
    _pendingSlot = slotKey;
    _pendingProg = progress;
    _pendingXp   = xp || 0;
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(_flushSave, SAVE_DEBOUNCE_MS);
  }

  async function _flushSave() {
    _saveTimer = null;
    const cfg = _cfg();
    if (!cfg || !_pendingSlot) return;
    const slotKey  = _pendingSlot;
    const progress = _pendingProg;
    const xp       = _pendingXp;
    try {
      // Read-merge-write for conflict safety
      const getRes = await _fetch(_url(cfg, slotKey), {
        method: 'GET',
        headers: _headers(cfg)
      });
      let finalProgress = progress;
      if (getRes.ok) {
        const rows = await getRes.json();
        if (Array.isArray(rows) && rows.length > 0) {
          finalProgress = _mergeProgress(progress, rows[0].progress || {});
        }
      }
      // Upsert
      await _fetch(_upsertUrl(cfg) + '?on_conflict=slot_key', {
        method: 'POST',
        headers: Object.assign({}, _headers(cfg), { 'Prefer': 'resolution=merge-duplicates,return=minimal' }),
        body: JSON.stringify({
          slot_key: slotKey,
          progress: finalProgress,
          xp: xp,
          updated_at: new Date().toISOString()
        })
      });
    } catch (_) {
      // silently degrade
    }
  }

  // Force immediate flush (call on page unload)
  function flush() {
    if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
    if (_pendingSlot) _flushSave();
  }

  // Expose
  if (typeof window !== 'undefined') {
    window.cloudSync = { load, save, flush };
  }
})();
