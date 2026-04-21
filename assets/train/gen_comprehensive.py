#!/usr/bin/env python3
"""Generate 125 unique SVG train icons for Dunia Emosi app."""
import os

OUT_DIR = "/home/baguspermana7/rz-work/Apps/dunia-emosi/assets/train"

def wheel(cx, cy, r, spoke_color, fill="#1a1a1a", stroke="#555"):
    spokes = ""
    import math
    n = 6 if r >= 10 else 4
    for i in range(n):
        angle = math.pi * i / n
        x1 = cx + r * math.cos(angle)
        y1 = cy + r * math.sin(angle)
        x2 = cx - r * math.cos(angle)
        y2 = cy - r * math.sin(angle)
        spokes += f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{spoke_color}" stroke-width="1.2"/>\n'
    hub_r = max(1.5, r * 0.22)
    return (f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="2"/>\n'
            + spokes +
            f'<circle cx="{cx}" cy="{cy}" r="{hub_r:.1f}" fill="{spoke_color}"/>\n')

def svg_wrap(content, label, vb="0 0 200 130", w=200, h=130):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{w}" height="{h}">
{content}
  <text x="{w//2}" y="{h-4}" font-family="Arial,sans-serif" font-size="7" fill="#555" text-anchor="middle">{label}</text>
</svg>'''

# Rail helper
def rail(x1, x2, y=112):
    return f'<line x1="{x1}" y1="{y}" x2="{x2}" y2="{y}" stroke="#888" stroke-width="2.5"/>\n'

SVGS = {}

# ============================================================
# EARLY STEAM
# ============================================================

# 1. blenkinsop-rack (1812) - rack gear on rail, 0-4-0, dark brown
SVGS["blenkinsop-rack"] = svg_wrap(f'''
  <!-- boiler horizontal -->
  <rect x="40" y="48" width="90" height="32" rx="8" fill="#5C2A00"/>
  <rect x="125" y="56" width="25" height="20" rx="3" fill="#3a1a00"/>
  <!-- chimney tall tapered -->
  <rect x="55" y="20" width="14" height="30" rx="4" fill="#2a1400"/>
  <rect x="51" y="16" width="22" height="8" rx="3" fill="#1a0a00"/>
  <!-- smoke puffs -->
  <circle cx="62" cy="12" r="5" fill="#aaa" opacity="0.5"/>
  <circle cx="70" cy="9" r="4" fill="#aaa" opacity="0.35"/>
  <!-- rack gear on rail - key feature -->
  <rect x="30" y="108" width="140" height="5" rx="1" fill="#777"/>
  <rect x="30" y="113" width="140" height="3" rx="1" fill="#555"/>
  <!-- rack teeth -->
  {''.join(f'<rect x="{30+i*8}" y="107" width="4" height="7" fill="#444"/>' for i in range(18))}
  <!-- 4 drive wheels -->
  {wheel(65, 100, 11, "#8B6914", "#2C1A0E", "#8B6914")}
  {wheel(88, 100, 11, "#8B6914", "#2C1A0E", "#8B6914")}
  {wheel(111, 100, 11, "#8B6914", "#2C1A0E", "#8B6914")}
  {wheel(134, 100, 11, "#8B6914", "#2C1A0E", "#8B6914")}
  <!-- coupling rod -->
  <rect x="65" y="98" width="69" height="4" rx="2" fill="#8B6914" opacity="0.8"/>
  <!-- cab window -->
  <rect x="128" y="58" width="14" height="10" rx="2" fill="#87CEEB" opacity="0.7"/>
''', "Blenkinsop Rack · 1812")

# 2. catch-me-who-can (1808) - VERTICAL boiler, 0-2-0, Trevithick
SVGS["catch-me-who-can"] = svg_wrap(f'''
  <!-- vertical boiler - tall cylinder, key feature -->
  <rect x="75" y="30" width="36" height="58" rx="10" fill="#6B3A2A"/>
  <ellipse cx="93" cy="30" rx="18" ry="8" fill="#5a2e1e"/>
  <!-- chimney from top -->
  <rect x="88" y="10" width="10" height="22" rx="3" fill="#333"/>
  <rect x="84" y="7" width="18" height="7" rx="3" fill="#222"/>
  <!-- smoke -->
  <circle cx="93" cy="5" r="5" fill="#bbb" opacity="0.45"/>
  <!-- only 2 drive wheels, large -->
  {wheel(78, 100, 12, "#c87820", "#2a1800", "#c87820")}
  {wheel(108, 100, 12, "#c87820", "#2a1800", "#c87820")}
  <!-- elliptical track hint -->
  <ellipse cx="93" cy="115" rx="60" ry="6" fill="none" stroke="#888" stroke-width="2.5" stroke-dasharray="4,4"/>
  <!-- firebox -->
  <rect x="80" y="76" width="26" height="14" rx="3" fill="#8B4513"/>
  <!-- frame -->
  <rect x="60" y="88" width="66" height="6" rx="2" fill="#5C2A00"/>
''', "Catch Me Who Can · 1808")

# 3. planet-class (1830, UK) - inside cylinders, 2-2-0, green/black, tender
SVGS["planet-class"] = svg_wrap(f'''
  <!-- tender car right -->
  <rect x="145" y="58" width="45" height="35" rx="4" fill="#2a2a2a"/>
  <rect x="148" y="62" width="20" height="12" rx="2" fill="#555" opacity="0.6"/>
  {wheel(158, 103, 8, "#777", "#111", "#777")}
  {wheel(178, 103, 8, "#777", "#111", "#777")}
  <!-- coupling -->
  <rect x="138" y="70" width="10" height="4" rx="1" fill="#888"/>
  <!-- loco body green -->
  <rect x="45" y="52" width="95" height="38" rx="6" fill="#1a5c1a"/>
  <!-- boiler barrel -->
  <rect x="50" y="58" width="70" height="24" rx="8" fill="#1d6b1d"/>
  <!-- inside cylinder hint - visible box under boiler -->
  <rect x="60" y="78" width="30" height="10" rx="2" fill="#0f3d0f"/>
  <!-- 2 small pony, 2 large driver -->
  {wheel(52, 103, 7, "#c8a800", "#111", "#c8a800")}
  {wheel(70, 103, 7, "#c8a800", "#111", "#c8a800")}
  {wheel(100, 103, 12, "#c8a800", "#111", "#c8a800")}
  {wheel(127, 103, 12, "#c8a800", "#111", "#c8a800")}
  <!-- chimney copper cap -->
  <rect x="63" y="28" width="13" height="26" rx="3" fill="#1a1a1a"/>
  <rect x="59" y="24" width="21" height="7" rx="3" fill="#b87333"/>
  <!-- dome -->
  <ellipse cx="105" cy="55" rx="14" ry="8" fill="#115011"/>
  <!-- cab -->
  <rect x="125" y="52" width="22" height="38" rx="3" fill="#0f3d0f"/>
  <rect x="128" y="56" width="14" height="12" rx="2" fill="#87CEEB" opacity="0.6"/>
''', "Planet Class · 1830")

# 4. stourbridge-lion (1829, USA) - horizontal boiler BLUE with lion face, 0-4-0
SVGS["stourbridge-lion"] = svg_wrap(f'''
  <!-- main boiler horizontal BLUE -->
  <rect x="35" y="50" width="100" height="36" rx="10" fill="#1a3a8c"/>
  <!-- lion face on front (right side) -->
  <circle cx="130" cy="68" r="18" fill="#c8a020"/>
  <!-- lion eyes -->
  <circle cx="125" cy="64" r="3" fill="#1a1a1a"/>
  <circle cx="135" cy="64" r="3" fill="#1a1a1a"/>
  <!-- lion nose/mouth -->
  <ellipse cx="130" cy="72" rx="5" ry="3" fill="#8B4513"/>
  <path d="M125,73 Q130,78 135,73" stroke="#1a1a1a" stroke-width="1.5" fill="none"/>
  <!-- lion mane -->
  <circle cx="130" cy="68" r="20" fill="none" stroke="#c87820" stroke-width="4" opacity="0.6"/>
  <!-- chimney -->
  <rect x="50" y="20" width="15" height="32" rx="4" fill="#1a1a1a"/>
  <rect x="46" y="16" width="23" height="8" rx="3" fill="#444"/>
  <!-- smoke -->
  <circle cx="57" cy="11" r="5" fill="#bbb" opacity="0.4"/>
  <!-- 4 wheels 0-4-0 -->
  {wheel(58, 100, 11, "#c8a020", "#0d1e5c", "#c8a020")}
  {wheel(82, 100, 11, "#c8a020", "#0d1e5c", "#c8a020")}
  {wheel(106, 100, 11, "#c8a020", "#0d1e5c", "#c8a020")}
  <!-- coupling rod -->
  <rect x="58" y="98" width="48" height="4" rx="2" fill="#c8a020" opacity="0.8"/>
  <!-- frame -->
  <rect x="35" y="84" width="100" height="6" rx="2" fill="#0d1e5c"/>
  {rail(25, 175)}
''', "Stourbridge Lion · 1829")

# 5. tom-thumb (1830, USA) - tiny VERTICAL boiler, 0-2-2, very compact
SVGS["tom-thumb"] = svg_wrap(f'''
  <!-- very compact, tiny vertical boiler -->
  <rect x="72" y="40" width="30" height="45" rx="8" fill="#5C3A1E"/>
  <ellipse cx="87" cy="40" rx="15" ry="6" fill="#3a2010"/>
  <!-- thin chimney tall -->
  <rect x="83" y="12" width="8" height="30" rx="3" fill="#222"/>
  <rect x="79" y="9" width="16" height="6" rx="2" fill="#333"/>
  <!-- smoke small -->
  <circle cx="87" cy="7" r="4" fill="#ccc" opacity="0.4"/>
  <!-- water pump visible on side -->
  <rect x="65" y="55" width="10" height="18" rx="3" fill="#7B5030"/>
  <rect x="61" y="60" width="8" height="8" rx="2" fill="#5a3a1a"/>
  <!-- very compact frame -->
  <rect x="55" y="80" width="68" height="8" rx="3" fill="#3a2010"/>
  <!-- 2 small drive wheels + 2 small trailing -->
  {wheel(70, 102, 9, "#c87820", "#2a1800", "#c87820")}
  {wheel(92, 102, 9, "#c87820", "#2a1800", "#c87820")}
  {wheel(114, 102, 7, "#996010", "#1a1000", "#996010")}
  {wheel(130, 102, 7, "#996010", "#1a1000", "#996010")}
  {rail(45, 160)}
''', "Tom Thumb · 1830")

# 6. dewitt-clinton (1831, USA) - tall funnel chimney, 2-2-0, coach carriages
SVGS["dewitt-clinton"] = svg_wrap(f'''
  <!-- coach carriage trailing - stagecoach style -->
  <rect x="130" y="62" width="55" height="32" rx="5" fill="#8B4513"/>
  <rect x="134" y="66" width="14" height="12" rx="2" fill="#87CEEB" opacity="0.6"/>
  <rect x="153" y="66" width="14" height="12" rx="2" fill="#87CEEB" opacity="0.6"/>
  {wheel(142, 105, 8, "#c8a820", "#3a1a00", "#c8a820")}
  {wheel(170, 105, 8, "#c8a820", "#3a1a00", "#c8a820")}
  <!-- coupling between loco and coach -->
  <rect x="120" y="72" width="15" height="4" rx="1" fill="#666"/>
  <!-- loco body black -->
  <rect x="30" y="58" width="95" height="36" rx="5" fill="#1a1a1a"/>
  <!-- boiler barrel -->
  <rect x="35" y="63" width="65" height="24" rx="7" fill="#2a2a2a"/>
  <!-- very tall funnel chimney - key feature -->
  <rect x="48" y="18" width="12" height="42" rx="3" fill="#111"/>
  <!-- flared top - very prominent -->
  <path d="M42,20 Q44,14 54,12 Q64,14 66,20 Z" fill="#111"/>
  <rect x="42" y="12" width="24" height="8" rx="3" fill="#222"/>
  <!-- smoke puffs -->
  <circle cx="54" cy="8" r="5" fill="#ddd" opacity="0.5"/>
  <circle cx="62" cy="6" r="4" fill="#ddd" opacity="0.35"/>
  <!-- 2 small pony + 2 drive wheels, 2-2-0 -->
  {wheel(50, 105, 7, "#888", "#111", "#888")}
  {wheel(68, 105, 7, "#888", "#111", "#888")}
  {wheel(95, 105, 11, "#888", "#111", "#888")}
  {wheel(118, 105, 11, "#888", "#111", "#888")}
  <!-- cab area -->
  <rect x="98" y="58" width="28" height="36" rx="3" fill="#2a2a2a"/>
  {rail(20, 190)}
''', "DeWitt Clinton · 1831")

# 7. best-friend-charleston (1830, USA) - barrel-shaped VERTICAL boiler (fat cylinder), 0-4-0
SVGS["best-friend-charleston"] = svg_wrap(f'''
  <!-- fat barrel vertical boiler - very round, key feature -->
  <ellipse cx="85" cy="68" rx="30" ry="32" fill="#5a1a00"/>
  <!-- boiler bands -->
  <ellipse cx="85" cy="55" rx="30" ry="5" fill="none" stroke="#3a1000" stroke-width="2"/>
  <ellipse cx="85" cy="70" rx="30" ry="5" fill="none" stroke="#3a1000" stroke-width="2"/>
  <ellipse cx="85" cy="82" rx="29" ry="4" fill="none" stroke="#3a1000" stroke-width="2"/>
  <!-- firebox at base -->
  <rect x="68" y="88" width="34" height="12" rx="3" fill="#8B2500"/>
  <!-- thin chimney from center top -->
  <rect x="81" y="16" width="8" height="24" rx="2" fill="#222"/>
  <rect x="77" y="13" width="16" height="7" rx="3" fill="#333"/>
  <!-- smoke -->
  <circle cx="85" cy="10" r="4" fill="#ccc" opacity="0.4"/>
  <!-- frame -->
  <rect x="35" y="94" width="110" height="7" rx="3" fill="#3a1000"/>
  <!-- 4 wheels 0-4-0 - all same size -->
  {wheel(52, 108, 10, "#c87820", "#2a0e00", "#c87820")}
  {wheel(75, 108, 10, "#c87820", "#2a0e00", "#c87820")}
  {wheel(98, 108, 10, "#c87820", "#2a0e00", "#c87820")}
  {wheel(121, 108, 10, "#c87820", "#2a0e00", "#c87820")}
  <!-- coupling rod -->
  <rect x="52" y="106" width="69" height="4" rx="2" fill="#c87820" opacity="0.8"/>
  {rail(30, 170)}
''', "Best Friend Charleston · 1830")

# ============================================================
# AMERICAN STEAM 1860-1940
# ============================================================

# 8. mogul-2-6-0 - 1 small pony + 3 large drivers
SVGS["mogul-2-6-0"] = svg_wrap(f'''
  <!-- boiler -->
  <rect x="30" y="52" width="115" height="34" rx="8" fill="#1a1a1a"/>
  <rect x="35" y="58" width="80" height="22" rx="7" fill="#2a2a2a"/>
  <!-- cab -->
  <rect x="130" y="44" width="38" height="42" rx="4" fill="#1a1a1a"/>
  <rect x="133" y="48" width="16" height="14" rx="2" fill="#87CEEB" opacity="0.6"/>
  <!-- chimney -->
  <rect x="42" y="22" width="14" height="32" rx="4" fill="#111"/>
  <rect x="38" y="18" width="22" height="8" rx="3" fill="#333"/>
  <!-- smoke box -->
  <circle cx="37" cy="66" r="15" fill="#111"/>
  <!-- dome + sandbox -->
  <ellipse cx="95" cy="54" rx="14" ry="9" fill="#1a1a1a"/>
  <ellipse cx="115" cy="57" rx="10" ry="7" fill="#1a1a1a"/>
  <!-- 1 small pony + 3 large drivers, 2-6-0 -->
  {wheel(48, 103, 7, "#777", "#111", "#777")}
  {wheel(75, 103, 12, "#777", "#111", "#777")}
  {wheel(100, 103, 12, "#777", "#111", "#777")}
  {wheel(125, 103, 12, "#777", "#111", "#777")}
  <!-- coupling rod on drivers -->
  <rect x="75" y="101" width="50" height="4" rx="2" fill="#666" opacity="0.8"/>
  <!-- steam pipes -->
  <line x1="50" y2="65" x1="50" x2="75" y2="65" stroke="#555" stroke-width="3"/>
  {rail(20, 185)}
''', "Mogul 2-6-0 · 1860")

# 9. consolidation-2-8-0 - 1 small + 4 large drivers, boxy cab
SVGS["consolidation-2-8-0"] = svg_wrap(f'''
  <rect x="20" y="52" width="140" height="34" rx="7" fill="#111"/>
  <rect x="25" y="58" width="95" height="22" rx="7" fill="#1e1e1e"/>
  <!-- boxy cab -->
  <rect x="148" y="44" width="35" height="42" rx="3" fill="#111"/>
  <rect x="151" y="48" width="14" height="14" rx="2" fill="#87CEEB" opacity="0.6"/>
  <!-- chimney straight -->
  <rect x="32" y="18" width="14" height="36" rx="3" fill="#0d0d0d"/>
  <rect x="28" y="14" width="22" height="8" rx="2" fill="#222"/>
  <!-- smokebox -->
  <circle cx="26" cy="67" r="16" fill="#0d0d0d"/>
  <!-- dome -->
  <ellipse cx="105" cy="54" rx="14" ry="9" fill="#0d0d0d"/>
  <!-- 1 small pony + 4 large drivers, 2-8-0 -->
  {wheel(38, 102, 7, "#666", "#111", "#666")}
  {wheel(65, 102, 12, "#666", "#111", "#666")}
  {wheel(88, 102, 12, "#666", "#111", "#666")}
  {wheel(111, 102, 12, "#666", "#111", "#666")}
  {wheel(134, 102, 12, "#666", "#111", "#666")}
  <!-- coupling rod -->
  <rect x="65" y="100" width="69" height="4" rx="2" fill="#555" opacity="0.8"/>
  {rail(10, 190)}
''', "Consolidation 2-8-0 · 1866")

# 10. ten-wheeler-4-6-0 - 2 small + 3 large drivers, slender
SVGS["ten-wheeler-4-6-0"] = svg_wrap(f'''
  <!-- slender boiler -->
  <rect x="20" y="55" width="135" height="30" rx="8" fill="#111"/>
  <rect x="28" y="60" width="90" height="20" rx="7" fill="#1e1e1e"/>
  <!-- cab -->
  <rect x="140" y="47" width="38" height="38" rx="4" fill="#111"/>
  <rect x="143" y="51" width="15" height="13" rx="2" fill="#87CEEB" opacity="0.6"/>
  <!-- slender chimney -->
  <rect x="35" y="20" width="12" height="37" rx="4" fill="#0d0d0d"/>
  <rect x="31" y="16" width="20" height="7" rx="3" fill="#333"/>
  <!-- smokebox round -->
  <circle cx="24" cy="68" r="15" fill="#0d0d0d"/>
  <!-- dome -->
  <ellipse cx="100" cy="57" rx="13" ry="8" fill="#0d0d0d"/>
  <!-- 2 small pony + 3 large, 4-6-0 -->
  {wheel(34, 101, 7, "#777", "#111", "#777")}
  {wheel(54, 101, 7, "#777", "#111", "#777")}
  {wheel(80, 101, 12, "#777", "#111", "#777")}
  {wheel(103, 101, 12, "#777", "#111", "#777")}
  {wheel(126, 101, 12, "#777", "#111", "#777")}
  <!-- coupling rod -->
  <rect x="80" y="99" width="46" height="4" rx="2" fill="#555" opacity="0.8"/>
  {rail(10, 190)}
''', "Ten-Wheeler 4-6-0 · 1870")

# 11. mikado-2-8-2 - 1 small + 4 large + 1 small trailing
SVGS["mikado-2-8-2"] = svg_wrap(f'''
  <rect x="18" y="52" width="148" height="34" rx="7" fill="#111"/>
  <rect x="24" y="58" width="100" height="22" rx="7" fill="#1e1e1e"/>
  <rect x="152" y="44" width="36" height="42" rx="4" fill="#0d0d0d"/>
  <rect x="155" y="48" width="14" height="14" rx="2" fill="#87CEEB" opacity="0.6"/>
  <rect x="30" y="18" width="13" height="36" rx="3" fill="#0d0d0d"/>
  <rect x="26" y="14" width="21" height="8" rx="2" fill="#222"/>
  <circle cx="22" cy="67" r="16" fill="#0d0d0d"/>
  <ellipse cx="110" cy="54" rx="13" ry="9" fill="#0d0d0d"/>
  <!-- 1 pony + 4 drivers + 1 trailing = 2-8-2 -->
  {wheel(36, 101, 7, "#666", "#111", "#666")}
  {wheel(62, 101, 12, "#666", "#111", "#666")}
  {wheel(84, 101, 12, "#666", "#111", "#666")}
  {wheel(106, 101, 12, "#666", "#111", "#666")}
  {wheel(128, 101, 12, "#666", "#111", "#666")}
  {wheel(155, 101, 8, "#666", "#111", "#666")}
  <rect x="62" y="99" width="66" height="4" rx="2" fill="#555" opacity="0.8"/>
  {rail(10, 192)}
''', "Mikado 2-8-2 · 1897")

# 12. atlantic-4-4-2 - 2 small + 2 large + 1 trailing, elegant long
SVGS["atlantic-4-4-2"] = svg_wrap(f'''
  <!-- elegant long boiler -->
  <rect x="18" y="54" width="145" height="30" rx="10" fill="#111"/>
  <rect x="26" y="60" width="100" height="19" rx="8" fill="#1a1a1a"/>
  <!-- slender elegant chimney -->
  <rect x="30" y="20" width="11" height="36" rx="4" fill="#0d0d0d"/>
  <rect x="26" y="16" width="19" height="7" rx="3" fill="#333"/>
  <circle cx="22" cy="67" r="14" fill="#0d0d0d"/>
  <ellipse cx="105" cy="56" rx="12" ry="8" fill="#0d0d0d"/>
  <rect x="148" y="47" width="35" height="37" rx="4" fill="#0d0d0d"/>
  <rect x="151" y="51" width="13" height="13" rx="2" fill="#87CEEB" opacity="0.6"/>
  <!-- 2+2+1 = 4-4-2 -->
  {wheel(36, 100, 7, "#888", "#111", "#888")}
  {wheel(55, 100, 7, "#888", "#111", "#888")}
  {wheel(82, 100, 13, "#888", "#111", "#888")}
  {wheel(108, 100, 13, "#888", "#111", "#888")}
  {wheel(150, 100, 9, "#888", "#111", "#888")}
  <rect x="82" y="98" width="26" height="4" rx="2" fill="#555" opacity="0.8"/>
  {rail(10, 192)}
''', "Atlantic 4-4-2 · 1900")

# 13. berkshire-2-8-4 - 1 small + 4 large + 2 trailing, LARGE firebox/boiler
SVGS["berkshire-2-8-4"] = svg_wrap(f'''
  <!-- LARGE boiler, wide firebox rear -->
  <rect x="14" y="48" width="155" height="40" rx="8" fill="#111"/>
  <rect x="20" y="55" width="100" height="26" rx="8" fill="#1e1e1e"/>
  <!-- wide firebox -->
  <rect x="120" y="44" width="50" height="44" rx="5" fill="#0d0d0d"/>
  <!-- cab on top of firebox -->
  <rect x="155" y="36" width="36" height="52" rx="4" fill="#0d0d0d"/>
  <rect x="158" y="40" width="14" height="15" rx="2" fill="#87CEEB" opacity="0.6"/>
  <rect x="26" y="14" width="14" height="36" rx="3" fill="#0d0d0d"/>
  <rect x="22" y="10" width="22" height="8" rx="2" fill="#333"/>
  <circle cx="18" cy="65" r="17" fill="#0d0d0d"/>
  <ellipse cx="100" cy="50" rx="14" ry="10" fill="#0d0d0d"/>
  <!-- 1 pony + 4 drivers + 2 trailing -->
  {wheel(32, 101, 7, "#666", "#111", "#666")}
  {wheel(55, 101, 12, "#666", "#111", "#666")}
  {wheel(76, 101, 12, "#666", "#111", "#666")}
  {wheel(97, 101, 12, "#666", "#111", "#666")}
  {wheel(118, 101, 12, "#666", "#111", "#666")}
  {wheel(144, 101, 9, "#666", "#111", "#666")}
  {wheel(163, 101, 9, "#666", "#111", "#666")}
  <rect x="55" y="99" width="63" height="4" rx="2" fill="#555" opacity="0.8"/>
  {rail(8, 195)}
''', "Berkshire 2-8-4 · 1925")

# 14. hudson-4-6-4 - STREAMLINED silver/gray shroud, NYC colors
SVGS["hudson-4-6-4"] = svg_wrap(f'''
  <!-- streamlined shroud silver -->
  <path d="M15,68 Q25,38 45,34 L170,34 L175,68 L170,102 L45,102 Q25,98 15,68 Z" fill="#C0C0C0"/>
  <path d="M15,68 Q22,50 45,46 L45,90 Q22,86 15,68 Z" fill="#999" opacity="0.5"/>
  <!-- NYC stripe -->
  <rect x="45" y="62" width="130" height="12" fill="#1a1a1a" opacity="0.5"/>
  <!-- windows -->
  <rect x="140" y="40" width="16" height="14" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- headlight -->
  <circle cx="18" cy="68" r="7" fill="#FFE040" opacity="0.9"/>
  <!-- 2+3+2 = 4-6-4 -->
  {wheel(38, 108, 8, "#aaa", "#888", "#aaa")}
  {wheel(57, 108, 8, "#aaa", "#888", "#aaa")}
  {wheel(80, 108, 12, "#aaa", "#888", "#aaa")}
  {wheel(103, 108, 12, "#aaa", "#888", "#aaa")}
  {wheel(126, 108, 12, "#aaa", "#888", "#aaa")}
  {wheel(152, 108, 9, "#aaa", "#888", "#aaa")}
  {wheel(170, 108, 9, "#aaa", "#888", "#aaa")}
  <rect x="80" y="106" width="46" height="4" rx="2" fill="#888" opacity="0.8"/>
  {rail(10, 195)}
''', "Hudson 4-6-4 · 1927")

# 15. texas-2-10-4 - 1 small + 5 HUGE drivers + 2 trailing, MASSIVE wide firebox
SVGS["texas-2-10-4"] = svg_wrap(f'''
  <!-- massive boiler -->
  <rect x="10" y="48" width="165" height="42" rx="8" fill="#111"/>
  <rect x="16" y="54" width="110" height="28" rx="8" fill="#1a1a1a"/>
  <!-- WIDE firebox rear -->
  <rect x="118" y="40" width="58" height="50" rx="5" fill="#0d0d0d"/>
  <rect x="162" y="32" width="28" height="58" rx="4" fill="#0d0d0d"/>
  <rect x="165" y="36" width="12" height="15" rx="2" fill="#87CEEB" opacity="0.6"/>
  <rect x="22" y="12" width="15" height="38" rx="3" fill="#0d0d0d"/>
  <rect x="18" y="8" width="23" height="9" rx="2" fill="#333"/>
  <circle cx="14" cy="67" r="17" fill="#0d0d0d"/>
  <ellipse cx="92" cy="50" rx="13" ry="9" fill="#0d0d0d"/>
  <!-- 1 pony + 5 huge drivers + 2 trailing -->
  {wheel(28, 103, 7, "#666", "#111", "#666")}
  {wheel(50, 103, 13, "#666", "#111", "#666")}
  {wheel(70, 103, 13, "#666", "#111", "#666")}
  {wheel(90, 103, 13, "#666", "#111", "#666")}
  {wheel(110, 103, 13, "#666", "#111", "#666")}
  {wheel(130, 103, 13, "#666", "#111", "#666")}
  {wheel(154, 103, 9, "#666", "#111", "#666")}
  {wheel(173, 103, 9, "#666", "#111", "#666")}
  <rect x="50" y="101" width="80" height="4" rx="2" fill="#555" opacity="0.8"/>
  {rail(5, 198)}
