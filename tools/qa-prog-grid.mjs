// ProgGrid (games/prog-grid.js) + G31 Mojo Swoptops level data — the headless engine gate.
//   A  determinism: the same program from the same state gives the same trace; worlds are never mutated
//   B  every verb, with its blocked / invalid-capability outcomes (push edge cases, spray water, jump, raise
//      microgame, rescue height, pick/letters microgame, repair tool + bolts, crate carry/deliver, fly/land)
//   C  SWOP mid-sequence, SWOP to a form the beat does not allow, SWOP while raised / flying / carrying
//   D  an invalid capability stops the run at that command (debug mode input)
//   E  REPEAT ×N (nested, capped) and icon-led IF (Appendix B program)
//   F  every level: lint clean, every beat solvable within its slots from the bounded predecessor set; omitted states
//      reported explicitly, efficiency budget reachable, alternatives proven, solutions counted
//   G  hint: the ladder's last rung (ghost the next command) always leads to a solution, one command at a time
//   H  lint catches broken levels
//   I  the SoalEngine 'mojo' pack + 'mojo-world' generator + 'g31' profile
//   J  board-absolute arrows
//   K  konsistensi: the ONE rule (owner 2026-10-03, LEWATI vs SEBELAH) for every object type — walk-over vs
//      blocker, every action from all 4 sides whatever Mojo faces (and Mojo turns), resolved things never block
//      (except a rock on ground), no no-target while a target is beside Mojo (over every level's state space),
//      ambiguity, jump / lower / height reasons, the lift resets per beat, the Chopper takes everything
//   L  level lint for the rule + the ROAD rule (owner 2026-10-03: grass is scenery, Mojo drives only on road; items ON
//      the road, targets beside it, one connected road network) + Bo's beat line names the beat's objective +
//      a static scan: every engine failure reason has its own UI message
// Run: node tools/qa-prog-grid.mjs
import fs from 'node:fs'
import vm from 'node:vm'
import path from 'node:path'

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..')
const ctx = { console, Date, Math, JSON }
ctx.window = ctx; ctx.globalThis = ctx
vm.createContext(ctx)
for (const f of ['games/prog-grid.js', 'games/data/mojo-levels.js', 'games/data/soal-engine.js', 'games/data/soal-gen-matematika.js', 'games/data/soal-pack-mojo.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f })
}
const PG = ctx.ProgGrid, ML = ctx.MojoLevels, SE = ctx.SoalEngine, MS = ctx.MojoSoal
const fails = []
let passes = 0
const check = (ok, msg) => { if (ok) passes++; else { fails.push(msg); console.log('FAIL  ' + msg) } if (ok && process.env.QA_VERBOSE) console.log('PASS  ' + msg) }
const section = s => console.log('--- ' + s)

// a tiny level builder for the unit checks
const L = (map, mojo, objects = [], extra = {}) => ({ id: 'u', grid: { rows: map.length, cols: map[0].length, map }, mojo, objects,
  beats: [{ objectives: extra.objectives || [{ do: 'reach', at: [0, 0] }], slots: 8, forms: extra.forms }], res: extra.res, cap: extra.cap })
const W = (lv) => { const w = PG.world(lv); return w }
const S = (w, cmd, o) => PG.step(w, cmd, o)
// the start world of every beat: each earlier beat played with its solver solution
const starts = lv => {
  const out = []; let w = PG.prep(PG.world(lv), lv, 0)
  for (let bi = 0; bi < lv.beats.length; bi++) {
    if (bi > 0) w = PG.prep(PG.startBeat(w, lv, bi), lv, bi)
    out.push(w)
    const sol = PG.solve(w, lv.beats[bi]); if (!sol) break
    w = PG.run(w, sol, lv.beats[bi], { auto: true }).world
  }
  return out
}
const deepFreeze = o => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); Object.values(o).forEach(deepFreeze) } return o }

/* ── A determinism + immutability ─────────────────────────────────── */
section('A determinism')
{
  const lv = ML.byId('s1'), w0 = PG.prep(PG.world(lv), lv, 0)
  const prog = ['east', 'swop:dozer', 'push', 'push', 'swop:fire', 'spray']
  const a = PG.run(w0, prog, lv.beats[0]), b = PG.run(w0, prog, lv.beats[0])
  check(JSON.stringify(a.steps) === JSON.stringify(b.steps) && PG.key(a.world) === PG.key(b.world), 'same program + same start = same trace and end state')
  check(a.done, 'the slice beat 1 Dozer program completes the beat')
  deepFreeze(w0)
  let threw = null
  try { PG.run(w0, prog, lv.beats[0]); PG.solve(w0, lv.beats[0]) } catch (e) { threw = e.message }
  check(!threw, 'running and solving never mutate the start world (deep-frozen) ' + (threw || ''))
  const r = S(W(L(['...'], { at: [0, 0], h: 'E' })), 'fwd')
  check(r.world.m.c === 1 && r.status === 'success', 'step returns a new world with the move')
}

