# Blippi: Mega Discovery Adventure
## Master PRD — Kendaraan, Penemuan, dan Kota yang Tumbuh

| Kontrol dokumen | Nilai |
|---|---|
| Versi | 3.0 — desain ulang dari konsep lampiran versi 2.0.0 |
| Tanggal | 10 Oktober 2026 |
| Bahasa | Bahasa Indonesia; istilah implementasi menggunakan bahasa Inggris bila lebih jelas |
| Sumber konsep | `Pasted text.txt`: *Blippi’s Mega Mechanics: Vehicle Hospital & Stunt Lab* |
| Tujuan | Spesifikasi produk, game design, UX, konten, aset, arsitektur, dan acceptance criteria untuk pengembangan bertahap |
| Pemain utama | Anak usia 7–8 tahun, kelas 1–2 SD; rentang pengujian tambahan 6 tahun |
| Platform dasar | Android dan iOS/iPadOS; landscape; permainan inti offline |
| Format | Single-player, eksplorasi diorama 3D, misi kendaraan, eksperimen, konstruksi, dan sandbox |
| Status | Baseline desain yang dapat diimplementasikan; belum merupakan game teruji atau klaim production-ready |
| Keputusan produk utama | Bengkel menjadi salah satu aktivitas dalam petualangan; anak tidak wajib memperbaiki kendaraan sebelum bermain |

**Pitch satu kalimat:** Anak menjadi penjelajah dan pembangun bersama Blippi: memilih kendaraan, menemukan masalah, mencoba ide, dan mengubah kota menjadi tempat bermain yang makin hidup.

**Janji kepada anak:** “Aku bisa mengendarai, membuat, mencoba, dan melihat hasil buatanku dipakai di dunia permainan.”

**Janji kepada orang tua:** Permainan dapat digunakan tanpa membaca lancar, tanpa iklan, tanpa chat, tanpa pembelian di area anak, dan tanpa kewajiban login atau kembali setiap hari.

**Cara membaca spesifikasi:** MUST berarti syarat wajib pada fase yang disebutkan; SHOULD berarti target yang boleh disesuaikan melalui playtest; LATER berarti di luar v1. Semua angka performa, durasi, toleransi kontrol, dan target playtest adalah target desain awal, bukan hasil pengukuran. Konten dan karakter pendukung yang diciptakan di dokumen ini adalah usulan untuk game, bukan klaim tentang kanon Blippi.

### Daftar isi

1. Diagnosis konsep awal dan keputusan perbaikan
2. Visi, pilar, dan batas desain
3. Pemain, kebutuhan, dan asumsi
4. Scope vertical slice, MVP, dan v1
5. Dunia, narasi, dan peran Blippi
6. Core loop, ritme, dan sistem variasi
7. Pengalaman lima menit pertama
8. Kontrol dan aturan interaksi bersama
9. Spesifikasi 12 gameplay primitives
10. Katalog kendaraan dan attachment
11. Enam dunia dan katalog 30 misi
12. Empat misi yang dijabarkan penuh
13. Progresi, hadiah, dan replay
14. Eksperimen dan model simulasi
15. Screen specification dan navigasi
16. Aksesibilitas dan bantuan adaptif
17. Kerangka belajar dan lokalisasi
18. Art direction dan inventaris aset
19. Audio, animasi, VFX, dan haptics
20. Area orang tua, data, dan distribusi
21. Functional requirements
22. Arsitektur implementasi dan state machine
23. Model data dan contoh konfigurasi
24. Save, recovery, dan konsistensi progres
25. Performance dan compatibility
26. QA dan acceptance tests
27. Playtest dan kriteria keberhasilan
28. Rencana produksi dan backlog
29. Risiko dan keputusan terbuka
30. Handoff untuk AI coding dan tim produksi
31. Traceability perubahan dari konsep awal
32. Referensi dan batas klaim

---

## 1. Diagnosis konsep awal dan keputusan perbaikan

### 1.1 Kesimpulan evaluasi

Konsep awal kuat pada sensasi menggunakan alat, detail kendaraan, dan efek audiovisual. Kelemahan utamanya adalah **anak sering menjalankan urutan yang sudah ditentukan tanpa cukup kesempatan mengambil keputusan yang mengubah permainan**. Menambahkan partikel atau memperbanyak kendaraan belum tentu menyelesaikan masalah tersebut.

Alur menerima kendaraan → scan → repair → paint → stunt mudah terasa seperti antrean pekerjaan. Hadiah koin memberi angka yang bertambah, tetapi belum memberi alasan emosional mengapa kendaraan diperbaiki atau mengapa anak ingin kembali. Ketika stunt hanya menjadi hadiah setelah kerja bengkel, aktivitas yang paling dinantikan justru tertunda.

### 1.2 Audit dan respons desain

| Temuan pada konsep sumber | Dampak yang mungkin dirasakan anak | Keputusan desain v3 |
|---|---|---|
| Enam tahap selalu berurutan | “Aku harus mengerjakan hal yang sama lagi” | Gunakan beberapa struktur misi; masuk dari eksplorasi, konstruksi, eksperimen, atau bantuan |
| Repair menjadi gerbang wajib | Tidak segera memperoleh aktivitas favorit | Semua kendaraan siap dimainkan; hanya misi tertentu memiliki fault yang relevan |
| Banyak instruksi alat | Anak mengikuti demonstrasi tanpa membuat keputusan | Setiap misi memiliki minimal satu pilihan dengan akibat yang terlihat |
| Stunt tidak terkait repair | Rasa sebab-akibat lemah | Pilihan ban, attachment, jalur, atau ramp memengaruhi hasil uji |
| Semua hal berlangsung di bengkel | Dunia terasa seperti menu | Bengkel berada di hub yang tersambung ke diorama dan proyek kota |
| Hadiah utama berupa koin | Hasil abstrak; berpotensi mendorong grinding | Hadiah utama berupa jembatan, taman, wahana, kendaraan, dan penemuan yang dapat dimainkan |
| Unlock ditentukan hari kalender | Anak harus menunggu atau merasa tertinggal | Unlock ditentukan tindakan yang telah dilakukan; tidak ada streak |
| Gesture putaran dan presisi dominan | Hambatan motorik mengalahkan rasa ingin tahu | Tap/drag menjadi dasar; gesture kompleks selalu memiliki alternatif |
| Tiga mode scanner sejak awal | Beban pilihan tinggi | Satu mode sederhana; mode tambahan terbuka secara kontekstual |
| Hanya satu solusi “benar” | Percobaan terasa sebagai kesalahan | Beberapa solusi valid di misi terpilih; eksperimen menerima semua prediksi |
| Ada suara custom dari mikrofon | Menambah izin dan pengelolaan data tanpa memperkuat loop utama | Preset horn untuk v1; perekaman suara tidak masuk scope |
| Partikel metal sparks pada baut | Visual tidak sesuai operasi normal dan terlalu ramai | Gunakan gerakan ulir, klik, debu ringan, dan snap |
| Efek arc ketika mencolok kabel | Memberi asosiasi mekanis yang keliru | Konektor mainan, daya padam ketika memasang, indikator menyala setelah pengujian |
| Physics dan haptics sangat spesifik sebelum prototipe | Biaya tinggi tanpa bukti keseruan | Gunakan simulasi sederhana, profiling perangkat, dan semantic feedback |
| Tidak ada kriteria validasi “menarik” | Tim bisa menyelesaikan fitur tetapi gagal menciptakan keseruan | Fun gate dan observasi anak menjadi syarat ekspansi konten |

### 1.3 Perubahan yang paling penting

1. **Dari memperbaiki kendaraan menjadi melakukan sesuatu dengan kendaraan.** Excavator dipakai menemukan pipa, membentuk kanal, dan membangun taman.
2. **Dari arena terpisah menjadi dunia yang merespons.** Air yang dialirkan menghidupkan kincir; jembatan membuka lintasan baru.
3. **Dari dekorasi saja menjadi eksperimen yang bermakna.** Ban berbeda mengubah traksi; posisi beban mengubah keseimbangan.
4. **Dari hadiah acak menjadi pencapaian yang terlihat.** Setiap misi membawa perubahan dunia dan penemuan yang dapat dikunjungi kembali.
5. **Dari kuis yang memutus permainan menjadi pertanyaan yang dijawab melalui tindakan.** Anak memilih, mencoba, dan membandingkan hasil.

---

## 2. Visi, pilar, dan batas desain

### 2.1 Product vision

Menciptakan kotak mainan kendaraan digital yang mempunyai arah petualangan. Anak bebas bereksperimen tetapi selalu dapat menemukan tujuan sederhana. Permainan menggunakan rasa ingin tahu, eksplorasi, dan aktivitas sehari-hari sebagai fondasi yang sesuai dengan arah merek Blippi pada sumber resmi [R1]. Bentuk misi, kota, kendaraan modular, dan progresi di dokumen ini adalah desain baru yang diusulkan.

### 2.2 Pilar dan bukti implementasi

| Pilar | Aturan desain | Bukti dalam gameplay |
|---|---|---|
| Agency | Anak menentukan minimal satu keputusan penting per misi | Memilih jalur, urutan, attachment, bahan, atau konfigurasi |
| Tactile play | Respons langsung; bentuk dan gerakan mudah dipahami | Bucket mengangkat tanah; roda berputar; benda terkunci di tempat |
| Visible consequence | Hasil tindakan mengubah objek atau dunia | Kanal terisi; taman terbuka; lampu wahana menyala |
| Curiosity | Pertanyaan membuka percobaan, bukan ujian | “Apa yang berubah kalau ramp-nya lebih tinggi?” |
| Variety with familiarity | Kontrol familiar, tujuan dan keputusan berkembang | Drag dipakai menggali, mengangkat, dan membangun dengan aturan berbeda |
| Low-frustration mastery | Bantuan tidak mengambil alih terlalu cepat | Tunjuk → contoh satu langkah → bantu bersama |
| Healthy completion | Anak dapat selesai dan berhenti dengan puas | Snapshot perubahan kota, tombol selesai, checkpoint otomatis |

### 2.3 Non-goals

- Bukan simulator bengkel profesional, pelatihan electrical safety, atau simulasi hidraulik presisi.
- Bukan kumpulan lembar soal yang dibungkus tema kendaraan.
- Bukan open-world besar dengan navigasi bebas tanpa struktur.
- Tidak ada balapan wajib dengan lawan yang mempermalukan pemain.
- Tidak ada health bar, luka, orang terancam, kendaraan meledak, atau kehancuran permanen.
- Tidak ada energy system, gacha, loot box, leaderboard publik, chat, atau social feed.
- Tidak ada generative AI runtime yang berbicara bebas kepada anak.
- Tidak ada klaim meningkatkan IQ, mendiagnosis kemampuan, atau menggantikan pembelajaran sekolah.

### 2.4 Aturan kualitas yang mengalahkan jumlah fitur

**Jika vertical slice belum menyenangkan dengan tiga kendaraan dan tiga misi, jangan menambah 27 misi.** Perbaiki kontrol, tujuan, pilihan, dan payoff lebih dahulu. Pemotongan scope dilakukan pada jumlah dunia dan variasi visual; jangan menghilangkan save, aksesibilitas dasar, atau kesempatan anak mengambil keputusan.

---

## 3. Pemain, kebutuhan, dan asumsi

### 3.1 Kelompok pemain

| Kelompok | Kebutuhan | Respons produk |
|---|---|---|
| Anak 7–8 tahun, suka kendaraan | Bisa mengoperasikan alat dan membuat sesuatu | Vehicle capability yang berbeda, konstruksi, eksperimen |
| Anak dengan kemampuan membaca awal | Dapat memahami tujuan tanpa paragraf | VO bahasa Indonesia, ikon, demonstrasi singkat, objek tujuan |
| Anak yang lebih menyukai eksplorasi | Tidak dipaksa menuntaskan semua misi | Sandbox dan tempat bermain yang terbuka sejak awal |
| Anak yang menyukai tantangan | Ada kedalaman setelah memahami kontrol | Tantangan variasi dan perbandingan hasil, bukan kontrol lebih sulit |
| Orang tua | Sesi mudah dihentikan; data dan pembelian terkendali | Auto-save, area orang tua, tidak ada commerce dalam child flow |
| Saudara yang bergantian | Karya dan progres tidak saling menimpa | Tiga profil lokal berikon, tanpa nama asli wajib |

### 3.2 Asumsi yang digunakan

- Usia utama tetap mengikuti konsep lampiran, yaitu 7–8 tahun. Blippi sebagai tema tidak otomatis berarti semua mekanik harus sesederhana game balita.
- Bahasa Indonesia menjadi bahasa rilis pertama; struktur lokalisasi disiapkan untuk bahasa Inggris.
- Tablet adalah perangkat UX acuan; ponsel landscape tetap harus dapat dimainkan.
- Durasi satu misi normal ditargetkan 4–7 menit; tutorial awal 3–5 menit; finale 6–9 menit.
- Durasi tersebut adalah target pacing, bukan batas yang menghentikan anak.
- Satu sesi bisa hanya berisi satu misi atau bermain bebas. Tidak ada kewajiban menyelesaikan dunia dalam satu sesi.
- Orientasi portrait dan browser build tidak termasuk scope v1. Perubahan ke web memerlukan keputusan render, distribusi, dan performance tersendiri.
- Pengembangan awal untuk penggunaan keluarga/prototipe; keputusan publikasi komersial dicatat terpisah tanpa menghambat penyusunan konsep.

### 3.3 Jobs to be done

1. Ketika melihat kendaraan menarik, anak ingin segera mengendarai atau mengoperasikannya.
2. Ketika ada masalah kecil di dunia, anak ingin mengetahui apa yang terjadi dan mencoba membantu.
3. Ketika mencoba sesuatu, anak ingin melihat respons yang masuk akal dan lucu.
4. Ketika telah mahir, anak ingin mengubah caranya bermain, bukan hanya mengulang tugas lebih banyak.
5. Ketika kembali ke game, anak ingin menemukan karya dan progresnya masih ada.

---

## 4. Scope vertical slice, MVP, dan v1

### 4.1 Definisi fase

| Komponen | Vertical slice | MVP | V1 lengkap |
|---|---|---|---|
| Dunia | Area W01 terbatas + hub kecil | W01–W02 + hub | W01–W06 + hub |
| Misi authored | W01-M01, M02, M03 | 10 misi: 5 per dunia | 30 misi: 5 per dunia |
| Kendaraan | V01–V03 | V01–V06 | V01–V12 |
| Gameplay primitives | P01, P02, P04, P08, P09 | P01–P10 | P01–P12 |
| Bengkel | Tidak wajib; inspect sederhana | P03 repair dan P10 paint | Variasi fault dan attachment lengkap |
| Perubahan dunia | Tiga perubahan di W01 | Sepuluh perubahan authored | Tiga puluh perubahan authored |
| Sandbox | Area uji kecil | Hub dan dunia yang telah dibuka | Semua dunia terbuka sesuai progres |
| Eksperimen | Ramp sederhana dua kondisi | Ramp dan aliran air | Lima keluarga eksperimen |
| Profil | Satu slot teknis | Tiga profil lokal | Tiga profil lokal |
| Save/resume | Checkpoint dan penyelesaian | Migrasi schema, backup, recovery | Sama; perluasan data konten |
| Audio | Temp VO Indonesia | VO Indonesia final | VO Indonesia final; EN hanya bila dilokalkan penuh |
| Parent area | Pause dan reset dev | Gate, pengaturan, hapus profil | Sama + ringkasan penemuan |
| Track builder modular | Tidak | Tidak | P08 dengan set track W06 |
| Sequencing puzzle | Tidak | Tidak | P11 di W04–W06 |
| Stunt traversal khusus | Tidak | Tidak | P12 di W06 |
| Network runtime | Tidak dibutuhkan | Tidak dibutuhkan | Tidak dibutuhkan |

**Pembedaan penting:** Percobaan ramp P09 memakai peluncuran terkontrol dan bukan driving stunt P12. Paint P10 menggunakan swatch dasar pada MVP; pencampuran pigmen edukatif lengkap muncul di W06 pada v1.

### 4.2 Item di luar v1

Multiplayer, akun cloud, cross-device sync, user-generated content publik, voice recording, AR, VR, open-world streaming, deformasi kendaraan realistis, simulasi fluida fisik penuh, cuaca prosedural kompleks, konten berlangganan, dan dunia tak terbatas.

### 4.3 Batas untuk mencegah scope creep

- Maksimum 12 kendaraan dengan kemampuan yang jelas; varian warna tidak dihitung sebagai kendaraan baru.
- Maksimum 12 primitives; variasi misi harus memakai kombinasi sistem tersebut.
- Hanya satu kendaraan yang dikendalikan pada satu waktu.
- Kendaraan lain pada finale berjalan di jalur scripted atau spline; bukan AI lalu lintas umum.
- Satu diorama dimuat pada satu waktu bersama layanan global ringan.
- Tidak ada kewajiban membuat model internal penuh semua kendaraan; komponen diagnosis dibuat sebagai subset authored.

---

## 5. Dunia, narasi, dan peran Blippi

### 5.1 Premis

Sebuah kota penemuan sedang menyiapkan Festival Kendaraan. Beberapa tempat belum siap: taman belum tersambung jalan, kincir belum berputar, kebun belum mendapat air, pelabuhan belum memiliki rute pengiriman, dan laboratorium belum memiliki wahana. Anak bebas membantu area yang tersedia dan menyusun kotanya melalui misi.

Tujuan emosionalnya adalah **membuat tempat yang menyenangkan untuk semua orang**, bukan menyelamatkan orang dari ancaman. Masalah ringan dan ramah: jalur berlumpur, selang terlipat, barang tertukar, jembatan belum selesai, atau roda wahana belum tersambung.

### 5.2 Hub: Discovery Garage

Hub mempunyai lima lokasi interaktif yang langsung terlihat tanpa membaca menu panjang:

| Lokasi | Fungsi | Interaksi singkat |
|---|---|---|
| Peta meja | Pilih dunia dan misi | Tap diorama mini yang bergerak |
| Parkiran kendaraan | Memilih dan melihat kemampuan | Tap kendaraan, mainkan satu demonstrasi |
| Bengkel | Repair kontekstual dan eksperimen komponen | Perbesar komponen, uji sebelum/sesudah |
| Discovery Wall | Penemuan dan stiker | Tap gambar untuk memutar ulang hasil percobaan |
| Toy Yard | Bermain bebas sejak awal | Ramp rendah, pasir, kerucut, klakson |

Hub berubah melalui hasil misi: miniatur jembatan, air mancur, kebun, dan lampu parade muncul. Item tersebut punya animasi atau interaksi; bukan sekadar ikon koleksi.

### 5.3 Peran Blippi

- Rekan penjelajah dan pemandu rasa ingin tahu; anak tetap pengambil keputusan.
- Menunjukkan tujuan satu kali, lalu memberi ruang untuk mencoba.
- Mengajukan satu pertanyaan sederhana sebelum eksperimen.
- Menanggapi tindakan spesifik: “Jalur airnya tersambung. Sekarang kincirnya bergerak.”
- Tidak memuji setiap tap dan tidak menjawab pertanyaan sebelum anak sempat mencoba.
- Tidak menyampaikan dialog panjang di atas kontrol aktif.
- Tidak ada suara tiruan aktor yang menjadi kebutuhan sistem; produksi VO menggunakan jalur yang disetujui untuk proyek.
- Meekah dapat menjadi karakter pendamping tambahan pada fase berikutnya; tidak dibutuhkan untuk menyelesaikan v1.

### 5.4 Karakter pendukung dan visual keluarga

NPC berupa operator dewasa, warga, dan hewan latar dengan kebutuhan sederhana. Tidak perlu nama atau backstory panjang. NPC perempuan lokal pada desain original menggunakan hijab dengan pakaian kerja yang sesuai; representasi karakter bermerek mengikuti referensi yang telah disetujui. Tidak ada anak berdiri di area lintasan kendaraan aktif. Karakter manusia memakai area aman yang dibatasi secara visual.

### 5.5 Struktur narasi per dunia

1. Kedatangan: anak melihat kondisi awal dan satu tujuan besar.
2. Misi awal: satu kemampuan baru segera bisa dicoba.
3. Misi tengah: anak mulai memilih cara menyelesaikan tugas.
4. Eksperimen: anak mengubah satu variabel dan membandingkan hasil.
5. Finale: kemampuan digabung, perubahan dunia digunakan dalam acara kecil.

---

## 6. Core loop, ritme, dan sistem variasi

### 6.1 Tiga loop permainan

| Skala | Loop | Contoh |
|---|---|---|
| 5–15 detik | Lihat → lakukan → respons → sesuaikan | Geser bucket, tanah terangkat, pilih tempat menuang |
| 4–7 menit | Temukan tujuan → pilih cara → lakukan → lihat akibat → coba/selesai | Pilih dump truck, antar bahan, pasang jalan, berkendara di jalan baru |
| Beberapa sesi | Buka area → bangun fasilitas → gabungkan kemampuan → mainkan hasil | Membangun kanal lalu memakai air untuk taman dan parade |

### 6.2 Lima bentuk misi

