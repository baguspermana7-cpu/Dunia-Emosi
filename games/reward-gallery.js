/* =============================================================================
 * reward-gallery.js  (v54.78 — Koleksi modal + earn toast)
 * =============================================================================
 * Builds a child-friendly DOM modal showing all earned + locked stickers,
 * badges, and horn unlocks. Triggered by RewardGallery.open() from game UI.
 *
 * Also exposes RewardGallery.toastEarn(type, id) to flash a celebration toast
 * when a new reward is earned during gameplay.
 *
 * Reads from:
 *   window.RewardCatalog (id → metadata)
 *   localStorage['train-stickers' / 'train-badges' / 'train-horn-unlocks']
 *
 * Public API:
 *   RewardGallery.open()         — show modal
 *   RewardGallery.close()        — hide modal
 *   RewardGallery.toastEarn(type, id, label) — fire celebration toast
 * ========================================================================== */

;(function (global) {
  'use strict'

  const VERSION = 'v54.78-reward-gallery'

  let _root = null

  function _getStickers()    { try { return JSON.parse(localStorage.getItem('train-stickers')     || '[]') } catch { return [] } }
  function _getBadges()      { try { return JSON.parse(localStorage.getItem('train-badges')       || '[]') } catch { return [] } }
  function _getHornUnlocks() { try { return JSON.parse(localStorage.getItem('train-horn-unlocks') || '[]') } catch { return [] } }

  function _injectStyles() {
    if (document.querySelector('#reward-gallery-styles')) return
    const style = document.createElement('style')
    style.id = 'reward-gallery-styles'
    style.textContent = `
      #reward-gallery-overlay {
        position: fixed; inset: 0; z-index: 3000;
        background: rgba(15,23,42,0.7); backdrop-filter: blur(4px);
        display: none; align-items: center; justify-content: center;
        font-family: 'Fredoka One', 'Comic Sans MS', system-ui, sans-serif;
      }
      #reward-gallery-overlay.show { display: flex; }
      .reward-gallery-card {
        width: min(94vw, 720px); max-height: 85vh; overflow-y: auto;
        background: linear-gradient(180deg, #fff7ed 0%, #fde68a 100%);
        border: 5px solid #fbbf24; border-radius: 28px;
        padding: 24px 28px 28px;
        box-shadow: 0 16px 50px rgba(0,0,0,0.4);
        transform: translateY(40px) scale(0.96);
        transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      #reward-gallery-overlay.show .reward-gallery-card {
        transform: translateY(0) scale(1);
      }
      .reward-gallery-header {
        display: flex; align-items: center; justify-content: space-between;
        gap: 12px; margin-bottom: 18px;
      }
      .reward-gallery-title {
        font-size: clamp(22px, 5vw, 32px);
        color: #92400e; font-weight: 900; text-shadow: 0 2px 0 rgba(255,255,255,0.6);
      }
      .reward-gallery-close {
        background: linear-gradient(135deg, #f87171, #dc2626);
        color: #fff; border: 0; border-radius: 14px;
        font-size: 18px; font-weight: 900; cursor: pointer;
        padding: 10px 16px; min-width: 88px; min-height: 44px;
        font-family: inherit; box-shadow: 0 4px 0 rgba(127,29,29,0.5);
        transition: transform 0.18s;
      }
      .reward-gallery-close:active { transform: translateY(2px); box-shadow: 0 2px 0 rgba(127,29,29,0.5); }
      .reward-gallery-section {
        margin: 18px 0;
      }
      .reward-gallery-section-title {
        font-size: clamp(16px, 3.8vw, 20px);
        color: #5a2a00; font-weight: 900; margin-bottom: 10px;
        padding-bottom: 4px; border-bottom: 3px dashed rgba(146,64,14,0.4);
      }
      .reward-gallery-grid {
        display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 12px;
      }
      .reward-gallery-item {
        background: rgba(255,255,255,0.7); border-radius: 16px;
        padding: 12px 8px; text-align: center;
        border: 3px solid rgba(146,64,14,0.25);
        min-height: 110px; display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .reward-gallery-item.earned {
        background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(254,243,199,0.95));
        border-color: #f59e0b;
        box-shadow: 0 4px 12px rgba(245,158,11,0.3);
      }
      .reward-gallery-item.locked {
        background: rgba(180,180,180,0.18); opacity: 0.45;
        border-color: rgba(0,0,0,0.15);
      }
      .reward-gallery-icon { font-size: 36px; line-height: 1; margin-bottom: 6px; }
      .reward-gallery-item.locked .reward-gallery-icon { filter: grayscale(1); }
      .reward-gallery-item.locked .reward-gallery-icon::after { content: ' 🔒'; font-size: 18px; }
      .reward-gallery-name { font-size: 13px; font-weight: 900; color: #5a2a00; }
      .reward-gallery-item.locked .reward-gallery-name { color: #6b7280; }
      .reward-gallery-desc { font-size: 10px; color: #92400e; margin-top: 4px; line-height: 1.2; }
      .reward-gallery-item.locked .reward-gallery-desc { color: #9ca3af; }
      .reward-gallery-empty {
        text-align: center; padding: 18px; color: #92400e;
        font-size: 14px; opacity: 0.7;
      }
      /* v54.81 — Tabs */
      .reward-gallery-tabs {
        display: flex; gap: 8px; margin-bottom: 14px;
        border-bottom: 3px solid rgba(146,64,14,0.25);
        padding-bottom: 4px;
      }
      .reward-gallery-tab {
        background: rgba(255,255,255,0.5); border: 2px solid rgba(146,64,14,0.3);
        border-radius: 14px 14px 0 0; color: #5a2a00;
        padding: 10px 16px; font-family: inherit;
        font-weight: 900; font-size: clamp(13px, 3.4vw, 16px);
        cursor: pointer; min-height: 44px;
        transition: background 0.2s, transform 0.18s;
      }
      .reward-gallery-tab:active { transform: scale(0.97); }
      .reward-gallery-tab.active {
        background: linear-gradient(135deg, #fcd34d, #f59e0b);
        border-color: #92400e;
        color: #5a2a00;
        box-shadow: 0 3px 0 rgba(146,64,14,0.35);
      }
      .reward-gallery-practice-btn {
        margin-top: 6px;
        background: linear-gradient(135deg, #fbbf24, #f59e0b);
        color: #5a2a00; border: 2px solid #b45309;
        border-radius: 12px;
        padding: 6px 14px; font-family: inherit;
        font-weight: 900; font-size: 13px;
        cursor: pointer; min-height: 36px;
        box-shadow: 0 3px 0 rgba(120,53,15,0.4);
      }
      .reward-gallery-practice-btn:active { transform: translateY(2px); box-shadow: 0 1px 0 rgba(120,53,15,0.4); }
      .reward-gallery-progress {
        text-align: center; margin: 8px 0 14px;
        font-size: 14px; color: #92400e; font-weight: 900;
      }
      .reward-gallery-progress-bar {
        width: 80%; max-width: 360px; height: 14px; margin: 6px auto 0;
        background: rgba(146,64,14,0.18); border-radius: 7px;
        overflow: hidden; border: 2px solid rgba(146,64,14,0.4);
      }
      .reward-gallery-progress-fill {
        height: 100%; background: linear-gradient(90deg, #fbbf24, #f59e0b);
        transition: width 0.6s ease-out;
      }
      /* Toast notification (earn celebration) */
      #reward-gallery-toast {
        position: fixed; top: 24px; left: 50%;
        transform: translateX(-50%) translateY(-100px);
        background: linear-gradient(135deg, #fde68a, #fcd34d);
        color: #5a2a00; padding: 14px 22px;
        border-radius: 18px; border: 4px solid #f59e0b;
        font-family: 'Fredoka One', 'Comic Sans MS', system-ui, sans-serif;
        font-weight: 900; font-size: clamp(15px, 3.8vw, 18px);
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 4000; opacity: 0;
        transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s;
        display: flex; align-items: center; gap: 12px;
        max-width: 92vw;
      }
      #reward-gallery-toast.show {
        opacity: 1; transform: translateX(-50%) translateY(0);
      }
      #reward-gallery-toast .reward-toast-icon { font-size: 32px; line-height: 1; }
      #reward-gallery-toast .reward-toast-text { font-size: inherit; }
      @media (prefers-reduced-motion: reduce) {
        .reward-gallery-card, #reward-gallery-toast {
          transition: opacity 0.2s !important;
          transform: translateX(-50%) translateY(0) !important;
        }
      }
    `
    document.head.appendChild(style)
  }

  function _build() {
    if (_root) return _root
    _injectStyles()
    _root = document.createElement('div')
    _root.id = 'reward-gallery-overlay'
    _root.innerHTML = `
      <div class="reward-gallery-card">
        <div class="reward-gallery-header">
          <div class="reward-gallery-title">🏆 Koleksiku</div>
          <button class="reward-gallery-close" type="button" aria-label="Tutup">✕ Tutup</button>
        </div>
        <!-- v54.81: Tab strip -->
        <div class="reward-gallery-tabs" data-role="tabs">
          <button class="reward-gallery-tab active" data-tab="collection" type="button">🏆 Koleksi</button>
          <button class="reward-gallery-tab" data-tab="practice" type="button">🎮 Mode Latihan</button>
        </div>
        <div class="reward-gallery-tab-content" data-tab-id="collection">
          <div class="reward-gallery-progress" data-role="progress"></div>
          <div class="reward-gallery-progress-bar"><div class="reward-gallery-progress-fill" data-role="progress-fill" style="width:0%"></div></div>
          <div class="reward-gallery-section">
            <div class="reward-gallery-section-title">🌟 Stiker</div>
            <div class="reward-gallery-grid" data-role="stickers-grid"></div>
          </div>
          <div class="reward-gallery-section">
            <div class="reward-gallery-section-title">🏅 Lencana</div>
            <div class="reward-gallery-grid" data-role="badges-grid"></div>
          </div>
          <div class="reward-gallery-section">
            <div class="reward-gallery-section-title">🔔 Klakson Spesial</div>
            <div class="reward-gallery-grid" data-role="horns-grid"></div>
          </div>
        </div>
        <div class="reward-gallery-tab-content" data-tab-id="practice" style="display:none">
          <div class="reward-gallery-section">
            <div class="reward-gallery-section-title">🎮 Coba tantangan sebelum balapan!</div>
            <div style="font-size:13px;color:#92400e;margin-bottom:12px;text-align:center">Tap salah satu kategori untuk berlatih tanpa balapan.</div>
            <div class="reward-gallery-grid" data-role="practice-grid"></div>
          </div>
        </div>
      </div>
    `
    document.body.appendChild(_root)

    // Close button + backdrop tap
    _root.querySelector('.reward-gallery-close').addEventListener('click', close)
    _root.addEventListener('click', (e) => {
      if (e.target === _root) close()
    })

    // v54.81 — Tab switching
    _root.querySelectorAll('.reward-gallery-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab
        _root.querySelectorAll('.reward-gallery-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === target))
        _root.querySelectorAll('.reward-gallery-tab-content').forEach(c => {
          c.style.display = (c.dataset.tabId === target) ? '' : 'none'
        })
      })
    })

    return _root
  }

  // v54.81 — Practice Mode: lists representative obstacles from registry,
  // grouped by category. Tap "Coba" to spawn the obstacle standalone.
  function _renderPractice(gridEl) {
    if (!gridEl) return
    gridEl.innerHTML = ''
    const OE = global.ObstacleEngine
    if (!OE || !OE._registry) {
      gridEl.innerHTML = '<div class="reward-gallery-empty">Mode latihan belum tersedia. Buka game balapan dulu.</div>'
      return
    }
    // Curated highlight per category — pick one representative ID
    const CATEGORIES = [
      { label:'Pasang Rel',     icon:'🛠️', id:'missing_rail_triangle' },
      { label:'Pasang Jembatan',icon:'🌉', id:'broken_bridge_color' },
      { label:'Tantangan Api',  icon:'🔥', id:'fire_jump_question' },
      { label:'Pintu Tunnel',   icon:'🚇', id:'tunnel_gate_question' },
      { label:'Sinyal Kereta',  icon:'🚦', id:'signal_light_challenge' },
      { label:'Hewan Lewat',    icon:'🐱', id:'animal_crossing_cat' },
      { label:'Batu di Rel',    icon:'🪨', id:'falling_rocks_big' },
      { label:'Genangan Air',   icon:'💧', id:'water_puddle_pump' },
      { label:'Pilih Jalur',    icon:'🚉', id:'choose_correct_track_destination' },
      { label:'Ingat Lampu',    icon:'🎨', id:'memory_sequence_3color' },
      { label:'Jembatan Angin', icon:'🌬️', id:'windy_bridge_balance' },
      { label:'Sortir Muatan',  icon:'📦', id:'station_cargo_sort_color' },
      { label:'Jemput Penumpang',icon:'🧑',id:'station_passenger_pickup_3' },
      { label:'Cari Koper',     icon:'🧳', id:'station_lost_suitcase' },
      { label:'Bersihkan Daun', icon:'🍂', id:'station_clean_leaves_track' },
    ]
    CATEGORIES.forEach(cat => {
      if (!OE._registry[cat.id]) return // skip if obstacle not registered
      const cell = document.createElement('div')
      cell.className = 'reward-gallery-item earned reward-gallery-practice-cell'
      cell.style.cursor = 'pointer'
      cell.innerHTML = `
        <div class="reward-gallery-icon">${cat.icon}</div>
        <div class="reward-gallery-name">${cat.label}</div>
        <button class="reward-gallery-practice-btn" type="button">Coba</button>
      `
      const btn = cell.querySelector('.reward-gallery-practice-btn')
      const fire = () => {
        close() // hide gallery first so the obstacle overlay shows on top
        setTimeout(() => {
          try {
            OE.spawn(cat.id, { standalone: true }).then(() => {
              // After practice ends, re-open the gallery for kid to try another
              setTimeout(() => open(), 400)
            })
          } catch (e) { console.warn(e) }
        }, 500)
      }
      btn.addEventListener('click', fire)
      cell.addEventListener('click', (e) => { if (e.target !== btn) fire() })
      gridEl.appendChild(cell)
    })
  }

  function _renderGrid(gridEl, catalogList, earnedSet, emptyMsg) {
    if (!gridEl) return 0
    gridEl.innerHTML = ''
    if (!catalogList || catalogList.length === 0) {
      gridEl.innerHTML = `<div class="reward-gallery-empty">${emptyMsg || 'Belum ada item.'}</div>`
      return 0
    }
    let earnedCount = 0
    catalogList.forEach(item => {
      const isEarned = earnedSet.has(item.id)
      if (isEarned) earnedCount++
      const cell = document.createElement('div')
      cell.className = 'reward-gallery-item ' + (isEarned ? 'earned' : 'locked')
      cell.innerHTML = `
        <div class="reward-gallery-icon">${item.icon}</div>
        <div class="reward-gallery-name">${item.name}</div>
        <div class="reward-gallery-desc">${isEarned ? item.description : '???'}</div>
      `
      gridEl.appendChild(cell)
    })
    return earnedCount
  }

  function open() {
    _build()
    const catalog = global.RewardCatalog || { stickers: [], badges: [], hornUnlocks: [] }
    const stickerSet = new Set(_getStickers())
    const badgeSet   = new Set(_getBadges())
    const hornSet    = new Set(_getHornUnlocks())

    const sEarned = _renderGrid(_root.querySelector('[data-role="stickers-grid"]'), catalog.stickers,    stickerSet, 'Belum ada stiker.')
    const bEarned = _renderGrid(_root.querySelector('[data-role="badges-grid"]'),   catalog.badges,      badgeSet,   'Belum ada lencana.')
    const hEarned = _renderGrid(_root.querySelector('[data-role="horns-grid"]'),    catalog.hornUnlocks, hornSet,    'Belum ada klakson spesial.')

    const total = (catalog.stickers?.length || 0) + (catalog.badges?.length || 0) + (catalog.hornUnlocks?.length || 0)
    const earned = sEarned + bEarned + hEarned
    const pct = total > 0 ? Math.round((earned / total) * 100) : 0

    const progressEl = _root.querySelector('[data-role="progress"]')
    const fillEl     = _root.querySelector('[data-role="progress-fill"]')
    if (progressEl) progressEl.textContent = `Koleksi: ${earned} / ${total} terbuka (${pct}%)`
    if (fillEl) {
      // Stagger animation
      fillEl.style.width = '0%'
      requestAnimationFrame(() => { fillEl.style.width = pct + '%' })
    }

    // v54.81 — also populate Practice Mode grid
    _renderPractice(_root.querySelector('[data-role="practice-grid"]'))

    _root.classList.add('show')
  }

  function close() {
    if (_root) _root.classList.remove('show')
  }

  // ── Toast notification ────────────────────────────────────────────────────

  let _toastTimer = null
  function toastEarn(type, id, customLabel) {
    _injectStyles()
    let el = document.querySelector('#reward-gallery-toast')
    if (!el) {
      el = document.createElement('div')
      el.id = 'reward-gallery-toast'
      document.body.appendChild(el)
    }

    // Resolve icon + name
    const catalog = global.RewardCatalog || {}
    const list = type === 'sticker' ? catalog.stickers : (type === 'badge' ? catalog.badges : catalog.hornUnlocks)
    const meta = (list || []).find(item => item.id === id)
    const icon = (meta && meta.icon) || '🌟'
    const name = customLabel || (meta && meta.name) || id

    const typeWord = type === 'sticker' ? 'Stiker' : (type === 'badge' ? 'Lencana' : 'Klakson')
    el.innerHTML = `
      <span class="reward-toast-icon">${icon}</span>
      <span class="reward-toast-text">Dapat ${typeWord} baru: <b>${name}</b>!</span>
    `
    el.classList.add('show')

    // Auto-hide after 3.2s
    if (_toastTimer) clearTimeout(_toastTimer)
    _toastTimer = setTimeout(() => {
      el.classList.remove('show')
      _toastTimer = null
    }, 3200)

    // Play tone if available
    try {
      if (typeof global.playTone === 'function') {
        global.playTone({ freq: 880, dur: 0.12, vol: 0.10 })
        setTimeout(() => global.playTone({ freq: 1175, dur: 0.14, vol: 0.10 }), 90)
        setTimeout(() => global.playTone({ freq: 1568, dur: 0.18, vol: 0.10 }), 200)
      }
    } catch {}
  }

  // ── Expose ─────────────────────────────────────────────────────────────────

  global.RewardGallery = { VERSION, open, close, toastEarn }

})(typeof window !== 'undefined' ? window : globalThis);