/* ── B verbs ─────────────────────────────────────────────────────── */
section('B verbs')
{
  // fwd / turns / edges / terrain / objects
  let w = W(L(['.#.', '...'], { at: [1, 0], h: 'N' }))
  check(S(w, 'fwd').world.m.r === 0, 'fwd moves along the heading')
  check(S(w, 'left').world.m.h === 3 && S(w, 'right').world.m.h === 1, 'left / right turn in place')
  check(S(S(w, 'fwd').world, 'fwd').reason === 'edge', 'fwd off the grid = blocked edge')
  check(S(S(S(w, 'fwd').world, 'right').world, 'fwd').reason === 'terrain', 'fwd into a building = blocked terrain')

  // push: normal cannot (invalid capability, names Dozer); dozer pushes rock + moves; edge / wall / object / pit
  const pl = L(['.R..o', '.....', '....#'].map(s => s.replace('R', '.')), { at: [0, 0], h: 'E', form: 'normal' },
    [{ id: 'r1', type: 'rock', at: [0, 1] }, { id: 'r2', type: 'rock', at: [1, 3] }, { id: 'r3', type: 'rock', at: [2, 2] }, { id: 'r4', type: 'rock', at: [1, 1] }])
  w = W(pl)
  let r = S(w, 'push')
  check(r.status === 'invalid-capability' && r.info.forms.includes('dozer'), 'Normal Mojo push = invalid-capability, suggests Dozer')
  r = S(S(w, 'swop:dozer').world, 'push')
  check(r.status === 'success' && PG.find(r.world, 'r1').c === 2 && r.world.m.c === 1, 'Dozer push moves the rock AND Mojo one cell')
  const r2 = S(r.world, 'push'), r3 = S(r2.world, 'push')
  check(r3.status === 'success' && PG.find(r3.world, 'r1').st === 'cleared' && r3.world.fill['0,4'], 'a rock pushed into a pit fills it (cleared)')
  check(S(r3.world, 'fwd').world.m.c === 4, 'Mojo drives over the filled pit')
  // push-edge
  let pe = W(L(['.R'.replace('R', '.')], { at: [0, 0], h: 'E', form: 'dozer' }, [{ id: 'r', type: 'rock', at: [0, 1] }]))
  check(S(pe, 'push').reason === 'push-edge', 'a rock at the edge cannot leave the map (push-edge)')
  // push-wall
  pe = W(L(['..#'], { at: [0, 0], h: 'E', form: 'dozer' }, [{ id: 'r', type: 'rock', at: [0, 1] }]))
  check(S(pe, 'push').reason === 'push-wall', 'a rock cannot be pushed into a building (push-wall)')
  // push-object (rock into rock, rock into a fire, rock onto a pickup)
  pe = W(L(['....'], { at: [0, 0], h: 'E', form: 'dozer' }, [{ id: 'r', type: 'rock', at: [0, 1] }, { id: 'q', type: 'rock', at: [0, 2] }]))
  check(S(pe, 'push').reason === 'push-object', 'a rock cannot be pushed into another rock (push-object)')
  pe = W(L(['....'], { at: [0, 0], h: 'E', form: 'dozer' }, [{ id: 'r', type: 'rock', at: [0, 1] }, { id: 'b', type: 'bolt', at: [0, 2] }]))
  check(S(pe, 'push').reason === 'push-object', 'a rock cannot be pushed onto a pickup')
  pe = W(L(['....'], { at: [0, 0], h: 'E', form: 'dozer' }, [{ id: 'z', type: 'zone', at: [0, 2], accepts: 'rock' }, { id: 'r', type: 'rock', at: [0, 1] }]))
  check(PG.find(S(pe, 'push').world, 'r').st === 'cleared', 'a rock pushed onto its zone is cleared')
  check(S(W(L(['...'], { at: [0, 0], h: 'E', form: 'dozer' })), 'push').reason === 'no-target', 'push with nothing ahead = no-target')

  // spray: water use, partial, empty, no target, fire blocks until out
  const fl = L(['...'], { at: [0, 0], h: 'E', form: 'fire' }, [{ id: 'f', type: 'fire', at: [0, 1], str: 3 }], { res: { water: 2 }, cap: { water: 5 } })
  w = W(fl)
  check(S(w, 'fwd').reason === 'object', 'a burning fire blocks the road')
  r = S(w, 'spray')
  check(r.status === 'success' && PG.find(r.world, 'f').st === 'sprayed' && PG.find(r.world, 'f').str === 1 && r.world.res.water === 0, 'spray with 2 water on a size-3 fire: sprayed, 1 left, tank empty')
  check(S(r.world, 'spray').reason === 'no-water', 'spray with an empty tank = no-water')
  const full = W({ ...fl, res: { water: 5 } })
  const out = S(full, 'spray')
  check(PG.find(out.world, 'f').st === 'out' && out.world.res.water === 2, 'spray uses only what the fire needs (5 -> 2)')
  check(S(out.world, 'fwd').status === 'success', 'an extinguished fire no longer blocks')
  check(S(out.world, 'spray').reason === 'no-target', 'spray at nothing = no-target')
  // pickups: water drop into the tank, cap respected
  const dl = W(L(['...'], { at: [0, 0], h: 'E', form: 'fire' }, [{ id: 'd', type: 'drop', at: [0, 1] }], { res: { water: 5 }, cap: { water: 5 } }))
  const dr = S(dl, 'fwd')
  check(dr.world.res.water === 5 && PG.find(dr.world, 'd').st === 'here' && dr.events.some(e => e.e === 'full'), 'a full tank leaves the drop on the ground')

  // jump
  const jl = L(['..o..', '.T...'], { at: [0, 0], h: 'E', form: 'jumper' }, [{ id: 'r', type: 'rock', at: [0, 1] }, { id: 'f', type: 'fire', at: [1, 3] }])
  w = W(jl)
  check(S(w, 'jump').reason === 'land', 'Jumper cannot land in a pit')
  const jw = S(S(w, 'swop:dozer').world, 'swop:jumper').world
  check(S(jw, 'jump').reason === 'land', 'still cannot land in a pit after swopping back')
  let jw2 = W(L(['.....'], { at: [0, 0], h: 'E', form: 'jumper' }, [{ id: 'r', type: 'rock', at: [0, 1] }]))
  r = S(jw2, 'jump')
  check(r.status === 'success' && r.world.m.c === 2, 'Jumper jumps over a rock (2 cells)')
  jw2 = W(L(['..o..'], { at: [0, 1], h: 'E', form: 'jumper' }))
  check(S(jw2, 'jump').world.m.c === 3, 'Jumper jumps over a pit')
  jw2 = W(L(['.T...'], { at: [0, 0], h: 'E', form: 'jumper' }))
  check(S(jw2, 'jump').reason === 'too-tall', 'a tree is too tall to jump')
  jw2 = W(L(['.....'], { at: [0, 0], h: 'E', form: 'jumper' }, [{ id: 'f', type: 'fire', at: [0, 1] }]))
  check(S(jw2, 'jump').reason === 'jump-fire', 'a fire cannot be jumped (jump-fire: put it out first)')
  check(S(W(L(['..'], { at: [0, 0], h: 'E', form: 'jumper' }, [{ id: 'r', type: 'rock', at: [0, 1] }])), 'jump').reason === 'edge', 'a jump off the map = blocked edge')
  check(S(W(L(['...'], { at: [0, 0], h: 'E', form: 'jumper' })), 'jump').reason === 'no-target', 'a jump with nothing to jump over = no-target')

  // raise / lower / rescue height (cherry picker) + the height microgame
  const hl = L(['.#', '..'], { at: [1, 1], h: 'N', form: 'cherry' }, [{ id: 'mia', type: 'person', at: [0, 1], elev: 6, mg: { id: 'tinggi', step: 2 } }])
  w = W(hl)
  check(S(w, 'rescue').reason === 'too-high', 'rescue before raising = too-high')
  r = S(w, 'raise')
  check(r.status === 'waiting-for-microgame' && r.info.mg.kind === 'height' && r.info.mg.target === 6 && r.world === w, 'raise pauses for the height microgame; the world is unchanged')
  check(S(w, 'raise', { mg: 5 }).reason === 'height', 'a wrong height does not raise (blocked height)')
  const up = S(w, 'raise', { mg: 6 }).world
  check(up.m.lift === 6, 'the child\'s answer 6 raises the platform to 6')
  check(S(up, 'left').status === 'success' && S(S(up, 'left').world, 'fwd').reason === 'lift-up', 'turning is fine raised; driving raised = lift-up')
  check(S(up, 'swop:normal').reason === 'lift-up', 'no swop while raised')
  const saved = S(up, 'rescue')
  check(saved.status === 'success' && PG.find(saved.world, 'mia').st === 'rescued', 'raised to 6 -> rescue')
  check(S(up, 'lower').world.m.lift === 0, 'lower brings the platform down')
  check(S(W(L(['...'], { at: [0, 0], h: 'E', form: 'cherry' })), 'raise').reason === 'no-target', 'raise with nothing high ahead = no-target')
  check(S(w, 'raise', { auto: true }).world.m.lift === 6, 'auto resolves the microgame with the correct value (solver)')
  // ground rescue
  const gr = W(L(['..'], { at: [0, 0], h: 'E' }, [{ id: 'k', type: 'person', at: [0, 1] }]))
  check(PG.find(S(gr, 'rescue').world, 'k').st === 'rescued', 'Normal Mojo rescues a friend on the ground')
  check(S(W(L(['..'], { at: [0, 0], h: 'E', form: 'fire' }, [{ id: 'k', type: 'person', at: [0, 1] }])), 'rescue').status === 'invalid-capability', 'Mojo Api cannot rescue (invalid capability)')

  // toolbox = LEWATI (driving onto it asks for the letters microgame), repair (tool, bolts); a fixed gate is road
  const rl = L(['...', '...', '...'], { at: [1, 0], h: 'E', form: 'normal' }, [
    { id: 'kotak', type: 'toolbox', at: [1, 1], tool: 'palu', mg: { kind: 'letters', id: 'palu' } },
    { id: 'gate', type: 'repair', at: [0, 2], needs: { tool: 'palu', bolts: 3 }, what: 'gate' },
    { id: 'b1', type: 'bolt', at: [2, 2] }], { res: { bolts: 2 }, cap: { bolts: 3 } })
  w = W(rl)
  let rr = PG.run(w, ['up', 'east', 'repair'], null).stop
  check(rr && rr.reason === 'need-tool' && rr.info.tool === 'palu', 'repair without the hammer = need-tool')
  r = S(w, 'east')
  check(r.status === 'waiting-for-microgame' && r.info.mg.kind === 'letters' && r.info.mg.tool === 'palu' && r.world === w, 'driving onto the toolbox pauses for the letters microgame (world unchanged)')
  check(S(w, 'east', { mg: false }).reason === 'microgame', 'an unsolved word leaves Mojo where he was (microgame)')
  const tw = S(w, 'east', { mg: true }).world
  check(tw.tools.palu && PG.find(tw, 'kotak').st === 'got' && tw.m.c === 1, 'the solved word gives the hammer, the box is gone and Mojo stands on its cell')
  check(S(S(tw, 'west').world, 'east').status === 'success', 'an emptied toolbox never blocks')
  rr = S(S(tw, 'east').world, 'repair')
  check(rr.reason === 'need-bolts' && rr.info.need === 3 && rr.info.have === 2, 'repair with 2 of 3 bolts = need-bolts (need 3, have 2)')
  const bw = PG.run(tw, ['down', 'east'], null).world
  check(bw.res.bolts === 3, 'driving over a bolt adds it')
  const fx = PG.run(tw, ['down', 'east', 'up', 'repair'], { objectives: [{ do: 'repair', id: 'gate' }] })
  check(fx.done && fx.world.res.bolts === 0 && PG.find(fx.world, 'gate').st === 'fixed', 'repair with the tool and 3 bolts: fixed, bolts used')
  const through = PG.run(fx.world, ['up'], null)
  check(!through.stop && through.world.m.r === 0, 'a repaired gate can be driven through (resolved things never block)')

  // crate: pick / drop / deliver; heavy needs the crane hook
  const cl = L(['....'], { at: [0, 0], h: 'E', form: 'normal' }, [{ id: 'c', type: 'crate', at: [0, 1] }, { id: 'z', type: 'zone', at: [0, 3], accepts: 'crate' }])
  w = W(cl)
  r = S(w, 'pick')
  check(r.world.m.carry === 'c' && PG.find(r.world, 'c').st === 'carried', 'pick lifts a crate')
  check(S(r.world, 'pick').reason === 'hands-full', 'one crate at a time')
  const dd = PG.run(r.world, ['fwd', 'fwd', 'fwd', 'drop'], null)
  check(dd.stop && dd.stop.reason === 'drop-here', 'cannot drop off the map')
  const dv = PG.run(r.world, ['fwd', 'drop'], null)
  check(PG.find(dv.world, 'c').st === 'idle' && PG.find(dv.world, 'c').c === 2, 'drop puts the crate ahead')
  const dz = PG.run(r.world, ['fwd', 'fwd'], null).world
  const dz2 = PG.run(PG.clone(dz), ['left', 'left'], null)
  check(dz2.world.m.h === 3, 'turn with a crate')
  const dl2 = PG.run(PG.run(r.world, ['fwd'], null).world, ['fwd', 'right', 'right'], null)
  check(dl2.world.m.carry === 'c', 'still carrying')
  const dl3 = PG.run(W(L(['....'], { at: [0, 1], h: 'E' }, [{ id: 'c', type: 'crate', at: [0, 2] }, { id: 'z', type: 'zone', at: [0, 3], accepts: 'crate' }])), ['pick', 'left', 'left', 'right', 'right', 'drop'], null)
  check(PG.find(dl3.world, 'c').st === 'idle', 'drop back where it was')
  const deliv = PG.run(W(L(['.....'], { at: [0, 0], h: 'E' }, [{ id: 'c', type: 'crate', at: [0, 1] }, { id: 'z', type: 'zone', at: [0, 3], accepts: 'crate' }])), ['pick', 'fwd', 'fwd', 'drop'], { objectives: [{ do: 'deliver', id: 'c' }] })
  check(deliv.done && PG.find(deliv.world, 'c').st === 'delivered', 'a crate dropped on its zone is delivered (objective)')
  const hv = W(L(['...'], { at: [0, 0], h: 'E', form: 'normal' }, [{ id: 'h', type: 'crate', at: [0, 1], heavy: true }]))
  check(S(hv, 'pick').reason === 'too-heavy', 'a heavy crate is too heavy for Normal Mojo')
  check(S(S(hv, 'swop:crane').world, 'hook').world.m.carry === 'h', 'Mojo Derek hooks a heavy crate')

  // fly / land (chopper)
  const al = L(['.#.', '.#.'], { at: [0, 0], h: 'E', form: 'chopper' })
  w = W(al)
  check(S(w, 'fwd').reason === 'terrain', 'on the ground a building blocks')
  const air = PG.run(w, ['takeoff', 'fwd'], null)
  check(air.world.m.air && air.world.m.c === 1, 'airborne Mojo Heli flies over a building')
  check(S(air.world, 'land').reason === 'no-landing', 'no landing on a building')
  check(S(air.world, 'swop:normal').reason === 'in-air', 'no swop while flying')
  check(PG.run(air.world, ['fwd', 'land'], null).world.m.air === false, 'lands on the road')
  const ar = W(L(['.#', '..'], { at: [1, 1], h: 'N', form: 'chopper' }, [{ id: 'p', type: 'person', at: [0, 1], elev: 6 }]))
  check(PG.find(PG.run(ar, ['takeoff', 'rescue'], null).world, 'p').st === 'rescued', 'Mojo Heli rescues from the air (a second way to reach high)')
}

