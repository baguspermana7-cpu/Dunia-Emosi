#!/usr/bin/env node
/* =============================================================================
 * Unit tests for games/data/poke-type-chart.js — kid-friendly Pokemon type math.
 * =============================================================================
 * Run:  node scripts/test-type-chart.js
 *
 * Polyfills a minimal window so the module's `(function(){...})()` IIFE can
 * register its API on a global object. No DOM is exercised; only the pure
 * math + lookup functions are tested.
 *
 * Tests cover:
 *  - calcTypeMult: 18 canonical relationships → kid-friendly multipliers
 *  - calcStab: 1.25 same-type, 1 different-type
 *  - calcFullMult: STAB × effectiveness composition
 *  - getWeaknesses / getResistances: pool selection sanity
 *  - Edge cases: invalid types, case-insensitivity, missing data
 *
 * Exit code 0 if all pass; 1 if any fail. Suitable for CI.
 * ============================================================================ */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ── Minimal window polyfill ──────────────────────────────────────────────
const win = {};
// Module also references sessionStorage indirectly via spawnFirstTimeHint;
// we don't exercise that path here, but provide a no-op to be safe.
win.sessionStorage = {
  _data: {},
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; }
};
// document.createElement is touched by render helpers we don't call here,
// but stub anyway to prevent crashes on accidental triggers.
win.document = {
  createElement: () => ({ classList:{add(){},remove(){}}, style:{}, addEventListener(){} }),
  body: { appendChild(){} },
  querySelectorAll: () => [],
};

// Run the module in a sandbox that exposes our polyfilled window.
const modulePath = path.join(__dirname, '..', 'games', 'data', 'poke-type-chart.js');
const code = fs.readFileSync(modulePath, 'utf8');
const sandbox = { window: win, sessionStorage: win.sessionStorage, document: win.document };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);

const {
  POKE_EFF, calcTypeMult, calcStab, calcFullMult,
  getWeaknesses, getResistances, TYPE_EMOJI, TYPE_LABEL_ID,
  getMoveEffectivenessClass, getCounterHintHTML, typeEmojiPrefix
} = win;

// ── Tiny test harness ─────────────────────────────────────────────────────
let pass = 0, fail = 0;
const failures = [];
function eq(actual, expected, label) {
  const ok = (typeof actual === 'number' && typeof expected === 'number')
    ? Math.abs(actual - expected) < 1e-9
    : JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; }
  else { fail++; failures.push(`${label}\n   expected: ${JSON.stringify(expected)}\n   actual:   ${JSON.stringify(actual)}`); }
}
function truthy(v, label) {
  if (v) pass++;
  else { fail++; failures.push(`${label} (got ${JSON.stringify(v)})`); }
}

// ── Tests: calcTypeMult — kid-friendly multipliers ───────────────────────
// 2x canonical → 1.5  (super-effective)
// 1x canonical → 1    (neutral)
// 0.5x canonical → 0.75 (resist)
// 0 canonical → 0.5  (no full immune in kid mode)

eq(calcTypeMult('water', 'fire'), 1.5, 'water → fire = 1.5 (super)');
eq(calcTypeMult('fire', 'grass'), 1.5, 'fire → grass = 1.5 (super)');
eq(calcTypeMult('grass', 'water'), 1.5, 'grass → water = 1.5 (super)');
eq(calcTypeMult('electric', 'water'), 1.5, 'electric → water = 1.5 (super)');
eq(calcTypeMult('electric', 'flying'), 1.5, 'electric → flying = 1.5 (super)');
eq(calcTypeMult('rock', 'flying'), 1.5, 'rock → flying = 1.5 (super)');
eq(calcTypeMult('fighting', 'normal'), 1.5, 'fighting → normal = 1.5 (super)');
eq(calcTypeMult('ground', 'electric'), 1.5, 'ground → electric = 1.5 (super)');
eq(calcTypeMult('ice', 'dragon'), 1.5, 'ice → dragon = 1.5 (super)');
eq(calcTypeMult('fairy', 'dragon'), 1.5, 'fairy → dragon = 1.5 (super)');

eq(calcTypeMult('fire', 'water'), 0.75, 'fire → water = 0.75 (resist)');
eq(calcTypeMult('water', 'grass'), 0.75, 'water → grass = 0.75 (resist)');
eq(calcTypeMult('grass', 'fire'), 0.75, 'grass → fire = 0.75 (resist)');
eq(calcTypeMult('electric', 'grass'), 0.75, 'electric → grass = 0.75 (resist)');
eq(calcTypeMult('fire', 'fire'), 0.75, 'fire → fire = 0.75 (self-resist)');