| Template | Urutan dasar | Repair wajib? | Contoh |
|---|---|---|---|
| Explore & Discover | Menjelajah → menemukan petunjuk → mencoba → membuka penemuan | Tidak | Mencari jalur air tertutup |
| Build & Use | Pilih bahan → konstruksi → gunakan hasil | Tidak | Membuat jembatan untuk dump truck |
| Help & Deliver | Pahami kebutuhan → pilih kendaraan/jalur → antar → hasil | Kadang | Menarik gerobak dari lumpur |
| Predict & Test | Prediksi → uji A → ubah satu hal → uji B → bandingkan | Tidak | Ban licin dan ban berpola di lumpur |
| Fix & Transform | Amati gejala → repair singkat → uji dalam misi nyata | Ya, maksimal satu fault utama | Memulihkan pompa wahana air |

### 6.3 Aturan variasi authored

- Tidak boleh ada tiga misi berturut-turut dengan template utama yang sama pada jalur rekomendasi.
- Tidak boleh ada lebih dari dua misi dengan primitive dominan yang sama secara berurutan.
- Repair wajib dibatasi pada maksimum 6 dari 30 misi utama.
- Setelah anak mempelajari repair tertentu, pengulangannya maksimal dua langkah sebelum kembali ke aktivitas utama.
- Setiap misi memiliki satu perubahan dunia yang dapat ditunjuk secara konkret.
- Setiap misi normal memiliki satu keputusan bermakna; finale minimal dua.
- Mengganti warna saja tidak dihitung sebagai variasi gameplay.
- Variasi replay mengubah jalur, susunan, bahan, atau kendala; tidak hanya lokasi stiker.
- Satu misi mengenalkan paling banyak satu aturan interaksi baru. Pengecualian terbatas adalah FTUE W01-M01: gerak P01 diperkenalkan dahulu pada jalur tanpa hambatan, lalu placement P08 setelah kendaraan berhenti. Kedua kontrol tidak diajarkan bersamaan. Di luar FTUE, mekanik kedua yang baru diajarkan pada misi lain.

### 6.4 Ritme yang ditargetkan

| Momen | Target awal | Ketentuan |
|---|---|---|
| Aksi pertama setelah masuk gameplay | ≤10 detik | Tidak termasuk proses cold boot |
| Penjelasan tujuan | 4–8 detik | Satu kalimat dan satu objek visual |
| Respons tombol/drag | Tampak pada frame berikutnya jika memungkinkan | Verifikasi latency pada perangkat |
| Satu tugas kecil | 15–45 detik | Lebih panjang hanya bila anak sedang bereksperimen sukarela |
| Perubahan tujuan atau konteks | Sekitar 45–90 detik | Jangan memotong eksplorasi yang disengaja |
| Perayaan penyelesaian | 3–6 detik | Dapat dilewati; reward sudah tercatat |
| Kembali bermain setelah retry | ≤3 detik pada scene aktif | Reset lokal, tidak loading ulang seluruh dunia |

### 6.5 Director rekomendasi, bukan generator level bebas

Director hanya memilih dari misi dan variasi yang telah diauthor serta diuji. Ia tidak membuat teka-teki atau cerita bebas saat runtime.

Urutan seleksi:

1. Ambil misi yang prerequisite-nya terpenuhi dan asetnya tersedia.
2. Prioritaskan misi baru yang melanjutkan proyek dunia.
3. Kurangi rekomendasi yang primitive dominannya sama dengan dua misi terakhir.
4. Sisipkan opsi yang memakai kendaraan favorit anak, berdasarkan hitungan lokal.
5. Tampilkan maksimal dua rekomendasi utama dan tombol bermain bebas.
6. Pemain tetap boleh memilih misi lama; aturan variasi tidak melarang pilihan anak.

Jika tidak ada kandidat yang memenuhi semua aturan variasi, longgarkan penalti pengulangan; jangan pernah memblokir progres karena director tidak menemukan misi “ideal”.

---

## 7. Pengalaman lima menit pertama

### 7.1 First-time user experience

Misi pertama adalah W01-M01. Anak langsung mengendalikan V01 Explorer Buggy untuk mengantar kotak mainan melewati jalan yang perlu disambung. Tidak ada layar login, pilihan kualitas grafis, atau daftar tutorial.

| Waktu acuan | Yang terlihat | Yang dilakukan anak | Sistem yang diajarkan |
|---|---|---|---|
| 0:00–0:15 | Buggy, tujuan berupa bendera, jalur pendek | Tap tujuan atau tahan tombol maju | Kontrol dasar |
| 0:15–0:35 | Dua sisi jalan, satu lebih melengkung | Pilih rute | Pilihan mempunyai akibat |
| 0:35–1:10 | Celah jalan rendah dengan dua pilihan papan lebar | Drag papan ke slot | P08 build dan snap |
| 1:10–1:35 | Buggy berhenti sebelum papan | Tekan jalan; roda melewati karya sendiri | Build → use |
| 1:35–2:10 | Kotak diangkut ke taman | Tap bongkar di titik tujuan | Tujuan sederhana |
| 2:10–2:40 | Kotak menjadi mainan taman | Coba mainan; Blippi memberi komentar singkat | Payoff interaktif |
| 2:40–3:20 | Pilihan “coba jalur lain” atau “lanjut” | Memilih sendiri | Replay tanpa paksaan |
| 3:20–4:10 | Parkiran menampilkan excavator | Tekan bucket, tanah mainan bergerak | Teaser kemampuan berikutnya |
| 4:10–5:00 | Peta W01, Toy Yard, ikon selesai | Pilih misi berikutnya, bermain, atau berhenti | Kendali sesi |

Durasi tidak dipaksakan. Anak yang lebih cepat boleh lanjut; anak yang lebih lambat mendapat waktu dan bantuan. Parent gate hanya muncul jika pengguna membuka area orang tua.

### 7.2 Kriteria keberhasilan FTUE

- Anak dapat memulai tanpa membaca paragraf atau meminta orang dewasa menjelaskan tombol utama.
- Anak melakukan pilihan jalur dan memasang setidaknya satu objek sendiri.
- Anak dapat mengenali hasilnya: “Jalan itu aku yang buat.”
- Tidak perlu masuk bengkel atau mengecat kendaraan sebelum payoff pertama.
- Keluar di tengah FTUE kembali ke checkpoint yang dapat dipahami, bukan mengulang intro.

---

## 8. Kontrol dan aturan interaksi bersama

### 8.1 Mode kontrol

| Konteks | Kontrol default | Alternatif aksesibilitas | Kamera |
|---|---|---|---|
| Eksplorasi dan perjalanan | Tap waypoint / hold maju; belok di junction melalui pilihan besar | Tap tujuan untuk berkendara terbantu | Chase camera rendah, yaw terbatas |
| Area bebas kendaraan | Tombol kiri/kanan dan maju; rem otomatis saat dilepas | Tap-to-drive pada area valid | Chase camera lembut |
| Excavator/crane | Drag target; kendaraan menyelesaikan gerak joint | Tap objek lalu tap tujuan | Kamera kerja tetap |
| Repair | Drag bagian ke socket; tap konfirmasi | Tap-select → tap-target | Close-up dengan rotasi terbatas |
| Build | Drag bagian; snap preview | Pilih bagian → tap slot | Isometric/orthographic |
| Experiment | Pilih satu setting, tekan uji | Sama; tidak memerlukan reaksi cepat | Side-on atau overview |
| Paint | Pilih swatch dan tap panel / sapuan | Tap-fill | Orbit terkendali |
| Sequencing | Drag kartu arah/aksi lalu tekan mulai | Tap kartu untuk menambah urutan | Top-down |

### 8.2 Input contract

- Satu gesture utama aktif pada satu waktu. Jari kedua tidak membatalkan tindakan pertama.
- UI memiliki prioritas terhadap raycast world; drag dari dock tidak diteruskan ke steering.
- Pointer capture dimiliki objek sampai release/cancel.
- Kehilangan fokus aplikasi membatalkan hold secara aman dan mengaktifkan pause.
- Drag yang dibatalkan mengembalikan benda ke posisi aman; tidak menghilangkan benda.
- Release di luar layar tidak boleh menyebabkan throttle, pump, atau paint terus aktif.
- Double tap cepat tidak menggandakan transaksi, objek, atau reward.
- Tidak ada pinch, tilt device, atau gerakan dua tangan sebagai syarat menyelesaikan misi.

### 8.3 Ukuran dan toleransi

Ukuran dinyatakan sebagai target desain dalam logical unit UI, bukan satuan fisik yang dijamin seragam antardevice. Tim wajib mengonversi berdasarkan canvas scale dan memeriksa perangkat nyata.

| Elemen | Target |
|---|---|
| Tombol aksi utama | Setara sekitar 64–80 dp, diperbesar pada tablet bila layout memungkinkan |
| Tombol sekunder | Minimal 48 dp; ikon terlihat jelas |
| Jarak antaraksi penting | Sekitar 12 dp atau lebih |
| Objek kecil yang bisa disentuh | Hit proxy diperbesar sampai minimum target, tanpa mengubah model |
| Slot drag | Snap radius awal 0,35–0,6 kali lebar objek pada layar |
| Drag slop | Sekitar 8–12 dp sebelum dianggap bergerak |
| Tombol Back/Pause | Selalu di safe area; tidak berhimpitan dengan kontrol berkendara |

Toleransi dikonfigurasi per primitive. Jangan menggunakan satu nilai pixel mentah untuk semua resolusi.

### 8.4 Camera rules

- Tidak ada kamera yang terus berputar otomatis ketika anak sedang drag.
- Pergantian kamera dipicu konteks dan memakai transisi pendek sekitar 0,3–0,6 detik.
- Input ditahan hanya selama transisi yang benar-benar mengubah hit mapping; indikator tetap terlihat.
- Tidak memakai motion blur untuk gameplay inti. Camera shake default sangat rendah dan dapat dimatikan.
- FOV tidak melonjak sebagai feedback turbo. Sensasi laju memakai animasi lingkungan dan audio.
- Tabrakan tidak melempar kamera atau menyembunyikan kendaraan.

---

## 9. Spesifikasi 12 gameplay primitives

Primitives adalah unit interaksi yang dapat dipakai kembali. Satu primitive harus mempunyai state awal, input, aturan validasi, feedback, recovery, dan output event yang jelas. Variasi tema tidak membuat primitive baru.

### P01 — Drive & Explore

**Fantasi:** “Aku mengendalikan kendaraan dan memilih tujuan.”

- **Input:** hold maju / tap waypoint; pilih belokan; rem otomatis ketika release.
- **State:** Parked → Driving → AtJunction/AtWorksite → Parked; tambahan Recovering.
- **Aturan:** rute inti lebar, tepi lunak, objek tujuan dapat didekati dari lebih dari satu sudut.
- **Pilihan bermakna:** jalur pendek dengan lumpur atau jalur lebih panjang yang kering; observasi penanda sebelum memilih.
- **Keberhasilan:** masuk trigger tujuan dengan kecepatan di bawah batas docking yang dituning; sistem membantu berhenti.
- **Recovery:** kendaraan yang stuck ditawari ikon kembali ke titik aman; rollover pulih otomatis setelah sekitar 1,5 detik.
- **Variasi:** muatan berbeda, persimpangan, permukaan, titik penemuan opsional.
- **Batas:** tidak kehilangan muatan permanen; kendaraan tidak memerlukan bahan bakar berbayar.
- **Event:** `waypoint_reached`, `route_chosen`, `vehicle_recovered`.
- **Acceptance:** rute wajib dapat diselesaikan dengan mode tap-to-drive; tabrakan tidak menyebabkan softlock.

### P02 — Observe & Diagnose

**Fantasi:** “Aku menemukan penyebab sesuatu belum bekerja.”

- **Input:** tap gejala; drag kaca pembesar/scanner; pilih satu petunjuk.
- **State:** SymptomShown → Inspecting → EvidenceFound → CauseSelected → ReadyToAct.
- **Aturan:** satu fault pada misi awal, maksimal dua pada variasi lanjut. Gejala harus terkait solusi.
- **Contoh valid:** selang terlipat membuat aliran terhenti; roda longgar bergoyang; slot konektor kosong membuat lampu tidak menyala.
- **Pilihan:** anak menentukan lokasi yang diperiksa lebih dahulu, bukan hanya menyapu seluruh model sampai warna berubah.
- **Feedback:** bagian yang sehat bergerak normal; bagian bermasalah punya animasi sebab-akibat, ikon bentuk, dan bunyi lembut.
- **Recovery:** setelah beberapa percobaan tidak produktif, tampilkan petunjuk arah; jangan langsung membuka seluruh jawaban.
- **Variasi:** mechanical, water path, toy circuit, airflow sederhana. Mode tambahan muncul hanya jika misi memerlukannya.
- **Event:** `evidence_found`, `cause_selected`, `inspection_hint_used`.
- **Acceptance:** anak bisa membedakan gejala dan penyebab dari animasi; fault tidak bergantung pada warna merah saja.

### P03 — Repair & Assemble

**Fantasi:** “Bagian yang kupasang membuat kendaraan bekerja lagi.”

- **Input:** tap alat; drag part ke socket; tahan untuk fastener; gesture putar bersifat opsional.
- **State:** Prepared → PartRemoved → PartPlaced → Secured → TestReady → Verified.
- **Aturan:** kendaraan berhenti dan mode kerja aktif; repair listrik memakai konektor mainan tanpa arc.
- **Pilihan:** pilih part yang cocok dari maksimal tiga kandidat dengan bentuk/fungsi yang berbeda.
- **Feedback:** socket memberi preview bentuk; koneksi valid memberi snap. Setelah verifikasi, gejala awal berubah nyata.
- **Durasi:** repair pertama sekitar 45–75 detik; repair familiar sekitar 20–40 detik.
- **Recovery:** part salah kembali ke tray; feedback menjelaskan ketidakcocokan bentuk, tanpa buzzer hukuman.
- **Variasi:** ban, pin bucket, hose coupler, gear mainan, terminal bentuk.
- **Batas:** jangan meminta melepas delapan baut identik; maksimal tiga titik tindakan per fault.
- **Event:** `part_fitted`, `repair_tested`, `repair_verified`.
- **Acceptance:** test tidak boleh sukses bila part belum terpasang; bantuan boleh menyelesaikan pengencangan setelah anak memilih part.

### P04 — Dig, Scoop & Load

**Fantasi:** “Aku mengubah tanah dan memindahkan bahan.”

- **Input:** drag area scoop, drag/tap lokasi buang; joystick multi-axis tidak wajib.
- **State:** Ready → Scooping → Carrying → Dumping → Ready.
- **Aturan:** tanah menggunakan patch/chunk authored; bukan simulasi voxel tak terbatas.
- **Pilihan:** lokasi menggali menentukan jalur kanal atau benda yang ditemukan; memilih tumpukan yang benar memengaruhi bahan muatan.
- **Feedback:** volume patch berkurang, bucket terlihat terisi, jejak perubahan bertahan selama misi.
- **Kuantitas:** token bucket 1–5 untuk tujuan awal; objek fisik dekoratif tidak menentukan hitungan resmi.
- **Recovery:** tanah terbuang salah dapat disendok ulang atau dikembalikan melalui tombol undo lokal.
- **Variasi:** pasir, kerikil, tanah kebun, bongkahan spons pada fantasy lab.
- **Event:** `material_scooped`, `load_delivered`, `dig_patch_changed`.
- **Acceptance:** jumlah bahan pada sumber + bucket + tujuan tetap konsisten; animasi tidak menggandakan muatan.

### P05 — Lift, Balance & Place

**Fantasi:** “Aku mengangkat dan memasang benda besar dengan tepat.”

- **Input:** pilih beban, drag hook ke target, tap untuk memasang.
- **State:** HookReady → Attached → Lifting → Moving → Aligning → Released.
- **Aturan:** stabilizer crane terbuka otomatis sebagai bagian mode kerja; suspended load tidak berada di atas karakter.
- **Pilihan:** urutan menempatkan blok, posisi muatan, atau panjang beam.
- **Feedback:** beban bergoyang sedikit, garis bayangan membantu memperkirakan posisi, snap preview memakai bentuk.
- **Recovery:** beban yang dilepas terlalu jauh turun pelan ke zona aman; tombol tarik kembali tersedia.
- **Variasi:** balok jembatan, peti pelabuhan, komponen wahana.
- **Event:** `load_attached`, `load_placed`, `balance_state_changed`.
- **Acceptance:** objek tidak menembus tanah atau menghilang; posisi valid ditentukan socket, bukan ketelitian pixel.

### P06 — Route Water & Pump

**Fantasi:** “Aku membuat air mencapai tempat yang membutuhkan.”

- **Input:** pilih sambungan, drag hose, tap valve, tahan pump atau gunakan toggle assist.
- **State:** Empty → Connected → Flowing → TargetReached; cabang Blocked/LeakingToyJoint.
- **Aturan:** sistem merupakan graph aliran diskrit. Air tidak menembus valve tertutup atau sambungan putus.
- **Pilihan:** memilih cabang, urutan mengisi wadah, atau jalur paling langsung.
- **Feedback:** pulsa biru dan animasi air bergerak sepanjang jalur valid; water wheel berputar proporsional terhadap flow level.
- **Target isi:** zona hijau lebar, biasanya 60–80% untuk wadah percobaan; auto-stop assist mencegah tugas berubah menjadi uji refleks.
- **Recovery:** kelebihan isi mengalir kembali ke reservoir mainan; tidak ada banjir berbahaya.
- **Variasi:** menyiram kebun, menggerakkan kincir, membersihkan target spons, mengisi bak.
- **Event:** `flow_path_connected`, `valve_changed`, `reservoir_band_reached`.
- **Acceptance:** graph terputus tidak menghasilkan aliran; optional spray dapat dimainkan tanpa target waktu.

### P07 — Sort, Count & Deliver

**Fantasi:** “Aku mengatur barang agar sampai ke tempat yang tepat.”

- **Input:** drag objek ke keranjang; tap urutan pengiriman; pilih jumlah dari benda konkret.
- **State:** Presented → Selected → Classified → Loaded → Delivered.
- **Aturan:** maksimal tiga kategori terlihat; klasifikasi menggunakan gambar, bentuk, dan label suara.
- **Pilihan:** menentukan kategori, jumlah, dan cara pembagian muatan.
- **Feedback:** kelompok membentuk susunan yang dapat dihitung; setiap objek yang terkirim mengurangi kebutuhan visual.
- **Recovery:** kategori salah menghasilkan animasi petunjuk, objek tetap dapat dipindah; tidak menghapus progres lain.
- **Variasi:** bahan bangunan, sampah bersih mainan, hasil kebun, paket simbol.
- **Adapter collection:** Street Sweeper memakai P01 untuk mengemudi dan evaluator P07 untuk mengumpulkan token daun pada patch jalur. Coverage berasal dari patch yang telah dibersihkan, bukan mewajibkan setiap pixel tersapu. Adapter ini memakai gesture drive yang sudah dikenal dan tidak menambah primitive ke-13.
- **Batas:** jangan mengasumsikan warna tong universal; ikon jenis material menjadi acuan utama.
- **Event:** `item_classified`, `quantity_selected`, `delivery_completed`.
- **Acceptance:** objek dihitung satu kali; voice count tidak saling bertumpuk ketika drag cepat.

### P08 — Build & Connect

**Fantasi:** “Aku membuat sesuatu yang bisa digunakan.”

- **Input:** drag part, rotate 90° melalui tombol, tap test; tap-select alternatif.
- **State:** Planning → Previewing → Placed → Validating → Usable.
- **Aturan:** struktur memakai socket, adjacency, dan support tags yang eksplisit.
- **Pilihan:** panjang papan, bentuk rute, lokasi penyangga, atau susunan wahana.
- **Feedback:** preview tembus pandang; struktur yang belum lengkap menampilkan celah relevan saja.
- **Recovery:** undo satu langkah; reset hanya area konstruksi yang aktif.
- **Variasi:** jalan, jembatan, kanal modular, rel pendek, track playground.
- **Batas:** structural validation bersifat aturan permainan, bukan analisis struktur engineering.
- **Event:** `build_part_placed`, `structure_validated`, `structure_used`.
- **Acceptance:** bangunan yang dinyatakan valid benar-benar dapat dilalui controller; kamera menunjukkan hasil penggunaan.

### P09 — Predict, Test & Compare

**Fantasi:** “Aku punya dugaan dan bisa mengeceknya.”

- **Input:** pilih salah satu prediksi visual; ubah satu parameter; tekan test; lihat A/B.
- **State:** Question → PredictionOptional → TrialA → OneChange → TrialB → Compare → FreeExperiment.
- **Aturan:** prediksi boleh dilewati; keberhasilan berasal dari mencoba dan membandingkan, bukan menebak jawaban benar.
- **Pilihan:** parameter eksperimen dan prediksi; pengamatan setelah hasil keluar.
- **Feedback:** ghost marker jarak, indikator aliran, jejak roda, atau timbangan sebelum/sesudah.
- **Recovery:** reset trial cepat; pertahankan konfigurasi dan hasil sebelumnya.
- **Variasi:** ramp, traksi, distribusi muatan, jalur air, campuran warna.
- **Batas:** satu variabel bebas pada guided trial. Sandbox boleh mengubah beberapa variabel dengan label “percobaan bebas”.
- **Event:** `prediction_selected`, `trial_completed`, `comparison_viewed`.
- **Acceptance:** hasil yang ditampilkan berasal dari model trial yang sama; tidak memainkan hasil menang yang telah dipilih tanpa hubungan ke konfigurasi.