/* ── C swop ──────────────────────────────────────────────────────── */
section('C swop')
{
  const lv = ML.byId('t7'), w0 = PG.prep(PG.world(lv), lv, 0)
  const run = PG.run(w0, ['swop:dozer', 'push', 'swop:fire', 'fwd', 'fwd', 'spray'], lv.beats[0])
  const sw = run.steps.filter(s => s.events.some(e => e.e === 'swop')).map(s => s.events.find(e => e.e === 'swop').to)
  check(run.done && sw.join(',') === 'dozer,fire', 'two Swops inside one program (Dozer then Fire) complete the mission')
  const na = PG.step(w0, 'swop:chopper')
  check(na.status === 'invalid-capability' && na.reason === 'not-allowed', 'SWOP to a form the beat does not allow = invalid-capability (not-allowed)')
  const same = PG.step(w0, 'swop:normal')
  check(same.status === 'success' && same.events[0].same, 'SWOP to the current form is allowed (PRD §6.3, costs a command, never fails)')
  const carry = PG.defineForm('qa-nocarry', { verbs: ['spray'], carry: false })
  const cw = PG.run(PG.world(L(['...'], { at: [0, 0], h: 'E' }, [{ id: 'c', type: 'crate', at: [0, 1] }])), ['pick'], null).world
  check(PG.step(cw, 'swop:qa-nocarry').reason === 'carrying' && carry, 'no swop into a form that cannot carry the cargo')
  const rs = PG.run(PG.prep(PG.world(ML.byId('m7')), ML.byId('m7'), 0), ['swop:dozer', 'push', 'swop:fire', 'fwd', 'spray', 'fwd', 'swop:normal', 'rescue'], ML.byId('m7').beats[0])
  check(rs.done, 'three Swops in one program (Longsor)')
}

