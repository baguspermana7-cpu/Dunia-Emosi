# PRD — semua perbaikan tersisa (Dunia Emosi)

Disetujui owner 2026-11-14. Satu berkas per ide; status diperbarui di tabel ini tiap rilis.

## Konteks
`docs/PRODUCT-ASSESSMENT-2026-11-10.md` punya 32 ide. Sudah live: #1, #2, #3, #4, #5, #8, #9, #12, #16 A+B, #30.
#17 sebagian (napas setelah 3 salah, `games/data/breathe.js:176`).
Owner minta PRD untuk SEMUA sisanya, supaya tiap ide dikerjakan sampai tuntas — bukan setengah jalan.

**Yang dihasilkan setelah plan disetujui:**
1. Folder `docs/prd/`: satu berkas per ide (lihat Indeks) + `docs/prd/README.md` (indeks, urutan, status).
   Isi tiap berkas = PRD di bawah, ditulis lengkap.
2. Pengerjaan gelombang demi gelombang dengan aturan "selesai" di bawah.

**Keadaan kode yang dicek (2026-11-14):**
- Bus hanya dipancarkan oleh 3 tempat: `games/kuis-matematika.html`, `games/ayo-berhitung.html`, `games/tk-quiz.js`.
- `TKQuiz.mastery` (`games/tk-quiz.js:64`) adalah satu-satunya model penguasaan.
- `LearningLog` (`games/data/learning-log.js`) menyimpan ringkasan harian + 100 jawaban terakhir per avatar.
- Getar sudah ada di `game.js:2153`; setelannya global (`dunia-emosi-vibrate`, `game.js:2176`).
- Audit yang sudah ada:
  - `tools/touch-target-audit.mjs` dan `tools/audit-no-emoji.mjs` (lokal, hardcode port, belum masuk runner);
  - `tools/qa-index-contrast.mjs` (index saja);
  - gate offline per game (`qa-tk-offline`, `qa-gt-offline`, `qa-sd-offline`, `qa-g27-offline`, `qa-app-offline`).
- `adb devices` kosong: tablet belum tersambung.

## Aturan "selesai" (berlaku untuk tiap PRD)
1. **Laws dulu.** Tulis 2–6 klaim yang bisa diukur. Gate harus **merah di kode lama** (atau pada mutasi sengaja), baru hijau di kode baru.
2. **Gate disambungkan.**
   - Gate jalan di `tools/run-gates.mjs` (membaca env URL, `// run-gates: timeout N` bila >600 s).
   - Gate cepat (<60 s, tanpa GPU) juga masuk `tools/ci-verify.sh`.
3. **Mata, bukan hanya angka.** Setiap perubahan visual dapat screenshot di 390×844, 844×390 dan 800×1280, dan saya lihat sendiri.
4. **Regresi.** Gate milik game yang disentuh lulus lewat runner; `bash tools/ci-verify.sh` lulus.
5. **Ship.**
   - token bump (`node tools/normalize-cache-tokens.mjs --token vXX.YY-...`);
   - push `HEAD:main`;
   - cek live github.io + Vercel;
   - bila sprite/asset Dunia berubah, bump token game1 juga.
6. **Catatan.** Baris ide di dokumen asesmen (Deliverable 5) diperbarui dengan angka merah→hijau. Status PRD di `docs/prd/README.md` → `live vXX`.
7. **Satu PRD = satu rilis.** PRD berikutnya tidak dimulai sebelum yang sekarang live. Kalau satu law tidak bisa dibuktikan, dilaporkan PERTAMA, bukan dibulatkan jadi "selesai".

**Batasan owner yang berlaku di semua PRD:**
- tanpa emoji;
- tanpa outline putih;
- perempuan/anak perempuan hanya berhijab;
- pakai ulang engine yang ada;
- satu browser headless (flock + timeout);
- owner tidak menguji — saya yang menguji.

**Fitur baru untuk anak** ditandai **[ANAK]** di bawah. Menyetujui plan ini = "ya" eksplisit untuk semua item [ANAK] yang tidak dicoret owner. Setiap hal baru yang muncul di peta/menu tetap saya sebutkan namanya ke owner sebelum ship.

---

