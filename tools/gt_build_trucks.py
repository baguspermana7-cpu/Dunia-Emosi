#!/usr/bin/env python3
"""
Garasi Tempur truck database -> games/data/gt-trucks.js (like POKEMON_DB: one entry per picture).

    python3 tools/gt_build_trucks.py

Every sprite assets/db/lib/gt-truck/truck-NNN.webp gets: an ORIGINAL Indonesian name chosen from
its look (never the brand name printed on the owner's sheet), a Type, HP, two attacks (fuel +
damage), rarity, CP (a power score for sorting/collection, like Pokemon CP), what it is strong
against, and a one-line description. Stats are DETERMINISTIC (seeded by the id) and always inside
the PRD bands: HP 10-20, damage 1-7, fuel 0-3 (gated by tools/qa-gt-rules.mjs).
"""
import hashlib, json, os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'games', 'data', 'gt-trucks.js')

# n: (name, type, look) — type from the truck's theme, look = what a child sees
T = """
1|Kubur Hijau|MUD|truk hijau bergambar makam dan api
2|Duri Baja|ARMOR|truk abu penuh duri besi
3|Banteng Api|POWER|banteng merah dengan tanduk menyala
4|Hiu Raksasa|SPEED|hiu abu bergigi tajam
5|Hantu Ungu|STUNT|mobil van ungu bergambar badut
6|Zombi Tanah|MUD|zombi cokelat dengan tangan menjulur
7|Naga Hijau|POWER|naga hijau bersirip jingga
8|Anjing Totol|SPEED|anjing putih bertotol hitam
9|Anjing Garang|POWER|anjing hitam bertaring
10|Serigala Salju|SPEED|serigala abu dengan lidah menjulur
11|Api Hijau|SPEED|mobil klasik hijau bermotif api
12|Kapal Hitam|STUNT|kapal bajak laut cokelat
13|Kapten Bajak|STUNT|truk merah bertopi bajak laut
14|Anjing Cokelat|STUNT|anjing cokelat berkalung biru
15|Pemburu Biru|TECH|truk biru dengan tengkorak pemburu
16|Daun Merah|ARMOR|truk hitam berdaun merah
17|Gempa Kuning|MUD|truk kuning berbintik
18|Cambuk Tosca|SPEED|truk tosca bermotif ungu
19|Bus Mundur|STUNT|bus sekolah kuning
20|Bus Sekolah|ARMOR|bus kuning panjang
21|Rex Jingga|POWER|dinosaurus jingga menganga
22|Domba Baja|ARMOR|domba hitam bertanduk perak
23|Batu Belang|MUD|truk batu bermotif belang
24|Kilat Biru|SPEED|pikap biru bergaris jingga
25|Roket Jingga|SPEED|truk jingga secepat roket
26|Penyihir Ungu|TECH|truk ungu penyihir
27|Mohawk|POWER|truk putih berjambul hitam
28|Banteng Cokelat|POWER|banteng cokelat bertanduk besar
29|Alien Hijau|TECH|truk hijau bergambar alien
30|Kalajengking Biru|SPEED|kalajengking biru berekor tinggi
31|Monyet Merah|POWER|truk merah bergambar monyet
32|Tengkorak Besi|ARMOR|truk hitam bertengkorak
33|Tentara Bintang|ARMOR|truk tentara bercorak bendera
34|Hantu Jubah|STUNT|truk ungu bertudung hantu
35|Duri Api|ARMOR|truk jingga berduri
36|Liar Biru|SPEED|truk biru bergambar liar
37|Unikorn Kilau|STUNT|unikorn putih berbulu merah muda
38|Racun Hijau|MUD|truk hijau beracun
39|Hiu Harimau|SPEED|hiu jingga bergaris hitam
40|Gurita Hijau|TECH|gurita hijau bertentakel
41|Tanduk Merah|POWER|truk merah bertanduk
42|Longsor Es|ARMOR|truk biru putih seperti es
43|Pemburu Zombi|MUD|zombi pucat bergigi
44|Raja Ketapel|STUNT|truk hitam hijau bergaya ketapel
45|Pemangsa Ungu|POWER|mulut ungu bergigi besar
46|Penstabil|TECH|truk hijau yang seimbang
47|Geng Loreng|ARMOR|truk gurun bermotif loreng
48|Waktu Terbang|SPEED|truk merah kuning cepat
49|Guntur Biru|SPEED|truk biru bergambar petir
50|Badut Hijau|STUNT|truk hijau bergambar badut
51|Hiu Belang|SPEED|hiu jingga bergaris
52|Tulang Guncang|ARMOR|kerangka tulang raksasa
53|Buaya Lumpur|MUD|buaya hijau bergigi
54|Pemadam Merah|POWER|truk pemadam kebakaran merah
55|Kalajengking Torpedo|SPEED|kalajengking biru jingga
56|Lendir Hijau|MUD|truk hijau berlumur lendir
57|Badak Biru|ARMOR|badak biru bercula jingga
58|Hiu Baja|SPEED|hiu biru berbaju baja
59|Macan Kumbang|SPEED|macan hitam bermata hijau
60|Tengkorak Tanduk|POWER|tengkorak bertanduk merah
61|Kelelawar Merah|STUNT|truk merah bersayap kelelawar
62|Juara Balap|SPEED|truk balap biru
63|Bus Kuning|ARMOR|bus sekolah kuning
64|Van Pesta|STUNT|van ungu penuh warna
65|Pikap Biru|POWER|pikap biru klasik
66|Naga Merah|POWER|naga merah bersayap
67|Gigitan Ular|MUD|ular hijau merah
68|Alarm Api|POWER|truk pemadam putih merah
69|Yeti Es|ARMOR|yeti biru putih bertaring
70|Setrum Ungu|TECH|truk ungu penuh listrik
71|Stego Duri|ARMOR|stegosaurus berduri
72|Mesin Kembar|TECH|truk hitam bermesin kembar
73|Robot Zombi|TECH|robot hijau bertangan zombi
74|Pemburu Harta|STUNT|truk biru bergigi hiu
75|Pengendara Hantu|STUNT|truk ungu bertengkorak
76|Pasukan Bebas|ARMOR|truk putih biru bercorak bintang
77|Pak Sheriff|ARMOR|mobil polisi hitam putih
78|Anjing Pengangkut|SPEED|anjing cokelat berlidah
79|Mutan Hijau|MUD|truk hijau hitam mutan
80|Hiu Api|POWER|hiu hitam merah berduri
81|Daun Biru|ARMOR|truk biru berdaun putih
82|Tanduk Api|POWER|truk merah bertanduk api
83|Unikorn Merah Muda|STUNT|unikorn putih berpelangi
84|Kubur Ungu|MUD|truk hijau ungu bergambar makam
85|Hiu Badai|SPEED|hiu perak badai
86|Alien Biru|TECH|truk biru bergambar alien
87|Kalajengking Jingga|SPEED|kalajengking jingga
88|Racun Neon|MUD|truk hijau neon beracun
89|Nitro Neon|TECH|truk hitam kuning bernitro
90|Bendera Bintang|ARMOR|truk putih merah biru
91|Tentara Gurun|ARMOR|truk tentara gurun
92|Anjing Ceria|STUNT|anjing cokelat ceria
93|Bus Keren|ARMOR|bus kuning keren
94|Naga Bersayap|POWER|naga merah bersayap besar
95|Hiu Ekor|SPEED|hiu biru berekor panjang
96|Raptor|POWER|raptor merah bergigi
97|Banteng Es|SPEED|banteng biru es
98|Grafiti|TECH|truk penuh grafiti warna-warni
99|Liar Ungu|SPEED|truk ungu jingga liar
100|Makam Legenda|MUD|truk hijau legenda makam
101|Badut Biru|STUNT|van biru bergambar badut
102|Banteng Hitam|POWER|banteng hitam bertanduk emas
103|Anjing Hitam|POWER|anjing hitam berlidah merah
104|Totol Klasik|SPEED|anjing totol klasik
105|Naga Neon|POWER|naga hijau jingga neon
106|Duri Topeng|ARMOR|truk hitam berduri bertopeng
107|Zombi Malam|MUD|zombi cokelat berlengan panjang
108|Api Hitam|SPEED|mobil klasik hitam berapi
109|Pengeruk Kuning|MUD|truk kuning berbintik
110|Hiu Lava|SPEED|hiu bermotif api
111|Gurita Biru|TECH|gurita biru bermata banyak
112|Pemangsa Malam|POWER|mulut ungu bergigi
113|Velo|POWER|velociraptor merah putih
114|T-Rex Jingga|POWER|t-rex jingga menganga
115|Kilat Merah|SPEED|pikap merah putih
116|Jam Jingga|SPEED|truk jingga cepat
117|Geng Hitam|ARMOR|truk hitam geng
118|Batu Biru|MUD|truk biru bermotif batu
119|Bus Emas|STUNT|bus emas mengilap
120|Bus Merah|ARMOR|bus merah panjang
121|Hutan Hijau|MUD|truk hijau hutan
122|Buaya Pesta|MUD|buaya hijau jingga
123|Tegangan Biru|TECH|truk biru bertegangan
124|Triceratops|POWER|triceratops jingga bertanduk
125|Petir Biru|SPEED|truk biru petir
126|Domba Merah|ARMOR|domba merah bertanduk
127|Mohawk Ungu|POWER|truk hitam berjambul ungu
128|Buaya Hijau|MUD|buaya hijau berekor
129|Alien Perak|TECH|truk perak bergambar alien
130|Banteng Nyala|POWER|banteng hitam bermotif api
131|Anjing Jingga|POWER|anjing hitam jingga
132|Totol Merah|SPEED|anjing totol berkalung merah
133|Hiu Abu|SPEED|hiu abu besar
134|Kubur Hijau Tua|MUD|truk hijau tua bertengkorak
135|Rex Api|POWER|dinosaurus jingga api
136|Zombi Merah|MUD|zombi merah bertangan
137|Duri Kuning|ARMOR|truk abu berduri topeng kuning
138|Pemangsa Api|POWER|truk jingga bergigi
139|Gempa Emas|MUD|truk kuning emas
140|Laba-laba Hitam|STUNT|laba-laba hitam berkaki panjang
141|Torpedo Biru|SPEED|kalajengking biru jingga
142|Lumut Beracun|MUD|truk hijau lumut
143|Api Jingga|SPEED|truk jingga berapi
144|Bintang Merah|ARMOR|truk bercorak bendera
145|Penyihir Topi|TECH|truk ungu bertopi penyihir
146|Tentara Pasir|ARMOR|truk tentara pasir
147|Bus Belajar|ARMOR|bus kuning belajar
148|Yeti Biru|ARMOR|yeti biru bertaring
149|Naga Api|POWER|naga merah bersayap api
150|Ular Hijau|MUD|ular hijau bermotif
151|Robot Rongsok|TECH|truk robot abu
152|Gigitan Es|ARMOR|truk es bergigi
153|Kalajengking Api|POWER|kalajengking jingga api
154|Buldoser Biru|POWER|truk biru bertanduk
155|Jubah Ungu|STUNT|truk ungu bertudung
156|Rawa Hijau|MUD|truk hijau rawa
157|Bara Api|POWER|truk merah kuning bara
158|Truk Gandeng|ARMOR|truk kontainer biru
159|Singa Jingga|POWER|singa jingga bersurai
160|Tank Loreng|ARMOR|truk tank loreng hijau
161|Buaya Gigit|MUD|buaya hitam jingga
162|Badak Batu|ARMOR|badak batu bercula
163|Pembebas|ARMOR|truk merah putih biru
164|Radioaktif|TECH|truk hijau radioaktif
165|Monster Lendir|MUD|mulut ungu kuning
166|Logam Duri|ARMOR|truk hitam logam berduri
167|Hiu Darat|SPEED|hiu biru di darat
168|Zombi Putih|MUD|zombi putih merah
169|Badai Guntur|SPEED|truk biru jingga guntur
170|Samurai Merah|TECH|truk merah samurai
171|Tawon|SPEED|tawon kuning hitam
172|T-Rex Hijau|POWER|t-rex hijau cokelat
173|Ksatria Hitam|ARMOR|truk hitam ksatria
174|Bendera Bajak|STUNT|truk emas berbendera bajak laut
"""