/* ── D invalid capability -> debug ───────────────────────────────── */
section('D debug')
{
  const lv = ML.byId('t6'), w0 = PG.prep(PG.world(lv), lv, 0)
  const r = PG.run(w0, lv.beats[0].prefill, lv.beats[0])
  check(!r.done && r.stop && r.stop.status === 'invalid-capability' && r.steps.length === 3 && r.steps[2].path[0] === 2, 'the tutorial-6 plan stops AT the spray command (index 2) with invalid-capability')
  check(r.stop.info.forms.includes('fire'), 'the stop names the form that has the verb (Mojo Api)')
  check(PG.key(r.world) === PG.key(PG.run(w0, ['fwd', 'fwd'], lv.beats[0]).world), 'the world stops where the last good command left it')
  const incomplete = PG.run(w0, ['fwd'], lv.beats[0])
  check(!incomplete.done && incomplete.ended && !incomplete.stop, 'a program that ends early is reported as ended, not done (Bo: "tambah perintah")')
}

/* ── E repeat + if ───────────────────────────────────────────────── */
section('E repeat / if')
{
  const w = PG.world(L(['.....'], { at: [0, 0], h: 'E' }))
  let r = PG.run(w, [{ op: 'repeat', n: 3, body: ['fwd'] }], null)
  check(r.world.m.c === 3 && r.steps.length === 3 && r.steps.every(s => s.path[0] === 0 && s.path.length === 2), 'REPEAT ×3 [fwd] moves 3 cells; each step carries its slot path')
  r = PG.run(w, [{ op: 'repeat', n: 2, body: [{ op: 'repeat', n: 2, body: ['fwd'] }] }], null)
  check(r.world.m.c === 4, 'nested REPEAT ×2 ×2 = 4 moves')
  r = PG.run(PG.world(L(['.'.repeat(12)], { at: [0, 0], h: 'E' })), [{ op: 'repeat', n: 50, body: ['fwd'] }], null)
  check(r.world.m.c === 9, 'REPEAT is capped at ×9')
  r = PG.run(w, [{ op: 'repeat', n: 2, body: [{ op: 'repeat', n: 2, body: [{ op: 'repeat', n: 2, body: [{ op: 'repeat', n: 2, body: ['fwd'] }] }] }] }], null)
  check(r.world.m.c <= 4, 'repeat nesting deeper than 3 is ignored (no overflow)')
  // Appendix B: REPEAT ×3 { FORWARD; IF SEE FIRE: SPRAY }
  const fl = L(['......'], { at: [0, 0], h: 'E', form: 'fire' }, [{ id: 'f1', type: 'fire', at: [0, 2] }, { id: 'f2', type: 'fire', at: [0, 4] }], { res: { water: 2 }, cap: { water: 5 } })
  const prog = [{ op: 'repeat', n: 3, body: ['fwd', { op: 'if', cond: 'fire', body: ['spray'] }] }]
  r = PG.run(PG.world(fl), prog, { objectives: [{ do: 'extinguish', id: 'f1' }, { do: 'extinguish', id: 'f2' }] })
  check(r.done && r.world.m.c === 3, 'Appendix B: REPEAT ×3 [FORWARD, IF fire: SPRAY] puts out both fires')
  check(PG.size(prog) === 4, 'program size counts blocks and their bodies')
  const cw = PG.world(L(['...'], { at: [0, 0], h: 'E' }, [{ id: 'r', type: 'rock', at: [0, 1] }]))
  check(PG.cond(cw, 'rock') && !PG.cond(cw, 'fire') && !PG.cond(cw, 'clear'), 'IF conditions read the cell ahead (rock yes, fire no, clear no)')
  check(PG.flat([{ op: 'repeat', n: 2, body: ['fwd', 'left'] }]).join(',') === 'fwd,left,fwd,left', 'flat() expands REPEAT')
}

/* ── F every level ───────────────────────────────────────────────── */
section('F levels')
{
  const ids = ML.LEVELS.map(l => l.id)
  check(new Set(ids).size === ids.length, 'level ids are unique')
  check(ML.LEVELS.filter(l => l.ch === 'belajar').length === 7, '7 tutorials (PRD §34)')
  check(ML.LEVELS.filter(l => l.ch === 'ch1' || l.ch === 'ch2').length === 8, '8 early missions (chapters 1-2)')
  let multi = 0, swopMid = 0, twoForms = 0
  for (const lv of ML.LEVELS) {
    const t0 = Date.now(), v = PG.verify(lv)
    console.log(`${lv.id}: checkpoint coverage ${v.complete ? 'complete' : 'BOUNDED'}; ${v.truncations.length} truncations`)
    check(v.ok, `${lv.id} "${lv.title}" is solvable beat by beat within its slots ${v.problems.join(' | ')}`)
    v.beats.forEach((b, i) => {
      const beat = lv.beats[i]
      check(b.shortest != null && b.shortest <= beat.budget, `${lv.id} beat ${i + 1}: the ★★★ budget ${beat.budget} is reachable (shortest ${b.shortest})`)
      check(b.shortest <= beat.slots, `${lv.id} beat ${i + 1}: the shortest plan fits the strip (${b.shortest}/${beat.slots})`)
      if (beat.palette) {
        const sol = b.solution || []
        check(sol.every(c => beat.palette.includes(c)), `${lv.id} beat ${i + 1}: the solution uses only palette commands`)
      }
      if (beat.alts) { multi++; Object.entries(b.alts).forEach(([n, s]) => check(!!s, `${lv.id} beat ${i + 1}: alternative "${n}" solves (${(s || []).join(' ')})`)) }
      const sw = (b.solution || []).filter(c => c.startsWith('swop:'))
      if (sw.length && (b.solution || []).indexOf(sw[0]) > 0) swopMid++
      if (new Set(sw).size >= 2) twoForms++
      if (beat.prefill) check(!PG.run(starts(lv)[i], beat.prefill, beat).done, `${lv.id}: the prefilled plan does not already solve it (it is the debug lesson)`)
    })
    // optional star never blocks, and is reachable (★★)
    ;(lv.optional || []).forEach(o => {
      let found = null
      const st = starts(lv)
      for (let bi = 0; bi < st.length && !found; bi++) {
        const beat = lv.beats[bi]
        const sol = PG.solve(st[bi], beat, { goal: { objectives: [o].concat(beat.objectives) }, maxLen: beat.slots })
        if (!sol) continue
        const r = PG.run(st[bi], sol, beat, { auto: true })     // the real run stops when the beat completes
        if (r.done && r.world.got[o.id]) found = { bi, sol }
      }
      check(!!found, `${lv.id}: the optional ${o.id} can be collected within some beat's slots (the run stops at the beat's end)`)
      if (found) { const b = lv.beats[found.bi]; check(found.sol.length <= b.budget + (b.starExtra || 0), `${lv.id}: star route ${found.sol.length} fits the ★★★ budget ${b.budget}+${b.starExtra || 0}`) }
    })
    if (Date.now() - t0 > 8000) check(false, `${lv.id}: verify took ${Date.now() - t0} ms`)
  }
  check(multi >= 2, `at least two beats prove two valid solutions (Dozer OR Jumper) (${multi})`)
  check(twoForms >= 3, `several levels need two different Swop-Tops in one program (${twoForms})`)
  const s1 = ML.byId('s1')
  check(s1.grid.rows === 6 && s1.grid.cols === 6, 'the slice is 6x6')
  const forms = new Set(); s1.beats.forEach(b => (b.forms || []).forEach(f => forms.add(f)))
  check(['normal', 'dozer', 'fire', 'cherry'].every(f => forms.has(f)), 'the slice uses Normal, Dozer, Fire and Cherry Picker')
  check(s1.objects.filter(o => o.type === 'fire').length === 2 && s1.objects.some(o => o.type === 'rock') && s1.objects.some(o => o.type === 'person' && o.elev === 6), 'slice: a rock, two fires, a child at height 6')
  const f2 = s1.objects.find(o => o.id === 'api2')
  const v = PG.verify(s1)
  // after beat 1 the reserve is 2 and the big fire needs 5
  const b1 = PG.run(PG.prep(PG.world(s1), s1, 0), v.beats[0].solution, s1.beats[0])
  check(f2.str === 5 && b1.world.res.water === 2, 'slice: the second fire needs 5 water units while 2 are in reserve')
  check(s1.res.bolts === 5 && s1.objects.find(o => o.id === 'gerbang').needs.bolts === 8, 'slice: the repair needs 8 bolts, 5 in the box')
  check(s1.objects.some(o => o.type === 'toolbox' && o.mg && o.mg.kind === 'letters' && o.tool === 'palu'), 'slice: the PALU / HAMMER letters microgame gives the hammer')
  check(s1.beats.length >= 2, 'slice: more than one beat (a checkpoint after the first)')
  // the bolt count matters: the column-1 route collects only 2 bolts
  const w2 = starts(s1)[2]
  const short = PG.run(w2, ['swop:normal', 'up', 'up', 'east', 'repair'], s1.beats[2], { auto: true })
  check(!short.done && short.stop && short.stop.reason === 'need-bolts' && short.stop.info.have === 7, 'slice: a route with only 2 more bolts stops at the gate (need 8, have 7)')
}

