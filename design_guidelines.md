# SURNA Design System Guidelines

## Brand Identity
**SURNA** is a premium sports social networking platform with a refined, modern aesthetic. The design system emphasizes clarity, sophistication, and athletic energy through a carefully curated purple-centered color palette with cream accents.

## Core Brand Colors

### Primary Palette
**NO PINK, BLUE, OR GREEN COLORS ALLOWED.** All colors must use centralized theme tokens.

- **Brand Purple (Primary)**: `#1A1423` - Used for backgrounds, headers, and primary UI elements
- **Accent Purple**: `#A192C4` - Used for interactive elements, highlights, gradients, and calls-to-action
- **Cream (Light Background)**: `#F5F1ED` - Used for light mode backgrounds and text on dark surfaces
- **Cream (Dark Text)**: `#F7F3F0` - Used for text on dark backgrounds
- **Dark Text**: `#2F243A` - Used for body text and secondary elements

### Usage Rules
1. **NEVER hardcode colors** - Always use theme tokens from `client/src/styles/tokens.ts`
2. **NO pink gradients** - Use `token-accent` for all gradient needs
3. **NO custom hex values** - Reference tokens via CSS variables or Tailwind classes
4. **Single purple palette** - Only #1A1423 and #A192C4 for purple shades

## Theme Token System

### Token Structure
All colors are managed through centralized CSS variables in `client/src/index.css`:

```css
:root, .light {
  --token-brand: #1A1423;
  --token-accent: #A192C4;
  --token-text: #F7F3F0;
  --token-text-secondary: hsl(from var(--token-text) h s l / 0.8);
  --token-text-muted: hsl(from var(--token-text) h s l / 0.6);
  --background: #1A1423;
  --background-elevated: #2A1A33;
}

.dark {
  --token-text: #F5F1ED;
  --background: #0F0A13;
  /* ... */
}
```

### Tailwind Token Classes
Use these classes instead of hardcoded colors:

- `text-token-text` - Primary text color
- `text-token-text-secondary` - Secondary text (80% opacity)
- `text-token-text-muted` - Muted text (60% opacity)
- `bg-token-accent` - Accent purple background
- `border-token-accent` - Accent purple border
- `bg-background` - App background
- `bg-background-elevated` - Elevated surfaces (cards, modals)

### Gradient Guidelines
**Replace all pink/multi-color gradients:**

❌ OLD (FORBIDDEN):
```tsx
className="bg-gradient-to-r from-[#F7C9D5] via-[#F1B5C0] to-[#D8A4C6]"
```

✅ NEW (REQUIRED):
```tsx
className="bg-token-accent"
// or for subtle gradients:
className="bg-gradient-to-r from-token-accent to-token-accent"
```

## Typography System

### Font Stack
**Primary**: Inter (loaded via Google Fonts CDN)
**Fallback**: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif

### Type Scale
- **Hero/Display**: 2.5rem (40px), font-weight: 700, letter-spacing: -0.02em
- **H1 Headers**: 2rem (32px), font-weight: 600
- **H2 Headers**: 1.5rem (24px), font-weight: 600
- **H3 Headers**: 1.25rem (20px), font-weight: 600
- **Body Large**: 1rem (16px), font-weight: 400
- **Body**: 0.9375rem (15px), font-weight: 400
- **Body Small**: 0.875rem (14px), font-weight: 400
- **Caption**: 0.8125rem (13px), font-weight: 400
- **Micro**: 0.75rem (12px), font-weight: 500, uppercase, letter-spacing: 0.05em

### Text Color Usage
- **Primary content**: `text-token-text`
- **Secondary labels**: `text-token-text-secondary`
- **Timestamps, meta**: `text-token-text-muted`
- **Interactive elements**: `text-token-accent` or `hover:text-token-accent`
- **Disabled states**: `text-token-text-muted opacity-50`

## Layout & Spacing System

### Spacing Primitives
Use Tailwind spacing units: 0.5, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24

