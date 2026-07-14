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

/* ── Curated pool of ~70 kid-safe, friendly (NOT scary) Indonesian monster
      names. Drawn from for generated worlds so every level stays unique. ── */
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
1:{ monster:'Si Guruh',
  intro:'Di gerbang Hutan Ceria, seekor makhluk gembul bernama Si Guruh menghadang jalanmu.',
  banter:[
    {who:'monster', text:'Berhenti! Tak ada yang boleh lewat sebelum menjawab soalku!'},
    {who:'hero',    text:'Aku tidak takut. Aku sudah belajar berhitung dengan giat.'},
    {who:'monster', text:'Hmm, jawabanmu benar. Tapi apa kamu bisa terus begini?'},
    {who:'hero',    text:'Tentu! Setiap angka yang benar membuatku makin berani.'},
    {who:'monster', text:'Wah… kamu memang pemberani. Aku jadi malu sudah menghadangmu.'},
    {who:'hero',    text:'Tidak apa-apa. Ayo kita berteman dan jaga hutan ini bersama.'}
  ],
  victory:'Si Guruh tertawa lega dan membukakan jalan — kalian pun berteman!' },

2:{ monster:'Nini Kunang',
  intro:'Nini Kunang, kunang-kunang tua yang bijak, menari di depanmu sambil membawa soal.',
  banter:[
    {who:'monster', text:'Cahayaku redup, Nak. Bantu aku dengan berhitung, ya?'},
    {who:'hero',    text:'Baik, Nini! Aku akan menghitung pelan-pelan dan hati-hati.'},
    {who:'monster', text:'Bagus… setiap jawaban benarmu membuat cahayaku makin terang.'},
    {who:'hero',    text:'Lihat, sekarang seluruh hutan jadi berkilau!'},
    {who:'monster', text:'Terima kasih, pahlawan kecil. Keberanianmu menyalakan harapan.'}
  ],
  victory:'Nini Kunang bersinar terang dan menerangi jalanmu ke depan.' },

3:{ monster:'Pak Lumut',
  intro:'Pak Lumut yang lembut duduk di atas batu, menutup jembatan kecil di hutan.',
  banter:[
    {who:'monster', text:'Jembatan ini licin. Buktikan kamu teliti sebelum menyeberang.'},
    {who:'hero',    text:'Aku akan periksa setiap angka dengan cermat, Pak.'},
    {who:'monster', text:'Bagus. Anak yang teliti tidak mudah tergelincir.'},
    {who:'hero',    text:'Sudah! Semua jawabanku sudah kuperiksa dua kali.'},
    {who:'monster', text:'Hebat. Silakan lewat — kamu sudah membuktikan ketelitianmu.'}
  ],
  victory:'Pak Lumut mengangguk bangga dan menahan jembatan agar kamu aman menyeberang.' },

4:{ monster:'Si Kelip',
  intro:'Si Kelip, bola cahaya nakal, melompat-lompat menantangmu berlomba menjawab.',
  banter:[
    {who:'monster', text:'Ayo balapan! Siapa cepat menjawab, dialah yang menang!'},
    {who:'hero',    text:'Aku siap, tapi aku akan tetap tenang agar tidak salah.'},
    {who:'monster', text:'Kamu cepat sekaligus tenang? Aku belum pernah lihat itu!'},
    {who:'hero',    text:'Kalau kita tergesa-gesa, kita malah keliru. Sabar itu penting.'},
    {who:'monster', text:'Kamu benar. Aku terlalu buru-buru selama ini.'},
    {who:'hero',    text:'Yuk, kita berlatih bareng biar sama-sama pintar!'}
  ],
  victory:'Si Kelip berhenti melompat dan berkelap-kelip gembira menemanimu.' },

5:{ monster:'Datuk Angin',
  intro:'Datuk Angin berputar pelan di lorong pohon, menyebarkan daun-daun berisi soal.',
  banter:[
    {who:'monster', text:'Daun-daunku berterbangan. Bisakah kamu menangkap jawabannya?'},
    {who:'hero',    text:'Aku akan fokus, satu per satu, tak akan kulewatkan.'},
    {who:'monster', text:'Fokusmu kuat sekali, seperti akar pohon tua.'},
    {who:'hero',    text:'Kalau kita tenang, angin sekencang apa pun bisa dihadapi.'},
    {who:'monster', text:'Kata-katamu menenangkan. Aku suka berteman denganmu.'}
  ],
  victory:'Datuk Angin berhembus lembut, menuntunmu ke bagian hutan yang lebih dalam.' },

