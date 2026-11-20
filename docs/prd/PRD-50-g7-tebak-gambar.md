# PRD-50 G7 Tebak Gambar: sprite, pengecoh satu grup, ronde dengar [ANAK]

- **Gelombang:** Gelombang 5 — sempurnakan (2026-11-21)
- **Status:** belum mulai
- **Sumber:** rencana Gelombang 5 (3 agen eksplorasi + cek ulang file:baris, 2026-11-21)
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Desain:**
  - Bank pindah ke sprite DB `assets/db/lib/<k>.webp`, yang sama dengan G11 dan `TKQuestions`; ≥150 item, dan emoji keluar dari bank.
  - Pengecoh dari grup yang sama.
  - Ronde dengar tiap ronde ke-3 (`duniaCanListen`/`duniaSayLine` dari PRD-42).
  - Mode gambar→kata dan kata→gambar tetap ada. Melapor bahasa/gambar.
- **Laws:**
  - L1: ≥150 item bersprite, 0 emoji di render.
  - L2: pengecoh satu grup.
  - L3: ronde dengar hanya jika ada suara id-ID.
  - L4: 1 sesi tanpa item berulang.
  - L5: 3 ukuran dilihat.
