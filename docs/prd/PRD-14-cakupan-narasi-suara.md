# PRD-14 Cakupan narasi suara **[ANAK — suara baru]**

- **Gelombang:** Gelombang 2 — pengalaman anak & orang tua
- **Status:** belum mulai
- **Sumber:** `docs/PRODUCT-ASSESSMENT-2026-11-10.md` ide #14
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Desain:**
  - ekstrak string instruksi (dari daftar PRD-15) → `games/data/narration-map.json`;
  - pra-render klip id-ID dengan VoiceStudio OmniVoice lokal (docker :3900; CPU ~5 menit/baris, jalan batch semalaman), dikompres opus 24 kbps;
  - pemutar bersama `games/data/narrate.js` dengan fallback TTS seperti `games/tk-hub.js:88-117`, dan menghormati setelan narasi (PRD-18).
  - Fase: layar mulai tiap game dulu, lalu instruksi dalam game.
- **Laws:**
  - (L1) gate: setiap instruksi di layar mulai tiap game punya klip (merah sekarang);
  - (L2) total ukuran tambahan dicatat dan masuk precache tanpa melanggar batas prune Pages;
  - (L3) offline gate memutar klip tanpa jaringan;
  - (L4) saya dengarkan sampel acak 10 klip (transkrip Whisper-lokal cocok dengan teks).
- **Usaha:** L.
