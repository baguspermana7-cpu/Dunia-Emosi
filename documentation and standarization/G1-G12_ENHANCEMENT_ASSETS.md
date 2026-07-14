# Dunia Emosi — DATABASE ASET PENYEMPURNAAN (game NON-Pokémon & NON-Kereta)

> **Tujuan:** *meng-ENHANCE* game g1–g9, g11, g12 (belajar) — **BUKAN mengganti emoji/aset lama.**
> Semua sprite baru dipasang **ADITIF, dengan fallback emoji** (kalau sprite gagal load → tetap emoji).
> Persis pola yang sudah jalan: g4/g5/g7/g12 sekarang pakai `assets/db/*` sprite **di atas** emoji.
>
> Pipeline sama seperti 6 sheet lama + 100 monster + 16 ikon math: kamu generate **1 gambar = grid 10×10 =
> 100 sprite**, aku **auto-crop** tiap sel → WebP transparan rapi + **outline putih tipis** (mask sisi kasar),
> taruh di `assets/db/<kategori>/NNN.webp`, lalu wire ke game (aditif). Tool: `tools/crop-db-sheets.py`
> / `tools/crop-math-monsters.py` (border-flood putih → keep-largest-component → de-fringe → autocrop →
> sticker-outline → WebP q88).
>
> **Sudah ada (JANGAN generate ulang):** `db-creatures-100`, `db-objects-100`, `db-elements-100`,
> `db-faces-100`, `db-vehicles-100`, `db-science-100` (→ `assets/db/{creatures,objects,elements,faces,
> vehicles,science}`). Sheet di bawah = **TAMBAHAN** yang bikin tiap game jauh lebih kaya.
>
> **Pokémon TIDAK termasuk** (pakai DB Pokémon yang ada). Bayangan "Tebak Bayangan" TIDAK perlu digenerate
> (aku tint hitam otomatis dari sprite mana pun).

---

## 🎨 GAYA SENI (WAJIB — tempel di SETIAP prompt, ini kunci "jauh lebih bagus")
> *"Professional high-end 2D mobile-game art, Supercell / Candy-Crush / Duolingo quality. Chunky rounded
> forms, thick clean dark outlines, rich saturated yet harmonious colors, soft top-down lighting with gentle
> rim-light and soft ambient occlusion, glossy highlights, crisp readable silhouettes. Each item is a COMPLETE
> standalone game icon. Consistent scale, lighting, and style across the ENTIRE sheet, cute and child-friendly,
> high detail."*

## 📐 ATURAN GRID (WAJIB — biar auto-crop bersih)
- **Grid 10×10 (100 item)**, jarak antar item jelas (JANGAN nempel/numpuk).
- Tiap item **di tengah selnya**, ukuran seragam, **background PUTIH MURNI #FFFFFF**.
- **Label teks kecil tipis di bawah tiap item** (di luar gambar) sesuai daftar — biar aku map ke nama.
- **Kanvas sebesar mungkin** (ideal 4096×4096, min 2816×2816) → tiap item ~300–400px.
- Satu gaya + satu arah cahaya untuk SEMUA item satu sheet.
- Karakter/wajah: hadap **depan atau ¾**. Kendaraan top-down: **hidung ke ATAS**.

---

## ⭐ PRIORITAS 1 — dampak terbesar lintas-game

