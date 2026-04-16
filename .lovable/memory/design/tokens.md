---
name: Design system tokens (KoraFinance Violet)
description: Complete violet color system, typography, spacing, shadows, radius for light/dark modes
type: design
---
## Brand
- Primary: `--brand-600` = #7C3AED (violet)
- Scale: --brand-50 (#F5F3FF) → --brand-900 (#4C1D95)
- Dark mode primary boost: #8B5CF6 / #A78BFA for active states

## Color System
- All colors use CSS custom properties in src/index.css
- Light/dark via `[data-theme="dark"]` or `.dark`
- Backgrounds: `--bg-base` #F8F7FF (lavender) / #08080F dark
- Surfaces: `--bg-surface`, `--bg-elevated`, `--bg-sunken` (--color-bg-* aliases)
- Text light: #1A0D35 → #7B6A9B → #B8A8D8
- Text dark: #FFFFFF → rgba(255,255,255,0.7) → 0.4 → 0.2
- Borders: rgba(124,58,237,0.07–0.25) light / rgba(167,139,250,0.05–0.30) dark
- Legacy `--color-green-*` tokens are remapped to violet — components using them get the new brand for free

## Financial Semantic (KEEP GREEN — money is green)
- `--color-success-*` / `--success-*` stays green
- Income amounts: #16A34A light / #4ADE80 dark
- Expense amounts: #DC2626 light / #F87171 dark
- Warning: #D97706 / #FCD34D

## Typography
- Geist (sans) + Geist Mono (numbers)
- Always `font-variant-numeric: tabular-nums` on metric values

## Shadows
- All shadows tinted with violet: rgba(109,40,217,*) light, black dark
- `--shadow-brand` = 0 4px 14px rgba(124,58,237,0.35) — for primary buttons/FAB

## Rules
- NEVER hardcode hex in components — use CSS vars
- Income/positive → green semantic tokens, NOT brand
- Buttons/badges/charts/progress → violet brand
- 44x44px min touch target on mobile
