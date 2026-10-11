# Garasi Tempur — gameplay rework (owner, 2026-10-11)

Owner: "kalau salah jawab kok masih bisa nyerang? Harusnya nggak bisa, atau cuma 20–30% kekuatannya. Kartu support
harusnya nambah kekuatan atau skill khusus: skip giliran, stun, kurangi kekuatan musuh, dll — masih sangat kurang,
terlalu banyak kartu mobil. Mekanismenya membingungkan — mungkin pakai Life Point atau mekanisme lain yang cocok.
Sempurnakan agar gameplay-nya proper."

Code: games/garasi-tempur.{html,js,css}, games/gt-engine.js (ALL rules + numbers, pure/deterministic), gt-card.js,
gt-quiz.js, gt-fx.js, games/data/gt-cards.js, gt-trucks.js. Today: answer wrong → `resolveAttack` still deals
`pv.total` (only the +2 correct bonus is lost; gt-engine.js ~195–207). RULES at the top of gt-engine.js.

## Target rules (make them simple enough for a 5–7 year old, Pokemon-TCG-pocket feel)
1. **Answer decides the hit**: correct = full power (+ bonus, + Nitro); wrong = 25% of the power (rounded down,
   min 0), shown as a "lemah" glancing hit, with the kind explanation of the right answer. Engine-tested.
2. **Life Points**: each player has 3 LIFE (hearts) at the top; a knocked-out truck costs 1 life; 0 lives = lose.
   Replace the KO_TO_WIN counter in the UI with hearts; truck HP bars stay on the cards.
3. **Deck shape**: ~6 trucks + ~14 support cards (now mostly trucks). Support types, each with a clear icon + 1-line
   effect: Turbo (+2 power this turn), Perisai (block next 2 damage), Rem Darurat (opponent skips next turn),
   Lumpur/Stun (opponent's truck can't attack next turn), Tumpahan Oli (−2 to the opponent's next attack), Bengkel
   (heal 3), Tukar Ban (swap in a benched truck free), Nitro Isi (+1 Nitro). Status shown as badges on the truck.
4. **Turn flow made obvious**: a 3-step strip "1 Pasang kartu → 2 Serang (jawab soal) → 3 Selesai", the next legal
   action glows; illegal cards greyed with a reason.
5. AI uses the same rules (plays supports sensibly). Keep questions via SoalEngine (70% maths).
Gates: extend the existing GT engine tests (find tools/qa-garasi* / test-gt*) for: wrong = 25%, lives, each support
effect, skip/stun expiry; play a full match by real input at 390x844 and 1280x800 and look at the frames.