''', "Texas 2-10-4 · 1925")

# 16. challenger-4-6-6-4 - UP gray/yellow, articulated joint visible
SVGS["challenger-4-6-6-4"] = svg_wrap(f'''
  <!-- UP gray body -->
  <rect x="8" y="50" width="180" height="40" rx="8" fill="#7a7a7a"/>
  <!-- articulation joint - key feature, slight S curve in body -->
  <line x1="96" y1="48" x2="96" y2="94" stroke="#555" stroke-width="3" stroke-dasharray="3,2"/>
  <rect x="93" y="50" width="6" height="40" fill="#666"/>
  <!-- front unit boiler -->
  <rect x="14" y="55" width="80" height="28" rx="7" fill="#898989"/>
  <!-- rear unit boiler -->
  <rect x="100" y="55" width="78" height="28" rx="7" fill="#898989"/>
  <!-- cab -->
  <rect x="166" y="42" width="32" height="48" rx="4" fill="#6a6a6a"/>
  <rect x="169" y="46" width="13" height="14" rx="2" fill="#87CEEB" opacity="0.6"/>
  <!-- chimney front -->
  <rect x="22" y="16" width="14" height="36" rx="4" fill="#555"/>
  <rect x="18" y="12" width="22" height="8" rx="2" fill="#666"/>
  <!-- yellow UP stripe -->
  <rect x="8" y="62" width="180" height="8" fill="#FFD700" opacity="0.8"/>
  <!-- smokebox -->
  <circle cx="12" cy="68" r="16" fill="#555"/>
  <!-- 2+3+3+2 = 4-6-6-4 -->
  {wheel(22, 103, 8, "#FFD700", "#555", "#FFD700")}
  {wheel(42, 103, 8, "#FFD700", "#555", "#FFD700")}
  {wheel(62, 103, 12, "#FFD700", "#555", "#FFD700")}
  {wheel(80, 103, 12, "#FFD700", "#555", "#FFD700")}
  {wheel(98, 103, 12, "#FFD700", "#555", "#FFD700")}
  {wheel(116, 103, 12, "#FFD700", "#555", "#FFD700")}
  {wheel(134, 103, 12, "#FFD700", "#555", "#FFD700")}
  {wheel(152, 103, 12, "#FFD700", "#555", "#FFD700")}
  {wheel(170, 103, 8, "#FFD700", "#555", "#FFD700")}
  {wheel(185, 103, 8, "#FFD700", "#555", "#FFD700")}
  {rail(5, 198)}
''', "Challenger 4-6-6-4 · 1936")

# 17. hiawatha-class-a - Art Deco teardrop, 4-4-2, orange/gray
SVGS["hiawatha-class-a"] = svg_wrap(f'''
  <!-- ART DECO teardrop streamlined nose -->
  <path d="M12,68 C12,40 30,30 55,28 L175,28 L175,108 L55,108 C30,106 12,96 12,68 Z" fill="#C0C0C0"/>
  <!-- orange band -->
  <rect x="55" y="58" width="120" height="20" fill="#FF6600"/>
  <path d="M12,68 C12,58 28,52 55,58 L55,78 C28,84 12,78 12,68 Z" fill="#FF6600"/>
  <!-- black top stripe -->
  <rect x="55" y="28" width="120" height="15" fill="#1a1a1a"/>
  <path d="M30,28 C20,30 14,40 12,55 L12,48 C16,34 26,28 40,26 Z" fill="#1a1a1a"/>
  <!-- cab windows -->
  <rect x="148" y="34" width="16" height="14" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- headlight round -->
  <circle cx="16" cy="68" r="8" fill="#FFE040" opacity="0.9"/>
  <!-- 2+2+1 = 4-4-2 -->
  {wheel(48, 112, 8, "#CC5500", "#888", "#CC5500")}
  {wheel(67, 112, 8, "#CC5500", "#888", "#CC5500")}
  {wheel(95, 112, 13, "#CC5500", "#888", "#CC5500")}
  {wheel(120, 112, 13, "#CC5500", "#888", "#CC5500")}
  {wheel(152, 112, 9, "#CC5500", "#888", "#CC5500")}
  <rect x="95" y="110" width="25" height="4" rx="2" fill="#CC5500" opacity="0.8"/>
  {rail(10, 195)}
''', "Hiawatha Class A · 1935")

# 18. prr-k4s-pacific - 2+3+1, Tuscan RED, Belpaire firebox
SVGS["prr-k4s-pacific"] = svg_wrap(f'''
  <!-- Tuscan red body -->
  <rect x="18" y="50" width="148" height="36" rx="7" fill="#8B0000"/>
  <rect x="24" y="56" width="100" height="24" rx="7" fill="#9B1010"/>
  <!-- Belpaire firebox - trapezoidal top, key feature -->
  <polygon points="118,44 168,44 172,50 114,50" fill="#6a0000"/>
  <rect x="118" y="44" width="54" height="42" rx="0" fill="#700000"/>
  <!-- cab -->
  <rect x="158" y="38" width="32" height="48" rx="3" fill="#6a0000"/>
  <rect x="161" y="42" width="13" height="14" rx="2" fill="#87CEEB" opacity="0.6"/>
  <rect x="28" y="16" width="13" height="36" rx="3" fill="#4a0000"/>
  <rect x="24" y="12" width="21" height="8" rx="2" fill="#600000"/>
  <circle cx="22" cy="66" r="16" fill="#4a0000"/>
  <ellipse cx="108" cy="52" rx="13" ry="9" fill="#6a0000"/>
  <!-- PRR keystone on cab -->
  <polygon points="170,46 176,50 176,62 170,66 164,62 164,50" fill="#FFD700" opacity="0.8"/>
  <!-- 2+3+1 = 4-6-2 -->
  {wheel(34, 101, 8, "#FFD700", "#4a0000", "#FFD700")}
  {wheel(54, 101, 8, "#FFD700", "#4a0000", "#FFD700")}
  {wheel(80, 101, 13, "#FFD700", "#4a0000", "#FFD700")}
  {wheel(103, 101, 13, "#FFD700", "#4a0000", "#FFD700")}
  {wheel(126, 101, 13, "#FFD700", "#4a0000", "#FFD700")}
  {wheel(158, 101, 9, "#FFD700", "#4a0000", "#FFD700")}
  <rect x="80" y="99" width="46" height="4" rx="2" fill="#c8a800" opacity="0.8"/>
  {rail(10, 195)}
''', "PRR K4s Pacific · 1914")

# 19. 20th-century-limited - fully streamlined gray aluminum, 4-6-4
SVGS["20th-century-limited"] = svg_wrap(f'''
  <!-- full aluminum shroud streamlined -->
  <path d="M12,68 Q22,36 50,32 L178,32 L182,68 L178,104 L50,104 Q22,100 12,68 Z" fill="#D8D8D8"/>
  <!-- NYC gray stripe -->
  <path d="M50,52 L178,52 L178,84 L50,84 Q30,80 18,68 Q30,56 50,52 Z" fill="#A8A8A8"/>
  <!-- black nose accent -->
  <path d="M12,68 Q18,52 34,48 L34,88 Q18,84 12,68 Z" fill="#111" opacity="0.5"/>
  <!-- cab window -->
  <rect x="148" y="38" width="18" height="15" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- Century lettering band -->
  <rect x="50" y="62" width="128" height="12" fill="#888" opacity="0.4"/>
  <!-- headlight -->
  <circle cx="15" cy="68" r="8" fill="#FFE040" opacity="0.9"/>
  <!-- 4-6-4 -->
  {wheel(44, 108, 8, "#C0C0C0", "#888", "#C0C0C0")}
  {wheel(62, 108, 8, "#C0C0C0", "#888", "#C0C0C0")}
  {wheel(86, 108, 13, "#C0C0C0", "#888", "#C0C0C0")}
  {wheel(109, 108, 13, "#C0C0C0", "#888", "#C0C0C0")}
  {wheel(132, 108, 13, "#C0C0C0", "#888", "#C0C0C0")}
  {wheel(158, 108, 9, "#C0C0C0", "#888", "#C0C0C0")}
  {wheel(175, 108, 9, "#C0C0C0", "#888", "#C0C0C0")}
  {rail(10, 196)}
''', "20th Century Limited · 1938")

# 20. broadway-limited - streamlined Tuscan red, T1 style
SVGS["broadway-limited"] = svg_wrap(f'''
  <path d="M14,68 Q28,36 52,32 L176,32 L180,68 L176,104 L52,104 Q28,100 14,68 Z" fill="#8B0000"/>
  <!-- gold stripe -->
  <path d="M52,56 L176,56 L176,80 L52,80 Q34,76 18,68 Q34,60 52,56 Z" fill="#C09000"/>
  <!-- dark maroon shroud sides -->
  <path d="M14,68 Q24,52 42,50 L42,86 Q24,84 14,68 Z" fill="#600000" opacity="0.7"/>
  <rect x="148" y="38" width="18" height="15" rx="2" fill="#87CEEB" opacity="0.7"/>
  <circle cx="16" cy="68" r="8" fill="#FFE040" opacity="0.9"/>
  <!-- 4-6-4 -->
  {wheel(46, 108, 8, "#C09000", "#600000", "#C09000")}
  {wheel(64, 108, 8, "#C09000", "#600000", "#C09000")}
  {wheel(88, 108, 13, "#C09000", "#600000", "#C09000")}
  {wheel(111, 108, 13, "#C09000", "#600000", "#C09000")}
  {wheel(134, 108, 13, "#C09000", "#600000", "#C09000")}
  {wheel(160, 108, 9, "#C09000", "#600000", "#C09000")}
  {wheel(177, 108, 9, "#C09000", "#600000", "#C09000")}
  {rail(10, 195)}
''', "Broadway Limited · 1938")

# 21. california-zephyr - VISTA-DOME stainless steel, diesel + dome car
SVGS["california-zephyr"] = svg_wrap(f'''
  <!-- diesel loco front -->
  <rect x="8" y="48" width="65" height="55" rx="5" fill="#C8C8C8"/>
  <path d="M8,75 Q8,48 20,46 L73,46 L73,103 L8,103 Z" fill="#DCDCDC"/>
  <!-- diesel nose stripes -->
  <rect x="8" y="72" width="65" height="8" fill="#CC0000"/>
  <!-- diesel windows -->
  <rect x="14" y="52" width="20" height="14" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- stainless passenger cars -->
  <rect x="76" y="52" width="55" height="51" rx="3" fill="#C8C8C8"/>
  <rect x="134" y="52" width="55" height="51" rx="3" fill="#C8C8C8"/>
  <!-- VISTA-DOME car - raised dome, key feature -->
  <rect x="76" y="38" width="50" height="20" rx="4" fill="#D8D8D8"/>
  <rect x="80" y="34" width="42" height="10" rx="3" fill="#e8e8e8"/>
  <!-- dome windows -->
  <rect x="82" y="36" width="8" height="6" rx="1" fill="#87CEEB" opacity="0.8"/>
  <rect x="94" y="36" width="8" height="6" rx="1" fill="#87CEEB" opacity="0.8"/>
  <rect x="106" y="36" width="8" height="6" rx="1" fill="#87CEEB" opacity="0.8"/>
  <!-- car windows -->
  <rect x="80" y="60" width="10" height="8" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="95" y="60" width="10" height="8" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="110" y="60" width="10" height="8" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="138" y="60" width="10" height="8" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="153" y="60" width="10" height="8" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="168" y="60" width="10" height="8" rx="1" fill="#87CEEB" opacity="0.6"/>
  <!-- silver stripe -->
  <rect x="76" y="72" width="113" height="6" fill="#999"/>
  <!-- bogies -->
  {wheel(24, 111, 7, "#888", "#aaa", "#888")}
  {wheel(48, 111, 7, "#888", "#aaa", "#888")}
  {wheel(90, 111, 7, "#aaa", "#bbb", "#aaa")}
  {wheel(110, 111, 7, "#aaa", "#bbb", "#aaa")}
  {wheel(148, 111, 7, "#aaa", "#bbb", "#aaa")}
  {wheel(168, 111, 7, "#aaa", "#bbb", "#aaa")}
  {rail(5, 198)}
''', "California Zephyr · 1949")

# 22. orient-express - dark BLUE Wagon-Lits + GOLD trim, steam front
SVGS["orient-express"] = svg_wrap(f'''
  <!-- steam loco front compact -->
  <rect x="8" y="55" width="60" height="38" rx="6" fill="#1a1a1a"/>
  <rect x="12" y="60" width="40" height="26" rx="6" fill="#2a2a2a"/>
  <rect x="16" y="26" width="11" height="31" rx="3" fill="#111"/>
  <rect x="13" y="22" width="17" height="7" rx="3" fill="#333"/>
  <circle cx="12" cy="72" r="14" fill="#111"/>
  <!-- Wagon-Lits dark blue carriages with gold -->
  <rect x="70" y="46" width="65" height="47" rx="4" fill="#00205B"/>
  <rect x="138" y="46" width="55" height="47" rx="4" fill="#00205B"/>
  <!-- gold letterboard stripe -->
  <rect x="70" y="52" width="65" height="8" fill="#C8A800"/>
  <rect x="138" y="52" width="55" height="8" fill="#C8A800"/>
  <!-- gold lower stripe -->
  <rect x="70" y="82" width="65" height="5" fill="#C8A800"/>
  <rect x="138" y="82" width="55" height="5" fill="#C8A800"/>
  <!-- car windows -->
  <rect x="74" y="62" width="9" height="12" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="88" y="62" width="9" height="12" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="102" y="62" width="9" height="12" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="116" y="62" width="9" height="12" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="142" y="62" width="9" height="12" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="156" y="62" width="9" height="12" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="170" y="62" width="9" height="12" rx="1" fill="#87CEEB" opacity="0.6"/>
  <!-- couplings -->
  <rect x="67" y="68" width="6" height="5" rx="1" fill="#888"/>
  <rect x="135" y="68" width="6" height="5" rx="1" fill="#888"/>
  <!-- loco wheels -->
  {wheel(22, 103, 8, "#888", "#111", "#888")}
  {wheel(42, 103, 8, "#888", "#111", "#888")}
  {wheel(60, 103, 11, "#888", "#111", "#888")}
  <!-- car bogies -->
  {wheel(84, 103, 7, "#C8A800", "#00205B", "#C8A800")}
  {wheel(110, 103, 7, "#C8A800", "#00205B", "#C8A800")}
  {wheel(148, 103, 7, "#C8A800", "#00205B", "#C8A800")}
  {wheel(172, 103, 7, "#C8A800", "#00205B", "#C8A800")}
  {rail(5, 198)}
''', "Orient Express · 1883")

print("Early steam + American steam batch: OK")

# ============================================================
# BRITISH STEAM
# ============================================================

# 23. castle-class-gwr
SVGS["castle-class-gwr"] = svg_wrap(f'''
  <rect x="18" y="52" width="148" height="34" rx="7" fill="#1B5E20"/>
  <rect x="24" y="58" width="98" height="22" rx="7" fill="#2E7D32"/>
  <rect x="30" y="18" width="13" height="36" rx="3" fill="#1a1a1a"/>
  <rect x="26" y="14" width="21" height="8" rx="3" fill="#b87333"/>
  <circle cx="22" cy="67" r="16" fill="#1B5E20"/>
  <ellipse cx="90" cy="54" rx="13" ry="9" fill="#1B5E20"/>
  <circle cx="90" cy="54" r="8" fill="#b87333"/>
  <circle cx="90" cy="54" r="5" fill="#1B5E20"/>
  <rect x="148" y="45" width="36" height="41" rx="4" fill="#1a4c1a"/>
  <rect x="151" y="49" width="14" height="14" rx="2" fill="#87CEEB" opacity="0.6"/>
  <rect x="25" y="78" width="120" height="5" fill="#CC0000"/>
  {wheel(34, 101, 8, "#b87333", "#1B5E20", "#b87333")}
  {wheel(54, 101, 8, "#b87333", "#1B5E20", "#b87333")}
  {wheel(80, 101, 13, "#b87333", "#1B5E20", "#b87333")}
  {wheel(103, 101, 13, "#b87333", "#1B5E20", "#b87333")}
  {wheel(126, 101, 13, "#b87333", "#1B5E20", "#b87333")}
  <rect x="80" y="99" width="46" height="4" rx="2" fill="#b87333" opacity="0.8"/>
  {rail(10, 195)}
''', "Castle Class GWR · 1923")

# 24. king-class-gwr
SVGS["king-class-gwr"] = svg_wrap(f'''
  <rect x="16" y="48" width="152" height="40" rx="8" fill="#1B5E20"/>
  <rect x="22" y="54" width="102" height="26" rx="8" fill="#2E7D32"/>
  <rect x="30" y="14" width="15" height="36" rx="3" fill="#1a1a1a"/>
  <rect x="26" y="10" width="23" height="8" rx="3" fill="#b87333"/>
  <circle cx="20" cy="67" r="18" fill="#1B5E20"/>
  <ellipse cx="92" cy="52" rx="15" ry="10" fill="#1B5E20"/>
  <rect x="24" y="75" width="130" height="7" fill="#CC0000"/>
  <rect x="150" y="43" width="36" height="45" rx="4" fill="#1a4c1a"/>
  <rect x="153" y="47" width="14" height="15" rx="2" fill="#87CEEB" opacity="0.6"/>
  {wheel(34, 103, 9, "#b87333", "#1B5E20", "#b87333")}
  {wheel(55, 103, 9, "#b87333", "#1B5E20", "#b87333")}
  {wheel(82, 103, 14, "#b87333", "#1B5E20", "#b87333")}
  {wheel(106, 103, 14, "#b87333", "#1B5E20", "#b87333")}
  {wheel(130, 103, 14, "#b87333", "#1B5E20", "#b87333")}
  <rect x="82" y="101" width="48" height="4" rx="2" fill="#b87333" opacity="0.8"/>
  {rail(8, 195)}
''', "King Class GWR · 1927")

# 25. gresley-a3-pacific
SVGS["gresley-a3-pacific"] = svg_wrap(f'''
  <rect x="18" y="50" width="148" height="36" rx="8" fill="#4a7c20"/>
  <rect x="24" y="56" width="100" height="24" rx="8" fill="#5a9030"/>
  <rect x="28" y="16" width="13" height="36" rx="3" fill="#1a1a1a"/>
  <rect x="24" y="12" width="21" height="8" rx="3" fill="#333"/>
  <circle cx="22" cy="67" r="16" fill="#3a6010"/>
  <ellipse cx="95" cy="52" rx="14" ry="9" fill="#3a6010"/>
  <ellipse cx="115" cy="56" rx="10" ry="7" fill="#3a6010"/>
  <rect x="22" y="78" width="110" height="6" fill="#333"/>
  <rect x="148" y="44" width="36" height="42" rx="4" fill="#3a6010"/>
  <rect x="151" y="48" width="14" height="14" rx="2" fill="#87CEEB" opacity="0.6"/>
  {wheel(34, 101, 8, "#c8c820", "#1a3000", "#c8c820")}
  {wheel(54, 101, 8, "#c8c820", "#1a3000", "#c8c820")}
  {wheel(80, 101, 13, "#c8c820", "#1a3000", "#c8c820")}
  {wheel(103, 101, 13, "#c8c820", "#1a3000", "#c8c820")}
  {wheel(126, 101, 13, "#c8c820", "#1a3000", "#c8c820")}
  {wheel(155, 101, 9, "#c8c820", "#1a3000", "#c8c820")}
  <rect x="80" y="99" width="46" height="4" rx="2" fill="#c8c820" opacity="0.7"/>
  {rail(10, 195)}
''', "Gresley A3 Pacific · 1928")

# 26. duchess-class-lms
SVGS["duchess-class-lms"] = svg_wrap(f'''
  <path d="M14,68 Q24,38 48,34 L174,34 L178,68 L174,102 L48,102 Q24,98 14,68 Z" fill="#8B1a2a"/>
  <path d="M48,50 L174,50 L174,58 L42,58 Q30,54 20,50 Z" fill="#C8A800"/>
  <path d="M48,78 L174,78 L174,86 L42,86 Q30,82 20,78 Z" fill="#C8A800"/>
  <rect x="148" y="40" width="18" height="14" rx="2" fill="#87CEEB" opacity="0.7"/>
  <circle cx="16" cy="68" r="7" fill="#FFE040" opacity="0.9"/>
  {wheel(44, 108, 8, "#C8A800", "#6a0015", "#C8A800")}
  {wheel(62, 108, 8, "#C8A800", "#6a0015", "#C8A800")}
  {wheel(86, 108, 13, "#C8A800", "#6a0015", "#C8A800")}
  {wheel(109, 108, 13, "#C8A800", "#6a0015", "#C8A800")}
  {wheel(132, 108, 13, "#C8A800", "#6a0015", "#C8A800")}
  {wheel(158, 108, 9, "#C8A800", "#6a0015", "#C8A800")}
  {rail(10, 195)}
''', "Duchess Class LMS · 1937")

# 27. britannia-class-br
SVGS["britannia-class-br"] = svg_wrap(f'''
  <rect x="18" y="50" width="148" height="36" rx="7" fill="#111"/>
  <rect x="24" y="56" width="100" height="24" rx="7" fill="#1e1e1e"/>
  <rect x="15" y="52" width="8" height="30" rx="2" fill="#1a1a1a" stroke="#555" stroke-width="1"/>
  <rect x="36" y="52" width="8" height="30" rx="2" fill="#1a1a1a" stroke="#555" stroke-width="1"/>
  <circle cx="26" cy="67" r="15" fill="#0d0d0d"/>
  <rect x="30" y="16" width="13" height="36" rx="3" fill="#0d0d0d"/>
  <rect x="26" y="12" width="21" height="8" rx="2" fill="#333"/>
  <ellipse cx="105" cy="53" rx="13" ry="9" fill="#0d0d0d"/>
  <rect x="24" y="80" width="120" height="4" fill="#CC4400"/>
  <rect x="148" y="44" width="36" height="42" rx="4" fill="#0d0d0d"/>
  <rect x="151" y="48" width="14" height="14" rx="2" fill="#87CEEB" opacity="0.6"/>
  {wheel(36, 101, 8, "#CC4400", "#111", "#CC4400")}
  {wheel(56, 101, 8, "#CC4400", "#111", "#CC4400")}
  {wheel(80, 101, 13, "#CC4400", "#111", "#CC4400")}
  {wheel(103, 101, 13, "#CC4400", "#111", "#CC4400")}
  {wheel(126, 101, 13, "#CC4400", "#111", "#CC4400")}
  {wheel(155, 101, 9, "#CC4400", "#111", "#CC4400")}
  <rect x="80" y="99" width="46" height="4" rx="2" fill="#CC4400" opacity="0.7"/>
  {rail(10, 195)}
''', "Britannia Class BR · 1951")

# ============================================================
# EUROPEAN STEAM
# ============================================================

# 29. drg-class-05 - FULLY streamlined RED
SVGS["drg-class-05"] = svg_wrap(f'''
  <path d="M12,68 C14,40 32,28 56,26 L178,26 L182,68 L178,110 L56,110 C32,108 14,96 12,68 Z" fill="#CC0000"/>
  <path d="M12,68 C13,52 28,46 48,44 L48,92 C28,90 13,84 12,68 Z" fill="#AA0000"/>
  <rect x="56" y="60" width="126" height="16" fill="#fff" opacity="0.15"/>
  <circle cx="15" cy="68" r="7" fill="#FFE040" opacity="0.9"/>
  <rect x="152" y="32" width="18" height="16" rx="2" fill="#87CEEB" opacity="0.7"/>
  {wheel(42, 114, 9, "#AA0000", "#700000", "#AA0000")}
  {wheel(61, 114, 9, "#AA0000", "#700000", "#AA0000")}
  {wheel(86, 114, 14, "#AA0000", "#700000", "#AA0000")}
  {wheel(109, 114, 14, "#AA0000", "#700000", "#AA0000")}
  {wheel(132, 114, 14, "#AA0000", "#700000", "#AA0000")}
  {wheel(158, 114, 9, "#AA0000", "#700000", "#AA0000")}
  {wheel(176, 114, 9, "#AA0000", "#700000", "#AA0000")}
  {rail(10, 196)}
''', "DRG Class 05 · 1935")

# 30. drb-class-52 - austerity wartime 2-10-0
SVGS["drb-class-52"] = svg_wrap(f'''
  <rect x="8" y="50" width="170" height="38" rx="4" fill="#111"/>
  <rect x="14" y="56" width="120" height="24" rx="5" fill="#181818"/>
  <rect x="18" y="16" width="14" height="36" rx="2" fill="#0d0d0d"/>
  <rect x="16" y="13" width="18" height="7" rx="1" fill="#1a1a1a"/>
  <rect x="160" y="42" width="28" height="46" rx="3" fill="#111"/>
  <rect x="163" y="46" width="12" height="13" rx="2" fill="#87CEEB" opacity="0.5"/>
  <circle cx="14" cy="67" r="15" fill="#0d0d0d"/>
  <rect x="100" y="50" width="20" height="12" rx="4" fill="#111"/>
  {wheel(22, 101, 7, "#444", "#111", "#444")}
  {wheel(45, 101, 12, "#444", "#111", "#444")}
  {wheel(64, 101, 12, "#444", "#111", "#444")}
  {wheel(83, 101, 12, "#444", "#111", "#444")}
  {wheel(102, 101, 12, "#444", "#111", "#444")}
  {wheel(121, 101, 12, "#444", "#111", "#444")}
  <rect x="45" y="99" width="76" height="4" rx="2" fill="#333" opacity="0.8"/>
  {rail(5, 197)}
''', "DRB Class 52 · 1941")

# 31. jnr-d51
SVGS["jnr-d51"] = svg_wrap(f'''
  <rect x="18" y="50" width="150" height="36" rx="7" fill="#111"/>
  <rect x="24" y="56" width="100" height="24" rx="7" fill="#1a1a1a"/>
  <rect x="148" y="44" width="36" height="42" rx="4" fill="#1a1a1a"/>
  <rect x="151" y="48" width="14" height="14" rx="2" fill="#87CEEB" opacity="0.6"/>
  <rect x="150" y="70" width="32" height="5" fill="#fff" opacity="0.8"/>
  <rect x="28" y="18" width="14" height="34" rx="3" fill="#111"/>
  <rect x="22" y="15" width="26" height="7" rx="2" fill="#222"/>
  <circle cx="22" cy="67" r="16" fill="#0d0d0d"/>
  <ellipse cx="100" cy="52" rx="14" ry="9" fill="#0d0d0d"/>
  {wheel(34, 101, 7, "#888", "#111", "#888")}
  {wheel(58, 101, 12, "#888", "#111", "#888")}
  {wheel(78, 101, 12, "#888", "#111", "#888")}
  {wheel(98, 101, 12, "#888", "#111", "#888")}
  {wheel(118, 101, 12, "#888", "#111", "#888")}
  {wheel(145, 101, 8, "#888", "#111", "#888")}
  <rect x="58" y="99" width="60" height="4" rx="2" fill="#666" opacity="0.8"/>
  {rail(10, 195)}
''', "JNR D51 · 1936")

# 32. jnr-c62
SVGS["jnr-c62"] = svg_wrap(f'''
  <rect x="16" y="48" width="152" height="40" rx="8" fill="#111"/>
  <rect x="22" y="54" width="105" height="26" rx="8" fill="#1a1a1a"/>
  <rect x="152" y="42" width="36" height="46" rx="4" fill="#0d0d0d"/>
  <rect x="155" y="46" width="18" height="16" rx="2" fill="#87CEEB" opacity="0.65"/>
  <rect x="26" y="14" width="14" height="36" rx="5" fill="#0d0d0d"/>
  <circle cx="33" cy="14" r="8" fill="#222"/>
  <circle cx="22" cy="67" r="18" fill="#0d0d0d"/>
  <ellipse cx="108" cy="50" rx="15" ry="10" fill="#0d0d0d"/>
  <rect x="24" y="78" width="124" height="5" fill="#CC0000"/>
  {wheel(36, 103, 8, "#aaa", "#111", "#aaa")}
  {wheel(56, 103, 8, "#aaa", "#111", "#aaa")}
  {wheel(80, 103, 14, "#aaa", "#111", "#aaa")}
  {wheel(103, 103, 14, "#aaa", "#111", "#aaa")}
  {wheel(126, 103, 14, "#aaa", "#111", "#aaa")}
  {wheel(152, 103, 9, "#aaa", "#111", "#aaa")}
  {wheel(170, 103, 9, "#aaa", "#111", "#aaa")}
  <rect x="80" y="101" width="46" height="4" rx="2" fill="#888" opacity="0.8"/>
  {rail(8, 196)}
''', "JNR C62 · 1949")

# 33. sncf-super-pacific
SVGS["sncf-super-pacific"] = svg_wrap(f'''
  <rect x="18" y="50" width="148" height="36" rx="7" fill="#111"/>
  <rect x="24" y="56" width="100" height="24" rx="7" fill="#1e1e1e"/>
  <rect x="28" y="16" width="12" height="36" rx="3" fill="#0d0d0d"/>
  <rect x="24" y="12" width="20" height="8" rx="3" fill="#b87333"/>
  <circle cx="22" cy="67" r="16" fill="#0d0d0d"/>
  <ellipse cx="85" cy="52" rx="12" ry="8" fill="#0d0d0d"/>
  <ellipse cx="110" cy="55" rx="9" ry="6" fill="#0d0d0d"/>
  <path d="M148,86 L148,44 Q155,38 170,36 L184,36 L184,86 Z" fill="#0d0d0d"/>
  <rect x="152" y="42" width="16" height="14" rx="2" fill="#87CEEB" opacity="0.6"/>
  <rect x="24" y="75" width="110" height="4" fill="#b87333"/>
  {wheel(34, 101, 8, "#b87333", "#111", "#b87333")}
  {wheel(54, 101, 8, "#b87333", "#111", "#b87333")}
  {wheel(78, 101, 13, "#b87333", "#111", "#b87333")}
  {wheel(101, 101, 13, "#b87333", "#111", "#b87333")}
  {wheel(124, 101, 13, "#b87333", "#111", "#b87333")}
  {wheel(153, 101, 9, "#b87333", "#111", "#b87333")}
  <rect x="78" y="99" width="46" height="4" rx="2" fill="#b87333" opacity="0.7"/>
  {rail(10, 195)}