Common patterns:
- **Component gaps**: `gap-3` (12px), `gap-4` (16px), `gap-6` (24px)
- **Section padding**: `py-6` (24px), `py-8` (32px), `py-12` (48px)
- **Card padding**: `p-4` (16px), `p-6` (24px)
- **Button padding**: `px-6 py-3` (24px × 12px)

### Border Radius
- **Cards/Containers**: `rounded-xl` (12px) or `rounded-2xl` (16px)
- **Buttons**: `rounded-lg` (8px)
- **Chips/Pills**: `rounded-full`
- **Modals**: `rounded-3xl` (24px)
- **Input fields**: `rounded-lg` (8px)

### Container Strategy
- **Full-page layouts**: `max-w-7xl mx-auto`
- **Content sections**: `max-w-5xl mx-auto`
- **Reading content**: `max-w-3xl mx-auto`
- **Mobile-first**: Always use responsive breakpoints (sm, md, lg, xl)

## Component Patterns

### Buttons
**Primary CTA**:
```tsx
<Button className="bg-token-accent text-white hover:opacity-90">
  Action
</Button>
```

**Secondary**:
```tsx
<Button className="bg-background-elevated text-token-text border border-token-text/10">
  Action
</Button>
```

**Outline**:
```tsx
<Button className="border border-token-accent text-token-accent hover:bg-token-accent/10">
  Action
</Button>
```

### Cards
**Standard Card**:
```tsx
<div className="bg-background-elevated border border-token-text/10 rounded-xl p-6">
  {/* Content */}
</div>
```

**Interactive Card** (hover state):
```tsx
<div className="bg-background-elevated border border-token-text/10 rounded-xl p-6 hover:border-token-accent/50 transition-all cursor-pointer">
  {/* Content */}
</div>
```

### Navigation
**Active Tab**:
```tsx
<button className="text-token-accent border-b-2 border-token-accent">
  Active
</button>
```

**Inactive Tab**:
```tsx
<button className="text-token-text-muted hover:text-token-text">
  Inactive
</button>
```

### Forms
**Input Field**:
```tsx
<input className="bg-background border border-token-text/20 rounded-lg px-4 py-2.5 text-token-text focus:border-token-accent focus:ring-2 focus:ring-token-accent/20" />
```

### Avatars
- **Small**: 32px (w-8 h-8)
- **Medium**: 40px (w-10 h-10)
- **Large**: 64px (w-16 h-16)
- **XL**: 96px (w-24 h-24)
- Always use `rounded-full` with fallback gradient or initials

### Profile Headers
**Cover Image**: 220-260px height, full-width
- Use subtle overlay: `bg-gradient-to-t from-background/80 to-transparent`
- Ensure text contrast with dark gradient from bottom

**Profile Picture**:
- 96-128px diameter
- 2-4px border in `border-token-text`
- Position: overlap cover by 48px, left-aligned with 24px margin

**Action Buttons**:
- Right-aligned group with `gap-3`
- Primary: `bg-token-accent text-white`
- Secondary: `bg-background-elevated border border-token-text/10`

### Stats Display
**Chip Format**:
```tsx
<div className="bg-background-elevated border border-token-text/10 rounded-full px-4 py-2">
  <span className="text-token-text-muted text-xs uppercase">Label</span>
  <span className="text-token-text text-lg font-semibold">Value</span>
</div>
```

## Interaction Patterns

### Transitions
All state changes: `transition-all duration-200 ease-in-out`

**Standard transitions**:
- Color changes: 200ms
- Transform (scale, translate): 200ms
- Opacity: 150ms
- Complex layouts: 300ms

**Hover Effects**:
- Buttons: `hover:opacity-90` or `hover:scale-105`
- Cards: `hover:border-token-accent/50`
- Icons: `hover:text-token-accent`

### Loading States
**Skeleton Shimmer**:
```tsx
<div className="animate-pulse bg-background-elevated rounded-lg h-20" />
```

**Spinner**:
```tsx
<div className="animate-spin w-8 h-8 rounded-full border-2 border-token-accent border-t-transparent" />
```

### Focus States
All interactive elements must have visible focus indicators:
```tsx
focus:ring-2 focus:ring-token-accent focus:ring-offset-2 focus:ring-offset-background
```

