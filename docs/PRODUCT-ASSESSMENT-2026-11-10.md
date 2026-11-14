# Dunia Emosi — Product Assessment & Improvement Register (2026-11-10)

> Berkas baru. Tidak menggantikan `PRODUCT.md`, `DESIGN.md`, atau
> `proposals/review-50-ideas-aaa-roadmap.md`; menilai keadaan **kode sekarang**
> terhadap tujuan di `PRODUCT.md` dan terhadap roadmap 50-ide sebelumnya.
> Setiap klaim tentang keadaan kode diberi rujukan berkas:baris atau hasil
> perintah. Yang tidak bisa diverifikasi diberi label **[BELUM TERVERIFIKASI]**.

Tujuan produk (dari `PRODUCT.md`, tidak diubah): anak ~5 tahun, belum lancar
membaca, tablet Android lanskap sebagai PWA, sering luring, bisa **membuka,
memilih, dan menyelesaikan satu permainan sendirian, berulang kali, tanpa bantuan
dan tanpa jaringan.** Setiap ide di bawah diuji terhadap kalimat itu dulu.

---

## Deliverable 1 — Product Maturity Assessment

### 1.1 Apa yang sebenarnya ada

| Area | Keadaan terverifikasi | Bukti |
|---|---|---|
| Permainan | 17 layar game di dalam `index.html` (`screen-game3..25`) + 25 halaman `games/*.html` (termasuk hub film, embed, shell-smoke) | `grep -c 'id="screen-game' index.html` = 17; `ls games/*.html` = 25 |
| Game emosi | **Semua dipensiunkan** 2026-09-20: G1 Aku Merasa, G2 Napas Pelangi, G5 Cocokkan Emosi, G12; "owner is building replacement" | `game.js:1219`, `game.js:1231` `RETIRED_GAMES = [1, 2, 5, 12]`, `game.js:1877` |
| Profil anak | Multi-avatar (saudara) dengan save ber-avatar lewat `save-engine.js` (19 halaman) | `games/data/save-engine.js:1-40`, `:85 saveLevelProgress` |
| Celah save per anak | Ayo Berhitung menyimpan lembar kerja + XP ke kunci global `berhitung-v2`, jadi saudara saling menimpa — **diperbaiki 2026-11-11** (save ber-avatar + migrasi sekali; `tools/qa-ayo-per-child.mjs`). Koreksi draf awal: `dunia_side_train` di Balapan samping hanya kereta pilihan, bukan progres; runner itu tidak menyimpan progres sama sekali | `games/ayo-berhitung.html` (store), `games/balapan-kereta-side.html:541` |
| Dasbor | Nyata (dari save): bintang, tier XP, lencana, streak, jumlah game dimainkan. **Tanpa** wawasan belajar (skill, kesalahan, waktu); memakai emoji (🔥 🎮, `p.animal`) | `game.js:4041-4110` |
| Narasi suara | Parsial: Timmy (klip + TTS `id-ID` fallback), Lokomotif (huruf), train-shared, Selamatkan (bark). Game lain teks saja **[BELUM TERVERIFIKASI per layar]** | `games/tk-hub.js:88-117`, `games/lokomotif-pemberani.html:2356`, `games/train-shared.js:360` |
| Adaptivitas | **Koreksi draf awal:** Timmy sudah punya model penguasaan per domain (`TKQuiz.mastery`, 0–100, 4 tier) yang disimpan di save Timmy dan menyetel tingkat + penyajian soal (`levelFor`, `present`); soal-engine menyimpan riwayat soal per avatar agar tidak berulang. Game lain (Kuis Matematika, Ayo Berhitung, dll.) memakai tier level statis | `games/tk-quiz.js:63-80`, `games/timmy-kapal.js:962,1043`, `games/data/soal-engine.js:225` |
| Log belajar | Sebelum 2026-11-11 tidak ada pencatat jawaban lintas game. **Kini ada** `DuniaBus` + `LearningLog` per anak, terpasang di Kuis Matematika, Ayo Berhitung, dan semua soal TKQuiz (Timmy); game lain belum memancarkan | `games/data/dunia-bus.js`, `games/data/learning-log.js`, `tools/qa-learning-log.mjs` |
| Freeze watchdog | Modul mencatat galat/stall ke `localStorage.__freezeLog` dan, bila frame berhenti >5 s dua kali berturut, menampilkan kartu pulih "Permainannya berhenti sebentar" + tombol **Main Lagi** (reload seluruh halaman), dengan catatan teknis di kartu. Kartu itu **berbasis teks** (anak belum bisa membaca) dan reload tidak kembali ke level yang sama. Sebelum 2026-11-10 **tidak dimuat** di 5 halaman game: timmy-kapal, garasi-tempur, kereta-maze, mojo-swoptops, stinky-dirty — kini dipasang (lihat Deliverable 5) | `games/data/freeze-watchdog.js:138-262`; `tools/qa-watchdog-wired.mjs` |
| Update PWA | Benar: reload deploy ditunda sampai halaman tersembunyi (tidak menarik anak keluar di tengah main) | `games/sw-reload.js:40-50` |
| Cloud sync | Dikirim ke klien tapi **dorman**: tidak ada `CLOUD_SYNC_CONFIG` di halaman mana pun | `games/data/cloud-sync.js:14-21`; grep `CLOUD_SYNC_CONFIG =` hanya di komentar |
| CI | `pages.yml` hanya deploy + prune ukuran; **tidak menjalankan gate apa pun** | `.github/workflows/pages.yml` |
| Gate QA | 184 `tools/qa-*.mjs`, lokal saja. 133 hardcode `localhost:8081`; tiga nama env URL (`QA_BASE` 33, `QA_URL` 30, `BASE` 10) | grep atas `tools/qa-*.mjs` |
| Lapisan sinematik | Live di semua game (v64.29–v64.32); gate 271 cek + audit input 220 cek | `tools/qa-dunia-cinema.mjs`, `tools/qa-dunia-cinema-input.mjs` |