### P10 — Paint, Mix & Personalize

**Fantasi:** “Ini kendaraan buatanku.”

- **Input:** pilih swatch, tap panel, drag stiker pada socket, pilih horn preset.
- **State:** Selecting → Preview → Applied → Saved; campuran warna menambahkan Mixing.
- **Aturan:** tersedia undo dan reset per panel; paint tidak memengaruhi kemampuan kendaraan.
- **Pilihan:** warna, pola, lokasi stiker, dan horn. Attachment fungsional dipilih pada menu terpisah.
- **Feedback:** panel benar-benar berubah; perubahan terlihat di misi dan thumbnail setelah tersimpan.
- **Mixing:** preset pigmen authored; tidak memakai rata-rata RGB sebagai klaim simulasi cat.
- **Recovery:** keluar tanpa menyimpan menawarkan pertahankan preview atau kembali; autosave hasil yang telah dikonfirmasi.
- **Event:** `appearance_applied`, `mixture_created`, `horn_selected`.
- **Acceptance:** konfigurasi bertahan setelah restart dan tidak menimpa profil saudara.

### P11 — Plan a Sequence

**Fantasi:** “Aku bisa merencanakan langkah sebelum kendaraan berjalan.”

- **Input:** susun kartu maju, belok, ambil, atau taruh; tekan jalankan.
- **State:** Plan → Simulate → StepFeedback → Revise → Complete.
- **Aturan:** awal 3 kartu, lanjut maksimal 6; tiap kartu diputar ulang dengan highlight.
- **Pilihan:** urutan dan rute; lebih dari satu program valid bila map memungkinkan.
- **Feedback:** kendaraan mainan bergerak satu langkah per kartu, error menunjukkan langkah yang perlu diubah.
- **Recovery:** berhenti pada tepi aman dan izinkan edit dari langkah tersebut atau ulang seluruh urutan.
- **Variasi:** kebun grid, pelabuhan, urutan parade.
- **Event:** `sequence_run`, `sequence_step_blocked`, `sequence_revised`.
- **Acceptance:** tidak menyebut anak gagal; perubahan satu kartu harus mengubah perilaku yang terkait secara konsisten.

### P12 — Playground Stunt & Terrain

**Fantasi:** “Aku menguji kendaraan di lintasan buatanku.”

- **Input:** maju, steering terbantu, pilih ramp; boost opsional dengan cooldown pendek yang terlihat.
- **State:** Ready → Traversing → Airborne → Landing → Recovering/Continuing.
- **Aturan:** lintasan rendah pada default; loop besar tidak menjadi syarat progres.
- **Pilihan:** jalur, ban, tinggi ramp, dan urutan track.
- **Feedback:** suspensi, debu, nada ramp, jejak landing; hasil jarak personal tidak menjadi ranking publik.
- **Recovery:** auto-right, checkpoint dekat, muatan percobaan di-reset tanpa kehilangan hadiah.
- **Variasi:** lantai kayu, pasir, lumpur mainan, ramp musik, jembatan lentur.
- **Batas:** tidak memberi hadiah lebih besar untuk tabrakan; tidak ada damage atau biaya repair setelah setiap run.
- **Event:** `playground_run_started`, `landing_recorded`, `track_replayed`.
- **Acceptance:** setiap modul mempunyai jalan keluar; kendaraan tidak terjebak di sambungan track custom.

---

## 10. Katalog kendaraan dan attachment

### 10.1 Dua belas kendaraan inti

Nama dan bentuk di bawah adalah rancangan game, bukan daftar kendaraan resmi Blippi.

| ID | Kendaraan | Kemampuan utama | Perbedaan cara bermain | Pertama dipinjamkan | Unlock kepemilikan |
|---|---|---|---|---|---|
| V01 | Explorer Buggy | Drive, observasi | Lincah, punya scanner sederhana | W01-M01 | Tersedia sejak awal |
| V02 | Excavator | Dig/scoop | Bucket dan area gali | W01-M02 | Selesai W01-M02 |
| V03 | Dump Truck | Angkut/tumpah | Muatan dan pilihan jalur | W01-M03 | Selesai W01-M03 |
| V04 | Mobile Crane | Lift/place | Hook, stabilizer, slot konstruksi | W01-M04 | Selesai W01-M04 |
| V05 | Water/Fire Truck | Pompa dan semprot | Water path dan reservoir | W02-M01 | Selesai W02-M01 |
| V06 | Tow Truck | Tarik objek | Pilih anchor dan jalur penarikan | W02-M03 | Selesai W02-M03 |
| V07 | Recycling Truck | Sort/collect | Slot material dan rute pengumpulan | W03-M01 | Selesai W03-M01 |
| V08 | Street Sweeper | Bersihkan jalur | Lebar sapuan dan route coverage | W03-M02 | Selesai W03-M02 |
| V09 | Farm Tractor | Angkut/menanam | Lajur kebun dan trailer | W04-M01 | Selesai W04-M01 |
| V10 | Forklift | Angkat muatan rendah | Urutan muat dan keseimbangan | W04-M03 | Selesai W04-M03 |
| V11 | Harbor Ferry | Angkut di air | Titik docking dan posisi muatan | W05-M01 | Selesai W05-M01 |
| V12 | Monster Test Truck | Terrain/stunt | Suspensi, ban, ramp | W06-M01 | Selesai W06-M01 |

**Loaner rule:** Kendaraan yang diperlukan misi selalu disediakan pada misi pengenalan walaupun belum dimiliki. Unlock memberikan akses bebas, bukan kemampuan menyelesaikan misi yang sudah tersedia. Ini mencegah dependency circular.

### 10.2 Capability tags

Gunakan tag seperti `drive_land`, `dig`, `carry_bulk`, `lift_hook`, `pump_water`, `tow`, `sort_material`, `sweep`, `farm`, `lift_fork`, `float`, dan `stunt`. Misi menyatakan capability yang wajib; tampilan pilihan hanya menunjukkan kendaraan kompatibel atau menawarkan kendaraan pinjaman.

Tidak semua kendaraan boleh dipasang semua attachment. Ferry tidak mendapat bucket excavator hanya karena sistem modular tersedia. Kombinasi fantasi berada di Toy Lab dan diberi penanda permainan imajinasi.

### 10.3 Modul fungsional v1

| ID | Modul | Kompatibilitas | Efek yang dapat diuji |
|---|---|---|---|
| A01 | Ban jalan | V01, V03, V06, V12 | Melaju halus di lintasan keras |
| A02 | Ban berpola | V01, V03, V06, V12 | Lebih sedikit slip pada lumpur dalam model game |
| A03 | Bucket sempit | V02 | Kanal kecil, kapasitas lebih rendah |
| A04 | Bucket lebar | V02 | Scoop lebih besar, butuh area kerja lebih lebar |
| A05 | Bak pendek | V03 | Capacity token rendah, belok mudah |
| A06 | Bak panjang | V03 | Capacity lebih besar, docking membutuhkan ruang lebih panjang |
| A07 | Hook tunggal | V04 | Mengangkat objek bersocket hook |
| A08 | Spreader mainan | V04 | Mengangkat peti dua titik tanpa mengajarkan rigging nyata |
| A09 | Nozzle sempit | V05 | Semprotan fokus |
| A10 | Nozzle lebar | V05 | Area sapuan lebih besar |
| A11 | Trailer kebun | V09 | Mengangkut hasil panen |
| A12 | Suspensi lembut mainan | V12 | Animasi/body response berbeda pada ramp |

Modul yang dibutuhkan tujuan misi dipinjamkan seperti kendaraan. Tidak ada power upgrade yang harus dibeli untuk maju. Enam dekorasi lucu dunia—misalnya bendera, sirip dinosaurus mainan, pinwheel, dan pita—tidak memiliki keuntungan performa.

### 10.4 Vehicle state presentation

Setiap kendaraan memerlukan state visual: idle, move, brake, work, carrying, success, recover, dan inspect. State repair hanya dibuat untuk fault yang benar-benar dipakai konten. Dilarang membuat seluruh kendaraan terlihat rusak setelah stunt biasa.

---

## 11. Enam dunia dan katalog 30 misi

### 11.1 Identitas dunia

| Dunia | Nama | Tujuan besar | Aktivitas dominan | Perubahan akhir |
|---|---|---|---|---|
| W01 | Kota Roda | Membuka taman konstruksi | Drive, dig, build, lift | Jembatan dan playground dapat digunakan |
| W02 | Taman Air | Menghidupkan water garden | Diagnose, pump, tow, experiment | Kanal, kincir, dan air mancur bekerja |
| W03 | Eco Park | Mengubah area berantakan menjadi taman | Sort, sweep, build | Jalur bersih dan taman daur ulang interaktif |
| W04 | Kebun Ceria | Menyiapkan hasil kebun untuk piknik | Farm, count, sequence, deliver | Kebun tumbuh dan meja piknik siap |
| W05 | Pelabuhan Penjelajah | Menghubungkan pulau kecil | Ferry, crane, balance, route | Ferry, dermaga, dan pengiriman berfungsi |
| W06 | Wonder Lab & Festival | Membuat wahana dan parade | Experiment, mix, track, stunt | Festival yang memamerkan hasil karya anak |

Setiap dunia punya lima misi. M05 adalah finale dunia dan sudah termasuk total 30 misi; tidak ada enam finale tambahan yang tersembunyi dalam perhitungan.

### 11.2 Katalog W01 — Kota Roda

| Misi | Template / primitives | Tujuan dan pilihan | Hasil dunia / reward | Replay yang mengubah permainan |
|---|---|---|---|---|
| W01-M01 Jalan Pertamaku | Build & Use; P01/P08 | Sambung celah jalan dengan papan; pilih jalur kiri atau kanan | Jalur taman pertama + stiker buggy | Pindahkan titik tujuan; bandingkan dua jalur |
| W01-M02 Harta di Bawah Pasir | Explore & Discover; P02/P04 | Temukan komponen taman melalui petunjuk bentuk; pilih petak gali | Kotak pasir interaktif + V02 | Susunan petunjuk dan lokasi komponen berbeda |
| W01-M03 Bukit dan Muatan | Predict & Test; P01/P09 | Uji ramp rendah/tinggi pada rig terkontrol, lalu antar muatan | Ramp percobaan + V03 | Ubah satu setting; simpan dua penanda jarak |
| W01-M04 Jembatan untuk Semua | Build & Use; P05/P08 | Pilih panjang beam dan tempatkan tiga komponen | Jembatan akses + V04 | Bentuk sambungan kedua dengan socket berbeda |
| W01-M05 Hari Pembukaan Taman | Finale; P01/P04/P05/P08 | Pilih urutan menyiapkan pasir, memasang gerbang, dan mengantar mainan | Playground aktif + badge W01 | Tata letak dekorasi dan urutan kendaraan berbeda |

### 11.3 Katalog W02 — Taman Air

| Misi | Template / primitives | Tujuan dan pilihan | Hasil dunia / reward | Replay yang mengubah permainan |
|---|---|---|---|---|
| W02-M01 Kincir yang Menunggu | Help & Deliver; P06 | Hubungkan sumber ke kincir; pilih cabang selang | Kincir aktif + V05 | Cabang reservoir dipindah |
| W02-M02 Ke Mana Airnya Pergi? | Fix & Transform; P02/P03/P06 | Temukan hose coupler terlepas, pilih sambungan, uji aliran | Kolam percobaan + stiker sambungan | Fault pindah ke selang terlipat, memakai aksi yang sudah diajarkan |
| W02-M03 Gerobak di Lumpur | Help & Deliver; P01/P03/P09 | Pasang hook mainan, pilih ban/jalur, tarik gerobak kosong | Jalur water garden terbuka + V06 | Bandingkan traksi dua ban dengan muatan sama |
| W02-M04 Dua Jalan untuk Air | Predict & Test; P06/P09 | Uji satu jalur tertutup dan satu tersambung; arahkan dua wadah | Kanal bercabang + stiker aliran | Ubah satu valve dan prediksi kincir mana yang bergerak |
| W02-M05 Parade Air Ceria | Finale; P01/P06/P08 | Rangkai sambungan akhir, isi tangki, pilih pola pancuran | Air mancur dapat dimainkan + badge W02 | Pilih urutan pancuran berbeda |

### 11.4 Katalog W03 — Eco Park

| Misi | Template / primitives | Tujuan dan pilihan | Hasil dunia / reward | Replay yang mengubah permainan |
|---|---|---|---|---|
| W03-M01 Muatan Campur-Campur | Help & Deliver; P01/P07 | Pilah benda mainan berdasarkan material; tentukan urutan pickup | Stasiun sortir + V07 | Dua klasifikasi berbeda pada objek yang sesuai |
| W03-M02 Jejak Sapu Raksasa | Explore & Discover; P01/P07 | Bersihkan jalur untuk menemukan pola lantai tersembunyi | Jalur taman bersih + V08 | Jalur melingkar atau zigzag dengan coverage berbeda |
| W03-M03 Roda Pemilah Berhenti | Fix & Transform; P02/P03/P07 | Periksa gear mainan yang belum terpasang; pilah 6 benda | Mesin sortir interaktif + stiker gear | Tata letak gear dan kategori berubah |
| W03-M04 Dari Kotak Menjadi Mainan | Build & Use; P07/P08 | Pilih benda pakai ulang dan bangun komponen taman | Wahana kotak dan tabung + stiker reuse | Bangun terowongan atau menara dengan set sama |
| W03-M05 Eco Park Dibuka | Finale; P01/P07/P08 | Pilih pembagian tugas pickup, sapu, dan penempatan dekorasi | Taman hidup + badge W03 | Ubah layout hasil konstruksi |

### 11.5 Katalog W04 — Kebun Ceria

| Misi | Template / primitives | Tujuan dan pilihan | Hasil dunia / reward | Replay yang mengubah permainan |
|---|---|---|---|---|
| W04-M01 Baris Kebun Pertamaku | Build & Use; P04/P07 | Siapkan petak dan pilih susunan 4–6 bibit | Kebun awal + V09 | Buat pola AB atau AAB tanpa tes tertulis |
| W04-M02 Traktor Ikut Rencanaku | Explore & Discover; P11 | Susun 3–5 kartu arah untuk mengantar air | Lajur kebun tersambung + stiker urutan | Ubah posisi tujuan dan satu rintangan lunak |
| W04-M03 Keranjang Seimbang | Predict & Test; P05/P09 | Angkat muatan rendah, uji distribusi kiri/kanan | Tempat muat + V10 | Berat token berbeda, total tetap kecil |
| W04-M04 Air untuk Tiga Petak | Help & Deliver; P06/P07 | Bagi jumlah air diskrit dan pilih urutan petak | Kebun berbunga + stiker irigasi | Kebutuhan 2/3/4 unit menggantikan 2/2/2 |
| W04-M05 Piknik Hasil Kebun | Finale; P01/P07/P11 | Rencanakan pickup, hitung buah, antar ke meja | Area piknik dapat dimainkan + badge W04 | Pilih rute dan susunan menu berbeda |

### 11.6 Katalog W05 — Pelabuhan Penjelajah

| Misi | Template / primitives | Tujuan dan pilihan | Hasil dunia / reward | Replay yang mengubah permainan |
|---|---|---|---|---|
| W05-M01 Perjalanan Ferry | Explore & Discover; P01/P05 | Muat satu peti dan pilih dermaga bertanda | Rute pulau terbuka + V11 | Urutan docking berbeda; tanpa tenggelam |
| W05-M02 Crane dan Tiga Peti | Build & Use; P05/P07 | Cocokkan peti dengan tempat bongkar, pilih urutan | Gudang mini aktif + stiker peti | Variasi ukuran dan bentuk socket |
| W05-M03 Muatan Miring | Predict & Test; P05/P09 | Bandingkan beban di satu sisi dan terbagi | Dek uji keseimbangan + stiker balance | Ubah posisi, bukan total berat dan posisi sekaligus |
| W05-M04 Jembatan Antar-Dermaga | Build & Use; P08/P11 | Sambungkan modul dan susun urutan pengiriman | Jembatan pulau + stiker koneksi | Dua solusi jalur yang sama-sama valid |
| W05-M05 Paket untuk Pulau | Finale; P01/P05/P07/P11 | Pilih rute, distribusi beban, dan urutan antar | Pulau piknik menerima suplai + badge W05 | Paket tujuan berganti tanpa mengubah hadiah |

### 11.7 Katalog W06 — Wonder Lab & Festival

| Misi | Template / primitives | Tujuan dan pilihan | Hasil dunia / reward | Replay yang mengubah permainan |
|---|---|---|---|---|
| W06-M01 Ban untuk Petualangan | Predict & Test; P09/P12 | Uji dua ban, pilih lintasan lumpur/kayu | Jalur terrain + V12 | Bandingkan waktu tempuh visual tanpa ranking |
| W06-M02 Laboratorium Warna | Explore & Discover; P09/P10 | Campur dua pigmen preset dan cat panel parade | Paint pavilion + stiker campuran | Resep lain dan tambah putih sebagai variabel terpisah |
| W06-M03 Lintasan Buatanku | Build & Use; P08/P12 | Susun maksimal 8 modul, uji, lalu revisi | Track builder permanen + stiker track | Ubah ramp, tikungan, atau jalur alternatif |
| W06-M04 Lampu Wahana Menyala | Fix & Transform; P02/P03/P11 | Pasang konektor bentuk saat daya mainan mati; pilih urutan lampu | Panggung cahaya + stiker lampu | Urutan 3–6 simbol berbeda |
| W06-M05 Festival Penemuan | Finale; P01/P07/P08/P11/P12 | Pilih 3 kendaraan pajangan, urutan parade, dan wahana untuk dicoba | Festival akhir interaktif + badge W06 | Parade berbeda memakai karya yang sudah dimiliki |

### 11.8 Batas konten dalam satu misi

- Tabel misi mencantumkan beberapa primitive, tetapi tidak berarti semuanya harus dipakai lama.
- Maksimal dua primitive menjadi fokus; lainnya hanya transisi familiar.
- Finale menggabungkan tugas yang telah diajarkan dan boleh dipause di setiap subtujuan.
- Main story tidak memerlukan semua stiker, semua optional challenge, atau prediksi benar.
- Misi dengan repair wajib dalam katalog: W02-M02, W03-M03, W06-M04. Pemasangan hook pada W02-M03 adalah persiapan alat, bukan fault repair. Total tiga misi repair wajib berada di bawah batas enam.

---

## 12. Empat misi yang dijabarkan penuh

### 12.1 W01-M04 — Jembatan untuk Semua

**Tujuan anak:** Membuat dump truck dapat melewati kanal kecil menuju taman.

**Durasi target:** 5–7 menit. **Kendaraan:** V04 pinjaman dan V03 untuk uji. **Prasyarat:** W01-M01 serta satu dari W01-M02/M03. **Konsep:** panjang, kecocokan, urutan, dan hasil konstruksi.

**Scene setup:** Dua sisi jalan, kanal dangkal, tiga socket struktur, tray berisi dua ukuran beam, crane parkir dengan stabilizer aktif, dump truck menunggu di area aman. Tidak ada karakter berdiri di bawah beban.

| Beat | Pemicu / tujuan | Input dan keputusan | Respons / checkpoint |
|---|---|---|---|
| 1. Lihat celah | Scene siap | Tap tujuan di seberang | Kamera menunjukkan celah dan dua beam |
| 2. Pilih ukuran | Objective active | Pilih beam pendek/panjang | Preview memperlihatkan panjang relatif; pilihan salah boleh dicoba |
| 3. Angkat | Part selected | Tap hook lalu drag ke socket | Beban terangkat; bayangan tujuan muncul |
| 4. Tempatkan | Beban di zona snap | Release | Beam snap jika socket cocok; simpan checkpoint part |
| 5. Lengkapi | Beam installed | Pilih urutan dua panel lantai | Panel kedua dapat dipasang lebih dahulu bila tidak melanggar dependency |
| 6. Uji | Struktur valid | Tekan V03 atau tombol uji | Anak mengemudikan truck melintasi jembatan |
| 7. Payoff | Truck reaches garden | Bongkar mainan | Anak memakai taman; world delta `bridge_open=true` |

**Pilihan yang benar-benar berpengaruh:** Beam pendek tidak mencapai kedua socket; beam panjang cocok. Pada variasi B tersedia dua beam pendek dan support tengah sehingga terdapat solusi berbeda. Jangan menampilkan dua pilihan yang menghasilkan animasi sama.

**Hint ladder:** highlight ujung socket → tampilkan siluet ukuran → demonstrasikan satu placement tanpa menyelesaikan semua → izinkan tap-to-place. Anak tetap memilih kapan menguji.

