/**
 * City Progression Helpers — Dunia Emosi (Task #66, 2026-04-25)
 *
 * Sliding Frontier Unlock Rule:
 *   unlockedCount[region] = min(2 + completedCount[region], totalCities[region])
 *
 * - Always 2 cities playable per region at game start (frontier window)
 * - Each completion → +1 unlock (next sequential city opens)
 * - Replay tidak menambah unlock count
 * - All regions unlocked dari awal (no region-level lock)
 *
 * Storage shape (extends existing prog.gN):
 *   prog.gN.cities[regionId] = { completed: ['slug1','slug2'], stars: {'slug1': 3} }
 *
 * Helpers preserve existing prog.gN.completed[]/stars{} (legacy levelNum) for
 * migration purposes. Migration from legacy levels happens once at first launch
 * via cityMigrationDone flag.
 */

// Ensure global progress wiring (relies on existing loadProgress/saveProgress in game.js)
function _gpKey(gameNum) { return 'g' + gameNum }
function _ensureCityProg(prog, gameNum, regionId) {
  const key = _gpKey(gameNum)
  if (!prog[key]) prog[key] = { completed: [], stars: {}, cities: {} }
  if (!prog[key].cities) prog[key].cities = {}
  if (!prog[key].cities[regionId]) prog[key].cities[regionId] = { completed: [], stars: {} }
  return prog[key].cities[regionId]
}

/** Get progress for a specific game + region. Returns {completed:[], stars:{}}. */
function getCityProgress(gameNum, regionId) {
  const prog = (typeof loadProgress === 'function') ? loadProgress() : {}
  const gp = prog[_gpKey(gameNum)] || {}
  return (gp.cities && gp.cities[regionId]) || { completed: [], stars: {} }
}

/** Mark a city as completed. Idempotent — replay won't double-count. Updates star high-water mark. */
function setCityComplete(gameNum, regionId, citySlug, stars) {
  if (typeof loadProgress !== 'function') return
  const prog = loadProgress()
  const cp = _ensureCityProg(prog, gameNum, regionId)
  if (!cp.completed.includes(citySlug)) cp.completed.push(citySlug)
  if ((cp.stars[citySlug] || 0) < stars) cp.stars[citySlug] = stars
  if (typeof saveProgress === 'function') saveProgress(prog)
}

/** Sliding-frontier unlock count: 2 + completedCount, capped at totalCities. */
function getUnlockedCount(gameNum, regionId) {
  const cp = getCityProgress(gameNum, regionId)
  const total = (typeof CITY_PACK !== 'undefined' && CITY_PACK[regionId])
    ? CITY_PACK[regionId].cities.length
    : (typeof REGION_META !== 'undefined' && REGION_META[regionId] ? REGION_META[regionId].totalCities : 99)
  return Math.min(2 + cp.completed.length, total)
}

/** Is the city at given 1-based index unlocked? */
function isCityUnlocked(gameNum, regionId, cityIndex /* 1-based */) {
  return cityIndex >= 1 && cityIndex <= getUnlockedCount(gameNum, regionId)
}

/** Has the player ever completed this city? */
function isCityCompleted(gameNum, regionId, citySlug) {
  return getCityProgress(gameNum, regionId).completed.includes(citySlug)
}

/** Star count for completed city (0 if never completed). */
function getCityStars(gameNum, regionId, citySlug) {
  return getCityProgress(gameNum, regionId).stars[citySlug] || 0
}

/**
 * State buckets for UI rendering — convenience accessor that classifies
 * each city in a region into 'completed' / 'available' / 'locked'.
 */
function getCityStates(gameNum, regionId, cities /* array of {slug, order} */) {
  const cp = getCityProgress(gameNum, regionId)
  const unlocked = getUnlockedCount(gameNum, regionId)
  return cities.map((c, i) => {
    const idx = c.order || (i + 1)
    if (cp.completed.includes(c.slug)) return { ...c, state: 'completed', stars: cp.stars[c.slug] || 0 }
    if (idx <= unlocked) return { ...c, state: 'available', stars: 0 }
    return { ...c, state: 'locked', stars: 0 }
  })
}

/**
 * Migration helper: legacy `prog.gN.completed = [1,2,3,...]` → cityProgress per region.
 * Mapping rule: level 1..N maps to first N cities of Kanto, then Johto, etc., in REGION_ORDER.
 * Idempotent via cityMigrationDone flag.
 */
function migrateLegacyLevelsToCity(gameNum) {
  if (typeof loadProgress !== 'function') return
  const prog = loadProgress()
  const key = _gpKey(gameNum)
  const gp = prog[key]
  if (!gp || gp.cityMigrationDone) return
  const legacyCompleted = Array.isArray(gp.completed) ? gp.completed.slice().sort((a, b) => a - b) : []
  const legacyStars = gp.stars || {}
  if (typeof CITY_PACK === 'undefined' || typeof REGION_ORDER === 'undefined') return

  let levelIdx = 0
  for (const regionId of REGION_ORDER) {
    const region = CITY_PACK[regionId]
    if (!region || !region.cities) continue
    for (const city of region.cities) {
      if (levelIdx >= legacyCompleted.length) { gp.cityMigrationDone = '20260425'; saveProgress(prog); return }
      const levelNum = legacyCompleted[levelIdx]
      const cp = _ensureCityProg(prog, gameNum, regionId)
      if (!cp.completed.includes(city.slug)) cp.completed.push(city.slug)
      const star = legacyStars[levelNum] || 0
      if (star > (cp.stars[city.slug] || 0)) cp.stars[city.slug] = star
      levelIdx++
    }
  }
  gp.cityMigrationDone = '20260425'
  if (typeof saveProgress === 'function') saveProgress(prog)
}

if (typeof window !== 'undefined') {
  window.getCityProgress = getCityProgress
  window.setCityComplete = setCityComplete
  window.getUnlockedCount = getUnlockedCount
  window.isCityUnlocked = isCityUnlocked
  window.isCityCompleted = isCityCompleted
  window.getCityStars = getCityStars
  window.getCityStates = getCityStates
  window.migrateLegacyLevelsToCity = migrateLegacyLevelsToCity
}
