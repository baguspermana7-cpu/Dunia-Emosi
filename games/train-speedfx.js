/* games/train-speedfx.js — shared speed-overlay motion FX (v55.77)
 *
 * Owner: "buat effect overlay speed agar terlihat seoalah2 kereta melaju cepat."
 * A reusable, ALWAYS-ON, speed-scaled streak overlay for all three train games
 * (g14's prior effect only showed during boost). Horizontal speed lines rush past;
 * their density, length, velocity and the layer's opacity all rise with the train's
 * speed (subtle at cruise, intense on boost). Zero deps beyond global PIXI v8.
 * dt-clamped + particle-capped for the owner's throttled tablet. Fully guarded.
 *
 * API (window.TrainSpeedFX):
 *   mount(stage, app, opts?) → handle|null
 *     opts.insertIndex (default top)   stage.addChildAt index (front of gameplay)
 *     opts.color       (default 0xffffff)
 *     opts.cap         (default 40)    max live streaks
 *   handle = { container,
 *              tick(speed, dt, {boost, maxSpeed, top, height}),
 *              clear(), destroy() }
 */
(function () {
  'use strict'

  function mount(stage, app, opts) {
    opts = opts || {}
    try {
      if (!window.PIXI || !stage) return null
      const cont = new PIXI.Container(); cont._speedfx = true
      const idx = (typeof opts.insertIndex === 'number') ? opts.insertIndex : stage.children.length
      stage.addChildAt(cont, Math.min(Math.max(0, idx), stage.children.length))
      const streaks = new PIXI.Container(); cont.addChild(streaks)
      const color = (opts.color != null) ? opts.color : 0xffffff
      const cap = opts.cap || 40
      const lines = []
      let acc = 0
      cont.alpha = 0

      return {
        container: cont,
        // speed = current world scroll speed; o.maxSpeed = top speed for normalising.
        // o.top/o.height confine streaks to the play band (default = full screen).
        tick(speed, dt, o) {
          o = o || {}
          const _d = Math.min(dt, 2)
          const W = app.screen.width, H = app.screen.height
          const maxSpeed = o.maxSpeed || 6
          const top = (o.top != null) ? o.top : 0
          const height = (o.height != null) ? o.height : H
          let t = Math.max(0, Math.min(1, speed / maxSpeed))
          if (o.boost) t = Math.min(1, t * 0.6 + 0.7)
          // ease layer opacity toward target (off when nearly stopped)
          const targetA = t < 0.12 ? 0 : (0.12 + 0.6 * t)
          cont.alpha += (targetA - cont.alpha) * Math.min(1, 0.12 * _d)
          // spawn — interval shrinks as speed rises (~4.5 frames slow → ~0.9 fast)
          if (cont.alpha > 0.02) {
            acc += _d
            const interval = 4.5 - 3.6 * t
            while (acc >= interval && lines.length < cap) {
              acc -= interval
              const g = new PIXI.Graphics()
              const len = 50 + Math.random() * 100 + 90 * t
              const th = 1 + Math.random() * 1.4
              g.rect(0, 0, len, th).fill(color)
              g.x = W + 10; g.y = top + Math.random() * height
              g.alpha = 0.30 + Math.random() * 0.45
              g._vx = -(18 + Math.random() * 16 + 34 * t)
              streaks.addChild(g); lines.push(g)
            }
          }
          for (let i = lines.length - 1; i >= 0; i--) {
            const l = lines[i]
            l.x += l._vx * _d
            l.alpha -= 0.035 * _d
            if (l.alpha <= 0 || l.x < -240) { streaks.removeChild(l); lines.splice(i, 1) }
          }
        },
        clear() { for (const l of lines) { try { streaks.removeChild(l) } catch (_) {} } lines.length = 0; cont.alpha = 0; acc = 0 },
        destroy() { try { stage.removeChild(cont); cont.destroy({ children: true }) } catch (_) {} },
      }
    } catch (_) { return null }
  }

  window.TrainSpeedFX = { mount }
})()
