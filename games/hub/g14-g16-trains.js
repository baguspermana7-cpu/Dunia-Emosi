// ============================================================
// GAME 14 — BALAPAN KERETA 🏁
// ============================================================

// Inline SVG steam locomotive builder — used for animated train in G14 + G17
// v55.70 B-273 — shared loco-wheel renderer. Returns an SVG <g> with a rim, hub,
// and SPOKES (so rotation is VISIBLE on a plain wheel) and, when animated, an
// inline `transform-origin` in viewBox units so the wheel spins on its OWN axle
// on every browser. The old bare-<circle> wheels relied on `transform-box:fill-box`
// which the owner's tablet webview ignores → they orbited the viewBox centre
// ("revolution mutar tanpa poros"). This fixes both: spokes + correct origin.
function dunWheel(cx, cy, r, wc, opts = {}) {
  const { animate = true, rim = '#bbb', rimW = 2, hub = '#cfcfcf', spoke = 'rgba(232,232,238,0.66)' } = opts
  const cls = animate ? ' class="dun-wheel-spin"' : ''
  const sty = animate ? ` style="transform-origin:${cx}px ${cy}px"` : ''
  const hubR = Math.max(2, r * 0.34)
  const sw = Math.max(1, r * 0.13)
  let spokes = ''
  for (let i = 0; i < 3; i++) {           // 3 diameters = 6-spoke cue
    const a = (i * Math.PI) / 3
    const dx = Math.cos(a) * (r - rimW), dy = Math.sin(a) * (r - rimW)
    spokes += `<line x1="${(cx - dx).toFixed(1)}" y1="${(cy - dy).toFixed(1)}" x2="${(cx + dx).toFixed(1)}" y2="${(cy + dy).toFixed(1)}" stroke="${spoke}" stroke-width="${sw.toFixed(1)}" stroke-linecap="round"/>`
  }
  return `<g${cls}${sty}>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${wc}" stroke="${rim}" stroke-width="${rimW}"/>` +
    spokes +
    `<circle cx="${cx}" cy="${cy}" r="${hubR.toFixed(1)}" fill="${hub}"/>` +
    `</g>`
}

function buildSteamLocoSVG(cfg, opts = {}) {
  const { animate = true, width = 148, height = 64 } = opts
  const bc  = cfg.bodyColor  || '#1a1a2e'
  const wc  = cfg.wheelColor || '#111130'
  const wa  = animate ? ' class="train-wheel"' : ''
  const hasTender = cfg.tender !== false

  const smokeHtml = animate ? `
    <circle class="train-smoke" cx="50" cy="6"   r="8"   fill="rgba(200,200,200,0.88)" style="animation-delay:0s"/>
    <circle class="train-smoke" cx="44" cy="0"   r="6"   fill="rgba(215,215,215,0.70)" style="animation-delay:0.20s"/>
    <circle class="train-smoke" cx="58" cy="-2"  r="7"   fill="rgba(185,185,185,0.60)" style="animation-delay:0.40s"/>
    <circle class="train-smoke" cx="37" cy="-6"  r="5"   fill="rgba(220,220,220,0.45)" style="animation-delay:0.60s"/>
    <circle class="train-smoke" cx="65" cy="-8"  r="6.5" fill="rgba(175,175,175,0.35)" style="animation-delay:0.80s"/>
    <circle class="train-smoke" cx="52" cy="-12" r="4.5" fill="rgba(205,205,205,0.25)" style="animation-delay:1.0s"/>` : ''

  const tenderHtml = hasTender ? `
    <rect x="140" y="32" width="48" height="26" rx="5" fill="${bc}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    <rect x="142" y="28" width="44" height="10" rx="3" fill="${wc}"/>
    <ellipse cx="164" cy="28" rx="20" ry="5.5" fill="#1a1a1a"/>
    <rect x="186" y="46" width="12" height="5" rx="2.5" fill="#777"/>
    ${dunWheel(153, 61, 9, wc, { animate, rim: '#aaa', rimW: 1.5 })}
    ${dunWheel(171, 61, 9, wc, { animate, rim: '#aaa', rimW: 1.5 })}` : ''

  const rackHtml = cfg.rack ? `
    <rect x="32" y="65" width="90" height="5" rx="2" fill="#666" opacity="0.8"/>
    <rect x="37"  y="65" width="3" height="8" rx="1" fill="#999"/>
    <rect x="48"  y="65" width="3" height="8" rx="1" fill="#999"/>
    <rect x="59"  y="65" width="3" height="8" rx="1" fill="#999"/>
    <rect x="70"  y="65" width="3" height="8" rx="1" fill="#999"/>
    <rect x="81"  y="65" width="3" height="8" rx="1" fill="#999"/>
    <rect x="92"  y="65" width="3" height="8" rx="1" fill="#999"/>
    <rect x="103" y="65" width="3" height="8" rx="1" fill="#999"/>` : ''

  const totalW = hasTender ? 200 : 148
  return `<svg viewBox="0 0 ${totalW} 74" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="${hasTender ? 96 : 72}" cy="72" rx="${hasTender ? 84 : 66}" ry="4" fill="rgba(0,0,0,0.22)"/>
  ${tenderHtml}
  <rect x="18" y="44" width="${hasTender ? 126 : 114}" height="7" rx="3" fill="${wc}"/>
  <rect x="22" y="24" width="${hasTender ? 118 : 106}" height="28" rx="11" fill="${bc}"/>
  <rect x="26" y="26" width="${hasTender ? 110 : 98}"  height="9"  rx="5"  fill="rgba(255,255,255,0.09)"/>
  <ellipse cx="24" cy="38" rx="11" ry="15" fill="${bc}"/>
  <ellipse cx="22" cy="38" rx="7.5" ry="11" fill="${wc}" opacity="0.55"/>
  <circle cx="18" cy="32" r="6.5" fill="#FFD166" opacity="0.92"/>
  <circle cx="18" cy="32" r="4"   fill="white"   opacity="0.85"/>
  <rect x="${hasTender ? 120 : 108}" y="12" width="26" height="40" rx="5" fill="${wc}"/>
  <rect x="${hasTender ? 117 : 105}" y="10" width="32" height="7"  rx="3" fill="${bc}"/>
  <rect x="${hasTender ? 124 : 112}" y="17" width="15" height="13" rx="3" fill="#87CEEB" opacity="0.88"/>
  <rect x="42" y="7"  width="11" height="19" rx="3" fill="${wc}"/>
  <rect x="38" y="5"  width="19" height="7"  rx="3" fill="${wc}"/>
  ${smokeHtml}
  <ellipse cx="80" cy="23" rx="15" ry="8" fill="${wc}"/>
  <ellipse cx="${hasTender ? 106 : 94}" cy="23" rx="9" ry="6" fill="${wc}"/>
  <rect    cx="${hasTender ? 109 : 97}" y="19" width="4" height="9" rx="2" fill="#999"/>
  ${dunWheel(36, 60, 9, wc, { animate, rim: '#999', rimW: 1.5 })}
  ${dunWheel(60, 58, 14, wc, { animate, rim: '#bbb', rimW: 2 })}
  ${dunWheel(86, 58, 14, wc, { animate, rim: '#bbb', rimW: 2 })}
  ${dunWheel(112, 58, 14, wc, { animate, rim: '#bbb', rimW: 2 })}
  <rect x="60" y="56" width="52" height="4" rx="2" fill="#888"/>
  <rect x="18" y="54" width="46" height="5" rx="2.5" fill="#666"/>
  <!-- Contrasting body stripe for visibility -->
  <rect x="22" y="36" width="${hasTender ? 116 : 104}" height="4" rx="2" fill="${cfg.stripeColor || '#FFD166'}" opacity="0.80"/>
  ${rackHtml}
</svg>`
}

// Modern/electric train inline SVG (for header icon display)
// Task #81 (2026-04-26): Removed buildModernTrainSVG (dead code, never invoked).
// Replaced by `buildDieselLocoSVG` for all train rendering paths.

// Inline SVG diesel locomotive builder
function buildDieselLocoSVG(cfg, opts = {}) {
  const { animate = true, width = 148, height = 64 } = opts
  const bc = cfg.bodyColor  || '#1B5E20'
  const ac = cfg.accentColor || '#FFD166'
  const wa = animate ? ' class="train-wheel"' : ''
  const dieselSmokeHtml = animate ? `
    <circle class="diesel-smoke" cx="88" cy="13" r="7"   fill="rgba(20,20,20,0.92)" style="animation-delay:0s"/>
    <circle class="diesel-smoke" cx="80" cy="8"  r="5.5" fill="rgba(30,30,30,0.78)" style="animation-delay:0.18s"/>
    <circle class="diesel-smoke" cx="96" cy="5"  r="6.5" fill="rgba(10,10,10,0.65)" style="animation-delay:0.36s"/>
    <circle class="diesel-smoke" cx="74" cy="0"  r="4.5" fill="rgba(40,40,40,0.50)" style="animation-delay:0.54s"/>
    <circle class="diesel-smoke" cx="100" cy="-2" r="5" fill="rgba(15,15,15,0.38)" style="animation-delay:0.72s"/>` : ''
  return `<svg viewBox="0 0 200 72" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="100" cy="70" rx="88" ry="4" fill="rgba(0,0,0,0.22)"/>
  <rect x="10"  y="32" width="120" height="28" rx="5"   fill="${bc}"/>
  <rect x="10"  y="30" width="120" height="8"  rx="3"   fill="rgba(255,255,255,0.1)"/>
  <rect x="130" y="18" width="52"  height="42" rx="7"   fill="${bc}"/>
  <rect x="128" y="15" width="56"  height="9"  rx="4"   fill="${ac}" opacity="0.88"/>
  <rect x="136" y="24" width="38"  height="22" rx="4"   fill="rgba(135,206,235,0.88)"/>
  <circle cx="14" cy="40" r="5.5" fill="#FFD166" opacity="0.9"/>
  <circle cx="14" cy="40" r="3.5" fill="white"   opacity="0.85"/>
  <rect x="22"  y="34" width="3"  height="20" rx="1.5" fill="rgba(0,0,0,0.28)"/>
  <rect x="30"  y="34" width="3"  height="20" rx="1.5" fill="rgba(0,0,0,0.28)"/>
  <rect x="38"  y="34" width="3"  height="20" rx="1.5" fill="rgba(0,0,0,0.28)"/>
  <rect x="46"  y="34" width="3"  height="20" rx="1.5" fill="rgba(0,0,0,0.28)"/>
  <rect x="10"  y="44" width="120" height="5" rx="2"   fill="${ac}" opacity="0.65"/>
  <rect x="84"  y="20" width="8"  height="16" rx="3"   fill="#333"/>
  <rect x="80"  y="16" width="16" height="7"  rx="3"   fill="#555"/>
  ${dieselSmokeHtml}
  ${dunWheel(38, 62, 9, '#2a2a2a', { animate, rim: '#888', rimW: 1.5 })}
  ${dunWheel(64, 62, 9, '#2a2a2a', { animate, rim: '#888', rimW: 1.5 })}
  ${dunWheel(90, 62, 9, '#2a2a2a', { animate, rim: '#888', rimW: 1.5 })}
  ${dunWheel(152, 62, 9, '#2a2a2a', { animate, rim: '#888', rimW: 1.5 })}
  ${dunWheel(176, 62, 9, '#2a2a2a', { animate, rim: '#888', rimW: 1.5 })}
  <rect x="10" y="56" width="168" height="5" rx="2.5" fill="rgba(0,0,0,0.3)"/>
</svg>`
}

// Inline SVG electric/bullet train builder
function buildElectricLocoSVG(cfg, opts = {}) {
  const { animate = true, width = 148, height = 64 } = opts
  const bc = cfg.bodyColor  || '#1a1a6b'
  const ac = cfg.accentColor || '#00b4d8'
  const wa = animate ? ' class="train-wheel"' : ''
  const sparkHtml = animate ? `
    <polyline class="elec-spark"  points="25,6  18,1  26,4  19,-1" fill="none" stroke="#00f5ff" stroke-width="1.8" stroke-linecap="round"/>
    <polyline class="elec-spark2" points="25,7  30,2  24,5  31,0"  fill="none" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round"/>
    <circle class="elec-spark"  cx="20" cy="-1" r="2" fill="#00f5ff" opacity="0.9"/>
    <circle class="elec-spark2" cx="31" cy="0"  r="1.5" fill="#ffffff" opacity="0.7"/>
    <polyline class="elec-spark"  points="23,7  17,3  25,5" fill="none" stroke="${ac}" stroke-width="1.5" stroke-linecap="round"/>` : ''
  return `<svg viewBox="0 0 220 64" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="110" cy="62" rx="96" ry="4" fill="rgba(0,0,0,0.2)"/>
  <polygon points="10,52 2,38 2,22 10,12" fill="${bc}"/>
  <rect x="10"  y="12" width="185" height="40" rx="6"  fill="${bc}"/>
  <rect x="10"  y="12" width="185" height="12" rx="6"  fill="rgba(255,255,255,0.13)"/>
  <rect x="195" y="12" width="20"  height="40" rx="6"  fill="${bc}"/>
  <rect x="10"  y="32" width="185" height="5"  rx="2"  fill="${ac}" opacity="0.75"/>
  <circle cx="5"  cy="28" r="5.5" fill="#FFD166" opacity="0.92"/>
  <rect x="24"  y="18" width="30" height="18" rx="4"   fill="rgba(135,206,235,0.88)"/>
  <rect x="68"  y="18" width="30" height="18" rx="4"   fill="rgba(135,206,235,0.88)"/>
  <rect x="118" y="18" width="30" height="18" rx="4"   fill="rgba(135,206,235,0.88)"/>
  <rect x="160" y="18" width="25" height="18" rx="4"   fill="rgba(135,206,235,0.88)"/>
  <rect x="8"   y="8"  width="40" height="5"  rx="2.5" fill="#555"/>
  <rect x="20"  y="5"  width="15" height="5"  rx="2"   fill="#777"/>
  ${sparkHtml}
  ${dunWheel(44, 54, 8, '#222', {animate, rim:'#999', rimW:1.5, hub:'#aaa'})}
  ${dunWheel(84, 54, 8, '#222', {animate, rim:'#999', rimW:1.5, hub:'#aaa'})}
  ${dunWheel(128, 54, 8, '#222', {animate, rim:'#999', rimW:1.5, hub:'#aaa'})}
  ${dunWheel(170, 54, 8, '#222', {animate, rim:'#999', rimW:1.5, hub:'#aaa'})}
</svg>`
}

// ===== HOOD DIESEL (CC201, CC203 — Indonesian GE/EMD hood unit, C-C bogies) =====
function buildHoodDieselSVG(cfg, opts = {}) {
  const { animate = true, width = 148, height = 64 } = opts
  const bc = cfg.bodyColor || '#1B5E20'
  const ac = cfg.accentColor || '#FFD166'
  const wa = animate ? ' class="train-wheel"' : ''
  const smk = animate ? `
    <circle class="diesel-smoke" cx="68" cy="10" r="7"   fill="rgba(16,16,16,0.92)" style="animation-delay:0s"/>
    <circle class="diesel-smoke" cx="60" cy="5"  r="5.5" fill="rgba(24,24,24,0.76)" style="animation-delay:0.2s"/>
    <circle class="diesel-smoke" cx="76" cy="3"  r="6"   fill="rgba(8,8,8,0.62)"    style="animation-delay:0.4s"/>
    <circle class="diesel-smoke" cx="54" cy="-1" r="4.5" fill="rgba(30,30,30,0.48)" style="animation-delay:0.6s"/>` : ''
  return `<svg viewBox="0 0 215 72" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="107" cy="70" rx="92" ry="4" fill="rgba(0,0,0,0.25)"/>
  <rect x="8" y="45" width="199" height="11" rx="3" fill="#0d0d0d"/>
  <!-- Long hood (machinery section) -->
  <rect x="62" y="20" width="140" height="33" rx="5" fill="${bc}"/>
  <!-- Hood grille vents -->
  <rect x="76"  y="25" width="3" height="22" rx="1" fill="rgba(0,0,0,0.42)"/>
  <rect x="86"  y="25" width="3" height="22" rx="1" fill="rgba(0,0,0,0.42)"/>
  <rect x="96"  y="25" width="3" height="22" rx="1" fill="rgba(0,0,0,0.42)"/>
  <rect x="106" y="25" width="3" height="22" rx="1" fill="rgba(0,0,0,0.42)"/>
  <rect x="116" y="25" width="3" height="22" rx="1" fill="rgba(0,0,0,0.42)"/>
  <rect x="128" y="25" width="3" height="22" rx="1" fill="rgba(0,0,0,0.42)"/>
  <rect x="138" y="25" width="3" height="22" rx="1" fill="rgba(0,0,0,0.42)"/>
  <rect x="150" y="25" width="3" height="22" rx="1" fill="rgba(0,0,0,0.42)"/>
  <rect x="160" y="25" width="3" height="22" rx="1" fill="rgba(0,0,0,0.42)"/>
  <rect x="170" y="25" width="3" height="22" rx="1" fill="rgba(0,0,0,0.42)"/>
  <rect x="180" y="25" width="3" height="22" rx="1" fill="rgba(0,0,0,0.42)"/>
  <!-- Exhaust stack -->
  <rect x="68" y="10" width="10" height="12" rx="3" fill="#222"/>
  <rect x="65" y="7"  width="16" height="6"  rx="2" fill="#333"/>
  ${smk}
  <!-- Hood accent stripe -->
  <rect x="62" y="40" width="140" height="4" rx="2" fill="${ac}" opacity="0.88"/>
  <!-- Short walkway -->
  <rect x="36" y="26" width="28" height="27" rx="3" fill="${bc}" opacity="0.82"/>
  <!-- Cab (front, left) -->
  <rect x="8"  y="15" width="32" height="38" rx="5" fill="${bc}"/>
  <rect x="6"  y="13" width="36" height="9"  rx="3" fill="${ac}" opacity="0.92"/>
  <rect x="12" y="21" width="11" height="15" rx="3" fill="rgba(135,206,235,0.92)"/>
  <rect x="26" y="21" width="10" height="15" rx="3" fill="rgba(135,206,235,0.92)"/>
  <circle cx="10" cy="40" r="6.5" fill="#FFD166" opacity="0.95"/>
  <circle cx="10" cy="40" r="3.8" fill="white"   opacity="0.9"/>
  <rect x="13" y="37" width="22" height="7" rx="2" fill="rgba(0,0,0,0.55)"/>
  <!-- Couplers -->
  <rect x="2"   y="46" width="9" height="8" rx="2" fill="#555"/>
  <rect x="204" y="46" width="9" height="8" rx="2" fill="#555"/>
  <!-- C bogie 1 (3 axles) -->
  <rect x="10" y="56" width="78" height="10" rx="4" fill="#181818" stroke="#555" stroke-width="1"/>
  ${dunWheel(22, 63, 7, '#282828', {animate, rim:'#888', rimW:1.5, hub:'#aaa'})}
  ${dunWheel(42, 63, 7, '#282828', {animate, rim:'#888', rimW:1.5, hub:'#aaa'})}
  ${dunWheel(62, 63, 7, '#282828', {animate, rim:'#888', rimW:1.5, hub:'#aaa'})}
  <!-- C bogie 2 (3 axles) -->
  <rect x="125" y="56" width="78" height="10" rx="4" fill="#181818" stroke="#555" stroke-width="1"/>
  ${dunWheel(137, 63, 7, '#282828', {animate, rim:'#888', rimW:1.5, hub:'#aaa'})}
  ${dunWheel(157, 63, 7, '#282828', {animate, rim:'#888', rimW:1.5, hub:'#aaa'})}
  ${dunWheel(177, 63, 7, '#282828', {animate, rim:'#888', rimW:1.5, hub:'#aaa'})}
  <rect x="80" y="52" width="42" height="8" rx="3" fill="#080808"/>
</svg>`
}

// ===== DUAL-CAB DIESEL (CC206 — cabs at both ends, C-C bogies) =====
function buildDualCabSVG(cfg, opts = {}) {
  const { animate = true, width = 148, height = 64 } = opts
  const bc = cfg.bodyColor || '#1a2a4a'
  const ac = cfg.accentColor || '#ff6600'
  const wa = animate ? ' class="train-wheel"' : ''
  const smk = animate ? `
    <circle class="diesel-smoke" cx="112" cy="10" r="7"   fill="rgba(16,16,16,0.92)" style="animation-delay:0s"/>
    <circle class="diesel-smoke" cx="104" cy="5"  r="5.5" fill="rgba(24,24,24,0.75)" style="animation-delay:0.22s"/>
    <circle class="diesel-smoke" cx="120" cy="3"  r="6"   fill="rgba(8,8,8,0.60)"    style="animation-delay:0.44s"/>` : ''
  return `<svg viewBox="0 0 230 70" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="115" cy="68" rx="100" ry="4" fill="rgba(0,0,0,0.25)"/>
  <rect x="8" y="46" width="214" height="10" rx="3" fill="#0a0a0a"/>
  <!-- Body full length -->
  <rect x="10" y="18" width="210" height="32" rx="6" fill="${bc}"/>
  <rect x="10" y="18" width="210" height="10" rx="6" fill="rgba(255,255,255,0.1)"/>
  <!-- Front cab (LEFT) -->
  <rect x="8"  y="13" width="54" height="39" rx="6" fill="${bc}"/>
  <rect x="6"  y="11" width="58" height="10" rx="4" fill="${ac}" opacity="0.95"/>
  <rect x="14" y="20" width="17" height="18" rx="4" fill="rgba(135,206,235,0.92)"/>
  <rect x="35" y="20" width="17" height="18" rx="4" fill="rgba(135,206,235,0.92)"/>
  <circle cx="9"  cy="40" r="7" fill="#FFD166" opacity="0.95"/><circle cx="9" cy="40" r="4" fill="white" opacity="0.9"/>
  <!-- Rear cab (RIGHT) — mirrored -->
  <rect x="168" y="13" width="54" height="39" rx="6" fill="${bc}"/>
  <rect x="166" y="11" width="58" height="10" rx="4" fill="${ac}" opacity="0.95"/>
  <rect x="178" y="20" width="17" height="18" rx="4" fill="rgba(135,206,235,0.92)"/>
  <rect x="199" y="20" width="17" height="18" rx="4" fill="rgba(135,206,235,0.92)"/>
  <circle cx="221" cy="40" r="7" fill="#FFD166" opacity="0.65"/><circle cx="221" cy="40" r="4" fill="white" opacity="0.6"/>
  <!-- Engine hood (centre) -->
  <rect x="62" y="16" width="106" height="36" rx="4" fill="${bc}"/>
  <rect x="70"  y="22" width="3" height="24" rx="1" fill="rgba(0,0,0,0.45)"/>
  <rect x="79"  y="22" width="3" height="24" rx="1" fill="rgba(0,0,0,0.45)"/>
  <rect x="88"  y="22" width="3" height="24" rx="1" fill="rgba(0,0,0,0.45)"/>
  <rect x="100" y="22" width="3" height="24" rx="1" fill="rgba(0,0,0,0.45)"/>
  <rect x="109" y="22" width="3" height="24" rx="1" fill="rgba(0,0,0,0.45)"/>
  <rect x="118" y="22" width="3" height="24" rx="1" fill="rgba(0,0,0,0.45)"/>
  <rect x="130" y="22" width="3" height="24" rx="1" fill="rgba(0,0,0,0.45)"/>
  <rect x="139" y="22" width="3" height="24" rx="1" fill="rgba(0,0,0,0.45)"/>
  <rect x="148" y="22" width="3" height="24" rx="1" fill="rgba(0,0,0,0.45)"/>
  <rect x="157" y="22" width="3" height="24" rx="1" fill="rgba(0,0,0,0.45)"/>
  <!-- Exhaust -->
  <rect x="107" y="6"  width="10" height="12" rx="3" fill="#222"/>
  <rect x="104" y="3"  width="16" height="6"  rx="2" fill="#333"/>
  ${smk}
  <!-- Full-length accent stripe -->
  <rect x="10" y="42" width="210" height="4" rx="2" fill="${ac}" opacity="0.82"/>
  <rect x="2"  y="46" width="10" height="8" rx="2" fill="#555"/>
  <rect x="218" y="46" width="10" height="8" rx="2" fill="#555"/>
  <!-- Bogie 1 — C (left) -->
  <rect x="10" y="55" width="90" height="10" rx="4" fill="#181818" stroke="#444" stroke-width="1"/>
  ${dunWheel(22, 62, 7, '#222', {animate, rim:'#888', rimW:1.5, hub:'#aaa'})}
  ${dunWheel(42, 62, 7, '#222', {animate, rim:'#888', rimW:1.5, hub:'#aaa'})}
  ${dunWheel(62, 62, 7, '#222', {animate, rim:'#888', rimW:1.5, hub:'#aaa'})}
  <!-- Bogie 2 — C (right) -->
  <rect x="130" y="55" width="90" height="10" rx="4" fill="#181818" stroke="#444" stroke-width="1"/>
  ${dunWheel(142, 62, 7, '#222', {animate, rim:'#888', rimW:1.5, hub:'#aaa'})}
  ${dunWheel(162, 62, 7, '#222', {animate, rim:'#888', rimW:1.5, hub:'#aaa'})}
  ${dunWheel(182, 62, 7, '#222', {animate, rim:'#888', rimW:1.5, hub:'#aaa'})}
</svg>`
}

// ===== EMU (KRL, LRT, MRT — commuter multiple unit, cabs at both ends) =====
function buildEmuSVG(cfg, opts = {}) {
  const { animate = true, width = 148, height = 64 } = opts
  const bc = cfg.bodyColor || '#0D47A1'
  const ac = cfg.accentColor || '#e53935'
  const wa = animate ? ' class="train-wheel"' : ''
  const spk = animate ? `
    <polyline class="elec-spark"  points="90,4 84,1 92,3 86,-2" fill="none" stroke="#00f5ff" stroke-width="1.8" stroke-linecap="round"/>
    <circle   class="elec-spark2" cx="84" cy="-2" r="1.8" fill="#fff"/>` : ''
  return `<svg viewBox="0 0 250 62" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="125" cy="60" rx="110" ry="4" fill="rgba(0,0,0,0.2)"/>
  <!-- Rear car body -->
  <rect x="152" y="16" width="86" height="34" rx="5" fill="${bc}"/>
  <rect x="152" y="16" width="86" height="10" rx="5" fill="rgba(255,255,255,0.12)"/>
  <rect x="162" y="22" width="14" height="13" rx="3" fill="rgba(135,206,235,0.88)"/>
  <rect x="182" y="22" width="14" height="13" rx="3" fill="rgba(135,206,235,0.88)"/>
  <rect x="202" y="22" width="14" height="13" rx="3" fill="rgba(135,206,235,0.88)"/>
  <rect x="222" y="22" width="12" height="13" rx="3" fill="rgba(135,206,235,0.88)"/>
  <!-- Inter-car bellows -->
  <rect x="140" y="22" width="14" height="26" rx="3" fill="rgba(0,0,0,0.45)"/>
  <!-- Front car (cab) -->
  <polygon points="10,50 2,38 2,26 10,16" fill="${bc}"/>
  <rect x="10" y="14" width="132" height="36" rx="6" fill="${bc}"/>
  <rect x="10" y="14" width="132" height="11" rx="6" fill="rgba(255,255,255,0.12)"/>
  <!-- Accent stripe full length -->
  <rect x="2"  y="38" width="236" height="5" rx="2.5" fill="${ac}" opacity="0.92"/>
  <!-- Headlights -->
  <circle cx="4"  cy="28" r="5.5" fill="#FFD166" opacity="0.95"/><circle cx="4" cy="28" r="3" fill="white" opacity="0.9"/>
  <circle cx="4"  cy="44" r="3.5" fill="#FF6B35" opacity="0.85"/>
  <!-- Panoramic front window -->
  <rect x="14" y="20" width="24" height="17" rx="4" fill="rgba(135,206,235,0.92)"/>
  <!-- Side windows -->
  <rect x="46"  y="22" width="14" height="13" rx="3" fill="rgba(135,206,235,0.88)"/>
  <rect x="66"  y="22" width="14" height="13" rx="3" fill="rgba(135,206,235,0.88)"/>
  <rect x="86"  y="22" width="14" height="13" rx="3" fill="rgba(135,206,235,0.88)"/>
  <rect x="106" y="22" width="14" height="13" rx="3" fill="rgba(135,206,235,0.88)"/>
  <!-- Pantograph -->
  <rect x="80" y="8" width="40" height="4" rx="2" fill="#555"/>
  <rect x="87" y="4" width="26" height="4" rx="2" fill="#777"/>
  <rect x="94" y="1" width="12" height="4" rx="1.5" fill="#888"/>
  ${spk}
  <!-- Bogies — front car -->
  <rect x="14" y="50" width="50" height="8" rx="3" fill="#111" stroke="#444" stroke-width="1"/>
  ${dunWheel(24, 56, 6, '#222', {animate, rim:'#888', rimW:1.5, hub:'#aaa'})}
  ${dunWheel(52, 56, 6, '#222', {animate, rim:'#888', rimW:1.5, hub:'#aaa'})}
  <rect x="82" y="50" width="50" height="8" rx="3" fill="#111" stroke="#444" stroke-width="1"/>
  ${dunWheel(92, 56, 6, '#222', {animate, rim:'#888', rimW:1.5, hub:'#aaa'})}
  ${dunWheel(120, 56, 6, '#222', {animate, rim:'#888', rimW:1.5, hub:'#aaa'})}
  <!-- Bogies — rear car -->
  <rect x="164" y="50" width="62" height="8" rx="3" fill="#111" stroke="#444" stroke-width="1"/>
  ${dunWheel(176, 56, 6, '#222', {animate, rim:'#888', rimW:1.5, hub:'#aaa'})}
  ${dunWheel(212, 56, 6, '#222', {animate, rim:'#888', rimW:1.5, hub:'#aaa'})}
</svg>`
}

// ===== SHINKANSEN 0 SERIES (round bullet nose, 1964 Tokyo Olympics) =====
function buildShinkansen0SVG(cfg, opts = {}) {
  const { animate = true, width = 148, height = 64 } = opts
  const bc = cfg.bodyColor || '#f0f0f0'
  const ac = cfg.accentColor || '#0052cc'
  const wa = animate ? ' class="train-wheel"' : ''
  const spk = animate ? `
    <polyline class="elec-spark"  points="98,4 92,1 100,3" fill="none" stroke="#ffd700" stroke-width="1.5" stroke-linecap="round"/>
    <circle   class="elec-spark2" cx="92" cy="0" r="1.5" fill="#fff"/>` : ''
  return `<svg viewBox="0 0 265 60" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="130" cy="58" rx="114" ry="4" fill="rgba(0,0,0,0.16)"/>
  <!-- Main body -->
  <rect x="40" y="14" width="216" height="36" rx="4" fill="${bc}" stroke="rgba(200,200,200,0.5)" stroke-width="0.8"/>
  <rect x="40" y="14" width="216" height="11" rx="4" fill="rgba(0,0,0,0.03)"/>
  <!-- Iconic ROUND/OVAL nose — the defining 0-series shape -->
  <ellipse cx="34" cy="32" rx="30" ry="22" fill="${bc}" stroke="rgba(200,200,200,0.5)" stroke-width="0.8"/>
  <!-- Blue belly stripe (iconic) -->
  <rect x="4"  y="35" width="252" height="9"  rx="2" fill="${ac}" opacity="0.95"/>
  <!-- Thin upper accent line -->
  <rect x="40" y="27" width="216" height="3.5" rx="1.5" fill="${ac}" opacity="0.5"/>
  <!-- Large circular front window (signature) -->
  <circle cx="32" cy="26" r="13" fill="rgba(100,180,255,0.18)"/>
  <circle cx="32" cy="26" r="10" fill="rgba(135,206,235,0.88)"/>
  <circle cx="32" cy="26" r="7"  fill="rgba(165,220,255,0.92)"/>
  <!-- Headlights (2 small below window) -->
  <circle cx="20" cy="42" r="4.5" fill="#FFD166" opacity="0.92"/><circle cx="20" cy="42" r="2.5" fill="white" opacity="0.9"/>
  <circle cx="40" cy="43" r="3"   fill="#FFD166" opacity="0.72"/>
  <!-- Windows (0-series: square with rounded corners) -->
  <rect x="56"  y="19" width="15" height="14" rx="3" fill="rgba(135,206,235,0.85)"/>
  <rect x="78"  y="19" width="15" height="14" rx="3" fill="rgba(135,206,235,0.85)"/>
  <rect x="100" y="19" width="15" height="14" rx="3" fill="rgba(135,206,235,0.85)"/>
  <rect x="122" y="19" width="15" height="14" rx="3" fill="rgba(135,206,235,0.85)"/>
  <rect x="144" y="19" width="15" height="14" rx="3" fill="rgba(135,206,235,0.85)"/>
  <rect x="166" y="19" width="15" height="14" rx="3" fill="rgba(135,206,235,0.85)"/>
  <rect x="188" y="19" width="15" height="14" rx="3" fill="rgba(135,206,235,0.85)"/>
  <rect x="210" y="19" width="15" height="14" rx="3" fill="rgba(135,206,235,0.85)"/>
  <rect x="233" y="19" width="16" height="14" rx="3" fill="rgba(135,206,235,0.85)"/>
  <!-- Pantograph -->
  <rect x="86" y="7" width="44" height="5" rx="2.5" fill="#666"/>
  <rect x="94" y="3" width="28" height="5" rx="2"   fill="#888"/>
  <rect x="102" y="0" width="12" height="4" rx="1.5" fill="#999"/>
  ${spk}
  <!-- Bogies (4 shown for 0-series 16-car train feel) -->
  <rect x="42"  y="50" width="50" height="8" rx="3" fill="#2a2a2a" stroke="#555" stroke-width="1"/>
  ${dunWheel(52, 56, 6, '#1a1a1a', {animate, rim:'#999', rimW:1.5, hub:'#ccc'})}
  ${dunWheel(80, 56, 6, '#1a1a1a', {animate, rim:'#999', rimW:1.5, hub:'#ccc'})}
  <rect x="110" y="50" width="50" height="8" rx="3" fill="#2a2a2a" stroke="#555" stroke-width="1"/>
  ${dunWheel(120, 56, 6, '#1a1a1a', {animate, rim:'#999', rimW:1.5, hub:'#ccc'})}
  ${dunWheel(148, 56, 6, '#1a1a1a', {animate, rim:'#999', rimW:1.5, hub:'#ccc'})}
  <rect x="178" y="50" width="50" height="8" rx="3" fill="#2a2a2a" stroke="#555" stroke-width="1"/>
  ${dunWheel(188, 56, 6, '#1a1a1a', {animate, rim:'#999', rimW:1.5, hub:'#ccc'})}
  ${dunWheel(216, 56, 6, '#1a1a1a', {animate, rim:'#999', rimW:1.5, hub:'#ccc'})}
</svg>`
}

// ===== HIGH-SPEED TRAIN (N700, E5, TGV, ICE, KTX, CR400 — varying nose) =====
function buildHighSpeedSVG(cfg, opts = {}) {
  const { animate = true, width = 148, height = 64 } = opts
  const bc = cfg.bodyColor || '#1a1a6b'
  const ac = cfg.accentColor || '#0077cc'
  const wa = animate ? ' class="train-wheel"' : ''
  const nl = cfg.noseLen || 44  // how far the nose tip extends from body
  const spk = animate ? `
    <polyline class="elec-spark"  points="${nl+32},4 ${nl+26},1 ${nl+34},3" fill="none" stroke="${ac}" stroke-width="1.8" stroke-linecap="round"/>
    <circle   class="elec-spark2" cx="${nl+26}" cy="0" r="1.5" fill="#fff"/>` : ''
  return `<svg viewBox="0 0 272 60" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="136" cy="58" rx="120" ry="4" fill="rgba(0,0,0,0.2)"/>
  <!-- Body -->
  <rect x="${nl}" y="14" width="${272-nl}" height="36" rx="5" fill="${bc}"/>
  <rect x="${nl}" y="14" width="${272-nl}" height="11" rx="5" fill="rgba(255,255,255,0.12)"/>
  <!-- Aerodynamic pointed nose -->
  <polygon points="${nl},50 4,36 4,28 ${nl},14" fill="${bc}"/>
  <!-- Accent stripe -->
  <rect x="4" y="36" width="268" height="6" rx="2.5" fill="${ac}" opacity="0.88"/>
  <!-- LED headlight strip on nose -->
  <line x1="${nl-8}" y1="23" x2="${nl+16}" y2="23" stroke="#FFD166" stroke-width="2.5" stroke-linecap="round" opacity="0.9"/>
  <circle cx="${nl-5}" cy="31" r="4.5" fill="#FFD166" opacity="0.92"/><circle cx="${nl-5}" cy="31" r="2.5" fill="white" opacity="0.9"/>
  <!-- Cab window -->
  <rect x="${nl+4}" y="19" width="22" height="16" rx="4" fill="rgba(135,206,235,0.9)"/>
  <!-- Side windows -->
  <rect x="${nl+34}"  y="19" width="14" height="13" rx="3" fill="rgba(135,206,235,0.82)"/>
  <rect x="${nl+54}"  y="19" width="14" height="13" rx="3" fill="rgba(135,206,235,0.82)"/>
  <rect x="${nl+74}"  y="19" width="14" height="13" rx="3" fill="rgba(135,206,235,0.82)"/>
  <rect x="${nl+94}"  y="19" width="14" height="13" rx="3" fill="rgba(135,206,235,0.82)"/>
  <rect x="${nl+114}" y="19" width="14" height="13" rx="3" fill="rgba(135,206,235,0.82)"/>
  <rect x="${nl+134}" y="19" width="14" height="13" rx="3" fill="rgba(135,206,235,0.82)"/>
  <rect x="${nl+154}" y="19" width="14" height="13" rx="3" fill="rgba(135,206,235,0.82)"/>
  <!-- Pantograph -->
  <rect x="${nl+42}" y="7" width="44" height="5" rx="2.5" fill="#666"/>
  <rect x="${nl+50}" y="3" width="28" height="5" rx="2" fill="#888"/>
  <rect x="${nl+58}" y="0" width="12" height="4" rx="1.5" fill="#999"/>
  ${spk}
  <!-- Bogies -->
  <rect x="${nl+4}"  y="50" width="58" height="8" rx="3" fill="#1a1a1a" stroke="#444" stroke-width="1"/>
  ${dunWheel(nl+16, 56, 6, '#111', {animate, rim:'#888', rimW:1.5, hub:'#bbb'})}
  ${dunWheel(nl+48, 56, 6, '#111', {animate, rim:'#888', rimW:1.5, hub:'#bbb'})}
  <rect x="${nl+80}" y="50" width="58" height="8" rx="3" fill="#1a1a1a" stroke="#444" stroke-width="1"/>
  ${dunWheel(nl+92, 56, 6, '#111', {animate, rim:'#888', rimW:1.5, hub:'#bbb'})}
  ${dunWheel(nl+124, 56, 6, '#111', {animate, rim:'#888', rimW:1.5, hub:'#bbb'})}
</svg>`
}

