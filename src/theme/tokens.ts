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
