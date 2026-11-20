// ================================================================
// games/hub/g10-weather.js — cut from game.js (v64.72, PRD-44) when G10's weather stopped being only a look.
// A classic script after game.js (same global scope, same cache token); index.html loads it and sw.js precaches it.
// tools/qa-hub-split.mjs keeps the order and the token.
// ================================================================
// ── Battle Arena Weather FX ──
const G10_WEATHERS = ['clear','clear','clear','snow','snow','rain','rain','wind','night','leaves']
// PRD-44: each weather makes one or two types stronger (x1.2). Damage is a whole number (max(1, round(1.25 x type x
// weather))), so only a boost changes a hit: a neutral hit of the boosted type goes from 1 to 2. Nothing is ever made
// weaker, so a weather can never turn a battle against the child by itself (an enemy hit costs 1 HP whatever its type). Announced at battle start with the
// type's own colour pill (no emoji).
const G10_WEATHER_BOOST = {
  clear: ['fire'], rain: ['water', 'electric'], snow: ['ice'], wind: ['flying'], night: ['dark', 'ghost'], leaves: ['grass', 'bug']
}
const G10_WEATHER_NAME = { clear: 'Cerah', rain: 'Hujan', snow: 'Salju', wind: 'Berangin', night: 'Malam', leaves: 'Daun berguguran' }
function g10WeatherMult(type) {
  try {
    const w = (typeof g10State !== 'undefined' && g10State && g10State.weather) || 'clear'
    return (G10_WEATHER_BOOST[w] || []).indexOf(String(type || '').toLowerCase()) >= 0 ? 1.2 : 1
  } catch (_) { return 1 }
}
function g10WeatherBanner(type) {
  const field = document.getElementById('g10-field') || document.getElementById('screen-game10')
  if (!field) return
  const old = document.getElementById('g10-wx-banner'); if (old) old.remove()
  const types = G10_WEATHER_BOOST[type] || []
  const pill = t => `<span class="g10-wx-pill" style="background:${(window.TYPE_COLOR && TYPE_COLOR[t]) || '#9ca3af'}">${(window.TYPE_LABEL_ID && TYPE_LABEL_ID[t]) || t}</span>`
  const el = document.createElement('div'); el.id = 'g10-wx-banner'
  el.innerHTML = `<span class="g10-wx-name">${G10_WEATHER_NAME[type] || type}</span><span class="g10-wx-up" aria-hidden="true">\u25B2</span>${types.map(pill).join('')}`
  el.setAttribute('aria-label', `${G10_WEATHER_NAME[type] || type}: tipe ${types.map(t => (window.TYPE_LABEL_ID && TYPE_LABEL_ID[t]) || t).join(' dan ')} lebih kuat`)
  field.appendChild(el)
  setTimeout(() => { el.classList.add('g10-wx-small') }, 2600)
}
;(function () {
  if (document.getElementById('g10-wx-css')) return
  const st = document.createElement('style'); st.id = 'g10-wx-css'
  st.textContent = '#g10-wx-banner{position:absolute;left:50%;top:12%;transform:translateX(-50%);z-index:30;display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:999px;background:rgba(15,23,42,.82);color:#fff;font-weight:900;font-size:clamp(14px,3.6vw,18px);box-shadow:0 6px 18px rgba(0,0,0,.3);pointer-events:none;transition:transform .45s cubic-bezier(.2,.8,.2,1),top .45s cubic-bezier(.2,.8,.2,1),font-size .45s}' +
    '#g10-wx-banner.g10-wx-small{top:2%;transform:translateX(-50%) scale(.78)}' +
    '.g10-wx-pill{padding:3px 10px;border-radius:999px;color:#111827;font-weight:900}.g10-wx-up{color:#4ade80}' +
    '@media (prefers-reduced-motion: reduce){#g10-wx-banner{transition:none}}'
  document.head.appendChild(st)
})()
function applyG10Weather() {
  const type = G10_WEATHERS[Math.floor(Math.random() * G10_WEATHERS.length)]
  try { if (typeof g10State !== 'undefined' && g10State) g10State.weather = type } catch (_) {}
  g10WeatherBanner(type)
  g10DrawWeather(type)
}
function g10DrawWeather(type) {
  // Pixi weather primary
  const pixiApp = PixiManager.get('g10-pixi-canvas')
  if (pixiApp) {
    pixiWeather(pixiApp, type)
    return
  }
  // DOM weather fallback
  const field = document.getElementById('g10-field')
  if (!field) return
  const old = field.querySelector('.g10-weather')
  if (old) old.remove()
  if (type === 'clear') return
  const layer = document.createElement('div')
  layer.className = `g10-weather g10-wx-${type}`
  if (type === 'snow') {
    for (let i = 0; i < 18; i++) {
      const s = document.createElement('span'); s.className = 'g10-snow-flake'
      s.style.cssText = `left:${Math.random()*100}%;animation-delay:${(Math.random()*5).toFixed(1)}s;animation-duration:${(2.5+Math.random()*3).toFixed(1)}s;font-size:${7+Math.floor(Math.random()*9)}px;opacity:${(0.35+Math.random()*0.5).toFixed(2)}`
      s.textContent = '❄'; layer.appendChild(s)
    }
  } else if (type === 'rain') {
    for (let i = 0; i < 22; i++) {
      const r = document.createElement('span'); r.className = 'g10-rain-drop'
      r.style.cssText = `left:${(Math.random()*110-5).toFixed(1)}%;animation-delay:${(Math.random()*1.5).toFixed(2)}s;animation-duration:${(0.55+Math.random()*0.45).toFixed(2)}s;height:${12+Math.floor(Math.random()*18)}px;opacity:${(0.25+Math.random()*0.3).toFixed(2)}`
      layer.appendChild(r)
    }
  } else if (type === 'wind') {
    for (let i = 0; i < 10; i++) {
      const w = document.createElement('span'); w.className = 'g10-wind-streak'
      w.style.cssText = `top:${(Math.random()*90).toFixed(1)}%;animation-delay:${(Math.random()*2).toFixed(1)}s;animation-duration:${(0.9+Math.random()*0.9).toFixed(1)}s;width:${18+Math.floor(Math.random()*40)}px`
      layer.appendChild(w)
    }
  } else if (type === 'night') {
    for (let i = 0; i < 14; i++) {
      const star = document.createElement('span'); star.className = 'g10-night-star'
      star.style.cssText = `left:${(Math.random()*95).toFixed(1)}%;top:${(Math.random()*55).toFixed(1)}%;animation-delay:${(Math.random()*2.5).toFixed(1)}s;animation-duration:${(1.5+Math.random()*2).toFixed(1)}s;font-size:${5+Math.floor(Math.random()*8)}px`
      star.textContent = '✦'; layer.appendChild(star)
    }
  } else if (type === 'leaves') {
    const leafSet = ['🍂','🍃','🍁']
    for (let i = 0; i < 14; i++) {
      const l = document.createElement('span'); l.className = 'g10-leaf-fx'
      l.style.cssText = `left:${(Math.random()*95).toFixed(1)}%;animation-delay:${(Math.random()*6).toFixed(1)}s;animation-duration:${(3.5+Math.random()*3.5).toFixed(1)}s;font-size:${9+Math.floor(Math.random()*9)}px;opacity:${(0.45+Math.random()*0.45).toFixed(2)}`
      l.textContent = leafSet[Math.floor(Math.random()*3)]; layer.appendChild(l)
    }
  }
  field.appendChild(layer)
}