/* Alternative predecessor states must propagate beyond one checkpoint. */
{
  const lv = { id:'checkpoint-fork', mode:'rel', grid:{ rows:2,cols:3,map:['...','...'] }, mojo:{at:[0,0],h:'E'},
    objects:[{id:'baut',type:'bolt',at:[0,1],n:1}], beats:[
      {objectives:[{do:'reach',at:[0,2]}],slots:8,forms:['normal']},
      {start:{at:[1,0],h:'E'},objectives:[{do:'reach',at:[1,1]}],slots:1,forms:['normal']},
      {objectives:[{do:'collect',res:'bolts',n:1}],slots:1,forms:['normal']}
    ] };
  const v=PG.verify(lv);
  check(!v.ok && v.problems.some(p=>p.includes('beat 2 unsolvable')), 'alternative early ending exposes a dead end two checkpoints later');
  const bounded=PG.verify(lv,{maxTerminals:1,maxStarts:1});
  check(bounded.complete===false && bounded.truncations.length>0,'bounded checkpoint verification explicitly reports truncation');
  const counted=PG.count(PG.world(lv),lv.beats[0],{maxTerminals:1});
  check(counted.truncated===true && counted.terminalCount>counted.terminals.length,'count reports discarded terminal states');
}

/* ── G hint ladder, last rung ────────────────────────────────────── */
section('G hints')
{
  for (const lv of ML.LEVELS) {
    for (let bi = 0; bi < lv.beats.length; bi++) {
      const beat = lv.beats[bi], w = starts(lv)[bi]
      let prog = (beat.prefill || []).slice(), n = 0, done = false
      while (n++ < 20) {
        const h = PG.hint(w, beat, prog)
        if (!h) break
        if (h.done) { done = true; break }
        prog = prog.slice(0, h.at).concat([h.cmd])
      }
      const r = PG.run(w, prog, beat, { auto: true })
      check(done && r.done && prog.length <= beat.slots, `${lv.id} beat ${bi + 1}: following the ghost hint one command at a time solves it (${prog.join(' ')})`)
    }
  }
  const lv = ML.byId('t6'), w = PG.prep(PG.world(lv), lv, 0)
  const h = PG.hint(w, lv.beats[0], lv.beats[0].prefill)
  check(h && h.at === 2 && h.cmd === 'swop:fire', 'tutorial 6: the hint keeps FORWARD FORWARD and suggests SWOP API at slot 3 (not the whole solution)')
}

/* ── H lint ──────────────────────────────────────────────────────── */
section('H lint')
{
  const bad = { id: 'bad', grid: { rows: 2, cols: 3, map: ['...', '.#'] }, mojo: { at: [0, 0] },
    objects: [{ id: 'a', type: 'rock', at: [0, 1] }, { id: 'a', type: 'rock', at: [0, 1] }, { id: 'b', type: 'bolt', at: [1, 1] }, { id: 'c', type: 'ufo', at: [9, 9] }],
    beats: [{ objectives: [{ do: 'rescue', id: 'nobody' }], slots: 0, forms: ['hover'] }] }
  const p = PG.lint(bad).join(' | ')
  ;[['row 1 has', 'short map row'], ['duplicate id', 'duplicate ids'], ['shares a cell', 'two objects in one exclusive cell'], ['unknown type', 'unknown object type'],
    ['objective names', 'objective naming a missing object'], ['unknown form', 'unknown form'], ['slots', 'zero slots'], ['stands on', 'a pickup on a building']].forEach(([k, what]) => check(p.includes(k), 'lint flags ' + what))
}

/* ── I SoalEngine pack + profile ─────────────────────────────────── */
section('I SoalEngine')
{
  const w = MS.word('palu', 'id'), e = MS.word('palu', 'en')
  check(w && w.word === 'PALU' && w.letters.join('') === 'PALU' && w.scramble !== 'PALU' && w.scramble.split('').sort().join('') === 'ALPU', 'pack mojo: PALU with a real scramble')
  check(e && e.word === 'HAMMER' && e.pair === 'PALU', 'pack mojo: HAMMER (English) pairs with PALU')
  const items = SE.items('mojo')
  check(items.length >= 20 && items.every(q => !q.invalid && !q.unsafe && SE.validateItem(q).length === 0), `pack mojo: ${items.length} items, all valid and safe`)
  const c = MS.world('collect', 'need=8 have=5 noun=baut')
  check(c && c.answer === '3' && c.need === 8 && c.have === 5 && SE.validate(c).length === 0, 'world maths: need 8, have 5 -> collect 3 (validated)')
  const hq = MS.world('height', 'step=2 target=6 who=Mia')
  check(hq && hq.answer === '6' && hq.marks.join(',') === '2,4,6,8' && hq.choices.includes('6') && SE.validate(hq).length === 0, 'world maths: height 2, 4, ?, 8 -> 6 (validated)')
  let bad = 0
  for (let s = 0; s < 400; s++) { const q = SE.generate('matematika', { game: 'g31', context: 'world', generator: 'mojo-world', seed: s }); if (!q || SE.validate(q).length || SE.validateItem(q).length) bad++ }
  check(bad === 0, `400 generated world cards validate (${bad} bad)`)
  const picks = SE.pick({ game: 'g31', context: 'susun', count: 6, history: false, seed: 3 })
  check(picks.length === 6 && picks.every(q => q.topic === 'bahasa' && q.theme.includes('mojo')), 'profile g31 context susun draws only the mojo words')
  check(!SE.pick({ game: 'g31', count: 20, history: false, seed: 5 }).some(q => SE.hasEmoji(q.prompt + q.choices.join(''))), 'profile g31 never serves emoji')
  const prof = SE.profile('g31')
  check(prof.packs.join() === 'mojo' && prof.general === false && prof.pictures === 'sprite', 'profile g31: pack mojo only, no general pools, sprites')
  // every level's math card resolves
  ML.LEVELS.forEach(lv => lv.beats.forEach((b, i) => { if (b.math) { const q = MS.world(b.math.kind, b.math.about); check(q && SE.validate(q).length === 0, `${lv.id} beat ${i + 1}: its SoalEngine world card resolves (${q && q.prompt})`) } }))
  ML.LEVELS.forEach(lv => (lv.objects || []).forEach(o => { if (o.type === 'toolbox') ['id', 'en'].forEach(l => check(!!MS.word(o.tool, l), `${lv.id}: the ${o.tool} word exists in ${l}`)) }))
}

