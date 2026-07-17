/* ═══════════════════════════════════════════════════════════════════════
   MATH STORIES — window.MATH_STORIES  (P4a, 2026-07-17)
   ---------------------------------------------------------------------------
   Story-mode data for "Matematika Petualangan" (games/kuis-matematika.html, G25).
   Goal: children learn MATH *and* READING. The game now picks a RANDOM monster
   sprite id (1..281) per battle and calls MATH_STORIES.forMonster(id). Every one
   of the 281 monsters gets a UNIQUE, creature-FITTING little arc:

       { name, sub, intro, banter:[{who:'hero'|'monster', text}], victory }

   - name : display name. 1..81  = the appearance-matched Indonesian SPRITE_NAMES
            (kept as-is). 82..281 = the printed English name on the sprite sheets.
     sub  : short Indonesian descriptor fitting the creature ("si hantu pemalu",
            "slime bajak laut", "rubah api kecil", "kaktus berduri" …).
     intro/banter/victory : warm, kid-safe Indonesian; a tiny math+literacy arc
            (challenge → back-and-forth → friendship). A ghost story ≠ a dragon
            story ≠ a cactus story — arcs are seeded per (kind, name, id) so every
            monster reads uniquely and matches its look.

   A handful of the most iconic monsters are HAND-AUTHORED (pirate slime, a ghost,
   a dragon, a fox, a cactus …); the rest are generated from strong per-KIND pools.

   BACKWARD-COMPAT: get(world,level) / getByGlobal(g) are retained (fallback for
   old callers) and return the same shape incl. `monster` (=name).

   Vanilla ES5 (var / IIFE / no arrow / no const). Idempotent guard.
   See: "documentation and standarization/MATH_STORY_STANDARD.md".
   ═══════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
if(window.MATH_STORIES && window.MATH_STORIES.forMonster) return; // idempotent

var WORLDS=10, LEVELS=10;
var SPRITES=281;         // assets/math/monsters/mon-1.webp .. mon-281.webp
var LEGACY_SPRITES=81;   // 1..81 keep the curated Indonesian names / (world,level) map

/* ── SPRITE_NAMES — index 0..80 → kid-safe Indonesian name that MATCHES the look
      of assets/math/monsters/mon-(i+1).webp. Kept from the previous version. ── */
var SPRITE_NAMES=[
  /* 1  */ 'Kapten Lendir',    // pirate-hat green slime
  /* 2  */ 'Si Bola Mata',     // single big-eye white blob
  /* 3  */ 'Bebek Penjelajah', // little duck holding a staff
  /* 4  */ 'Naga Jingga',      // orange baby dragon
  /* 5  */ 'Si Toples Ikan',   // fishbowl with a fish inside
  /* 6  */ 'Si Mata Satu',     // green one-eyed goblin
  /* 7  */ 'Awan Rintik',      // blue rain cloud
  /* 8  */ 'Jamur Merah',      // red toadstool mushroom
  /* 9  */ 'Rubi si Rubah',    // orange fox
  /* 10 */ 'Bintang Kelip',    // yellow star creature
  /* 11 */ 'Si Bulu Biru',     // fuzzy blue monster
  /* 12 */ 'Ksatria Batu',     // gray armored little knight
  /* 13 */ 'Robo Kecil',       // tiny robot
  /* 14 */ 'Dino Jambu',       // pink dinosaur
  /* 15 */ 'Si Sayap Api',     // orange winged fox-bat
  /* 16 */ 'Si Lendir Hijau',  // smiling green slime
  /* 17 */ 'Hantu Ungu',       // purple one-eyed ghost
  /* 18 */ 'Monyet Lincah',    // brown monkey
  /* 19 */ 'Rubah Api',        // orange fox (fiery)
  /* 20 */ 'Si Tetes Biru',    // blue water-drop sprite
  /* 21 */ 'Kura Hijau',       // green turtle
  /* 22 */ 'Kura Pendekar',    // turtle warrior with a sword
  /* 23 */ 'Robo Baja',        // gray armored robot
  /* 24 */ 'Si Merah Ceria',   // cheery red one-eyed monster
  /* 25 */ 'Si Mata Hijau',    // green cyclops
  /* 26 */ 'Si Tanduk Ungu',   // purple horned monster
  /* 27 */ 'Si Api Bertanduk', // red horned little demon (friendly)
  /* 28 */ 'Peri Kembang',     // blue ghost with a flower
  /* 29 */ 'Gurita Bajak',     // pirate octopus with a hat
  /* 30 */ 'Batu Gerutu',      // grumpy gray rock beast
  /* 31 */ 'Kucing Loncat',    // playful cat
  /* 32 */ 'Aksol Biru',       // blue axolotl
  /* 33 */ 'Daun Ceria',       // leaf sprite
  /* 34 */ 'Tunas Hijau',      // green sprout creature
  /* 35 */ 'Kumbang Sungut',   // teal antenna bug
  /* 36 */ 'Si Buku',          // walking book monster
  /* 37 */ 'Awan Pelangi',     // rainbow rain cloud
  /* 38 */ 'Kapten Gurita',    // pirate octopus (captain)
  /* 39 */ 'Topi Jerami',      // straw-hat little hero-monster
  /* 40 */ 'Rubah Berjubah',   // caped orange fox
  /* 41 */ 'Tunas Melcompat',  // hopping green sprout
  /* 42 */ 'Naga Kecil',       // small orange dragon
  /* 43 */ 'Si Jambu Manis',   // pink round monster
  /* 44 */ 'Si Biru Melambai', // waving blue monster
  /* 45 */ 'Topi Jerami Ceria',// straw-hat cheery hero
  /* 46 */ 'Si Biru Gembul',   // chubby blue blob
  /* 47 */ 'Hantu Ungu Lucu',  // funny purple ghost
  /* 48 */ 'Si Bulu Ungu',     // fuzzy purple monster
  /* 49 */ 'Si Oranye Berbulu',// furry orange monster
  /* 50 */ 'Si Bulu Kelabu',   // fuzzy gray monster
  /* 51 */ 'Kapten Merah',     // red pirate-ish monster
  /* 52 */ 'Si Mata Hijau Riang', // green cyclops (jolly)
  /* 53 */ 'Tunas Kembar',     // twin green sprouts
  /* 54 */ 'Kura Garang',      // bold turtle
  /* 55 */ 'Si Oranye Bertanduk', // orange horned monster
  /* 56 */ 'Gurita Ungu',      // purple octopus
  /* 57 */ 'Si Kuning Ceria',  // cheery yellow blob
  /* 58 */ 'Si Jingga Manis',  // sweet orange blob
  /* 59 */ 'Si Biru Malu',     // shy blue ghost
  /* 60 */ 'Rubah Jingga',     // orange fox
  /* 61 */ 'Si Biru Kecil',    // little blue monster
  /* 62 */ 'Si Kelabu Gembul', // chubby gray monster
  /* 63 */ 'Panda Kecil',      // little panda
  /* 64 */ 'Si Putih Bulat',   // round white blob
  /* 65 */ 'Si Bulat Manis',   // sweet round monster
  /* 66 */ 'Si Bola Rambut',   // fuzzy hairball creature
  /* 67 */ 'Kunci Ajaib',      // magic keyhole creature
  /* 68 */ 'Ksatria Perak',    // silver knight
  /* 69 */ 'Ksatria Pedang',   // sword knight
  /* 70 */ 'Aksol Merah Muda', // pink axolotl
  /* 71 */ 'Aksol Pelangi',    // rainbow axolotl
  /* 72 */ 'Si Hijau Senyum',  // smiling green blob
  /* 73 */ 'Aksol Ungu',       // purple axolotl
  /* 74 */ 'Si Pelangi',       // rainbow blob
  /* 75 */ 'Si Topi Ceria',    // hatted cheery blob
  /* 76 */ 'Duri si Kaktus',   // cactus
  /* 77 */ 'Si Sipit Cokelat', // squinty brown monster
  /* 78 */ 'Si Teropong',      // telescope creature
  /* 79 */ 'Si Api Kecil',     // little red flame demon (friendly)
  /* 80 */ 'Ksatria Naga',     // dragon knight
  /* 81 */ 'Kompas Petualang'  // compass creature
];

/* ── Registry data (auto-generated by /tmp/gen_math_stories.py from the sheets).
      KINDS_1_81 = the creature kind for each SPRITE_NAMES entry.
      S1_* = sheet-1 mon-82..181 (mixed creatures).
      S2_* = sheet-2 mon-182..281 (all ghosts). ── */
var KINDS_1_81=['slime','eye','duck','dragon','fish','goblin','cloud','mushroom','fox','star','fuzz','knight','robot','dino','fox','slime','ghost','monkey','fox','water','turtle','turtle','robot','eye','eye','horn','flame','fairy','octopus','rock','cat','axolotl','leaf','plant','bug','book','cloud','octopus','hat','fox','plant','dragon','blob','blob','hat','blob','ghost','fuzz','fuzz','fuzz','pirate','eye','plant','turtle','horn','octopus','blob','blob','ghost','fox','blob','fuzz','panda','blob','blob','fuzz','key','knight','knight','axolotl','axolotl','blob','axolotl','rainbow','hat','cactus','blob','telescope','flame','dragon','compass'];
var S1_NAMES=['Florb','Zoggy','Pinku','Droplet','Munchi','Glibbo','Pricko','Blazey','Icicle','Ollie','Nibbles','Bloop','Puffin','Sprout','Twirl','Pebbi','Wobbly','Squish','Zippy','Tako','Bubbles','Crumpo','Lumi','Hooty','Slinky','Boingo','Yeti','Noodle','Dazzle','Glumpy','Floop','Cheeko','Sprinkle','Tanku','Wisp','Pompom','Gizmo','Taffy','Rollo','Snarpy','Melo','Fizzy','Waggo','Binky','Doodly','Giggle','Puddle','Pip','Lurch','Kiki','Squig','Orbis','Bambee','Plinky','Dango','Whiffy','Zuzu','Crackle','Misty','Quibble','Marshy','Niblet','Loop','Gonk','Squee','Flippo','Bork','Toastie','Drifty','Blip','Vorn','Coco','Brrr','Dinky','Poppy','Skid','Nugget','Shroomy','Tooty','Wiggles','Beany','Gloop','Thimble','Pesto','Dapple','Jello','Vivi','Spring','Bonbon','Runt','Kuma','Nim','Boop','Pipsqueak','Gurgle','Tater','Blinky','Zipzap','Mama','Ploop'];
var S1_KINDS=['eye','slime','slime','water','blob','slime','cactus','flame','snow','fuzz','blob','octopus','cloud','plant','snail','rock','slime','blob','star','octopus','water','rock','blob','owl','snake','blob','snow','snake','fuzz','star','dog','monkey','blob','blob','snake','fuzz','robot','blob','slime','cat','slime','water','bug','blob','slime','blob','fuzz','star','blob','cat','slime','blob','bug','blob','blob','blob','star','cloud','blob','blob','plant','blob','ring','slime','plant','blob','blob','food','cloud','robot','eye','blob','snow','blob','blob','blob','eye','mushroom','plant','snake','blob','slime','blob','blob','dog','food','blob','plant','food','blob','spider','cat','blob','mouse','eye','blob','eye','star','cat','slime'];
var S2_NAMES=['Boohoo','Wispie','Pufflet','Twinkle','Mimi','Gloop','Casperino','Hattie','Jellyboo','Spectra','Skeddle','Floatie','Chilly','Blinky','Noodle','Pesky','Dottie','Shyboo','Zippy','Vapor','Pip','Plume','Bubbles','Slinko','Drifta','Candle','Boing','Smudge','Peekaboo','Wobble','Ghoulie','Tutu','Rattle','Echo','Doodle','Nimbo','Flicker','Squig','Hiccup','Patches','Moony','Starry','Phanto','Rustle','Pebble','Owlie','Whiff','Napper','Crinkle','Sprits','Umbra','Glinti','Cheeria','Pondy','Scarfy','Toasty','Blossom','Sherbi','Windy','Corny','Boops','Squash','Taffy','Hexie','Wavery','Champ','Splotch','Jingles','Tricks','Spookyli','Misty','Marble','Jiggy','Pillow','Ripple','Tube','Crumb','Sushi','Swoop','Blinkyboo','Floof','Gargle','Blinket','Pikaboo','Zizzle','Belette','Pasta','Dapper','Dewy','Squealy','Mysti','Glitter','Bongo','Puffin','Drizzle','Wiggles','Popo','Sniffle','Webby','Zomboo'];

/* ── Build the flat MONSTERS registry: id (1..281) → {id,name,sub,kind}. ── */
function buildMonsters(){
  var arr=new Array(SPRITES+1); // 1-based; index 0 unused
  var i;
  for(i=0;i<LEGACY_SPRITES;i++){
    arr[i+1]={ id:i+1, name:SPRITE_NAMES[i], kind:KINDS_1_81[i], sub:null };
  }
  for(i=0;i<S1_NAMES.length;i++){
    arr[82+i]={ id:82+i, name:S1_NAMES[i], kind:S1_KINDS[i], sub:null };
  }
  for(i=0;i<S2_NAMES.length;i++){
    arr[182+i]={ id:182+i, name:S2_NAMES[i], kind:'ghost', sub:null };
  }
  // fill each sub from a per-kind descriptor pool (seeded so it's stable+varied)
  for(i=1;i<=SPRITES;i++){
    var m=arr[i]; if(!m) continue;
    m.sub = m.sub || pickN(kindOf(m.kind).subs, m.id, m.name, 7);
  }
  return arr;
}

