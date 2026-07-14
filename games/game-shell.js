/* =============================================================================
 * game-shell.js — window.GameShell (v1.0.0)
 * =============================================================================
 * SHARED HUD + scene "super-engine" for the Dunia Emosi learning games. ONE
 * engine renders the AAA wood-ornate chrome seen across the owner's design
 * mockups (Huruf Hutan / Tebak Gambar / Hitung Binatang / Susun Kata / Jejak
 * Huruf) so every game stays theme-aligned. Games mount it + drive it; gameplay
 * logic stays in the game.
 *
 * Renders (all optional per config):
 *   - Top HUD bar: Home + Back wood buttons · title chip · Level pill · lion
 *     avatar · Pause · coin/score chip · (right) star + COMBO · profile avatar.
 *   - Themed full-bleed backdrop (assets/background/games/<theme>.webp) + soft
 *     drifting motes (CSS, honours prefers-reduced-motion).
 *   - Mascot speech bubble (corner critter emoji/img + rounded bubble; .say()).
 *   - Hint plaque (wood bar, 💡 + text).
 *   - Star-dot / gem progress row.
 *   - Corner hero cheer bubble.
 *   - Candy-button kit (.gs-btn.gs-blue/green/gold/purple) — glossy bevel.
 *
 * API:
 *   var hud = GameShell.mount(hostEl, {
 *     title:'HURUF HUTAN', icon:'🔤', theme:'jungle2', level:1, coin:0,
 *     mascot:{emoji:'🐸'}, hero:{emoji:'🦊'},
 *     onHome:fn, onBack:fn, onPause:fn, onProfile:fn
 *   })
 *   hud.setLevel(n) · setCoin(n) · setScore(n) · setStars(n,max) · setCombo(n)
 *      · say(text[,ms]) · setHint(text) · setProgress(done,total)
 *      · setTheme(name) · heroCheer(text[,ms]) · destroy()
 * ==========================================================================*/
