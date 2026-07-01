/* eslint-disable @typescript-eslint/no-require-imports */
/** Bundled per-screen landscape background images (assets/images/backgrounds). */
export const BG = {
  home: require('../../../assets/images/backgrounds/home.jpg'),
  wallet: require('../../../assets/images/backgrounds/wallet.jpg'),
  card: require('../../../assets/images/backgrounds/card.jpg'),
  forms: require('../../../assets/images/backgrounds/forms.jpg'),
  network: require('../../../assets/images/backgrounds/network.jpg'),
  // Entry-flow landscape backdrops.
  opening: require('../../../assets/images/backgrounds/opening.jpg'),
  register: require('../../../assets/images/backgrounds/register.jpg'),
  onboarding: require('../../../assets/images/backgrounds/onboarding.jpg'),
  verify: require('../../../assets/images/backgrounds/verify.jpg'),
  waterfall: require('../../../assets/images/backgrounds/waterfall.jpg'),
  // Minimalist lone-tree-in-field — the default serene backdrop for screens
  // that don't specify their own (see Screen.tsx). On-brand for "verified land".
  nature: require('../../../assets/images/backgrounds/nature.jpg'),
};
