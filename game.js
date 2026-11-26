
window.onerror = function(msg, url, line, col, err) {
  console.error('GLOBAL ERROR:', msg, 'at line', line, err)
  return false
}
// ================================================================
// DIFFICULTY CONFIG
// ================================================================
const DIFF = {
  easy:   { rounds: 6,  timer: 20, choices: 3 },
  medium: { rounds: 10, timer: 15, choices: 4 },
  // PRD-58 A1: reachable since v64.93 (levels 15-20); 12 rounds / 15 s keep one session short enough for a 6-7 year
  // old (15 traced letters or a 10 s count was written when nobody could reach it)
  hard:   { rounds: 12, timer: 15, choices: 6 }
}

// ================================================================
// DATA
// ================================================================

// owner emo pack: match each emotion's companion animal to a real sprite (emoji fallback)
const EMO_ANIMAL={'🦁':'singa','🐰':'kelinci','🐯':'harimau','🐘':'gajah','🦊':'rubah','🐸':'katak','🐼':'panda','🐨':'koala','🐺':'serigala','🦄':'unicorn'};
function emoAnimalSrc(a){ try{ if(window.UISprites){ var s=UISprites.path('emo',EMO_ANIMAL[a]); if(s) return s; } }catch(e){} return ''; }
// badge/eco sprite helpers — return <img> HTML for an emoji, or null to keep the emoji.
function uiBadge(emoji,style){ try{ if(window.UISprites){ var n=UISprites.badgeName(emoji); if(n){ var h=UISprites.imgHTML('badge',n,{style:style||'width:1em;height:1em;object-fit:contain;vertical-align:middle',emoji:emoji}); if(h) return h; } } }catch(e){} return null; }
function uiEco(name,emoji,style){ try{ if(window.UISprites){ var h=UISprites.imgHTML('eco',name,{style:style||'width:1em;height:1em;object-fit:contain;vertical-align:middle',emoji:emoji}); if(h) return h; } }catch(e){} return null; }
function uiRepeat(name,emoji,n){ var one=uiEco(name,emoji); if(!one) return emoji.repeat(Math.max(0,n)); var out=''; for(var i=0;i<n;i++)out+=one; return out; }
// deco pack: repaint the clean single celestial CSS shapes as real sprites (sun/moon).
// Only 1:1 maps — leaves the tiny particle dots + trees/grass as CSS (scale-safe).
function decoPaint(){ try{ if(!window.UISprites) return;
  [['.sun-circle','sun'],['.moon-crescent','moon']].forEach(function(m){
    var src=UISprites.path('deco',m[1]); if(!src) return;
    document.querySelectorAll(m[0]).forEach(function(el){
      el.style.background='none'; el.style.backgroundImage='url("'+src+'")';
      el.style.backgroundSize='contain'; el.style.backgroundRepeat='no-repeat'; el.style.backgroundPosition='center';
      el.style.boxShadow='none';
    });
  });
}catch(e){} }
if(typeof document!=='undefined'){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',decoPaint); else decoPaint(); }

const ANIMAL_LETTERS = [
  {animal:'🐓',word:'AYAM',      letter:'A',num:1, hint:'Unggas yang berkokok saat matahari terbit setiap pagi'},
  {animal:'🦆',word:'BEBEK',     letter:'B',num:2, hint:'Unggas gempal yang pandai berenang dan berbunyi kwek-kwek'},
  {animal:'🦎',word:'CICAK',     letter:'C',num:3, hint:'Reptil kecil yang merayap di dinding dan memangsa nyamuk'},
  {animal:'🐑',word:'DOMBA',     letter:'D',num:4, hint:'Hewan berkaki empat berbulu sangat tebal penghasil wol'},
  {animal:'🦅',word:'ELANG',     letter:'E',num:5, hint:'Burung besar bercakar tajam yang terbang paling tinggi di langit'},
  {animal:'🦩',word:'FLAMINGO',  letter:'F',num:6, hint:'Burung cantik berwarna merah muda yang sering berdiri dengan satu kaki'},
  {animal:'🐘',word:'GAJAH',     letter:'G',num:7, hint:'Hewan darat terbesar di dunia, punya belalai panjang dan telinga sangat lebar'},
  {animal:'🐯',word:'HARIMAU',   letter:'H',num:8, hint:'Kucing besar bergaris-garis hitam yang jago berburu di hutan'},
  {animal:'🐟',word:'IKAN',      letter:'I',num:9, hint:'Makhluk bersisik yang hidup di air dan bernapas lewat insang'},
  {animal:'🦒',word:'JERAPAH',   letter:'J',num:10,hint:'Hewan berbintik-bintik coklat dengan leher terpanjang di seluruh dunia'},
  {animal:'🐴',word:'KUDA',      letter:'K',num:11,hint:'Hewan berkaki empat yang bisa berlari sangat kencang dan sering ditunggangi manusia'},
  {animal:'🐬',word:'LUMBA',     letter:'L',num:12,hint:'Mamalia laut yang sangat cerdas dan suka melompat tinggi di lautan'},
  {animal:'🐒',word:'MONYET',    letter:'M',num:13,hint:'Hewan pandai berlengan panjang yang jago melompat dan memanjat pohon'},
  {animal:'🦜',word:'NURI',      letter:'N',num:14,hint:'Burung berwarna-warni cerah yang bisa menirukan suara percakapan manusia'},
  {animal:'🐼',word:'PANDA',     letter:'P',num:16,hint:'Hewan berbulu hitam-putih yang sangat gemar memakan batang bambu'},
  {animal:'🦌',word:'RUSA',      letter:'R',num:17,hint:'Hewan berkaki empat yang jantannya memiliki tanduk bercabang-cabang indah'},
  {animal:'🦁',word:'SINGA',     letter:'S',num:18,hint:'Hewan besar berbulu lebat di sekitar kepala yang dijuluki Raja Hutan'},
  {animal:'🐭',word:'TIKUS',     letter:'T',num:19,hint:'Hewan pengerat kecil berekor panjang yang gemar mencuri makanan'},
  {animal:'🐛',word:'ULAT',      letter:'U',num:20,hint:'Hewan berbadan lunak yang kelak berubah menjadi kupu-kupu indah'},
  {animal:'🦓',word:'ZEBRA',     letter:'Z',num:23,hint:'Kuda bergaris hitam-putih yang berasal dari padang rumput Afrika'},
  {animal:'🦢',word:'ANGSA',     letter:'A',num:2, hint:'Unggas air berleher panjang dan berbulu putih yang berenang anggun di kolam'},
  {animal:'🦏',word:'BADAK',     letter:'B',num:1, hint:'Hewan besar berkulit tebal dengan cula runcing di ujung hidungnya'},
  {animal:'🐊',word:'BUAYA',     letter:'B',num:3, hint:'Reptil besar bermulut lebar dan bergigi tajam yang hidup di sungai'},
  {animal:'🦍',word:'GORILA',    letter:'G',num:2, hint:'Kera raksasa berbulu hitam dan sangat kuat yang tinggal di hutan lebat'},
  {animal:'🐙',word:'GURITA',    letter:'G',num:8, hint:'Hewan laut lunak berlengan delapan yang bisa menyemprotkan tinta hitam'},
  {animal:'🐹',word:'HAMSTER',   letter:'H',num:5, hint:'Hewan pengerat mungil berpipi tembam yang gemar menyimpan makanan di mulut'},
  {animal:'🦎',word:'IGUANA',    letter:'I',num:3, hint:'Reptil besar berduri di punggung yang suka berjemur di bawah sinar matahari'},
  {animal:'🦗',word:'JANGKRIK',  letter:'J',num:7, hint:'Serangga kecil yang mengerik ramai di malam hari dari balik semak'},
  {animal:'🐐',word:'KAMBING',   letter:'K',num:5, hint:'Hewan berkaki empat bertanduk yang suka memakan rumput dan mengembik'},
  {animal:'🐰',word:'KELINCI',   letter:'K',num:4, hint:'Hewan berbulu lembut bertelinga panjang yang melompat-lompat memakan wortel'},
  {animal:'🐞',word:'KEPIK',     letter:'K',num:6, hint:'Kumbang mungil merah berbintik hitam yang dianggap pembawa keberuntungan'},
  {animal:'🐨',word:'KOALA',     letter:'K',num:2, hint:'Hewan berbulu abu-abu yang suka tidur dan memeluk batang pohon eukaliptus'},
  {animal:'🦎',word:'KOMODO',    letter:'K',num:1, hint:'Kadal raksasa berlidah bercabang dari Pulau Komodo yang sangat perkasa'},
  {animal:'🐆',word:'MACAN',     letter:'M',num:4, hint:'Kucing besar berbintik hitam yang pandai memanjat dan bersembunyi'},
  {animal:'🦚',word:'MERAK',     letter:'M',num:3, hint:'Burung yang mekar ekornya menjadi kipas bulu biru-hijau yang menakjubkan'},
  {animal:'🐧',word:'PINGUIN',   letter:'P',num:3, hint:'Burung hitam-putih yang tak bisa terbang tetapi jago berenang di air dingin'},
  {animal:'🐦',word:'PIPIT',     letter:'P',num:9, hint:'Burung mungil coklat yang berkicau ramai di antara padi sawah'},
  {animal:'🐍',word:'SANCA',     letter:'S',num:2, hint:'Ular besar tak berbisa yang melilit dan hidup di hutan tropis Indonesia'},
  {animal:'🐿️',word:'TUPAI',     letter:'T',num:5, hint:'Hewan mungil berekor lebat yang lincah melompat di antara ranting pohon'},
  {animal:'🦭',word:'WALRUS',    letter:'W',num:21,hint:'Mamalia laut besar bertaring panjang yang hidup di kutub utara'},
  {animal:'🦀',word:'YUYU',      letter:'Y',num:22,hint:'Kepiting kecil air tawar yang hidup di sawah dan sungai Indonesia'}
]

const MATCH_PAIRS = [
  {id:'senang',   emoji:'😊',label:'Senang'},
  {id:'sedih',    emoji:'😢',label:'Sedih'},
  {id:'marah',    emoji:'😠',label:'Marah'},
  {id:'takut',    emoji:'😨',label:'Takut'},
  {id:'terkejut', emoji:'😲',label:'Terkejut'},
  {id:'malu',     emoji:'😳',label:'Malu'},
  {id:'bosan',    emoji:'😑',label:'Bosan'},
  {id:'bahagia',  emoji:'🥰',label:'Bahagia'},
  {id:'kesal',    emoji:'😤',label:'Kesal'},
  {id:'kagum',    emoji:'🤩',label:'Kagum'}
]

// Educational match pairs: number-object and letter-word
const MATCH_PAIRS_NUMS = [
  {id:'n1',emoji:'1️⃣',label:'SATU',  emoji2:'🌟',        label2:'1 Bintang', eduTip:'Satu = 1'},
  {id:'n2',emoji:'2️⃣',label:'DUA',   emoji2:'🐘🐘',      label2:'2 Gajah',   eduTip:'Dua = 2'},
  {id:'n3',emoji:'3️⃣',label:'TIGA',  emoji2:'🍎🍎🍎',    label2:'3 Apel',    eduTip:'Tiga = 3'},
  {id:'n4',emoji:'4️⃣',label:'EMPAT', emoji2:'🐸🐸🐸🐸',  label2:'4 Katak',   eduTip:'Empat = 4'},
  {id:'n5',emoji:'5️⃣',label:'LIMA',  emoji2:'🌷🌷🌷🌷🌷',label2:'5 Bunga',   eduTip:'Lima = 5'},
  {id:'n6',emoji:'6️⃣',label:'ENAM',  emoji2:'🐝🐝🐝🐝🐝🐝',label2:'6 Lebah', eduTip:'Enam = 6'},
]
const MATCH_PAIRS_ALPHA = [
  {id:'la',emoji:'A',label:'Huruf A', emoji2:'🐓',label2:'Ayam',   eduTip:'A seperti AYAM'},
  {id:'lb',emoji:'B',label:'Huruf B', emoji2:'🦆',label2:'Bebek',  eduTip:'B seperti BEBEK'},
  {id:'lc',emoji:'C',label:'Huruf C', emoji2:'🦎',label2:'Cicak',  eduTip:'C seperti CICAK'},
  {id:'ld',emoji:'D',label:'Huruf D', emoji2:'🐑',label2:'Domba',  eduTip:'D seperti DOMBA'},
  {id:'le',emoji:'E',label:'Huruf E', emoji2:'🦅',label2:'Elang',  eduTip:'E seperti ELANG'},
  {id:'lg',emoji:'G',label:'Huruf G', emoji2:'🐘',label2:'Gajah',  eduTip:'G seperti GAJAH'},
]

const MATCH_PAIRS_POKE = [
  {id:25, name:'Pikachu',    slug:'pikachu'},
  {id:4,  name:'Charmander', slug:'charmander'},
  {id:7,  name:'Squirtle',   slug:'squirtle'},
  {id:1,  name:'Bulbasaur',  slug:'bulbasaur'},
  {id:39, name:'Jigglypuff', slug:'jigglypuff'},
  {id:52, name:'Meowth',     slug:'meowth'},
  {id:133,name:'Eevee',      slug:'eevee'},
  {id:172,name:'Pichu',      slug:'pichu'},
  {id:94, name:'Gengar',     slug:'gengar'},
  {id:143,name:'Snorlax',    slug:'snorlax'},
  {id:35, name:'Clefairy',   slug:'clefairy'},
  {id:54, name:'Psyduck',    slug:'psyduck'},
]
const MATCH_PAIRS_HEWAN = [
  {id:'hw1',emoji:'🐘',label:'Gajah'},
  {id:'hw2',emoji:'🦁',label:'Singa'},
  {id:'hw3',emoji:'🐯',label:'Harimau'},
  {id:'hw4',emoji:'🦒',label:'Jerapah'},
  {id:'hw5',emoji:'🐬',label:'Lumba-lumba'},
  {id:'hw6',emoji:'🦋',label:'Kupu-kupu'},
  {id:'hw7',emoji:'🐸',label:'Katak'},
  {id:'hw8',emoji:'🦅',label:'Elang'},
  {id:'hw9',emoji:'🐊',label:'Buaya'},
  {id:'hw10',emoji:'🦓',label:'Zebra'},
  {id:'hw11',emoji:'🦊',label:'Rubah'},
  {id:'hw12',emoji:'🐼',label:'Panda'},
]
const MATCH_PAIRS_BUAH = [
  {id:'bu1',emoji:'🍎',label:'Apel'},
  {id:'bu2',emoji:'🍌',label:'Pisang'},
  {id:'bu3',emoji:'🍇',label:'Anggur'},
  {id:'bu4',emoji:'🍓',label:'Stroberi'},
  {id:'bu5',emoji:'🍊',label:'Jeruk'},
  {id:'bu6',emoji:'🍉',label:'Semangka'},
  {id:'bu7',emoji:'🥭',label:'Mangga'},
  {id:'bu8',emoji:'🍍',label:'Nanas'},
  {id:'bu9',emoji:'🥝',label:'Kiwi'},
  {id:'bu10',emoji:'🍑',label:'Persik'},
  {id:'bu11',emoji:'🍒',label:'Ceri'},
  {id:'bu12',emoji:'🍐',label:'Pir'},
]
const MATCH_PAIRS_SAYUR = [
  {id:'sv1',emoji:'🥕',label:'Wortel'},
  {id:'sv2',emoji:'🥦',label:'Brokoli'},
  {id:'sv3',emoji:'🌽',label:'Jagung'},
  {id:'sv4',emoji:'🥬',label:'Selada'},
  {id:'sv5',emoji:'🥒',label:'Timun'},
  {id:'sv6',emoji:'🍆',label:'Terong'},
  {id:'sv7',emoji:'🫑',label:'Paprika'},
  {id:'sv8',emoji:'🧅',label:'Bawang'},
  {id:'sv9',emoji:'🧄',label:'Bawang Putih'},
  {id:'sv10',emoji:'🥔',label:'Kentang'},
  {id:'sv11',emoji:'🌶️',label:'Cabai'},
  {id:'sv12',emoji:'🍄',label:'Jamur'},
]
const MATCH_PAIRS_KENDARAAN = [
  {id:'kd1',emoji:'🚗',label:'Mobil'},
  {id:'kd2',emoji:'🚌',label:'Bus'},
  {id:'kd3',emoji:'🚂',label:'Kereta'},
  {id:'kd4',emoji:'✈️',label:'Pesawat'},
  {id:'kd5',emoji:'🚀',label:'Roket'},
  {id:'kd6',emoji:'🚁',label:'Helikopter'},
  {id:'kd7',emoji:'🚢',label:'Kapal'},
  {id:'kd8',emoji:'🚲',label:'Sepeda'},
  {id:'kd9',emoji:'🏍️',label:'Motor'},
  {id:'kd10',emoji:'🚜',label:'Traktor'},
  {id:'kd11',emoji:'🚒',label:'Pemadam'},
  {id:'kd12',emoji:'🚑',label:'Ambulans'},
]
const MATCH_PAIRS_WARNA = [
  {id:'wr1',emoji:'🔴',label:'Merah'},
  {id:'wr2',emoji:'🟠',label:'Oranye'},
  {id:'wr3',emoji:'🟡',label:'Kuning'},
  {id:'wr4',emoji:'🟢',label:'Hijau'},
  {id:'wr5',emoji:'🔵',label:'Biru'},
  {id:'wr6',emoji:'🟣',label:'Ungu'},
  {id:'wr7',emoji:'⚫',label:'Hitam'},
  {id:'wr8',emoji:'⚪',label:'Putih'},
  {id:'wr9',emoji:'🟤',label:'Coklat'},
  {id:'wr10',emoji:'🩷',label:'Merah Muda'},
  {id:'wr11',emoji:'🩵',label:'Biru Muda'},
  {id:'wr12',emoji:'🟫',label:'Krem'},
]
// warna → crisp CSS swatch (device-consistent, no emoji rendering variance)
const WARNA_HEX = {Merah:'#e8503f',Oranye:'#ff8a3d',Kuning:'#ffcf3f',Hijau:'#4caf50',Biru:'#2f6bd8',Ungu:'#7b53c9',Hitam:'#2b2b2b',Putih:'#ffffff',Coklat:'#8a5a2b','Merah Muda':'#ff8fc0','Biru Muda':'#7ec8ff',Krem:'#f0d9a8'}
const MATCH_PAIRS_BENDA = [
  {id:'bd1',emoji:'📚',label:'Buku'},
  {id:'bd2',emoji:'✏️',label:'Pensil'},
  {id:'bd3',emoji:'🪑',label:'Kursi'},
  {id:'bd4',emoji:'🛏️',label:'Kasur'},
  {id:'bd5',emoji:'🪟',label:'Jendela'},
  {id:'bd6',emoji:'🚪',label:'Pintu'},
  {id:'bd7',emoji:'💡',label:'Lampu'},
  {id:'bd8',emoji:'📱',label:'Ponsel'},
  {id:'bd9',emoji:'⌚',label:'Jam'},
  {id:'bd10',emoji:'🎒',label:'Ransel'},
  {id:'bd11',emoji:'🔑',label:'Kunci'},
  {id:'bd12',emoji:'🪞',label:'Cermin'},
]
const MATCH_PAIRS_PROFESI = [
  {id:'pf1',emoji:'👨‍⚕️',label:'Dokter'},
  {id:'pf2',emoji:'👩‍🏫',label:'Guru'},
  {id:'pf3',emoji:'👮',label:'Polisi'},
  {id:'pf4',emoji:'👨‍🍳',label:'Koki'},
  {id:'pf5',emoji:'🧑‍🚒',label:'Pemadam'},
  {id:'pf6',emoji:'👨‍🔧',label:'Montir'},
  {id:'pf7',emoji:'👩‍💼',label:'Pengusaha'},
  {id:'pf8',emoji:'🧑‍🌾',label:'Petani'},
  {id:'pf9',emoji:'🧑‍✈️',label:'Pilot'},
  {id:'pf10',emoji:'👨‍🎨',label:'Seniman'},
  {id:'pf11',emoji:'🧑‍💻',label:'Programmer'},
  {id:'pf12',emoji:'👩‍⚕️',label:'Perawat'},
]
const MATCH_PAIRS_ALAM = [
  {id:'al1',emoji:'🌋',label:'Gunung Berapi'},
  {id:'al2',emoji:'🏔️',label:'Gunung'},
  {id:'al3',emoji:'🏖️',label:'Pantai'},
  {id:'al4',emoji:'🌊',label:'Ombak'},
  {id:'al5',emoji:'🌴',label:'Pohon Kelapa'},
  {id:'al6',emoji:'🌿',label:'Rumput'},
  {id:'al7',emoji:'🌸',label:'Bunga Sakura'},
  {id:'al8',emoji:'🍄',label:'Jamur'},
  {id:'al9',emoji:'🌵',label:'Kaktus'},
  {id:'al10',emoji:'🪨',label:'Batu'},
  {id:'al11',emoji:'🏞️',label:'Danau'},
  {id:'al12',emoji:'🌁',label:'Kabut'},
]
const MATCH_PAIRS_CUACA = [
  {id:'cw1',emoji:'☀️',label:'Cerah'},
  {id:'cw2',emoji:'🌤️',label:'Berawan'},
  {id:'cw3',emoji:'🌧️',label:'Hujan'},
  {id:'cw4',emoji:'⛈️',label:'Badai'},
  {id:'cw5',emoji:'🌩️',label:'Petir'},
  {id:'cw6',emoji:'🌪️',label:'Tornado'},
  {id:'cw7',emoji:'❄️',label:'Salju'},
  {id:'cw8',emoji:'🌈',label:'Pelangi'},
  {id:'cw9',emoji:'🌬️',label:'Angin'},
  {id:'cw10',emoji:'🌫️',label:'Berkabut'},
  {id:'cw11',emoji:'🌞',label:'Matahari'},
  {id:'cw12',emoji:'🌙',label:'Bulan'},
]
const MATCH_PAIRS_MAKANAN = [
  {id:'mk1',emoji:'🍚',label:'Nasi'},
  {id:'mk2',emoji:'🍜',label:'Mie'},
  {id:'mk3',emoji:'🍞',label:'Roti'},
  {id:'mk4',emoji:'🥩',label:'Daging'},
  {id:'mk5',emoji:'🍣',label:'Sushi'},
  {id:'mk6',emoji:'🍕',label:'Pizza'},
  {id:'mk7',emoji:'🍔',label:'Burger'},
  {id:'mk8',emoji:'🍦',label:'Es Krim'},
  {id:'mk9',emoji:'🍰',label:'Kue'},
  {id:'mk10',emoji:'🥗',label:'Salad'},
  {id:'mk11',emoji:'🍲',label:'Sup'},
  {id:'mk12',emoji:'🥪',label:'Sandwich'},
]
const MATCH_PAIRS_SEKOLAH = [
  {id:'sk1',emoji:'📏',label:'Penggaris'},
  {id:'sk2',emoji:'📐',label:'Segitiga'},
  {id:'sk3',emoji:'📚',label:'Buku'},
  {id:'sk4',emoji:'🎒',label:'Tas Sekolah'},
  {id:'sk5',emoji:'🖍️',label:'Krayon'},
  {id:'sk6',emoji:'🖊️',label:'Pena'},
  {id:'sk7',emoji:'🔬',label:'Mikroskop'},
  {id:'sk8',emoji:'🗺️',label:'Peta'},
  {id:'sk9',emoji:'🧮',label:'Kalkulator'},
  {id:'sk10',emoji:'🎨',label:'Cat'},
  {id:'sk11',emoji:'🧪',label:'Tabung Uji'},
  {id:'sk12',emoji:'📓',label:'Buku Tulis'},
]
const ANIMALS_PICKER = ['🦁','🐰','🐘','🦊','🐸','🐯','🐼','🐨']
const POKEMON_G4 = [
  // Gen 1 starters & popular
  {id:25,name:'Pikachu'},{id:133,name:'Eevee'},{id:4,name:'Charmander'},{id:7,name:'Squirtle'},
  {id:1,name:'Bulbasaur'},{id:39,name:'Jigglypuff'},{id:52,name:'Meowth'},{id:54,name:'Psyduck'},
  {id:129,name:'Magikarp'},{id:143,name:'Snorlax'},{id:35,name:'Clefairy'},{id:172,name:'Pichu'},
  {id:110,name:'Weezing'},{id:94,name:'Gengar'},{id:113,name:'Chansey'},{id:79,name:'Slowpoke'},
  {id:58,name:'Growlithe'},{id:116,name:'Horsea'},{id:81,name:'Magnemite'},{id:120,name:'Staryu'},
  // Gen 1 evolved
  {id:6,name:'Charizard'},{id:9,name:'Blastoise'},{id:3,name:'Venusaur'},{id:150,name:'Mewtwo'},
  {id:151,name:'Mew'},{id:136,name:'Flareon'},{id:134,name:'Vaporeon'},{id:135,name:'Jolteon'},
  {id:196,name:'Espeon'},{id:197,name:'Umbreon'},{id:37,name:'Vulpix'},{id:63,name:'Abra'},
  {id:92,name:'Gastly'},{id:66,name:'Machop'},{id:74,name:'Geodude'},{id:104,name:'Cubone'},
  {id:109,name:'Koffing'},{id:147,name:'Dratini'},{id:123,name:'Scyther'},{id:137,name:'Porygon'},
  // Gen 2
  {id:152,name:'Chikorita'},{id:155,name:'Cyndaquil'},{id:158,name:'Totodile'},{id:175,name:'Togepi'},
  {id:179,name:'Mareep'},{id:183,name:'Marill'},{id:185,name:'Sudowoodo'},{id:190,name:'Aipom'},
  {id:193,name:'Yanma'},{id:194,name:'Wooper'},{id:198,name:'Murkrow'},{id:199,name:'Slowking'},
  {id:200,name:'Misdreavus'},{id:203,name:'Girafarig'},{id:209,name:'Snubbull'},{id:216,name:'Teddiursa'},
  {id:217,name:'Ursaring'},{id:220,name:'Swinub'},{id:225,name:'Delibird'},{id:228,name:'Houndour'},
  // Gen 3
  {id:252,name:'Treecko'},{id:255,name:'Torchic'},{id:258,name:'Mudkip'},{id:261,name:'Poochyena'},
  {id:270,name:'Lotad'},{id:273,name:'Seedot'},{id:276,name:'Taillow'},{id:278,name:'Wingull'},
  {id:280,name:'Ralts'},{id:285,name:'Shroomish'},{id:287,name:'Slakoth'},{id:293,name:'Whismur'},
  {id:296,name:'Makuhita'},{id:298,name:'Azurill'},{id:300,name:'Skitty'},{id:303,name:'Mawile'},
  {id:304,name:'Aron'},{id:307,name:'Meditite'},{id:311,name:'Plusle'},{id:312,name:'Minun'},
  // Gen 4+
  {id:393,name:'Piplup'},{id:390,name:'Chimchar'},{id:387,name:'Turtwig'},{id:399,name:'Bidoof'},
  {id:403,name:'Shinx'},{id:406,name:'Budew'},{id:420,name:'Cherubi'},{id:427,name:'Buneary'},
  {id:431,name:'Glameow'},{id:440,name:'Happiny'},{id:447,name:'Riolu'},{id:453,name:'Croagunk'},
  {id:479,name:'Rotom'},{id:489,name:'Phione'},{id:495,name:'Snivy'},{id:498,name:'Tepig'},
  {id:501,name:'Oshawott'},{id:509,name:'Purrloin'},{id:519,name:'Pidove'},{id:529,name:'Drilbur'}
]
const ALL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

const GAME_META = {
  3:{icon:'🔤',name:'Huruf Hutan'},
  4:{icon:'🔢',name:'Hitung Binatang'},
  6:{icon:'🏎️',name:'Petualangan Mobil',iconImg:'assets/car and vehicle/racecar-icon.svg'},
  7:{icon:'🖼️',name:'Tebak Gambar'},
  8:{icon:'🔡',name:'Susun Kata'},
  9:{icon:'✍️',name:'Jejak Huruf'},
  10:{icon:'⚡',name:'Pertarungan Pokémon'},
  11:{icon:'🔬',name:'Kuis Sains'},
  13:{icon:'🔥',name:'Evolusi Math'},
  14:{icon:'🏁',name:'Balapan Kereta'},
  15:{icon:'🚂',name:'Lokomotif Pemberani',iconImg:'assets/train/linus-casey.webp'},
  16:{icon:'🚂',name:'Selamatkan Kereta!',iconImg:'assets/train/lokomotif-front-blue.svg'},
  17:{icon:'🌉',name:'Jembatan Goyang'},
  18:{icon:'🏛️',name:'Museum Ambarawa'},
  19:{icon:'🐦',name:'Pokemon Birds',iconImg:'assets/Pokemon/pokemondb_hd_alt2/0018_pidgeot.webp'},
  20:{icon:'🏐',name:'Ducky Volley'},
  21:{icon:'🍄',name:'Mario Pokemon',iconImg:'assets/mario-pokemon/sprites/mushroom.webp'},
  22:{icon:'🍬',name:'Monster Candy'},
  23:{icon:'🏃',name:'Pokemon Run',iconImg:'assets/g23-icon.png'},
  24:{icon:'🌊',name:'Bawah Laut'},
  25:{icon:'🧮',name:'Matematika Petualangan'},
  '13c':{icon:'🏅',name:'Gym Pokémon'}
}

// XP & Level system
const LEVEL_TIERS = [
  {min:0,   max:29,  icon:'🥚', name:'Telur'},
  {min:30,  max:79,  icon:'🐣', name:'Cilik'},
  {min:80,  max:149, icon:'🐥', name:'Tumbuh'},
  {min:150, max:249, icon:'🦅', name:'Pintar'},
  {min:250, max:9999,icon:'👑', name:'Jagoan'}
]
// Per-player localStorage key prefix.
// Hotfix 2026-04-28: progress is now keyed by AVATAR (lion/rabbit/...),
// not by slot. Two slots that pick the same animal share progress, per
// user mandate "save progress itu ada di 8 karakter itu". Slot fallback
// is kept for boot-time reads before slot row is rendered.
const AVATAR_SLUGS = {
  '🦁':'lion','🐰':'rabbit','🐘':'elephant','🦊':'fox',
  '🐸':'frog','🐯':'tiger','🐼':'panda','🐨':'koala'
}
function _avatarSlug() {
  try {
    const slot = (window._pSlot && window._pSlot[0]) || 0
    const slots = (typeof getPlayerSlots === 'function') ? getPlayerSlots() : []
    const animal = slots && slots[slot] && slots[slot].animal
    return animal ? (AVATAR_SLUGS[animal] || String(animal)) : null
  } catch (_) { return null }
}
// Canonical slug for a Pokemon party object. Looks up POKEMON_DB by id (always
// correct), falls back to a regex-cleaned name. Fixes special slugs like
// "Mr. Mime" → mr-mime, "Farfetch'd" → farfetchd, "Type: Null" → type-null.
function _pokeSlug(poke) {
  if (!poke) return ''
  if (poke.slug) return poke.slug
  if (typeof POKEMON_DB !== 'undefined' && poke.id != null) {
    const e = POKEMON_DB.find(p => p.id === poke.id)
    if (e && e.slug) return e.slug
  }
  return String(poke.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
function pkey(key) {
  const av = _avatarSlug()
  if (av) return `dunia-avatar-${av}-${key}`
  // Pre-slot-pick boot, or no animal selected yet — fall back to slot key.
  const slot = (window._pSlot && window._pSlot[0]) || 0
  return `dunia-${slot}-${key}`
}
// Migrate old global keys to slot 0 (one-time)
function migrateGlobalKeys() {
  const oldKeys = ['dunia-emosi-xp','dunia-emosi-achievements','dunia-emosi-streak','dunia-progress','dunia-emosi-best-stars']
  const migrated = localStorage.getItem('dunia-migrated-v1')
  if (migrated) return
  for (const k of oldKeys) {
    const val = localStorage.getItem(k)
    if (val !== null) {
      localStorage.setItem(`dunia-0-${k.replace('dunia-emosi-','').replace('dunia-','')}`, val)
      localStorage.removeItem(k)
    }
  }
  localStorage.setItem('dunia-migrated-v1','1')
}
migrateGlobalKeys()

// Hotfix 2026-04-28: migrate slot-keyed progress to avatar-keyed. Per user
// mandate, two slots that pick the same animal must share progress. Old
// dunia-{slot}-* keys are LEFT in place for one release as a rollback safety.
function migrateSlotToAvatar() {
  if (localStorage.getItem('dunia-migrated-v2')) return
  const _slugMap = {
    '🦁':'lion','🐰':'rabbit','🐘':'elephant','🦊':'fox',
    '🐸':'frog','🐯':'tiger','🐼':'panda','🐨':'koala'
  }
  let slots = []
  try { slots = JSON.parse(localStorage.getItem('dunia-players')) || [] } catch (_) {}
  const subkeys = ['progress','xp','achievements','streak','best-stars']
  for (let s = 0; s < slots.length; s++) {
    const slot = slots[s]
    if (!slot || !slot.animal) continue
    const av = _slugMap[slot.animal] || String(slot.animal)
    for (const k of subkeys) {
      const oldKey = `dunia-${s}-${k}`
      const newKey = `dunia-avatar-${av}-${k}`
      const oldVal = localStorage.getItem(oldKey)
      if (oldVal === null) continue
      const newVal = localStorage.getItem(newKey)
      if (newVal === null) {
        localStorage.setItem(newKey, oldVal)
        continue
      }
      // Merge: take the higher star count per game/level; sum xp; union completed.
      try {
        const a = JSON.parse(oldVal)
        const b = JSON.parse(newVal)
        const merged = _mergeProgress(a, b, k)
        localStorage.setItem(newKey, JSON.stringify(merged))
      } catch (_) { /* keep newer if either side malformed */ }
    }
  }
  // Hotfix #115 follow-through: g13c_badges was global pre-#103. Migrate to
  // per-avatar copies so badges follow the active avatar (no cross-avatar
  // bleed-through). Original global key is left in place as a backup.
  try {
    const oldBadges = localStorage.getItem('g13c_badges')
    if (oldBadges) {
      for (const animalEmoji of Object.keys(_slugMap)) {
        const av = _slugMap[animalEmoji]
        const newKey = `dunia-avatar-${av}-g13c_badges`
        if (!localStorage.getItem(newKey)) {
          localStorage.setItem(newKey, oldBadges)
        }
      }
    }
  } catch (_) {}
  localStorage.setItem('dunia-migrated-v2','1')
}
function _mergeProgress(a, b, kind) {
  if (kind === 'xp') {
    const av = typeof a === 'number' ? a : parseInt(a) || 0
    const bv = typeof b === 'number' ? b : parseInt(b) || 0
    return Math.max(av, bv)
  }
  if (kind === 'progress' && a && b && typeof a === 'object' && typeof b === 'object') {
    const out = Object.assign({}, b)
    for (const gk of Object.keys(a)) {
      const ag = a[gk]; const bg = out[gk] || { completed: [], stars: {} }
      if (!ag || typeof ag !== 'object') continue
      bg.completed = Array.from(new Set([...(bg.completed || []), ...(ag.completed || [])]))
      bg.stars = Object.assign({}, bg.stars || {})
      const ast = ag.stars || {}
      for (const lv of Object.keys(ast)) {
        bg.stars[lv] = Math.max(bg.stars[lv] || 0, ast[lv] || 0)
      }
      out[gk] = bg
    }
    return out
  }
  // achievements / streak / best-stars: shallow-take per-key max if numeric, else prefer "newer" (b).
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const out = Object.assign({}, a, b)
    for (const k of Object.keys(a)) {
      if (typeof a[k] === 'number' && typeof b[k] === 'number') out[k] = Math.max(a[k], b[k])
    }
    return out
  }
  return b !== undefined ? b : a
}
migrateSlotToAvatar()

function getXP() {
  try { return parseInt(localStorage.getItem(pkey('xp'))||'0') } catch(e){return 0}
}
function addXP(amount) {
  const prev=getXP(), next=prev+amount
  try { localStorage.setItem(pkey('xp'),next) } catch(e){}
  return {prev, next, leveled: getLevelTier(prev).name !== getLevelTier(next).name}
}
function getLevelTier(xp) {
  return LEVEL_TIERS.find(t=>xp>=t.min&&xp<=t.max)||LEVEL_TIERS[0]
}

const ACHIEVEMENTS = {
  first_star:      {icon:'⭐', name:'Bintang Pertama!',  desc:'Dapatkan bintang pertamamu'},
  ten_stars:       {icon:'🌟', name:'10 Bintang!',       desc:'Kumpulkan 10 bintang total'},
  fifty_stars:     {icon:'🏆', name:'50 Bintang! Legenda!', desc:'Kumpulkan 50 bintang'},
  hundred_stars:   {icon:'💎', name:'100 Bintang! Juara!', desc:'Kumpulkan 100 bintang'},
  letter_master:   {icon:'📚', name:'Master Huruf!',     desc:'Selesaikan Huruf Hutan'},
  count_master:    {icon:'🔢', name:'Master Hitung!',    desc:'Selesaikan Hitung Binatang'},
  driver_master:   {icon:'🚗', name:'Pembalap Handal!',  desc:'Selesaikan Petualangan Mobil', retired:true}, // PRD-58 E9: shown only to a child who already has it
  picture_master:  {icon:'🖼️', name:'Mata Elang!',       desc:'Selesaikan Tebak Gambar'},
  word_master:     {icon:'🔡', name:'Penulis Muda!',     desc:'Selesaikan Susun Kata'},
  trace_master:    {icon:'✍️', name:'Kaligrafer Cilik!', desc:'Selesaikan Jejak Huruf'},
  all_games:       {icon:'🌈', name:'Petualang Sejati!', desc:'Mainkan semua 12 game'},
  streak3:         {icon:'🔥', name:'3 Hari Berturut!',  desc:'Main 3 hari berturut-turut'},
  hard_mode:       {icon:'💪', name:'Berani Sulit!',     desc:'Selesaikan mode Sulit'}
}

// Game 6 word banks
const DRIVE_WORD_BANK = {
  city:   ['BOLA','KUDA','APEL','SAPI','MEJA','KURSI','LAMPU','BUKU','RUMAH','MOBIL','JALAN','TOKO','PASAR','KANTOR','POLISI','DOKTER','SEKOLAH','GEDUNG','BUS','TAKSI','JEMBATAN','KOTA'],
  forest: ['POHON','DAUN','BUNGA','BURUNG','KELINCI','HARIMAU','HUTAN','SUNGAI','BATU','LUMUT','JAMUR','RUSA','BERUANG','RUBAH','KATAK','SEMUT','LEBAH','KUPU','ANGIN','AKAR','RANTING','HEWAN'],
  space:  ['BUMI','MARS','BULAN','BINTANG','PLANET','ROKET','ORBIT','KOMET','GALAKSI','NEBULA','SATELIT','METEOR','ASTRONOT','MATAHARI','VENUS','YUPITER','SATURNUS','URANUS','NEPTUNUS','TELESKOP','ASTEROID','ANGKASA'],
  body:   ['MATA','KAKI','HATI','PARU','GIGI','JANTUNG','OTAK','DARAH','TULANG','OTOT','KULIT','TANGAN','HIDUNG','MULUT','TELINGA','LEHER','PERUT','DADA','BAHU','LUTUT','SIKU','JARI'],
  pantai: ['OMBAK','PASIR','KARANG','IKAN','KEPITING','BINTANG','PERAHU','JALA','LAUT','TERUMBU','CUMI','UDANG','SIPUT','KERANG','PENYU','LUMBA','HIU','PAUS','UBUR','NELAYAN','PANTAI','ANGIN'],
  sekolah:['BUKU','PENSIL','MEJA','KURSI','PAPAN','GURU','MURID','NILAI','UJIAN','KELAS','KANTIN','PERPUS','LAPANGAN','BELAJAR','MENULIS','MEMBACA','BERHITUNG','MENGGAMBAR','PELAJARAN','ISTIRAHAT','TEMAN','PULANG'],
  dapur:  ['NASI','MINYAK','GARAM','GULA','TELUR','AYAM','IKAN','SAYUR','BUAH','PANCI','WAJAN','PISAU','SENDOK','GARPU','PIRING','GELAS','BLENDER','OVEN','KOMPOR','KULKAS','SERBET','MANGKOK'],
  kebun:  ['BUNGA','POHON','DAUN','BUAH','SAYUR','TANAH','AIR','BENIH','CANGKUL','PUPUK','ULAT','KUPU','LEBAH','CACING','SEMUT','MATAHARI','HUJAN','TUMBUH','PANEN','KEBUN','RUMPUT','BENIH']
}
const DRIVE_VEHICLES  = {city:'🚗',forest:'🚗',space:'🚀',body:'🤿',pantai:'⛵',sekolah:'🚌',dapur:'🛺',kebun:'🚜'}
const DRIVE_OBSTACLES = {city:'⛔',forest:'🌵',space:'💥',body:'🦠',pantai:'🪨',sekolah:'🎒',dapur:'🥄',kebun:'🌿'}


// Game 8 word bank (tiered: easy=3-4 letters, medium=5-6, hard=7+)
const WORD_BUILD_BANK = [
  // --- Easy (3-4 huruf) ---
  {word:'AYAM',emoji:'🐓',hint:'Hewan berkokok',tier:'easy'},
  {word:'KUDA',emoji:'🐴',hint:'Hewan berlari cepat',tier:'easy'},
  {word:'IKAN',emoji:'🐟',hint:'Hewan di air',tier:'easy'},
  {word:'BUKU',emoji:'📚',hint:'Untuk baca dan belajar',tier:'easy'},
  {word:'APEL',emoji:'🍎',hint:'Buah berwarna merah',tier:'easy'},
  {word:'BOLA',emoji:'⚽',hint:'Alat bermain yang bulat',tier:'easy'},
  {word:'NASI',emoji:'🍚',hint:'Makanan pokok Indonesia',tier:'easy'},
  {word:'SUSU',emoji:'🥛',hint:'Minuman putih bergizi',tier:'easy'},
  {word:'ROTI',emoji:'🍞',hint:'Makanan dari tepung',tier:'easy'},
  {word:'TOPI',emoji:'🎩',hint:'Dipakai di kepala',tier:'easy'},
  {word:'BAJU',emoji:'👕',hint:'Pakaian yang kita kenakan',tier:'easy'},
  {word:'MADU',emoji:'🍯',hint:'Makanan manis dari lebah',tier:'easy'},
  {word:'BUAH',emoji:'🍓',hint:'Makanan segar dari pohon',tier:'easy'},
  {word:'KOPI',emoji:'☕',hint:'Minuman panas dari biji',tier:'easy'},
  {word:'DADU',emoji:'🎲',hint:'Alat bermain berbentuk kubus',tier:'easy'},
  {word:'BESI',emoji:'🔩',hint:'Logam keras berwarna abu-abu',tier:'easy'},
  {word:'KAYU',emoji:'🪵',hint:'Bahan dari pohon',tier:'easy'},
  {word:'LAGU',emoji:'🎵',hint:'Musik yang dinyanyikan',tier:'easy'},
  {word:'MATA',emoji:'👀',hint:'Digunakan untuk melihat',tier:'easy'},
  {word:'KAKI',emoji:'🦵',hint:'Digunakan untuk berjalan',tier:'easy'},
  // --- Medium (5-6 huruf) ---
  {word:'PANDA',emoji:'🐼',hint:'Hewan hitam putih suka bambu',tier:'medium'},
  {word:'SINGA',emoji:'🦁',hint:'Raja hutan',tier:'medium'},
  {word:'BEBEK',emoji:'🦆',hint:'Hewan suka air bisa terbang',tier:'medium'},
  {word:'GAJAH',emoji:'🐘',hint:'Hewan terbesar di darat',tier:'medium'},
  {word:'BUNGA',emoji:'🌸',hint:'Bagian indah dari tanaman',tier:'medium'},
  {word:'POHON',emoji:'🌳',hint:'Tumbuhan besar berkayu',tier:'medium'},
  {word:'KUCING',emoji:'🐱',hint:'Hewan peliharaan berbunyi meong',tier:'medium'},
  {word:'ANJING',emoji:'🐶',hint:'Hewan peliharaan setia',tier:'medium'},
  {word:'BURUNG',emoji:'🐦',hint:'Hewan bersayap yang terbang',tier:'medium'},
  {word:'PISANG',emoji:'🍌',hint:'Buah kuning berbentuk melengkung',tier:'medium'},
  {word:'JERUK',emoji:'🍊',hint:'Buah berwarna oranye',tier:'medium'},
  {word:'KELINCI',emoji:'🐰',hint:'Hewan berbulu dengan telinga panjang',tier:'medium'},
  {word:'MANGGA',emoji:'🥭',hint:'Buah tropis berwarna kuning',tier:'medium'},
  {word:'KATAK',emoji:'🐸',hint:'Hewan hijau suka melompat',tier:'medium'},
  {word:'SEMUT',emoji:'🐜',hint:'Serangga kecil pekerja keras',tier:'medium'},
  {word:'LEBAH',emoji:'🐝',hint:'Serangga penghasil madu',tier:'medium'},
  {word:'WORTEL',emoji:'🥕',hint:'Sayuran berwarna oranye',tier:'medium'},
  {word:'JAGUNG',emoji:'🌽',hint:'Tanaman pangan biji kuning',tier:'medium'},
  {word:'ANGGUR',emoji:'🍇',hint:'Buah ungu atau hijau bergerombol',tier:'medium'},
  {word:'GITAR',emoji:'🎸',hint:'Alat musik berdawai',tier:'medium'},
  {word:'PAYUNG',emoji:'☂️',hint:'Pelindung dari hujan',tier:'medium'},
  {word:'PIRING',emoji:'🍽️',hint:'Tempat menyajikan makanan',tier:'medium'},
  {word:'SEPATU',emoji:'👟',hint:'Alas kaki',tier:'medium'},
  {word:'HUJAN',emoji:'🌧️',hint:'Air turun dari langit',tier:'medium'},
  {word:'BINTANG',emoji:'⭐',hint:'Benda bercahaya di langit malam',tier:'medium'},
  // --- Hard (7+ huruf) ---
  {word:'HARIMAU',emoji:'🐯',hint:'Hewan bergaris-garis hitam',tier:'hard'},
  {word:'JERAPAH',emoji:'🦒',hint:'Hewan dengan leher sangat panjang',tier:'hard'},
  {word:'MONYET',emoji:'🐒',hint:'Hewan pandai panjat pohon',tier:'hard'},
  {word:'PELANGI',emoji:'🌈',hint:'Warna-warni setelah hujan',tier:'hard'},
  {word:'BERUANG',emoji:'🐻',hint:'Hewan besar suka madu',tier:'hard'},
  {word:'SEMANGKA',emoji:'🍉',hint:'Buah besar berisi merah',tier:'hard'},
  {word:'KOMPUTER',emoji:'💻',hint:'Mesin cerdas untuk bekerja',tier:'hard'},
  {word:'PESAWAT',emoji:'✈️',hint:'Kendaraan yang terbang',tier:'hard'},
  {word:'KERETA',emoji:'🚂',hint:'Kendaraan di rel panjang',tier:'hard'},
  {word:'KELINCI',emoji:'🐰',hint:'Hewan lompat berbulu lembut',tier:'hard'},
  {word:'SEKOLAH',emoji:'🏫',hint:'Tempat belajar dan bermain',tier:'hard'},
  {word:'JEMBATAN',emoji:'🌉',hint:'Penghubung dua tepi sungai',tier:'hard'},
  {word:'PERPUSTAKAAN',emoji:'📚',hint:'Tempat menyimpan buku',tier:'hard'},
  {word:'MATAHARI',emoji:'☀️',hint:'Bintang paling dekat dengan Bumi',tier:'hard'},
  {word:'INDONESIA',emoji:'🇮🇩',hint:'Negara kita tercinta',tier:'hard'},
  {word:'KUPU-KUPU',emoji:'🦋',hint:'Serangga bersayap indah',tier:'hard'},
  {word:'DINOSAURUS',emoji:'🦕',hint:'Hewan purba yang sudah punah',tier:'hard'},
  {word:'PERSAHABATAN',emoji:'🤝',hint:'Rasa kasih antarteman',tier:'hard'},
  {word:'PETUALANGAN',emoji:'🗺️',hint:'Perjalanan seru dan menantang',tier:'hard'},
  {word:'PENGETAHUAN',emoji:'🧠',hint:'Ilmu yang kita pelajari',tier:'hard'},
  // --- Easy additions ---
  {word:'SAPI',emoji:'🐄',hint:'Hewan penghasil susu',tier:'easy'},
  {word:'BABI',emoji:'🐷',hint:'Hewan gemuk berkaki pendek',tier:'easy'},
  {word:'ULAR',emoji:'🐍',hint:'Hewan melata tanpa kaki',tier:'easy'},
  {word:'KURA',emoji:'🐢',hint:'Hewan bercangkang keras',tier:'easy'},
  {word:'DAUN',emoji:'🍃',hint:'Bagian hijau dari pohon',tier:'easy'},
  {word:'AKAR',emoji:'🌱',hint:'Bagian bawah tanaman',tier:'easy'},
  {word:'BIJI',emoji:'🌰',hint:'Cikal bakal tanaman baru',tier:'easy'},
  {word:'TALI',emoji:'🪢',hint:'Dipakai untuk mengikat',tier:'easy'},
  {word:'SAPU',emoji:'🧹',hint:'Alat membersihkan lantai',tier:'easy'},
  {word:'RODA',emoji:'🛞',hint:'Bagian bulat pada kendaraan',tier:'easy'},
  {word:'JARI',emoji:'🖐️',hint:'Bagian dari tangan',tier:'easy'},
  {word:'GIGI',emoji:'🦷',hint:'Bagian mulut untuk mengunyah',tier:'easy'},
  {word:'GULA',emoji:'🍬',hint:'Bahan pemanis makanan',tier:'easy'},
  {word:'BATU',emoji:'🪨',hint:'Benda keras dari alam',tier:'easy'},
  {word:'EMAS',emoji:'🏅',hint:'Logam mulia berwarna kuning',tier:'easy'},
  // TAHU removed: no good emoji (was 🟨 placeholder yellow square — confusing).
  // MEJA removed: emoji 🪑 is officially "chair" — exact bug user reported
  // ("gambar kursi tapi jawaban meja"). No standard Unicode "table" emoji
  // exists; safer to drop than mislead with wrong icon.
  {word:'PENA',emoji:'🖊️',hint:'Alat tulis berisi tinta',tier:'easy'},
  {word:'BIRU',emoji:'💙',hint:'Warna langit dan laut',tier:'easy'},
  {word:'NAGA',emoji:'🐉',hint:'Hewan mitos bernapas api',tier:'easy'},
  {word:'BAYI',emoji:'👶',hint:'Manusia yang baru lahir',tier:'easy'},
  {word:'DUIT',emoji:'💰',hint:'Alat tukar barang',tier:'easy'},
  {word:'KAIN',emoji:'🧵',hint:'Bahan untuk membuat pakaian',tier:'easy'},
  {word:'KACA',emoji:'🪟',hint:'Benda bening dan keras',tier:'easy'},
  {word:'RUSA',emoji:'🦌',hint:'Hewan bertanduk di hutan',tier:'easy'},
  {word:'BULU',emoji:'🪶',hint:'Penutup tubuh burung',tier:'easy'},
  {word:'SAKU',emoji:'👝',hint:'Kantong kecil di baju',tier:'easy'},
  {word:'DURI',emoji:'🌵',hint:'Bagian tajam di tanaman',tier:'easy'},
  {word:'SOFA',emoji:'🛋️',hint:'Kursi empuk panjang',tier:'easy'},
  {word:'TAMU',emoji:'🙋',hint:'Orang yang berkunjung ke rumah',tier:'easy'},
  {word:'CUCI',emoji:'🧼',hint:'Membersihkan dengan air',tier:'easy'},
  {word:'PAGI',emoji:'🌅',hint:'Waktu setelah matahari terbit',tier:'easy'},
  {word:'SORE',emoji:'🌇',hint:'Waktu menjelang senja',tier:'easy'},
  {word:'SIKU',emoji:'💪',hint:'Sendi di tengah lengan',tier:'easy'},
  {word:'JALA',emoji:'🎣',hint:'Alat untuk menangkap ikan',tier:'easy'},
  {word:'API',emoji:'🔥',hint:'Cahaya panas yang menyala',tier:'easy'},
  {word:'TARI',emoji:'💃',hint:'Gerakan tubuh mengikuti irama',tier:'easy'},
  // Lele tidak punya emoji canonical — pakai generic ikan + hint catfish-specific.
  // Image fallback ke img-ikan.webp jika tersedia. Hint diperbaiki agar pas dengan emoji.
  {word:'LELE',emoji:'🐟',hint:'Ikan air tawar berkumis, kulit licin, hitam',tier:'easy'},
  {word:'CUMI',emoji:'🦑',hint:'Hewan laut bertentakel',tier:'easy'},
  // KUTU removed: 🦟 is mosquito (NYAMUK), not lice (KUTU). No louse emoji exists.
  // --- More variety (additions per #150 user feedback) ---
  {word:'KOALA',emoji:'🐨',hint:'Hewan kelabu suka pohon eukaliptus',tier:'easy'},
  {word:'PALU',emoji:'🔨',hint:'Alat untuk memukul paku',tier:'easy'},
  {word:'KUNCI',emoji:'🔑',hint:'Untuk membuka pintu rumah',tier:'easy'},
  {word:'JAM',emoji:'⏰',hint:'Penunjuk waktu',tier:'easy'},
  {word:'PIZZA',emoji:'🍕',hint:'Makanan bulat dari Italia',tier:'easy'},
  {word:'KUE',emoji:'🍰',hint:'Makanan manis untuk ulang tahun',tier:'easy'},
  {word:'TEH',emoji:'🍵',hint:'Minuman dari daun direbus',tier:'easy'},
  {word:'JUS',emoji:'🥤',hint:'Minuman dari sari buah',tier:'easy'},
  {word:'KIPAS',emoji:'🪭',hint:'Alat untuk mengusir panas',tier:'easy'},
  {word:'KAOS',emoji:'👕',hint:'Pakaian atas tanpa kerah',tier:'easy'},
  {word:'TOPI',emoji:'🧢',hint:'Penutup kepala bertepi',tier:'easy'},
  {word:'BORA',emoji:'🌫️',hint:'Awan tebal dekat tanah',tier:'easy'},
  {word:'SAYAP',emoji:'🪽',hint:'Bagian tubuh untuk terbang',tier:'easy'},
  {word:'OBENG',emoji:'🪛',hint:'Alat untuk memutar baut',tier:'easy'},
  {word:'KASUR',emoji:'🛏️',hint:'Tempat tidur yang empuk',tier:'easy'},
  // --- Medium additions ---
  {word:'DOMBA',emoji:'🐑',hint:'Hewan berbulu penghasil wol',tier:'medium'},
  {word:'PENYU',emoji:'🐢',hint:'Kura-kura yang hidup di laut',tier:'medium'},
  {word:'KODOK',emoji:'🐸',hint:'Hewan hijau pelompat',tier:'medium'},
  {word:'ELANG',emoji:'🦅',hint:'Burung pemangsa besar',tier:'medium'},
  {word:'ZEBRA',emoji:'🦓',hint:'Hewan bergaris hitam putih',tier:'medium'},
  {word:'BADAK',emoji:'🦏',hint:'Hewan bercula di hidung',tier:'medium'},
  {word:'TIKUS',emoji:'🐭',hint:'Hewan pengerat kecil',tier:'medium'},
  {word:'RUBAH',emoji:'🦊',hint:'Hewan licik berwarna oranye',tier:'medium'},
  {word:'MACAN',emoji:'🐆',hint:'Hewan berbintik-bintik',tier:'medium'},
  {word:'KERBAU',emoji:'🐃',hint:'Hewan besar membantu membajak sawah',tier:'medium'},
  {word:'MERAH',emoji:'❤️',hint:'Warna darah dan apel',tier:'medium'},
  {word:'HIJAU',emoji:'💚',hint:'Warna pohon dan daun',tier:'medium'},
  {word:'KUNING',emoji:'💛',hint:'Warna pisang dan matahari',tier:'medium'},
  {word:'PUTIH',emoji:'🤍',hint:'Warna salju dan susu',tier:'medium'},
  {word:'HITAM',emoji:'🖤',hint:'Warna gelap tanpa cahaya',tier:'medium'},
  {word:'COKLAT',emoji:'🤎',hint:'Warna tanah dan kayu',tier:'medium'},
  {word:'JINGGA',emoji:'🧡',hint:'Warna antara merah dan kuning',tier:'medium'},
  {word:'HIDUNG',emoji:'👃',hint:'Alat penciuman di wajah',tier:'medium'},
  {word:'BIBIR',emoji:'👄',hint:'Bagian terluar dari mulut',tier:'medium'},
  {word:'KEPALA',emoji:'🧠',hint:'Bagian tubuh paling atas',tier:'medium'},
  {word:'TANGAN',emoji:'🤚',hint:'Bagian tubuh untuk memegang',tier:'medium'},
  {word:'LUTUT',emoji:'🦵',hint:'Sendi di tengah kaki',tier:'medium'},
  {word:'PERUT',emoji:'🫃',hint:'Bagian tubuh tempat makanan',tier:'medium'},
  {word:'MULUT',emoji:'😮',hint:'Alat bicara dan makan',tier:'medium'},
  {word:'RAMBUT',emoji:'💇',hint:'Tumbuh di atas kepala',tier:'medium'},
  {word:'TUBUH',emoji:'🧍',hint:'Seluruh bagian fisik kita',tier:'medium'},
  {word:'TOMAT',emoji:'🍅',hint:'Buah/sayuran berwarna merah bulat',tier:'medium'},
  {word:'TERONG',emoji:'🍆',hint:'Sayuran panjang berwarna ungu',tier:'medium'},
  {word:'TIMUN',emoji:'🥒',hint:'Sayuran panjang hijau berair',tier:'medium'},
  {word:'BAWANG',emoji:'🧅',hint:'Bumbu dapur berbau kuat',tier:'medium'},
  {word:'LOBAK',emoji:'🥬',hint:'Sayuran akar berwarna putih',tier:'medium'},
  {word:'BAYAM',emoji:'🥬',hint:'Sayuran hijau bergizi tinggi',tier:'medium'},
  {word:'PENSIL',emoji:'✏️',hint:'Alat tulis dari kayu',tier:'medium'},
  {word:'KERTAS',emoji:'📄',hint:'Lembaran tipis untuk menulis',tier:'medium'},
  {word:'PULPEN',emoji:'🖊️',hint:'Alat tulis berisi tinta cair',tier:'medium'},
  {word:'KAPAL',emoji:'🚢',hint:'Kendaraan besar di laut',tier:'medium'},
  {word:'MOTOR',emoji:'🛵',hint:'Kendaraan beroda dua bermesin',tier:'medium'},
  {word:'BECAK',emoji:'🛺',hint:'Kendaraan roda tiga bertenaga kayuh',tier:'medium'},
  {word:'RUMAH',emoji:'🏠',hint:'Tempat tinggal keluarga',tier:'medium'},
  {word:'PASAR',emoji:'🏪',hint:'Tempat jual beli barang',tier:'medium'},
  {word:'TAMAN',emoji:'🌿',hint:'Tempat bermain dengan banyak tanaman',tier:'medium'},
  {word:'MASJID',emoji:'🕌',hint:'Tempat ibadah umat Islam',tier:'medium'},
  {word:'MUSEUM',emoji:'🏛️',hint:'Tempat menyimpan benda sejarah',tier:'medium'},
  {word:'KANTOR',emoji:'🏢',hint:'Tempat bekerja',tier:'medium'},
  {word:'DOKTER',emoji:'👨‍⚕️',hint:'Orang yang menyembuhkan penyakit',tier:'medium'},
  {word:'POLISI',emoji:'👮',hint:'Penjaga keamanan dan ketertiban',tier:'medium'},
  {word:'PETANI',emoji:'👨‍🌾',hint:'Orang yang bercocok tanam',tier:'medium'},
  {word:'PILOT',emoji:'👨‍✈️',hint:'Pengemudi pesawat terbang',tier:'medium'},
  {word:'SABUN',emoji:'🧴',hint:'Pembersih berbusa',tier:'medium'},
  {word:'EMBER',emoji:'🪣',hint:'Wadah bulat untuk menampung air',tier:'medium'},
  // --- Hard additions ---
  {word:'KELELAWAR',emoji:'🦇',hint:'Mamalia terbang di malam hari',tier:'hard'},
  {word:'ORANG-UTAN',emoji:'🦧',hint:'Kera besar berambut merah dari Kalimantan',tier:'hard'},
  {word:'MERPATI',emoji:'🕊️',hint:'Burung putih lambang perdamaian',tier:'hard'},
  {word:'LUMBA-LUMBA',emoji:'🐬',hint:'Mamalia laut yang cerdas',tier:'hard'},
  {word:'RAMBUTAN',emoji:'🍈',hint:'Buah berbulu merah rasanya manis',tier:'hard'},
  {word:'ALPUKAT',emoji:'🥑',hint:'Buah hijau berlemak sehat',tier:'hard'},
  {word:'BELIMBING',emoji:'⭐',hint:'Buah berbentuk seperti bintang',tier:'hard'},
  {word:'MANGGIS',emoji:'🍇',hint:'Buah dengan kulit ungu tebal',tier:'hard'},
  {word:'BANDARA',emoji:'✈️',hint:'Tempat pesawat mendarat dan terbang',tier:'hard'},
  {word:'STADION',emoji:'🏟️',hint:'Tempat pertandingan olahraga besar',tier:'hard'},
  {word:'LAPANGAN',emoji:'🏃',hint:'Tempat bermain dan berolahraga',tier:'hard'},
  {word:'PELABUHAN',emoji:'⚓',hint:'Tempat kapal bersandar',tier:'hard'},
  {word:'PELAJAR',emoji:'🎒',hint:'Orang yang sedang belajar di sekolah',tier:'hard'},
  {word:'KARYAWAN',emoji:'💼',hint:'Orang yang bekerja di perusahaan',tier:'hard'},
  {word:'WARTAWAN',emoji:'📰',hint:'Orang yang menulis berita',tier:'hard'},
  {word:'ILMUWAN',emoji:'🔬',hint:'Orang yang melakukan penelitian',tier:'hard'},
  {word:'PEDAGANG',emoji:'🛍️',hint:'Orang yang berjualan barang',tier:'hard'},
  {word:'BERJALAN',emoji:'🚶',hint:'Bergerak dengan kaki perlahan',tier:'hard'},
  {word:'BERLARI',emoji:'🏃',hint:'Bergerak dengan kaki secepat mungkin',tier:'hard'},
  {word:'BERNYANYI',emoji:'🎤',hint:'Mengeluarkan suara berirama',tier:'hard'},
  {word:'BELAJAR',emoji:'📖',hint:'Menuntut ilmu dan pengetahuan',tier:'hard'},
  {word:'BERMAIN',emoji:'🎮',hint:'Bersenang-senang dengan permainan',tier:'hard'},
  {word:'MELUKIS',emoji:'🎨',hint:'Membuat gambar dengan cat',tier:'hard'},
  {word:'MEMASAK',emoji:'👨‍🍳',hint:'Membuat makanan dengan cara dimasak',tier:'hard'},
  {word:'MENULIS',emoji:'✍️',hint:'Membuat tulisan dengan tangan',tier:'hard'},
  {word:'MEMBACA',emoji:'📚',hint:'Melihat dan memahami tulisan',tier:'hard'},
  {word:'MEMBANTU',emoji:'🤝',hint:'Menolong orang yang membutuhkan',tier:'hard'},
  {word:'KELUARGA',emoji:'👨‍👩‍👧‍👦',hint:'Ayah ibu dan anak-anak bersama',tier:'hard'},
  {word:'KEMERDEKAAN',emoji:'🎆',hint:'Kebebasan suatu bangsa dari penjajahan',tier:'hard'},
  {word:'KEBERANIAN',emoji:'🦁',hint:'Sifat tidak takut menghadapi tantangan',tier:'hard'},
  {word:'KEBAIKAN',emoji:'💝',hint:'Sifat suka menolong dan berbagi',tier:'hard'},
  {word:'KEJUJURAN',emoji:'🤞',hint:'Sifat selalu berkata benar',tier:'hard'},
  {word:'BERSYUKUR',emoji:'🙏',hint:'Merasa terima kasih atas semua nikmat',tier:'hard'},
  {word:'PENGALAMAN',emoji:'🗺️',hint:'Hal-hal yang pernah kita lalui',tier:'hard'},
  {word:'PERSATUAN',emoji:'🤜',hint:'Bersatu padu dalam satu tujuan',tier:'hard'},
  {word:'KEHIDUPAN',emoji:'🌱',hint:'Proses tumbuh dan berkembang makhluk hidup',tier:'hard'},
  {word:'PAHLAWAN',emoji:'🦸',hint:'Orang yang berjasa bagi bangsa',tier:'hard'},
  {word:'ASTRONOT',emoji:'👨‍🚀',hint:'Orang yang pergi ke luar angkasa',tier:'hard'},
  {word:'PELAJARAN',emoji:'📝',hint:'Materi yang dipelajari di sekolah',tier:'hard'},
  {word:'PETUALANG',emoji:'🧭',hint:'Orang yang suka menjelajah tempat baru',tier:'hard'},
]

// Game 9 letter guides
const LETTER_GUIDES = {
  'A':[{x:0.5,y:0.05},{x:0.2,y:0.95},{x:0.35,y:0.55},{x:0.65,y:0.55},{x:0.8,y:0.95}],
  'B':[{x:0.2,y:0.05},{x:0.2,y:0.95},{x:0.2,y:0.05},{x:0.65,y:0.15},{x:0.75,y:0.28},{x:0.65,y:0.48},{x:0.2,y:0.48},{x:0.7,y:0.6},{x:0.78,y:0.75},{x:0.65,y:0.9},{x:0.2,y:0.95}],
  'C':[{x:0.75,y:0.2},{x:0.5,y:0.05},{x:0.2,y:0.2},{x:0.1,y:0.5},{x:0.2,y:0.8},{x:0.5,y:0.95},{x:0.75,y:0.8}],
  'D':[{x:0.2,y:0.05},{x:0.2,y:0.95},{x:0.2,y:0.05},{x:0.55,y:0.1},{x:0.78,y:0.3},{x:0.82,y:0.5},{x:0.78,y:0.7},{x:0.55,y:0.9},{x:0.2,y:0.95}],
  'E':[{x:0.75,y:0.05},{x:0.2,y:0.05},{x:0.2,y:0.5},{x:0.65,y:0.5},{x:0.2,y:0.5},{x:0.2,y:0.95},{x:0.75,y:0.95}],
  'F':[{x:0.75,y:0.05},{x:0.2,y:0.05},{x:0.2,y:0.5},{x:0.65,y:0.5},{x:0.2,y:0.5},{x:0.2,y:0.95}],
  'G':[{x:0.75,y:0.2},{x:0.5,y:0.05},{x:0.2,y:0.2},{x:0.1,y:0.5},{x:0.2,y:0.8},{x:0.5,y:0.95},{x:0.8,y:0.8},{x:0.8,y:0.5},{x:0.55,y:0.5}],
  'H':[{x:0.2,y:0.05},{x:0.2,y:0.95},{x:0.2,y:0.5},{x:0.8,y:0.5},{x:0.8,y:0.05},{x:0.8,y:0.95}],
  'I':[{x:0.2,y:0.05},{x:0.8,y:0.05},{x:0.5,y:0.05},{x:0.5,y:0.95},{x:0.2,y:0.95},{x:0.8,y:0.95}],
  'J':[{x:0.2,y:0.05},{x:0.8,y:0.05},{x:0.65,y:0.05},{x:0.65,y:0.75},{x:0.5,y:0.9},{x:0.35,y:0.85},{x:0.25,y:0.75}],
  'K':[{x:0.2,y:0.05},{x:0.2,y:0.95},{x:0.2,y:0.5},{x:0.75,y:0.05},{x:0.2,y:0.5},{x:0.75,y:0.95}],
  'L':[{x:0.2,y:0.05},{x:0.2,y:0.95},{x:0.75,y:0.95}],
  'M':[{x:0.1,y:0.95},{x:0.1,y:0.05},{x:0.5,y:0.5},{x:0.9,y:0.05},{x:0.9,y:0.95}],
  'N':[{x:0.1,y:0.95},{x:0.1,y:0.05},{x:0.9,y:0.95},{x:0.9,y:0.05}],
  'O':[{x:0.5,y:0.05},{x:0.2,y:0.2},{x:0.1,y:0.5},{x:0.2,y:0.8},{x:0.5,y:0.95},{x:0.8,y:0.8},{x:0.9,y:0.5},{x:0.8,y:0.2},{x:0.5,y:0.05}],
  'P':[{x:0.2,y:0.95},{x:0.2,y:0.05},{x:0.65,y:0.1},{x:0.78,y:0.22},{x:0.78,y:0.4},{x:0.65,y:0.52},{x:0.2,y:0.52}],
  'Q':[{x:0.5,y:0.05},{x:0.2,y:0.2},{x:0.1,y:0.5},{x:0.2,y:0.8},{x:0.5,y:0.95},{x:0.8,y:0.8},{x:0.9,y:0.5},{x:0.8,y:0.2},{x:0.5,y:0.05},{x:0.6,y:0.7},{x:0.85,y:0.95}],
  'R':[{x:0.2,y:0.95},{x:0.2,y:0.05},{x:0.65,y:0.1},{x:0.78,y:0.22},{x:0.78,y:0.4},{x:0.65,y:0.52},{x:0.2,y:0.52},{x:0.75,y:0.95}],
  'S':[{x:0.75,y:0.15},{x:0.5,y:0.05},{x:0.25,y:0.15},{x:0.2,y:0.35},{x:0.5,y:0.5},{x:0.8,y:0.65},{x:0.75,y:0.85},{x:0.5,y:0.95},{x:0.25,y:0.85}],
  'T':[{x:0.1,y:0.05},{x:0.9,y:0.05},{x:0.5,y:0.05},{x:0.5,y:0.95}],
  'U':[{x:0.1,y:0.05},{x:0.1,y:0.75},{x:0.25,y:0.9},{x:0.5,y:0.95},{x:0.75,y:0.9},{x:0.9,y:0.75},{x:0.9,y:0.05}],
  'V':[{x:0.1,y:0.05},{x:0.5,y:0.95},{x:0.9,y:0.05}],
  'W':[{x:0.05,y:0.05},{x:0.25,y:0.95},{x:0.5,y:0.5},{x:0.75,y:0.95},{x:0.95,y:0.05}],
  'X':[{x:0.1,y:0.05},{x:0.9,y:0.95},{x:0.5,y:0.5},{x:0.1,y:0.95},{x:0.9,y:0.05}],
  'Y':[{x:0.1,y:0.05},{x:0.5,y:0.5},{x:0.9,y:0.05},{x:0.5,y:0.5},{x:0.5,y:0.95}],
  'Z':[{x:0.1,y:0.05},{x:0.9,y:0.05},{x:0.1,y:0.95},{x:0.9,y:0.95}]
}
const LETTER_SEQ_PINTAR = Object.keys(LETTER_GUIDES)

// A-339 P5 — Jejak Huruf WORD mode (level > 20): trace whole simple Indonesian kid
// words instead of single letters. Short (3-4 letters), all uppercase, letters that
// exist in LETTER_GUIDES. Owner: "di level diatas 20 bukan huruf tapi kata."
const WORD_LIST_G9 = [
  'IBU','API','SAPI','BOLA','MEJA','KAKI','MATA','BAJU','SUSU','BUKU',
  'KUDA','NASI','TOPI','ROTI','GIGI','DADU','PAGI','JARI','DUKU','SORE',
  'AYAM','BEBEK','GAJAH','KUCING','RUMAH','BUNGA','MOBIL','PISANG','APEL','DAUN',
  'AIR','RODA','PENA','KURSI','LAMPU','PINTU','SENDOK','GARPU','PIRING','GELAS',
  'KEBUN','SAWAH','LAUT','GUNUNG','AWAN','HUJAN','BULAN','MADU','TELUR','KEJU',
  'ADIK','KAKAK','NENEK','PAMAN','TEMAN','ANGSA','ULAR','SEMUT','MANGGA','JAMBU'
]
// Build a whole-word trace layout: each letter's normalized guide dots are packed
// into its own horizontal slot (i/L .. (i+1)/L) so the dots line up letter-by-letter
// across a wide canvas; the ghost glyph for each letter is filled into that same slot.
function g9BuildWordLayout (word) {
  const L = Math.max(1, word.length)
  const my = 0.10          // vertical margin (top/bottom)
  const px = 0.16          // horizontal padding inside each letter slot
  const letters = [], all = []
  for (let i = 0; i < L; i++) {
    const ch = word[i]
    const base = LETTER_GUIDES[ch] || LETTER_GUIDES['I']
    const g2 = base.map(g => ({
      x: (i + px + g.x * (1 - 2 * px)) / L,
      y: my + g.y * (1 - 2 * my)
    }))
    letters.push({ ch, guides: g2 })
    for (const g of g2) all.push(g)
  }
  return { letters, guides: all }
}
// Fill one ghost glyph into the bbox implied by its (already-positioned) guide dots.
// W,H = canvas pixel dims (word canvas is wide, single-letter is square).
function g9FillGlyph (ctx, ch, guides, W, H) {
  let minX = 0.12, maxX = 0.88, minY = 0.06, maxY = 0.94
  if (guides && guides.length) {
    minX = 1; maxX = 0; minY = 1; maxY = 0
    guides.forEach(g => { minX = Math.min(minX, g.x); maxX = Math.max(maxX, g.x); minY = Math.min(minY, g.y); maxY = Math.max(maxY, g.y) })
  }
  const bboxW = Math.max(0.001, (maxX - minX)) * W, bboxH = Math.max(0.001, (maxY - minY)) * H
  // PRD-58 C9: lowercase glyphs are fitted by their own ink box (games/hub/g9-huruf-kecil.js)
  if (ch !== ch.toUpperCase() && typeof g9FillGlyphKecil === 'function') return g9FillGlyphKecil(ctx, ch, minX, maxX, maxY, bboxH, W, H)
  let fontSize = bboxH / 0.72
  ctx.font = `bold ${Math.round(fontSize)}px Nunito`
  const w = ctx.measureText(ch).width || bboxW
  const maxW = Math.min(W * 0.92, bboxW * 1.6)
  if (w > maxW) { fontSize *= maxW / w; ctx.font = `bold ${Math.round(fontSize)}px Nunito` }
  ctx.fillStyle = 'rgba(132,204,22,0.14)'
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
  ctx.fillText(ch, (minX + maxX) / 2 * W, maxY * H)
}

// Game 9 number guides (digit dot paths)
const ANGKA_GUIDES = {
  '0':[{x:0.5,y:0.05},{x:0.2,y:0.2},{x:0.1,y:0.5},{x:0.2,y:0.8},{x:0.5,y:0.95},{x:0.8,y:0.8},{x:0.9,y:0.5},{x:0.8,y:0.2},{x:0.5,y:0.05}],
  '1':[{x:0.3,y:0.2},{x:0.5,y:0.05},{x:0.5,y:0.95},{x:0.2,y:0.95},{x:0.8,y:0.95}],
  '2':[{x:0.2,y:0.2},{x:0.4,y:0.05},{x:0.7,y:0.1},{x:0.8,y:0.3},{x:0.5,y:0.55},{x:0.2,y:0.75},{x:0.15,y:0.95},{x:0.85,y:0.95}],
  '3':[{x:0.2,y:0.1},{x:0.6,y:0.05},{x:0.85,y:0.25},{x:0.6,y:0.48},{x:0.35,y:0.5},{x:0.65,y:0.52},{x:0.88,y:0.75},{x:0.65,y:0.95},{x:0.2,y:0.9}],
  '4':[{x:0.7,y:0.95},{x:0.7,y:0.05},{x:0.15,y:0.65},{x:0.85,y:0.65}],
  '5':[{x:0.8,y:0.05},{x:0.2,y:0.05},{x:0.2,y:0.5},{x:0.65,y:0.48},{x:0.85,y:0.65},{x:0.75,y:0.9},{x:0.4,y:0.95},{x:0.2,y:0.85}],
  '6':[{x:0.75,y:0.15},{x:0.5,y:0.05},{x:0.2,y:0.2},{x:0.1,y:0.5},{x:0.15,y:0.75},{x:0.4,y:0.95},{x:0.7,y:0.9},{x:0.85,y:0.7},{x:0.8,y:0.52},{x:0.55,y:0.48},{x:0.2,y:0.5}],
  '7':[{x:0.15,y:0.05},{x:0.85,y:0.05},{x:0.5,y:0.95}],
  '8':[{x:0.5,y:0.05},{x:0.2,y:0.2},{x:0.2,y:0.45},{x:0.5,y:0.5},{x:0.8,y:0.55},{x:0.8,y:0.8},{x:0.5,y:0.95},{x:0.2,y:0.8},{x:0.2,y:0.55},{x:0.5,y:0.5},{x:0.8,y:0.45},{x:0.8,y:0.2},{x:0.5,y:0.05}],
  '9':[{x:0.8,y:0.5},{x:0.5,y:0.48},{x:0.2,y:0.3},{x:0.25,y:0.1},{x:0.5,y:0.05},{x:0.78,y:0.15},{x:0.88,y:0.35},{x:0.85,y:0.5},{x:0.8,y:0.7},{x:0.6,y:0.9},{x:0.4,y:0.95}]
}
const LETTER_SEQ_ANGKA = ['0','1','2','3','4','5','6','7','8','9']

// ================================================================
// STATE
// ================================================================
const state = {
  mode: 'solo',
  players: [
    {name:'Pemain 1',animal:'🦁',stars:0,ageTier:'tumbuh'},
    {name:'Pemain 2',animal:'🐰',stars:0,ageTier:'tumbuh'}
  ],
  currentPlayer: 0,
  currentGame: null,
  selectedLevel: 'medium',
  selectedLevelNum: 1,
  gameStars: [0,0],
  breatheInterval: null,
  g4Timer: null,
  unlockedAchievements: {},
  paused: false
}

// Age tier helpers
function setAge(playerIdx, tier, btn) {
  state.players[playerIdx].ageTier = tier
  const container = document.getElementById('p' + (playerIdx+1) + '-age')
  container.querySelectorAll('.age-btn').forEach(b => b.classList.remove('active'))
  btn.classList.add('active')
  playClick()
}
function getAgeLetters(tier) {
  if (tier==='cilik')  return ANIMAL_LETTERS.slice(0,6)
  if (tier==='tumbuh') return ANIMAL_LETTERS.slice(0,14)
  return ANIMAL_LETTERS
}

// ── Shared no-repeat "shuffle bag" (owner: questions must be varied, minim pengulangan) ──
// Draws items so ALL are used once before ANY repeats, persists across levels within a
// session, and never returns the same item twice in a row on reshuffle. Key groups a bag
// (e.g. 'g3', 'g8', 'g1'). pickBag returns one item; drawBag returns N distinct items.
const _qbags = {}
function _shuffledCopy(arr){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const t=a[i];a[i]=a[j];a[j]=t;} return a }
function pickBag(key, arr){
  if(!arr || !arr.length) return null
  let b=_qbags[key]
  if(!b || b.sig!==arr.length){ b=_qbags[key]={queue:_shuffledCopy(arr), last:null, sig:arr.length} }
  if(!b.queue.length){ b.queue=_shuffledCopy(arr); if(b.queue.length>1 && b.queue[0]===b.last){ b.queue.push(b.queue.shift()) } }
  const it=b.queue.shift(); b.last=it; return it
}
function drawBag(key, arr, n){ const out=[]; const seen=[]; let guard=0
  while(out.length<n && guard++<n*6){ const it=pickBag(key,arr); if(seen.indexOf(it)===-1){ seen.push(it); out.push(it) } }
  return out
}
function getAgeMaxCount(tier) {
  if (tier==='cilik')  return 5
  if (tier==='tumbuh') return 10
  return 15
}
function getAgeWordBank(map, tier) {
  const bank = DRIVE_WORD_BANK[map]
  if (tier==='cilik')  return bank.filter(w=>w.length<=4)
  if (tier==='tumbuh') return bank.filter(w=>w.length<=6)
  return bank
}

// ================================================================
// INIT WORLDS
// ================================================================
function initFloatingStars() {
  const container = document.getElementById('floating-stars')
  if (!container) return
  const icons = ['⭐','🌟','✨','💫','🌈','🎈','🎉','🎊','🌸','🍀']
  for (let i=0;i<18;i++) {
    const star = document.createElement('span')
    star.className = 'fstar'
    star.textContent = icons[Math.floor(Math.random()*icons.length)]
    star.style.cssText = `left:${Math.random()*100}vw;animation-duration:${5+Math.random()*8}s;animation-delay:${Math.random()*8}s;font-size:${14+Math.random()*18}px;`
    container.appendChild(star)
  }
}
function initJungleWorld() {
  const c = document.getElementById('world-jungle'); if(!c)return; c.innerHTML=''
  const letters='ABCDEFGHIJKLMNOP'.split('')
  for(let i=0;i<5;i++){const s=document.createElement('span');s.className='jungle-letter';s.textContent=letters[Math.floor(Math.random()*letters.length)];s.style.cssText=`left:${10+i*18}%;top:${10+Math.random()*50}%;animation-duration:${4+Math.random()*4}s;animation-delay:${Math.random()*3}s;`;c.appendChild(s)}
  for(let i=0;i<6;i++){const f=document.createElement('div');f.className='firefly';f.style.cssText=`left:${Math.random()*90}%;top:${Math.random()*80}%;animation-duration:${1.5+Math.random()*2}s;animation-delay:${Math.random()*2}s;`;c.appendChild(f)}
}
function initSavannaWorld() {
  const c=document.querySelector('.world-savanna'); if(!c)return
  c.querySelectorAll('.shimmer-dot').forEach(e=>e.remove())
  for(let i=0;i<8;i++){const d=document.createElement('div');d.className='shimmer-dot';d.style.cssText=`left:${Math.random()*90}%;top:${30+Math.random()*40}%;animation-duration:${1+Math.random()*2}s;animation-delay:${Math.random()*2}s;`;c.appendChild(d)}
}

// ================================================================
// SCREEN NAV
// ================================================================
// Music screens — play on landing, menu, and level select
const MUSIC_SCREENS = new Set(['screen-welcome','screen-menu','screen-level','screen-mode','screen-names'])

let _allScreensCache = null
function showScreen(id) {
  if (!_allScreensCache) _allScreensCache = Array.from(document.querySelectorAll('.screen'))
  _allScreensCache.forEach(s=>s.classList.remove('active'))
  const el = document.getElementById(id)
  if (!el) return // standalone game screens don't have a div
  el.classList.add('active')
  // Always ensure overlays are hidden on screen change
  const po=document.getElementById('pause-overlay')
  const so=document.getElementById('settings-overlay')
  if(po) po.style.display='none'
  if(so) so.style.display='none'
  window.scrollTo(0,0)
  const screenEl = document.getElementById(id)
  if (screenEl) screenEl.scrollTop = 0
  // Welcome screen effects
  if (id === 'screen-welcome') {
    initWelcomeParticles()
    refreshWelcomeBadges()
  }
  // The landing "PILIH GAME" button opens the map without buildMenuHeader(), so
  // after returning from a standalone game the node stars would stay blank.
  if (id === 'screen-menu') renderWorldMapStars()
  // once a day per child: "Hari ini kamu merasa apa?" (games/data/feeling-checkin.js)
  // otherwise, after three wrong answers in a row: "Mau tarik napas dulu?" (games/data/breathe.js), once a day
  if (id === 'screen-menu') setTimeout(function () { try { if (!el.classList.contains('active')) return; const asked = window.DuniaFeeling && window.DuniaFeeling.maybeAsk(); if (!asked && window.DuniaBreath) window.DuniaBreath.maybeOffer() } catch (_) {} }, 700)
  // Backsound: play on menu/landing screens, pause during gameplay
  bgMusicToggle(MUSIC_SCREENS.has(id))
}

// ================================================================
// LEVEL PROGRESSION SYSTEM — 20 levels per game
// ================================================================

// Game metadata with educational descriptions
const GAME_INFO = {
  3:  { desc:'Pelajari huruf A-Z dengan cara yang seru bersama hewan-hewan hutan!', grad:'rgba(20,184,166,0.35)', glow:'rgba(20,184,166,0.5)' },
  4:  { desc:'Belajar berhitung 1-20 dengan memilih jumlah binatang yang tepat!', grad:'rgba(245,158,11,0.35)', glow:'rgba(245,158,11,0.5)' },
  6:  { desc:'Balap mobil sambil kumpulkan huruf untuk menyusun kata di jalan!', grad:'rgba(14,165,233,0.35)', glow:'rgba(14,165,233,0.5)' },
  7:  { desc:'Lihat gambar dan pilih kata yang tepat — atau sebaliknya!', grad:'rgba(45,212,191,0.35)', glow:'rgba(45,212,191,0.5)' },
  8:  { desc:'Susun huruf-huruf acak menjadi kata yang benar dari gambar!', grad:'rgba(244,63,94,0.35)', glow:'rgba(244,63,94,0.5)' },
  9:  { desc:'Ikuti titik panduan untuk melatih menulis huruf dengan benar!', grad:'rgba(132,204,22,0.35)', glow:'rgba(132,204,22,0.5)' },
  10: { desc:'Kalahkan Pokemon musuh dengan menjawab soal matematika!', grad:'rgba(255,203,5,0.35)', glow:'rgba(255,203,5,0.5)' },
  11: { desc:'Uji pengetahuan sains — tumbuhan, hewan, dan alam semesta!', grad:'rgba(56,189,248,0.35)', glow:'rgba(56,189,248,0.5)' },
  13: { desc:'Kalahkan wild Pokemon dengan menjawab soal matematika — dan evolusi!', grad:'rgba(249,115,22,0.35)', glow:'rgba(249,115,22,0.5)' },
  14: { desc:'Balapan kereta seru! Pilih jalur yang tepat dan jawab soal untuk menang!', grad:'rgba(59,130,246,0.35)', glow:'rgba(59,130,246,0.5)' },
  15: { desc:'Kumpulkan huruf yang beterbangan untuk melatih membaca bersama kereta!', grad:'rgba(16,185,129,0.35)', glow:'rgba(16,185,129,0.5)' },
  16: { desc:'Selamatkan kereta dari rintangan dengan menjawab soal matematika!', grad:'rgba(245,158,11,0.35)', glow:'rgba(245,158,11,0.5)' },
  17: { desc:'Seimbangkan kereta di jembatan goyang sambil menjawab soal!', grad:'rgba(139,92,246,0.35)', glow:'rgba(139,92,246,0.5)' },
  18: { desc:'Jelajahi Museum Kereta Ambarawa dan pelajari sejarah kereta Indonesia!', grad:'rgba(120,113,108,0.35)', glow:'rgba(120,113,108,0.5)' },
  19: { desc:'Terbangkan Pidgeot melewati rintangan dan jawab soal untuk menang!', grad:'rgba(139,92,246,0.35)', glow:'rgba(139,92,246,0.5)' },
  20: { desc:'Main voli pantai dengan bebek lucu! Kalahkan lawan dan jawab soal!', grad:'rgba(56,189,248,0.35)', glow:'rgba(56,189,248,0.5)' },
  21: { desc:'Petualangan Pikachu ala Mario! Lompat, kumpulkan koin, kalahkan musuh, jawab matematika!', grad:'rgba(232,38,42,0.35)', glow:'rgba(251,191,36,0.55)' },
  22: { desc:'Tangkap permen jatuh dan jawab soal untuk skor tinggi!', grad:'rgba(139,92,246,0.35)', glow:'rgba(139,92,246,0.5)' },
  23: { desc:'Lari, lompat, hindari rintangan, dan jawab soal bersama Pokemon favoritmu!', grad:'rgba(239,68,68,0.35)', glow:'rgba(239,68,68,0.5)' },
  24: { desc:'Selami lautan bersama Pokemon air! Hindari stalaktit dan stalagmit gua laut.', grad:'rgba(0,119,182,0.35)', glow:'rgba(0,180,216,0.5)' }
}

// ── Retired games ────────────────────────────────────────────────────────────
// 2026-09-20: games 1 (Aku Merasa), 2 (Napas Pelangi), 5 (Cocokkan Emosi) and
// 12 (Tebak Bayangan) were removed while their replacement mechanics are built.
// Their saved rows survive in three stores keyed by game id, where they would go
// on inflating star totals and the played-games tally for a game the child can no
// longer open. This prunes all three.
//
// It runs on every profile load rather than once behind a flag, because cloud
// sync merges a remote copy of `progress` back in after boot and could otherwise
// reintroduce the rows. It writes only when something actually changed.
//
// Achievements are deliberately NOT touched: a badge a child already earned stays
// earned, even though the game behind it is gone.
const RETIRED_GAMES = [1, 2, 5, 12]
function pruneRetiredGameSaves() {
  let pruned = 0
  try {
    const prog = loadProgress()
    let progChanged = false
    for (const n of RETIRED_GAMES) {
      if (prog['g' + n] !== undefined) { delete prog['g' + n]; progChanged = true; pruned++ }
    }
    if (progChanged) saveProgress(prog)
  } catch (_) {}
  try {
    const bs = JSON.parse(localStorage.getItem(pkey('best-stars')) || '{}')
    let bsChanged = false
    for (const n of RETIRED_GAMES) {
      if (bs[n] !== undefined) { delete bs[n]; bsChanged = true; pruned++ }
    }
    if (bsChanged) localStorage.setItem(pkey('best-stars'), JSON.stringify(bs))
  } catch (_) {}
  try {
    const played = JSON.parse(localStorage.getItem('dunia-emosi-played-games') || '{}')
    let playedChanged = false
    for (const n of RETIRED_GAMES) {
      if (played[n] !== undefined) { delete played[n]; playedChanged = true; pruned++ }
    }
    if (playedChanged) localStorage.setItem('dunia-emosi-played-games', JSON.stringify(played))
  } catch (_) {}
  if (pruned) console.debug('[retired] pruned', pruned, 'saved rows for games', RETIRED_GAMES.join(', '))
  return pruned
}

// Progress storage
function loadProgress() {
  try { return JSON.parse(localStorage.getItem(pkey('progress')) || '{}') }
  catch(e) { return {} }
}
function saveProgress(prog) {
  try {
    localStorage.setItem(pkey('progress'), JSON.stringify(prog))
    // Async cloud sync — fire-and-forget, never blocks game
    if (typeof window !== 'undefined' && window.cloudSync) {
      const av = _avatarSlug()
      if (av) {
        const xp = parseInt(localStorage.getItem(pkey('xp')) || '0')
        window.cloudSync.save(av, prog, xp)
      }
    }
  } catch(e) {}
}
// Pull shared progress from cloud and merge into localStorage.
// Called once after avatar is chosen (non-blocking).
async function _syncFromCloud() {
  try {
    if (typeof window === 'undefined' || !window.cloudSync) return
    const av = _avatarSlug()
    if (!av) return
    const local = loadProgress()
    const merged = await window.cloudSync.load(av, local)
    if (merged) {
      localStorage.setItem(pkey('progress'), JSON.stringify(merged))
    }
  } catch (_) {}
}
// Kodok (frog) avatar starter preset: ~25% of cities pre-completed in each
// region for G10/G13/G13B, giving frog players a head start. G13C handled
// separately in games/gym-pokemon.html (different storage system).
// One-time per avatar via 'dunia-frog-seeded-v2' flag.
function _seedKodokProgress() {
  try {
    if (_avatarSlug() !== 'frog') return
    if (localStorage.getItem('dunia-frog-seeded-v2') === '1') return
    if (typeof CITY_PACK === 'undefined') return
    const prog = loadProgress()
    for (const gameKey of ['g10', 'g13', 'g13b']) {
      if (!prog[gameKey]) prog[gameKey] = { completed: [], stars: {}, cities: {} }
      if (!prog[gameKey].cities) prog[gameKey].cities = {}
      for (const regionId of Object.keys(CITY_PACK)) {
        const cities = CITY_PACK[regionId].cities || []
        const seedCount = Math.max(1, Math.floor(cities.length * 0.25))
        const region = prog[gameKey].cities[regionId] || { completed: [], stars: {} }
        for (let i = 0; i < seedCount && i < cities.length; i++) {
          const slug = cities[i].slug
          if (!region.completed.includes(slug)) region.completed.push(slug)
          if (!region.stars[slug] || region.stars[slug] < 3) region.stars[slug] = 3
        }
        prog[gameKey].cities[regionId] = region
      }
    }
    saveProgress(prog)
    localStorage.setItem('dunia-frog-seeded-v2', '1')
  } catch (_) {}
}
// Hotfix #120-M: Slot-7 + Kodok unlock — all G13B/G13C levels + all Kanto badges
// Trigger: active slot index === 6 (UI "Slot 7") AND avatar === frog
// v3: reads localStorage directly (like save-engine.js) to avoid window._pSlot timing issues
function _applyKodokSlot7Unlock() {
  try {
    // Read slot/avatar directly from localStorage — avoids window._pSlot timing issues
    const aSlot = JSON.parse(localStorage.getItem('dunia-active-slot') || '[0,1]')
    const slotIdx = (Array.isArray(aSlot) ? parseInt(aSlot[0]) : 0) || 0
    if (slotIdx !== 6) return
    const slots = JSON.parse(localStorage.getItem('dunia-players') || '[]')
    const animal = slots && slots[slotIdx] && slots[slotIdx].animal
    const av = animal ? (AVATAR_SLUGS[animal] || String(animal)) : null
    if (av !== 'frog') return
    // v6 = Kanto 100% + every other region 70% rounded to nearest, over the FULL
    // gym roster = 79/105 (75%). v4 (27 trainers) and v5 (72, shipped earlier on
    // 2026-09-27) are NOT reasons to skip — those players must be topped up — so
    // only v6 short-circuits.
    if (localStorage.getItem('dunia-kodok-slot7-v6') === '1') return

    const prog = loadProgress()

    // Unlock all G13B levels (1-30, 5 stars each)
    if (!prog['g13b']) prog['g13b'] = { completed: [], stars: {}, cities: {} }
    for (let lv = 1; lv <= 30; lv++) {
      if (!prog['g13b'].completed.includes(lv)) prog['g13b'].completed.push(lv)
      prog['g13b'].stars[lv] = 5
    }

    // Unlock all G13C levels (phonics gym — treated as 1 level)
    if (!prog['g13c']) prog['g13c'] = { completed: [], stars: {} }
    if (!prog['g13c'].completed.includes(1)) prog['g13c'].completed.push(1)
    prog['g13c'].stars[1] = 5

    saveProgress(prog)

    // G13C badge preset: Kanto 100% + every other region 70%, ROUNDED to the
    // nearest trainer → 79 of 105 = 75%, the figure the owner chose. (Rounding
    // DOWN gave 72 = 68.6%; rounding UP would give 82 = 78%.)
    //
    // v61.10 (2026-09-27) — the egg had quietly shrunk to 25.7%. This map is a
    // HAND-KEPT copy of games/gym-pokemon.html's TRAINERS, written when the gym
    // had 77 trainers; Alola, Paldea, Hisui and Orange (28 more) were added to
    // the gym later and never here, so they were never unlocked, and the ratio
    // was 25%. Measured before the fix: 27 of 105. Owner: "savenya langsung
    // terbuka banyak", ~70%. tools/qa-kodok-slot7.mjs now fails if this copy
    // drifts from the live roster again.
    //
    // MERGE, never wipe: the old v3→v4 migration reset badges to {} first, which
    // would also throw away badges a child had genuinely earned.
    const TRAINERS_BY_REGION = {
      kanto:   ['misty','brock','erika','sabrina','surge','koga','blaine','lorelei','agatha','giovanni','lance','blue'],
      johto:   ['falkner','bugsy','whitney','morty','jasmine','pryce','clair','will','karen'],
      hoenn:   ['roxanne','brawly','wattson','norman','flannery','winona','wallace','steven'],
      sinnoh:  ['roark','gardenia','maylene','wake','byron','candice','volkner','aaron','flint','cynthia'],
      unova:   ['lenora','burgh','clay','skyla','drayden','elesa','iris','n'],
      kalos:   ['viola','grant','ramos','valerie','clemont','korrina','diantha'],
      galar:   ['milo','nessa','kabu','bea','allister','gordie','raihan','leon'],
      rivals:  ['gary','red','hop'],
      rockets: ['jessie','james'],
      anime:   ['ash','ash_johto','ash_hoenn','ash_sinnoh','ash_unova','ash_kalos','may','dawn','serena','go'],
      alola:   ['ilima','hala','lana','kiawe','mallow','olivia','sophocles','acerola','nanu','kukui'],
      paldea:  ['katy','brassius','iono','kofu','larry','ryme','tulip','grusha'],
      hisui:   ['adaman','irida','volo','akari','rei'],
      orange:  ['cissy','danny','rudy','luana','drake'],
    }
    const badgesKey = `dunia-avatar-${av}-g13c_badges`
    let allBadges = {}
    try { allBadges = JSON.parse(localStorage.getItem(badgesKey) || '{}') || {} } catch (_) { allBadges = {} }
    for (const [region, ids] of Object.entries(TRAINERS_BY_REGION)) {
      const count = region === 'kanto' ? ids.length : Math.max(1, Math.round(ids.length * 0.7))
      for (let i = 0; i < count; i++) allBadges[ids[i]] = true
    }
    try { localStorage.setItem(badgesKey, JSON.stringify(allBadges)) } catch(_) {}

    // Unlock all Kanto city presets in G13B
    if (typeof CITY_PACK !== 'undefined') {
      const kantoRegion = CITY_PACK['kanto']
      if (kantoRegion && kantoRegion.cities) {
        if (!prog['g13b'].cities) prog['g13b'].cities = {}
        const kantoProgress = { completed: [], stars: {} }
        kantoRegion.cities.forEach(c => {
          kantoProgress.completed.push(c.slug)
          kantoProgress.stars[c.slug] = 5
        })
        prog['g13b'].cities['kanto'] = kantoProgress
        saveProgress(prog)
      }
    }

    localStorage.setItem('dunia-kodok-slot7-v6', '1')
  } catch (_) {}
}

function getLevelProgress(gameNum) {
  const prog = loadProgress()
  return prog['g'+gameNum] || { completed: [], stars: {} }
}
function setLevelComplete(gameNum, levelNum, stars) { try { if (window.DuniaLevel) DuniaLevel.end('g' + gameNum, levelNum, stars > 0, stars) } catch (_) {} // PRD-49
  const prog = loadProgress()
  const key = 'g'+gameNum
  if (!prog[key]) prog[key] = { completed: [], stars: {} }
  const gp = prog[key]
  const wasNew = !gp.completed.includes(levelNum)
  const wasBetter = stars > (gp.stars[levelNum] || 0)
  if (wasNew) gp.completed.push(levelNum)
  if ((gp.stars[levelNum]||0) < stars) gp.stars[levelNum] = stars
  saveProgress(prog)
  // Toast feedback for save events (skip noise if neither new nor better)
  try {
    if (typeof showToast === 'function') {
      if (wasNew) {
        showToast(`Level ${levelNum} selesai! ⭐ ${stars}`, 'success', 2400)
      } else if (wasBetter) {
        showToast(`Skor baru level ${levelNum}: ⭐ ${stars}`, 'success', 2400)
      }
    }
  } catch(_){}
}

// PRD-47: the Gym Huruf (G13c) letter gym was removed; the 13c tile has opened games/gym-pokemon.html since
// v59 and nothing could reach this code (docs/prd/PRD-47-bug-bash.md, docs/prd/PRD-43-*).
function openGymGame() {
  playClick()
  // MUST remain synchronous — page redirects on next line, no time for async work.
  _applyKodokSlot7Unlock()   // runs once, guard inside; slot-7+frog preset
  window.location.href = 'games/gym-pokemon.html?v=20260506ae'
}

function openLevelSelect(gameNum) {
  // G25 Math Hub — standalone HTML owns hub + level grid + quiz.
  if (gameNum === 25) {
    window.location.href = 'games/kuis-matematika.html?v=20260621f'
    return
  }
  // G10 mode-select intercept moved upstream to openRegionOverlay(10) so the
  // selector fires once on the world-map tile tap. Keeping the intercept here
  // too caused a double-prompt during Adventure (region → openLevelSelect → 2nd
  // prompt). Adventure path goes openRegionOverlay → locked-fall-through →
  // region grid → openLevelSelect (no prompt here, intended).
  // Kodok slot-7 special unlock (runs once, guard inside).
  // Trigger only on G13B; G13C tile uses openGymGame() which has its own call.
  if (gameNum === '13b') _applyKodokSlot7Unlock()
  state.currentGame = gameNum
  const meta = GAME_META[gameNum]
  const info = GAME_INFO[gameNum] || {}
  const gp = getLevelProgress(gameNum)
  // v56.5 A-318 — claymorphism station-map skin for the Balapan Kereta level select only
  try { document.getElementById('screen-level').classList.toggle('lvl-clay', gameNum === 14) } catch(_) {}

  // Banner — set CSS vars for theme coloring
  const banner = document.getElementById('level-game-banner')
  const glow = info.glow || 'rgba(139,92,246,0.5)'
  const glowAlpha = (a) => glow.replace(/[\d.]+\)$/, a+')')
  banner.style.setProperty('--banner-top', glow)
  banner.style.setProperty('--banner-base', info.grad ? `linear-gradient(180deg,${info.grad},#0a0820)` : 'linear-gradient(180deg,#1a0540,#0a0a25)')
  banner.style.setProperty('--icon-glow', glow)
  banner.style.setProperty('--icon-bg', glowAlpha('0.14'))
  banner.style.setProperty('--icon-border', glowAlpha('0.5'))
  // Banner image — use banner-gameN.webp as background if available
  // Only games that have a banner file ask for one (audit A-7: game 21 and up requested a 404).
  const HAS_BANNER = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,22]
  const bannerLayer = HAS_BANNER.includes(gameNum) ? `url('assets/banner-game${gameNum}.webp'), ` : ''
  banner.style.backgroundImage = `${bannerLayer}var(--banner-base, linear-gradient(180deg,#1a0540,#0a0a25))`
  banner.style.backgroundSize = 'cover, 100% 100%'
  banner.style.backgroundPosition = 'center, center'

  // Icon
  const iconEl = document.getElementById('level-game-icon')
  if (gameNum === 10) {
    // Task #96: local-first per L16 (was remote-primary)
    const _pikaSrc = (typeof pokeSpriteAlt2 === 'function') ? pokeSpriteAlt2('pikachu') : 'assets/Pokemon/others/pokeball.svg'
    iconEl.innerHTML = `<img src="${_pikaSrc}" style="width:60px;height:60px;image-rendering:auto;display:block;" onerror="this.src='assets/Pokemon/others/pokeball.svg';this.onerror=function(){this.style.visibility='hidden'}">`
  } else if (meta.iconImg) {
    iconEl.innerHTML = `<img src="${meta.iconImg}" style="width:64px;height:70px;display:block;object-fit:contain;" alt="">`
  } else {
    iconEl.textContent = meta.icon
  }

  document.getElementById('level-game-name').textContent = meta.name
  document.getElementById('level-game-desc').textContent = info.desc || ''

  // Floating particles
  const ptEl = document.getElementById('lvl-particles')
  if (ptEl) {
    ptEl.innerHTML = ''
    const PEMOJIS = {
      1:['😊','😢','😡','😱','🥰'],2:['🌬️','🌈','✨','💨'],
      3:['📝','🌿','✏️','⭐'],4:['🔢','🐘','🦁','🐅'],
      5:['🃏','🎴','⭐','✨'],6:['🚗','💨','🏎️','🌆'],
      7:['🖼️','🎨','👁️','🌟'],8:['💬','📖','✨','🔤'],
      9:['✍️','✏️','📝','⭐'],10:['⚡','🔥','💧','🍃'],
      11:['🔬','🌿','⭐','🪐'],12:['👁️','🌑','🌟','❓'],
      19:['🐦','🌿','☁️','✨'],23:['🏃','💨','🌿','⭐'],24:['🌊','🐠','🐡','💧']
    }
    const emjs = PEMOJIS[gameNum] || ['⭐','✨','💫']
    for (let i = 0; i < 7; i++) {
      const p = document.createElement('span')
      p.className = 'lvl-p'
      p.textContent = emjs[i % emjs.length]
      p.style.setProperty('--px', (8+Math.random()*84)+'%')
      p.style.setProperty('--py', (20+Math.random()*60)+'%')
      p.style.setProperty('--psz', (12+Math.random()*14)+'px')
      p.style.setProperty('--pdur', (2.8+Math.random()*3)+'s')
      p.style.setProperty('--pdel', (Math.random()*2.5)+'s')
      p.style.setProperty('--pglow', glow)
      ptEl.appendChild(p)
    }
  }

  // Tier card theme color
  document.querySelectorAll('.lvl-tier-hdr').forEach(hdr => {
    hdr.style.background = glowAlpha('0.18')
  })
  document.querySelectorAll('.lvl-tier-body').forEach(body => {
    body.style.setProperty('--tier-line', glowAlpha('0.25'))
  })

  // Progress bar
  const completed = gp.completed.length
  const totalStars = Object.values(gp.stars||{}).reduce((a,b)=>a+b,0)
  // Expanded level caps (2026-05-04): broaden challenge ladder for every game
  // so kids who finish level 20 still have more to chase. Pokemon games (G13/
  // G16/G24) bump 40→60; bonus games (G19/G20/G22) 30→50; everything else 20→40.
  const totalLevels = (state.currentGame === 13 || state.currentGame === 16 || state.currentGame === 24) ? 60 : (state.currentGame === 19 || state.currentGame === 20 || state.currentGame === 22) ? 50 : 40
  document.getElementById('level-prog-txt').textContent = `${completed} / ${totalLevels} level selesai`
  document.getElementById('level-prog-fill').style.width = (completed/totalLevels*100) + '%'
  document.getElementById('level-total-stars').textContent = '⭐ ' + totalStars

  // Per-tier dot colors + star count
  // v56.5 B-291 — g14 (Balapan Kereta) claims "x/40 level selesai" but only rendered
  // 4 tiers (20 bubbles). It now shows all 8 tiers = 40 levels like the header says.
  const numTiers = levelCount(state.currentGame) / 5
  // Show/hide extended tiers
  for (let t = 5; t <= 8; t++) {
    const tc2 = document.getElementById('level-tier-'+t)
    if (tc2) tc2.style.display = t <= numTiers ? '' : 'none'
  }
  for (let tier = 1; tier <= numTiers; tier++) {
    const dotsEl = document.getElementById('level-dots-'+tier)
    if (!dotsEl) continue
    dotsEl.innerHTML = ''
    let tierStars = 0
    for (let i = 1; i <= 5; i++) {
      const lvNum = (tier-1)*5 + i
      const isCompleted = gp.completed.includes(lvNum)
      const isUnlocked = lvNum === 1 || gp.completed.includes(lvNum-1)
      const starsGot = Math.max(0, Math.min(5, gp.stars[lvNum] || 0))
      if (isCompleted) tierStars += starsGot
      const cls = 'lvl-bubble' + (isCompleted?' completed':isUnlocked?' unlocked':' locked')
      // Hotfix 2026-04-28: render up to 5 stars (was hard-coded 3) so saved
      // raw GameScoring.calc() values render faithfully.
      const starsStr = isCompleted ? '<span class="lvl-star-filled">'+'★'.repeat(starsGot)+'</span><span class="lvl-star-empty">'+'☆'.repeat(Math.max(0,5-starsGot))+'</span>' : ''
      const dot = document.createElement('div')
      dot.className = cls
      dot.style.setProperty('--bdelay', (((lvNum-1)%5)*0.06)+'s')
      dot.style.setProperty('--bl', glowAlpha('0.9'))
      dot.style.setProperty('--bd', glowAlpha('0.98'))
      dot.style.setProperty('--bb', glowAlpha('0.65'))
      dot.style.setProperty('--bs', glow)
      // v56.5 A-318 — g14 claymorphism STATION MAP (owner reference): each level is a
      // little clay station node labelled with the destination station from the
      // authoritative 48-leg TrainJourney route (leg N's origin station). Other games
      // keep the round bubbles.
      // v57.6 — nicer station icon (🚉 not 🏠/jar), drop the "STN " prefix, and let the
      // name wrap to 2 lines (Title-Case) so long names read fully without overflow.
      if (state.currentGame === 14 && window.TrainJourney) {
        let stn = ''
        try { stn = (TrainJourney.name(lvNum) || '').split('→')[0].trim() } catch(_) {}
        const stnE = stn.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
        const isCurrent = (isUnlocked && !isCompleted)
        dot.classList.add('lvl-station')
        if (isCurrent) dot.classList.add('lvl-station-current')
        dot.innerHTML = (isUnlocked||isCompleted)
          ? `<span class="lvl-stn-house">🚉<span class="lvl-stn-num">${lvNum}</span></span>`
            + `<span class="lvl-stn-name" title="${stnE}">${stnE}</span>`
            + `<div class="lvl-stars-row">${starsStr}</div>`
          : `<span class="lvl-stn-house is-locked">🔒</span>`
            + `<span class="lvl-stn-name" title="${stnE}">${stnE}</span>`
      } else {
      dot.innerHTML = isUnlocked||isCompleted
        ? `<span class="lvl-num">${lvNum}</span><div class="lvl-stars-row">${starsStr}</div>`
        : `<span class="lvl-lock-icon">🔒</span>`
      }
      if (!dot.classList.contains('locked')) {
        dot.onclick = () => { playClick(); startGameWithLevel(lvNum) }
      }
      dotsEl.appendChild(dot)
    }
    const tsEl = document.getElementById('tier-stars-'+tier)
    if (tsEl) tsEl.textContent = tierStars > 0 ? '⭐'+tierStars : ''
  }

  // Show elements
  document.getElementById('level-progress-row').style.display = 'flex'
  document.getElementById('level-tiers').style.display = 'flex'

  showScreen('screen-level')
}

// PRD-58 A1: the levels a game's map shows, and its difficulty by thirds of THAT map (the old 1-13 / 14-26 / 27+
// split left the 20-level games G3, G4, G7, G8, G9, G11 without "hard": their map ends at 20)
function levelCount(g) { return (g === 13 || g === 14 || g === 16 || g === 24) ? 40 : (g === 19 || g === 20) ? 30 : 20 }
function levelDiff(g, lv) { const n = levelCount(g), a = Math.ceil(n / 3), b = Math.ceil(2 * n / 3); return lv <= a ? 'easy' : lv <= b ? 'medium' : 'hard' }

function startGameWithLevel(levelNum) {
  state.paused = false
  document.getElementById('pause-overlay').style.display='none'
  // Map level 1-20 to difficulty string for backward compat
  state.selectedLevelNum = levelNum
  state.selectedLevel = levelDiff(state.currentGame, levelNum)
  state.gameStars = [0,0]
  state.maxPossibleStars = null
  state.currentPlayer = 0
  // Update level indicator on all game headers
  const lvLabel = `Lv.${levelNum}`
  const isMilestone = (levelNum % 10 === 0)
  document.querySelectorAll('.gh-level').forEach(el => {
    el.textContent = lvLabel
    if (isMilestone) el.setAttribute('data-milestone', 'true')
    else el.removeAttribute('data-milestone')
  })
  // Milestone celebration on 10/20/30/40/50/60 — VFX + bonus confetti
  if (isMilestone) {
    try { spawnMilestoneCelebration(levelNum) } catch(_){}
  }
  if(state.selectedLevel==='hard') checkAchievement('hard_mode')
  // Standalone games navigate to separate HTML — skip showScreen (no screen-gameN div exists)
  const standaloneGames = [6, 14, 15, 16, 19, 20, 21, 22, 23, 24, 25]
  if (!standaloneGames.includes(state.currentGame)) {
    showScreen('screen-game' + state.currentGame); try { if (window.DuniaLevel) DuniaLevel.start('g' + state.currentGame, levelNum) } catch (_) {} // PRD-49
  }
  // Games 1, 2, 5 and 12 were retired on 2026-09-20 (owner is building replacement
  // mechanics). Their slots stay null so every other game keeps its number, and so
  // saved progress for games 3, 4, 6.. is not silently re-pointed at a neighbour.
  const inits = [null,null,null,initGame3,initGame4,null,null,initGame7,initGame8,initGame9,initGame10,initGame11,null,initGame13,initGame14,initGame15,initGame16,initGame17,initGame18,initGame19,initGame20,initGame21,initGame22,initGame23,initGame24]
  if (inits[state.currentGame]) inits[state.currentGame]()
}

// ================================================================
// PLAYER SAVE SYSTEM (7 slots)
// ================================================================
const PLAYER_SLOTS_KEY = 'dunia-players'
function getPlayerSlots() {
  try {
    const v = JSON.parse(localStorage.getItem(PLAYER_SLOTS_KEY))
    return Array.isArray(v) ? v : Array(7).fill(null)
  }
  catch(e) { return Array(7).fill(null) }
}
function setPlayerSlots(slots) { try { localStorage.setItem(PLAYER_SLOTS_KEY, JSON.stringify(slots)) } catch(e){} }
// Which slot is active per player-index (0=P1, 1=P2).
// Hotfix 2026-04-28: persisted to localStorage so navigating to a standalone
// game and back preserves the avatar-keyed save context. Without this,
// `_avatarSlug()` always reads slot 0's animal after page reload.
const ACTIVE_SLOT_KEY = 'dunia-active-slot'
function _loadActiveSlot() {
  try {
    const raw = localStorage.getItem(ACTIVE_SLOT_KEY)
    if (!raw) return [0, 1]
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length < 2) return [0, 1]
    return [
      Math.max(0, Math.min(6, parseInt(parsed[0]) || 0)),
      Math.max(0, Math.min(6, parseInt(parsed[1]) || 1)),
    ]
  } catch (_) { return [0, 1] }
}
function _saveActiveSlot() {
  try { localStorage.setItem(ACTIVE_SLOT_KEY, JSON.stringify(window._pSlot)) } catch (_) {}
  // PRD-18: the child now playing gets its own sound / vibration / maths settings
  try { window.DuniaProfile && DuniaProfile.applySettings() } catch (_) {}
}
if(!window._pSlot) window._pSlot = _loadActiveSlot()
function renderPlayerSlotRow(playerIdx) {
  const slots = getPlayerSlots()
  const rowId = 'pslot-row-'+playerIdx
  const row = document.getElementById(rowId)
  if(!row) return
  row.innerHTML = ''
  for(let i=0;i<7;i++){
    const s = slots[i]
    const chip = document.createElement('button')
    chip.className = 'pslot-chip' + (!s?' empty':'') + (window._pSlot[playerIdx]===i?' selected':'')
    const _av=document.createElement('span'); _av.className='psc-av'; _av.textContent=s?s.animal:'➕'
    const _nm=document.createElement('span'); _nm.className='psc-name'; _nm.textContent=s?s.name.slice(0,5):'Slot '+(i+1)
    const _st=document.createElement('span'); _st.className='psc-stars'; _st.textContent=s?'⭐'+s.stars:''
    chip.append(_av,_nm,_st)
    chip.onclick = () => { window._pSlot[playerIdx]=i; _saveActiveSlot(); loadSlotIntoForm(playerIdx,i); renderPlayerSlotRow(playerIdx); playClick() }
    row.appendChild(chip)
  }
}
function loadSlotIntoForm(playerIdx, slotIdx) {
  const slots = getPlayerSlots()
  const s = slots[slotIdx]
  const nameInputId = playerIdx===0?'p1-name':'p2-name'
  const animalsId   = playerIdx===0?'p1-animals':'p2-animals'
  const ageId       = playerIdx===0?'p1-age':'p2-age'
  if(s) {
    document.getElementById(nameInputId).value = s.name||''
    state.players[playerIdx].animal = s.animal||'🦁'
    state.players[playerIdx].ageTier = s.ageTier||'tumbuh'
    state.players[playerIdx].stars = s.stars||0
    buildAnimalPicker(animalsId, playerIdx)
  } else {
    document.getElementById(nameInputId).value = ''
    state.players[playerIdx].animal = '🦁'
    // a new child starts on the band the name screen shows first (5-6); before 2026-11-14 the screen lit 5-6
    // while 'tumbuh' (7-8) was saved for every child whose parent left it alone (tools/qa-profile-age.mjs L1)
    state.players[playerIdx].ageTier = 'cilik'
    state.players[playerIdx].stars = 0
    buildAnimalPicker(animalsId, playerIdx)
  }
  // light the band this child will actually be saved with (a saved child with no band on record plays as 7-8)
  document.getElementById(ageId).querySelectorAll('.age-btn').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.age===state.players[playerIdx].ageTier)
  })
}
function savePlayerToSlot(playerIdx) {
  const slotIdx = window._pSlot[playerIdx]
  const slots = getPlayerSlots()
  const nameInputId = playerIdx===0?'p1-name':'p2-name'
  const name = document.getElementById(nameInputId).value.trim()||('Pemain '+(slotIdx+1))
  slots[slotIdx] = {
    name, animal: state.players[playerIdx].animal,
    ageTier: state.players[playerIdx].ageTier,
    stars: state.players[playerIdx].stars||0,
    progress: slots[slotIdx]?.progress||{}
  }
  setPlayerSlots(slots)
}
function saveStarsToSlot() {
  try {
    const slots = getPlayerSlots()
    for(let pi=0;pi<(state.mode==='duo'?2:1);pi++){
      const si = window._pSlot[pi]
      if(slots[si]) slots[si].stars = state.players[pi].stars
    }
    setPlayerSlots(slots)
  } catch(e){}
}

// ================================================================
// MODE & NAMES
// ================================================================
function selectMode(mode) {
  state.mode = mode
  renderPlayerSlotRow(0)
  loadSlotIntoForm(0, window._pSlot[0])
  const p2 = document.getElementById('p2-section')
  if(mode==='duo'){
    p2.style.display='flex'; renderPlayerSlotRow(1); loadSlotIntoForm(1, window._pSlot[1])
  } else {
    p2.style.display='none'
  }
  showScreen('screen-names')
}
function buildAnimalPicker(containerId, playerIdx) {
  const container = document.getElementById(containerId); container.innerHTML=''
  ANIMALS_PICKER.forEach(a=>{
    const btn=document.createElement('button')
    btn.className='animal-btn'+(state.players[playerIdx].animal===a?' selected':'')
    btn.textContent=a
    btn.onclick=()=>{container.querySelectorAll('.animal-btn').forEach(b=>b.classList.remove('selected'));btn.classList.add('selected');state.players[playerIdx].animal=a;playClick()}
    container.appendChild(btn)
  })
}
function confirmNames() {
  const n1=document.getElementById('p1-name').value.trim()
  if(n1) state.players[0].name=n1
  if(state.mode==='duo'){const n2=document.getElementById('p2-name').value.trim();if(n2)state.players[1].name=n2}
  // Save to slots
  savePlayerToSlot(0)
  if(state.mode==='duo') savePlayerToSlot(1)
  // Load stars from saved slot
  try {
    const slots=getPlayerSlots()
    const s0=slots[window._pSlot[0]]
    if(s0){state.players[0].stars=s0.stars||0;state.players[0].ageTier=s0.ageTier||'tumbuh'}
    if(state.mode==='duo'){const s1=slots[window._pSlot[1]];if(s1){state.players[1].stars=s1.stars||0;state.players[1].ageTier=s1.ageTier||'tumbuh'}}
    state.unlockedAchievements=JSON.parse(localStorage.getItem(pkey('achievements'))||'{}')
  } catch(e){}
  updateStreak()
  state.currentPlayer=0
  _seedKodokProgress() // one-time 25% city preset for frog avatar
  pruneRetiredGameSaves() // drop saved rows for games 1/2/5/12 (retired 2026-09-20)
  buildMenuHeader()
  showScreen('screen-menu')
  // pull shared cloud progress in background (non-blocking), then re-prune: the
  // merge can bring a retired game's rows back from another device.
  _syncFromCloud().then(() => { try { pruneRetiredGameSaves() } catch (_) {} })
}
function saveStars() {
  try {
    const saved=JSON.parse(localStorage.getItem('dunia-emosi-stars')||'{}')
    saved[state.players[0].name]=state.players[0].stars
    if(state.mode==='duo') saved[state.players[1].name]=state.players[1].stars
    localStorage.setItem('dunia-emosi-stars',JSON.stringify(saved))
    saveStarsToSlot()
  } catch(e){}
}

// ================================================================
// STREAK
// ================================================================
function updateStreak() {
  try {
    const today=new Date().toDateString()
    const data=JSON.parse(localStorage.getItem(pkey('streak'))||'{}')
    const lastDay=data.lastDay||''
    const yesterday=new Date(Date.now()-86400000).toDateString()
    if(lastDay===today){}else if(lastDay===yesterday){data.streak=(data.streak||1)+1}else{data.streak=1}
    data.lastDay=today
    localStorage.setItem(pkey('streak'),JSON.stringify(data))
    const streakEl=document.getElementById('streak-badge'),streakText=document.getElementById('streak-text')
    if(data.streak>=2){streakEl.style.display='inline-flex';streakText.textContent=data.streak+' hari'}
    if(data.streak>=3) setTimeout(()=>checkAchievement('streak3'),1000)
    return data.streak
  } catch(e){return 1}
}
function getStreakCount() {
  try{const data=JSON.parse(localStorage.getItem(pkey('streak'))||'{}');return data.streak||1}catch(e){return 1}
}

// ================================================================
// MENU
// ================================================================
function buildMenuHeader() {
  const header=document.getElementById('menu-player-header'); header.innerHTML=''
  const makeChip=(idx)=>{
    const p=state.players[idx],chip=document.createElement('div')
    chip.className='player-chip'+(state.mode==='solo'||idx===state.currentPlayer?' active':'')
    const streak=getStreakCount(),streakHtml=streak>=2?`<span class="p-streak">🔥${streak}</span>`:''
    const xp=getXP(),tier=getLevelTier(xp)
    const _ca=document.createElement('span'); _ca.className='p-animal'; _ca.textContent=p.animal
    const _cn=document.createElement('span'); _cn.className='p-name'; _cn.textContent=p.name
    const _cs=document.createElement('span'); _cs.className='p-stars'; _cs.textContent='⭐'+p.stars
    const _ct=document.createElement('span'); _ct.style.cssText='font-size:13px;background:rgba(139,92,246,0.12);color:var(--brand);border-radius:100px;padding:2px 8px;font-weight:700'; _ct.textContent=tier.icon
    chip.append(_ca,_cn,_cs,_ct)
    if(streak>=2){const _sk=document.createElement('span');_sk.className='p-streak';_sk.innerHTML=(uiEco('streak-big','🔥')||'🔥')+streak;chip.appendChild(_sk)}
    return chip
  }
  header.appendChild(makeChip(0))
  if(state.mode==='duo') header.appendChild(makeChip(1))
  const banner=document.getElementById('total-stars-banner')
  if(state.mode==='duo'){banner.style.display='flex';const total=state.players[0].stars+state.players[1].stars;banner.innerHTML=`<span class="tsb-label">Total Bintang Hari Ini ✨</span><span class="tsb-value">⭐ ${total}</span>`}
  else banner.style.display='none'
  renderWorldMapStars()
}

// World-map star labels + zone totals.
// Games are ENUMERATED from the map markup (every `gstars-<id>-lbl`), not a hand
// list: the old hardcoded list silently skipped every standalone game added after
// it (G21, G25–G30), so their nodes never showed a star however well a child did.
// Two stores feed it, both avatar-scoped through pkey():
//   best-stars  — in-app games: best single-session result (showResult)
//   progress    — standalone games: per-level stars written by save-engine's
//                 saveLevelProgress() (row 'g<id>'; G28–G30 once wrote a bare
//                 numeric row '<id>', read too so existing saves still count).
// Node label = best result (capped 5), zone total = every star earned in the zone.
function mapGameStars(id, bestStars, prog) {
  let best = Number(bestStars[id]) || 0, total = best
  const perLevel = {}
  for (const row of [prog['g' + id], prog[String(id)]]) {
    const st = row && row.stars
    if (!st || typeof st !== 'object') continue
    for (const lv in st) perLevel[lv] = Math.max(perLevel[lv] || 0, Number(st[lv]) || 0)
  }
  let sum = 0
  for (const lv in perLevel) { sum += perLevel[lv]; best = Math.max(best, perLevel[lv]) }
  return { best: Math.min(best, 5), total: Math.max(total, sum) }
}
function renderWorldMapStars() {
  try {
    const bestStars = JSON.parse(localStorage.getItem(pkey('best-stars')) || '{}')
    const prog = loadProgress()
    document.querySelectorAll('[id^="gstars-"][id$="-lbl"]').forEach(lbl => {
      const id = lbl.id.slice(7, -4)
      const s = mapGameStars(id, bestStars, prog)
      const txt = s.best > 0 ? '⭐'.repeat(s.best) : ''
      lbl.textContent = txt
      const legacy = document.getElementById('gstars-' + id); if (legacy) legacy.textContent = txt
      lbl.dataset.total = String(s.total); if (id === 'cek') { const v = Object.values((JSON.parse(avatarScopedGet('cek-kemampuan') || '{}') || {}).stars || {}).map(Number); lbl.textContent = v.length ? '⭐'.repeat(Math.max(...v)) : ''; lbl.dataset.total = String(v.reduce((a, b) => a + b, 0)) }   // PRD-53: Cek Kemampuan keeps its own stars
    })
    document.querySelectorAll('[id^="gstars-zone-"]').forEach(z => {
      const zone = z.closest('.wmap-zone')
      let t = 0
      if (zone) zone.querySelectorAll('[id^="gstars-"][id$="-lbl"]').forEach(l => { t += Number(l.dataset.total) || 0 })
      z.textContent = t > 0 ? '⭐ ' + t : '⭐'
    })
  } catch (e) { console.warn('[map] stars:', e) }
}

// ================================================================
// PAUSE SYSTEM
// ================================================================
function pauseGame() {
  if(state.paused) return
  state.paused = true
  if(state.g4Timer){clearInterval(state.g4Timer);state.g4Timer=null;state._g4TimerPaused=true}
  if(state.breatheInterval){clearInterval(state.breatheInterval);state.breatheInterval=null;state._breathePaused=true}
  document.getElementById('pause-overlay').style.display='flex'
  vibrate(30)
}
function resumeGame() {
  state.paused = false
  document.getElementById('pause-overlay').style.display='none'
  if(state._g4TimerPaused){state._g4TimerPaused=false;if(typeof startG4Countdown==='function')startG4Countdown()}
  if(state._breathePaused){state._breathePaused=false}
}
function restartCurrentGame() {
  state.paused = false
  document.getElementById('pause-overlay').style.display='none'
  startGameWithLevel(state.selectedLevel)
}
function exitToPauseMenu() {
  state.paused = false
  document.getElementById('pause-overlay').style.display='none'
  exitGame()
}
function openSettingsFromPause() {
  const name=state.players[state.currentPlayer]?.name||'—'
  document.getElementById('settings-player-name').textContent=name
  const sv=isSoundOn()?'on':'off'
  const vv=localStorage.getItem('dunia-emosi-vibrate')
  const sb=document.getElementById('settings-sound-btn')
  const vb=document.getElementById('settings-vibrate-btn')
  sb.textContent=sv==='off'?'OFF':'ON'
  sb.style.background=sv==='off'?'rgba(255,255,255,0.15)':'linear-gradient(135deg,#8B5CF6,#6D28D9)'
  vb.textContent=vv==='off'?'OFF':'ON'
  vb.style.background=vv==='off'?'rgba(255,255,255,0.15)':'linear-gradient(135deg,#8B5CF6,#6D28D9)'
  const mb=document.getElementById('settings-mathadv-btn')
  if(mb){const adv=isMathAdvanced();mb.textContent=adv?'ON':'OFF';mb.style.background=adv?'linear-gradient(135deg,#8B5CF6,#6D28D9)':'rgba(255,255,255,0.15)'}
  document.getElementById('settings-overlay').style.display='flex'
}
function toggleSoundSetting() {
  const next=localStorage.getItem('dunia-emosi-sound')==='off'?'on':'off'
  localStorage.setItem('dunia-emosi-sound',next)
  try{ window.DuniaProfile && DuniaProfile.saveSettings() }catch(_){}
  const btn=document.getElementById('settings-sound-btn')
  btn.textContent=next==='off'?'OFF':'ON'
  btn.style.background=next==='off'?'rgba(255,255,255,0.15)':'linear-gradient(135deg,#8B5CF6,#6D28D9)'
  // Control background music with sound toggle
  const active=document.querySelector('.screen.active')
  bgMusicToggle(next!=='off' && active && MUSIC_SCREENS.has(active.id))
}
function isMathAdvanced(){return localStorage.getItem('dunia-emosi-mathadv')==='on'}
// Task #68 (2026-04-25): centralized math difficulty bounds — see MATH-DIFFICULTY-STANDARD.md
// Default Easy: + and − only, max 20.  Hard (opt-in): + − × ÷, max 50.
function getMathLimits(){
  const adv=isMathAdvanced()
  return {advanced:adv, maxNum:adv?50:20, allowedOps:adv?['+','-','*','/']:['+','-']}
}
function toggleMathAdvanced(){
  const next=isMathAdvanced()?'off':'on'
  localStorage.setItem('dunia-emosi-mathadv',next)
  try{ window.DuniaProfile && DuniaProfile.saveSettings() }catch(_){}
  const btn=document.getElementById('settings-mathadv-btn')
  if(btn){btn.textContent=next==='on'?'ON':'OFF';btn.style.background=next==='on'?'linear-gradient(135deg,#8B5CF6,#6D28D9)':'rgba(255,255,255,0.15)'}
}
function toggleVibrateSetting() {
  const next=localStorage.getItem('dunia-emosi-vibrate')==='off'?'on':'off'
  localStorage.setItem('dunia-emosi-vibrate',next)
  try{ window.DuniaProfile && DuniaProfile.saveSettings() }catch(_){}
  const btn=document.getElementById('settings-vibrate-btn')
  btn.textContent=next==='off'?'OFF':'ON'
  btn.style.background=next==='off'?'rgba(255,255,255,0.15)':'linear-gradient(135deg,#8B5CF6,#6D28D9)'
}
function closeSettings() {
  document.getElementById('settings-overlay').style.display='none'
}

function stopAllGameSounds() {
  stopAmbient()
  battleBgmStop()
  g14StopAllAudio()
  // Stop G13b evolution/roar audio
  if(typeof _g13bEvoAudio !== 'undefined' && _g13bEvoAudio) {
    try { _g13bEvoAudio.pause(); _g13bEvoAudio.currentTime=0 } catch(e){}
  }
  // Clear G13b legendary auto-attack interval
  if(typeof _g13bLegAutoAtk !== 'undefined' && _g13bLegAutoAtk) {
    clearInterval(_g13bLegAutoAtk); _g13bLegAutoAtk = null
  }
  // Stop all HTML audio elements that may be playing
  document.querySelectorAll('audio').forEach(a => {
    if(!a.paused && !['bg-music'].includes(a.id)) {
      try { a.pause(); a.currentTime=0 } catch(e){}
    }
  })
}
function exitGame() {
  state.paused = false
  document.getElementById('pause-overlay').style.display='none'
  document.getElementById('settings-overlay').style.display='none'
  // Cleanup Pixi apps to free GPU memory
  PixiManager.destroyAll()
  playClick(); clearTimers(); stopAllGameSounds(); showScreen('screen-welcome')
}
function backToLevelSelect() {
  state.paused = false
  document.getElementById('pause-overlay').style.display='none'
  document.getElementById('settings-overlay').style.display='none'
  // v54.27 I9: drain G18 ambient + DOM before leaving so gamelan/Pak Masinis
  // don't linger on the level select.
  try { g18Cleanup() } catch(_){}
  PixiManager.destroyAll()
  clearTimers(); stopAllGameSounds(); playClick(); showScreen('screen-level')
}
function clearTimers() {
  if(state.breatheInterval){clearInterval(state.breatheInterval);state.breatheInterval=null}
  if(state.g4Timer){clearInterval(state.g4Timer);state.g4Timer=null}
  if(g13ResultTimeout){clearTimeout(g13ResultTimeout);g13ResultTimeout=null;hideGameResult()}
  if(g9Canvas){
    // A-339 P5 — unified Pointer Events (replaced dual mouse+touch listeners)
    g9Canvas.removeEventListener('pointerdown',g9PointerDown)
    g9Canvas.removeEventListener('pointermove',g9PointerMove)
    g9Canvas.removeEventListener('pointerup',g9PointerUp)
    g9Canvas.removeEventListener('pointercancel',g9PointerUp)
  }
}

// ================================================================
// DOTS
// ================================================================
function buildDots(containerId, total, current) {
  const el=document.getElementById(containerId); if(!el)return; el.innerHTML=''
  const maxDots=Math.min(total,10),step=total/maxDots
  for(let i=0;i<maxDots;i++){const dot=document.createElement('div');const threshold=Math.round(i*step);dot.className='rdot'+(current>threshold?' done':(current===threshold?' current':''));el.appendChild(dot)}
}

// ================================================================
// FLASH
// ================================================================
function flashScreen(type) {
  const el=document.getElementById('flash-overlay')
  el.className='flash-overlay '+type; el.classList.add('show')
  setTimeout(()=>el.classList.remove('show'),300)
  if(type==='red'){const screen=document.querySelector('.screen.active');if(screen){screen.classList.add('shake');setTimeout(()=>screen.classList.remove('shake'),400)}}
}

// ================================================================
// ACHIEVEMENTS
// ================================================================
function checkAchievement(key) {
  if(!state.unlockedAchievements[key]){
    state.unlockedAchievements[key]=true
    try{localStorage.setItem(pkey('achievements'),JSON.stringify(state.unlockedAchievements))}catch(e){}
    // PRD-22: the achievement goes into the child's Buku Koleksi (games/data/reward-book.js)
    try{ if(window.DuniaEmit&&ACHIEVEMENTS[key]) DuniaEmit('reward',{id:key,kind:'badge',src:'hub',title:ACHIEVEMENTS[key].name.replace(/!.*$/,'').trim()}) }catch(e){}
    showAchievement(key)
  }
}
function checkAchievements(context) {
  const totalStars=state.players[0].stars+state.players[1].stars
  if(totalStars>=1) checkAchievement('first_star')
  if(totalStars>=10) checkAchievement('ten_stars')
  if(totalStars>=50) checkAchievement('fifty_stars')
  if(totalStars>=100) checkAchievement('hundred_stars')
  if(context==='perfect_g3') checkAchievement('letter_master')
  if(context==='perfect_g4') checkAchievement('count_master')
  if(getStreakCount()>=3) checkAchievement('streak3')
}
function showAchievement(key) {
  const ach=ACHIEVEMENTS[key]; if(!ach)return
  const toast=document.getElementById('achievement-toast')
  const BADGE_MAP={first_star:'badge-first-win.webp',hard_mode:'badge-perfect.webp',letter_master:'badge-reader.webp',word_master:'badge-reader.webp',streak3:'badge-streak-7.webp'}
  const badgeFile=BADGE_MAP[key]
  const iconEl=document.getElementById('at-icon')
  if(badgeFile){iconEl.innerHTML=`<img src="assets/${badgeFile}" style="width:36px;height:36px;object-fit:contain" onerror="this.outerHTML='${ach.icon}'">`}
  else{const _b=uiBadge(ach.icon,'width:36px;height:36px;object-fit:contain'); if(_b)iconEl.innerHTML=_b; else iconEl.textContent=ach.icon}
  document.getElementById('at-name').textContent=ach.name
  // Save title in case showComingSoonToast swapped it; restore here.
  const titleEl=toast.querySelector('.at-title')
  if(titleEl)titleEl.textContent='Pencapaian Baru!'
  toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'),3500)
}

// Hotfix #105 (2026-04-28): "Segera Hadir" toast for landing tiles whose
// game isn't built yet. Reuses #achievement-toast DOM (single shared toast).
function showComingSoonToast(name, icon) {
  const toast=document.getElementById('achievement-toast')
  if(!toast)return
  const iconEl=document.getElementById('at-icon')
  const nameEl=document.getElementById('at-name')
  const titleEl=toast.querySelector('.at-title')
  if(iconEl)iconEl.textContent=icon||'🚧'
  if(titleEl)titleEl.textContent='Segera Hadir!'
  if(nameEl)nameEl.textContent=name||'Game baru sedang dibuat'
  toast.classList.add('show')
  setTimeout(()=>toast.classList.remove('show'),3000)
}
window.showComingSoonToast = showComingSoonToast

// ================================================================
// FEEDBACK
// ================================================================
let feedbackCallback=null
function showFeedback(correct, starsEarned, customMsg, callback) {
  feedbackCallback=callback
  const emojis=correct?['🎉','⭐','🥳','🏆','🌟','🎊','💫']:['💪','😊','🤗','🌈','🍀']
  const titles=correct?['Benar!','Hebat!','Luar biasa!','Bagus sekali!','Keren!']:['Hampir benar!','Coba lagi!','Ayo terus!','Semangat!']
  document.getElementById('fb-emoji').textContent=emojis[Math.floor(Math.random()*emojis.length)]
  document.getElementById('fb-title').textContent=titles[Math.floor(Math.random()*titles.length)]
  document.getElementById('fb-sub').textContent=customMsg||(correct?'Kamu pintar sekali! 😄':'Tidak apa-apa, kamu pasti bisa! 💪')
  document.getElementById('fb-stars').textContent=starsEarned>0?'⭐'.repeat(Math.min(starsEarned,5)):''
  const leoEl = document.getElementById('fb-leo')
  if(leoEl) leoEl.src = correct ? 'assets/leo-celebrating.webp' : 'assets/leo-angry.webp'
  document.getElementById('overlay-feedback').classList.add('show')
  if(correct&&starsEarned>=3) launchConfetti(1) // light confetti only for 3+ stars
}
function closeFeedback() {
  playClick(); document.getElementById('overlay-feedback').classList.remove('show')
  if(feedbackCallback){feedbackCallback();feedbackCallback=null}
}
function addStars(n, answerEl) {
  // Task #84 verify: defensive guards to prevent freeze if state.gameStars or currentPlayer not init
  if (!Array.isArray(state.gameStars)) state.gameStars = [0, 0]
  if (typeof state.currentPlayer !== 'number') state.currentPlayer = 0
  if (state.players && state.players[state.currentPlayer]) {
    state.players[state.currentPlayer].stars = (state.players[state.currentPlayer].stars || 0) + n
  }
  state.gameStars[state.currentPlayer] = (state.gameStars[state.currentPlayer] || 0) + n
  saveStars(); updateGameStarDisplay(); spawnSparkles(answerEl, n)
  if(answerEl) flyStarToCounter(answerEl)
  checkAchievements(null)
}
function updateGameStarDisplay() {
  const gn=state.currentGame
  const gsEl=document.getElementById('g'+gn+'-stars')||document.getElementById('g'+gn+'-stars-hdr')
  if(gsEl){gsEl.innerHTML=(uiEco('star','⭐')||'⭐')+' '+state.gameStars[state.currentPlayer];gsEl.classList.remove('pop');void gsEl.offsetWidth;gsEl.classList.add('pop')}
  const piEl=document.getElementById('g'+gn+'-player-icon')
  if(piEl) piEl.textContent=state.players[state.currentPlayer].animal
  // G6 score mid
  const g6s=document.getElementById('g6-score')
  if(g6s&&gn===6) g6s.innerHTML=(uiEco('star','⭐')||'⭐')+' '+state.gameStars[state.currentPlayer]
}
function flyStarToCounter(srcEl) {
  const gn=state.currentGame
  const counter=document.getElementById('g'+gn+'-stars')||document.getElementById('g'+gn+'-stars-hdr')
  if(!counter||!srcEl)return
  const srcRect=srcEl.getBoundingClientRect(),dstRect=counter.getBoundingClientRect()
  const star=document.createElement('div'); star.className='star-fly'; star.textContent='⭐'
  const tx=dstRect.left-srcRect.left,ty=dstRect.top-srcRect.top
  star.style.cssText=`left:${srcRect.left}px;top:${srcRect.top}px;--tx:${tx}px;--ty:${ty}px;animation-duration:0.6s;`
  document.body.appendChild(star); setTimeout(()=>star.remove(),700)
}

// ================================================================
// RESULT
// ================================================================
// Task #99 (2026-04-27): Section-level try-catch refactor. Previous monolithic
// flow threw on any unguarded DOM/storage access, falling through to fallback.
// Each section now isolated; CRITICAL sections (text + showScreen) always run.
// A player name is typed by a child (or anyone holding the tablet): it is text, never markup. Audit A-5.
function escHtml(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) }

function showResult(mascot, title, msg) {
  if (state._showingResult) return
  state._showingResult = true
  setTimeout(() => { state._showingResult = false }, 1500)

  try { clearTimers(); stopAmbient() } catch(e) { console.warn('[showResult] clearTimers/stopAmbient:', e) }
  try {
    const fb = document.getElementById('overlay-feedback')
    if(fb){ fb.classList.remove('show'); fb.style.display = 'none' }
    const gr = document.getElementById('game-result-overlay')
    if(gr){ gr.classList.remove('show'); gr.style.display = 'none' }
  } catch(e) { console.warn('[showResult] hide overlays:', e) }

  // Hardened state guards (Task #99 — prevent throw on first-session paths)
  if (!Array.isArray(state.gameStars)) state.gameStars = [0, 0]
  if (typeof state.currentPlayer !== 'number') state.currentPlayer = 0
  if (!Array.isArray(state.players) || !state.players[state.currentPlayer]) {
    state.players = state.players || []
    state.players[state.currentPlayer] = state.players[state.currentPlayer] || {name:'Pemain',animal:'🦁',stars:0,ageTier:'tumbuh'}
  }

  const totalStars = state.gameStars[0]+state.gameStars[1]
  const maxPossible = state.maxPossibleStars || 5
  const earned = Math.min(5, Math.round(totalStars / maxPossible * 5)) || 0; try { if (window.DuniaLevel) DuniaLevel.end('g' + state.currentGame, state.selectedLevelNum || 1, earned > 0, earned >= 4 ? 3 : earned >= 2 ? 2 : earned >= 1 ? 1 : 0) } catch (_) {} // PRD-49
  const maxStars = 5
  let finalTitle = title || 'Bagus sekali!'
  let finalMsg = msg || `Kamu dapat ${totalStars} bintang! 🌟`
  if (earned === 0) {
    if (/sempurna|hebat|bagus|luar biasa|keren|selesai|berhasil|master|menang/i.test(finalTitle)) {
      finalTitle = 'Coba Lagi!'
    }
    if (/sempurna|hebat|bagus|luar biasa|keren/i.test(finalMsg) || /!$/.test(finalMsg)) {
      finalMsg = 'Belum ada bintang. Jangan menyerah, ayo coba lagi!'
    }
  } else if (earned <= 2 && /sempurna/i.test(finalTitle)) {
    finalTitle = 'Coba Lagi'
  }

  // SECTION 1: text content (CRITICAL — modal must show this)
  try {
    const mascotEl = document.getElementById('result-mascot')
    if (mascotEl) {
      const _m = mascot || state.players[state.currentPlayer].animal
      const _ms = emoAnimalSrc(_m)
      mascotEl.innerHTML = _ms
        ? `<img src="${_ms}" alt="" decoding="async" style="width:1em;height:1em;object-fit:contain" onerror="this.replaceWith(document.createTextNode('${_m}'))">`
        : _m
    }
    const titleEl = document.getElementById('result-title')
    if (titleEl) titleEl.textContent = finalTitle
    const starsEl = document.getElementById('result-stars')
    if (starsEl) starsEl.innerHTML = '<span class="rstar filled">★</span>'.repeat(earned)+'<span class="rstar empty">★</span>'.repeat(maxStars-earned)
    const msgEl = document.getElementById('result-msg')
    if (msgEl) msgEl.textContent = finalMsg
  } catch(e) { console.error('[showResult] text section:', e, e && e.stack) }

  // SECTION 2: Next button + duo scores
  try {
    const nextBtn = document.getElementById('result-next-btn')
    if (nextBtn) {
      const curLv = state.selectedLevelNum || 1
      nextBtn.style.display = (curLv < levelCount(state.currentGame) && state.mode !== 'duo' && earned >= 3) ? 'block' : 'none'
      if (earned >= 3 && window.VFX && VFX.Moment && VFX.Moment.ready()) setTimeout(() => { try { VFX.Moment.celebrate({ x: innerWidth / 2, y: innerHeight * 0.32 }, { size: Math.min(innerWidth, innerHeight) * 0.32 }) } catch (_) {} }, 250) // PRD-58 B4 win moment
    }
    const scoresEl = document.getElementById('result-scores')
    if (scoresEl) {
      if (state.mode === 'duo') {
        scoresEl.style.display = 'flex'
        scoresEl.innerHTML = [0,1].map(i => `<div class="rs-card"><div class="rs-animal">${state.players[i] && state.players[i].animal || '🦁'}</div><div class="rs-name">${escHtml(state.players[i] && state.players[i].name || 'Pemain')}</div><div class="rs-stars">⭐ ${state.gameStars[i] || 0}</div></div>`).join('')
      } else scoresEl.style.display = 'none'
    }
  } catch(e) { console.warn('[showResult] next/scores:', e) }

  // SECTION 3: best-stars persistence
  try {
    const bs = JSON.parse(localStorage.getItem(pkey('best-stars')) || '{}')
    const starsThisGame = state.gameStars[0]+state.gameStars[1]
    if (!bs[state.currentGame] || starsThisGame > bs[state.currentGame]) {
      bs[state.currentGame] = starsThisGame
      localStorage.setItem(pkey('best-stars'), JSON.stringify(bs))
    }
  } catch(e) { console.warn('[showResult] best-stars:', e) }

  // SECTION 4: XP + level-up (HIGH throw risk — addXP, getLevelTier, DOM nulls)
  try {
    const xpEarned = totalStars * 10
    const xpResult = addXP(xpEarned) || {}
    const xpBanner = document.getElementById('result-xp-banner')
    if (xpBanner) {
      if (xpEarned > 0 && typeof xpResult.next === 'number') {
        const tier = getLevelTier(xpResult.next) || {icon:'⭐',name:'Pemula'}
        xpBanner.style.display = 'flex'
        xpBanner.innerHTML = `<span>+${xpEarned} XP</span><span style="font-size:13px;opacity:0.85">${tier.icon} ${tier.name} — ${xpResult.next} XP total</span>`
        xpBanner.className = 'result-xp-badge'; xpBanner.style.cssText = ''
      } else xpBanner.style.display = 'none'
    }
    const lvlUp = document.getElementById('result-level-up')
    if (lvlUp) {
      if (xpResult.leveled && typeof xpResult.next === 'number') {
        const newTier = getLevelTier(xpResult.next) || {icon:'⭐'}
        const ico = document.getElementById('level-up-icon')
        if (ico) ico.textContent = newTier.icon
        lvlUp.style.display = 'flex'
      } else lvlUp.style.display = 'none'
    }
  } catch(e) { console.warn('[showResult] XP section:', e, e && e.stack) }

  // SECTION 5: deferred achievement checks
  try {
    const gameAchMap = {3:'letter_master',4:'count_master',7:'picture_master',8:'word_master',9:'trace_master'}
    setTimeout(() => {
      try {
        if (gameAchMap[state.currentGame]) checkAchievement(gameAchMap[state.currentGame])
        const played = JSON.parse(localStorage.getItem('dunia-emosi-played-games') || '{}')
        played[state.currentGame] = true
        localStorage.setItem('dunia-emosi-played-games', JSON.stringify(played))
        if (Object.keys(played).length >= 12) checkAchievement('all_games')
      } catch(_) {}
    }, 450)
  } catch(e) { console.warn('[showResult] achievement:', e) }

  // SECTION 6: header + showScreen (CRITICAL — must run, with manual fallback)
  try { if (typeof buildMenuHeader === 'function') buildMenuHeader() } catch(e) { console.error('[showResult] buildMenuHeader:', e) }
  try {
    showScreen('screen-result')
  } catch(e) {
    console.error('[showResult] showScreen failed:', e, e && e.stack)
    try {
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'))
      const sr = document.getElementById('screen-result')
      if (sr) sr.classList.add('active')
    } catch(_) {}
  }

  // SECTION 7: confetti (cosmetic)
  try {
    if (earned >= 5) { launchConfetti(3); launchConfetti(3) }
    else if (earned >= 4) launchConfetti(2)
    else if (earned >= 3) launchConfetti(1)
  } catch(e) { console.warn('[showResult] confetti:', e) }
}
// endGame — called by G10/G11/G12 with raw star count
// Task #94 (2026-04-26): split into try-catch wrapper + fallback so any throw
// in the result chain still shows SOMETHING — guarantee no freeze regardless of bug.
function endGame(stars) {
  try {
    _endGameMain(stars)
  } catch (e) {
    // Task #99: capture full stack so the fallback diagnostic shows the throw site,
    // not just an opaque message. Mobile users without DevTools rely on this.
    const stackInfo = (e && e.stack) || (e && e.message) || String(e)
    console.error('[endGame] CRITICAL — main path threw, showing fallback modal:', e, e && e.stack)
    _endGameFallback(stars, stackInfo)
  }
}

const GameScoring = {
  calc({ correct = 0, total = 1, wrong = 0, lives, maxLives, time, maxTime, bonus = 0 }) {
    if (total <= 0) return 3
    if (correct <= 0) return 0
    const accuracy = correct / total
    let stars
    if (accuracy >= 1.0) stars = 5
    else if (accuracy >= 0.85) stars = 4
    else if (accuracy >= 0.65) stars = 3
    else if (accuracy >= 0.40) stars = 2
    else stars = 1
    if (wrong > 6 && stars > 3) stars = 3
    else if (wrong > 3 && stars > 4) stars = 4
    if (typeof lives === 'number' && typeof maxLives === 'number' && maxLives > 0) {
      const livesLost = maxLives - lives
      if (livesLost >= 2 && stars > 3) stars = Math.max(3, stars - 1)
    }
    if (typeof time === 'number' && typeof maxTime === 'number' && maxTime > 0) {
      if (time < maxTime * 0.5 && stars < 5) stars = Math.min(5, stars + 1)
    }
    stars = Math.min(5, Math.max(0, stars + bonus))
    return stars
  }
}

function _endGameMain(stars) {
  console.debug('[endGame] step 1: entering, stars=', stars, 'currentGame=', state.currentGame)
  // Task #70: defensive guard — surface state.currentGame regression
  if (typeof state.currentGame !== 'number') {
    console.error('[endGame] state.currentGame missing — progress may not save.')
  }
  // Defensive guards (Task #94)
  if (!Array.isArray(state.gameStars)) state.gameStars = [0, 0]
  if (typeof state.currentPlayer !== 'number') state.currentPlayer = 0
  if (!Array.isArray(state.players) || !state.players[state.currentPlayer]) {
    state.players = state.players || []
    state.players[state.currentPlayer] = state.players[state.currentPlayer] || {name:'Pemain',animal:'🦁',stars:0,ageTier:'tumbuh'}
  }
  // Normalize raw stars to 5-star scale via unified GameScoring engine
  const maxRounds = g10State?.totalRounds || g11State?.total || 5
  const normalizedStars = GameScoring.calc({ correct: stars || 0, total: maxRounds })
  state.maxPossibleStars = 5
  state.gameStars[state.currentPlayer] = normalizedStars
  state.players[state.currentPlayer].stars = (state.players[state.currentPlayer].stars || 0) + normalizedStars
  console.debug('[endGame] step 2: state writes done, normalizedStars=', normalizedStars)
  // Save level progress
  const lv = state.selectedLevelNum || 1
  const starsEarned = normalizedStars >= 4 ? 3 : normalizedStars >= 2 ? 2 : normalizedStars >= 1 ? 1 : 0
  setLevelComplete(state.currentGame, lv, starsEarned)
  if (state.selectedRegion && state.selectedCity && typeof setCityComplete === 'function') {
    setCityComplete(state.currentGame, state.selectedRegion, state.selectedCity, starsEarned)
  }
  saveStars()
  console.debug('[endGame] step 3: progress saved')
  const p = state.players[state.currentPlayer]
  showResult(p.animal, normalizedStars>=4?'Luar Biasa! 🏆':normalizedStars>=2?'Bagus Sekali! ⭐':'Terus Berlatih! 💪', `Kamu dapat ${normalizedStars} bintang di level ${lv}!`)
  console.debug('[endGame] step 4: showResult called')
}

function _endGameFallback(stars, errMsg) {
  // Task #98 (2026-04-26): feature-parity with main modal + diagnostic display
  // Force-clear stuck flags so future tries work
  state._showingResult = false
  state._showingGameResult = false
  state.maxPossibleStars = null
  // Normalize raw stars to 5-star scale (same as main showResult path)
  let normalizedStars = stars
  try {
    const maxRounds = (typeof g10State !== 'undefined' && g10State?.totalRounds)
                   || (typeof g11State !== 'undefined' && g11State?.total)
                   || 5
    if (typeof GameScoring !== 'undefined') {
      normalizedStars = GameScoring.calc({ correct: stars || 0, total: maxRounds })
    } else {
      normalizedStars = Math.min(5, Math.round((stars || 0) / maxRounds * 5))
    }
  } catch(_) {}
  const safeStars = Math.max(0, Math.min(5, parseInt(normalizedStars) || 0))
  // Save progress (in case main path failed before saveStars)
  try {
    const lv = state.selectedLevelNum || 1
    const starsEarned = safeStars >= 4 ? 3 : safeStars >= 2 ? 2 : safeStars >= 1 ? 1 : 0
    if (typeof setLevelComplete === 'function' && typeof state.currentGame === 'number') {
      setLevelComplete(state.currentGame, lv, starsEarned)
    }
    if (state.selectedRegion && state.selectedCity && typeof setCityComplete === 'function') {
      setCityComplete(state.currentGame, state.selectedRegion, state.selectedCity, starsEarned)
    }
    if (typeof saveStars === 'function') saveStars()
  } catch(_) {}

  // Build feature-parity buttons
  const curLv = state.selectedLevelNum || 1
  const showNext = curLv < 20 && state.mode !== 'duo' && safeStars >= 3
  const existing = document.getElementById('endgame-fallback')
  if (existing) existing.remove()
  const ov = document.createElement('div')
  ov.id = 'endgame-fallback'
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:99999;font-family:"Fredoka One",cursive;padding:16px;backdrop-filter:blur(8px)'
  const titleText = safeStars >= 4 ? 'Luar Biasa! 🏆' : safeStars >= 2 ? 'Bagus Sekali! ⭐' : 'Terus Berlatih! 💪'
  const emoji = safeStars >= 4 ? '🏆' : safeStars >= 2 ? '⭐' : '💪'
  // Build buttons
  let btnsHtml = ''
  if (showNext) btnsHtml += `<button id="egfb-next" style="background:linear-gradient(160deg,#a78bfa,#8b5cf6);color:#fff;border:none;border-radius:18px;padding:14px;font-size:16px;font-weight:900;cursor:pointer;font-family:inherit;box-shadow:0 4px 0 #6d28d9">▶ Lanjut Level</button>`
  btnsHtml += `<button id="egfb-again" style="background:linear-gradient(160deg,#4ade80,#22c55e);color:#fff;border:none;border-radius:18px;padding:14px;font-size:16px;font-weight:900;cursor:pointer;font-family:inherit;box-shadow:0 4px 0 #15803d">🔄 Main Lagi</button>`
  btnsHtml += `<button id="egfb-back" style="background:rgba(139,92,246,0.06);color:#6b5080;border:1.5px solid rgba(139,92,246,0.22);border-radius:18px;padding:14px;font-size:16px;font-weight:900;cursor:pointer;font-family:inherit">⌂ Beranda</button>`
  // Task #99 (2026-04-27): show full stack trace + clipboard copy button.
  // errMsg now contains e.stack from endGame catch — escape before injecting.
  const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const diagLink = errMsg
    ? `<details style="margin-top:12px;text-align:left;color:#9b8bb0;font-size:11px"><summary style="cursor:pointer">🐛 Detail diagnostik (klik untuk salin)</summary><pre id="egfb-stack" style="white-space:pre-wrap;background:#fff;padding:8px;border-radius:8px;margin-top:6px;overflow-x:auto;max-height:200px">${escHtml(errMsg)}</pre><button id="egfb-copy" style="margin-top:6px;background:#8b5cf6;color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:11px;cursor:pointer;font-family:inherit">📋 Salin ke clipboard</button></details>`
    : ''
  ov.innerHTML = `
    <div style="background:linear-gradient(160deg,#f8f0ff,#ede2f6);border-radius:24px;padding:28px 24px;max-width:340px;width:100%;text-align:center;box-shadow:0 16px 48px rgba(0,0,0,0.5)">
      <div style="font-size:56px">${emoji}</div>
      <h2 style="font-family:'Fredoka One',cursive;color:#3b2066;margin:8px 0;font-size:24px">${titleText}</h2>
      <div style="font-size:34px;letter-spacing:4px;margin:8px 0">${uiRepeat('star','⭐',safeStars)}${uiRepeat('star-empty','☆',5-safeStars)}</div>
      <p style="color:#6b5080;margin:0 0 20px 0;font-size:14px">Kamu dapat ${safeStars} bintang di Level ${curLv}!</p>
      <div style="display:flex;flex-direction:column;gap:8px">${btnsHtml}</div>
      ${diagLink}
    </div>`
  document.body.appendChild(ov)
  // Wire buttons (after DOM insert)
  const closeAndDo = (fn) => () => { try { ov.remove() } catch(_){}; try { fn() } catch(_){} }
  const nextBtn = document.getElementById('egfb-next')
  if (nextBtn) nextBtn.onclick = closeAndDo(() => {
    if (state.selectedRegion && state.selectedCity && typeof openRegionOverlay === 'function') {
      // City-picker path: re-open picker so user picks next unlocked city
      try { exitGame && exitGame() } catch(_){}
      setTimeout(() => openRegionOverlay(state.currentGame), 80)
    } else if (typeof startGameWithLevel === 'function') {
      startGameWithLevel((curLv || 1) + 1)
    }
  })
  document.getElementById('egfb-again').onclick = closeAndDo(() => {
    if (state.selectedRegion && state.selectedCity && typeof openRegionOverlay === 'function') {
      try { exitGame && exitGame() } catch(_){}
      setTimeout(() => openRegionOverlay(state.currentGame), 80)
    } else if (typeof startGameWithLevel === 'function') {
      startGameWithLevel(curLv)
    }
  })
  document.getElementById('egfb-back').onclick = closeAndDo(() => { if (typeof exitGame === 'function') exitGame() })
  // Wire clipboard copy for the diagnostic stack (don't close modal on copy)
  const copyBtn = document.getElementById('egfb-copy')
  if (copyBtn) {
    copyBtn.onclick = (ev) => {
      ev.preventDefault(); ev.stopPropagation()
      const stackEl = document.getElementById('egfb-stack')
      const text = stackEl ? stackEl.textContent : (errMsg || '')
      const done = () => { copyBtn.textContent = '✓ Tersalin' ; setTimeout(() => copyBtn.textContent = '📋 Salin ke clipboard', 1500) }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(() => {
          try { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); done() } catch(_) {}
        })
      } else {
        try { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); done() } catch(_) {}
      }
    }
  }
}
function playAgain() { state._showingResult = false; state.maxPossibleStars = null; startGameWithLevel(state.selectedLevelNum || 1) }
function nextLevel()  { state._showingResult = false; state.maxPossibleStars = null; startGameWithLevel((state.selectedLevelNum||1) + 1) }
function goToMenu()   { state._showingResult = false; state.maxPossibleStars = null; buildMenuHeader(); showScreen('screen-menu') }

// ================================================================
// CONFETTI + SPARKLES
// ================================================================
// intensity: 0=none, 1=light(3★), 2=medium(4★), 3=full(5★)
function launchConfetti(intensity) {
  if(!intensity||intensity<=0)return
  const count=intensity===3?60:intensity===2?30:15
  const colors=intensity===3
    ?['#FCD34D','#FBBF24','#F59E0B','#FFD700','#FDE68A','#F43F5E','#8B5CF6','#14B8A6','#38BDF8','#A3E635']
    :intensity===2?['#F43F5E','#FCD34D','#14B8A6','#38BDF8','#8B5CF6','#A3E635']
    :['#94A3B8','#CBD5E1','#A3E635','#38BDF8']
  const starChance=intensity===3?0.4:intensity===2?0.2:0
  for(let i=0;i<count;i++){setTimeout(()=>{
    const p=document.createElement('div');p.className='confetti-piece'
    const size=(intensity===3?10:7)+Math.random()*(intensity===3?14:10)
    const dx=(Math.random()-0.5)*(intensity===3?300:200)+'px'
    const rot=Math.random()*1080+'deg'
    if(Math.random()<starChance){
      p.style.cssText=`left:${Math.random()*100}vw;background:url('assets/confetti-star.webp') center/contain no-repeat;width:${size}px;height:${size}px;border-radius:0;animation-duration:${1.8+Math.random()*1.4}s;--dx:${dx};--rot:${rot};`
    }else{
      p.style.cssText=`left:${Math.random()*100}vw;background:${colors[Math.floor(Math.random()*colors.length)]};width:${size}px;height:${size*1.4}px;border-radius:${Math.random()>0.5?'50%':'4px'};animation-duration:${1.8+Math.random()*1.4}s;--dx:${dx};--rot:${rot};`
    }
    document.body.appendChild(p);setTimeout(()=>p.remove(),3200)
  },i*(intensity===3?25:40))}
}
// PRD-58 B6: OS reduced motion -> decorative particles are not spawned at all (the CSS only shortens them)
function duniaReducedMotion(){ try { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) } catch(_) { return false } }
function spawnSparkles(btn,starCount) { if(duniaReducedMotion()) return
  const sc=starCount||0
  const n=sc>=5?12:sc>=3?6:3
  const icons=sc>=5?['⭐','✨','💫','🌟','🏆','🎉']:sc>=3?['⭐','✨','💫','🌟']:['✨','💫']
  const rect=btn?btn.getBoundingClientRect():null
  const cx=rect?(rect.left+rect.width/2)+'px':'50%'
  const cy=rect?(rect.top+rect.height/2)+'px':'40%'
  const maxDist=sc>=5?140:sc>=3?100:60
  const fs=sc>=5?20:sc>=3?16:12
  for(let i=0;i<n;i++){const s=document.createElement('div');s.className='sparkle';const angle=(i/n)*Math.PI*2,dist=50+Math.random()*maxDist;s.style.cssText=`left:${cx};top:${cy};--tx:${Math.cos(angle)*dist}px;--ty:${Math.sin(angle)*dist}px;--rot:${Math.random()*360}deg;animation-duration:${0.5+Math.random()*0.5}s;animation-delay:${Math.random()*0.2}s;font-size:${fs+Math.random()*10}px;`;s.textContent=icons[Math.floor(Math.random()*icons.length)];document.body.appendChild(s);setTimeout(()=>s.remove(),1200)}
}

// Card-anchored correct-answer juice: pulse + ring + tick mark + particle burst.
// Overlays are children of the button (position:absolute), so transformed ancestors
// do not misplace them. Particle burst is viewport-level best-effort.
function spawnCorrectCardJuice(btn, opts) {
  if (!btn) return
  const o = opts || {}
  try {
    if (getComputedStyle(btn).position === 'static') btn.style.position = 'relative'
    btn.style.overflow = 'visible'
    btn.classList.remove('correct-pop')
    void btn.offsetWidth
    btn.classList.add('correct-pop')
    setTimeout(() => btn.classList.remove('correct-pop'), 650)
    const ring = document.createElement('div')
    ring.className = 'correct-ring-overlay'
    btn.appendChild(ring)
    setTimeout(() => { try{ring.remove()}catch(_){} }, 950)
    if (o.tick !== false) {
      const tick = document.createElement('div')
      tick.className = 'correct-tick-overlay'
      tick.textContent = '✓'
      btn.appendChild(tick)
      setTimeout(() => { try{tick.remove()}catch(_){} }, 1400)
    }
    if (o.burst !== false) {
      const r = btn.getBoundingClientRect()
      if (typeof spawnParticleBurst === 'function') spawnParticleBurst(r.left + r.width/2, r.top + r.height/2)
    }
  } catch(_) {}
}

function spawnWrongShake(btn) {
  if (!btn) return
  try {
    btn.classList.remove('wrong-shake'); void btn.offsetWidth
    btn.classList.add('wrong-shake')
    setTimeout(() => btn.classList.remove('wrong-shake'), 550)
  } catch(_) {}
}

// ── Quiz combo streak tracker ──
// Call quizStreakHit(btn) on every correct answer, quizStreakReset() on wrong.
// Streak >= 3 shows escalating floater "COMBO x3!" near the button + excited tone.
let _quizStreak = 0
function quizStreakReset() { _quizStreak = 0 }
function quizStreakHit(btn) {
  _quizStreak++
  if (_quizStreak >= 3 && btn) {
    try {
      const r = btn.getBoundingClientRect()
      const floater = document.createElement('div')
      const tier = _quizStreak >= 7 ? 'LEGEND' : _quizStreak >= 5 ? 'HEBAT' : 'COMBO'
      const color = _quizStreak >= 7 ? '#a855f7' : _quizStreak >= 5 ? '#f43f5e' : '#f59e0b'
      floater.textContent = `${tier} ×${_quizStreak}!`
      floater.style.cssText = `position:fixed; left:${r.left + r.width/2}px; top:${r.top - 16}px; transform:translate(-50%, -50%); font-size:clamp(18px, 5vw, 28px); font-weight:900; color:${color}; text-shadow:0 2px 6px rgba(0,0,0,0.4), 0 0 12px ${color}aa; z-index:9998; pointer-events:none; font-family:var(--font-display,'Fredoka One',sans-serif); letter-spacing:1px; animation:comboFloat 1.1s cubic-bezier(0.34,1.56,0.64,1) forwards;`
      document.body.appendChild(floater)
      setTimeout(() => { try{floater.remove()}catch(_){} }, 1200)
      // Pitched-up chime for combo tier
      try {
        const base = 523 + _quizStreak * 35
        playTone(base, 0.08, 'sine', 0.22)
        setTimeout(() => playTone(base * 1.25, 0.1, 'sine', 0.22), 80)
        setTimeout(() => playTone(base * 1.5, 0.14, 'sine', 0.22), 180)
      } catch(_) {}
    } catch(_) {}
  }
}

// ================================================================
// AUDIO
// ================================================================
let audioCtx=null
function isSoundOn(){return window.DuniaSpeak.soundOn()}
function isVibrateOn(){return localStorage.getItem('dunia-emosi-vibrate')!=='off'}
function vibrate(pattern){if(isVibrateOn()&&navigator.vibrate)navigator.vibrate(pattern)}
function getAudio(){if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();return audioCtx}
function playTone(freq,dur,type='sine',vol=0.2){if(!isSoundOn())return;try{const ctx=getAudio(),osc=ctx.createOscillator(),gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.type=type;osc.frequency.value=freq;gain.gain.setValueAtTime(vol,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+dur);osc.start();osc.stop(ctx.currentTime+dur)}catch(e){}}
function playCorrect(){if(isSoundOn()&&window.SFXEngine&&SFXEngine.correct){try{SFXEngine.correct()}catch(_){}}else{playTone(523,0.1,'sine',0.2);setTimeout(()=>playTone(659,0.1,'sine',0.2),100);setTimeout(()=>playTone(784,0.2,'sine',0.25),200);setTimeout(()=>playTone(1047,0.3,'sine',0.2),340)}vibrate([20,40,20]);try{spawnCorrectConfetti()}catch(_){}/* Task #87: haptic parity per AUDIT-2026-04-25 P2-6 — double-tap pattern for correct answer engagement */}

// ── Toast notification helper (universal UX feedback pattern) ──
// Usage: showToast('Saved!', 'success') or showToast('Network error', 'error')
// Auto-stacks vertically, dismisses at 2.9s, container created on demand.
function showToast(msg, kind, durationMs){
  if (!msg) return
  const validKinds = ['success', 'info', 'warn', 'error']
  const k = validKinds.indexOf(kind) >= 0 ? kind : 'info'
  let container = document.querySelector('.toast-container')
  if (!container) {
    container = document.createElement('div')
    container.className = 'toast-container'
    container.setAttribute('role', 'status')
    container.setAttribute('aria-live', 'polite')
    document.body.appendChild(container)
  }
  const icons = { success: '✅', info: '💡', warn: '⚠', error: '⚠' }
  const t = document.createElement('div')
  t.className = 'toast toast-' + k
  t.innerHTML = '<span class="toast-icon" aria-hidden="true">' + icons[k] + '</span>' +
                '<span>' + String(msg).replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>'
  container.appendChild(t)
  setTimeout(() => { try { t.remove() } catch(_){} }, durationMs || 2900)
}
window.showToast = showToast

// Milestone celebration on every 10th level (10/20/30/40/50/60).
// Auto-fires when reaching milestone level. Shows tier-appropriate label
// + spawns extra confetti for impact.
function spawnMilestoneCelebration(level){
  if (!level || level % 10 !== 0) return
  const existing = document.querySelector('.eff-milestone')
  if (existing) { try { existing.remove() } catch(_){} }
  let text
  if (level >= 60) text = '👑 GRANDMASTER! Level ' + level
  else if (level >= 50) text = '🏆 LEGENDARY! Level ' + level
  else if (level >= 40) text = '⚡ EXPERT! Level ' + level
  else if (level >= 30) text = '🔥 MASTER! Level ' + level
  else if (level >= 20) text = '🌟 PRO! Level ' + level
  else text = '⭐ MILESTONE! Level ' + level
  const el = document.createElement('div')
  el.className = 'eff-milestone'
  el.textContent = text
  document.body.appendChild(el)
  setTimeout(() => { try { el.remove() } catch(_){} }, 2100)
  // Bonus confetti — twice the normal burst for milestone moments
  try {
    spawnCorrectConfetti()
    setTimeout(() => spawnCorrectConfetti(), 200)
  } catch(_){}
}

// Small confetti burst on correct answer — universal helper for G1-G9.
// Cap concurrent bursts to 1 so rapid streaks don't pile up.
function spawnCorrectConfetti(){ if(duniaReducedMotion()) return
  const existing = document.querySelector('.g-confetti-burst')
  if (existing) { try { existing.remove() } catch(_){} }
  const wrap = document.createElement('div')
  wrap.className = 'g-confetti-burst'
  const emojis = ['🎉','⭐','✨','💫','🌟','🎊']
  const N = 12
  for (let i = 0; i < N; i++) {
    const p = document.createElement('span')
    p.className = 'g-confetti-piece'
    const _em = emojis[Math.floor(Math.random() * emojis.length)]
    const _cn = window.UISprites && UISprites.confName(_em)
    const _cs = _cn ? UISprites.path('conf', _cn) : null
    if (_cs) { p.innerHTML = '<img src="' + _cs + '" alt="" style="width:1em;height:1em;object-fit:contain;display:block">' } else { p.textContent = _em }
    p.style.left = (10 + Math.random() * 80) + '%'
    p.style.animationDelay = (Math.random() * 250) + 'ms'
    p.style.animationDuration = (1300 + Math.random() * 500) + 'ms'
    p.style.fontSize = (16 + Math.random() * 14) + 'px'
    wrap.appendChild(p)
  }
  document.body.appendChild(wrap)
  setTimeout(() => { try { wrap.remove() } catch(_){} }, 2200)
}
let _wrongAudio=null;function playWrong(){if(!isSoundOn())return;if(window.SFXEngine&&SFXEngine.wrong){try{SFXEngine.wrong();return}catch(_){}}try{if(!_wrongAudio){_wrongAudio=new Audio('assets/wrong-buzzer.mp3');_wrongAudio.volume=0.7}const a=_wrongAudio.cloneNode();a.volume=0.7;a.play().catch(()=>{playTone(280,0.35,'sawtooth',0.1);setTimeout(()=>playTone(220,0.3,'sawtooth',0.08),150)})}catch(e){playTone(280,0.35,'sawtooth',0.1);setTimeout(()=>playTone(220,0.3,'sawtooth',0.08),150)}}
function playClick(){playTone(440,0.06,'sine',0.1)}

// ════════════════════════════════════════════════════════════════════
// Task #80 (2026-04-26): Shared animation + listener helpers per AUDIT-2026-04-25
// Phase 2.1 — Lesson L22 centralized helper pattern
// ════════════════════════════════════════════════════════════════════

/**
 * animateClass — add a CSS class for a given duration, then remove.
 * Replaces 50+ inline `el.classList.add('x'); setTimeout(()=>el.classList.remove('x'), N)` patterns.
 * Null-safe. Force-restart animation by removing class first + reflow.
 * @param {HTMLElement|null} el
 * @param {string} className
 * @param {number} durationMs
 */
function animateClass(el, className, durationMs) {
  if (!el || !className) return
  el.classList.remove(className)
  void el.offsetWidth   // force reflow so re-add restarts animation
  el.classList.add(className)
  setTimeout(() => { try { el.classList.remove(className) } catch(_) {} }, durationMs)
}

/**
 * addTrackedListener — add event listener that's tracked for later cleanup.
 * Replaces ad-hoc addEventListener calls with no removeEventListener counterpart.
 * Use clearTrackedListeners(el) on game exit/swap to prevent memory leaks.
 * @param {HTMLElement|Window|Document} el
 * @param {string} type
 * @param {Function} fn
 * @param {boolean|object} [opts]
 */
const _trackedListeners = new WeakMap()  // el → [{type, fn, opts}]
function addTrackedListener(el, type, fn, opts) {
  if (!el || !type || !fn) return
  el.addEventListener(type, fn, opts)
  let list = _trackedListeners.get(el)
  if (!list) { list = []; _trackedListeners.set(el, list) }
  list.push({type, fn, opts})
}
function clearTrackedListeners(el) {
  if (!el) return
  const list = _trackedListeners.get(el)
  if (!list) return
  for (const {type, fn, opts} of list) {
    try { el.removeEventListener(type, fn, opts) } catch(_) {}
  }
  _trackedListeners.delete(el)
}

if (typeof window !== 'undefined') {
  window.animateClass = animateClass
  window.addTrackedListener = addTrackedListener
  window.clearTrackedListeners = clearTrackedListeners
}
// Compatibility adapter for legacy playSound() calls
function playSound(kind){if(kind==='correct')return playCorrect();if(kind==='wrong')return playWrong();return playClick()}
// Share game via Web Share API
function shareGame(){if(navigator.share){navigator.share({title:'Dunia Emosi — Game Belajar Seru',text:'Yuk belajar bersama Leo si Singa! Game seru untuk anak 5-10 tahun 🦁',url:location.href}).catch(()=>{})}else{try{navigator.clipboard.writeText(location.href);alert('Link tersalin! Bagikan ke temanmu 📋')}catch(e){}}}

// Background music (menu/landing screens)
let _bgMusicUnlocked = false
function bgMusicToggle(shouldPlay){
  if(!isSoundOn()) return
  const el = document.getElementById('bg-music')
  if(!el) return
  if(shouldPlay){
    el.volume = 0.011
    if(el.paused){
      const p = el.play()
      if(p && p.catch) p.catch(()=>{})
    }
  } else {
    if(!el.paused){
      // Fade out before pausing
      let v = el.volume
      const fade = setInterval(()=>{
        v = Math.max(0, v - 0.008)
        el.volume = v
        if(v <= 0){ clearInterval(fade); el.pause(); el.volume=0.045 }
      }, 60)
    }
  }
}
// Unlock autoplay on first user interaction
document.addEventListener('click', function _unlockMusic(){
  if(!_bgMusicUnlocked){
    _bgMusicUnlocked = true
    const active = document.querySelector('.screen.active')
    if(active && MUSIC_SCREENS.has(active.id)) bgMusicToggle(true)
  }
}, {once:true, capture:true})

// ================================================================
// ATTACK SFX — type-based Pokemon attack sounds
// ================================================================
const G_ATK_SOUNDS = {
  bug:      ['Sounds/Attack/Bug/Attack Order.mp3'],
  dark:     ['Sounds/Attack/Dark/Bite.mp3','Sounds/Attack/Dark/Beat Up.mp3'],
  dragon:   ['Sounds/Attack/Dragon/Dragon Claw.mp3','Sounds/Attack/Dragon/Outrage.mp3','Sounds/Attack/Dragon/Dragon Rage.mp3'],
  electric: ['Sounds/Attack/Electric/Bolt Strike.mp3'],
  fairy:    ['Sounds/Attack/Fairy/Baby-Doll Eyes.mp3'],
  fighting: ['Sounds/Attack/Fighting/Arm Thrust 2hits.mp3','Sounds/Attack/Fighting/Aura Sphere.mp3'],
  fire:     ['Sounds/Attack/Fire/Blast Burn.mp3','Sounds/Attack/Fire/Blaze Kick.mp3','Sounds/Attack/Fire/Blue Flare.mp3'],
  flying:   ['Sounds/Attack/Flying/Aerial Ace.mp3','Sounds/Attack/Flying/Air Slash.mp3','Sounds/Attack/Flying/Acrobatics.mp3'],
  ghost:    ['Sounds/Attack/Ghost/Astonish.mp3'],
  grass:    ['Sounds/Attack/Grass/Absorb.mp3'],
  ground:   ['Sounds/Attack/Ground/Bone Club.mp3','Sounds/Attack/Ground/Bonemerang 2hits.mp3'],
  ice:      ['Sounds/Attack/Ice/Aurora Beam.mp3','Sounds/Attack/Ice/Avalanche.mp3','Sounds/Attack/Ice/Blizzard.mp3'],
  normal:   ['Sounds/Attack/Normal/Body Slam.mp3','Sounds/Attack/Normal/Barrage 2hits.mp3','Sounds/Attack/Normal/Bind.mp3'],
  poison:   ['Sounds/Attack/Poison/Acid.mp3','Sounds/Attack/Poison/Acid Spray.mp3','Sounds/Attack/Poison/Belch.mp3'],
  psychic:  ['Sounds/Attack/Psychic/Barrier.mp3'],
  rock:     ['Sounds/Attack/Rock/Ancient Power.mp3'],
  steel:    ['Sounds/Attack/Steel/Autotomize.mp3'],
  water:    ['Sounds/Attack/Water/Aqua Jet.mp3','Sounds/Attack/Water/Aqua Tail.mp3'],
}

// Cache Audio elements per unique src to avoid repeated allocation
const _atkAudioCache = {}
function playAttackSound(type) {
  if (!isSoundOn()) return
  const key = (type || 'normal').toLowerCase()
  const pool = G_ATK_SOUNDS[key] || G_ATK_SOUNDS.normal
  const src = pool[Math.floor(Math.random() * pool.length)]
  if (!_atkAudioCache[src]) _atkAudioCache[src] = new Audio(src)
  const audio = _atkAudioCache[src]
  audio.volume = 0.62
  audio.currentTime = 0
  audio.play().catch(() => {})
}

// Battle BGM (G10, G13 battle screens)
let _battleBgmEl = null
function battleBgmPlay(){
  if(!isSoundOn()) return
  if(!_battleBgmEl) _battleBgmEl = document.getElementById('battle-bgm')
  if(!_battleBgmEl) return
  _battleBgmEl.volume = 0.45
  _battleBgmEl.currentTime = 0
  const p = _battleBgmEl.play()
  if(p && p.catch) p.catch(()=>{
    // Retry once — some mobile browsers need a second attempt after gesture context
    setTimeout(()=>{ if(_battleBgmEl && isSoundOn()){ _battleBgmEl.currentTime=0; _battleBgmEl.play().catch(()=>{}) } }, 300)
  })
}
function battleBgmStop(){
  if(!_battleBgmEl) _battleBgmEl = document.getElementById('battle-bgm')
  if(!_battleBgmEl) return
  if(!_battleBgmEl.paused){
    let v = _battleBgmEl.volume
    const fade = setInterval(()=>{
      v = Math.max(0, v - 0.05)
      _battleBgmEl.volume = v
      if(v <= 0){ clearInterval(fade); _battleBgmEl.pause(); _battleBgmEl.volume=0.45 }
    }, 40)
  }
}

// Ambient audio system
let ambientNodes=[]
function stopAmbient(){ambientNodes.forEach(n=>{try{n.stop()}catch(e){}});ambientNodes=[]}
function startAmbient(type){
  stopAmbient()
  try{
    const ctx=getAudio()
    if(type==='city'){
      // Synth city beat: 4/4 kick pattern
      const bpm=100,beat=60/bpm,notes=[220,0,165,0,220,0,165,196]
      notes.forEach((f,i)=>{if(!f)return;const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.type='square';o.frequency.value=f;g.gain.setValueAtTime(0,ctx.currentTime+i*beat*0.25);g.gain.linearRampToValueAtTime(0.04,ctx.currentTime+i*beat*0.25+0.05);g.gain.linearRampToValueAtTime(0,ctx.currentTime+i*beat*0.25+0.15);o.start(ctx.currentTime+i*beat*0.25);o.stop(ctx.currentTime+i*beat*0.25+0.2);ambientNodes.push(o)})
    } else if(type==='forest'){
      // Bird chirp arpeggios
      const chirps=[784,988,1175,988,784,659,784]
      chirps.forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0,ctx.currentTime+i*0.18);g.gain.linearRampToValueAtTime(0.05,ctx.currentTime+i*0.18+0.04);g.gain.linearRampToValueAtTime(0,ctx.currentTime+i*0.18+0.12);o.start(ctx.currentTime+i*0.18);o.stop(ctx.currentTime+i*0.18+0.15);ambientNodes.push(o)})
    } else if(type==='space'){
      // Slow pad chord
      [196,247,294].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0,ctx.currentTime);g.gain.linearRampToValueAtTime(0.025,ctx.currentTime+1.5);g.gain.linearRampToValueAtTime(0,ctx.currentTime+5);o.start();o.stop(ctx.currentTime+5);ambientNodes.push(o)})
    } else if(type==='body'){
      // Heartbeat
      [0,0.45].forEach(t=>{const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.type='sine';o.frequency.value=80;g.gain.setValueAtTime(0,ctx.currentTime+t);g.gain.linearRampToValueAtTime(0.08,ctx.currentTime+t+0.05);g.gain.linearRampToValueAtTime(0,ctx.currentTime+t+0.25);o.start(ctx.currentTime+t);o.stop(ctx.currentTime+t+0.3);ambientNodes.push(o)})
    }
  }catch(e){}
}

// ================================================================
// PRD-42: "dengar lalu pilih" rounds (G3 Huruf Hutan, G8 Susun Kata). The line is spoken by the device's Indonesian
// voice (DuniaSpeak). The repo has no Indonesian letter/word clips (assets/spelling/audio is English: "U" is heard as
// "You"), so a listen round is played only when sound is on and an id-ID voice exists; otherwise the round stays a
// normal one and no child is left in front of a silent speaker.
// ================================================================
const LISTEN_SVG='<svg viewBox="0 0 24 24" width="52" height="52" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>'
function duniaCanListen(){ return false }   // PRD-55: nothing is spoken, so no listen rounds or listen buttons
function duniaSayLine(text){ try{ return !!(window.DuniaSpeak&&DuniaSpeak.say(text,{lang:'id-ID',rate:0.8})) }catch(e){return false} }
function listenButtonHTML(id){
  return `<button type="button" class="dunia-listen-btn" id="${id}" aria-label="Dengar lagi" style="width:96px;height:96px;border-radius:50%;border:0;display:inline-flex;align-items:center;justify-content:center;background:linear-gradient(180deg,#38bdf8,#0284c7);color:#fff;box-shadow:0 6px 0 #075985,0 10px 22px rgba(0,0,0,.25);cursor:pointer;touch-action:manipulation">${LISTEN_SVG}</button>`
}
function duniaReport(game,domain,skill,item,ok){ try{ if(window.DuniaAnswer) DuniaAnswer({game,domain,skill,item,ok:!!ok,tries:1}) }catch(e){} } function duniaReportOp(game,op,item,ok){ const k=op==='knowledge'; duniaReport(game,k?'umum':'matematika',k?'umum':({'+':'add','-':'sub','*':'multiply','×':'multiply','÷':'divide',':':'divide'})[op]||'hitung',item,ok) } // PRD-48

// ================================================================
// GAME 3: HURUF HUTAN
// ================================================================
let g3State={}
function initGame3(){
  initJungleWorld()
  const diff=DIFF[state.selectedLevel]
  const tier=state.players[state.currentPlayer].ageTier||'tumbuh'
  const letters=getAgeLetters(tier)
  g3State={round:0,maxRound:diff.rounds,choices:diff.choices,correct:0,answered:false,shuffled:[...letters].sort(()=>Math.random()-0.5)}
  state.currentPlayer=0; updateGameStarDisplay(); buildDots('g3-dots',diff.rounds,0); nextG3Round()
}
function nextG3Round(){
  const totalRounds=state.mode==='duo'?g3State.maxRound*2:g3State.maxRound
  if(g3State.round>=totalRounds){const perfect=g3State.correct>=g3State.maxRound;if(perfect)checkAchievements('perfect_g3');showResult('🔤','Huruf Hutan Selesai!','Kamu jago mengenal huruf dan angka! 📚');return}
  if(state.mode==='duo'&&g3State.round===g3State.maxRound){state.currentPlayer=1;g3State.correct=0;g3State.shuffled=[...ANIMAL_LETTERS].sort(()=>Math.random()-0.5);updateGameStarDisplay();showFeedback(true,0,`Giliran ${state.players[1].name}! 🎮`,nextG3Round);return}
  g3State.answered=false; const roundInSet=g3State.round%g3State.maxRound; buildDots('g3-dots',g3State.maxRound,roundInSet)
  const isLetterMode=(roundInSet/g3State.maxRound)<0.6
  const item=pickBag('g3',g3State.shuffled)||g3State.shuffled[roundInSet%g3State.shuffled.length],numChoices=g3State.choices
  // PRD-42: every third round of the letter part is a listen round (only with an Indonesian voice, see duniaCanListen)
  const isListen=isLetterMode&&roundInSet%3===2&&duniaCanListen()
  g3State.currentItem=item; g3State.isLetterMode=isLetterMode; g3State.isListen=isListen
  document.getElementById('g3-mode-badge').textContent=isLetterMode?'Level: Huruf 🔤':'Level: Angka 🔢'
  document.getElementById('g3-animal').textContent=item.animal
  document.getElementById('g3-progress-bar').style.width=((roundInSet/g3State.maxRound)*100)+'%'
  // the guide's line and the animal plate belong to the reading rounds; a listen round hides the plate and says what to do
  const _mg=document.getElementById('g3-mg'); if(_mg){ if(_mg.dataset.read==null) _mg.dataset.read=_mg.textContent; _mg.textContent=isListen?'Dengar suaranya, lalu ketuk hurufnya':_mg.dataset.read }
  document.getElementById('g3-animal').style.display=isListen?'none':''
  if(isListen){
    const _ans=item.word[0]; g3State.blankPos=0
    document.getElementById('g3-word').innerHTML=listenButtonHTML('g3-listen')
    document.getElementById('g3-hint').textContent='Dengar, lalu pilih hurufnya'
    const say=()=>duniaSayLine('Huruf '+_ans)
    document.getElementById('g3-listen').onclick=say; setTimeout(say,250)
    const wrongLetters=ALL_LETTERS.split('').filter(l=>l!==_ans).sort(()=>Math.random()-0.5).slice(0,numChoices-1)
    renderG3Choices([_ans,...wrongLetters].sort(()=>Math.random()-0.5),_ans,false,numChoices)
  } else if(isLetterMode){
    // Blank a RANDOM position (was always the first letter → trivially predictable).
    // Easy stays position 0 for the youngest; medium/hard blank anywhere. Words are
    // ALL-CAPS so the blanked char already matches the uppercase choice buttons.
    const _bp=(state.selectedLevel==='easy')?0:Math.floor(Math.random()*item.word.length)
    g3State.blankPos=_bp; const _ans=item.word[_bp]
    document.getElementById('g3-word').innerHTML=item.word.split('').map((ch,i)=>i===_bp?`<span class="g3-letter g3-blank" id="g3-ltr-${i}">_</span>`:`<span class="g3-letter" id="g3-ltr-${i}">${ch}</span>`).join('')
    document.getElementById('g3-hint').textContent=`💡 ${item.hint}`
    const wrongLetters=ALL_LETTERS.split('').filter(l=>l!==_ans).sort(()=>Math.random()-0.5).slice(0,numChoices-1)
    renderG3Choices([_ans,...wrongLetters].sort(()=>Math.random()-0.5),_ans,false,numChoices)
  } else {
    const maxNum=state.selectedLevel==='hard'?9:8,displayCount=Math.min(item.num,9)
    document.getElementById('g3-word').textContent=item.animal.repeat(displayCount)
    document.getElementById('g3-hint').textContent=`Ada berapa ${item.word.toLowerCase()} di atas?`
    const correctNum=displayCount,wrongs=new Set()
    while(wrongs.size<numChoices-1){const r=Math.max(1,Math.min(maxNum,correctNum+Math.floor(Math.random()*6)-3));if(r!==correctNum)wrongs.add(r)}
    renderG3Choices([correctNum,...[...wrongs]].sort(()=>Math.random()-0.5).map(String),String(correctNum),true,numChoices)
  }
  const p=state.mode==='duo'?`${state.players[state.currentPlayer].name} — ${roundInSet+1}/${g3State.maxRound}`:`${roundInSet+1} / ${g3State.maxRound}`
  document.getElementById('g3-progress').textContent=p; g3State.round++
}
function renderG3Choices(choices,correctVal,isNum,numChoices){
  const el=document.getElementById('g3-choices')
  el.style.gridTemplateColumns=numChoices<=3?'1fr 1fr 1fr':(numChoices<=4?'1fr 1fr':'1fr 1fr 1fr')
  el.innerHTML=''
  choices.slice(0,numChoices).forEach(ch=>{
    const btn=document.createElement('button'); btn.className='g3-choice-btn'; btn.textContent=ch
    if(numChoices>4) btn.style.fontSize='32px'
    btn.onclick=()=>{
      if(g3State.answered)return;g3State.answered=true
      const correct=ch===correctVal
      if(g3State.isLetterMode) duniaReport('g3','bahasa','awal',(g3State.isListen?'dengar ':'')+(g3State.currentItem&&g3State.currentItem.word),correct) // PRD-42
      el.querySelectorAll('.g3-choice-btn').forEach(b=>{b.style.pointerEvents='none';if(b.textContent===correctVal){b.classList.add('correct');if(!correct)spawnCorrectCardJuice(b,{burst:false})}})
      const hintEl=document.getElementById('g3-hint')
      if(!correct){
        btn.classList.add('wrong');spawnWrongShake(btn);quizStreakReset();playWrong();flashScreen('red')
        const it=g3State.currentItem
        if(g3State.isLetterMode && it){
          hintEl.innerHTML=`💡 <b>${correctVal}</b>... seperti <b>${it.animal} ${it.word}</b>. Kata ini mulai dengan huruf <b>${correctVal}</b>!`
        } else if(it){
          hintEl.innerHTML=`💡 Coba hitung lagi: ada <b>${it.num}</b> ${it.animal} di atas!`
        }
        setTimeout(nextG3Round,2000)
      }else{
        if(g3State.isLetterMode&&!g3State.isListen){const bp=g3State.blankPos||0;const ltr=document.getElementById('g3-ltr-'+bp);if(ltr){ltr.classList.remove('g3-blank');ltr.textContent=g3State.currentItem.word[bp];ltr.classList.add('highlight')}}
        playCorrect();spawnCorrectCardJuice(btn);quizStreakHit(btn);addStars(1,btn);flashScreen('green');g3State.correct++
        setTimeout(nextG3Round,1300)
      }
    }
    el.appendChild(btn)
  })
}

// ================================================================
// GAME 4: HITUNG BINATANG
// ================================================================
let g4State={}
function initGame4(){
  initSavannaWorld()
  const diff=DIFF[state.selectedLevel]
  const tier=state.players[state.currentPlayer].ageTier||'tumbuh'
  g4State={round:0,maxRound:diff.rounds,timerSec:diff.timer,choices:diff.choices,correct:0,answered:false,maxCount:getAgeMaxCount(tier),pokemonMode:false,currentCount:0,currentAnimal:'',currentPoke:null,currentChoices:[]}
  state.currentPlayer=0; updateGameStarDisplay(); buildDots('g4-dots',diff.rounds,0)
  // Reset toggle buttons
  document.getElementById('g4-btn-normal').classList.add('active')
  document.getElementById('g4-btn-poke').classList.remove('active')
  nextG4Round()
}
function setG4Mode(isPoke){
  g4State.pokemonMode=isPoke
  document.getElementById('g4-btn-normal').classList.toggle('active',!isPoke)
  document.getElementById('g4-btn-poke').classList.toggle('active',isPoke)
  document.getElementById('g4-mg').textContent=isPoke?'Hitung semua Pokémon-nya ya!':'Hitung semua ya! Jangan sampai ada yang terlewat'
  if(g4State.currentCount>0){
    clearInterval(state.g4Timer); g4State.answered=false
    renderG4Content(); startG4Timer()
  }
}
// PRD-51: three kinds of round, rotating count -> flash -> compare (Pokémon mode keeps plain counting):
//   count    count the sprites, up to 10 or 20 (age band, capped by DuniaMastery 'matematika' tier 1-2 to 10)
//   flash    1..5 sprites shown 1.5 s, then hidden: say how many without counting one by one (subitizing)
//   compare  two groups of two sprites: "mana yang lebih banyak?", answered by tapping a picture
// Sprites come from DBLabeled (hewan / buah / benda, the same art as G7), never emoji. After the 2nd wrong tap on a
// count or flash round the number hint starts: each sprite gets its number when tapped (1, 2, 3 in tap order), the timer
// stops and the round still takes the right answer. Only the first tap is reported (DuniaBus 'answer').
const G4_GROUPS=['hewan','buah','benda'], G4_LABEL={hewan:'binatang',buah:'buah',benda:'benda'}
function g4Pick(group,not){
  try{ if(window.DBLabeled&&DBLabeled.all){ const all=DBLabeled.all().filter(x=>x.group===group&&x.src&&x.id!==not); if(all.length) return all[Math.floor(Math.random()*all.length)] } }catch(e){}
  return null
}
function g4MaxCount(){
  const tier=(state.players[state.currentPlayer]||{}).ageTier||'tumbuh'
  let mx=tier==='cilik'?10:20
  try{ if(window.DuniaMastery) mx=DuniaMastery.cap('matematika',mx,{1:10,2:10}) }catch(e){}
  return mx
}
function nextG4Round(){
  clearInterval(state.g4Timer); clearTimeout(state.g4FlashTO)
  const totalRounds=state.mode==='duo'?g4State.maxRound*2:g4State.maxRound
  if(g4State.round>=totalRounds){const perfect=g4State.correct>=g4State.maxRound;if(perfect)checkAchievements('perfect_g4');showResult('🔢','Hitung Selesai!','Kamu jago menghitung!');return}
  if(state.mode==='duo'&&g4State.round===g4State.maxRound){state.currentPlayer=1;g4State.correct=0;updateGameStarDisplay();showFeedback(true,0,`Giliran ${state.players[1].name}!`,nextG4Round);return}
  g4State.answered=false; g4State.round++; g4State.wrongs=0; g4State.hint=false; g4State.reported=false; g4State.tapNo=0
  const roundInSet=(g4State.round-1)%g4State.maxRound; buildDots('g4-dots',g4State.maxRound,roundInSet)
  document.getElementById('g4-progress-bar').style.width=((roundInSet/g4State.maxRound)*100)+'%'
  document.getElementById('g4-progress').textContent=state.mode==='duo'?`${state.players[state.currentPlayer].name} — ${roundInSet+1}/${g4State.maxRound}`:`${roundInSet+1} / ${g4State.maxRound}`
  g4State.maxCount=g4MaxCount()
  const kind=g4State.forceKind||(g4State.pokemonMode?'count':['count','flash','compare'][roundInSet%3])
  g4State.kind=kind
  const group=G4_GROUPS[Math.floor((g4State.round-1)/3)%3]; g4State.group=group
  g4State.item=g4Pick(group); g4State.item2=null; g4State.groupCounts=null
  if(kind==='compare'){
    g4State.item2=g4Pick(group,g4State.item&&g4State.item.id)
    const top=Math.min(10,g4State.maxCount), gap=state.selectedLevel==='easy'?3:state.selectedLevel==='hard'?1:2
    let n1,n2; do{ n1=1+Math.floor(Math.random()*top); n2=1+Math.floor(Math.random()*top) }while(Math.abs(n1-n2)<gap)
    g4State.groupCounts=[n1,n2]; g4State.currentCount=Math.max(n1,n2); g4State.answer=n1>n2?'a':'b'
    g4State.currentChoices=['a','b']
  } else {
    const top=kind==='flash'?5:g4State.maxCount
    g4State.currentCount=g4State.forceCount?Math.min(g4State.forceCount,top):1+Math.floor(Math.random()*top); g4State.forceCount=0
    g4State.answer=g4State.currentCount
    // decoys: the nearest numbers in 1..top (a little shuffled). The old +-3 draw never ended when the answer sat at
    // an edge and 6 choices were asked (hard level, answer 1: only 2 and 3 can be drawn)
    const c0=g4State.currentCount, want=Math.min(g4State.choices-1,top-1)
    const wrongs=[];for(let r=1;r<=top;r++) if(r!==c0) wrongs.push(r)
    wrongs.sort((x,y)=>(Math.abs(x-c0)+Math.random()*1.5)-(Math.abs(y-c0)+Math.random()*1.5))
    g4State.currentChoices=[c0,...wrongs.slice(0,want)].sort(()=>Math.random()-0.5)
  }
  // Pokemon mode: pick target + 2 distractor types, each 1-2 copies
  const pokeIdx=Math.floor(Math.random()*POKEMON_G4.length)
  g4State.currentPoke=POKEMON_G4[pokeIdx]
  const otherPokes=POKEMON_G4.filter((_,i)=>i!==pokeIdx).sort(()=>Math.random()-0.5)
  g4State.distractors=otherPokes.slice(0,2).map(p=>({poke:p,count:1+Math.floor(Math.random()*2)}))
  // Fairness: items animate in staggered (i*55ms). The timer starts only AFTER the last item has appeared
  // (a flash round: after the pictures are hidden again).
  renderG4Content()
  const enterMs=Math.min(1000,(g4State.currentCount||1)*55+220)
  document.getElementById('g4-timer-text').textContent='Siap…'
  clearTimeout(state.g4StartTO)
  if(kind==='flash'&&!g4State.pokemonMode){
    state.g4FlashTO=setTimeout(()=>{ const g=document.getElementById('g4-animals'); if(g&&!g4State.hint) g.classList.add('g4-hidden') },enterMs+1500)
    state.g4StartTO=setTimeout(startG4Timer,enterMs+1500)
  } else state.g4StartTO=setTimeout(startG4Timer,enterMs)
}
function g4Img(src,sz,i){
  const img=document.createElement('img'); img.className='g4-animal-item'; img.src=src; img.alt=''; img.decoding='async'
  img.style.width=sz; img.style.height=sz; img.style.objectFit='contain'; img.style.animationDelay=(i*55)+'ms'
  return img
}
function renderG4Content(){
  const {currentCount:count,currentPoke,pokemonMode,choices:numChoices}=g4State
  const grid=document.getElementById('g4-animals'); grid.innerHTML=''; grid.classList.remove('g4-hidden','g4-pair','g4-hinting')
  const q=document.getElementById('g4-question'), mg=document.getElementById('g4-mg')
  if(pokemonMode&&currentPoke){
    // Build mixed grid: count copies of target + distractor copies, then shuffle
    const items=[]
    for(let i=0;i<count;i++) items.push(currentPoke)
    const distractors=g4State.distractors||[]
    distractors.forEach(d=>{ for(let i=0;i<d.count;i++) items.push(d.poke) })
    items.sort(()=>Math.random()-0.5)
    const totalItems = items.length
    const sprSize = totalItems > 12 ? 'clamp(30px,8vw,44px)' : totalItems > 8 ? 'clamp(36px,10vw,52px)' : 'clamp(40px,12vw,64px)'
    items.forEach((poke,i)=>{
      const img=document.createElement('img')
      img.className='g4-animal-item g4-poke-img'
      img.style.width=sprSize; img.style.height=sprSize
      // Hotfix #104 (2026-04-28): shared cascade.
      const slug = _pokeSlug(poke)
      if (typeof attachSpriteCascade === 'function' && typeof buildPokeSources === 'function') {
        attachSpriteCascade(img, buildPokeSources(slug, poke.id), '')
      } else {
        img.src = pokeSpriteAlt2(slug) || `assets/Pokemon/others/pokeball.svg`
      }
      img.alt=poke.name
      img.style.animationDelay=(i*55)+'ms'
      if(poke.id!==currentPoke.id) img.style.opacity='0.75'
      grid.appendChild(img)
    })
    q.textContent=`Ada berapa "${currentPoke.name}"?`
  } else if(g4State.kind==='compare'){
    grid.classList.add('g4-pair')
    const [n1,n2]=g4State.groupCounts, its=[g4State.item,g4State.item2]
    const sz=Math.max(n1,n2)>6?'clamp(30px,8vw,46px)':'clamp(40px,11vw,60px)'
    ;[n1,n2].forEach((n,k)=>{
      const box=document.createElement('div'); box.className='g4-group'; box.dataset.side=k?'b':'a'
      for(let i=0;i<n;i++) box.appendChild(g4Cell(g4Img(its[k].src,sz,i)))
      grid.appendChild(box)
    })
    q.textContent='Mana yang lebih banyak?'
  } else {
    const it=g4State.item
    const sz=count>12?'clamp(30px,8vw,46px)':count>8?'clamp(38px,10vw,56px)':'clamp(46px,13vw,68px)'
    for(let i=0;i<count;i++) grid.appendChild(g4Cell(g4Img(it.src,sz,i)))
    const nm=String(it.name||G4_LABEL[g4State.group]).toLowerCase()
    q.textContent=g4State.kind==='flash'?`Lihat sekilas! Ada berapa ${nm}?`:`Ada berapa ${nm}?`
  }
  if(mg) mg.textContent=pokemonMode?'Hitung semua Pokémon-nya ya!':g4State.kind==='flash'?'Lihat cepat, gambarnya akan bersembunyi!':g4State.kind==='compare'?'Bandingkan dua kelompok, mana yang lebih banyak?':'Hitung semua ya! Jangan sampai ada yang terlewat'
  // Render choices
  const choicesEl=document.getElementById('g4-choices'); choicesEl.innerHTML=''; choicesEl.classList.toggle('g4-pics',g4State.kind==='compare'&&!pokemonMode)
  g4State.currentChoices.forEach(ch=>{
    const btn=document.createElement('button'); btn.className='g4-choice-btn'; btn.dataset.v=ch
    if(g4State.kind==='compare'&&!pokemonMode){ const it=ch==='a'?g4State.item:g4State.item2; btn.appendChild(g4Img(it.src,'min(56px,12vh)',0)); btn.firstChild.className='g4-pic'; btn.setAttribute('aria-label','Kelompok '+(ch==='a'?'kiri':'kanan')) }
    else { btn.textContent=ch; if(numChoices>4)btn.style.fontSize='26px' }
    btn.onclick=()=>g4Answer(ch,btn)
    choicesEl.appendChild(btn)
  })
}
function g4Cell(img){ const c=document.createElement('span'); c.className='g4-cell'; c.appendChild(img); return c }
function g4Answer(ch,btn){
  if(g4State.answered||btn.disabled) return
  const right=String(ch)===String(g4State.answer), choicesEl=document.getElementById('g4-choices')
  if(!g4State.reported){ g4State.reported=true; duniaReport('g4','matematika',g4State.kind==='compare'?'compare':'count',g4State.kind+' '+(g4State.groupCounts?g4State.groupCounts.join('-'):g4State.currentCount),right) }
  if(right){
    g4State.answered=true; clearInterval(state.g4Timer); clearTimeout(state.g4FlashTO)
    choicesEl.querySelectorAll('.g4-choice-btn').forEach(b=>b.style.pointerEvents='none')
    btn.classList.add('correct'); playCorrect(); spawnCorrectCardJuice(btn); flashScreen('green')
    if(!g4State.wrongs){ quizStreakHit(btn); addStars(1,btn); g4State.correct++ }
    document.getElementById('g4-animals').classList.remove('g4-hidden')
    setTimeout(nextG4Round,1300); return
  }
  g4State.wrongs++; btn.disabled=true; btn.classList.add('wrong'); spawnWrongShake(btn); quizStreakReset(); playWrong()
  const left=[...choicesEl.querySelectorAll('.g4-choice-btn')].filter(b=>!b.disabled)
  if(g4State.wrongs>=2&&g4State.kind!=='compare') g4StartHint()
  if(left.length<=1||(g4State.kind==='compare')){   // nothing left to try: show the answer and go on
    g4State.answered=true; clearInterval(state.g4Timer); flashScreen('red')
    choicesEl.querySelectorAll('.g4-choice-btn').forEach(b=>{b.style.pointerEvents='none';if(String(b.dataset.v)===String(g4State.answer)){b.classList.add('correct');spawnCorrectCardJuice(b,{burst:false})}})
    document.getElementById('g4-animals').classList.remove('g4-hidden')
    setTimeout(nextG4Round,1600)
  }
}
// the number hint (PRD-51 L2): the pictures come back, each tap on one gives it the next number
function g4StartHint(){
  if(g4State.hint) return
  g4State.hint=true; g4State.tapNo=0; clearInterval(state.g4Timer); clearTimeout(state.g4FlashTO)
  const grid=document.getElementById('g4-animals'); grid.classList.remove('g4-hidden'); grid.classList.add('g4-hinting')
  document.getElementById('g4-timer-text').textContent='Ketuk satu per satu, Kakak beri nomor'
  const mg=document.getElementById('g4-mg'); if(mg) mg.textContent='Ketuk tiap gambar, nanti muncul nomornya'
  grid.querySelectorAll('.g4-animal-item').forEach(img=>{
    img.classList.add('g4-tap')
    img.addEventListener('click',()=>{
      const cell=img.closest('.g4-cell')||img.parentElement
      if(!cell||cell.querySelector('.g4-num')) return
      const n=document.createElement('span'); n.className='g4-num'; n.textContent=String(++g4State.tapNo); cell.appendChild(n)
      try{ playClick() }catch(e){}
    })
  })
}
function startG4Timer(){
  const fill=document.getElementById('g4-fill'),count=g4State.currentCount
  if(g4State.hint||g4State.answered) return
  fill.style.width='100%'; fill.style.background='linear-gradient(90deg,#F59E0B,#FCD34D)'
  let timeLeft=g4State.timerSec
  document.getElementById('g4-timer-text').textContent=timeLeft+' detik'
  state.g4Timer=setInterval(()=>{
    timeLeft--;const pct=(timeLeft/g4State.timerSec)*100;fill.style.width=pct+'%'
    if(timeLeft<=Math.floor(g4State.timerSec*0.35))fill.style.background='linear-gradient(90deg,#F43F5E,#F59E0B)'
    document.getElementById('g4-timer-text').textContent=timeLeft+' detik'
    if(timeLeft<=0){clearInterval(state.g4Timer);if(!g4State.answered){g4State.answered=true;if(!g4State.reported){g4State.reported=true;duniaReport('g4','matematika',g4State.kind==='compare'?'compare':'count',String(count),false)};const choicesEl=document.getElementById('g4-choices');choicesEl.querySelectorAll('.g4-choice-btn').forEach(b=>{b.style.pointerEvents='none';if(String(b.dataset.v)===String(g4State.answer))b.classList.add('correct')});document.getElementById('g4-animals').classList.remove('g4-hidden');playWrong();flashScreen('red');setTimeout(nextG4Round,1300)}}
  },1000)
}

// GAME 6 (Petualangan Mobil) retired 2026-11-26 by the owner (PRD-58 E9): no map tile, page removed

// ================================================================
// GAME 7: TEBAK GAMBAR
// ================================================================
let g7State = {}
// PRD-50: the bank is the shared sprite library only (no emoji): DBLabeled (assets/db/<cat>/NNN.webp, 224 labelled
// items in 14 groups) plus the names the Timmy/G11 bank gives assets/db/lib/<key>.webp (TKQuestions.names), one item
// per name. Decoys always come from the answer's group; every 3rd round is a listen round when an id-ID voice exists.
const G7_LIB_GROUP={animals:'hewan',animal:'hewan','tk-world':'hewan',food:'makanan',vehicles:'kendaraan','tk-ship':'kendaraan',
  nature:'alam',park:'alam',gt:'alam',things:'benda',real:'benda',school:'sekolah','tk-prop':'benda',game:'benda',toys:'mainan','tk-char':'profesi'}
const G7_LIB_SKIP={'tk-key/timmy-sleeping':1}   // a story character, not a word
function g7BuildPool(){
  const pool=[], seen=new Set()
  const add=(id,word,src,group)=>{ const w=String(word||'').trim(); if(!w||!src||!group) return; const k=w.toUpperCase(); if(seen.has(k)) return; seen.add(k); pool.push({id,word:k,src,group}) }
  try{ if(window.DBLabeled&&DBLabeled.all) DBLabeled.all().forEach(it=>add(it.id,it.name,it.src,it.group)) }catch(e){}
  try{ const N=window.TKQuestions&&TKQuestions.names; if(N) Object.keys(N).forEach(k=>{ if(G7_LIB_SKIP[k]) return
    const top=k.split('/')[0]==='real'?k.split('/')[1]:k.split('/')[0]
    add('lib-'+k,N[k],'assets/db/lib/'+k+'.webp',G7_LIB_GROUP[top]) }) }catch(e){}
  // a group too small for 3 decoys joins 'benda' (it never happens with today's data; kept so a new group cannot break a round)
  const size={}; pool.forEach(x=>size[x.group]=(size[x.group]||0)+1); pool.forEach(x=>{ if(size[x.group]<4) x.group='benda' })
  return pool
}
function initGame7() {
  if(!window.TKQuestions&&!g7State.tkTried&&window.DuniaLoad){ g7State={tkTried:true}; DuniaLoad('tk-questions.js',initGame7); return }
  const diff = state.selectedLevel||'medium'
  g7State = {tkTried:true,round:0,maxRound:DIFF[diff].rounds,mode:'img2word',answered:false,shuffled:g7BuildPool().sort(()=>Math.random()-0.5),usedIds:new Set()}
  state.currentPlayer = 0; updateGameStarDisplay(); nextG7Round()
}
function g7Pic(src,h){ return `<img src="${src}" alt="" decoding="async" style="height:${h};max-width:100%;object-fit:contain;filter:drop-shadow(0 6px 10px rgba(0,0,0,.22))">` }
function nextG7Round() {
  const totalRounds = state.mode==='duo'?g7State.maxRound*2:g7State.maxRound
  if(g7State.round>=totalRounds){
    if(state.mode==='duo'&&g7State.round===g7State.maxRound){state.currentPlayer=1;updateGameStarDisplay();showFeedback(true,0,`Giliran ${state.players[1].name}!`,nextG7Round);return}
    showResult('🖼️','Tebak Gambar Selesai!','Kamu kenal banyak kata!'); return
  }
  g7State.answered = false
  const roundInSet = g7State.round % g7State.maxRound
  const diff = state.selectedLevel||'medium'
  // PRD-58 A4/E2: easy was img2word only; every third round (the old listen slot, silent since PRD-55) reads the word and picks the picture
  g7State.mode = diff==='easy'?(roundInSet%3===2?'word2img':'img2word'):(roundInSet<Math.ceil(g7State.maxRound/2)?'img2word':'word2img')
  if(roundInSet%3===2&&duniaCanListen()) g7State.mode='listen'   // PRD-50 L3: hear the word, pick the picture
  // Pick an item not asked in this session (the bank is far larger than a session; reset only if it ran out)
  let pool = g7State.shuffled.filter(w => !g7State.usedIds.has(w.id))
  if (!pool.length) { g7State.usedIds = new Set(); pool = [...g7State.shuffled] }
  const correct = pool[0]; g7State.usedIds.add(correct.id)
  const head=w=>w.split(' ')[0]
  let decoyPool=g7State.shuffled.filter(w=>w.group===correct.group&&w.id!==correct.id&&head(w.word)!==head(correct.word))
  if(decoyPool.length<3) decoyPool=g7State.shuffled.filter(w=>w.group===correct.group&&w.id!==correct.id)
  const decoys = decoyPool.sort(()=>Math.random()-0.5).slice(0,3)
  const choices = [correct,...decoys].sort(()=>Math.random()-0.5)
  g7State.cur=correct; g7State.choiceGroups=choices.map(c=>c.group)
  document.getElementById('g7-mode-badge').textContent = g7State.mode==='img2word'?'Gambar ke Kata':g7State.mode==='listen'?'Dengar lalu pilih':'Kata ke Gambar'
  document.getElementById('g7-progress-bar').style.width = ((roundInSet/g7State.maxRound)*100)+'%'
  const displayEl=document.getElementById('g7-display'),questionEl=document.getElementById('g7-question')
  displayEl.classList.remove('anim-correct'); displayEl.classList.toggle('g7-word',g7State.mode==='word2img')
  if(g7State.mode==='img2word'){
    displayEl.innerHTML=g7Pic(correct.src,'min(30vh,180px)')
    questionEl.textContent='Ayo tebak, ini apa ya?'
    renderG7WordChoices(choices,correct)
  } else if(g7State.mode==='listen'){
    displayEl.innerHTML=listenButtonHTML('g7-listen')
    questionEl.textContent='Dengar, lalu ketuk gambarnya'
    const say=()=>duniaSayLine(correct.word.toLowerCase())
    document.getElementById('g7-listen').onclick=say; setTimeout(say,250)
    renderG7ImgChoices(choices,correct,false)
  } else {
    // the size follows the word's length, so BUNGA MATAHARI fits a 390 px phone and the box may widen (landscape)
    const fs=Math.max(22,Math.min(48,Math.floor(300/(correct.word.length*0.68))))
    displayEl.innerHTML=`<span style="font-size:min(10vw,${fs}px);font-weight:900;color:#0F766E;font-family:var(--font-display),var(--font);letter-spacing:2px;text-align:center;line-height:1.1;padding:0 12px">${correct.word}</span>`
    questionEl.textContent='Pilih gambar yang benar!'
    renderG7ImgChoices(choices,correct,true)
  }
  document.getElementById('g7-progress').textContent=state.mode==='duo'?`${state.players[state.currentPlayer].name} — ${roundInSet+1}/${g7State.maxRound}`:`${roundInSet+1} / ${g7State.maxRound}`
  g7State.round++
}
function renderG7WordChoices(choices,correct){
  const el=document.getElementById('g7-choices'); el.style.gridTemplateColumns='1fr 1fr'; el.innerHTML=''; el.classList.remove('g7-pics')
  choices.forEach(ch=>{
    const btn=document.createElement('button'); btn.className='g7-choice-btn'; btn.dataset.id=ch.id
    btn.innerHTML=`<span class="g7-choice-text">${ch.word}</span>`
    btn.onclick=()=>answerG7(ch.id===correct.id,btn,correct); el.appendChild(btn)
  })
}
// word->picture: the picture only (the word above is the question; a name under each picture would give it away)
function renderG7ImgChoices(choices,correct){
  const el=document.getElementById('g7-choices'); el.style.gridTemplateColumns='1fr 1fr'; el.innerHTML=''; el.classList.add('g7-pics')
  choices.forEach(ch=>{
    const btn=document.createElement('button'); btn.className='g7-choice-btn'; btn.dataset.id=ch.id; btn.style.padding='10px 8px'
    btn.setAttribute('aria-label','Gambar '+(choices.indexOf(ch)+1))
    btn.innerHTML=`<span class="g7-choice-img">${g7Pic(ch.src,'min(16vh,96px)')}</span>`
    btn.onclick=()=>answerG7(ch.id===correct.id,btn,correct); el.appendChild(btn)
  })
}
function answerG7(isCorrect,btn,correct){
  if(g7State.answered)return; g7State.answered=true; duniaReport('g7','bahasa','gambar',correct&&correct.word,isCorrect) // PRD-48
  document.querySelectorAll('.g7-choice-btn').forEach(b=>b.style.pointerEvents='none')
  const qEl=document.getElementById('g7-question')
  if(isCorrect){
    btn.classList.add('correct'); playCorrect(); addStars(1)
    spawnCorrectCardJuice(btn); quizStreakHit(btn); spawnSparkles(btn); flashScreen('green')
    // Pop the display image
    const dispEl=document.getElementById('g7-display')
    if(dispEl){dispEl.classList.remove('anim-correct');void dispEl.offsetWidth;dispEl.classList.add('anim-correct')
      if(_quizStreak>=3){try{spawnSparkles(dispEl,_quizStreak>=5?8:5)}catch(e){}}  // combo celebration on the picture
    }
    // Show syllable breakdown on correct answer
    if(correct.suku && qEl){
      const parts=correct.suku.split('-')
      const html=parts.map((s,i)=>`<span class="g7-suku" style="animation-delay:${i*0.18}s">${s}</span>`).join('<span style="color:rgba(255,255,255,0.4)">-</span>')
      qEl.innerHTML=`<span style="font-size:13px;opacity:0.8">Suku kata: </span>${html}`
    }
    setTimeout(nextG7Round,1600)
  } else {
    btn.classList.add('wrong'); spawnWrongShake(btn); quizStreakReset()
    document.querySelectorAll('.g7-choice-btn').forEach(b=>{
      if(b.dataset.id===String(correct.id)){b.classList.add('correct');spawnCorrectCardJuice(b,{burst:false})}   // PRD-50: picture buttons carry no word
    })
    playWrong(); flashScreen('red')
    // Shake the display frame
    const dispElW=document.getElementById('g7-display')
    if(dispElW){dispElW.classList.remove('anim-wrong');void dispElW.offsetWidth;dispElW.classList.add('anim-wrong')}
    // Show phonics clue: first letter + syllable hint
    if(qEl){
      const firstLetter=correct.word[0]
      const suku=correct.suku||correct.word
      qEl.innerHTML=`<span style="font-size:13px;opacity:0.8">Mulai dengan huruf </span><b style="font-size:18px;color:#FBBF24">${firstLetter}</b><span style="font-size:13px;opacity:0.8"> — kata: ${suku}</span>`
    }
    setTimeout(nextG7Round,2000)
  }
}

// ================================================================
// GAME 8: SUSUN KATA
// ================================================================
let g8State = {}
function initGame8(){
  const diff=state.selectedLevel||'medium'
  const tier=state.players[state.currentPlayer].ageTier||'tumbuh'
  let bank=[...WORD_BUILD_BANK]
  // Filter by tier (age-based) — prefer tier property if present
  if(tier==='cilik')  bank=bank.filter(w=>w.tier==='easy'||(w.tier==null&&w.word.length<=4))
  if(tier==='tumbuh') bank=bank.filter(w=>w.tier==='easy'||w.tier==='medium'||(w.tier==null&&w.word.length<=6))
  // Also filter by difficulty selection
  if(diff==='easy')   bank=bank.filter(w=>w.tier==='easy'||(w.tier==null&&w.word.length<=4))
  if(diff==='hard')   bank=[...WORD_BUILD_BANK] // all tiers for hard
  if(bank.length===0) bank=[...WORD_BUILD_BANK]
  g8State={round:0,maxRound:DIFF[diff].rounds,answered:false,currentWord:'',userInput:[],shuffled:bank.sort(()=>Math.random()-0.5),availableLetters:[]}
  state.currentPlayer=0; updateGameStarDisplay(); nextG8Round()
}
function nextG8Round(){
  const totalRounds=state.mode==='duo'?g8State.maxRound*2:g8State.maxRound
  if(g8State.round>=totalRounds){
    if(state.mode==='duo'&&g8State.round===g8State.maxRound){state.currentPlayer=1;updateGameStarDisplay();showFeedback(true,0,`Giliran ${state.players[1].name}!`,nextG8Round);return}
    showResult('🔡','Susun Kata Selesai!',`Kamu bisa susun kata! ✍️`); return
  }
  g8State.answered=false
  const roundInSet=g8State.round%g8State.shuffled.length
  const item=pickBag('g8',g8State.shuffled)||g8State.shuffled[roundInSet%g8State.shuffled.length]
  g8State.currentWord=item.word; g8State.userInput=[]; g8State.wrongs=0
  document.getElementById('g8-progress-bar').style.width=((roundInSet/g8State.maxRound)*100)+'%'
  // PRD-42: every third word is heard instead of seen (only with an Indonesian voice, see duniaCanListen)
  g8State.isListen=g8State.round%3===2&&duniaCanListen()
  if(g8State.isListen){
    document.getElementById('g8-hint-img').innerHTML=listenButtonHTML('g8-listen')
    document.getElementById('g8-hint-text').textContent='Dengar, lalu susun katanya'
    const say=()=>duniaSayLine(item.word.toLowerCase())
    document.getElementById('g8-listen').onclick=say; setTimeout(say,250)
  } else {
    document.getElementById('g8-hint-img').innerHTML=`<span style="font-size:inherit">${item.emoji}</span>`
    document.getElementById('g8-hint-text').textContent=item.hint
  }
  renderG8Slots()
  const diff=state.selectedLevel||'medium'
  const numExtra=diff==='easy'?2:diff==='medium'?4:6
  const correctLetters=item.word.split('')
  const allLetters='ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const extra=Array.from({length:numExtra},()=>allLetters[Math.floor(Math.random()*allLetters.length)])
  g8State.availableLetters=[...correctLetters,...extra].sort(()=>Math.random()-0.5)
  renderG8Letters()
  document.getElementById('g8-progress').textContent=state.mode==='duo'?`${state.players[state.currentPlayer].name} — ${roundInSet+1}/${g8State.maxRound}`:`${roundInSet+1} / ${g8State.maxRound}`
  g8State.round++
}
function renderG8Slots(){
  const el=document.getElementById('g8-slots')
  const activeIdx=g8State.userInput.length
  el.innerHTML=g8State.currentWord.split('').map((_,i)=>{
    const filled=g8State.userInput[i]
    const cls=['g8-slot', filled?'filled':'', (!filled&&i===activeIdx)?'active':''].filter(Boolean).join(' ')
    const onclick=filled?`onclick="g8Backspace()"`:''
    return `<div class="${cls}" id="g8-slot-${i}" ${onclick}>${filled||''}</div>`
  }).join('')
}
function renderG8Letters(){
  const el=document.getElementById('g8-letters'); el.innerHTML=''
  g8State.availableLetters.forEach((letter,i)=>{
    const btn=document.createElement('button'); btn.className='g8-letter-btn'; btn.textContent=letter; btn.id=`g8-lbtn-${i}`
    btn.onclick=()=>g8TapLetter(letter,i,btn); el.appendChild(btn)
  })
}
function g8TapLetter(letter,idx,btn){
  if(g8State.answered||btn.classList.contains('used'))return
  if(g8State.userInput.length>=g8State.currentWord.length)return
  const pos=g8State.userInput.length,correct=g8State.currentWord[pos]
  if(letter===correct){
    // Letter fly animation
    btn.classList.add('flying')
    setTimeout(()=>{
      btn.classList.add('used')
      const slotIdx=g8State.userInput.length
      g8State.userInput.push(letter); renderG8Slots(); playClick()
      const slot=document.getElementById(`g8-slot-${slotIdx}`)
      if(slot){slot.classList.add('just-filled');setTimeout(()=>slot.classList.remove('just-filled'),350)}
      if(g8State.userInput.length===g8State.currentWord.length){
        g8State.answered=true
        duniaReport('g8','bahasa','susun',(g8State.isListen?'dengar ':'')+g8State.currentWord,!g8State.wrongs) // PRD-42
        // Staggered wave + gold celebrate
        g8State.currentWord.split('').forEach((_,i)=>{
          const s=document.getElementById(`g8-slot-${i}`)
          if(s){s.classList.add('correct-flash');setTimeout(()=>s.classList.add('celebrate'),i*65+100)}
        })
        playCorrect(); addStars(2); spawnSparkles(); setTimeout(nextG8Round,1800)
      }
    },220)
  } else {
    const slot=document.getElementById(`g8-slot-${pos}`)
    if(slot){slot.classList.add('wrong-flash');setTimeout(()=>slot.classList.remove('wrong-flash'),400)}
    g8State.wrongs=(g8State.wrongs||0)+1
    playWrong()
    // Show specific feedback: which letter is expected
    const hint=document.getElementById('g8-hint-text')
    if(hint){
      const origHint=g8State.shuffled[(g8State.round-1)%g8State.shuffled.length]?.hint||''
      hint.textContent=`Huruf ke-${pos+1} adalah "${correct}", bukan "${letter}"`
      clearTimeout(g8State._hintTimer)
      g8State._hintTimer=setTimeout(()=>{ if(hint) hint.textContent=origHint },1800)
    }
  }
}
function g8Backspace(){
  if(g8State.userInput.length===0)return; g8State.userInput.pop()
  const usedBtns=document.querySelectorAll('.g8-letter-btn.used')
  if(usedBtns.length>0)usedBtns[usedBtns.length-1].classList.remove('used')
  renderG8Slots(); playClick()
}

// ================================================================
// GAME 9: JEJAK HURUF
// ================================================================
let g9State={}, g9Canvas=null, g9Ctx=null, g9Drawing=false, g9UserPath=[]

let g9TraceMode = 'huruf' // 'huruf' or 'angka'
function setG9Mode(mode, btn) {
  g9TraceMode = mode
  document.querySelectorAll('#g9-mode-tabs .g5-sub-tab').forEach(b=>b.classList.remove('active'))
  if(btn) btn.classList.add('active')
  initGame9()
}
// PRD-52: a picture word for the letter (or the picture of the whole word above level 20), from the same sprite
// library as G7 (DBLabeled + the Timmy names). Only single words of plain A-Z letters can be traced.
function g9PicPool(){
  if(g9PicPool.cache&&g9PicPool.cache.n===(window.TKQuestions?1:0)) return g9PicPool.cache.pool
  const pool=g7BuildPool().filter(x=>/^[A-Z]{2,8}$/.test(x.word))
  g9PicPool.cache={n:window.TKQuestions?1:0,pool}
  return pool
}
function g9PicFor(letter){
  letter=String(letter).toUpperCase()   // PRD-58 C9: a lowercase round shows the same pictures
  const all=g9PicPool().filter(x=>x.word[0]===letter); if(!all.length) return null
  g9State.picSeen=g9State.picSeen||{}; const k=g9State.picSeen[letter]||0; g9State.picSeen[letter]=k+1
  return all[(k+Math.floor(Math.random()*all.length))%all.length]
}
function g9ShowPic(it,first){
  const el=document.getElementById('g9-pic'); if(!el) return
  g9State.pic=it||null
  if(!it){ el.hidden=true; el.innerHTML=''; return }
  el.hidden=false; el.innerHTML=''
  const img=document.createElement('img'); img.src=it.src; img.alt=''; img.decoding='async'; el.appendChild(img)
  const w=document.createElement('span'); w.className='g9-pic-word'
  const word=it.word.charAt(0)+it.word.slice(1).toLowerCase()
  if(first){ const b=document.createElement('b'); b.textContent=word.charAt(0); w.appendChild(b); w.appendChild(document.createTextNode(word.slice(1))) } else w.textContent=word
  el.appendChild(w)
}
function initGame9(){
  if(!window.TKQuestions&&!g9State.tkTried&&window.DuniaLoad){ g9State={tkTried:true}; DuniaLoad('tk-questions.js',initGame9); return }
  const diff=state.selectedLevel||'medium'
  const tier=state.players[state.currentPlayer].ageTier||'tumbuh'
  // A-339 P5 — WORD mode above level 20 (huruf only; angka stays single digits).
  // PRD-58 A3: from level 15 (the "hard" third of the 20-level map); "> 20" was never reached
  const wordMode = (g9TraceMode==='huruf') && ((state.selectedLevelNum||1) >= 15)
  let seq
  if(g9TraceMode==='angka'){
    seq=LETTER_SEQ_ANGKA
  } else if(wordMode){
    // no-repeat: draw a fresh shuffled set of words each level (cross-level bag)
    // PRD-52: words with a picture (3-7 letters) join the old list: 60 -> the pool below
    const _pw=g9PicPool().filter(x=>x.word.length>=3&&x.word.length<=7).map(x=>x.word), _all=[...new Set([...WORD_LIST_G9,..._pw])]
    seq=drawBag('g9w',_all,Math.min(DIFF[diff].rounds,_all.length))
  } else {
    // PRD-58 A3: a shuffled bag over all 26 letters for every age (the fixed lists from index 0 only ever reached
    // A-F / A-J); the level's difficulty sets how many letters one session traces (DIFF rounds)
    // PRD-58 C9: the medium third (levels 8-14) traces lowercase letters; Kelas 1 reads and writes them first
    const _set=diff==='medium'&&typeof LETTER_SEQ_KECIL!=='undefined'?LETTER_SEQ_KECIL:LETTER_SEQ_PINTAR
    seq=drawBag(_set===LETTER_SEQ_PINTAR?'g9h':'g9k',_set,Math.min(DIFF[diff].rounds,_set.length))
  }
  g9State={tkTried:true,round:0,maxRound:Math.min(DIFF[diff].rounds,seq.length),sequence:seq,currentLetter:'A',mode:g9TraceMode,wordMode:wordMode,word:'',layout:null,strokes:0}
  state.currentPlayer=0
  g9Canvas=document.getElementById('g9-canvas')
  g9Ctx=g9Canvas.getContext('2d')
  // Sync canvas buffer size to CSS display size — must be done after screen is visible.
  // A-339 P5 — word mode uses a WIDE canvas (g9-word class), so read BOTH dims.
  setTimeout(()=>{
    const wrap = g9Canvas.parentElement
    if(wrap) wrap.classList.toggle('g9-word', !!wordMode)
    const _disp = document.getElementById('g9-letter-display'); if(_disp) _disp.classList.toggle('g9-word-label', !!wordMode)
    let _w = g9Canvas.offsetWidth || g9Canvas.clientWidth || 0
    let _h = g9Canvas.offsetHeight || g9Canvas.clientHeight || 0
    if(!_w || !_h){
      // layout not ready — use intended dims (word canvas is WIDE, single is square)
      if(wordMode){ _w = Math.min(560, Math.round((window.innerWidth||360)*0.94)); _h = Math.round(_w*0.4) }
      else { _w = _h = 300 }
    }
    g9Canvas.width = _w; g9Canvas.height = _h
    g9Clear(); renderG9GuideDots()
  }, 100)
  // A-339 P5 — unified POINTER EVENTS (one stream for mouse+touch+pen). Root cause of
  // owner's "tidak bisa ditulis": the old dual mouse+touch listeners let the browser's
  // synthesized mouse events (fired after a touch) flip g9Drawing=false mid-gesture, and
  // an edge-release lost 'mouseup' → later touchmove drew nothing. setPointerCapture keeps
  // the whole stroke flowing even if the finger strays off the canvas; touch-action:none
  // kills scroll/gesture interference + the synthesized-mouse duplication entirely.
  g9Canvas.removeEventListener('pointerdown',g9PointerDown)
  g9Canvas.removeEventListener('pointermove',g9PointerMove)
  g9Canvas.removeEventListener('pointerup',g9PointerUp)
  g9Canvas.removeEventListener('pointercancel',g9PointerUp)
  g9Canvas.addEventListener('pointerdown',g9PointerDown)
  g9Canvas.addEventListener('pointermove',g9PointerMove)
  g9Canvas.addEventListener('pointerup',g9PointerUp)
  g9Canvas.addEventListener('pointercancel',g9PointerUp)
  g9Canvas.style.touchAction='none'
  updateGameStarDisplay(); nextG9Round()
}
function nextG9Round(){
  if(g9State.round>=g9State.maxRound){const _u=g9State.wordMode?'kata':(g9State.mode==='angka'?'angka':'huruf');showResult('✍️','Jejak Huruf Selesai!',`Kamu berhasil menulis ${g9State.round} ${_u}! ✍️`);return}
  const _item=g9State.sequence[g9State.round]
  g9State.currentLetter=_item; g9UserPath=[]
  // A-339 P5 — word mode: build the per-letter slot layout for this word
  if(g9State.wordMode){ g9State.word=_item; g9State.layout=g9BuildWordLayout(_item) }
  document.getElementById('g9-letter-display').textContent=_item
  // PRD-52: the picture — a word that starts with the letter, or the traced word itself
  if(g9State.mode==='angka') g9ShowPic(null)
  else if(g9State.wordMode) g9ShowPic(g9PicPool().find(x=>x.word===_item)||null,false)
  else g9ShowPic(g9PicFor(_item),true)
  document.getElementById('g9-result').style.display='none'
  document.getElementById('g9-next-btn').style.display='none'
  // Re-show "Selesai" button when starting new letter
  const doneBtn=document.getElementById('g9-done-btn'); if(doneBtn) doneBtn.style.display='block'
  document.getElementById('g9-progress').textContent=`${g9State.round+1} / ${g9State.maxRound}`
  g9State.strokes=0; g9Clear(); renderG9GuideDots(); g9State.round++
}
function getG9Guides(letter) {
  if(g9State.wordMode && g9State.layout) return g9State.layout.guides   // A-339 P5 — whole-word dots
  return (g9State.mode==='angka' ? ANGKA_GUIDES : LETTER_GUIDES)[letter] || []
}
function renderG9GuideDots(){
  const guides=getG9Guides(g9State.currentLetter),container=document.getElementById('g9-guide-dots'); container.innerHTML=''
  guides.forEach((g,i)=>{const dot=document.createElement('div');dot.className='g9-dot';dot.id=`g9-dot-${i}`;dot.style.left=(g.x*100)+'%';dot.style.top=(g.y*100)+'%';dot.textContent=String(i+1);dot.style.cssText+=';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:rgba(255,255,255,0.9);';container.appendChild(dot)})
  // PRD-52: the stroke order — a small arrow halfway along each step from one dot to the next, pointing the way to go
  // (angles in screen pixels, so a wide word canvas still points right). Steps too short to hold an arrow get none.
  // word mode: no arrows (the steps from one letter to the next cross the word and read as noise; the dots keep their numbers)
  const W=g9Canvas&&g9Canvas.width||300, H=g9Canvas&&g9Canvas.height||300
  if(!g9State.wordMode) for(let i=0;i<guides.length-1;i++){
    const a=guides[i], b=guides[i+1], dx=(b.x-a.x)*W, dy=(b.y-a.y)*H
    if(Math.hypot(dx,dy)<Math.min(W,H)*0.16) continue
    const ar=document.createElement('div'); ar.className='g9-arrow'; ar.dataset.from=i
    ar.style.left=((a.x+b.x)/2*100)+'%'; ar.style.top=((a.y+b.y)/2*100)+'%'
    ar.style.transform=`translate(-50%,-50%) rotate(${Math.atan2(dy,dx)*180/Math.PI}deg)`
    ar.innerHTML='<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 3l7 5-7 5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    container.appendChild(ar)
  }
}
function g9Clear(){
  if(!g9Ctx)return; const W=g9Canvas.width||300, H=g9Canvas.height||300; g9Ctx.clearRect(0,0,W,H); g9UserPath=[]
  // v56.9 B-294 — the ghost glyph fills the SAME bbox as the guide dots so apex/feet
  // line up and the child can trace all the way to the bottom dots. A-339 P5 — in
  // word mode, fill EACH letter's ghost into its own slot (aligns with the packed dots).
  if(g9State.wordMode && g9State.layout){
    g9State.layout.letters.forEach(L => g9FillGlyph(g9Ctx, L.ch, L.guides, W, H))
  } else {
    const letter=g9State.currentLetter; if(letter) g9FillGlyph(g9Ctx, letter, getG9Guides(letter), W, H)
  }
  document.querySelectorAll('.g9-dot').forEach(d=>d.classList.remove('hit'))
}
function g9GetPos(e,canvas){const rect=canvas.getBoundingClientRect(),scaleX=canvas.width/rect.width,scaleY=canvas.height/rect.height;return{x:(e.clientX-rect.left)*scaleX,y:(e.clientY-rect.top)*scaleY}}
function g9StartDraw(e){
  g9Drawing=true; const pos=g9GetPos(e,g9Canvas); g9UserPath.push(pos)
  // Insert sentinel to mark stroke boundary (caller-driven multi-stroke support
  // — 2026-05-04 fix: kid bisa angkat jari & lanjut stroke berikut tanpa
  // auto-eval prematur. Sentinel value {_break:true} pisahkan satu stroke
  // dari yang lain di g9UserPath untuk evaluasi nanti)
  if (g9UserPath.length > 1) {
    g9UserPath[g9UserPath.length - 1] = {_break: true}
    g9UserPath.push(pos)
  }
  g9Ctx.beginPath(); g9Ctx.moveTo(pos.x,pos.y)
  g9Ctx.strokeStyle='#84CC16'; g9Ctx.lineWidth=16; g9Ctx.lineCap='round'; g9Ctx.lineJoin='round'
}
function g9Draw(e){
  if(!g9Drawing)return; const pos=g9GetPos(e,g9Canvas); g9UserPath.push(pos)
  g9Ctx.lineTo(pos.x,pos.y); g9Ctx.stroke(); g9Ctx.beginPath(); g9Ctx.moveTo(pos.x,pos.y); checkGuideHits(pos)
}
// A-339 P5 — Pointer Event wrappers. e carries clientX/clientY directly (no e.touches[0]),
// so g9StartDraw/g9Draw/g9EndDraw are reused unchanged. Capture the pointer so a stroke
// that wanders past the canvas edge keeps delivering move events to us.
function g9PointerDown(e){e.preventDefault();try{g9Canvas.setPointerCapture(e.pointerId)}catch(_){}g9StartDraw(e)}
function g9PointerMove(e){if(!g9Drawing)return;e.preventDefault();g9Draw(e)}
function g9PointerUp(e){try{g9Canvas.releasePointerCapture(e.pointerId)}catch(_){}g9EndDraw()}
// 2026-05-04 FIX: REMOVE auto-evaluate timer. Was triggering setTimeout(evaluateG9Trace,500)
// every time kid lifted finger → multi-stroke letters (A/B/E/F/H/T) impossible to
// complete. NOW: kid taps explicit "✅ Selesai" button to evaluate.
function g9EndDraw(){
  if(!g9Drawing) return
  g9Drawing=false
  g9Ctx.beginPath()
  // NO MORE auto-eval — explicit "Selesai" button replaces this
  // PRD-52: a soft rising note for every finished stroke (a tap or a dot is not a stroke); playTone is silent when sound is off
  let n=0; for(let k=g9UserPath.length-1;k>=0&&!(g9UserPath[k]&&g9UserPath[k]._break);k--) n++
  if(n>=4){ g9State.strokes=(g9State.strokes||0)+1; playTone(440*Math.pow(2,Math.min(g9State.strokes-1,7)/12),0.09,'sine',0.12) }
}
function checkGuideHits(pos){
  const W=g9Canvas.width||300, H=g9Canvas.height||300; const guides=getG9Guides(g9State.currentLetter)  // A-339 P5 — W/H aware (wide word canvas)
  const r=Math.min(W,H)*0.18
  guides.forEach((g,i)=>{const gx=g.x*W,gy=g.y*H,d=Math.hypot(pos.x-gx,pos.y-gy);if(d<r){const dot=document.getElementById(`g9-dot-${i}`);if(dot)dot.classList.add('hit')}})
}
function evaluateG9Trace(){
  const W=g9Canvas.width||300, H=g9Canvas.height||300; const guides=getG9Guides(g9State.currentLetter)  // A-339 P5 — W/H aware
  // Filter out stroke-boundary sentinels {_break:true} before evaluating
  const pathPoints = g9UserPath.filter(p => p && !p._break && typeof p.x === 'number')
  if(guides.length===0||pathPoints.length<5){
    // Show "coba lagi" hint
    const resultEl=document.getElementById('g9-result'); resultEl.style.display='block'
    document.getElementById('g9-stars-result').textContent='💪'
    document.getElementById('g9-result-msg').textContent='Belum cukup! Coba ikuti garisnya 😊'
    return
  }
  let hits=0
  const _r=Math.min(W,H)*0.22
  guides.forEach(g=>{const gx=g.x*W,gy=g.y*H,nearest=pathPoints.reduce((best,p)=>Math.min(best,Math.hypot(p.x-gx,p.y-gy)),Infinity);if(nearest<_r)hits++})
  const score=hits/guides.length; duniaReport('g9','bahasa','jejak',g9State.currentLetter,score>=0.65) // PRD-48: 2+ stars = traced
  let stars=0,msg=''
  if(score>=0.85){stars=3;msg='Sempurna! Tulisanmu bagus sekali! 🌟'}
  else if(score>=0.65){stars=2;msg='Bagus! Terus berlatih ya! 👍'}
  else if(score>=0.45){stars=1;msg='Hampir! Coba lagi pelan-pelan 😊'}
  else{stars=0;msg='Coba ikuti titik-titik ya! 💪'}
  const resultEl=document.getElementById('g9-result'); resultEl.style.display='block'
  document.getElementById('g9-stars-result').textContent=stars>0?'⭐'.repeat(stars):'💪'
  document.getElementById('g9-result-msg').textContent=msg
  if(stars>0){addStars(stars);playCorrect();spawnSparkles(null,stars)}else playWrong()
  document.getElementById('g9-next-btn').style.display='flex'
  // Hide "Selesai" button — user already evaluated, must press "Berikutnya"
  const doneBtn=document.getElementById('g9-done-btn'); if(doneBtn) doneBtn.style.display='none'
}

// ================================================================
// DASHBOARD
// ================================================================
// What this child has been learning (games/data/learning-log.js): one row per skill, last 7 days, from the
// answers the games recorded. Numbers are always shown next to the status word, so a parent can judge it.
function renderDashLearning() {
  const box=document.getElementById('dash-learn')
  if(!box) return
  let rows=[], feel={}
  try { rows=window.LearningLog ? window.LearningLog.bySkill({days:7}) : [] } catch(e) { rows=[] }
  try { feel=window.DuniaFeeling ? window.DuniaFeeling.week() : {} } catch(e) { feel={} }
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))
  // the daily feeling check-in: which faces this child picked over the week
  const F=(window.DuniaFeeling&&window.DuniaFeeling.FEELINGS)||[]
  const feelHtml=F.filter(f=>feel[f.id]).map(f=>`<span class="dash-feel-item"><img src="assets/db/${f.img}" alt="">${esc(f.name)} ${feel[f.id]}</span>`).join('')
  const feelRow0=feelHtml?`<div class="dash-learn-row dash-feel"><div class="dash-learn-skill">Perasaan minggu ini</div><div class="dash-feel-list">${feelHtml}</div></div>`:''
  // PRD-16C: the faces picked after a level not won, in their own row
  let aft={}; try { aft=window.DuniaFeeling&&window.DuniaFeeling.afterWeek ? window.DuniaFeeling.afterWeek() : {} } catch(e) { aft={} }
  const aftHtml=F.filter(f=>aft[f.id]).map(f=>`<span class="dash-feel-item"><img src="assets/db/${f.img}" alt="">${esc(f.name)} ${aft[f.id]}</span>`).join('')
  const feelRow=feelRow0+(aftHtml?`<div class="dash-learn-row dash-feel dash-feel-after"><div class="dash-learn-skill">Setelah belum berhasil</div><div class="dash-feel-list">${aftHtml}</div></div>`:'')
  if(!rows.length){
    box.innerHTML=feelRow+'<div class="dash-learn-empty">Belum ada jawaban tercatat minggu ini. Jawaban dari Kuis Matematika, Ayo Berhitung dan soal di Timmy Kapal akan muncul di sini.</div>'
    return
  }
  const WORD={bisa:'Sudah bisa',berkembang:'Berkembang',sulit:'Masih sulit',baru:'Baru mulai'}
  box.innerHTML=feelRow+rows.slice(0,8).map(r=>`
    <div class="dash-learn-row" data-status="${r.status}">
      <div class="dash-learn-top"><span class="dash-learn-skill">${esc(r.skill)}</span><span class="dash-learn-chip">${WORD[r.status]}</span></div>
      <div class="dash-learn-bar"><i style="width:${Math.round(r.rate*100)}%"></i></div>
      <div class="dash-learn-num">${r.ok} dari ${r.n} benar pada percobaan pertama</div>
    </div>`).join('')
}
function showDashboard(_pg) { if (!_pg && window.DuniaParentGate) return void DuniaParentGate.open(() => showDashboard(true)) // PRD-49: K2, behind the parent gate
  const p=state.players[state.currentPlayer]
  const xp=getXP(), tier=getLevelTier(xp)
  try{ if(window.DuniaRhythm) DuniaRhythm.mountSetting(document.getElementById('dash-rhythm')) }catch(e){} // PRD-21: Waktu main
  try{ if(window.DuniaOffline) DuniaOffline.mountSetting(document.getElementById('dash-offline')) }catch(e){} // PRD-23: Unduh semua
  try{ if(window.DuniaTelemetry) DuniaTelemetry.mountHealth(document.getElementById('dash-health')) }catch(e){} // PRD-07: Kesehatan perangkat
  // Player card
  document.getElementById('dash-player-card').innerHTML=`
    <div style="display:flex;align-items:center;gap:16px;background:white;border-radius:24px;padding:20px;box-shadow:0 8px 24px rgba(139,92,246,0.12);width:100%;max-width:500px;">
      <span style="font-size:52px">${p.animal}</span>
      <div>
        <div style="font-family:var(--font-display);font-size:22px;color:var(--text)">${escHtml(p.name||'Pemain')}</div>
        <div style="font-size:15px;color:var(--text-light);margin-top:4px">⭐ ${p.stars} bintang</div>
        <div style="font-size:15px;color:var(--brand);font-weight:700;margin-top:2px">${tier.icon} ${tier.name}</div>
      </div>
    </div>`
  // Level card with progress bar
  const nextTier=LEVEL_TIERS.find(t=>t.min>xp)||tier
  const progress=nextTier===tier?100:Math.round(((xp-tier.min)/(nextTier.min-tier.min))*100)
  document.getElementById('dash-level-card').innerHTML=`
    <div style="background:linear-gradient(135deg,#A78BFA,#8B5CF6);border-radius:24px;padding:20px;color:white;width:100%;max-width:500px;box-shadow:0 8px 24px rgba(91,33,182,0.3);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div style="font-family:var(--font-display);font-size:20px">${tier.icon} Level: ${tier.name}</div>
        <div style="font-size:17px;font-weight:900"><img src="assets/xp-crystal.webp" style="width:20px;height:20px;object-fit:contain;vertical-align:middle;" onerror="this.outerHTML='💎'"> ${xp} XP</div>
      </div>
      <div style="background:rgba(255,255,255,0.25);border-radius:100px;height:12px;overflow:hidden;">
        <div style="background:white;height:100%;width:${progress}%;border-radius:100px;transition:width 1s ease;"></div>
      </div>
      <div style="font-size:13px;margin-top:8px;opacity:0.85">${nextTier===tier?'Max level!':`${nextTier.min-xp} XP lagi ke ${nextTier.icon} ${nextTier.name}`}</div>
    </div>`
  renderDashLearning()
  // Achievements
  const unlocked=JSON.parse(localStorage.getItem(pkey('achievements'))||'{}')
  const BADGE_MAP={first_star:'badge-first-win.webp',hard_mode:'badge-perfect.webp',letter_master:'badge-reader.webp',word_master:'badge-reader.webp',streak3:'badge-streak-7.webp'}
  const achHtml=Object.entries(ACHIEVEMENTS).filter(([key,ach])=>!ach.retired||unlocked[key]).map(([key,ach])=>{
    const done=!!unlocked[key]
    const badgeFile=BADGE_MAP[key]
    const iconHtml=badgeFile
      ?`<img src="assets/${badgeFile}" alt="" style="width:40px;height:40px;object-fit:contain;" onerror="this.outerHTML='<span style=font-size:32px>${ach.icon}</span>'">`
      :`<span style="font-size:32px">${ach.icon}</span>`
    return `<div style="display:flex;align-items:center;gap:12px;background:white;border-radius:18px;padding:14px 16px;box-shadow:0 4px 12px rgba(0,0,0,0.06);opacity:${done?1:0.4};width:100%;max-width:500px;">
      ${iconHtml}
      <div><div style="font-weight:800;font-size:15px">${ach.name}</div><div style="font-size:13px;color:var(--text-light)">${ach.desc}</div></div>
      ${done?'<span style="margin-left:auto;color:#14B8A6;font-size:20px">✓</span>':''}
    </div>`
  }).join('')
  document.getElementById('dash-achievements').innerHTML=`<div style="display:flex;flex-direction:column;gap:8px;width:100%;align-items:center;">${achHtml}</div>`
  // Stats
  const streak=getStreakCount()
  const played=JSON.parse(localStorage.getItem('dunia-emosi-played-games')||'{}')
  document.getElementById('dash-stats').innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;width:100%;max-width:500px;">
      <div class="dash-stat-card"><div class="dash-stat-num">🔥 ${streak}</div><div class="dash-stat-lbl">Hari Streak</div></div>
      <div class="dash-stat-card"><div class="dash-stat-num">🎮 ${Object.keys(played).length}</div><div class="dash-stat-lbl">Game Dimainkan</div></div>
      <div class="dash-stat-card"><div class="dash-stat-num"><img src="assets/star-reward.webp" style="width:22px;height:22px;object-fit:contain;vertical-align:middle;" onerror="this.outerHTML='⭐'"> ${p.stars}</div><div class="dash-stat-lbl">Total Bintang</div></div>
      <div class="dash-stat-card"><div class="dash-stat-num">${xp} XP</div><div class="dash-stat-lbl">Total XP</div></div>
    </div>`
  showScreen('screen-dashboard')
}

// ================================================================
// BOOT (wrapped in try-catch to prevent page freeze on any error)
// ================================================================
try {
  initFloatingStars()
  buildAnimalPicker('p1-animals',0)
  buildAnimalPicker('p2-animals',1)
  try {
    const data=JSON.parse(localStorage.getItem(pkey('streak'))||'{}')
    if(data.streak>=2){document.getElementById('streak-badge').style.display='inline-flex';document.getElementById('streak-text').textContent=data.streak+' hari'}
  } catch(e){}
} catch(bootErr) { console.error('BOOT ERROR:', bootErr) }
// ================================================================
// PIXIJS — GPU RENDERER (G10, G13, G13b battle FX)
// ================================================================
const PixiManager = {
  _apps: {},

  async init(canvasId) {
    if (!window.PIXI) return null
    const canvas = document.getElementById(canvasId)
    if (!canvas) return null
    const parent = canvas.parentElement
    if (!parent) return null
    this.destroy(canvasId)
    const rect = parent.getBoundingClientRect()
    const w = Math.max(rect.width, 200)
    const h = Math.max(rect.height, 200)
    const app = new PIXI.Application()
    try {
      await app.init({
        canvas, width: w, height: h,
        backgroundAlpha: 0,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
        preference: 'webgl'
      })
    } catch(e) { return null }
    this._apps[canvasId] = app
    return app
  },

  get(id) { return this._apps[id] || null },

  destroy(id) {
    const app = this._apps[id]
    if (!app) return
    try { app.destroy(false, {children:true, texture:true}) } catch(e){}
    delete this._apps[id]
  },

  destroyAll() {
    Object.keys(this._apps).forEach(id => this.destroy(id))
  },

  resize(id) {
    const app = this._apps[id]
    if (!app) return
    const canvas = document.getElementById(id)
    if (!canvas || !canvas.parentElement) return
    const r = canvas.parentElement.getBoundingClientRect()
    try { app.renderer.resize(Math.max(r.width,200), Math.max(r.height,200)) } catch(e){}
  }
}

// ── Pixi helpers: type flash, particles, weather, aura ring, evo rings ──

const _PIXI_TYPE_COLORS = {
  fire:0xff6b35, water:0x4fc3f7, electric:0xffcb05, grass:0x4caf50,
  psychic:0xf95587, ghost:0x705898, ice:0x98d8d8, dark:0x200800,
  fighting:0xc03028, dragon:0x7038f8, normal:0xa8a878, rock:0xb8a038,
  poison:0xa040a0, ground:0xe0c068, flying:0xa890f0, bug:0xa8b820,
  steel:0xb8b8d0, fairy:0xee99ac
}

/* Type screen flash — replaces .poke-flash CSS animation */
function pixiTypeFlash(app, type) {
  if (!app) return
  const color = _PIXI_TYPE_COLORS[type] || 0xa8a878
  const g = new PIXI.Graphics()
  const {width:w, height:h} = app.screen
  g.rect(0, 0, w, h).fill({color, alpha:0.42})
  g.alpha = 0
  app.stage.addChild(g)
  let t = 0
  const fn = (ticker) => {
    t += ticker.deltaTime / 60
    if (t < 0.1) { g.alpha = t / 0.1 * 0.42 }
    else if (t < 0.28) { g.alpha = 0.42 }
    else if (t < 0.6) { g.alpha = 0.42 * (1 - (t - 0.28) / 0.32) }
    else { app.ticker.remove(fn); app.stage.removeChild(g); g.destroy() }
  }
  app.ticker.add(fn)
}

/* Type particle burst — replaces DOM div particles in g10TypeFX() */
function pixiTypeFX(app, type, targetSide) {
  if (!app) return
  const color = _PIXI_TYPE_COLORS[type] || 0xa8a878
  const {width:w, height:h} = app.screen
  const isEnemy = targetSide === 'enemy'
  const xBase = isEnemy ? w * 0.52 : w * 0.05
  const yBase = isEnemy ? h * 0.04 : h * 0.42
  const zW = w * 0.36, zH = h * 0.36
  const container = new PIXI.Container()
  app.stage.addChild(container)
  const N = 10
  const pts = Array.from({length:N}, () => {
    const g = new PIXI.Graphics()
    const r = 5 + Math.random() * 8
    g.circle(0, 0, r).fill({color, alpha:0.9})
    g.x = xBase + Math.random() * zW
    g.y = yBase + Math.random() * zH
    const vx = (Math.random() - 0.5) * 90
    const vy = -(50 + Math.random() * 90)
    const maxLife = 0.55 + Math.random() * 0.45
    container.addChild(g)
    return {g, vx, vy, life:0, maxLife}
  })
  const fn = (ticker) => {
    const dt = ticker.deltaTime / 60
    let alive = false
    pts.forEach(p => {
      p.life += dt
      if (p.life < p.maxLife) {
        alive = true
        p.g.x += p.vx * dt
        p.g.y += p.vy * dt
        p.vy += 40 * dt
        const prog = p.life / p.maxLife
        p.g.alpha = 1 - prog
        p.g.scale.set(1 - prog * 0.4)
      } else { p.g.alpha = 0 }
    })
    if (!alive) {
      app.ticker.remove(fn)
      app.stage.removeChild(container)
      container.destroy({children:true})
    }
  }
  app.ticker.add(fn)
}

/* Aura ring pulse — replaces DOM g10-aura-ring div + CSS animation */
function pixiAuraRing(app, side, auraColor) {
  if (!app) return
  const {width:w, height:h} = app.screen
  // side: 'player' = bottom-left, 'enemy' = top-right
  const cx = side === 'player' ? w * 0.22 : w * 0.72
  const cy = side === 'player' ? h * 0.72 : h * 0.28
  const color = typeof auraColor === 'string'
    ? parseInt(auraColor.replace('#',''), 16)
    : (auraColor || 0xa78bfa)
  const g = new PIXI.Graphics()
  app.stage.addChild(g)
  let t = 0
  const fn = (ticker) => {
    t += ticker.deltaTime / 60
    const prog = t / 0.52
    if (prog < 1) {
      const r = 28 + prog * 52
      const alpha = prog < 0.35 ? prog / 0.35 : 1 - (prog - 0.35) / 0.65
      g.clear()
      g.circle(cx, cy, r).stroke({width: Math.max(1.2, 3 - prog * 2), color, alpha: alpha * 0.85})
    } else {
      app.ticker.remove(fn)
      app.stage.removeChild(g)
      g.destroy()
    }
  }
  app.ticker.add(fn)
}

/* Weather overlay — replaces applyG10Weather() DOM particles */
function pixiWeather(app, type) {
  if (!app) return
  pixiClearWeather(app)
  if (!type || type === 'clear') return
  const {width:w, height:h} = app.screen
  const wc = new PIXI.Container()
  wc._isPixiWeather = true
  app.stage.addChildAt(wc, 0)
  const particles = []

  if (type === 'rain') {
    for (let i = 0; i < 40; i++) {
      const g = new PIXI.Graphics()
      g.rect(0, 0, 1.5, 10).fill({color:0xaed6f1, alpha:0.55})
      g.rotation = 0.3
      g.x = Math.random() * w
      g.y = Math.random() * h
      particles.push({g, speed: 280 + Math.random() * 180})
      wc.addChild(g)
    }
    const fn = (t) => { const dt=t.deltaTime/60; particles.forEach(p => {
      p.g.y += p.speed*dt; p.g.x += p.speed*0.28*dt
      if(p.g.y > h) { p.g.y=-12; p.g.x=Math.random()*w }
    }) }
    wc._fn = fn; app.ticker.add(fn)
  } else if (type === 'snow') {
    for (let i = 0; i < 30; i++) {
      const g = new PIXI.Graphics()
      g.circle(0, 0, 2 + Math.random() * 3.5).fill({color:0xffffff, alpha:0.75})
      g.x = Math.random() * w; g.y = Math.random() * h
      particles.push({g, speed:35+Math.random()*55, wT:Math.random()*Math.PI*2, wb:(Math.random()-0.5)*1.5})
      wc.addChild(g)
    }
    const fn = (t) => { const dt=t.deltaTime/60; particles.forEach(p => {
      p.wT+=dt*1.4; p.g.y+=p.speed*dt; p.g.x+=Math.sin(p.wT)*p.wb
      if(p.g.y>h) { p.g.y=-12; p.g.x=Math.random()*w }
    }) }
    wc._fn = fn; app.ticker.add(fn)
  } else if (type === 'wind') {
    for (let i = 0; i < 22; i++) {
      const len = 18 + Math.random() * 38
      const g = new PIXI.Graphics()
      g.rect(0, -1, len, 1.5).fill({color:0xffffff, alpha:0.22})
      g.x = Math.random() * w; g.y = Math.random() * h
      particles.push({g, speed:200+Math.random()*280, len})
      wc.addChild(g)
    }
    const fn = (t) => { const dt=t.deltaTime/60; particles.forEach(p => {
      p.g.x += p.speed*dt
      if(p.g.x > w+p.len) { p.g.x=-p.len; p.g.y=Math.random()*h }
    }) }
    wc._fn = fn; app.ticker.add(fn)
  } else if (type === 'night') {
    for (let i = 0; i < 18; i++) {
      const g = new PIXI.Graphics()
      g.circle(0, 0, 1.5 + Math.random()*2).fill({color:0xffffc8, alpha:0.8})
      g.x = Math.random()*w; g.y = Math.random()*h*0.6
      particles.push({g, phase:Math.random()*Math.PI*2, speed:1.2+Math.random()*1.8})
      wc.addChild(g)
    }
    const fn = (t) => { const dt=t.deltaTime/60; particles.forEach(p => {
      p.phase+=p.speed*dt; p.g.alpha=0.35+Math.sin(p.phase)*0.45
    }) }
    wc._fn = fn; app.ticker.add(fn)
  } else if (type === 'leaves' || type === 'sandstorm') {
    const color = type === 'leaves' ? 0x7ec850 : 0xe0b860
    for (let i = 0; i < 22; i++) {
      const g = new PIXI.Graphics()
      const r = 3 + Math.random()*4
      g.circle(0, 0, r).fill({color, alpha:0.6})
      g.x = Math.random()*w; g.y = Math.random()*h
      particles.push({g, vx:(type==='leaves'?30:180)+Math.random()*80, vy:(Math.random()-0.5)*40, wT:Math.random()*6})
      wc.addChild(g)
    }
    const fn = (t) => { const dt=t.deltaTime/60; particles.forEach(p => {
      p.wT+=dt*2; p.g.x+=p.vx*dt; p.g.y+=Math.sin(p.wT)*p.vy*dt
      if(p.g.x>w+10) { p.g.x=-10; p.g.y=Math.random()*h }
    }) }
    wc._fn = fn; app.ticker.add(fn)
  }
}

function pixiClearWeather(app) {
  if (!app) return
  const toRemove = app.stage.children.filter(c => c._isPixiWeather)
  toRemove.forEach(c => {
    if (c._fn) { try { app.ticker.remove(c._fn) } catch(e){} }
    app.stage.removeChild(c)
    c.destroy({children:true})
  })
}

/* Evolution rings — replaces 6 CSS g13Ring keyframes */
function pixiEvoRings(app) {
  if (!app) return
  const {width:w, height:h} = app.screen
  const cx = w/2, cy = h/2
  const SIZES = [60,100,150,200,280,360]
  const rings = SIZES.map((maxR, i) => {
    const g = new PIXI.Graphics()
    app.stage.addChild(g)
    return {g, maxR, delay: 0.5 + i*0.3, life: 0}
  })
  let elapsed = 0
  const fn = (ticker) => {
    elapsed += ticker.deltaTime/60
    let anyAlive = false
    rings.forEach(r => {
      if (elapsed < r.delay) { anyAlive = true; return }
      r.life += ticker.deltaTime/60
      const maxLife = r.maxR < 200 ? 2.0 : 2.5
      if (r.life < maxLife) {
        anyAlive = true
        const prog = r.life / maxLife
        const cr = prog * r.maxR
        const alpha = (1 - prog) * 0.75
        const lw = Math.max(0.8, 3.5 - prog * 3)
        r.g.clear()
        r.g.circle(cx, cy, cr).stroke({width:lw, color:0xfbbf24, alpha})
      } else { r.g.clear() }
    })
    if (!anyAlive) {
      app.ticker.remove(fn)
      rings.forEach(r => { app.stage.removeChild(r.g); r.g.destroy() })
    }
  }
  app.ticker.add(fn)
}

/* Evolution particles — replaces 25 DOM divs in g13TriggerEvolution() */
function pixiEvoParticles(app) {
  if (!app) return
  const {width:w, height:h} = app.screen
  const COLORS = [0xfbbf24,0xf97316,0xfacc15,0xffffff,0xfef3c7,0xfb923c]
  const container = new PIXI.Container()
  app.stage.addChildAt(container, 0)
  const N = 32
  const pts = Array.from({length:N}, () => {
    const g = new PIXI.Graphics()
    const r = 3 + Math.random()*5.5
    g.circle(0, 0, r).fill({color: COLORS[Math.floor(Math.random()*COLORS.length)], alpha:0.88})
    g.x = Math.random()*w; g.y = h*0.5 + Math.random()*h*0.5
    container.addChild(g)
    return {g, vx:(Math.random()-0.5)*80, vy:-(55+Math.random()*110),
            delay:Math.random()*3, maxLife:2+Math.random()*3, life:-Math.random()*3}
  })
  let total = 0
  const fn = (ticker) => {
    total += ticker.deltaTime/60
    pts.forEach(p => {
      p.life += ticker.deltaTime/60
      if (p.life < 0) { p.g.alpha=0; return }
      if (p.life > p.maxLife) {
        p.g.x = Math.random()*w; p.g.y = h*0.5+Math.random()*h*0.5
        p.life = 0; return
      }
      const prog = p.life/p.maxLife
      p.g.x += p.vx * ticker.deltaTime/60
      p.g.y += p.vy * ticker.deltaTime/60
      p.vy += 18 * ticker.deltaTime/60
      p.g.alpha = prog < 0.2 ? prog/0.2 : 1-(prog-0.2)/0.8
      p.g.scale.set(Math.max(0.1, 1-prog*0.5))
    })
    if (total > 8.5) {
      app.ticker.remove(fn)
      app.stage.removeChild(container)
      container.destroy({children:true})
    }
  }
  app.ticker.add(fn)
}

/* Burst flash (defeat) — replaces CSS g10Burst animation */
function pixiBurstFlash(app, bxPct, byPct) {
  if (!app) return
  const {width:w, height:h} = app.screen
  const cx = w * bxPct / 100, cy = h * byPct / 100
  const g = new PIXI.Graphics()
  app.stage.addChild(g)
  let t = 0
  const fn = (ticker) => {
    t += ticker.deltaTime/60
    g.clear()
    if (t < 0.15) {
      const r = (t/0.15) * Math.min(w,h)*0.6
      const alpha = t/0.15 * 0.9
      g.circle(cx, cy, r).fill({color:0xffffff, alpha})
    } else if (t < 0.6) {
      const fade = 1 - (t-0.15)/0.45
      g.circle(cx, cy, Math.min(w,h)*0.6).fill({color:0xffee50, alpha: fade*0.4})
    } else {
      app.ticker.remove(fn); app.stage.removeChild(g); g.destroy()
    }
  }
  app.ticker.add(fn)
}

/* G13b combo text pop — Pixi text burst */
function pixiComboText(app, text) {
  if (!app || !window.PIXI) return
  const {width:w, height:h} = app.screen
  const label = new PIXI.Text({text, style:{
    fontFamily:'Fredoka One,sans-serif', fontSize:28, fontWeight:'900',
    fill:0xfbbf24, stroke:{color:0x1a0a00, width:4}, align:'center',
    dropShadow:{color:0x000000, blur:4, distance:3, alpha:0.7}
  }})
  label.anchor.set(0.5)
  label.x = w/2; label.y = h*0.42
  label.alpha = 0
  app.stage.addChild(label)
  let t = 0
  const fn = (ticker) => {
    t += ticker.deltaTime/60
    if (t < 0.12) { label.scale.set(0.4+t/0.12*0.9); label.alpha=t/0.12 }
    else if (t < 0.5) { label.scale.set(1.3-0.3*(t-0.12)/0.38); label.alpha=1 }
    else if (t < 0.9) { label.alpha=1-(t-0.5)/0.4 }
    else { app.ticker.remove(fn); app.stage.removeChild(label); label.destroy() }
  }
  app.ticker.add(fn)
}

// ================================================================
// GAME 10 — PERTARUNGAN POKEMON
// ================================================================
// ── Signature move lookup (slug → [moves]) ───────────────
const POKE_MOVES = {
  // Gen 1
  bulbasaur:['Vine Whip','Razor Leaf'],ivysaur:['Razor Leaf','Solar Beam'],venusaur:['Petal Blizzard','Solar Beam','Petal Dance'],
  charmander:['Ember','Scratch'],charmeleon:['Flamethrower','Dragon Rage'],charizard:['Flamethrower','Wing Attack','Blast Burn'],
  squirtle:['Water Gun','Bubble'],wartortle:['Water Pulse','Aqua Tail'],blastoise:['Hydro Pump','Flash Cannon'],
  caterpie:['String Shot','Bug Bite'],metapod:['Tackle','Harden'],butterfree:['Sleep Powder','Bug Buzz'],
  pikachu:['Thunderbolt','Quick Attack','Volt Tackle'],raichu:['Volt Tackle','Thunder','Thunderbolt'],pichu:['Thundershock','Sweet Kiss'],
  jigglypuff:['Sing','Pound','Hyper Voice'],wigglytuff:['Hyper Voice','Double-Edge','Dazzling Gleam'],
  meowth:['Scratch','Pay Day','Bite'],persian:['Pay Day','Slash','Feint Attack'],
  psyduck:['Water Gun','Confusion'],golduck:['Hydro Pump','Confusion','Aqua Jet'],
  abra:['Teleport','Psybeam'],kadabra:['Psybeam','Psychic'],alakazam:['Psychic','Shadow Ball','Future Sight'],
  geodude:['Rock Throw','Magnitude'],graveler:['Rollout','Rock Blast'],golem:['Stone Edge','Earthquake','Explosion'],
  gastly:['Lick','Hex','Shadow Ball'],haunter:['Shadow Ball','Confuse Ray'],gengar:['Shadow Ball','Sludge Bomb','Hex'],
  magikarp:['Splash','Flail','Tackle'],gyarados:['Hydro Pump','Dragon Dance','Crunch'],
  lapras:['Ice Beam','Surf','Blizzard'],eevee:['Quick Attack','Bite','Last Resort'],
  vaporeon:['Hydro Pump','Water Pulse','Surf'],jolteon:['Thunderbolt','Thunder Wave','Wild Charge'],
  flareon:['Flamethrower','Lava Plume','Fire Spin'],
  snorlax:['Body Slam','Hyper Beam','Giga Impact'],
  articuno:['Blizzard','Ice Beam','Sheer Cold'],zapdos:['Thunder','Thunderbolt','Discharge'],moltres:['Fire Blast','Flamethrower','Heat Wave'],
  dratini:['Dragon Rage','Twister'],dragonair:['Dragon Rush','Aqua Tail','Twister'],dragonite:['Dragon Rush','Hyper Beam','Fire Punch'],
  mewtwo:['Psystrike','Shadow Ball','Aura Sphere'],mew:['Psychic','Aura Sphere','Transform'],
  arcanine:['Flare Blitz','Extreme Speed','Close Combat'],
  clefairy:['Moonblast','Metronome'],clefable:['Moonblast','Meteor Mash','Soft-Boiled'],
  slowpoke:['Water Gun','Confusion'],slowbro:['Psychic','Surf','Slack Off'],
  magmar:['Fire Punch','Flamethrower','Lava Plume'],electabuzz:['Thunderbolt','Thunder Punch','Discharge'],
  machop:['Karate Chop','Low Kick'],machoke:['Cross Chop','Dynamic Punch'],machamp:['Cross Chop','Stone Edge','Dynamic Punch'],
  oddish:['Absorb','Acid'],gloom:['Petal Dance','Sludge Bomb'],vileplume:['Petal Blizzard','Sludge Bomb','Solar Beam'],
  poliwag:['Bubble','Water Gun'],poliwhirl:['Bubblebeam','DoubleSlap'],poliwrath:['Waterfall','Dynamic Punch','Focus Blast'],
  horsea:['Water Gun','Twister'],seadra:['Dragon Breath','Twister','Hydro Pump'],
  vulpix:['Ember','Quick Attack'],ninetales:['Flamethrower','Extrasensory','Fire Spin'],
  exeggcute:['Barrage','Confusion','Leech Seed'],exeggutor:['Psychic','Egg Bomb','Solar Beam'],
  cubone:['Bone Club','Rage'],marowak:['Bonemerang','Earthquake','Stone Edge'],
  kabuto:['Scratch','Aqua Jet'],kabutops:['Slash','Aqua Jet','Stone Edge'],
  omanyte:['Brine','Rock Blast'],omastar:['Hydro Pump','Rock Blast','Ancientpower'],
  koffing:['Sludge','Self-Destruct','Toxic'],weezing:['Sludge Bomb','Nasty Plot','Toxic'],
  seel:['Icy Wind','Aqua Jet'],dewgong:['Ice Beam','Surf','Sheer Cold'],
  cloyster:['Icicle Spear','Shell Smash','Ice Shard'],
  staryu:['Water Gun','Rapid Spin'],starmie:['Psychic','Surf','Ice Beam'],
  kangaskhan:['Mega Punch','Sucker Punch','Dizzy Punch'],
  muk:['Gunk Shot','Sludge Bomb','Poison Gas'],
  pidgey:['Gust','Quick Attack'],pidgeotto:['Wing Attack','Gust'],pidgeot:['Hurricane','Air Slash'],
  rattata:['Hyper Fang','Quick Attack'],raticate:['Hyper Fang','Super Fang','Crunch'],
  spearow:['Peck','Fury Attack'],fearow:['Drill Peck','Aerial Ace','Mirror Move'],
  ekans:['Poison Sting','Bite'],arbok:['Gunk Shot','Glare','Coil'],
  sandshrew:['Sand Attack','Slash'],sandslash:['Earthquake','Slash','Rapid Spin'],
  paras:['Spore','Leech Life'],parasect:['Spore','X-Scissor','Leech Life'],
  venonat:['Poison Powder','Psybeam'],venomoth:['Bug Buzz','Psychic','Stun Spore'],
  mankey:['Karate Chop','Rage'],primeape:['Cross Chop','Close Combat','Rage'],
  growlithe:['Ember','Flamethrower','Crunch'],
  bellsprout:['Vine Whip','Acid'],weepinbell:['Razor Leaf','Sludge Bomb'],
  doduo:['Peck','Fury Attack'],dodrio:['Drill Peck','Jump Kick','Thrash'],
  magneton:['Thunderbolt','Tri Attack','Zap Cannon'],
  shellder:['Icicle Spear','Clamp'],diglett:['Dig','Magnitude'],
  voltorb:['Thunderbolt','Rollout'],electrode:['Thunderbolt','Explosion'],
  goldeen:['Waterfall','Horn Drill'],seaking:['Waterfall','Megahorn','Bounce'],
  tauros:['Horn Attack','Giga Impact'],hitmonchan:['Mach Punch','Fire Punch','Counter'],
  // Gen 2
  chikorita:['Razor Leaf','Vine Whip'],bayleef:['Razor Leaf','Synthesis'],meganium:['Petal Dance','Solar Beam'],
  cyndaquil:['Ember','Quick Attack'],quilava:['Flamethrower','Swift'],typhlosion:['Eruption','Flamethrower'],
  totodile:['Water Gun','Scratch'],croconaw:['Water Gun','Slash'],feraligatr:['Crunch','Waterfall','Ice Fang'],
  togepi:['Metronome','Sweet Kiss'],togetic:['Moonblast','Fairy Wind','Air Slash'],
  marill:['Bubble','Aqua Tail'],azumarill:['Play Rough','Aqua Tail','Superpower'],
  teddiursa:['Scratch','Fury Swipes'],ursaring:['Slash','Hammer Arm','Giga Impact'],
  slugma:['Ember','Smog'],magcargo:['Flamethrower','Rock Blast','Earth Power'],
  swinub:['Powder Snow','Ice Shard'],piloswine:['Icicle Crash','Earthquake','Ice Shard'],
  larvitar:['Bite','Rock Slide'],pupitar:['Crunch','Thrash'],tyranitar:['Crunch','Stone Edge','Hyper Beam'],
  misdreavus:['Astonish','Shadow Ball'],mismagius:['Shadow Ball','Mystical Fire','Power Gem'],
  sneasel:['Ice Shard','Night Slash'],weavile:['Night Slash','Ice Punch','Blizzard'],
  hoppip:['Tackle','Dazzling Gleam'],skiploom:['Bullet Seed','Petal Dance'],
  stantler:['Stomp','Megahorn','Zen Headbutt'],wyrdeer:['Zen Headbutt','Psyshield Bash'],
  snubbull:['Bite','Charm'],granbull:['Play Rough','Crunch','Outrage'],
  piloswine:['Icicle Crash','Earthquake'],
  elekid:['Thundershock','Quick Attack'],electabuzz:['Thunderbolt','Thunder Punch'],electivire:['Thunder Punch','Ice Punch','Wild Charge'],
  magby:['Ember','Fire Punch'],magmortar:['Lava Plume','Fire Blast','Thunderbolt'],
  // Gen 3
  mudkip:['Water Gun','Mud-Slap'],marshtomp:['Mud Shot','Surf'],swampert:['Muddy Water','Earthquake','Hydro Pump'],
  treecko:['Bullet Seed','Quick Attack'],grovyle:['Leaf Blade','Detect'],sceptile:['Leaf Blade','Dragon Claw','Leaf Storm'],
  torchic:['Ember','Peck'],combusken:['Double Kick','Blaze Kick'],blaziken:['Blaze Kick','High Jump Kick','Blast Burn'],
  ralts:['Confusion','Disarming Voice'],kirlia:['Magical Leaf','Psychic'],gardevoir:['Moonblast','Psychic','Dazzling Gleam'],
  beldum:['Take Down','Metal Claw'],metang:['Meteor Mash','Confusion'],metagross:['Meteor Mash','Psychic','Earthquake'],
  electrike:['Spark','Bite'],manectric:['Thunderbolt','Discharge','Overheat'],
  swablu:['Peck','Dragon Breath'],altaria:['Dragon Breath','Moonblast','Dragon Dance'],
  shroomish:['Absorb','Stun Spore'],breloom:['Mach Punch','Spore','Seed Bomb'],
  wailmer:['Water Pulse','Amnesia'],wailord:['Water Spout','Surf','Heavy Slam'],
  meditite:['Meditate','Hi Jump Kick'],medicham:['Hi Jump Kick','Force Palm','Psychic'],
  skitty:['Attract','Copycat'],delcatty:['Play Rough','Attract','Assist'],
  snorunt:['Ice Shard','Crunch'],glalie:['Crunch','Freeze-Dry','Blizzard'],
  bagon:['Bite','Dragon Breath'],shelgon:['Dragon Breath','Protect'],salamence:['Dragon Claw','Flamethrower','Hyper Voice'],
  // Gen 4+
  roggenrola:['Rock Blast','Smack Down'],boldore:['Rock Blast','Power Gem'],gigalith:['Stone Edge','Meteor Beam'],
  litwick:['Ember','Hex'],lampent:['Hex','Will-O-Wisp'],chandelure:['Shadow Ball','Fire Blast'],
  gible:['Dragon Breath','Sand Attack'],gabite:['Dragon Claw','Sand Tomb'],garchomp:['Dragon Claw','Earthquake','Dual Chop'],
  timburr:['Pound','Low Kick'],gurdurr:['Dynamic Punch','Superpower'],conkeldurr:['Dynamic Punch','Hammer Arm','Stone Edge'],
  sandile:['Bite','Torment'],krokorok:['Crunch','Dig'],krookodile:['Crunch','Earthquake','Outrage'],
  // Fallback by type
  _fire:['Ember','Flamethrower','Fire Blast'],_water:['Water Gun','Bubble','Hydro Pump'],
  _grass:['Vine Whip','Razor Leaf','Petal Blizzard'],_electric:['Thunderbolt','Spark','Discharge'],
  _psychic:['Confusion','Psybeam','Psychic'],_ice:['Icy Wind','Ice Shard','Blizzard'],
  _ghost:['Shadow Ball','Hex','Lick'],_dragon:['Dragon Rage','Dragon Breath','Dragon Claw'],
  _rock:['Rock Throw','Rock Blast','Stone Edge'],_ground:['Dig','Magnitude','Earthquake'],
  _fighting:['Karate Chop','Low Kick','Dynamic Punch'],_poison:['Sludge','Acid','Gunk Shot'],
  _dark:['Bite','Crunch','Sucker Punch'],_steel:['Metal Claw','Flash Cannon','Iron Head'],
  _bug:['Bug Bite','Silver Wind','Bug Buzz'],_flying:['Gust','Wing Attack','Air Slash'],
  _normal:['Tackle','Quick Attack','Body Slam'],_fairy:['Fairy Wind','Moonblast','Dazzling Gleam'],
}
function getPokeMove(slug, type) {
  const moves = POKE_MOVES[slug] || POKE_MOVES['_'+(type||'normal').toLowerCase()] || ['Tackle']
  return moves[Math.floor(Math.random() * moves.length)]
}
// Show move name popup above attacker sprite wrap
function showMovePopup(wrapEl, moveName, typeColor) {
  if (!wrapEl || !moveName) return
  const rect = wrapEl.getBoundingClientRect()
  const popup = document.createElement('div')
  popup.className = 'move-popup'
  popup.textContent = moveName
  popup.style.left = (rect.left + rect.width / 2) + 'px'
  popup.style.top = (rect.top - 6) + 'px'
  popup.style.background = typeColor
    ? `linear-gradient(135deg,${typeColor},${typeColor}cc)`
    : 'linear-gradient(135deg,#7C3AED,#4c1d95)'
  document.body.appendChild(popup)
  popup.addEventListener('animationend', () => popup.remove(), {once:true})
}

const POKEMON_DB=[
  {id:1,name:'Bulbasaur',slug:'bulbasaur',type:'grass',type2:'poison',gen:1,tier:1},
  {id:2,name:'Ivysaur',slug:'ivysaur',type:'grass',type2:'poison',gen:1,tier:2},
  {id:3,name:'Venusaur',slug:'venusaur',type:'grass',type2:'poison',gen:1,tier:3},
  {id:4,name:'Charmander',slug:'charmander',type:'fire',gen:1,tier:1},
  {id:5,name:'Charmeleon',slug:'charmeleon',type:'fire',gen:1,tier:2},
  {id:6,name:'Charizard',slug:'charizard',type:'fire',type2:'flying',gen:1,tier:3},
  {id:7,name:'Squirtle',slug:'squirtle',type:'water',gen:1,tier:1},
  {id:8,name:'Wartortle',slug:'wartortle',type:'water',gen:1,tier:2},
  {id:9,name:'Blastoise',slug:'blastoise',type:'water',gen:1,tier:3},
  {id:10,name:'Caterpie',slug:'caterpie',type:'bug',gen:1,tier:1},
  {id:11,name:'Metapod',slug:'metapod',type:'bug',gen:1,tier:2},
  {id:12,name:'Butterfree',slug:'butterfree',type:'bug',type2:'flying',gen:1,tier:3},
  {id:13,name:'Weedle',slug:'weedle',type:'bug',type2:'poison',gen:1,tier:1},
  {id:14,name:'Kakuna',slug:'kakuna',type:'bug',type2:'poison',gen:1,tier:2},
  {id:15,name:'Beedrill',slug:'beedrill',type:'bug',type2:'poison',gen:1,tier:3},
  {id:16,name:'Pidgey',slug:'pidgey',type:'normal',type2:'flying',gen:1,tier:1},
  {id:17,name:'Pidgeotto',slug:'pidgeotto',type:'normal',type2:'flying',gen:1,tier:2},
  {id:18,name:'Pidgeot',slug:'pidgeot',type:'normal',type2:'flying',gen:1,tier:3},
  {id:19,name:'Rattata',slug:'rattata',type:'normal',gen:1,tier:2},
  {id:20,name:'Raticate',slug:'raticate',type:'normal',gen:1,tier:3},
  {id:21,name:'Spearow',slug:'spearow',type:'normal',type2:'flying',gen:1,tier:2},
  {id:22,name:'Fearow',slug:'fearow',type:'normal',type2:'flying',gen:1,tier:3},
  {id:23,name:'Ekans',slug:'ekans',type:'poison',gen:1,tier:2},
  {id:24,name:'Arbok',slug:'arbok',type:'poison',gen:1,tier:3},
  {id:25,name:'Pikachu',slug:'pikachu',type:'electric',gen:1,tier:2},
  {id:26,name:'Raichu',slug:'raichu',type:'electric',gen:1,tier:3},
  {id:27,name:'Sandshrew',slug:'sandshrew',type:'ground',gen:1,tier:2},
  {id:28,name:'Sandslash',slug:'sandslash',type:'ground',gen:1,tier:3},
  {id:29,name:'Nidoran-F',slug:'nidoran-f',type:'poison',gen:1,tier:1},
  {id:30,name:'Nidorina',slug:'nidorina',type:'poison',gen:1,tier:2},
  {id:31,name:'Nidoqueen',slug:'nidoqueen',type:'poison',type2:'ground',gen:1,tier:3},
  {id:32,name:'Nidoran-M',slug:'nidoran-m',type:'poison',gen:1,tier:1},
  {id:33,name:'Nidorino',slug:'nidorino',type:'poison',gen:1,tier:2},
  {id:34,name:'Nidoking',slug:'nidoking',type:'poison',type2:'ground',gen:1,tier:3},
  {id:35,name:'Clefairy',slug:'clefairy',type:'fairy',gen:1,tier:2},
  {id:36,name:'Clefable',slug:'clefable',type:'fairy',gen:1,tier:3},
  {id:37,name:'Vulpix',slug:'vulpix',type:'fire',gen:1,tier:2},
  {id:38,name:'Ninetales',slug:'ninetales',type:'fire',gen:1,tier:3},
  {id:39,name:'Jigglypuff',slug:'jigglypuff',type:'normal',type2:'fairy',gen:1,tier:2},
  {id:40,name:'Wigglytuff',slug:'wigglytuff',type:'normal',type2:'fairy',gen:1,tier:3},
  {id:41,name:'Zubat',slug:'zubat',type:'poison',type2:'flying',gen:1,tier:1},
  {id:42,name:'Golbat',slug:'golbat',type:'poison',type2:'flying',gen:1,tier:1},
  {id:43,name:'Oddish',slug:'oddish',type:'grass',type2:'poison',gen:1,tier:1},
  {id:44,name:'Gloom',slug:'gloom',type:'grass',type2:'poison',gen:1,tier:2},
  {id:45,name:'Vileplume',slug:'vileplume',type:'grass',type2:'poison',gen:1,tier:3},
  {id:46,name:'Paras',slug:'paras',type:'bug',type2:'grass',gen:1,tier:2},
  {id:47,name:'Parasect',slug:'parasect',type:'bug',type2:'grass',gen:1,tier:3},
  {id:48,name:'Venonat',slug:'venonat',type:'bug',type2:'poison',gen:1,tier:2},
  {id:49,name:'Venomoth',slug:'venomoth',type:'bug',type2:'poison',gen:1,tier:3},
  {id:50,name:'Diglett',slug:'diglett',type:'ground',gen:1,tier:2},
  {id:51,name:'Dugtrio',slug:'dugtrio',type:'ground',gen:1,tier:3},
  {id:52,name:'Meowth',slug:'meowth',type:'normal',gen:1,tier:2},
  {id:53,name:'Persian',slug:'persian',type:'normal',gen:1,tier:3},
  {id:54,name:'Psyduck',slug:'psyduck',type:'water',gen:1,tier:2},
  {id:55,name:'Golduck',slug:'golduck',type:'water',gen:1,tier:3},
  {id:56,name:'Mankey',slug:'mankey',type:'fighting',gen:1,tier:2},
  {id:57,name:'Primeape',slug:'primeape',type:'fighting',gen:1,tier:3},
  {id:58,name:'Growlithe',slug:'growlithe',type:'fire',gen:1,tier:2},
  {id:59,name:'Arcanine',slug:'arcanine',type:'fire',gen:1,tier:3},
  {id:60,name:'Poliwag',slug:'poliwag',type:'water',gen:1,tier:1},
  {id:61,name:'Poliwhirl',slug:'poliwhirl',type:'water',gen:1,tier:2},
  {id:62,name:'Poliwrath',slug:'poliwrath',type:'water',type2:'fighting',gen:1,tier:3},
  {id:63,name:'Abra',slug:'abra',type:'psychic',gen:1,tier:1},
  {id:64,name:'Kadabra',slug:'kadabra',type:'psychic',gen:1,tier:2},
  {id:65,name:'Alakazam',slug:'alakazam',type:'psychic',gen:1,tier:3},
  {id:66,name:'Machop',slug:'machop',type:'fighting',gen:1,tier:1},
  {id:67,name:'Machoke',slug:'machoke',type:'fighting',gen:1,tier:2},
  {id:68,name:'Machamp',slug:'machamp',type:'fighting',gen:1,tier:3},
  {id:69,name:'Bellsprout',slug:'bellsprout',type:'grass',type2:'poison',gen:1,tier:1},
  {id:70,name:'Weepinbell',slug:'weepinbell',type:'grass',type2:'poison',gen:1,tier:2},
  {id:71,name:'Victreebel',slug:'victreebel',type:'grass',type2:'poison',gen:1,tier:3},
  {id:72,name:'Tentacool',slug:'tentacool',type:'water',type2:'poison',gen:1,tier:2},
  {id:73,name:'Tentacruel',slug:'tentacruel',type:'water',type2:'poison',gen:1,tier:3},
  {id:74,name:'Geodude',slug:'geodude',type:'rock',type2:'ground',gen:1,tier:1},
  {id:75,name:'Graveler',slug:'graveler',type:'rock',type2:'ground',gen:1,tier:2},
  {id:76,name:'Golem',slug:'golem',type:'rock',type2:'ground',gen:1,tier:3},
  {id:77,name:'Ponyta',slug:'ponyta',type:'fire',gen:1,tier:2},
  {id:78,name:'Rapidash',slug:'rapidash',type:'fire',gen:1,tier:3},
  {id:79,name:'Slowpoke',slug:'slowpoke',type:'water',type2:'psychic',gen:1,tier:2},
  {id:80,name:'Slowbro',slug:'slowbro',type:'water',type2:'psychic',gen:1,tier:3},
  {id:81,name:'Magnemite',slug:'magnemite',type:'electric',type2:'steel',gen:1,tier:2},
  {id:82,name:'Magneton',slug:'magneton',type:'electric',type2:'steel',gen:1,tier:3},
  {id:83,name:'Farfetch&#39;d',slug:'farfetchd',type:'normal',type2:'flying',gen:1,tier:1},
  {id:84,name:'Doduo',slug:'doduo',type:'normal',type2:'flying',gen:1,tier:2},
  {id:85,name:'Dodrio',slug:'dodrio',type:'normal',type2:'flying',gen:1,tier:3},
  {id:86,name:'Seel',slug:'seel',type:'water',gen:1,tier:2},
  {id:87,name:'Dewgong',slug:'dewgong',type:'water',type2:'ice',gen:1,tier:3},
  {id:88,name:'Grimer',slug:'grimer',type:'poison',gen:1,tier:2},
  {id:89,name:'Muk',slug:'muk',type:'poison',gen:1,tier:3},
  {id:90,name:'Shellder',slug:'shellder',type:'water',gen:1,tier:2},
  {id:91,name:'Cloyster',slug:'cloyster',type:'water',type2:'ice',gen:1,tier:3},
  {id:92,name:'Gastly',slug:'gastly',type:'ghost',type2:'poison',gen:1,tier:1},
  {id:93,name:'Haunter',slug:'haunter',type:'ghost',type2:'poison',gen:1,tier:2},
  {id:94,name:'Gengar',slug:'gengar',type:'ghost',type2:'poison',gen:1,tier:3},
  {id:95,name:'Onix',slug:'onix',type:'rock',type2:'ground',gen:1,tier:1},
  {id:96,name:'Drowzee',slug:'drowzee',type:'psychic',gen:1,tier:2},
  {id:97,name:'Hypno',slug:'hypno',type:'psychic',gen:1,tier:3},
  {id:98,name:'Krabby',slug:'krabby',type:'water',gen:1,tier:2},
  {id:99,name:'Kingler',slug:'kingler',type:'water',gen:1,tier:3},
  {id:100,name:'Voltorb',slug:'voltorb',type:'electric',gen:1,tier:2},
  {id:101,name:'Electrode',slug:'electrode',type:'electric',gen:1,tier:3},
  {id:102,name:'Exeggcute',slug:'exeggcute',type:'grass',type2:'psychic',gen:1,tier:2},
  {id:103,name:'Exeggutor',slug:'exeggutor',type:'grass',type2:'psychic',gen:1,tier:3},
  {id:104,name:'Cubone',slug:'cubone',type:'ground',gen:1,tier:2},
  {id:105,name:'Marowak',slug:'marowak',type:'ground',gen:1,tier:3},
  {id:106,name:'Hitmonlee',slug:'hitmonlee',type:'fighting',gen:1,tier:3},
  {id:107,name:'Hitmonchan',slug:'hitmonchan',type:'fighting',gen:1,tier:3},
  {id:108,name:'Lickitung',slug:'lickitung',type:'normal',gen:1,tier:3},
  {id:109,name:'Koffing',slug:'koffing',type:'poison',gen:1,tier:1},
  {id:110,name:'Weezing',slug:'weezing',type:'poison',gen:1,tier:3},
  {id:111,name:'Rhyhorn',slug:'rhyhorn',type:'ground',type2:'rock',gen:1,tier:1},
  {id:112,name:'Rhydon',slug:'rhydon',type:'ground',type2:'rock',gen:1,tier:3},
  {id:113,name:'Chansey',slug:'chansey',type:'normal',gen:1,tier:3},
  {id:114,name:'Tangela',slug:'tangela',type:'grass',gen:1,tier:3},
  {id:115,name:'Kangaskhan',slug:'kangaskhan',type:'normal',gen:1,tier:3},
  {id:116,name:'Horsea',slug:'horsea',type:'water',gen:1,tier:2},
  {id:117,name:'Seadra',slug:'seadra',type:'water',gen:1,tier:3},
  {id:118,name:'Goldeen',slug:'goldeen',type:'water',gen:1,tier:2},
  {id:119,name:'Seaking',slug:'seaking',type:'water',gen:1,tier:3},
  {id:120,name:'Staryu',slug:'staryu',type:'water',gen:1,tier:2},
  {id:121,name:'Starmie',slug:'starmie',type:'water',type2:'psychic',gen:1,tier:3},
  {id:122,name:'Mr. Mime',slug:'mr-mime',type:'psychic',type2:'fairy',gen:1,tier:3},
  {id:123,name:'Scyther',slug:'scyther',type:'bug',type2:'flying',gen:1,tier:3},
  {id:124,name:'Jynx',slug:'jynx',type:'ice',type2:'psychic',gen:1,tier:3},
  {id:125,name:'Electabuzz',slug:'electabuzz',type:'electric',gen:1,tier:3},
  {id:126,name:'Magmar',slug:'magmar',type:'fire',gen:1,tier:3},
  {id:127,name:'Pinsir',slug:'pinsir',type:'bug',gen:1,tier:3},
  {id:128,name:'Tauros',slug:'tauros',type:'normal',gen:1,tier:3},
  {id:129,name:'Magikarp',slug:'magikarp',type:'water',gen:1,tier:2},
  {id:130,name:'Gyarados',slug:'gyarados',type:'water',type2:'flying',gen:1,tier:3},
  {id:131,name:'Lapras',slug:'lapras',type:'water',type2:'ice',gen:1,tier:3},
  {id:132,name:'Ditto',slug:'ditto',type:'normal',gen:1,tier:3},
  {id:133,name:'Eevee',slug:'eevee',type:'normal',gen:1,tier:2},
  {id:134,name:'Vaporeon',slug:'vaporeon',type:'water',gen:1,tier:3},
  {id:135,name:'Jolteon',slug:'jolteon',type:'electric',gen:1,tier:3},
  {id:136,name:'Flareon',slug:'flareon',type:'fire',gen:1,tier:3},
  {id:137,name:'Porygon',slug:'porygon',type:'normal',gen:1,tier:3},
  {id:138,name:'Omanyte',slug:'omanyte',type:'rock',type2:'water',gen:1,tier:2},
  {id:139,name:'Omastar',slug:'omastar',type:'rock',type2:'water',gen:1,tier:3},
  {id:140,name:'Kabuto',slug:'kabuto',type:'rock',type2:'water',gen:1,tier:2},
  {id:141,name:'Kabutops',slug:'kabutops',type:'rock',type2:'water',gen:1,tier:3},
  {id:142,name:'Aerodactyl',slug:'aerodactyl',type:'rock',type2:'flying',gen:1,tier:3},
  {id:143,name:'Snorlax',slug:'snorlax',type:'normal',gen:1,tier:3},
  {id:144,name:'Articuno',slug:'articuno',type:'ice',type2:'flying',gen:1,tier:4},
  {id:145,name:'Zapdos',slug:'zapdos',type:'electric',type2:'flying',gen:1,tier:4},
  {id:146,name:'Moltres',slug:'moltres',type:'fire',type2:'flying',gen:1,tier:4},
  {id:147,name:'Dratini',slug:'dratini',type:'dragon',gen:1,tier:2},
  {id:148,name:'Dragonair',slug:'dragonair',type:'dragon',gen:1,tier:2},
  {id:149,name:'Dragonite',slug:'dragonite',type:'dragon',type2:'flying',gen:1,tier:3},
  {id:150,name:'Mewtwo',slug:'mewtwo',type:'psychic',gen:1,tier:4},
  {id:151,name:'Mew',slug:'mew',type:'psychic',gen:1,tier:4},
  {id:152,name:'Chikorita',slug:'chikorita',type:'grass',gen:2,tier:1},
  {id:153,name:'Bayleef',slug:'bayleef',type:'grass',gen:2,tier:2},
  {id:154,name:'Meganium',slug:'meganium',type:'grass',gen:2,tier:3},
  {id:155,name:'Cyndaquil',slug:'cyndaquil',type:'fire',gen:2,tier:1},
  {id:156,name:'Quilava',slug:'quilava',type:'fire',gen:2,tier:2},
  {id:157,name:'Typhlosion',slug:'typhlosion',type:'fire',gen:2,tier:3},
  {id:158,name:'Totodile',slug:'totodile',type:'water',gen:2,tier:1},
  {id:159,name:'Croconaw',slug:'croconaw',type:'water',gen:2,tier:2},
  {id:160,name:'Feraligatr',slug:'feraligatr',type:'water',gen:2,tier:3},
  {id:161,name:'Sentret',slug:'sentret',type:'normal',gen:2,tier:2},
  {id:162,name:'Furret',slug:'furret',type:'normal',gen:2,tier:3},
  {id:163,name:'Hoothoot',slug:'hoothoot',type:'normal',type2:'flying',gen:2,tier:2},
  {id:164,name:'Noctowl',slug:'noctowl',type:'normal',type2:'flying',gen:2,tier:3},
  {id:165,name:'Ledyba',slug:'ledyba',type:'bug',type2:'flying',gen:2,tier:2},
  {id:166,name:'Ledian',slug:'ledian',type:'bug',type2:'flying',gen:2,tier:3},
  {id:167,name:'Spinarak',slug:'spinarak',type:'bug',type2:'poison',gen:2,tier:2},
  {id:168,name:'Ariados',slug:'ariados',type:'bug',type2:'poison',gen:2,tier:3},
  {id:169,name:'Crobat',slug:'crobat',type:'poison',type2:'flying',gen:2,tier:2},
  {id:170,name:'Chinchou',slug:'chinchou',type:'water',type2:'electric',gen:2,tier:3},
  {id:171,name:'Lanturn',slug:'lanturn',type:'water',type2:'electric',gen:2,tier:3},
  {id:172,name:'Pichu',slug:'pichu',type:'electric',gen:2,tier:1},
  {id:173,name:'Cleffa',slug:'cleffa',type:'fairy',gen:2,tier:1},
  {id:174,name:'Igglybuff',slug:'igglybuff',type:'normal',type2:'fairy',gen:2,tier:2},
  {id:175,name:'Togepi',slug:'togepi',type:'fairy',gen:2,tier:1},
  {id:176,name:'Togetic',slug:'togetic',type:'fairy',type2:'flying',gen:2,tier:2},
  {id:177,name:'Natu',slug:'natu',type:'psychic',type2:'flying',gen:2,tier:2},
  {id:178,name:'Xatu',slug:'xatu',type:'psychic',type2:'flying',gen:2,tier:3},
  {id:179,name:'Mareep',slug:'mareep',type:'electric',gen:2,tier:2},
  {id:180,name:'Flaaffy',slug:'flaaffy',type:'electric',gen:2,tier:1},
  {id:181,name:'Ampharos',slug:'ampharos',type:'electric',gen:2,tier:2},
  {id:182,name:'Bellossom',slug:'bellossom',type:'grass',gen:2,tier:3},
  {id:183,name:'Marill',slug:'marill',type:'water',type2:'fairy',gen:2,tier:2},
  {id:184,name:'Azumarill',slug:'azumarill',type:'water',type2:'fairy',gen:2,tier:3},
  {id:185,name:'Sudowoodo',slug:'sudowoodo',type:'rock',gen:2,tier:3},
  {id:186,name:'Politoed',slug:'politoed',type:'water',gen:2,tier:3},
  {id:187,name:'Hoppip',slug:'hoppip',type:'grass',type2:'flying',gen:2,tier:2},
  {id:188,name:'Skiploom',slug:'skiploom',type:'grass',type2:'flying',gen:2,tier:2},
  {id:189,name:'Jumpluff',slug:'jumpluff',type:'grass',type2:'flying',gen:2,tier:3},
  {id:190,name:'Aipom',slug:'aipom',type:'normal',gen:2,tier:2},
  {id:191,name:'Sunkern',slug:'sunkern',type:'grass',gen:2,tier:1},
  {id:192,name:'Sunflora',slug:'sunflora',type:'grass',gen:2,tier:3},
  {id:193,name:'Yanma',slug:'yanma',type:'bug',type2:'flying',gen:2,tier:2},
  {id:194,name:'Wooper',slug:'wooper',type:'water',type2:'ground',gen:2,tier:2},
  {id:195,name:'Quagsire',slug:'quagsire',type:'water',type2:'ground',gen:2,tier:3},
  {id:196,name:'Espeon',slug:'espeon',type:'psychic',gen:2,tier:2},
  {id:197,name:'Umbreon',slug:'umbreon',type:'dark',gen:2,tier:3},
  {id:198,name:'Murkrow',slug:'murkrow',type:'dark',type2:'flying',gen:2,tier:2},
  {id:199,name:'Slowking',slug:'slowking',type:'water',type2:'psychic',gen:2,tier:3},
  {id:200,name:'Misdreavus',slug:'misdreavus',type:'ghost',gen:2,tier:2},
  {id:201,name:'Unown',slug:'unown',type:'psychic',gen:2,tier:2},
  {id:202,name:'Wobbuffet',slug:'wobbuffet',type:'psychic',gen:2,tier:3},
  {id:203,name:'Girafarig',slug:'girafarig',type:'normal',type2:'psychic',gen:2,tier:3},
  {id:204,name:'Pineco',slug:'pineco',type:'bug',gen:2,tier:2},
  {id:205,name:'Forretress',slug:'forretress',type:'bug',type2:'steel',gen:2,tier:3},
  {id:206,name:'Dunsparce',slug:'dunsparce',type:'normal',gen:2,tier:1},
  {id:207,name:'Gligar',slug:'gligar',type:'ground',type2:'flying',gen:2,tier:2},
  {id:208,name:'Steelix',slug:'steelix',type:'steel',type2:'ground',gen:2,tier:3},
  {id:209,name:'Snubbull',slug:'snubbull',type:'fairy',gen:2,tier:2},
  {id:210,name:'Granbull',slug:'granbull',type:'fairy',gen:2,tier:3},
  {id:211,name:'Qwilfish',slug:'qwilfish',type:'water',type2:'poison',gen:2,tier:2},
  {id:212,name:'Scizor',slug:'scizor',type:'bug',type2:'steel',gen:2,tier:3},
  {id:213,name:'Shuckle',slug:'shuckle',type:'bug',type2:'rock',gen:2,tier:2},
  {id:214,name:'Heracross',slug:'heracross',type:'bug',type2:'fighting',gen:2,tier:3},
  {id:215,name:'Sneasel',slug:'sneasel',type:'dark',type2:'ice',gen:2,tier:2},
  {id:216,name:'Teddiursa',slug:'teddiursa',type:'normal',gen:2,tier:2},
  {id:217,name:'Ursaring',slug:'ursaring',type:'normal',gen:2,tier:3},
  {id:218,name:'Slugma',slug:'slugma',type:'fire',gen:2,tier:2},
  {id:219,name:'Magcargo',slug:'magcargo',type:'fire',type2:'rock',gen:2,tier:3},
  {id:220,name:'Swinub',slug:'swinub',type:'ice',type2:'ground',gen:2,tier:2},
  {id:221,name:'Piloswine',slug:'piloswine',type:'ice',type2:'ground',gen:2,tier:3},
  {id:222,name:'Corsola',slug:'corsola',type:'water',type2:'rock',gen:2,tier:1},
  {id:223,name:'Remoraid',slug:'remoraid',type:'water',gen:2,tier:2},
  {id:224,name:'Octillery',slug:'octillery',type:'water',gen:2,tier:3},
  {id:225,name:'Delibird',slug:'delibird',type:'ice',type2:'flying',gen:2,tier:3},
  {id:226,name:'Mantine',slug:'mantine',type:'water',type2:'flying',gen:2,tier:3},
  {id:227,name:'Skarmory',slug:'skarmory',type:'steel',type2:'flying',gen:2,tier:2},
  {id:228,name:'Houndour',slug:'houndour',type:'dark',type2:'fire',gen:2,tier:2},
  {id:229,name:'Houndoom',slug:'houndoom',type:'dark',type2:'fire',gen:2,tier:3},
  {id:230,name:'Kingdra',slug:'kingdra',type:'water',type2:'dragon',gen:2,tier:3},
  {id:231,name:'Phanpy',slug:'phanpy',type:'ground',gen:2,tier:2},
  {id:232,name:'Donphan',slug:'donphan',type:'ground',gen:2,tier:3},
  {id:233,name:'Porygon2',slug:'porygon2',type:'normal',gen:2,tier:3},
  {id:234,name:'Stantler',slug:'stantler',type:'normal',gen:2,tier:3},
  {id:235,name:'Smeargle',slug:'smeargle',type:'normal',gen:2,tier:1},
  {id:236,name:'Tyrogue',slug:'tyrogue',type:'fighting',gen:2,tier:2},
  {id:237,name:'Hitmontop',slug:'hitmontop',type:'fighting',gen:2,tier:3},
  {id:238,name:'Smoochum',slug:'smoochum',type:'ice',type2:'psychic',gen:2,tier:1},
  {id:239,name:'Elekid',slug:'elekid',type:'electric',gen:2,tier:1},
  {id:240,name:'Magby',slug:'magby',type:'fire',gen:2,tier:1},
  {id:241,name:'Miltank',slug:'miltank',type:'normal',gen:2,tier:3},
  {id:242,name:'Blissey',slug:'blissey',type:'normal',gen:2,tier:3},
  {id:243,name:'Raikou',slug:'raikou',type:'electric',gen:2,tier:4},
  {id:244,name:'Entei',slug:'entei',type:'fire',gen:2,tier:4},
  {id:245,name:'Suicune',slug:'suicune',type:'water',gen:2,tier:4},
  {id:246,name:'Larvitar',slug:'larvitar',type:'rock',type2:'ground',gen:2,tier:1},
  {id:247,name:'Pupitar',slug:'pupitar',type:'rock',type2:'ground',gen:2,tier:1},
  {id:248,name:'Tyranitar',slug:'tyranitar',type:'rock',type2:'dark',gen:2,tier:3},
  {id:249,name:'Lugia',slug:'lugia',type:'psychic',type2:'flying',gen:2,tier:4},
  {id:250,name:'Ho-Oh',slug:'ho-oh',type:'fire',type2:'flying',gen:2,tier:4},
  {id:251,name:'Celebi',slug:'celebi',type:'psychic',type2:'grass',gen:2,tier:4},
  {id:252,name:'Treecko',slug:'treecko',type:'grass',gen:3,tier:1},
  {id:253,name:'Grovyle',slug:'grovyle',type:'grass',gen:3,tier:2},
  {id:254,name:'Sceptile',slug:'sceptile',type:'grass',gen:3,tier:3},
  {id:255,name:'Torchic',slug:'torchic',type:'fire',gen:3,tier:1},
  {id:256,name:'Combusken',slug:'combusken',type:'fire',type2:'fighting',gen:3,tier:2},
  {id:257,name:'Blaziken',slug:'blaziken',type:'fire',type2:'fighting',gen:3,tier:3},
  {id:258,name:'Mudkip',slug:'mudkip',type:'water',gen:3,tier:1},
  {id:259,name:'Marshtomp',slug:'marshtomp',type:'water',type2:'ground',gen:3,tier:2},
  {id:260,name:'Swampert',slug:'swampert',type:'water',type2:'ground',gen:3,tier:3},
  {id:261,name:'Poochyena',slug:'poochyena',type:'dark',gen:3,tier:2},
  {id:262,name:'Mightyena',slug:'mightyena',type:'dark',gen:3,tier:3},
  {id:263,name:'Zigzagoon',slug:'zigzagoon',type:'normal',gen:3,tier:2},
  {id:264,name:'Linoone',slug:'linoone',type:'normal',gen:3,tier:3},
  {id:265,name:'Wurmple',slug:'wurmple',type:'bug',gen:3,tier:1},
  {id:266,name:'Silcoon',slug:'silcoon',type:'bug',gen:3,tier:2},
  {id:267,name:'Beautifly',slug:'beautifly',type:'bug',type2:'flying',gen:3,tier:3},
  {id:268,name:'Cascoon',slug:'cascoon',type:'bug',gen:3,tier:2},
  {id:269,name:'Dustox',slug:'dustox',type:'bug',type2:'poison',gen:3,tier:3},
  {id:270,name:'Lotad',slug:'lotad',type:'water',type2:'grass',gen:3,tier:1},
  {id:271,name:'Lombre',slug:'lombre',type:'water',type2:'grass',gen:3,tier:2},
  {id:272,name:'Ludicolo',slug:'ludicolo',type:'water',type2:'grass',gen:3,tier:3},
  {id:273,name:'Seedot',slug:'seedot',type:'grass',gen:3,tier:1},
  {id:274,name:'Nuzleaf',slug:'nuzleaf',type:'grass',type2:'dark',gen:3,tier:2},
  {id:275,name:'Shiftry',slug:'shiftry',type:'grass',type2:'dark',gen:3,tier:3},
  {id:276,name:'Taillow',slug:'taillow',type:'normal',type2:'flying',gen:3,tier:2},
  {id:277,name:'Swellow',slug:'swellow',type:'normal',type2:'flying',gen:3,tier:3},
  {id:278,name:'Wingull',slug:'wingull',type:'water',type2:'flying',gen:3,tier:2},
  {id:279,name:'Pelipper',slug:'pelipper',type:'water',type2:'flying',gen:3,tier:3},
  {id:280,name:'Ralts',slug:'ralts',type:'psychic',type2:'fairy',gen:3,tier:1},
  {id:281,name:'Kirlia',slug:'kirlia',type:'psychic',type2:'fairy',gen:3,tier:2},
  {id:282,name:'Gardevoir',slug:'gardevoir',type:'psychic',type2:'fairy',gen:3,tier:3},
  {id:283,name:'Surskit',slug:'surskit',type:'bug',type2:'water',gen:3,tier:2},
  {id:284,name:'Masquerain',slug:'masquerain',type:'bug',type2:'flying',gen:3,tier:3},
  {id:285,name:'Shroomish',slug:'shroomish',type:'grass',gen:3,tier:2},
  {id:286,name:'Breloom',slug:'breloom',type:'grass',type2:'fighting',gen:3,tier:3},
  {id:287,name:'Slakoth',slug:'slakoth',type:'normal',gen:3,tier:2},
  {id:288,name:'Vigoroth',slug:'vigoroth',type:'normal',gen:3,tier:3},
  {id:289,name:'Slaking',slug:'slaking',type:'normal',gen:3,tier:1},
  {id:290,name:'Nincada',slug:'nincada',type:'bug',type2:'ground',gen:3,tier:2},
  {id:291,name:'Ninjask',slug:'ninjask',type:'bug',type2:'flying',gen:3,tier:3},
  {id:292,name:'Shedinja',slug:'shedinja',type:'bug',type2:'ghost',gen:3,tier:3},
  {id:293,name:'Whismur',slug:'whismur',type:'normal',gen:3,tier:1},
  {id:294,name:'Loudred',slug:'loudred',type:'normal',gen:3,tier:2},
  {id:295,name:'Exploud',slug:'exploud',type:'normal',gen:3,tier:3},
  {id:296,name:'Makuhita',slug:'makuhita',type:'fighting',gen:3,tier:2},
  {id:297,name:'Hariyama',slug:'hariyama',type:'fighting',gen:3,tier:3},
  {id:298,name:'Azurill',slug:'azurill',type:'normal',type2:'fairy',gen:3,tier:2},
  {id:299,name:'Nosepass',slug:'nosepass',type:'rock',gen:3,tier:3},
  {id:300,name:'Skitty',slug:'skitty',type:'normal',gen:3,tier:2},
  {id:301,name:'Delcatty',slug:'delcatty',type:'normal',gen:3,tier:3},
  {id:302,name:'Sableye',slug:'sableye',type:'dark',type2:'ghost',gen:3,tier:2},
  {id:303,name:'Mawile',slug:'mawile',type:'steel',type2:'fairy',gen:3,tier:3},
  {id:304,name:'Aron',slug:'aron',type:'steel',type2:'rock',gen:3,tier:1},
  {id:305,name:'Lairon',slug:'lairon',type:'steel',type2:'rock',gen:3,tier:2},
  {id:306,name:'Aggron',slug:'aggron',type:'steel',type2:'rock',gen:3,tier:3},
  {id:307,name:'Meditite',slug:'meditite',type:'fighting',type2:'psychic',gen:3,tier:2},
  {id:308,name:'Medicham',slug:'medicham',type:'fighting',type2:'psychic',gen:3,tier:3},
  {id:309,name:'Electrike',slug:'electrike',type:'electric',gen:3,tier:2},
  {id:310,name:'Manectric',slug:'manectric',type:'electric',gen:3,tier:3},
  {id:311,name:'Plusle',slug:'plusle',type:'electric',gen:3,tier:2},
  {id:312,name:'Minun',slug:'minun',type:'electric',gen:3,tier:3},
  {id:313,name:'Volbeat',slug:'volbeat',type:'bug',gen:3,tier:2},
  {id:314,name:'Illumise',slug:'illumise',type:'bug',gen:3,tier:3},
  {id:315,name:'Roselia',slug:'roselia',type:'grass',type2:'poison',gen:3,tier:1},
  {id:316,name:'Gulpin',slug:'gulpin',type:'poison',gen:3,tier:2},
  {id:317,name:'Swalot',slug:'swalot',type:'poison',gen:3,tier:3},
  {id:318,name:'Carvanha',slug:'carvanha',type:'water',type2:'dark',gen:3,tier:2},
  {id:319,name:'Sharpedo',slug:'sharpedo',type:'water',type2:'dark',gen:3,tier:3},
  {id:320,name:'Wailmer',slug:'wailmer',type:'water',gen:3,tier:2},
  {id:321,name:'Wailord',slug:'wailord',type:'water',gen:3,tier:3},
  {id:322,name:'Numel',slug:'numel',type:'fire',type2:'ground',gen:3,tier:2},
  {id:323,name:'Camerupt',slug:'camerupt',type:'fire',type2:'ground',gen:3,tier:3},
  {id:324,name:'Torkoal',slug:'torkoal',type:'fire',gen:3,tier:1},
  {id:325,name:'Spoink',slug:'spoink',type:'psychic',gen:3,tier:2},
  {id:326,name:'Grumpig',slug:'grumpig',type:'psychic',gen:3,tier:3},
  {id:327,name:'Spinda',slug:'spinda',type:'normal',gen:3,tier:1},
  {id:328,name:'Trapinch',slug:'trapinch',type:'ground',gen:3,tier:3},
  {id:329,name:'Vibrava',slug:'vibrava',type:'ground',type2:'dragon',gen:3,tier:2},
  {id:330,name:'Flygon',slug:'flygon',type:'ground',type2:'dragon',gen:3,tier:3},
  {id:331,name:'Cacnea',slug:'cacnea',type:'grass',gen:3,tier:2},
  {id:332,name:'Cacturne',slug:'cacturne',type:'grass',type2:'dark',gen:3,tier:3},
  {id:333,name:'Swablu',slug:'swablu',type:'normal',type2:'flying',gen:3,tier:2},
  {id:334,name:'Altaria',slug:'altaria',type:'dragon',type2:'flying',gen:3,tier:3},
  {id:335,name:'Zangoose',slug:'zangoose',type:'normal',gen:3,tier:2},
  {id:336,name:'Seviper',slug:'seviper',type:'poison',gen:3,tier:3},
  {id:337,name:'Lunatone',slug:'lunatone',type:'rock',type2:'psychic',gen:3,tier:2},
  {id:338,name:'Solrock',slug:'solrock',type:'rock',type2:'psychic',gen:3,tier:3},
  {id:339,name:'Barboach',slug:'barboach',type:'water',type2:'ground',gen:3,tier:2},
  {id:340,name:'Whiscash',slug:'whiscash',type:'water',type2:'ground',gen:3,tier:3},
  {id:341,name:'Corphish',slug:'corphish',type:'water',gen:3,tier:2},
  {id:342,name:'Crawdaunt',slug:'crawdaunt',type:'water',type2:'dark',gen:3,tier:3},
  {id:343,name:'Baltoy',slug:'baltoy',type:'ground',type2:'psychic',gen:3,tier:2},
  {id:344,name:'Claydol',slug:'claydol',type:'ground',type2:'psychic',gen:3,tier:3},
  {id:345,name:'Lileep',slug:'lileep',type:'rock',type2:'grass',gen:3,tier:2},
  {id:346,name:'Cradily',slug:'cradily',type:'rock',type2:'grass',gen:3,tier:3},
  {id:347,name:'Anorith',slug:'anorith',type:'rock',type2:'bug',gen:3,tier:2},
  {id:348,name:'Armaldo',slug:'armaldo',type:'rock',type2:'bug',gen:3,tier:3},
  {id:349,name:'Feebas',slug:'feebas',type:'water',gen:3,tier:2},
  {id:350,name:'Milotic',slug:'milotic',type:'water',gen:3,tier:3},
  {id:351,name:'Castform',slug:'castform',type:'normal',gen:3,tier:2},
  {id:352,name:'Kecleon',slug:'kecleon',type:'normal',gen:3,tier:3},
  {id:353,name:'Shuppet',slug:'shuppet',type:'ghost',gen:3,tier:2},
  {id:354,name:'Banette',slug:'banette',type:'ghost',gen:3,tier:3},
  {id:355,name:'Duskull',slug:'duskull',type:'ghost',gen:3,tier:2},
  {id:356,name:'Dusclops',slug:'dusclops',type:'ghost',gen:3,tier:3},
  {id:357,name:'Tropius',slug:'tropius',type:'grass',type2:'flying',gen:3,tier:2},
  {id:358,name:'Chimecho',slug:'chimecho',type:'psychic',gen:3,tier:3},
  {id:359,name:'Absol',slug:'absol',type:'dark',gen:3,tier:1},
  {id:360,name:'Wynaut',slug:'wynaut',type:'psychic',gen:3,tier:1},
  {id:361,name:'Snorunt',slug:'snorunt',type:'ice',gen:3,tier:2},
  {id:362,name:'Glalie',slug:'glalie',type:'ice',gen:3,tier:3},
  {id:363,name:'Spheal',slug:'spheal',type:'ice',type2:'water',gen:3,tier:1},
  {id:364,name:'Sealeo',slug:'sealeo',type:'ice',type2:'water',gen:3,tier:2},
  {id:365,name:'Walrein',slug:'walrein',type:'ice',type2:'water',gen:3,tier:3},
  {id:366,name:'Clamperl',slug:'clamperl',type:'water',gen:3,tier:2},
  {id:367,name:'Huntail',slug:'huntail',type:'water',gen:3,tier:3},
  {id:368,name:'Gorebyss',slug:'gorebyss',type:'water',gen:3,tier:3},
  {id:369,name:'Relicanth',slug:'relicanth',type:'water',type2:'rock',gen:3,tier:3},
  {id:370,name:'Luvdisc',slug:'luvdisc',type:'water',gen:3,tier:3},
  {id:371,name:'Bagon',slug:'bagon',type:'dragon',gen:3,tier:2},
  {id:372,name:'Shelgon',slug:'shelgon',type:'dragon',gen:3,tier:1},
  {id:373,name:'Salamence',slug:'salamence',type:'dragon',type2:'flying',gen:3,tier:3},
  {id:374,name:'Beldum',slug:'beldum',type:'steel',type2:'psychic',gen:3,tier:2},
  {id:375,name:'Metang',slug:'metang',type:'steel',type2:'psychic',gen:3,tier:2},
  {id:376,name:'Metagross',slug:'metagross',type:'steel',type2:'psychic',gen:3,tier:3},
  {id:377,name:'Regirock',slug:'regirock',type:'rock',gen:3,tier:1},
  {id:378,name:'Regice',slug:'regice',type:'ice',gen:3,tier:3},
  {id:379,name:'Registeel',slug:'registeel',type:'steel',gen:3,tier:3},
  {id:380,name:'Latias',slug:'latias',type:'dragon',type2:'psychic',gen:3,tier:4},
  {id:381,name:'Latios',slug:'latios',type:'dragon',type2:'psychic',gen:3,tier:4},
  {id:382,name:'Kyogre',slug:'kyogre',type:'water',gen:3,tier:4},
  {id:383,name:'Groudon',slug:'groudon',type:'ground',gen:3,tier:4},
  {id:384,name:'Rayquaza',slug:'rayquaza',type:'dragon',type2:'flying',gen:3,tier:4},
  {id:385,name:'Jirachi',slug:'jirachi',type:'steel',type2:'psychic',gen:3,tier:4},
  {id:386,name:'Deoxys',slug:'deoxys',type:'psychic',gen:3,tier:4},
  {id:387,name:'Turtwig',slug:'turtwig',type:'grass',gen:4,tier:1},
  {id:388,name:'Grotle',slug:'grotle',type:'grass',gen:4,tier:2},
  {id:389,name:'Torterra',slug:'torterra',type:'grass',type2:'ground',gen:4,tier:3},
  {id:390,name:'Chimchar',slug:'chimchar',type:'fire',gen:4,tier:1},
  {id:391,name:'Monferno',slug:'monferno',type:'fire',type2:'fighting',gen:4,tier:2},
  {id:392,name:'Infernape',slug:'infernape',type:'fire',type2:'fighting',gen:4,tier:3},
  {id:393,name:'Piplup',slug:'piplup',type:'water',gen:4,tier:1},
  {id:394,name:'Prinplup',slug:'prinplup',type:'water',gen:4,tier:2},
  {id:395,name:'Empoleon',slug:'empoleon',type:'water',type2:'steel',gen:4,tier:3},
  {id:396,name:'Starly',slug:'starly',type:'normal',type2:'flying',gen:4,tier:1},
  {id:397,name:'Staravia',slug:'staravia',type:'normal',type2:'flying',gen:4,tier:2},
  {id:398,name:'Staraptor',slug:'staraptor',type:'normal',type2:'flying',gen:4,tier:3},
  {id:399,name:'Bidoof',slug:'bidoof',type:'normal',gen:4,tier:2},
  {id:400,name:'Bibarel',slug:'bibarel',type:'normal',type2:'water',gen:4,tier:3},
  {id:401,name:'Kricketot',slug:'kricketot',type:'bug',gen:4,tier:2},
  {id:402,name:'Kricketune',slug:'kricketune',type:'bug',gen:4,tier:3},
  {id:403,name:'Shinx',slug:'shinx',type:'electric',gen:4,tier:2},
  {id:404,name:'Luxio',slug:'luxio',type:'electric',gen:4,tier:3},
  {id:405,name:'Luxray',slug:'luxray',type:'electric',gen:4,tier:1},
  {id:406,name:'Budew',slug:'budew',type:'grass',type2:'poison',gen:4,tier:2},
  {id:407,name:'Roserade',slug:'roserade',type:'grass',type2:'poison',gen:4,tier:3},
  {id:408,name:'Cranidos',slug:'cranidos',type:'rock',gen:4,tier:2},
  {id:409,name:'Rampardos',slug:'rampardos',type:'rock',gen:4,tier:3},
  {id:410,name:'Shieldon',slug:'shieldon',type:'rock',type2:'steel',gen:4,tier:2},
  {id:411,name:'Bastiodon',slug:'bastiodon',type:'rock',type2:'steel',gen:4,tier:3},
  {id:412,name:'Burmy',slug:'burmy',type:'bug',gen:4,tier:2},
  {id:413,name:'Wormadam',slug:'wormadam',type:'bug',type2:'grass',gen:4,tier:3},
  {id:414,name:'Mothim',slug:'mothim',type:'bug',type2:'flying',gen:4,tier:1},
  {id:415,name:'Combee',slug:'combee',type:'bug',type2:'flying',gen:4,tier:1},
  {id:416,name:'Vespiquen',slug:'vespiquen',type:'bug',type2:'flying',gen:4,tier:3},
  {id:417,name:'Pachirisu',slug:'pachirisu',type:'electric',gen:4,tier:1},
  {id:418,name:'Buizel',slug:'buizel',type:'water',gen:4,tier:2},
  {id:419,name:'Floatzel',slug:'floatzel',type:'water',gen:4,tier:3},
  {id:420,name:'Cherubi',slug:'cherubi',type:'grass',gen:4,tier:2},
  {id:421,name:'Cherrim',slug:'cherrim',type:'grass',gen:4,tier:3},
  {id:422,name:'Shellos',slug:'shellos',type:'water',gen:4,tier:2},
  {id:423,name:'Gastrodon',slug:'gastrodon',type:'water',type2:'ground',gen:4,tier:3},
  {id:424,name:'Ambipom',slug:'ambipom',type:'normal',gen:4,tier:2},
  {id:425,name:'Drifloon',slug:'drifloon',type:'ghost',type2:'flying',gen:4,tier:3},
  {id:426,name:'Drifblim',slug:'drifblim',type:'ghost',type2:'flying',gen:4,tier:3},
  {id:427,name:'Buneary',slug:'buneary',type:'normal',gen:4,tier:2},
  {id:428,name:'Lopunny',slug:'lopunny',type:'normal',gen:4,tier:3},
  {id:429,name:'Mismagius',slug:'mismagius',type:'ghost',gen:4,tier:2},
  {id:430,name:'Honchkrow',slug:'honchkrow',type:'dark',type2:'flying',gen:4,tier:3},
  {id:431,name:'Glameow',slug:'glameow',type:'normal',gen:4,tier:2},
  {id:432,name:'Purugly',slug:'purugly',type:'normal',gen:4,tier:3},
  {id:433,name:'Chingling',slug:'chingling',type:'psychic',gen:4,tier:1},
  {id:434,name:'Stunky',slug:'stunky',type:'poison',type2:'dark',gen:4,tier:2},
  {id:435,name:'Skuntank',slug:'skuntank',type:'poison',type2:'dark',gen:4,tier:3},
  {id:436,name:'Bronzor',slug:'bronzor',type:'steel',type2:'psychic',gen:4,tier:2},
  {id:437,name:'Bronzong',slug:'bronzong',type:'steel',type2:'psychic',gen:4,tier:3},
  {id:438,name:'Bonsly',slug:'bonsly',type:'rock',gen:4,tier:1},
  {id:439,name:'Mime Jr.',slug:'mime-jr',type:'psychic',type2:'fairy',gen:4,tier:3},
  {id:440,name:'Happiny',slug:'happiny',type:'normal',gen:4,tier:2},
  {id:441,name:'Chatot',slug:'chatot',type:'normal',type2:'flying',gen:4,tier:3},
  {id:442,name:'Spiritomb',slug:'spiritomb',type:'ghost',type2:'dark',gen:4,tier:3},
  {id:443,name:'Gible',slug:'gible',type:'dragon',type2:'ground',gen:4,tier:2},
  {id:444,name:'Gabite',slug:'gabite',type:'dragon',type2:'ground',gen:4,tier:3},
  {id:445,name:'Garchomp',slug:'garchomp',type:'dragon',type2:'ground',gen:4,tier:1},
  {id:446,name:'Munchlax',slug:'munchlax',type:'normal',gen:4,tier:1},
  {id:447,name:'Riolu',slug:'riolu',type:'fighting',gen:4,tier:2},
  {id:448,name:'Lucario',slug:'lucario',type:'fighting',type2:'steel',gen:4,tier:3},
  {id:449,name:'Hippopotas',slug:'hippopotas',type:'ground',gen:4,tier:2},
  {id:450,name:'Hippowdon',slug:'hippowdon',type:'ground',gen:4,tier:3},
  {id:451,name:'Skorupi',slug:'skorupi',type:'poison',type2:'bug',gen:4,tier:2},
  {id:452,name:'Drapion',slug:'drapion',type:'poison',type2:'dark',gen:4,tier:3},
  {id:453,name:'Croagunk',slug:'croagunk',type:'poison',type2:'fighting',gen:4,tier:2},
  {id:454,name:'Toxicroak',slug:'toxicroak',type:'poison',type2:'fighting',gen:4,tier:3},
  {id:455,name:'Carnivine',slug:'carnivine',type:'grass',gen:4,tier:2},
  {id:456,name:'Finneon',slug:'finneon',type:'water',gen:4,tier:3},
  {id:457,name:'Lumineon',slug:'lumineon',type:'water',gen:4,tier:2},
  {id:458,name:'Mantyke',slug:'mantyke',type:'water',type2:'flying',gen:4,tier:3},
  {id:459,name:'Snover',slug:'snover',type:'grass',type2:'ice',gen:4,tier:2},
  {id:460,name:'Abomasnow',slug:'abomasnow',type:'grass',type2:'ice',gen:4,tier:3},
  {id:461,name:'Weavile',slug:'weavile',type:'dark',type2:'ice',gen:4,tier:1},
  {id:462,name:'Magnezone',slug:'magnezone',type:'electric',type2:'steel',gen:4,tier:3},
  {id:463,name:'Lickilicky',slug:'lickilicky',type:'normal',gen:4,tier:3},
  {id:464,name:'Rhyperior',slug:'rhyperior',type:'ground',type2:'rock',gen:4,tier:3},
  {id:465,name:'Tangrowth',slug:'tangrowth',type:'grass',gen:4,tier:3},
  {id:466,name:'Electivire',slug:'electivire',type:'electric',gen:4,tier:3},
  {id:467,name:'Magmortar',slug:'magmortar',type:'fire',gen:4,tier:3},
  {id:468,name:'Togekiss',slug:'togekiss',type:'fairy',type2:'flying',gen:4,tier:3},
  {id:469,name:'Yanmega',slug:'yanmega',type:'bug',type2:'flying',gen:4,tier:3},
  {id:470,name:'Leafeon',slug:'leafeon',type:'grass',gen:4,tier:3},
  {id:471,name:'Glaceon',slug:'glaceon',type:'ice',gen:4,tier:3},
  {id:472,name:'Gliscor',slug:'gliscor',type:'ground',type2:'flying',gen:4,tier:3},
  {id:473,name:'Mamoswine',slug:'mamoswine',type:'ice',type2:'ground',gen:4,tier:3},
  {id:474,name:'Porygon-Z',slug:'porygon-z',type:'normal',gen:4,tier:3},
  {id:475,name:'Gallade',slug:'gallade',type:'psychic',type2:'fighting',gen:4,tier:3},
  {id:476,name:'Probopass',slug:'probopass',type:'rock',type2:'steel',gen:4,tier:3},
  {id:477,name:'Dusknoir',slug:'dusknoir',type:'ghost',gen:4,tier:3},
  {id:478,name:'Froslass',slug:'froslass',type:'ice',type2:'ghost',gen:4,tier:3},
  {id:479,name:'Rotom',slug:'rotom',type:'electric',type2:'ghost',gen:4,tier:1},
  {id:480,name:'Uxie',slug:'uxie',type:'psychic',gen:4,tier:4},
  {id:481,name:'Mesprit',slug:'mesprit',type:'psychic',gen:4,tier:4},
  {id:482,name:'Azelf',slug:'azelf',type:'psychic',gen:4,tier:4},
  {id:483,name:'Dialga',slug:'dialga',type:'steel',type2:'dragon',gen:4,tier:4},
  {id:484,name:'Palkia',slug:'palkia',type:'water',type2:'dragon',gen:4,tier:4},
  {id:485,name:'Heatran',slug:'heatran',type:'fire',type2:'steel',gen:4,tier:1},
  {id:486,name:'Regigigas',slug:'regigigas',type:'normal',gen:4,tier:1},
  {id:487,name:'Giratina',slug:'giratina',type:'ghost',type2:'dragon',gen:4,tier:4},
  {id:488,name:'Cresselia',slug:'cresselia',type:'psychic',gen:4,tier:1},
  {id:489,name:'Phione',slug:'phione',type:'water',gen:4,tier:1},
  {id:490,name:'Manaphy',slug:'manaphy',type:'water',gen:4,tier:1},
  {id:491,name:'Darkrai',slug:'darkrai',type:'dark',gen:4,tier:4},
  {id:492,name:'Shaymin',slug:'shaymin',type:'grass',gen:4,tier:4},
  {id:493,name:'Arceus',slug:'arceus',type:'normal',gen:4,tier:4},
  {id:494,name:'Victini',slug:'victini',type:'psychic',type2:'fire',gen:5,tier:1},
  {id:495,name:'Snivy',slug:'snivy',type:'grass',gen:5,tier:1},
  {id:496,name:'Servine',slug:'servine',type:'grass',gen:5,tier:2},
  {id:497,name:'Serperior',slug:'serperior',type:'grass',gen:5,tier:3},
  {id:498,name:'Tepig',slug:'tepig',type:'fire',gen:5,tier:1},
  {id:499,name:'Pignite',slug:'pignite',type:'fire',type2:'fighting',gen:5,tier:2},
  {id:500,name:'Emboar',slug:'emboar',type:'fire',type2:'fighting',gen:5,tier:3},
  {id:501,name:'Oshawott',slug:'oshawott',type:'water',gen:5,tier:1},
  {id:502,name:'Dewott',slug:'dewott',type:'water',gen:5,tier:2},
  {id:503,name:'Samurott',slug:'samurott',type:'water',gen:5,tier:3},
  {id:504,name:'Patrat',slug:'patrat',type:'normal',gen:5,tier:2},
  {id:505,name:'Watchog',slug:'watchog',type:'normal',gen:5,tier:3},
  {id:506,name:'Lillipup',slug:'lillipup',type:'normal',gen:5,tier:1},
  {id:507,name:'Herdier',slug:'herdier',type:'normal',gen:5,tier:2},
  {id:508,name:'Stoutland',slug:'stoutland',type:'normal',gen:5,tier:3},
  {id:509,name:'Purrloin',slug:'purrloin',type:'dark',gen:5,tier:2},
  {id:510,name:'Liepard',slug:'liepard',type:'dark',gen:5,tier:3},
  {id:511,name:'Pansage',slug:'pansage',type:'grass',gen:5,tier:2},
  {id:512,name:'Simisage',slug:'simisage',type:'grass',gen:5,tier:3},
  {id:513,name:'Pansear',slug:'pansear',type:'fire',gen:5,tier:2},
  {id:514,name:'Simisear',slug:'simisear',type:'fire',gen:5,tier:3},
  {id:515,name:'Panpour',slug:'panpour',type:'water',gen:5,tier:2},
  {id:516,name:'Simipour',slug:'simipour',type:'water',gen:5,tier:3},
  {id:517,name:'Munna',slug:'munna',type:'psychic',gen:5,tier:2},
  {id:518,name:'Musharna',slug:'musharna',type:'psychic',gen:5,tier:3},
  {id:519,name:'Pidove',slug:'pidove',type:'normal',type2:'flying',gen:5,tier:1},
  {id:520,name:'Tranquill',slug:'tranquill',type:'normal',type2:'flying',gen:5,tier:2},
  {id:521,name:'Unfezant',slug:'unfezant',type:'normal',type2:'flying',gen:5,tier:3},
  {id:522,name:'Blitzle',slug:'blitzle',type:'electric',gen:5,tier:2},
  {id:523,name:'Zebstrika',slug:'zebstrika',type:'electric',gen:5,tier:3},
  {id:524,name:'Roggenrola',slug:'roggenrola',type:'rock',gen:5,tier:1},
  {id:525,name:'Boldore',slug:'boldore',type:'rock',gen:5,tier:2},
  {id:526,name:'Gigalith',slug:'gigalith',type:'rock',gen:5,tier:3},
  {id:527,name:'Woobat',slug:'woobat',type:'psychic',type2:'flying',gen:5,tier:2},
  {id:528,name:'Swoobat',slug:'swoobat',type:'psychic',type2:'flying',gen:5,tier:3},
  {id:529,name:'Drilbur',slug:'drilbur',type:'ground',gen:5,tier:2},
  {id:530,name:'Excadrill',slug:'excadrill',type:'ground',type2:'steel',gen:5,tier:3},
  {id:531,name:'Audino',slug:'audino',type:'normal',gen:5,tier:2},
  {id:532,name:'Timburr',slug:'timburr',type:'fighting',gen:5,tier:3},
  {id:533,name:'Gurdurr',slug:'gurdurr',type:'fighting',gen:5,tier:2},
  {id:534,name:'Conkeldurr',slug:'conkeldurr',type:'fighting',gen:5,tier:3},
  {id:535,name:'Tympole',slug:'tympole',type:'water',gen:5,tier:1},
  {id:536,name:'Palpitoad',slug:'palpitoad',type:'water',type2:'ground',gen:5,tier:2},
  {id:537,name:'Seismitoad',slug:'seismitoad',type:'water',type2:'ground',gen:5,tier:3},
  {id:538,name:'Throh',slug:'throh',type:'fighting',gen:5,tier:3},
  {id:539,name:'Sawk',slug:'sawk',type:'fighting',gen:5,tier:3},
  {id:540,name:'Sewaddle',slug:'sewaddle',type:'bug',type2:'grass',gen:5,tier:1},
  {id:541,name:'Swadloon',slug:'swadloon',type:'bug',type2:'grass',gen:5,tier:2},
  {id:542,name:'Leavanny',slug:'leavanny',type:'bug',type2:'grass',gen:5,tier:3},
  {id:543,name:'Venipede',slug:'venipede',type:'bug',type2:'poison',gen:5,tier:1},
  {id:544,name:'Whirlipede',slug:'whirlipede',type:'bug',type2:'poison',gen:5,tier:2},
  {id:545,name:'Scolipede',slug:'scolipede',type:'bug',type2:'poison',gen:5,tier:3},
  {id:546,name:'Cottonee',slug:'cottonee',type:'grass',type2:'fairy',gen:5,tier:2},
  {id:547,name:'Whimsicott',slug:'whimsicott',type:'grass',type2:'fairy',gen:5,tier:3},
  {id:548,name:'Petilil',slug:'petilil',type:'grass',gen:5,tier:2},
  {id:549,name:'Lilligant',slug:'lilligant',type:'grass',gen:5,tier:3},
  {id:550,name:'Basculin',slug:'basculin',type:'water',gen:5,tier:2},
  {id:551,name:'Sandile',slug:'sandile',type:'ground',type2:'dark',gen:5,tier:3},
  {id:552,name:'Krokorok',slug:'krokorok',type:'ground',type2:'dark',gen:5,tier:2},
  {id:553,name:'Krookodile',slug:'krookodile',type:'ground',type2:'dark',gen:5,tier:3},
  {id:554,name:'Darumaka',slug:'darumaka',type:'fire',gen:5,tier:2},
  {id:555,name:'Darmanitan',slug:'darmanitan',type:'fire',gen:5,tier:3},
  {id:556,name:'Maractus',slug:'maractus',type:'grass',gen:5,tier:1},
  {id:557,name:'Dwebble',slug:'dwebble',type:'bug',type2:'rock',gen:5,tier:2},
  {id:558,name:'Crustle',slug:'crustle',type:'bug',type2:'rock',gen:5,tier:3},
  {id:559,name:'Scraggy',slug:'scraggy',type:'dark',type2:'fighting',gen:5,tier:2},
  {id:560,name:'Scrafty',slug:'scrafty',type:'dark',type2:'fighting',gen:5,tier:3},
  {id:561,name:'Sigilyph',slug:'sigilyph',type:'psychic',type2:'flying',gen:5,tier:1},
  {id:562,name:'Yamask',slug:'yamask',type:'ghost',gen:5,tier:2},
  {id:563,name:'Cofagrigus',slug:'cofagrigus',type:'ghost',gen:5,tier:3},
  {id:564,name:'Tirtouga',slug:'tirtouga',type:'water',type2:'rock',gen:5,tier:2},
  {id:565,name:'Carracosta',slug:'carracosta',type:'water',type2:'rock',gen:5,tier:3},
  {id:566,name:'Archen',slug:'archen',type:'rock',type2:'flying',gen:5,tier:2},
  {id:567,name:'Archeops',slug:'archeops',type:'rock',type2:'flying',gen:5,tier:3},
  {id:568,name:'Trubbish',slug:'trubbish',type:'poison',gen:5,tier:2},
  {id:569,name:'Garbodor',slug:'garbodor',type:'poison',gen:5,tier:3},
  {id:570,name:'Zorua',slug:'zorua',type:'dark',gen:5,tier:2},
  {id:571,name:'Zoroark',slug:'zoroark',type:'dark',gen:5,tier:3},
  {id:572,name:'Minccino',slug:'minccino',type:'normal',gen:5,tier:2},
  {id:573,name:'Cinccino',slug:'cinccino',type:'normal',gen:5,tier:3},
  {id:574,name:'Gothita',slug:'gothita',type:'psychic',gen:5,tier:1},
  {id:575,name:'Gothorita',slug:'gothorita',type:'psychic',gen:5,tier:2},
  {id:576,name:'Gothitelle',slug:'gothitelle',type:'psychic',gen:5,tier:3},
  {id:577,name:'Solosis',slug:'solosis',type:'psychic',gen:5,tier:1},
  {id:578,name:'Duosion',slug:'duosion',type:'psychic',gen:5,tier:2},
  {id:579,name:'Reuniclus',slug:'reuniclus',type:'psychic',gen:5,tier:3},
  {id:580,name:'Ducklett',slug:'ducklett',type:'water',type2:'flying',gen:5,tier:2},
  {id:581,name:'Swanna',slug:'swanna',type:'water',type2:'flying',gen:5,tier:3},
  {id:582,name:'Vanillite',slug:'vanillite',type:'ice',gen:5,tier:1},
  {id:583,name:'Vanillish',slug:'vanillish',type:'ice',gen:5,tier:2},
  {id:584,name:'Vanilluxe',slug:'vanilluxe',type:'ice',gen:5,tier:3},
  {id:585,name:'Deerling',slug:'deerling',type:'normal',type2:'grass',gen:5,tier:1},
  {id:586,name:'Sawsbuck',slug:'sawsbuck',type:'normal',type2:'grass',gen:5,tier:2},
  {id:587,name:'Emolga',slug:'emolga',type:'electric',type2:'flying',gen:5,tier:3},
  {id:588,name:'Karrablast',slug:'karrablast',type:'bug',gen:5,tier:2},
  {id:589,name:'Escavalier',slug:'escavalier',type:'bug',type2:'steel',gen:5,tier:3},
  {id:590,name:'Foongus',slug:'foongus',type:'grass',type2:'poison',gen:5,tier:2},
  {id:591,name:'Amoonguss',slug:'amoonguss',type:'grass',type2:'poison',gen:5,tier:3},
  {id:592,name:'Frillish',slug:'frillish',type:'water',type2:'ghost',gen:5,tier:2},
  {id:593,name:'Jellicent',slug:'jellicent',type:'water',type2:'ghost',gen:5,tier:3},
  {id:594,name:'Alomomola',slug:'alomomola',type:'water',gen:5,tier:1},
  {id:595,name:'Joltik',slug:'joltik',type:'bug',type2:'electric',gen:5,tier:2},
  {id:596,name:'Galvantula',slug:'galvantula',type:'bug',type2:'electric',gen:5,tier:3},
  {id:597,name:'Ferroseed',slug:'ferroseed',type:'grass',type2:'steel',gen:5,tier:1},
  {id:598,name:'Ferrothorn',slug:'ferrothorn',type:'grass',type2:'steel',gen:5,tier:3},
  {id:599,name:'Klink',slug:'klink',type:'steel',gen:5,tier:1},
  {id:600,name:'Klang',slug:'klang',type:'steel',gen:5,tier:2},
  {id:601,name:'Klinklang',slug:'klinklang',type:'steel',gen:5,tier:3},
  {id:602,name:'Tynamo',slug:'tynamo',type:'electric',gen:5,tier:1},
  {id:603,name:'Eelektrik',slug:'eelektrik',type:'electric',gen:5,tier:2},
  {id:604,name:'Eelektross',slug:'eelektross',type:'electric',gen:5,tier:3},
  {id:605,name:'Elgyem',slug:'elgyem',type:'psychic',gen:5,tier:2},
  {id:606,name:'Beheeyem',slug:'beheeyem',type:'psychic',gen:5,tier:3},
  {id:607,name:'Litwick',slug:'litwick',type:'ghost',type2:'fire',gen:5,tier:1},
  {id:608,name:'Lampent',slug:'lampent',type:'ghost',type2:'fire',gen:5,tier:2},
  {id:609,name:'Chandelure',slug:'chandelure',type:'ghost',type2:'fire',gen:5,tier:3},
  {id:610,name:'Axew',slug:'axew',type:'dragon',gen:5,tier:1},
  {id:611,name:'Fraxure',slug:'fraxure',type:'dragon',gen:5,tier:2},
  {id:612,name:'Haxorus',slug:'haxorus',type:'dragon',gen:5,tier:3},
  {id:613,name:'Cubchoo',slug:'cubchoo',type:'ice',gen:5,tier:2},
  {id:614,name:'Beartic',slug:'beartic',type:'ice',gen:5,tier:3},
  {id:615,name:'Cryogonal',slug:'cryogonal',type:'ice',gen:5,tier:3},
  {id:616,name:'Shelmet',slug:'shelmet',type:'bug',gen:5,tier:2},
  {id:617,name:'Accelgor',slug:'accelgor',type:'bug',gen:5,tier:3},
  {id:618,name:'Stunfisk',slug:'stunfisk',type:'ground',type2:'electric',gen:5,tier:3},
  {id:619,name:'Mienfoo',slug:'mienfoo',type:'fighting',gen:5,tier:2},
  {id:620,name:'Mienshao',slug:'mienshao',type:'fighting',gen:5,tier:3},
  {id:621,name:'Druddigon',slug:'druddigon',type:'dragon',gen:5,tier:3},
  {id:622,name:'Golett',slug:'golett',type:'ground',type2:'ghost',gen:5,tier:2},
  {id:623,name:'Golurk',slug:'golurk',type:'ground',type2:'ghost',gen:5,tier:3},
  {id:624,name:'Pawniard',slug:'pawniard',type:'dark',type2:'steel',gen:5,tier:2},
  {id:625,name:'Bisharp',slug:'bisharp',type:'dark',type2:'steel',gen:5,tier:3},
  {id:626,name:'Bouffalant',slug:'bouffalant',type:'normal',gen:5,tier:3},
  {id:627,name:'Rufflet',slug:'rufflet',type:'normal',type2:'flying',gen:5,tier:2},
  {id:628,name:'Braviary',slug:'braviary',type:'normal',type2:'flying',gen:5,tier:3},
  {id:629,name:'Vullaby',slug:'vullaby',type:'dark',type2:'flying',gen:5,tier:2},
  {id:630,name:'Mandibuzz',slug:'mandibuzz',type:'dark',type2:'flying',gen:5,tier:3},
  {id:631,name:'Heatmor',slug:'heatmor',type:'fire',gen:5,tier:2},
  {id:632,name:'Durant',slug:'durant',type:'bug',type2:'steel',gen:5,tier:3},
  {id:633,name:'Deino',slug:'deino',type:'dark',type2:'dragon',gen:5,tier:2},
  {id:634,name:'Zweilous',slug:'zweilous',type:'dark',type2:'dragon',gen:5,tier:3},
  {id:635,name:'Hydreigon',slug:'hydreigon',type:'dark',type2:'dragon',gen:5,tier:1},
  {id:636,name:'Larvesta',slug:'larvesta',type:'bug',type2:'fire',gen:5,tier:3},
  {id:637,name:'Volcarona',slug:'volcarona',type:'bug',type2:'fire',gen:5,tier:1},
  {id:638,name:'Cobalion',slug:'cobalion',type:'steel',type2:'fighting',gen:5,tier:4},
  {id:639,name:'Terrakion',slug:'terrakion',type:'rock',type2:'fighting',gen:5,tier:4},
  {id:640,name:'Virizion',slug:'virizion',type:'grass',type2:'fighting',gen:5,tier:4},
  {id:641,name:'Tornadus',slug:'tornadus',type:'flying',gen:5,tier:4},
  {id:642,name:'Thundurus',slug:'thundurus',type:'electric',type2:'flying',gen:5,tier:4},
  {id:643,name:'Reshiram',slug:'reshiram',type:'dragon',type2:'fire',gen:5,tier:4},
  {id:644,name:'Zekrom',slug:'zekrom',type:'dragon',type2:'electric',gen:5,tier:4},
  {id:645,name:'Landorus',slug:'landorus',type:'ground',type2:'flying',gen:5,tier:4},
  {id:646,name:'Kyurem',slug:'kyurem',type:'dragon',type2:'ice',gen:5,tier:4},
  {id:647,name:'Keldeo',slug:'keldeo',type:'water',type2:'fighting',gen:5,tier:1},
  {id:648,name:'Meloetta',slug:'meloetta',type:'normal',type2:'psychic',gen:5,tier:3},
  {id:649,name:'Genesect',slug:'genesect',type:'bug',type2:'steel',gen:5,tier:4},
  {id:650,name:'Chespin',slug:'chespin',type:'grass',gen:6,tier:1},
  {id:651,name:'Quilladin',slug:'quilladin',type:'grass',gen:6,tier:1},
  {id:652,name:'Chesnaught',slug:'chesnaught',type:'grass',type2:'fighting',gen:6,tier:1},
  {id:653,name:'Fennekin',slug:'fennekin',type:'fire',gen:6,tier:1},
  {id:654,name:'Braixen',slug:'braixen',type:'fire',gen:6,tier:2},
  {id:655,name:'Delphox',slug:'delphox',type:'fire',type2:'psychic',gen:6,tier:3},
  {id:656,name:'Froakie',slug:'froakie',type:'water',gen:6,tier:1},
  {id:657,name:'Frogadier',slug:'frogadier',type:'water',gen:6,tier:2},
  {id:658,name:'Greninja',slug:'greninja',type:'water',type2:'dark',gen:6,tier:3},
  {id:659,name:'Bunnelby',slug:'bunnelby',type:'normal',gen:6,tier:1},
  {id:660,name:'Diggersby',slug:'diggersby',type:'normal',type2:'ground',gen:6,tier:2},
  {id:661,name:'Fletchling',slug:'fletchling',type:'normal',type2:'flying',gen:6,tier:3},
  {id:662,name:'Fletchinder',slug:'fletchinder',type:'fire',type2:'flying',gen:6,tier:2},
  {id:663,name:'Talonflame',slug:'talonflame',type:'fire',type2:'flying',gen:6,tier:3},
  {id:664,name:'Scatterbug',slug:'scatterbug',type:'bug',gen:6,tier:1},
  {id:665,name:'Spewpa',slug:'spewpa',type:'bug',gen:6,tier:2},
  {id:666,name:'Vivillon',slug:'vivillon',type:'bug',type2:'flying',gen:6,tier:3},
  {id:667,name:'Litleo',slug:'litleo',type:'fire',type2:'normal',gen:6,tier:2},
  {id:668,name:'Pyroar',slug:'pyroar',type:'fire',type2:'normal',gen:6,tier:3},
  {id:669,name:'Flabebe',slug:'flabebe',type:'fairy',gen:6,tier:1},
  {id:670,name:'Floette',slug:'floette',type:'fairy',gen:6,tier:2},
  {id:671,name:'Florges',slug:'florges',type:'fairy',gen:6,tier:3},
  {id:672,name:'Skiddo',slug:'skiddo',type:'grass',gen:6,tier:2},
  {id:673,name:'Gogoat',slug:'gogoat',type:'grass',gen:6,tier:3},
  {id:674,name:'Pancham',slug:'pancham',type:'fighting',gen:6,tier:2},
  {id:675,name:'Pangoro',slug:'pangoro',type:'fighting',type2:'dark',gen:6,tier:3},
  {id:676,name:'Furfrou',slug:'furfrou',type:'normal',gen:6,tier:3},
  {id:677,name:'Espurr',slug:'espurr',type:'psychic',gen:6,tier:1},
  {id:678,name:'Meowstic',slug:'meowstic',type:'psychic',gen:6,tier:2},
  {id:679,name:'Honedge',slug:'honedge',type:'steel',type2:'ghost',gen:6,tier:1},
  {id:680,name:'Doublade',slug:'doublade',type:'steel',type2:'ghost',gen:6,tier:3},
  {id:681,name:'Aegislash',slug:'aegislash',type:'steel',type2:'ghost',gen:6,tier:3},
  {id:682,name:'Spritzee',slug:'spritzee',type:'fairy',gen:6,tier:2},
  {id:683,name:'Aromatisse',slug:'aromatisse',type:'fairy',gen:6,tier:3},
  {id:684,name:'Swirlix',slug:'swirlix',type:'fairy',gen:6,tier:2},
  {id:685,name:'Slurpuff',slug:'slurpuff',type:'fairy',gen:6,tier:3},
  {id:686,name:'Inkay',slug:'inkay',type:'dark',type2:'psychic',gen:6,tier:2},
  {id:687,name:'Malamar',slug:'malamar',type:'dark',type2:'psychic',gen:6,tier:3},
  {id:688,name:'Binacle',slug:'binacle',type:'rock',type2:'water',gen:6,tier:2},
  {id:689,name:'Barbaracle',slug:'barbaracle',type:'rock',type2:'water',gen:6,tier:3},
  {id:690,name:'Skrelp',slug:'skrelp',type:'poison',type2:'water',gen:6,tier:2},
  {id:691,name:'Dragalge',slug:'dragalge',type:'poison',type2:'dragon',gen:6,tier:3},
  {id:692,name:'Clauncher',slug:'clauncher',type:'water',gen:6,tier:2},
  {id:693,name:'Clawitzer',slug:'clawitzer',type:'water',gen:6,tier:3},
  {id:694,name:'Helioptile',slug:'helioptile',type:'electric',type2:'normal',gen:6,tier:2},
  {id:695,name:'Heliolisk',slug:'heliolisk',type:'electric',type2:'normal',gen:6,tier:3},
  {id:696,name:'Tyrunt',slug:'tyrunt',type:'rock',type2:'dragon',gen:6,tier:2},
  {id:697,name:'Tyrantrum',slug:'tyrantrum',type:'rock',type2:'dragon',gen:6,tier:3},
  {id:698,name:'Amaura',slug:'amaura',type:'rock',type2:'ice',gen:6,tier:2},
  {id:699,name:'Aurorus',slug:'aurorus',type:'rock',type2:'ice',gen:6,tier:3},
  {id:700,name:'Sylveon',slug:'sylveon',type:'fairy',gen:6,tier:3},
  {id:701,name:'Hawlucha',slug:'hawlucha',type:'fighting',type2:'flying',gen:6,tier:3},
  {id:702,name:'Dedenne',slug:'dedenne',type:'electric',type2:'fairy',gen:6,tier:3},
  {id:703,name:'Carbink',slug:'carbink',type:'rock',type2:'fairy',gen:6,tier:3},
  {id:704,name:'Goomy',slug:'goomy',type:'dragon',gen:6,tier:1},
  {id:705,name:'Sliggoo',slug:'sliggoo',type:'dragon',gen:6,tier:1},
  {id:706,name:'Goodra',slug:'goodra',type:'dragon',gen:6,tier:3},
  {id:707,name:'Klefki',slug:'klefki',type:'steel',type2:'fairy',gen:6,tier:2},
  {id:708,name:'Phantump',slug:'phantump',type:'ghost',type2:'grass',gen:6,tier:1},
  {id:709,name:'Trevenant',slug:'trevenant',type:'ghost',type2:'grass',gen:6,tier:3},
  {id:710,name:'Pumpkaboo',slug:'pumpkaboo',type:'ghost',type2:'grass',gen:6,tier:2},
  {id:711,name:'Gourgeist',slug:'gourgeist',type:'ghost',type2:'grass',gen:6,tier:3},
  {id:712,name:'Bergmite',slug:'bergmite',type:'ice',gen:6,tier:2},
  {id:713,name:'Avalugg',slug:'avalugg',type:'ice',gen:6,tier:3},
  {id:714,name:'Noibat',slug:'noibat',type:'flying',type2:'dragon',gen:6,tier:1},
  {id:715,name:'Noivern',slug:'noivern',type:'flying',type2:'dragon',gen:6,tier:3},
  {id:716,name:'Xerneas',slug:'xerneas',type:'fairy',gen:6,tier:4},
  {id:717,name:'Yveltal',slug:'yveltal',type:'dark',type2:'flying',gen:6,tier:4},
  {id:718,name:'Zygarde',slug:'zygarde',type:'dragon',type2:'ground',gen:6,tier:4},
  {id:719,name:'Diancie',slug:'diancie',type:'rock',type2:'fairy',gen:6,tier:4},
  {id:720,name:'Hoopa',slug:'hoopa',type:'psychic',type2:'ghost',gen:6,tier:4},
  {id:721,name:'Volcanion',slug:'volcanion',type:'fire',type2:'water',gen:6,tier:4},
  {id:722,name:'Rowlet',slug:'rowlet',type:'grass',type2:'flying',gen:7,tier:1},
  {id:723,name:'Dartrix',slug:'dartrix',type:'grass',type2:'flying',gen:7,tier:2},
  {id:724,name:'Decidueye',slug:'decidueye',type:'grass',type2:'ghost',gen:7,tier:3},
  {id:725,name:'Litten',slug:'litten',type:'fire',gen:7,tier:1},
  {id:726,name:'Torracat',slug:'torracat',type:'fire',gen:7,tier:2},
  {id:727,name:'Incineroar',slug:'incineroar',type:'fire',type2:'dark',gen:7,tier:3},
  {id:728,name:'Popplio',slug:'popplio',type:'water',gen:7,tier:1},
  {id:729,name:'Brionne',slug:'brionne',type:'water',gen:7,tier:2},
  {id:730,name:'Primarina',slug:'primarina',type:'water',type2:'fairy',gen:7,tier:3},
  {id:731,name:'Pikipek',slug:'pikipek',type:'normal',type2:'flying',gen:7,tier:1},
  {id:732,name:'Trumbeak',slug:'trumbeak',type:'normal',type2:'flying',gen:7,tier:2},
  {id:733,name:'Toucannon',slug:'toucannon',type:'normal',type2:'flying',gen:7,tier:3},
  {id:734,name:'Yungoos',slug:'yungoos',type:'normal',gen:7,tier:1},
  {id:735,name:'Gumshoos',slug:'gumshoos',type:'normal',gen:7,tier:2},
  {id:736,name:'Grubbin',slug:'grubbin',type:'bug',gen:7,tier:3},
  {id:737,name:'Charjabug',slug:'charjabug',type:'bug',type2:'electric',gen:7,tier:2},
  {id:738,name:'Vikavolt',slug:'vikavolt',type:'bug',type2:'electric',gen:7,tier:3},
  {id:739,name:'Crabrawler',slug:'crabrawler',type:'fighting',gen:7,tier:2},
  {id:740,name:'Crabominable',slug:'crabominable',type:'fighting',type2:'ice',gen:7,tier:3},
  {id:741,name:'Oricorio',slug:'oricorio',type:'fire',type2:'flying',gen:7,tier:3},
  {id:742,name:'Cutiefly',slug:'cutiefly',type:'bug',type2:'fairy',gen:7,tier:2},
  {id:743,name:'Ribombee',slug:'ribombee',type:'bug',type2:'fairy',gen:7,tier:3},
  {id:744,name:'Rockruff',slug:'rockruff',type:'rock',gen:7,tier:2},
  {id:745,name:'Lycanroc',slug:'lycanroc',type:'rock',gen:7,tier:3},
  {id:746,name:'Wishiwashi',slug:'wishiwashi',type:'water',gen:7,tier:3},
  {id:747,name:'Mareanie',slug:'mareanie',type:'poison',type2:'water',gen:7,tier:2},
  {id:748,name:'Toxapex',slug:'toxapex',type:'poison',type2:'water',gen:7,tier:3},
  {id:749,name:'Mudbray',slug:'mudbray',type:'ground',gen:7,tier:2},
  {id:750,name:'Mudsdale',slug:'mudsdale',type:'ground',gen:7,tier:3},
  {id:751,name:'Dewpider',slug:'dewpider',type:'water',type2:'bug',gen:7,tier:2},
  {id:752,name:'Araquanid',slug:'araquanid',type:'water',type2:'bug',gen:7,tier:3},
  {id:753,name:'Fomantis',slug:'fomantis',type:'grass',gen:7,tier:2},
  {id:754,name:'Lurantis',slug:'lurantis',type:'grass',gen:7,tier:3},
  {id:755,name:'Morelull',slug:'morelull',type:'grass',type2:'fairy',gen:7,tier:2},
  {id:756,name:'Shiinotic',slug:'shiinotic',type:'grass',type2:'fairy',gen:7,tier:3},
  {id:757,name:'Salandit',slug:'salandit',type:'poison',type2:'fire',gen:7,tier:2},
  {id:758,name:'Salazzle',slug:'salazzle',type:'poison',type2:'fire',gen:7,tier:3},
  {id:759,name:'Stufful',slug:'stufful',type:'normal',type2:'fighting',gen:7,tier:2},
  {id:760,name:'Bewear',slug:'bewear',type:'normal',type2:'fighting',gen:7,tier:3},
  {id:761,name:'Bounsweet',slug:'bounsweet',type:'grass',gen:7,tier:2},
  {id:762,name:'Steenee',slug:'steenee',type:'grass',gen:7,tier:3},
  {id:763,name:'Tsareena',slug:'tsareena',type:'grass',gen:7,tier:2},
  {id:764,name:'Comfey',slug:'comfey',type:'fairy',gen:7,tier:3},
  {id:765,name:'Oranguru',slug:'oranguru',type:'normal',type2:'psychic',gen:7,tier:2},
  {id:766,name:'Passimian',slug:'passimian',type:'fighting',gen:7,tier:3},
  {id:767,name:'Wimpod',slug:'wimpod',type:'bug',type2:'water',gen:7,tier:2},
  {id:768,name:'Golisopod',slug:'golisopod',type:'bug',type2:'water',gen:7,tier:3},
  {id:769,name:'Sandygast',slug:'sandygast',type:'ghost',type2:'ground',gen:7,tier:2},
  {id:770,name:'Palossand',slug:'palossand',type:'ghost',type2:'ground',gen:7,tier:3},
  {id:771,name:'Pyukumuku',slug:'pyukumuku',type:'water',gen:7,tier:3},
  {id:772,name:'Type: Null',slug:'type-null',type:'normal',gen:7,tier:1},
  {id:773,name:'Silvally',slug:'silvally',type:'normal',gen:7,tier:3},
  {id:774,name:'Minior',slug:'minior',type:'rock',type2:'flying',gen:7,tier:3},
  {id:775,name:'Komala',slug:'komala',type:'normal',gen:7,tier:3},
  {id:776,name:'Turtonator',slug:'turtonator',type:'fire',type2:'dragon',gen:7,tier:3},
  {id:777,name:'Togedemaru',slug:'togedemaru',type:'electric',type2:'steel',gen:7,tier:3},
  {id:778,name:'Mimikyu',slug:'mimikyu',type:'ghost',type2:'fairy',gen:7,tier:3},
  {id:779,name:'Bruxish',slug:'bruxish',type:'water',type2:'psychic',gen:7,tier:3},
  {id:780,name:'Drampa',slug:'drampa',type:'normal',type2:'dragon',gen:7,tier:3},
  {id:781,name:'Dhelmise',slug:'dhelmise',type:'ghost',type2:'grass',gen:7,tier:3},
  {id:782,name:'Jangmo-o',slug:'jangmo-o',type:'dragon',gen:7,tier:1},
  {id:783,name:'Hakamo-o',slug:'hakamo-o',type:'dragon',type2:'fighting',gen:7,tier:1},
  {id:784,name:'Kommo-o',slug:'kommo-o',type:'dragon',type2:'fighting',gen:7,tier:3},
  {id:785,name:'Tapu Koko',slug:'tapu-koko',type:'electric',type2:'fairy',gen:7,tier:4},
  {id:786,name:'Tapu Lele',slug:'tapu-lele',type:'psychic',type2:'fairy',gen:7,tier:4},
  {id:787,name:'Tapu Bulu',slug:'tapu-bulu',type:'grass',type2:'fairy',gen:7,tier:4},
  {id:788,name:'Tapu Fini',slug:'tapu-fini',type:'water',type2:'fairy',gen:7,tier:4},
  {id:789,name:'Cosmog',slug:'cosmog',type:'psychic',gen:7,tier:4},
  {id:790,name:'Cosmoem',slug:'cosmoem',type:'psychic',gen:7,tier:4},
  {id:791,name:'Solgaleo',slug:'solgaleo',type:'psychic',type2:'steel',gen:7,tier:4},
  {id:792,name:'Lunala',slug:'lunala',type:'psychic',type2:'ghost',gen:7,tier:4},
  {id:793,name:'Nihilego',slug:'nihilego',type:'rock',type2:'poison',gen:7,tier:1},
  {id:794,name:'Buzzwole',slug:'buzzwole',type:'bug',type2:'fighting',gen:7,tier:1},
  {id:795,name:'Pheromosa',slug:'pheromosa',type:'bug',type2:'fighting',gen:7,tier:1},
  {id:796,name:'Xurkitree',slug:'xurkitree',type:'electric',gen:7,tier:1},
  {id:797,name:'Celesteela',slug:'celesteela',type:'steel',type2:'flying',gen:7,tier:1},
  {id:798,name:'Kartana',slug:'kartana',type:'grass',type2:'steel',gen:7,tier:1},
  {id:799,name:'Guzzlord',slug:'guzzlord',type:'dark',type2:'dragon',gen:7,tier:1},
  {id:800,name:'Necrozma',slug:'necrozma',type:'psychic',gen:7,tier:4},
  {id:801,name:'Magearna',slug:'magearna',type:'steel',type2:'fairy',gen:7,tier:4},
  {id:802,name:'Marshadow',slug:'marshadow',type:'fighting',type2:'ghost',gen:7,tier:4},
  {id:803,name:'Poipole',slug:'poipole',type:'poison',gen:7,tier:1},
  {id:804,name:'Naganadel',slug:'naganadel',type:'poison',type2:'dragon',gen:7,tier:1},
  {id:805,name:'Stakataka',slug:'stakataka',type:'rock',type2:'steel',gen:7,tier:1},
  {id:806,name:'Blacephalon',slug:'blacephalon',type:'fire',type2:'ghost',gen:7,tier:1},
  {id:807,name:'Zeraora',slug:'zeraora',type:'electric',gen:7,tier:4},
  {id:808,name:'Meltan',slug:'meltan',type:'steel',gen:7,tier:1},
  {id:809,name:'Melmetal',slug:'melmetal',type:'steel',gen:7,tier:1},
  {id:810,name:'Grookey',slug:'grookey',type:'grass',gen:8,tier:1},
  {id:811,name:'Thwackey',slug:'thwackey',type:'grass',gen:8,tier:2},
  {id:812,name:'Rillaboom',slug:'rillaboom',type:'grass',gen:8,tier:3},
  {id:813,name:'Scorbunny',slug:'scorbunny',type:'fire',gen:8,tier:1},
  {id:814,name:'Raboot',slug:'raboot',type:'fire',gen:8,tier:2},
  {id:815,name:'Cinderace',slug:'cinderace',type:'fire',gen:8,tier:3},
  {id:816,name:'Sobble',slug:'sobble',type:'water',gen:8,tier:1},
  {id:817,name:'Drizzile',slug:'drizzile',type:'water',gen:8,tier:2},
  {id:818,name:'Inteleon',slug:'inteleon',type:'water',gen:8,tier:3},
  {id:819,name:'Skwovet',slug:'skwovet',type:'normal',gen:8,tier:2},
  {id:820,name:'Greedent',slug:'greedent',type:'normal',gen:8,tier:3},
  {id:821,name:'Rookidee',slug:'rookidee',type:'flying',gen:8,tier:2},
  {id:822,name:'Corvisquire',slug:'corvisquire',type:'flying',gen:8,tier:3},
  {id:823,name:'Corviknight',slug:'corviknight',type:'flying',type2:'steel',gen:8,tier:2},
  {id:824,name:'Blipbug',slug:'blipbug',type:'bug',gen:8,tier:3},
  {id:825,name:'Dottler',slug:'dottler',type:'bug',type2:'psychic',gen:8,tier:2},
  {id:826,name:'Orbeetle',slug:'orbeetle',type:'bug',type2:'psychic',gen:8,tier:3},
  {id:827,name:'Nickit',slug:'nickit',type:'dark',gen:8,tier:2},
  {id:828,name:'Thievul',slug:'thievul',type:'dark',gen:8,tier:3},
  {id:829,name:'Gossifleur',slug:'gossifleur',type:'grass',gen:8,tier:2},
  {id:830,name:'Eldegoss',slug:'eldegoss',type:'grass',gen:8,tier:3},
  {id:831,name:'Wooloo',slug:'wooloo',type:'normal',gen:8,tier:2},
  {id:832,name:'Dubwool',slug:'dubwool',type:'normal',gen:8,tier:3},
  {id:833,name:'Chewtle',slug:'chewtle',type:'water',gen:8,tier:2},
  {id:834,name:'Drednaw',slug:'drednaw',type:'water',type2:'rock',gen:8,tier:3},
  {id:835,name:'Yamper',slug:'yamper',type:'electric',gen:8,tier:2},
  {id:836,name:'Boltund',slug:'boltund',type:'electric',gen:8,tier:3},
  {id:837,name:'Rolycoly',slug:'rolycoly',type:'rock',gen:8,tier:2},
  {id:838,name:'Carkol',slug:'carkol',type:'rock',type2:'fire',gen:8,tier:3},
  {id:839,name:'Coalossal',slug:'coalossal',type:'rock',type2:'fire',gen:8,tier:2},
  {id:840,name:'Applin',slug:'applin',type:'grass',type2:'dragon',gen:8,tier:3},
  {id:841,name:'Flapple',slug:'flapple',type:'grass',type2:'dragon',gen:8,tier:2},
  {id:842,name:'Appletun',slug:'appletun',type:'grass',type2:'dragon',gen:8,tier:3},
  {id:843,name:'Silicobra',slug:'silicobra',type:'ground',gen:8,tier:2},
  {id:844,name:'Sandaconda',slug:'sandaconda',type:'ground',gen:8,tier:3},
  {id:845,name:'Cramorant',slug:'cramorant',type:'flying',type2:'water',gen:8,tier:2},
  {id:846,name:'Arrokuda',slug:'arrokuda',type:'water',gen:8,tier:3},
  {id:847,name:'Barraskewda',slug:'barraskewda',type:'water',gen:8,tier:3},
  {id:848,name:'Toxel',slug:'toxel',type:'electric',type2:'poison',gen:8,tier:2},
  {id:849,name:'Toxtricity',slug:'toxtricity',type:'electric',type2:'poison',gen:8,tier:3},
  {id:850,name:'Sizzlipede',slug:'sizzlipede',type:'fire',type2:'bug',gen:8,tier:2},
  {id:851,name:'Centiskorch',slug:'centiskorch',type:'fire',type2:'bug',gen:8,tier:3},
  {id:852,name:'Clobbopus',slug:'clobbopus',type:'fighting',gen:8,tier:2},
  {id:853,name:'Grapploct',slug:'grapploct',type:'fighting',gen:8,tier:3},
  {id:854,name:'Sinistea',slug:'sinistea',type:'ghost',gen:8,tier:2},
  {id:855,name:'Polteageist',slug:'polteageist',type:'ghost',gen:8,tier:3},
  {id:856,name:'Hatenna',slug:'hatenna',type:'psychic',gen:8,tier:2},
  {id:857,name:'Hattrem',slug:'hattrem',type:'psychic',gen:8,tier:3},
  {id:858,name:'Hatterene',slug:'hatterene',type:'psychic',type2:'fairy',gen:8,tier:2},
  {id:859,name:'Impidimp',slug:'impidimp',type:'dark',type2:'fairy',gen:8,tier:3},
  {id:860,name:'Morgrem',slug:'morgrem',type:'dark',type2:'fairy',gen:8,tier:2},
  {id:861,name:'Grimmsnarl',slug:'grimmsnarl',type:'dark',type2:'fairy',gen:8,tier:3},
  {id:862,name:'Obstagoon',slug:'obstagoon',type:'dark',type2:'normal',gen:8,tier:3},
  {id:863,name:'Perrserker',slug:'perrserker',type:'steel',gen:8,tier:3},
  {id:864,name:'Cursola',slug:'cursola',type:'ghost',gen:8,tier:3},
  {id:865,name:'Sirfetch&#39;d',slug:'sirfetchd',type:'fighting',gen:8,tier:3},
  {id:866,name:'Mr. Rime',slug:'mr-rime',type:'ice',type2:'psychic',gen:8,tier:3},
  {id:867,name:'Runerigus',slug:'runerigus',type:'ground',type2:'ghost',gen:8,tier:3},
  {id:868,name:'Milcery',slug:'milcery',type:'fairy',gen:8,tier:2},
  {id:869,name:'Alcremie',slug:'alcremie',type:'fairy',gen:8,tier:3},
  {id:870,name:'Falinks',slug:'falinks',type:'fighting',gen:8,tier:2},
  {id:871,name:'Pincurchin',slug:'pincurchin',type:'electric',gen:8,tier:3},
  {id:872,name:'Snom',slug:'snom',type:'ice',type2:'bug',gen:8,tier:2},
  {id:873,name:'Frosmoth',slug:'frosmoth',type:'ice',type2:'bug',gen:8,tier:3},
  {id:874,name:'Stonjourner',slug:'stonjourner',type:'rock',gen:8,tier:2},
  {id:875,name:'Eiscue',slug:'eiscue',type:'ice',gen:8,tier:3},
  {id:876,name:'Indeedee',slug:'indeedee',type:'psychic',type2:'normal',gen:8,tier:2},
  {id:877,name:'Morpeko',slug:'morpeko',type:'electric',type2:'dark',gen:8,tier:3},
  {id:878,name:'Cufant',slug:'cufant',type:'steel',gen:8,tier:2},
  {id:879,name:'Copperajah',slug:'copperajah',type:'steel',gen:8,tier:3},
  {id:880,name:'Dracozolt',slug:'dracozolt',type:'electric',type2:'dragon',gen:8,tier:3},
  {id:881,name:'Arctozolt',slug:'arctozolt',type:'electric',type2:'ice',gen:8,tier:3},
  {id:882,name:'Dracovish',slug:'dracovish',type:'water',type2:'dragon',gen:8,tier:3},
  {id:883,name:'Arctovish',slug:'arctovish',type:'water',type2:'ice',gen:8,tier:3},
  {id:884,name:'Duraludon',slug:'duraludon',type:'steel',type2:'dragon',gen:8,tier:3},
  {id:885,name:'Dreepy',slug:'dreepy',type:'dragon',type2:'ghost',gen:8,tier:1},
  {id:886,name:'Drakloak',slug:'drakloak',type:'dragon',type2:'ghost',gen:8,tier:2},
  {id:887,name:'Dragapult',slug:'dragapult',type:'dragon',type2:'ghost',gen:8,tier:3},
  {id:888,name:'Zacian',slug:'zacian',type:'fairy',gen:8,tier:4},
  {id:889,name:'Zamazenta',slug:'zamazenta',type:'fighting',gen:8,tier:4},
  {id:890,name:'Eternatus',slug:'eternatus',type:'poison',type2:'dragon',gen:8,tier:4},
  {id:891,name:'Kubfu',slug:'kubfu',type:'fighting',gen:8,tier:4},
  {id:892,name:'Urshifu',slug:'urshifu',type:'fighting',type2:'dark',gen:8,tier:4},
  {id:893,name:'Zarude',slug:'zarude',type:'dark',type2:'grass',gen:8,tier:4},
  {id:894,name:'Regieleki',slug:'regieleki',type:'electric',gen:8,tier:4},
  {id:895,name:'Regidrago',slug:'regidrago',type:'dragon',gen:8,tier:4},
  {id:896,name:'Glastrier',slug:'glastrier',type:'ice',gen:8,tier:4},
  {id:897,name:'Spectrier',slug:'spectrier',type:'ghost',gen:8,tier:4},
  {id:898,name:'Calyrex',slug:'calyrex',type:'psychic',type2:'grass',gen:8,tier:4},
  {id:899,name:'Wyrdeer',slug:'wyrdeer',type:'normal',type2:'psychic',gen:8,tier:1},
  {id:900,name:'Kleavor',slug:'kleavor',type:'bug',type2:'rock',gen:8,tier:1},
  {id:901,name:'Ursaluna',slug:'ursaluna',type:'ground',type2:'normal',gen:8,tier:1},
  {id:902,name:'Basculegion',slug:'basculegion',type:'water',type2:'ghost',gen:8,tier:1},
  {id:903,name:'Sneasler',slug:'sneasler',type:'poison',type2:'fighting',gen:8,tier:1},
  {id:904,name:'Overqwil',slug:'overqwil',type:'poison',type2:'dark',gen:8,tier:1},
  {id:905,name:'Enamorus',slug:'enamorus',type:'fairy',type2:'flying',gen:8,tier:4},
  {id:906,name:'Sprigatito',slug:'sprigatito',type:'grass',gen:9,tier:1},
  {id:907,name:'Floragato',slug:'floragato',type:'grass',gen:9,tier:2},
  {id:908,name:'Meowscarada',slug:'meowscarada',type:'grass',type2:'dark',gen:9,tier:3},
  {id:909,name:'Fuecoco',slug:'fuecoco',type:'fire',gen:9,tier:1},
  {id:910,name:'Crocalor',slug:'crocalor',type:'fire',gen:9,tier:2},
  {id:911,name:'Skeledirge',slug:'skeledirge',type:'fire',type2:'ghost',gen:9,tier:3},
  {id:912,name:'Quaxly',slug:'quaxly',type:'water',gen:9,tier:1},
  {id:913,name:'Quaxwell',slug:'quaxwell',type:'water',gen:9,tier:2},
  {id:914,name:'Quaquaval',slug:'quaquaval',type:'water',type2:'fighting',gen:9,tier:3},
  {id:915,name:'Lechonk',slug:'lechonk',type:'normal',gen:9,tier:2},
  {id:916,name:'Oinkologne',slug:'oinkologne',type:'normal',gen:9,tier:3},
  {id:917,name:'Tarountula',slug:'tarountula',type:'bug',gen:9,tier:1},
  {id:918,name:'Spidops',slug:'spidops',type:'bug',gen:9,tier:2},
  {id:919,name:'Nymble',slug:'nymble',type:'bug',gen:9,tier:3},
  {id:920,name:'Lokix',slug:'lokix',type:'bug',type2:'dark',gen:9,tier:2},
  {id:921,name:'Pawmi',slug:'pawmi',type:'electric',gen:9,tier:3},
  {id:922,name:'Pawmo',slug:'pawmo',type:'electric',type2:'fighting',gen:9,tier:2},
  {id:923,name:'Pawmot',slug:'pawmot',type:'electric',type2:'fighting',gen:9,tier:3},
  {id:924,name:'Fidough',slug:'fidough',type:'fairy',gen:9,tier:2},
  {id:925,name:'Dachsbun',slug:'dachsbun',type:'fairy',gen:9,tier:3},
  {id:926,name:'Smoliv',slug:'smoliv',type:'grass',type2:'normal',gen:9,tier:2},
  {id:927,name:'Dolliv',slug:'dolliv',type:'grass',type2:'normal',gen:9,tier:3},
  {id:928,name:'Arboliva',slug:'arboliva',type:'grass',type2:'normal',gen:9,tier:2},
  {id:929,name:'Squawkabilly',slug:'squawkabilly',type:'normal',type2:'flying',gen:9,tier:3},
  {id:930,name:'Nacli',slug:'nacli',type:'rock',gen:9,tier:2},
  {id:931,name:'Naclstack',slug:'naclstack',type:'rock',gen:9,tier:3},
  {id:932,name:'Garganacl',slug:'garganacl',type:'rock',gen:9,tier:2},
  {id:933,name:'Charcadet',slug:'charcadet',type:'fire',gen:9,tier:3},
  {id:934,name:'Armarouge',slug:'armarouge',type:'fire',type2:'psychic',gen:9,tier:3},
  {id:935,name:'Ceruledge',slug:'ceruledge',type:'fire',type2:'ghost',gen:9,tier:3},
  {id:936,name:'Tadbulb',slug:'tadbulb',type:'electric',gen:9,tier:2},
  {id:937,name:'Bellibolt',slug:'bellibolt',type:'electric',gen:9,tier:3},
  {id:938,name:'Wattrel',slug:'wattrel',type:'electric',type2:'flying',gen:9,tier:2},
  {id:939,name:'Kilowattrel',slug:'kilowattrel',type:'electric',type2:'flying',gen:9,tier:3},
  {id:940,name:'Maschiff',slug:'maschiff',type:'dark',gen:9,tier:2},
  {id:941,name:'Mabosstiff',slug:'mabosstiff',type:'dark',gen:9,tier:3},
  {id:942,name:'Shroodle',slug:'shroodle',type:'poison',type2:'normal',gen:9,tier:2},
  {id:943,name:'Grafaiai',slug:'grafaiai',type:'poison',type2:'normal',gen:9,tier:3},
  {id:944,name:'Bramblin',slug:'bramblin',type:'grass',type2:'ghost',gen:9,tier:3},
  {id:945,name:'Brambleghast',slug:'brambleghast',type:'grass',type2:'ghost',gen:9,tier:2},
  {id:946,name:'Toedscool',slug:'toedscool',type:'ground',type2:'grass',gen:9,tier:3},
  {id:947,name:'Toedscruel',slug:'toedscruel',type:'ground',type2:'grass',gen:9,tier:2},
  {id:948,name:'Klawf',slug:'klawf',type:'rock',gen:9,tier:3},
  {id:949,name:'Capsakid',slug:'capsakid',type:'grass',gen:9,tier:2},
  {id:950,name:'Scovillain',slug:'scovillain',type:'grass',type2:'fire',gen:9,tier:3},
  {id:951,name:'Rellor',slug:'rellor',type:'bug',gen:9,tier:2},
  {id:952,name:'Rabsca',slug:'rabsca',type:'bug',type2:'psychic',gen:9,tier:3},
  {id:953,name:'Flittle',slug:'flittle',type:'psychic',gen:9,tier:2},
  {id:954,name:'Espathra',slug:'espathra',type:'psychic',gen:9,tier:3},
  {id:955,name:'Tinkatink',slug:'tinkatink',type:'fairy',type2:'steel',gen:9,tier:2},
  {id:956,name:'Tinkatuff',slug:'tinkatuff',type:'fairy',type2:'steel',gen:9,tier:3},
  {id:957,name:'Tinkaton',slug:'tinkaton',type:'fairy',type2:'steel',gen:9,tier:2},
  {id:958,name:'Wiglett',slug:'wiglett',type:'water',gen:9,tier:3},
  {id:959,name:'Wugtrio',slug:'wugtrio',type:'water',gen:9,tier:2},
  {id:960,name:'Bombirdier',slug:'bombirdier',type:'flying',type2:'dark',gen:9,tier:3},
  {id:961,name:'Finizen',slug:'finizen',type:'water',gen:9,tier:2},
  {id:962,name:'Palafin',slug:'palafin',type:'water',gen:9,tier:3},
  {id:963,name:'Varoom',slug:'varoom',type:'steel',type2:'poison',gen:9,tier:2},
  {id:964,name:'Revavroom',slug:'revavroom',type:'steel',type2:'poison',gen:9,tier:3},
  {id:965,name:'Cyclizar',slug:'cyclizar',type:'dragon',type2:'normal',gen:9,tier:2},
  {id:966,name:'Orthworm',slug:'orthworm',type:'steel',gen:9,tier:3},
  {id:967,name:'Glimmet',slug:'glimmet',type:'rock',type2:'poison',gen:9,tier:3},
  {id:968,name:'Glimmora',slug:'glimmora',type:'rock',type2:'poison',gen:9,tier:1},
  {id:969,name:'Greavard',slug:'greavard',type:'ghost',gen:9,tier:3},
  {id:970,name:'Houndstone',slug:'houndstone',type:'ghost',gen:9,tier:3},
  {id:971,name:'Flamigo',slug:'flamigo',type:'flying',type2:'fighting',gen:9,tier:2},
  {id:972,name:'Cetoddle',slug:'cetoddle',type:'ice',gen:9,tier:3},
  {id:973,name:'Cetitan',slug:'cetitan',type:'ice',gen:9,tier:3},
  {id:974,name:'Veluza',slug:'veluza',type:'water',type2:'psychic',gen:9,tier:3},
  {id:975,name:'Dondozo',slug:'dondozo',type:'water',gen:9,tier:2},
  {id:976,name:'Tatsugiri',slug:'tatsugiri',type:'dragon',type2:'water',gen:9,tier:3},
  {id:977,name:'Annihilape',slug:'annihilape',type:'fighting',type2:'ghost',gen:9,tier:2},
  {id:978,name:'Clodsire',slug:'clodsire',type:'poison',type2:'ground',gen:9,tier:3},
  {id:979,name:'Farigiraf',slug:'farigiraf',type:'normal',type2:'psychic',gen:9,tier:2},
  {id:980,name:'Dudunsparce',slug:'dudunsparce',type:'normal',gen:9,tier:3},
  {id:981,name:'Kingambit',slug:'kingambit',type:'dark',type2:'steel',gen:9,tier:1},
  {id:982,name:'Great Tusk',slug:'great-tusk',type:'fighting',type2:'ground',gen:9,tier:2},
  {id:983,name:'Scream Tail',slug:'scream-tail',type:'fairy',type2:'psychic',gen:9,tier:3},
  {id:984,name:'Brute Bonnet',slug:'brute-bonnet',type:'grass',type2:'dark',gen:9,tier:2},
  {id:985,name:'Flutter Mane',slug:'flutter-mane',type:'ghost',type2:'fairy',gen:9,tier:3},
  {id:986,name:'Slither Wing',slug:'slither-wing',type:'bug',type2:'fighting',gen:9,tier:1},
  {id:987,name:'Sandy Shocks',slug:'sandy-shocks',type:'electric',type2:'ground',gen:9,tier:4},
  {id:988,name:'Iron Treads',slug:'iron-treads',type:'ground',type2:'steel',gen:9,tier:1},
  {id:989,name:'Iron Bundle',slug:'iron-bundle',type:'ice',type2:'water',gen:9,tier:1},
  {id:990,name:'Iron Hands',slug:'iron-hands',type:'fighting',type2:'electric',gen:9,tier:1},
  {id:991,name:'Iron Jugulis',slug:'iron-jugulis',type:'dark',type2:'flying',gen:9,tier:1},
  {id:992,name:'Iron Moth',slug:'iron-moth',type:'fire',type2:'poison',gen:9,tier:1},
  {id:993,name:'Iron Thorns',slug:'iron-thorns',type:'rock',type2:'electric',gen:9,tier:1},
  {id:994,name:'Frigibax',slug:'frigibax',type:'dragon',type2:'ice',gen:9,tier:1},
  {id:995,name:'Arctibax',slug:'arctibax',type:'dragon',type2:'ice',gen:9,tier:1},
  {id:996,name:'Baxcalibur',slug:'baxcalibur',type:'dragon',type2:'ice',gen:9,tier:1},
  {id:997,name:'Gimmighoul',slug:'gimmighoul',type:'ghost',gen:9,tier:1},
  {id:998,name:'Gholdengo',slug:'gholdengo',type:'steel',type2:'ghost',gen:9,tier:1},
  {id:999,name:'Wo-Chien',slug:'wo-chien',type:'dark',type2:'grass',gen:9,tier:1},
  {id:1000,name:'Chien-Pao',slug:'chien-pao',type:'dark',type2:'ice',gen:9,tier:2},
  {id:1001,name:'Ting-Lu',slug:'ting-lu',type:'dark',type2:'ground',gen:9,tier:4},
  {id:1002,name:'Chi-Yu',slug:'chi-yu',type:'dark',type2:'fire',gen:9,tier:2},
  {id:1003,name:'Roaring Moon',slug:'roaring-moon',type:'dragon',type2:'dark',gen:9,tier:3},
  {id:1004,name:'Iron Valiant',slug:'iron-valiant',type:'fairy',type2:'fighting',gen:9,tier:4},
  {id:1005,name:'Koraidon',slug:'koraidon',type:'fighting',type2:'dragon',gen:9,tier:2},
  {id:1006,name:'Miraidon',slug:'miraidon',type:'electric',type2:'dragon',gen:9,tier:3},
  {id:1007,name:'Walking Wake',slug:'walking-wake',type:'water',type2:'dragon',gen:9,tier:4},
  {id:1008,name:'Iron Leaves',slug:'iron-leaves',type:'grass',type2:'psychic',gen:9,tier:4},
  {id:1009,name:'Dipplin',slug:'dipplin',type:'grass',type2:'dragon',gen:9,tier:3},
  {id:1010,name:'Poltchageist',slug:'poltchageist',type:'grass',type2:'ghost',gen:9,tier:3},
  {id:1011,name:'Sinistcha',slug:'sinistcha',type:'grass',type2:'ghost',gen:9,tier:3},
  {id:1012,name:'Okidogi',slug:'okidogi',type:'poison',type2:'fighting',gen:9,tier:3},
  {id:1013,name:'Munkidori',slug:'munkidori',type:'poison',type2:'psychic',gen:9,tier:2},
  {id:1014,name:'Fezandipiti',slug:'fezandipiti',type:'poison',type2:'fairy',gen:9,tier:4},
  {id:1015,name:'Ogerpon',slug:'ogerpon',type:'grass',gen:9,tier:4},
  {id:1016,name:'Gouging Fire',slug:'gouging-fire',type:'fire',type2:'dragon',gen:9,tier:4},
  {id:1017,name:'Raging Bolt',slug:'raging-bolt',type:'electric',type2:'dragon',gen:9,tier:4},
  {id:1018,name:'Iron Boulder',slug:'iron-boulder',type:'rock',type2:'psychic',gen:9,tier:4},
  {id:1019,name:'Iron Crown',slug:'iron-crown',type:'steel',type2:'psychic',gen:9,tier:4},
  {id:1020,name:'Terapagos',slug:'terapagos',type:'normal',gen:9,tier:4},
  {id:1021,name:'Pecharunt',slug:'pecharunt',type:'poison',type2:'ghost',gen:9,tier:3},
  {id:1022,name:'Ursaluna (Bloodmoon)',slug:'ursaluna-bloodmoon',type:'ground',type2:'normal',gen:9,tier:3},
  {id:1024,name:'Archaludon',slug:'archaludon',type:'steel',type2:'dragon',gen:9,tier:3},
  {id:1025,name:'Hydrapple',slug:'hydrapple',type:'grass',type2:'dragon',gen:9,tier:3}
]

const TYPE_COLORS={fire:'#FF6B35',water:'#4FC3F7',electric:'#FFCB05',grass:'#4CAF50',normal:'#A8A878',psychic:'#F95587',rock:'#B8A038',ice:'#98D8D8',dragon:'#7038F8',ghost:'#705898',flying:'#A890F0',fighting:'#C03028',poison:'#A040A0',ground:'#E0C068',bug:'#A8B820',steel:'#B8B8D0',dark:'#705848',fairy:'#EE99AC'}
const TYPE_EMOJI={fire:'🔥',water:'💧',electric:'⚡',grass:'🍃',normal:'💢',psychic:'🔮',rock:'🪨',ice:'❄️',dragon:'🐉',ghost:'👻',flying:'🌪️',fighting:'👊',poison:'☠️',ground:'💥',bug:'🐛',steel:'⚔️',dark:'🌑',fairy:'✨'}
const TYPE_TEXTCOLOR={electric:'#1a1a1a',ice:'#1a1a1a',normal:'white',rock:'white'}

// Global slug→id lookup built from POKEMON_DB
const POKE_IDS = Object.fromEntries(POKEMON_DB.map(p=>[p.slug,p.id]))
window.POKE_IDS = POKE_IDS
// Global slug→tier lookup (1=basic, 2=1st evo, 3=2nd evo, 4=legendary)
const POKE_TIERS = Object.fromEntries(POKEMON_DB.map(p=>[p.slug,p.tier]))
// Tier-based size scaling for sprite consistency across games
// basic 1.0×, 1st evo 1.2×, 2nd evo / legendary 1.3×
function pokeTierScale(slug){
  const t = POKE_TIERS[slug] || 1
  return ({1:1.0, 2:1.2, 3:1.3, 4:1.3})[t] || 1.0
}

// ─── Pokemon facing + visual-size mapping (data-driven) ─────────────────────
// Sparse maps for per-Pokemon overrides. Grow over time as user flags offenders.
// Default: sprite naturally faces viewer's right ('R'), visual scale 1.0×.
// Natural facing of source sprite. DEFAULT 'L' — Pokemondb HOME 3D renders face viewer with slight LEFT bias.
// Add 'R' override here for Pokemon whose natural HD art faces RIGHT.
// Natural facing of HOME CDN sprites (pokemondb.net/sprites/home/normal).
// DEFAULT is 'R' — empirically most sprites face viewer's right (body angled rightward).
// Override with 'L' here for species whose natural HD art faces viewer-left (user-reported).
const POKE_FACING = {
  // Add species here if their enemy rendering looks wrong:
  // fidough: 'L',
}
function pokeFacing(slug){ return POKE_FACING[slug] || 'R' }
// role: 'player' → bottom-left, faces right toward enemy; 'enemy' → top-right, faces left toward player.
// Always returns an explicit scaleX — never empty — so CSS base transforms can't leak in.
function pokeFlipForRole(slug, role){
  const natural = pokeFacing(slug)
  const want = role === 'enemy' ? 'L' : 'R'
  return natural !== want ? 'scaleX(-1)' : 'scaleX(1)'
}
// Apply facing to an element by setting BOTH the --flip custom property (read by
// CSS @keyframes for atk/hit/defeat/swap) and the inline transform (used when no
// animation is running). Single source of truth for G10/G13/G13b/G13c sprite facing.
function applyPokeFlip(el, slug, role, wantDir){
  if(!el) return
  const natural = pokeFacing(slug)
  const want = wantDir || (role === 'enemy' ? 'L' : 'R')
  const sign = natural !== want ? -1 : 1
  el.style.setProperty('--flip', sign)
  el.style.transform = 'scaleX(' + sign + ')'
}
// Visual canvas-fill override — compensate for sprites that fill much more
// or less of their 475×475 home PNG than the roster average. Default = 1.0.
const POKE_VISUAL = {
  // 2026-04-21 user-reported
  meowth: 0.85,
  oddish: 0.80,
}
function pokeVisualScale(slug){ return POKE_VISUAL[slug] || 1.0 }
// Combined render scale = tier × visual. Replaces bare pokeTierScale in battle scenes.
function pokeFinalScale(slug){ return pokeTierScale(slug) * pokeVisualScale(slug) }

// Expose to window.BSE for external games (g13c-pixi.html uses this bridge).
// See games/battle-sprite-engine.js for the standalone variant used when game.js is not loaded.
if (typeof window !== 'undefined') {
  window.BSE = window.BSE || {
    init: (_t)=>{}, facing: pokeFacing, flipForRole: pokeFlipForRole,
    visualScale: pokeVisualScale, tierScale: pokeTierScale, finalScale: pokeFinalScale,
    POKE_FACING, POKE_VISUAL,
  }
}

// Canonical type-color palette for auras / projectiles / UI accents.
// Lowercase keys; pokeTypeColor() handles capitalized input via toLowerCase().
const POKE_TYPE_COLORS = {
  fire:'#f97316',water:'#38bdf8',grass:'#4ade80',electric:'#facc15',
  psychic:'#e879f9',ice:'#67e8f9',dragon:'#818cf8',dark:'#6b7280',
  fighting:'#f87171',ghost:'#c084fc',steel:'#94a3b8',fairy:'#f9a8d4',
  rock:'#a8a29e',ground:'#d97706',flying:'#7dd3fc',bug:'#a3e635',
  poison:'#a855f7',normal:'#d1d5db'
}
function pokeTypeColor(type){
  return POKE_TYPE_COLORS[(type || '').toLowerCase()] || '#a78bfa'
}

// Hotfix #104 (2026-04-28) — port G13C type-themed hit particles to G10.
// User: "G10 effect2 pada pokemon yg terkena serangan juga gak ada. Kan
// simple samakan aja dg g13c". Self-contained: keyframes injected once.
const G10_TYPE_HIT_FX = {
  fire:    {emojis:['🔥','✨'],anim:'g10fxRise',  color:'#FF6B35',count:7},
  water:   {emojis:['💧','🌊'],anim:'g10fxRain',  color:'#4FC3F7',count:6},
  electric:{emojis:['⚡','✨'],anim:'g10fxZap',   color:'#FFCB05',count:9},
  grass:   {emojis:['🍃','🌿'],anim:'g10fxSwirl', color:'#4CAF50',count:7},
  dark:    {emojis:['🌑','💢'],anim:'g10fxShadow',color:'#3a0a5a',count:5},
  psychic: {emojis:['🔮','💫'],anim:'g10fxSpiral',color:'#F95587',count:7},
  ice:     {emojis:['❄️','💎'],anim:'g10fxSnow',  color:'#98D8D8',count:7},
  ghost:   {emojis:['👻','💜'],anim:'g10fxFloat', color:'#705898',count:5},
  flying:  {emojis:['🌪️','💨'],anim:'g10fxWind',  color:'#A890F0',count:6},
  dragon:  {emojis:['💫','🐉'],anim:'g10fxSpin',  color:'#7038F8',count:6},
  fighting:{emojis:['💥','👊'],anim:'g10fxBurst', color:'#C03028',count:7},
  rock:    {emojis:['🪨','💥'],anim:'g10fxDrop',  color:'#B8A038',count:5},
  poison:  {emojis:['☠️','💜'],anim:'g10fxFloat', color:'#A040A0',count:5},
  ground:  {emojis:['💥','🌍'],anim:'g10fxBurst', color:'#E0C068',count:6},
  bug:     {emojis:['✨','🌿'],anim:'g10fxSwirl', color:'#A8B820',count:6},
  steel:   {emojis:['⚔️','✨'],anim:'g10fxSpark', color:'#B8B8D0',count:5},
  normal:  {emojis:['💢','✨'],anim:'g10fxBurst', color:'#A8A878',count:5},
  fairy:   {emojis:['✨','💖'],anim:'g10fxSwirl', color:'#EE99AC',count:7},
}
let _g10HitFXStyleInjected = false
function g10EnsureHitFXStyles() {
  if (_g10HitFXStyleInjected) return
  _g10HitFXStyleInjected = true
  const css = `
@keyframes g10fxRise{0%{transform:scale(0) translateY(0);opacity:0.9}50%{transform:scale(1.3) translateY(-45px);opacity:0.8}100%{transform:scale(0.4) translateY(-90px);opacity:0}}
@keyframes g10fxRain{0%{transform:scale(1.2) translateY(-15px);opacity:0.9}100%{transform:scale(0.7) translateY(70px);opacity:0}}
@keyframes g10fxZap{0%{transform:scale(0) rotate(0deg);opacity:1}30%{transform:scale(1.6) rotate(45deg);opacity:1}100%{transform:scale(0.1) rotate(200deg) translateX(70px);opacity:0}}
@keyframes g10fxSwirl{0%{transform:scale(0) rotate(0deg);opacity:1}55%{transform:scale(1.3) rotate(200deg) translateX(35px);opacity:0.7}100%{transform:scale(0.2) rotate(400deg) translateX(70px);opacity:0}}
@keyframes g10fxShadow{0%{transform:scale(0.3);opacity:0.95;filter:brightness(0.1)}40%{transform:scale(2.2);opacity:0.6}100%{transform:scale(4);opacity:0}}
@keyframes g10fxSpiral{0%{transform:scale(0) rotate(0deg) translateY(0);opacity:1}100%{transform:scale(1.6) rotate(720deg) translateY(-55px);opacity:0}}
@keyframes g10fxSnow{0%{transform:scale(1.1) translateY(0) rotate(0deg);opacity:0.9}100%{transform:scale(0.5) translateY(55px) rotate(360deg);opacity:0}}
@keyframes g10fxFloat{0%{transform:scale(0.6) translateY(0);opacity:0.8}50%{transform:scale(1.1) translateY(-35px);opacity:0.5}100%{transform:scale(0) translateY(-65px);opacity:0}}
@keyframes g10fxWind{0%{transform:scale(1) translateX(0);opacity:0.8}100%{transform:scale(1.6) translateX(-90px) translateY(-25px);opacity:0}}
@keyframes g10fxSpin{0%{transform:scale(0) rotate(0deg);opacity:1}100%{transform:scale(2.2) rotate(720deg);opacity:0}}
@keyframes g10fxBurst{0%{transform:scale(0);opacity:1}40%{transform:scale(1.6);opacity:0.9}100%{transform:scale(3.5);opacity:0}}
@keyframes g10fxDrop{0%{transform:scale(1.3) translateY(-25px);opacity:0.9}65%{transform:scale(1) translateY(35px);opacity:0.7}100%{transform:scale(0.7) translateY(55px);opacity:0}}
@keyframes g10fxSpark{0%{transform:scale(0) rotate(0deg);opacity:1}30%{transform:scale(1.6) rotate(-35deg);opacity:1}100%{transform:scale(0.1) rotate(70deg) translateX(60px);opacity:0}}
`
  const styleEl = document.createElement('style')
  styleEl.textContent = css
  document.head.appendChild(styleEl)
}
function g10SpawnTypeHitFX(targetEl, type) {
  g10EnsureHitFXStyles()
  if (!targetEl) return
  const r = targetEl.getBoundingClientRect()
  if (!r.width) return
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2
  const cfg = G10_TYPE_HIT_FX[(type || '').toLowerCase()] || G10_TYPE_HIT_FX.normal
  for (let i = 0; i < cfg.count; i++) {
    const p = document.createElement('span')
    const px = cx + (Math.random() - 0.5) * r.width
    const py = cy + (Math.random() - 0.5) * r.height
    const sz = 18 + Math.random() * 14
    const dur = 0.55 + Math.random() * 0.45
    const del = i * 0.055
    p.style.cssText = `position:fixed;font-size:${sz}px;left:${px}px;top:${py}px;z-index:401;pointer-events:none;animation:${cfg.anim} ${dur}s ${del}s ease-out both;filter:drop-shadow(0 0 6px ${cfg.color});`
    { var _fn=(i%2===0?(window.UISprites&&UISprites.fxName(type)):'sparkle'); var _fs=(_fn&&window.UISprites)?UISprites.path('fx',_fn):null; if(_fs){p.innerHTML='<img src="'+_fs+'" alt="" style="width:1em;height:1em;object-fit:contain;display:block">'}else{p.textContent = cfg.emojis[i % cfg.emojis.length]} }
    document.body.appendChild(p)
    setTimeout(() => p.remove(), (dur + del) * 1000 + 100)
  }
}

// Unified attacker aura ring — DOM fallback when Pixi isn't active.
// Caller passes the sprite wrap element; ring is removed after dur ms.
function spawnTypeAura(el, type, dur){
  if (!el) return
  const d = dur || 540
  const color = pokeTypeColor(type)
  const r = document.createElement('div')
  r.className = 'poke-aura-ring'
  r.style.cssText = 'position:absolute;inset:-6px;border:3px solid '+color+';border-radius:50%;box-shadow:0 0 24px '+color+',inset 0 0 16px '+color+';pointer-events:none;z-index:6;animation:pokeAuraRing '+d+'ms ease-out forwards;'
  el.appendChild(r)
  setTimeout(function(){ r.remove() }, d)
}

// Both legacy names map to identical pokemondb HD raster. Kept as separate
// functions because many call-sites reference each name directly. Cascade
// helpers de-dup URLs at runtime so duplicate calls cost nothing.
function pokeSpriteOnline(slug){return `assets/Pokemon/others/pokeball.svg`}
function pokeSpriteCDN(slug){return pokeSpriteOnline(slug)}
// SVG variant — 751 vector Pokemon sprites for visual variety
function pokeSpriteSVG(slug){const id=POKE_IDS[slug];return id?`assets/Pokemon/svg/${id}.svg`:null}
// Alt2 HD WebP variant — 1025 Pokemon 630×630 RGBA, covers full Gen 1-9.
// Filename pattern: {NNNN}_{slug}.webp (4-digit zero-padded ID). See TODO Task #37.
// Task #66 fix (2026-04-25): local files use underscore separator + special nidoran case.
function _slugToAlt2File(slug) {
  if (slug === 'nidoran-f') return 'nidoranf'
  if (slug === 'nidoran-m') return 'nidoranm'
  return slug.replace(/-/g, '_')
}
function pokeSpriteAlt2(slug){
  const id = POKE_IDS[slug]
  return id ? `assets/Pokemon/pokemondb_hd_alt2/${String(id).padStart(4,'0')}_${_slugToAlt2File(slug)}.webp` : null
}
// HD priority: alt2 WebP (1025 covered) → local SVG (751 covered) → HD CDN raster. Low-res only as offline fallback.
function pokeSpriteVariant(slug){
  return pokeSpriteAlt2(slug) || pokeSpriteSVG(slug) || pokeSpriteCDN(slug)
}

// ── TRAINER PARTIES ──
const TRAINER_PARTIES = [
  { id:'ash',     name:'Ash',     emoji:'🧢', color:'rgba(239,68,68,0.6)',    glow:'rgba(239,68,68,0.4)',
    party:[
      // Gen 1
      {id:25,  name:'Pikachu',    type:'electric'},
      {id:6,   name:'Charizard',  type:'fire'},
      {id:1,   name:'Bulbasaur',  type:'grass'},
      {id:7,   name:'Squirtle',   type:'water'},
      {id:143, name:'Snorlax',    type:'normal'},
      {id:83,  name:'Farfetchd',  type:'normal'},
      {id:52,  name:'Meowth',     type:'normal'},
      {id:106, name:'Hitmonlee',  type:'fighting'},
      // Gen 2
      {id:154, name:'Meganium',   type:'grass'},
      {id:157, name:'Typhlosion', type:'fire'},
      {id:160, name:'Feraligatr', type:'water'},
      {id:164, name:'Noctowl',    type:'normal'},
      {id:214, name:'Heracross',  type:'bug'},
      // Gen 3
      {id:254, name:'Sceptile',   type:'grass'},
      {id:257, name:'Blaziken',   type:'fire'},
      {id:260, name:'Swampert',   type:'water'},
      {id:333, name:'Swablu',     type:'normal'},
      {id:384, name:'Rayquaza',   type:'dragon'},
      // Gen 4
      {id:389, name:'Torterra',   type:'grass'},
      {id:392, name:'Infernape',  type:'fire'},
      {id:395, name:'Empoleon',   type:'water'},
      {id:448, name:'Lucario',    type:'fighting'},
      {id:445, name:'Garchomp',   type:'dragon'},
      // Gen 5
      {id:497, name:'Serperior',  type:'grass'},
      {id:500, name:'Emboar',     type:'fire'},
      {id:503, name:'Samurott',   type:'water'},
      {id:542, name:'Leavanny',   type:'bug'},
      {id:553, name:'Krookodile', type:'dark'},
      // Gen 6
      {id:658, name:'Greninja',   type:'water'},
      {id:663, name:'Talonflame', type:'fire'},
      {id:701, name:'Hawlucha',   type:'fighting'},
      {id:706, name:'Goodra',     type:'dragon'},
      // Gen 7
      {id:724, name:'Decidueye',  type:'grass'},
      {id:727, name:'Incineroar', type:'fire'},
      {id:730, name:'Primarina',  type:'water'},
      {id:745, name:'Lycanroc',   type:'rock'},
      {id:809, name:'Melmetal',   type:'steel'},
      // Gen 8
      {id:812, name:'Rillaboom',  type:'grass'},
      {id:815, name:'Cinderace',  type:'fire'},
      {id:818, name:'Inteleon',   type:'water'},
      {id:887, name:'Dragapult',  type:'dragon'},
      {id:823, name:'Corviknight',type:'flying'},
    ]},
  { id:'misty',   name:'Misty',   emoji:'🌸', color:'rgba(236,72,153,0.6)',   glow:'rgba(236,72,153,0.4)',
    party:[
      {id:121, name:'Starmie',   type:'water'},
      {id:54,  name:'Psyduck',   type:'water'},
      {id:130, name:'Gyarados',  type:'water'},
      {id:468, name:'Togekiss',  type:'fairy'},
      {id:116, name:'Horsea',    type:'water'},
      {id:184, name:'Azumarill', type:'water'},
    ]},
  { id:'brock',   name:'Brock',   emoji:'🪨', color:'rgba(120,80,30,0.7)',    glow:'rgba(146,64,14,0.5)',
    party:[
      {id:208, name:'Steelix',    type:'steel'},
      {id:74,  name:'Geodude',    type:'rock'},
      {id:205, name:'Forretress', type:'bug'},
      {id:185, name:'Sudowoodo',  type:'rock'},
      {id:453, name:'Croagunk',   type:'poison'},
      {id:259, name:'Marshtomp',  type:'water'},
    ]},
  { id:'clemont', name:'Clemont', emoji:'⚡', color:'rgba(245,158,11,0.6)',   glow:'rgba(245,158,11,0.4)',
    party:[
      {id:695, name:'Heliolisk',  type:'electric'},
      {id:405, name:'Luxray',     type:'electric'},
      {id:82,  name:'Magneton',   type:'electric'},
      {id:702, name:'Dedenne',    type:'electric'},
      {id:652, name:'Chesnaught', type:'grass'},
      {id:659, name:'Bunnelby',   type:'normal'},
    ]},
  { id:'go',      name:'Go',      emoji:'📱', color:'rgba(139,92,246,0.6)',   glow:'rgba(139,92,246,0.4)',
    party:[
      {id:815, name:'Cinderace',  type:'fire'},
      {id:330, name:'Flygon',     type:'dragon'},
      {id:818, name:'Inteleon',   type:'water'},
      {id:59,  name:'Arcanine',   type:'fire'},
      {id:131, name:'Lapras',     type:'water'},
      {id:113, name:'Chansey',    type:'normal'},
    ]},
  { id:'serena',  name:'Serena',  emoji:'💫', color:'rgba(236,72,153,0.5)',   glow:'rgba(167,139,250,0.4)',
    party:[
      {id:700, name:'Sylveon',    type:'fairy'},
      {id:655, name:'Delphox',    type:'fire'},
      {id:674, name:'Pancham',    type:'fighting'},
      {id:133, name:'Eevee',      type:'normal'},
      {id:572, name:'Minccino',   type:'normal'},
      {id:350, name:'Milotic',    type:'water'},
    ]},
  { id:'jessie',  name:'Jessie',  emoji:'🌹', color:'rgba(220,38,38,0.7)',    glow:'rgba(239,68,68,0.5)',
    party:[
      {id:24,  name:'Arbok',      type:'poison'},
      {id:202, name:'Wobbuffet',  type:'psychic'},
      {id:336, name:'Seviper',    type:'poison'},
      {id:269, name:'Dustox',     type:'bug'},
      {id:711, name:'Gourgeist',  type:'ghost'},
      {id:778, name:'Mimikyu',    type:'ghost'},
    ]},
  { id:'james',   name:'James',   emoji:'🌸', color:'rgba(109,40,217,0.65)',  glow:'rgba(139,92,246,0.45)',
    party:[
      {id:110, name:'Weezing',    type:'poison'},
      {id:71,  name:'Victreebel', type:'grass'},
      {id:332, name:'Cacturne',   type:'grass'},
      {id:455, name:'Carnivine',  type:'grass'},
      {id:686, name:'Inkay',      type:'dark'},
      {id:747, name:'Mareanie',   type:'poison'},
    ]},
]

let g10ActiveTrainer = 'ash'
let partyPickerCtx = 'g10' // 'g10' | 'g13b'
let g13bSavedPoke = null   // persists chosen pokemon across G13B rounds

// Hotfix #104 (2026-04-28) — Picker performance overhaul to fix tab-switch
// freeze. Strategy: tab content cache (no rebuild on switch), event
// delegation (1 handler vs 39), debounced tab clicks, IntersectionObserver
// lazy-load (cascade only fires when card enters viewport),
// DocumentFragment batch insert. See plan purring-brewing-flurry.md.
const _partyTabCache = new Map() // trainerId -> HTMLElement (tab pane)
let _partyGridDelegated = false
let _partyTabIO = null
let _partyTabClickT = 0

function _partyGetCurrentId() {
  return (partyPickerCtx === 'g13b' && g13bSavedPoke)
    ? g13bSavedPoke.id
    : (g10State.playerPoke ? g10State.playerPoke.id : -1)
}

function _partyEnsureDelegation(gridEl) {
  if (_partyGridDelegated) return
  _partyGridDelegated = true
  gridEl.addEventListener('click', (ev) => {
    const card = ev.target.closest && ev.target.closest('.g10-party-card')
    if (!card || card.classList.contains('current')) return
    const pokeId = parseInt(card.dataset.pokeId)
    const trainerId = card.dataset.trainerId
    if (!pokeId || !trainerId) return
    const trainer = TRAINER_PARTIES.find(t => t.id === trainerId)
    if (!trainer) return
    const poke = trainer.party.find(p => p.id === pokeId)
    if (!poke) return
    playClick()
    if (partyPickerCtx === 'g13b') { switchG13bPlayerPoke(poke) }
    else { switchPlayerPoke(poke) }
    closePartyPicker()
  })
}

function _partyEnsureIO() {
  if (_partyTabIO || typeof IntersectionObserver === 'undefined') return
  _partyTabIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      const img = e.target
      _partyTabIO.unobserve(img)
      const slug = img.dataset.slug
      const pokeId = parseInt(img.dataset.pokeId)
      if (typeof attachSpriteCascade === 'function' && typeof buildPokeSources === 'function') {
        attachSpriteCascade(img, buildPokeSources(slug, pokeId), '🎴')
      } else {
        img.src = (typeof pokeSpriteAlt2 === 'function' && pokeSpriteAlt2(slug)) || (typeof pokeSpriteOnline === 'function' ? pokeSpriteOnline(slug) : '')
      }
    }
  }, { rootMargin: '200px 0px' })
}

function _partyBuildTabPane(trainer) {
  const pane = document.createElement('div')
  pane.className = 'g10-tab-pane'
  pane.dataset.trainerId = trainer.id
  const frag = document.createDocumentFragment()
  trainer.party.forEach(poke => {
    const card = document.createElement('div')
    card.className = 'g10-party-card'
    card.dataset.pokeId = poke.id
    card.dataset.trainerId = trainer.id
    const typeColor = TYPE_COLORS[poke.type] || '#888'
    card.style.setProperty('--ptc', typeColor)
    const slug = _pokeSlug(poke)
    card.innerHTML = `
      <img class="g10-pcard-spr" alt="${poke.name}" loading="lazy" decoding="async" data-slug="${slug}" data-poke-id="${poke.id}">
      <div class="g10-pcard-name">${poke.name}</div>
      <div class="g10-pcard-type" style="background:${typeColor}">${poke.type.charAt(0).toUpperCase() + poke.type.slice(1)}</div>
    `
    frag.appendChild(card)
  })
  pane.appendChild(frag)
  return pane
}

// Mark party tiles based on effectiveness vs current enemy:
//  - .counter-strong  (green + 🎯) : Pokemon's type beats enemy (1.5x+)
//  - .counter-weak    (red dim + ⛔): Pokemon's type is resisted by enemy
// Determines enemy from context (g13b → currentWild, g10 → enemyPoke).
function _partyMarkCounters(pane) {
  if (!pane || typeof calcTypeMult !== 'function') return
  let enemyType = null
  if (partyPickerCtx === 'g13b' && typeof g13bState === 'object' && g13bState && g13bState.currentWild) {
    enemyType = g13bState.currentWild.type
  } else if (partyPickerCtx === 'g10' && typeof g10State === 'object' && g10State && g10State.enemyPoke) {
    enemyType = g10State.enemyPoke.type
  }
  if (!enemyType) return
  pane.querySelectorAll('.g10-party-card').forEach(card => {
    card.classList.remove('counter-strong', 'counter-weak', 'bag-tile')
    try {
      const pokeId = parseInt(card.dataset.pokeId)
      const trainerId = card.dataset.trainerId
      const trainer = (window.TRAINER_PARTIES || []).find(t => t.id === trainerId)
      const poke = trainer && trainer.party.find(p => p.id === pokeId)
      if (!poke) return
      const m = calcTypeMult(poke.type, enemyType)
      if (m >= 1.5) {
        card.classList.add('counter-strong', 'bag-tile')
      } else if (m <= 0.75) {
        card.classList.add('counter-weak', 'bag-tile')
      }
    } catch(_){}
  })
}

function _partyMarkCurrent(pane) {
  const currentId = _partyGetCurrentId()
  pane.querySelectorAll('.g10-party-card').forEach(card => {
    const isCurrent = parseInt(card.dataset.pokeId) === currentId
    card.classList.toggle('current', isCurrent)
    let badge = card.querySelector('.g10-pcard-curr-badge')
    if (isCurrent && !badge) {
      badge = document.createElement('div')
      badge.className = 'g10-pcard-curr-badge'
      badge.textContent = '✔ Aktif'
      card.insertBefore(badge, card.firstChild)
    } else if (!isCurrent && badge) {
      badge.remove()
    }
  })
}

function openPartyPicker(){
  partyPickerCtx = 'g10'
  _partyTabCache.clear()
  const overlay = document.getElementById('g10-party-overlay')
  if(!overlay) return
  overlay.classList.add('open')
  renderTrainerTabs()
  renderPartyGrid(g10ActiveTrainer)
}
function closePartyPicker(){
  const overlay = document.getElementById('g10-party-overlay')
  if(overlay) overlay.classList.remove('open')
  // Resume G13b game-state timers if we paused it on open (Task #64)
  if (partyPickerCtx === 'g13b' && g13bState && g13bState.phase === 'playing') {
    g13bState.paused = false
  }
  // Hotfix #104: tab cache lives across opens for perf, but reset IO so we
  // re-trigger lazy-load on next open (offscreen images may have cleared).
  if (_partyTabIO) { try { _partyTabIO.disconnect() } catch (_) {} _partyTabIO = null }
  // Hotfix #116: restore overlays we defensively hid on open.
  document.querySelectorAll('.g13b-picker-hidden').forEach(el => {
    el.style.display = ''
    el.classList.remove('g13b-picker-hidden')
  })
}
function renderTrainerTabs(){
  const tabsEl = document.getElementById('g10-trainer-tabs')
  if(!tabsEl) return
  tabsEl.innerHTML = ''
  const frag = document.createDocumentFragment()
  TRAINER_PARTIES.forEach(tr => {
    const tab = document.createElement('button')
    tab.className = 'g10-trainer-tab' + (tr.id===g10ActiveTrainer?' active':'')
    tab.dataset.trainerId = tr.id
    tab.style.setProperty('--tc', tr.color)
    tab.style.setProperty('--tc-glow', tr.glow)
    tab.innerHTML = `<span class="g10-tab-emoji">${tr.emoji}</span><span class="g10-tab-name">${tr.name}</span>`
    tab.onclick = () => {
      // Hotfix #104: debounce — 150ms guard against rapid double-click
      const now = Date.now()
      if (now - _partyTabClickT < 150) return
      _partyTabClickT = now
      if (g10ActiveTrainer === tr.id) return
      g10ActiveTrainer = tr.id
      // Just toggle active class instead of full rebuild (closures cleared
      // since we use dataset+delegation now).
      tabsEl.querySelectorAll('.g10-trainer-tab').forEach(b => {
        b.classList.toggle('active', b.dataset.trainerId === tr.id)
      })
      renderPartyGrid(tr.id)
      playClick()
    }
    frag.appendChild(tab)
  })
  tabsEl.appendChild(frag)
}
function renderPartyGrid(trainerId){
  const gridEl = document.getElementById('g10-party-grid')
  if(!gridEl) return
  const trainer = TRAINER_PARTIES.find(t=>t.id===trainerId)
  if(!trainer) return
  _partyEnsureDelegation(gridEl)
  _partyEnsureIO()
  // Move current grid's cards back into their cached pane (so tab swap
  // preserves loaded images + listeners + scroll state).
  const prevTrainerId = gridEl.dataset.activeTrainer
  if (prevTrainerId && prevTrainerId !== trainerId) {
    const prevPane = _partyTabCache.get(prevTrainerId)
    if (prevPane) {
      while (gridEl.firstChild) prevPane.appendChild(gridEl.firstChild)
    }
  }
  // Build (or reuse) target pane.
  let pane = _partyTabCache.get(trainerId)
  if (!pane) {
    pane = _partyBuildTabPane(trainer)
    _partyTabCache.set(trainerId, pane)
  }
  _partyMarkCurrent(pane)
  // Mark Pokemon that are super-effective vs current enemy (visual counter hint)
  _partyMarkCounters(pane)
  // Swap pane contents into gridEl (single reflow).
  gridEl.innerHTML = ''
  while (pane.firstChild) gridEl.appendChild(pane.firstChild)
  gridEl.dataset.activeTrainer = trainerId
  // Lazy-observe images that haven't loaded yet.
  if (_partyTabIO) {
    gridEl.querySelectorAll('.g10-pcard-spr').forEach(img => {
      if (img.src && !img.src.startsWith('data:') && img.complete) return
      _partyTabIO.observe(img)
    })
  } else {
    // No IntersectionObserver — fallback to immediate cascade load (still
    // bounded by attachSpriteCascade's MAX_CONCURRENT queue).
    gridEl.querySelectorAll('.g10-pcard-spr').forEach(img => {
      if (img.src) return
      const slug = img.dataset.slug
      const pokeId = parseInt(img.dataset.pokeId)
      if (typeof attachSpriteCascade === 'function' && typeof buildPokeSources === 'function') {
        attachSpriteCascade(img, buildPokeSources(slug, pokeId), '🎴')
      }
    })
  }
}
function switchPlayerPoke(poke){
  const s = g10State
  if(!s || s.locked) return
  // Swap out animation
  const pSpr = document.getElementById('g10-pspr')
  if(!pSpr) return
  pSpr.classList.add('spr-swap-out')
  // Show field message
  const fs = document.getElementById('g10-field-status')
  if(fs){ fs.textContent=`Ayo, ${poke.name}!`; fs.classList.add('show'); setTimeout(()=>fs.classList.remove('show'),1200) }
  setTimeout(()=>{
    // Update state
    s.playerPoke = { ...poke, slug: _pokeSlug(poke), type: poke.type }
    // Reload back sprite for player
    pSpr.classList.remove('spr-swap-out')
    pSpr.style.imageRendering = 'auto'
    const slug = _pokeSlug(poke)
    // Hotfix #104 (2026-04-28): cascade via shared helper to kill freeze loop.
    if (typeof attachSpriteCascade === 'function' && typeof buildPokeSources === 'function') {
      attachSpriteCascade(pSpr, buildPokeSources(slug, poke.id), '🦊')
    } else {
      pSpr.src = (typeof pokeSpriteAlt2 === 'function' && pokeSpriteAlt2(slug)) || pokeSpriteOnline(slug)
    }
    // Apply new Pokemon's facing BEFORE swap-in animation starts so keyframe
    // transform:scaleX(var(--flip)) uses the correct sign during the anim.
    applyPokeFlip(pSpr, slug, 'player')
    pSpr.classList.add('spr-swap-in')
    setTimeout(()=>{
      pSpr.classList.remove('spr-swap-in')
      // Re-apply after animation: guards against animation-fill-mode:forwards
      // locking a stale scaleX if the Pokemon has a non-default natural facing.
      applyPokeFlip(pSpr, slug, 'player')
    },350)
    // Apply tier sizing for new player Pokemon
    const _g10swTierSz = t => ({1:1.0, 2:1.2, 3:1.3, 4:1.3}[t||1] || 1.0)
    const swPTierSc = _g10swTierSz(poke.tier)
    pSpr.style.width = pSpr.style.height = ''
    pSpr.style.setProperty('--g10-sc', String(swPTierSc))
    // Update info box
    document.getElementById('g10-pname').textContent = poke.name
    document.getElementById('g10-plv').textContent = 'Lv'+(Math.floor(Math.random()*10)+s.levelNum)
    const ptEl = document.getElementById('g10-ptype')
    ptEl.textContent = poke.type.charAt(0).toUpperCase()+poke.type.slice(1)
    ptEl.style.background = TYPE_COLORS[poke.type]||'#888'
    // Update attack label
    const atkLbl = document.getElementById('g10-atk-lbl')
    if(atkLbl) atkLbl.textContent = `${poke.name.toUpperCase()} MENYERANG!`
  }, 280)
}

function openG13bPartyPicker() {
  partyPickerCtx = 'g13b'
  // Pause game-side timers (legendary auto-attack uses paused-flag guard at game.js:8410)
  // Prevents wild-attack while picker is open and avoids race conditions on close (Task #64)
  if (g13bState && g13bState.phase === 'playing') g13bState.paused = true
  // Hotfix #116: defensively hide lingering result/evo/reward overlays — they sat above
  // picker (z-indices 500/600) and absorbed close-button + tab clicks, freezing the picker.
  const _hideStale = (sel) => {
    document.querySelectorAll(sel).forEach(el => {
      if (getComputedStyle(el).display !== 'none') {
        el.style.display = 'none'
        el.classList.add('g13b-picker-hidden')
      }
    })
  }
  _hideStale('.g13b-result-overlay, .g13-evo-overlay, .gr-overlay, .math-quiz-overlay, #math-quiz-overlay')
  _partyTabCache.clear()
  const overlay = document.getElementById('g10-party-overlay')
  if (!overlay) return
  overlay.classList.add('open')
  renderTrainerTabs()
  renderPartyGrid(g10ActiveTrainer)
}

function switchG13bPlayerPoke(poke) {
  g13bSavedPoke = { ...poke, slug: _pokeSlug(poke) }
  const pspr = document.getElementById('g13b-pspr')
  if (!pspr) return
  // Task #71: local-first per L16. Hotfix 2026-04-28: cascade now goes
  // through attachSpriteCascade (dedup + terminating) to kill freeze loop.
  if (typeof attachSpriteCascade === 'function' && typeof buildPokeSources === 'function') {
    attachSpriteCascade(pspr, buildPokeSources(g13bSavedPoke.slug, poke.id), '🦊')
  } else {
    pspr.src = (typeof pokeSpriteAlt2 === 'function' && pokeSpriteAlt2(g13bSavedPoke.slug)) || pokeSpriteOnline(g13bSavedPoke.slug)
  }
  // Apply facing to player sprite (was missing — caused wrong-facing post-switch)
  if (typeof applyPokeFlip === 'function') applyPokeFlip(pspr, g13bSavedPoke.slug, 'player')
  const pTier = poke.tier || 1
  const pScale = {1:1.0, 2:1.2, 3:1.3, 4:1.3}[pTier] || 1.0
  pspr.style.width = pspr.style.height = pScale === 1.0 ? '' : `calc(clamp(80px, min(20vw, 18vh), 160px) * ${pScale})`
  const pnameEl = document.getElementById('g13b-pname')
  if (pnameEl) pnameEl.textContent = g13bSavedPoke.name
}

// Legendary & special Pokémon ID sets (used by G10, G13, G13B pools)
const _LEGENDARY_IDS = new Set([144,145,146,150,151,243,244,245,249,250,251,380,381,382,383,384,385,386,480,481,482,483,484,487,491,492,493,638,639,640,641,642,643,644,645,646,649,716,717,718,719,720,721,785,786,787,788,789,790,791,792,800,801,802,807,888,889,890,891,892,893,894,895,896,897,898,905,987,1001,1004,1007,1008,1014,1015,1016,1017,1018,1019,1020])
const _PSEUDO_IDS   = new Set([149,248,373,376,445,635,646,706,784,887])
const _CUTE_IDS     = new Set([1,4,7,25,39,52,133,172,175,216,495,498,501,650,653,656,722,725,728,810,813,816,906,909,912,915,921,924])

// Pokemon pool by level — anak bisa kenal favorit lebih dulu
const G10_POOL = {
  favorite: POKEMON_DB.filter(p => _CUTE_IDS.has(p.id)).map(p => p.id),
  mid:      POKEMON_DB.filter(p => !_LEGENDARY_IDS.has(p.id) && !_PSEUDO_IDS.has(p.id) && !_CUTE_IDS.has(p.id)).map(p => p.id),
  boss:     POKEMON_DB.filter(p => _LEGENDARY_IDS.has(p.id) || _PSEUDO_IDS.has(p.id)).map(p => p.id),
}

// Hotfix #101-G: ring buffer of last 4 enemy ids (was: single _g10LastEnemyId).
// User reported "Variasi per city belum banyak masih Pokemon itu2 aja" — 5-7 species
// in a city pool kept repeating because we only suppressed the most recent pick.
// Tracking last 4 forces fresh picks across rounds while still falling back to
// the full pool when 4 distinct species aren't available.
let _g10RecentEnemies = []
const _G10_RECENT_MAX = 4
function pickPokeForLevel(lv){
  // Task #66 (2026-04-25): if city is selected, pick from city.pack
  // Task #91 (2026-04-26): EXPAND with region pool — current city Pokemon get 3x weight
  // (still feel thematic) but neighboring city Pokemon also appear (variety: 30-50 species
  // per region instead of 5-7 per city). Anti-repeat tracker prevents same enemy 2 rounds in a row.
  try {
    if (state && state.selectedRegion && state.selectedCity && typeof CITY_PACK !== 'undefined') {
      const region = CITY_PACK[state.selectedRegion]
      if (region && region.cities) {
        const currentCity = region.cities.find(c => c.slug === state.selectedCity)
        const cityIds = (currentCity && currentCity.pack) ? currentCity.pack.map(p => p.id) : []
        const regionIds = []
        region.cities.forEach(c => (c.pack || []).forEach(p => regionIds.push(p.id)))
        // 3x weight for current city + 1x for region
        const pool = [...cityIds, ...cityIds, ...cityIds, ...regionIds]
        const ids = [...new Set(pool)]  // dedupe; weighting is via duplication in `pool` for next ratio adjustment
        const found = POKEMON_DB.filter(p => ids.includes(p.id))
        if (found.length >= 2) {
          // Hotfix #101-G: filter against last-4 ring buffer; fall back to pool
          // minus the most-recent if all 4 would be excluded (small pool case).
          let candidates = found.filter(p => !_g10RecentEnemies.includes(p.id))
          if (candidates.length === 0) {
            const lastId = _g10RecentEnemies.length ? _g10RecentEnemies[_g10RecentEnemies.length - 1] : -1
            candidates = found.filter(p => p.id !== lastId)
            if (candidates.length === 0) candidates = found
          }
          const pick = candidates[Math.floor(Math.random() * candidates.length)]
          _g10RecentEnemies.push(pick.id)
          if (_g10RecentEnemies.length > _G10_RECENT_MAX) _g10RecentEnemies.shift()
          return pick
        }
      }
    }
  } catch(_) {}
  // Fallback to legacy level-based pool — also tracked in ring buffer for variety.
  const poolKey = lv<=5?'favorite': lv<=15?'mid':'boss'
  const ids = G10_POOL[poolKey]
  const found = POKEMON_DB.filter(p=>ids.includes(p.id))
  const pool = found.length>=3 ? found : POKEMON_DB  // fallback
  // Apply ring-buffer to legacy fallback so dedupe also works when city pool unavailable.
  let candidates = pool.filter(p => !_g10RecentEnemies.includes(p.id))
  if (candidates.length === 0) candidates = pool
  const pick = candidates[Math.floor(Math.random() * candidates.length)]
  _g10RecentEnemies.push(pick.id)
  if (_g10RecentEnemies.length > _G10_RECENT_MAX) _g10RecentEnemies.shift()
  return pick
}

// Task #66: load city background for game-N field if state has selectedCity
function loadCityBackground(fieldEl) {
  if (!fieldEl) return false
  try {
    if (!state || !state.selectedRegion || !state.selectedCity || typeof CITY_PACK === 'undefined') return false
    const region = CITY_PACK[state.selectedRegion]
    const city = region && region.cities && region.cities.find(c => c.slug === state.selectedCity)
    if (!city || !city.bg) return false
    const isMobile = window.innerWidth < 768
    const bgFile = isMobile ? city.bg.mobile : city.bg.pc
    const folder = isMobile ? 'mobile' : 'pc'
    const url = `assets/Pokemon/background/${folder}/${encodeURIComponent(bgFile)}`
    // Hotfix #101-F2: probe before applying. Setting style.backgroundImage on
    // a 404 URL strips the CSS gradient fallback → field goes WHITE
    // (user-reported "round 3 white blank field"). Probe ensures the bg only
    // gets applied if the asset actually loads; on failure, keep CSS gradient.
    const probe = new Image()
    probe.onload = () => {
      probe.onload = probe.onerror = null
      try {
        fieldEl.style.backgroundImage = `url('${url}')`
        fieldEl.style.backgroundSize = 'cover'
        fieldEl.style.backgroundPosition = 'center 22%'
      } catch(_){}
    }
    probe.onerror = () => {
      probe.onload = probe.onerror = null
      // Leave inline backgroundImage empty so CSS class gradient remains visible.
      try { fieldEl.style.backgroundImage = '' } catch(_){}
    }
    probe.src = url
    return true
  } catch(_) { return false }
}

// Level Matrix — tiap level punya config presisi untuk pedagogical scaffolding
const G10_LEVELS = {
  1:  {hp:3, rounds:3,  max:5,  ops:['+'],     attemptsBeforeDamage:3, scaffold:'always'},
  2:  {hp:3, rounds:3,  max:6,  ops:['+'],     attemptsBeforeDamage:3, scaffold:'afterWrong'},
  3:  {hp:3, rounds:4,  max:7,  ops:['+'],     attemptsBeforeDamage:3, scaffold:'afterWrong'},
  4:  {hp:3, rounds:4,  max:8,  ops:['+'],     attemptsBeforeDamage:3, scaffold:'afterWrong'},
  5:  {hp:3, rounds:4,  max:9,  ops:['+'],     attemptsBeforeDamage:3, scaffold:'afterWrong'},
  6:  {hp:4, rounds:5,  max:10, ops:['+'],     attemptsBeforeDamage:3, scaffold:'afterWrong'},
  7:  {hp:4, rounds:5,  max:12, ops:['+','-'], attemptsBeforeDamage:3, scaffold:'afterWrong'},
  8:  {hp:4, rounds:5,  max:13, ops:['+','-'], attemptsBeforeDamage:2, scaffold:'afterWrong'},
  9:  {hp:4, rounds:6,  max:14, ops:['+','-'], attemptsBeforeDamage:2, scaffold:'afterWrong'},
  10: {hp:4, rounds:6,  max:15, ops:['+','-'], attemptsBeforeDamage:2, scaffold:'afterWrong'},
  11: {hp:5, rounds:6,  max:16, ops:['+','-'], attemptsBeforeDamage:2, scaffold:'afterWrong'},
  12: {hp:5, rounds:7,  max:17, ops:['+','-'], attemptsBeforeDamage:2, scaffold:'afterWrong'},
  13: {hp:5, rounds:7,  max:18, ops:['+','-'], attemptsBeforeDamage:2, scaffold:'never'},
  14: {hp:5, rounds:8,  max:19, ops:['+','-'], attemptsBeforeDamage:2, scaffold:'never'},
  15: {hp:5, rounds:8,  max:20, ops:['+','-'], attemptsBeforeDamage:2, scaffold:'never'},
  16: {hp:6, rounds:8,  max:25, ops:['+','-'], attemptsBeforeDamage:1, scaffold:'never'},
  17: {hp:6, rounds:9,  max:30, ops:['+','-'], attemptsBeforeDamage:1, scaffold:'never'},
  18: {hp:6, rounds:9,  max:35, ops:['+','-'], attemptsBeforeDamage:1, scaffold:'never'},
  19: {hp:7, rounds:10, max:40, ops:['+','-'], attemptsBeforeDamage:1, scaffold:'never'},
  20: {hp:7, rounds:12, max:50, ops:['+','-'], attemptsBeforeDamage:1, scaffold:'never', boss:true},
  // Expanded (2026-05-04): levels 21-40 progressively introduce ×, ÷, mixed ops
  // and bigger numbers. Boss at every 10th level. HP scales up so kid still has
  // breathing room with the harder math.
  21: {hp:7, rounds:8,  max:30, ops:['+','-','×'],     attemptsBeforeDamage:2, scaffold:'afterWrong'},
  22: {hp:7, rounds:8,  max:35, ops:['+','-','×'],     attemptsBeforeDamage:2, scaffold:'afterWrong'},
  23: {hp:7, rounds:9,  max:40, ops:['+','-','×'],     attemptsBeforeDamage:2, scaffold:'afterWrong'},
  24: {hp:8, rounds:9,  max:45, ops:['+','-','×'],     attemptsBeforeDamage:2, scaffold:'afterWrong'},
  25: {hp:8, rounds:10, max:50, ops:['+','-','×'],     attemptsBeforeDamage:2, scaffold:'never'},
  26: {hp:8, rounds:10, max:55, ops:['+','-','×','÷'], attemptsBeforeDamage:2, scaffold:'afterWrong'},
  27: {hp:8, rounds:10, max:60, ops:['+','-','×','÷'], attemptsBeforeDamage:2, scaffold:'afterWrong'},
  28: {hp:9, rounds:11, max:65, ops:['+','-','×','÷'], attemptsBeforeDamage:2, scaffold:'afterWrong'},
  29: {hp:9, rounds:11, max:70, ops:['+','-','×','÷'], attemptsBeforeDamage:1, scaffold:'never'},
  30: {hp:9, rounds:12, max:75, ops:['+','-','×','÷'], attemptsBeforeDamage:1, scaffold:'never', boss:true},
  31: {hp:10, rounds:10, max:80, ops:['+','-','×','÷'], attemptsBeforeDamage:1, scaffold:'never'},
  32: {hp:10, rounds:10, max:85, ops:['+','-','×','÷'], attemptsBeforeDamage:1, scaffold:'never'},
  33: {hp:10, rounds:11, max:90, ops:['+','-','×','÷'], attemptsBeforeDamage:1, scaffold:'never'},
  34: {hp:10, rounds:11, max:95, ops:['+','-','×','÷'], attemptsBeforeDamage:1, scaffold:'never'},
  35: {hp:11, rounds:12, max:100, ops:['+','-','×','÷'], attemptsBeforeDamage:1, scaffold:'never'},
  36: {hp:11, rounds:12, max:110, ops:['+','-','×','÷'], attemptsBeforeDamage:1, scaffold:'never'},
  37: {hp:11, rounds:13, max:120, ops:['+','-','×','÷'], attemptsBeforeDamage:1, scaffold:'never'},
  38: {hp:12, rounds:13, max:130, ops:['+','-','×','÷'], attemptsBeforeDamage:1, scaffold:'never'},
  39: {hp:12, rounds:14, max:140, ops:['+','-','×','÷'], attemptsBeforeDamage:1, scaffold:'never'},
  40: {hp:12, rounds:15, max:150, ops:['+','-','×','÷'], attemptsBeforeDamage:1, scaffold:'never', boss:true},
}

// Procedural fallback for any level beyond what's explicitly mapped above.
// Caps HP at 15 and max number at 200 so boss-tier difficulty plateaus.
// Reused by initGame10() if state.selectedLevelNum > 40.
function _g10LevelFallback(lv) {
  const base = G10_LEVELS[40]
  const overflow = Math.max(0, lv - 40)
  return {
    hp: Math.min(15, base.hp + Math.floor(overflow / 4)),
    rounds: Math.min(20, base.rounds + Math.floor(overflow / 3)),
    max: Math.min(200, base.max + overflow * 5),
    ops: base.ops,
    attemptsBeforeDamage: 1,
    scaffold: 'never',
    boss: (lv % 10 === 0)
  }
}

let g10State={}

function initGame10(){
  // Task #84: defensive resets — prevents dangling flags from previous session crash
  state._showingResult = false
  state._showingGameResult = false
  if (!Array.isArray(state.gameStars)) state.gameStars = [0, 0]   // CRITICAL: avoid undefined[0] in endGame
  if (typeof state.currentPlayer !== 'number') state.currentPlayer = 0
  battleBgmPlay()
  // Hotfix #101-H: free any leftover Pixi context from a previous game/level
  // before init. Mobile browsers cap WebGL contexts at ~16; without cleanup,
  // each transition leaks a context until the next init triggers context-loss
  // or a tab crash. destroyAll is idempotent (no-op if nothing to destroy).
  try { if (typeof PixiManager !== 'undefined') PixiManager.destroyAll() } catch(_){}
  loadPixiJS(function(){ PixiManager.init('g10-pixi-canvas').catch(()=>{}) })
  // Hotfix #110/#111: reset sprite element state + flush cascade queue
  // + clear stuck inline CSS (display/opacity/animation/transform/classes)
  // that could survive the previous game's win/death sequence and leave
  // sprite invisible on re-entry. Removed non-existent *-back IDs.
  ;['g10-pspr', 'g10-espr'].forEach(id => {
    const el = document.getElementById(id)
    if (!el) return
    if (typeof resetSpriteEl === 'function') resetSpriteEl(el)
    if (typeof _resetSprElCss === 'function') _resetSprElCss(el)
  })
  if (typeof flushSpriteQueue === 'function') flushSpriteQueue()
  // Force g10-field background fallback if loadCityBackground fails (no city).
  const _g10Field = document.getElementById('g10-field')
  if (_g10Field) {
    _g10Field.style.display = 'flex'
    if (!_g10Field.style.backgroundImage) {
      _g10Field.style.background = 'linear-gradient(180deg,#5C94FC 0%,#3B82F6 60%,#166534 100%)'
    }
  }
  const p=state.players[state.currentPlayer]
  const _icon=document.getElementById('g10-player-icon'); if(_icon) _icon.textContent=p.animal
  document.getElementById('g10-stars').textContent='⭐ 0'
  // Expanded cap 20 → 40 (procedural fallback handles 41+ for future growth)
  const lv = Math.max(1, Math.min(40, state.selectedLevelNum || 1))
  const cfg = G10_LEVELS[lv] || (typeof _g10LevelFallback === 'function' ? _g10LevelFallback(lv) : G10_LEVELS[10])
  // Task #66: load city background if selected
  loadCityBackground(document.getElementById('g10-field'))

  let pp=pickPokeForLevel(lv), ep=pickPokeForLevel(lv)
  // Hotfix #101-B: bounded retry — if pool is misconfigured (e.g. city pack
  // with 1 species) the unbounded while pegged CPU at 100% → tab freeze.
  let _retries = 0
  while(ep.id===pp.id && _retries < 10){ ep=pickPokeForLevel(lv); _retries++ }
  if(ep.id===pp.id){
    const fb = POKEMON_DB.filter(p => p.id !== pp.id)
    if(fb.length) ep = fb[Math.floor(Math.random()*fb.length)]
  }

  g10State={
    playerPoke:pp, enemyPoke:ep,
    playerHp:cfg.hp, enemyHp:cfg.hp,
    playerMaxHp:cfg.hp, enemyMaxHp:cfg.hp,
    round:1, totalRounds:cfg.rounds, stars:0, locked:false,
    maxNum:cfg.max, ops:cfg.ops,
    attemptsBeforeDamage:cfg.attemptsBeforeDamage,
    scaffold:cfg.scaffold,
    levelNum:lv, boss:cfg.boss||false
  }
  g10NewBattle()
}

function g10NewBattle(){
  const s=g10State
  s.locked=false

  // Task #99 (2026-04-27): defensive bg refresh per round. Field could go blank
  // mid-game if a CSS animation cleared inline backgroundImage, leaving white field.
  try { loadCityBackground(document.getElementById('g10-field')) } catch(_){}

  // Emoji-as-SVG data URL fallback for catastrophic sprite cascade failure (offline + no local).
  // Without this, all 4 cascade steps failing leaves a broken-image icon — visually "blank field".
  const _emojiSpriteDataURL = (emoji) => `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="70" font-size="80" text-anchor="middle">'+emoji+'</text></svg>')}`

  // Load sprites via shared cascade helper (dedup + terminating).
  // Hotfix 2026-04-28: replaces ad-hoc onerror chain that previously could
  // re-set src to a URL that just failed. See plan purring-brewing-flurry.md.
  function loadSprHD(imgId, slug, pokeId){
    const el=document.getElementById(imgId)
    if(!el) return
    el.className=el.className.replace(/\bspr-\w+/g,'').trim()
    el.style.opacity='1'; el.style.imageRendering='auto'
    el.style.animation=''
    if (typeof attachSpriteCascade === 'function' && typeof buildPokeSources === 'function') {
      attachSpriteCascade(el, buildPokeSources(slug, pokeId), '👹')
    } else {
      el.src = pokeSpriteVariant(slug)
    }
  }
  function loadSprPlayer(imgId, pokeId, slug){
    const el=document.getElementById(imgId)
    if(!el) return
    el.className=el.className.replace(/\bspr-\w+/g,'').trim()
    el.style.opacity='1'; el.style.imageRendering='auto'
    if (typeof attachSpriteCascade === 'function' && typeof buildPokeSources === 'function') {
      attachSpriteCascade(el, buildPokeSources(slug, pokeId), '🦊')
    } else {
      el.src = pokeSpriteVariant(slug)
    }
  }
  loadSprHD('g10-espr', s.enemyPoke.slug, s.enemyPoke.id)
  loadSprPlayer('g10-pspr', s.playerPoke.id, s.playerPoke.slug)

  // Data-driven facing + final scale. POKE_FACING handles Pokemon whose
  // home sprite faces viewer-left (blanket scaleX(-1) broke them). POKE_VISUAL
  // normalizes sprites that fill more/less of their 475×475 canvas than average.
  const eEl=document.getElementById('g10-espr')
  const pEl=document.getElementById('g10-pspr')
  applyPokeFlip(eEl, s.enemyPoke.slug, 'enemy')
  applyPokeFlip(pEl, s.playerPoke.slug, 'player')
  const eSc = pokeFinalScale(s.enemyPoke.slug)
  const pSc = pokeFinalScale(s.playerPoke.slug)
  // Size lives in CSS (container units of #g10-field); JS only hands over the
  // per-species scale. Inline vw/vh sizes ignored the arena and stayed small on tablets.
  if(eEl){ eEl.style.width = eEl.style.height = ''; eEl.style.setProperty('--g10-sc', String(eSc)) }
  if(pEl){ pEl.style.width = pEl.style.height = ''; pEl.style.setProperty('--g10-sc', String(pSc)) }
  // Reset wrapper entrance animations so they replay cleanly each battle
  const eWrap=document.getElementById('g10-espr-wrap')
  const pWrap=document.getElementById('g10-pspr-wrap')
  if(eWrap){ eWrap.style.animation='none'; void eWrap.offsetWidth; eWrap.style.animation='' }
  if(pWrap){ pWrap.style.animation='none'; void pWrap.offsetWidth; pWrap.style.animation='' }

  // Names + levels
  document.getElementById('g10-ename').textContent=s.enemyPoke.name
  document.getElementById('g10-pname').textContent=s.playerPoke.name
  document.getElementById('g10-elv').textContent='Lv'+(Math.floor(Math.random()*20)+s.levelNum)
  document.getElementById('g10-plv').textContent='Lv'+(Math.floor(Math.random()*10)+s.levelNum)
  document.getElementById('g10-round').textContent=`Ronde ${s.round}/${s.totalRounds}`
  document.getElementById('g10-battle-status').textContent='Jawab soal untuk menyerang!'

  // Type badges
  function setType(id,type){
    const el=document.getElementById(id)
    el.textContent=type.charAt(0).toUpperCase()+type.slice(1)
    el.style.background=TYPE_COLORS[type]||'#888'
  }
  setType('g10-etype', s.enemyPoke.type)
  setType('g10-ptype', s.playerPoke.type)

  // Weakness sticker (only on enemy — teach kid what to use)
  try { if (typeof renderWeaknessSticker === 'function') {
    renderWeaknessSticker(document.getElementById('g10-eweakness-wrap'), s.enemyPoke.type)
  }} catch(_){}

  // HP bars
  g10RenderHp('g10-ehpfill','g10-ehpnums', s.enemyHp, s.enemyMaxHp)
  g10RenderHp('g10-phpfill','g10-phpnums', s.playerHp, s.playerMaxHp)

  // Clear field status
  const fs=document.getElementById('g10-field-status')
  fs.textContent=''; fs.classList.remove('show')

  g10GenQuestion()
}

function g10RenderHp(fillId, numsId, hp, maxHp){
  const pct=Math.max(0,(hp/maxHp)*100)
  const el=document.getElementById(fillId)
  el.style.width=pct+'%'
  el.className='g10-hp-fill'+(pct>50?'':pct>25?' hp-mid':' hp-low')
  document.getElementById(numsId).textContent=`${hp}/${maxHp}`
}

// PRD-58 A5: one G10 question inside its level's own number limit and operations (G10_LEVELS max/ops were stored
// in g10State but the shared generator ignored them, so a level-1 child got subtraction and a level-20 child
// got division)
function g10LevelQuestion(maxNum, ops){
  const ri=(lo,hi)=>lo+Math.floor(Math.random()*(hi-lo+1))
  const op=ops[Math.floor(Math.random()*ops.length)]
  let a,b,ans
  if(op==='-'){ a=ri(2,maxNum); b=ri(1,a); ans=a-b }
  else if(op==='×'){ a=ri(2,Math.min(9,maxNum)); b=ri(2,Math.max(2,Math.min(9,Math.floor(maxNum/a)))); ans=a*b }
  else if(op==='÷'){ b=ri(2,Math.min(9,maxNum)); ans=ri(1,Math.max(1,Math.min(9,Math.floor(maxNum/b)))); a=ans*b }
  else { a=ri(1,Math.max(1,maxNum-1)); b=ri(1,Math.max(1,maxNum-a)); ans=a+b }
  const wrong=new Set()
  for(let g=0; wrong.size<3 && g<40; g++){ const w=ans+(Math.random()<.5?-1:1)*ri(1,3); if(w>=0 && w!==ans) wrong.add(w) }
  for(let w=ans+4; wrong.size<3; w++) wrong.add(w)
  // a/b only for + and -: the counting-orbs scaffold draws those two and nothing else
  return { q:`${a} ${op} ${b} = ?`, ans, op:op==='×'?'*':op, a:(op==='+'||op==='-')?a:null, b:(op==='+'||op==='-')?b:null, choices:[ans,...wrong].sort(()=>Math.random()-0.5) }
}

function g10GenQuestion(){
  const s=g10State
  try { if (window.VFX && VFX.Poke && s.playerPoke && s.enemyPoke) VFX.Poke.prime([String(s.playerPoke.type).toLowerCase(), String(s.enemyPoke.type).toLowerCase()]) } catch(_) {}  // pre-decode this fight's effect sheets
  // Hotfix #112-H: delegate to shared math-rules per user mandate.
  // Easy = anak TK / SD kelas 1; G10 has 20 levels.
  const _diff = state.selectedLevel || 'easy'
  const _lv = state.selectedLevelNum || 1
  let q, qText, lbl, ans
  if (s.maxNum && Array.isArray(s.ops) && s.ops.length) {
    q = g10LevelQuestion(s.maxNum, s.ops)
    ans = q.ans
    qText = q.q
    s._g10Choices = q.choices
    lbl = `${s.playerPoke.name} menyerang!`
  } else if (typeof window.makeGameQuestion === 'function') {
    q = window.makeGameQuestion(_lv, 20, _diff)
    ans = q.ans
    qText = q.q
    s._g10Choices = q.choices
    lbl = `${s.playerPoke.name} menyerang!`
  } else {
    // Fallback: addition only
    const a = Math.floor(Math.random() * 9) + 1, b = Math.floor(Math.random() * 9) + 1
    ans = a + b; qText = `${a} + ${b} = ?`
    s._g10Choices = [ans, ans+1, ans-1, ans+2].sort(() => Math.random() - 0.5)
    lbl = `${s.playerPoke.name} menyerang!`
  }
  s.currentAnswer = ans
  s.currentProblem = { ans, op: q && q.op, text: qText, a: q && q.a, b: q && q.b }
  s.attempts = 0; s._rep = 0
  const hint=document.getElementById('g10-hint'); if(hint) hint.innerHTML=''
  const model=document.getElementById('g10-model'); if(model) model.innerHTML=''
  document.getElementById('g10-atk-lbl').textContent=lbl

  // Animate equation swap
  const mathEl=document.getElementById('g10-math')
  mathEl.classList.remove('pop')
  void mathEl.offsetWidth
  mathEl.textContent=qText
  mathEl.classList.add('pop')

  // Hotfix #112-H: choices come from shared math-rules q.choices.
  const opts = (s._g10Choices && Array.isArray(s._g10Choices)) ? s._g10Choices : [ans]
  const grid=document.getElementById('g10-choices')
  grid.innerHTML=''
  opts.forEach(v=>{
    const btn=document.createElement('button')
    btn.className='g10-cbtn'
    btn.textContent=v
    btn.onclick=()=>g10Answer(v,btn)
    grid.appendChild(btn)
  })
}

function g10ShowHint(mode){
  const s=g10State
  const h=document.getElementById('g10-hint')
  const m=document.getElementById('g10-model')
  if(!h||!m) return
  const p=s.currentProblem||{}
  const {a,b,op,ans}=p
  if(mode==='soft'){
    h.innerHTML='🤔 Hampir! Coba hitung lagi...'
    m.innerHTML=''
  } else if(mode==='model'&&a!=null){
    h.innerHTML='💡 Mari kita hitung bersama!'
    const maxOrbs=Math.min(a,10)
    const orbsA=Array.from({length:maxOrbs},(_,i)=>`<span class="g10-orb g10-orb-a" style="--od:${i*0.04}s">⚡</span>`).join('')
    if(op==='+'){
      const maxOrbsB=Math.min(b,8)
      const orbsB=Array.from({length:maxOrbsB},(_,i)=>`<span class="g10-orb g10-orb-b" style="--od:${(maxOrbs+i)*0.04}s">✨</span>`).join('')
      m.innerHTML=`<div class="g10-orbs">${orbsA}<span class="g10-op">+</span>${orbsB}<span class="g10-op">= ${ans}</span></div>`
    } else {
      m.innerHTML=`<div class="g10-orbs">${orbsA}<span class="g10-op">− ${b} = ${ans}</span></div>`
    }
  } else if(mode==='solution'){
    h.innerHTML=`<span style="color:#F43F5E">❌ Jawaban benar: <b style="font-size:16px">${s.currentAnswer}</b></span>`
    m.innerHTML=''
  }
}

function g10Answer(val, btn){
  if(g10State.locked) return
  const s=g10State
  // Hotfix #112-H: support both numeric (math) and string (knowledge) answers
  const ok = String(val) === String(s.currentAnswer); if(!s._rep){ s._rep=1; duniaReportOp('g10',s.currentProblem&&s.currentProblem.op,s.currentProblem&&s.currentProblem.text,ok) } // PRD-48: first tap counts

  if(ok){
    s.locked=true
    s.attempts=0
    document.querySelectorAll('.g10-cbtn').forEach(b=>b.setAttribute('disabled',''))
    btn.classList.add('correct')
    playCorrect()
    const hint=document.getElementById('g10-hint'); if(hint) hint.innerHTML=''
    const model=document.getElementById('g10-model'); if(model) model.innerHTML=''
    // Player attacks enemy — apply type effectiveness + STAB (auto for auto-attack games)
    g10DoAttack(s.playerPoke.type,'player','enemy',()=>{
      const _mult = (typeof calcFullMult === 'function')
        ? calcFullMult(s.playerPoke.type, s.playerPoke.type, s.enemyPoke.type) * g10WeatherMult(s.playerPoke.type) // PRD-44 weather
        : 1
      // Max HP is 3-4 per level — base 1 keeps 3-4 hit KO baseline.
      // Super-effective rounds up to 2 (one hit faster), resist stays at
      // 1 (floating "Kurang Efektif" text signals the soft loss).
      const _dmg  = Math.max(1, Math.round(_mult))
      s.enemyHp=Math.max(0,s.enemyHp-_dmg)
      g10RenderHp('g10-ehpfill','g10-ehpnums',s.enemyHp,s.enemyMaxHp)
      try { if (typeof applyHitFeedback === 'function') {
        applyHitFeedback(document.querySelector('#g10-eptr-wrap, .g10-ewrap, #g10-espr-wrap, #g10-espr') || document.getElementById('g10-ehpfill'), s.playerPoke.type, s.enemyPoke.type, s.playerPoke.type, _dmg, s.playerPoke.id)
      }} catch(_){}
      document.getElementById('g10-battle-status').textContent=''
      setTimeout(()=>{
        if(s.enemyHp<=0) g10EnemyDefeated()
        else { s.locked=false; g10GenQuestion() }
      },400)
    })
  } else {
    s.attempts=(s.attempts||0)+1
    btn.classList.add('wrong')
    btn.setAttribute('disabled','')
    playWrong()

    const maxAttempts = s.attemptsBeforeDamage || 3
    const scaffold = s.scaffold || 'afterWrong'

    if(s.attempts < maxAttempts){
      // Belum mencapai batas — beri scaffold sesuai level
      if(s.attempts===1){
        document.getElementById('g10-battle-status').textContent='🤔 Belum tepat, coba lagi!'
        if(scaffold==='always' || scaffold==='afterWrong') g10ShowHint('soft')
      } else {
        document.getElementById('g10-battle-status').textContent='💡 Yuk lihat caranya...'
        if(scaffold==='always' || scaffold==='afterWrong') g10ShowHint('model')
      }
      // Don't lock — allow retry (wrong button already disabled)
    } else {
      // Mencapai batas — musuh menyerang
      s.locked=true
      document.querySelectorAll('.g10-cbtn').forEach(b=>b.setAttribute('disabled',''))
      g10ShowHint('solution')
      document.getElementById('g10-battle-status').textContent=''
      g10DoAttack(s.enemyPoke.type,'enemy','player',()=>{
        const _mult = (typeof calcFullMult === 'function')
          ? calcFullMult(s.enemyPoke.type, s.enemyPoke.type, s.playerPoke.type)
          : 1
        const _dmg  = 1 // PRD-44: an enemy hit always costs the child 1 HP (its type still shows in the hit text/FX); see g10EnemyDefeated
        s.playerHp=Math.max(0,s.playerHp-_dmg)
        g10RenderHp('g10-phpfill','g10-phpnums',s.playerHp,s.playerMaxHp)
        try { if (typeof applyHitFeedback === 'function') {
          applyHitFeedback(document.querySelector('#g10-pptr-wrap, .g10-pwrap, #g10-pspr-wrap, #g10-pspr') || document.getElementById('g10-phpfill'), s.enemyPoke.type, s.playerPoke.type, s.enemyPoke.type, _dmg, s.enemyPoke.id)
        }} catch(_){}
        setTimeout(()=>{
          if(s.playerHp<=0) g10PlayerDefeated()
          else { s.locked=false; g10GenQuestion() }
        },800)
      })
    }
  }
}

// Type-specific particle FX on battle field — GPU via Pixi, DOM fallback.
// Canonical 18-type coverage (lowercase keys); aligned with g13TypeHitFX.
function g10TypeFX(type, targetSide){
  const pixiApp = PixiManager.get('g10-pixi-canvas')
  if (pixiApp) {
    pixiTypeFX(pixiApp, type, targetSide)
    return
  }
  // DOM fallback (used if Pixi hasn't loaded yet)
  const field=document.getElementById('g10-field')
  if(!field) return
  const CFG={
    fire:    {emojis:['🔥','✨'],anim:'fxRise',  color:'#FF6B35',count:8},
    water:   {emojis:['💧','🌊'],anim:'fxRain',  color:'#4FC3F7',count:7},
    electric:{emojis:['⚡','✨'],anim:'fxZap',   color:'#FFCB05',count:10},
    grass:   {emojis:['🍃','🌿'],anim:'fxSwirl', color:'#4CAF50',count:8},
    dark:    {emojis:['🌑','💢'],anim:'fxShadow',color:'#3a0a5a',count:5},
    psychic: {emojis:['🔮','💫'],anim:'fxSpiral',color:'#F95587',count:7},
    ice:     {emojis:['❄️','💎'],anim:'fxSnow',  color:'#98D8D8',count:7},
    ghost:   {emojis:['👻','💜'],anim:'fxFloat', color:'#705898',count:5},
    flying:  {emojis:['🌪️','💨'],anim:'fxWind',  color:'#A890F0',count:6},
    dragon:  {emojis:['💫','🐉'],anim:'fxSpin',  color:'#7038F8',count:6},
    fighting:{emojis:['💥','👊'],anim:'fxBurst', color:'#C03028',count:7},
    rock:    {emojis:['🪨','💥'],anim:'fxDrop',  color:'#B8A038',count:5},
    poison:  {emojis:['☠️','💜'],anim:'fxFloat', color:'#A040A0',count:5},
    ground:  {emojis:['💥','🌍'],anim:'fxBurst', color:'#E0C068',count:6},
    bug:     {emojis:['✨','🌿'],anim:'fxSwirl', color:'#A8B820',count:6},
    steel:   {emojis:['⚔️','✨'],anim:'fxSpark', color:'#B8B8D0',count:5},
    normal:  {emojis:['💢','✨'],anim:'fxBurst', color:'#A8A878',count:5},
    fairy:   {emojis:['✨','💖'],anim:'fxSwirl', color:'#EE99AC',count:7},
    default: {emojis:['💥','✨'],anim:'fxBurst', color:'#a8a878',count:5},
  }
  const cfg=CFG[(type||'').toLowerCase()]||CFG.default
  const isEnemy=targetSide==='enemy'
  const xBase=isEnemy?52:5, yBase=isEnemy?2:40
  for(let i=0;i<cfg.count;i++){
    const p=document.createElement('span')
    const px=xBase+Math.random()*38, py=yBase+Math.random()*38
    const dur=0.65+Math.random()*0.45, del=i*0.055
    p.style.cssText=`position:absolute;font-size:${18+Math.random()*16}px;left:${px}%;top:${py}%;z-index:9;pointer-events:none;animation:${cfg.anim} ${dur}s ${del}s ease-out both;filter:drop-shadow(0 0 5px ${cfg.color});`
    { var _fn=(i%2===0?(window.UISprites&&UISprites.fxName(type)):'sparkle'); var _fs=(_fn&&window.UISprites)?UISprites.path('fx',_fn):null; if(_fs){p.innerHTML='<img src="'+_fs+'" alt="" style="width:1em;height:1em;object-fit:contain;display:block">'}else{p.textContent=cfg.emojis[i%cfg.emojis.length]} }
    field.appendChild(p)
    setTimeout(()=>p.remove(),(dur+del)*1000+100)
  }
}

function g10DoAttack(type, fromSide, toSide, onDone){
  // Hit chain has 8+ DOM accesses; if any node disappears mid-round, throwing
  // would freeze the round. Always call onDone() — visual gloss is optional,
  // round progression is not. Guard each visual section so partial failures
  // (e.g. missing flash el) don't cancel later sections (e.g. defender shake).
  let _doneCalled = false
  const _safeDone = () => { if (_doneCalled) return; _doneCalled = true; try { onDone && onDone() } catch(e){ console.error('[g10DoAttack] onDone threw:', e, e && e.stack) } }
  // Watchdog — if the inner setTimeout chain fails to fire, still progress.
  const _wd = setTimeout(_safeDone, 1500)

  try { playAttackSound(type) } catch(_){}
  const emoji = TYPE_EMOJI[type] || '💥'
  const atkEl = document.getElementById('g10-atk-fx')
  const emojiEl = document.getElementById('g10-atk-emoji')

  // Aura ring on attacker — canonical palette via POKE_TYPE_COLORS
  const typeLow = (type || '').toLowerCase()
  const auraColor = pokeTypeColor(typeLow)
  const fromWrapId = fromSide === 'player' ? 'g10-pspr-wrap' : 'g10-espr-wrap'
  const fromWrapEl = document.getElementById(fromWrapId)
  try {
    const _pixiApp = PixiManager.get('g10-pixi-canvas') || PixiManager.get('g13b-pixi-canvas')
    if (_pixiApp) pixiAuraRing(_pixiApp, fromSide, parseInt(auraColor.replace('#',''), 16))
    else spawnTypeAura(fromWrapEl, typeLow)
  } catch(e){ console.warn('[g10DoAttack] aura:', e) }

  try {
    const atkSlug = fromSide === 'player' ? (g10State.playerPoke ? g10State.playerPoke.slug : '') : (g10State.enemyPoke ? g10State.enemyPoke.slug : '')
    const atkType = fromSide === 'player' ? (g10State.playerPoke ? g10State.playerPoke.type : type) : (g10State.enemyPoke ? g10State.enemyPoke.type : type)
    showMovePopup(fromWrapEl, getPokeMove(atkSlug, atkType), auraColor)
  } catch(e){ console.warn('[g10DoAttack] movePopup:', e) }

  try {
    const atkSprId = fromSide === 'player' ? 'g10-pspr' : 'g10-espr'
    const atkSpr = document.getElementById(atkSprId)
    if (atkSpr) {
      atkSpr.classList.remove('spr-atk'); void atkSpr.offsetWidth
      atkSpr.classList.add('spr-atk')
      setTimeout(() => { try { atkSpr.classList.remove('spr-atk') } catch(_){} }, 400)
    }
  } catch(e){ console.warn('[g10DoAttack] attacker lunge:', e) }

  try { g10TypeFX(type, toSide) } catch(e){ console.warn('[g10DoAttack] typeFX:', e) }

  // VFX library (assets/vfx): type-unique wind-up aura + projectile head/trail + impact burst.
  // Lands at 340 ms = the same moment the defender flashes + HP drains. Falls back to the
  // emoji projectile below when the library is not loaded. Reduced motion = fade only (engine).
  let _vfxLaunched = false
  try {
    if (window.VFX && VFX.Poke && VFX.Poke.ready()) {
      const _atkPk = fromSide === 'player' ? g10State.playerPoke : g10State.enemyPoke
      const _defPk = fromSide === 'player' ? g10State.enemyPoke : g10State.playerPoke
      let _vm = 1
      try { if (typeof calcFullMult === 'function' && _atkPk && _defPk) _vm = calcFullMult(type, _atkPk.type, _defPk.type) } catch(_){}
      const _fEl = document.getElementById(fromSide === 'player' ? 'g10-pspr' : 'g10-espr') || fromWrapEl
      const _tEl = document.getElementById(toSide === 'enemy' ? 'g10-espr' : 'g10-pspr') || document.getElementById(toSide === 'enemy' ? 'g10-espr-wrap' : 'g10-pspr-wrap')
      VFX.Poke.windup(typeLow, _fEl, { duration: 340 })
      _vfxLaunched = VFX.Poke.launch(typeLow, _fEl, _tEl, { duration: 340, size: 70, superEff: _vm >= 1.15, big: _vm >= 1.15, arena: document.getElementById('g10-field') })
    }
  } catch(e){ console.warn('[g10DoAttack] vfx lib:', e) }

  // Projectile geometry — null-guard target wrap
  let dx = 0, dy = 0, startX = 0, startY = 0
  try {
    const fromRect = fromWrapEl ? fromWrapEl.getBoundingClientRect() : {left:0,top:0,width:80,height:80}
    const toWrapId = toSide === 'enemy' ? 'g10-espr-wrap' : 'g10-pspr-wrap'
    const toWrap = document.getElementById(toWrapId)
    const toRect = toWrap ? toWrap.getBoundingClientRect() : {left:fromRect.left+200,top:fromRect.top,width:80,height:80}
    startX = fromRect.left + fromRect.width / 2
    startY = fromRect.top + fromRect.height / 2
    dx = (toRect.left + toRect.width / 2) - startX
    dy = (toRect.top + toRect.height / 2) - startY
  } catch(e){ console.warn('[g10DoAttack] geom:', e) }

  try {
    if (_vfxLaunched) {
      /* library projectile is flying — keep the legacy emoji hidden */
    } else {
    if (emojiEl) {
      emojiEl.textContent = ''   // no emoji projectile: plain glowing orb in the type colour
      emojiEl.style.cssText += `;display:block;width:44px;height:44px;border-radius:50%;margin:auto;background:radial-gradient(circle at 38% 36%,#fff,${auraColor} 60%,transparent 72%);box-shadow:0 0 22px ${auraColor}`
      emojiEl.style.animation = 'none'
      void emojiEl.offsetWidth
    }
    if (atkEl) {
      atkEl.style.left = startX + 'px'
      atkEl.style.top = startY + 'px'
      atkEl.style.opacity = '1'
      atkEl.style.transition = 'none'
      atkEl.animate([
        {transform:`translate(-50%,-50%) scale(0.7)`, opacity:1},
        {transform:`translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5}px)) scale(1.3)`, opacity:1, offset:0.6},
        {transform:`translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1.8)`, opacity:0}
      ], {duration:360, easing:'ease-in', fill:'forwards'})
    }
    }
  } catch(e){ console.warn('[g10DoAttack] projectile:', e) }

  try {
    const _flashPixi = PixiManager.get('g10-pixi-canvas') || PixiManager.get('g13b-pixi-canvas')
    if (_flashPixi) {
      pixiTypeFlash(_flashPixi, type)
    } else {
      const flash = document.getElementById('poke-flash')
      if (flash) {
        flash.className = 'poke-flash ' + type
        setTimeout(() => { try { flash.className = 'poke-flash' } catch(_){} }, 700)
      }
    }
  } catch(e){ console.warn('[g10DoAttack] flash:', e) }

  // Defender shakes + flashes after projectile arrives — schedule onDone unconditionally
  setTimeout(() => {
    try {
      if (atkEl) atkEl.style.opacity = '0'
      const defSprId = toSide === 'enemy' ? 'g10-espr' : 'g10-pspr'
      const defSpr = document.getElementById(defSprId)
      if (defSpr) {
        defSpr.classList.remove('spr-hit','spr-flash'); void defSpr.offsetWidth
        defSpr.classList.add('spr-hit','spr-flash'); try { if (window.HitFeel) HitFeel.hit(defSpr) } catch(_){}   // PRD-37: the hit lands (flash, hold, squash)
        // Hotfix #104 (2026-04-28): port g13c-style type-themed hit
        // particles directly on the defender sprite bbox. User: "samakan
        // aja dg g13c". Existing g10TypeFX renders at field-edge corners;
        // this adds tight-on-sprite emoji burst with type emojis/anim.
        try { g10SpawnTypeHitFX(defSpr, type) } catch(e){ console.warn('[g10DoAttack] hit fx:', e) }
        setTimeout(() => {
          try { defSpr.classList.remove('spr-hit','spr-flash') } catch(_){}
          clearTimeout(_wd); _safeDone()
        }, 480)
        return
      }
    } catch(e){ console.warn('[g10DoAttack] defender shake:', e) }
    clearTimeout(_wd); _safeDone()
  }, 340)
}

function g10EnemyDefeated(){
  const s=g10State
  // Death animation
  const eSpr=document.getElementById('g10-espr')
  eSpr.classList.remove('spr-defeat'); void eSpr.offsetWidth
  eSpr.classList.add('spr-defeat')

  // Light burst at enemy position — Pixi primary, CSS fallback
  const wrap=document.getElementById('g10-espr-wrap').getBoundingClientRect()
  const bx=((wrap.left+wrap.width/2)/window.innerWidth*100).toFixed(1)
  const by=((wrap.top+wrap.height/2)/window.innerHeight*100).toFixed(1)
  const _burstPixi = PixiManager.get('g10-pixi-canvas')
  if (_burstPixi) {
    pixiBurstFlash(_burstPixi, parseFloat(bx), parseFloat(by))
  } else {
    const burst=document.getElementById('g10-burst-fx')
    burst.style.setProperty('--bx',bx+'%')
    burst.style.setProperty('--by',by+'%')
    burst.classList.remove('show'); void burst.offsetWidth
    burst.classList.add('show')
    setTimeout(()=>burst.classList.remove('show'),950)
  }

  // Stars
  s.stars++
  state.players[state.currentPlayer].stars++
  const starsEl=document.getElementById('g10-stars')
  starsEl.textContent=`⭐ ${s.stars}`
  // Task #90 (Phase 4.2): use shared animateClass helper (Task #80)
  animateClass(starsEl, 'pop', 400)

  const fs=document.getElementById('g10-field-status')
  fs.textContent=`🏆 ${s.enemyPoke.name} kalah!`
  fs.classList.add('show')

  s.round++
  if(s.round>s.totalRounds){
    setTimeout(()=>{ fs.classList.remove('show'); endGame(s.stars) },1400)
    return
  }

  setTimeout(()=>{
    fs.textContent='Musuh baru datang!'
    let next=pickPokeForLevel(s.levelNum)
    // Hotfix #101-B: bounded retry — see initGame10 for rationale.
    let _retries = 0
    while(next.id===s.playerPoke.id && _retries < 10){ next=pickPokeForLevel(s.levelNum); _retries++ }
    if(next.id===s.playerPoke.id){
      const fb = POKEMON_DB.filter(p => p.id !== s.playerPoke.id)
      if(fb.length) next = fb[Math.floor(Math.random()*fb.length)]
    }
    s.enemyPoke=next
    s.enemyHp=s.enemyMaxHp; s.playerHp=s.playerMaxHp; g10RenderHp('g10-phpfill','g10-phpnums',s.playerHp,s.playerMaxHp) // PRD-44: the child heals between enemies (an 80 % child could not finish level 16+)
    setTimeout(()=>g10NewBattle(),300)
  },1300)
}

function g10PlayerDefeated(){
  const s=g10State
  const pSpr=document.getElementById('g10-pspr')
  pSpr.classList.remove('spr-defeat'); void pSpr.offsetWidth
  pSpr.classList.add('spr-defeat')
  const fs=document.getElementById('g10-field-status')
  fs.textContent=`😢 ${s.playerPoke.name} pingsan!`
  fs.classList.add('show')
  setTimeout(()=>{ fs.classList.remove('show'); endGame(s.stars) },1400)
}

// GAME 11 — KUIS SAINS: games/hub/g11-kuis-sains.js (cut v64.71)

// ─────────────────────────────────────────────────────────────────────
// G25 — Kuis Matematika
// Moved to standalone HTML at games/kuis-matematika.html (2026-06-21).
// World-map tile click is routed via openLevelSelect() at the top of game.js.
// The old in-page implementation block below is intentionally kept as dead
// code for now (will be removed in a follow-up); the standalone is the live
// implementation. Functions below are unreachable since `25` is in
// `standaloneGames` and no `initGame25` is in the `inits` array.
//   - 5-10 questions per page based on tier (easy 6, medium 8, hard 10)
//   - Mirrors G11 (Kuis Sains) flow + modern glass UI
//   - Question generation via window.makeMathQuestionV2() in math-rules.js
//   - 5 question shapes cycled deterministically per level
//   - Operator gating + max-number caps enforced by math-rules.js
// ─────────────────────────────────────────────────────────────────────
const G25_DIFF = {
  easy:   { perPage: 6,  label:'EASY',   pillClass:'easy'   },
  medium: { perPage: 8,  label:'MEDIUM', pillClass:'medium' },
  hard:   { perPage: 10, label:'HARD',   pillClass:'hard'   }
}
const G25_SHAPES = ['standard','missingOperand','missingOperator','comparison','word']
let g25State = {}

function _g25TierFromLevel(lv){
  // Mirrors the global tier mapping at game.js L1697.
  return lv <= 13 ? 'easy' : (lv <= 26 ? 'medium' : 'hard')
}

function _g25OpsPreview(tier, lv){
  if (tier === 'easy')   return 'Hari ini: + − ×₁₂'
  if (tier === 'medium') {
    if (lv > 20) return 'Hari ini: + − × ÷'
    if (lv >= 15) return 'Hari ini: + − ×'
    return 'Hari ini: + −'
  }
  return 'Hari ini: + − × ÷'
}

function initGame25(){
  const lv = state.currentLevel || 1
  const tier = _g25TierFromLevel(lv)
  const cfg = G25_DIFF[tier]
  const p = state.players[state.currentPlayer]
  if (p) document.getElementById('g25-player-icon').textContent = p.animal || ''
  document.getElementById('g25-level').textContent = 'Lv.' + lv
  document.getElementById('g25-stars').textContent = '⭐ 0'

  // Mode pill
  const pill = document.getElementById('g25-mode-pill')
  pill.className = 'mq-mode-pill ' + cfg.pillClass
  pill.textContent = cfg.label

  // Ops preview
  document.getElementById('g25-ops-preview').textContent = _g25OpsPreview(tier, lv)

  // Build the pool of questions for this level — cycle through shapes.
  const pool = []
  const totalLevels = (typeof MAX_LEVEL !== 'undefined') ? MAX_LEVEL : 40
  for (let i = 0; i < cfg.perPage; i++) {
    const shape = G25_SHAPES[i % G25_SHAPES.length]
    const q = window.makeMathQuestionV2(lv, totalLevels, tier, shape)
    pool.push(q)
  }
  g25State = { idx:0, pool, tier, total: cfg.perPage, stars:0, correct:0, wrong:0, level: lv }
  showScreen('screen-game25')
  g25ShowQuestion()
}

function g25ShowQuestion(){
  const s = g25State
  const explainEl = document.getElementById('g25-explain')
  const lanjutEl  = document.getElementById('g25-lanjut')
  if (explainEl) explainEl.style.display = 'none'
  if (lanjutEl)  lanjutEl.style.display = 'none'
  if (s.idx >= s.pool.length){
    // End of page — score + save
    const stars = (typeof GameScoring !== 'undefined' && GameScoring.calc)
      ? GameScoring.calc({ correct: s.correct, total: s.total, wrong: s.wrong })
      : Math.round((s.correct / s.total) * 5)
    const starsEarned = stars >= 4 ? 3 : (stars >= 2 ? 2 : (stars >= 1 ? 1 : 0))
    setLevelComplete(25, s.level, starsEarned)
    if (typeof saveStars === 'function') saveStars()
    if (typeof endGame === 'function') endGame(starsEarned)
    return
  }
  const q = s.pool[s.idx]
  // Emoji per shape — helps kids parse type at a glance.
  const emojiByShape = {
    standard:        '🧮',
    missingOperand:  '🔍',
    missingOperator: '❔',
    comparison:      '⚖️',
    word:            '📖'
  }
  document.getElementById('g25-emoji').textContent = emojiByShape[q.shape] || '🧮'
  document.getElementById('g25-question').textContent = q.q
  document.getElementById('g25-progress-bar').style.width = `${(s.idx / s.total) * 100}%`

  const ch = document.getElementById('g25-choices')
  ch.innerHTML = ''
  // Layout class — symbol/comparison gets row, normal gets column.
  ch.classList.remove('mq-row')
  if (q.shape === 'comparison' || q.shape === 'missingOperator') {
    ch.classList.add('mq-row')
  }

  q.choices.forEach((c, i) => {
    const btn = document.createElement('button')
    btn.className = 'mq-choice'
    if (q.shape === 'comparison')          btn.classList.add('mq-symbol')
    else if (q.shape === 'missingOperator') btn.classList.add('mq-op')
    btn.textContent = String(c)
    btn.onclick = () => g25Answer(i, btn)
    ch.appendChild(btn)
  })
}

function g25Answer(idx, btn){
  const s = g25State
  const q = s.pool[s.idx]
  const picked = q.choices[idx]
  const correct = String(picked) === String(q.ans)
  // Disable all
  document.getElementById('g25-choices').querySelectorAll('.mq-choice').forEach(b => b.setAttribute('disabled',''))
  btn.classList.add(correct ? 'correct' : 'wrong')
  if (!correct){
    if (typeof spawnWrongShake === 'function') spawnWrongShake(btn)
    if (typeof quizStreakReset === 'function') quizStreakReset()
    // Highlight the right answer
    const btns = document.getElementById('g25-choices').querySelectorAll('.mq-choice')
    for (let i = 0; i < btns.length; i++){
      if (String(q.choices[i]) === String(q.ans)){
        btns[i].classList.add('correct')
        if (typeof spawnCorrectCardJuice === 'function') spawnCorrectCardJuice(btns[i], { burst:false })
        break
      }
    }
    s.wrong++
  } else {
    if (typeof spawnCorrectCardJuice === 'function') spawnCorrectCardJuice(btn)
    if (typeof quizStreakHit === 'function') quizStreakHit(btn)
    s.stars++
    s.correct++
    if (state.players && state.players[state.currentPlayer]){
      state.players[state.currentPlayer].stars = (state.players[state.currentPlayer].stars || 0) + 1
    }
    document.getElementById('g25-stars').textContent = `⭐ ${s.stars}`
    if (typeof animateClass === 'function') animateClass(document.getElementById('g25-stars'), 'pop', 400)
  }
  if (typeof (correct ? playCorrect : playWrong) === 'function') {
    correct ? playCorrect() : playWrong()
  }
  s.idx++
  setTimeout(() => g25ShowQuestion(), 850)
}

function g25Next(){
  const explainEl = document.getElementById('g25-explain')
  const lanjutEl  = document.getElementById('g25-lanjut')
  if (explainEl) explainEl.style.display = 'none'
  if (lanjutEl)  lanjutEl.style.display = 'none'
  g25ShowQuestion()
}

// Show XP on welcome screen for returning players
try{
  const xp=getXP(); if(xp>0){const tier=getLevelTier(xp);const el=document.getElementById('welcome-level-badge');if(el){el.style.display='block';el.textContent=`${tier.icon} ${tier.name} — ${xp} XP`}}
}catch(e){}
// PWA — register service worker (#161): offline support + install-as-app.
// Uses network-first for HTML (avoid stale UI) + cache-first for static assets.
// Strategy details in sw.js. Falls back gracefully if SW API unavailable.
if('serviceWorker' in navigator){
  // Self-heal: if the SW is broken/serving stale content, append ?reset=sw
  // to the URL to force-unregister all SWs and clear caches.
  if (location.search.includes('reset=sw')) {
    navigator.serviceWorker.getRegistrations().then(regs => {
      Promise.all(regs.map(r => r.unregister())).then(() => {
        if (window.caches) {
          caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
            .then(() => location.replace(location.pathname))
        } else { location.replace(location.pathname) }
      })
    })
  } else {
    // Listen for "SW updated" broadcast — auto-reload to pick up fresh assets.
    // Guards against double-reload via session flag.
    // 2026-10-10: the hub reloaded the moment SW_UPDATED arrived - on a FIRST visit too (the first activation
    // broadcasts it) and mid-use after every deploy, so a child's tap on a game tile in that second was lost
    // (live test: the Blippi tile "did nothing"). Same rule as games/sw-reload.js: a page that loaded without a
    // controller is already running fresh bytes; otherwise reload only once the app is hidden.
    const swCtlAtLoad = !!navigator.serviceWorker.controller
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (!(e.data && e.data.type === 'SW_UPDATED') || !swCtlAtLoad) return
      const flag = 'dunia-sw-reloaded-' + (e.data.version || '')
      try { if (sessionStorage.getItem(flag)) return; sessionStorage.setItem(flag, '1') } catch (_) {}
      if (document.visibilityState !== 'visible') { location.reload(); return }
      document.addEventListener('visibilitychange', function onHide () {
        if (document.visibilityState !== 'hidden') return
        document.removeEventListener('visibilitychange', onHide)
        location.reload()
      })
    })
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js', { scope: './' })
        .then(reg => {
          reg.addEventListener('updatefound', () => {
            const nw = reg.installing
            if (nw) nw.addEventListener('statechange', () => {
              if (nw.state === 'activated' && navigator.serviceWorker.controller) {
                // New SW activated — broadcast handler above will reload.
              }
            })
          })
          // Force an update check whenever the app is FOREGROUNDED. An installed
          // PWA resumed from background never re-fetches sw.js on its own, so a new
          // deploy would sit unseen ("kok tidak berubah") until a full relaunch.
          // Checking on focus/visibility pulls the new SW → auto-reload chain fires.
          const checkUpdate = () => { try { reg.update() } catch (_) {} }
          document.addEventListener('visibilitychange', () => { if (!document.hidden) checkUpdate() })
          window.addEventListener('focus', checkUpdate)
        })
        .catch(() => { /* PWA install will degrade to web app */ })
    })
  }
}

// ── AAA game result handlers: fire when returning from games/g*.html ──
window.addEventListener('pageshow', function(e) {
  // Process ALL standalone game results and save progress
  for (const gn of [6, 14, 15, 16, 19, 20, 21, 22]) {
    const raw = sessionStorage.getItem(`g${gn}Result`)
    if (raw) {
      try {
        const r = JSON.parse(raw)
        let lv = r.level || 1
        const cfgRaw = sessionStorage.getItem(`g${gn}Config`)
        if (cfgRaw) { try { const c = JSON.parse(cfgRaw); lv = c.level || lv } catch(_){} }
        sessionStorage.removeItem(`g${gn}Result`); sessionStorage.removeItem(`g${gn}Config`)
        // Hotfix 2026-04-28: removed legacy 5★→3★ capping. setLevelComplete
        // accepts the raw 1-5 value; world-map renderer also updated to scale 5.
        const stars = Math.min(5, r.stars || 0)
        setLevelComplete(gn, lv, stars)
        saveStars()
      } catch(_) {}
    }
  }
  // Standalone games that save through save-engine write progress themselves, so
  // their session result is only a hand-off marker; drop it so it cannot linger
  // into a later visit and be mistaken for a fresh result.
  for (const gn of [23, 24, 25, 27, 28, 29, 30, 31]) {
    try { sessionStorage.removeItem(`g${gn}Result`); sessionStorage.removeItem(`${gn}Result`) } catch (_) {}
  }
  // Returning from a standalone game via bfcache restores the OLD map DOM: the
  // stars a child just earned would not show until the next full load.
  if (e.persisted) { try { renderWorldMapStars() } catch (_) {} }
  // Refresh level select if returning from bfcache
  if (e.persisted && state.currentGame) {
    try { openLevelSelect(state.currentGame) } catch(_) {}
  }
})

// ================================================================
// AAA ENHANCEMENT JS — Visual upgrades
// ================================================================

// Patch g10Answer for shake animation on infobox
const _g10AnsOrig = window.g10Answer
window.g10Answer = function(val, btn) {
  _g10AnsOrig.call(this, val, btn)
  const s = g10State
  setTimeout(() => {
    const correct = val === s.currentAnswer
    if (correct) {
      const card = document.getElementById('g10-enemy-info')
      if (card) { card.classList.remove('shake-enemy'); void card.offsetWidth; card.classList.add('shake-enemy'); setTimeout(()=>card.classList.remove('shake-enemy'), 600) }
    } else {
      const card = document.getElementById('g10-player-info')
      if (card) { card.classList.remove('shake-player'); void card.offsetWidth; card.classList.add('shake-player'); setTimeout(()=>card.classList.remove('shake-player'), 600) }
    }
  }, 50)
}

// Screen transition vibration haptic (mobile)
const origShowScreen = window.showScreen
window.showScreen = function(id) {
  origShowScreen.call(this, id)
  vibrate(8)
}

// Flush pending cloud saves on page hide (mobile background tab / close)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && typeof window !== 'undefined' && window.cloudSync) {
    window.cloudSync.flush()
  }
})

// Button press haptic
document.addEventListener('touchstart', e => {
  const btn = e.target.closest('.btn, .poke-qbtn, .sci-choice, .shadow-btn, .g6-ctrl-btn, .game-tile, .level-btn, .mode-card, .animal-btn')
  if (btn) vibrate(6)
}, { passive: true })

// Particle burst on correct answer (overlay)
function spawnParticleBurst(x, y) { if(duniaReducedMotion()) return
  const colors = ['#FCD34D', '#A78BFA', '#2DD4BF', '#F43F5E', '#38BDF8']
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('div')
    const angle = (i / 12) * 360
    const dist = 60 + Math.random() * 80
    const color = colors[Math.floor(Math.random() * colors.length)]
    p.style.cssText = `
      position:fixed; left:${x}px; top:${y}px; width:${6+Math.random()*8}px; height:${6+Math.random()*8}px;
      background:${color}; border-radius:50%; pointer-events:none; z-index:9999;
      animation:particleFly 0.7s ease-out forwards;
      --dx:${Math.cos(angle*Math.PI/180)*dist}px;
      --dy:${Math.sin(angle*Math.PI/180)*dist}px;
    `
    document.body.appendChild(p)
    setTimeout(() => p.remove(), 700)
  }
}
// Add particle keyframe if not exists
if (!document.getElementById('particle-style')) {
  const st = document.createElement('style')
  st.id = 'particle-style'
  st.textContent = `@keyframes particleFly { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(var(--dx),var(--dy)) scale(0);opacity:0} }`
  document.head.appendChild(st)
}

// Hook particle burst on correct answers (poke choices)
document.addEventListener('click', e => {
  const btn = e.target.closest('.poke-qbtn')
  if (btn && btn.classList.contains('correct')) {
    spawnParticleBurst(e.clientX, e.clientY)
  }
}, true)

// Init welcome particles on page load
;(function() {
  initWelcomeParticles()
  refreshWelcomeBadges()
  // Welcome screen train station flag: show during pause (38%-55% of 9s = ~3.4s to ~4.95s)
  const flag = document.getElementById('wlc-station-flag')
  if (flag) {
    function wlcFlagLoop() {
      setTimeout(() => { if(flag) flag.style.opacity = '1' }, 3400)
      setTimeout(() => { if(flag) flag.style.opacity = '0' }, 4950)
    }
    wlcFlagLoop()
    setInterval(wlcFlagLoop, 9000)
  }
})()

// ================================================================
// WELCOME SCREEN PARTICLES
// ================================================================
function initWelcomeParticles() {
  const container = document.getElementById('wlc-particles')
  if (!container) return
  container.innerHTML = ''
  // Electric spark + purple energy particles matching Pikachu vs Gengar theme
  const sparkTypes = [
    // Gold/yellow electric sparks
    { color: 'rgba(255,220,40,0.9)',  size: [3,7],   shape: 'diamond' },
    { color: 'rgba(255,245,120,0.8)', size: [2,5],   shape: 'circle'  },
    // Purple energy particles
    { color: 'rgba(180,60,255,0.8)',  size: [4,8],   shape: 'circle'  },
    { color: 'rgba(140,40,220,0.7)',  size: [3,6],   shape: 'diamond' },
    // White electric crackle dots
    { color: 'rgba(255,255,255,0.9)', size: [2,4],   shape: 'circle'  },
    // Orange ember sparks
    { color: 'rgba(255,140,30,0.75)', size: [3,6],   shape: 'circle'  },
  ]
  const count = 26
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div')
    p.className = 'wlc-particle'
    const type = sparkTypes[Math.floor(Math.random() * sparkTypes.length)]
    const sz = type.size[0] + Math.random() * (type.size[1] - type.size[0])
    const left = Math.random() * 96
    const delay = Math.random() * 7
    const dur = 5 + Math.random() * 9
    const skew = (Math.random() - 0.5) * 30
    let shape = ''
    if (type.shape === 'diamond') {
      // diamond shape via clip-path rotation
      shape = `clip-path:polygon(50% 0%,100% 50%,50% 100%,0% 50%);border-radius:0;`
    }
    p.style.cssText = `left:${left}%;bottom:${-20 - Math.random()*30}px;width:${sz}px;height:${sz * (0.8 + Math.random()*1.4)}px;background:${type.color};border-radius:50%;${shape}animation-duration:${dur}s;animation-delay:${delay}s;transform:skewX(${skew}deg);box-shadow:0 0 ${sz*1.5}px ${type.color};`
    container.appendChild(p)
  }
}

// ── LANDING PAGE DAY / DARK MODE ──
function applyLandingMode(mode) {
  const scr = document.getElementById('screen-welcome')
  const btn = document.getElementById('landing-mode-btn')
  const desktopSrc = document.getElementById('wlc-src-desktop')
  const mobileImg  = document.getElementById('wlc-bg-img')
  if (mode === 'day') {
    scr.classList.add('day-mode')
    if (btn) btn.textContent = '☀️'
    if (desktopSrc) desktopSrc.srcset = 'assets/bg-landing-desktop-day.webp'
    if (mobileImg)  mobileImg.src  = 'assets/bg-landing-mobile-day.webp'
  } else {
    scr.classList.remove('day-mode')
    if (btn) btn.textContent = '🌙'
    if (desktopSrc) desktopSrc.srcset = 'assets/bg-landing-desktop.webp'
    if (mobileImg)  mobileImg.src  = 'assets/bg-landing-mobile.webp'
  }
  localStorage.setItem('dunia-emosi-landing-mode', mode)
}
function toggleLandingMode() {
  const current = localStorage.getItem('dunia-emosi-landing-mode') || 'dark'
  applyLandingMode(current === 'dark' ? 'day' : 'dark')
  playClick()
}
;(function() {
  const saved = localStorage.getItem('dunia-emosi-landing-mode') || 'dark'
  applyLandingMode(saved)
})()

// Update welcome HUD badges + counters
function refreshWelcomeBadges() {
  const streakBadge = document.getElementById('streak-badge')
  const streakText = document.getElementById('streak-text')
  const lvlBadge = document.getElementById('welcome-level-badge')
  const xpCountEl = document.getElementById('home-xp-count')
  const starsEl = document.getElementById('home-stars-badge')
  const streak = state.streak || 0
  const xp = state.xp || 0
  if (streakBadge) streakBadge.style.display = streak > 0 ? '' : 'none'
  if (streakText) streakText.textContent = streak
  if (lvlBadge) {
    const tier = LEVEL_TIERS.slice().reverse().find(t => xp >= t.min) || LEVEL_TIERS[0]
    lvlBadge.style.display = xp > 0 ? '' : 'none'
    lvlBadge.textContent = tier.icon + ' ' + tier.name
  }
  if (xpCountEl) xpCountEl.textContent = xp
  if (starsEl) {
    // Count total stars from all games
    let totalStars = 0
    try {
      const saved = JSON.parse(localStorage.getItem('dunia-emosi-stars') || '{}')
      Object.values(saved).forEach(v => { totalStars += (v || 0) })
    } catch(e) {}
    starsEl.textContent = '⭐ ' + totalStars
  }
}

// Pokemon battle entrance — animate sprite on each new battle
const _g10NB2 = window.g10NewBattle
window.g10NewBattle = function() {
  _g10NB2.call(this)
  setTimeout(() => {
    const es = document.getElementById('g10-espr')
    const ps = document.getElementById('g10-pspr')
    if (es) { es.style.animation='none'; void es.offsetWidth; es.style.animation='pokeEnter 0.5s cubic-bezier(0.34,1.56,0.64,1)' }
    if (ps) { ps.style.animation='none'; void ps.offsetWidth; ps.style.animation='pokeEnterPlayer 0.5s cubic-bezier(0.34,1.56,0.64,1)' }
  }, 100)
  // Apply random weather effect to battle field
  applyG10Weather()
}

// G10 battle weather: games/hub/g10-weather.js (cut v64.72)

// ================================================================
// GAME 13 — EVOLUSI MATH ADVENTURE
// ================================================================

// 40 Evolution Chains: [player base, evolved form, wild opponent]
const G13_CHAINS = [
  // === EASY (1-10): addition up to 10 ===
  {id:1, icon:'🌿', diff:'easy', maxNum:10, ops:['+'],
   player:{name:'Bulbasaur',slug:'bulbasaur',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Ivysaur',slug:'ivysaur',type:'Grass',tc:'#22C55E'},
   wild:{name:'Oddish',slug:'oddish',type:'Grass',tc:'#22C55E'}},
  {id:2, icon:'🔥', diff:'easy', maxNum:10, ops:['+'],
   player:{name:'Charmander',slug:'charmander',type:'Fire',tc:'#F97316'},
   evolved:{name:'Charmeleon',slug:'charmeleon',type:'Fire',tc:'#F97316'},
   wild:{name:'Arcanine',slug:'arcanine',type:'Fire',tc:'#F97316'}},
  {id:3, icon:'💧', diff:'easy', maxNum:10, ops:['+'],
   player:{name:'Squirtle',slug:'squirtle',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Wartortle',slug:'wartortle',type:'Water',tc:'#38BDF8'},
   wild:{name:'Psyduck',slug:'psyduck',type:'Water',tc:'#38BDF8'}},
  {id:4, icon:'🐛', diff:'easy', maxNum:10, ops:['+'],
   player:{name:'Caterpie',slug:'caterpie',type:'Bug',tc:'#84CC16'},
   evolved:{name:'Metapod',slug:'metapod',type:'Bug',tc:'#84CC16'},
   wild:{name:'Exeggcute',slug:'exeggcute',type:'Grass',tc:'#22C55E'}},
  {id:5, icon:'⚡', diff:'easy', maxNum:10, ops:['+'],
   player:{name:'Pikachu',slug:'pikachu',type:'Electric',tc:'#FBBF24'},
   evolved:{name:'Raichu',slug:'raichu',type:'Electric',tc:'#FBBF24'},
   wild:{name:'Poliwag',slug:'poliwag',type:'Water',tc:'#38BDF8'}},
  {id:6, icon:'🐱', diff:'easy', maxNum:10, ops:['+'],
   player:{name:'Meowth',slug:'meowth',type:'Normal',tc:'#A3A3A3'},
   evolved:{name:'Persian',slug:'persian',type:'Normal',tc:'#A3A3A3'},
   wild:{name:'Eevee',slug:'eevee',type:'Normal',tc:'#A3A3A3'}},
  {id:7, icon:'💪', diff:'easy', maxNum:10, ops:['+'],
   player:{name:'Machop',slug:'machop',type:'Fighting',tc:'#EF4444'},
   evolved:{name:'Machoke',slug:'machoke',type:'Fighting',tc:'#EF4444'},
   wild:{name:'Geodude',slug:'geodude',type:'Rock',tc:'#A16207'}},
  {id:8, icon:'🪨', diff:'easy', maxNum:10, ops:['+'],
   player:{name:'Geodude',slug:'geodude',type:'Rock',tc:'#A16207'},
   evolved:{name:'Graveler',slug:'graveler',type:'Rock',tc:'#A16207'},
   wild:{name:'Cubone',slug:'cubone',type:'Ground',tc:'#D97706'}},
  {id:9, icon:'👻', diff:'easy', maxNum:10, ops:['+'],
   player:{name:'Gastly',slug:'gastly',type:'Ghost',tc:'#7C3AED'},
   evolved:{name:'Haunter',slug:'haunter',type:'Ghost',tc:'#7C3AED'},
   wild:{name:'Slowpoke',slug:'slowpoke',type:'Psychic',tc:'#EC4899'}},
  {id:10, icon:'🐟', diff:'easy', maxNum:10, ops:['+'],
   player:{name:'Magikarp',slug:'magikarp',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Gyarados',slug:'gyarados',type:'Water',tc:'#38BDF8'},
   wild:{name:'Lapras',slug:'lapras',type:'Water',tc:'#38BDF8'}},

  // === MEDIUM (11-25): addition + subtraction up to 20 ===
  {id:11, icon:'🌊', diff:'medium', maxNum:20, ops:['+','-'],
   player:{name:'Eevee',slug:'eevee',type:'Normal',tc:'#A3A3A3'},
   evolved:{name:'Vaporeon',slug:'vaporeon',type:'Water',tc:'#38BDF8'},
   wild:{name:'Seel',slug:'seel',type:'Ice',tc:'#BAE6FD'}},
  {id:12, icon:'🦊', diff:'medium', maxNum:20, ops:['+','-'],
   player:{name:'Vulpix',slug:'vulpix',type:'Fire',tc:'#F97316'},
   evolved:{name:'Ninetales',slug:'ninetales',type:'Fire',tc:'#F97316'},
   wild:{name:'Flareon',slug:'flareon',type:'Fire',tc:'#F97316'}},
  {id:13, icon:'🌸', diff:'medium', maxNum:20, ops:['+','-'],
   player:{name:'Oddish',slug:'oddish',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Gloom',slug:'gloom',type:'Grass',tc:'#22C55E'},
   wild:{name:'Exeggutor',slug:'exeggutor',type:'Grass',tc:'#22C55E'}},
  {id:14, icon:'🔮', diff:'medium', maxNum:20, ops:['+','-'],
   player:{name:'Abra',slug:'abra',type:'Psychic',tc:'#EC4899'},
   evolved:{name:'Kadabra',slug:'kadabra',type:'Psychic',tc:'#EC4899'},
   wild:{name:'Slowbro',slug:'slowbro',type:'Water',tc:'#0369A1'}},
  {id:15, icon:'🦆', diff:'medium', maxNum:20, ops:['+','-'],
   player:{name:'Psyduck',slug:'psyduck',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Golduck',slug:'golduck',type:'Water',tc:'#38BDF8'},
   wild:{name:'Marill',slug:'marill',type:'Water',tc:'#38BDF8'}},
  {id:16, icon:'🐸', diff:'medium', maxNum:20, ops:['+','-'],
   player:{name:'Poliwag',slug:'poliwag',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Poliwhirl',slug:'poliwhirl',type:'Water',tc:'#38BDF8'},
   wild:{name:'Horsea',slug:'horsea',type:'Water',tc:'#38BDF8'}},
  {id:17, icon:'🐠', diff:'medium', maxNum:20, ops:['+','-'],
   player:{name:'Horsea',slug:'horsea',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Seadra',slug:'seadra',type:'Water',tc:'#38BDF8'},
   wild:{name:'Staryu',slug:'staryu',type:'Water',tc:'#38BDF8'}},
  {id:18, icon:'🦭', diff:'medium', maxNum:20, ops:['+','-'],
   player:{name:'Seel',slug:'seel',type:'Ice',tc:'#BAE6FD'},
   evolved:{name:'Dewgong',slug:'dewgong',type:'Ice',tc:'#BAE6FD'},
   wild:{name:'Cloyster',slug:'cloyster',type:'Ice',tc:'#BAE6FD'}},
  {id:19, icon:'🦴', diff:'medium', maxNum:20, ops:['+','-'],
   player:{name:'Cubone',slug:'cubone',type:'Ground',tc:'#D97706'},
   evolved:{name:'Marowak',slug:'marowak',type:'Ground',tc:'#D97706'},
   wild:{name:'Kangaskhan',slug:'kangaskhan',type:'Normal',tc:'#A3A3A3'}},
  {id:20, icon:'⭐', diff:'medium', maxNum:20, ops:['+','-'],
   player:{name:'Staryu',slug:'staryu',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Starmie',slug:'starmie',type:'Psychic',tc:'#EC4899'},
   wild:{name:'Golduck',slug:'golduck',type:'Water',tc:'#38BDF8'}},
  {id:21, icon:'🥚', diff:'medium', maxNum:20, ops:['+','-'],
   player:{name:'Exeggcute',slug:'exeggcute',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Exeggutor',slug:'exeggutor',type:'Grass',tc:'#22C55E'},
   wild:{name:'Gloom',slug:'gloom',type:'Grass',tc:'#22C55E'}},
  {id:22, icon:'☠️', diff:'medium', maxNum:20, ops:['+','-'],
   player:{name:'Koffing',slug:'koffing',type:'Poison',tc:'#A855F7'},
   evolved:{name:'Weezing',slug:'weezing',type:'Poison',tc:'#A855F7'},
   wild:{name:'Marowak',slug:'marowak',type:'Ground',tc:'#D97706'}},
  {id:23, icon:'🐉', diff:'medium', maxNum:20, ops:['+','-'],
   player:{name:'Dratini',slug:'dratini',type:'Dragon',tc:'#6366F1'},
   evolved:{name:'Dragonair',slug:'dragonair',type:'Dragon',tc:'#6366F1'},
   wild:{name:'Snorlax',slug:'snorlax',type:'Normal',tc:'#A3A3A3'}},
  {id:24, icon:'🐚', diff:'medium', maxNum:20, ops:['+','-'],
   player:{name:'Omanyte',slug:'omanyte',type:'Rock',tc:'#A16207'},
   evolved:{name:'Omastar',slug:'omastar',type:'Rock',tc:'#A16207'},
   wild:{name:'Kabuto',slug:'kabuto',type:'Rock',tc:'#A16207'}},
  {id:25, icon:'🦀', diff:'medium', maxNum:20, ops:['+','-'],
   player:{name:'Kabuto',slug:'kabuto',type:'Rock',tc:'#A16207'},
   evolved:{name:'Kabutops',slug:'kabutops',type:'Rock',tc:'#A16207'},
   wild:{name:'Omanyte',slug:'omanyte',type:'Rock',tc:'#A16207'}},

  // === HARD (26-40): mixed ops up to 30, some start as stage-1 ===
  // Player starts as first evolution → evolves to final form
  {id:56, icon:'🔥', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Charmeleon',slug:'charmeleon',type:'Fire',tc:'#F97316'},
   evolved:{name:'Charizard',slug:'charizard',type:'Fire',tc:'#F97316'},
   wild:{name:'Arcanine',slug:'arcanine',type:'Fire',tc:'#F97316'}},
  {id:51, icon:'🌊', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Wartortle',slug:'wartortle',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Blastoise',slug:'blastoise',type:'Water',tc:'#38BDF8'},
   wild:{name:'Lapras',slug:'lapras',type:'Water',tc:'#38BDF8'}},
  {id:52, icon:'🌿', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Ivysaur',slug:'ivysaur',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Venusaur',slug:'venusaur',type:'Grass',tc:'#22C55E'},
   wild:{name:'Exeggutor',slug:'exeggutor',type:'Grass',tc:'#22C55E'}},
  {id:53, icon:'👻', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Haunter',slug:'haunter',type:'Ghost',tc:'#7C3AED'},
   evolved:{name:'Gengar',slug:'gengar',type:'Ghost',tc:'#7C3AED'},
   wild:{name:'Alakazam',slug:'alakazam',type:'Psychic',tc:'#EC4899'}},
  {id:54, icon:'🐉', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Dragonair',slug:'dragonair',type:'Dragon',tc:'#6366F1'},
   evolved:{name:'Dragonite',slug:'dragonite',type:'Dragon',tc:'#6366F1'},
   wild:{name:'Gyarados',slug:'gyarados',type:'Water',tc:'#38BDF8'}},
  {id:55, icon:'🔮', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Kadabra',slug:'kadabra',type:'Psychic',tc:'#EC4899'},
   evolved:{name:'Alakazam',slug:'alakazam',type:'Psychic',tc:'#EC4899'},
   wild:{name:'Starmie',slug:'starmie',type:'Psychic',tc:'#EC4899'}},

  // Hard (original #26 moved)
  {id:26, icon:'🔥', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Cyndaquil',slug:'cyndaquil',type:'Fire',tc:'#F97316'},
   evolved:{name:'Quilava',slug:'quilava',type:'Fire',tc:'#F97316'},
   wild:{name:'Arcanine',slug:'arcanine',type:'Fire',tc:'#F97316'}},
  {id:27, icon:'🐊', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Totodile',slug:'totodile',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Croconaw',slug:'croconaw',type:'Water',tc:'#38BDF8'},
   wild:{name:'Lapras',slug:'lapras',type:'Water',tc:'#38BDF8'}},
  {id:28, icon:'🌱', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Chikorita',slug:'chikorita',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Bayleef',slug:'bayleef',type:'Grass',tc:'#22C55E'},
   wild:{name:'Venusaur',slug:'venusaur',type:'Grass',tc:'#22C55E'}},
  {id:29, icon:'🥚', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Togepi',slug:'togepi',type:'Fairy',tc:'#FB7185'},
   evolved:{name:'Togetic',slug:'togetic',type:'Fairy',tc:'#FB7185'},
   wild:{name:'Clefable',slug:'clefable',type:'Fairy',tc:'#FB7185'}},
  {id:30, icon:'💧', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Marill',slug:'marill',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Azumarill',slug:'azumarill',type:'Water',tc:'#38BDF8'},
   wild:{name:'Vaporeon',slug:'vaporeon',type:'Water',tc:'#38BDF8'}},
  {id:31, icon:'🐻', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Teddiursa',slug:'teddiursa',type:'Normal',tc:'#A3A3A3'},
   evolved:{name:'Ursaring',slug:'ursaring',type:'Normal',tc:'#A3A3A3'},
   wild:{name:'Kangaskhan',slug:'kangaskhan',type:'Normal',tc:'#A3A3A3'}},
  {id:32, icon:'🐶', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Snubbull',slug:'snubbull',type:'Fairy',tc:'#FB7185'},
   evolved:{name:'Granbull',slug:'granbull',type:'Fairy',tc:'#FB7185'},
   wild:{name:'Persian',slug:'persian',type:'Normal',tc:'#A3A3A3'}},
  {id:33, icon:'🦖', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Larvitar',slug:'larvitar',type:'Rock',tc:'#A16207'},
   evolved:{name:'Pupitar',slug:'pupitar',type:'Rock',tc:'#A16207'},
   wild:{name:'Golem',slug:'golem',type:'Rock',tc:'#A16207'}},
  {id:34, icon:'🌋', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Slugma',slug:'slugma',type:'Fire',tc:'#F97316'},
   evolved:{name:'Magcargo',slug:'magcargo',type:'Fire',tc:'#F97316'},
   wild:{name:'Ninetales',slug:'ninetales',type:'Fire',tc:'#F97316'}},
  {id:35, icon:'🐗', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Swinub',slug:'swinub',type:'Ice',tc:'#BAE6FD'},
   evolved:{name:'Piloswine',slug:'piloswine',type:'Ice',tc:'#BAE6FD'},
   wild:{name:'Dewgong',slug:'dewgong',type:'Ice',tc:'#BAE6FD'}},
  {id:36, icon:'💧', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Mudkip',slug:'mudkip',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Marshtomp',slug:'marshtomp',type:'Water',tc:'#38BDF8'},
   wild:{name:'Psyduck',slug:'psyduck',type:'Water',tc:'#38BDF8'}},
  {id:37, icon:'🍃', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Treecko',slug:'treecko',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Grovyle',slug:'grovyle',type:'Grass',tc:'#22C55E'},
   wild:{name:'Bulbasaur',slug:'bulbasaur',type:'Grass',tc:'#22C55E'}},
  {id:38, icon:'🐓', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Torchic',slug:'torchic',type:'Fire',tc:'#F97316'},
   evolved:{name:'Combusken',slug:'combusken',type:'Fire',tc:'#F97316'},
   wild:{name:'Vulpix',slug:'vulpix',type:'Fire',tc:'#F97316'}},
  {id:39, icon:'🌀', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Ralts',slug:'ralts',type:'Psychic',tc:'#EC4899'},
   evolved:{name:'Kirlia',slug:'kirlia',type:'Psychic',tc:'#EC4899'},
   wild:{name:'Starmie',slug:'starmie',type:'Psychic',tc:'#EC4899'}},
  {id:40, icon:'⚙️', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Beldum',slug:'beldum',type:'Steel',tc:'#94A3B8'},
   evolved:{name:'Metang',slug:'metang',type:'Steel',tc:'#94A3B8'},
   wild:{name:'Gengar',slug:'gengar',type:'Ghost',tc:'#7C3AED'}},

  // === EPIC (level 17-20): 2-stage evolution! Base → Stage1 → Final ===
  {id:61, icon:'🔥', diff:'epic', maxNum:20, ops:['+','-'],
   player:{name:'Charmander',slug:'charmander',type:'Fire',tc:'#F97316'},
   evolved:{name:'Charmeleon',slug:'charmeleon',type:'Fire',tc:'#F97316'},
   evolved2:{name:'Charizard',slug:'charizard',type:'Fire',tc:'#F97316'},
   wild:{name:'Arcanine',slug:'arcanine',type:'Fire',tc:'#F97316'}},
  {id:62, icon:'💧', diff:'epic', maxNum:20, ops:['+','-'],
   player:{name:'Squirtle',slug:'squirtle',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Wartortle',slug:'wartortle',type:'Water',tc:'#38BDF8'},
   evolved2:{name:'Blastoise',slug:'blastoise',type:'Water',tc:'#38BDF8'},
   wild:{name:'Lapras',slug:'lapras',type:'Water',tc:'#38BDF8'}},
  {id:63, icon:'🌿', diff:'epic', maxNum:20, ops:['+','-'],
   player:{name:'Bulbasaur',slug:'bulbasaur',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Ivysaur',slug:'ivysaur',type:'Grass',tc:'#22C55E'},
   evolved2:{name:'Venusaur',slug:'venusaur',type:'Grass',tc:'#22C55E'},
   wild:{name:'Exeggutor',slug:'exeggutor',type:'Grass',tc:'#22C55E'}},
  {id:64, icon:'👻', diff:'epic', maxNum:20, ops:['+','-'],
   player:{name:'Gastly',slug:'gastly',type:'Ghost',tc:'#7C3AED'},
   evolved:{name:'Haunter',slug:'haunter',type:'Ghost',tc:'#7C3AED'},
   evolved2:{name:'Gengar',slug:'gengar',type:'Ghost',tc:'#7C3AED'},
   wild:{name:'Alakazam',slug:'alakazam',type:'Psychic',tc:'#EC4899'}},
  {id:65, icon:'🐉', diff:'epic', maxNum:20, ops:['+','-'],
   player:{name:'Dratini',slug:'dratini',type:'Dragon',tc:'#6366F1'},
   evolved:{name:'Dragonair',slug:'dragonair',type:'Dragon',tc:'#6366F1'},
   evolved2:{name:'Dragonite',slug:'dragonite',type:'Dragon',tc:'#F97316'},
   wild:{name:'Gyarados',slug:'gyarados',type:'Water',tc:'#38BDF8'}},
  {id:66, icon:'⚙️', diff:'epic', maxNum:20, ops:['+','-'],
   player:{name:'Beldum',slug:'beldum',type:'Steel',tc:'#94A3B8'},
   evolved:{name:'Metang',slug:'metang',type:'Steel',tc:'#94A3B8'},
   evolved2:{name:'Metagross',slug:'metagross',type:'Steel',tc:'#94A3B8'},
   wild:{name:'Starmie',slug:'starmie',type:'Psychic',tc:'#EC4899'}},
  {id:67, icon:'🦖', diff:'epic', maxNum:20, ops:['+','-'],
   player:{name:'Larvitar',slug:'larvitar',type:'Rock',tc:'#A16207'},
   evolved:{name:'Pupitar',slug:'pupitar',type:'Rock',tc:'#A16207'},
   evolved2:{name:'Tyranitar',slug:'tyranitar',type:'Dark',tc:'#4B5563'},
   wild:{name:'Golem',slug:'golem',type:'Rock',tc:'#A16207'}},
  {id:68, icon:'🌀', diff:'epic', maxNum:20, ops:['+','-'],
   player:{name:'Ralts',slug:'ralts',type:'Psychic',tc:'#EC4899'},
   evolved:{name:'Kirlia',slug:'kirlia',type:'Psychic',tc:'#EC4899'},
   evolved2:{name:'Gardevoir',slug:'gardevoir',type:'Psychic',tc:'#EC4899'},
   wild:{name:'Kadabra',slug:'kadabra',type:'Psychic',tc:'#EC4899'}},
  // More epic chains (2-stage, multiplication range)
  {id:69, icon:'🔥', diff:'epic', maxNum:20, ops:['+','-','*'],
   player:{name:'Torchic',slug:'torchic',type:'Fire',tc:'#F97316'},
   evolved:{name:'Combusken',slug:'combusken',type:'Fire',tc:'#F97316'},
   evolved2:{name:'Blaziken',slug:'blaziken',type:'Fighting',tc:'#EF4444'},
   wild:{name:'Charizard',slug:'charizard',type:'Fire',tc:'#F97316'}},
  {id:70, icon:'💧', diff:'epic', maxNum:20, ops:['+','-','*'],
   player:{name:'Mudkip',slug:'mudkip',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Marshtomp',slug:'marshtomp',type:'Water',tc:'#38BDF8'},
   evolved2:{name:'Swampert',slug:'swampert',type:'Water',tc:'#38BDF8'},
   wild:{name:'Blastoise',slug:'blastoise',type:'Water',tc:'#38BDF8'}},
  {id:71, icon:'🌿', diff:'epic', maxNum:20, ops:['+','-','*'],
   player:{name:'Treecko',slug:'treecko',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Grovyle',slug:'grovyle',type:'Grass',tc:'#22C55E'},
   evolved2:{name:'Sceptile',slug:'sceptile',type:'Grass',tc:'#22C55E'},
   wild:{name:'Venusaur',slug:'venusaur',type:'Grass',tc:'#22C55E'}},

  // === LEGENDARY (level 21-30): multiplication + division, all 2-stage ===
  {id:80, icon:'🌋', diff:'legendary', maxNum:20, ops:['+','-','*'],
   player:{name:'Cyndaquil',slug:'cyndaquil',type:'Fire',tc:'#F97316'},
   evolved:{name:'Quilava',slug:'quilava',type:'Fire',tc:'#F97316'},
   evolved2:{name:'Typhlosion',slug:'typhlosion',type:'Fire',tc:'#F97316'},
   wild:{name:'Arcanine',slug:'arcanine',type:'Fire',tc:'#F97316'}},
  {id:81, icon:'🌊', diff:'legendary', maxNum:20, ops:['+','-','*'],
   player:{name:'Totodile',slug:'totodile',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Croconaw',slug:'croconaw',type:'Water',tc:'#38BDF8'},
   evolved2:{name:'Feraligatr',slug:'feraligatr',type:'Water',tc:'#38BDF8'},
   wild:{name:'Gyarados',slug:'gyarados',type:'Water',tc:'#38BDF8'}},
  {id:82, icon:'🌱', diff:'legendary', maxNum:20, ops:['+','-','*'],
   player:{name:'Chikorita',slug:'chikorita',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Bayleef',slug:'bayleef',type:'Grass',tc:'#22C55E'},
   evolved2:{name:'Meganium',slug:'meganium',type:'Grass',tc:'#22C55E'},
   wild:{name:'Exeggutor',slug:'exeggutor',type:'Grass',tc:'#22C55E'}},
  {id:83, icon:'🐊', diff:'legendary', maxNum:20, ops:['+','-','*'],
   player:{name:'Omanyte',slug:'omanyte',type:'Rock',tc:'#A16207'},
   evolved:{name:'Omastar',slug:'omastar',type:'Rock',tc:'#A16207'},
   wild:{name:'Kabutops',slug:'kabutops',type:'Rock',tc:'#A16207'}},
  {id:84, icon:'⭐', diff:'legendary', maxNum:20, ops:['+','-','*'],
   player:{name:'Eevee',slug:'eevee',type:'Normal',tc:'#A3A3A3'},
   evolved:{name:'Jolteon',slug:'jolteon',type:'Electric',tc:'#FBBF24'},
   wild:{name:'Raichu',slug:'raichu',type:'Electric',tc:'#FBBF24'}},
  {id:85, icon:'🌊', diff:'legendary', maxNum:20, ops:['+','-','*'],
   player:{name:'Machop',slug:'machop',type:'Fighting',tc:'#EF4444'},
   evolved:{name:'Machoke',slug:'machoke',type:'Fighting',tc:'#EF4444'},
   evolved2:{name:'Machamp',slug:'machamp',type:'Fighting',tc:'#EF4444'},
   wild:{name:'Golem',slug:'golem',type:'Rock',tc:'#A16207'}},
  {id:86, icon:'💎', diff:'legendary', maxNum:20, ops:['+','-','*'],
   player:{name:'Abra',slug:'abra',type:'Psychic',tc:'#EC4899'},
   evolved:{name:'Kadabra',slug:'kadabra',type:'Psychic',tc:'#EC4899'},
   evolved2:{name:'Alakazam',slug:'alakazam',type:'Psychic',tc:'#EC4899'},
   wild:{name:'Gengar',slug:'gengar',type:'Ghost',tc:'#7C3AED'}},
  {id:87, icon:'🌟', diff:'legendary', maxNum:20, ops:['+','-','*'],
   player:{name:'Pichu',slug:'pichu',type:'Electric',tc:'#FBBF24'},
   evolved:{name:'Pikachu',slug:'pikachu',type:'Electric',tc:'#FBBF24'},
   evolved2:{name:'Raichu',slug:'raichu',type:'Electric',tc:'#FBBF24'},
   wild:{name:'Jolteon',slug:'jolteon',type:'Electric',tc:'#FBBF24'}},
  {id:88, icon:'🏆', diff:'legendary', maxNum:20, ops:['+','-','*'],
   player:{name:'Larvitar',slug:'larvitar',type:'Rock',tc:'#A16207'},
   evolved:{name:'Pupitar',slug:'pupitar',type:'Rock',tc:'#A16207'},
   evolved2:{name:'Tyranitar',slug:'tyranitar',type:'Dark',tc:'#4B5563'},
   wild:{name:'Dragonite',slug:'dragonite',type:'Dragon',tc:'#F97316'}},

  // === ADDITIONAL EASY (IDs 100-109) ===
  {id:100,icon:'🐦',diff:'easy',maxNum:10,ops:['+'],
   player:{name:'Pidgey',slug:'pidgey',type:'Normal',tc:'#A3A3A3'},
   evolved:{name:'Pidgeotto',slug:'pidgeotto',type:'Normal',tc:'#A3A3A3'},
   wild:{name:'Spearow',slug:'spearow',type:'Normal',tc:'#A3A3A3'}},
  {id:101,icon:'🐭',diff:'easy',maxNum:10,ops:['+'],
   player:{name:'Rattata',slug:'rattata',type:'Normal',tc:'#A3A3A3'},
   evolved:{name:'Raticate',slug:'raticate',type:'Normal',tc:'#A3A3A3'},
   wild:{name:'Eevee',slug:'eevee',type:'Normal',tc:'#A3A3A3'}},
  {id:102,icon:'🔥',diff:'easy',maxNum:10,ops:['+'],
   player:{name:'Growlithe',slug:'growlithe',type:'Fire',tc:'#F97316'},
   evolved:{name:'Arcanine',slug:'arcanine',type:'Fire',tc:'#F97316'},
   wild:{name:'Vulpix',slug:'vulpix',type:'Fire',tc:'#F97316'}},
  {id:103,icon:'🌿',diff:'easy',maxNum:10,ops:['+'],
   player:{name:'Bellsprout',slug:'bellsprout',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Weepinbell',slug:'weepinbell',type:'Grass',tc:'#22C55E'},
   wild:{name:'Paras',slug:'paras',type:'Bug',tc:'#84CC16'}},
  {id:104,icon:'⭐',diff:'easy',maxNum:10,ops:['+'],
   player:{name:'Clefairy',slug:'clefairy',type:'Fairy',tc:'#FB7185'},
   evolved:{name:'Clefable',slug:'clefable',type:'Fairy',tc:'#FB7185'},
   wild:{name:'Jigglypuff',slug:'jigglypuff',type:'Normal',tc:'#A3A3A3'}},
  {id:105,icon:'🎵',diff:'easy',maxNum:10,ops:['+'],
   player:{name:'Jigglypuff',slug:'jigglypuff',type:'Normal',tc:'#A3A3A3'},
   evolved:{name:'Wigglytuff',slug:'wigglytuff',type:'Normal',tc:'#A3A3A3'},
   wild:{name:'Clefairy',slug:'clefairy',type:'Fairy',tc:'#FB7185'}},
  {id:106,icon:'🐍',diff:'easy',maxNum:10,ops:['+'],
   player:{name:'Ekans',slug:'ekans',type:'Poison',tc:'#A855F7'},
   evolved:{name:'Arbok',slug:'arbok',type:'Poison',tc:'#A855F7'},
   wild:{name:'Koffing',slug:'koffing',type:'Poison',tc:'#A855F7'}},
  {id:107,icon:'🦋',diff:'easy',maxNum:10,ops:['+'],
   player:{name:'Venonat',slug:'venonat',type:'Bug',tc:'#84CC16'},
   evolved:{name:'Venomoth',slug:'venomoth',type:'Bug',tc:'#84CC16'},
   wild:{name:'Butterfree',slug:'butterfree',type:'Bug',tc:'#84CC16'}},
  {id:108,icon:'🐟',diff:'easy',maxNum:10,ops:['+'],
   player:{name:'Goldeen',slug:'goldeen',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Seaking',slug:'seaking',type:'Water',tc:'#38BDF8'},
   wild:{name:'Shellder',slug:'shellder',type:'Water',tc:'#38BDF8'}},
  {id:109,icon:'🏜️',diff:'easy',maxNum:10,ops:['+'],
   player:{name:'Sandshrew',slug:'sandshrew',type:'Ground',tc:'#D97706'},
   evolved:{name:'Sandslash',slug:'sandslash',type:'Ground',tc:'#D97706'},
   wild:{name:'Diglett',slug:'diglett',type:'Ground',tc:'#D97706'}},

  // === ADDITIONAL MEDIUM (IDs 110-117) ===
  {id:110,icon:'🐌',diff:'medium',maxNum:20,ops:['+','-'],
   player:{name:'Slowpoke',slug:'slowpoke',type:'Psychic',tc:'#EC4899'},
   evolved:{name:'Slowbro',slug:'slowbro',type:'Water',tc:'#0369A1'},
   wild:{name:'Golduck',slug:'golduck',type:'Water',tc:'#38BDF8'}},
  {id:111,icon:'🐦',diff:'medium',maxNum:20,ops:['+','-'],
   player:{name:'Doduo',slug:'doduo',type:'Normal',tc:'#A3A3A3'},
   evolved:{name:'Dodrio',slug:'dodrio',type:'Normal',tc:'#A3A3A3'},
   wild:{name:'Fearow',slug:'fearow',type:'Normal',tc:'#A3A3A3'}},
  {id:112,icon:'💥',diff:'medium',maxNum:20,ops:['+','-'],
   player:{name:'Voltorb',slug:'voltorb',type:'Electric',tc:'#FBBF24'},
   evolved:{name:'Electrode',slug:'electrode',type:'Electric',tc:'#FBBF24'},
   wild:{name:'Magneton',slug:'magneton',type:'Electric',tc:'#FBBF24'}},
  {id:113,icon:'👻',diff:'medium',maxNum:20,ops:['+','-'],
   player:{name:'Misdreavus',slug:'misdreavus',type:'Ghost',tc:'#7C3AED'},
   evolved:{name:'Mismagius',slug:'mismagius',type:'Ghost',tc:'#7C3AED'},
   wild:{name:'Haunter',slug:'haunter',type:'Ghost',tc:'#7C3AED'}},
  {id:114,icon:'🦶',diff:'medium',maxNum:20,ops:['+','-'],
   player:{name:'Mankey',slug:'mankey',type:'Fighting',tc:'#EF4444'},
   evolved:{name:'Primeape',slug:'primeape',type:'Fighting',tc:'#EF4444'},
   wild:{name:'Machoke',slug:'machoke',type:'Fighting',tc:'#EF4444'}},
  {id:115,icon:'🧊',diff:'medium',maxNum:20,ops:['+','-'],
   player:{name:'Sneasel',slug:'sneasel',type:'Ice',tc:'#BAE6FD'},
   evolved:{name:'Weavile',slug:'weavile',type:'Ice',tc:'#BAE6FD'},
   wild:{name:'Dewgong',slug:'dewgong',type:'Ice',tc:'#BAE6FD'}},
  {id:116,icon:'🌿',diff:'medium',maxNum:20,ops:['+','-'],
   player:{name:'Hoppip',slug:'hoppip',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Skiploom',slug:'skiploom',type:'Grass',tc:'#22C55E'},
   wild:{name:'Oddish',slug:'oddish',type:'Grass',tc:'#22C55E'}},
  {id:117,icon:'🦌',diff:'medium',maxNum:20,ops:['+','-'],
   player:{name:'Stantler',slug:'stantler',type:'Normal',tc:'#A3A3A3'},
   evolved:{name:'Wyrdeer',slug:'wyrdeer',type:'Normal',tc:'#A3A3A3'},
   wild:{name:'Tauros',slug:'tauros',type:'Normal',tc:'#A3A3A3'}},

  // === ADDITIONAL HARD (IDs 120-127) ===
  {id:120,icon:'⚡',diff:'hard',maxNum:20,ops:['+','-'],
   player:{name:'Electrike',slug:'electrike',type:'Electric',tc:'#FBBF24'},
   evolved:{name:'Manectric',slug:'manectric',type:'Electric',tc:'#FBBF24'},
   wild:{name:'Raichu',slug:'raichu',type:'Electric',tc:'#FBBF24'}},
  {id:121,icon:'🐲',diff:'hard',maxNum:20,ops:['+','-'],
   player:{name:'Swablu',slug:'swablu',type:'Normal',tc:'#BAE6FD'},
   evolved:{name:'Altaria',slug:'altaria',type:'Dragon',tc:'#6366F1'},
   wild:{name:'Dragonair',slug:'dragonair',type:'Dragon',tc:'#6366F1'}},
  {id:122,icon:'🍄',diff:'hard',maxNum:20,ops:['+','-'],
   player:{name:'Shroomish',slug:'shroomish',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Breloom',slug:'breloom',type:'Fighting',tc:'#EF4444'},
   wild:{name:'Parasect',slug:'parasect',type:'Bug',tc:'#84CC16'}},
  {id:123,icon:'🌊',diff:'hard',maxNum:20,ops:['+','-'],
   player:{name:'Wailmer',slug:'wailmer',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Wailord',slug:'wailord',type:'Water',tc:'#38BDF8'},
   wild:{name:'Lapras',slug:'lapras',type:'Water',tc:'#38BDF8'}},
  {id:124,icon:'🥊',diff:'hard',maxNum:20,ops:['+','-'],
   player:{name:'Meditite',slug:'meditite',type:'Fighting',tc:'#EF4444'},
   evolved:{name:'Medicham',slug:'medicham',type:'Fighting',tc:'#EF4444'},
   wild:{name:'Hitmonchan',slug:'hitmonchan',type:'Fighting',tc:'#EF4444'}},
  {id:125,icon:'🐱',diff:'hard',maxNum:20,ops:['+','-'],
   player:{name:'Skitty',slug:'skitty',type:'Normal',tc:'#A3A3A3'},
   evolved:{name:'Delcatty',slug:'delcatty',type:'Normal',tc:'#A3A3A3'},
   wild:{name:'Persian',slug:'persian',type:'Normal',tc:'#A3A3A3'}},
  {id:126,icon:'🧊',diff:'hard',maxNum:20,ops:['+','-'],
   player:{name:'Snorunt',slug:'snorunt',type:'Ice',tc:'#BAE6FD'},
   evolved:{name:'Glalie',slug:'glalie',type:'Ice',tc:'#BAE6FD'},
   wild:{name:'Piloswine',slug:'piloswine',type:'Ice',tc:'#BAE6FD'}},
  {id:127,icon:'🌿',diff:'hard',maxNum:20,ops:['+','-'],
   player:{name:'Paras',slug:'paras',type:'Bug',tc:'#84CC16'},
   evolved:{name:'Parasect',slug:'parasect',type:'Bug',tc:'#84CC16'},
   wild:{name:'Venomoth',slug:'venomoth',type:'Bug',tc:'#84CC16'}},

  // === ADDITIONAL EPIC (IDs 130-137): 2-stage evolutions ===
  {id:130,icon:'🐲',diff:'epic',maxNum:20,ops:['+','-'],
   player:{name:'Bagon',slug:'bagon',type:'Dragon',tc:'#6366F1'},
   evolved:{name:'Shelgon',slug:'shelgon',type:'Dragon',tc:'#6366F1'},
   evolved2:{name:'Salamence',slug:'salamence',type:'Dragon',tc:'#6366F1'},
   wild:{name:'Dragonite',slug:'dragonite',type:'Dragon',tc:'#F97316'}},
  {id:131,icon:'🪨',diff:'epic',maxNum:20,ops:['+','-'],
   player:{name:'Roggenrola',slug:'roggenrola',type:'Rock',tc:'#A16207'},
   evolved:{name:'Boldore',slug:'boldore',type:'Rock',tc:'#A16207'},
   evolved2:{name:'Gigalith',slug:'gigalith',type:'Rock',tc:'#A16207'},
   wild:{name:'Golem',slug:'golem',type:'Rock',tc:'#A16207'}},
  {id:132,icon:'🕯️',diff:'epic',maxNum:20,ops:['+','-'],
   player:{name:'Litwick',slug:'litwick',type:'Ghost',tc:'#7C3AED'},
   evolved:{name:'Lampent',slug:'lampent',type:'Ghost',tc:'#7C3AED'},
   evolved2:{name:'Chandelure',slug:'chandelure',type:'Ghost',tc:'#7C3AED'},
   wild:{name:'Gengar',slug:'gengar',type:'Ghost',tc:'#7C3AED'}},
  {id:133,icon:'🐉',diff:'epic',maxNum:20,ops:['+','-','*'],
   player:{name:'Gible',slug:'gible',type:'Dragon',tc:'#6366F1'},
   evolved:{name:'Gabite',slug:'gabite',type:'Dragon',tc:'#6366F1'},
   evolved2:{name:'Garchomp',slug:'garchomp',type:'Dragon',tc:'#6366F1'},
   wild:{name:'Dragonite',slug:'dragonite',type:'Dragon',tc:'#F97316'}},
  {id:134,icon:'💪',diff:'epic',maxNum:20,ops:['+','-'],
   player:{name:'Timburr',slug:'timburr',type:'Fighting',tc:'#EF4444'},
   evolved:{name:'Gurdurr',slug:'gurdurr',type:'Fighting',tc:'#EF4444'},
   evolved2:{name:'Conkeldurr',slug:'conkeldurr',type:'Fighting',tc:'#EF4444'},
   wild:{name:'Machamp',slug:'machamp',type:'Fighting',tc:'#EF4444'}},
  {id:135,icon:'⚡',diff:'epic',maxNum:20,ops:['+','-','*'],
   player:{name:'Elekid',slug:'elekid',type:'Electric',tc:'#FBBF24'},
   evolved:{name:'Electabuzz',slug:'electabuzz',type:'Electric',tc:'#FBBF24'},
   evolved2:{name:'Electivire',slug:'electivire',type:'Electric',tc:'#FBBF24'},
   wild:{name:'Raichu',slug:'raichu',type:'Electric',tc:'#FBBF24'}},
  {id:136,icon:'🔥',diff:'epic',maxNum:20,ops:['+','-','*'],
   player:{name:'Magby',slug:'magby',type:'Fire',tc:'#F97316'},
   evolved:{name:'Magmar',slug:'magmar',type:'Fire',tc:'#F97316'},
   evolved2:{name:'Magmortar',slug:'magmortar',type:'Fire',tc:'#F97316'},
   wild:{name:'Arcanine',slug:'arcanine',type:'Fire',tc:'#F97316'}},
  {id:137,icon:'🐊',diff:'epic',maxNum:20,ops:['+','-','*'],
   player:{name:'Sandile',slug:'sandile',type:'Ground',tc:'#D97706'},
   evolved:{name:'Krokorok',slug:'krokorok',type:'Ground',tc:'#D97706'},
   evolved2:{name:'Krookodile',slug:'krookodile',type:'Ground',tc:'#D97706'},
   wild:{name:'Tyranitar',slug:'tyranitar',type:'Dark',tc:'#4B5563'}},

  // === ADDITIONAL LEGENDARY (IDs 140-145) ===
  {id:140,icon:'🦊',diff:'legendary',maxNum:20,ops:['+','-','*'],
   player:{name:'Riolu',slug:'riolu',type:'Fighting',tc:'#EF4444'},
   evolved:{name:'Lucario',slug:'lucario',type:'Fighting',tc:'#1E40AF'},
   wild:{name:'Machamp',slug:'machamp',type:'Fighting',tc:'#EF4444'}},
  {id:141,icon:'🐉',diff:'legendary',maxNum:20,ops:['+','-','*'],
   player:{name:'Deino',slug:'deino',type:'Dragon',tc:'#6366F1'},
   evolved:{name:'Zweilous',slug:'zweilous',type:'Dragon',tc:'#6366F1'},
   evolved2:{name:'Hydreigon',slug:'hydreigon',type:'Dragon',tc:'#6366F1'},
   wild:{name:'Dragonite',slug:'dragonite',type:'Dragon',tc:'#F97316'}},
  {id:142,icon:'🏆',diff:'legendary',maxNum:20,ops:['+','-','*'],
   player:{name:'Trapinch',slug:'trapinch',type:'Ground',tc:'#D97706'},
   evolved:{name:'Vibrava',slug:'vibrava',type:'Dragon',tc:'#6366F1'},
   evolved2:{name:'Flygon',slug:'flygon',type:'Dragon',tc:'#6366F1'},
   wild:{name:'Garchomp',slug:'garchomp',type:'Dragon',tc:'#6366F1'}},
  {id:143,icon:'🌟',diff:'legendary',maxNum:20,ops:['+','-','*'],
   player:{name:'Axew',slug:'axew',type:'Dragon',tc:'#6366F1'},
   evolved:{name:'Fraxure',slug:'fraxure',type:'Dragon',tc:'#6366F1'},
   evolved2:{name:'Haxorus',slug:'haxorus',type:'Dragon',tc:'#6366F1'},
   wild:{name:'Salamence',slug:'salamence',type:'Dragon',tc:'#6366F1'}},
  {id:144,icon:'💧',diff:'legendary',maxNum:20,ops:['+','-','*'],
   player:{name:'Feebas',slug:'feebas',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Milotic',slug:'milotic',type:'Water',tc:'#38BDF8'},
   wild:{name:'Gyarados',slug:'gyarados',type:'Water',tc:'#38BDF8'}},
  {id:145,icon:'🐌',diff:'legendary',maxNum:20,ops:['+','-','*'],
   player:{name:'Goomy',slug:'goomy',type:'Dragon',tc:'#6366F1'},
   evolved:{name:'Sliggoo',slug:'sliggoo',type:'Dragon',tc:'#6366F1'},
   evolved2:{name:'Goodra',slug:'goodra',type:'Dragon',tc:'#6366F1'},
   wild:{name:'Dragonite',slug:'dragonite',type:'Dragon',tc:'#F97316'}},

  // === 2STAGE (levels 18-32): 2-stage evolution, numbers 15-20, addition+subtraction ===
  {id:41,icon:'💪',diff:'2stage',maxNum:20,ops:['+','-'],
   player:{name:'Machop',slug:'machop',type:'Fighting',tc:'#EF4444'},
   evolved:{name:'Machoke',slug:'machoke',type:'Fighting',tc:'#EF4444'},
   evolved2:{name:'Machamp',slug:'machamp',type:'Fighting',tc:'#EF4444'},
   wild:{name:'Primeape',slug:'primeape',type:'Fighting',tc:'#EF4444'}},
  {id:42,icon:'🔮',diff:'2stage',maxNum:20,ops:['+','-'],
   player:{name:'Abra',slug:'abra',type:'Psychic',tc:'#EC4899'},
   evolved:{name:'Kadabra',slug:'kadabra',type:'Psychic',tc:'#EC4899'},
   evolved2:{name:'Alakazam',slug:'alakazam',type:'Psychic',tc:'#EC4899'},
   wild:{name:'Slowbro',slug:'slowbro',type:'Water',tc:'#0369A1'}},
  {id:43,icon:'🪨',diff:'2stage',maxNum:20,ops:['+','-'],
   player:{name:'Geodude',slug:'geodude',type:'Rock',tc:'#A16207'},
   evolved:{name:'Graveler',slug:'graveler',type:'Rock',tc:'#A16207'},
   evolved2:{name:'Golem',slug:'golem',type:'Rock',tc:'#A16207'},
   wild:{name:'Onix',slug:'onix',type:'Rock',tc:'#A16207'}},
  {id:44,icon:'🌿',diff:'2stage',maxNum:20,ops:['+','-'],
   player:{name:'Bellsprout',slug:'bellsprout',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Weepinbell',slug:'weepinbell',type:'Grass',tc:'#22C55E'},
   evolved2:{name:'Victreebel',slug:'victreebel',type:'Grass',tc:'#22C55E'},
   wild:{name:'Exeggutor',slug:'exeggutor',type:'Grass',tc:'#22C55E'}},
  {id:45,icon:'💜',diff:'2stage',maxNum:20,ops:['+','-'],
   player:{name:'Nidoran♀',slug:'nidoran-f',type:'Poison',tc:'#A855F7'},
   evolved:{name:'Nidorina',slug:'nidorina',type:'Poison',tc:'#A855F7'},
   evolved2:{name:'Nidoqueen',slug:'nidoqueen',type:'Poison',tc:'#A855F7'},
   wild:{name:'Clefairy',slug:'clefairy',type:'Fairy',tc:'#FB7185'}},
  {id:46,icon:'💙',diff:'2stage',maxNum:20,ops:['+','-'],
   player:{name:'Nidoran♂',slug:'nidoran-m',type:'Poison',tc:'#A855F7'},
   evolved:{name:'Nidorino',slug:'nidorino',type:'Poison',tc:'#A855F7'},
   evolved2:{name:'Nidoking',slug:'nidoking',type:'Poison',tc:'#A855F7'},
   wild:{name:'Jigglypuff',slug:'jigglypuff',type:'Normal',tc:'#A3A3A3'}},
  {id:47,icon:'⚡',diff:'2stage',maxNum:20,ops:['+','-'],
   player:{name:'Pichu',slug:'pichu',type:'Electric',tc:'#FBBF24'},
   evolved:{name:'Pikachu',slug:'pikachu',type:'Electric',tc:'#FBBF24'},
   evolved2:{name:'Raichu',slug:'raichu',type:'Electric',tc:'#FBBF24'},
   wild:{name:'Voltorb',slug:'voltorb',type:'Electric',tc:'#FBBF24'}},
  {id:48,icon:'⭐',diff:'2stage',maxNum:20,ops:['+','-'],
   player:{name:'Cleffa',slug:'cleffa',type:'Fairy',tc:'#FB7185'},
   evolved:{name:'Clefairy',slug:'clefairy',type:'Fairy',tc:'#FB7185'},
   evolved2:{name:'Clefable',slug:'clefable',type:'Fairy',tc:'#FB7185'},
   wild:{name:'Togetic',slug:'togetic',type:'Fairy',tc:'#FB7185'}},
  {id:49,icon:'🎵',diff:'2stage',maxNum:20,ops:['+','-'],
   player:{name:'Igglybuff',slug:'igglybuff',type:'Normal',tc:'#A3A3A3'},
   evolved:{name:'Jigglypuff',slug:'jigglypuff',type:'Normal',tc:'#A3A3A3'},
   evolved2:{name:'Wigglytuff',slug:'wigglytuff',type:'Normal',tc:'#A3A3A3'},
   wild:{name:'Clefairy',slug:'clefairy',type:'Fairy',tc:'#FB7185'}},
  {id:50,icon:'🌱',diff:'2stage',maxNum:20,ops:['+','-'],
   player:{name:'Chikorita',slug:'chikorita',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Bayleef',slug:'bayleef',type:'Grass',tc:'#22C55E'},
   evolved2:{name:'Meganium',slug:'meganium',type:'Grass',tc:'#22C55E'},
   wild:{name:'Sunflora',slug:'sunflora',type:'Grass',tc:'#22C55E'}},
  {id:57,icon:'🍃',diff:'2stage',maxNum:20,ops:['+','-'],
   player:{name:'Hoppip',slug:'hoppip',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Skiploom',slug:'skiploom',type:'Grass',tc:'#22C55E'},
   evolved2:{name:'Jumpluff',slug:'jumpluff',type:'Grass',tc:'#22C55E'},
   wild:{name:'Meganium',slug:'meganium',type:'Grass',tc:'#22C55E'}},
  {id:58,icon:'🧊',diff:'2stage',maxNum:20,ops:['+','-'],
   player:{name:'Spheal',slug:'spheal',type:'Ice',tc:'#BAE6FD'},
   evolved:{name:'Sealeo',slug:'sealeo',type:'Ice',tc:'#BAE6FD'},
   evolved2:{name:'Walrein',slug:'walrein',type:'Ice',tc:'#BAE6FD'},
   wild:{name:'Dewgong',slug:'dewgong',type:'Ice',tc:'#BAE6FD'}},
  {id:59,icon:'🐉',diff:'2stage',maxNum:20,ops:['+','-'],
   player:{name:'Bagon',slug:'bagon',type:'Dragon',tc:'#6366F1'},
   evolved:{name:'Shelgon',slug:'shelgon',type:'Dragon',tc:'#6366F1'},
   evolved2:{name:'Salamence',slug:'salamence',type:'Dragon',tc:'#6366F1'},
   wild:{name:'Dragonair',slug:'dragonair',type:'Dragon',tc:'#6366F1'}},
  {id:60,icon:'⚙️',diff:'2stage',maxNum:20,ops:['+','-'],
   player:{name:'Aron',slug:'aron',type:'Steel',tc:'#94A3B8'},
   evolved:{name:'Lairon',slug:'lairon',type:'Steel',tc:'#94A3B8'},
   evolved2:{name:'Aggron',slug:'aggron',type:'Steel',tc:'#94A3B8'},
   wild:{name:'Steelix',slug:'steelix',type:'Steel',tc:'#94A3B8'}},
  {id:72,icon:'😴',diff:'2stage',maxNum:20,ops:['+','-'],
   player:{name:'Slakoth',slug:'slakoth',type:'Normal',tc:'#A3A3A3'},
   evolved:{name:'Vigoroth',slug:'vigoroth',type:'Normal',tc:'#A3A3A3'},
   evolved2:{name:'Slaking',slug:'slaking',type:'Normal',tc:'#A3A3A3'},
   wild:{name:'Kangaskhan',slug:'kangaskhan',type:'Normal',tc:'#A3A3A3'}},

  // === NEW: Missing Pokemon chains (user requested) ===
  // Froakie → Frogadier → Greninja (Water/Dark) — 3-stage
  {id:200,icon:'🐸',diff:'medium',maxNum:20,ops:['+','-'],
   player:{name:'Froakie',slug:'froakie',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Frogadier',slug:'frogadier',type:'Water',tc:'#38BDF8'},
   wild:{name:'Psyduck',slug:'psyduck',type:'Water',tc:'#38BDF8'}},
  {id:201,icon:'🐸',diff:'epic',maxNum:20,ops:['+','-'],
   player:{name:'Froakie',slug:'froakie',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Frogadier',slug:'frogadier',type:'Water',tc:'#38BDF8'},
   evolved2:{name:'Greninja',slug:'greninja',type:'Dark',tc:'#4B5563'},
   wild:{name:'Blastoise',slug:'blastoise',type:'Water',tc:'#38BDF8'}},

  // Taillow → Swellow (Flying) — 2-stage
  {id:202,icon:'🐦',diff:'easy',maxNum:10,ops:['+'],
   player:{name:'Taillow',slug:'taillow',type:'Flying',tc:'#A78BFA'},
   evolved:{name:'Swellow',slug:'swellow',type:'Flying',tc:'#A78BFA'},
   wild:{name:'Pidgeotto',slug:'pidgeotto',type:'Normal',tc:'#A3A3A3'}},

  // Gastly → Haunter → Gengar (Ghost) — 3-stage
  {id:203,icon:'👻',diff:'epic',maxNum:20,ops:['+','-'],
   player:{name:'Gastly',slug:'gastly',type:'Ghost',tc:'#7C3AED'},
   evolved:{name:'Haunter',slug:'haunter',type:'Ghost',tc:'#7C3AED'},
   evolved2:{name:'Gengar',slug:'gengar',type:'Ghost',tc:'#7C3AED'},
   wild:{name:'Alakazam',slug:'alakazam',type:'Psychic',tc:'#EC4899'}},

  // Torchic → Combusken → Blaziken (Fire/Fighting) — 3-stage
  {id:204,icon:'🔥',diff:'medium',maxNum:20,ops:['+','-'],
   player:{name:'Torchic',slug:'torchic',type:'Fire',tc:'#F97316'},
   evolved:{name:'Combusken',slug:'combusken',type:'Fire',tc:'#F97316'},
   wild:{name:'Arcanine',slug:'arcanine',type:'Fire',tc:'#F97316'}},
  {id:205,icon:'🔥',diff:'epic',maxNum:20,ops:['+','-'],
   player:{name:'Torchic',slug:'torchic',type:'Fire',tc:'#F97316'},
   evolved:{name:'Combusken',slug:'combusken',type:'Fire',tc:'#F97316'},
   evolved2:{name:'Blaziken',slug:'blaziken',type:'Fighting',tc:'#EF4444'},
   wild:{name:'Charizard',slug:'charizard',type:'Fire',tc:'#F97316'}},

  // Fennekin → Braixen → Delphox (Fire/Psychic) — 3-stage
  {id:206,icon:'🦊',diff:'medium',maxNum:20,ops:['+','-'],
   player:{name:'Fennekin',slug:'fennekin',type:'Fire',tc:'#F97316'},
   evolved:{name:'Braixen',slug:'braixen',type:'Fire',tc:'#F97316'},
   wild:{name:'Ninetales',slug:'ninetales',type:'Fire',tc:'#F97316'}},
  {id:207,icon:'🦊',diff:'epic',maxNum:20,ops:['+','-'],
   player:{name:'Fennekin',slug:'fennekin',type:'Fire',tc:'#F97316'},
   evolved:{name:'Braixen',slug:'braixen',type:'Fire',tc:'#F97316'},
   evolved2:{name:'Delphox',slug:'delphox',type:'Psychic',tc:'#EC4899'},
   wild:{name:'Alakazam',slug:'alakazam',type:'Psychic',tc:'#EC4899'}},

  // Chespin → Quilladin → Chesnaught (Grass/Fighting) — 3-stage
  {id:208,icon:'🌿',diff:'epic',maxNum:20,ops:['+','-'],
   player:{name:'Chespin',slug:'chespin',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Quilladin',slug:'quilladin',type:'Grass',tc:'#22C55E'},
   evolved2:{name:'Chesnaught',slug:'chesnaught',type:'Fighting',tc:'#EF4444'},
   wild:{name:'Venusaur',slug:'venusaur',type:'Grass',tc:'#22C55E'}},

  // Piplup → Prinplup → Empoleon (Water/Steel) — 3-stage
  {id:209,icon:'🐧',diff:'medium',maxNum:20,ops:['+','-'],
   player:{name:'Piplup',slug:'piplup',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Prinplup',slug:'prinplup',type:'Water',tc:'#38BDF8'},
   wild:{name:'Golduck',slug:'golduck',type:'Water',tc:'#38BDF8'}},
  {id:210,icon:'🐧',diff:'epic',maxNum:20,ops:['+','-'],
   player:{name:'Piplup',slug:'piplup',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Prinplup',slug:'prinplup',type:'Water',tc:'#38BDF8'},
   evolved2:{name:'Empoleon',slug:'empoleon',type:'Water',tc:'#0369A1'},
   wild:{name:'Blastoise',slug:'blastoise',type:'Water',tc:'#38BDF8'}},

  // Turtwig → Grotle → Torterra (Grass/Ground) — 3-stage
  {id:211,icon:'🐢',diff:'epic',maxNum:20,ops:['+','-'],
   player:{name:'Turtwig',slug:'turtwig',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Grotle',slug:'grotle',type:'Grass',tc:'#22C55E'},
   evolved2:{name:'Torterra',slug:'torterra',type:'Ground',tc:'#D97706'},
   wild:{name:'Venusaur',slug:'venusaur',type:'Grass',tc:'#22C55E'}},

  // Chimchar → Monferno → Infernape (Fire/Fighting) — 3-stage
  {id:212,icon:'🐒',diff:'epic',maxNum:20,ops:['+','-'],
   player:{name:'Chimchar',slug:'chimchar',type:'Fire',tc:'#F97316'},
   evolved:{name:'Monferno',slug:'monferno',type:'Fire',tc:'#F97316'},
   evolved2:{name:'Infernape',slug:'infernape',type:'Fighting',tc:'#EF4444'},
   wild:{name:'Blaziken',slug:'blaziken',type:'Fighting',tc:'#EF4444'}},

  // Snivy → Servine → Serperior (Grass) — 3-stage
  {id:213,icon:'🐍',diff:'hard',maxNum:20,ops:['+','-'],
   player:{name:'Snivy',slug:'snivy',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Servine',slug:'servine',type:'Grass',tc:'#22C55E'},
   evolved2:{name:'Serperior',slug:'serperior',type:'Grass',tc:'#22C55E'},
   wild:{name:'Exeggutor',slug:'exeggutor',type:'Grass',tc:'#22C55E'}},

  // Oshawott → Dewott → Samurott (Water) — 3-stage
  {id:214,icon:'🦦',diff:'hard',maxNum:20,ops:['+','-'],
   player:{name:'Oshawott',slug:'oshawott',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Dewott',slug:'dewott',type:'Water',tc:'#38BDF8'},
   evolved2:{name:'Samurott',slug:'samurott',type:'Water',tc:'#38BDF8'},
   wild:{name:'Blastoise',slug:'blastoise',type:'Water',tc:'#38BDF8'}},

  // Tepig → Pignite → Emboar (Fire/Fighting) — 3-stage
  {id:215,icon:'🐷',diff:'hard',maxNum:20,ops:['+','-'],
   player:{name:'Tepig',slug:'tepig',type:'Fire',tc:'#F97316'},
   evolved:{name:'Pignite',slug:'pignite',type:'Fire',tc:'#F97316'},
   evolved2:{name:'Emboar',slug:'emboar',type:'Fighting',tc:'#EF4444'},
   wild:{name:'Charizard',slug:'charizard',type:'Fire',tc:'#F97316'}},

  // Pidgey → Pidgeotto → Pidgeot (Normal/Flying) — 3-stage
  {id:216,icon:'🐦',diff:'2stage',maxNum:20,ops:['+','-'],
   player:{name:'Pidgey',slug:'pidgey',type:'Normal',tc:'#A3A3A3'},
   evolved:{name:'Pidgeotto',slug:'pidgeotto',type:'Flying',tc:'#A78BFA'},
   evolved2:{name:'Pidgeot',slug:'pidgeot',type:'Flying',tc:'#A78BFA'},
   wild:{name:'Swellow',slug:'swellow',type:'Flying',tc:'#A78BFA'}},

  // Caterpie → Metapod → Butterfree (Bug/Flying) — 3-stage
  {id:217,icon:'🐛',diff:'easy',maxNum:10,ops:['+'],
   player:{name:'Caterpie',slug:'caterpie',type:'Bug',tc:'#84CC16'},
   evolved:{name:'Metapod',slug:'metapod',type:'Bug',tc:'#84CC16'},
   evolved2:{name:'Butterfree',slug:'butterfree',type:'Bug',tc:'#84CC16'},
   wild:{name:'Venomoth',slug:'venomoth',type:'Bug',tc:'#84CC16'}},

  // Weedle → Kakuna → Beedrill (Bug/Poison) — 3-stage
  {id:218,icon:'🐝',diff:'easy',maxNum:10,ops:['+'],
   player:{name:'Weedle',slug:'weedle',type:'Bug',tc:'#84CC16'},
   evolved:{name:'Kakuna',slug:'kakuna',type:'Bug',tc:'#84CC16'},
   evolved2:{name:'Beedrill',slug:'beedrill',type:'Bug',tc:'#84CC16'},
   wild:{name:'Butterfree',slug:'butterfree',type:'Bug',tc:'#84CC16'}},

  // Nidoran♂ → Nidorino → Nidoking (Poison/Ground) — 3-stage
  {id:219,icon:'🦏',diff:'hard',maxNum:20,ops:['+','-'],
   player:{name:'Nidoran♂',slug:'nidoran-m',type:'Poison',tc:'#A855F7'},
   evolved:{name:'Nidorino',slug:'nidorino',type:'Poison',tc:'#A855F7'},
   evolved2:{name:'Nidoking',slug:'nidoking',type:'Ground',tc:'#D97706'},
   wild:{name:'Rhydon',slug:'rhydon',type:'Rock',tc:'#A16207'}},

  // Geodude → Graveler → Golem (Rock/Ground) — 3-stage
  {id:220,icon:'🪨',diff:'2stage',maxNum:20,ops:['+','-'],
   player:{name:'Geodude',slug:'geodude',type:'Rock',tc:'#A16207'},
   evolved:{name:'Graveler',slug:'graveler',type:'Rock',tc:'#A16207'},
   evolved2:{name:'Golem',slug:'golem',type:'Rock',tc:'#A16207'},
   wild:{name:'Rhydon',slug:'rhydon',type:'Rock',tc:'#A16207'}},
]

// HP config by difficulty
// Task #67 (2026-04-25): added `stages` flag for 1|2|3-stage evolution support.
// stages=1: player→evolved only (early levels)
// stages=2: player→evolved→evolved2 (mid levels)
// stages=3: player→evolved→evolved2→mega (late levels — MEGA EVOLUTION)
const G13_DIFF = {
  easy:      { playerHp:5, wildHp:8,  attacksToEvo:3, damage:1, wildDamage:1, stages:1 },
  medium:    { playerHp:6, wildHp:10, attacksToEvo:4, damage:1, wildDamage:1, stages:1 },
  hard:      { playerHp:7, wildHp:12, attacksToEvo:5, damage:1, wildDamage:1, stages:2 },
  '2stage':  { playerHp:7, wildHp:13, attacksToEvo:5, damage:1, wildDamage:1, stages:2 },
  epic:      { playerHp:8, wildHp:18, attacksToEvo:4, damage:1, wildDamage:1, stages:2 },
  '3stage':  { playerHp:8, wildHp:24, attacksToEvo:5, damage:1, wildDamage:1, stages:3 },
  legendary: { playerHp:9, wildHp:30, attacksToEvo:5, damage:1, wildDamage:1, stages:3 },
}

// Type color map for badge
const G13_TYPE_COLORS = {
  Fire:'#F97316', Water:'#38BDF8', Grass:'#22C55E', Electric:'#FBBF24',
  Psychic:'#EC4899', Ghost:'#7C3AED', Poison:'#A855F7', Fighting:'#EF4444',
  Rock:'#A16207', Ground:'#D97706', Bug:'#84CC16', Normal:'#A3A3A3',
  Dragon:'#6366F1', Ice:'#BAE6FD', Fairy:'#FB7185', Steel:'#94A3B8',
}

let g13State = {}
let g13ResultTimeout = null

// ════════════════════════════════════════════════════════════════════
// G13 FAMILIES — curated evolution chain selector
// Built 2026-04-24 (16 chains), expanded 2026-04-25 to 44 chains (Task #67)
// 17 popular + 21 Ash + 5 cool + 1 random = 44 options
// 3-stage support: families with `mega` field show Mega/Gmax/special-form at 3stage+legendary tiers
// Sprite strategy: stage 0/1/2 use unique local WebP; stage 3 (mega) reuses stage 2 sprite + visual aura overlay
// ════════════════════════════════════════════════════════════════════

// Task #67: synthetic MAX FORM for chains without canonical Mega/Gmax/special form.
// Reuses stage 2 sprite + gold aura + "MAX FORM" badge so all 3-stage tiers feel equally rewarding.
function synthMaxBoostForm(stage) {
  if (!stage) return null
  return {
    name: 'MAX ' + stage.name,
    slug: stage.slug,
    type: stage.type,
    tc: stage.tc,
    form: 'max-boost',
    aura: 'gold',
    badge: '✨ MAX FORM',
  }
}

// Task #67: Mega/Gmax/Ash-form visual overlay — sprite sama, hanya aura + badge + scale.
// Tidak butuh sprite Mega lokal; gradien CSS + animasi keyframe membuat efek dramatic.
function applyMegaOverlay(pspr, megaForm) {
  if (!pspr || !megaForm) return
  // Apply aura class (rotating glow ring)
  pspr.classList.add('poke-mega-aura', 'aura-' + (megaForm.aura || 'gold'))
  // Floating badge above sprite
  try {
    const wrap = pspr.parentElement
    if (wrap) {
      let badge = wrap.querySelector('.poke-mega-badge')
      if (!badge) {
        badge = document.createElement('div')
        badge.className = 'poke-mega-badge aura-' + (megaForm.aura || 'gold')
        wrap.appendChild(badge)
      } else {
        badge.className = 'poke-mega-badge aura-' + (megaForm.aura || 'gold')
      }
      badge.textContent = megaForm.badge || '⭐ MEGA'
      // Animate-in
      badge.style.animation = 'none'; void badge.offsetWidth
      badge.style.animation = 'megaBadgeBounce 0.5s cubic-bezier(0.34,1.56,0.64,1)'
    }
  } catch(_) {}
}

function clearMegaOverlay(pspr) {
  if (!pspr) return
  pspr.classList.remove('poke-mega-aura', 'aura-gold', 'aura-blue', 'aura-red', 'aura-rainbow')
  try {
    const wrap = pspr.parentElement
    const badge = wrap && wrap.querySelector('.poke-mega-badge')
    if (badge) badge.remove()
  } catch(_) {}
}

// Mega/Gmax/Ash-form helper (Task #67) — sprite reuses stage 2; visual aura overlay only
const _mega = (name, baseSlug, type, tc, form, aura, badge) => ({name, slug: baseSlug, type, tc, form, aura, badge})

const G13_FAMILIES = [
  // ══════════════════════════════════════════════════════════════════
  // ⭐ POPULER (22) — kid-iconic 3-stage chains + companion favorites
  // ══════════════════════════════════════════════════════════════════
  {id:'bulbasaur-line', label:'Bulbasaur', series:'Kanto Grass Starter', category:'popular', color:'#22C55E', icon:'🌿',
   player:{name:'Bulbasaur',slug:'bulbasaur',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Ivysaur',slug:'ivysaur',type:'Grass',tc:'#22C55E'},
   evolved2:{name:'Venusaur',slug:'venusaur',type:'Grass',tc:'#22C55E'},
   mega:_mega('Mega Venusaur','venusaur','Grass','#16A34A','mega','rainbow','⭐ MEGA'),
   wild:{name:'Oddish',slug:'oddish',type:'Grass',tc:'#22C55E'}},
  {id:'charmander-line', label:'Charmander', series:'Kanto Fire Starter', category:'popular', color:'#F97316', icon:'🔥',
   player:{name:'Charmander',slug:'charmander',type:'Fire',tc:'#F97316'},
   evolved:{name:'Charmeleon',slug:'charmeleon',type:'Fire',tc:'#F97316'},
   evolved2:{name:'Charizard',slug:'charizard',type:'Fire',tc:'#F97316'},
   mega:_mega('Mega Charizard Y','charizard','Fire','#EAB308','mega-y','gold','⭐ MEGA Y'),
   wild:{name:'Growlithe',slug:'growlithe',type:'Fire',tc:'#F97316'}},
  {id:'squirtle-line', label:'Squirtle', series:'Kanto Water Starter', category:'popular', color:'#38BDF8', icon:'💧',
   player:{name:'Squirtle',slug:'squirtle',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Wartortle',slug:'wartortle',type:'Water',tc:'#38BDF8'},
   evolved2:{name:'Blastoise',slug:'blastoise',type:'Water',tc:'#38BDF8'},
   mega:_mega('Mega Blastoise','blastoise','Water','#0EA5E9','mega','blue','⭐ MEGA'),
   wild:{name:'Psyduck',slug:'psyduck',type:'Water',tc:'#38BDF8'}},
  {id:'pichu-line', label:'Pichu', series:'Electric Mouse Line', category:'popular', color:'#FBBF24', icon:'⚡',
   player:{name:'Pichu',slug:'pichu',type:'Electric',tc:'#FBBF24'},
   evolved:{name:'Pikachu',slug:'pikachu',type:'Electric',tc:'#FBBF24'},
   evolved2:{name:'Raichu',slug:'raichu',type:'Electric',tc:'#FBBF24'},
   wild:{name:'Magnemite',slug:'magnemite',type:'Electric',tc:'#FBBF24'}},
  {id:'caterpie-line', label:'Caterpie', series:'Butterfly Bug', category:'popular', color:'#84CC16', icon:'🦋',
   player:{name:'Caterpie',slug:'caterpie',type:'Bug',tc:'#84CC16'},
   evolved:{name:'Metapod',slug:'metapod',type:'Bug',tc:'#84CC16'},
   evolved2:{name:'Butterfree',slug:'butterfree',type:'Bug',tc:'#84CC16'},
   mega:_mega('Gmax Butterfree','butterfree','Bug','#65A30D','gmax','red','🌟 G-MAX'),
   wild:{name:'Weedle',slug:'weedle',type:'Bug',tc:'#84CC16'}},
  {id:'abra-line', label:'Abra', series:'Psychic Legend', category:'popular', color:'#EC4899', icon:'🔮',
   player:{name:'Abra',slug:'abra',type:'Psychic',tc:'#EC4899'},
   evolved:{name:'Kadabra',slug:'kadabra',type:'Psychic',tc:'#EC4899'},
   evolved2:{name:'Alakazam',slug:'alakazam',type:'Psychic',tc:'#EC4899'},
   mega:_mega('Mega Alakazam','alakazam','Psychic','#DB2777','mega','rainbow','⭐ MEGA'),
   wild:{name:'Drowzee',slug:'drowzee',type:'Psychic',tc:'#EC4899'}},
  {id:'gastly-line', label:'Gastly', series:'Ghost Trio', category:'popular', color:'#7C3AED', icon:'👻',
   player:{name:'Gastly',slug:'gastly',type:'Ghost',tc:'#7C3AED'},
   evolved:{name:'Haunter',slug:'haunter',type:'Ghost',tc:'#7C3AED'},
   evolved2:{name:'Gengar',slug:'gengar',type:'Ghost',tc:'#7C3AED'},
   mega:_mega('Mega Gengar','gengar','Ghost','#6D28D9','mega','rainbow','⭐ MEGA'),
   wild:{name:'Misdreavus',slug:'misdreavus',type:'Ghost',tc:'#7C3AED'}},
  {id:'machop-line', label:'Machop', series:'Fighting Brawler', category:'popular', color:'#EF4444', icon:'💪',
   player:{name:'Machop',slug:'machop',type:'Fighting',tc:'#EF4444'},
   evolved:{name:'Machoke',slug:'machoke',type:'Fighting',tc:'#EF4444'},
   evolved2:{name:'Machamp',slug:'machamp',type:'Fighting',tc:'#EF4444'},
   mega:_mega('Gmax Machamp','machamp','Fighting','#DC2626','gmax','red','🌟 G-MAX'),
   wild:{name:'Mankey',slug:'mankey',type:'Fighting',tc:'#EF4444'}},
  {id:'geodude-line', label:'Geodude', series:'Rock Heavyweight', category:'popular', color:'#A16207', icon:'🪨',
   player:{name:'Geodude',slug:'geodude',type:'Rock',tc:'#A16207'},
   evolved:{name:'Graveler',slug:'graveler',type:'Rock',tc:'#A16207'},
   evolved2:{name:'Golem',slug:'golem',type:'Rock',tc:'#A16207'},
   wild:{name:'Onix',slug:'onix',type:'Rock',tc:'#A16207'}},
  {id:'eevee-vaporeon', label:'Eevee → Vaporeon', series:'Eeveelution Water', category:'popular', color:'#38BDF8', icon:'🌊',
   player:{name:'Eevee',slug:'eevee',type:'Normal',tc:'#A3A3A3'},
   evolved:{name:'Vaporeon',slug:'vaporeon',type:'Water',tc:'#38BDF8'},
   evolved2:null,
   wild:{name:'Flareon',slug:'flareon',type:'Fire',tc:'#F97316'}},
  {id:'eevee-espeon', label:'Eevee → Espeon', series:'Eeveelution Psychic', category:'popular', color:'#EC4899', icon:'✨',
   player:{name:'Eevee',slug:'eevee',type:'Normal',tc:'#A3A3A3'},
   evolved:{name:'Espeon',slug:'espeon',type:'Psychic',tc:'#EC4899'},
   evolved2:null,
   wild:{name:'Umbreon',slug:'umbreon',type:'Dark',tc:'#4B5563'}},
  {id:'eevee-sylveon', label:'Eevee → Sylveon', series:'Eeveelution Fairy', category:'popular', color:'#FB7185', icon:'🎀',
   player:{name:'Eevee',slug:'eevee',type:'Normal',tc:'#A3A3A3'},
   evolved:{name:'Sylveon',slug:'sylveon',type:'Fairy',tc:'#FB7185'},
   evolved2:null,
   wild:{name:'Glaceon',slug:'glaceon',type:'Ice',tc:'#BAE6FD'}},
  {id:'mudkip-line', label:'Mudkip', series:'Hoenn Water Starter', category:'popular', color:'#06B6D4', icon:'💦',
   player:{name:'Mudkip',slug:'mudkip',type:'Water',tc:'#06B6D4'},
   evolved:{name:'Marshtomp',slug:'marshtomp',type:'Water',tc:'#06B6D4'},
   evolved2:{name:'Swampert',slug:'swampert',type:'Water',tc:'#0891B2'},
   mega:_mega('Mega Swampert','swampert','Water','#155E75','mega','blue','⭐ MEGA'),
   wild:{name:'Lotad',slug:'lotad',type:'Water',tc:'#65A30D'}},
  {id:'snivy-line', label:'Snivy', series:'Unova Grass Starter', category:'popular', color:'#65A30D', icon:'🌱',
   player:{name:'Snivy',slug:'snivy',type:'Grass',tc:'#65A30D'},
   evolved:{name:'Servine',slug:'servine',type:'Grass',tc:'#65A30D'},
   evolved2:{name:'Serperior',slug:'serperior',type:'Grass',tc:'#15803D'},
   wild:{name:'Tepig',slug:'tepig',type:'Fire',tc:'#F97316'}},
  {id:'fennekin-line', label:'Fennekin', series:'Kalos Fire Starter', category:'popular', color:'#F59E0B', icon:'🦊',
   player:{name:'Fennekin',slug:'fennekin',type:'Fire',tc:'#F59E0B'},
   evolved:{name:'Braixen',slug:'braixen',type:'Fire',tc:'#F59E0B'},
   evolved2:{name:'Delphox',slug:'delphox',type:'Fire',tc:'#D97706'},
   wild:{name:'Vulpix',slug:'vulpix',type:'Fire',tc:'#F97316'}},
  {id:'sobble-line', label:'Sobble', series:'Galar Water Starter', category:'popular', color:'#0EA5E9', icon:'💧',
   player:{name:'Sobble',slug:'sobble',type:'Water',tc:'#0EA5E9'},
   evolved:{name:'Drizzile',slug:'drizzile',type:'Water',tc:'#0EA5E9'},
   evolved2:{name:'Inteleon',slug:'inteleon',type:'Water',tc:'#0284C7'},
   mega:_mega('Gmax Inteleon','inteleon','Water','#0369A1','gmax','blue','🌟 G-MAX'),
   wild:{name:'Magikarp',slug:'magikarp',type:'Water',tc:'#EF4444'}},
  {id:'munchlax-line', label:'Munchlax', series:'Big Eater', category:'popular', color:'#A78BFA', icon:'🍙',
   player:{name:'Munchlax',slug:'munchlax',type:'Normal',tc:'#A78BFA'},
   evolved:{name:'Snorlax',slug:'snorlax',type:'Normal',tc:'#7C3AED'},
   evolved2:null,
   mega:_mega('Gmax Snorlax','snorlax','Normal','#581C87','gmax','rainbow','🌟 G-MAX'),
   wild:{name:'Slakoth',slug:'slakoth',type:'Normal',tc:'#A3A3A3'}},
  {id:'torchic-line', label:'Torchic (May)', series:'May\'s Fire Starter — Hoenn', category:'popular', color:'#F97316', icon:'🔥',
   player:{name:'Torchic',slug:'torchic',type:'Fire',tc:'#F97316'},
   evolved:{name:'Combusken',slug:'combusken',type:'Fire',tc:'#EA580C'},
   evolved2:{name:'Blaziken',slug:'blaziken',type:'Fire',tc:'#DC2626'},
   mega:_mega('Mega Blaziken','blaziken','Fire','#C2410C','mega','red','⭐ MEGA'),
   wild:{name:'Numel',slug:'numel',type:'Fire',tc:'#F97316'}},
  {id:'piplup-line', label:'Piplup (Dawn)', series:'Dawn\'s Water Starter — Sinnoh', category:'popular', color:'#38BDF8', icon:'🐧',
   player:{name:'Piplup',slug:'piplup',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Prinplup',slug:'prinplup',type:'Water',tc:'#0EA5E9'},
   evolved2:{name:'Empoleon',slug:'empoleon',type:'Water',tc:'#0369A1'},
   wild:{name:'Buizel',slug:'buizel',type:'Water',tc:'#38BDF8'}},
  {id:'scorbunny-line', label:'Scorbunny (Goh)', series:'Goh\'s Fire Starter — JN', category:'popular', color:'#EF4444', icon:'🐰',
   player:{name:'Scorbunny',slug:'scorbunny',type:'Fire',tc:'#EF4444'},
   evolved:{name:'Raboot',slug:'raboot',type:'Fire',tc:'#DC2626'},
   evolved2:{name:'Cinderace',slug:'cinderace',type:'Fire',tc:'#B91C1C'},
   mega:_mega('Gmax Cinderace','cinderace','Fire','#991B1B','gmax','red','🌟 G-MAX'),
   wild:{name:'Yamper',slug:'yamper',type:'Electric',tc:'#FBBF24'}},
  {id:'togepi-line', label:'Togepi (Misty)', series:'Misty\'s Fairy Egg — Kanto/Johto', category:'popular', color:'#FB7185', icon:'🥚',
   player:{name:'Togepi',slug:'togepi',type:'Fairy',tc:'#FB7185'},
   evolved:{name:'Togetic',slug:'togetic',type:'Fairy',tc:'#F472B6'},
   evolved2:{name:'Togekiss',slug:'togekiss',type:'Fairy',tc:'#EC4899'},
   wild:{name:'Clefairy',slug:'clefairy',type:'Fairy',tc:'#FB7185'}},
  {id:'popplio-line', label:'Popplio (Lana)', series:'Lana\'s Water Starter — Alola', category:'popular', color:'#0EA5E9', icon:'🦭',
   player:{name:'Popplio',slug:'popplio',type:'Water',tc:'#0EA5E9'},
   evolved:{name:'Brionne',slug:'brionne',type:'Water',tc:'#0284C7'},
   evolved2:{name:'Primarina',slug:'primarina',type:'Water',tc:'#0369A1'},
   wild:{name:'Wishiwashi',slug:'wishiwashi',type:'Water',tc:'#38BDF8'}},

  // ══════════════════════════════════════════════════════════════════
  // 🎒 ASH (27) — Ash Ketchum's signature roster across all regions
  // ══════════════════════════════════════════════════════════════════
  {id:'ash-pikachu', label:'Pikachu (Ash)', series:'Ash\'s Partner — Kanto', category:'ash', color:'#FBBF24', icon:'⚡',
   player:{name:'Pichu',slug:'pichu',type:'Electric',tc:'#FBBF24'},
   evolved:{name:'Pikachu',slug:'pikachu',type:'Electric',tc:'#FBBF24'},
   evolved2:{name:'Raichu',slug:'raichu',type:'Electric',tc:'#EAB308'},
   mega:_mega('Gmax Pikachu','pikachu','Electric','#DC2626','gmax','red','🌟 G-MAX'),
   wild:{name:'Spearow',slug:'spearow',type:'Flying',tc:'#A3A3A3'}},
  {id:'ash-charizard', label:'Charizard (Ash)', series:'Ash\'s Charizard — Kanto', category:'ash', color:'#F97316', icon:'🔥',
   player:{name:'Charmander',slug:'charmander',type:'Fire',tc:'#F97316'},
   evolved:{name:'Charmeleon',slug:'charmeleon',type:'Fire',tc:'#F97316'},
   evolved2:{name:'Charizard',slug:'charizard',type:'Fire',tc:'#EA580C'},
   mega:_mega('Mega Charizard X','charizard','Fire','#3B82F6','mega-x','blue','⭐ MEGA X'),
   wild:{name:'Damian-Charmander',slug:'charmander',type:'Fire',tc:'#A3A3A3'}},
  {id:'ash-bulbasaur', label:'Bulbasaur (Ash)', series:'Ash\'s Bulbasaur — Kanto', category:'ash', color:'#22C55E', icon:'🌿',
   player:{name:'Bulbasaur',slug:'bulbasaur',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Ivysaur',slug:'ivysaur',type:'Grass',tc:'#22C55E'},
   evolved2:{name:'Venusaur',slug:'venusaur',type:'Grass',tc:'#16A34A'},
   mega:_mega('Mega Venusaur','venusaur','Grass','#15803D','mega','rainbow','⭐ MEGA'),
   wild:{name:'Oddish',slug:'oddish',type:'Grass',tc:'#65A30D'}},
  {id:'ash-squirtle', label:'Squirtle (Ash)', series:'Ash\'s Squirtle Squad — Kanto', category:'ash', color:'#38BDF8', icon:'🐢',
   player:{name:'Squirtle',slug:'squirtle',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Wartortle',slug:'wartortle',type:'Water',tc:'#38BDF8'},
   evolved2:{name:'Blastoise',slug:'blastoise',type:'Water',tc:'#0EA5E9'},
   mega:_mega('Mega Blastoise','blastoise','Water','#0284C7','mega','blue','⭐ MEGA'),
   wild:{name:'Krabby',slug:'krabby',type:'Water',tc:'#EF4444'}},
  {id:'ash-butterfree', label:'Butterfree (Ash)', series:'Caterpie → Butterfree', category:'ash', color:'#84CC16', icon:'🦋',
   player:{name:'Caterpie',slug:'caterpie',type:'Bug',tc:'#84CC16'},
   evolved:{name:'Metapod',slug:'metapod',type:'Bug',tc:'#84CC16'},
   evolved2:{name:'Butterfree',slug:'butterfree',type:'Bug',tc:'#65A30D'},
   mega:_mega('Gmax Butterfree','butterfree','Bug','#15803D','gmax','rainbow','🌟 G-MAX'),
   wild:{name:'Weedle',slug:'weedle',type:'Bug',tc:'#A3A3A3'}},
  {id:'ash-pidgeot', label:'Pidgeot (Ash)', series:'Pidgey → Pidgeot — Kanto', category:'ash', color:'#A78BFA', icon:'🦅',
   player:{name:'Pidgey',slug:'pidgey',type:'Flying',tc:'#A78BFA'},
   evolved:{name:'Pidgeotto',slug:'pidgeotto',type:'Flying',tc:'#A78BFA'},
   evolved2:{name:'Pidgeot',slug:'pidgeot',type:'Flying',tc:'#7C3AED'},
   mega:_mega('Mega Pidgeot','pidgeot','Flying','#6D28D9','mega','rainbow','⭐ MEGA'),
   wild:{name:'Spearow',slug:'spearow',type:'Flying',tc:'#A3A3A3'}},
  {id:'ash-snorlax', label:'Snorlax (Ash)', series:'Munchlax → Snorlax', category:'ash', color:'#A78BFA', icon:'😴',
   player:{name:'Munchlax',slug:'munchlax',type:'Normal',tc:'#A78BFA'},
   evolved:{name:'Snorlax',slug:'snorlax',type:'Normal',tc:'#7C3AED'},
   evolved2:null,
   mega:_mega('Gmax Snorlax','snorlax','Normal','#581C87','gmax','rainbow','🌟 G-MAX'),
   wild:{name:'Lickitung',slug:'lickitung',type:'Normal',tc:'#FB7185'}},
  {id:'ash-heracross', label:'Heracross (Ash)', series:'Johto Bug Power', category:'ash', color:'#1E40AF', icon:'🐞',
   player:{name:'Heracross',slug:'heracross',type:'Bug',tc:'#1E40AF'},
   evolved:{name:'Heracross',slug:'heracross',type:'Bug',tc:'#1E40AF'},
   evolved2:null,
   mega:_mega('Mega Heracross','heracross','Bug','#172554','mega','rainbow','⭐ MEGA'),
   wild:{name:'Pinsir',slug:'pinsir',type:'Bug',tc:'#A16207'}},
  {id:'ash-meganium', label:'Meganium (Ash)', series:'Chikorita → Meganium', category:'ash', color:'#22C55E', icon:'🌷',
   player:{name:'Chikorita',slug:'chikorita',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Bayleef',slug:'bayleef',type:'Grass',tc:'#22C55E'},
   evolved2:{name:'Meganium',slug:'meganium',type:'Grass',tc:'#16A34A'},
   wild:{name:'Sunkern',slug:'sunkern',type:'Grass',tc:'#FBBF24'}},
  {id:'ash-sceptile', label:'Sceptile (Ash)', series:'Treecko → Sceptile — Hoenn', category:'ash', color:'#22C55E', icon:'🦎',
   player:{name:'Treecko',slug:'treecko',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Grovyle',slug:'grovyle',type:'Grass',tc:'#22C55E'},
   evolved2:{name:'Sceptile',slug:'sceptile',type:'Grass',tc:'#15803D'},
   mega:_mega('Mega Sceptile','sceptile','Grass','#14532D','mega','rainbow','⭐ MEGA'),
   wild:{name:'Seedot',slug:'seedot',type:'Grass',tc:'#A16207'}},
  {id:'ash-glalie', label:'Glalie (Ash)', series:'Snorunt → Glalie — Hoenn', category:'ash', color:'#BAE6FD', icon:'❄️',
   player:{name:'Snorunt',slug:'snorunt',type:'Ice',tc:'#BAE6FD'},
   evolved:{name:'Glalie',slug:'glalie',type:'Ice',tc:'#0EA5E9'},
   evolved2:null,
   mega:_mega('Mega Glalie','glalie','Ice','#0369A1','mega','blue','⭐ MEGA'),
   wild:{name:'Spheal',slug:'spheal',type:'Ice',tc:'#A78BFA'}},
  {id:'ash-infernape', label:'Infernape (Ash)', series:'Chimchar → Infernape — Sinnoh', category:'ash', color:'#EF4444', icon:'🐒',
   player:{name:'Chimchar',slug:'chimchar',type:'Fire',tc:'#F97316'},
   evolved:{name:'Monferno',slug:'monferno',type:'Fire',tc:'#EA580C'},
   evolved2:{name:'Infernape',slug:'infernape',type:'Fire',tc:'#DC2626'},
   wild:{name:'Buizel',slug:'buizel',type:'Water',tc:'#FB923C'}},
  {id:'ash-staraptor', label:'Staraptor (Ash)', series:'Starly → Staraptor — Sinnoh', category:'ash', color:'#A78BFA', icon:'🦅',
   player:{name:'Starly',slug:'starly',type:'Flying',tc:'#A78BFA'},
   evolved:{name:'Staravia',slug:'staravia',type:'Flying',tc:'#7C3AED'},
   evolved2:{name:'Staraptor',slug:'staraptor',type:'Flying',tc:'#6D28D9'},
   wild:{name:'Bidoof',slug:'bidoof',type:'Normal',tc:'#A16207'}},
  {id:'ash-garchomp', label:'Garchomp (Ash)', series:'Gible → Garchomp — Sinnoh/JN', category:'ash', color:'#1E40AF', icon:'🦈',
   player:{name:'Gible',slug:'gible',type:'Dragon',tc:'#1E40AF'},
   evolved:{name:'Gabite',slug:'gabite',type:'Dragon',tc:'#1E40AF'},
   evolved2:{name:'Garchomp',slug:'garchomp',type:'Dragon',tc:'#1E3A8A'},
   mega:_mega('Mega Garchomp','garchomp','Dragon','#172554','mega','rainbow','⭐ MEGA'),
   wild:{name:'Carnivine',slug:'carnivine',type:'Grass',tc:'#65A30D'}},
  {id:'ash-pignite', label:'Pignite (Ash)', series:'Tepig → Emboar — Unova', category:'ash', color:'#F97316', icon:'🐗',
   player:{name:'Tepig',slug:'tepig',type:'Fire',tc:'#F97316'},
   evolved:{name:'Pignite',slug:'pignite',type:'Fire',tc:'#EA580C'},
   evolved2:{name:'Emboar',slug:'emboar',type:'Fire',tc:'#DC2626'},
   wild:{name:'Oshawott',slug:'oshawott',type:'Water',tc:'#0EA5E9'}},
  {id:'ash-krookodile', label:'Krookodile (Ash)', series:'Sandile → Krookodile — Unova', category:'ash', color:'#A16207', icon:'🐊',
   player:{name:'Sandile',slug:'sandile',type:'Ground',tc:'#A16207'},
   evolved:{name:'Krokorok',slug:'krokorok',type:'Ground',tc:'#A16207'},
   evolved2:{name:'Krookodile',slug:'krookodile',type:'Ground',tc:'#78350F'},
   wild:{name:'Scraggy',slug:'scraggy',type:'Dark',tc:'#FBBF24'}},
  {id:'ash-greninja', label:'Greninja (Ash)', series:'Froakie → Ash-Greninja — Kalos', category:'ash', color:'#0EA5E9', icon:'🥷',
   player:{name:'Froakie',slug:'froakie',type:'Water',tc:'#0EA5E9'},
   evolved:{name:'Frogadier',slug:'frogadier',type:'Water',tc:'#0EA5E9'},
   evolved2:{name:'Greninja',slug:'greninja',type:'Water',tc:'#0284C7'},
   mega:_mega('Ash-Greninja','greninja','Water','#1E3A8A','ash-form','blue','💧 ASH-FORM'),
   wild:{name:'Bunnelby',slug:'bunnelby',type:'Normal',tc:'#A78BFA'}},
  {id:'ash-talonflame', label:'Talonflame (Ash)', series:'Fletchling → Talonflame — Kalos', category:'ash', color:'#EF4444', icon:'🔥',
   player:{name:'Fletchling',slug:'fletchling',type:'Flying',tc:'#EF4444'},
   evolved:{name:'Fletchinder',slug:'fletchinder',type:'Fire',tc:'#F97316'},
   evolved2:{name:'Talonflame',slug:'talonflame',type:'Fire',tc:'#DC2626'},
   wild:{name:'Pancham',slug:'pancham',type:'Fighting',tc:'#A3A3A3'}},
  {id:'ash-incineroar', label:'Incineroar (Ash)', series:'Litten → Incineroar — Alola', category:'ash', color:'#EF4444', icon:'🐅',
   player:{name:'Litten',slug:'litten',type:'Fire',tc:'#EF4444'},
   evolved:{name:'Torracat',slug:'torracat',type:'Fire',tc:'#EF4444'},
   evolved2:{name:'Incineroar',slug:'incineroar',type:'Fire',tc:'#B91C1C'},
   wild:{name:'Rowlet',slug:'rowlet',type:'Grass',tc:'#84CC16'}},
  {id:'ash-lucario', label:'Lucario (Ash)', series:'Riolu → Lucario — JN', category:'ash', color:'#3B82F6', icon:'🥋',
   player:{name:'Riolu',slug:'riolu',type:'Fighting',tc:'#3B82F6'},
   evolved:{name:'Lucario',slug:'lucario',type:'Fighting',tc:'#1E40AF'},
   evolved2:null,
   mega:_mega('Mega Lucario','lucario','Fighting','#172554','mega','blue','⭐ MEGA'),
   wild:{name:'Mienfoo',slug:'mienfoo',type:'Fighting',tc:'#FBBF24'}},
  {id:'ash-dragonite', label:'Dragonite (Ash)', series:'Dratini → Dragonite — JN', category:'ash', color:'#F97316', icon:'🐉',
   player:{name:'Dratini',slug:'dratini',type:'Dragon',tc:'#F97316'},
   evolved:{name:'Dragonair',slug:'dragonair',type:'Dragon',tc:'#F97316'},
   evolved2:{name:'Dragonite',slug:'dragonite',type:'Dragon',tc:'#EA580C'},
   wild:{name:'Charmeleon',slug:'charmeleon',type:'Fire',tc:'#EF4444'}},
  {id:'ash-sirfetchd', label:'Sirfetch\'d (Ash)', series:'Farfetch\'d → Sirfetch\'d — JN', category:'ash', color:'#A16207', icon:'🗡️',
   player:{name:'Farfetch\'d',slug:'farfetchd',type:'Fighting',tc:'#A16207'},
   evolved:{name:'Sirfetch\'d',slug:'sirfetchd',type:'Fighting',tc:'#78350F'},
   evolved2:null,
   wild:{name:'Hawlucha',slug:'hawlucha',type:'Fighting',tc:'#16A34A'}},
  {id:'ash-totodile', label:'Feraligatr (Ash)', series:'Totodile → Feraligatr — Johto', category:'ash', color:'#0EA5E9', icon:'🐊',
   player:{name:'Totodile',slug:'totodile',type:'Water',tc:'#0EA5E9'},
   evolved:{name:'Croconaw',slug:'croconaw',type:'Water',tc:'#0284C7'},
   evolved2:{name:'Feraligatr',slug:'feraligatr',type:'Water',tc:'#0369A1'},
   wild:{name:'Wooper',slug:'wooper',type:'Water',tc:'#38BDF8'}},
  {id:'ash-cyndaquil', label:'Typhlosion (Ash)', series:'Cyndaquil → Typhlosion — Johto', category:'ash', color:'#F97316', icon:'🔥',
   player:{name:'Cyndaquil',slug:'cyndaquil',type:'Fire',tc:'#F97316'},
   evolved:{name:'Quilava',slug:'quilava',type:'Fire',tc:'#EA580C'},
   evolved2:{name:'Typhlosion',slug:'typhlosion',type:'Fire',tc:'#C2410C'},
   wild:{name:'Vulpix',slug:'vulpix',type:'Fire',tc:'#F97316'}},
  {id:'ash-torterra', label:'Torterra (Ash)', series:'Turtwig → Torterra — Sinnoh', category:'ash', color:'#22C55E', icon:'🌳',
   player:{name:'Turtwig',slug:'turtwig',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Grotle',slug:'grotle',type:'Grass',tc:'#16A34A'},
   evolved2:{name:'Torterra',slug:'torterra',type:'Grass',tc:'#15803D'},
   wild:{name:'Cherubi',slug:'cherubi',type:'Grass',tc:'#F472B6'}},
  {id:'ash-oshawott', label:'Samurott (Ash)', series:'Oshawott → Samurott — Unova', category:'ash', color:'#38BDF8', icon:'🐚',
   player:{name:'Oshawott',slug:'oshawott',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Dewott',slug:'dewott',type:'Water',tc:'#0EA5E9'},
   evolved2:{name:'Samurott',slug:'samurott',type:'Water',tc:'#0369A1'},
   wild:{name:'Tympole',slug:'tympole',type:'Water',tc:'#38BDF8'}},
  {id:'ash-goodra', label:'Goodra (Ash)', series:'Goomy → Goodra — Kalos', category:'ash', color:'#A855F7', icon:'🐉',
   player:{name:'Goomy',slug:'goomy',type:'Dragon',tc:'#A855F7'},
   evolved:{name:'Sliggoo',slug:'sliggoo',type:'Dragon',tc:'#9333EA'},
   evolved2:{name:'Goodra',slug:'goodra',type:'Dragon',tc:'#7E22CE'},
   wild:{name:'Dedenne',slug:'dedenne',type:'Electric',tc:'#FBBF24'}},
  {id:'ash-decidueye', label:'Decidueye (Ash)', series:'Rowlet → Decidueye — Alola', category:'ash', color:'#84CC16', icon:'🦉',
   player:{name:'Rowlet',slug:'rowlet',type:'Grass',tc:'#84CC16'},
   evolved:{name:'Dartrix',slug:'dartrix',type:'Grass',tc:'#65A30D'},
   evolved2:{name:'Decidueye',slug:'decidueye',type:'Grass',tc:'#4D7C0F'},
   wild:{name:'Pikipek',slug:'pikipek',type:'Normal',tc:'#A3A3A3'}},

  // ══════════════════════════════════════════════════════════════════
  // 💎 KEREN (8) — pseudo-legendary 3-stage chains
  // ══════════════════════════════════════════════════════════════════
  {id:'dratini-line', label:'Dratini', series:'Dragon of Legends', category:'cool', color:'#6366F1', icon:'🐉',
   player:{name:'Dratini',slug:'dratini',type:'Dragon',tc:'#6366F1'},
   evolved:{name:'Dragonair',slug:'dragonair',type:'Dragon',tc:'#6366F1'},
   evolved2:{name:'Dragonite',slug:'dragonite',type:'Dragon',tc:'#4338CA'},
   wild:{name:'Gyarados',slug:'gyarados',type:'Water',tc:'#38BDF8'}},
  {id:'larvitar-line', label:'Larvitar', series:'Pseudo-Legend Rock', category:'cool', color:'#166534', icon:'🪨',
   player:{name:'Larvitar',slug:'larvitar',type:'Rock',tc:'#166534'},
   evolved:{name:'Pupitar',slug:'pupitar',type:'Rock',tc:'#166534'},
   evolved2:{name:'Tyranitar',slug:'tyranitar',type:'Rock',tc:'#14532D'},
   mega:_mega('Mega Tyranitar','tyranitar','Rock','#052E16','mega','rainbow','⭐ MEGA'),
   wild:{name:'Aggron',slug:'aggron',type:'Steel',tc:'#94A3B8'}},
  {id:'beldum-line', label:'Beldum', series:'Steel Champion', category:'cool', color:'#94A3B8', icon:'🔩',
   player:{name:'Beldum',slug:'beldum',type:'Steel',tc:'#94A3B8'},
   evolved:{name:'Metang',slug:'metang',type:'Steel',tc:'#94A3B8'},
   evolved2:{name:'Metagross',slug:'metagross',type:'Steel',tc:'#64748B'},
   mega:_mega('Mega Metagross','metagross','Steel','#475569','mega','blue','⭐ MEGA'),
   wild:{name:'Scizor',slug:'scizor',type:'Steel',tc:'#94A3B8'}},
  {id:'bagon-line', label:'Bagon', series:'Dragon Ace Hoenn', category:'cool', color:'#0E7490', icon:'🐲',
   player:{name:'Bagon',slug:'bagon',type:'Dragon',tc:'#0E7490'},
   evolved:{name:'Shelgon',slug:'shelgon',type:'Dragon',tc:'#0E7490'},
   evolved2:{name:'Salamence',slug:'salamence',type:'Dragon',tc:'#155E75'},
   mega:_mega('Mega Salamence','salamence','Dragon','#164E63','mega','rainbow','⭐ MEGA'),
   wild:{name:'Flygon',slug:'flygon',type:'Dragon',tc:'#6366F1'}},
  {id:'gible-line', label:'Gible', series:'Land Shark Sinnoh', category:'cool', color:'#1E40AF', icon:'🦈',
   player:{name:'Gible',slug:'gible',type:'Dragon',tc:'#1E40AF'},
   evolved:{name:'Gabite',slug:'gabite',type:'Dragon',tc:'#1E40AF'},
   evolved2:{name:'Garchomp',slug:'garchomp',type:'Dragon',tc:'#1E3A8A'},
   mega:_mega('Mega Garchomp','garchomp','Dragon','#172554','mega','rainbow','⭐ MEGA'),
   wild:{name:'Hydreigon',slug:'hydreigon',type:'Dragon',tc:'#6366F1'}},
  {id:'deino-line', label:'Deino', series:'Dark Dragon Unova', category:'cool', color:'#4338CA', icon:'🐲',
   player:{name:'Deino',slug:'deino',type:'Dark',tc:'#4338CA'},
   evolved:{name:'Zweilous',slug:'zweilous',type:'Dark',tc:'#3730A3'},
   evolved2:{name:'Hydreigon',slug:'hydreigon',type:'Dark',tc:'#312E81'},
   wild:{name:'Druddigon',slug:'druddigon',type:'Dragon',tc:'#DC2626'}},
  {id:'jangmo-o-line', label:'Jangmo-o', series:'Scale Dragon Alola', category:'cool', color:'#B45309', icon:'🐉',
   player:{name:'Jangmo-o',slug:'jangmo-o',type:'Dragon',tc:'#B45309'},
   evolved:{name:'Hakamo-o',slug:'hakamo-o',type:'Dragon',tc:'#92400E'},
   evolved2:{name:'Kommo-o',slug:'kommo-o',type:'Dragon',tc:'#78350F'},
   wild:{name:'Turtonator',slug:'turtonator',type:'Fire',tc:'#DC2626'}},
  {id:'dreepy-line', label:'Dreepy', series:'Phantom Dragon Galar', category:'cool', color:'#6D28D9', icon:'👻',
   player:{name:'Dreepy',slug:'dreepy',type:'Dragon',tc:'#6D28D9'},
   evolved:{name:'Drakloak',slug:'drakloak',type:'Dragon',tc:'#5B21B6'},
   evolved2:{name:'Dragapult',slug:'dragapult',type:'Dragon',tc:'#4C1D95'},
   wild:{name:'Gengar',slug:'gengar',type:'Ghost',tc:'#7C3AED'}},
]

// Get currently selected family (persisted). Returns null if "random" or unset.
function getG13Family() {
  try {
    const id = localStorage.getItem('g13_lastFamily')
    if (!id || id === 'random') return null
    const fam = G13_FAMILIES.find(f => f.id === id)
    if (fam) return fam
  } catch(_) {}
  return null
}

let g13LastChainId = -1
// Hotfix #120-Y (2026-05-02): pick wild Pokemon INDEPENDENT of family selection.
// Was: each family had hardcoded `wild` (e.g. Squirtle family always vs Krabby).
// Now: wild comes from current city's pack if available, else random tier-appropriate.
// This decouples player swap from wild — user can change family without wild changing.
function _pickG13Wild(lv, fallbackFamWild) {
  try {
    if (state && state.selectedRegion && typeof CITY_PACK !== 'undefined') {
      const region = CITY_PACK[state.selectedRegion]
      if (region && region.cities) {
        // If specific city selected use only its pack; else pool across whole region for thematic variety
        let cities = region.cities
        if (state.selectedCity) {
          const c = cities.find(c => c.slug === state.selectedCity)
          if (c) cities = [c]
        }
        const pool = []
        for (const city of cities) {
          if (city.pack && Array.isArray(city.pack)) pool.push(...city.pack)
        }
        if (pool.length) {
          const cp = pool[Math.floor(Math.random() * pool.length)]
          const dbEntry = (typeof POKEMON_DB !== 'undefined') ? POKEMON_DB.find(p => p.id === cp.id) : null
          if (dbEntry) {
            const t = dbEntry.type ? dbEntry.type.charAt(0).toUpperCase() + dbEntry.type.slice(1) : 'Normal'
            return { name: dbEntry.name, slug: dbEntry.slug, type: t, tc: '#A3A3A3' }
          }
        }
      }
    }
    // Fallback: random gen-1-4 Pokemon at appropriate tier
    if (typeof POKEMON_DB !== 'undefined') {
      const tier = lv <= 4 ? 1 : lv <= 16 ? 2 : 3
      const candidates = POKEMON_DB.filter(p => (p.tier || 1) === tier && p.gen <= 4)
      if (candidates.length) {
        const pick = candidates[Math.floor(Math.random() * candidates.length)]
        const t = pick.type ? pick.type.charAt(0).toUpperCase() + pick.type.slice(1) : 'Normal'
        return { name: pick.name, slug: pick.slug, type: t, tc: '#A3A3A3' }
      }
    }
  } catch(_) {}
  // Final fallback to family's hardcoded wild
  return fallbackFamWild || {name:'Pidgey', slug:'pidgey', type:'Normal', tc:'#A3A3A3'}
}
function g13PickChain(lv) {
  // Task #67 (2026-04-25): rebalanced for 3-stage Mega Evolution at high levels
  // 1-4 easy (1 evo) | 5-9 medium (1 evo) | 10-16 hard (2 evos) | 17-25 2stage (2 evos)
  // 26-35 epic (2 evos harder) | 36-45 3stage (3 evos WITH MEGA) | 46-55 legendary (3 evos hardest)
  const tier = lv <= 4 ? 'easy'
             : lv <= 9 ? 'medium'
             : lv <= 16 ? 'hard'
             : lv <= 25 ? '2stage'
             : lv <= 35 ? 'epic'
             : lv <= 45 ? '3stage'
             : 'legendary'

  // If user picked a specific family, use it — but use difficulty metadata from tier
  const fam = getG13Family()
  if (fam) {
    // Build a synthetic chain from family + tier's difficulty settings
    const tierProto = G13_CHAINS.find(c => c.diff === tier) || G13_CHAINS[0]
    let stages = (G13_DIFF[tier] || {}).stages || 2
    if (state.selectedRegion && typeof getCityProgress === 'function') {
      const _cp = getCityProgress(13, state.selectedRegion)
      const _total = (typeof CITY_PACK !== 'undefined' && CITY_PACK[state.selectedRegion])
        ? CITY_PACK[state.selectedRegion].cities.length
        : (typeof REGION_META !== 'undefined' && REGION_META[state.selectedRegion] ? REGION_META[state.selectedRegion].totalCities : 10)
      const _progress = _total > 0 ? _cp.completed.length / _total : 0
      if (_progress >= 0.5) {
        if (fam.mega) stages = Math.max(stages, 3)
        else if (fam.evolved2) stages = Math.max(stages, 2)
      }
    }
    let megaForm = null
    if (stages >= 3) {
      // If family has canonical Mega/Gmax/Ash-form, use it; otherwise synthesize MAX FORM
      megaForm = fam.mega || synthMaxBoostForm(fam.evolved2 || fam.evolved || fam.player)
    }
    return {
      id: 'fam_' + fam.id,
      icon: fam.icon,
      diff: tier,
      maxNum: tierProto.maxNum,
      ops: tierProto.ops,
      player: fam.player,
      evolved: stages >= 1 ? fam.evolved : null,
      evolved2: stages >= 2 ? fam.evolved2 : null,
      mega: megaForm,
      wild: _pickG13Wild(lv, fam.wild),
    }
  }

  // Random / default — existing behavior
  let pool = G13_CHAINS.filter(c => c.diff === tier)
  if (!pool.length) pool = [...G13_CHAINS]
  // Prevent immediate repeat — filter out last chain if pool is large enough
  const fresh = pool.filter(c => c.id !== g13LastChainId)
  const pick = (fresh.length ? fresh : pool)[Math.floor(Math.random() * (fresh.length || pool.length))]
  g13LastChainId = pick.id
  return pick
}

// G13 family selector UI — opens from header 🎒 button
// Task #67 (2026-04-25): expanded to 44 chains across 4 categories with tab filter
let g13FamActiveTab = 'ash'  // default Ash (most kid-recognized)
function openG13FamilySelector() {
  const grid = document.getElementById('g13-fam-grid')
  const tabsEl = document.getElementById('g13-fam-tabs')
  if (!grid) return
  const currentId = (function(){ try { return localStorage.getItem('g13_lastFamily') || 'ash-pikachu' } catch(_) { return 'ash-pikachu' } })()
  // Task #95 (2026-04-26): use pokeSpriteAlt2 (correct format with ID prefix + underscore slug)
  // Was returning broken path 'pokemondb_hd_alt2/${slug}.webp' (missing ID + dash) → 63 broken
  // images → onerror cascade to remote → connection pool blocked → modal freeze (same root
  // cause pattern as Task #64 party picker bug)
  const pokeImg = (slug) => (typeof pokeSpriteAlt2 === 'function' && pokeSpriteAlt2(slug)) || `assets/Pokemon/others/pokeball.svg`

  // Determine initial tab from currentId — only on fresh open, not tab-click re-render
  const _overlayVis = document.getElementById('g13-fam-overlay').style.display === 'block'
  if (!_overlayVis) {
    if (currentId === 'random') g13FamActiveTab = 'random'
    else {
      const fam = G13_FAMILIES.find(f => f.id === currentId)
      if (fam) g13FamActiveTab = fam.category
    }
  }

  const cardHtml = (fam) => {
    const selCls = fam.id === currentId ? ' g13-fam-selected' : ''
    const catBadge = fam.category === 'popular' ? '⭐ POPULER' : fam.category === 'ash' ? '🎒 ASH' : fam.category === 'cool' ? '💎 KEREN' : '🎲 ACAK'
    const catColor = fam.category === 'popular' ? '#fbbf24' : fam.category === 'ash' ? '#ef4444' : fam.category === 'cool' ? '#c084fc' : '#38bdf8'
    const _thumbErr = (slug) => `this.onerror=null;this.src='assets/Pokemon/others/pokeball.svg'`
    const _thumb = (slug, name) => `<img src="${pokeImg(slug)}" alt="${name}" style="width:38px;height:38px;background:rgba(0,0,0,0.25);border-radius:8px;padding:2px;object-fit:contain;" onerror="${_thumbErr(slug)}">`
    const thumbsHtml = fam.id === 'random'
      ? '<div style="color:rgba(255,255,255,0.6);font-size:13px;font-weight:700;padding:8px 0;">🎲 Acak dari semua evolusi yang ada — tiap level beda Pokémon!</div>'
      : `<div style="display:flex;gap:6px;align-items:center;justify-content:flex-start;flex-wrap:wrap;margin-top:8px;">
          ${_thumb(fam.player.slug, fam.player.name)}
          <span style="color:rgba(255,255,255,0.5);font-size:11px;">→</span>
          ${_thumb(fam.evolved.slug, fam.evolved.name)}
          ${fam.evolved2 ? `<span style="color:rgba(255,255,255,0.5);font-size:11px;">→</span>
          ${_thumb(fam.evolved2.slug, fam.evolved2.name)}` : ''}
          ${fam.mega ? `<span style="color:rgba(255,255,255,0.5);font-size:11px;">→</span>
          <div style="position:relative;display:inline-block;">${_thumb(fam.mega.slug, fam.mega.name)}<span style="position:absolute;bottom:-2px;right:-2px;font-size:7px;background:linear-gradient(135deg,#FBBF24,#F59E0B);color:#000;border-radius:3px;padding:0 3px;font-weight:900;line-height:1.4;">M</span></div>` : ''}
        </div>`
    const megaIndicator = fam.mega ? '<span class="g13-fam-mega-indicator">⭐ MEGA</span>' : ''
    return `<div class="g13-fam-card${selCls}" data-fam="${fam.id}" style="position:relative;background:linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02));border:2px solid ${fam.id === currentId ? '#fbbf24' : 'rgba(255,255,255,0.2)'};border-radius:14px;padding:12px;cursor:pointer;transition:transform 0.15s,border-color 0.15s;color:#fff;border-left:5px solid ${fam.color};${fam.id === currentId ? 'box-shadow:0 0 22px rgba(251,191,36,0.5);' : ''}">
      ${megaIndicator}
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px;padding-right:${fam.mega ? '70px' : '0'};">
        <div style="font-size:15px;font-weight:900;">${fam.icon} ${fam.label}</div>
        ${fam.mega ? '' : `<span style="font-size:9px;font-weight:900;color:${catColor};background:${catColor}22;border:1px solid ${catColor}55;padding:2px 6px;border-radius:8px;letter-spacing:0.5px;">${catBadge}</span>`}
      </div>
      <div style="font-size:11px;color:rgba(255,255,255,0.6);margin-bottom:2px;">${fam.series}</div>
      ${thumbsHtml}
    </div>`
  }

  // Render category tabs
  const randomFam = {id:'random', label:'Acak / Kejutan', series:'Pokémon beda tiap level!', category:'random', color:'#38bdf8', icon:'🎲'}
  const tabSpec = [
    {id:'ash',     label:'🎒 ASH',     count:G13_FAMILIES.filter(f=>f.category==='ash').length},
    {id:'popular', label:'⭐ POPULER', count:G13_FAMILIES.filter(f=>f.category==='popular').length},
    {id:'cool',    label:'💎 KEREN',   count:G13_FAMILIES.filter(f=>f.category==='cool').length},
    {id:'random',  label:'🎲 ACAK',    count:1},
  ]
  if (tabsEl) {
    tabsEl.innerHTML = tabSpec.map(t =>
      `<button class="g13-fam-tab tab-${t.id}${t.id===g13FamActiveTab?' active':''}" data-tab="${t.id}">${t.label} (${t.count})</button>`
    ).join('')
    tabsEl.querySelectorAll('.g13-fam-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        g13FamActiveTab = btn.getAttribute('data-tab')
        try { playClick && playClick() } catch(_) {}
        openG13FamilySelector()  // re-render with new tab
      })
    })
  }

  // Filter families by active tab
  const filteredFams = g13FamActiveTab === 'random'
    ? [randomFam]
    : G13_FAMILIES.filter(f => f.category === g13FamActiveTab)
  grid.innerHTML = filteredFams.map(cardHtml).join('')

  grid.querySelectorAll('.g13-fam-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-fam')
      try { localStorage.setItem('g13_lastFamily', id) } catch(_) {}
      grid.querySelectorAll('.g13-fam-card').forEach(c => { c.style.borderColor = 'rgba(255,255,255,0.2)'; c.style.boxShadow = 'none' })
      card.style.borderColor = '#fbbf24'
      card.style.boxShadow = '0 0 24px rgba(251,191,36,0.5)'
      // Auto-close + restart level with new family
      setTimeout(() => {
        document.getElementById('g13-fam-overlay').style.display = 'none'
        try { initGame13() } catch(_) {}
      }, 300)
    })
  })
  document.getElementById('g13-fam-overlay').style.display = 'block'
}
window.openG13FamilySelector = openG13FamilySelector

let _g13FamOpenTimeout = null
function initGame13() {
  if (g13ResultTimeout) { clearTimeout(g13ResultTimeout); g13ResultTimeout = null }
  if (_g13FamOpenTimeout) { clearTimeout(_g13FamOpenTimeout); _g13FamOpenTimeout = null }
  hideGameResult()
  // Auto-open family selector on first visit (no family saved yet)
  try {
    const saved = localStorage.getItem('g13_lastFamily')
    if (!saved) {
      _g13FamOpenTimeout = setTimeout(() => { _g13FamOpenTimeout = null; try { openG13FamilySelector() } catch(_){} }, 400)
    }
  } catch(_) {}
  const dbg = document.getElementById('g13-debug-err')
  if (dbg) dbg.style.display = 'none'
  // Only init PixiJS once — re-creating the WebGL context on every family
  // selection causes "WebGL context was lost" which freezes the browser tab.
  if (!PixiManager.get('g13-pixi-canvas')) {
    try { if (typeof PixiManager !== 'undefined') PixiManager.destroyAll() } catch(_){}
    loadPixiJS(function(){ PixiManager.init('g13-pixi-canvas').catch(()=>{}) })
  }
  // Hotfix #110/#111: reset sprite element state + flush cascade queue
  // + clear stuck CSS. Removed non-existent g13-pspr-back ID.
  ;['g13-pspr', 'g13-wspr'].forEach(id => {
    const el = document.getElementById(id)
    if (!el) return
    if (typeof resetSpriteEl === 'function') resetSpriteEl(el)
    if (typeof _resetSprElCss === 'function') _resetSprElCss(el)
  })
  if (typeof flushSpriteQueue === 'function') flushSpriteQueue()
  const _g13Field = document.getElementById('g13-field')
  if (_g13Field) {
    _g13Field.style.display = ''
    if (!_g13Field.style.backgroundImage) {
      _g13Field.style.background = 'linear-gradient(180deg,#5C94FC 0%,#3B82F6 60%,#166534 100%)'
    }
  }
  try {
    _initGame13Impl()
  } catch(e) {
    console.error('[G13] crash:', e)
    if (dbg) { dbg.textContent = '⚠️ ' + e.message; dbg.style.display = 'block' }
  }
}
window.initGame13 = initGame13

function _initGame13Impl() {
  // Task #84: defensive resets — match startGameWithLevel state init
  state._showingResult = false
  state._showingGameResult = false
  if (!Array.isArray(state.gameStars)) state.gameStars = [0, 0]
  if (typeof state.currentPlayer !== 'number') state.currentPlayer = 0
  battleBgmPlay()
  // Task #66: load city background if selected
  loadCityBackground(document.getElementById('g13-field'))
  const lv = Math.max(1, Math.min(55, state.selectedLevelNum || 1))
  const _FALLBACK = {id:0,icon:'🔥',diff:'easy',maxNum:10,ops:['+'],
    player:{name:'Charmander',slug:'charmander',type:'Fire',tc:'#F97316'},
    evolved:{name:'Charmeleon',slug:'charmeleon',type:'Fire',tc:'#F97316'},
    wild:{name:'Charizard',slug:'charizard',type:'Fire',tc:'#F97316'}}
  let chain
  try { chain = g13PickChain(lv) } catch(e) {}
  if (!chain) chain = _FALLBACK
  let cfg
  try { cfg = G13_DIFF[chain.diff] } catch(e) {}
  if (!cfg) cfg = {playerHp:5, wildHp:8, attacksToEvo:4, damage:1, wildDamage:1}
  if (chain.evolved2 || chain.mega) cfg = G13_DIFF['3stage']

  g13State = {
    chain, lv, cfg,
    playerHp: cfg.playerHp, playerMaxHp: cfg.playerHp,
    wildHp: cfg.wildHp, wildMaxHp: cfg.wildHp,
    evoPoints: 0, evoNeeded: cfg.attacksToEvo,
    evolved: false, evolved2: false, megaForm: false, locked: false,
    attackIdx: 0,
    phase: 'player_attack',
    correctThisExchange: 0,
    currentAnswer: 0,
    stars: 0,
  }

  // Set header
  const lvEl = document.getElementById('g13-level'); if(lvEl) lvEl.textContent = `Lv.${lv}`
  const stEl = document.getElementById('g13-stars'); if(stEl) stEl.textContent = '⭐ 0'
  const bdg = document.getElementById('g13-chain-badge')
  if (bdg) {
    let _bdgTxt = `${chain.icon} ${chain.player.name}→${chain.evolved.name}`
    if (chain.evolved2) _bdgTxt += `→${chain.evolved2.name}`
    if (chain.mega) _bdgTxt += `→${chain.mega.name}`
    bdg.textContent = _bdgTxt
  }

  // Ensure overlays hidden, qpanel fully visible
  const evoOv = document.getElementById('g13-evo-overlay'); if(evoOv) evoOv.style.display = 'none'
  hideGameResult()
  // Reset sprite state from previous level (defeat/hit/atk animations)
  const pspr0 = document.getElementById('g13-pspr'); if (pspr0) { pspr0.classList.remove('spr-defeat','spr-hit','spr-flash','spr-atk','wild-die','wild-enter'); if (typeof clearMegaOverlay === 'function') clearMegaOverlay(pspr0) }
  const wspr0 = document.getElementById('g13-wspr'); if (wspr0) wspr0.classList.remove('spr-defeat','spr-hit','spr-flash','spr-atk','wild-die','wild-enter')
  const qp = document.getElementById('g13-qpanel')
  if (qp) { qp.style.opacity = '1'; qp.style.pointerEvents = ''; qp.style.display = 'flex' }
  const evoBtn = document.getElementById('g13-evo-btn')
  if (evoBtn) evoBtn.style.display = 'none'
  const choicesEl2 = document.getElementById('g13-choices')
  if (choicesEl2) choicesEl2.style.display = ''
  const mathEl2 = document.getElementById('g13-math')
  if (mathEl2) mathEl2.style.color = ''

  // HD CDN first for consistent canvas sizing + predictable orientation.
  // SVG variant is secondary (visual variety for the 751 covered slugs).
  // Local low-res PNG is dropped from this cascade — it produced inconsistent
  // sizes and wrong-facing artwork (2026-04-21 user report).
  // Task #71: local-first sprite per Lesson L16 — was CDN-primary causing wrong facing
  const pokeUrl = slug => pokeSpriteAlt2(slug) || pokeSpriteCDN(slug)
  const pokeUrlRemote = slug => pokeSpriteCDN(slug)
  const pokeFallbackUrl = slug => { const id = POKE_IDS[slug]; return id ? `assets/Pokemon/others/pokeball.svg` : null }
  const sprFbStyle = 'font-size:min(18vw,11vh);line-height:1;display:flex;align-items:center;justify-content:center;width:clamp(140px, min(34vw, 28vh), 280px);height:clamp(140px, min(34vw, 28vh), 280px);position:relative;z-index:2;'

  // Hotfix #117: use shared cascade (HD WebP 630x630 first) instead of custom
  // tryLoad chain. resetSpriteEl() clears stale onerror closures (#110 pattern).
  function loadSpr(imgId, wrapId, slug, emoji) {
    const wrap = document.getElementById(wrapId)
    if (!wrap) return
    const img = document.getElementById(imgId)
    if (!img) return
    // Reset animation classes and inline styles from previous battle
    img.className = img.className.replace(/\bspr-\S+/g, '').trim()
    img.style.opacity = '1'
    img.style.animation = ''
    img.style.transform = ''
    img.style.display = 'none'  // hide while loading

    // Always show emoji fallback immediately — swap to img only after confirmed load
    const old = wrap.querySelector('.g13-spr-fb'); if (old) old.remove()
    const fb = document.createElement('div')
    fb.className = 'g13-spr-fb'
    fb.style.cssText = sprFbStyle
    fb.textContent = emoji
    wrap.insertBefore(fb, img)

    if (typeof attachSpriteCascade === 'function' && typeof buildPokeSources === 'function') {
      if (typeof resetSpriteEl === 'function') resetSpriteEl(img)
      const _srcs = buildPokeSources(slug, null)
      attachSpriteCascade(img, _srcs, emoji, function() {
        const existFb = wrap.querySelector('.g13-spr-fb'); if (existFb) existFb.remove()
        img.style.display = ''
      })
    } else {
      // Legacy fallback: try HD first, then CDN, then PokeAPI
      const urls = [pokeUrl(slug), pokeUrlRemote(slug), pokeFallbackUrl(slug)].filter(Boolean)
      function tryLoad(idx) {
        if (idx >= urls.length) return // all failed, keep emoji
        const test = new Image()
        test.onload = () => {
          const existFb = wrap.querySelector('.g13-spr-fb'); if (existFb) existFb.remove()
          img.src = urls[idx]
          img.style.display = ''
        }
        test.onerror = () => tryLoad(idx + 1)
        test.src = urls[idx]
      }
      tryLoad(0)
    }
  }

  loadSpr('g13-wspr', 'g13-wspr-wrap', chain.wild.slug, chain.icon || '❓')
  loadSpr('g13-pspr', 'g13-pspr-wrap', chain.player.slug, chain.icon || '❓')
  // Apply facing + final scale (tier × visual) to BOTH sprites
  const wImg = document.getElementById('g13-wspr')
  const pImg = document.getElementById('g13-pspr')
  if (wImg) {
    applyPokeFlip(wImg, chain.wild.slug, 'enemy')
    const wScale = pokeFinalScale(chain.wild.slug)
    if (wScale !== 1.0) wImg.style.width = wImg.style.height = `calc(clamp(140px, min(34vw, 28vh), 280px) * ${wScale})`
  }
  if (pImg) {
    applyPokeFlip(pImg, chain.player.slug, 'player')
    const pScale = pokeFinalScale(chain.player.slug)
    if (pScale !== 1.0) pImg.style.width = pImg.style.height = `calc(clamp(140px, min(34vw, 28vh), 280px) * ${pScale})`
  }

  // Wild name/type
  const wnEl = document.getElementById('g13-wname'); if(wnEl) wnEl.textContent = chain.wild.name
  const wlEl = document.getElementById('g13-wlv');   if(wlEl) wlEl.textContent = `Lv${lv + 5}`
  const wtype = document.getElementById('g13-wtype')
  if (wtype) { wtype.textContent = chain.wild.type; wtype.style.background = chain.wild.tc+'55'; wtype.style.color = chain.wild.tc; wtype.style.border = `1px solid ${chain.wild.tc}88` }
  // Weakness sticker — teach kid which type counters this wild
  try { if (typeof renderWeaknessSticker === 'function') {
    renderWeaknessSticker(document.getElementById('g13-wweakness-wrap'), chain.wild.type)
  }} catch(_){}

  // Player name/type
  const pnEl = document.getElementById('g13-pname'); if(pnEl) pnEl.textContent = chain.player.name
  const plEl = document.getElementById('g13-plv');   if(plEl) plEl.textContent = `Lv${lv}`
  const ptype = document.getElementById('g13-ptype')
  if (ptype) { ptype.textContent = chain.player.type; ptype.style.background = chain.player.tc+'55'; ptype.style.color = chain.player.tc; ptype.style.border = `1px solid ${chain.player.tc}88` }

  g13UpdateHpBars()
  g13UpdateEvoBar()
  const cityLbl = document.getElementById('g13-city-label')
  if (cityLbl) {
    const rn = state.selectedRegion || ''
    const cn = state.selectedCity || ''
    cityLbl.textContent = cn ? `📍 ${cn}, ${rn}` : rn ? `📍 ${rn}` : ''
    cityLbl.style.display = (rn || cn) ? '' : 'none'
  }
  // Apply arena background based on wild type
  const field = document.getElementById('g13-field')
  if (field) {
    field.className = field.className.replace(/g13-arena-\S+/g, '').trim()
    field.classList.add('g13-field', `g13-arena-${chain.wild.type}`)
    // Random day/dark, responsive mobile/pc
    const isDark = Math.random() < 0.5
    const isMobile = window.innerWidth <= 768
    const bgKey = isDark
      ? (isMobile ? 'bg-arena-dark-mobile' : 'bg-arena-dark-pc')
      : (isMobile ? 'bg-arena-day-mobile' : 'bg-arena-day-pc')
    field.style.backgroundImage = `url('assets/${bgKey}.webp')`
  }
  g13NextQuestion()
}

function g13UpdateHpBars() {
  const s = g13State
  const wpct = Math.max(0, (s.wildHp / s.wildMaxHp) * 100)
  const ppct = Math.max(0, (s.playerHp / s.playerMaxHp) * 100)
  const wfill = document.getElementById('g13-whpfill')
  const pfill = document.getElementById('g13-phpfill')
  if (wfill) { wfill.style.width = wpct + '%'; wfill.className = 'g13-hp-fill' + (wpct <= 25 ? ' low' : '') }
  if (pfill) { pfill.style.width = ppct + '%'; pfill.className = 'g13-hp-fill' + (ppct <= 25 ? ' low' : '') }
  const wn = document.getElementById('g13-whpnums'); if (wn) wn.textContent = `${s.wildHp}/${s.wildMaxHp}`
  const pn = document.getElementById('g13-phpnums'); if (pn) pn.textContent = `${s.playerHp}/${s.playerMaxHp}`
}

/**
 * How many stars to dock for evolution, measured against what THIS pairing can
 * actually reach — not against the top of the ladder.
 *
 * The old rule docked by absolute stage: mega/stage-3 kept 5, one evolution
 * scored 4, none scored 3. That punished the child for something that was never
 * their choice. A Pokemon with no evolution in its chain, or a level whose
 * `stages` allows only one, can never reach the top, so a flawless run was
 * capped at 3 stars by the roster — the "perfect run still shows 3 stars"
 * report (P6).
 *
 * Reaching everything available costs nothing. Each stage left unclaimed costs
 * one star, floored at -2 so the result can still say "won, but barely".
 * Gate: tools/qa-g13-stars.mjs
 */
function g13EvoPenalty(s) {
  const chain = (s && s.chain) || {}
  const chainStages = (chain.evolved ? 1 : 0) + (chain.evolved2 ? 1 : 0) + (chain.mega ? 1 : 0)
  const levelStages = (s && s.cfg && typeof s.cfg.stages === 'number') ? s.cfg.stages : chainStages
  const reachable = Math.min(chainStages, Math.max(0, levelStages))
  const reached = s && s.megaForm ? 3 : s && s.evolved2 ? 2 : s && s.evolved ? 1 : 0
  return -Math.max(0, Math.min(2, reachable - Math.min(reached, reachable)))
}

function g13UpdateEvoBar() {
  const s = g13State
  const pct = Math.min(100, Math.round((s.evoPoints / s.evoNeeded) * 100))
  const fill = document.getElementById('g13-evofill')
  const pctEl = document.getElementById('g13-evopct')
  if (fill) {
    fill.style.width = pct + '%'
    if (pct >= 100) fill.classList.add('ready'); else fill.classList.remove('ready')
  }
  if (pctEl) pctEl.textContent = pct + '%'
}

function g13GenQuestion() {
  const s = g13State
  // Hotfix #112-H: delegate to shared math-rules per user mandate.
  // G13 has 20 levels max; level proxy from chain stage (mega/evolved2/evolved/base).
  const _diff = state.selectedLevel || 'easy'
  const _lv = state.selectedLevelNum || 1
  // Stage boost adds difficulty progression within a level
  const stageBoost = s.megaForm ? 6 : s.evolved2 ? 4 : s.evolved ? 2 : 0
  const _effectiveLv = Math.min(40, _lv + stageBoost)
  let q
  if (typeof window.makeGameQuestion === 'function') {
    q = window.makeGameQuestion(_effectiveLv, 40, _diff)
  } else {
    // Fallback: simple addition
    const a = Math.floor(Math.random() * 9) + 1, b = Math.floor(Math.random() * 9) + 1
    q = { q: `${a} + ${b} = ?`, ans: a + b, choices: [a+b, a+b+1, a+b-1, a+b+2].sort(()=>Math.random()-0.5) }
  }
  s.currentAnswer = q.ans
  // expr/wrongs format kept for backward compat with g13NextQuestion
  const wrongs = (q.choices || []).filter(c => String(c) !== String(q.ans))
  return { expr: q.q, ans: q.ans, wrongs: wrongs.slice(0, 3), choices: q.choices, op: q.op }
}

function g13NextQuestion() {
  const s = g13State
  try { if (window.VFX && VFX.Poke && s.chain) VFX.Poke.prime([String(s.chain.player.type).toLowerCase(), String(s.chain.wild.type).toLowerCase()]) } catch(_) {}  // pre-decode effect sheets
  if (s.locked || s.phase === 'victory' || s.phase === 'defeat' || s.phase === 'evo_ready') return
  const q = g13GenQuestion()
  s.currentAnswer = q.ans; s.currentOp = q.op; s.currentQ = q.expr
  s.locked = false

  const mathEl = document.getElementById('g13-math')
  if (mathEl) { mathEl.textContent = q.expr; mathEl.classList.remove('pop'); void mathEl.offsetWidth; mathEl.classList.add('pop') }
  const atkLbl = document.getElementById('g13-atk-lbl')
  const _atkForm = s.megaForm ? s.chain.mega : s.evolved2 ? s.chain.evolved2 : s.evolved ? s.chain.evolved : s.chain.player
  if (atkLbl) atkLbl.textContent = s.evolved ? `⚡ ${_atkForm.name} menyerang!` : `Serang dengan ${s.chain.player.name}!`
  g13SetStatus(`Serangan ${s.attackIdx + 1}`, s.evolved ? 'Beri pukulan terakhir!' : 'Hitung untuk menyerang!')

  // Hotfix #112-H: prefer q.choices (already-shuffled) from shared math-rules.
  const choices = q.choices || [q.ans, ...(q.wrongs||[])].sort(() => Math.random() - 0.5)
  const container = document.getElementById('g13-choices')
  if (!container) return
  container.innerHTML = ''
  choices.forEach(val => {
    const btn = document.createElement('button')
    btn.className = 'g13-choice-btn'
    btn.textContent = val
    btn.onclick = () => g13Answer(val, btn)
    container.appendChild(btn)
  })
}

function g13SpawnAttackEffect(type, fromPlayer, fieldId = 'g13-field', fxOpts) {
  const field = document.getElementById(fieldId)
  if (!field) return
  const typeImg = {Fire:'attack-fx-fire.webp',Water:'attack-fx-water.webp',Grass:'attack-fx-grass.webp',Electric:'attack-fx-electric.webp'}
  const typeEmoji = {Rock:'🪨',Ghost:'👻',Psychic:'🌀',Normal:'⭐',Ice:'❄️',Dragon:'💥',Fighting:'👊',Steel:'⚔️',Poison:'☠️',Bug:'🐛',Fairy:'✨',Ground:'💨',Flying:'🌪️'}
  const hasImg = !!typeImg[type]
  const imgSrc = hasImg ? `assets/${typeImg[type]}` : null
  const emoji = typeEmoji[type] || '💥'
  const fieldRect = field.getBoundingClientRect()
  // Hotfix #112-J part 2: derive projectile origin from ACTUAL sprite bbox
  // (was hardcoded 15%/75%). Now responsive to whatever positioning the
  // diagonal layout uses across portrait/landscape. Falls back to fixed %
  // if sprite wraps not present (e.g. g13 single-sprite layout).
  const playerWrap = (fieldId === 'g13b-field') ? document.getElementById('g13b-pspr-wrap') : document.getElementById('g13-pspr-wrap')
  const wildWrap = (fieldId === 'g13b-field') ? document.getElementById('g13b-wspr-wrap') : document.getElementById('g13-wspr-wrap')
  let fromX, fromY, toX, toY
  if (playerWrap && wildWrap && fieldRect.width > 0) {
    const pr = playerWrap.getBoundingClientRect()
    const wr = wildWrap.getBoundingClientRect()
    const playerXPct = ((pr.left + pr.width/2) - fieldRect.left) / fieldRect.width * 100
    const playerYPct = ((pr.top + pr.height/2) - fieldRect.top) / fieldRect.height * 100
    const wildXPct = ((wr.left + wr.width/2) - fieldRect.left) / fieldRect.width * 100
    const wildYPct = ((wr.top + wr.height/2) - fieldRect.top) / fieldRect.height * 100
    fromX = (fromPlayer ? playerXPct : wildXPct).toFixed(1) + '%'
    fromY = (fromPlayer ? playerYPct : wildYPct).toFixed(1) + '%'
    toX   = (fromPlayer ? wildXPct : playerXPct).toFixed(1) + '%'
    toY   = (fromPlayer ? wildYPct : playerYPct).toFixed(1) + '%'
  } else {
    // Fallback (legacy fixed %) — player bottom-left, enemy top-right
    fromX = fromPlayer ? '15%' : '75%'
    fromY = fromPlayer ? '70%' : '15%'
    toX   = fromPlayer ? '75%' : '15%'
    toY   = fromPlayer ? '15%' : '70%'
  }
  // VFX library (assets/vfx) — G13 Evolusi Math + G13B Quick Fire: type-unique wind-up, projectile
  // + trail, impact. Lands when the existing defender hit-flash fires (300 ms; Quick Fire 240 ms).
  try {
    if (window.VFX && VFX.Poke && VFX.Poke.ready() && playerWrap && wildWrap) {
      const _fa = fromPlayer ? playerWrap : wildWrap, _fb = fromPlayer ? wildWrap : playerWrap
      let _vm = 1
      try { if (fxOpts && fxOpts.defType && typeof calcFullMult === 'function') _vm = calcFullMult(type, type, fxOpts.defType) } catch(_){}
      VFX.Poke.windup(type, _fa, { duration: 300 })
      if (VFX.Poke.launch(type, _fa, _fb, { duration: fieldId === 'g13b-field' ? 240 : 300, size: 70, superEff: _vm >= 1.15, big: _vm >= 1.15, arena: field })) return
    }
  } catch(e){ console.warn('[g13SpawnAttackEffect] vfx lib:', e) }
  const proj = document.createElement('div')
  proj.className = 'g13-proj'
  if (hasImg) {
    proj.style.width = '44px'; proj.style.height = '44px'; proj.style.fontSize = '0'
    proj.innerHTML = `<img src="${imgSrc}" style="width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 0 8px rgba(255,255,255,0.8))" alt="">`
  } else { proj.style.cssText += ';width:40px;height:40px;border-radius:50%;font-size:0;background:radial-gradient(circle at 38% 36%,#fff,' + pokeTypeColor((type||'').toLowerCase()) + ' 60%,transparent 72%)' }
  proj.style.setProperty('--from-x', fromX)
  proj.style.setProperty('--from-y', fromY)
  proj.style.setProperty('--to-x',   toX)
  proj.style.setProperty('--to-y',   toY)
  proj.style.left = fromX
  proj.style.top  = fromY
  field.appendChild(proj)
  setTimeout(() => proj.remove(), 600)
  // Trail particles
  for (let i = 0; i < 3; i++) {
    const trail = document.createElement('div')
    trail.className = 'g13-proj-trail'
    if (hasImg) { trail.style.width = '22px'; trail.style.height = '22px'; trail.style.fontSize = '0'; trail.innerHTML = `<img src="${imgSrc}" style="width:100%;height:100%;object-fit:contain;opacity:0.6" alt="">` }
    else { trail.style.cssText += ';width:18px;height:18px;border-radius:50%;font-size:0;background:' + pokeTypeColor((type||'').toLowerCase()) + ';opacity:.6' }
    trail.style.left = `calc(${fromX} + ${(Math.random()-0.5)*20}%)`
    trail.style.top  = `calc(${fromY} + ${(Math.random()-0.5)*20}%)`
    trail.style.animationDelay = `${i*0.08}s`
    field.appendChild(trail)
    setTimeout(() => trail.remove(), 500)
  }
}

// Type-based hit impact FX — spawns particles on the target sprite zone
function g13TypeHitFX(type, onEnemy) {
  const field = document.getElementById('g13-field')
  if (!field) return
  const CFG = {
    Fire:     {emojis:['🔥','✨'], anim:'fxRise',   color:'#FF6B35', count:7},
    Water:    {emojis:['💧','🌊'], anim:'fxRain',   color:'#4FC3F7', count:6},
    Electric: {emojis:['⚡','✨'], anim:'fxZap',    color:'#FFCB05', count:9},
    Grass:    {emojis:['🍃','🌿'], anim:'fxSwirl',  color:'#4CAF50', count:7},
    Dark:     {emojis:['🌑','💢'], anim:'fxShadow', color:'#3a0a5a', count:5},
    Psychic:  {emojis:['🔮','💫'], anim:'fxSpiral', color:'#F95587', count:7},
    Ice:      {emojis:['❄️','💎'], anim:'fxSnow',   color:'#98D8D8', count:7},
    Ghost:    {emojis:['👻','💜'], anim:'fxFloat',  color:'#705898', count:5},
    Flying:   {emojis:['🌪️','💨'], anim:'fxWind',   color:'#A890F0', count:6},
    Dragon:   {emojis:['💫','🐉'], anim:'fxSpin',   color:'#7038F8', count:6},
    Fighting: {emojis:['💥','👊'], anim:'fxBurst',  color:'#C03028', count:7},
    Rock:     {emojis:['🪨','💥'], anim:'fxDrop',   color:'#B8A038', count:5},
    Poison:   {emojis:['☠️','💜'], anim:'fxFloat',  color:'#A040A0', count:5},
    Ground:   {emojis:['💥','🌍'], anim:'fxBurst',  color:'#E0C068', count:6},
    Bug:      {emojis:['✨','🌿'], anim:'fxSwirl',  color:'#A8B820', count:6},
    Steel:    {emojis:['⚔️','✨'], anim:'fxSpark',  color:'#B8B8D0', count:5},
    Normal:   {emojis:['💢','✨'], anim:'fxBurst',  color:'#A8A878', count:5},
    Fairy:    {emojis:['✨','💖'], anim:'fxSwirl',  color:'#EE99AC', count:7},
  }
  const cfg = CFG[type] || CFG.Normal
  // Particle zone: enemy = top-right quarter, player = bottom-left quarter
  const xBase = onEnemy ? 53 : 5
  const yBase = onEnemy ? 5  : 43
  for (let i = 0; i < cfg.count; i++) {
    const p = document.createElement('span')
    const px = xBase + Math.random() * 32
    const py = yBase + Math.random() * 32
    const sz = 18 + Math.random() * 14
    const dur = 0.55 + Math.random() * 0.45
    const del = i * 0.055
    p.style.cssText = `position:absolute;font-size:${sz}px;left:${px}%;top:${py}%;z-index:25;pointer-events:none;animation:${cfg.anim} ${dur}s ${del}s ease-out both;filter:drop-shadow(0 0 6px ${cfg.color});`
    { var _fn=(i%2===0?(window.UISprites&&UISprites.fxName(type)):'sparkle'); var _fs=(_fn&&window.UISprites)?UISprites.path('fx',_fn):null; if(_fs){p.innerHTML='<img src="'+_fs+'" alt="" style="width:1em;height:1em;object-fit:contain;display:block">'}else{p.textContent = cfg.emojis[i % cfg.emojis.length]} }
    field.appendChild(p)
    setTimeout(() => p.remove(), (dur + del) * 1000 + 120)
  }
}

function g13Answer(val, btn) {
  const s = g13State
  if (s.locked || s.phase !== 'player_attack') return
  s.locked = true

  // Hotfix #112-H: support both numeric (math) + string (knowledge) answers.
  const correct = String(val) === String(s.currentAnswer); duniaReportOp('g13', s.currentOp, s.currentQ, correct) // PRD-48
  btn.classList.add(correct ? 'correct' : 'wrong')
  const choicesEl = document.getElementById('g13-choices')
  if (choicesEl) choicesEl.querySelectorAll('.g13-choice-btn').forEach(b => b.disabled = true)

  // Wrap FX/audio in try so an exception never blocks the transition scheduler below.
  // Task #57 — stuck state "enemy disappears but no modal" was traceable to an
  // exception in the sync FX path preventing the setTimeout() from being scheduled.
  try {
    if (correct) {
      playCorrect()
      vibrate(12)
      // Type effectiveness + STAB: scale base cfg.damage by full multiplier
      const _atkType = (s.megaForm ? s.chain.mega : s.evolved2 ? s.chain.evolved2 : s.evolved ? s.chain.evolved : s.chain.player).type
      const _defType = s.chain.wild.type
      const _mult    = (typeof calcFullMult === 'function')
        ? calcFullMult(_atkType, _atkType, _defType)
        : 1
      const _dmg     = Math.max(1, Math.round(s.cfg.damage * _mult))
      s.wildHp = Math.max(0, s.wildHp - _dmg)
      try { if (typeof applyHitFeedback === 'function') {
        applyHitFeedback(document.getElementById('g13-wspr-wrap') || document.getElementById('g13-wspr'), _atkType, _defType, _atkType, _dmg, (s.chain && s.chain.player && s.chain.player.id) || null)
      }} catch(_){}
      s.evoPoints = Math.min(s.evoNeeded, s.evoPoints + 1)
      s.correctThisExchange++
      s.stars++
      const starDisp = document.getElementById('g13-stars'); if(starDisp) starDisp.textContent = `⭐ ${s.stars}`
      const _curForm = s.megaForm ? s.chain.mega : s.evolved2 ? s.chain.evolved2 : s.evolved ? s.chain.evolved : s.chain.player
      const atkType = _curForm.type
      playAttackSound(atkType)
      g13SpawnAttackEffect(atkType, true, 'g13-field', { defType: _defType })
      const playerSlugG13 = _curForm.slug
      showMovePopup(document.getElementById('g13-pspr-wrap'), getPokeMove(playerSlugG13, atkType), pokeTypeColor(atkType))
      // Attacker aura (DOM) — Pixi path reserved for g13b-pixi-canvas
      spawnTypeAura(document.getElementById('g13-pspr-wrap'), atkType)
      const pspr = document.getElementById('g13-pspr')
      if (pspr) { pspr.classList.remove('spr-atk'); void pspr.offsetWidth; pspr.classList.add('spr-atk'); setTimeout(()=>pspr.classList.remove('spr-atk'),350) }
      // Wild hit animation + type hit FX
      const wspr = document.getElementById('g13-wspr')
      setTimeout(() => {
        if (wspr) {
          wspr.classList.remove('spr-hit','spr-flash'); void wspr.offsetWidth
          wspr.classList.add('spr-hit','spr-flash')
          setTimeout(()=>wspr.classList.remove('spr-hit','spr-flash'),450); try { if (window.HitFeel) HitFeel.hit(wspr) } catch(_){}   // PRD-37
        }
        g13TypeHitFX(atkType, true)
      }, 300)
      // Flash
      g13TriggerFlash()
      // Particle burst
      try { spawnParticleBurst(btn.getBoundingClientRect().left + btn.offsetWidth/2, btn.getBoundingClientRect().top) } catch(e) {}
    } else {
      playWrong()
      vibrate(30)
      // Player cringe
      const pspr = document.getElementById('g13-pspr')
      if (pspr) { pspr.classList.remove('spr-hit'); void pspr.offsetWidth; pspr.classList.add('spr-hit'); setTimeout(()=>pspr.classList.remove('spr-hit'),400) }
    }
  } catch(e) { console.error('[G13] FX path crashed:', e) }

  try { g13UpdateHpBars() } catch(e) {}
  try { g13UpdateEvoBar() } catch(e) {}
  s.attackIdx++

  // Task #57 failsafe — if wildHp hit 0, schedule an independent watchdog that
  // force-calls g13Victory if the primary transition below hasn't fired within
  // 1800ms (covers any throw / blocked-event-loop case). g13Victory is idempotent.
  if (s.wildHp <= 0 && s.phase !== 'victory') {
    if (g13ResultTimeout) { clearTimeout(g13ResultTimeout); g13ResultTimeout = null }
    setTimeout(() => {
      if (g13State === s && s.wildHp <= 0 && s.phase !== 'victory' && s.phase !== 'defeat') {
        console.warn('[G13] victory watchdog fired — forcing modal')
        g13Victory()
      }
    }, 1800)
  }

  setTimeout(() => {
    if (s.wildHp <= 0) {
      g13Victory()
      return
    }
    // After 3 attacks, ALWAYS trigger wild counter-attack first — evo check runs after counter
    if (s.attackIdx >= 3) {
      g13WildCounterPhase()
    } else {
      s.locked = false
      g13NextQuestion()
    }
  }, 600)
}

function g13WildCounterPhase() {
  const s = g13State
  if (s.phase === 'wild_counter') return   // guard: prevent double-call race condition
  s.phase = 'wild_counter'                  // set phase immediately
  const attacks = s.cfg?.difficulty === 'hard' ? 2 : 1  // reduced from 3 to keep win rate ~99%
  let done = 0
  const qpanel = document.getElementById('g13-qpanel')
  if (qpanel) { qpanel.style.opacity = '0.3'; qpanel.style.pointerEvents = 'none' }
  g13SetStatus(`${s.chain.wild.name} menyerang!`, '⚔️ Bertahan...')

  function doWildAttack(i) {
    if (i >= attacks) {
      // Done — check evo or continue
      if (qpanel) { qpanel.style.opacity = '1'; qpanel.style.pointerEvents = '' }
      s.attackIdx = 0
      s.correctThisExchange = 0
      if (s.playerHp <= 0) { g13Defeat(); return }
      const canEvo1 = !s.evolved && s.evoPoints >= s.evoNeeded
      const canEvo2 = s.evolved && !s.evolved2 && s.chain.evolved2 && s.evoPoints >= s.evoNeeded
      const canEvo3 = s.evolved2 && !s.megaForm && s.chain.mega && s.evoPoints >= s.evoNeeded
      const canEvoMega = s.evolved && !s.chain.evolved2 && s.chain.mega && !s.megaForm && s.evoPoints >= s.evoNeeded
      if (canEvo1 || canEvo2 || canEvo3 || canEvoMega) {
        s.phase = 'evo_ready'
        setTimeout(() => g13ShowEvoButton(), 300)
      } else {
        s.phase = 'player_attack'
        s.locked = false
        g13NextQuestion()
      }
      return
    }
    setTimeout(() => {
      // Wild attack animation + sound
      const wspr = document.getElementById('g13-wspr')
      const pspr = document.getElementById('g13-pspr')
      playAttackSound(s.chain.wild.type)
      g13SpawnAttackEffect(s.chain.wild.type, false)
      showMovePopup(document.getElementById('g13-wspr-wrap'), getPokeMove(s.chain.wild.slug, s.chain.wild.type), null)
      if (wspr) { wspr.classList.remove('spr-atk'); void wspr.offsetWidth; wspr.classList.add('spr-atk'); setTimeout(()=>wspr.classList.remove('spr-atk'),350) }
      setTimeout(() => {
        if (pspr) {
          pspr.classList.remove('spr-hit','spr-flash'); void pspr.offsetWidth
          pspr.classList.add('spr-hit','spr-flash')
          setTimeout(()=>pspr.classList.remove('spr-hit','spr-flash'),450); try { if (window.HitFeel) HitFeel.hit(pspr) } catch(_){}   // PRD-37
        }
        g13TypeHitFX(s.chain.wild.type, false)
        // Type effectiveness + STAB on wild→player attack
        const _curForm = s.megaForm ? s.chain.mega : s.evolved2 ? s.chain.evolved2 : s.evolved ? s.chain.evolved : s.chain.player
        const _wMult = (typeof calcFullMult === 'function')
          ? calcFullMult(s.chain.wild.type, s.chain.wild.type, _curForm.type)
          : 1
        const _wDmg  = Math.max(1, Math.round(s.cfg.wildDamage * _wMult))
        s.playerHp = Math.max(0, s.playerHp - _wDmg)
        try { if (typeof applyHitFeedback === 'function') {
          applyHitFeedback(document.getElementById('g13-pspr-wrap') || document.getElementById('g13-pspr'), s.chain.wild.type, _curForm.type, s.chain.wild.type, _wDmg, (s.chain && s.chain.wild && s.chain.wild.id) || null)
        }} catch(_){}
        g13UpdateHpBars()
        g13TriggerFlash()
        vibrate(20)
        if (s.playerHp <= 0) {
          g13Defeat()
          return
        }
        done++
        doWildAttack(done)
      }, 350)
    }, 800)
  }
  doWildAttack(0)
}

function g13TriggerFlash() {
  const fl = document.getElementById('g13-flash')
  if (fl) { fl.classList.remove('hit-flash'); void fl.offsetWidth; fl.classList.add('hit-flash') }
}

function g13SetStatus(phaseText, battleText) {
  const pt = document.getElementById('g13-phase-txt'); if (pt) pt.textContent = phaseText
  const bt = document.getElementById('g13-battle-status'); if (bt) bt.textContent = battleText
}

function g13ShowEvoButton() {
  const btn = document.getElementById('g13-evo-btn')
  const choices = document.getElementById('g13-choices')
  const math = document.getElementById('g13-math')
  const atk = document.getElementById('g13-atk-lbl')
  if (btn) btn.style.display = 'block'
  if (choices) choices.style.display = 'none'
  if (math) { math.textContent = '⚡ EVO SIAP!'; math.style.color = '#FBBF24' }
  if (atk) atk.textContent = 'Pokemon kamu siap berevolusi!'
  g13SetStatus('EVO 100%!', '⚡ Tekan tombol untuk berevolusi!')
}

function g13DoEvolution() {
  const btn = document.getElementById('g13-evo-btn')
  const choices = document.getElementById('g13-choices')
  const math = document.getElementById('g13-math')
  if (btn) btn.style.display = 'none'
  if (choices) choices.style.display = ''
  if (math) { math.textContent = '— + — = ?'; math.style.color = '' }
  g13TriggerEvolution()
}

function g13TriggerEvolution() {
  const s = g13State
  const overlay = document.getElementById('g13-evo-overlay')
  if (!overlay) return

  // Play evolution SFX via Web Audio
  g13PlayEvoSfx()

  // Set images
  const baseImg = document.getElementById('g13-evo-base-img')
  const evolvedImg = document.getElementById('g13-evo-evolved-img')
  const nameEl = document.getElementById('g13-evo-newname')
  const textEl = document.getElementById('g13-evo-text')
  if (!baseImg || !evolvedImg || !nameEl || !textEl) { overlay.style.display = 'none'; return }
  // Hotfix #117: use shared cascade (HD WebP 630x630 first) instead of direct src.
  // Legacy pokeUrl kept inside else for safety if helpers not loaded.
  const pokeUrl = slug => (typeof pokeSpriteAlt2 === 'function' && pokeSpriteAlt2(slug)) || `assets/Pokemon/others/pokeball.svg`

  // Determine which evolution stage is triggering
  const isMegaDirect = s.evolved && !s.chain.evolved2 && s.chain.mega && !s.megaForm
  const isStage2 = !isMegaDirect && s.evolved && s.chain.evolved2 && !s.evolved2
  const fromForm = isMegaDirect ? s.chain.evolved : (isStage2 ? s.chain.evolved : s.chain.player)
  const toForm   = isMegaDirect ? s.chain.mega : (isStage2 ? s.chain.evolved2 : s.chain.evolved)
  if (typeof attachSpriteCascade === 'function' && typeof buildPokeSources === 'function') {
    if (typeof resetSpriteEl === 'function') resetSpriteEl(baseImg)
    attachSpriteCascade(baseImg, buildPokeSources(fromForm.slug, null), '✨')
    if (typeof resetSpriteEl === 'function') resetSpriteEl(evolvedImg)
    attachSpriteCascade(evolvedImg, buildPokeSources(toForm.slug, null), '⚡')
  } else {
    baseImg.src = pokeUrl(fromForm.slug)
    evolvedImg.src = pokeUrl(toForm.slug)
  }
  nameEl.textContent = toForm.name
  nameEl.classList.remove('show')
  textEl.textContent = 'Sedang berevolusi...'
  baseImg.style.animation = 'none'
  baseImg.style.opacity = '1'
  evolvedImg.style.opacity = '0'

  // Pixi: spawn evolution particles + rings (GPU-accelerated)
  const _g13Pixi = PixiManager.get('g13-pixi-canvas')
  if (_g13Pixi) {
    pixiEvoParticles(_g13Pixi)
    pixiEvoRings(_g13Pixi)
  } else {
    // DOM fallback: particles
    const particleContainer = document.getElementById('g13-evo-particles')
    if (particleContainer) {
      particleContainer.innerHTML = ''
      const emojis = ['✨','⭐','💫','🌟','🔥','⚡','🌈']
      for (let i = 0; i < 25; i++) {
        const p = document.createElement('div')
        p.className = 'g13-evo-particle'
        p.textContent = emojis[Math.floor(Math.random() * emojis.length)]
        p.style.cssText = `left:${Math.random()*100}%;top:${50+Math.random()*50}%;animation-delay:${(Math.random()*3).toFixed(1)}s;animation-duration:${(2+Math.random()*3).toFixed(1)}s;font-size:${10+Math.floor(Math.random()*16)}px;`
        particleContainer.appendChild(p)
      }
    }
    // DOM fallback: rings
    const bgFlash = overlay.querySelector('.g13-evo-bg-flash')
    if (bgFlash) { const cl = bgFlash.cloneNode(true); bgFlash.replaceWith(cl) }
    overlay.querySelectorAll('.g13-evo-ring').forEach(r => { const cl = r.cloneNode(true); r.replaceWith(cl) })
  }

  overlay.style.display = 'flex'

  // Phase timeline
  // 0-2s: silhouette glowing
  // 2-4s: morph starts — silhouette begins blur
  setTimeout(() => {
    if (baseImg) {
      baseImg.style.animation = 'none'
      baseImg.style.transition = 'all 1.5s ease'
      baseImg.style.filter = 'brightness(0) invert(1) drop-shadow(0 0 60px white) drop-shadow(0 0 100px rgba(251,191,36,0.8))'
      baseImg.style.transform = 'scale(1.2)'
    }
    textEl.textContent = 'Cahaya evolusi!'
  }, 2000)

  // 4s: switch to evolved form
  setTimeout(() => {
    if (baseImg) { baseImg.style.opacity = '0'; baseImg.style.transform = 'scale(0.5)' }
    if (evolvedImg) { evolvedImg.style.transition = 'all 0.8s cubic-bezier(0.34,1.56,0.64,1)'; evolvedImg.style.opacity = '1'; evolvedImg.style.transform = 'scale(1.2)' }
    textEl.textContent = `Selamat! Bertransformasi!`
  }, 4000)

  // 5.5s: evolved form settles, name appears
  setTimeout(() => {
    if (evolvedImg) { evolvedImg.style.transform = 'scale(1)'; evolvedImg.style.filter = 'drop-shadow(0 0 20px rgba(249,115,22,0.8)) drop-shadow(0 0 40px rgba(251,191,36,0.5))' }
    nameEl.classList.add('show')
  }, 5500)

  // 7.5s: close overlay, update battle state
  setTimeout(() => {
    overlay.style.display = 'none'

    const wasMegaDirect = s.evolved && !s.chain.evolved2 && s.chain.mega && !s.megaForm
    const wasStage3 = !wasMegaDirect && s.evolved2 && s.chain.mega && !s.megaForm
    const wasStage2 = !wasStage3 && !wasMegaDirect && s.evolved && s.chain.evolved2 && !s.evolved2
    const nowForm = (wasMegaDirect || wasStage3) ? s.chain.mega : (wasStage2 ? s.chain.evolved2 : s.chain.evolved)

    if (wasMegaDirect || wasStage3) {
      s.megaForm = true
    } else if (wasStage2) {
      s.evolved2 = true
    } else {
      s.evolved = true
    }

    // Reset evo bar for potential next stage
    s.evoPoints = 0
    g13UpdateEvoBar()

    // Update player sprite to new form (Task #67: local-first per Lesson L16)
    const pspr = document.getElementById('g13-pspr')
    if (pspr) {
      // Hotfix #104 (2026-04-28): shared cascade.
      const _eid = POKE_IDS[nowForm.slug] || null
      if (typeof attachSpriteCascade === 'function' && typeof buildPokeSources === 'function') {
        attachSpriteCascade(pspr, buildPokeSources(nowForm.slug, _eid), '⚡')
      } else {
        pspr.src = (typeof pokeSpriteAlt2 === 'function' && pokeSpriteAlt2(nowForm.slug)) || `assets/Pokemon/others/pokeball.svg`
      }
      const megaScale = (wasMegaDirect || wasStage3) ? 1.3 : 1.0
      pspr.style.width = pspr.style.height = `calc(clamp(140px, min(34vw, 28vh), 280px) * ${pokeFinalScale(nowForm.slug) * megaScale})`
      applyPokeFlip(pspr, nowForm.slug, 'player')
      pspr.style.animation = 'none'; void pspr.offsetWidth
      pspr.style.animation = 'g13EnterFlip 0.6s cubic-bezier(0.34,1.56,0.64,1)'
      if ((wasMegaDirect || wasStage3) && nowForm.aura) {
        applyMegaOverlay(pspr, nowForm)
      } else {
        clearMegaOverlay(pspr)
      }
    }
    // Update player info box
    document.getElementById('g13-pname').textContent = nowForm.name
    const ptype = document.getElementById('g13-ptype')
    ptype.textContent = nowForm.type
    ptype.style.background = nowForm.tc + '55'
    ptype.style.color = nowForm.tc
    ptype.style.border = `1px solid ${nowForm.tc}88`

    // Update chain badge
    const bdg = document.getElementById('g13-chain-badge')
    const isFinal = wasMegaDirect || wasStage3 || wasStage2
    if (bdg) bdg.textContent = isFinal ? `⭐ ${nowForm.name} (MAX!)` : `⚡ ${nowForm.name}`

    s.cfg = { ...s.cfg, damage: (wasMegaDirect || wasStage3) ? 4 : wasStage2 ? 3 : 2 }

    document.getElementById('g13-qpanel').style.opacity = '1'
    document.getElementById('g13-qpanel').style.pointerEvents = ''
    s.phase = 'player_attack'
    s.attackIdx = 0
    s.locked = false
    const stageTxt = isFinal ? `${nowForm.name} FINAL FORM!` : `Evolved!`
    g13SetStatus(stageTxt, `${nowForm.name} siap menyerang!`)
    g13NextQuestion()
  }, 7500)
}

let _g13EvoAudio = null
function g13PlayEvoSfx() {
  try {
    if (!isSoundOn()) return
    // Use the Pokémon evolution MP3 if available
    if (!_g13EvoAudio) {
      _g13EvoAudio = new Audio('assets/pokemon-evolve.mp3')
      _g13EvoAudio.volume = 0.75
    }
    _g13EvoAudio.currentTime = 0
    _g13EvoAudio.play().catch(() => _g13PlayEvoSfxFallback())
  } catch(e) { _g13PlayEvoSfxFallback() }
}
function _g13PlayEvoSfxFallback() {
  try {
    if (!isSoundOn()) return
    const ctx = audioCtx
    const freqs = [220, 330, 440, 550, 660, 880, 1100, 1320]
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = freq; osc.type = 'sine'
      const t = ctx.currentTime + i * 0.3
      gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(0.15, t + 0.1)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
      osc.start(t); osc.stop(t + 0.6)
    })
    const chordFreqs = [440, 550, 660, 880]
    chordFreqs.forEach(freq => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = freq; osc.type = 'triangle'
      const t = ctx.currentTime + 2.4
      gain.gain.setValueAtTime(0.12, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5)
      osc.start(t); osc.stop(t + 1.5)
    })
  } catch(e) {}
}

function g13Victory() {
  const s = g13State
  // Idempotency guard — Task #57 watchdog + primary path may both reach this.
  if (s.phase === 'victory' || s.phase === 'defeat') return
  s.phase = 'victory'
  battleBgmStop()
  try { playCorrect() } catch(_){}
  try { vibrate([30, 20, 40]) } catch(_){}

  // Wild defeat animation
  const wspr = document.getElementById('g13-wspr')
  if (wspr) { wspr.classList.add('spr-defeat') }

  let perfStars = 3
  let _g13lv = 1
  try {
    // Stars were docked by EVOLUTION STAGE alone: mega/stage-3 kept 5, one
    // evolution scored 4, none scored 3. That punished the child for a choice
    // that was never theirs — a Pokemon with no evolution in its chain, or a
    // level that only allows one stage, can NEVER reach the top, so a flawless
    // run was capped at 3 stars by the roster. That is the "perfect run still
    // shows 3 stars" report (P6).
    //
    // The penalty is now measured against what THIS pairing could actually
    // reach: how many stages the chain offers, capped by the level's own
    // `stages`. Reaching everything available costs nothing; each stage left on
    // the table costs one star, to a floor of -2 as before.
    const _g13EvoPenalty = g13EvoPenalty(s)
    perfStars = GameScoring.calc({ correct: 1, total: 1, bonus: _g13EvoPenalty })
    _g13lv = s.lv || 1
    // setLevelComplete uses 0-3 star scale for progress persistence; map perfStars (5/4/3 scale) to 3/2/1.
    // Prior code had this mapping INVERTED (>=5→3 but wrote the 0-3 value, causing display to show 3★ for a 5★ run).
    const _g13starsSaved = perfStars >= 5 ? 3 : perfStars >= 4 ? 2 : perfStars >= 3 ? 1 : 0
    setLevelComplete(13, _g13lv, _g13starsSaved)
    // Task #66: mark city as completed if region+city were selected
    if (state.selectedRegion && state.selectedCity && typeof setCityComplete === 'function') {
      setCityComplete(13, state.selectedRegion, state.selectedCity, _g13starsSaved)
    }
    saveStars()
    updateGameStarDisplay()
  } catch(e) { console.error('[G13] victory scoring crashed:', e, e && e.stack) }

  if (g13ResultTimeout) { clearTimeout(g13ResultTimeout); g13ResultTimeout = null }
  g13ResultTimeout = setTimeout(() => {
    g13ResultTimeout = null
    try {
      const finalForm = s.megaForm ? s.chain.mega : s.evolved2 ? s.chain.evolved2 : s.evolved ? s.chain.evolved : null
      const msg = s.megaForm
        ? `${s.chain.player.name}→${s.chain.evolved.name}→${finalForm.name}! Evolusi sempurna!`
        : s.evolved2
          ? `${s.chain.player.name}→${s.chain.evolved.name}→${s.chain.evolved2.name}! Evolusi sempurna!`
          : s.evolved
            ? `${s.chain.player.name} berhasil berevolusi menjadi ${s.chain.evolved.name}!`
            : `${s.chain.wild.name} dikalahkan — tapi ${s.chain.player.name} belum berevolusi!`
      const btns = [
        {label:'Main Lagi 🔄', action:()=>initGame13()},
      ]
      if((_g13lv||1) < 55) btns.unshift({label:'Level Berikutnya ➡️', action:()=>startGameWithLevel((_g13lv||1)+1)})
      btns.push({label:'Kembali ⌂', action:()=>exitGame()})
      showGameResult({ emoji:'🏆', title: finalForm ? `${finalForm.name} Menang!` : 'Kamu Menang!', stars:perfStars, msg, buttons:btns })
    } catch(e) {
      console.error('[G13] victory modal crashed — using minimal fallback:', e, e && e.stack)
      state._showingGameResult = false  // unstrand modal so retry works
      try {
        showGameResult({ emoji:'🏆', title:'Kamu Menang!', stars:perfStars, msg:'', buttons:[
          {label:'Main Lagi 🔄', action:()=>initGame13()},
          {label:'Kembali ⌂', action:()=>exitGame()}
        ]})
      } catch(_){}
    }
  }, 1000)
}

function g13Defeat() {
  const s = g13State
  if (s.phase === 'victory' || s.phase === 'defeat') return
  s.phase = 'defeat'
  battleBgmStop()
  try { playWrong() } catch(_){}
  try { vibrate([50, 30, 50]) } catch(_){}

  const pspr = document.getElementById('g13-pspr')
  if (pspr) { pspr.classList.add('spr-defeat') }

  if (g13ResultTimeout) { clearTimeout(g13ResultTimeout); g13ResultTimeout = null }
  g13ResultTimeout = setTimeout(() => {
    g13ResultTimeout = null
    showGameResult({
      emoji:'💔', title:'Kalah...', stars:0,
      msg: `${s.chain.wild.name} terlalu kuat! Coba lagi!`,
      buttons: [
        {label:'Main Lagi 🔄', action:()=>initGame13()},
        {label:'Kembali ⌂', action:()=>exitGame()}
      ]
    })
  }, 1200)
}

// ============================================================
// GAME 13B — QUICK FIRE ⚡ 60 Detik Serangan Matematika
// ============================================================
const G13B_MOBILE_BG = [
  'Gemini_Generated_Image_13vm6c13vm6c13vm.webp','Gemini_Generated_Image_3e7nl23e7nl23e7n.webp',
  'Gemini_Generated_Image_61gamh61gamh61ga.webp','Gemini_Generated_Image_dsnyj6dsnyj6dsny.webp',
  'Gemini_Generated_Image_klimtxklimtxklim.webp','Gemini_Generated_Image_ozk0zeozk0zeozk0.webp',
  'Gemini_Generated_Image_qor6mpqor6mpqor6.webp','Gemini_Generated_Image_sg3ymdsg3ymdsg3y.webp',
  'Gemini_Generated_Image_vaean7vaean7vaea.webp','Gemini_Generated_Image_w061r3w061r3w061.webp',
  'Gemini_Generated_Image_za0fyeza0fyeza0f.webp',
]
const G13B_PC_BG = [
  'Gemini_Generated_Image_26eyja26eyja26ey.webp','Gemini_Generated_Image_7k4vs27k4vs27k4v.webp',
  'Gemini_Generated_Image_8lzmsu8lzmsu8lzm.webp','Gemini_Generated_Image_dyn2nwdyn2nwdyn2.webp',
  'Gemini_Generated_Image_fr02m6fr02m6fr02.webp','Gemini_Generated_Image_h4dcu9h4dcu9h4dc.webp',
  'Gemini_Generated_Image_hzmzmhhzmzmhhzmz.webp','Gemini_Generated_Image_ocxx4aocxx4aocxx.webp',
  'Gemini_Generated_Image_u0otymu0otymu0ot.webp','Gemini_Generated_Image_wou0m2wou0m2wou0.webp',
  'Gemini_Generated_Image_yoxnghyoxnghyoxn.webp',
]

// Pokéball types for catch animation
const G13B_BALLS = [
  'pokeball','greatball','heavyball','repeatball','healball',
  'safariball','quickball','luxuryball','timerball','netball'
]

// Wild Pokémon pool — built dynamically from all non-legendary POKEMON_DB entries
const G13B_WILDS = POKEMON_DB
  .filter(p => !_LEGENDARY_IDS.has(p.id))
  .map(p => {
    const t = p.type ? p.type.charAt(0).toUpperCase() + p.type.slice(1) : 'Normal'
    return { name: p.name, slug: p.slug, type: t, hp: 1, tier: p.tier || 1 }
  })

// Legendary Pokémon — every 10 kills, needs 3 hits — built from POKEMON_DB legendary IDs
const G13B_LEGENDARIES = (() => {
  const arr = POKEMON_DB
    .filter(p => _LEGENDARY_IDS.has(p.id))
    .map(p => {
      const t = p.type ? p.type.charAt(0).toUpperCase() + p.type.slice(1) : 'Psychic'
      return { name: p.name, slug: p.slug, type: t, icon: '🌟', hp: 3, tier: p.tier || 4 }
    })
  // Fisher-Yates shuffle so order is random every page load
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
})()

let g13bState = {}
let g13bLastWildIdx = -1
let _g13bEvoAudio = null
let _g13bLegAutoAtk = null  // interval ID for legendary periodic attacks

function startQuickFire() {
  const lc = document.getElementById('g13b-level-complete')
  if (lc) lc.style.display = 'none'
  const r = document.getElementById('g13b-result')
  if (r) r.style.display = 'none'
  showScreen('screen-game13b'); try { if (window.DuniaLevel) DuniaLevel.start('g13b', state.selectedLevelNum || 1) } catch (_) {} // PRD-49
  setTimeout(() => initGame13b(), 80)
}
window.startQuickFire = startQuickFire

// Task #72: G13b result "Main Lagi"/"Lanjut" — return to City picker if launched via city,
// else fallback to legacy startQuickFire random behavior.
function g13bResultMainLagi() {
  const r = document.getElementById('g13b-result'); if (r) r.style.display = 'none'
  const lc = document.getElementById('g13b-level-complete'); if (lc) lc.style.display = 'none'
  if (state.selectedRegion && state.selectedCity && typeof openRegionOverlay === 'function') {
    // Cleanup G13b state then return to selector
    if (_g13bLegAutoAtk) { clearInterval(_g13bLegAutoAtk); _g13bLegAutoAtk = null }
    try { battleBgmStop && battleBgmStop() } catch(_) {}
    try { PixiManager.destroy('g13b-pixi-canvas') } catch(_) {}
    showScreen('screen-welcome')
    setTimeout(() => openRegionOverlay('13b'), 60)
  } else {
    startQuickFire()
  }
}
window.g13bResultMainLagi = g13bResultMainLagi

// Hotfix #110 (2026-04-29): explicit exit cleanup for g10 + g13.
// Hotfix #111 (2026-04-29): append showScreen('screen-welcome') so back
// button goes HOME (matches g13b pattern). Removed non-existent IDs from
// reset list. Now also clears stuck inline styles + class flags via
// resetSprElCss helper that wipes display/opacity/animation/transform.
function _resetSprElCss(el) {
  if (!el) return
  el.style.display = ''
  el.style.opacity = '1'
  el.style.animation = ''
  el.style.transform = ''
  el.style.visibility = 'visible'
  el.classList.remove('spr-defeat','spr-hit','spr-flash','spr-atk','wild-die','wild-enter','spr-swap-out','spr-swap-in','wspr-hit')
}
function exitGame10() {
  state.paused = false
  try { document.getElementById('pause-overlay').style.display='none' } catch(_){}
  try { document.getElementById('settings-overlay').style.display='none' } catch(_){}
  battleBgmStop(); stopAllGameSounds(); clearTimers()
  try { if (typeof PixiManager !== 'undefined') PixiManager.destroy('g10-pixi-canvas') } catch(_){}
  ;['g10-pspr', 'g10-espr'].forEach(id => {
    const el = document.getElementById(id)
    if (!el) return
    if (typeof resetSpriteEl === 'function') resetSpriteEl(el)
    _resetSprElCss(el)
  })
  if (typeof flushSpriteQueue === 'function') flushSpriteQueue()
  showScreen('screen-welcome')
}
window.exitGame10 = exitGame10
function exitGame13() {
  state.paused = false
  try { document.getElementById('pause-overlay').style.display='none' } catch(_){}
  try { document.getElementById('settings-overlay').style.display='none' } catch(_){}
  battleBgmStop(); stopAllGameSounds(); clearTimers()
  try { if (typeof PixiManager !== 'undefined') PixiManager.destroy('g13-pixi-canvas') } catch(_){}
  ;['g13-pspr', 'g13-wspr'].forEach(id => {
    const el = document.getElementById(id)
    if (!el) return
    if (typeof resetSpriteEl === 'function') resetSpriteEl(el)
    _resetSprElCss(el)
  })
  if (typeof flushSpriteQueue === 'function') flushSpriteQueue()
  showScreen('screen-welcome')
}
window.exitGame13 = exitGame13

function exitGame13b() {
  if (_g13bLegAutoAtk) { clearInterval(_g13bLegAutoAtk); _g13bLegAutoAtk = null }
  battleBgmStop()
  // Restore battle BGM src for G10/G13
  if(_battleBgmEl) _battleBgmEl.src = 'assets/Pokemon/sound/06 Battle (VS Wild Pokémon)（１９９７－１９９８｜Ｍ１３） - Satoshi Sakai No Masta - SoundLoadMate.com.mp3'
  clearTimers()
  PixiManager.destroy('g13b-pixi-canvas')
  showScreen('screen-welcome')
}
window.exitGame13b = exitGame13b

function initGame13b() {
  // Task #84: defensive resets
  state._showingResult = false
  state._showingGameResult = false
  if (!Array.isArray(state.gameStars)) state.gameStars = [0, 0]
  if (typeof state.currentPlayer !== 'number') state.currentPlayer = 0
  // G13b uses Ending theme instead of battle BGM
  if(!_battleBgmEl) _battleBgmEl = document.getElementById('battle-bgm')
  if(_battleBgmEl) _battleBgmEl.src = 'assets/Pokemon/sound/29 ~Ending~（１９９７－１９９８｜Ｍ２１） - Satoshi Sakai No Masta - SoundLoadMate.com.mp3'
  battleBgmPlay()
  // Hotfix #101-H: free any leftover Pixi context (see initGame10 for rationale)
  try { if (typeof PixiManager !== 'undefined') PixiManager.destroyAll() } catch(_){}
  loadPixiJS(function(){ PixiManager.init('g13b-pixi-canvas').catch(()=>{}) })
  // Hotfix #110/#111: reset sprite element state + flush queue + CSS reset.
  ;['g13b-pspr', 'g13b-wspr', 'g13b-leg-spr', 'g13b-catch-ball'].forEach(id => {
    const el = document.getElementById(id)
    if (!el) return
    if (typeof resetSpriteEl === 'function') resetSpriteEl(el)
    if (typeof _resetSprElCss === 'function') _resetSprElCss(el)
  })
  if (typeof flushSpriteQueue === 'function') flushSpriteQueue()

  // Task #66: prefer city-specific background if selected; else random pool
  const field = document.getElementById('g13b-field')
  const cityBgLoaded = loadCityBackground(field)
  if (!cityBgLoaded) {
    const isMobile = window.innerWidth < 768
    const pool = isMobile ? G13B_MOBILE_BG : G13B_PC_BG
    const folder = isMobile ? 'mobile' : 'pc'
    const pick = pool[Math.floor(Math.random() * pool.length)]
    if (field) {
      field.style.backgroundImage = `url('assets/Pokemon/g13b/background/${folder}/${encodeURIComponent(pick)}')`
      field.style.backgroundSize = 'cover'
      field.style.backgroundPosition = 'center 22%'
    }
  }

  // Clear any leftover legendary auto-attack timer from previous session
  if (_g13bLegAutoAtk) { clearInterval(_g13bLegAutoAtk); _g13bLegAutoAtk = null }
  // Hotfix 2026-04-28: clear transient overlay nodes that leaked across
  // sessions (combo bolts, catch stars, leg sprites) — caused freeze after
  // playing many rounds.
  try {
    const fld = document.getElementById('g13b-field')
    if (fld) {
      fld.querySelectorAll('.g13b-bolt, .g13b-catch-star').forEach(n => n.remove())
    }
    if (typeof _g13bEvoAudio !== 'undefined' && _g13bEvoAudio) {
      try { _g13bEvoAudio.pause(); _g13bEvoAudio.currentTime = 0 } catch(_){}
      _g13bEvoAudio = null
    }
  } catch(_){}
  // Register a one-time cleanup hook so visibilitychange (tab hidden) clears
  // running timers and audio. registerCleanupHook is provided by
  // games/data/freeze-watchdog.js.
  if (typeof window.registerCleanupHook === 'function' && !window.__g13bCleanupRegistered) {
    window.__g13bCleanupRegistered = true
    window.registerCleanupHook(function () {
      try { if (_g13bLegAutoAtk) { clearInterval(_g13bLegAutoAtk); _g13bLegAutoAtk = null } } catch(_){}
      try { if (_g13bEvoAudio) { _g13bEvoAudio.pause(); _g13bEvoAudio = null } } catch(_){}
    })
  }

  // Init state
  g13bState = {
    kills: 0, streak: 0, bestCombo: 0,
    isLegendary: false, wildHp: 1, wildMaxHp: 1,
    playerHp: 10, playerMaxHp: 10,
    locked: false, currentAnswer: 0, phase: 'playing',
    legendaryIdx: Math.floor(Math.random() * G13B_LEGENDARIES.length), currentWild: null,
  }

  // Hide result + legendary banner + badge
  const res = document.getElementById('g13b-result')
  if (res) res.style.display = 'none'
  const legBanner = document.getElementById('g13b-leg-banner')
  if (legBanner) legBanner.classList.add('hide')
  const legBadge = document.getElementById('g13b-leg-badge')
  if (legBadge) legBadge.style.display = 'none'

  // Player sprite + name: use saved selection or default Pikachu
  const pspr = document.getElementById('g13b-pspr')
  if (pspr) {
    const saved = g13bSavedPoke
    const pSlug = saved ? saved.slug : 'pikachu'
    const pId = saved && saved.id ? saved.id : (window.POKE_IDS ? window.POKE_IDS[pSlug] : null)
    // Task #71: local-first sprite. Hotfix 2026-04-28: cascade via shared
    // helper terminates after final fallback (no more onerror loop).
    if (typeof attachSpriteCascade === 'function' && typeof buildPokeSources === 'function') {
      attachSpriteCascade(pspr, buildPokeSources(pSlug, pId), '⚡')
    } else {
      const localSrc = (typeof pokeSpriteAlt2 === 'function') ? pokeSpriteAlt2(pSlug) : null
      pspr.src = localSrc || pokeSpriteOnline(pSlug)
    }
    const pScale = pokeFinalScale(pSlug)
    pspr.style.width = pspr.style.height = pScale === 1.0 ? '' : `calc(clamp(80px, min(20vw, 18vh), 160px) * ${pScale})`
    applyPokeFlip(pspr, pSlug, 'player')
  }
  const pnameEl = document.getElementById('g13b-pname')
  if (pnameEl) pnameEl.textContent = g13bSavedPoke ? g13bSavedPoke.name : 'Pikachu'

  g13bRenderStreak()
  g13bUpdateKills()
  g13bUpdatePlayerHp()
  g13bSpawnWild()
}

function g13bSpawnWild() {
  const s = g13bState
  s.locked = false

  let wild
  if (s.isLegendary) {
    wild = G13B_LEGENDARIES[s.legendaryIdx % G13B_LEGENDARIES.length]
    s.wildHp = wild.hp; s.wildMaxHp = wild.hp
    const lb = document.getElementById('g13b-leg-badge')
    if (lb) lb.style.display = 'block'
  } else {
    // Task #66: prefer city pack pool if selected
    let pool = G13B_WILDS
    try {
      if (state && state.selectedRegion && state.selectedCity && typeof CITY_PACK !== 'undefined') {
        const region = CITY_PACK[state.selectedRegion]
        const city = region && region.cities && region.cities.find(c => c.slug === state.selectedCity)
        if (city && city.pack && city.pack.length >= 2) {
          // Map city pack to G13B_WILDS shape (id+slug+type+tier)
          const cityPool = []
          for (const cp of city.pack) {
            const dbEntry = POKEMON_DB.find(p => p.id === cp.id)
            if (dbEntry) {
              const t = dbEntry.type ? dbEntry.type.charAt(0).toUpperCase() + dbEntry.type.slice(1) : 'Normal'
              cityPool.push({ name: dbEntry.name, slug: dbEntry.slug, type: t, hp: 1, tier: dbEntry.tier || 1 })
            }
          }
          if (cityPool.length >= 2) pool = cityPool
        }
      }
    } catch(_) {}
    // Avoid immediate repeat
    let idx
    do { idx = Math.floor(Math.random() * pool.length) } while (idx === g13bLastWildIdx && pool.length > 1)
    g13bLastWildIdx = idx
    wild = pool[idx]
    s.wildHp = 1; s.wildMaxHp = 1
    const lb = document.getElementById('g13b-leg-badge')
    if (lb) lb.style.display = 'none'
  }
  s.currentWild = wild

  // Type badge + weakness sticker (teach kid which Pokemon counters this wild)
  try {
    const _wt = wild && (wild.type || 'normal')
    const tEl = document.getElementById('g13b-wtype')
    if (tEl && typeof TYPE_COLOR === 'object' && _wt) {
      const _tc = TYPE_COLOR[String(_wt).toLowerCase()] || '#fcd34d'
      tEl.textContent = String(_wt).charAt(0).toUpperCase() + String(_wt).slice(1)
      tEl.style.background = _tc + '55'
      tEl.style.color = _tc
      tEl.style.border = `1px solid ${_tc}88`
    }
    if (typeof renderWeaknessSticker === 'function') {
      renderWeaknessSticker(document.getElementById('g13b-wweakness-wrap'), _wt)
    }
  } catch(_){}

  // Hotfix #101-C: probe-then-swap so sprite + name + status are atomic.
  // Previously `wspr.src = ...` (async load) and `wname.textContent = ...` (sync)
  // ran back-to-back. Browser keeps showing the previous sprite (e.g. Pikachu)
  // until network finishes, while the label flips immediately to "Bulbasaur".
  // User sees wrong sprite + correct label for 200-2000ms — looks like a bug.
  const wspr = document.getElementById('g13b-wspr')
  const wname = document.getElementById('g13b-wname')
  const _setNameAndPanel = () => {
    if (wname) wname.textContent = s.isLegendary ? `★ ${wild.name}` : wild.name
  }
  const _applyWildVisuals = (src) => {
    if (!wspr) return
    wspr.classList.remove('wild-enter','wild-die','wspr-hit')
    wspr.style.opacity = '1'
    if (src) wspr.src = src
    const tierScale = pokeFinalScale(wild.slug)
    wspr.style.width = wspr.style.height = tierScale === 1.0 ? '' : `calc(clamp(150px, min(40vw, 32vh), 320px) * ${tierScale})`
    applyPokeFlip(wspr, wild.slug, 'enemy')
    void wspr.offsetWidth
    wspr.classList.add('wild-enter')
    wspr.addEventListener('animationend', () => { try { wspr.classList.remove('wild-enter') } catch(_){} }, {once:true})
    _setNameAndPanel()
  }
  if (wspr) {
    if (typeof attachSpriteCascade === 'function' && typeof buildPokeSources === 'function') {
      if (typeof resetSpriteEl === 'function') resetSpriteEl(wspr)
      const _wId = wild.id || (typeof POKE_IDS !== 'undefined' ? POKE_IDS[wild.slug] : null)
      attachSpriteCascade(wspr, buildPokeSources(wild.slug, _wId || null), '❓', () => _applyWildVisuals(null))
      _setNameAndPanel()
    } else {
      const _wLocal = (typeof pokeSpriteAlt2 === 'function') ? pokeSpriteAlt2(wild.slug) : null
      const _wRemote = pokeSpriteOnline(wild.slug)
      const _wPrimary = _wLocal || _wRemote
      const _wSecondary = _wLocal ? _wRemote : null
      let _settled = false
      const _settle = (src) => { if (_settled) return; _settled = true; _applyWildVisuals(src) }
      setTimeout(() => _settle(_wPrimary), 1500)
      const probe = new Image()
      probe.onload = function(){ probe.onload = probe.onerror = null; _settle(_wPrimary) }
      probe.onerror = function(){
        probe.onerror = probe.onload = null
        if (_wSecondary) {
          const probe2 = new Image()
          probe2.onload = function(){ probe2.onload = probe2.onerror = null; _settle(_wSecondary) }
          probe2.onerror = function(){ probe2.onload = probe2.onerror = null; _settle(_wSecondary) }
          probe2.src = _wSecondary
        } else { _settle(_wPrimary) }
      }
      probe.src = _wPrimary
    }
  } else {
    _setNameAndPanel()
  }

  g13bUpdateHpBar()

  // Start legendary periodic auto-attack (every 8s they attack even without wrong answer)
  if (_g13bLegAutoAtk) { clearInterval(_g13bLegAutoAtk); _g13bLegAutoAtk = null }
  if (s.isLegendary) {
    _g13bLegAutoAtk = setInterval(() => {
      const st = g13bState
      if (st.phase !== 'playing' || st.locked || st.playerHp <= 0 || !st.isLegendary) {
        clearInterval(_g13bLegAutoAtk); _g13bLegAutoAtk = null; return
      }
      // Task #62 — skip attack while paused. setInterval tick still fires on wall
      // clock (can't easily gate the timer itself), but the callback is a no-op so
      // player is never damaged while the game is paused.
      //
      // TWO different flags mean "paused" here and the guard needs both:
      //   g13bState.paused — set only by the party picker (Task #64);
      //   state.paused     — set by pauseGame(), i.e. the actual pause overlay.
      // Guarding on g13bState.paused alone left the pause BUTTON unguarded, which is
      // the case Task #62 was opened for: the legendary kept striking behind the
      // overlay. Gate: tools/qa-g13b-pause.mjs
      if (st.paused) return
      if (typeof state !== 'undefined' && state && state.paused) return
      // Legendary fires an autonomous strike between questions
      st.locked = true
      g13bWildHitsPlayer(() => { st.locked = false })
    }, 14000)
  }

  g13bNextQuestion()
}

function g13bNextQuestion() {
  const s = g13bState
  try { if (window.VFX && VFX.Poke && g13bSavedPoke) VFX.Poke.prime([String(g13bSavedPoke.type).toLowerCase()]) } catch(_) {}
  if (s.phase !== 'playing') return

  // Hotfix #112-H: delegate to shared math-rules per user mandate.
  // Easy = anak TK / SD kelas 1 (basic + only at L<5). G13b runs as endless
  // mode → use kills as level proxy, max 40.
  const _diff = state.selectedLevel || 'easy'
  const _proxyLv = Math.min(40, Math.max(1, s.kills + 1))
  let q
  if (typeof window.makeGameQuestion === 'function') {
    q = window.makeGameQuestion(_proxyLv, 40, _diff)
  } else {
    // Fallback minimal — addition only.
    const a = Math.floor(Math.random() * 9) + 1, b = Math.floor(Math.random() * 9) + 1
    q = { q: `${a} + ${b} = ?`, ans: a + b, choices: [a+b, a+b+1, a+b-1, a+b+2].sort(()=>Math.random()-0.5) }
  }
  s.currentAnswer = q.ans; s.currentOp = q.op; s.currentQ = q.q
  s.questionStartTime = Date.now()
  s._g13bChoices = q.choices

  const mathEl = document.getElementById('g13b-math')
  if (mathEl) {
    mathEl.textContent = q.q
    mathEl.classList.remove('pop'); void mathEl.offsetWidth; mathEl.classList.add('pop')
  }
  const lbl = document.getElementById('g13b-atk-lbl')
  if (lbl) lbl.textContent = s.isLegendary ? `💥 LEGENDARY! Serang ${s.currentWild.name}!` : `⚡ Serang ${s.currentWild.name}!`

  // Hotfix #112-H: choices come from shared math-rules q.choices.
  const container = document.getElementById('g13b-choices')
  if (!container) return
  container.innerHTML = ''
  const choices = (s._g13bChoices && Array.isArray(s._g13bChoices)) ? s._g13bChoices : [q.ans]
  choices.forEach(val => {
    const btn = document.createElement('button')
    btn.className = 'g13b-choice-btn'
    btn.textContent = val
    btn.onclick = () => g13bAnswer(val, btn)
    container.appendChild(btn)
  })
}

function g13bAnswer(val, btn) {
  const s = g13bState
  if (s.locked || s.phase !== 'playing') return
  s.locked = true

  // Hotfix #112-H: support both numeric (math) + string (knowledge) answers.
  const correct = String(val) === String(s.currentAnswer); duniaReportOp('g13b', s.currentOp, s.currentQ, correct) // PRD-48
  btn.classList.add(correct ? 'correct' : 'wrong')
  const container = document.getElementById('g13b-choices')
  if (container) container.querySelectorAll('.g13b-choice-btn').forEach(b => { b.disabled = true })

  if (correct) {
    playCorrect()
    vibrate(12)
    s.streak++
    if (s.streak > s.bestCombo) s.bestCombo = s.streak
    g13bRenderStreak()

    // Speed bonus: answer in <5 seconds
    const elapsed = Date.now() - (s.questionStartTime || Date.now())
    if (elapsed < 5000) {
      const field = document.getElementById('g13b-field')
      if (field) {
        const bonus = document.createElement('div')
        bonus.textContent = '⚡ CEPAT!'
        bonus.style.cssText = 'position:absolute;top:22%;left:50%;transform:translateX(-50%);font-size:20px;font-weight:900;font-family:"Fredoka One",cursive;color:#FDE047;text-shadow:0 2px 8px rgba(0,0,0,0.7);z-index:30;pointer-events:none;animation:g13bSpeedBonus 0.9s ease forwards;'
        field.appendChild(bonus)
        bonus.addEventListener('animationend', () => bonus.remove(), {once:true})
      }
    }

    // Player attack lunge
    const pspr = document.getElementById('g13b-pspr')
    if (pspr) { pspr.classList.remove('atk'); void pspr.offsetWidth; pspr.classList.add('atk'); setTimeout(()=>pspr.classList.remove('atk'),350) }

    // Field flash
    const flash = document.getElementById('g13b-flash')
    if (flash) { flash.classList.remove('hit'); void flash.offsetWidth; flash.classList.add('hit') }

    // Wild hit animation (delayed slightly)
    setTimeout(() => {
      const wspr = document.getElementById('g13b-wspr')
      if (wspr) { wspr.classList.remove('wspr-hit'); void wspr.offsetWidth; wspr.classList.add('wspr-hit'); setTimeout(()=>wspr.classList.remove('wspr-hit'),380) }
    }, 180)

    // Particle burst
    try { spawnParticleBurst(btn.getBoundingClientRect().left + btn.offsetWidth/2, btn.getBoundingClientRect().top) } catch(e) {}

    // Aura ring around player Pokémon before attack — canonical spawnTypeAura helper
    try {
      const playerType = g13bSavedPoke ? g13bSavedPoke.type : 'Electric'
      spawnTypeAura(document.querySelector('.g13b-pspr-wrap'), playerType, 520)
    } catch(e) {}

    // Spawn attack projectile — type based on player's chosen Pokémon
    try {
      const playerType = g13bSavedPoke ? g13bSavedPoke.type : 'Electric'
      playAttackSound(playerType)
      g13SpawnAttackEffect(playerType, true, 'g13b-field')
      showMovePopup(document.getElementById('g13b-pspr-wrap'), getPokeMove(g13bSavedPoke ? g13bSavedPoke.slug : '', playerType), pokeTypeColor(playerType))
    } catch(e) {}

    // COMBO FX at streak >= 3
    if (s.streak >= 3) g13bShowCombo(s.streak)

    // Reduce wild HP — type effectiveness + STAB
    const _playerType = (g13bSavedPoke && g13bSavedPoke.type) || 'Electric'
    const _wildType = (s.currentWild && s.currentWild.type) || 'Normal'
    const _bMult = (typeof calcFullMult === 'function')
      ? calcFullMult(_playerType, _playerType, _wildType)
      : 1
    const _bDmg  = Math.max(1, Math.round(1 * _bMult))
    s.wildHp = Math.max(0, s.wildHp - _bDmg)
    try { if (typeof applyHitFeedback === 'function') {
      applyHitFeedback(document.getElementById('g13b-wspr-wrap') || document.getElementById('g13b-wspr'), _playerType, _wildType, _playerType, _bDmg, (s.playerFam && s.playerFam[s.curIdx] && s.playerFam[s.curIdx].id) || null)
    }} catch(_){}
    g13bUpdateHpBar()

    setTimeout(() => {
      if (s.wildHp <= 0) {
        g13bKillWild()
      } else if (Math.random() < (s.isLegendary ? 0.40 : 0.20)) {
        // 40% counter-attack for legendary, 20% for regular wild
        g13bWildHitsPlayer(() => { s.locked = false; g13bNextQuestion() })
      } else {
        s.locked = false; g13bNextQuestion()
      }
    }, 480)
  } else {
    playWrong()
    vibrate(30)
    s.streak = 0
    g13bRenderStreak()
    const scr = document.getElementById('screen-game13b')
    if (scr) { scr.classList.remove('shake'); void scr.offsetWidth; scr.classList.add('shake'); setTimeout(()=>scr.classList.remove('shake'),400) }
    // Wrong answer → wild always attacks player
    g13bWildHitsPlayer(() => { s.locked = false; g13bNextQuestion() })
  }
}

function g13bKillWild() {
  const s = g13bState
  // Clear any legendary auto-attack timer
  if (_g13bLegAutoAtk) { clearInterval(_g13bLegAutoAtk); _g13bLegAutoAtk = null }
  const earnedKills = s.isLegendary ? 3 : 1
  const wasLegendary = s.isLegendary
  s.kills += earnedKills
  if (s.isLegendary) { s.legendaryIdx++; s.isLegendary = false }
  try { g13bUpdateKills() } catch(_){}

  // Wild sprite: flash white then shrink (absorbed)
  const wspr = document.getElementById('g13b-wspr')
  if (wspr) { wspr.classList.remove('wild-die'); void wspr.offsetWidth; wspr.classList.add('wild-die') }

  // Show Pokéball catch animation (legendary gets heavyball, others random)
  try { g13bShowCatch(wasLegendary) } catch(_){}

  // Legendary defeated → level complete; otherwise check for next legendary threshold
  if (wasLegendary) {
    setTimeout(() => g13bLevelComplete(), 1900)
    // Task #57 failsafe — if primary transition throws/doesn't fire, force-call within 3.5s
    setTimeout(() => {
      if (g13bState === s && s.phase !== 'done') {
        console.warn('[G13B] level-complete watchdog fired — forcing overlay')
        g13bLevelComplete()
      }
    }, 3500)
  } else {
    const prevKills = s.kills - earnedKills
    const newKills = s.kills
    const prevTens = Math.floor(prevKills / 10)
    const newTens = Math.floor(newKills / 10)
    if (newTens > prevTens) {
      setTimeout(() => g13bTriggerLegendary(), 1800)
    } else {
      // ~25% chance wild escapes and re-attacks before can be caught
      const escapeRoll = Math.random()
      if (!s.isLegendary && escapeRoll < 0.25 && s.kills >= 2) {
        setTimeout(() => g13bWildEscape(), 1800)
      } else {
        setTimeout(() => g13bSpawnWild(), 1700)
      }
    }
  }
}

function g13bWildEscape() {
  const s = g13bState
  if (s.phase !== 'playing') return
  // Show escape banner
  const field = document.getElementById('g13b-field')
  if (field) {
    const banner = document.createElement('div')
    banner.textContent = '💨 KABUR! Serang lagi!'
    banner.style.cssText = 'position:absolute;top:38%;left:50%;transform:translate(-50%,-50%);font-size:18px;font-weight:900;font-family:"Fredoka One",cursive;color:#FCA5A5;background:rgba(0,0,0,0.75);border-radius:14px;padding:8px 18px;z-index:30;pointer-events:none;animation:g13bWildIn 0.35s ease;'
    field.appendChild(banner)
    setTimeout(() => banner.remove(), 1200)
  }
  // Re-spawn same wild at 60% HP
  const wild = s.currentWild
  if (wild) {
    s.wildHp = Math.max(2, Math.round((s.wildMaxHp || 3) * 0.6))
    const wspr = document.getElementById('g13b-wspr')
    if (wspr) {
      // Hotfix #104 (2026-04-28): shared cascade.
      if (typeof attachSpriteCascade === 'function' && typeof buildPokeSources === 'function') {
        attachSpriteCascade(wspr, buildPokeSources(wild.slug, wild.id), '👹')
      } else {
        wspr.src = (typeof pokeSpriteAlt2 === 'function' && pokeSpriteAlt2(wild.slug)) || pokeSpriteOnline(wild.slug)
      }
      wspr.classList.remove('wild-enter', 'wild-die', 'wspr-hit')
      void wspr.offsetWidth
      wspr.classList.add('wild-enter')
    }
    g13bUpdateHpBar()
    setTimeout(() => { s.locked = false; g13bNextQuestion() }, 900)
  } else {
    setTimeout(() => g13bSpawnWild(), 1000)
  }
}

function g13bShowCatch(isLegendary) {
  const ballEl = document.getElementById('g13b-catch-ball')
  if (!ballEl) return

  // Pick ball type
  const ballName = isLegendary
    ? 'heavyball'
    : G13B_BALLS[Math.floor(Math.random() * G13B_BALLS.length)]
  ballEl.src = `assets/Pokemon/g13b/balls/${ballName}.svg`

  // Reset
  ballEl.classList.remove('popin', 'wobble')
  ballEl.style.display = 'none'

  // Step 1: After 220ms (wild die finishes fading) — ball pops in
  setTimeout(() => {
    ballEl.style.display = 'block'
    ballEl.classList.remove('wobble')
    void ballEl.offsetWidth
    ballEl.classList.add('popin')
  }, 220)

  // Step 2: After 220+380ms — wobble 3 times
  setTimeout(() => {
    ballEl.classList.remove('popin')
    void ballEl.offsetWidth
    ballEl.classList.add('wobble')
  }, 600)

  // Step 3: Stars burst at 700ms
  setTimeout(() => {
    const field = document.getElementById('g13b-field')
    if (!field) return
    const stars = ['⭐','✨','💫','🌟','⚡']
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const dist = 50 + Math.random() * 40
      const cx = Math.round(Math.cos(angle) * dist)
      const cy = Math.round(Math.sin(angle) * dist)
      const star = document.createElement('div')
      star.className = 'g13b-catch-star'
      star.textContent = stars[Math.floor(Math.random() * stars.length)]
      star.style.setProperty('--cx', cx + 'px')
      star.style.setProperty('--cy', cy + 'px')
      star.style.animationDelay = (i * 0.04).toFixed(2) + 's'
      field.appendChild(star)
      star.addEventListener('animationend', () => star.remove(), {once:true})
    }
  }, 700)

  // Step 4: Hide ball after animation completes
  setTimeout(() => {
    ballEl.classList.remove('popin', 'wobble')
    ballEl.style.display = 'none'
  }, 1650)
}

function g13bTriggerLegendary() {
  const s = g13bState
  s.phase = 'legendary_entrance'
  s.isLegendary = true

  const leg = G13B_LEGENDARIES[s.legendaryIdx % G13B_LEGENDARIES.length]

  // Legendary entrance banner
  const banner = document.getElementById('g13b-leg-banner')
  const legSpr = document.getElementById('g13b-leg-spr')
  const legSub = document.getElementById('g13b-leg-sub')
  if (banner) banner.classList.remove('hide')
  if (legSpr) {
    // Hotfix #117: cascade HD WebP first instead of direct 96px CDN assignment.
    if (typeof attachSpriteCascade === 'function' && typeof buildPokeSources === 'function') {
      if (typeof resetSpriteEl === 'function') resetSpriteEl(legSpr)
      attachSpriteCascade(legSpr, buildPokeSources(leg.slug, null), leg.icon || '🌟')
    } else {
      // LEGACY-FALLBACK-EXEMPT: only fires when cascade helpers unloaded.
      legSpr.src = `assets/Pokemon/others/pokeball.svg`
      legSpr.onerror = function(){ this.alt = leg.icon || '🌟' }
    }
  }
  if (legSub) legSub.textContent = `${leg.name} muncul! Butuh 3 serangan tepat!`

  // Golden flash + shake
  const flash = document.getElementById('g13b-flash')
  if (flash) {
    flash.style.background = 'rgba(251,191,36,0.75)'
    flash.classList.remove('hit'); void flash.offsetWidth; flash.classList.add('hit')
    setTimeout(() => { if (flash) flash.style.background = 'white' }, 60)
  }
  const scr = document.getElementById('screen-game13b')
  if (scr) { scr.classList.remove('shake'); void scr.offsetWidth; scr.classList.add('shake') }

  // Spawn extra lightning bolts
  const field = document.getElementById('g13b-field')
  if (field) {
    for (let i = 0; i < 8; i++) {
      const bolt = document.createElement('div')
      bolt.className = 'g13b-bolt'
      bolt.textContent = '⚡'
      bolt.style.cssText = `left:${8 + Math.random()*84}%;top:${5 + Math.random()*70}%;font-size:${28+Math.floor(Math.random()*18)}px;animation-delay:${(i*0.07).toFixed(2)}s;`
      field.appendChild(bolt)
      bolt.addEventListener('animationend', () => bolt.remove(), {once:true})
    }
  }

  vibrate([80, 40, 80, 40, 120])

  // After 2.2s, hide banner and start legendary battle
  setTimeout(() => {
    if (banner) banner.classList.add('hide')
    s.phase = 'playing'
    g13bSpawnWild()
  }, 2200)
}

function g13bShowCombo(streak) {
  // Lightning bolts
  const field = document.getElementById('g13b-field')
  if (field) {
    const boltCount = Math.min(streak - 1, 7)
    for (let i = 0; i < boltCount; i++) {
      const bolt = document.createElement('div')
      bolt.className = 'g13b-bolt'
      bolt.textContent = streak >= 6 ? '🌟' : '⚡'
      bolt.style.cssText = `left:${10 + Math.random()*80}%;top:${8 + Math.random()*65}%;animation-delay:${(i*0.07).toFixed(2)}s;`
      field.appendChild(bolt)
      bolt.addEventListener('animationend', () => bolt.remove(), {once:true})
    }
  }
  const el = document.getElementById('g13b-combo')
  const txt = document.getElementById('g13b-combo-txt')
  const sub = document.getElementById('g13b-combo-sub')
  if (txt) txt.textContent = `COMBO x${streak}!`
  if (sub) sub.textContent = streak >= 7 ? '🔥 GILA! KAMU TERBAIK!' : streak >= 5 ? '🌟 LUAR BIASA!' : `${streak} serangan berturut!`
  // Pixi combo text — GPU-rendered burst text
  const _g13bPixi = PixiManager.get('g13b-pixi-canvas')
  if (_g13bPixi) {
    pixiComboText(_g13bPixi, `COMBO x${streak}!`)
  } else if (el) {
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show')
    el.addEventListener('animationend', () => el.classList.remove('show'), {once:true})
  }
}

function g13bRenderStreak() {
  const row = document.getElementById('g13b-streak-row')
  if (!row) return
  const dots = row.querySelectorAll('.g13b-streak-dot')
  const activeCount = g13bState.streak > 0 ? ((g13bState.streak - 1) % 3) + 1 : 0
  if (dots.length === 3) {
    dots.forEach((d, i) => { d.classList.toggle('active', i < activeCount) })
  } else {
    row.innerHTML = ''
    for (let i = 0; i < 3; i++) {
      const d = document.createElement('div')
      d.className = 'g13b-streak-dot' + (i < activeCount ? ' active' : '')
      row.appendChild(d)
    }
  }
}

function g13bUpdateHpBar() {
  const s = g13bState
  const fill = document.getElementById('g13b-hp-fill')
  const nums = document.getElementById('g13b-hp-nums')
  const pct = s.wildMaxHp > 0 ? (s.wildHp / s.wildMaxHp) * 100 : 0
  if (fill) { fill.style.width = `${pct}%`; fill.className = 'g13b-hp-fill' + (pct <= 33 ? ' low' : '') }
  if (nums) nums.textContent = `${s.wildHp}/${s.wildMaxHp}`
}

function g13bUpdatePlayerHp() {
  const s = g13bState
  const fill = document.getElementById('g13b-php-fill')
  const nums = document.getElementById('g13b-php-nums')
  const pct = s.playerMaxHp > 0 ? (s.playerHp / s.playerMaxHp) * 100 : 0
  if (fill) { fill.style.width = `${pct}%`; fill.className = 'g13b-php-fill' + (pct <= 33 ? ' low' : '') }
  if (nums) nums.textContent = `${s.playerHp}/${s.playerMaxHp}`
}

function g13bWildHitsPlayer(onDone) {
  const s = g13bState
  // Wild lunge animation
  const wspr = document.getElementById('g13b-wspr')
  if (wspr) { wspr.classList.remove('wild-atk'); void wspr.offsetWidth; wspr.classList.add('wild-atk'); setTimeout(()=>wspr.classList.remove('wild-atk'),400) }
  // Player sprite shakes
  const pspr = document.getElementById('g13b-pspr')
  if (pspr) { pspr.classList.remove('player-hit'); void pspr.offsetWidth; pspr.classList.add('player-hit'); setTimeout(()=>pspr.classList.remove('player-hit'),420) }
  // Red flash
  const flash = document.getElementById('g13b-flash')
  if (flash) { flash.classList.remove('hit','red-hit'); void flash.offsetWidth; flash.classList.add('red-hit') }
  // Move popup on wild sprite
  try { showMovePopup(document.getElementById('g13b-wspr-wrap'), getPokeMove(s.currentWild ? s.currentWild.slug : '', s.currentWild ? (s.currentWild.type||'Normal') : 'Normal'), null) } catch(e) {}
  // Status label
  const lbl = document.getElementById('g13b-atk-lbl')
  const prevLbl = lbl ? lbl.textContent : ''
  if (lbl) lbl.textContent = s.isLegendary
    ? `🌟 SERANGAN LEGENDARIS! ${s.currentWild ? s.currentWild.name : 'Wild'} menyerang!`
    : `💥 ${s.currentWild ? s.currentWild.name : 'Wild'} menyerang!`
  // Reduce player HP — type effectiveness + STAB
  const _base = s.isLegendary ? 2 : 1
  const _wType = s.currentWild ? (s.currentWild.type || 'normal') : 'normal'
  const _pType = (g13bSavedPoke && g13bSavedPoke.type) || 'Electric'
  const _wbMult = (typeof calcFullMult === 'function')
    ? calcFullMult(_wType, _wType, _pType)
    : 1
  const dmg = Math.max(1, Math.round(_base * _wbMult))
  s.playerHp = Math.max(0, s.playerHp - dmg)
  try { if (typeof applyHitFeedback === 'function') {
    applyHitFeedback(document.getElementById('g13b-pspr-wrap') || document.getElementById('g13b-pspr'), _wType, _pType, _wType, dmg, (s.wild && s.wild.id) || null)
  }} catch(_){}
  g13bUpdatePlayerHp()
  playAttackSound(_wType)
  vibrate(25)
  setTimeout(() => {
    if (lbl && s.phase === 'playing') lbl.textContent = prevLbl
    if (s.playerHp <= 0) {
      g13bGameOver('defeated')
    } else {
      if (onDone) onDone()
    }
  }, 540)
}

function g13bUpdateKills() {
  const el = document.getElementById('g13b-kills')
  if (!el) return
  el.textContent = `💀 ${g13bState.kills}`
  el.classList.remove('pop-kill'); void el.offsetWidth; el.classList.add('pop-kill')
  el.addEventListener('animationend', () => el.classList.remove('pop-kill'), {once:true})
}

function g13bGameOver(reason) {
  const s = g13bState
  if (s.phase === 'done') return
  s.phase = 'done'
  if (_g13bLegAutoAtk) { clearInterval(_g13bLegAutoAtk); _g13bLegAutoAtk = null }
  battleBgmStop()

  const defeated = reason === 'defeated'
  // Task #99 (2026-04-27): direct threshold scoring. Previous bonus-modifier
  // pattern (GameScoring.calc with bonus = tier - 5) applied a perfect-run baseline
  // and deducted shortfall, producing absurd scores like 1★ for "completed" with
  // <5 kills. G13b is threshold-tier survival, NOT accuracy — bonus modifier was
  // semantically wrong here. Defeated = kills earned, completed = win + tier bonus.
  //   defeated: kills≥30→3★, kills≥15→2★, kills≥5→1★, else 0★
  //   completed (timer ran out, still alive): kills≥30→5★, kills≥15→4★, else 3★ (won)
  const stars = defeated
    ? (s.kills >= 30 ? 3 : s.kills >= 15 ? 2 : s.kills >= 5 ? 1 : 0)
    : (s.kills >= 30 ? 5 : s.kills >= 15 ? 4 : 3)
  // Task #66: mark city as completed for region/city progression (only if not defeated)
  try {
    if (!defeated && stars > 0 && state.selectedRegion && state.selectedCity && typeof setCityComplete === 'function') {
      // Hotfix 2026-04-28: removed legacy 5★→3★ capping. Save raw 1-5.
      setCityComplete('13b', state.selectedRegion, state.selectedCity, stars)
    }
  } catch(_) {}
  vibrate([30, 20, 50])
  try { if (stars >= 2) playCorrect() } catch(e) {}

  const delay = defeated ? 600 : 900
  // Task #93 (2026-04-26): unify with showGameResult engine (used by G13) instead of
  // custom #g13b-result modal — consistent style across all games per user feedback.
  setTimeout(() => {
    try {
      const emoji = defeated ? '💀' : (stars >= 3 ? '🏆' : stars >= 2 ? '⚡' : stars >= 1 ? '✨' : '😅')
      const title = defeated
        ? `${s.currentWild ? s.currentWild.name : 'Wild'} mengalahkanmu!`
        : (stars >= 3 ? 'Luar Biasa!' : stars >= 2 ? 'Keren Banget!' : stars >= 1 ? 'Bagus!' : 'Terus Berlatih!')
      const msg = defeated
        ? `HP habis setelah ${s.kills} kemenangan! Combo terbaik: x${s.bestCombo}`
        : `${s.kills} Pokémon dikalahkan • Combo: x${s.bestCombo}  •  Survive 60s!`
      const buttons = [
        { label: 'Main Lagi ⚡', action: () => g13bResultMainLagi() },
        { label: '⌂ Beranda', action: () => exitGame13b() }
      ]
      showGameResult({ emoji, title, stars, msg, buttons })
    } catch (e) {
      console.error('[g13bGameOver] showGameResult failed — fallback to legacy modal:', e, e && e.stack)
      state._showingGameResult = false  // unstrand modal so retry works
      const res = document.getElementById('g13b-result')
      if (res) res.style.display = 'flex'
    }
  }, delay)
}

function g13bLevelComplete() {
  const s = g13bState
  if (s.phase === 'done') return
  s.phase = 'done'
  battleBgmStop()

  // Hotfix #101-D (2026-04-27): legendary defeat = 5★ floor. User feedback on
  // Hotfix #99-C "Perfect harusnya score sempurna tapi ini 3 of 5" — they defeated
  // Terrakion with combo x15, 13 kills, and got 3★. The kill-count thresholds
  // (50/30) were arbitrary; defeating a legendary IS the win condition. Combo and
  // kills are pride bonuses, not gates. Drop to 4★ ONLY if very minimal effort.
  const stars = (s.bestCombo >= 5 || s.kills >= 5) ? 5 : 4
  // Hotfix #101 (D-supplement): persist city completion. g13bGameOver had this
  // but the legendary-victory path (this function) didn't — so users who won by
  // defeating the legendary saw their progress vanish.
  try {
    if (state.selectedRegion && state.selectedCity && typeof setCityComplete === 'function') {
      const _saved = stars >= 5 ? 3 : 2
      setCityComplete('13b', state.selectedRegion, state.selectedCity, _saved)
    }
    if (typeof setLevelComplete === 'function') {
      setLevelComplete('13b', state.selectedLevelNum || 1, stars >= 5 ? 3 : 2)
    }
  } catch(e) { console.warn('[g13bLevelComplete] save:', e, e && e.stack) }
  try { vibrate([50, 30, 80, 30, 120]) } catch(_){}
  try { playCorrect() } catch(e) {}

  // Fireworks burst on the field
  const field = document.getElementById('g13b-field')
  if (field) {
    const fx = ['🌟','✨','💫','⭐','🎉','🎊']
    for (let i = 0; i < 12; i++) {
      const bolt = document.createElement('div')
      bolt.className = 'g13b-bolt'
      bolt.textContent = fx[i % fx.length]
      bolt.style.cssText = `left:${5+Math.random()*90}%;top:${5+Math.random()*75}%;font-size:${22+Math.floor(Math.random()*16)}px;animation-delay:${(i*0.06).toFixed(2)}s;`
      field.appendChild(bolt)
      bolt.addEventListener('animationend', () => bolt.remove(), {once:true})
    }
  }

  setTimeout(() => {
    try {
      // Task #93 (2026-04-26): unify legendary level-complete modal via showGameResult
      const legName = s.currentWild ? s.currentWild.name : 'Legendary'
      const emoji = stars >= 5 ? '🏆' : stars >= 3 ? '🌟' : '⭐'
      const title = 'Level Selesai!'
      const msg = `${legName} berhasil ditaklukkan! • ${s.kills} Pokémon • Combo: x${s.bestCombo}`
      const buttons = [
        { label: 'Lanjut ▶', action: () => g13bResultMainLagi() },
        { label: '⌂ Beranda', action: () => exitGame13b() }
      ]
      showGameResult({ emoji, title, stars, msg, buttons })
    } catch (e) {
      console.error('[g13bLevelComplete] showGameResult failed — fallback to legacy modal:', e, e && e.stack)
      state._showingGameResult = false  // unstrand modal so retry works
      const overlay = document.getElementById('g13b-level-complete')
      if (overlay) overlay.style.display = 'flex'
    }
  }, 800)
  // Failsafe — force fallback overlay visible at 2.2s if showGameResult never displayed
  setTimeout(() => {
    const gr = document.getElementById('game-result-overlay')
    if (gr && !gr.classList.contains('show')) {
      console.warn('[G13B] level-complete watchdog — showGameResult missed, fallback to legacy')
      const overlay = document.getElementById('g13b-level-complete')
      if (overlay) overlay.style.display = 'flex'
    }
  }, 2200)
}

// ============================================================
// HELPER — called from in-game result overlays
// ============================================================
function endGameFromOverlay() {
  // v54.27 I9: clean up G18 ambient + DOM on game-end
  try { g18Cleanup() } catch(_){}
  hideGameResult()
  endGame(state.gameStars[state.currentPlayer] || 3)
}

// ── Unified Game Result Overlay (G13-G18) ────────────────────
// Task #99 (2026-04-27): section-level try-catch + flag self-clear watchdog.
// G13b "crash semuanya" traced to unguarded DOM access here — single bad node
// killed the entire modal AND left _showingGameResult=true so retry was silent.
function showGameResult({ emoji, title, stars, msg, buttons }) {
  const activeScreen = document.querySelector('.screen.active')
  if (!activeScreen || !activeScreen.id.startsWith('screen-game')) return
  if (state._showingGameResult) return
  state._showingGameResult = true

  // Self-clearing watchdog: if any section throws BEFORE buttons wire up,
  // hideGameResult never fires — clear flag so user can retry.
  let _shown = false
  setTimeout(() => { if (!_shown) state._showingGameResult = false }, 4000)

  // DEFENSIVE OVERLAY SWEEP (2026-05-04): kill every known modal/overlay
  // that could sit above gr-overlay and block clicks. G13C win-modal-stuck
  // regression traced to stale battle-stage / evo / quiz overlays leaking
  // pointer-events even after their content was hidden.
  try {
    const KILL_SELECTORS = [
      '#g13-evo-overlay', '#g13b-result', '#g13b-level-complete',
      '#math-quiz-overlay', '#pause-overlay', '#bag-overlay',
      '.g13b-result-overlay', '.gr-overlay-extra', '.quiz-panel.show'
    ]
    KILL_SELECTORS.forEach(sel => {
      try {
        document.querySelectorAll(sel).forEach(el => {
          el.classList.remove('show')
          el.style.display = 'none'
          el.style.pointerEvents = 'none'
        })
      } catch(_){}
    })
  } catch(e) { console.warn('[showGameResult] overlay sweep:', e) }

  // SECTION 1: text content (CRITICAL)
  try {
    const safeStars = Math.min(Math.max(stars||0, 0), 5)
    const eEl = document.getElementById('gr-emoji'); if (eEl) { const _ge = emoji || '🏆'; const _gb = uiBadge(_ge, 'width:1em;height:1em;object-fit:contain;vertical-align:middle'); if (_gb) eEl.innerHTML = _gb; else eEl.textContent = _ge }
    const tEl = document.getElementById('gr-title'); if (tEl) tEl.textContent = title || 'Selesai!'
    const sEl = document.getElementById('gr-stars'); if (sEl) sEl.innerHTML = uiRepeat('star','⭐',safeStars) + uiRepeat('star-empty','☆',5-safeStars)
    const mEl = document.getElementById('gr-msg'); if (mEl) mEl.textContent = msg || ''
  } catch(e) { console.error('[showGameResult] text section:', e, e && e.stack) }

  // SECTION 2: buttons (CRITICAL — without these user has no exit)
  try {
    const btns = document.getElementById('gr-btns')
    if (btns) {
      btns.innerHTML = ''
      ;(buttons||[]).forEach((b, i) => {
        const el = document.createElement('button')
        el.className = 'gr-btn ' + (i === 0 ? 'gr-btn-primary' : 'gr-btn-secondary')
        el.textContent = b.label
        el.type = 'button'
        // Bind via BOTH pointerdown + click — mobile Chrome sometimes
        // swallows click on overlay-stacked buttons; pointerdown is the
        // touch-event fallback. Idempotency guarded by _gr_fired flag.
        const fire = (evt) => {
          if (el._gr_fired) return
          el._gr_fired = true
          try { evt && evt.preventDefault && evt.preventDefault() } catch(_){}
          console.log('[gr-btn] tap:', b.label)
          try { playClick() } catch(_) {}
          try { hideGameResult() } catch(_) {}
          setTimeout(() => {
            try { b.action() }
            catch(actionErr) {
              console.error('[showGameResult] button action threw:', actionErr, actionErr && actionErr.stack)
              state._showingGameResult = false
            }
          }, 0)
        }
        el.addEventListener('pointerdown', fire, { passive: false })
        el.addEventListener('click', fire)
        btns.appendChild(el)
      })
    }
  } catch(e) { console.error('[showGameResult] buttons section:', e, e && e.stack) }

  // SECTION 3: show overlay (CRITICAL)
  try {
    const ov = document.getElementById('game-result-overlay')
    if (ov) { ov.classList.add('show'); _shown = true }
  } catch(e) { console.error('[showGameResult] show overlay:', e, e && e.stack) }
}
function hideGameResult() {
  state._showingGameResult = false
  document.getElementById('game-result-overlay').classList.remove('show')
}

