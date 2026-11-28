# PRD-59A Kelengkapan Dokumen (Relocation to UAE, menu 1)

Induk: `PRD-59-orang-tua-abudhabi.md`. Owner, 2026-11-28: "Saya akan gunakan itu sebagai panduan utama dan satu2nya
jadi harus comprehensive dan valid dan lengkap ada status progressnya per masing2. Rancang detail PRD masing2 PRD UIUX,
system, skema dll. WF engine semuanya masing2."

**Konsekuensi kalimat "panduan utama dan satu-satunya":** setiap langkah harus bisa dikerjakan tanpa membuka sumber
lain. Setiap langkah menyebut apa, di mana (alamat + jam + peta), bawa apa (asli / fotokopi / lembar / ukuran foto),
berapa lama, berapa biaya (dengan tanggal dan sumber), siapa yang bayar, apa yang dihasilkan, dan apa yang sering
salah. Angka yang tidak bisa dipastikan dari sumber resmi diberi label **Perkiraan** beserta alasannya. Tidak ada
angka karangan.

## 1. Profil dan batas
- Satu orang: WNI (Jakarta / Bekasi), pindah sendiri, **visa kerja** dengan sponsor pemberi kerja di Abu Dhabi.
  Keluarga tidak ikut (keputusan owner 2026-11-28).
- Cakupan: dari persiapan di Indonesia sampai hidup tertib di Abu Dhabi (Emirates ID, rekening bank, lapor diri
  KBRI). SIM ada di PRD-59B.
- Di luar cakupan: visa keluarga, golden visa, pindah barang (kargo), pajak di Indonesia (hanya diberi catatan).

## 2. Struktur konten
### 2.1 Fase (urutan tetap)
| # | Fase | Isi |
|---|---|---|
| 1 | Persiapan di Indonesia | paspor, foto, KTP/KK/akta fotokopi, SKCK bila diminta, medical awal bila diminta, NPWP/BPJS |
| 2 | Legalisasi ijazah | penerjemah tersumpah (bila perlu), legalisasi kampus / Kemendikdasmen-Kemdiktisaintek, Kemenkumham AHU, Kemenlu, Kedutaan UAE Jakarta |
| 3 | Visa dan keberangkatan | tawaran kerja + kontrak MOHRE, entry permit, tiket, asuransi, uang tunai, lapor diri (Peduli WNI) |
| 4 | Setelah tiba di Abu Dhabi | medical fitness, biometrik + Emirates ID, residence visa, atestasi MOFA UAE, kontrak kerja / work permit, SIM card, rekening bank, UAE Pass, tempat tinggal (Tawtheeq), lapor diri KBRI |

### 2.2 Isi satu langkah (wajib semua kolom, uji L2)
`judul`, `untuk apa`, `penerbit`, `lokasi` (nama kantor, alamat lengkap, jam layanan, tautan peta atau kanal
online), `yang dibawa` (daftar item: asli / fotokopi / jumlah lembar / ukuran foto / format berkas), `jumlah lembar`,
`waktu proses`, `biaya` (min, maks, mata uang IDR/AED, tanggal berlaku, perkiraan atau tidak + alasan), `dibayar oleh`
(sendiri / pemberi kerja / tergantung kontrak), `hasil` (dokumen yang keluar), `butuh langkah` (ketergantungan),
`catatan / jebakan`, `sumber` (>= 1 URL resmi), `tanggal cek`.

## 3. UI/UX
### 3.1 Alur layar
```
Halaman awal Dunia Emosi
  └─ [Relocation to UAE]  (pil gelap kecil "Orang tua", di bawah tombol main)
       └─ relokasi-uae.html  (landing: 2 kartu + progres masing-masing)
            ├─ [Kelengkapan Dokumen] -> pindah-abudhabi.html
            └─ [Persiapan SIM]       -> ujian-sim-abudhabi.html (PRD-59B)
```
### 3.2 Halaman Kelengkapan Dokumen (urutan atas ke bawah)
1. Bilah atas lengket: kembali, judul, tombol cetak / PDF.
2. Judul + satu kalimat.
3. **Ringkasan** 4 panel: langkah selesai x dari y + bar; uang yang perlu disiapkan (rendah sampai tinggi, bagian
   sendiri); sudah keluar (jumlah biaya sebenarnya yang diisi); biasanya dibayar pemberi kerja.
4. **Langkah berikutnya**: kartu yang menunjuk langkah pertama yang siap dikerjakan (tidak terkunci, belum selesai),
   dengan tombol "Buka". Ini yang membuat halaman bisa dipakai tanpa berpikir.