**Failure/recovery:** Jika beam dilepas di luar zona, turunkan ke alas aman dan tampilkan hook; tidak kembali ke awal misi. Jika keluar setelah panel pertama, restore panel pertama dan objective panel kedua.

**Acceptance:** Semua solusi yang dinyatakan valid bisa dilalui controller; truck berhenti sebelum celah jika struktur belum valid; reward hanya sekali; replay mempertahankan jembatan di hub tetapi membuka scene percobaan yang dapat direset.

### 12.2 W02-M02 — Ke Mana Airnya Pergi?

**Tujuan anak:** Membuat air mencapai kolam mainan. **Durasi:** 4–6 menit. **Kendaraan:** V05. **Konsep:** gejala, penyebab, sambungan, dan verifikasi.

**Initial state:** Reservoir berisi air; pompa mainan siap; indikator aliran bergerak sampai hose coupler yang terlepas. Kincir di ujung diam. Dua lokasi sehat memberi pembanding: reservoir penuh dan valve terbuka.

1. Blippi mengarahkan perhatian ke kincir: “Airnya belum sampai. Mau kita lihat jalurnya?”
2. Anak memeriksa reservoir, valve, atau coupler dalam urutan pilihannya.
3. Mengetuk lokasi sehat menghasilkan respons fungsi normal; tidak dianggap jawaban salah.
4. Pada coupler, gap terlihat dan animasi air berhenti sebelum sambungan.
5. Anak memilih konektor lingkaran dari tiga bentuk lalu memasang.
6. Anak menekan test. Pulsa air melewati sambungan dan kincir berputar.
7. Anak memilih cabang ke kolam atau ke semprotan bunga; keduanya dapat dicoba.
8. Kolam terisi sampai zona tujuan; simpan world delta dan tampilkan stiker sambungan.

**No false teaching:** Tidak ada api, percikan listrik, atau tekanan berbahaya. Coupler adalah komponen mainan; UI tidak menampilkan prosedur kerja hidraulik nyata.

**Hint:** animasikan perjalanan air sampai titik berhenti; jangan langsung mewarnai jawaban dari awal.

**Replay variant:** Selang terlipat menggantikan coupler lepas; aksi drag merapikan jalur sudah diajarkan melalui gesture P06. Jika konten belum mengajarkan aksi ini, varian disembunyikan.

**Acceptance:** Setelah reconnect, aliran dihitung ulang dari graph; memindahkan benda kosmetik tidak menyelesaikan fault; milestone hanya tercapai sesudah anak menguji aliran.

### 12.3 W04-M03 — Keranjang Seimbang

**Tujuan anak:** Membawa keranjang ke meja dengan posisi muatan yang lebih seimbang. **Durasi:** 5–7 menit. **Kendaraan:** V10 pinjaman. **Konsep:** distribusi beban dan perbandingan satu variabel.

**Setup:** Dua platform uji dengan empat token buah identik. Model menampilkan kemiringan yang dibatasi, tanpa terguling. Forklift hanya bergerak setelah muatan diletakkan rendah dan tersusun.

| Trial | Variabel tetap | Variabel yang diubah | Pengamatan |
|---|---|---|---|
| A | 4 token, kendaraan, permukaan, rute | Semua token berada di sisi kiri | Platform miring kiri |
| B | Sama dengan A | Dua kiri dan dua kanan | Platform lebih mendatar |
| Bebas | Diberi label sandbox | Anak memilih susunan | Indikator posisi pusat beban bergerak |

**Pilihan:** Anak dapat memprediksi platform mana yang lebih mendatar atau langsung mencoba. Prediksi keliru tidak mengurangi reward.

**Tindakan:** Drag buah → lihat platform → tekan uji → pindahkan dua buah → uji lagi → angkut hasil ke meja.

**Bantuan:** Tampilkan dua titik tujuan di sisi yang kosong; hit target diperbesar; jangan menambahkan buah otomatis sebelum anak mencoba.

**Payoff:** Meja muat kebun menjadi tempat bermain timbang-muatan; V10 tersedia di parkiran bebas.

**Acceptance:** Trial B mempertahankan total token yang sama; indikator keseimbangan konsisten dengan posisi; tidak ada karakter atau barang yang terluka/rusak; data yang disimpan adalah konfigurasi, bukan raw rigidbody snapshot.

### 12.4 W06-M03 — Lintasan Buatanku

**Tujuan anak:** Menyusun lintasan pendek yang bisa dimainkan dan diperbaiki. **Durasi:** 6–8 menit untuk guided build; free play tidak dibatasi.

**Available parts:** straight, left bend, right bend, ramp rendah, landing, music strip. Guided layout memakai maksimal 8 modul dan start/finish tetap. Loop vertikal tidak masuk set awal.

**Flow:** Pilih bentuk lintasan dari dua gambar → pasang tiga bagian wajib → tambahkan pilihan sendiri → lihat validasi koneksi → test drive → ubah satu modul → test ulang → simpan slot karya.

**Aturan validasi:** Port keluar harus tersambung port masuk yang kompatibel; ramp wajib mempunyai landing zone bebas; jalur dari start ke finish harus ada; radius tikungan mengikuti minimum controller; decorative props tidak menghalangi jalur.

**Dua tingkat keberhasilan:**

- `BuildComplete`: graph valid dan semua bagian berada dalam boundary.
- `PlayVerified`: kendaraan mencapai finish melalui lintasan. Misi selesai hanya pada tahap kedua.

**Bila tidak valid:** Kamera fokus satu sambungan bermasalah dan menampilkan pilihan part yang cocok. Jangan menyorot semua kesalahan sekaligus.

**Bila mobil terjebak:** Kembalikan ke checkpoint, tampilkan opsi edit bagian di dekat kejadian. World graph tidak boleh dinyatakan valid hanya berdasarkan socket jika controller tidak dapat melintasinya.

**Save:** Tiga slot track lokal per profil; masing-masing menyimpan part ID, transform grid, koneksi, versi set part, dan thumbnail. Guided misi tidak mensyaratkan anak memahami slot save; slot aktif disimpan otomatis.

**Payoff:** Track muncul sebagai miniatur di Festival; anak dapat kembali bermain langsung dari hub.

**Acceptance:** Tes seluruh pasangan modul yang disetujui; track yang melewati validasi dapat dilalui mode assisted drive; edit tidak menghapus reward misi atau menimpa track profil lain.

---

## 13. Progresi, hadiah, dan replay

### 13.1 Dependency dunia

| Konten | Syarat tersedia | Alasan |
|---|---|---|
| Hub, Toy Yard, W01-M01 | Langsung | Aksi cepat |
| W01-M02 dan M03 | W01-M01 selesai | Pilihan setelah onboarding |
| W01-M04 | M01 dan salah satu M02/M03 selesai | Dapat memilih ritme belajar |
| W01-M05 | M01–M04 selesai | Menggabungkan kemampuan dasar |
| W02 dan W03 | W01-M05 selesai | Dua arah petualangan |
| W04 | Salah satu W02-M05 atau W03-M05 selesai | Pemain tidak wajib menyelesaikan semua cabang |
| W05 | W04-M05 selesai | Muatan dan sequencing telah diperkenalkan |
| W06 | W05-M05 selesai | Konstruksi dan pengujian telah dikenal |
| W06-M05 | W06-M01–M04 selesai | Penutup permainan utama |

Dalam W02–W06: M01 tersedia saat dunia terbuka; M02 dan M03 setelah M01; M04 setelah M02 **dan** M03; M05 setelah empat misi sebelumnya. Syarat khusus misi boleh ditambah hanya bila tidak menciptakan siklus.

Content resolver juga memeriksa aturan yang sudah pernah diperkenalkan. Jika pemain memilih W03 dan melewati W02, W04-M04 memberi tutorial P06 singkat sebelum pembagian air. Jika memilih W02 dan melewati W03, P07 diperkenalkan saat pertama diperlukan di W04-M01. Satu skill yang belum dikenalkan tidak boleh dianggap dipahami hanya karena nomor dunianya lebih tinggi; tutorial kontekstual menggantikan pengenalan yang dilewati, tanpa memaksa kembali ke cabang lain.

Jalur cerita minimum melewati lima dunia karena W02/W03 adalah cabang alternatif. Total konten tetap 30 misi; menyelesaikan keenam dunia adalah eksplorasi penuh, bukan syarat menonton festival akhir. Setelah finale, game mengundang anak mencoba dunia yang belum dikerjakan tanpa pesan bahwa pencapaiannya “belum sempurna”.

**Parent sandbox override:** Orang tua dapat membuka semua kendaraan/dunia untuk bermain bebas. Override tidak memberi tanda bahwa misi cerita telah selesai dan tidak mengubah hasil eksperimen. Misi yang dimainkan melalui override tetap menyimpan completion secara normal; graph progres memprosesnya ketika prerequisite terpenuhi.

### 13.2 Hadiah deterministik

| Jenis | Jumlah v1 | Cara memperoleh | Fungsi |
|---|---|---|---|
| Stiker misi | 30 | Satu per first completion, termasuk finale | Koleksi visual dan dekorasi |
| Badge dunia | 6 | Satu per M05 | Penanda proyek besar yang selesai |
| Kendaraan | 12 | V01 awal; 11 unlock pada misi pengenalan | Kemampuan bermain bebas |
| Perubahan dunia | 30 | Satu delta utama per misi | Konsekuensi permanen dan area interaktif |
| Dekorasi dunia | 6 | Satu pada finale dunia | Kustomisasi tanpa efek performa |
| Discovery cards | 12 topik | Mengalami peristiwa penemuan tertentu | Memutar ulang observasi; bukan nilai ujian |

Tidak ada Gear Coins pada desain utama v3. Reward langsung dikaitkan ke pengalaman, sehingga tidak diperlukan harga, pengeluaran, grinding, atau optimasi pendapatan. Jika tim ingin menambah mata uang kemudian, harus menunjukkan masalah produk yang diselesaikan; bukan sekadar mempertahankan fitur dari versi awal.

### 13.3 Aturan reward

- First completion memberikan reward sekali melalui transaksi idempotent.
- Replay tetap memberi respons positif dan memperbarui karya/hasil percobaan; tidak menghasilkan duplikat reward ekonomi.
- Bantuan tidak mengurangi stiker, badge, atau unlock.
- Tidak ada tiga bintang yang menilai waktu, kecepatan, atau jumlah hint.
- Tantangan tambahan dicatat sebagai penemuan opsional, misalnya “mencoba dua jalur”.
- Hadiah tidak kedaluwarsa dan tidak terikat tanggal perangkat.
- Anak tidak diminta “main satu lagi” berulang kali setelah menekan selesai.

### 13.4 Discovery Passport

Passport menampilkan halaman bergambar untuk: sambungan jalan, penggalian, ramp, panjang, aliran, traksi, klasifikasi, penggunaan ulang, urutan, keseimbangan, campuran warna, serta konstruksi track.

Setiap card menyimpan ikon, satu kalimat pendek, animasi observasi, dan tombol coba lagi. Tidak memerlukan foto anak, input nama, nilai akademik, atau perbandingan dengan saudara.

### 13.5 Replay yang berkualitas

| Dimensi variasi | Contoh | Batas |
|---|---|---|
| Rute | Kanal dilintasi dari sisi lain | Solusi utama tetap dapat ditemukan |
| Material | Balok pendek dengan support vs balok panjang | Aturan telah diajarkan |
| Parameter | Ramp rendah vs tinggi | Satu parameter per guided trial |
| Urutan | Pickup kebun sebelum gudang | Setidaknya dua urutan valid |
| Karya | Desain track dan warna baru | Save tidak menimpa karya lain tanpa pilihan |
| Perspektif tugas | Bangun lalu uji dengan kendaraan berbeda | Perubahan capability memengaruhi hasil |

Setiap misi normal mempunyai dua varian authored pada v1: base dan remix. Total 30 misi tidak berarti 60 cerita terpisah; varian memakai tujuan inti yang sama dengan parameter/layout yang terkurasi. MVP boleh hanya menyediakan remix pada empat misi terbaik untuk menjaga scope.

---

## 14. Eksperimen dan model simulasi

### 14.1 Prinsip model

Gunakan model yang mudah dipahami, stabil, dan dapat dituning. Angka internal tidak ditampilkan sebagai ukuran ilmiah nyata kecuali unit dan model memang divalidasi. UI anak memakai jarak penanda, jumlah token, tinggi relatif, atau indikator aliran.

Physics untuk rasa gerak boleh berbeda dari model penilaian eksperimen. Namun keduanya harus diselaraskan: bila UI menyatakan lebih jauh, animasi juga harus menunjukkan lebih jauh. Jangan menggunakan simulasi fisik yang tidak stabil untuk menentukan unlock.

### 14.2 Lima keluarga eksperimen

| Keluarga | Variabel bebas | Yang dipertahankan | Hasil visual | Hal yang tidak boleh diklaim |
|---|---|---|---|---|
| Ramp terkontrol | Tinggi awal | Mobil, massa token, permukaan, bentuk jalur, posisi pelepasan relatif rig | Marker jarak setelah meluncur | Semua ramp lebih tinggi pasti memberi hasil sama di dunia nyata |
| Traksi | Jenis ban | Kendaraan, throttle profile, jalur, muatan | Slip dan kemajuan | Angka koefisien sebagai data ban sungguhan |
| Aliran | Valve/koneksi | Sumber, wadah, setting pompa | Jalur air dan kincir | Simulasi tekanan hidraulik lengkap |
| Keseimbangan | Posisi beban | Total token, platform, gaya gerak | Kemiringan platform | Batas keselamatan forklift/ferry nyata |
| Warna pigmen | Pasangan atau rasio preset | Jenis palet, pencahayaan, bahan virtual | Swatch hasil | Model akurat semua jenis cat/pigmen |

### 14.3 Ramp rig

- Vehicle release memakai kondisi awal yang sama untuk tiap trial.
- Model guided mengubah satu parameter `startHeightBand`: low/medium/high.
- Hasil jarak diambil dari tabel terkalibrasi melalui prototipe atau simulasi sederhana yang disetujui; jangan menulis konstanta tanpa hubungan ke rig.
- Simpan `rigVersion`, `surfaceId`, `vehicleConfigHash`, dan hasil setiap trial.
- Track stunt bebas tidak digunakan untuk menarik kesimpulan ramp terkontrol.
- Tidak memakai `v >= 12 m/s` sebagai aturan universal untuk loop; kebutuhan lintasan tergantung geometri dan model yang dipilih.

### 14.4 Traksi

Model awal untuk kontrol, bukan rumus ban nyata:

```text
forwardDrive = throttleInput × driveScale × gripFactor(surface, tire)
slipVisual = clamp01(1 - gripFactor(surface, tire)) × throttleInput
speed = approach(currentSpeed, targetSpeed(forwardDrive), responseRate)
```

Tabel grip harus menghasilkan perbedaan yang terlihat tanpa membuat kendaraan berhenti total. Guided trial memakai path follower dan throttle profile tetap. Free driving memakai input anak; hasilnya tidak dibandingkan sebagai eksperimen terkontrol.

### 14.5 Water graph

Node berupa source, junction, valve, reservoir, dan consumer. Edge menyimpan connected/open/capacityBand. Evaluator mencari jalur sumber ke consumer, lalu mendistribusikan flow units sesuai aturan sederhana yang konsisten. Tidak diperlukan CFD.

Prioritas implementasi: konektivitas dahulu → valve → level wadah → pembagian cabang. Bila pembagian flow belum konsisten, misi membatasi satu cabang aktif daripada memalsukan hasil dua cabang.

### 14.6 Balance model

Gunakan token massa abstrak dan posisi relatif pada platform:

```text
weightedOffset = sum(tokenMass × localHorizontalOffset) / sum(tokenMass)
displayTilt = clamp(weightedOffset × tiltScale, -maxTilt, maxTilt)
balanced = abs(weightedOffset) <= acceptedBalanceBand
```

Empty platform diatur `weightedOffset=0`; pembagian nol tidak boleh terjadi. `maxTilt` membatasi animasi agar tidak terguling. Model ini mengajarkan distribusi relatif beban pada alat mainan; bukan menghitung stability envelope alat angkat nyata.

### 14.7 Pigment palette

Palet edukatif memakai **merah, kuning, biru, dan putih** agar istilah sesuai aktivitas cat sederhana. Hasil berasal dari recipe table authored: merah+kuning → jingga, kuning+biru → hijau, merah+biru → ungu, warna+putih → varian lebih muda. Warna visual harus diuji agar hasil mudah dibedakan.

Catatan tim: ini adalah penyederhanaan palet pigmen tradisional, bukan pernyataan bahwa RYB adalah satu-satunya model warna. Cyan–magenta–yellow adalah model lain; jangan mencampur istilah CMY dengan keluaran “electric lime” seolah selalu pasti. Efek glitter atau flame decal terpisah dari hasil campuran warna.

### 14.8 Siklus pertanyaan

1. Tampilkan objek yang akan dibandingkan.
2. Ajukan satu pertanyaan melalui suara.
3. Beri waktu memilih tanpa hitungan mundur; tombol langsung coba tersedia.
4. Jalankan percobaan dan beri kesempatan melihat hasil.
5. Tunjukkan pembanding A/B.
6. Beri penjelasan satu kalimat yang menggambarkan hasil dalam game.
7. Tawarkan ubah satu hal, lanjut misi, atau selesai.

---

## 15. Screen specification dan navigasi

### 15.1 Arsitektur navigasi

Entry → profil lokal bila diperlukan → hub → peta/parkiran/Toy Yard/Discovery Wall. Peta membuka dunia lalu kartu misi. Misi memiliki pause, hint, dan exit ke hub. Parent area hanya melalui gate dari pause atau hub. Tidak ada promosi eksternal pada jalur anak.

### 15.2 Delapan belas layar/konteks utama

| ID | Layar | Konten utama | Aksi utama | Empty/error/recovery |
|---|---|---|---|---|
| S01 | Entry/resume | Tombol main, slot aktif, indikator loading singkat | Lanjut | Jika save tidak valid, tawarkan backup lewat flow aman |
| S02 | Profil lokal | Tiga ikon/avatar preset | Pilih profil | Slot kosong dibuat dengan ikon, tanpa nama wajib |
| S03 | Hub | Lima lokasi yang terlihat | Tap lokasi | Jika konten gagal dimuat, lokasi lain tetap aktif |
| S04 | Peta dunia | Diorama, jalur progres, dua rekomendasi | Buka dunia | Konten terkunci menampilkan petunjuk aktivitas, bukan harga |
| S05 | Kartu misi | Gambar tujuan, kendaraan, ikon aktivitas | Mulai | Pinjam kendaraan otomatis jika diperlukan |
| S06 | Parkiran | Kendaraan, demo kemampuan, tiga pilihan terlihat | Pilih / coba | Kendaraan belum terbuka terlihat sebagai teaser tanpa countdown |
| S07 | Briefing dalam scene | Tujuan visual dan kalimat singkat | Coba sekarang | Replay VO; skip setelah pemahaman cukup |
| S08 | Drive HUD | Tujuan, maju/arah, pause | Berkendara | Recover button saat stuck |
| S09 | Worksite HUD | Tool kontekstual, target, undo bila relevan | Operasikan alat | Wrong target kembali aman |
| S10 | Inspection | Gejala, objek, scanner sederhana | Temukan sebab | Hint bertingkat |
| S11 | Repair | Part tray maksimal tiga, socket, test | Pasang dan uji | Part kembali ke tray |
| S12 | Build | Part tray, preview, undo, test | Bangun | Tunjukkan satu koneksi bermasalah |
| S13 | Experiment | Variabel, prediksi opsional, uji, A/B | Bandingkan | Reset trial tanpa reset mission |
| S14 | Paint | Swatch, stiker, horn preset | Terapkan | Undo dan default per panel |
| S15 | Payoff | Perubahan dunia, stiker kecil, tiga opsi | Coba hasil / lanjut / selesai | Reward disimpan sebelum animasi |
| S16 | Discovery Passport | Halaman gambar dan trial | Lihat / coba ulang | Halaman kosong menampilkan siluet topik |
| S17 | Pause & child settings | Lanjut, suara, hint, pulang | Lanjut atau keluar | Simpan checkpoint sebelum keluar |
| S18 | Parent area | Bahasa, kontrol, durasi, data, override sandbox | Pengaturan orang tua | Gate timeout dan perubahan gagal disimpan |

### 15.3 Hierarki informasi

- Layar aktif menampilkan satu tujuan utama, maksimal tiga tool yang relevan, dan satu jalur bantuan.
- Tidak ada saldo koin permanen yang mengambil ruang HUD.
- Mission progress berupa 3–5 ikon tindakan; tidak harus memakai persentase.
- Tujuan dapat ditap untuk memusatkan kamera atau mengulang petunjuk.
- Tombol aksi memakai ikon dan label pendek; VO tidak membacakan seluruh HUD sekaligus.
- Reward animation tidak menutup pilihan keluar atau mengambil kendali dalam waktu lama.

### 15.4 Layout landscape

Area atas untuk pause dan tujuan; area tengah untuk objek/dunia; area bawah untuk kontrol. Dock tidak mengambil lebih dari sekitar seperempat tinggi layar pada layout standar. Primary action berada dekat jangkauan ibu jari, dengan opsi mirror left-handed.