6:{ monster:'Si Rimbun',
  intro:'Si Rimbun, semak berbulu yang pemalu, bersembunyi sambil membawa teka-teki angka.',
  banter:[
    {who:'monster', text:'A-aku malu bertemu orang… tapi aku punya soal untukmu.'},
    {who:'hero',    text:'Tidak apa-apa, aku temanmu. Ayo kita kerjakan bersama.'},
    {who:'monster', text:'Kamu baik sekali. Biasanya semua lari melihatku.'},
    {who:'hero',    text:'Setiap makhluk punya kebaikan. Aku senang mengenalmu.'},
    {who:'monster', text:'Terima kasih sudah tidak takut padaku, teman.'}
  ],
  victory:'Si Rimbun keluar dari persembunyian dan melambai riang padamu.' },

7:{ monster:'Guntur Kecil',
  intro:'Guntur Kecil, awan mungil yang suka menggeledek, menggelegar pelan di dahan.',
  banter:[
    {who:'monster', text:'Guntur! Aku suka bikin kaget. Kamu takut, kan?'},
    {who:'hero',    text:'Sedikit, tapi aku tetap berani menjawab soalmu.'},
    {who:'monster', text:'Wah, kamu tetap tenang walau kaget. Keren!'},
    {who:'hero',    text:'Rasa takut itu wajar, yang penting kita tetap mencoba.'},
    {who:'monster', text:'Aku belajar hal baru darimu hari ini.'}
  ],
  victory:'Guntur Kecil berubah jadi gerimis lembut yang menyejukkan langkahmu.' },

8:{ monster:'Bimo Batu',
  intro:'Bimo Batu, golem batu berhati lembut, menghalangi mulut gua dengan sopan.',
  banter:[
    {who:'monster', text:'Aku kokoh dan berat. Kamu yakin bisa lewat?'},
    {who:'hero',    text:'Aku tidak akan menyerah. Aku hitung satu demi satu.'},
    {who:'monster', text:'Semangatmu keras seperti batu, tapi hatimu hangat.'},
    {who:'hero',    text:'Kekuatan sejati datang dari usaha, bukan dari ukuran.'},
    {who:'monster', text:'Kata-katamu bijak. Aku bergeser, silakan lewat.'}
  ],
  victory:'Bimo Batu bergeser perlahan dan membuka jalan menuju petualangan baru.' },

9:{ monster:'Mbok Sari',
  intro:'Mbok Sari, peri bunga penjaga hutan, menyapamu dengan sekeranjang soal harum.',
  banter:[
    {who:'monster', text:'Selamat datang, Nak. Bunga-bungaku ingin tahu, kamu pandai?'},
    {who:'hero',    text:'Aku akan tunjukkan dengan menjawab sebaik mungkin.'},
    {who:'monster', text:'Bagus… setiap jawaban benar membuat sekuntum bunga mekar.'},
    {who:'hero',    text:'Indah sekali! Belajar ternyata bisa seindah taman.'},
    {who:'monster', text:'Kamu merawat pikiranmu seperti aku merawat bunga.'}
  ],
  victory:'Mbok Sari menaburkan kelopak bunga untuk merayakan kemenanganmu.' },

10:{ monster:'Raja Kabut',
  intro:'Di ujung Hutan Ceria, Raja Kabut yang besar menyelimuti jalan dengan kabut tebal.',
  banter:[
    {who:'monster', text:'Akulah penjaga terakhir hutan ini. Kabutku menutup segalanya!'},
    {who:'hero',    text:'Aku sudah belajar banyak. Kabut tak akan menghentikanku.'},
    {who:'monster', text:'Setiap jawaban benarmu menipiskan kabutku… bagaimana bisa?'},
    {who:'hero',    text:'Karena ilmu adalah cahaya yang menembus kabut apa pun.'},
    {who:'monster', text:'Luar biasa… aku kalah oleh keberanian dan ilmumu.'},
    {who:'hero',    text:'Kamu bukan musuh, hanya kesepian. Ayo ikut jadi temanku.'}
  ],
  victory:'Kabut sirna, matahari bersinar, dan Raja Kabut jadi penjaga sahabatmu!' }
};