/* ── J board-absolute arrows (owner bug 2026-10-01: "arrows are read from the board, not the car") ── */
section('J absolute arrows')
{
  const t2 = ML.byId('t2'), w0 = PG.prep(PG.world(t2), t2, 0), beat = t2.beats[0]
  check(PG.modeOf(w0) === 'abs' && ML.LEVELS.every(l => PG.modeOf(PG.world(l)) === 'abs'), 'every level uses board-absolute arrows (the default mode)')
  check(ML.LEVELS.every(l => l.beats.every(b => !(b.palette || []).some(c => ['fwd', 'left', 'right'].includes(c)) && !(b.prefill || []).some(c => ['fwd', 'left', 'right'].includes(c)))), 'no level offers relative Maju / Belok commands')
  const owner = PG.run(w0, ['up', 'up', 'east', 'east'], beat)
  check(owner.done && owner.world.m.r === 0 && owner.world.m.c === 2, "t2: the owner's plan up, up, right, right reaches the flag")
  const top = PG.clone(w0); top.m = Object.assign({}, top.m, { r: 0, c: 0, h: 2 })   // Mojo top-left, facing down (the photo)
  const right = PG.run(top, ['east', 'east'], beat)
  check(right.done && right.world.m.c === 2 && right.world.m.h === 1, 't2 from the top-left: right, right reaches the flag whatever Mojo faced before')
  const down = PG.run(top, ['down', 'down'], null)
  check(!down.stop && down.world.m.r === 2 && down.world.m.c === 0 && down.world.m.h === 2, 't2 from the top-left: down, down goes down the left road')
  const wall = S(top, 'west')
  check(wall.status === 'blocked' && wall.reason === 'edge' && wall.world === top, 'an arrow into the edge is a gentle stop that leaves the world unchanged')
  const tree = S(PG.run(w0, ['up'], null).world, 'east')
  check(tree.status === 'blocked' && tree.reason === 'terrain', 'an arrow into a building is blocked (debug mode)')
  const ev = S(top, 'east').events
  check(ev[0].e === 'turn' && ev[0].h === 1 && ev[1].e === 'move', 'an arrow turns Mojo to face its direction, then moves one tile')
  // action verbs use the facing (the last move); with nothing in front they turn to the one neighbour that works
  const fire = W(L(['...', '...'], { at: [1, 1], h: 'E' }, [{ id: 'f', type: 'fire', at: [0, 1] }], { forms: ['fire'], res: { water: 2 }, cap: { water: 5 } }))
  fire.m.form = 'fire'
  const sp = S(fire, 'spray')
  check(sp.status !== 'blocked' && sp.world.m.h === 0 && sp.events[0].e === 'turn' && sp.events[0].auto && sp.turned, 'spray with the fire beside Mojo turns to it (auto turn event) and sprays')
  const lone = W(L(['...'], { at: [0, 1], h: 'E' }, [], { forms: ['fire'], res: { water: 2 } })); lone.m.form = 'fire'
  const none = S(lone, 'spray')
  check(none.status === 'blocked', 'spray with no fire around is still a gentle stop')
  // relative mode stays available for a later advanced world
  const rel = PG.world(Object.assign({}, L(['...', '...'], { at: [1, 0], h: 'N' }), { mode: 'rel' }))
  check(PG.modeOf(rel) === 'rel' && PG.palette({ forms: ['normal'] }, rel).slice(0, 3).join() === 'fwd,left,right' && PG.palette({ forms: ['normal'] }, W(L(['.'], { at: [0, 0] }))).slice(0, 4).join() === 'up,down,west,east', "mode 'rel' keeps Forward / Turn; the default palette is the four arrows")
  const rr = PG.run(rel, ['fwd', 'right', 'fwd'], null)
  check(rr.world.m.r === 0 && rr.world.m.c === 1 && PG.modeOf(rr.world) === 'rel', 'relative commands still run and the mode survives cloning')
}