## Accessibility

### Focus Rings
**NEVER use pink focus rings.** Always use `token-accent`:
```tsx
focus:outline-none focus:ring-2 focus:ring-token-accent
```

### ARIA Labels
- All icon-only buttons: `aria-label` required
- Interactive images: `alt` text with context
- Form inputs: Associated `<label>` or `aria-label`

### Keyboard Navigation
**Tab Order**:
1. Logo/Header
2. Primary navigation
3. Action buttons
4. Main content
5. Secondary actions
6. Footer

**Interactive States**:
- Focus: 2px ring in `token-accent`
- Active: Darker background or scale transform
- Disabled: 50% opacity + `cursor-not-allowed`

### Color Contrast
All text must meet WCAG 2.1 AA standards:
- Normal text: 4.5:1 contrast ratio
- Large text (18px+): 3:1 contrast ratio
- Interactive elements: 3:1 against background

## Image Guidelines

### Cover Images
- **Dimensions**: 1920×260px (landscape)
- **Format**: WebP with JPEG fallback
- **Focal point**: Center-right for logo clearance
- **Content**: Action shots, stadium atmosphere, team celebrations

### Profile Pictures
- **Dimensions**: 512×512px minimum
- **Format**: PNG with transparency or WebP
- **Shape**: Circular crop applied via CSS
- **Background**: Solid color for transparency support

### Gallery Images
- **Minimum width**: 1200px
- **Aspect ratios**: 1:1 (square), 4:3 (landscape), 16:9 (widescreen)
- **Format**: WebP with progressive JPEG fallback
- **Lazy loading**: Required for performance

### Logos & Icons
- **Sponsor logos**: SVG preferred, 400px width minimum
- **UI icons**: Lucide React icon set
- **Custom icons**: 24×24px base size, scalable SVG

## Dark Mode Support

### Color Adaptation
Theme tokens automatically adapt:
- Light mode: Dark text on cream backgrounds
- Dark mode: Cream text on dark purple backgrounds

### Testing Requirements
- Test all components in both light and dark modes
- Ensure proper contrast in both themes
- Use `dark:` Tailwind variants where needed

## Performance Guidelines

### CSS Best Practices
- Use theme tokens via CSS variables (no inline hex)
- Minimize `@apply` directives (use Tailwind classes)
- Avoid deeply nested selectors (max 3 levels)
- Leverage Tailwind's JIT mode for optimal bundle size

### Animation Performance
- Prefer `transform` and `opacity` for animations
- Avoid animating `width`, `height`, or `margin`
- Use `will-change` sparingly and remove after animation
- Disable animations on low-power devices: `@media (prefers-reduced-motion: reduce)`

## Development Workflow

### Token Usage Rules
1. **Import tokens** (if needed in JS): `import { brandColors, colors, layout, typography, components } from '@/styles/tokens'`
2. **Use Tailwind classes**: Prefer `bg-token-accent` over inline styles
3. **CSS variables** for dynamic values: `style={{ color: 'var(--token-accent)' }}`
4. **Never hardcode** hex values in components

