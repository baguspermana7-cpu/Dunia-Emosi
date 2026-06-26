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

    // ── Question gate generator (spec §6, §8, §19) ──────────────────────────
    // Shared interaction handler that pulls from window.KidsQuestions pool.
    // Each gate has a unique header + success animation theme.
    function makeQuestionGateObstacle(opts) {
      return {
        type: opts.type || 'question_gate',
        difficulty: opts.difficulty || 2,
        ageRange: opts.ageRange || '4-7',
        allowedLocations: opts.allowedLocations || ['*'],
        allowedJourneyPhases: opts.allowedJourneyPhases || ['*'],
        requiredAction: 'tap_choice',
        questionRequired: true,
        questionCategory: opts.questionCategory || 'shape',
        softFail: true,
        maxRetry: 3,
        reward: { coins: opts.coins || 6, badgeProgress: 1, sound: 'success_chime' },
        visual: { cameraZoom: true, highlightSlot: true, successSparkle: true },
        accessibility: { voicePrompt: true, largeTouchTarget: true, reducedMotion: true },
        title: opts.title,
        hints: opts.hints || [
          'Coba pilihan lain! 💡',
          'Lihat gambarnya baik-baik! ✨',
          'Yang ini! 👇',
        ],

        interaction: {
          setup(ctx, callbacks) {
            const body = ctx.body
            if (!body) return

            const q = ctx.questionData
            if (!q) {
              console.warn('[obstacles] no question for', opts.title)
              setTimeout(() => callbacks.success(), 200) // skip if no q
              return
            }

            // Banner (header per obstacle theme)
            if (opts.banner) {
              const banner = document.createElement('div')
              banner.style.cssText = 'text-align:center;font-size:48px;line-height:1;margin-bottom:6px;'
              banner.textContent = opts.banner
              body.appendChild(banner)
            }

            const title = document.createElement('div')
            title.className = 'obstacle-engine-title'
            title.textContent = opts.title
            body.appendChild(title)

            const qText = document.createElement('div')
            qText.className = 'obstacle-engine-subtitle'
            qText.style.fontSize = 'clamp(16px, 4vw, 22px)'
            qText.style.fontWeight = '700'
            qText.style.color = '#3b2066'
            qText.style.padding = '6px 0 12px'
            qText.textContent = q.q
            body.appendChild(qText)

            const choicesRow = document.createElement('div')
            choicesRow.className = 'obstacle-engine-row'

            // Render each option as a big tap button
            const options = q.options.slice()
            // Map options to {key, icon} so we can shuffle without losing correctness
            const wrapped = options.map((opt, i) => ({ key: i, icon: opt }))
            const shuffled = wrapped.slice().sort(() => Math.random() - 0.5)

            const onPick = (btn, key) => {
              const all = choicesRow.querySelectorAll('.obstacle-engine-shape-btn')
              if (key === q.correct) {
                btn.classList.add('correct')
                OE.spawnSparkles(btn, 8)
                all.forEach(b => { b.disabled = true })
                // Per-obstacle success animation hook
                if (typeof opts.onSuccess === 'function') {
                  try { opts.onSuccess(body) } catch (e) { console.warn(e) }
                }
                setTimeout(() => callbacks.success(), 900)
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
              btn.setAttribute('aria-label', 'Jawaban ' + c.icon)
              btn.addEventListener('click', () => onPick(btn, c.key))
              choicesRow.appendChild(btn)
            })

            body.appendChild(choicesRow)
            OE.speak(q.voicePrompt || q.q)
          },
          teardown() {}
        },
      }
    }

    // v54.86: Fire jump question — cinematic scene with train jump arc on success
    OE.register('fire_jump_question', Object.assign(makeQuestionGateObstacle({
      title: '🔥 Lompati api kecil!',
      banner: '🔥🚂🔥',
      questionCategory: 'shape',
      difficulty: 2,
      coins: 7,
      hints: [
        'Coba pilih bentuk lain! 💡',
        'Lihat bentuk yang ditanya! ✨',
        'Yang ini! 👇',
      ],
    }), {
      // Override interaction.setup to add the scene PLUS still use shared question handler
      interaction: {
        setup(ctx, callbacks) {
          const body = ctx.body
          if (!body) return

          // Title
          const title = document.createElement('div')
          title.className = 'obstacle-engine-title'
          title.textContent = '🔥 Lompati api kecil!'
          body.appendChild(title)

          // Cinematic fire scene (above question card)
          const sceneRow = document.createElement('div')
          sceneRow.className = 'obstacle-engine-row'
          const scene = document.createElement('div')
          scene.style.cssText = 'position:relative;width:min(86vw,440px);height:100px;background:linear-gradient(180deg,#fef3c7 0%,#fcd34d 70%,#d4a574 100%);border-radius:14px;border:3px solid #92400e;overflow:hidden;box-shadow:inset 0 -8px 12px rgba(0,0,0,0.15);'

          // Rail + sleepers
          const rail = document.createElement('div')
          rail.style.cssText = 'position:absolute;bottom:18px;left:0;right:0;height:6px;background:linear-gradient(180deg,#475569 0%,#1e293b 100%);'
          scene.appendChild(rail)
          for (let i = 0; i < 8; i++) {
            const s = document.createElement('div')
            s.style.cssText = `position:absolute;bottom:8px;left:${i*55+10}px;width:34px;height:10px;background:#7c2d12;border-radius:2px;`
            scene.appendChild(s)
          }
          // Train (left side)
          const train = document.createElement('div')
          train.style.cssText = 'position:absolute;bottom:26px;left:14px;font-size:46px;line-height:1;transition:transform 0.9s cubic-bezier(0.4,0,0.3,1);z-index:2;'
          train.textContent = '🚂'
          scene.appendChild(train)
          // Flickering fire in center
          const fire = document.createElement('div')
          fire.style.cssText = 'position:absolute;bottom:24px;left:50%;transform:translateX(-50%);font-size:42px;line-height:1;animation:fire-flicker 0.6s ease-in-out infinite alternate;'
          fire.textContent = '🔥'
          scene.appendChild(fire)

          sceneRow.appendChild(scene)
          body.appendChild(sceneRow)

          // Question text + options (reused pattern from makeQuestionGateObstacle)
          const q = ctx.questionData
          if (!q) {
            // Defensive fallback
            setTimeout(() => callbacks.success(), 200)
            return
          }
          const qText = document.createElement('div')
          qText.className = 'obstacle-engine-subtitle'
          qText.style.fontSize = 'clamp(16px, 4vw, 22px)'
          qText.style.fontWeight = '700'
          qText.style.color = '#3b2066'
          qText.style.padding = '8px 0 12px'
          qText.textContent = q.q
          body.appendChild(qText)

          const choicesRow = document.createElement('div')
          choicesRow.className = 'obstacle-engine-row'

          const wrapped = q.options.map((opt, i) => ({ key: i, icon: opt }))
          const shuffled = wrapped.slice().sort(() => Math.random() - 0.5)

          const onPick = (btn, key) => {
            const all = choicesRow.querySelectorAll('.obstacle-engine-shape-btn')
            if (key === q.correct) {
              btn.classList.add('correct')
              OE.spawnSparkles(btn, 8)
              all.forEach(b => { b.disabled = true })
              // v54.86: train jump arc — leap over the fire!
              const dist = scene.clientWidth - 80
              train.style.transform = `translateX(${dist - 30}px) translateY(-30px)`
              setTimeout(() => {
                // land on right side
                train.style.transform = `translateX(${dist - 30}px) translateY(0)`
                // fire shrinks
                fire.style.fontSize = '24px'
                fire.style.opacity = '0.5'
                OE.spawnSparkles(train, 8)
              }, 500)
              setTimeout(() => callbacks.success(), 1100)
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
            btn.setAttribute('aria-label', 'Jawaban ' + c.icon)
            btn.addEventListener('click', () => onPick(btn, c.key))
            choicesRow.appendChild(btn)
          })

          body.appendChild(choicesRow)
          OE.speak(q.voicePrompt || q.q)
        },
        teardown() {}
      },
    }))

    // Tunnel gate question (spec §8) — answer right → gate slides open
    // v54.87: tunnel gate cinematic scene — black tunnel arch + red gate bar that slides open on success
    OE.register('tunnel_gate_question', Object.assign(makeQuestionGateObstacle({
      title: '🚇 Pintu tunnel terkunci!',
      banner: '🚇',
      questionCategory: 'color',
      difficulty: 2,
      coins: 7,
      hints: [
        'Pilih jawaban yang lain! 💡',
        'Lihat warna yang ditanya! ✨',
        'Yang ini! 👇',
      ],
    }), {
      interaction: {
        setup(ctx, callbacks) {
          const body = ctx.body
          if (!body) return

          ctx._timers = []
          const reduced = (OE.reducedMotion ? OE.reducedMotion() : false)

          const title = document.createElement('div')
          title.className = 'obstacle-engine-title'
          title.textContent = '🚇 Pintu tunnel terkunci!'
          body.appendChild(title)

          // Cinematic tunnel scene
          const sceneRow = document.createElement('div')
          sceneRow.className = 'obstacle-engine-row'
          const scene = document.createElement('div')
          scene.style.cssText = 'position:relative;width:min(86vw,440px);height:100px;background:linear-gradient(180deg,#94a3b8 0%,#cbd5e1 60%,#78716c 100%);border-radius:14px;border:3px solid #44403c;overflow:hidden;box-shadow:inset 0 -8px 12px rgba(0,0,0,0.2);'

          // Rail + sleepers
          const rail = document.createElement('div')
          rail.style.cssText = 'position:absolute;bottom:18px;left:0;right:0;height:6px;background:linear-gradient(180deg,#475569 0%,#1e293b 100%);'
          scene.appendChild(rail)
          for (let i = 0; i < 8; i++) {
            const s = document.createElement('div')
            s.style.cssText = `position:absolute;bottom:8px;left:${i*55+10}px;width:34px;height:10px;background:#7c2d12;border-radius:2px;`
            scene.appendChild(s)
          }

          // Train (left) — will roll into tunnel on success
          const train = document.createElement('div')
          train.style.cssText = 'position:absolute;bottom:26px;left:14px;font-size:46px;line-height:1;transition:transform 1.1s cubic-bezier(0.4,0,0.3,1),opacity 0.4s;z-index:2;'
          train.textContent = '🚂'
          scene.appendChild(train)

          // Tunnel mouth (right) — black rounded arch
          const tunnel = document.createElement('div')
          tunnel.style.cssText = 'position:absolute;bottom:18px;right:14px;width:96px;height:74px;background:linear-gradient(180deg,#0c0a09 0%,#1c1917 100%);border-radius:48px 48px 4px 4px;border:3px solid #44403c;border-bottom:none;box-shadow:inset 0 4px 12px rgba(0,0,0,0.85);overflow:hidden;z-index:1;'

          // Interior light (initially dim, brightens on success)
          const interiorLight = document.createElement('div')
          interiorLight.style.cssText = 'position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:64px;height:50px;border-radius:32px 32px 0 0;background:radial-gradient(ellipse at center bottom,rgba(254,240,138,0.05) 0%,transparent 70%);transition:background 0.6s ease-out;'
          tunnel.appendChild(interiorLight)

          // Closed gate bar (red) — translateY 0 = closed
          const gate = document.createElement('div')
          gate.style.cssText = 'position:absolute;bottom:6px;left:50%;transform:translateX(-50%) translateY(0);width:84px;height:14px;background:linear-gradient(180deg,#dc2626 0%,#7f1d1d 100%);border:2px solid #450a0a;border-radius:3px;box-shadow:0 2px 4px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.2);transition:transform 0.7s cubic-bezier(0.4,0,0.3,1);z-index:3;'
          // White stripe accents
          const stripes = document.createElement('div')
          stripes.style.cssText = 'position:absolute;inset:0;background:repeating-linear-gradient(45deg,transparent 0,transparent 8px,rgba(255,255,255,0.35) 8px,rgba(255,255,255,0.35) 14px);'
          gate.appendChild(stripes)
          tunnel.appendChild(gate)

          scene.appendChild(tunnel)

          sceneRow.appendChild(scene)
          body.appendChild(sceneRow)

          // Question text + options (reused pattern from makeQuestionGateObstacle)
          const q = ctx.questionData
          if (!q) {
            ctx._timers.push(setTimeout(() => callbacks.success(), 200))
            return
          }
          const qText = document.createElement('div')
          qText.className = 'obstacle-engine-subtitle'
          qText.style.fontSize = 'clamp(16px, 4vw, 22px)'
          qText.style.fontWeight = '700'
          qText.style.color = '#3b2066'
          qText.style.padding = '8px 0 12px'
          qText.textContent = q.q
          body.appendChild(qText)

          const choicesRow = document.createElement('div')
          choicesRow.className = 'obstacle-engine-row'

          const wrapped = q.options.map((opt, i) => ({ key: i, icon: opt }))
          const shuffled = wrapped.slice().sort(() => Math.random() - 0.5)

          const onPick = (btn, key) => {
            const all = choicesRow.querySelectorAll('.obstacle-engine-shape-btn')
            if (key === q.correct) {
              btn.classList.add('correct')
              OE.spawnSparkles(btn, 8)
              all.forEach(b => { b.disabled = true })
              // Gate slides up (out of view) + interior glows + train rolls in
              gate.style.transform = 'translateX(-50%) translateY(-80px)'
              interiorLight.style.background = 'radial-gradient(ellipse at center bottom,rgba(254,240,138,0.9) 0%,rgba(254,240,138,0.35) 50%,transparent 80%)'
              ctx._timers.push(setTimeout(() => {
                const dist = scene.clientWidth - 130
                train.style.transform = `translateX(${dist}px)`
              }, reduced ? 60 : 500))
              ctx._timers.push(setTimeout(() => {
                train.style.opacity = '0.3'
              }, reduced ? 200 : 1300))
              ctx._timers.push(setTimeout(() => callbacks.success(), reduced ? 400 : 1600))
            } else {
              btn.classList.add('wrong')
              ctx._timers.push(setTimeout(() => btn.classList.remove('wrong'), 500))
              callbacks.fail()
            }
          }

          shuffled.forEach(c => {
            const btn = document.createElement('button')
            btn.className = 'obstacle-engine-shape-btn'
            btn.textContent = c.icon
            btn.dataset.key = c.key
            btn.setAttribute('aria-label', 'Jawaban ' + c.icon)
            btn.addEventListener('click', () => onPick(btn, c.key))
            choicesRow.appendChild(btn)
          })

          body.appendChild(choicesRow)
          OE.speak(q.voicePrompt || q.q)
        },
        teardown(ctx) {
          if (ctx && ctx._timers) {
            ctx._timers.forEach(t => clearTimeout(t))
            ctx._timers = null
          }
        }
      },
    }))

    // Educational question gates per spec §19 (6 categories)
    OE.register('educational_question_gate_shape', makeQuestionGateObstacle({
      title: '🟦 Tantangan Bentuk!',  banner: '🟦', questionCategory: 'shape',  difficulty: 1, coins: 5,
    }))
    OE.register('educational_question_gate_color', makeQuestionGateObstacle({
      title: '🎨 Tantangan Warna!',   banner: '🎨', questionCategory: 'color',  difficulty: 1, coins: 5,
    }))
    OE.register('educational_question_gate_count', makeQuestionGateObstacle({
      title: '🔢 Hitung Bersama!',    banner: '🔢', questionCategory: 'count',  difficulty: 1, coins: 5,
    }))
    OE.register('educational_question_gate_number', makeQuestionGateObstacle({
      title: '🔟 Tantangan Angka!',   banner: '🔟', questionCategory: 'number', difficulty: 2, coins: 6,
    }))
    OE.register('educational_question_gate_letter', makeQuestionGateObstacle({
      title: '🔠 Tantangan Huruf!',   banner: '🔠', questionCategory: 'letter', difficulty: 2, coins: 6,
    }))
    OE.register('educational_question_gate_animal', makeQuestionGateObstacle({
      title: '🐾 Tantangan Hewan!',   banner: '🐾', questionCategory: 'animal', difficulty: 1, coins: 5,
    }))

    // ── Reaction tranche v54.72 — signal + animals + rocks + water ──────────

    // Signal Light Challenge (spec §11) — match button to light color
    OE.register('signal_light_challenge', {
      type: 'reaction_match',
      difficulty: 2,
      ageRange: '5-7',
      allowedLocations: ['*'],
      allowedJourneyPhases: ['urban_exit', 'approaching_station', 'arrival'],
      requiredAction: 'tap_choice',
      softFail: true,
      maxRetry: 3,
      reward: { coins: 6, badgeProgress: 1, sound: 'success_chime' },
      visual: { cameraZoom: true, highlightSlot: true, successSparkle: true },
      accessibility: { voicePrompt: true, largeTouchTarget: true, reducedMotion: true },
      title: '🚦 Sinyal lalu lintas kereta!',
      hints: [
        'Lihat warna sinyal! 💡',
        'Merah = berhenti ✋, Kuning = pelan 🐢, Hijau = maju ➡️',
        'Yang ini! 👇',
      ],

      interaction: {
        setup(ctx, callbacks) {
          const body = ctx.body
          if (!body) return

          // Track timers for teardown
          ctx._timers = []
          const reduced = (OE.reducedMotion ? OE.reducedMotion() : false)

          // Random signal color
          const COLORS = ['red', 'yellow', 'green']
          const ACTION_ICON = { red:'✋', yellow:'🐢', green:'➡️' }
          const ACTION_LABEL = { red:'Berhenti', yellow:'Pelan', green:'Maju' }
          const LIGHT_HEX = { red:'#ef4444', yellow:'#fbbf24', green:'#22c55e' }
          const GLOW_HEX = { red:'rgba(239,68,68,0.85)', yellow:'rgba(251,191,36,0.85)', green:'rgba(34,197,94,0.85)' }
          const showColor = COLORS[Math.floor(Math.random() * 3)]

          const title = document.createElement('div')
          title.className = 'obstacle-engine-title'
          title.textContent = '🚦 Sinyal kereta!'
          body.appendChild(title)

          const sub = document.createElement('div')
          sub.className = 'obstacle-engine-subtitle'
          sub.textContent = 'Pilih tombol sesuai warna lampu sinyal.'
          body.appendChild(sub)

          // v54.87: cinematic signal scene — rail + 3-light pole on right + train
          const sceneRow = document.createElement('div')
          sceneRow.className = 'obstacle-engine-row'
          const scene = document.createElement('div')
          scene.style.cssText = 'position:relative;width:min(86vw,460px);height:96px;background:linear-gradient(180deg,#bae6fd 0%,#fde68a 60%,#a3a3a3 100%);border-radius:14px;border:3px solid #475569;overflow:hidden;box-shadow:inset 0 -8px 12px rgba(0,0,0,0.18);'

          const rail = document.createElement('div')
          rail.style.cssText = 'position:absolute;bottom:18px;left:0;right:0;height:6px;background:linear-gradient(180deg,#475569 0%,#1e293b 100%);'
          scene.appendChild(rail)
          for (let i = 0; i < 8; i++) {
            const s = document.createElement('div')
            s.style.cssText = `position:absolute;bottom:8px;left:${i*58+10}px;width:34px;height:10px;background:#7c2d12;border-radius:2px;`
            scene.appendChild(s)
          }

          // Train (left) — will roll across on success
          const train = document.createElement('div')
          train.style.cssText = 'position:absolute;bottom:24px;left:10px;font-size:42px;line-height:1;transition:transform 1.2s cubic-bezier(0.4,0,0.3,1);z-index:2;'
          train.textContent = '🚂'
          scene.appendChild(train)

          // Active light glow halo (behind pole)
          const glow = document.createElement('div')
          glow.style.cssText = `position:absolute;bottom:18px;right:6px;width:64px;height:78px;border-radius:14px;background:radial-gradient(circle,${GLOW_HEX[showColor]} 0%,transparent 70%);opacity:0.6;pointer-events:none;${reduced ? '' : 'animation:obstacle-target-pulse 1.4s ease-in-out infinite;'}`
          scene.appendChild(glow)

          // Signal pole (right) — black post with 3 stacked lamps (red/yellow/green)
          const pole = document.createElement('div')
          pole.style.cssText = 'position:absolute;bottom:24px;right:22px;width:30px;height:66px;background:linear-gradient(180deg,#1f2937 0%,#374151 100%);border-radius:6px 6px 2px 2px;border:2px solid #111827;display:flex;flex-direction:column;align-items:center;justify-content:space-evenly;padding:4px 0;z-index:1;box-shadow:0 2px 4px rgba(0,0,0,0.3);'
          const lamps = {}
          COLORS.forEach(c => {
            const lamp = document.createElement('div')
            const on = (c === showColor)
            lamp.style.cssText = `width:14px;height:14px;border-radius:50%;background:${on ? LIGHT_HEX[c] : '#1f2937'};border:1.5px solid #0f172a;box-shadow:${on ? `0 0 10px 3px ${GLOW_HEX[c]}` : 'none'};transition:background 0.25s,box-shadow 0.25s;`
            pole.appendChild(lamp)
            lamps[c] = lamp
          })
          scene.appendChild(pole)

          sceneRow.appendChild(scene)
          body.appendChild(sceneRow)

          // Choices
          const choicesRow = document.createElement('div')
          choicesRow.className = 'obstacle-engine-row'

          const shuffled = COLORS.slice().sort(() => Math.random() - 0.5)
          const onPick = (btn, color) => {
            const all = choicesRow.querySelectorAll('.obstacle-engine-shape-btn')
            if (color === showColor) {
              btn.classList.add('correct')
              all.forEach(b => { b.disabled = true })
              OE.spawnSparkles(btn, 6)
              // Flash green light 3× then roll the train past the pole
              let flips = 0
              const flashGreen = () => {
                const on = (flips % 2 === 0)
                lamps.green.style.background = on ? LIGHT_HEX.green : '#1f2937'
                lamps.green.style.boxShadow = on ? `0 0 14px 5px ${GLOW_HEX.green}` : 'none'
                lamps.red.style.background = '#1f2937'; lamps.red.style.boxShadow = 'none'
                lamps.yellow.style.background = '#1f2937'; lamps.yellow.style.boxShadow = 'none'
                glow.style.background = `radial-gradient(circle,${GLOW_HEX.green} 0%,transparent 70%)`
                flips++
                if (flips < 6) ctx._timers.push(setTimeout(flashGreen, reduced ? 60 : 180))
              }
              flashGreen()
              ctx._timers.push(setTimeout(() => {
                const dist = scene.clientWidth - 110
                train.style.transform = `translateX(${dist}px)`
              }, reduced ? 120 : 750))
              ctx._timers.push(setTimeout(() => callbacks.success(), reduced ? 400 : 1500))
            } else {
              btn.classList.add('wrong')
              ctx._timers.push(setTimeout(() => btn.classList.remove('wrong'), 500))
              callbacks.fail()
            }
          }

          shuffled.forEach(c => {
            const btn = document.createElement('button')
            btn.className = 'obstacle-engine-shape-btn'
            btn.style.flexDirection = 'column'
            btn.style.fontSize = '20px'
            btn.style.minWidth = '108px'
            btn.innerHTML = '<span style="font-size:36px;line-height:1">' + ACTION_ICON[c] + '</span><span style="font-size:14px;font-weight:700;margin-top:4px">' + ACTION_LABEL[c] + '</span>'
            btn.dataset.color = c
            btn.addEventListener('click', () => onPick(btn, c))
            choicesRow.appendChild(btn)
          })

          body.appendChild(choicesRow)
          OE.speak('Pilih tombol sesuai warna sinyal')
        },
        teardown(ctx) {
          if (ctx && ctx._timers) {
            ctx._timers.forEach(t => clearTimeout(t))
            ctx._timers = null
          }
        }
      },
    })

    // ── Animal crossing generator (6 variants, spec §13) ────────────────────
    function makeAnimalCrossingObstacle(animal, name) {
      return {
        type: 'kindness_tap',
        difficulty: 1,
        ageRange: '4-7',
        allowedLocations: ['*'],
        allowedJourneyPhases: ['suburban', 'countryside'],
        requiredAction: 'tap_button',
        softFail: true,
        maxRetry: 3,
        // v54.85: kindness_star sticker rewarded on success (catalog entry exists)
        reward: { coins: 5, badgeProgress: 1, sound: 'success_chime', sticker: 'kindness_star' },
        visual: { cameraZoom: true, successSparkle: true },
        accessibility: { voicePrompt: true, largeTouchTarget: true, reducedMotion: true },
        title: animal + ' menyeberang rel!',
        hints: [
          'Tap bell untuk berhenti! 🔔',
          'Bunyikan bell agar ' + name + ' aman!',
          'Tap tombol bell 👇',
        ],

        interaction: {
          setup(ctx, callbacks) {
            const body = ctx.body
            if (!body) return

            const title = document.createElement('div')
            title.className = 'obstacle-engine-title'
            title.textContent = animal + ' menyeberang rel!'
            body.appendChild(title)

            const sub = document.createElement('div')
            sub.className = 'obstacle-engine-subtitle'
            sub.textContent = 'Bunyikan bell agar kereta berhenti dan ' + name + ' lewat aman.'
            body.appendChild(sub)

            // v54.85: cinematic scene — animated train + animal slide across track
            const sceneRow = document.createElement('div')
            sceneRow.className = 'obstacle-engine-row'
            const scene = document.createElement('div')
            scene.style.cssText = 'position:relative;width:min(86vw,460px);height:96px;background:linear-gradient(180deg,#bae6fd 0%,#fef3c7 60%,#d4a574 100%);border-radius:14px;border:3px solid #92400e;overflow:hidden;box-shadow:inset 0 -8px 12px rgba(0,0,0,0.15);'

            // Rail layer (decorative)
            const rail = document.createElement('div')
            rail.style.cssText = 'position:absolute;bottom:18px;left:0;right:0;height:6px;background:linear-gradient(180deg,#475569 0%,#1e293b 100%);'
            scene.appendChild(rail)
            // Sleepers
            for (let i = 0; i < 8; i++) {
              const s = document.createElement('div')
              s.style.cssText = `position:absolute;bottom:8px;left:${i*60+10}px;width:36px;height:10px;background:#7c2d12;border-radius:2px;`
              scene.appendChild(s)
            }
            // Train (left side, faces right)
            const train = document.createElement('div')
            train.style.cssText = 'position:absolute;bottom:24px;left:8px;font-size:46px;line-height:1;transition:transform 0.6s ease-out;'
            train.textContent = '🚂'
            scene.appendChild(train)
            // Animal (right side, walks toward left/center then off-screen left)
            const animalEl = document.createElement('div')
            animalEl.style.cssText = 'position:absolute;bottom:28px;right:20px;font-size:42px;line-height:1;transition:transform 2.4s linear;'
            animalEl.textContent = animal
            scene.appendChild(animalEl)

            sceneRow.appendChild(scene)
            body.appendChild(sceneRow)

            // Bell button
            const btnRow = document.createElement('div')
            btnRow.className = 'obstacle-engine-row'
            const btn = document.createElement('button')
            btn.className = 'obstacle-engine-shape-btn'
            btn.style.flexDirection = 'column'
            btn.style.minWidth = '140px'
            btn.style.minHeight = '100px'
            btn.style.background = 'linear-gradient(135deg,#fef3c7,#fcd34d)'
            btn.style.borderColor = '#d97706'
            btn.style.color = '#7c2d12'
            btn.innerHTML = '<span style="font-size:42px;line-height:1">🔔</span><span style="font-size:14px;font-weight:900;margin-top:4px">Bunyikan!</span>'

            btn.addEventListener('click', () => {
              btn.classList.add('correct')
              btn.disabled = true
              // v54.85: animate sequence — train holds, animal walks across to safety
              train.style.transform = 'translateX(0)' // train stays put
              // Animal walks across (right → left) over 2.4s
              const distance = scene.clientWidth - 60
              animalEl.style.transform = `translateX(-${distance}px)`
              OE.spawnSparkles(btn, 6)
              setTimeout(() => {
                OE.spawnSparkles(animalEl, 8) // safe arrival sparkles
                setTimeout(() => callbacks.success(), 600)
              }, 2200)
            })

            btnRow.appendChild(btn)
            body.appendChild(btnRow)
            OE.speak('Tap bell untuk membantu ' + name)
          },
          teardown() {}
        },
      }
    }

    OE.register('animal_crossing_cat',  makeAnimalCrossingObstacle('🐱', 'kucing'))
    OE.register('animal_crossing_dog',  makeAnimalCrossingObstacle('🐶', 'anjing'))
    OE.register('animal_crossing_duck', makeAnimalCrossingObstacle('🦆', 'bebek'))
    OE.register('animal_crossing_cow',  makeAnimalCrossingObstacle('🐮', 'sapi'))
    OE.register('animal_crossing_goat', makeAnimalCrossingObstacle('🐐', 'kambing'))
    OE.register('animal_crossing_bird', makeAnimalCrossingObstacle('🐦', 'burung'))

    // ── Lane choice generator (falling rocks small + water puddle swerve) ───
    function makeLaneChoiceObstacle(opts) {
      return {
        type: 'lane_choice',
        difficulty: 1,
        ageRange: '4-7',
        allowedLocations: ['*'],
        allowedJourneyPhases: opts.allowedJourneyPhases || ['*'],
        requiredAction: 'tap_choice',
        softFail: true,
        maxRetry: 3,
        reward: { coins: 5, badgeProgress: 1, sound: 'success_chime' },
        visual: { cameraZoom: true, highlightSlot: true, successSparkle: true },
        accessibility: { voicePrompt: true, largeTouchTarget: true, reducedMotion: true },
        title: opts.title,
        hints: [
          'Coba lane lain! 💡',
          'Pilih lane yang kosong (tidak ada rintangan)! ✨',
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
            sub.textContent = opts.subtitle || 'Pilih lane yang aman untuk kereta lewat.'
            body.appendChild(sub)

            const safeIdx = Math.floor(Math.random() * 3)
            const lanes = ['kiri', 'tengah', 'kanan']

            const choicesRow = document.createElement('div')
            choicesRow.className = 'obstacle-engine-row'

            lanes.forEach((lane, i) => {
              const btn = document.createElement('button')
              btn.className = 'obstacle-engine-shape-btn'
              btn.style.flexDirection = 'column'
              btn.style.minWidth = '100px'
              btn.style.minHeight = '100px'
              const inner = document.createElement('span')
              inner.style.cssText = 'font-size:36px;line-height:1;display:block;'
              inner.textContent = i === safeIdx ? '🛤️' : opts.obstacleIcon
              const label = document.createElement('span')
              label.style.cssText = 'font-size:13px;font-weight:900;margin-top:4px;'
              label.textContent = lane.toUpperCase()
              btn.appendChild(inner); btn.appendChild(label)
              btn.dataset.idx = i

              btn.addEventListener('click', () => {
                if (i === safeIdx) {
                  btn.classList.add('correct')
                  OE.spawnSparkles(btn, 6)
                  Array.from(choicesRow.querySelectorAll('button')).forEach(b => { b.disabled = true })
                  setTimeout(() => callbacks.success(), 700)
                } else {
                  btn.classList.add('wrong')
                  setTimeout(() => btn.classList.remove('wrong'), 500)
                  callbacks.fail()
                }
              })
              choicesRow.appendChild(btn)
            })

            body.appendChild(choicesRow)
            OE.speak('Pilih lane yang aman')
          },
          teardown() {}
        },
      }
    }

    OE.register('falling_rocks_small', makeLaneChoiceObstacle({
      title: '🪨 Batu kecil di rel!',
      subtitle: 'Pilih lane tanpa batu untuk kereta lewat.',
      obstacleIcon: '🪨',
    }))

    OE.register('water_puddle_swerve', makeLaneChoiceObstacle({
      title: '💧 Genangan air di rel!',
      subtitle: 'Pilih lane yang kering.',
      obstacleIcon: '💧',
    }))

    // ── Falling rocks big — drag rock to side ────────────────────────────────
    OE.register('falling_rocks_big', {
      type: 'drag_to_side',
      difficulty: 2,
      ageRange: '5-7',
      allowedLocations: ['*'],
      allowedJourneyPhases: ['countryside', 'suburban'],
      requiredAction: 'tap_count',
      softFail: true,
      maxRetry: 3,
      reward: { coins: 7, badgeProgress: 1, sound: 'success_chime' },
      visual: { cameraZoom: true, successSparkle: true },
      accessibility: { voicePrompt: true, largeTouchTarget: true, reducedMotion: true },
      title: '🪨 Batu besar menutup rel!',
      hints: [
        'Tap berkali-kali untuk pindahkan batu! 💪',
        'Tap lagi! Hampir bisa!',
        'Tap! 👇',
      ],

      interaction: {
        setup(ctx, callbacks) {
          const body = ctx.body
          if (!body) return

          const title = document.createElement('div')
          title.className = 'obstacle-engine-title'
          title.textContent = '🪨 Batu besar menutup rel!'
          body.appendChild(title)

          const sub = document.createElement('div')
          sub.className = 'obstacle-engine-subtitle'
          sub.textContent = 'Tap batu 5 kali untuk menggesernya.'
          body.appendChild(sub)

          const rockRow = document.createElement('div')
          rockRow.className = 'obstacle-engine-row'

          const rock = document.createElement('button')
          rock.className = 'obstacle-engine-shape-btn'
          rock.style.fontSize = '64px'
          rock.style.minWidth = '120px'
          rock.style.minHeight = '120px'
          rock.textContent = '🪨'
          rockRow.appendChild(rock)
          body.appendChild(rockRow)

          // Progress bar
          const bar = document.createElement('div')
          bar.style.cssText = 'width:80%;height:18px;background:rgba(0,0,0,0.1);border-radius:9px;margin:8px auto;border:2px solid #92400e;overflow:hidden;'
          const fill = document.createElement('div')
          fill.style.cssText = 'height:100%;width:0%;background:linear-gradient(90deg,#fbbf24,#fb923c);transition:width 0.2s;'
          bar.appendChild(fill)
          body.appendChild(bar)

          let count = 0
          const TARGET = 5
          rock.addEventListener('click', () => {
            count++
            const pct = Math.min(100, (count / TARGET) * 100)
            fill.style.width = pct + '%'
            rock.style.transform = 'translateX(' + (count * 6) + 'px)'
            OE.spawnSparkles(rock, 3)
            if (count >= TARGET) {
              rock.disabled = true
              rock.classList.add('correct')
              rock.textContent = '✅'
              setTimeout(() => callbacks.success(), 600)
            }
          })

          OE.speak('Tap batu beberapa kali')
        },
        teardown() {}
      },
    })

    // Falling rocks question crane — answer question → helper crane removes rock
    OE.register('falling_rocks_question_crane', makeQuestionGateObstacle({
      title: '🏗️ Panggil derek untuk angkat batu!',
      banner: '🏗️🪨',
      questionCategory: 'number',
      difficulty: 2,
      coins: 7,
      hints: [
        'Pilih angka yang benar! 💡',
        'Derek butuh angka tepat untuk angkat batu! ✨',
        'Yang ini! 👇',
      ],
      onSuccess(body) {
        const fx = document.createElement('div')
        fx.style.cssText = 'position:absolute;top:8px;left:50%;transform:translateX(-50%);font-size:48px;animation:obstacle-target-pulse 0.6s ease-out;'
        fx.textContent = '🏗️✨'
        body.appendChild(fx)
        setTimeout(() => fx.remove(), 900)
      },
    }))

    // ── Water puddle pump — tap-repeat pattern ─────────────────────────────
    OE.register('water_puddle_pump', {
      type: 'tap_repeat',
      difficulty: 1,
      ageRange: '4-7',
      allowedLocations: ['*'],
      allowedJourneyPhases: ['*'],
      requiredAction: 'tap_count',
      softFail: true,
      maxRetry: 3,
      reward: { coins: 5, badgeProgress: 1, sound: 'success_chime' },
      visual: { cameraZoom: true, successSparkle: true },
      accessibility: { voicePrompt: true, largeTouchTarget: true, reducedMotion: true },
      title: '💧 Kuras genangan air!',
      hints: [
        'Tap pump untuk kuras air! 💪',
        'Tap lagi!',
        'Tap! 👇',
      ],

      interaction: {
        setup(ctx, callbacks) {
          const body = ctx.body
          if (!body) return

          ctx._timers = []
          const reduced = (OE.reducedMotion ? OE.reducedMotion() : false)

          const title = document.createElement('div')
          title.className = 'obstacle-engine-title'
          title.textContent = '💧 Kuras genangan air!'
          body.appendChild(title)

          const sub = document.createElement('div')
          sub.className = 'obstacle-engine-subtitle'
          sub.textContent = 'Tap pompa 4 kali untuk mengeringkan rel.'
          body.appendChild(sub)

          // v54.87: cinematic puddle scene — rail + animated blue puddle with ripples
          const sceneRow = document.createElement('div')
          sceneRow.className = 'obstacle-engine-row'
          const scene = document.createElement('div')
          scene.style.cssText = 'position:relative;width:min(86vw,460px);height:96px;background:linear-gradient(180deg,#cffafe 0%,#a5f3fc 55%,#7dd3fc 100%);border-radius:14px;border:3px solid #0e7490;overflow:hidden;box-shadow:inset 0 -8px 12px rgba(0,0,0,0.15);'

          // Rail + sleepers (partially submerged)
          const rail = document.createElement('div')
          rail.style.cssText = 'position:absolute;bottom:18px;left:0;right:0;height:6px;background:linear-gradient(180deg,#475569 0%,#1e293b 100%);'
          scene.appendChild(rail)
          for (let i = 0; i < 8; i++) {
            const s = document.createElement('div')
            s.style.cssText = `position:absolute;bottom:8px;left:${i*58+10}px;width:34px;height:10px;background:#7c2d12;border-radius:2px;`
            scene.appendChild(s)
          }

          // Train on left edge — waits while pumping
          const train = document.createElement('div')
          train.style.cssText = 'position:absolute;bottom:24px;left:10px;font-size:42px;line-height:1;z-index:2;'
          train.textContent = '🚂'
          scene.appendChild(train)

          // Puddle layer — 3 ellipse ripples concentric, shrink with each pump
          const puddleWrap = document.createElement('div')
          puddleWrap.style.cssText = 'position:absolute;bottom:14px;left:50%;transform:translateX(-50%);width:180px;height:36px;pointer-events:none;z-index:1;'
          const ripples = []
          const RIPPLE_TINT = ['rgba(8,145,178,0.85)', 'rgba(14,165,233,0.55)', 'rgba(125,211,252,0.45)']
          ;[1.0, 0.78, 0.55].forEach((scale, idx) => {
            const ell = document.createElement('div')
            ell.style.cssText = `position:absolute;left:50%;bottom:0;transform:translateX(-50%) scale(${scale});width:180px;height:30px;border-radius:50%;background:radial-gradient(ellipse at center,${RIPPLE_TINT[idx]} 0%,rgba(125,211,252,0.15) 90%);transition:transform 0.45s cubic-bezier(0.34,1.2,0.64,1),opacity 0.4s;`
            ell.dataset.baseScale = String(scale)
            puddleWrap.appendChild(ell)
            ripples.push(ell)
          })
          scene.appendChild(puddleWrap)

          sceneRow.appendChild(scene)
          body.appendChild(sceneRow)

          const row = document.createElement('div')
          row.className = 'obstacle-engine-row'
          const pump = document.createElement('button')
          pump.className = 'obstacle-engine-shape-btn'
          pump.style.minWidth = '140px'
          pump.style.minHeight = '120px'
          pump.style.fontSize = '50px'
          pump.textContent = '🔧'
          row.appendChild(pump)
          body.appendChild(row)

          const bar = document.createElement('div')
          bar.style.cssText = 'width:80%;height:24px;background:#bfdbfe;border-radius:12px;margin:8px auto;border:2px solid #1e40af;overflow:hidden;position:relative;'
          const fill = document.createElement('div')
          fill.style.cssText = 'height:100%;width:100%;background:linear-gradient(90deg,#3b82f6,#60a5fa);transition:width 0.2s;'
          bar.appendChild(fill)
          body.appendChild(bar)

          let count = 0
          let currentShrink = 1.0
          const TARGET = 4

          // Gentle ripple wobble (composed on top of currentShrink, so click shrink survives)
          if (!reduced) {
            let phase = 0
            const interval = setInterval(() => {
              phase += 1
              ripples.forEach((r, i) => {
                const base = parseFloat(r.dataset.baseScale)
                const wobble = 1 + Math.sin((phase + i * 1.2) * 0.5) * 0.04
                r.style.transform = `translateX(-50%) scale(${(base * currentShrink * wobble).toFixed(3)})`
              })
            }, 220)
            ctx._wobbleInterval = interval
          }

          pump.addEventListener('click', () => {
            count++
            const pct = Math.max(0, 100 - (count / TARGET) * 100)
            fill.style.width = pct + '%'
            OE.spawnSparkles(pump, 3)
            // Shrink each ripple ellipse by ~20% per tap (composed via currentShrink)
            currentShrink = Math.max(0.05, 1 - (count / TARGET) * 0.95)
            ripples.forEach(r => {
              const base = parseFloat(r.dataset.baseScale)
              r.style.transform = `translateX(-50%) scale(${(base * currentShrink).toFixed(3)})`
              r.style.opacity = String(Math.max(0.15, currentShrink))
            })
            if (count >= TARGET) {
              pump.disabled = true
              pump.classList.add('correct')
              pump.textContent = '✅'
              // Final steam burst + sparkle bloom
              if (ctx._wobbleInterval) { clearInterval(ctx._wobbleInterval); ctx._wobbleInterval = null }
              ripples.forEach(r => { r.style.opacity = '0'; r.style.transform = 'translateX(-50%) scale(0.05)' })
              const steam = document.createElement('div')
              steam.style.cssText = 'position:absolute;bottom:30px;left:50%;transform:translateX(-50%);font-size:30px;line-height:1;opacity:0;transition:opacity 0.3s,transform 0.6s ease-out;z-index:3;'
              steam.textContent = '💨💨💨'
              scene.appendChild(steam)
              ctx._timers.push(setTimeout(() => {
                steam.style.opacity = '0.9'
                steam.style.transform = 'translateX(-50%) translateY(-14px)'
                OE.spawnSparkles(scene, 8)
              }, reduced ? 20 : 120))
              ctx._timers.push(setTimeout(() => callbacks.success(), reduced ? 350 : 800))
            }
          })

          OE.speak('Tap pompa untuk kuras air')
        },
        teardown(ctx) {
          if (ctx) {
            if (ctx._wobbleInterval) { clearInterval(ctx._wobbleInterval); ctx._wobbleInterval = null }
            if (ctx._timers) {
              ctx._timers.forEach(t => { try { clearTimeout(t); clearInterval(t) } catch (e) {} })
              ctx._timers = null
            }
          }
        }
      },
    })

    // Water puddle plank — single drag to bridge (simplified: tap plank to place)
    OE.register('water_puddle_plank', makeBridgeRepairObstacle({
      title: '🪵 Pasang papan kayu di atas air!',
      subtitle: 'Pilih papan kayu untuk jembatan sementara.',
      slots: ['plank'],
      slotIcons: ['🪵'],
      distractors: [{ key:'_d0', icon:'🪨' }, { key:'_d1', icon:'🌿' }],
      difficulty: 1,
    }))

    // ── Choice / Memory / Balance tranche v54.73 ────────────────────────────

    // Choose correct track — junction with signage. Wrong path = no harm, just retry.
    function makeChooseTrackObstacle(opts) {
      return {
        type: 'route_choice',
        difficulty: opts.difficulty || 2,
        ageRange: opts.ageRange || '5-7',
        allowedLocations: ['*'],
        allowedJourneyPhases: ['urban_exit', 'suburban', 'approaching_station'],
        requiredAction: 'tap_choice',
        softFail: true,
        maxRetry: 3,
        reward: { coins: 6, badgeProgress: 1, sound: 'success_chime' },
        visual: { cameraZoom: true, highlightSlot: true, successSparkle: true },
        accessibility: { voicePrompt: true, largeTouchTarget: true, reducedMotion: true },
        title: opts.title,
        hints: [
          'Coba jalur lain! 💡',
          'Lihat tanda yang ditanya! ✨',
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
            sub.textContent = opts.subtitle
            body.appendChild(sub)

            const targetIdx = Math.floor(Math.random() * opts.choices.length)
            const targetChoice = opts.choices[targetIdx]

            // Prompt
            const prompt = document.createElement('div')
            prompt.style.cssText = 'text-align:center;font-size:clamp(15px,3.6vw,18px);font-weight:900;color:#3b2066;padding:8px 0 12px;'
            prompt.textContent = opts.promptPrefix + ' ' + (targetChoice.label || targetChoice.icon)
            body.appendChild(prompt)

            const choicesRow = document.createElement('div')
            choicesRow.className = 'obstacle-engine-row'
            const shuffled = opts.choices.map((c, i) => ({ ...c, idx: i })).sort(() => Math.random() - 0.5)

            shuffled.forEach(c => {
              const btn = document.createElement('button')
              btn.className = 'obstacle-engine-shape-btn'
              btn.style.flexDirection = 'column'
              btn.style.minWidth = '108px'
              btn.style.minHeight = '110px'
              const ic = document.createElement('span')
              ic.style.cssText = 'font-size:42px;line-height:1;'
              ic.textContent = c.icon
              const lab = document.createElement('span')
              lab.style.cssText = 'font-size:13px;font-weight:900;margin-top:4px;'
              lab.textContent = c.label || ''
              btn.appendChild(ic); btn.appendChild(lab)

              btn.addEventListener('click', () => {
                if (c.idx === targetIdx) {
                  btn.classList.add('correct')
                  OE.spawnSparkles(btn, 6)
                  Array.from(choicesRow.querySelectorAll('button')).forEach(b => { b.disabled = true })
                  setTimeout(() => callbacks.success(), 700)
                } else {
                  btn.classList.add('wrong')
                  setTimeout(() => btn.classList.remove('wrong'), 500)
                  callbacks.fail()
                }
              })
              choicesRow.appendChild(btn)
            })

            body.appendChild(choicesRow)
            OE.speak(opts.voice || 'Pilih jalur yang benar')
          },
          teardown() {}
        },
      }
    }

    OE.register('choose_correct_track_destination', makeChooseTrackObstacle({
      title: '🚉 Pilih jalur menuju stasiun!',
      subtitle: 'Kereta harus ke stasiun yang ditunjukkan.',
      promptPrefix: 'Pergi ke',
      voice: 'Pilih stasiun tujuan',
      choices: [
        { icon:'🅰️', label:'Stasiun A' },
        { icon:'🅱️', label:'Stasiun B' },
        { icon:'🆎', label:'Stasiun AB' },
      ],
    }))

    OE.register('choose_track_color', makeChooseTrackObstacle({
      title: '🚦 Pilih jalur warna!',
      subtitle: 'Pilih rel dengan warna yang ditanya.',
      promptPrefix: 'Pilih warna:',
      voice: 'Pilih jalur warna',
      choices: [
        { icon:'🔴', label:'Merah' },
        { icon:'🟢', label:'Hijau' },
        { icon:'🔵', label:'Biru' },
      ],
    }))

    OE.register('choose_track_number', makeChooseTrackObstacle({
      title: '🔢 Pilih jalur angka!',
      subtitle: 'Pilih rel dengan angka yang ditanya.',
      promptPrefix: 'Pilih angka:',
      voice: 'Pilih jalur angka',
      choices: [
        { icon:'1️⃣', label:'Satu' },
        { icon:'2️⃣', label:'Dua' },
        { icon:'3️⃣', label:'Tiga' },
      ],
    }))

    OE.register('choose_track_shape', makeChooseTrackObstacle({
      title: '🔷 Pilih jalur bentuk!',
      subtitle: 'Pilih rel dengan bentuk yang ditanya.',
      promptPrefix: 'Pilih bentuk:',
      voice: 'Pilih jalur bentuk',
      choices: [
        { icon:'▲', label:'Segitiga' },
        { icon:'⬤', label:'Lingkaran' },
        { icon:'■', label:'Persegi' },
      ],
    }))

    // ── Memory sequence (Simon-says, spec §16) ──────────────────────────────
    function makeMemorySequenceObstacle(seqLength, difficulty) {
      return {
        type: 'memory_sequence',
        difficulty: difficulty,
        ageRange: seqLength <= 2 ? '4-5' : (seqLength <= 3 ? '5-7' : '6-7'),
        allowedLocations: ['*'],
        allowedJourneyPhases: ['*'],
        requiredAction: 'tap_sequence',
        softFail: true,
        maxRetry: 3,
        reward: { coins: 4 + seqLength, badgeProgress: 1, sound: 'success_chime' },
        visual: { cameraZoom: true, highlightSlot: true, successSparkle: true },
        accessibility: { voicePrompt: true, largeTouchTarget: true, reducedMotion: true },
        title: '🎨 Tirukan urutan lampu! (' + seqLength + ' warna)',
        hints: [
          'Tap warna dengan urutan yang sama! 💡',
          'Lihat warnanya menyala satu per satu! ✨',
          'Coba lagi! 👇',
        ],

        interaction: {
          setup(ctx, callbacks) {
            const body = ctx.body
            if (!body) return

            const title = document.createElement('div')
            title.className = 'obstacle-engine-title'
            title.textContent = '🎨 Tirukan urutan lampu!'
            body.appendChild(title)

            const sub = document.createElement('div')
            sub.className = 'obstacle-engine-subtitle'
            sub.textContent = 'Lihat urutan, lalu tap warna sesuai.'
            body.appendChild(sub)

            const COLORS = ['red', 'green', 'blue', 'yellow']
            const ICONS = { red:'🔴', green:'🟢', blue:'🔵', yellow:'🟡' }

            // Generate random sequence
            const sequence = []
            for (let i = 0; i < seqLength; i++) {
              sequence.push(COLORS[Math.floor(Math.random() * COLORS.length)])
            }

            const choicesRow = document.createElement('div')
            choicesRow.className = 'obstacle-engine-row'

            const buttons = {}
            const shown = COLORS.slice(0, Math.max(seqLength + 1, 3))
            shown.forEach(c => {
              const btn = document.createElement('button')
              btn.className = 'obstacle-engine-shape-btn'
              btn.style.fontSize = '54px'
              btn.dataset.color = c
              btn.textContent = ICONS[c]
              btn.disabled = true
              btn.addEventListener('click', () => onTap(btn, c))
              choicesRow.appendChild(btn)
              buttons[c] = btn
            })
            body.appendChild(choicesRow)

            // Play the sequence
            let playStep = 0
            const playInterval = setInterval(() => {
              if (playStep >= sequence.length) {
                clearInterval(playInterval)
                // Enable taps
                Object.values(buttons).forEach(b => { b.disabled = false })
                sub.textContent = 'Sekarang tap urutan tadi!'
                return
              }
              const c = sequence[playStep]
              const btn = buttons[c]
              if (btn) {
                btn.style.transform = 'scale(1.15)'
                btn.style.boxShadow = '0 0 22px rgba(251,191,36,0.95)'
                setTimeout(() => {
                  btn.style.transform = ''
                  btn.style.boxShadow = ''
                }, 350)
              }
              playStep++
            }, 600)

            let userStep = 0
            function onTap(btn, color) {
              const expected = sequence[userStep]
              if (color === expected) {
                btn.classList.add('correct')
                setTimeout(() => btn.classList.remove('correct'), 250)
                userStep++
                if (userStep >= sequence.length) {
                  Object.values(buttons).forEach(b => { b.disabled = true })
                  OE.spawnSparkles(body.querySelector('.obstacle-engine-row:last-child'), 8)
                  setTimeout(() => callbacks.success(), 700)
                }
              } else {
                btn.classList.add('wrong')
                setTimeout(() => btn.classList.remove('wrong'), 500)
                userStep = 0 // restart sequence input
                callbacks.fail()
              }
            }

            ctx.__cleanup = () => { clearInterval(playInterval) }
            OE.speak('Tirukan urutan lampu')
          },
          teardown(ctx) { if (ctx && ctx.__cleanup) ctx.__cleanup() }
        },
      }
    }

    OE.register('memory_sequence_2color', makeMemorySequenceObstacle(2, 1))
    OE.register('memory_sequence_3color', makeMemorySequenceObstacle(3, 2))
    OE.register('memory_sequence_4color', makeMemorySequenceObstacle(4, 3))

    // ── Friendly race boost (spec §17) — quick question for speed boost ─────
    OE.register('friendly_race_boost', makeQuestionGateObstacle({
      title: '🏁 Tantangan teman!',
      banner: '🚂💨🚂',
      questionCategory: 'comparison',
      difficulty: 1,
      coins: 6,
      hints: [
        'Coba pilihan lain! 💡',
        'Lihat baik-baik! ✨',
        'Yang ini! 👇',
      ],
      onSuccess(body) {
        const fx = document.createElement('div')
        fx.style.cssText = 'position:absolute;top:8px;left:50%;transform:translateX(-50%);font-size:48px;animation:obstacle-target-pulse 0.6s ease-out;'
        fx.textContent = '🚂💨✨'
        body.appendChild(fx)
        setTimeout(() => fx.remove(), 900)
      },
    }))

    // ── Windy bridge balance (spec §14) — left/right tap to balance ─────────
    // ── Station task tranche v54.74 — 8 station mini-tasks ─────────────────

    // Cargo sort generator — drag cargo icon to matching wagon
    function makeCargoSortObstacle(opts) {
      return {
        type: 'cargo_sort',
        difficulty: opts.difficulty || 2,
        ageRange: '5-7',
        allowedLocations: ['*'],
        allowedJourneyPhases: ['arrival'],
        requiredAction: 'tap_match',
        softFail: true,
        maxRetry: 3,
        reward: { coins: opts.coins || 8, badgeProgress: 1, sound: 'success_chime' },
        visual: { cameraZoom: true, highlightSlot: true, successSparkle: true },
        accessibility: { voicePrompt: true, largeTouchTarget: true, reducedMotion: true },
        title: opts.title,
        hints: [
          'Cocokkan dengan benar! 💡',
          'Lihat warnanya / bentuknya! ✨',
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
            sub.textContent = opts.subtitle || 'Antar muatan ke gerbong yang sesuai.'
            body.appendChild(sub)

            const cargoIdx = Math.floor(Math.random() * opts.cargoes.length)
            const target = opts.cargoes[cargoIdx]

            // Cargo display (the item to deliver)
            const cargoRow = document.createElement('div')
            cargoRow.className = 'obstacle-engine-row'
            const cargo = document.createElement('div')
            cargo.style.cssText = 'font-size:64px;line-height:1;padding:8px 12px;background:rgba(255,255,255,0.6);border-radius:14px;'
            cargo.textContent = target.icon
            cargoRow.appendChild(cargo)
            const arrow = document.createElement('div')
            arrow.style.cssText = 'font-size:32px;display:inline-flex;align-items:center;padding:0 8px;'
            arrow.textContent = '➡️'
            cargoRow.appendChild(arrow)
            body.appendChild(cargoRow)

            // Wagons row
            const wagonsRow = document.createElement('div')
            wagonsRow.className = 'obstacle-engine-row'
            const shuffled = opts.cargoes.map((c, i) => ({ ...c, idx: i })).sort(() => Math.random() - 0.5)
            shuffled.forEach(c => {
              const btn = document.createElement('button')
              btn.className = 'obstacle-engine-shape-btn'
              btn.style.flexDirection = 'column'
              btn.style.minWidth = '100px'
              btn.style.minHeight = '110px'
              const ic = document.createElement('span')
              ic.style.cssText = 'font-size:42px;line-height:1;'
              ic.textContent = c.wagon
              const lab = document.createElement('span')
              lab.style.cssText = 'font-size:12px;font-weight:900;margin-top:4px;'
              lab.textContent = c.label
              btn.appendChild(ic); btn.appendChild(lab)

              btn.addEventListener('click', () => {
                if (c.idx === cargoIdx) {
                  btn.classList.add('correct')
                  OE.spawnSparkles(btn, 6)
                  Array.from(wagonsRow.querySelectorAll('button')).forEach(b => { b.disabled = true })
                  setTimeout(() => callbacks.success(), 700)
                } else {
                  btn.classList.add('wrong')
                  setTimeout(() => btn.classList.remove('wrong'), 500)
                  callbacks.fail()
                }
              })
              wagonsRow.appendChild(btn)
            })
            body.appendChild(wagonsRow)
            OE.speak(opts.voice || 'Antar muatan ke gerbong sesuai')
          },
          teardown() {}
        },
      }
    }

    OE.register('station_cargo_sort_color', makeCargoSortObstacle({
      title: '🚉 Sortir muatan — warna!',
      subtitle: 'Antar muatan ke gerbong warna yang sama.',
      voice: 'Antar muatan ke gerbong warna sama',
      cargoes: [
        { icon:'🔴', wagon:'🟥', label:'Merah' },
        { icon:'🟢', wagon:'🟩', label:'Hijau' },
        { icon:'🔵', wagon:'🟦', label:'Biru' },
      ],
    }))

    OE.register('station_cargo_sort_shape', makeCargoSortObstacle({
      title: '🚉 Sortir muatan — bentuk!',
      subtitle: 'Antar muatan ke gerbong bentuk yang sama.',
      voice: 'Antar muatan ke gerbong bentuk sama',
      cargoes: [
        { icon:'▲', wagon:'▽', label:'Segitiga' },
        { icon:'⬤', wagon:'◯', label:'Lingkaran' },
        { icon:'■', wagon:'▢', label:'Persegi' },
      ],
    }))

    OE.register('station_cargo_sort_object_category', makeCargoSortObstacle({
      title: '🚉 Sortir muatan — kategori!',
      subtitle: 'Antar muatan ke gerbong kategori yang sama.',
      voice: 'Antar muatan ke kategori yang sama',
      cargoes: [
        { icon:'🍎', wagon:'🥗', label:'Makanan' },
        { icon:'🧸', wagon:'🎮', label:'Mainan' },
        { icon:'📫', wagon:'📦', label:'Surat' },
      ],
    }))

    OE.register('station_cargo_sort_destination', makeCargoSortObstacle({
      title: '🚉 Sortir muatan — tujuan!',
      subtitle: 'Antar muatan ke gerbong stasiun tujuan.',
      voice: 'Antar muatan ke stasiun tujuan',
      cargoes: [
        { icon:'📦🅰️', wagon:'🅰️', label:'Stasiun A' },
        { icon:'📦🅱️', wagon:'🅱️', label:'Stasiun B' },
        { icon:'📦🆎', wagon:'🆎', label:'Stasiun AB' },
      ],
    }))

    // Passenger pickup — tap 3 passengers in any order
    OE.register('station_passenger_pickup_3', {
      type: 'tap_count',
      difficulty: 1,
      ageRange: '4-7',
      allowedLocations: ['*'],
      allowedJourneyPhases: ['arrival'],
      requiredAction: 'tap_count',
      softFail: true,
      maxRetry: 3,
      reward: { coins: 6, badgeProgress: 1, sound: 'success_chime' },
      visual: { cameraZoom: true, successSparkle: true },
      accessibility: { voicePrompt: true, largeTouchTarget: true, reducedMotion: true },
      title: '🚉 Jemput penumpang!',
      hints: [
        'Tap setiap penumpang untuk masuk kereta! 💡',
        'Tap lagi! 1 lagi! ✨',
        'Tap! 👇',
      ],

      interaction: {
        setup(ctx, callbacks) {
          const body = ctx.body
          if (!body) return

          ctx._timers = []
          const reduced = (OE.reducedMotion ? OE.reducedMotion() : false)

          const title = document.createElement('div')
          title.className = 'obstacle-engine-title'
          title.textContent = '🚉 Jemput 3 penumpang!'
          body.appendChild(title)

          const sub = document.createElement('div')
          sub.className = 'obstacle-engine-subtitle'
          sub.textContent = 'Tap setiap orang untuk masuk kereta.'
          body.appendChild(sub)

          // v54.87: cinematic platform scene — train door on left + platform + passenger sprites on right
          const sceneRow = document.createElement('div')
          sceneRow.className = 'obstacle-engine-row'
          const scene = document.createElement('div')
          scene.style.cssText = 'position:relative;width:min(86vw,460px);height:96px;background:linear-gradient(180deg,#fef3c7 0%,#fed7aa 60%,#a16207 100%);border-radius:14px;border:3px solid #92400e;overflow:hidden;box-shadow:inset 0 -8px 12px rgba(0,0,0,0.18);'

          // Rail + sleepers
          const rail = document.createElement('div')
          rail.style.cssText = 'position:absolute;bottom:18px;left:0;right:0;height:6px;background:linear-gradient(180deg,#475569 0%,#1e293b 100%);'
          scene.appendChild(rail)
          for (let i = 0; i < 8; i++) {
            const s = document.createElement('div')
            s.style.cssText = `position:absolute;bottom:8px;left:${i*58+10}px;width:34px;height:10px;background:#7c2d12;border-radius:2px;`
            scene.appendChild(s)
          }

          // Train (left edge) — visible door
          const train = document.createElement('div')
          train.style.cssText = 'position:absolute;bottom:24px;left:6px;font-size:46px;line-height:1;z-index:2;'
          train.textContent = '🚂'
          scene.appendChild(train)
          // Open door (dark slot) suggesting passenger entrance
          const door = document.createElement('div')
          door.style.cssText = 'position:absolute;bottom:30px;left:46px;width:14px;height:24px;background:linear-gradient(180deg,#1e293b 0%,#0f172a 100%);border:1.5px solid #b45309;border-radius:3px;box-shadow:inset 0 0 6px rgba(0,0,0,0.6);z-index:2;'
          scene.appendChild(door)

          // Station platform (right side) — yellow rectangle
          const platform = document.createElement('div')
          platform.style.cssText = 'position:absolute;bottom:18px;right:0;width:200px;height:34px;background:linear-gradient(180deg,#fde047 0%,#facc15 70%,#a16207 100%);border-top:3px solid #ca8a04;border-left:3px solid #ca8a04;border-radius:8px 0 0 0;box-shadow:inset 0 2px 4px rgba(255,255,255,0.4);'
          scene.appendChild(platform)

          // Passenger sprites on platform — 3 of them
          const PEOPLE = ['🧑', '👨', '👩', '🧒', '👶']
          const shown = PEOPLE.slice(0, 3 + Math.floor(Math.random() * 2)) // 3 or 4
          const sceneSprites = []
          shown.forEach((p, i) => {
            const sp = document.createElement('div')
            const startX = 300 + i * 42 // platform-side x (will translate left)
            sp.style.cssText = `position:absolute;bottom:46px;font-size:28px;line-height:1;left:${startX}px;transition:transform 1.0s cubic-bezier(0.4,0,0.4,1),opacity 0.4s;z-index:3;`
            sp.textContent = p
            scene.appendChild(sp)
            sceneSprites.push(sp)
          })

          sceneRow.appendChild(scene)
          body.appendChild(sceneRow)

          const row = document.createElement('div')
          row.className = 'obstacle-engine-row'

          let picked = 0
          shown.forEach((p, i) => {
            const btn = document.createElement('button')
            btn.className = 'obstacle-engine-shape-btn'
            btn.style.fontSize = '52px'
            btn.style.minWidth = '90px'
            btn.style.minHeight = '90px'
            btn.textContent = p
            btn.addEventListener('click', () => {
              if (btn.disabled) return
              btn.classList.add('correct')
              btn.disabled = true
              btn.style.opacity = '0.5'
              btn.textContent = '✅'
              OE.spawnSparkles(btn, 4)
              // Walk this passenger sprite into train door (slide left then fade)
              const sprite = sceneSprites[i]
              if (sprite) {
                const startLeft = parseFloat(sprite.style.left) || 0
                // Distance from current pos to door (~x=46)
                const dist = -(startLeft - 46)
                sprite.style.transform = `translateX(${dist}px)`
                ctx._timers.push(setTimeout(() => {
                  sprite.style.opacity = '0'
                }, reduced ? 80 : 850))
              }
              picked++
              if (picked >= 3) {
                ctx._timers.push(setTimeout(() => callbacks.success(), reduced ? 350 : 1100))
              }
            })
            row.appendChild(btn)
          })
          body.appendChild(row)
          OE.speak('Tap penumpang')
        },
        teardown(ctx) {
          if (ctx && ctx._timers) {
            ctx._timers.forEach(t => clearTimeout(t))
            ctx._timers = null
          }
        }
      },
    })

    // Ticket color match — drag color-coded ticket to matching passenger
    OE.register('station_ticket_color_match', makeCargoSortObstacle({
      title: '🎫 Cocokkan tiket warna!',
      subtitle: 'Antar tiket ke penumpang dengan warna sama.',
      voice: 'Antar tiket sesuai warna',
      cargoes: [
        { icon:'🎫🔴', wagon:'🧑‍🦱🔴', label:'Merah' },
        { icon:'🎫🟢', wagon:'🧑‍🦱🟢', label:'Hijau' },
        { icon:'🎫🔵', wagon:'🧑‍🦱🔵', label:'Biru' },
      ],
    }))

    // Lost suitcase — find labeled suitcase among 4
    OE.register('station_lost_suitcase', {
      type: 'find_match',
      difficulty: 2,
      ageRange: '5-7',
      allowedLocations: ['*'],
      allowedJourneyPhases: ['arrival', 'approaching_station'],
      requiredAction: 'tap_choice',
      softFail: true,
      maxRetry: 3,
      reward: { coins: 7, badgeProgress: 1, sound: 'success_chime' },
      visual: { cameraZoom: true, highlightSlot: true, successSparkle: true },
      accessibility: { voicePrompt: true, largeTouchTarget: true, reducedMotion: true },
      title: '🧳 Koper hilang!',
      hints: [
        'Coba yang lain! 💡',
        'Lihat label/warna koper! ✨',
        'Yang ini! 👇',
      ],

      interaction: {
        setup(ctx, callbacks) {
          const body = ctx.body
          if (!body) return

          const title = document.createElement('div')
          title.className = 'obstacle-engine-title'
          title.textContent = '🧳 Bantu cari koper!'
          body.appendChild(title)

          const sub = document.createElement('div')
          sub.className = 'obstacle-engine-subtitle'
          sub.textContent = 'Cari koper dengan tanda yang sama.'
          body.appendChild(sub)

          // Reference suitcase (the one to find)
          const SHAPES = ['⭐', '❤️', '🌙', '⚡']
          const targetShape = SHAPES[Math.floor(Math.random() * SHAPES.length)]

          const refRow = document.createElement('div')
          refRow.className = 'obstacle-engine-row'
          const ref = document.createElement('div')
          ref.style.cssText = 'font-size:50px;padding:8px 14px;background:rgba(255,255,255,0.6);border-radius:14px;'
          ref.textContent = '🧳' + targetShape
          refRow.appendChild(ref)
          body.appendChild(refRow)

          const choicesRow = document.createElement('div')
          choicesRow.className = 'obstacle-engine-row'
          const shuffled = SHAPES.slice().sort(() => Math.random() - 0.5)
          shuffled.forEach(s => {
            const btn = document.createElement('button')
            btn.className = 'obstacle-engine-shape-btn'
            btn.style.minWidth = '100px'
            btn.style.minHeight = '100px'
            btn.textContent = '🧳' + s
            btn.addEventListener('click', () => {
              if (s === targetShape) {
                btn.classList.add('correct')
                OE.spawnSparkles(btn, 6)
                Array.from(choicesRow.querySelectorAll('button')).forEach(b => { b.disabled = true })
                setTimeout(() => callbacks.success(), 700)
              } else {
                btn.classList.add('wrong')
                setTimeout(() => btn.classList.remove('wrong'), 500)
                callbacks.fail()
              }
            })
            choicesRow.appendChild(btn)
          })
          body.appendChild(choicesRow)
          OE.speak('Cari koper yang sama')
        },
        teardown() {}
      },
    })

    // Clean leaves — tap each leaf to sweep
    OE.register('station_clean_leaves_track', {
      type: 'tap_clear',
      difficulty: 1,
      ageRange: '4-7',
      allowedLocations: ['*'],
      allowedJourneyPhases: ['arrival'],
      requiredAction: 'tap_count',
      softFail: true,
      maxRetry: 3,
      reward: { coins: 5, badgeProgress: 1, sound: 'success_chime' },
      visual: { cameraZoom: true, successSparkle: true },
      accessibility: { voicePrompt: true, largeTouchTarget: true, reducedMotion: true },
      title: '🍂 Bersihkan daun!',
      hints: [
        'Tap daun untuk membersihkan! 💡',
        'Tap setiap daun! ✨',
        'Tap! 👇',
      ],

      interaction: {
        setup(ctx, callbacks) {
          const body = ctx.body
          if (!body) return

          const title = document.createElement('div')
          title.className = 'obstacle-engine-title'
          title.textContent = '🍂 Bersihkan daun dari rel!'
          body.appendChild(title)

          const sub = document.createElement('div')
          sub.className = 'obstacle-engine-subtitle'
          sub.textContent = 'Tap setiap daun untuk menyapu.'
          body.appendChild(sub)

          const row = document.createElement('div')
          row.className = 'obstacle-engine-row'
          const N = 5
          let cleared = 0
          for (let i = 0; i < N; i++) {
            const btn = document.createElement('button')
            btn.className = 'obstacle-engine-shape-btn'
            btn.style.fontSize = '40px'
            btn.style.minWidth = '74px'
            btn.style.minHeight = '74px'
            btn.textContent = '🍂'
            btn.addEventListener('click', () => {
              btn.classList.add('correct')
              btn.style.opacity = '0.3'
              btn.textContent = '✨'
              btn.disabled = true
              cleared++
              if (cleared >= N) {
                OE.spawnSparkles(row, 8)
                setTimeout(() => callbacks.success(), 600)
              }
            })
            row.appendChild(btn)
          }
          body.appendChild(row)
          OE.speak('Tap setiap daun')
        },
        teardown() {}
      },
    })

    // Signal lamp fix at station — timing tap (variant of signal_repair)
    OE.register('station_signal_lamp_fix', {
      type: 'timing_tap',
      difficulty: 2,
      ageRange: '5-7',
      allowedLocations: ['*'],
      allowedJourneyPhases: ['arrival'],
      requiredAction: 'tap_timing',
      softFail: true,
      maxRetry: 3,
      reward: { coins: 6, badgeProgress: 1, sound: 'success_chime' },
      visual: { cameraZoom: true, successSparkle: true },
      accessibility: { voicePrompt: true, largeTouchTarget: true, reducedMotion: true },
      title: '🚉 Perbaiki sinyal stasiun!',
      hints: [
        'Tap saat lampu hijau menyala! 💡',
        'Tunggu hijau, lalu tap! ✨',
        'Sekarang! 👇',
      ],

      interaction: {
        setup(ctx, callbacks) {
          const body = ctx.body
          if (!body) return

          const title = document.createElement('div')
          title.className = 'obstacle-engine-title'
          title.textContent = '🚉 Perbaiki lampu sinyal stasiun!'
          body.appendChild(title)

          const sub = document.createElement('div')
          sub.className = 'obstacle-engine-subtitle'
          sub.textContent = 'Tap tombol saat lampu menyala HIJAU.'
          body.appendChild(sub)

          const lampRow = document.createElement('div')
          lampRow.className = 'obstacle-engine-row'
          const lamp = document.createElement('div')
          lamp.style.cssText = 'width:96px;height:96px;border-radius:50%;background:#555;border:5px solid #333;display:inline-flex;align-items:center;justify-content:center;font-size:48px;transition:background 0.2s, box-shadow 0.2s;'
          lampRow.appendChild(lamp)
          body.appendChild(lampRow)

          const btnRow = document.createElement('div')
          btnRow.className = 'obstacle-engine-row'
          const tapBtn = document.createElement('button')
          tapBtn.className = 'obstacle-engine-shape-btn'
          tapBtn.style.minWidth = '160px'
          tapBtn.style.fontSize = '22px'
          tapBtn.textContent = '✨ Perbaiki!'
          btnRow.appendChild(tapBtn)
          body.appendChild(btnRow)

          // 3 phases: red 700, yellow 500, green 900 — only green is correct
          let phase = 0 // 0=red, 1=yellow, 2=green
          let interval = setInterval(() => {
            phase = (phase + 1) % 3
            if (phase === 0) { lamp.style.background='#dc2626'; lamp.style.boxShadow='0 0 20px rgba(220,38,38,0.7)'; lamp.textContent='🔴' }
            else if (phase === 1) { lamp.style.background='#facc15'; lamp.style.boxShadow='0 0 22px rgba(250,204,21,0.7)'; lamp.textContent='🟡' }
            else { lamp.style.background='#22c55e'; lamp.style.boxShadow='0 0 26px rgba(34,197,94,0.8)'; lamp.textContent='🟢' }
          }, 700)

          tapBtn.addEventListener('click', () => {
            if (phase === 2) {
              clearInterval(interval)
              interval = null
              tapBtn.classList.add('correct')
              tapBtn.disabled = true
              OE.spawnSparkles(lamp, 8)
              setTimeout(() => callbacks.success(), 700)
            } else {
              tapBtn.classList.add('wrong')
              setTimeout(() => tapBtn.classList.remove('wrong'), 500)
              callbacks.fail()
            }
          })

          ctx.__cleanup = () => { if (interval) clearInterval(interval) }
          OE.speak('Tap saat lampu hijau')
        },
        teardown(ctx) { if (ctx && ctx.__cleanup) ctx.__cleanup() }
      },
    })

    // ── Final §29 completeness — muddy track + small crate ─────────────────

    // Muddy track cleaning (spec §29 #19) — tap-clear 5 mud splotches
    OE.register('muddy_track_cleaning', {
      type: 'tap_clear',
      difficulty: 1,
      ageRange: '4-7',
      allowedLocations: ['*'],
      allowedJourneyPhases: ['countryside', 'suburban'],
      requiredAction: 'tap_count',
      softFail: true,
      maxRetry: 3,
      reward: { coins: 5, badgeProgress: 1, sound: 'success_chime' },
      visual: { cameraZoom: true, successSparkle: true },
      accessibility: { voicePrompt: true, largeTouchTarget: true, reducedMotion: true },
      title: '🟫 Rel berlumpur!',
      hints: [
        'Tap lumpur untuk membersihkan! 💡',
        'Tap semua lumpur ya! ✨',
        'Tap! 👇',
      ],

      interaction: {
        setup(ctx, callbacks) {
          const body = ctx.body
          if (!body) return

          const title = document.createElement('div')
          title.className = 'obstacle-engine-title'
          title.textContent = '🟫 Bersihkan lumpur di rel!'
          body.appendChild(title)

          const sub = document.createElement('div')
          sub.className = 'obstacle-engine-subtitle'
          sub.textContent = 'Tap setiap titik lumpur untuk membersihkan.'
          body.appendChild(sub)

          const row = document.createElement('div')
          row.className = 'obstacle-engine-row'
          const N = 5
          let cleared = 0
          for (let i = 0; i < N; i++) {
            const btn = document.createElement('button')
            btn.className = 'obstacle-engine-shape-btn'
            btn.style.fontSize = '40px'
            btn.style.minWidth = '74px'
            btn.style.minHeight = '74px'
            btn.style.background = 'linear-gradient(135deg,#7c2d12,#92400e)'
            btn.style.borderColor = '#451a03'
            btn.style.color = '#fde68a'
            btn.textContent = '🟫'
            btn.addEventListener('click', () => {
              btn.classList.add('correct')
              btn.style.background = 'linear-gradient(135deg,#dcfce7,#a7f3d0)'
              btn.style.opacity = '0.5'
              btn.textContent = '✨'
              btn.disabled = true
              cleared++
              if (cleared >= N) {
                OE.spawnSparkles(row, 8)
                setTimeout(() => callbacks.success(), 600)
              }
            })
            row.appendChild(btn)
          }
          body.appendChild(row)
          OE.speak('Tap setiap lumpur')
        },
        teardown() {}
      },
    })

    // Small crate avoid (spec §29 #1) — lane choice with crate icon
    OE.register('small_crate_avoid', makeLaneChoiceObstacle({
      title: '📦 Krat kayu di rel!',
      subtitle: 'Pilih lane yang kosong untuk kereta lewat.',
      obstacleIcon: '📦',
    }))

    OE.register('windy_bridge_balance', {
      type: 'balance_tap',
      difficulty: 2,
      ageRange: '5-7',
      allowedLocations: ['*'],
      allowedJourneyPhases: ['countryside'],
      requiredAction: 'tap_balance',
      softFail: true,
      maxRetry: 3,
      reward: { coins: 7, badgeProgress: 1, sound: 'success_chime' },
      visual: { cameraZoom: true, highlightSlot: true, successSparkle: true },
      accessibility: { voicePrompt: true, largeTouchTarget: true, reducedMotion: true },
      title: '🌬️ Jembatan berangin!',
      hints: [
        'Tap ⬅️ atau ➡️ untuk seimbang! 💡',
        'Lihat arah kemiringan, tap arah sebaliknya! ✨',
        'Tap! 👇',
      ],

      interaction: {
        setup(ctx, callbacks) {
          const body = ctx.body
          if (!body) return

          const title = document.createElement('div')
          title.className = 'obstacle-engine-title'
          title.textContent = '🌬️ Jembatan berangin!'
          body.appendChild(title)

          const sub = document.createElement('div')
          sub.className = 'obstacle-engine-subtitle'
          sub.textContent = 'Tap arah berlawanan angin agar kereta seimbang.'
          body.appendChild(sub)

          // Balance meter
          const meterWrap = document.createElement('div')
          meterWrap.style.cssText = 'width:80%;height:30px;background:rgba(0,0,0,0.1);border-radius:15px;margin:8px auto;border:3px solid #1565c0;position:relative;overflow:hidden;'
          const center = document.createElement('div')
          center.style.cssText = 'position:absolute;left:50%;top:0;bottom:0;width:2px;background:#16a34a;'
          meterWrap.appendChild(center)
          const ball = document.createElement('div')
          ball.style.cssText = 'position:absolute;top:50%;width:22px;height:22px;border-radius:50%;background:#fb8c00;transform:translate(-50%,-50%);transition:left 0.2s ease-out;left:50%;'
          meterWrap.appendChild(ball)
          body.appendChild(meterWrap)

          // Direction display
          const dirRow = document.createElement('div')
          dirRow.className = 'obstacle-engine-row'
          const arrowDisp = document.createElement('div')
          arrowDisp.style.cssText = 'font-size:50px;line-height:1;padding:0 12px;'
          dirRow.appendChild(arrowDisp)
          body.appendChild(dirRow)

          // Tap buttons
          const btnRow = document.createElement('div')
          btnRow.className = 'obstacle-engine-row'
          const leftBtn = document.createElement('button')
          leftBtn.className = 'obstacle-engine-shape-btn'
          leftBtn.textContent = '⬅️'
          leftBtn.style.minWidth = '120px'
          const rightBtn = document.createElement('button')
          rightBtn.className = 'obstacle-engine-shape-btn'
          rightBtn.textContent = '➡️'
          rightBtn.style.minWidth = '120px'
          btnRow.appendChild(leftBtn)
          btnRow.appendChild(rightBtn)
          body.appendChild(btnRow)

          // Wind sim: drift toward random direction, user counters with taps
          let pos = 50 // 0 = far left, 100 = far right; target = 30-70 (wide tolerance)
          let stable = 0
          const TARGET = 50
          const TOLERANCE = 20 // very wide for kids
          const TICKS_TO_WIN = 12
          let phase = Math.random() < 0.5 ? 1 : -1
          const phaseInterval = setInterval(() => {
            phase = Math.random() < 0.5 ? 1 : -1
            arrowDisp.textContent = phase > 0 ? '💨➡️ angin ke kanan' : '⬅️💨 angin ke kiri'
          }, 1400)
          const drift = setInterval(() => {
            pos += phase * 3
            pos = Math.max(0, Math.min(100, pos))
            ball.style.left = pos + '%'
            if (Math.abs(pos - TARGET) <= TOLERANCE) {
              ball.style.background = '#16a34a'
              stable++
              if (stable >= TICKS_TO_WIN) {
                clearInterval(drift)
                clearInterval(phaseInterval)
                leftBtn.disabled = true; rightBtn.disabled = true
                OE.spawnSparkles(meterWrap, 6)
                setTimeout(() => callbacks.success(), 700)
              }
            } else {
              ball.style.background = '#fb8c00'
              stable = Math.max(0, stable - 1)
            }
          }, 220)

          leftBtn.addEventListener('click', () => { pos = Math.max(0, pos - 12); ball.style.left = pos + '%' })
          rightBtn.addEventListener('click', () => { pos = Math.min(100, pos + 12); ball.style.left = pos + '%' })

          ctx.__cleanup = () => { clearInterval(drift); clearInterval(phaseInterval) }
          OE.speak('Tap arah berlawanan angin')
        },
        teardown(ctx) { if (ctx && ctx.__cleanup) ctx.__cleanup() }
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
