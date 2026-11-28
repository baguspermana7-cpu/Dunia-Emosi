# PRD-60: Learning Adventure untuk belajar bahasa Inggris (kelas 2-6 SD + mode dewasa)

Status: **dicatat, belum dirancang** (owner 2026-11-28). Ini task terpisah dari PRD-59; dikerjakan sesudah PRD-59 rilis.

## Permintaan owner (verbatim)
"learning adventure itu kembangkan juga, ini task lain catat aja utk bisa belajar bahasa inggris, kembangkan ini utk
anak kelas 2-6 sd dan ada mode orang dewasa utk istri saya persiapan relokasi ke uae agar lancar bahasa inggris"

## Yang dimaksud
- "Learning Adventure" = G28 The Stinky & Dirty Show (`games/stinky-dirty.html`, kartu di peta dunia sebelah G27
  Spelling Adventure): cerita lalu kartu soal, 6 dunia.
- Dikembangkan menjadi jalur belajar bahasa Inggris:
  1. **Anak kelas 2-6 SD**: level per kelas (kosakata, kalimat, membaca, mendengar), mengikuti kurikulum bahasa
     Inggris SD Indonesia; per anak, tersimpan per avatar seperti game lain.
  2. **Mode dewasa** (istri owner, persiapan relokasi UAE): bahasa Inggris sehari-hari untuk hidup di Abu Dhabi
     (belanja, dokter, sekolah anak, bank, kantor pemerintah, sopir/taksi, tetangga), level CEFR A1-B1, tidak
     memakai karakter anak.

## Suara (owner 2026-11-28, verbatim)
"ttsnya jangan yang generic yang bener2 accurate bener2 natural kan ada toolsnya kan dari github yang sudah ada"
- Bukan TTS bawaan browser (speechSynthesis). Audio dibuat sekali di home lab dengan model TTS open-source yang
  sudah ada, lalu disimpan sebagai berkas (Opus/WebM) per kalimat, supaya tetap jalan luring dan sama di semua
  perangkat.
- Kandidat untuk dinilai saat rancang (dengar sampel, bukan percaya klaim): VoiceStudio/OmniVoice yang sudah
  terpasang (docker :3900), Kokoro-82M (Apache-2.0), Piper (MIT, suara en_US/en_GB). Pilih lisensi yang mengizinkan
  distribusi audio, tanpa layanan berbayar.
- Aksen: anak en (umum); mode dewasa sebaiknya mendengar juga aksen yang lazim di UAE bila model punya.
- Hukum suara: setiap kalimat punya berkas audio yang ada di manifest luring; ejaan yang diucapkan cocok dengan teks
  (uji transkrip balik dengan ASR lokal, mis. whisper.cpp, WER <= 5 %); sampel didengar dan dicatat.

## Pertanyaan terbuka untuk tahap rancang (diputuskan di PRD lengkap)
- Mode dewasa di dalam G28 atau halaman sendiri di bawah "Relocation to UAE" (PRD-59)?
- Sumber kurikulum dan daftar kata (bebas lisensi), cara mengukur kemajuan (Leitner seperti UAEQuiz).

## Hukum awal (dipertajam saat rancang)
- L1 setiap soal punya teks EN + terjemahan ID, jawaban tunggal, level (kelas 2-6 atau CEFR), sumber.
- L2 kemajuan tersimpan per anak / per profil dewasa, selamat reload, ada cadangan.
- L3 main dengan ketukan nyata di 390x844, 844x390, 800x1280: 0 error, 0 emoji, foto dilihat.

## Permintaan lanjutan owner (2026-11-28, verbatim)
1. "yang spelling learning juga improve dengan kata2 yang common dipakai untuk percakapan, dan mungkin bisa
   dikembangkan jadi selain kata2 ke kalimat2 misalnya melengkapi kalimat, buat sekitar 10-30 level, kalimat itu
   dibagi percakapan2 sehari2 buat enginenya, dan ada 3 mode easy-medium-hard itu pemilihannya pada halaman awal game
   spelling learning atau learning stinky and dirty"
2. "sempurnakan buat bener2 terstruktur model belajarnya bener2 super comprehensive mungkin buat enginenya buat aja
   10000-50000 kalimat yang kaya, agar nggak terlihat banyak dibagi perlevel atau kategory, rancang bener2 terstruktur
   dan rancang metodenya agar sangat mudah diikuti oleh anak SD kelas 2 SD keatas dan ada mode anak kecil dan dewasa
   (utk istri saya), deploy agent utk develop ini, while the main membuat yang kelengkapan relokasi dan sim itu"
3. "gambar, object, icon, harus accurate, jangan ada bug, error atau aneh2 jangan pakai emoji, dan harus bener2 bagus
   dan mudah dilihat dan valid. deploy agent utk audit dan memberikan rekomendasi2 action utk perbaikan"

Status: dirancang dan dibangun oleh agen terpisah di worktree sendiri (2026-11-28); main session meninjau,
menguji ulang dan merilis.