/* ════════════ per-KIND flavor — sub descriptors + story pools ════════════
   Each kind gets:
     subs   : short Indonesian creature descriptors (the small subtitle)
     open   : monster opening challenge lines (fits the creature)
     mid    : monster mid lines (softening / impressed)
     turn   : monster turning-point (befriends you) lines
     intro  : intro sentence templates ({name} substituted)
     vict   : victory sentence templates ({name} substituted)
   Pools are big enough that seeded picks feel unique across many monsters. */
var KIND={};

function K(subs, open, mid, turn, intro, vict){ return {subs:subs,open:open,mid:mid,turn:turn,intro:intro,vict:vict}; }

KIND.ghost=K(
  ['hantu pemalu','hantu putih lembut','hantu penunggu ramah','hantu awan kecil','hantu malu-malu','hantu baik hati','hantu penjaga malam','hantu mungil'],
  ['Huu… jangan lari dulu. Aku cuma mau kamu menjawab satu soal.',
   'Boo! Eh, maaf mengagetkan. Beranikah kamu menghitung bersamaku?',
   'Aku hantu yang kesepian… maukah kamu menemaniku dengan soal-soal ini?',
   'Huu~ aku melayang menunggu anak pintar. Kamukah orangnya?',
   'Jangan takut padaku, ya. Aku hanya ingin bermain angka.'],
  ['Hii, jawabanmu benar! Aku sampai lupa menakut-nakuti.',
   'Kamu tidak lari? Hatiku jadi hangat, tidak dingin lagi.',
   'Setiap jawaban benarmu membuat tubuhku makin bercahaya.',
   'Wah, kamu berani sekali menemani hantu sepertiku.'],
  ['Terima kasih sudah tidak takut. Aku tidak kesepian lagi.',
   'Kamu mengubah hantu penyendiri jadi teman yang gembira.',
   'Boo tak lagi menakutkan — sekarang artinya "halo, teman!".',
   'Aku melayang bahagia karena akhirnya punya sahabat sepertimu.'],
  ['{name} si hantu kecil mengambang malu-malu dari balik pohon, membawa soal untukmu.',
   '{name} muncul pelan dari kabut, tersenyum, dan menyodorkan teka-teki angka.',
   'Di lorong yang temaram, {name} melayang mendekat dan menyapamu dengan lembut.'],
  ['{name} berpendar terang dan melambai riang — hantu dan pahlawan kini berteman!',
   '{name} tertawa gembira, kabut menghilang, dan jalan pun terbuka untukmu.',
   '{name} mengambang mengitarimu, memberkatimu dengan cahaya hangat.']
);

KIND.slime=K(
  ['slime kenyal ceria','lendir mungil','slime bulat lucu','gumpalan kenyal','slime menggemaskan','lendir gembira'],
  ['Blub-blub! Aku kenyal, tapi soalku tidak lembek. Berani coba?',
   'Aku menggelinding kesana-kemari. Bisa kamu tangkap jawabannya?',
   'Boing! Aku slime penjaga jalan. Jawab dulu, baru boleh lewat.',
   'Aku lembut tapi keras kepala soal angka. Ayo buktikan kepintaranmu!'],
  ['Blub! Jawabanmu benar, tubuhku sampai memantul senang.',
   'Kamu tidak menyerah walau aku kenyal dan licin. Hebat!',
   'Setiap jawaban benarmu membuatku menggelembung gembira.',
   'Kamu membuat soal susah jadi mudah dikunyah, hihi.'],
  ['Baiklah, kamu menang! Ayo menggelinding bersamaku, teman.',
   'Aku kalah, tapi senang — kamu slime… eh, sahabat terbaik!',
   'Kepintaranmu lebih kenyal dari tubuhku. Aku kagum!',
   'Yuk berteman! Aku akan memantul gembira mengikutimu.'],
  ['{name} menggelinding kenyal menghadangmu, memantul-mantul sambil membawa soal.',
   '{name} si slime muncul dengan senyum lebar dan melempar teka-teki angka padamu.',
   'Blub! {name} melompat riang di depanmu, menantangmu berhitung.'],
  ['{name} memantul gembira dan menyingkir, membuka jalanmu dengan riang!',
   '{name} menggelinding senang mengitarimu — kalian pun jadi teman kenyal!',
   '{name} berkilau lembut dan melambai, mengantarmu ke petualangan berikutnya.']
);

KIND.dragon=K(
  ['naga kecil pemberani','naga mungil bersayap','naga api ceria','naga baby yang hangat','naga penjaga muda'],
  ['Grrr! Aku naga kecil. Sanggupkah kamu menjawab secepat kepakan sayapku?',
   'Ayo balapan menjawab! Naga suka tantangan yang panas!',
   'Sayapku kuat, tapi soalku lebih kuat lagi. Berani lawan aku?',
   'Aku menjaga gerbang ini. Buktikan kamu pantas lewat, pengembara!'],
  ['Wah! Jawabanmu cepat dan tepat. Apiku sampai berpijar kagum.',
   'Kamu tenang walau aku garang. Itu keberanian sejati!',
   'Setiap jawaban benarmu membuat sayapku makin bersemangat.',
   'Kamu tak gentar pada naga? Hebat sekali kamu!'],
  ['Aku mengaku kalah — dan bangga punya teman sepemberani kamu.',
   'Naga garang ini takluk oleh kepintaranmu. Ayo terbang bersama!',
   'Kamu memenangkan hatiku. Mari kita jaga negeri ini berdua.',
   'Apiku kini menghangatkan, bukan menakuti — terima kasih, teman.'],
  ['{name} sang naga kecil mengepakkan sayap dan menantangmu berlomba menjawab.',
   'Dengan asap tipis dari hidungnya, {name} berdiri gagah menghadangmu.',
   '{name} mengaum kecil dan menyodorkan sekantong soal yang menyala-nyala.'],
  ['{name} menyemburkan kilau hangat dan terbang riang menemani perjalananmu!',
   '{name} mengangguk hormat, sayapnya berkilau, dan gerbang pun terbuka.',
   '{name} terbang berputar gembira di atasmu, merayakan kemenanganmu.']
);

KIND.fox=K(
  ['rubah lincah','rubah api kecil','rubah oranye ceria','rubah gesit','rubah ekor bercahaya'],
  ['Halo! Aku rubah tercepat di sini. Bisa kejar jawabanku?',
   'Ekorku bergoyang menunggu lawan pintar. Ayo, tunjukkan!',
   'Aku suka berlari sambil berhitung. Mau ikut denganku?',
   'Wush! Aku lincah. Tapi apakah pikiranmu selincah lariku?'],
  ['Gesit sekali jawabanmu! Ekorku bergoyang senang.',
   'Kamu mengikuti langkahku tanpa lelah. Aku kagum!',
   'Setiap jawaban benarmu membuat buluku makin cerah.',
   'Kamu cepat sekaligus tenang — kombinasi yang hebat!'],
  ['Aku suka berteman dengan anak selincah kamu. Ayo berlari bersama!',
   'Kamu menangkap semua jawaban. Rubah ini kagum padamu!',
   'Larimu dan pikiranmu sama tajamnya. Kita berteman, ya?',
   'Ekorku bergoyang gembira — kamu sahabat baruku!'],
  ['{name} si rubah gesit menyapamu, ekornya bergoyang membawa teka-teki angka.',
   '{name} berlari mengitarimu sekali, lalu berhenti menantangmu menjawab.',
   'Dengan mata cerdik, {name} menyodorkan soal sambil mengibaskan ekornya.'],
  ['{name} melompat gembira dan berlari mengitarimu merayakan kemenanganmu!',
   '{name} meninggalkan jejak cahaya kebahagiaan sambil menemani langkahmu.',
   '{name} mengibaskan ekornya yang bersinar dan berlari riang di sisimu.']
);

KIND.cactus=K(
  ['kaktus berduri ramah','kaktus mungil gurun','kaktus hijau ceria','kaktus penjaga oase'],
  ['Awas duriku! Tapi tenang, aku cuma mau menguji hitunganmu.',
   'Aku tumbuh kokoh di gurun. Tahan panas dan jawab soalku, ya!',
   'Duriku tajam, tapi hatiku lembut. Ayo berhitung bersama.',
   'Aku sabar menunggu hujan… dan menunggu anak pintar sepertimu.'],
  ['Wah, jawabanmu benar! Bungaku sampai mekar sedikit.',
   'Kamu sabar seperti aku menunggu hujan. Bagus sekali!',
   'Setiap jawaban benarmu membuat duriku terasa lebih lembut.',
   'Kamu tak takut duriku — hatimu benar-benar berani.'],
  ['Duriku melunak oleh kebaikanmu. Ayo jadi teman, pengembara!',
   'Kaktus berduri ini takluk oleh kesabaranmu. Terima kasih!',
   'Kamu membuat bungaku mekar. Aku senang sekali punya sahabat.',
   'Di gurun yang sepi, akhirnya aku punya teman sepertimu.'],
  ['{name} si kaktus berdiri kokoh di jalan berpasir, durinya berkilau menantangmu.',
   'Di tengah gurun, {name} menyapamu dengan bunga kecil di pucuknya dan sebuah soal.',
   '{name} bergoyang pelan tertiup angin gurun, lalu menyodorkan teka-teki angka.'],
  ['{name} mekar berbunga cerah dan menyingkir, membuka jalanmu di gurun!',
   '{name} bergoyang riang, durinya melunak, dan oase pun tampak di kejauhan.',
   '{name} memberimu setetes air segar dari dalam tubuhnya sebagai tanda persahabatan.']
);

KIND.robot=K(
  ['robot mungil ramah','robot kecil berkedip','robot penjaga sirkuit','robot ceria'],
  ['Bip-bip! Sistem soal aktif. Bisakah kamu menjawabnya?',
   'Bzzt! Aku robot penghitung. Ayo uji kepintaranmu denganku.',
   'Data soal siap dimuat. Buktikan kamu pintar, ya!',
   'Bip! Aku menunggu lawan yang cerdas. Kamukah itu?'],
  ['Bip! Jawaban benar terdeteksi. Lampu-lampuku menyala senang.',
   'Prosesorku kagum — kamu tak pernah salah hitung!',
   'Setiap jawaban benarmu mengisi ulang bateraiku dengan gembira.',
   'Bzzt! Kamu lebih pintar dari perhitunganku.'],
  ['Bip-bip! Status: berteman. Kamu sahabat terbaikku!',
   'Sistemku menyatakan kamu menang. Dan aku bahagia karenanya!',
   'Kamu menyalakan semua lampuku. Ayo berpetualang bersama!',
   'Robot ini takluk oleh kepintaranmu. Terima kasih, teman!'],
  ['{name} si robot mungil berkedip lampu-lampunya dan menyodorkan layar berisi soal.',
   'Dengan suara bip riang, {name} menghadangmu dan memulai kuis angka.',
   '{name} berputar sekali, lampunya menyala, lalu menantangmu berhitung.'],
  ['{name} berkelap-kelip gembira dan membuka jalanmu dengan hormat!',
   '{name} memberimu bintang kecil dari lengan robotnya sebagai tanda persahabatan.',
   '{name} berbunyi bip gembira dan mengantarmu ke petualangan berikutnya.']
);

KIND.eye=K(
  ['si mata besar','makhluk bermata satu','si mata jeli','si bola mata ceria'],
  ['Mataku besar, jadi aku suka melihat angka. Berani menjawab?',
   'Aku mengintip dari sini. Tunjukkan jawaban yang tepat, ya!',
   'Mataku jeli mengawasi soal. Bisa kamu jawab semua?',
   'Aku melihat kamu anak pintar. Buktikan dengan menjawab!'],
  ['Mataku makin cerah setiap jawaban benarmu!',
   'Aku melihat kepintaranmu dengan jelas. Hebat sekali!',
   'Kamu tak lolos dari pandanganku — semua jawabanmu tepat!',
   'Wah, kamu membuat mataku berbinar kagum.'],
  ['Keberanianmu membuka mataku. Ayo berteman, pahlawan kecil!',
   'Kini aku melihat seorang sahabat, bukan lawan. Terima kasih!',
   'Kamu memenangkan pandanganku. Aku senang mengenalmu.',
   'Mataku berbinar bahagia — kamu teman terbaikku!'],
  ['{name} yang bermata besar mengerjap penasaran, memandangimu sambil membawa soal.',
   '{name} mengintip dari balik semak, matanya berkedip menantangmu menjawab.',
   'Dengan satu mata besar yang jeli, {name} menyodorkan teka-teki angka.'],
  ['{name} berkedip gembira dan menunjukkanmu jalan ke depan!',
   '{name} mengerjap hangat, memberimu keberanian sebagai bekal perjalanan.',
   '{name} berbinar riang dan melambai, mengantarmu melangkah maju.']
);

