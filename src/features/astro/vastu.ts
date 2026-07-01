/**
 * Vastu facing — shared, language-neutral structure used by the listing filter,
 * the property card badge and the /vastu guide. The human-readable names and
 * notes live in i18n (locales/*.json → `vastu.*`); this file holds only the
 * canonical facing values (which match how the admin console stores
 * `attrs.Facing`) and their Vastu rating.
 */

/** Exactly mirrors the admin console's FACINGS list (web/admin.html). */
export const FACINGS = [
  'North-East',
  'North',
  'East',
  'West',
  'North-West',
  'South-East',
  'South',
  'South-West',
] as const;

export type Facing = (typeof FACINGS)[number];

export type FacingRating = 'auspicious' | 'neutral' | 'caution';

/** Traditional Vastu favourability of each facing. */
export const FACING_RATING: Record<Facing, FacingRating> = {
  'North-East': 'auspicious',
  North: 'auspicious',
  East: 'auspicious',
  West: 'neutral',
  'North-West': 'neutral',
  'South-East': 'neutral',
  South: 'caution',
  'South-West': 'caution',
};

/** Short compass abbreviation for chips (language-neutral). */
export const FACING_ABBR: Record<Facing, string> = {
  'North-East': 'NE',
  North: 'N',
  East: 'E',
  West: 'W',
  'North-West': 'NW',
  'South-East': 'SE',
  South: 'S',
  'South-West': 'SW',
};

/** Stable i18n key for a facing (safe for JSON keys). */
export function facingKey(facing: string): string {
  return facing.toLowerCase().replace(/-/g, '_'); // 'North-East' → 'north_east'
}

/** Read a property's facing from its attrs (admin/seller both write `Facing`). */
export function readFacing(attrs: Record<string, unknown> | null | undefined): string | null {
  const v = attrs?.Facing ?? attrs?.facing;
  return typeof v === 'string' && v.trim() ? v : null;
}
