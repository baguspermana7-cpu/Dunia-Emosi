# Dunia Emosi — Color Palette Standard v2.0
## "Dreamy Meadow" Theme

> ⚠️ DEPRECATED: The default orange/green/blue palette (v1.x) is REPLACED by this system.
> Never use hardcoded `#FF6B35`, `#06D6A0`, `#38B6FF` as primary colors anymore.

---

## DESIGN PHILOSOPHY

**Name**: Dreamy Meadow Pastel
**Mood**: Calm, magical, imaginative — NOT harsh or overly stimulating
**Inspiration**: Studio Ghibli color keys, Pastel Kawaii design, Soft UI for children

The new palette uses **soft/muted saturations** with **high luminosity** — colors that feel
like watercolor or chalk pastels. Still vivid enough for children, but calming not aggressive.

---

## CORE PALETTE

### Primary Purples (Brand)
```css
--primary-100: #F3E8FF   /* very soft lilac — backgrounds */
--primary-200: #DDD6FE   /* light lavender */
--primary-300: #C4B5FD   /* medium lavender */
--primary-400: #A78BFA   /* soft violet — main accent */
--primary-500: #8B5CF6   /* medium purple — CTA buttons */
--primary-600: #7C3AED   /* deep purple — shadows/borders */
--primary-700: #5B21B6   /* very deep — text on light */
```

### Rose/Pink (Secondary)
```css
--rose-100: #FFF1F3
--rose-300: #FDA4AF   /* soft rose — emotions, warm moments */
--rose-400: #FB7185   /* medium rose — secondary buttons */
--rose-500: #F43F5E   /* vivid rose — alerts, special */
```

### Teal/Mint (Success/Calm)
```css
--teal-100: #CCFBF1
--teal-300: #5EEAD4   /* soft teal — correct answers */
--teal-400: #2DD4BF   /* medium teal — game 2 breathing */
--teal-500: #14B8A6   /* vivid teal — success states */
```

### Amber/Warm (Rewards/Stars)
```css
--amber-100: #FFFBEB
--amber-300: #FCD34D   /* soft gold — star rewards */
--amber-400: #FBBF24   /* medium amber — XP, progress */
--amber-500: #F59E0B   /* vivid amber — timer warning */
```

### Sky Blue (Learning/Focus)
```css
--sky-100: #E0F2FE
--sky-300: #7DD3FC   /* soft sky — game 6, 7 */
--sky-400: #38BDF8   /* medium sky — info states */
--sky-500: #0EA5E9   /* vivid sky — active states */
```

### Neutral (Text & Surfaces)
```css
--neutral-50:  #FAFAF9   /* body background */
--neutral-100: #F5F5F4   /* subtle backgrounds */
--neutral-200: #E7E5E4   /* borders */
--neutral-400: #A8A29E   /* placeholder text */
--neutral-600: #57534E   /* secondary text */
--neutral-800: #292524   /* primary text */
--neutral-900: #1C1917   /* headings */
```

---

## SEMANTIC TOKENS (use these in code)

```css
:root {
  /* === BACKGROUNDS === */
  --bg-base:     #F8F4FF;   /* main body bg — very soft lilac white */
  --bg-card:     #FFFFFF;
  --bg-glass:    rgba(255, 255, 255, 0.75);
  --bg-overlay:  rgba(30, 15, 60, 0.55);

  /* === BRAND === */
  --brand:       #8B5CF6;   /* primary purple */
  --brand-light: #A78BFA;
  --brand-dark:  #7C3AED;
  --brand-shadow: #5B21B6;  /* 3D button bottom */

  /* === INTERACTIVE === */
  --btn-primary:  linear-gradient(135deg, #A78BFA, #8B5CF6);
  --btn-secondary: linear-gradient(135deg, #FDA4AF, #F43F5E);
  --btn-success:  linear-gradient(135deg, #5EEAD4, #14B8A6);
  --btn-gold:     linear-gradient(135deg, #FCD34D, #FBBF24);

  /* === STATES === */
  --state-correct: #2DD4BF;   /* teal */
  --state-wrong:   #F43F5E;   /* rose red */
  --state-locked:  #A8A29E;

  /* === TEXT === */
  --text-heading:  #1C1917;
  --text-body:     #292524;
  --text-muted:    #57534E;
  --text-on-brand: #FFFFFF;
  --text-on-gold:  #78350F;

  /* === SHADOWS === */
  --shadow-sm:  0 2px 8px rgba(139, 92, 246, 0.10);
  --shadow-md:  0 8px 24px rgba(139, 92, 246, 0.14);
  --shadow-lg:  0 16px 48px rgba(139, 92, 246, 0.18);
  --shadow-btn: 0 6px 0 rgba(91, 33, 182, 0.35);
}
```

---

## PER-GAME ACCENT COLORS

Each game screen has its own accent — all from the Dreamy Meadow family:

| Game | Name | Primary | Shadow | Background |
|------|------|---------|--------|------------|
| 1 | Aku Merasa (Emosi) | `#F43F5E` rose | `#BE123C` | `#FFF1F3` |
| 2 | Napas Pelangi | `#8B5CF6` purple | `#5B21B6` | `#F3E8FF` |
| 3 | Huruf Hutan | `#14B8A6` teal | `#0F766E` | `#CCFBF1` |
| 4 | Hitung Binatang | `#F59E0B` amber | `#B45309` | `#FFFBEB` |
| 5 | Cocokkan Emosi | `#A78BFA` lavender | `#7C3AED` | `#EDE9FE` |
| 6 | Petualangan Mobil | `#38BDF8` sky | `#0369A1` | `#E0F2FE` |
| 7 | Tebak Gambar | `#2DD4BF` teal-cyan | `#0F766E` | `#F0FDFA` |
| 8 | Susun Kata | `#FDA4AF` soft rose | `#9F1239` | `#FFF1F3` |
| 9 | Jejak Huruf | `#84CC16` lime | `#3F6212` | `#F7FEE7` |

---

## BACKGROUND GRADIENTS PER SCREEN

```css
/* Welcome */
#screen-welcome {
  background: linear-gradient(160deg, #F3E8FF 0%, #FFF1F3 50%, #E0F2FE 100%);
}

/* Menu */
#screen-menu {
  background: linear-gradient(160deg, #EDE9FE 0%, #FFF1F3 50%, #CCFBF1 100%);
}

/* Game 1 — Emosi: Rose Dream */
#screen-game1 {
  background: linear-gradient(180deg, #FFF1F3 0%, #FFE4E6 40%, #FFF5F5 100%);
}

/* Game 2 — Napas: Purple Sky */
#screen-game2 {
  background: linear-gradient(180deg, #F3E8FF 0%, #EDE9FE 50%, #E0E7FF 100%);
}

/* Game 3 — Huruf: Mint Forest */
#screen-game3 {
  background: linear-gradient(180deg, #CCFBF1 0%, #D1FAE5 50%, #ECFDF5 100%);
}

/* Game 4 — Hitung: Golden Savanna */
#screen-game4 {
  background: linear-gradient(180deg, #FFFBEB 0%, #FEF3C7 40%, #FFF9E6 100%);
}

/* Game 5 — Memory: Dream Garden */
#screen-game5 {
  background: radial-gradient(ellipse at 50% 0%, #DDD6FE 0%, #EDE9FE 50%, #F3E8FF 100%);
}

/* Game 6 — Mobil: Sky Road */
#screen-game6 {
  background: linear-gradient(180deg, #E0F2FE 0%, #BAE6FD 30%, #F0F9FF 100%);
}

/* Game 7 — Tebak: Aqua Reef */
#screen-game7 {
  background: linear-gradient(180deg, #F0FDFA 0%, #CCFBF1 50%, #E0F2FE 100%);
}

/* Game 8 — Susun: Cotton Candy */
#screen-game8 {
  background: linear-gradient(160deg, #FFF1F3 0%, #F3E8FF 50%, #FFF0F5 100%);
}

/* Game 9 — Trace: Lime Garden */
#screen-game9 {
  background: linear-gradient(180deg, #F7FEE7 0%, #ECFCCB 50%, #D9F99D 100%);
}

/* Result */
#screen-result {
  background: radial-gradient(ellipse at center top, #F3E8FF 0%, #FFF1F3 50%, #CCFBF1 100%);
}
```

---

## TYPOGRAPHY COLORS

```css
/* Heading gradient text — per game */
.grad-g1 { background: linear-gradient(135deg, #F43F5E, #FDA4AF); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
.grad-g2 { background: linear-gradient(135deg, #8B5CF6, #A78BFA); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
.grad-g3 { background: linear-gradient(135deg, #14B8A6, #2DD4BF); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
.grad-g4 { background: linear-gradient(135deg, #F59E0B, #FCD34D); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
.grad-g5 { background: linear-gradient(135deg, #8B5CF6, #F43F5E); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
.grad-brand { background: linear-gradient(135deg, #8B5CF6, #F43F5E); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
```

---

## MIGRATION FROM v1 PALETTE

| Old (v1) | New (v2) | Usage |
|----------|----------|-------|
| `#FF6B35` orange | `#8B5CF6` purple | Primary brand |
| `#06D6A0` green | `#2DD4BF` teal | Success state |
| `#38B6FF` blue | `#38BDF8` sky | Info state |
| `#845EC2` purple | `#8B5CF6` purple | Keep (slightly adjusted) |
| `#FF6BB5` pink | `#F43F5E` rose | Emotion game |
| `#FFD166` yellow | `#FCD34D` amber | Rewards/stars |
| `#EF476F` red | `#F43F5E` rose-red | Wrong state |
