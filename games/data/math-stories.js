/* ═══════════════════════════════════════════════════════════════════════
   MATH STORIES — window.MATH_STORIES  (P3d, 2026-07-15)
   ---------------------------------------------------------------------------
   Story-mode data for "Matematika Petualangan" (games/kuis-matematika.html, G25).
   Goal: children learn MATH *and* READING. Every one of the 100 levels
   (10 worlds × 10 sub-levels) gets a named, friendly monster and a tiny
   alternating hero↔monster speech-cloud narrative that unfolds as the child
   answers questions.

   ISOLATED DATA FILE — pure data + a get() helper. No game wiring here; the
   game consumes MATH_STORIES.get(world, level) (both 1-based) later.

   Vanilla ES5 (var / IIFE / no arrow / no const). Idempotent guard.
   See: "documentation and standarization/MATH_STORY_STANDARD.md".
   ═══════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
if(window.MATH_STORIES) return; // idempotent — never redefine

var WORLDS=10, LEVELS=10;
var SPRITES=81; // assets/math/monsters/mon-1.webp .. mon-81.webp

/* ── SPRITE_NAMES — index 0..80 → kid-safe Indonesian name that MATCHES the
      look of assets/math/monsters/mon-(i+1).webp. The game shows, for global
      level g (1..100), sprite = ((g-1) % 81) + 1. So each arc's `monster`
      name is set FROM this table by that same mapping — names can never drift
      away from the sprite a child actually sees on screen. Friendly, never
      scary; the name should make a kid go "yes, that's that creature". ── */
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

/* name of the sprite shown for a given global level (1..100) */
function spriteNameForGlobal(g){
  g=parseInt(g,10); if(!g||g<1) g=1;
  var idx=((g-1)%SPRITES); // 0-based index into SPRITE_NAMES
  return SPRITE_NAMES[idx];
}
/* name of the sprite shown for a (world,level) pair (both 1-based) */
function spriteNameFor(world, level){
  var g=(world-1)*LEVELS+level;
  return spriteNameForGlobal(g);
}

/* ── World themes (1-based). Kid-friendly Indonesian adventure biomes that
      match the generic sub-1..sub-10 maps. Each carries a name, a short
      setting phrase, and a value the world gently teaches. ── */
var WORLD_THEMES=[
  {name:'Hutan Ceria',      place:'di tepi Hutan Ceria yang penuh kunang-kunang', value:'keberanian'},
  {name:'Padang Bunga',     place:'di Padang Bunga yang harum dan berwarna-warni', value:'kebaikan'},
  {name:'Gua Kristal',      place:'di dalam Gua Kristal yang berkilau', value:'kesabaran'},
  {name:'Sungai Riang',     place:'di tepi Sungai Riang yang jernih', value:'kerja sama'},
  {name:'Bukit Awan',       place:'di puncak Bukit Awan yang sejuk', value:'kepercayaan diri'},
  {name:'Gurun Emas',       place:'di tengah Gurun Emas yang berkilau', value:'ketekunan'},
  {name:'Pantai Mutiara',   place:'di Pantai Mutiara yang berombak lembut', value:'kejujuran'},
  {name:'Negeri Salju',     place:'di Negeri Salju yang putih dan tenang', value:'ketenangan'},
  {name:'Gunung Api',       place:'di kaki Gunung Api yang hangat', value:'pantang menyerah'},
  {name:'Istana Bintang',   place:'di gerbang Istana Bintang milik Raja Iblis', value:'kebijaksanaan'}
];

/* ── LEGACY curated pool of kid-safe Indonesian monster names. Kept only for
      the exported `monsterPool` field / backward-compat. Monster NAMES are no
      longer drawn from here — they come from SPRITE_NAMES so every name matches
      the sprite the game actually shows (see below). ── */
var MONSTER_POOL=[
  'Si Guruh','Raja Kabut','Bimo Batu','Nyai Embun','Pak Lumut','Si Kelip',
  'Guntur Kecil','Puti Bulan','Bang Ombak','Si Rimbun','Datuk Angin','Nini Kunang',
  'Si Gemah','Raden Kabu','Mbok Sari','Si Dengung','Pangeran Riak','Si Kilau',
  'Bujang Api','Si Gemuruh','Nyi Gerimis','Si Rembulan','Ki Petir','Si Rintik',
  'Datuk Ranting','Si Gelombang','Puan Salju','Si Berkilau','Bang Gemericik','Si Percik',
  'Nini Cahaya','Si Gempur','Raja Riak','Si Melodi','Pak Gembur','Si Dentang',
  'Nyai Serbuk','Si Kelap','Datuk Gemuruh','Si Ranum','Puti Cempaka','Si Denyar',
  'Bang Deru','Si Gerlap','Ki Mendung','Si Rona','Nyi Pelangi','Si Gemericik',
  'Datuk Bara','Si Kelana','Puan Mentari','Si Gempita','Pak Riuh','Si Semilir',
  'Nini Purnama','Si Gebyar','Raja Gulita','Si Denting','Bang Bayu','Si Gerimis',
  'Ki Halimun','Si Gemulai','Puti Nirmala','Si Rembang','Datuk Guruh','Si Cendana',
  'Nyai Kirana','Si Gemintang','Bang Samudra','Si Wangi'
];