eq(calcTypeMult('electric', 'ground'), 0.5, 'electric → ground = 0.5 (canonical immune → kid 0.5)');
eq(calcTypeMult('normal', 'ghost'), 0.5, 'normal → ghost = 0.5 (canonical immune → kid 0.5)');
eq(calcTypeMult('ghost', 'normal'), 0.5, 'ghost → normal = 0.5 (canonical immune → kid 0.5)');
eq(calcTypeMult('fighting', 'ghost'), 0.5, 'fighting → ghost = 0.5 (canonical immune → kid 0.5)');
eq(calcTypeMult('ground', 'flying'), 0.5, 'ground → flying = 0.5 (canonical immune → kid 0.5)');
eq(calcTypeMult('psychic', 'dark'), 0.5, 'psychic → dark = 0.5 (canonical immune → kid 0.5)');
eq(calcTypeMult('dragon', 'fairy'), 0.5, 'dragon → fairy = 0.5 (canonical immune → kid 0.5)');

eq(calcTypeMult('normal', 'water'), 1, 'normal → water = 1 (neutral)');
eq(calcTypeMult('fire', 'electric'), 1, 'fire → electric = 1 (neutral)');
eq(calcTypeMult('water', 'electric'), 1, 'water → electric = 1 (neutral)');

// Case insensitivity
eq(calcTypeMult('Fire', 'Grass'), 1.5, 'calcTypeMult case-insensitive (Title)');
eq(calcTypeMult('FIRE', 'GRASS'), 1.5, 'calcTypeMult case-insensitive (UPPER)');
eq(calcTypeMult(' water ', ' fire '), 1.5, 'calcTypeMult trims whitespace');

// Invalid types — graceful fallback to 1
eq(calcTypeMult('xyz', 'fire'), 1, 'invalid atk → 1 (graceful)');
eq(calcTypeMult('fire', 'xyz'), 1, 'invalid def → 1 (graceful)');
eq(calcTypeMult(null, 'fire'), 1, 'null atk → 1 (graceful)');
eq(calcTypeMult('fire', null), 1, 'null def → 1 (graceful)');
eq(calcTypeMult(undefined, undefined), 1, 'undefined,undefined → 1 (graceful)');

// ── Tests: calcStab ───────────────────────────────────────────────────────
eq(calcStab('fire', 'fire'), 1.25, 'STAB same type = 1.25');
eq(calcStab('water', 'water'), 1.25, 'STAB water = 1.25');
eq(calcStab('fire', 'water'), 1, 'STAB different = 1');
eq(calcStab('Fire', 'fire'), 1.25, 'STAB case-insensitive');
eq(calcStab('normal', 'normal'), 1.25, 'STAB normal = 1.25');

// ── Tests: calcFullMult — STAB × effectiveness ───────────────────────────
eq(calcFullMult('water', 'water', 'fire'), 1.5 * 1.25, 'water-Pokemon uses water move on fire → 1.875 (max)');
eq(calcFullMult('water', 'water', 'grass'), 0.75 * 1.25, 'water-Pokemon uses water move on grass → 0.9375 (STAB but resisted)');
// calcFullMult(moveType, attackerType, defenderType)
eq(calcFullMult('water', 'normal', 'fire'), 1.5 * 1, 'water move from normal-type vs fire → 1.5 (super, no STAB)');
eq(calcFullMult('normal', 'water', 'fire'), 1 * 1, 'normal move from water-type vs fire → 1 (neutral, no STAB — normal vs fire is neutral)');
eq(calcFullMult('fire', 'fire', 'grass'), 1.5 * 1.25, 'fire vs grass with fire move → 1.875 (max)');
eq(calcFullMult('ghost', 'ghost', 'normal'), 0.5 * 1.25, 'ghost vs normal with ghost (canonical immune) → 0.625 (STAB but immune)');

// ── Tests: getWeaknesses ──────────────────────────────────────────────────
const fireWeak = getWeaknesses('fire', 3);
truthy(Array.isArray(fireWeak), 'getWeaknesses returns array');
truthy(fireWeak.length === 3, `getWeaknesses fire max=3 returned ${fireWeak.length} (got ${JSON.stringify(fireWeak)})`);
truthy(fireWeak.includes('water'), 'fire weakness includes water');
truthy(fireWeak.includes('rock'), 'fire weakness includes rock');
truthy(fireWeak.includes('ground'), 'fire weakness includes ground');

