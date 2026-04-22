#!/usr/bin/env python3
"""
Hand-crafted unique SVG paths per train.
Every train has a DIFFERENT SHAPE — not just different colour.
"""
import os, json
OUT = os.path.dirname(os.path.abspath(__file__))

SVGS = {}

# ═══════════════════════════════════════════════════════════════════════════════
# STEPHENSON'S ROCKET 1829 — inclined boiler, ONE giant driving wheel
# ═══════════════════════════════════════════════════════════════════════════════
SVGS["stephensons-rocket"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 120">
  <!-- chimney tall vertical -->
  <rect x="18" y="8" width="14" height="38" rx="3" fill="#333"/>
  <rect x="14" y="4" width="22" height="7" rx="2" fill="#222"/>
  <!-- smoke -->
  <circle cx="25" cy="6" r="7" fill="#bbb" opacity=".5"/>
  <circle cx="34" cy="2" r="5" fill="#aaa" opacity=".35"/>
  <!-- inclined boiler -->
  <g transform="rotate(-16 95 65)">
    <rect x="28" y="50" width="110" height="26" rx="9" fill="#8B4513"/>
    <rect x="100" y="48" width="42" height="30" rx="5" fill="#6B3010"/>
  </g>
  <!-- firebox / cab end -->
  <rect x="128" y="46" width="34" height="40" rx="4" fill="#5A2808"/>
  <rect x="134" y="52" width="12" height="10" rx="2" fill="#87CEEB" opacity=".75"/>
  <!-- ONE large driving wheel -->
  <circle cx="75" cy="90" r="26" fill="#2C1A0E" stroke="#CD853F" stroke-width="4"/>
  <line x1="75" y1="64" x2="75" y2="116" stroke="#CD853F" stroke-width="2"/>
  <line x1="49" y1="90" x2="101" y2="90" stroke="#CD853F" stroke-width="2"/>
  <line x1="57" y1="68" x2="93" y2="112" stroke="#CD853F" stroke-width="1.5"/>
  <line x1="93" y1="68" x2="57" y2="112" stroke="#CD853F" stroke-width="1.5"/>
  <circle cx="75" cy="90" r="5" fill="#CD853F"/>
  <!-- small pony wheel front -->
  <circle cx="26" cy="97" r="10" fill="#2C1A0E" stroke="#CD853F" stroke-width="3"/>
  <circle cx="26" cy="97" r="3" fill="#CD853F"/>
  <!-- small trailer wheel rear -->
  <circle cx="148" cy="97" r="10" fill="#2C1A0E" stroke="#CD853F" stroke-width="3"/>
  <circle cx="148" cy="97" r="3" fill="#CD853F"/>
  <!-- tender (water barrel) -->
  <ellipse cx="162" cy="82" rx="14" ry="16" fill="#4A3010"/>
  <text x="90" y="116" font-family="Arial" font-size="7" fill="#888" text-anchor="middle">Stephenson's Rocket · 1829</text>
</svg>"""

# ═══════════════════════════════════════════════════════════════════════════════
# LOCOMOTION NO.1 1825 — very primitive, vertical boiler, chain drive visible
# ═══════════════════════════════════════════════════════════════════════════════
SVGS["locomotion-no1"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120">
  <!-- vertical boiler (tall cylinder) -->
  <rect x="52" y="20" width="28" height="58" rx="6" fill="#4A2F1A"/>
  <ellipse cx="66" cy="20" rx="14" ry="7" fill="#5A3A20"/>
  <!-- chimney on top -->
  <rect x="60" y="4" width="12" height="18" rx="3" fill="#333"/>
  <rect x="57" y="2" width="18" height="5" rx="2" fill="#222"/>
  <ellipse cx="66" cy="3" rx="9" ry="4" fill="#999" opacity=".5"/>
  <!-- crossbeam / walking beam on top -->
  <rect x="30" y="30" width="90" height="8" rx="3" fill="#3A2010"/>
  <rect x="28" y="24" width="6" height="16" rx="2" fill="#2A1808"/>
  <rect x="116" y="24" width="6" height="16" rx="2" fill="#2A1808"/>
  <!-- connecting rods visible -->
  <line x1="34" y1="38" x2="40"  y2="75" stroke="#5A3010" stroke-width="3"/>
  <line x1="120" y1="38" x2="114" y2="75" stroke="#5A3010" stroke-width="3"/>
  <!-- frame -->
  <rect x="12" y="70" width="136" height="10" rx="3" fill="#2A1808"/>
  <!-- 4 equal wheels -->
  <circle cx="32"  cy="90" r="16" fill="#1A0A00" stroke="#7A5030" stroke-width="3"/>
  <circle cx="68"  cy="90" r="16" fill="#1A0A00" stroke="#7A5030" stroke-width="3"/>
  <circle cx="104" cy="90" r="16" fill="#1A0A00" stroke="#7A5030" stroke-width="3"/>
  <circle cx="140" cy="90" r="16" fill="#1A0A00" stroke="#7A5030" stroke-width="3"/>
  <circle cx="32"  cy="90" r="4"  fill="#7A5030"/>
  <circle cx="68"  cy="90" r="4"  fill="#7A5030"/>
  <circle cx="104" cy="90" r="4"  fill="#7A5030"/>
  <circle cx="140" cy="90" r="4"  fill="#7A5030"/>
  <text x="80" y="116" font-family="Arial" font-size="7" fill="#888" text-anchor="middle">Locomotion No.1 · 1825</text>
</svg>"""

# ═══════════════════════════════════════════════════════════════════════════════
# AMERICAN 4-4-0 1845 — BALLOON chimney, big cowcatcher, wooden cab
# ═══════════════════════════════════════════════════════════════════════════════
SVGS["american-4-4-0"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 115">
  <!-- smoke -->
  <ellipse cx="36" cy="8" rx="10" ry="7" fill="#bbb" opacity=".5"/>
  <ellipse cx="48" cy="3" rx="7" ry="5" fill="#aaa" opacity=".35"/>
  <!-- BALLOON chimney (wide top) -->
  <rect x="26" y="16" width="16" height="26" rx="2" fill="#333"/>
  <ellipse cx="34" cy="16" rx="14" ry="7" fill="#222"/>
  <rect x="22" y="10" width="24" height="8" rx="3" fill="#111"/>
  <!-- long boiler -->
  <rect x="38" y="34" width="120" height="32" rx="9" fill="#8B2000"/>
  <!-- steam dome -->
  <ellipse cx="88" cy="32" rx="14" ry="10" fill="#6B1800"/>
  <!-- sandbox dome -->
  <ellipse cx="115" cy="34" rx="9" ry="7" fill="#6B1800"/>
  <!-- headlamp big -->
  <circle cx="28" cy="50" r="7" fill="#2A1808"/>
  <circle cx="28" cy="50" r="5" fill="#FFD700" opacity=".9"/>
  <!-- wooden cab (arched roof, ornate) -->
  <rect x="148" y="22" width="48" height="44" rx="3" fill="#5A3010"/>
  <path d="M144,22 Q168,12 200,22" fill="#4A2808" stroke="#CD853F" stroke-width="1.5"/>
  <rect x="154" y="28" width="14" height="12" rx="2" fill="#87CEEB" opacity=".75"/>
  <rect x="174" y="28" width="14" height="12" rx="2" fill="#87CEEB" opacity=".75"/>
  <!-- cab window arch decoration -->
  <path d="M152,28 Q161,24 170,28" fill="none" stroke="#CD853F" stroke-width="1.5"/>
  <path d="M172,28 Q181,24 190,28" fill="none" stroke="#CD853F" stroke-width="1.5"/>
  <!-- running board -->
  <rect x="28" y="64" width="170" height="7" rx="2" fill="#6B1800"/>
  <!-- cowcatcher (triangle grid) -->
  <path d="M28,66 L4,78 L4,83 L28,73Z" fill="#4A0A00"/>
  <line x1="6"  y1="75" x2="28" y2="67" stroke="#CD853F" stroke-width="1.2"/>
  <line x1="10" y1="78" x2="28" y2="70" stroke="#CD853F" stroke-width="1.2"/>
  <line x1="14" y1="81" x2="28" y2="73" stroke="#CD853F" stroke-width="1.2"/>
  <!-- 2 small front (pony) wheels -->
  <circle cx="40"  cy="86" r="10" fill="#2C1A0E" stroke="#CD853F" stroke-width="2.5"/>
  <circle cx="40"  cy="86" r="3"  fill="#CD853F"/>
  <!-- 2 pairs large driving wheels -->
  <circle cx="72"  cy="86" r="18" fill="#2C1A0E" stroke="#CD853F" stroke-width="3.5"/>
  <circle cx="108" cy="86" r="18" fill="#2C1A0E" stroke="#CD853F" stroke-width="3.5"/>
  <circle cx="72"  cy="86" r="4.5" fill="#CD853F"/>
  <circle cx="108" cy="86" r="4.5" fill="#CD853F"/>
  <line x1="72" y1="68" x2="72"  y2="104" stroke="#CD853F" stroke-width="1.8"/>
  <line x1="54" y1="86" x2="90"  y2="86"  stroke="#CD853F" stroke-width="1.8"/>
  <line x1="59" y1="71" x2="85"  y2="101" stroke="#CD853F" stroke-width="1.4"/>
  <line x1="85" y1="71" x2="59"  y2="101" stroke="#CD853F" stroke-width="1.4"/>
  <line x1="108" y1="68" x2="108" y2="104" stroke="#CD853F" stroke-width="1.8"/>
  <line x1="90"  y1="86" x2="126" y2="86"  stroke="#CD853F" stroke-width="1.8"/>
  <line x1="95"  y1="71" x2="121" y2="101" stroke="#CD853F" stroke-width="1.4"/>
  <line x1="121" y1="71" x2="95"  y2="101" stroke="#CD853F" stroke-width="1.4"/>
  <!-- trailing wheel -->
  <circle cx="166" cy="88" r="12" fill="#2C1A0E" stroke="#CD853F" stroke-width="2.5"/>
  <circle cx="166" cy="88" r="3"  fill="#CD853F"/>
  <!-- coupling rod -->
  <rect x="52" y="83" width="72" height="5" rx="2" fill="#CD853F" opacity=".6"/>
  <text x="105" y="112" font-family="Arial" font-size="7" fill="#888" text-anchor="middle">American Standard 4-4-0 · 1845</text>
</svg>"""

# ═══════════════════════════════════════════════════════════════════════════════
# MALLARD A4 1938 — Art Deco full streamlined shroud, blue, world speed record
# ═══════════════════════════════════════════════════════════════════════════════
SVGS["mallard-a4"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 110">
  <defs>
    <linearGradient id="mallG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#5599DD"/>
      <stop offset="55%" stop-color="#1A4A8A"/>
      <stop offset="100%" stop-color="#0A2A5A"/>
    </linearGradient>
  </defs>
  <!-- full streamlined shroud — teardrop bullet -->
  <path d="M4,54 Q10,28 36,24 L196,24 L196,78 Q196,84 190,86 L36,86 Q12,82 4,54Z" fill="url(#mallG)"/>
  <!-- Art Deco stripe -->
  <path d="M4,54 Q10,50 196,48 L196,56 Q10,62 4,54Z" fill="#FFD700" opacity=".55"/>
  <!-- chimney slot (recessed into shroud) -->
  <rect x="44" y="20" width="10" height="6" rx="2" fill="#0A1A3A"/>
  <!-- windows -->
  <rect x="58"  y="30" width="16" height="14" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="80"  y="30" width="16" height="14" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="102" y="30" width="16" height="14" rx="2" fill="#87CEEB" stroke="#FFD700" stroke-width=".8" opacity=".7"/>
  <rect x="124" y="30" width="16" height="14" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="146" y="30" width="16" height="14" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="168" y="30" width="16" height="14" rx="2" fill="#87CEEB" opacity=".65"/>
  <!-- LNER badge on nose -->
  <circle cx="16" cy="54" r="8" fill="#0A2A5A" stroke="#FFD700" stroke-width="1.5"/>
  <text x="16" y="57" font-family="Arial" font-size="5" font-weight="bold" fill="#FFD700" text-anchor="middle">LNER</text>
  <!-- headlamp in shroud -->
  <ellipse cx="5" cy="54" rx="4" ry="5" fill="#FFD700" opacity=".85"/>
  <!-- skirt hides wheels but show slight humps -->
  <rect x="40" y="78" width="148" height="8" rx="2" fill="#0A2A5A"/>
  <!-- wheel humps visible below skirt -->
  <ellipse cx="66"  cy="86" rx="16" ry="6" fill="#0A2050"/>
  <ellipse cx="102" cy="86" rx="16" ry="6" fill="#0A2050"/>
  <ellipse cx="138" cy="86" rx="16" ry="6" fill="#0A2050"/>
  <!-- speed record text -->
  <text x="105" y="105" font-family="Arial" font-size="7" fill="#888" text-anchor="middle">Mallard LNER A4 · 203 km/h · 1938</text>
</svg>"""

# ═══════════════════════════════════════════════════════════════════════════════
# BIG BOY 4-8-8-4 1941 — MASSIVE articulated, 2 sets of 8 drive wheels
# ═══════════════════════════════════════════════════════════════════════════════
SVGS["big-boy-4-8-8-4"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 115">
  <!-- chimney -->
  <rect x="24" y="10" width="16" height="32" rx="2" fill="#333"/>
  <rect x="20" y="7"  width="24" height="6"  rx="2" fill="#222"/>
  <ellipse cx="32" cy="8" rx="10" ry="5" fill="#aaa" opacity=".5"/>
  <!-- HUGE boiler (two sections: front engine + rear engine) -->
  <rect x="36" y="28" width="224" height="38" rx="10" fill="#1A1A1A"/>
  <!-- articulation joint in middle -->
  <rect x="146" y="24" width="12" height="46" rx="2" fill="#333"/>
  <!-- domes -->
  <ellipse cx="80"  cy="26" rx="14" ry="10" fill="#111"/>
  <ellipse cx="200" cy="26" rx="14" ry="10" fill="#111"/>
  <!-- sand domes -->
  <ellipse cx="110" cy="28" rx="8" ry="6"  fill="#111"/>
  <!-- big cab at rear -->
  <rect x="256" y="18" width="42" height="48" rx="3" fill="#0A0A0A"/>
  <path d="M252,18 L298,18 L298,14 Q275,8 252,14Z" fill="#444"/>
  <rect x="262" y="24" width="14" height="11" rx="2" fill="#87CEEB" opacity=".75"/>
  <rect x="280" y="24" width="14" height="11" rx="2" fill="#87CEEB" opacity=".75"/>
  <!-- running board -->
  <rect x="14" y="64" width="284" height="8" rx="2" fill="#0A0A0A"/>
  <!-- cowcatcher -->
  <path d="M14,66 L2,76 L2,80 L14,74Z" fill="#1A1A1A"/>
  <!-- headlamp -->
  <circle cx="18" cy="54" r="6" fill="#FFD700" opacity=".9"/>
  <!-- FRONT ENGINE: 4 pairs of 8 big drive wheels + 2 pony wheels -->
  <circle cx="22"  cy="88" r="10" fill="#111" stroke="#555" stroke-width="2.5"/>
  <circle cx="22"  cy="88" r="3"  fill="#555"/>
  <circle cx="44"  cy="88" r="16" fill="#111" stroke="#555" stroke-width="3.5"/>
  <circle cx="44"  cy="88" r="4"  fill="#555"/>
  <circle cx="72"  cy="88" r="16" fill="#111" stroke="#555" stroke-width="3.5"/>
  <circle cx="72"  cy="88" r="4"  fill="#555"/>
  <circle cx="100" cy="88" r="16" fill="#111" stroke="#555" stroke-width="3.5"/>
  <circle cx="100" cy="88" r="4"  fill="#555"/>
  <circle cx="128" cy="88" r="16" fill="#111" stroke="#555" stroke-width="3.5"/>
  <circle cx="128" cy="88" r="4"  fill="#555"/>
  <!-- coupling rod front set -->
  <rect x="30" y="85" width="112" height="5" rx="2" fill="#555" opacity=".7"/>
  <!-- REAR ENGINE: 4 pairs of drive wheels -->
  <circle cx="162" cy="88" r="16" fill="#111" stroke="#555" stroke-width="3.5"/>
  <circle cx="162" cy="88" r="4"  fill="#555"/>
  <circle cx="190" cy="88" r="16" fill="#111" stroke="#555" stroke-width="3.5"/>
  <circle cx="190" cy="88" r="4"  fill="#555"/>
  <circle cx="218" cy="88" r="16" fill="#111" stroke="#555" stroke-width="3.5"/>
  <circle cx="218" cy="88" r="4"  fill="#555"/>
  <circle cx="246" cy="88" r="16" fill="#111" stroke="#555" stroke-width="3.5"/>
  <circle cx="246" cy="88" r="4"  fill="#555"/>
  <!-- trailing wheel -->
  <circle cx="274" cy="90" r="12" fill="#111" stroke="#555" stroke-width="2.5"/>
  <circle cx="274" cy="90" r="3"  fill="#555"/>
  <!-- coupling rod rear set -->
  <rect x="150" y="85" width="108" height="5" rx="2" fill="#555" opacity=".7"/>
  <text x="150" y="112" font-family="Arial" font-size="7" fill="#888" text-anchor="middle">Big Boy 4-8-8-4 · Union Pacific · 1941</text>
</svg>"""

# ═══════════════════════════════════════════════════════════════════════════════
# FLYING SCOTSMAN A1 — classic British Pacific, dark green, 3 driving wheels
# ═══════════════════════════════════════════════════════════════════════════════
SVGS["flying-scotsman-a1"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 215 115">
  <defs>
    <linearGradient id="fsG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2E8B1A"/>
      <stop offset="100%" stop-color="#1A5A0A"/>
    </linearGradient>
  </defs>
  <!-- chimney (straight stovepipe) -->
  <rect x="30" y="10" width="14" height="30" rx="3" fill="#2A2A2A"/>
  <rect x="27" y="7"  width="20" height="6"  rx="2" fill="#1A1A1A"/>
  <ellipse cx="37" cy="8" rx="8" ry="4" fill="#bbb" opacity=".45"/>
  <!-- boiler -->
  <rect x="40" y="30" width="128" height="34" rx="11" fill="url(#fsG)"/>
  <!-- steam dome (curved top) -->
  <ellipse cx="85"  cy="28" rx="13" ry="10" fill="#1A5A0A"/>
  <!-- safety valve dome -->
  <ellipse cx="110" cy="30" rx="8"  ry="6"  fill="#1A5A0A"/>
  <rect x="108" y="20" width="4" height="12" rx="1" fill="#888"/>
  <!-- cab (LNER style, curved roof) -->
  <rect x="162" y="20" width="46" height="44" rx="3" fill="#1A5A0A"/>
  <path d="M158,20 Q185,10 208,20" fill="#1A5A0A" stroke="#C8A020" stroke-width="1.5"/>
  <rect x="167" y="26" width="13" height="11" rx="2" fill="#87CEEB" opacity=".75"/>
  <rect x="185" y="26" width="13" height="11" rx="2" fill="#87CEEB" opacity=".75"/>
  <!-- name plate -->
  <rect x="167" y="44" width="34" height="8" rx="2" fill="#C8A020"/>
  <text x="184" y="51" font-family="Arial" font-size="5" font-weight="bold" fill="#1A5A0A" text-anchor="middle">FLYING SCOTSMAN</text>
  <!-- footplate -->
  <rect x="32" y="62" width="176" height="7" rx="2" fill="#1A4A08"/>
  <!-- splasher covers over driving wheels -->
  <ellipse cx="74"  cy="60" rx="20" ry="8" fill="#1A5A0A"/>
  <ellipse cx="110" cy="60" rx="20" ry="8" fill="#1A5A0A"/>
  <ellipse cx="146" cy="60" rx="20" ry="8" fill="#1A5A0A"/>
  <!-- leading pony wheel -->
  <circle cx="36"  cy="86" r="11" fill="#0A2004" stroke="#C8A020" stroke-width="2.5"/>
  <circle cx="36"  cy="86" r="3"  fill="#C8A020"/>
  <!-- 3 large coupled driving wheels -->
  <circle cx="74"  cy="86" r="20" fill="#0A2004" stroke="#C8A020" stroke-width="4"/>
  <circle cx="110" cy="86" r="20" fill="#0A2004" stroke="#C8A020" stroke-width="4"/>
  <circle cx="146" cy="86" r="20" fill="#0A2004" stroke="#C8A020" stroke-width="4"/>
  <circle cx="74"  cy="86" r="5"  fill="#C8A020"/>
  <circle cx="110" cy="86" r="5"  fill="#C8A020"/>
  <circle cx="146" cy="86" r="5"  fill="#C8A020"/>
  <!-- spokes -->
  <line x1="74"  y1="66" x2="74"  y2="106" stroke="#C8A020" stroke-width="1.8"/>
  <line x1="54"  y1="86" x2="94"  y2="86"  stroke="#C8A020" stroke-width="1.8"/>
  <line x1="60"  y1="72" x2="88"  y2="100" stroke="#C8A020" stroke-width="1.4"/>
  <line x1="88"  y1="72" x2="60"  y2="100" stroke="#C8A020" stroke-width="1.4"/>
  <line x1="110" y1="66" x2="110" y2="106" stroke="#C8A020" stroke-width="1.8"/>
  <line x1="90"  y1="86" x2="130" y2="86"  stroke="#C8A020" stroke-width="1.8"/>
  <line x1="96"  y1="72" x2="124" y2="100" stroke="#C8A020" stroke-width="1.4"/>
  <line x1="124" y1="72" x2="96"  y2="100" stroke="#C8A020" stroke-width="1.4"/>
  <line x1="146" y1="66" x2="146" y2="106" stroke="#C8A020" stroke-width="1.8"/>
  <line x1="126" y1="86" x2="166" y2="86"  stroke="#C8A020" stroke-width="1.8"/>
  <line x1="132" y1="72" x2="160" y2="100" stroke="#C8A020" stroke-width="1.4"/>
  <line x1="160" y1="72" x2="132" y2="100" stroke="#C8A020" stroke-width="1.4"/>
  <!-- trailing wheels -->
  <circle cx="176" cy="88" r="12" fill="#0A2004" stroke="#C8A020" stroke-width="2.5"/>
  <circle cx="176" cy="88" r="3"  fill="#C8A020"/>
  <!-- headlamp -->
  <circle cx="24" cy="52" r="6" fill="#2A1808" stroke="#C8A020" stroke-width="1.5"/>
  <circle cx="24" cy="52" r="4" fill="#FFD700" opacity=".9"/>
  <!-- coupling rod -->
  <rect x="56" y="83" width="98" height="5" rx="2" fill="#C8A020" opacity=".6"/>
  <text x="108" y="112" font-family="Arial" font-size="7" fill="#888" text-anchor="middle">Flying Scotsman A1 · LNER · 1923</text>
</svg>"""

# ═══════════════════════════════════════════════════════════════════════════════
# SHINKANSEN 0 SERIES 1964 — blunt round nose, white with blue stripe
# ═══════════════════════════════════════════════════════════════════════════════
SVGS["shinkansen-0"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 100">
  <defs>
    <linearGradient id="s0G" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#E8E8E8"/>
      <stop offset="100%" stop-color="#F5F5F5"/>
    </linearGradient>
  </defs>
  <!-- body — BLUNT round nose -->
  <path d="M4,50 Q4,24 24,24 L196,24 L196,76 L24,76 Q4,76 4,50Z" fill="url(#s0G)"/>
  <!-- blue stripe -->
  <path d="M4,50 Q4,44 22,42 L196,42 L196,58 Q196,58 22,58 Q4,58 4,50Z" fill="#1A3A8A" opacity=".75"/>
  <!-- windows (square, old style) -->
  <rect x="30"  y="28" width="18" height="12" rx="1" fill="#87CEEB" opacity=".7"/>
  <rect x="54"  y="28" width="18" height="12" rx="1" fill="#87CEEB" opacity=".7"/>
  <rect x="78"  y="28" width="18" height="12" rx="1" fill="#87CEEB" opacity=".7"/>
  <rect x="102" y="28" width="18" height="12" rx="1" fill="#87CEEB" opacity=".7"/>
  <rect x="126" y="28" width="18" height="12" rx="1" fill="#87CEEB" opacity=".7"/>
  <rect x="150" y="28" width="18" height="12" rx="1" fill="#87CEEB" opacity=".7"/>
  <rect x="174" y="28" width="16" height="12" rx="1" fill="#87CEEB" opacity=".65"/>
  <!-- pantograph old style -->
  <line x1="100" y1="24" x2="96"  y2="13" stroke="#888" stroke-width="1.5"/>
  <line x1="112" y1="24" x2="116" y2="13" stroke="#888" stroke-width="1.5"/>
  <line x1="88"  y1="13" x2="124" y2="13" stroke="#888" stroke-width="2"/>
  <line x1="86"  y1="16" x2="126" y2="16" stroke="#888" stroke-width="1.5"/>
  <!-- round headlamps (iconic 0-series feature) -->
  <circle cx="8"   cy="38" r="5" fill="#FFD700" opacity=".9"/>
  <circle cx="8"   cy="62" r="5" fill="#FFD700" opacity=".9"/>
  <circle cx="200" cy="38" r="5" fill="#FFD700" opacity=".6"/>
  <circle cx="200" cy="62" r="5" fill="#FFD700" opacity=".6"/>
  <!-- wheels (short skirt) -->
  <circle cx="46"  cy="87" r="10" fill="#CCC" stroke="#888" stroke-width="2"/>
  <circle cx="80"  cy="87" r="10" fill="#CCC" stroke="#888" stroke-width="2"/>
  <circle cx="130" cy="87" r="10" fill="#CCC" stroke="#888" stroke-width="2"/>
  <circle cx="164" cy="87" r="10" fill="#CCC" stroke="#888" stroke-width="2"/>
  <text x="105" y="100" font-family="Arial" font-size="7" fill="#888" text-anchor="middle">Shinkansen 0 Series · 1964 · 220 km/h</text>
</svg>"""

# ═══════════════════════════════════════════════════════════════════════════════
# SHINKANSEN 500 1997 — ultra-long pointed nose (most distinctive)
# ═══════════════════════════════════════════════════════════════════════════════
SVGS["shinkansen-500"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 230 100">
  <defs>
    <linearGradient id="s500G" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2A2A6A"/>
      <stop offset="50%" stop-color="#1A1A4A"/>
      <stop offset="100%" stop-color="#0A0A2A"/>
    </linearGradient>
  </defs>
  <!-- body — ULTRA-LONG pointed nose (60px snout) -->
  <path d="M2,50 L62,24 L220,24 L220,76 L62,76 Z" fill="url(#s500G)"/>
  <!-- silver accent stripe -->
  <path d="M2,50 L62,44 L220,44 L220,56 L62,56 Z" fill="#C0C0C0" opacity=".35"/>
  <!-- windows (slanted on nose section) -->
  <rect x="70"  y="28" width="14" height="12" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="90"  y="28" width="14" height="12" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="110" y="28" width="14" height="12" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="130" y="28" width="14" height="12" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="150" y="28" width="14" height="12" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="170" y="28" width="14" height="12" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="192" y="28" width="14" height="12" rx="2" fill="#87CEEB" opacity=".6"/>
  <!-- pantograph -->
  <line x1="120" y1="24" x2="115" y2="12" stroke="#aaa" stroke-width="1.5"/>
  <line x1="134" y1="24" x2="139" y2="12" stroke="#aaa" stroke-width="1.5"/>
  <line x1="108" y1="12" x2="146" y2="12" stroke="#aaa" stroke-width="2"/>
  <!-- tiny headlight at nose tip -->
  <circle cx="4" cy="50" r="3" fill="#FFE040" opacity=".9"/>
  <!-- wheels -->
  <circle cx="80"  cy="87" r="10" fill="#1A1A4A" stroke="#888" stroke-width="2"/>
  <circle cx="110" cy="87" r="10" fill="#1A1A4A" stroke="#888" stroke-width="2"/>
  <circle cx="155" cy="87" r="10" fill="#1A1A4A" stroke="#888" stroke-width="2"/>
  <circle cx="185" cy="87" r="10" fill="#1A1A4A" stroke="#888" stroke-width="2"/>
  <text x="115" y="100" font-family="Arial" font-size="7" fill="#888" text-anchor="middle">Shinkansen 500 Series · 1997 · 320 km/h</text>
</svg>"""

# ═══════════════════════════════════════════════════════════════════════════════
# SHINKANSEN E5 HAYABUSA 2011 — green with purple stripe, medium-long nose
# ═══════════════════════════════════════════════════════════════════════════════
SVGS["shinkansen-e5"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 100">
  <defs>
    <linearGradient id="e5G" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2E8B4A"/>
      <stop offset="100%" stop-color="#1A5A2E"/>
    </linearGradient>
  </defs>
  <!-- long tapering nose — 46px -->
  <path d="M2,50 L48,24 L210,24 L210,76 L48,76 Z" fill="url(#e5G)"/>
  <!-- pink-purple stripe (iconic E5 feature) -->
  <path d="M2,50 L48,44 L210,44 L210,56 L48,56 Z" fill="#9B30A0" opacity=".7"/>
  <!-- white band above purple -->
  <path d="M2,50 L48,38 L210,38 L210,44 L48,44 Z" fill="#FFFFFF" opacity=".4"/>
  <!-- windows -->
  <rect x="55"  y="28" width="15" height="12" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="76"  y="28" width="15" height="12" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="97"  y="28" width="15" height="12" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="118" y="28" width="15" height="12" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="139" y="28" width="15" height="12" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="160" y="28" width="15" height="12" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="182" y="28" width="14" height="12" rx="2" fill="#87CEEB" opacity=".6"/>
  <!-- pantograph -->
  <line x1="115" y1="24" x2="110" y2="12" stroke="#aaa" stroke-width="1.5"/>
  <line x1="128" y1="24" x2="133" y2="12" stroke="#aaa" stroke-width="1.5"/>
  <line x1="102" y1="12" x2="140" y2="12" stroke="#aaa" stroke-width="2"/>
  <circle cx="4" cy="50" r="3" fill="#FFE040" opacity=".9"/>
  <!-- wheels -->
  <circle cx="68"  cy="87" r="10" fill="#1A5A2E" stroke="#888" stroke-width="2"/>
  <circle cx="98"  cy="87" r="10" fill="#1A5A2E" stroke="#888" stroke-width="2"/>
  <circle cx="144" cy="87" r="10" fill="#1A5A2E" stroke="#888" stroke-width="2"/>
  <circle cx="174" cy="87" r="10" fill="#1A5A2E" stroke="#888" stroke-width="2"/>
  <text x="110" y="100" font-family="Arial" font-size="7" fill="#888" text-anchor="middle">Shinkansen E5 Hayabusa · 2011 · 320 km/h</text>
</svg>"""

# ═══════════════════════════════════════════════════════════════════════════════
# TGV SUD-EST 1981 — very pointed delta nose, orange/grey
# ═══════════════════════════════════════════════════════════════════════════════
SVGS["tgv-sud-est"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 215 100">
  <defs>
    <linearGradient id="tgvG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#888"/>
      <stop offset="100%" stop-color="#555"/>
    </linearGradient>
  </defs>
  <!-- SHARPLY pointed nose — delta shape -->
  <path d="M2,50 L38,24 L206,24 L206,76 L38,76 Z" fill="url(#tgvG)"/>
  <!-- orange/red lower band (iconic TGV Sud-Est) -->
  <path d="M2,50 L38,56 L206,56 L206,76 L38,76 Z" fill="#E85020" opacity=".75"/>
  <!-- nose highlight -->
  <path d="M2,50 L38,36 L56,36 L56,64 L38,64 Z" fill="#AAAAAA" opacity=".3"/>
  <!-- windows -->
  <rect x="46"  y="28" width="14" height="12" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="66"  y="28" width="14" height="12" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="86"  y="28" width="14" height="12" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="106" y="28" width="14" height="12" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="126" y="28" width="14" height="12" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="146" y="28" width="14" height="12" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="168" y="28" width="14" height="12" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="188" y="28" width="12" height="12" rx="2" fill="#87CEEB" opacity=".6"/>
  <!-- pantograph -->
  <line x1="110" y1="24" x2="105" y2="12" stroke="#aaa" stroke-width="1.5"/>
  <line x1="122" y1="24" x2="127" y2="12" stroke="#aaa" stroke-width="1.5"/>
  <line x1="98"  y1="12" x2="134" y2="12" stroke="#aaa" stroke-width="2"/>
  <circle cx="4" cy="50" r="4" fill="#FFD700" opacity=".9"/>
  <!-- wheels -->
  <circle cx="56"  cy="87" r="10" fill="#444" stroke="#888" stroke-width="2"/>
  <circle cx="86"  cy="87" r="10" fill="#444" stroke="#888" stroke-width="2"/>
  <circle cx="130" cy="87" r="10" fill="#444" stroke="#888" stroke-width="2"/>
  <circle cx="164" cy="87" r="10" fill="#444" stroke="#888" stroke-width="2"/>
  <text x="108" y="100" font-family="Arial" font-size="7" fill="#888" text-anchor="middle">TGV Sud-Est · SNCF · 1981 · 270 km/h</text>
</svg>"""

# ═══════════════════════════════════════════════════════════════════════════════
# ICE 3 2000 — transparent cab nose, full glass front, white
# ═══════════════════════════════════════════════════════════════════════════════
SVGS["ice-3"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 215 100">
  <!-- white body with gentle taper -->
  <path d="M4,50 Q12,24 36,24 L206,24 L206,76 L36,76 Q12,76 4,50Z" fill="#F5F5F5"/>
  <!-- red stripe along waist -->
  <path d="M4,50 Q10,46 34,44 L206,44 L206,56 L34,56 Q10,54 4,50Z" fill="#CC1414" opacity=".8"/>
  <!-- TRANSPARENT CAB (iconic ICE3 feature — you see through the front) -->
  <path d="M4,50 Q12,34 32,30 L50,30 L50,70 L32,70 Q12,66 4,50Z" fill="#87CEEB" opacity=".5"/>
  <path d="M4,50 Q12,34 32,30 L50,30 L50,70 L32,70 Q12,66 4,50Z" fill="none" stroke="#AAA" stroke-width="1.5"/>
  <!-- cab interior silhouette -->
  <circle cx="32" cy="50" r="4" fill="#1A1A1A" opacity=".4"/>
  <!-- windows -->
  <rect x="56"  y="28" width="14" height="13" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="76"  y="28" width="14" height="13" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="96"  y="28" width="14" height="13" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="116" y="28" width="14" height="13" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="136" y="28" width="14" height="13" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="156" y="28" width="14" height="13" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="178" y="28" width="14" height="13" rx="2" fill="#87CEEB" opacity=".65"/>
  <!-- pantograph -->
  <line x1="108" y1="24" x2="103" y2="12" stroke="#aaa" stroke-width="1.5"/>
  <line x1="120" y1="24" x2="125" y2="12" stroke="#aaa" stroke-width="1.5"/>
  <line x1="96"  y1="12" x2="132" y2="12" stroke="#aaa" stroke-width="2"/>
  <circle cx="206" cy="50" r="4" fill="#FFD700" opacity=".7"/>
  <!-- wheels -->
  <circle cx="62"  cy="87" r="10" fill="#DDD" stroke="#999" stroke-width="2"/>
  <circle cx="92"  cy="87" r="10" fill="#DDD" stroke="#999" stroke-width="2"/>
  <circle cx="138" cy="87" r="10" fill="#DDD" stroke="#999" stroke-width="2"/>
  <circle cx="168" cy="87" r="10" fill="#DDD" stroke="#999" stroke-width="2"/>
  <text x="108" y="100" font-family="Arial" font-size="7" fill="#888" text-anchor="middle">ICE 3 · DB · 2000 · 330 km/h</text>
</svg>"""

# ═══════════════════════════════════════════════════════════════════════════════
# KTX-I 2004 — duck-bill shovel nose, blue/silver
# ═══════════════════════════════════════════════════════════════════════════════
SVGS["ktx-i"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 215 100">
  <defs>
    <linearGradient id="ktxG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#D0D8E8"/>
      <stop offset="100%" stop-color="#A0B0C8"/>
    </linearGradient>
  </defs>
  <!-- body -->
  <path d="M4,52 Q8,36 22,30 L56,24 L206,24 L206,78 L56,78 L22,72 Q8,66 4,52Z" fill="url(#ktxG)"/>
  <!-- blue nose section (duck bill) -->
  <path d="M4,52 Q8,38 20,32 L54,26 L54,78 L20,70 Q8,66 4,52Z" fill="#1A3A8A" opacity=".85"/>
  <!-- duck-bill window (wide panoramic) -->
  <path d="M8,44 Q10,36 22,32 L52,28 L52,46 Q34,44 8,44Z" fill="#87CEEB" opacity=".7"/>
  <!-- blue lower stripe -->
  <path d="M4,52 Q8,56 22,60 L206,60 L206,78 L56,78 L22,72 Q8,66 4,52Z" fill="#1A3A8A" opacity=".4"/>
  <!-- windows -->
  <rect x="62"  y="28" width="14" height="12" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="82"  y="28" width="14" height="12" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="102" y="28" width="14" height="12" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="122" y="28" width="14" height="12" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="142" y="28" width="14" height="12" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="162" y="28" width="14" height="12" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="184" y="28" width="14" height="12" rx="2" fill="#87CEEB" opacity=".6"/>
  <!-- pantograph -->
  <line x1="114" y1="24" x2="109" y2="12" stroke="#aaa" stroke-width="1.5"/>
  <line x1="126" y1="24" x2="131" y2="12" stroke="#aaa" stroke-width="1.5"/>
  <line x1="102" y1="12" x2="138" y2="12" stroke="#aaa" stroke-width="2"/>
  <circle cx="6" cy="52" r="3" fill="#FFE040" opacity=".9"/>
  <!-- wheels -->
  <circle cx="70"  cy="88" r="10" fill="#8090A8" stroke="#666" stroke-width="2"/>
  <circle cx="100" cy="88" r="10" fill="#8090A8" stroke="#666" stroke-width="2"/>
  <circle cx="148" cy="88" r="10" fill="#8090A8" stroke="#666" stroke-width="2"/>
  <circle cx="178" cy="88" r="10" fill="#8090A8" stroke="#666" stroke-width="2"/>
  <text x="108" y="100" font-family="Arial" font-size="7" fill="#888" text-anchor="middle">KTX-I · Korea · 2004 · 305 km/h</text>
</svg>"""

# ═══════════════════════════════════════════════════════════════════════════════
# FUXING CR400 2017 — dragon red stripe, wider body, blunt-pointed nose
# ═══════════════════════════════════════════════════════════════════════════════
SVGS["fuxing-cr400"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 215 100">
  <defs>
    <linearGradient id="fxG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F0F0F0"/>
      <stop offset="100%" stop-color="#E0E0E0"/>
    </linearGradient>
  </defs>
  <!-- wide body, medium-blunt nose -->
  <path d="M4,52 Q10,24 50,22 L206,22 L206,80 L50,80 Q10,78 4,52Z" fill="url(#fxG)"/>
  <!-- RED dragon stripe (thick, iconic) -->
  <path d="M4,52 Q10,48 48,46 L206,46 L206,56 L48,56 Q10,56 4,52Z" fill="#CC1414" opacity=".85"/>
  <!-- golden accent below red -->
  <path d="M4,52 Q10,54 48,56 L206,56 L206,60 L48,60 Q10,60 4,52Z" fill="#C8A020" opacity=".6"/>
  <!-- windows (larger than Japanese style) -->
  <rect x="58"  y="26" width="18" height="14" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="82"  y="26" width="18" height="14" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="106" y="26" width="18" height="14" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="130" y="26" width="18" height="14" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="154" y="26" width="18" height="14" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="178" y="26" width="16" height="14" rx="2" fill="#87CEEB" opacity=".6"/>
  <!-- China star emblem on nose -->
  <circle cx="20" cy="52" r="8" fill="#CC1414" opacity=".8"/>
  <text x="20" y="56" font-family="Arial" font-size="8" fill="#FFD700" text-anchor="middle">★</text>
  <!-- pantograph -->
  <line x1="112" y1="22" x2="107" y2="10" stroke="#aaa" stroke-width="1.5"/>
  <line x1="124" y1="22" x2="129" y2="10" stroke="#aaa" stroke-width="1.5"/>
  <line x1="100" y1="10" x2="136" y2="10" stroke="#aaa" stroke-width="2"/>
  <circle cx="6" cy="52" r="4" fill="#FFE040" opacity=".9"/>
  <!-- wheels -->
  <circle cx="64"  cy="90" r="10" fill="#CCC" stroke="#999" stroke-width="2"/>
  <circle cx="94"  cy="90" r="10" fill="#CCC" stroke="#999" stroke-width="2"/>
  <circle cx="140" cy="90" r="10" fill="#CCC" stroke="#999" stroke-width="2"/>
  <circle cx="170" cy="90" r="10" fill="#CCC" stroke="#999" stroke-width="2"/>
  <text x="108" y="100" font-family="Arial" font-size="7" fill="#888" text-anchor="middle">Fuxing CR400 · China · 2017 · 350 km/h</text>
</svg>"""

# ═══════════════════════════════════════════════════════════════════════════════
# SHANGHAI MAGLEV 2002 — floating, magnetic levitation, silver/blue
# ═══════════════════════════════════════════════════════════════════════════════
SVGS["shanghai-maglev"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 215 105">
  <defs>
    <linearGradient id="mgG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#C8D8F0"/>
      <stop offset="50%" stop-color="#8AAAD0"/>
      <stop offset="100%" stop-color="#4A6A90"/>
    </linearGradient>
    <filter id="hover"><feGaussianBlur stdDeviation="3"/></filter>
  </defs>
  <!-- levitation glow -->
  <ellipse cx="108" cy="95" rx="95" ry="8" fill="#00AAFF" opacity=".2" filter="url(#hover)"/>
  <ellipse cx="108" cy="92" rx="90" ry="5" fill="#00AAFF" opacity=".3"/>
  <!-- body — aerodynamic wrap-around -->
  <path d="M4,52 Q14,22 56,20 L188,20 Q210,22 212,52 L210,78 Q198,86 164,86 L56,86 Q18,84 4,78 Z" fill="url(#mgG)"/>
  <!-- nose blue accent -->
  <path d="M4,52 Q14,30 50,24 L60,24 L60,80 Q28,78 4,78 Z" fill="#2A4A8A" opacity=".4"/>
  <!-- blue stripe at mid body -->
  <path d="M4,54 Q14,52 56,50 L188,50 Q210,52 212,54 L210,58 Q198,58 164,58 L56,58 Q18,58 4,58 Z" fill="#2A4A8A" opacity=".55"/>
  <!-- windows (panoramic curved) -->
  <rect x="68"  y="26" width="18" height="14" rx="3" fill="#87CEEB" opacity=".7"/>
  <rect x="92"  y="26" width="18" height="14" rx="3" fill="#87CEEB" opacity=".7"/>
  <rect x="116" y="26" width="18" height="14" rx="3" fill="#87CEEB" opacity=".7"/>
  <rect x="140" y="26" width="18" height="14" rx="3" fill="#87CEEB" opacity=".7"/>
  <rect x="164" y="26" width="18" height="14" rx="3" fill="#87CEEB" opacity=".7"/>
  <rect x="186" y="26" width="14" height="14" rx="3" fill="#87CEEB" opacity=".6"/>
  <!-- magnetic stator rail (underside feature) -->
  <rect x="30" y="82" width="156" height="5" rx="2" fill="#2A4A8A" opacity=".6"/>
  <rect x="30" y="84" width="156" height="3" rx="1" fill="#00AAFF" opacity=".4"/>
  <!-- NO WHEELS — hovering gap -->
  <rect x="20" y="86" width="12" height="4" rx="1" fill="#2A4A8A" opacity=".5"/>
  <rect x="44" y="86" width="12" height="4" rx="1" fill="#2A4A8A" opacity=".5"/>
  <rect x="90" y="86" width="12" height="4" rx="1" fill="#2A4A8A" opacity=".5"/>
  <rect x="146" y="86" width="12" height="4" rx="1" fill="#2A4A8A" opacity=".5"/>
  <rect x="182" y="86" width="12" height="4" rx="1" fill="#2A4A8A" opacity=".5"/>
  <!-- headlight -->
  <ellipse cx="6" cy="52" rx="5" ry="8" fill="#00CCFF" opacity=".9"/>
  <text x="108" y="104" font-family="Arial" font-size="7" fill="#888" text-anchor="middle">Shanghai Maglev · Transrapid · 431 km/h</text>
</svg>"""

# ═══════════════════════════════════════════════════════════════════════════════
# LONDON UNDERGROUND 1863 — boxy wide, red roundel, sub-surface profile
# ═══════════════════════════════════════════════════════════════════════════════
SVGS["london-underground"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 215 115">
  <!-- body — boxy, wide, flat roof -->
  <rect x="4"  y="20" width="208" height="72" rx="6" fill="#1C1C1C"/>
  <!-- red band (iconic London Underground red) -->
  <rect x="4"  y="36" width="208" height="8" rx="2" fill="#CC1414"/>
  <!-- blue band below red -->
  <rect x="4"  y="44" width="208" height="8" rx="2" fill="#003399"/>
  <!-- large windows (sub-surface style) -->
  <rect x="14"  y="24" width="28" height="22" rx="3" fill="#87CEEB" opacity=".7"/>
  <rect x="48"  y="24" width="28" height="22" rx="3" fill="#87CEEB" opacity=".7"/>
  <rect x="82"  y="24" width="28" height="22" rx="3" fill="#87CEEB" opacity=".7"/>
  <rect x="116" y="24" width="28" height="22" rx="3" fill="#87CEEB" opacity=".7"/>
  <rect x="150" y="24" width="28" height="22" rx="3" fill="#87CEEB" opacity=".7"/>
  <rect x="184" y="24" width="22" height="22" rx="3" fill="#87CEEB" opacity=".65"/>
  <!-- doors -->
  <rect x="40"  y="52" width="8" height="32" rx="2" fill="#444"/>
  <rect x="76"  y="52" width="8" height="32" rx="2" fill="#444"/>
  <rect x="112" y="52" width="8" height="32" rx="2" fill="#444"/>
  <rect x="148" y="52" width="8" height="32" rx="2" fill="#444"/>
  <rect x="184" y="52" width="8" height="32" rx="2" fill="#444"/>
  <!-- roundel on front -->
  <circle cx="14" cy="59" r="10" fill="#CC1414"/>
  <rect x="5"   cy="57" width="18" height="4" rx="1" fill="#003399" x="5" y="57"/>
  <!-- headlamp -->
  <circle cx="8" cy="52" r="4" fill="#FFE040" opacity=".9"/>
  <!-- rail -->
  <rect x="0" y="96" width="215" height="4" rx="1" fill="#888"/>
  <!-- wheels -->
  <circle cx="30"  cy="96" r="12" fill="#111" stroke="#555" stroke-width="2.5"/>
  <circle cx="64"  cy="96" r="12" fill="#111" stroke="#555" stroke-width="2.5"/>
  <circle cx="150" cy="96" r="12" fill="#111" stroke="#555" stroke-width="2.5"/>
  <circle cx="184" cy="96" r="12" fill="#111" stroke="#555" stroke-width="2.5"/>
  <text x="108" y="112" font-family="Arial" font-size="7" fill="#888" text-anchor="middle">London Underground · 1863</text>
</svg>"""

# ═══════════════════════════════════════════════════════════════════════════════
# CC201 INDONESIA 1976 — EMD hood unit, orange stripe on blue/green
# ═══════════════════════════════════════════════════════════════════════════════
SVGS["cc201-indonesia"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 215 110">
  <!-- main body -->
  <rect x="6" y="26" width="200" height="54" rx="4" fill="#1A4A1A"/>
  <!-- full-width cab at left end -->
  <rect x="6" y="24" width="72" height="58" rx="4" fill="#1A4A1A"/>
  <!-- orange diagonal stripe (iconic PTKAI/KAI marking) -->
  <path d="M6,26 L78,26 L78,80 L6,80Z" fill="#1A4A1A"/>
  <path d="M6,26 Q40,26 72,60 L6,80Z" fill="#E87800" opacity=".7"/>
  <!-- cab windows -->
  <rect x="14" y="32" width="20" height="16" rx="2" fill="#87CEEB" opacity=".75"/>
  <rect x="40" y="32" width="18" height="16" rx="2" fill="#87CEEB" opacity=".65"/>
  <!-- orange waist stripe along hood -->
  <rect x="78" y="44" width="128" height="8" rx="2" fill="#E87800" opacity=".7"/>
  <!-- exhaust stacks on hood -->
  <rect x="92"  y="14" width="9" height="14" rx="2" fill="#333"/>
  <rect x="88"  y="11" width="17" height="5" rx="1" fill="#222"/>
  <rect x="122" y="16" width="8" height="12" rx="2" fill="#333"/>
  <rect x="152" y="16" width="8" height="12" rx="2" fill="#333"/>
  <rect x="180" y="16" width="8" height="12" rx="2" fill="#333"/>
  <!-- dynamic brake grid at rear top -->
  <rect x="150" y="26" width="54" height="10" rx="2" fill="#0A2A0A"/>
  <line x1="158" y1="26" x2="158" y2="36" stroke="#1A4A1A" stroke-width="2"/>
  <line x1="166" y1="26" x2="166" y2="36" stroke="#1A4A1A" stroke-width="2"/>
  <line x1="174" y1="26" x2="174" y2="36" stroke="#1A4A1A" stroke-width="2"/>
  <line x1="182" y1="26" x2="182" y2="36" stroke="#1A4A1A" stroke-width="2"/>
  <line x1="190" y1="26" x2="190" y2="36" stroke="#1A4A1A" stroke-width="2"/>
  <!-- headlamp -->
  <circle cx="8"  cy="52" r="6" fill="#FFE040" opacity=".9"/>
  <!-- coupler -->
  <rect x="200" y="46" width="10" height="10" rx="2" fill="#555"/>
  <path d="M6,78 L2,82 L2,86 L6,84Z" fill="#1A4A1A"/>
  <!-- 3 bogies (Co-Co = 3 axle per bogie) with 6 total wheels -->
  <circle cx="28"  cy="92" r="12" fill="#111" stroke="#E87800" stroke-width="2.5"/>
  <circle cx="56"  cy="92" r="12" fill="#111" stroke="#E87800" stroke-width="2.5"/>
  <circle cx="84"  cy="92" r="12" fill="#111" stroke="#E87800" stroke-width="2.5"/>
  <circle cx="128" cy="92" r="12" fill="#111" stroke="#E87800" stroke-width="2.5"/>
  <circle cx="156" cy="92" r="12" fill="#111" stroke="#E87800" stroke-width="2.5"/>
  <circle cx="184" cy="92" r="12" fill="#111" stroke="#E87800" stroke-width="2.5"/>
  <circle cx="28"  cy="92" r="3.5" fill="#E87800"/>
  <circle cx="56"  cy="92" r="3.5" fill="#E87800"/>
  <circle cx="84"  cy="92" r="3.5" fill="#E87800"/>
  <circle cx="128" cy="92" r="3.5" fill="#E87800"/>
  <circle cx="156" cy="92" r="3.5" fill="#E87800"/>
  <circle cx="184" cy="92" r="3.5" fill="#E87800"/>
  <text x="108" y="108" font-family="Arial" font-size="7" fill="#888" text-anchor="middle">CC201 · KAI Indonesia · 1976</text>
</svg>"""

# ═══════════════════════════════════════════════════════════════════════════════
# MRT JAKARTA 2019 — modern sleek commuter, red/white
# ═══════════════════════════════════════════════════════════════════════════════
SVGS["mrt-jakarta"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 215 110">
  <!-- body — modern wide commuter -->
  <rect x="4" y="18" width="208" height="72" rx="8" fill="#E8E8E8"/>
  <!-- red upper band -->
  <rect x="4" y="18" width="208" height="22" rx="7" fill="#CC1414"/>
  <!-- red sides lower -->
  <rect x="4" y="30" width="12" height="52" rx="3" fill="#CC1414"/>
  <rect x="200" y="30" width="12" height="52" rx="3" fill="#CC1414"/>
  <!-- large panoramic windows -->
  <rect x="20"  y="22" width="30" height="20" rx="3" fill="#87CEEB" opacity=".75"/>
  <rect x="56"  y="22" width="30" height="20" rx="3" fill="#87CEEB" opacity=".75"/>
  <rect x="92"  y="22" width="30" height="20" rx="3" fill="#87CEEB" opacity=".75"/>
  <rect x="128" y="22" width="30" height="20" rx="3" fill="#87CEEB" opacity=".75"/>
  <rect x="164" y="22" width="30" height="20" rx="3" fill="#87CEEB" opacity=".75"/>
  <!-- MRT Jakarta logo text on side -->
  <rect x="80" y="46" width="56" height="16" rx="3" fill="#CC1414"/>
  <text x="108" y="58" font-family="Arial" font-size="9" font-weight="bold" fill="white" text-anchor="middle">MRT JAKARTA</text>
  <!-- doors (automatic slide) -->
  <rect x="50"  y="44" width="6" height="38" rx="2" fill="#AAA"/>
  <rect x="98"  y="44" width="6" height="38" rx="2" fill="#AAA"/>
  <rect x="148" y="44" width="6" height="38" rx="2" fill="#AAA"/>
  <rect x="184" y="44" width="6" height="38" rx="2" fill="#AAA"/>
  <!-- headlights (LED strips) -->
  <rect x="6"  y="30" width="8" height="3" rx="1" fill="#FFE040" opacity=".9"/>
  <rect x="6"  y="38" width="8" height="3" rx="1" fill="#FFE040" opacity=".9"/>
  <rect x="202" y="30" width="8" height="3" rx="1" fill="#FFE040" opacity=".7"/>
  <rect x="202" y="38" width="8" height="3" rx="1" fill="#FFE040" opacity=".7"/>
  <!-- destination sign -->
  <rect x="20" y="42" width="26" height="8" rx="2" fill="#0A0A0A"/>
  <text x="33" y="49" font-family="Arial" font-size="5" fill="#00FF00" text-anchor="middle">LEBAK BULUS</text>
  <!-- rail -->
  <rect x="0" y="97" width="215" height="4" rx="1" fill="#888"/>
  <!-- wheels on bogies -->
  <circle cx="30"  cy="97" r="11" fill="#CCC" stroke="#999" stroke-width="2"/>
  <circle cx="60"  cy="97" r="11" fill="#CCC" stroke="#999" stroke-width="2"/>
  <circle cx="150" cy="97" r="11" fill="#CCC" stroke="#999" stroke-width="2"/>
  <circle cx="180" cy="97" r="11" fill="#CCC" stroke="#999" stroke-width="2"/>
  <text x="108" y="110" font-family="Arial" font-size="7" fill="#888" text-anchor="middle">MRT Jakarta · 2019</text>
</svg>"""

# ═══════════════════════════════════════════════════════════════════════════════
# NARROW GAUGE FFESTINIOG — tiny toy-like, green, Wales mountain railway
# ═══════════════════════════════════════════════════════════════════════════════
SVGS["ffestiniog-narrow"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 105">
  <!-- smoke -->
  <circle cx="26" cy="9"  r="6" fill="#ccc" opacity=".5"/>
  <circle cx="34" cy="4"  r="4" fill="#bbb" opacity=".4"/>
  <!-- narrow stovepipe chimney -->
  <rect x="20" y="12" width="10" height="22" rx="2" fill="#333"/>
  <rect x="17" y="9"  width="16" height="5"  rx="2" fill="#222"/>
  <!-- TINY boiler (narrow gauge = much smaller) -->
  <rect x="26" y="25" width="72" height="24" rx="7" fill="#2E6B14"/>
  <!-- dome -->
  <ellipse cx="52" cy="23" rx="10" ry="7" fill="#1A5A0A"/>
  <!-- sandbox -->
  <ellipse cx="68" cy="25" rx="6" ry="5" fill="#1A5A0A"/>
  <!-- cab (open sides typical of Ffestiniog) -->
  <rect x="90" y="14" width="38" height="35" rx="3" fill="#1A5A0A"/>
  <path d="M86,14 L128,14 L128,10 Q107,4 86,10Z" fill="#C8A020"/>
  <!-- open side cab window -->
  <rect x="95" y="20" width="10" height="9" rx="2" fill="#87CEEB" opacity=".7"/>
  <rect x="110" y="20" width="10" height="9" rx="2" fill="#87CEEB" opacity=".7"/>
  <!-- footplate -->
  <rect x="18" y="47" width="112" height="5" rx="2" fill="#1A5A0A"/>
  <!-- small headlamp -->
  <circle cx="16" cy="37" r="4" fill="#FFD700" opacity=".9"/>
  <!-- cowcatcher (small) -->
  <path d="M18,48 L6,54 L6,57 L18,53Z" fill="#1A5A0A"/>
  <!-- 3 small narrow-gauge wheels per side -->
  <circle cx="32"  cy="64" r="11" fill="#0A2A04" stroke="#C8A020" stroke-width="2.5"/>
  <circle cx="56"  cy="64" r="11" fill="#0A2A04" stroke="#C8A020" stroke-width="2.5"/>
  <circle cx="80"  cy="64" r="11" fill="#0A2A04" stroke="#C8A020" stroke-width="2.5"/>
  <circle cx="32"  cy="64" r="3"  fill="#C8A020"/>
  <circle cx="56"  cy="64" r="3"  fill="#C8A020"/>
  <circle cx="80"  cy="64" r="3"  fill="#C8A020"/>
  <!-- spokes -->
  <line x1="32" y1="53" x2="32" y2="75" stroke="#C8A020" stroke-width="1.5"/>
  <line x1="21" y1="64" x2="43" y2="64" stroke="#C8A020" stroke-width="1.5"/>
  <line x1="56" y1="53" x2="56" y2="75" stroke="#C8A020" stroke-width="1.5"/>
  <line x1="45" y1="64" x2="67" y2="64" stroke="#C8A020" stroke-width="1.5"/>
  <line x1="80" y1="53" x2="80" y2="75" stroke="#C8A020" stroke-width="1.5"/>
  <line x1="69" y1="64" x2="91" y2="64" stroke="#C8A020" stroke-width="1.5"/>
  <!-- trailing small wheel -->
  <circle cx="110" cy="66" r="8" fill="#0A2A04" stroke="#C8A020" stroke-width="2"/>
  <circle cx="110" cy="66" r="2" fill="#C8A020"/>
  <!-- coupling rod -->
  <rect x="24" y="61" width="64" height="4" rx="1" fill="#C8A020" opacity=".5"/>
  <text x="75" y="100" font-family="Arial" font-size="7" fill="#888" text-anchor="middle">Ffestiniog Narrow Gauge · 1863</text>
</svg>"""

# ═══════════════════════════════════════════════════════════════════════════════
# GARRATT LMS — double-boiler articulated, unique dumbbell shape
# ═══════════════════════════════════════════════════════════════════════════════
SVGS["garratt-lms"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 270 110">
  <!-- FRONT WATER TANK (left) -->
  <rect x="2" y="34" width="56" height="32" rx="5" fill="#1A1A6B"/>
  <rect x="2" y="26" width="56" height="10" rx="3" fill="#0A0A4A"/>
  <!-- front bogie wheels (2 axles) -->
  <circle cx="18"  cy="84" r="12" fill="#0A0A2A" stroke="#4A4AAA" stroke-width="2.5"/>
  <circle cx="44"  cy="84" r="12" fill="#0A0A2A" stroke="#4A4AAA" stroke-width="2.5"/>
  <circle cx="18"  cy="84" r="3.5" fill="#4A4AAA"/>
  <circle cx="44"  cy="84" r="3.5" fill="#4A4AAA"/>
  <!-- CENTRAL BOILER on pivoting cradle -->
  <rect x="54" y="22" width="160" height="36" rx="10" fill="#0A0A3A"/>
  <!-- chimney at front of boiler -->
  <rect x="58" y="8"  width="14" height="16" rx="3" fill="#222"/>
  <rect x="55" y="5"  width="20" height="6"  rx="2" fill="#111"/>
  <ellipse cx="65" cy="6" rx="9" ry="4" fill="#aaa" opacity=".4"/>
  <!-- steam dome -->
  <ellipse cx="110" cy="20" rx="14" ry="10" fill="#0A0A2A"/>
  <ellipse cx="145" cy="22" rx="9"  ry="7"  fill="#0A0A2A"/>
  <!-- cab on boiler (middle-ish) -->
  <rect x="180" y="12" width="40" height="46" rx="3" fill="#0A0A4A"/>
  <rect x="185" y="18" width="12" height="10" rx="2" fill="#87CEEB" opacity=".7"/>
  <rect x="202" y="18" width="12" height="10" rx="2" fill="#87CEEB" opacity=".7"/>
  <!-- REAR COAL BUNKER (right) -->
  <rect x="212" y="34" width="56" height="32" rx="5" fill="#1A1A6B"/>
  <rect x="212" y="26" width="56" height="10" rx="3" fill="#0A0A4A"/>
  <!-- coal visible in bunker -->
  <ellipse cx="240" cy="30" rx="22" ry="6" fill="#1A1A1A"/>
  <!-- rear bogie wheels -->
  <circle cx="224" cy="84" r="12" fill="#0A0A2A" stroke="#4A4AAA" stroke-width="2.5"/>
  <circle cx="250" cy="84" r="12" fill="#0A0A2A" stroke="#4A4AAA" stroke-width="2.5"/>
  <circle cx="224" cy="84" r="3.5" fill="#4A4AAA"/>
  <circle cx="250" cy="84" r="3.5" fill="#4A4AAA"/>
  <!-- 4 main driving wheels per side (visible below boiler) -->
  <circle cx="76"  cy="84" r="14" fill="#0A0A2A" stroke="#4A4AAA" stroke-width="3"/>
  <circle cx="104" cy="84" r="14" fill="#0A0A2A" stroke="#4A4AAA" stroke-width="3"/>
  <circle cx="132" cy="84" r="14" fill="#0A0A2A" stroke="#4A4AAA" stroke-width="3"/>
  <circle cx="160" cy="84" r="14" fill="#0A0A2A" stroke="#4A4AAA" stroke-width="3"/>
  <circle cx="76"  cy="84" r="4"  fill="#4A4AAA"/>
  <circle cx="104" cy="84" r="4"  fill="#4A4AAA"/>
  <circle cx="132" cy="84" r="4"  fill="#4A4AAA"/>
  <circle cx="160" cy="84" r="4"  fill="#4A4AAA"/>
  <!-- coupling rods -->
  <rect x="64" y="81" width="104" height="5" rx="2" fill="#4A4AAA" opacity=".5"/>
  <!-- headlamp -->
  <circle cx="6" cy="50" r="5" fill="#FFD700" opacity=".9"/>
  <text x="135" y="106" font-family="Arial" font-size="7" fill="#888" text-anchor="middle">Beyer-Garratt · LMS · 1927</text>
</svg>"""

# ═══════════════════════════════════════════════════════════════════════════════
# PRR GG1 1934 — electric, iconic double-ended V-shaped body, riveted
# ═══════════════════════════════════════════════════════════════════════════════
SVGS["prr-gg1"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 215 110">
  <defs>
    <linearGradient id="ggG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2A2A5A"/>
      <stop offset="100%" stop-color="#1A1A3A"/>
    </linearGradient>
  </defs>
  <!-- double-ended V body — same nose both ends -->
  <path d="M4,54 Q14,22 44,20 L172,20 Q198,22 212,54 L210,82 Q198,88 172,88 L44,88 Q18,88 4,82 Z" fill="url(#ggG)"/>
  <!-- PRR gold pinstriping (5 stripes) -->
  <path d="M4,54 Q14,32 40,28 L176,28 Q200,32 212,54" fill="none" stroke="#C8A020" stroke-width="1.2"/>
  <path d="M4,54 Q14,38 40,36 L176,36 Q200,38 212,54" fill="none" stroke="#C8A020" stroke-width="1.2"/>
  <path d="M4,54 Q14,44 40,44 L176,44 Q200,44 212,54" fill="none" stroke="#C8A020" stroke-width="1.2"/>
  <path d="M4,54 Q14,66 40,68 L176,68 Q200,66 212,54" fill="none" stroke="#C8A020" stroke-width="1.2"/>
  <path d="M4,54 Q14,74 40,76 L176,76 Q200,74 212,54" fill="none" stroke="#C8A020" stroke-width="1.2"/>
  <!-- windows (both cabs) -->
  <rect x="18" y="28" width="14" height="10" rx="2" fill="#87CEEB" opacity=".7"/>
  <rect x="36" y="28" width="14" height="10" rx="2" fill="#87CEEB" opacity=".7"/>
  <rect x="168" y="28" width="14" height="10" rx="2" fill="#87CEEB" opacity=".7"/>
  <rect x="186" y="28" width="14" height="10" rx="2" fill="#87CEEB" opacity=".7"/>
  <!-- double pantograph (GG1 had 2 pantographs) -->
  <line x1="82"  y1="20" x2="78"  y2="8"  stroke="#888" stroke-width="1.5"/>
  <line x1="94"  y1="20" x2="98"  y2="8"  stroke="#888" stroke-width="1.5"/>
  <line x1="72"  y1="8"  x2="104" y2="8"  stroke="#888" stroke-width="2"/>
  <line x1="128" y1="20" x2="124" y2="8"  stroke="#888" stroke-width="1.5"/>
  <line x1="140" y1="20" x2="144" y2="8"  stroke="#888" stroke-width="1.5"/>
  <line x1="118" y1="8"  x2="150" y2="8"  stroke="#888" stroke-width="2"/>
  <!-- PRR Keystone badge center -->
  <path d="M100,48 L108,40 L116,48 L116,60 L108,68 L100,60 Z" fill="#C8A020"/>
  <text x="108" y="57" font-family="Arial" font-size="6" font-weight="bold" fill="#1A1A3A" text-anchor="middle">PRR</text>
  <!-- headlamps both ends -->
  <circle cx="6"   cy="54" r="6" fill="#FFD700" opacity=".9"/>
  <circle cx="210" cy="54" r="6" fill="#FFD700" opacity=".9"/>
  <!-- wheels (2-C+C-2 arrangement) -->
  <circle cx="18"  cy="96" r="10" fill="#111" stroke="#888" stroke-width="2"/>
  <circle cx="40"  cy="96" r="10" fill="#111" stroke="#888" stroke-width="2"/>
  <circle cx="62"  cy="96" r="13" fill="#111" stroke="#C8A020" stroke-width="3"/>
  <circle cx="86"  cy="96" r="13" fill="#111" stroke="#C8A020" stroke-width="3"/>
  <circle cx="110" cy="96" r="13" fill="#111" stroke="#C8A020" stroke-width="3"/>
  <circle cx="134" cy="96" r="13" fill="#111" stroke="#C8A020" stroke-width="3"/>
  <circle cx="158" cy="96" r="13" fill="#111" stroke="#C8A020" stroke-width="3"/>
  <circle cx="182" cy="96" r="13" fill="#111" stroke="#C8A020" stroke-width="3"/>
  <circle cx="196" cy="96" r="10" fill="#111" stroke="#888" stroke-width="2"/>
  <text x="108" y="110" font-family="Arial" font-size="7" fill="#888" text-anchor="middle">Pennsylvania Railroad GG1 · 1934</text>
</svg>"""

# ═══════════════════════════════════════════════════════════════════════════════
# SBB CROCODILE — unique drooping articulated electric, iconic Switzerland
# ═══════════════════════════════════════════════════════════════════════════════
SVGS["sbb-crocodile"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 215 110">
  <!-- LEFT hood (sloped downward like croc snout) -->
  <path d="M4,50 Q10,28 36,26 L82,26 L82,82 Q52,80 28,76 Q10,68 4,50Z" fill="#2A5A10"/>
  <!-- RIGHT hood (mirror) -->
  <path d="M212,50 Q206,28 180,26 L134,26 L134,82 Q164,80 186,76 Q204,68 212,50Z" fill="#2A5A10"/>
  <!-- CENTRAL cab box (raised above hoods) -->
  <rect x="82" y="14" width="52" height="68" rx="4" fill="#1A4A08"/>
  <!-- cab windows -->
  <rect x="88" y="20" width="16" height="14" rx="2" fill="#87CEEB" opacity=".75"/>
  <rect x="110" y="20" width="16" height="14" rx="2" fill="#87CEEB" opacity=".75"/>
  <!-- double pantograph (one per hood) -->
  <line x1="44"  y1="26" x2="40"  y2="14" stroke="#C8A020" stroke-width="1.5"/>
  <line x1="54"  y1="26" x2="58"  y2="14" stroke="#C8A020" stroke-width="1.5"/>
  <line x1="34"  y1="14" x2="64"  y2="14" stroke="#C8A020" stroke-width="2"/>
  <line x1="160" y1="26" x2="156" y2="14" stroke="#C8A020" stroke-width="1.5"/>
  <line x1="170" y1="26" x2="174" y2="14" stroke="#C8A020" stroke-width="1.5"/>
  <line x1="150" y1="14" x2="180" y2="14" stroke="#C8A020" stroke-width="2"/>
  <!-- brass detail strips on hoods -->
  <rect x="8"   y="50" width="72" height="4" rx="1" fill="#C8A020" opacity=".6"/>
  <rect x="136" y="50" width="72" height="4" rx="1" fill="#C8A020" opacity=".6"/>
  <!-- headlamps both ends -->
  <circle cx="6"   cy="50" r="6" fill="#FFD700" opacity=".9"/>
  <circle cx="210" cy="50" r="6" fill="#FFD700" opacity=".9"/>
  <!-- wheels (3 axles each bogie) -->
  <circle cx="16"  cy="90" r="12" fill="#0A2A04" stroke="#C8A020" stroke-width="2.5"/>
  <circle cx="42"  cy="90" r="12" fill="#0A2A04" stroke="#C8A020" stroke-width="2.5"/>
  <circle cx="68"  cy="90" r="12" fill="#0A2A04" stroke="#C8A020" stroke-width="2.5"/>
  <circle cx="148" cy="90" r="12" fill="#0A2A04" stroke="#C8A020" stroke-width="2.5"/>
  <circle cx="174" cy="90" r="12" fill="#0A2A04" stroke="#C8A020" stroke-width="2.5"/>
  <circle cx="200" cy="90" r="12" fill="#0A2A04" stroke="#C8A020" stroke-width="2.5"/>
  <circle cx="16"  cy="90" r="3.5" fill="#C8A020"/>
  <circle cx="42"  cy="90" r="3.5" fill="#C8A020"/>
  <circle cx="68"  cy="90" r="3.5" fill="#C8A020"/>
  <circle cx="148" cy="90" r="3.5" fill="#C8A020"/>
  <circle cx="174" cy="90" r="3.5" fill="#C8A020"/>
  <circle cx="200" cy="90" r="3.5" fill="#C8A020"/>
  <text x="108" y="108" font-family="Arial" font-size="7" fill="#888" text-anchor="middle">SBB Ce 6/8 Crocodile · Switzerland · 1919</text>
</svg>"""

# ═══════════════════════════════════════════════════════════════════════════════
# KRL COMMUTER LINE (Indonesia) — colourful modern EMU
# ═══════════════════════════════════════════════════════════════════════════════
SVGS["commuter-line-krl"] = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 215 110">
  <!-- body -->
  <rect x="4" y="20" width="208" height="70" rx="7" fill="#F0F0F0"/>
  <!-- blue nose end -->
  <rect x="4" y="20" width="36" height="70" rx="7" fill="#1A3A8A"/>
  <rect x="200" y="20" width="16" height="70" rx="7" fill="#1A3A8A"/>
  <!-- yellow/orange diagonal stripe (distinctive KRL marking) -->
  <path d="M38,20 L70,20 L38,90 Z" fill="#E8A020" opacity=".7"/>
  <path d="M68,20 L90,20 L68,90 L46,90 Z" fill="#E8A020" opacity=".4"/>
  <!-- blue upper band -->
  <rect x="38" y="20" width="170" height="16" rx="2" fill="#1A3A8A" opacity=".6"/>
  <!-- windows -->
  <rect x="10"  y="25" width="20" height="15" rx="2" fill="#87CEEB" opacity=".75"/>
  <rect x="40"  y="25" width="18" height="15" rx="2" fill="#87CEEB" opacity=".65"/>
  <rect x="64"  y="25" width="30" height="15" rx="2" fill="#87CEEB" opacity=".7"/>
  <rect x="100" y="25" width="30" height="15" rx="2" fill="#87CEEB" opacity=".7"/>
  <rect x="136" y="25" width="30" height="15" rx="2" fill="#87CEEB" opacity=".7"/>
  <rect x="172" y="25" width="30" height="15" rx="2" fill="#87CEEB" opacity=".7"/>
  <!-- KRL text on side -->
  <text x="108" y="60" font-family="Arial" font-size="11" font-weight="bold" fill="#1A3A8A" text-anchor="middle">KRL COMMUTER LINE</text>
  <!-- doors -->
  <rect x="56"  y="44" width="6" height="38" rx="2" fill="#CCC"/>
  <rect x="106" y="44" width="6" height="38" rx="2" fill="#CCC"/>
  <rect x="156" y="44" width="6" height="38" rx="2" fill="#CCC"/>
  <rect x="192" y="44" width="6" height="38" rx="2" fill="#CCC"/>
  <!-- pantograph -->
  <line x1="100" y1="20" x2="96"  y2="9"  stroke="#888" stroke-width="1.5"/>
  <line x1="112" y1="20" x2="116" y2="9"  stroke="#888" stroke-width="1.5"/>
  <line x1="88"  y1="9"  x2="124" y2="9"  stroke="#888" stroke-width="2"/>
  <!-- headlights LED -->
  <rect x="6"  y="28" width="8" height="3" rx="1" fill="#FFE040" opacity=".9"/>
  <rect x="6"  y="36" width="8" height="3" rx="1" fill="#FFE040" opacity=".9"/>
  <!-- rail -->
  <rect x="0" y="98" width="215" height="4" rx="1" fill="#888"/>
  <!-- wheels -->
  <circle cx="28"  cy="98" r="11" fill="#CCC" stroke="#999" stroke-width="2"/>
  <circle cx="58"  cy="98" r="11" fill="#CCC" stroke="#999" stroke-width="2"/>
  <circle cx="150" cy="98" r="11" fill="#CCC" stroke="#999" stroke-width="2"/>
  <circle cx="180" cy="98" r="11" fill="#CCC" stroke="#999" stroke-width="2"/>
  <text x="108" y="110" font-family="Arial" font-size="7" fill="#888" text-anchor="middle">KRL Commuter Line · Indonesia · 2011</text>
</svg>"""

def main():
    os.makedirs(OUT, exist_ok=True)
    print(f"Writing {len(SVGS)} hand-crafted unique SVGs …")
    for tid, svg in SVGS.items():
        path = os.path.join(OUT, f"{tid}.svg")
        with open(path,"w",encoding="utf-8") as f:
            f.write(svg)
        print(f"  ✓ {tid}.svg")
    print(f"\nDone — {len(SVGS)} hand-crafted SVGs written.")

if __name__=="__main__":
    main()
