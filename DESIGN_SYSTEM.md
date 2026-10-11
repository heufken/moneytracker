# DESIGN_SYSTEM.md — Money Tracker (Neobrutalist)

Source of truth for all UI in this repo. Read together with `PRD.md` and `AGENTS.md`.
When this doc conflicts with ad-hoc styling choices, this doc wins.

---

## 1. Vibe

**Neobrutalism:** loud but legible. Hard black borders, flat offset shadows, high-saturation pop colors on warm cream paper, zero gradients, zero blur, chunky bold type. Every element looks physically printed and stackable. Money is serious; the app is allowed to be fun.

Core principles:

1. **Ink everywhere.** Every surface, control, and chart mark carries a 2px ink border. No borderless floating elements.
2. **Flat only.** No gradients, no glows, no blurs, no glass, no soft shadows. Shadows are hard offsets only.
3. **Press the thing.** Interactive elements physically depress: translate toward shadow origin, shadow shrinks.
4. **Black text on color.** Text on any colored fill is ink, never white (except destructive — see §3).
5. **Mobile-first, 375px floor.** Everything usable one-handed; targets ≥44px tall.
6. **Numbers are data.** Amounts always `font-variant-numeric: tabular-nums`, right-aligned in lists.

---

## 2. Token Architecture

Three layers (W3C DTCG-aligned). Values live as CSS variables in `:root`, referenced by Tailwind theme config. Never hardcode raw values in components.

```
Primitive  → raw values        (--yellow-400, --space-4, --border-2)
Semantic   → purpose aliases   (--color-primary, --color-income, --spacing-section)
Component  → per-component     (--button-shadow, --card-border)
```

### File layout

```
src/
  styles/
    tokens-primitives.css   # raw values, never used directly in components
    tokens-semantic.css     # light theme aliases (default)
    tokens-dark.css         # .dark overrides of semantic layer only
    tokens-component.css    # component tokens
    index.css               # imports all + Tailwind base
```

Primitives never change per theme. Dark mode overrides **semantic tokens only**.

---

## 3. Color

### Primitives (light palette)

| Token | Hex | Use |
|---|---|---|
| `--paper-0` | `#FFF8E7` | app background (warm cream) |
| `--paper-1` | `#FFFFFF` | card surface |
| `--ink` | `#0A0A0A` | borders, text, shadows |
| `--yellow-400` | `#FFD02F` | primary action |
| `--blue-400` | `#4D9DE0` | info, links, expense charts |
| `--green-400` | `#3DDC97` | income |
| `--red-400` | `#FF5252` | expense |
| `--purple-400` | `#9B5DE5` | category accent |
| `--pink-400` | `#FF99C8` | category accent |
| `--orange-400` | `#FF9F1C` | category accent |
| `--teal-400` | `#2EC4B6` | category accent |

### Semantic tokens (light)

```css
:root {
  --color-background: var(--paper-0);
  --color-foreground: var(--ink);

  --color-card: var(--paper-1);
  --color-card-foreground: var(--ink);

  --color-primary: var(--yellow-400);        /* main CTA: "Add transaction" */
  --color-primary-foreground: var(--ink);

  --color-secondary: var(--paper-1);         /* secondary buttons, chips */
  --color-secondary-foreground: var(--ink);

  --color-muted: var(--paper-0);
  --color-muted-foreground: #57534E;         /* 4.6:1 on paper-1 */

  --color-accent: var(--blue-400);
  --color-accent-foreground: var(--ink);

  --color-income: var(--green-400);          /* money semantics */
  --color-income-foreground: var(--ink);
  --color-expense: var(--red-400);
  --color-expense-foreground: var(--ink);

  --color-destructive: var(--red-400);       /* delete dialogs: ink on red fails
                                                emphasis; white on #FF5252 is 2.8:1,
                                                so destructive text uses ink at 700+ */
  --color-destructive-foreground: var(--ink);

  --color-border: var(--ink);
  --color-ring: var(--ink);
  --color-shadow: var(--ink);                /* hard shadow color */
}
```

### Dark mode (`.dark`)

Invert paper↔ink; keep pop colors, slightly desaturated:

```css
.dark {
  --color-background: #17150F;               /* warm near-black */
  --color-foreground: #F5F0E6;
  --color-card: #221F17;
  --color-card-foreground: #F5F0E6;
  --color-primary: #FFD02F;                  /* pop colors stay */
  --color-primary-foreground: #0A0A0A;       /* ink on yellow, still 10:1 */
  --color-secondary: #221F17;
  --color-secondary-foreground: #F5F0E6;
  --color-muted: #17150F;
  --color-muted-foreground: #A8A29E;
  --color-border: #F5F0E6;                   /* borders flip to light */
  --color-ring: #F5F0E6;
  --color-shadow: #F5F0E6;                   /* shadows flip to light: visible on dark bg */
  --color-income:  #3DDC97;
  --color-expense: #FF6B6B;
}
```

