/* games/train-journey.js — the shared 48-leg train journey (v55.80)
 *
 * One source of truth for the painterly-backdrop journey, consumed by all three train
 * games (balapan-kereta · lokomotif-pemberani · balapan-kereta-side) so every game names
 * the SAME leg the painterly plate is showing. `name` is the leg "A → B" (HUD ticket +
 * cinematic). biome/landmark = procedural fallback for any leg still awaiting a backdrop.
 *
 * API: window.TRAIN_JOURNEY (array) + window.TrainJourney = {
 *        LEGS, count, leg(level)->obj, name(level)->string }   (level is 1-based, wraps mod 48)
 */
(function () {
  'use strict'
  const LEGS = [
    // ── L1-30 — "Petualangan Rel Nusantara": authoritative 30-leg route
    //    Jakarta Gambir → Surabaya → Banyuwangi → FERRY → Bali → Denpasar.
    { name: 'Gambir → Bekasi',               region: 'Jakarta',     biome: 'urbanID',     landmark: 'monas' },
    { name: 'Bekasi → Cikarang',             region: 'Jawa Barat',  biome: 'urbanID',     landmark: 'skyline' },
    { name: 'Cikarang → Karawang',           region: 'Jawa Barat',  biome: 'javaLush',    landmark: 'none' },
    { name: 'Karawang → Cikampek',           region: 'Jawa Barat',  biome: 'javaLush',    landmark: 'none' },
    { name: 'Cikampek → Cirebon',            region: 'Jawa Barat',  biome: 'coastal',     landmark: 'colonial' },
    { name: 'Cirebon → Tegal',               region: 'Jawa Tengah', biome: 'coastal',     landmark: 'none' },
    { name: 'Tegal → Pekalongan',            region: 'Jawa Tengah', biome: 'coastal',     landmark: 'none' },
    { name: 'Pekalongan → Semarang Tawang',  region: 'Jawa Tengah', biome: 'urbanID',     landmark: 'colonial' },
    { name: 'Semarang Tawang → Ngrombo',     region: 'Jawa Tengah', biome: 'javaLush',    landmark: 'none' },
    { name: 'Ngrombo → Cepu',                region: 'Jawa Tengah', biome: 'javaLush',    landmark: 'none' },
    { name: 'Cepu → Bojonegoro',             region: 'Jawa Timur',  biome: 'javaLush',    landmark: 'none' },
    { name: 'Bojonegoro → Babat',            region: 'Jawa Timur',  biome: 'javaLush',    landmark: 'none' },
    { name: 'Babat → Lamongan',              region: 'Jawa Timur',  biome: 'javaLush',    landmark: 'none' },
    { name: 'Lamongan → Surabaya Pasarturi', region: 'Jawa Timur',  biome: 'urbanID',     landmark: 'skyline' },
    { name: 'Surabaya Gubeng → Sidoarjo',    region: 'Jawa Timur',  biome: 'urbanID',     landmark: 'skyline' },
    { name: 'Sidoarjo → Bangil',             region: 'Jawa Timur',  biome: 'javaLush',    landmark: 'none' },
    { name: 'Bangil → Pasuruan',             region: 'Jawa Timur',  biome: 'coastal',     landmark: 'none' },
    { name: 'Pasuruan → Probolinggo',        region: 'Jawa Timur',  biome: 'coastal',     landmark: 'none' },
    { name: 'Probolinggo → Klakah',          region: 'Jawa Timur',  biome: 'highlandID',  landmark: 'volcano' },
    { name: 'Klakah → Tanggul',              region: 'Jawa Timur',  biome: 'javaLush',    landmark: 'volcano' },
    { name: 'Tanggul → Jember',              region: 'Jawa Timur',  biome: 'javaLush',    landmark: 'none' },
    { name: 'Jember → Rambipuji',            region: 'Jawa Timur',  biome: 'javaLush',    landmark: 'none' },
    { name: 'Rambipuji → Kalibaru',          region: 'Jawa Timur',  biome: 'highlandID',  landmark: 'volcano' },
    { name: 'Kalibaru → Kalisetail',         region: 'Jawa Timur',  biome: 'highlandID',  landmark: 'volcano' },
    { name: 'Kalisetail → Rogojampi',        region: 'Jawa Timur',  biome: 'javaLush',    landmark: 'none' },
    { name: 'Rogojampi → Banyuwangi Kota',   region: 'Jawa Timur',  biome: 'coastal',     landmark: 'none' },
    { name: 'Banyuwangi Kota → Ketapang',    region: 'Jawa Timur',  biome: 'coastal',     landmark: 'none' },
    { name: 'Ketapang → Gilimanuk',          region: 'Selat Bali',  biome: 'coastal',     landmark: 'none' },
    { name: 'Gilimanuk → Negara',            region: 'Bali',        biome: 'coastal',     landmark: 'none' },
    { name: 'Negara → Denpasar',             region: 'Bali',        biome: 'urbanID',     landmark: 'none' },
    // ── L31-33 — East Java extension (Krian junction near Surabaya).
    { name: 'Mojokerto → Krian',             region: 'Jawa Timur',  biome: 'javaLush',    landmark: 'none' },
    { name: 'Krian → Sidoarjo',              region: 'Jawa Timur',  biome: 'javaLush',    landmark: 'none' },
    { name: 'Krian → Surabaya Gubeng',       region: 'Jawa Timur',  biome: 'urbanID',     landmark: 'skyline' },
    // ── L34-48 — "Keliling Dunia": 15 great worldwide scenic rail journeys.
    { name: 'Chur → St. Moritz',             region: 'Swiss',       biome: 'alpine',      landmark: 'alps' },      // 34 Glacier Express
    { name: 'Tirano → St. Moritz',           region: 'Swiss',       biome: 'alpine',      landmark: 'alps' },      // 35 Bernina Express
    { name: 'München → Garmisch',            region: 'Bavaria',     biome: 'germanCrisp', landmark: 'clocktower' }, // 36 Bavaria
    { name: 'Fort William → Mallaig',        region: 'Skotlandia',  biome: 'englishGrey', landmark: 'bridge' },    // 37 Jacobite / Glenfinnan
    { name: 'Myrdal → Flåm',                 region: 'Norwegia',    biome: 'alpine',      landmark: 'alps' },      // 38 Flåmsbana fjord
    { name: 'Wina → Semmering',              region: 'Austria',     biome: 'germanCrisp', landmark: 'alps' },      // 39 Semmeringbahn
    { name: 'Venesia → Firenze',             region: 'Italia',      biome: 'romanWarm',   landmark: 'domes' },     // 40 Italy
    { name: 'Nice → Monako',                 region: 'Prancis',     biome: 'coastal',     landmark: 'none' },      // 41 Riviera coast
    { name: 'Danau Baikal',                  region: 'Rusia',       biome: 'taiga',       landmark: 'bridge' },    // 42 Circum-Baikal
    { name: 'Denver → Glenwood Springs',     region: 'Amerika',     biome: 'alpine',      landmark: 'alps' },      // 43 Rockies
    { name: 'Jasper → Vancouver',            region: 'Kanada',      biome: 'alpine',      landmark: 'alps' },      // 44 Canadian Rockies
    { name: 'Tokyo → Gunung Fuji',           region: 'Jepang',      biome: 'germanCrisp', landmark: 'volcano' },   // 45 Shinkansen + Fuji
    { name: 'Kyoto → Arashiyama',            region: 'Jepang',      biome: 'javaLush',    landmark: 'none' },      // 46 bamboo grove
    { name: 'Lhasa → Nyingchi',              region: 'Tibet',       biome: 'alpine',      landmark: 'alps' },      // 47 Tibet plateau
    { name: 'Kalka → Shimla',                region: 'India',       biome: 'alpine',      landmark: 'alps' },      // 48 Himalayan toy train
  ]
  const leg = (level) => LEGS[(((level || 1) - 1) % LEGS.length + LEGS.length) % LEGS.length] || LEGS[0]
  window.TRAIN_JOURNEY = LEGS
  window.TrainJourney = { LEGS, count: LEGS.length, leg, name: (level) => leg(level).name }
})()