/* ── K konsistensi: the ONE rule (LEWATI vs SEBELAH) ──────────────── */
section('K konsistensi')
{
  const VERB = { fire: ['fire', 'spray'], person: ['normal', 'rescue'], repair: ['normal', 'repair'], rock: ['dozer', 'push'], log: ['dozer', 'push'], crate: ['normal', 'pick'] }
  const grid5 = ['.....', '.....', '.....', '.....', '.....']
  const objOf = type => ({ id: 'x', type, at: [2, 2], str: 1, needs: {} })
  for (const [type, t] of Object.entries(PG.TYPES)) {
    // walk-over vs blocker: an arrow onto it
    const w = W(L(['...'], { at: [0, 0], h: 'E' }, [objOf(type)].map(o => ({ ...o, at: [0, 1] }))))
    const r = S(w, 'east', { auto: true })
    if (t.walk) check(PG.ok(r.status) && r.world.m.c === 1, `${type}: LEWATI — driving onto it works (${r.status} ${r.reason || ''})`)
    else check(r.status === 'blocked' && r.reason === 'object' && r.info.type === type, `${type}: SEBELAH — an arrow into it is a gentle bump naming it (${r.reason})`)
    check(!!t.walk !== !!t.block, `${type}: is exactly one of walk-over or blocker`)
    if (!t.block) continue
    check(!!VERB[type] && t.verb === VERB[type][1], `${type}: has its SEBELAH action ${t.verb}`)
    const [form, verb] = VERB[type]
    // the action works from all four sides, whatever Mojo faces, and Mojo turns to the target
    for (let side = 0; side < 4; side++) for (let h = 0; h < 4; h++) {
      const at = [2 - PG.DIRS[side][0], 2 - PG.DIRS[side][1]]   // Mojo on the cell `side` of the target... target lies in direction `side`
      const ww = W(L(grid5, { at, h, form }, [objOf(type)], { res: { water: 3 }, cap: { water: 5 } }))
      const rs = S(ww, verb)
      const okSide = PG.ok(rs.status) && rs.world.m.h === side && (h === side ? !rs.turned : rs.turned && rs.events[0].e === 'turn' && rs.events[0].auto)
      if (!okSide) check(false, `${type}: ${verb} from side ${side} facing ${h} (${rs.status} ${rs.reason} h=${rs.world.m.h})`)
      else passes++
      if (side === 1 && h === 0) {
        // after resolving it, the cell is road again — except a pushed rock/log, which is still a rock
        const next = PG.run(rs.world, [['up', 'east', 'down', 'west'][side]], null)
        if (type === 'rock' || type === 'log') check(next.stop && next.stop.reason === 'object', `${type}: pushed onto ground it is still a ${type} and blocks`)
        else check(!next.stop, `${type}: resolved (${PG.find(rs.world, 'x').st}) it never blocks`)
      }
    }
  }
  // a rock pushed into a pit fills it: road
  { const r = PG.run(W(L(['...o.'], { at: [0, 1], h: 'W', form: 'dozer' }, [{ id: 'r', type: 'rock', at: [0, 2] }])), ['push', 'east', 'east'], null)
    check(!r.stop && r.world.m.c === 4, 'a rock pushed into a pit fills it and becomes road') }
  // ambiguity: two fires beside Mojo
  { const w = W(L(['...', '...'], { at: [1, 1], h: 'N', form: 'fire' }, [{ id: 'a', type: 'fire', at: [1, 0] }, { id: 'b', type: 'fire', at: [1, 2] }], { res: { water: 2 }, cap: { water: 5 } }))
    const r = S(w, 'spray'); check(r.reason === 'ambiguous' && r.info.dirs.join() === '1,3', 'two fires beside Mojo and facing neither = ambiguous')
    const e = PG.clone(w); e.m.h = 1; const r2 = S(e, 'spray')
    check(PG.ok(r2.status) && PG.find(r2.world, 'b').st === 'out', 'two fires: the one Mojo faces is sprayed') }
  // specific reasons
  { const w = W(L(['....'], { at: [0, 0], h: 'E', form: 'jumper' }, [{ id: 'p', type: 'person', at: [0, 1] }]))
    check(S(w, 'jump').reason === 'jump-person', 'a friend cannot be jumped over (jump-person)')
    const g = W(L(['....'], { at: [0, 0], h: 'E', form: 'jumper' }, [{ id: 'g', type: 'repair', at: [0, 1], needs: {} }]))
    check(S(g, 'jump').reason === 'jump-repair', 'a repair point cannot be jumped over (jump-repair)')
    const c = W(L(['...'], { at: [0, 0], h: 'E', form: 'cherry' }))
    check(S(c, 'lower').reason === 'not-raised', 'lower while the basket is down = not-raised (symmetric with raise no-target)')
    check(S(c, 'raise').reason === 'no-target', 'raise with nothing high beside Mojo = no-target')
    const hi = W(L(['..', '..'], { at: [1, 0], h: 'E', form: 'normal' }, [{ id: 'p', type: 'person', at: [0, 0], elev: 4 }], { forms: ['normal', 'cherry'] }))
    hi.forms = ['normal', 'cherry']
    const nf = S(hi, 'rescue'); check(nf.reason === 'need-form' && nf.info.forms.includes('cherry') && nf.info.elev === 4 && nf.info.turn === 0, 'Normal Mojo beside a friend up high = need-form naming Mojo Keranjang (and Mojo turns to the friend)')
    const ch = PG.clone(hi); ch.m = { ...ch.m, form: 'cherry' }
    check(S(ch, 'rescue').reason === 'too-high', 'Mojo Keranjang not raised yet = too-high') }
  // lift resets at every beat start
  { const m6 = ML.byId('m6'), st = starts(m6)
    const end = PG.run(st[0], PG.solve(st[0], m6.beats[0]), m6.beats[0], { auto: true }).world
    check(end.m.lift === 4 && PG.startBeat(end, m6, 1).m.lift === 0 && st[1].m.lift === 0, 'the lift (4 after the lamp) resets to 0 when the next beat begins') }
  // the Chopper in the air takes every LEWATI item
  { const w = W(L(['......'], { at: [0, 0], h: 'E', form: 'chopper' }, [{ id: 's', type: 'star', at: [0, 1] }, { id: 'b', type: 'bolt', at: [0, 2] }, { id: 'd', type: 'drop', at: [0, 3] }, { id: 't', type: 'toolbox', at: [0, 4], tool: 'palu' }], { res: { bolts: 0, water: 0 }, cap: { bolts: 3, water: 3 } }))
    const r = PG.run(w, ['takeoff', 'east', 'east', 'east', 'east'], null, { auto: true })
    check(!r.stop && r.world.got.s && r.world.res.bolts === 1 && r.world.res.water === 1 && r.world.tools.palu, 'flying over star, bolt, drop and toolbox takes all four') }
  // a full tank: the drop stays, the event names cap-full; IF pickup reads Mojo's own cell
  { const w = W(L(['...'], { at: [0, 0], h: 'E', form: 'fire' }, [{ id: 'd', type: 'drop', at: [0, 1] }], { res: { water: 2 }, cap: { water: 2 } }))
    const r = S(w, 'east'); check(r.events.some(e => e.e === 'full' && e.reason === 'cap-full'), 'a full tank leaves the drop with reason cap-full')
    check(PG.cond(r.world, 'pickup') && !PG.cond(w, 'pickup'), 'IF pickup reads the cell Mojo stands on (not the cell ahead)') }
  // ROAD rule: grass is scenery — never driven onto, never landed on, never jumped "over" as an obstacle
  { const g = W(L(['.,.', '...'], { at: [0, 0], h: 'E' }))
    const r = S(g, 'east'); check(r.status === 'blocked' && r.reason === 'grass' && r.world === g, 'an arrow onto grass is a gentle stop with its own reason (grass)')
    check(PG.REASONS.includes('grass') && !PG.TERRAIN[','].pass && PG.TERRAIN['.'].road && PG.TERRAIN['='].road, 'grass is not drivable; road and bridge are')
    const j = W(L(['..,'], { at: [0, 0], h: 'E', form: 'jumper' }, [{ id: 'r', type: 'rock', at: [0, 1] }]))
    const jr = S(j, 'jump'); check(jr.reason === 'grass' && jr.info.land, 'a jump never lands on grass (grass, land)')
    check(S(W(L(['.,.'], { at: [0, 0], h: 'E', form: 'jumper' })), 'jump').reason === 'no-target', 'a lawn is nothing to jump over (no-target)')
    const pr = W(L(['..,'], { at: [0, 0], h: 'E', form: 'dozer' }, [{ id: 'r', type: 'rock', at: [0, 1] }]))
    const pp = S(pr, 'push'); check(pp.reason === 'push-wall' && pp.info.terrain === ',', 'a rock cannot be pushed onto grass (push-wall, terrain grass)')
    const ch = W(L(['.,'], { at: [0, 0], h: 'E', form: 'chopper' }))
    const air = PG.run(ch, ['takeoff', 'east'], null).world
    check(air.m.c === 1 && S(air, 'land').reason === 'no-landing', 'the Chopper may fly over grass but never lands on it')
    // no level solution ever stands Mojo on grass
    let onGrass = []
    for (const lv of ML.LEVELS) { let w = PG.prep(PG.world(lv), lv, 0)
      lv.beats.forEach((b, bi) => { if (bi) w = PG.prep(PG.startBeat(w, lv, bi), lv, bi); const sol = PG.solve(w, b) || []
        for (const c of sol) { w = PG.step(w, c, { auto: true }).world; if (lv.grid.map[w.m.r][w.m.c] === ',' && !w.m.air) onGrass.push(lv.id) } }) }
    check(onGrass.length === 0, 'no level route ever puts Mojo on grass ' + onGrass.join(',')) }
  // no no-target while a valid target is beside Mojo — over the reachable states of every level
  let probes = 0, bad = []
  for (const lv of ML.LEVELS) for (const [bi, w0] of starts(lv).entries()) {
    const beat = lv.beats[bi], cmds = PG.palette(beat, w0), seen = new Set([PG.key(w0)]), q = [w0]
    for (let h = 0; h < q.length && h < 1500; h++) {
      const w = q[h]
      for (const v of Object.keys(PG.TYPES).map(t => PG.TYPES[t].verb).concat(['raise', 'jump', 'hook']).filter((x, i, a) => x && a.indexOf(x) === i)) {
        if (!PG.can(w.m.form, v)) continue
        const n = PG.aim(w, v).length, r = S(w, v, { auto: true }); probes++
        if (n && r.reason === 'no-target') bad.push(`${lv.id}:${bi} ${v}`)
        if (n === 1 && r.reason === 'ambiguous') bad.push(`${lv.id}:${bi} ${v} ambiguous`)
      }
      for (const c of cmds) { const r = S(w, c, { auto: true }); if (!PG.ok(r.status)) continue; const k = PG.key(r.world); if (!seen.has(k)) { seen.add(k); q.push(r.world) } }
    }
  }
  check(bad.length === 0, `no no-target while a target is beside Mojo (${probes} probes over every level) ${bad.slice(0, 5).join(' | ')}`)
}

