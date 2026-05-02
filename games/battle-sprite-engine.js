// Battle Sprite Engine (BSE) — shared across G10/G13/G13b/G13c
// Handles: facing direction, visual scale, tier scale, type aura colors.
// Exposes on window.BSE. See documentation/CODING-STANDARDS.md "Battle Sprite Engine".
(function(){
  // Natural facing of the source sprite. DEFAULT 'L' — Pokemondb HOME 3D renders face the viewer with slight LEFT bias.
  // Add 'R' override here for Pokemon whose natural art faces RIGHT.
  const POKE_FACING = {
    // Electric mouse line
    pichu: 'R', pikachu: 'R', raichu: 'R',
    // Dragon line
    dratini: 'R', dragonair: 'R', dragonite: 'R',
    // Kanto starter finals
    blastoise: 'R',
    // Kanto legendaries
    articuno: 'R', zapdos: 'R', moltres: 'R',
    mewtwo: 'R', mew: 'R',
    // Johto legendaries
    lugia: 'R', 'ho-oh': 'R',
    raikou: 'R', entei: 'R', suicune: 'R',
    celebi: 'R',
    // Hoenn legendaries
    kyogre: 'R', groudon: 'R', rayquaza: 'R',
    latias: 'R', latios: 'R', deoxys: 'R',
    // Sinnoh legendaries
    dialga: 'R', palkia: 'R', giratina: 'R',
    arceus: 'R', darkrai: 'R', cresselia: 'R',
    // Unova legendaries
    reshiram: 'R', zekrom: 'R', kyurem: 'R',
    victini: 'R', keldeo: 'R', genesect: 'R',
    // Kalos legendaries
    xerneas: 'R', yveltal: 'R', zygarde: 'R',
    diancie: 'R', hoopa: 'R', volcanion: 'R',
    // Alola legendaries
    solgaleo: 'R', lunala: 'R', necrozma: 'R',
    'tapu-koko': 'R', magearna: 'R', marshadow: 'R',
    // Galar legendaries
    zacian: 'R', zamazenta: 'R', eternatus: 'R',
    calyrex: 'R', glastrier: 'R', spectrier: 'R',
    // Paldea legendaries
    koraidon: 'R', miraidon: 'R',
    'wo-chien': 'R', 'chien-pao': 'R', 'ting-lu': 'R', 'chi-yu': 'R',
  }

  // Visual canvas-fill override — compensates sprites that fill much more/less than the 475×475 HD average.
  const POKE_VISUAL = {
    meowth: 0.85,
    oddish: 0.80,
  }

  // Tier lookup is loaded by host game (needs POKEMON_DB). BSE accepts it via init() or falls back to 1.0.
  let POKE_TIERS = {}

  function init(tiersMap){
    if (tiersMap && typeof tiersMap === 'object') POKE_TIERS = tiersMap
  }
  function facing(slug){ return POKE_FACING[slug] || 'L' }
  function flipForRole(slug, role){
    const natural = facing(slug)
    const want = role === 'enemy' ? 'L' : 'R'
    return natural !== want ? 'scaleX(-1)' : 'scaleX(1)'
  }
  function visualScale(slug){ return POKE_VISUAL[slug] || 1.0 }
  function tierScale(slug){
    const t = POKE_TIERS[slug] || 1
    return ({1:1.0, 2:1.2, 3:1.3, 4:1.3})[t] || 1.0
  }
  function finalScale(slug){ return tierScale(slug) * visualScale(slug) }

  // One-call sprite mount: applies HD-first src cascade + facing + scale inline style.
  // opts: { role:'player'|'enemy'|'wild', hdSrc, fallbackSrc, sources?, emoji? }
  // Hotfix 2026-04-28: prefer attachSpriteCascade when available — terminating
  // dedup loader replaces previous 1-step onerror chain.
  function mount(imgEl, slug, opts){
    if (!imgEl) return
    const role = opts && opts.role ? opts.role : 'player'
    const hd = opts && opts.hdSrc
    const fb = opts && opts.fallbackSrc
    const extra = (opts && Array.isArray(opts.sources)) ? opts.sources : []
    const emoji = (opts && opts.emoji) || (role === 'enemy' || role === 'wild' ? '👹' : '⚡')
    const sources = [hd, fb].concat(extra).filter(Boolean)
    if (typeof window.attachSpriteCascade === 'function' && sources.length) {
      window.attachSpriteCascade(imgEl, sources, emoji)
    } else if (hd) {
      imgEl.src = hd
      if (fb) imgEl.onerror = function(){ imgEl.src = fb; imgEl.onerror = null }
    }
    const flip = flipForRole(slug, role)
    imgEl.style.transform = flip + ' scale(' + finalScale(slug) + ')'
  }

  window.BSE = {
    init, facing, flipForRole, visualScale, tierScale, finalScale, mount,
    POKE_FACING, POKE_VISUAL,
  }
})()
