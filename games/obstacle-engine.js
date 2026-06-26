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
    return _approach(def).then(() => _interact(def, opts || {})).then(result => {
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

  // ── Internal: approach (slow down + zoom) ───────────────────────────────────

  function _approach(def) {
    if (_gameAPI && _gameAPI.slowDown) _gameAPI.slowDown(0.3, 500)
    if (def.visual && def.visual.cameraZoom && _gameAPI && _gameAPI.cameraZoom) {
      _gameAPI.cameraZoom(1.15, 600)
    }
    const dur = reducedMotion() ? 200 : 500
    return new Promise(r => setTimeout(r, dur))
  }

  // ── Internal: interact (one full attempt) ───────────────────────────────────

  function _interact(def, opts) {
    if (_gameAPI && _gameAPI.pauseTick) _gameAPI.pauseTick()
    _showOverlay()

    return new Promise(resolve => {
      const ctx = {
        body: _overlay.body,
        retryCount: 0,
        hintLevel: 0,
        mode: _mode,
        questionData: def.questionRequired ? _pickQuestion(def) : null,
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
          _success(def, finish)
        },
        fail: () => {
          ctx.retryCount++
          _state.recentFails++
          _state.recentWins = 0
          _fail(def, ctx, callbacks, finish)
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

  function _success(def, done) {
    // Visual: green target flash + sparkle
    if (def.successFx) try { def.successFx(_overlay.body) } catch (e) { console.warn(e) }

    if (_gameAPI && _gameAPI.awardReward) {
      try { _gameAPI.awardReward(def.reward, def.id) } catch (e) { console.warn(e) }
    }

    // Tone
    if (typeof global.playTone === 'function' && def.reward && def.reward.sound) {
      try {
        global.playTone({ freq: 880, dur: 0.10, vol: 0.10 })
        setTimeout(() => global.playTone({ freq: 1175, dur: 0.14, vol: 0.10 }), 80)
      } catch {}
    }

    _hideOverlay(() => {
      if (_gameAPI && _gameAPI.resumeTick) _gameAPI.resumeTick()
      if (_gameAPI && _gameAPI.resumeSpeed) _gameAPI.resumeSpeed()
      if (_gameAPI && _gameAPI.cameraZoom) _gameAPI.cameraZoom(1.0, 350)
      done('success')
    })
  }

  // ── Internal: fail (with hint cascade + auto-help) ──────────────────────────

  function _fail(def, ctx, callbacks, done) {
    // Hard mode: HP decrement on each wrong tap (gentle, capped at 1)
    if (_mode === 'hard' && _gameAPI && _gameAPI.takeHP) {
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
    root.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:2000',
      'pointer-events:none', 'display:none',
      'align-items:flex-end', 'justify-content:center',
      'padding-bottom:max(20px, env(safe-area-inset-bottom))',
      "font-family:'Fredoka One','Comic Sans MS',system-ui,sans-serif",
      'background:rgba(15,23,42,0.32)', 'backdrop-filter:blur(2px)',
    ].join(';')

    const body = document.createElement('div')
    body.className = 'obstacle-engine-body'
    body.style.cssText = [
      'width:min(95vw,640px)', 'max-height:60vh', 'overflow:auto',
      'background:linear-gradient(180deg,#fef3c7 0%,#fed7aa 100%)',
      'border:4px solid #fbbf24', 'border-radius:24px',
      'padding:20px 24px 24px',
      'box-shadow:0 10px 40px rgba(0,0,0,0.4)',
      'pointer-events:auto', 'position:relative',
      'transform:translateY(120%)',
      'transition:transform 0.45s cubic-bezier(0.34,1.56,0.64,1)',
    ].join(';')

    const hint = document.createElement('div')
    hint.className = 'obstacle-engine-hint'
    hint.style.cssText = [
      'position:absolute', 'top:-36px', 'left:50%',
      'transform:translateX(-50%)',
      'background:linear-gradient(135deg,#1976d2,#0d47a1)', 'color:white',
      'padding:8px 18px', 'border-radius:18px',
      'font-size:15px', 'font-weight:700', 'white-space:nowrap',
      'opacity:0', 'transition:opacity 0.3s',
      'box-shadow:0 4px 12px rgba(0,0,0,0.3)',
      'pointer-events:none',
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
      _overlay.body.style.transform = 'translateY(0)'
    })
  }

  function _hideOverlay(done) {
    if (!_overlay) { done && done(); return }
    _overlay.body.style.transform = 'translateY(120%)'
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
    _overlay.body.innerHTML = ''
    _overlay.body.appendChild(keep)
    _overlay.hint.style.opacity = 0
    _overlay.hint.textContent = ''
  }

  function _showHint(level, customMsg, def) {
    if (!_overlay) return
    const messages = (def && def.hints) || ['Coba lagi! 🌟', 'Cek warna yang sama! ✨', 'Hampir betul, ayo bisa! 💫']
    const idx = Math.max(0, Math.min(level - 1, messages.length - 1))
    const msg = customMsg || messages[idx]
    _overlay.hint.textContent = msg
    _overlay.hint.style.opacity = 1

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
        font-size: clamp(18px, 4.5vw, 26px);
        text-align: center; color: #6b3410;
        font-weight: 900; margin: 4px 0 12px;
        text-shadow: 0 1px 0 rgba(255,255,255,0.8);
      }
      .obstacle-engine-subtitle {
        font-size: clamp(13px, 3.2vw, 15px);
        text-align: center; color: #92400e;
        margin-bottom: 8px;
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
        .obstacle-engine-target-pulse, .obstacle-engine-shape-btn.wrong {
          animation: none !important; transition: none !important;
        }
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

  // ── Voice prompt (Web Speech, silent fallback) ─────────────────────────────

  function speak(text) {
    try {
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
    spawnSparkles, speak, reducedMotion,
    _registry: REGISTRY,
    _state: _state,
  }

})(typeof window !== 'undefined' ? window : globalThis);