Safe area mengikuti cutout dan system gestures. Ponsel dengan rasio panjang tidak sekadar meregangkan view tablet: HUD memakai constraint, sedangkan kamera menjaga area kerja tetap terlihat. Pada tablet 4:3, part tray dapat berpindah ke samping untuk memberi ruang vertikal.

### 15.5 Microcopy contoh

| Konteks | Teks/VO |
|---|---|
| Mulai misi | “Ayo buat jalan ke taman.” |
| Pilihan | “Mau lewat mana?” |
| Membutuhkan bantuan | “Mau lihat petunjuk?” |
| Part belum cocok | “Bentuknya belum pas. Coba lihat ujungnya.” |
| Eksperimen | “Coba ubah satu hal.” |
| Hasil | “Airnya sampai. Kincirnya bergerak!” |
| Keluar | “Permainanmu sudah disimpan.” |
| Kembali | “Mau melanjutkan yang tadi?” |

Kalimat adalah draft original untuk produksi, bukan kutipan resmi Blippi.

---

## 16. Aksesibilitas dan bantuan adaptif

### 16.1 Tiga profil tantangan

| Profil | Tampilan | Jumlah pilihan | Bantuan motorik | Kedalaman |
|---|---|---|---|---|
| T0 Dibantu | Tujuan sangat eksplisit | 2 | Snap besar, auto-dock, tap alternatives | Satu aturan dan langkah pendek |
| T1 Penjelajah | Default | 2–3 | Snap normal, hint on demand | Satu keputusan utama |
| T2 Pencoba | Dipilih anak/orang tua | 3 | Kontrol tetap ramah | Solusi alternatif, perbandingan, sequencing lebih panjang |

T2 menambah keputusan, bukan memperkecil tombol atau memperketat timing. Level kesulitan tidak berdasarkan umur yang diinput dan tidak diberi label kemampuan anak.

### 16.2 Hint ladder

| Tingkat | Pemicu awal yang dapat dituning | Respons |
|---|---|---|
| H0 | Tujuan baru | Instruksi singkat dan target terlihat |
| H1 | Sekitar 8 detik tanpa interaksi relevan | Pulse lembut pada area relevan |
| H2 | Dua percobaan tidak produktif atau sekitar 15 detik stuck | Petunjuk suara spesifik |
| H3 | Pengguna meminta bantuan atau stuck berlanjut | Ghost hand satu aksi lalu menghilang |
| H4 | Tetap sulit setelah demonstrasi | Tap-to-complete untuk langkah motorik, bukan seluruh misi |

Timer dihitung hanya ketika objective aktif dan pemain tidak sedang pause, menonton trial, mendengar instruksi, atau melakukan eksplorasi bermakna. Jangan menyimpulkan anak kesulitan hanya karena ia lambat atau sedang menikmati sandbox.

### 16.3 Adaptasi

- Dua kegagalan drag berturut-turut boleh memperbesar snap radius pada objective yang sama.
- Repeated wrong-category tidak mengubah jawaban diam-diam; sistem menawarkan perbandingan ikon.
- Tiga objective lancar dapat memunculkan ajakan tantangan tambahan, tidak otomatis menaikkan kesulitan.
- Penurunan bantuan pada misi berikutnya dilakukan perlahan dan tetap menyediakan hint manual.
- Riwayat hint disimpan lokal untuk tuning pengalaman, bukan label “pintar/lambat”.

### 16.4 Minimum accessibility baseline

- Warna selalu dipasangkan dengan bentuk, posisi, tekstur, atau suara.
- Caption bahasa Indonesia tersedia; font tidak dekoratif pada instruksi penting.
- Semua instruksi audio mempunyai representasi visual; semua informasi visual penting mempunyai deskripsi ringkas saat dipilih.
- Mode reduced motion mengurangi camera movement, bounce, particle burst, dan transisi.
- Haptics dan musik dapat dimatikan terpisah.
- Tidak ada rapid flashing atau efek strobe.
- Steering, drag, dan rotary action memiliki alternatif tap.
- Misi tetap dapat diselesaikan dengan suara mati dan tanpa haptics.
- Dukungan screen reader penuh bukan klaim v1 tanpa audit; menu orang tua diprioritaskan untuk semantic labels.

---

## 17. Kerangka belajar dan lokalisasi

### 17.1 Learning map

| Domain | Tindakan belajar dalam game | Bukti observasi yang dicatat | Batas interpretasi |
|---|---|---|---|
| Sebab-akibat | Memasang sambungan lalu menguji | Anak menghubungkan aksi dengan perubahan aliran | Bukan penilaian kompetensi engineering |
| Perbandingan | Dua konfigurasi, satu perubahan | Anak mencoba A/B dan melihat hasil | Tidak wajib menyatakan teori secara verbal |
| Numerasi | Mengisi kebutuhan 1–10 objek | Jumlah tujuan dipenuhi | Tidak menyimpulkan kemampuan matematika umum |
| Klasifikasi | Memilah berdasarkan satu atribut | Objek ditempatkan sesuai kategori | Gunakan material/icon yang tidak ambigu |
| Spatial reasoning | Memutar dan memasang modul | Struktur tersambung dan dapat digunakan | Tidak memakai label diagnosis |
| Sequencing | Menyusun 3–6 langkah | Urutan dijalankan dan diperbaiki | Tidak menyebutnya sertifikasi coding |
| Problem solving | Mengamati gejala dan mencoba solusi | Revisi setelah feedback | Hindari menilai kecepatan sebagai kecerdasan |
| Creativity | Membuat track, pola, dan tampilan | Karya tersimpan dan dipakai kembali | Tidak memberi satu jawaban estetika benar |

### 17.2 Numerasi bertingkat

T0 memakai hitungan 1–5; T1 sampai 10; T2 memakai pembagian sederhana dalam total maksimum 20 bila konten sesuai. Angka ditampilkan bersama objek. Tidak ada popup soal aritmetika saat kendaraan menabrak. Tantangan hitung harus menjawab kebutuhan dunia, seperti dua keranjang masing-masing tiga buah.

### 17.3 Bahasa

- Bahasa Indonesia: bahasa UI, instruksi, caption, dan VO pertama.
- English vocabulary opsional: satu kata benda setelah tugas selesai, misalnya “excavator”; bukan interupsi setiap tindakan.
- Semua string memakai localization key; ID konten tidak diterjemahkan.
- Audio disimpan per locale, tidak mengandalkan TTS online.
- Jika VO belum tersedia, release locale tersebut ditunda atau ditandai hanya pada build pengembangan; child experience final harus konsisten.
- Perubahan bahasa menjaga mission state dan mengganti prompt berikutnya tanpa mengulang misi.
- Gunakan kata konkret seperti “sambungan”, “jalur”, “lebih panjang”; istilah teknis dapat ada di parent notes, bukan menjadi syarat bermain.

### 17.4 Definisi learning success

Pemain belajar sesuatu dalam konteks bila dapat memperlihatkan hubungan melalui tindakan baru: misalnya memilih sambungan yang cocok pada layout lain. Menyelesaikan drag yang sangat terbantu tidak otomatis membuktikan pemahaman. Ringkasan orang tua memakai “sudah mencoba aliran air” atau “membandingkan dua ban”, bukan “menguasai hidraulik”.

---

## 18. Art direction dan inventaris aset

### 18.1 Gaya visual

**Arah:** Dunia mainan 3D yang cerah, rapi, dan tactile. Kendaraan memiliki bentuk yang mudah dikenali, material plastik/cat dengan tekstur halus, serta detail mekanis yang cukup untuk menjelaskan fungsi. Keterbacaan objek lebih penting daripada photorealism.

- Warna biru dan jingga sebagai aksen tema; tidak semua permukaan menggunakan kedua warna tersebut.
- Background lebih tenang daripada objek interaktif.
- Kendaraan yang dipilih memiliki outline lembut, shadow, atau ring; bukan neon berkedip.
- Mechanical attachment digambar dengan struktur yang konsisten dari depan, samping, dan belakang.
- Wajah kendaraan tidak wajib; karakter kendaraan tidak boleh berubah proporsi antarview.
- Kotoran dan damage bersifat ringan serta reversible; tidak ada metal robek atau puing tajam.
- HUD menghindari ilustrasi ramai di belakang teks dan angka.

### 18.2 Palet dunia yang diusulkan

| Dunia | Warna dominan | Accent | Material utama | Landmark |
|---|---|---|---|---|
| W01 | Sand, sky blue | Orange | Tanah mainan, kayu, blok beton bergaya | Crane dan jembatan |
| W02 | Aqua, leaf green | Yellow | Air, pipa plastik, tanaman | Kincir dan air mancur |
| W03 | Green, cream | Teal | Kertas/kotak bersih, logam halus | Mesin sortir |
| W04 | Warm green, earthy brown | Red | Tanah, kayu, keranjang | Kebun berpola |
| W05 | Blue, light gray | Coral | Dermaga, kontainer, air | Ferry dan crane |
| W06 | Lavender, cyan | Orange | Foam, plastik, lampu lembut | Track dan panggung festival |

Palet di atas adalah usulan art direction, bukan brand guide resmi. Brand-specific assets menggunakan referensi dan persetujuan proyek.

### 18.3 Inventaris minimum v1

| Kelompok | Kuantitas perencanaan | Isi / ketentuan |
|---|---|---|
| Host | 1 karakter utama | Rig, facial expressions terbatas, gesture guidance |
| NPC original | 6 base silhouettes | Variasi warna/pakaian; tidak harus 30 karakter |
| Kendaraan | 12 base models | Capability berbeda, pivot, collider, socket, LOD |
| Attachment fungsional | 12 | A01–A12 |
| Dekorasi kendaraan | 6 | Satu per dunia |
| Fault assemblies | 6 reusable sets | Coupler, hose bend, gear, wheel, plug, bucket pin; hanya subset dipakai story |
| Hub | 1 | Lima titik interaksi, tiga slot karya track |
| World kits | 6 | Modular ground, landmark, props, collision |
| Perubahan dunia | 30 authored deltas | Boleh memakai ulang kit, bukan wajib 30 model unik |
| Bridge/road parts | 10 types | Straight, curve, support, beam sizes, panel |
| Water parts | 8 types | Source, hose, junction, valve, tank, wheel, nozzle, end cap |
| Track parts | 6 types | Straight, left, right, ramp, landing, music strip |
| Sortable objects | 24 base props | 8 material, 8 garden, 8 cargo; kategori tidak ambigu |
| Stickers | 30 | Satu misi satu ikon unik |
| Badges | 6 | Siluet dan identitas dunia berbeda |
| Discovery cards | 12 | Gambar topik dan mini animation reference |
| UI icon set | Sekitar 48 | Action, navigation, accessibility, tools; final inventory saat UX lock |
| Mission thumbnail | 30 | Tujuan dapat dikenali, bukan screenshot generik sama |
| World thumbnail | 6 | Diorama sebelum/sesudah |
| Shared VFX | Sekitar 12 reusable emitters | Dust, water, paint, success sparkles, direction pulse, dan lain-lain |
| Music | 1 hub + 6 world loops + stingers | Loop tidak mengganggu VO |
| VO | Estimasi 180–260 line Indonesia | Final jumlah setelah script lock; bukan requirement menambah dialog |

Angka inventaris adalah alat budgeting, bukan alasan mengisi game dengan aset yang tidak dipakai. Tiap aset harus mempunyai consumer: scene, misi, layar, atau feedback state.

### 18.4 Spesifikasi vehicle model

- Master unit konsisten: 1 Unity unit = 1 meter dalam authoring, walau proporsi dunia dapat bergaya.
- Orientasi: +Y up, +Z forward; pivot utama di ground center kendaraan.
- Wheel pivots terpisah dan konsisten; radius visual diselaraskan dengan ground contact.
- Socket IDs stabil seperti `tool_front`, `cargo_bed`, `hook_tip`, `water_outlet`.
- Collider sederhana terpisah dari render mesh; bukan mesh collider detail pada kendaraan bergerak.
- Bagian interaktif punya `InteractableId` dan hit proxy.
- LOD0 menjadi hero dekat; LOD1/LOD2 mengurangi detail; roda dan silhouette tetap jelas.
- Texture set dapat dibagi antarvarian; detail baut berulang memakai normal/texture bila tidak interaktif.

### 18.5 Jika menggunakan image generation untuk aset

Image generation digunakan untuk concept art, texture reference, background, ikon, atau sprite pendukung. Gambar hasil generasi tidak otomatis menjadi 3D mesh, rig, collider, atau asset siap game.

**Aturan reference sheet:** Satu kendaraan per sheet atau satu grid terkontrol; front/side/back lurus; bentuk, jumlah roda, pintu, attachment, dan warna konsisten; background bersih untuk extraction; tanpa UI atau tulisan tertanam.

**Contoh prompt konsep kendaraan:**

```text
Create an original toy-like 3D excavator concept for a children's discovery game.
Show exactly three aligned orthographic views: front, left side, rear.
Same vehicle proportions and attachment in every view; tracked chassis;
rounded blue body with orange functional accents; clear bucket joints;
clean white background; no text, logo, watermark, extra vehicle, or scenery.
This is concept reference art, not a sprite animation sheet.
```

**Contoh prompt environment:**

```text
Children's toy-scale construction discovery park, elevated three-quarter view,
a short unfinished bridge, sand pit, safe crane work pad, and a garden destination.
Clear traversable paths, calm background, readable blue-and-orange interactive props,
soft daylight, no UI, no text, no crowded decoration, no dangerous accident scene.
```

Asset QA harus memeriksa konsistensi secara visual; jangan menganggap kata “HD” menyelesaikan salah perspektif atau bentuk mekanik.

---

## 19. Audio, animasi, VFX, dan haptics

### 19.1 Feedback matrix

| Aksi | Animasi/VFX | Audio | Haptic opsional |
|---|---|---|---|
| Tap tombol | Scale singkat sekitar 4–8%, state pressed jelas | Soft click | Light tick |
| Part cocok | Snap, outline hilang, komponen terkunci | Click mekanis pendek | Single confirmation |
| Part tidak cocok | Kembali ke tray, target bentuk disorot | Nada netral pendek | Tidak wajib |
| Bucket scoop | Bucket terisi, beberapa chunk/debu | Gesekan tanah ringan | Satu pulse saat terisi |
| Baut selesai | Ulir berhenti dan mark aligned | Ratchet lalu click | Confirmation |
| Aliran tersambung | Pulsa air mengikuti jalur | Flow lembut | Tidak perlu kontinu |
| Paint | Panel berubah, mist ringan | Spray pendek | Optional, off default bila mengganggu |
| Landing | Suspensi compress dan debu | Thump lembut | Pulse pendek yang dibatasi |
| Penemuan | Highlight objek dan ikon topik | Discovery chime | Single light pulse |
| Misi selesai | World payoff + konfeti lokal singkat | Stinger 1–2 detik | Success pattern jika tersedia |

### 19.2 Haptics contract

Gunakan event semantik `Selection`, `Snap`, `Success`, `LandingSoft`. Adapter platform memilih efek yang didukung; unsupported berarti no-op. Tidak mengunci frekuensi 20/40/150 Hz sebagai jaminan lintas perangkat. Prinsip penggunaan yang hemat, konsisten, dan mempunyai fallback mengikuti pedoman Android [R4].

- Semua informasi penting tersedia tanpa haptics.
- Tidak ada continuous rumble sepanjang scanner atau berkendara.
- Debounce haptic event berulang; hard cap awal 3 event ringan per detik.
- Respect pengaturan pengguna dan kemampuan perangkat.
- Uji sinkronisasi dengan suara/visual; haptics yang terlambat boleh dihilangkan.

### 19.3 Audio priorities

Urutan prioritas: instruksi aktif → feedback aksi → lingkungan → musik. Satu VO instruksi aktif pada satu waktu. Musik turun otomatis ketika VO berjalan. Instruksi yang sudah tidak relevan dibatalkan; jangan mengantre semua ucapan setelah pemain bergerak cepat.

Target line length 3–8 detik; sebagian besar lebih pendek. VO bantuan tidak otomatis berulang lebih sering dari sekitar 20 detik untuk prompt yang sama. Tombol replay tersedia setiap saat.

### 19.4 Animation requirements

| Karakter/objek | State minimum | Catatan |
|---|---|---|
| Blippi host | Idle, point, observe, think, celebrate, wave | Tidak menutupi area kerja |
| Kendaraan | Idle, move, stop, work, recovery | Animasi terkait status model |
| Tool | Pick, preview, active, finish, cancel | Cancel selalu punya akhir bersih |
| World landmark | Before, during activation, after | After harus bisa dimainkan/diamati ulang |
| Reward | Appear, acknowledged, dismiss | Reward tercatat sebelum animasi |

Cutscene menggunakan event timeline pendek yang dapat dilewati. State perubahan dunia tidak bergantung pada cutscene mencapai frame terakhir.

### 19.5 Audio/VFX yang dilarang dalam core flow

Siren keras berulang, explosion shock, arc listrik saat memasang kabel, sparks dari setiap baut, kamera shake ekstrem, suara buzzer memalukan, dan konfeti yang menutupi tujuan setelah setiap aksi kecil.

---

## 20. Area orang tua, data, dan distribusi

### 20.1 Parent area

Fitur: pilih bahasa, mode kontrol, reduced motion, haptics, volume, pengingat waktu, profil, hapus/reset data, sandbox override, dan ringkasan discovery. Jika distribusi publik ditambahkan, informasi produk dan tautan eksternal hanya ada di sini.

Gate awal: hold ikon orang tua kemudian challenge khusus orang dewasa; pilihan PIN lokal tersedia. Soal matematika sederhana bukan satu-satunya gate karena pemain utama kelas 1–2 dapat mengerjakannya. Gate bukan autentikasi akun atau pengganti persetujuan pengolahan data.

Gate otomatis menutup saat aplikasi masuk background atau setelah sekitar 60 detik tanpa aktivitas. Kontrol hapus profil memerlukan konfirmasi dengan ikon profil dan penjelasan singkat. Reset semua profil tidak menjadi default.

### 20.2 Waktu bermain

- Default tidak menampilkan countdown di HUD.
- Orang tua dapat memilih pengingat setelah 10, 15, atau 20 menit; angka ini adalah pilihan produk, bukan rekomendasi medis.
- Pengingat menawarkan menyimpan dan selesai pada checkpoint terdekat; tidak menghapus progres.
- Jika orang tua memilih batas keras, sistem pause setelah save dan menunjukkan “Waktunya istirahat” tanpa menyalahkan anak.
- Tidak ada push notification yang menyuruh anak kembali untuk mempertahankan streak.

### 20.3 Data minimization

| Data | Disimpan? | Lokasi / tujuan |
|---|---|---|
| Ikon profil | Ya | Lokal; membedakan pemain |
| Nama asli, tanggal lahir, sekolah | Tidak dibutuhkan | Tidak ada field wajib |
| Progres dan karya | Ya | Lokal, untuk resume |
| Pengaturan aksesibilitas | Ya | Lokal per profil atau perangkat sesuai setting |
| Foto, mikrofon, kontak, lokasi | Tidak pada v1 | Tidak meminta permission |
| Rekaman chat/percakapan | Tidak | Tidak ada chat |
| Event gameplay | Ringkasan lokal terbatas | Debug/tuning pada build tes; tidak dikirim otomatis |
| Analytics pihak ketiga | Tidak pada baseline | Tidak diperlukan untuk loop inti |

### 20.4 Kebijakan build dan distribusi

Untuk public release, pemilik produk memeriksa hak penggunaan nama, karakter, musik, dan materi Blippi sebagai pekerjaan distribusi. PRD ini tidak menyatakan bahwa game telah berlisensi. Game architecture memisahkan `BrandPack` dari gameplay agar branding/aset dapat diganti tanpa menulis ulang sistem.

Pedoman Apple Kids Category mengatur pemisahan tautan/pembelian di balik parental gate dan membatasi pengiriman data kepada pihak ketiga; Families Policies Google perlu ditinjau sesuai distribusi Android [R3, R5]. Baseline offline, tanpa iklan, tanpa analytics pihak ketiga, dan tanpa mikrofon adalah keputusan desain proyek, bukan klaim otomatis memenuhi seluruh aturan. Verifikasi kebijakan platform dilakukan kembali saat rilis.

### 20.5 Tidak ada commerce di area anak

V1 tidak mempunyai tombol beli, mata uang premium, locked chest berbayar, atau promosi berlangganan. Model distribusi keluarga/premium dapat diputuskan oleh pemilik produk di luar gameplay; konten yang tersedia pada build harus dapat dimainkan tanpa upsell kepada anak.

---

## 21. Functional requirements

### 21.1 Requirements register

