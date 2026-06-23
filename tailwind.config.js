/**
 * JAMIN Properties — design tokens (SuperPrompt §1, brand locked).
 * These hex values are the single visual source of truth and MUST match
 * src/theme/tokens.ts. Do not introduce new palette values without updating both.
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        red: { DEFAULT: '#FD0001', deep: '#C70000' },
        gold: { DEFAULT: '#FBBC15', deep: '#C8911E' },
        ink: '#1A1A1A',
        charcoal: '#202020',
        muted: '#74746E',
        line: '#E6E7E2',
        paper: '#F7F7F5',
        surface: '#FFFFFF',
        success: '#1E9E5A',
        danger: '#D4351C',
        warn: '#E6A10D',
      },
      fontFamily: {
        // Body / headings — TT Norms Pro (licensed) with Inter as the spec fallback.
        sans: ['Inter_400Regular'],
        medium: ['Inter_500Medium'],
        semibold: ['Inter_600SemiBold'],
        bold: ['Inter_700Bold'],
        black: ['Inter_800ExtraBold'],
        // Numbers / money / codes — JetBrains Mono (brand signature, tabular).
        mono: ['JetBrainsMono_500Medium'],
        'mono-bold': ['JetBrainsMono_700Bold'],
      },
    },
  },
  plugins: [],
};
