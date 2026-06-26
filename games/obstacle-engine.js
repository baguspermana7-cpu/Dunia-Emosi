/* =============================================================================
 * obstacle-engine.js  (v54.69 foundation)
 * =============================================================================
 * Child-friendly modular obstacle system for train games (age 4-7).
 * Registry-based: each obstacle is a JSON-config + interaction handler.
 *
 * Public API:
 *   ObstacleEngine.register(id, def) — register an obstacle type
 *   ObstacleEngine.attach(gameAPI)   — bind to a game's pause/reward/HP hooks
 *   ObstacleEngine.spawn(id, opts)   — trigger an obstacle (returns Promise)
 *   ObstacleEngine.getMode()         — 'easy' | 'hard' (default 'easy')
 *   ObstacleEngine.setMode(m)        — persist mode in localStorage
 *
 * Soft-fail (default for Easy mode):
 *   - 3-retry hint cascade (outline glow → slot pulse → auto-help completion)
 *   - HP never decremented on puzzle fail in Easy mode
 *   - "Great teamwork!" auto-help on retry 3 (kids never get stuck)
 *
 * Hard mode:
 *   - HP decrement on each wrong tap (matches current G14 behavior)
 *   - Auto-help still kicks in at retry 3 (kindness clamp)
 *
 * Spec source: /home/baguspermana7/Documents/2.txt §21 JSON schema.
 * ========================================================================== */