''', "SNCF Super Pacific · 1923")

# 34. chapelon-242-a1 - double chimney 4-8-4
SVGS["chapelon-242-a1"] = svg_wrap(f'''
  <rect x="14" y="48" width="160" height="40" rx="8" fill="#111"/>
  <rect x="20" y="54" width="110" height="26" rx="8" fill="#1a1a1a"/>
  <rect x="26" y="14" width="10" height="36" rx="3" fill="#0d0d0d"/>
  <rect x="40" y="18" width="10" height="32" rx="3" fill="#0d0d0d"/>
  <rect x="22" y="10" width="32" height="8" rx="2" fill="#222"/>
  <circle cx="20" cy="67" r="17" fill="#0d0d0d"/>
  <ellipse cx="105" cy="51" rx="14" ry="9" fill="#0d0d0d"/>
  <rect x="158" y="42" width="32" height="46" rx="4" fill="#0d0d0d"/>
  <rect x="161" y="46" width="14" height="14" rx="2" fill="#87CEEB" opacity="0.6"/>
  {wheel(30, 102, 8, "#777", "#111", "#777")}
  {wheel(50, 102, 8, "#777", "#111", "#777")}
  {wheel(72, 102, 13, "#777", "#111", "#777")}
  {wheel(92, 102, 13, "#777", "#111", "#777")}
  {wheel(112, 102, 13, "#777", "#111", "#777")}
  {wheel(132, 102, 13, "#777", "#111", "#777")}
  {wheel(154, 102, 9, "#777", "#111", "#777")}
  {wheel(172, 102, 9, "#777", "#111", "#777")}
  <rect x="72" y="100" width="60" height="4" rx="2" fill="#555" opacity="0.8"/>
  {rail(8, 196)}
''', "Chapelon 242 A1 · 1942")

# 35. cpr-royal-hudson
SVGS["cpr-royal-hudson"] = svg_wrap(f'''
  <path d="M15,68 Q22,44 42,40 L174,40 L178,68 L174,96 L42,96 Q22,92 15,68 Z" fill="#1a4a1a"/>
  <rect x="42" y="40" width="136" height="56" rx="0" fill="#1a4a1a"/>
  <rect x="42" y="52" width="136" height="6" fill="#C8A800"/>
  <rect x="42" y="78" width="136" height="5" fill="#C8A800"/>
  <rect x="152" y="40" width="26" height="56" rx="3" fill="#133a13"/>
  <rect x="155" y="44" width="14" height="15" rx="2" fill="#87CEEB" opacity="0.65"/>
  <rect x="34" y="16" width="13" height="26" rx="3" fill="#0d1a0d"/>
  <circle cx="17" cy="68" r="8" fill="#FFE040" opacity="0.9"/>
  <polygon points="158,76 161,70 164,76 167,70 170,76" fill="#C8A800" opacity="0.8"/>
  {wheel(38, 104, 8, "#C8A800", "#0d2a0d", "#C8A800")}
  {wheel(57, 104, 8, "#C8A800", "#0d2a0d", "#C8A800")}
  {wheel(80, 104, 13, "#C8A800", "#0d2a0d", "#C8A800")}
  {wheel(103, 104, 13, "#C8A800", "#0d2a0d", "#C8A800")}
  {wheel(126, 104, 13, "#C8A800", "#0d2a0d", "#C8A800")}
  {wheel(152, 104, 9, "#C8A800", "#0d2a0d", "#C8A800")}
  {wheel(170, 104, 9, "#C8A800", "#0d2a0d", "#C8A800")}
  {rail(10, 195)}
''', "CPR Royal Hudson · 1937")

# 36. sar-class-25 - condensing LONG tender
SVGS["sar-class-25"] = svg_wrap(f'''
  <rect x="8" y="52" width="90" height="36" rx="7" fill="#111"/>
  <rect x="14" y="58" width="65" height="24" rx="6" fill="#1a1a1a"/>
  <rect x="100" y="46" width="92" height="42" rx="5" fill="#222"/>
  <rect x="104" y="42" width="84" height="8" rx="3" fill="#333"/>
  <line x1="112" y1="42" x2="112" y2="50" stroke="#555" stroke-width="2"/>
  <line x1="124" y1="42" x2="124" y2="50" stroke="#555" stroke-width="2"/>
  <line x1="136" y1="42" x2="136" y2="50" stroke="#555" stroke-width="2"/>
  <line x1="148" y1="42" x2="148" y2="50" stroke="#555" stroke-width="2"/>
  <line x1="160" y1="42" x2="160" y2="50" stroke="#555" stroke-width="2"/>
  <line x1="172" y1="42" x2="172" y2="50" stroke="#555" stroke-width="2"/>
  <line x1="184" y1="42" x2="184" y2="50" stroke="#555" stroke-width="2"/>
  <rect x="12" y="14" width="13" height="40" rx="3" fill="#0d0d0d"/>
  <rect x="8" y="10" width="21" height="8" rx="2" fill="#333"/>
  <circle cx="12" cy="68" r="16" fill="#0d0d0d"/>
  {wheel(20, 102, 8, "#666", "#111", "#666")}
  {wheel(40, 102, 8, "#666", "#111", "#666")}
  {wheel(58, 102, 12, "#666", "#111", "#666")}
  {wheel(74, 102, 12, "#666", "#111", "#666")}
  {wheel(90, 102, 12, "#666", "#111", "#666")}
  {wheel(118, 102, 8, "#555", "#222", "#555")}
  {wheel(138, 102, 8, "#555", "#222", "#555")}
  {wheel(158, 102, 8, "#555", "#222", "#555")}
  {wheel(178, 102, 8, "#555", "#222", "#555")}
  {rail(5, 198)}
''', "SAR Class 25 · 1953")

# 37. australian-3801
SVGS["australian-3801"] = svg_wrap(f'''
  <rect x="18" y="50" width="148" height="36" rx="8" fill="#1a4c1a"/>
  <rect x="24" y="56" width="98" height="24" rx="7" fill="#2a5c2a"/>
  <rect x="28" y="16" width="13" height="36" rx="3" fill="#0d1a0d"/>
  <rect x="24" y="12" width="21" height="8" rx="3" fill="#b87333"/>
  <circle cx="22" cy="67" r="16" fill="#133a13"/>
  <ellipse cx="98" cy="52" rx="14" ry="9" fill="#133a13"/>
  <rect x="25" y="74" width="50" height="10" rx="2" fill="#b87333"/>
  <rect x="148" y="44" width="36" height="42" rx="4" fill="#133a13"/>
  <rect x="151" y="48" width="14" height="14" rx="2" fill="#87CEEB" opacity="0.6"/>
  <ellipse cx="68" cy="54" rx="6" ry="4" fill="#b87333"/>
  {wheel(34, 101, 8, "#b87333", "#1a4c1a", "#b87333")}
  {wheel(54, 101, 8, "#b87333", "#1a4c1a", "#b87333")}
  {wheel(80, 101, 13, "#b87333", "#1a4c1a", "#b87333")}
  {wheel(103, 101, 13, "#b87333", "#1a4c1a", "#b87333")}
  {wheel(126, 101, 13, "#b87333", "#1a4c1a", "#b87333")}
  {wheel(155, 101, 9, "#b87333", "#1a4c1a", "#b87333")}
  <rect x="80" y="99" width="46" height="4" rx="2" fill="#b87333" opacity="0.7"/>
  {rail(10, 195)}
''', "Australian 3801 · 1943")

# 38. wap-class-india-steam
SVGS["wap-class-india-steam"] = svg_wrap(f'''
  <rect x="18" y="50" width="148" height="36" rx="6" fill="#111"/>
  <rect x="24" y="56" width="100" height="24" rx="6" fill="#1a1a1a"/>
  <rect x="28" y="18" width="16" height="34" rx="4" fill="#0d0d0d"/>
  <rect x="23" y="14" width="26" height="9" rx="3" fill="#444"/>
  <circle cx="22" cy="67" r="16" fill="#0d0d0d"/>
  <ellipse cx="90" cy="52" rx="13" ry="8" fill="#0d0d0d"/>
  <ellipse cx="112" cy="55" rx="9" ry="6" fill="#0d0d0d"/>
  <ellipse cx="128" cy="56" rx="7" ry="5" fill="#0d0d0d"/>
  <rect x="26" y="72" width="80" height="8" fill="#1a5c1a"/>
  <rect x="148" y="44" width="36" height="42" rx="3" fill="#0d0d0d"/>
  <rect x="151" y="48" width="15" height="14" rx="2" fill="#87CEEB" opacity="0.6"/>
  {wheel(34, 101, 8, "#888", "#111", "#888")}
  {wheel(54, 101, 8, "#888", "#111", "#888")}
  {wheel(80, 101, 13, "#888", "#111", "#888")}
  {wheel(103, 101, 13, "#888", "#111", "#888")}
  {wheel(126, 101, 13, "#888", "#111", "#888")}
  {wheel(155, 101, 9, "#888", "#111", "#888")}
  {rail(10, 195)}
''', "WAP Class India Steam · 1947")

# 39. trans-siberian
SVGS["trans-siberian"] = svg_wrap(f'''
  <rect x="8" y="55" width="65" height="34" rx="6" fill="#111"/>
  <rect x="14" y="60" width="44" height="22" rx="6" fill="#1a1a1a"/>
  <rect x="16" y="22" width="12" height="35" rx="3" fill="#0d0d0d"/>
  <rect x="12" y="18" width="20" height="7" rx="2" fill="#333"/>
  <circle cx="12" cy="70" r="15" fill="#0d0d0d"/>
  <rect x="75" y="52" width="40" height="37" rx="3" fill="#2a2a2a"/>
  <rect x="118" y="52" width="40" height="37" rx="3" fill="#2a2a2a"/>
  <rect x="161" y="52" width="33" height="37" rx="3" fill="#2a2a2a"/>
  <rect x="79" y="58" width="8" height="8" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="92" y="58" width="8" height="8" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="105" y="58" width="8" height="8" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="122" y="58" width="8" height="8" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="135" y="58" width="8" height="8" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="148" y="58" width="8" height="8" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="165" y="58" width="8" height="8" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="75" y="71" width="119" height="5" fill="#CC0000"/>
  <rect x="72" y="66" width="6" height="4" fill="#666"/>
  <rect x="116" y="66" width="5" height="4" fill="#666"/>
  <rect x="159" y="66" width="5" height="4" fill="#666"/>
  {wheel(22, 100, 8, "#666", "#111", "#666")}
  {wheel(42, 100, 8, "#666", "#111", "#666")}
  {wheel(60, 100, 11, "#666", "#111", "#666")}
  {wheel(88, 100, 7, "#555", "#333", "#555")}
  {wheel(106, 100, 7, "#555", "#333", "#555")}
  {wheel(129, 100, 7, "#555", "#333", "#555")}
  {wheel(148, 100, 7, "#555", "#333", "#555")}
  {wheel(168, 100, 7, "#555", "#333", "#555")}
  {wheel(185, 100, 7, "#555", "#333", "#555")}
  {rail(5, 198)}
''', "Trans-Siberian · 1891")

print("British + European steam batch: OK")

# ============================================================
# DIESEL CLASSIC
# ============================================================

# 40. flying-hamburger - purple/cream 2-car diesel railcar, Art Deco
SVGS["flying-hamburger"] = svg_wrap(f'''
  <!-- 2-car articulated diesel railcar -->
  <!-- car 1 -->
  <path d="M10,65 Q20,45 35,42 L100,42 L100,88 L35,88 Q20,85 10,65 Z" fill="#6B2D8B"/>
  <!-- car 2 -->
  <rect x="100" y="42" width="85" height="46" rx="4" fill="#6B2D8B"/>
  <!-- cream lower stripe -->
  <path d="M35,72 L100,72 L100,80 L35,80 Q22,78 14,70 Z" fill="#F5F5DC"/>
  <rect x="100" y="72" width="85" height="8" fill="#F5F5DC"/>
  <!-- Art Deco nose -->
  <path d="M10,65 Q14,55 28,52 L28,58 Q18,60 14,65 Z" fill="#F5F5DC"/>
  <!-- windows car1 -->
  <rect x="38" y="48" width="12" height="10" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="55" y="48" width="12" height="10" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="72" y="48" width="12" height="10" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- windows car2 -->
  <rect x="108" y="48" width="12" height="10" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="125" y="48" width="12" height="10" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="142" y="48" width="12" height="10" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="160" y="48" width="12" height="10" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- articulation joint -->
  <rect x="97" y="46" width="6" height="40" rx="2" fill="#4a1a60"/>
  <!-- headlight -->
  <circle cx="13" cy="65" r="5" fill="#FFE040" opacity="0.9"/>
  {wheel(38, 100, 8, "#F5F5DC", "#4a1a60", "#F5F5DC")}
  {wheel(76, 100, 8, "#F5F5DC", "#4a1a60", "#F5F5DC")}
  {wheel(113, 100, 8, "#F5F5DC", "#4a1a60", "#F5F5DC")}
  {wheel(155, 100, 8, "#F5F5DC", "#4a1a60", "#F5F5DC")}
  {rail(5, 198)}
''', "Flying Hamburger · 1932")

# 41. emd-e-unit - full-width streamlined cab, bulldog nose, silver+red
SVGS["emd-e-unit"] = svg_wrap(f'''
  <!-- bulldog streamlined nose, full-width -->
  <path d="M10,68 C12,44 28,36 48,34 L185,34 L185,102 L48,102 C28,100 12,92 10,68 Z" fill="#C0C0C0"/>
  <!-- red nose accent bulldog -->
  <path d="M10,68 C12,52 24,46 40,44 L40,60 Q28,60 16,68 Q28,76 40,76 L40,92 C24,90 12,84 10,68 Z" fill="#CC2200"/>
  <!-- yellow stripe -->
  <rect x="48" y="60" width="137" height="16" fill="#FFD700"/>
  <!-- cab window -->
  <rect x="150" y="40" width="22" height="18" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- nose number board -->
  <rect x="30" y="58" width="16" height="20" rx="2" fill="#fff" opacity="0.5"/>
  <!-- headlights -->
  <circle cx="14" cy="58" r="5" fill="#FFE040" opacity="0.9"/>
  <circle cx="14" cy="78" r="5" fill="#FFE040" opacity="0.9"/>
  <!-- 6 axle bogies -->
  {wheel(38, 110, 8, "#888", "#aaa", "#888")}
  {wheel(60, 110, 8, "#888", "#aaa", "#888")}
  {wheel(88, 110, 8, "#888", "#aaa", "#888")}
  {wheel(118, 110, 8, "#888", "#aaa", "#888")}
  {wheel(148, 110, 8, "#888", "#aaa", "#888")}
  {wheel(170, 110, 8, "#888", "#aaa", "#888")}
  {rail(10, 195)}
''', "EMD E-Unit · 1937")

# 42. emd-f-unit - full-width cab, shorter, yellow/black Armour Yellow
SVGS["emd-f-unit"] = svg_wrap(f'''
  <!-- shorter than E-unit, same width cab -->
  <path d="M12,68 C14,46 30,38 50,36 L180,36 L180,100 L50,100 C30,98 14,90 12,68 Z" fill="#E8B800"/>
  <!-- black nose top -->
  <path d="M12,68 C14,50 26,44 44,42 L44,54 Q28,54 18,62 Z" fill="#1a1a1a"/>
  <path d="M12,68 C14,86 26,92 44,94 L44,82 Q28,82 18,74 Z" fill="#1a1a1a"/>
  <!-- black upper stripe -->
  <rect x="50" y="36" width="130" height="14" fill="#1a1a1a"/>
  <!-- cab window -->
  <rect x="148" y="42" width="20" height="16" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- headlight -->
  <circle cx="15" cy="68" r="6" fill="#FFE040" opacity="0.9"/>
  <!-- number boards on nose -->
  <rect x="32" y="58" width="14" height="18" rx="2" fill="#fff" opacity="0.5"/>
  <!-- 4-axle (2 bogies) -->
  {wheel(42, 108, 8, "#C8A800", "#333", "#C8A800")}
  {wheel(70, 108, 8, "#C8A800", "#333", "#C8A800")}
  {wheel(112, 108, 8, "#C8A800", "#333", "#C8A800")}
  {wheel(140, 108, 8, "#C8A800", "#333", "#C8A800")}
  {rail(10, 195)}
''', "EMD F-Unit · 1939")

# 43. emd-gp7 - HOOD UNIT narrow engine hood, yellow/black
SVGS["emd-gp7"] = svg_wrap(f'''
  <!-- hood unit: narrow hood, walkways visible on sides -->
  <!-- cab at one end -->
  <rect x="130" y="38" width="55" height="58" rx="4" fill="#E8B800"/>
  <rect x="133" y="42" width="20" height="16" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- narrow engine hood -->
  <rect x="20" y="48" width="115" height="38" rx="4" fill="#E8B800"/>
  <!-- hood top narrower -->
  <rect x="24" y="42" width="105" height="14" rx="3" fill="#C8A000"/>
  <!-- exhaust stack on hood -->
  <rect x="38" y="28" width="8" height="16" rx="3" fill="#1a1a1a"/>
  <rect x="60" y="30" width="8" height="14" rx="3" fill="#1a1a1a"/>
  <!-- black stripes on cab -->
  <rect x="130" y="58" width="55" height="8" fill="#1a1a1a"/>
  <!-- walkway visible -->
  <rect x="18" y="84" width="118" height="6" rx="2" fill="#C8A000"/>
  <!-- dynamic brake blister on hood -->
  <rect x="55" y="42" width="35" height="10" rx="3" fill="#C8A000"/>
  <!-- 4-axle -->
  {wheel(38, 104, 8, "#C8A800", "#333", "#C8A800")}
  {wheel(62, 104, 8, "#C8A800", "#333", "#C8A800")}
  {wheel(108, 104, 8, "#C8A800", "#333", "#C8A800")}
  {wheel(148, 104, 8, "#C8A800", "#333", "#C8A800")}
  {rail(10, 195)}
''', "EMD GP7 · 1949")

# 44. emd-sd40 - 6-axle hood unit, longer
SVGS["emd-sd40"] = svg_wrap(f'''
  <rect x="140" y="38" width="48" height="58" rx="4" fill="#E8B800"/>
  <rect x="143" y="42" width="18" height="16" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- longer hood -->
  <rect x="12" y="48" width="133" height="38" rx="4" fill="#E8B800"/>
  <rect x="16" y="42" width="122" height="14" rx="3" fill="#C8A000"/>
  <rect x="28" y="28" width="8" height="16" rx="3" fill="#1a1a1a"/>
  <rect x="50" y="30" width="8" height="14" rx="3" fill="#1a1a1a"/>
  <rect x="70" y="30" width="8" height="14" rx="3" fill="#1a1a1a"/>
  <rect x="140" y="58" width="48" height="8" fill="#1a1a1a"/>
  <!-- radiator wings at rear of hood -->
  <rect x="106" y="38" width="30" height="48" rx="3" fill="#C8A000"/>
  <rect x="12" y="84" width="134" height="6" rx="2" fill="#C8A000"/>
  <!-- 6-axle 3 bogies -->
  {wheel(28, 104, 8, "#C8A800", "#333", "#C8A800")}
  {wheel(50, 104, 8, "#C8A800", "#333", "#C8A800")}
  {wheel(80, 104, 8, "#C8A800", "#333", "#C8A800")}
  {wheel(104, 104, 8, "#C8A800", "#333", "#C8A800")}
  {wheel(128, 104, 8, "#C8A800", "#333", "#C8A800")}
  {wheel(158, 104, 8, "#C8A800", "#333", "#C8A800")}
  {rail(8, 196)}
''', "EMD SD40 · 1966")

# 45. emd-sd70m - modern SD, Safety cab, larger radiators
SVGS["emd-sd70m"] = svg_wrap(f'''
  <!-- North American Safety cab - wider, different profile -->
  <rect x="138" y="34" width="50" height="62" rx="5" fill="#E8B800"/>
  <!-- safety cab wider radiused corners -->
  <rect x="141" y="38" width="20" height="18" rx="3" fill="#87CEEB" opacity="0.7"/>
  <rect x="12" y="48" width="130" height="38" rx="4" fill="#E8B800"/>
  <rect x="16" y="42" width="120" height="14" rx="3" fill="#C8A000"/>
  <!-- larger radiator wings -->
  <rect x="100" y="34" width="35" height="62" rx="3" fill="#B89000"/>
  <rect x="28" y="28" width="9" height="16" rx="3" fill="#1a1a1a"/>
  <rect x="52" y="30" width="9" height="14" rx="3" fill="#1a1a1a"/>
  <rect x="138" y="58" width="50" height="8" fill="#1a1a1a"/>
  {wheel(28, 104, 8, "#C8A800", "#333", "#C8A800")}
  {wheel(52, 104, 8, "#C8A800", "#333", "#C8A800")}
  {wheel(78, 104, 8, "#C8A800", "#333", "#C8A800")}
  {wheel(108, 104, 8, "#C8A800", "#333", "#C8A800")}
  {wheel(138, 104, 8, "#C8A800", "#333", "#C8A800")}
  {wheel(164, 104, 8, "#C8A800", "#333", "#C8A800")}
  {rail(8, 196)}
''', "EMD SD70M · 1992")

# 46. emd-sd90mac - super-long, widecab
SVGS["emd-sd90mac"] = svg_wrap(f'''
  <!-- very long hood, massive -->
  <rect x="140" y="34" width="48" height="62" rx="5" fill="#E8B800"/>
  <rect x="143" y="38" width="22" height="18" rx="3" fill="#87CEEB" opacity="0.7"/>
  <rect x="8" y="46" width="136" height="42" rx="4" fill="#E8B800"/>
  <rect x="12" y="40" width="126" height="16" rx="3" fill="#C8A000"/>
  <!-- very large radiator section -->
  <rect x="96" y="34" width="40" height="66" rx="3" fill="#B89000"/>
  <!-- massive grille pattern -->
  <line x1="100" y1="40" x2="100" y2="96" stroke="#C8A000" stroke-width="1.5"/>
  <line x1="106" y1="40" x2="106" y2="96" stroke="#C8A000" stroke-width="1.5"/>
  <line x1="112" y1="40" x2="112" y2="96" stroke="#C8A000" stroke-width="1.5"/>
  <line x1="118" y1="40" x2="118" y2="96" stroke="#C8A000" stroke-width="1.5"/>
  <rect x="28" y="26" width="10" height="16" rx="3" fill="#1a1a1a"/>
  <rect x="55" y="28" width="10" height="14" rx="3" fill="#1a1a1a"/>
  <rect x="78" y="28" width="10" height="14" rx="3" fill="#1a1a1a"/>
  <rect x="140" y="58" width="48" height="8" fill="#1a1a1a"/>
  {wheel(24, 106, 9, "#C8A800", "#333", "#C8A800")}
  {wheel(48, 106, 9, "#C8A800", "#333", "#C8A800")}
  {wheel(72, 106, 9, "#C8A800", "#333", "#C8A800")}
  {wheel(104, 106, 9, "#C8A800", "#333", "#C8A800")}
  {wheel(140, 106, 9, "#C8A800", "#333", "#C8A800")}
  {wheel(166, 106, 9, "#C8A800", "#333", "#C8A800")}
  {rail(5, 198)}
''', "EMD SD90MAC · 1995")

# 47. ge-dash-9 - GE hood unit, distinctive GE nose, UP yellow
SVGS["ge-dash-9"] = svg_wrap(f'''
  <!-- GE distinctive nose profile - more angular than EMD -->
  <rect x="138" y="36" width="50" height="60" rx="4" fill="#FFD700"/>
  <rect x="141" y="40" width="20" height="17" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- GE angular cab front -->
  <polygon points="138,36 152,32 188,32 188,36" fill="#E8C000"/>
  <rect x="10" y="48" width="132" height="38" rx="4" fill="#FFD700"/>
  <rect x="14" y="42" width="122" height="14" rx="3" fill="#E8C000"/>
  <!-- GE nose box shape different from EMD bullnose -->
  <rect x="8" y="48" width="24" height="38" rx="3" fill="#E8C000"/>
  <circle cx="16" cy="68" r="6" fill="#FFE040" opacity="0.9"/>
  <!-- GE radiator wings -->
  <rect x="102" y="36" width="32" height="60" rx="3" fill="#D4B000"/>
  <rect x="28" y="30" width="9" height="14" rx="3" fill="#1a1a1a"/>
  <rect x="52" y="32" width="9" height="12" rx="3" fill="#1a1a1a"/>
  <!-- UP stripe -->
  <rect x="8" y="64" width="180" height="8" fill="#CC2200" opacity="0.3"/>
  {wheel(28, 104, 8, "#E8C000", "#333", "#E8C000")}
  {wheel(52, 104, 8, "#E8C000", "#333", "#E8C000")}
  {wheel(78, 104, 8, "#E8C000", "#333", "#E8C000")}
  {wheel(110, 104, 8, "#E8C000", "#333", "#E8C000")}
  {wheel(144, 104, 8, "#E8C000", "#333", "#E8C000")}
  {wheel(168, 104, 8, "#E8C000", "#333", "#E8C000")}
  {rail(5, 198)}
''', "GE Dash-9 · 1993")

# 48. ge-es44ac - GE Evolution Series, squarer cab
SVGS["ge-es44ac"] = svg_wrap(f'''
  <!-- Evolution Series - squarer cab, different hood profile -->
  <rect x="136" y="34" width="52" height="62" rx="5" fill="#FF6600"/>
  <rect x="139" y="38" width="22" height="18" rx="3" fill="#87CEEB" opacity="0.7"/>
  <!-- BNSF orange/black -->
  <rect x="8" y="46" width="132" height="42" rx="4" fill="#FF6600"/>
  <rect x="12" y="40" width="122" height="14" rx="3" fill="#E05500"/>
  <!-- Evolution Series larger hood top -->
  <!-- black nose -->
  <rect x="8" y="46" width="20" height="42" rx="3" fill="#333"/>
  <circle cx="15" cy="68" r="5" fill="#FFE040" opacity="0.9"/>
  <!-- large radiators evolution style -->
  <rect x="98" y="34" width="34" height="68" rx="3" fill="#CC4400"/>
  <!-- hood exhausts -->
  <rect x="26" y="28" width="10" height="14" rx="3" fill="#1a1a1a"/>
  <rect x="50" y="30" width="10" height="12" rx="3" fill="#1a1a1a"/>
  <!-- BNSF swoosh -->
  <path d="M8,70 Q60,62 136,68" stroke="#FFD700" stroke-width="3" fill="none"/>
  {wheel(26, 106, 9, "#E05500", "#333", "#E05500")}
  {wheel(50, 106, 9, "#E05500", "#333", "#E05500")}
  {wheel(76, 106, 9, "#E05500", "#333", "#E05500")}
  {wheel(106, 106, 9, "#E05500", "#333", "#E05500")}
  {wheel(140, 106, 9, "#E05500", "#333", "#E05500")}
  {wheel(166, 106, 9, "#E05500", "#333", "#E05500")}
  {rail(5, 198)}
''', "GE ES44AC · 2004")

# 49. ge-tier4-et44 - latest GE, UP yellow
SVGS["ge-tier4-et44"] = svg_wrap(f'''
  <!-- Tier 4 ET44 - updated cab with larger air vents -->
  <rect x="136" y="34" width="52" height="62" rx="5" fill="#FFD700"/>
  <rect x="139" y="38" width="22" height="18" rx="3" fill="#87CEEB" opacity="0.7"/>
  <rect x="8" y="46" width="132" height="42" rx="4" fill="#FFD700"/>
  <rect x="12" y="40" width="122" height="14" rx="3" fill="#E8C000"/>
  <rect x="8" y="46" width="22" height="42" rx="3" fill="#E8C000"/>
  <circle cx="16" cy="68" r="5" fill="#FFE040" opacity="0.9"/>
  <!-- larger air intake grille Tier4 -->
  <rect x="96" y="34" width="36" height="68" rx="3" fill="#D4B000"/>
  <line x1="100" y1="38" x2="100" y2="98" stroke="#E8C000" stroke-width="2"/>
  <line x1="106" y1="38" x2="106" y2="98" stroke="#E8C000" stroke-width="2"/>
  <line x1="112" y1="38" x2="112" y2="98" stroke="#E8C000" stroke-width="2"/>
  <line x1="118" y1="38" x2="118" y2="98" stroke="#E8C000" stroke-width="2"/>
  <line x1="124" y1="38" x2="124" y2="98" stroke="#E8C000" stroke-width="2"/>
  <rect x="28" y="28" width="10" height="14" rx="3" fill="#1a1a1a"/>
  <!-- UP stripe red -->
  <rect x="8" y="62" width="180" height="12" fill="#CC2200" opacity="0.25"/>
  {wheel(26, 106, 9, "#E8C000", "#333", "#E8C000")}
  {wheel(50, 106, 9, "#E8C000", "#333", "#E8C000")}
  {wheel(76, 106, 9, "#E8C000", "#333", "#E8C000")}
  {wheel(106, 106, 9, "#E8C000", "#333", "#E8C000")}
  {wheel(140, 106, 9, "#E8C000", "#333", "#E8C000")}
  {wheel(166, 106, 9, "#E8C000", "#333", "#E8C000")}
  {rail(5, 198)}