HAND[2]={
1:{ monster:'Nyai Embun',
  intro:'Di Padang Bunga, Nyai Embun yang berkilau menyapamu dari atas kelopak mawar.',
  banter:[
    {who:'monster', text:'Pagi yang cerah! Maukah kamu bermain hitung bersamaku?'},
    {who:'hero',    text:'Tentu, Nyai! Aku suka belajar sambil bermain.'},
    {who:'monster', text:'Hatimu ramah. Angka pun jadi mudah kalau hati gembira.'},
    {who:'hero',    text:'Benar! Kalau kita ramah, semua terasa menyenangkan.'},
    {who:'monster', text:'Terima kasih sudah menemaniku pagi ini, teman baik.'}
  ],
  victory:'Nyai Embun menetes lembut membasahi bunga, dan padang pun makin harum.' },

2:{ monster:'Si Rintik',
  intro:'Si Rintik, tetes hujan periang, menari di antara bunga sambil membawa soal.',
  banter:[
    {who:'monster', text:'Rintik-rintik! Aku menyirami bunga sambil memberi soal.'},
    {who:'hero',    text:'Aku bantu ya, biar bunganya tumbuh subur dan cantik.'},
    {who:'monster', text:'Kamu suka menolong. Bunga-bunga berterima kasih padamu.'},
    {who:'hero',    text:'Menolong itu membuat hatiku ikut senang.'},
    {who:'monster', text:'Kebaikanmu menyegarkan seluruh padang ini.'}
  ],
  victory:'Si Rintik membentuk pelangi kecil untuk merayakan kebaikanmu.' },

3:{ monster:'Puti Cempaka',
  intro:'Puti Cempaka, tuan putri bunga yang lembut, menunggumu di gerbang taman.',
  banter:[
    {who:'monster', text:'Selamat datang di tamanku. Bisakah kamu menjaga kesabaranmu?'},
    {who:'hero',    text:'Aku akan sabar, menjawab pelan tapi pasti.'},
    {who:'monster', text:'Sabar itu seperti bunga — mekar pada waktunya.'},
    {who:'hero',    text:'Aku tidak akan terburu-buru. Setiap langkah kunikmati.'},
    {who:'monster', text:'Kesabaranmu membuat tamanku makin damai.'}
  ],
  victory:'Puti Cempaka memberimu bunga wangi sebagai tanda persahabatan.' },

4:{ monster:'Si Wangi',
  intro:'Si Wangi, kupu-kupu berbau harum, terbang berputar mengajakmu bermain angka.',
  banter:[
    {who:'monster', text:'Ikuti aku! Setiap bunga menyimpan sebuah soal.'},
    {who:'hero',    text:'Asyik! Aku suka mencari jawaban di antara bunga.'},
    {who:'monster', text:'Kamu rajin dan gembira. Itu pasangan yang hebat!'},
    {who:'hero',    text:'Belajar jadi ringan kalau dilakukan dengan senang.'},
    {who:'monster', text:'Ayo terus terbang bersamaku, teman yang ceria.'}
  ],
  victory:'Si Wangi menaburkan serbuk harum, dan padang bunga bersorak gembira.' },

5:{ monster:'Nyi Gerimis',
  intro:'Nyi Gerimis, awan lembut penyayang, meneduhkan bunga sambil membawa teka-teki.',
  banter:[
    {who:'monster', text:'Aku menyirami yang haus. Maukah kamu membantuku menghitung?'},
    {who:'hero',    text:'Dengan senang hati! Membantu itu menyenangkan.'},
    {who:'monster', text:'Kamu murah hati. Bunga-bunga tersenyum karenamu.'},
    {who:'hero',    text:'Sedikit bantuan bisa membuat banyak perbedaan.'},
    {who:'monster', text:'Terima kasih, hatimu sejuk seperti gerimis pagi.'}
  ],
  victory:'Nyi Gerimis berhenti sejenak agar matahari menyinari senyummu.' },

6:{ monster:'Si Ranum',
  intro:'Si Ranum, buah beri gembul yang lucu, menggelinding menyapamu di kebun.',
  banter:[
    {who:'monster', text:'Aku manis dan bulat! Tapi aku juga suka soal angka.'},
    {who:'hero',    text:'Ayo kita kerjakan, aku juga suka tantangan!'},
    {who:'monster', text:'Kamu tidak pernah menyerah, ya? Aku kagum.'},
    {who:'hero',    text:'Menyerah itu mudah, mencoba lagi itu yang hebat.'},
    {who:'monster', text:'Aku belajar untuk terus mencoba dari kamu.'}
  ],
  victory:'Si Ranum menggelinding gembira dan membagi beri manis untukmu.' },

7:{ monster:'Datuk Ranting',
  intro:'Datuk Ranting, pohon tua berjanggut daun, membungkuk sopan menyapamu.',
  banter:[
    {who:'monster', text:'Sudah lama aku menunggu anak yang pandai berhitung.'},
    {who:'hero',    text:'Aku akan berusaha membuat Datuk bangga.'},
    {who:'monster', text:'Sopan santunmu seindah dedaunanku di musim semi.'},
    {who:'hero',    text:'Menghormati yang lebih tua adalah hal yang baik.'},
    {who:'monster', text:'Kamu anak yang santun. Rantingku memberkatimu.'}
  ],
  victory:'Datuk Ranting menjatuhkan daun emas, tanda restu untuk perjalananmu.' },

8:{ monster:'Bang Gemericik',
  intro:'Bang Gemericik, anak sungai kecil yang ceria, mengalir riang di tepi padang.',
  banter:[
    {who:'monster', text:'Airku mengalir sambil bernyanyi. Mau ikut berhitung?'},
    {who:'hero',    text:'Boleh! Aku suka suara airmu yang menenangkan.'},
    {who:'monster', text:'Kamu tenang seperti air yang jernih. Bagus sekali.'},
    {who:'hero',    text:'Hati yang tenang membuat pikiran jadi jernih.'},
    {who:'monster', text:'Ayo mengalir bersamaku menuju petualangan baru.'}
  ],
  victory:'Bang Gemericik memercikkan air jernih, menyegarkan semangatmu.' },

9:{ monster:'Nyi Pelangi',
  intro:'Nyi Pelangi melengkung indah di atas padang, membawa tujuh warna dan soal ceria.',
  banter:[
    {who:'monster', text:'Setiap warnaku menyimpan satu soal. Berani mencoba?'},
    {who:'hero',    text:'Tentu! Aku akan warnai jawabanku dengan usaha terbaik.'},
    {who:'monster', text:'Kamu bersinar seperti warna kesukaanku.'},
    {who:'hero',    text:'Kita semua istimewa, seperti warna-warnamu yang berbeda.'},
    {who:'monster', text:'Kata-katamu membuat pelangiku makin cerah.'}
  ],
  victory:'Nyi Pelangi memayungi padang dengan tujuh warna kebahagiaan.' },

10:{ monster:'Puan Mentari',
  intro:'Di ujung Padang Bunga, Puan Mentari yang hangat bersinar menyilaukan jalanmu.',
  banter:[
    {who:'monster', text:'Akulah penjaga cahaya padang ini. Buktikan hatimu terang!'},
    {who:'hero',    text:'Aku sudah belajar berbagi dan menolong sepanjang jalan.'},
    {who:'monster', text:'Setiap jawaban benarmu membuat sinarku makin hangat.'},
    {who:'hero',    text:'Kebaikan itu seperti matahari — menghangatkan semua orang.'},
    {who:'monster', text:'Indah sekali… kamu layak melanjutkan petualanganmu.'},
    {who:'hero',    text:'Terima kasih, Puan. Aku akan membawa kehangatanmu ke dunia berikutnya.'}
  ],
  victory:'Puan Mentari memberkatimu dengan cahaya hangat — gerbang dunia baru terbuka!' }
};

