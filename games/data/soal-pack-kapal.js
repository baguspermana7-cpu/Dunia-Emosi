/* =============================================================================
 * soal-pack-kapal.js — SoalEngine pack 'kapal' + the G30 game profile 'g30'.
 * Timmy & Kapal Legendaris draws EVERY question through SoalEngine.pick({game: 'g30', ...}).
 *
 * The curated items stay in games/data/tk-questions.js (window.TKQuestions.items) — registered here
 * as-is and read lazily, so the bank can grow (or load after this file) without touching this one.
 * Tagging: grade 2 (= Kelas 1–2, fase A) or 3 / 4 (Sulit), level 1–4, world -> theme.
 * Load order: soal-engine.js, soal-gen-matematika.js, this file (tk-questions.js before or after).
 * ==========================================================================*/
(function () {
  'use strict'
  var W = (typeof window !== 'undefined' ? window : globalThis)
  var SE = W.SoalEngine
  if (!SE) return

  SE.registerPack('kapal', {
    items: function () { return (W.TKQuestions && W.TKQuestions.items) || [] },
    meta: { theme: 'kapal', grade: 2 }
  })

  // generated-math objects per world (sprite key + the noun the story uses)
  var NOUNS = {
    _: [['game/crate-wood', 'peti'], ['game/barrel', 'tong'], ['animals/clownfish', 'ikan'], ['game/star', 'bintang']],
    kamar: [['toys/rubber-duck', 'bebek karet'], ['game/star', 'bintang']],
    titanic: [['game/crate-wood', 'peti'], ['school/backpack-brown', 'tas'], ['game/lifebuoy', 'pelampung']],
    britannic: [['things/first-aid-kit', 'kotak obat'], ['food/water-bottle', 'botol air']],
    vasa: [['game/barrel', 'tong'], ['game/crate-wood', 'peti']],
    cuttysark: [['food/mug', 'cangkir teh'], ['game/crate-wood', 'peti']],
    victory: [['game/flag-red', 'bendera'], ['game/barrel', 'tong']],
    mayflower: [['food/apple', 'apel'], ['food/bread', 'roti'], ['game/barrel', 'tong']],
    endurance: [['animals/penguin', 'penguin'], ['game/crystal-ice', 'bongkah es']],
    kontiki: [['food/coconut', 'kelapa'], ['animals/clownfish', 'ikan']],
    calypso: [['animals/clownfish', 'ikan'], ['animals/starfish', 'bintang laut'], ['animals/sea-turtle', 'penyu']],
    queenmary: [['school/backpack-brown', 'tas'], ['game/crate-wood', 'peti']],
    arizona: [['game/flag-red', 'bendera'], ['game/crate-wood', 'peti']],
    missouri: [['game/flag-red', 'bendera'], ['game/crate-wood', 'peti']],
    nautilus: [['animals/clownfish', 'ikan'], ['animals/pufferfish', 'ikan buntal']]
  }

  SE.defineGame('g30', {
    'extends': 'default',
    topics: ['matematika', 'umum', 'logika', 'islam', 'arab'],
    // owner 2026-09-29: "jangan banyak soal kata Arab, matematika 50%"
    weights: { matematika: 50, umum: 15, logika: 15, islam: 12, arab: 8 },
    maxShare: { arab: 0.08 },     // actual mixed picks, including Islam-off and one-card action challenges
    topicGap: { arab: 4 },        // no more than one Arabic item in any four mixed picks
    exclusionOverrides: { islam: { weights: { matematika: 50, umum: 21, logika: 21, islam: 0, arab: 8 } } },
    themes: ['kapal'],
    packs: ['kapal'],            // fase A content rules are stricter than the general pools (see the standard)
    general: false,
    subThemeShare: 0.8,          // a world's own items 80 % of the time
    grade: { mudah: 2, sulit: 4, kelas1: 2, kelas2: 2, adaptif: 2 },
    sulitShare: 0.7,
    choices: { easy: 3, normal: 4 },
    pictures: 'sprite',          // G27–G30: sprites, never emoji
    nouns: NOUNS,
    vocab: { place: 'kapal', deck: 'dek', load: 'dimuat', unload: 'diturunkan', carrier: 'Kapal', box: 'sekoci', crate: 'peti', seat: 'Sekoci', rope: 'Tali jangkar', cheer: 'Semua {noun} naik ke kapal!' },
    mathKinds: { queenmary: [['clock', 60]] },
    maxWords: { 1: 16, 2: 16, 3: 18, 4: 18 },
    stopWords: ['kapal', 'timmy'],
    scope: 'game',
    contexts: {
      // a lanes / cinema collision card: one quick question, no letter-arranging, no listen-only Arabic
      challenge: { maxWords: { 1: 14, 2: 14, 3: 16, 4: 16 }, without: ['letters', 'listen'] },
      // a world quiz step: arrange-letters is an Arabic lesson of its own, never inside a mixed step
      quiz: { without: ['letters'] }
    }
  })
})()
