/* ============================================================================
 * spelling-data.js — window.SpellingData. Words for G27 "Spelling Adventure".
 *
 * OWNER'S LIST, VERBATIM. Every word here came from the owner's own list for
 * lomba (competition) practice — nothing was invented to pad a category, and
 * every word has a real picture cropped from the owner's asset sheet, so a
 * child never sees a word without knowing what it means.
 *
 * LEVELS, NOT LOCKS. "kata2 itu semua di level 1 dan level 2, dan bisa
 * diulang2 yang level itu. karena utk persiapan lomba" — so a level is a
 * DRILL, not a gate. Level 1 is the short words (<=5 letters), level 2 the
 * long ones. Nothing is ever locked behind a score and a level can be replayed
 * for as long as the child wants; practice is the whole point.
 * ==========================================================================*/
(function () {
  'use strict'
  var W = (typeof window !== 'undefined' ? window : globalThis)

  /* pic = assets/spelling/<dir>/<pic>.webp  ·  id = Indonesian meaning */
  var WORDS = [
    // ── Colors ────────────────────────────────────────────────────────────
    { w: 'blue',   cat: 'colors', dir: 'color', pic: 'blue',   id: 'biru', clue: "It is a color. The sky is often this color." },
    { w: 'red',    cat: 'colors', dir: 'color', pic: 'red',    id: 'merah', clue: "It is a color. Strawberries and fire trucks are this color." },
    { w: 'gray',   cat: 'colors', dir: 'color', pic: 'gray',   id: 'abu-abu', clue: "It is a color. Rain clouds and elephants are this color." },
    { w: 'black',  cat: 'colors', dir: 'color', pic: 'black',  id: 'hitam', clue: "It is a color. The night sky is this color." },
    { w: 'green',  cat: 'colors', dir: 'color', pic: 'green',  id: 'hijau', clue: "It is a color. Grass and leaves are this color." },
    { w: 'brown',  cat: 'colors', dir: 'color', pic: 'brown',  id: 'cokelat', clue: "It is a color. Chocolate and tree trunks are this color." },
    { w: 'white',  cat: 'colors', dir: 'color', pic: 'white',  id: 'putih', clue: "It is a color. Snow and milk are this color." },
    { w: 'pink',   cat: 'colors', dir: 'color', pic: 'pink',   id: 'merah muda', clue: "It is a color. Flamingos and bubble gum are this color." },
    { w: 'yellow', cat: 'colors', dir: 'color', pic: 'yellow', id: 'kuning', clue: "It is a color. The sun and bananas are this color." },
    { w: 'orange', cat: 'colors', dir: 'color', pic: 'orange', id: 'oranye', clue: "It is a color and a fruit. Carrots are this color." },
    { w: 'purple', cat: 'colors', dir: 'color', pic: 'purple', id: 'ungu', clue: "It is a color. Grapes and eggplants are this color." },
    // ── School Objects ────────────────────────────────────────────────────
    { w: 'book',   cat: 'school', dir: 'obj', pic: 'book',   id: 'buku', clue: "You read it. It has pages and a cover." },
    { w: 'pen',    cat: 'school', dir: 'obj', pic: 'pen',    id: 'pena', clue: "You write with it. It uses ink." },
    { w: 'bag',    cat: 'school', dir: 'obj', pic: 'bag',    id: 'tas', clue: "You carry your books to school in it." },
    { w: 'chair',  cat: 'school', dir: 'obj', pic: 'chair',  id: 'kursi', clue: "You sit on it. It has four legs and a back." },
    { w: 'table',  cat: 'school', dir: 'obj', pic: 'table',  id: 'meja', clue: "You eat or work on it. It has a flat top and legs." },
    { w: 'desk',   cat: 'school', dir: 'obj', pic: 'desk',   id: 'meja belajar', clue: "A table where you study and write at school." },
    { w: 'board',  cat: 'school', dir: 'obj', pic: 'board',  id: 'papan tulis', clue: "The teacher writes on it at the front of the class." },
    { w: 'glue',   cat: 'school', dir: 'obj', pic: 'glue',   id: 'lem', clue: "It sticks paper together." },
    { w: 'ruler',  cat: 'school', dir: 'obj', pic: 'ruler',  id: 'penggaris', clue: "You draw straight lines and measure with it." },
    { w: 'pencil', cat: 'school', dir: 'obj', pic: 'pencil', id: 'pensil', clue: "You write and draw with it. You can erase it." },
    { w: 'eraser', cat: 'school', dir: 'obj', pic: 'eraser', id: 'penghapus', clue: "It rubs out pencil mistakes." },
    { w: 'crayon', cat: 'school', dir: 'obj', pic: 'crayon', id: 'krayon', clue: "A colored wax stick for drawing pictures." },
    { w: 'marker', cat: 'school', dir: 'obj', pic: 'marker', id: 'spidol', clue: "A pen with thick color for writing on the board." },
    { w: 'stapler',    cat: 'school', dir: 'obj', pic: 'stapler',    id: 'stapler', clue: "It joins sheets of paper with a small metal clip." },
    { w: 'scissors',   cat: 'school', dir: 'obj', pic: 'scissors',   id: 'gunting', clue: "You cut paper with it. It has two blades." },
    { w: 'computer',   cat: 'school', dir: 'obj', pic: 'computer',   id: 'komputer', clue: "A machine with a screen and a keyboard." },
    { w: 'calculator', cat: 'school', dir: 'obj', pic: 'calculator', id: 'kalkulator', clue: "It helps you add and take away numbers." },
    // ── Everyday Things ───────────────────────────────────────────────────
    { w: 'water',  cat: 'everyday', dir: 'obj', pic: 'water',  id: 'air', clue: "You drink it when you are thirsty." },
    { w: 'door',   cat: 'everyday', dir: 'obj', pic: 'door',   id: 'pintu', clue: "You open it to go into a room." },
    { w: 'bottle', cat: 'everyday', dir: 'obj', pic: 'bottle', id: 'botol', clue: "You keep water or juice inside it." },
    { w: 'window', cat: 'everyday', dir: 'obj', pic: 'window', id: 'jendela', clue: "You look outside through it. It is made of glass." },
  ]

  var CATEGORIES = [
    { key: 'colors',   name: 'Colors',          icon: 'colors',   ready: true },
    { key: 'school',   name: 'School Objects',  icon: 'school',   ready: true },
    { key: 'everyday', name: 'Everyday Things', icon: 'everyday', ready: true },
    { key: 'athome',   name: 'At Home',         icon: 'athome',   ready: false },
    { key: 'quran',    name: "Al-Qur'an",       icon: 'quran',    ready: false },
    { key: 'mixed',    name: 'Mixed Challenge', icon: 'mixed',    ready: true, mixed: true },
  ]

  /* Level 1 = short words, level 2 = long. A DRILL, never a lock. */
  function levelOf (word) { return word.length <= 5 ? 1 : 2 }

  function list (cat, level) {
    var pool = cat === 'mixed' ? WORDS.slice() : WORDS.filter(function (x) { return x.cat === cat })
    if (level) pool = pool.filter(function (x) { return levelOf(x.w) === level })
    return pool
  }

  W.SpellingData = {
    WORDS: WORDS,
    CATEGORIES: CATEGORIES,
    levelOf: levelOf,
    list: list,
    find: function (w) { for (var i = 0; i < WORDS.length; i++) if (WORDS[i].w === w) return WORDS[i]; return null },
    counts: function (cat) { return { l1: list(cat, 1).length, l2: list(cat, 2).length, all: list(cat).length } },
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = W.SpellingData
})()
