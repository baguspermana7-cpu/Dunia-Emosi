# PRD-52 G9 Jejak Huruf: bunyi goresan, kata bergambar, urutan goresan [ANAK]

- **Gelombang:** Gelombang 5 — sempurnakan (2026-11-21)
- **Status:** belum mulai
- **Sumber:** rencana Gelombang 5 (3 agen eksplorasi + cek ulang file:baris, 2026-11-21)
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Desain:**
  - Bunyi SFX tiap goresan selesai. (Revisi 2026-11-22, PRD-55: huruf tidak dibacakan, tidak ada pujian lisan.)
  - Kata dari `SpellingData` dengan gambarnya; 60 → ≥200 kata.
  - Panah urutan goresan dari jalur jejak yang sudah ada.
- **Laws:**
  - L1: tiap huruf A–Z punya ≥3 kata bergambar, atau dilaporkan.
  - L2: SFX goresan hanya jika suara menyala; 0 panggilan `speechSynthesis.speak`.
  - L3: `qa-g9-trace` tetap lulus.
  - L4: 3 ukuran dilihat.
