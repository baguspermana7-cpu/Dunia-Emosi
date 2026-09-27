/* ============================================================================
 * spelling-data.js — window.SpellingData. Words for G27 "Spelling Adventure".
 *
 * OWNER'S LIST, VERBATIM, for Colors, School Objects and Everyday Things --
 * the owner's own list for lomba (competition) practice, each word pictured
 * from the owner's asset sheet. At Home and Al-Qur'an were added 2026-09-27
 * when the owner asked for those "Segera Hadir" cards to be built in full;
 * their sheet has no such objects, so they use Fluent Emoji pictures (MIT).
 * A child never sees a word without a picture of what it means.
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
    // ── At Home ── (not on the owner's list: chosen 2026-09-27 when the owner
    // asked for the "Segera Hadir" cards to be built in full; pictures are
    // Fluent Emoji, see tools/spelling_fluent_pics.py)
    { w: 'bed',    cat: 'athome', dir: 'obj', pic: 'bed',    id: 'tempat tidur', clue: "You sleep on it at night." },
    { w: 'sofa',   cat: 'athome', dir: 'obj', pic: 'sofa',   id: 'sofa', clue: "A soft long seat in the living room." },
    { w: 'clock',  cat: 'athome', dir: 'obj', pic: 'clock',  id: 'jam', clue: "It tells you the time." },
    { w: 'key',    cat: 'athome', dir: 'obj', pic: 'key',    id: 'kunci', clue: "You use it to open and lock the door." },
    { w: 'spoon',  cat: 'athome', dir: 'obj', pic: 'spoon',  id: 'sendok', clue: "You eat soup and rice with it." },
    { w: 'bowl',   cat: 'athome', dir: 'obj', pic: 'bowl',   id: 'mangkuk', clue: "A deep round dish for soup or cereal." },
    { w: 'soap',   cat: 'athome', dir: 'obj', pic: 'soap',   id: 'sabun', clue: "You wash your hands with it. It makes bubbles." },
    { w: 'broom',  cat: 'athome', dir: 'obj', pic: 'broom',  id: 'sapu', clue: "You sweep the floor with it." },
    { w: 'radio',  cat: 'athome', dir: 'obj', pic: 'radio',  id: 'radio', clue: "You listen to music and news on it." },
    { w: 'teapot', cat: 'athome', dir: 'obj', pic: 'teapot', id: 'teko', clue: "You pour hot tea from it." },
    { w: 'mirror', cat: 'athome', dir: 'obj', pic: 'mirror', id: 'cermin', clue: "You see yourself in it." },
    { w: 'bucket', cat: 'athome', dir: 'obj', pic: 'bucket', id: 'ember', clue: "You carry water in it. It has a handle." },
    { w: 'basket', cat: 'athome', dir: 'obj', pic: 'basket', id: 'keranjang', clue: "You carry fruit or clothes in it." },
    { w: 'candle', cat: 'athome', dir: 'obj', pic: 'candle', id: 'lilin', clue: "It gives light when you light it with fire." },
    { w: 'sponge', cat: 'athome', dir: 'obj', pic: 'sponge', id: 'spons', clue: "It is soft and soaks up water. You wash dishes with it." },
    { w: 'toilet', cat: 'athome', dir: 'obj', pic: 'toilet', id: 'toilet', clue: "It is in the bathroom. You flush it." },
    { w: 'bathtub',    cat: 'athome', dir: 'obj', pic: 'bathtub',    id: 'bak mandi', clue: "You fill it with water and take a bath in it." },
    { w: 'umbrella',   cat: 'athome', dir: 'obj', pic: 'umbrella',   id: 'payung', clue: "It keeps you dry when it rains." },
    { w: 'toothbrush', cat: 'athome', dir: 'obj', pic: 'toothbrush', id: 'sikat gigi', clue: "You clean your teeth with it." },
    { w: 'television', cat: 'athome', dir: 'obj', pic: 'television', id: 'televisi', clue: "You watch cartoons on it." },
    // ── Al-Qur'an ── (same note as At Home; concrete objects and places only)
    { w: 'quran',  cat: 'quran', dir: 'obj', pic: 'quran',  id: "Al-Qur'an", clue: "The holy book that Muslims read." },
    { w: 'kaaba',  cat: 'quran', dir: 'obj', pic: 'kaaba',  id: "Ka'bah", clue: "The black cube in Makkah. Muslims face it when they pray." },
    { w: 'moon',   cat: 'quran', dir: 'obj', pic: 'moon',   id: 'bulan', clue: "It shines at night. A new one starts the month of Ramadan." },
    { w: 'star',   cat: 'quran', dir: 'obj', pic: 'star',   id: 'bintang', clue: "It twinkles in the night sky." },
    { w: 'camel',  cat: 'quran', dir: 'obj', pic: 'camel',  id: 'unta', clue: "A desert animal with a hump on its back." },
    { w: 'palm',   cat: 'quran', dir: 'obj', pic: 'palm',   id: 'pohon kurma', clue: "A tall tree. Dates grow on it." },
    { w: 'beads',  cat: 'quran', dir: 'obj', pic: 'beads',  id: 'tasbih', clue: "You count them while you say dhikr." },
    { w: 'mosque', cat: 'quran', dir: 'obj', pic: 'mosque', id: 'masjid', clue: "Muslims go there to pray together." },
    { w: 'desert', cat: 'quran', dir: 'obj', pic: 'desert', id: 'gurun', clue: "A very hot and dry place with lots of sand." },
    { w: 'prayer', cat: 'quran', dir: 'obj', pic: 'prayer', id: 'doa', clue: "You raise your hands and ask Allah for help." },
    { w: 'sunrise', cat: 'quran', dir: 'obj', pic: 'sunrise', id: 'matahari terbit', clue: "When the sun comes up. We pray Subuh before it." },
  ]

  var CATEGORIES = [
    { key: 'colors',   name: 'Colors',          icon: 'colors',   ready: true },
    { key: 'school',   name: 'School Objects',  icon: 'school',   ready: true },
    { key: 'everyday', name: 'Everyday Things', icon: 'everyday', ready: true },
    { key: 'athome',   name: 'At Home',         icon: 'athome',   ready: true },
    { key: 'quran',    name: "Al-Qur'an",       icon: 'quran',    ready: true },
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
