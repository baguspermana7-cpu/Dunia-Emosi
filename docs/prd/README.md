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
  - `tools/touch-target-audit.mjs` dan `tools/audit-no-emoji.mjs` (lokal, hardcode port, belum masuk runner — sejak v64.45–46 masuk runner lewat `qa-no-emoji` dan `qa-game-a11y`);
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
| [PRD-10](PRD-10-model-penguasaan-lintas-game.md) | Model penguasaan lintas game **[ANAK — mengubah tingkat soal]** | Gelombang 1 | live v64.44; generator v64.48 |
| [PRD-19b](PRD-19b-usia-menyetel-tingkat-awal.md) | Usia menyetel tingkat awal | Gelombang 1 | live v64.44 |
| [PRD-11](PRD-11-antrean-pengulangan-lintas-game.md) | Antrean pengulangan lintas game **[ANAK]** | Gelombang 1 | live v64.49 |
| [PRD-13](PRD-13-petunjuk-sesuai-jenis-kesalahan.md) | Petunjuk sesuai jenis kesalahan **[ANAK]** | Gelombang 1 | live v64.50 (matematika) |
| [PRD-20](PRD-20-kartu-main-berikutnya-di.md) | Kartu "main berikutnya" di hub **[ANAK — hal baru di menu]** | Gelombang 1 | live v64.80 |
| [PRD-17b](PRD-17b-momen-tenang-versi-lebih.md) | Momen tenang → versi lebih mudah **[ANAK]** | Gelombang 1 | live v64.48 |
| [PRD-18](PRD-18-setelan-profil-dipakai-semua.md) | Setelan profil dipakai semua game | Gelombang 2 | live v64.51 |
| [PRD-14](PRD-14-cakupan-narasi-suara.md) | Cakupan narasi suara **[ANAK — suara baru]** | Gelombang 2 | dibatalkan (owner 2026-11-22: tanpa suara bicara, PRD-55) |
| [PRD-21](PRD-21-ritme-sesi.md) | Ritme sesi **[ANAK]** | Gelombang 2 | belum mulai (revisi 2026-11-21, Gelombang 5) |
| [PRD-23](PRD-23-indikator-siap-luring-per.md) | Indikator siap luring per game | Gelombang 2 | belum mulai (revisi 2026-11-21, Gelombang 5) |
| [PRD-22](PRD-22-satu-buku-koleksi-lintas.md) | Satu buku koleksi lintas game **[ANAK — hal baru di menu]** | Gelombang 2 | live v64.85 |
| [PRD-16C](PRD-16C-namai-perasaan-dalam-cerita.md) | Namai perasaan dalam cerita **[ANAK — mekanik emosi baru]** | Gelombang 2 | belum mulai (revisi 2026-11-21, Gelombang 5) |
| [PRD-07](PRD-07-telemetri-lokal-kesehatan-perangkat.md) | Telemetri lokal + "Kesehatan perangkat" | Gelombang 3 | belum mulai (revisi 2026-11-21, Gelombang 5) |
| [PRD-06](PRD-06-jalur-uji-perangkat-asli.md) | Jalur uji perangkat asli — **TERBLOKIR: owner menyalakan USB debugging + colok tablet** | Gelombang 3 | terblokir |
| [PRD-29](PRD-29-shell-game-bersama-adopsi.md) | Shell game bersama (adopsi bertahap) | Gelombang 3 | ditutup 2026-11-21 (K3) |
| [PRD-31](PRD-31-lampu-dipanggang-pilot.md) | Lampu dipanggang (pilot) | Gelombang 3 | ditutup 2026-11-21 (K3) |
| [PRD-33](PRD-33-gate-anggaran-performa.md) | Gate anggaran performa per halaman | Gelombang 4A | live (tools) 2026-11-18 |
| [PRD-34](PRD-34-diet-unduhan.md) | Diet unduhan: gambar malas, audio saat perlu | Gelombang 4A | live v64.62 |
| [PRD-35](PRD-35-dom-ringan-saat-main.md) | DOM ringan dan frame stabil saat main | Gelombang 4A | live v64.64 |
| [PRD-36](PRD-36-tepi-putih-ikon-balapan.md) | Hapus tepi putih ikon rintangan Balapan Kereta | Gelombang 4B | live v64.60 |
| [PRD-37](PRD-37-juice-bersama.md) | Juice bersama: hit-stop, combo, perayaan | Gelombang 4B | live v64.67 (CI v64.66 gagal di flake a11y) |
| [PRD-38](PRD-38-kedalaman-animasi-tokoh.md) | Kedalaman latar dan tokoh beranimasi (Birds, Bawah Laut) | Gelombang 4B | live v64.68 |
| [PRD-39](PRD-39-bank-soal-game-tipis.md) | Bank soal besar untuk game tipis [ANAK] | Gelombang 4C | live v64.65 |
| [PRD-08c](PRD-08c-bus-di-game-arkade.md) | Bus jawaban di game arkade dan kereta | Gelombang 4C | live v64.67 |
| [PRD-40](PRD-40-bos-tiap-sepuluh-level.md) | Bos tiap 10 level (Birds, G23, Bawah Laut) [ANAK] | Gelombang 4C | live v64.69 |
| [PRD-41](PRD-41-power-up-cuaca-ducky.md) | Power-up dan cuaca untuk Ducky Volley [ANAK] | Gelombang 4C | live v64.70 |
| [PRD-42](PRD-42-ronde-dengar-huruf.md) | Ronde "dengar" untuk game huruf + bank G11 besar [ANAK] | Gelombang 4C | live v64.71 |
| [PRD-43](PRD-43-gym-huruf-dari-kamus-ejaan.md) | Gym Huruf dari kamus ejaan | Gelombang 4C | ditutup: G13c tak terjangkau (owner) |
| [PRD-44](PRD-44-g10-cuaca-dan-tipe.md) | G10: cuaca nyata dan keunggulan tipe [ANAK] | Gelombang 4C | live v64.72 |
| [PRD-45](PRD-45-mobil-bantuan-dan-streak.md) | Mobil: bantuan, streak lambat, kata lebih banyak [ANAK] | Gelombang 4C | live v64.73 |
| [PRD-46](PRD-46-vfx-sakuga-tombol.md) | VFX sakuga di tombol semua game (permintaan owner) | Gelombang 4B | live v64.63 |
| [PRD-47](PRD-47-bug-bash.md) | Bug bash: Ducky, toast, MEM-06, gate GT, kode mati G13c | Gelombang 5 | live v64.74 (B4 sebagian) |
| [PRD-48](PRD-48-bus-tujuh-game-buta.md) | Bus jawaban di 7 game yang belum melapor | Gelombang 5 | live v64.75 |
| [PRD-49](PRD-49-event-level-dan-gerbang-orang-tua.md) | Event level/hadiah di bus + gerbang orang tua | Gelombang 5 | live v64.76 |
| [PRD-53](PRD-53-cek-kemampuan.md) | Cek Kemampuan: 6 pulau otak, Perkiraan IQ, Papan Juara Otak [ANAK] | Gelombang 5 | live v64.77 (papan online R3 belum) |
| [PRD-54](PRD-54-cek-hidup-dan-akurat.md) | Cek Kemampuan v3: Perkiraan IQ lebih akurat (Q) + motion/shader (M) [ANAK] | Gelombang 5 | live: Q v64.78, M v64.79 |
| [PRD-50](PRD-50-g7-tebak-gambar.md) | G7 Tebak Gambar: sprite, pengecoh satu grup, ronde dengar [ANAK] | Gelombang 5 | live v64.81 |
| [PRD-51](PRD-51-g4-hitung-binatang.md) | G4 Hitung Binatang: sprite, 3 ragam ronde, petunjuk hitung [ANAK] | Gelombang 5 | live v64.82 |
| [PRD-55](PRD-55-tanpa-tts-tombol-bisu.md) | Tanpa suara bicara (TTS) + tombol bisu di layar game [ANAK] | Gelombang 5 | live v64.83 |
| [PRD-52](PRD-52-g9-jejak-huruf.md) | G9 Jejak Huruf: bunyi goresan, kata bergambar, urutan goresan [ANAK] | Gelombang 5 | live v64.84 |