STRONG = {'POWER': 'ARMOR', 'ARMOR': 'TECH', 'TECH': 'POWER', 'SPEED': 'MUD', 'MUD': 'STUNT', 'STUNT': 'SPEED'}
HP = {'POWER': (13, 16), 'SPEED': (10, 13), 'MUD': (15, 19), 'STUNT': (11, 14), 'ARMOR': (16, 20), 'TECH': (12, 15)}
MOVES = {
    'POWER': (['Seruduk', 'Tabrak Keras', 'Dorong Kuat', 'Hantaman'], ['Banting Raksasa', 'Remuk Total', 'Tinju Mesin', 'Hantam Bumi']),
    'SPEED': (['Lesat Kilat', 'Sambar Cepat', 'Salip Kiri', 'Gas Pol'], ['Nitro Lewat', 'Terjang Angin', 'Kilat Ganda', 'Pusaran Ban']),
    'MUD':   (['Cipratan Lumpur', 'Gilas Tanah', 'Lempar Tanah', 'Ban Berlumpur'], ['Banting Rawa', 'Longsor Lumpur', 'Gempa Tanah', 'Kubur Lumpur']),
    'STUNT': (['Lompat Ramp', 'Putar Ban', 'Loncat Tinggi', 'Salto Kecil'], ['Salto Ganda', 'Terbang Tinggi', 'Mendarat Keras', 'Putar Udara']),
    'ARMOR': (['Dorong Baja', 'Tameng Tabrak', 'Sodok Besi', 'Benturan'], ['Benteng Baja', 'Tanduk Besi', 'Palu Baja', 'Tembok Jalan']),
    'TECH':  (['Setrum Kecil', 'Gigi Roda', 'Sinar Laser', 'Magnet Tarik'], ['Laser Turbo', 'Robot Hantam', 'Badai Listrik', 'Pulsa Nitro']),
}
RARITY = [('biasa', 0.55), ('langka', 0.28), ('epik', 0.13), ('legenda', 0.04)]