### Category palette (data model `Category.color`)

Free pick from: `--yellow-400 --blue-400 --green-400 --red-400 --purple-400 --pink-400 --orange-400 --teal-400`. Defaults: Salary `teal`, Freelance `purple`, Food `red`, Transport `blue`, Bills `orange`, Fun `pink`. Color is always paired with the category name — never color alone.

### Contrast contract (verified pairs)

| Foreground | Background | Ratio | Role |
|---|---|---|---|
| ink `#0A0A0A` | paper-1 `#FFFFFF` | ~20:1 | body text |
| ink | paper-0 `#FFF8E7` | ~18:1 | body text |
| ink | yellow-400 | ~10:1 | primary button |
| ink | green-400 | ~10:1 | income |
| ink | red-400 | ~7.4:1 | expense |
| ink | blue-400 | ~8:1 | accent |
| `#57534E` | paper-1 | 4.6:1 | muted text (floor) |

Never place white text on any `400` pop color. Never place ink text on `purple-400` below 16px — use it for fills/badges with 700+ weight text only.

---

## 4. Typography

**No network calls** (AGENTS.md) → self-host via `@fontsource` packages. Requires dependency approval:

- `@fontsource/lexend-mega` — headings, numbers-as-hero
- `@fontsource-variable/public-sans` — body, UI, amounts (`tnum` supported)

```css
--font-display: 'Lexend Mega', 'Arial Black', sans-serif;
--font-sans: 'Public Sans Variable', system-ui, sans-serif;
```

| Level | Token | Font | Size / line | Weight | Case |
|---|---|---|---|---|---|
| Hero amount | `--text-hero` | display | 40px / 1.1 | 800 | sentence |
| Page title | `--text-h1` | display | 24px / 1.2 | 700 | sentence |
| Section title | `--text-h2` | display | 18px / 1.3 | 700 | uppercase, tracking 0.05em |
| Body | `--text-base` | sans | 16px / 1.5 | 400 | sentence |
| Small / meta | `--text-sm` | sans | 14px / 1.4 | 400 | sentence |
| Label / badge | `--text-xs` | sans | 12px / 1.2 | 600 | uppercase, tracking 0.1em |
| Amount | `--text-amount` | sans | inherit | 600 | `tabular-nums`, right-aligned |

Rules:

- Amounts in lists/overview: `font-variant-numeric: tabular-nums`, never proportional figures.
- Negative amounts: leading `-` in ink, no parentheses, no red text below 16px (red fill badge instead).
- Uppercase only for labels/badges/section titles — body text never uppercase.
- `min` 16px body; respect system font scaling (`rem` units only).

---

## 5. Spacing, Borders, Radius, Shadows

### Spacing (4px base)

```
--space-1: 4px    --space-2: 8px    --space-3: 12px   --space-4: 16px
--space-5: 20px   --space-6: 24px   --space-8: 32px   --space-10: 40px
--spacing-component: var(--space-4)
--spacing-section:  var(--space-6)
--spacing-page:     var(--space-4)   /* mobile page gutter */
```

### Border (the signature)

```
--border-width-1: 2px    /* default: cards, buttons, inputs, list rows */
--border-width-2: 3px    /* emphasis: hero card, dialogs, primary CTA */
--border-style: solid
--border-color: var(--color-border)
```

### Radius

```
--radius-none: 0px       /* cards, inputs, tables, dialogs: square */
--radius-sm: 4px         /* buttons on mobile (easier hit perception) */
--radius-pill: 9999px    /* badges, chips, toggles, category dots */
```

Mix is intentional: square blocks + pill chips. Nothing between 4px and 9999px.

### Hard shadows

```
--shadow-sm: 3px 3px 0 0 var(--color-shadow)      /* inputs, chips */
--shadow-md: 5px 5px 0 0 var(--color-shadow)      /* buttons, cards */
--shadow-lg: 8px 8px 0 0 var(--color-shadow)      /* hero card, dialogs */
--shadow-none: none
```

Shadows always share border color. Direction is always bottom-right (positive x/y only). Never blur, never spread, never inset.

---

## 6. Motion

Short, mechanical, physical. No bounces, no eases fancier than `ease-out`.