// ===== SCMaglev L0 (no wheels, superconducting magnetic levitation) =====
function buildMaglevSVG(cfg, opts = {}) {
  const { animate = true, width = 148, height = 64 } = opts
  const bc = cfg.bodyColor || '#1a1a2e'
  const ac = cfg.accentColor || '#00f5ff'
  const spk = animate ? `
    <circle   class="elec-spark"  cx="60" cy="10" r="3"   fill="${ac}" opacity="0.9"/>
    <circle   class="elec-spark2" cx="68" cy="8"  r="2"   fill="#fff"  opacity="0.8"/>
    <polyline class="elec-spark"  points="54,12 60,8 66,10 72,6" fill="none" stroke="${ac}" stroke-width="1.5" stroke-linecap="round"/>` : ''
  return `<svg viewBox="0 0 290 56" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Floating glow (no ground shadow — it levitates) -->
  <ellipse cx="145" cy="54" rx="118" ry="3" fill="rgba(0,200,255,0.08)" opacity="0.6"/>
  <!-- T-channel guideway at bottom -->
  <rect x="16" y="46" width="258" height="8" rx="3" fill="#101020"/>
  <rect x="10" y="49" width="270" height="5" rx="2" fill="#080818" stroke="${ac}" stroke-width="0.8" opacity="0.6"/>
  <!-- Superconducting coil strips (bottom edge) -->
  <rect x="46" y="43" width="12" height="4" rx="2" fill="${ac}" opacity="0.72"/>
  <rect x="64" y="43" width="12" height="4" rx="2" fill="${ac}" opacity="0.72"/>
  <rect x="82" y="43" width="12" height="4" rx="2" fill="${ac}" opacity="0.72"/>
  <rect x="100" y="43" width="12" height="4" rx="2" fill="${ac}" opacity="0.72"/>
  <rect x="118" y="43" width="12" height="4" rx="2" fill="${ac}" opacity="0.72"/>
  <rect x="136" y="43" width="12" height="4" rx="2" fill="${ac}" opacity="0.72"/>
  <rect x="154" y="43" width="12" height="4" rx="2" fill="${ac}" opacity="0.72"/>
  <rect x="172" y="43" width="12" height="4" rx="2" fill="${ac}" opacity="0.72"/>
  <rect x="190" y="43" width="12" height="4" rx="2" fill="${ac}" opacity="0.72"/>
  <rect x="208" y="43" width="12" height="4" rx="2" fill="${ac}" opacity="0.72"/>
  <rect x="226" y="43" width="12" height="4" rx="2" fill="${ac}" opacity="0.72"/>
  <rect x="244" y="43" width="12" height="4" rx="2" fill="${ac}" opacity="0.72"/>
  <!-- Main aerodynamic body -->
  <rect x="42" y="13" width="242" height="32" rx="7" fill="${bc}"/>
  <rect x="42" y="13" width="242" height="10" rx="7" fill="rgba(255,255,255,0.1)"/>
  <!-- Ultra-long tapered nose (≈60px) -->
  <polygon points="42,45 4,29 42,13" fill="${bc}"/>
  <circle cx="5" cy="29" r="5" fill="${bc}"/>
  <!-- Cyan accent glow stripe -->
  <rect x="4" y="33" width="280" height="4" rx="2" fill="${ac}" opacity="0.88"/>
  <!-- Cockpit windshield -->
  <rect x="44" y="18" width="24" height="14" rx="3" fill="rgba(135,206,235,0.88)"/>
  <!-- Narrow speed-slit windows -->
  <rect x="76"  y="20" width="16" height="9" rx="3" fill="rgba(135,206,235,0.72)"/>
  <rect x="100" y="20" width="16" height="9" rx="3" fill="rgba(135,206,235,0.72)"/>
  <rect x="124" y="20" width="16" height="9" rx="3" fill="rgba(135,206,235,0.72)"/>
  <rect x="148" y="20" width="16" height="9" rx="3" fill="rgba(135,206,235,0.72)"/>
  <rect x="172" y="20" width="16" height="9" rx="3" fill="rgba(135,206,235,0.72)"/>
  <rect x="196" y="20" width="16" height="9" rx="3" fill="rgba(135,206,235,0.72)"/>
  <rect x="220" y="20" width="16" height="9" rx="3" fill="rgba(135,206,235,0.72)"/>
  <rect x="244" y="20" width="16" height="9" rx="3" fill="rgba(135,206,235,0.72)"/>
  <!-- No wheels — MAGLEV! -->
  ${spk}
</svg>`
}

// ===== TRAIN SVG DISPATCHER — routes to correct builder per cfg.builder =====
function dispatchTrainSVG(cfg, opts) {
  const b = cfg.builder
  if (b === 'hood_diesel')  return buildHoodDieselSVG(cfg, opts)
  if (b === 'dual_cab')     return buildDualCabSVG(cfg, opts)
  if (b === 'emu')          return buildEmuSVG(cfg, opts)
  if (b === 'shinkansen_0') return buildShinkansen0SVG(cfg, opts)
  if (b === 'highspeed')    return buildHighSpeedSVG(cfg, opts)
  if (b === 'maglev')       return buildMaglevSVG(cfg, opts)
  if (cfg.isSteam)          return buildSteamLocoSVG(cfg, opts)
  if (cfg.isDiesel)         return buildDieselLocoSVG(cfg, opts)
  if (cfg.isElectric)       return buildElectricLocoSVG(cfg, opts)
  return buildDieselLocoSVG(cfg, opts)
}

// G14 Categories with trains grouped by type
const G14_CATEGORIES = [
  {
    key:'steam', label:'Uap 🇮🇩', emoji:'🚂', color:'#92400e', bg:'rgba(146,64,14,0.25)',
    desc:'10 lokomotif uap Ambarawa & Indonesia',
    trains:[
      { key:'b2507', name:'B 25 07',  sub:'Ambarawa 1902 • Swiss SLM', isSteam:true, rack:true,  tender:false, bodyColor:'#1a1a2e', wheelColor:'#0d0d1a', baseSpeed:1.55, boostMult:1.52, boostDur:1800, color:'#1a1a2e', kmh:30,  desc:'B2507 — Bintang Museum Ambarawa! Kereta rack bergerigi pendaki gunung dari Swiss SLM 1902. ⛰️' },
      { key:'b2521', name:'B 25 21',  sub:'Ambarawa 1912 • Swiss',     isSteam:true, rack:true,  tender:false, bodyColor:'#0d2a0d', wheelColor:'#061606', baseSpeed:1.62, boostMult:1.50, boostDur:1800, color:'#0d2a0d', kmh:32,  desc:'B2521 — Rack Ambarawa-Bedono jalur gunung legendaris, Swiss SLM 1912. 🌄' },
      { key:'c1218', name:'C 12 18',  sub:'Ambarawa 1891 • Jerman',    isSteam:true, rack:false, tender:true,  bodyColor:'#4a1515', wheelColor:'#2a0808', baseSpeed:1.48, boostMult:1.54, boostDur:1750, color:'#4a1515', kmh:28,  desc:'C1218 — Lokomotif TERTUA di Indonesia! Buatan Jerman 1891. Usia 130+ tahun! 🏺' },
      { key:'c5107', name:'C 51 07',  sub:'Ambarawa 1921 • Jerman',    isSteam:true, rack:false, tender:true,  bodyColor:'#0f0f0f', wheelColor:'#050505', baseSpeed:1.65, boostMult:1.49, boostDur:1900, color:'#111', kmh:35,  desc:'C5107 — Lokomotif tender uap Ambarawa buatan Jerman 1921. Pengirim barang era kolonial! 🪨' },
      { key:'d1415', name:'D 14 15',  sub:'Ambarawa 1908 • Hanomag',   isSteam:true, rack:false, tender:false, bodyColor:'#2a1a0a', wheelColor:'#150a00', baseSpeed:1.58, boostMult:1.48, boostDur:1850, color:'#2a1a0a', kmh:30,  desc:'D1415 — Hanomag Jerman 1908! Kekar dan andal, tulang punggung perkebunan Jawa! 💪' },
      { key:'b2801', name:'B 28 01',  sub:'Ambarawa 1907 • Swiss SLM', isSteam:true, rack:true,  tender:false, bodyColor:'#0a1f0a', wheelColor:'#051005', baseSpeed:1.60, boostMult:1.49, boostDur:1800, color:'#0a1f0a', kmh:31,  desc:'B2801 — Rack Swiss 1907! Mendaki lereng Gunung Merbabu dengan penuh keberanian! 🏔️' },
      { key:'c28',   name:'C 28',     sub:'Jawa 1920 • Belanda',       isSteam:true, rack:false, tender:true,  bodyColor:'#0f1540', wheelColor:'#070a25', baseSpeed:1.70, boostMult:1.47, boostDur:1900, color:'#0f1540', kmh:36,  desc:'C28 — Kelas C28 Hindia Belanda 1920. Elegan biru malam di jalur perbukitan! 🌙' },
      { key:'b50',   name:'B 50',     sub:'Jawa 1880 • Jerman',        isSteam:true, rack:false, tender:false, bodyColor:'#2a1e08', wheelColor:'#150f00', baseSpeed:1.42, boostMult:1.56, boostDur:1700, color:'#2a1e08', kmh:25,  desc:'B50 — Salah satu loko tertua Jawa! Jerman 1880-an. Lambat tapi punya legenda! 🦕' },
      { key:'bb302', name:'BB 302',   sub:'Indonesia 1954',             isSteam:true, rack:false, tender:true,  bodyColor:'#5D3A1A', wheelColor:'#3a2010', baseSpeed:2.0,  boostMult:1.45, boostDur:2000, color:'#5D3A1A', kmh:60,  desc:'BB302 — Lokomotif era peralihan Indonesia 1954. Baja murni Tanah Air! 🇮🇩' },
      { key:'bb303', name:'BB 303',   sub:'Indonesia 1956',             isSteam:true, rack:false, tender:true,  bodyColor:'#2A1A08', wheelColor:'#1a0a00', baseSpeed:2.1,  boostMult:1.43, boostDur:2000, color:'#2A1A08', kmh:65,  desc:'BB303 — Lebih bertenaga dari BB302! Kereta masa transisi terbaik Indonesia! ⚡' },
      { key:'e10',   name:'E 10',     sub:'Jawa Barat 1928 • Inggris', isSteam:true, rack:false, tender:true,  bodyColor:'#1C1C3A', wheelColor:'#0a0a20', baseSpeed:1.75, boostMult:1.46, boostDur:1950, color:'#1C1C3A', kmh:40,  desc:'E10 — Lokomotif listrik pertama Hindia Belanda! Jalur Batavia-Buitenzorg 1928. ⚡🏛️' },
      { key:'d300',  name:'D 301',    sub:'Jawa 1954 • USA',           isSteam:true, rack:false, tender:false, bodyColor:'#3D1515', wheelColor:'#1f0a0a', baseSpeed:1.90, boostMult:1.44, boostDur:1950, color:'#3D1515', kmh:55,  desc:'D301 — Lokomotif Amerika era 1950-an! Mesin kuat buatan Baldwin Locomotive Works. 🇺🇸' },
      { key:'b51',   name:'B 51',     sub:'Jawa 1900 • Belanda',       isSteam:true, rack:false, tender:false, bodyColor:'#1A3A1A', wheelColor:'#0a1f0a', baseSpeed:1.50, boostMult:1.53, boostDur:1750, color:'#1A3A1A', kmh:28,  desc:'B51 — Tram lokomotif Belanda 1900! Mungil tapi perkasa di jalanan kota! 🏙️' },
      { key:'c2706',    name:'C 27 06',    sub:'Jawa 1916 • Hartmann',         isSteam:true, rack:false, tender:true,  bodyColor:'#0a1a2a', wheelColor:'#050e17', baseSpeed:1.68, boostMult:1.48, boostDur:1850, color:'#0a1a2a', stripeColor:'#FFD166', kmh:37,  desc:'C2706 — Kelas C27 buatan Hartmann Jerman 1916. Mesin tangguh jalur Priangan! 🌿' },
      { key:'240loco',   name:'2-4-0',       sub:'Eropa 1860 • Klasik',           isSteam:true, rack:false, tender:true,  bodyColor:'#3a1a0a', wheelColor:'#1f0d00', baseSpeed:1.45, boostMult:1.55, boostDur:1700, color:'#3a1a0a', stripeColor:'#e63946', kmh:55,  desc:'2-4-0 — Konfigurasi klasik abad 19: 2 roda depan, 4 roda penggerak. Tulang punggung jalur kereta pertama di Eropa & Amerika! 🏛️🚂' },
      { key:'caseyjr',   name:'Casey Jr',    sub:'Sirkus • Dumbo Disney',         isSteam:true, rack:false, tender:false, bodyColor:'#c0392b', wheelColor:'#7f0000', baseSpeed:1.80, boostMult:1.60, boostDur:1600, color:'#c0392b', stripeColor:'#ffd700', kmh:60,  desc:'Casey Jr — Kereta Sirkus dari film Dumbo (Disney 1941)! "I think I can, I think I can!" Semangat pantang menyerah! 🎪🐘' },
      { key:'malivlakb250', name:'B 250',    sub:'Malivlak • Indonesia',          isSteam:true, rack:false, tender:true,  bodyColor:'#1a2a1a', wheelColor:'#0a150a', baseSpeed:1.55, boostMult:1.50, boostDur:1800, color:'#1a2a1a', stripeColor:'#00c853', kmh:45,  desc:'B250 Malivlak — Lokomotif uap Indonesia yang perkasa! Melintasi hutan dan perkebunan Nusantara dengan gagah. 🌴🇮🇩' },
      { key:'flyingscotsman', name:'Flying Scotsman', sub:'UK 1923 • LNER Apple Green', isSteam:true, rack:false, tender:true, bodyColor:'#2d6a2d', wheelColor:'#1a3d1a', baseSpeed:2.2, boostMult:1.46, boostDur:2000, color:'#2d6a2d', stripeColor:'#FFD700', kmh:160, desc:'Flying Scotsman — BINTANG DUNIA! Loko uap pertama capai 100 mph (160 km/h)! Legenda LNER hijau elegan. 🇬🇧⚡' },
      { key:'bigboy', name:'Big Boy UP 4014', sub:'USA 1941 • Union Pacific', isSteam:true, rack:false, tender:true, bodyColor:'#1a1a1a', wheelColor:'#0d0d0d', baseSpeed:2.0, boostMult:1.55, boostDur:1900, color:'#111', stripeColor:'#FFA500', kmh:130, desc:'Big Boy — TERBESAR & TERBERAT di dunia! 7000 HP, 135 ton, kereta uap Amerika yang perkasa! 🦅🇺🇸' },
      { key:'mallard', name:'Mallard A4', sub:'UK 1938 • LNER Garter Blue', isSteam:true, rack:false, tender:true, bodyColor:'#1a3a6b', wheelColor:'#0d1f3a', baseSpeed:2.5, boostMult:1.48, boostDur:2000, color:'#1a3a6b', stripeColor:'#C0C0C0', kmh:203, desc:'Mallard — REKOR DUNIA ABADI! 203 km/h pada 1938, tak tertandingi lokomotif uap hingga kini! 🏆🇬🇧' },
      { key:'c62japan', name:'C62', sub:'Jepang 1948 • JNR Hitam', isSteam:true, rack:false, tender:true, bodyColor:'#111111', wheelColor:'#060606', baseSpeed:2.3, boostMult:1.47, boostDur:1950, color:'#111', stripeColor:'#e63946', kmh:145, desc:'C62 — Kebanggaan JNR Jepang! Loko uap terbesar Jepang, menarik Tsubame & Hato ekspres elite! 🇯🇵✨' },
      { key:'p36', name:'P36', sub:'Uni Soviet 1950 • LKZ', isSteam:true, rack:false, tender:true, bodyColor:'#2a5f2a', wheelColor:'#163016', baseSpeed:2.1, boostMult:1.48, boostDur:1950, color:'#2a5f2a', stripeColor:'#FFD700', kmh:125, desc:'P36 — Lokomotif uap terakhir dan termegah Uni Soviet! Bintang merah di badan hijau elegan! ⭐🇷🇺' },
      { key:'sar25', name:'SAR Class 25', sub:'Afrika Selatan 1953', isSteam:true, rack:false, tender:true, bodyColor:'#7a1a1a', wheelColor:'#3d0d0d', baseSpeed:1.9, boostMult:1.50, boostDur:1900, color:'#7a1a1a', stripeColor:'#FFC107', kmh:110, desc:'SAR Class 25 — Lokomotif uap terbesar & terkuat Afrika! Mesin kondensasi inovatif! 🦁🌍' },
      { key:'db01', name:'DB Class 01', sub:'Jerman 1926 • Reichsbahn', isSteam:true, rack:false, tender:true, bodyColor:'#1a1a2a', wheelColor:'#0d0d15', baseSpeed:2.0, boostMult:1.49, boostDur:1950, color:'#1a1a2a', stripeColor:'#C0C0C0', kmh:130, desc:'DB Class 01 — Lokomotif ekspres Jerman Reichsbahn era 1920an! Desain klasik Prusia yang kokoh! 🇩🇪🚂' },
      { key:'gwrcastle', name:'GWR Castle', sub:'UK 1923 • Great Western', isSteam:true, rack:false, tender:true, bodyColor:'#8B4513', wheelColor:'#4a2208', baseSpeed:2.1, boostMult:1.47, boostDur:1950, color:'#8B4513', stripeColor:'#FFD700', kmh:150, desc:'GWR Castle Class — Kastil beroda! Desain Collett 1923, sempat jadi terkencang di UK. 🏰🇬🇧' },
      { key:'bb1000id', name:'BB 1000', sub:'Indonesia • Heritage Steam', isSteam:true, rack:false, tender:false, bodyColor:'#8B0000', wheelColor:'#4a0000', baseSpeed:1.95, boostMult:1.52, boostDur:1850, color:'#8B0000', stripeColor:'#FFD700', kmh:85, desc:'BB 1000 — Loko uap heritage Indonesia! Livery merah maroon mewah, simbol kejayaan rel Nusantara! 🇮🇩❤️' },
    ]
  },
  {
    key:'diesel', label:'Diesel', emoji:'🚃', color:'#166534', bg:'rgba(22,101,52,0.25)',
    desc:'Mesin diesel kuat dan handal',
    trains:[
      { key:'cc201',  name:'CC 201',   sub:'Indonesia • EMD Hood Unit',    isDiesel:true, builder:'hood_diesel', bodyColor:'#1B4A1B', accentColor:'#FFD166', baseSpeed:2.6,  boostMult:1.38, boostDur:2100, color:'#1B5E20', kmh:85,  desc:'CC201 — Kuda kerja rel Indonesia! Hood unit C-C, ribuan CC201 melintasi Jawa setiap hari. 💪🇮🇩' },
      { key:'cc203',  name:'CC 203',   sub:'Indonesia • Hood Unit Modern',  isDiesel:true, builder:'hood_diesel', bodyColor:'#0f3d1a', accentColor:'#00e676', baseSpeed:2.8, boostMult:1.36, boostDur:2100, color:'#1A4A1A', kmh:95,  desc:'CC203 — Diesel modern Indonesia! Hood unit lebih bertenaga, livery hijau metalik! 🟢⚡' },
      { key:'cc206',  name:'CC 206',   sub:'Indonesia • GE Dual-Cab C-C',  isDiesel:true, builder:'dual_cab',   bodyColor:'#1a2a4a', accentColor:'#ff6600', baseSpeed:3.0, boostMult:1.35, boostDur:2150, color:'#1a2a4a', kmh:100, desc:'CC206 — GE ES43ACi terbaru Indonesia! Desain kabin ganda (bi-directional), 6 gandar, 4300 HP! 🔶🇺🇸' },
      { key:'bb301',  name:'BB 301',   sub:'Indonesia • Diesel',           isDiesel:true, builder:'hood_diesel', bodyColor:'#3a2800', accentColor:'#ffa500', baseSpeed:2.4,  boostMult:1.40, boostDur:2050, color:'#2a1a00', kmh:75,  desc:'BB301 — Diesel tua tapi kokoh! Masih mengangkut barang di jalur-jalur pinggiran Jawa. 🚛' },
      { key:'de10',   name:'DE 10',    sub:'Jepang • JNR Diesel',          isDiesel:true, bodyColor:'#4a2000', accentColor:'#ff3300', baseSpeed:2.2,  boostMult:1.41, boostDur:2000, color:'#4a2000', kmh:70,  desc:'DE10 — Diesel langsir JNR Jepang! Sangat fleksibel, bisa bolak-balik arah! 🇯🇵' },
      { key:'class66', name:'Class 66', sub:'Inggris • EWS Hood Diesel',   isDiesel:true, builder:'hood_diesel', bodyColor:'#5a1a1a', accentColor:'#ffd700', baseSpeed:2.7,  boostMult:1.37, boostDur:2100, color:'#5a1a1a', kmh:92,  desc:'Class 66 — Hood diesel barang Inggris yang ikonik! Dipakai di seluruh Eropa! 🇬🇧🌍' },
      { key:'sd70m',  name:'SD70M',    sub:'Amerika • EMD Diesel',         isDiesel:true, bodyColor:'#003366', accentColor:'#ff0000', baseSpeed:3.1,  boostMult:1.34, boostDur:2200, color:'#003366', kmh:105, desc:'SD70M — Raksasa rel Amerika! Mesin EMD bertenaga 4300 hp untuk jalur panjang! 🇺🇸🦅' },
      { key:'df8b',   name:'DF8B',     sub:'China • Diesel Hood Unit',     isDiesel:true, builder:'hood_diesel', bodyColor:'#1a3a1a', accentColor:'#ff4444', baseSpeed:2.9,  boostMult:1.35, boostDur:2150, color:'#1a3a1a', kmh:98,  desc:'DF8B — Hood diesel angkut barang China yang perkasa! Tulang punggung jalur batubara! 🇨🇳' },
      { key:'cc205', name:'CC 205', sub:'Indonesia • GE C30ACi', isDiesel:true, builder:'hood_diesel', bodyColor:'#00695c', accentColor:'#e0f2f1', baseSpeed:3.2, boostMult:1.33, boostDur:2200, color:'#004d40', kmh:110, desc:'CC205 — GE C30ACi! Diesel andalan Sumatra, bodi teal elegan angkut batubara Tanjung Enim! 🟢🇮🇩' },
      { key:'cc300', name:'CC 300', sub:'Indonesia • Hyundai Rotem', isDiesel:true, builder:'dual_cab', bodyColor:'#1565c0', accentColor:'#e3f2fd', baseSpeed:3.4, boostMult:1.32, boostDur:2250, color:'#0d47a1', kmh:120, desc:'CC300 — Diesel paling modern Indonesia dari Hyundai Rotem! Dual-cab bertenaga tinggi! 🔵🇰🇷🇮🇩' },
      { key:'cc400', name:'CC 400', sub:'Indonesia • Siemens Eurosprinter', isDiesel:true, builder:'dual_cab', bodyColor:'#4a148c', accentColor:'#e8eaf6', baseSpeed:3.6, boostMult:1.30, boostDur:2300, color:'#311b92', kmh:130, desc:'CC400 — Eurosprinter Siemens! Diesel paling cepat KAI, teknologi Eropa jantung Indonesia! 💜🇩🇪🇮🇩' },
      { key:'alco', name:'ALCO RS-11', sub:'Amerika • Railroad Diesel', isDiesel:true, bodyColor:'#5d3a00', accentColor:'#FFA726', baseSpeed:2.5, boostMult:1.39, boostDur:2050, color:'#3e2800', kmh:105, desc:'ALCO RS-11 — Road Switcher klasik Amerika! Desain ikonik hood unit warisan era 1950an. 🦅🇺🇸' },
      { key:'class47', name:'Class 47', sub:'Inggris • Brush Sulzer', isDiesel:true, builder:'hood_diesel', bodyColor:'#003087', accentColor:'#ffffff', baseSpeed:2.6, boostMult:1.38, boostDur:2100, color:'#003087', kmh:153, desc:'Class 47 — Diesel paling populer di UK! 500+ unit dibangun, menarik hampir semua rute Inggris! 🇬🇧' },
      { key:'renfe333', name:'RENFE 333', sub:'Spanyol • Alsthom', isDiesel:true, builder:'dual_cab', bodyColor:'#8b0000', accentColor:'#ffe0b2', baseSpeed:2.9, boostMult:1.36, boostDur:2150, color:'#7a0000', kmh:160, desc:'RENFE 333 — Diesel ekspres Spanyol! Dual-cab Alsthom Perancis dengan livery merah mewah! 🇪🇸🌹' },
      { key:'kiha261', name:'KiHa 261', sub:'Jepang • JR Hokkaido Diesel', isDiesel:true, builder:'dual_cab', bodyColor:'#1a1a4a', accentColor:'#ff6f61', baseSpeed:3.0, boostMult:1.35, boostDur:2200, color:'#0f0f30', kmh:130, desc:'KiHa 261 — DMU ekspres JR Hokkaido! Dirancang tahan salju, berlari di padang beku! ❄️🇯🇵' },
      { key:'br218', name:'DB Class 218', sub:'Jerman • Henschel V160', isDiesel:true, builder:'hood_diesel', bodyColor:'#003a6b', accentColor:'#cccccc', baseSpeed:2.8, boostMult:1.37, boostDur:2100, color:'#002a50', kmh:140, desc:'DB Class 218 — V160 Henschel! Diesel serbaguna DB yang paling banyak dipakai di Jerman! 🇩🇪🔵' },
      { key:'emd38', name:'EMD GP38', sub:'Amerika • General Motors', isDiesel:true, bodyColor:'#002244', accentColor:'#ff0000', baseSpeed:2.7, boostMult:1.37, boostDur:2100, color:'#001a33', kmh:112, desc:'EMD GP38 — General Purpose General Motors! Tulang punggung jalur regional di seluruh Amerika! 🇺🇸💪' },
      { key:'bb75000', name:'BB 75000', sub:'Perancis • SNCF Diesel', isDiesel:true, builder:'dual_cab', bodyColor:'#003153', accentColor:'#d4af37', baseSpeed:3.1, boostMult:1.34, boostDur:2200, color:'#002040', kmh:120, desc:'BB 75000 — Diesel serbaguna SNCF Perancis! Prima power dual-cab yang handal! 🇫🇷💛' },
    ]
  },
  {
    key:'electric', label:'Listrik', emoji:'⚡', color:'#1e3a8a', bg:'rgba(30,58,138,0.25)',
    desc:'Kereta listrik super cepat',
    trains:[
      { key:'krl',    name:'KRL',             sub:'Commuter Jabodetabek',    isElectric:true, builder:'emu',          bodyColor:'#0D47A1', accentColor:'#e53935', baseSpeed:3.0, boostMult:1.37, boostDur:2200, color:'#0D47A1', kmh:110, desc:'KRL Commuter Line — andalan ibu kota! EMU dua kabin, angkut jutaan penumpang Jakarta! 🏙️🇮🇩' },
      { key:'lrt',    name:'LRT Jakarta',      sub:'Indonesia 2019',           isElectric:true, builder:'emu',          bodyColor:'#c62828', accentColor:'#ffeb3b', baseSpeed:2.8, boostMult:1.38, boostDur:2150, color:'#c62828', kmh:90,  desc:'LRT Jakarta — Kereta ringan melayang di atas kota! EMU modern dan ramah lingkungan! 🌇✨' },
      { key:'mrt',    name:'MRT Jakarta',      sub:'Indonesia 2019',           isElectric:true, builder:'emu',          bodyColor:'#37474f', accentColor:'#26c6da', baseSpeed:3.1, boostMult:1.36, boostDur:2250, color:'#37474f', kmh:115, desc:'MRT Jakarta — EMU pertama Jakarta! Pantograph ganda, sistem CBTC canggih! 🚇💨' },
      { key:'shink0', name:'Shinkansen 0',     sub:'Jepang 1964 • JNR Klasik', isElectric:true, builder:'shinkansen_0', bodyColor:'#f0f0f0', accentColor:'#0052cc', baseSpeed:2.8, boostMult:1.38, boostDur:2100, color:'#f0f0f0', kmh:210, desc:'Shinkansen 0 Series — LEGENDA 1964! Hidung bulat ikonik, debut saat Olimpiade Tokyo. Bapak semua bullet train dunia! 🇯🇵🏅' },
      { key:'shink',  name:'Shinkansen N700',  sub:'Jepang • JR Central',      isElectric:true, builder:'highspeed',    bodyColor:'#1A1A6B', accentColor:'#0077cc', noseLen:44, baseSpeed:3.5, boostMult:1.35, boostDur:2300, color:'#1A1A6B', kmh:285, desc:'Shinkansen N700 — Aerodynamic aero-wing car! 285 km/h, anti-derailment sistem aktif! 🏔️🇯🇵' },
      { key:'e5',     name:'Shinkansen E5',    sub:'Jepang • Hayabusa',        isElectric:true, builder:'highspeed',    bodyColor:'#1B4332', accentColor:'#ff69b4', noseLen:70, baseSpeed:3.6, boostMult:1.34, boostDur:2300, color:'#2C7043', kmh:320, desc:'Shinkansen E5 Hayabusa — Hidung TERPANJANG! 15m "Iguana nose", 320 km/h memecah angin! 🦅💚' },
      { key:'tgv',    name:'TGV Inouï',        sub:'Perancis • SNCF',          isElectric:true, builder:'highspeed',    bodyColor:'#003189', accentColor:'#e63946', noseLen:52, baseSpeed:3.8, boostMult:1.33, boostDur:2400, color:'#003189', kmh:320, desc:'TGV Inouï — Kebanggaan Prancis! Power car di ujung, 320 km/h! 🇫🇷⚡' },
      { key:'ice3',   name:'ICE-3',            sub:'Jerman • DB',              isElectric:true, builder:'highspeed',    bodyColor:'#e8e8e8', accentColor:'#e63946', noseLen:32, baseSpeed:3.7, boostMult:1.34, boostDur:2350, color:'#D0D0D0', kmh:300, desc:'ICE-3 — Motor tersebar (distributed traction) pertama Jerman! 300 km/h tanpa lokomotif terpisah! 🇩🇪🚄' },
      { key:'ktx',    name:'KTX-I',            sub:'Korea Selatan • Korail',   isElectric:true, builder:'highspeed',    bodyColor:'#0A2A7A', accentColor:'#ff6b35', noseLen:50, baseSpeed:3.6, boostMult:1.35, boostDur:2300, color:'#0A2A7A', kmh:305, desc:'KTX-I — Peluru Korea berbasis TGV! 305 km/h Seoul-Busan hanya 2.5 jam! 🇰🇷⚡' },
      { key:'cr400',  name:'CR400AF',          sub:'China • Fuxing',           isElectric:true, builder:'highspeed',    bodyColor:'#b71c1c', accentColor:'#ffc107', noseLen:46, baseSpeed:4.0, boostMult:1.32, boostDur:2450, color:'#b71c1c', kmh:350, desc:'CR400AF Fuxing — Kereta TERCEPAT beroperasi di dunia! 350 km/h jalur China! 🇨🇳🏆' },
      { key:'maglev', name:'SCMaglev L0',      sub:'Jepang • Superconducting', isElectric:true, builder:'maglev',       bodyColor:'#1a1a2e', accentColor:'#00f5ff', baseSpeed:4.5, boostMult:1.30, boostDur:2600, color:'#1a1a2e', kmh:603, desc:'SCMaglev L0 — PEMEGANG REKOR DUNIA! 603 km/h! Melayang di atas rel, roda tidak menyentuh tanah! 🌌🚀' },
      { key:'whoosh', name:'Whoosh KCIC', sub:'Indonesia 2023 • CR400AF', isElectric:true, builder:'highspeed', bodyColor:'#c62828', accentColor:'#e0e0e0', noseLen:46, baseSpeed:3.9, boostMult:1.32, boostDur:2400, color:'#b71c1c', kmh:350, desc:'Whoosh — KERETA CEPAT PERTAMA RI! Jakarta-Bandung 46 menit! CR400AF made in China, milik Indonesia! 🇮🇩🏆🚀' },
      { key:'ice4', name:'ICE 4', sub:'Jerman 2017 • Siemens', isElectric:true, builder:'highspeed', bodyColor:'#f5f5f5', accentColor:'#e63946', noseLen:30, baseSpeed:3.8, boostMult:1.33, boostDur:2350, color:'#ffffff', kmh:250, desc:'ICE 4 — Generasi terbaru ICE Jerman! Kenyamanan & efisiensi terbaik, rangkaian terpanjang 346m! 🇩🇪✨' },
      { key:'acela2', name:'Acela II', sub:'Amerika 2024 • Alstom Avelia', isElectric:true, builder:'highspeed', bodyColor:'#1a3a6b', accentColor:'#cc0000', noseLen:36, baseSpeed:3.6, boostMult:1.34, boostDur:2300, color:'#12284a', kmh:300, desc:'Acela Express 2 — Bullet train Amerika! Alstom Avelia Liberty, koridor NEC Boston-DC! 🇺🇸🗽' },
      { key:'agvitalo', name:'AGV Italo', sub:'Italia 2012 • NTV Italo', isElectric:true, builder:'highspeed', bodyColor:'#c62828', accentColor:'#ff8f00', noseLen:40, baseSpeed:3.7, boostMult:1.33, boostDur:2350, color:'#b71c1c', kmh:300, desc:'AGV Italo — Kereta swasta Italia pertama! Desain Pininfarina nan elegan, 300 km/h di jalur Roma-Milano! 🇮🇹🏎️' },
      { key:'pendolino', name:'Pendolino ETR610', sub:'Italia/Swiss • Alstom', isElectric:true, builder:'emu', bodyColor:'#c62828', accentColor:'#ffd600', baseSpeed:3.4, boostMult:1.35, boostDur:2250, color:'#b71c1c', kmh:250, desc:'Pendolino ETR610 — Kereta miring ikonik! Teknologi tilting di tikungan pegunungan Alpen! ⛰️🇮🇹' },
      { key:'s103', name:'RENFE S-103', sub:'Spanyol • Velaro E Siemens', isElectric:true, builder:'highspeed', bodyColor:'#c0c0c0', accentColor:'#ffeb3b', noseLen:35, baseSpeed:3.8, boostMult:1.33, boostDur:2350, color:'#a0a0a0', kmh:350, desc:'RENFE S-103 Velaro E — TERCEPAT di Eropa saat diluncurkan! 350 km/h jalur AVE Spanyol! 🇪🇸⚡' },
      { key:'ktxsan', name:'KTX-Sancheon', sub:'Korea 2010 • Hyundai Rotem', isElectric:true, builder:'highspeed', bodyColor:'#002366', accentColor:'#00bfff', noseLen:48, baseSpeed:3.7, boostMult:1.34, boostDur:2300, color:'#001a4a', kmh:305, desc:'KTX-Sancheon — Bullet train BUATAN Korea sendiri! Desain dalam negeri 100%, nama dari gunung Sancheon! 🇰🇷🏔️' },
      { key:'shink500', name:'Shinkansen 500', sub:'Jepang 1997 • JR West', isElectric:true, builder:'highspeed', bodyColor:'#1a1a3a', accentColor:'#6699cc', noseLen:80, baseSpeed:3.8, boostMult:1.33, boostDur:2350, color:'#111130', kmh:300, desc:'Shinkansen 500 — HIDUNG TERPANJANG 15m! Desain paling futuristik Shinkansen, menginspirasi desainer dunia! 🛸🇯🇵' },
      { key:'alphax', name:'Alpha-X Series', sub:'Jepang 2019 • JR East R&D', isElectric:true, builder:'highspeed', bodyColor:'#e8e8e8', accentColor:'#ff6600', noseLen:65, baseSpeed:4.1, boostMult:1.31, boostDur:2500, color:'#d0d0d0', kmh:400, desc:'Alpha-X — Prototipe MASA DEPAN JR East! Hidung 22m, target 400 km/h! Kereta paling aerodinamis Jepang! 🔬🇯🇵🚀' },
      { key:'frecciarossa', name:'Frecciarossa 1000', sub:'Italia 2015 • AnsaldoBreda', isElectric:true, builder:'highspeed', bodyColor:'#c62828', accentColor:'#f5f5f5', noseLen:38, baseSpeed:3.8, boostMult:1.33, boostDur:2350, color:'#b71c1c', kmh:400, desc:'Frecciarossa 1000 — Panah Merah Italia! 400 km/h prototype, 300 km/h operasional. Desain Ferrari untuk kereta! 🏎️🇮🇹❤️' },
    ]
  },
]
// Build flat lookup from all category trains
const TRAIN_TYPES_14 = {}
G14_CATEGORIES.forEach(cat => cat.trains.forEach(t => { TRAIN_TYPES_14[t.key] = {...t, category: cat.key} }))
// AI train pool (all trains can appear as AI)
const G14_AI_POOL = Object.values(TRAIN_TYPES_14)

