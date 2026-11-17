# PRD-37 Juice bersama: hit-stop, combo, perayaan

- **Gelombang:** Gelombang 4B — tampilan lebih detail
- **Status:** belum mulai
- **Sumber:** `docs/audit/gameplay-variety-2026-11-17.md` (baca kode per game)
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Masalah:** rasa "kena" dan "berhasil" tidak merata. Hit-stop hanya ada di `games/gt-fx.js` (impact: kilat putih + diam 80-120 ms, baris 9 dan 437) dan `battle-arena.js:782`. Meter combo hanya di G13b (`game.js:10726` `g13bShowCombo`). Ayo Berhitung tanpa perayaan menang besar. Lapisan cinema sudah otomatis menyala pada `VFX.Moment.reward/celebrate` dan `VFX.Poke.impact` (`games/dunia-cinema.js:179-188`), jadi halaman yang tidak memanggil VFX tidak mendapat cahaya itu.
- **Desain:** ekstrak dua modul kecil dari kode yang ada (bukan tulis baru):
  - `games/data/hit-feel.js`: `HitFeel.stop(ms)` (dari gt-fx impact) + kilat dan squash; menghormati gerak-dikurangi (PRD-18);
  - `games/data/combo-meter.js`: dari `g13bShowCombo`, per avatar, tanpa emoji;
  - pasang di G10, G13, G21, G25 (serangan), Ayo Berhitung dan Kuis (combo + `VFX.Moment.celebrate` saat menang, otomatis memicu cahaya cinema).
- **Laws:**
  - (L1) serangan kena → `HitFeel.stop` dipanggil, durasi 60-120 ms terukur (rAF berhenti di layar game);
  - (L2) 3 jawaban benar beruntun → combo terlihat; salah → reset;
  - (L3) gerak-dikurangi on → 0 shake/squash, combo tetap angka;
  - (L4) `qa-action-latency` tidak memburuk; screenshot momen kena dan combo di 3 ukuran dilihat.
- **Usaha:** M.
