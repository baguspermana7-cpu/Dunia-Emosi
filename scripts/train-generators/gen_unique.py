#!/usr/bin/env python3
"""Generate truly unique SVG train icons — each with distinct shape, proportions, features."""
import os, json

OUT = os.path.dirname(os.path.abspath(__file__))

# ── helpers ───────────────────────────────────────────────────────────────────
def svg_wrap(body, w=200, h=120, label="", year=0, note=""):
    tag = f"{label[:24]}" if label else ""
    yr  = f" · {year}" if year else ""
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">
{body}
  <text x="{w//2}" y="{h-4}" font-family="Arial,sans-serif" font-size="7" fill="#666" text-anchor="middle">{tag}{yr}</text>
</svg>"""

def wheel(cx,cy,r,fill,rim,spokes=6):
    lines=""
    import math
    for i in range(spokes):
        a=math.pi*i/spokes
        x1=cx+r*math.cos(a); y1=cy+r*math.sin(a)
        x2=cx-r*math.cos(a); y2=cy-r*math.sin(a)
        lines+=f'  <line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{rim}" stroke-width="1.2"/>\n'
    return (f'  <circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}" stroke="{rim}" stroke-width="2.5"/>\n'
            + lines +
            f'  <circle cx="{cx}" cy="{cy}" r="{r*0.22:.1f}" fill="{rim}"/>\n')

# ── drawing functions per visual archetype ────────────────────────────────────

def primitive_steam(c,a,wc,label,year,note):
    """Blenkinsop / very early 1800s — vertical boiler, rack gear, tiny"""
    b=f"""  <rect x="60" y="30" width="30" height="55" rx="5" fill="{c}"/>
  <rect x="52" y="50" width="46" height="30" rx="3" fill="{a}"/>
  <circle cx="75" cy="25" r="12" fill="{c}"/>
  <rect x="70" y="13" width="10" height="18" rx="3" fill="#555"/>
  <rect x="67" y="10" width="16" height="6" rx="2" fill="#333"/>
  <rect x="48" y="72" width="54" height="6" rx="2" fill="{a}"/>
"""
    b+=wheel(65,88,12,wc,a,4)+wheel(95,88,12,wc,a,4)
    b+=wheel(50,88,8,wc,a,4)+wheel(108,88,8,wc,a,4)
    return svg_wrap(b,160,105,label,year,note)

def rocket_steam(c,a,wc,label,year,note):
    """Stephenson's Rocket — inclined boiler, huge single drive wheel, tiny front"""
    b=f"""  <g transform="rotate(-15,80,60)">
    <rect x="30" y="38" width="90" height="28" rx="8" fill="{c}"/>
  </g>
  <rect x="22" y="12" width="14" height="42" rx="3" fill="#444"/>
  <rect x="18" y="8"  width="22" height="7"  rx="2" fill="#333"/>
  <ellipse cx="36" cy="14" rx="8" ry="4" fill="#888" opacity="0.6"/>
  <rect x="100" y="40" width="30" height="36" rx="3" fill="{a}"/>
  <rect x="105" y="46" width="10" height="9" rx="2" fill="#87CEEB" opacity="0.7"/>
"""
    b+=wheel(118,82,22,wc,a,8)
    b+=wheel(42,82,11,wc,a,6)
    b+=wheel(155,82,10,wc,a,4)
    return svg_wrap(b,180,105,label,year,note)

def american_4_4_0(c,a,wc,label,year,note):
    """Classic American — balloon/diamond chimney, large cowcatcher, wooden cab"""
    b=f"""  <ellipse cx="36" cy="10" rx="9" ry="5" fill="#AAA" opacity="0.5"/>
  <rect x="28" y="12" width="16" height="28" rx="2" fill="#555"/>
  <path d="M24,10 Q36,4 48,10 Q36,8 24,10Z" fill="#333"/>
  <rect x="36" y="30" width="100" height="32" rx="9" fill="{c}"/>
  <ellipse cx="95" cy="28" rx="13" ry="8" fill="{c}"/>
  <rect x="130" y="20" width="44" height="42" rx="3" fill="{a}"/>
  <rect x="127" y="14" width="50" height="8" rx="2" fill="{c}"/>
  <rect x="136" y="25" width="13" height="10" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="154" y="25" width="13" height="10" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="30" y="60" width="144" height="7" rx="2" fill="{a}"/>
  <path d="M30,60 L8,70 L8,75 L30,68Z" fill="{c}"/>
  <line x1="10" y1="66" x2="30" y2="61" stroke="{a}" stroke-width="1.2"/>
  <line x1="14" y1="69" x2="30" y2="64" stroke="{a}" stroke-width="1.2"/>
  <line x1="18" y1="72" x2="30" y2="68" stroke="{a}" stroke-width="1.2"/>
  <circle cx="28" cy="52" r="5" fill="#FFE040" opacity="0.9"/>
"""
    b+=wheel(62,82,16,wc,a,8)+wheel(96,82,16,wc,a,8)
    b+=wheel(130,82,16,wc,a,8)+wheel(162,82,16,wc,a,8)
    b+=wheel(38,82,10,wc,a,4)
    return svg_wrap(b,195,105,label,year,note)

def british_express(c,a,wc,label,year,note):
    """LNER/GWR style — long sleek boiler, 3 big driving wheels, splashers"""
    b=f"""  <ellipse cx="38" cy="12" rx="7" ry="5" fill="#CCC" opacity="0.5"/>
  <rect x="30" y="14" width="12" height="24" rx="3" fill="#444"/>
  <rect x="27" y="11" width="18" height="5" rx="2" fill="#333"/>
  <rect x="38" y="28" width="120" height="34" rx="10" fill="{c}"/>
  <ellipse cx="78" cy="26" rx="10" ry="7" fill="{a}"/>
  <rect x="152" y="18" width="42" height="44" rx="4" fill="{a}"/>
  <path d="M148,18 L194,18 L194,14 Q171,8 148,14Z" fill="{c}"/>
  <rect x="156" y="24" width="11" height="9" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="173" y="24" width="11" height="9" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="38" y="60" width="156" height="7" rx="2" fill="{a}" opacity="0.6"/>
  <path d="M38,60 L18,68 L18,72 L38,68Z" fill="{c}"/>
  <circle cx="25" cy="50" r="5" fill="#FFE040" opacity="0.9"/>
  <rect x="54" y="55" width="20" height="10" rx="3" fill="{c}" opacity="0.5"/>
  <rect x="88" y="55" width="20" height="10" rx="3" fill="{c}" opacity="0.5"/>
  <rect x="122" y="55" width="20" height="10" rx="3" fill="{c}" opacity="0.5"/>
"""
    b+=wheel(64,82,17,wc,a,8)+wheel(100,82,17,wc,a,8)+wheel(136,82,17,wc,a,8)
    b+=wheel(42,84,11,wc,a,4)+wheel(176,84,12,wc,a,4)
    return svg_wrap(b,205,105,label,year,note)

def streamlined_steam(c,a,wc,label,year,note):
    """Art Deco streamlined — Mallard/DRG05 — bullet nose shrouding all wheels"""
    b=f"""  <ellipse cx="40" cy="16" rx="7" ry="5" fill="#CCC" opacity="0.4"/>
  <rect x="33" y="18" width="10" height="18" rx="2" fill="#555"/>
  <path d="M8,45 Q30,28 70,28 L190,28 L190,72 Q180,78 160,76 L60,76 Q20,74 8,60 Z" fill="{c}"/>
  <path d="M8,45 Q20,38 55,36 L55,68 Q25,66 8,60 Z" fill="{a}" opacity="0.25"/>
  <rect x="80" y="33" width="16" height="11" rx="2" fill="#87CEEB" opacity="0.65"/>
  <rect x="102" y="33" width="16" height="11" rx="2" fill="#87CEEB" opacity="0.65"/>
  <rect x="124" y="33" width="16" height="11" rx="2" fill="#87CEEB" opacity="0.65"/>
  <rect x="146" y="33" width="16" height="11" rx="2" fill="#87CEEB" opacity="0.65"/>
  <path d="M8,52 L190,52" stroke="{a}" stroke-width="1.5" opacity="0.4"/>
  <circle cx="12" cy="52" r="5" fill="#FFE040" opacity="0.9"/>
"""
    b+=wheel(65,86,13,wc,a,6)+wheel(100,86,13,wc,a,6)+wheel(135,86,13,wc,a,6)
    b+=wheel(170,86,11,wc,a,4)+wheel(42,88,9,wc,a,4)
    return svg_wrap(b,200,108,label,year,note)