### 1.2 Kekuatan
- Disiplin bukti yang jarang ada: ratusan gate render nyata, prinsip "jalan buntu = bug terparah" sudah tertulis dan dipakai.
- Save ber-avatar, watchdog stall, reload-deploy yang aman, offline-first lewat SW: fondasi keandalan sudah ada di sebagian besar halaman.
- Mesin konten bersama (`soal-engine`, `soal-gen-matematika`, `g23-question-engine`, `reward-catalog`) sudah dipakai lintas halaman — titik ungkit untuk lapisan belajar.

### 1.3 Kelemahan inti (urut dampak ke tujuan produk)
1. **Nama dan isi tidak selaras:** "Dunia Emosi" kini tanpa satu pun game emosi.
2. **Tidak ada lingkar belajar:** jawaban anak tidak dicatat, tidak ada model kemampuan, tidak ada pengulangan, dasbor tidak bisa menjawab "anak saya sudah bisa apa?".
3. **Keandalan di perangkat asli tidak teruji:** gate jalan di headless saja; bug tablet 2026-11-10 (jeda ketuk 2×) lolos semua gate sampai ada law yang mengukur jeda ketuk. Lima halaman bahkan tanpa watchdog (diperbaiki 2026-11-10, v64.33).
4. **Gate tidak menjaga deploy:** CI hanya deploy; ship bergantung pada sesi yang ingat menjalankan gate yang benar dengan port yang benar.
5. **Fragmentasi save:** Ayo Berhitung menyimpan di luar profil anak (diperbaiki 2026-11-11).

### 1.4 Roadmap 50-ide sebelumnya — status nyata
| Sprint lama | Status di kode |
|---|---|
| Sprint 0 Audit & Stabilitas | Sebagian (watchdog, sw-reload, cinema gates) |
| Sprint 1 Learning Event System | **Belum ada** (tidak ada modul log jawaban) |
| Sprint 2 Game 10 Learning Feedback | [BELUM TERVERIFIKASI] |
| Sprint 3 Mastery Tree | Model penguasaan ada **hanya di Timmy** (`TKQuiz.mastery`); belum lintas game |
| Sprint 4 Daily Training Routine | Streak harian ada (`game.js` `pkey('streak')`); rutinitas tidak |
| Sprint 6 Pulau Emosi 2D | **Belum ada**; game emosi justru dipensiunkan |

---

## Deliverable 2 — Improvement Register (32 ide)

Kerangka prioritas (transparan):
`Prioritas = (2×Dampak + Inovasi + Ungkit) × Keyakinan ÷ PoinUsaha`
dengan Keyakinan 0.5 (dugaan) / 0.75 (sebagian terverifikasi) / 1.0 (terverifikasi),
PoinUsaha S=1 (≤2 hari), M=2 (≤1 minggu), L=3 (2–3 minggu), XL=5 (>1 bulan).
Ungkit = berapa ide lain yang dibuka (1–10). Risiko dicatat per ide, tidak dimasukkan
ke angka supaya terlihat terpisah.

### Tabel ringkas

| # | Ide | Dampak | Inovasi | Ungkit | Yakin | Usaha | Prioritas |
|---|---|---|---|---|---|---|---|
| 1 | Pasang freeze-watchdog di 5 halaman yang belum + gate kabel | 7 | 2 | 6 | 1.0 | S | **22.0** |
| 2 | Watchdog → pemulihan bergambar (stall/error → "Coba lagi" + progres utuh) | 9 | 6 | 7 | 0.75 | M | 11.6 |
| 3 | Perbaiki save per anak (Ayo Berhitung) + migrasi — **selesai** | 8 | 2 | 4 | 1.0 | S | **22.0** |
| 4 | Gate sebelum deploy di CI (statis + smoke) | 8 | 3 | 8 | 1.0 | M | 13.5 |
| 5 | Satu runner gate + satu env URL | 6 | 3 | 8 | 1.0 | M | 11.5 |
| 6 | Jalur uji perangkat asli (adb + CDP ke tablet owner) | 9 | 7 | 7 | 0.75 | M | 12.0 |
| 7 | Telemetri lokal ringan (jeda ketuk, stall, error) + halaman "Kesehatan perangkat" | 7 | 6 | 6 | 0.75 | M | 9.4 |
| 8 | Bus peristiwa bersama `DuniaBus` (level mulai/selesai, jawaban, hadiah) | 7 | 5 | 10 | 1.0 | M | 14.5 |
| 9 | Log belajar per anak (Learning Event) di atas bus | 9 | 5 | 9 | 1.0 | M | 16.0 |
| 10 | Model penguasaan lintas game (angkat `TKQuiz.mastery` yang sudah ada) | 10 | 6 | 7 | 1.0 | M | 16.5 |
| 11 | Antrean pengulangan: soal yang salah muncul lagi di gerbang soal game lain | 8 | 8 | 5 | 0.75 | M | 10.9 |
| 12 | Halaman orang tua berbasis bukti belajar (ganti dasbor bintang/XP) | 9 | 5 | 4 | 1.0 | M | 13.5 |
| 13 | Petunjuk sesuai jenis kesalahan (salah satu, terbalik, kiri/kanan) | 7 | 7 | 3 | 0.75 | M | 9.0 |
| 14 | Cakupan narasi: setiap instruksi punya klip suara id-ID + gate | 9 | 4 | 5 | 0.75 | L | 6.8 |
| 15 | Gate "instruksi tanpa gambar/suara" (teks panjang tanpa pendamping) | 6 | 4 | 3 | 0.75 | S | 14.3 |
| 16 | Spesifikasi dunia emosi pengganti (check-in perasaan, napas, label emosi) | 10 | 7 | 6 | 0.5 | L | 5.5 |
| 17 | Momen tenang saat frustrasi (gagal 3× → napas bersama karakter) | 8 | 8 | 3 | 0.75 | M | 10.1 |
| 18 | Setelan profil anak dipakai semua game (suara, narasi, gerak dikurangi, usia) | 7 | 3 | 6 | 0.75 | M | 8.6 |
| 19 | Pita usia (5–6/7–8/9–10) benar-benar menyetel generator soal | 7 | 4 | 4 | 0.5 | M | 5.5 |
| 20 | Kartu "main berikutnya" di hub (aturan: penguasaan + variasi) | 7 | 6 | 3 | 0.75 | M | 8.6 |
| 21 | Ritme sesi: penutup sesi bergambar + batas waktu orang tua | 7 | 5 | 2 | 0.75 | M | 7.9 |
| 22 | Satu buku koleksi hadiah lintas game (`reward-catalog` sudah 4 halaman) | 6 | 5 | 3 | 0.75 | L | 5.0 |
| 23 | Indikator "siap luring" per game + unduh saat ada wifi | 7 | 5 | 3 | 0.75 | M | 8.3 |
| 24 | Penghangatan cache yang tidak berebut dengan permainan (Timmy `warm()`) | 6 | 3 | 2 | 0.5 | S | 8.5 |
| 25 | Validator keterselesaian level semua game data-driven di CI | 8 | 4 | 4 | 0.75 | M | 9.0 |
| 26 | Pipeline potong padding sprite otomatis (sprite orang 25% kanvas) | 5 | 3 | 4 | 1.0 | S | 17.0 |
| 27 | Gate aturan konten lintas game (emoji, outline putih, hijab checklist) | 7 | 4 | 3 | 0.75 | M | 7.9 |
| 28 | Gate kontras + ukuran target sentuh untuk semua game (sekarang index saja) | 7 | 3 | 3 | 1.0 | M | 10.0 |
| 29 | Shell game bersama (rumah, jeda, suara, narasi, pemulihan) | 8 | 4 | 9 | 0.75 | XL | 4.4 |
| 30 | Gate anggaran jeda aksi game (bukan hanya tombol netral) | 7 | 6 | 3 | 1.0 | M | 11.5 |
| 31 | Lampu "dipanggang" di aset / normal map sprite Pixi utama | 5 | 7 | 2 | 0.5 | L | 3.2 |
| 32 | Getar halus Android untuk ketuk/menang (setelan `dunia-emosi-vibrate` sudah ada) | 4 | 3 | 1 | 0.75 | S | 9.0 |