```
--duration-fast: 80ms     /* press feedback */
--duration-base: 140ms    /* hover, focus, dialogs */
--easing: ease-out
```

**Press pattern (all interactive elements):**

```css
.btn { border: 2px solid var(--color-border); box-shadow: var(--shadow-md); }
.btn:hover { transform: translate(-1px, -1px); box-shadow: 6px 6px 0 0 var(--color-shadow); }
.btn:active { transform: translate(3px, 3px); box-shadow: var(--shadow-none); }
```

Element moves *toward* the shadow; shadow grows on hover, collapses on press. Hover lift optional on touch devices — press state mandatory.

- `prefers-reduced-motion: reduce` → all transforms/transitions off; states change color only.
- Dialogs: scale 0.96→1 + shadow grow, 140ms. No slide-ins from edges.
- No entrance stagger on lists; render instantly (fast data entry is a PRD requirement).

---

## 7. Component Specs

### Button

| Property | Default | Hover | Active | Disabled | Focus |
|---|---|---|---|---|---|
| Background | primary (yellow) | primary | primary | muted | — |
| Text | ink 700 | ink | ink | muted-fg | — |
| Border | 2px ink | 2px ink | 2px ink | 2px ink | 3px ring, 2px offset |
| Shadow | md (5px) | 6px | none | none | md |
| Transform | none | -1px,-1px | 3px,3px | none | — |
| Height | 48px (mobile) / 40px (desktop) | | | | |
| Radius | 4px | | | | |

Variants: `primary` (yellow fill), `secondary` (white fill, ink border), `destructive` (red fill, ink border+text), `ghost` (transparent, 2px transparent border → ink on hover; no shadow). Icon-only buttons: 44×44px min, ink 2px border, `aria-label` required.

### Card

| Property | Default | Emphasis (hero/summary) |
|---|---|---|
| Background | card | card |
| Border | 2px ink | 3px ink |
| Shadow | md | lg |
| Radius | 0 | 0 |
| Padding | 16px | 20px |

Overview summary (income/expense/net): three emphasis cards in a row at ≥768px, stacked at mobile. Net card background flips to `--color-income` when positive, `--color-expense` when negative, ink text both ways.

### Input / Select

2px ink border, white background, radius 0, shadow-sm. Label above field, 12px 600 uppercase. Focus: 3px ink outline, 2px offset — visible on every background. Error: border stays ink, error message below in 14px 600 ink on `--color-expense` badge; never red-on-white text alone below 16px. Amount input: numeric keyboard (`inputMode="decimal"`), `tnum`, suffix currency label. Keep PRD speed: date defaults today, category defaults last-used.

### Badge / Chip (type + category)

Pill, 2px ink border, category color fill, ink text 12px 600 uppercase, no shadow. Income badge: green fill; expense badge: red fill. Badges carry visible text — color never the only signal.

### Transaction list row

Card per row (or divided rows inside one card): 2px ink dividers, 56px min height, category color as 8px pill dot + name, note in muted 14px, amount `tnum` 600 right-aligned. Edit/Delete icon buttons appear inline on desktop, swipe-not-required — always visible 44px icon buttons on mobile. No hover-only actions.

### Tabs / filters (month, type, category)

Pill chips in a horizontal scroll row, 2px ink border. Selected: yellow fill + shadow-sm. Unselected: white. Scrollable, no wrap; `scroll-snap`.

### Dialog (add/edit transaction, confirm delete)

Overlay: ink at 60% (measured — ink scrim on cream keeps card readable). Dialog: card, 3px border, shadow-lg, radius 0, max-width 420px, centered. Title: h2 display. Destructive confirm: red header band, ink text, explicit verb button ("Delete transaction").

### Bottom navigation (mobile)

Fixed bar, 2px ink top border, paper-1 background, 3 items max: Overview, Transactions, Settings. Active tab: yellow fill pill behind ink icon+label, shadow-sm. Icons: SVG set only (lucide-react — already shadcn convention), 24px, `aria-hidden` beside labels.

### FAB (add transaction)

Optional alternative to nav-bar add button: 56px square, 3px ink border, shadow-lg, yellow fill, ink `+` icon 24px, bottom-right above nav bar with 16px clearance. Exactly one FAB max per screen.

### Charts (Recharts)

- Flat fills only, category/semantic colors, `stroke: var(--color-border)` 2px on every bar.
- Bar radius: 0. No gradients, no rounded bar tips, no area fades.
- Grid: 1px dashed `--color-muted-foreground` at 40% opacity.
- Axis text: 12px sans; amounts abbreviated via `lib/money.ts` only.
- Tooltip: card style — white, 2px ink border, shadow-md, radius 0.
- Legend text = category names, never hex codes.
- 6-month income vs expense: grouped bars, income green / expense red.