;(function (global) {
  'use strict'

  const VERSION = 'v54.69-foundation'
  const REGISTRY = Object.create(null)

  let _activeId = null
  let _gameAPI = null
  let _overlay = null
  let _mode = (() => {
    try { return localStorage.getItem('train-game-mode') || 'easy' } catch { return 'easy' }
  })()
  let _state = { recentFails: 0, recentWins: 0 }

  // ── Reduce-motion gate ──────────────────────────────────────────────────────

  function reducedMotion() {
    try {
      if (localStorage.getItem('train-reduce-motion') === '1') return true
      return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch { return false }
  }

  // ── Public: register ────────────────────────────────────────────────────────

  function register(id, def) {
    if (!id || typeof def !== 'object') {
      console.warn('[ObstacleEngine] register: bad args', id, def)
      return
    }
    if (REGISTRY[id]) console.warn('[ObstacleEngine] re-register', id)
    REGISTRY[id] = Object.freeze({
      id,
      type: def.type || 'unknown',
      difficulty: def.difficulty != null ? def.difficulty : 1,
      ageRange: def.ageRange || '4-7',
      allowedLocations: def.allowedLocations || ['*'],
      allowedJourneyPhases: def.allowedJourneyPhases || ['*'],
      requiredAction: def.requiredAction || 'tap',
      questionRequired: !!def.questionRequired,
      questionCategory: def.questionCategory || null,
      timeLimit: def.timeLimit || null,
      softFail: def.softFail !== false,
      maxRetry: def.maxRetry != null ? def.maxRetry : 3,
      reward: def.reward || { coins: 5, badgeProgress: 1, sound: 'success_chime' },
      visual: def.visual || {},
      accessibility: def.accessibility || { voicePrompt: true, largeTouchTarget: true, reducedMotion: true },
      interaction: def.interaction || { setup: () => {}, teardown: () => {} },
      successFx: def.successFx || null,
      failFx: def.failFx || null,
      title: def.title || '',
      hints: def.hints || ['Coba lagi! 🌟', 'Cek warna yang sama! ✨', 'Hampir betul, ayo bisa! 💫'],
    })
  }

  // ── Public: attach to game ──────────────────────────────────────────────────

  function attach(gameAPI) {
    _gameAPI = gameAPI || {}
    if (!_overlay) _overlay = _buildOverlay()
  }

  // ── Public: spawn an obstacle ───────────────────────────────────────────────

  function spawn(typeId, opts) {
    const def = REGISTRY[typeId]
    if (!def) {
      console.warn('[ObstacleEngine] spawn: unknown', typeId)
      return Promise.resolve('unknown')
    }
    if (_activeId) {
      console.warn('[ObstacleEngine] spawn: already active', _activeId)
      return Promise.resolve('busy')
    }

    _activeId = typeId
    // v54.81: standalone mode — Practice from gallery. Skip gameAPI hooks.
    const standalone = opts && opts.standalone === true
    return _approach(def, standalone).then(() => _interact(def, opts || {}, standalone)).then(result => {
      _activeId = null
      return result
    })
  }

  // ── Public: mode ────────────────────────────────────────────────────────────

  function getMode() { return _mode }

  function setMode(m) {
    if (m !== 'easy' && m !== 'hard') return
    _mode = m
    try { localStorage.setItem('train-game-mode', m) } catch {}
  }

  // ── v54.75: Age preset (4 / 5 / 6 / 7) ──────────────────────────────────────

  let _agePreset = (() => {
    try { return localStorage.getItem('train-age-preset') || '5' } catch { return '5' }
  })()
  function getAgePreset() { return _agePreset }
  function setAgePreset(a) {
    if (!['4','5','6','7'].includes(String(a))) return
    _agePreset = String(a)
    try { localStorage.setItem('train-age-preset', _agePreset) } catch {}
  }

  // ── v54.75: High-contrast mode ──────────────────────────────────────────────

  let _highContrast = (() => {
    try { return localStorage.getItem('train-high-contrast') === '1' } catch { return false }
  })()
  function getHighContrast() { return _highContrast }
  function setHighContrast(v) {
    _highContrast = !!v
    try { localStorage.setItem('train-high-contrast', _highContrast ? '1' : '0') } catch {}
    _applyHighContrastClass()
  }
  function _applyHighContrastClass() {
    if (typeof document === 'undefined') return
    document.documentElement.classList.toggle('obstacle-engine-highcontrast', _highContrast)
  }

  // ── v54.75: Adaptive difficulty picker hint ────────────────────────────────

  // Given current state, returns a tier hint (1-4) the picker should bias toward.
  // recentFails >= 2 → bias down to tier 1 (easier).
  // recentWins  >= 5 → bias up by 1 tier.
  function suggestedDifficulty(baseTier) {
    let tier = baseTier || 2
    if (_state.recentFails >= 2) tier = Math.max(1, tier - 1)
    if (_state.recentWins  >= 5) tier = Math.min(4, tier + 1)
    return tier
  }

  // Filter registry by age + suggested tier. Returns list of obstacle IDs.
  // Falls back to full registry if filter yields zero matches.
  function pickAdaptiveCandidates(opts) {
    const list = []
    const ageKey = (opts && opts.age) || _agePreset
    const tier = suggestedDifficulty((opts && opts.baseTier) || 2)
    Object.keys(REGISTRY).forEach(id => {
      const def = REGISTRY[id]
      if (!def) return
      const ageRange = def.ageRange || '4-7'
      const [lo, hi] = ageRange.split('-').map(s => parseInt(s, 10))
      const ageNum = parseInt(ageKey, 10)
      const ageOK = !isNaN(ageNum) && ageNum >= lo && ageNum <= hi
      if (!ageOK) return
      // Allow tier ±1 around suggested
      if (Math.abs((def.difficulty || 1) - tier) <= 1) list.push(id)
    })
    if (list.length === 0) return Object.keys(REGISTRY)
    return list
  }

  // ── Internal: approach (slow down + zoom) ───────────────────────────────────

  function _approach(def, standalone) {
    if (!standalone && _gameAPI && _gameAPI.slowDown) _gameAPI.slowDown(0.3, 500)
    if (!standalone && def.visual && def.visual.cameraZoom && _gameAPI && _gameAPI.cameraZoom) {
      _gameAPI.cameraZoom(1.15, 600)
    }
    const dur = reducedMotion() ? 200 : 500
    return new Promise(r => setTimeout(r, dur))
  }

  // ── Internal: interact (one full attempt) ───────────────────────────────────

  function _interact(def, opts, standalone) {
    if (!standalone && _gameAPI && _gameAPI.pauseTick) _gameAPI.pauseTick()
    _showOverlay()

    return new Promise(resolve => {
      const ctx = {
        body: _overlay.body,
        retryCount: 0,
        hintLevel: 0,
        mode: _mode,
        questionData: def.questionRequired ? _pickQuestion(def) : null,
        standalone: !!standalone, // v54.81
      }

      let resolved = false
      const finish = (outcome) => {
        if (resolved) return
        resolved = true
        try { def.interaction.teardown && def.interaction.teardown(ctx) } catch (e) { console.warn(e) }
        _clearOverlayBody()
        resolve(outcome)
      }

      const callbacks = {
        success: () => {
          _state.recentWins++
          _state.recentFails = 0
          _success(def, finish, standalone)
        },
        fail: () => {
          ctx.retryCount++
          _state.recentFails++
          _state.recentWins = 0
          _fail(def, ctx, callbacks, finish, standalone)
        },
        hint: (msg) => _showHint(ctx.retryCount, msg, def),
      }

      try {
        def.interaction.setup(ctx, callbacks)
      } catch (e) {
        console.error('[ObstacleEngine] interaction setup error', e)
        finish('error')
      }
    })
  }

  // ── Internal: success ───────────────────────────────────────────────────────

  function _success(def, done, standalone) {
    // Visual: green target flash + sparkle
    if (def.successFx) try { def.successFx(_overlay.body) } catch (e) { console.warn(e) }

    if (!standalone && _gameAPI && _gameAPI.awardReward) {
      try { _gameAPI.awardReward(def.reward, def.id) } catch (e) { console.warn(e) }
    }

    // v54.75: persist sticker / badge / hornUnlock rewards to localStorage
    // v54.78: also fire earn toast via RewardGallery
    try {
      if (def.reward && def.reward.sticker) {
        const wasNew = !_storageListContains('train-stickers', def.reward.sticker)
        _addToStorageList('train-stickers', def.reward.sticker)
        if (wasNew && global.RewardGallery) global.RewardGallery.toastEarn('sticker', def.reward.sticker)
      }
      if (def.reward && def.reward.badge) {
        const wasNew = !_storageListContains('train-badges', def.reward.badge)
        _addToStorageList('train-badges', def.reward.badge)
        if (wasNew && global.RewardGallery) global.RewardGallery.toastEarn('badge', def.reward.badge)
      }
      if (def.reward && def.reward.hornUnlock) {
        const wasNew = !_storageListContains('train-horn-unlocks', def.reward.hornUnlock)
        _addToStorageList('train-horn-unlocks', def.reward.hornUnlock)
        if (wasNew && global.RewardGallery) global.RewardGallery.toastEarn('horn', def.reward.hornUnlock)
      }
    } catch (e) { console.warn(e) }

    // Tone
    if (typeof global.playTone === 'function' && def.reward && def.reward.sound) {
      try {
        global.playTone({ freq: 880, dur: 0.10, vol: 0.10 })
        setTimeout(() => global.playTone({ freq: 1175, dur: 0.14, vol: 0.10 }), 80)
      } catch {}
    }

    _hideOverlay(() => {
      if (!standalone && _gameAPI && _gameAPI.resumeTick) _gameAPI.resumeTick()
      if (!standalone && _gameAPI && _gameAPI.resumeSpeed) _gameAPI.resumeSpeed()
      if (!standalone && _gameAPI && _gameAPI.cameraZoom) _gameAPI.cameraZoom(1.0, 350)
      done('success')
    })
  }

  // ── Internal: fail (with hint cascade + auto-help) ──────────────────────────

  function _fail(def, ctx, callbacks, done, standalone) {
    // Hard mode: HP decrement on each wrong tap (gentle, capped at 1)
    if (!standalone && _mode === 'hard' && _gameAPI && _gameAPI.takeHP) {
      try { _gameAPI.takeHP(1) } catch {}
    }

    if (ctx.retryCount < def.maxRetry) {
      // Show hint + retry
      _showHint(ctx.retryCount, null, def)
      if (typeof global.playTone === 'function') {
        try { global.playTone({ freq: 300, dur: 0.12, vol: 0.10 }) } catch {}
      }
      // The interaction handler should listen for ctx.retryCount changes via callbacks.hint,
      // but our default flow allows the user to try the SAME setup again.
      // No-op here; the in-place buttons remain interactive.
    } else {
      // Auto-help: complete for the player with "Great teamwork!" message
      _showHint(3, '🎉 Hebat, kita berhasil bersama! 🎉', def)
      setTimeout(() => {
        callbacks.success()
      }, 1200)
    }
  }

  // ── Overlay DOM ─────────────────────────────────────────────────────────────

  function _buildOverlay() {
    if (!document.body) {
      console.warn('[ObstacleEngine] _buildOverlay: document.body not ready')
      return null
    }

    const root = document.createElement('div')
    root.id = 'obstacle-engine-overlay'
    // v54.79: cinematic backdrop — soft radial vignette + warm ambient gradient
    root.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:2000',
      'pointer-events:none', 'display:none',
      'align-items:flex-end', 'justify-content:center',
      'padding-bottom:max(20px, env(safe-area-inset-bottom))',
      "font-family:'Fredoka One','Comic Sans MS',system-ui,sans-serif",
      'background:radial-gradient(ellipse at 50% 60%, rgba(15,23,42,0.18) 0%, rgba(15,23,42,0.55) 100%)',
      'backdrop-filter:blur(3px)',
    ].join(';')

    // v54.79: floating sparkle layer (decorative, pointer-events:none)
    const sparkleLayer = document.createElement('div')
    sparkleLayer.className = 'obstacle-engine-sparkle-layer'
    sparkleLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;'
    for (let i = 0; i < 12; i++) {
      const s = document.createElement('div')
      const dur = 6 + Math.random() * 6
      const delay = -Math.random() * 6
      const left = Math.random() * 100
      s.style.cssText = `position:absolute;left:${left}%;top:110%;font-size:${12 + Math.random()*14}px;opacity:${0.4 + Math.random()*0.4};animation:obstacle-sparkle-float ${dur}s linear ${delay}s infinite;`
      s.textContent = ['✨','⭐','🌟','💫'][Math.floor(Math.random() * 4)]
      sparkleLayer.appendChild(s)
    }
    root.appendChild(sparkleLayer)

    const body = document.createElement('div')
    body.className = 'obstacle-engine-body'
    // v54.79: cream + amber card with subtle inner cap + train silhouette ribbon
    body.style.cssText = [
      'width:min(95vw,640px)', 'max-height:62vh', 'overflow:auto',
      'background:linear-gradient(180deg,#fffbeb 0%,#fef3c7 50%,#fde68a 100%)',
      'border:5px solid #f59e0b', 'border-radius:26px',
      'padding:22px 24px 26px',
      'box-shadow:0 14px 50px rgba(0,0,0,0.45), inset 0 4px 12px rgba(255,255,255,0.6)',
      'pointer-events:auto', 'position:relative',
      'transform:translateY(120%) scale(0.94)',
      'transition:transform 0.48s cubic-bezier(0.34,1.56,0.64,1)',
    ].join(';')

    // v54.79: train silhouette ribbon at card top
    const ribbon = document.createElement('div')
    ribbon.className = 'obstacle-engine-ribbon'
    ribbon.style.cssText = 'position:absolute;top:-2px;left:0;right:0;height:14px;background:linear-gradient(90deg,#f59e0b 0%,#fbbf24 25%,#fcd34d 50%,#fbbf24 75%,#f59e0b 100%);border-radius:24px 24px 0 0;display:flex;align-items:center;justify-content:center;font-size:10px;letter-spacing:1px;'
    ribbon.innerHTML = '<span style="font-size:14px;line-height:1">🚂 🚃 🚃 🚃</span>'
    body.appendChild(ribbon)

    // v54.79: hint pill with subtle bob animation + better palette
    const hint = document.createElement('div')
    hint.className = 'obstacle-engine-hint'
    hint.style.cssText = [
      'position:absolute', 'top:-40px', 'left:50%',
      'transform:translateX(-50%)',
      'background:linear-gradient(135deg,#7c3aed,#6d28d9)',
      'color:white',
      'padding:9px 20px', 'border-radius:22px',
      'font-size:15px', 'font-weight:900', 'white-space:nowrap',
      'opacity:0', 'transition:opacity 0.32s',
      'box-shadow:0 6px 18px rgba(124,58,237,0.5)',
      'border:2px solid rgba(255,255,255,0.5)',
      'pointer-events:none', 'letter-spacing:0.2px',
    ].join(';')

    body.appendChild(hint)
    root.appendChild(body)
    document.body.appendChild(root)

    _injectStyles()

    return { root, body, hint }
  }

  function _showOverlay() {
    if (!_overlay) return
    _overlay.root.style.display = 'flex'
    _overlay.root.style.pointerEvents = 'auto'
    requestAnimationFrame(() => {
      _overlay.body.style.transform = 'translateY(0) scale(1)'
    })
  }

  function _hideOverlay(done) {
    if (!_overlay) { done && done(); return }
    _overlay.body.style.transform = 'translateY(120%) scale(0.94)'
    setTimeout(() => {
      _overlay.root.style.display = 'none'
      _overlay.root.style.pointerEvents = 'none'
      _clearOverlayBody()
      done && done()
    }, reducedMotion() ? 100 : 450)
  }

  function _clearOverlayBody() {
    if (!_overlay) return
    const keep = _overlay.hint
    const ribbon = _overlay.body.querySelector('.obstacle-engine-ribbon')
    _overlay.body.innerHTML = ''
    if (ribbon) _overlay.body.appendChild(ribbon)
    _overlay.body.appendChild(keep)
    _overlay.hint.style.opacity = 0
    _overlay.hint.textContent = ''
    _overlay.hint.style.animation = '' // v54.79: clear bob
  }

  function _showHint(level, customMsg, def) {
    if (!_overlay) return
    const messages = (def && def.hints) || ['Coba lagi! 🌟', 'Cek warna yang sama! ✨', 'Hampir betul, ayo bisa! 💫']
    const idx = Math.max(0, Math.min(level - 1, messages.length - 1))
    const msg = customMsg || messages[idx]
    _overlay.hint.textContent = msg
    _overlay.hint.style.opacity = 1
    // v54.79: bob animation while hint is visible (cleared on next hide)
    if (!reducedMotion()) {
      _overlay.hint.style.animation = 'obstacle-hint-bob 1.2s ease-in-out infinite'
    }

    // Escalate: pulse the target slot on retry >= 2
    if (level >= 2) {
      const targets = _overlay.body.querySelectorAll('.obstacle-engine-target')
      targets.forEach(t => { t.classList.add('obstacle-engine-target-pulse') })
    }
  }

  function _pickQuestion(def) {
    const pool = global.KidsQuestions || []
    const tag = def.questionCategory || 'shape'
    const matched = pool.filter(q => Array.isArray(q.tags) && q.tags.includes(tag))
    if (matched.length === 0) return null
    return matched[Math.floor(Math.random() * matched.length)]
  }

  // ── Inject keyframes + child-friendly UI rules ─────────────────────────────

  function _injectStyles() {
    if (document.querySelector('#obstacle-engine-styles')) return
    const style = document.createElement('style')
    style.id = 'obstacle-engine-styles'
    style.textContent = `
      @keyframes obstacle-target-pulse {
        0%   { transform: scale(1);    box-shadow: 0 0 10px rgba(251,191,36,0.5); }
        100% { transform: scale(1.08); box-shadow: 0 0 22px rgba(251,191,36,0.95); }
      }
      @keyframes obstacle-sparkle {
        0%   { transform: scale(0.4) rotate(0deg);   opacity: 1; }
        100% { transform: scale(1.6) rotate(180deg); opacity: 0; }
      }
      /* v54.79 — floating sparkle background that drifts upward continuously */
      @keyframes obstacle-sparkle-float {
        0%   { transform: translateY(0) rotate(0deg);   opacity: 0; }
        10%  { opacity: 1; }
        90%  { opacity: 1; }
        100% { transform: translateY(-130vh) rotate(360deg); opacity: 0; }
      }
      @keyframes obstacle-hint-bob {
        0%, 100% { transform: translateX(-50%) translateY(0); }
        50%      { transform: translateX(-50%) translateY(-4px); }
      }
      .obstacle-engine-target-pulse {
        animation: obstacle-target-pulse 0.6s ease-in-out infinite alternate;
      }
      .obstacle-engine-target {
        min-width: 96px; min-height: 96px;
        border: 5px dashed #fbbf24; border-radius: 18px;
        display: inline-flex; align-items: center; justify-content: center;
        background: rgba(251,191,36,0.12);
        font-size: 56px; margin: 6px;
        color: #6b3410;
      }
      .obstacle-engine-shape-btn {
        min-width: 88px; min-height: 88px;
        background: white;
        border: 5px solid #1976d2;
        border-radius: 16px;
        cursor: pointer; touch-action: manipulation; user-select: none;
        font-size: 52px; line-height: 1;
        display: inline-flex; align-items: center; justify-content: center;
        transition: transform 0.18s, background 0.18s, border-color 0.18s;
        margin: 6px;
        color: #1565c0;
        font-family: inherit;
        padding: 4px;
      }
      .obstacle-engine-shape-btn:active {
        transform: scale(0.94);
      }
      .obstacle-engine-shape-btn.correct {
        background: #dcfce7 !important;
        border-color: #16a34a !important;
        color: #166534 !important;
      }
      .obstacle-engine-shape-btn.wrong {
        background: #fecaca !important;
        border-color: #ef4444 !important;
        color: #991b1b !important;
        animation: obstacle-shake 0.4s ease-in-out;
      }
      @keyframes obstacle-shake {
        0%,100% { transform: translateX(0); }
        25%     { transform: translateX(-6px); }
        75%     { transform: translateX( 6px); }
      }
      .obstacle-engine-row {
        display: flex; flex-wrap: wrap;
        justify-content: center; gap: 8px;
        padding: 10px 0;
      }
      .obstacle-engine-title {
        font-size: clamp(20px, 5vw, 28px);
        text-align: center; color: #5a2a00;
        font-weight: 900; margin: 16px 0 8px;
        text-shadow: 0 2px 0 rgba(255,255,255,0.85);
        letter-spacing: 0.3px;
      }
      .obstacle-engine-subtitle {
        font-size: clamp(13px, 3.4vw, 15px);
        text-align: center; color: #92400e;
        margin-bottom: 10px;
        font-weight: 700;
      }
      .obstacle-engine-sparkle {
        position: absolute; pointer-events: none;
        width: 32px; height: 32px;
        background: radial-gradient(circle, #fff7c0 0%, #fbbf24 50%, transparent 70%);
        border-radius: 50%;
        animation: obstacle-sparkle 0.9s ease-out forwards;
      }
      @media (prefers-reduced-motion: reduce) {
        .obstacle-engine-body, .obstacle-engine-shape-btn, .obstacle-engine-target,
        .obstacle-engine-target-pulse, .obstacle-engine-shape-btn.wrong,
        .obstacle-engine-sparkle-layer * /* v54.79 */ {
          animation: none !important; transition: none !important;
        }
        .obstacle-engine-sparkle-layer { display: none !important; }
      }
      /* v54.75: high-contrast outline mode (accessibility) */
      .obstacle-engine-highcontrast .obstacle-engine-body {
        background: #fff !important;
        border-color: #000 !important;
        border-width: 6px !important;
      }
      .obstacle-engine-highcontrast .obstacle-engine-shape-btn {
        background: #fff !important;
        border-color: #000 !important;
        border-width: 6px !important;
        color: #000 !important;
      }
      .obstacle-engine-highcontrast .obstacle-engine-shape-btn.correct {
        background: #16a34a !important;
        color: #fff !important;
        border-color: #052e16 !important;
      }
      .obstacle-engine-highcontrast .obstacle-engine-shape-btn.wrong {
        background: #dc2626 !important;
        color: #fff !important;
        border-color: #450a0a !important;
      }
      .obstacle-engine-highcontrast .obstacle-engine-target {
        background: #fff !important;
        border-color: #000 !important;
        border-width: 6px !important;
        color: #000 !important;
      }
      .obstacle-engine-highcontrast .obstacle-engine-title {
        color: #000 !important;
        text-shadow: none !important;
      }
    `
    document.head.appendChild(style)
  }

  // ── Spawn a quick success sparkle burst at element center ──────────────────

  function spawnSparkles(el, count) {
    if (!el || reducedMotion()) return
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    for (let i = 0; i < (count || 6); i++) {
      const s = document.createElement('div')
      s.className = 'obstacle-engine-sparkle'
      const angle = Math.random() * Math.PI * 2
      const dist = 40 + Math.random() * 60
      s.style.left = (cx + Math.cos(angle) * dist - 16) + 'px'
      s.style.top  = (cy + Math.sin(angle) * dist - 16) + 'px'
      document.body.appendChild(s)
      setTimeout(() => s.remove(), 900)
    }
  }

  // ── v54.75: localStorage list helpers (stickers, badges, horn unlocks) ─────

  function _addToStorageList(key, item) {
    try {
      const raw = localStorage.getItem(key) || '[]'
      const list = JSON.parse(raw)
      if (!Array.isArray(list)) return
      if (!list.includes(item)) {
        list.push(item)
        localStorage.setItem(key, JSON.stringify(list))
      }
    } catch (e) { console.warn('[OE] list write fail', key, e) }
  }
  // v54.78: check membership without mutation (for earn-toast dedup)
  function _storageListContains(key, item) {
    try {
      const raw = localStorage.getItem(key) || '[]'
      const list = JSON.parse(raw)
      return Array.isArray(list) && list.includes(item)
    } catch { return false }
  }
  // Exposed as public helper so route runners can write rewards via the engine
  // instead of duplicating the JSON-list logic. v54.76.

  function getStickers()    { try { return JSON.parse(localStorage.getItem('train-stickers')    || '[]') } catch { return [] } }
  function getBadges()      { try { return JSON.parse(localStorage.getItem('train-badges')      || '[]') } catch { return [] } }
  function getHornUnlocks() { try { return JSON.parse(localStorage.getItem('train-horn-unlocks')|| '[]') } catch { return [] } }

  // ── Voice prompt (Web Speech, silent fallback) ─────────────────────────────

  function speak(text) {
    try {
      // v54.84: voice-on toggle (default: true). Skip if user muted via settings.
      const voiceOn = localStorage.getItem('train-voice-on')
      if (voiceOn === '0' || voiceOn === 'false') return
      if (!window.speechSynthesis || !text) return
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'id-ID'
      u.rate = 0.9
      u.pitch = 1.1
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(u)
    } catch {}
  }

  // ── Expose ─────────────────────────────────────────────────────────────────

  global.ObstacleEngine = {
    VERSION,
    register, attach, spawn,
    getMode, setMode,
    // v54.75
    getAgePreset, setAgePreset,
    getHighContrast, setHighContrast,
    suggestedDifficulty, pickAdaptiveCandidates,
    getStickers, getBadges, getHornUnlocks,
    _addToStorageList, // v54.76 — exposed for route runners
    spawnSparkles, speak, reducedMotion,
    _registry: REGISTRY,
    _state: _state,
  }

  // Apply persisted high-contrast on load
  try {
    if (typeof document !== 'undefined') {
      if (document.readyState !== 'loading') _applyHighContrastClass()
      else document.addEventListener('DOMContentLoaded', _applyHighContrastClass)
    }
  } catch {}

})(typeof window !== 'undefined' ? window : globalThis);
