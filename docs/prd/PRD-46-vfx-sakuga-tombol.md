# PRD-46 VFX sakuga di tombol semua game

- **Gelombang:** Gelombang 4B — tampilan lebih detail (permintaan owner 2026-11-17)
- **Status:** belum mulai
- **Sumber:** owner: "Adding vfx ini di button2 semua game dunia emosi biar bagus, pastikan semua. Tapi tetap keren dan proper" — https://github.com/finktheartist/sakuga-vfx (MIT, Justin Finkelman, commit `c3dabb17`, 2026-11-15)
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

## Apa yang dipakai dari repo itu
- `core.js` (258 baris, 40 KB, tanpa dependensi): `window.SakugaFX` = pegas (`Spring`, `squashy`), dan efek gambar di SATU canvas di atas halaman: `burst`, `shards`, `puff`, `ticks`, `wob`, `donut`, `kira`, `ring`, `slash`, `lines`. Loop rAF hanya jalan selama ada efek hidup (`start()` saat dibutuhkan), dan efek mati sendiri pada `prefers-reduced-motion`.
- **Tidak** dipakai: elemen `<sakuga-button>` (mengganti tombol = memecah gaya dan handler 27 halaman), dan tulisan onomatope Jepang (`ドン!`, `ズザッ`, `ポン`): anak Indonesia 5-10 tahun tidak membacanya. Warna lavender/ungu bawaan diganti warna tombol itu sendiri.

## Desain
- Vendor `core.js` apa adanya ke `games/vendor/sakuga/core.js` (header lisensi MIT + sha commit; `THIRD_PARTY.md` mencatatnya). Tidak di-CDN: aplikasi harus jalan offline. Masuk precache `sw.js`.
- Satu modul baru `games/data/dunia-sakuga.js` yang MENGHIAS tombol yang sudah ada lewat delegasi `pointerdown`/`click` di `document` (tanpa ubah markup, tanpa ubah handler game):
  - **Kelas tombol** (dipilih dari elemen, urutan pertama yang cocok):
    1. *kontrol cepat* — panah/d-pad/tombol lompat/kanvas game (ditekan berkali-kali per detik): hanya squash pegas kecil, tanpa partikel (aturan frekuensi: aksi yang sering tidak boleh berisik dan tidak boleh menambah beban frame);
    2. *utama* — mulai/main/ayo/lanjut/pilih level/kartu game di hub: squash → pop 115-124 % → burst + shards + 4 puff (impact penuh);
    3. *jawaban* — tombol pilihan jawaban: squash + wedge saat ditekan; burst + kira hanya bila jawaban BENAR (pendengar `DuniaBus 'answer' ok` → efek di tombol yang terakhir ditekan); salah = goyang kecil `wob`, tanpa perayaan;
    4. *sekunder* — kembali/tutup/suara/pengaturan: squash kecil + 3 wedge di sudut.
  - Warna efek dari tombol itu sendiri (`getComputedStyle` background/border → dua tone: terang + garis gelap), bukan ungu bawaan.
  - Menghormati `prefers-reduced-motion` DAN setelan profil gerak-dikurangi (`DuniaProfile`, PRD-18): efek mati, squash tetap sangat kecil atau mati.
  - Tombol `disabled` tidak bereaksi. Canvas `pointer-events:none`, `aria-hidden`.
- Dimuat di hub + 26 halaman game (`games/_*.html` dikecualikan; `blippi.html` hanya halaman pembungkus, iframe game1 tidak disentuh).

## Laws
- (L1) **Semua halaman:** 27/27 halaman memuat `core.js` + `dunia-sakuga.js` dan keduanya ada di SHELL `sw.js` (gate statis di ci-verify). Merah: hapus satu tag → gagal.
- (L2) **Efek benar-benar tergambar:** di tiap halaman, gate menekan satu tombol utama yang terlihat (sama cara tapper `qa-action-latency`) dan memeriksa canvas efek punya piksel non-transparan dalam 300 ms, lalu kembali kosong dan loop rAF berhenti dalam 2,5 s (tidak ada loop abadi). Halaman tanpa tombol utama dilaporkan, bukan dilewati diam-diam.
- (L3) **Proper:** kontrol cepat → 0 partikel (hanya transform); jawaban salah → 0 burst; gerak-dikurangi (media query DAN setelan profil) → 0 piksel efek; tombol disabled → 0 efek; 0 teks onomatope; 0 `pageerror`.
- (L4) **Tidak memperberat:** `qa-action-latency` L2 (median dengan vs tanpa ≤ 25 ms) lulus; survey perf (`qa-perf-survey.mjs`) play-p95 tidak naik melewati kebisingan pada 6 halaman paling sibuk; handler game tetap jalan (gate tiap game yang disentuh lulus lewat runner).
- (L5) **Mata:** screenshot di tengah impact (jam dihentikan, seperti `look.mjs` repo) untuk hub + 5 game berbeda di 390x844, 844x390, 800x1280 — saya lihat sendiri: efek mengikuti warna tombol, tidak terpotong `overflow:hidden` (bila terpotong, canvas dipasang di `document.body`), tidak menutupi teks soal.

## Usaha
M.