def big_boy_steam(c,a,wc,label,year,note):
    """Big Boy / Challenger — massive articulated, 2 engine sets"""
    b=f"""  <ellipse cx="38" cy="12" rx="8" ry="5" fill="#BBB" opacity="0.5"/>
  <rect x="30" y="14" width="15" height="26" rx="2" fill="#555"/>
  <rect x="26" y="10" width="23" height="6" rx="2" fill="#333"/>
  <rect x="38" y="30" width="200" height="36" rx="8" fill="{c}"/>
  <ellipse cx="88" cy="28" rx="12" ry="8" fill="{c}"/>
  <ellipse cx="148" cy="28" rx="12" ry="8" fill="{c}"/>
  <rect x="5" y="30" width="5" height="36" rx="1" fill="{c}"/>
  <rect x="228" y="22" width="45" height="44" rx="3" fill="{a}"/>
  <rect x="225" y="16" width="51" height="8" rx="2" fill="{c}"/>
  <rect x="234" y="27" width="12" height="9" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="251" y="27" width="12" height="9" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="36" y="64" width="237" height="8" rx="2" fill="{a}" opacity="0.5"/>
  <path d="M36,64 L10,74 L10,78 L36,72Z" fill="{c}"/>
  <circle cx="22" cy="52" r="5" fill="#FFE040" opacity="0.9"/>
  <rect x="116" y="56" width="8" height="18" rx="2" fill="#666" opacity="0.5"/>
"""
    for cx in [52,82,112,172,202,232]:
        b+=wheel(cx,84,16,wc,a,8)
    b+=wheel(35,86,10,wc,a,4)+wheel(258,86,10,wc,a,4)
    return svg_wrap(b,285,108,label,year,note)

def narrow_gauge_steam(c,a,wc,label,year,note):
    """Ffestiniog narrow gauge — tiny, cute, low profile"""
    b=f"""  <ellipse cx="28" cy="10" rx="6" ry="4" fill="#CCC" opacity="0.5"/>
  <rect x="22" y="12" width="11" height="20" rx="2" fill="#555"/>
  <rect x="19" y="9"  width="17" height="5" rx="2" fill="#333"/>
  <rect x="28" y="24" width="80" height="28" rx="7" fill="{c}"/>
  <ellipse cx="58" cy="22" rx="10" ry="7" fill="{a}"/>
  <rect x="100" y="16" width="36" height="36" rx="3" fill="{a}"/>
  <rect x="105" y="21" width="10" height="8" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="120" y="21" width="10" height="8" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="26" y="50" width="112" height="6" rx="2" fill="{a}" opacity="0.5"/>
  <path d="M26,50 L10,57 L10,60 L26,56Z" fill="{c}"/>
  <circle cx="15" cy="41" r="4" fill="#FFE040" opacity="0.9"/>
"""
    b+=wheel(42,70,11,wc,a,6)+wheel(68,70,11,wc,a,6)+wheel(94,70,11,wc,a,6)
    b+=wheel(28,72,7,wc,a,4)+wheel(122,72,8,wc,a,4)
    return svg_wrap(b,148,88,label,year,note)

def garratt_steam(c,a,wc,label,year,note):
    """Beyer-Garratt — water tank front, coal bunker rear, boiler in middle"""
    b=f"""  <rect x="2" y="36" width="50" height="30" rx="5" fill="{a}"/>
  <rect x="2" y="28" width="50" height="10" rx="3" fill="{c}" opacity="0.5"/>
  <rect x="215" y="36" width="48" height="30" rx="5" fill="{a}"/>
  <rect x="215" y="28" width="48" height="10" rx="3" fill="{c}" opacity="0.5"/>
  <rect x="46" y="30" width="172" height="34" rx="12" fill="{c}"/>
  <ellipse cx="132" cy="28" rx="14" ry="9" fill="{a}"/>
  <rect x="50" y="14" width="14" height="18" rx="2" fill="#555"/>
  <rect x="46" y="10" width="22" height="6" rx="2" fill="#333"/>
  <ellipse cx="57" cy="12" rx="8" ry="4" fill="#AAA" opacity="0.5"/>
  <rect x="2" y="64" width="261" height="7" rx="2" fill="{a}" opacity="0.4"/>
"""
    for cx in [14,34,54,74,190,210,230,250]:
        b+=wheel(cx,80,11,wc,a,6)
    for cx in [100,130,160]:
        b+=wheel(cx,80,13,wc,a,6)
    return svg_wrap(b,270,100,label,year,note)

def emd_f_unit(c,a,wc,label,year,note):
    """EMD F/E-unit — bulldog nose, streamlined cab unit"""
    b=f"""  <path d="M6,42 Q22,22 62,22 L195,22 L195,78 L62,78 Q22,78 6,62 Z" fill="{c}"/>
  <path d="M6,42 Q18,30 56,28 L56,72 Q22,70 6,62 Z" fill="{a}" opacity="0.3"/>
  <rect x="22" y="28" width="16" height="13" rx="2" fill="#87CEEB" opacity="0.75"/>
  <rect x="42" y="28" width="12" height="13" rx="2" fill="#87CEEB" opacity="0.75"/>
  <rect x="65" y="27" width="18" height="14" rx="2" fill="#87CEEB" opacity="0.6"/>
  <path d="M6,50 L195,50" stroke="{a}" stroke-width="3" opacity="0.4"/>
  <rect x="85" y="36" width="8" height="12" rx="2" fill="#555"/>
  <rect x="82" y="34" width="14" height="4" rx="1" fill="#444"/>
  <circle cx="9"  cy="52" r="5" fill="#FFE040" opacity="0.9"/>
  <circle cx="192" cy="52" r="4" fill="#FFE040" opacity="0.5"/>
  <rect x="62" y="72" width="133" height="8" rx="2" fill="{a}" opacity="0.5"/>
"""
    b+=wheel(40,88,12,wc,a,6)+wheel(72,88,12,wc,a,6)
    b+=wheel(130,88,12,wc,a,6)+wheel(163,88,12,wc,a,6)
    return svg_wrap(b,205,105,label,year,note)

def emd_gp_hood(c,a,wc,label,year,note):
    """EMD GP/SD — road switcher, long hood, offset cab"""
    b=f"""  <rect x="10" y="30" width="185" height="46" rx="4" fill="{c}"/>
  <rect x="10" y="28" width="65" height="50" rx="4" fill="{a}"/>
  <rect x="16" y="34" width="16" height="13" rx="2" fill="#87CEEB" opacity="0.75"/>
  <rect x="36" y="34" width="14" height="13" rx="2" fill="#87CEEB" opacity="0.75"/>
  <rect x="82" y="18" width="10" height="14" rx="2" fill="#555"/>
  <rect x="79" y="15" width="16" height="5" rx="1" fill="#444"/>
  <rect x="110" y="18" width="10" height="14" rx="2" fill="#555"/>
  <rect x="107" y="15" width="16" height="5" rx="1" fill="#444"/>
  <rect x="140" y="20" width="8" height="12" rx="2" fill="#555"/>
  <rect x="12" y="52" width="183" height="8" rx="2" fill="{a}" opacity="0.3"/>
  <circle cx="12" cy="54" r="5" fill="#FFE040" opacity="0.9"/>
  <circle cx="194" cy="54" r="4" fill="#FFE040" opacity="0.5"/>
  <path d="M10,74 L4,80 L4,84 L10,82Z" fill="{c}"/>
"""
    b+=wheel(34,88,12,wc,a,6)+wheel(62,88,12,wc,a,6)
    b+=wheel(120,88,12,wc,a,6)+wheel(150,88,12,wc,a,6)+wheel(178,88,12,wc,a,6)
    return svg_wrap(b,205,105,label,year,note)

