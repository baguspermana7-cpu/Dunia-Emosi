/*!
 * math-heroes.js — Math adventure HERO roster (window.MATH_HEROES).
 *
 * The adventure hero sprite in games/kuis-matematika.html can swap per chosen
 * skill / operation:
 *   Pahlawan            (+)  — existing hero art
 *   Ksatria Pengurangan (-)
 *   Ksatria Perkalian   (x)
 *   Ksatria Pembagian   (/)
 *
 * Art paths are written relative to the games/ folder (kuis-matematika.html
 * lives in games/ and refers to assets as ../assets/math/...).
 *
 * ES5 only (var, no arrow funcs, no const), IIFE-wrapped, idempotent-guarded
 * to match the rest of the codebase.
 *
 * API:
 *   window.MATH_HEROES            -> Array<{id,name,op,art,desc}>
 *   window.MATH_HEROES.byOp(op)   -> hero for an operation char, defaults to
 *                                    Pahlawan (+). Accepts '+','-','*','/'
 *                                    plus the display glyphs 'x','X','×','÷',':'.
 *
 * TODO(owner): "Putri Pejuang" and other optional heroes await suitable art —
 * add roster entries + assets/math/heroes/<name>.webp when provided. Do not
 * invent placeholder art.
 */
(function () {
  if (window.MATH_HEROES) { return; }

  var HEROES = [
    {
      id: 'pahlawan',
      name: 'Pahlawan',
      op: '+',
      art: '../assets/math/hero-mathhero.webp',
      desc: 'Jagoan penjumlahan yang selalu bersemangat menambah kekuatan!'
    },
    {
      id: 'ksatria-pengurangan',
      name: 'Ksatria Pengurangan',
      op: '-',
      art: '../assets/math/heroes/pengurangan.webp',
      desc: 'Ksatria berjubah hijau yang ahli mengurangi musuh satu per satu.'
    },
    {
      id: 'ksatria-perkalian',
      name: 'Ksatria Perkalian',
      op: '*',
      art: '../assets/math/heroes/perkalian.webp',
      desc: 'Ksatria pemanah yang melipatgandakan serangan lewat perkalian!'
    },
    {
      id: 'ksatria-pembagian',
      name: 'Ksatria Pembagian',
      op: '/',
      art: '../assets/math/heroes/pembagian.webp',
      desc: 'Ksatria berbaju zirah yang membagi tugas berat jadi ringan.'
    }
  ];

  // Normalise the many ways an operation can be written to one of + - * /.
  function normOp(op) {
    if (op === '×' || op === 'x' || op === 'X') { return '*'; } // ×
    if (op === '÷' || op === ':') { return '/'; }              // ÷
    return op;
  }

  // Return the hero matching an operation char; default to Pahlawan (+).
  HEROES.byOp = function (op) {
    var want = normOp(op);
    for (var i = 0; i < HEROES.length; i++) {
      if (HEROES[i].op === want) { return HEROES[i]; }
    }
    return HEROES[0]; // Pahlawan is the default hero
  };

  window.MATH_HEROES = HEROES;
})();