### `db-faces2-100.png` — 100 wajah emosi & pose maskot (LANJUTAN faces) — g1, g5
**Enhance:** *Aku Merasa* (g1) + *Cocokkan Emosi* (g5). Sekarang cuma ~10 wajah emosi dari `db-faces`.
Sheet ini nambah **variasi + intensitas + situasi** biar ekspresi lebih hidup & pasangan match lebih banyak.
> *A 10×10 grid on pure white of 100 cute expression tiles, each labelled: ~50 round emotion-mascot faces
> across many emotions AND intensities (senang, senang-sekali, tersenyum-malu, tertawa, sedih, sedih-sekali,
> menangis, marah, marah-sekali, kesal, cemberut, takut, takut-sekali, terkejut, kaget, malu, tersipu, bosan,
> mengantuk, bangga, percaya-diri, cinta, sayang, bingung, penasaran, kagum, takjub, tenang, damai, gugup,
> grogi, semangat, ceria, kecewa, ngambek, lega, syukur, jijik, kesakitan, kedinginan, kepanasan, lelah,
> lapar, kenyang, fokus, ragu, berani, cemas, harap) · ~30 kid-hero mascot in poses tied to feelings (wave,
> jump-joy, cheer, arms-crossed-angry, hide-scared, cover-eyes, cry, think, shrug, thumbs-up, hug-self,
> deep-breath, celebrate, point, clap) · ~20 animal-emotion combos (happy dog, sad cat, angry bear, scared
> rabbit, surprised owl, proud lion …).* [+ GAYA SENI]. Pure white, 10×10 grid, spaced, tiny label each.
**Wire:** extend `EMOTION_FACE` map (game.js) + g5 emosi mode → richer face pool; emoji fallback tetap.

### `db-letters-100.png` — 100 huruf-hutan: maskot A–Z + benda per-huruf — g3, g8, g9
**Enhance:** *Huruf Hutan* (g3), *Susun Kata* (g8), *Jejak Huruf* (g9). Sekarang huruf = teks polos.
> *A 10×10 grid on pure white of 100 cute alphabet-learning tiles, each labelled: 26 chunky rounded letter
> characters A–Z each as a friendly creature-letter with a face (letter 'A' as an apple-red mascot, etc.),
> then 26 kid-familiar objects whose Indonesian name starts with each letter (A-Apel, B-Bola, C-Cabai,
> D-Donat, E-Es, F-Foto, G-Gajah, H-Hati, I-Ikan, J-Jam, K-Kucing, L-Lampu, M-Mobil, N-Nanas, O-Obor,
> P-Payung, Q-Quran, R-Roket, S-Sepatu, T-Topi, U-Ular, V-Vas, W-Wortel, X-Xilofon, Y-Yoyo, Z-Zebra), then
> ~48 more: number-letter blocks, wooden alphabet blocks, chalk letters, bubble letters, a friendly forest
> owl-teacher, leaves/vines letter decor, a wooden A–Z signpost, star stickers, gold-star rewards.* [+ GAYA
> SENI]. Pure white, 10×10 grid, spaced, tiny label each.
**Wire:** g3 shows letter-creature + benda-hint (aditif ke huruf teks); g8 word-picture hint; g9 optional
letter-mascot watermark behind trace guide. Fallback: current text/emoji.

### `db-words-extra-100.png` — 100 benda kuis BARU (kategori yang belum ada) — g5, g7, g8, g12
**Enhance:** *Cocokkan Emosi* (g5 sub-mode sayur/profesi/warna/sekolah), *Tebak Gambar* (g7), *Susun Kata*
(g8), *Tebak Bayangan* (g12). Nambah kategori yang SEKARANG cuma emoji / belum ada di DB.
> *A 10×10 grid on pure white of 100 distinct cute cartoon items, each labelled, grouped: SAYUR (wortel,
> bayam, tomat, kentang, jagung, brokoli, terong, cabai, timun, labu, kol, sawi, buncis, jamur, bawang) ·
> PROFESI as friendly kid characters in uniform (dokter, guru, polisi, pemadam, koki, petani, pilot,
> masinis, nelayan, tentara, perawat, tukang-pos, pelukis, penyanyi, astronaut, ilmuwan) · ANGGOTA TUBUH
> (tangan, kaki, mata, hidung, telinga, mulut, gigi, rambut, jari, kaki) · PAKAIAN (baju, celana, rok,
> topi, sepatu, kaus-kaki, sarung-tangan, syal, jaket, dasi) · OLAHRAGA/alat (bola-sepak, bola-basket,
> raket, sepeda, sepatu-roda, layang-layang, skateboard, ring-basket) · ALAT MUSIK (gitar, drum, piano,
> terompet, biola, seruling, angklung, gendang) · SEKOLAH (buku, pensil, penghapus, penggaris, tas, meja,
> papan-tulis, krayon, gunting, lem) · WARNA sebagai blob cat/crayon berlabel (merah, biru, kuning, hijau,
> oranye, ungu, merah-muda, cokelat, hitam, putih). Isi sampai 100.* [+ GAYA SENI]. Pure white, 10×10, label.
**Wire:** tambah grup baru ke `games/data/db-labeled.js` (sayur/profesi/tubuh/pakaian/olahraga/musik/sekolah/
warna) → otomatis mengalir ke g7 + g12; g5 sub-mode sayur/profesi dll dapat sprite (bukan emoji lagi).