KIND.knight=K(
  ['ksatria mungil pemberani','ksatria berzirah kecil','ksatria penjaga gerbang','ksatria pedang kayu'],
  ['Berhenti! Buktikan kamu layak lewat dengan menjawab soalku.',
   'Aku penjaga tempat ini. Pedang sejati adalah kepandaian — tunjukkan!',
   'Hormat, pengembara. Mari kita uji kecerdasanmu dalam bertarung angka.',
   'Zirahku kuat, tapi kecerdasan lebih kuat. Ayo buktikan!'],
  ['Serangan jawabanmu tepat sasaran! Aku kagum.',
   'Kamu bertarung dengan pikiran, bukan pedang. Hebat!',
   'Setiap jawaban benarmu menembus zirahku. Luar biasa!',
   'Kamu ksatria angka sejati — tak pernah meleset!'],
  ['Aku menyarungkan pedang dan memberi hormat. Kamu menang!',
   'Kepandaianmu lebih tajam dari pedangku. Ayo berteman!',
   'Ksatria ini takluk oleh kecerdasanmu. Suatu kehormatan!',
   'Kamu layak jadi ksatria. Aku bangga berteman denganmu.'],
  ['{name} sang ksatria mungil berdiri gagah menjaga jalan, menantangmu berduel angka.',
   'Dengan perisai terangkat, {name} menghadangmu dan menyodorkan tantangan soal.',
   '{name} mengetuk pedangnya ke tanah dan memulai adu kepandaian denganmu.'],
  ['{name} mengangkat perisainya memberi hormat untuk merayakan kemenanganmu!',
   '{name} menyarungkan pedang dan membukakan gerbang dengan bangga.',
   '{name} membungkuk hormat — kamu telah membuktikan kecerdasanmu.']
);

KIND.turtle=K(
  ['kura-kura sabar','kura-kura berbatok tebal','kura pendekar','kura hijau tenang'],
  ['Pelan-pelan, ya. Jawablah soalku dengan sabar dan cermat.',
   'Aku lambat tapi pasti. Bisakah kamu setekun aku?',
   'Batokku kuat, kesabaranku lebih kuat. Ayo berhitung tenang.',
   'Aku penjaga jalan ini. Tunjukkan ketelitianmu, ya.'],
  ['Sabar sekali kamu, seperti langkahku yang tak tergesa. Bagus!',
   'Jawabanmu mantap satu per satu. Aku kagum.',
   'Kamu teliti dan tenang — batokku sampai berkilau senang.',
   'Ketekunanmu seperti kura-kura sejati. Hebat!'],
  ['Sekarang jalan ini tak lagi menakutkan. Ayo berteman!',
   'Kesabaranmu mengalahkanku. Aku bangga jadi temanmu.',
   'Pelan tapi pasti, kamu memenangkan hatiku. Terima kasih!',
   'Kura-kura ini takluk oleh ketenanganmu. Mari melangkah bersama.'],
  ['{name} si kura-kura melangkah pelan menyapamu, membawa soal dengan sabar.',
   '{name} menjulurkan kepala dari batoknya dan menyodorkan teka-teki angka.',
   'Dengan langkah tenang, {name} menghadangmu dan mengajakmu berhitung.'],
  ['{name} melangkah tenang membuka jalanmu, sabar menuntunmu ke depan!',
   '{name} mengangguk bangga di dalam batoknya dan melambaikan kaki kecilnya.',
   '{name} tersenyum tenang dan menemani langkahmu dengan sabar.']
);

KIND.cloud=K(
  ['awan mungil','awan rintik ceria','awan lembut','awan penabur gerimis'],
  ['Rintik! Aku suka bikin gerimis. Berani menjawab walau basah?',
   'Aku mengambang pelan. Bisa kamu tangkap jawaban di antara tetesan?',
   'Huu, angin sepoi membawa soalku. Ayo jawab dengan riang!',
   'Aku awan penjaga langit. Tunjukkan pikiranmu yang cerah, ya.'],
  ['Wah, kamu tetap tenang walau kena tetesan. Keren!',
   'Setiap jawaban benarmu membuat awanku makin cerah.',
   'Kamu secerah matahari yang menembus awanku.',
   'Pikiranmu jernih seperti langit sesudah hujan.'],
  ['Aku belajar hal baru darimu. Ayo mengambang bersama!',
   'Awan ini jadi cerah karena persahabatanmu. Terima kasih!',
   'Kamu mengubah gerimis jadi pelangi. Aku senang sekali.',
   'Mari melayang bersama menuju petualangan baru, teman!'],
  ['{name} si awan mungil mengambang pelan di dahan, menaburkan soal-soal gerimis.',
   'Dengan gerimis lembut, {name} menyapamu dan menyodorkan teka-teki angka.',
   '{name} melayang mendekat, tetesan kecilnya berkilau membawa tantangan.'],
  ['{name} menurunkan gerimis lembut yang menyejukkan langkahmu!',
   '{name} membuka menjadi langit cerah berpelangi, mengantarmu maju.',
   '{name} mengambang riang di atasmu, memberkatimu dengan udara sejuk.']
);

KIND.mushroom=K(
  ['jamur bertudung ceria','jamur merah lucu','jamur mungil hutan','jamur penjaga gua'],
  ['Aku tumbuh kokoh di sini. Yakin bisa menjawab soalku?',
   'Tudungku lebar melindungi soal-soalku. Ayo, coba jawab!',
   'Aku jamur penjaga jalan. Buktikan kepintaranmu, ya.',
   'Aku tumbuh pelan tapi pasti. Bisakah kamu setekun itu?'],
  ['Semangatmu kuat, dan hatimu hangat. Bagus sekali!',
   'Setiap jawaban benarmu membuat tudungku bergoyang senang.',
   'Kamu tumbuh dalam kepintaran, seperti jamur setelah hujan.',
   'Kekuatan sejati datang dari usaha — dan usahamu hebat!'],
  ['Kata-katamu bijak. Aku menyingkir, silakan lewat, teman!',
   'Jamur ini takluk oleh ketekunanmu. Ayo berteman!',
   'Kamu membuatku tumbuh gembira. Terima kasih, sahabat.',
   'Di gua yang sepi, akhirnya aku punya teman sepertimu.'],
  ['{name} si jamur berdiri kokoh di mulut jalan, tudungnya bergoyang membawa soal.',
   '{name} muncul dari tanah lembap dan menyodorkan teka-teki angka.',
   'Dengan tudung lebarnya, {name} menghadangmu dan mengajakmu berhitung.'],
  ['{name} bergoyang riang dan membuka jalan menuju petualangan baru!',
   '{name} menaburkan spora berkilau dan menyingkir dengan gembira.',
   '{name} tersenyum di bawah tudungnya dan menuntunmu melangkah maju.']
);

KIND.octopus=K(
  ['gurita bajak laut','gurita berlengan delapan','gurita ceria','gurita penjaga laut'],
  ['Selamat datang, pengembara laut! Tunjukkan ketenanganmu dengan menjawab.',
   'Delapan lenganku memegang delapan soal. Berani hadapi semua?',
   'Aku gurita penjaga karang. Buktikan kepintaranmu, ya!',
   'Ombak membawa soalku. Ayo tangkap jawabannya dengan tenang.'],
  ['Jernih sekali pikiranmu, seperti air laut yang tenang!',
   'Setiap jawaban benarmu membuat lenganku menari senang.',
   'Kamu tenang menghadapi ombak soalku. Hebat!',
   'Delapan lenganku bertepuk kagum untukmu.'],
  ['Kamu pantas melanjutkan. Aku memberkatimu, teman!',
   'Gurita ini takluk oleh ketenanganmu. Ayo berteman!',
   'Kamu memenangkan hatiku yang berlengan delapan. Terima kasih!',
   'Mari menyelam bersama menuju petualangan baru, sahabat.'],
  ['{name} si gurita melambaikan delapan tangannya, menyapamu dengan sekantong soal.',
   'Dari balik karang, {name} muncul dan menyodorkan teka-teki angka.',
   '{name} berayun tenang di air, lengannya membawa tantangan hitung untukmu.'],
  ['{name} melambaikan kedelapan tangannya, menyinarimu dengan kedamaian laut!',
   '{name} berputar gembira di air dan membuka jalanmu dengan riang.',
   '{name} menyemburkan gelembung ceria dan menemani perjalananmu.']
);

KIND.star=K(
  ['bintang berkelip','bintang mungil bercahaya','bintang ceria','bintang penerang jalan'],
  ['Cahayaku menerangi segalanya! Berani menjawab teka-tekiku?',
   'Aku berkelip menunggu anak pintar. Kamukah itu?',
   'Setiap bintang punya soal. Ayo, tunjukkan kepintaranmu!',
   'Aku bersinar di langit. Buktikan pikiranmu juga bersinar.'],
  ['Setiap jawaban benarmu membuat cahayaku makin hangat!',
   'Kamu bersinar seterang bintang. Aku kagum!',
   'Kepintaranmu berkelip cerah — aku sampai silau senang.',
   'Kamu membuat langit malam ini lebih terang.'],
  ['Ilmu adalah cahaya dari dalam. Ayo bersinar bersama, teman!',
   'Bintang ini kalah oleh cahayamu. Terima kasih sudah menemaniku!',
   'Kamu memenangkan kelipku. Mari terangi jalan bersama.',
   'Aku berkelip bahagia — kamu sahabat yang bercahaya!'],
  ['{name} yang bercahaya berkedip menerangi jalan, menyapamu dengan soal berkilau.',
   '{name} turun dari langit malam dan menyodorkan teka-teki angka yang bersinar.',
   'Dengan kelip lembut, {name} menghadangmu dan mengajakmu berhitung.'],
  ['{name} berkedip riang, langit pun cerah, dan ia jadi penjaga sahabatmu!',
   '{name} menaburkan debu bintang bercahaya dan mengantarmu melangkah maju.',
   '{name} bersinar hangat mengitarimu, merayakan kemenanganmu.']
);

KIND.water=K(
  ['tetes air jernih','peri air mungil','si tetes biru','makhluk air ceria'],
  ['Airku beriak-riak. Bisakah kamu menangkap jawabannya?',
   'Aku jernih dan segar. Tunjukkan pikiran yang jernih pula, ya!',
   'Tetes demi tetes, aku membawa soal. Ayo jawab dengan tenang.',
   'Aku penjaga air. Buktikan hatimu sebening airku.'],
  ['Fokusmu jernih sekali, seperti air bersih. Bagus!',
   'Setiap jawaban benarmu membuat airku makin bening.',
   'Kamu tenang seperti telaga. Aku kagum!',
   'Pikiranmu menyegarkan seperti tetesan embun.'],
  ['Kebaikan itu seperti air jernih — menyegarkan semua. Ayo berteman!',
   'Tetes air ini memberkatimu. Kamu layak melanjutkan!',
   'Kamu memenangkan hatiku yang bening. Terima kasih, sahabat.',
   'Mari mengalir bersama menuju petualangan baru, teman!'],
  ['{name} yang jernih bergoyang pelan, riaknya menyebarkan soal-soal untukmu.',
   '{name} menetes mendekat, berkilau, dan menyodorkan teka-teki angka.',
   'Dengan percikan segar, {name} menyapamu dan mengajakmu berhitung.'],
  ['{name} memberkatimu dengan percikan jernih — jalan baru pun terbuka!',
   '{name} berkilau bening dan mengalir riang menemani langkahmu.',
   '{name} menyegarkan langkahmu dengan tetesan embun yang berkilau.']
);

KIND.snow=K(
  ['makhluk salju lembut','yeti mungil ramah','si dingin ceria','penjaga negeri salju'],
  ['Brr! Aku dingin tapi ramah. Berani menjawab di tengah salju?',
   'Kepingan saljuku membawa soal. Tangkap jawabannya, ya!',
   'Aku penjaga negeri putih. Tunjukkan kehangatan hatimu dengan menjawab.',
   'Aku tenang seperti salju. Bisakah kamu setenang itu?'],
  ['Wah, jawabanmu benar! Hatiku jadi hangat di tengah dingin.',
   'Setiap jawaban benarmu membuat saljuku berkilau lembut.',
   'Kamu tenang seperti malam bersalju. Aku kagum!',
   'Kehangatan pikiranmu mencairkan sedikit dinginku.'],
  ['Kamu menghangatkan hati saljuku. Ayo berteman, pengembara!',
   'Makhluk salju ini takluk oleh kehangatanmu. Terima kasih!',
   'Kamu memenangkan hatiku yang dingin. Mari melangkah bersama.',
   'Di negeri putih yang sepi, akhirnya aku punya sahabat.'],
  ['{name} muncul dari balik gundukan salju, kepingan dingin berkilau membawa soal.',
   'Dengan napas berembun, {name} menyapamu dan menyodorkan teka-teki angka.',
   '{name} menggigil ramah dan menantangmu berhitung di tengah salju.'],
  ['{name} menaburkan kepingan salju berkilau dan membuka jalanmu dengan hangat!',
   '{name} tersenyum lega, saljunya berkilau, dan negeri putih pun cerah.',
   '{name} melambai riang dan menemani langkahmu melintasi salju.']
);