const waterWeak = getWeaknesses('water', 2);
eq(waterWeak.length, 2, 'getWeaknesses water max=2 length');
truthy(waterWeak.includes('electric'), 'water weakness includes electric');
truthy(waterWeak.includes('grass'), 'water weakness includes grass');

// Pokemon with no super-effective attackers (rare) → empty array
// (No canonical Pokemon type has zero weaknesses, so all return >=1)
truthy(getWeaknesses('normal', 2).length > 0, 'normal has some weakness');

// ── Tests: getResistances ─────────────────────────────────────────────────
// Semantics: getResistances(defType) returns ATTACKER types whose moves are
// resisted (mult < 1) when used against defType.
// Fire as defender resists: fire (0.75), grass (0.75), ice (0.75), bug (0.75),
// steel (0.75), fairy (0.75).
const fireResists = getResistances('fire', 6);
truthy(fireResists.includes('fire'), 'fire (defender) resists fire attacks (self)');
truthy(fireResists.includes('grass'), 'fire resists grass attacks');
truthy(fireResists.includes('ice'), 'fire resists ice attacks');
truthy(!fireResists.includes('water'), 'fire does NOT resist water (water is super-effective)');
truthy(!fireResists.includes('rock'), 'fire does NOT resist rock (rock is super-effective)');

// ── Tests: TYPE_EMOJI completeness ────────────────────────────────────────
const allTypes = ['fire','water','grass','electric','psychic','ghost','dragon','dark',
                  'ice','rock','ground','flying','poison','steel','fighting','bug','fairy','normal'];
allTypes.forEach(t => {
  truthy(TYPE_EMOJI[t] && TYPE_EMOJI[t].length > 0, `TYPE_EMOJI[${t}] exists`);
  truthy(TYPE_LABEL_ID[t] && TYPE_LABEL_ID[t].length > 0, `TYPE_LABEL_ID[${t}] exists`);
});

// ── Tests: getMoveEffectivenessClass ──────────────────────────────────────
eq(getMoveEffectivenessClass('water', 'fire'), 'super-eff', 'water vs fire → super-eff class');
eq(getMoveEffectivenessClass('fire', 'water'), 'resist-eff', 'fire vs water → resist-eff class');
eq(getMoveEffectivenessClass('ghost', 'normal'), 'resist-eff', 'ghost vs normal (canonical immune kid 0.5) → resist-eff');
eq(getMoveEffectivenessClass('normal', 'water'), '', 'normal vs water → no class (neutral)');

// ── Tests: typeEmojiPrefix ────────────────────────────────────────────────
eq(typeEmojiPrefix('fire'), '🔥', 'typeEmojiPrefix fire');
eq(typeEmojiPrefix('water'), '💧', 'typeEmojiPrefix water');
eq(typeEmojiPrefix('UNKNOWN'), '⚪', 'typeEmojiPrefix invalid → default');

// ── Tests: getCounterHintHTML ─────────────────────────────────────────────
const counter = getCounterHintHTML('fire');
truthy(typeof counter === 'string', 'getCounterHintHTML returns string');
truthy(counter.includes('🎯'), 'counter HTML has target emoji');
truthy(counter.includes('💧') || counter.includes('🪨') || counter.includes('🌍'),
       'counter HTML includes at least one fire-weakness icon');

// ── Tests: POKE_EFF table coverage (each canonical type defined) ──────────
allTypes.forEach(atk => {
  truthy(typeof POKE_EFF[atk] === 'object', `POKE_EFF[${atk}] defined as object`);
});

// ── Tests: bidirectional sanity — water beats fire, fire is weak to water ─
truthy(calcTypeMult('water', 'fire') > 1, 'water beats fire');
truthy(calcTypeMult('fire', 'water') < 1, 'fire weak to water');
truthy(calcTypeMult('grass', 'water') > 1, 'grass beats water');
truthy(calcTypeMult('water', 'grass') < 1, 'water weak to grass');
truthy(calcTypeMult('fire', 'grass') > 1, 'fire beats grass');
truthy(calcTypeMult('grass', 'fire') < 1, 'grass weak to fire');

// ── Output ───────────────────────────────────────────────────────────────
console.log('');
console.log(`Pokemon Type Chart Tests — ${pass + fail} tests`);
console.log(`  ✓ pass: ${pass}`);
console.log(`  ✗ fail: ${fail}`);
if (fail > 0) {
  console.log('\nFailures:');
  failures.forEach((f, i) => console.log(`  ${i+1}. ${f}`));
  process.exit(1);
}
console.log('\nAll tests passed.');
process.exit(0);