def modern_diesel_widecab(c,a,wc,label,year,note):
    """Modern wide-cab diesel — SD70/GE Dash — full-width cab, long hood"""
    b=f"""  <rect x="8" y="26" width="188" height="50" rx="5" fill="{c}"/>
  <rect x="8" y="24" width="80" height="54" rx="5" fill="{a}"/>
  <rect x="14" y="30" width="18" height="14" rx="2" fill="#87CEEB" opacity="0.75"/>
  <rect x="37" y="30" width="18" height="14" rx="2" fill="#87CEEB" opacity="0.75"/>
  <rect x="60" y="30" width="12" height="14" rx="2" fill="#87CEEB" opacity="0.65"/>
  <path d="M8,50 L196,50" stroke="{a}" stroke-width="2" opacity="0.3"/>
  <rect x="96" y="14" width="10" height="14" rx="2" fill="#555"/>
  <rect x="126" y="16" width="10" height="12" rx="2" fill="#555"/>
  <rect x="156" y="16" width="10" height="12" rx="2" fill="#555"/>
  <rect x="92" y="11" width="18" height="5" rx="1" fill="#444"/>
  <circle cx="10" cy="52" r="5" fill="#FFE040" opacity="0.9"/>
  <circle cx="196" cy="52" r="4" fill="#FFE040" opacity="0.5"/>
"""
    b+=wheel(30,88,13,wc,a,6)+wheel(60,88,13,wc,a,6)
    b+=wheel(105,88,13,wc,a,6)+wheel(138,88,13,wc,a,6)
    b+=wheel(168,88,13,wc,a,6)
    return svg_wrap(b,208,106,label,year,note)

def electric_boxcab(c,a,wc,label,year,note):
    """Classic electric box cab — PRR GG1 style, long nose both ends"""
    b=f"""  <path d="M6,34 Q20,20 50,20 L170,20 Q192,20 198,34 L198,76 Q192,86 170,86 L50,86 Q20,86 6,76 Z" fill="{c}"/>
  <path d="M6,34 Q16,24 44,22 L44,84 Q18,82 6,76 Z" fill="{a}" opacity="0.2"/>
  <path d="M198,34 Q190,24 162,22 L162,84 Q186,82 198,76 Z" fill="{a}" opacity="0.2"/>
  <rect x="70"  y="26" width="16" height="12" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="92"  y="26" width="16" height="12" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="114" y="26" width="16" height="12" rx="2" fill="#87CEEB" opacity="0.7"/>
  <line x1="50"  y1="20" x2="100" y2="8"  stroke="{a}" stroke-width="1.5"/>
  <line x1="100" y1="8"  x2="155" y2="20" stroke="{a}" stroke-width="1.5"/>
  <line x1="40"  y1="8"  x2="165" y2="8"  stroke="{a}" stroke-width="2"/>
  <circle cx="8"  cy="55" r="5" fill="#FFE040" opacity="0.9"/>
  <circle cx="196" cy="55" r="5" fill="#FFE040" opacity="0.9"/>
"""
    b+=wheel(38,94,13,wc,a,6)+wheel(68,94,13,wc,a,6)
    b+=wheel(136,94,13,wc,a,6)+wheel(166,94,13,wc,a,6)
    return svg_wrap(b,208,110,label,year,note)

def electric_loco_pantograph(c,a,wc,label,year,note):
    """Modern electric loco — TRAXX/Vectron style — angular body, pantograph"""
    b=f"""  <rect x="8" y="26" width="188" height="52" rx="6" fill="{c}"/>
  <path d="M8,26 L40,20 L168,20 L196,26" fill="{a}" opacity="0.3"/>
  <rect x="8" y="26" width="52" height="52" rx="5" fill="{a}"/>
  <rect x="148" y="26" width="48" height="52" rx="5" fill="{a}"/>
  <rect x="15" y="32" width="16" height="13" rx="2" fill="#87CEEB" opacity="0.75"/>
  <rect x="36" y="32" width="12" height="13" rx="2" fill="#87CEEB" opacity="0.65"/>
  <rect x="156" y="32" width="16" height="13" rx="2" fill="#87CEEB" opacity="0.75"/>
  <rect x="176" y="32" width="13" height="13" rx="2" fill="#87CEEB" opacity="0.65"/>
  <path d="M8,55 L196,55" stroke="{a}" stroke-width="2" opacity="0.35"/>
  <line x1="95"  y1="20" x2="88"  y2="8"  stroke="{a}" stroke-width="1.5"/>
  <line x1="109" y1="20" x2="116" y2="8"  stroke="{a}" stroke-width="1.5"/>
  <line x1="80"  y1="8"  x2="124" y2="8"  stroke="{a}" stroke-width="2.5"/>
  <line x1="78"  y1="11" x2="126" y2="11" stroke="{a}" stroke-width="1.5"/>
  <circle cx="10" cy="52" r="5" fill="#FFE040" opacity="0.9"/>
  <circle cx="194" cy="52" r="5" fill="#FFE040" opacity="0.9"/>
"""
    b+=wheel(34,88,13,wc,a,6)+wheel(64,88,13,wc,a,6)
    b+=wheel(140,88,13,wc,a,6)+wheel(170,88,13,wc,a,6)
    return svg_wrap(b,208,106,label,year,note)

def crocodile_electric(c,a,wc,label,year,note):
    """SBB Crocodile — long articulated, distinctive drooping nose both ends"""
    b=f"""  <path d="M4,50 Q14,30 40,28 L80,28 L80,80 Q50,80 20,76 Q8,68 4,50Z" fill="{c}"/>
  <path d="M202,50 Q190,30 164,28 L124,28 L124,80 Q154,80 184,76 Q196,68 202,50Z" fill="{c}"/>
  <rect x="80" y="20" width="44" height="68" rx="4" fill="{a}"/>
  <rect x="86" y="26" width="14" height="12" rx="2" fill="#87CEEB" opacity="0.7"/>
  <rect x="104" y="26" width="14" height="12" rx="2" fill="#87CEEB" opacity="0.7"/>
  <line x1="92"  y1="20" x2="86"  y2="8"  stroke="{a}" stroke-width="1.5"/>
  <line x1="112" y1="20" x2="118" y2="8"  stroke="{a}" stroke-width="1.5"/>
  <line x1="78"  y1="8"  x2="126" y2="8"  stroke="{a}" stroke-width="2.5"/>
  <circle cx="8"  cy="50" r="5" fill="#FFE040" opacity="0.9"/>
  <circle cx="198" cy="50" r="5" fill="#FFE040" opacity="0.9"/>
"""
    b+=wheel(24,86,12,wc,a,6)+wheel(50,86,12,wc,a,6)
    b+=wheel(154,86,12,wc,a,6)+wheel(180,86,12,wc,a,6)
    return svg_wrap(b,210,106,label,year,note)

