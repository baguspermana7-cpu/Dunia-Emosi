/**
 * Region Metadata — Dunia Emosi (Task #66, 2026-04-25)
 * Single source of truth for the 10 main Pokemon regions.
 *
 * Per region: color, icon, generation badge, hue-rotate value for tinting
 * the shared `region.webp` icon (same asset, different color per card).
 *
 * Side regions (Sevii, Orre, PMD, Almia, Fiore, Oblivia, Toyland, Pasio,
 * Kitakami, Aeos) are intentionally HIDDEN from MVP — toggle "Petualangan
 * Bonus" can re-enable Phase 7+.
 *
 * See: documentation and standarization/CITY-PROGRESSION-SPEC.md (when written)
 *      assets/Pokemon/background/data/pokemon_city_background_manifest.csv
 */
const REGION_META = {
  kanto:   { order: 1,  name: 'Kanto',   gen: 'Gen 1',     color: '#EF4444', icon: '🔥', hueRotate: 0,    saturate: 1.0,  totalCities: 10 },
  johto:   { order: 2,  name: 'Johto',   gen: 'Gen 2',     color: '#F59E0B', icon: '🌅', hueRotate: 25,   saturate: 1.0,  totalCities: 12 },
  hoenn:   { order: 3,  name: 'Hoenn',   gen: 'Gen 3',     color: '#10B981', icon: '🌊', hueRotate: 130,  saturate: 1.0,  totalCities: 16 },
  sinnoh:  { order: 4,  name: 'Sinnoh',  gen: 'Gen 4',     color: '#3B82F6', icon: '❄️', hueRotate: 215,  saturate: 1.0,  totalCities: 17 },
  unova:   { order: 5,  name: 'Unova',   gen: 'Gen 5',     color: '#6B7280', icon: '🏙️', hueRotate: 200,  saturate: 0.5,  totalCities: 20 },
  kalos:   { order: 6,  name: 'Kalos',   gen: 'Gen 6',     color: '#EC4899', icon: '🗼', hueRotate: 320,  saturate: 1.1,  totalCities: 16 },
  alola:   { order: 7,  name: 'Alola',   gen: 'Gen 7',     color: '#F97316', icon: '🌴', hueRotate: 30,   saturate: 1.1,  totalCities: 9  },
  galar:   { order: 8,  name: 'Galar',   gen: 'Gen 8',     color: '#1E3A8A', icon: '🏰', hueRotate: 230,  saturate: 0.9,  totalCities: 12 },
  paldea:  { order: 9,  name: 'Paldea',  gen: 'Gen 9',     color: '#F59E0B', icon: '🥖', hueRotate: 25,   saturate: 1.05, totalCities: 12 },
  hisui:   { order: 10, name: 'Hisui',   gen: 'Legends',   color: '#92400E', icon: '🏯', hueRotate: 30,   saturate: 0.7,  totalCities: 3  },
}

const REGION_ORDER = ['kanto','johto','hoenn','sinnoh','unova','kalos','alola','galar','paldea','hisui']

/**
 * Filter string for CSS — applies hue-rotate + saturate + drop-shadow tint
 * to the shared region.webp icon. Keeps single asset, varies color per region.
 */
function regionIconFilter(regionId) {
  const m = REGION_META[regionId]
  if (!m) return ''
  return `hue-rotate(${m.hueRotate}deg) saturate(${m.saturate}) drop-shadow(0 0 8px ${m.color})`
}

/** All region IDs in canonical play order */
function getAllRegions() { return REGION_ORDER.map(id => ({...REGION_META[id], id})) }

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { REGION_META, REGION_ORDER, regionIconFilter, getAllRegions }
}
