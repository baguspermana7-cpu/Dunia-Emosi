/* ============================================================================
 * tk-story.js — window.TKStory. Cinematic story panels (PRD v2 §2 Story intro, §6 motion).
 *
 * TKStory.play(host, panels, { onDone, title, subtitle, sfx }) -> { destroy }
 * A panel = { scene, caption, speaker, layers:[{k, x, y, s, d}] } (see tk-worlds.js).
 * Layout follows mockup "STORY INTRO": big scene, speaker bubble, chapter plate, thumbnails
 * strip (landscape) / single card + arrows (portrait), progress dots, Kembali / Lanjut, Lewati.
 * Motion: every layer drifts slowly by its depth (camera breathing); on Lanjut the layers slide
 * in by depth (far = slow, near = fast) — transforms/opacity only, one rAF loop, stopped when the
 * panel is gone or the tab is hidden. Reduced motion: cross-fades only.
 * ==========================================================================*/
(function () {
  'use strict'
  var W = window
  var EO = 'cubic-bezier(.23,1,.32,1)'
  function esc (t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;') }
  function reduced () { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('rm') } catch (e) { return false } }
  function A (el, f, o) { if (!el || !el.animate) return; try { el.animate(f, o) } catch (e) {} }

  var CSS = '.tks{position:absolute;inset:0;display:flex;flex-direction:column;overflow:hidden;background:#0b1030;color:#fff;font-family:inherit}' +
    '.tks-stage{position:relative;flex:1;min-height:0;overflow:hidden}' +
    '.tks-bg{position:absolute;inset:-4%;background-size:cover;will-change:transform}' +
    '.tks-l{position:absolute;transform-origin:50% 100%;will-change:transform;pointer-events:none}' +
    '.tks-l img{display:block;height:100%;width:auto;filter:drop-shadow(0 10px 10px rgba(0,0,0,.4))}' +
    '.tks-plate{position:absolute;left:50%;top:calc(10px + env(safe-area-inset-top));transform:translateX(-50%);max-width:min(92%,520px);text-align:center;padding:8px 22px 10px;border-radius:10px;' +
      'background:linear-gradient(#f7e7c4,#e6cf9e);color:#3a2a14;box-shadow:0 6px 16px rgba(0,0,0,.35);border:2px solid #b8955a}' +
    '.tks-plate small{display:block;font-size:13px;opacity:.8}.tks-plate b{display:block;font-size:clamp(18px,4.6vw,28px);line-height:1.1}' +
    '.tks-cap{position:absolute;left:4%;bottom:4%;max-width:min(88%,560px);background:#fff;color:#1b2340;border-radius:16px;padding:12px 16px;font-size:clamp(16px,2.4vw,20px);line-height:1.35;box-shadow:0 8px 22px rgba(0,0,0,.35)}' +
    '.tks-cap i{position:absolute;top:-14px;left:14px;font-style:normal;background:#2E7DE0;color:#fff;border-radius:10px;padding:2px 12px;font-size:14px;font-weight:800}' +
    '.tks-bar{display:flex;align-items:center;gap:10px;padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:linear-gradient(rgba(11,16,48,.6),#0b1030)}' +
    '.tks-thumbs{flex:1;display:flex;gap:8px;overflow:auto;min-width:0}' +
    '.tks-t{flex:none;width:118px;height:70px;border-radius:10px;border:2px solid rgba(255,255,255,.3);background-size:cover;background-position:center;position:relative;cursor:pointer;transition:transform .15s ' + EO + ',border-color .2s}' +
    '.tks-t b{position:absolute;left:6px;top:6px;width:22px;height:22px;border-radius:50%;background:#0b1030;border:2px solid #fff;display:grid;place-items:center;font-size:12px}' +
    '.tks-t.on{border-color:#5fd0ff;box-shadow:0 0 0 3px rgba(95,208,255,.4)}.tks-t:active{transform:scale(.96)}' +
    '.tks-dots{display:none;flex:1;justify-content:center;gap:6px}.tks-dots i{width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,.3)}.tks-dots i.on{background:#5fd0ff;transform:scale(1.25)}' +
    '.tks-btn{min-height:56px;padding:0 22px;border-radius:16px;border:0;font:inherit;font-weight:900;font-size:19px;cursor:pointer;transition:transform .12s ' + EO + '}' +
    '.tks-btn:active{transform:scale(.96)}.tks-next{background:linear-gradient(#FFE15A,#F2B01E);color:#3a2600;box-shadow:0 4px 0 #a86f0a}.tks-back{background:rgba(255,255,255,.12);color:#fff;border:2px solid rgba(255,255,255,.35)}' +
    '.tks-skip{position:absolute;right:10px;top:calc(10px + env(safe-area-inset-top));min-height:44px;padding:0 14px;border-radius:12px;border:2px solid rgba(255,255,255,.4);background:rgba(0,0,0,.35);color:#fff;font:inherit;font-weight:800;cursor:pointer;z-index:5}' +
    '@media (orientation:portrait){.tks-thumbs{display:none}.tks-dots{display:flex}.tks-cap{bottom:3%;left:3%;right:3%;max-width:none}}' +
    '@media (prefers-reduced-motion:reduce){.tks *{transition:none!important}}'
  function injectCss () { if (document.getElementById('tks-css')) return; var s = document.createElement('style'); s.id = 'tks-css'; s.textContent = CSS; document.head.appendChild(s) }

  function play (host, panels, opts) {
    opts = opts || {}; injectCss()
    var Art = W.TKArt, i = 0, raf = 0, dead = false, t0 = performance.now(), layers = []
    host.innerHTML = '<div class="tks"><div class="tks-stage"><div class="tks-bg"></div><div class="tks-ls"></div>' +
      (opts.title ? '<div class="tks-plate"><small>' + esc(opts.subtitle || '') + '</small><b>' + esc(opts.title) + '</b></div>' : '') +
      '<div class="tks-cap"></div><button class="tks-skip" type="button">Lewati</button></div>' +
      '<div class="tks-bar"><button class="tks-btn tks-back" type="button">Kembali</button><div class="tks-thumbs"></div><div class="tks-dots"></div>' +
      '<button class="tks-btn tks-next" type="button">Lanjut</button></div></div>'
    var root = host.firstChild, bg = root.querySelector('.tks-bg'), ls = root.querySelector('.tks-ls'), cap = root.querySelector('.tks-cap')
    root.querySelector('.tks-thumbs').innerHTML = panels.map(function (p, k) {
      return '<div class="tks-t" data-i="' + k + '" style="background:' + Art.scene(p.scene) + '"><b>' + (k + 1) + '</b></div>'
    }).join('')
    root.querySelector('.tks-dots').innerHTML = panels.map(function () { return '<i></i>' }).join('')
    function sfx (k) { try { if (opts.sfx && opts.sfx[k]) opts.sfx[k]() } catch (e) {} }
    function show (n, dir) {
      i = Math.max(0, Math.min(panels.length - 1, n))
      var p = panels[i], rm = reduced()
      bg.style.background = Art.scene(p.scene)
      ls.innerHTML = (p.layers || []).map(function (L) {
        return '<div class="tks-l" data-d="' + (L.d || 1) + '" style="left:' + L.x + '%;top:' + L.y + '%;height:' + L.s + '%;transform:translate(-50%,-100%)"><img src="' + Art.src(L.k) + '" alt="" draggable="false"></div>'
      }).join('')
      layers = [].slice.call(ls.children)
      cap.innerHTML = (p.speaker ? '<i>' + esc(p.speaker) + '</i>' : '') + esc(p.caption)
      if (!rm) {
        A(bg, [{ opacity: 0.4 }, { opacity: 1 }], { duration: 420, easing: EO })
        layers.forEach(function (el) {
          var d = +el.getAttribute('data-d'), dx = (dir || 1) * 60 * d
          A(el, [{ opacity: 0, translate: dx + 'px 0' }, { opacity: 1, translate: '0 0' }], { duration: 520 + 200 * d, easing: EO })
        })
        A(cap, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: 180, easing: EO, fill: 'backwards' })
      }
      root.querySelectorAll('.tks-t').forEach(function (t, k) { t.classList.toggle('on', k === i) })
      root.querySelectorAll('.tks-dots i').forEach(function (t, k) { t.classList.toggle('on', k === i) })
      var th = root.querySelector('.tks-t.on'); if (th && th.scrollIntoView) try { th.scrollIntoView({ block: 'nearest', inline: 'center' }) } catch (e) {}
      root.querySelector('.tks-back').style.visibility = i ? 'visible' : 'hidden'
      root.querySelector('.tks-next').textContent = i === panels.length - 1 ? 'Mulai!' : 'Lanjut'
    }
    // camera breathing: each layer drifts by its depth (translate property, so it composes with the
    // positioning transform)
    function loop (now) {
      if (dead) return
      if (!document.hidden && !reduced()) {
        var t = (now - t0) / 1000, cx = Math.sin(t * 0.25) * 10, cy = Math.cos(t * 0.2) * 5
        bg.style.transform = 'translate(' + (cx * 0.2).toFixed(2) + 'px,' + (cy * 0.2).toFixed(2) + 'px) scale(1.05)'
        for (var k = 0; k < layers.length; k++) { var d = +layers[k].getAttribute('data-d'); layers[k].style.translate = (cx * d).toFixed(2) + 'px ' + (cy * d * 0.6).toFixed(2) + 'px' }
      }
      raf = requestAnimationFrame(loop)
    }
    function finish () { if (dead) return; dead = true; cancelAnimationFrame(raf); sfx('go'); if (opts.onDone) opts.onDone() }
    root.querySelector('.tks-next').addEventListener('click', function () { sfx('page'); if (i >= panels.length - 1) finish(); else show(i + 1, 1) })
    root.querySelector('.tks-back').addEventListener('click', function () { sfx('page'); show(i - 1, -1) })
    root.querySelector('.tks-skip').addEventListener('click', finish)
    root.querySelector('.tks-thumbs').addEventListener('click', function (e) { var t = e.target.closest('.tks-t'); if (t) { sfx('page'); show(+t.getAttribute('data-i'), 1) } })
    var sx = null
    root.querySelector('.tks-stage').addEventListener('pointerdown', function (e) { sx = e.clientX })
    root.querySelector('.tks-stage').addEventListener('pointerup', function (e) { if (sx == null) return; var dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 50) { sfx('page'); show(i + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1) } })
    show(0, 1)
    raf = requestAnimationFrame(loop)
    return { destroy: function () { dead = true; cancelAnimationFrame(raf); host.innerHTML = '' }, index: function () { return i }, next: function () { root.querySelector('.tks-next').click() } }
  }
  W.TKStory = { play: play }
})()