KIND.flame=K(
  ['api kecil hangat','nyala mungil ceria','si api bertanduk ramah','penjaga bara hangat'],
  ['Aku menyala hangat, bukan membakar. Berani menjawab soalku?',
   'Nyalaku menari-nari. Bisa kamu ikuti dengan jawaban cepat?',
   'Aku menghangatkan tempat ini. Ayo temani aku berhitung.',
   'Bara kecilku menyimpan soal. Tunjukkan pikiranmu yang cerah!'],
  ['Wah, jawabanmu benar! Nyalaku berkobar senang.',
   'Setiap jawaban benarmu membuat apiku makin cerah.',
   'Kamu secerah bara yang menari. Aku kagum!',
   'Pikiranmu hangat seperti nyalaku. Hebat!'],
  ['Anak yang santun, hatimu sehangat apiku. Ayo berteman!',
   'Api kecil ini takluk oleh kehangatanmu. Terima kasih!',
   'Bawalah kehangatan ini ke mana pun kamu pergi, sahabat.',
   'Kamu memenangkan nyalaku. Mari menyala bersama, teman!'],
  ['{name} si api kecil menyala lembut menyapamu, membawa soal yang berkelap-kelip.',
   'Dengan nyala hangat, {name} menghadangmu dan menyodorkan teka-teki angka.',
   '{name} menari-nari kecil dan menantangmu berhitung di dekat bara.'],
  ['{name} memberimu percikan hangat sebagai tanda sayang, membuka jalanmu!',
   '{name} berkobar riang dan menemani langkahmu dengan cahaya hangat.',
   '{name} menyala lega dan mengantarmu ke petualangan berikutnya.']
);

KIND.plant=K(
  ['tunas hijau ceria','makhluk daun mungil','tunas penjaga taman','si hijau bertunas'],
  ['Aku tunas kecil yang tumbuh. Maukah kamu tumbuh pintar bersamaku?',
   'Daunku bergoyang menyimpan soal. Ayo jawab dengan riang!',
   'Aku penjaga taman ini. Tunjukkan kepintaranmu, ya.',
   'Aku tumbuh pelan tapi pasti. Bisakah kamu setekun itu?'],
  ['Wah, jawabanmu benar! Daunku sampai bertunas senang.',
   'Setiap jawaban benarmu membuatku tumbuh makin tinggi.',
   'Kamu tekun seperti tunas menuju matahari. Bagus!',
   'Pikiranmu segar seperti embun pagi. Aku kagum!'],
  ['Kamu membuatku mekar. Ayo tumbuh bersama, teman!',
   'Tunas ini takluk oleh ketekunanmu. Terima kasih, sahabat!',
   'Kamu memenangkan hatiku yang hijau. Mari melangkah bersama.',
   'Di taman yang sepi, akhirnya aku punya teman sepertimu.'],
  ['{name} si tunas hijau bergoyang riang, daun-daunnya membawa soal untukmu.',
   '{name} tumbuh pelan dari tanah dan menyodorkan teka-teki angka.',
   'Dengan daun yang bergoyang, {name} menghadangmu dan mengajakmu berhitung.'],
  ['{name} mekar berbunga cerah dan membuka jalanmu dengan riang!',
   '{name} bertunas gembira dan menemani langkahmu menyusuri taman.',
   '{name} menaburkan serbuk hijau berkilau dan menuntunmu melangkah maju.']
);

KIND.fairy=K(
  ['peri mungil ramah','peri kembang','peri bercahaya','peri penjaga taman'],
  ['Aku mungil, tapi soalku tidak mudah, lho! Berani coba?',
   'Sayap kecilku membawa serbuk soal. Ayo jawab dengan riang!',
   'Aku peri penjaga bunga. Tunjukkan kepintaranmu, ya.',
   'Aku menari di udara. Bisa kamu ikuti dengan jawaban tepat?'],
  ['Kesabaranmu membuat bungaku mekar pelan-pelan. Bagus!',
   'Setiap jawaban benarmu membuat sayapku berkilau senang.',
   'Kamu secermat peri sejati. Aku kagum!',
   'Serbuk ajaibku berkelip untuk kepintaranmu.'],
  ['Lewatlah, pahlawan yang sabar. Ayo berteman, ya!',
   'Peri ini takluk oleh kesabaranmu. Terima kasih, sahabat!',
   'Kamu memenangkan hatiku yang mungil. Mari menari bersama.',
   'Aku menaburkan restu untukmu — kita berteman sekarang!'],
  ['{name} si peri mungil mengambang menghalangi jalan dengan sopan, membawa soal.',
   '{name} menari di udara, serbuk ajaibnya berkilau menyodorkan teka-teki.',
   'Dengan sayap berkilau, {name} menyapamu dan mengajakmu berhitung.'],
  ['{name} menaburkan kelopak bercahaya, membuka jalan untukmu!',
   '{name} menari gembira di udara dan memberkatimu dengan serbuk ajaib.',
   '{name} melambai riang, sayapnya berkilau, mengantarmu melangkah maju.']
);

KIND.owl=K(
  ['burung hantu bijak','si mata bulat bijaksana','burung hantu mungil'],
  ['Hoo-hoo! Aku bijak dan suka teka-teki. Berani menjawabku?',
   'Mataku bulat mengawasi soal. Tunjukkan kepintaranmu, ya!',
   'Aku terjaga sepanjang malam menunggu anak pintar. Kamukah itu?',
   'Hoo! Ilmu itu berharga. Ayo buktikan kamu rajin belajar.'],
  ['Hoo! Jawabanmu bijak sekali. Aku kagum.',
   'Setiap jawaban benarmu membuat mataku berbinar bijak.',
   'Kamu berpikir sebelum menjawab — itu tanda anak pintar!',
   'Kebijaksanaanmu bersinar seterang bulan malam ini.'],
  ['Kamu anak yang bijak. Ayo belajar bersama, teman!',
   'Burung hantu ini kagum padamu. Mari berteman, sahabat!',
   'Kamu memenangkan hatiku yang bijak. Terima kasih!',
   'Hoo-hoo! Kamu sahabat yang cerdas — aku senang sekali.'],
  ['{name} si burung hantu bertengger bijak, matanya bulat menantangmu berteka-teki.',
   'Dengan suara hoo yang lembut, {name} menyodorkan soal angka padamu.',
   '{name} mengedip bijak dari dahan dan mengajakmu berhitung.'],
  ['{name} mengangguk bijak dan membuka jalanmu dengan restu!',
   '{name} terbang berputar sekali dan menemani perjalananmu di malam hari.',
   '{name} berkedip bijak dan memberimu setetes ilmu sebagai bekal.']
);

KIND.snake=K(
  ['ular mungil ramah','si panjang lentur','ular ceria','ular penjaga jalan'],
  ['Sss! Aku melata membawa soal. Berani menjawabku?',
   'Tubuhku panjang dan lentur. Bisa kamu ikuti jalan pikiranku?',
   'Aku penjaga lorong ini. Tunjukkan kepintaranmu, ya!',
   'Sss, aku sabar menunggu anak pintar. Kamukah itu?'],
  ['Sss! Jawabanmu tepat. Aku sampai meliuk senang.',
   'Setiap jawaban benarmu membuatku bergoyang gembira.',
   'Kamu lentur mengikuti soal-soalku. Hebat!',
   'Pikiranmu tajam seperti mataku. Aku kagum!'],
  ['Kamu memenangkan hatiku. Ayo meliuk bersama, teman!',
   'Ular ini takluk oleh kepintaranmu. Mari berteman, sahabat!',
   'Sss, kamu sahabat terbaik. Terima kasih sudah menemaniku!',
   'Aku meliuk bahagia — akhirnya punya teman sepertimu.'],
  ['{name} si ular meliuk pelan menghadangmu, membawa soal di ujung ekornya.',
   'Dengan lidah kecil menjulur, {name} menyapamu dan menyodorkan teka-teki.',
   '{name} bergoyang lentur dan menantangmu berhitung di lorong.'],
  ['{name} meliuk gembira dan membuka jalanmu dengan riang!',
   '{name} bergoyang senang dan menemani langkahmu menyusuri jalan.',
   '{name} melingkar hangat sekali dan mengantarmu melangkah maju.']
);

KIND.cat=K(
  ['kucing lincah','anak kucing ceria','kucing penjaga rumah','si berbulu manja'],
  ['Meong! Aku suka melompat sambil berhitung. Mau ikut?',
   'Kumisku bergetar menunggu lawan pintar. Kamukah itu?',
   'Aku kucing gesit. Bisa kamu secekatan aku menjawab?',
   'Meong, aku menjaga jalan ini. Tunjukkan kepintaranmu, ya!'],
  ['Meong! Jawabanmu tepat. Ekorku bergoyang senang.',
   'Setiap jawaban benarmu membuat buluku berdiri gembira.',
   'Kamu gesit seperti kucing sejati. Aku kagum!',
   'Kamu tenang tapi cekatan — kombinasi yang hebat!'],
  ['Meong! Ayo berteman dan bermain bersama, ya!',
   'Kucing ini takluk oleh keceriaanmu. Mari berteman, sahabat!',
   'Kamu memenangkan hatiku yang berbulu. Terima kasih!',
   'Aku mendengkur bahagia — kamu sahabat terbaikku!'],
  ['{name} si kucing melompat riang menghadangmu, membawa soal di cakar mungilnya.',
   'Dengan ekor bergoyang, {name} menyapamu dan menyodorkan teka-teki angka.',
   '{name} mengeong ceria dan menantangmu berhitung sambil bermain.'],
  ['{name} melompat gembira dari dahan ke dahan, menyegarkan semangatmu!',
   '{name} mendengkur senang dan menemani langkahmu dengan riang.',
   '{name} mengibaskan ekornya dan mengantarmu ke petualangan berikutnya.']
);

KIND.dog=K(
  ['anjing mungil setia','anak anjing ceria','anjing penjaga ramah','si berbulu setia'],
  ['Guk! Aku suka bermain sambil berhitung. Mau ikut denganku?',
   'Ekorku bergoyang menunggu teman pintar. Kamukah itu?',
   'Aku anjing setia penjaga jalan. Tunjukkan kepintaranmu, ya!',
   'Guk-guk! Aku bersemangat. Bisa kamu mengimbangiku?'],
  ['Guk! Jawabanmu tepat. Ekorku bergoyang tak berhenti!',
   'Setiap jawaban benarmu membuatku melompat senang.',
   'Kamu setia menjawab satu per satu. Aku kagum!',
   'Kamu teman yang hebat — pintar dan gembira!'],
  ['Guk! Ayo berteman selamanya, ya!',
   'Anjing setia ini kagum padamu. Mari berpetualang bersama!',
   'Kamu memenangkan hatiku. Terima kasih, sahabat!',
   'Aku menggonggong bahagia — kamu sahabat terbaikku!'],
  ['{name} si anjing melompat riang menyambutmu, ekornya bergoyang membawa soal.',
   'Dengan gonggongan ceria, {name} menyapamu dan menyodorkan teka-teki angka.',
   '{name} berlari mengitarimu sekali, lalu menantangmu berhitung.'],
  ['{name} melompat gembira dan menemani langkahmu dengan setia!',
   '{name} menggonggong senang dan mengantarmu ke petualangan berikutnya.',
   '{name} mengibaskan ekornya riang, merayakan kemenanganmu.']
);

KIND.monkey=K(
  ['monyet lincah','monyet ceria','monyet penjaga pohon','si gesit bergelantung'],
  ['Uhu-uhu! Aku suka melompat sambil berhitung. Mau ikut?',
   'Aku bergelantungan menunggu lawan pintar. Kamukah itu?',
   'Aku monyet gesit. Bisa kamu secekatan aku menjawab?',
   'Aku penjaga pohon ini. Tunjukkan kepintaranmu, ya!'],
  ['Uhu! Jawabanmu tepat. Aku sampai melompat senang.',
   'Setiap jawaban benarmu membuatku bergelantung gembira.',
   'Kamu gesit seperti monyet sejati. Aku kagum!',
   'Kamu tenang tapi cekatan. Hebat sekali!'],
  ['Uhu-uhu! Ayo melompat bersamaku menuju petualangan baru!',
   'Monyet ini takluk oleh keceriaanmu. Mari berteman, sahabat!',
   'Kamu memenangkan hatiku. Terima kasih sudah menemaniku!',
   'Aku bertepuk tangan gembira — kamu sahabat terbaikku!'],
  ['{name} si monyet bergelantungan riang menyapamu, membawa soal di tangannya.',
   'Dengan lompatan lincah, {name} menghadangmu dan menyodorkan teka-teki.',
   '{name} berayun dari dahan dan menantangmu berhitung sambil bermain.'],
  ['{name} melompat gembira dari dahan ke dahan, menyegarkan semangatmu!',
   '{name} bertepuk tangan senang dan menemani langkahmu dengan riang.',
   '{name} berayun ceria di atasmu, merayakan kemenanganmu.']
);

