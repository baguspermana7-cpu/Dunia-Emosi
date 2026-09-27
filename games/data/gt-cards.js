/* ============================================================================
 * gt-cards.js — window.GTCards. Garasi Tempur card definitions (Phase 1).
 * PRD: documentation and standarization/MONSTER_TRUCK_TCG_PRD_v2.md
 *
 * ORIGINAL trucks only (owner decision): look-alike colours/silhouettes are fine,
 * real names/logos (Monster Jam, Grave Digger, El Toro Loco, Max-D, Megalodon) are
 * not. Numbers stay small (HP 10–20, damage 1–7). Art refs are filled in when the
 * owner's sheets arrive; the engine never reads them.
 * ==========================================================================*/
(function () {
  'use strict'
  var W = (typeof window !== 'undefined' ? window : globalThis)

  var TYPES = {
    POWER: { name: 'POWER', id: 'Tenaga', color: '#E53935' },
    SPEED: { name: 'SPEED', id: 'Cepat', color: '#FBC02D' },
    MUD:   { name: 'MUD',   id: 'Lumpur', color: '#6D8B3A' },
    STUNT: { name: 'STUNT', id: 'Akrobat', color: '#8E44D6' },
    ARMOR: { name: 'ARMOR', id: 'Baja', color: '#4A77B4' },
    TECH:  { name: 'TECH',  id: 'Teknik', color: '#16A3A0' }
  }

  // trucks: hp, strongVs (+1 damage vs that Type), two attacks {name, fuel, dmg}
  var TRUCKS = [
    { id: 'banteng-api',    name: 'Banteng Api',    type: 'POWER', hp: 14, strongVs: 'ARMOR', attacks: [{ name: 'Seruduk Tanduk', fuel: 1, dmg: 2 }, { name: 'Banteng Ngamuk', fuel: 2, dmg: 4 }] },
    { id: 'palu-merah',     name: 'Palu Merah',     type: 'POWER', hp: 15, strongVs: 'ARMOR', attacks: [{ name: 'Pukulan Palu', fuel: 1, dmg: 2 }, { name: 'Hantam Bumi', fuel: 3, dmg: 5 }] },
    { id: 'petir-kuning',   name: 'Petir Kuning',   type: 'SPEED', hp: 11, strongVs: 'MUD',   attacks: [{ name: 'Lesat Kilat', fuel: 1, dmg: 2 }, { name: 'Nitro Lewat', fuel: 2, dmg: 3 }] },
    { id: 'elang-kencang',  name: 'Elang Kencang',  type: 'SPEED', hp: 12, strongVs: 'MUD',   attacks: [{ name: 'Sambar Cepat', fuel: 0, dmg: 1 }, { name: 'Terjang Angin', fuel: 2, dmg: 4 }] },
    { id: 'gajah-lumpur',   name: 'Gajah Lumpur',   type: 'MUD',   hp: 18, strongVs: 'STUNT', attacks: [{ name: 'Cipratan Lumpur', fuel: 1, dmg: 2 }, { name: 'Banting Rawa', fuel: 2, dmg: 3 }] },
    { id: 'kuburan-hijau',  name: 'Kuburan Hijau',  type: 'MUD',   hp: 16, strongVs: 'STUNT', attacks: [{ name: 'Remuk Tulang', fuel: 1, dmg: 3 }, { name: 'Hantam Makam', fuel: 3, dmg: 5 }] },
    { id: 'hantu-salto',    name: 'Hantu Salto',    type: 'STUNT', hp: 12, strongVs: 'SPEED', attacks: [{ name: 'Lompat Ramp', fuel: 1, dmg: 2 }, { name: 'Salto Hantu', fuel: 2, dmg: 3 }] },
    { id: 'hiu-biru',       name: 'Hiu Biru',       type: 'STUNT', hp: 13, strongVs: 'SPEED', attacks: [{ name: 'Gigitan Hiu', fuel: 1, dmg: 2 }, { name: 'Terkaman Ombak', fuel: 3, dmg: 5 }] },
    { id: 'badak-baja',     name: 'Badak Baja',     type: 'ARMOR', hp: 19, strongVs: 'TECH',  attacks: [{ name: 'Dorong Baja', fuel: 1, dmg: 2 }, { name: 'Tanduk Badak', fuel: 2, dmg: 4 }] },
    { id: 'duri-emas',      name: 'Duri Emas',      type: 'ARMOR', hp: 12, strongVs: 'TECH',  attacks: [{ name: 'Tusukan Duri', fuel: 1, dmg: 4 }, { name: 'Banting Duri', fuel: 3, dmg: 6 }] },
    { id: 'tokek-turbo',    name: 'Tokek Turbo',    type: 'TECH',  hp: 13, strongVs: 'POWER', attacks: [{ name: 'Gigi Roda', fuel: 1, dmg: 2 }, { name: 'Logika Turbo', fuel: 2, dmg: 3 }] },
    { id: 'robot-gerigi',   name: 'Robot Gerigi',   type: 'TECH',  hp: 14, strongVs: 'POWER', attacks: [{ name: 'Setrum Kecil', fuel: 1, dmg: 2 }, { name: 'Laser Gerigi', fuel: 3, dmg: 5 }] }
  ]

  // parts: slot tire|body|engine; hp (+max & current), dmg (+ to every attack), armor (− incoming)
  var PARTS = [
    { id: 'ban-raksasa',   name: 'Ban Raksasa',    slot: 'tire',   hp: 2 },
    { id: 'ban-lumpur',    name: 'Ban Lumpur',     slot: 'tire',   hp: 1, arenaGrip: true },
    { id: 'ban-duri',      name: 'Ban Duri',       slot: 'tire',   dmg: 1 },
    { id: 'roda-nitro',    name: 'Roda Nitro',     slot: 'tire',   nitro: 1 },
    { id: 'bemper-baja',   name: 'Bemper Baja',    slot: 'body',   armor: 1 },
    { id: 'bemper-duri',   name: 'Bemper Duri',    slot: 'body',   dmg: 1 },
    { id: 'rangka-kuat',   name: 'Rangka Kuat',    slot: 'body',   hp: 3 },
    { id: 'bodi-ringan',   name: 'Bodi Ringan',    slot: 'body',   hp: 1, dmg: 1 },
    { id: 'mesin-v8',      name: 'Mesin V8',       slot: 'engine', dmg: 1 },
    { id: 'turbo',         name: 'Turbo',          slot: 'engine', dmg: 2, fuelTax: 1 },
    { id: 'mesin-pintar',  name: 'Mesin Pintar',   slot: 'engine', nitro: 1 },
    { id: 'nitro-ganda',   name: 'Nitro Ganda',    slot: 'engine', dmg: 1, nitro: 1 }
  ]

  // actions (Aksi/Kru): played from hand in the Garage phase, then discarded
  var ACTIONS = [
    { id: 'kit-perbaikan', name: 'Kit Perbaikan',   effect: 'heal', value: 4 },
    { id: 'kru-bengkel',   name: 'Kru Bengkel',     effect: 'draw', value: 1 },
    { id: 'jeriken-extra', name: 'Jeriken Ekstra',  effect: 'fuel', value: 1 },
    { id: 'tantangan-hitung', name: 'Tantangan Hitung', effect: 'boost', value: 2 },
    { id: 'setel-sempurna', name: 'Setel Sempurna', effect: 'nitro', value: 2 },
    { id: 'derek',         name: 'Derek',           effect: 'switch', value: 0 }
  ]

  var FUEL = { id: 'bahan-bakar', name: 'Bahan Bakar' }

  // arenas: one global rule, shown as icon + one sentence
  var ARENAS = [
    { id: 'lumpur',   name: 'Kolam Lumpur',   rule: 'MUD +1 kerusakan. SPEED −1 kerusakan.', mod: { MUD: 1, SPEED: -1 } },
    { id: 'ramp',     name: 'Ramp Raksasa',   rule: 'STUNT +1 kerusakan. Jawaban benar memberi Nitro +1 lagi.', mod: { STUNT: 1 }, nitroBonus: 1 },
    { id: 'malam',    name: 'Stadion Malam',  rule: 'Jawaban benar mengisi Nitro 2.', mod: {}, nitroPerCorrect: 2 }
  ]

  // starter decks: 20 cards = 3 trucks + 7 fuel + 6 parts + 4 actions (PRD v2 §4)
  function deck (trucks, parts, actions) {
    var d = trucks.slice()
    for (var i = 0; i < 7; i++) d.push('bahan-bakar')
    return d.concat(parts, actions)
  }
  var STARTERS = {
    api:    { name: 'Tim Api',    trucks: ['banteng-api', 'palu-merah', 'petir-kuning'],
      deck: deck(['banteng-api', 'palu-merah', 'petir-kuning'], ['ban-duri', 'bemper-duri', 'mesin-v8', 'ban-raksasa', 'turbo', 'rangka-kuat'], ['kit-perbaikan', 'tantangan-hitung', 'jeriken-extra', 'kru-bengkel']) },
    lumpur: { name: 'Tim Lumpur', trucks: ['gajah-lumpur', 'kuburan-hijau', 'badak-baja'],
      deck: deck(['gajah-lumpur', 'kuburan-hijau', 'badak-baja'], ['ban-lumpur', 'rangka-kuat', 'bemper-baja', 'ban-raksasa', 'mesin-v8', 'bodi-ringan'], ['kit-perbaikan', 'kit-perbaikan', 'derek', 'tantangan-hitung']) },
    kilat:  { name: 'Tim Kilat',  trucks: ['elang-kencang', 'hantu-salto', 'tokek-turbo'],
      deck: deck(['elang-kencang', 'hantu-salto', 'tokek-turbo'], ['roda-nitro', 'mesin-pintar', 'nitro-ganda', 'bodi-ringan', 'ban-duri', 'bemper-baja'], ['setel-sempurna', 'kru-bengkel', 'tantangan-hitung', 'jeriken-extra']) },
    baja:   { name: 'Tim Baja',   trucks: ['hiu-biru', 'duri-emas', 'robot-gerigi'],
      deck: deck(['hiu-biru', 'duri-emas', 'robot-gerigi'], ['bemper-baja', 'rangka-kuat', 'mesin-v8', 'ban-raksasa', 'nitro-ganda', 'ban-duri'], ['kit-perbaikan', 'derek', 'tantangan-hitung', 'kru-bengkel']) }
  }

  var BY = {}
  TRUCKS.forEach(function (c) { c.cat = 'truck'; BY[c.id] = c })
  PARTS.forEach(function (c) { c.cat = 'part'; BY[c.id] = c })
  ACTIONS.forEach(function (c) { c.cat = 'action'; BY[c.id] = c })
  FUEL.cat = 'fuel'; BY[FUEL.id] = FUEL

  W.GTCards = { TYPES: TYPES, TRUCKS: TRUCKS, PARTS: PARTS, ACTIONS: ACTIONS, FUEL: FUEL, ARENAS: ARENAS, STARTERS: STARTERS,
    get: function (id) { return BY[id] || null } }
  if (typeof module !== 'undefined' && module.exports) module.exports = W.GTCards
})()
