/* =============================================================================
 * bg-themes.js — LocationTheme configs for train-bg-engine (v54.61)
 * =============================================================================
 * Spec source: documentation and standarization/DYNAMIC_BG_ENGINE_SPEC.md §17
 *
 * Ships 5 Indonesian city configs to seed the LocationTheme registry. Each
 * entry follows the schema defined in spec §17. Configs are pure data —
 * actual layer rendering uses the keys ("landmarks", "trackside", "npc",
 * "audio", "palette") declaratively. Renderers ship in v54.62+.
 *
 * Auto-registers on load. Requires train-bg-engine.js to be loaded first
 * (window.TrainBG must exist). Gracefully no-ops if engine is missing.
 *
 * Cities shipped this version:
 *   - id_surabaya  (Tugu Pahlawan, Suramadu silhouette, Gubeng/Pasar Turi)
 *   - id_jakarta   (high-rise skyline, KRL feel, flyover, billboards)
 *   - id_bandung   (mountain backdrop, art deco, cool air)
 *   - id_yogyakarta(heritage low-rise, Malioboro feel, becak)
 *   - id_semarang  (coastal heritage, old town, harbor distant)
 *
 * International configs (Tokyo/London/Zurich/NY/Seoul) ship in v54.64.
 * ========================================================================== */

