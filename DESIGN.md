# Dunia Emosi — DESIGN

> Diturunkan dari kode yang sudah berjalan (`style.css`, `games/du-buttons.css`,
> `games/du-hud.css`, `games/g14-hud.css`), bukan dari palet baru. Kalau berkas
> ini berbeda dari kode, kode yang benar dan berkas ini yang harus diperbarui.
> Pasangannya: `PRODUCT.md`.

## Token warna

Sumber tunggal: blok `:root` di `games/du-buttons.css`. Jangan mengarang hex baru
di halaman; pakai variabelnya.

| Peran | Variabel | Nilai |
|---|---|---|
| Merek terang / gelap | `--du-purple-light` / `--du-purple` / `--du-purple-dark` | `#a78bfa` · `#8B5CF6` · `#6d28d9` |
| Sukses, CTA | `--du-green-light` / `--du-green` / `--du-green-dark` | `#4ade80` · `#22c55e` · `#15803d` |
| Hadiah, peringatan | `--du-gold-light` / `--du-gold` / `--du-gold-dark` | `#fde68a` · `#f59e0b` · `#b45309` |
| Permukaan krem | `--du-cream` / `--du-cream-2` / `--du-cream-3` | `#fefdf7` · `#fef9e7` · `#fef3d4` |
| Tinta, teks redup | `--du-ink` / `--du-muted` | `#3b2a4a` · `#6b5b7a` |
| Pastel keadaan | `--du-sage` · `--du-rose` · `--du-powder` (+ `-bg`, `-deep`) | lihat berkas |

Ungu `#8B5CF6` di sini **bukan** ungu-default AI: ia dipilih pemilik untuk
tema claymorphism aplikasi ini dan dipasangkan dengan krem hangat, bukan dengan
abu-abu dingin. Jangan menggantinya karena kelihatan familiar.

HUD punya keluarga tokennya sendiri (`--duh-*` di `games/du-hud.css`): tiap warna
tombol clay dipecah jadi `-top` / `-face` / `-edge` supaya tepi tiga dimensinya
konsisten. Tombol baru mengambil tiga-tiganya, bukan satu warna datar.

## Tipografi

```
--font:         'Nunito', sans-serif      /* teks, label, isi */
--font-display: 'Fredoka One', cursive    /* judul, nama permainan, angka besar */
```

- Judul dan nama permainan: `--font-display`, `font-weight: 900`.
- Isi dan label: `--font`.
- Rasio antar tingkat minimal 1.25×. Skala datar terbaca sebagai "kacau".
- Tidak ada teks bahasa Inggris di jalur yang dilihat anak.

**Catatan jujur soal teks bergradien:** `.welcome-title` dan `.welcome-sub2` di
`style.css` memakai `background-clip: text`. Itu keputusan pemilik untuk layar
sambutan dan **tetap dipertahankan**. Jangan menyebarkannya ke permukaan baru —
di luar dua elemen sambutan itu, judul memakai satu warna solid.

## Bentuk dan permukaan

Bahasa visualnya **claymorphism**: permukaan lunak, sudut besar, tepi bawah yang
lebih gelap sehingga tombol terasa bisa ditekan.

- Radius: 14–18 px untuk kartu dan tombol; jangan membulatkan segalanya sampai
  kehilangan bentuk.
- Kedalaman lewat tepi tiga-lapis (`-top`/`-face`/`-edge`), bukan lewat bayangan
  kabur yang menumpuk.
- Kartu dipakai kalau memang kartu — daftar kereta, pilihan level. Kartu di dalam
  kartu selalu salah.

## Sasaran sentuh dan tata letak

- **Minimal 44 px** tinggi untuk apa pun yang bisa diketuk. Sudah dipakai di 16
  tempat; jadikan aturan, bukan kebiasaan.
- **Lanskap lebar adalah tata letak utama.** Verifikasi di 1600×900 dan
  2400×1080 sebelum yang lain; 1024×600 adalah kasus sempit yang harus tetap
  utuh.
- Tidak boleh ada gulir horizontal pada badan halaman. Tabel/kanvas yang lebar
  menggulir di dalam wadahnya sendiri.
- Renderer PixiJS harus mengikuti ukuran nyata jendela. Menjepit lebar (pernah
  1400) sambil memakai `autoDensity` menghasilkan pita hitam di sisi kanan yang
  **hanya muncul setelah rotasi** — menu terlihat baik-baik saja, permainannya
  tidak.

## Gerak

- Melambat keluar dengan kurva eksponensial (ease-out-quart/quint). **Tanpa
  pantulan, tanpa elastis.**
- Jangan menganimasikan properti tata letak.
- Umpan balik ketukan harus muncul dalam satu bingkai. Anak yang tidak melihat
  reaksi akan mengetuk lagi — dan ketukan ganda cepat itulah yang dulu justru
  membuat lompatan lebih buruk daripada ketukan tunggal.

## Ikon dan sprite

- **Objek yang menentukan permainan digambar atau dimuat eksplisit** lewat
  `PIXI.Assets`, tidak pernah lewat `Sprite.from()` — yang itu cuma pencarian
  cache dan diam-diam mengembalikan `Texture.EMPTY` 1×1 tanpa pernah meminta
  berkasnya.
- Kroma antarmuka memakai `games/data/ui-sprites.js`. Kontraknya: `pixiSprite()`
  tidak boleh mengembalikan sprite tak terlihat — kalau tekstur gagal, ia
  menyelamatkan diri ke glif yang dilukis, dan kalau font perangkat tak punya
  glif itu, ke cakram `#ffd968`. Gerbangnya `tools/_qa-spritecontract.mjs`.
- Chip kategori **diturunkan dari data**, tidak ditulis tangan. Chip tulisan
  tangan hanyut ke dua arah sekaligus: pernah ada chip "Tram" untuk 0 kereta,
  sementara 80 kereta bertipe `character` tidak punya chip sama sekali.
- Kereta menghadap ke arah jalannya permainan. Pencerminan, bukan rotasi.

## Bahasa antarmuka

Indonesia, ramah, pendek.

| Situasi | Tulis | Jangan |
|---|---|---|
| Gagal memuat | "Aduh, gagal memuat. Coba lagi ya." | "Error: failed to load" |
| Perlu memilih dulu | "Pilih keretamu dulu ya, ketuk salah satu di atas." | `alert('Pilih kereta dulu!')` |
| Konfirmasi keluar | Ketuk lagi tombolnya; labelnya berubah jadi "Keluar?" | `confirm('Keluar dari match?')` |
| Kalah | "Coba lagi ya" + apa yang bisa diperbaiki | "Gagal!" saja |

## Yang dilarang

- Emoji sebagai isi permainan atau kroma antarmuka.
- Dialog native di jalur mana pun yang disentuh anak.
- Teks bergradien di luar dua elemen sambutan yang sudah disebut.
- Glassmorphism dekoratif.
- Grid kartu seragam berisi ikon + judul + paragraf, diulang tanpa henti.
- Garis aksen tebal di satu sisi kartu (`border-left` berwarna).
- Menyalin logika berkas bersama ke satu halaman.

## Gerbang sebelum kirim

```bash
node --check <setiap .js yang disentuh>
node tools/normalize-cache-tokens.mjs --check   # satu token per berkas bersama
node tools/_qa-spritecontract.mjs               # sprite tidak boleh tak terlihat
node tools/qa-film-games.mjs                    # harus tetap 17/17
```

Plus: naikkan `CACHE_VERSION` di `sw.js` dan token `?v=` untuk tiap berkas
bersama yang berubah.
