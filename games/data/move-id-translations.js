/* ============================================================================
 * G13C Pokemon Move Names — Indonesian Translations
 * ============================================================================
 * Maps English Pokemon move names → Indonesian for the G13C battle UI.
 * Used by the move-button renderer to show small Indonesian text below the
 * English name (30% font size). Falls back to English if a move is unmapped.
 *
 * Translations are kid-friendly (target: ages 5-10), not literal — focus on
 * conveying the move's intent rather than direct word-for-word translation.
 * ========================================================================== */

const MOVE_ID = {
  // Normal type
  'Tackle': 'Tabrakan', 'Scratch': 'Cakaran', 'Pound': 'Pukulan', 'Slam': 'Hantaman',
  'Body Slam': 'Hantaman Tubuh', 'Quick Attack': 'Serangan Cepat', 'Tail Whip': 'Cambuk Ekor',
  'Growl': 'Gertakan', 'Leer': 'Tatapan Garang', 'Sand Attack': 'Lemparan Pasir',
  'Bite': 'Gigitan', 'Headbutt': 'Tandukan', 'Slash': 'Tebasan', 'Cut': 'Sayatan',
  'Take Down': 'Tubrukan', 'Hyper Fang': 'Taring Super', 'Hyper Beam': 'Sinar Hiper',
  'Hyper Voice': 'Suara Hiper', 'Boomburst': 'Ledakan Suara', 'Echoed Voice': 'Gema Suara',
  'Howl': 'Lolongan', 'Mimic': 'Tiruan', 'Metronome': 'Metronom', 'Sing': 'Nyanyian',
  'Supersonic': 'Suara Super', 'Super Sonic': 'Suara Super', 'Sonic Boom': 'Ledakan Suara',
  'Swift': 'Bintang Cepat', 'Spike Cannon': 'Meriam Duri', 'Crabhammer': 'Palu Capit',
  'Vice Grip': 'Cengkeraman', 'Skull Bash': 'Hantaman Kepala', 'Stomp': 'Injakan',
  'Double Kick': 'Tendangan Ganda', 'Mega Kick': 'Tendangan Mega', 'Mega Punch': 'Tinju Mega',
  'Karate Chop': 'Pukulan Karate', 'Endeavor': 'Usaha', 'Endure': 'Bertahan',
  'Bide': 'Menahan Diri', 'Counter': 'Serang Balik', 'Reversal': 'Pembalikan',
  'Last Resort': 'Senjata Pamungkas', 'Explosion': 'Ledakan', 'Self-Destruct': 'Hancur Diri',
  'Hidden Power': 'Kekuatan Tersembunyi', 'Tri Attack': 'Serangan Tiga', 'Bind': 'Belitan',
  'Wrap': 'Lilitan', 'Constrict': 'Cekikan', 'Stomping Tantrum': 'Injakan Marah',
  'Headlong Rush': 'Terjangan Kepala', 'Hammer Arm': 'Lengan Palu', 'Drum Beating': 'Pukulan Drum',
  'Stuff Cheeks': 'Penuhi Pipi', 'Tera Starstorm': 'Badai Bintang Tera', 'Defense Curl': 'Gulungan Bertahan',
  'Harden': 'Mengeras', 'Withdraw': 'Mundur', 'Roar': 'Auman', 'Screech': 'Jeritan',
  'Disable': 'Lumpuhkan', 'Mean Look': 'Tatapan Jahat', 'Disarming Voice': 'Suara Lembut',
  'Attract': 'Pikat', 'Sweet Kiss': 'Ciuman Manis', 'Charm': 'Pesona', 'Sweet Scent': 'Aroma Manis',
  'Play Nice': 'Bermain Baik', 'Play Rough': 'Main Kasar', 'Frustration': 'Frustrasi',
  'Return': 'Balasan', 'Yawn': 'Menguap', 'Hyper Drill': 'Bor Hiper', 'Bulldoze': 'Buldoser',
  'Smelling Salts': 'Garam Cium', 'Round': 'Putaran', 'Echoed Voice ': 'Gema Suara',
  'Roost': 'Bertelur', 'Recover': 'Pemulihan', 'Synthesis': 'Sintesis', 'Heal Bell': 'Lonceng Sembuh',
  'Soft-Boiled': 'Telur Setengah Matang', 'Rest': 'Istirahat', 'Trump Card': 'Kartu Truf',
  'Substitute': 'Pengganti', 'Light Screen': 'Layar Cahaya', 'Reflect': 'Pantul', 'Protect': 'Lindungi',
  'Detect': 'Mendeteksi', 'Spiky Shield': 'Perisai Berduri', "Land's Wrath": 'Murka Tanah',
  'Land’s Wrath': 'Murka Tanah', "Land’s Wrath": 'Murka Tanah',
  'Tail Slap': 'Tamparan Ekor', 'Skull': 'Tengkorak', 'Helping Hand': 'Bantuan',
  'Double Team': 'Tim Ganda', 'Teleport': 'Teleportasi', 'Magnitude': 'Magnitudo',
  'Pursuit': 'Mengejar',

  // Fire type
  'Ember': 'Bara Api', 'Flamethrower': 'Penyembur Api', 'Fire Blast': 'Ledakan Api',
  'Fire Punch': 'Tinju Api', 'Fire Spin': 'Pusaran Api', 'Fire Fang': 'Taring Api',
  'Fire Lash': 'Cambuk Api', 'Flame Wheel': 'Roda Api', 'Flame Charge': 'Serbuan Api',
  'Flare Blitz': 'Serangan Api', 'Heat Wave': 'Gelombang Panas', 'Heat Crash': 'Hantaman Panas',
  'Inferno': 'Neraka', 'Incinerate': 'Bakar Habis', 'Lava Plume': 'Lautan Lava',
  'Magma Storm': 'Badai Magma', 'Mystical Fire': 'Api Mistis', 'Sacred Fire': 'Api Suci',
  'Searing Shot': 'Tembakan Membara', 'Fusion Flare': 'Suar Fusi', 'Blue Flare': 'Suar Biru',
  'Blast Burn': 'Ledakan Bakar', 'V-create': 'Bentuk-V', 'Pyro Ball': 'Bola Api',
  'Burn Up': 'Membakar Habis', 'Eruption': 'Letusan', 'Overheat': 'Kepanasan',
  'Will-O-Wisp': 'Api Sesat', 'Sunny Day': 'Hari Cerah', 'Blaze Kick': 'Tendangan Berkobar',
  'Torch Song': 'Lagu Obor', 'Beak Blast': 'Ledakan Paruh',

  // Water type
  'Water Gun': 'Pistol Air', 'Water Pulse': 'Pulsa Air', 'Water Shuriken': 'Shuriken Air',
  'Aqua Jet': 'Semburan Air', 'Aqua Step': 'Langkah Air', 'Aqua Tail': 'Ekor Air',
  'Bubble': 'Gelembung', 'Bubble Beam': 'Sinar Gelembung', 'Hydro Pump': 'Pompa Hidro',
  'Hydro Cannon': 'Meriam Hidro', 'Surf': 'Selancar', 'Brine': 'Air Asin',
  'Liquidation': 'Pencairan', 'Razor Shell': 'Cangkang Tajam', 'Snipe Shot': 'Tembakan Jitu',
  'Origin Pulse': 'Pulsa Asal', 'Sparkling Aria': 'Lagu Berkilau', 'Steam Eruption': 'Letusan Uap',
  'Whirlpool': 'Pusaran Air', 'Waterfall': 'Air Terjun', 'Soak': 'Rendam',
  'Rain Dance': 'Tarian Hujan', 'Fishious Rend': 'Sobekan Ikan',

  // Grass type
  'Vine Whip': 'Cambuk Sulur', 'Razor Leaf': 'Daun Tajam', 'Leaf Blade': 'Bilah Daun',
  'Leaf Storm': 'Badai Daun', 'Leaf Tornado': 'Tornado Daun', 'Leafage': 'Dedaunan',
  'Magical Leaf': 'Daun Ajaib', 'Solar Beam': 'Sinar Matahari', 'Sleep Powder': 'Bubuk Tidur',
  'Stun Spore': 'Spora Pingsan', 'Poison Powder': 'Bubuk Racun', 'Cotton Spore': 'Spora Kapas',
  'Spore': 'Spora', 'Bullet Seed': 'Biji Peluru', 'Seed Bomb': 'Bom Biji',
  'Frenzy Plant': 'Tanaman Kalut', 'Power Whip': 'Cambuk Kuat', 'Wood Hammer': 'Palu Kayu',
  'Branch Poke': 'Cocokan Ranting', 'Petal Dance': 'Tarian Kelopak', 'Petal Blizzard': 'Badai Kelopak',
  'Giga Drain': 'Hisap Mega', 'Mega Drain': 'Hisap Besar', 'Absorb': 'Serap',
  'Leech Seed': 'Biji Penghisap', 'Leech Life': 'Hisap Hidup', 'Synthesis': 'Sintesis',
  'Ingrain': 'Akar', 'Trop Kick': 'Tendangan Tropis', 'Flower Trick': 'Tipuan Bunga',

  // Electric type
  'Thunder Shock': 'Sengatan Listrik', 'Thunderbolt': 'Petir', 'Thunder': 'Halilintar',
  'Thunder Fang': 'Taring Listrik', 'Thunder Punch': 'Tinju Listrik', 'Thunder Wave': 'Gelombang Listrik',
  'Volt Tackle': 'Tabrakan Volt', 'Volt Switch': 'Tukar Volt', 'Discharge': 'Lepas Muatan',
  'Spark': 'Percikan', 'Wild Charge': 'Serbuan Liar', 'Zap Cannon': 'Meriam Sengatan',
  'Electro Ball': 'Bola Listrik', 'Electroweb': 'Jaring Listrik', 'Charge': 'Pengisian',
  'Charge Beam': 'Sinar Listrik', 'Magnet Bomb': 'Bom Magnet', 'Magnet Rise': 'Magnet Terbang',
  'Nuzzle': 'Cuit Cuit', 'Bolt Strike': 'Serangan Petir', 'Fusion Bolt': 'Petir Fusi',
  'Plasma Fists': 'Tinju Plasma', 'Zing Zap': 'Zing Zap', 'Electro Drift': 'Hanyutan Listrik',
  'Double Shock': 'Sengatan Ganda',

  // Psychic type
  'Confusion': 'Kebingungan', 'Psychic': 'Psikis', 'Psybeam': 'Sinar Psi', 'Psyshock': 'Kejut Psi',
  'Psystrike': 'Serangan Psi', 'Psycho Cut': 'Sayatan Psi', 'Psycho Boost': 'Dorongan Psi',
  'Hypnosis': 'Hipnotis', 'Dream Eater': 'Pemakan Mimpi', 'Stored Power': 'Kekuatan Tersimpan',
  'Heal Pulse': 'Pulsa Sembuh', 'Future Sight': 'Pandangan Masa Depan', 'Calm Mind': 'Pikiran Tenang',
  'Light Screen': 'Layar Cahaya', 'Hyperspace Hole': 'Lubang Antariksa', 'Photon Geyser': 'Air Mancur Foton',
  'Mist Ball': 'Bola Kabut', 'Luster Purge': 'Pemurnian Kilau', 'Judgment': 'Penghakiman',
  'Prismatic Laser': 'Laser Prisma', 'Geomancy': 'Geomansia',

  // Ice type
  'Ice Beam': 'Sinar Es', 'Ice Punch': 'Tinju Es', 'Ice Fang': 'Taring Es', 'Ice Shard': 'Pecahan Es',
  'Icicle Crash': 'Hantaman Es', 'Icicle Spear': 'Tombak Es', 'Powder Snow': 'Bubuk Salju',
  'Aurora Beam': 'Sinar Aurora', 'Blizzard': 'Badai Salju', 'Frost Breath': 'Napas Beku',
  'Freeze-Dry': 'Bekukan Kering', 'Sheer Cold': 'Dingin Membeku', 'Hail': 'Hujan Es',
  'Avalanche': 'Longsoran', 'Glacial Lance': 'Tombak Gletser', 'Glaciate': 'Membekukan',

  // Fighting type
  'Mach Punch': 'Tinju Cepat', 'Bullet Punch': 'Tinju Peluru', 'Sky Uppercut': 'Pukulan Langit',
  'Sky Attack': 'Serangan Langit', 'Cross Chop': 'Tebasan Silang', 'Brick Break': 'Pemecah Bata',
  'Close Combat': 'Tarung Dekat', 'Force Palm': 'Telapak Kekuatan', 'Aura Sphere': 'Bola Aura',
  'Vacuum Wave': 'Gelombang Hampa', 'Low Kick': 'Tendangan Rendah', 'Low Sweep': 'Sapu Bawah',
  'High Jump Kick': 'Tendangan Lompat', 'Jump Kick': 'Tendangan Lompat', 'Submission': 'Penyerahan',
  'Seismic Toss': 'Lemparan Seismik', 'Vital Throw': 'Lemparan Vital', 'Counter': 'Serang Balik',
  'Mach Punch': 'Tinju Mach', 'Power-Up Punch': 'Tinju Penguat', 'Drain Punch': 'Tinju Hisap',
  'Focus Punch': 'Tinju Fokus', 'Sucker Punch': 'Tinju Curang', 'Thunder Punch': 'Tinju Petir',
  'Sacred Sword': 'Pedang Suci', 'Secret Sword': 'Pedang Rahasia', 'Aura Wheel': 'Roda Aura',
  'Arm Thrust': 'Dorongan Lengan', 'Flying Press': 'Tekanan Terbang', 'Meteor Assault': 'Serangan Meteor',
  'Behemoth Bash': 'Hantaman Behemoth', 'Behemoth Blade': 'Bilah Behemoth', 'Collision Course': 'Jalur Tabrakan',
  'Double Iron Bash': 'Hantaman Besi Ganda',

  // Poison type
  'Poison Sting': 'Sengat Racun', 'Poison Jab': 'Tusuk Racun', 'Poison Fang': 'Taring Racun',
  'Poison Tail': 'Ekor Racun', 'Poison Powder': 'Bubuk Racun', 'Toxic': 'Beracun',
  'Toxic Spikes': 'Duri Beracun', 'Sludge': 'Lumpur', 'Sludge Bomb': 'Bom Lumpur',
  'Sludge Wave': 'Gelombang Lumpur', 'Acid': 'Asam', 'Acid Spray': 'Semprot Asam',
  'Acid Armor': 'Baja Asam', 'Cross Poison': 'Racun Silang', 'Gunk Shot': 'Tembakan Sampah',
  'Smog': 'Kabut Asap', 'Venoshock': 'Kejut Bisa',

  // Ghost type
  'Lick': 'Jilatan', 'Astonish': 'Mengejutkan', 'Confuse Ray': 'Sinar Bingung', 'Night Shade': 'Bayang Malam',
  'Shadow Ball': 'Bola Bayangan', 'Shadow Punch': 'Tinju Bayangan', 'Shadow Claw': 'Cakar Bayangan',
  'Shadow Sneak': 'Selip Bayangan', 'Shadow Force': 'Pasukan Bayangan', 'Shadow Bone': 'Tulang Bayangan',
  'Phantom Force': 'Kekuatan Hantu', 'Hex': 'Mantra', 'Curse': 'Kutukan', 'Spite': 'Dendam',
  'Nightmare': 'Mimpi Buruk', 'Astral Barrage': 'Tembakan Astral', 'Spirit Shackle': 'Belenggu Roh',
  'Spectral Thief': 'Pencuri Hantu', 'Moongeist Beam': 'Sinar Hantu Bulan',

  // Dragon type
  'Dragon Rage': 'Murka Naga', 'Dragon Breath': 'Napas Naga', 'Dragon Tail': 'Ekor Naga',
  'Dragon Pulse': 'Pulsa Naga', 'Dragon Claw': 'Cakar Naga', 'Dragon Rush': 'Serbuan Naga',
  'Dragon Dance': 'Tarian Naga', 'Dragon Ascent': 'Naga Naik', 'Outrage': 'Murka',
  'Twister': 'Pusaran', 'Roar of Time': 'Auman Waktu', 'Spacial Rend': 'Sobekan Ruang',
  'Draco Meteor': 'Meteor Naga', 'Clanging Scales': 'Sisik Berdentang', 'Eternabeam': 'Sinar Eterna',
  'Dynamax Cannon': 'Meriam Dynamax', 'Fleur Cannon': 'Meriam Bunga',

  // Dark type
  'Bite': 'Gigitan', 'Crunch': 'Gigit Keras', 'Dark Pulse': 'Pulsa Kegelapan', 'Dark Void': 'Lubang Gelap',
  'Foul Play': 'Permainan Curang', 'Knock Off': 'Tinju Lepas', 'Pursuit': 'Mengejar',
  'Sucker Punch': 'Pukulan Curang', 'Throat Chop': 'Tebasan Tenggorokan', 'Power Trip': 'Sandungan Kuat',
  'Beat Up': 'Pukuli', 'Embargo': 'Embargo', 'Punishment': 'Hukuman', 'Snarl': 'Gerutu',
  'Lash Out': 'Cambuk Keluar', 'Ruination': 'Kehancuran', 'Darkest Lariat': 'Lariat Gelap',
  'Hyperspace Fury': 'Murka Antariksa', 'Black Hole Eclipse': 'Gerhana Lubang Hitam',

  // Steel type
  'Metal Claw': 'Cakar Logam', 'Iron Tail': 'Ekor Besi', 'Iron Head': 'Kepala Besi',
  'Iron Defense': 'Pertahanan Besi', 'Steel Wing': 'Sayap Baja', 'Steel Beam': 'Sinar Baja',
  'Flash Cannon': 'Meriam Kilat', 'Magnet Bomb': 'Bom Magnet', 'Mirror Shot': 'Tembakan Cermin',
  'Heavy Slam': 'Hantaman Berat', 'Anchor Shot': 'Tembakan Jangkar', 'Smart Strike': 'Serangan Pintar',
  'Sunsteel Strike': 'Serangan Matahari Baja', 'Meteor Mash': 'Hantaman Meteor', 'Bullet Punch': 'Tinju Peluru',
  'Gear Up': 'Persiapan', 'Magnet Rise': 'Magnet Terbang', 'Doom Desire': 'Hasrat Kiamat',
  'Techno Blast': 'Ledakan Tekno', 'Gyro Ball': 'Bola Giro',

  // Flying type
  'Gust': 'Hembusan Angin', 'Wing Attack': 'Serangan Sayap', 'Peck': 'Patukan', 'Drill Peck': 'Patuk Bor',
  'Fly': 'Terbang', 'Brave Bird': 'Burung Berani', 'Sky Attack': 'Serangan Langit', 'Aerial Ace': 'Jurus Udara',
  'Air Slash': 'Tebasan Udara', 'Air Cutter': 'Pemotong Udara', 'Hurricane': 'Topan',
  'Bounce': 'Pantulan', 'Acrobatics': 'Akrobat', 'U-turn': 'Putar Balik', 'Roost': 'Bertelur',
  'Pluck': 'Petik', 'Tailwind': 'Angin Buntut', 'Defog': 'Hilangkan Kabut', 'Mirror Move': 'Cermin Gerakan',
  'Sky Drop': 'Jatuh Langit', 'Oblivion Wing': 'Sayap Kelupaan', 'Aeroblast': 'Ledakan Udara',
  'Hurricane': 'Badai Topan',

  // Bug type
  'Bug Bite': 'Gigitan Serangga', 'Bug Buzz': 'Dengung Serangga', 'String Shot': 'Tembakan Benang',
  'Silver Wind': 'Angin Perak', 'X-Scissor': 'Gunting Silang', 'Megahorn': 'Tanduk Mega',
  'Pin Missile': 'Misil Jarum', 'Lunge': 'Terkam', 'Spider Web': 'Jaring Laba', 'Quiver Dance': 'Tarian Bergetar',
  'Powder': 'Bubuk', 'Struggle Bug': 'Pertarungan Serangga', 'Steamroller': 'Mesin Uap',
  'Fury Cutter': 'Pemotong Murka', 'Twineedle': 'Jarum Ganda', 'Rage Powder': 'Bubuk Murka',
  'Attack Order': 'Perintah Serang', 'Defend Order': 'Perintah Bela', 'Heal Order': 'Perintah Sembuh',

  // Rock type
  'Rock Throw': 'Lemparan Batu', 'Rock Slide': 'Longsor Batu', 'Rock Tomb': 'Makam Batu',
  'Rock Blast': 'Ledakan Batu', 'Rock Polish': 'Poles Batu', 'Stone Edge': 'Tepi Batu',
  'Stealth Rock': 'Batu Siluman', 'Sandstorm': 'Badai Pasir', 'Rollout': 'Gulung Cepat',
  'Power Gem': 'Permata Kekuatan', 'Ancient Power': 'Kekuatan Kuno', 'Head Smash': 'Hantaman Kepala',
  'Diamond Storm': 'Badai Berlian', 'Accelerock': 'Batu Cepat',

  // Ground type
  'Earthquake': 'Gempa Bumi', 'Earth Power': 'Kekuatan Bumi', 'Mud Bomb': 'Bom Lumpur',
  'Mud Slap': 'Tampar Lumpur', 'Mud Shot': 'Tembakan Lumpur', 'Magnitude': 'Magnitudo',
  'Dig': 'Menggali', 'Bone Rush': 'Serbuan Tulang', 'Bone Club': 'Pentungan Tulang',
  'Bonemerang': 'Bumerang Tulang', 'Sand Tomb': 'Makam Pasir', 'Drill Run': 'Bor Lari',
  'High Horsepower': 'Tenaga Kuda', 'Spikes': 'Duri', 'Shore Up': 'Penopang', 'Fissure': 'Celah Bumi',

  // Fairy type
  'Fairy Wind': 'Angin Peri', 'Moonblast': 'Ledakan Bulan', 'Dazzling Gleam': 'Kilau Mempesona',
  'Disarming Voice': 'Suara Lembut', 'Draining Kiss': 'Ciuman Menyedot', 'Play Rough': 'Main Kasar',
  'Sweet Kiss': 'Ciuman Manis', 'Misty Terrain': 'Kabut Tipis', 'Spirit Break': 'Patah Roh',

  // Special / Unique moves not in any category
  'Roar': 'Auman', 'Coil': 'Lilitan', 'Taunt': 'Provokasi', 'Dizzy Punch': 'Tinju Pusing',
  'Confide': 'Berbisik', 'Trick': 'Tipuan', 'Block': 'Halangi', 'Shell Trap': 'Jebakan Cangkang',
  'Smokescreen': 'Layar Asap', 'Power Trick': 'Trik Kekuatan', 'Horn Attack': 'Serangan Tanduk',
  'Assist': 'Bantuan', 'Recycle': 'Daur Ulang', 'Skull Bash': 'Hantaman Tengkorak',
}

// Helper: lookup with fallback to empty string (so renderer can hide the
// Indonesian line when no translation exists).
function moveID(eng) {
  return MOVE_ID[eng] || ''
}