/* ── HAND-AUTHORED worlds 1..3 (30 levels). Rich, warm, well-written
      Indonesian for ages ~5–9. Each: monster / intro / banter[] / victory.
      banter alternates hero↔monster (4–8 lines) and reads as a tiny arc:
      challenge → back-and-forth → turning point → friendship. ── */
var HAND={};

HAND[1]={
1:{ monster:'Kapten Lendir',
  intro:'Di gerbang Hutan Ceria, seekor lendir hijau bertopi bajak laut bernama Kapten Lendir menghadang jalanmu.',
  banter:[
    {who:'monster', text:'Berhenti, pengembara! Tak ada yang boleh lewat sebelum menjawab soalku!'},
    {who:'hero',    text:'Aku tidak takut, Kapten. Aku sudah belajar berhitung dengan giat.'},
    {who:'monster', text:'Hmm, jawabanmu benar. Tapi apa kamu bisa terus begini?'},
    {who:'hero',    text:'Tentu! Setiap angka yang benar membuatku makin berani.'},
    {who:'monster', text:'Wah… kamu memang pemberani. Aku jadi malu sudah menghadangmu.'},
    {who:'hero',    text:'Tidak apa-apa. Ayo berteman dan jaga hutan ini bersama, Kapten!'}
  ],
  victory:'Kapten Lendir tertawa lega, melambaikan topinya, dan membukakan jalan — kalian pun berteman!' },

2:{ monster:'Si Bola Mata',
  intro:'Si Bola Mata, makhluk bulat bermata satu yang besar, mengerjap penasaran di depanmu.',
  banter:[
    {who:'monster', text:'Mataku besar, jadi aku suka melihat angka. Berani menjawab soalku?'},
    {who:'hero',    text:'Berani! Aku akan menghitung pelan-pelan dan hati-hati.'},
    {who:'monster', text:'Bagus… mataku makin cerah setiap jawabanmu benar.'},
    {who:'hero',    text:'Lihat, sekarang kamu bisa melihat semuanya dengan jelas!'},
    {who:'monster', text:'Terima kasih, pahlawan kecil. Keberanianmu membuka mataku.'}
  ],
  victory:'Si Bola Mata berkedip gembira dan menunjukkanmu jalan ke depan.' },

3:{ monster:'Bebek Penjelajah',
  intro:'Bebek Penjelajah yang lucu, membawa tongkat kecil, berdiri menutup jembatan di hutan.',
  banter:[
    {who:'monster', text:'Kwek! Jembatan ini licin. Buktikan kamu teliti sebelum menyeberang.'},
    {who:'hero',    text:'Aku akan periksa setiap angka dengan cermat, Bebek.'},
    {who:'monster', text:'Bagus. Anak yang teliti tidak mudah tergelincir.'},
    {who:'hero',    text:'Sudah! Semua jawabanku sudah kuperiksa dua kali.'},
    {who:'monster', text:'Hebat. Silakan lewat — kamu sudah membuktikan ketelitianmu. Kwek kwek!'}
  ],
  victory:'Bebek Penjelajah mengangguk bangga dan menuntunmu menyeberang dengan aman.' },

4:{ monster:'Naga Jingga',
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

5:{ monster:'Si Toples Ikan',
  intro:'Si Toples Ikan, mangkuk kaca dengan ikan mungil di dalamnya, bergoyang pelan menyebarkan soal.',
  banter:[
    {who:'monster', text:'Airku beriak-riak. Bisakah kamu menangkap jawabannya?'},
    {who:'hero',    text:'Aku akan fokus, satu per satu, tak akan kulewatkan.'},
    {who:'monster', text:'Fokusmu jernih sekali, seperti air bersih di toplesku.'},
    {who:'hero',    text:'Kalau kita tenang, riak apa pun bisa kita hadapi.'},
    {who:'monster', text:'Kata-katamu menenangkan. Ikanku suka berteman denganmu.'}
  ],
  victory:'Si Toples Ikan berkilau jernih, dan ikannya berenang gembira menuntunmu lebih dalam.' },

6:{ monster:'Si Mata Satu',
  intro:'Si Mata Satu, goblin hijau bermata tunggal yang pemalu, mengintip sambil membawa teka-teki angka.',
  banter:[
    {who:'monster', text:'A-aku malu bertemu orang… tapi aku punya soal untukmu.'},
    {who:'hero',    text:'Tidak apa-apa, aku temanmu. Ayo kita kerjakan bersama.'},
    {who:'monster', text:'Kamu baik sekali. Biasanya semua lari melihat mataku.'},
    {who:'hero',    text:'Setiap makhluk punya kebaikan. Aku senang mengenalmu.'},
    {who:'monster', text:'Terima kasih sudah tidak takut padaku, teman.'}
  ],
  victory:'Si Mata Satu keluar dari persembunyian dan melambai riang padamu.' },

7:{ monster:'Awan Rintik',
  intro:'Awan Rintik, awan biru mungil yang suka menurunkan hujan, mengambang pelan di dahan.',
  banter:[
    {who:'monster', text:'Rintik! Aku suka bikin gerimis. Kamu takut basah, kan?'},
    {who:'hero',    text:'Sedikit, tapi aku tetap berani menjawab soalmu.'},
    {who:'monster', text:'Wah, kamu tetap tenang walau kena tetesan. Keren!'},
    {who:'hero',    text:'Rasa takut itu wajar, yang penting kita tetap mencoba.'},
    {who:'monster', text:'Aku belajar hal baru darimu hari ini.'}
  ],
  victory:'Awan Rintik menurunkan gerimis lembut yang menyejukkan langkahmu.' },

8:{ monster:'Jamur Merah',
  intro:'Jamur Merah, jamur bertudung merah totol putih yang lucu, berdiri kokoh di mulut gua.',
  banter:[
    {who:'monster', text:'Aku tumbuh kokoh di sini. Kamu yakin bisa lewat?'},
    {who:'hero',    text:'Aku tidak akan menyerah. Aku hitung satu demi satu.'},
    {who:'monster', text:'Semangatmu kuat, dan hatimu hangat.'},
    {who:'hero',    text:'Kekuatan sejati datang dari usaha, bukan dari ukuran.'},
    {who:'monster', text:'Kata-katamu bijak. Aku menyingkir, silakan lewat.'}
  ],
  victory:'Jamur Merah bergoyang riang dan membuka jalan menuju petualangan baru.' },

9:{ monster:'Rubi si Rubah',
  intro:'Rubi si Rubah, rubah oranye yang lincah dan ramah, menyapamu dengan ekor bergoyang membawa soal.',
  banter:[
    {who:'monster', text:'Halo! Aku Rubi. Bisakah kamu mengejar jawaban secepat aku berlari?'},
    {who:'hero',    text:'Aku akan tunjukkan dengan menjawab sebaik mungkin.'},
    {who:'monster', text:'Bagus… setiap jawaban benarmu membuat ekorku bergoyang senang.'},
    {who:'hero',    text:'Seru sekali! Belajar ternyata bisa seasyik berlari bersama.'},
    {who:'monster', text:'Kamu rajin dan gembira. Aku suka berteman denganmu.'}
  ],
  victory:'Rubi si Rubah melompat gembira dan berlari mengitarimu merayakan kemenanganmu.' },

10:{ monster:'Bintang Kelip',
  intro:'Di ujung Hutan Ceria, Bintang Kelip yang besar dan bercahaya berkedip menerangi jalan.',
  banter:[
    {who:'monster', text:'Akulah penjaga terakhir hutan ini. Cahayaku menerangi segalanya!'},
    {who:'hero',    text:'Aku sudah belajar banyak. Aku siap menghadapimu.'},
    {who:'monster', text:'Setiap jawaban benarmu membuat cahayaku makin hangat… bagaimana bisa?'},
    {who:'hero',    text:'Karena ilmu adalah cahaya yang bersinar dari dalam.'},
    {who:'monster', text:'Luar biasa… aku kalah oleh keberanian dan ilmumu.'},
    {who:'hero',    text:'Kamu bukan musuh, hanya kesepian. Ayo ikut jadi temanku.'}
  ],
  victory:'Bintang Kelip berkedip riang, langit pun cerah, dan ia jadi penjaga sahabatmu!' }
};

HAND[2]={
1:{ monster:'Si Bulu Biru',
  intro:'Di Padang Bunga, Si Bulu Biru yang gembul dan berbulu lembut menyapamu dari balik kelopak mawar.',
  banter:[
    {who:'monster', text:'Pagi yang cerah! Maukah kamu bermain hitung bersamaku?'},
    {who:'hero',    text:'Tentu! Aku suka belajar sambil bermain.'},
    {who:'monster', text:'Hatimu ramah. Angka pun jadi mudah kalau hati gembira.'},
    {who:'hero',    text:'Benar! Kalau kita ramah, semua terasa menyenangkan.'},
    {who:'monster', text:'Terima kasih sudah menemaniku pagi ini, teman baik.'}
  ],
  victory:'Si Bulu Biru melompat gembira di antara bunga, dan padang pun makin ceria.' },

2:{ monster:'Ksatria Batu',
  intro:'Ksatria Batu, kesatria mungil berbaju zirah kelabu, berdiri gagah menjaga taman bunga.',
  banter:[
    {who:'monster', text:'Aku menjaga taman ini. Buktikan kamu layak dengan menjawab soalku.'},
    {who:'hero',    text:'Aku bantu ya, biar bunganya tetap aman dan cantik.'},
    {who:'monster', text:'Kamu suka menolong. Bunga-bunga berterima kasih padamu.'},
    {who:'hero',    text:'Menolong itu membuat hatiku ikut senang.'},
    {who:'monster', text:'Kebaikanmu lebih kuat dari zirahku. Aku hormat padamu.'}
  ],
  victory:'Ksatria Batu mengangkat perisainya memberi hormat untuk merayakan kebaikanmu.' },

3:{ monster:'Robo Kecil',
  intro:'Robo Kecil, robot mungil yang ramah, berkedip lampu-lampunya menunggumu di gerbang taman.',
  banter:[
    {who:'monster', text:'Bip-bip! Bisakah kamu menjaga kesabaranmu saat menjawab soalku?'},
    {who:'hero',    text:'Aku akan sabar, menjawab pelan tapi pasti.'},
    {who:'monster', text:'Sabar itu seperti bunga — mekar pada waktunya. Bip!'},
    {who:'hero',    text:'Aku tidak akan terburu-buru. Setiap langkah kunikmati.'},
    {who:'monster', text:'Kesabaranmu membuat mesinku bekerja makin tenang.'}
  ],
  victory:'Robo Kecil memberimu setangkai bunga dari lengan robotnya sebagai tanda persahabatan.' },

4:{ monster:'Dino Jambu',
  intro:'Dino Jambu, dinosaurus mungil berwarna merah jambu, berlari-lari kecil mengajakmu bermain angka.',
  banter:[
    {who:'monster', text:'Ikuti aku! Setiap bunga menyimpan sebuah soal.'},
    {who:'hero',    text:'Asyik! Aku suka mencari jawaban di antara bunga.'},
    {who:'monster', text:'Kamu rajin dan gembira. Itu pasangan yang hebat!'},
    {who:'hero',    text:'Belajar jadi ringan kalau dilakukan dengan senang.'},
    {who:'monster', text:'Ayo terus berlari bersamaku, teman yang ceria.'}
  ],
  victory:'Dino Jambu melompat-lompat gembira, dan padang bunga bersorak riang.' },

5:{ monster:'Si Sayap Api',
  intro:'Si Sayap Api, rubah oranye bersayap yang hangat, melayang lembut sambil membawa teka-teki.',
  banter:[
    {who:'monster', text:'Sayapku menghangatkan bunga. Maukah kamu membantuku menghitung?'},
    {who:'hero',    text:'Dengan senang hati! Membantu itu menyenangkan.'},
    {who:'monster', text:'Kamu murah hati. Bunga-bunga tersenyum karenamu.'},
    {who:'hero',    text:'Sedikit bantuan bisa membuat banyak perbedaan.'},
    {who:'monster', text:'Terima kasih, hatimu hangat seperti sayapku.'}
  ],
  victory:'Si Sayap Api mengepakkan sayap hangatnya agar matahari menyinari senyummu.' },

6:{ monster:'Si Lendir Hijau',
  intro:'Si Lendir Hijau, gumpalan lendir hijau yang bulat dan selalu tersenyum, menggelinding menyapamu di kebun.',
  banter:[
    {who:'monster', text:'Aku kenyal dan bulat! Tapi aku juga suka soal angka.'},
    {who:'hero',    text:'Ayo kita kerjakan, aku juga suka tantangan!'},
    {who:'monster', text:'Kamu tidak pernah menyerah, ya? Aku kagum.'},
    {who:'hero',    text:'Menyerah itu mudah, mencoba lagi itu yang hebat.'},
    {who:'monster', text:'Aku belajar untuk terus mencoba dari kamu.'}
  ],
  victory:'Si Lendir Hijau menggelinding gembira dan melambai riang untukmu.' },

7:{ monster:'Hantu Ungu',
  intro:'Hantu Ungu, hantu ungu bermata satu yang lembut hati, mengambang sopan menyapamu.',
  banter:[
    {who:'monster', text:'Jangan takut, ya. Sudah lama aku menunggu anak yang pandai berhitung.'},
    {who:'hero',    text:'Aku tidak takut. Aku akan berusaha membuatmu bangga.'},
    {who:'monster', text:'Hatimu berani dan santun. Aku senang sekali.'},
    {who:'hero',    text:'Menghormati siapa pun adalah hal yang baik.'},
    {who:'monster', text:'Kamu anak yang santun. Aku memberkatimu.'}
  ],
  victory:'Hantu Ungu mengambang riang mengitarimu, memberi restu untuk perjalananmu.' },

8:{ monster:'Monyet Lincah',
  intro:'Monyet Lincah, monyet cokelat yang gesit dan ceria, bergelantungan riang di tepi padang.',
  banter:[
    {who:'monster', text:'Aku suka melompat sambil berhitung. Mau ikut?'},
    {who:'hero',    text:'Boleh! Aku suka keceriaanmu yang menular.'},
    {who:'monster', text:'Kamu tenang tapi tetap gembira. Bagus sekali.'},
    {who:'hero',    text:'Hati yang gembira membuat pikiran jadi ringan.'},
    {who:'monster', text:'Ayo melompat bersamaku menuju petualangan baru.'}
  ],
  victory:'Monyet Lincah melompat gembira dari dahan ke dahan, menyegarkan semangatmu.' },

9:{ monster:'Rubah Api',
  intro:'Rubah Api, rubah oranye berbulu hangat, mengibaskan ekornya yang bercahaya membawa soal ceria.',
  banter:[
    {who:'monster', text:'Ekorku bercahaya hangat. Berani mencoba soalku?'},
    {who:'hero',    text:'Tentu! Aku akan berusaha sebaik mungkin.'},
    {who:'monster', text:'Kamu bersinar hangat seperti ekorku.'},
    {who:'hero',    text:'Kita semua istimewa dengan cara masing-masing.'},
    {who:'monster', text:'Kata-katamu membuat bulu-buluku makin cerah.'}
  ],
  victory:'Rubah Api berlari mengitari padang, meninggalkan jejak cahaya kebahagiaan.' },

10:{ monster:'Si Tetes Biru',
  intro:'Di ujung Padang Bunga, Si Tetes Biru yang besar dan jernih bercahaya menyejukkan jalanmu.',
  banter:[
    {who:'monster', text:'Akulah penjaga air padang ini. Buktikan hatimu jernih!'},
    {who:'hero',    text:'Aku sudah belajar berbagi dan menolong sepanjang jalan.'},
    {who:'monster', text:'Setiap jawaban benarmu membuat airku makin bening.'},
    {who:'hero',    text:'Kebaikan itu seperti air jernih — menyegarkan semua orang.'},
    {who:'monster', text:'Indah sekali… kamu layak melanjutkan petualanganmu.'},
    {who:'hero',    text:'Terima kasih. Aku akan membawa kesejukanmu ke dunia berikutnya.'}
  ],
  victory:'Si Tetes Biru memberkatimu dengan percikan jernih — gerbang dunia baru terbuka!' }
};

HAND[3]={
1:{ monster:'Kura Hijau',
  intro:'Di mulut Gua Kristal, Kura Hijau, kura-kura hijau berbatok tebal, menyapamu dengan sabar.',
  banter:[
    {who:'monster', text:'Gua ini gelap. Melangkahlah pelan dan jawab soalku!'},
    {who:'hero',    text:'Aku akan menjawab pelan-pelan agar tidak keliru.'},
    {who:'monster', text:'Sabar sekali kamu, seperti langkahku yang tak tergesa.'},
    {who:'hero',    text:'Di tempat gelap, kesabaran adalah cahaya kita.'},
    {who:'monster', text:'Terima kasih! Sekarang gua ini tak lagi menakutkan.'}
  ],
  victory:'Kura Hijau melangkah tenang membuka jalan, menerangi sudut Gua Kristal.' },

2:{ monster:'Kura Pendekar',
  intro:'Kura Pendekar, kura-kura gagah yang membawa pedang kayu, berdiri sigap menjaga lorong.',
  banter:[
    {who:'monster', text:'Aku penjaga lorong ini! Tapi pedang sejati adalah kepandaian.'},
    {who:'hero',    text:'Aku ingin pandai, jadi aku terus berlatih.'},
    {who:'monster', text:'Latihan membuatmu lebih tangguh dari pedang mana pun.'},
    {who:'hero',    text:'Kekuatan di dalam hati lebih hebat dari senjata.'},
    {who:'monster', text:'Kamu benar. Aku bangga menjadi temanmu.'}
  ],
  victory:'Kura Pendekar menyarungkan pedangnya dan memberi hormat untuk merayakan usahamu.' },

3:{ monster:'Robo Baja',
  intro:'Robo Baja, robot berbaju baja kelabu, berkedip pelan dan tampak murung di lorong gua.',
  banter:[
    {who:'monster', text:'Bip… Aku kesepian di gua ini. Tak ada yang mau menemaniku.'},
    {who:'hero',    text:'Aku mau menemanimu. Ayo kita kerjakan soal bersama.'},
    {who:'monster', text:'Sungguh? Kamu tidak lari dariku?'},
    {who:'hero',    text:'Teman tidak lari saat yang lain sedih. Aku di sini.'},
    {who:'monster', text:'Lampu-lampuku menyala cerah lagi… terima kasih, teman sejati.'}
  ],
  victory:'Robo Baja berkelap-kelip gembira dan menyalakan lampu-lampunya di dalam gua.' },

4:{ monster:'Si Merah Ceria',
  intro:'Si Merah Ceria, monster merah bermata satu yang selalu tersenyum lebar, melompat menyambutmu.',
  banter:[
    {who:'monster', text:'Hai! Aku cepat dan riang. Bisa kamu mengimbangiku?'},
    {who:'hero',    text:'Aku akan tetap tenang walau kamu bersemangat.'},
    {who:'monster', text:'Tenangmu membuatku ikut tenang. Aneh tapi enak!'},
    {who:'hero',    text:'Ketenangan menular, sama seperti kegembiraan.'},
    {who:'monster', text:'Aku senang berteman dengan anak setenang kamu.'}
  ],
  victory:'Si Merah Ceria tertawa riang dan menuntunmu lebih dalam ke gua.' },

5:{ monster:'Si Mata Hijau',
  intro:'Si Mata Hijau, monster hijau bermata besar yang bijak, memandangimu dengan hangat di lorong gua.',
  banter:[
    {who:'monster', text:'Mataku bisa melihat dalam gelap. Ayo, jawab soalnya.'},
    {who:'hero',    text:'Terima kasih. Aku akan berusaha sebaik mungkin.'},
    {who:'monster', text:'Ketekunanmu menyala seperti pandangan mata yang tajam.'},
    {who:'hero',    text:'Selama aku terus mencoba, semangatku tak akan padam.'},
    {who:'monster', text:'Anak yang tekun sepertimu akan sampai jauh.'}
  ],
  victory:'Si Mata Hijau mengerjap hangat, memberimu keberanian sebagai bekal.' },

6:{ monster:'Si Tanduk Ungu',
  intro:'Si Tanduk Ungu, monster ungu bertanduk kecil yang lucu, membuat labirin bayangan di depanmu.',
  banter:[
    {who:'monster', text:'Lorongku membingungkan. Bisakah kamu tetap fokus?'},
    {who:'hero',    text:'Aku akan ikuti satu jalan, pelan tapi pasti.'},
    {who:'monster', text:'Fokusmu tajam. Kamu tak mudah tersesat.'},
    {who:'hero',    text:'Kalau kita fokus, jalan yang rumit pun jadi jelas.'},
    {who:'monster', text:'Kamu menemukan jalan keluar. Hebat sekali!'}
  ],
  victory:'Si Tanduk Ungu mengangguk kagum dan membuka jalan menuju ruang gua berikutnya.' },

7:{ monster:'Si Api Bertanduk',
  intro:'Si Api Bertanduk, monster merah bertanduk kecil yang hangat hati, menyala lembut menyapamu.',
  banter:[
    {who:'monster', text:'Aku menghangatkan gua yang dingin ini. Maukah menemaniku berhitung?'},
    {who:'hero',    text:'Dengan senang hati. Aku hormat padamu.'},
    {who:'monster', text:'Anak yang santun. Hatimu sehangat nyala apiku.'},
    {who:'hero',    text:'Kesabaran membuatku belajar banyak hal hari ini.'},
    {who:'monster', text:'Bawalah kehangatan ini, Nak, ke mana pun kamu pergi.'}
  ],
  victory:'Si Api Bertanduk memberimu percikan hangat sebagai tanda sayang.' },

8:{ monster:'Peri Kembang',
  intro:'Peri Kembang, peri biru mungil yang membawa setangkai bunga, mengambang menghalangi lorong dengan sopan.',
  banter:[
    {who:'monster', text:'Aku mungil, tapi soalku tidak mudah lho!'},
    {who:'hero',    text:'Aku tidak gentar. Aku hadapi satu per satu.'},
    {who:'monster', text:'Kesabaranmu membuat bungaku mekar pelan-pelan.'},
    {who:'hero',    text:'Yang sulit pun bisa selesai kalau kita sabar.'},
    {who:'monster', text:'Kamu benar. Lewatlah, pahlawan yang sabar.'}
  ],
  victory:'Peri Kembang menaburkan kelopak bercahaya, membuka lorong kristal untukmu.' },

9:{ monster:'Gurita Bajak',
  intro:'Gurita Bajak, gurita ungu bertopi bajak laut, melambaikan delapan tangannya di ruang batu permata.',
  banter:[
    {who:'monster', text:'Selamat datang di ruangku, pengembara. Tunjukkan ketenanganmu.'},
    {who:'hero',    text:'Aku akan tenang dan menjawab dengan hati yang jernih.'},
    {who:'monster', text:'Jernih sekali pikiranmu, seperti air laut yang tenang.'},
    {who:'hero',    text:'Pikiran yang tenang membuat jawaban jadi jelas.'},
    {who:'monster', text:'Kamu pantas melanjutkan. Aku memberkatimu.'}
  ],
  victory:'Gurita Bajak melambaikan kedelapan tangannya, menyinarimu dengan kedamaian.' },

10:{ monster:'Batu Gerutu',
  intro:'Di jantung Gua Kristal, Batu Gerutu yang besar dan kelabu berdiri sambil menggerutu galak.',
  banter:[
    {who:'monster', text:'Grr! Akulah batu terbesar di sini. Tak ada yang bisa menggeserku!'},
    {who:'hero',    text:'Aku sudah sabar sepanjang jalan. Aku siap menghadapimu.'},
    {who:'monster', text:'Setiap jawaban benarmu membuat gerutuanku mereda… mengapa?'},
    {who:'hero',    text:'Karena kesabaran lebih kuat dari gerutuan sekeras apa pun.'},
    {who:'monster', text:'Hmph… baiklah. Aku menyerah pada ketenangan hatimu.'},
    {who:'hero',    text:'Kamu tidak jahat, hanya kesepian. Ayo jadi temanku.'}
  ],
  victory:'Batu Gerutu tersenyum malu-malu dan bergeser lembut — Gua Kristal kini damai!' }
};

/* ── GENERATOR for worlds 4..10 (and any missing hand-authored slot).
      Produces genuinely readable Indonesian, unique per level, seeded by the
      world theme + a deterministic pick from MONSTER_POOL. Not lorem. ── */

/* small deterministic chooser so generated text varies but is stable */
function pick(arr, world, level, salt){
  var seed=(world*31+level*7+salt*3)%arr.length;
  return arr[seed<0?seed+arr.length:seed];
}

/* value → matched encouraging back-and-forth fragments */
var VALUE_LESSON={
  'keberanian':      {hero:'Aku tidak akan takut. Keberanian tumbuh setiap kali aku mencoba.', moral:'keberanianmu membuat langkahmu makin mantap'},
  'kebaikan':        {hero:'Aku akan bersikap baik, bahkan pada yang menghalangiku.',           moral:'kebaikan hatimu menular ke sekelilingmu'},
  'kesabaran':       {hero:'Aku akan sabar, menjawab pelan tapi pasti.',                        moral:'kesabaranmu membuat yang sulit jadi mudah'},
  'kerja sama':      {hero:'Ayo kita kerjakan bersama, berdua pasti lebih ringan.',             moral:'kerja samamu membuat semua terasa mungkin'},
  'kepercayaan diri':{hero:'Aku percaya pada kemampuanku sendiri.',                             moral:'kepercayaan dirimu bersinar terang'},
  'ketekunan':       {hero:'Aku akan terus berlatih sampai bisa.',                              moral:'ketekunanmu tak pernah padam'},
  'kejujuran':       {hero:'Aku akan jujur, walau jawaban sulit kucari.',                       moral:'kejujuranmu membuatmu dipercaya'},
  'ketenangan':      {hero:'Aku akan tetap tenang agar pikiranku jernih.',                      moral:'ketenanganmu menular dan menenangkan'},
  'pantang menyerah':{hero:'Aku tidak akan menyerah, sekeras apa pun soalnya.',                 moral:'semangat pantang menyerahmu luar biasa'},
  'kebijaksanaan':   {hero:'Aku akan berpikir bijak sebelum menjawab.',                         moral:'kebijaksanaanmu menerangi jalan'}
};

/* opening challenge lines the monster can say (varied by salt) */
var MON_OPEN=[
  'Berhenti dulu! Jawab soalku kalau ingin lewat.',
  'Halo, pengembara kecil. Beranikah kamu menghadapi teka-tekiku?',
  'Sudah lama aku menunggu lawan berhitung. Kamukah orangnya?',
  'Hei! Tak seorang pun boleh lewat tanpa menjawab soal-soalku.',
  'Selamat datang. Mari kita uji kepandaianmu dengan angka.',
  'Aku penjaga tempat ini. Buktikan kamu pandai, ya!'
];
/* monster mid lines acknowledging progress */
var MON_MID=[
  'Hmm, jawabanmu benar terus. Kamu memang istimewa.',
  'Setiap jawaban benarmu membuatku makin kagum.',
  'Wah, kamu tidak mudah menyerah, ya?',
  'Kamu lebih tangguh dari yang kukira!',
  'Aku mulai suka bertanding denganmu.',
  'Kamu membuat soal sulit terlihat mudah.'
];
/* monster turning-point (softens) lines */
var MON_TURN=[
  'Aku mengaku kalah… tapi aku senang bertemu anak sepertimu.',
  'Ternyata kamu bukan lawan, tapi teman baru.',
  'Kamu mengalahkanku dengan kepandaian dan hati yang baik.',
  'Aku tak menyangka akan sekagum ini padamu.',
  'Baiklah, kamu menang. Dan aku bahagia karenanya.',
  'Kamu membuka mataku — belajar itu menyenangkan!'
];

function genLevel(world, level){
  var theme=WORLD_THEMES[world-1]||WORLD_THEMES[0];
  var vl=VALUE_LESSON[theme.value]||VALUE_LESSON['keberanian'];
  // name follows the SPRITE the game shows for this level (not the old pool),
  // so the generated intro/victory text always matches the picture on screen.
  var mon=spriteNameFor(world, level);
  var isBoss=(level===LEVELS);

  var intro= isBoss
    ? 'Di ujung '+theme.name+', '+mon+' sang penjaga terakhir berdiri gagah menantimu.'
    : mon+' menghadangmu '+theme.place+', membawa sekantong soal untukmu.';

  var banter=[
    {who:'monster', text:pick(MON_OPEN, world, level, 1)},
    {who:'hero',    text:vl.hero},
    {who:'monster', text:pick(MON_MID, world, level, 2)},
    {who:'hero',    text:'Selama '+vl.moral+', tak ada soal yang mustahil.'},
    {who:'monster', text:pick(MON_TURN, world, level, 3)}
  ];
  if(isBoss){
    // bosses get a slightly longer arc that turns the guardian into a friend
    banter.push({who:'hero', text:'Kamu bukan musuh, hanya penjaga yang kesepian. Ayo jadi temanku.'});
  }else{
    banter.push({who:'hero', text:'Terima kasih sudah menemaniku belajar. Ayo kita berteman!'});
  }

  var victory= isBoss
    ? mon+' tersenyum lega, dan gerbang '+theme.name+' terbuka untuk petualanganmu berikutnya!'
    : mon+' mengangguk bangga dan membukakan jalan — kalian pun berteman!';

  return {monster:mon, intro:intro, banter:banter, victory:victory, _generated:true};
}

/* Force an arc's monster name to MATCH the sprite the game will show for
   (world,level). The sprite is the single source of truth — this guarantees
   the name a child reads can never mismatch the picture. Returns a shallow
   copy so the underlying HAND/generated object is never mutated. */
function withSpriteName(arc, world, level){
  var name=spriteNameFor(world, level);
  if(!arc || arc.monster===name) return arc;
  return {
    monster: name,
    intro:   arc.intro,
    banter:  arc.banter,
    victory: arc.victory,
    _generated: arc._generated
  };
}

/* ── public get(world, level) — both 1-based. Never returns empty. ── */
function get(world, level){
  world=parseInt(world,10); level=parseInt(level,10);
  if(!world||world<1) world=1; if(world>WORLDS) world=WORLDS;
  if(!level||level<1) level=1; if(level>LEVELS) level=LEVELS;
  var arc=(HAND[world] && HAND[world][level]) ? HAND[world][level] : genLevel(world, level);
  return withSpriteName(arc, world, level);
}

/* accept a flat global level (1..100) too, for convenience */
function getByGlobal(g){
  g=parseInt(g,10); if(!g||g<1) g=1; if(g>WORLDS*LEVELS) g=WORLDS*LEVELS;
  var world=Math.floor((g-1)/LEVELS)+1, level=((g-1)%LEVELS)+1;
  return get(world, level);
}

window.MATH_STORIES={
  WORLDS:WORLDS,
  LEVELS:LEVELS,
  SPRITES:SPRITES,
  themes:WORLD_THEMES,
  monsterPool:MONSTER_POOL,
  spriteNames:SPRITE_NAMES,
  spriteNameForGlobal:spriteNameForGlobal,
  spriteNameFor:spriteNameFor,
  hand:HAND,
  get:get,
  getByGlobal:getByGlobal
};
})();
