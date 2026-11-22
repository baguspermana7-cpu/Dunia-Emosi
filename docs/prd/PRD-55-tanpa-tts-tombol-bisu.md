# PRD-55 Tanpa suara bicara (TTS) + tombol bisu kembali [ANAK]

- **Gelombang:** Gelombang 5 — komentar owner (2026-11-22), disisipkan sebelum PRD-52
- **Status:** live v64.83 (2026-11-22)
- **Sumber:** owner 2026-11-22: "Gak perlu ada suara. Itu aneh text indi divaca dialek anek" dan "G ada tombol mute lagi"
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

## Masalah
- Suara browser (speechSynthesis id-ID) membaca teks Indonesia dengan logat asing.
- Di layar game hub tidak ada tombol bisu; satu-satunya saklar ada di overlay Pengaturan.

## Desain
1. `games/data/speak.js`: `SPEECH_OFF = true`, `DuniaSpeak.say()` selalu `false` tanpa bicara (juga `opts.always`).
   Semua pemanggil (16 berkas) ikut diam; teks di layar tetap. `DuniaSpeak.off` terbuka untuk modul lain.
2. Tombol yang hanya bisa membacakan disembunyikan (`.tkq-speak`, `.tkq-arsay`, `.dunia-listen-btn`, satu `<style>`
   dari speak.js). `duniaCanListen()` = false: tidak ada ronde dengar di G3, G7, G8.
   Timmy: mode "readAloud" tidak lagi dua ketukan (satu ketukan memilih), baris "Narasi" di Pengaturan hilang.
3. `games/data/mute-button.js`: tombol speaker SVG di setiap `.game-header` hub (sebelah jeda, kulit `.gh-pause`)
   dan di bar atas beranda. Ketuk = `toggleSoundSetting()` (efek + musik); ikon merah saat bisu; `aria-pressed`;
   sinkron dengan Pengaturan dua arah.
4. PRD-14 (cakupan narasi suara) dibatalkan. PRD-52: bagian "suara" tidak dikerjakan.

## Laws
- L1 dengan suara ON dan suara id-ID tersedia: `speechSynthesis.speak` 0 kali di beranda + sesi G7, dan di
  kuis-matematika, ayo-berhitung, cek-kemampuan, lokomotif-pemberani, mojo-swoptops, timmy-kapal.
- L2 G7 level 14 dengan suara id-ID: 0 ronde dengar.
- L3 beranda + 16 layar game hub: tombol bisu ada, SVG, >= 44 px (aturan ketuk header yang sama dengan jeda),
  di layar pada 390x844, 844x390, 800x1280. Ketuk: kunci `off`, jawaban benar tidak memutar SFX, ketuk lagi `on`.
- L4 bisu dari header -> Pengaturan OFF; Pengaturan ON -> header ON.

## Hasil (v64.83, 2026-11-22)
- Merah di origin/main: beranda + G7 mengucap 2 kalimat ("Ayo main Huruf Hutan!", "ikan biru"), ronde dengar di
  G7, cek-kemampuan mengucap salam Profesor Owi, 0 tombol bisu di 17 layar.
- Hijau: `tools/qa-prd55-mute.mjs` (CI smoke). Gate lama yang menuntut ucapan dibalik ke "0 ucapan":
  qa-breathe, qa-feeling-checkin, qa-freeze-card, qa-prd20-next, qa-prd42-listen, qa-prd50-g7, qa-speak-mute,
  qa-tk-questions, qa-tk-lanes.
- Ukuran tombol: 44-46 px, sama dengan tombol jeda (target 48 di rencana diturunkan ke aturan header 44 yang sudah ada).