KIND.panda=K(
  ['panda mungil menggemaskan','anak panda ceria','panda penjaga hutan bambu'],
  ['Aku panda yang tenang. Maukah kamu berhitung santai bersamaku?',
   'Aku suka bambu dan angka. Ayo jawab soalku dengan riang!',
   'Aku panda penjaga hutan. Tunjukkan kepintaranmu, ya.',
   'Aku santai tapi suka tantangan. Berani menjawabku?'],
  ['Wah, jawabanmu tepat! Aku sampai mengunyah bambu senang.',
   'Setiap jawaban benarmu membuatku berguling gembira.',
   'Kamu tenang seperti panda. Aku kagum!',
   'Pikiranmu jernih dan santai. Hebat sekali!'],
  ['Ayo berteman dan bersantai bersama, ya!',
   'Panda ini kagum padamu. Mari berpetualang bersama, sahabat!',
   'Kamu memenangkan hatiku yang lembut. Terima kasih!',
   'Aku berguling bahagia — kamu sahabat terbaikku!'],
  ['{name} si panda mengunyah bambu sambil menyapamu, lalu menyodorkan soal.',
   'Dengan gerakan santai, {name} menghadangmu dan menyodorkan teka-teki angka.',
   '{name} berguling ceria dan menantangmu berhitung dengan riang.'],
  ['{name} berguling gembira dan membuka jalanmu dengan santai!',
   '{name} melambaikan kaki mungilnya dan menemani langkahmu.',
   '{name} mengunyah bambu senang dan mengantarmu ke petualangan berikutnya.']
);

KIND.bug=K(
  ['kumbang mungil ramah','serangga ceria','kumbang bersungut','si kecil bersayap'],
  ['Aku kumbang mungil. Sungutku menyimpan soal — berani menjawab?',
   'Aku terbang kesana-kemari. Bisa kamu tangkap jawabannya?',
   'Aku penjaga taman ini. Tunjukkan kepintaranmu, ya!',
   'Sayap kecilku bergetar menunggu anak pintar. Kamukah itu?'],
  ['Wah, jawabanmu tepat! Sungutku bergoyang senang.',
   'Setiap jawaban benarmu membuat sayapku berkilau gembira.',
   'Kamu teliti seperti kumbang sejati. Aku kagum!',
   'Pikiranmu tajam seperti sungutku. Hebat!'],
  ['Ayo terbang bersamaku menuju petualangan baru, teman!',
   'Kumbang ini takluk oleh kepintaranmu. Mari berteman!',
   'Kamu memenangkan hatiku yang mungil. Terima kasih!',
   'Aku berdengung bahagia — kamu sahabat terbaikku!'],
  ['{name} si kumbang bergetar sungutnya, terbang mendekat membawa soal untukmu.',
   'Dengan dengungan riang, {name} menyapamu dan menyodorkan teka-teki angka.',
   '{name} hinggap di dedaunan dan menantangmu berhitung.'],
  ['{name} terbang berputar gembira dan membuka jalanmu dengan riang!',
   '{name} berdengung senang dan menemani langkahmu menyusuri taman.',
   '{name} mengibaskan sayapnya yang berkilau, merayakan kemenanganmu.']
);

KIND.fish=K(
  ['ikan mungil dalam toples','ikan ceria berenang','ikan penjaga air'],
  ['Blub! Aku berenang membawa soal. Berani menangkap jawabannya?',
   'Airku beriak-riak. Bisa kamu tetap fokus menjawab?',
   'Aku ikan penjaga toples ini. Tunjukkan kepintaranmu, ya!',
   'Blub-blub! Aku menunggu anak pintar. Kamukah itu?'],
  ['Blub! Jawabanmu tepat. Aku berenang berputar senang.',
   'Setiap jawaban benarmu membuat airku makin jernih.',
   'Kamu fokus seperti ikan yang lincah. Aku kagum!',
   'Pikiranmu jernih seperti air toplesku. Hebat!'],
  ['Ayo berenang bersama menuju petualangan baru, teman!',
   'Ikan ini takluk oleh fokusmu. Mari berteman, sahabat!',
   'Kamu memenangkan hatiku yang mungil. Terima kasih!',
   'Aku berenang bahagia — kamu sahabat terbaikku!'],
  ['{name} si ikan berenang riang dalam toplesnya, riaknya menyebarkan soal untukmu.',
   'Dengan gelembung kecil, {name} menyapamu dan menyodorkan teka-teki angka.',
   '{name} berputar dalam air jernih dan menantangmu berhitung.'],
  ['{name} berenang gembira dan menuntunmu lebih dalam ke petualangan!',
   '{name} menyemburkan gelembung ceria dan menemani langkahmu.',
   '{name} berkilau dalam air jernih dan mengantarmu melangkah maju.']
);

KIND.duck=K(
  ['bebek penjelajah lucu','bebek mungil ceria','bebek penjaga jembatan'],
  ['Kwek! Jalan ini licin. Buktikan kamu teliti sebelum lewat.',
   'Aku bebek penjelajah. Bisa kamu setelaten aku menjawab?',
   'Kwek-kwek! Aku menjaga jembatan ini. Tunjukkan kepintaranmu!',
   'Aku berenang sambil berhitung. Mau ikut denganku?'],
  ['Kwek! Jawabanmu teliti sekali. Aku kagum.',
   'Setiap jawaban benarmu membuatku berenang senang.',
   'Kamu telaten seperti bebek sejati. Bagus!',
   'Kamu tidak mudah tergelincir — hebat sekali!'],
  ['Kwek kwek! Silakan lewat, teman. Ayo berteman!',
   'Bebek ini kagum pada ketelitianmu. Mari berpetualang bersama!',
   'Kamu memenangkan hatiku. Terima kasih, sahabat!',
   'Aku mengepakkan sayap bahagia — kamu sahabat terbaikku!'],
  ['{name} si bebek lucu membawa tongkat kecil, berdiri menutup jembatan sambil membawa soal.',
   'Dengan suara kwek riang, {name} menyapamu dan menyodorkan teka-teki angka.',
   '{name} berenang mendekat dan menantangmu berhitung dengan cermat.'],
  ['{name} mengangguk bangga dan menuntunmu menyeberang dengan aman!',
   '{name} mengepakkan sayap gembira dan menemani langkahmu.',
   '{name} berenang riang di depanmu, mengantarmu ke jalan berikutnya.']
);

KIND.dino=K(
  ['dinosaurus mungil ceria','dino jambu lucu','dino penjaga padang'],
  ['Aum kecil! Ikuti aku, setiap langkah menyimpan sebuah soal.',
   'Aku dino mungil. Bisa kamu selincah aku berlari menjawab?',
   'Aku penjaga padang ini. Tunjukkan kepintaranmu, ya!',
   'Aku berlari-lari kecil menunggu lawan pintar. Kamukah itu?'],
  ['Aum! Jawabanmu tepat. Aku sampai melompat senang.',
   'Setiap jawaban benarmu membuatku berlari gembira.',
   'Kamu rajin dan gembira — pasangan yang hebat!',
   'Belajar jadi ringan kalau dilakukan sepertimu. Kagum!'],
  ['Ayo terus berlari bersamaku, teman yang ceria!',
   'Dino ini kagum padamu. Mari berpetualang bersama, sahabat!',
   'Kamu memenangkan hatiku. Terima kasih sudah menemaniku!',
   'Aku mengaum bahagia — kamu sahabat terbaikku!'],
  ['{name} si dino mungil berlari-lari kecil, mengajakmu bermain angka.',
   'Dengan langkah riang, {name} menyapamu dan menyodorkan teka-teki di antara bunga.',
   '{name} mengaum kecil dan menantangmu berhitung sambil berlari.'],
  ['{name} melompat-lompat gembira, dan padang pun bersorak riang!',
   '{name} berlari ceria di sisimu, menemani langkahmu ke depan.',
   '{name} mengaum senang dan mengantarmu ke petualangan berikutnya.']
);

KIND.rock=K(
  ['batu mungil','batu gerutu ramah','makhluk batu tenang'],
  ['Grr! Aku batu yang kokoh. Yakin bisa menggeserku dengan jawaban?',
   'Aku keras tapi adil. Jawablah soalku dengan tenang, ya.',
   'Aku penjaga batu di sini. Tunjukkan kesabaranmu!',
   'Aku diam sabar menunggu anak pintar. Kamukah itu?'],
  ['Hmph, jawabanmu benar. Gerutuanku mulai mereda.',
   'Setiap jawaban benarmu membuat batuku berkilau senang.',
   'Kamu sabar seperti batu yang tak goyah. Aku kagum!',
   'Ketenanganmu lebih kuat dari kerasnya tubuhku.'],
  ['Baiklah, aku menyerah pada ketenangan hatimu. Ayo berteman!',
   'Batu ini takluk oleh kesabaranmu. Mari berteman, sahabat!',
   'Kamu memenangkan hatiku yang keras. Terima kasih!',
   'Aku bergeser lembut — akhirnya punya teman sepertimu.'],
  ['{name} yang kokoh berdiri menghadangmu, menggerutu sambil membawa soal.',
   'Dengan suara berat, {name} menyapamu dan menyodorkan teka-teki angka.',
   '{name} bergeser sedikit dan menantangmu berhitung dengan sabar.'],
  ['{name} tersenyum malu-malu dan bergeser lembut — jalan pun terbuka!',
   '{name} berkilau tenang dan membuka jalanmu dengan hormat.',
   '{name} bergeser gembira dan menemani langkahmu dengan sabar.']
);

KIND.horn=K(
  ['makhluk bertanduk kecil','si tanduk mungil ceria','penjaga bertanduk ramah'],
  ['Tandukku kecil tapi soalku besar. Berani menjawabku?',
   'Aku bertanduk gagah. Buktikan pikiranmu juga gagah, ya!',
   'Aku penjaga jalan ini. Tunjukkan kepintaranmu!',
   'Aku menunggu lawan pintar. Kamukah orangnya?'],
  ['Wah, jawabanmu tepat! Tandukku sampai berkilau senang.',
   'Setiap jawaban benarmu membuatku makin kagum padamu.',
   'Kamu gagah dalam berhitung. Aku kagum!',
   'Pikiranmu setajam tandukku. Hebat sekali!'],
  ['Kamu memenangkan hatiku. Ayo berteman, pengembara!',
   'Makhluk bertanduk ini takluk oleh kepintaranmu. Mari berteman!',
   'Kamu sahabat yang hebat. Terima kasih sudah menemaniku!',
   'Aku menunduk hormat — kamu sahabat terbaikku!'],
  ['{name} yang bertanduk kecil menghadangmu dengan gagah, membawa soal untukmu.',
   'Dengan tanduk berkilau, {name} menyapamu dan menyodorkan teka-teki angka.',
   '{name} menghentakkan kaki dan menantangmu berhitung.'],
  ['{name} menunduk hormat dan membuka jalanmu dengan gembira!',
   '{name} melompat riang dan menemani langkahmu ke depan.',
   '{name} berkilau tandukknya dan mengantarmu ke petualangan berikutnya.']
);

KIND.leaf=K(
  ['daun mungil ceria','peri daun hijau','daun penjaga hutan'],
  ['Aku daun kecil yang bergoyang. Maukah berhitung bersamaku?',
   'Angin membawa soalku. Ayo tangkap jawabannya dengan riang!',
   'Aku penjaga dedaunan. Tunjukkan kepintaranmu, ya.',
   'Aku melayang santai menunggu anak pintar. Kamukah itu?'],
  ['Wah, jawabanmu tepat! Aku sampai bergoyang senang.',
   'Setiap jawaban benarmu membuatku makin hijau segar.',
   'Kamu segar seperti embun di dedaunan. Aku kagum!',
   'Pikiranmu ringan dan ceria. Hebat sekali!'],
  ['Ayo melayang bersamaku menuju petualangan baru, teman!',
   'Daun ini kagum padamu. Mari berteman, sahabat!',
   'Kamu memenangkan hatiku yang hijau. Terima kasih!',
   'Aku bergoyang bahagia — kamu sahabat terbaikku!'],
  ['{name} si daun bergoyang riang tertiup angin, membawa soal untukmu.',
   'Dengan gerakan lembut, {name} menyapamu dan menyodorkan teka-teki angka.',
   '{name} melayang mendekat dan menantangmu berhitung.'],
  ['{name} melayang gembira dan membuka jalanmu dengan riang!',
   '{name} bergoyang senang tertiup angin dan menemani langkahmu.',
   '{name} menaburkan embun berkilau dan mengantarmu melangkah maju.']
);