(function (global) {
  'use strict'

  if (!global.TrainBG || !global.TrainBG.LocationTheme) {
    console.warn('[bg-themes] TrainBG not loaded; LocationTheme configs not registered')
    return
  }
  const LT = global.TrainBG.LocationTheme

  // ── Shared palette tokens ──────────────────────────────────────────────────
  // Per spec §11 lighting rules: never full black, contrast preserved.
  const COLORS = {
    asphalt:        0x2a2a2a,
    asphaltLight:   0x4a4a4a,
    concrete:       0x9ca3af,
    concreteWarm:   0xb8b0a2,
    brickRed:       0x991b1b,
    brickOrange:    0xc2410c,
    woodBrown:      0x78350f,
    leafGreen:      0x16a34a,
    leafForest:     0x14532d,
    palmGreen:      0x15803d,
    paddyGreen:     0x84cc16,
    mountainGray:   0x4b5563,
    mountainGreen:  0x365314,
    skylineDark:    0x1f2937,
    skylineCream:   0xfde68a,
    neonRed:        0xef4444,
    neonYellow:     0xfde047,
    neonCyan:       0x06b6d4,
    glassBlue:      0x60a5fa,
    canopyGray:     0x6b7280,
    railSteel:      0x71717a,
    headlightWarm:  0xfde68a,
    streetlampWarm: 0xfbbf24,
    riverBlue:      0x0ea5e9,
    fogLight:       0xe5e7eb,
  }

  // ── 1. Surabaya ─────────────────────────────────────────────────────────────
  LT.register({
    locationId: 'id_surabaya',
    displayName: 'Surabaya',
    country: 'Indonesia',
    stationInspiredBy: ['Surabaya Gubeng', 'Surabaya Pasar Turi'],
    climateProfile: 'tropical_urban',
    palette: {
      ground: COLORS.asphalt,
      hill: COLORS.skylineDark,
      vegetation: COLORS.palmGreen,
      accent: COLORS.brickOrange,
      signage: COLORS.skylineCream,
    },
    defaultWeatherWeights: {
      'cerah':        0.30,
      'berawan':      0.20,
      'panas-tropis': 0.10,
      'hujan-ringan': 0.18,
      'hujan-deras':  0.10,
      'gerimis':      0.07,
      'mendung':      0.05,
    },
    timeOfDayWeights: {
      'pagi':         0.18,
      'siang':        0.20,
      'sore':         0.16,
      'petang':       0.14,
      'malam':        0.18,
      'golden-hour':  0.08,
      'blue-hour':    0.06,
    },
    landmarks: [
      { name:'Tugu Pahlawan silhouette', layer:'far',    spawnChance:0.35, allowedPhases:['urban-exit','approaching','landmark'], timeCompatibility:['pagi','siang','sore','petang','malam'], weatherCompatibility:['cerah','berawan','hujan-ringan','mendung'] },
      { name:'Suramadu Bridge far',      layer:'farFar', spawnChance:0.18, allowedPhases:['landmark','countryside'],            timeCompatibility:['pagi','sore','petang','malam'],        weatherCompatibility:['cerah','berawan'] },
      { name:'Kalimas river bend',       layer:'mid',    spawnChance:0.20, allowedPhases:['suburban','urban-exit'],             timeCompatibility:['pagi','siang','sore'],                 weatherCompatibility:['cerah','berawan','hujan-ringan'] },
      { name:'Heritage colonial block',  layer:'mid',    spawnChance:0.30, allowedPhases:['urban-exit','approaching','arrival'],timeCompatibility:['siang','sore','petang','malam'],       weatherCompatibility:['cerah','berawan','hujan-ringan'] },
      { name:'Ruko commercial strip',    layer:'near',   spawnChance:0.55, allowedPhases:['urban-exit','approaching'],          timeCompatibility:['*'], weatherCompatibility:['*'] },
    ],
    trackside: ['utility pole', 'signal post', 'concrete wall', 'KAI station signage', 'palm tree', 'mango tree', 'commercial billboard'],
    npcProfiles: {
      'pagi':   ['office_worker','student','commuter','station_staff','vendor'],
      'siang':  ['family_passenger','vendor','station_staff','tourist'],
      'sore':   ['commuter','student','security','vendor'],
      'petang': ['commuter_rush','security','vendor','family_passenger'],
      'malam':  ['security_night','late_commuter','vendor_night'],
      'hujan':  ['umbrella_commuter','sheltering_passenger','raincoat_staff'],
    },
    audioProfile: {
      station: ['indonesian_announcement_warm','crowd_medium','train_chime_id'],
      urban:   ['traffic_medium','distant_horn','city_murmur'],
      rain:    ['tropical_rain_light','wet_track_wheel'],
      ambient_morning: ['birds_tropical','vendor_calls'],
      ambient_night:   ['city_night_murmur','distant_traffic','crickets_low'],
    },
    signageStyle: 'KAI_id',
    doNotUse: ['snow','tundra','desert_sand'],
  })

  // ── 2. Jakarta ──────────────────────────────────────────────────────────────
  LT.register({
    locationId: 'id_jakarta',
    displayName: 'Jakarta',
    country: 'Indonesia',
    stationInspiredBy: ['Gambir', 'Manggarai', 'Senen'],
    climateProfile: 'tropical_megacity',
    palette: {
      ground: COLORS.asphalt,
      hill: COLORS.skylineDark,
      vegetation: COLORS.leafGreen,
      accent: COLORS.glassBlue,
      signage: COLORS.skylineCream,
    },
    defaultWeatherWeights: {
      'cerah':        0.20,
      'berawan':      0.22,
      'mendung':      0.12,
      'panas-tropis': 0.10,
      'hujan-ringan': 0.18,
      'hujan-deras':  0.12,
      'gerimis':      0.06,
    },
    timeOfDayWeights: {
      'pagi': 0.18, 'siang': 0.18, 'sore': 0.16, 'petang': 0.16,
      'malam': 0.18, 'golden-hour': 0.08, 'blue-hour': 0.06,
    },
    landmarks: [
      { name:'High-rise glass tower',    layer:'mid',    spawnChance:0.65, allowedPhases:['urban-exit','approaching','arrival'], timeCompatibility:['*'], weatherCompatibility:['*'] },
      { name:'Flyover overpass',         layer:'mid',    spawnChance:0.40, allowedPhases:['urban-exit','approaching'],           timeCompatibility:['*'], weatherCompatibility:['*'] },
      { name:'Digital billboard',        layer:'mid',    spawnChance:0.35, allowedPhases:['urban-exit','approaching','arrival'], timeCompatibility:['sore','petang','malam'],         weatherCompatibility:['*'] },
      { name:'KRL/MRT train passing',    layer:'far',    spawnChance:0.18, allowedPhases:['urban-exit','approaching'],           timeCompatibility:['pagi','sore','petang','malam'],   weatherCompatibility:['cerah','berawan','hujan-ringan'] },
      { name:'Pedestrian bridge (JPO)',  layer:'near',   spawnChance:0.30, allowedPhases:['urban-exit','approaching'],           timeCompatibility:['*'], weatherCompatibility:['*'] },
    ],
    trackside: ['high-tension pylon','MRT viaduct','concrete sound wall','KAI station signage','banner','crowded street','warung tents'],
    npcProfiles: {
      'pagi':   ['office_worker_rush','commuter_dense','student','station_staff','security'],
      'siang':  ['office_worker','vendor','station_staff','tourist'],
      'sore':   ['office_worker_rush','student','security','vendor'],
      'petang': ['commuter_rush_heavy','security','vendor'],
      'malam':  ['late_commuter','security_night','vendor_night'],
      'hujan':  ['umbrella_commuter','sheltering_passenger','poncho_rider'],
    },
    audioProfile: {
      station: ['indonesian_announcement_busy','crowd_dense','train_chime_id','KRL_door_chime'],
      urban:   ['traffic_dense','horns_frequent','city_murmur_loud'],
      rain:    ['tropical_rain_medium','wet_track_wheel','car_splash'],
      ambient_night: ['city_night_murmur_dense','distant_traffic_loud'],
    },
    signageStyle: 'KAI_id',
    doNotUse: ['snow','tundra','desert_sand'],
  })

  // ── 3. Bandung ──────────────────────────────────────────────────────────────
  LT.register({
    locationId: 'id_bandung',
    displayName: 'Bandung',
    country: 'Indonesia',
    stationInspiredBy: ['Bandung Hall'],
    climateProfile: 'highland_cool',
    palette: {
      ground: COLORS.asphaltLight,
      hill: COLORS.mountainGreen,
      vegetation: COLORS.leafForest,
      accent: COLORS.streetlampWarm,
      signage: COLORS.skylineCream,
    },
    defaultWeatherWeights: {
      'cerah':        0.32,
      'berawan':      0.22,
      'kabut-tipis':  0.14,
      'gerimis':      0.10,
      'hujan-ringan': 0.12,
      'mendung':      0.10,
    },
    timeOfDayWeights: {
      'pagi': 0.22, 'siang': 0.18, 'sore': 0.16, 'petang': 0.12,
      'malam': 0.14, 'golden-hour': 0.10, 'blue-hour': 0.08,
    },
    landmarks: [
      { name:'Distant mountain ridge',  layer:'farFar', spawnChance:0.85, allowedPhases:['*'], timeCompatibility:['*'], weatherCompatibility:['cerah','berawan','kabut-tipis'] },
      { name:'Art-deco station hall',   layer:'mid',    spawnChance:0.40, allowedPhases:['approaching','arrival'],     timeCompatibility:['*'], weatherCompatibility:['*'] },
      { name:'Pine grove + rumah panggung', layer:'mid',spawnChance:0.30, allowedPhases:['suburban','countryside'],    timeCompatibility:['*'], weatherCompatibility:['cerah','berawan','kabut-tipis'] },
      { name:'Tea plantation field',    layer:'far',    spawnChance:0.18, allowedPhases:['countryside'],                timeCompatibility:['pagi','siang','sore'], weatherCompatibility:['cerah','berawan'] },
      { name:'Heritage cafe row',       layer:'near',   spawnChance:0.30, allowedPhases:['urban-exit','approaching'],   timeCompatibility:['*'], weatherCompatibility:['*'] },
    ],
    trackside: ['utility pole','signal post','art-deco lamp','pine tree','tea bush row','small kampung house'],
    npcProfiles: {
      'pagi':   ['student','tourist','commuter','vendor_jamu'],
      'siang':  ['tourist','student','family_passenger'],
      'sore':   ['commuter','student','tourist'],
      'petang': ['commuter','tourist','family_passenger'],
      'malam':  ['late_commuter','security_night'],
      'hujan':  ['umbrella_student','poncho_commuter'],
    },
    audioProfile: {
      station: ['indonesian_announcement_calm','crowd_light','train_chime_id'],
      urban:   ['traffic_light','distant_horn','sundanese_music_far'],
      rain:    ['light_rain','wet_track_wheel','wind_through_pines'],
      ambient_morning: ['birds_mountain','mist_silence'],
    },
    signageStyle: 'KAI_id',
    doNotUse: ['snow','desert_sand','full_skyline_jakarta'],
  })

  // ── 4. Yogyakarta ──────────────────────────────────────────────────────────
  LT.register({
    locationId: 'id_yogyakarta',
    displayName: 'Yogyakarta',
    country: 'Indonesia',
    stationInspiredBy: ['Yogyakarta Tugu', 'Lempuyangan'],
    climateProfile: 'heritage_urban',
    palette: {
      ground: COLORS.asphaltLight,
      hill: COLORS.skylineDark,
      vegetation: COLORS.palmGreen,
      accent: COLORS.brickOrange,
      signage: COLORS.skylineCream,
    },
    defaultWeatherWeights: {
      'cerah':        0.36,
      'berawan':      0.22,
      'panas-tropis': 0.08,
      'hujan-ringan': 0.14,
      'gerimis':      0.10,
      'mendung':      0.10,
    },
    timeOfDayWeights: {
      'pagi': 0.20, 'siang': 0.20, 'sore': 0.18, 'petang': 0.14,
      'malam': 0.14, 'golden-hour': 0.08, 'blue-hour': 0.06,
    },
    landmarks: [
      { name:'Tugu Jogja monument',     layer:'mid',  spawnChance:0.45, allowedPhases:['urban-exit','approaching','landmark'], timeCompatibility:['*'], weatherCompatibility:['*'] },
      { name:'Malioboro arcade glow',   layer:'mid',  spawnChance:0.40, allowedPhases:['urban-exit','approaching'],            timeCompatibility:['sore','petang','malam'], weatherCompatibility:['*'] },
      { name:'Becak/andong silhouette', layer:'near', spawnChance:0.35, allowedPhases:['urban-exit','approaching','arrival'],  timeCompatibility:['pagi','siang','sore','petang'], weatherCompatibility:['cerah','berawan'] },
      { name:'Heritage low-rise row',   layer:'mid',  spawnChance:0.50, allowedPhases:['urban-exit','approaching'],            timeCompatibility:['*'], weatherCompatibility:['*'] },
      { name:'Banyan tree (beringin)',  layer:'near', spawnChance:0.30, allowedPhases:['urban-exit','suburban','approaching'], timeCompatibility:['*'], weatherCompatibility:['*'] },
    ],
    trackside: ['utility pole','signal post','heritage lamp','banyan tree','batik banner','warung sego kucing'],
    npcProfiles: {
      'pagi':   ['student','tourist','vendor_jamu','family_passenger'],
      'siang':  ['tourist','family_passenger','backpacker','vendor'],
      'sore':   ['tourist','backpacker','student','vendor'],
      'petang': ['tourist','family_passenger','commuter','vendor_malam'],
      'malam':  ['tourist_night','vendor_malioboro','security'],
      'hujan':  ['umbrella_tourist','sheltering_passenger'],
    },
    audioProfile: {
      station: ['indonesian_announcement_warm','gamelan_far','train_chime_id'],
      urban:   ['gamelan_distant','andong_bells','vendor_calls'],
      rain:    ['light_rain_tropical','wet_track_wheel'],
      ambient_morning: ['gamelan_morning','birds_tropical'],
    },
    signageStyle: 'KAI_id',
    doNotUse: ['snow','desert_sand','jakarta_skyline'],
  })

  // ── 5. Semarang ────────────────────────────────────────────────────────────
  LT.register({
    locationId: 'id_semarang',
    displayName: 'Semarang',
    country: 'Indonesia',
    stationInspiredBy: ['Semarang Tawang', 'Poncol'],
    climateProfile: 'coastal_tropical',
    palette: {
      ground: COLORS.asphalt,
      hill: COLORS.skylineDark,
      vegetation: COLORS.palmGreen,
      accent: COLORS.brickOrange,
      signage: COLORS.skylineCream,
    },
    defaultWeatherWeights: {
      'cerah':        0.28,
      'berawan':      0.22,
      'panas-tropis': 0.12,
      'kabut-tipis':  0.06,
      'hujan-ringan': 0.16,
      'hujan-deras':  0.08,
      'gerimis':      0.08,
    },
    timeOfDayWeights: {
      'pagi': 0.18, 'siang': 0.20, 'sore': 0.16, 'petang': 0.14,
      'malam': 0.18, 'golden-hour': 0.08, 'blue-hour': 0.06,
    },
    landmarks: [
      { name:'Lawang Sewu silhouette',  layer:'mid',    spawnChance:0.40, allowedPhases:['urban-exit','approaching','landmark'], timeCompatibility:['*'], weatherCompatibility:['*'] },
      { name:'Kota Lama heritage block',layer:'mid',    spawnChance:0.45, allowedPhases:['urban-exit','approaching'],           timeCompatibility:['*'], weatherCompatibility:['cerah','berawan','hujan-ringan'] },
      { name:'Harbor cranes distant',   layer:'farFar', spawnChance:0.22, allowedPhases:['landmark','countryside'],             timeCompatibility:['pagi','siang','sore','petang','malam'], weatherCompatibility:['cerah','berawan','kabut-tipis'] },
      { name:'Coastal haze far layer',  layer:'farFar', spawnChance:0.40, allowedPhases:['*'], timeCompatibility:['siang','sore','petang'], weatherCompatibility:['panas-tropis','kabut-tipis'] },
      { name:'Sam Poo Kong temple roof',layer:'mid',    spawnChance:0.15, allowedPhases:['urban-exit','landmark'],              timeCompatibility:['siang','sore','petang'], weatherCompatibility:['cerah','berawan'] },
    ],
    trackside: ['utility pole','signal post','heritage colonnade','coconut palm','warehouse roof','batik banner'],
    npcProfiles: {
      'pagi':   ['student','commuter','office_worker','vendor'],
      'siang':  ['family_passenger','vendor','tourist'],
      'sore':   ['commuter','student','tourist','vendor'],
      'petang': ['commuter','family_passenger','tourist'],
      'malam':  ['late_commuter','vendor_night','security_night'],
      'hujan':  ['umbrella_commuter','sheltering_passenger','raincoat_staff'],
    },
    audioProfile: {
      station: ['indonesian_announcement_warm','crowd_medium','train_chime_id'],
      urban:   ['traffic_medium','distant_horn','distant_harbor_horn'],
      rain:    ['tropical_rain_light','wet_track_wheel'],
      ambient_evening: ['harbor_horn_far','city_murmur'],
    },
    signageStyle: 'KAI_id',
    doNotUse: ['snow','desert_sand','tropical_mountain_pines'],
  })

  // ── Boot log (registry count) ──────────────────────────────────────────────
  try {
    const ids = LT.list()
    if (ids.length) console.log('[bg-themes] registered', ids.length, 'LocationThemes:', ids.join(', '))
  } catch(_){}

})(typeof window !== 'undefined' ? window : globalThis)
