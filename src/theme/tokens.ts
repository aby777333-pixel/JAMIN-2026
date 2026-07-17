/**
 * JAMIN Properties — design tokens (SuperPrompt §1, brand locked).
 * Single source of truth for app code. Hex values MUST mirror tailwind.config.js.
 * "Signature for Fortune."
 */

export const color = {
  red: '#FD0001', //      primary brand
  redDeep: '#C70000', //  gradients, pressed states
  gold: '#FBBC15', //     accent, markers, secondary CTAs
  goldDeep: '#C8911E', // fine rules, "signature" text
  ink: '#1A1A1A', //      primary text
  charcoal: '#202020', // headings, dark surfaces
  muted: '#74746E', //    secondary text
  line: '#E6E7E2', //     hairlines, borders
  paper: '#F7F7F5', //    app background (light)
  surface: '#FFFFFF',
  success: '#1E9E5A',
  danger: '#D4351C',
  warn: '#E6A10D',
} as const;

export type ColorToken = keyof typeof color;

/**
 * Harmonized accent palette for colorful surfaces (tab bar, tool cards, menu
 * rows). Cycles so neighbouring items always contrast; `main` for icons/active
 * states, `soft` for tinted fills that stay readable under ink text.
 */
export const accents = [
  { main: '#E5484D', soft: 'rgba(229,72,77,0.12)' }, //   coral
  { main: '#F76B15', soft: 'rgba(247,107,21,0.12)' }, //  orange
  { main: '#D9A514', soft: 'rgba(217,165,20,0.14)' }, //  amber
  { main: '#30A46C', soft: 'rgba(48,164,108,0.12)' }, //  green
  { main: '#12A594', soft: 'rgba(18,165,148,0.12)' }, //  teal
  { main: '#3E63DD', soft: 'rgba(62,99,221,0.12)' }, //   blue
  { main: '#8E4EC6', soft: 'rgba(142,78,198,0.12)' }, //  violet
  { main: '#D6409F', soft: 'rgba(214,64,159,0.12)' }, //  pink
] as const;

/** Accent for the item at position `i` in a list (wraps around the palette). */
export function accentFor(i: number) {
  return accents[i % accents.length];
}

/**
 * Semantic palette indices — one distinct hue per functional category so the
 * same kind of tool is the same colour on every screen (owner brief:
 * "each functional category should have its own distinct color").
 */
export const category = {
  sell: 0, //      coral — listing, ads, my posts
  comms: 1, //     orange — chats, community, support
  docs: 2, //      amber — documents, brochures, forms
  buy: 3, //       green — search, saved, compare, preferences
  ai: 4, //        teal — AI studio, valuation, insights
  finance: 5, //   blue — calculators, wallet, payments
  team: 6, //      violet — team, recruit, performance, admin
  marketing: 7, // pink — posters, rewards, referrals, sharing
} as const;

export type CategoryKey = keyof typeof category;

/** Typeface keys registered via expo-font in the root layout. */
export const font = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  black: 'Inter_800ExtraBold',
  mono: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

/** Restrained motion + spacing per the "luxury-institutional" brief. */
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const TAGLINE = 'Signature for Fortune';
export const BRAND = 'JAMIN PROPERTIES';