;(function (global) {
  'use strict'
  if (global.GameShell) return

  var REDUCED = (function () {
    try { return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches) } catch (e) { return false }
  })()

  var BASE = (function () {
    try {
      var s = document.currentScript && document.currentScript.src
      if (s) return s.replace(/games\/game-shell\.js.*$/, '')
    } catch (e) {}
    return (location.pathname.indexOf('/games/') >= 0) ? '../' : ''
  })()

  var CSS_ID = 'game-shell-css'
  var CSS = [
    /* fonts assumed loaded by host (Baloo 2 / Fredoka / Nunito) */
    '.gs-root{position:absolute;inset:0;overflow:hidden;font-family:"Baloo 2","Fredoka",system-ui,sans-serif;',
    '-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;color:#fff}',
    /* backdrop */
    '.gs-bg{position:absolute;inset:0;background-size:cover;background-position:center;z-index:0}',
    '.gs-bg::after{content:"";position:absolute;inset:0;background:radial-gradient(120% 80% at 50% 0%,transparent 55%,rgba(10,26,52,.34));pointer-events:none}',
    '.gs-mote{position:absolute;width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.7);',
    'box-shadow:0 0 8px 2px rgba(255,255,255,.5);z-index:1;pointer-events:none;animation:gsFloat linear infinite}',
    '@keyframes gsFloat{0%{transform:translateY(8vh) scale(.7);opacity:0}15%{opacity:.9}85%{opacity:.7}100%{transform:translateY(-88vh) scale(1);opacity:0}}',
    /* top HUD */
    '.gs-hud{position:absolute;top:0;left:0;right:0;z-index:20;display:flex;align-items:center;gap:7px;',
    'padding:max(10px,env(safe-area-inset-top)) 12px 6px;pointer-events:none}',
    '.gs-hud>*{pointer-events:auto}',
    '.gs-wood{background:linear-gradient(180deg,#b9803e,#8a5a26 62%,#6d4318);border:2px solid #ffd98a;',
    'box-shadow:0 4px 0 #4e300f,0 7px 12px rgba(0,0,0,.35),inset 0 2px 0 rgba(255,255,255,.28);color:#fff5df;',
    'text-shadow:0 1px 0 rgba(0,0,0,.4)}',
    '.gs-btn-round{width:44px;height:44px;min-width:44px;border-radius:50%;display:grid;place-items:center;',
    'font-size:20px;cursor:pointer;transition:transform .08s}',
    '.gs-btn-round:active{transform:scale(.9) translateY(2px)}',
    '.gs-title{display:flex;align-items:center;gap:7px;border-radius:16px;padding:6px 14px 6px 8px;font-weight:800;',
    'font-size:clamp(14px,3.4vw,19px);letter-spacing:.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.gs-title .gs-tico{width:26px;height:26px;border-radius:8px;background:rgba(0,0,0,.28);display:grid;place-items:center;font-size:15px;flex-shrink:0}',
    '.gs-pill{border-radius:14px;padding:5px 12px;font-weight:800;font-size:13px;display:flex;align-items:center;gap:5px;white-space:nowrap}',
    '.gs-lion{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;font-size:24px;flex-shrink:0}',
    '.gs-spacer{flex:1;min-width:0}',
    '.gs-combo{display:flex;flex-direction:column;align-items:center;line-height:1;gap:1px;',
    'background:linear-gradient(180deg,#3a2a12cc,#1a1206cc);border:2px solid #ffd98a;border-radius:14px;padding:5px 10px}',
    '.gs-combo b{font-size:18px;color:#ffe07a}.gs-combo small{font-size:8.5px;letter-spacing:1px;color:#ffd98a}',
    '.gs-avatar{width:46px;height:46px;border-radius:50%;border:3px solid #ffd98a;background:#2b1a08 center/cover;flex-shrink:0;cursor:pointer;box-shadow:0 3px 8px rgba(0,0,0,.4)}',
    /* progress star-dots */
    '.gs-prog{position:absolute;left:12px;top:calc(max(10px,env(safe-area-inset-top)) + 52px);z-index:19;',
    'display:flex;align-items:center;gap:6px;background:linear-gradient(180deg,#b9803e,#7a4d1f);border:2px solid #ffd98a;',
    'border-radius:999px;padding:4px 12px 4px 4px;box-shadow:0 3px 0 #4e300f}',
    '.gs-prog .gs-pstar{width:26px;height:26px;border-radius:50%;background:radial-gradient(circle,#ffe07a,#e8a900);display:grid;place-items:center;font-size:15px}',
    '.gs-pdot{width:11px;height:11px;border-radius:50%;background:rgba(0,0,0,.32);box-shadow:inset 0 1px 2px rgba(0,0,0,.4)}',
    '.gs-pdot.on{background:linear-gradient(180deg,#ffe07a,#e8a900);box-shadow:0 0 6px #ffcf3f}',
    /* mascot bubble */
    '.gs-mascot{position:absolute;z-index:18;display:flex;align-items:flex-start;gap:8px;max-width:min(74vw,520px)}',
    '.gs-mascot .gs-crit{font-size:44px;filter:drop-shadow(0 4px 6px rgba(0,0,0,.4));animation:gsBob 2.6s ease-in-out infinite}',
    '.gs-mascot img.gs-crit{width:56px;height:56px;object-fit:contain}',
    '@keyframes gsBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}',
    '.gs-bubble{background:linear-gradient(180deg,#15305e,#0e2044);border:2px solid rgba(255,255,255,.35);',
    'border-radius:16px;padding:10px 14px;font-family:"Nunito",sans-serif;font-weight:700;font-size:14px;line-height:1.3;',
    'color:#fff;box-shadow:0 6px 16px rgba(0,0,0,.35);position:relative}',
    '.gs-bubble::before{content:"";position:absolute;left:-9px;top:16px;border:7px solid transparent;border-right-color:#15305e}',
    /* hint plaque */
    '.gs-hint{display:inline-flex;align-items:center;gap:9px;background:linear-gradient(180deg,#3a2a12ee,#1a1206ee);',
    'border:2px solid rgba(255,217,138,.5);border-radius:16px;padding:8px 16px;font-family:"Nunito",sans-serif;',
    'font-weight:800;font-size:13.5px;line-height:1.28;color:#ffe8bd;box-shadow:0 4px 12px rgba(0,0,0,.3)}',
    '.gs-hint .gs-hi{font-size:18px}',
    /* hero cheer */
    '.gs-hero{position:absolute;right:8px;bottom:8px;z-index:18;display:flex;align-items:flex-end;gap:6px}',
    '.gs-hero .gs-hchar{font-size:52px;filter:drop-shadow(0 4px 7px rgba(0,0,0,.45))}',
    '.gs-hero img.gs-hchar{width:70px;height:88px;object-fit:contain}',
    '.gs-hcheer{background:linear-gradient(180deg,#3a2a12,#241708);border:2px solid #ffd98a;border-radius:14px;',
    'padding:6px 11px;font-weight:800;font-size:12px;color:#ffe07a;text-align:center;line-height:1.2;box-shadow:0 4px 10px rgba(0,0,0,.4)}',
    /* candy button kit */
    '.gs-btn{border:none;border-radius:20px;padding:16px 10px;font-family:"Baloo 2","Fredoka",sans-serif;font-weight:800;',
    'font-size:clamp(20px,5vw,30px);color:#fff;cursor:pointer;position:relative;min-height:56px;',
    '-webkit-tap-highlight-color:transparent;transition:transform .08s,filter .08s;text-shadow:0 2px 2px rgba(0,0,0,.28);',
    'box-shadow:0 6px 0 rgba(0,0,0,.28),0 9px 16px rgba(0,0,0,.28),inset 0 3px 0 rgba(255,255,255,.35);border:2px solid rgba(255,255,255,.5)}',
    '.gs-btn:active{transform:translateY(4px) scale(.98);filter:brightness(1.06);box-shadow:0 2px 0 rgba(0,0,0,.28)}',
    '.gs-blue{background:linear-gradient(180deg,#8cc4ff,#2f6bd8 62%,#1e4fa8)}',
    '.gs-green{background:linear-gradient(180deg,#a4e07a,#4caf50 60%,#2f8f43)}',
    '.gs-gold{background:linear-gradient(180deg,#ffe07a,#ffcf3f 60%,#e8a900);color:#5a3d00;text-shadow:0 1px 0 rgba(255,255,255,.4)}',
    '.gs-purple{background:linear-gradient(180deg,#c3a6ef,#7b53c9 60%,#5b39a0)}',
    '.gs-btn.gs-correct{animation:gsPop .4s cubic-bezier(.34,1.56,.64,1)}',
    '.gs-btn.gs-wrong{animation:gsShake .4s ease}',
    '@keyframes gsPop{0%{transform:scale(1)}50%{transform:scale(1.14)}100%{transform:scale(1)}}',
    '@keyframes gsShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}50%{transform:translateX(8px)}80%{transform:translateX(-5px)}}',
    /* landscape compaction */
    '@media (orientation:landscape) and (max-height:520px){',
    '.gs-btn-round{width:38px;height:38px;min-width:38px;font-size:17px}.gs-lion{width:38px;height:38px;font-size:20px}',
    '.gs-avatar{width:38px;height:38px}.gs-mascot .gs-crit{font-size:34px}.gs-hero .gs-hchar{font-size:40px}',
    '}'
  ].join('')

  function injectCSS () {
    if (typeof document === 'undefined' || document.getElementById(CSS_ID)) return
    var s = document.createElement('style'); s.id = CSS_ID; s.textContent = CSS
    ;(document.head || document.documentElement).appendChild(s)
  }

  function el (tag, cls, html) {
    var d = document.createElement(tag)
    if (cls) d.className = cls
    if (html != null) d.innerHTML = html
    return d
  }
  function esc (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] }) }

  var THEME_BG = {
    jungle2: 'jungle2', sky: 'calmsky2', calmsky2: 'calmsky2', city: 'cityroad2',
    cityroad2: 'cityroad2', lab: 'lab-space', space: 'lab-space', garden: 'match-garden', match: 'match-garden'
  }

  function mount (host, cfg) {
    injectCSS()
    cfg = cfg || {}
    if (typeof host === 'string') host = document.getElementById(host) || document.querySelector(host)
    if (!host) return null
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative'

    var root = el('div', 'gs-root')

    // backdrop + motes
    var bg = el('div', 'gs-bg')
    root.appendChild(bg)
    if (!REDUCED) {
      for (var i = 0; i < 9; i++) {
        var m = el('div', 'gs-mote')
        m.style.left = (6 + Math.floor((i * 97) % 88)) + '%'
        m.style.animationDuration = (7 + (i % 5) * 1.6) + 's'
        m.style.animationDelay = (-(i * 1.3)) + 's'
        m.style.opacity = 0.5 + (i % 3) * 0.15
        root.appendChild(m)
      }
    }

    // top HUD
    var hud = el('div', 'gs-hud')
    var bHome = el('button', 'gs-wood gs-btn-round', '⌂'); bHome.title = 'Beranda'
    var bBack = el('button', 'gs-wood gs-btn-round', '◀'); bBack.title = 'Kembali'
    var title = el('div', 'gs-wood gs-title', '<span class="gs-tico">' + esc(cfg.icon || '🎮') + '</span><span class="gs-tname">' + esc(cfg.title || 'GAME') + '</span>')
    var lvl = el('div', 'gs-wood gs-pill gs-lvl', 'LV.' + (cfg.level || 1))
    var lion = el('div', 'gs-wood gs-lion', '🦁')
    var bPause = el('button', 'gs-wood gs-btn-round', '⏸'); bPause.title = 'Jeda'
    var coin = el('div', 'gs-wood gs-pill gs-coin', '🪙 <b class="gs-coinv">' + (cfg.coin || 0) + '</b>')
    var spacer = el('div', 'gs-spacer')
    var combo = el('div', 'gs-combo', '<b class="gs-comv">0</b><small>COMBO</small>')
    var avatar = el('div', 'gs-avatar')
    if (cfg.avatar) avatar.style.backgroundImage = 'url(' + cfg.avatar + ')'
    else avatar.innerHTML = '<div style="display:grid;place-items:center;height:100%;font-size:22px">🧒</div>'

    hud.appendChild(bHome); hud.appendChild(bBack); hud.appendChild(title)
    hud.appendChild(lvl); hud.appendChild(lion); hud.appendChild(bPause); hud.appendChild(coin)
    hud.appendChild(spacer); hud.appendChild(combo); hud.appendChild(avatar)
    root.appendChild(hud)

    // progress
    var prog = el('div', 'gs-prog'); prog.style.display = 'none'
    prog.appendChild(el('div', 'gs-pstar', '⭐'))
    var dotsWrap = el('div', 'gs-pdots'); dotsWrap.style.display = 'flex'; dotsWrap.style.gap = '6px'
    prog.appendChild(dotsWrap)
    root.appendChild(prog)

    // mascot bubble
    var mascot = el('div', 'gs-mascot'); mascot.style.display = 'none'
    mascot.style.left = '6%'; mascot.style.top = '20%'
    var critHtml = cfg.mascot && cfg.mascot.img
      ? '<img class="gs-crit" src="' + cfg.mascot.img + '" alt="">'
      : '<span class="gs-crit">' + esc((cfg.mascot && cfg.mascot.emoji) || '🐸') + '</span>'
    mascot.innerHTML = critHtml + '<div class="gs-bubble"></div>'
    root.appendChild(mascot)
    var bubbleEl = mascot.querySelector('.gs-bubble')

    // hero cheer
    var hero = el('div', 'gs-hero'); hero.style.display = 'none'
    var hcharHtml = cfg.hero && cfg.hero.img
      ? '<img class="gs-hchar" src="' + cfg.hero.img + '" alt="">'
      : '<span class="gs-hchar">' + esc((cfg.hero && cfg.hero.emoji) || '🦊') + '</span>'
    hero.innerHTML = '<div class="gs-hcheer"></div>' + hcharHtml
    root.appendChild(hero)
    var cheerEl = hero.querySelector('.gs-hcheer')

    host.appendChild(root)

    function setTheme (name) {
      var f = THEME_BG[name] || name
      if (f) bg.style.backgroundImage = 'url(' + BASE + 'assets/background/games/' + f + '.webp)'
    }
    setTheme(cfg.theme || 'jungle2')

    bHome.onclick = function () { if (cfg.onHome) cfg.onHome() }
    bBack.onclick = function () { if (cfg.onBack) cfg.onBack() }
    bPause.onclick = function () { if (cfg.onPause) cfg.onPause() }
    avatar.onclick = function () { if (cfg.onProfile) cfg.onProfile() }

    var sayTO
    var api = {
      root: root, bgEl: bg,
      setLevel: function (n) { lvl.textContent = 'LV.' + n; return api },
      setCoin: function (n) { var v = coin.querySelector('.gs-coinv'); if (v) v.textContent = n; return api },
      setScore: function (n) { return api.setCoin(n) },
      setCombo: function (n) { var v = combo.querySelector('.gs-comv'); if (v) v.textContent = n; combo.style.visibility = (n > 0 ? 'visible' : 'hidden'); return api },
      setStars: function (n) { return api },
      setProgress: function (done, total) {
        prog.style.display = total ? 'flex' : 'none'
        if (!total) return api
        dotsWrap.innerHTML = ''
        for (var i = 0; i < total; i++) { var d = el('div', 'gs-pdot' + (i < done ? ' on' : '')); dotsWrap.appendChild(d) }
        return api
      },
      say: function (text, ms) {
        if (!text) { mascot.style.display = 'none'; return api }
        mascot.style.display = 'flex'; bubbleEl.innerHTML = esc(text).replace(/\n/g, '<br>')
        clearTimeout(sayTO)
        if (ms) sayTO = setTimeout(function () { mascot.style.display = 'none' }, ms)
        return api
      },
      setHint: function () { return api }, // hints are placed by the game in its own layout slot
      hintHtml: function (text) { return '<div class="gs-hint"><span class="gs-hi">💡</span><span>' + esc(text) + '</span></div>' },
      heroCheer: function (text, ms) {
        hero.style.display = text ? 'flex' : 'none'
        if (text) cheerEl.innerHTML = esc(text).replace(/\n/g, '<br>')
        if (ms && text) setTimeout(function () { hero.style.display = 'none' }, ms)
        return api
      },
      setMascotPos: function (leftPct, topPct) { mascot.style.left = leftPct; mascot.style.top = topPct; return api },
      setTheme: setTheme,
      destroy: function () { try { host.removeChild(root) } catch (e) {} }
    }
    api.setCombo(0)
    return api
  }

  global.GameShell = { mount: mount, version: '1.0.0', BASE: BASE }
})(typeof window !== 'undefined' ? window : this)