''', "GE Tier4 ET44 · 2015")

# 50. waratah-nsr - NSW diesel green/yellow
SVGS["waratah-nsr"] = svg_wrap(f'''
  <!-- NSW diesel green/yellow -->
  <rect x="10" y="44" width="178" height="58" rx="6" fill="#1a5c1a"/>
  <path d="M10,73 Q10,44 24,42 L188,42 L188,44 L10,44 Z" fill="#2a7a2a"/>
  <!-- yellow stripe NSW style -->
  <rect x="10" y="68" width="178" height="10" fill="#FFD700"/>
  <!-- cab front -->
  <rect x="148" y="44" width="40" height="58" rx="4" fill="#1a4a1a"/>
  <rect x="152" y="48" width="18" height="16" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- NSW rounded nose -->
  <path d="M10,44 Q10,102 22,102 L10,102 Z" fill="#1a4a1a"/>
  <circle cx="14" cy="73" r="6" fill="#FFE040" opacity="0.9"/>
  <!-- exhaust stacks -->
  <rect x="30" y="32" width="9" height="14" rx="3" fill="#1a1a1a"/>
  <rect x="50" y="34" width="9" height="12" rx="3" fill="#1a1a1a"/>
  {wheel(28, 110, 8, "#FFD700", "#1a3a1a", "#FFD700")}
  {wheel(55, 110, 8, "#FFD700", "#1a3a1a", "#FFD700")}
  {wheel(95, 110, 8, "#FFD700", "#1a3a1a", "#FFD700")}
  {wheel(130, 110, 8, "#FFD700", "#1a3a1a", "#FFD700")}
  {wheel(160, 110, 8, "#FFD700", "#1a3a1a", "#FFD700")}
  {rail(5, 198)}
''', "Waratah NSR · 1960")

# 51. dongfeng-4 - Chinese diesel, green + yellow stripe, cab forward
SVGS["dongfeng-4"] = svg_wrap(f'''
  <!-- cab-forward Chinese style, green -->
  <rect x="8" y="42" width="180" height="60" rx="5" fill="#1a5c2a"/>
  <!-- cab at front, large windshield -->
  <rect x="8" y="42" width="55" height="60" rx="5" fill="#1a6030"/>
  <rect x="12" y="46" width="28" height="20" rx="3" fill="#87CEEB" opacity="0.75"/>
  <!-- yellow stripe -->
  <rect x="8" y="76" width="180" height="10" fill="#FFD700"/>
  <!-- hood behind cab -->
  <rect x="65" y="48" width="120" height="46" rx="3" fill="#1a5c2a"/>
  <!-- exhaust from hood -->
  <rect x="90" y="32" width="10" height="18" rx="3" fill="#1a1a1a"/>
  <rect x="108" y="34" width="10" height="16" rx="3" fill="#1a1a1a"/>
  <!-- front headlights -->
  <circle cx="18" cy="76" r="5" fill="#FFE040" opacity="0.9"/>
  <circle cx="38" cy="76" r="5" fill="#FFE040" opacity="0.9"/>
  {wheel(28, 110, 8, "#FFD700", "#1a3a1a", "#FFD700")}
  {wheel(54, 110, 8, "#FFD700", "#1a3a1a", "#FFD700")}
  {wheel(100, 110, 8, "#FFD700", "#1a3a1a", "#FFD700")}
  {wheel(128, 110, 8, "#FFD700", "#1a3a1a", "#FFD700")}
  {wheel(158, 110, 8, "#FFD700", "#1a3a1a", "#FFD700")}
  {wheel(182, 110, 8, "#FFD700", "#1a3a1a", "#FFD700")}
  {rail(5, 198)}
''', "Dongfeng 4 · 1968")

# 52. df11-china - streamlined Chinese diesel, orange/gray
SVGS["df11-china"] = svg_wrap(f'''
  <!-- more pointed/streamlined nose than DF4 -->
  <rect x="8" y="44" width="180" height="58" rx="5" fill="#888"/>
  <path d="M8,73 Q14,44 32,42 L188,42 L188,44 L8,44 Z" fill="#999"/>
  <!-- orange stripe -->
  <rect x="8" y="68" width="180" height="12" fill="#FF6600"/>
  <!-- pointed nose front -->
  <path d="M8,44 L8,102 Q8,102 28,92 L28,54 Q14,50 8,44 Z" fill="#777"/>
  <!-- cab windshield -->
  <rect x="14" y="50" width="20" height="18" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- hood exhausts -->
  <rect x="50" y="30" width="10" height="16" rx="3" fill="#1a1a1a"/>
  <rect x="70" y="32" width="10" height="14" rx="3" fill="#1a1a1a"/>
  <!-- headlight -->
  <circle cx="14" cy="73" r="5" fill="#FFE040" opacity="0.9"/>
  {wheel(28, 110, 9, "#FF6600", "#555", "#FF6600")}
  {wheel(54, 110, 9, "#FF6600", "#555", "#FF6600")}
  {wheel(100, 110, 9, "#FF6600", "#555", "#FF6600")}
  {wheel(128, 110, 9, "#FF6600", "#555", "#FF6600")}
  {wheel(158, 110, 9, "#FF6600", "#555", "#FF6600")}
  {wheel(182, 110, 9, "#FF6600", "#555", "#FF6600")}
  {rail(5, 198)}
''', "DF11 China · 1992")

# 53. class-66-emd - UK freight, EWS maroon/gold or green, 6-axle
SVGS["class-66-emd"] = svg_wrap(f'''
  <!-- EWS dark maroon -->
  <rect x="8" y="40" width="180" height="62" rx="5" fill="#5a1a1a"/>
  <path d="M8,71 Q8,40 20,38 L188,38 L188,40 L8,40 Z" fill="#6a2a2a"/>
  <!-- EWS gold stripe -->
  <rect x="8" y="66" width="180" height="10" fill="#C8A800"/>
  <!-- cab end -->
  <rect x="140" y="40" width="48" height="62" rx="4" fill="#4a1010"/>
  <rect x="144" y="44" width="20" height="18" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- Class 66 characteristic nose slope -->
  <polygon points="8,40 8,102 30,102 30,50" fill="#6a1a1a"/>
  <circle cx="14" cy="71" r="6" fill="#FFE040" opacity="0.9"/>
  <!-- exhaust -->
  <rect x="48" y="26" width="10" height="16" rx="3" fill="#1a1a1a"/>
  <!-- 6 axles -->
  {wheel(24, 110, 8, "#C8A800", "#3a0a0a", "#C8A800")}
  {wheel(48, 110, 8, "#C8A800", "#3a0a0a", "#C8A800")}
  {wheel(76, 110, 8, "#C8A800", "#3a0a0a", "#C8A800")}
  {wheel(104, 110, 8, "#C8A800", "#3a0a0a", "#C8A800")}
  {wheel(140, 110, 8, "#C8A800", "#3a0a0a", "#C8A800")}
  {wheel(166, 110, 8, "#C8A800", "#3a0a0a", "#C8A800")}
  {rail(5, 198)}
''', "Class 66 EMD · 1998")

# 54. class-67-uk - DB cargo maroon, sleeker
SVGS["class-67-uk"] = svg_wrap(f'''
  <!-- DB Schenker maroon, more streamlined than 66 -->
  <path d="M10,71 Q18,42 38,38 L185,38 L188,71 L185,104 L38,104 Q18,100 10,71 Z" fill="#5a1a2a"/>
  <!-- silver lower band -->
  <path d="M38,78 L185,78 L185,88 L38,88 Q22,84 14,76 Z" fill="#888"/>
  <!-- DB red stripe -->
  <rect x="38" y="56" width="147" height="8" fill="#CC0000"/>
  <!-- streamlined cab -->
  <rect x="152" y="38" width="36" height="66" rx="4" fill="#4a0a1a"/>
  <rect x="156" y="42" width="18" height="16" rx="2" fill="#87CEEB" opacity="0.7"/>
  <circle cx="13" cy="71" r="6" fill="#FFE040" opacity="0.9"/>
  {wheel(36, 112, 8, "#888", "#3a0a15", "#888")}
  {wheel(62, 112, 8, "#888", "#3a0a15", "#888")}
  {wheel(100, 112, 8, "#888", "#3a0a15", "#888")}
  {wheel(138, 112, 8, "#888", "#3a0a15", "#888")}
  {wheel(162, 112, 8, "#888", "#3a0a15", "#888")}
  {wheel(182, 112, 8, "#888", "#3a0a15", "#888")}
  {rail(5, 198)}
''', "Class 67 UK · 1999")

# 55. vossloh-euro-4000 - gray/yellow, wide distinctive cab
SVGS["vossloh-euro-4000"] = svg_wrap(f'''
  <!-- European diesel, distinctive wide rounded cab front -->
  <path d="M8,68 Q12,42 30,38 L185,38 L188,68 L185,98 L30,98 Q12,94 8,68 Z" fill="#888"/>
  <!-- yellow nose area -->
  <path d="M8,68 Q12,48 26,44 L26,92 Q12,88 8,68 Z" fill="#FFD700"/>
  <!-- hood section -->
  <rect x="30" y="38" width="158" height="60" rx="0" fill="#777"/>
  <!-- yellow stripe across -->
  <rect x="26" y="62" width="162" height="12" fill="#FFD700"/>
  <!-- cab end -->
  <rect x="148" y="38" width="40" height="60" rx="3" fill="#666"/>
  <rect x="152" y="42" width="18" height="16" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- exhaust stacks -->
  <rect x="48" y="24" width="10" height="16" rx="3" fill="#1a1a1a"/>
  <rect x="70" y="26" width="10" height="14" rx="3" fill="#1a1a1a"/>
  <circle cx="12" cy="68" r="6" fill="#FFE040" opacity="0.9"/>
  {wheel(26, 106, 8, "#FFD700", "#555", "#FFD700")}
  {wheel(52, 106, 8, "#FFD700", "#555", "#FFD700")}
  {wheel(90, 106, 8, "#FFD700", "#555", "#FFD700")}
  {wheel(126, 106, 8, "#FFD700", "#555", "#FFD700")}
  {wheel(162, 106, 8, "#FFD700", "#555", "#FFD700")}
  {wheel(182, 106, 8, "#FFD700", "#555", "#FFD700")}
  {rail(5, 198)}
''', "Vossloh Euro 4000 · 2004")

# 56. ghan-australia - RED locomotive + long Australian train
SVGS["ghan-australia"] = svg_wrap(f'''
  <!-- RED locomotive front -->
  <rect x="8" y="42" width="75" height="60" rx="6" fill="#CC2200"/>
  <!-- The Ghan cream/red livery -->
  <path d="M8,72 Q8,42 20,40 L83,40 L83,42 L8,42 Z" fill="#DD3300"/>
  <!-- cream windows area -->
  <rect x="14" y="46" width="35" height="22" rx="3" fill="#F5F5DC"/>
  <rect x="18" y="50" width="14" height="14" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="36" y="50" width="10" height="14" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- passenger cars desert colors -->
  <rect x="86" y="48" width="50" height="54" rx="3" fill="#CC2200"/>
  <rect x="139" y="48" width="54" height="54" rx="3" fill="#CC2200"/>
  <!-- cream stripe on cars -->
  <rect x="86" y="58" width="50" height="10" fill="#F5F5DC"/>
  <rect x="139" y="58" width="54" height="10" fill="#F5F5DC"/>
  <!-- headlight -->
  <circle cx="12" cy="72" r="6" fill="#FFE040" opacity="0.9"/>
  <!-- sand desert effect dots -->
  <circle cx="100" cy="104" r="2" fill="#c8a060" opacity="0.4"/>
  <circle cx="120" cy="106" r="2" fill="#c8a060" opacity="0.4"/>
  {wheel(24, 110, 8, "#F5F5DC", "#aa1a00", "#F5F5DC")}
  {wheel(54, 110, 8, "#F5F5DC", "#aa1a00", "#F5F5DC")}
  {wheel(100, 110, 8, "#F5F5DC", "#aa1a00", "#F5F5DC")}
  {wheel(124, 110, 8, "#F5F5DC", "#aa1a00", "#F5F5DC")}
  {wheel(156, 110, 8, "#F5F5DC", "#aa1a00", "#F5F5DC")}
  {wheel(180, 110, 8, "#F5F5DC", "#aa1a00", "#F5F5DC")}
  {rail(5, 198)}
''', "The Ghan Australia · 1929")

# 57. indian-pacific - two-tone blue, transcontinental Australia
SVGS["indian-pacific"] = svg_wrap(f'''
  <!-- two-tone blue Australian transcontinental -->
  <rect x="8" y="42" width="75" height="60" rx="5" fill="#1a2a6c"/>
  <path d="M8,72 Q10,42 22,40 L83,40 L83,42 L8,42 Z" fill="#2a3a7c"/>
  <rect x="14" y="46" width="32" height="20" rx="3" fill="#87CEEB" opacity="0.7"/>
  <!-- silver mid stripe -->
  <rect x="8" y="66" width="75" height="8" fill="#C0C0C0"/>
  <!-- lighter blue lower -->
  <rect x="8" y="74" width="75" height="28" rx="5" fill="#2a4a9c"/>
  <!-- passenger cars -->
  <rect x="86" y="42" width="52" height="60" rx="3" fill="#1a2a6c"/>
  <rect x="141" y="42" width="52" height="60" rx="3" fill="#1a2a6c"/>
  <rect x="86" y="64" width="52" height="8" fill="#C0C0C0"/>
  <rect x="141" y="64" width="52" height="8" fill="#C0C0C0"/>
  <rect x="86" y="72" width="52" height="30" rx="3" fill="#2a4a9c"/>
  <rect x="141" y="72" width="52" height="30" rx="3" fill="#2a4a9c"/>
  <circle cx="12" cy="72" r="6" fill="#FFE040" opacity="0.9"/>
  {wheel(24, 110, 8, "#C0C0C0", "#1a2a6c", "#C0C0C0")}
  {wheel(54, 110, 8, "#C0C0C0", "#1a2a6c", "#C0C0C0")}
  {wheel(100, 110, 8, "#C0C0C0", "#1a2a6c", "#C0C0C0")}
  {wheel(127, 110, 8, "#C0C0C0", "#1a2a6c", "#C0C0C0")}
  {wheel(158, 110, 8, "#C0C0C0", "#1a2a6c", "#C0C0C0")}
  {wheel(180, 110, 8, "#C0C0C0", "#1a2a6c", "#C0C0C0")}
  {rail(5, 198)}
''', "Indian Pacific · 1970")

# 58. rocky-mountaineer - blue/gold dome cars, Canada
SVGS["rocky-mountaineer"] = svg_wrap(f'''
  <!-- blue/gold Rocky Mountaineer dome cars -->
  <rect x="8" y="44" width="60" height="58" rx="5" fill="#003082"/>
  <!-- diesel loco -->
  <rect x="12" y="48" width="24" height="18" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="8" y="68" width="60" height="10" fill="#C8A800"/>
  <circle cx="12" cy="73" r="5" fill="#FFE040" opacity="0.9"/>
  <!-- dome car 1 -->
  <rect x="71" y="52" width="58" height="50" rx="3" fill="#003082"/>
  <!-- dome raised section -->
  <rect x="76" y="36" width="48" height="22" rx="4" fill="#0048C0"/>
  <rect x="80" y="30" width="40" height="12" rx="3" fill="#0050D0"/>
  <rect x="82" y="32" width="8" height="8" rx="1" fill="#87CEEB" opacity="0.8"/>
  <rect x="94" y="32" width="8" height="8" rx="1" fill="#87CEEB" opacity="0.8"/>
  <rect x="106" y="32" width="8" height="8" rx="1" fill="#87CEEB" opacity="0.8"/>
  <rect x="71" y="68" width="58" height="10" fill="#C8A800"/>
  <!-- dome car 2 -->
  <rect x="132" y="52" width="58" height="50" rx="3" fill="#003082"/>
  <rect x="137" y="36" width="48" height="22" rx="4" fill="#0048C0"/>
  <rect x="141" y="32" width="8" height="8" rx="1" fill="#87CEEB" opacity="0.8"/>
  <rect x="153" y="32" width="8" height="8" rx="1" fill="#87CEEB" opacity="0.8"/>
  <rect x="165" y="32" width="8" height="8" rx="1" fill="#87CEEB" opacity="0.8"/>
  <rect x="132" y="68" width="58" height="10" fill="#C8A800"/>
  {wheel(20, 110, 7, "#C8A800", "#002060", "#C8A800")}
  {wheel(48, 110, 7, "#C8A800", "#002060", "#C8A800")}
  {wheel(84, 110, 7, "#C8A800", "#002060", "#C8A800")}
  {wheel(108, 110, 7, "#C8A800", "#002060", "#C8A800")}
  {wheel(148, 110, 7, "#C8A800", "#002060", "#C8A800")}
  {wheel(174, 110, 7, "#C8A800", "#002060", "#C8A800")}
  {rail(5, 198)}
''', "Rocky Mountaineer · 1990")

# 59. bb301-indonesia - blue electric diesel Indonesian Railways
SVGS["bb301-indonesia"] = svg_wrap(f'''
  <path d="M10,68 Q16,42 34,38 L185,38 L188,68 L185,98 L34,98 Q16,94 10,68 Z" fill="#1a4a9c"/>
  <rect x="34" y="38" width="154" height="60" rx="0" fill="#1a4a9c"/>
  <path d="M10,68 Q14,50 28,46 L28,90 Q14,86 10,68 Z" fill="#2255b0"/>
  <!-- orange stripe KAI -->
  <rect x="28" y="62" width="160" height="12" fill="#FF6600"/>
  <rect x="152" y="38" width="36" height="60" rx="3" fill="#163a7c"/>
  <rect x="155" y="42" width="18" height="16" rx="2" fill="#87CEEB" opacity="0.7"/>
  <circle cx="13" cy="68" r="6" fill="#FFE040" opacity="0.9"/>
  <rect x="34" y="38" width="10" height="60" rx="0" fill="#2255b0"/>
  {wheel(30, 106, 8, "#FF6600", "#1a3a7c", "#FF6600")}
  {wheel(58, 106, 8, "#FF6600", "#1a3a7c", "#FF6600")}
  {wheel(100, 106, 8, "#FF6600", "#1a3a7c", "#FF6600")}
  {wheel(140, 106, 8, "#FF6600", "#1a3a7c", "#FF6600")}
  {rail(10, 195)}
''', "BB301 Indonesia · 1977")

# 60. bb302-indonesia
SVGS["bb302-indonesia"] = svg_wrap(f'''
  <path d="M10,68 Q16,42 34,38 L185,38 L188,68 L185,98 L34,98 Q16,94 10,68 Z" fill="#1a5cab"/>
  <rect x="34" y="38" width="154" height="60" rx="0" fill="#1a5cab"/>
  <!-- different blue shade + yellow stripe -->
  <rect x="28" y="64" width="160" height="10" fill="#FFD700"/>
  <rect x="152" y="38" width="36" height="60" rx="3" fill="#1448a0"/>
  <rect x="155" y="42" width="18" height="16" rx="2" fill="#87CEEB" opacity="0.7"/>
  <circle cx="13" cy="68" r="6" fill="#FFE040" opacity="0.9"/>
  <!-- slightly different front treatment - rounded more -->
  <path d="M10,68 Q14,52 30,48 L30,88 Q14,84 10,68 Z" fill="#2465bb"/>
  {wheel(30, 106, 8, "#FFD700", "#143a8a", "#FFD700")}
  {wheel(58, 106, 8, "#FFD700", "#143a8a", "#FFD700")}
  {wheel(100, 106, 8, "#FFD700", "#143a8a", "#FFD700")}
  {wheel(140, 106, 8, "#FFD700", "#143a8a", "#FFD700")}
  {rail(10, 195)}
''', "BB302 Indonesia · 1980")

# 61. bb303-indonesia
SVGS["bb303-indonesia"] = svg_wrap(f'''
  <!-- updated model different front treatment more angular -->
  <rect x="8" y="40" width="180" height="62" rx="5" fill="#1a5cab"/>
  <rect x="8" y="40" width="32" height="62" rx="5" fill="#1448a0"/>
  <rect x="14" y="44" width="18" height="18" rx="3" fill="#87CEEB" opacity="0.7"/>
  <rect x="8" y="64" width="180" height="10" fill="#CC4400"/>
  <rect x="148" y="40" width="40" height="62" rx="4" fill="#1448a0"/>
  <rect x="152" y="44" width="18" height="16" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- more angular front than BB301/302 -->
  <polygon points="8,40 8,102 28,92 28,50" fill="#2050a0"/>
  <circle cx="14" cy="71" r="5" fill="#FFE040" opacity="0.9"/>
  {wheel(30, 110, 8, "#CC4400", "#143a8a", "#CC4400")}
  {wheel(58, 110, 8, "#CC4400", "#143a8a", "#CC4400")}
  {wheel(100, 110, 8, "#CC4400", "#143a8a", "#CC4400")}
  {wheel(140, 110, 8, "#CC4400", "#143a8a", "#CC4400")}
  {rail(10, 195)}
''', "BB303 Indonesia · 1986")

# 62. cc203-indonesia - wider nose than CC201, orange stripe
SVGS["cc203-indonesia"] = svg_wrap(f'''
  <!-- wider nose different from CC201 -->
  <path d="M8,68 Q12,42 28,38 L185,38 L188,68 L185,98 L28,98 Q12,94 8,68 Z" fill="#2255a0"/>
  <!-- wider nose box -->
  <rect x="8" y="48" width="30" height="40" rx="4" fill="#2255a0"/>
  <rect x="12" y="52" width="18" height="14" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- orange wide stripe -->
  <rect x="28" y="62" width="160" height="14" fill="#FF6600"/>
  <rect x="8" y="68" width="24" height="8" fill="#FF6600"/>
  <rect x="152" y="38" width="36" height="60" rx="3" fill="#1a4080"/>
  <rect x="155" y="42" width="18" height="16" rx="2" fill="#87CEEB" opacity="0.7"/>
  <circle cx="12" cy="63" r="5" fill="#FFE040" opacity="0.9"/>
  <circle cx="12" cy="79" r="5" fill="#FFE040" opacity="0.9"/>
  {wheel(26, 106, 8, "#FF6600", "#1a3a80", "#FF6600")}
  {wheel(52, 106, 8, "#FF6600", "#1a3a80", "#FF6600")}
  {wheel(80, 106, 8, "#FF6600", "#1a3a80", "#FF6600")}
  {wheel(112, 106, 8, "#FF6600", "#1a3a80", "#FF6600")}
  {wheel(148, 106, 8, "#FF6600", "#1a3a80", "#FF6600")}
  {wheel(174, 106, 8, "#FF6600", "#1a3a80", "#FF6600")}
  {rail(5, 198)}
''', "CC203 Indonesia · 1995")

# 63. palace-wheels-india - GOLD/MAROON royal heritage train
SVGS["palace-wheels-india"] = svg_wrap(f'''
  <!-- royal gold/maroon ornate heritage -->
  <rect x="8" y="44" width="60" height="58" rx="6" fill="#8B1a00"/>
  <rect x="12" y="48" width="22" height="16" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- gold ornate bands -->
  <rect x="8" y="58" width="60" height="6" fill="#C8A800"/>
  <rect x="8" y="84" width="60" height="6" fill="#C8A800"/>
  <!-- ornate pattern on loco -->
  <circle cx="28" cy="71" r="8" fill="none" stroke="#C8A800" stroke-width="2"/>
  <polygon points="28,63 30,69 36,69 31,73 33,79 28,75 23,79 25,73 20,69 26,69" fill="#C8A800" opacity="0.8"/>
  <!-- Maharaja carriage 1 -->
  <rect x="71" y="40" width="58" height="62" rx="4" fill="#6a1000"/>
  <rect x="71" y="52" width="58" height="8" fill="#C8A800"/>
  <rect x="71" y="80" width="58" height="8" fill="#C8A800"/>
  <rect x="76" y="60" width="10" height="14" rx="2" fill="#87CEEB" opacity="0.6"/>
  <rect x="92" y="60" width="10" height="14" rx="2" fill="#87CEEB" opacity="0.6"/>
  <rect x="108" y="60" width="10" height="14" rx="2" fill="#87CEEB" opacity="0.6"/>
  <!-- ornate carriage trim -->
  <line x1="71" y1="44" x2="129" y2="44" stroke="#C8A800" stroke-width="1.5"/>
  <!-- Maharaja carriage 2 -->
  <rect x="132" y="40" width="58" height="62" rx="4" fill="#6a1000"/>
  <rect x="132" y="52" width="58" height="8" fill="#C8A800"/>
  <rect x="132" y="80" width="58" height="8" fill="#C8A800"/>
  <rect x="137" y="60" width="10" height="14" rx="2" fill="#87CEEB" opacity="0.6"/>
  <rect x="153" y="60" width="10" height="14" rx="2" fill="#87CEEB" opacity="0.6"/>
  <rect x="169" y="60" width="10" height="14" rx="2" fill="#87CEEB" opacity="0.6"/>
  <line x1="132" y1="44" x2="190" y2="44" stroke="#C8A800" stroke-width="1.5"/>
  <circle cx="12" cy="73" r="5" fill="#FFE040" opacity="0.9"/>
  {wheel(22, 110, 7, "#C8A800", "#5a0e00", "#C8A800")}
  {wheel(48, 110, 7, "#C8A800", "#5a0e00", "#C8A800")}
  {wheel(86, 110, 7, "#C8A800", "#5a0e00", "#C8A800")}
  {wheel(108, 110, 7, "#C8A800", "#5a0e00", "#C8A800")}
  {wheel(148, 110, 7, "#C8A800", "#5a0e00", "#C8A800")}
  {wheel(174, 110, 7, "#C8A800", "#5a0e00", "#C8A800")}
  {rail(5, 198)}
''', "Palace on Wheels India · 1982")

# 64. blue-train-sa - dark BLUE + silver luxury
SVGS["blue-train-sa"] = svg_wrap(f'''
  <!-- dark blue electric loco -->
  <rect x="8" y="42" width="72" height="60" rx="5" fill="#00205B"/>
  <rect x="12" y="46" width="26" height="18" rx="3" fill="#87CEEB" opacity="0.7"/>
  <rect x="8" y="66" width="72" height="10" fill="#C0C0C0"/>
  <!-- pantograph -->
  <line x1="30" y1="42" x2="26" y2="24" stroke="#888" stroke-width="1.5"/>
  <line x1="50" y1="42" x2="54" y2="24" stroke="#888" stroke-width="1.5"/>
  <line x1="24" y1="24" x2="56" y2="24" stroke="#888" stroke-width="2"/>
  <!-- blue luxury cars -->
  <rect x="83" y="42" width="55" height="60" rx="3" fill="#00205B"/>
  <rect x="141" y="42" width="52" height="60" rx="3" fill="#00205B"/>
  <rect x="83" y="66" width="55" height="10" fill="#C0C0C0"/>
  <rect x="141" y="66" width="52" height="10" fill="#C0C0C0"/>
  <!-- windows with curtain hint -->
  <rect x="88" y="50" width="9" height="12" rx="1" fill="#87CEEB" opacity="0.5"/>
  <rect x="102" y="50" width="9" height="12" rx="1" fill="#87CEEB" opacity="0.5"/>
  <rect x="116" y="50" width="9" height="12" rx="1" fill="#87CEEB" opacity="0.5"/>
  <rect x="146" y="50" width="9" height="12" rx="1" fill="#87CEEB" opacity="0.5"/>
  <rect x="160" y="50" width="9" height="12" rx="1" fill="#87CEEB" opacity="0.5"/>
  <rect x="174" y="50" width="9" height="12" rx="1" fill="#87CEEB" opacity="0.5"/>
  <circle cx="12" cy="72" r="5" fill="#FFE040" opacity="0.9"/>
  {wheel(22, 110, 7, "#C0C0C0", "#00205B", "#C0C0C0")}
  {wheel(48, 110, 7, "#C0C0C0", "#00205B", "#C0C0C0")}
  {wheel(96, 110, 7, "#C0C0C0", "#00205B", "#C0C0C0")}
  {wheel(120, 110, 7, "#C0C0C0", "#00205B", "#C0C0C0")}
  {wheel(152, 110, 7, "#C0C0C0", "#00205B", "#C0C0C0")}
  {wheel(174, 110, 7, "#C0C0C0", "#00205B", "#C0C0C0")}
  {rail(5, 198)}