let g14State = {}

// G14 Audio — train station ambient + race BG loop + horn
const g14StationAudio = new Audio('assets/sfx-train-station.mp3')
g14StationAudio.loop = true; g14StationAudio.volume = 0.3
const g14BgAudio = new Audio('assets/sfx-train-bg.mp3')
g14BgAudio.loop = true; g14BgAudio.volume = 0.35
const g14HornAudio = new Audio('assets/sfx-train-horn.mp3')
g14HornAudio.volume = 0.7

function g14StopAllAudio() {
  g14StationAudio.pause(); g14StationAudio.currentTime = 0
  g14BgAudio.pause(); g14BgAudio.currentTime = 0
  g14HornAudio.pause(); g14HornAudio.currentTime = 0
}
function g14ScheduleHorn() {
  if (!g14State.running) return
  g14HornAudio.currentTime = 0
  g14HornAudio.play().catch(()=>{})
  setTimeout(g14ScheduleHorn, 18000 + Math.random() * 12000)
}

function initGame14() {
  battleBgmStop()
  const lv = state.selectedLevelNum || state.selectedLevel || 5
  const diff = state.selectedLevel || 'easy'
  try { sessionStorage.setItem('g14Config', JSON.stringify({ level: lv, difficulty: diff })) } catch(_) {}
  window.location.href = 'games/balapan-kereta.html'
}

function g14RenderTrainSelect() {
  const wrap = document.getElementById('g14-train-select')
  wrap.innerHTML = ''
  wrap.style.maxWidth = '360px'
  // Step 1: Category cards
  G14_CATEGORIES.forEach(cat => {
    const btn = document.createElement('button')
    btn.className = 'g14-train-select-btn'
    btn.style.cssText = `width:100%;max-width:320px;padding:14px 18px;display:flex;align-items:center;gap:14px;background:${cat.bg};border:2px solid ${cat.color};border-radius:14px;cursor:pointer;text-align:left;`
    btn.innerHTML = `<span style="font-size:32px;line-height:1;">${cat.emoji}</span><div><div style="font-size:15px;font-weight:900;color:white;">${cat.label}</div><div style="font-size:11px;color:rgba(255,255,255,0.6);margin-top:2px;">${cat.desc}</div></div><span style="margin-left:auto;font-size:20px;color:rgba(255,255,255,0.35);">›</span>`
    btn.onclick = () => { playClick(); g14ShowTrainsForCategory(cat) }
    wrap.appendChild(btn)
  })
}

function g14ShowTrainsForCategory(cat) {
  const wrap = document.getElementById('g14-train-select')
  wrap.innerHTML = ''
  wrap.style.maxWidth = '380px'
  // Back button
  const backBtn = document.createElement('button')
  backBtn.style.cssText = 'width:100%;max-width:320px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);border-radius:10px;color:rgba(255,255,255,0.7);font-size:13px;font-weight:700;padding:8px 14px;cursor:pointer;text-align:left;'
  backBtn.innerHTML = `← Kembali ke Kategori`
  backBtn.onclick = () => { playClick(); g14RenderTrainSelect(); document.getElementById('g14-start-msg').textContent=''; document.getElementById('g14-go-btn-wrap').style.display='none' }
  wrap.appendChild(backBtn)
  const catLabel = document.createElement('div')
  catLabel.style.cssText = 'color:rgba(255,255,255,0.5);font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:4px 0;'
  catLabel.textContent = `${cat.emoji} ${cat.label} — Pilih keretamu`
  wrap.appendChild(catLabel)
  // Train grid
  const grid = document.createElement('div')
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,1fr);gap:8px;width:100%;max-width:320px;'
  cat.trains.forEach(cfg => {
    const btn = document.createElement('button')
    btn.className = 'g14-train-select-btn'
    btn.style.padding = '12px 8px'
    const previewHtml = dispatchTrainSVG(cfg, {animate:false, width:80, height:36})
    btn.innerHTML = `<div style="display:block;margin:0 auto 6px;text-align:center;height:38px;display:flex;align-items:center;justify-content:center;">${previewHtml}</div><div style="font-size:12px;font-weight:800;color:white;">${cfg.name}</div><div style="font-size:10px;color:rgba(255,255,255,0.55);">${cfg.sub}</div><div style="font-size:11px;color:#FFD166;font-weight:700;margin-top:2px;">${cfg.kmh} km/h</div>`
    btn.onclick = () => {
      grid.querySelectorAll('.g14-train-select-btn').forEach(b => b.classList.remove('selected'))
      btn.classList.add('selected')
      g14State.trainType = cfg.key
      g14State.trainCfg = cfg
      // Update header icon
      const hdrWrap = document.getElementById('g14-train-icon-hdr')
      if (hdrWrap) {
        hdrWrap.innerHTML = dispatchTrainSVG(cfg, {animate:false, width:54, height:24})
      }
      document.getElementById('g14-start-msg').textContent = cfg.desc
      document.getElementById('g14-go-btn-wrap').style.display = 'block'
      playClick()
    }
    grid.appendChild(btn)
  })
  wrap.appendChild(grid)
}

function g14StartRace() {
  if (!g14State.trainCfg) return
  // Switch from station ambient to race BG audio
  g14StopAllAudio()
  g14BgAudio.currentTime = 0
  g14BgAudio.play().catch(()=>{})
  setTimeout(g14ScheduleHorn, 8000)
  // Reset checkpoints
  ;['g14-cp1','g14-cp2','g14-cp3'].forEach(id => {
    const cp = document.getElementById(id)
    if (cp) { cp.classList.remove('reached'); cp.textContent = '🚉' }
  })
  const track = document.getElementById('g14-track')
  g14State.trackW = track.clientWidth
  g14State.speed = g14State.trainCfg.baseSpeed
  g14State.running = true
  // Inject animated player train SVG
  const playerDiv = document.getElementById('g14-player')
  if (playerDiv) {
    const cfg = g14State.trainCfg
    playerDiv.innerHTML = dispatchTrainSVG(cfg, {animate:true, width:200, height:88})
  }
  document.getElementById('g14-start-overlay').style.display = 'none'
  document.getElementById('g14-position').style.display = 'block'
  g14UpdatePlayerPos()
  g14SpawnAI()
  g14Loop()
  playClick()
}

function g14SpawnAI() {
  const ai = []
  const allLanes = [0,1,2]
  const aiLanes = allLanes.filter(l => l !== g14State.lane)
  const pool = [...G14_AI_POOL].sort(() => Math.random() - 0.5)
  const track = document.getElementById('g14-track')
  aiLanes.forEach((lane, i) => {
    const cfg = pool[i % pool.length]
    const variationFactor = 0.97 + Math.random() * 0.06
    const el = document.createElement('div')
    el.className = 'g14-ai-train entering'
    el.style.cssText = `position:absolute;pointer-events:none;`
    el.innerHTML = dispatchTrainSVG(cfg, {animate:true, width:160, height:70})
    const startX = g14State.trackW * (0.55 + i * 0.12)
    el.style.left = startX + 'px'
    el.style.top = `calc(${g14State.laneTopPct[lane]}% - 24px)`
    track.appendChild(el)
    setTimeout(() => el.classList.remove('entering'), 500)
    ai.push({ lane, speed: g14State.trainCfg.baseSpeed * variationFactor, x: startX, el, name: cfg.name })
  })
  g14State.aiTrains = ai
}

function g14Loop() {
  if (!g14State.running) return
  g14State.frame++
  const s = g14State
  const track = document.getElementById('g14-track')
  const trackW = track.clientWidth || s.trackW || 375
  const playerX = trackW * 0.15  // player fixed x position

  // Slow-mode when boost math popup is open — everything crawls so kids can think
  const speedFactor = s.slowMode ? 0.22 : 1

  // Animate rail + parallax scroll speeds based on train speed
  const railSpd = Math.max(0.1, 0.6 / (s.speed * speedFactor)).toFixed(2) + 's'
  document.querySelectorAll('.g14-lane-row').forEach(r => r.style.setProperty('--rspd', railSpd))
  // Treeline strips scroll a bit slower than rails (parallax effect)
  const envSpd = Math.max(0.2, 1.1 / (s.speed * speedFactor)).toFixed(2) + 's'
  document.querySelectorAll('.g14-lane-env').forEach(e => e.style.animationDuration = envSpd)
  // Parallax layers — update animation durations for speed feel
  const fenceEl = document.getElementById('g14-fence')
  const treeEl = document.getElementById('g14-trees')
  if (fenceEl) fenceEl.style.animationDuration = Math.max(0.3, 1.2 / (s.speed * speedFactor)).toFixed(2) + 's'
  if (treeEl) treeEl.style.animationDuration = Math.max(0.8, 3 / (s.speed * speedFactor)).toFixed(2) + 's'

  // Tick down invincibility counter (post-crash grace period)
  if (s.invincible > 0) s.invincible--

  // Move AI trains — relative movement to player (if AI faster, they drift right; if slower, drift left)
  s.aiTrains.forEach(ai => {
    const relSpeed = (ai.speed - s.speed) * 1.8 * speedFactor
    ai.x += relSpeed
    // Wrap: avoid wrapping right through the player zone — jump to far side instead
    if (ai.x < -120) ai.x = trackW + 100
    if (ai.x > trackW + 120) ai.x = -100
    ai.el.style.left = ai.x + 'px'
    // Show "PASS!" when AI train overlaps player in same lane (cosmetic only — no damage)
    if (ai.lane === s.lane && Math.abs(ai.x - playerX) < 80 && !ai._passing) {
      ai._passing = true
      g14ShowPassText()
    } else if (Math.abs(ai.x - playerX) >= 100) {
      ai._passing = false
    }
  })

  // Spawn obstacles
  if (s.frame % s.obstacleInterval === 0) g14SpawnObstacle()

  // Move obstacles left (they come from right)
  const obsSpeed = (s.speed * 2.5 + 1) * speedFactor
  const toRemove = []
  s.obstacles.forEach(obs => {
    obs.x -= obsSpeed
    obs.el.style.left = obs.x + 'px'
    // Collision: obstacle passes through player zone (x=playerX, same lane) — skip if invincible
    if (obs.x <= playerX + 55 && obs.x >= playerX - 20 && obs.lane === s.lane && !obs.hit && !s.invincible) {
      obs.hit = true
      g14Crash()
      toRemove.push(obs)
    }
    if (obs.x < -60) toRemove.push(obs)
  })
  toRemove.forEach(o => {
    if (o.el.parentNode) o.el.remove()
    g14HideLaneWarning(o.lane)
    s.obstacles = s.obstacles.filter(x => x !== o)
  })
  // Show danger warning when obstacle enters warning zone
  s.obstacles.forEach(obs => {
    if (!obs.warned && obs.x < trackW * 0.62) {
      obs.warned = true
      g14ShowLaneWarning(obs.lane)
    }
  })

  // Advance distance
  s.distance += s.speed * 0.12 * speedFactor
  const distFrac = Math.min(1, s.distance / s.finishLine)
  document.getElementById('g14-dist-bar').textContent = `${Math.floor(s.distance)}m`
  document.getElementById('g14-dist-fill').style.width = (distFrac * 100).toFixed(1) + '%'
  document.getElementById('g14-stars').textContent = `🏁 ${Math.floor(s.distance)}m`
  // Checkpoint station markers
  ;[['g14-cp1',0.25],['g14-cp2',0.50],['g14-cp3',0.75]].forEach(([id, threshold]) => {
    if (distFrac >= threshold) {
      const cp = document.getElementById(id)
      if (cp && !cp.classList.contains('reached')) {
        cp.classList.add('reached')
        cp.textContent = '✅'
        try { spawnParticleBurst(cp.getBoundingClientRect().left, cp.getBoundingClientRect().top) } catch(e) {}
      }
    }
  })

  // Speedometer (show km/h from trainCfg, boosted if boosting)
  const dispKmh = Math.round(s.trainCfg.kmh * (s.boosting ? s.trainCfg.boostMult : 1))
  document.getElementById('g14-speedometer').textContent = dispKmh + ' km/h'
  // Wind lines at high speed (31+ km/h)
  const windEl = document.getElementById('g14-wind-lines')
  if (windEl) windEl.style.display = (dispKmh >= 31 && !s.boosting) ? 'block' : 'none'

  // Race position: count how many AI are ahead (x > playerX)
  const aiAhead = s.aiTrains.filter(a => a.x > playerX).length
  const pos = aiAhead + 1
  const medals = ['🥇','🥈','🥉','4️⃣']
  const posEl = document.getElementById('g14-position')
  if (posEl) { const _m = medals[pos-1]; const _mb = _m ? uiBadge(_m, 'width:1em;height:1em;object-fit:contain;vertical-align:middle') : null; posEl.innerHTML = (_mb || _m || (pos + '.')) + ' POSISI ' + pos }

  // Pressure auto-recovery
  if (!s.boosting && s.pressure < 100) {
    s.pressure = Math.min(100, s.pressure + 0.35)
    g14UpdatePressure()
  }

  // Check finish
  if (s.distance >= s.finishLine) { g14Finish(true); return }

  s.animFrame = requestAnimationFrame(g14Loop)
}

const G14_OBS_SVGS = [
  // Rock
  `<svg viewBox="0 0 46 34" width="82" height="60"><ellipse cx="23" cy="28" rx="20" ry="6" fill="#4b5563" opacity="0.3"/><polygon points="8,28 15,10 31,8 38,28" fill="#9ca3af"/><polygon points="15,10 23,5 31,8" fill="#d1d5db"/><polygon points="8,28 15,10 6,20" fill="#6b7280"/></svg>`,
  // Warning sign
  `<svg viewBox="0 0 42 38" width="82" height="74"><polygon points="21,2 40,36 2,36" fill="#fbbf24" stroke="#f59e0b" stroke-width="2"/><rect x="19" y="16" width="4" height="11" rx="2" fill="#1f2937"/><circle cx="21" cy="31" r="2.5" fill="#1f2937"/></svg>`,
  // Cow
  `<svg viewBox="0 0 54 42" width="90" height="70"><ellipse cx="27" cy="40" rx="22" ry="4" fill="#374151" opacity="0.2"/><rect x="12" y="20" width="30" height="18" rx="9" fill="white" stroke="#374151" stroke-width="1.5"/><circle cx="27" cy="20" r="11" fill="white" stroke="#374151" stroke-width="1.5"/><circle cx="22" cy="17" r="3" fill="#374151"/><circle cx="32" cy="17" r="3" fill="#374151"/><circle cx="22" cy="17" r="1.2" fill="white"/><circle cx="32" cy="17" r="1.2" fill="white"/><ellipse cx="27" cy="26" rx="5" ry="3" fill="#374151" opacity="0.25"/><line x1="17" y1="38" x2="17" y2="42" stroke="#374151" stroke-width="2"/><line x1="24" y1="38" x2="24" y2="42" stroke="#374151" stroke-width="2"/><line x1="30" y1="38" x2="30" y2="42" stroke="#374151" stroke-width="2"/><line x1="37" y1="38" x2="37" y2="42" stroke="#374151" stroke-width="2"/></svg>`,
  // Log
  `<svg viewBox="0 0 56 30" width="92" height="50"><rect x="4" y="8" width="48" height="16" rx="8" fill="#92400e"/><ellipse cx="52" cy="16" rx="5" ry="8" fill="#a16207"/><ellipse cx="52" cy="16" rx="3" ry="5" fill="#78350f"/><line x1="4" y1="8" x2="4" y2="24" stroke="#78350f" stroke-width="0.5" opacity="0.5"/><line x1="16" y1="8" x2="16" y2="24" stroke="#78350f" stroke-width="0.5" opacity="0.5"/><line x1="30" y1="8" x2="30" y2="24" stroke="#78350f" stroke-width="0.5" opacity="0.5"/><line x1="43" y1="8" x2="43" y2="24" stroke="#78350f" stroke-width="0.5" opacity="0.5"/></svg>`,
  // Broken rail
  `<svg viewBox="0 0 48 36" width="84" height="63"><rect x="0" y="6" width="18" height="5" rx="2" fill="#ef4444" transform="rotate(-15 9 8)"/><rect x="30" y="6" width="18" height="5" rx="2" fill="#ef4444" transform="rotate(15 39 8)"/><rect x="0" y="22" width="18" height="5" rx="2" fill="#ef4444" transform="rotate(10 9 24)"/><rect x="30" y="22" width="18" height="5" rx="2" fill="#ef4444" transform="rotate(-10 39 24)"/><line x1="22" y1="4" x2="26" y2="32" stroke="#fbbf24" stroke-width="2" opacity="0.8"/></svg>`,
  // Chicken
  `<svg viewBox="0 0 38 38" width="72" height="72"><ellipse cx="19" cy="26" rx="14" ry="12" fill="#fbbf24"/><circle cx="19" cy="13" r="8" fill="#fbbf24"/><polygon points="14,13 12,10 17,12" fill="#f97316"/><circle cx="22" cy="11" r="2" fill="#1f2937"/><circle cx="22.7" cy="10.3" r="0.8" fill="white"/><polygon points="14,38 14,30 17,38" fill="#f97316"/><polygon points="24,38 24,30 21,38" fill="#f97316"/><polygon points="12,16 8,14 11,18" fill="#ef4444"/></svg>`,
  // Large rock / boulder
  `<svg viewBox="0 0 50 38" width="88" height="67"><ellipse cx="25" cy="34" rx="22" ry="5" fill="#374151" opacity="0.25"/><circle cx="25" cy="22" r="16" fill="#6b7280"/><circle cx="20" cy="18" r="8" fill="#9ca3af"/><circle cx="31" cy="28" r="5" fill="#4b5563"/></svg>`,
]
function g14SpawnObstacle() {
  const track = document.getElementById('g14-track')
  const trackW = track.clientWidth || 375
  const lane = Math.floor(Math.random() * 3)
  const svgStr = G14_OBS_SVGS[Math.floor(Math.random() * G14_OBS_SVGS.length)]
  const el = document.createElement('div')
  el.className = 'g14-obstacle'
  el.innerHTML = svgStr
  const startX = trackW + 40
  el.style.left = startX + 'px'
  el.style.top = g14State.laneTopPct[lane] + '%'
  track.appendChild(el)
  g14State.obstacles.push({ lane, x: startX, el, hit: false })
}

function g14SpawnSparks(lane) {
  const track = document.getElementById('g14-track')
  if (!track) return
  const topPct = g14State.laneTopPct[lane]
  const colors = ['#fbbf24','#f97316','#ef4444','#fef08a','#fb923c']
  const dirs = [[-30,-40],[30,-40],[-20,-50],[20,-50],[-40,-20],[40,-20],[0,-50],[10,-30],[-10,-30]]
  dirs.forEach(([dx,dy]) => {
    const s = document.createElement('div')
    s.className = 'g14-spark'
    s.style.cssText = `left:calc(13% + 55px);top:${topPct}%;background:${colors[Math.floor(Math.random()*colors.length)]};--sx:${dx}px;--sy:${dy}px;`
    track.appendChild(s)
    setTimeout(() => s.remove(), 500)
  })
}
function g14ShowPassText() {
  const track = document.getElementById('g14-track')
  if (!track) return
  const el = document.createElement('div')
  el.textContent = 'AMAN! 💨'
  el.style.cssText = 'position:absolute;left:18%;font-size:13px;font-weight:900;color:#4ade80;font-family:\'Fredoka One\',cursive;pointer-events:none;z-index:20;animation:g14FloatUp 0.9s ease forwards;text-shadow:0 0 8px rgba(74,222,128,0.8);'
  el.style.top = (g14State.laneTopPct[g14State.lane] || 30) + '%'
  track.appendChild(el)
  setTimeout(() => el.remove(), 900)
}
function g14Crash() {
  if (g14State.hp <= 0) return
  g14State.invincible = 45  // ~750ms grace period at 60fps
  g14State.hp--
  const livesEl = document.getElementById('g14-lives')
  livesEl.innerHTML = '❤️'.repeat(g14State.hp) + '🖤'.repeat(3 - g14State.hp)
  const player = document.getElementById('g14-player')
  if (player) {
    player.style.animation = 'none'
    void player.offsetWidth
    player.style.animation = 'g14Crash 0.5s ease'
    setTimeout(() => { if (player) player.style.animation = '' }, 500)
  }
  g14SpawnSparks(g14State.lane)
  // Dismiss math popup if open
  clearTimeout(g14State.mathTimeout)
  document.getElementById('g14-math-popup').style.display = 'none'
  playWrong()
  vibrate(30)
  if (g14State.hp <= 0) {
    g14State.running = false
    cancelAnimationFrame(g14State.animFrame)
    // Clear all warnings
    ;[0,1,2].forEach(l => g14HideLaneWarning(l))
    document.getElementById('g14-speed-lines').style.display = 'none'
    const _wlA = document.getElementById('g14-wind-lines'); if (_wlA) _wlA.style.display = 'none'
    const _bwA = document.getElementById('g14-boost-wind'); if (_bwA) _bwA.style.display = 'none'
    g14State.slowMode = false
    setTimeout(() => g14ShowResult(false), 600)
  }
}

function g14LaneUp() {
  if (!g14State.running) return
  if (g14State.lane > 0) { g14State.lane--; g14UpdatePlayerPos(); playClick() }
}
function g14LaneDown() {
  if (!g14State.running) return
  if (g14State.lane < 2) { g14State.lane++; g14UpdatePlayerPos(); playClick() }
}
function g14UpdatePlayerPos() {
  const topPct = g14State.laneTopPct[g14State.lane]
  const player = document.getElementById('g14-player')
  if (player) player.style.top = topPct + '%'
  const fire = document.getElementById('g14-boost-fire')
  if (fire && g14State.boosting) fire.style.top = topPct + '%'
  if (g14State.boosting) {
    const wfr = document.getElementById('g14-wfire-r')
    const wff = document.getElementById('g14-wfire-f')
    if (wfr) wfr.style.top = topPct + '%'
    if (wff) wff.style.top = topPct + '%'
  }
  const ind = document.getElementById('g14-lane-indicator')
  if (ind) ind.style.top = ((g14State.lane) * 33.33) + '%'
  // Highlight active lane with neon glow
  document.querySelectorAll('.g14-lane-row').forEach((row, i) => {
    row.classList.toggle('active-lane', i === g14State.lane)
  })
}

function g14Boost() {
  if (!g14State.running || g14State.boosting || g14State.boostCooldown || g14State.pressure < 30) return
  // Slow down the world so kids can think without stress
  g14State.slowMode = true
  // Show math question — boost executes only on correct answer
  const ops = g14State.diff === 'easy' ? ['+'] : g14State.diff === 'medium' ? ['+','-'] : ['+','-','×']
  const op = ops[Math.floor(Math.random() * ops.length)]
  let a, b, answer
  if (op === '+') { a = Math.floor(Math.random()*12)+1; b = Math.floor(Math.random()*12)+1; answer = a+b }
  else if (op === '-') { a = Math.floor(Math.random()*15)+6; b = Math.floor(Math.random()*a)+1; answer = a-b }
  else { a = Math.floor(Math.random()*6)+2; b = Math.floor(Math.random()*6)+2; answer = a*b }
  g14State.boostQ = { answer, origSpeed: g14State.speed }
  const wrong = new Set()
  while (wrong.size < 2) {
    const delta = Math.floor(Math.random()*6)+1
    const w = answer + (Math.random() < 0.5 ? delta : -delta)
    if (w !== answer && w > 0) wrong.add(w)
  }
  const choices = [answer, ...[...wrong]].sort(() => Math.random() - 0.5)
  document.getElementById('g14-math-q-text').textContent = `${a} ${op.replace('×','×')} ${b} = ?`
  const choicesEl = document.getElementById('g14-math-choices')
  choicesEl.innerHTML = ''
  choices.forEach(c => {
    const btn = document.createElement('button')
    btn.className = 'g14-math-btn'
    btn.textContent = c
    btn.onclick = () => g14BoostAnswer(c)
    choicesEl.appendChild(btn)
  })
  document.getElementById('g14-math-popup').style.display = 'block'
  clearTimeout(g14State.mathTimeout)
  g14State.mathTimeout = setTimeout(() => {
    document.getElementById('g14-math-popup').style.display = 'none'
    g14State.slowMode = false
  }, 15000)
  playClick()
}

function g14BoostAnswer(val) {
  clearTimeout(g14State.mathTimeout)
  document.getElementById('g14-math-popup').style.display = 'none'
  g14State.slowMode = false  // restore normal speed regardless of answer
  if (!g14State.running || g14State.boosting) return
  if (val === g14State.boostQ.answer) {
    // Correct — execute boost
    g14State.boosting = true
    g14State.boostCooldown = true
    g14State.pressure = Math.max(10, g14State.pressure - 30)
    g14UpdatePressure()
    const origSpeed = g14State.boostQ.origSpeed
    g14State.speed = origSpeed * g14State.trainCfg.boostMult
    document.getElementById('g14-boost-btn').textContent = '🔥 BOOSTING!'
    document.getElementById('g14-boost-btn').style.opacity = '0.6'
    const fireEl = document.getElementById('g14-boost-fire')
    const wFireR = document.getElementById('g14-wfire-r')
    const wFireF = document.getElementById('g14-wfire-f')
    const lanePct = g14State.laneTopPct[g14State.lane] + '%'
    if (fireEl) { fireEl.style.display = 'block'; fireEl.style.top = lanePct }
    if (wFireR) { wFireR.style.display = 'block'; wFireR.style.top = lanePct }
    if (wFireF) { wFireF.style.display = 'block'; wFireF.style.top = lanePct }
    const linesEl = document.getElementById('g14-speed-lines')
    if (linesEl) linesEl.style.display = 'block'
    const windEl = document.getElementById('g14-boost-wind')
    if (windEl) windEl.style.display = 'block'
    playCorrect()
    clearTimeout(g14State.boostTimer)
    g14State.boostTimer = setTimeout(() => {
      g14State.speed = origSpeed
      g14State.boosting = false
      if (fireEl) fireEl.style.display = 'none'
      if (wFireR) wFireR.style.display = 'none'
      if (wFireF) wFireF.style.display = 'none'
      if (linesEl) linesEl.style.display = 'none'
      if (windEl) windEl.style.display = 'none'
      document.getElementById('g14-boost-btn').textContent = '⏳ Cooldown...'
      document.getElementById('g14-boost-ready').style.display = 'none'
      setTimeout(() => {
        g14State.boostCooldown = false
        document.getElementById('g14-boost-btn').textContent = '🔥 BOOST!'
        document.getElementById('g14-boost-btn').style.opacity = '1'
        document.getElementById('g14-boost-ready').style.display = 'block'
        setTimeout(() => { document.getElementById('g14-boost-ready').style.display = 'none' }, 2000)
      }, 3000)
    }, g14State.trainCfg.boostDur)
  } else {
    // Wrong — pressure penalty, no boost
    g14State.pressure = Math.max(10, g14State.pressure - 18)
    g14UpdatePressure()
    const btn = document.getElementById('g14-boost-btn')
    btn.textContent = '❌ Salah!'
    setTimeout(() => { btn.textContent = '🔥 BOOST!' }, 1200)
    playWrong()
    vibrate(20)
  }
}

function g14ShowLaneWarning(lane) {
  const el = document.getElementById('g14-warn-' + lane)
  if (el) el.style.display = 'block'
}
function g14HideLaneWarning(lane) {
  const el = document.getElementById('g14-warn-' + lane)
  if (el) el.style.display = 'none'
}

function g14UpdatePressure() {
  const pct = g14State.pressure
  document.getElementById('g14-pressure-bar').style.width = pct + '%'
  const wrap = document.getElementById('g14-boiler-wrap')
  if (wrap) {
    if (pct >= 60) {
      if (pct >= 80) wrap.classList.add('danger')
      else wrap.classList.remove('danger')
      // Puff steam smoke particles
      if (Math.random() < 0.8) g14EmitSmoke()
    } else {
      wrap.classList.remove('danger')
    }
  }
}

function g14EmitSmoke() {
  const track = document.getElementById('g14-track')
  if (!track) return
  const lane = g14State.lane
  const topPct = ((lane + 0.5) * 33.33) + '%'
  // Spawn 3 particles per call
  for (let i = 0; i < 3; i++) {
    const s = document.createElement('div')
    s.className = i === 2 ? 'g14-boost-smoke rear' : 'g14-boost-smoke'
    s.style.top = topPct
    const sz = (12 + Math.random() * 18) + 'px'
    s.style.width = s.style.height = sz
    s.style.opacity = (0.6 + Math.random() * 0.3).toFixed(2)
    s.style.animationDelay = (i * 0.12) + 's'
    track.appendChild(s)
    setTimeout(() => s.remove(), 1100)
  }
}

function g14Finish(won) {
  g14State.running = false
  g14BgAudio.pause(); g14BgAudio.currentTime = 0
  g14HornAudio.pause(); g14HornAudio.currentTime = 0
  cancelAnimationFrame(g14State.animFrame)
  ;[0,1,2].forEach(l => g14HideLaneWarning(l))
  document.getElementById('g14-speed-lines').style.display = 'none'
  const _wlB = document.getElementById('g14-wind-lines'); if (_wlB) _wlB.style.display = 'none'
  const _bwnd = document.getElementById('g14-boost-wind'); if (_bwnd) _bwnd.style.display = 'none'
  const _bwB = document.getElementById('g14-boiler-wrap'); if (_bwB) _bwB.classList.remove('danger')
  clearTimeout(g14State.mathTimeout)
  document.getElementById('g14-math-popup').style.display = 'none'
  setTimeout(() => g14ShowResult(won), 300)
}

function g14ShowResult(won) {
  const pct = g14State.distance / g14State.finishLine
  const perfStars = won ? (g14State.hp === 3 ? 5 : pct >= 0.9 ? 4 : 3) : (pct >= 0.6 ? 2 : 1)
  state.gameStars[state.currentPlayer] = perfStars
  const cfg = g14State.trainCfg
  const msg = won
    ? `${cfg.name} melaju ${Math.floor(g14State.finishLine)}m! Sisa HP: ${g14State.hp}/3`
    : `Sudah ${Math.floor(g14State.distance)}m dari ${g14State.finishLine}m. Coba lagi!`
  const btns = [{label:'Main Lagi 🔄', action:()=>g14Replay()}]
  if(won && (state.selectedLevelNum||1) < 20) btns.unshift({label:'Level Berikutnya ➡️', action:()=>startGameWithLevel((state.selectedLevelNum||1)+1)})
  btns.push({label:'Kembali ⌂', action:()=>endGameFromOverlay()})
  showGameResult({ emoji:won?'🏆':'💨', title:won?'MENANG!':'Kurang Jauh...', stars:perfStars, msg, buttons:btns })
  if (won) { playCorrect(); endGame(perfStars) }
}

function g14Replay() {
  g14State.obstacles.forEach(o => { if (o.el.parentNode) o.el.remove() })
  g14State.aiTrains.forEach(a => { if (a.el.parentNode) a.el.remove() })
  cancelAnimationFrame(g14State.animFrame)
  initGame14()
  playClick()
}

// ============================================================
// GAME 15 — LOKOMOTIF PEMBERANI 💪
// ============================================================
const G15_WORDS = {
  easy:   [{word:'AYAM',emoji:'🐔'},{word:'IKAN',emoji:'🐟'},{word:'KUDA',emoji:'🐴'},{word:'BUKU',emoji:'📚'},{word:'BOLA',emoji:'⚽'},{word:'MATA',emoji:'👁️'},{word:'SAPI',emoji:'🐄'},{word:'TOPI',emoji:'🎩'}],
  medium: [{word:'GAJAH',emoji:'🐘'},{word:'SINGA',emoji:'🦁'},{word:'PANDA',emoji:'🐼'},{word:'BUNGA',emoji:'🌸'},{word:'RUMAH',emoji:'🏠'},{word:'MAKAN',emoji:'🍽️'},{word:'BURUNG',emoji:'🐦'},{word:'KELINCI',emoji:'🐰'}],
  hard:   [{word:'HARIMAU',emoji:'🐯'},{word:'JERAPAH',emoji:'🦒'},{word:'KUPU-KUPU',emoji:'🦋'},{word:'SEKOLAH',emoji:'🏫'},{word:'PELANGI',emoji:'🌈'},{word:'BINTANG',emoji:'⭐'},{word:'GELOMBANG',emoji:'🌊'}]
}

let g15State = {}

function initGame15() {
  battleBgmStop()
  const lv = state.selectedLevelNum || 1
  try { sessionStorage.setItem('g15Config', JSON.stringify({ level: lv })) } catch(_) {}
  window.location.href = 'games/lokomotif-pemberani.html'
}

function g15LoadWord() {
  const entry = g15State.words[g15State.wordIdx % g15State.words.length]
  g15State.currentWord = entry.word.replace('-','')
  g15State.currentEmoji = entry.emoji
  g15State.collectedIdx = 0
  g15State.usedTiles = []
  g15RenderChains()
  g15RenderSlots()
  g15RenderImage()
  g15RenderLetterTiles()
  document.getElementById('g15-progress-msg').textContent = `Kata ${g15State.wordIdx + 1} / ${g15State.totalChains}`
}

function g15RenderChains() {
  const wrap = document.getElementById('g15-chains')
  wrap.innerHTML = ''
  for (let i = 0; i < g15State.totalChains; i++) {
    const span = document.createElement('span')
    span.className = 'g15-chain-link'
    span.id = `g15-chain-${i}`
    if (i >= g15State.chainsLeft) span.classList.add('broken')
    wrap.appendChild(span)
  }
  document.getElementById('g15-chain-count').textContent = `⛓️ ${g15State.chainsLeft}`
}

function g15RenderSlots() {
  const wrap = document.getElementById('g15-word-slots')
  wrap.innerHTML = ''
  for (let i = 0; i < g15State.currentWord.length; i++) {
    const slot = document.createElement('div')
    slot.className = 'g15-slot'
    slot.id = `g15-slot-${i}`
    slot.textContent = i < g15State.collectedIdx ? g15State.currentWord[i] : '_'
    if (i < g15State.collectedIdx) slot.classList.add('filled')
    wrap.appendChild(slot)
  }
}

function g15RenderImage() {
  const wrap = document.getElementById('g15-image-wrap')
  wrap.innerHTML = ''
  wrap.style.fontSize = '56px'
  wrap.textContent = g15State.currentEmoji
}

function g15RenderLetterTiles() {
  const word = g15State.currentWord
  const decoys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter(c => !word.includes(c))
  const extraCount = Math.max(2, Math.min(5, 10 - word.length))
  const shuffled = [...word.split(''), ...decoys.slice(0, extraCount)].sort(()=>Math.random()-0.5)
  const wrap = document.getElementById('g15-letters')
  wrap.innerHTML = ''
  shuffled.forEach((letter, idx) => {
    const btn = document.createElement('button')
    btn.className = 'g15-letter-tile'
    btn.textContent = letter
    btn.id = `g15-ltile-${idx}`
    btn.onclick = () => g15TapLetter(letter, idx)
    wrap.appendChild(btn)
  })
}