---

## ⭐ PRIORITAS 2 — per-game khusus

### `db-count-100.png` — 100 aset berhitung — g4
**Enhance:** *Hitung Binatang* (g4). Sekarang cuma sprite creature diulang. Nambah angka-maskot + prop hitung.
> *A 10×10 grid on pure white, each labelled: number-mascot characters 0–20 as chunky friendly digits with
> faces (21 items), dice faces 1–6, domino tiles, tally-mark cards, counting frames (ten-frame, abacus,
> number-line segment), a hand showing 1–5 fingers, plus counting props (basket, cage, pond, nest, fruit-
> pile, balloon-bunch, star-cluster) and reward FX (big gold star, '+1' pop, 'Benar!' ribbon, sparkle-
> burst). Fill to 100 with friendly math decor.* [+ GAYA SENI]. Pure white, 10×10, spaced, label each.
**Wire:** g4 tampilkan angka-maskot + basket/kandang sebagai wadah hitung (aditif). Fallback teks angka.

### `db-breathe-100.png` — 100 aset relaksasi — g2
**Enhance:** *Napas Pelangi* (g2). Sekarang minim visual. Sheet ini bikin mascot penuntun napas + prop kalem.
> *A 10×10 grid on pure white, each labelled: a soft glowing round breathing-buddy mascot in a sequence of
> sizes/poses (tiny→small→medium→big→huge for 'tarik napas', then shrinking for 'buang napas', ~16 frames),
> calm nature props (pastel cloud, rainbow-arc, sun-soft, moon-soft, star-twinkle, lotus, leaf, dewdrop,
> bubble, balloon, feather, wind-swirl, flower-bloom stages), a cozy meditating kid in poses (sit-calm,
> eyes-closed, smile, stretch, yawn), soothing FX (soft glow-ring, gentle sparkle, ripple, aurora-wisp,
> floating-heart). Fill to 100, all soft pastel, low-contrast, calming.* [+ GAYA SENI but SOFT PASTEL,
> gentle]. Pure white, 10×10, spaced, label each.
**Wire:** g2 breathing orb = breathing-buddy frames (skala mengikuti fase napas), prop kalem sebagai parallax.

### `db-road2-100.png` — 100 aset jalan/kota (LANJUTAN vehicles) — g6
**Enhance:** *Petualangan Mobil* (g6 = `games/mobil.html`). Nambah dekor jalan + rintangan + pickup + tile
parallax biar dunia lebih hidup (di ATAS `db-vehicles` yang sudah ada).
> *A 10×10 grid on pure white of 100 top-down city/road props & tiles, each labelled: road tiles (straight,
> curve, cross, T-junction, zebra-crossing, dashed-line), roadside (tree, bush, lamp-post, bench, mailbox,
> bus-stop, fountain, fire-hydrant, traffic-light, road-sign-set), buildings top-down (house, shop, school,
> hospital, gas-station, tower), obstacles (cone, barrier, barrel, pothole, puddle, oil-slick, rock, log,
> box), pickups (coin, fuel-can, star, shield, boost-arrow, heart, gem, key), scenery layers (cloud, hill-
> strip, tree-line-strip, grass-strip, river-strip) for parallax. Fill to 100, top-down consistent.* [+ GAYA
> SENI]. Pure white, 10×10, top-down, spaced, label each.
**Wire:** g6 obstacle/pickup/dekor pakai sprite ini (aditif ke prosedural). Fallback shape lama.