KIND.book=K(
  ['buku ajaib berjalan','makhluk buku pintar','buku penjaga ilmu'],
  ['Aku buku ajaib penuh soal. Berani membuka halamanku?',
   'Setiap halamanku menyimpan teka-teki. Ayo, jawablah!',
   'Aku penjaga ilmu di sini. Tunjukkan kepintaranmu, ya!',
   'Aku menunggu pembaca pintar. Kamukah orangnya?'],
  ['Wah, jawabanmu tepat! Halaman-halamanku berkilau senang.',
   'Setiap jawaban benarmu menambah cerita bahagia di dalamku.',
   'Kamu rajin membaca dan berhitung. Aku kagum!',
   'Pikiranmu penuh ilmu seperti isi halamanku. Hebat!'],
  ['Ayo membaca dan belajar bersama, teman!',
   'Buku ini kagum padamu. Mari berpetualang bersama, sahabat!',
   'Kamu memenangkan hatiku yang penuh cerita. Terima kasih!',
   'Halaman-halamanku bahagia — kamu sahabat terbaikku!'],
  ['{name} si buku ajaib membuka halamannya, menampilkan soal-soal untukmu.',
   'Dengan lembaran yang berdesir, {name} menyapamu dan menyodorkan teka-teki.',
   '{name} melayang mendekat, halamannya berbalik menantangmu berhitung.'],
  ['{name} menutup halaman dengan puas dan membuka jalan ilmumu!',
   '{name} berkilau halamannya dan menemani perjalananmu penuh cerita.',
   '{name} menuliskan namamu di halaman bahagia dan mengantarmu maju.']
);

KIND.pirate=K(
  ['bajak laut mungil ceria','kapten kecil pemberani','penjaga harta karun'],
  ['Ahoy! Tak ada yang lewat tanpa menjawab soalku, pengembara!',
   'Aku kapten kecil pemberani. Berani hadapi teka-teki hartaku?',
   'Yo-ho! Harta karunku dijaga soal-soal. Ayo, buktikan kepintaranmu!',
   'Aku penjaga peta ini. Tunjukkan kamu layak, ya!'],
  ['Ahoy! Jawabanmu tepat. Topiku sampai terangkat kagum.',
   'Setiap jawaban benarmu membawamu lebih dekat ke harta!',
   'Kamu pemberani seperti kapten sejati. Aku kagum!',
   'Yo-ho, kamu tak gentar sedikit pun. Hebat!'],
  ['Ahoy! Kamu memenangkan hatiku. Ayo berlayar bersama, teman!',
   'Kapten ini takluk oleh keberanianmu. Mari jadi kru-ku, sahabat!',
   'Kamu layak dapat harta persahabatan. Terima kasih!',
   'Aku melambaikan topi bahagia — kamu sahabat terbaikku!'],
  ['{name} sang bajak laut mungil melambaikan topinya, menghadangmu dengan sekantong soal.',
   'Dengan seruan ahoy, {name} menyapamu dan menyodorkan teka-teki harta karun.',
   '{name} berdiri gagah di jalan dan menantangmu berduel angka.'],
  ['{name} tertawa lega, melambaikan topinya, dan membukakan jalan — kalian berteman!',
   '{name} membuka peta harta persahabatan dan menemani perjalananmu.',
   '{name} melambaikan topi gembira dan mengantarmu ke petualangan berikutnya.']
);

KIND.hat=K(
  ['pahlawan bertopi ceria','si topi jerami','penjaga bertopi ramah'],
  ['Topiku membawa keberuntungan. Berani mengadu kepintaran denganku?',
   'Aku pahlawan bertopi. Tunjukkan kamu juga berani, ya!',
   'Aku penjaga jalan ini. Ayo, jawab soalku dengan gembira!',
   'Aku menunggu lawan pintar. Kamukah orangnya?'],
  ['Wah, jawabanmu tepat! Topiku sampai bergoyang senang.',
   'Setiap jawaban benarmu membuatku makin bersemangat.',
   'Kamu berani dan gembira. Aku kagum!',
   'Pikiranmu secerah topiku yang berkilau. Hebat!'],
  ['Kamu memenangkan hatiku. Ayo berpetualang bersama, teman!',
   'Pahlawan bertopi ini kagum padamu. Mari berteman, sahabat!',
   'Kamu sahabat yang hebat. Terima kasih sudah menemaniku!',
   'Aku melambaikan topi bahagia — kamu sahabat terbaikku!'],
  ['{name} yang bertopi ceria menghadangmu dengan gagah, membawa soal untukmu.',
   'Dengan topi miring gaya, {name} menyapamu dan menyodorkan teka-teki angka.',
   '{name} mengangkat topinya dan menantangmu berhitung.'],
  ['{name} melambaikan topinya gembira dan membuka jalanmu dengan riang!',
   '{name} tersenyum lebar dan menemani langkahmu ke depan.',
   '{name} mengangkat topi hormat dan mengantarmu ke petualangan berikutnya.']
);

KIND.axolotl=K(
  ['aksolotl mungil lucu','aksolotl ceria berair','aksolotl penjaga kolam'],
  ['Blub! Aku aksolotl mungil. Berani berhitung di dalam air denganku?',
   'Insang mungilku bergoyang menunggu lawan pintar. Kamukah itu?',
   'Aku penjaga kolam ini. Tunjukkan kepintaranmu, ya!',
   'Aku berenang santai membawa soal. Ayo, tangkap jawabannya!'],
  ['Blub! Jawabanmu tepat. Insangku bergoyang senang.',
   'Setiap jawaban benarmu membuatku berenang gembira.',
   'Kamu tenang seperti air kolamku. Aku kagum!',
   'Pikiranmu jernih dan lucu sepertiku. Hebat!'],
  ['Ayo berenang bersama menuju petualangan baru, teman!',
   'Aksolotl ini kagum padamu. Mari berteman, sahabat!',
   'Kamu memenangkan hatiku yang mungil. Terima kasih!',
   'Aku berenang bahagia — kamu sahabat terbaikku!'],
  ['{name} si aksolotl berenang riang menyapamu, insangnya bergoyang membawa soal.',
   'Dengan senyum lucu, {name} menghadangmu dan menyodorkan teka-teki angka.',
   '{name} berputar dalam air dan menantangmu berhitung dengan riang.'],
  ['{name} berenang gembira dan membuka jalanmu dengan riang!',
   '{name} menyemburkan gelembung ceria dan menemani langkahmu.',
   '{name} melambaikan kaki mungilnya dan mengantarmu melangkah maju.']
);

KIND.rainbow=K(
  ['makhluk pelangi ceria','si warna-warni','penjaga pelangi ramah'],
  ['Aku berwarna-warni seperti pelangi. Berani menjawab soal cerahku?',
   'Setiap warnaku menyimpan soal. Ayo, tunjukkan kepintaranmu!',
   'Aku penjaga pelangi. Buktikan pikiranmu secerah warnaku, ya!',
   'Aku menunggu anak pintar yang ceria. Kamukah itu?'],
  ['Wah, jawabanmu tepat! Warnaku makin cerah berkilau.',
   'Setiap jawaban benarmu menambah satu warna bahagia padaku.',
   'Kamu secerah pelangi setelah hujan. Aku kagum!',
   'Pikiranmu penuh warna gembira. Hebat sekali!'],
  ['Ayo mewarnai dunia bersama, teman!',
   'Makhluk pelangi ini kagum padamu. Mari berteman, sahabat!',
   'Kamu memenangkan hatiku yang berwarna. Terima kasih!',
   'Aku berkilau bahagia — kamu sahabat terbaikku!'],
  ['{name} yang berwarna-warni menyapamu, pelanginya berkilau membawa soal.',
   'Dengan cahaya tujuh warna, {name} menghadangmu dan menyodorkan teka-teki.',
   '{name} berputar cerah dan menantangmu berhitung dengan riang.'],
  ['{name} melengkung menjadi pelangi cerah dan membuka jalanmu!',
   '{name} menaburkan warna berkilau dan menemani langkahmu ke depan.',
   '{name} bersinar tujuh warna dan mengantarmu ke petualangan berikutnya.']
);

KIND.food=K(
  ['makhluk manis mungil','si camilan ceria','penjaga dapur manis'],
  ['Aku manis dan menggemaskan. Berani mencicipi soal-soalku?',
   'Aku camilan ajaib penuh soal. Ayo, jawab dengan riang!',
   'Aku penjaga dapur manis ini. Tunjukkan kepintaranmu, ya!',
   'Aku menunggu anak pintar yang gembira. Kamukah itu?'],
  ['Wah, jawabanmu tepat! Aku sampai bergoyang manis senang.',
   'Setiap jawaban benarmu membuatku makin manis berkilau.',
   'Kamu semanis camilan dan sepintar profesor. Aku kagum!',
   'Pikiranmu enak dinikmati seperti kue. Hebat!'],
  ['Ayo berbagi kegembiraan bersama, teman!',
   'Camilan ini kagum padamu. Mari berteman, sahabat!',
   'Kamu memenangkan hatiku yang manis. Terima kasih!',
   'Aku berkilau bahagia — kamu sahabat terbaikku!'],
  ['{name} yang manis menggemaskan menyapamu, membawa sepiring soal untukmu.',
   'Dengan aroma manis, {name} menghadangmu dan menyodorkan teka-teki angka.',
   '{name} bergoyang riang dan menantangmu berhitung dengan gembira.'],
  ['{name} bergoyang manis dan membuka jalanmu dengan riang!',
   '{name} menaburkan taburan berkilau dan menemani langkahmu.',
   '{name} tersenyum manis dan mengantarmu ke petualangan berikutnya.']
);

KIND.goblin=K(
  ['goblin hijau pemalu','makhluk kecil bermata satu','goblin ramah'],
  ['A-aku malu bertemu orang… tapi aku punya soal untukmu.',
   'Aku goblin kecil. Berani menjawab teka-tekiku?',
   'Aku penjaga sudut ini. Tunjukkan kepintaranmu, ya.',
   'Aku menunggu teman yang baik. Kamukah orangnya?'],
  ['Kamu baik sekali. Biasanya semua lari melihatku.',
   'Setiap jawaban benarmu membuatku makin berani.',
   'Kamu tidak takut padaku — hatiku jadi hangat.',
   'Wah, kamu pintar sekaligus ramah. Aku kagum!'],
  ['Terima kasih sudah tidak takut padaku, teman.',
   'Goblin ini kagum pada kebaikanmu. Mari berteman, sahabat!',
   'Kamu memenangkan hatiku. Aku senang mengenalmu.',
   'Aku melompat gembira — kamu sahabat terbaikku!'],
  ['{name} si goblin mungil mengintip malu-malu, membawa teka-teki angka untukmu.',
   'Dengan satu mata besar, {name} menyapamu ragu-ragu dan menyodorkan soal.',
   '{name} muncul dari balik semak dan menantangmu berhitung.'],
  ['{name} keluar dari persembunyian dan melambai riang padamu!',
   '{name} tersenyum lebar dan menemani langkahmu dengan gembira.',
   '{name} melompat senang dan mengantarmu ke petualangan berikutnya.']
);

KIND.fuzz=K(
  ['makhluk berbulu lembut','si gembul berbulu','makhluk bulu ceria'],
  ['Aku lembut berbulu tapi suka soal angka. Berani coba?',
   'Buluku halus, soalku seru. Ayo, jawab dengan riang!',
   'Aku penjaga jalan ini. Tunjukkan kepintaranmu, ya!',
   'Aku menunggu teman pintar yang hangat. Kamukah itu?'],
  ['Wah, jawabanmu tepat! Buluku sampai berdiri senang.',
   'Setiap jawaban benarmu membuatku makin lembut hangat.',
   'Kamu pintar dan ramah. Aku kagum!',
   'Pikiranmu hangat seperti buluku. Hebat sekali!'],
  ['Ayo berpelukan dan berteman, ya!',
   'Makhluk berbulu ini kagum padamu. Mari berteman, sahabat!',
   'Kamu memenangkan hatiku yang lembut. Terima kasih!',
   'Aku bergoyang bahagia — kamu sahabat terbaikku!'],
  ['{name} yang berbulu lembut menyapamu dari balik semak, membawa soal untukmu.',
   'Dengan bulu yang bergoyang, {name} menghadangmu dan menyodorkan teka-teki.',
   '{name} berguling gembira dan menantangmu berhitung dengan riang.'],
  ['{name} melompat gembira di antara semak dan membuka jalanmu!',
   '{name} bergoyang senang buluku dan menemani langkahmu ke depan.',
   '{name} berpelukan hangat sebentar dan mengantarmu melangkah maju.']
);

KIND.key=K(
  ['kunci ajaib penjaga pintu','makhluk kunci misterius','kunci pembuka jalan'],
  ['Aku kunci ajaib. Jawab soalku untuk membuka jalanmu!',
   'Setiap jawaban benar memutar gerigiku. Ayo, coba!',
   'Aku penjaga pintu rahasia. Tunjukkan kepintaranmu, ya!',
   'Aku menunggu anak pintar yang bisa membukaku. Kamukah itu?'],
  ['Klik! Jawabanmu tepat, gerigiku berputar senang.',
   'Setiap jawaban benarmu membukaku sedikit demi sedikit.',
   'Kamu cermat seperti kunci sejati. Aku kagum!',
   'Pikiranmu membuka pintu-pintu ilmu. Hebat!'],
  ['Klik! Pintu terbuka. Ayo berpetualang bersama, teman!',
   'Kunci ini kagum padamu. Mari berteman, sahabat!',
   'Kamu memenangkan hatiku. Terima kasih sudah membukaku!',
   'Aku berkilau bahagia — kamu sahabat terbaikku!'],
  ['{name} si kunci ajaib melayang menghadangmu, gerigiku berkilau membawa soal.',
   'Dengan bunyi klik lembut, {name} menyapamu dan menyodorkan teka-teki angka.',
   '{name} berputar pelan dan menantangmu membuka jalan dengan berhitung.'],
  ['{name} berputar klik dan membuka pintu jalanmu dengan riang!',
   '{name} berkilau gembira dan menemani langkahmu ke petualangan baru.',
   '{name} melayang senang di sisimu, merayakan kemenanganmu.']
);