function g15TapLetter(letter, tileIdx) {
  if (!g15State.running) return
  const needed = g15State.currentWord[g15State.collectedIdx]
  const slot = document.getElementById(`g15-slot-${g15State.collectedIdx}`)
  const tile = document.getElementById(`g15-ltile-${tileIdx}`)
  if (letter === needed) {
    g15State.collectedIdx++
    if (slot) { slot.textContent = letter; slot.classList.add('filled','correct') }
    if (tile) tile.classList.add('used')
    playCorrect()
    if (g15State.collectedIdx >= g15State.currentWord.length) {
      setTimeout(() => g15WordComplete(), 300)
    }
  } else {
    if (slot) { slot.classList.add('wrong'); setTimeout(() => slot.classList.remove('wrong'), 400) }
    if (tile) { tile.style.animation = 'g15Shake 0.35s'; setTimeout(() => { tile.style.animation = '' }, 350) }
    playWrong()
  }
}

function g15WordComplete() {
  g15State.wordIdx++
  g15State.chainsLeft = Math.max(0, g15State.chainsLeft - 1)
  const chainIdx = g15State.totalChains - g15State.chainsLeft - 1
  const chainEl = document.getElementById(`g15-chain-${chainIdx}`)
  if (chainEl) {
    chainEl.classList.add('breaking')
    setTimeout(() => { chainEl.classList.remove('breaking'); chainEl.classList.add('broken') }, 600)
  }
  document.getElementById('g15-progress-msg').textContent = '⛓️ Rantai putus! 🎉'
  const trainIcon = document.getElementById('g15-train-icon')
  trainIcon.style.animation = 'g15TrainBounce 0.5s ease-in-out 2'
  setTimeout(() => { trainIcon.style.animation = '' }, 1000)
  if (g15State.chainsLeft <= 0) {
    setTimeout(() => g15Win(), 800)
  } else {
    setTimeout(() => g15LoadWord(), 1000)
  }
}

function g15Win() {
  g15State.running = false
  const perfStars = 5
  state.gameStars[state.currentPlayer] = perfStars
  showGameResult({
    emoji:'🚂', title:'Kereta Bebas!', stars:perfStars,
    msg:`Semua ${g15State.totalChains} rantai putus! Lokomotif pemberani berhasil!`,
    buttons:[{label:'Main Lagi 🔄', action:()=>initGame15()},{label:'Kembali ⌂', action:()=>endGameFromOverlay()}]
  })
  playCorrect()
}

// ============================================================
// GAME 16 — SELAMATKAN KERETA 🆘
// ============================================================
const G16_WORDS = {
  easy:   [{word:'KAIT',emoji:'🪝'},{word:'TALI',emoji:'🪢'},{word:'KUAT',emoji:'💪'},{word:'BISA',emoji:'✅'},{word:'MAJU',emoji:'🚀'},{word:'JAGA',emoji:'🛡️'}],
  medium: [{word:'SELAMAT',emoji:'🎉'},{word:'KERETATALI',emoji:'🚃'},{word:'TARIK',emoji:'💪'},{word:'BERANI',emoji:'🦁'},{word:'JURANG',emoji:'⛰️'},{word:'BANTU',emoji:'🤝'}],
  hard:   [{word:'PERTOLONGAN',emoji:'🆘'},{word:'PEMBERANI',emoji:'🦸'},{word:'JEMBATAN',emoji:'🌉'},{word:'SELAMATKAN',emoji:'✅'},{word:'KEBERANIAN',emoji:'💎'}]
}

let g16State = {}

function initGame16() {
  battleBgmStop()
  const lv = state.selectedLevelNum || 1
  try { sessionStorage.setItem('g16Config', JSON.stringify({ level: lv })) } catch(_) {}
  window.location.href = 'games/selamatkan-kereta.html'
}

// ───────────────────────────────────────────────────────────────────────
// v54.6 G16 Deep Polish helpers (owner's favorite — VFX/physics/audio
// layer on top of the rope-rescue "Selamatkan Kereta" loop). Pure DOM
// + CSS; no engine refactor. CSS keyframes live in style.css.
// ───────────────────────────────────────────────────────────────────────
function g16SpawnSparks(cx, cy, count, emoji){
  count = count || 8
  emoji = emoji || ['✨','⭐','💫'][0]
  for (let i = 0; i < count; i++){
    const sp = document.createElement('span')
    sp.className = 'g16-spark-particle'
    sp.textContent = ['✨','⭐','💫'][i % 3]
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3
    const dist = 50 + Math.random() * 40
    sp.style.left = cx + 'px'
    sp.style.top  = cy + 'px'
    sp.style.setProperty('--dx', Math.cos(angle) * dist + 'px')
    sp.style.setProperty('--dy', Math.sin(angle) * dist + 'px')
    sp.style.animationDelay = (i * 25) + 'ms'
    document.body.appendChild(sp)
    setTimeout(() => { try { sp.remove() } catch(_){} }, 800 + i * 25)
  }
}
function g16SpawnDust(cx, cy, count){
  count = count || 12
  for (let i = 0; i < count; i++){
    const d = document.createElement('div')
    d.className = 'g16-dust-particle'
    d.style.left = (cx + (Math.random() - 0.5) * 30) + 'px'
    d.style.top  = (cy + Math.random() * 8) + 'px'
    d.style.setProperty('--dx', ((-1 - Math.random()) * 25 - i * 3) + 'px')
    d.style.setProperty('--dy', (-5 - Math.random() * 12) + 'px')
    d.style.animationDelay = (i * 18) + 'ms'
    document.body.appendChild(d)
    setTimeout(() => { try { d.remove() } catch(_){} }, 900 + i * 18)
  }
}
function g16ScreenShake(intensity){
  const root = document.getElementById('screen-game16')
  if (!root) return
  if (intensity > 1) root.style.setProperty('--shake-amp', intensity + 'px')
  root.classList.remove('g16-screen-shake')
  void root.offsetWidth   // reflow to restart animation
  root.classList.add('g16-screen-shake')
  setTimeout(() => root.classList.remove('g16-screen-shake'), 320)
}
function g16FullScreenDangerFlash(){
  // dedup — don't stack flashes
  if (document.querySelector('.g16-danger-flash')) return
  const fl = document.createElement('div')
  fl.className = 'g16-danger-flash'
  document.body.appendChild(fl)
  setTimeout(() => { try { fl.remove() } catch(_){} }, 650)
}
function g16ShowCelebrationText(text){
  // Remove any prior celebration
  document.querySelectorAll('.g16-celebration-text').forEach(el => { try { el.remove() } catch(_){} })
  const el = document.createElement('div')
  el.className = 'g16-celebration-text'
  el.textContent = text
  document.body.appendChild(el)
  setTimeout(() => { try { el.remove() } catch(_){} }, 1600)
}
function g16PlayStingPull(){
  // (item 99) distinct audio sting differentiating g16PullComplete from playCorrect
  try {
    playTone(880,  0.10, 0.10)
    setTimeout(() => playTone(1100, 0.10, 0.10), 90)
    setTimeout(() => playTone(1400, 0.18, 0.10), 200)
    setTimeout(() => playTone(720,  0.22, 0.07), 320)
  } catch(_){}
}

function g16BeginGame() {
  document.getElementById('g16-start-overlay').style.display = 'none'
  g16State.running = true
  // v54.6: reset polish state for a fresh run.
  g16State._dangerFlashAccum = 0
  document.body.classList.remove('g16-slowmo')
  const dfEl = document.getElementById('g16-danger-fill')
  if (dfEl) dfEl.classList.remove('crit')
  g16StartDangerTimer()
  g16StartPhase1()
}

function g16StartDangerTimer() {
  clearInterval(g16State.dangerInterval)
  g16State.dangerInterval = setInterval(() => {
    if (!g16State.running) { clearInterval(g16State.dangerInterval); return }
    // The pause overlay blocks input but not this interval: the danger meter kept
    // filling behind it and could reach 100 (= game over) while the child was away.
    // Gate: tools/qa-pause-leaks.mjs
    if (state && state.paused) return
    g16State.danger = Math.min(100, g16State.danger + 2)
    const dfEl = document.getElementById('g16-danger-fill')
    if (dfEl) dfEl.style.width = g16State.danger + '%'
    // v54.6 (item 92): periodic red flash when danger >= 60. Throttled to once
    // per ~1.6s so it builds tension without strobing.
    if (g16State.danger >= 60) {
      g16State._dangerFlashAccum = (g16State._dangerFlashAccum | 0) + 1
      if (g16State._dangerFlashAccum >= 4) {
        g16State._dangerFlashAccum = 0
        g16FullScreenDangerFlash()
      }
    } else {
      g16State._dangerFlashAccum = 0
    }
    // v54.6 (item 96): danger bar pulsing glow when >= 75.
    if (dfEl) dfEl.classList.toggle('crit', g16State.danger >= 75)
    const victim = document.getElementById('g16-victim-train')
    const rightPct = 8 + (g16State.danger / 100) * 14
    victim.style.right = (22 - rightPct) + '%'
    if (g16State.danger >= 30) victim.classList.add('g16-victim-danger')
    if (g16State.danger >= 100) {
      clearInterval(g16State.dangerInterval)
      g16EndGame(false)
    }
  }, 600)
}

function g16StartPhase1() {
  g16State.phase = 1
  g16State.hookTries = 0
  g16State.hookSuccess = false
  document.getElementById('g16-phase1').style.display = 'flex'
  document.getElementById('g16-phase2').style.display = 'none'
  document.getElementById('g16-hook-result').textContent = ''
  g16UpdateHookTries()
  clearInterval(g16State.needleInterval)
  g16State.needlePos = 0
  g16State.needleDir = 1
  g16State.needleInterval = setInterval(() => {
    if (state && state.paused) return   // freeze the QTE needle with the game
    g16State.needlePos += g16State.needleDir * g16State.needleSpeed
    if (g16State.needlePos >= 100) { g16State.needlePos = 100; g16State.needleDir = -1 }
    if (g16State.needlePos <= 0)   { g16State.needlePos = 0;   g16State.needleDir = 1  }
    const needle = document.getElementById('g16-needle')
    if (needle) needle.style.left = `calc(${g16State.needlePos}% - 4px)`
    // Show TAP indicator when needle is in green zone (33-67%)
    const tapEl = document.getElementById('g16-tap-indicator')
    if (tapEl) {
      const inGreen = g16State.needlePos >= 33 && g16State.needlePos <= 67
      tapEl.classList.toggle('show', inGreen)
    }
  }, 20)
}

function g16UpdateHookTries() {
  const el = document.getElementById('g16-hook-tries')
  if (el) el.textContent = `Percobaan: ${g16State.hookTries} / ${g16State.maxHookTries}`
}

function g16ThrowHook() {
  if (g16State.hookSuccess || g16State.phase !== 1) return
  const pos = g16State.needlePos
  const inGreen = pos >= 33 && pos <= 67
  g16State.hookTries++
  g16UpdateHookTries()
  const resultEl = document.getElementById('g16-hook-result')
  if (inGreen) {
    clearInterval(g16State.needleInterval)
    g16State.hookSuccess = true
    resultEl.textContent = '✅ KENA! Kait berhasil!'
    resultEl.style.color = '#A5D6A7'
    document.getElementById('g16-throw-btn').disabled = true
    playCorrect()
    // v54.6 (item 90): screen shake on green-zone hit.
    g16ScreenShake()
    // v54.6 (item 91): rope tension oscillation — damped sine wave 1.2s.
    const _rope = document.getElementById('g16-rope')
    if (_rope) {
      _rope.classList.remove('g16-rope-tension'); void _rope.offsetWidth
      _rope.classList.add('g16-rope-tension')
    }
    // v54.6 (item 97): 8-star sparkle burst from hook button (player side).
    const _throwBtn = document.getElementById('g16-throw-btn')
    if (_throwBtn) {
      const r = _throwBtn.getBoundingClientRect()
      g16SpawnSparks(r.left + r.width / 2, r.top + r.height / 2, 8)
    }
    // Speed up danger a bit to build tension
    clearInterval(g16State.dangerInterval)
    g16State.dangerInterval = setInterval(() => {
      if (!g16State.running) return
      if (state && state.paused) return
      g16State.danger = Math.min(100, g16State.danger + 1.5)
      document.getElementById('g16-danger-fill').style.width = g16State.danger + '%'
      if (g16State.danger >= 100) { clearInterval(g16State.dangerInterval); g16EndGame(false) }
    }, 600)
    setTimeout(() => {
      // v54.6 (item 98): phase 1→2 wipe transition. Animate out, then hide,
      // start phase 2 (which animates in via g16StartPhase2).
      const _p1 = document.getElementById('g16-phase1')
      if (_p1) {
        _p1.classList.add('g16-phase-out')
        setTimeout(() => {
          _p1.style.display = 'none'
          _p1.classList.remove('g16-phase-out')
        }, 250)
      } else {
        document.getElementById('g16-phase1').style.display = 'none'
      }
      document.getElementById('g16-throw-btn').disabled = false
      g16StartPhase2()
    }, 800)
  } else {
    resultEl.textContent = '❌ Meleset! Coba lagi...'
    resultEl.style.color = '#FFCDD2'
    playWrong()
    if (g16State.hookTries >= g16State.maxHookTries) {
      clearInterval(g16State.needleInterval)
      setTimeout(() => g16EndGame(false), 600)
    }
  }
}

function g16StartPhase2() {
  g16State.phase = 2
  const tapsNeeded = g16State.diff === 'easy' ? 5 : g16State.diff === 'medium' ? 8 : 12
  g16State.tapsNeeded = tapsNeeded
  g16State.tapCount = 0
  const p2 = document.getElementById('g16-phase2')
  p2.style.display = 'flex'
  // v54.6 (item 98): phase-in wipe animation matching phase-out.
  p2.classList.remove('g16-phase-in'); void p2.offsetWidth
  p2.classList.add('g16-phase-in')
  setTimeout(() => p2.classList.remove('g16-phase-in'), 260)
  document.getElementById('g16-pull-fill').style.width = '0%'
  document.getElementById('g16-tap-count-display').textContent = `TAP 0 / ${tapsNeeded}`
  document.getElementById('g16-word-progress').textContent = `Tarik ${g16State.wordsComplete + 1} / ${g16State.wordsNeeded}`
  const btn = document.getElementById('g16-tap-btn')
  if (btn) btn.style.transform = 'scale(1)'
}

function g16TapPull() {
  if (g16State.phase !== 2) return
  g16State.tapCount++
  // Button bounce animation
  const btn = document.getElementById('g16-tap-btn')
  if (btn) {
    btn.style.transform = 'scale(0.82)'
    btn.style.boxShadow = '0 3px 0 #BF360C,0 0 0 6px rgba(255,160,80,0.25)'
    setTimeout(() => {
      btn.style.transform = 'scale(1.08)'
      btn.style.boxShadow = '0 8px 0 #BF360C,0 0 0 6px rgba(255,160,80,0.4)'
      setTimeout(() => { btn.style.transform = 'scale(1)'; btn.style.boxShadow = '' }, 80)
    }, 80)
  }
  // v54.6 (item 94): rope rubber-band stretch on every tap.
  const rope = document.getElementById('g16-rope')
  if (rope) {
    rope.classList.remove('g16-rope-stretch'); void rope.offsetWidth
    rope.classList.add('g16-rope-stretch')
  }
  // v54.6 (item 93): proportional screen-shake increases with tap count.
  if (g16State.tapCount % 2 === 0) {
    g16ScreenShake(1 + Math.min(g16State.tapCount / 4, 2))
  }
  // v54.6 (item 93): 6-particle burst at button center per tap.
  if (btn) {
    const r = btn.getBoundingClientRect()
    g16SpawnSparks(r.left + r.width / 2, r.top + r.height / 2, 6, '✨')
  }
  // Sound — preserve existing pitch ramp, add a low-pass-style sweep via
  // chord (item 93).
  playTone(Math.min(300 + g16State.tapCount * 25, 900), 0.18, 0.07)
  if (g16State.tapCount % 3 === 0) {
    setTimeout(() => playTone(Math.min(180 + g16State.tapCount * 18, 540), 0.10, 0.05), 30)
  }
  // Update bar and counter
  const pct = Math.min(100, (g16State.tapCount / g16State.tapsNeeded) * 100)
  document.getElementById('g16-pull-fill').style.width = pct + '%'
  document.getElementById('g16-tap-count-display').textContent = `TAP ${g16State.tapCount} / ${g16State.tapsNeeded}`
  if (g16State.tapCount >= g16State.tapsNeeded) {
    document.getElementById('g16-phase2').style.display = 'none'
    g16PullComplete()
  }
}

function g16PullComplete() {
  g16State.wordsComplete++
  g16State.wordIdx++
  // Reduce danger and move victim train away from cliff
  g16State.danger = Math.max(0, g16State.danger - 25)
  document.getElementById('g16-danger-fill').style.width = g16State.danger + '%'
  const dfEl = document.getElementById('g16-danger-fill')
  if (dfEl) dfEl.classList.toggle('crit', g16State.danger >= 75)
  const victim = document.getElementById('g16-victim-train')
  const newRight = Math.min(20, 8 + (g16State.danger / 100) * 14)
  // v54.6 (item 95): ease-out cubic-bezier bounce on victim-train pull-away.
  if (victim) {
    victim.style.transition = 'right 0.8s cubic-bezier(.34,1.56,.64,1)'
    victim.style.right = (22 - newRight) + '%'
    // v54.6 (item 95): dust trail from victim train wheels.
    const r = victim.getBoundingClientRect()
    g16SpawnDust(r.left + r.width * 0.5, r.bottom - 6, 12)
  }
  document.getElementById('g16-stars-badge').textContent = `🆘 ${g16State.wordsComplete}`
  // v54.6 (item 99): distinct pull-complete sting differentiated from playCorrect.
  g16PlayStingPull()
  // refine — brief "AMAN!" celebration.
  g16ShowCelebrationText('🆘 AMAN!')
  if (g16State.wordsComplete >= g16State.wordsNeeded) {
    clearInterval(g16State.dangerInterval)
    setTimeout(() => g16EndGame(true), 600)
  } else {
    // Go back to Phase 1 (hook throw) for next pull
    setTimeout(() => {
      g16State.hookSuccess = false
      document.getElementById('g16-throw-btn').disabled = false
      g16StartPhase1()
    }, 700)
  }
}

function g16EndGame(won) {
  g16State.running = false
  clearInterval(g16State.needleInterval)
  clearInterval(g16State.dangerInterval)
  document.getElementById('g16-phase1').style.display = 'none'
  document.getElementById('g16-phase2').style.display = 'none'
  const _victim = document.getElementById('g16-victim-train')
  const _dfEl = document.getElementById('g16-danger-fill')
  if (_dfEl) _dfEl.classList.remove('crit')
  if (won) {
    // v54.6 (item 101): victory train slides across the screen with confetti
    // + big celebration text + champion fanfare.
    if (_victim) _victim.classList.add('victory-slide')
    g16ShowCelebrationText('🏆 MENANG!')
    try {
      if (typeof spawnConfetti === 'function') spawnConfetti(48)
      playTone(523, 0.18, 0.10); setTimeout(()=>playTone(659,0.18,0.10), 110)
      setTimeout(()=>playTone(784,0.18,0.10), 220); setTimeout(()=>playTone(1047,0.30,0.10), 330)
    } catch(_){}
  } else if (g16State.danger >= 100) {
    // v54.6 (item 100): slow-mo bullet-time when danger hits 100. Body class
    // throttles CSS transitions on the screen; auto-clears after 1200ms.
    document.body.classList.add('g16-slowmo')
    g16FullScreenDangerFlash()
    setTimeout(() => document.body.classList.remove('g16-slowmo'), 1300)
  }
  const pct = g16State.wordsComplete / g16State.wordsNeeded
  const perfStars = won ? (g16State.danger < 20 ? 5 : g16State.danger < 50 ? 4 : 3) : (pct >= 0.5 ? 2 : 1)
  state.gameStars[state.currentPlayer] = perfStars
  const msg = won
    ? `Berhasil menyelamatkan kereta dengan ${g16State.wordsComplete} tarikan! Saling membantu itu hebat!`
    : `Sudah ${g16State.wordsComplete} dari ${g16State.wordsNeeded} tarikan. Jangan menyerah!`
  showGameResult({
    emoji:won?'🎉':'😢', title:won?'KERETA SELAMAT!':'Kereta Jatuh...', stars:perfStars, msg,
    buttons:[{label:'Main Lagi 🔄', action:()=>initGame16()},{label:'Kembali ⌂', action:()=>endGameFromOverlay()}]
  })
  if (won) playCorrect(); else playWrong()
}

// ============================================================
// GAME 17 — JEMBATAN GOYANG 🌉
// ============================================================
let g17State = {}

function initGame17() {
  // v56.6 E7 — G17 (Jembatan Goyang) was REMOVED at owner request (v55.67, "konsepnya
  // nggak ada"); games/jembatan-goyang.html does not exist, so the old redirect 404'd.
  // The map tile is gone, so this should be unreachable — if anything still calls it,
  // return to the world map instead of a dead page.
  battleBgmStop()
  try { showScreen('screen-menu') } catch(_){}
  return  // hard-exit — legacy code below is dead.
  // ── LEGACY (whack-a-mole, removed in v54.7) ────────────────────────────
  const diff = lv <= 7 ? 'easy' : lv <= 14 ? 'medium' : 'hard'
  const totalBlocks = diff === 'easy' ? 8 : diff === 'medium' ? 10 : 12
  g17State = {
    diff, lv, totalBlocks,
    blocks: [], currentActive: -1,
    tapped: [], damage: 0, maxDamage: 3,
    timer: 30, timerInterval: null,
    baseDelay: diff === 'easy' ? 1800 : diff === 'medium' ? 1400 : 1000,
    stepDelay: diff === 'easy' ? 50 : diff === 'medium' ? 40 : 30,
    lightTimeout: null, running: false,
    correct: 0, combo: 0, bestCombo: 0, stars: 0
  }
  document.getElementById('g17-level').textContent = `Lv.${lv}`
  document.getElementById('g17-stars-badge').textContent = '🌉 0'
  document.getElementById('g17-combo').textContent = ''
  g17RenderLives()
  const flEl = document.getElementById('g17-floaters'); if(flEl) flEl.innerHTML = ''
  hideGameResult()
  const trainWrap = document.getElementById('g17-train-waiting')
  trainWrap.style.animation = ''
  trainWrap.style.left = '4%'
  // Render a proper steam loco SVG using G14 builder
  const g17Cfg = TRAIN_TYPES_14['malivlakb250'] || TRAIN_TYPES_14['b2507'] || G14_CATEGORIES[0].trains[0]
  trainWrap.innerHTML = buildSteamLocoSVG(g17Cfg, {width:160, height:70, animate:true})
  document.getElementById('g17-start-overlay').style.display = 'flex'
  document.getElementById('g17-cracks').innerHTML = ''
  g17RenderBlocks()
}

function g17RenderBlocks() {
  const bridge = document.getElementById('g17-bridge')
  bridge.innerHTML = ''
  const colors = ['#E53935','#FB8C00','#FDD835','#43A047','#1E88E5','#8E24AA','#00ACC1','#F06292','#78909C','#6D4C41','#26A69A','#EC407A']
  g17State.blocks = []
  for (let i = 0; i < g17State.totalBlocks; i++) {
    const block = document.createElement('div')
    block.className = 'g17-block'
    const num = i + 1
    // Consistent wooden-plank numbers (1..totalBlocks); wooden gradient from CSS.
    block.textContent = `${num}`
    block.dataset.idx = i
    block.onclick = () => g17TapBlock(i)
    bridge.appendChild(block)
    g17State.blocks.push({ el: block, idx: i, tapped: false })
  }
}

function g17StartGame() {
  document.getElementById('g17-start-overlay').style.display = 'none'
  g17State.running = true
  g17State.timer = 30
  g17StartTimer()
  setTimeout(() => g17LightNextBlock(), 400)
}

function g17StartTimer() {
  clearInterval(g17State.timerInterval)
  g17State.timerInterval = setInterval(() => {
    if (!g17State.running) { clearInterval(g17State.timerInterval); return }
    // Same leak as G16's danger meter: the 30s countdown ran behind the pause
    // overlay and could end the round at 0 while the game was "paused".
    // Gate: tools/qa-pause-leaks.mjs
    if (state && state.paused) return
    g17State.timer = Math.max(0, g17State.timer - 1)
    const timerText = document.getElementById('g17-timer-text')
    const timerBar = document.getElementById('g17-timer-bar')
    if (timerText) timerText.textContent = g17State.timer
    if (timerBar) timerBar.style.width = (g17State.timer / 30 * 100) + '%'
    if (g17State.timer <= 0) {
      clearInterval(g17State.timerInterval)
      if (g17State.running) g17EndGame(false)
    }
  }, 1000)
}

function g17LightNextBlock() {
  if (!g17State.running) return
  // Find next un-tapped block
  const remaining = g17State.blocks.filter(b => !b.tapped)
  if (remaining.length === 0) {
    g17EndGame(true)
    return
  }
  // Pick random from remaining
  const pick = remaining[Math.floor(Math.random() * remaining.length)]
  g17State.currentActive = pick.idx
  pick.el.classList.add('active')
  // Auto-remove active after timeout (penalty if not tapped)
  const delay = Math.max(500, g17State.baseDelay - g17State.correct * g17State.stepDelay)
  clearTimeout(g17State.lightTimeout)
  g17State.lightTimeout = setTimeout(() => {
    if (!g17State.running) return
    // Missed — apply damage
    if (pick.el.classList.contains('active')) {
      pick.el.classList.remove('active')
      g17State.damage++
      g17State.combo = 0
      document.getElementById('g17-combo').textContent = '💨 Terlewat!'
      document.getElementById('g17-combo').style.color = '#FFCDD2'
      const bg = document.getElementById('g17-bridge-group')
      if (bg) { bg.classList.add('bridge-shake'); setTimeout(() => bg.classList.remove('bridge-shake'), 520) }
      g17AddCrack()
      g17RenderLives()
      const lv = document.getElementById('g17-lives'); if (lv) { lv.classList.remove('heart-loss'); void lv.offsetWidth; lv.classList.add('heart-loss') }
      g17SpawnFloater('dmg', '-1 💔', pick.el)
      playWrong()
      if (g17State.damage >= g17State.maxDamage) {
        g17EndGame(false)
        return
      }
    }
    setTimeout(() => g17LightNextBlock(), 300)
  }, delay)
}

function g17TapBlock(idx) {
  if (!g17State.running) return
  const block = g17State.blocks[idx]
  if (!block || block.tapped) return
  if (idx === g17State.currentActive) {
    // Correct!
    clearTimeout(g17State.lightTimeout)
    block.el.classList.remove('active')
    block.el.classList.add('correct')
    block.tapped = true
    g17State.correct++
    g17State.combo++
    if (g17State.combo > g17State.bestCombo) g17State.bestCombo = g17State.combo
    document.getElementById('g17-stars-badge').textContent = `🌉 ${g17State.correct}`
    const comboEl = document.getElementById('g17-combo')
    if (g17State.combo >= 3) {
      comboEl.textContent = `🔥 COMBO x${g17State.combo}!`
      comboEl.style.color = '#FDD835'
      g17SpawnFloater('combo', `COMBO x${g17State.combo}!`, block.el)
    } else {
      comboEl.textContent = '✅ Tepat!'
      comboEl.style.color = '#A5D6A7'
      g17SpawnFloater('bonus', '+1 ⭐', block.el)
    }
    playCorrect()
    // Juice: particle burst + ring ripple at block center
    try {
      const r = block.el.getBoundingClientRect()
      const cx = r.left + r.width/2, cy = r.top + r.height/2
      spawnParticleBurst(cx, cy)
      const ring = document.createElement('div')
      ring.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;width:12px;height:12px;border-radius:50%;border:3px solid #4ade80;box-shadow:0 0 16px #4ade80;transform:translate(-50%,-50%) scale(0.5);opacity:0.9;pointer-events:none;z-index:9998;animation:g17CorrectRing 0.55s ease-out forwards;`
      document.body.appendChild(ring)
      setTimeout(()=>ring.remove(), 600)
    } catch(e) {}
    const remaining = g17State.blocks.filter(b => !b.tapped)
    if (remaining.length === 0) {
      clearTimeout(g17State.lightTimeout)
      setTimeout(() => g17EndGame(true), 500)
      return
    }
    setTimeout(() => g17LightNextBlock(), 250)
  } else {
    // Wrong block
    block.el.classList.add('wrong')
    setTimeout(() => block.el.classList.remove('wrong'), 400)
    g17State.damage++
    g17State.combo = 0
    document.getElementById('g17-combo').textContent = '❌ Salah!'
    document.getElementById('g17-combo').style.color = '#FFCDD2'
    // Bridge shake on wrong tap
    const bg = document.getElementById('g17-bridge-group')
    if (bg) { bg.classList.add('bridge-shake'); setTimeout(() => bg.classList.remove('bridge-shake'), 520) }
    g17AddCrack()
    g17RenderLives()
    const lv2 = document.getElementById('g17-lives'); if (lv2) { lv2.classList.remove('heart-loss'); void lv2.offsetWidth; lv2.classList.add('heart-loss') }
    g17SpawnFloater('dmg', '-1 💔', block.el)
    playWrong()
    if (g17State.damage >= g17State.maxDamage) {
      clearTimeout(g17State.lightTimeout)
      g17EndGame(false)
    }
  }
}

function g17AddCrack() {
  const cracks = document.getElementById('g17-cracks')
  const line = document.createElement('div')
  line.className = 'g17-crack-line'
  const top = 15 + Math.random() * 25
  const left = 5 + Math.random() * 60
  const width = 20 + Math.random() * 30
  const angle = -10 + Math.random() * 20
  line.style.cssText = `top:${top}px;left:${left}%;width:${width}%;transform:rotate(${angle}deg);`
  cracks.appendChild(line)
}

function g17RenderLives() {
  const el = document.getElementById('g17-lives'); if (!el) return
  const remaining = Math.max(0, (g17State.maxDamage || 3) - (g17State.damage || 0))
  el.textContent = '❤️'.repeat(remaining) + '🖤'.repeat((g17State.maxDamage || 3) - remaining)
}

function g17SpawnFloater(kind, text, el) {
  const host = document.getElementById('g17-floaters'); if (!host) return
  const f = document.createElement('div')
  f.className = 'g17-floater ' + kind
  f.textContent = text
  const rect = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null
  const hostRect = host.getBoundingClientRect()
  if (rect) {
    f.style.left = (rect.left - hostRect.left + rect.width/2) + 'px'
    f.style.top  = (rect.top  - hostRect.top) + 'px'
  } else {
    f.style.left = '50%'; f.style.top = '40%'
  }
  host.appendChild(f)
  setTimeout(() => f.remove(), 1200)
}

function g17EndGame(won) {
  g17State.running = false
  clearTimeout(g17State.lightTimeout)
  clearInterval(g17State.timerInterval)
  // Remove active state from current block
  if (g17State.currentActive >= 0 && g17State.blocks[g17State.currentActive]) {
    g17State.blocks[g17State.currentActive].el.classList.remove('active')
  }
  if (won) {
    // Replace static train with animated inline SVG, then cross bridge
    const trainEl = document.getElementById('g17-train-waiting')
    const steamCfg = { isSteam:true, tender:true, rack:false, bodyColor:'#1a1a2e', wheelColor:'#0d0d1a' }
    trainEl.innerHTML = buildSteamLocoSVG(steamCfg, {animate:true, width:120, height:54})
    // Snap off transition so bottom change doesn't cause diagonal slide
    trainEl.style.transition = 'none'
    trainEl.style.position = 'absolute'
    trainEl.style.bottom = '44%'
    void trainEl.offsetWidth  // reflow to apply snap
    trainEl.classList.add('g17-train-cross')
    playCorrect()
  }
  // Unified scoring: accuracy-based with damage as lives-lost proxy
  const _g17MaxDamage = 3
  const perfStars = won
    ? GameScoring.calc({
        correct: g17State.correct,
        total: g17State.totalBlocks,
        lives: Math.max(0, _g17MaxDamage - g17State.damage),
        maxLives: _g17MaxDamage
      })
    : GameScoring.calc({
        correct: g17State.correct,
        total: g17State.totalBlocks
      })
  state.gameStars[state.currentPlayer] = perfStars
  setTimeout(() => {
    const facts = [
      'Jembatan kereta pertama dibangun di Inggris tahun 1825!',
      'Rel kereta terbuat dari baja yang sangat kuat!',
      'Membangun jembatan butuh kerja sama tim yang hebat!'
    ]
    showGameResult({
      emoji:won?'🏆':'💔', title:won?'JEMBATAN SELESAI!':'Jembatan Retak...', stars:perfStars,
      msg:`${g17State.correct}/${g17State.totalBlocks} balok • Combo terbaik: x${g17State.bestCombo}\n${facts[Math.floor(Math.random()*facts.length)]}`,
      buttons:[{label:'Main Lagi 🔄', action:()=>initGame17()},{label:'Kembali ⌂', action:()=>endGameFromOverlay()}]
    })
    if (!won) playWrong()
  }, won ? 1600 : 400)
}

// ============================================================
// GAME 18 — MUSEUM KERETA AMBARAWA 🏛️
// Koleksi Museum Kereta Api Ambarawa + kereta-kereta terkenal dunia
// ============================================================
// G18 inline SVG builder — context-aware for museum gallery
function g18TrainSVG(t, w, h, animate) {
  const a = !!animate   // v55.70 B-273 — gallery cards static; modal hero animated
  if (t.isSteam) return buildSteamLocoSVG(t, {animate:a, width:w||120, height:h||52})
  if (t.isDiesel) return buildDieselLocoSVG(t, {animate:a, width:w||120, height:h||52})
  if (t.isElectric) return buildElectricLocoSVG(t, {animate:a, width:w||120, height:h||52})
  return `<span style="font-size:40px;line-height:1;">${t.emoji}</span>`
}