''', "Blue Train SA · 1939")

print("Diesel classic batch: OK")

# ============================================================
# CLASSIC ELECTRIC LOCOS
# ============================================================

# 65. sbb-re-4-4 - Swiss RED Bo-Bo, pantograph
SVGS["sbb-re-4-4"] = svg_wrap(f'''
  <rect x="15" y="44" width="170" height="58" rx="6" fill="#CC0000"/>
  <!-- Swiss cross on cab end -->
  <rect x="15" y="44" width="38" height="58" rx="4" fill="#AA0000"/>
  <rect x="18" y="48" width="14" height="18" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- Swiss cross -->
  <rect x="36" y="56" width="12" height="4" fill="#fff"/>
  <rect x="40" y="52" width="4" height="12" fill="#fff"/>
  <!-- body -->
  <rect x="53" y="44" width="132" height="58" rx="4" fill="#CC0000"/>
  <!-- large side window grille -->
  <rect x="60" y="52" width="60" height="28" rx="3" fill="#AA0000"/>
  <!-- pantograph -->
  <line x1="80" y1="44" x2="76" y2="26" stroke="#888" stroke-width="1.5"/>
  <line x1="100" y1="44" x2="104" y2="26" stroke="#888" stroke-width="1.5"/>
  <line x1="74" y1="26" x2="106" y2="26" stroke="#888" stroke-width="2"/>
  <line x1="90" y1="26" x2="90" y2="20" stroke="#aaa" stroke-width="1.5"/>
  <line x1="80" y1="20" x2="100" y2="20" stroke="#aaa" stroke-width="2"/>
  <!-- 4-axle Bo-Bo -->
  {wheel(30, 110, 9, "#fff", "#880000", "#fff")}
  {wheel(55, 110, 9, "#fff", "#880000", "#fff")}
  {wheel(130, 110, 9, "#fff", "#880000", "#fff")}
  {wheel(158, 110, 9, "#fff", "#880000", "#fff")}
  {rail(10, 195)}
''', "SBB Re 4/4 · 1964")

# 66. sncf-bb-9004 - BLUE aerodynamic French electric
SVGS["sncf-bb-9004"] = svg_wrap(f'''
  <!-- aerodynamic nose French speed record holder -->
  <path d="M10,68 Q16,42 36,38 L185,38 L188,68 L185,98 L36,98 Q16,94 10,68 Z" fill="#003399"/>
  <!-- aerodynamic rounded nose - key feature -->
  <path d="M10,68 Q14,50 30,46 L30,90 Q14,86 10,68 Z" fill="#0044AA"/>
  <!-- silver stripe -->
  <rect x="30" y="60" width="158" height="16" fill="#C0C0C0"/>
  <rect x="10" y="64" width="22" height="8" fill="#C0C0C0"/>
  <!-- cab at both ends (Bo-Bo reversible) -->
  <rect x="152" y="38" width="36" height="60" rx="4" fill="#002288"/>
  <rect x="155" y="42" width="18" height="16" rx="2" fill="#87CEEB" opacity="0.7"/>
  <circle cx="13" cy="68" r="6" fill="#FFE040" opacity="0.9"/>
  <!-- pantograph -->
  <line x1="70" y1="38" x2="66" y2="20" stroke="#888" stroke-width="1.5"/>
  <line x1="90" y1="38" x2="94" y2="20" stroke="#888" stroke-width="1.5"/>
  <line x1="64" y1="20" x2="96" y2="20" stroke="#aaa" stroke-width="2"/>
  {wheel(28, 106, 9, "#C0C0C0", "#002288", "#C0C0C0")}
  {wheel(54, 106, 9, "#C0C0C0", "#002288", "#C0C0C0")}
  {wheel(130, 106, 9, "#C0C0C0", "#002288", "#C0C0C0")}
  {wheel(158, 106, 9, "#C0C0C0", "#002288", "#C0C0C0")}
  {rail(5, 198)}
''', "SNCF BB 9004 · 1957")

# 67. db-br-110 - DB blue/cream, rounded nose, older style
SVGS["db-br-110"] = svg_wrap(f'''
  <path d="M10,68 Q16,44 32,40 L185,40 L188,68 L185,96 L32,96 Q16,92 10,68 Z" fill="#1a3a8c"/>
  <!-- cream stripe old DB -->
  <rect x="32" y="64" width="156" height="10" fill="#F5F5DC"/>
  <path d="M10,68 Q14,60 26,58 L26,66 Q16,66 12,68 Z" fill="#F5F5DC"/>
  <!-- rounded nose older style -->
  <path d="M10,68 Q12,54 24,50 L24,62 Q16,62 12,66 Z" fill="#2244A0"/>
  <rect x="18" y="48" width="18" height="14" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="152" y="40" width="36" height="56" rx="4" fill="#152e78"/>
  <rect x="155" y="44" width="18" height="14" rx="2" fill="#87CEEB" opacity="0.7"/>
  <circle cx="13" cy="68" r="5" fill="#FFE040" opacity="0.9"/>
  <!-- pantograph -->
  <line x1="70" y1="40" x2="66" y2="22" stroke="#888" stroke-width="1.5"/>
  <line x1="90" y1="40" x2="94" y2="22" stroke="#888" stroke-width="1.5"/>
  <line x1="64" y1="22" x2="96" y2="22" stroke="#aaa" stroke-width="2"/>
  {wheel(28, 104, 9, "#F5F5DC", "#1a3a8c", "#F5F5DC")}
  {wheel(54, 104, 9, "#F5F5DC", "#1a3a8c", "#F5F5DC")}
  {wheel(130, 104, 9, "#F5F5DC", "#1a3a8c", "#F5F5DC")}
  {wheel(156, 104, 9, "#F5F5DC", "#1a3a8c", "#F5F5DC")}
  {rail(5, 198)}
''', "DB BR 110 · 1956")

# 68. db-br-140 - olive green freight, boxy
SVGS["db-br-140"] = svg_wrap(f'''
  <!-- olive green boxy freight electric -->
  <rect x="10" y="40" width="178" height="62" rx="4" fill="#4a5c20"/>
  <rect x="10" y="40" width="38" height="62" rx="4" fill="#3a4a16"/>
  <rect x="14" y="44" width="20" height="18" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- boxy body with large grille -->
  <rect x="50" y="48" width="50" height="34" rx="3" fill="#3a4a16"/>
  <!-- ventilation slats -->
  <line x1="54" y1="52" x2="96" y2="52" stroke="#4a5c20" stroke-width="3"/>
  <line x1="54" y1="57" x2="96" y2="57" stroke="#4a5c20" stroke-width="3"/>
  <line x1="54" y1="62" x2="96" y2="62" stroke="#4a5c20" stroke-width="3"/>
  <line x1="54" y1="67" x2="96" y2="67" stroke="#4a5c20" stroke-width="3"/>
  <line x1="54" y1="72" x2="96" y2="72" stroke="#4a5c20" stroke-width="3"/>
  <rect x="148" y="40" width="40" height="62" rx="4" fill="#3a4a16"/>
  <rect x="152" y="44" width="20" height="18" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- pantograph -->
  <line x1="110" y1="40" x2="106" y2="22" stroke="#888" stroke-width="1.5"/>
  <line x1="130" y1="40" x2="134" y2="22" stroke="#888" stroke-width="1.5"/>
  <line x1="104" y1="22" x2="136" y2="22" stroke="#aaa" stroke-width="2"/>
  {wheel(24, 110, 9, "#888", "#3a4a16", "#888")}
  {wheel(50, 110, 9, "#888", "#3a4a16", "#888")}
  {wheel(130, 110, 9, "#888", "#3a4a16", "#888")}
  {wheel(158, 110, 9, "#888", "#3a4a16", "#888")}
  {rail(5, 198)}
''', "DB BR 140 · 1957")

# 69. fs-e444 - Italian "Tartaruga" turtle, dark blue
SVGS["fs-e444"] = svg_wrap(f'''
  <!-- Italian Tartaruga distinctive box cab -->
  <rect x="10" y="36" width="178" height="66" rx="4" fill="#003366"/>
  <!-- turtle-shell body panels - distinctive -->
  <rect x="10" y="36" width="45" height="66" rx="4" fill="#002244"/>
  <rect x="15" y="40" width="20" height="20" rx="3" fill="#87CEEB" opacity="0.7"/>
  <!-- turtle shell panel lines -->
  <line x1="55" y1="36" x2="55" y2="102" stroke="#002244" stroke-width="3"/>
  <line x1="90" y1="36" x2="90" y2="102" stroke="#002244" stroke-width="3"/>
  <line x1="125" y1="36" x2="125" y2="102" stroke="#002244" stroke-width="3"/>
  <line x1="148" y1="36" x2="148" y2="102" stroke="#002244" stroke-width="3"/>
  <rect x="148" y="36" width="40" height="66" rx="4" fill="#002244"/>
  <rect x="152" y="40" width="20" height="20" rx="3" fill="#87CEEB" opacity="0.7"/>
  <!-- silver stripe -->
  <rect x="10" y="68" width="178" height="8" fill="#C0C0C0"/>
  <!-- pantograph -->
  <line x1="85" y1="36" x2="81" y2="18" stroke="#888" stroke-width="1.5"/>
  <line x1="100" y1="36" x2="104" y2="18" stroke="#888" stroke-width="1.5"/>
  <line x1="79" y1="18" x2="106" y2="18" stroke="#aaa" stroke-width="2"/>
  {wheel(24, 110, 9, "#C0C0C0", "#002244", "#C0C0C0")}
  {wheel(50, 110, 9, "#C0C0C0", "#002244", "#C0C0C0")}
  {wheel(130, 110, 9, "#C0C0C0", "#002244", "#C0C0C0")}
  {wheel(158, 110, 9, "#C0C0C0", "#002244", "#C0C0C0")}
  {rail(5, 198)}
''', "FS E444 Tartaruga · 1967")

# 70. szd-vl80 - Soviet RED, double-unit, pantograph
SVGS["szd-vl80"] = svg_wrap(f'''
  <!-- double unit visible - articulated Soviet -->
  <!-- unit 1 -->
  <rect x="8" y="40" width="90" height="62" rx="4" fill="#CC0000"/>
  <rect x="8" y="40" width="30" height="62" rx="4" fill="#AA0000"/>
  <rect x="12" y="44" width="16" height="18" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="8" y="68" width="90" height="8" fill="#F5F5DC"/>
  <!-- unit 2 -->
  <rect x="102" y="40" width="90" height="62" rx="4" fill="#CC0000"/>
  <rect x="164" y="40" width="28" height="62" rx="4" fill="#AA0000"/>
  <rect x="167" y="44" width="16" height="18" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="102" y="68" width="90" height="8" fill="#F5F5DC"/>
  <!-- articulation joint -->
  <rect x="97" y="44" width="8" height="54" rx="2" fill="#880000"/>
  <!-- pantographs both units -->
  <line x1="50" y1="40" x2="46" y2="22" stroke="#888" stroke-width="1.5"/>
  <line x1="65" y1="40" x2="69" y2="22" stroke="#888" stroke-width="1.5"/>
  <line x1="44" y1="22" x2="71" y2="22" stroke="#aaa" stroke-width="2"/>
  <line x1="130" y1="40" x2="126" y2="22" stroke="#888" stroke-width="1.5"/>
  <line x1="145" y1="40" x2="149" y2="22" stroke="#888" stroke-width="1.5"/>
  <line x1="124" y1="22" x2="151" y2="22" stroke="#aaa" stroke-width="2"/>
  <!-- star emblem -->
  <polygon points="34,68 36,62 38,68 44,68 39,72 41,78 36,74 31,78 33,72 28,68" fill="#FFD700" opacity="0.8"/>
  {wheel(22, 110, 8, "#F5F5DC", "#880000", "#F5F5DC")}
  {wheel(48, 110, 8, "#F5F5DC", "#880000", "#F5F5DC")}
  {wheel(72, 110, 8, "#F5F5DC", "#880000", "#F5F5DC")}
  {wheel(116, 110, 8, "#F5F5DC", "#880000", "#F5F5DC")}
  {wheel(140, 110, 8, "#F5F5DC", "#880000", "#F5F5DC")}
  {wheel(166, 110, 8, "#F5F5DC", "#880000", "#F5F5DC")}
  {rail(5, 198)}
''', "SZD VL80 · 1961")

# ============================================================
# MODERN ELECTRIC LOCOS
# ============================================================

# 71. db-br-101 - DB SIGNAL RED, sleek rounded modern
SVGS["db-br-101"] = svg_wrap(f'''
  <path d="M10,68 Q18,40 38,36 L185,36 L188,68 L185,100 L38,100 Q18,96 10,68 Z" fill="#CC0000"/>
  <!-- smooth rounded modern profile -->
  <path d="M10,68 Q16,50 32,46 L32,90 Q16,86 10,68 Z" fill="#AA0000"/>
  <!-- white stripe DB modern -->
  <rect x="32" y="62" width="156" height="12" fill="#fff" opacity="0.9"/>
  <path d="M10,68 Q12,62 22,60 L22,68 Q14,68 12,68 Z" fill="#fff" opacity="0.9"/>
  <!-- DB logo area -->
  <rect x="40" y="54" width="20" height="16" rx="2" fill="#CC0000"/>
  <rect x="152" y="36" width="36" height="64" rx="4" fill="#AA0000"/>
  <rect x="156" y="40" width="18" height="16" rx="2" fill="#87CEEB" opacity="0.7"/>
  <circle cx="13" cy="68" r="6" fill="#FFE040" opacity="0.9"/>
  <!-- modern pantograph -->
  <line x1="80" y1="36" x2="76" y2="18" stroke="#888" stroke-width="1.5"/>
  <line x1="100" y1="36" x2="104" y2="18" stroke="#888" stroke-width="1.5"/>
  <line x1="74" y1="18" x2="106" y2="18" stroke="#aaa" stroke-width="2.5"/>
  {wheel(28, 108, 9, "#fff", "#880000", "#fff")}
  {wheel(54, 108, 9, "#fff", "#880000", "#fff")}
  {wheel(130, 108, 9, "#fff", "#880000", "#fff")}
  {wheel(158, 108, 9, "#fff", "#880000", "#fff")}
  {rail(5, 198)}
''', "DB BR 101 · 1996")

# 72. db-br-185-traxx - TRAXX angular modern nose
SVGS["db-br-185-traxx"] = svg_wrap(f'''
  <!-- TRAXX angular modular design -->
  <rect x="10" y="38" width="178" height="64" rx="5" fill="#CC0000"/>
  <!-- angular nose TRAXX - key feature -->
  <polygon points="10,38 10,102 32,90 32,50" fill="#AA0000"/>
  <rect x="14" y="50" width="15" height="16" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- TRAXX modular body panels -->
  <rect x="38" y="48" width="60" height="36" rx="3" fill="#AA0000"/>
  <rect x="152" y="38" width="36" height="64" rx="4" fill="#AA0000"/>
  <rect x="155" y="42" width="18" height="16" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- white DB stripe angular -->
  <rect x="32" y="64" width="158" height="10" fill="#fff" opacity="0.9"/>
  <line x1="10" y1="69" x2="34" y2="69" stroke="#fff" stroke-width="10" opacity="0.9"/>
  <!-- pantograph -->
  <line x1="100" y1="38" x2="96" y2="20" stroke="#888" stroke-width="1.5"/>
  <line x1="118" y1="38" x2="122" y2="20" stroke="#888" stroke-width="1.5"/>
  <line x1="94" y1="20" x2="124" y2="20" stroke="#aaa" stroke-width="2.5"/>
  {wheel(24, 110, 9, "#fff", "#880000", "#fff")}
  {wheel(50, 110, 9, "#fff", "#880000", "#fff")}
  {wheel(130, 110, 9, "#fff", "#880000", "#fff")}
  {wheel(158, 110, 9, "#fff", "#880000", "#fff")}
  {rail(5, 198)}
''', "DB BR 185 TRAXX · 2000")

# 73. bombardier-traxx - blue/gray generic TRAXX
SVGS["bombardier-traxx"] = svg_wrap(f'''
  <rect x="10" y="38" width="178" height="64" rx="5" fill="#1a5c9c"/>
  <polygon points="10,38 10,102 32,90 32,50" fill="#1448a0"/>
  <rect x="14" y="50" width="15" height="16" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="38" y="48" width="60" height="36" rx="3" fill="#1448a0"/>
  <rect x="152" y="38" width="36" height="64" rx="4" fill="#1448a0"/>
  <rect x="155" y="42" width="18" height="16" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- gray stripe -->
  <rect x="32" y="64" width="158" height="10" fill="#888" opacity="0.9"/>
  <line x1="10" y1="69" x2="34" y2="69" stroke="#888" stroke-width="10" opacity="0.9"/>
  <!-- pantograph -->
  <line x1="100" y1="38" x2="96" y2="20" stroke="#888" stroke-width="1.5"/>
  <line x1="118" y1="38" x2="122" y2="20" stroke="#888" stroke-width="1.5"/>
  <line x1="94" y1="20" x2="124" y2="20" stroke="#aaa" stroke-width="2.5"/>
  {wheel(24, 110, 9, "#888", "#1a3a7c", "#888")}
  {wheel(50, 110, 9, "#888", "#1a3a7c", "#888")}
  {wheel(130, 110, 9, "#888", "#1a3a7c", "#888")}
  {wheel(158, 110, 9, "#888", "#1a3a7c", "#888")}
  {rail(5, 198)}
''', "Bombardier TRAXX · 1998")

# 74. alstom-prima-ii - blue/silver angular Alstom
SVGS["alstom-prima-ii"] = svg_wrap(f'''
  <path d="M10,68 Q18,40 40,36 L185,36 L188,68 L185,100 L40,100 Q18,96 10,68 Z" fill="#003399"/>
  <!-- Alstom Prima distinctive angular headlight arrangement -->
  <rect x="14" y="48" width="22" height="12" rx="2" fill="#FFE040" opacity="0.8"/>
  <rect x="14" y="64" width="22" height="12" rx="2" fill="#FFE040" opacity="0.8"/>
  <!-- silver band -->
  <rect x="36" y="58" width="152" height="20" fill="#C0C0C0"/>
  <path d="M10,68 Q14,62 26,60 L26,68 Q16,68 12,68 Z" fill="#C0C0C0"/>
  <rect x="152" y="36" width="36" height="64" rx="4" fill="#002288"/>
  <rect x="155" y="40" width="18" height="16" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- pantograph -->
  <line x1="90" y1="36" x2="86" y2="18" stroke="#888" stroke-width="1.5"/>
  <line x1="108" y1="36" x2="112" y2="18" stroke="#888" stroke-width="1.5"/>
  <line x1="84" y1="18" x2="114" y2="18" stroke="#aaa" stroke-width="2.5"/>
  {wheel(28, 108, 9, "#C0C0C0", "#002288", "#C0C0C0")}
  {wheel(54, 108, 9, "#C0C0C0", "#002288", "#C0C0C0")}
  {wheel(130, 108, 9, "#C0C0C0", "#002288", "#C0C0C0")}
  {wheel(158, 108, 9, "#C0C0C0", "#002288", "#C0C0C0")}
  {rail(5, 198)}
''', "Alstom Prima II · 2004")

# 75. siemens-vectron - very modern angular black nose, silver body
SVGS["siemens-vectron"] = svg_wrap(f'''
  <!-- Vectron: very angular black nose, silver body -->
  <rect x="10" y="38" width="178" height="64" rx="5" fill="#888"/>
  <!-- distinctive angular black nose - key feature -->
  <polygon points="10,38 10,102 36,102 36,38" fill="#111"/>
  <rect x="14" y="48" width="16" height="12" rx="1" fill="#FFE040" opacity="0.9"/>
  <rect x="14" y="68" width="16" height="10" rx="1" fill="#FFE040" opacity="0.9"/>
  <!-- black front face angled -->
  <polygon points="10,38 36,38 36,54 24,54" fill="#222"/>
  <polygon points="10,102 36,102 36,86 24,86" fill="#222"/>
  <!-- cab window -->
  <rect x="152" y="38" width="36" height="64" rx="4" fill="#777"/>
  <rect x="155" y="42" width="18" height="16" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- Siemens logo stripe -->
  <rect x="36" y="60" width="116" height="12" fill="#1a64cc"/>
  <!-- pantograph -->
  <line x1="90" y1="38" x2="86" y2="18" stroke="#888" stroke-width="1.5"/>
  <line x1="110" y1="38" x2="114" y2="18" stroke="#888" stroke-width="1.5"/>
  <line x1="84" y1="18" x2="116" y2="18" stroke="#aaa" stroke-width="2.5"/>
  {wheel(24, 110, 9, "#1a64cc", "#555", "#1a64cc")}
  {wheel(50, 110, 9, "#1a64cc", "#555", "#1a64cc")}
  {wheel(130, 110, 9, "#1a64cc", "#555", "#1a64cc")}
  {wheel(158, 110, 9, "#1a64cc", "#555", "#1a64cc")}
  {rail(5, 198)}
''', "Siemens Vectron · 2012")

# 76. obb-1116-taurus - ÖBB RED, aggressive angular ES64
SVGS["obb-1116-taurus"] = svg_wrap(f'''
  <!-- Siemens ES64 Taurus - very aggressive angular nose -->
  <rect x="10" y="38" width="178" height="64" rx="5" fill="#CC0000"/>
  <!-- very angular aggressive nose Taurus - key feature -->
  <polygon points="10,38 10,102 40,96 40,44" fill="#AA0000"/>
  <!-- diagonal headlight bars Taurus style -->
  <line x1="14" y1="48" x2="36" y2="54" stroke="#FFE040" stroke-width="4"/>
  <line x1="14" y1="92" x2="36" y2="86" stroke="#FFE040" stroke-width="4"/>
  <!-- white ÖBB stripe -->
  <rect x="40" y="58" width="148" height="16" fill="#fff"/>
  <line x1="10" y1="66" x2="42" y2="66" stroke="#fff" stroke-width="16" opacity="0.5"/>
  <rect x="152" y="38" width="36" height="64" rx="4" fill="#AA0000"/>
  <rect x="155" y="42" width="18" height="16" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- pantograph -->
  <line x1="90" y1="38" x2="86" y2="18" stroke="#888" stroke-width="1.5"/>
  <line x1="110" y1="38" x2="114" y2="18" stroke="#888" stroke-width="1.5"/>
  <line x1="84" y1="18" x2="116" y2="18" stroke="#aaa" stroke-width="2.5"/>
  {wheel(24, 110, 9, "#fff", "#880000", "#fff")}
  {wheel(50, 110, 9, "#fff", "#880000", "#fff")}
  {wheel(130, 110, 9, "#fff", "#880000", "#fff")}
  {wheel(158, 110, 9, "#fff", "#880000", "#fff")}
  {rail(5, 198)}
''', "ÖBB 1116 Taurus · 1999")

# 77. fs-etr-500 - FRECCIAROSSA RED/white power car
SVGS["fs-etr-500"] = svg_wrap(f'''
  <!-- Frecciarossa ETR 500 power car at front -->
  <!-- pointed nose red/white -->
  <path d="M8,68 Q16,44 36,38 L188,38 L188,68 L188,98 L36,98 Q16,92 8,68 Z" fill="#CC0000"/>
  <!-- white upper half -->
  <rect x="36" y="38" width="152" height="30" rx="0" fill="#fff"/>
  <path d="M8,68 Q14,50 32,46 L36,46 L36,38 Q20,42 10,56 Z" fill="#fff"/>
  <!-- red lower half -->
  <path d="M8,68 Q14,86 32,90 L36,90 L36,98 Q20,94 10,80 Z" fill="#AA0000"/>
  <!-- very pointed nose ETR500 -->
  <path d="M8,68 Q12,52 22,48 L22,88 Q12,84 8,68 Z" fill="#CC0000"/>
  <circle cx="12" cy="68" r="5" fill="#FFE040" opacity="0.9"/>
  <!-- cab window -->
  <rect x="30" y="44" width="18" height="14" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- pantograph -->
  <line x1="90" y1="38" x2="86" y2="20" stroke="#888" stroke-width="1.5"/>
  <line x1="110" y1="38" x2="114" y2="20" stroke="#888" stroke-width="1.5"/>
  <line x1="84" y1="20" x2="116" y2="20" stroke="#aaa" stroke-width="2.5"/>
  {wheel(28, 106, 9, "#CC0000", "#fff", "#CC0000")}
  {wheel(54, 106, 9, "#CC0000", "#fff", "#CC0000")}
  {wheel(120, 106, 9, "#CC0000", "#fff", "#CC0000")}
  {wheel(160, 106, 9, "#CC0000", "#fff", "#CC0000")}
  {rail(5, 198)}
''', "FS ETR 500 Frecciarossa · 1997")

# 78. wap-7-india - Indian BLUE/CREAM electric, pantograph
SVGS["wap-7-india"] = svg_wrap(f'''
  <path d="M10,68 Q18,42 36,38 L185,38 L188,68 L185,98 L36,98 Q18,94 10,68 Z" fill="#1a4a9c"/>
  <!-- cream band WAP-7 style -->
  <rect x="36" y="58" width="152" height="20" fill="#F5F5DC"/>
  <path d="M10,68 Q14,62 28,60 L28,76 Q14,74 10,68 Z" fill="#F5F5DC"/>
  <!-- Indian flag colors on nose -->
  <rect x="13" y="50" width="18" height="6" fill="#FF9933"/>
  <rect x="13" y="56" width="18" height="6" fill="#fff"/>
  <rect x="13" y="62" width="18" height="6" fill="#138808"/>
  <!-- Ashoka chakra blue dot -->
  <circle cx="22" cy="74" r="4" fill="#000080"/>
  <rect x="152" y="38" width="36" height="60" rx="4" fill="#163a7c"/>
  <rect x="155" y="42" width="18" height="16" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- pantograph -->
  <line x1="80" y1="38" x2="76" y2="20" stroke="#888" stroke-width="1.5"/>
  <line x1="100" y1="38" x2="104" y2="20" stroke="#888" stroke-width="1.5"/>
  <line x1="74" y1="20" x2="106" y2="20" stroke="#aaa" stroke-width="2.5"/>
  {wheel(28, 106, 9, "#F5F5DC", "#1a3a7c", "#F5F5DC")}
  {wheel(54, 106, 9, "#F5F5DC", "#1a3a7c", "#F5F5DC")}
  {wheel(130, 106, 9, "#F5F5DC", "#1a3a7c", "#F5F5DC")}
  {wheel(158, 106, 9, "#F5F5DC", "#1a3a7c", "#F5F5DC")}
  {rail(5, 198)}
''', "WAP-7 India · 1999")

# 79. stadler-flirt - RED/white low-floor distinctive nose
SVGS["stadler-flirt"] = svg_wrap(f'''
  <!-- Stadler FLIRT: distinctive low-floor, angled nose -->
  <path d="M10,68 Q14,50 28,44 L185,44 L188,68 L185,92 L28,92 Q14,86 10,68 Z" fill="#CC0000"/>
  <!-- white upper section -->
  <rect x="28" y="44" width="160" height="24" rx="0" fill="#fff"/>
  <path d="M10,68 Q13,56 22,52 L26,52 L26,44 L28,44 Q16,50 10,62 Z" fill="#fff"/>
  <!-- red lower section -->
  <!-- large windshield - FLIRT feature -->
  <rect x="14" y="50" width="24" height="20" rx="2" fill="#87CEEB" opacity="0.8"/>
  <!-- Stadler logo area -->
  <rect x="152" y="44" width="36" height="48" rx="3" fill="#AA0000"/>
  <rect x="156" y="48" width="16" height="14" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- low-floor bogies: smaller wheels -->
  {wheel(32, 100, 7, "#CC0000", "#888", "#CC0000")}
  {wheel(56, 100, 7, "#CC0000", "#888", "#CC0000")}
  {wheel(100, 100, 7, "#CC0000", "#888", "#CC0000")}
  {wheel(140, 100, 7, "#CC0000", "#888", "#CC0000")}
  {wheel(166, 100, 7, "#CC0000", "#888", "#CC0000")}
  {rail(5, 198)}
''', "Stadler FLIRT · 2004")

# 80. alstom-coradia - blue/silver regional low-floor
SVGS["alstom-coradia"] = svg_wrap(f'''
  <!-- Coradia: regional EMU, blue/silver -->
  <path d="M10,68 Q16,48 30,44 L185,44 L188,68 L185,92 L30,92 Q16,88 10,68 Z" fill="#003399"/>
  <rect x="30" y="44" width="158" height="48" rx="0" fill="#003399"/>
  <!-- silver upper stripe -->
  <rect x="30" y="44" width="158" height="16" rx="0" fill="#C0C0C0"/>
  <path d="M10,68 Q13,56 22,52 L26,52 L26,58 Q16,60 12,68 Z" fill="#C0C0C0"/>
  <!-- windshield -->
  <rect x="14" y="50" width="22" height="16" rx="2" fill="#87CEEB" opacity="0.8"/>
  <!-- windows -->
  <rect x="38" y="58" width="10" height="12" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="54" y="58" width="10" height="12" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="70" y="58" width="10" height="12" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="86" y="58" width="10" height="12" rx="1" fill="#87CEEB" opacity="0.6"/>
  <!-- cab end -->
  <rect x="152" y="44" width="36" height="48" rx="3" fill="#002288"/>
  <rect x="156" y="48" width="16" height="14" rx="2" fill="#87CEEB" opacity="0.7"/>
  {wheel(30, 100, 7, "#C0C0C0", "#002288", "#C0C0C0")}
  {wheel(54, 100, 7, "#C0C0C0", "#002288", "#C0C0C0")}
  {wheel(100, 100, 7, "#C0C0C0", "#002288", "#C0C0C0")}
  {wheel(140, 100, 7, "#C0C0C0", "#002288", "#C0C0C0")}
  {wheel(166, 100, 7, "#C0C0C0", "#002288", "#C0C0C0")}
  {rail(5, 198)}
