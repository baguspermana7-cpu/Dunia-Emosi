# 🚂 DUNIA KERETA — 30 Ide Game Edukasi

> Game group ke-5 di Dunia Belajar. Bertema kereta api.
> ID Game: G14–G23 (aktif), G24+ (cadangan masa depan)

---

## 🏁 PRIORITAS TINGGI (Implementasi Pertama)

### G14 — Balapan Kereta 🏁
**Tipe**: Racing / requestAnimationFrame loop
**Gameplay**: Balapan 2D side-scroller kiri→kanan, 3 lajur (atas/tengah/bawah).
- Tap ▲/▼ untuk pindah lajur
- Hindari rel rusak, batu, penghalang
- Boost: tap 🔥 → pressure gauge naik → burst speed 2–3 detik (cooldown 8 detik)
- 2–3 AI opponent dengan kecepatan beda max ±3%

**Jenis Kereta & Kecepatan** (display km/h, selisih max 3%):
| Kereta | Kecepatan | Bahan Bakar | Negara |
|--------|-----------|-------------|--------|
| 🚂 Kereta Uap | 60–62 km/h | Batubara/kayu | Indonesia/Eropa |
| 🚃 Kereta Diesel | 85–87 km/h | Solar | Berbagai negara |
| 🚄 Kereta Listrik (EMU) | 110–113 km/h | Listrik | Jepang/Eropa |
| 🚅 Shinkansen | 140–143 km/h | Listrik | Jepang |

**Steam Pressure Mechanic**:
```
[BOILER] ████████░░ 80%
Tap 🔥 BOOST → pressure turun -30%, speed burst +40% selama 2s
Auto recovery: pressure naik +5%/detik saat tidak boost
```

**Edukasi**: Jenis-jenis kereta, sumber energi, negara asal, teknologi transportasi

---

### G15 — Lokomotif Pemberani 💪
**Tipe**: Word-game + animasi rantai
**Cerita**: Lokomotif pahlawan terikat rantai besi. Susun kata dengan benar → rantai putus!

**Gameplay**:
1. Lihat gambar (hewan/benda) di atas
2. Huruf-huruf acak muncul sebagai tile di bawah
3. Tap huruf berurutan yang benar untuk mengeja kata
4. Setiap kata benar → 1 rantai hancur + FX dramatis
5. 5 kata = 5 rantai → kereta bebas → win!

**Visual**:
```
┌──────────────────────────────────┐
│  🎯 Kata: GAJAH                  │
├──────────────────────────────────┤
│     ⛓️🚂⛓️  (kereta terbelenggu) │
│     Rantai: ████░░░░ (3/5 sisa)  │
│  Gambar: 🐘                      │
│  [G] [A] [X] [J] [H] [T] [A]   │
│   ✅  _   _   _   _              │
└──────────────────────────────────┘
```

**Chain Break FX**: rantai getar → animasi pecah → partikel → confetti
**Edukasi**: Kosakata bahasa Indonesia, mengeja, huruf

---

### G16 — Selamatkan Kereta! 🆘
**Tipe**: Word-fill + timing bar
**Cerita**: Kereta lain tergelincir menuju jurang! Lokomotif hero harus menarik dengan kait.

**Fase 1 — Lempar Kait**: Timing bar bergerak → tap saat tepat di zona hijau
**Fase 2 — Tarik**: Progress bar "tarikan" → isi dengan jawaban kata/huruf yang benar
**Makin banyak benar** → progress bar penuh → kereta terselamatkan!

**Edukasi**: Kerjasama, kosakata, menghitung, kegigihan

---

### G17 — Misi Jembatan Goyang 🌉
**Tipe**: Rhythm game lambat
**Cerita**: Jembatan retak! Kereta lucu mau lewat. Perbaiki sebelum kehabisan waktu!

**Gameplay**:
- Jembatan punya 8–12 balok berjajar
- Balok menyala satu per satu (lambat, tidak menakutkan)
- Tap balok yang menyala untuk memperbaiki
- Timer 30 detik, crack animation di jembatan makin besar
- Selesai → kereta melintas dengan animasi senang 🎉

**Tingkat kesulitan**:
- Mudah: 8 balok, interval lambat, no misdirection
- Sedang: 10 balok, interval sedang, 2 balok menyala sekaligus
- Sulit: 12 balok, cepat, urutan bernomor harus ditap berurutan

**Edukasi**: Urutan angka, koordinasi, fokus, timing
**Catatan**: Timer dramatis tapi TIDAK menakutkan — musik semangat, balok warna-warni, kereta lucu

---

### G18 — Museum Kereta 🏛️
**Tipe**: Galeri interaktif + quiz
**Gameplay**:
- Scroll galeri kereta dari berbagai era & negara
- Tap kereta → info popup: nama, tahun, negara, kecepatan, bahan bakar, fun fact
- Di akhir galeri: 5 soal pilihan ganda tentang kereta yang baru dilihat

**Edukasi**: Sejarah transportasi, geografi, sains energi, teknologi

---

## 🎓 EDUKASI SAINS (Fase Berikutnya)

### G19 — Servis Lokomotif 🔧
Lokomotif rusak, anak jadi montir. Identifikasi bagian rusak, lakukan perbaikan mini-game.
**Edukasi**: Nama bagian kereta, fungsi komponen, pemecahan masalah

### G20 — Fisika Kereta ⚙️
Eksperimen: uap mendorong piston → roda berputar. Slider tekanan → kecepatan.
**Edukasi**: Energi, gaya, tekanan, listrik vs uap

### G21 — Kereta Nusantara 🗺️
Peta Indonesia, drag kereta ke rute yang benar (Argo Bromo, Gajayana, KRL Jabodetabek, dll.)
**Edukasi**: Geografi Indonesia, nama kereta terkenal, rute & kota

