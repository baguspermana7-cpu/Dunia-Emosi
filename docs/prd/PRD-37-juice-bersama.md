# PRD-37 Juice bersama: hit-stop, combo, perayaan

- **Gelombang:** Gelombang 4B — tampilan lebih detail
- **Status:** live v64.66
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

## Hasil (2026-11-20, v64.66)
- `games/data/hit-feel.js` (`HitFeel.stop/flash/squash/hit/frozen`), lifted from the gt-fx impact step: white flash
  frame, then every running animation on the page holds 80-120 ms, then a squash. `frozen()` lets a rAF loop hold too.
- `games/data/combo-meter.js` (`ComboMeter.create(id, {anchor})`), from `g13bShowCombo`: "COMBO xN" from 3 right in a
  row, a wrong answer hides it, best streak kept per child (avatarScopedSet). No emoji. With an anchor the pill sits
  above that element (Kuis: above the question card; first placed top centre, it covered the monster's story line).
- Wired: G10 and G13 hits (game.js, hub loads hit-feel.js), G21 Mario Pokemon stomp (the loop holds 80/110 ms),
  Kuis Matematika (attack hold, combo meter replaces its own "COMBO x" text, a won level runs
  `VFX.Moment.celebrate`), Ayo Berhitung (combo on finished answers; a finished page celebrates, the VFX files load
  only then).
- Gate `tools/qa-prd37-juice.mjs` (static part in ci-verify; browser part run-gates tag `juice`), Kuis at 3 sizes +
  reduced motion. Red on v64.65 (static 0/5, browser 4 fails: modules absent). Green 17/17:
  - L1 the hit holds 92-105 ms, 0 running animations inside the hold, animations play on after it;
  - L2 3 right -> "COMBO x3" on screen; a wrong answer hides it;
  - L3 reduced motion: 0 holds, the combo still shows x3, no bump;
  - L4 0 page errors; screenshots of the hit + combo at 390x844, 844x390, 800x1280 looked at.