''', "Alstom Coradia · 2000")

# 81. siemens-desiro - blue/gray DMU distinctive nose
SVGS["siemens-desiro"] = svg_wrap(f'''
  <!-- Desiro: regional DMU, blue/gray with distinct rounded nose -->
  <path d="M10,68 Q18,46 34,42 L185,42 L188,68 L185,94 L34,94 Q18,90 10,68 Z" fill="#3a6aa0"/>
  <rect x="34" y="42" width="154" height="52" rx="0" fill="#3a6aa0"/>
  <!-- gray upper area -->
  <rect x="34" y="42" width="154" height="18" rx="0" fill="#888"/>
  <path d="M10,68 Q14,54 26,50 L30,50 L30,58 Q18,60 12,68 Z" fill="#888"/>
  <!-- windshield large -->
  <rect x="14" y="48" width="24" height="18" rx="3" fill="#87CEEB" opacity="0.8"/>
  <!-- Desiro diagonal headlight strip -->
  <line x1="12" y1="76" x2="32" y2="82" stroke="#FFE040" stroke-width="3"/>
  <!-- windows -->
  <rect x="42" y="58" width="10" height="12" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="58" y="58" width="10" height="12" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="74" y="58" width="10" height="12" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="152" y="42" width="36" height="52" rx="3" fill="#2a5a90"/>
  <rect x="156" y="46" width="16" height="14" rx="2" fill="#87CEEB" opacity="0.7"/>
  {wheel(30, 102, 7, "#888", "#2a5a90", "#888")}
  {wheel(54, 102, 7, "#888", "#2a5a90", "#888")}
  {wheel(100, 102, 7, "#888", "#2a5a90", "#888")}
  {wheel(140, 102, 7, "#888", "#2a5a90", "#888")}
  {wheel(166, 102, 7, "#888", "#2a5a90", "#888")}
  {rail(5, 198)}
''', "Siemens Desiro · 2002")

# 82. sj-x2-sweden - Swedish tilting WHITE/BLUE pointed nose
SVGS["sj-x2"] = svg_wrap(f'''
  <!-- X2000 tilting train, very pointed white nose -->
  <path d="M8,68 Q18,44 42,38 L185,38 L188,68 L185,98 L42,98 Q18,92 8,68 Z" fill="#fff"/>
  <!-- blue stripe SJ -->
  <rect x="42" y="58" width="146" height="20" fill="#003399"/>
  <path d="M8,68 Q14,60 30,58 L42,58 Q28,64 16,68 Q28,72 42,78 L30,78 Q14,76 8,68 Z" fill="#003399"/>
  <!-- very pointed nose different from ICE -->
  <path d="M8,68 Q14,50 32,46 L36,48 Q20,52 14,68 Z" fill="#eee"/>
  <path d="M8,68 Q14,86 32,90 L36,88 Q20,84 14,68 Z" fill="#eee"/>
  <!-- yellow SJ headlight stripe -->
  <rect x="10" y="64" width="28" height="8" fill="#FFD700"/>
  <!-- cab window -->
  <rect x="152" y="42" width="36" height="56" rx="4" fill="#003399"/>
  <rect x="156" y="46" width="18" height="16" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- pantograph -->
  <line x1="90" y1="38" x2="86" y2="20" stroke="#888" stroke-width="1.5"/>
  <line x1="108" y1="38" x2="112" y2="20" stroke="#888" stroke-width="1.5"/>
  <line x1="84" y1="20" x2="114" y2="20" stroke="#aaa" stroke-width="2.5"/>
  {wheel(38, 106, 8, "#003399", "#ccc", "#003399")}
  {wheel(62, 106, 8, "#003399", "#ccc", "#003399")}
  {wheel(110, 106, 8, "#003399", "#ccc", "#003399")}
  {wheel(148, 106, 8, "#003399", "#ccc", "#003399")}
  {wheel(172, 106, 8, "#003399", "#ccc", "#003399")}
  {rail(5, 198)}
''', "SJ X2 Sweden · 1990")

# cc300-indonesia - electric loco blue modern pantograph
SVGS["cc300-indonesia"] = svg_wrap(f'''
  <!-- CC300 modern electric Indonesia, blue -->
  <path d="M10,68 Q20,42 40,38 L185,38 L188,68 L185,98 L40,98 Q20,94 10,68 Z" fill="#1a5cab"/>
  <polygon points="10,38 10,98 38,90 38,46" fill="#1448a0"/>
  <rect x="14" y="50" width="18" height="14" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- orange KAI stripe -->
  <rect x="38" y="62" width="150" height="12" fill="#FF6600"/>
  <rect x="10" y="62" width="30" height="12" fill="#FF6600"/>
  <rect x="152" y="38" width="36" height="60" rx="4" fill="#1448a0"/>
  <rect x="155" y="42" width="18" height="16" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- prominent modern pantograph CC300 -->
  <line x1="70" y1="38" x2="64" y2="18" stroke="#aaa" stroke-width="2"/>
  <line x1="100" y1="38" x2="106" y2="18" stroke="#aaa" stroke-width="2"/>
  <line x1="62" y1="18" x2="108" y2="18" stroke="#ccc" stroke-width="3"/>
  <line x1="85" y1="18" x2="85" y2="10" stroke="#aaa" stroke-width="1.5"/>
  <line x1="76" y1="10" x2="94" y2="10" stroke="#ccc" stroke-width="2.5"/>
  {wheel(26, 106, 9, "#FF6600", "#1a3a7c", "#FF6600")}
  {wheel(52, 106, 9, "#FF6600", "#1a3a7c", "#FF6600")}
  {wheel(80, 106, 9, "#FF6600", "#1a3a7c", "#FF6600")}
  {wheel(112, 106, 9, "#FF6600", "#1a3a7c", "#FF6600")}
  {wheel(148, 106, 9, "#FF6600", "#1a3a7c", "#FF6600")}
  {wheel(174, 106, 9, "#FF6600", "#1a3a7c", "#FF6600")}
  {rail(5, 198)}
''', "CC300 Indonesia · 2018")

print("Modern electric loco batch: OK")

# ============================================================
# HSR - TGV FAMILY
# ============================================================

# 83. tgv-atlantique - silver/navy blue, orange stripe lower
SVGS["tgv-atlantique"] = svg_wrap(f'''
  <!-- TGV Atlantique: silver + navy, orange lower stripe -->
  <path d="M8,68 Q18,44 44,38 L185,38 L188,68 L185,98 L44,98 Q18,92 8,68 Z" fill="#C0C0C0"/>
  <!-- navy top section -->
  <rect x="44" y="38" width="144" height="22" rx="0" fill="#003082"/>
  <path d="M8,68 Q16,52 36,46 L44,46 L44,38 Q24,44 14,58 Z" fill="#003082"/>
  <!-- orange lower stripe - key difference from TGV Sud-Est -->
  <rect x="44" y="82" width="144" height="10" fill="#FF6600"/>
  <path d="M8,68 Q14,78 32,84 L44,84 L44,92 Q24,88 12,76 Z" fill="#FF6600"/>
  <!-- power car nose -->
  <path d="M8,68 Q14,54 30,50 L34,52 Q18,56 12,68 Z" fill="#aaa"/>
  <path d="M8,68 Q14,82 30,86 L34,84 Q18,80 12,68 Z" fill="#aaa"/>
  <!-- cab window -->
  <rect x="26" y="46" width="20" height="16" rx="2" fill="#87CEEB" opacity="0.7"/>
  <circle cx="12" cy="68" r="5" fill="#FFE040" opacity="0.9"/>
  {wheel(38, 106, 8, "#003082", "#aaa", "#003082")}
  {wheel(62, 106, 8, "#003082", "#aaa", "#003082")}
  {wheel(110, 106, 8, "#003082", "#aaa", "#003082")}
  {wheel(150, 106, 8, "#003082", "#aaa", "#003082")}
  {wheel(174, 106, 8, "#003082", "#aaa", "#003082")}
  {rail(5, 198)}
''', "TGV Atlantique · 1989")

# 84. tgv-duplex - DOUBLE-DECK body visibly taller
SVGS["tgv-duplex"] = svg_wrap(f'''
  <!-- Duplex: taller double-deck body - key visual feature -->
  <path d="M8,65 Q18,36 44,30 L185,30 L188,65 L185,100 L44,100 Q18,94 8,65 Z" fill="#C0C0C0"/>
  <!-- navy sections -->
  <rect x="44" y="30" width="144" height="22" rx="0" fill="#003082"/>
  <path d="M8,65 Q16,44 38,38 L44,38 L44,30 Q22,38 12,52 Z" fill="#003082"/>
  <!-- deck division line - visible double deck indicator -->
  <rect x="44" y="62" width="144" height="4" fill="#555"/>
  <path d="M8,65 Q12,63 34,63 L44,65 L44,66 L34,64 Q14,64 10,66 Z" fill="#555"/>
  <!-- upper deck windows -->
  <rect x="52" y="34" width="10" height="12" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="68" y="34" width="10" height="12" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="84" y="34" width="10" height="12" rx="1" fill="#87CEEB" opacity="0.6"/>
  <!-- lower deck windows -->
  <rect x="52" y="68" width="10" height="12" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="68" y="68" width="10" height="12" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="84" y="68" width="10" height="12" rx="1" fill="#87CEEB" opacity="0.6"/>
  <!-- cab window -->
  <rect x="24" y="38" width="22" height="18" rx="2" fill="#87CEEB" opacity="0.7"/>
  <circle cx="12" cy="65" r="5" fill="#FFE040" opacity="0.9"/>
  {wheel(38, 108, 8, "#003082", "#aaa", "#003082")}
  {wheel(62, 108, 8, "#003082", "#aaa", "#003082")}
  {wheel(110, 108, 8, "#003082", "#aaa", "#003082")}
  {wheel(150, 108, 8, "#003082", "#aaa", "#003082")}
  {wheel(174, 108, 8, "#003082", "#aaa", "#003082")}
  {rail(5, 198)}
''', "TGV Duplex · 1995")

# 85. tgv-euroduplex - navy blue + silver updated
SVGS["tgv-euroduplex"] = svg_wrap(f'''
  <!-- Euroduplex: darker navy + updated nose profile -->
  <path d="M8,65 Q20,36 48,30 L185,30 L188,65 L185,100 L48,100 Q20,94 8,65 Z" fill="#003082"/>
  <!-- silver nose tip -->
  <path d="M8,65 Q16,48 36,44 L42,46 Q24,50 14,65 Z" fill="#C0C0C0"/>
  <path d="M8,65 Q16,82 36,86 L42,84 Q24,80 14,65 Z" fill="#C0C0C0"/>
  <!-- silver stripe -->
  <rect x="48" y="56" width="140" height="18" fill="#C0C0C0"/>
  <path d="M8,65 Q12,60 26,58 L42,58 L42,74 L26,72 Q12,70 8,65 Z" fill="#C0C0C0"/>
  <!-- double deck indicator -->
  <rect x="48" y="64" width="140" height="3" fill="#002060"/>
  <!-- windows upper/lower -->
  <rect x="55" y="34" width="10" height="12" rx="1" fill="#87CEEB" opacity="0.5"/>
  <rect x="71" y="34" width="10" height="12" rx="1" fill="#87CEEB" opacity="0.5"/>
  <rect x="55" y="68" width="10" height="12" rx="1" fill="#87CEEB" opacity="0.5"/>
  <rect x="71" y="68" width="10" height="12" rx="1" fill="#87CEEB" opacity="0.5"/>
  <rect x="26" y="38" width="22" height="18" rx="2" fill="#87CEEB" opacity="0.7"/>
  <circle cx="12" cy="65" r="5" fill="#FFE040" opacity="0.9"/>
  {wheel(40, 108, 8, "#C0C0C0", "#002060", "#C0C0C0")}
  {wheel(64, 108, 8, "#C0C0C0", "#002060", "#C0C0C0")}
  {wheel(112, 108, 8, "#C0C0C0", "#002060", "#C0C0C0")}
  {wheel(152, 108, 8, "#C0C0C0", "#002060", "#C0C0C0")}
  {wheel(176, 108, 8, "#C0C0C0", "#002060", "#C0C0C0")}
  {rail(5, 198)}
''', "TGV Euroduplex · 2011")

# 86. tgv-inoui - new branding dark navy/light stripe
SVGS["tgv-inoui"] = svg_wrap(f'''
  <!-- TGV inoui: dark navy/light gray stripe, new 2024 branding -->
  <path d="M8,65 Q20,36 48,30 L185,30 L188,65 L185,100 L48,100 Q20,94 8,65 Z" fill="#1a1a3a"/>
  <!-- light diagonal stripe inoui brand -->
  <path d="M48,60 L185,60 L185,75 L48,75 Q28,72 14,65 Q28,58 48,60 Z" fill="#e0e0e0"/>
  <!-- nose light color -->
  <path d="M8,65 Q16,50 34,46 L38,48 Q22,52 14,65 Z" fill="#e0e0e0"/>
  <path d="M8,65 Q16,80 34,84 L38,82 Q22,78 14,65 Z" fill="#e0e0e0"/>
  <!-- inoui coral/salmon accent -->
  <rect x="48" y="30" width="140" height="10" fill="#E05A70"/>
  <!-- windows -->
  <rect x="55" y="40" width="10" height="14" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="71" y="40" width="10" height="14" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="87" y="40" width="10" height="14" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="26" y="38" width="22" height="18" rx="2" fill="#87CEEB" opacity="0.7"/>
  <circle cx="12" cy="65" r="5" fill="#FFE040" opacity="0.9"/>
  {wheel(40, 108, 8, "#e0e0e0", "#1a1a3a", "#e0e0e0")}
  {wheel(64, 108, 8, "#e0e0e0", "#1a1a3a", "#e0e0e0")}
  {wheel(112, 108, 8, "#e0e0e0", "#1a1a3a", "#e0e0e0")}
  {wheel(152, 108, 8, "#e0e0e0", "#1a1a3a", "#e0e0e0")}
  {wheel(176, 108, 8, "#e0e0e0", "#1a1a3a", "#e0e0e0")}
  {rail(5, 198)}
''', "TGV inoui · 2024")

# ============================================================
# HSR - ICE FAMILY
# ============================================================

# 87. ice-1 - very long rounded nose, white, long power car
SVGS["ice-1"] = svg_wrap(f'''
  <!-- ICE 1: very long power car, very rounded smooth nose -->
  <path d="M8,68 Q22,42 52,36 L185,36 L188,68 L185,100 L52,100 Q22,94 8,68 Z" fill="#F8F8F8"/>
  <!-- very long nose gradual curve - key ICE1 feature -->
  <path d="M8,68 Q18,50 40,44 L52,44 L52,36 Q30,42 16,58 Z" fill="#eee"/>
  <!-- red stripe ICE -->
  <rect x="52" y="76" width="136" height="8" fill="#CC0000"/>
  <path d="M8,68 Q14,76 30,80 L52,80 L52,84 Q28,82 14,74 Z" fill="#CC0000"/>
  <!-- ICE lettering area -->
  <rect x="60" y="58" width="30" height="14" rx="2" fill="#eee"/>
  <!-- cab window -->
  <rect x="24" y="44" width="26" height="20" rx="3" fill="#87CEEB" opacity="0.7"/>
  <circle cx="11" cy="68" r="6" fill="#FFE040" opacity="0.9"/>
  {wheel(44, 108, 9, "#CC0000", "#ddd", "#CC0000")}
  {wheel(70, 108, 9, "#CC0000", "#ddd", "#CC0000")}
  {wheel(115, 108, 9, "#CC0000", "#ddd", "#CC0000")}
  {wheel(155, 108, 9, "#CC0000", "#ddd", "#CC0000")}
  {wheel(178, 108, 9, "#CC0000", "#ddd", "#CC0000")}
  {rail(5, 198)}
''', "ICE 1 · 1991")

# 88. ice-2 - shorter nose than ICE1, single power car
SVGS["ice-2"] = svg_wrap(f'''
  <!-- ICE 2: shorter power car, slightly different nose -->
  <path d="M8,68 Q20,44 46,38 L185,38 L188,68 L185,98 L46,98 Q20,92 8,68 Z" fill="#F8F8F8"/>
  <path d="M8,68 Q16,52 36,46 L46,46 L46,38 Q26,44 14,60 Z" fill="#eee"/>
  <!-- red stripe -->
  <rect x="46" y="78" width="142" height="7" fill="#CC0000"/>
  <path d="M8,68 Q14,74 28,78 L46,78 L46,85 Q26,82 12,72 Z" fill="#CC0000"/>
  <!-- ICE 2 has slightly shorter nose -->
  <rect x="54" y="58" width="28" height="12" rx="2" fill="#eee"/>
  <rect x="24" y="44" width="24" height="18" rx="3" fill="#87CEEB" opacity="0.7"/>
  <circle cx="11" cy="68" r="6" fill="#FFE040" opacity="0.9"/>
  {wheel(40, 106, 9, "#CC0000", "#ddd", "#CC0000")}
  {wheel(64, 106, 9, "#CC0000", "#ddd", "#CC0000")}
  {wheel(110, 106, 9, "#CC0000", "#ddd", "#CC0000")}
  {wheel(150, 106, 9, "#CC0000", "#ddd", "#CC0000")}
  {wheel(174, 106, 9, "#CC0000", "#ddd", "#CC0000")}
  {rail(5, 198)}
''', "ICE 2 · 1997")

# 89. ice-4 - wider body, rectangular nose, no separate locomotive
SVGS["ice-4"] = svg_wrap(f'''
  <!-- ICE 4: wider body EMU, no separate loco, rectangular nose -->
  <path d="M8,68 Q18,46 38,40 L185,40 L188,68 L185,96 L38,96 Q18,90 8,68 Z" fill="#F8F8F8"/>
  <!-- more rectangular nose ICE4 vs 1/2/3 -->
  <rect x="8" y="48" width="34" height="40" rx="4" fill="#F0F0F0"/>
  <!-- wide body visible -->
  <rect x="38" y="40" width="150" height="56" rx="0" fill="#F8F8F8"/>
  <!-- red stripe bottom -->
  <rect x="38" y="82" width="150" height="8" fill="#CC0000"/>
  <rect x="8" y="82" width="32" height="8" fill="#CC0000"/>
  <!-- ICE 4 wider cab window -->
  <rect x="12" y="50" width="26" height="22" rx="3" fill="#87CEEB" opacity="0.7"/>
  <!-- no power car - different look -->
  <rect x="155" y="40" width="33" height="56" rx="3" fill="#F0F0F0"/>
  <rect x="158" y="44" width="20" height="18" rx="3" fill="#87CEEB" opacity="0.7"/>
  <!-- pantograph on roof (EMU) -->
  <line x1="90" y1="40" x2="86" y2="22" stroke="#888" stroke-width="1.5"/>
  <line x1="110" y1="40" x2="114" y2="22" stroke="#888" stroke-width="1.5"/>
  <line x1="84" y1="22" x2="116" y2="22" stroke="#aaa" stroke-width="2.5"/>
  {wheel(24, 104, 8, "#CC0000", "#ddd", "#CC0000")}
  {wheel(48, 104, 8, "#CC0000", "#ddd", "#CC0000")}
  {wheel(100, 104, 8, "#CC0000", "#ddd", "#CC0000")}
  {wheel(140, 104, 8, "#CC0000", "#ddd", "#CC0000")}
  {wheel(168, 104, 8, "#CC0000", "#ddd", "#CC0000")}
  {rail(5, 198)}
''', "ICE 4 · 2017")

# ============================================================
# HSR OTHERS
# ============================================================

# 90. eurostar-e300 - DARK NAVY + yellow stripe, pointed TGV-based
SVGS["eurostar-e300"] = svg_wrap(f'''
  <!-- Eurostar E300: dark navy/blue, yellow stripe, very pointed -->
  <path d="M8,68 Q20,40 48,34 L185,34 L188,68 L185,102 L48,102 Q20,96 8,68 Z" fill="#003082"/>
  <!-- yellow Eurostar stripe -->
  <rect x="48" y="60" width="140" height="16" fill="#FFD700"/>
  <path d="M8,68 Q14,62 32,60 L48,60 L48,76 L32,76 Q14,74 8,68 Z" fill="#FFD700"/>
  <!-- darker navy lower -->
  <path d="M8,68 Q14,80 30,86 L48,86 L48,102 Q24,98 10,84 Z" fill="#001a50"/>
  <!-- very pointed nose -->
  <path d="M8,68 Q16,50 34,44 L40,46 Q22,52 12,68 Z" fill="#002060"/>
  <rect x="26" y="42" width="22" height="18" rx="2" fill="#87CEEB" opacity="0.7"/>
  <circle cx="11" cy="68" r="5" fill="#FFE040" opacity="0.9"/>
  {wheel(40, 110, 8, "#FFD700", "#002060", "#FFD700")}
  {wheel(64, 110, 8, "#FFD700", "#002060", "#FFD700")}
  {wheel(110, 110, 8, "#FFD700", "#002060", "#FFD700")}
  {wheel(150, 110, 8, "#FFD700", "#002060", "#FFD700")}
  {wheel(174, 110, 8, "#FFD700", "#002060", "#FFD700")}
  {rail(5, 198)}
''', "Eurostar E300 · 1994")

# 91. eurostar-e320 - updated livery dark blue/silver, Velaro-based
SVGS["eurostar-e320"] = svg_wrap(f'''
  <!-- E320 Velaro based, different more rounded profile than E300 -->
  <path d="M8,68 Q20,44 44,38 L185,38 L188,68 L185,98 L44,98 Q20,92 8,68 Z" fill="#1a1a4a"/>
  <!-- silver band Velaro -->
  <rect x="44" y="56" width="144" height="24" fill="#C0C0C0"/>
  <path d="M8,68 Q14,62 30,58 L44,58 L44,80 L30,78 Q14,74 8,68 Z" fill="#C0C0C0"/>
  <!-- gold accent E320 -->
  <rect x="44" y="56" width="144" height="4" fill="#FFD700"/>
  <rect x="44" y="76" width="144" height="4" fill="#FFD700"/>
  <!-- less pointed than E300 - Velaro nose -->
  <path d="M8,68 Q16,52 34,46 L40,48 Q22,54 14,68 Z" fill="#0f0f30"/>
  <rect x="26" y="44" width="22" height="18" rx="2" fill="#87CEEB" opacity="0.7"/>
  <circle cx="11" cy="68" r="5" fill="#FFE040" opacity="0.9"/>
  {wheel(38, 106, 8, "#FFD700", "#1a1a4a", "#FFD700")}
  {wheel(62, 106, 8, "#FFD700", "#1a1a4a", "#FFD700")}
  {wheel(108, 106, 8, "#FFD700", "#1a1a4a", "#FFD700")}
  {wheel(148, 106, 8, "#FFD700", "#1a1a4a", "#FFD700")}
  {wheel(172, 106, 8, "#FFD700", "#1a1a4a", "#FFD700")}
  {rail(5, 198)}
''', "Eurostar E320 · 2015")

# 92. renfe-ave-100 - white/red/yellow TGV-based Spanish
SVGS["renfe-ave-100"] = svg_wrap(f'''
  <!-- AVE 100: white/red/yellow Spanish, TGV based -->
  <path d="M8,68 Q20,42 46,36 L185,36 L188,68 L185,100 L46,100 Q20,94 8,68 Z" fill="#F8F8F8"/>
  <!-- red upper Spanish flag -->
  <rect x="46" y="36" width="142" height="18" rx="0" fill="#CC0000"/>
  <path d="M8,68 Q16,50 34,44 L46,44 L46,36 Q26,42 12,56 Z" fill="#CC0000"/>
  <!-- yellow stripe -->
  <rect x="46" y="78" width="142" height="10" fill="#FFD700"/>
  <path d="M8,68 Q14,74 28,78 L46,78 L46,88 Q26,86 12,78 Z" fill="#FFD700"/>
  <rect x="26" y="44" width="22" height="18" rx="2" fill="#87CEEB" opacity="0.7"/>
  <circle cx="11" cy="68" r="5" fill="#FFE040" opacity="0.9"/>
  {wheel(40, 108, 9, "#CC0000", "#ddd", "#CC0000")}
  {wheel(64, 108, 9, "#CC0000", "#ddd", "#CC0000")}
  {wheel(110, 108, 9, "#CC0000", "#ddd", "#CC0000")}
  {wheel(150, 108, 9, "#CC0000", "#ddd", "#CC0000")}
  {wheel(174, 108, 9, "#CC0000", "#ddd", "#CC0000")}
  {rail(5, 198)}
''', "RENFE AVE 100 · 1992")

# 93. ave-103-velaro-e - RED/silver Velaro, very different from AVE100
SVGS["ave-103-velaro-e"] = svg_wrap(f'''
  <!-- AVE 103 Velaro: all RED, silver stripe, Siemens nose profile -->
  <path d="M8,68 Q20,44 44,38 L185,38 L188,68 L185,98 L44,98 Q20,92 8,68 Z" fill="#CC0000"/>
  <!-- silver Velaro stripe -->
  <rect x="44" y="58" width="144" height="20" fill="#C0C0C0"/>
  <path d="M8,68 Q14,62 30,58 L44,58 L44,78 L30,76 Q14,74 8,68 Z" fill="#C0C0C0"/>
  <!-- Velaro nose profile - key diff from AVE100 -->
  <path d="M8,68 Q16,52 34,46 L40,48 Q22,54 14,68 Z" fill="#AA0000"/>
  <path d="M8,68 Q16,84 34,90 L40,88 Q22,82 14,68 Z" fill="#AA0000"/>
  <rect x="26" y="46" width="22" height="16" rx="2" fill="#87CEEB" opacity="0.7"/>
  <circle cx="11" cy="68" r="5" fill="#FFE040" opacity="0.9"/>
  {wheel(38, 106, 9, "#C0C0C0", "#AA0000", "#C0C0C0")}
  {wheel(62, 106, 9, "#C0C0C0", "#AA0000", "#C0C0C0")}
  {wheel(108, 106, 9, "#C0C0C0", "#AA0000", "#C0C0C0")}
  {wheel(148, 106, 9, "#C0C0C0", "#AA0000", "#C0C0C0")}
  {wheel(172, 106, 9, "#C0C0C0", "#AA0000", "#C0C0C0")}
  {rail(5, 198)}
''', "AVE 103 Velaro E · 2006")

# 94. ns-intercity-direct - YELLOW/blue Dutch Fyra style
SVGS["ns-intercity-direct"] = svg_wrap(f'''
  <!-- Dutch IC Direct Fyra style: yellow/blue -->
  <path d="M8,68 Q20,44 44,38 L185,38 L188,68 L185,98 L44,98 Q20,92 8,68 Z" fill="#003082"/>
  <!-- yellow NS stripe -->
  <rect x="44" y="56" width="144" height="24" fill="#FFD700"/>
  <path d="M8,68 Q14,62 30,58 L44,58 L44,80 L30,78 Q14,74 8,68 Z" fill="#FFD700"/>
  <!-- blue lower -->
  <rect x="44" y="80" width="144" height="18" rx="0" fill="#001a50"/>
  <path d="M8,68 Q14,76 28,80 L44,80 L44,98 Q24,94 10,82 Z" fill="#001a50"/>
  <rect x="26" y="44" width="22" height="16" rx="2" fill="#87CEEB" opacity="0.7"/>
  <circle cx="11" cy="68" r="5" fill="#FFE040" opacity="0.9"/>
  {wheel(38, 106, 8, "#FFD700", "#001a50", "#FFD700")}
  {wheel(62, 106, 8, "#FFD700", "#001a50", "#FFD700")}
  {wheel(108, 106, 8, "#FFD700", "#001a50", "#FFD700")}
  {wheel(148, 106, 8, "#FFD700", "#001a50", "#FFD700")}
  {wheel(172, 106, 8, "#FFD700", "#001a50", "#FFD700")}
  {rail(5, 198)}
