/* =============================================================================
 * Pokemon Type Effectiveness Chart — Kid-Friendly Edition
 * =============================================================================
 * Shared across G10, G13, G13B, G13C battle games.
 *
 * Multipliers (milder than canonical 2x/0.5x/0x for younger kids):
 *  - 1.5  = Super Efektif (advantage)
 *  - 1.0  = Normal
 *  - 0.75 = Kurang Efektif (resistance)
 *  - 0.5  = Sangat Lemah (immune-equivalent, never 0 — kid still does *something*)
 *
 * Relationships follow Gen 6+ canonical chart (Fairy type included).
 *
 * Exports on window:
 *   POKE_EFF, calcTypeMult, getWeaknesses, getResistances,
 *   TYPE_EMOJI, TYPE_COLOR, TYPE_LABEL_ID,
 *   spawnEffectivenessText(targetEl, mult), renderWeaknessSticker(el, defType),
 *   getMoveEffectivenessClass(atkType, defType), playEffectivenessSfx(mult)
 * ============================================================================ */

(function () {
  'use strict';

  // ── Canonical type matchups (attacker-perspective) ────────────────────
  // Each row: attacker type → { defender type: canonical multiplier }
  // Canonical values: 2 (super), 0.5 (resist), 0 (immune)
  const CANONICAL = {
    fire:     { grass:2, ice:2, bug:2, steel:2, water:0.5, rock:0.5, fire:0.5, dragon:0.5 },
    water:    { fire:2, rock:2, ground:2, water:0.5, grass:0.5, dragon:0.5 },
    grass:    { water:2, rock:2, ground:2, fire:0.5, grass:0.5, poison:0.5, flying:0.5, bug:0.5, dragon:0.5, steel:0.5 },
    electric: { water:2, flying:2, ground:0, grass:0.5, electric:0.5, dragon:0.5 },
    psychic:  { fighting:2, poison:2, psychic:0.5, dark:0, steel:0.5 },
    ghost:    { psychic:2, ghost:2, normal:0, dark:0.5 },
    dragon:   { dragon:2, steel:0.5, fairy:0 },
    dark:     { psychic:2, ghost:2, fighting:0.5, dark:0.5, fairy:0.5 },
    normal:   { rock:0.5, steel:0.5, ghost:0 },
    fighting: { normal:2, rock:2, steel:2, ice:2, dark:2, poison:0.5, flying:0.5, psychic:0.5, bug:0.5, fairy:0.5, ghost:0 },
    ice:      { grass:2, ground:2, flying:2, dragon:2, fire:0.5, water:0.5, ice:0.5, steel:0.5 },
    rock:     { fire:2, ice:2, flying:2, bug:2, fighting:0.5, ground:0.5, steel:0.5 },
    ground:   { fire:2, electric:2, poison:2, rock:2, steel:2, grass:0.5, bug:0.5, flying:0 },
    flying:   { grass:2, fighting:2, bug:2, electric:0.5, rock:0.5, steel:0.5 },
    poison:   { grass:2, fairy:2, poison:0.5, ground:0.5, rock:0.5, ghost:0.5, steel:0 },
    steel:    { ice:2, rock:2, fairy:2, fire:0.5, water:0.5, electric:0.5, steel:0.5 },
    fairy:    { fighting:2, dragon:2, dark:2, fire:0.5, poison:0.5, steel:0.5 },
    bug:      { grass:2, psychic:2, dark:2, fire:0.5, fighting:0.5, flying:0.5, ghost:0.5, steel:0.5, fairy:0.5 }
  };

  // ── Map canonical → kid-friendly multipliers ──────────────────────────
  // 2.0 → 1.5 (still feels strong, less brutal)
  // 0.5 → 0.75 (still annoying, not crippling)
  // 0   → 0.5  (no full immune — kid still gets to do *something*)
  const KID_MAP = { 2: 1.5, 1: 1, 0.5: 0.75, 0: 0.5 };

  // Build the public effectiveness table
  const POKE_EFF = {};
  Object.keys(CANONICAL).forEach(atk => {
    POKE_EFF[atk] = {};
    Object.keys(CANONICAL[atk]).forEach(def => {
      POKE_EFF[atk][def] = KID_MAP[CANONICAL[atk][def]];
    });
  });
  window.POKE_EFF = POKE_EFF;

  // ── Helpers ───────────────────────────────────────────────────────────
  function _norm(t) { return String(t || 'normal').toLowerCase().trim(); }

  function calcTypeMult(atk, def) {
    const a = _norm(atk), d = _norm(def);
    const row = POKE_EFF[a];
    if (!row) return 1;
    const m = row[d];
    return typeof m === 'number' ? m : 1;
  }
  window.calcTypeMult = calcTypeMult;

  // Same-Type Attack Bonus (STAB): when Pokemon uses move of own type,
  // damage multiplied by 1.25 (canonical Pokemon mechanic, scaled down
  // from standard 1.5x to keep balance with our 1.5x super-effective).
  // Combined: super-effective + STAB = 1.5 * 1.25 = 1.875x max damage.
  function calcStab(moveType, attackerType) {
    return _norm(moveType) === _norm(attackerType) ? 1.25 : 1;
  }
  window.calcStab = calcStab;

  // Full damage multiplier including STAB. Use this when you have both
  // moveType + attackerType available (G13C). For games where attacker
  // and move are the same type by definition (G10/G13/G13B auto-attack),
  // STAB is implicit — always 1.25x. Pass attackerType as moveType to
  // enable that auto-STAB.
  function calcFullMult(moveType, attackerType, defenderType) {
    const stab = calcStab(moveType, attackerType);
    const eff  = calcTypeMult(moveType, defenderType);
    return stab * eff;
  }
  window.calcFullMult = calcFullMult;

  // Get 1-2 most threatening types vs defender (the "weakness sticker" content)
  function getWeaknesses(defType, max) {
    const d = _norm(defType);
    const list = [];
    Object.keys(POKE_EFF).forEach(atk => {
      const m = POKE_EFF[atk][d];
      if (typeof m === 'number' && m > 1) list.push({ type: atk, mult: m });
    });
    // Sort highest mult first, then alpha for stability
    list.sort((a, b) => b.mult - a.mult || a.type.localeCompare(b.type));
    return list.slice(0, max || 2).map(x => x.type);
  }
  window.getWeaknesses = getWeaknesses;

  function getResistances(defType, max) {
    const d = _norm(defType);
    const list = [];
    Object.keys(POKE_EFF).forEach(atk => {
      const m = POKE_EFF[atk][d];
      if (typeof m === 'number' && m < 1) list.push({ type: atk, mult: m });
    });
    list.sort((a, b) => a.mult - b.mult || a.type.localeCompare(b.type));
    return list.slice(0, max || 2).map(x => x.type);
  }
  window.getResistances = getResistances;

  // ── Visual tokens ─────────────────────────────────────────────────────
  const TYPE_EMOJI = {
    fire: '🔥', water: '💧', grass: '🌿', electric: '⚡',
    psychic: '🔮', ghost: '👻', dragon: '🐉', dark: '🌑',
    ice: '❄️', rock: '🪨', ground: '🌍', flying: '💨',
    poison: '☠️', steel: '⚙️', fighting: '👊', bug: '🐛',
    fairy: '🧚', normal: '⚪'
  };
  window.TYPE_EMOJI = TYPE_EMOJI;

  const TYPE_COLOR = {
    fire: '#fb923c', water: '#60a5fa', grass: '#4ade80', electric: '#fbbf24',
    psychic: '#f472b6', ghost: '#a78bfa', dragon: '#818cf8', dark: '#78716c',
    ice: '#67e8f9', rock: '#a8a29e', ground: '#fcd34d', flying: '#bae6fd',
    poison: '#d946ef', steel: '#94a3b8', fighting: '#fca5a5', bug: '#a3e635',
    fairy: '#fbcfe8', normal: '#9ca3af'
  };
  window.TYPE_COLOR = TYPE_COLOR;

  const TYPE_LABEL_ID = {
    fire: 'Api', water: 'Air', grass: 'Tanaman', electric: 'Listrik',
    psychic: 'Psikis', ghost: 'Hantu', dragon: 'Naga', dark: 'Gelap',
    ice: 'Es', rock: 'Batu', ground: 'Tanah', flying: 'Terbang',
    poison: 'Racun', steel: 'Logam', fighting: 'Petarung', bug: 'Serangga',
    fairy: 'Peri', normal: 'Normal'
  };
  window.TYPE_LABEL_ID = TYPE_LABEL_ID;

  function getTypeEmoji(t) { return TYPE_EMOJI[_norm(t)] || '⚪'; }
  window.getTypeEmoji = getTypeEmoji;

  // ── UI helpers ────────────────────────────────────────────────────────

  /**
   * Render or update the weakness sticker inside a container.
   * Container should be empty or pre-existing .weakness-sticker.
   * Returns the sticker element.
   */
  function renderWeaknessSticker(containerEl, defType) {
    if (!containerEl) return null;
    const weak = getWeaknesses(defType, 2);
    let sticker = containerEl.querySelector('.weakness-sticker');
    if (!sticker) {
      sticker = document.createElement('div');
      sticker.className = 'weakness-sticker';
      containerEl.appendChild(sticker);
    }
    if (!weak.length) {
      // No weaknesses → render nothing (kids 5-10 don't know "Seimbang")
      sticker.innerHTML = '';
      sticker.style.display = 'none';
      return sticker;
    }
    sticker.style.display = '';
    const icons = weak.map(t => `<span class="ws-icon" title="${TYPE_LABEL_ID[t]||t}">${TYPE_EMOJI[t]||'⚪'}</span>`).join('');
    sticker.innerHTML = `<span class="ws-shield">🛡</span><span class="ws-label">Lemah:</span>${icons}`;
    return sticker;
  }
  window.renderWeaknessSticker = renderWeaknessSticker;

  /**
   * Spawn floating effectiveness text above a target element.
   * mult: 1.5 = super-effective, 0.75 = resist, 0.5 = very weak, 1.0 = none (no text).
   */
  function spawnEffectivenessText(targetEl, mult) {
    if (!targetEl || mult === 1 || typeof mult !== 'number') return;
    // Cap concurrent floating text nodes to prevent DOM accumulation
    // on rapid hits (e.g. legendary auto-attack + correct-answer streak).
    const existing = document.querySelectorAll('.eff-text');
    if (existing.length >= 2) {
      try { existing[0].remove() } catch(_){}
    }
    const text = document.createElement('div');
    text.className = 'eff-text';
    if (mult >= 1.5) {
      text.classList.add('eff-super');
      text.textContent = '✨ Super Efektif! ✨';
    } else if (mult <= 0.5) {
      text.classList.add('eff-immune');
      text.textContent = '💢 Sangat Lemah…';
    } else {
      text.classList.add('eff-resist');
      text.textContent = '💧 Kurang Efektif…';
    }
    const rect = targetEl.getBoundingClientRect();
    text.style.left = (rect.left + rect.width / 2) + 'px';
    text.style.top  = (rect.top - 8) + 'px';
    document.body.appendChild(text);
    // Auto-cleanup after animation completes
    setTimeout(() => { try { text.remove() } catch(_){} }, 1400);
  }
  window.spawnEffectivenessText = spawnEffectivenessText;

  /**
   * Return CSS class fragment for move-btn (used by G13C move buttons).
   * 1.5+ → 'super-eff', 0.75- → 'resist-eff', 1.0 → ''
   */
  function getMoveEffectivenessClass(atkType, defType) {
    const m = calcTypeMult(atkType, defType);
    if (m >= 1.5) return 'super-eff';
    if (m <= 0.75) return 'resist-eff';
    return '';
  }
  window.getMoveEffectivenessClass = getMoveEffectivenessClass;

  /**
   * Play a short audio cue based on effectiveness multiplier.
   * Uses a shared AudioContext that the host game already has, or creates one.
   * Silent fallback if Web Audio unavailable.
   */
  let _effAudioCtx = null;
  function _getEffCtx() {
    if (_effAudioCtx) return _effAudioCtx;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      _effAudioCtx = new Ctx();
    } catch(_) { _effAudioCtx = null; }
    return _effAudioCtx;
  }
  function _tone(freq, dur, vol) {
    const ctx = _getEffCtx(); if (!ctx) return;
    try {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.value = vol || 0.08;
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + dur/1000);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + dur/1000);
    } catch(_) {}
  }
  function playEffectivenessSfx(mult) {
    if (mult >= 1.5) {
      _tone(660, 70, 0.08);
      setTimeout(() => _tone(880, 90, 0.09), 60);
    } else if (mult <= 0.75) {
      _tone(440, 90, 0.05);
      setTimeout(() => _tone(220, 120, 0.04), 80);
    }
  }
  window.playEffectivenessSfx = playEffectivenessSfx;

  // ── Convenience combined call for after-hit feedback ──────────────────
  // Supports an optional fourth arg `moveType` so games that have a distinct
  // move (G13C move-pool) can pass it for STAB-combo critical detection.
  function applyHitFeedback(defTargetEl, atkType, defType, moveType) {
    const m = calcTypeMult(atkType, defType);
    spawnEffectivenessText(defTargetEl, m);
    playEffectivenessSfx(m);
    // VFX layers (2026-05-04 polish + polish-round-2):
    if (m >= 1.5) {
      try { spawnScreenFlash('super') } catch(_){}
      try { spawnHitParticles(defTargetEl, atkType, 12) } catch(_){}
      try { applyDefenderShake(defTargetEl, 'super') } catch(_){}
      try { applyKnockback(defTargetEl, 'right') } catch(_){}
      try { spawnAfterglow(defTargetEl) } catch(_){}
      // CRITICAL combo: super-effective + STAB → fanfare
      // (spawnCriticalLabel auto-triggers viewport shake + emoji rain)
      if (moveType && calcStab(moveType, atkType) > 1) {
        try { spawnCriticalLabel(defTargetEl) } catch(_){}
      }
      try { spawnFirstTimeHint(defTargetEl, atkType, defType) } catch(_){}
    } else if (m <= 0.75) {
      try { applyDefenderShake(defTargetEl, 'resist') } catch(_){}
    }
    return m;
  }
  window.applyHitFeedback = applyHitFeedback;

  // ── VFX: brief screen flash on super-effective hit ────────────────────
  function spawnScreenFlash(kind) {
    // Cap concurrent flash overlays to 1 (rapid hits don't stack)
    const existing = document.querySelector('.eff-screen-flash');
    if (existing) { try { existing.remove() } catch(_){} }
    const flash = document.createElement('div');
    flash.className = 'eff-screen-flash ' + (kind === 'super' ? 'super' : 'normal');
    document.body.appendChild(flash);
    setTimeout(() => { try { flash.remove() } catch(_){} }, 320);
  }
  window.spawnScreenFlash = spawnScreenFlash;

  // ── VFX: spark/particle burst from defender on super-effective ────────
  function spawnHitParticles(targetEl, atkType, count) {
    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const color = (window.TYPE_COLOR && window.TYPE_COLOR[_norm(atkType)]) || '#fbbf24';
    const N = Math.max(6, Math.min(count || 10, 16));
    for (let i = 0; i < N; i++) {
      const p = document.createElement('div');
      p.className = 'eff-particle';
      const angle = (Math.PI * 2 * i) / N + (Math.random() * 0.4 - 0.2);
      const dist = 60 + Math.random() * 40;
      p.style.left = cx + 'px';
      p.style.top = cy + 'px';
      p.style.background = color;
      p.style.setProperty('--dx', (Math.cos(angle) * dist).toFixed(1) + 'px');
      p.style.setProperty('--dy', (Math.sin(angle) * dist).toFixed(1) + 'px');
      p.style.animationDelay = (Math.random() * 60) + 'ms';
      document.body.appendChild(p);
      setTimeout(() => { try { p.remove() } catch(_){} }, 950);
    }
  }
  window.spawnHitParticles = spawnHitParticles;

  // ── VFX: defender sprite shake (intensity per multiplier) ─────────────
  function applyDefenderShake(targetEl, intensity) {
    if (!targetEl) return;
    const cls = intensity === 'super' ? 'eff-shake-super' : 'eff-shake-resist';
    targetEl.classList.remove('eff-shake-super', 'eff-shake-resist');
    // Force reflow so re-adding triggers the animation again
    void targetEl.offsetWidth;
    targetEl.classList.add(cls);
    setTimeout(() => { try { targetEl.classList.remove(cls) } catch(_){} },
               intensity === 'super' ? 520 : 320);
  }
  window.applyDefenderShake = applyDefenderShake;

  // ── VFX: "CRITICAL!" label on super-effective + STAB combo ────────────
  function spawnCriticalLabel(targetEl) {
    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    const label = document.createElement('div');
    label.className = 'eff-critical';
    label.textContent = 'CRITICAL!';
    label.style.left = (rect.left + rect.width / 2) + 'px';
    label.style.top  = (rect.top - 28) + 'px';
    document.body.appendChild(label);
    setTimeout(() => { try { label.remove() } catch(_){} }, 1200);
    // CRITICAL also triggers viewport shake + emoji rain — full fanfare
    try { applyViewportShake() } catch(_){}
    try { spawnEmojiRain() } catch(_){}
  }
  window.spawnCriticalLabel = spawnCriticalLabel;

  // ── VFX: viewport-level shake (whole screen) ──────────────────────────
  // Subtler than the defender shake — affects the whole page, sells "weight".
  function applyViewportShake() {
    const root = document.documentElement;
    if (!root) return;
    root.classList.remove('eff-viewport-shake');
    void root.offsetWidth;
    root.classList.add('eff-viewport-shake');
    setTimeout(() => { try { root.classList.remove('eff-viewport-shake') } catch(_){} }, 380);
  }
  window.applyViewportShake = applyViewportShake;

  // ── VFX: defender knockback — sprite pushed back briefly, springs return ──
  function applyKnockback(targetEl, direction) {
    if (!targetEl) return;
    // Direction: 'left' = pushed leftward, 'right' = rightward, default right
    const cls = direction === 'left' ? 'eff-knockback-left' : 'eff-knockback-right';
    targetEl.classList.remove('eff-knockback-left', 'eff-knockback-right');
    void targetEl.offsetWidth;
    targetEl.classList.add(cls);
    setTimeout(() => { try { targetEl.classList.remove(cls) } catch(_){} }, 600);
  }
  window.applyKnockback = applyKnockback;

  // ── VFX: type emoji rain on CRITICAL ──────────────────────────────────
  // 8-10 mini type emojis briefly fall from top — confetti-style.
  function spawnEmojiRain() {
    // Cap concurrent rains to 1
    const existing = document.querySelector('.eff-emoji-rain');
    if (existing) { try { existing.remove() } catch(_){} }
    const wrap = document.createElement('div');
    wrap.className = 'eff-emoji-rain';
    const emojis = ['✨', '⭐', '💫', '🌟', '⚡', '🎉'];
    const N = 10;
    for (let i = 0; i < N; i++) {
      const p = document.createElement('span');
      p.className = 'eff-emoji-piece';
      p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      p.style.left = (5 + Math.random() * 90) + '%';
      p.style.animationDelay = (Math.random() * 200) + 'ms';
      p.style.animationDuration = (1300 + Math.random() * 500) + 'ms';
      p.style.fontSize = (14 + Math.random() * 14) + 'px';
      wrap.appendChild(p);
    }
    document.body.appendChild(wrap);
    setTimeout(() => { try { wrap.remove() } catch(_){} }, 2200);
  }
  window.spawnEmojiRain = spawnEmojiRain;

  // ── VFX: lingering golden afterglow on super-effective defender ───────
  function spawnAfterglow(targetEl) {
    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    const glow = document.createElement('div');
    glow.className = 'eff-afterglow';
    glow.style.left = (rect.left + rect.width / 2) + 'px';
    glow.style.top  = (rect.top + rect.height / 2) + 'px';
    glow.style.width = Math.max(80, rect.width * 1.1) + 'px';
    glow.style.height = Math.max(80, rect.height * 1.1) + 'px';
    document.body.appendChild(glow);
    setTimeout(() => { try { glow.remove() } catch(_){} }, 700);
  }
  window.spawnAfterglow = spawnAfterglow;

  // ── One-time educational tooltip ──────────────────────────────────────
  // "💡 [Air] mengalahkan [Api]!" — only shows ONCE per type-pair per session.
  // Reinforces the visual cue with explicit text learning.
  const _FIRST_HIT_KEY = '__dunia_eff_learned';
  // In-memory guard guards against the race where two rapid hits both
  // pass the sessionStorage check before either has written.
  const _learnedInMem = new Set();
  function _getLearned() {
    try { return JSON.parse(sessionStorage.getItem(_FIRST_HIT_KEY) || '{}') } catch(_) { return {} }
  }
  function _markLearned(atk, def) {
    _learnedInMem.add(atk + '>' + def);
    try {
      const obj = _getLearned(); obj[atk + '>' + def] = 1;
      sessionStorage.setItem(_FIRST_HIT_KEY, JSON.stringify(obj));
    } catch(_){}
  }
  function spawnFirstTimeHint(targetEl, atkType, defType) {
    const a = _norm(atkType), d = _norm(defType);
    const key = a + '>' + d;
    // Check in-memory first (synchronous, race-safe), then sessionStorage
    if (_learnedInMem.has(key)) return;
    const obj = _getLearned();
    if (obj[key]) { _learnedInMem.add(key); return; }
    _markLearned(a, d);
    const aLabel = TYPE_LABEL_ID[a] || a;
    const dLabel = TYPE_LABEL_ID[d] || d;
    const aIcon = TYPE_EMOJI[a] || '⚪';
    const dIcon = TYPE_EMOJI[d] || '⚪';
    const hint = document.createElement('div');
    hint.className = 'eff-learn-hint';
    hint.innerHTML = `<span class="elh-bulb">💡</span><span class="elh-icon">${aIcon}</span> <span class="elh-label">${aLabel}</span> <span class="elh-vs">mengalahkan</span> <span class="elh-icon">${dIcon}</span> <span class="elh-label">${dLabel}</span><span class="elh-burst">!</span>`;
    document.body.appendChild(hint);
    // Position centered horizontally near top — short 1.8s window so the
    // hint reinforces without blocking the battle action zone.
    setTimeout(() => { try { hint.classList.add('show') } catch(_){} }, 50);
    setTimeout(() => { try { hint.classList.remove('show'); hint.classList.add('hide') } catch(_){} }, 1500);
    setTimeout(() => { try { hint.remove() } catch(_){} }, 1900);
  }
  window.spawnFirstTimeHint = spawnFirstTimeHint;

  // ── Pre-battle counter hint (for G13B bag picker, G13C trainer reveal) ─
  // Returns up to N Pokemon from a pool that are SUPER-EFFECTIVE vs a defender.
  function findCounters(pool, defType, max) {
    const d = _norm(defType);
    const out = [];
    (pool || []).forEach((p, i) => {
      const atk = _norm(p && p.type);
      const m = calcTypeMult(atk, d);
      if (m >= 1.5) out.push({ pokemon: p, index: i, mult: m });
    });
    out.sort((a, b) => b.mult - a.mult);
    return out.slice(0, max || 3);
  }
  window.findCounters = findCounters;

  // Returns simple chip HTML for "🎯 Counter: 💧 ⚡" (used in trainer reveal)
  function getCounterHintHTML(defType) {
    const weak = getWeaknesses(defType, 2);
    if (!weak.length) return '';
    const icons = weak.map(t => `<span class="tch-icon">${TYPE_EMOJI[t]||'⚪'}</span>`).join('');
    return `<span class="tch-label">🎯 Counter:</span>${icons}`;
  }
  window.getCounterHintHTML = getCounterHintHTML;

  // Pokemon name with type emoji prefix — used in HP cards / bag labels
  function typeEmojiPrefix(type) {
    return TYPE_EMOJI[_norm(type)] || '⚪';
  }
  window.typeEmojiPrefix = typeEmojiPrefix;

})();
