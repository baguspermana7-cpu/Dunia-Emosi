/* =============================================================================
 * settings-modal.js  (v54.84 — consolidated Pengaturan modal)
 * =============================================================================
 * Single ⚙️ Pengaturan modal replacing the inline row of Mode/Age/HC toggles.
 *
 * Controls exposed:
 *   - Mode (Easy / Hard)
 *   - Usia (4 / 5 / 6 / 7)
 *   - Kontras tinggi (on / off)
 *   - Suara petunjuk (voice prompt mute / on)  — NEW v54.84
 *   - Reduce motion (on / off)                 — NEW v54.84
 *
 * Public API:
 *   SettingsModal.open()
 *   SettingsModal.close()
 *
 * Uses ObstacleEngine getters/setters where applicable.
 * Persists voice/reduce-motion preferences to localStorage directly.
 * ========================================================================== */

;(function (global) {
  'use strict'

  const VERSION = 'v54.84-settings-modal'
  let _root = null

  function _injectStyles() {
    if (document.querySelector('#settings-modal-styles')) return
    const style = document.createElement('style')
    style.id = 'settings-modal-styles'
    style.textContent = `
      #settings-modal-overlay {
        position: fixed; inset: 0; z-index: 3500;
        background: rgba(15,23,42,0.7); backdrop-filter: blur(4px);
        display: none; align-items: center; justify-content: center;
        font-family: 'Fredoka One', 'Comic Sans MS', system-ui, sans-serif;
      }
      #settings-modal-overlay.show { display: flex; }
      .settings-modal-card {
        width: min(92vw, 520px); max-height: 85vh; overflow-y: auto;
        background: linear-gradient(180deg, #f0f9ff 0%, #dbeafe 100%);
        border: 5px solid #3b82f6; border-radius: 26px;
        padding: 22px 28px 28px;
        box-shadow: 0 14px 50px rgba(0,0,0,0.4);
        transform: translateY(20px) scale(0.96);
        transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      #settings-modal-overlay.show .settings-modal-card { transform: translateY(0) scale(1); }
      .settings-modal-header {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 18px;
      }
      .settings-modal-title {
        font-size: clamp(22px, 5vw, 28px); color: #1e3a8a; font-weight: 900;
        text-shadow: 0 2px 0 rgba(255,255,255,0.7);
      }
      .settings-modal-close {
        background: linear-gradient(135deg, #f87171, #dc2626);
        color: #fff; border: 0; border-radius: 14px;
        font-size: 16px; font-weight: 900; cursor: pointer;
        padding: 10px 14px; min-width: 80px; min-height: 44px;
        font-family: inherit; box-shadow: 0 4px 0 rgba(127,29,29,0.5);
      }
      .settings-modal-section {
        margin: 14px 0 10px;
      }
      .settings-modal-label {
        font-size: clamp(14px, 3.6vw, 16px);
        color: #1e3a8a; font-weight: 900; margin-bottom: 8px;
      }
      .settings-modal-desc {
        font-size: 12px; color: #475569; margin-bottom: 8px; line-height: 1.3;
      }
      .settings-modal-options {
        display: flex; gap: 8px; flex-wrap: wrap;
      }
      .settings-modal-opt {
        background: rgba(255,255,255,0.7); border: 3px solid rgba(30,58,138,0.2);
        border-radius: 14px; color: #1e3a8a;
        padding: 10px 16px; font-family: inherit;
        font-weight: 900; font-size: 14px;
        cursor: pointer; min-height: 44px; min-width: 52px;
        transition: transform 0.15s, background 0.2s;
      }
      .settings-modal-opt:active { transform: scale(0.96); }
      .settings-modal-opt.active {
        background: linear-gradient(135deg, #60a5fa, #2563eb);
        color: #fff; border-color: #1e3a8a;
        box-shadow: 0 3px 0 rgba(30,58,138,0.4);
      }
      .settings-modal-row {
        display: flex; align-items: center; justify-content: space-between;
        background: rgba(255,255,255,0.4); border-radius: 14px;
        padding: 12px 16px; margin-top: 6px;
      }
      .settings-modal-switch {
        position: relative; width: 56px; height: 32px;
        background: rgba(0,0,0,0.18); border-radius: 16px;
        cursor: pointer; transition: background 0.25s;
        flex-shrink: 0;
      }
      .settings-modal-switch::after {
        content: ''; position: absolute;
        top: 3px; left: 3px;
        width: 26px; height: 26px;
        background: #fff; border-radius: 50%;
        transition: left 0.25s;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
      .settings-modal-switch.on { background: #22c55e; }
      .settings-modal-switch.on::after { left: 27px; }
      @media (prefers-reduced-motion: reduce) {
        .settings-modal-card, .settings-modal-switch, .settings-modal-switch::after {
          transition: none !important;
        }
      }
    `
    document.head.appendChild(style)
  }

  function _build() {
    if (_root) return _root
    _injectStyles()
    _root = document.createElement('div')
    _root.id = 'settings-modal-overlay'
    _root.innerHTML = `
      <div class="settings-modal-card">
        <div class="settings-modal-header">
          <div class="settings-modal-title">⚙️ Pengaturan</div>
          <button class="settings-modal-close" type="button" aria-label="Tutup">✕</button>
        </div>

        <div class="settings-modal-section">
          <div class="settings-modal-label">😊 Tingkat Kesulitan</div>
          <div class="settings-modal-desc">Mudah = soft-fail, tidak ada hukuman. Sulit = HP berkurang saat salah.</div>
          <div class="settings-modal-options" data-group="mode">
            <button class="settings-modal-opt" data-value="easy">😊 Mudah</button>
            <button class="settings-modal-opt" data-value="hard">🔥 Sulit</button>
          </div>
        </div>

        <div class="settings-modal-section">
          <div class="settings-modal-label">🎂 Usia</div>
          <div class="settings-modal-desc">Sesuaikan tingkat soal & gambar.</div>
          <div class="settings-modal-options" data-group="age">
            <button class="settings-modal-opt" data-value="4">4</button>
            <button class="settings-modal-opt" data-value="5">5</button>
            <button class="settings-modal-opt" data-value="6">6</button>
            <button class="settings-modal-opt" data-value="7">7</button>
          </div>
        </div>

        <div class="settings-modal-row">
          <div>
            <div class="settings-modal-label">♿ Kontras Tinggi</div>
            <div class="settings-modal-desc">Latar putih + tombol hitam, untuk kemudahan baca.</div>
          </div>
          <div class="settings-modal-switch" data-toggle="contrast"></div>
        </div>

        <div class="settings-modal-row">
          <div>
            <div class="settings-modal-label">🔊 Suara Petunjuk</div>
            <div class="settings-modal-desc">Hidupkan suara prompt Bahasa Indonesia (jika tersedia).</div>
          </div>
          <div class="settings-modal-switch" data-toggle="voice"></div>
        </div>

        <div class="settings-modal-row">
          <div>
            <div class="settings-modal-label">🌀 Kurangi Animasi</div>
            <div class="settings-modal-desc">Untuk anak sensitif gerak / motion-sickness.</div>
          </div>
          <div class="settings-modal-switch" data-toggle="reducemotion"></div>
        </div>
      </div>
    `
    document.body.appendChild(_root)

    _root.querySelector('.settings-modal-close').addEventListener('click', close)
    _root.addEventListener('click', e => { if (e.target === _root) close() })

    // Wire mode buttons
    _root.querySelectorAll('[data-group="mode"] .settings-modal-opt').forEach(b => {
      b.addEventListener('click', () => {
        if (global.ObstacleEngine) global.ObstacleEngine.setMode(b.dataset.value)
        _refresh()
      })
    })
    _root.querySelectorAll('[data-group="age"] .settings-modal-opt').forEach(b => {
      b.addEventListener('click', () => {
        if (global.ObstacleEngine) global.ObstacleEngine.setAgePreset(b.dataset.value)
        _refresh()
      })
    })

    // Switches
    _root.querySelectorAll('.settings-modal-switch').forEach(sw => {
      sw.addEventListener('click', () => {
        const key = sw.dataset.toggle
        if (key === 'contrast') {
          if (global.ObstacleEngine) global.ObstacleEngine.setHighContrast(!global.ObstacleEngine.getHighContrast())
        } else if (key === 'voice') {
          const cur = _getBool('train-voice-on', true)
          _setBool('train-voice-on', !cur)
        } else if (key === 'reducemotion') {
          const cur = _getBool('train-reduce-motion', false)
          _setBool('train-reduce-motion', !cur)
        }
        _refresh()
      })
    })

    return _root
  }

  function _getBool(key, defaultVal) {
    try {
      const v = localStorage.getItem(key)
      if (v === null) return !!defaultVal
      return v === '1' || v === 'true'
    } catch { return !!defaultVal }
  }
  function _setBool(key, val) {
    try { localStorage.setItem(key, val ? '1' : '0') } catch {}
  }

  function _refresh() {
    if (!_root) return
    const OE = global.ObstacleEngine
    const mode = OE ? OE.getMode() : 'easy'
    const age = OE ? OE.getAgePreset() : '5'
    const hc = OE ? OE.getHighContrast() : false
    const voiceOn = _getBool('train-voice-on', true)
    const reduceMotion = _getBool('train-reduce-motion', false)

    _root.querySelectorAll('[data-group="mode"] .settings-modal-opt').forEach(b => {
      b.classList.toggle('active', b.dataset.value === mode)
    })
    _root.querySelectorAll('[data-group="age"] .settings-modal-opt').forEach(b => {
      b.classList.toggle('active', b.dataset.value === age)
    })
    _root.querySelector('[data-toggle="contrast"]').classList.toggle('on', !!hc)
    _root.querySelector('[data-toggle="voice"]').classList.toggle('on', !!voiceOn)
    _root.querySelector('[data-toggle="reducemotion"]').classList.toggle('on', !!reduceMotion)
  }

  function open() {
    _build()
    _refresh()
    _root.classList.add('show')
  }

  function close() {
    if (_root) _root.classList.remove('show')
  }

  global.SettingsModal = { VERSION, open, close }

})(typeof window !== 'undefined' ? window : globalThis);