### `db-sci2-100.png` — 100 sains/alam LANJUTAN — g11
**Enhance:** *Kuis Sains* (g11) + aksen g4/g7. Nambah konsep sains anak (di atas `db-science`).
> *A 10×10 grid on pure white of 100 cute science/nature/space/weather icons, each labelled: body organs
> friendly (jantung, otak, paru, lambung, ginjal, tulang, otot, mata, telinga, lidah), life-cycle (telur,
> ulat, kepompong, kupu, biji, tunas, bunga, buah), states of matter (es, air, uap), simple machines
> (tuas, roda, katrol, bidang-miring, sekrup, baji), lab (tabung-reaksi, gelas-kimia, corong, pipet,
> mikroskop, magnet-U, baterai, bohlam, magnet-batang, timbangan), space (planet-1..8, komet, asteroid,
> galaksi, astronaut, UFO-lucu, stasiun-luar-angkasa), weather (cerah, berawan, hujan, badai, salju, kabut,
> pelangi, angin), ecology (matahari-panel, tong-sampah, daur-ulang, pohon, tetes-air). Fill to 100.* [+
> GAYA SENI]. Pure white, 10×10, spaced, label each.
**Wire:** tambah grup `sains2` ke db-labeled → g11 kuis + g7/g12 dapat konten sains lebih banyak.

---

## 🖼️ PRIORITAS 3 — Latar pemandangan (1 scene per gambar, landscape, buat parallax)
Tiap: *[+ GAYA SENI], full landscape scene, soft depth blur, NO characters, NO text, layered depth so it
can be split into parallax bands.*
- `bg-jungle2.png` (g3 Huruf Hutan) — hutan ceria berlapis (langit/pohon-jauh/semak-depan).
- `bg-classroom2.png` (g8 Susun Kata, g9 Jejak Huruf) — kelas hangat + papan tulis.
- `bg-calmsky2.png` (g2 Napas Pelangi) — langit pastel + pelangi lembut + awan mengambang.
- `bg-cityroad2.png` (g6 Mobil) — jalan kota berlapis (gedung-jauh/pohon/trotoar).
- `bg-lab-space.png` (g11 Kuis Sains) — lab + jendela luar angkasa ceria.
- `bg-match-garden.png` (g5 Cocokkan Emosi) — taman lembut untuk kartu match.

---

## 🗺️ Peta pemakaian & prioritas
| Sheet (BARU) | Item | Enhance game |
|---|---|---|
| `db-faces2-100` | 100 | g1 Aku Merasa, g5 Cocokkan Emosi |
| `db-letters-100` | 100 | g3 Huruf Hutan, g8 Susun Kata, g9 Jejak Huruf |
| `db-words-extra-100` | 100 | g5, g7 Tebak Gambar, g8, g12 Tebak Bayangan |
| `db-count-100` | 100 | g4 Hitung Binatang |
| `db-breathe-100` | 100 | g2 Napas Pelangi |
| `db-road2-100` | 100 | g6 Petualangan Mobil |
| `db-sci2-100` | 100 | g11 Kuis Sains |
| backgrounds ×6 | — | per game (parallax) |

**Urutan generate:** P1 = `db-faces2`, `db-letters`, `db-words-extra` (300 sprite → lift terbesar: emosi +
huruf + kategori kuis baru). P2 = `db-count`, `db-breathe`, `db-road2`, `db-sci2`. P3 = 6 background.

**Aturan wiring (WAJIB, aku yang kerjakan begitu sheet masuk):** SEMUA aditif + guarded + fallback emoji/teks/
shape lama. Nol regresi pada game Pokémon & Kereta (mereka tak tersentuh). Label akurat — hanya yang jelas
kupasang jadi jawaban kuis (yang ambigu jadi dekor saja). Gate ulang: `qa-math-adventure`, `qa-regression-
sweep`, `qa-shared-engines`.

Drop file kapan saja ke folder ini dengan nama persis → bilang aku → langsung kupotong + pasang.