KIND.telescope=K(
  ['teropong penjelajah','makhluk teropong penemu','teropong pengintai bintang'],
  ['Aku melihat jauh dengan teropongku. Berani menjawab soalku?',
   'Aku mengintai soal dari kejauhan. Ayo, tunjukkan kepintaranmu!',
   'Aku penjaga menara pandang ini. Buktikan ketelitianmu, ya!',
   'Aku menunggu penjelajah pintar. Kamukah orangnya?'],
  ['Wah, jawabanmu tepat! Lensaku sampai berkilau kagum.',
   'Setiap jawaban benarmu memperjelas pandanganku.',
   'Kamu jeli seperti teropong sejati. Aku kagum!',
   'Pikiranmu tajam melihat jauh ke depan. Hebat!'],
  ['Ayo menjelajah dan menemukan hal baru bersama, teman!',
   'Teropong ini kagum padamu. Mari berteman, sahabat!',
   'Kamu memenangkan hatiku. Terima kasih sudah menemaniku!',
   'Aku berkilau bahagia — kamu sahabat terbaikku!'],
  ['{name} si teropong mengarahkan lensanya padamu, membawa soal dari kejauhan.',
   'Dengan lensa berkilau, {name} menyapamu dan menyodorkan teka-teki angka.',
   '{name} berputar mengintai dan menantangmu berhitung dengan teliti.'],
  ['{name} mengarahkan lensanya ke jalan baru dan menuntunmu maju!',
   '{name} berkilau lensanya dan menemani perjalanan penjelajahanmu.',
   '{name} menemukan bintang persahabatan dan mengantarmu melangkah maju.']
);

KIND.compass=K(
  ['kompas penunjuk arah','makhluk kompas penjelajah','kompas penjaga peta'],
  ['Jarumku menunjuk arah. Jawab soalku untuk tahu jalanmu!',
   'Aku kompas penjelajah. Berani menemukan jawaban yang tepat?',
   'Aku penjaga peta ini. Tunjukkan kepintaranmu, ya!',
   'Aku menunggu penjelajah pintar. Kamukah orangnya?'],
  ['Wah, jawabanmu tepat! Jarumku berputar senang.',
   'Setiap jawaban benarmu memperjelas arah petualanganmu.',
   'Kamu setepat kompas sejati. Aku kagum!',
   'Pikiranmu selalu menunjuk arah yang benar. Hebat!'],
  ['Ayo menjelajah dunia bersama, teman!',
   'Kompas ini kagum padamu. Mari berteman, sahabat!',
   'Kamu memenangkan hatiku. Terima kasih sudah menemaniku!',
   'Jarumku menunjuk bahagia — kamu sahabat terbaikku!'],
  ['{name} si kompas berputar jarumnya menghadangmu, membawa soal penunjuk arah.',
   'Dengan jarum berkilau, {name} menyapamu dan menyodorkan teka-teki angka.',
   '{name} menunjuk satu arah dan menantangmu berhitung untuk melanjutkan.'],
  ['{name} menunjuk jalan baru dengan jarumnya dan menuntunmu maju!',
   '{name} berputar gembira dan menemani perjalanan penjelajahanmu.',
   '{name} menemukan arah persahabatan dan mengantarmu melangkah maju.']
);

KIND.snail=K(
  ['siput mungil sabar','siput bercangkang lucu','siput penjaga taman'],
  ['Pelan-pelan, ya. Aku siput yang sabar. Jawab soalku dengan cermat.',
   'Aku membawa rumah di punggungku dan soal di hatiku. Ayo, coba!',
   'Aku penjaga taman ini. Tunjukkan kesabaranmu, ya.',
   'Aku melata santai menunggu anak pintar. Kamukah itu?'],
  ['Wah, jawabanmu tepat! Cangkangku sampai berkilau senang.',
   'Setiap jawaban benarmu membuatku melata gembira.',
   'Kamu sabar seperti siput sejati. Aku kagum!',
   'Pikiranmu tenang dan cermat. Hebat sekali!'],
  ['Ayo melata santai bersama, teman!',
   'Siput ini kagum pada kesabaranmu. Mari berteman, sahabat!',
   'Kamu memenangkan hatiku yang mungil. Terima kasih!',
   'Aku melata bahagia — kamu sahabat terbaikku!'],
  ['{name} si siput melata pelan menghadangmu, membawa soal di atas cangkangnya.',
   'Dengan gerakan santai, {name} menyapamu dan menyodorkan teka-teki angka.',
   '{name} menjulurkan sungutnya dan menantangmu berhitung dengan sabar.'],
  ['{name} melata gembira dan membuka jalanmu dengan sabar!',
   '{name} berkilau cangkangnya dan menemani langkahmu perlahan.',
   '{name} menjulurkan sungut senang dan mengantarmu melangkah maju.']
);

KIND.mouse=K(
  ['tikus mungil lincah','tikus kecil ceria','tikus penjaga lorong'],
  ['Cit-cit! Aku tikus lincah. Bisa kamu secekatan aku menjawab?',
   'Aku mungil tapi pintar. Berani menjawab teka-tekiku?',
   'Aku penjaga lorong ini. Tunjukkan kepintaranmu, ya!',
   'Aku menunggu teman pintar yang gesit. Kamukah itu?'],
  ['Cit! Jawabanmu tepat. Aku sampai melompat senang.',
   'Setiap jawaban benarmu membuatku bergembira.',
   'Kamu gesit seperti tikus sejati. Aku kagum!',
   'Pikiranmu cekatan dan tajam. Hebat sekali!'],
  ['Cit-cit! Ayo berteman dan bermain bersama, ya!',
   'Tikus ini kagum padamu. Mari berpetualang bersama, sahabat!',
   'Kamu memenangkan hatiku yang mungil. Terima kasih!',
   'Aku berlari bahagia — kamu sahabat terbaikku!'],
  ['{name} si tikus mungil mengendap-endap menyapamu, membawa soal di tangan kecilnya.',
   'Dengan bunyi cit riang, {name} menghadangmu dan menyodorkan teka-teki angka.',
   '{name} berlari mengitarimu sekali, lalu menantangmu berhitung.'],
  ['{name} berlari gembira dan membuka jalanmu dengan riang!',
   '{name} melompat senang dan menemani langkahmu menyusuri lorong.',
   '{name} mengibaskan ekor mungilnya dan mengantarmu melangkah maju.']
);

KIND.spider=K(
  ['laba-laba mungil ramah','penjaga jaring ceria','laba-laba kecil pintar'],
  ['Aku menenun jaring soal. Berani menjawab satu per satu?',
   'Delapan kakiku memegang delapan teka-teki. Ayo, coba!',
   'Aku penjaga sudut ini. Tunjukkan kepintaranmu, ya!',
   'Aku menunggu teman pintar yang teliti. Kamukah itu?'],
  ['Wah, jawabanmu tepat! Jaringku sampai bergetar senang.',
   'Setiap jawaban benarmu memperkuat benang persahabatan kita.',
   'Kamu teliti seperti penenun jaring sejati. Aku kagum!',
   'Pikiranmu rapi seperti jaringku. Hebat sekali!'],
  ['Ayo menenun persahabatan bersama, teman!',
   'Laba-laba ini kagum padamu. Mari berteman, sahabat!',
   'Kamu memenangkan hatiku. Terima kasih sudah menemaniku!',
   'Aku bergoyang bahagia di jaringku — kamu sahabat terbaikku!'],
  ['{name} si laba-laba turun dari jaringnya, membawa soal di setiap benang.',
   'Dengan delapan kaki yang gesit, {name} menyapamu dan menyodorkan teka-teki.',
   '{name} menenun pola dan menantangmu berhitung dengan teliti.'],
  ['{name} menenun jaring persahabatan dan membuka jalanmu dengan riang!',
   '{name} bergoyang senang di benangnya dan menemani langkahmu.',
   '{name} turun perlahan dan mengantarmu ke petualangan berikutnya.']
);

KIND.ring=K(
  ['makhluk cincin melayang','si lingkaran ceria','cincin ajaib penjaga jalan'],
  ['Aku melayang bulat sempurna. Berani menjawab soal berputarku?',
   'Setiap putaranku menyimpan soal. Ayo, tunjukkan kepintaranmu!',
   'Aku penjaga jalan ini. Buktikan pikiranmu utuh, ya!',
   'Aku menunggu anak pintar. Kamukah orangnya?'],
  ['Wah, jawabanmu tepat! Aku berputar senang.',
   'Setiap jawaban benarmu membuat lingkaranku makin berkilau.',
   'Kamu utuh dan mantap seperti lingkaran sejati. Aku kagum!',
   'Pikiranmu bulat sempurna. Hebat sekali!'],
  ['Ayo berputar gembira bersama, teman!',
   'Cincin ini kagum padamu. Mari berteman, sahabat!',
   'Kamu memenangkan hatiku yang bulat. Terima kasih!',
   'Aku berputar bahagia — kamu sahabat terbaikku!'],
  ['{name} si cincin melayang berputar pelan, membawa soal di lingkarannya.',
   'Dengan putaran lembut, {name} menyapamu dan menyodorkan teka-teki angka.',
   '{name} mengambang bulat sempurna dan menantangmu berhitung.'],
  ['{name} berputar gembira dan membuka jalanmu dengan riang!',
   '{name} berkilau lingkarannya dan menemani langkahmu ke depan.',
   '{name} melayang senang di sisimu, merayakan kemenanganmu.']
);

/* generic fallback for any kind not covered (e.g. 'blob') */
KIND.blob=K(
  ['makhluk mungil ceria','si bulat menggemaskan','monster kecil ramah','makhluk lucu penjaga jalan'],
  ['Halo, pengembara kecil! Beranikah kamu menghadapi teka-tekiku?',
   'Berhenti dulu! Jawab soalku kalau ingin lewat, ya.',
   'Sudah lama aku menunggu lawan berhitung. Kamukah orangnya?',
   'Selamat datang! Mari kita uji kepandaianmu dengan angka.',
   'Aku penjaga tempat ini. Buktikan kamu pandai, ya!'],
  ['Hmm, jawabanmu benar terus. Kamu memang istimewa.',
   'Setiap jawaban benarmu membuatku makin kagum.',
   'Wah, kamu tidak mudah menyerah, ya?',
   'Kamu membuat soal sulit terlihat mudah. Hebat!',
   'Kamu lebih tangguh dari yang kukira!'],
  ['Aku mengaku kalah… tapi senang bertemu anak sepertimu.',
   'Ternyata kamu bukan lawan, tapi teman baru.',
   'Kamu mengalahkanku dengan kepandaian dan hati yang baik.',
   'Baiklah, kamu menang. Dan aku bahagia karenanya!',
   'Kamu membuka mataku — belajar itu menyenangkan!'],
  ['{name} si makhluk mungil menghadangmu dengan riang, membawa sekantong soal.',
   '{name} melompat gembira di depanmu dan menyodorkan teka-teki angka.',
   'Dengan senyum lebar, {name} menyapamu dan mengajakmu berhitung.'],
  ['{name} melompat gembira dan membukakan jalan — kalian pun berteman!',
   '{name} mengangguk bangga dan menemani langkahmu ke petualangan berikutnya.',
   '{name} melambai riang dan mengantarmu melangkah maju dengan gembira.']
);

function kindOf(kind){ return KIND[kind] || KIND.blob; }

/* ── seeded pickers (stable but well-spread across the 281 monsters) ── */
function hashStr(s){ var h=2166136261; for(var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=(h*16777619)>>>0; } return h>>>0; }
function seedFor(id, name, salt){ return (hashStr((name||'')+'#'+id+'#'+salt)>>>0); }
function pickN(arr, id, name, salt){ if(!arr||!arr.length) return ''; return arr[seedFor(id,name,salt)%arr.length]; }

/* ── build a full arc for a monster id from its kind pools ── */
function genArcFor(id){
  var m=MONSTERS[id]; if(!m) return null;
  var k=kindOf(m.kind);
  var nm=m.name;
  function sub(t){ return String(t).replace('{name}', nm); }

  var intro = sub(pickN(k.intro, id, nm, 1));
  var mOpen = pickN(k.open, id, nm, 2);
  var mMid  = pickN(k.mid,  id, nm, 3);
  var mTurn = pickN(k.turn, id, nm, 4);

  // hero lines pulled from a shared warm pool, seeded so each monster differs.
  var hero1 = pickN(HERO_ACCEPT, id, nm, 5);
  var hero2 = pickN(HERO_MID,    id, nm, 6);
  var hero3 = pickN(HERO_FRIEND, id, nm, 8);

  var banter=[
    {who:'monster', text:mOpen},
    {who:'hero',    text:hero1},
    {who:'monster', text:mMid},
    {who:'hero',    text:hero2},
    {who:'monster', text:mTurn},
    {who:'hero',    text:hero3}
  ];

  var victory = sub(pickN(k.vict, id, nm, 9));
  return { name:nm, sub:m.sub, intro:intro, banter:banter, victory:victory, monster:nm, _generated:true, kind:m.kind };
}

