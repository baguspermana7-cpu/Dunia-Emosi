/* =============================================================================
 * obstacles.js  (v54.69 foundation — reference obstacle: Missing Rail Triangle)
 * =============================================================================
 * Registers obstacle types with ObstacleEngine. Each tranche extends this file.
 *
 * v54.69 foundation: 1 reference obstacle (missing_rail_triangle).
 * v54.70 repair:     +missing_rail_*, broken_bridge_*, signal_repair, tunnel_light.
 * v54.71 question:   +fire_jump_question, tunnel_gate_question, edu_gate_*.
 * v54.72 reaction:   +signal_light, animal_crossing_*, falling_rocks_*, water_puddle_*.
 * v54.73 choice:     +choose_track_*, memory_sequence_*, friendly_race_boost, windy_bridge.
 * v54.74 station:    +station_passenger_pickup, ticket_color_match, cargo_sort_*, lost_suitcase, clean_leaves.
 *
 * Each obstacle MUST:
 *   - softFail: true (default) for child-friendly experience
 *   - maxRetry: 3 (default) so auto-help kicks in
 *   - reward: { coins, badgeProgress, sound }
 *   - accessibility: voicePrompt + largeTouchTarget + reducedMotion
 *
 * Spec: /home/baguspermana7/Documents/2.txt §5–§19, §21 JSON schema.
 * ========================================================================== */

;(function (global) {
  'use strict'

  function registerAll() {
    if (!global.ObstacleEngine) {
      console.warn('[obstacles.js] ObstacleEngine not loaded yet')
      return
    }
    const OE = global.ObstacleEngine

    // ── Reference: Missing Rail Triangle (spec §5) ──────────────────────────
    OE.register('missing_rail_triangle', {
      type: 'drag_drop_track_repair',
      difficulty: 1,
      ageRange: '4-7',
      allowedLocations: ['*'],
      allowedJourneyPhases: ['urban_exit', 'suburban', 'countryside', 'approaching_station'],
      requiredAction: 'tap_choice',
      softFail: true,
      maxRetry: 3,
      reward: { coins: 5, badgeProgress: 1, sound: 'success_chime' },
      visual: { cameraZoom: true, highlightSlot: true, snapAnimation: true, successSparkle: true },
      accessibility: { voicePrompt: true, largeTouchTarget: true, reducedMotion: true },
      title: '🛠️ Pilih bentuk rel yang sesuai!',
      hints: [
        'Hampir betul, coba yang lain! 💡',
        'Lihat bentuk slotnya — segitiga ⏷',
        'Yang ini! 👇 — pilih segitiga ▲',
      ],

      interaction: {
        setup(ctx, callbacks) {
          const body = ctx.body
          if (!body) return

          // Title
          const title = document.createElement('div')
          title.className = 'obstacle-engine-title'
          title.textContent = '🛠️ Pilih bentuk rel yang sesuai!'
          body.appendChild(title)

          // Sub
          const sub = document.createElement('div')
          sub.className = 'obstacle-engine-subtitle'
          sub.textContent = 'Rel kereta hilang. Pasang potongan yang benar!'
          body.appendChild(sub)

          // Target slot
          const targetRow = document.createElement('div')
          targetRow.className = 'obstacle-engine-row'
          const target = document.createElement('div')
          target.className = 'obstacle-engine-target'
          target.textContent = '⏷'
          target.dataset.shape = 'triangle'
          targetRow.appendChild(target)
          body.appendChild(targetRow)

          // Choices row
          const choicesRow = document.createElement('div')
          choicesRow.className = 'obstacle-engine-row'

          const SHAPES = ['triangle', 'circle', 'square']
          const ICONS = { triangle: '▲', circle: '⬤', square: '■' }
          // Shuffle (correct always present)
          const shuffled = SHAPES.slice().sort(() => Math.random() - 0.5)

          const onPick = (btn, shape) => {
            // Disable other buttons during animation
            const allBtns = choicesRow.querySelectorAll('.obstacle-engine-shape-btn')
            if (shape === 'triangle') {
              btn.classList.add('correct')
              target.textContent = '▲'
              target.style.borderStyle = 'solid'
              target.style.borderColor = '#16a34a'
              target.style.background = 'rgba(34,197,94,0.18)'
              OE.spawnSparkles(target, 8)
              allBtns.forEach(b => { b.disabled = true })
              setTimeout(() => callbacks.success(), 700)
            } else {
              btn.classList.add('wrong')
              setTimeout(() => btn.classList.remove('wrong'), 500)
              callbacks.fail()
            }
          }

          shuffled.forEach(shape => {
            const btn = document.createElement('button')
            btn.className = 'obstacle-engine-shape-btn'
            btn.textContent = ICONS[shape]
            btn.dataset.shape = shape
            btn.setAttribute('aria-label', shape)
            btn.addEventListener('click', () => onPick(btn, shape))
            choicesRow.appendChild(btn)
          })

          body.appendChild(choicesRow)

          // Voice prompt
          OE.speak('Pilih bentuk segitiga')
        },
        teardown() {}
      },
    })

    if (typeof console !== 'undefined' && console.log) {
      console.log('[obstacles.js] registered', Object.keys(OE._registry).length, 'obstacle types')
    }
  }

  // Wait for engine
  if (global.ObstacleEngine) {
    registerAll()
  } else {
    const interval = setInterval(() => {
      if (global.ObstacleEngine) {
        clearInterval(interval)
        registerAll()
      }
    }, 50)
    setTimeout(() => clearInterval(interval), 5000)
  }

})(typeof window !== 'undefined' ? window : globalThis);
