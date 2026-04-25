# Math Difficulty Standard — Dunia Emosi

> **Effective**: 2026-04-25 (Task #68)
> **Source**: User mandate — "soal matematika pastikan default di setting easy mode... easy mode tidak ada perkalian dan pembagian. hanya penjumlahan dan pengurangan. angkanya max 20. jika hard baru bisa pakai max angka 50."

## The Rule

| Mode | When | Operations | Max number |
|------|------|-----------|------------|
| **Easy** ✅ | DEFAULT (`isMathAdvanced() === false`) | + and − only | ≤ 20 |
| **Hard** | OPT-IN via Settings (`localStorage['dunia-emosi-mathadv'] === 'on'`) | + − × ÷ | ≤ 50 |

## Why

- Target audience: anak Indonesia umur 5-10 tahun
- Default harus aman untuk anak baru belajar (TK/SD kelas 1-2)
- Multiplikasi/divisi adalah konsep advanced (SD kelas 3+)
- Angka >20 adalah cognitive load tinggi untuk anak kelas 1-2

Default rule mencegah anak frustrasi. Hard mode opt-in untuk anak yang sudah siap.

## Implementation — Centralized Helper

**Single source of truth**: `getMathLimits()` di `game.js:1640+`

```js
function isMathAdvanced(){return localStorage.getItem('dunia-emosi-mathadv')==='on'}
function getMathLimits(){
  const adv=isMathAdvanced()
  return {advanced:adv, maxNum:adv?50:20, allowedOps:adv?['+','-','*','/']:['+','-']}
}
```

## Usage Pattern (per math game)

Every math question generator MUST call `getMathLimits()` at the start:

```js
function gXxxGenQuestion(){
  const _ml = getMathLimits()
  const max = Math.min(rawMax, _ml.maxNum)
  const ops = (rawOps || ['+']).filter(o => _ml.allowedOps.includes(o))
  if (!ops.length) ops.push('+')   // safety fallback
  // ... use max + ops below
}
```

**Critical**: filter ops AFTER all per-level/per-mode logic. Never bypass the helper.

## Per-Game Compliance (audit 2026-04-25)

| Game | Status | Notes |
|------|--------|-------|
| **G10** Math Battle | ✅ Compliant | `g10GenQuestion` (game.js:5670) uses `getMathLimits()` |
| **G13** Evolusi Math | ✅ Compliant | `g13GenQuestion` (game.js:7892) uses `getMathLimits()` + megaForm boost |
| **G13b** Quick Fire | ✅ Compliant | `g13bGenQuestion` (game.js:8710) uses `getMathLimits()` |
| G1 Lebah Hitung | ✅ Compliant | hardcoded easy (max ≤ 9) |
| G3 Tebak Angka | ✅ Compliant | hardcoded easy |
| G4 Sebrang Sungai | ✅ Compliant | hardcoded easy |
| G5 Memori Kartu | ✅ Compliant | not math |
| G7 Tangga Angka | ✅ Compliant | hardcoded easy |
| G11 Kuis Sains | ✅ Compliant | not math |
| G12 Tebak Bayangan | ✅ Compliant | not math |

## Toggle UI

Settings → "Math Lanjutan" button (`#settings-mathadv-btn` di `index.html:1664`).
Default state: **OFF** (= Easy mode).

When user clicks → `toggleMathAdvanced()` flips localStorage, immediate effect on next question.

## Adding a New Math Game

When implementing a new math game:

1. Question generator MUST call `getMathLimits()` first
2. Cap any local `maxNum` against `_ml.maxNum`
3. Filter local `ops` against `_ml.allowedOps`
4. Add `'+'` fallback if filter result is empty
5. Add to "Per-Game Compliance" table above
6. Run audit: open easy mode, verify no × or ÷ appears, verify max ≤ 20

## Anti-patterns to Avoid

❌ **Don't** hardcode `Math.min(..., 20)` — use the helper
❌ **Don't** bypass `getMathLimits()` even for "boss tier" — easy mode is non-negotiable
❌ **Don't** add new math games without audit table update
❌ **Don't** invert the default — Easy must always be default

## Relation to Other Standards

- See `CODING-STANDARDS.md` § "Math Generation Rules" (cross-reference)
- See `LESSONS-LEARNED.md` L22 (centralized cross-game settings pattern)
- See `CHANGELOG.md` 2026-04-25 entry (initial implementation)