| ID | Fase | Requirement | Acceptance utama |
|---|---|---|---|
| FR-001 | Slice | Masuk ke aksi pertama tanpa login | Dari scene siap ke input bermakna ≤10 detik |
| FR-002 | Slice | P01 assisted driving | Seluruh rute wajib bisa ditempuh dengan kontrol dasar |
| FR-003 | Slice | Mission objective graph | Objective selesai hanya oleh event dan guard yang sesuai |
| FR-004 | Slice | Build-and-use loop | Struktur dibangun lalu dipakai untuk menyelesaikan tujuan |
| FR-005 | Slice | Experiment A/B | Variabel dan hasil dua trial tersimpan dan dapat dibandingkan |
| FR-006 | Slice | Checkpoint save/resume | Kill/reopen memulihkan checkpoint yang valid |
| FR-007 | Slice | Reward idempotency | Callback completion berulang tidak menggandakan reward |
| FR-008 | MVP | Tiga profil terpisah | Progres/karya/pengaturan profil tidak bocor antarprofil |
| FR-009 | MVP | Pinjaman kendaraan | Misi available tidak terblokir karena kendaraan belum owned |
| FR-010 | MVP | Hint ladder | H1–H4 tampil sesuai konteks, bisa diminta manual |
| FR-011 | MVP | Persistent world delta | Hub/dunia menampilkan hasil misi setelah restart |
| FR-012 | MVP | Repair verification | Gejala terselesaikan hanya setelah assembly dan test valid |
| FR-013 | MVP | Water graph | Aliran mengikuti connectivity dan valve |
| FR-014 | MVP | Appearance save | Warna/stiker/horn konsisten di garage dan mission |
| FR-015 | MVP | Parent area | Gate, timeout, settings, dan profile deletion berfungsi |
| FR-016 | MVP | Offline operation | Semua misi terpasang selesai dalam airplane mode |
| FR-017 | MVP | Reduced motion dan audio alternatives | Misi selesai tanpa VO/haptics dengan petunjuk visual |
| FR-018 | MVP | Safe exit | Exit/interrupt tidak menghapus completed objective |
| FR-019 | V1 | P11 sequencing | Urutan direplay langkah demi langkah dan dapat direvisi |
| FR-020 | V1 | Track builder | Validasi, test, tiga slot save per profil |
| FR-021 | V1 | 30 authored missions | Seluruh ID dalam katalog playable dan sesuai scope |
| FR-022 | V1 | Director recommendations | Memilih konten eligible dan menghindari pengulangan bila mungkin |
| FR-023 | V1 | Discovery Passport | 12 topik, animasi observasi, jump-to-replay |
| FR-024 | V1 | Finale reuse | Festival memakai kendaraan dan karya pemain yang tersimpan |
| FR-025 | MVP | Content validation | Build menolak referensi hilang dan dependency cycle |
| FR-026 | MVP | Data deletion | Data profil aktif benar-benar terhapus tanpa menyentuh profil lain |
| FR-027 | V1 | Localization architecture | Tidak ada string instruksi hardcoded di gameplay scripts |
| FR-028 | MVP | Input cancellation | Pointer loss/background tidak meninggalkan aksi aktif |
| FR-029 | V1 | Authored remix | 30 base + 30 parameter/layout remix yang tervalidasi |
| FR-030 | MVP | Parent duration settings | Pengingat/batas bekerja dengan checkpoint dan pause |

### 21.2 Non-functional product requirements

1. Game tidak membutuhkan server untuk membuka progres yang telah diperoleh.
2. Save memiliki schema version, backup, migration, dan recovery.
3. Data konten terpisah dari kode runtime.
4. Semua third-party packages harus dicatat beserta versi dan fungsi; jangan menambahkan SDK analytics/ads secara implisit.
5. Build content validator dan release smoke suite menjadi bagian pipeline.
6. Runtime graceful fallback harus tersedia ketika audio, haptic, atau optional VFX tidak didukung.
7. Source control menyimpan konfigurasi editor/package yang terkunci; seluruh tim menggunakan baseline sama.

---

## 22. Arsitektur implementasi dan state machine

### 22.1 Baseline teknologi

Usulan baseline adalah **Unity 6.3 LTS + URP**, C#, Unity Input System, dan UI canvas yang responsif. Unity menyebut 6.3 sebagai LTS dengan dukungan hingga Desember 2027 pada sumber yang diperiksa [R2]. Patch editor dan versi package spesifik harus dipilih setelah compatibility spike dan dikunci dalam project manifest; dokumen ini tidak mengarang nama “Unity 2026 LTS”.

Pemilihan LTS di sini bertujuan mengurangi perubahan baseline saat produksi. Bukan pernyataan bahwa Update release tidak stabil. Jika tim memilih Update release karena kebutuhan platform tertentu, rekam ADR beserta alasan, hasil uji, dan rencana pembaruannya.

### 22.2 Modul runtime

| Modul | Tanggung jawab | Boleh bergantung pada | Tidak boleh mengambil alih |
|---|---|---|---|
| AppBootstrap | Load settings/save, initialize services | Platform adapters, SaveRepository | Isi misi |
| ProfileService | Profil aktif dan pengaturannya | SaveRepository | Logika physics |
| ContentCatalog | Resolve mission/vehicle/world definitions | Data assets | Progress mutation |
| ProgressionService | Prerequisite, unlock, first completion | Catalog, profile snapshot | UI animation |
| MissionDirector | Pilih rekomendasi/variant | Progression, local history | Mengubah aturan misi aktif diam-diam |
| MissionRuntime | Objective graph, transitions, checkpoints | Primitive events, SaveCoordinator | Menentukan haptic hardware |
| InteractionRouter | Pointer ownership dan action mapping | Input System | Memberi reward |
| VehicleController | Movement, capability, docking, recovery | Vehicle definition, surface model | Membuka dunia |
| PrimitiveControllers | P01–P12 execution | Shared interaction/state contracts | Menulis save sendiri-sendiri |
| SimulationServices | Water, balance, trial evaluation | Pure model/config | Mengatur UI layout |
| HintService | Stuck detection dan hint ladder | Objective context, interaction events | Menilai kecerdasan pemain |
| PresentationService | Camera, UI, VO, animation/VFX | Read-only state/events | Menyimpan completion |
| RewardService | Bentuk reward transaction | Progression, SaveCoordinator | Random paid loot |
| SaveCoordinator | Atomic snapshot, backup, migration | SaveRepository | Menafsirkan gesture |
| PlatformAdapters | Audio focus, pause, haptics, file IO | Native capabilities | Gameplay branching karena brand |

### 22.3 Komunikasi

Primitives mengirim domain events yang memuat mission run ID, objective ID, actor ID, event type, dan payload tervalidasi. MissionRuntime mengevaluasi guards lalu menerbitkan state change. UI mengamati state; tidak memanggil `CompleteMission()` hanya karena animasi selesai.

Gunakan event bus dengan subscription lifetime eksplisit. Subscription dilepas saat scene unload. Event dari mission run lama harus ditolak agar callback tertunda tidak mengubah misi baru.

### 22.4 App state machine

| State | Masuk ketika | Keluar menuju | Invariant |
|---|---|---|---|
| Boot | App start | Profile/Hub/Recovery | Input gameplay belum aktif |
| ProfileSelect | Lebih dari satu profil atau belum ada profil | Hub | Satu profil aktif |
| Hub | Save valid dan content ready | MissionLoading/Sandbox/ParentArea | Tidak ada reward transaction setengah jalan |
| MissionLoading | Misi dipilih | MissionActive/HubError | Content references tervalidasi |
| MissionActive | Runtime siap | Pause/CompletionCommit | Satu active run |
| Pause | User pause atau background | MissionActive/Hub | Physics/input gameplay berhenti |
| CompletionCommit | Semua mandatory objectives valid | Payoff/SaveRetry | Reward belum diumumkan sebelum durable commit |
| Payoff | Commit berhasil | Hub/Replay/Sandbox | Reward tidak boleh diberi ulang |
| Recovery | Save/load error | Hub/Checkpoint/ParentArea | Tidak diam-diam mereset profil |

### 22.5 Objective state machine

`Locked → Available → Active → Satisfied → Committed`.

- `Locked`: predecessor belum selesai.
- `Available`: dapat dipilih, tetapi belum mulai menerima input.
- `Active`: hanya state ini menghitung stuck timer dan menerima event relevan.
- `Satisfied`: guard terpenuhi; checkpoint sedang disiapkan.
- `Committed`: sudah masuk snapshot valid; event duplikat tidak mengubah progres.

`Paused` adalah status orthogonal; tidak menghapus state objective. `RecoverableError` menyimpan alasan dan safe resume point. Optional objective tidak menjadi predecessor untuk mandatory completion kecuali secara eksplisit didesain dan terlihat.

### 22.6 Scene lifecycle

1. Persistent bootstrap scene menyimpan services, bukan seluruh world GameObjects.
2. Hub scene dimuat bila diperlukan; world scene tunggal menggantikannya secara asynchronous.
3. Mission definition mengaktifkan props/patch pada world scene yang sesuai.
4. Replay menggunakan sandbox overlay terhadap persistent world state, sehingga reset latihan tidak merusak hasil cerita.
5. Scene unload membatalkan async work, input capture, VO, dan subscriptions terkait scene.

### 22.7 Saran struktur source

```text
Assets/Game/
  Core/                 # bootstrap, services, events, identifiers
  Input/                # routing, assisted controls, pointer capture
  Missions/             # runtime, objective evaluators, director
  Primitives/           # P01 ... P12
  Vehicles/             # controllers, capabilities, attachments
  Simulation/           # water, balance, experiment models
  Progression/          # unlock graph, reward transactions
  Persistence/          # repository, schema, migrations, backups
  Presentation/         # camera, UI, audio, VFX
  Accessibility/        # hints, control alternatives, settings
  Content/              # definitions, catalogs, variants
  Art/                  # vehicles, world kits, UI assets
  Localization/         # strings, captions, voice manifests
  Platform/             # native adapters
  Validation/           # editor validators, build checks
  Tests/                # unit, integration, playmode, fixtures
```

Ini struktur konseptual; jumlah assembly definitions dan folder dapat disesuaikan. Jangan membuat satu manager raksasa yang menangani input, save, unlock, audio, dan mission logic.

---

## 23. Model data dan contoh konfigurasi

### 23.1 Entity contracts

| Entity | Field wajib | Aturan |
|---|---|---|
| WorldDefinition | id, sceneKey, missionIds, unlockRule, worldDeltaIds | ID stabil; semua mission.worldId harus sesuai |
| MissionDefinition | id, worldId, template, prerequisites, objectives, variants, rewards | Minimal satu mandatory objective dan satu meaningful choice |
| ObjectiveDefinition | id, primitiveId, predecessors, successRule, checkpointPolicy | Tidak ada dependency cycle |
| MissionVariant | id, seed, parameterOverrides, layoutKey, introducedRules | Override hanya field yang diizinkan |
| VehicleDefinition | id, prefabKey, capabilities, attachments, movementProfile | Semua capability mempunyai controller |
| AttachmentDefinition | id, compatibleVehicles, socketId, effects | Tidak boleh memperkenalkan stat tanpa consumer |
| ExperimentDefinition | id, modelVersion, variable, constants, outcomes | Guided trial hanya satu independent variable |
| RewardDefinition | id, type, payload, grantPolicy | `first_completion` untuk stiker/unlock/delta |
| DiscoveryDefinition | id, triggerRule, replayMissionId, mediaKeys | Trigger tidak mensyaratkan prediksi benar |
| ProfileSave | schemaVersion, profileId, progress, checkpoints, creations, settings | Tidak berisi nama asli wajib atau cloud identifier |
| ContentManifest | contentVersion, contentHash, definitions, assets, locales | Semua referensi dapat diselesaikan sebelum play |

### 23.2 Konvensi ID

- User-facing mission ID: `W01-M04`.
- Objective ID scoped: `W01-M04/O03`.
- Vehicle ID: `V04`.
- Reward ID global stabil: `reward:W01-M04:sticker`.
- First completion transaction key: `profileId + missionId + rewardSetVersion`.
- Replay run ID selalu baru; completion key tetap sama untuk reward set yang sama.
- Mengganti terjemahan atau nama tampilan tidak mengubah ID.
- `rewardSetVersion` tidak dinaikkan hanya karena revisi teks; perubahan reward membutuhkan migration eksplisit agar tidak menggandakan unlock.

### 23.3 Contoh MissionDefinition lengkap untuk misi jembatan

Contoh JSON berikut adalah kontrak desain yang valid secara sintaks, bukan kode runtime siap dijalankan. Evaluator bernama di dalamnya harus diimplementasikan dan diuji sesuai bagian 22–24.

```json
{
  "schemaVersion": 1,
  "id": "W01-M04",
  "worldId": "W01",
  "titleKey": "mission.w01.m04.title",
  "template": "build_and_use",
  "sceneKey": "world_w01_construction",
  "layoutKey": "bridge_base",
  "targetDurationSeconds": [300, 420],
  "prerequisites": {
    "allCompleted": ["W01-M01"],
    "anyCompleted": ["W01-M02", "W01-M03"]
  },
  "requiredCapabilities": ["lift_hook", "carry_bulk"],
  "availableVehicles": ["V04", "V03"],
  "loanerVehicles": ["V04", "V03"],
  "primaryPrimitive": "P08",
  "introducedRules": ["hook_lift_and_place"],
  "meaningfulChoices": ["beam_length", "deck_order"],
  "objectives": [
    {
      "id": "W01-M04/O01",
      "primitiveId": "P05",
      "predecessors": [],
      "mandatory": true,
      "successRule": {
        "event": "load_placed",
        "all": {
          "partTag": "beam_long",
          "socketId": "bridge_span",
          "placementValid": true
        }
      },
      "checkpointPolicy": "after_commit"
    },
    {
      "id": "W01-M04/O02",
      "primitiveId": "P08",
      "predecessors": ["W01-M04/O01"],
      "mandatory": true,
      "successRule": {
        "event": "structure_validated",
        "all": {
          "structureId": "bridge_garden",
          "requiredDeckPanels": 2,
          "traversable": true
        }
      },
      "checkpointPolicy": "after_commit"
    },
    {
      "id": "W01-M04/O03",
      "primitiveId": "P01",
      "predecessors": ["W01-M04/O02"],
      "mandatory": true,
      "successRule": {
        "event": "waypoint_reached",
        "all": {
          "vehicleId": "V03",
          "waypointId": "garden_delivery",
          "structureUsed": "bridge_garden"
        }
      },
      "checkpointPolicy": "mission_completion"
    }
  ],
  "variants": [
    {
      "id": "base",
      "seed": 104,
      "layoutKey": "bridge_base",
      "parameterOverrides": {}
    },
    {
      "id": "remix",
      "seed": 1104,
      "layoutKey": "bridge_alternate_approach",
      "parameterOverrides": {
        "approachSide": "east",
        "allowedDeckOrder": "either"
      }
    }
  ],
  "rewardSetVersion": 1,
  "rewards": [
    {"id": "reward:W01-M04:sticker", "type": "sticker", "payload": "sticker_bridge", "grantPolicy": "first_completion"},
    {"id": "reward:W01-M04:vehicle", "type": "vehicle", "payload": "V04", "grantPolicy": "first_completion"},
    {"id": "reward:W01-M04:world", "type": "world_delta", "payload": "W01.bridge_open", "grantPolicy": "first_completion"}
  ],
  "hintSetId": "hint_bridge",
  "fallbackMissionId": "W01-M01"
}
```

Versi remix contoh mempertahankan success rule yang sama. Varian dua beam pendek + support yang dibahas pada bagian 12 adalah alternatif desain lanjut dan membutuhkan objective override terpisah; tidak boleh dimasukkan hanya dengan mengganti mesh agar evaluator tetap mengharapkan `beam_long`.

### 23.4 Contoh save snapshot

```json
{
  "schemaVersion": 1,
  "contentVersion": "mvp-1",
  "saveSequence": 42,
  "profileId": "local-slot-1",
  "avatarId": "avatar_star",
  "completedMissionIds": ["W01-M01", "W01-M02", "W01-M03"],
  "ownedVehicleIds": ["V01", "V02", "V03"],
  "worldDeltas": {
    "W01.first_path_open": true,
    "W01.sandbox_sandpit_open": true,
    "W01.ramp_test_open": true
  },
  "grantedTransactionKeys": [
    "local-slot-1:W01-M01:1",
    "local-slot-1:W01-M02:1",
    "local-slot-1:W01-M03:1"
  ],
  "activeCheckpoint": {
    "missionId": "W01-M04",
    "variantId": "base",
    "seed": 104,
    "runId": "run-local-004",
    "completedObjectiveIds": ["W01-M04/O01"],
    "activeObjectiveId": "W01-M04/O02",
    "safeSpawnId": "bridge_crane_pad",
    "semanticState": {
      "placedParts": [
        {"partId": "beam_long_01", "socketId": "bridge_span"}
      ],
      "cargoTokens": 0
    },
    "trialResults": [],
    "assistTier": "T1"
  },
  "appearanceByVehicle": {
    "V01": {"paletteId": "blue_orange", "stickerIds": [], "hornId": "horn_soft_beep"}
  },
  "trackSlots": [],
  "discoveryIds": ["discovery_connections", "discovery_dig", "discovery_ramp"],
  "settings": {
    "locale": "id-ID",
    "reducedMotion": false,
    "hapticsEnabled": false,
    "controlMode": "assisted",
    "reminderMinutes": 15
  }
}
```

Integrity checksum disimpan pada envelope file bersama snapshot, bukan dihitung secara rekursif dari field checksum di dalam payload yang sama. Timestamp boleh ada untuk diagnosis, tetapi progres tidak bergantung pada jam perangkat.

### 23.5 Event payload contoh

```json
{
  "eventType": "load_placed",
  "runId": "run-local-004",
  "objectiveId": "W01-M04/O01",
  "eventSequence": 18,
  "actorId": "V04",
  "payload": {
    "partTag": "beam_long",
    "socketId": "bridge_span",
    "placementValid": true
  }
}
```

`eventSequence` dipakai untuk dedupe dalam active run bila diperlukan. Event tidak menyertakan nama anak, suara, koordinat GPS, atau identifier perangkat. Event runtime internal tidak otomatis berarti analytics yang dikirim ke server.

### 23.6 Content validation rules

Validator wajib memeriksa:

1. Semua ID unik pada namespace yang sesuai.
2. World/mission/objective prerequisite graph tidak bersiklus dan setiap node dapat dicapai.
3. Kendaraan pinjaman menyediakan capability untuk setiap stage, bukan hanya union capability yang mustahil dipakai bersamaan.
4. Semua prefab, layout, icon, localization key, dan VO cue terdaftar.
5. Semua mandatory objective mempunyai success evaluator dan recovery path.
6. Optional objective tidak memblokir completion secara tersembunyi.
7. Semua reward ID dan transaction key policy konsisten.
8. Satu first completion hanya memberi satu stiker misi; finale boleh menambah badge/dekorasi.
9. Variant tidak menggunakan primitive di luar build scope.
10. Guided experiment hanya mengubah independent variable yang diizinkan.
11. Setiap world delta mempunyai before/after representation.
12. Setiap misi memiliki meaningful choice dan world payoff.
13. Tidak ada tiga rekomendasi default berturut-turut dengan template sama jika kandidat alternatif tersedia.
14. Semua bahasa release mempunyai instruksi yang lengkap atau fallback yang telah disetujui.

---

## 24. Save, recovery, dan konsistensi progres

### 24.1 Prinsip

Save harus menangkap makna permainan: part telah ditempatkan, objective selesai, air mencapai wadah, atau karya track tersusun. Jangan menyimpan seluruh posisi rigidbody setiap frame lalu berharap scene dapat direkonstruksi dengan stabil.

### 24.2 Kapan menyimpan

- Setelah mandatory objective committed.
- Setelah first completion reward transaction.
- Setelah konfirmasi appearance atau track edit yang valid.
- Saat pause/exit dan ketika aplikasi akan background, sejauh platform memberi waktu.
- Setelah perubahan pengaturan penting.
- Dengan debounce untuk perubahan beruntun; maksimal kehilangan aksi yang belum menjadi checkpoint.

Jangan hanya bergantung pada callback ketika app ditutup: sistem operasi dapat menghentikan proses tanpa memberi kesempatan save. UI tidak boleh mengatakan “tersimpan” sebelum write terkonfirmasi.

### 24.3 Atomic write

1. Bentuk snapshot immutable dari authoritative state.
2. Validasi schema dan referensi inti.
3. Tulis payload + checksum ke temporary file pada directory yang sama.
4. Flush sesuai kemampuan platform adapter.
5. Verifikasi temporary file dapat dibaca.
6. Pertahankan last-known-good backup.
7. Replace save utama secara atomic bila platform mendukung; gunakan strategi adapter yang diuji jika tidak.
8. Publikasikan sequence baru sebagai durable.

Tidak ada dua writer paralel pada profil yang sama. SaveCoordinator menserialkan permintaan dan menggabungkan snapshot terbaru yang aman.

### 24.4 Reward transaction pseudocode

```text
CompleteMission(activeRun):
    assert activeRun matches current run
    assert all mandatory objectives are satisfied
    key = profileId + missionId + rewardSetVersion

    serialize through SaveCoordinator:
        next = clone(current durable profile)
        merge committed checkpoint progress into next
        if key not in next.grantedTransactionKeys:
            add mission completion
            apply vehicle/sticker/world rewards as set operations
            add key to next.grantedTransactionKeys
        clear active checkpoint if it belongs to this completed mission
        durableWrite(next)
        publish next as current profile

    after durable success:
        show payoff and next choices
    on write failure:
        keep in-memory completion candidate
        show neutral save-retry flow
        do not announce durable completion
```