### Rincian per ide (15 kriteria)

Format: **Keterbatasan** · **Transformasi** · **UX** · **Alur** · **Nilai** · **Teknis** ·
**Integrasi** · **Kompleksitas/Usaha** · **Skor (Dampak/Inovasi/Yakin)** · **Risiko** · **Kriteria terima**.

**#1 Watchdog di semua halaman game**
- Keterbatasan: 5 halaman (timmy-kapal, garasi-tempur, kereta-maze, mojo-swoptops, stinky-dirty) tidak memuat `freeze-watchdog.js`; Timmy adalah halaman bug tablet 2026-11-10, jadi stall di sana tidak tercatat.
- Transformasi: muat watchdog di semua halaman game; gate gagal bila ada halaman game tanpa watchdog.
- UX: anak mendapat kartu pulih saat game membeku (sebelumnya: layar mati); orang tua bisa membuka `#freezelog`.
- Alur: halaman dimuat → watchdog terpasang → galat dicatat; frame berhenti >5 s ×2 → kartu pulih muncul → `#freezelog` menampilkan riwayat.
- Nilai: menutup titik buta di halaman yang paling sering dilaporkan.
- Teknis: satu tag `<script>` per halaman + token cache; gate statis.
- Integrasi: `freeze-watchdog.js`, `normalize-cache-tokens.mjs`, sw precache.
- Kompleksitas Rendah · Usaha ≤1 hari · Skor 7/2/1.0.
- Risiko: watchdog sendiri memasang handler `visibilitychange` yang membersihkan interval basi → harus diuji per game (gate tiap game).
- Terima: `grep` tiap `games/*.html` game memuat watchdog; gate per game tetap hijau; `#freezelog` tampil di Timmy.

**#2 Pemulihan bergambar**
- Keterbatasan: kartu pulih yang ada (`freeze-watchdog.js:188`) berbasis teks dan me-reload seluruh halaman, jadi anak kembali ke layar awal game; galat yang tidak menghentikan frame (tombol mati, state rusak) tidak memicu kartu sama sekali. `PRODUCT.md` menyebut jalan buntu sebagai bug terparah.
- Transformasi: ganti isi kartu dengan karakter + ikon putar + suara (tanpa teks wajib); tombol memuat ulang **level** yang sama dengan progres utuh; tambahkan pemicu kedua: galat tak tertangkap selama level berjalan.
- UX: kartu gambar karakter + ikon panah putar; tanpa teks wajib; suara "Ayo coba lagi".
- Alur: deteksi → simpan konteks (`__freezeContext`) → tampilkan kartu → ketuk → `location.reload()` dengan hash `#resume=level` → game membaca hash dan melanjutkan dari level itu → catat di log.
- Nilai: mengubah "aplikasi rusak" menjadi satu ketukan.
- Teknis: perluasan `showRecovery()` di `freeze-watchdog.js`; kontrak opsional per game `window.__resumeLevel(fn)`.
- Integrasi: save-engine (progres), #8 bus, #7 telemetri.
- Kompleksitas Sedang · ~4–5 hari · Skor 9/6/0.75.
- Risiko: false positive (boot berat). Pakai pembeda `stall` vs `boot-slow` yang sudah ada.
- Terima: injeksi galat di 3 game → kartu muncul ≤1 s, ketukan kembali ke level yang sama dengan bintang utuh; tidak ada kartu pada boot-slow.

**#3 Save per anak untuk Ayo Berhitung** — *SELESAI 2026-11-11 (v64.34)*
- Keterbatasan: kunci global `berhitung-v2` — saudara saling menimpa lembar kerja dan XP. (Draf awal juga menyebut `dunia_side_train`; itu hanya kereta pilihan, bukan progres — dicoret.)
- Transformasi: pakai `avatarScopedGet/Set` + `saveLevelProgress`; migrasi satu kali kunci global ke avatar aktif.
- UX: tiap anak melihat progresnya sendiri.
- Alur: boot → `lockGameAvatarSession()` → baca kunci ber-avatar; jika kosong dan kunci global ada → salin ke avatar aktif sekali, tandai migrasi.
- Nilai: menghapus kelas bug "progres adik hilang".
- Teknis: `save-engine.js` API sudah ada (`:62`, `:145`, `:161`).
- Integrasi: peta dunia, dasbor.
- Kompleksitas Rendah · 1–2 hari · Skor 8/2/1.0.
- Risiko: migrasi salah anak (avatar aktif saat migrasi). Migrasi hanya bila **satu** avatar ada, selain itu tanya lewat pemilih avatar.
- Terima: dua avatar memainkan level berbeda → progres terpisah; bintang muncul di peta; uji migrasi dari save lama.

