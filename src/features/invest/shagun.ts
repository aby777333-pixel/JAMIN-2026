/**
 * Shagun — auspicious money amounts traditionally end in ₹1 (the extra rupee is
 * a blessing that keeps the relationship/prosperity "continuing"). We suggest a
 * ladder of favourable token/booking amounts. Pure, positive-only.
 */
export const SHAGUN_AMOUNTS = [1001, 2101, 5101, 11001, 21001, 51001, 101001] as const;

/** Auspicious token amounts, optionally filtered to a sensible range for a price. */
export function shagunAmounts(price?: number): number[] {
  if (!price || price <= 0) return [...SHAGUN_AMOUNTS];
  // A token is typically a small fraction of the price; keep amounts <= ~10%.
  const cap = Math.max(11001, price * 0.1);
  const within = SHAGUN_AMOUNTS.filter((a) => a <= cap);
  return within.length ? within : [SHAGUN_AMOUNTS[0]];
}