Crash sebelum durable write: checkpoint lama tetap valid dan completion dapat dicoba kembali. Crash sesudah write tetapi sebelum animasi: reward sudah ada; restart membuka payoff ringkas atau hub, tidak memberi reward kedua.

### 24.5 Recovery matrix

| Kasus | Respons |
|---|---|
| App ditutup saat mengemudi | Spawn di safe waypoint checkpoint, muatan semantic dipulihkan |
| App ditutup saat mengangkat | Beban ditempatkan pada alas/slot aman; tidak restore suspended physics |
| App ditutup saat pumping | Valve/pump hold berhenti; level committed dipulihkan |
| Save utama rusak | Coba last-known-good backup; jelaskan pemulihan singkat |
| Save dan backup tidak valid | Tawarkan profil baru lewat orang tua; jangan menghapus file pemulihan diam-diam |
| Storage penuh | Pertahankan session state, tampilkan gagal menyimpan dan retry; tidak mengklaim berhasil |
| Content ID berubah | Migration map atau fallback checkpoint; jaga earned rewards yang masih valid |
| Konten belum tersedia setelah update | Kembali ke hub dengan progres tersimpan; parent info menjelaskan ketersediaan |
| Versi save lebih baru dari aplikasi | Tolak downgrade write; tawarkan update/recovery, jangan overwrite |
| Profil diganti | Pause/commit profil lama sebelum load profil baru |

### 24.6 Save limits

Target awal: save inti di bawah 2 MiB per profil, di luar thumbnail. Track maksimal tiga slot × delapan modul pada v1. Simpan maksimal dua hasil guided trial per eksperimen terakhir dan ringkasan penemuan; tidak perlu menyimpan semua input anak selamanya. Local debug event buffer dibatasi jumlah/ukuran dan hanya pada build yang membutuhkannya.

---

## 25. Performance dan compatibility

### 25.1 Target perangkat

Pertahankan kelas perangkat pada konsep sumber sebagai kandidat awal: iOS A13-class dan Android Snapdragon 778G/Dimensity 900-class. Ini kandidat pengujian, bukan daftar dukungan final. Versi OS minimum ditetapkan setelah memverifikasi editor, build toolchain, dan persyaratan distribusi saat implementasi.

Tablet nyata harus masuk matriks walaupun chip ponsel memenuhi target. Perangkat Android dengan spesifikasi lebih rendah dapat menjadi exploratory tier, tetapi jangan dijanjikan sebelum profiling.

### 25.2 Target terukur

| Metrik | Target awal | Cara ukur / batas |
|---|---|---|
| Mode standar | Target 60 FPS | Median frame time sekitar 16,7 ms; p95 ≤20 ms pada skenario uji yang dikunci |
| Fallback mode | Target 30 FPS | Median sekitar 33,3 ms; p95 ≤40 ms |
| Input-to-visible | p95 <100 ms | Ukur end-to-end di perangkat; bukan hanya event dispatch CPU |
| Cold boot ke interaktif | ≤8 detik | Build release, perangkat baseline, assets terpasang |
| Pergantian misi/world | ≤5 detik bila belum resident | Loading feedback; tidak memblokir tanpa indikator |
| Retry dalam scene | ≤3 detik | Reset semantic local |
| RAM steady-state | Target ≤1,0 GiB | Ukur resident/allocated dengan definisi metrik yang sama |
| RAM transient peak | Target ≤1,2 GiB | Saat pergantian scene; koreksi jika OS/device pressure lebih ketat |
| Save biasa | Target <200 ms durasi total | Main thread tidak diblokir sepanjang write |
| Thermal run | 20 menit | Frame pacing dan memory tetap dalam tier setelah warm-up |
| Crash/softlock | Nol P0 pada release candidate suite | Jumlah sesi dan perangkat dicatat; bukan klaim bebas bug universal |

Target 60 FPS tidak berarti setiap frame dijamin 16,7 ms. Catat p50/p95/p99 dan jank spikes; rata-rata saja dapat menyembunyikan pengalaman buruk.

### 25.3 Render budget awal

| Item | Target awal | Catatan |
|---|---|---|
| Hero vehicle LOD0 | 15k–25k triangles | Hanya satu yang sangat dekat |
| Secondary vehicle | 5k–12k triangles | LOD dan rig lebih ringan |
| Total visible geometry | Sekitar 150k–250k triangles | Budget kerja, bukan satu-satunya penentu performa |
| Materials per vehicle | Sekitar 2–4 | Shared atlas bila masuk akal |
| Hero texture | Maksimum 2K untuk kebutuhan dekat | Banyak aset cukup 1K |
| Environment texture | 512–1K umum | Compression sesuai platform |
| Real-time lights | Satu utama pada gameplay | Baked/ambient untuk lingkungan |
| Shadows | Tier-based | Blob/contact sederhana pada low tier |
| Transparent effects | Sedikit, lokal | Hindari full-screen overdraw dan volumetric spray berat |
| Dynamic rigidbodies | Target ≤30 aktif sekaligus | Decorative debris memakai pool dan sleep |
| Audio voices | Budget awal 16–24 | Prioritaskan VO dan feedback |

Semua budget dituning dari profiler. Penambahan satu shader transparan besar dapat lebih berat daripada beberapa ribu triangle; tim tidak boleh menggunakan polygon count sebagai satu-satunya gate.

### 25.4 Quality tiers

| Tier | Visual | Simulation | Target |
|---|---|---|---|
| High | Shadow lembut, texture hero 2K, particle normal | Model gameplay sama | 60 FPS bila perangkat mampu |
| Standard | Shadow lebih pendek, particle rendah | Model gameplay sama | 60 atau stable 30 berdasarkan hasil |
| Low | Blob shadow, 1K textures, efek minimum | Model gameplay sama; decorative physics dikurangi | 30 FPS |

Quality tier tidak boleh mengubah hasil eksperimen atau kriteria misi. Fitur dekoratif boleh turun; interaksi dan readability tetap sama.

### 25.5 Keputusan teknis yang ditunda sampai spike

- Graphics API Android dipilih berdasarkan support editor/device; tidak mensyaratkan Vulkan 1.3 tanpa alasan.
- Metal feature level mengikuti dukungan iOS/editor; tidak mewajibkan “Metal 3” sebagai label umum untuk seluruh target.
- Pilih asset loading/package strategy berdasarkan ukuran build dan offline needs; tidak mengharuskan CDN.
- Pilih haptic mapping setelah uji native plugin/perangkat, bukan angka frekuensi universal.
- WheelCollider penuh tidak wajib; assisted kinematic controller dapat lebih sesuai untuk kebutuhan keterbacaan dan stabilitas.
- Shader scanner menggunakan authored cutaway/overlay; tidak wajib true volumetric subsurface rendering.

---

## 26. QA dan acceptance tests

### 26.1 Kategori severity

| Severity | Definisi | Contoh |
|---|---|---|
| P0 | Progres/data hilang, privacy boundary gagal, crash berulang | Profil saudara tertimpa, child flow membuka tautan eksternal |
| P1 | Misi tidak dapat selesai atau hasil belajar salah | Jembatan valid tidak bisa dilalui, trial mengubah dua variabel tanpa penjelasan |
| P2 | Friksi besar tetapi ada jalan keluar | Hint muncul berulang, camera menghalangi slot |
| P3 | Cosmetic minor | Particle clipping singkat, transisi ikon kurang halus |

### 26.2 Acceptance test matrix

| Test ID | Cakupan | Skenario | Hasil wajib |
|---|---|---|---|
| QA-01 | FR-001 | Fresh install, tanpa profil | Mulai tanpa login dan aksi terlihat cepat |
| QA-02 | FR-002 | Semua rute wajib dengan tap-to-drive | Semua tujuan dapat dicapai |
| QA-03 | FR-003 | Event objective yang belum active | Ditolak tanpa progres palsu |
| QA-04 | FR-003 | Callback dari run sebelumnya | Tidak memengaruhi run baru |
| QA-05 | FR-004 | Build valid, lalu test kendaraan | Kendaraan melewati struktur dan memicu objective |
| QA-06 | FR-004 | Build belum lengkap | Tidak dapat dianggap usable; petunjuk spesifik |
| QA-07 | FR-005 | Trial A/B dengan satu parameter berubah | Constants identik; hasil/visual konsisten |
| QA-08 | FR-005 | Prediksi salah atau dilewati | Eksperimen dan reward tetap tersedia |
| QA-09 | FR-006 | Kill pada setiap checkpoint utama | Restore state valid tanpa mengulang seluruh misi |
| QA-10 | FR-006 | Background saat hold pump/drive | Input release, pause, tidak berjalan di background |
| QA-11 | FR-007 | Completion dipanggil 10 kali | Satu reward transaction, tanpa duplikat |
| QA-12 | FR-007 | Crash sesudah commit sebelum payoff | Reward tetap satu; scene resume masuk akal |
| QA-13 | FR-008 | Beralih tiga profil dan restart | Progress/appearance/track terpisah |
| QA-14 | FR-009 | Misi dengan vehicle belum owned | Loaner tersedia dan misi selesai |
| QA-15 | FR-010 | Anak diam vs aktif eksplorasi | Hint hanya mengikuti inactivity relevan |
| QA-16 | FR-010 | Gunakan H4 | Completion tetap sah dan reward penuh |
| QA-17 | FR-011 | Replay lalu reset layout | Persistent world delta tidak hilang |
| QA-18 | FR-012 | Part terpasang tetapi test belum dilakukan | Fault belum verified |
| QA-19 | FR-013 | Valve tertutup atau edge putus | Consumer tidak menerima aliran |
| QA-20 | FR-013 | Dua reservoir dan branch routing | Flow model sesuai aturan; level tidak negatif |
| QA-21 | FR-014 | Paint lalu misi/restart | Tampilan sama di seluruh konteks |
| QA-22 | FR-015 | Gate timeout/background | Area orang tua terkunci kembali |
| QA-23 | FR-016 | Airplane mode sejak start | Semua konten bundled yang eligible tetap playable |
| QA-24 | FR-017 | Audio off, haptics off, reduced motion | Misi lengkap tetap dapat dimengerti |
| QA-25 | FR-018 | Exit saat drag/load/cutscene | Checkpoint aman, tidak kehilangan part/reward |
| QA-26 | FR-019 | Urutan salah pada kartu ketiga | Menunjukkan langkah ketiga, bisa direvisi |
| QA-27 | FR-020 | Setiap kombinasi port track yang disetujui | Validasi dan assisted traversal sesuai |
| QA-28 | FR-020 | Save tiga slot lalu ganti profil | Slot dan thumbnail tidak tertukar |
| QA-29 | FR-021 | Jalankan semua 30 base missions | Tidak ada missing asset, blocker, atau reward salah |
| QA-30 | FR-022 | Riwayat dua primitive sama | Director memilih alternatif eligible jika tersedia |
| QA-31 | FR-023 | Discovery trigger dengan bantuan | Card tercatat tanpa klaim mastery |
| QA-32 | FR-024 | Finale dengan W02 atau W03 belum dikerjakan | Festival memakai aset yang dimiliki, tidak deadlock |
| QA-33 | FR-025 | Sengaja masukkan ID hilang/cycle | Build validator menolak dengan pesan spesifik |
| QA-34 | FR-026 | Hapus satu profil | Data profil tersebut hilang; dua profil lain utuh |
| QA-35 | FR-027 | Switch locale | String/VO valid, mission state tidak reset |
| QA-36 | FR-028 | Release di luar layar dan second touch | Tidak ada tool/throttle yang terus aktif |
| QA-37 | FR-029 | Semua remix melalui validator | Scope, objective, asset, dan solvability valid |
| QA-38 | FR-030 | Reminder dan hard limit | Save lalu prompt/pause sesuai konfigurasi |
| QA-39 | Save | Corrupt main save, backup sehat | Recovery backup berhasil dan tercatat |
| QA-40 | Save | Disk penuh | Tidak mengklaim saved; retry tersedia |
| QA-41 | NFR | Thermal test 20 menit | Catat p95/p99, memory, dan tier; target terpenuhi atau scope diturunkan |
| QA-42 | UX | 4:3, 16:9, 19.5:9 dengan safe area | Tombol tidak terpotong; workspace tetap terlihat |
| QA-43 | Learning | Semua dialog fakta dan trial outcomes | Tidak ada klaim mekanik/warna yang bertentangan dengan model |
| QA-44 | Content | Semua kendaraan di setiap supported worksite | Camera/collider/attachment tidak softlock |

### 26.3 Automation yang bernilai

Unit tests untuk prerequisite graph, reward dedupe, water connectivity, balance calculations, save migration, dan build graph. Integration tests untuk scene load, checkpoint replay, pointer cancel, serta completion transaction. Playmode tests untuk docking dan module traversal. Visual/child playtests tetap diperlukan; unit test tidak bisa membuktikan keseruan.

### 26.4 Manual device matrix

Minimum satu iPhone A13-class, satu iPad yang masuk dukungan, dua perangkat Android dengan vendor/GPU berbeda, dan satu ponsel dengan layar kecil di kelas target. Catat OS, RAM, thermal condition, build hash, graphics API, quality tier, serta hasil. Emulator/editor tidak menggantikan pengujian touch dan frame pacing di perangkat.

### 26.5 Release gate

- Tidak ada P0/P1 terbuka pada scope yang dirilis.
- Seluruh story mission dan unlock path dapat diselesaikan offline.
- Save/recovery dan profile isolation lulus seluruh skenario kritis.
- Tidak ada missing instruction pada bahasa yang diumumkan didukung.
- Profiling perangkat baseline memenuhi tier yang dipublikasikan.
- Playtest menunjukkan kontrol dan payoff dipahami; jika tidak, rilis konten tambahan ditunda.

---

## 27. Playtest dan kriteria keberhasilan

### 27.1 Apa yang diuji

Pertanyaan utama bukan “apakah anak menekan semua tombol?”, melainkan:

1. Apakah anak mengetahui apa yang ingin dibuat atau ditemukan?
2. Apakah anak merasa pilihannya memengaruhi hasil?
3. Apakah ia ingin memakai hasil karyanya setelah tugas selesai?
4. Apakah masalah kontrol menghentikan ide yang ingin dicoba?
5. Apakah bantuan menolong tanpa mengambil alih?
6. Apakah permainan dapat dihentikan dengan tenang setelah checkpoint?

### 27.2 Rancangan putaran playtest

| Putaran | Peserta awal | Build | Fokus |
|---|---|---|---|
| A | 5–6 anak target | Graybox satu misi | Kontrol, tujuan, pemahaman payoff |
| B | 8–12 anak target | Vertical slice tiga misi | Variasi, agency, eksperimen, minat replay |
| C | 8–12 anak, campuran pemain baru/lama | MVP | Progresi, repeat play, parent flow |
| D | Sampel tambahan sesuai masalah yang tersisa | V1 candidate | Cabang dunia, fatigue, compatibility konten |

Persetujuan orang tua dan kesediaan anak diperoleh untuk sesi pengujian. Dokumentasi dapat berupa catatan observasi tanpa merekam wajah/suara. Anak bebas berhenti; durasi panjang bukan indikator keberhasilan.

### 27.3 Protokol sesi sekitar 20–30 menit

1. Tanyakan kendaraan/aktivitas yang disukai secara singkat.
2. Berikan perangkat dengan instruksi umum “Silakan coba bermain.”
3. Hindari memberi solusi selama beberapa upaya awal kecuali anak meminta atau tampak tidak nyaman.
4. Catat titik kebingungan, pilihan spontan, jumlah bantuan, dan respons terhadap payoff.
5. Setelah satu misi, tawarkan tiga pilihan netral: ulang dengan cara lain, coba aktivitas lain, atau selesai.
6. Tanyakan “Apa yang berubah?” dan “Bagian mana yang mau kamu ubah?”; jangan menguji hafalan istilah.
7. Uji pause/resume dan pertanyaan orang tua di akhir bila anak masih ingin melanjutkan.

### 27.4 Target awal untuk keputusan desain

| Metrik | Definisi | Target awal | Jika tidak tercapai |
|---|---|---|---|
| First-action comprehension | Anak melakukan aksi relevan tanpa penjelasan dewasa | ≥80% peserta | Perbaiki affordance/onboarding |
| Meaningful choice recognition | Anak dapat menunjuk pilihan yang memengaruhi hasil | ≥70% | Ubah konsekuensi agar lebih terlihat |
| Mission completion with built-in help | Selesai tanpa orang dewasa mengambil perangkat | ≥80% | Perbaiki hint/recovery/control |
| Payoff recognition | Anak menunjukkan perubahan dunia | ≥80% | Besarkan hasil dan kesempatan memakainya |
| Voluntary alternate play | Memilih mencoba variasi atau karya sendiri saat diberi pilihan netral | ≥60% | Perbaiki variasi yang benar-benar mengubah gameplay |
| Excessive repeated help | Butuh petunjuk dewasa sama lebih dari dua kali pada aksi familiar | <20% | Sederhanakan aturan/kontrol |
| Clean stop | Bisa berhenti dengan progres tersimpan tanpa konflik UI | Semua sesi yang diuji | Perbaiki save/pause flow |

Persentase pada sampel kecil adalah heuristic untuk keputusan iterasi, bukan bukti statistik efektivitas belajar. Laporkan numerator/denominator, misalnya 8 dari 10, beserta catatan konteks. Jangan mengoptimalkan waktu bermain total sebagai tujuan tunggal.

### 27.5 Telemetry lokal yang berguna

Untuk build playtest: mission start/end, objective duration, hint level, retry reason, route choice, trial parameter, completion, dan exit point. Hindari raw touch recording permanen atau data pribadi. Ringkasan dapat diekspor oleh penguji/orang tua setelah persetujuan yang relevan; baseline konsumen tidak mengunggah event otomatis.

### 27.6 Fun gate sebelum ekspansi

Lanjut MVP hanya jika setidaknya dua dari tiga misi slice menunjukkan: tujuan dipahami, pilihan terasa, payoff digunakan, dan masalah kontrol dominan telah diselesaikan. Jika anak menyukai drive tetapi melewati repair, jangan memaksa repair lebih sering; perbaiki relevansi atau kurangi porsi repair.

---

## 28. Rencana produksi dan backlog

### 28.1 Urutan produksi

| Gate | Deliverable | Bukti yang harus ada sebelum lanjut |
|---|---|---|
| G0 — Concept lock | PRD, scope slice, target device candidates, interaction prototypes | Tim sepakat apa yang dibangun dan apa yang belum |
| G1 — Technical spike | Touch driving, build snap, save, satu scene perangkat | Controller dan pipeline berjalan pada hardware nyata |
| G2 — Playable graybox | W01-M01 tanpa polish besar | Anak memahami build → use dan dapat menyelesaikan tujuan |
| G3 — Vertical slice | Tiga misi, tiga kendaraan, world payoff, trial, resume | Fun gate bagian 27 terpenuhi |
| G4 — MVP alpha | W01–W02, enam kendaraan, 10 primitives | Unlock, save, parent area, offline bekerja end-to-end |
| G5 — MVP quality lock | Art/audio minimum final, device QA, child playtest | Tidak ada blocker; biaya produksi satu misi diketahui |
| G6 — V1 content complete | Enam dunia, 30 misi, semua primitives | Validator, base/remix QA, locale completeness |
| G7 — Release candidate | Bug fixing, profiling, final content review | Release gate bagian 26 terpenuhi |

Jangan memesan seluruh asset inventory sebelum G3. Produksi kit modular W03–W06 dimulai setelah format satu misi dan biaya iterasi cukup stabil.

### 28.2 Estimasi perencanaan bersyarat

Skenario referensi: tim kecil berpengalaman berisi producer/game designer, dua gameplay engineer, technical artist/3D artist, UI/2D artist, serta QA yang meningkat menjelang rilis. Audio/VO dan learning review dapat menjadi layanan terjadwal. Pembagian peran dapat dirangkap, tetapi kapasitas tidak bertambah hanya karena beberapa peran ditulis pada orang yang sama.

| Tahap | Rentang indikatif | Ketergantungan |
|---|---|---|
| Preproduction + spike | 2–3 minggu | Scope dan target devices |
| Graybox + slice + iterasi playtest | 4–6 minggu | Controller dan core systems |
| MVP implementation + content | 6–10 minggu | Fun gate slice |
| Ekspansi konten v1 + polish | 8–12 minggu | Tooling dan MVP quality lock |
| Release hardening | 3–5 minggu | Content lock |

Jika sepenuhnya berurutan, rentang di atas sekitar 23–36 minggu. Ini estimasi perencanaan, bukan komitmen delivery, quotation, atau hasil studi kapasitas. Overlap hanya masuk akal setelah dependency selesai. Solo developer sebaiknya menuntaskan slice/MVP lebih dahulu dan tidak memakai jadwal tim tersebut sebagai janji pribadi.

