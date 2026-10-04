/* =============================================================================
 * mojo-chase-atmos-data.js — window.MojoChaseAtmosData: the ATMOSPHERE tables for the G31 Rescue Chase
 * (time of day, weather, per-biome pools, mid-race transitions, sky life, Bo callouts). Read by
 * games/mojo-chase-atmos.js. Pure data, no logic. Owner rules: Indonesian text, no emoji.
 *
 *   TIMES     5 keys on a continuous axis t = 0 pagi .. 1 siang .. 2 sore .. 3 senja .. 4 malam
 *   WEATHER   cerah | berawan | hujan (gerimis below intensity 0.55) | salju | angin | kabut
 *   KIND      stage id -> biome kind; POOL kind -> weighted times + weathers + sky life + allowed transitions
 *   TRANS     mid-race transitions (about half of the runs roll one)
 * ==========================================================================*/
(function (W) {
  'use strict'
  // sky: [top, middle, horizon]; sun/moon x,y as fractions of the view width / horizon height; glow = bloom colour;
  // cloud: [lit, shade]; fog: [colour, density]; tint: FAR/MID/props ambient tint [colour, alpha]; stars 0..1
  var TIMES = [
    { id: 'pagi', label: 'Pagi', sky: ['#5ea7ee', '#a9d3f4', '#ffe0c0'], sun: [0.2, 0.56, 0.26, 0.9], glow: '#ffe2a8', disc: '#fff6dc',
      moon: [0.8, 0.2, 0], cloud: ['#fff3e6', '#c9d4e6'], fog: ['#eef2f8', 0.1], tint: ['#ffcf94', 0.07], shadow: 1.6, stars: 0 },
    { id: 'siang', label: 'Siang', sky: ['#2c7ce0', '#78b9f2', '#d4ebff'], sun: [0.72, 0.2, 0.3, 0.95], glow: '#fffbe6', disc: '#ffffff',
      moon: [0.8, 0.2, 0], cloud: ['#ffffff', '#cbd9ea'], fog: ['#ffffff', 0.06], tint: ['#ffffff', 0], shadow: 0.6, stars: 0 },
    { id: 'sore', label: 'Sore', sky: ['#3b6cc2', '#eeb26e', '#ffd27c'], sun: [0.76, 0.6, 0.38, 0.95], glow: '#ffc055', disc: '#fff0c4',
      moon: [0.2, 0.3, 0], cloud: ['#ffdca4', '#c48a80'], fog: ['#ffcf94', 0.14], tint: ['#ff9a3c', 0.11], shadow: 2.4, stars: 0 },
    { id: 'senja', label: 'Senja', sky: ['#28296c', '#b0558a', '#ff8d5c'], sun: [0.8, 0.98, 0.44, 0.85], glow: '#ff6b3a', disc: '#ffb070',
      moon: [0.22, 0.32, 0.35], cloud: ['#ffa2aa', '#6c4a7c'], fog: ['#b07092', 0.16], tint: ['#5a3a8c', 0.22], shadow: 3.2, stars: 0.35 },
    { id: 'malam', label: 'Malam', sky: ['#060a28', '#141f58', '#2e3c7c'], sun: [0.84, 1.2, 0.3, 0], glow: '#ff6b3a', disc: '#ffb070',
      moon: [0.22, 0.26, 1], cloud: ['#4c588a', '#1c2346'], fog: ['#1c2550', 0.2], tint: ['#16225c', 0.36], shadow: 0, stars: 1 }
  ]
  // overcast: the sky is mixed toward `over` by cover x darken; tint gains the same
  var WEATHER = {
    cerah: { label: 'Cerah', cover: 0.2, over: '#9fb0c4', darken: 0 },
    berawan: { label: 'Berawan', cover: 0.75, over: '#8f9cae', darken: 0.22 },
    hujan: { label: 'Hujan', soft: 'Gerimis', cover: 1, over: '#4e5b6c', darken: 0.42, wet: true },
    salju: { label: 'Salju', cover: 0.6, over: '#dde5ef', darken: 0.25 },
    angin: { label: 'Angin sepoi', cover: 0.35, over: '#a8b8c8', darken: 0.05 },
    kabut: { label: 'Berkabut', cover: 0.55, over: '#c6ced8', darken: 0.3 }
  }
  // stage id -> kind (a stage that is not listed falls back to look, then biome)
  var KIND = { pantai: 'coast', kota: 'town', hutan: 'forest', gurun: 'desert', salju: 'snow', jembatan: 'coast', proyek: 'construction', desa: 'farm',
    malam: 'citynight', terowongan: 'tunnel', rimba: 'jungle', 'gunung-api': 'volcano', 'tol-malam': 'citynight', 'musim-gugur': 'autumn', sakura: 'cherry',
    hujan: 'raincity', resor: 'beach', 'kereta-ngarai': 'canyon', 'kincir-angin': 'windfarm', antariksa: 'space', perumahan: 'suburb', pelabuhan: 'harbour',
    stadion: 'stadium', candi: 'ruins', permen: 'candy' }
  var BY_BIOME = { coastal: 'coast', town: 'town', forest: 'forest', desert: 'desert', snow: 'snow', construction: 'construction', farm: 'farm', city: 'town' }
  // motes: what the breeze carries; life: sky-life kinds this biome may spawn (time and weather gate them further)
  var DAY = { pagi: 2, siang: 4, sore: 3, senja: 1, malam: 1 }
  var POOL = {
    coast: { times: DAY, weather: { cerah: 5, berawan: 2, angin: 2 }, motes: 'sand', life: ['gulls', 'sail', 'dolphin', 'balloon', 'plane', 'flock', 'shoot'] },
    beach: { times: { pagi: 2, siang: 5, sore: 3, senja: 1 }, weather: { cerah: 6, angin: 2, berawan: 1 }, motes: 'sand', life: ['gulls', 'sail', 'dolphin', 'balloon', 'plane', 'flock', 'shoot'] },
    town: { times: DAY, weather: { cerah: 4, berawan: 2, hujan: 2, angin: 1, kabut: 1 }, motes: 'green', life: ['balloon', 'plane', 'flock', 'shoot'] },
    suburb: { times: DAY, weather: { cerah: 4, berawan: 2, hujan: 1, angin: 1 }, motes: 'green', life: ['butterfly', 'kite', 'balloon', 'plane', 'flock', 'shoot'] },
    citynight: { times: { senja: 1, malam: 4 }, weather: { cerah: 2, berawan: 1, hujan: 3 }, motes: 'dust', life: ['plane', 'shoot'] },
    raincity: { times: { siang: 2, sore: 1, senja: 1, malam: 1 }, weather: { hujan: 1 }, motes: 'dust', life: ['plane', 'shoot'] },
    forest: { times: DAY, weather: { cerah: 3, berawan: 2, hujan: 2, angin: 2, kabut: 2 }, motes: 'green', life: ['flock', 'plane', 'shoot', 'fireflies'] },
    jungle: { times: DAY, weather: { cerah: 2, berawan: 2, hujan: 2, kabut: 2 }, motes: 'green', life: ['flock', 'shoot', 'fireflies'], ambient: ['mist'] },
    ruins: { times: DAY, weather: { cerah: 3, berawan: 2, kabut: 2, angin: 1 }, motes: 'autumn', life: ['flock', 'balloon', 'shoot', 'fireflies'] },
    desert: { times: { pagi: 1, siang: 3, sore: 4, senja: 2, malam: 1 }, weather: { cerah: 5, angin: 3, berawan: 1 }, motes: 'dust', life: ['plane', 'balloon', 'flock', 'shoot'] },
    canyon: { times: { pagi: 1, siang: 2, sore: 4, senja: 2, malam: 1 }, weather: { cerah: 5, angin: 3, berawan: 1 }, motes: 'dust', life: ['train', 'flock', 'plane', 'shoot'] },
    volcano: { times: { siang: 2, sore: 3, senja: 3, malam: 2 }, weather: { cerah: 3, berawan: 2, angin: 1 }, motes: 'dust', life: ['flock', 'shoot'], ambient: ['smoke'] },
    snow: { times: DAY, weather: { salju: 5, cerah: 2, berawan: 1, kabut: 1 }, motes: 'snow', life: ['flock', 'plane', 'shoot'], ambient: ['aurora'] },
    farm: { times: DAY, weather: { cerah: 4, berawan: 2, angin: 3, hujan: 1 }, motes: 'green', life: ['butterfly', 'balloon', 'flock', 'plane', 'shoot', 'fireflies'] },
    autumn: { times: { pagi: 1, siang: 2, sore: 5, senja: 2, malam: 1 }, weather: { angin: 4, cerah: 2, berawan: 1 }, motes: 'autumn', life: ['flock', 'balloon', 'shoot'] },
    cherry: { times: DAY, weather: { angin: 4, cerah: 3 }, motes: 'petal', life: ['butterfly', 'balloon', 'flock', 'shoot'] },
    windfarm: { times: DAY, weather: { angin: 5, cerah: 2, berawan: 2 }, motes: 'green', life: ['kite', 'balloon', 'flock', 'plane', 'shoot'], ambient: ['turbines'] },
    harbour: { times: DAY, weather: { cerah: 3, berawan: 2, hujan: 2, kabut: 2 }, motes: 'dust', life: ['gulls', 'sail', 'plane', 'shoot'] },
    construction: { times: DAY, weather: { cerah: 3, berawan: 2, angin: 2 }, motes: 'dust', life: ['plane', 'balloon', 'flock', 'shoot'] },
    stadium: { times: { siang: 2, sore: 3, senja: 3, malam: 3 }, weather: { cerah: 4, berawan: 1 }, motes: 'dust', life: ['fireworks', 'blimp', 'plane', 'shoot'] },
    candy: { times: { pagi: 2, siang: 4, sore: 2 }, weather: { cerah: 5, angin: 1 }, motes: 'petal', life: ['balloon', 'butterfly', 'flock'], ambient: ['confetti'] },
    space: { times: { malam: 1 }, weather: { cerah: 1 }, motes: null, life: ['satellite', 'shoot'], ambient: ['planets'], noTrans: true },
    tunnel: { times: { pagi: 1, siang: 3, sore: 2 }, weather: { cerah: 3, berawan: 1 }, motes: null, life: ['plane', 'balloon', 'flock'] }
  }
  // motes (breeze particles) colour pairs + shape
  var MOTES = { green: { c: ['#7fb24a', '#b4d063'], leaf: true }, autumn: { c: ['#e98a2e', '#c9542a'], leaf: true }, petal: { c: ['#ffc2da', '#ffe3ee'], leaf: true },
    dust: { c: ['#e6cfa0', '#d6b27c'], leaf: false }, sand: { c: ['#f0dcb0', '#e2c48e'], leaf: false }, snow: { c: ['#ffffff', '#e8f0fa'], leaf: false } }
  // sky life: time window on the t axis [from, to], whether it is a notable "journey moment", weight
  var LIFE = {
    shoot: { t: [3.2, 4.1], moment: 'Lihat, bintang jatuh!', w: 4, life: 1.1 },
    flock: { t: [1.7, 3.3], moment: 'Lihat, burung-burung pulang ke sarang!', w: 4, life: 16 },
    gulls: { t: [0, 2.6], w: 3, life: 14 },
    butterfly: { t: [0, 2.2], w: 3, life: 12 },
    balloon: { t: [0, 2.4], moment: 'Wah, ada balon udara!', w: 2, life: 30 },
    blimp: { t: [0.5, 2.6], moment: 'Lihat, ada kapal udara!', w: 2, life: 30 },
    kite: { t: [0, 2.3], moment: 'Ada layang-layang terbang tinggi!', w: 3, life: 20 },
    plane: { t: [0, 4.1], w: 2, life: 16 },
    dolphin: { t: [0, 2.6], moment: 'Lihat, lumba-lumba melompat!', w: 2, life: 2.2 },
    sail: { t: [0, 3], w: 2, life: 34 },
    train: { t: [0, 4.1], moment: 'Lihat, kereta lewat di jembatan!', w: 4, life: 18 },
    fireworks: { t: [2.7, 4.1], moment: 'Wah, kembang api!', w: 5, life: 2.4 },
    satellite: { t: [0, 4.1], w: 3, life: 20 },
    fireflies: { t: [3.1, 4.1], w: 3, life: 18 }
  }
  // transitions: what they need from the pool, how they move t (time) or the weather intensity
  var TRANS = {
    'sore-malam': { needTime: 'malam', label: 'Sore ke Malam' },
    'siang-sore': { needTime: 'sore', label: 'Siang ke Sore' },
    'hujan-datang': { needWeather: 'hujan', label: 'Cerah lalu Hujan' },
    'hujan-reda': { needWeather: 'hujan', label: 'Hujan lalu Pelangi' },
    'salju-tebal': { needWeather: 'salju', label: 'Salju makin tebal' }
  }
  var SAY = { rainStart: 'Wah, mulai hujan!', rainStop: 'Hujannya reda. Lihat, ada pelangi!', night: 'Sudah malam, lampu dinyalakan!',
    sunset: 'Matahari mulai terbenam. Cantik sekali!', snow: 'Saljunya makin tebal. Hati-hati, Mojo!' }
  W.MojoChaseAtmosData = { TIMES: TIMES, WEATHER: WEATHER, KIND: KIND, BY_BIOME: BY_BIOME, POOL: POOL, MOTES: MOTES, LIFE: LIFE, TRANS: TRANS, SAY: SAY }
})(typeof window !== 'undefined' ? window : globalThis)
