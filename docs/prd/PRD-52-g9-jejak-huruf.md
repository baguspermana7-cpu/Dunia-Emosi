# PRD-52 G9 Jejak Huruf: suara, kata bergambar, urutan goresan [ANAK]

- **Gelombang:** Gelombang 5 — sempurnakan (2026-11-21)
- **Status:** belum mulai
- **Sumber:** rencana Gelombang 5 (3 agen eksplorasi + cek ulang file:baris, 2026-11-21)
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Desain:**
  - Huruf dibacakan saat mulai, bunyi SFX tiap goresan selesai, dan pujian suara.
  - Kata dari `SpellingData` dengan gambarnya; 60 → ≥200 kata.
  - Panah urutan goresan dari jalur jejak yang sudah ada.
- **Laws:**
  - L1: tiap huruf A–Z punya ≥3 kata bergambar, atau dilaporkan.
  - L2: suara hanya jika suara menyala.
  - L3: `qa-g9-trace` tetap lulus.
  - L4: 3 ukuran dilihat.