''', "NS Intercity Direct · 2012")

# 95. trenitalia-italo - NTV RED teardrop nose, very distinctive
SVGS["trenitalia-italo"] = svg_wrap(f'''
  <!-- Italo NTV: very distinctive RED teardrop nose -->
  <path d="M8,68 Q22,38 52,30 L185,30 L188,68 L185,106 L52,106 Q22,98 8,68 Z" fill="#CC0000"/>
  <!-- teardrop nose shape - very round wide -->
  <path d="M8,68 Q20,44 48,36 L52,36 L52,30 Q26,38 12,56 Z" fill="#AA0000"/>
  <!-- white teardrop highlight -->
  <ellipse cx="30" cy="52" rx="10" ry="14" fill="#FF2222" opacity="0.5"/>
  <!-- silver lower -->
  <rect x="52" y="84" width="136" height="14" rx="0" fill="#C0C0C0"/>
  <path d="M8,68 Q18,84 42,90 L52,90 L52,106 Q26,100 10,86 Z" fill="#C0C0C0"/>
  <!-- windows -->
  <rect x="60" y="36" width="12" height="16" rx="2" fill="#87CEEB" opacity="0.6"/>
  <rect x="78" y="36" width="12" height="16" rx="2" fill="#87CEEB" opacity="0.6"/>
  <rect x="96" y="36" width="12" height="16" rx="2" fill="#87CEEB" opacity="0.6"/>
  <!-- cab -->
  <rect x="28" y="38" width="26" height="20" rx="3" fill="#87CEEB" opacity="0.7"/>
  <circle cx="11" cy="68" r="6" fill="#FFE040" opacity="0.9"/>
  {wheel(44, 114, 9, "#C0C0C0", "#AA0000", "#C0C0C0")}
  {wheel(70, 114, 9, "#C0C0C0", "#AA0000", "#C0C0C0")}
  {wheel(116, 114, 9, "#C0C0C0", "#AA0000", "#C0C0C0")}
  {wheel(156, 114, 9, "#C0C0C0", "#AA0000", "#C0C0C0")}
  {wheel(180, 114, 9, "#C0C0C0", "#AA0000", "#C0C0C0")}
  {rail(5, 198)}
''', "Trenitalia Italo NTV · 2012")

# 96. acela-amtrak - silver/red tilting Amtrak nose
SVGS["acela-amtrak"] = svg_wrap(f'''
  <!-- Acela: silver/red Amtrak tilting, distinctive cab-over design -->
  <path d="M8,68 Q20,44 46,38 L185,38 L188,68 L185,98 L46,98 Q20,92 8,68 Z" fill="#C0C0C0"/>
  <!-- red Amtrak stripe -->
  <rect x="46" y="56" width="142" height="18" fill="#CC0000"/>
  <path d="M8,68 Q14,62 30,58 L46,58 L46,74 L30,74 Q14,74 8,68 Z" fill="#CC0000"/>
  <!-- blue lower Amtrak -->
  <rect x="46" y="74" width="142" height="18" rx="0" fill="#003099"/>
  <path d="M8,68 Q14,74 28,76 L46,76 L46,92 Q26,88 12,80 Z" fill="#003099"/>
  <!-- tilting bogie indicators (angled body) -->
  <line x1="46" y1="38" x2="44" y2="42" stroke="#aaa" stroke-width="2"/>
  <line x1="46" y1="98" x2="44" y2="94" stroke="#aaa" stroke-width="2"/>
  <!-- cab window -->
  <rect x="24" y="44" width="24" height="18" rx="3" fill="#87CEEB" opacity="0.7"/>
  <circle cx="11" cy="68" r="5" fill="#FFE040" opacity="0.9"/>
  {wheel(40, 106, 8, "#CC0000", "#aaa", "#CC0000")}
  {wheel(64, 106, 8, "#CC0000", "#aaa", "#CC0000")}
  {wheel(110, 106, 8, "#CC0000", "#aaa", "#CC0000")}
  {wheel(150, 106, 8, "#CC0000", "#aaa", "#CC0000")}
  {wheel(174, 106, 8, "#CC0000", "#aaa", "#CC0000")}
  {rail(5, 198)}
''', "Acela Amtrak · 2000")

# 97. bernina-express - RED narrow-gauge panoramic, RhB
SVGS["bernina-express"] = svg_wrap(f'''
  <!-- RhB Bernina narrow gauge: RED, panoramic windows -->
  <rect x="8" y="46" width="180" height="60" rx="6" fill="#CC0000"/>
  <!-- panoramic large windows - key feature -->
  <rect x="14" y="52" width="24" height="28" rx="3" fill="#87CEEB" opacity="0.8"/>
  <rect x="44" y="52" width="28" height="28" rx="3" fill="#87CEEB" opacity="0.8"/>
  <rect x="78" y="52" width="28" height="28" rx="3" fill="#87CEEB" opacity="0.8"/>
  <rect x="112" y="52" width="28" height="28" rx="3" fill="#87CEEB" opacity="0.8"/>
  <rect x="146" y="52" width="28" height="28" rx="3" fill="#87CEEB" opacity="0.8"/>
  <!-- white RhB stripe bottom -->
  <rect x="8" y="90" width="180" height="10" fill="#fff"/>
  <!-- narrow gauge small wheels -->
  {wheel(24, 114, 7, "#fff", "#880000", "#fff")}
  {wheel(48, 114, 7, "#fff", "#880000", "#fff")}
  {wheel(86, 114, 7, "#fff", "#880000", "#fff")}
  {wheel(110, 114, 7, "#fff", "#880000", "#fff")}
  {wheel(148, 114, 7, "#fff", "#880000", "#fff")}
  {wheel(172, 114, 7, "#fff", "#880000", "#fff")}
  {rail(5, 198)}
''', "Bernina Express · RhB")

# 98. glacier-express - RED narrow-gauge, LARGE panoramic windows
SVGS["glacier-express"] = svg_wrap(f'''
  <!-- Glacier Express: RED, very large panoramic windows -->
  <rect x="8" y="44" width="180" height="62" rx="6" fill="#CC0000"/>
  <!-- extra-large panoramic windows, taller than Bernina -->
  <rect x="14" y="48" width="22" height="36" rx="3" fill="#87CEEB" opacity="0.85"/>
  <rect x="42" y="48" width="30" height="36" rx="3" fill="#87CEEB" opacity="0.85"/>
  <rect x="78" y="48" width="30" height="36" rx="3" fill="#87CEEB" opacity="0.85"/>
  <rect x="114" y="48" width="30" height="36" rx="3" fill="#87CEEB" opacity="0.85"/>
  <rect x="150" y="48" width="30" height="36" rx="3" fill="#87CEEB" opacity="0.85"/>
  <!-- white strip base -->
  <rect x="8" y="90" width="180" height="12" fill="#fff"/>
  <!-- snow-capped mountains hint -->
  <polygon points="60,44 70,32 80,44" fill="#fff" opacity="0.3"/>
  <polygon points="100,44 112,28 124,44" fill="#fff" opacity="0.3"/>
  {wheel(26, 114, 7, "#fff", "#880000", "#fff")}
  {wheel(50, 114, 7, "#fff", "#880000", "#fff")}
  {wheel(90, 114, 7, "#fff", "#880000", "#fff")}
  {wheel(114, 114, 7, "#fff", "#880000", "#fff")}
  {wheel(152, 114, 7, "#fff", "#880000", "#fff")}
  {wheel(176, 114, 7, "#fff", "#880000", "#fff")}
  {rail(5, 198)}
''', "Glacier Express · 1930")

# 99. haramain-express - Talgo silver/dark green Saudi
SVGS["haramain-express"] = svg_wrap(f'''
  <!-- Haramain HSR: Talgo design, silver/dark green Saudi -->
  <path d="M8,68 Q20,44 46,38 L185,38 L188,68 L185,98 L46,98 Q20,92 8,68 Z" fill="#C8C8C8"/>
  <!-- dark green Saudi accent -->
  <rect x="46" y="38" width="142" height="24" rx="0" fill="#1a5c1a"/>
  <path d="M8,68 Q16,50 34,44 L46,44 L46,38 Q26,44 14,58 Z" fill="#1a5c1a"/>
  <!-- Talgo articulated: very low profile -->
  <rect x="46" y="80" width="142" height="14" rx="0" fill="#aaa"/>
  <!-- Arabic script style element -->
  <rect x="55" y="44" width="40" height="10" rx="2" fill="#FFD700" opacity="0.6"/>
  <rect x="26" y="44" width="22" height="18" rx="2" fill="#87CEEB" opacity="0.7"/>
  <circle cx="11" cy="68" r="5" fill="#FFE040" opacity="0.9"/>
  {wheel(40, 106, 8, "#1a5c1a", "#aaa", "#1a5c1a")}
  {wheel(64, 106, 8, "#1a5c1a", "#aaa", "#1a5c1a")}
  {wheel(110, 106, 8, "#1a5c1a", "#aaa", "#1a5c1a")}
  {wheel(150, 106, 8, "#1a5c1a", "#aaa", "#1a5c1a")}
  {wheel(174, 106, 8, "#1a5c1a", "#aaa", "#1a5c1a")}
  {rail(5, 198)}
''', "Haramain Express · 2018")

# 100. afrosiyob-uzbekistan - Talgo, blue/yellow
SVGS["afrosiyob-uzbekistan"] = svg_wrap(f'''
  <!-- Afrosiyob Talgo: Uzbek blue/yellow/white -->
  <path d="M8,68 Q20,44 44,38 L185,38 L188,68 L185,98 L44,98 Q20,92 8,68 Z" fill="#1a4a9c"/>
  <!-- yellow Uzbek stripe -->
  <rect x="44" y="62" width="144" height="12" fill="#FFD700"/>
  <path d="M8,68 Q14,64 28,62 L44,62 L44,74 L28,72 Q14,72 8,68 Z" fill="#FFD700"/>
  <!-- white lower -->
  <rect x="44" y="74" width="144" height="18" rx="0" fill="#fff"/>
  <path d="M8,68 Q14,72 28,76 L44,76 L44,98 Q24,94 10,82 Z" fill="#fff"/>
  <rect x="26" y="44" width="22" height="18" rx="2" fill="#87CEEB" opacity="0.7"/>
  <circle cx="11" cy="68" r="5" fill="#FFE040" opacity="0.9"/>
  {wheel(38, 106, 8, "#FFD700", "#1a4a9c", "#FFD700")}
  {wheel(62, 106, 8, "#FFD700", "#1a4a9c", "#FFD700")}
  {wheel(108, 106, 8, "#FFD700", "#1a4a9c", "#FFD700")}
  {wheel(148, 106, 8, "#FFD700", "#1a4a9c", "#FFD700")}
  {wheel(172, 106, 8, "#FFD700", "#1a4a9c", "#FFD700")}
  {rail(5, 198)}
''', "Afrosiyob Uzbekistan · 2011")

# 101. hsr-taiwan - THSR white/gray JR-based
SVGS["hsr-taiwan"] = svg_wrap(f'''
  <!-- THSR: white + gray stripe, JR700-series derived -->
  <path d="M8,68 Q20,44 46,38 L185,38 L188,68 L185,98 L46,98 Q20,92 8,68 Z" fill="#F8F8F8"/>
  <!-- gray lower stripe -->
  <rect x="46" y="74" width="142" height="16" rx="0" fill="#888"/>
  <path d="M8,68 Q14,72 28,76 L46,76 L46,90 Q26,88 12,80 Z" fill="#888"/>
  <!-- THSR orange accent -->
  <rect x="46" y="70" width="142" height="6" fill="#FF8C00"/>
  <path d="M8,68 Q12,70 26,70 L46,70 L46,76 L26,74 Q12,72 8,68 Z" fill="#FF8C00"/>
  <rect x="28" y="44" width="22" height="18" rx="2" fill="#87CEEB" opacity="0.7"/>
  <circle cx="11" cy="68" r="5" fill="#FFE040" opacity="0.9"/>
  {wheel(40, 106, 9, "#888", "#ddd", "#888")}
  {wheel(64, 106, 9, "#888", "#ddd", "#888")}
  {wheel(110, 106, 9, "#888", "#ddd", "#888")}
  {wheel(150, 106, 9, "#888", "#ddd", "#888")}
  {wheel(174, 106, 9, "#888", "#ddd", "#888")}
  {rail(5, 198)}
''', "HSR Taiwan · 2007")

print("HSR TGV/ICE/Others batch: OK")

# ============================================================
# SHINKANSEN VARIANTS
# ============================================================

# 102. shinkansen-100 - white + blue stripe, BLUNT rounded nose
SVGS["shinkansen-100"] = svg_wrap(f'''
  <!-- Series 100: blunt rounded nose, blue lower stripe -->
  <path d="M8,68 Q22,44 50,38 L185,38 L188,68 L185,98 L50,98 Q22,92 8,68 Z" fill="#F8F8F8"/>
  <!-- blunt rounded nose - wider than 0-series -->
  <path d="M8,68 Q20,50 44,44 L50,44 L50,38 Q28,44 14,60 Z" fill="#eee"/>
  <!-- blue stripe Series 100 -->
  <rect x="50" y="82" width="138" height="10" fill="#003082"/>
  <path d="M8,68 Q14,78 30,84 L50,84 L50,92 Q28,90 12,80 Z" fill="#003082"/>
  <rect x="30" y="46" width="24" height="18" rx="2" fill="#87CEEB" opacity="0.7"/>
  <circle cx="11" cy="68" r="5" fill="#FFE040" opacity="0.9"/>
  {wheel(42, 106, 9, "#003082", "#ddd", "#003082")}
  {wheel(66, 106, 9, "#003082", "#ddd", "#003082")}
  {wheel(112, 106, 9, "#003082", "#ddd", "#003082")}
  {wheel(152, 106, 9, "#003082", "#ddd", "#003082")}
  {wheel(176, 106, 9, "#003082", "#ddd", "#003082")}
  {rail(5, 198)}
''', "Shinkansen 100 · 1985")

# 103. shinkansen-300 - SHARPER pointed nose than 100
SVGS["shinkansen-300"] = svg_wrap(f'''
  <!-- Series 300: sharper more pointed nose than 100/0 -->
  <path d="M8,68 Q24,44 54,36 L185,36 L188,68 L185,100 L54,100 Q24,92 8,68 Z" fill="#F0F0F0"/>
  <!-- sharper pointed nose 300-series - key difference -->
  <path d="M8,68 Q22,50 48,42 L54,42 L54,36 Q30,44 14,62 Z" fill="#ddd"/>
  <!-- gray/blue stripe -->
  <rect x="54" y="82" width="134" height="10" fill="#4a6a9c"/>
  <path d="M8,68 Q14,78 30,84 L54,86 L54,92 Q28,90 12,82 Z" fill="#4a6a9c"/>
  <rect x="32" y="44" width="24" height="16" rx="2" fill="#87CEEB" opacity="0.7"/>
  <circle cx="11" cy="68" r="5" fill="#FFE040" opacity="0.9"/>
  {wheel(46, 108, 9, "#4a6a9c", "#ddd", "#4a6a9c")}
  {wheel(70, 108, 9, "#4a6a9c", "#ddd", "#4a6a9c")}
  {wheel(116, 108, 9, "#4a6a9c", "#ddd", "#4a6a9c")}
  {wheel(155, 108, 9, "#4a6a9c", "#ddd", "#4a6a9c")}
  {wheel(178, 108, 9, "#4a6a9c", "#ddd", "#4a6a9c")}
  {rail(5, 198)}
''', "Shinkansen 300 · 1992")

# 104. shinkansen-700 - DUCK-BILL nose (flat bottom upturned), white+blue
SVGS["shinkansen-700"] = svg_wrap(f'''
  <!-- Series 700: duck-bill nose - flat bottom, upturned beak -->
  <path d="M8,68 Q18,48 44,38 L185,38 L188,68 L185,98 L44,98 Q18,88 8,68 Z" fill="#F8F8F8"/>
  <!-- duck-bill: flat at bottom, curving up - key feature -->
  <path d="M8,68 L10,76 Q16,84 36,88 L44,88 L44,98 Q20,94 8,80 Z" fill="#003082"/>
  <path d="M8,68 L10,60 Q14,52 32,44 L44,42 L44,38 Q22,44 10,60 Z" fill="#ddd"/>
  <!-- upturned bill at nose tip -->
  <path d="M8,68 Q10,56 16,52 L18,62 Q14,64 10,68 Z" fill="#003082"/>
  <rect x="28" y="44" width="22" height="16" rx="2" fill="#87CEEB" opacity="0.7"/>
  <circle cx="11" cy="68" r="5" fill="#FFE040" opacity="0.9"/>
  {wheel(38, 106, 9, "#003082", "#ddd", "#003082")}
  {wheel(62, 106, 9, "#003082", "#ddd", "#003082")}
  {wheel(108, 106, 9, "#003082", "#ddd", "#003082")}
  {wheel(148, 106, 9, "#003082", "#ddd", "#003082")}
  {wheel(172, 106, 9, "#003082", "#ddd", "#003082")}
  {rail(5, 198)}
''', "Shinkansen 700 · 1999")

# 105. shinkansen-n700 - aerodynamic curved nose, white+blue
SVGS["shinkansen-n700"] = svg_wrap(f'''
  <!-- N700: aerodynamic curved nose, white+blue different from N700S -->
  <path d="M8,68 Q20,44 48,36 L185,36 L188,68 L185,100 L48,100 Q20,92 8,68 Z" fill="#F8F8F8"/>
  <!-- curved aerodynamic nose N700 -->
  <path d="M8,68 Q18,50 42,42 L48,42 L48,36 Q26,44 12,62 Z" fill="#eee"/>
  <!-- blue lower band -->
  <rect x="48" y="82" width="140" height="12" fill="#003082"/>
  <path d="M8,68 Q14,80 30,86 L48,86 L48,94 Q26,92 10,80 Z" fill="#003082"/>
  <!-- N700 has slightly different curved underbelly -->
  <path d="M8,68 L16,76 Q26,84 44,86 L48,84 Q28,80 16,72 Z" fill="#1a50a0" opacity="0.5"/>
  <rect x="30" y="44" width="22" height="16" rx="2" fill="#87CEEB" opacity="0.7"/>
  <circle cx="11" cy="68" r="5" fill="#FFE040" opacity="0.9"/>
  {wheel(40, 108, 9, "#003082", "#ddd", "#003082")}
  {wheel(64, 108, 9, "#003082", "#ddd", "#003082")}
  {wheel(110, 108, 9, "#003082", "#ddd", "#003082")}
  {wheel(150, 108, 9, "#003082", "#ddd", "#003082")}
  {wheel(174, 108, 9, "#003082", "#ddd", "#003082")}
  {rail(5, 198)}
''', "Shinkansen N700 · 2007")

# 106. shinkansen-n700s - WINGED nose more complex curves, white+blue
SVGS["shinkansen-n700s"] = svg_wrap(f'''
  <!-- N700S: Supreme, winged nose profile, more complex -->
  <path d="M8,68 Q22,44 50,36 L185,36 L188,68 L185,100 L50,100 Q22,92 8,68 Z" fill="#F8F8F8"/>
  <!-- N700S winged nose - upper wing curve distinct from N700 -->
  <path d="M8,68 Q18,50 40,42 Q46,40 50,36 Q30,44 14,62 Z" fill="#eee"/>
  <!-- winged lower contour -->
  <path d="M8,68 Q16,78 36,86 Q44,88 50,90 L50,100 Q26,96 10,84 Z" fill="#003082"/>
  <!-- Supreme blue lower band higher placement -->
  <rect x="50" y="80" width="138" height="16" fill="#003082"/>
  <!-- wing detail at nose -->
  <path d="M14,56 Q22,52 34,50 L38,52 Q26,54 16,62 Z" fill="#ccc"/>
  <rect x="32" y="42" width="22" height="16" rx="2" fill="#87CEEB" opacity="0.7"/>
  <circle cx="11" cy="68" r="5" fill="#FFE040" opacity="0.9"/>
  {wheel(42, 108, 9, "#003082", "#ddd", "#003082")}
  {wheel(66, 108, 9, "#003082", "#ddd", "#003082")}
  {wheel(112, 108, 9, "#003082", "#ddd", "#003082")}
  {wheel(152, 108, 9, "#003082", "#ddd", "#003082")}
  {wheel(176, 108, 9, "#003082", "#ddd", "#003082")}
  {rail(5, 198)}
''', "Shinkansen N700S · 2020")

# 107. shinkansen-e6 - BRIGHT RED, NARROW body, very pointed
SVGS["shinkansen-e6"] = svg_wrap(f'''
  <!-- E6 Komachi: bright red, NARROW body, very pointed nose -->
  <path d="M8,68 Q22,50 52,42 L185,42 L188,68 L185,94 L52,94 Q22,86 8,68 Z" fill="#CC0000"/>
  <!-- narrower body than standard Shinkansen -->
  <!-- silver nose tip -->
  <path d="M8,68 Q20,54 44,46 L52,46 L52,42 Q30,50 14,66 Z" fill="#C0C0C0"/>
  <path d="M8,68 Q20,82 44,90 L52,90 L52,94 Q30,86 14,70 Z" fill="#C0C0C0"/>
  <!-- white lower stripe -->
  <rect x="52" y="80" width="136" height="10" fill="#F8F8F8"/>
  <path d="M8,68 Q14,76 28,82 L52,82 L52,90 Q26,88 12,80 Z" fill="#F8F8F8"/>
  <rect x="36" y="48" width="20" height="14" rx="2" fill="#87CEEB" opacity="0.7"/>
  <circle cx="11" cy="68" r="5" fill="#FFE040" opacity="0.9"/>
  {wheel(44, 102, 8, "#F8F8F8", "#880000", "#F8F8F8")}
  {wheel(68, 102, 8, "#F8F8F8", "#880000", "#F8F8F8")}
  {wheel(112, 102, 8, "#F8F8F8", "#880000", "#F8F8F8")}
  {wheel(150, 102, 8, "#F8F8F8", "#880000", "#F8F8F8")}
  {wheel(174, 102, 8, "#F8F8F8", "#880000", "#F8F8F8")}
  {rail(5, 198)}
''', "Shinkansen E6 · 2013")

# 108. shinkansen-e7 - CHAMPAGNE/GOLD stripe, elegant
SVGS["shinkansen-e7"] = svg_wrap(f'''
  <!-- E7 Kagayaki: champagne gold stripe, elegant nose -->
  <path d="M8,68 Q22,44 50,36 L185,36 L188,68 L185,100 L50,100 Q22,92 8,68 Z" fill="#F5F2E8"/>
  <!-- gold/champagne stripe - key feature -->
  <rect x="50" y="58" width="138" height="22" fill="#C8A800"/>
  <path d="M8,68 Q14,62 30,58 L50,58 L50,80 L30,78 Q14,74 8,68 Z" fill="#C8A800"/>
  <!-- dark gray accent lines -->
  <rect x="50" y="36" width="138" height="8" fill="#555"/>
  <rect x="50" y="92" width="138" height="8" fill="#555"/>
  <!-- copper trim nose -->
  <path d="M8,68 Q18,52 40,44 L50,44 L50,36 L42,38 Q22,48 12,64 Z" fill="#b87333"/>
  <path d="M8,68 Q18,84 40,92 L50,92 L50,100 L42,98 Q22,88 12,72 Z" fill="#b87333"/>
  <rect x="32" y="44" width="20" height="16" rx="2" fill="#87CEEB" opacity="0.7"/>
  <circle cx="11" cy="68" r="5" fill="#FFE040" opacity="0.9"/>
  {wheel(42, 108, 9, "#C8A800", "#F5F2E8", "#C8A800")}
  {wheel(66, 108, 9, "#C8A800", "#F5F2E8", "#C8A800")}
  {wheel(112, 108, 9, "#C8A800", "#F5F2E8", "#C8A800")}
  {wheel(152, 108, 9, "#C8A800", "#F5F2E8", "#C8A800")}
  {wheel(176, 108, 9, "#C8A800", "#F5F2E8", "#C8A800")}
  {rail(5, 198)}
''', "Shinkansen E7 · 2014")

# 109. shinkansen-l0 - SCMaglev, NO WHEELS, ultra-pointed gray/black
SVGS["shinkansen-l0"] = svg_wrap(f'''
  <!-- L0 SCMaglev: no wheels, ultra-pointed 80px snout, gray/black -->
  <path d="M8,68 Q28,50 80,40 L185,40 L188,68 L185,96 L80,96 Q28,86 8,68 Z" fill="#555"/>
  <!-- ultra-pointed 80px snout -->
  <path d="M8,68 Q40,56 78,42 L80,42 L80,40 Q44,56 10,68 Z" fill="#333"/>
  <path d="M8,68 Q40,80 78,94 L80,94 L80,96 Q44,80 10,68 Z" fill="#333"/>
  <!-- black lower section -->
  <rect x="80" y="76" width="108" height="18" fill="#222"/>
  <!-- guide rails visible below - maglev feature -->
  <rect x="8" y="96" width="180" height="5" rx="2" fill="#1a64cc"/>
  <rect x="8" y="103" width="180" height="4" rx="2" fill="#1a64cc"/>
  <!-- NO WHEELS - key feature -->
  <!-- headlight cluster -->
  <circle cx="12" cy="64" r="4" fill="#87CEEB" opacity="0.9"/>
  <circle cx="12" cy="72" r="4" fill="#87CEEB" opacity="0.9"/>
  <rect x="28" y="46" width="18" height="14" rx="2" fill="#87CEEB" opacity="0.6"/>
''', "Shinkansen L0 SCMaglev · 2027")

print("Shinkansen batch: OK")

# ============================================================
# KOREAN/ASIAN HSR
# ============================================================

# 110. ktx-sancheon - KTX-II blue/silver different from KTX-I
SVGS["ktx-sancheon"] = svg_wrap(f'''
  <!-- KTX-II Sancheon: improved Korean design, different nose from KTX-I -->
  <path d="M8,68 Q22,44 50,36 L185,36 L188,68 L185,100 L50,100 Q22,92 8,68 Z" fill="#1a4a9c"/>
  <!-- silver nose different from KTX-I -->
  <path d="M8,68 Q20,52 44,42 L50,42 L50,36 Q28,44 14,62 Z" fill="#C0C0C0"/>
  <path d="M8,68 Q20,84 44,94 L50,94 L50,100 Q28,92 14,74 Z" fill="#C0C0C0"/>
  <!-- different stripe: silver center instead of bottom -->
  <rect x="50" y="58" width="138" height="22" fill="#C0C0C0"/>
  <path d="M8,68 Q14,62 28,58 L50,58 L50,80 L28,78 Q14,74 8,68 Z" fill="#C0C0C0"/>
  <!-- red accent KTX-II -->
  <rect x="50" y="56" width="138" height="5" fill="#CC0000"/>
  <rect x="50" y="79" width="138" height="5" fill="#CC0000"/>
  <rect x="30" y="44" width="22" height="16" rx="2" fill="#87CEEB" opacity="0.7"/>
  <circle cx="11" cy="68" r="5" fill="#FFE040" opacity="0.9"/>
  {wheel(42, 108, 9, "#C0C0C0", "#1a4a9c", "#C0C0C0")}
  {wheel(66, 108, 9, "#C0C0C0", "#1a4a9c", "#C0C0C0")}
  {wheel(112, 108, 9, "#C0C0C0", "#1a4a9c", "#C0C0C0")}
  {wheel(152, 108, 9, "#C0C0C0", "#1a4a9c", "#C0C0C0")}
  {wheel(176, 108, 9, "#C0C0C0", "#1a4a9c", "#C0C0C0")}
  {rail(5, 198)}
''', "KTX Sancheon · 2010")

# 111. ktx-eum - EMU-250, white/blue different nose shape
SVGS["ktx-eum"] = svg_wrap(f'''
  <!-- KTX-Eum EMU-250: white/blue, very different from KTX-I/II -->
  <path d="M8,68 Q20,46 44,38 L185,38 L188,68 L185,98 L44,98 Q20,90 8,68 Z" fill="#F8F8F8"/>
  <!-- distinctive KTX-Eum nose: more rectangular with angled cut -->
  <rect x="8" y="50" width="38" height="36" rx="3" fill="#F0F0F0"/>
  <!-- blue nose front panel -->
  <rect x="8" y="50" width="16" height="36" fill="#003082"/>
  <!-- large angled windshield -->
  <polygon points="24,50 44,44 44,56 24,60" fill="#87CEEB" opacity="0.8"/>
  <!-- blue stripe KTX-Eum style -->
  <rect x="44" y="72" width="144" height="14" fill="#003082"/>
  <rect x="24" y="72" width="22" height="14" fill="#003082"/>
  <!-- EMU pantograph -->
  <line x1="90" y1="38" x2="86" y2="20" stroke="#888" stroke-width="1.5"/>
  <line x1="110" y1="38" x2="114" y2="20" stroke="#888" stroke-width="1.5"/>
  <line x1="84" y1="20" x2="116" y2="20" stroke="#aaa" stroke-width="2.5"/>
  {wheel(22, 106, 8, "#003082", "#ddd", "#003082")}
  {wheel(46, 106, 8, "#003082", "#ddd", "#003082")}
  {wheel(95, 106, 8, "#003082", "#ddd", "#003082")}
  {wheel(140, 106, 8, "#003082", "#ddd", "#003082")}
  {wheel(170, 106, 8, "#003082", "#ddd", "#003082")}
  {rail(5, 198)}