const G18_TRAINS = [
  // ── KOLEKSI MUSEUM KERETA API AMBARAWA ──
  {
    emoji:'🚂', name:'B 2507 — Kereta Bergerigi', country:'🇮🇩 Ambarawa, Jawa Tengah', year:1902,
    fuel:'Batubara (Uap)', speed:30, type:'Lokomotif Rack (Bergerigi)', builder:'SLM Swiss', axles:'B-B',
    isSteam:true, rack:true, tender:false, bodyColor:'#1a1a2e', wheelColor:'#0d0d1a',
    fact:'Bintang utama Museum Ambarawa! B2507 dibuat di Swiss oleh SLM tahun 1902. Punya roda BERGERIGI (cogwheel) khusus untuk mendaki gunung terjal — salah satu dari sedikit kereta rack yang masih ada di dunia! ⛰️',
    funFact:'🏔️ Jalur B2507 punya tanjakan 65‰ — artinya naik 65 meter setiap 1 km! Sangat curam!',
    history:'B2507 dibuat pabrik SLM Winterthur di Swiss tahun 1902 🇨🇭. Memakai sistem gigi ABT — rel tengah bergerigi yang dicengkeram roda gigi lokomotif agar tidak tergelincir di tanjakan ekstrem. Jalur Ambarawa–Bedono resmi dibuka tahun 1905 untuk menghubungkan perkebunan kopi di lereng Gunung Merbabu. Kini B2507 jadi simbol Museum Ambarawa dan kebanggaan Indonesia 🚂🌄🇮🇩',
    route:'Ambarawa ↔ Bedono via Jambu',
    quizHint:'kereta bergerigi pendaki gunung di Ambarawa'
  },
  {
    emoji:'🚂', name:'B 2521 — Rack Ambarawa-Bedono', country:'🇮🇩 Ambarawa, Jawa Tengah', year:1912,
    fuel:'Batubara (Uap)', speed:25, type:'Lokomotif Uap Bergerigi', builder:'SLM Swiss',
    isSteam:true, rack:true, tender:false, bodyColor:'#0d2a0d', wheelColor:'#061606',
    fact:'B2521 melayani jalur Ambarawa–Bedono yang sangat terjal! Melewati perkebunan kopi dan teh di kaki Gunung Merbabu. Kemiringan jalurnya 65‰ — salah satu yang terextrim di dunia! 🌋',
    funFact:'☕ Jalur ini dulu dipakai untuk mengangkut hasil perkebunan kopi & teh ke kota!',
    route:'Ambarawa ↔ Bedono (tanjakan curam)',
    quizHint:'kereta rack jalur Ambarawa-Bedono gunung'
  },
  {
    emoji:'🚂', name:'C 5107 — Lok Tender Kolonial', country:'🇮🇩 Ambarawa, Jawa Tengah', year:1921,
    fuel:'Batubara (Uap)', speed:60, type:'Lokomotif Uap Tender', builder:'Hartmann, Jerman',
    isSteam:true, rack:false, tender:true, bodyColor:'#0f0f0f', wheelColor:'#050505',
    fact:'C5107 buatan pabrik Hartmann, Jerman (1921). Di era Hindia Belanda, mengangkut penumpang & hasil bumi. Kini jadi bintang Kereta Wisata Ambarawa–Tuntang yang masih beroperasi! ☕🚂',
    funFact:'🎉 Kamu bisa naiki kereta wisata ini! Rute Ambarawa–Tuntang sejauh ±5 km!',
    route:'Ambarawa ↔ Tuntang (kereta wisata)',
    quizHint:'kereta wisata uap Ambarawa-Tuntang'
  },
  {
    emoji:'🚂', name:'D 1415 — Tender Hanomag', country:'🇮🇩 Ambarawa, Jawa Tengah', year:1908,
    fuel:'Batubara (Uap)', speed:55, type:'Lokomotif Uap Tender', builder:'Hanomag, Jerman',
    isSteam:true, rack:false, tender:true, bodyColor:'#2a1a0a', wheelColor:'#150a00',
    fact:'D1415 buatan Hanomag, Jerman 1908. Punya tangki air besar (tender) di belakang untuk perjalanan panjang. Dulu mengangkut gula, kopi, dan teh dari perkebunan Jawa! 💨🌿',
    funFact:'🪨 Tender di belakangnya menyimpan batubara untuk 5–6 jam perjalanan!',
    route:'Jalur pegunungan Jawa Tengah',
    quizHint:'kereta uap dengan tender besar di belakang'
  },
  {
    emoji:'🚂', name:'C 1218 — Lokomotif Tertua RI', country:'🇮🇩 Ambarawa, Jawa Tengah', year:1891,
    fuel:'Batubara (Uap)', speed:50, type:'Lokomotif Tank Uap', builder:'Beyer Peacock, Inggris',
    isSteam:true, rack:false, tender:false, bodyColor:'#4a1515', wheelColor:'#2a0808',
    fact:'C1218 adalah salah satu lokomotif TERTUA di Indonesia! Buatan Beyer Peacock, Inggris 1891 — sudah 130+ tahun! Masih terawat baik di Museum Ambarawa. Luar biasa! 🎩👑',
    funFact:'📅 C1218 dibuat saat Indonesia masih bernama Hindia Belanda dan Presiden Soekarno belum lahir!',
    history:'C1218 dioperasikan oleh Staats Spoorwegen (SS), perusahaan kereta pemerintah Hindia Belanda di masa kolonial. Lokomotif ini mengangkut penumpang dan hasil bumi di Pulau Jawa sejak 1891 🚂. C1218 SELAMAT dari dua Perang Dunia dan revolusi kemerdekaan RI — banyak lokomotif lain rusak atau dijarah. Kini jadi saksi bisu sejarah panjang perkeretaapian Indonesia 🇮🇩🎖️',
    route:'Berbagai jalur Jawa era kolonial',
    quizHint:'lokomotif tertua 1891 di Indonesia'
  },
  {
    emoji:'🚂', name:'B 2801 — Rack SLM Merbabu', country:'🇮🇩 Ambarawa, Jawa Tengah', year:1907,
    fuel:'Batubara (Uap)', speed:28, type:'Lokomotif Rack Gunung', builder:'SLM Swiss',
    isSteam:true, rack:true, tender:false, bodyColor:'#0a1f0a', wheelColor:'#051005',
    fact:'B2801 buatan Swiss Locomotive Works 1907. Mesin uap + roda gigi bergabung menaklukkan tanjakan 65‰ — naik 65 meter setiap 1 km! Satu-satunya di dunia yang masih beroperasi tourist! 😱⛰️',
    funFact:'🇨🇭 SLM (Swiss Locomotive Works) juga membuat kereta gunung terkenal di Alpen Swiss!',
    route:'Ambarawa ↔ Bedono (wisata gunung)',
    quizHint:'kereta rack Swiss tanjakan paling curam'
  },
  {
    emoji:'🚂', name:'B 2503 — Rack Pionir', country:'🇮🇩 Ambarawa, Jawa Tengah', year:1898,
    fuel:'Batubara (Uap)', speed:22, type:'Lokomotif Rack Tua', builder:'SLM Swiss',
    isSteam:true, rack:true, tender:false, bodyColor:'#1a0f00', wheelColor:'#0d0700',
    fact:'B2503 adalah lokomotif rack tertua di koleksi Ambarawa! Dibuat SLM Swiss 1898, sudah 125+ tahun! Generasi pertama kereta bergigi di Indonesia yang membuka jalur gunung! 🎖️',
    funFact:'🌄 Tanpa B2503 dan kawan-kawannya, kawasan Bedono & Jambu sulit dijangkau di era kolonial!',
    route:'Ambarawa ↔ Bedono (jalur historis)',
    quizHint:'lokomotif rack tertua Ambarawa 1898'
  },
  {
    emoji:'🚂', name:'C 28 — Biru Malam Kolonial', country:'🇮🇩 Jawa', year:1920,
    fuel:'Batubara (Uap)', speed:70, type:'Lokomotif Tender Cepat', builder:'Hartmann, Jerman',
    isSteam:true, rack:false, tender:true, bodyColor:'#0f1540', wheelColor:'#070a25',
    fact:'Kelas C28 Hindia Belanda 1920! Cat biru malam yang elegan di jalur perbukitan. Lokomotif ini melayani penumpang kelas satu — para tuan tanah dan pejabat Belanda! 🌙👒',
    funFact:'💼 Dulu ada gerbong kelas 1 (pejabat Belanda), kelas 2 (pedagang), dan kelas 3 (rakyat biasa)!',
    route:'Jalur Priangan & Jawa Tengah',
    quizHint:'kereta biru malam C28 Hindia Belanda'
  },
  {
    emoji:'🚃', name:'CC 200 — Setan Ijo', country:'🇮🇩 Indonesia', year:1953,
    fuel:'Solar (Diesel)', speed:120, type:'Lokomotif Diesel Elektrik', builder:'General Electric, Amerika',
    isDiesel:true, bodyColor:'#1a3a1a', accentColor:'#22c55e',
    fact:'CC200 adalah lokomotif diesel PERTAMA Indonesia! General Electric, Amerika 1953. Masinis menjuluki "Setan Ijo" karena cat hijau dan tenaganya dahsyat! Revolusi kereta Indonesia! 🦾🇺🇸',
    funFact:'🟢 "Setan Ijo" artinya Setan Hijau — para masinis takjub dengan kekuatan mesin GE yang luar biasa!',
    history:'Di era Presiden Sukarno, pemerintah Indonesia memesan 27 unit CC200 dari General Electric Amerika tahun 1953 🇺🇸. Ini adalah langkah BESAR memodernisasi perkeretaapian RI — dari lokomotif uap berasap ke diesel bersih dan bertenaga. CC200 menjadi tulang punggung kereta ekspres Jakarta–Surabaya dan membuka era baru transportasi Indonesia. Satu unit masih terawat di Museum Ambarawa 🚆🎖️',
    route:'Jakarta ↔ Surabaya (ekspres awal)',
    quizHint:'diesel pertama Indonesia Setan Ijo GE'
  },
  {
    emoji:'🚂', name:'E 1060 — Listrik Antik 1924', country:'🇮🇩 Indonesia', year:1924,
    fuel:'Listrik', speed:90, type:'Lokomotif Listrik Antik', builder:'Belanda',
    isElectric:true, bodyColor:'#1a1a4a', accentColor:'#ffd700',
    fact:'E1060 membuktikan Indonesia sudah punya kereta LISTRIK sejak 1924 — 100 tahun lalu! Kini jadi koleksi langka di Ambarawa yang sangat berharga. Jarang sekali ada di dunia! ⚡🏆',
    funFact:'💡 Jalur listrik pertama Indonesia: Batavia (Jakarta) – Buitenzorg (Bogor) 1925!',
    route:'Jalur listrik Batavia era kolonial',
    quizHint:'kereta listrik antik Indonesia 1924'
  },
  {
    emoji:'🚂', name:'B 50 — Si Tua Jawa', country:'🇮🇩 Jawa', year:1880,
    fuel:'Batubara (Uap)', speed:45, type:'Lokomotif Tank Tua', builder:'Krupp, Jerman',
    isSteam:true, rack:false, tender:false, bodyColor:'#2a1e08', wheelColor:'#150f00',
    fact:'B50 buatan Krupp Jerman 1880-an! Salah satu lokomotif tertua di Jawa. Lambat tapi legendaris — membangun fondasi perkeretaapian Indonesia di era awal kolonial! 🦕🎖️',
    funFact:'⛏️ Jalur kereta pertama Indonesia dibuka 1867 rute Semarang–Tanggung, hanya 25 km!',
    route:'Jalur Semarang & Jawa Tengah awal',
    quizHint:'kereta tua B50 Krupp Jerman 1880'
  },
  {
    emoji:'🚂', name:'Kereta Wisata Ambarawa', country:'🇮🇩 Ambarawa', year:2000,
    fuel:'Batubara (Uap)', speed:30, type:'Kereta Wisata Heritage', builder:'Gabungan lok tua',
    isSteam:true, rack:false, tender:true, bodyColor:'#5D3A1A', wheelColor:'#3a2010',
    fact:'Kereta Wisata Ambarawa masih beroperasi menggunakan lokomotif uap tua! Rute Ambarawa–Tuntang ±5 km melewati sawah dan danau. Kamu bisa naiki dan rasakan serunya! ☁️🎉🚂',
    funFact:'📸 Inilah satu-satunya jalur kereta bergigi yang masih aktif untuk wisata di Asia Tenggara!',
    route:'Ambarawa ↔ Tuntang (wisata aktif)',
    quizHint:'kereta wisata uap yang bisa dinaiki'
  },
  // ── KERETA TERKENAL DUNIA ──
  {
    emoji:'🚂', name:'Shinkansen N700 — Peluru Jepang', country:'🇯🇵 Jepang', year:2007,
    fuel:'Listrik', speed:320, type:'Kereta Cepat (Shinkansen)', builder:'Kawasaki Heavy Industries',
    isElectric:true, bodyColor:'#1A1A6B', accentColor:'#0077cc',
    fact:'Shinkansen dijuluki "Peluru" karena hidungnya seperti peluru! Tepat waktu hingga detik — keterlambatan rata-rata hanya 36 detik per tahun! Dibanding B2507 Ambarawa, 10× lebih cepat! ⚡🇯🇵',
    funFact:'⏱️ Jika keterlambatan >1 menit, perusahaan minta MAAF resmi dan memberi surat keterlambatan!',
    route:'Tokyo ↔ Osaka (515 km, 2,5 jam)',
    quizHint:'kereta peluru Jepang 320 km/jam'
  },
  {
    emoji:'🚃', name:'Argo Bromo Anggrek', country:'🇮🇩 Indonesia', year:1997,
    fuel:'Solar (Diesel)', speed:120, type:'Kereta Ekspress', builder:'INKA Indonesia',
    isDiesel:true, bodyColor:'#0a1a3a', accentColor:'#f59e0b',
    fact:'Kereta ekspress terbaik Indonesia! Jakarta–Surabaya ±9 jam. Dinamai Gunung Bromo. CC204 sebagai lokomotifnya — 4× lebih cepat dari B2507 Ambarawa! 🌋🏆',
    funFact:'🇮🇩 Gerbong keretanya buatan INKA di Madiun, Jawa Timur! Bangga produk lokal!',
    route:'Jakarta Gambir ↔ Surabaya Gubeng',
    quizHint:'kereta ekspress Jakarta-Surabaya Argo Bromo'
  },
  {
    emoji:'🚂', name:'KRL Commuter Jabodetabek', country:'🇮🇩 Indonesia', year:2013,
    fuel:'Listrik', speed:100, type:'Kereta Listrik Komuter', builder:'Tokyu/Kawasaki (bekas Jepang)',
    isElectric:true, bodyColor:'#0D47A1', accentColor:'#e53935',
    fact:'KRL mengangkut lebih dari 1 JUTA penumpang SETIAP HARI! Tanpa asap dan ramah lingkungan. Beda sekali dengan B2507 Ambarawa yang butuh batubara berkeranjang-keranjang! 🌿💙',
    funFact:'♻️ KRL yang beroperasi di Jakarta dulunya adalah kereta bekas Jepang yang direkondisi ulang!',
    history:'Modernisasi KRL Jabodetabek dimulai serius sejak 2013 ⚡. PT KAI Commuter mengimpor kereta bekas dari Jepang (seri JR 203, 205, 8000, dan Tokyu) lalu merekondisinya di Balai Yasa Manggarai. Jalur Jabodetabek dielektrifikasi penuh dengan listrik aliran atas 1500 VDC. Kini KRL jadi transportasi massal andalan ibu kota — ramah lingkungan dan bebas macet 🚆🌿🇮🇩',
    route:'Bogor/Bekasi/Tangerang ↔ Jakarta',
    quizHint:'kereta listrik 1 juta penumpang sehari Jabodetabek'
  },
  {
    emoji:'🚂', name:'TGV — Kereta Cepat Prancis', country:'🇫🇷 Perancis', year:1981,
    fuel:'Listrik (Nuklir)', speed:574, type:'Train à Grande Vitesse', builder:'Alstom, Perancis',
    isElectric:true, bodyColor:'#003189', accentColor:'#e63946',
    fact:'TGV rekor dunia kereta konvensional — 574 km/jam! Hampir secepat pesawat! Ambarawa ke Jakarta ±350 km: TGV 37 menit, kereta uap Ambarawa 4+ jam! 🚀🇫🇷',
    funFact:'⚛️ Listrik TGV berasal dari energi nuklir Prancis — hijau dan sangat bertenaga!',
    route:'Paris ↔ Lyon (400 km, 2 jam)',
    quizHint:'kereta tercepat konvensional Perancis 574 km/jam'
  },
  {
    emoji:'🚇', name:'MRT Jakarta — Kereta Bawah Tanah', country:'🇮🇩 Indonesia', year:2019,
    fuel:'Listrik', speed:80, type:'Mass Rapid Transit', builder:'Sumitomo, Jepang',
    isElectric:true, bodyColor:'#37474f', accentColor:'#26c6da',
    fact:'MRT Jakarta adalah kereta bawah tanah PERTAMA Indonesia! 16 stasiun, dibangun 10+ tahun. Beda dengan B2507 mendaki gunung, MRT justru menyelam ke bawah tanah kota! 🏙️🚇',
    funFact:'🔭 Stasiun MRT terdalam di Jakarta sampai 26 meter di bawah tanah — sedalam gedung 8 lantai!',
    history:'Ide MRT Jakarta sudah ada sejak awal 1990-an, tapi terus tertunda karena krisis ekonomi 1998 dan banyaknya pergantian pemerintahan 🏙️. Konstruksi akhirnya dimulai 2013 dengan pendanaan dari JICA (Japan International Cooperation Agency) dan teknologi kereta Sumitomo-Nippon Sharyo Jepang 🇯🇵. Setelah 20+ tahun menunggu, MRT Fase 1 resmi beroperasi Maret 2019 — jadi lompatan besar transportasi ibu kota 🚇🇮🇩',
    route:'Lebak Bulus ↔ Bundaran HI (16 km)',
    quizHint:'kereta bawah tanah pertama Indonesia MRT'
  },
  {
    emoji:'🚂', name:'SCMaglev L0 — Kereta Magnet', country:'🇯🇵 Jepang', year:2015,
    fuel:'Magnet Superkonduktor', speed:603, type:'Maglev (Kereta Melayang)', builder:'JR Central, Jepang',
    isElectric:true, bodyColor:'#1a1a2e', accentColor:'#00f5ff',
    fact:'SCMaglev L0 tidak menyentuh rel sama sekali — melayang di atas magnet! 603 km/jam, rekor dunia! Kebalikan B2507 yang bergigi agar tidak tergelincir. Teknologi masa depan! 🧲🚀',
    funFact:'🌡️ Magnet superkonduktor butuh didinginkan hingga −269°C — lebih dingin dari luar angkasa!',
    route:'Tokyo ↔ Nagoya (target 2027, 40 menit)',
    quizHint:'kereta magnet melayang tercepat dunia 603 km/jam'
  },
  {
    emoji:'🚂', name:'CR400 Fuxing — Kereta Tercepat Beroperasi', country:'🇨🇳 China', year:2017,
    fuel:'Listrik', speed:350, type:'High-Speed Rail', builder:'CRRC, China',
    isElectric:true, bodyColor:'#b71c1c', accentColor:'#ffc107',
    fact:'CR400 Fuxing adalah kereta penumpang TERCEPAT yang beroperasi reguler di dunia! 350 km/h setiap hari. China kini punya >40.000 km jalur HSR — lebih panjang dari keliling bumi! 🇨🇳🏆',
    funFact:'🌏 Nama "Fuxing" artinya "Kebangkitan" — simbol kemajuan teknologi China modern!',
    route:'Beijing ↔ Shanghai (1318 km, 4,5 jam)',
    quizHint:'kereta terkencang beroperasi Fuxing China 350 km/jam'
  },
  // ── KERETA LORI TEBU & INDUSTRI ──
  {
    emoji:'🚂', name:'Lori Tebu — Kereta Perkebunan', country:'🇮🇩 Jawa (Cirebon, Madiun, Jogja)', year:1880,
    fuel:'Batubara (Uap)', speed:15, type:'Lokomotif Lori Perkebunan', builder:'Orenstein & Koppel, Jerman',
    isSteam:true, rack:false, tender:false, bodyColor:'#14532D', wheelColor:'#052e16',
    fact:'Lori Tebu adalah kereta KECIL khusus pabrik gula! Rel sempit hanya 60cm, bertugas mengangkut batang tebu dari kebun ke pabrik gula. Masih beroperasi di pabrik Sragi, Tasikmadu, dan Colomadu! 🎋🍬',
    funFact:'🍭 Gula Indonesia dulu terkenal di Eropa — 1 kereta lori bisa mengangkut 4 ton tebu per perjalanan!',
    route:'Kebun tebu ↔ Pabrik gula (rel sempit 600mm)',
    quizHint:'kereta kecil pengangkut tebu pabrik gula'
  },
  {
    emoji:'🚂', name:'CC201 — Diesel Legendaris PT KAI', country:'🇮🇩 Indonesia', year:1977,
    fuel:'Solar (Diesel Elektrik)', speed:100, type:'Lokomotif Diesel Elektrik', builder:'General Electric, USA',
    isDiesel:true, bodyColor:'#FF6B00', accentColor:'#FFD700',
    fact:'CC201 adalah LOKOMOTIF DIESEL paling populer di Indonesia! Dibuat General Electric USA sejak 1977. Warna oranye-hitamnya khas — favorit anak-anak penggemar kereta! 🧡',
    funFact:'🏆 Ada 140+ CC201 yang beroperasi. Satu lok bisa tarik 10-14 gerbong sekaligus!',
    route:'Seluruh Jawa & Sumatera — penumpang & barang',
    quizHint:'lokomotif diesel oranye populer Indonesia CC201'
  },
  {
    emoji:'🚄', name:'KCIC400AF Whoosh — HSR Indonesia', country:'🇮🇩 Indonesia (Jakarta–Bandung)', year:2023,
    fuel:'Listrik', speed:350, type:'High-Speed Rail', builder:'CRRC Qingdao Sifang',
    isElectric:true, bodyColor:'#C8102E', accentColor:'#FFFFFF',
    fact:'Whoosh adalah kereta cepat PERTAMA di Asia Tenggara! 🎉 Dari Jakarta ke Bandung cuma 45 menit (biasanya 3 jam naik mobil). Diresmikan Presiden Jokowi Oktober 2023! 🇮🇩⚡',
    funFact:'💨 Nama "Whoosh" dipilih dari sayembara nasional — singkatan Waktu Hemat Operasi Optimal Sistem Hebat!',
    history:'Proyek kereta cepat ini hasil kerjasama Indonesia–China (KCIC) senilai Rp 108 triliun. Awalnya bersaing dengan Shinkansen Jepang, pemerintah memilih teknologi CRH400 China karena skema pembiayaan lebih fleksibel 🇨🇳🇮🇩. Sempat terkendala pandemi COVID-19 dan pembebasan lahan, akhirnya Whoosh beroperasi Oktober 2023. Jadi simbol kemajuan teknologi Indonesia — tercepat di Asia Tenggara 🚄🏆',
    route:'Halim (Jakarta) ↔ Tegalluar (Bandung) • 142 km',
    quizHint:'kereta cepat pertama Asia Tenggara Jakarta Bandung'
  },
  {
    emoji:'🚂', name:'Argo Parahyangan — Eksekutif Favorit', country:'🇮🇩 Indonesia (Jakarta–Bandung)', year:2010,
    fuel:'Solar (Diesel) + Listrik', speed:120, type:'Kereta Eksekutif Penumpang', builder:'INKA, Madiun',
    isDiesel:true, bodyColor:'#1E40AF', accentColor:'#FCD34D',
    fact:'Argo Parahyangan adalah kereta EKSEKUTIF paling favorit di Pulau Jawa! Dibuat oleh INKA Madiun — industri kereta kebanggaan Indonesia. Melintasi terowongan Sasaksaat dan Jembatan Cisomang! 🏞️',
    funFact:'🇮🇩 INKA Madiun juga ekspor kereta ke Bangladesh, Filipina, dan Selandia Baru!',
    route:'Gambir (Jakarta) ↔ Bandung • 173 km, 3 jam',
    quizHint:'kereta eksekutif Jakarta Bandung Argo Parahyangan INKA'
  },
  {
    emoji:'🚋', name:'LRT Jabodebek — Tanpa Masinis', country:'🇮🇩 Jakarta (GoA Level 3)', year:2023,
    fuel:'Listrik', speed:80, type:'Light Rail Transit (Otomatis)', builder:'INKA + Siemens',
    isElectric:true, bodyColor:'#FF0000', accentColor:'#FFFFFF',
    fact:'LRT Jabodebek adalah kereta TANPA MASINIS (driverless) pertama di Indonesia! 🤖 Dikendalikan komputer sepenuhnya — GoA Level 3. Juga kereta LRT pertama buatan INKA Madiun 🏭',
    funFact:'🤖 Meski tanpa masinis, ada petugas di stasiun yang memantau via komputer pusat!',
    route:'Dukuh Atas ↔ Harjamukti / Jatimulya • 44 km',
    quizHint:'kereta tanpa masinis otomatis Jakarta LRT Jabodebek'
  },
  // ── SEJARAH PANJANG KERETA INDONESIA 1867–2025 ──
  {
    emoji:'🚂', name:'SS 1867 — Kereta Pertama Indonesia', country:'🇮🇩 Semarang, Jawa Tengah', year:1867,
    fuel:'Batubara (Uap)', speed:40, type:'Lokomotif Uap Tender Pionir', builder:'Beyer Peacock, Inggris',
    isSteam:true, rack:false, tender:true, bodyColor:'#3a1f0a', wheelColor:'#1a0f05',
    fact:'Inilah kereta PERTAMA yang pernah berjalan di tanah Indonesia! 🎖️ Tanggal 10 Agustus 1867, lokomotif buatan Beyer Peacock Inggris melintas di rute Semarang–Tanggung sejauh 25 km. Penduduk takjub melihat "kuda besi" berasap untuk pertama kalinya! 🚂💨',
    funFact:'🎉 Peresmiannya dihadiri Gubernur Jenderal Pieter Mijer dan disambut ribuan warga yang belum pernah melihat kereta!',
    history:'Di era Hindia Belanda, perusahaan swasta Nederlandsch-Indische Spoorweg Maatschappij (NISM) membangun jalur kereta pertama Indonesia 🇳🇱. Rute Semarang–Tanggung dibuka 10 Agustus 1867 memakai lebar rel 1435mm (standar Eropa). Tujuan awal: mengangkut hasil bumi dan gula dari pedalaman Jawa ke pelabuhan Semarang. Jadi titik awal sejarah panjang perkeretaapian Indonesia 🚂🌏',
    route:'Semarang ↔ Tanggung (25 km, rute pertama RI)',
    quizHint:'kereta pertama Indonesia 1867 Semarang Tanggung'
  },
  {
    emoji:'🚂', name:'SS 500 — Mogul Kolonial', country:'🇮🇩 Jawa', year:1896,
    fuel:'Batubara (Uap)', speed:65, type:'Lokomotif Uap Mogul (2-6-0)', builder:'Werkspoor, Belanda',
    isSteam:true, rack:false, tender:true, bodyColor:'#1a3a1a', wheelColor:'#0a1f0a',
    fact:'SS 500 adalah lokomotif Mogul 2-6-0 buatan Werkspoor Belanda tahun 1896! Tiga pasang roda penggerak besar membuatnya kuat menarik gerbong panjang. Cat hijau tuanya khas kereta kolonial Hindia Belanda! 🟢🚂',
    funFact:'🍬 SS 500 spesialis mengangkut gula — 1 kereta bisa tarik 20 gerbong gula dari pabrik ke pelabuhan!',
    history:'SS 500 dipesan Staats Spoorwegen dari pabrik Werkspoor Amsterdam, Belanda 🇳🇱 di tahun 1896. Era itu Jawa dikenal sebagai "Gudang Gula Dunia" — 1/3 gula dunia datang dari Indonesia! SS 500 memainkan peran kunci mengangkut tebu dari perkebunan ke pabrik, lalu gula jadi ke pelabuhan untuk diekspor ke Eropa. Menjadi mesin penggerak ekonomi kolonial Hindia Belanda 🏭🍬',
    route:'Jalur Jawa pengangkut gula',
    quizHint:'lokomotif mogul SS500 pengangkut gula kolonial'
  },
  {
    emoji:'🚂', name:'C51 — Dwipanggo Kepresidenan', country:'🇮🇩 Jawa', year:1917,
    fuel:'Batubara (Uap)', speed:75, type:'Lokomotif Uap Ekspres Pacific', builder:'Hanomag, Jerman',
    isSteam:true, rack:false, tender:true, bodyColor:'#4a1515', wheelColor:'#2a0808',
    fact:'C51 "Dwipanggo" adalah lokomotif EKSPRES elegan buatan Hanomag Jerman 1917! Cat merah marunnya berkilau. Biasa menarik kereta kepresidenan dan pejabat tinggi — tampil mewah di zamannya! 👑🚂',
    funFact:'🎩 "Dwipanggo" artinya "Dua Penguasa" — simbol kekuasaan yang diangkut kereta ini!',
    history:'C51 dibuat oleh pabrik Hanomag di Hannover, Jerman tahun 1917 🇩🇪. Hindia Belanda mengimpor lokomotif ini khusus untuk kereta ekspres kelas satu yang mengangkut Gubernur Jenderal, pejabat kolonial, dan tamu penting. Setelah kemerdekaan 1945, C51 sempat dipakai sebagai kereta kepresidenan awal RI 🇮🇩. Kini jadi koleksi berharga pengingat kemewahan perkeretaapian era kolonial 👑',
    route:'Jalur kelas satu Jawa (Jakarta–Surabaya)',
    quizHint:'kereta kepresidenan awal C51 Dwipanggo maroon'
  },
  {
    emoji:'🚂', name:'D52 — Djojobojo Pembangun', country:'🇮🇩 Indonesia', year:1954,
    fuel:'Batubara (Uap)', speed:70, type:'Lokomotif Uap Tender Terakhir', builder:'Krupp, Jerman',
    isSteam:true, rack:false, tender:true, bodyColor:'#0f1a40', wheelColor:'#070e25',
    fact:'D52 "Djojobojo" adalah lokomotif UAP TERAKHIR yang dibeli Indonesia! Dibuat Krupp Jerman tahun 1954 atas pesanan Presiden Sukarno. Cat biru tua gagahnya jadi simbol ambisi pembangunan RI merdeka! 🇮🇩💪',
    funFact:'📜 Nama "Djojobojo" diambil dari ramalan Raja Jayabaya — simbol kemakmuran yang dicita-citakan Sukarno!',
    history:'Pasca-kemerdekaan, Presiden Sukarno ingin membangun kembali ekonomi RI yang hancur akibat perang 🏗️. Beliau memesan 100 unit D52 dari pabrik Krupp Essen, Jerman tahun 1954 — terbesar di dunia saat itu. D52 menjadi kelas lokomotif UAP TERAKHIR yang dibuat untuk Indonesia sebelum era diesel dimulai. Jadi simbol optimisme era Orde Lama dalam membangun bangsa 🇮🇩🎖️',
    route:'Jalur utama Jawa era Orde Lama',
    quizHint:'lokomotif uap terakhir Indonesia D52 Sukarno Krupp'
  },
  {
    emoji:'🚃', name:'BB200 — Diesel Hidraulik Pertama', country:'🇮🇩 Indonesia', year:1957,
    fuel:'Solar (Diesel Hidraulik)', speed:80, type:'Lokomotif Diesel Hidraulik', builder:'Esslingen, Jerman',
    isDiesel:true, bodyColor:'#1a1a1a', accentColor:'#FFD600',
    fact:'BB200 adalah lokomotif DIESEL HIDRAULIK pertama Indonesia! Dibuat pabrik Esslingen Jerman tahun 1957. Cat kuning-hitamnya mencolok — jadi primadona baru era Sukarno! 🟡⚫',
    funFact:'⚙️ Beda dengan CC200 yang diesel-elektrik, BB200 pakai transmisi HIDRAULIK — mesinnya lebih ringkas!',
    history:'Di tahun 1957, Presiden Sukarno melanjutkan modernisasi KAI dengan membeli BB200 dari pabrik Esslingen, Jerman 🇩🇪. Ini adalah lokomotif diesel hidraulik pertama di Indonesia — pelengkap CC200 yang diesel-elektrik. Keduanya menandai berakhirnya dominasi lokomotif uap di jalur utama. BB200 bertugas di jalur sekunder dan menarik kereta penumpang jarak menengah 🚂➡️🚃',
    route:'Jalur sekunder Jawa (Cirebon, Madiun)',
    quizHint:'diesel hidraulik pertama Indonesia BB200 kuning'
  },
  {
    emoji:'🚃', name:'BB301 — Si Bulu Sikat', country:'🇮🇩 Indonesia', year:1964,
    fuel:'Solar (Diesel Hidraulik)', speed:100, type:'Lokomotif Diesel Hidraulik', builder:'Krauss-Maffei, Jerman',
    isDiesel:true, bodyColor:'#E65100', accentColor:'#FFFFFF',
    fact:'BB301 dijuluki "Si Bulu Sikat" karena bentuk hidung kotaknya mirip sikat! 🪥 Buatan Krauss-Maffei Jerman tahun 1964, di era Ganefo. Cat oranye terangnya jadi ciri khas di jalur Sumatera dan Jawa! 🟠',
    funFact:'🏆 Dipesan Sukarno untuk menyambut Ganefo 1963 — olimpiade tandingan yang digelar Indonesia!',
    history:'BB301 dipesan dari pabrik Krauss-Maffei Munich, Jerman 🇩🇪 pada era Ganefo (Games of the New Emerging Forces) 1963–1964. Sukarno ingin menunjukkan kemajuan Indonesia ke negara-negara Non-Blok. Masinis menjuluki BB301 "Si Bulu Sikat" karena bentuk bagian depannya kotak seperti kepala sikat. Unit ini melayani jalur Jawa dan Sumatera selama puluhan tahun 🚃🇮🇩',
    route:'Jalur Sumatera & Jawa Selatan',
    quizHint:'kereta bulu sikat BB301 oranye Ganefo'
  },
  {
    emoji:'🚃', name:'D301 — Pak Pos Pembawa Surat', country:'🇮🇩 Jawa', year:1962,
    fuel:'Solar (Diesel Hidraulik)', speed:100, type:'Lokomotif Diesel Ringan', builder:'Krupp, Jerman',
    isDiesel:true, bodyColor:'#B71C1C', accentColor:'#1a1a1a',
    fact:'D301 dijuluki "Pak Pos" karena sering mengangkut surat dan paket ke pelosok Jawa! ✉️📦 Dibuat Krupp Jerman 1962, warna merah-hitamnya jadi pemandangan akrab di stasiun desa!',
    funFact:'📮 1 gerbong pos bisa bawa 10.000+ surat dan paket sekaligus — jadi kurir cepat era 1960-an!',
    history:'D301 diimpor dari pabrik Krupp, Jerman 🇩🇪 tahun 1962. Di era itu, kereta adalah tulang punggung pengiriman pos Indonesia — Kantor Pos bekerjasama erat dengan KAI. D301 menarik gerbong bagasi khusus berisi surat, paket, dan dokumen ke kota-kota kecil yang belum terjangkau mobil pos. Unit ini jadi penghubung penting sebelum era modernisasi pos dan kargo darat 🚃📬',
    route:'Jalur Jawa (kereta pos & paket)',
    quizHint:'kereta pos D301 merah pengangkut surat'
  },
  {
    emoji:'🚃', name:'CC202 — Rajawali Pengangkut Berat', country:'🇮🇩 Sumatera & Jawa', year:1986,
    fuel:'Solar (Diesel Elektrik)', speed:120, type:'Lokomotif Diesel Berat', builder:'General Electric, USA',
    isDiesel:true, bodyColor:'#1565C0', accentColor:'#FFFFFF',
    fact:'CC202 dijuluki "Rajawali" karena kekuatannya yang luar biasa! 🦅 Dibuat GE Amerika 1986, khusus menarik kereta barang BERAT di Sumatera dan Jawa. Satu CC202 bisa tarik 40+ gerbong batubara sekaligus! 💪',
    funFact:'⛏️ CC202 adalah penarik utama kereta batubara Babaranjang Sumatera — 60 gerbong sepanjang 1 km!',
    history:'CC202 diimpor dari General Electric Amerika 🇺🇸 mulai tahun 1986 untuk memperkuat armada kereta barang Indonesia. Keunggulannya: traksi sangat besar, cocok untuk jalur pegunungan dan muatan super berat. CC202 menjadi andalan PT KAI mengangkut batubara Bukit Asam di Sumatera Selatan dan kargo industri di Jawa. Jasanya menopang ekonomi energi dan logistik nasional 🚆⛏️',
    route:'Tanjung Enim ↔ Tarahan (batubara Sumatera)',
    quizHint:'kereta barang berat CC202 Rajawali GE biru'
  },
  {
    emoji:'🚃', name:'Argo Bromo 1997 — Eksekutif Perdana', country:'🇮🇩 Jakarta–Surabaya', year:1997,
    fuel:'Solar (Diesel)', speed:120, type:'Kereta Eksekutif Perintis', builder:'INKA Madiun',
    isDiesel:true, bodyColor:'#0D47A1', accentColor:'#FF6F00',
    fact:'Argo Bromo 1997 adalah kereta EKSEKUTIF perdana yang memulai era "Argo" di Indonesia! 🏆 Nama diambil dari Gunung Bromo. Gerbongnya buatan INKA Madiun — produk kebanggaan Indonesia! 🌋',
    funFact:'✨ Gerbong kelas eksekutif ini punya AC, kursi reclining, dan TV — mewah di zamannya!',
    history:'Argo Bromo diluncurkan 31 Juli 1997 di era Presiden Soeharto sebagai kereta eksekutif pertama kelas "Argo" 🇮🇩. Nama "Argo" jadi simbol prestise — setiap kereta Argo dinamai gunung di Indonesia (Bromo, Lawu, Muria, dll). Gerbongnya dirancang dan dibuat INKA Madiun, menandai kemandirian industri kereta nasional. Argo Bromo menjadi pionir rute premium Jakarta–Surabaya sebelum digantikan Argo Bromo Anggrek 🚄',
    route:'Jakarta Gambir ↔ Surabaya Pasar Turi',
    quizHint:'kereta argo pertama Indonesia Argo Bromo 1997'
  },
  {
    emoji:'🚃', name:'Taksaka — Nagatatha Yogyakarta', country:'🇮🇩 Jakarta–Yogyakarta', year:1999,
    fuel:'Solar (Diesel)', speed:110, type:'Kereta Eksekutif Malam', builder:'INKA Madiun',
    isDiesel:true, bodyColor:'#1B5E20', accentColor:'#FDD835',
    fact:'Taksaka adalah kereta eksekutif favorit rute Jakarta–Yogyakarta! 🏯 Nama "Taksaka" diambil dari senjata Arjuna dalam kisah Mahabharata — senjata ampuh sang pahlawan! Warna hijau-kuningnya khas! 🟢🟡',
    funFact:'🏹 Dalam Mahabharata, Nagatatha/Taksaka adalah panah sakti Arjuna yang tidak pernah meleset!',
    history:'Taksaka diluncurkan PT KAI tahun 1999 untuk melayani penumpang eksekutif rute Jakarta Gambir ↔ Yogyakarta Tugu 🏯. Gerbongnya diproduksi INKA di Madiun dengan desain elegan dan nyaman untuk perjalanan malam. Nama "Taksaka" dipilih dari khazanah wayang Jawa — merujuk senjata panah Arjuna — mencerminkan identitas budaya kota tujuan Yogyakarta sebagai pusat budaya Jawa 🇮🇩🎭',
    route:'Jakarta Gambir ↔ Yogyakarta Tugu',
    quizHint:'kereta eksekutif Taksaka Jakarta Yogyakarta'
  },
  {
    emoji:'🚇', name:'KRL JR 205 — Hibah Jepang', country:'🇮🇩 Jabodetabek', year:2013,
    fuel:'Listrik (1500 VDC)', speed:100, type:'Kereta Rel Listrik Retrofit', builder:'JR East Jepang (retrofit Indonesia)',
    isElectric:true, bodyColor:'#FFC107', accentColor:'#D32F2F',
    fact:'KRL JR 205 adalah kereta BEKAS dari Jepang yang jadi tulang punggung KRL Jabodetabek! ⚡ Awalnya beroperasi di jalur Yamanote Tokyo, kini setelah direkondisi jadi andalan pulang-pergi kerja warga Jakarta! 🇯🇵➡️🇮🇩',
    funFact:'🗾 Dulu keretanya bertuliskan huruf Kanji Jepang — setelah direkondisi diganti huruf Latin Indonesia!',
    history:'Sejak 2013, PT KAI Commuter mengimpor seri JR 205 bekas dari JR East Jepang 🇯🇵. Kereta ini sudah dipensiunkan di Tokyo, lalu direkondisi di Balai Yasa Manggarai — cat ulang, AC baru, sistem pintu diperbaiki. Hasilnya: armada KRL bertambah banyak dengan biaya jauh lebih murah dari beli baru. JR 205 jadi tulang punggung KRL Jabodetabek yang mengangkut 1 juta+ penumpang per hari 🚆⚡',
    route:'Bogor/Bekasi/Tangerang ↔ Jakarta',
    quizHint:'kereta bekas Jepang JR205 KRL Jabodetabek'
  },
  {
    emoji:'🚋', name:'LRT Palembang — Asian Games 2018', country:'🇮🇩 Palembang, Sumatera Selatan', year:2018,
    fuel:'Listrik', speed:85, type:'Light Rail Transit', builder:'INKA + LEN Indonesia',
    isElectric:true, bodyColor:'#2E7D32', accentColor:'#FBC02D',
    fact:'LRT Palembang adalah kereta LRT pertama di Sumatera! 🏆 Dibangun khusus untuk Asian Games 2018. Seluruh keretanya buatan anak bangsa — INKA Madiun dan LEN Bandung! 🇮🇩🏭',
    funFact:'🏅 Di Asian Games 2018, LRT ini mengangkut ribuan atlet dan penonton ke Stadion Jakabaring!',
    history:'LRT Palembang dibangun khusus menyambut Asian Games 2018 yang diselenggarakan di Jakarta dan Palembang 🏅. Proyek ini membanggakan karena dikerjakan sepenuhnya oleh BUMN Indonesia: gerbong dari PT INKA Madiun, sistem sinyal dari PT LEN Bandung, dan konstruksi oleh PT Waskita Karya. Diresmikan Presiden Jokowi Juli 2018, LRT ini jadi LRT pertama di Sumatera dan simbol kemandirian teknologi transportasi Indonesia 🇮🇩🚆',
    route:'Bandara SMB II ↔ DJKA Jakabaring (23 km)',
    quizHint:'LRT pertama Sumatera Palembang Asian Games'
  }
]