### 28.3 Backlog implementasi

| ID | Prioritas / fase | User story / pekerjaan | Definition of done |
|---|---|---|---|
| DEV-01 | P0 / Slice | Sebagai pemain, saya langsung melihat tombol main | Bootstrap scene, no-login entry, error route tersedia |
| DEV-02 | P0 / Slice | Saya bisa mengemudi tanpa kontrol rumit | P01 assisted movement, dock, recover; lulus QA-02 |
| DEV-03 | P0 / Slice | Saya bisa memilih dan menyeret objek | Pointer capture, UI priority, cancel; lulus QA-36 |
| DEV-04 | P0 / Slice | Tujuan berubah ketika tindakan benar terjadi | Objective graph + guards; lulus QA-03/04 |
| DEV-05 | P0 / Slice | Jalan yang saya bangun bisa dipakai | P08 basic sockets/traversal; W01-M01 selesai |
| DEV-06 | P0 / Slice | Game mengingat pekerjaan saya | SaveCoordinator + checkpoint; lulus QA-09/10 |
| DEV-07 | P0 / Slice | Hadiah tidak hilang/berlipat | Reward transaction; lulus QA-11/12 |
| DEV-08 | P1 / Slice | Saya bisa menemukan sesuatu dengan excavator | P02/P04 + W01-M02 |
| DEV-09 | P1 / Slice | Saya bisa menguji dua ramp | P09 controlled rig + W01-M03 |
| DEV-10 | P1 / Slice | Hasil pekerjaan mengubah taman | World delta presentation + payoff |
| DEV-11 | P0 / MVP | Saya dan saudara punya progres sendiri | Tiga profil, isolation, delete |
| DEV-12 | P1 / MVP | Saya mendapat bantuan yang sesuai | HintService + T0/T1/T2; tidak menghukum bantuan |
| DEV-13 | P1 / MVP | Saya bisa memakai crane | P05 + W01-M04/05 |
| DEV-14 | P1 / MVP | Saya bisa memasang part dan menguji hasil | P03 + repair scenario |
| DEV-15 | P1 / MVP | Air mengikuti sambungan saya | P06 + W02 content, graph tests |
| DEV-16 | P1 / MVP | Saya bisa memilah dan menghitung benda | P07 core + pickup/coverage collection adapters |
| DEV-17 | P2 / MVP | Kendaraan terlihat seperti pilihanku | P10 presets, appearance persistence |
| DEV-18 | P0 / MVP | Orang tua bisa mengatur sesi dan data | S18 gate/settings/duration/delete |
| DEV-19 | P0 / MVP | Konten rusak terdeteksi sebelum build | Catalog validator + schema fixtures |
| DEV-20 | P1 / V1 | Saya bisa merencanakan urutan gerak | P11 + step feedback |
| DEV-21 | P1 / V1 | Saya bisa membuat track yang dapat dimainkan | P12 + P08 modular track validation/save |
| DEV-22 | P1 / V1 | Saya bisa menjelajah Eco Park dan kebun | W03–W04 authored content dan vehicles |
| DEV-23 | P1 / V1 | Saya bisa memuat dan mengemudikan ferry | P01 water movement adapter + W05 |
| DEV-24 | P1 / V1 | Saya bisa mengadakan festival karya sendiri | W06 + saved creation integration |
| DEV-25 | P2 / V1 | Saya melihat rekomendasi yang beragam | Director + eligible fallback |
| DEV-26 | P1 / V1 | Saya mengingat penemuan melalui gambar | Discovery Passport 12 cards |
| DEV-27 | P0 / RC | Game tetap nyaman pada perangkat target | Performance tiers dan device matrix lulus |
| DEV-28 | P0 / RC | Semua misi dan save teruji | QA suite, playtest fixes, localization/content lock |

### 28.4 Critical path

Input/controller → objective runtime → build-and-use → checkpoint/reward → slice playtest → content tooling → MVP → reusable world production → full content QA → release hardening.

Art polish tidak berada di depan validasi core loop. Engine upgrade besar tidak dilakukan menjelang release candidate kecuali menyelesaikan blocker yang jelas dan telah dinilai dampaknya.

### 28.5 Definition of done untuk satu misi

- [ ] Tujuan dapat dimengerti melalui objek, suara, dan ikon.
- [ ] Ada satu keputusan yang mengubah hasil permainan.
- [ ] Tidak mengenalkan lebih dari satu aturan interaksi baru tanpa tutorial sebelumnya, kecuali dua langkah FTUE berurutan yang dijelaskan pada bagian 6.3.
- [ ] Mandatory path dapat diselesaikan dengan kontrol terbantu.
- [ ] Hint, cancel, reset lokal, pause, dan resume telah dibuat.
- [ ] World payoff ada dan dapat digunakan/diamati kembali.
- [ ] Reward transaction dan progression graph sudah diuji.
- [ ] Base variant lulus; remix lulus jika fase mewajibkan.
- [ ] Semua aset, dialog, caption, dan localization keys tersedia.
- [ ] Tidak ada error validator, missing reference, atau dependency cycle.
- [ ] Performa memenuhi tier pada perangkat baseline.
- [ ] Misi pernah dimainkan anak target atau masuk batch uji yang dijadwalkan sebelum content lock.

### 28.6 Prioritas jika waktu/biaya berkurang

Pertama kurangi jumlah dunia; kedua kurangi remix; ketiga kurangi kosmetik; keempat kurangi efek dekoratif. Pertahankan input yang ramah, meaningful choice, payoff, offline support, save/recovery, dan profile isolation. Satu dunia yang menyenangkan dan bisa diulang lebih bernilai daripada enam dunia dengan kontrol belum selesai.

---

## 29. Risiko dan keputusan terbuka

### 29.1 Risk register

Skala relatif: likelihood dan impact 1–5; score = likelihood × impact. Nilai awal adalah judgement perencanaan, bukan pengukuran risiko empiris.

| ID | Risiko | L | I | Score | Mitigasi konkret | Pemilik peran |
|---|---|---:|---:|---:|---|---|
| RSK-01 | Gameplay tetap terasa seperti pekerjaan berulang | 4 | 5 | 20 | Fun gate slice; meaningful choice dan payoff wajib | Game designer |
| RSK-02 | Scope 30 misi melampaui kapasitas | 4 | 5 | 20 | Fase MVP; content templates; ukur biaya satu misi | Producer |
| RSK-03 | Kontrol 3D terlalu sulit | 4 | 4 | 16 | Assisted driving, fixed work camera, tap alternatives | Gameplay lead |
| RSK-04 | Asset cantik tetapi tidak konsisten atau tidak riggable | 4 | 4 | 16 | Model sheets, asset acceptance, technical art review | Art lead |
| RSK-05 | Save/reward kehilangan progres anak | 3 | 5 | 15 | Atomic write, backup, idempotency, fault injection | Engineering lead |
| RSK-06 | Pembelajaran memberi hubungan sebab-akibat keliru | 3 | 4 | 12 | Model eksplisit, A/B constants, content review | Learning reviewer |
| RSK-07 | Low-end performance membuat input terlambat | 4 | 4 | 16 | Device spike, quality tiers, budget transparansi | Technical artist |
| RSK-08 | Brand/assets belum siap untuk distribusi yang dipilih | 3 | 4 | 12 | BrandPack terpisah; keputusan jalur distribusi sebelum public launch | Product owner |
| RSK-09 | Hint mengganggu eksplorasi | 3 | 3 | 9 | Activity-aware timer dan manual help | UX designer |
| RSK-10 | Dunia terakhir terkunci karena dependency salah | 3 | 4 | 12 | DAG validator dan tes semua progression paths | Content engineer |
| RSK-11 | Parent area bisa terbuka dari child flow secara tidak sengaja | 2 | 5 | 10 | Gate, timeout, external-link audit | UX/QA |
| RSK-12 | Replay hanya mengganti kosmetik | 4 | 3 | 12 | Variant rubric: route/material/constraint/sequence | Level designer |
| RSK-13 | Fisik bebas membuat track tidak stabil | 3 | 4 | 12 | Approved ports, controlled controller, automated traversal | Gameplay lead |
| RSK-14 | VO terlalu banyak dan menghalangi aksi | 4 | 3 | 12 | Audio priority, line-length budget, cancel stale prompts | Audio/UX |

### 29.2 Keputusan yang sudah diambil sebagai baseline

1. Target inti 7–8 tahun; bahasa Indonesia.
2. Landscape, offline, single-player, diorama 3D.
3. Repair kontekstual; bukan gerbang wajib setiap sesi.
4. Tidak ada coin economy pada core v3.
5. Tidak ada daily streak atau calendar unlock.
6. Tidak ada microphone, chat, atau cloud account pada v1.
7. Blippi berperan sebagai host, pemain sebagai pembuat keputusan.
8. Unity 6.3 LTS + URP sebagai kandidat baseline yang dikunci setelah spike.
9. Prototipe dibatasi tiga misi sebelum ekspansi.
10. Main story boleh selesai dengan salah satu W02/W03 belum dikerjakan.

### 29.3 Keputusan terbuka yang tidak memblokir penulisan/prototipe

| Pertanyaan | Default untuk mulai | Diputuskan paling lambat |
|---|---|---|
| Hanya keluarga atau publikasi komersial? | Prototipe keluarga/internal | Sebelum distribusi publik |
| Detail aset host dan jalur VO? | Placeholder original/internal; brand interface terpisah | Sebelum produksi aset final |
| Android atau iOS yang pertama? | Android device test pertama, struktur multi-platform | G1 |
| Model perangkat minimum sebenarnya? | Kandidat pada bagian 25 | Akhir G1, dikonfirmasi G5 |
| Berapa kapasitas tim dan anggaran? | Fokus slice | Sebelum komitmen MVP |
| Perlu bahasa Inggris penuh? | Indonesia dahulu | Sebelum localization content lock |
| Perlu portrait atau browser? | Tidak pada v1 | Jika product owner mengubah platform scope |
| Tingkat kebebasan steering default? | Assisted | Setelah playtest A/B |
| Apakah semua 30 remix sepadan? | Rencana v1, boleh dikurangi jika replay value lemah | G5 |

Keputusan di atas dicatat agar developer tidak menganggap asumsi sebagai informasi yang telah diberikan pengguna. Tidak perlu menghentikan pembangunan slice untuk memilih warna setiap ikon atau nama setiap NPC.

---

## 30. Handoff untuk AI coding dan tim produksi

### 30.1 Instruksi implementasi utama

Salin brief berikut ke developer/AI bersama dokumen ini. Brief sengaja membatasi pekerjaan pertama agar hasil bisa diuji.

```text
Build a playable vertical slice for the attached PRD:
Blippi: Mega Discovery Adventure, PRD v3.0.

Read the PRD before implementation. Treat sections 4, 7, 8, 21–26,
and the relevant mission specifications as authoritative.

First deliver only:
- Hub placeholder and W01-M01.
- V01 assisted driving.
- P08 basic road/bridge placement and validation.
- Objective state machine with explicit success guards.
- One persistent world change and idempotent completion reward.
- Checkpoint save/resume, pause, input cancellation, safe recovery.
- Indonesian placeholder instructions with visual equivalents.

Use simple graybox assets first. A static mockup or disconnected minigame menu
does not satisfy this request. The player must build a path and actually drive
over that path to deliver an object and change the world.

Do not implement all 30 missions at once. After the first mission works,
add W01-M02 and W01-M03 to complete the vertical slice, then run the fun gate.

Do not add ads, IAP, cloud login, analytics SDKs, microphone permission,
generated runtime dialogue, daily rewards, or mandatory repair loops.

Separate content definitions from runtime logic. Use stable IDs, capability
tags, a catalog validator, serialized save writes, and idempotent reward keys.
UI animation must not be the authority for progress or rewards.

Verify actual Unity/editor/package compatibility before choosing exact versions.
Record versions in the repository; do not invent a 'Unity 2026 LTS' baseline.

Provide:
1. Runnable project with exact setup instructions.
2. Build and device test instructions.
3. Content definitions for implemented missions.
4. Meaningful tests for progression, save, reward dedupe, and input cancel.
5. Known issues and differences from the PRD.
6. Evidence of build-and-use gameplay, not only screenshots of menus.

If a requirement cannot be implemented, explain the limitation and preserve
the intended player outcome through the simplest testable alternative.
Do not silently replace meaningful choices with animations that always end alike.
```

### 30.2 Urutan prompt kerja yang disarankan

| Prompt | Fokus | Batas selesai |
|---|---|---|
| 1 | Repository/bootstrap/input/save skeleton | Project bisa build; unit tests dasar jalan |
| 2 | P01 dan camera di graybox | Kendaraan mencapai dua waypoint dan recover |
| 3 | P08 + W01-M01 | Build, traverse, deliver, payoff, save |
| 4 | Fault/edge-case repair | Pointer cancel, kill/resume, reward duplicate aman |
| 5 | P02/P04 + W01-M02 | Dig discovery dengan pilihan petak |
| 6 | P09 + W01-M03 | A/B trial dengan satu variabel dan hasil tersimpan |
| 7 | Playtest fixes | Kontrol dan payoff dipahami sebelum polish |
| 8 | MVP plan execution | Hanya setelah gate slice lulus |

### 30.3 Deliverable per disiplin

| Disiplin | Output yang harus diserahkan |
|---|---|
| Game design | Mission config, objective graph, meaningful choices, hint text, replay variant |
| UX | Screen states, responsive layout, safe area, empty/error states, control alternatives |
| Art | Model/pivot/socket/collider-ready assets, LOD, texture setup, reference sheets |
| Audio | VO manifest, per-locale lines, event map, mix priorities, fallback silent state |
| Engineering | Runtime systems, schema, migration, validators, tests, build instructions |
| QA | Traceable test evidence, device results, regression list, remaining defects |
| Product/producer | Scope gate decision, dependency log, capacity plan, release conditions |

### 30.4 Acceptance untuk “game sudah menarik”

Game belum dianggap berhasil hanya karena semua 12 primitive selesai ditulis. Hasil yang dicari adalah anak mampu:

1. Menunjuk tujuan yang ingin dicapai.
2. Membuat pilihan yang memengaruhi hasil.
3. Menjalankan tindakan dengan kontrol yang nyaman.
4. Menunjukkan perubahan yang terjadi karena tindakannya.
5. Mencoba cara lain ketika tertarik.
6. Menyimpan dan berhenti tanpa kehilangan hasil.

Enam indikator ini harus terlihat pada slice dan tetap ada saat konten diperbanyak.

---

## 31. Traceability perubahan dari konsep awal

| Bagian konsep v2 | Status v3 | Implementasi pengganti / alasan |
|---|---|---|
| Vehicle Hospital sebagai pusat seluruh loop | Diubah | Discovery Garage sebagai hub; repair satu template misi |
| Linear receive → scan → repair → paint → stunt | Diganti | Lima template misi dan tiga skala loop |
| Scanner tiga mode langsung | Dipertahankan bertahap | Observe gejala dahulu; mode kontekstual |
| Pneumatic rotary gesture wajib | Disederhanakan | Hold/tap alternatif; putaran hanya opsional |
| Sparks dari baut | Dihapus | Gerak ulir, dust ringan, click |
| Arc listrik ketika plug masuk | Dihapus | Daya mainan mati saat pemasangan; test menyalakan indikator |
| Hydraulic pump 100% dengan overflow | Dikoreksi | Target band lebar, auto-stop assist, graph aliran |
| CMY dengan warna fantasi dianggap pasti | Dikoreksi | Palet pigmen authored; hasil dan efek dekoratif dipisah |
| Custom Horn Recorder | Ditunda di luar v1 | Preset horn; tanpa permission mikrofon |
| Open physics arena sebagai hadiah akhir | Diperluas dan dikendalikan | Playground tersedia awal; stunt modular W06 |
| Boost 3× + FOV jump + blur | Disederhanakan | Boost opsional dituning; kamera stabil |
| Loop speed tetap 12 m/s | Dihapus | Geometri/model menentukan; loop tidak mandatory |
| Coin earn/sink economy | Diganti | Stiker, badge, kendaraan, world delta deterministik |
| Day 1/2/3/7 calendar unlock | Diganti | Mission prerequisites, tanpa streak |
| Klaim infinite daily retention | Diganti | Replay authored yang bermakna dan sesi yang dapat selesai |
| Unity 2026 LTS | Dikoreksi | Kandidat Unity 6.3 LTS dengan versi patch dikunci setelah spike |
| Vulkan 1.3/Metal 3 wajib | Tidak dijadikan syarat mutlak | Compatibility spike dan device testing |
| Haptic frekuensi spesifik universal | Diganti | Semantic event adapter dan no-op fallback |
| Angka polygon/RAM seolah jaminan | Diubah | Budget awal + metrik profiler/device gate |
| Ketiadaan save, recovery, QA, content schema | Ditambahkan | Bagian 21–27 |
| Belum ada misi konkret end-to-end | Ditambahkan | 30 misi, empat walkthrough, FTUE lima menit |

### 31.1 Apa yang dipertahankan dari ide awal

Kecintaan pada kendaraan, alat interaktif, bengkel, kustomisasi, eksperimen sederhana, gaya visual ceria, dan permainan tanpa transaksi uang nyata tetap menjadi fondasi. Perubahan utama ada pada **tujuan, kebebasan memilih, hubungan antarsistem, serta hasil yang dapat dimainkan kembali**.

### 31.2 Apa yang masih harus dibuktikan

PRD ini memperjelas desain dan implementasi, tetapi belum membuktikan anak pasti menyukai game. Kenyamanan kontrol, durasi misi, respons terhadap tema, kualitas VO, serta replay value harus dinilai melalui prototype dan playtest. Kata “comprehensive” pada dokumen tidak menggantikan pengujian tersebut.

---

## 32. Referensi dan batas klaim

### 32.1 Sumber utama

Lampiran pengguna: `Pasted text.txt`, PRD v2.0.0 *Blippi’s Mega Mechanics: Vehicle Hospital & Stunt Lab*. Dokumen tersebut menjadi baseline audit, bukan bukti bahwa engine version, frekuensi haptics, atau target performanya telah diverifikasi.

### 32.2 Referensi eksternal yang diperiksa pada 10 Oktober 2026

| Ref | Sumber resmi | Digunakan untuk | Batas penggunaan |
|---|---|---|---|
| R1 | [Blippi — situs resmi](https://www.blippi.com/) dan [About Blippi](https://www.blippi.com/about) | Arah eksplorasi, curiosity, dan playful learning | Bukan bukti bahwa konsep game ini resmi atau disetujui pemegang merek |
| R2 | [Unity 6 releases and support](https://unity.com/releases/unity-6/support) | Penamaan rilis LTS dan periode support | Patch/package yang tepat tetap harus diuji saat implementation kickoff |
| R3 | [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) | Kids Category, parental gate, data, recording bila suatu hari ditambahkan | Bukan sertifikasi kepatuhan atau jaminan approval |
| R4 | [Android Developers — Haptics design principles](https://developer.android.com/develop/ui/views/haptics/haptics-principles) | Semantic feedback, penggunaan hemat, fallback perangkat | Tidak menjamin semua perangkat mendukung rich haptics |
| R5 | [Google Play Families Policies](https://support.google.com/googleplay/android-developer/answer/9893335) | Rujukan review distribusi aplikasi untuk anak | Harus diperiksa ulang sesuai fitur dan negara distribusi saat rilis |

Semua struktur misi, jumlah konten, parameter gameplay, anggaran aset, target QA, dan jadwal dalam PRD ini adalah **usulan desain proyek**, kecuali secara eksplisit diatribusikan kepada sumber eksternal. Tidak ada studi efektivitas pendidikan khusus game ini yang telah dilakukan.

### 32.3 Glosarium singkat

| Istilah | Makna dalam dokumen |
|---|---|
| Vertical slice | Potongan kecil game yang menunjukkan loop utama end-to-end |
| MVP | Versi minimum yang lengkap pada scope dua dunia |
| Primitive | Unit mekanik reusable dengan input, aturan, feedback, dan output |
| Meaningful choice | Pilihan yang menghasilkan perubahan gameplay yang terlihat |
| World delta | Perubahan persisten pada dunia setelah tindakan/misi |
| Payoff | Hasil konkret yang bisa dilihat atau dimainkan setelah tugas |
| Loaner | Kendaraan/alat pinjaman agar misi tidak terblokir oleh unlock |
| Idempotent | Operasi berulang tidak memberi hasil tambahan yang tidak semestinya |
| Softlock | Game berjalan tetapi pemain tidak dapat maju atau keluar secara wajar |
| Graybox | Prototype dengan bentuk sederhana untuk menguji permainan |
| Content lock | Titik ketika konten utama dibekukan agar QA dapat stabil |
| RC | Release candidate yang diuji sebelum distribusi |

### 32.4 Urutan eksekusi yang direkomendasikan

**Bangun W01-M01 → uji dengan anak → selesaikan tiga misi vertical slice → perbaiki berdasarkan observasi → baru perluas ke MVP dan v1.** Simpan fokus pada kendaraan yang menyenangkan untuk dikendalikan, pilihan yang mempunyai akibat, dan dunia yang berubah karena karya anak.





