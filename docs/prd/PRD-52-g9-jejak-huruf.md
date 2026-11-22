# PRD-52 G9 Jejak Huruf: bunyi goresan, kata bergambar, urutan goresan [ANAK]

- **Gelombang:** Gelombang 5 — sempurnakan (2026-11-21)
- **Status:** live v64.84 (2026-11-22)
- **Sumber:** rencana Gelombang 5 (3 agen eksplorasi + cek ulang file:baris, 2026-11-21)
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Desain:**
  - Bunyi SFX tiap goresan selesai. (Revisi 2026-11-22, PRD-55: huruf tidak dibacakan, tidak ada pujian lisan.)
  - Kata dari `SpellingData` dengan gambarnya; 60 → ≥200 kata.
  - Panah urutan goresan dari jalur jejak yang sudah ada.
- **Laws:**
  - L1: tiap huruf A–Z punya ≥3 kata bergambar, atau dilaporkan.
  - L2: SFX goresan hanya jika suara menyala; 0 panggilan `speechSynthesis.speak`.
  - L3: `qa-g9-trace` tetap lulus.
  - L4: 3 ukuran dilihat.

## Hasil (v64.84, 2026-11-22)

- Gambar kata di samping huruf: kata dari pustaka sprite yang sama dengan G7 (DBLabeled + nama Timmy), huruf awal
  ditebalkan hijau. Huruf dengan < 3 kata bergambar (dilaporkan gate): E2 F1 I1 N1 O0 Q0 U1 V0 W1 X0 Y0 Z1;
  O, Q, V, X, Y tanpa gambar (kartu disembunyikan, bukan gambar yang salah).
- Mode kata (level > 20): 60 kata lama + kata bergambar 3-7 huruf = 168 kata (136 bergambar); target 200 tidak
  tercapai dengan pustaka sekarang.
- Satu nada naik tiap goresan selesai (ketukan bukan goresan); diam saat suara mati. Tidak ada suara bicara (PRD-55).
- Panah arah di tengah tiap langkah titik ke titik (mode huruf); mode kata tanpa panah (lompatan antar-huruf
  melintang dan terbaca berantakan).
- Landscape pendek (844x390): dua kolom, kanvas utuh di kanan (dulu di bawah lipatan).
- Gate `tools/qa-prd52-g9.mjs` (CI smoke): merah di origin/main (fungsi belum ada), hijau 7/0. `qa-g9-trace` lulus.