### Code Review Checklist
- [ ] No hardcoded hex colors (#XXXXXX)
- [ ] No pink (#F7C9D5, #F1B5C0, #D8A4C6) or off-brand colors
- [ ] All interactive elements use `token-accent`
- [ ] Focus states use `focus:ring-token-accent`
- [ ] Text uses appropriate token (text/secondary/muted)
- [ ] Responsive breakpoints applied (mobile-first)
- [ ] Accessibility attributes present (ARIA labels, alt text)
- [ ] Loading/error states implemented

## Migration from Legacy Colors

### Deprecated Classes (DO NOT USE)
- ❌ `surna-cream`, `surna-lav`, `surna-blush`, `surna-bg`
- ❌ `text-gradient-blushy`, `bg-gradient-blush`
- ❌ Any gradient using #F7C9D5, #F1B5C0, #D8A4C6
- ❌ Hardcoded hex values in className

### Correct Replacements
| Old Class | New Class |
|-----------|-----------|
| `text-surna-cream` | `text-token-text` |
| `bg-surna-lav` | `bg-token-accent` |
| `border-surna-blush` | `border-token-accent` |
| `from-[#F7C9D5] to-[#D8A4C6]` | `bg-token-accent` |
| `text-gradient-blushy` | `text-token-accent` |

## Design Tokens Reference

### Complete Token List
```typescript
// From client/src/styles/tokens.ts

// 1. Brand Colors (Base Palette)
export const brandColors = {
  basePurple: '#1A1423',           // Brand core
  accentPurple: '#A192C4',         // Interactive elements
  accentPurpleLight: '#C7B4FF',    // Dark mode variant
  creamBg: '#F5F1ED',              // Light mode background
  creamText: '#F7F3F0',            // Dark mode text
  darkTextPurple: '#2F243A',       // Light mode text
  greyDark: '#191919',             // Neutral dark
  greyLight: '#CCCCCC'             // Neutral light
};

// 2. Theme Colors (Dark/Light)
export const colors = {
  dark: {
    bgMain: '#1A1423',
    bgCard: '#23182B',
    bgCardSoft: '#291C33',
    textPrimary: '#F7F3F0',
    textSecondary: 'rgba(247, 243, 240, 0.7)',
    textMuted: 'rgba(247, 243, 240, 0.5)',
    accent: '#C7B4FF',
    accentSoft: 'rgba(199, 180, 255, 0.25)',
    borderSubtle: 'rgba(247, 243, 240, 0.08)',
    // ... (see tokens.ts for complete list)
  },
  light: {
    bgMain: '#F5F1ED',
    bgCard: '#FFFFFF',
    textPrimary: '#2F243A',
    textSecondary: 'rgba(47, 36, 58, 0.75)',
    accent: '#A192C4',
    // ... (see tokens.ts for complete list)
  }
};

// 3. Layout Tokens
export const layout = {
  // Border Radius
  radiusCard: 24,
  radiusButton: 24,
  radiusBubble: 20,
  radiusChip: 999,
  radiusSmall: 18,
  radiusMicro: 12,
  radiusPill: 10,
  
  // Spacing Scale (px)
  spacingXS: 4,
  spacingS: 8,
  spacingM: 12,
  spacingL: 16,
  spacingXL: 24,
  spacingXXL: 32,
  
  // Icon Sizes
  iconSmall: 20,
  iconMedium: 24,
  iconLarge: 28,
  iconContainer: 32
};

// 4. Typography Scale
export const typography = {
  hero: {
    size: '32px',
    sizeLarge: '36px',
    weight: 700,
    lineHeight: 1.1
  },
  sectionTitle: {
    size: '24px',
    weight: 700,
    lineHeight: 1.2
  },
  cardTitle: {
    size: '18px',
    weight: 600,
    lineHeight: 1.2
  },
  body: {
    size: '14px',
    sizeLarge: '16px',
    weight: 400,
    lineHeight: 1.5
  }
  // ... (see tokens.ts for complete list)
};

// 5. Component Tokens
export const components = {
  header: {
    backButton: {
      padding: '10px 14px',
      radius: 18
    }
  },
  statCard: {
    radius: 20,
    padding: 18
  },
  progressBar: {
    height: 8,
    radius: 999,
    dotSize: 10
  }
  // ... (see tokens.ts for complete list)
};

// Helper Functions
export const getThemeColors = (isDark: boolean) => 
  isDark ? colors.dark : colors.light;

export const hexToRgba = (hex: string, alpha: number): string => {
  // Converts hex to rgba with opacity
};
```

### Usage Examples
```typescript
import { brandColors, layout, typography } from '@/styles/tokens';

// Use brand colors directly
const accentColor = brandColors.accentPurple; // '#A192C4'

// Use layout tokens
const borderRadius = layout.radiusCard; // 24

// Use typography
const heroSize = typography.hero.size; // '32px'
```

---

**Last Updated**: November 2025
**Version**: 2.0 (Unified Brand Specification)