def r01(key, salt):
    return int(hashlib.sha1(f'{key}:{salt}'.encode()).hexdigest()[:8], 16) / 0xFFFFFFFF


def main():
    trucks = []
    for line in T.strip().splitlines():
        n, name, typ, look = line.split('|')
        tid = f'truck-{int(n):03d}'
        lo, hi = HP[typ]
        hp = lo + int(r01(tid, 'hp') * (hi - lo + 1))
        r = r01(tid, 'rarity'); acc = 0; rarity = RARITY[-1][0]
        for k, p in RARITY:
            acc += p
            if r <= acc: rarity = k; break
        small, big = MOVES[typ]
        a1 = {'name': small[int(r01(tid, 'm1') * 4)], 'fuel': 1, 'dmg': 2 + int(r01(tid, 'd1') * 2)}   # 2-3
        f2 = 2 + int(r01(tid, 'f2') * 2)                                                              # 2-3
        d2 = f2 + 1 + int(r01(tid, 'd2') * 2) + (1 if rarity in ('epik', 'legenda') else 0)          # 3-7
        a2 = {'name': big[int(r01(tid, 'm2') * 4)], 'fuel': f2, 'dmg': min(7, d2)}
        cp = hp * 10 + (a1['dmg'] + a2['dmg']) * 15 + {'biasa': 0, 'langka': 20, 'epik': 45, 'legenda': 80}[rarity]
        trucks.append({'id': tid, 'name': name, 'type': typ, 'hp': hp, 'strongVs': STRONG[typ], 'attacks': [a1, a2],
                       'rarity': rarity, 'cp': cp, 'desc': look[0].upper() + look[1:] + '.', 'sprite': f'gt-truck/{tid}'})
    names = [t['name'] for t in trucks]
    assert len(set(names)) == len(names), 'duplicate truck names'
    assert len(trucks) == 174
    js = ('/* GENERATED by tools/gt_build_trucks.py — do not edit. window.GTTrucks: one entry per truck\n'
          ' * picture (assets/db/lib/gt-truck/truck-NNN.webp) with an original name, Type, HP, two attacks,\n'
          ' * rarity, CP and a description — the Garasi Tempur equivalent of POKEMON_DB. */\n'
          '(function () {\n  var W = typeof window !== "undefined" ? window : globalThis\n'
          '  var T = ' + json.dumps(trucks, ensure_ascii=False, separators=(',', ':')) + '\n'
          '  var BY = {}; T.forEach(function (t) { BY[t.id] = t })\n'
          '  W.GTTrucks = { ALL: T, get: function (id) { return BY[id] || null },\n'
          '    byType: function (ty) { return T.filter(function (t) { return t.type === ty }) } }\n'
          '  if (typeof module !== "undefined" && module.exports) module.exports = W.GTTrucks\n})()\n')
    open(OUT, 'w').write(js)
    from collections import Counter
    print('trucks', len(trucks), dict(Counter(t['type'] for t in trucks)), dict(Counter(t['rarity'] for t in trucks)))


if __name__ == '__main__':
    main()
