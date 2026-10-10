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
 * SPELLING-BEE ASKS. A lomba speller may ask for the definition (clue), the part of
 * speech (pos) and a sentence (say) -- Scripps rules. pos is cross-checked against
 * the Free Dictionary API (dictionaryapi.dev, Wiktionary data) at build time by
 * tools/spelling_bee_check.py; the game never calls an API (it must work offline).
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
    { w: 'blue',   cat: 'colors', dir: 'color', pic: 'blue',   id: 'biru', clue: "It is a color. The sky is often this color.", pos: 'adjective', say: "My favorite shirt is blue." },
    { w: 'red',    cat: 'colors', dir: 'color', pic: 'red',    id: 'merah', clue: "It is a color. Strawberries and fire trucks are this color.", pos: 'adjective', say: "The apple is red and shiny." },
    { w: 'gray',   cat: 'colors', dir: 'color', pic: 'gray',   id: 'abu-abu', clue: "It is a color. Rain clouds and elephants are this color.", pos: 'adjective', say: "The elephant has gray skin." },
    { w: 'black',  cat: 'colors', dir: 'color', pic: 'black',  id: 'hitam', clue: "It is a color. The night sky is this color.", pos: 'adjective', say: "The cat has soft black fur." },
    { w: 'green',  cat: 'colors', dir: 'color', pic: 'green',  id: 'hijau', clue: "It is a color. Grass and leaves are this color.", pos: 'adjective', say: "The frog sat on a green leaf." },
    { w: 'brown',  cat: 'colors', dir: 'color', pic: 'brown',  id: 'cokelat', clue: "It is a color. Chocolate and tree trunks are this color.", pos: 'adjective', say: "The puppy has big brown eyes." },
    { w: 'white',  cat: 'colors', dir: 'color', pic: 'white',  id: 'putih', clue: "It is a color. Snow and milk are this color.", pos: 'adjective', say: "The clouds are white and fluffy." },
    { w: 'pink',   cat: 'colors', dir: 'color', pic: 'pink',   id: 'merah muda', clue: "It is a color. Flamingos and bubble gum are this color.", pos: 'adjective', say: "She wore a pink dress to the party." },
    { w: 'yellow', cat: 'colors', dir: 'color', pic: 'yellow', id: 'kuning', clue: "It is a color. The sun and bananas are this color.", pos: 'adjective', say: "The sun looks yellow in the sky." },
    { w: 'orange', cat: 'colors', dir: 'color', pic: 'orange', id: 'oranye', clue: "It is a color and a fruit. Carrots are this color.", pos: 'adjective', say: "He colored the pumpkin orange." },
    { w: 'purple', cat: 'colors', dir: 'color', pic: 'purple', id: 'ungu', clue: "It is a color. Grapes and eggplants are this color.", pos: 'adjective', say: "Grapes can be purple or green." },
    // ── School Objects ────────────────────────────────────────────────────
    { w: 'book',   cat: 'school', dir: 'obj', pic: 'book',   id: 'buku', clue: "You read it. It has pages and a cover.", pos: 'noun', say: "I read a book before bedtime." },
    { w: 'pen',    cat: 'school', dir: 'obj', pic: 'pen',    id: 'pena', clue: "You write with it. It uses ink.", pos: 'noun', say: "The teacher writes with a red pen." },
    { w: 'bag',    cat: 'school', dir: 'obj', pic: 'bag',    id: 'tas', clue: "You carry your books to school in it.", pos: 'noun', say: "Put your lunch in your bag." },
    { w: 'chair',  cat: 'school', dir: 'obj', pic: 'chair',  id: 'kursi', clue: "You sit on it. It has four legs and a back.", pos: 'noun', say: "Please sit on the chair." },
    { w: 'table',  cat: 'school', dir: 'obj', pic: 'table',  id: 'meja', clue: "You eat or work on it. It has a flat top and legs.", pos: 'noun', say: "We eat dinner at the table." },
    { w: 'desk',   cat: 'school', dir: 'obj', pic: 'desk',   id: 'meja belajar', clue: "A table where you study and write at school.", pos: 'noun', say: "My pencil case is on my desk." },
    { w: 'board',  cat: 'school', dir: 'obj', pic: 'board',  id: 'papan tulis', clue: "The teacher writes on it at the front of the class.", pos: 'noun', say: "The teacher wrote the date on the board." },
    { w: 'glue',   cat: 'school', dir: 'obj', pic: 'glue',   id: 'lem', clue: "It sticks paper together.", pos: 'noun', say: "Use glue to stick the paper." },
    { w: 'ruler',  cat: 'school', dir: 'obj', pic: 'ruler',  id: 'penggaris', clue: "You draw straight lines and measure with it.", pos: 'noun', say: "Draw a straight line with a ruler." },
    { w: 'pencil', cat: 'school', dir: 'obj', pic: 'pencil', id: 'pensil', clue: "You write and draw with it. You can erase it.", pos: 'noun', say: "Sharpen your pencil before the test." },
    { w: 'eraser', cat: 'school', dir: 'obj', pic: 'eraser', id: 'penghapus', clue: "It rubs out pencil mistakes.", pos: 'noun', say: "I fixed my mistake with an eraser." },
    { w: 'crayon', cat: 'school', dir: 'obj', pic: 'crayon', id: 'krayon', clue: "A colored wax stick for drawing pictures.", pos: 'noun', say: "She drew a rainbow with a crayon." },
    { w: 'marker', cat: 'school', dir: 'obj', pic: 'marker', id: 'spidol', clue: "A pen with thick color for writing on the board.", pos: 'noun', say: "Write your name with a marker." },
    { w: 'stapler',    cat: 'school', dir: 'obj', pic: 'stapler',    id: 'stapler', clue: "It joins sheets of paper with a small metal clip.", pos: 'noun', say: "Join the pages with a stapler." },
    { w: 'scissors',   cat: 'school', dir: 'obj', pic: 'scissors',   id: 'gunting', clue: "You cut paper with it. It has two blades.", pos: 'noun', say: "Cut the paper carefully with scissors." },
    { w: 'computer',   cat: 'school', dir: 'obj', pic: 'computer',   id: 'komputer', clue: "A machine with a screen and a keyboard.", pos: 'noun', say: "We type our story on the computer." },
    { w: 'calculator', cat: 'school', dir: 'obj', pic: 'calculator', id: 'kalkulator', clue: "It helps you add and take away numbers.", pos: 'noun', say: "Check your answer with a calculator." },
    // ── Everyday Things ───────────────────────────────────────────────────
    { w: 'water',  cat: 'everyday', dir: 'obj', pic: 'water',  id: 'air', clue: "You drink it when you are thirsty.", pos: 'noun', say: "Drink water when you are thirsty." },
    { w: 'door',   cat: 'everyday', dir: 'obj', pic: 'door',   id: 'pintu', clue: "You open it to go into a room.", pos: 'noun', say: "Please close the door quietly." },
    { w: 'bottle', cat: 'everyday', dir: 'obj', pic: 'bottle', id: 'botol', clue: "You keep water or juice inside it.", pos: 'noun', say: "Fill your bottle with water." },
    { w: 'window', cat: 'everyday', dir: 'obj', pic: 'window', id: 'jendela', clue: "You look outside through it. It is made of glass.", pos: 'noun', say: "I can see the rain through the window." },
    // ── At Home ── (not on the owner's list: chosen 2026-09-27 when the owner
    // asked for the "Segera Hadir" cards to be built in full; pictures are
    // Fluent Emoji, see tools/spelling_fluent_pics.py)
    { w: 'bed',    cat: 'athome', dir: 'obj', pic: 'bed',    id: 'tempat tidur', clue: "You sleep on it at night.", pos: 'noun', say: "I go to bed at eight o'clock." },
    { w: 'sofa',   cat: 'athome', dir: 'obj', pic: 'sofa',   id: 'sofa', clue: "A soft long seat in the living room.", pos: 'noun', say: "Grandma is sitting on the sofa." },
    { w: 'clock',  cat: 'athome', dir: 'obj', pic: 'clock',  id: 'jam', clue: "It tells you the time.", pos: 'noun', say: "The clock says it is time for school." },
    { w: 'key',    cat: 'athome', dir: 'obj', pic: 'key',    id: 'kunci', clue: "You use it to open and lock the door.", pos: 'noun', say: "Dad opens the door with a key." },
    { w: 'spoon',  cat: 'athome', dir: 'obj', pic: 'spoon',  id: 'sendok', clue: "You eat soup and rice with it.", pos: 'noun', say: "Eat your soup with a spoon." },
    { w: 'bowl',   cat: 'athome', dir: 'obj', pic: 'bowl',   id: 'mangkuk', clue: "A deep round dish for soup or cereal.", pos: 'noun', say: "Pour the cereal into a bowl." },
    { w: 'soap',   cat: 'athome', dir: 'obj', pic: 'soap',   id: 'sabun', clue: "You wash your hands with it. It makes bubbles.", pos: 'noun', say: "Wash your hands with soap." },
    { w: 'broom',  cat: 'athome', dir: 'obj', pic: 'broom',  id: 'sapu', clue: "You sweep the floor with it.", pos: 'noun', say: "Mom sweeps the floor with a broom." },
    { w: 'radio',  cat: 'athome', dir: 'obj', pic: 'radio',  id: 'radio', clue: "You listen to music and news on it.", pos: 'noun', say: "We listen to songs on the radio." },
    { w: 'teapot', cat: 'athome', dir: 'obj', pic: 'teapot', id: 'teko', clue: "You pour hot tea from it.", pos: 'noun', say: "The hot tea is in the teapot." },
    { w: 'mirror', cat: 'athome', dir: 'obj', pic: 'mirror', id: 'cermin', clue: "You see yourself in it.", pos: 'noun', say: "I brush my hair in front of the mirror." },
    { w: 'bucket', cat: 'athome', dir: 'obj', pic: 'bucket', id: 'ember', clue: "You carry water in it. It has a handle.", pos: 'noun', say: "Carry the water in a bucket." },
    { w: 'basket', cat: 'athome', dir: 'obj', pic: 'basket', id: 'keranjang', clue: "You carry fruit or clothes in it.", pos: 'noun', say: "Put the fruit in the basket." },
    { w: 'candle', cat: 'athome', dir: 'obj', pic: 'candle', id: 'lilin', clue: "It gives light when you light it with fire.", pos: 'noun', say: "Blow out the candle on the cake." },
    { w: 'sponge', cat: 'athome', dir: 'obj', pic: 'sponge', id: 'spons', clue: "It is soft and soaks up water. You wash dishes with it.", pos: 'noun', say: "Wash the plates with a sponge." },
    { w: 'toilet', cat: 'athome', dir: 'obj', pic: 'toilet', id: 'toilet', clue: "It is in the bathroom. You flush it.", pos: 'noun', say: "Flush the toilet after you use it." },
    { w: 'bathtub',    cat: 'athome', dir: 'obj', pic: 'bathtub',    id: 'bak mandi', clue: "You fill it with water and take a bath in it.", pos: 'noun', say: "The baby plays in the bathtub." },
    { w: 'umbrella',   cat: 'athome', dir: 'obj', pic: 'umbrella',   id: 'payung', clue: "It keeps you dry when it rains.", pos: 'noun', say: "Take an umbrella when it rains." },
    { w: 'toothbrush', cat: 'athome', dir: 'obj', pic: 'toothbrush', id: 'sikat gigi', clue: "You clean your teeth with it.", pos: 'noun', say: "Brush your teeth with your toothbrush." },
    { w: 'television', cat: 'athome', dir: 'obj', pic: 'television', id: 'televisi', clue: "You watch cartoons on it.", pos: 'noun', say: "We watch cartoons on the television." },
    // ── Al-Qur'an ── (same note as At Home; concrete objects and places only)
    { w: 'quran',  cat: 'quran', dir: 'obj', pic: 'quran',  id: "Al-Qur'an", clue: "The holy book that Muslims read.", pos: 'noun', say: "We read the Quran every evening." },
    { w: 'kaaba',  cat: 'quran', dir: 'obj', pic: 'kaaba',  id: "Ka'bah", clue: "The black cube in Makkah. Muslims face it when they pray.", pos: 'noun', say: "The Kaaba is in the city of Makkah." },
    { w: 'moon',   cat: 'quran', dir: 'obj', pic: 'moon',   id: 'bulan', clue: "It shines at night. A new one starts the month of Ramadan.", pos: 'noun', say: "The moon shines at night." },
    { w: 'star',   cat: 'quran', dir: 'obj', pic: 'star',   id: 'bintang', clue: "It twinkles in the night sky.", pos: 'noun', say: "I saw a bright star in the sky." },
    { w: 'camel',  cat: 'quran', dir: 'obj', pic: 'camel',  id: 'unta', clue: "A desert animal with a hump on its back.", pos: 'noun', say: "The camel walks across the sand." },
    { w: 'palm',   cat: 'quran', dir: 'obj', pic: 'palm',   id: 'pohon kurma', clue: "A tall tree. Dates grow on it.", pos: 'noun', say: "Dates grow on a palm tree." },
    { w: 'beads',  cat: 'quran', dir: 'obj', pic: 'beads',  id: 'tasbih', clue: "You count them while you say dhikr.", pos: 'noun', say: "Grandpa counts his prayer beads." },
    { w: 'mosque', cat: 'quran', dir: 'obj', pic: 'mosque', id: 'masjid', clue: "Muslims go there to pray together.", pos: 'noun', say: "We pray together at the mosque." },
    { w: 'desert', cat: 'quran', dir: 'obj', pic: 'desert', id: 'gurun', clue: "A very hot and dry place with lots of sand.", pos: 'noun', say: "The desert is hot and full of sand." },
    { w: 'prayer', cat: 'quran', dir: 'obj', pic: 'prayer', id: 'doa', clue: "You raise your hands and ask Allah for help.", pos: 'noun', say: "We say a prayer before we eat." },
    { w: 'sunrise', cat: 'quran', dir: 'obj', pic: 'sunrise', id: 'matahari terbit', clue: "When the sun comes up. We pray Subuh before it.", pos: 'noun', say: "We wake up early to see the sunrise." },
  ]

  /* ── 2026-10-06 EXPANSION: 19 new categories + School grows ───────────────
   * Owner: "tambah banyak kategori dan soal, gambar dan gameplay sangat
   * immersive, 100-300 kata baru". Kids 6-8 in Indonesia: high-frequency,
   * concrete, picturable words only. EVERY picture is owner art -- the shared
   * named library (L: assets/db/lib/<key>.webp) or the owner's numbered sheets
   * (D: assets/db/<sheet>/NNN.webp) -- or, for Shapes and Numbers, drawn by
   * tools/spelling_shapes_numbers.py (S: assets/spelling/<key>.webp; numbers are
   * counting pictures made of library sprites). A word with no fitting picture
   * was DROPPED, never shown with a wrong one: no "finger" (the only crop carries
   * sheet text), no "teacher"/"nurse"/"singer" (the sheet draws them without a
   * hijab), no "van"/"scooter" (crop debris), no "pig". Every row is checked by
   * tools/qa-spelling-words.mjs (picture resolves, no duplicate, no emoji).
   * Row: [word, picture, Indonesian meaning, definition (never says the word),
   *       sentence (always says it)]. Part of speech: noun for every one.
   * ======================================================================== */
  var MORE = {
    farm: [
      ['dog', 'L:animals/dog', 'anjing', "A pet that barks and wags its tail.", "My dog likes to play with a ball."],
      ['cat', 'L:animals/cat', 'kucing', "A soft pet that says meow.", "The cat is sleeping on the mat."],
      ['cow', 'L:animals/cow', 'sapi', "A big farm animal that gives us milk.", "The cow eats green grass."],
      ['goat', 'D:creatures/38', 'kambing', "A farm animal with horns and a little beard.", "The goat climbs up the hill."],
      ['sheep', 'D:creatures/40', 'domba', "A farm animal with soft white wool.", "The sheep has thick wool."],
      ['horse', 'D:creatures/34', 'kuda', "A big animal you can ride. It runs very fast.", "The horse runs in the field."],
      ['donkey', 'D:creatures/35', 'keledai', "An animal like a small horse with long ears.", "The donkey carries a heavy bag."],
      ['duck', 'D:creatures/2', 'bebek', "A bird that swims and says quack.", "The duck swims in the pond."],
      ['chicken', 'L:animals/chicken', 'ayam', "A farm bird that lays eggs.", "The chicken lays an egg every day."],
      ['rabbit', 'L:animals/rabbit', 'kelinci', "A small animal with long ears that hops.", "The rabbit eats a carrot."],
      ['mouse', 'D:creatures/14', 'tikus', "A tiny animal with a long tail. It likes cheese.", "The mouse runs into a hole."],
      ['hamster', 'D:creatures/16', 'hamster', "A small round pet that keeps food in its cheeks.", "My hamster runs on its wheel."],
      ['goose', 'D:creatures/3', 'angsa', "A big white bird with a long neck. It honks.", "The goose walks to the lake."],
    ],
    wild: [
      ['lion', 'L:animals/lion', 'singa', "The king of the jungle. It roars loudly.", "The lion has a big mane."],
      ['tiger', 'D:creatures/29', 'harimau', "A big wild cat with orange fur and black stripes.", "The tiger sleeps under a tree."],
      ['bear', 'D:creatures/24', 'beruang', "A big furry animal. It loves honey.", "The bear catches a fish."],
      ['panda', 'L:animals/panda', 'panda', "A black and white bear that eats bamboo.", "The panda eats bamboo all day."],
      ['koala', 'L:animals/koala', 'koala', "A grey animal that sleeps in trees all day.", "The koala hugs the tree."],
      ['monkey', 'L:animals/monkey', 'monyet', "A clever animal that climbs trees and eats bananas.", "The monkey swings from tree to tree."],
      ['zebra', 'L:animals/zebra', 'zebra', "A wild horse with black and white stripes.", "The zebra drinks at the river."],
      ['giraffe', 'L:animals/giraffe', 'jerapah', "The tallest animal. It has a very long neck.", "The giraffe eats leaves from tall trees."],
      ['elephant', 'L:animals/elephant', 'gajah', "A huge grey animal with a long trunk.", "The elephant sprays water with its trunk."],
      ['kangaroo', 'D:creatures/44', 'kanguru', "An animal that jumps and carries its baby in a pouch.", "The kangaroo jumps very high."],
      ['fox', 'D:creatures/21', 'rubah', "A wild animal with orange fur and a fluffy tail.", "The fox hides in the forest."],
      ['deer', 'D:creatures/47', 'rusa', "A gentle forest animal. The father has antlers.", "The deer runs through the forest."],
      ['gorilla', 'D:creatures/43', 'gorila', "A very big and strong ape.", "The gorilla beats its chest."],
      ['crocodile', 'D:creatures/59', 'buaya', "A long animal with sharp teeth that lives in rivers.", "The crocodile swims in the river."],
      ['frog', 'L:animals/frog', 'katak', "A green animal that hops and says ribbit.", "The frog jumps into the water."],
      ['snail', 'L:animals/snail', 'siput', "A slow animal that carries its shell.", "The snail moves very slowly."],
    ],
    sea: [
      ['fish', 'D:creatures/51', 'ikan', "An animal that lives in water and swims with fins.", "The fish swims in the sea."],
      ['shark', 'L:animals/shark', 'hiu', "A big sea animal with many sharp teeth.", "The shark has a big fin."],
      ['dolphin', 'L:animals/dolphin', 'lumba-lumba', "A smart sea animal that jumps and plays.", "The dolphin jumps out of the water."],
      ['octopus', 'L:animals/octopus', 'gurita', "A sea animal with eight long arms.", "The octopus has eight arms."],
      ['crab', 'L:animals/crab', 'kepiting', "A sea animal with claws that walks sideways.", "The crab walks on the sand."],
      ['jellyfish', 'D:creatures/56', 'ubur-ubur', "A soft sea animal you can see through. Do not touch it!", "A jellyfish floats in the water."],
      ['turtle', 'L:animals/sea-turtle', 'penyu', "A slow animal with a hard shell. It can swim.", "The turtle swims to the beach."],
      ['starfish', 'L:animals/starfish', 'bintang laut', "A sea animal shaped like a star.", "I found a starfish on the beach."],
      ['squid', 'L:animals/squid', 'cumi-cumi', "A sea animal with ten arms that squirts ink.", "The squid swims fast."],
      ['lobster', 'L:animals/lobster', 'lobster', "A red sea animal with two big claws.", "The lobster lives under a rock."],
      ['seahorse', 'D:creatures/48', 'kuda laut', "A tiny sea animal with a head like a horse.", "The seahorse holds on with its tail."],
      ['stingray', 'L:animals/stingray', 'ikan pari', "A flat sea animal that glides like a kite.", "The stingray glides over the sand."],
      ['shell', 'D:objects/94', 'kerang', "A hard home of a sea animal. You find it on the beach.", "I put the shell next to my ear."],
      ['clownfish', 'L:animals/clownfish', 'ikan badut', "A small orange fish with white stripes.", "The clownfish hides in the sea plants."],
    ],
    birdsbugs: [
      ['bee', 'L:animals/bee', 'lebah', "A flying insect that makes honey. It buzzes.", "The bee flies to the flower."],
      ['butterfly', 'L:animals/butterfly', 'kupu-kupu', "An insect with big colorful wings.", "A butterfly sits on the flower."],
      ['ladybug', 'L:animals/ladybug', 'kepik', "A small red insect with black spots.", "The ladybug walks on a leaf."],
      ['owl', 'L:animals/owl', 'burung hantu', "A bird with big eyes that is awake at night.", "The owl says hoot at night."],
      ['eagle', 'L:animals/eagle', 'elang', "A big strong bird that flies very high.", "The eagle flies over the mountain."],
      ['parrot', 'L:animals/parrot', 'burung beo', "A colorful bird that can copy words.", "The parrot can say hello."],
      ['penguin', 'L:animals/penguin', 'penguin', "A black and white bird that swims but cannot fly.", "The penguin walks on the ice."],
      ['flamingo', 'L:animals/flamingo', 'flamingo', "A pink bird that stands on one leg.", "The flamingo stands on one leg."],
      ['peacock', 'D:creatures/8', 'merak', "A bird with a big tail of blue and green feathers.", "The peacock opens its beautiful tail."],
    ],
    fruits: [
      ['apple', 'L:food/apple', 'apel', "A round red or green fruit that is crunchy.", "I eat an apple every day."],
      ['banana', 'L:food/banana', 'pisang', "A long yellow fruit. Monkeys love it.", "The banana is yellow and sweet."],
      ['mango', 'L:food/mango', 'mangga', "A sweet fruit, yellow and juicy inside.", "This mango is very sweet."],
      ['grapes', 'L:food/grapes', 'anggur', "Small round fruits that grow in a bunch.", "I like purple grapes."],
      ['watermelon', 'L:food/watermelon', 'semangka', "A big green fruit, red and juicy inside.", "We share a big watermelon."],
      ['pineapple', 'L:food/pineapple', 'nanas', "A yellow fruit with spiky skin and leaves on top.", "Mom cuts the pineapple."],
      ['strawberry', 'L:food/strawberry', 'stroberi', "A small red fruit with tiny seeds outside.", "The strawberry is red and sweet."],
      ['pear', 'D:objects/10', 'pir', "A green fruit, round at the bottom and thin at the top.", "The pear is soft and juicy."],
      ['cherry', 'D:objects/11', 'ceri', "A tiny red fruit on a long stem.", "There is a cherry on my cake."],
      ['kiwi', 'L:food/kiwi', 'kiwi', "A brown fuzzy fruit, green inside.", "The kiwi is green inside."],
      ['avocado', 'L:food/avocado', 'alpukat', "A green fruit with one big seed in the middle.", "Mom makes juice from an avocado."],
      ['coconut', 'L:food/coconut', 'kelapa', "A big hard fruit from a palm tree. It has water inside.", "We drink water from a coconut."],
      ['papaya', 'D:objects/17', 'pepaya', "An orange fruit with many black seeds inside.", "Grandma gives me a papaya."],
      ['durian', 'D:objects/18', 'durian', "A big spiky fruit with a very strong smell.", "Dad loves to eat durian."],
      ['rambutan', 'D:objects/14', 'rambutan', "A red hairy fruit, white and sweet inside.", "We pick rambutan from the tree."],
    ],
    veggies: [
      ['carrot', 'L:food/carrot', 'wortel', "A long orange vegetable. Rabbits love it.", "The rabbit eats a carrot."],
      ['tomato', 'L:food/tomato', 'tomat', "A round red vegetable used in soup and salad.", "Mom puts a tomato in the salad."],
      ['potato', 'D:words2/4', 'kentang', "A brown vegetable that grows under the ground.", "We make fries from a potato."],
      ['corn', 'L:food/corn', 'jagung', "A yellow vegetable with many small seeds in rows.", "Dad grills corn for dinner."],
      ['broccoli', 'L:food/broccoli', 'brokoli', "A green vegetable that looks like a little tree.", "Broccoli is good for you."],
      ['eggplant', 'L:food/eggplant', 'terong', "A long purple vegetable.", "Grandma cooks the eggplant."],
      ['chili', 'L:food/chili', 'cabai', "A small red vegetable that is very hot.", "The chili is too hot for me."],
      ['cucumber', 'D:words2/9', 'timun', "A long green vegetable that is cool and crunchy.", "I eat a cucumber with rice."],
      ['pumpkin', 'D:words2/10', 'labu', "A big round orange vegetable.", "The pumpkin is very heavy."],
      ['cabbage', 'D:words2/11', 'kol', "A round green vegetable made of many leaves.", "Mom cuts the cabbage for soup."],
      ['spinach', 'D:words2/2', 'bayam', "A green leafy vegetable. It makes you strong.", "We eat spinach soup."],
      ['beans', 'D:words2/13', 'buncis', "Long thin green vegetables.", "I like green beans."],
      ['mushroom', 'L:food/mushroom', 'jamur', "It grows in wet places and looks like a little umbrella.", "There is a mushroom in my soup."],
      ['onion', 'L:food/onion', 'bawang bombai', "A round vegetable that can make you cry when you cut it.", "Cutting an onion makes me cry."],
      ['garlic', 'L:food/garlic', 'bawang putih', "A small white plant with a strong smell, used in cooking.", "Mom fries the garlic."],
    ],
    food: [
      ['bread', 'L:food/bread', 'roti', "A soft food made from flour. You make sandwiches with it.", "I eat bread for breakfast."],
      ['cake', 'D:objects/22', 'kue', "A sweet soft food for birthdays.", "We eat cake at the party."],
      ['donut', 'L:food/donut', 'donat', "A sweet round snack with a hole in the middle.", "The donut has pink icing."],
      ['cupcake', 'L:food/cupcake', 'kue mangkuk', "A small sweet cake in a paper cup.", "I bake a cupcake with Mom."],
      ['pizza', 'L:food/pizza', 'piza', "A flat round food with cheese and tomato on top.", "We share a big pizza."],
      ['burger', 'L:food/burger', 'burger', "Meat inside a round bun.", "Dad eats a big burger."],
      ['egg', 'D:objects/30', 'telur', "A chicken lays it. You can fry or boil it.", "I eat a boiled egg."],
      ['rice', 'D:objects/31', 'nasi', "Small white grains we eat every day.", "We eat rice for lunch."],
      ['cheese', 'L:food/cheese', 'keju', "A yellow food made from milk. Mice love it.", "I put cheese on my bread."],
      ['soup', 'D:objects/38', 'sup', "A hot food with water, vegetables and a spoon.", "Grandma makes chicken soup."],
      ['salad', 'D:objects/39', 'selada', "A bowl of fresh vegetables mixed together.", "I eat salad with tomatoes."],
      ['cookie', 'L:food/cookie', 'kue kering', "A small round sweet snack.", "May I have a cookie, please?"],
      ['chocolate', 'L:food/chocolate', 'cokelat', "A sweet brown snack.", "The chocolate melts in the sun."],
      ['pancakes', 'L:food/pancakes', 'panekuk', "Flat round cakes for breakfast, with honey on top.", "Mom makes pancakes on Sunday."],
      ['fries', 'L:food/french-fries', 'kentang goreng', "Long thin pieces of potato cooked in oil.", "I eat fries with my burger."],
      ['milk', 'L:food/milk', 'susu', "A white drink from cows. It makes bones strong.", "I drink milk every morning."],
      ['juice', 'L:food/orange-juice', 'jus', "A sweet drink made from fruit.", "I drink orange juice."],
    ],
    vehicles: [
      ['car', 'L:vehicles/car-red', 'mobil', "It has four wheels. Dad drives it on the road.", "We go to school by car."],
      ['bus', 'L:vehicles/school-bus', 'bus', "A big long vehicle that carries many people.", "The children ride the school bus."],
      ['truck', 'L:vehicles/dump-truck', 'truk', "A big vehicle that carries heavy things.", "The truck carries sand."],
      ['taxi', 'D:vehicles/4', 'taksi', "A yellow car you pay to ride in.", "We take a taxi to the airport."],
      ['train', 'D:vehicles/51', 'kereta api', "A long vehicle that runs on a track.", "The train goes very fast."],
      ['plane', 'L:vehicles/airplane', 'pesawat', "It has wings and flies in the sky.", "The plane flies above the clouds."],
      ['boat', 'D:vehicles/53', 'perahu', "A small vehicle that floats on water.", "We row the boat on the lake."],
      ['ship', 'D:vehicles/55', 'kapal', "A very big vehicle that sails on the sea.", "The ship sails across the sea."],
      ['bicycle', 'L:vehicles/bicycle', 'sepeda', "It has two wheels and pedals.", "I ride my bicycle to the park."],
      ['motorcycle', 'L:vehicles/motorcycle', 'sepeda motor', "It has two wheels and an engine.", "Dad rides a motorcycle to work."],
      ['helicopter', 'L:vehicles/helicopter', 'helikopter', "It flies with big spinning blades on top.", "The helicopter lands on the roof."],
      ['rocket', 'D:vehicles/60', 'roket', "It flies up into space.", "The rocket flies to the moon."],
      ['tractor', 'D:vehicles/23', 'traktor', "A farm vehicle with big back wheels.", "The farmer drives a tractor."],
      ['excavator', 'L:vehicles/excavator', 'ekskavator', "A digging machine with a big arm and a bucket.", "The excavator digs a big hole."],
      ['firetruck', 'L:vehicles/fire-truck', 'mobil pemadam', "A red vehicle with a ladder that helps put out fires.", "The firetruck has a long ladder."],
      ['submarine', 'D:vehicles/56', 'kapal selam', "A ship that goes under the sea.", "The submarine dives deep."],
    ],
    music: [
      ['guitar', 'L:toys/guitar', 'gitar', "You play it by pulling its strings.", "My brother plays the guitar."],
      ['drum', 'L:toys/drum', 'drum', "You hit it with sticks. It goes boom boom.", "He hits the drum loudly."],
      ['piano', 'L:toys/grand-piano', 'piano', "A big instrument with black and white keys.", "She plays the piano well."],
      ['trumpet', 'L:toys/trumpet', 'terompet', "A shiny instrument you blow into. It is loud.", "He blows the trumpet at the parade."],
      ['violin', 'D:words/77', 'biola', "You play it with a bow under your chin.", "The violin sounds sweet."],
      ['flute', 'D:words/78', 'seruling', "A long thin pipe you blow to make music.", "I play a song on the flute."],
      ['accordion', 'D:words/81', 'akordeon', "You squeeze it in and out and press its keys.", "Grandpa plays the accordion."],
      ['tambourine', 'D:words/83', 'rebana', "You shake it or tap it. It jingles.", "Shake the tambourine to the music."],
      ['ukulele', 'D:words/84', 'ukulele', "A small instrument with four strings.", "I learn to play the ukulele."],
      ['maracas', 'D:words/85', 'marakas', "Two round shakers that make a rattle sound.", "Shake the maracas, shake, shake!"],
      ['xylophone', 'D:words/86', 'gambang', "You hit its colored bars to make music.", "I play notes on the xylophone."],
      ['harp', 'D:words/88', 'harpa', "A tall instrument with many strings.", "The harp makes a soft sound."],
      ['bell', 'L:game/bell', 'lonceng', "It rings ding dong.", "The school bell rings."],
    ],
    clothes: [
      ['shirt', 'D:words2/42', 'kemeja', "You wear it on the top of your body.", "I wear a blue shirt."],
      ['pants', 'D:words2/43', 'celana', "You wear them on your legs.", "My pants are too long."],
      ['skirt', 'D:words2/44', 'rok', "Girls wear it around the waist.", "My sister wears a pink skirt."],
      ['cap', 'L:things/cap', 'topi', "A hat with a front part that keeps the sun out of your eyes.", "I wear a cap in the sun."],
      ['shoes', 'D:objects/52', 'sepatu', "You wear them on your feet when you go out.", "Put on your shoes, please."],
      ['socks', 'D:words2/47', 'kaus kaki', "You wear them on your feet inside your shoes.", "My socks are white."],
      ['gloves', 'D:words2/48', 'sarung tangan', "You wear them on your hands to keep them warm.", "I wear gloves when it is cold."],
      ['scarf', 'D:words2/49', 'syal', "You wear it around your neck to keep warm.", "Grandma made me a red scarf."],
      ['jacket', 'D:words2/50', 'jaket', "A warm coat you wear when it is cold.", "Wear your jacket, it is cold."],
      ['tie', 'D:words2/51', 'dasi', "A long piece of cloth worn around the neck with a shirt.", "Dad wears a tie to work."],
      ['boot', 'L:things/rain-boot', 'sepatu bot', "A tall shoe you wear in the rain.", "I jump in puddles with my boot."],
      ['glasses', 'D:objects/54', 'kacamata', "You wear them on your nose to see better.", "Grandpa reads with his glasses."],
      ['sunglasses', 'L:things/sunglasses', 'kacamata hitam', "Dark lenses you wear when the sun is bright.", "I wear sunglasses at the beach."],
    ],
    body: [
      ['hand', 'D:words/11', 'tangan', "It has five fingers. You wave with it.", "Raise your hand to answer."],
      ['foot', 'D:words/12', 'kaki', "You stand and walk on it. It has five toes.", "My foot is in the water."],
      ['eye', 'D:words/15', 'mata', "You see with it.", "Close one eye and look."],
      ['nose', 'D:words/16', 'hidung', "You smell with it.", "The flower tickles my nose."],
      ['lips', 'D:words/17', 'bibir', "The soft edges of your mouth.", "Put the cup to your lips."],
      ['ear', 'D:words/41', 'telinga', "You hear with it.", "Whisper in my ear."],
      ['tooth', 'D:words/43', 'gigi', "It is white and hard. You chew with it.", "My front tooth is loose."],
      ['hair', 'D:words/44', 'rambut', "It grows on your head. You comb it.", "I brush my hair every morning."],
      ['tongue', 'D:words2/41', 'lidah', "It is pink and inside your mouth. You taste with it.", "Stick out your tongue."],
      ['neck', 'D:words/47', 'leher', "It holds up your head.", "The giraffe has a long neck."],
      ['arm', 'D:words/51', 'lengan', "It is between your shoulder and your hand.", "I hurt my arm."],
      ['brain', 'D:science/37', 'otak', "It is inside your head. You think with it.", "Your brain helps you learn."],
      ['bone', 'D:science/38', 'tulang', "It is hard and inside your body. Dogs love to chew one.", "The dog chews a bone."],
    ],
    house: [
      ['lamp', 'D:objects/47', 'lampu', "It gives light in a room.", "Turn on the lamp, please."],
      ['pillow', 'D:objects/62', 'bantal', "A soft thing for your head on the bed.", "I sleep on a soft pillow."],
      ['cupboard', 'D:objects/65', 'lemari', "A tall box with doors to keep clothes or plates.", "The plates are in the cupboard."],
      ['towel', 'D:objects/67', 'handuk', "You dry your body with it after a bath.", "Dry your hands with a towel."],
      ['plate', 'D:objects/44', 'piring', "A flat round dish for food.", "Put the rice on the plate."],
      ['glass', 'D:objects/43', 'gelas', "You drink water from it. You can see through it.", "Pour the milk into a glass."],
      ['cup', 'D:objects/37', 'cangkir', "You drink hot tea from it. It has a handle.", "Grandpa drinks tea from a cup."],
      ['mug', 'L:food/mug-blue', 'mug', "A big cup with a handle for hot drinks.", "I drink hot cocoa from a mug."],
      ['pot', 'L:things/cooking-pot', 'panci', "A deep metal dish for cooking soup.", "Mom cooks soup in a pot."],
      ['toaster', 'L:things/toaster', 'pemanggang roti', "A kitchen machine that makes bread hot and crispy.", "The bread pops out of the toaster."],
      ['microwave', 'L:things/microwave', 'oven microwave', "A kitchen box that heats food fast.", "Warm the milk in the microwave."],
      ['fridge', 'L:things/refrigerator', 'kulkas', "A cold box in the kitchen that keeps food fresh.", "The milk is in the fridge."],
      ['lock', 'L:things/padlock', 'gembok', "You need a key to open it.", "Dad puts a lock on the gate."],
    ],
    school: [
      ['notebook', 'L:school/notebook', 'buku tulis', "A book with empty pages for writing.", "I write in my notebook."],
      ['globe', 'L:school/globe', 'bola dunia', "A round map of the world that spins.", "Find Indonesia on the globe."],
      ['laptop', 'L:school/laptop', 'laptop', "A small computer you can fold and carry.", "Dad works on his laptop."],
      ['palette', 'L:toys/paint-palette', 'palet cat', "A board that holds paint for painting.", "Mix the colors on the palette."],
      ['map', 'D:science/47', 'peta', "A picture that shows places and roads.", "We look at the map to find the way."],
      ['microscope', 'D:science/9', 'mikroskop', "It makes tiny things look big.", "We look at a leaf under the microscope."],
      ['magnet', 'D:science/10', 'magnet', "It pulls things made of iron.", "The magnet picks up the clips."],
      ['backpack', 'L:school/backpack-yellow', 'ransel', "A bag you carry on your back.", "My books are in my backpack."],
      ['telescope', 'L:school/telescope', 'teleskop', "A long tube that makes faraway stars look near.", "We see the moon through a telescope."],
    ],
    jobs: [
      ['doctor', 'D:words2/16', 'dokter', "This person helps sick people get better.", "The doctor checks my heart."],
      ['police', 'D:words/21', 'polisi', "They keep people safe and help in traffic.", "The police help us cross the road."],
      ['firefighter', 'D:words/22', 'pemadam kebakaran', "This person puts out fires.", "The firefighter is very brave."],
      ['chef', 'D:words/23', 'koki', "This person cooks food in a restaurant.", "The chef makes yummy noodles."],
      ['farmer', 'D:words/24', 'petani', "This person grows rice and vegetables.", "The farmer plants rice in the field."],
      ['pilot', 'D:words/25', 'pilot', "This person flies a plane.", "The pilot flies the plane."],
      ['soldier', 'D:words/27', 'tentara', "This person protects the country.", "The soldier stands very straight."],
      ['builder', 'D:words/33', 'tukang bangunan', "This person makes houses. They wear a hard hat.", "The builder makes a new house."],
      ['astronaut', 'L:people/astronaut', 'astronaut', "This person travels into space.", "The astronaut walks on the moon."],
      ['postman', 'D:words2/27', 'tukang pos', "This person brings letters to your house.", "The postman brings a letter."],
      ['painter', 'D:words2/28', 'pelukis', "This person makes pictures with paint.", "The painter paints a flower."],
    ],
    nature: [
      ['tree', 'L:park/tree', 'pohon', "A tall plant with a trunk, branches and leaves.", "Birds sit in the tree."],
      ['leaf', 'D:science/30', 'daun', "A flat green part of a plant.", "A leaf falls from the tree."],
      ['flower', 'L:nature/flower-pink', 'bunga', "A pretty, colorful part of a plant that smells nice.", "I give Mom a flower."],
      ['rose', 'L:nature/rose', 'mawar', "A red flower with thorns on its stem.", "The rose smells nice."],
      ['sunflower', 'L:nature/sunflower', 'bunga matahari', "A tall yellow flower that looks at the sun.", "The sunflower is taller than me."],
      ['cactus', 'L:park/potted-cactus', 'kaktus', "A spiky plant that needs very little water.", "Do not touch the cactus."],
      ['mountain', 'D:science/17', 'gunung', "A very high hill.", "We climb the mountain."],
      ['volcano', 'D:science/16', 'gunung berapi', "A mountain that can shoot out hot lava.", "Smoke comes out of the volcano."],
      ['rock', 'D:objects/95', 'batu', "A hard grey piece of the ground.", "I sit on a big rock."],
      ['seed', 'D:science/33', 'biji', "A plant grows from it when you put it in soil.", "Plant the seed and water it."],
      ['sprout', 'L:nature/sprout', 'tunas', "A tiny new plant coming out of the soil.", "A green sprout comes up."],
      ['grass', 'D:vehicles2/75', 'rumput', "Thin green plants that cover the ground.", "Cows eat green grass."],
    ],
    weather: [
      ['sun', 'L:nature/sun', 'matahari', "It shines in the sky in the day and keeps us warm.", "The sun is very hot today."],
      ['cloud', 'L:nature/cloud', 'awan', "It is white and fluffy and floats in the sky.", "The cloud looks like a sheep."],
      ['rain', 'D:science/20', 'hujan', "Water that falls from dark clouds.", "The rain makes puddles."],
      ['rainbow', 'L:nature/rainbow', 'pelangi', "Colorful stripes in the sky after the rain.", "We see a rainbow after the rain."],
      ['snowflake', 'L:nature/snowflake', 'kepingan salju', "A tiny piece of frozen water that falls from the sky.", "A snowflake melts on my hand."],
      ['wind', 'D:science/23', 'angin', "Moving air. It makes kites fly.", "The wind blows my kite up high."],
      ['storm', 'D:science/21', 'badai', "Strong wind, heavy rain and lightning.", "We stay inside during the storm."],
      ['tornado', 'D:science/24', 'angin puting beliung', "A strong wind that spins round and round.", "A tornado spins very fast."],
      ['ice', 'D:science/27', 'es', "Water that is frozen hard and cold.", "Put some ice in my juice."],
      ['snowman', 'L:nature/snowman', 'boneka salju', "A big doll made of snow with a carrot nose.", "We build a snowman."],
      ['earth', 'D:science/4', 'bumi', "The planet we live on.", "We live on the earth."],
      ['planet', 'D:science/5', 'planet', "A big round world in space that goes around the sun.", "Saturn is a planet with rings."],
    ],
    shapes: [
      ['circle', 'S:shape/circle', 'lingkaran', "A round shape with no corners.", "Draw a circle like a ball."],
      ['square', 'S:shape/square', 'persegi', "A shape with four sides that are all the same.", "The window is a square."],
      ['triangle', 'S:shape/triangle', 'segitiga', "A shape with three sides and three corners.", "The roof looks like a triangle."],
      ['rectangle', 'S:shape/rectangle', 'persegi panjang', "A shape with four sides, two long and two short.", "The door is a rectangle."],
      ['oval', 'S:shape/oval', 'oval', "A round shape that looks like an egg.", "An egg has an oval shape."],
      ['diamond', 'S:shape/diamond', 'belah ketupat', "A shape like a kite with four corners.", "The kite is shaped like a diamond."],
      ['heart', 'S:shape/heart', 'hati', "A shape that means love.", "I draw a heart for Mom."],
      ['pentagon', 'S:shape/pentagon', 'segi lima', "A shape with five sides.", "A pentagon has five corners."],
      ['hexagon', 'S:shape/hexagon', 'segi enam', "A shape with six sides, like a bee's honeycomb.", "Each hole in a honeycomb is a hexagon."],
      ['cube', 'D:objects/88', 'kubus', "A box shape with six square sides.", "The dice is a cube."],
    ],
    numbers: [
      ['one', 'S:num/one', 'satu', "The number 1.", "I have one nose."],
      ['two', 'S:num/two', 'dua', "The number 2.", "I have two eyes."],
      ['three', 'S:num/three', 'tiga', "The number 3.", "A triangle has three sides."],
      ['four', 'S:num/four', 'empat', "The number 4.", "A cat has four legs."],
      ['five', 'S:num/five', 'lima', "The number 5.", "I have five fingers on my hand."],
      ['six', 'S:num/six', 'enam', "The number 6.", "An ant has six legs."],
      ['seven', 'S:num/seven', 'tujuh', "The number 7.", "There are seven days in a week."],
      ['eight', 'S:num/eight', 'delapan', "The number 8.", "An octopus has eight arms."],
      ['nine', 'S:num/nine', 'sembilan', "The number 9.", "My little brother is nine years old."],
      ['ten', 'S:num/ten', 'sepuluh', "The number 10.", "I have ten toes."],
    ],
    sports: [
      ['ball', 'D:objects/41', 'bola', "A round toy you kick or throw.", "Kick the ball to me."],
      ['basketball', 'L:toys/basketball', 'bola basket', "An orange ball you throw into a high hoop.", "We play basketball after school."],
      ['racket', 'D:words2/54', 'raket', "You hit a ball or shuttlecock with it.", "I hold the racket with one hand."],
      ['skates', 'D:words2/56', 'sepatu roda', "Shoes with wheels for rolling fast.", "She rolls on her skates."],
      ['skateboard', 'L:toys/skateboard', 'papan luncur', "A board with four wheels that you ride.", "He rides a skateboard in the park."],
      ['goal', 'L:toys/soccer-goal', 'gawang', "The net where you kick the ball to score.", "He kicks the ball into the goal."],
      ['hoop', 'D:words2/59', 'ring basket', "A ring with a net. You throw the ball through it.", "Throw the ball into the hoop."],
      ['trophy', 'L:game/trophy-gold', 'piala', "A gold cup you win for being the best.", "Our team won a trophy."],
      ['whistle', 'D:objects/69', 'peluit', "You blow it to make a loud sound in a game.", "The coach blows the whistle."],
      ['target', 'L:game/target-board', 'papan sasaran', "A round board with rings. You aim at the middle.", "The arrow hits the target."],
    ],
    toys: [
      ['doll', 'D:objects/81', 'boneka', "A toy that looks like a little person.", "My sister hugs her doll."],
      ['robot', 'D:objects/82', 'robot', "A metal machine toy that can move.", "My robot can walk."],
      ['teddy', 'D:objects/68', 'boneka beruang', "A soft toy bear you can hug.", "I sleep with my teddy."],
      ['kite', 'L:toys/kite', 'layang-layang', "A toy that flies in the wind on a long string.", "We fly a kite on the beach."],
      ['yoyo', 'D:objects/86', 'yoyo', "A round toy that goes up and down on a string.", "I can play with a yoyo."],
      ['balloon', 'D:objects/59', 'balon', "A rubber toy you fill with air.", "The red balloon flies away."],
      ['gamepad', 'L:toys/gamepad', 'stik game', "You hold it with two hands to play video games.", "Pass me the gamepad."],
      ['gift', 'L:things/gift', 'hadiah', "A present in a box with a ribbon.", "I got a gift for my birthday."],
      ['cards', 'D:objects/70', 'kartu', "Small paper pieces you use to play games.", "We play cards together."],
    ],
  }

  var CATEGORIES = [
    { key: 'colors',    name: 'Colors',            id: 'Warna',               icon: 'colors',   ready: true },
    { key: 'school',    name: 'School Objects',    id: 'Benda Sekolah',       icon: 'school',   ready: true },
    { key: 'everyday',  name: 'Everyday Things',   id: 'Benda Sehari-hari',   icon: 'everyday', ready: true },
    { key: 'athome',    name: 'At Home',           id: 'Di Rumah',            icon: 'athome',   ready: true },
    { key: 'quran',     name: "Al-Qur'an",         id: "Al-Qur'an",           icon: 'quran',    ready: true },
    { key: 'farm',      name: 'Farm and Pets',     id: 'Hewan Ternak',        ico: 'L:animals/cow',          scene: 'sunrise',   ready: true, tint: '#FFF0D2' },
    { key: 'wild',      name: 'Wild Animals',      id: 'Hewan Liar',          ico: 'L:animals/lion',         scene: 'jungle',    ready: true, tint: '#E2F4D6' },
    { key: 'sea',       name: 'Sea Animals',       id: 'Hewan Laut',          ico: 'L:animals/dolphin',      scene: 'ocean',     ready: true, tint: '#D4F1FA' },
    { key: 'birdsbugs', name: 'Birds and Bugs',    id: 'Burung dan Serangga', ico: 'L:animals/butterfly',    scene: 'park',      ready: true, tint: '#EFE6FF' },
    { key: 'fruits',    name: 'Fruits',            id: 'Buah',                ico: 'L:food/watermelon',      scene: 'sunrise',   ready: true, tint: '#FFE4E4' },
    { key: 'veggies',   name: 'Vegetables',        id: 'Sayur',               ico: 'L:food/carrot',          scene: 'sunrise',   ready: true, tint: '#E5F7DC' },
    { key: 'food',      name: 'Food and Drinks',   id: 'Makanan dan Minuman', ico: 'L:food/pizza',           scene: 'town',      ready: true, tint: '#FFEBD6' },
    { key: 'vehicles',  name: 'Vehicles',          id: 'Kendaraan',           ico: 'L:vehicles/school-bus',  scene: 'town',      ready: true, tint: '#DCEBFF' },
    { key: 'music',     name: 'Music',             id: 'Alat Musik',          ico: 'L:toys/guitar',          scene: 'classroom', ready: true, tint: '#FFE6F2' },
    { key: 'clothes',   name: 'Clothes',           id: 'Pakaian',             ico: 'D:words2/42',            scene: 'bedroom',   ready: true, tint: '#E3EEFF' },
    { key: 'body',      name: 'Body Parts',        id: 'Bagian Tubuh',        ico: 'D:words/11',             scene: 'bedroom',   ready: true, tint: '#FFEDE3' },
    { key: 'house',     name: 'House and Kitchen', id: 'Rumah dan Dapur',     ico: 'L:things/refrigerator',  scene: 'bedroom',   ready: true, tint: '#FFF1DA' },
    { key: 'jobs',      name: 'Jobs',              id: 'Profesi',             ico: 'D:words/22',             scene: 'town',      ready: true, tint: '#FFE9D9' },
    { key: 'nature',    name: 'Nature',            id: 'Alam',                ico: 'L:park/tree',            scene: 'jungle',    ready: true, tint: '#E1F5DA' },
    { key: 'weather',   name: 'Weather and Sky',   id: 'Cuaca dan Langit',    ico: 'L:nature/rainbow',       scene: 'sky',       ready: true, tint: '#E2F0FF' },
    { key: 'shapes',    name: 'Shapes',            id: 'Bentuk',              ico: 'S:shape/triangle',       scene: 'classroom', ready: true, tint: '#FFF6C9' },
    { key: 'numbers',   name: 'Numbers',           id: 'Angka',               ico: 'S:num/three',            scene: 'classroom', ready: true, tint: '#E6F6DF' },
    { key: 'sports',    name: 'Sports',            id: 'Olahraga',            ico: 'L:toys/soccer-ball',     scene: 'park',      ready: true, tint: '#DDF3EA' },
    { key: 'toys',      name: 'Toys',              id: 'Mainan',              ico: 'L:toys/rocking-horse',   scene: 'bedroom',   ready: true, tint: '#FFE3EC' },
    { key: 'mixed',     name: 'Mixed Challenge',   id: 'Tantangan Campur',    icon: 'mixed',    ready: true, mixed: true },
  ]

  /* picture key -> repo-relative file. L: named library, D: numbered owner
     sheet, S: assets/spelling (drawn for this game). */
  function keyPath (k) {
    var t = k.slice(0, 2), rest = k.slice(2)
    if (t === 'L:') return 'assets/db/lib/' + rest + '.webp'
    if (t === 'S:') return 'assets/spelling/' + rest + '.webp'
    if (t === 'D:') { var p = rest.split('/'); return 'assets/db/' + p[0] + '/' + ('000' + p[1]).slice(-3) + '.webp' }
    return ''
  }
  for (var ck in MORE) {
    if (!MORE.hasOwnProperty(ck)) continue
    MORE[ck].forEach(function (r) {
      WORDS.push({ w: r[0], cat: ck, src: keyPath(r[1]), id: r[2], clue: r[3], pos: 'noun', say: r[4] })
    })
  }
  CATEGORIES.forEach(function (c) { if (c.ico) c.iconSrc = keyPath(c.ico) })

  /* Every word's picture, repo-relative. The first 63 words keep their
     assets/spelling/<dir>/<pic>.webp files; the expansion points at owner art. */
  function picPath (x) { return x.src || ('assets/spelling/' + x.dir + '/' + x.pic + '.webp') }

  /* Level 1 = short words, level 2 = long. A DRILL, never a lock. */
  function levelOf (word) { return word.length <= 5 ? 1 : 2 }
  /* Difficulty for the word cards (owner brief 2026-10-06): 3-4 letters is
     easy, 5-6 medium, 7+ hard. Shown, never used to lock anything. */
  function diffOf (word) { return word.length <= 4 ? 1 : word.length <= 6 ? 2 : 3 }

  function list (cat, level) {
    var pool = cat === 'mixed' ? WORDS.slice() : WORDS.filter(function (x) { return x.cat === cat })
    if (level) pool = pool.filter(function (x) { return levelOf(x.w) === level })
    return pool
  }

  W.SpellingData = {
    WORDS: WORDS,
    CATEGORIES: CATEGORIES,
    levelOf: levelOf,
    diffOf: diffOf,
    picPath: picPath,
    keyPath: keyPath,
    list: list,
    find: function (w) { for (var i = 0; i < WORDS.length; i++) if (WORDS[i].w === w) return WORDS[i]; return null },
    counts: function (cat) { return { l1: list(cat, 1).length, l2: list(cat, 2).length, all: list(cat).length } },
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = W.SpellingData
})()
