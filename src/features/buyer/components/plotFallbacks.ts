/**
 * Bundled land-photo fallbacks (owner-supplied, compressed to ~70KB each) shown
 * on listing cards whose property has no uploaded photos yet — so the catalog
 * never looks empty. Display-only: real listing media always wins, the DB is
 * untouched, and the detail-page gallery still shows only actual photos.
 * Relative require() paths, mirroring Logo.tsx (the '@/' alias doesn't cover assets/).
 */
const PLOT_FALLBACKS = [
  require('../../../../assets/images/plots/plot01.jpg'),
  require('../../../../assets/images/plots/plot02.jpg'),
  require('../../../../assets/images/plots/plot03.jpg'),
  require('../../../../assets/images/plots/plot04.jpg'),
  require('../../../../assets/images/plots/plot05.jpg'),
  require('../../../../assets/images/plots/plot06.jpg'),
  require('../../../../assets/images/plots/plot07.jpg'),
  require('../../../../assets/images/plots/plot08.jpg'),
  require('../../../../assets/images/plots/plot09.jpg'),
  require('../../../../assets/images/plots/plot10.jpg'),
  require('../../../../assets/images/plots/plot11.jpg'),
  require('../../../../assets/images/plots/plot12.jpg'),
  require('../../../../assets/images/plots/plot13.jpg'),
  require('../../../../assets/images/plots/plot14.jpg'),
  require('../../../../assets/images/plots/plot15.jpg'),
  require('../../../../assets/images/plots/plot16.jpg'),
  require('../../../../assets/images/plots/plot17.jpg'),
];

/** Stable id → image, so a plot keeps the same fallback across renders/sessions. */
export function plotFallbackFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PLOT_FALLBACKS[h % PLOT_FALLBACKS.length];
}