**#4 Gate sebelum deploy di CI**
- Keterbatasan: `pages.yml` hanya deploy; ship hijau bergantung pada ingatan sesi.
- Transformasi: job `verify` sebelum `deploy`: `normalize-cache-tokens --check`, `node --check` semua JS, gate statis (emoji, watchdog kabel, token), lalu smoke headless `qa-app-sweep` + audit input subset.
- UX: owner tidak melihat apa pun selain deploy yang tidak lagi merusak.
- Alur: push → verify (≤10 menit) → gagal = tidak deploy + anotasi.
- Nilai: menutup kelas "rebase menjatuhkan perbaikan", "min twin basi", "token beda".
- Teknis: GitHub Actions ubuntu + Chrome headless; http server statis di job.
- Integrasi: semua gate; #5 runner.
- Kompleksitas Sedang · 3–5 hari · Skor 8/3/1.0.
- Risiko: gate render di CI tanpa GPU (pakai swiftshader); waktu job. Mulai dari subset cepat.
- Terima: commit yang merusak token/sintaks gagal di CI dan tidak ter-deploy; commit bersih ter-deploy seperti sekarang.

**#5 Satu runner gate + satu env**
- Keterbatasan: 184 gate, 133 hardcode `:8081`, env `QA_BASE`/`QA_URL`/`BASE`; di sesi ini dua gate Timmy crash murni karena env.
- Transformasi: `tools/run-gates.mjs` + manifest (nama, halaman, durasi, tag) yang menyalakan server sendiri, menyuntik satu `QA_BASE`, menjalankan paralel terbatas (lock browser), mengulang sekali yang flake, menulis ringkasan JSON.
- Kompleksitas Sedang · ~1 minggu (migrasi bertahap) · Skor 6/3/1.0.
- Risiko: migrasi 133 berkas — pakai shim env tanpa mengubah logika gate.
- Terima: `node tools/run-gates.mjs --tag timmy` menjalankan 5 gate Timmy tanpa env manual; ringkasan menandai flake.

**#6 Jalur uji perangkat asli**
- Keterbatasan: bug tablet tak bisa direproduksi headless; owner tidak menguji (aturan owner).
- Transformasi: skrip yang menghubungkan tablet owner lewat `adb` (USB/wifi debugging) + `chrome://inspect` CDP dan menjalankan subset gate (jeda ketuk, stall, fps tier) di GPU sungguhan.
- Ketergantungan: owner menyalakan USB debugging sekali dan menyambungkan tablet; ini satu-satunya langkah manusia.
- Kompleksitas Sedang · ~1 minggu · Skor 9/7/0.75.
- Risiko: perangkat tidak selalu tersambung; jalankan saat tersedia, tidak memblokir deploy.
- Terima: law 15 (jeda ketuk Timmy) jalan di tablet dan mencetak angka ms nyata.

**#7 Telemetri lokal + "Kesehatan perangkat"**
- Keterbatasan: data hanya muncul saat owner melapor.
- Transformasi: cincin buffer `localStorage` (≤200 entri) berisi jeda ketuk p50/p95 per game, stall, galat; halaman orang tua menampilkannya; opsional ekspor teks.
- Kompleksitas Sedang · ~4 hari · Skor 7/6/0.75.
- Risiko: biaya pengukuran; ukur pasif (PerformanceObserver `event`, `longtask`) tanpa kerja per frame.
- Terima: setelah 10 menit main, halaman menampilkan p95 jeda ketuk per game; gate memastikan overhead <2 ms per ketukan.

**#8 Bus peristiwa bersama `DuniaBus`**
- Keterbatasan: modul saling menempel dengan monkeypatch (contoh: cinema membungkus `VFX.Moment.reward` di `games/dunia-cinema.js` `wrap()`), tidak ada kontrak peristiwa.
- Transformasi: `games/data/dunia-bus.js` — `emit('level:start'|'level:end'|'answer'|'reward'|'stall', payload)` di atas `CustomEvent`; game memanggil 4 titik; konsumen: cinema, log belajar, telemetri, hadiah.
- Kompleksitas Sedang · ~4 hari untuk bus + 3 game pertama · Skor 7/5/1.0 · Ungkit 10.
- Terima: 3 game memancarkan 4 peristiwa; gate menghitung peristiwa pada satu permainan skrip.

**#9 Log belajar per anak**
- Keterbatasan: tak ada catatan jawaban (lihat 1.1).
- Transformasi: konsumen bus yang menyimpan `{t, game, skill, item, ok, ms, hint}` per avatar di IndexedDB (fallback localStorage), dipadatkan per hari.
- Kompleksitas Sedang · ~4 hari · Skor 9/5/1.0.
- Risiko: kuota penyimpanan; pemadatan harian + batas 90 hari.
- Terima: 20 jawaban di Kuis + Timmy tercatat dengan skill benar; ukuran per hari <5 KB.

**#10 Model penguasaan per skill (perluas model Timmy)**
- Keterbatasan: Timmy sudah adaptif per domain (`TKQuiz.mastery`), tapi game lain tidak, dan skor Timmy hidup di save Timmy saja — penguasaan yang ditunjukkan di Kuis Matematika tidak diketahui Timmy dan sebaliknya.
- Transformasi: angkat `TKQuiz.mastery` menjadi modul bersama yang membaca log #9 (per domain, lalu per skill); generator soal (`soal-engine`, `soal-gen-matematika`, `g23-question-engine`, `tk-quiz`) menerima `targetDifficulty` per skill.
- Alur: jawaban → update skor → soal berikut dipilih di sekitar 70–80% peluang benar.
- Kompleksitas Tinggi · 2–3 minggu · Skor 10/8/0.75.
- Risiko: memetakan item lama ke skill dan tingkat; mulai dari matematika (sudah ada `MATH-DIFFICULTY-STANDARD.md`).
- Terima: simulasi anak lemah vs kuat menghasilkan tingkat berbeda dalam 15 soal; tingkat benar anak simulasi stabil 65–85%.

