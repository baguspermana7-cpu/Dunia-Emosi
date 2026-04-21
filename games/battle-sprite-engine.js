// Battle Sprite Engine (BSE) — shared across G10/G13/G13b/G13c
// Handles: facing direction, visual scale, tier scale, type aura colors.
// Exposes on window.BSE. See documentation/CODING-STANDARDS.md "Battle Sprite Engine".
(function(){
  // Natural facing of the source sprite. DEFAULT 'L' — Pokemondb HOME 3D renders face the viewer with slight LEFT bias.
  // Add 'R' override here for Pokemon whose natural art faces RIGHT.
  const POKE_FACING = {
    // User-reported 'R' natural-facing exceptions go here
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
  // opts: { role:'player'|'enemy'|'wild', hdSrc, fallbackSrc }
  function mount(imgEl, slug, opts){
    if (!imgEl) return
    const role = opts && opts.role ? opts.role : 'player'
    const hd = opts && opts.hdSrc
    const fb = opts && opts.fallbackSrc
    if (hd) {
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