''', "KTX-Eum · 2021")

# 112. crh2-china - white/blue, rounded Shinkansen-derived
SVGS["crh2-china"] = svg_wrap(f'''
  <!-- CRH2: white/blue Chinese HSR, rounded Shinkansen-derived but different -->
  <path d="M8,68 Q20,44 46,36 L185,36 L188,68 L185,100 L46,100 Q20,92 8,68 Z" fill="#F8F8F8"/>
  <!-- blue stripe CRH2 different placement from Shinkansen -->
  <rect x="46" y="56" width="142" height="22" fill="#1a64cc"/>
  <path d="M8,68 Q14,62 28,58 L46,58 L46,78 L28,76 Q14,74 8,68 Z" fill="#1a64cc"/>
  <!-- Chinese rounded nose but narrower than N700 -->
  <path d="M8,68 Q18,52 40,44 L46,44 L46,36 Q26,44 12,62 Z" fill="#eee"/>
  <rect x="28" y="44" width="22" height="16" rx="2" fill="#87CEEB" opacity="0.7"/>
  <circle cx="11" cy="68" r="5" fill="#FFE040" opacity="0.9"/>
  {wheel(38, 108, 9, "#1a64cc", "#ddd", "#1a64cc")}
  {wheel(62, 108, 9, "#1a64cc", "#ddd", "#1a64cc")}
  {wheel(108, 108, 9, "#1a64cc", "#ddd", "#1a64cc")}
  {wheel(148, 108, 9, "#1a64cc", "#ddd", "#1a64cc")}
  {wheel(172, 108, 9, "#1a64cc", "#ddd", "#1a64cc")}
  {rail(5, 198)}
''', "CRH2 China · 2007")

# 113. crh380a - white/blue much more pointed nose, record holder
SVGS["crh380a"] = svg_wrap(f'''
  <!-- CRH380A: much more pointed nose than CRH2, record holder -->
  <path d="M8,68 Q24,44 58,34 L185,34 L188,68 L185,102 L58,102 Q24,92 8,68 Z" fill="#F8F8F8"/>
  <!-- much longer more pointed nose - key difference -->
  <path d="M8,68 Q24,50 52,40 L58,40 L58,34 Q32,44 14,64 Z" fill="#eee"/>
  <path d="M8,68 Q24,86 52,96 L58,96 L58,102 Q32,92 14,72 Z" fill="#eee"/>
  <!-- blue stripe -->
  <rect x="58" y="60" width="130" height="18" fill="#1a64cc"/>
  <path d="M8,68 Q14,64 32,60 L58,60 L58,78 L32,76 Q14,72 8,68 Z" fill="#1a64cc"/>
  <rect x="36" y="42" width="24" height="18" rx="2" fill="#87CEEB" opacity="0.7"/>
  <circle cx="11" cy="68" r="5" fill="#FFE040" opacity="0.9"/>
  {wheel(50, 110, 9, "#1a64cc", "#ddd", "#1a64cc")}
  {wheel(74, 110, 9, "#1a64cc", "#ddd", "#1a64cc")}
  {wheel(116, 110, 9, "#1a64cc", "#ddd", "#1a64cc")}
  {wheel(155, 110, 9, "#1a64cc", "#ddd", "#1a64cc")}
  {wheel(178, 110, 9, "#1a64cc", "#ddd", "#1a64cc")}
  {rail(5, 198)}
''', "CRH380A · 2010")

# ============================================================
# MAGLEV
# ============================================================

# 114. transrapid-07 - white/gray T-shape cross section, different from Shanghai
SVGS["transrapid-07"] = svg_wrap(f'''
  <!-- Transrapid 07: white/gray, T-shaped cross section visible -->
  <path d="M8,68 Q20,50 46,44 L185,44 L188,68 L185,92 L46,92 Q20,86 8,68 Z" fill="#E0E0E0"/>
  <!-- T-shaped wraparound visible: wider top, narrow bottom -->
  <rect x="46" y="44" width="142" height="22" rx="0" fill="#D0D0D0"/>
  <rect x="46" y="66" width="142" height="14" rx="0" fill="#C0C0C0"/>
  <rect x="54" y="80" width="126" height="10" rx="2" fill="#B0B0B0"/>
  <!-- wrap-around nose shape -->
  <path d="M8,68 Q16,54 36,48 L46,48 Q30,52 18,68 Q30,84 46,88 L36,88 Q16,82 8,68 Z" fill="#D0D0D0"/>
  <!-- guide rail visible below -->
  <rect x="54" y="90" width="126" height="4" rx="1" fill="#aaa"/>
  <!-- no wheels - maglev -->
  <rect x="28" y="50" width="20" height="14" rx="2" fill="#87CEEB" opacity="0.7"/>
  <circle cx="11" cy="68" r="5" fill="#FFE040" opacity="0.9"/>
  <!-- Transrapid T-beam guideway -->
  <rect x="8" y="96" width="180" height="6" fill="#888"/>
  <rect x="8" y="102" width="180" height="4" fill="#777"/>
''', "Transrapid 07 · 1989")

# 115. linimo-aichi - smaller/shorter HSST maglev white/blue Japanese
SVGS["linimo-aichi"] = svg_wrap(f'''
  <!-- Linimo: shorter, lower profile urban maglev, white/blue -->
  <!-- shorter and lower than other HSR - urban HSST -->
  <path d="M10,72 Q22,54 42,48 L175,48 L178,72 L175,96 L42,96 Q22,90 10,72 Z" fill="#F8F8F8"/>
  <!-- blue band Linimo -->
  <rect x="42" y="64" width="136" height="18" fill="#003082"/>
  <path d="M10,72 Q16,66 28,64 L42,64 L42,82 L28,80 Q16,78 10,72 Z" fill="#003082"/>
  <!-- Japanese urban maglev low profile -->
  <!-- maglev guide channel below -->
  <rect x="42" y="96" width="136" height="5" rx="1" fill="#1a64cc"/>
  <rect x="10" y="96" width="34" height="5" rx="1" fill="#1a64cc"/>
  <!-- smaller windows urban scale -->
  <rect x="18" y="56" width="20" height="12" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="50" y="54" width="12" height="14" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="68" y="54" width="12" height="14" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="86" y="54" width="12" height="14" rx="1" fill="#87CEEB" opacity="0.6"/>
  <circle cx="13" cy="72" r="5" fill="#FFE040" opacity="0.9"/>
  <!-- no wheels - urban maglev -->
  {rail(5, 198)}
''', "Linimo Aichi HSST · 2005")

# 116. hyperloop-concept - POD IN TUBE, silver/gray, no wheels
SVGS["hyperloop-concept"] = svg_wrap(f'''
  <!-- Hyperloop: elongated capsule pod inside clear vacuum tube -->
  <!-- transparent tube -->
  <rect x="5" y="46" width="188" height="60" rx="30" fill="none" stroke="#87CEEB" stroke-width="3" opacity="0.5"/>
  <rect x="5" y="46" width="188" height="60" rx="30" fill="#e8f4ff" opacity="0.15"/>
  <!-- vacuum tube wall details -->
  <line x1="5" y1="58" x2="193" y2="58" stroke="#87CEEB" stroke-width="1" opacity="0.3"/>
  <line x1="5" y1="94" x2="193" y2="94" stroke="#87CEEB" stroke-width="1" opacity="0.3"/>
  <!-- elongated capsule pod -->
  <path d="M15,68 Q26,55 42,52 L165,52 L174,68 L165,84 L42,84 Q26,81 15,68 Z" fill="#C8C8C8"/>
  <!-- pod gradient/metallic sheen -->
  <path d="M42,52 L165,52 L165,62 L42,62 Q32,60 26,56 Z" fill="#E0E0E0"/>
  <!-- aerodynamic ribbing -->
  <line x1="65" y1="52" x2="65" y2="84" stroke="#aaa" stroke-width="1"/>
  <line x1="95" y1="52" x2="95" y2="84" stroke="#aaa" stroke-width="1"/>
  <line x1="125" y1="52" x2="125" y2="84" stroke="#aaa" stroke-width="1"/>
  <line x1="155" y1="52" x2="155" y2="84" stroke="#aaa" stroke-width="1"/>
  <!-- passenger window strip -->
  <rect x="50" y="58" width="108" height="14" rx="3" fill="#87CEEB" opacity="0.5"/>
  <!-- no wheels -->
  <circle cx="18" cy="68" r="4" fill="#4a9cff" opacity="0.8"/>
''', "Hyperloop Concept · 2030")

print("Maglev batch: OK")

# ============================================================
# METRO / URBAN
# ============================================================

# 117. new-york-subway - stainless STEEL silver, NYC MTA stripe
SVGS["new-york-subway"] = svg_wrap(f'''
  <!-- NYC Subway R160: stainless steel, blue/red MTA stripe -->
  <rect x="8" y="44" width="180" height="62" rx="4" fill="#C8C8C8"/>
  <!-- stainless steel ribbed panels -->
  <line x1="45" y1="44" x2="45" y2="106" stroke="#aaa" stroke-width="1.5"/>
  <line x1="80" y1="44" x2="80" y2="106" stroke="#aaa" stroke-width="1.5"/>
  <line x1="115" y1="44" x2="115" y2="106" stroke="#aaa" stroke-width="1.5"/>
  <line x1="150" y1="44" x2="150" y2="106" stroke="#aaa" stroke-width="1.5"/>
  <!-- NYC blue stripe MTA -->
  <rect x="8" y="60" width="180" height="10" fill="#0039A6"/>
  <!-- NYC orange dot/red stripe -->
  <rect x="8" y="70" width="180" height="5" fill="#FF6319"/>
  <!-- windows -->
  <rect x="14" y="48" width="24" height="10" rx="1" fill="#87CEEB" opacity="0.7"/>
  <rect x="52" y="48" width="20" height="10" rx="1" fill="#87CEEB" opacity="0.7"/>
  <rect x="86" y="48" width="20" height="10" rx="1" fill="#87CEEB" opacity="0.7"/>
  <rect x="120" y="48" width="20" height="10" rx="1" fill="#87CEEB" opacity="0.7"/>
  <rect x="155" y="48" width="20" height="10" rx="1" fill="#87CEEB" opacity="0.7"/>
  <!-- doors -->
  <rect x="40" y="78" width="8" height="26" rx="1" fill="#bbb"/>
  <rect x="74" y="78" width="8" height="26" rx="1" fill="#bbb"/>
  <rect x="108" y="78" width="8" height="26" rx="1" fill="#bbb"/>
  <rect x="142" y="78" width="8" height="26" rx="1" fill="#bbb"/>
  {wheel(22, 114, 7, "#0039A6", "#aaa", "#0039A6")}
  {wheel(44, 114, 7, "#0039A6", "#aaa", "#0039A6")}
  {wheel(86, 114, 7, "#0039A6", "#aaa", "#0039A6")}
  {wheel(118, 114, 7, "#0039A6", "#aaa", "#0039A6")}
  {wheel(152, 114, 7, "#0039A6", "#aaa", "#0039A6")}
  {wheel(174, 114, 7, "#0039A6", "#aaa", "#0039A6")}
  {rail(5, 198)}
''', "New York Subway · 1904")

# 118. paris-metro - RUBBER TIRES (no metal wheels!), blue/white narrow
SVGS["paris-metro"] = svg_wrap(f'''
  <!-- Paris Metro: rubber tyres, blue/white, narrow body -->
  <rect x="8" y="48" width="180" height="58" rx="5" fill="#003082"/>
  <!-- white stripe Paris Metro -->
  <rect x="8" y="64" width="180" height="12" fill="#fff"/>
  <!-- narrow body, rubber tyre look different -->
  <!-- windows -->
  <rect x="14" y="52" width="22" height="10" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="48" y="52" width="18" height="10" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="80" y="52" width="18" height="10" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="112" y="52" width="18" height="10" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="148" y="52" width="18" height="10" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- rubber tyre wheels - wider, different look, NO metal flange -->
  <rect x="12" y="104" width="18" height="10" rx="5" fill="#222"/>
  <rect x="42" y="104" width="18" height="10" rx="5" fill="#222"/>
  <rect x="84" y="104" width="18" height="10" rx="5" fill="#222"/>
  <rect x="114" y="104" width="18" height="10" rx="5" fill="#222"/>
  <rect x="152" y="104" width="18" height="10" rx="5" fill="#222"/>
  <!-- rubber tyre guide rail different from normal rail -->
  <rect x="8" y="114" width="180" height="4" rx="1" fill="#ccc"/>
  <!-- Paris Metro headlight distinctive rectangular -->
  <rect x="12" y="56" width="8" height="5" rx="1" fill="#FFE040" opacity="0.9"/>
''', "Paris Metro · 1900")

# 119. moscow-metro - SOVIET RED, ornate, boxy
SVGS["moscow-metro"] = svg_wrap(f'''
  <!-- Moscow Metro: Soviet RED, ornate panels, boxy elegant -->
  <rect x="8" y="44" width="180" height="62" rx="4" fill="#CC0000"/>
  <!-- Soviet ornate panel lines -->
  <rect x="8" y="52" width="180" height="4" fill="#AA0000"/>
  <rect x="8" y="92" width="180" height="4" fill="#AA0000"/>
  <!-- cream stripe -->
  <rect x="8" y="64" width="180" height="16" fill="#F5F5DC"/>
  <!-- ornate front face -->
  <rect x="8" y="44" width="42" height="62" rx="4" fill="#AA0000"/>
  <rect x="14" y="50" width="22" height="14" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- Soviet star emblem -->
  <polygon points="28,80 30,74 32,80 38,80 33,84 35,90 28,86 21,90 23,84 18,80" fill="#FFD700" opacity="0.9"/>
  <!-- windows -->
  <rect x="56" y="52" width="16" height="10" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="80" y="52" width="16" height="10" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="104" y="52" width="16" height="10" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="128" y="52" width="16" height="10" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="155" y="52" width="16" height="10" rx="1" fill="#87CEEB" opacity="0.6"/>
  {wheel(22, 114, 8, "#FFD700", "#880000", "#FFD700")}
  {wheel(50, 114, 8, "#FFD700", "#880000", "#FFD700")}
  {wheel(90, 114, 8, "#FFD700", "#880000", "#FFD700")}
  {wheel(120, 114, 8, "#FFD700", "#880000", "#FFD700")}
  {wheel(158, 114, 8, "#FFD700", "#880000", "#FFD700")}
  {rail(5, 198)}
''', "Moscow Metro · 1935")

# 120. tokyo-metro - silver with colored DOORS
SVGS["tokyo-metro"] = svg_wrap(f'''
  <!-- Tokyo Metro: silver stainless, colored door stripes per line -->
  <rect x="8" y="44" width="180" height="62" rx="4" fill="#C8C8C8"/>
  <!-- silver stainless vertical lines -->
  <line x1="44" y1="44" x2="44" y2="106" stroke="#aaa" stroke-width="1"/>
  <line x1="78" y1="44" x2="78" y2="106" stroke="#aaa" stroke-width="1"/>
  <line x1="112" y1="44" x2="112" y2="106" stroke="#aaa" stroke-width="1"/>
  <line x1="146" y1="44" x2="146" y2="106" stroke="#aaa" stroke-width="1"/>
  <!-- colored door stripe (Tokyo Metro 05 Tozai line blue) -->
  <rect x="38" y="44" width="10" height="62" rx="2" fill="#009BBF"/>
  <rect x="72" y="44" width="10" height="62" rx="2" fill="#009BBF"/>
  <rect x="106" y="44" width="10" height="62" rx="2" fill="#009BBF"/>
  <rect x="140" y="44" width="10" height="62" rx="2" fill="#009BBF"/>
  <!-- windows -->
  <rect x="14" y="50" width="22" height="10" rx="1" fill="#87CEEB" opacity="0.7"/>
  <rect x="50" y="50" width="18" height="10" rx="1" fill="#87CEEB" opacity="0.7"/>
  <rect x="84" y="50" width="18" height="10" rx="1" fill="#87CEEB" opacity="0.7"/>
  <rect x="118" y="50" width="18" height="10" rx="1" fill="#87CEEB" opacity="0.7"/>
  <rect x="152" y="50" width="18" height="10" rx="1" fill="#87CEEB" opacity="0.7"/>
  {wheel(22, 114, 7, "#009BBF", "#aaa", "#009BBF")}
  {wheel(46, 114, 7, "#009BBF", "#aaa", "#009BBF")}
  {wheel(88, 114, 7, "#009BBF", "#aaa", "#009BBF")}
  {wheel(120, 114, 7, "#009BBF", "#aaa", "#009BBF")}
  {wheel(158, 114, 7, "#009BBF", "#aaa", "#009BBF")}
  {rail(5, 198)}
''', "Tokyo Metro · 1927")

# 121. lrt-jakarta - light red/white, thin body, elevated hint
SVGS["lrt-jakarta"] = svg_wrap(f'''
  <!-- LRT Jakarta: red/white, thin elevated body -->
  <rect x="8" y="50" width="180" height="54" rx="6" fill="#CC2222"/>
  <!-- white stripe -->
  <rect x="8" y="62" width="180" height="12" fill="#fff"/>
  <!-- elevated guideway hint -->
  <rect x="55" y="104" width="6" height="16" fill="#888"/>
  <rect x="135" y="104" width="6" height="16" fill="#888"/>
  <rect x="8" y="104" width="180" height="5" rx="2" fill="#999"/>
  <!-- windows -->
  <rect x="14" y="54" width="22" height="6" rx="1" fill="#87CEEB" opacity="0.7"/>
  <rect x="46" y="54" width="18" height="6" rx="1" fill="#87CEEB" opacity="0.7"/>
  <rect x="78" y="54" width="18" height="6" rx="1" fill="#87CEEB" opacity="0.7"/>
  <rect x="110" y="54" width="18" height="6" rx="1" fill="#87CEEB" opacity="0.7"/>
  <rect x="148" y="54" width="18" height="6" rx="1" fill="#87CEEB" opacity="0.7"/>
  {wheel(22, 112, 7, "#fff", "#CC2222", "#fff")}
  {wheel(48, 112, 7, "#fff", "#CC2222", "#fff")}
  {wheel(88, 112, 7, "#fff", "#CC2222", "#fff")}
  {wheel(122, 112, 7, "#fff", "#CC2222", "#fff")}
  {wheel(158, 112, 7, "#fff", "#CC2222", "#fff")}
  {rail(5, 198)}
''', "LRT Jakarta · 2019")

# 122. mrt-singapore - C151 red/white MRT Singapore
SVGS["mrt-singapore"] = svg_wrap(f'''
  <!-- Singapore MRT C151: red/white -->
  <rect x="8" y="44" width="180" height="62" rx="5" fill="#CC0000"/>
  <!-- white body panels -->
  <rect x="8" y="54" width="180" height="32" rx="0" fill="#fff"/>
  <!-- red stripe restored at top/bottom -->
  <rect x="8" y="82" width="180" height="10" fill="#CC0000"/>
  <!-- windows wide -->
  <rect x="14" y="58" width="24" height="22" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="48" y="58" width="20" height="22" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="82" y="58" width="20" height="22" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="116" y="58" width="20" height="22" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="150" y="58" width="20" height="22" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- SMRT lettering band -->
  <rect x="8" y="92" width="180" height="6" fill="#CC0000"/>
  {wheel(22, 114, 8, "#CC0000", "#ddd", "#CC0000")}
  {wheel(50, 114, 8, "#CC0000", "#ddd", "#CC0000")}
  {wheel(90, 114, 8, "#CC0000", "#ddd", "#CC0000")}
  {wheel(124, 114, 8, "#CC0000", "#ddd", "#CC0000")}
  {wheel(158, 114, 8, "#CC0000", "#ddd", "#CC0000")}
  {rail(5, 198)}
''', "MRT Singapore C151 · 1987")

# 123. mrt-kuala-lumpur - blue/red KL MRT Prasarana
SVGS["mrt-kuala-lumpur"] = svg_wrap(f'''
  <!-- KL MRT Prasarana: blue/red -->
  <rect x="8" y="44" width="180" height="62" rx="5" fill="#1a3a9c"/>
  <!-- red diagonal stripe KL MRT style -->
  <polygon points="8,44 52,44 8,80" fill="#CC0000"/>
  <rect x="8" y="68" width="180" height="12" fill="#CC0000"/>
  <!-- white window band -->
  <rect x="8" y="54" width="180" height="14" fill="#fff"/>
  <!-- windows -->
  <rect x="14" y="56" width="22" height="10" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="50" y="56" width="18" height="10" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="84" y="56" width="18" height="10" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="118" y="56" width="18" height="10" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="155" y="56" width="18" height="10" rx="2" fill="#87CEEB" opacity="0.7"/>
  {wheel(22, 114, 8, "#CC0000", "#1a3a9c", "#CC0000")}
  {wheel(50, 114, 8, "#CC0000", "#1a3a9c", "#CC0000")}
  {wheel(90, 114, 8, "#CC0000", "#1a3a9c", "#CC0000")}
  {wheel(124, 114, 8, "#CC0000", "#1a3a9c", "#CC0000")}
  {wheel(158, 114, 8, "#CC0000", "#1a3a9c", "#CC0000")}
  {rail(5, 198)}
''', "MRT Kuala Lumpur · 2016")

# 124. bts-bangkok - GREEN/yellow elevated BTS Skytrain
SVGS["bts-bangkok"] = svg_wrap(f'''
  <!-- BTS Skytrain: green/yellow, elevated -->
  <rect x="8" y="46" width="180" height="58" rx="5" fill="#1a7c3a"/>
  <!-- yellow BTS stripe -->
  <rect x="8" y="60" width="180" height="14" fill="#FFD700"/>
  <!-- elevated guideway pillars -->
  <rect x="50" y="104" width="8" height="18" fill="#888"/>
  <rect x="130" y="104" width="8" height="18" fill="#888"/>
  <rect x="8" y="104" width="180" height="5" rx="2" fill="#999"/>
  <!-- windows -->
  <rect x="14" y="50" width="22" height="8" rx="1" fill="#87CEEB" opacity="0.7"/>
  <rect x="48" y="50" width="18" height="8" rx="1" fill="#87CEEB" opacity="0.7"/>
  <rect x="82" y="50" width="18" height="8" rx="1" fill="#87CEEB" opacity="0.7"/>
  <rect x="116" y="50" width="18" height="8" rx="1" fill="#87CEEB" opacity="0.7"/>
  <rect x="152" y="50" width="18" height="8" rx="1" fill="#87CEEB" opacity="0.7"/>
  {wheel(22, 112, 7, "#FFD700", "#1a5c2a", "#FFD700")}
  {wheel(48, 112, 7, "#FFD700", "#1a5c2a", "#FFD700")}
  {wheel(88, 112, 7, "#FFD700", "#1a5c2a", "#FFD700")}
  {wheel(122, 112, 7, "#FFD700", "#1a5c2a", "#FFD700")}
  {wheel(158, 112, 7, "#FFD700", "#1a5c2a", "#FFD700")}
  {rail(5, 198)}
''', "BTS Bangkok Skytrain · 1999")

# 125. delhi-metro - DMRC blue/gray modern
SVGS["delhi-metro"] = svg_wrap(f'''
  <!-- Delhi Metro DMRC: blue/gray, modern -->
  <rect x="8" y="44" width="180" height="62" rx="5" fill="#1a4a9c"/>
  <!-- gray lower half -->
  <rect x="8" y="68" width="180" height="38" rx="5" fill="#888"/>
  <!-- blue upper remains -->
  <!-- white stripe joining blue/gray -->
  <rect x="8" y="66" width="180" height="5" fill="#fff"/>
  <!-- windows -->
  <rect x="14" y="50" width="22" height="14" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="48" y="50" width="18" height="14" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="82" y="50" width="18" height="14" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="116" y="50" width="18" height="14" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="150" y="50" width="18" height="14" rx="2" fill="#87CEEB" opacity="0.7"/>
  <!-- DMRC logo area -->
  <circle cx="25" cy="82" r="8" fill="#1a4a9c"/>
  <circle cx="25" cy="82" r="5" fill="#fff"/>
  {wheel(22, 114, 8, "#1a4a9c", "#888", "#1a4a9c")}
  {wheel(50, 114, 8, "#1a4a9c", "#888", "#1a4a9c")}
  {wheel(90, 114, 8, "#1a4a9c", "#888", "#1a4a9c")}
  {wheel(124, 114, 8, "#1a4a9c", "#888", "#1a4a9c")}
  {wheel(158, 114, 8, "#1a4a9c", "#888", "#1a4a9c")}
  {rail(5, 198)}
''', "Delhi Metro DMRC · 2002")

# 126. dubai-metro - DRIVERLESS, red/silver futuristic nose
SVGS["dubai-metro"] = svg_wrap(f'''
  <!-- Dubai Metro: driverless, red/silver futuristic nose (no cab) -->
  <!-- completely transparent front - no cab -->
  <path d="M8,68 Q18,46 40,40 L185,40 L188,68 L185,96 L40,96 Q18,90 8,68 Z" fill="#CC0000"/>
  <!-- silver body -->
  <rect x="40" y="40" width="148" height="56" rx="0" fill="#C0C0C0"/>
  <!-- red upper stripe -->
  <rect x="40" y="40" width="148" height="18" rx="0" fill="#CC0000"/>
  <!-- driverless: full glass front nose -->
  <path d="M8,68 Q18,52 36,46 L40,46 L40,40 Q22,46 10,62 Z" fill="#87CEEB" opacity="0.6"/>
  <path d="M8,68 Q18,84 36,90 L40,90 L40,96 Q22,90 10,74 Z" fill="#87CEEB" opacity="0.6"/>
  <!-- panoramic front view (driverless) -->
  <rect x="12" y="54" width="28" height="28" rx="4" fill="#87CEEB" opacity="0.7"/>
  <!-- windows body -->
  <rect x="50" y="46" width="14" height="10" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="70" y="46" width="14" height="10" rx="1" fill="#87CEEB" opacity="0.6"/>
  <rect x="90" y="46" width="14" height="10" rx="1" fill="#87CEEB" opacity="0.6"/>
  {wheel(24, 104, 7, "#CC0000", "#aaa", "#CC0000")}
  {wheel(50, 104, 7, "#CC0000", "#aaa", "#CC0000")}
  {wheel(90, 104, 7, "#CC0000", "#aaa", "#CC0000")}
  {wheel(130, 104, 7, "#CC0000", "#aaa", "#CC0000")}
  {wheel(162, 104, 7, "#CC0000", "#aaa", "#CC0000")}
  {rail(5, 198)}
''', "Dubai Metro · 2009")

# silver-meteor (was in list from existing files)
SVGS["silver-meteor"] = svg_wrap(f'''
  <!-- Silver Meteor: Seaboard streamlined silver/red, 1939 -->
  <path d="M10,68 Q22,44 48,38 L185,38 L188,68 L185,98 L48,98 Q22,92 10,68 Z" fill="#C8C8C8"/>
  <!-- red stripe Seaboard -->
  <rect x="48" y="60" width="140" height="16" fill="#CC0000"/>
  <path d="M10,68 Q16,62 32,60 L48,60 L48,76 L32,74 Q16,74 10,68 Z" fill="#CC0000"/>
  <!-- streamlined nose -->
  <path d="M10,68 Q18,52 36,46 L42,48 Q24,54 14,68 Z" fill="#bbb"/>
  <path d="M10,68 Q18,84 36,90 L42,88 Q24,82 14,68 Z" fill="#bbb"/>
  <rect x="30" y="44" width="22" height="18" rx="2" fill="#87CEEB" opacity="0.7"/>
  <circle cx="12" cy="68" r="6" fill="#FFE040" opacity="0.9"/>
  {wheel(40, 106, 8, "#CC0000", "#aaa", "#CC0000")}
  {wheel(64, 106, 8, "#CC0000", "#aaa", "#CC0000")}
  {wheel(110, 106, 8, "#CC0000", "#aaa", "#CC0000")}
  {wheel(150, 106, 8, "#CC0000", "#aaa", "#CC0000")}
  {wheel(174, 106, 8, "#CC0000", "#aaa", "#CC0000")}
  {rail(5, 198)}
''', "Silver Meteor · 1939")

print("Metro/urban batch: OK")

# ============================================================
# OUTPUT LOOP - write all SVGs to files
# ============================================================

# Skip already-handcrafted SVGs
SKIP = {
    "stephensons-rocket", "locomotion-no1", "american-4-4-0", "mallard-a4",
    "big-boy-4-8-8-4", "flying-scotsman-a1", "shinkansen-0", "shinkansen-500",
    "shinkansen-e5", "tgv-sud-est", "ice-3", "ktx-i", "fuxing-cr400",
    "shanghai-maglev", "london-underground", "cc201-indonesia", "mrt-jakarta",
    "ffestiniog-narrow", "garratt-lms", "prr-gg1", "sbb-crocodile",
    "commuter-line-krl", "caseyjr-dumbo_char", "linus-brave_char", "malivlak_char",
}

generated = 0
skipped = 0
for name, svg_content in SVGS.items():
    if name in SKIP:
        skipped += 1
        continue
    filepath = os.path.join(OUT_DIR, f"{name}.svg")
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(svg_content)
    generated += 1

print(f"\nDone! Generated: {generated} SVGs, Skipped (handcrafted): {skipped}")
print(f"Total in SVGS dict: {len(SVGS)}")