// Child-friendly question bank for ages 5–8 (60+ questions)
const G18_QUESTIONS_BANK = [
  // Bagian kereta
  { q:'Apa nama orang yang mengemudikan kereta?', emoji:'🧑‍✈️', answers:['Masinis','Pilot','Kapten','Sopir bus'], correct:0 },
  { q:'Di mana kereta berjalan?', emoji:'🛤️', answers:['Di atas rel','Di atas jalan raya','Di atas air','Di udara'], correct:0 },
  { q:'Apa gunanya roda kereta?', emoji:'🎡', answers:['Supaya bisa jalan di rel','Supaya bisa terbang','Supaya bisa berenang','Supaya bisa berputar di udara'], correct:0 },
  { q:'Bagian kereta yang menghubungkan satu gerbong ke gerbong lain disebut apa?', emoji:'🔗', answers:['Sambungan/Kopling','Roda','Cerobong','Boiler'], correct:0 },
  { q:'Apa nama tempat kereta berhenti untuk menaikkan penumpang?', emoji:'🏛️', answers:['Stasiun','Terminal bus','Bandara','Pelabuhan'], correct:0 },
  { q:'Cerobong pada kereta uap berguna untuk apa?', emoji:'🏭', answers:['Tempat keluarnya asap','Tempat masuk penumpang','Menyimpan air','Sebagai roda cadangan'], correct:0 },
  { q:'Apa yang membuat kereta uap bisa bergerak?', emoji:'♨️', answers:['Uap panas dari air yang dipanaskan','Bensin seperti mobil','Tenaga angin','Baterai besar'], correct:0 },
  { q:'Boiler pada kereta uap berfungsi untuk apa?', emoji:'🫙', answers:['Memanaskan air menjadi uap','Menyimpan penumpang','Memberi cahaya di malam hari','Mengatur kecepatan'], correct:0 },
  { q:'Kereta yang ditenagai oleh listrik disebut kereta apa?', emoji:'⚡', answers:['Kereta listrik','Kereta uap','Kereta balon','Kereta angin'], correct:0 },
  { q:'Suara khas kereta yang sering kita dengar adalah?', emoji:'📢', answers:['Tuuut tuuut!','Wooosh!','Bzzz!','Splash!'], correct:0 },
  // Fakta sederhana
  { q:'Kereta api bergerak di atas apa?', emoji:'🛤️', answers:['Rel baja','Jalan aspal','Pasir','Rumput'], correct:0 },
  { q:'Berapa jalur rel yang biasanya digunakan kereta?', emoji:'🔢', answers:['Dua jalur (kiri dan kanan)','Satu jalur saja','Empat jalur','Tidak ada jalur'], correct:0 },
  { q:'Apa warna lampu merah di pintu perlintasan kereta artinya?', emoji:'🚦', answers:['Berhenti, kereta akan lewat!','Boleh jalan terus','Kereta sudah pergi','Masuk ke dalam kereta'], correct:0 },
  { q:'Gerbong kereta yang khusus untuk mengangkut barang disebut?', emoji:'📦', answers:['Gerbong barang/kargo','Gerbong penumpang','Gerbong makan','Gerbong tidur'], correct:0 },
  { q:'Kereta yang bisa naik ke gunung pakai rel bergerigi disebut?', emoji:'⛰️', answers:['Kereta gigi/bergigi','Kereta super cepat','Kereta selam','Kereta terbang'], correct:0 },
  { q:'Apa yang harus kita lakukan saat kereta akan melintas di perlintasan?', emoji:'⚠️', answers:['Berhenti dan menunggu','Lari menyeberang cepat','Diam di tengah rel','Melambai ke masinis'], correct:0 },
  { q:'Di Museum Kereta Ambarawa ada banyak kereta tua. Museum ini ada di mana?', emoji:'🗺️', answers:['Jawa Tengah, Indonesia','Bali','Jakarta','Surabaya'], correct:0 },
  { q:'Kereta tercepat di dunia menggunakan teknologi apa?', emoji:'🧲', answers:['Magnet (Maglev)','Roda bergerigi','Baling-baling','Roket'], correct:0 },
  { q:'Rel kereta biasanya terbuat dari apa?', emoji:'⚙️', answers:['Baja/besi','Kayu','Plastik','Karet'], correct:0 },
  { q:'Apa nama tempat tidur di dalam kereta malam?', emoji:'🛏️', answers:['Sleeper / gerbong tidur','Kursi biasa','Bangku taman','Kasur melayang'], correct:0 },
  // Kereta uap
  { q:'Bahan bakar utama kereta uap zaman dulu adalah?', emoji:'🪨', answers:['Batu bara','Bensin','Angin','Listrik'], correct:0 },
  { q:'Asap yang keluar dari cerobong kereta uap berasal dari?', emoji:'💨', answers:['Pembakaran batu bara','Mesin pendingin','Kipas angin','Uap air dingin'], correct:0 },
  { q:'Mengapa roda kereta uap terbuat dari besi?', emoji:'⚙️', answers:['Supaya kuat dan tidak mudah rusak','Supaya ringan','Supaya bisa mengapung','Supaya bisa terbang'], correct:0 },
  { q:'Selain batu bara, kereta uap juga bisa pakai bahan bakar apa?', emoji:'🪵', answers:['Kayu bakar','Gula','Air laut','Daun kering'], correct:0 },
  { q:'Kereta uap mulai banyak digunakan sekitar abad ke berapa?', emoji:'📅', answers:['Abad ke-19 (1800-an)','Abad ke-21 (2000-an)','Abad ke-15 (1400-an)','Abad ke-10 (900-an)'], correct:0 },
  // Kereta diesel & listrik
  { q:'Kereta diesel menggunakan bahan bakar apa?', emoji:'🛢️', answers:['Solar/diesel','Batu bara','Angin','Baterai saja'], correct:0 },
  { q:'Kereta listrik mendapat aliran listrik dari mana?', emoji:'⚡', answers:['Kawat listrik di atas rel atau dari rel ketiga','Baterai di dalam gerbong saja','Panel surya di atap saja','Generator bensin'], correct:0 },
  { q:'Kereta mana yang tidak mengeluarkan asap hitam sama sekali?', emoji:'🌿', answers:['Kereta listrik','Kereta uap','Kereta diesel','Kereta batu bara'], correct:0 },
  // Museum & Ambarawa
  { q:'Museum Kereta Api Ambarawa dulunya adalah sebuah?', emoji:'🏚️', answers:['Stasiun kereta','Pabrik baja','Sekolah masinis','Rumah sakit'], correct:0 },
  { q:'Kereta wisata Ambarawa berjalan melewati daerah yang terkenal karena apa?', emoji:'🌄', answers:['Pemandangan alam yang indah dan pegunungan','Pantai yang panjang','Padang pasir','Hutan es'], correct:0 },
  // Keselamatan
  { q:'Saat naik kereta, kita harus berdiri di belakang garis kuning karena?', emoji:'🟡', answers:['Supaya aman dari kereta yang lewat','Supaya bisa naik lebih cepat','Garis itu untuk hiasan','Agar bisa melihat kereta dari dekat'], correct:0 },
  { q:'Bolehkah kita bermain di atas rel kereta?', emoji:'❌', answers:['Tidak boleh, sangat berbahaya!','Boleh kalau tidak ada kereta','Boleh di malam hari','Boleh kalau bersama orang dewasa'], correct:0 },
  { q:'Apa yang harus kita pegang saat naik tangga kereta?', emoji:'🤝', answers:['Pegangan tangan/handrail','Tas kita','Teman kita saja','Tidak perlu pegang apapun'], correct:0 },
  { q:'Kapan kita boleh masuk ke dalam kereta?', emoji:'🚪', answers:['Setelah pintu terbuka dan penumpang keluar dulu','Langsung saja masuk','Sebelum kereta berhenti','Saat kereta masih berjalan'], correct:0 },
  // Kereta di dunia
  { q:'Kereta Shinkansen yang terkenal berasal dari negara mana?', emoji:'🇯🇵', answers:['Jepang','China','Prancis','Amerika'], correct:0 },
  { q:'Kereta TGV yang super cepat berasal dari negara mana?', emoji:'🇫🇷', answers:['Prancis','Jepang','Jerman','Indonesia'], correct:0 },
  { q:'Apa arti "Shinkansen" dalam bahasa Jepang?', emoji:'🚂', answers:['Jalur baru / kereta peluru','Kereta tua','Kereta angin','Kereta uap'], correct:0 },
  { q:'Kereta Maglev bergerak dengan cara apa yang unik?', emoji:'🧲', answers:['Melayang di atas rel menggunakan magnet','Berjalan di atas air','Menggunakan roda biasa yang sangat cepat','Ditarik oleh pesawat'], correct:0 },
  { q:'Kereta bawah tanah di kota besar biasa disebut apa?', emoji:'🚇', answers:['Subway atau MRT','Bus kota','Trem','Monorel'], correct:0 },
  // Menyenangkan & ringan
  { q:'Berapa banyak rel yang dibutuhkan agar kereta bisa berjalan lurus?', emoji:'🛤️', answers:['Dua (kiri dan kanan)','Satu','Empat','Tiga'], correct:0 },
  { q:'Kereta yang bergelantung di bawah rel atas disebut apa?', emoji:'🚡', answers:['Monorel gantung','Kereta selam','Kereta uap','Kereta angin'], correct:0 },
  { q:'Warna tradisional lokomotif uap Ambarawa kebanyakan adalah?', emoji:'🎨', answers:['Hitam','Merah cerah','Kuning terang','Biru muda'], correct:0 },
  { q:'Kereta barang bisa mengangkut benda-benda berat seperti?', emoji:'⛏️', answers:['Batu bara, kayu, kontainer','Makanan segar saja','Penumpang saja','Buku sekolah saja'], correct:0 },
  { q:'Apa yang terdengar saat roda kereta melintasi sambungan rel?', emoji:'👂', answers:['Klak-klak klak-klak!','Vroom vroom!','Bip bip!','Ciut ciut!'], correct:0 },
  { q:'Kenapa jendela kereta terbuat dari kaca tebal?', emoji:'🪟', answers:['Supaya kuat dan aman untuk penumpang','Supaya terlihat bagus saja','Supaya kereta lebih ringan','Karena kaca murah'], correct:0 },
  { q:'Apa yang dimaksud dengan "kereta ekspres"?', emoji:'⚡', answers:['Kereta yang hanya berhenti di stasiun besar saja','Kereta yang membawa paket ekspedisi','Kereta yang selalu terlambat','Kereta yang berjalan sangat pelan'], correct:0 },
  { q:'Siapa yang bertanggung jawab menjaga keamanan penumpang di dalam kereta?', emoji:'👮', answers:['Petugas/kondektur kereta','Penumpang sendiri','Anak-anak','Tidak ada yang bertanggung jawab'], correct:0 },
  { q:'Apa fungsi klakson/sirine pada kereta?', emoji:'📯', answers:['Memberi peringatan kepada orang di depan kereta','Sebagai lagu pengiring','Untuk mengisi bahan bakar','Untuk membuka pintu'], correct:0 },
  { q:'Kereta yang berjalan di atas satu rel disebut?', emoji:'🚝', answers:['Monorel','Kereta ganda','Kereta uap','Tramway'], correct:0 },
  { q:'Apa yang biasanya dijual di gerbong restoran kereta?', emoji:'🍱', answers:['Makanan dan minuman','Baju dan sepatu','Mainan','Buku pelajaran'], correct:0 },
  { q:'Berapa lama kereta uap zaman dulu biasanya mengisi ulang batu baranya?', emoji:'⏱️', answers:['Di setiap stasiun besar','Setiap 5 menit','Hanya sekali seumur hidup','Tidak perlu diisi ulang'], correct:0 },
  // Extra simple
  { q:'Kereta api adalah kendaraan yang berjalan di atas...?', emoji:'🚂', answers:['Rel','Jalan raya','Lautan','Langit'], correct:0 },
  { q:'Gerbong pertama yang ada mesinnya disebut?', emoji:'🚂', answers:['Lokomotif','Gerbong makan','Gerbong tidur','Gerbong barang'], correct:0 },
  { q:'Apa warna api yang membakar batu bara di dalam kereta uap?', emoji:'🔥', answers:['Merah-oranye','Hijau','Biru dingin','Ungu'], correct:0 },
  { q:'Jika kereta mau belok arah, apa yang diubah?', emoji:'🔀', answers:['Posisi rel (wesel)','Warna kereta','Jumlah penumpang','Nama stasiun'], correct:0 },
  { q:'Kenapa kereta lebih ramah lingkungan daripada pesawat?', emoji:'🌿', answers:['Mengangkut banyak orang dengan bahan bakar lebih sedikit','Bisa terbang tanpa emisi','Kereta tidak menggunakan bahan bakar','Kereta berjalan lebih lambat'], correct:0 },
  { q:'Apa nama baju resmi masinis kereta api?', emoji:'👔', answers:['Seragam masinis','Jas pesta','Baju renang','Baju olahraga'], correct:0 },
  { q:'Museum Ambarawa menyimpan kereta-kereta bersejarah agar?', emoji:'🏛️', answers:['Kita bisa belajar sejarah dan menghargai kereta lama','Kereta bisa berlomba','Kereta bisa dijual kembali','Kereta bisa dipakai masak'], correct:0 },

  // === BAGIAN KERETA INDONESIA ===
  { q:'Apa nama kereta komuter paling terkenal di Jakarta?', emoji:'🚆', answers:['KRL Commuter Line','Kereta Naga','Bus Kota Express','MRT Tanah Abang'], correct:0 },
  { q:'KRL singkatan dari apa?', emoji:'⚡', answers:['Kereta Rel Listrik','Kereta Rel Lama','Kereta Roda Listrik','Kereta Rel Laut'], correct:0 },
  { q:'MRT di Jakarta berjalan di atas dan di bawah apa?', emoji:'🚇', answers:['Di atas jalan (layang) dan di bawah tanah','Hanya di bawah tanah','Hanya di atas air','Di atas pegunungan'], correct:0 },
  { q:'Lokomotif CC 201 adalah kereta jenis apa?', emoji:'🚂', answers:['Lokomotif diesel','Kereta uap','Kereta listrik','Kereta magnet'], correct:0 },
  { q:'Kereta mana yang melayani rute Jakarta–Surabaya paling cepat?', emoji:'🏎️', answers:['Kereta Argo Bromo Anggrek','Kereta Barang','KRL Commuter','Kereta Gigi'], correct:0 },
  { q:'PT KAI singkatan dari apa?', emoji:'🇮🇩', answers:['Kereta Api Indonesia','Kereta Angkut Indonesia','Kendaraan Antar Indonesia','Kapal Angkut Indonesia'], correct:0 },
  { q:'LRT adalah singkatan dari?', emoji:'🚈', answers:['Light Rail Transit','Large Rail Train','Long Route Track','Light Road Train'], correct:0 },
  { q:'Stasiun kereta terbesar dan terkenal di Jakarta adalah?', emoji:'🏛️', answers:['Stasiun Gambir','Stasiun Ambarawa','Stasiun Bogor','Stasiun Bandung'], correct:0 },
  { q:'Kereta Argo dalam bahasa Indonesia berarti apa?', emoji:'⛰️', answers:['Gunung','Laut','Sungai','Angin'], correct:0 },
  { q:'Berapakah kelas pelayanan utama kereta penumpang di Indonesia?', emoji:'🎫', answers:['Tiga kelas: Eksekutif, Bisnis, Ekonomi','Satu kelas saja','Dua kelas saja','Lima kelas'], correct:0 },
  { q:'Jalur kereta api pertama di Indonesia dibangun oleh siapa?', emoji:'📜', answers:['Pemerintah Belanda','Pemerintah Jepang','Pemerintah Indonesia','Pemerintah Inggris'], correct:0 },
  { q:'Kota mana yang terkenal dengan wisata kereta uap Ambarawa?', emoji:'🗺️', answers:['Ambarawa, Jawa Tengah','Yogyakarta','Surabaya','Medan'], correct:0 },
  { q:'Kereta wisata Ambarawa terkenal karena bisa mendaki bukit dengan apa?', emoji:'⚙️', answers:['Rel bergerigi di tengah rel','Roda yang sangat besar','Mesin jet','Baling-baling di bawah'], correct:0 },
  { q:'Di kota mana ada kereta gantung/cable car terkenal di Indonesia?', emoji:'🚡', answers:['Puncak, Jawa Barat','Bali','Lombok','Medan'], correct:0 },
  { q:'Lokomotif D 301 adalah kereta uap yang berjalan di atas rel dengan lebar berapa?', emoji:'📏', answers:['1067 mm (rel sempit)','1435 mm (rel standar)','500 mm (rel mini)','2000 mm (rel lebar)'], correct:0 },

  // === BAGIAN SAINS KERETA ===
  { q:'Mengapa roda kereta dan rel terbuat dari besi/baja?', emoji:'🔩', answers:['Karena besi sangat keras dan tahan lama','Karena besi murah sekali','Karena besi bisa mengapung','Karena besi ringan'], correct:0 },
  { q:'Bagaimana kereta bisa berhenti jika tidak ada rem?', emoji:'🛑', answers:['Tidak bisa, makanya kereta pasti punya rem!','Dengan menabrak tembok','Dengan melompat dari rel','Dengan terbang ke atas'], correct:0 },
  { q:'Kenapa rel kereta ada jarak kecil di setiap sambungannya?', emoji:'🌡️', answers:['Supaya rel bisa memuai saat panas tanpa melengkung','Supaya terlihat indah','Supaya lebih murah','Supaya kereta bisa melompat'], correct:0 },
  { q:'Apa yang dimaksud dengan "trek lurus" pada rel kereta?', emoji:'📐', answers:['Jalur rel yang tidak memiliki tikungan','Rel yang sangat pendek','Rel untuk kereta tua','Rel yang bergelombang'], correct:0 },
  { q:'Kereta Maglev bisa sangat cepat karena tidak ada apa?', emoji:'🧲', answers:['Tidak ada gesekan antara roda dan rel','Tidak ada penumpang','Tidak ada bahan bakar','Tidak ada masinis'], correct:0 },
  { q:'Apa yang terjadi jika rel kereta terlalu panas?', emoji:'🌞', answers:['Rel bisa melengkung dan berbahaya','Kereta menjadi lebih cepat','Rel berubah warna menjadi merah','Kereta bisa terbang'], correct:0 },
  { q:'Mengapa kereta lebih hemat bahan bakar daripada mobil?', emoji:'🌿', answers:['Karena satu kereta bisa angkut ratusan orang sekaligus','Karena kereta lebih kecil','Karena kereta tidak butuh energi','Karena kereta berjalan lebih pelan'], correct:0 },
  { q:'Sistem pengereman kereta modern menggunakan apa?', emoji:'💨', answers:['Rem udara (pneumatik)','Rem tangan biasa','Air panas','Magnet saja'], correct:0 },
  { q:'Apa yang dimaksud dengan "wesel" pada rel kereta?', emoji:'🔀', answers:['Alat untuk memindahkan kereta ke jalur lain','Nama masinis','Jenis bahan bakar','Bagian dari gerbong'], correct:0 },
  { q:'Kereta dapat mengangkut banyak barang berat karena apa?', emoji:'💪', answers:['Karena gesekan roda besi di rel besi sangat kecil','Karena kereta punya sayap','Karena kereta terbuat dari plastik ringan','Karena kereta punya 100 roda'], correct:0 },
  { q:'Panton atau "pantograph" pada kereta listrik berfungsi apa?', emoji:'⚡', answers:['Mengambil listrik dari kawat di atas kepala','Sebagai antena TV','Untuk memberi sinyal ke penumpang','Sebagai rem darurat'], correct:0 },
  { q:'Apa itu "sinyal semaphore" yang digunakan di zaman kereta dulu?', emoji:'🚦', answers:['Alat sinyal berlengan yang memberi tanda aman atau bahaya','Nama stasiun di Jawa','Jenis kereta uap','Bahan bakar kereta'], correct:0 },
  { q:'Mengapa kereta cepat (HSR) memiliki hidung yang sangat runcing?', emoji:'🔺', answers:['Supaya bisa membelah angin dengan lebih mudah','Supaya terlihat keren','Supaya bisa dipakai sebagai senjata','Supaya bisa mengangkut lebih banyak penumpang'], correct:0 },
  { q:'Apa yang terjadi saat dua kereta bertemu di jalur yang sama dan berlawanan arah?', emoji:'😱', answers:['Sangat berbahaya! Itu sebabnya ada sistem sinyal khusus','Kereta saling melompati','Salah satu kereta terbang','Tidak mungkin terjadi'], correct:0 },
  { q:'Apa nama alat yang mengukur kecepatan kereta?', emoji:'🖥️', answers:['Speedometer/tachometer','Termometer','Barometer','Kompas'], correct:0 },

  // === BAGIAN KERETA DUNIA ===
  { q:'Negara mana yang memiliki jaringan kereta cepat (HSR) terpanjang di dunia?', emoji:'🌏', answers:['China','Jepang','Prancis','Jerman'], correct:0 },
  { q:'Kereta ICE yang terkenal berasal dari negara mana?', emoji:'🇩🇪', answers:['Jerman','Italia','Spanyol','Belgia'], correct:0 },
  { q:'Kereta KTX berasal dari negara mana?', emoji:'🇰🇷', answers:['Korea Selatan','Korea Utara','Jepang','Taiwan'], correct:0 },
  { q:'Apa nama kereta cepat terbaru China yang bisa melampaui 350 km/jam?', emoji:'🚂', answers:['CR400 Fuxing','Shinkansen N700','TGV Duplex','ICE 4'], correct:0 },
  { q:'Trans-Siberia Railway adalah rute kereta terpanjang di dunia. Ada di negara mana?', emoji:'🇷🇺', answers:['Rusia','Amerika','Australia','India'], correct:0 },
  { q:'Kereta Orient Express yang terkenal di buku cerita melayani rute di mana?', emoji:'🌍', answers:['Eropa (dari Paris ke Istanbul)','Asia (dari Tokyo ke Beijing)','Afrika (dari Kairo ke Capetown)','Amerika (dari New York ke Los Angeles)'], correct:0 },
  { q:'Berapa kira-kira kecepatan maksimum Shinkansen saat ini?', emoji:'🚂', answers:['Sekitar 320 km/jam','Sekitar 100 km/jam','Sekitar 500 km/jam','Sekitar 50 km/jam'], correct:0 },
  { q:'Apa nama stasiun kereta paling sibuk di dunia yang ada di Jepang?', emoji:'🏙️', answers:['Stasiun Shinjuku, Tokyo','Stasiun Grand Central, New York','Stasiun Waterloo, London','Stasiun Gare du Nord, Paris'], correct:0 },
  { q:'Eurostar adalah kereta yang melintas di bawah laut antara negara mana?', emoji:'🌊', answers:['Inggris dan Prancis','Amerika dan Kanada','Jepang dan Korea','Swedia dan Denmark'], correct:0 },
  { q:'Kereta yang terkenal melewati pegunungan Alpen ada di negara mana?', emoji:'🏔️', answers:['Swiss','Brasil','Australia','Meksiko'], correct:0 },
  { q:'Negara manakah yang pertama kali membuat kereta uap di dunia?', emoji:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', answers:['Inggris','Amerika','Prancis','Jerman'], correct:0 },
  { q:'Siapa penemu lokomotif uap pertama yang terkenal?', emoji:'👨‍🔬', answers:['George Stephenson','Albert Einstein','Thomas Edison','James Watt'], correct:0 },
  { q:'Tahun berapa kereta uap pertama kali berjalan di lintasan penumpang?', emoji:'📅', answers:['Tahun 1825','Tahun 1900','Tahun 1750','Tahun 1950'], correct:0 },
  { q:'Kereta Swiss yang terkenal melewati pegunungan tinggi disebut?', emoji:'⛰️', answers:['Glacier Express','Polar Express','Desert Express','Ocean Express'], correct:0 },
  { q:'Kereta mana yang pernah jadi yang tercepat di dunia dengan 574 km/jam?', emoji:'🏆', answers:['TGV (Prancis)','Shinkansen (Jepang)','Maglev SCMaglev (Jepang)','ICE (Jerman)'], correct:0 },

  // === BAGIAN KESELAMATAN LEBIH BANYAK ===
  { q:'Apa yang harus kamu lakukan jika ketinggalan kereta?', emoji:'😅', answers:['Tunggu kereta berikutnya dengan aman','Kejar kereta sambil berlari di rel','Coba naik ke kereta yang sudah jalan','Melompat ke atas kereta'], correct:0 },
  { q:'Saat di dalam kereta yang penuh sesak, kamu harus?', emoji:'🚶', answers:['Tetap tenang dan berpegangan','Berteriak keras','Mendorong penumpang lain','Lari ke gerbong lain tanpa berpegangan'], correct:0 },
  { q:'Apa yang TIDAK boleh kamu lempar ke luar jendela kereta?', emoji:'🚮', answers:['Semua benda apapun, termasuk sampah!','Hanya kertas','Hanya makanan','Hanya batu'], correct:0 },
  { q:'Saat kereta darurat harus berhenti mendadak, apa yang sebaiknya kamu lakukan?', emoji:'🆘', answers:['Pegang pegangan erat-erat dan duduk','Berdiri dan berlari','Buka pintu dan keluar','Berteriak sekeras mungkin'], correct:0 },
  { q:'Mengapa perlintasan kereta api memiliki palang (portal) yang turun?', emoji:'⛔', answers:['Untuk mencegah kendaraan melintas saat kereta lewat','Karena sedang diperbaiki','Untuk menghitung kendaraan yang lewat','Karena rel sedang basah'], correct:0 },
  { q:'Berapa jauh jarak aman yang harus kamu jaga dari tepi peron kereta?', emoji:'🟡', answers:['Di belakang garis kuning yang ada di peron','Tepat di tepi peron','Satu langkah dari rel','Tidak perlu jaga jarak'], correct:0 },

  // === BAGIAN FAKTA MENARIK ===
  { q:'Kereta barang terpanjang di dunia bisa mencapai panjang berapa kilometer?', emoji:'😲', answers:['Lebih dari 7 km panjangnya!','Hanya 100 meter','Tepat 1 km','Sekitar 500 meter'], correct:0 },
  { q:'Apa nama suara khas yang dihasilkan roda kereta saat melewati sambungan rel?', emoji:'🎵', answers:['Klakson-klakson (clackety-clack)','Zing-zing','Boom-boom','Bip-bip'], correct:0 },
  { q:'Kereta wisata mini yang sering ada di kebun binatang atau taman disebut?', emoji:'🎠', answers:['Kereta mini/kereta kecil','Kereta uap bersar','MRT','Monorel'], correct:0 },
  { q:'Kereta di Disneyland yang mengelilingi taman menggunakan tenaga apa?', emoji:'🎡', answers:['Kereta uap (steam train)','Kereta listrik','Kereta diesel','Kereta angin'], correct:0 },
  { q:'Apa nama kereta legendaris yang ada di film "Polar Express"?', emoji:'🎄', answers:['Kereta Natal ajaib yang pergi ke Kutub Utara','Shinkansen Kutub Utara','KRL Natal','TGV Salju'], correct:0 },
  { q:'Kereta yang membawa susu dan hasil ladang dari desa ke kota biasa disebut?', emoji:'🐄', answers:['Kereta barang / freight train','Kereta penumpang kelas bisnis','Shinkansen perdesaan','MRT pertanian'], correct:0 },
  { q:'Mengapa kereta wisata uap di Ambarawa sangat populer untuk wisata keluarga?', emoji:'❤️', answers:['Karena jarang bisa melihat kereta uap asli yang masih berjalan','Karena sangat cepat','Karena gratis untuk semua orang','Karena ada di semua kota'], correct:0 },
  { q:'Di Eropa, kereta antar kota biasanya disebut apa?', emoji:'🇪🇺', answers:['InterCity atau Intercity Express','LocalCity','SlowCity','NightBus'], correct:0 },
  { q:'Gerbong tidur (sleeper car) di kereta malam biasanya memiliki apa di dalamnya?', emoji:'🌙', answers:['Tempat tidur bersusun dan bantal','Hanya kursi biasa','Kolam renang kecil','Dapur dan kompor'], correct:0 },
  { q:'Kenapa kereta api disebut "kereta api" padahal tidak selalu pakai api?', emoji:'🔥', answers:['Karena dulu kereta pertama menggunakan uap dari api untuk bergerak','Karena kereta terbuat dari besi yang panas','Karena kereta berjalan secepat api','Karena penumpang dilarang membawa api'], correct:0 },
  { q:'Berapa berat sebuah lokomotif kereta uap besar kira-kira?', emoji:'⚖️', answers:['Bisa mencapai 100-200 ton lebih!','Hanya sekitar 1 ton','Sekitar 5 ton','Persis sama dengan truk biasa'], correct:0 },
  { q:'Apa itu "gerbong restorasi" di kereta penumpang?', emoji:'🍽️', answers:['Gerbong tempat penumpang bisa makan dan minum','Gerbong yang sedang diperbaiki','Gerbong untuk menyimpan makanan saja','Gerbong khusus masinis'], correct:0 },

  // === BAGIAN KERETA DAN ALAM ===
  { q:'Mengapa membangun jalur kereta di pegunungan sangat sulit?', emoji:'🏔️', answers:['Karena harus membuat terowongan dan jembatan yang sangat besar','Karena tidak ada tanah datar','Karena gunung bergerak','Karena kereta tidak bisa naik turun'], correct:0 },
  { q:'Terowongan kereta yang menembus gunung biasanya dibangun menggunakan apa?', emoji:'⛏️', answers:['Mesin bor raksasa (TBM) dan dinamit','Tangan manusia saja','Sihir','Air keras'], correct:0 },
  { q:'Jembatan kereta yang sangat tinggi di atas lembah disebut apa?', emoji:'🌉', answers:['Viaduct','Overpass','Flyover','Causeway'], correct:0 },
  { q:'Kereta yang bisa berjalan di atas air menggunakan apa?', emoji:'🌊', answers:['Jembatan atau terowongan bawah laut, bukan langsung di air','Pontoon / rakit besar','Roda khusus anti air','Kereta tidak bisa melewati air'], correct:0 },
  { q:'Saat musim salju, rel kereta bisa tertutup salju. Apa yang dilakukan petugas?', emoji:'❄️', answers:['Membersihkan salju dengan snowplow khusus di kereta','Membiarkan kereta menabrak salju','Menutup semua stasiun permanen','Mengalihkan kereta ke jalan raya'], correct:0 },
  { q:'Di daerah pegunungan yang sangat terjal, kereta bergerigi bisa naik karena?', emoji:'⛰️', answers:['Ada roda gigi yang mengait rel bergerigi di tengah rel','Ada sayap kecil di badan kereta','Mesin yang sangat kuat tanpa tanjakan','Ada perekat di roda kereta'], correct:0 },

  // === BAGIAN GAMBAR / BENTUK KERETA ===
  { q:'Apa ciri khas bentuk kepala kereta uap zaman dulu?', emoji:'🚂', answers:['Memiliki cerobong asap besar di depan','Hidung sangat runcing','Berbentuk kotak persegi','Tidak memiliki kepala sama sekali'], correct:0 },
  { q:'Kereta peluru (bullet train) mendapat namanya karena?', emoji:'🔫', answers:['Bentuk hidungnya yang runcing seperti peluru dan kecepatannya','Karena bisa menembak','Karena suaranya seperti tembakan','Karena terbuat dari bahan seperti peluru'], correct:0 },
  { q:'Warna dominan Shinkansen seri N700 Jepang adalah?', emoji:'🎨', answers:['Putih dengan garis biru','Merah dan kuning','Hitam seluruhnya','Hijau dan emas'], correct:0 },
  { q:'Apa yang ada di atas kepala kereta listrik yang menyentuh kabel listrik di atas?', emoji:'🔌', answers:['Pantograph (semacam tangan besi berbentuk V atau Z)','Antena radio','Kamera pengawas','Bendera nasional'], correct:0 },
  { q:'Gerbong kereta yang paling di belakang sering disebut apa di zaman kereta uap?', emoji:'🔚', answers:['Caboose (gerbong belakang pengawas)','Tender (gerbong batu bara)','Bagasi','Restorasi'], correct:0 },
  { q:'Tender pada kereta uap berfungsi untuk menyimpan apa?', emoji:'🛢️', answers:['Batu bara dan air untuk ketel uap','Penumpang kelas satu','Senjata api','Mesin cadangan'], correct:0 },

  // === PERTANYAAN SAINS ANAK ===
  { q:'Energi apa yang menggerakkan kereta uap?', emoji:'🌡️', answers:['Energi panas yang diubah menjadi energi gerak (mekanik)','Energi cahaya matahari langsung','Energi kimia dari baterai','Energi angkasa luar'], correct:0 },
  { q:'Mengapa jalur rel lebih ramah lingkungan dibanding jalan tol untuk angkutan barang?', emoji:'🌍', answers:['Kereta mengangkut lebih banyak barang dengan emisi lebih sedikit per ton','Rel tidak perlu perawatan','Kereta bisa terbang menghindari kemacetan','Rel terbuat dari bahan daur ulang'], correct:0 },
  { q:'Apa yang membuat kereta lebih aman dari mobil saat hujan deras?', emoji:'🌧️', answers:['Kereta berjalan di rel khusus, tidak terganggu hujan seperti di jalan raya','Kereta punya payung raksasa','Kereta bisa berenang','Kereta tidak pernah hujan'], correct:0 },
  { q:'Apa nama proses mengubah air menjadi uap dengan cara dipanaskan?', emoji:'♨️', answers:['Penguapan (evaporasi)','Pembekuan','Kristalisasi','Kondensasi'], correct:0 },
  { q:'Ketika uap air mendingin dan berubah kembali menjadi air, proses ini disebut?', emoji:'💧', answers:['Kondensasi','Evaporasi','Sublimasi','Kristalisasi'], correct:0 },
  { q:'Mengapa badan kereta terbuat dari baja bukan dari kayu?', emoji:'🔩', answers:['Baja lebih kuat, tahan api, dan tahan lama','Kayu lebih berat dari baja','Baja lebih murah dari kayu','Karena pohon langka'], correct:0 },

  // === PERTANYAAN SEJARAH LOKAL ===
  { q:'Kereta uap B 2507 di Museum Ambarawa dibuat di negara mana?', emoji:'🇨🇭', answers:['Swiss (SLM Winterthur)','Jerman','Belanda','Amerika'], correct:0 },
  { q:'Jalur kereta bergerigi Ambarawa–Bedono dibangun pada tahun berapa?', emoji:'📅', answers:['Sekitar tahun 1900-an (zaman Belanda)','Tahun 1960-an','Tahun 1985','Tahun 2000'], correct:0 },
  { q:'Siapa yang membangun jaringan kereta api pertama di Jawa?', emoji:'🏗️', answers:['Pemerintah Kolonial Belanda','Kerajaan Mataram','Pemerintah Indonesia merdeka','Perusahaan Inggris'], correct:0 },
  { q:'Apa nama perusahaan kereta api Belanda yang pernah beroperasi di Jawa?', emoji:'🇳🇱', answers:['NIS (Nederlandsch-Indische Spoorweg Maatschappij)','VOC Express','Java Rail','Dutch Train Co.'], correct:0 },
  { q:'Setelah Indonesia merdeka, kereta api di Indonesia dikelola oleh?', emoji:'🇮🇩', answers:['PT Kereta Api Indonesia (PT KAI)','Pemerintah Belanda','Perusahaan swasta asing','Tidak ada yang mengelola'], correct:0 },
  { q:'Jalur kereta api pertama di Indonesia ada di kota mana?', emoji:'📍', answers:['Semarang–Tanggung, Jawa Tengah','Jakarta–Bogor','Surabaya–Malang','Bandung–Cimahi'], correct:0 },

  // === PERTANYAAN PENUTUP MENYENANGKAN ===
  { q:'Jika kamu jadi masinis, hal pertama apa yang harus kamu cek sebelum berangkat?', emoji:'✅', answers:['Rem, sinyal, dan kondisi jalur kereta','Warna baju penumpang','Berapa banyak snack di gerbong','Cuaca di luar negeri'], correct:0 },
  { q:'Apa hadiah terbaik untuk seorang anak yang suka kereta api?', emoji:'🎁', answers:['Mainan kereta set atau buku kereta api','Mainan boneka','Sepatu bola','Ikan hias'], correct:0 },
  { q:'Apakah ada kereta api di luar angkasa?', emoji:'🚀', answers:['Belum ada, tapi ada rencana lunar railway di masa depan!','Ya, ada di planet Mars sekarang','Ya, mengelilingi bulan','Tidak mungkin selamanya'], correct:0 },
  { q:'Apa cita-citamu jika berhubungan dengan kereta api?', emoji:'💭', answers:['Jadi masinis, insinyur kereta, atau arsitek stasiun!','Tidak ada pilihan','Hanya bisa jadi penumpang','Tidak ada karir kereta api'], correct:0 },
  { q:'Kenapa belajar tentang kereta api itu penting?', emoji:'📚', answers:['Karena kereta menghubungkan kota, membawa barang, dan ramah lingkungan!','Karena kereta sudah tidak ada lagi','Hanya untuk orang dewasa','Karena tidak ada transportasi lain'], correct:0 },
]

// Quiz session: pick 8 random questions from the bank
const G18_QUIZ_COUNT = 8
let G18_QUIZ_SESSION = []

function g18ShuffleQuiz() {
  // v54.27 I11: `Array.sort(() => Math.random() - 0.5)` is BIASED — items
  // near the start tend to stay put. Real Fisher-Yates instead.
  // Plus: filter against last-3-session question history (g18FilterRecent
  // from v54.23 F3) and use seeded shuffle so same-day quiz is stable.
  let pool = G18_QUESTIONS_BANK.slice()
  try { if (typeof g18FilterRecent === 'function') pool = g18FilterRecent(pool) } catch(_){}
  let shuffled
  try {
    shuffled = (typeof g18SeededShuffle === 'function') ? g18SeededShuffle(pool) : pool.slice()
  } catch(_){ shuffled = pool.slice() }
  // Fisher-Yates fallback / refinement
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  G18_QUIZ_SESSION = shuffled.slice(0, G18_QUIZ_COUNT)
  try { if (typeof g18RecordRecent === 'function') g18RecordRecent(G18_QUIZ_SESSION) } catch(_){}
}

// Legacy alias (used by g18FinishQuiz star calculation)
const G18_QUIZ = G18_QUESTIONS_BANK

let g18State = {}

function initGame19() {
  battleBgmStop()
  const lv = state.selectedLevelNum || 1
  try { sessionStorage.setItem('g19Config', JSON.stringify({ level: lv })) } catch(_) {}
  window.location.href = 'games/pokemon-birds.html'
}

function initGame20() {
  battleBgmStop()
  const lv = state.selectedLevelNum || 1
  try { sessionStorage.setItem('g20Config', JSON.stringify({ level: lv })) } catch(_) {}
  window.location.href = 'games/ducky-volley.html?v=20260424h'
}

function initGame22() {
  battleBgmStop()
  const lv = state.selectedLevelNum || 1
  try { sessionStorage.setItem('g22Config', JSON.stringify({ level: lv })) } catch(_) {}
  window.location.href = 'games/monster-candy.html?v=20260714a'
}

function initGame23() {
  battleBgmStop()
  const lv = state.selectedLevelNum || 1
  try { sessionStorage.setItem('g23Config', JSON.stringify({ level: lv })) } catch(_) {}
  window.location.href = 'games/pokemon-run.html?v=20260506ae'
}

function initGame24() {
  battleBgmStop()
  const lv = state.selectedLevelNum || 1
  try { sessionStorage.setItem('g24Config', JSON.stringify({ level: lv })) } catch(_) {}
  window.location.href = 'games/pokemon-bawah-laut.html?v=20260506m'
}

function openWorldPicker() {
  const el = document.getElementById('world-picker-modal')
  if (!el) return
  el.style.display = 'flex'
  // Inject live star progress into each mode button
  try {
    const gp24 = getLevelProgress(24), gp23 = getLevelProgress(23), gp19 = getLevelProgress(19)
    const stars24 = Object.values(gp24.stars||{}).reduce((a,b)=>a+b,0)
    const stars23 = Object.values(gp23.stars||{}).reduce((a,b)=>a+b,0)
    const stars19 = Object.values(gp19.stars||{}).reduce((a,b)=>a+b,0)
    const done24 = gp24.completed.length, done23 = gp23.completed.length, done19 = gp19.completed.length
    const _st = (done, total, stars) => done > 0 ? `${done}/${total} level · ⭐${stars}` : ''
    const si24 = document.getElementById('wpk-stars-24'); if (si24) si24.textContent = _st(done24, 40, stars24)
    const si23 = document.getElementById('wpk-stars-23'); if (si23) si23.textContent = _st(done23, 30, stars23)
    const si19 = document.getElementById('wpk-stars-19'); if (si19) si19.textContent = _st(done19, 30, stars19)
  } catch(_) {}
}
function closeWorldPicker() {
  const el = document.getElementById('world-picker-modal')
  if (el) el.style.display = 'none'
}

function initGame21() {
  battleBgmStop()
  const lv = state.selectedLevelNum || 1
  const diff = state.selectedLevel === 'hard' ? 'hard' : state.selectedLevel === 'medium' ? 'medium' : 'easy'
  try { sessionStorage.setItem('g21Config', JSON.stringify({ level: lv, difficulty: diff })) } catch(_) {}
  window.location.href = 'games/mario-pokemon.html?v=20260505o'
}

function initGame18() {
  battleBgmStop()
  // v54.48: daily mission via mascot (once per day across all train games).
  try { window.TrainShared && TrainShared.dailyChallenge.showOncePerDay() } catch(_){}
  const lv = state.selectedLevelNum || 1
  g18State = {
    lv, quizIdx: 0, quizScore: 0, quizActive: false,
    answeredCurrent: false
  }
  document.getElementById('g18-level').textContent = `Lv.${lv}`
  document.getElementById('g18-stars-badge').textContent = '🏛️ 0'
  hideGameResult()
  document.getElementById('g18-modal').classList.remove('open')
  document.getElementById('g18-gallery').style.display = 'block'
  document.getElementById('g18-quiz-view').style.display = 'none'
  g18RenderGallery()
  try { g18ShowDailyTrivia() } catch(_){}
  try { g18UpdatePassportChip() } catch(_){}
  g18Missed = []
  // v54.24 G13 + G8: cross-cutting word-of-the-day + greeting
  try { if (window.TrainShared) { TrainShared.wordOfDay.showBanner(); TrainShared.greeting.onEnterGame('g18') } } catch(_){}
  // v54.23 hooks: collapsible sections, hero banner, cerita glow, gamelan ambient,
  // long-press whistle, conductor avatar greet, timeline/map FAB buttons.
  try { g18MakeSectionsCollapsible() } catch(_){}
  try { g18EnhanceHeroBanner() } catch(_){}
  try { g18MaybeGlowStoryBtn() } catch(_){}
  try { g18WireLongPressWhistle() } catch(_){}
  try { g18GamelanStart() } catch(_){}
  try { g18ConductorWave() } catch(_){}
  // v54.23 F15/F16 + v54.25 H1/H9/H8/H10/H6 FAB
  try {
    let fab = document.getElementById('g18-extra-fab')
    if (!fab) {
      fab = document.createElement('div')
      fab.id = 'g18-extra-fab'
      fab.style.cssText = 'position:fixed;right:14px;bottom:18px;z-index:60;display:flex;flex-direction:column;gap:8px'
      fab.innerHTML = `
        <button onclick="g18ShowTimeline()" style="width:50px;height:50px;border-radius:50%;border:0;background:linear-gradient(135deg,#fde047,#f59e0b);color:#451a03;font-size:20px;font-weight:900;cursor:pointer;box-shadow:0 6px 16px rgba(0,0,0,0.4)" title="Timeline">📅</button>
        <button onclick="g18ShowJavaMap()" style="width:50px;height:50px;border-radius:50%;border:0;background:linear-gradient(135deg,#06b6d4,#0891b2);color:#fff;font-size:20px;font-weight:900;cursor:pointer;box-shadow:0 6px 16px rgba(0,0,0,0.4)" title="Peta">🗺️</button>
        <button onclick="if(window.TrainShared)TrainShared.achievements.showWall()" style="width:50px;height:50px;border-radius:50%;border:0;background:linear-gradient(135deg,#fbbf24,#d97706);color:#451a03;font-size:20px;font-weight:900;cursor:pointer;box-shadow:0 6px 16px rgba(0,0,0,0.4)" title="Achievement Wall">🏆</button>
        <button onclick="if(window.TrainShared)TrainShared.garage.show()" style="width:50px;height:50px;border-radius:50%;border:0;background:linear-gradient(135deg,#a855f7,#7c3aed);color:#fff;font-size:20px;font-weight:900;cursor:pointer;box-shadow:0 6px 16px rgba(0,0,0,0.4)" title="Garasi">🏠</button>
        <button onclick="if(window.TrainShared)TrainShared.cosmetics.show()" style="width:50px;height:50px;border-radius:50%;border:0;background:linear-gradient(135deg,#ec4899,#be185d);color:#fff;font-size:20px;font-weight:900;cursor:pointer;box-shadow:0 6px 16px rgba(0,0,0,0.4)" title="Aksesoris">🎁</button>
        <button onclick="if(window.TrainShared)TrainShared.photoframe.show()" style="width:50px;height:50px;border-radius:50%;border:0;background:linear-gradient(135deg,#8d6e63,#5d3a1a);color:#fff;font-size:20px;font-weight:900;cursor:pointer;box-shadow:0 6px 16px rgba(0,0,0,0.4)" title="Lorong Kenangan">🖼️</button>
        <button onclick="if(window.TrainShared){TrainShared.ui.showSettings()}" style="width:50px;height:50px;border-radius:50%;border:0;background:linear-gradient(135deg,#64748b,#334155);color:#fff;font-size:20px;font-weight:900;cursor:pointer;box-shadow:0 6px 16px rgba(0,0,0,0.4)" title="Pengaturan">⚙️</button>`
      document.body.appendChild(fab)
    }
    fab.style.display = 'flex'
  } catch(_){}
  // v54.25 H6: birthday celebrate (already auto-runs on boot, but kick again on visit)
  try { if (window.TrainShared && TrainShared.birthday.isToday()) TrainShared.birthday.celebrate() } catch(_){}
}

function g18RenderGallery() {
  const grid = document.getElementById('g18-card-grid')
  grid.innerHTML = ''
  // Partition: Ambarawa (indices 0-11), Modern Indonesia (🇮🇩 outside Ambarawa), World (everything else)
  const AMBARAWA_END = 12
  const buckets = { ambarawa: [], modernID: [], world: [] }
  G18_TRAINS.forEach((train, i) => {
    if (i < AMBARAWA_END) buckets.ambarawa.push({ train, i })
    else if (train.country && train.country.startsWith('🇮🇩')) buckets.modernID.push({ train, i })
    else buckets.world.push({ train, i })
  })
  const sections = [
    { items: buckets.ambarawa, title: '🏛️ KOLEKSI MUSEUM AMBARAWA', color: '#FFD082', borderCol: 'rgba(255,193,80,0.35)', ruleCol: 'rgba(255,193,100,0.35)' },
    { items: buckets.modernID, title: '🇮🇩 KERETA MODERN INDONESIA',  color: '#FCA5A5', borderCol: 'rgba(252,165,165,0.4)',  ruleCol: 'rgba(252,165,165,0.35)' },
    { items: buckets.world,    title: '🌍 KERETA TERKENAL DUNIA',    color: 'rgba(180,210,255,0.9)', borderCol: 'rgba(100,150,255,0.35)', ruleCol: 'rgba(150,200,255,0.25)' }
  ]
  sections.forEach(sec => {
    if (!sec.items.length) return
    const hdr = document.createElement('div')
    hdr.style.cssText = `grid-column:1/-1;color:${sec.color};font-size:12px;font-weight:900;letter-spacing:1.5px;padding:10px 2px 2px;border-bottom:1.5px solid ${sec.ruleCol};margin-bottom:2px;`
    hdr.textContent = sec.title
    grid.appendChild(hdr)
    sec.items.forEach(({ train, i }) => {
      const card = document.createElement('div')
      card.className = 'g18-card'
      card.style.borderColor = sec.borderCol
      const svgHtml = g18TrainSVG(train, 110, 48)
      // v54.22 E7+E9: proportional speed badge with tier icon
      card.innerHTML = `
        <div style="width:100%;height:56px;display:flex;align-items:center;justify-content:center;margin-bottom:4px;overflow:hidden;">${svgHtml}</div>
        <div class="g18-card-name" style="font-size:11px;">${train.name}</div>
        <div class="g18-card-country" style="font-size:9px;">${train.country.split(',')[0]}</div>
        ${g18SpeedBadge(train.speed)}
        <div style="color:rgba(255,255,255,0.5);font-size:9px;font-weight:700;margin-top:2px;">${train.year}</div>
      `
      card.onclick = () => g18ShowDetail(i)
      grid.appendChild(card)
    })
  })
}

function g18ShowDetail(idx) {
  _g18CurrentTrainIdx = idx
  const train = G18_TRAINS[idx]
  const emojiEl = document.getElementById('g18-modal-emoji')
  emojiEl.innerHTML = g18TrainSVG(train, 160, 70, true)   // v55.70 B-273 — animate the hero loco (proper spoked wheels via dunWheel)
  // v54.22 E13 / v55.70 B-273: gentle horizontal bob only. The OLD rule also did
  // `#g18-modal-emoji svg circle{transform-origin:center;animation:spin}` which
  // spun EVERY circle (smoke, headlight, dome) around the SVG viewBox centre with
  // no fill-box → "revolution mutar tanpa poros". Wheels now spin themselves via
  // dunWheel's per-wheel transform-origin, so this blanket circle-spin is removed.
  if (!document.getElementById('g18-train-anim-kf')) {
    const s = document.createElement('style'); s.id = 'g18-train-anim-kf'
    s.textContent = '#g18-modal-emoji{animation:g18TrainAnim 2.4s ease-in-out infinite}@keyframes g18TrainAnim{0%,100%{transform:translateX(-3px)}50%{transform:translateX(3px)}}'
    document.head.appendChild(s)
  }
  document.getElementById('g18-modal-name').textContent = train.name
  document.getElementById('g18-modal-country').textContent = `${train.country} • ${train.year}`
  const details = document.getElementById('g18-modal-details')
  const cell = (label, val, emoji='') => `<div style="background:rgba(255,255,255,0.08);border-radius:10px;padding:8px;text-align:center;">
    <div style="color:rgba(255,255,255,0.55);font-size:9px;font-weight:700;letter-spacing:0.5px;">${label}</div>
    <div style="color:white;font-size:12px;font-weight:900;line-height:1.3;margin-top:2px;">${emoji}${val}</div>
  </div>`
  details.innerHTML =
    cell('KECEPATAN MAX', `${train.speed} km/j`, '⚡ ') +
    cell('TAHUN DIBUAT', train.year, '📅 ') +
    cell('BAHAN BAKAR', train.fuel, '⛽ ') +
    cell('TIPE', train.type, '') +
    (train.builder ? cell('PEMBUAT', train.builder, '🏭 ') : '') +
    (train.route ? cell('RUTE', train.route, '🗺️ ') : '') +
    (train.axles ? cell('RODA', train.axles, '⚙️ ') : '')
  // Insert rich history block (after details, before fact) — only if train.history present
  let histEl = document.getElementById('g18-modal-history')
  const factEl = document.getElementById('g18-modal-fact')
  if (!histEl && train.history) {
    histEl = document.createElement('div')
    histEl.id = 'g18-modal-history'
    histEl.innerHTML = '<span id="g18-modal-history-title">📜 SEJARAH & MAKNA</span><div id="g18-modal-history-text"></div>'
    factEl.parentNode.insertBefore(histEl, factEl)
  }
  if (histEl) {
    if (train.history) {
      histEl.style.display = 'block'
      const txt = document.getElementById('g18-modal-history-text')
      if (txt) txt.textContent = train.history
    } else {
      histEl.style.display = 'none'
    }
  }
  factEl.innerHTML =
    `<div style="margin-bottom:6px;">💡 ${train.fact}</div>` +
    (train.funFact ? `<div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.12);">${train.funFact}</div>` : '')
  document.getElementById('g18-modal').classList.add('open')
  try { g18WireModalClose() } catch(_){}
  try { g18ChunkedHistoryRender(train) } catch(_){}
  try { g18PassportStamp(idx) } catch(_){}
  // v54.23 F1 + F14: storybook + rod kinematics extra buttons (lazy-injected once)
  // v54.25 H12 + H8: AR mode + cosmetics buttons added
  try {
    const factEl = document.getElementById('g18-modal-fact')
    if (factEl && !document.getElementById('g18-extra-btns')) {
      const extra = document.createElement('div')
      extra.id = 'g18-extra-btns'
      extra.style.cssText = 'display:flex;gap:6px;margin:8px 0;flex-wrap:wrap'
      extra.innerHTML = `
        <button onclick="g18ShowStorybook(_g18CurrentTrainIdx)" style="flex:1;min-width:90px;padding:10px;border-radius:10px;border:0;background:linear-gradient(135deg,#a855f7,#7c3aed);color:#fff;font-family:Fredoka One,cursive;font-weight:900;cursor:pointer;font-size:12px">📕 Storybook</button>
        <button onclick="g18ShowRodKinematics()" style="flex:1;min-width:90px;padding:10px;border-radius:10px;border:0;background:linear-gradient(135deg,#0891b2,#0e7490);color:#fff;font-family:Fredoka One,cursive;font-weight:900;cursor:pointer;font-size:12px">⚙️ Mesin</button>
        <button onclick="if(window.TrainShared){TrainShared.arMode.start(G18_TRAINS[_g18CurrentTrainIdx])}" style="flex:1;min-width:90px;padding:10px;border-radius:10px;border:0;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;font-family:Fredoka One,cursive;font-weight:900;cursor:pointer;font-size:12px">📷 Ukuran Asli</button>
        <button onclick="if(window.TrainShared){TrainShared.codex.open(G18_TRAINS[_g18CurrentTrainIdx])}" style="flex:1;min-width:90px;padding:10px;border-radius:10px;border:0;background:linear-gradient(135deg,#06b6d4,#0891b2);color:#fff;font-family:Fredoka One,cursive;font-weight:900;cursor:pointer;font-size:12px">📖 Codex</button>`
      factEl.parentNode.insertBefore(extra, factEl)
    }
  } catch(_){}
  // v54.25 H1: museum visit badges
  try {
    if (window.TrainShared) {
      TrainShared.passport.stamp('g18', train.id || ('idx-' + idx), 1)
      const visits = TrainShared.passport.get().g18 || {}
      const visited = Object.keys(visits).length
      if (visited >= 10) TrainShared.achievements.unlock('visit_10_exhibits')
      if (visited >= G18_TRAINS.length) TrainShared.achievements.unlock('visit_all_museum')
    }
  } catch(_){}
  // v54.23 F8: chuff loop for steam trains
  try {
    if (/(uap|steam)/i.test(train.fuel || '')) g18ChuffLoopStart(train.speed || 60)
  } catch(_){}
  playClick()
}

function g18CloseModal() {
  document.getElementById('g18-modal').classList.remove('open')
  document.getElementById('g18-story-panel').style.display = 'none'
  try { g18ChuffLoopStop() } catch(_){}  // v54.23 F8
}

// ═══════════════════════════════════════════════════════════
//  v54.22 — G18 Museum Polish helpers (E7-E18)
// ═══════════════════════════════════════════════════════════

// E10: streak pill state + helpers
let g18Streak = 0
let g18StreakBest = 0
let g18Missed = []
function g18AddStreak() {
  g18Streak++
  if (g18Streak > g18StreakBest) g18StreakBest = g18Streak
  const pill = document.getElementById('g18-streak-pill')
  if (pill) {
    pill.style.display = 'inline-flex'
    pill.innerHTML = (uiEco('streak-big','🔥')||'🔥') + ' x' + g18Streak + (g18Streak >= 5 ? ' (2× Bintang!)' : '')
    pill.style.transform = 'scale(1.25)'; setTimeout(() => { pill.style.transform = 'scale(1)' }, 200)
  }
}
function g18ResetStreak() {
  g18Streak = 0
  const pill = document.getElementById('g18-streak-pill')
  if (pill) pill.style.display = 'none'
}

// E15: read-aloud the current modal's train info
function g18SpeakCurrent() {
  const train = G18_TRAINS[_g18CurrentTrainIdx]
  if (!train) return
  const parts = []
  parts.push(train.name)
  if (train.country) parts.push(train.country.replace(/[🇮🇩🇬🇧🇫🇷🇩🇪🇨🇳🇯🇵🇺🇸🇰🇷]/g, ''))
  if (train.year) parts.push('Tahun ' + train.year)
  if (train.fact) parts.push(train.fact)
  if (train.funFact) parts.push(train.funFact)
  g18Speak(parts.join('. '))
}

// E15: id-ID speech for text content. Tied to global isSoundOn() gate.
function g18Speak(text) {
  if (!text) return
  window.DuniaSpeak.say(String(text).slice(0, 220), { lang: 'id-ID', rate: 0.95, pitch: 1.05 })
}

// E11: ESC + backdrop + swipe-down close. Wired on DOMContentLoaded fallback.
function g18WireModalClose() {
  const modal = document.getElementById('g18-modal')
  if (!modal || modal.dataset.bound === '1') return
  modal.dataset.bound = '1'
  modal.setAttribute('role', 'dialog')
  modal.setAttribute('aria-modal', 'true')
  modal.setAttribute('aria-live', 'polite')
  modal.addEventListener('click', (e) => {
    if (e.target === modal) g18CloseModal()
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) g18CloseModal()
  })
  // Swipe-down
  let touchStartY = 0
  modal.addEventListener('touchstart', (e) => { if (e.touches[0]) touchStartY = e.touches[0].clientY }, { passive: true })
  modal.addEventListener('touchend', (e) => {
    const dy = (e.changedTouches[0] ? e.changedTouches[0].clientY : 0) - touchStartY
    if (dy > 80) g18CloseModal()
  }, { passive: true })
}