### G22 — Muatan Kereta 📦
Gerbong kosong, sortir muatan ke gerbong yang tepat (penumpang, barang, tangki).
**Edukasi**: Kategorisasi, logistik, jenis angkutan

### G23 — Jadwal Stasiun ⏰
Jadi petugas stasiun. Urutkan kereta sesuai jadwal berangkat (baca jam, urutan angka).
**Edukasi**: Membaca jam, urutan angka, logika waktu

---

## 🎮 IDE CADANGAN (G24+)

| # | Nama | Gameplay | Edukasi |
|---|------|----------|---------|
| 24 | Sinyal Bahaya | Tap pola morse, kereta merespons | Pola, komunikasi |
| 25 | Pasang Rel | Puzzle sambung potongan rel A→B | Shapes, spatial |
| 26 | Penumpang Kereta | Hitung naik/turun di setiap stasiun | Matematika, penjumlahan |
| 27 | Kereta Berwarna | Susun gerbong sesuai pola warna | Pattern recognition |
| 28 | Kode Wesel | Masukkan kode angka untuk ganti jalur | Matematika, logika |
| 29 | Detektif Kereta | Spot the difference 2 gambar kereta | Observasi, detail |
| 30 | Suara Kereta | Tebak jenis kereta dari suaranya | Audio recognition |
| 31 | Cuaca & Rel | Pilih kereta tepat untuk kondisi cuaca | Decision making |
| 32 | Bangun Stasiun | Tata letak elemen stasiun | Spatial, planning |
| 33 | Teka Kereta | Teka-teki tentang kereta | Bahasa, logika |
| 34 | Koleksi Kereta | Unlock kartu kereta dari kemenangan | Reward system |
| 35 | Ekspedisi Rel | Story mode: perjalanan antar kota Indonesia | Geografi, kosakata |
| 36 | Olimpiade Kereta | Multi-event challenge, gabungan semua | Semua skill |
| 37 | Desain Gerbong | Warnai dan dekorasi gerbong sendiri | Kreativitas |
| 38 | Kereta Ekspres Hitung | Fast math sebelum kereta tiba | Matematika cepat |

---

## 🗃️ TRAIN DATABASE (Template)

Tambahkan data kereta di sini saat database sudah terkumpul:

```json
{
  "c5107": {
    "name": "Locomotief C5107",
    "nickname": "Kereta Uap Ambarawa",
    "country": "Indonesia",
    "year": 1922,
    "type": "Steam",
    "fuel": "Batubara",
    "maxSpeed": 80,
    "length": 18,
    "emoji": "🚂",
    "funFact": "Beroperasi di jalur gigi Ambarawa-Bedono, kini jadi wisata"
  },
  "shinkansen-n700": {
    "name": "Shinkansen N700",
    "country": "Jepang",
    "year": 2007,
    "type": "EMU",
    "fuel": "Listrik",
    "maxSpeed": 320,
    "length": 404,
    "passengers": 1323,
    "emoji": "🚅",
    "funFact": "Rata-rata keterlambatan hanya 0.9 menit per tahun!"
  },
  "argo-bromo-anggrek": {
    "name": "Argo Bromo Anggrek",
    "country": "Indonesia",
    "year": 1997,
    "type": "Diesel",
    "fuel": "Solar",
    "maxSpeed": 120,
    "route": "Jakarta Gambir → Surabaya Pasar Turi",
    "emoji": "🚃",
    "funFact": "Kereta eksekutif tercepat di Indonesia, 11 jam Jakarta-Surabaya"
  },
  "krl-jabodetabek": {
    "name": "KRL Commuter Line",
    "country": "Indonesia",
    "year": 2013,
    "type": "EMU",
    "fuel": "Listrik",
    "maxSpeed": 100,
    "passengersPerDay": 1200000,
    "emoji": "🚄",
    "funFact": "Angkut 1.2 juta penumpang per hari di Jabodetabek!"
  }
}
```

---

## 🎨 WARNA TEMA

| Game | Primary | Accent |
|------|---------|--------|
| Balapan Kereta | `#E63946` merah | `#FFD166` kuning (kemenangan) |
| Lokomotif Pemberani | `#2196F3` biru | `#FFA000` emas (rantai) |
| Selamatkan Kereta | `#FF9800` oranye | `#4CAF50` hijau (selamat) |
| Jembatan Goyang | `#4CAF50` hijau | `#2196F3` biru (balok) |
| Museum Kereta | `#9C27B0` ungu | `#FFD166` kuning (era) |
| World Zone Header | `#37474F` slate | `#CFD8DC` abu muda |

---

## 📁 ASET YANG DIBUTUHKAN

### Background (800×200px, horizontal, WebP)
- `assets/train/bg-rail-day.webp` — rel lurus siang hari, pemandangan
- `assets/train/bg-rail-night.webp` — rel malam, bintang
- `assets/train/bg-rail-mountain.webp` — pegunungan hijau
- `assets/train/bg-rail-city.webp` — kota urban

### Kereta (transparent PNG, 300×120px, side view kiri→kanan)
- `assets/train/train-steam.png` — kereta uap coklat/hitam
- `assets/train/train-diesel.png` — kereta diesel abu-abu
- `assets/train/train-emu.png` — KRL listrik putih-biru
- `assets/train/train-shinkansen.png` — shinkansen putih lancip

### Obstacles
- `assets/train/obs-rock.png` — batu di rel
- `assets/train/obs-broken-rail.png` — rel rusak/patah
- `assets/train/obs-animal.png` — hewan di rel (sapi lucu)

### Chain Animation
- CSS-only: `⛓️` emoji + keyframe animasi

*Semua aset punya emoji fallback otomatis jika file tidak ada.*