## Indeks
| PRD | Judul | Gelombang | Status |
|---|---|---|---|
| [PRD-19a](PRD-19a-verifikasi-pita-usia.md) | Verifikasi pita usia | Gelombang 0 | live v64.43 |
| [PRD-24](PRD-24-penghangatan-cache-timmy-yang.md) | Penghangatan cache Timmy yang sopan | Gelombang 0 | live v64.44 |
| [PRD-32](PRD-32-getar-halus.md) | Getar halus | Gelombang 0 | live v64.43 |
| [PRD-26](PRD-26-potong-padding-sprite.md) | Potong padding sprite | Gelombang 0 | live v64.47 (4 pack) |
| [PRD-15](PRD-15-gate-instruksi-tanpa-pendamping.md) | Gate instruksi tanpa pendamping | Gelombang 0 | selesai (CI, tanpa rilis aset) |
| [PRD-27](PRD-27-gate-aturan-konten-lintas.md) | Gate aturan konten lintas game | Gelombang 0 | live v64.45 (outline 1048 → 142) |
| [PRD-28](PRD-28-kontras-target-sentuh-semua.md) | Kontras + target sentuh semua game | Gelombang 0 | live v64.46 |
| [PRD-25](PRD-25-validator-keterselesaian-level-di.md) | Validator keterselesaian level di CI | Gelombang 0 | live v64.43 |
| [PRD-08b](PRD-08b-bus-di-semua-game.md) | Bus di semua game soal | Gelombang 1 | live v64.44 |
| [PRD-10](PRD-10-model-penguasaan-lintas-game.md) | Model penguasaan lintas game **[ANAK — mengubah tingkat soal]** | Gelombang 1 | live v64.44 |
| [PRD-19b](PRD-19b-usia-menyetel-tingkat-awal.md) | Usia menyetel tingkat awal | Gelombang 1 | live v64.44 |
| [PRD-11](PRD-11-antrean-pengulangan-lintas-game.md) | Antrean pengulangan lintas game **[ANAK]** | Gelombang 1 | belum mulai |
| [PRD-13](PRD-13-petunjuk-sesuai-jenis-kesalahan.md) | Petunjuk sesuai jenis kesalahan **[ANAK]** | Gelombang 1 | belum mulai |
| [PRD-20](PRD-20-kartu-main-berikutnya-di.md) | Kartu "main berikutnya" di hub **[ANAK — hal baru di menu]** | Gelombang 1 | belum mulai |
| [PRD-17b](PRD-17b-momen-tenang-versi-lebih.md) | Momen tenang → versi lebih mudah **[ANAK]** | Gelombang 1 | belum mulai |
| [PRD-18](PRD-18-setelan-profil-dipakai-semua.md) | Setelan profil dipakai semua game | Gelombang 2 | belum mulai |
| [PRD-14](PRD-14-cakupan-narasi-suara.md) | Cakupan narasi suara **[ANAK — suara baru]** | Gelombang 2 | belum mulai |
| [PRD-21](PRD-21-ritme-sesi.md) | Ritme sesi **[ANAK]** | Gelombang 2 | belum mulai |
| [PRD-23](PRD-23-indikator-siap-luring-per.md) | Indikator siap luring per game | Gelombang 2 | belum mulai |
| [PRD-22](PRD-22-satu-buku-koleksi-lintas.md) | Satu buku koleksi lintas game **[ANAK — hal baru di menu]** | Gelombang 2 | belum mulai |
| [PRD-16C](PRD-16C-namai-perasaan-dalam-cerita.md) | Namai perasaan dalam cerita **[ANAK — mekanik emosi baru]** | Gelombang 2 | belum mulai |
| [PRD-07](PRD-07-telemetri-lokal-kesehatan-perangkat.md) | Telemetri lokal + "Kesehatan perangkat" | Gelombang 3 | belum mulai |
| [PRD-06](PRD-06-jalur-uji-perangkat-asli.md) | Jalur uji perangkat asli — **TERBLOKIR: owner menyalakan USB debugging + colok tablet** | Gelombang 3 | terblokir |
| [PRD-29](PRD-29-shell-game-bersama-adopsi.md) | Shell game bersama (adopsi bertahap) | Gelombang 3 | belum mulai |
| [PRD-31](PRD-31-lampu-dipanggang-pilot.md) | Lampu dipanggang (pilot) | Gelombang 3 | belum mulai |

## Urutan & perkiraan
| Gelombang | Isi | Perkiraan |
|---|---|---|
| 0 | 19a, 24, 32, 26, 15, 27, 28, 25 | ~1,5 minggu |
| 1 | 08b, 10, 19b, 11, 13, 20, 17b | ~4 minggu |
| 2 | 18, 14, 21, 23, 22, 16C | ~5 minggu (14 paling lama; render suara berjalan paralel semalaman) |
| 3 | 07, 06 (begitu tablet ada), 29 bertahap, 31 pilot | berjalan |

Langkah pertama setelah disetujui: tulis `docs/prd/` (25 berkas + README) — selesai, commit `docs: PRD semua perbaikan tersisa`, lalu mulai PRD-19a.

## Verifikasi keseluruhan
- **Per PRD:** gate baru merah→hijau (angka dikutip), runner lulus untuk game yang disentuh, `ci-verify.sh` lulus, screenshot 3 ukuran dilihat, live di github.io + Vercel (token + string fitur dicek dengan curl).
- **Per gelombang:** `node tools/run-gates.mjs --tag timmy` + tag baru (`content`, `learn`) lulus tanpa retry. Baris register di dokumen asesmen diperbarui.