/* ── L level lint for the rule + every reason has its own message ─── */
section('L rule lint + messages')
{
  for (const lv of ML.LEVELS) check(PG.lintRule(lv).length === 0 && PG.lint(lv).length === 0, `${lv.id}: no SEBELAH target on a wall, every target approachable, no cell beside two same-verb targets ${PG.lint(lv).join(' | ')}`)
  const lvl = (map, objects) => ({ id: 'z', grid: { rows: map.length, cols: map[0].length, map }, mojo: { at: [0, 0] }, objects, beats: [{ objectives: [{ do: 'reach', at: [0, 0] }], slots: 3 }] })
  check(PG.lint(lvl(['..#'], [{ id: 'f', type: 'fire', at: [0, 2] }])).some(p => p.includes('stands on')), 'lint: a fire on a building is refused')
  check(PG.lint(lvl(['.T.', 'T.T', '.T.'].map(r => r.replace(/^\./, '.')), [{ id: 'p', type: 'person', at: [1, 1] }])).some(p => p.includes('cannot be reached')), 'lint: a friend walled in on all four sides is refused')
  check(PG.lint(lvl(['.....'], [{ id: 'a', type: 'fire', at: [0, 1] }, { id: 'b', type: 'fire', at: [0, 3] }])).some(p => p.includes('touches two spray')), 'lint: one road cell beside two fires is refused')
  check(PG.lint(lvl(['....'], [{ id: 't', type: 'toolbox', at: [0, 1], tool: 'palu' }, { id: 'b', type: 'bolt', at: [0, 1] }])).some(p => p.includes('shares a cell')), 'lint: a toolbox shares its cell with nothing')
  // the ROAD rule (owner 2026-10-03), one synthetic bad level per rule
  const has = (lv, k) => PG.lint(lv).some(p => p.includes(k))
  for (const type of ['star', 'bolt', 'drop', 'toolbox', 'flag']) check(has(lvl(['...', ',,,'], [{ id: 'x', type, at: [1, 1], tool: 'palu' }]), 'must sit ON the road'), `lint: a ${type} on grass is refused (walk-over items sit ON the road)`)
  check(has(lvl(['...', ',,,'], [{ id: 'r', type: 'rock', at: [1, 1] }]), 'must sit ON the road'), 'lint: a rock on grass is refused (pushing it would put Mojo on grass)')
  check(!has(lvl(['...', ',,,'], [{ id: 'f', type: 'fire', at: [1, 1] }]), 'stands on'), 'lint: a fire on the lawn beside the road is fine (SEBELAH target on decor)')
  check(has(lvl(['...', ',,,', ',,,'], [{ id: 'f', type: 'fire', at: [2, 1] }]), 'cannot be reached from any road'), 'lint: a target with no ROAD neighbour is refused')
  check(has(lvl(['..,.'], [{ id: 's', type: 'star', at: [0, 3] }]), 'not on the road network'), 'lint: a pickup on a road piece cut off from the start is refused')
  check(has(lvl(['..,.', ',,,.'], [{ id: 'p', type: 'person', at: [1, 2] }]), 'no road neighbour connected'), 'lint: a target whose only road neighbour is cut off from the start is refused')
  check(has(lvl(['..,.'], []), 'isolated road cell'), 'lint: a lone road cell is refused')
  check(has(lvl(['..,..', ',,,..'], []), 'road not connected'), 'lint: a second road piece not joined to the start is refused')
  check(!has(lvl(['..o..'], []), 'not connected'), 'lint: a pit inside the road joins the two halves (a rock fills it)')
  check(has({ ...lvl([',..'], []), mojo: { at: [0, 0] } }, 'off the road'), 'lint: Mojo never starts on grass')
  // Bo's beat line (owner 2026-10-03, m6 photo): the bubble shows the FIRST sentence, so it must name THIS beat's
  // objective and fit the bubble; and Bo never names an action the beat cannot use
  const WHATN = { swing: 'ayunan', lamp: 'lampu', gate: 'gerbang' }
  const ACT = { DORONG: 'push', SEMPROT: 'spray', NAIK: 'raise', TURUN: 'lower', TOLONG: 'rescue', PERBAIKI: 'repair', LOMPAT: 'jump', AMBIL: 'pick', TERBANG: 'takeoff' }
  for (const lv of ML.LEVELS) lv.beats.forEach((b, bi) => {
    const first = (b.bo.match(/^.*?[.!?](?:\s|$)/) || [b.bo])[0].trim().toLowerCase()
    const nouns = (b.objectives || []).map(ob => { const o = (lv.objects || []).find(x => x.id === ob.id)
      return ob.do === 'reach' ? 'bendera' : ob.do === 'extinguish' ? 'api' : ob.do === 'rescue' ? (o.name || '').toLowerCase() : ob.do === 'repair' ? WHATN[o.what] : ob.id })
    check(first.length <= 64 && nouns.some(n => n && first.includes(n)), `${lv.id} beat ${bi + 1}: Bo's bubble line "${first}" names the objective (${nouns.join('/')}) and fits the bubble (${first.length}/64)`)
    const verbs = new Set((b.palette || PG.palette(b)).map(c => PG.verbOf(c)))
    const named = Object.keys(ACT).filter(k => new RegExp('\\b' + k + '\\b').test(b.bo))
    check(named.every(k => verbs.has(ACT[k])), `${lv.id} beat ${bi + 1}: every action Bo names is in the beat's palette (${named.join(',')})`)
  })
  // static scan: every reason the engine can return has its own message in the game (no generic fallback)
  const eng = fs.readFileSync(path.join(ROOT, 'games/prog-grid.js'), 'utf8'), ui = fs.readFileSync(path.join(ROOT, 'games/mojo-swoptops.js'), 'utf8')
  const used = new Set([...eng.matchAll(/'(?:blocked|invalid-capability)', '([a-z-]+)'/g)].map(m => m[1]).concat([...eng.matchAll(/reason: '([a-z-]+)'/g)].map(m => m[1])))
  ;(ML.LEVELS.flatMap(l => l.objects || [])).forEach(o => Object.keys(o.needs || {}).forEach(k => { if (k !== 'tool') used.add('need-' + k) }))
  used.delete('need-')   // 'need-' + resource: the level scan above adds the real names
  const missingList = [...used].filter(r => !PG.REASONS.includes(r))
  check(missingList.length === 0, 'every reason the engine returns is listed in ProgGrid.REASONS ' + missingList.join(','))
  const block = ui.slice(ui.indexOf('var MSG = {'), ui.indexOf('\n  }', ui.indexOf('var MSG = {')))
  const keys = new Set([...block.matchAll(/^\s{4}'?([a-z-]+)'?\s*:/gm)].map(m => m[1]))
  const noMsg = PG.REASONS.filter(r => !keys.has(r))
  check(block.length > 20 && noMsg.length === 0, `every engine reason has its own message in mojo-swoptops.js MSG (${keys.size} keys) ${noMsg.join(',')}`)
  check(!/Hmm, Mojo berhenti/.test(ui) && !/Coba AMBIL/.test(ui), 'the generic "Mojo berhenti" fallback and the toolbox "Coba AMBIL" text are gone')
}

console.log(`\n${passes} passed, ${fails.length} failed`)
process.exit(fails.length ? 1 : 0)