HAND[3]={
1:{ monster:'Si Kelap',
  intro:'Di mulut Gua Kristal, Si Kelap, kristal mungil bercahaya, berkedip menyapamu.',
  banter:[
    {who:'monster', text:'Gua ini gelap. Nyalakan kristalku dengan jawaban benarmu!'},
    {who:'hero',    text:'Aku akan menjawab pelan-pelan agar tidak keliru.'},
    {who:'monster', text:'Sabar sekali kamu. Cahayaku mulai menyala.'},
    {who:'hero',    text:'Di tempat gelap, kesabaran adalah cahaya kita.'},
    {who:'monster', text:'Terima kasih! Sekarang gua ini tak lagi menakutkan.'}
  ],
  victory:'Si Kelap menyala terang, menerangi setiap sudut Gua Kristal.' },

2:{ monster:'Si Berkilau',
  intro:'Si Berkilau, batu permata periang, memantulkan cahaya sambil membawa soal.',
  banter:[
    {who:'monster', text:'Lihat kilauku! Tapi kilau sejati datang dari kepandaian.'},
    {who:'hero',    text:'Aku ingin pandai, jadi aku terus berlatih.'},
    {who:'monster', text:'Latihan membuatmu berkilau lebih dari permata mana pun.'},
    {who:'hero',    text:'Kilau di dalam diri lebih indah dari yang di luar.'},
    {who:'monster', text:'Kamu benar. Aku bangga menjadi temanmu.'}
  ],
  victory:'Si Berkilau memantulkan pelangi kecil untuk merayakan usahamu.' },

3:{ monster:'Ki Mendung',
  intro:'Ki Mendung, awan kelabu yang murung, menggantung rendah di langit-langit gua.',
  banter:[
    {who:'monster', text:'Aku sedih dan kelabu. Tak ada yang mau menemaniku.'},
    {who:'hero',    text:'Aku mau menemanimu. Ayo kita kerjakan soal bersama.'},
    {who:'monster', text:'Sungguh? Kamu tidak lari dariku?'},
    {who:'hero',    text:'Teman tidak lari saat yang lain sedih. Aku di sini.'},
    {who:'monster', text:'Hatiku jadi cerah… terima kasih, teman sejati.'}
  ],
  victory:'Ki Mendung berubah cerah dan menurunkan hujan berkilau di dalam gua.' },

4:{ monster:'Si Denyar',
  intro:'Si Denyar, percikan listrik ramah, melompat di antara kristal sambil tersenyum.',
  banter:[
    {who:'monster', text:'Zap! Aku cepat sekali. Bisa kamu mengimbangiku?'},
    {who:'hero',    text:'Aku akan tetap tenang walau kamu secepat kilat.'},
    {who:'monster', text:'Tenangmu membuatku ikut tenang. Aneh tapi enak!'},
    {who:'hero',    text:'Ketenangan menular, sama seperti kegembiraan.'},
    {who:'monster', text:'Aku senang berteman dengan anak setenang kamu.'}
  ],
  victory:'Si Denyar berpendar lembut, menuntunmu lebih dalam ke gua.' },

5:{ monster:'Datuk Bara',
  intro:'Datuk Bara, bara api tua yang bijak, menghangatkan lorong gua yang dingin.',
  banter:[
    {who:'monster', text:'Dinginnya gua ini. Aku hangatkan, kamu jawab soalnya.'},
    {who:'hero',    text:'Terima kasih, Datuk. Aku akan berusaha sebaik mungkin.'},
    {who:'monster', text:'Ketekunanmu menyala seperti bara yang tak padam.'},
    {who:'hero',    text:'Selama aku terus mencoba, semangatku tak akan padam.'},
    {who:'monster', text:'Anak yang tekun sepertimu akan sampai jauh.'}
  ],
  victory:'Datuk Bara memberimu percikan hangat sebagai bekal keberanian.' },

6:{ monster:'Si Gerlap',
  intro:'Si Gerlap, gugusan kristal berkedip, membentuk labirin cahaya di depanmu.',
  banter:[
    {who:'monster', text:'Labirinku membingungkan. Bisakah kamu tetap fokus?'},
    {who:'hero',    text:'Aku akan ikuti satu jalan, pelan tapi pasti.'},
    {who:'monster', text:'Fokusmu tajam. Kamu tak mudah tersesat.'},
    {who:'hero',    text:'Kalau kita fokus, jalan yang rumit pun jadi jelas.'},
    {who:'monster', text:'Kamu menemukan jalan keluar. Hebat sekali!'}
  ],
  victory:'Si Gerlap membuka jalan berkilau menuju ruang gua berikutnya.' },

7:{ monster:'Nini Cahaya',
  intro:'Nini Cahaya, peri tua penjaga kristal, duduk tenang memancarkan sinar lembut.',
  banter:[
    {who:'monster', text:'Sudah lama tak ada tamu. Maukah menemani nenek berhitung?'},
    {who:'hero',    text:'Dengan senang hati, Nini. Aku hormat pada Nini.'},
    {who:'monster', text:'Anak yang santun. Hatimu seterang kristal termurni.'},
    {who:'hero',    text:'Kesabaran Nini mengajariku banyak hal hari ini.'},
    {who:'monster', text:'Bawalah cahaya ini, Nak, ke mana pun kamu pergi.'}
  ],
  victory:'Nini Cahaya memberimu sekeping kristal bercahaya sebagai tanda sayang.' },

8:{ monster:'Si Gempur',
  intro:'Si Gempur, golem kristal besar berhati lembut, menghalangi lorong dengan sopan.',
  banter:[
    {who:'monster', text:'Aku besar dan kuat, tapi soalku lebih kuat lagi!'},
    {who:'hero',    text:'Aku tidak gentar. Aku hadapi satu per satu.'},
    {who:'monster', text:'Kesabaranmu meruntuhkan dindingku pelan-pelan.'},
    {who:'hero',    text:'Yang sulit pun bisa selesai kalau kita sabar.'},
    {who:'monster', text:'Kamu benar. Lewatlah, pahlawan yang sabar.'}
  ],
  victory:'Si Gempur bergeser dengan gemuruh pelan, membuka lorong kristal.' },

9:{ monster:'Puti Nirmala',
  intro:'Puti Nirmala, putri kristal yang anggun, bercahaya di singgasana batu permata.',
  banter:[
    {who:'monster', text:'Selamat datang di ruang hatiku. Tunjukkan ketenanganmu.'},
    {who:'hero',    text:'Aku akan tenang dan menjawab dengan hati yang jernih.'},
    {who:'monster', text:'Jernih sekali pikiranmu, seperti kristal tanpa noda.'},
    {who:'hero',    text:'Pikiran yang tenang membuat jawaban jadi jelas.'},
    {who:'monster', text:'Kamu pantas melanjutkan. Kristalku memberkatimu.'}
  ],
  victory:'Puti Nirmala menyinarimu dengan cahaya sejuk penuh kedamaian.' },

10:{ monster:'Si Gebyar',
  intro:'Di jantung Gua Kristal, Si Gebyar yang megah bersinar menyilaukan seluruh ruang.',
  banter:[
    {who:'monster', text:'Akulah kristal terbesar di sini. Cahayaku bisa menyilaukan siapa pun!'},
    {who:'hero',    text:'Aku sudah sabar sepanjang jalan. Aku siap menghadapimu.'},
    {who:'monster', text:'Setiap jawaban benarmu membuat cahayaku makin jinak… mengapa?'},
    {who:'hero',    text:'Karena kesabaran lebih kuat dari cahaya paling terang sekalipun.'},
    {who:'monster', text:'Luar biasa. Aku menyerah pada ketenangan hatimu.'},
    {who:'hero',    text:'Kamu tidak jahat, hanya ingin dikagumi. Ayo jadi temanku.'}
  ],
  victory:'Si Gebyar meredupkan silaunya jadi cahaya hangat — Gua Kristal kini damai!' }
};

/* ── GENERATOR for worlds 4..10 (and any missing hand-authored slot).
      Produces genuinely readable Indonesian, unique per level, seeded by the
      world theme + a deterministic pick from MONSTER_POOL. Not lorem. ── */

/* deterministic non-repeating monster name per (world,level) */
function pickMonster(world, level){
  // stride the pool by a per-world offset so worlds don't share the same names
  var offset=((world*7)+13)%MONSTER_POOL.length;
  var idx=(offset+(level-1)*3)%MONSTER_POOL.length;
  return MONSTER_POOL[idx];
}

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
  var mon=pickMonster(world, level);
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

/* ── public get(world, level) — both 1-based. Never returns empty. ── */
function get(world, level){
  world=parseInt(world,10); level=parseInt(level,10);
  if(!world||world<1) world=1; if(world>WORLDS) world=WORLDS;
  if(!level||level<1) level=1; if(level>LEVELS) level=LEVELS;
  if(HAND[world] && HAND[world][level]) return HAND[world][level];
  return genLevel(world, level);
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
  themes:WORLD_THEMES,
  monsterPool:MONSTER_POOL,
  hand:HAND,
  get:get,
  getByGlobal:getByGlobal
};
})();
