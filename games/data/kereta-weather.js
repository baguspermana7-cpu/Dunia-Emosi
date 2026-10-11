/* =============================================================================
 * kereta-weather.js — sky, weather and ground life for the Lokomotif Pemberani boards (owner 2026-10-11: "awan yang bergerak
 * pelan, pelangi dll — banyak overlay atau effect"). Pure presentation, built per beat from the scene's mood + terrain.
 *   sky      .kw-sky   (behind the board frame, over the backdrop): drifting clouds, a rainbow after wet weather, V-birds crossing
 *   weather  .kw-wx    (over the board, clipped to it): god rays, valley mist, fireflies, falling leaves, snow, a butterfly
 *   ground   fish that jump and lily pads on water cells, a ripple when Linus crosses a bridge, a gust that bends the grass
 *            fringe, a waving flag, a glint on Linus's wheel, a bounce when the run starts
 * Scene rules: no rainbow/sun rays in rain, storm or night; fireflies only at night/dream; snow only on the mountain; leaves only
 * in logging; mist only in gorge/mountain valleys; butterflies only on bright meadows. Everything is CSS (transform / opacity /
 * individual translate-rotate-scale) with fixed particle counts, paused while the tab is hidden and absent under reduced motion.
 * Art from the owner's VFX database (assets/vfx/ow-*.webp via tools/build-vfx-library.py): cloud, rainbow, light rays, flying leaves, leaf swirl,
 * water ripple, splash crown. Fireflies, snow, mist, butterfly and V-birds are CSS (no cleared texture exists for them). See docs/KERETA-VFX-PLAN.md.
 * ==========================================================================*/