5. Baris aksi: Buka semua / Tutup semua, Unduh cadangan, Pulihkan, Saring (Semua / Belum / Sedang / Selesai).
6. Per fase: judul fase, progres fase (x dari y, bar), uang fase, lalu daftar langkah.
7. Satu langkah, tertutup: nomor (atau centang), judul, penerbit, label status, biaya, label "pemberi kerja",
   peringatan "Tunggu langkah n dulu" bila terkunci, progres bawaan (mis. "3/5 berkas siap").
8. Satu langkah, terbuka: semua kolom 2.2; **daftar bawaan berupa kotak centang** (progres per item); tombol status
   Belum / Sedang / Selesai; tanggal mulai dan selesai; biaya sebenarnya (Rp); catatan bebas; tautan sumber.
9. Kurs AED -> Rp yang bisa diubah (bawaan bertanggal + sumber).
10. Kaki: tanggal cek data, kalimat "biaya dan aturan bisa berubah".

### 3.3 Aturan desain (DESIGN.md dikunci + Hallmark floor)
- Token `--du-*` dipetakan ke peran `--u-*` di `games/uae/uae.css`; tidak ada hex di luar blok token.
- Font: Fredoka One judul, Nunito isi; isi >= 16 px.
- Sasaran sentuh >= 48 px (kotak centang bawaan 44 px minimal dengan baris penuh bisa diketuk).
- Kontras >= 4.5; aksi utama ungu gelap `--du-purple-dark` dengan teks putih (4.5+).
- Tidak ada emoji; ikon SVG garis dengan `aria-hidden`.
- Gerak: hanya `transform`/`opacity`, ease-out, tanpa pantulan; `prefers-reduced-motion` dihormati.
- Tata letak: 1 kolom di 390; ringkasan 2x2; isi langkah 2 kolom >= 640 px; lebar maks 760 px di tengah.
- Cetak: bilah atas, tombol, isian disembunyikan; setiap langkah terbuka; satu langkah tidak terbelah halaman.

### 3.4 Status kosong, galat, aksesibilitas
- Belum ada progres: ringkasan 0, "Langkah berikutnya" = langkah 1.
- Pulihkan berkas salah: pesan "Berkas ini cadangan untuk alat lain." (bukan `alert`).
- Penyimpanan penuh / diblokir: toast "Tidak bisa menyimpan di perangkat ini" dan isian tetap jalan.
- Kepala langkah = `<button aria-expanded>`; status = grup tombol `aria-pressed`; toast `role=status`.

## 4. Sistem
### 4.1 Berkas
| Berkas | Peran |
|---|---|
| `games/relokasi-uae.html` | landing 2 menu + progres |
| `games/pindah-abudhabi.html` | kerangka halaman dokumen |
| `games/uae/uae.css` | gaya bersama 3 halaman (token, kontrol, langkah, kuis, cetak) |
| `games/uae/uae-store.js` | simpan / baca / cadangan / pulihkan (`window.UAEStore`) |
| `games/uae/uae-docs-data.js` | **data** langkah (`window.UAEDocs`), bisa di-`require` node |
| `games/uae/uae-flow.js` | **mesin alur kerja** (murni, tanpa DOM), bisa di-`require` node |
| `games/uae/uae-docs.js` | tampilan + interaksi halaman dokumen |
| `tools/test-uae-data.mjs` | uji data (L2) + uji mesin (L8) |
| `tools/qa-prd59-uae.mjs` | uji browser (L1, L3, L6, L9) |

Nol pustaka luar, nol jaringan saat dipakai (tautan sumber dibuka hanya bila diketuk). Bekerja luring setelah
halaman pernah dibuka (service worker yang ada).

### 4.2 Skema data (`uae-docs-data.js`)
```js
UAEDocs = {
  checked: 'YYYY-MM-DD',                    // tanggal riset
  fx: { aedToIdr: Number, asOf: 'YYYY-MM-DD', source: String },
  phases: [{ id: 'prep'|'legal'|'visa'|'arrive', title: String, intro?: String }],
  steps: [{
    id: String,                 // stabil, dipakai sebagai kunci simpanan; JANGAN diganti setelah rilis
    phase: String,              // salah satu phases[].id
    title: String, why: String, issuer: String,
    where: { name: String, address?: String, hours?: String, map?: URL, online?: URL },
    bring: [{ id: String, text: String, copies?: String }],   // item centang; id stabil
    pages: String,              // "1 asli + 2 fotokopi, A4"
    time: String,               // "1-3 hari kerja"
    cost: { min: Number, max: Number, cur: 'IDR'|'AED', asOf: 'YYYY-MM-DD', est: Boolean, note?: String },
    payer: 'self'|'employer'|'either',
    result?: String,            // dokumen yang dihasilkan
    needs: [stepId],            // harus selesai dulu; hanya langkah yang lebih awal
    notes?: String, sources: [URL], checked?: 'YYYY-MM-DD'
  }]
}
```
### 4.3 Skema simpanan (`localStorage['dunia-uae-docs-v1']`)
```js
{ v: 1, fx: Number|null, filter: 'all'|'todo'|'doing'|'done',
  steps: { [stepId]: { status: 'todo'|'doing'|'done', started: 'YYYY-MM-DD'|'', date: 'YYYY-MM-DD'|'',
                       actual: String /* Rp, angka saja */, note: String, bring: { [itemId]: true } } } }
```
- Kunci per perangkat, bukan per anak (alat orang tua).
- Cadangan: `{ tool: 'relokasi-dokumen', version: 1, saved: ISO, data: <simpanan> }`; pulihkan menolak `tool` lain.
- Migrasi: simpanan tanpa `v` dianggap v1; `bring` lama berupa array diubah menjadi objek.

