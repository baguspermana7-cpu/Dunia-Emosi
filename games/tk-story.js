/* ============================================================================
 * tk-story.js — window.TKStory. Cinematic story panels (PRD v2 §2 Story intro, §6 motion).
 *
 * TKStory.play(host, panels, { onDone, title, subtitle, sfx, say, listen, easy }) -> { destroy }
 *   say(text)  reads each caption aloud (the app passes TKHub.say, which honours the narration
 *              setting); the speaker button on the bubble replays it. listen = icon HTML for it.
 * Easy to play (owner 2026-09-28, players 5–8, many cannot read yet): tap ANYWHERE on the scene
 * = Lanjut, swipe = next / previous, big caption (>= 20 px), never auto-advances.
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
  var CAMERA_X = 10, CAMERA_Y = 5, LAYER_Y = 0.6, ART_PAD = 2
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
    '.tks-skip{position:absolute;right:calc(74px + env(safe-area-inset-right));top:calc(10px + env(safe-area-inset-top));min-height:44px;padding:0 14px;border-radius:12px;border:2px solid rgba(255,255,255,.4);background:rgba(0,0,0,.35);color:#fff;font:inherit;font-weight:800;cursor:pointer;z-index:5}' +
    '@media (orientation:portrait){.tks-cap{bottom:3%;left:3%;right:3%;max-width:none}}' +
    '@media (prefers-reduced-motion:reduce){.tks *{transition:none!important}}'
  // Lewati sits left of the host's always-visible sound button (#sndfab, 52 px at the top-right corner)
  CSS += '.tks-logo{position:absolute;left:12px;top:calc(8px + env(safe-area-inset-top));width:clamp(120px,17vw,230px);z-index:4;filter:drop-shadow(0 6px 8px rgba(0,0,0,.45))}' +
    '.tks-plate{background:linear-gradient(#f6e3bb,#e2c690);border:0;border-radius:6px;padding:8px 34px 10px;clip-path:polygon(3% 0,97% 4%,100% 50%,97% 96%,3% 100%,0 50%)}' +
    '.tks-plate small{font-size:clamp(12px,1.6vw,16px);font-weight:800}.tks-plate b{font-size:clamp(20px,3.4vw,40px)}.tks-plate i{display:block;font-style:normal;font-size:clamp(12px,1.5vw,16px);opacity:.85}' +
    '.tks-cap{border-radius:18px;padding:16px 20px 14px;box-shadow:0 10px 26px rgba(0,0,0,.4)}.tks-cap i{top:-16px;left:16px;padding:3px 14px;font-size:15px;background:#1F63D6}' +
    '.tks-bar{flex-direction:column;align-items:stretch;gap:8px;background:linear-gradient(rgba(8,12,36,0),rgba(8,12,36,.92) 30%)}' +
    '.tks-strip{min-width:0}.tks-thumbs{display:flex;gap:10px;overflow-x:auto;padding:4px 2px 2px}' +
    '.tks-t{flex:1 0 190px;height:112px;border-radius:14px;overflow:hidden;border:2px solid rgba(255,255,255,.35);background:#10183a}' +
    '.tks-t .tks-tbg{position:absolute;inset:0;background-size:cover!important;background-position:center!important;opacity:.9}' +
    '.tks-t img{position:absolute;left:50%;top:6%;height:62%;transform:translateX(-50%);filter:drop-shadow(0 4px 4px rgba(0,0,0,.4))}' +
    '.tks-tc{position:absolute;left:0;right:0;bottom:0;display:flex;gap:8px;align-items:center;padding:6px 8px;background:linear-gradient(transparent,rgba(8,12,36,.92) 30%);font-size:12.5px;font-weight:800;line-height:1.15;text-align:left}' +
    '.tks-tc b{position:static;flex:none;width:28px;height:28px;font-size:14px;background:#0b1030;border:2px solid #fff}' +
    '.tks-t.on{border-color:#5fd0ff;box-shadow:0 0 0 3px rgba(95,208,255,.45),0 0 18px rgba(95,208,255,.6)}' +
    '.tks-nav{display:flex;align-items:center;gap:12px}.tks-nav .tks-dots{display:flex;flex:1;justify-content:center;align-items:center;gap:0}' +
    '.tks-dots i{position:relative;width:10px;height:10px;margin:0 12px;border:2px solid #fff;background:transparent}.tks-dots i+i::before{content:"";position:absolute;right:100%;top:50%;width:24px;height:2px;background:rgba(255,255,255,.5)}' +
    '.tks-dots i.on{background:#5fd0ff;border-color:#5fd0ff;transform:scale(1.35)}' +
    '.tks-btn{display:inline-flex;align-items:center;gap:10px}.tks-back{background:rgba(8,12,36,.7)}' +
    '.tks-arr{width:16px;height:16px;border-top:4px solid currentColor;border-right:4px solid currentColor;transform:rotate(45deg);border-radius:2px}.tks-arr.l{transform:rotate(-135deg)}' +
    '@media (orientation:portrait){.tks-dots i{margin:0 5px}.tks-dots i+i::before{width:10px}.tks-btn{padding:0 14px;font-size:17px}.tks-back:not([style*=visible]){display:none}.tks-t{flex:0 0 72%;height:120px}.tks-thumbs{scroll-snap-type:x mandatory}.tks-t{scroll-snap-align:center}.tks-logo{width:118px}.tks-plate{top:calc(104px + env(safe-area-inset-top));max-width:86%}}'
  CSS += '.tks-cap{font-size:clamp(20px,2.7vw,25px);line-height:1.35;padding-right:70px;min-height:74px}' +
    '.tks-say{position:absolute;right:8px;top:50%;margin-top:-26px;width:52px;height:52px;border-radius:50%;border:3px solid #fff;background:linear-gradient(#5AA2FF,#1F63D6);box-shadow:0 3px 0 #103A88,0 6px 12px rgba(0,0,0,.3);display:grid;place-items:center;cursor:pointer;padding:0;transition:transform .12s ' + EO + '}' +
    '.tks-say:active{transform:scale(.92)}.tks-say img{width:32px;height:32px;object-fit:contain;pointer-events:none}' +
    '.tks-say.on{animation:tks-talk .9s ease-in-out infinite}@keyframes tks-talk{50%{box-shadow:0 3px 0 #103A88,0 0 0 8px rgba(95,208,255,.35)}}' +
    '.tks-stage{cursor:pointer}' +
    '.tks-next{position:relative;overflow:hidden;isolation:isolate;min-width:150px;justify-content:center;font-size:20px}' +
    '.tks-next::after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(105deg,transparent 30%,rgba(255,255,255,.6) 48%,transparent 66%);transform:translateX(-130%);animation:tks-shine 3.4s ' + EO + ' infinite 1.2s}' +
    '@keyframes tks-shine{0%,60%{transform:translateX(-130%)}100%{transform:translateX(130%)}}' +
    '@media (orientation:portrait){.tks-cap{padding-right:68px}.tks-next{min-width:140px;font-size:19px}}' +
    '@media (orientation:landscape) and (max-height:520px){.tks-strip{display:none}.tks-logo{width:104px}.tks-plate{padding:4px 30px 6px}.tks-plate b{font-size:clamp(18px,5.4vh,28px)}.tks-cap{left:auto;right:3%;max-width:min(62%,560px);font-size:20px;padding:12px 66px 10px 16px;min-height:0}.tks-bar{padding-top:6px}}' +
    '@media (prefers-reduced-motion:reduce){.tks-next::after,.tks-say.on{animation:none}}' +
    '.rm .tks-next::after,.rm .tks-say.on{animation:none}' +
    // tablet type floor (qa-tk-ui-audit): thumbnail captions >= 14 px when the short side is >= 600 px
    '@media (min-width:600px) and (min-height:600px){.tks-t:only-child{flex:0 0 300px}.tks-tc{font-size:14px;line-height:1.12}.tks-t{height:120px}.tks-plate small,.tks-plate i{font-size:14px}}'
  function injectCss () { if (document.getElementById('tks-css')) return; var s = document.createElement('style'); s.id = 'tks-css'; s.textContent = CSS; document.head.appendChild(s) }

  function play (host, panels, opts) {
    opts = opts || {}; injectCss()
    var Art = W.TKArt, i = 0, raf = 0, dead = false, t0 = performance.now(), layers = []
    host.innerHTML = '<div class="tks"><div class="tks-stage"><div class="tks-bg"></div><div class="tks-ls"></div>' +
      (opts.logo ? '<img class="tks-logo" src="' + opts.logo + '" alt="">' : '') +
      (opts.title ? '<div class="tks-plate">' + (opts.chapter ? '<small>' + esc(opts.chapter) + '</small>' : '') + '<b>' + esc(opts.title) + '</b>' +
        (opts.subtitle ? '<i>' + esc(opts.subtitle) + '</i>' : '') + '</div>' : '') +
      '<div class="tks-cap"></div><button class="tks-skip" type="button">Lewati</button></div>' +
      '<div class="tks-bar"><div class="tks-strip"><div class="tks-thumbs"></div></div>' +
      '<div class="tks-nav"><button class="tks-btn tks-back" type="button"><span class="tks-arr l"></span>Kembali</button><div class="tks-dots"></div>' +
      '<button class="tks-btn tks-next" type="button"><span class="tks-nt">Lanjut</span><span class="tks-arr"></span></button></div></div></div>'
    var root = host.firstChild, bg = root.querySelector('.tks-bg'), ls = root.querySelector('.tks-ls'), cap = root.querySelector('.tks-cap')
    root.querySelector('.tks-thumbs').innerHTML = panels.map(function (p, k) {
      var main = (p.layers || []).slice().sort(function (a, b) { return (b.s || 0) - (a.s || 0) })[0]
      var txt = String(p.caption || ''); if (txt.length > 58) txt = txt.slice(0, 55).replace(/\s+\S*$/, '') + '…'
      return '<div class="tks-t" data-i="' + k + '"><span class="tks-tbg" style="background:' + Art.scene(p.scene) + '"></span>' +
        (main ? '<img src="' + Art.src(main.k) + '" alt="">' : '') + '<span class="tks-tc"><b>' + (k + 1) + '</b>' + esc(txt) + '</span></div>'
    }).join('')
    root.querySelector('.tks-dots').innerHTML = panels.map(function () { return '<i></i>' }).join('')
    function sfx (k) { try { if (opts.sfx && opts.sfx[k]) opts.sfx[k]() } catch (e) {} }
    function listenIco () { try { return opts.listen || (W.TKIcon ? W.TKIcon('listen') : '') } catch (e) { return '' } }
    // read the caption aloud; the speaker button glows while the voice is (probably) talking
    var talkT = 0
    function speak () {
      if (!opts.say) return
      var ok = false; try { ok = opts.say(String(panels[i].caption || '')) } catch (e) {}
      var b = cap.querySelector('.tks-say'); clearTimeout(talkT)
      if (b && ok !== false) { b.classList.add('on'); talkT = setTimeout(function () { b.classList.remove('on') }, Math.min(9000, 900 + String(panels[i].caption || '').length * 70)) }
    }
    function show (n, dir) {
      i = Math.max(0, Math.min(panels.length - 1, n))
      var p = panels[i], rm = reduced()
      bg.style.background = Art.scene(p.scene); if (W.TKSkel) try { W.TKSkel(bg) } catch (e) {}
      ls.innerHTML = (p.layers || []).map(function (L) {
        return '<div class="tks-l" data-d="' + (L.d || 1) + '" data-x="' + L.x + '" data-y="' + L.y + '" data-s="' + L.s + '" style="left:' + L.x + '%;top:' + L.y + '%;height:' + L.s + '%;transform:translate(-50%,-100%)"><img src="' + Art.src(L.k) + '" alt="" draggable="false"></div>'
      }).join('')
      layers = [].slice.call(ls.children)
      layers.forEach(function (el) { var im = el.firstChild; if (im && !im.complete) im.addEventListener('load', fitLayers) })
      cap.innerHTML = (p.speaker ? '<i>' + esc(p.speaker) + '</i>' : '') + esc(p.caption) +
        (opts.say ? '<button class="tks-say" type="button" aria-label="Dengar lagi">' + listenIco() + '</button>' : '')
      fitLayers()
      speak()
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
      root.querySelector('.tks-back').style.visibility = i ? 'visible' : 'hidden'; root.querySelector('.tks-back').style.display = i ? '' : (innerHeight > innerWidth ? 'none' : '')
      root.querySelector('.tks-next').textContent = i === panels.length - 1 ? 'Mulai!' : 'Lanjut'
    }
    // Keep whole foreground sprites between the title and caption, including their camera drift.
    // Background scenery remains full-bleed; a shared scale preserves the panel's relative sprite sizes.
    function fitLayers () {
      var st = root.querySelector('.tks-stage'), SW = st.clientWidth, SH = st.clientHeight
      if (!SW || !SH) return
      // one scale for the whole panel keeps the composition (Timmy stays the right size for his bed)
      var k = 1, stageTop = st.getBoundingClientRect().top
      var capTop = cap.getBoundingClientRect().top - stageTop
      var plate = root.querySelector('.tks-plate'), top = plate ? plate.getBoundingClientRect().bottom - stageTop + ART_PAD : 0
      var bottom = Math.max(top + 1, Math.min(SH, capTop - (cap.querySelector('i') ? 18 : ART_PAD)))
      var artHeight = Math.max(1, bottom - top)
      layers.forEach(function (el) {
        var im = el.firstChild, s = +el.getAttribute('data-s') || 0, x = +el.getAttribute('data-x') || 50
        if (!im || !im.naturalWidth || !im.naturalHeight || !s) return
        var d = Math.abs(+el.getAttribute('data-d') || 1), padX = CAMERA_X * d + ART_PAD, padY = CAMERA_Y * LAYER_Y * d + ART_PAD
        var y = Math.min(bottom - padY, top + (+el.getAttribute('data-y') || 50) * artHeight / 100)
        var h = artHeight * s / 100, w = h * im.naturalWidth / im.naturalHeight
        var room = Math.max(1, 2 * (Math.min(x, 100 - x) / 100 * SW - padX))
        el.style.top = (y / SH * 100).toFixed(2) + '%'
        k = Math.min(k, room / w, Math.max(1, y - top - padY) / h)
      })
      layers.forEach(function (el) { el.style.height = ((+el.getAttribute('data-s') || 0) * k * artHeight / SH).toFixed(2) + '%' })
    }
    function onResize () { if (!dead) fitLayers() }
    W.addEventListener('resize', onResize)
    var sro = null; try { if (W.ResizeObserver) { sro = new W.ResizeObserver(onResize); sro.observe(root.querySelector('.tks-stage')); sro.observe(cap); var plate = root.querySelector('.tks-plate'); if (plate) sro.observe(plate) } } catch (e) { sro = null }
    // camera breathing: each layer drifts by its depth (translate property, so it composes with the
    // positioning transform)
    function loop (now) {
      if (dead) return
      if (!document.hidden && !reduced()) {
        var t = (now - t0) / 1000, cx = Math.sin(t * 0.25) * CAMERA_X, cy = Math.cos(t * 0.2) * CAMERA_Y
        bg.style.transform = 'translate(' + (cx * 0.2).toFixed(2) + 'px,' + (cy * 0.2).toFixed(2) + 'px) scale(1.05)'
        for (var k = 0; k < layers.length; k++) { var d = +layers[k].getAttribute('data-d'); layers[k].style.translate = (cx * d).toFixed(2) + 'px ' + (cy * d * LAYER_Y).toFixed(2) + 'px' }
      }
      raf = requestAnimationFrame(loop)
    }
    function finish () { if (dead) return; dead = true; W.removeEventListener('resize', onResize); try { if (sro) sro.disconnect() } catch (e) {} cancelAnimationFrame(raf); clearTimeout(talkT); try { opts.say && opts.say('') } catch (e) {} sfx('go'); if (opts.onDone) opts.onDone() }
    function advance () { sfx('page'); if (i >= panels.length - 1) finish(); else show(i + 1, 1) }
    root.querySelector('.tks-next').addEventListener('click', advance)
    cap.addEventListener('click', function (e) { if (e.target.closest('.tks-say')) { e.stopPropagation(); speak() } })
    root.querySelector('.tks-back').addEventListener('click', function () { sfx('page'); show(i - 1, -1) })
    root.querySelector('.tks-skip').addEventListener('click', finish)
    root.querySelector('.tks-thumbs').addEventListener('click', function (e) { var t = e.target.closest('.tks-t'); if (t) { sfx('page'); show(+t.getAttribute('data-i'), 1) } })
    var sx = null
    root.querySelector('.tks-stage').addEventListener('pointerdown', function (e) { sx = e.clientX })
    // swipe = next / previous; a plain tap anywhere on the scene (not on a button) = Lanjut
    root.querySelector('.tks-stage').addEventListener('pointerup', function (e) {
      if (sx == null) return; var dx = e.clientX - sx; sx = null
      if (Math.abs(dx) > 50) { sfx('page'); show(i + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); return }
      if (Math.abs(dx) < 12 && !(e.target.closest && e.target.closest('button'))) advance()
    })
    root.querySelector('.tks-stage').addEventListener('pointercancel', function () { sx = null })
    show(0, 1)
    raf = requestAnimationFrame(loop)
    return { destroy: function () { dead = true; W.removeEventListener('resize', onResize); try { if (sro) sro.disconnect() } catch (e) {} cancelAnimationFrame(raf); clearTimeout(talkT); host.innerHTML = '' }, index: function () { return i }, next: function () { root.querySelector('.tks-next').click() } }
  }
  W.TKStory = { play: play }
})()