def shinkansen_bullet(c,a,wc,snout_len,label,year,note):
    """Shinkansen — various nose lengths, full EMU"""
    sl=snout_len
    b=f"""  <path d="M4,52 Q{4+sl//2},28 {4+sl},24 L195,24 L195,80 L{4+sl},80 Q{4+sl//2},76 4,52 Z" fill="{c}"/>
  <path d="M4,52 Q{4+sl//3},36 {4+sl},32 L{4+sl},72 Q{4+sl//3},68 4,52 Z" fill="{a}" opacity="0.25"/>
  <rect x="{4+sl+4}" y="30" width="15" height="13" rx="2" fill="#87CEEB" opacity="0.6"/>
  <rect x="{4+sl+24}" y="30" width="15" height="13" rx="2" fill="#87CEEB" opacity="0.6"/>
  <rect x="{4+sl+44}" y="30" width="15" height="13" rx="2" fill="#87CEEB" opacity="0.6"/>
  <rect x="{4+sl+64}" y="30" width="15" height="13" rx="2" fill="#87CEEB" opacity="0.6"/>
  <rect x="{4+sl+84}" y="30" width="15" height="13" rx="2" fill="#87CEEB" opacity="0.6"/>
  <path d="M4,54 L195,54" stroke="{a}" stroke-width="2" opacity="0.4"/>
  <line x1="98"  y1="24" x2="92"  y2="12" stroke="{a}" stroke-width="1.5"/>
  <line x1="112" y1="24" x2="118" y2="12" stroke="{a}" stroke-width="1.5"/>
  <line x1="84"  y1="12" x2="130" y2="12" stroke="{a}" stroke-width="2.5"/>
  <circle cx="6"  cy="52" r="4" fill="#FFE040" opacity="0.85"/>
  <circle cx="193" cy="52" r="4" fill="#FFE040" opacity="0.6"/>
"""
    b+=wheel(50+sl//4,88,11,wc,a,6)+wheel(80+sl//4,88,11,wc,a,6)
    b+=wheel(125,88,11,wc,a,6)+wheel(160,88,11,wc,a,6)
    return svg_wrap(b,205,105,label,year,note)

def tgv_style(c,a,wc,nose_sharpness,label,year,note):
    """TGV family — very pointed nose, power car + coaches"""
    ns=nose_sharpness  # higher = sharper
    b=f"""  <path d="M4,54 Q8,{54-ns} {4+30},24 L195,24 L195,82 L{4+30},82 Q8,{54+ns} 4,54 Z" fill="{c}"/>
  <path d="M4,54 Q7,{54-ns//2} {34},30 L{34},78 Q7,{54+ns//2} 4,54 Z" fill="{a}" opacity="0.3"/>
  <rect x="46" y="30" width="14" height="12" rx="2" fill="#87CEEB" opacity="0.6"/>
  <rect x="66" y="30" width="14" height="12" rx="2" fill="#87CEEB" opacity="0.6"/>
  <rect x="90" y="30" width="14" height="12" rx="2" fill="#87CEEB" opacity="0.6"/>
  <rect x="114" y="30" width="14" height="12" rx="2" fill="#87CEEB" opacity="0.6"/>
  <rect x="138" y="30" width="14" height="12" rx="2" fill="#87CEEB" opacity="0.6"/>
  <rect x="162" y="30" width="14" height="12" rx="2" fill="#87CEEB" opacity="0.6"/>
  <path d="M4,56 L195,56" stroke="{a}" stroke-width="3" opacity="0.3"/>
  <line x1="100" y1="24" x2="94"  y2="12" stroke="{a}" stroke-width="1.5"/>
  <line x1="114" y1="24" x2="120" y2="12" stroke="{a}" stroke-width="1.5"/>
  <line x1="86"  y1="12" x2="128" y2="12" stroke="{a}" stroke-width="2.5"/>
  <circle cx="5"  cy="54" r="4" fill="#FFE040" opacity="0.9"/>
"""
    b+=wheel(52,90,11,wc,a,6)+wheel(82,90,11,wc,a,6)
    b+=wheel(128,90,11,wc,a,6)+wheel(162,90,11,wc,a,6)
    return svg_wrap(b,205,106,label,year,note)

def ice_style(c,a,wc,nose_round,label,year,note):
    """ICE family — rounded or semi-pointed nose"""
    b=f"""  <path d="M4,54 Q{4+nose_round},24 {4+nose_round+20},24 L195,24 L195,82 L{4+nose_round+20},82 Q{4+nose_round},82 4,54 Z" fill="{c}"/>
  <path d="M4,54 Q{4+nose_round//2},36 {24+nose_round},30 L{24+nose_round},78 Q{4+nose_round//2},70 4,54 Z" fill="{a}" opacity="0.25"/>
  <rect x="{nose_round+30}" y="30" width="14" height="13" rx="2" fill="#87CEEB" opacity="0.65"/>
  <rect x="{nose_round+50}" y="30" width="14" height="13" rx="2" fill="#87CEEB" opacity="0.65"/>
  <rect x="{nose_round+70}" y="30" width="14" height="13" rx="2" fill="#87CEEB" opacity="0.65"/>
  <rect x="{nose_round+90}" y="30" width="14" height="13" rx="2" fill="#87CEEB" opacity="0.65"/>
  <path d="M4,55 L195,55" stroke="{a}" stroke-width="2.5" opacity="0.3"/>
  <line x1="100" y1="24" x2="94"  y2="12" stroke="{a}" stroke-width="1.5"/>
  <line x1="114" y1="24" x2="120" y2="12" stroke="{a}" stroke-width="1.5"/>
  <line x1="86"  y1="12" x2="128" y2="12" stroke="{a}" stroke-width="2.5"/>
  <circle cx="5" cy="54" r="4" fill="#FFE040" opacity="0.9"/>
"""
    b+=wheel(50+nose_round//4,90,11,wc,a,6)+wheel(80+nose_round//4,90,11,wc,a,6)
    b+=wheel(130,90,11,wc,a,6)+wheel(165,90,11,wc,a,6)
    return svg_wrap(b,205,106,label,year,note)

def ktx_duckbill(c,a,wc,label,year,note):
    """KTX — distinctive duck-bill / shovel nose"""
    b=f"""  <path d="M4,54 Q6,40 20,32 L50,26 L195,26 L195,82 L50,82 L20,76 Q6,68 4,54 Z" fill="{c}"/>
  <path d="M4,54 Q6,42 18,34 L48,28 L48,80 L18,74 Q6,66 4,54 Z" fill="{a}" opacity="0.3"/>
  <path d="M20,48 L48,44 L48,64 L20,60 Z" fill="#87CEEB" opacity="0.65"/>
  <rect x="60" y="32" width="15" height="13" rx="2" fill="#87CEEB" opacity="0.6"/>
  <rect x="82" y="32" width="15" height="13" rx="2" fill="#87CEEB" opacity="0.6"/>
  <rect x="106" y="32" width="15" height="13" rx="2" fill="#87CEEB" opacity="0.6"/>
  <rect x="130" y="32" width="15" height="13" rx="2" fill="#87CEEB" opacity="0.6"/>
  <rect x="154" y="32" width="15" height="13" rx="2" fill="#87CEEB" opacity="0.6"/>
  <path d="M4,56 L195,56" stroke="{a}" stroke-width="3" opacity="0.35"/>
  <line x1="100" y1="26" x2="94"  y2="14" stroke="{a}" stroke-width="1.5"/>
  <line x1="114" y1="26" x2="120" y2="14" stroke="{a}" stroke-width="1.5"/>
  <line x1="86"  y1="14" x2="128" y2="14" stroke="{a}" stroke-width="2.5"/>
  <circle cx="6" cy="54" r="4" fill="#FFE040" opacity="0.9"/>
"""
    b+=wheel(52,90,11,wc,a,6)+wheel(82,90,11,wc,a,6)
    b+=wheel(128,90,11,wc,a,6)+wheel(162,90,11,wc,a,6)
    return svg_wrap(b,205,106,label,year,note)

def crh_fuxing(c,a,wc,label,year,note):
    """Chinese CRH/Fuxing — blunter nose, larger windows, dragon stripe"""
    b=f"""  <path d="M4,54 Q12,26 48,24 L195,24 L195,82 L48,82 Q12,80 4,54 Z" fill="{c}"/>
  <path d="M4,54 Q10,34 42,28 L42,80 Q12,76 4,54 Z" fill="{a}" opacity="0.25"/>
  <path d="M4,54 Q12,52 195,48 L195,56 Q12,60 4,54 Z" fill="{a}" opacity="0.4"/>
  <rect x="56" y="30" width="16" height="14" rx="2" fill="#87CEEB" opacity="0.65"/>
  <rect x="78" y="30" width="16" height="14" rx="2" fill="#87CEEB" opacity="0.65"/>
  <rect x="102" y="30" width="16" height="14" rx="2" fill="#87CEEB" opacity="0.65"/>
  <rect x="126" y="30" width="16" height="14" rx="2" fill="#87CEEB" opacity="0.65"/>
  <rect x="150" y="30" width="16" height="14" rx="2" fill="#87CEEB" opacity="0.65"/>
  <rect x="174" y="30" width="14" height="14" rx="2" fill="#87CEEB" opacity="0.55"/>
  <line x1="100" y1="24" x2="94"  y2="12" stroke="{a}" stroke-width="1.5"/>
  <line x1="114" y1="24" x2="120" y2="12" stroke="{a}" stroke-width="1.5"/>
  <line x1="86"  y1="12" x2="128" y2="12" stroke="{a}" stroke-width="2.5"/>
  <circle cx="6" cy="54" r="4" fill="#FFE040" opacity="0.9"/>
"""
    b+=wheel(54,90,11,wc,a,6)+wheel(84,90,11,wc,a,6)
    b+=wheel(130,90,11,wc,a,6)+wheel(165,90,11,wc,a,6)
    return svg_wrap(b,205,106,label,year,note)

def maglev_style(c,a,label,year,note):
    """Maglev — hovering, no wheels, glowing underbelly"""
    b=f"""  <defs>
    <radialGradient id="hov" cx="50%" cy="100%" r="60%">
      <stop offset="0%" stop-color="{a}" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="{a}" stop-opacity="0"/>
    </radialGradient>
    <filter id="glow2"><feGaussianBlur stdDeviation="2.5"/></filter>
  </defs>
  <ellipse cx="102" cy="92" rx="90" ry="10" fill="url(#hov)"/>
  <path d="M4,52 Q10,24 55,22 L180,22 Q196,22 200,52 L200,76 Q196,82 165,82 L55,82 Q18,80 4,76 Z" fill="{c}"/>
  <path d="M4,52 Q8,34 50,28 L50,76 Q16,72 4,76 Z" fill="{a}" opacity="0.2"/>
  <rect x="58" y="28" width="16" height="12" rx="3" fill="#87CEEB" opacity="0.65"/>
  <rect x="80" y="28" width="16" height="12" rx="3" fill="#87CEEB" opacity="0.65"/>
  <rect x="104" y="28" width="16" height="12" rx="3" fill="#87CEEB" opacity="0.65"/>
  <rect x="128" y="28" width="16" height="12" rx="3" fill="#87CEEB" opacity="0.65"/>
  <rect x="152" y="28" width="16" height="12" rx="3" fill="#87CEEB" opacity="0.65"/>
  <rect x="176" y="28" width="14" height="12" rx="3" fill="#87CEEB" opacity="0.55"/>
  <path d="M4,54 L200,54" stroke="{a}" stroke-width="2" opacity="0.5"/>
  <rect x="30" y="78" width="144" height="6" rx="3" fill="{a}" opacity="0.4"/>
  <ellipse cx="102" cy="84" rx="72" ry="5" fill="{a}" opacity="0.25" filter="url(#glow2)"/>
  <circle cx="6" cy="52" r="4" fill="#00FFFF" opacity="0.9"/>
"""
    return svg_wrap(b,208,102,label,year,note)

def metro_style(c,a,wc,label,year,note):
    """Metro/subway — boxy wide, large windows, multiple doors"""
    b=f"""  <rect x="4" y="22" width="200" height="66" rx="6" fill="{c}"/>
  <rect x="4" y="22" width="200" height="20" rx="5" fill="{a}" opacity="0.3"/>
  <rect x="12" y="28" width="26" height="20" rx="3" fill="#87CEEB" opacity="0.7"/>
  <rect x="44" y="28" width="26" height="20" rx="3" fill="#87CEEB" opacity="0.7"/>
  <rect x="84" y="28" width="26" height="20" rx="3" fill="#87CEEB" opacity="0.7"/>
  <rect x="116" y="28" width="26" height="20" rx="3" fill="#87CEEB" opacity="0.7"/>
  <rect x="148" y="28" width="26" height="20" rx="3" fill="#87CEEB" opacity="0.7"/>
  <rect x="180" y="28" width="18" height="20" rx="3" fill="#87CEEB" opacity="0.6"/>
  <rect x="30" y="50" width="4" height="30" rx="1" fill="{a}" opacity="0.4"/>
  <rect x="60" y="50" width="4" height="30" rx="1" fill="{a}" opacity="0.4"/>
  <rect x="100" y="50" width="4" height="30" rx="1" fill="{a}" opacity="0.4"/>
  <rect x="132" y="50" width="4" height="30" rx="1" fill="{a}" opacity="0.4"/>
  <rect x="164" y="50" width="4" height="30" rx="1" fill="{a}" opacity="0.4"/>
  <path d="M4,44 L204,44" stroke="{a}" stroke-width="2" opacity="0.4"/>
  <circle cx="8"   cy="56" r="4" fill="#FFE040" opacity="0.9"/>
  <circle cx="200" cy="56" r="4" fill="#FFE040" opacity="0.9"/>
"""
    b+=wheel(30,98,11,wc,a,4)+wheel(60,98,11,wc,a,4)
    b+=wheel(148,98,11,wc,a,4)+wheel(178,98,11,wc,a,4)
    return svg_wrap(b,210,112,label,year,note)

def indonesian_cc201(c,a,wc,label,year,note):
    """CC201/CC203 — Indonesian hood unit, short nose cab"""
    b=f"""  <rect x="8" y="28" width="188" height="48" rx="4" fill="{c}"/>
  <rect x="8" y="26" width="70" height="52" rx="4" fill="{a}"/>
  <rect x="14" y="32" width="18" height="14" rx="2" fill="#87CEEB" opacity="0.75"/>
  <rect x="38" y="32" width="16" height="14" rx="2" fill="#87CEEB" opacity="0.65"/>
  <path d="M8,50 L196,50" stroke="{a}" stroke-width="2.5" opacity="0.4"/>
  <rect x="84" y="16" width="10" height="14" rx="2" fill="#555"/>
  <rect x="80" y="13" width="18" height="5" rx="1" fill="#444"/>
  <rect x="110" y="18" width="9" height="12" rx="2" fill="#555"/>
  <rect x="140" y="18" width="9" height="12" rx="2" fill="#555"/>
  <rect x="164" y="16" width="9" height="12" rx="2" fill="#555"/>
  <circle cx="10" cy="52" r="5" fill="#FFE040" opacity="0.9"/>
  <circle cx="196" cy="52" r="4" fill="#FFE040" opacity="0.5"/>
  <path d="M8,74 L4,80 L4,84 L8,82Z" fill="{c}"/>
"""
    b+=wheel(28,88,13,wc,a,6)+wheel(58,88,13,wc,a,6)
    b+=wheel(104,88,13,wc,a,6)+wheel(138,88,13,wc,a,6)+wheel(168,88,13,wc,a,6)
    return svg_wrap(b,208,106,label,year,note)

def indonesian_bb(c,a,wc,label,year,note):
    """BB301/BB302/BB303 — Indonesian B-B diesel, shorter 4-wheel bogie"""
    b=f"""  <rect x="8" y="28" width="160" height="48" rx="4" fill="{c}"/>
  <rect x="8" y="26" width="62" height="52" rx="4" fill="{a}"/>
  <rect x="14" y="32" width="16" height="14" rx="2" fill="#87CEEB" opacity="0.75"/>
  <rect x="36" y="32" width="14" height="14" rx="2" fill="#87CEEB" opacity="0.65"/>
  <path d="M8,52 L168,52" stroke="{a}" stroke-width="2" opacity="0.4"/>
  <rect x="78" y="16" width="9" height="14" rx="2" fill="#555"/>
  <rect x="74" y="13" width="17" height="5" rx="1" fill="#444"/>
  <rect x="105" y="18" width="9" height="12" rx="2" fill="#555"/>
  <rect x="135" y="18" width="9" height="12" rx="2" fill="#555"/>
  <circle cx="10" cy="52" r="5" fill="#FFE040" opacity="0.9"/>
  <circle cx="166" cy="52" r="4" fill="#FFE040" opacity="0.5"/>
"""
    b+=wheel(28,88,13,wc,a,6)+wheel(58,88,13,wc,a,6)
    b+=wheel(110,88,13,wc,a,6)+wheel(144,88,13,wc,a,6)
    return svg_wrap(b,178,106,label,year,note)

def cc300_electric_id(c,a,wc,label,year,note):
    """CC300 Indonesia electric — aerodynamic EMU nose"""
    b=f"""  <path d="M4,52 Q16,26 50,24 L195,24 L195,80 L50,80 Q16,78 4,52 Z" fill="{c}"/>
  <path d="M4,52 Q12,36 44,28 L44,76 Q14,72 4,52 Z" fill="{a}" opacity="0.25"/>
  <path d="M4,54 L195,54" stroke="{a}" stroke-width="3" opacity="0.4"/>
  <rect x="58" y="30" width="16" height="13" rx="2" fill="#87CEEB" opacity="0.65"/>
  <rect x="80" y="30" width="16" height="13" rx="2" fill="#87CEEB" opacity="0.65"/>
  <rect x="104" y="30" width="16" height="13" rx="2" fill="#87CEEB" opacity="0.65"/>
  <rect x="128" y="30" width="16" height="13" rx="2" fill="#87CEEB" opacity="0.65"/>
  <rect x="152" y="30" width="16" height="13" rx="2" fill="#87CEEB" opacity="0.65"/>
  <rect x="176" y="30" width="14" height="13" rx="2" fill="#87CEEB" opacity="0.55"/>
  <line x1="100" y1="24" x2="94"  y2="12" stroke="{a}" stroke-width="1.5"/>
  <line x1="114" y1="24" x2="120" y2="12" stroke="{a}" stroke-width="1.5"/>
  <line x1="86"  y1="12" x2="128" y2="12" stroke="{a}" stroke-width="2.5"/>
  <circle cx="6" cy="52" r="4" fill="#FFE040" opacity="0.9"/>
"""
    b+=wheel(54,90,11,wc,a,6)+wheel(84,90,11,wc,a,6)
    b+=wheel(130,90,11,wc,a,6)+wheel(165,90,11,wc,a,6)
    return svg_wrap(b,205,106,label,year,note)

def orient_express_steam(c,a,wc,label,year,note):
    """Orient Express look — elegant dark cab, brass fittings, express steam"""
    b=f"""  <ellipse cx="38" cy="10" rx="7" ry="5" fill="#CCC" opacity="0.4"/>
  <rect x="30" y="12" width="14" height="26" rx="3" fill="#444"/>
  <rect x="27" y="9"  width="20" height="5" rx="2" fill="#333"/>
  <rect x="38" y="26" width="130" height="36" rx="10" fill="{c}"/>
  <ellipse cx="80" cy="24" rx="11" ry="7" fill="{a}"/>
  <rect x="158" y="16" width="46" height="46" rx="3" fill="#1A0A00"/>
  <path d="M154,14 L204,14 L204,10 Q179,4 154,10Z" fill="{a}"/>
  <rect x="162" y="22" width="12" height="10" rx="2" fill="#87CEEB" opacity="0.75"/>
  <rect x="180" y="22" width="12" height="10" rx="2" fill="#87CEEB" opacity="0.75"/>
  <rect x="38" y="60" width="166" height="7" rx="2" fill="{a}" opacity="0.5"/>
  <path d="M38,60 L18,68 L18,72 L38,68Z" fill="{c}"/>
  <circle cx="22" cy="48" r="5" fill="#FFE040" opacity="0.9"/>
  <rect x="60" y="56" width="18" height="9" rx="2" fill="{c}" opacity="0.4"/>
  <rect x="94" y="56" width="18" height="9" rx="2" fill="{c}" opacity="0.4"/>
  <rect x="128" y="56" width="18" height="9" rx="2" fill="{c}" opacity="0.4"/>
"""
    b+=wheel(62,82,16,wc,a,8)+wheel(96,82,16,wc,a,8)+wheel(130,82,16,wc,a,8)
    b+=wheel(40,84,11,wc,a,4)+wheel(178,84,12,wc,a,4)
    return svg_wrap(b,212,100,label,year,note)

def sleeper_diesel(c,a,wc,label,year,note):
    """Long sleeper/tourist train — smooth sided, observation car look"""
    b=f"""  <rect x="4" y="24" width="230" height="58" rx="5" fill="{c}"/>
  <path d="M4,24 Q18,14 50,14 L190,14 Q214,14 230,24" fill="{a}" opacity="0.35"/>
  <rect x="16" y="30" width="20" height="16" rx="3" fill="#87CEEB" opacity="0.65"/>
  <rect x="44" y="30" width="20" height="16" rx="3" fill="#87CEEB" opacity="0.65"/>
  <rect x="72" y="30" width="20" height="16" rx="3" fill="#87CEEB" opacity="0.65"/>
  <rect x="100" y="30" width="20" height="16" rx="3" fill="#87CEEB" opacity="0.65"/>
  <rect x="128" y="30" width="20" height="16" rx="3" fill="#87CEEB" opacity="0.65"/>
  <rect x="156" y="30" width="20" height="16" rx="3" fill="#87CEEB" opacity="0.65"/>
  <rect x="184" y="30" width="20" height="16" rx="3" fill="#87CEEB" opacity="0.65"/>
  <rect x="210" y="30" width="15" height="16" rx="3" fill="#87CEEB" opacity="0.55"/>
  <path d="M4,50 L230,50" stroke="{a}" stroke-width="2" opacity="0.3"/>
  <circle cx="6"  cy="54" r="4" fill="#FFE040" opacity="0.9"/>
  <circle cx="228" cy="54" r="4" fill="#FFE040" opacity="0.7"/>
"""
    b+=wheel(28,92,11,wc,a,4)+wheel(58,92,11,wc,a,4)
    b+=wheel(110,92,11,wc,a,4)+wheel(148,92,11,wc,a,4)
    b+=wheel(196,92,11,wc,a,4)+wheel(218,92,11,wc,a,4)
    return svg_wrap(b,238,108,label,year,note)

# ── train definitions ─────────────────────────────────────────────────────────
# Each entry: (id, fn_call_returning_svg, label, year)
def make_all():
    trains={}

    # helper: call a style fn and store result
    def add(tid, svg): trains[tid]=svg

    # EARLY STEAM
    add("blenkinsop-rack",    primitive_steam("#5C3A1E","#8B6914","#2C1A0E","Blenkinsop Rack",1812,""))
    add("locomotion-no1",     primitive_steam("#4A2F1A","#7A5C28","#2C1A0E","Locomotion No.1",1825,""))
    add("catch-me-who-can",   primitive_steam("#3D2010","#6B4A20","#1A0A00","Catch Me Who Can",1808,""))
    add("planet-class",       primitive_steam("#2A1A0A","#5A3D1E","#1A0A00","Planet Class",1830,""))
    add("stourbridge-lion",   primitive_steam("#6B3A1A","#9B6A3A","#2C1A0E","Stourbridge Lion",1829,""))
    add("tom-thumb",          primitive_steam("#3A2010","#6B4020","#1A0A00","Tom Thumb",1830,""))
    add("dewitt-clinton",     primitive_steam("#2C1A0E","#5A3D1E","#1A0A00","DeWitt Clinton",1831,""))
    add("best-friend-charleston", primitive_steam("#4A2010","#7A4020","#2C1A0E","Best Friend",1830,""))
    add("stephensons-rocket", rocket_steam("#8B4513","#CD853F","#2C1A0E","Stephenson's Rocket",1829,""))
    add("ffestiniog-narrow",  narrow_gauge_steam("#2D5016","#5A8C2A","#1A2D0A","Ffestiniog",1863,""))

    # CLASSIC AMERICAN STEAM
    add("american-4-4-0",     american_4_4_0("#1A3A6B","#C8A020","#0A1A2C","American 4-4-0",1845,""))
    add("mogul-2-6-0",        american_4_4_0("#2A1A0A","#7A5C28","#100A00","Mogul 2-6-0",1860,""))
    add("consolidation-2-8-0",american_4_4_0("#1A1A2A","#5A5A8A","#0A0A14","Consolidation 2-8-0",1866,""))
    add("ten-wheeler-4-6-0",  american_4_4_0("#3A1A0A","#8A5A2A","#1A0A00","Ten-Wheeler 4-6-0",1870,""))
    add("mikado-2-8-2",       american_4_4_0("#1A2A1A","#4A7A4A","#0A140A","Mikado 2-8-2",1897,""))
    add("atlantic-4-4-2",     american_4_4_0("#2A2A1A","#7A7A3A","#14140A","Atlantic 4-4-2",1900,""))
    add("prr-k4s-pacific",    american_4_4_0("#0A0A1A","#3A3A7A","#000008","PRR K4s Pacific",1914,""))
    add("20th-century-limited",american_4_4_0("#0A1A2A","#4A6A8A","#00080E","20th Century Ltd",1902,""))

    # BRITISH EXPRESS STEAM
    add("flying-scotsman-a1", british_express("#1A3A0A","#3A7A1A","#0A1A00","Flying Scotsman",1923,""))
    add("gresley-a3-pacific", british_express("#0A2A1A","#2A6A4A","#000E08","Gresley A3",1928,""))
    add("castle-class-gwr",   british_express("#1A1A3A","#4A4A8A","#08080E","Castle Class GWR",1923,""))
    add("king-class-gwr",     british_express("#2A0A0A","#7A2A2A","#100000","King Class GWR",1927,""))
    add("duchess-class-lms",  british_express("#0A0A3A","#2A2A8A","#000008","Duchess LMS",1937,""))
    add("britannia-class-br", british_express("#0A1A0A","#2A4A2A","#000800","Britannia Class",1951,""))
    add("cpr-royal-hudson",   british_express("#1A2A3A","#3A5A7A","#080A0E","CPR Royal Hudson",1937,""))
    add("australian-3801",    british_express("#3A1A0A","#8A4A1A","#100500","NSWGR 3801",1943,""))

    # STREAMLINED STEAM
    add("mallard-a4",         streamlined_steam("#1A2A4A","#3A5A8A","#0A0A1A","Mallard A4",1938,""))
    add("drg-class-05",       streamlined_steam("#0A0A0A","#5A5A5A","#000000","DRG Class 05",1935,""))
    add("hiawatha-class-a",   streamlined_steam("#C85A00","#F09020","#5A2800","Hiawatha A",1935,""))
    add("hudson-4-6-4",       streamlined_steam("#1A1A1A","#5A5A5A","#000000","Hudson 4-6-4",1927,""))
    add("berkshire-2-8-4",    streamlined_steam("#2A1A0A","#6A4A2A","#100800","Berkshire 2-8-4",1925,""))
    add("texas-2-10-4",       streamlined_steam("#1A0A0A","#5A2A2A","#080000","Texas 2-10-4",1925,""))
    add("sncf-super-pacific", streamlined_steam("#1A1A3A","#4A4A8A","#080808","SNCF Pacific",1923,""))
    add("chapelon-242-a1",    streamlined_steam("#0A1A0A","#2A5A2A","#000800","Chapelon 242",1942,""))

    # MASSIVE ARTICULATEDS
    add("big-boy-4-8-8-4",   big_boy_steam("#1A1A1A","#6A6A6A","#000000","Big Boy 4-8-8-4",1941,""))
    add("challenger-4-6-6-4",big_boy_steam("#2A1A0A","#7A5A2A","#100800","Challenger 4-6-6-4",1936,""))
    add("garratt-lms",       garratt_steam("#1A3A1A","#3A7A3A","#0A1A0A","Garratt LMS",1927,""))
    add("jnr-d51",           garratt_steam("#0A0A0A","#4A4A4A","#000000","JNR D51 Mikado",1936,""))

    # OTHER STEAM
    add("drb-class-52",      british_express("#2A2A2A","#5A5A5A","#101010","DRB Class 52",1941,""))
    add("jnr-c62",           british_express("#0A1A3A","#2A4A7A","#000814","JNR C62 Hudson",1949,""))
    add("sar-class-25",      british_express("#1A2A1A","#3A5A3A","#080E08","SAR Class 25",1953,""))
    add("wap-class-india-steam",british_express("#1A0A2A","#4A2A6A","#08000E","Indian WP Pacific",1947,""))
    add("orient-express",    orient_express_steam("#0A0814","#B8860B","#050408","Orient Express",1883,""))
    add("trans-siberian",    orient_express_steam("#1A0A0A","#6B3A1A","#0A0000","Trans-Siberian",1891,""))

    # DIESEL EMD F/E
    add("flying-hamburger",  emd_f_unit("#C8C8C8","#4A4A4A","#1A1A1A","Flying Hamburger",1932,""))
    add("emd-e-unit",        emd_f_unit("#C89020","#1A3A6B","#0A0A0A","EMD E-Unit",1937,""))
    add("emd-f-unit",        emd_f_unit("#C85A00","#1A1A1A","#0A0000","EMD F-Unit",1939,""))

    # DIESEL HOOD UNITS
    add("emd-gp7",           emd_gp_hood("#1A5A1A","#F09020","#0A1A0A","EMD GP7",1949,""))
    add("emd-sd40",          emd_gp_hood("#C85A00","#1A1A1A","#5A2800","EMD SD40",1966,""))
    add("emd-sd70m",         emd_gp_hood("#3A6A1A","#F09020","#1A2A0A","EMD SD70M",1992,""))
    add("emd-sd90mac",       emd_gp_hood("#1A1A3A","#5A5ACA","#0A0A14","EMD SD90MAC",1995,""))
    add("ge-dash-9",         emd_gp_hood("#C87820","#0A3A6B","#5A3808","GE Dash 9-44CW",1993,""))
    add("ge-es44ac",         emd_gp_hood("#C85A00","#1A2A0A","#5A2800","GE ES44AC",2004,""))
    add("ge-tier4-et44",     emd_gp_hood("#6B3A1A","#F09020","#2A1208","GE Tier4 ET44",2015,""))
    add("dongfeng-4",        emd_gp_hood("#8B4513","#CD853F","#3A1A08","Dongfeng DF4",1968,""))
    add("df11-china",        emd_gp_hood("#1A3A6B","#F0C820","#0A1428","DF11 China",1992,""))
    add("class-66-emd",      emd_gp_hood("#C8A020","#1A3A1A","#5A4808","Class 66 EMD",1998,""))
    add("class-67-uk",       emd_gp_hood("#1A3A6B","#C8A020","#08142A","Class 67 UK",1999,""))
    add("vossloh-euro-4000", emd_gp_hood("#C83020","#1A1A1A","#5A0808","Vossloh Euro 4000",2004,""))
    add("waratah-nsr",       emd_gp_hood("#1A1A6B","#C8A020","#080828","Waratah NSW",1960,""))

    # MODERN WIDE-CAB DIESEL
    add("blue-train-sa",     modern_diesel_widecab("#1A2A5A","#87CEEB","#0A1228","Blue Train SA",1939,""))
    add("ghan-australia",    modern_diesel_widecab("#C87820","#1A1A1A","#5A3808","The Ghan",1929,""))
    add("indian-pacific",    modern_diesel_widecab("#C85A1A","#1A1A1A","#5A2808","Indian Pacific",1970,""))
    add("palace-wheels-india",modern_diesel_widecab("#C8A020","#2A1A0A","#5A4808","Palace on Wheels",1982,""))
    add("rocky-mountaineer", modern_diesel_widecab("#1A5A1A","#C8A020","#0A2A0A","Rocky Mountaineer",1990,""))
    add("california-zephyr", modern_diesel_widecab("#C8C8E8","#1A2A5A","#5A5A6A","California Zephyr",1949,""))
    add("broadway-limited",  modern_diesel_widecab("#1A1A1A","#C8A020","#080808","Broadway Limited",1912,""))
    add("silver-meteor",     modern_diesel_widecab("#C8C8C8","#1A3A6B","#5A5A5A","Silver Meteor",1939,""))

    # INDONESIAN DIESELS
    add("cc201-indonesia",   indonesian_cc201("#1A5A1A","#F09020","#0A2A0A","CC201 Indonesia",1976,""))
    add("cc203-indonesia",   indonesian_cc201("#1A3A6B","#F0C820","#0A1428","CC203 Indonesia",1995,""))
    add("bb301-indonesia",   indonesian_bb("#C85A00","#F09020","#5A2800","BB301 Indonesia",1977,""))
    add("bb302-indonesia",   indonesian_bb("#C83020","#F09020","#5A0808","BB302 Indonesia",1980,""))
    add("bb303-indonesia",   indonesian_bb("#1A3A6B","#F0C820","#08142A","BB303 Indonesia",1986,""))

    # ELECTRIC BOX-CAB
    add("prr-gg1",           electric_boxcab("#1A1A6B","#C8A020","#080828","PRR GG1",1934,""))
    add("sbb-crocodile",     crocodile_electric("#2A5A1A","#C8A020","#101A0A","SBB Crocodile",1919,""))
    add("fs-e444",           electric_boxcab("#C83020","#C8A020","#5A0808","FS E.444",1967,""))
    add("szd-vl80",          electric_boxcab("#C83020","#5A5A5A","#5A0808","SZD VL80",1961,""))

    # MODERN ELECTRIC LOCO
    add("sbb-re-4-4",        electric_loco_pantograph("#C83020","#C8A020","#5A0808","SBB Re 4/4",1964,""))
    add("sncf-bb-9004",      electric_loco_pantograph("#1A1A6B","#C8C8C8","#080828","SNCF BB 9004",1957,""))
    add("db-br-110",         electric_loco_pantograph("#C87820","#C8C8C8","#5A3808","DB BR 110",1956,""))
    add("db-br-140",         electric_loco_pantograph("#C87820","#5A5A5A","#5A3808","DB BR 140",1957,""))
    add("db-br-101",         electric_loco_pantograph("#C83020","#C8C8C8","#5A0808","DB BR 101",1996,""))
    add("db-br-185-traxx",   electric_loco_pantograph("#C83020","#5A5A5A","#5A0808","DB BR 185 TRAXX",2000,""))
    add("bombardier-traxx",  electric_loco_pantograph("#1A1A1A","#C83020","#080808","Bombardier TRAXX",1998,""))
    add("alstom-prima-ii",   electric_loco_pantograph("#1A3A1A","#C8A020","#0A1A0A","Alstom Prima II",2004,""))
    add("siemens-vectron",   electric_loco_pantograph("#0A0A1A","#87CEEB","#000008","Siemens Vectron",2012,""))
    add("obb-1116-taurus",   electric_loco_pantograph("#C83020","#C8C8C8","#5A0808","ÖBB 1116 Taurus",1999,""))
    add("wap-7-india",       electric_loco_pantograph("#1A5A1A","#C8A020","#0A2A0A","WAP-7 India",1999,""))
    add("stadler-flirt",     electric_loco_pantograph("#C8C8C8","#1A3A6B","#5A5A5A","Stadler FLIRT",2004,""))
    add("siemens-desiro",    electric_loco_pantograph("#C8C8C8","#C83020","#5A5A5A","Siemens Desiro",2002,""))
    add("alstom-coradia",    electric_loco_pantograph("#C8C8C8","#1A5A1A","#5A5A5A","Alstom Coradia",2000,""))
    add("sj-x2-sweden",      electric_loco_pantograph("#C8C8C8","#1A3A6B","#5A5A5A","SJ X2 Sweden",1990,""))
    add("ns-intercity-direct",electric_loco_pantograph("#C8A020","#1A3A6B","#5A4808","NS Intercity",2012,""))
    add("fs-etr-500",        electric_loco_pantograph("#C83020","#C8C8C8","#5A0808","Frecciarossa 500",1997,""))
    add("cc300-indonesia",   cc300_electric_id("#1A3A6B","#F0C820","#08142A","CC300 Indonesia",2018,""))

    # SWISS ALPINE
    add("bernina-express",   electric_loco_pantograph("#C83020","#C8C8C8","#5A0808","Bernina Express",1910,""))
    add("glacier-express",   electric_loco_pantograph("#C83020","#C8C8C8","#5A0808","Glacier Express",1930,""))

    # SHINKANSEN SERIES — each with different snout length
    add("shinkansen-0",     shinkansen_bullet("#F0F0F0","#1A3A6B","#C8C8C8",14,"Shinkansen 0",1964,""))
    add("shinkansen-100",   shinkansen_bullet("#F0F0F0","#1A3A6B","#C8C8C8",18,"Shinkansen 100",1985,""))
    add("shinkansen-300",   shinkansen_bullet("#F0F0F0","#1A3A6B","#C8C8C8",24,"Shinkansen 300",1992,""))
    add("shinkansen-500",   shinkansen_bullet("#0A0A6B","#C8C8C8","#000028",38,"Shinkansen 500",1997,""))
    add("shinkansen-700",   shinkansen_bullet("#F0F0F0","#1A3A6B","#C8C8C8",20,"Shinkansen 700",1999,""))
    add("shinkansen-n700",  shinkansen_bullet("#1A1A6B","#C8A020","#08082A",28,"Shinkansen N700",2007,""))
    add("shinkansen-n700s", shinkansen_bullet("#F0F0F0","#C83020","#C8C8C8",30,"Shinkansen N700S",2020,""))
    add("shinkansen-e5",    shinkansen_bullet("#1A6B1A","#C8A020","#0A2A0A",36,"Shinkansen E5",2011,""))
    add("shinkansen-e7",    shinkansen_bullet("#C8A020","#1A1A1A","#5A4808",22,"Shinkansen E7",2014,""))
    add("shinkansen-e6",    shinkansen_bullet("#C83020","#C8C8C8","#5A0808",34,"Shinkansen E6",2013,""))

    # TGV SERIES — different nose sharpness
    add("tgv-sud-est",     tgv_style("#1A6B1A","#C8C8C8","#0A2A0A",20,"TGV Sud-Est",1981,""))
    add("tgv-atlantique",  tgv_style("#1A3A6B","#C8C8C8","#081428",24,"TGV Atlantique",1989,""))
    add("tgv-duplex",      tgv_style("#1A3A6B","#C8A020","#081428",26,"TGV Duplex",1995,""))
    add("tgv-euroduplex",  tgv_style("#0A0A6B","#C8A020","#000028",28,"TGV Euroduplex",2011,""))
    add("tgv-inoui",       tgv_style("#0A1A3A","#87CEEB","#000814",32,"TGV InOui",2024,""))

    # ICE SERIES — different nose roundness
    add("ice-1",  ice_style("#F0F0F0","#C83020","#C8C8C8",8, "ICE 1",1991,""))
    add("ice-2",  ice_style("#F0F0F0","#C83020","#C8C8C8",10,"ICE 2",1997,""))
    add("ice-3",  ice_style("#F0F0F0","#C83020","#C8C8C8",14,"ICE 3",2000,""))
    add("ice-4",  ice_style("#F0F0F0","#C83020","#C8C8C8",6, "ICE 4",2017,""))

    # OTHER HIGH SPEED
    add("eurostar-e300",     tgv_style("#0A1A3A","#C8A020","#000814",22,"Eurostar e300",1994,""))
    add("eurostar-e320",     ice_style("#0A1A3A","#C8A020","#000814",12,"Eurostar e320",2015,""))
    add("renfe-ave-100",     tgv_style("#C8C8C8","#C8A020","#5A5A5A",18,"AVE Class 100",1992,""))
    add("ave-103-velaro-e",  ice_style("#C8C8C8","#C83020","#5A5A5A",16,"AVE 103 Velaro",2006,""))
    add("ktx-i",             ktx_duckbill("#1A3A6B","#C8C8C8","#081428","KTX-I",2004,""))
    add("ktx-sancheon",      ktx_duckbill("#1A3A6B","#87CEEB","#081428","KTX-Sancheon",2010,""))
    add("ktx-eum",           ktx_duckbill("#C83020","#C8C8C8","#5A0808","KTX-Eum",2021,""))
    add("fuxing-cr400",      crh_fuxing("#C83020","#C8C8C8","#5A0808","Fuxing CR400",2017,""))
    add("crh2-china",        crh_fuxing("#F0F0F0","#1A3A6B","#C8C8C8","CRH2 China",2007,""))
    add("crh380a",           crh_fuxing("#F0F0F0","#1A3A6B","#C8C8C8","CRH380A",2010,""))
    add("trenitalia-italo",  tgv_style("#C83020","#C8C8C8","#5A0808",30,"NTV Italo",2012,""))
    add("afrosiyob-uzbekistan",ice_style("#1A3A6B","#C8A020","#081428",10,"Afrosiyob",2011,""))
    add("haramain-express",  crh_fuxing("#F0F0F0","#C8A020","#C8C8C8","Haramain Express",2018,""))
    add("hsr-taiwan",        shinkansen_bullet("#F0F0F0","#C83020","#C8C8C8",26,"Taiwan HSR",2007,""))
    add("acela-amtrak",      tgv_style("#C8C8C8","#1A3A6B","#5A5A5A",16,"Acela Amtrak",2000,""))

    # MAGLEV
    add("shanghai-maglev",  maglev_style("#0A1A3A","#87CEEB","Shanghai Maglev",2002,""))
    add("transrapid-07",    maglev_style("#C8C8C8","#1A3A6B","Transrapid 07",1989,""))
    add("linimo-aichi",     maglev_style("#F0F0F0","#1A5A1A","Linimo HSST",2005,""))
    add("shinkansen-l0",    maglev_style("#0A0A1A","#00D4FF","SCMaglev L0",2027,""))
    add("hyperloop-concept",maglev_style("#0A0A0A","#FF6600","Hyperloop Concept",2030,""))

    # METRO
    add("london-underground",metro_style("#C83020","#C8C8C8","#5A0808","London Tube",1863,""))
    add("paris-metro",       metro_style("#1A5A1A","#C8C8C8","#0A2A0A","Paris Métro",1900,""))
    add("new-york-subway",   metro_style("#C8A020","#1A3A6B","#5A4808","NY Subway",1904,""))
    add("moscow-metro",      metro_style("#C83020","#C8A020","#5A0808","Moscow Metro",1935,""))
    add("tokyo-metro",       metro_style("#1A3A6B","#C83020","#081428","Tokyo Metro",1927,""))
    add("mrt-jakarta",       metro_style("#C83020","#C8C8C8","#5A0808","MRT Jakarta",2019,""))
    add("lrt-jakarta",       metro_style("#1A5A1A","#C8A020","#0A2A0A","LRT Jakarta",2019,""))
    add("commuter-line-krl", metro_style("#1A3A6B","#F0C820","#081428","KRL Commuter Line",2011,""))
    add("mrt-singapore",     metro_style("#C83020","#C8C8C8","#5A0808","MRT Singapore",1987,""))
    add("mrt-kuala-lumpur",  metro_style("#C83020","#F0C820","#5A0808","MRT KL",2016,""))
    add("bts-bangkok",       metro_style("#1A5A1A","#C8A020","#0A2A0A","BTS Bangkok",1999,""))
    add("delhi-metro",       metro_style("#1A3A6B","#C83020","#081428","Delhi Metro",2002,""))
    add("dubai-metro",       metro_style("#C8A020","#C8C8C8","#5A4808","Dubai Metro",2009,""))

    return trains

def main():
    trains = make_all()
    print(f"Generating {len(trains)} unique SVG icons …")
    for tid, svg in trains.items():
        path = os.path.join(OUT, f"{tid}.svg")
        with open(path,"w",encoding="utf-8") as f:
            f.write(svg)
        print(f"  {tid}.svg")
    print(f"\nDone — {len(trains)} SVGs written to {OUT}")

if __name__=="__main__":
    main()