(function (W) {
  'use strict'
  var P = W.MojoPack, def = P && P.def
  if (!def || def.id !== 'kereta') return
  var D = W.document
  var RM = false; try { RM = W.matchMedia('(prefers-reduced-motion: reduce)').matches } catch (e) {}
  if (RM) return
  function $ (id) { return D.getElementById(id) }
  function el (tag, cls, html) { var e = D.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e }
  function rnd (a, b) { return a + Math.random() * (b - a) }
  function cell () { return parseFloat(W.getComputedStyle(D.documentElement).getPropertyValue('--cell')) || 64 }

  var CSS = [
    '.kw-sky{position:absolute;left:0;right:0;top:0;height:46%;overflow:hidden;pointer-events:none;z-index:0}',
    '.kw-cloud{position:absolute;left:0;width:var(--w,160px);height:auto;translate:-50vw 0;animation:kwDrift var(--t,120s) linear var(--dl,0s) infinite;will-change:translate;filter:drop-shadow(0 12px 7px rgba(40,70,120,.38)) var(--cf,saturate(1))}',
    '@keyframes kwDrift{from{translate:-50vw 0}to{translate:130vw 0}}',
    '.kw-rainbow{position:absolute;left:50%;top:2%;width:auto;height:var(--bh,90px);max-width:90vw;translate:-50% 0;opacity:0;transition:opacity 2.6s ease;filter:saturate(1.1)}',
    '.kw-rainbow.on{opacity:.55}',
    '.kw-rainbow.cele{opacity:0;animation:kwCele 4.2s cubic-bezier(.23,1,.32,1) both;filter:saturate(1.2) drop-shadow(0 0 10px rgba(255,255,255,.6))}',
    '@keyframes kwCele{0%{opacity:0;scale:.7;translate:-50% 12%}30%{opacity:.95;scale:1;translate:-50% 0}80%{opacity:.95}100%{opacity:0}}',
    '.kw-vee{position:absolute;top:var(--y,14%);left:0;width:110px;height:50px;translate:-140px 0;opacity:.9;animation:kwFly var(--t,22s) linear forwards}',
    '.kw-vee svg{position:absolute;width:28px;height:17px;left:var(--x);top:var(--yy);animation:kwFlap .5s ease-in-out infinite alternate;transform-origin:50% 60%}',
    '@keyframes kwFly{from{translate:-140px 0}to{translate:calc(100vw + 140px) -40px}}@keyframes kwFlap{from{scale:1 1}to{scale:1 .35}}',
    '.kw-wx{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:14;border-radius:inherit}',
    '.kw-under{position:absolute;inset:0;overflow:hidden;pointer-events:none;border-radius:inherit}',
    '.kw-skymist{position:absolute;left:-30%;width:160%;height:34%;bottom:-6%;border-radius:50%;background:radial-gradient(closest-side,rgba(244,248,255,.8),rgba(244,248,255,.35) 60%,rgba(244,248,255,0));filter:blur(5px);animation:kwMist var(--t,40s) ease-in-out var(--dl,0s) infinite alternate}',
    '.kw-ray{position:absolute;top:-6%;left:var(--x,-4%);width:var(--w,62%);max-width:calc(var(--cell)*5.5);height:auto;transform-origin:50% 0;rotate:var(--r,-6deg);mix-blend-mode:screen;opacity:.32;animation:kwRay var(--t,8s) ease-in-out var(--dl,0s) infinite alternate}',
    '@keyframes kwRay{from{opacity:.2;rotate:calc(var(--r,-6deg) - 3deg)}to{opacity:.45;rotate:calc(var(--r,-6deg) + 3deg)}}',
    '.kw-mist{position:absolute;left:-40%;width:130%;height:44%;border-radius:50%;background:radial-gradient(closest-side,rgba(244,248,255,.2),rgba(244,248,255,.1) 60%,rgba(244,248,255,0));filter:blur(5px);animation:kwMist var(--t,40s) ease-in-out var(--dl,0s) infinite alternate}',
    '@keyframes kwMist{from{translate:-6% 0;scale:1 1}to{translate:34% 5%;scale:1.12 1.2}}',
    '.kw-fly{position:absolute;width:8px;height:8px;border-radius:50%;background:#f0ff8a;box-shadow:0 0 12px 5px rgba(225,255,100,.8);left:var(--x);top:var(--y);animation:kwWander var(--t,9s) ease-in-out var(--dl,0s) infinite alternate,kwBlink var(--b,2.6s) ease-in-out var(--dl,0s) infinite;mix-blend-mode:screen}',
    '@keyframes kwWander{from{translate:0 0}33%{translate:calc(var(--cell)*.6) calc(var(--cell)*-.4)}66%{translate:calc(var(--cell)*-.3) calc(var(--cell)*-.7)}to{translate:calc(var(--cell)*.4) calc(var(--cell)*.3)}}',
    '@keyframes kwBlink{0%,100%{opacity:.1}45%,60%{opacity:1}}',
    '.kw-leaf{position:absolute;top:-8%;left:var(--x);width:16px;height:10px;border-radius:0 80% 0 80%;background:var(--c,#7fb83a);box-shadow:0 1px 2px rgba(0,0,0,.3);opacity:0;animation:kwLeaf var(--t,9s) linear var(--dl,0s) infinite}',
    '@keyframes kwLeaf{0%{translate:0 0;rotate:0deg;opacity:0}8%{opacity:1}30%{translate:30px 30vh;rotate:130deg}60%{translate:-24px 62vh;rotate:260deg}92%{opacity:1}100%{translate:18px 100vh;rotate:420deg;opacity:0}}',
    '.kw-drift{position:absolute;top:var(--y,30%);left:0;width:calc(var(--cell)*var(--k,2.2));height:auto;opacity:0;translate:-30% 0;animation:kwSweep var(--t,16s) linear var(--dl,0s) infinite;filter:drop-shadow(0 3px 3px rgba(0,0,0,.25))}',
    '@keyframes kwSweep{0%{translate:-30% 0;rotate:0deg;opacity:0}10%{opacity:.95}90%{opacity:.95}100%{translate:calc(100vw + 30%) -14vh;rotate:50deg;opacity:0}}',
    '.kw-snow{position:absolute;top:-4%;left:var(--x);width:var(--s,6px);height:var(--s,6px);border-radius:50%;background:#fff;box-shadow:0 0 6px 2px rgba(255,255,255,.85);opacity:0;animation:kwSnow var(--t,8s) linear var(--dl,0s) infinite}',
    '@keyframes kwSnow{0%{translate:0 0;opacity:0}10%{opacity:1}50%{translate:20px 50vh}100%{translate:-14px 105vh;opacity:.8}}',
    '.kw-bfly{position:absolute;left:-8%;top:var(--y,50%);width:calc(var(--cell)*.62);height:calc(var(--cell)*.48);animation:kwBfly 22s ease-in-out infinite;filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))}',
    '.kw-bfly i{position:absolute;top:0;width:52%;height:100%;border-radius:60% 40% 55% 45%;background:radial-gradient(circle at 60% 45%,#fff 0 12%,var(--wc,#ff6fa0) 14%,var(--wc2,#ffd23f));transform-origin:100% 50%;animation:kwWing .22s ease-in-out infinite alternate}',
    '.kw-bfly i:first-child{left:0}.kw-bfly i:last-child{right:0;transform-origin:0 50%;animation-direction:alternate-reverse}',
    '@keyframes kwWing{from{scale:1 1}to{scale:.25 1}}',
    '@keyframes kwBfly{0%{translate:0 0}20%{translate:30vw -9vh}40%{translate:55vw 4vh}60%{translate:78vw -7vh}80%{translate:100vw 3vh}100%{translate:118vw -4vh}}',
    '.kw-fish{position:absolute;left:22%;top:28%;width:56%;height:36%;pointer-events:none;z-index:7;opacity:0;filter:drop-shadow(0 3px 2px rgba(0,30,60,.4))}',
    '.kw-fish svg{width:100%;height:100%}',
    '.kw-splash{position:absolute;left:20%;top:38%;width:60%;height:auto;pointer-events:none;z-index:6;opacity:0}',
    '.kw-lily{position:absolute;pointer-events:none;width:30%;height:22%;left:var(--x,50%);top:var(--y,50%);border-radius:50%;background:radial-gradient(circle at 40% 40%,#8be07a,#3f9a46);clip-path:polygon(50% 50%,100% 40%,100% 62%,50% 100%,0 70%,0 30%,45% 0);animation:kwBob 3.4s ease-in-out var(--dl,0s) infinite alternate;z-index:5}',
    '@keyframes kwBob{from{translate:0 0;rotate:-8deg}to{translate:2px 3px;rotate:8deg}}',
    '.kw-ring{position:absolute;left:-5%;top:20%;width:110%;height:auto;pointer-events:none;z-index:6;opacity:0}',
    '.kw-glint{position:absolute;pointer-events:none;width:16px;height:16px;z-index:5;opacity:0;background:radial-gradient(circle,#fff,rgba(255,255,255,0) 70%);clip-path:polygon(50% 0,60% 40%,100% 50%,60% 60%,50% 100%,40% 60%,0 50%,40% 40%)}',
    'html[data-pack="kereta"] .k-flag img{transform-origin:22% 100%;animation:kwFlag 2.4s ease-in-out infinite alternate}',
    '@keyframes kwFlag{from{rotate:-2.5deg;scale:1 1}to{rotate:3.5deg;scale:.94 1.02}}',
    '.kw-off *,.kw-off{animation-play-state:paused!important}',
    '@media(prefers-reduced-motion:reduce){.kw-sky,.kw-wx,.kw-fish,.kw-lily,.kw-ring,.kw-glint,.kw-splash{display:none}html[data-pack="kereta"] .k-flag img{animation:none}}'
  ].join('\n')
  var st = D.createElement('style'); st.textContent = CSS; D.head.appendChild(st)

  var VFXP = '../assets/vfx/', WATER = [], SKY = null, WX = null, UN = null, lastKey = '', lastMood = '', wet = false, T = []
  function later (fn, ms) { var t = setTimeout(fn, ms); T.push(t); return t }
  function clear () { T.forEach(clearTimeout); T = []; ;[SKY, WX, UN].forEach(function (n) { n && n.remove() }); SKY = WX = UN = null; [].forEach.call(D.querySelectorAll('.kw-fish,.kw-lily,.kw-ring'), function (n) { n.remove() }) }
  function scene () { var s = $('scr-play'); return { mood: (s && s.getAttribute('data-mood')) || 'sun', terrain: (s && s.getAttribute('data-terrain')) || 'meadow' } }
  function many (n, fn) { var h = ''; for (var i = 0; i < n; i++) h += fn(i); return h }
  var BIRD = '<path d="M1 9Q5 1 10 7Q15 1 19 9Q15 5 10 10Q5 5 1 9Z" fill="#35404f"/>'

  function ripple (d, big, delay) {
    var ring = el('img', 'kw-ring'); ring.alt = ''; ring.src = VFXP + 'ow-water-ripple.webp'; d.appendChild(ring)
    try { var b = ring.animate([{ scale: .25, opacity: .95 }, { scale: big ? 1.2 : 1, opacity: 0 }], { duration: 1200, delay: delay || 0, fill: 'both' }); b.onfinish = function () { ring.remove() } } catch (e) { ring.remove() }
  }
  function fish () {
    var water = WATER.filter(function (d) { return d.isConnected }); if (!water.length) return false
    var d = water[Math.floor(Math.random() * water.length)], c = cell(), dir = Math.random() < .5 ? 1 : -1
    var f = el('div', 'kw-fish', '<svg viewBox="0 0 48 28" style="scale:' + dir + ' 1"><path d="M3 14Q16 -1 30 9L45 2 40 14 45 26 30 19Q16 29 3 14Z" fill="#ff8a3d"/><path d="M12 9Q18 5 24 9" stroke="#fff" stroke-width="1.6" fill="none"/><circle cx="10" cy="11" r="2" fill="#fff"/><circle cx="10" cy="11" r=".9" fill="#222"/></svg>'); d.appendChild(f)
    var sp = el('img', 'kw-splash'); sp.alt = ''; sp.src = VFXP + 'ow-splash-crown.webp'; d.appendChild(sp)
    try {
      var a = f.animate([{ translate: (-dir * c * .25) + 'px ' + (c * .3) + 'px', rotate: (-dir * 60) + 'deg', opacity: 0 }, { translate: '0 ' + (-c * .42) + 'px', rotate: '0deg', opacity: 1, offset: .5 }, { translate: (dir * c * .25) + 'px ' + (c * .3) + 'px', rotate: (dir * 65) + 'deg', opacity: 0 }], { duration: 950, easing: 'ease-out' }); a.onfinish = function () { f.remove() }
      var b = sp.animate([{ scale: .2, opacity: 0, offset: 0 }, { scale: .45, opacity: .95, offset: .12 }, { scale: .8, opacity: 0 }], { duration: 650, delay: 780 }); b.onfinish = function () { sp.remove() }
    } catch (e) { f.remove(); sp.remove() }
    ripple(d, false, 800); return true
  }
  // a happy moment (level result card opens): a big rainbow arcs over the top of the screen with a sparkle burst
  var cardOn = false
  function celebrate () {
    var m = scene().mood; if (!SKY || /night|dream|storm/.test(m) || SKY.querySelector('.kw-rainbow.cele')) return
    var im = el('img', 'kw-rainbow cele'); im.alt = ''; im.src = VFXP + 'ow-rainbow.webp'; SKY.appendChild(im); fitSky(); void im.offsetWidth
    setTimeout(function () { im.remove() }, 4300)
    if (W.VFX && VFX.play) { var r = SKY.getBoundingClientRect(); [.3, .5, .7].forEach(function (x, i) { setTimeout(function () { try { VFX.play('bk-star-0' + (i + 1), { x: W.innerWidth * x, y: r.top + r.height * .45, size: 70, essential: true, filter: 'sepia(1) saturate(5) hue-rotate(-18deg)' }) } catch (e) {} }, i * 220) }) }
  }
  // wind: a swirl of leaves rides along with the grass gust over bright, leafy boards
  function swirl () {
    if (!WX || WX.getAttribute('data-leafy') !== '1') return
    var im = el('img', 'kw-drift'); im.alt = ''; im.src = VFXP + 'ow-leaf-swirl.webp'; im.style.cssText = '--y:' + rnd(35, 60).toFixed(0) + '%;--k:1.5;animation:none'; WX.appendChild(im)
    try { im.animate([{ translate: '-30% 0', rotate: '0deg', opacity: 0 }, { opacity: .95, offset: .12 }, { opacity: .95, offset: .88 }, { translate: (WX.clientWidth * 1.1) + 'px -9%', rotate: '200deg', opacity: 0 }], { duration: 3600, easing: 'ease-in-out' }).onfinish = function () { im.remove() } } catch (e) { im.remove() }
  }

  // clouds live only in the sky band: above the board's top edge
  function fitSky () { var b = $('board-wrap') || $('board'), pl = $('scr-play'); if (!SKY || !b || !pl) return; var top = b.getBoundingClientRect().top - pl.getBoundingClientRect().top; var hh = Math.max(40, Math.round(top)); SKY.style.height = hh + 'px'; SKY.style.setProperty('--bh', Math.round(hh * .92) + 'px') }
  W.addEventListener('resize', fitSky)
  function build (lv) {
    clear()
    var sc = scene(), mood = sc.mood, terr = sc.terrain
    var dark = /night|dream/.test(mood), wetNow = /rain|storm/.test(mood), bright = !dark && !wetNow
    var play = $('scr-play'), board = $('board'); if (!play || !board) return
    // ── sky: real cloud art, tinted to the mood, with a soft shadow underneath ──
    SKY = el('div', 'kw-sky'); SKY.setAttribute('aria-hidden', 'true')
    var cf = mood === 'sunset' ? 'sepia(.45) saturate(1.7) hue-rotate(-12deg) brightness(1.03)' : wetNow ? 'grayscale(.75) brightness(.74)' : dark ? 'brightness(.5) saturate(.55)' : 'saturate(1)'
    var nC = wetNow ? 5 : dark ? 3 : 4, wide = W.innerWidth > 700 ? 1.5 : 1
    SKY.innerHTML = many(nC, function (i) { return '<img class="kw-cloud" alt="" src="' + VFXP + 'ow-soft-cloud.webp" style="top:' + (3 + i * 9 + rnd(0, 5)).toFixed(0) + '%;--t:' + (80 + i * 20) + 's;--dl:-' + (i * 27 + rnd(0, 18)).toFixed(0) + 's;--w:' + Math.round((120 + (i % 3) * 60) * wide) + 'px;--cf:' + cf + ';opacity:' + (wetNow ? .85 : dark ? .55 : 1) + '">' })
    if (mood === 'sun' && /meadow|depot|town/.test(terr)) { var rb = el('img', 'kw-rainbow'); rb.alt = ''; rb.src = VFXP + 'ow-rainbow.webp'; SKY.appendChild(rb); later(function () { rb.classList.add('on') }, 1800) }
    play.insertBefore(SKY, $('msl-bg') ? $('msl-bg').nextSibling : play.firstChild)
    if (bright) (function vee () { later(function () {
      if (!D.hidden && SKY) { var f = el('div', 'kw-vee'), n = 3 + Math.floor(rnd(0, 3)); f.style.setProperty('--y', rnd(8, 26).toFixed(0) + '%'); f.style.setProperty('--t', rnd(16, 22).toFixed(0) + 's')
        f.innerHTML = many(n, function (i) { var k = Math.ceil(i / 2), s = i % 2 ? 1 : -1; return '<svg style="--x:' + (40 + s * k * 18) + 'px;--yy:' + (k * 10) + 'px;animation-delay:-' + (i * .13).toFixed(2) + 's" viewBox="0 0 20 12">' + BIRD + '</svg>' })
        SKY.appendChild(f); setTimeout(function () { f.remove() }, 23000) }
      vee() }, rnd(9000, 20000)) })()
    // ── weather over the board ──
    WX = el('div', 'kw-wx'); WX.setAttribute('aria-hidden', 'true'); var h = '', u = ''
    UN = el('div', 'kw-under'); UN.setAttribute('aria-hidden', 'true')
    if (bright && /meadow|logging|mountain|depot/.test(terr)) u += '<img class="kw-ray" alt="" src="' + VFXP + 'ow-light-rays.webp" style="--x:-6%;--r:-8deg"><img class="kw-ray" alt="" src="' + VFXP + 'ow-light-rays.webp" style="--x:38%;--r:6deg;--w:40%;--t:11s;--dl:-4s">'
    if (/gorge|mountain/.test(terr) && !wetNow) u += many(4, function (i) { return '<i class="kw-mist" style="top:' + (30 + i * 16) + '%;--t:' + (26 + i * 9) + 's;--dl:-' + (i * 11) + 's"></i>' })
    if (dark) h += many(11, function () { return '<i class="kw-fly" style="--x:' + rnd(4, 94).toFixed(0) + '%;--y:' + rnd(18, 88).toFixed(0) + '%;--t:' + rnd(7, 12).toFixed(1) + 's;--b:' + rnd(2, 3.6).toFixed(1) + 's;--dl:-' + rnd(0, 8).toFixed(1) + 's"></i>' })
    var leafy = (terr === 'logging' || terr === 'meadow') && mood !== 'storm' && !dark
    if (terr === 'logging' && mood !== 'storm' && !dark) h += many(8, function (i) { return '<i class="kw-leaf" style="--x:' + rnd(2, 96).toFixed(0) + '%;--t:' + rnd(7, 11).toFixed(1) + 's;--dl:-' + rnd(0, 12).toFixed(1) + 's;--c:' + ['#7fb83a', '#e0a23a', '#c9622e', '#5aa04a'][i % 4] + '"></i>' }) + '<img class="kw-drift" alt="" src="' + VFXP + 'ow-flying-leaves.webp" style="--y:18%;--t:15s;--dl:-5s">'
    if (terr === 'mountain' && !wetNow) h += many(26, function () { return '<i class="kw-snow" style="--x:' + rnd(0, 98).toFixed(0) + '%;--s:' + rnd(5, 9).toFixed(1) + 'px;--t:' + rnd(6, 10).toFixed(1) + 's;--dl:-' + rnd(0, 10).toFixed(1) + 's"></i>' })
    if (bright && terr === 'meadow') h += '<div class="kw-bfly" style="--y:' + rnd(30, 70).toFixed(0) + '%;animation-delay:-' + rnd(0, 20).toFixed(0) + 's"><i></i><i></i></div>'
    WX.innerHTML = h; WX.setAttribute('data-leafy', leafy ? '1' : '')
    UN.innerHTML = u; board.insertBefore(UN, $('decor') || board.firstChild)   // under the props, cast, objects and Linus: never veils a marker
    board.appendChild(WX)
    if (/gorge|mountain/.test(terr) && !wetNow) SKY.insertAdjacentHTML('beforeend', many(2, function (i) { return '<i class="kw-skymist" style="--t:' + (30 + i * 12) + 's;--dl:-' + (i * 14) + 's"></i>' }))
    fitSky(); later(fitSky, 700); later(fitSky, 2000)
    // ── ground: lily pads + jumping fish on open water ──
    var water = [].slice.call(D.querySelectorAll('#decor .dec.k-water')).filter(function (d) { var rc = (d.getAttribute('data-rc') || '').split(',').map(Number); return (lv.grid.map[rc[0]] || '').charAt(rc[1]) === '~' })
    water.forEach(function (d, i) {
      if (i % 2 === 0) d.appendChild(el('i', 'kw-lily', '')).style.cssText = '--x:' + rnd(12, 56).toFixed(0) + '%;--y:' + rnd(40, 70).toFixed(0) + '%;--dl:-' + rnd(0, 3).toFixed(1) + 's'
    })
    WATER = water
    if (water.length && !wetNow) (function fishLoop () { later(function () { if (!D.hidden) fish(); fishLoop() }, rnd(3500, 7000)) })()
    lastMood = mood; wet = wetNow
  }

  // grass gust: a wave of lean runs across the fringe, left to right
  function gust () {
    if (D.hidden) return
    var bl = D.querySelectorAll('.k-fringe i'); if (!bl.length) return
    var n = bl.length; swirl()
    ;[].forEach.call(bl, function (b, i) { try { b.animate([{ rotate: '0deg' }, { rotate: '16deg', offset: .4 }, { rotate: '-3deg', offset: .75 }, { rotate: '0deg' }], { duration: 1100, delay: i / n * 1800, easing: 'ease-in-out' }) } catch (e) {} })
    var fl = [].slice.call(D.querySelectorAll('.k-fringe .fl')); fl.forEach(function (f, i) { try { f.animate([{ rotate: '0deg' }, { rotate: '14deg', offset: .4 }, { rotate: '0deg' }], { duration: 1100, delay: (.2 + i * .3) * 1800 }) } catch (e) {} })
  }
  // Linus: ripple on bridges, wheel glint when idle, a hop when the run starts
  var running = false, lastBridge = '', glintAt = 0
  function linus () {
    if (D.hidden || D.body.getAttribute('data-scr') !== 'scr-play') return
    var s = W.__mojo && W.__mojo.state && W.__mojo.state(), now = Date.now(); if (!s) return
    if (s.running && !running) { var im = D.querySelector('#mojo-mod img, #mojo img'); if (im) try { im.animate([{ scale: '1 1' }, { scale: '1.08 .9', offset: .3 }, { scale: '.97 1.06', offset: .65 }, { scale: '1 1' }], { duration: 520, easing: 'ease-out' }) } catch (e) {} }
    running = s.running
    var on = !!D.querySelector('#ov-card.on .card.result'); if (on && !cardOn) celebrate(); cardOn = on
    var lv = W.MojoLevels && MojoLevels.byId(s.id), p = s.position
    if (lv && s.running) {
      var k = p.r + ',' + p.c
      if ((lv.grid.map[p.r] || '').charAt(p.c) === '=' && k !== lastBridge) {
        lastBridge = k
        var d = D.querySelector('#decor .dec.k-water[data-rc="' + k + '"]'); if (d) ripple(d, true)
      } else if ((lv.grid.map[p.r] || '').charAt(p.c) !== '=') lastBridge = ''
    }
    if (!s.running && now - glintAt > 7000) {
      glintAt = now; var m = $('mojo'); if (m) { var g = el('i', 'kw-glint'); g.style.left = '24%'; g.style.top = '58%'; m.appendChild(g); try { var an = g.animate([{ opacity: 0, scale: .2, rotate: '0deg' }, { opacity: 1, scale: 1.1, rotate: '45deg', offset: .5 }, { opacity: 0, scale: .3, rotate: '90deg' }], { duration: 700 }); an.onfinish = function () { g.remove() } } catch (e) { g.remove() } }
    }
  }

  var hud0 = def.onHud
  def.onHud = function (c) {
    if (hud0) hud0(c)
    var key = c.lv.id + '/' + c.bi + '/' + (scene().mood) + '/' + scene().terrain
    if (key !== lastKey || !D.querySelector('#board .kw-wx')) { lastKey = key; try { build(c.lv) } catch (e) {} }
  }
  W.setInterval(function () { if (D.body.getAttribute('data-scr') === 'scr-play') gust() }, 11000)
  W.setInterval(linus, 400)
  D.addEventListener('visibilitychange', function () { [SKY, WX].forEach(function (n) { n && n.classList.toggle('kw-off', D.hidden) }) })
  W.KeretaWeather = { sky: function () { return SKY }, wx: function () { return WX }, gust: gust, fish: fish, swirl: swirl, celebrate: celebrate }
})(typeof window !== 'undefined' ? window : globalThis)