## 5. Mesin alur kerja (`uae-flow.js`, murni)
### 5.1 Status per langkah
```
           mulai / centang item pertama          tandai selesai
  [todo] ───────────────────────────────▶ [doing] ─────────────────▶ [done]
     ▲                                      │  ▲                        │
     └──────────── kembalikan ──────────────┘  └──── buka lagi ─────────┘
  Turunan (tidak disimpan): blocked = ada needs yang belum done; ready = !blocked && status != done
```
- `blocked` tidak mencegah pengguna mencentang (dunia nyata kadang berbeda urutan), tetapi diberi peringatan
  "Tunggu langkah n dulu", dan langkah itu tidak dipilih sebagai "Langkah berikutnya".
- Mencentang item bawaan pertama memindahkan `todo -> doing` (dan mengisi `started`).
- Semua item bawaan tercentang **tidak** otomatis `done` (berkas siap belum berarti kantor sudah memproses); tombol
  "Selesai" yang menyatakan langkah selesai dan mengisi `date`.
- Mengembalikan ke `todo` mengosongkan `date` dan `started` tetapi tidak menghapus centang bawaan dan catatan.

### 5.2 Fungsi
| Fungsi | Hasil |
|---|---|
| `state(steps, saved, id)` | status tersimpan atau bawaan |
| `blockedBy(steps, saved, id)` | langkah `needs` yang belum done |
| `next(steps, saved)` | langkah pertama (urutan data) yang belum done dan tidak terkunci; bila semua terkunci, yang pertama belum done |
| `progress(steps, saved, filter?)` | `{ done, doing, todo, n, items: {checked, total} }` per fase atau keseluruhan |
| `money(steps, saved, fx, filter?)` | `{ min, max, employer, actual }` dalam Rp; hanya bagian sendiri di min/maks |
| `apply(saved, id, patch)` | simpanan baru (tidak memutasi yang lama) dengan aturan transisi 5.1 |
| `validate(data)` | daftar masalah data: id ganda, needs ke depan / siklus, kolom kosong |

## 6. Hukum (merah dulu, lalu hijau)
- L2 data: semua kolom 2.2 ada; biaya angka + mata uang + tanggal; >= 1 URL https; estimasi punya alasan; needs
  hanya ke langkah lebih awal (tanpa siklus); jumlah fase = keseluruhan; >= 20 langkah; tiap fase berisi.
- L8 mesin (node, 2000 urutan acak): `apply` tidak memutasi masukan; transisi sesuai 5.1; `next` tidak pernah
  menunjuk langkah done atau langkah terkunci selama ada yang siap; progres `done+doing+todo = n`; uang min <= maks.
- L3 simpan (browser): status, centang bawaan, biaya, catatan bertahan setelah muat ulang; cadangan dipulihkan di
  profil kosong memberi keadaan sama; berkas alat lain ditolak dengan pesan.
- L9 progres per item (browser): mencentang 1 item mengubah langkah ke "Sedang" dan menampilkan "1/n"; ringkasan,
  fase dan landing menunjukkan angka yang sama dengan `progress()`.
- L6 tampil: 0 galat, tanpa geser samping di 390, target >= 44 px, cetak menampilkan semua langkah, foto 390x844 /
  844x390 / 800x1280 dilihat.

## 7. Status progres pekerjaan (PRD ini, 2026-11-28)
| Bagian | Status | Bukti |
|---|---|---|
| PRD | selesai | dokumen ini |
| Riset dokumen (sumber resmi) | selesai, 7 butir belum terkonfirmasi ditandai "perkiraan" | PRD-59 §5.1 |
| Data `uae-docs-data.js` | selesai: 21 langkah, 4 fase | `test-uae-data` hijau |
| Mesin alur kerja `uae-flow.js` | selesai | `test-uae-engines` 29/0, mutasi merah |
| Halaman + simpan + cadangan + cetak | dibangun | `qa-prd59-uae` (L3/L6/L9) |
| Rilis | belum | menunggu gate penuh |
