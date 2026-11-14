# PRD-11 Antrean pengulangan lintas game **[ANAK]**

- **Gelombang:** Gelombang 1 — lingkar belajar (inti produk)
- **Status:** live v64.49
- **Sumber:** `docs/PRODUCT-ASSESSMENT-2026-11-10.md` ide #11
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Desain:**
  - `games/data/review-queue.js`: item salah → jadwal 1/3/7 hari per avatar;
  - gerbang soal (peti tanya Timmy, gerbang edu Mojo, Kuis) mengambil satu item jatuh tempo dulu;
  - item disajikan dengan gambar berbeda bila generator mendukung.
- **Laws:**
  - (L1) dengan jam tiruan, item salah hari ini muncul di game lain besok;
  - (L2) tidak lebih dari 1 dari 3 soal berasal dari antrean;
  - (L3) benar → pindah ke 3 hari, lalu 7 hari, lalu keluar;
  - (L4) antrean per avatar.
- **Usaha:** M.

## Hasil (2026-11-14, v64.49)

- `games/data/review-queue.js` (`DuniaReview`), per anak lewat save-engine. Diisi dari bus: jawaban yang membawa
  `review: {a, b, op}`. Salah → muncul besok; benar pada item antrean → 3 hari, lalu 7 hari, lalu keluar; salah lagi →
  kembali besok. Paling banyak satu dari tiga soal, item yang sama tidak dua kali sehari; antrean maksimal 60 item.
- `makeMathQuestionV2` kini mengembalikan `atom {a, b, op}` di setiap bentuk soal (2000 soal acak, 0 tanpa atom) dan
  menerima `opts.atom` untuk menanyakan item yang sama lagi.
- **Kuis Matematika**: mengirim atom tiap jawaban; soal yang akan tampil diganti item jatuh tempo bila cocok dengan
  operasi yang dipilih.
- **Mojo kejar**: soal tambah/kurang membawa atom; item jatuh tempo yang muat dalam 10 (atau 5 untuk tier 1) ditanyakan
  sebagai **gambar** — penyajian berbeda dari teks Kuis.
- **Belum:** peti tanya Timmy memakai bank soal TKQuiz sendiri (bukan soal angka a op b), jadi tidak ikut; dicatat.
- **Gate `qa-review`** 9/9: node L3 jadwal 1/3/7/keluar + salah → besok; L2 sembilan soal dengan lima item jatuh tempo
  → `100100100`; L4 antrean anak kedua kosong. Browser L1: 2 + 1 diketuk salah di Kuis → tidak jatuh tempo hari ini →
  besok di Mojo kejar sebagai gambar (2 koin + 1 koin); L1b 7 − 3 dari kemarin muncul di Kuis sebagai soal di layar.
  Merah: terhadap live v64.48 → exit 1 (`DuniaReview is not defined`).
