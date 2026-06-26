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

    // ── Repair tranche v54.70 — 6 shape variants (drag-drop track repair) ──
    // Shared generator: same UI, different target shape + voice prompt.
    function makeShapeRepairObstacle(shapeKey, opts) {
      return {
        type: 'drag_drop_track_repair',
        difficulty: opts.difficulty || 1,
        ageRange: opts.ageRange || '4-7',
        allowedLocations: ['*'],
        allowedJourneyPhases: ['urban_exit', 'suburban', 'countryside', 'approaching_station'],
        requiredAction: 'tap_choice',
        softFail: true,
        maxRetry: 3,
        reward: { coins: opts.coins || 5, badgeProgress: 1, sound: 'success_chime' },
        visual: { cameraZoom: true, highlightSlot: true, snapAnimation: true, successSparkle: true },
        accessibility: { voicePrompt: true, largeTouchTarget: true, reducedMotion: true },
        title: opts.title,
        hints: opts.hints || [
          'Hampir betul, coba yang lain! 💡',
          'Lihat bentuk slotnya — ' + opts.targetIcon + ' ',
          'Yang ini! 👇 — pilih ' + opts.targetIcon,
        ],

        interaction: {
          setup(ctx, callbacks) {
            const body = ctx.body
            if (!body) return

            const title = document.createElement('div')
            title.className = 'obstacle-engine-title'
            title.textContent = opts.title
            body.appendChild(title)

            const sub = document.createElement('div')
            sub.className = 'obstacle-engine-subtitle'
            sub.textContent = opts.subtitle || 'Rel kereta hilang. Pasang potongan yang benar!'
            body.appendChild(sub)

            const targetRow = document.createElement('div')
            targetRow.className = 'obstacle-engine-row'
            const target = document.createElement('div')
            target.className = 'obstacle-engine-target'
            target.textContent = opts.targetSlotIcon || opts.targetIcon
            target.dataset.shape = shapeKey
            targetRow.appendChild(target)
            body.appendChild(targetRow)

            const choicesRow = document.createElement('div')
            choicesRow.className = 'obstacle-engine-row'

            // Distractor pool
            const distractors = (opts.distractors || ['⬤', '■']).slice(0, opts.choiceCount ? (opts.choiceCount - 1) : 2)
            const choices = [{ key: shapeKey, icon: opts.targetIcon }]
              .concat(distractors.map((d, i) => ({ key: '_d' + i, icon: d })))
            const shuffled = choices.slice().sort(() => Math.random() - 0.5)

            const onPick = (btn, key) => {
              const all = choicesRow.querySelectorAll('.obstacle-engine-shape-btn')
              if (key === shapeKey) {
                btn.classList.add('correct')
                target.textContent = opts.targetIcon
                target.style.borderStyle = 'solid'
                target.style.borderColor = '#16a34a'
                target.style.background = 'rgba(34,197,94,0.18)'
                OE.spawnSparkles(target, 8)
                all.forEach(b => { b.disabled = true })
                setTimeout(() => callbacks.success(), 700)
              } else {
                btn.classList.add('wrong')
                setTimeout(() => btn.classList.remove('wrong'), 500)
                callbacks.fail()
              }
            }

            shuffled.forEach(c => {
              const btn = document.createElement('button')
              btn.className = 'obstacle-engine-shape-btn'
              btn.textContent = c.icon
              btn.dataset.shape = c.key
              btn.setAttribute('aria-label', c.key)
              btn.addEventListener('click', () => onPick(btn, c.key))
              choicesRow.appendChild(btn)
            })

            body.appendChild(choicesRow)
            OE.speak(opts.voice || ('Pilih ' + opts.voiceShapeName))
          },
          teardown() {}
        },
      }
    }

    OE.register('missing_rail_circle',     makeShapeRepairObstacle('circle',     { title:'🛠️ Pasang potongan lingkaran!', targetIcon:'⬤', targetSlotIcon:'◯', distractors:['▲','■'], voiceShapeName:'lingkaran', difficulty:1 }))
    OE.register('missing_rail_square',     makeShapeRepairObstacle('square',     { title:'🛠️ Pasang potongan persegi!',   targetIcon:'■', targetSlotIcon:'▢', distractors:['▲','⬤'], voiceShapeName:'persegi',   difficulty:1 }))
    OE.register('missing_rail_arrow',      makeShapeRepairObstacle('arrow',      { title:'🛠️ Pasang potongan panah!',     targetIcon:'➤', targetSlotIcon:'▷', distractors:['⬤','■'], voiceShapeName:'panah',     difficulty:2 }))
    OE.register('missing_rail_curve_left', makeShapeRepairObstacle('curve_left', { title:'🛠️ Pasang rel belok kiri!',     targetIcon:'↰', targetSlotIcon:'↰', distractors:['↱','⬤'], voiceShapeName:'belok kiri', difficulty:2 }))
    OE.register('missing_rail_curve_right',makeShapeRepairObstacle('curve_right',{ title:'🛠️ Pasang rel belok kanan!',    targetIcon:'↱', targetSlotIcon:'↱', distractors:['↰','⬤'], voiceShapeName:'belok kanan', difficulty:2 }))
    OE.register('missing_rail_ramp_up',    makeShapeRepairObstacle('ramp_up',    { title:'🛠️ Pasang rel naik!',          targetIcon:'↗', targetSlotIcon:'↗', distractors:['↘','—'], voiceShapeName:'rel naik',   difficulty:2 }))

    // ── Broken Bridge variants (spec §7) — sequence-aware placement ──────────
    function makeBridgeRepairObstacle(opts) {
      return {
        type: 'drag_drop_bridge_repair',
        difficulty: opts.difficulty || 2,
        ageRange: '5-7',
        allowedLocations: ['*'],
        allowedJourneyPhases: ['countryside', 'approaching_station'],
        requiredAction: 'tap_sequence',
        softFail: true,
        maxRetry: 3,
        reward: { coins: 8, badgeProgress: 1, sound: 'success_chime' },
        visual: { cameraZoom: true, highlightSlot: true, snapAnimation: true, successSparkle: true },
        accessibility: { voicePrompt: true, largeTouchTarget: true, reducedMotion: true },
        title: opts.title,
        hints: [
          'Coba yang lain! 💡',
          'Lihat warnanya / nomornya! ✨',
          'Yang ini! 👇',
        ],

        interaction: {
          setup(ctx, callbacks) {
            const body = ctx.body
            if (!body) return

            const title = document.createElement('div')
            title.className = 'obstacle-engine-title'
            title.textContent = opts.title
            body.appendChild(title)

            const sub = document.createElement('div')
            sub.className = 'obstacle-engine-subtitle'
            sub.textContent = opts.subtitle || 'Jembatan putus! Pasang potongan jembatan sesuai urutan.'
            body.appendChild(sub)

            // Slots (sequential)
            const slotsRow = document.createElement('div')
            slotsRow.className = 'obstacle-engine-row'
            const slots = opts.slots.map((slot, i) => {
              const el = document.createElement('div')
              el.className = 'obstacle-engine-target'
              el.dataset.expected = slot
              el.dataset.index = i
              el.textContent = '?'
              slotsRow.appendChild(el)
              return el
            })
            body.appendChild(slotsRow)

            // Choices
            const choicesRow = document.createElement('div')
            choicesRow.className = 'obstacle-engine-row'

            // Build choice pool (correct slots + distractors)
            const slotIcons = opts.slotIcons || opts.slots
            const pool = opts.slots.map((key, i) => ({ key, icon: slotIcons[i] })).concat(opts.distractors || [])
            const shuffled = pool.slice().sort(() => Math.random() - 0.5)

            let curIdx = 0

            const onPick = (btn, key) => {
              if (curIdx >= slots.length) return
              const expected = opts.slots[curIdx]
              if (key === expected) {
                btn.classList.add('correct')
                slots[curIdx].textContent = btn.textContent
                slots[curIdx].style.borderStyle = 'solid'
                slots[curIdx].style.borderColor = '#16a34a'
                slots[curIdx].style.background = 'rgba(34,197,94,0.18)'
                OE.spawnSparkles(slots[curIdx], 5)
                btn.style.opacity = '0.4'
                btn.disabled = true
                curIdx++
                if (curIdx >= slots.length) {
                  setTimeout(() => callbacks.success(), 700)
                }
              } else {
                btn.classList.add('wrong')
                setTimeout(() => btn.classList.remove('wrong'), 500)
                callbacks.fail()
              }
            }

            shuffled.forEach(c => {
              const btn = document.createElement('button')
              btn.className = 'obstacle-engine-shape-btn'
              btn.textContent = c.icon
              btn.dataset.key = c.key
              btn.addEventListener('click', () => onPick(btn, c.key))
              choicesRow.appendChild(btn)
            })

            body.appendChild(choicesRow)
            OE.speak(opts.voice || 'Pasang jembatan sesuai urutan')
          },
          teardown() {}
        },
      }
    }

    OE.register('broken_bridge_1block', makeBridgeRepairObstacle({
      title: '🌉 Pasang 1 balok jembatan!',
      subtitle: 'Pilih balok kayu untuk menutup celah.',
      slots: ['plank'],
      slotIcons: ['🟫'],
      distractors: [{ key:'_d0', icon:'🪨' }, { key:'_d1', icon:'🌿' }],
      difficulty: 1,
    }))

    OE.register('broken_bridge_2block', makeBridgeRepairObstacle({
      title: '🌉 Pasang 2 balok berurutan!',
      subtitle: 'Susun papan kayu di 2 celah jembatan.',
      slots: ['plank', 'plank'],
      slotIcons: ['🟫', '🟫'],
      distractors: [{ key:'_d0', icon:'🪨' }, { key:'_d1', icon:'🌿' }],
      difficulty: 2,
    }))

    OE.register('broken_bridge_color', makeBridgeRepairObstacle({
      title: '🌉 Cocokkan warna jembatan!',
      subtitle: 'Susun: 🔴 → 🟢 → 🔵',
      slots: ['red', 'green', 'blue'],
      slotIcons: ['🔴', '🟢', '🔵'],
      distractors: [{ key:'_d0', icon:'🟡' }, { key:'_d1', icon:'🟣' }],
      difficulty: 2,
    }))

    OE.register('broken_bridge_number_sequence_1to3', makeBridgeRepairObstacle({
      title: '🌉 Susun angka 1 → 2 → 3!',
      subtitle: 'Pasang papan jembatan sesuai urutan angka.',
      slots: ['1', '2', '3'],
      slotIcons: ['1️⃣', '2️⃣', '3️⃣'],
      distractors: [{ key:'_d0', icon:'4️⃣' }, { key:'_d1', icon:'5️⃣' }],
      difficulty: 3,
    }))

    // ── Signal repair (timing tap) ──────────────────────────────────────────
    OE.register('signal_repair', {
      type: 'timing_tap',
      difficulty: 2,
      ageRange: '5-7',
      allowedLocations: ['*'],
      allowedJourneyPhases: ['urban_exit', 'approaching_station'],
      requiredAction: 'tap_timing',
      softFail: true,
      maxRetry: 3,
      reward: { coins: 6, badgeProgress: 1, sound: 'success_chime' },
      visual: { cameraZoom: true, highlightSlot: true, successSparkle: true },
      accessibility: { voicePrompt: true, largeTouchTarget: true, reducedMotion: true },
      title: '🚦 Perbaiki sinyal!',
      hints: [
        'Tap saat lampu kuning! 💡',
        'Tunggu kuning, lalu tap! ✨',
        'Sekarang! 👇',
      ],

      interaction: {
        setup(ctx, callbacks) {
          const body = ctx.body
          if (!body) return

          const title = document.createElement('div')
          title.className = 'obstacle-engine-title'
          title.textContent = '🚦 Perbaiki sinyal!'
          body.appendChild(title)

          const sub = document.createElement('div')
          sub.className = 'obstacle-engine-subtitle'
          sub.textContent = 'Tap tombol ketika lampu menyala kuning.'
          body.appendChild(sub)

          // Signal lamp container
          const lampWrap = document.createElement('div')
          lampWrap.className = 'obstacle-engine-row'
          const lamp = document.createElement('div')
          lamp.style.cssText = 'width:96px;height:96px;border-radius:50%;background:#555;border:5px solid #333;display:inline-flex;align-items:center;justify-content:center;font-size:48px;transition:background 0.2s, box-shadow 0.2s;'
          lampWrap.appendChild(lamp)
          body.appendChild(lampWrap)

          // Big tap button
          const btnRow = document.createElement('div')
          btnRow.className = 'obstacle-engine-row'
          const tapBtn = document.createElement('button')
          tapBtn.className = 'obstacle-engine-shape-btn'
          tapBtn.style.minWidth = '160px'
          tapBtn.style.fontSize = '24px'
          tapBtn.textContent = '🛠️ Perbaiki!'
          btnRow.appendChild(tapBtn)
          body.appendChild(btnRow)

          // Cycle: off (500ms) → yellow (900ms) → off (500ms) → repeat
          let phase = 'off'
          let interval = setInterval(() => {
            if (phase === 'off') {
              lamp.style.background = '#facc15'
              lamp.style.boxShadow = '0 0 26px rgba(250,204,21,0.8)'
              lamp.textContent = '💡'
              phase = 'yellow'
            } else {
              lamp.style.background = '#555'
              lamp.style.boxShadow = 'none'
              lamp.textContent = ''
              phase = 'off'
            }
          }, 900)

          tapBtn.addEventListener('click', () => {
            if (phase === 'yellow') {
              clearInterval(interval)
              interval = null
              tapBtn.classList.add('correct')
              tapBtn.disabled = true
              lamp.style.background = '#22c55e'
              lamp.style.boxShadow = '0 0 30px rgba(34,197,94,0.95)'
              lamp.textContent = '✅'
              OE.spawnSparkles(lamp, 8)
              setTimeout(() => callbacks.success(), 700)
            } else {
              tapBtn.classList.add('wrong')
              setTimeout(() => tapBtn.classList.remove('wrong'), 500)
              callbacks.fail()
            }
          })

          OE.speak('Tap saat lampu kuning')

          // Teardown stub via ctx for interval clear
          ctx.__cleanup = () => { if (interval) clearInterval(interval) }
        },
        teardown(ctx) { if (ctx && ctx.__cleanup) ctx.__cleanup() }
      },
    })

    // ── Tunnel light repair (match 3 lights to slots) ───────────────────────
    OE.register('tunnel_light_repair', makeBridgeRepairObstacle({
      title: '💡 Pasang 3 lampu tunnel!',
      subtitle: 'Cocokkan warna lampu: 🔴 → 🟡 → 🟢',
      slots: ['red', 'yellow', 'green'],
      slotIcons: ['🔴', '🟡', '🟢'],
      distractors: [{ key:'_d0', icon:'🔵' }, { key:'_d1', icon:'🟣' }],
      difficulty: 2,
    }))

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
