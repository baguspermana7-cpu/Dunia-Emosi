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
 * Effect database use is listed in docs/KERETA-VFX-PLAN.md ("Board life").
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
    '.kw-sky{position:absolute;left:0;right:0;top:0;height:44%;overflow:hidden;pointer-events:none;z-index:0}',
    '.kw-cloud{position:absolute;left:0;width:150px;height:46px;opacity:.95;translate:-40vw 0;animation:kwDrift var(--t,120s) linear var(--dl,0s) infinite;will-change:translate}',
    '.kw-cloud i{position:absolute;bottom:0;border-radius:50%;background:var(--cc,#fff);box-shadow:inset 0 -7px 9px rgba(120,150,190,.4);filter:blur(.6px)}',
    '.kw-cloud i:nth-child(1){left:0;width:56%;height:60%}.kw-cloud i:nth-child(2){left:22%;width:50%;height:100%}.kw-cloud i:nth-child(3){left:50%;width:50%;height:72%}.kw-cloud i:nth-child(4){left:8%;width:84%;height:42%;border-radius:40px}',
    '@keyframes kwDrift{from{translate:-40vw 0}to{translate:140vw 0}}',
    '.kw-rainbow{position:absolute;left:50%;top:6%;width:min(92vw,520px);aspect-ratio:2/1;translate:-50% 0;opacity:0;transition:opacity 4s ease;-webkit-mask:linear-gradient(180deg,#000 55%,transparent 100%);mask:linear-gradient(180deg,#000 55%,transparent 100%)}',
    '.kw-rainbow.on{opacity:.5}',
    '.kw-rainbow::before{content:"";position:absolute;inset:0;border-radius:50% 50% 0 0/100% 100% 0 0;background:radial-gradient(ellipse at 50% 100%,transparent 50%,#ff6b6b 50.5%,#ffa94d 54%,#ffe066 57.5%,#8ce99a 61%,#74c0fc 64.5%,#9775fa 68%,transparent 69%)}',
    '.kw-vee{position:absolute;top:var(--y,14%);left:0;width:80px;height:34px;translate:-120px 0;opacity:.8;animation:kwFly var(--t,22s) linear forwards}',
    '.kw-vee svg{position:absolute;width:20px;height:12px;left:var(--x);top:var(--yy);animation:kwFlap .5s ease-in-out infinite alternate;transform-origin:50% 60%}',
    '@keyframes kwFly{from{translate:-120px 0}to{translate:calc(100vw + 120px) -30px}}@keyframes kwFlap{from{scale:1 1}to{scale:1 .35}}',
    '.kw-wx{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:14;border-radius:inherit}',
    '.kw-ray{position:absolute;top:-30%;left:var(--x,10%);width:16%;height:170%;transform-origin:50% 0;rotate:var(--r,-24deg);background:linear-gradient(180deg,rgba(255,244,190,.5),rgba(255,244,190,0) 78%);mix-blend-mode:screen;animation:kwRay var(--t,9s) ease-in-out var(--dl,0s) infinite alternate}',
    '@keyframes kwRay{from{opacity:.25}to{opacity:.8}}',
    '.kw-mist{position:absolute;left:-30%;width:90%;height:34%;border-radius:50%;background:radial-gradient(closest-side,rgba(235,242,250,.5),rgba(235,242,250,0));animation:kwMist var(--t,40s) ease-in-out var(--dl,0s) infinite alternate;translate:0 0}',
    '@keyframes kwMist{from{translate:0 0}to{translate:55% 4%}}',
    '.kw-fly{position:absolute;width:6px;height:6px;border-radius:50%;background:#e6ff7a;box-shadow:0 0 8px 3px rgba(220,255,100,.7);left:var(--x);top:var(--y);animation:kwWander var(--t,9s) ease-in-out var(--dl,0s) infinite alternate,kwBlink var(--b,2.6s) ease-in-out var(--dl,0s) infinite;mix-blend-mode:screen}',
    '@keyframes kwWander{from{translate:0 0}33%{translate:calc(var(--cell)*.6) calc(var(--cell)*-.4)}66%{translate:calc(var(--cell)*-.3) calc(var(--cell)*-.7)}to{translate:calc(var(--cell)*.4) calc(var(--cell)*.3)}}',
    '@keyframes kwBlink{0%,100%{opacity:.08}45%,60%{opacity:1}}',
    '.kw-leaf{position:absolute;top:-8%;left:var(--x);width:11px;height:7px;border-radius:0 80% 0 80%;background:var(--c,#7fb83a);opacity:0;animation:kwLeaf var(--t,9s) linear var(--dl,0s) infinite}',
    '@keyframes kwLeaf{0%{translate:0 0;rotate:0deg;opacity:0}8%{opacity:.9}30%{translate:22px 30vh;rotate:130deg}60%{translate:-18px 62vh;rotate:260deg}92%{opacity:.9}100%{translate:14px 100vh;rotate:420deg;opacity:0}}',
    '.kw-snow{position:absolute;top:-4%;left:var(--x);width:var(--s,4px);height:var(--s,4px);border-radius:50%;background:#fff;opacity:0;animation:kwSnow var(--t,8s) linear var(--dl,0s) infinite}',
    '@keyframes kwSnow{0%{translate:0 0;opacity:0}10%{opacity:.9}50%{translate:14px 52vh}100%{translate:-10px 105vh;opacity:.7}}',
    '.kw-bfly{position:absolute;left:-8%;top:var(--y,50%);width:calc(var(--cell)*.3);height:calc(var(--cell)*.24);animation:kwBfly 26s ease-in-out infinite}',
    '.kw-bfly i{position:absolute;top:0;width:52%;height:100%;border-radius:60% 40% 55% 45%;background:var(--wc,#ff8fb1);transform-origin:100% 50%;animation:kwWing .22s ease-in-out infinite alternate}',
    '.kw-bfly i:first-child{left:0}.kw-bfly i:last-child{right:0;transform-origin:0 50%;animation-direction:alternate-reverse;background:var(--wc2,#ffb3cc)}',
    '@keyframes kwWing{from{scale:1 1}to{scale:.25 1}}',
    '@keyframes kwBfly{0%{translate:0 0}20%{translate:30vw -9vh}40%{translate:55vw 4vh}60%{translate:78vw -7vh}80%{translate:100vw 3vh}100%{translate:118vw -4vh}}',
    '.kw-fish{position:absolute;left:25%;top:30%;width:50%;height:30%;pointer-events:none;z-index:5;opacity:0}',
    '.kw-fish svg{width:100%;height:100%}',
    '.kw-lily{position:absolute;pointer-events:none;width:30%;height:22%;left:var(--x,50%);top:var(--y,50%);border-radius:50%;background:radial-gradient(circle at 40% 40%,#8be07a,#3f9a46);clip-path:polygon(50% 50%,100% 40%,100% 62%,50% 100%,0 70%,0 30%,45% 0);animation:kwBob 3.4s ease-in-out var(--dl,0s) infinite alternate;z-index:5}',
    '@keyframes kwBob{from{translate:0 0;rotate:-8deg}to{translate:2px 3px;rotate:8deg}}',
    '.kw-ring{position:absolute;left:50%;top:60%;width:60%;aspect-ratio:2/1;translate:-50% -50%;border-radius:50%;border:2px solid rgba(255,255,255,.85);pointer-events:none;z-index:6;opacity:0}',
    '.kw-glint{position:absolute;pointer-events:none;width:14px;height:14px;z-index:5;opacity:0;background:radial-gradient(circle,#fff,rgba(255,255,255,0) 70%);clip-path:polygon(50% 0,60% 40%,100% 50%,60% 60%,50% 100%,40% 60%,0 50%,40% 40%)}',
    'html[data-pack="kereta"] .k-flag img{transform-origin:22% 100%;animation:kwFlag 2.4s ease-in-out infinite alternate}',
    '@keyframes kwFlag{from{rotate:-2.5deg;scale:1 1}to{rotate:3.5deg;scale:.94 1.02}}',
    '.kw-off *,.kw-off{animation-play-state:paused!important}',
    '@media(prefers-reduced-motion:reduce){.kw-sky,.kw-wx,.kw-fish,.kw-lily,.kw-ring,.kw-glint{display:none}html[data-pack="kereta"] .k-flag img{animation:none}}'
  ].join('\n')
  var st = D.createElement('style'); st.textContent = CSS; D.head.appendChild(st)

  var SKY = null, WX = null, lastKey = '', lastMood = '', wet = false, T = []
  function later (fn, ms) { var t = setTimeout(fn, ms); T.push(t); return t }
  function clear () { T.forEach(clearTimeout); T = []; ;[SKY, WX].forEach(function (n) { n && n.remove() }); SKY = WX = null; [].forEach.call(D.querySelectorAll('.kw-fish,.kw-lily,.kw-ring'), function (n) { n.remove() }) }
  function scene () { var s = $('scr-play'); return { mood: (s && s.getAttribute('data-mood')) || 'sun', terrain: (s && s.getAttribute('data-terrain')) || 'meadow' } }
  function many (n, fn) { var h = ''; for (var i = 0; i < n; i++) h += fn(i); return h }
  var BIRD = '<path d="M1 9Q5 1 10 7Q15 1 19 9Q15 5 10 10Q5 5 1 9Z" fill="#35404f"/>'

  function build (lv) {
    clear()
    var sc = scene(), mood = sc.mood, terr = sc.terrain
    var dark = /night|dream/.test(mood), wetNow = /rain|storm/.test(mood), bright = !dark && !wetNow
    var play = $('scr-play'), board = $('board'); if (!play || !board) return
    // ── sky ──
    SKY = el('div', 'kw-sky'); SKY.setAttribute('aria-hidden', 'true')
    var tint = mood === 'sunset' ? '#ffd9b8' : wetNow ? '#9aa4b2' : dark ? '#4a5575' : '#fff'
    var nC = wetNow ? 4 : dark ? 2 : 4
    SKY.innerHTML = many(nC, function (i) { return '<div class="kw-cloud" style="top:' + (6 + i * 9 + rnd(0, 5)).toFixed(0) + '%;--t:' + (95 + i * 22) + 's;--dl:-' + (i * 31 + rnd(0, 20)).toFixed(0) + 's;--cc:' + tint + ';width:' + (110 + (i % 3) * 55) + 'px;height:' + (34 + (i % 3) * 14) + 'px;opacity:' + (wetNow ? .6 : dark ? .3 : .82) + '"><i></i><i></i><i></i><i></i></div>' })
    var rb = null
    if (mood === 'sun' && /meadow|depot|town/.test(terr) && (wet || lv.id.charCodeAt(lv.id.length - 1) % 2 === 0)) { rb = el('div', 'kw-rainbow'); SKY.appendChild(rb); later(function () { rb.classList.add('on') }, 2500) }
    play.insertBefore(SKY, $('msl-bg') ? $('msl-bg').nextSibling : play.firstChild)
    if (bright) (function vee () { later(function () {
      if (!D.hidden && SKY) { var f = el('div', 'kw-vee'), n = 3 + Math.floor(rnd(0, 3)); f.style.setProperty('--y', rnd(8, 26).toFixed(0) + '%'); f.style.setProperty('--t', rnd(18, 26).toFixed(0) + 's')
        f.innerHTML = many(n, function (i) { var k = Math.ceil(i / 2), s = i % 2 ? 1 : -1; return '<svg style="--x:' + (30 + s * k * 14) + 'px;--yy:' + (k * 8) + 'px;animation-delay:-' + (i * .13).toFixed(2) + 's" viewBox="0 0 20 12">' + BIRD + '</svg>' })
        SKY.appendChild(f); setTimeout(function () { f.remove() }, 27000) }
      vee() }, rnd(14000, 30000)) })()
    // ── weather over the board ──
    WX = el('div', 'kw-wx'); WX.setAttribute('aria-hidden', 'true'); var h = ''
    if (bright && /meadow|logging|mountain|depot/.test(terr)) h += '<i class="kw-ray" style="--x:6%;--r:-22deg"></i><i class="kw-ray" style="--x:34%;--r:-26deg;--t:12s;--dl:-4s;width:10%"></i>'
    if (/gorge|mountain/.test(terr) && !wetNow) h += many(3, function (i) { return '<i class="kw-mist" style="top:' + (44 + i * 18) + '%;--t:' + (36 + i * 14) + 's;--dl:-' + (i * 13) + 's"></i>' })
    if (dark) h += many(9, function () { return '<i class="kw-fly" style="--x:' + rnd(4, 94).toFixed(0) + '%;--y:' + rnd(18, 88).toFixed(0) + '%;--t:' + rnd(7, 12).toFixed(1) + 's;--b:' + rnd(2, 3.6).toFixed(1) + 's;--dl:-' + rnd(0, 8).toFixed(1) + 's"></i>' })
    if (terr === 'logging' && mood !== 'storm' && !dark) h += many(7, function (i) { return '<i class="kw-leaf" style="--x:' + rnd(2, 96).toFixed(0) + '%;--t:' + rnd(8, 13).toFixed(1) + 's;--dl:-' + rnd(0, 12).toFixed(1) + 's;--c:' + ['#7fb83a', '#d9a13a', '#c9622e', '#5aa04a'][i % 4] + '"></i>' })
    if (terr === 'mountain' && !wetNow) h += many(18, function () { return '<i class="kw-snow" style="--x:' + rnd(0, 98).toFixed(0) + '%;--s:' + rnd(3, 6).toFixed(1) + 'px;--t:' + rnd(7, 12).toFixed(1) + 's;--dl:-' + rnd(0, 12).toFixed(1) + 's"></i>' })
    if (bright && terr === 'meadow') h += '<div class="kw-bfly" style="--y:' + rnd(30, 70).toFixed(0) + '%;animation-delay:-' + rnd(0, 20).toFixed(0) + 's"><i></i><i></i></div>'
    WX.innerHTML = h
    board.appendChild(WX)
    // ── ground: lily pads + jumping fish on open water ──
    var water = [].slice.call(D.querySelectorAll('#decor .dec.k-water')).filter(function (d) { var rc = (d.getAttribute('data-rc') || '').split(',').map(Number); return (lv.grid.map[rc[0]] || '').charAt(rc[1]) === '~' })
    water.forEach(function (d, i) {
      if (i % 2 === 0) d.appendChild(el('i', 'kw-lily', '')).style.cssText = '--x:' + rnd(12, 56).toFixed(0) + '%;--y:' + rnd(40, 70).toFixed(0) + '%;--dl:-' + rnd(0, 3).toFixed(1) + 's'
    })
    if (water.length && !wetNow) (function fish () { later(function () {
      if (!D.hidden && water.length) { var d = water[Math.floor(Math.random() * water.length)]; if (d.isConnected) { var f = el('div', 'kw-fish', '<svg viewBox="0 0 40 24"><path d="M2 12Q14 0 26 8L38 2 34 12 38 22 26 16Q14 24 2 12Z" fill="#f08a3c"/><circle cx="9" cy="10" r="1.6" fill="#fff"/></svg>'); d.appendChild(f)
        var c = cell(); try { var a = f.animate([{ translate: '0 ' + (c * .15) + 'px', rotate: '-50deg', opacity: 0 }, { translate: '0 ' + (-c * .38) + 'px', rotate: '0deg', opacity: 1, offset: .5 }, { translate: '0 ' + (c * .15) + 'px', rotate: '55deg', opacity: 0 }], { duration: 900, easing: 'ease-out' }); a.onfinish = function () { f.remove() } } catch (e) { f.remove() }
        var ring = el('i', 'kw-ring'); d.appendChild(ring); try { var b = ring.animate([{ scale: .2, opacity: .9 }, { scale: 1.1, opacity: 0 }], { duration: 1100, delay: 650, fill: 'both' }); b.onfinish = function () { ring.remove() } } catch (e) { ring.remove() } } }
      fish() }, rnd(4500, 9000)) })()
    lastMood = mood; wet = wetNow
  }

  // grass gust: a wave of lean runs across the fringe, left to right
  function gust () {
    if (D.hidden) return
    var bl = D.querySelectorAll('.k-fringe i'); if (!bl.length) return
    var n = bl.length
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
    var lv = W.MojoLevels && MojoLevels.byId(s.id), p = s.position
    if (lv && s.running) {
      var k = p.r + ',' + p.c
      if ((lv.grid.map[p.r] || '').charAt(p.c) === '=' && k !== lastBridge) {
        lastBridge = k
        var d = D.querySelector('#decor .dec.k-water[data-rc="' + k + '"]'); if (d) { var ring = el('i', 'kw-ring'); d.appendChild(ring); try { var a = ring.animate([{ scale: .2, opacity: .9 }, { scale: 1.25, opacity: 0 }], { duration: 900 }); a.onfinish = function () { ring.remove() } } catch (e) { ring.remove() } }
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
  W.KeretaWeather = { sky: function () { return SKY }, wx: function () { return WX }, gust: gust }
})(typeof window !== 'undefined' ? window : globalThis)