## Urutan & perkiraan
| Gelombang | Isi | Perkiraan |
|---|---|---|
| 0 | 19a, 24, 32, 26, 15, 27, 28, 25 | ~1,5 minggu |
| 1 | 08b, 10, 19b, 11, 13, 20, 17b | ~4 minggu |
| 2 | 18, 14, 21, 23, 22, 16C | ~5 minggu (14 paling lama; render suara berjalan paralel semalaman) |
| 3 | 07, 06 (begitu tablet ada), 29 bertahap, 31 pilot | berjalan |
| 4A | 33, 34, 35 (performa: gate anggaran dulu, lalu diet unduhan, lalu DOM/frame) | ~1,5 minggu |
| 4B | 36 (aturan owner: tepi putih), 37, 38 (detail tampilan) | ~2 minggu |
| 4C | 39, 08c, 40, 41, 42, 43, 44, 45 (gameplay lebih seru & beragam) | ~4 minggu |

**Gelombang 4 (2026-11-17).** Sumber: `docs/audit/perf-survey-2026-11-17.md` (angka terukur, dua run, kebisingan
dicatat) dan `docs/audit/gameplay-variety-2026-11-17.md` (baca kode per game, top 15, game tertipis, duplikat).
Urutan: 33 → 36 → 34 → 35 → 39 → 37 → 08c → 38 → 40 → 41 → 42 → 43 → 44 → 45. PRD-22 (buku koleksi lintas game,
Gelombang 2) adalah butir #3 audit gameplay dan dikerjakan di sela 4C. Hanya angka stabil (byte, request, node DOM)
yang menjadi gate; frame dan long task tetap laporan survey per gelombang karena kebisingannya sebesar perubahannya.

Langkah pertama setelah disetujui: tulis `docs/prd/` (25 berkas + README) — selesai, commit `docs: PRD semua perbaikan tersisa`, lalu mulai PRD-19a.

## Verifikasi keseluruhan
- **Per PRD:** gate baru merah→hijau (angka dikutip), runner lulus untuk game yang disentuh, `ci-verify.sh` lulus, screenshot 3 ukuran dilihat, live di github.io + Vercel (token + string fitur dicek dengan curl).
- **Per gelombang:** `node tools/run-gates.mjs --tag timmy` + tag baru (`content`, `learn`) lulus tanpa retry. Baris register di dokumen asesmen diperbarui.


**Gelombang 5 (2026-11-21), "sempurnakan".** Disetujui owner bersama default keputusan:
- **K1:** kode mati G13c dihapus.
- **K2:** dasbor di balik gerbang orang tua.
- **K3:** PRD-29 dan PRD-31 ditutup.

Urutan: 47 → 48 → 49 → 20 → 50 → 51 → 52 → 22 → 21 → 16C → 14 (fase 1, lalu 2) → 23 → 07.

Hal baru di menu (disebut ke owner):
- kartu "Main berikutnya";
- "Buku Koleksi";
- "Gerbang orang tua";
- "Kesehatan perangkat";
- lencana "siap luring";
- setelan "Waktu main".