// E14: SEJARAH tap-to-reveal chunks. Splits long history into 2-sentence chunks.
function g18ChunkedHistoryRender(train) {
  const histText = document.getElementById('g18-modal-history-text')
  if (!histText || !train.history) return
  const sentences = train.history.split(/(?<=\. )/).filter(s => s.trim())
  if (sentences.length <= 2) { histText.textContent = train.history; return }
  let shown = 2
  function render() {
    histText.innerHTML = sentences.slice(0, shown).join('') +
      (shown < sentences.length ? '<button onclick="g18RevealMoreHistory(' + (sentences.length) + ', ' + shown + ')" id="g18-more-btn" style="margin-top:6px;padding:5px 10px;border-radius:8px;border:0;background:#f59e0b;color:#451a03;font-family:Fredoka One,cursive;font-weight:900;cursor:pointer;font-size:11px">📖 Baca lebih →</button>' : '')
    histText.dataset.shown = shown
    histText.dataset.total = sentences.length
    histText.dataset.fullText = train.history
  }
  render()
}
function g18RevealMoreHistory(total, current) {
  const histText = document.getElementById('g18-modal-history-text')
  if (!histText) return
  const sentences = (histText.dataset.fullText || '').split(/(?<=\. )/).filter(s => s.trim())
  const next = Math.min(sentences.length, current + 2)
  histText.innerHTML = sentences.slice(0, next).join('') +
    (next < sentences.length ? '<button onclick="g18RevealMoreHistory(' + sentences.length + ', ' + next + ')" style="margin-top:6px;padding:5px 10px;border-radius:8px;border:0;background:#f59e0b;color:#451a03;font-family:Fredoka One,cursive;font-weight:900;cursor:pointer;font-size:11px">📖 Baca lebih →</button>' : '')
}

// E16: museum passport — localStorage stamp set, header progress chip.
const G18_PASSPORT_KEY = 'dunia-g18-passport'
function g18PassportGet() {
  try { return new Set(JSON.parse(localStorage.getItem(G18_PASSPORT_KEY) || '[]')) } catch(_){ return new Set() }
}
function g18PassportStamp(trainIdx) {
  try {
    const set = g18PassportGet()
    set.add(trainIdx)
    localStorage.setItem(G18_PASSPORT_KEY, JSON.stringify([...set]))
    g18UpdatePassportChip()
  } catch(_){}
}
function g18UpdatePassportChip() {
  const chip = document.getElementById('g18-passport-chip')
  if (!chip) return
  const set = g18PassportGet()
  chip.textContent = '🛂 ' + set.size + ' / ' + (typeof G18_TRAINS !== 'undefined' ? G18_TRAINS.length : 23)
}

// E7: proportional speed badge HTML — used in card rendering
function g18SpeedBadge(speed) {
  const max = 603
  const pct = Math.min(100, Math.round((speed / max) * 100))
  const icon = speed < 80 ? '🐢' : speed < 200 ? '🚆' : speed < 400 ? '🚀' : '🚀⚡'
  return `<div class="g18-speed-badge" title="Max ${speed} km/j" style="display:flex;align-items:center;gap:4px;font-size:10px;font-weight:900;color:#fde68a;background:rgba(0,0,0,0.4);border-radius:8px;padding:2px 6px;margin-top:2px"><span>${icon}</span><span style="display:inline-block;width:40px;height:5px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden"><span style="display:block;height:100%;background:linear-gradient(90deg,#86efac,#fbbf24,#ef4444);width:${pct}%"></span></span><span>${speed}</span></div>`
}

// ═══════════════════════════════════════════════════════════
//  v54.23 — G18 Museum Depth helpers (F1-F16)
// ═══════════════════════════════════════════════════════════