/* shared hero reply pools (kid-safe, warm, math+courage flavored) */
var HERO_ACCEPT=[
  'Aku tidak takut! Aku sudah belajar berhitung dengan giat.',
  'Berani! Aku akan menjawab pelan-pelan dan hati-hati.',
  'Aku siap. Aku akan tetap tenang agar tidak salah.',
  'Ayo kita kerjakan bersama, aku suka tantangan!',
  'Dengan senang hati! Belajar itu menyenangkan.',
  'Aku akan periksa setiap angka dengan cermat.',
  'Tentu! Setiap jawaban benar membuatku makin berani.',
  'Baik, aku akan berusaha sebaik mungkin.'
];
var HERO_MID=[
  'Selama aku terus mencoba, tak ada soal yang mustahil.',
  'Kalau kita tenang, soal apa pun bisa kita hadapi.',
  'Menyerah itu mudah, mencoba lagi itu yang hebat.',
  'Yang sulit pun bisa selesai kalau kita sabar.',
  'Belajar jadi ringan kalau dilakukan dengan senang.',
  'Setiap angka yang benar membuatku makin percaya diri.',
  'Aku hitung satu demi satu, tak akan kulewatkan.',
  'Ilmu adalah cahaya yang menerangi langkahku.'
];
var HERO_FRIEND=[
  'Kamu bukan musuh, hanya kesepian. Ayo jadi temanku!',
  'Terima kasih sudah menemaniku belajar. Ayo berteman!',
  'Aku senang mengenalmu. Mari berpetualang bersama!',
  'Kita semua istimewa dengan cara masing-masing. Ayo berteman!',
  'Belajar bersamamu seru sekali. Kita sahabat sekarang, ya!',
  'Setiap makhluk punya kebaikan. Aku senang berteman denganmu!',
  'Ayo kita jaga tempat ini bersama, teman baru!',
  'Kamu hebat! Mari lanjutkan petualangan ini berdua.'
];

/* ════════════ HAND-AUTHORED showcase arcs (by monster id) ════════════
   The most iconic monsters get a bespoke, richer arc. These override the
   generated arc entirely. Each still returns {name,sub,intro,banter,victory}. */
var HAND_ID={
  /* id 1 — pirate slime (Kapten Lendir) */
  1:{ sub:'slime bajak laut',
    intro:'Di gerbang hutan, seekor lendir hijau bertopi bajak laut bernama Kapten Lendir menghadang jalanmu.',
    banter:[
      {who:'monster', text:'Ahoy! Berhenti, pengembara! Tak ada yang boleh lewat sebelum menjawab soalku!'},
      {who:'hero',    text:'Aku tidak takut, Kapten. Aku sudah belajar berhitung dengan giat.'},
      {who:'monster', text:'Hmm, jawabanmu benar. Tapi apa kamu bisa terus begini, ho-ho?'},
      {who:'hero',    text:'Tentu! Setiap angka yang benar membuatku makin berani.'},
      {who:'monster', text:'Wah… kamu memang pemberani. Aku jadi malu sudah menghadangmu.'},
      {who:'hero',    text:'Tidak apa-apa. Ayo berteman dan jaga hutan ini bersama, Kapten!'}
    ],
    victory:'Kapten Lendir tertawa lega, melambaikan topinya, dan membukakan jalan — kalian pun berteman!' },

  /* id 4 — orange baby dragon (Naga Jingga) */
  4:{ sub:'naga jingga kecil',
    intro:'Naga Jingga, naga kecil berwarna oranye, mengepakkan sayapnya menantangmu berlomba menjawab.',
    banter:[
      {who:'monster', text:'Ayo balapan! Siapa cepat menjawab, dialah yang menang!'},
      {who:'hero',    text:'Aku siap, tapi aku akan tetap tenang agar tidak salah.'},
      {who:'monster', text:'Kamu cepat sekaligus tenang? Aku belum pernah lihat itu!'},
      {who:'hero',    text:'Kalau kita tergesa-gesa, kita malah keliru. Sabar itu penting.'},
      {who:'monster', text:'Kamu benar. Aku terlalu buru-buru selama ini.'},
      {who:'hero',    text:'Yuk, kita berlatih bareng biar sama-sama pintar!'}
    ],
    victory:'Naga Jingga menyemburkan kilau hangat dan terbang riang menemanimu.' },

  /* id 9 — orange fox (Rubi si Rubah) */
  9:{ sub:'rubah oranye lincah',
    intro:'Rubi si Rubah, rubah oranye yang lincah dan ramah, menyapamu dengan ekor bergoyang membawa soal.',
    banter:[
      {who:'monster', text:'Halo! Aku Rubi. Bisakah kamu mengejar jawaban secepat aku berlari?'},
      {who:'hero',    text:'Aku akan tunjukkan dengan menjawab sebaik mungkin.'},
      {who:'monster', text:'Bagus… setiap jawaban benarmu membuat ekorku bergoyang senang.'},
      {who:'hero',    text:'Seru sekali! Belajar ternyata bisa seasyik berlari bersama.'},
      {who:'monster', text:'Kamu rajin dan gembira. Aku suka berteman denganmu.'},
      {who:'hero',    text:'Ayo berlari bersama menuju petualangan baru, Rubi!'}
    ],
    victory:'Rubi si Rubah melompat gembira dan berlari mengitarimu merayakan kemenanganmu.' },

  /* id 17 — purple one-eyed ghost (Hantu Ungu) */
  17:{ sub:'hantu ungu lembut hati',
    intro:'Hantu Ungu, hantu ungu bermata satu yang lembut hati, mengambang sopan menyapamu.',
    banter:[
      {who:'monster', text:'Jangan takut, ya. Sudah lama aku menunggu anak yang pandai berhitung.'},
      {who:'hero',    text:'Aku tidak takut. Aku akan berusaha membuatmu bangga.'},
      {who:'monster', text:'Hatimu berani dan santun. Setiap jawaban benarmu membuatku bercahaya.'},
      {who:'hero',    text:'Menghormati siapa pun adalah hal yang baik.'},
      {who:'monster', text:'Kamu anak yang santun. Aku tidak kesepian lagi.'},
      {who:'hero',    text:'Kita berteman sekarang, ya! Boo bukan lagi kata menakutkan.'}
    ],
    victory:'Hantu Ungu berpendar riang mengitarimu, memberi restu untuk perjalananmu.' },

  /* id 76 — cactus (Duri si Kaktus) */
  76:{ sub:'kaktus berduri ramah',
    intro:'Duri si Kaktus, kaktus hijau berduri yang kokoh, berdiri di jalan berpasir menantangmu berhitung.',
    banter:[
      {who:'monster', text:'Awas duriku! Tapi tenang, aku cuma mau menguji hitunganmu.'},
      {who:'hero',    text:'Aku akan sabar dan menjawab pelan-pelan, Duri.'},
      {who:'monster', text:'Wah, jawabanmu benar. Bungaku sampai mekar sedikit di pucukku.'},
      {who:'hero',    text:'Yang sulit pun bisa selesai kalau kita sabar.'},
      {who:'monster', text:'Duriku melunak oleh kesabaranmu. Kamu baik sekali.'},
      {who:'hero',    text:'Di gurun yang sepi, biar aku jadi temanmu, ya!'}
    ],
    victory:'Duri si Kaktus mekar berbunga cerah dan menyingkir, membuka jalanmu di gurun!' },

  /* id 29 — pirate octopus (Gurita Bajak) */
  29:{ sub:'gurita bajak laut',
    intro:'Gurita Bajak, gurita ungu bertopi bajak laut, melambaikan delapan tangannya di jalanmu.',
    banter:[
      {who:'monster', text:'Ahoy, pengembara! Delapan lenganku memegang delapan soal. Berani hadapi?'},
      {who:'hero',    text:'Aku akan tenang dan menjawab dengan hati yang jernih.'},
      {who:'monster', text:'Jernih sekali pikiranmu, seperti air laut yang tenang.'},
      {who:'hero',    text:'Pikiran yang tenang membuat jawaban jadi jelas.'},
      {who:'monster', text:'Kamu pantas melanjutkan. Aku memberkatimu, kru kecilku.'},
      {who:'hero',    text:'Ayo berlayar bersama menuju petualangan baru, Kapten Gurita!'}
    ],
    victory:'Gurita Bajak melambaikan kedelapan tangannya, menyinarimu dengan kedamaian laut!' },

  /* id 10 — star guardian (Bintang Kelip) */
  10:{ sub:'bintang penjaga bercahaya',
    intro:'Di ujung hutan, Bintang Kelip yang besar dan bercahaya berkedip menerangi jalan.',
    banter:[
      {who:'monster', text:'Akulah penjaga terakhir hutan ini. Cahayaku menerangi segalanya!'},
      {who:'hero',    text:'Aku sudah belajar banyak. Aku siap menghadapimu.'},
      {who:'monster', text:'Setiap jawaban benarmu membuat cahayaku makin hangat… bagaimana bisa?'},
      {who:'hero',    text:'Karena ilmu adalah cahaya yang bersinar dari dalam.'},
      {who:'monster', text:'Luar biasa… aku kalah oleh keberanian dan ilmumu.'},
      {who:'hero',    text:'Kamu bukan musuh, hanya kesepian. Ayo ikut jadi temanku!'}
    ],
    victory:'Bintang Kelip berkedip riang, langit pun cerah, dan ia jadi penjaga sahabatmu!' }
};

/* ── build the registry now (needs the KIND pools + pickSub defined above) ── */
var MONSTERS=buildMonsters();

/* ── forMonster(id) — the primary API the game calls. Never returns empty. ── */
function forMonster(id){
  id=parseInt(id,10); if(!id||id<1) id=1; if(id>SPRITES) id=((id-1)%SPRITES)+1;
  var m=MONSTERS[id]; if(!m) return genArcFor(1);
  var hand=HAND_ID[id];
  if(hand){
    return {
      name:m.name, sub:hand.sub||m.sub, intro:hand.intro,
      banter:hand.banter, victory:hand.victory, monster:m.name, kind:m.kind, _hand:true
    };
  }
  return genArcFor(id);
}

/* ════════════ BACKWARD-COMPAT: legacy (world,level) API ════════════
   Older callers use get(world,level)/getByGlobal(g). The sprite shown for
   global level g was ((g-1)%81)+1, so we map (world,level) → that legacy id
   and reuse forMonster(). Shape is identical (incl. `monster`). */
var WORLD_THEMES=[
  {name:'Hutan Ceria',    value:'keberanian'},
  {name:'Padang Bunga',   value:'kebaikan'},
  {name:'Gua Kristal',    value:'kesabaran'},
  {name:'Sungai Riang',   value:'kerja sama'},
  {name:'Bukit Awan',     value:'kepercayaan diri'},
  {name:'Gurun Emas',     value:'ketekunan'},
  {name:'Pantai Mutiara', value:'kejujuran'},
  {name:'Negeri Salju',   value:'ketenangan'},
  {name:'Gunung Api',     value:'pantang menyerah'},
  {name:'Istana Bintang', value:'kebijaksanaan'}
];

function legacyIdFor(world, level){
  var g=(world-1)*LEVELS+level;      // 1..100
  return ((g-1)%LEGACY_SPRITES)+1;   // 1..81 (matches the old sprite mapping)
}
function spriteNameForGlobal(g){
  g=parseInt(g,10); if(!g||g<1) g=1;
  return SPRITE_NAMES[((g-1)%LEGACY_SPRITES)];
}
function spriteNameFor(world, level){ return spriteNameForGlobal((world-1)*LEVELS+level); }

function get(world, level){
  world=parseInt(world,10); level=parseInt(level,10);
  if(!world||world<1) world=1; if(world>WORLDS) world=WORLDS;
  if(!level||level<1) level=1; if(level>LEVELS) level=LEVELS;
  return forMonster(legacyIdFor(world, level));
}
function getByGlobal(g){
  g=parseInt(g,10); if(!g||g<1) g=1; if(g>WORLDS*LEVELS) g=WORLDS*LEVELS;
  var world=Math.floor((g-1)/LEVELS)+1, level=((g-1)%LEVELS)+1;
  return get(world, level);
}

window.MATH_STORIES={
  WORLDS:WORLDS,
  LEVELS:LEVELS,
  SPRITES:SPRITES,
  monsters:MONSTERS,
  spriteNames:SPRITE_NAMES,
  themes:WORLD_THEMES,
  spriteNameForGlobal:spriteNameForGlobal,
  spriteNameFor:spriteNameFor,
  forMonster:forMonster,     // PRIMARY API (id 1..281)
  get:get,                   // backward-compat (world,level)
  getByGlobal:getByGlobal    // backward-compat (global 1..100)
};
})();