**#11 Antrean pengulangan lintas game**
- Transformasi: item yang salah masuk antrean per avatar (1/3/7 hari); gerbang soal di game lain (peti tanya Timmy, gerbang edu Mojo, Kuis) mengambil satu item dari antrean dulu.
- Kompleksitas Sedang · ~1 minggu · Skor 8/8/0.75 · Ketergantungan #9.
- Terima: item salah hari ini muncul lagi di game lain dalam sesi berikutnya; tidak lebih dari 1 dari 3 soal berasal dari antrean.

**#12 Halaman orang tua berbasis bukti**
- Keterbatasan: dasbor `game.js:4041` hanya bintang/XP/lencana; tidak menjawab "sudah bisa apa, sulit di mana".
- Transformasi: halaman di balik gerbang orang tua (soal dewasa sederhana) dengan: skill dikuasai/berkembang/sulit, waktu main 7 hari, game favorit, kesehatan perangkat (#7), saran aktivitas luar layar.
- Kompleksitas Sedang · ~1 minggu · Skor 9/5/1.0 · Ketergantungan #9.
- Risiko: tanpa emoji (aturan owner) — pakai sprite.
- Terima: data 7 hari simulasi menghasilkan ringkasan yang cocok dengan log; gate kontras + zero-emoji hijau.

**#13 Petunjuk sesuai jenis kesalahan**
- Transformasi: pengklasifikasi aturan (bukan AI) per domain: penjumlahan selisih 1, huruf b/d terbalik, kiri/kanan tertukar di papan Timmy → petunjuk gambar yang tepat.
- Kompleksitas Sedang · ~1 minggu · Skor 7/7/0.75.
- Terima: tiap jenis kesalahan uji menghasilkan petunjuk yang benar di gate.

**#14 Cakupan narasi suara**
- Keterbatasan: anak belum bisa membaca; narasi hanya di beberapa game (lihat 1.1).
- Transformasi: ekstrak semua string instruksi → pra-render klip id-ID (VoiceStudio OmniVoice lokal sudah ada di mesin pengembang) → peta teks→klip → pemutar bersama dengan fallback TTS seperti `tk-hub.js:88-117`.
- Kompleksitas Tinggi · 2–3 minggu (render CPU ~5 menit/baris menurut catatan alat; batching) · Skor 9/4/0.75.
- Risiko: ukuran unduhan luring; opus 24 kbps.
- Terima: gate memastikan setiap instruksi di layar mulai tiap game punya klip; ukuran tambahan dicatat.

**#15 Gate instruksi tanpa pendamping** — teks instruksi >40 karakter tanpa sprite/klip di dekatnya ditandai. Rendah · 2 hari · Terima: daftar per game, lalu ratchet (boleh turun, tidak boleh naik).

**#16 Spesifikasi dunia emosi pengganti**
- Keterbatasan: game emosi dipensiunkan; owner sedang membangun pengganti (`game.js:1877`).
- Transformasi: **spesifikasi saja sampai owner setuju**: check-in perasaan di awal sesi (pakai sprite wajah `assets/db/faces` yang dipakai G1/G5), napas pelangi sebagai alat tenang, label emosi di momen cerita game yang sudah ada.
- Kompleksitas Tinggi · Skor 10/7/0.5 (keyakinan rendah: arah owner belum diketahui).
- Terima: owner menyetujui spesifikasi sebelum ada kode.

**#17 Momen tenang saat frustrasi** — gagal 3× berturut di satu level → karakter mengajak napas 3 hitungan, lalu tawaran versi lebih mudah. Sedang · 1 minggu · Ketergantungan #8. Terima: simulasi 3 gagal memicu momen, lalu tingkat turun satu.

**#18 Setelan profil dipakai semua game** — suara, narasi, gerak dikurangi, usia disimpan per avatar dan dibaca semua game (sekarang `dunia-emosi-sound`, `dunia-emosi-vibrate` global di `game.js:2172-2209`). Sedang · ~4 hari.

**#19 Pita usia menyetel soal** — layar nama menanyakan usia (5–6/7–8/9–10, `index.html` `age-btn`); pemakaiannya oleh generator **[BELUM TERVERIFIKASI]**. Verifikasi dulu, lalu sambungkan ke #10.

**#20 Kartu "main berikutnya"** — aturan: skill terlemah + game yang belum dimainkan hari ini; satu kartu besar bergambar di hub. Sedang · ~4 hari · Ketergantungan #9.

**#21 Ritme sesi** — setelah N menit (setelan orang tua), di batas level berikutnya muncul penutup bergambar "Hari ini kamu belajar…" lalu layar istirahat. Tidak pernah memotong di tengah level. Sedang.

**#22 Satu buku koleksi** — hadiah semua game masuk satu buku per avatar; `reward-catalog.js` sudah dipakai 4 halaman. Tinggi (konten).

**#23 Siap luring per game** — hitung dari isi cache SW apakah semua aset wajib game ada; lencana "siap" di menu; tombol unduh saat wifi. Sedang.

**#24 Penghangatan cache yang sopan** — `timmy-kapal.js:1388-1397` mengunduh seluruh `warmList` (semua aset tk-*, kapal, VFX ledakan, sfx) 3 paralel dengan `cache: 'no-cache'` — artinya **setiap kali halaman dibuka** semua aset divalidasi ulang ke jaringan — segera setelah SW siap (requestIdleCallback, timeout 4 s), di saat anak bermain. Ukur dampaknya di perangkat (#6) **[BELUM TERVERIFIKASI apakah membebani]**; bila ya, tunda ke idle panjang/halaman menu. Rendah.

**#25 Validator keterselesaian level** — papan Timmy (BFS), pola Mojo (`simPatterns` ada), rute kereta; semua dijalankan di CI (#4). Sedang.

**#26 Potong padding sprite** — `assets/db/people/003.webp` 200×200 dengan isi 48×70 (diukur); skrip PIL memotong ke bbox + margin seragam, menulis ulang webp, gate rasio isi ≥60%. Rendah. Risiko: sprite yang sengaja berpadding untuk animasi; jalankan per pack dengan tinjauan.

**#27 Gate aturan konten lintas game** — zero-emoji pada teks yang dirender (dasbor masih memakai emoji, `game.js:4041-4110`), outline putih (deteksi tepi terang pada sprite), checklist hijab manual. Sedang.

**#28 Kontras + target sentuh semua game** — perluasan `tools/qa-index-contrast.mjs` (kini index saja) + ukuran target ≥48 px. Sedang; mulai sebagai laporan, lalu ratchet.

**#29 Shell game bersama** — rumah, jeda, suara, narasi, pemulihan sebagai satu modul. Sangat tinggi; lakukan setelah #8 sebagai adopsi bertahap per game, bukan penulisan ulang. Prinsip owner "reuse engines" — shell membungkus kontrol yang sudah ada, tidak menggantinya.

**#30 Gate jeda aksi game** — generalisasi law 15: untuk tiap game, aksi utama (panah, jawaban, lompat) diukur ketuk→layar. Sedang. Terima: semua game dalam anggaran 25 ms dari halaman tanpa lapisan.

**#31 Lampu dipanggang / normal map** — pencahayaan di aset sumber (Blender pipeline tersedia di mesin) untuk sprite utama; menambah kedalaman tanpa biaya runtime. Tinggi; nilai lebih rendah dari lingkar belajar.

**#32 Getar halus** — `navigator.vibrate(10)` pada ketuk jawaban benar/menang, mengikuti setelan `dunia-emosi-vibrate` yang sudah ada. Rendah.

Ide yang **dibuang** karena jawabannya lemah: LLM companion (luring + anak 5 tahun + biaya; sudah ditunda roadmap lama), multiplayer kompetitif daring (bertentangan dengan luring), battle pass (pola monetisasi, bukan belajar), pengenalan tulisan tangan berbasis ML (sudah diturunkan prioritasnya di roadmap lama).

---

## Deliverable 3 — Top 10 Transformation Blueprint

Urutan berdasarkan prioritas, lalu ketergantungan:

| Urut | Ide | Kenapa sekarang | Membuka |
|---|---|---|---|
| 1 | #1 Watchdog kabel | Titik buta di halaman bug terakhir | #2, #7 |
| 2 | #3 Save per anak | Bug data nyata, murah | #9, #12 |
| 3 | #4 + #5 CI + runner | Semua ide lain butuh pagar deploy | semua |
| 4 | #8 DuniaBus | Kontrak satu kali untuk semua konsumen | #2, #7, #9, #17 |
| 5 | #9 Log belajar | Data mentah lingkar belajar | #10–#13, #20 |
| 6 | #2 Pemulihan bergambar | Prinsip #1 PRODUCT.md | — |
| 7 | #12 Halaman orang tua | Nilai yang terlihat owner | — |
| 8 | #10 + #11 Penguasaan + pengulangan | Inti produk belajar | #20 |
| 9 | #14 Narasi | Membuka game bagi anak yang belum membaca | — |
| 10 | #6 Perangkat asli | Menutup kelas bug "headless lolos" | #7, #30 |

### Alur lengkap 1 — Pemulihan bergambar (#2)
- **Titik masuk:** anak bermain; game membeku (stall >4 s setelah settle) atau melempar galat saat level berjalan.
- **Keadaan awal:** watchdog terpasang (#1), avatar terkunci (`lockGameAvatarSession`), `__freezeContext = 'level 3'`.
- **Reaksi sistem:** watchdog memancarkan `stall`/`error` lewat bus → modul pemulihan menilai: boot-slow → abaikan; stall/galat dalam level → kartu.
- **Data:** progres terakhir sudah tersimpan oleh `saveLevelProgress`; konteks level dari `__freezeContext`.
- **Umpan balik visual:** lapisan penuh dengan karakter + ikon putar + suara "Ayo coba lagi"; tidak ada teks wajib.
- **Pengecualian:** galat berulang <30 s setelah pemulihan → kartu kedua menawarkan kembali ke menu (bukan loop reload).
- **Keluaran:** level dimuat ulang di level yang sama; entri di log telemetri (#7) `{type:'recover', game, ctx}`.
- **Audit:** `#freezelog` menampilkan rantai stall → recover → hasil.
- **Kriteria terima:** lihat #2.

### Alur lengkap 2 — Lingkar belajar (#8 → #9 → #10 → #11 → #12)
1. Anak menjawab soal di Kuis → game `emit('answer', {skill:'tambah-1digit', item:'3+4', ok:false, ms:5200})`.
2. Log belajar menyimpan per avatar; model penguasaan menurunkan skor skill.
3. Item masuk antrean ulang (1 hari).
4. Besok, peti tanya di Timmy meminta soal: generator memeriksa antrean dulu → `3+4` muncul dengan gambar berbeda.
5. Benar → skor naik, item dijadwalkan 3 hari.
6. Halaman orang tua: "Penjumlahan satu angka: berkembang (7 dari 10 benar minggu ini)".
- **Pengecualian:** penyimpanan penuh → pemadatan; avatar tidak diketahui → tidak mencatat (lebih baik hilang daripada salah anak).
- **Kriteria terima:** skenario di atas dijalankan oleh gate dengan jam tiruan.

### Alur lengkap 3 — Deploy terjaga (#4 + #5)
push → job verify (token, sintaks, gate statis, smoke) → hijau: deploy Pages seperti sekarang / merah: berhenti + anotasi baris gagal → Vercel tetap mengikuti main (catatan: Vercel tidak menunggu job Pages — **perlu keputusan owner** apakah Vercel diatur "ignored build step" bila verify gagal).

---

## Deliverable 4 — Implementation Roadmap

> **2026-11-14:** semua ide yang tersisa punya PRD sendiri di `docs/prd/` (25 berkas, indeks + aturan selesai di `docs/prd/README.md`). Urutan gelombang di sana menggantikan tabel fase di bawah untuk pekerjaan berikutnya.

| Fase | Isi | Usaha | Ketergantungan |
|---|---|---|---|
| 0 (minggu ini) | #1, #3, #26, #32 quick wins; #15 laporan | 3–5 hari | — |
| 1 (2 minggu) | #5 runner, #4 CI verify, #30 gate jeda aksi | ~2 minggu | — |
| 2 (2 minggu) | #8 bus, #9 log, #2 pemulihan, #7 telemetri | ~2 minggu | Fase 1 |
| 3 (3–4 minggu) | #12 halaman orang tua, #10 penguasaan (matematika dulu), #11 pengulangan, #20 kartu berikutnya | ~4 minggu | Fase 2 |
| 4 (paralel, konten) | #14 narasi, #16 dunia emosi (setelah persetujuan owner), #17 momen tenang | 3–6 minggu | #8 |
| 5 | #6 perangkat asli (begitu tablet tersambung), #23 siap luring, #29 shell bertahap | berjalan | owner: USB debugging |

---

## Deliverable 5 — Existing Task Completion Report (2026-11-10, diperbarui 2026-11-11)

| Tugas | Status | Bukti |
|---|---|---|
| Lapisan sinematik semua game (fase 1) | Live v64.29 | gate cinema 234/234 saat itu |
| Bloom Timmy in-scene (fase 2) | Live v64.30 | law 12 |
| Bentuk/bayangan Pixi + tajam di HP + squash Pikachu | Live v64.31 | law 13, 14 merah→hijau |
| Kontras layar mode/nama + tombol hijau | Live v64.32 | `qa-index-contrast` 26/44 → 44/44 |
| **Bug tablet Timmy "no respond, glitch"** | Live v64.33 | law 15: 140 ms → 61 ms (tanpa lapisan 60); `qa-dunia-cinema-input` 220/220; cinema 271/271 |
| Grade backdrop-filter dihapus | Live v64.33 | ~20 ms/ketuk di HP DPR3 |
| #1 Watchdog di 5 halaman game | Live v64.33 | `qa-watchdog-wired` 18/23 → 23/23 (+ runtime 33/33) |
| #3 Save per anak Ayo Berhitung | Live v64.35 (deploy Pages v64.34 timeout, Vercel live) | `qa-ayo-per-child` 3/9 → 9/9; `qa-ayo-berhitung` ALL PASS |
| #4 Gate sebelum deploy (CI) | Live | job `verify` lulus di runner GitHub (v64.34 4 menit, v64.35 5 menit); tiga deploy Pages 2026-11-10 17:05–18:33 UTC makan 15–16 menit (2 kena batas keras 10 menit `deploy-pages`), run berikutnya dengan workflow yang sama selesai 3 menit — lambatnya dari sisi Pages, bukan dari job `verify`. Bila gagal, Pages tetap menyajikan versi sebelumnya dan Vercel tetap ter-deploy; `qa-local-refs` merah 779/800 saat satu berkas dihilangkan |
| #8 + #9 DuniaBus + LearningLog | Live v64.35 (Pages + Vercel) | `qa-learning-log` 18/18 dari ketukan sungguhan (merah di situs v64.34); tk-play 1504/0 |
| #12 Wawasan belajar di dasbor orang tua | Live v64.36 | `qa-dash-learning` 23/23 (merah di situs lama); screenshot 390 + 1280 |
| #2 Kartu pulih bergambar + suara | Live v64.37 | `qa-freeze-card` 3/11 → 11/11; `qa-freeze-recovery`, `qa-freeze-armed` lulus; maskot di-precache |
| #16 Dunia emosi: mekanik A cek perasaan | v64.38 | `qa-feeling-checkin` 28/28; law tumpang-tindih judul/tombol X merah → hijau dari screenshot 390; ringkasan perasaan di dasbor |
| #16 mekanik B napas bersama + polish gerak | Live v64.39 | `qa-breathe` 23/23 |
| Audit kartu tenang (tap ganda, frustrasi basi, peta ditinggal <700 ms, run dobel) | Live v64.40 | `qa-breathe` 31/36 → 36/36 (+ law tablet/HP mendatar) |
| #5 Satu runner gate | Ada di repo (alat lokal) | `node tools/run-gates.mjs --tag timmy`: atlas/lifecycle/quiz-fit lulus tanpa env (langsung tanpa env: `ERR_CONNECTION_REFUSED`); fixture membedakan pass/fail/flaky/no-env/lock-busy. 2026-11-12: grid, grid-levels, questions membaca `QA_URL`; runner hanya menandai `no-env` gate yang menanam URL lokal (bukan gate node-only); 10 gate yang dulu dilewati kini jalan: 10/10 lulus (grid 2228, grid-levels 6787, questions 521 cek). 28/28 gate Timmy bisa dijalankan runner. 2026-11-13 `qa-tk-steer` beres, akar: (1) `networkidle2` di halaman game baru tercapai 31,8 s (tanpa loop rAF: 1,0 s), jadi level main sendiri sebelum cek (1024 gates/liner "via real button input" lulus dengan 0 tekanan) dan di mesin sibuk lewat 90 s = timeout; steer/lanes/perf kini `load` + harness siap, cek input wajib >0 tekanan (kini 10 tekanan, 3 bintang); (2) runner membunuh tiap gate di 600 s padahal steer ~24 menit - "detached Frame" itu bekas kill; gate kini menulis `// run-gates: timeout N`; (3) budget frame diukur di raster software: salinan canvas SwiftShader (`ProduceCanvasResource`) 1,7-2,0 s dari 3 s, p90 bolak-balik 20/30 fps; GPU asli + CPU 4x = 60/60/60, p95 16,8 ms, fault 60 ms tetap merah (p95 83 ms); (4) bug nyata `speedlines-fx.js`: `hold(key, 0)` tiap frame membersihkan + mengunggah canvas layar penuh tanpa isi (120 clear/120 frame, kini 0; gate `qa-speedlines-fx`). Runner: steer 1426 s ALL PASS, lanes 717 s ALL PASS, perf 0 gagal, tanpa retry. |
| #30 Gate jeda aksi game | Ada di repo (`tools/qa-action-latency.mjs`) | 22 halaman, ponsel 390x844, tapper deterministik (Math.random diseed, elemen ber-handler ketuk, jalan balik terakhir): 88/88. Median aksi dengan lapisan vs tanpa: selisih terbesar ejaan +17 ms (batas 25), terlama 301 ms (lokomotif, batas 1 s). Merah dibuktikan: sibuk 60 ms di pointerdown lapisan = L2 kuis 92 vs 46, stinky 77 vs 39; sibuk 1,1 s = L3 1127 ms. Temuan dan perbaikan: tombol "Mengerti!" modal cerita museum ada di bawah layar (875 > 844 px, juga 360x640 dan 844x390); kini sticky, bisa diketuk di ketiga ukuran |
| PRD gelombang 0 bagian 1 (`docs/prd/`) | Live v64.43 | **#19a** usia: layar nama menyorot 5–6 tapi menyimpan 7–8 untuk anak yang tidak mengetuk (gate `qa-profile-age` 2/5 → 9/9), `DuniaProfile.age()` untuk semua halaman game. **#32** setelan "Getar: mati" diabaikan 15 panggilan di 7 halaman (`qa-vibrate` merah di 7 halaman → 9/9). **#25** `qa-levels-solvable` di CI: 6747 cek papan Timmy, 64 level kereta, 8000 pola Mojo, dua mutasi tertangkap. **#26** sprite `people` isi 0,35 → 0,90 (`qa-sprite-fill`). **#27** sprite orang yang dipakai wajib sudah ditinjau (`qa-content-rules`; 👩 dipindah dari `people/5` yang berlubang). Ditemukan saat regresi: kartu napas dan cek perasaan menunggu `onfinish` fade 160 ms untuk hilang (330–700 ms headless, lapisan tak terlihat menutupi game) — kini tembus ketukan seketika dan hilang ≤300 ms (`qa-breathe` / `qa-feeling-checkin` merah → hijau) |
| PRD gelombang 0 bagian 2 + gelombang 1 bagian 1 (`docs/prd/`) | Live v64.44 | **#24** Timmy tidak lagi memvalidasi ulang semua aset tiap dibuka: buka kedua kali 693 → 91 hit server, sama dengan tanpa warm (`qa-tk-warm` merah → hijau, `qa-tk-offline` tetap lulus). **#8b** kuis kereta, gerbang kejar Mojo dan Belajar Bersama Mojo kini mengirim jawaban ke bus dan log anak (`qa-bus-coverage` 4/12 di live → 12/12, ketukan asli). **#10** `DuniaMastery` bersama: benar +K / salah −3K, setimbang di 75 % benar; anak simulasi 65–85 % benar (aturan lama Timmy ±41 %); skor Kuis terbaca di Timmy; skor Timmy lama jadi lantai (`qa-mastery` 10/10, mutasi tertangkap). **#19b** usia hanya titik mulai (5–6: 10, 7–8: 40, 9–10: 65); setelah 10 jawaban, jawaban yang menentukan |
| PRD-15 gate instruksi (`docs/prd/`) | Di CI | `qa-instruction-companion`: 0 teks panjang tanpa gambar/suara di layar pertama 26 halaman; paragraf polos tertanam → gagal, dengan gambar nyata atau diucapkan → lulus, gambar rusak → gagal. Hanya layar pertama — instruksi di dalam permainan belum terjangkau (dicatat untuk PRD-14) |
| PRD-27 bagian 2 (`docs/prd/`) | Di CI | Emoji di layar diperiksa di 27 tampilan termasuk dasbor orang tua (ketat) dan 7 halaman yang dulu terlewat — semua bersih; resolver dimatikan → 287 emoji tertinggal → gagal. Outline putih: `white-outline.py` menangkap tepi putih 2 px yang ditanam (exit 1), CI 1,4 s lewat baseline sha1. **Temuan:** 1048 sprite yang dipakai sudah ber-outline putih (Pokemon alt2 618, monster matematika 276, elements 100) → PRD-27c |
| PRD-27c outline putih (`docs/prd/`) | Live v64.45 | 906 sprite yang dipakai dilepas outline putihnya (`strip-white-rim.py`: kupas tepi luar saja, putih di dalam figur aman); utang `white-outline` 1048 → 142 (100 di pack `db/elements` yang tidak dipakai). Tepi terang 98–100 % → 0–6 %. Dilihat di Kuis, Monster Candy, Pokemon Birds |
| PRD-28 kontras + target sentuh (`docs/prd/`) | Live v64.46 | `qa-game-a11y`: kontras diukur dari piksel nyata di belakang teks. Tombol utama < 48 px 1 → 0 (Mobil; di landscape tombol Mulai juga tersembunyi di bawah kartu yang menggulung — kini menempel). 4 tombol mulai dengan teks putih pucat (1,7–2,5:1) dibuat terbaca. Sisa 82 target kecil + 17 teks = ratchet; tombol 30 px yang ditanam → gagal |
| PRD-26 bagian 2 (`docs/prd/`) | Live v64.47 | Pack `misc`, `ui`, `extra` dipotong: isi median 0,495 → 0,895 (`qa-sprite-fill` 4 pack, merah di HEAD). Kotak figur kini mengabaikan serpihan lepas. 6 sprite rusak ditemukan; 🌑 🌧 ⛈ 🌦 tadinya menggambar dua di antaranya → kini bulan/awan utuh, dan kode dilarang menunjuk sprite rusak |
| PRD-10 sisa + PRD-17b (`docs/prd/`) | Live v64.48 | Mojo kejar dan Kuis Matematika kini memilih besar angka dari penguasaan bersama (anak 5–6: Mojo ≤ 5, Kuis ≤ 10). Setelah peta menawarkan napas karena 3 salah, soal matematika berikutnya — di game mana pun — satu tier lebih mudah, sekali per sesi (`qa-soften` 9/9, live lama → gagal). Kuis kereta tidak punya tombol kesulitan: tidak diubah |
| PRD-11 antrean pengulangan (`docs/prd/`) | Live v64.49 | Soal matematika yang salah kembali besok, lalu 3 dan 7 hari, di game lain: salah di Kuis → besok di Mojo kejar sebagai gambar, dan sebaliknya; maksimal 1 dari 3 soal, per anak (`qa-review` 9/9, live lama → gagal). Peti tanya Timmy belum (bank soal sendiri) |
| Verifikasi di tablet asli | **Belum** | butuh #6 (owner menyalakan USB debugging) |