// F1: storybook 3-page swipeable — auto-builds from existing modal data.
function g18ShowStorybook(idx) {
  const train = G18_TRAINS[idx]; if (!train) return
  let overlay = document.getElementById('g18-storybook')
  if (!overlay) {
    overlay = document.createElement('div')
    overlay.id = 'g18-storybook'
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9000;background:linear-gradient(135deg,#1a1028,#2a1848);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;color:#fff;font-family:Inter,system-ui,sans-serif'
    document.body.appendChild(overlay)
  }
  const pages = [
    `<div style="text-align:center"><div style="font-size:42px;margin-bottom:8px">📖</div><h2 style="font-family:Fredoka One,cursive;margin:0 0 8px;color:#fde68a">${train.name}</h2><div style="opacity:0.7;margin-bottom:14px">${train.country || ''}</div><div style="margin:0 auto;max-width:280px;background:rgba(0,0,0,0.3);border-radius:14px;padding:14px">${g18TrainSVG(train, 240, 100)}</div><div style="margin-top:14px;line-height:1.55;max-width:380px;text-align:center;opacity:0.85">${train.fact || ''}</div></div>`,
    `<div style="text-align:center"><div style="font-size:36px;margin-bottom:6px">💡</div><h3 style="font-family:Fredoka One,cursive;color:#fde68a">Fakta Seru</h3><div style="background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.35);border-radius:14px;padding:18px;max-width:380px;line-height:1.6">${train.funFact || train.fact}</div></div>`,
    `<div style="text-align:center"><div style="font-size:36px;margin-bottom:6px">🎓</div><h3 style="font-family:Fredoka One,cursive;color:#fde68a">Yuk Belajar</h3><div style="line-height:1.6;max-width:380px;opacity:0.85">${train.quizHint || 'Lihat detail trainnya dan coba kuis museum di bagian akhir!'}</div><button onclick="document.getElementById('g18-storybook').remove();g18StartQuiz()" style="margin-top:18px;padding:12px 28px;border-radius:14px;border:0;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-family:Fredoka One,cursive;font-size:16px;font-weight:900;cursor:pointer;box-shadow:0 5px 0 #92400e">🎯 Mulai Kuis!</button></div>`,
  ]
  let page = 0
  function render() {
    overlay.innerHTML = `
      <button onclick="document.getElementById('g18-storybook').remove()" style="position:absolute;top:18px;right:18px;background:rgba(0,0,0,0.5);color:#fff;border:0;border-radius:50%;width:36px;height:36px;cursor:pointer;font-size:18px">✕</button>
      <div style="flex:1;display:flex;align-items:center;justify-content:center;width:100%">${pages[page]}</div>
      <div style="display:flex;gap:8px;align-items:center;margin-top:12px">
        <button onclick="window._g18BookPrev()" style="padding:8px 14px;border-radius:10px;border:0;background:rgba(255,255,255,0.1);color:#fff;cursor:pointer">◀</button>
        <span style="color:#fde68a;font-family:Fredoka One,cursive">${page + 1} / ${pages.length}</span>
        <button onclick="window._g18BookNext()" style="padding:8px 14px;border-radius:10px;border:0;background:rgba(255,255,255,0.1);color:#fff;cursor:pointer">▶</button>
      </div>`
  }
  window._g18BookPrev = () => { page = Math.max(0, page - 1); render() }
  window._g18BookNext = () => { page = Math.min(pages.length - 1, page + 1); render() }
  render()
  // Swipe handling
  let sx = 0
  overlay.ontouchstart = (e) => { sx = e.touches[0]?.clientX || 0 }
  overlay.ontouchend = (e) => {
    const dx = (e.changedTouches[0]?.clientX || 0) - sx
    if (dx > 60) window._g18BookPrev(); else if (dx < -60) window._g18BookNext()
  }
}

// F2: confetti + brass-band fanfare on 8/8
function g18Mastery8of8() {
  // confetti
  for (let i = 0; i < 48; i++) {
    const c = document.createElement('span')
    c.style.cssText = 'position:fixed;top:-20px;left:' + (Math.random()*100) + 'vw;width:8px;height:14px;background:hsl(' + (Math.random()*360) + ',80%,55%);z-index:9090;pointer-events:none;border-radius:' + (Math.random() < 0.5 ? '50%' : '2px') + ';animation:g18ConfettiFall 2.4s linear forwards'
    c.style.animationDelay = (i * 0.04) + 's'
    document.body.appendChild(c)
    setTimeout(() => c.remove(), 5000 + i * 30)
  }
  if (!document.getElementById('g18-confetti-kf')) {
    const s = document.createElement('style'); s.id = 'g18-confetti-kf'
    s.textContent = '@keyframes g18ConfettiFall{0%{transform:translateY(-30px) rotate(0)}100%{transform:translateY(110vh) rotate(720deg);opacity:0.6}}'
    document.head.appendChild(s)
  }
  // major-7 arpeggio (C E G B) — brass-ish triangle
  try { [523, 659, 784, 988].forEach((f, i) => setTimeout(() => playTone(f, 0.18, 'triangle', 0.18), i * 110)) } catch(_){}
  // passport master badge
  try { localStorage.setItem('dunia-g18-master', '1') } catch(_){}
}

// F3: seeded RNG quiz + no-repeat-last-3
function g18SeededShuffle(arr) {
  // xorshift32 seeded by date string hash
  let x = 0; const day = new Date().toDateString()
  for (let i = 0; i < day.length; i++) x = (x ^ day.charCodeAt(i)) >>> 0
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0
  const out = arr.slice()
  for (let i = out.length - 1; i > 0; i--) {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0
    const j = x % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
function g18FilterRecent(arr) {
  try {
    const recent = JSON.parse(localStorage.getItem('dunia-g18-recent') || '[]')
    const recentSet = new Set(recent.flat())
    const out = arr.filter(q => !recentSet.has(q.id || q.q || JSON.stringify(q)))
    return out.length ? out : arr
  } catch(_) { return arr }
}
function g18RecordRecent(qs) {
  try {
    const keys = qs.map(q => q.id || q.q || JSON.stringify(q))
    const prior = JSON.parse(localStorage.getItem('dunia-g18-recent') || '[]')
    prior.push(keys)
    while (prior.length > 3) prior.shift()
    localStorage.setItem('dunia-g18-recent', JSON.stringify(prior))
  } catch(_){}
}

// F4: quiz bar tint by accuracy
function g18TintQuizBar() {
  const fill = document.getElementById('g18-quiz-fill'); if (!fill) return
  const answered = g18State.quizIdx
  if (answered <= 0) return
  const acc = g18State.quizScore / answered
  fill.style.background = acc >= 0.8 ? 'linear-gradient(90deg,#22c55e,#86efac)'
    : acc >= 0.5 ? 'linear-gradient(90deg,#fbbf24,#fcd34d)'
    : 'linear-gradient(90deg,#ef4444,#fb7185)'
}

// F5: first-tap glow on 📖 Cerita button until first discovery (localStorage)
function g18MaybeGlowStoryBtn() {
  try {
    if (localStorage.getItem('dunia-g18-cerita-seen')) return
    const btn = document.getElementById('g18-story-btn'); if (!btn) return
    btn.style.boxShadow = '0 0 0 4px rgba(251,191,36,0.4)'
    btn.style.animation = 'g18CeritaPulse 1.6s ease-in-out infinite'
    if (!document.getElementById('g18-cerita-kf')) {
      const s = document.createElement('style'); s.id = 'g18-cerita-kf'
      s.textContent = '@keyframes g18CeritaPulse{0%,100%{box-shadow:0 0 0 4px rgba(251,191,36,0.4)}50%{box-shadow:0 0 0 12px rgba(251,191,36,0)}}'
      document.head.appendChild(s)
    }
  } catch(_){}
}
const _g18ShowStoryOrig = (typeof g18ShowStory === 'function') ? g18ShowStory : null
if (typeof window !== 'undefined') {
  window.g18ShowStory = function() {
    try { localStorage.setItem('dunia-g18-cerita-seen', '1') } catch(_){}
    const btn = document.getElementById('g18-story-btn')
    if (btn) { btn.style.animation = ''; btn.style.boxShadow = '' }
    if (_g18ShowStoryOrig) _g18ShowStoryOrig()
  }
}

// F6: section chapters collapse + golden chevron + medal on complete
function g18MakeSectionsCollapsible() {
  const grid = document.getElementById('g18-card-grid')
  if (!grid) return
  // Section headers are the grid-column:1/-1 children
  const headers = [...grid.children].filter(c => c.style && c.style.gridColumn === '1/-1' && c.style.color)
  headers.forEach((h, idx) => {
    if (h.dataset.collapsibleBound === '1') return
    h.dataset.collapsibleBound = '1'
    h.style.cursor = 'pointer'
    h.style.userSelect = 'none'
    h.dataset.collapseState = 'open'
    const chevron = document.createElement('span')
    chevron.textContent = ' ▼'
    chevron.style.color = '#fbbf24'
    chevron.style.fontWeight = '900'
    h.appendChild(chevron)
    h.addEventListener('click', () => {
      // toggle following sibling cards (up to next header)
      const next = []
      let n = h.nextElementSibling
      while (n && !(n.style && n.style.gridColumn === '1/-1' && n.style.color)) { next.push(n); n = n.nextElementSibling }
      const open = h.dataset.collapseState === 'open'
      next.forEach(c => c.style.display = open ? 'none' : '')
      h.dataset.collapseState = open ? 'closed' : 'open'
      chevron.textContent = open ? ' ▶' : ' ▼'
      try { playTone(660, 0.05, 'sine') } catch(_){}
    })
  })
}

// F7: long-press steam-loco modal plays whistle
let _g18LongPressTimer = null
function g18WireLongPressWhistle() {
  const modal = document.getElementById('g18-modal'); if (!modal || modal.dataset.lpBound === '1') return
  modal.dataset.lpBound = '1'
  modal.addEventListener('pointerdown', () => {
    const train = G18_TRAINS[_g18CurrentTrainIdx]
    if (!train || !/(uap|steam)/i.test(train.fuel || '')) return
    _g18LongPressTimer = setTimeout(() => {
      try { playTone(1100, 0.40, 'sine', 0.16); setTimeout(()=>playTone(880, 0.50, 'sine', 0.14), 380); setTimeout(()=>playTone(660, 0.40, 'sine', 0.12), 800) } catch(_){}
      if (navigator.vibrate) { try { navigator.vibrate(60) } catch(_){} }
    }, 800)
  })
  ;['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => modal.addEventListener(ev, () => { if (_g18LongPressTimer) { clearTimeout(_g18LongPressTimer); _g18LongPressTimer = null } }))
}

// F8: steam-chuff BGM bed (WebAudio loop) — open via g18ShowDetail; F8 scaling
let _g18ChuffActive = false
function g18ChuffLoopStart(speed) {
  if (_g18ChuffActive || !isSoundOn()) return
  _g18ChuffActive = true
  const interval = Math.max(180, 600 - speed * 1.0)
  let count = 0
  const fire = () => {
    if (!_g18ChuffActive) return
    try { playTone(140 + (count % 2) * 20, 0.06, 'square', 0.10); playTone(80, 0.06, 'sawtooth', 0.07) } catch(_){}
    count++
    setTimeout(fire, interval)
  }
  fire()
}
function g18ChuffLoopStop() { _g18ChuffActive = false }

// F10: gamelan ambient loop (WebAudio synth)
let _g18GamelanActive = false
function g18GamelanStart() {
  if (_g18GamelanActive || !isSoundOn()) return
  _g18GamelanActive = true
  const scale = [261.6, 311.1, 349.2, 392.0, 466.2]  // slendro-ish (approx)
  let t = 0
  const tick = () => {
    if (!_g18GamelanActive) return
    try {
      const note = scale[Math.floor(Math.random() * scale.length)]
      playTone(note, 0.6, 'triangle', 0.06)
    } catch(_){}
    t++
    setTimeout(tick, 1200 + Math.random() * 1400)
  }
  tick()
}
function g18GamelanStop() { _g18GamelanActive = false }

// F11: hero banner Stasiun Willem I 1873 — replace existing hero banner content.
function g18EnhanceHeroBanner() {
  const gallery = document.getElementById('g18-gallery'); if (!gallery) return
  const banner = gallery.querySelector('div[style*="rgba(93,57,34"]')
  if (!banner || banner.dataset.willem === '1') return
  banner.dataset.willem = '1'
  banner.style.position = 'relative'
  banner.style.overflow = 'hidden'
  banner.innerHTML = `
    <div style="position:absolute;inset:0;background:radial-gradient(circle at 30% 70%,rgba(251,191,36,0.18),transparent 60%);pointer-events:none"></div>
    <div style="position:relative;z-index:1">
      <div style="color:#FFD082;font-size:13px;font-weight:900;letter-spacing:1px">🏛️ STASIUN WILLEM I · 1873</div>
      <div style="color:rgba(255,255,255,0.7);font-size:11px;font-weight:700;margin-top:2px">Ambarawa · Bekas stasiun militer Kolonial · Sekarang Museum Kereta Api</div>
      <div style="color:rgba(255,193,80,0.7);font-size:10px;letter-spacing:1px;margin-top:6px">📅 GROUNDBREAKING 1873 · 🚂 ZAHARA TRACK RACK & PINION · 🇮🇩 INDONESIA</div>
    </div>`
}

// F12: optional 15s soft timer ring + speed bonus (under 5s = +50% stars)
let _g18QuestionStartT = 0
function g18StartQuestionTimer() {
  _g18QuestionStartT = performance.now()
  // We could render a conic ring here — keeping logic-only MVP for now.
}

// F13: conductor avatar narrator (Pak Masinis)
function g18ConductorWave() {
  let av = document.getElementById('g18-pak-masinis')
  if (!av) {
    av = document.createElement('div')
    av.id = 'g18-pak-masinis'
    av.style.cssText = 'position:fixed;left:14px;bottom:18px;z-index:65;font-size:40px;pointer-events:none;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.4))'
    av.textContent = '👨‍✈️'
    document.body.appendChild(av)
  }
  av.style.animation = 'g18MasinisWave 1.4s ease-in-out'
  if (!document.getElementById('g18-masinis-kf')) {
    const s = document.createElement('style'); s.id = 'g18-masinis-kf'
    s.textContent = '@keyframes g18MasinisWave{0%,100%{transform:rotate(0)}25%{transform:rotate(-12deg) scale(1.1)}75%{transform:rotate(12deg) scale(1.1)}}'
    document.head.appendChild(s)
  }
  setTimeout(() => { av.style.animation = '' }, 1400)
}

// F14: steam-loco rod kinematics teaching mode (overlay with i info)
function g18ShowRodKinematics() {
  const train = G18_TRAINS[_g18CurrentTrainIdx]
  if (!train || !/(uap|steam)/i.test(train.fuel || '')) return
  let ov = document.getElementById('g18-rod-overlay')
  if (!ov) {
    ov = document.createElement('div')
    ov.id = 'g18-rod-overlay'
    ov.style.cssText = 'position:fixed;inset:0;z-index:9100;background:rgba(15,23,42,0.94);color:#fff;display:flex;flex-direction:column;padding:24px;align-items:center;justify-content:center;text-align:center'
    document.body.appendChild(ov)
  }
  ov.innerHTML = `
    <div style="font-family:Fredoka One,cursive;color:#fde68a;font-size:20px;margin-bottom:6px">⚙️ Bagaimana Kereta Uap Bergerak?</div>
    <div style="opacity:0.75;font-size:13px;max-width:380px;line-height:1.55;margin-bottom:14px">Piston dorong-tarik di silinder mengubah uap menjadi gerak putar lewat <b>main rod</b> dan <b>side rods</b>. Klik tutup untuk kembali.</div>
    <div style="width:260px;background:rgba(255,255,255,0.06);border-radius:14px;padding:14px;margin-bottom:14px">
      <div style="font-size:11px;color:#fbbf24">Bagian utama:</div>
      <ul style="text-align:left;font-size:12px;line-height:1.6;padding-left:18px;color:rgba(255,255,255,0.85)">
        <li>🔥 Boiler — menampung air panas</li>
        <li>💨 Cylinder — tempat uap dorong piston</li>
        <li>⚙️ Main rod — dorong roda penggerak</li>
        <li>🔧 Side rods — sinkronkan roda</li>
      </ul>
    </div>
    <button onclick="document.getElementById('g18-rod-overlay').remove()" style="padding:12px 24px;border-radius:14px;border:0;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-family:Fredoka One,cursive;font-weight:900;cursor:pointer">Tutup</button>`
}

// F15: Timeline 1880→2023 MVP — horizontal scroll w/ train SVG at year position
function g18ShowTimeline() {
  let ov = document.getElementById('g18-timeline')
  if (!ov) {
    ov = document.createElement('div')
    ov.id = 'g18-timeline'
    ov.style.cssText = 'position:fixed;inset:0;z-index:9000;background:linear-gradient(180deg,#0c0a22,#1a1028);color:#fff;display:flex;flex-direction:column;padding:18px'
    document.body.appendChild(ov)
  }
  const sorted = [...G18_TRAINS].map((t, i) => ({ t, i })).sort((a, b) => (a.t.year || 0) - (b.t.year || 0))
  const minY = sorted[0]?.t.year || 1880, maxY = sorted[sorted.length - 1]?.t.year || 2023
  const yearsHTML = sorted.map(s => {
    const pct = ((s.t.year || 1900) - minY) / Math.max(1, maxY - minY) * 100
    return `<div style="position:absolute;left:${pct}%;top:50%;transform:translate(-50%,-50%);cursor:pointer" onclick="g18ShowDetail(${s.i})">
      <div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:6px">${g18TrainSVG(s.t, 60, 28)}</div>
      <div style="color:#fde68a;font-size:9px;text-align:center;margin-top:4px">${s.t.year}</div>
    </div>`
  }).join('')
  ov.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <span style="font-family:Fredoka One,cursive;font-size:18px;color:#fde68a">📅 Timeline ${minY}—${maxY}</span>
      <button onclick="document.getElementById('g18-timeline').remove()" style="padding:8px 14px;border-radius:10px;border:0;background:#fbbf24;color:#451a03;font-family:Fredoka One,cursive;font-weight:900;cursor:pointer">Tutup ✕</button>
    </div>
    <div style="flex:1;overflow-x:auto;overflow-y:hidden;position:relative">
      <div style="position:relative;width:max(${G18_TRAINS.length * 88}px,100%);height:100%;background:linear-gradient(180deg,transparent,rgba(255,255,255,0.04));border-radius:14px;border:1px dashed rgba(251,191,36,0.3)">
        ${yearsHTML}
      </div>
    </div>`
}

// F16: Map of Java MVP — list mode w/ route lines
function g18ShowJavaMap() {
  let ov = document.getElementById('g18-javamap')
  if (!ov) {
    ov = document.createElement('div')
    ov.id = 'g18-javamap'
    ov.style.cssText = 'position:fixed;inset:0;z-index:9000;background:linear-gradient(180deg,#0c0a22,#1a1028);color:#fff;display:flex;flex-direction:column;padding:18px'
    document.body.appendChild(ov)
  }
  const itemsHTML = G18_TRAINS.filter(t => t.route).map((t, i) => `
    <div onclick="g18ShowDetail(${G18_TRAINS.indexOf(t)})" style="background:rgba(255,255,255,0.05);border:1px solid rgba(251,191,36,0.3);border-radius:14px;padding:12px;cursor:pointer;margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:10px"><span style="font-size:24px">🚂</span><div><div style="font-family:Fredoka One,cursive;color:#fde68a">${t.name}</div><div style="font-size:11px;opacity:0.7">🗺️ ${t.route}</div></div></div>
    </div>`).join('')
  ov.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <span style="font-family:Fredoka One,cursive;font-size:18px;color:#fde68a">🗺️ Peta Rute Pulau Jawa</span>
      <button onclick="document.getElementById('g18-javamap').remove()" style="padding:8px 14px;border-radius:10px;border:0;background:#fbbf24;color:#451a03;font-family:Fredoka One,cursive;font-weight:900;cursor:pointer">Tutup ✕</button>
    </div>
    <div style="flex:1;overflow-y:auto">${itemsHTML}</div>`
}

// E8: trivia kartu hari ini — daily-seeded funFact card pinned to gallery.
function g18ShowDailyTrivia() {
  const grid = document.getElementById('g18-card-grid')
  if (!grid || document.getElementById('g18-daily-trivia')) return
  const day = new Date().toDateString()
  // Simple deterministic hash: convert day string to a number
  let h = 0
  for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) >>> 0
  const idx = h % G18_TRAINS.length
  const train = G18_TRAINS[idx]
  if (!train || !train.funFact) return
  const card = document.createElement('div')
  card.id = 'g18-daily-trivia'
  card.style.cssText = 'grid-column:1/-1;background:linear-gradient(135deg,#fde047,#f59e0b);border-radius:14px;padding:12px;font-family:Fredoka One,cursive;font-size:12px;color:#451a03;cursor:pointer;animation:g18TriviaPulse 2.4s ease-in-out infinite;line-height:1.4'
  card.innerHTML = `<div style="font-size:11px;letter-spacing:1.5px;color:#92400e;margin-bottom:4px">🌟 TRIVIA HARI INI</div><div>${train.funFact}</div>`
  card.onclick = () => g18ShowDetail(idx)
  // inject keyframe once
  if (!document.getElementById('g18-trivia-kf')) {
    const s = document.createElement('style')
    s.id = 'g18-trivia-kf'
    s.textContent = '@keyframes g18TriviaPulse{0%,100%{box-shadow:0 0 0 0 rgba(251,191,36,0.6)}50%{box-shadow:0 0 0 14px rgba(251,191,36,0)}}'
    document.head.appendChild(s)
  }
  grid.insertBefore(card, grid.firstChild)
}

let _g18CurrentTrainIdx = -1
function g18ShowStory() {
  const panel = document.getElementById('g18-story-panel')
  if (panel.style.display !== 'none') { panel.style.display = 'none'; return } // toggle
  panel.style.display = 'block'
  const train = G18_TRAINS[_g18CurrentTrainIdx]
  if (!train) return
  // Generate a child-friendly story from train data
  const stories = [
    `Tahukah kamu? ${train.name} adalah kereta yang dibuat pada tahun ${train.year}. Kereta ini bisa melaju sampai ${train.speed} km/jam! ${train.fact}`,
    `Bayangkan kamu hidup di tahun ${train.year}. Saat itu, ${train.name} adalah kereta yang sangat hebat! Kereta ini menggunakan ${train.fuel} sebagai bahan bakar. ${train.funFact || ''}`,
    `Ayo kita berkenalan dengan ${train.name}! Kereta ini berasal dari ${train.country} dan dibuat tahun ${train.year}. ${train.builder ? 'Kereta ini dibuat oleh ' + train.builder + '.' : ''} ${train.fact}`,
  ]
  const story = stories[Math.floor(Math.random() * stories.length)]
  const extra = train.route ? `\n\n🗺️ Rute: ${train.route}` : ''
  document.getElementById('g18-story-text').textContent = story + extra
}

// v54.27 I9: shut down G18 ambient audio + TTS + FAB column when leaving the
// game (back, end-from-overlay, pause). Without this, gamelan loop continued
// in the home screen, Pak Masinis avatar floated on top of unrelated screens,
// FAB column blocked taps on other games' UI, and TTS queue kept reading aloud.
function g18Cleanup(){
  try { g18GamelanStop() } catch(_){}
  try { g18ChuffLoopStop() } catch(_){}
  try { if (window.speechSynthesis) window.speechSynthesis.cancel() } catch(_){}
  try {
    ;['g18-extra-fab', 'g18-pak-masinis', 'g18-storybook', 'g18-timeline', 'g18-javamap',
      'g18-rod-overlay', 'g18-daily-trivia'].forEach(id => {
      const e = document.getElementById(id); if (e) e.remove()
    })
  } catch(_){}
}

function g18StartQuiz() {
  // v54.27 I10: reset streak counters at quiz start. Without this, g18StreakBest
  // from a previous session leaked into THIS session's "+1 star" bonus — so
  // every replay started with the 2× streak bonus already qualified, granting
  // 5★ for free.
  g18Streak = 0; g18StreakBest = 0
  g18ShuffleQuiz()
  g18State.quizIdx = 0
  g18State.quizScore = 0
  g18State.quizActive = true
  document.getElementById('g18-gallery').style.display = 'none'
  document.getElementById('g18-quiz-view').style.display = 'flex'
  g18RenderQuestion()
}

function g18RenderQuestion() {
  const q = G18_QUIZ_SESSION[g18State.quizIdx]
  g18State.answeredCurrent = false
  document.getElementById('g18-q-num').textContent = g18State.quizIdx + 1
  const pct=(g18State.quizIdx/G18_QUIZ_SESSION.length)*100
  const fillEl=document.getElementById('g18-quiz-fill');if(fillEl)fillEl.style.width=pct+'%'
  const imgEl = document.getElementById('g18-q-image')
  if (q.subjectTrainId != null && typeof g18TrainSVG === 'function' && G18_TRAINS[q.subjectTrainId]) {
    imgEl.innerHTML = g18TrainSVG(G18_TRAINS[q.subjectTrainId], 120, 56)
  } else {
    imgEl.textContent = q.emoji
  }
  document.getElementById('g18-q-text').textContent = q.q
  try { g18Speak(q.q) } catch(_){}
  // v54.23 F4: tint quiz progress bar by current accuracy
  try { g18TintQuizBar() } catch(_){}
  // v54.23 F12: start question timer
  try { g18StartQuestionTimer() } catch(_){}
  document.getElementById('g18-q-feedback').textContent = ''
  document.getElementById('g18-q-next-wrap').style.display = 'none'
  const opts = document.getElementById('g18-q-options')
  opts.innerHTML = ''
  // Shuffle answers
  const indices = q.answers.map((_,i) => i).sort(() => Math.random() - 0.5)
  indices.forEach(idx => {
    const btn = document.createElement('button')
    btn.className = 'g18-quiz-option'
    btn.textContent = q.answers[idx]
    btn.dataset.ansIdx = idx
    btn.onclick = () => g18AnswerQuestion(idx, q.correct, btn)
    opts.appendChild(btn)
  })
}

function g18AnswerQuestion(picked, correct, btn) {
  if (g18State.answeredCurrent) return
  g18State.answeredCurrent = true
  const opts = document.getElementById('g18-q-options')
  opts.querySelectorAll('.g18-quiz-option').forEach(b => b.style.pointerEvents = 'none')
  const q = G18_QUIZ_SESSION[g18State.quizIdx]
  if (picked === correct) {
    btn.classList.add('correct')
    spawnCorrectCardJuice(btn)
    quizStreakHit(btn)
    g18State.quizScore++
    try { g18AddStreak() } catch(_){}
    // v54.25 H2: daily challenge progress for museum quiz
    try { if (window.TrainShared) TrainShared.dailyChallenge.progress('g18', 1) } catch(_){}
    document.getElementById('g18-q-feedback').textContent = '✅ Benar! Kamu pintar!'
    document.getElementById('g18-q-feedback').style.color = '#A5D6A7'
    playCorrect()
  } else {
    btn.classList.add('wrong')
    spawnWrongShake(btn)
    quizStreakReset()
    // v54.22 E10: reset visible streak; E18: track missed for review-loop
    try { g18ResetStreak(); g18Missed.push({ q, picked, correct, idx: g18State.quizIdx }) } catch(_){}
    // Highlight correct answer
    opts.querySelectorAll('.g18-quiz-option').forEach(b => {
      if (parseInt(b.dataset.ansIdx) === correct) {
        b.classList.add('correct')
        spawnCorrectCardJuice(b, { burst:false })
      }
    })
    document.getElementById('g18-q-feedback').textContent = `❌ Jawaban: ${q.answers[correct]}`
    document.getElementById('g18-q-feedback').style.color = '#FFCDD2'
    playWrong()
  }
  document.getElementById('g18-stars-badge').textContent = `🏛️ ${g18State.quizScore}`
  const nextWrap = document.getElementById('g18-q-next-wrap')
  nextWrap.style.display = 'block'
  const nextBtn = document.getElementById('g18-q-next-btn')
  nextBtn.textContent = g18State.quizIdx >= G18_QUIZ_SESSION.length - 1 ? '🏆 Lihat Hasil!' : '▶ Lanjut'
}

function g18NextQuestion() {
  g18State.quizIdx++
  if (g18State.quizIdx >= G18_QUIZ_SESSION.length) {
    g18FinishQuiz()
  } else {
    g18RenderQuestion()
  }
}

function g18FinishQuiz() {
  const score = g18State.quizScore
  const total = G18_QUIZ_SESSION.length
  let perfStars = GameScoring.calc({ correct: score, total })
  if (g18StreakBest >= 5) perfStars = Math.min(5, perfStars + 1)
  state.gameStars[state.currentPlayer] = perfStars
  // v54.23 F2: confetti + brass fanfare on real 8/8 mastery
  if (score === G18_QUIZ_COUNT) {
    try { g18Mastery8of8() } catch(_){}
    try { if (window.TrainShared) { TrainShared.achievements.unlock('museum_8_of_8'); TrainShared.sensor.perfected('g18') } } catch(_){}
  }
  // v54.25 H4: register failure if below half
  try { if (window.TrainShared && score < Math.ceil(G18_QUIZ_COUNT * 0.5)) TrainShared.sensor.failed('g18') } catch(_){}
  // v54.23 F10 stop gamelan
  try { g18GamelanStop() } catch(_){}
  // v54.22 E18: review-the-misses summary list appended to msg
  let reviewLine = ''
  try {
    if (g18Missed && g18Missed.length) {
      reviewLine = `\n📚 ${g18Missed.length} soal terlewat — coba lagi untuk belajar!`
    }
  } catch(_){}
  // v54.43: true G18 mastery — visited every train in passport AND 8/8 quiz.
  // This is the genuine "museum graduate" state and deserves its own banner
  // separate from the per-session 8/8.
  let isSarjana = false
  try {
    if (window.TrainShared && score === G18_QUIZ_COUNT) {
      const visited = (TrainShared.passport.get().g18) || {}
      if (Object.keys(visited).length >= G18_TRAINS.length) {
        isSarjana = true
        TrainShared.achievements.unlock('sarjana_museum_g18')
      }
    }
  } catch(_){}
  // v54.22 E6: stale '===5' replaced with full-quiz mastery threshold so 8/8
  // actually grants 🏆 SEMPURNA (was triggering on 5/8 — wrong since G18_QUIZ_COUNT=8).
  const gradeEmoji = isSarjana ? '🎓' : score === G18_QUIZ_COUNT ? '🏆' : score >= Math.ceil(G18_QUIZ_COUNT * 0.5) ? '⭐' : '📚'
  const gradeMsg = isSarjana
    ? 'SARJANA MUSEUM! Kamu kunjungi semua kereta DAN jawab semua benar!'
    : score === G18_QUIZ_COUNT ? 'SEMPURNA! Kamu ahli kereta!'
    : score >= Math.ceil(G18_QUIZ_COUNT * 0.5) ? 'Bagus! Terus belajar!'
    : 'Jangan lupa baca kartu museumnya ya!'
  document.getElementById('g18-quiz-view').style.display = 'none'
  showGameResult({
    emoji:gradeEmoji, title:gradeMsg, stars:perfStars,
    msg:`Skor kuis: ${score} / ${total} benar\nAda ${G18_TRAINS.length} kereta di museum — sudah kamu pelajari semua?${reviewLine}\nSoal berubah setiap main, coba lagi!`,
    buttons:[{label:'Main Lagi 🔄', action:()=>initGame18()},{label:'Kembali ⌂', action:()=>endGameFromOverlay()}]
  })
  if (score >= 3) playCorrect(); else playWrong()
}

// ============================================================
// ZONE KERETA — Landing Page Music & Banner
// ============================================================
const G_ZONE_MUSIC_PARTS = 5
let gZoneMusicAudio = null
let gZoneMusicPlaying = false
let gZoneMusicPart = -1

function g14GetRandomPart() {
  // Avoid repeating the same part
  let part
  do { part = Math.floor(Math.random() * G_ZONE_MUSIC_PARTS) + 1 }
  while (part === gZoneMusicPart && G_ZONE_MUSIC_PARTS > 1)
  return part
}

function g14PlayZoneMusic() {
  if (!isSoundOn()) return
  if (gZoneMusicPlaying && gZoneMusicAudio) return
  const part = g14GetRandomPart()
  gZoneMusicPart = part
  if (gZoneMusicAudio) { gZoneMusicAudio.pause(); gZoneMusicAudio = null }
  const audio = new Audio(`assets/train/brave-loco-part${part}.mp3`)
  audio.volume = 0.45
  gZoneMusicAudio = audio
  gZoneMusicPlaying = true
  audio.play().catch(() => {})
  audio.onended = () => {
    gZoneMusicPlaying = false
    // Play another random part after a short pause
    setTimeout(() => {
      const el = document.getElementById('zone-kereta')
      if (el && document.getElementById('screen-welcome').style.display !== 'none') {
        g14PlayZoneMusic()
      }
    }, 1200)
  }
  const btn = document.getElementById('zone-kereta-music-btn')
  if (btn) btn.textContent = '🔊'
}

function g14StopZoneMusic() {
  if (gZoneMusicAudio) { gZoneMusicAudio.pause(); gZoneMusicAudio.currentTime = 0; gZoneMusicAudio = null }
  gZoneMusicPlaying = false
  const btn = document.getElementById('zone-kereta-music-btn')
  if (btn) btn.textContent = '🎵'
}

function g14ToggleZoneMusic() {
  if (gZoneMusicPlaying) g14StopZoneMusic(); else g14PlayZoneMusic()
}

function g14ZoneHover() {
  if (!gZoneMusicPlaying) g14PlayZoneMusic()
}

function g14ZoneTap() {
  // Touch devices: tap on zone header starts music
  if (!gZoneMusicPlaying) g14PlayZoneMusic()
}

// Patch showScreen to stop zone music when leaving home screen
const _origShowScreen = typeof showScreen === 'function' ? showScreen : null
if (_origShowScreen) {
  window.showScreen = function(id) {
    if (id !== 'screen-welcome') g14StopZoneMusic()
    _origShowScreen(id)
  }
}

// ════════════════════════════════════════════════════════════════════
// Task #66 (2026-04-25): Region & City Selector
// Stage A — Region Picker → Stage B — City Picker → game start
// Reference: documentation and standarization/CITY-PROGRESSION-SPEC.md
// Data: games/data/region-meta.js + city-progression.js + city-pokemon-pack.js (TBD)
// ════════════════════════════════════════════════════════════════════

// State: which game (10/13/13b) is using the selector right now
let _citySelectorGame = 10  // default G10
let _citySelectorRegion = null

const REGION_ICON_PATH = 'assets/Pokemon/others/region.webp'
const CITY_ICON_PATH = 'assets/Pokemon/others/cities.webp'

/** Open Stage A — Region Picker. Caller passes which game (10/13/13b). */
function openRegionOverlay(gameNum) {
  // G10 (Pertarungan Pokemon) + G13 (Evolusi Math) + G13B (Quick Fire) —
  // show Adventure/PvP/Tournament mode select first. Adventure callback re-enters
  // this function with a lock so it falls through to the existing region picker.
  if ((gameNum === 10 || gameNum === 13 || gameNum === '13b') && window.BattleModes && !window._regionModeLocked) {
    var _regTitle = gameNum === 10 ? '⚡ Pertarungan Pokemon'
                  : gameNum === 13 ? '🔥 Evolusi Math'
                  : '⚡ Quick Fire'
    window.BattleModes.show({
      title: _regTitle,
      questionType: 'math',
      questionLevel: 5,
      onAdventure: function () {
        window._regionModeLocked = true
        try { openRegionOverlay(gameNum) } finally { window._regionModeLocked = false }
      },
      onCancel: function () { /* stay on world map */ }
    })
    return
  }
  _citySelectorGame = gameNum || 10
  // Slot-7 + frog preset — runs once, guard inside. Trigger only on G13B.
  if (gameNum === '13b') _applyKodokSlot7Unlock()
  if (typeof migrateLegacyLevelsToCity === 'function') {
    try { migrateLegacyLevelsToCity(_citySelectorGame) } catch(_) {}
  }
  renderRegionGrid()
  const ov = document.getElementById('region-overlay')
  if (ov) ov.classList.add('open')
}
function closeRegionOverlay() {
  const ov = document.getElementById('region-overlay')
  if (ov) ov.classList.remove('open')
}
function renderRegionGrid() {
  const grid = document.getElementById('region-grid')
  if (!grid || typeof getAllRegions !== 'function') return
  const regions = getAllRegions()
  grid.innerHTML = regions.map(r => {
    const cp = (typeof getCityProgress === 'function') ? getCityProgress(_citySelectorGame, r.id) : { completed: [] }
    const completed = cp.completed.length
    const total = (typeof CITY_PACK !== 'undefined' && CITY_PACK[r.id]) ? CITY_PACK[r.id].cities.length : r.totalCities
    const filter = `hue-rotate(${r.hueRotate}deg) saturate(${r.saturate}) drop-shadow(0 0 8px ${r.color})`
    return `
      <div class="region-card" data-region="${r.id}" style="--region-color:${r.color};--region-filter:${filter};border-color:${completed===total?'#22C55E':'rgba(255,255,255,0.14)'};">
        <img class="region-card-icon" src="${REGION_ICON_PATH}" alt="${r.name}" loading="lazy" decoding="async">
        <div class="region-card-name">${r.icon} ${r.name}</div>
        <div class="region-card-gen">${r.gen}</div>
        <div class="region-card-progress">${completed}/${total} ⭐</div>
      </div>`
  }).join('')
  // Hotfix #101-A: event delegation. Per-card addEventListener leaked closures
  // every render (innerHTML drops nodes but listener closures persist in heap),
  // accumulating hundreds of orphaned listeners across picker open/close cycles
  // → mobile OOM crash. One delegated listener bound ONCE survives all renders.
  if (!grid.dataset.bound) {
    grid.addEventListener('click', (ev) => {
      const card = ev.target && ev.target.closest && ev.target.closest('.region-card')
      if (!card || !grid.contains(card)) return
      const id = card.getAttribute('data-region')
      if (!id) return
      try { playClick && playClick() } catch(_) {}
      openCityOverlay(id)
    })
    grid.dataset.bound = '1'
  }
}

/** Open Stage B — City Picker for a region */
function openCityOverlay(regionId) {
  _citySelectorRegion = regionId
  closeRegionOverlay()
  renderCityGrid(regionId)
  const ov = document.getElementById('city-overlay')
  if (ov) ov.classList.add('open')
  // Task #88 (P2-1): preload only THIS region's bgs, defer ~20MB across other 9 regions
  // Browser caches WebPs after Image.src, so subsequent game launch is instant.
  prefetchRegionBackgrounds(regionId)
}

// Task #88: prefetch backgrounds for selected region only — saves bandwidth on
// other 9 regions that user doesn't visit yet. Idempotent (browser caches Image()).
const _bgPrefetchedRegions = new Set()
function prefetchRegionBackgrounds(regionId) {
  if (_bgPrefetchedRegions.has(regionId)) return
  _bgPrefetchedRegions.add(regionId)
  if (typeof CITY_PACK === 'undefined' || !CITY_PACK[regionId]) return
  const isMobile = window.innerWidth < 768
  const folder = isMobile ? 'mobile' : 'pc'
  // Stagger requests so we don't saturate the connection pool (max 6 parallel)
  CITY_PACK[regionId].cities.forEach((city, idx) => {
    if (!city.bg) return
    const file = isMobile ? city.bg.mobile : city.bg.pc
    if (!file) return
    setTimeout(() => {
      const img = new Image()
      img.loading = 'lazy'
      img.decoding = 'async'
      img.src = `assets/Pokemon/background/${folder}/${encodeURIComponent(file)}`
    }, idx * 80)  // 80ms apart → spread 1280ms for 16-city region (Hoenn/Kalos)
  })
}
function closeCityOverlay() {
  const ov = document.getElementById('city-overlay')
  if (ov) ov.classList.remove('open')
  _citySelectorRegion = null
}
function backToRegionOverlay() {
  closeCityOverlay()
  renderRegionGrid()
  const ov = document.getElementById('region-overlay')
  if (ov) ov.classList.add('open')
}
function renderCityGrid(regionId) {
  const grid = document.getElementById('city-grid')
  const titleEl = document.getElementById('city-hdr-title')
  if (!grid || typeof REGION_META === 'undefined' || !REGION_META[regionId]) return
  const meta = REGION_META[regionId]
  if (titleEl) titleEl.textContent = `${meta.icon} ${meta.name}`
  // Task #69 hotfix: explicit guard — if CITY_PACK global is missing, surface to console
  // so future regressions (forgotten <script> tag) are caught immediately, not silently
  // hidden behind the "Coming soon" placeholder.
  if (typeof CITY_PACK === 'undefined') {
    console.error('[city-selector] CITY_PACK is not loaded. Check <script src="games/data/city-pokemon-pack.js"> in index.html.')
  }
  const pack = (typeof CITY_PACK !== 'undefined' && CITY_PACK[regionId]) ? CITY_PACK[regionId] : null
  if (!pack || !pack.cities || pack.cities.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;padding:30px;text-align:center;color:rgba(255,255,255,0.6);font-family:'Fredoka One',cursive;">🚧 Kota ${meta.name} sedang disiapkan!<br><span style="font-size:13px;color:rgba(255,255,255,0.4);">Coming soon — kembali lagi nanti ya 😊</span></div>`
    return
  }
  const states = (typeof getCityStates === 'function')
    ? getCityStates(_citySelectorGame, regionId, pack.cities)
    : pack.cities.map(c => ({...c, state: 'available', stars: 0}))
  const filter = `hue-rotate(${meta.hueRotate}deg) saturate(${meta.saturate}) drop-shadow(0 0 6px ${meta.color})`

  grid.innerHTML = states.map((c, i) => {
    const tier = c.tier || 1
    const dots = Array.from({length: 5}, (_, n) =>
      `<span class="dot${n < tier ? ' active' : ''}"></span>`
    ).join('')
    let statusText = ''
    if (c.state === 'completed') {
      statusText = '⭐'.repeat(Math.max(1, c.stars || 1))
    } else if (c.state === 'available') {
      statusText = '▶'
    } else {
      statusText = '🔒'
    }
    const displayName = c.state === 'locked' ? '???' : (c.name || c.slug)
    return `
      <div class="city-card ${c.state}" data-slug="${c.slug}" data-idx="${i+1}"
           style="--region-color:${meta.color};--region-filter:${filter};">
        <img class="city-card-icon" src="${CITY_ICON_PATH}" alt="${displayName}" loading="lazy" decoding="async">
        <div class="city-card-info">
          <div class="city-card-name">${displayName}</div>
          <div class="city-card-meta">
            <span class="city-card-tier">${dots}</span>
            ${c.gym ? `<span style="opacity:0.7;">🏆 ${(c.gym && c.gym.leader) || c.gym}</span>` : ''}
          </div>
        </div>
        <div class="city-card-status">${statusText}</div>
      </div>`
  }).join('')

  // Hotfix #101-A: event delegation on city grid (single listener bound once;
  // see renderRegionGrid for full rationale — closures from per-card listeners
  // were leaking and crashing mobile after a few picker open/close cycles).
  if (!grid.dataset.bound) {
    grid.addEventListener('click', (ev) => {
      const card = ev.target && ev.target.closest && ev.target.closest('.city-card')
      if (!card || !grid.contains(card)) return
      const slug = card.getAttribute('data-slug')
      const idx1 = parseInt(card.getAttribute('data-idx') || '0', 10)
      if (!slug || !idx1) return
      const stateClass = card.classList.contains('locked') ? 'locked'
                       : card.classList.contains('completed') ? 'completed' : 'available'
      if (stateClass === 'locked') {
        try { playClick && playClick() } catch(_) {}
        card.style.animation = 'none'; void card.offsetWidth
        card.style.animation = 'wrongShake 0.4s ease'
        return
      }
      try { playClick && playClick() } catch(_) {}
      // Persist selection + start game. Use _citySelectorRegion (set by openCityOverlay)
      // since regionId param closure is gone with delegation.
      try {
        const _region = _citySelectorRegion
        state.selectedRegion = _region
        state.selectedCity = slug
        state.selectedCityIdx = idx1
        state.selectedLevelNum = idx1
        state.selectedLevel = idx1 <= 13 ? 'easy' : idx1 <= 26 ? 'medium' : 'hard'
        // Hotfix #101-E: preserve string '13b' so endGame's setCityComplete writes
        // to prog.g13b bucket (matches g13bLevelComplete's own writer). Previously
        // normalized to 13 → writes split across prog.g13 / prog.g13b → progress invisible.
        const _g = _citySelectorGame
        if (_g === '13b') state.currentGame = '13b'
        else {
          const _n = (typeof _g === 'number') ? _g : parseInt(_g, 10)
          if (Number.isFinite(_n)) state.currentGame = _n
        }
        state.gameStars = [0, 0]
        state.maxPossibleStars = null
        state.currentPlayer = 0
        state.paused = false
        state._showingResult = false
        state._showingGameResult = false
      } catch(_) {}
      closeCityOverlay()
      const g = _citySelectorGame
      // Hotfix #110: defensive sprite reset before routing to any game,
      // covers the "win → pick different city → broken sprite" repro.
      try {
        ;['g10-pspr','g10-espr','g13-pspr','g13-wspr','g13b-pspr','g13b-wspr','g13b-leg-spr','g13b-catch-ball'].forEach(id => {
          const el = document.getElementById(id)
          if (el && typeof resetSpriteEl === 'function') resetSpriteEl(el)
        })
        if (typeof flushSpriteQueue === 'function') flushSpriteQueue()
      } catch(_){}
      try {
        if (g === 10 && typeof initGame10 === 'function') { showScreen('screen-game10'); setTimeout(initGame10, 80) }
        else if (g === 13 && typeof initGame13 === 'function') { showScreen('screen-game13'); setTimeout(initGame13, 80) }
        else if (g === '13b' && typeof startQuickFire === 'function') { startQuickFire() }
      } catch(e) { console.warn('[city-selector] start failed:', e) }
    })
    grid.dataset.bound = '1'
  }
}

if (typeof window !== 'undefined') {
  window.openRegionOverlay = openRegionOverlay
  window.closeRegionOverlay = closeRegionOverlay
  window.openCityOverlay = openCityOverlay
  window.closeCityOverlay = closeCityOverlay
  window.backToRegionOverlay = backToRegionOverlay
}