---

## 8. Tailwind + shadcn Integration

Map semantic tokens into Tailwind theme as CSS-var references (shadcn pattern). Extend, don't replace:

```ts
// tailwind.config.ts (excerpt)
theme: {
  extend: {
    colors: {
      background: 'var(--color-background)',
      foreground: 'var(--color-foreground)',
      card: 'var(--color-card)',
      primary: { DEFAULT: 'var(--color-primary)', foreground: 'var(--color-primary-foreground)' },
      secondary: { DEFAULT: 'var(--color-secondary)', foreground: 'var(--color-secondary-foreground)' },
      income: { DEFAULT: 'var(--color-income)', foreground: 'var(--color-income-foreground)' },
      expense: { DEFAULT: 'var(--color-expense)', foreground: 'var(--color-expense-foreground)' },
      destructive: { DEFAULT: 'var(--color-destructive)', foreground: 'var(--color-destructive-foreground)' },
      muted: { DEFAULT: 'var(--color-muted)', foreground: 'var(--color-muted-foreground)' },
      border: 'var(--color-border)',
      ring: 'var(--color-ring)',
    },
    fontFamily: {
      display: ['"Lexend Mega"', 'Arial Black', 'sans-serif'],
      sans: ['"Public Sans Variable"', 'system-ui', 'sans-serif'],
    },
    borderWidth: { DEFAULT: '2px', 3: '3px' },
    borderRadius: { none: '0px', sm: '4px', pill: '9999px' },
    boxShadow: {
      hard: '3px 3px 0 0 var(--color-shadow)',
      'hard-md': '5px 5px 0 0 var(--color-shadow)',
      'hard-lg': '8px 8px 0 0 var(--color-shadow)',
    },
  },
}
```

shadcn components get restyled by token overrides only — do not fork component internals for looks. Remove shadcn defaults that violate §1 (soft shadows, 6px+ radii, gray-ghost hover fills).

---

## 9. Accessibility

- Text contrast ≥4.5:1 everywhere (§3 contract). No exceptions for "decorative" labels.
- Focus: 3px ink (light) / off-white (dark) outline, 2px offset, on **every** interactive element. Visible against yellow fills because of the offset gap.
- Touch targets ≥44×44px; icon buttons get padding, not bigger glyphs.
- Color never sole carrier: income/expense have icons + text, category color has name.
- `prefers-reduced-motion`: kill transforms (§6).
- Dialogs: focus trap, Escape closes, focus returns to trigger.
- Form errors: inline per-field, announced (`aria-describedby`); failed submit keeps values.
- Amounts read correctly by screen readers: format via `lib/money.ts` (e.g. "Rp 50.000").

---

## 10. Mobile-First Layout Rules

- Design at 375px first. Breakpoints: `sm 640`, `md 768`, `lg 1024`.
- Page gutter: 16px mobile, 24px ≥768px.
- Sticky elements (bottom nav, month picker): 2px ink border separating from content; add bottom scroll padding so lists never hide behind nav.
- Lists single-column at all sizes. Overview cards: 1-col mobile → 3-col ≥768px.
- Safe-area insets on bottom nav (`env(safe-area-inset-bottom)`); PWA standalone mode must stay usable.
- No horizontal scrolling anywhere except chip filter rows.

---

## 11. Do / Don't

| Do | Don't |
|---|---|
| 2–3px ink border on everything | Borderless cards, ghost outlines |
| Flat offset shadows | Blur, glow, `shadow-lg` default, layered soft shadows |
| Yellow primary CTA, one per view | Multiple competing filled CTAs |
| Square blocks + pill chips | 8px/12px/16px "compromise" radii |
| `tnum` right-aligned amounts | Proportional figures, centered money |
| Ink text on pop fills | White text on yellow/green/red fills |
| Instant render, 140ms state changes | Entrance animations, skeletons under 300ms |
| System font fallback stack | Google Fonts `@import` / CDN links (offline rule) |
| SVG icons from one family | Emoji as icons, mixed icon styles |

---

## 12. Governance

- Tokens change = edit `src/styles/tokens-*.css` + this doc in same change.
- New component = spec added to §7 before implementation.
- No raw hex, px-for-px shadows, or one-off radii inside `src/features/**` or `src/components/**`; lint review enforces.
- Validate with `validate-tokens.cjs --dir src/` (design-system skill) before UI-heavy PRs.
