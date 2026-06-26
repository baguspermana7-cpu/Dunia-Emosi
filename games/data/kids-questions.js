/* =============================================================================
 * kids-questions.js  (v54.69 foundation skeleton — extended per tranche)
 * =============================================================================
 * Age-tiered question pool for ObstacleEngine question gates.
 * Tagged so obstacles can filter (shape, color, count, animal, letter, safety).
 *
 * Difficulty per spec §30:
 *   Age 4: colors, shapes, count 1-3
 *   Age 5: count 1-5 + simple matching
 *   Age 6: count 1-10 + simple addition 1+1
 *   Age 7: pattern + memory sequence
 *
 * Schema: { tags:[string], q:string, options:[string], correct:number,
 *           age:'4'|'5'|'6'|'7', voicePrompt?:string }
 *
 * v54.69 seeds ~50 questions. Tranches v54.71/v54.74 grow to ~150.
 * ========================================================================== */

;(function (global) {
  'use strict'

  global.KidsQuestions = [
    // ── SHAPES (age 4-5) ──────────────────────────────────────────────────
    { tags:['shape'], age:'4', q:'Mana segitiga?',     options:['▲','⬤','■'], correct:0, voicePrompt:'Mana segitiga?' },
    { tags:['shape'], age:'4', q:'Mana lingkaran?',    options:['■','⬤','▲'], correct:1, voicePrompt:'Mana lingkaran?' },
    { tags:['shape'], age:'4', q:'Mana persegi?',      options:['▲','⬤','■'], correct:2, voicePrompt:'Mana persegi?' },
    { tags:['shape'], age:'5', q:'Mana bintang?',      options:['⭐','⬤','▲'], correct:0, voicePrompt:'Mana bintang?' },
    { tags:['shape'], age:'5', q:'Mana hati?',         options:['■','❤️','▲'], correct:1, voicePrompt:'Mana hati?' },
    { tags:['shape'], age:'5', q:'Mana setengah lingkaran?', options:['◑','■','▲'], correct:0 },
    { tags:['shape'], age:'5', q:'Mana panah?',        options:['➡️','⬤','▲'], correct:0 },

    // ── COLORS (age 4-5) ──────────────────────────────────────────────────
    { tags:['color'], age:'4', q:'Mana yang merah?',   options:['🔴','🟢','🔵'], correct:0, voicePrompt:'Mana yang merah?' },
    { tags:['color'], age:'4', q:'Mana yang hijau?',   options:['🔴','🟢','🔵'], correct:1, voicePrompt:'Mana yang hijau?' },
    { tags:['color'], age:'4', q:'Mana yang biru?',    options:['🔴','🟢','🔵'], correct:2, voicePrompt:'Mana yang biru?' },
    { tags:['color'], age:'5', q:'Mana yang kuning?',  options:['🟡','🟢','🔵'], correct:0 },
    { tags:['color'], age:'5', q:'Mana yang ungu?',    options:['🔴','🟣','🔵'], correct:1 },
    { tags:['color'], age:'5', q:'Mana yang oranye?',  options:['🟠','🟢','🔵'], correct:0 },
    { tags:['color'], age:'5', q:'Mana yang pink?',    options:['🩷','🟢','🔵'], correct:0 },

    // ── COUNT 1-3 (age 4) ─────────────────────────────────────────────────
    { tags:['count'], age:'4', q:'Berapa? ⭐',         options:['1','2','3'], correct:0 },
    { tags:['count'], age:'4', q:'Berapa? ⭐⭐',        options:['1','2','3'], correct:1 },
    { tags:['count'], age:'4', q:'Berapa? ⭐⭐⭐',       options:['1','2','3'], correct:2 },
    { tags:['count'], age:'4', q:'Berapa apel? 🍎🍎',  options:['1','2','3'], correct:1 },
    { tags:['count'], age:'4', q:'Berapa kucing? 🐱🐱🐱', options:['1','2','3'], correct:2 },

    // ── COUNT 1-5 (age 5) ─────────────────────────────────────────────────
    { tags:['count'], age:'5', q:'Berapa? 🌟🌟🌟🌟',    options:['3','4','5'], correct:1 },
    { tags:['count'], age:'5', q:'Berapa? 🍎🍎🍎🍎🍎',  options:['3','4','5'], correct:2 },
    { tags:['count'], age:'5', q:'Berapa kereta? 🚂🚂🚂', options:['2','3','4'], correct:1 },

    // ── ANIMALS (age 4-5) ─────────────────────────────────────────────────
    { tags:['animal'], age:'4', q:'Mana yang mengeong?',     options:['🐶','🐱','🐮'], correct:1 },
    { tags:['animal'], age:'4', q:'Mana yang menggonggong?', options:['🐶','🐱','🐮'], correct:0 },
    { tags:['animal'], age:'5', q:'Mana sapi?',              options:['🐶','🐱','🐮'], correct:2 },
    { tags:['animal'], age:'5', q:'Mana bebek?',             options:['🦆','🐱','🐶'], correct:0 },
    { tags:['animal'], age:'5', q:'Mana kambing?',           options:['🐐','🐱','🐶'], correct:0 },
    { tags:['animal'], age:'5', q:'Mana burung?',            options:['🦆','🐦','🐶'], correct:1 },
    { tags:['animal'], age:'5', q:'Mana ikan?',              options:['🐟','🐦','🐶'], correct:0 },

    // ── LETTERS (age 5-6) ─────────────────────────────────────────────────
    { tags:['letter'], age:'5', q:'Mana huruf A?', options:['A','B','C'], correct:0 },
    { tags:['letter'], age:'5', q:'Mana huruf B?', options:['A','B','C'], correct:1 },
    { tags:['letter'], age:'5', q:'Mana huruf C?', options:['A','B','C'], correct:2 },

    // ── NUMBERS (age 5-6) ─────────────────────────────────────────────────
    { tags:['number'], age:'5', q:'Mana angka 1?', options:['1','2','3'], correct:0 },
    { tags:['number'], age:'5', q:'Mana angka 3?', options:['1','2','3'], correct:2 },
    { tags:['number'], age:'6', q:'Mana angka 5?', options:['3','4','5'], correct:2 },
    { tags:['number'], age:'6', q:'Mana angka 7?', options:['5','6','7'], correct:2 },

    // ── SIMPLE MATH (age 6-7) ─────────────────────────────────────────────
    { tags:['math'], age:'6', q:'1 + 1 = ?', options:['1','2','3'], correct:1 },
    { tags:['math'], age:'6', q:'2 + 1 = ?', options:['2','3','4'], correct:1 },
    { tags:['math'], age:'7', q:'2 + 2 = ?', options:['3','4','5'], correct:1 },
    { tags:['math'], age:'7', q:'3 + 2 = ?', options:['4','5','6'], correct:1 },
    { tags:['math'], age:'7', q:'4 + 1 = ?', options:['4','5','6'], correct:1 },

    // ── SAFETY / DIRECTION (age 5+) ───────────────────────────────────────
    { tags:['safety'], age:'5', q:'Saat sinyal merah, kereta harus?', options:['Berhenti ✋','Pelan 🐢','Maju ➡️'], correct:0 },
    { tags:['safety'], age:'5', q:'Saat sinyal hijau, kereta?',       options:['Berhenti ✋','Pelan 🐢','Maju ➡️'], correct:2 },
    { tags:['safety'], age:'5', q:'Saat sinyal kuning, kereta?',      options:['Berhenti ✋','Pelan 🐢','Maju ➡️'], correct:1 },
    { tags:['safety'], age:'5', q:'Mana yang kanan?',                 options:['⬅️','➡️','⬆️'], correct:1 },
    { tags:['safety'], age:'5', q:'Mana yang kiri?',                  options:['⬅️','➡️','⬆️'], correct:0 },

    // ── COMPARISON (age 6) ────────────────────────────────────────────────
    { tags:['comparison'], age:'6', q:'Mana yang lebih besar?', options:['🚂','🚆'], correct:1 },
    { tags:['comparison'], age:'6', q:'Mana yang lebih kecil?', options:['🐘','🐭'], correct:1 },
    { tags:['comparison'], age:'6', q:'Mana yang lebih panjang?', options:['🚃🚃🚃','🚃'], correct:0 },
    { tags:['comparison'], age:'6', q:'Mana yang lebih tinggi?', options:['🌳','🌱'], correct:0 },
    { tags:['comparison'], age:'7', q:'Mana yang lebih banyak?', options:['⭐⭐⭐⭐','⭐⭐'], correct:0 },

    // ── EXTENDED v54.71 — more shapes, more colors, more counts ─────────────
    { tags:['shape'], age:'6', q:'Mana belah ketupat?', options:['◆','⬤','■'], correct:0 },
    { tags:['shape'], age:'6', q:'Mana segi enam?', options:['⬢','⬤','▲'], correct:0 },
    { tags:['shape'], age:'7', q:'Mana segi delapan?', options:['◯','⯁','⬤'], correct:1 },

    { tags:['color'], age:'5', q:'Mana yang putih?', options:['⚪','⚫','🔵'], correct:0 },
    { tags:['color'], age:'5', q:'Mana yang hitam?', options:['⚪','⚫','🔵'], correct:1 },
    { tags:['color'], age:'6', q:'Mana yang coklat?', options:['🟫','🟢','🔵'], correct:0 },

    { tags:['count'], age:'5', q:'Berapa? 🐱🐱🐱🐱', options:['3','4','5'], correct:1 },
    { tags:['count'], age:'6', q:'Berapa? 🐱🐱🐱🐱🐱🐱', options:['5','6','7'], correct:1 },
    { tags:['count'], age:'6', q:'Berapa kereta? 🚂🚂🚂🚂🚂🚂🚂', options:['6','7','8'], correct:1 },

    { tags:['number'], age:'6', q:'Mana angka 8?', options:['6','7','8'], correct:2 },
    { tags:['number'], age:'7', q:'Mana angka 10?', options:['8','9','10'], correct:2 },

    { tags:['math'], age:'7', q:'5 + 1 = ?', options:['5','6','7'], correct:1 },
    { tags:['math'], age:'7', q:'3 + 3 = ?', options:['5','6','7'], correct:1 },
    { tags:['math'], age:'7', q:'4 + 2 = ?', options:['5','6','7'], correct:1 },

    { tags:['animal'], age:'6', q:'Mana hewan yang terbang?', options:['🐦','🐱','🐟'], correct:0 },
    { tags:['animal'], age:'6', q:'Mana hewan yang berenang?', options:['🐦','🐱','🐟'], correct:2 },
    { tags:['animal'], age:'5', q:'Mana kelinci?', options:['🐰','🐶','🐱'], correct:0 },
    { tags:['animal'], age:'5', q:'Mana gajah?', options:['🐘','🐶','🐱'], correct:0 },

    { tags:['safety'], age:'6', q:'Saat hewan menyeberang, kereta?', options:['Berhenti ✋','Cepat ➡️','Maju 🐢'], correct:0 },
    { tags:['safety'], age:'6', q:'Mana yang membantu kita lihat malam?', options:['🔦','🥖','🌧️'], correct:0 },
    { tags:['safety'], age:'5', q:'Mana yang dipakai saat hujan?', options:['☔','🧢','🥾'], correct:0 },
  ]

})(typeof window !== 'undefined' ? window : globalThis);
